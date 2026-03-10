# Observability — Data Lakehouse Architecture

## Metrics

### Storage & Metadata Metrics (USE Framework)

| Metric | Type | Description | Alert Threshold |
|:---|:---|:---|:---|
| `table.total_files` | Gauge | Total data files in current snapshot | > 10 M (metadata stress) |
| `table.total_size_bytes` | Gauge | Total data size on object storage | Informational |
| `partition.file_count` | Gauge | Files per partition | > 5 000 (small-file warning) |
| `partition.small_file_count` | Gauge | Files < 10 MB per partition | > 1 000 (compaction needed) |
| `partition.avg_file_size_mb` | Gauge | Average file size per partition | < 32 MB (trigger compaction) |
| `snapshot.count` | Gauge | Total snapshots retained | > 50 000 (expiration needed) |
| `snapshot.age_hours` | Gauge | Age of oldest retained snapshot | > retention_policy * 1.5 |
| `manifest.count` | Gauge | Total manifest files | > 100 K (manifest merging needed) |
| `manifest.total_size_mb` | Gauge | Total size of all manifest files | > 10 GB (planning overhead) |

### Query Engine Metrics (RED Framework)

| Metric | Type | Description | Alert Threshold |
|:---|:---|:---|:---|
| `query.rate` | Counter | Queries per second | Informational |
| `query.latency_p50_ms` | Histogram | Median query latency | > 3 000 ms |
| `query.latency_p99_ms` | Histogram | 99th percentile query latency | > 15 000 ms |
| `query.error_rate` | Counter | Failed queries per second | > 1% of total |
| `query.files_scanned` | Histogram | Data files read per query | Informational (track trends) |
| `query.files_skipped_ratio` | Gauge | Fraction of files skipped via data skipping | < 0.5 (poor clustering) |
| `query.bytes_scanned` | Counter | Total bytes read from storage | Cost tracking |
| `query.planning_time_ms` | Histogram | Time spent in metadata loading + pruning | > 5 000 ms |
| `query.execution_time_ms` | Histogram | Time spent reading and processing data | Informational |

### Ingestion Metrics

| Metric | Type | Description | Alert Threshold |
|:---|:---|:---|:---|
| `ingest.commit_rate` | Counter | Commits per minute | Informational |
| `ingest.commit_latency_ms` | Histogram | Time from data write to successful CAS | > 5 000 ms |
| `ingest.conflict_rate` | Counter | CAS failures per minute | > 10% of commit attempts |
| `ingest.rows_per_second` | Counter | Ingestion throughput | < target throughput |
| `ingest.lag_seconds` | Gauge | Delay between event timestamp and query visibility | > 120 s |
| `ingest.orphan_files` | Gauge | Data files written but not committed | > 1 000 (cleanup needed) |

### Compaction Metrics

| Metric | Type | Description | Alert Threshold |
|:---|:---|:---|:---|
| `compaction.last_run_age_hours` | Gauge | Time since last compaction per partition | > 4 hours (active partitions) |
| `compaction.files_rewritten` | Counter | Files merged per compaction cycle | Informational |
| `compaction.bytes_rewritten` | Counter | Total bytes processed | Cost tracking |
| `compaction.duration_minutes` | Histogram | Wall-clock time per compaction job | > 60 min |
| `compaction.backlog_files` | Gauge | Small files awaiting compaction | > 10 000 |
| `compaction.conflicts` | Counter | Compaction commits that failed due to concurrent writes | > 5 per hour |

### Catalog Metrics

| Metric | Type | Description | Alert Threshold |
|:---|:---|:---|:---|
| `catalog.request_rate` | Counter | API requests per second | Informational |
| `catalog.commit_latency_ms` | Histogram | CAS operation latency | > 1 000 ms |
| `catalog.error_rate` | Counter | Failed API requests per second | > 0.1% |
| `catalog.replication_lag_ms` | Gauge | Lag between primary and replica catalog | > 500 ms |

## Dashboard Design

### Dashboard 1: Table Health Overview

**Purpose**: Single-pane view of all tables' health status.

| Panel | Visualization | Data Source |
|:---|:---|:---|
| Table inventory | Table with file count, size, last commit | `table.total_files`, `table.total_size_bytes` |
| Small-file heatmap | Heatmap by partition × time | `partition.small_file_count` |
| Snapshot growth | Time-series line chart | `snapshot.count` over time |
| Compaction backlog | Stacked bar by partition | `compaction.backlog_files` |
| Data freshness | Gauge per table | `ingest.lag_seconds` |

### Dashboard 2: Query Performance

**Purpose**: Real-time query performance and data-skipping effectiveness.

| Panel | Visualization | Data Source |
|:---|:---|:---|
| Query latency distribution | Histogram (p50, p90, p99) | `query.latency_p50_ms`, `query.latency_p99_ms` |
| Files skipped ratio | Time-series gauge | `query.files_skipped_ratio` |
| Planning vs. execution time | Stacked area chart | `query.planning_time_ms`, `query.execution_time_ms` |
| Error rate | Time-series with threshold line | `query.error_rate` |
| Top slow queries | Table sorted by latency | Query log |

### Dashboard 3: Ingestion & Commit Health

**Purpose**: Monitor ingestion throughput and commit contention.

| Panel | Visualization | Data Source |
|:---|:---|:---|
| Commit rate | Time-series line | `ingest.commit_rate` |
| Commit latency | Histogram | `ingest.commit_latency_ms` |
| Conflict rate | Time-series with threshold | `ingest.conflict_rate` |
| Ingestion lag | Gauge per source | `ingest.lag_seconds` |
| Orphan file count | Time-series | `ingest.orphan_files` |

### Dashboard 4: Storage & Cost

**Purpose**: Track storage growth and cost attribution.

| Panel | Visualization | Data Source |
|:---|:---|:---|
| Total storage by table | Stacked area chart | `table.total_size_bytes` |
| Bytes scanned per day | Bar chart | `query.bytes_scanned` aggregated daily |
| Compaction I/O cost | Bar chart | `compaction.bytes_rewritten` |
| Retained snapshot storage | Time-series | Snapshot count × avg snapshot delta size |
| Cost per query (estimated) | Table | Bytes scanned × per-GB cost |

## Logging Strategy

### What to Log

| Event | Log Level | Fields |
|:---|:---|:---|
| Query submitted | INFO | query_id, user, table, SQL hash, timestamp |
| Query completed | INFO | query_id, duration_ms, files_scanned, files_skipped, rows_returned |
| Query failed | ERROR | query_id, error_type, error_message, stack trace |
| Commit attempted | INFO | table, snapshot_id, operation, file_count, user |
| Commit succeeded | INFO | table, new_snapshot_id, files_added, files_deleted |
| Commit conflict | WARN | table, base_snapshot, conflicting_snapshot, retry_count |
| Compaction started | INFO | table, partition, file_count, estimated_size |
| Compaction completed | INFO | table, partition, files_in, files_out, duration |
| Schema evolved | INFO | table, change_type, columns_affected, user |
| Vacuum executed | INFO | table, files_deleted, bytes_freed, snapshots_expired |
| Access denied | WARN | user, table, operation, reason |

### Log Level Volume Targets

| Level | Target Rate | Rationale |
|:---|:---|:---|
| ERROR | < 50 / min | Actionable failures only |
| WARN | < 500 / min | Conflicts, access denials, degraded conditions |
| INFO | < 10 000 / min | Operational events (commits, queries, compaction) |
| DEBUG | Disabled in production | Enable per-table for troubleshooting |

### Structured Log Format

```json
{
  "timestamp": "2025-11-15T08:23:41.127Z",
  "level": "INFO",
  "service": "lakehouse-catalog",
  "event": "commit_succeeded",
  "table": "analytics.events",
  "snapshot_id": 4312,
  "files_added": 48,
  "files_deleted": 0,
  "rows_added": 2450000,
  "duration_ms": 1243,
  "user": "ingestion-service-prod",
  "trace_id": "abc123def456",
  "span_id": "789ghi012"
}
```

## Distributed Tracing

### Trace Propagation

A single query generates a trace that spans multiple systems:

```
Query Trace (root span)
├── catalog.resolve_table (50 ms)
│     └── catalog.load_snapshot (20 ms)
├── planner.load_manifests (200 ms)
│     ├── planner.partition_prune (10 ms)
│     └── planner.file_prune (50 ms)
├── executor.scan_files (parallel spans)
│     ├── executor.read_file[0] (150 ms)
│     ├── executor.read_file[1] (120 ms)
│     ├── executor.read_file[2] (180 ms)
│     └── executor.merge_deletes (30 ms)  // MoR only
└── executor.assemble_result (20 ms)
```

### Key Spans to Instrument

| Span | Parent | Key Attributes |
|:---|:---|:---|
| `catalog.resolve_table` | root | table_name, snapshot_id, cache_hit |
| `planner.load_manifests` | root | manifest_count, total_size_bytes |
| `planner.partition_prune` | load_manifests | manifests_before, manifests_after |
| `planner.file_prune` | load_manifests | files_before, files_after, stats_used |
| `executor.read_file` | root | file_path, file_size, format, rows_read |
| `executor.merge_deletes` | root | delete_file_count, rows_deleted |
| `executor.assemble_result` | root | total_rows, total_bytes |
| `commit.compare_and_swap` | root (write path) | table, base_snapshot, success, retry_count |

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Runbook |
|:---|:---|:---|
| Catalog unavailable | Health check fails for > 60 s | Initiate catalog failover; check replication status |
| Commit failure spike | Conflict rate > 50% for 5 min | Investigate concurrent writers; increase commit batching |
| Data freshness breach | Ingestion lag > 10 min | Check ingestion pipeline; verify source availability |
| Object storage errors | Error rate > 1% for 5 min | Check storage health; switch to replica region |
| Snapshot count critical | > 100 000 snapshots without expiration | Run emergency vacuum; enable auto-expiration |

### Warning Alerts

| Alert | Condition | Action |
|:---|:---|:---|
| Compaction backlog growing | Small files > 10 000 in any partition | Trigger manual compaction; review scheduling |
| Query p99 degraded | p99 > 15 s for 15 min | Check file sizes; review data-skipping effectiveness |
| Manifest size large | Total manifests > 10 GB | Schedule manifest merging |
| Orphan files accumulating | > 5 000 uncommitted files | Investigate failed writers; run cleanup |
| Catalog replication lag | > 5 s for 10 min | Check network; verify replica health |
| Disk cache hit ratio low | < 80% for 30 min | Increase cache size; review access patterns |
| Schema evolution frequency | > 10 changes per day on same table | Review pipeline; may indicate upstream instability |

### Runbooks

| Runbook | Trigger | Steps |
|:---|:---|:---|
| Catalog failover | Catalog primary unreachable | 1. Verify primary down. 2. Promote replica. 3. Update DNS. 4. Verify commits succeed. 5. Investigate root cause. |
| Emergency compaction | Small-file count critical | 1. Identify top-10 affected partitions. 2. Pause non-critical ingestion. 3. Run compaction with elevated resources. 4. Verify file counts. 5. Resume ingestion. |
| Snapshot expiration | Snapshot count > threshold | 1. Verify retention policy. 2. Run expire_snapshots with safe retention. 3. Run remove_orphan_files. 4. Verify metadata size reduction. |
| Conflict storm mitigation | Commit conflict rate > 50% | 1. Identify contending writers. 2. Stagger commit intervals. 3. Partition writes by file group. 4. Increase commit batch size. 5. Monitor conflict rate. |
| Data corruption recovery | Checksum mismatch on read | 1. Identify affected files via manifest. 2. Roll back to last known-good snapshot. 3. Re-ingest from source for affected time range. 4. Validate checksums. 5. Post-mortem. |
