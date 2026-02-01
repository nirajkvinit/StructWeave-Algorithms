# Reddit: High-Level Design

[← Back to Index](./00-index.md) | [← Requirements](./01-requirements-and-estimations.md) | [Next: Low-Level Design →](./03-low-level-design.md)

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Key Architectural Decisions](#key-architectural-decisions)
4. [Caching Strategy](#caching-strategy)
5. [Multi-Region Deployment](#multi-region-deployment)
6. [Architecture Pattern Checklist](#architecture-pattern-checklist)

---

## System Architecture

### Component Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        direction LR
        iOS[iOS App]
        Android[Android App]
        WebNew[New Reddit]
        WebOld[Old Reddit]
        API[API/Bots]
    end

    subgraph Edge["Edge Layer"]
        Fastly[Fastly CDN]
        EdgePOP[Edge PoPs]
    end

    subgraph Gateway["Gateway Layer"]
        LB[Load Balancer]
        Auth[Auth Service<br/>OAuth 2.0]
        RateLimiter[Rate Limiter<br/>Per-user/IP]
        APIGateway[API Gateway<br/>GraphQL/REST]
    end

    subgraph CoreServices["Core Services"]
        direction TB
        subgraph ContentServices["Content Services"]
            PostService[Post Service]
            CommentService[Comment Service<br/>Go]
            VoteService[Vote Service]
        end

        subgraph DiscoveryServices["Discovery Services"]
            FeedService[Feed Service]
            SearchService[Search Service]
            TrendingService[Trending Service]
        end

        subgraph CommunityServices["Community Services"]
            SubredditService[Subreddit Service]
            ModService[Moderation Service]
            UserService[User/Account Service<br/>Go]
        end
    end

    subgraph AsyncLayer["Async Processing Layer"]
        VoteQueue[Vote Queue<br/>Subreddit Sharded]
        RabbitMQ[RabbitMQ<br/>Job Queue]
        Kafka[Kafka<br/>Event Stream]
        Debezium[Debezium<br/>CDC]
    end

    subgraph WorkerLayer["Worker Layer"]
        ScoreWorker[Score Workers<br/>Hot Recalculation]
        IndexWorker[Index Workers<br/>Search Indexing]
        NotifWorker[Notification Workers]
        ModWorker[Moderation Workers<br/>REV2/Flink]
    end

    subgraph DataLayer["Data Layer"]
        subgraph Primary["Primary Storage"]
            PostgreSQL[(PostgreSQL<br/>ThingDB)]
            Cassandra[(Cassandra<br/>Heavy Writes)]
        end

        subgraph Cache["Cache Layer"]
            Memcached[(Memcached<br/>Object Cache)]
            Redis[(Redis<br/>Sorted Sets)]
        end

        subgraph Search["Search"]
            ES[(Elasticsearch)]
        end
    end

    Clients --> Edge
    Edge --> Gateway
    Gateway --> CoreServices

    VoteService --> VoteQueue
    VoteQueue --> ScoreWorker
    ScoreWorker --> Redis

    PostService --> PostgreSQL
    CommentService --> PostgreSQL
    FeedService --> Redis
    SearchService --> ES

    CoreServices --> Kafka
    Kafka --> WorkerLayer
    PostgreSQL --> Debezium
    Debezium --> Kafka

    WorkerLayer --> DataLayer

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef async fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef worker fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class iOS,Android,WebNew,WebOld,API client
    class Fastly,EdgePOP edge
    class LB,Auth,RateLimiter,APIGateway gateway
    class PostService,CommentService,VoteService,FeedService,SearchService,TrendingService,SubredditService,ModService,UserService service
    class VoteQueue,RabbitMQ,Kafka,Debezium async
    class ScoreWorker,IndexWorker,NotifWorker,ModWorker worker
    class PostgreSQL,Cassandra data
    class Memcached,Redis cache
    class ES data
```

### Service Responsibilities

| Service | Responsibility | Dependencies | Scale Characteristics |
|---------|----------------|--------------|----------------------|
| **Post Service** | Post CRUD, media handling | PostgreSQL, CDN | Write: 14 QPS, Read: via Feed |
| **Comment Service** | Comment CRUD, tree management | PostgreSQL, Redis | Write: 87 QPS, Read: 8K QPS |
| **Vote Service** | Vote submission, deduplication | Vote Queue, PostgreSQL | 2K QPS peak |
| **Feed Service** | Home/Popular/All feed assembly | Redis, Memcached | 60K QPS peak |
| **Search Service** | Full-text search | Elasticsearch | 9K QPS peak |
| **Subreddit Service** | Community management | PostgreSQL | Low volume, high cache |
| **Moderation Service** | AutoMod, spam, reports | Flink, PostgreSQL | Real-time stream |
| **User Service** | Accounts, karma, prefs | PostgreSQL | Medium read, low write |

---

## Data Flow Diagrams

### Vote Submission Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant VoteService
    participant VoteQueue
    participant ScoreWorker
    participant Redis
    participant PostgreSQL

    Client->>Gateway: POST /api/vote {thing_id, dir}
    Gateway->>Gateway: Authenticate, Rate Limit
    Gateway->>VoteService: ProcessVote(user, thing, dir)

    VoteService->>PostgreSQL: Check existing vote
    alt Vote exists
        VoteService->>PostgreSQL: UPDATE votes SET dir=new_dir
    else New vote
        VoteService->>PostgreSQL: INSERT INTO votes
    end

    VoteService->>VoteQueue: Enqueue(subreddit_id % N)
    VoteService-->>Client: 200 OK (optimistic)

    Note over VoteQueue: Subreddit-sharded queue<br/>Isolates hot subreddits

    VoteQueue->>ScoreWorker: Dequeue batch
    ScoreWorker->>ScoreWorker: Recalculate hot_score
    ScoreWorker->>PostgreSQL: UPDATE things SET ups/downs
    ScoreWorker->>Redis: ZADD subreddit:hot post_id score
    ScoreWorker->>Redis: Invalidate related caches
```

### Comment Tree Load Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant CommentService
    participant Redis
    participant Memcached
    participant PostgreSQL

    Client->>Gateway: GET /comments/{post_id}?sort=best&limit=200
    Gateway->>CommentService: LoadComments(post_id, sort, limit)

    CommentService->>Redis: GET comment_tree:{post_id}
    alt Cache hit (hot post)
        Redis-->>CommentService: Cached tree
        CommentService-->>Client: Return tree
    else Cache miss
        CommentService->>PostgreSQL: SELECT * FROM things WHERE link_id = post_id
        PostgreSQL-->>CommentService: Raw comments

        CommentService->>CommentService: Build tree (parent_id relationships)
        CommentService->>CommentService: Sort by Wilson score (best)
        CommentService->>CommentService: Truncate + add "load more" stubs

        CommentService->>Redis: SET comment_tree:{post_id} TTL=60s
        CommentService-->>Client: Return tree with pagination
    end

    Note over Client: User expands collapsed thread
    Client->>Gateway: GET /morechildren?link_id=x&children=a,b,c
    Gateway->>CommentService: LoadMoreChildren(link_id, children_ids)
    CommentService->>PostgreSQL: SELECT * FROM things WHERE id IN (children)
    CommentService-->>Client: Additional comments
```

### Feed Generation Flow

```mermaid
flowchart LR
    subgraph Request["Feed Request"]
        Client[Client Request<br/>GET /r/programming/hot]
    end

    subgraph Cache["Cache Check"]
        Redis[(Redis<br/>subreddit:programming:hot)]
    end

    subgraph Compute["Feed Computation"]
        direction TB
        FeedService[Feed Service]
        HotWorker[Hot Score Worker]
        PostgreSQL[(PostgreSQL)]
    end

    subgraph Assembly["Feed Assembly"]
        direction TB
        Hydrate[Hydrate Posts]
        Memcached[(Memcached<br/>Object Cache)]
        Personalize[Apply Personalization]
    end

    subgraph Response["Response"]
        Output[Feed Response<br/>25-100 posts]
    end

    Client --> Redis
    Redis -->|Hit| Hydrate
    Redis -->|Miss| FeedService
    FeedService --> PostgreSQL
    FeedService --> HotWorker
    HotWorker --> Redis
    Redis --> Hydrate
    Hydrate --> Memcached
    Hydrate --> Personalize
    Personalize --> Output

    classDef request fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef compute fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class Client request
    class Redis,Memcached cache
    class FeedService,HotWorker,Hydrate,Personalize compute
    class PostgreSQL data
```

### Post Creation Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant PostService
    participant ModService
    participant PostgreSQL
    participant Kafka
    participant Workers

    Client->>Gateway: POST /api/submit {sr, title, text/url}
    Gateway->>Gateway: Authenticate, Rate Limit
    Gateway->>PostService: CreatePost(user, subreddit, content)

    PostService->>PostService: Validate subreddit rules
    PostService->>PostService: Generate thing_id (t3_xxxxx)

    par Sync Operations
        PostService->>PostgreSQL: INSERT INTO things
        PostService->>PostgreSQL: INSERT INTO thing_data (title, body, etc.)
    end

    PostService->>Kafka: PostCreated event
    PostService-->>Client: 200 OK {post_id}

    par Async Processing
        Kafka->>ModService: AutoModerator check
        Kafka->>Workers: Search indexing
        Kafka->>Workers: Feed cache update
        Kafka->>Workers: Notification dispatch
    end

    alt AutoMod triggers
        ModService->>PostgreSQL: UPDATE things SET spam=true
        ModService->>Workers: Notify moderators
    end
```

---

## Key Architectural Decisions

### Decision 1: ThingDB Data Model

**Context:** Reddit needs a flexible schema to support diverse content types (posts, comments, users, subreddits, awards) while maintaining relational integrity.

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| Traditional Relational | Strong typing, mature tools | Schema migrations painful |
| Document Store (MongoDB) | Flexible schema | Weak consistency, JOINs |
| Wide-Column (Cassandra) | Scale, write performance | No JOINs, query patterns |
| **ThingDB (Hybrid)** | Flexibility + ACID | Custom, learning curve |

**Decision: ThingDB (Two-Table Model)**

```
THINGDB ARCHITECTURE:

Things Table (normalized):
┌─────────────┬────────┬──────┬───────┬─────────────┐
│ id          │ type   │ ups  │ downs │ created_utc │
├─────────────┼────────┼──────┼───────┼─────────────┤
│ t3_abc123   │ 3      │ 1234 │ 56    │ 1704067200  │
│ t1_def456   │ 1      │ 89   │ 2     │ 1704067300  │
└─────────────┴────────┴──────┴───────┴─────────────┘

Data Table (schemaless):
┌─────────────┬───────────────┬─────────────────────────┐
│ thing_id    │ key           │ value                   │
├─────────────┼───────────────┼─────────────────────────┤
│ t3_abc123   │ title         │ "Post title here"       │
│ t3_abc123   │ url           │ "https://example.com"   │
│ t3_abc123   │ author_id     │ "t2_xyz789"             │
│ t3_abc123   │ subreddit_id  │ "t5_2qh1i"              │
└─────────────┴───────────────┴─────────────────────────┘

Benefits:
- Add new attributes without migrations
- Common fields (ups, downs) optimized in Things table
- Type-specific fields in Data table
- ACID guarantees from PostgreSQL
```

### Decision 2: Subreddit-Based Vote Queue Sharding

**Context:** Vote processing is the highest-volume write operation. Hot subreddits (r/funny, r/pics) can overwhelm the system during viral events.

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| Single queue | Simple | Single bottleneck |
| User-based sharding | Even distribution | Doesn't isolate hot content |
| Post-based sharding | Isolates hot posts | Too fine-grained |
| **Subreddit-based** | Isolates hot communities | Some imbalance |

**Decision: Subreddit-Based Queue Partitioning**

```
QUEUE SHARDING STRATEGY:

partition_id = hash(subreddit_id) % N

Where N = 100 (typical)

Example distribution:
  r/funny      → Partition 23
  r/pics       → Partition 67
  r/programming→ Partition 45
  r/AskReddit  → Partition 12

Benefits:
- r/funny viral post doesn't block r/programming
- Per-partition scaling
- Failure isolation
- Predictable routing

Worker allocation:
  - 1-3 workers per partition (auto-scaled)
  - Hot partitions get more workers
  - Cold partitions share workers
```

### Decision 3: Go Migration for Core Services

**Context:** Python r2 monolith had performance limitations. P99 latency for critical paths was problematic.

**Migration Strategy: Tap-Compare Testing**

```
TAP-COMPARE VALIDATION:

1. SHADOW TRAFFIC
   - Copy X% of production traffic to new Go service
   - Return original Python response to user
   - Compare responses offline

2. COMPARE RESPONSES
   - Diff detection for payload differences
   - Latency comparison
   - Error rate monitoring

3. GRADUAL ROLLOUT
   - 1% → 10% → 50% → 100%
   - Automatic rollback on divergence

Results (Comments Service):
  - P99 latency: 800ms → 400ms (50% reduction)
  - P50 latency: 150ms → 75ms
  - Memory usage: 40% reduction
  - Throughput: 3x improvement
```

### Decision 4: Precomputed Hot Lists

**Context:** Real-time hot score calculation for every feed request is computationally expensive.

**Decision: Background Precomputation + Cache**

```
PRECOMPUTATION STRATEGY:

Hot List Worker:
  EVERY 30 seconds:
    FOR each active subreddit:
      posts = fetch_recent_posts(subreddit, 1000)
      FOR post IN posts:
        score = calculate_hot_score(post)
        REDIS.ZADD(subreddit:hot, score, post_id)
      REDIS.ZREMRANGEBYRANK(subreddit:hot, 0, -1001)  // Keep top 1000

On Vote:
  - Queue score recalculation
  - Batch updates every few seconds
  - Eventually consistent (30-60s staleness OK)

Cache TTL:
  - Hot list: 60 seconds
  - Object cache: 5 minutes
  - CDN: 30 seconds (logged out)
```

---

## Caching Strategy

### Multi-Tier Cache Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser[Browser/App Cache]
    end

    subgraph Edge["Edge Layer"]
        CDN[Fastly CDN<br/>Static + Logged-out Feeds]
    end

    subgraph App["Application Layer"]
        AppCache[Application Cache<br/>Local LRU]
    end

    subgraph Distributed["Distributed Cache"]
        Memcached[(Memcached<br/>Object Cache<br/>~500 GB)]
        Redis[(Redis<br/>Hot Lists + Counters<br/>~50 GB)]
    end

    subgraph Database["Database Layer"]
        PostgreSQL[(PostgreSQL<br/>Source of Truth)]
        Cassandra[(Cassandra<br/>Write Buffer)]
    end

    Browser --> CDN
    CDN -->|Miss| AppCache
    AppCache -->|Miss| Memcached
    AppCache -->|Miss| Redis
    Memcached -->|Miss| PostgreSQL
    Redis -->|Miss| PostgreSQL

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef app fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef db fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class Browser client
    class CDN edge
    class AppCache app
    class Memcached,Redis cache
    class PostgreSQL,Cassandra db
```

### Cache Key Patterns

| Data Type | Cache Location | Key Pattern | TTL |
|-----------|----------------|-------------|-----|
| Post object | Memcached | `thing:t3_xxxxx` | 5 min |
| Comment object | Memcached | `thing:t1_xxxxx` | 5 min |
| Comment tree | Redis | `comments:t3_xxxxx` | 60 sec |
| Hot list | Redis | `subreddit:{id}:hot` | 60 sec |
| Rising list | Redis | `subreddit:{id}:rising` | 30 sec |
| User session | Redis | `session:{token}` | 24 hours |
| Subreddit meta | Memcached | `subreddit:t5_xxxxx` | 10 min |
| Vote count | Redis | `thing:{id}:votes` | 5 sec |

### Cache Invalidation Strategy

```
WRITE-THROUGH + ASYNC INVALIDATION:

On Post Update:
  1. Write to PostgreSQL (sync)
  2. Invalidate Memcached key (sync)
  3. Queue hot list recalc (async)
  4. CDN purge if public (async)

On Vote:
  1. Write vote record (sync)
  2. Queue score recalc (async)
  3. Increment counter cache (Redis INCR)
  4. Hot list update via worker (async)

Consistency Model:
  - Post content: Strong (read-your-writes)
  - Vote counts: Eventual (5-30 seconds)
  - Hot rankings: Eventual (30-60 seconds)
```

---

## Multi-Region Deployment

### Geographic Distribution

```mermaid
flowchart TB
    subgraph Users["Global Users"]
        US[US Users]
        EU[EU Users]
        APAC[APAC Users]
    end

    subgraph Edge["Edge Layer (All Regions)"]
        CDN_US[Fastly PoP<br/>US]
        CDN_EU[Fastly PoP<br/>EU]
        CDN_APAC[Fastly PoP<br/>APAC]
    end

    subgraph Primary["Primary Region (US-West)"]
        LB_Primary[Load Balancer]
        Services_Primary[All Services]
        DB_Primary[(PostgreSQL<br/>Primary)]
        Redis_Primary[(Redis<br/>Primary)]
    end

    subgraph Secondary["Secondary Region (US-East)"]
        LB_Secondary[Load Balancer]
        Services_Secondary[Read Services]
        DB_Secondary[(PostgreSQL<br/>Replica)]
        Redis_Secondary[(Redis<br/>Replica)]
    end

    US --> CDN_US
    EU --> CDN_EU
    APAC --> CDN_APAC

    CDN_US --> LB_Primary
    CDN_EU --> LB_Primary
    CDN_APAC --> LB_Primary

    LB_Primary --> Services_Primary
    Services_Primary --> DB_Primary
    Services_Primary --> Redis_Primary

    DB_Primary -->|Async Replication| DB_Secondary
    Redis_Primary -->|Async Replication| Redis_Secondary

    LB_Primary -->|Failover| LB_Secondary
    LB_Secondary --> Services_Secondary
    Services_Secondary --> DB_Secondary

    classDef users fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef primary fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef secondary fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class US,EU,APAC users
    class CDN_US,CDN_EU,CDN_APAC edge
    class LB_Primary,Services_Primary,DB_Primary,Redis_Primary primary
    class LB_Secondary,Services_Secondary,DB_Secondary,Redis_Secondary secondary
```

### Replication Strategy

| Data Type | Replication Mode | Lag Tolerance | Failover |
|-----------|-----------------|---------------|----------|
| Posts/Comments | Async streaming | <5 seconds | Promote replica |
| Votes | Async streaming | <10 seconds | Queue locally |
| User accounts | Sync (critical) | 0 | Block until ACK |
| Hot lists | Compute locally | N/A | Region-independent |
| Sessions | Sync or sticky | 0 | Re-auth on failover |

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| Sync vs Async | **Hybrid** | Sync for writes, async for score updates |
| Event-driven vs Request-response | **Event-driven** | Kafka for cross-service communication |
| Push vs Pull | **Pull (on-demand)** | Precomputed lists, pulled at read time |
| Stateless vs Stateful | **Stateless services** | All state in Redis/PostgreSQL |
| Read-heavy vs Write-heavy | **Read-heavy optimized** | 100:1 read/write ratio, heavy caching |
| Real-time vs Batch | **Near real-time** | 30-60 second staleness acceptable |
| Edge vs Origin | **Edge for static** | CDN for logged-out, origin for personalized |
| Monolith vs Microservices | **Migrating to microservices** | Go services for critical paths |

---

## Next Steps

- [Low-Level Design →](./03-low-level-design.md) - Data models, APIs, algorithms
