# Scalability & Reliability

## Scalability

### Horizontal Scaling Strategy

```mermaid
flowchart TB
    subgraph Gateway["WebSocket Gateway Tier"]
        direction LR
        GW1[Gateway 1]
        GW2[Gateway 2]
        GW3[Gateway N]
    end

    subgraph SyncTier["Sync Server Tier (Sharded by Document ID)"]
        direction LR
        SS1["Shard 1<br/>Docs A-F"]
        SS2["Shard 2<br/>Docs G-M"]
        SS3["Shard N<br/>Docs N-Z"]
    end

    subgraph PubSub["Message Bus"]
        MB[Pub/Sub<br/>Cross-shard Broadcast]
    end

    subgraph Storage["Persistent Storage"]
        direction LR
        OL[(Operation Log<br/>Partitioned)]
        SN[(Snapshot Store<br/>Key-Value)]
        MD[(Metadata DB<br/>Sharded)]
    end

    GW1 & GW2 & GW3 --> MB
    MB --> SS1 & SS2 & SS3
    SS1 & SS2 & SS3 --> OL & SN & MD

    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef sync fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef pubsub fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class GW1,GW2,GW3 gateway
    class SS1,SS2,SS3 sync
    class MB pubsub
    class OL,SN,MD storage
```

### Component Scaling Decisions

| Component | Scaling Type | Strategy | Trigger |
|-----------|-------------|----------|---------|
| **WebSocket Gateway** | Horizontal | Stateless; sticky sessions by document | >10K connections per node |
| **Sync Server** | Horizontal (sharded) | Document-ID hash-based sharding | >500 active docs per shard |
| **Presence Server** | Horizontal | Pub/sub with partition-per-document | >50K presence updates/sec |
| **Merge Server** | Horizontal (queue-based) | Auto-scaled worker pool | Queue depth > 100 |
| **Document Service** | Horizontal | Stateless REST/gRPC | CPU > 70% |
| **Operation Log** | Horizontal (partitioned) | Partition by document_id | Storage > 80% |
| **Metadata DB** | Horizontal (sharded) | Shard by workspace_id | QPS > 10K per shard |
| **Cache** | Horizontal | Distributed cache cluster | Hit rate < 90% |

### Database Scaling Strategy

#### Operation Log (Write-Heavy)

The operation log receives every edit from every user. Scaling approach:

1. **Partition by document_id**: All operations for a document on one partition
2. **Append-only writes**: No updates or deletes; optimized for sequential writes
3. **Time-based tiering**: Hot (< 24h) in fast storage, warm (< 30d) in standard storage, cold in compressed archive
4. **Compaction**: Periodically merge operation sequences into snapshots to reduce replay cost

```
Write throughput:
- 8M operations/sec peak
- Partitioned across 256 partitions
- ~31K writes/sec per partition (well within SSD limits)
```

#### Metadata DB (Read-Heavy for Listings)

1. **Read replicas**: 3-5 replicas per shard for document listing queries
2. **Shard by workspace_id**: Keeps all documents for a workspace on one shard
3. **Connection pooling**: Limit connections per service instance

#### Cache Layers

```
L1: Client-side (IndexedDB/SQLite)
    - Full CRDT state for recently accessed documents
    - Hit rate: ~90% for active editing sessions

L2: Sync server in-memory
    - Hot document CRDT state loaded in memory
    - Evict after 15 minutes of inactivity
    - Hit rate: ~95% for active documents

L3: Distributed cache (Redis cluster)
    - Serialized CRDT snapshots
    - TTL: 1 hour
    - Hit rate: ~85% for document loads

L4: Origin storage
    - Snapshot store + operation log replay
    - Always available (source of truth)
```

### Hot Spot Mitigation

| Hot Spot | Cause | Mitigation |
|----------|-------|------------|
| **Popular document** (100+ editors) | Viral template, company all-hands | Dedicated sync server instance; operation batching |
| **Large document** (10K+ blocks) | Knowledge base, documentation | Block-level lazy loading; subtree pagination |
| **Reconnection storm** | Office network restored after outage | Queue-based merge processing; gradual reconnection backoff |
| **Workspace listing** | Dashboard showing all documents | Materialized view; cache with short TTL |

### Auto-Scaling Triggers

| Metric | Scale Up | Scale Down | Cooldown |
|--------|----------|------------|----------|
| WebSocket connections per gateway | >8K | <2K | 5 min |
| Sync server active documents | >400 | <100 | 10 min |
| Merge queue depth | >50 | <5 | 3 min |
| Operation log write latency p99 | >100ms | <20ms | 10 min |
| Cache hit rate | <80% | >95% | 15 min |

---

## Reliability & Fault Tolerance

### Single Points of Failure (SPOF) Identification

| Component | SPOF Risk | Mitigation |
|-----------|-----------|------------|
| Sync server for a document | **High**: If the sync server holding a document crashes, real-time sync stops | Standby replica with CRDT state; automatic failover in <5s |
| WebSocket gateway | **Medium**: Clients disconnect and must reconnect | Multiple gateways behind LB; client reconnection with backoff |
| Operation log partition | **High**: Edits cannot be persisted | Triple replication; synchronous write to at least 2 replicas |
| Cache layer | **Low**: Increases latency but doesn't lose data | Cache warming from snapshots; graceful degradation |
| Client-side storage | **Low**: Only offline edits at risk | Periodic sync when online; IndexedDB is persistent |

### Redundancy Strategy

```mermaid
flowchart TB
    subgraph Primary["Primary Region"]
        SS_P[Sync Server Primary]
        OL_P[(Op Log Primary)]
        MD_P[(Metadata Primary)]
    end

    subgraph Standby["Standby (Same Region)"]
        SS_S[Sync Server Standby]
        OL_S[(Op Log Replica)]
        MD_S[(Metadata Replica)]
    end

    subgraph DR["DR Region"]
        OL_DR[(Op Log Async Replica)]
        MD_DR[(Metadata Async Replica)]
        SN_DR[(Snapshots)]
    end

    SS_P -.->|state sync| SS_S
    OL_P -->|sync replication| OL_S
    OL_P -.->|async replication| OL_DR
    MD_P -->|sync replication| MD_S
    MD_P -.->|async replication| MD_DR

    classDef primary fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef standby fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef dr fill:#fce4ec,stroke:#880e4f,stroke-width:2px

    class SS_P,OL_P,MD_P primary
    class SS_S,OL_S,MD_S standby
    class OL_DR,MD_DR,SN_DR dr
```

### Failover Mechanisms

#### Sync Server Failover

```
PROCEDURE sync_server_failover(failed_server):
    // 1. Detect failure (heartbeat timeout: 3s)
    IF missed_heartbeats >= 3:
        mark_server_unhealthy(failed_server)

    // 2. Identify affected documents
    affected_docs = documents_on_server(failed_server)

    // 3. Assign to standby or redistribute
    FOR doc IN affected_docs:
        new_server = select_standby_or_least_loaded()

        // 4. Load CRDT state from latest snapshot + operation log
        snapshot = load_latest_snapshot(doc.id)
        recent_ops = load_ops_since(doc.id, snapshot.sequence_id)
        crdt_state = replay(snapshot, recent_ops)

        // 5. Accept client reconnections
        new_server.accept_document(doc.id, crdt_state)

    // 6. Clients reconnect (they have local state, so no data loss)
    // Client sends state vector -> server sends diff -> converge
```

**Failover time**: < 5 seconds (detection 3s + state loading 1-2s)

**Data loss during failover**: Zero. Clients hold local CRDT state. Any operations not yet persisted to the operation log are resent on reconnect via the CRDT sync protocol.

#### Client Reconnection Strategy

```
PROCEDURE client_reconnect():
    attempt = 0
    WHILE NOT connected:
        delay = min(1000 * 2^attempt + random(0, 1000), 30000)
        WAIT delay
        TRY:
            ws = connect(sync_server_url)
            // Resume sync using state vectors (no full reload needed)
            send_state_vector(local_crdt.state_vector)
            receive_and_merge(server_diff)
            send_local_diff(local_diff)
            BREAK
        CATCH:
            attempt = attempt + 1
```

### Circuit Breaker Patterns

| Circuit | Trigger | Open Behavior | Recovery |
|---------|---------|---------------|----------|
| Sync server | 5 failures in 10s | Queue operations locally; retry after 30s | Half-open: test with single sync |
| Operation log write | 3 write failures | Buffer in sync server memory; alert | Flush buffer on recovery |
| Snapshot creation | 2 failures | Skip snapshot; continue with op log | Retry on next schedule |
| Search indexing | 5 failures in 1m | Stop indexing; serve stale results | Resume when service healthy |

### Graceful Degradation

| Failure Scenario | Degraded Behavior | User Experience |
|-----------------|-------------------|-----------------|
| Sync server down | Offline mode activates | Users continue editing locally; sync on recovery |
| Operation log unavailable | Sync server buffers in memory | Real-time collaboration continues; durability temporarily reduced |
| Cache failure | Direct reads from snapshot store | Increased latency for document loads (~200ms -> ~1s) |
| Presence server down | No multiplayer cursors | Document editing works normally; no cursor visibility |
| Search down | Search returns error | Document editing unaffected; search degraded message shown |

### Bulkhead Pattern

```
Sync Server Resource Isolation:

┌─────────────────────────────────────────────┐
│ Sync Server Instance                         │
│                                              │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │ VIP Documents │  │ Standard Documents    │ │
│  │ (dedicated    │  │ (shared thread pool)  │ │
│  │  thread pool) │  │                       │ │
│  │ Max: 10 docs  │  │ Max: 500 docs         │ │
│  └──────────────┘  └──────────────────────┘ │
│                                              │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Merge Workers │  │ Snapshot Workers      │ │
│  │ (isolated)    │  │ (isolated)            │ │
│  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────┘
```

Documents with 50+ concurrent editors get a dedicated thread pool to prevent them from starving smaller documents.

---

## Disaster Recovery

### Recovery Objectives

| Metric | Target | Justification |
|--------|--------|---------------|
| **RTO** (Recovery Time Objective) | 30 minutes | Full service restoration including sync |
| **RPO** (Recovery Point Objective) | 0 seconds (zero data loss) | CRDT state on clients acts as distributed backup |
| **RTO for editing** | 0 seconds | Offline-first means editing never stops |

### Why CRDT Architecture Improves DR

Traditional architectures: Server is the single source of truth. If the server loses data, it's gone.

CRDT architecture: **Every client is a full replica.** If the server loses all data, clients hold complete document state. On reconnect, clients re-sync their state to the new server, effectively reconstructing the entire database from the distributed client replicas.

```
Disaster scenario: Complete server-side data loss

Recovery:
1. Deploy new server infrastructure (15 min)
2. Clients reconnect and detect empty server state vector
3. Each client sends its full CRDT state to the server
4. Server merges all client states (CRDT merge is commutative)
5. Server reconstructs complete document state
6. Full recovery with zero data loss

Caveat: Documents not open on any client would be lost.
Mitigation: Regular snapshots to cross-region blob storage.
```

### Backup Strategy

| Data | Backup Frequency | Retention | Storage |
|------|-----------------|-----------|---------|
| CRDT snapshots | Every 5 min (active docs) | 90 days | Cross-region blob storage |
| Operation log | Continuous replication | 1 year | Cross-region append log |
| Metadata | Every 1 hour | 30 days | Cross-region DB replica |
| Full workspace export | Daily | 30 days | Blob storage (encrypted) |

### Multi-Region Considerations

| Aspect | Strategy |
|--------|----------|
| **Active-active sync** | Not recommended for real-time editing (cross-region latency 50-200ms too high for keystroke sync) |
| **Active-passive** | Primary region handles all sync; DR region has async-replicated operation log |
| **Geo-routing** | Route users to nearest region for API calls; sync server pinned to document's home region |
| **Region failover** | Promote DR region; clients reconnect with local CRDT state |
| **Cross-region editing** | Acceptable with CRDT (eventual consistency); higher latency but still correct |
