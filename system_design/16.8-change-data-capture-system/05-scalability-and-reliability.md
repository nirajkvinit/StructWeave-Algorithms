# Scalability & Reliability — Change Data Capture (CDC) System

## Scalability

### Horizontal vs. Vertical Scaling

| Aspect | Vertical Scaling | Horizontal Scaling |
|--------|-----------------|-------------------|
| Approach | Larger connector workers (more CPU, RAM) | More connector workers with task distribution |
| Throughput ceiling | ~200K events/sec per connector (single-threaded log reader) | Millions of events/sec across distributed workers |
| Operational complexity | Simple (single process per source) | Complex (task rebalancing, offset coordination) |
| Cost efficiency | Efficient up to single-source limits | Required for multi-source CDC platforms |
| When to use | Single database with moderate write rate | Multi-database CDC platform, high-throughput sources |

**Strategy:** Each source database has one logical connector (log reader), but the connector platform itself scales horizontally by distributing multiple connectors across worker nodes. Within a single connector, parallelism is achieved at the snapshot phase (parallel table reads) and the sink phase (parallel partition writers).

### Connector Distribution Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ CDC Platform Controller                                       │
│ - Manages connector lifecycle                                 │
│ - Distributes tasks across workers                            │
│ - Handles rebalancing on worker failure                       │
└───────────────┬──────────────┬──────────────┬────────────────┘
                │              │              │
    ┌───────────▼──┐  ┌───────▼──────┐  ┌───▼───────────┐
    │ Worker Node 1 │  │ Worker Node 2 │  │ Worker Node 3 │
    │               │  │               │  │               │
    │ Task: pg-orders│  │ Task: pg-users│  │ Task: mysql-inv│
    │ Task: pg-items │  │ Task: pg-auth │  │ Task: mysql-pay│
    │               │  │               │  │ Task: mongo-cat │
    └──────────────┘  └──────────────┘  └───────────────┘
```

### Scaling the Streaming Platform

| Dimension | Scaling Approach | Trigger |
|-----------|-----------------|---------|
| Partitions per topic | Increase partitions for high-throughput tables | Single partition throughput > 50 MB/s |
| Broker count | Add brokers to distribute partition leadership | CPU > 70% or disk > 75% across brokers |
| Replication factor | Typically fixed at 3; increase for critical topics | Durability requirement changes |
| Consumer groups | Add consumers per group for higher read throughput | Consumer lag growing consistently |
| Retention | Adjust per-topic based on consumer replay needs | Consumer recovery SLA changes |

### Snapshot Parallelism

For large databases with many tables, snapshot time can be reduced through parallelism:

```
FUNCTION parallel_snapshot(tables, max_parallelism):
    // Sort tables by estimated size (largest first)
    sorted_tables = sort_by_estimated_rows(tables, descending)

    // Assign tables to parallel workers
    worker_pool = create_worker_pool(max_parallelism)

    // Step 1: Record consistent snapshot point
    snapshot_lsn = acquire_global_snapshot_lsn()

    // Step 2: Snapshot tables in parallel
    FOR EACH table IN sorted_tables:
        worker_pool.submit(snapshot_single_table, table, snapshot_lsn)

    // Step 3: Wait for all tables to complete
    worker_pool.await_all()

    // Step 4: Transition to streaming from snapshot_lsn
    start_streaming(snapshot_lsn)

// Parallelism factor: min(num_tables, max_parallelism, source_db_connection_limit)
```

### Caching Layers

| Layer | Component | Strategy | Size |
|-------|-----------|----------|------|
| L1 | Schema cache | LRU per connector; invalidated on DDL | ~10 MB per connector |
| L2 | Offset cache | In-memory; flushed periodically to durable store | ~1 KB per connector |
| L3 | Row filter cache | Compiled predicates cached per table | ~1 MB per connector |
| L4 | Serialization cache | Cached serializers per schema ID | ~50 MB per worker |

### Hot Spot Mitigation

| Hot Spot Type | Cause | Mitigation |
|--------------|-------|------------|
| Single-table flood | One table generates 90% of all events | Dedicated topic with more partitions; separate connector task |
| Burst from batch job | Batch UPDATE affects millions of rows | Rate-limit emission; use streaming transaction markers; alert on burst |
| Supernode table | Very wide table (100+ columns) producing large events | Column filtering to capture only needed columns; reduce event size |
| Rebalancing storm | Worker failures cause cascading task redistribution | Incremental rebalancing (move one task at a time); sticky task assignment |

### Auto-Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| Connector lag (seconds) | > 60s sustained 5 min | Investigate; consider dedicated worker for lagging connector |
| Worker CPU utilization | > 80% sustained 10 min | Add worker node to cluster |
| Streaming platform disk | > 75% | Add broker or expand storage |
| Consumer group lag | > 1M messages | Scale consumer instances |
| Snapshot duration | > SLA threshold | Increase snapshot parallelism |

---

## Reliability & Fault Tolerance

### Single Points of Failure

| Component | SPOF Risk | Mitigation |
|-----------|-----------|------------|
| Source database | CDC depends on source being online | Capture from read replica; replica promotion doesn't disrupt CDC |
| Replication slot (PostgreSQL) | Slot is tied to one database instance | Auto-recreate slot after failover; use failover slots (PG 17+) |
| Connector worker | Worker crash stops its assigned tasks | Automatic task rebalancing to surviving workers |
| Streaming platform leader | Partition leader failure stops writes to that partition | Automatic leader election (ISR-based); sub-second failover |
| Schema registry | Registry failure blocks serialization | HA deployment (3+ nodes); client-side schema caching as fallback |
| Offset storage | Offset loss causes re-processing from unknown position | Offsets stored in replicated streaming platform topic |

### Redundancy Strategy

- **3x replication** for all streaming platform topics (events and offsets)
- **3-node schema registry cluster** with leader election
- **N+1 connector workers** — at least one spare worker for task redistribution
- **Source database read replica** for CDC to isolate from primary failures
- **Cross-AZ deployment** for all CDC infrastructure components

### Failover Mechanisms

**Connector Worker Failure:**

```
1. Worker heartbeat timeout detected by controller (10 seconds)
2. Controller marks worker as dead
3. Tasks from dead worker redistributed to surviving workers
4. Each reassigned task:
   a. Reads last committed offset from offset store
   b. Reconnects to source database replication slot
   c. Resumes streaming from last committed offset
5. Duplicate events may be published (at-least-once window)
6. Consumer-side idempotency handles deduplication

Total recovery time: 15-30 seconds
```

**Source Database Failover:**

```
1. Source database primary fails; replica promoted
2. CDC connector detects connection loss
3. Connector enters retry loop with exponential backoff
4. Connector reconnects to new primary (DNS-based failover)
5. For PostgreSQL: replication slot may need recreation on new primary
   → Failover slots (PG 17+) automatically migrate
   → Without failover slots: re-snapshot may be needed
6. For MySQL: GTID-based positioning enables seamless failover
   → Connector resumes from last GTID, regardless of binlog file

Recovery depends on database failover time: typically 15-60 seconds
```

### Circuit Breaker Pattern

| Circuit | Trigger | Open Duration | Fallback |
|---------|---------|---------------|----------|
| Schema registry calls | > 50% failures in 30s | 30 seconds | Use cached schemas; buffer events |
| Streaming platform writes | > 5 consecutive failures | 15 seconds | Buffer events in memory; retry after cooldown |
| Source DB connection | Connection refused 3x | 60 seconds | Exponential backoff reconnection |
| Sink connector delivery | > 10% failure rate in 60s | 60 seconds | Pause sink; events accumulate in streaming platform |

### Retry Strategy

| Operation | Retry Count | Backoff | Notes |
|-----------|-------------|---------|-------|
| WAL read | Unlimited | Exponential (100ms → 30s) | Must eventually succeed for liveness |
| Event publish | 10 | Exponential (100ms → 5s) | With idempotent producer |
| Offset commit | 5 | Fixed (200ms) | Critical for exactly-once |
| Schema registry lookup | 3 | Exponential (50ms → 500ms) | Fallback to cache on exhaustion |
| Snapshot chunk read | 3 | Exponential (1s → 10s) | Resume from last chunk boundary |

### Graceful Degradation

| Severity | Condition | Degradation |
|----------|-----------|-------------|
| Level 1 | Single consumer slow | Other consumers unaffected; slow consumer accumulates lag |
| Level 2 | Connector worker failure | Tasks rebalanced; brief event duplication; < 30s recovery |
| Level 3 | Schema registry unavailable | Events buffered; new schemas cannot register; existing schemas served from cache |
| Level 4 | Streaming platform partition leader failure | Sub-second leader election; brief write stall for affected partitions |
| Level 5 | Source database failover | CDC pauses during DB failover; resumes automatically; no event loss with GTID/failover slots |
| Level 6 | Full streaming platform outage | Connector buffers locally until memory limit; pauses capture; resumes when platform recovers |

### Bulkhead Pattern

Separate resource pools to prevent one source or sink from affecting others:

| Bulkhead | Resources | Purpose |
|----------|-----------|---------|
| Per-connector thread pool | Dedicated threads per source connector | Isolate slow sources from fast ones |
| Snapshot pool | Separate threads for snapshot operations | Prevent snapshots from blocking streaming |
| Producer pool | Per-topic producer buffers | Prevent one slow topic from blocking others |
| Consumer group isolation | Separate consumer groups per sink type | Search indexing failures don't affect cache invalidation |

---

## Disaster Recovery

### Recovery Objectives

| Metric | Target | Strategy |
|--------|--------|----------|
| RPO (same region) | 0 events | Synchronous replication of streaming platform; durable offsets |
| RTO (same region) | < 30 seconds | Automatic connector rebalancing and leader election |
| RPO (cross-region) | < 5 seconds | Async streaming platform mirroring to standby region |
| RTO (cross-region) | < 5 minutes | Activate standby connectors + switch consumers to mirror topics |

### Backup Strategy

| Backup Type | Frequency | Retention | Method |
|-------------|-----------|-----------|--------|
| Connector configs | On change | 90 days | Versioned config store (Git-backed) |
| Offset snapshots | Hourly | 7 days | Export from offset topic to object storage |
| Schema registry | On change | Indefinite | Schema export to versioned storage |
| Streaming platform | Continuous | 7 days (hot), 30 days (cold) | Topic mirroring + periodic snapshot to object storage |
| Schema history | Continuous | Indefinite | Replicated internal topic |

### Multi-Region Considerations

| Topology | Latency | Consistency | Complexity |
|----------|---------|-------------|------------|
| Single-region CDC | Lowest | Strong | Low |
| CDC with cross-region mirror | Low locally; mirror lag | Eventual for mirror consumers | Medium |
| Multi-region active-passive CDC | Low in primary | Strong in primary | Medium |
| Multi-region active-active CDC | Low locally | Eventual; conflict risk | Very High (avoid) |

**Recommendation:** Single-region CDC with cross-region topic mirroring. CDC connectors run in the source database's region for lowest latency. A mirror-maker replicates events to the standby region for DR consumers. Active-active CDC (capturing from databases in multiple regions) introduces event ordering challenges and is generally avoided in favor of active-passive database replication.
