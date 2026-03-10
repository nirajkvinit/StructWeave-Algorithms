# 12.16 Product Analytics Platform — Observability

## Observability Philosophy

A product analytics platform is, at its core, an observability tool for other products—yet it is often the last system to be well-instrumented itself. The platform must monitor two fundamentally different operational concerns: **ingestion health** (are events arriving and being stored correctly?) and **query health** (are analytical results accurate and fast?). A third dimension unique to analytics platforms is **data freshness health**: the lag between an event occurring in the real world and that event being reflected in query results. Each concern has distinct failure modes, metrics, and alerting strategies.

---

## Ingestion Metrics

### Core Ingestion KPIs

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `ingest.events.received_total` | Counter | Total events received by collectors | — (baseline) |
| `ingest.events.accepted_total` | Counter | Events accepted after validation | — |
| `ingest.events.rejected_total` | Counter | Events rejected (invalid envelope) | > 0.1% of received |
| `ingest.events.deduplicated_total` | Counter | Events dropped as duplicates | > 5% of received (SDK retry storm) |
| `ingest.collector.latency_p99_ms` | Histogram | End-to-end collector latency (receipt to queue write) | > 100ms |
| `ingest.queue.lag_seconds` | Gauge | Consumer lag for each queue partition | > 60 seconds |
| `ingest.stream_processor.throughput_eps` | Gauge | Events/second processed per processor instance | < 1000 eps (under-provisioned) |
| `ingest.hot_store.write_latency_p99_ms` | Histogram | Hot store write latency | > 50ms |
| `ingest.bloom_filter.false_positive_rate` | Gauge | Estimated bloom filter false positive rate | > 0.05% |
| `ingest.governance.violation_rate` | Gauge | % of events with schema violations per project | > 10% (data quality issue) |
| `ingest.pii.detection_rate` | Gauge | % of events triggering PII detection | > 1% (customer education needed) |

### Event Volume Anomaly Detection

A baseline model is maintained for expected event volume per project per hour-of-day, day-of-week:

```
Anomaly detection model:
  For each (project_id, event_name, hour_of_day, day_of_week):
    expected_volume = EWMA(historical_volumes, alpha=0.1)
    sigma = EWMA_std_dev(historical_volumes, alpha=0.1)

  Alert conditions:
    - Volume < expected - 3*sigma for 2 consecutive 5-min windows → "Event drop detected"
    - Volume > expected + 5*sigma for 1 window → "Event spike detected"
    - Volume = 0 for 30 min during peak hours (8am–10pm project timezone) → "Event silence"
```

Event silence detection is critical: when a product's analytics go silent (SDK misconfigured after a deploy), the product team may not notice for hours. Proactive alerting on silence reduces the mean-time-to-detect (MTTD) from hours to minutes.

---

## Query Performance Metrics

### Core Query KPIs

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `query.funnel.latency_p50_ms` | Histogram | Median funnel query execution time | > 500ms |
| `query.funnel.latency_p99_ms` | Histogram | P99 funnel query execution time | > 2000ms |
| `query.retention.latency_p99_ms` | Histogram | P99 retention query execution time | > 3000ms |
| `query.path.latency_p99_ms` | Histogram | P99 path analysis query time | > 5000ms |
| `query.cache.hit_rate` | Gauge | L1 result cache hit rate | < 20% (cache misconfigured) |
| `query.materialized_view.hit_rate` | Gauge | Warm materialized view hit rate | < 30% (workload shifted) |
| `query.cold_scan.rate` | Gauge | % of queries hitting cold columnar scan | > 60% (cache miss high) |
| `query.timeout_rate` | Gauge | % of queries timing out (> 30s) | > 0.1% |
| `query.queue.depth` | Gauge | Queries waiting for executor slots | > 10 |
| `query.executor.utilization` | Gauge | % of query executor capacity in use | > 80% sustained |
| `query.cost.rows_scanned_total` | Counter | Total rows scanned per project per hour | Top-N projects (quota enforcement) |

### Query Latency Breakdown

Slow queries are instrumented with span-level timing to identify the bottleneck:

```
Span tree for a typical funnel query:
  query_total (wall clock)
  ├── cache_lookup (L1 check)
  ├── plan_generation (parse + route)
  ├── step_scan_parallel (all steps in parallel)
  │   ├── step_0_scan (hot + warm partition reads)
  │   ├── step_1_scan
  │   └── step_2_scan
  ├── bitmap_construction (per step)
  ├── intersection_and_window_check
  ├── breakdown_computation (if requested)
  └── result_serialization
```

When P99 latency exceeds threshold, the span tree identifies which phase is slow:
- If `step_scan_parallel` dominates: storage is the bottleneck → scale storage nodes
- If `bitmap_construction` dominates: memory pressure → add query worker memory
- If `intersection_and_window_check` dominates: funnel has too many steps or users → suggest query optimization
- If `result_serialization` dominates: result set too large → suggest breakdown limits

---

## Data Freshness Monitoring

### Freshness Metrics

Data freshness is the most analytically important observability dimension: stale data leads to incorrect business decisions.

| Metric | Description | Alert Threshold |
|---|---|---|
| `freshness.ingest_lag_p95_seconds` | P95 time from event timestamp to event queryable in hot store | > 60 seconds |
| `freshness.hot_to_warm_lag_hours` | Time since last hot→warm compaction ran | > 2 hours |
| `freshness.warm_to_cold_lag_hours` | Time since last warm→cold compaction ran | > 26 hours |
| `freshness.rollup.lag_minutes` | Age of the oldest un-refreshed rollup cell | > 15 minutes |
| `freshness.materialized_view.stale_count` | Count of materialized views older than their configured refresh interval | > 0 |
| `freshness.late_event.rate` | % of events arriving with event_time > 1 hour before server_received_at | > 5% (client clock issues) |
| `freshness.retention_matrix.staleness_hours` | Age of oldest retention matrix cell in active cohort queries | > 25 hours |

### Canary Event Monitoring

A synthetic canary event (`_platform_canary`) is emitted by the monitoring system every minute from a controlled source. The end-to-end latency from canary emission to query visibility is the most reliable freshness measurement:

```
Canary flow:
  1. Monitoring system emits event with event_id=canary_001, timestamp=T0
  2. After 30 seconds, monitoring system queries: "did canary_001 appear?"
  3. If not visible: freshness alert (lag > 30s)
  4. If visible after 35 seconds: log actual lag
  5. Repeat every 60 seconds per region per project (sampled for large-project set)

Dashboards:
  - Real-time freshness p50/p95 by region
  - Historical freshness trend (did a deploy degrade freshness?)
  - Freshness SLO burn rate (are we spending SLO budget faster than expected?)
```

---

## SLO Dashboards

### Dashboard Structure

The operational dashboard is organized into three views corresponding to the three operational concerns:

**Ingestion Health Dashboard:**
```
Row 1: Current ingestion rate (events/sec) — by region, by project tier
Row 2: Collector latency percentiles (P50/P95/P99) — 1-hour window
Row 3: Queue lag — per partition, color-coded (green < 5s, yellow 5–30s, red > 30s)
Row 4: Event rejection and deduplication rates — last 6 hours
Row 5: PII detection and governance violation rates — by project (top 20)
```

**Query Health Dashboard:**
```
Row 1: Query volume by type (funnel/retention/path/ad-hoc) — per hour
Row 2: P50/P99 query latency by type — compared to SLO thresholds
Row 3: Cache hit rate (L1 + materialized view) — 24-hour trend
Row 4: Query timeout rate — last 2 hours
Row 5: Executor utilization — per region, with quota alerts
```

**Data Freshness Dashboard:**
```
Row 1: Canary event end-to-end latency — real-time, last 2 hours
Row 2: Ingest lag distribution — P50/P95/P99 across all projects
Row 3: Compaction job status — last run time, files processed, duration
Row 4: Rollup staleness — count of stale rollup cells by tier
Row 5: SLO error budget burn rate — freshness SLO consumption over 30-day window
```

### SLO Error Budget Tracking

```
SLO: 95% of events queryable within 60 seconds of event occurrence

Error budget calculation:
  - 30-day window = 2,592,000 minutes = 2,592,000 measurement windows
  - 5% error budget = 129,600 minutes where freshness > 60s is allowed
  - 1 minute of freshness violation = 1 minute consumed from budget

Budget burn rate dashboard:
  - Current 1-hour burn rate vs. expected (budget / hours remaining)
  - Alert: "Burn rate 3× normal — at this rate, SLO will be violated in N days"
  - Multi-window alerts: 1h burn rate × 6h lookback for sustained issues
```

---

## Alerting Strategy

### Alert Tiers and Routing

| Tier | Severity | Response Time | Examples | Routing |
|---|---|---|---|---|
| P1 — Critical | Ingestion stopped or data loss | 5 min | Queue lag > 5 min; collector availability < 99.5%; hot store write failure | On-call engineer page |
| P2 — High | SLO at risk | 30 min | P99 query latency 2× SLO; freshness lag > 120s; error budget burning fast | Slack #alerts-analytics |
| P3 — Medium | Degraded experience | 2 hours | Cache hit rate drop; high PII detection rate; governance violations spike | Slack #analytics-ops |
| P4 — Low | Informational | Next business day | Compaction running slower than expected; bloom filter accuracy drift | Ticket creation |

### Composite Alerts

Single-metric alerts generate noise. Composite alerts fire only when multiple signals align:

**"Funnel Data Quality Degraded" alert:**
```
FIRE when:
  ingest.events.deduplicated_total rate > 5% for 5 consecutive minutes
  AND query.funnel.latency_p99 > 1.5× baseline
  AND freshness.ingest_lag_p95 > 45s

Indicates: SDK retry storm causing dedup pressure AND downstream query degradation
Action: Check SDK release rollout; scale collector tier if needed
```

**"Silent Project" alert:**
```
FIRE when:
  project has had > 100 events/hour for the past 7 days
  AND current event rate = 0 for 30 consecutive minutes
  AND it is within project's active hours (8am-10pm local timezone)

Indicates: Likely SDK misconfiguration or deploy broke instrumentation
Action: Auto-notify project owner via email + in-app notification
```
