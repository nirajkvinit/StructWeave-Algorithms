# Observability — Graph Database

## Metrics (USE/RED)

### Key Metrics to Track

#### Storage Engine Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `graph.nodes.total` | Gauge | Total node count by label | — |
| `graph.edges.total` | Gauge | Total edge count by type | — |
| `graph.store.size_bytes` | Gauge | Store file sizes (node, rel, prop, index) | > 80% disk |
| `graph.buffer_cache.hit_ratio` | Gauge | Buffer cache hit rate | < 85% |
| `graph.buffer_cache.evictions_per_sec` | Rate | Page evictions from buffer cache | > 10K/s |
| `graph.wal.size_bytes` | Gauge | WAL size since last checkpoint | > 10 GB |
| `graph.wal.fsync_latency_ms` | Histogram | WAL fsync duration | p99 > 50ms |
| `graph.compaction.active` | Gauge | Number of active compaction threads | — |
| `graph.store.fragmentation_ratio` | Gauge | Ratio of dead to live records | > 30% |

#### Query Engine Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `query.latency_ms` | Histogram | Query execution time (by type: read/write/analytics) | p99 > 100ms (read) |
| `query.throughput` | Rate | Queries per second by type | — |
| `query.errors` | Counter | Failed queries by error type | > 0.1% error rate |
| `query.plan_cache.hit_ratio` | Gauge | Plan cache reuse rate | < 80% |
| `query.active` | Gauge | Currently executing queries | > 80% of thread pool |
| `query.queue_depth` | Gauge | Queries waiting for execution thread | > 50 |
| `query.timeout_count` | Counter | Queries terminated by timeout | > 10/min |
| `query.killed_count` | Counter | Queries killed by query guard | > 5/min |

#### Traversal-Specific Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `traversal.hops_per_query` | Histogram | Number of hops per traversal | p99 > 10 |
| `traversal.nodes_expanded` | Histogram | Nodes visited per query | p99 > 100K |
| `traversal.edges_traversed` | Histogram | Edges followed per query | p99 > 500K |
| `traversal.cross_partition_hops` | Counter | Hops requiring network call | > 30% of total hops |
| `traversal.supernode_hits` | Counter | Traversals touching supernodes | — (informational) |
| `traversal.depth_limit_reached` | Counter | Queries hitting max depth | > 100/min |

#### Transaction Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `tx.active` | Gauge | Open transactions | > 500 |
| `tx.commit_latency_ms` | Histogram | Time to commit | p99 > 100ms |
| `tx.rollback_rate` | Rate | Rollback rate | > 5% |
| `tx.deadlock_count` | Counter | Deadlocks detected | > 10/min |
| `tx.lock_wait_time_ms` | Histogram | Time spent waiting for locks | p99 > 200ms |

#### Replication Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `replication.lag_bytes` | Gauge | WAL bytes behind leader | > 100 MB |
| `replication.lag_seconds` | Gauge | Estimated seconds behind leader | > 5s |
| `replication.follower_health` | Gauge | Healthy followers per partition | < 2 |
| `replication.leader_elections` | Counter | Leader election events | > 1/hour |

### Dashboard Design

**Dashboard 1: Cluster Overview**
- Total nodes/edges (gauge)
- Query throughput (time series)
- Active transactions (gauge)
- Buffer cache hit ratio (gauge)
- Replication lag per partition (heatmap)

**Dashboard 2: Query Performance**
- Query latency distribution (histogram by type)
- Slowest queries (top-K table)
- Plan cache hit ratio (gauge)
- Traversal depth distribution (histogram)
- Cross-partition hop ratio (time series)

**Dashboard 3: Storage & Capacity**
- Store file sizes over time (stacked area)
- WAL size and checkpoint frequency (time series)
- Fragmentation ratio (gauge per store)
- Disk I/O throughput (read/write breakdown)
- Buffer cache usage and eviction rate (time series)

**Dashboard 4: Supernode Monitor**
- Top 100 supernodes by edge count (table)
- Supernode access frequency (heatmap)
- Vertex-centric index utilization (gauge)
- Lock contention on supernodes (time series)

---

## Logging

### What to Log

| Event | Log Level | Content |
|-------|-----------|---------|
| Query execution | INFO | Query template (parameters redacted), execution time, rows returned, plan used |
| Slow query | WARN | Full query plan, actual vs. estimated cardinalities, wait events |
| Transaction commit/rollback | INFO | Transaction ID, duration, affected node/edge count |
| Deadlock detection | WARN | Transaction IDs involved, lock resources, resolution (which TX aborted) |
| Schema change | INFO | DDL statement, user, before/after schema version |
| Authentication failure | WARN | Client IP, username attempted, failure reason |
| Authorization denial | WARN | User, denied operation, resource, policy that denied |
| Query guard kill | WARN | Query template, resources consumed, kill reason |
| Leader election | INFO | Partition ID, old leader, new leader, election duration |
| Compaction event | DEBUG | Store file, records compacted, space reclaimed |

### Log Levels Strategy

| Level | Production Volume | Use Case |
|-------|------------------|----------|
| ERROR | < 100/min | System failures, data corruption, replication failures |
| WARN | < 1,000/min | Slow queries, auth failures, deadlocks, capacity warnings |
| INFO | < 10,000/min | Query execution summaries, transactions, leader elections |
| DEBUG | Disabled in prod | Traversal step-by-step, buffer cache operations, lock acquisition |
| TRACE | Never in prod | Per-record reads, pointer chain walks, WAL entry details |

### Structured Logging Format

```
{
  "timestamp": "2026-03-10T14:32:01.234Z",
  "level": "WARN",
  "component": "query_engine",
  "event": "slow_query",
  "query_id": "q-abc-123",
  "database": "social_graph",
  "query_template": "MATCH (a:Person)-[:KNOWS*2..3]->(b) WHERE a.id = $id RETURN b",
  "execution_time_ms": 1250,
  "rows_returned": 4521,
  "nodes_expanded": 125000,
  "edges_traversed": 380000,
  "plan": "IndexSeek(a) -> Expand(*2..3) -> Filter",
  "cross_partition_hops": 12,
  "supernode_hits": 3,
  "user": "app-service-prod",
  "client_ip": "10.0.1.42"
}
```

---

## Distributed Tracing

### Trace Propagation Strategy

Graph queries are unique in tracing because a single query may fan out to multiple storage nodes, creating a tree-shaped trace rather than a linear chain.

**Trace context propagation:**

```
Client Request
  └── Query Router (parse, plan)
        └── Partition 1: Traversal (local hops)
        └── Partition 2: Traversal (remote hop from P1)
        └── Partition 3: Property fetch (from P2 result)
        └── Merge Results
              └── Response to Client
```

### Key Spans to Instrument

| Span | Parent | Key Attributes |
|------|--------|---------------|
| `query.parse` | Root | query_template, parameter_count |
| `query.plan` | Root | plan_type, estimated_cost, plan_cache_hit |
| `query.execute` | Root | total_rows, execution_time |
| `traversal.expand` | execute | hop_number, partition_id, nodes_expanded |
| `traversal.remote_hop` | expand | source_partition, target_partition, latency |
| `storage.page_read` | expand | store_type (node/rel/prop), cache_hit |
| `tx.lock_acquire` | execute | lock_type, resource_id, wait_time |
| `tx.wal_write` | execute | wal_bytes, fsync_time |
| `replication.send` | wal_write | target_follower, bytes_sent |

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Severity | Runbook |
|-------|-----------|----------|---------|
| **Replication lag critical** | lag_seconds > 30s for > 5 min | P1 | Check follower health, network, WAL throughput |
| **Leader election failure** | No leader elected after 60s | P1 | Manual intervention; check quorum, network |
| **Data corruption detected** | Consistency check failure | P1 | Stop writes; initiate restore from backup |
| **Buffer cache exhaustion** | hit_ratio < 70% for > 10 min | P1 | Identify memory-heavy queries; add capacity |
| **Cluster quorum lost** | < majority of replicas healthy | P1 | Network investigation; consider manual failover |

### Warning Alerts

| Alert | Condition | Severity | Runbook |
|-------|-----------|----------|---------|
| **Slow query spike** | p99 latency > 500ms for > 5 min | P2 | Review slow query log; check plan cache |
| **High deadlock rate** | > 50 deadlocks/min for > 5 min | P2 | Review concurrent write patterns; optimize lock ordering |
| **WAL growth** | WAL size > 10 GB | P2 | Trigger checkpoint; verify checkpoint process is running |
| **Disk space warning** | > 75% utilization | P2 | Plan capacity expansion; review data retention |
| **Supernode growth** | Node degree exceeds 1M | P3 | Review data model; consider splitting supernode |
| **Cross-partition ratio high** | > 40% of hops cross partitions | P3 | Schedule repartitioning; review access patterns |
| **Query guard kills** | > 50 killed queries/hour | P3 | Review application query patterns; optimize or add limits |

### Runbook References

| Runbook | Scenario | Key Steps |
|---------|----------|-----------|
| RB-001 | Leader failover | Verify quorum → Check follower WAL positions → Confirm election → Validate client reconnection |
| RB-002 | Buffer cache tuning | Identify top queries by cache misses → Adjust cache allocation → Monitor hit ratio |
| RB-003 | Supernode mitigation | Identify affected queries → Add vertex-centric index → Consider relationship grouping → Monitor performance |
| RB-004 | Repartitioning | Trigger community detection → Generate new partition plan → Execute online migration → Verify edge cut ratio |
| RB-005 | Consistency repair | Stop cluster → Run consistency checker → Repair from WAL or backup → Restart and verify |
