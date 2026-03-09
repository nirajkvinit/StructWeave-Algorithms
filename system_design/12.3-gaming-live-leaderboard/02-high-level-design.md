# High-Level Design — Live Leaderboard System

## Architecture Overview

The Live Leaderboard System follows a **CQRS (Command Query Responsibility Segregation)** architecture, cleanly separating the score ingestion (write) path from the rank query (read) path. Score submissions flow through a validation pipeline before updating in-memory sorted sets on primary instances, while rank queries are served from read replicas with CDN caching for popular leaderboard segments. An event log provides durability and enables replay for recovery.

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TB
    subgraph Clients["Client Layer"]
        GC[Game Client]
        GS[Game Server]
        SP[Spectator App]
        AD[Admin Dashboard]
    end

    subgraph Gateway["API Gateway"]
        LB[Load Balancer]
        AG[API Gateway<br/>Auth + Rate Limit]
    end

    subgraph WritePath["Write Path — Score Ingestion"]
        SIS[Score Ingestion<br/>Service]
        VAL[Validation<br/>Pipeline]
        EL[(Event Log<br/>Append-Only)]
        MQ[Message Queue<br/>Score Events]
    end

    subgraph RankEngine["Ranking Engine"]
        RE1[Shard 1<br/>Primary]
        RE2[Shard 2<br/>Primary]
        RE3[Shard N<br/>Primary]
        RR1[Read Replica 1a]
        RR2[Read Replica 1b]
        RR3[Read Replica 2a]
    end

    subgraph ReadPath["Read Path — Query Layer"]
        QS[Query Service]
        FLS[Friend Leaderboard<br/>Service]
        CACHE[Response Cache]
        CDN[CDN Edge Cache]
    end

    subgraph Support["Supporting Services"]
        NS[Notification<br/>Service]
        SS[Snapshot<br/>Service]
        RO[Reset<br/>Orchestrator]
        ACS[Anti-Cheat<br/>Service]
        ANA[Analytics<br/>Pipeline]
    end

    subgraph Storage["Persistent Storage"]
        PS[(Player Store)]
        HS[(Historical<br/>Snapshots)]
        MS[(Metrics Store)]
    end

    GS -->|score submit| LB
    GC -->|rank query| LB
    SP -->|subscribe| LB
    AD -->|admin ops| LB
    LB --> AG

    AG -->|writes| SIS
    AG -->|reads| QS

    SIS --> VAL
    VAL --> ACS
    VAL --> EL
    VAL --> MQ

    MQ --> RE1
    MQ --> RE2
    MQ --> RE3

    RE1 -.->|replication| RR1
    RE1 -.->|replication| RR2
    RE2 -.->|replication| RR3

    QS --> RR1
    QS --> RR2
    QS --> RR3
    QS --> CACHE
    CACHE --> CDN

    QS --> FLS
    FLS --> PS

    RE1 -->|rank changes| NS
    NS -->|WebSocket/SSE| GC
    NS -->|WebSocket/SSE| SP

    SS --> RE1
    SS --> RE2
    SS --> RE3
    SS --> HS

    RO --> RE1
    RO --> RE2
    RO --> RE3

    EL --> ANA
    ANA --> MS

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class GC,GS,SP,AD client
    class LB,AG gateway
    class SIS,VAL,QS,FLS,NS,SS,RO,ACS,ANA service
    class EL,PS,HS,MS data
    class CACHE,CDN,RR1,RR2,RR3 cache
    class MQ queue
    class RE1,RE2,RE3 queue
```

---

## Write Path: Score Submission Flow

The write path prioritizes **durability first, ranking second**. Scores are persisted to the event log before being applied to the ranking engine, ensuring no validated score is lost even if the ranking engine fails.

```mermaid
%%{init: {'theme': 'neutral'}}%%
sequenceDiagram
    participant GS as Game Server
    participant AG as API Gateway
    participant SIS as Score Ingestion
    participant VAL as Validation Pipeline
    participant ACS as Anti-Cheat
    participant EL as Event Log
    participant MQ as Message Queue
    participant RE as Ranking Engine (Primary)
    participant RR as Read Replica
    participant NS as Notification Service
    participant CL as Game Client

    GS->>AG: POST /scores {player_id, leaderboard_id, score, proof}
    AG->>AG: Authenticate (API key / JWT)
    AG->>AG: Rate limit check
    AG->>SIS: Forward validated request

    SIS->>VAL: Validate score payload
    VAL->>VAL: Schema validation, bounds check
    VAL->>ACS: Check score plausibility
    ACS-->>VAL: Score accepted / flagged

    alt Score Rejected
        VAL-->>SIS: Rejection reason
        SIS-->>AG: 400 Bad Request
        AG-->>GS: Score rejected
    end

    VAL->>EL: Append score event (durable)
    EL-->>VAL: Event ID + timestamp
    VAL->>MQ: Publish score event
    VAL-->>SIS: 202 Accepted {event_id}
    SIS-->>AG: 202 Accepted
    AG-->>GS: 202 Accepted {event_id}

    MQ->>RE: Consume score event
    RE->>RE: ZADD leaderboard_key score player_id
    RE->>RE: Compute new rank
    RE-->>RR: Replicate sorted set update

    RE->>NS: Rank change event {player_id, old_rank, new_rank}
    NS->>CL: WebSocket push {rank_update}
```

### Write Path Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Async vs sync ranking** | Asynchronous (202 Accepted) | Decouples submission latency from ranking latency; allows backpressure handling |
| **Event log before ranking** | Yes, always | Guarantees durability; ranking engine can rebuild from event log on failure |
| **Score validation location** | On the write path (blocking) | Invalid scores must never enter the ranking engine; fail-fast prevents pollution |
| **Anti-cheat mode** | Synchronous fast-check + async deep analysis | Fast plausibility check (< 50ms) on write path; deep replay verification async |

---

## Read Path: Rank Query Flow

The read path is optimized for **low latency and high throughput**. Queries are served from read replicas, with a multi-tier cache for popular leaderboard segments.

```mermaid
%%{init: {'theme': 'neutral'}}%%
sequenceDiagram
    participant CL as Game Client
    participant CDN as CDN Edge
    participant AG as API Gateway
    participant QS as Query Service
    participant RC as Response Cache
    participant RR as Read Replica
    participant FLS as Friend Service
    participant PS as Player Store

    CL->>CDN: GET /leaderboards/{id}/top/100

    alt CDN Cache Hit (TTL: 5-30s)
        CDN-->>CL: Cached top-100 response
    end

    CDN->>AG: Cache miss, forward
    AG->>QS: Route to query service

    QS->>RC: Check response cache
    alt Response Cache Hit (TTL: 1-5s)
        RC-->>QS: Cached result
        QS-->>AG: Return cached
        AG-->>CDN: Response (set cache headers)
        CDN-->>CL: Top-100 with scores
    end

    QS->>RR: ZREVRANGE leaderboard_key 0 99 WITHSCORES
    RR-->>QS: [(player_1, score_1), ..., (player_100, score_100)]

    QS->>PS: Batch fetch player metadata (names, avatars)
    PS-->>QS: Player details

    QS->>QS: Merge scores + metadata
    QS->>RC: Cache response (TTL: 1-5s)
    QS-->>AG: Enriched leaderboard response
    AG-->>CDN: Response (Cache-Control: max-age=5)
    CDN-->>CL: Top-100 with player details
```

### Read Path Optimization Tiers

```
Tier 1: CDN Edge Cache (5-30s TTL)
  - Top-100, Top-1000 for popular leaderboards
  - Hit rate: 60-80% during peak traffic
  - Reduces query service load by 5-10x

Tier 2: Response Cache (1-5s TTL)
  - Pre-computed responses for common queries
  - Short TTL ensures freshness for competitive scenarios
  - Hit rate: 40-60% for cache-missed CDN requests

Tier 3: Read Replica (real-time, ~10ms lag)
  - Direct sorted set queries against replicated data
  - Handles around-me, percentile, and friend queries
  - 3-5 replicas per shard for throughput

Tier 4: Primary Instance (authoritative)
  - Used only when strong consistency is required
  - Tournament finals, prize-determining queries
  - Typically < 1% of total read traffic
```

---

## Around-Me Query Flow

The "around-me" query requires fetching a player's rank first, then retrieving surrounding entries—a two-step operation that must feel instantaneous.

```mermaid
%%{init: {'theme': 'neutral'}}%%
sequenceDiagram
    participant CL as Game Client
    participant QS as Query Service
    participant RR as Read Replica
    participant PS as Player Store

    CL->>QS: GET /leaderboards/{id}/around/{player_id}?count=10

    QS->>RR: ZREVRANK leaderboard_key player_id
    RR-->>QS: rank = 4523891

    QS->>QS: Calculate range: [4523881, 4523901]
    QS->>RR: ZREVRANGE leaderboard_key 4523881 4523901 WITHSCORES
    RR-->>QS: 21 entries with scores

    QS->>PS: Batch fetch player metadata
    PS-->>QS: Player details

    QS-->>CL: {my_rank: 4523891, entries: [...21 players...]}
```

---

## Friend Leaderboard Flow

Friend leaderboards compute a ranking over a small subset of the global leaderboard. This is computed on-demand by fetching scores for the friend list and sorting client-side or server-side.

```mermaid
%%{init: {'theme': 'neutral'}}%%
sequenceDiagram
    participant CL as Game Client
    participant QS as Query Service
    participant FLS as Friend Service
    participant RR as Read Replica

    CL->>QS: GET /leaderboards/{id}/friends/{player_id}

    QS->>FLS: Get friend list for player_id
    FLS-->>QS: [friend_1, friend_2, ..., friend_150]

    QS->>RR: ZSCORE leaderboard_key friend_1
    QS->>RR: ZSCORE leaderboard_key friend_2
    Note over QS,RR: Pipelined: all ZSCORE commands<br/>sent in single round-trip

    RR-->>QS: Scores for all friends

    QS->>QS: Sort by score descending
    QS->>QS: Assign friend-relative ranks

    QS-->>CL: Friend leaderboard with ranks
```

> **Optimization**: For players with large friend lists (500+), use `ZMSCORE` (multi-score lookup) to fetch all scores in a single operation rather than pipelining individual `ZSCORE` commands.

---

## Key Architecture Decisions

### Decision 1: Redis Sorted Sets vs. Custom B-Tree

| Factor | Sorted Sets (In-Memory KV) | Custom B-Tree |
|---|---|---|
| **Complexity** | Out-of-the-box, well-tested | Custom implementation, higher bug risk |
| **Performance** | O(log N) for all operations | O(log N) but tunable branching factor |
| **Memory efficiency** | ~120 bytes/entry overhead | Can be more compact with custom encoding |
| **Operational** | Managed services available | Self-hosted only |
| **Sharding** | Requires external sharding logic | Can build sharding into the tree |
| **Verdict** | **Chosen for MVP and most workloads** | Consider for billion-entry scale only |

### Decision 2: Single vs. Sharded Leaderboard

| Factor | Single Instance | Sharded |
|---|---|---|
| **Capacity** | ~50M entries max | Unlimited (add shards) |
| **Rank accuracy** | Exact | Requires scatter-gather for global rank |
| **Query latency** | Lowest (single hop) | Higher (fan-out + merge) |
| **Operational** | Simple | Complex (shard management, rebalancing) |
| **Verdict** | **Use for leaderboards < 50M entries** | **Use for > 50M or extreme throughput** |

### Decision 3: Push vs. Pull for Real-Time Updates

| Factor | Push (WebSocket/SSE) | Pull (Polling) |
|---|---|---|
| **Latency** | Sub-second rank updates | Depends on poll interval (typically 5-30s) |
| **Server load** | Connection management overhead | Query amplification at scale |
| **Client complexity** | Requires WebSocket handling | Simple HTTP requests |
| **Scalability** | Fan-out challenge for millions of subscribers | Each poll is independent |
| **Verdict** | **Push for active gameplay; pull for background checks** | Hybrid approach recommended |

### Decision 4: Exact vs. Approximate Global Ranking

| Factor | Exact Ranking | Approximate Ranking |
|---|---|---|
| **Cross-shard** | Scatter-gather all shards | Sample + interpolate |
| **Latency** | O(shard_count) | O(1) with precomputed buckets |
| **Accuracy** | 100% | 99.9%+ (sufficient for most use cases) |
| **Use case** | Tournament finals, prize distribution | General gameplay, percentile display |
| **Verdict** | **Exact for top-1000 and prize boundaries** | **Approximate for general population** |

---

## Data Flow Summary

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart LR
    subgraph Ingestion["Score Ingestion"]
        A[Game Server] --> B[Validate]
        B --> C[Event Log]
        B --> D[Message Queue]
    end

    subgraph Ranking["Ranking Engine"]
        D --> E[Primary Shard]
        E --> F[Read Replicas]
    end

    subgraph Serving["Query Serving"]
        F --> G[Query Service]
        G --> H[Response Cache]
        H --> I[CDN]
        I --> J[Game Client]
    end

    subgraph Lifecycle["Lifecycle Management"]
        K[Snapshot Service] --> E
        L[Reset Orchestrator] --> E
        K --> M[(Archive Storage)]
    end

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class A,J client
    class B,G,K,L service
    class C,M data
    class H,I,F cache
    class D,E queue
```

---

## Component Interaction Matrix

| Component | Writes To | Reads From | Protocol |
|---|---|---|---|
| **API Gateway** | Score Ingestion, Query Service | — | HTTP/2, gRPC |
| **Score Ingestion** | Event Log, Message Queue | Validation Pipeline | gRPC (internal) |
| **Validation Pipeline** | Message Queue | Anti-Cheat Service | gRPC |
| **Ranking Engine** | Sorted Sets, Read Replicas | Message Queue | Custom binary protocol |
| **Query Service** | Response Cache | Read Replicas, Player Store | gRPC, sorted set protocol |
| **Notification Service** | WebSocket connections | Ranking Engine (change events) | gRPC, WebSocket |
| **Snapshot Service** | Archive Storage | Ranking Engine (DUMP) | Bulk transfer |
| **Reset Orchestrator** | Ranking Engine | — | Admin RPC |

---

## Failure Modes & Mitigations

| Failure | Impact | Mitigation |
|---|---|---|
| **Ranking Engine primary down** | No new score updates processed | Promote read replica to primary; replay from event log |
| **All replicas down for a shard** | Queries for that shard fail | Serve stale cache; degrade to cross-shard approximate rank |
| **Event log unavailable** | Scores accepted but not durable | Buffer in ingestion service memory (< 60s); reject if buffer full |
| **Message queue backlog** | Score propagation delay > SLO | Auto-scale consumers; alert on queue depth |
| **CDN failure** | Increased load on query service | Query service auto-scales; response cache absorbs burst |
| **Network partition** | Shard isolation | Each shard operates independently; merge on heal |
| **Anti-cheat service down** | Scores bypass deep validation | Fast-check still runs locally; queue for async validation |

---

*Previous: [Requirements & Estimations](./01-requirements-and-estimations.md) | Next: [Low-Level Design →](./03-low-level-design.md)*
