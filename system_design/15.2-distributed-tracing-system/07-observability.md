# 07 — Observability (Meta-Observability)

> The unique challenge of a tracing system's observability is that **the system must monitor itself without creating circular dependencies**. If the tracing system uses distributed tracing to debug itself, a failure in the tracing system would simultaneously prevent diagnosis of that very failure. This section addresses the meta-observability strategy.

---

## Metrics (USE/RED)

### Ingestion Pipeline Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `collector.spans.received` | Counter | Total spans received per second | N/A (informational) |
| `collector.spans.accepted` | Counter | Spans accepted after validation | Drop rate > 5% triggers investigation |
| `collector.spans.rejected` | Counter | Spans rejected (invalid, rate-limited) | Rejection rate > 10% pages on-call |
| `collector.batch.size` | Histogram | Number of spans per ingestion batch | Avg < 10 suggests SDK batching issue |
| `collector.queue.publish.latency` | Histogram | Time to publish span batch to message queue | p99 > 500ms triggers scale-up |
| `collector.queue.publish.failures` | Counter | Failed queue publish attempts | > 0 sustained for 1 min pages on-call |

### Tail Sampler Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `sampler.buffer.traces` | Gauge | Number of traces currently buffered | > 80% capacity triggers scale-up |
| `sampler.buffer.memory_bytes` | Gauge | Memory used by trace buffer | > 75% of allocated memory |
| `sampler.trace.decision.keep` | Counter | Traces decided to keep | Monitor keep/drop ratio |
| `sampler.trace.decision.drop` | Counter | Traces decided to drop | Monitor keep/drop ratio |
| `sampler.trace.wait_time` | Histogram | Time between first span arrival and decision | p99 > 45s suggests traces not completing |
| `sampler.trace.span_count` | Histogram | Spans per completed trace | Sudden changes indicate instrumentation changes |
| `sampler.late_spans` | Counter | Spans arriving after trace decision | Sustained increase suggests wait window too short |

### Storage Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `storage.write.latency` | Histogram | Time to write a trace batch to hot store | p99 > 1s triggers investigation |
| `storage.write.failures` | Counter | Failed write operations | > 0 sustained for 5 min pages on-call |
| `storage.read.latency` | Histogram | Time to read a trace from storage | p99 > 3s for hot tier pages on-call |
| `storage.hot.disk_usage` | Gauge | Hot store disk utilization percentage | > 80% triggers capacity planning |
| `storage.compaction.lag` | Gauge | Age of oldest uncompacted data | > 4 hours triggers scale-up of compactors |
| `storage.compaction.throughput` | Counter | Traces compacted per second | Dropping below ingestion rate is concerning |

### Query Service Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `query.requests` | Counter | Total query requests per second by type | N/A (informational) |
| `query.latency` | Histogram | Query response time by query type | p99 > 5s for trace-by-ID pages on-call |
| `query.errors` | Counter | Query errors by error type | Error rate > 1% triggers investigation |
| `query.cache.hit_rate` | Gauge | Cache hit ratio by cache layer | L2 hit rate < 40% suggests cache sizing issue |
| `query.results.size` | Histogram | Number of traces returned per search | Avg > 100 suggests queries too broad |

### Service Map Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `service_map.edges` | Gauge | Number of active service-to-service edges | Sudden large increase suggests new service deployment or misconfiguration |
| `service_map.update.latency` | Histogram | Time to update service map from span batch | p99 > 1s |
| `service_map.staleness` | Gauge | Time since last service map update | > 5 minutes triggers alert |

---

## Logging

### What to Log

| Component | Log Events | Rationale |
|---|---|---|
| **Collector** | Span validation failures, rate limit triggers, queue publish failures, batch processing errors | Debug ingestion issues without relying on the tracing system itself |
| **Tail Sampler** | Buffer evictions, sampling rule changes, decision overrides, memory pressure events | Understand why specific traces were kept or dropped |
| **Storage Writer** | Write failures, compaction start/complete, retention deletions, schema migrations | Track data lifecycle and storage health |
| **Query Service** | Slow queries (> 5s), cross-tier queries, cache misses, authorization denials | Debug query performance and access control issues |
| **Compactor** | Block creation, block deletion, bloom filter generation, size statistics | Track compaction efficiency and storage cost |

### Log Levels Strategy

| Level | Usage | Examples |
|---|---|---|
| **ERROR** | Data loss risk, service degradation | Queue publish failure, storage write failure, PII detected post-scrubbing |
| **WARN** | Anomalous but handled conditions | Buffer memory > 70%, high rejection rate, compaction lag > 1 hour |
| **INFO** | Significant state transitions | Sampling rule change, compaction cycle complete, new service detected in map |
| **DEBUG** | Per-request detail (disabled in production) | Individual span processing, sampling decisions, cache hit/miss per query |

### Structured Logging Format

```
{
    "timestamp": "2026-03-10T14:23:45.678Z",
    "level": "WARN",
    "component": "tail-sampler",
    "instance_id": "sampler-7",
    "message": "Buffer memory pressure detected",
    "attributes": {
        "buffer_memory_bytes": 5368709120,
        "buffer_capacity_bytes": 7516192768,
        "utilization_pct": 71.4,
        "active_traces": 285000,
        "action": "reducing_wait_window",
        "new_wait_window_sec": 20
    }
}
```

**Critical rule**: The tracing system's own logs must **never contain trace IDs from user traces** in a way that creates a circular debugging dependency. Instead, the system uses its own internal request IDs for correlating its own operations.

---

## Meta-Tracing: Tracing the Tracing System

### The Circular Dependency Problem

If the tracing system instruments itself with its own tracing, a failure in the tracing pipeline would also prevent diagnosing that failure. The solution is a **separate, lightweight internal tracing path**:

```
Production tracing pipeline:
    Service SDKs → Agents → Collectors → Queue → Samplers → Storage

Internal tracing pipeline (separate):
    Tracing system components → Internal metrics + logs
    (NO dependency on the main tracing pipeline)
```

### Key Internal Spans to Instrument

Instead of full distributed tracing, the tracing system uses **metrics with exemplars** for self-monitoring:

| Component | Key Measurements | Method |
|---|---|---|
| Collector span processing | Processing time per batch, validation failures | Prometheus histogram with batch_id exemplar |
| Queue publish | Publish latency, message size | Metrics with partition/offset exemplar |
| Tail sampler decision | Decision latency, buffer scan time | Metrics with trace_id exemplar |
| Storage write | Write latency, batch size, error rate | Metrics with block_id exemplar |
| Query execution | Query parse time, storage read time, assembly time | Metrics with query_id exemplar |
| Compaction | Block read time, Parquet write time, bloom filter generation | Metrics with compaction_job_id exemplar |

### Health Check Hierarchy

```
FUNCTION deepHealthCheck():
    results = {}

    # Level 1: Process health
    results["process"] = checkProcessHealth()   # memory, CPU, GC pressure

    # Level 2: Dependency connectivity
    results["queue"] = checkQueueConnectivity()     # can publish/consume
    results["hot_store"] = checkHotStoreConnectivity()  # can read/write
    results["object_store"] = checkObjectStoreConnectivity()  # can list/get

    # Level 3: Pipeline flow
    results["ingestion_flow"] = checkIngestionFlow()  # send canary span, verify arrival
    results["query_flow"] = checkQueryFlow()           # query known trace, verify result

    # Level 4: Data freshness
    results["latest_trace_age"] = getLatestTraceAge()  # should be < 2 minutes
    results["service_map_age"] = getServiceMapAge()     # should be < 5 minutes

    overallStatus = ALL(results.values() are HEALTHY) ? HEALTHY : DEGRADED
    RETURN HealthReport(status = overallStatus, checks = results)
```

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Impact | Runbook Action |
|---|---|---|---|
| **Ingestion pipeline down** | `collector.spans.received` = 0 for 2 minutes | No trace data being collected; debugging capability lost | Check collector health, queue connectivity, agent connectivity; escalate if not resolvable in 10 min |
| **Storage write failures** | `storage.write.failures` > 0 for 5 minutes | Sampled traces being lost | Check hot store health, disk space, replication status; failover to secondary if needed |
| **Tail sampler buffer full** | `sampler.buffer.memory_bytes` > 95% capacity | Traces being dropped without sampling evaluation | Scale up sampler instances; reduce wait window; enable head-only sampling fallback |
| **Compaction lag critical** | `storage.compaction.lag` > 8 hours | Hot store filling up; risk of disk exhaustion | Scale up compaction workers; check for stuck compaction jobs; verify object storage accessibility |
| **PII detected post-scrubbing** | PII scanner detects patterns in stored spans | Compliance violation; potential data breach | Identify the source service; quarantine affected traces; notify security team; patch scrubbing rules |

### Warning Alerts

| Alert | Condition | Impact | Action |
|---|---|---|---|
| **High span rejection rate** | `collector.spans.rejected` / `collector.spans.received` > 5% for 15 min | Trace completeness degraded | Investigate source: malformed spans, rate limiting, or validation failures |
| **Query latency degradation** | `query.latency` p99 > 5s for 15 min | Engineers experience slow debugging | Check storage read latency, cache hit rates, query patterns |
| **Sampling imbalance** | One service produces > 30% of all spans | Storage budget dominated by one service | Review service's sampling rate; apply per-service rate limiting |
| **Service map gap** | Known service missing from dependency graph for > 1 hour | Missing visibility into service health | Check service's instrumentation; verify agent connectivity |
| **Cache hit rate drop** | L2 cache hit rate < 30% for 30 min | Increased storage read load | Check cache eviction rate; consider cache size increase |

### Alert Suppression During Maintenance

```
FUNCTION shouldSuppressAlert(alert):
    # Suppress during planned maintenance windows
    IF maintenanceWindow.isActive():
        IF alert.component IN maintenanceWindow.affectedComponents:
            RETURN TRUE

    # Suppress cascading alerts
    IF alert.severity == WARNING:
        IF anyActiveAlert(severity = CRITICAL, component = alert.component):
            # A critical alert already exists for this component;
            # suppress warning-level alerts to reduce noise
            RETURN TRUE

    RETURN FALSE
```

---

## Dashboard Design

### Overview Dashboard

| Panel | Visualization | Data Source |
|---|---|---|
| Ingestion rate | Time-series line chart (spans/sec) | `collector.spans.received` |
| Sampling efficiency | Stacked area (kept vs. dropped) | `sampler.trace.decision.*` |
| Storage utilization | Gauge (hot tier %) + trend line | `storage.hot.disk_usage` |
| Query performance | Heatmap (latency by query type) | `query.latency` |
| Service map health | Node graph (services + edges) | `service_map.edges` |
| Error traces | Counter + trend | `sampler.trace.decision.keep` where reason=error |

### Operational Dashboard

| Panel | Visualization | Data Source |
|---|---|---|
| Pipeline lag | Time-series (seconds of lag at each stage) | Consumer lag metrics |
| Buffer pressure | Multi-line (memory % per sampler instance) | `sampler.buffer.memory_bytes` |
| Compaction progress | Progress bar + queue depth | `storage.compaction.*` |
| Collector fleet health | Status grid (green/yellow/red per instance) | Health check endpoints |
| Top services by span volume | Horizontal bar chart | `collector.spans.received` by service |

### Canary Monitoring

To detect silent failures (the tracing system appears healthy but silently drops data), deploy a **canary service** that:

1. Sends a known trace (with a predictable trace ID) every 60 seconds
2. After 90 seconds, queries for that trace via the query API
3. Verifies the trace is complete and matches expectations
4. Alerts if the canary trace is missing or incomplete

This end-to-end canary catches failures that component-level metrics might miss: a scenario where collectors accept spans, the queue delivers them, but the storage writer silently fails.
