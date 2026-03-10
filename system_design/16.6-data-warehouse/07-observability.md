# Observability — Data Warehouse

## Metrics (USE/RED Framework)

### Query Engine Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `query.latency.p50` | Histogram | Median query execution time | > 5s for simple queries |
| `query.latency.p99` | Histogram | 99th percentile query execution time | > 60s for any query |
| `query.throughput` | Counter | Queries completed per second | < 10 QPS during business hours |
| `query.error_rate` | Gauge | Percentage of queries returning errors | > 1% |
| `query.compilation_time` | Histogram | SQL → execution plan compilation time | > 2s (p99) |
| `query.queue_time` | Histogram | Time waiting for available compute | > 5s (p95) |
| `query.queue_depth` | Gauge | Number of queries waiting for compute | > 50 |
| `query.concurrent_active` | Gauge | Currently executing queries | Informational |

### Compute Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `warehouse.cpu_utilization` | Gauge | Average CPU utilization across warehouse nodes | > 85% sustained 10 min |
| `warehouse.memory_utilization` | Gauge | Average memory utilization | > 90% |
| `warehouse.node_count` | Gauge | Active compute nodes | Informational |
| `warehouse.cluster_count` | Gauge | Active compute clusters (multi-cluster) | Informational |
| `warehouse.spill_to_disk_bytes` | Counter | Bytes spilled to local disk during execution | > 10 GB per query |
| `warehouse.spill_ratio` | Gauge | Spill bytes / total bytes processed | > 20% |
| `warehouse.idle_time` | Counter | Seconds warehouse is running with no queries | > auto-suspend timeout |

### Storage Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `storage.total_bytes` | Gauge | Total compressed data in object storage | Informational (cost tracking) |
| `storage.time_travel_bytes` | Gauge | Storage used by time travel snapshots | > 2x active data size |
| `storage.partitions_total` | Gauge | Total micro-partitions across all tables | Informational |
| `storage.clustering_depth` | Gauge | Average clustering depth for clustered tables | > 10 (indicates reclustering needed) |
| `storage.bytes_scanned` | Counter | Total bytes read from storage per hour | Informational (cost tracking) |

### Cache Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `cache.result_hit_ratio` | Gauge | Percentage of queries served from result cache | < 10% (check cache invalidation) |
| `cache.ssd_hit_ratio` | Gauge | Percentage of partition reads served from SSD | < 60% |
| `cache.ssd_utilization` | Gauge | SSD cache capacity utilization | > 95% (cache pressure) |
| `cache.eviction_rate` | Counter | Cache entries evicted per second | > 1000/s (thrashing) |
| `cache.metadata_hit_ratio` | Gauge | Metadata cache hit ratio | < 95% |

### Data Ingestion Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `ingestion.rows_loaded` | Counter | Rows loaded per minute | < expected baseline |
| `ingestion.bytes_loaded` | Counter | Compressed bytes loaded per minute | < expected baseline |
| `ingestion.load_latency` | Histogram | End-to-end load operation duration | > 5 min for micro-batch |
| `ingestion.error_count` | Counter | Rows/files rejected during load | > 0 (investigate data quality) |
| `ingestion.freshness_lag` | Gauge | Seconds since last successful load commit | > freshness SLO |

---

## Dashboard Design

### Dashboard 1: Executive Overview

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| Query Success Rate | Single stat with threshold coloring | `query.error_rate` |
| Active Warehouses | Count badge | `warehouse.node_count` |
| Total Storage | Trend line (30 days) | `storage.total_bytes` |
| Daily Query Volume | Bar chart by hour | `query.throughput` |
| Cost Estimate (compute + storage) | Trend line with budget line | Derived from warehouse uptime + storage |
| Top 10 Slowest Queries | Table with user, SQL hash, duration | Query history |

### Dashboard 2: Query Performance

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| Query Latency Distribution | Histogram (p50, p95, p99) | `query.latency` |
| Queue Time Trend | Time series | `query.queue_time` |
| Queries by Status | Pie chart (running, queued, completed, failed) | Query history |
| Scan Efficiency | Scatter plot (bytes scanned vs. rows returned) | Per-query metadata |
| Partition Pruning Rate | Distribution histogram | `partitions_pruned / partitions_total` |
| Spill-to-Disk Events | Time series with threshold line | `warehouse.spill_to_disk_bytes` |

### Dashboard 3: Storage & Ingestion

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| Storage Growth Trend | Stacked area (active, time travel, staging) | `storage.*_bytes` |
| Clustering Health | Heatmap by table (depth as color) | `storage.clustering_depth` |
| Ingestion Throughput | Time series (rows/min, bytes/min) | `ingestion.*` |
| Data Freshness | Single stat per source | `ingestion.freshness_lag` |
| Load Errors | Bar chart by error type | `ingestion.error_count` |

### Dashboard 4: Cache & Cost

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| Cache Hit Ratios | Gauge (result, SSD, metadata) | `cache.*_hit_ratio` |
| SSD Cache Utilization | Time series per node | `cache.ssd_utilization` |
| Compute Credit Consumption | Stacked bar by warehouse | Warehouse uptime × size |
| Storage Cost Breakdown | Pie chart (active, time travel, staging) | Storage billing |
| Cost per Query (distribution) | Histogram | Derived: compute time × rate / query count |

---

## Logging

### What to Log

| Event Type | Log Level | Content |
|-----------|-----------|---------|
| Query submission | INFO | Query ID, user, SQL hash, warehouse, timestamp |
| Query completion | INFO | Query ID, duration, rows returned, bytes scanned, partitions pruned |
| Query failure | ERROR | Query ID, error code, error message, partial execution stats |
| Warehouse scaling | INFO | Warehouse ID, old size → new size, trigger reason |
| Data load | INFO | Load ID, table, files processed, rows loaded, duration |
| Load error | WARN | Load ID, file path, row number, error detail |
| Cache eviction | DEBUG | Cache type, key evicted, reason (LRU, invalidation) |
| Partition pruning | DEBUG | Query ID, table, total partitions, pruned, scanned |

### Structured Log Format

```json
{
  "timestamp": "2025-03-15T14:30:22.456Z",
  "level": "INFO",
  "service": "query-engine",
  "node_id": "compute-07",
  "warehouse_id": "wh-bi-prod",
  "event": "query.completed",
  "query_id": "q-abc-123-def",
  "user": "analyst@company.com",
  "sql_hash": "sha256:a3f2b9c1...",
  "duration_ms": 2340,
  "rows_returned": 1247,
  "bytes_scanned": 720000000,
  "partitions_total": 12045,
  "partitions_scanned": 245,
  "partitions_pruned": 11800,
  "cache_hit": false,
  "spill_bytes": 0,
  "compilation_ms": 85
}
```

### Log Levels Strategy

| Level | When to Use | Volume |
|-------|-------------|--------|
| ERROR | Query failure, node crash, data corruption | Low |
| WARN | Load rejection, performance degradation, approaching limits | Low-Medium |
| INFO | Query lifecycle events, scaling events, load completions | Medium |
| DEBUG | Partition pruning details, cache events, plan selection | High (sampling) |

---

## Query Profiling

### Query Profile Structure

Every completed query produces a detailed execution profile:

```
Query Profile: q-abc-123-def
├── Compilation: 85 ms
│   ├── Parsing: 12 ms
│   ├── Optimization: 68 ms (join reorder: 45 ms, MV matching: 23 ms)
│   └── Code generation: 5 ms
├── Execution: 2,255 ms
│   ├── Scan(sales): 1,200 ms
│   │   ├── Partitions: 245 scanned / 12,045 total (98% pruned)
│   │   ├── Bytes: 720 MB scanned / 45 GB total (98.4% pruned)
│   │   ├── Source: 30% SSD cache, 70% object storage
│   │   └── Decompression: 180 ms
│   ├── Filter(sale_date, region): 120 ms
│   │   └── Rows: 12M input → 1.2M output (90% filtered)
│   ├── HashJoin(sales ⟕ products): 450 ms
│   │   ├── Build side: products (50K rows, 4 MB)
│   │   ├── Probe side: 1.2M rows
│   │   ├── Strategy: broadcast join
│   │   └── Spill: none
│   ├── Aggregate(SUM, GROUP BY region): 350 ms
│   │   └── Groups: 1.2M input → 8 output
│   └── Sort(revenue DESC): 5 ms
│       └── Rows: 8
└── Result: 8 rows, 320 bytes
```

### Slow Query Analysis

Queries exceeding latency thresholds are automatically profiled with additional detail:

| Analysis | Details |
|----------|---------|
| **Partition pruning effectiveness** | How many partitions were scanned vs. pruned; suggests clustering improvements |
| **Spill analysis** | Which operators spilled, how much, and whether a larger warehouse would eliminate spills |
| **Scan source breakdown** | SSD cache vs. object storage reads; identifies cache warming opportunities |
| **Join strategy evaluation** | Whether the optimizer chose the best join strategy; highlights potential hash table size issues |
| **Resource wait time** | Time spent waiting for compute, network, or I/O resources |

---

## Distributed Tracing

### Trace Propagation

Query traces span multiple components:

```
[Client] → [Cloud Services: parse, optimize] → [Workload Manager: route]
  → [Compute Node 1: scan partitions 1-100, filter, partial aggregate]
  → [Compute Node 2: scan partitions 101-200, filter, partial aggregate]
  → [Coordinator: merge aggregates, sort, return result]
```

### Spans to Instrument

| Span | Parent | Key Attributes |
|------|--------|----------------|
| `query.submission` | Root | user, sql_hash, warehouse_id |
| `query.compilation` | submission | parse_ms, optimize_ms, plan_cache_hit |
| `query.routing` | submission | warehouse_id, cluster_id, queue_wait_ms |
| `fragment.scan` | routing | node_id, partitions, bytes_scanned, cache_hit_ratio |
| `fragment.filter` | scan | rows_in, rows_out, selectivity |
| `fragment.join` | routing | strategy, build_size, probe_size, spill_bytes |
| `fragment.aggregate` | routing | groups_in, groups_out, partial_vs_final |
| `fragment.shuffle` | routing | bytes_transferred, target_nodes |
| `query.result` | submission | rows_returned, total_duration_ms |

---

## Alerting

### Critical Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| Query error rate spike | `query.error_rate > 5%` for 5 min | Page on-call; investigate metadata service and compute health |
| Warehouse unresponsive | No heartbeat from any node for 30s | Auto-restart warehouse; page if restart fails |
| Data freshness SLO breach | `ingestion.freshness_lag > SLO` for 15 min | Alert data engineering; check ETL pipeline |
| Storage approaching limit | `storage.total_bytes > 90% quota` | Alert account admin; review retention policies |
| Metadata store quorum loss | Less than 2 of 3 replicas healthy | Page infrastructure; all queries will fail soon |

### Warning Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| High query queue time | `query.queue_time.p95 > 10s` for 10 min | Consider adding compute clusters or scaling up |
| Spill-to-disk ratio elevated | `warehouse.spill_ratio > 20%` for 30 min | Consider larger warehouse size |
| SSD cache hit ratio low | `cache.ssd_hit_ratio < 50%` for 1 hour | Review query patterns; consider pre-warming |
| Clustering depth degraded | `storage.clustering_depth > 20` | Trigger re-clustering on affected tables |
| Abnormal scan volume | `storage.bytes_scanned > 3x daily average` | Investigate — possible runaway query or missing filters |

### Runbook References

| Alert | Runbook |
|-------|---------|
| Query error rate spike | Check metadata service health → check compute node status → review error codes in query log |
| Warehouse unresponsive | Verify network connectivity → check cloud provider status → force restart → provision replacement |
| Data freshness breach | Check ETL pipeline status → verify source system availability → check load error log |
| High spill ratio | Identify spilling queries → evaluate warehouse size → check for missing partition pruning |
| Clustering degradation | Review clustering key effectiveness → evaluate table size → trigger manual recluster |
