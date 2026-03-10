# Observability --- Time-Series Database

## The Meta-Monitoring Challenge

A TSDB that stores metrics must itself be monitored---creating a circular dependency. If the TSDB's ingestion pipeline is overloaded, the metrics that would tell you about the overload are the ones being dropped. The solution is a lightweight, independent meta-monitoring stack that observes the TSDB's internal health without depending on the TSDB itself.

### Meta-Monitoring Architecture

```
Primary TSDB Cluster                    Meta-Monitoring Stack
┌─────────────────────┐                ┌──────────────────────────┐
│ Ingester → emits    │───scrape───>   │ Lightweight single-node  │
│   internal metrics  │                │ TSDB (~100 fixed series) │
│ Query Engine → emits│───scrape───>   │                          │
│   internal metrics  │                │ Direct HTTP alerting     │
│ Compactor → emits   │───scrape───>   │ (bypasses alert manager) │
│   internal metrics  │                │                          │
│ WAL → emits health  │───scrape───>   │ Fixed cardinality:       │
│   signals           │                │ no user-defined metrics  │
└─────────────────────┘                └──────────────────────────┘

Key principle: Meta-monitoring system MUST have a different failure domain.
  - Single process (no distributed coordination)
  - Fixed cardinality (no cardinality explosion risk)
  - Local disk storage (no object storage dependency)
  - Direct notification (no alert manager pipeline)
```

---

## Metrics (USE/RED)

### Ingestion Path Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `tsdb_samples_ingested_total` | Counter | Total samples ingested (by tenant, success/failure) | Rate drop > 50% for 5 min |
| `tsdb_samples_rejected_total` | Counter | Samples rejected (by reason: rate_limit, cardinality, validation) | Rate > 1% of ingested for 5 min |
| `tsdb_active_series` | Gauge | Current number of active series (by tenant) | > 80% of tenant limit |
| `tsdb_series_created_total` | Counter | New series creation rate (by tenant) | Rate > 1000/s for 1 min (cardinality alarm) |
| `tsdb_wal_write_duration_seconds` | Histogram | WAL append latency | p99 > 50 ms |
| `tsdb_wal_segment_size_bytes` | Gauge | Current WAL segment size | > 256 MB (close to rotation threshold) |
| `tsdb_head_block_series` | Gauge | Series count in head block | > 80% of memory budget |
| `tsdb_head_block_memory_bytes` | Gauge | Head block memory consumption | > 80% of allocated memory |
| `tsdb_ooo_samples_total` | Counter | Out-of-order samples received | Rate > 5% of total ingestion |
| `tsdb_ooo_rejected_total` | Counter | OOO samples rejected (outside window) | Any sustained rate |
| `tsdb_ingestion_rate_samples_per_second` | Gauge | Current ingestion rate per ingester | > 90% of capacity |

### Storage Path Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `tsdb_blocks_total` | Gauge | Number of blocks (by level, resolution) | Level 0 blocks > 50 (compaction falling behind) |
| `tsdb_compaction_duration_seconds` | Histogram | Time to complete a compaction job | p99 > 30 min |
| `tsdb_compaction_pending_jobs` | Gauge | Compaction jobs waiting in queue | > 100 for 15 min |
| `tsdb_compaction_failures_total` | Counter | Failed compaction attempts | Any failure |
| `tsdb_block_upload_duration_seconds` | Histogram | Time to upload block to object storage | p99 > 5 min |
| `tsdb_disk_usage_bytes` | Gauge | Local disk usage (by component: WAL, blocks, cache) | > 80% of disk capacity |
| `tsdb_object_storage_bytes` | Gauge | Object storage usage (by tenant, resolution tier) | Unexpected growth > 20%/day |
| `tsdb_downsampling_lag_seconds` | Gauge | Time since oldest un-downsampled block | > 6 hours |
| `tsdb_chunk_compression_ratio` | Gauge | Average bytes per sample (by metric type) | > 3.0 (degraded compression) |

### Query Path Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `tsdb_query_duration_seconds` | Histogram | Query execution time (by type: instant/range) | p99 > 5s |
| `tsdb_query_samples_scanned` | Histogram | Samples decompressed per query | p99 > 10M (expensive query) |
| `tsdb_query_series_matched` | Histogram | Series matched by inverted index per query | p99 > 100K |
| `tsdb_query_failures_total` | Counter | Failed queries (by reason: timeout, OOM, error) | Rate > 1% |
| `tsdb_query_cache_hit_ratio` | Gauge | Query result cache hit rate | < 30% (cache ineffective) |
| `tsdb_query_concurrent` | Gauge | Currently executing queries | > 80% of concurrency limit |
| `tsdb_query_queue_depth` | Gauge | Queries waiting for execution slot | > 50 for 3 min |

---

## Logging

### What to Log

| Event | Log Level | Content | Retention |
|---|---|---|---|
| Ingestion batch received | DEBUG | Tenant, sample count, series count, batch size | 24 hours |
| Series creation | INFO | Tenant, metric name, label set, series ID | 7 days |
| Cardinality limit hit | WARN | Tenant, metric name, current count, limit | 30 days |
| WAL segment rotation | INFO | Segment number, size, duration | 7 days |
| Block flush (head → disk) | INFO | Block ID, time range, series count, samples, size | 30 days |
| Compaction completed | INFO | Source blocks, merged block ID, duration, size reduction | 30 days |
| Compaction failed | ERROR | Source blocks, error, stack trace | 90 days |
| Query executed | INFO | Tenant, query text (scrubbed), duration, samples scanned, series matched | 7 days |
| Query timeout/OOM | WARN | Tenant, query text, resource usage at failure | 30 days |
| OOO sample received | DEBUG | Series ID, expected timestamp, actual timestamp, delta | 24 hours |
| Tenant rate limited | WARN | Tenant, limit type, current rate, limit value | 30 days |

### Structured Logging Format

```
{
  "timestamp": "2026-03-10T14:30:00.123Z",
  "level": "WARN",
  "component": "ingester",
  "event": "cardinality_limit_hit",
  "tenant_id": "tenant-abc",
  "metric_name": "http_requests_total",
  "current_series_count": 50000,
  "series_limit": 50000,
  "rejected_label_set": {"method": "GET", "user_id": "u-12345"},
  "trace_id": "abc123def456"
}
```

---

## Distributed Tracing

### Key Spans to Instrument

| Span | Parent | Attributes |
|---|---|---|
| `ingestion.gateway.receive` | Root | tenant_id, batch_size, sample_count |
| `ingestion.validate` | gateway.receive | validation_errors, label_count |
| `ingestion.distribute` | gateway.receive | target_ingester, series_count |
| `ingestion.wal_append` | distribute | segment_number, bytes_written |
| `ingestion.head_append` | distribute | series_id, is_ooo |
| `query.frontend.receive` | Root | tenant_id, query_text, time_range |
| `query.frontend.cache_check` | frontend.receive | cache_hit, cache_key |
| `query.frontend.split` | frontend.receive | sub_query_count |
| `query.engine.resolve_series` | frontend.split | matcher_count, series_matched |
| `query.engine.fetch_chunks` | engine.resolve_series | chunk_count, bytes_read, source (head/disk/object) |
| `query.engine.decompress` | engine.fetch_chunks | samples_decompressed, compression_ratio |
| `query.engine.aggregate` | engine.decompress | aggregation_op, result_series_count |
| `compaction.plan` | Root | block_count, target_level |
| `compaction.merge` | plan | series_merged, samples_merged |
| `compaction.upload` | merge | block_size, upload_duration |

### Trace Sampling Strategy

```
Sampling rules:
  - 100% of failed operations (ingestion errors, query timeouts, compaction failures)
  - 100% of slow operations (write > 50ms, query > 5s, compaction > 30min)
  - 1% of successful ingestion batches (high volume, low diagnostic value)
  - 10% of successful queries (moderate volume, useful for performance analysis)
  - 100% of compaction jobs (low volume, high diagnostic value)
```

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Severity | Runbook |
|---|---|---|---|
| `TSDBIngestionDown` | No samples ingested for any tenant for > 5 min | P1 | Check ingestion gateway health, ingester ring status, WAL disk space |
| `TSDBWALCorruption` | WAL checksum validation failure | P1 | Stop ingester; assess data loss; restore from replica; investigate root cause |
| `TSDBIngesterOOM` | Ingester memory > 95% of limit | P1 | Check cardinality spike; reduce head block window; restart if needed |
| `TSDBCompactionCriticallyBehind` | > 500 pending Level 0 blocks for > 1 hour | P1 | Scale compactor workers; check disk space; investigate slow compaction jobs |
| `TSDBDataLoss` | Acknowledged samples not queryable after 1 hour | P1 | Check WAL integrity; verify block uploads; check replication status |
| `TSDBQueryEngineDown` | All query engine instances failing health checks | P1 | Check memory; restart pods; verify block index cache health |

### Warning Alerts

| Alert | Condition | Severity | Runbook |
|---|---|---|---|
| `TSDBCardinalitySpike` | New series creation rate > 5x normal for tenant for > 10 min | P3 | Identify source metric/label; contact tenant; apply temporary cardinality cap |
| `TSDBCompressionDegraded` | Average bytes/sample > 3.0 (expected ~1.4) for > 1 hour | P3 | Investigate metric types; check for irregular timestamp intervals; review data sources |
| `TSDBQueryLatencyHigh` | Query p99 > 10s for > 15 min | P3 | Check query load; review slow query log; add recording rules for hot queries |
| `TSDBDiskUsageHigh` | Local disk > 80% capacity | P3 | Verify compaction running; check retention enforcement; expand storage |
| `TSDBReplicationLag` | Ingester replication lag > 30s for > 5 min | P3 | Check network between ingesters; verify WAL shipping; investigate slow replicas |
| `TSDBOOORateHigh` | OOO samples > 10% of total ingestion for > 15 min | P4 | Check agent clock sync; review push-based source configurations |
| `TSDBCacheHitRateLow` | Query cache hit rate < 20% for > 30 min | P4 | Review cache size; check for query pattern changes; verify step alignment |

### Runbook Structure

```
Each runbook follows this structure:

1. SYMPTOMS
   What alerts fired? What user impact is observed?

2. DIAGNOSIS
   Step-by-step commands to identify root cause:
   - Check tsdb_active_series for cardinality spike
   - Check tsdb_head_block_memory_bytes for memory pressure
   - Check tsdb_compaction_pending_jobs for compaction backlog
   - Check tsdb_wal_segment_size_bytes for WAL backup

3. IMMEDIATE MITIGATION
   Actions to restore service while investigating root cause:
   - Reduce OOO window to free memory
   - Apply emergency cardinality cap on offending tenant
   - Restart ingester with larger memory limit
   - Manually trigger compaction

4. ROOT CAUSE INVESTIGATION
   How to find and fix the underlying issue

5. PREVENTION
   What monitoring, limits, or architectural changes prevent recurrence
```
