# 01 — Requirements & Estimations

## Functional Requirements

### Core Features (In Scope)

1. **Span Ingestion** — Accept spans from instrumented services via OpenTelemetry protocol (OTLP) over gRPC and HTTP; support batch and streaming ingestion modes
2. **Context Propagation** — Provide SDKs that automatically inject and extract trace context (W3C Trace Context, B3) across HTTP, gRPC, message queue, and async job boundaries
3. **Sampling** — Support head-based probabilistic sampling, per-service rate-limiting sampling, and tail-based adaptive sampling at the collector tier
4. **Trace Assembly** — Assemble complete traces from out-of-order span arrivals across multiple collectors; handle missing spans and clock skew
5. **Trace Storage** — Store traces with configurable retention across hot, warm, and cold storage tiers; support trace-by-ID lookup and tag-based search
6. **Service Dependency Map** — Generate real-time service-to-service dependency graphs from span data; compute edge metrics (request rate, error rate, latency percentiles)
7. **Trace Query & Visualization** — Provide a query API and UI for searching traces by service, operation, duration, tags, and time range; render trace timelines and Gantt charts
8. **Alerting Integration** — Enable trace-based alerts: trigger when specific service paths exhibit error rates or latency above thresholds

### Explicitly Out of Scope

- **Metrics collection** — Separate system (e.g., Prometheus); traces may link to metrics via exemplars
- **Log aggregation** — Separate pipeline; traces correlate with logs via trace ID injection into log records
- **Application Performance Monitoring (APM)** — Code-level profiling, flame graphs, and CPU/memory analysis are separate concerns
- **Business analytics** — Trace data is for debugging and operational insight, not business intelligence

---

## Non-Functional Requirements

| Requirement | Target | Justification |
|---|---|---|
| **CAP Choice** | AP (Availability + Partition tolerance) | Trace data is diagnostic, not transactional; eventual consistency is acceptable; losing a few spans is tolerable, but the ingestion pipeline must never apply backpressure to production services |
| **Consistency Model** | Eventual | A trace may take 30-60 seconds to become fully assembled and queryable; spans from different services arrive asynchronously |
| **Availability** | 99.9% for ingestion, 99.5% for query | Ingestion must never fail in a way that affects production services (fire-and-forget); query availability can be lower since it's used interactively |
| **Latency — Ingestion** | p99 < 5ms at the SDK level (async, non-blocking) | Tracing overhead must be imperceptible to the instrumented service; SDKs batch and flush asynchronously |
| **Latency — Query** | p50 < 500ms, p99 < 3s for trace-by-ID; p99 < 10s for search | Engineers querying during incident response need fast results but can tolerate seconds for complex searches |
| **Durability** | Best-effort for sampled-out traces; durable (3-replica) for sampled-in traces | Once a trace passes the sampling decision, it must be reliably stored; pre-sampling data loss is acceptable |
| **Data Retention** | Hot: 7 days, Warm: 30 days, Cold: 90 days (configurable) | Balances storage cost against debugging needs; most investigations happen within 24-48 hours |

---

## Capacity Estimations (Back-of-Envelope)

### Assumptions

- **Organization scale**: 2,000 microservices, 50,000 service instances
- **Average request fan-out**: 8 spans per trace (one request touches ~8 services)
- **Inbound request rate**: 500,000 requests/sec (peak: 1.5M req/sec)
- **Head sampling rate**: 10% (retain 1 in 10 traces at the SDK level)
- **Tail sampling uplift**: Additional 5% of traces retained by tail-based sampling (errors, outliers)
- **Average span size**: 500 bytes (compressed), 2 KB (uncompressed)

### Calculations

| Metric | Estimation | Calculation |
|---|---|---|
| **Total spans generated** | 4M spans/sec | 500K req/sec × 8 spans/trace |
| **Total spans (peak)** | 12M spans/sec | 1.5M req/sec × 8 spans/trace |
| **Spans after head sampling** | 400K spans/sec | 4M × 10% sampling rate |
| **Spans after tail sampling** | 600K spans/sec | 400K head-sampled + 200K tail-sampled (errors, outliers) |
| **Ingestion bandwidth** | 300 MB/sec | 600K spans/sec × 500 bytes (compressed) |
| **Peak ingestion bandwidth** | 900 MB/sec | Peak with 3x multiplier |
| **Daily storage (compressed)** | ~26 TB/day | 300 MB/sec × 86,400 sec |
| **Hot tier storage (7 days)** | ~180 TB | 26 TB/day × 7 days |
| **Warm tier storage (30 days)** | ~780 TB | 26 TB/day × 30 days |
| **Cold tier storage (90 days)** | ~2.3 PB | 26 TB/day × 90 days |
| **Trace assembly buffer (memory)** | ~60 GB | 600K spans/sec × 2 KB × 60 sec window ÷ replication |
| **Service map edges** | ~20,000 | 2,000 services × ~10 avg dependencies |

### Query Volume Estimates

| Query Type | Estimated QPS | Notes |
|---|---|---|
| Trace-by-ID lookup | 50-200 QPS | Engineers clicking trace links from logs/alerts |
| Service + operation search | 10-50 QPS | Exploratory debugging queries |
| Service dependency map refresh | 1-5 QPS | Dashboard auto-refresh |
| Latency histogram queries | 5-20 QPS | SLO monitoring dashboards |

---

## SLOs / SLAs

| Metric | Target | Measurement |
|---|---|---|
| **Ingestion Availability** | 99.9% (8.7h downtime/year) | Percentage of time collector fleet accepts spans without error |
| **Ingestion Latency (SDK)** | p99 < 5ms overhead | Time added to instrumented service's request processing |
| **Trace Completeness** | > 95% of sampled traces have all expected spans | Measured by comparing span count against service topology expectations |
| **Trace-by-ID Query Latency** | p50 < 500ms, p99 < 3s | From query submission to full trace returned |
| **Search Query Latency** | p50 < 2s, p99 < 10s | For tag-based and time-range searches |
| **Sampling Accuracy** | 100% of error traces retained | Tail-based sampler must capture all traces with error status |
| **Service Map Freshness** | Updated within 5 minutes | Time from new service dependency appearing in traffic to showing on map |
| **Data Retention Compliance** | 100% of sampled traces retained for configured duration | No premature data loss within retention windows |

---

## Scale Milestones

| Milestone | Spans/sec | Services | Storage | Key Challenge |
|---|---|---|---|---|
| **Startup** | 10K | 50 | 500 GB/day | Single collector, simple storage |
| **Growth** | 100K | 200 | 5 TB/day | Need sampling; single storage node insufficient |
| **Scale** | 1M | 1,000 | 50 TB/day | Distributed collector fleet; tiered storage; tail-based sampling |
| **Hyperscale** | 10M+ | 5,000+ | 500 TB/day | Streaming trace assembly; columnar storage; aggressive sampling with ML-driven retention |
