# Observability — Change Data Capture (CDC) System

## Metrics (USE/RED)

### Key Metrics to Track

#### Source Capture Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `cdc.source.lag_ms` | Gauge | Time difference between source commit timestamp and CDC processing timestamp | > 5,000 ms |
| `cdc.source.lag_bytes` | Gauge | Bytes behind in the transaction log (LSN difference) | > 1 GB |
| `cdc.source.events_per_sec` | Rate | Change events captured per second | — (baseline) |
| `cdc.source.wal_disk_usage_bytes` | Gauge | WAL/binlog disk usage on source database | > 80% disk |
| `cdc.source.replication_slot_active` | Gauge | Whether the replication slot is actively being consumed | 0 (inactive) |
| `cdc.source.snapshot_rows_remaining` | Gauge | Rows left to process in current snapshot | — (progress tracking) |
| `cdc.source.snapshot_duration_sec` | Gauge | Elapsed time of current snapshot | > SLA threshold |

#### Connector Health Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `cdc.connector.status` | Gauge | Connector state (0=stopped, 1=running, 2=paused, 3=failed) | != 1 (not running) |
| `cdc.connector.task_count` | Gauge | Number of active tasks per connector | 0 (all tasks dead) |
| `cdc.connector.restarts_total` | Counter | Cumulative connector/task restarts | > 3/hour |
| `cdc.connector.uptime_seconds` | Gauge | Time since last restart | < 60s (frequent restarts) |
| `cdc.connector.errors_total` | Counter | Errors by error type (serialization, connection, schema) | > 10/min |
| `cdc.connector.worker_rebalances` | Counter | Number of task rebalancing events | > 2/hour |

#### Event Pipeline Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `cdc.events.produced_total` | Counter | Total events published to streaming platform by operation type (c/u/d/r) | — |
| `cdc.events.produced_per_sec` | Rate | Event production rate | — (baseline) |
| `cdc.events.size_bytes` | Histogram | Event payload size distribution | p99 > 100 KB |
| `cdc.events.serialization_errors` | Counter | Events that failed schema serialization | > 0 |
| `cdc.events.filtered_total` | Counter | Events dropped by filter rules | — (informational) |
| `cdc.events.dead_letter_total` | Counter | Events routed to dead-letter topic | > 100/hour |
| `cdc.events.duplicate_detected` | Counter | Duplicates detected by idempotent producer | — (informational) |

#### Offset Management Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `cdc.offset.last_committed_lsn` | Gauge | Last durably committed log position | — |
| `cdc.offset.commit_latency_ms` | Histogram | Time to commit offset | p99 > 500 ms |
| `cdc.offset.commit_failures` | Counter | Failed offset commits | > 3 consecutive |
| `cdc.offset.lag_behind_source` | Gauge | Difference between source LSN and committed LSN | Growing trend |

#### Schema Registry Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `cdc.schema.versions_total` | Gauge | Total schema versions registered per subject | — |
| `cdc.schema.compatibility_failures` | Counter | Schema changes rejected by compatibility check | > 0 |
| `cdc.schema.lookup_latency_ms` | Histogram | Schema lookup time (including cache) | p99 > 50 ms |
| `cdc.schema.cache_hit_ratio` | Gauge | Schema cache hit rate | < 90% |
| `cdc.schema.registry_errors` | Counter | Schema registry communication errors | > 5/min |

#### Consumer Lag Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `cdc.consumer.lag_messages` | Gauge | Messages behind latest offset per consumer group | > 100K messages |
| `cdc.consumer.lag_seconds` | Gauge | Estimated time behind latest event | > 60 seconds |
| `cdc.consumer.processing_rate` | Rate | Events processed per second per consumer | — (baseline) |
| `cdc.consumer.errors_total` | Counter | Consumer processing errors | > 1% error rate |

### Dashboard Design

**Dashboard 1: CDC Pipeline Overview**

- End-to-end latency (source commit → consumer delivery) — time series
- Total events per second by operation type (create/update/delete) — stacked area
- Active connectors and their status — status grid
- Consumer group lag across all sinks — bar chart
- Error rate across pipeline stages — time series

**Dashboard 2: Connector Health**

- Per-connector status (running/paused/failed) — status indicators
- Per-connector capture rate (events/sec) — time series
- Per-connector lag (ms and bytes) — time series with threshold lines
- Rebalancing events timeline — event annotations
- Task distribution across workers — table

**Dashboard 3: Source Database Impact**

- Replication slot lag (bytes and time) — dual-axis time series
- WAL disk usage (%) — gauge with threshold
- Replication connection count — time series
- Snapshot progress (rows completed vs. total) — progress bars
- Source database CPU/IO correlation with CDC activity — overlay chart

**Dashboard 4: Schema & Data Quality**

- Schema versions timeline per table — event annotations
- Compatibility check results — pass/fail counters
- Dead-letter topic growth — time series
- Event size distribution — histogram
- Serialization error rate — time series

---

## Logging

### What to Log

| Event | Log Level | Content |
|-------|-----------|---------|
| Connector start/stop | INFO | Connector name, config hash, assigned worker, starting offset |
| Snapshot begin/complete | INFO | Tables, estimated rows, snapshot LSN, duration |
| Schema change detected | INFO | Table name, DDL statement (sanitized), old schema version, new schema version |
| Offset committed | DEBUG | Connector name, LSN, timestamp, events since last commit |
| Event processing error | WARN | Table, event key (redacted), error type, stack trace summary |
| Schema incompatibility | ERROR | Table, old schema, new schema, compatibility violations |
| Connector failure | ERROR | Connector name, error type, last known offset, task state |
| Rebalancing event | INFO | Trigger reason, tasks reassigned, new worker assignments |
| Replication slot issue | WARN | Slot name, status change (active → inactive), lag at time of issue |
| Dead-letter event | WARN | Table, event key (redacted), failure reason, dead-letter topic |

### Log Levels Strategy

| Level | Production Volume | Use Case |
|-------|------------------|----------|
| ERROR | < 50/min | Connector failures, data corruption, replication slot loss |
| WARN | < 500/min | Slow processing, schema issues, replication lag, dead-letter events |
| INFO | < 5,000/min | Lifecycle events, snapshots, schema changes, rebalancing |
| DEBUG | Disabled in prod | Offset commits, per-event processing, WAL entry details |
| TRACE | Never in prod | Raw WAL bytes, serialization details, network packet inspection |

### Structured Logging Format

```
{
  "timestamp": "2026-03-10T14:32:01.234Z",
  "level": "WARN",
  "component": "log_capture_engine",
  "event": "replication_lag_high",
  "connector": "pg-orders-connector",
  "source_db": "orders",
  "current_lsn": "0/1A4B3C80",
  "committed_lsn": "0/1A4B0000",
  "lag_bytes": 244864,
  "lag_ms": 3421,
  "events_buffered": 1250,
  "worker_id": "worker-03",
  "task_id": 0
}
```

---

## Distributed Tracing

### Trace Propagation Strategy

CDC pipelines have a unique tracing challenge: the "request" originates at the source database (a commit) and flows asynchronously through multiple stages before reaching consumers. Traces must be correlated across these asynchronous boundaries.

**Trace context propagation:**

```
Source DB Commit (trace origin)
  └── Log Capture (read WAL entry → create trace)
        └── Event Building (build envelope → add trace headers)
              └── Schema Resolution (lookup/register schema)
              └── Publish to Streaming Platform (event with trace headers)
                    └── Consumer A: Search Indexer (extract trace → create child span)
                    └── Consumer B: Cache Updater (extract trace → create child span)
                    └── Consumer C: Analytics Sink (extract trace → create child span)
```

### Key Spans to Instrument

| Span | Parent | Key Attributes |
|------|--------|---------------|
| `cdc.wal_read` | Root | source_db, lsn, batch_size, read_latency_ms |
| `cdc.event_build` | wal_read | table, operation, event_size_bytes |
| `cdc.schema_resolve` | event_build | subject, schema_id, cache_hit |
| `cdc.serialize` | event_build | format (avro/json), serialized_size_bytes |
| `cdc.publish` | event_build | topic, partition, offset, publish_latency_ms |
| `cdc.offset_commit` | wal_read | connector, lsn, commit_latency_ms |
| `cdc.consume` | publish | consumer_group, processing_latency_ms |
| `cdc.sink_write` | consume | sink_type, target, write_latency_ms |

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Severity | Runbook |
|-------|-----------|----------|---------|
| **Connector down** | connector.status != RUNNING for > 5 min | P1 | Check worker health → Restart task → Check source DB connectivity |
| **WAL disk critical** | source WAL disk > 90% | P1 | Check replication slot lag → Drop stale slots if needed → Investigate connector |
| **Replication slot lost** | Slot status = "lost" or slot deleted | P1 | Re-create slot → Trigger re-snapshot → Verify no data loss |
| **Zero events captured** | events_per_sec = 0 for > 10 min (on active source) | P1 | Check source writes → Check connector → Check replication connection |
| **Offset commit failure** | > 5 consecutive commit failures | P1 | Check streaming platform health → Restart connector → Manual offset reset |

### Warning Alerts

| Alert | Condition | Severity | Runbook |
|-------|-----------|----------|---------|
| **High replication lag** | lag_ms > 30,000 for > 5 min | P2 | Check connector throughput → Check source write rate → Scale resources |
| **Consumer lag growing** | consumer_lag_messages increasing for > 15 min | P2 | Check consumer health → Scale consumers → Check sink connectivity |
| **Schema incompatibility** | compatibility_failures > 0 | P2 | Review DDL change → Update schema compatibility → Coordinate with producers |
| **Dead-letter growth** | dead_letter_total > 1000/hour | P2 | Investigate failure reasons → Fix schema/transform issues → Replay if possible |
| **Frequent restarts** | connector restarts > 3/hour | P3 | Check error logs → Investigate root cause → Check resource limits |
| **Snapshot slow** | snapshot duration > 2x estimated time | P3 | Check source DB load → Increase chunk size → Add snapshot parallelism |
| **Event size spike** | p99 event size > 100 KB | P3 | Identify large-column tables → Add column filtering → Monitor source schema |

### Runbook References

| Runbook | Scenario | Key Steps |
|---------|----------|-----------|
| RB-001 | Connector failure recovery | Check error logs → Identify failure type → Restart task → Verify offset → Monitor lag |
| RB-002 | WAL disk pressure | Identify lagging slots → Assess slot importance → Advance or drop slot → Monitor disk recovery |
| RB-003 | Schema change handling | Review DDL → Check compatibility → Update registry if needed → Monitor affected consumers |
| RB-004 | Consumer lag remediation | Identify slow consumers → Check sink health → Scale consumers → Consider partition increase |
| RB-005 | Full re-snapshot | Stop connector → Reset offset → Configure snapshot mode → Restart → Monitor progress → Verify completeness |
