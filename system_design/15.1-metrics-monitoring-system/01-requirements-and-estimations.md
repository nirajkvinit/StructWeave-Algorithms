# Requirements & Estimations --- Metrics & Monitoring System

## Functional Requirements

### Core Features (In Scope)

1. **Metric Ingestion** --- Accept time-series data from heterogeneous sources via both pull (scraping targets at configurable intervals) and push (agents/SDKs sending batches) models; support counters, gauges, histograms, and summaries as first-class metric types
2. **Time-Series Storage** --- Persist metric data in a purpose-built TSDB with Gorilla-style compression; support configurable retention periods with automatic downsampling and compaction
3. **Dimensional Data Model** --- Each metric is identified by a name + arbitrary key-value label set; support label-based filtering, grouping, and aggregation
4. **Query Engine** --- PromQL-compatible query language supporting range queries, instant queries, aggregation operators (sum, avg, max, min, count, quantile), arithmetic, and functions (rate, irate, increase, histogram_quantile)
5. **Alerting Engine** --- Continuous rule evaluation against live metrics; configurable thresholds, pending durations, and evaluation intervals; alert state machine (INACTIVE -> PENDING -> FIRING -> RESOLVED)
6. **Notification Pipeline** --- Alert routing, grouping, deduplication, silencing, and inhibition; multi-channel delivery (webhook, email, messaging platforms, PagerDuty-style integrations)
7. **Dashboard & Visualization** --- Query-driven dashboard system with panels, variables, time range selectors, and auto-refresh; support for graph, heatmap, gauge, table, and stat panel types
8. **Recording Rules** --- Pre-compute expensive queries and store results as new time series to accelerate dashboards and alert evaluation
9. **Multi-Tenancy** --- Per-tenant ingestion limits, cardinality caps, storage quotas, and query resource limits

### Explicitly Out of Scope

- **Log aggregation** --- Handled by dedicated log systems (see 15.3)
- **Distributed tracing** --- Handled by tracing systems (see 15.2)
- **Application Performance Monitoring (APM)** --- Trace-level request profiling
- **Synthetic monitoring** --- Uptime checks and scripted browser tests
- **Infrastructure provisioning** --- Server/container lifecycle management
- **Business analytics** --- Revenue, conversion, user behavior analytics

---

## Non-Functional Requirements

### CAP Theorem Position

| Property | Position | Justification |
|---|---|---|
| **Consistency** | Eventual (within seconds) | Metric data is append-only and immutable; slight staleness in queries (1-2 scrape intervals) is acceptable; strong consistency would create unacceptable write amplification at millions of series |
| **Availability** | High (prioritized over consistency) | Monitoring must remain available during partial failures; an unavailable monitoring system is worse than a slightly inconsistent one; AP choice with convergence guarantees |
| **Partition Tolerance** | Required | Distributed TSDB nodes across availability zones; network partitions between ingestion and query layers must not cause data loss (WAL ensures durability) |

### Consistency Model

- **Write path**: Eventual consistency with WAL durability; writes are acknowledged after WAL append (durable) but may not be immediately queryable until the head block is refreshed
- **Query path**: Read-after-write consistency within a single node; cross-node queries may see data up to one replication lag behind (typically <5 seconds)
- **Alert evaluation**: Consistent within evaluation group; all rules in a group see the same snapshot of data for a given evaluation timestamp
- **Recording rules**: Eventually consistent; computed on a fixed interval and stored as new series; dashboards using recording rules see data at recording-rule resolution

### Availability Target

| Component | Target | Justification |
|---|---|---|
| Ingestion pipeline | 99.95% (26 min downtime/year) | Must be the most available component; data loss during ingestion downtime is permanent |
| Query engine | 99.9% (8.7 hrs downtime/year) | Queries can be retried; brief unavailability is tolerable if dashboards show cached data |
| Alerting engine | 99.99% (52 min downtime/year) | Missed alerts can cause cascading incidents; alerting is the highest-priority read path |
| Dashboard frontend | 99.9% | Dashboards are consumed by humans who can tolerate brief interruptions |

### Latency Targets

| Operation | p50 | p95 | p99 | Notes |
|---|---|---|---|---|
| Metric ingestion (batch) | 5 ms | 20 ms | 50 ms | Time from receiving batch to WAL append acknowledgment |
| Instant query (single series) | 10 ms | 50 ms | 100 ms | Single series, recent data, label match |
| Range query (100 series, 1 hour) | 50 ms | 200 ms | 500 ms | Aggregation across matched series |
| Range query (10K series, 24 hours) | 500 ms | 2 s | 5 s | Fan-out query, pre-aggregation helps |
| Dashboard load (10 panels) | 1 s | 3 s | 5 s | Parallel panel queries |
| Alert rule evaluation | 100 ms | 500 ms | 1 s | Per evaluation group |
| Alert notification delivery | 1 s | 5 s | 15 s | From FIRING state to notification sent |

### Durability Guarantees

- **Zero data loss** for acknowledged writes (WAL ensures durability before acknowledgment)
- **At-least-once** ingestion semantics (duplicates handled by series deduplication at query time or compaction time)
- **Exactly-once** alert notifications within a deduplication window (notification pipeline maintains state)

---

## Capacity Estimations (Back-of-Envelope)

### Assumptions for a Large-Scale Platform

- 10,000 monitored services/hosts
- Each host emits ~1,000 unique metric series
- Scrape interval: 15 seconds (4 samples/minute per series)
- Average metric name + labels: ~200 bytes
- Each data point: 16 bytes uncompressed (8-byte timestamp + 8-byte float64 value)
- Gorilla compression ratio: ~12x (1.37 bytes per point)
- 30% daily cardinality churn (series that appear/disappear due to pod restarts, deployments)

### Capacity Table

| Metric | Estimation | Calculation |
|---|---|---|
| Active time series | 10M | 10,000 hosts x 1,000 series/host |
| Samples per second | 667K | 10M series / 15s scrape interval |
| Samples per day | 57.6B | 667K x 86,400 seconds |
| Uncompressed daily storage | 922 GB | 57.6B x 16 bytes |
| Compressed daily storage | ~77 GB | 922 GB / 12x compression |
| Monthly storage (full resolution) | ~2.3 TB | 77 GB x 30 days |
| Yearly storage (with downsampling) | ~10 TB | 15 days full-res (1.15 TB) + 90 days at 5-min rollup (~0.77 TB) + 260 days at 1-hr rollup (~0.36 TB) + overhead |
| Index size (in-memory) | ~8 GB | 10M series x ~200 bytes label set + posting lists + symbol table |
| Head block memory | ~15 GB | 10M series x ~120 bytes (chunk head + append buffer) + overhead |
| Total ingestion bandwidth | ~130 MB/s | 667K samples/s x ~200 bytes per sample (with labels in batch protocol) |
| Query QPS (average) | ~500 | Dashboard refreshes + ad-hoc queries + alert evaluations |
| Query QPS (peak, incident) | ~5,000 | 10x during incidents as engineers open dashboards |
| Alert rules | ~5,000 | 0.5 rules per service on average |
| Alert evaluations/second | ~330 | 5,000 rules / 15s evaluation interval |

### Storage Growth Projections

| Timeframe | Active Series | Compressed Storage | Index Memory |
|---|---|---|---|
| Year 1 | 10M | ~10 TB | 8 GB |
| Year 2 | 25M | ~25 TB | 20 GB |
| Year 3 | 50M | ~50 TB | 40 GB |
| Year 5 | 100M+ | ~100 TB | 80 GB+ (requires sharding) |

---

## SLOs / SLAs

### Platform SLOs

| Metric | Target | Measurement | Burn Rate Alert |
|---|---|---|---|
| Ingestion availability | 99.95% | % of 1-minute windows with successful ingestion | >14.4x in 1 hour |
| Ingestion freshness | < 30 seconds | Time from metric emission to queryability | p99 > 60s |
| Query success rate | 99.9% | % of queries returning results (not timeout/error) | >10x in 6 hours |
| Query latency (p99) | < 5 seconds | For range queries across <10K series | p99 > 10s for 5 min |
| Alert evaluation lag | < 2x evaluation interval | Time from data availability to alert evaluation | Lag > 3x for 5 min |
| Alert notification latency | < 30 seconds | From FIRING state transition to notification delivery | p99 > 60s |
| Data durability | 99.999% | % of acknowledged samples that are queryable after 1 hour | Any confirmed data loss |
| Dashboard availability | 99.9% | % of successful dashboard loads | Error rate > 1% for 10 min |

### Tenant-Level SLOs

| Metric | Standard Tier | Premium Tier |
|---|---|---|
| Max active series | 1M | 10M |
| Max ingestion rate | 100K samples/s | 1M samples/s |
| Max cardinality per metric | 10K | 100K |
| Query concurrency | 10 | 100 |
| Query timeout | 30 seconds | 120 seconds |
| Retention (full resolution) | 15 days | 90 days |
| Retention (downsampled) | 13 months | 25 months |
| Alert rules | 500 | 5,000 |
| Alert evaluation interval | 60 seconds | 15 seconds |

---

## Metric Type Taxonomy

Understanding the four fundamental metric types is critical for correct ingestion, storage, and query semantics:

| Metric Type | Semantics | Example | Query Pattern |
|---|---|---|---|
| **Counter** | Monotonically increasing; resets to 0 on restart | `http_requests_total` | `rate()` to compute per-second change; `increase()` for total change over interval; must handle counter resets |
| **Gauge** | Arbitrary value that can go up or down | `temperature_celsius`, `goroutines_count` | Direct value queries; `avg_over_time()`, `max_over_time()` |
| **Histogram** | Client-side bucketed distribution of observations | `request_duration_seconds` | `histogram_quantile()` for percentile estimation; bucket boundaries are fixed at instrumentation time |
| **Summary** | Client-side computed quantiles (streaming) | `request_duration_seconds` (summary variant) | Pre-computed quantiles are not aggregatable across instances; use histograms for server-side aggregation |

### Counter vs. Gauge: Why It Matters for Storage

Counters are monotonically increasing within a process lifetime, which means delta encoding is extremely effective (deltas are always positive and typically small). Gauges can change in any direction, making delta encoding less effective. The TSDB's compression strategy exploits counter monotonicity: a counter that increments by ~100 per scrape interval has a delta-of-delta near zero, compressing to 1-2 bits per sample. A gauge representing random-walk values (e.g., queue depth under variable load) produces larger XOR differences and compresses less efficiently.

### Histogram Cardinality Warning

Each histogram with `n` buckets generates `n+2` time series (one per bucket boundary plus `_sum` and `_count`). A histogram with 20 buckets and 5 label dimensions, each with 10 values, generates `22 x 10^5 = 2.2M` time series from a single metric. This is the most common source of accidental cardinality explosion.
