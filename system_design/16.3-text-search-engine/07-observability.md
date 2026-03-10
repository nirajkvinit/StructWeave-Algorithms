# 16.3 Observability

## Metrics (USE/RED)

### Key Metrics Dashboard

| Category | Metric | Target | Alert Threshold |
|---|---|---|---|
| **Search Latency** | Query p50 latency | < 20ms | > 50ms for 5 min |
| | Query p99 latency | < 500ms | > 1s for 5 min |
| | Fetch phase p99 latency | < 100ms | > 300ms for 5 min |
| **Search Throughput** | Queries per second (QPS) | Baseline +-30% | > 2x baseline (traffic spike) or < 0.5x baseline (possible issue) |
| | Query cache hit rate | > 30% | < 10% (cache ineffective or thrashing) |
| **Indexing** | Indexing rate (docs/sec) | Baseline +-20% | Drop to 0 for > 1 min (pipeline blocked) |
| | Indexing latency (p99) | < 100ms | > 500ms for 5 min |
| | Bulk rejection rate | < 0.1% | > 1% (backpressure) |
| **Segments** | Segment count per shard | < 50 | > 100 (merge falling behind) |
| | Merge rate (MB/sec) | Sustaining | < 50% of indexing rate (merge debt growing) |
| | Deleted doc percentage | < 20% | > 40% (force merge needed) |
| **Resources** | JVM heap usage | < 75% | > 85% (GC pressure) |
| | CPU utilization | < 70% | > 85% sustained |
| | Disk utilization | < 75% | > 85% (add nodes or delete data) |
| | File descriptors used | < 80% of limit | > 90% (segment count or shard count too high) |
| **Cluster Health** | Cluster status | Green | Yellow (unassigned replicas) or Red (unassigned primaries) |
| | Unassigned shards | 0 | > 0 for > 5 min |
| | Pending tasks | < 10 | > 100 (master overloaded) |

### Shard-Level Metrics

```
ShardMetrics {
    shard_id:               string
    index:                  string
    role:                   enum(PRIMARY, REPLICA)
    node:                   string

    // Size and docs
    store_size_bytes:       uint64
    doc_count:              uint32
    deleted_doc_count:      uint32

    // Indexing
    indexing_total:          uint64      // Cumulative indexed docs
    indexing_current:        uint32      // In-flight indexing operations
    indexing_failed:         uint64      // Failed indexing operations

    // Search
    query_total:            uint64      // Cumulative queries
    query_time_ms:          uint64      // Cumulative query time
    fetch_total:            uint64      // Cumulative fetch operations
    fetch_time_ms:          uint64      // Cumulative fetch time

    // Segments
    segment_count:          uint32
    segment_memory_bytes:   uint64      // Memory used by segment metadata

    // Translog
    translog_operations:    uint32      // Uncommitted translog ops
    translog_size_bytes:    uint64

    // Merge
    merge_total:            uint64
    merge_current:          uint32
    merge_total_time_ms:    uint64
    merge_total_size_bytes: uint64

    // Refresh
    refresh_total:          uint64
    refresh_total_time_ms:  uint64
}
```

---

## Logging

### What to Log

| Event | Log Level | Details |
|---|---|---|
| Search request received | DEBUG | Query hash, index, user, source IP |
| Search completed | INFO | Query hash, took_ms, total_hits, shards_queried, cache_hit |
| Slow query (> p95 threshold) | WARN | Full query body, took_ms, shard breakdown, segments_searched |
| Indexing error | ERROR | Document ID, index, error type, stack trace |
| Shard failure during query | WARN | Shard ID, node, error, whether partial results returned |
| Circuit breaker tripped | ERROR | Breaker name, limit, current_usage, request_size |
| Cluster state change | INFO | New master, shard relocations, index creation/deletion |
| Node join/leave | WARN | Node ID, node role, reason for departure |

### Structured Log Format

```
{
    "timestamp": "2026-03-10T14:23:45.678Z",
    "level": "WARN",
    "logger": "search.slow_log",
    "cluster": "prod-search-east",
    "node": "data-node-07",
    "message": "Slow query detected",
    "query_hash": "a1b2c3d4",
    "index": "products-2026.03",
    "took_ms": 847,
    "total_hits": 15234,
    "shards_total": 20,
    "shards_successful": 20,
    "source": "{\"query\":{\"bool\":{\"must\":[{\"match\":{\"title\":\"wireless headphones\"}}],\"filter\":[{\"range\":{\"price\":{\"lte\":100}}}]}}}",
    "user": "search-api-key-prod",
    "trace_id": "abc123def456"
}
```

### Slow Query Log Configuration

```
// Slow log thresholds (per-index setting)
index.search.slowlog.threshold.query.warn:    1s
index.search.slowlog.threshold.query.info:    500ms
index.search.slowlog.threshold.query.debug:   100ms

index.search.slowlog.threshold.fetch.warn:    500ms
index.search.slowlog.threshold.fetch.info:    200ms

index.indexing.slowlog.threshold.index.warn:  5s
index.indexing.slowlog.threshold.index.info:  1s

// Slow log captures the full query body for debugging
// IMPORTANT: sanitize PII from slow logs (same pipeline as audit logs)
```

---

## Distributed Tracing

### Key Spans to Instrument

```
Search Request Trace:
[coordinator] search_request (total)
  ├── [coordinator] parse_query
  ├── [coordinator] check_cache
  ├── [coordinator] scatter_query_phase
  │     ├── [data-node-1] shard_query (shard 0)
  │     │     ├── open_searcher
  │     │     ├── execute_query
  │     │     │     ├── term_lookup (FST traversal)
  │     │     │     ├── posting_list_scan
  │     │     │     └── bm25_scoring
  │     │     └── compute_aggregations
  │     ├── [data-node-2] shard_query (shard 1)
  │     └── [data-node-3] shard_query (shard 2)
  ├── [coordinator] merge_results
  ├── [coordinator] scatter_fetch_phase
  │     ├── [data-node-1] shard_fetch (doc_5, doc_2)
  │     │     ├── load_stored_fields
  │     │     └── highlight_generation
  │     └── [data-node-2] shard_fetch (doc_99)
  ├── [coordinator] assemble_response
  └── [coordinator] update_cache

Indexing Request Trace:
[coordinator] index_request (total)
  ├── [coordinator] route_to_primary
  ├── [primary-node] primary_index
  │     ├── analyze_document
  │     ├── write_translog
  │     └── add_to_memory_buffer
  ├── [replica-node-1] replica_index
  └── [replica-node-2] replica_index
```

### Trace Propagation

```
// Trace context propagated via HTTP headers
// X-Opaque-Id: client-provided request ID for correlation
// traceparent: W3C Trace Context header (version-traceid-spanid-flags)

// Use case: trace a slow search from client -> coordinator -> data nodes
// Identifies which shard/segment is the bottleneck
// Example: one shard took 800ms (large segment, cold cache) while others took 20ms
```

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Runbook |
|---|---|---|
| **Cluster RED** | Any primary shard unassigned for > 2 min | Check node health; identify failed node; verify disk space; check allocation explain API |
| **All coordinators down** | Zero healthy coordinators for > 30s | Failover to backup coordinators; check load balancer health checks; verify network connectivity |
| **Indexing pipeline stopped** | Zero documents indexed for > 5 min during business hours | Check bulk queue rejections; verify upstream data pipeline; check translog errors |
| **Search latency spike** | p99 > 2s for > 5 min | Check slow query log; identify hot shards; check GC pauses; verify no merge storms |
| **Disk space critical** | Any data node > 90% disk | Enable watermark allocation (blocks writes at 95%); delete old indexes; add nodes; trigger ILM early |

### Warning Alerts

| Alert | Condition | Action |
|---|---|---|
| **Cluster YELLOW** | Replica shards unassigned for > 10 min | Check node capacity; verify zone awareness; review allocation filters |
| **High GC frequency** | > 5 old-gen GC pauses/min | Review heap usage; check for large aggregations; reduce field data cache size |
| **Merge debt growing** | Segment count per shard increasing steadily | Review refresh interval; check merge thread count; consider force-merge for read-only indexes |
| **Translog size large** | Translog > 1 GB on any shard | Check if flush is blocked; verify disk I/O; trigger manual flush if needed |
| **Query rejection rate** | > 1% of queries rejected (circuit breaker) | Reduce concurrent queries; increase heap; review query complexity |
| **Replication lag** | Cross-cluster replication lag > 30s | Check network between clusters; verify follower cluster capacity |

---

## Operational Runbooks

### Runbook: Recovering from Cluster RED

```
1. Identify unassigned primary shards:
   GET _cluster/health?level=shards (find RED shards)

2. Check allocation explanation:
   GET _cluster/allocation/explain?include_disk_info=true
   (shows WHY the shard cannot be allocated)

3. Common causes and fixes:
   a. Node down: wait for node recovery (translog replay)
   b. Disk full: free disk space or add nodes
   c. Allocation filter conflict: review index.routing.allocation settings
   d. Corruption: restore from snapshot (last resort)

4. Force allocate stale primary (DATA LOSS RISK):
   POST _cluster/reroute
   (only if no other copy exists; accepts data loss for availability)
```

### Runbook: Handling a Merge Storm

```
1. Identify affected shards:
   GET _cat/segments?v&s=shard,segment (count segments per shard)

2. Temporarily throttle merging:
   PUT _cluster/settings
   {"persistent": {"indices.store.throttle.max_bytes_per_sec": "20mb"}}

3. Increase refresh interval for heavy-write indexes:
   PUT /heavy-write-index/_settings
   {"index": {"refresh_interval": "30s"}}

4. After load subsides, force-merge read-only indexes:
   POST /old-index/_forcemerge?max_num_segments=1

5. Monitor: segment count should decrease, query latency should improve
```
