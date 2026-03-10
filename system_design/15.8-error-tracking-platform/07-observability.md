# Observability — Error Tracking Platform

## Metrics (USE/RED)

### Ingestion Pipeline Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `relay.events.accepted` | Counter | Events accepted by relay per second | — |
| `relay.events.rejected` | Counter | Events rejected (rate limit, quota, invalid) | >10% of total |
| `relay.events.spike_throttled` | Counter | Events dropped by spike protection | Informational |
| `relay.latency.p99` | Histogram | Relay response latency | >500ms |
| `relay.dsn.invalid` | Counter | Invalid DSN authentication attempts | >100/min (abuse signal) |
| `bus.consumer.lag` | Gauge | Message bus consumer lag (seconds) | >30s |
| `bus.consumer.lag.events` | Gauge | Consumer lag in event count | >100K |
| `processing.throughput` | Counter | Events processed per second | — |
| `processing.errors` | Counter | Processing failures (crash, timeout) | >1% of throughput |
| `processing.latency.p99` | Histogram | End-to-end processing latency | >15s |

### Fingerprinting & Grouping Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `fingerprint.new_issues.rate` | Counter | New issues created per minute | >10x baseline (grouping degradation signal) |
| `fingerprint.cache.hit_rate` | Gauge | Fingerprint cache hit ratio | <80% |
| `fingerprint.strategy` | Counter | Events grouped by each strategy (stack_trace, exception, message, custom) | Informational |
| `issues.merge.rate` | Counter | User-initiated issue merges per day | Trend monitoring |
| `issues.split.rate` | Counter | User-initiated issue splits per day | Trend monitoring |
| `fingerprint.collision.suspected` | Counter | Issues with high event diversity (potential false merges) | >0 for new algorithm versions |

### Symbolication Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `symbolication.success_rate` | Gauge | Events successfully symbolicated / events needing symbolication | <95% |
| `symbolication.latency.p99` | Histogram | Source map lookup + parsing + resolution time | >5s |
| `symbolication.cache.hit_rate` | Gauge | Source map cache hit ratio | <70% |
| `symbolication.missing_sourcemap` | Counter | Events where source map was not found for the release | >5% per project |
| `symbolication.queue_depth` | Gauge | Retro-symbolication queue backlog | >10K |
| `sourcemap.parse_time.p99` | Histogram | Time to parse a single source map | >3s |
| `sourcemap.memory_usage` | Gauge | Memory consumed by cached parsed source maps | >80% of allocated |

### Alerting Pipeline Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `alerts.evaluation.latency.p99` | Histogram | Time from event to alert rule evaluation | >30s |
| `alerts.delivery.latency.p99` | Histogram | Time from rule trigger to notification delivery | >60s |
| `alerts.delivery.failure_rate` | Gauge | Failed notification deliveries / total | >5% |
| `alerts.queue_depth` | Gauge | Pending alert evaluations | >1K |
| `alerts.suppressed` | Counter | Alerts suppressed by frequency cap | Informational |

### Quota & Billing Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `quota.usage.percentage` | Gauge | Per-org quota consumption | >80% (warning), >95% (critical) |
| `quota.rejected.events` | Counter | Events rejected due to quota exhaustion | >0 (notify customer) |
| `spike_protection.active_projects` | Gauge | Projects currently under spike protection | Informational |
| `spike_protection.events_dropped` | Counter | Events dropped by spike protection | Informational |

---

## Dashboard Design

### Operator Dashboard: Platform Health

**Panels (4x3 grid):**

| Row 1 | | |
|--------|--------|--------|
| Event ingestion rate (events/sec, 5-min rolling) | Consumer lag (seconds, per partition) | Processing latency distribution (p50/p95/p99) |

| Row 2 | | |
|--------|--------|--------|
| Symbolication success rate (%, per platform) | Fingerprint cache hit rate (%) | New issues rate (per hour, with baseline overlay) |

| Row 3 | | |
|--------|--------|--------|
| Alert delivery latency (seconds, p99) | Active spike protections (count + project list) | Quota utilization heatmap (top 20 orgs) |

| Row 4 | | |
|--------|--------|--------|
| Error rate by processing stage (normalize, symbolicate, fingerprint) | Storage growth rate (GB/day) | Top 10 projects by event volume |

### Customer Dashboard: Project Health

**Panels:**
- Error rate over time (events/hour with release markers)
- Top 5 issues by frequency (with sparklines)
- Crash-free session rate (% with trend arrow)
- New issues vs resolved issues (daily stacked bar)
- Release comparison (error rates side-by-side)

---

## Logging

### What to Log

| Component | Log Events | Level |
|-----------|-----------|-------|
| Relay | DSN validation failure; rate limit activation; spike protection trigger; malformed envelope rejection | WARN |
| Processing | Symbolication failure (with release + filename); fingerprint strategy fallback; processing timeout | WARN |
| Alert engine | Rule evaluation; notification send; delivery failure; suppression | INFO / ERROR |
| Quota | Quota threshold crossed (80%, 95%, 100%); spike baseline recomputed | INFO / WARN |
| API | Authentication failure; authorization denial; rate limit on management API | WARN |

### Log Levels Strategy

| Level | Usage | Example |
|-------|-------|---------|
| ERROR | Unrecoverable failures requiring operator attention | "Failed to write event batch to columnar store: connection refused" |
| WARN | Recoverable issues or degraded behavior | "Source map not found for release frontend@2.4.1; storing raw frames" |
| INFO | Significant state changes | "Spike protection activated for project abc123; sample rate: 10%" |
| DEBUG | Detailed processing steps (disabled in production by default) | "Fingerprint computed via stack_trace strategy; hash=a1b2c3..." |

### Structured Logging Format

```
{
  "timestamp": "2026-03-10T09:15:23.456Z",
  "level": "WARN",
  "service": "processing-worker",
  "instance": "worker-07",
  "trace_id": "abc123def456",
  "event_id": "evt-789",
  "project_id": "proj-456",
  "org_id": "org-123",
  "message": "Source map not found for symbolication",
  "context": {
    "release": "frontend@2.4.1",
    "filename": "app.min.js",
    "fallback": "storing_raw_frames"
  }
}
```

---

## Distributed Tracing

### Trace Propagation Strategy

Every error event carries a `trace_id` through the entire processing pipeline:

1. **Relay** generates `trace_id` on event receipt (or uses the SDK-provided one)
2. **Message bus** propagates `trace_id` in message headers
3. **Processing workers** continue the trace through normalize → symbolicate → fingerprint → enrich stages
4. **Storage writes** carry the trace for write latency attribution
5. **Alert evaluation** continues the trace to notification delivery

### Key Spans to Instrument

| Span | Parent | What It Measures |
|------|--------|-----------------|
| `relay.receive` | Root | Envelope parsing + DSN validation + quota check |
| `relay.publish` | `relay.receive` | Publishing to message bus |
| `process.normalize` | Root (consumer) | Schema validation + field extraction |
| `process.symbolicate` | `process.normalize` | Source map lookup + parsing + resolution |
| `process.symbolicate.cache_lookup` | `process.symbolicate` | Cache hit/miss for parsed source map |
| `process.symbolicate.parse` | `process.symbolicate` | VLQ decoding (only on cache miss) |
| `process.fingerprint` | `process.symbolicate` | Frame normalization + hash computation |
| `process.fingerprint.db_lookup` | `process.fingerprint` | Issue existence check |
| `process.enrich` | `process.fingerprint` | Geo-IP + device classification |
| `store.columnar_write` | `process.enrich` | Batch insert to columnar store |
| `store.issue_upsert` | `process.fingerprint` | Issue create/update in relational DB |
| `alert.evaluate` | `store.issue_upsert` | Alert rule evaluation |
| `alert.deliver` | `alert.evaluate` | Notification dispatch (Slack, email, etc.) |

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Runbook |
|-------|-----------|---------|
| **Ingestion pipeline down** | Event acceptance rate drops to 0 for >2 minutes | Check relay health → message bus → network; failover if needed |
| **Consumer lag critical** | Bus consumer lag >5 minutes | Scale processing workers; check for stuck consumers; verify storage health |
| **Relational DB failover** | Primary DB unreachable; failover initiated | Verify replica promotion; check replication lag; update connection strings if needed |
| **Columnar store write failures** | Write error rate >5% for >2 minutes | Check disk space, cluster health, replication status |
| **Alert delivery pipeline down** | No alerts delivered for >10 minutes despite new events | Check alert engine health; verify notification channel connectivity |

### Warning Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| **Symbolication success rate degraded** | <90% for >30 minutes | Check symbolicator health; look for missing source maps for recent releases |
| **New issue rate anomaly** | >5x baseline for >15 minutes | Possible grouping degradation or legitimate spike; investigate fingerprint strategy distribution |
| **Consumer lag elevated** | Bus consumer lag >1 minute | Monitor trend; pre-scale workers if increasing |
| **Cache hit rate low** | Fingerprint cache hit rate <70% for >1 hour | Check cache cluster health; possible eviction pressure from new release with many new fingerprints |
| **Quota approaching limit** | Organization at 90% quota | Notify customer; prepare for quota enforcement |
| **Storage growth anomaly** | Daily growth >2x 7-day average | Investigate which projects are driving growth; check for event flooding |

### Runbook References

| Runbook | Trigger | Key Steps |
|---------|---------|-----------|
| `runbook-ingestion-outage` | Ingestion pipeline down | 1. Check relay logs 2. Verify message bus health 3. Check DNS/LB 4. Failover if regional |
| `runbook-consumer-lag` | Consumer lag critical | 1. Check worker errors 2. Scale workers 3. Check storage write latency 4. Skip/sample if degraded |
| `runbook-grouping-anomaly` | New issue rate spike | 1. Check recent algorithm changes 2. Verify symbolication 3. Check for new release with changed code structure |
| `runbook-quota-management` | Customer quota exhausted | 1. Verify spike protection is active 2. Contact customer 3. Offer temporary quota increase if legitimate |
