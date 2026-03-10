# 15.1 Design a Metrics & Monitoring System

## System Overview

A metrics and monitoring system is a distributed infrastructure platform that ingests, stores, queries, and alerts on time-series data emitted by applications and infrastructure at massive scale. The core engineering challenge is building a time-series database (TSDB) that can ingest millions of unique time series at sub-second latency, compress and retain petabytes of metric data with aggressive compression ratios (12-15x through Gorilla-style encoding), answer arbitrary aggregation queries across hundreds of billions of data points within seconds, and evaluate thousands of alerting rules continuously without introducing latency that causes missed incidents. Unlike traditional databases optimized for CRUD operations on business entities, a TSDB must handle an append-only, monotonically timestamped write workload where data is written once and queried many times across flexible time windows, label dimensions, and aggregation functions. The system must support a dimensional data model where each metric is identified not by a single key but by a metric name plus an arbitrary set of key-value labels (e.g., `http_requests_total{method="GET", endpoint="/api/users", region="us-east", status="200"}`)---creating a combinatorial explosion of unique time series that is the single most dangerous scaling challenge in monitoring (cardinality explosion). Production monitoring platforms like Datadog process over 100 trillion events, Prometheus powers the observability layer for millions of Kubernetes clusters, and Grafana serves as the universal dashboard frontend---each solving different parts of the same fundamental problem: making operational data actionable at machine speed. The system must also handle the meta-challenge of being the most critical infrastructure component that cannot itself fail unobserved: monitoring the monitoring system requires careful architectural separation to avoid circular dependencies.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Write Pattern** | Append-only, immutable time-series data; extremely write-heavy (10:1 to 100:1 write-to-read ratio at ingestion layer); writes are batched and sequential within each time series but massively parallel across series; no updates or deletes of individual data points |
| **Data Model** | Dimensional metric model: each time series is uniquely identified by a metric name + sorted set of label key-value pairs; data points are (timestamp, value) tuples appended to a series; the label set creates the cardinality space that must be indexed |
| **Query Pattern** | Time-range aggregation queries: "give me the 95th percentile of request latency across all pods in region X over the last 6 hours, grouped by service"; queries fan out across many series and time ranges, requiring efficient label-based indexing and pre-aggregated rollups |
| **Compression** | Gorilla-style encoding achieves 1.37 bytes per data point (12x compression): delta-of-delta for timestamps (96% compress to 1 bit), XOR for float values (51% compress to 1 bit); critical for making petabyte-scale retention economically viable |
| **Cardinality Sensitivity** | System performance degrades non-linearly with cardinality: 10M active series is routine, 100M is challenging, 1B requires purpose-built architecture (Mimir/VictoriaMetrics); each new label value creates a new time series that must be indexed, stored, and queryable |
| **Alerting** | Continuous rule evaluation engine that processes thousands of alerting rules against live metric streams; must balance evaluation frequency (faster detection) against query load (more TSDB pressure); supports threshold, anomaly detection, and composite alert types |
| **Multi-Tenancy** | Enterprise platforms must isolate tenants at ingestion (rate limiting, cardinality caps), storage (data separation), query (resource quotas), and alerting (notification routing) layers while sharing infrastructure for cost efficiency |

---

## Quick Navigation

| Document | Focus |
|---|---|
| [01 --- Requirements & Estimations](./01-requirements-and-estimations.md) | Functional requirements, capacity math for millions of time series, SLOs |
| [02 --- High-Level Design](./02-high-level-design.md) | Architecture, write path, read path, alerting pipeline, key decisions |
| [03 --- Low-Level Design](./03-low-level-design.md) | TSDB data model, Gorilla compression, inverted index, API design, PromQL |
| [04 --- Deep Dives & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Cardinality explosion, compaction, query fanout, WAL recovery |
| [05 --- Scalability & Reliability](./05-scalability-and-reliability.md) | Horizontal scaling, sharding strategies, federation, disaster recovery |
| [06 --- Security & Compliance](./06-security-and-compliance.md) | Multi-tenancy isolation, metric data sensitivity, access control |
| [07 --- Observability](./07-observability.md) | Meta-monitoring: how to monitor the monitoring system itself |
| [08 --- Interview Guide](./08-interview-guide.md) | 45-min pacing, TSDB-specific traps, cardinality trade-offs, scoring rubric |
| [09 --- Insights](./09-insights.md) | 8 non-obvious architectural insights unique to metrics systems |

---

## Complexity Rating: **Very High**

| Dimension | Rating | Justification |
|---|---|---|
| Data Model Complexity | Very High | Dimensional label model creates combinatorial cardinality space; inverted index design is non-trivial; compression algorithms require bit-level encoding |
| Write Path | High | Millions of concurrent series, WAL durability, in-memory buffering with periodic flush, exactly-once semantics at scale |
| Read/Query Path | Very High | Arbitrary label-based aggregation across billions of data points; query language design (PromQL); pre-aggregation vs. on-the-fly trade-offs |
| Operational Complexity | Very High | Self-referential monitoring problem; cardinality management is an ongoing operational discipline, not a one-time design decision |
| Scaling Challenges | Very High | Cardinality is the dominant scaling axis, not data volume; horizontal scaling requires consistent hashing across label space |

---

## What Differentiates Naive vs. Production

| Dimension | Naive Approach | Production Reality |
|---|---|---|
| **Storage** | Store each data point as a row in a relational database with columns for metric name, timestamp, and value; use B-tree indexes for lookups | Purpose-built TSDB with columnar chunk storage: data points within a series are stored contiguously in compressed chunks using Gorilla encoding (delta-of-delta for timestamps, XOR for floats); head block in memory with WAL for durability; periodic compaction into immutable blocks on disk; inverted index maps label sets to series IDs for O(1) lookup |
| **Cardinality** | Allow arbitrary labels with no limits; discover cardinality problems only when the system falls over (OOM, query timeout, disk exhaustion) | Cardinality as a first-class resource: per-tenant cardinality caps enforced at ingestion; cardinality analysis tools that identify high-cardinality labels before they cause problems; automatic label dropping or aggregation for labels exceeding thresholds; cost attribution per label dimension |
| **Querying** | Scan all data points in the time range, filter by labels in application code, compute aggregations in a single thread | Inverted index for label-based series selection (analogous to a search engine's posting lists); chunk-level time range pruning; vectorized aggregation across matched series; query parallelism with per-query memory limits; pre-aggregated rollups for common queries; query result caching with series-fingerprint invalidation |
| **Alerting** | Cron job that runs every minute, executes each alert query sequentially against the TSDB, sends notifications directly via email/webhook | Streaming alert evaluation engine: rules are compiled into evaluation groups with configurable intervals; each evaluation is a TSDB query with strict timeout; alert state machine (INACTIVE -> PENDING -> FIRING -> RESOLVED) with configurable pending duration to avoid flapping; notification pipeline with deduplication, grouping, silencing, and routing; separate alertmanager component to decouple alert evaluation from notification delivery |
| **Ingestion** | HTTP endpoint that accepts one data point per request; synchronous write to disk | Batch ingestion: agents collect and pre-aggregate locally, send compressed batches (Protocol Buffers / OTLP); write path buffers in memory (head block), appends to WAL for durability, periodically flushes to disk blocks; backpressure via admission control when ingestion exceeds capacity |
| **Multi-Tenancy** | Shared database with a `tenant_id` column; no resource isolation; one tenant's cardinality explosion degrades all tenants | Tenant-isolated ingestion pipeline: per-tenant rate limits, cardinality caps, and storage quotas enforced at the ingestion gateway; query-time tenant isolation via per-tenant query concurrency limits and memory quotas; optional physical isolation (separate TSDB instances) for premium tenants; cross-tenant aggregation prohibited by default |
| **Retention** | Keep all data forever at full resolution; storage costs grow linearly | Tiered retention with downsampling: full resolution for recent data (e.g., 15 days), 5-minute rollups for medium-term (e.g., 90 days), 1-hour rollups for long-term (e.g., 1 year); data automatically downsampled and compacted; object storage for cold tier with on-demand rehydration for historical queries |

---

## What Makes This System Unique

### The Cardinality Problem Is the Defining Engineering Challenge

Unlike most distributed systems where the primary scaling axis is data volume (bytes) or request rate (QPS), a metrics system's dominant scaling constraint is **cardinality**---the number of unique time series. Each unique combination of metric name + label values creates a new series that must be separately indexed, buffered in memory, flushed to disk, and made queryable. A single metric `http_requests_total` with labels `{method, endpoint, status, region, pod}` can generate millions of unique series in a large Kubernetes deployment. The inverted index that maps labels to series must fit in memory for fast query resolution, and each active series consumes RAM for the in-memory head block. Cardinality grows combinatorially with labels, making it an adversarial scaling problem: a single developer adding an unbounded label (like `user_id` or `trace_id`) to a metric can take down the entire monitoring cluster. Production systems must treat cardinality as a managed resource with quotas, alerting, and enforcement---not just a property of the data.

### Time-Series Compression Is a Bet on Data Regularity

Gorilla-style compression achieves 12x compression (1.37 bytes per point vs. 16 bytes uncompressed) by exploiting a deep insight about metric data: timestamps are regular (scrape intervals are fixed, so delta-of-delta is usually zero), and values change slowly (CPU usage, request count, error rate tend to be similar to their previous value). This regularity is not guaranteed---it's a bet. If a metric's values are truly random (e.g., a hash or a random ID encoded as a float), XOR compression degrades to worse-than-uncompressed. If scrape intervals are highly irregular (e.g., event-driven push metrics), delta-of-delta encoding provides little benefit. The TSDB's compression ratio is therefore a function of data regularity, which is a function of what users choose to monitor and how they instrument their code. This creates a feedback loop between instrumentation practices and storage costs.

### The Self-Referential Monitoring Problem

A metrics system must be the most reliable component in the infrastructure because every other component depends on it for operational visibility. But the monitoring system itself needs monitoring---and this creates a circular dependency. If the TSDB's ingestion pipeline is overloaded, the metrics that would tell you about the overload are the ones being dropped. Production systems solve this through architectural separation: a lightweight, independent "meta-monitoring" stack (often a separate, minimal Prometheus instance) that monitors the primary monitoring system's health. This meta-monitoring system must be radically simpler and more reliable than the primary system, operating on a small, fixed set of internal health metrics with no dependency on the primary system's availability.

### Pull vs. Push Is Not a Binary Choice

Prometheus popularized the pull model (monitoring server scrapes targets), while Datadog and OpenTelemetry use push (agents send data to the server). The trade-off is deeper than it appears. Pull provides natural service discovery (if you can scrape it, it's alive), built-in health checking (scrape failure = potential outage), and centralized control (the server decides what to collect). Push supports ephemeral workloads (batch jobs, serverless functions that exist for seconds), scales the ingestion load (agents do the work of sending, not the server of fetching), and works across network boundaries (agents can push through firewalls where the server couldn't reach in to scrape). Most production systems end up hybrid: Prometheus uses pull but provides Pushgateway for batch jobs; Datadog uses push but the agent acts as a local pull-based collector. The architectural insight is that the ingestion model is not a global system choice but a per-source decision based on the source's lifecycle and network topology.
