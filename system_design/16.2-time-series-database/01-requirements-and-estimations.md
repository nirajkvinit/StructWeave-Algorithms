# Requirements & Estimations --- Time-Series Database

## Functional Requirements

### Core Features (In Scope)

1. **Data Ingestion** --- Accept time-series data points via both push (agents/SDKs send batches) and pull (server scrapes HTTP endpoints) models; support batch writes with Protocol Buffers, line protocol, or columnar formats; enforce admission control under overload
2. **Time-Series Storage Engine** --- Purpose-built append-only storage with Gorilla-style compression (delta-of-delta timestamps, XOR float values); in-memory head block backed by WAL; immutable on-disk blocks with periodic compaction
3. **Dimensional Data Model** --- Each time series identified by a metric name + sorted label key-value pairs; support for counters, gauges, histograms, and summary metric types; multi-field models for wider column sets (IoT, financial)
4. **Inverted Label Index** --- Map (label_name, label_value) pairs to series IDs via posting lists; support exact match, regex, and negative matchers; enable sub-second series resolution across millions of active series
5. **Query Engine** --- Support range queries, instant queries, and aggregation operators (sum, avg, max, min, count, quantile, rate, irate, increase); query language (PromQL-compatible or SQL with time-series extensions); vectorized execution across matched series
6. **Compaction Pipeline** --- Merge small time-range blocks into larger ones (2h → 6h → 24h); rewrite indexes for optimal read performance; apply tombstone-based deletions; run as background process without blocking ingestion or queries
7. **Downsampling & Tiered Retention** --- Automatically create lower-resolution rollups (5-min, 1-hour) from full-resolution data; store (min, max, sum, count) per downsampled interval for type-safe aggregation; enforce configurable retention per tier
8. **Out-of-Order Ingestion** --- Accept late-arriving samples within a configurable time window (e.g., 30 minutes); buffer out-of-order data separately; merge into the correct time position during compaction
9. **Multi-Tenancy** --- Per-tenant ingestion rate limits, cardinality caps, storage quotas, and query concurrency limits; logical or physical tenant isolation; cost attribution per tenant

### Explicitly Out of Scope

- **Alerting engine** --- Rule evaluation and notification routing (separate system, covered in 15.1)
- **Dashboard & visualization** --- Frontend rendering and panel management
- **Log or trace storage** --- Different data models and access patterns (see 15.2, 15.3)
- **Stream processing** --- Real-time transformations, windowed aggregations, CEP
- **Full-text search** --- Text indexing and relevance scoring (see 16.3)

---

## Non-Functional Requirements

### CAP Theorem Position

| Property | Position | Justification |
|---|---|---|
| **Consistency** | Eventual (within seconds) | Time-series data is append-only and immutable; slight query staleness (1-2 scrape intervals) is acceptable; strong consistency would require coordination that limits write throughput at millions of points/second |
| **Availability** | High (prioritized over consistency) | A TSDB that stops accepting writes loses data permanently (monitoring gaps); availability is paramount; AP choice with convergence guarantees |
| **Partition Tolerance** | Required | Distributed TSDB nodes span availability zones; network partitions between ingesters must not cause data loss (WAL ensures local durability) |

### Consistency Model

- **Write path**: Eventual consistency with WAL durability; writes acknowledged after WAL append but may not be queryable until head block refresh (~2 seconds)
- **Query path**: Read-after-write consistency within a single node; cross-node queries see data within replication lag (~5 seconds)
- **Compaction**: Eventually consistent; compacted blocks replace source blocks atomically via metadata swap; queries may briefly see both old and new blocks during the transition (deduplicated at query time)

### Availability Target

| Component | Target | Justification |
|---|---|---|
| Ingestion pipeline | 99.95% (26 min downtime/year) | Data loss during ingestion downtime is permanent; the most critical component |
| Query engine | 99.9% (8.7 hrs downtime/year) | Queries can be retried; brief unavailability tolerable if dashboards cache |
| Compaction pipeline | 99.5% | Background process; temporary unavailability causes block accumulation but no data loss |
| Downsampling pipeline | 99.5% | Idempotent and catch-up capable; delays only affect long-term query resolution |

### Latency Targets

| Operation | p50 | p95 | p99 | Notes |
|---|---|---|---|---|
| Write (batch of 1K points) | 2 ms | 10 ms | 25 ms | Time from receiving batch to WAL acknowledgment |
| Instant query (single series) | 5 ms | 20 ms | 50 ms | Single series, recent data (head block), label match |
| Range query (100 series, 1 hour) | 20 ms | 100 ms | 250 ms | Aggregation across matched series in recent blocks |
| Range query (10K series, 24 hours) | 200 ms | 1 s | 3 s | Fan-out query across many series and multiple blocks |
| Historical query (1K series, 30 days) | 500 ms | 3 s | 8 s | Touches downsampled blocks on object storage |
| Series metadata lookup | 1 ms | 5 ms | 10 ms | Inverted index lookup for label matchers |

### Durability Guarantees

- **Zero data loss** for acknowledged writes (WAL ensures durability before acknowledgment)
- **At-least-once** ingestion semantics (duplicates deduplicated by series ID + timestamp at query time or compaction time)
- **Exactly-once** compaction and downsampling (idempotent operations keyed on block ID and time range)

---

## Capacity Estimations (Back-of-Envelope)

### Assumptions for a Large-Scale TSDB Platform

- 50,000 monitored hosts/containers
- Each host emits ~500 unique metric series
- Scrape/push interval: 15 seconds (4 samples/minute per series)
- Average metric name + labels: ~200 bytes (for indexing)
- Each data point: 16 bytes uncompressed (8-byte timestamp + 8-byte float64)
- Gorilla compression ratio: ~12x (1.37 bytes per point)
- 20% daily cardinality churn (container restarts, deployments)

### Capacity Table

| Metric | Estimation | Calculation |
|---|---|---|
| Active time series | 25M | 50,000 hosts x 500 series/host |
| Samples per second | 1.67M | 25M series / 15s interval |
| Samples per day | 144B | 1.67M x 86,400 seconds |
| Uncompressed daily storage | 2.3 TB | 144B x 16 bytes |
| Compressed daily storage | ~192 GB | 2.3 TB / 12x compression |
| Monthly storage (full resolution) | ~5.8 TB | 192 GB x 30 days |
| Yearly storage (with downsampling) | ~25 TB | 15 days full-res (2.9 TB) + 90 days 5-min rollup (0.97 TB) + 260 days 1-hr rollup (0.14 TB) + index/metadata overhead |
| Index size (in-memory) | ~20 GB | 25M series x ~200 bytes label set + posting lists + symbol table |
| Head block memory | ~37.5 GB | 25M series x ~120 bytes (chunk head + append buffer) + WAL buffer overhead |
| Total ingestion bandwidth | ~330 MB/s | 1.67M samples/s x ~200 bytes per sample (with labels in batch protocol) |
| Query QPS (average) | ~200 | Dashboard refreshes + recording rule evaluations + ad-hoc queries |
| Query QPS (peak) | ~2,000 | 10x during incidents |
| New series creation rate | ~340/s | 25M x 20% churn / 86,400s (daily churn distributed) |

### Storage Growth Projections

| Timeframe | Active Series | Compressed Storage (Cumulative) | Index Memory |
|---|---|---|---|
| Year 1 | 25M | ~25 TB | 20 GB |
| Year 2 | 50M | ~75 TB | 40 GB |
| Year 3 | 100M | ~175 TB | 80 GB (requires index sharding) |
| Year 5 | 250M+ | ~500 TB | 200 GB+ (distributed index mandatory) |

---

## SLOs / SLAs

### Platform SLOs

| Metric | Target | Measurement | Burn Rate Alert |
|---|---|---|---|
| Ingestion availability | 99.95% | % of 1-minute windows with successful write acknowledgment | >14.4x in 1 hour |
| Ingestion freshness | < 15 seconds | Time from data point creation to queryability | p99 > 30s |
| Write latency (p99) | < 25 ms | Time from batch receipt to WAL acknowledgment | p99 > 50 ms for 5 min |
| Query success rate | 99.9% | % of queries returning results (not timeout/error) | >10x in 6 hours |
| Query latency (p99) | < 3 seconds | For range queries across <10K series, 24-hour window | p99 > 5s for 5 min |
| Compaction lag | < 4 hours | Time since oldest uncompacted block was created | Lag > 6 hours |
| Data durability | 99.999% | % of acknowledged samples queryable after 1 hour | Any confirmed data loss |
| Downsampling freshness | < 6 hours | Time from data aging past full-resolution retention to downsampled availability | Lag > 12 hours |

### Tenant-Level SLOs

| Metric | Standard Tier | Premium Tier |
|---|---|---|
| Max active series | 5M | 50M |
| Max ingestion rate | 500K samples/s | 5M samples/s |
| Max cardinality per metric | 50K | 500K |
| Query concurrency | 20 | 200 |
| Query timeout | 30 seconds | 120 seconds |
| Retention (full resolution) | 7 days | 90 days |
| Retention (downsampled) | 13 months | 25 months |
| Out-of-order window | 5 minutes | 60 minutes |

---

## Data Point Type Taxonomy

Understanding the fundamental data point types is critical for correct compression, storage, and query semantics:

| Type | Semantics | Compression Behavior | Query Pattern |
|---|---|---|---|
| **Counter** | Monotonically increasing; resets to 0 on process restart | Excellent delta-of-delta (deltas are small, positive, regular) | `rate()`, `increase()` to compute per-second change; must handle resets |
| **Gauge** | Arbitrary value, can go up or down | Good XOR when stable; poor XOR when volatile | Direct value queries; `avg_over_time()`, `max_over_time()` |
| **Histogram** | Client-side bucketed distribution (n+2 series per histogram) | Each bucket is a counter (excellent compression) | `histogram_quantile()` for percentile estimation; cardinality risk: 20 buckets x labels |
| **Float** | Generic 64-bit floating-point measurement | Depends on value stability; random floats compress poorly | Arbitrary arithmetic and aggregation |
| **Integer** | Discrete integer values (event counts, queue depths) | Excellent when values repeat or increment by 1 | Count-based queries; often converted to float internally |
