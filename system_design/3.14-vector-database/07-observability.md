# Observability

[← Back to Index](./00-index.md)

---

## Metrics Framework

### USE Method (for Resources)

| Resource | Utilization | Saturation | Errors |
|----------|-------------|------------|--------|
| **CPU** | `cpu_usage_percent` | `cpu_throttle_seconds` | - |
| **Memory** | `memory_used_bytes / memory_total` | `memory_oom_kills` | `memory_allocation_failures` |
| **Disk** | `disk_used_percent` | `disk_io_queue_depth` | `disk_read_errors`, `disk_write_errors` |
| **Network** | `network_bytes_in/out` | `network_queue_drops` | `network_errors` |
| **Index** | `index_vectors_count / index_capacity` | `index_build_queue_length` | `index_corruption_count` |

### RED Method (for Services)

| Service | Rate | Errors | Duration |
|---------|------|--------|----------|
| **Query API** | `query_requests_per_second` | `query_errors_total` | `query_latency_seconds` |
| **Upsert API** | `upsert_requests_per_second` | `upsert_errors_total` | `upsert_latency_seconds` |
| **Delete API** | `delete_requests_per_second` | `delete_errors_total` | `delete_latency_seconds` |
| **Index Build** | `index_builds_per_hour` | `index_build_failures` | `index_build_duration_seconds` |

---

## Key Metrics

### Query Performance Metrics

```yaml
# Core query metrics
vdb_query_latency_seconds:
  type: histogram
  labels: [collection, operation, status]
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
  description: Query latency distribution

vdb_query_total:
  type: counter
  labels: [collection, operation, status_code]
  description: Total number of queries

vdb_query_results_count:
  type: histogram
  labels: [collection]
  buckets: [1, 5, 10, 25, 50, 100]
  description: Number of results returned per query

# Recall quality (sampled)
vdb_recall_at_k:
  type: gauge
  labels: [collection, k]
  description: Sampled recall@k against exact search

# HNSW-specific
vdb_hnsw_hops_per_query:
  type: histogram
  labels: [collection, layer]
  buckets: [1, 2, 4, 8, 16, 32, 64]
  description: Number of graph hops per query

vdb_hnsw_distance_computations:
  type: histogram
  labels: [collection]
  buckets: [100, 500, 1000, 5000, 10000, 50000]
  description: Distance computations per query
```

### Write Performance Metrics

```yaml
# Write metrics
vdb_upsert_latency_seconds:
  type: histogram
  labels: [collection, sync_mode]
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1]
  description: Time to acknowledge upsert

vdb_upsert_vectors_total:
  type: counter
  labels: [collection]
  description: Total vectors upserted

vdb_upsert_batch_size:
  type: histogram
  labels: [collection]
  buckets: [1, 10, 100, 500, 1000, 5000]
  description: Vectors per upsert batch

# Buffer metrics
vdb_write_buffer_size:
  type: gauge
  labels: [shard]
  description: Current L0 buffer size (vectors)

vdb_write_buffer_age_seconds:
  type: gauge
  labels: [shard]
  description: Age of oldest unflushed vector

# WAL metrics
vdb_wal_size_bytes:
  type: gauge
  labels: [shard]
  description: Current WAL size
```

### Index Health Metrics

```yaml
# Index metrics
vdb_index_vectors_total:
  type: gauge
  labels: [collection, shard]
  description: Total indexed vectors

vdb_index_memory_bytes:
  type: gauge
  labels: [collection, shard, component]
  description: Memory usage by index component (vectors, graph, metadata)

vdb_index_build_duration_seconds:
  type: histogram
  labels: [collection, index_type]
  buckets: [60, 300, 600, 1800, 3600, 7200, 14400]
  description: Time to build index

vdb_index_segments_total:
  type: gauge
  labels: [collection, shard]
  description: Number of index segments

vdb_index_compaction_pending:
  type: gauge
  labels: [collection]
  description: Number of pending compactions
```

### Resource Metrics

```yaml
# Memory
vdb_memory_used_bytes:
  type: gauge
  labels: [node, type]  # type: vectors, graph, cache, buffer
  description: Memory usage breakdown

vdb_memory_allocated_bytes:
  type: gauge
  labels: [node]
  description: Total allocated memory

# CPU
vdb_cpu_usage_percent:
  type: gauge
  labels: [node, core]
  description: CPU utilization per core

# Disk
vdb_disk_used_bytes:
  type: gauge
  labels: [node, mount]
  description: Disk usage

vdb_disk_iops:
  type: gauge
  labels: [node, operation]  # read, write
  description: Disk I/O operations per second
```

### Cluster Health Metrics

```yaml
# Node health
vdb_nodes_total:
  type: gauge
  labels: [role, status]  # role: coordinator, data; status: healthy, unhealthy
  description: Node count by role and status

vdb_shards_total:
  type: gauge
  labels: [collection, status]  # status: active, initializing, recovering
  description: Shard count by status

# Replication
vdb_replication_lag_seconds:
  type: gauge
  labels: [shard, replica]
  description: Replication lag from primary

vdb_replication_lag_vectors:
  type: gauge
  labels: [shard, replica]
  description: Vectors behind primary
```

---

## Dashboard Design

### Executive Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│              Vector Database - Executive View                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ Availability│ │  Query p99  │ │ Total       │ │ Error  │ │
│  │   99.98%    │ │    23ms     │ │  Vectors    │ │  Rate  │ │
│  │   ▲ 0.01%   │ │   ▼ 5ms     │ │  98.2M      │ │ 0.02%  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Query Latency (24h)                                    ││
│  │  p50 ━━━  p95 ━━━  p99 ━━━                             ││
│  │   30│                                                   ││
│  │   20│     ╭───╮         ╭──╮                           ││
│  │   10│━━━━━╯   ╰━━━━━━━━━╯  ╰━━━━━━━━━━━━━━━━━          ││
│  │    0└────────────────────────────────────────           ││
│  │     00:00    06:00    12:00    18:00    00:00           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────┐ ┌────────────────────────────────┐│
│  │  Top Collections     │ │  Cluster Health                ││
│  │  ────────────────────│ │  ──────────────────────────────││
│  │  products    45M ███ │ │  Nodes: 8/8 healthy            ││
│  │  documents   32M ██  │ │  Shards: 24/24 active          ││
│  │  users       21M █   │ │  Replicas: 48/48 synced        ││
│  └──────────────────────┘ └────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Operations Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│              Vector Database - Operations View               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Query Performance                  Resource Utilization     │
│  ┌────────────────────────────┐    ┌────────────────────┐   │
│  │ QPS by Operation           │    │ Memory by Node     │   │
│  │ Query  ████████████ 1.2K  │    │ node-1  ███████░ 78%│   │
│  │ Upsert ██ 120              │    │ node-2  █████░░░ 65%│   │
│  │ Delete █ 45                │    │ node-3  ██████░░ 72%│   │
│  └────────────────────────────┘    └────────────────────┘   │
│                                                              │
│  Index Health                       Active Alerts            │
│  ┌────────────────────────────┐    ┌────────────────────┐   │
│  │ L0 Buffer: 12,450 vectors  │    │ ⚠ High memory on   │   │
│  │ Segments: 8 (compact: 2)   │    │   node-1 (78%)     │   │
│  │ Last build: 2h ago         │    │                    │   │
│  │ Recall@10: 96.2%           │    │ ✓ No critical      │   │
│  └────────────────────────────┘    └────────────────────┘   │
│                                                              │
│  Replication Status                                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Shard   Primary  Replica-1  Replica-2  Lag              ││
│  │ ──────────────────────────────────────────────────────  ││
│  │ shard-1 node-1   node-2 ✓   node-3 ✓   <1s              ││
│  │ shard-2 node-2   node-1 ✓   node-3 ✓   <1s              ││
│  │ shard-3 node-3   node-1 ⚠   node-2 ✓   3s (catching up) ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Logging Strategy

### Log Levels

| Level | Use Case | Examples |
|-------|----------|----------|
| **ERROR** | Failures requiring attention | Query timeout, index corruption, replication failure |
| **WARN** | Degraded performance or potential issues | High latency, low recall, memory pressure |
| **INFO** | Significant events | Index build complete, shard migration, config change |
| **DEBUG** | Detailed operational info | Query execution plan, candidate selection |
| **TRACE** | Very detailed debugging | Every HNSW hop, distance calculation |

### Structured Log Format

```json
{
  "timestamp": "2025-01-15T10:30:00.123Z",
  "level": "INFO",
  "service": "vector-db",
  "node": "node-1",
  "component": "query-engine",
  "trace_id": "abc123def456",
  "span_id": "789ghi",
  "message": "Query completed",
  "attributes": {
    "collection": "products",
    "top_k": 10,
    "filter": "category=electronics",
    "latency_ms": 12,
    "results_count": 10,
    "hnsw_hops": 7,
    "distance_computations": 1250,
    "recall_sampled": 0.95
  }
}
```

### What to Log

```
Query operations:
─────────────────────────────────────────────────────────
Log:
  • Request metadata (collection, top_k, filter presence)
  • Execution metrics (latency, results_count)
  • Error details (if failed)

DO NOT log:
  • Raw query vectors (privacy, size)
  • Full result vectors (size)
  • Sensitive metadata field values

Write operations:
─────────────────────────────────────────────────────────
Log:
  • Batch size, collection
  • Latency, outcome
  • WAL segment, offset

DO NOT log:
  • Vector values
  • All metadata (summarize: "45 fields")

Index operations:
─────────────────────────────────────────────────────────
Log:
  • Build start/complete
  • Duration, parameters
  • Memory usage
  • Errors/warnings

Administrative:
─────────────────────────────────────────────────────────
Log:
  • Collection create/delete
  • Configuration changes
  • User/role changes
  • Schema modifications
```

### Log Retention

| Log Type | Hot (Searchable) | Warm (Archived) | Cold (Compliance) |
|----------|------------------|-----------------|-------------------|
| Application | 7 days | 30 days | 1 year |
| Access/Audit | 30 days | 90 days | 7 years |
| Security | 30 days | 90 days | 7 years |
| Debug/Trace | 24 hours | - | - |

---

## Distributed Tracing

### Trace Propagation

```
┌─────────────────────────────────────────────────────────────┐
│              Distributed Trace Example                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  trace_id: abc123def456                                      │
│                                                              │
│  Client Request                                              │
│  ├─ [span-1] API Gateway (2ms)                              │
│  │  └─ Authenticate, validate, route                        │
│  │                                                           │
│  ├─ [span-2] Query Router (1ms)                             │
│  │  └─ Determine shards, prepare scatter                    │
│  │                                                           │
│  ├─ [span-3] Shard Query (parallel)                         │
│  │  ├─ [span-3a] Shard-1 (8ms)                              │
│  │  │  ├─ [span-3a1] L0 Buffer Search (1ms)                 │
│  │  │  ├─ [span-3a2] HNSW Search (5ms)                      │
│  │  │  │  └─ hops: 7, candidates: 150                       │
│  │  │  └─ [span-3a3] Filter & Score (2ms)                   │
│  │  │                                                        │
│  │  ├─ [span-3b] Shard-2 (7ms)                              │
│  │  │  └─ ...                                                │
│  │  │                                                        │
│  │  └─ [span-3c] Shard-3 (9ms)                              │
│  │     └─ ...                                                │
│  │                                                           │
│  ├─ [span-4] Result Merge (1ms)                             │
│  │  └─ Merge 30 candidates → top 10                         │
│  │                                                           │
│  └─ [span-5] Response (1ms)                                 │
│     └─ Serialize, compress                                   │
│                                                              │
│  Total: 12ms (critical path: span-3c → 9ms)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Spans to Instrument

| Span Name | Attributes | Purpose |
|-----------|------------|---------|
| `api.request` | method, path, status_code | Entry point visibility |
| `auth.validate` | auth_type, tenant_id | Security auditing |
| `router.scatter` | shard_count, collection | Understand query fan-out |
| `shard.search` | shard_id, vector_count | Per-shard performance |
| `hnsw.traverse` | layer, hops, ef | Algorithm deep-dive |
| `filter.apply` | filter_type, selectivity | Filter performance |
| `result.merge` | input_count, output_count | Aggregation overhead |
| `storage.read` | bytes, latency | I/O bottlenecks |

### Context Propagation

```
HTTP Headers:
  traceparent: 00-abc123def456-789ghi-01
  tracestate: vendor=value

W3C Trace Context format:
  version-trace_id-parent_span_id-flags

Internal propagation:
  • Pass trace context to all internal services
  • Include in async job metadata
  • Embed in WAL entries for write tracing
```

---

## Alerting

### Alert Severity Levels

| Severity | Response Time | Examples | Notification |
|----------|---------------|----------|--------------|
| **Critical** | <15 min | Cluster down, data loss risk | Page on-call |
| **High** | <1 hour | Shard failure, high error rate | Page on-call |
| **Medium** | <4 hours | Performance degradation | Slack + ticket |
| **Low** | Next business day | Capacity warning | Slack |

### Critical Alerts

```yaml
# Service availability
- alert: VectorDBDown
  expr: up{job="vector-db"} == 0
  for: 1m
  severity: critical
  summary: "Vector database instance {{ $labels.instance }} is down"
  runbook: "https://runbooks.example.com/vdb-down"

# Error rate spike
- alert: HighErrorRate
  expr: |
    sum(rate(vdb_query_total{status_code=~"5.."}[5m]))
    / sum(rate(vdb_query_total[5m])) > 0.05
  for: 2m
  severity: critical
  summary: "Query error rate above 5%"

# Data loss risk
- alert: ReplicationLagCritical
  expr: vdb_replication_lag_seconds > 60
  for: 5m
  severity: critical
  summary: "Replication lag > 60s for shard {{ $labels.shard }}"
```

### High Priority Alerts

```yaml
# Latency SLO breach
- alert: QueryLatencyHigh
  expr: |
    histogram_quantile(0.99, rate(vdb_query_latency_seconds_bucket[5m])) > 0.1
  for: 5m
  severity: high
  summary: "Query p99 latency above 100ms"

# Memory pressure
- alert: MemoryPressure
  expr: vdb_memory_used_bytes / vdb_memory_allocated_bytes > 0.85
  for: 10m
  severity: high
  summary: "Memory usage above 85% on {{ $labels.node }}"

# Index quality degradation
- alert: RecallDegraded
  expr: vdb_recall_at_k{k="10"} < 0.90
  for: 15m
  severity: high
  summary: "Recall@10 dropped below 90% for {{ $labels.collection }}"
```

### Warning Alerts

```yaml
# Approaching capacity
- alert: CapacityWarning
  expr: vdb_index_vectors_total / vdb_index_capacity > 0.7
  for: 1h
  severity: medium
  summary: "Collection {{ $labels.collection }} at 70% capacity"

# L0 buffer growing
- alert: WriteBufferLarge
  expr: vdb_write_buffer_size > 50000
  for: 30m
  severity: medium
  summary: "L0 buffer has {{ $value }} vectors (should flush)"

# Compaction needed
- alert: TooManySegments
  expr: vdb_index_segments_total > 20
  for: 1h
  severity: low
  summary: "Collection {{ $labels.collection }} has {{ $value }} segments"
```

### SLO-Based Alerts

```yaml
# Error budget burn rate (fast)
- alert: ErrorBudgetFastBurn
  expr: |
    (
      1 - (sum(rate(vdb_query_total{status_code="200"}[1h]))
           / sum(rate(vdb_query_total[1h])))
    ) > 14.4 * (1 - 0.999)
  for: 5m
  severity: critical
  summary: "Burning error budget at 14.4x rate (exhaust in 5 days)"

# Error budget burn rate (slow)
- alert: ErrorBudgetSlowBurn
  expr: |
    (
      1 - (sum(rate(vdb_query_total{status_code="200"}[6h]))
           / sum(rate(vdb_query_total[6h])))
    ) > 6 * (1 - 0.999)
  for: 30m
  severity: high
  summary: "Burning error budget at 6x rate (exhaust in 10 days)"
```

---

## Runbook References

| Alert | Runbook | First Response |
|-------|---------|----------------|
| VectorDBDown | `/runbooks/vdb-down.md` | Check node health, restart if needed |
| HighErrorRate | `/runbooks/high-errors.md` | Check logs, identify root cause |
| ReplicationLagCritical | `/runbooks/replication-lag.md` | Check network, promote if needed |
| QueryLatencyHigh | `/runbooks/latency-high.md` | Scale out or reduce ef_search |
| MemoryPressure | `/runbooks/memory-pressure.md` | Restart, add nodes, or tune index |
| RecallDegraded | `/runbooks/recall-degraded.md` | Rebuild index, check parameters |

### Sample Runbook Structure

```markdown
# Runbook: High Query Latency

## Overview
Query p99 latency exceeds SLO threshold (100ms).

## Symptoms
- Slow API responses
- Timeouts in client applications
- Alert: QueryLatencyHigh

## Diagnosis Steps
1. Check which collections are affected
   ```
   sum by (collection) (rate(vdb_query_latency_seconds_sum[5m]))
   / sum by (collection) (rate(vdb_query_latency_seconds_count[5m]))
   ```

2. Check resource utilization
   - Memory: Near limit? Swapping?
   - CPU: Saturated?
   - Network: High latency between nodes?

3. Check index health
   - Segment count (too many → compaction needed)
   - L0 buffer size (too large → flush stuck)

## Resolution
1. **Quick fix**: Reduce ef_search temporarily
2. **Scale out**: Add replicas to distribute load
3. **Optimize**: Trigger compaction, rebuild index

## Prevention
- Set up capacity alerts at 70%
- Auto-scale on latency threshold
```
