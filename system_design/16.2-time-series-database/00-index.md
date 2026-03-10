# 16.2 Design a Time-Series Database

## System Overview

A time-series database (TSDB) is a purpose-built storage engine optimized for the ingestion, compression, and querying of timestamped data points---metrics, sensor readings, financial ticks, and IoT telemetry---where the write workload is append-only, reads are overwhelmingly range-based aggregations, and data value decays predictably with age. The core engineering challenge is building a storage engine that can ingest millions of data points per second with sub-millisecond append latency, compress those points from 16 bytes (8-byte timestamp + 8-byte float64) down to ~1.37 bytes using Gorilla-style encoding that exploits the regularity of real-world time-series signals, answer aggregation queries across billions of points in sub-second latency by combining an inverted label index with columnar chunk scanning, and automatically downsample aging data through tiered retention policies that trade resolution for storage cost without losing queryability. Unlike general-purpose databases designed for random-access CRUD on business entities, a TSDB bets on the temporal locality of data: recent data is hot and queried frequently at full resolution; historical data is cold and accessed rarely through pre-aggregated rollups. This asymmetry drives every major design decision---from the in-memory head block that buffers recent writes behind a WAL, to the LSM-inspired compaction pipeline that merges immutable on-disk blocks, to the object-storage tier that provides virtually unlimited retention at commodity cost. Production implementations span the spectrum from single-node embedded engines (Prometheus TSDB) to fully disaggregated cloud-native architectures (InfluxDB 3.0 with Apache Arrow and Parquet on object storage), with systems like VictoriaMetrics, TimescaleDB, and QuestDB each making distinct trade-offs along the axes of cardinality tolerance, query language richness, and operational simplicity.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Write Pattern** | Append-only, immutable data points; extremely write-heavy (100:1 to 1000:1 write-to-read ratio at ingestion layer); writes are batched, sequential within each series, and massively parallel across series; no in-place updates or deletes of individual points |
| **Data Model** | Each time series is identified by a metric name + sorted set of label key-value pairs; data points are (timestamp, float64_value) tuples; the label set defines the cardinality space that must be indexed; some TSDBs extend to multi-field models (InfluxDB fields, TimescaleDB columns) |
| **Compression** | Gorilla-style encoding achieves 1.37 bytes per point (12x compression): delta-of-delta for timestamps (96% compress to 1 bit when scrape intervals are regular), XOR for float values (51% compress to 1 bit when values change slowly); columnar Parquet with dictionary + run-length + delta encoding achieves 10-20x on structured time-series |
| **Query Pattern** | Range-based aggregation: "average CPU across all pods in region X for the last 6 hours, grouped by service"; queries fan out across series via inverted index, scan compressed chunks within time bounds, and apply vectorized aggregation; point lookups are rare |
| **Retention & Downsampling** | Tiered retention: full resolution for recent data (hours to weeks), progressively downsampled rollups (5-min, 1-hour) for medium and long-term; downsampling stores (min, max, sum, count) tuples to support multiple aggregation functions from a single rollup |
| **Cardinality Sensitivity** | Performance degrades non-linearly with label cardinality; each unique label combination creates a new series requiring index entries, memory for the head chunk, and storage for compressed blocks; unbounded labels (user_id, trace_id) cause catastrophic memory growth |
| **Storage Tiering** | Hot tier (in-memory head block + WAL on local SSD) for recent writes; warm tier (compacted immutable blocks on local disk) for recent history; cold tier (Parquet/block files on object storage) for long-term retention at ~5x lower cost |

---

## Quick Navigation

| Document | Focus |
|---|---|
| [01 --- Requirements & Estimations](./01-requirements-and-estimations.md) | Functional requirements, capacity math for high-throughput ingestion, SLOs |
| [02 --- High-Level Design](./02-high-level-design.md) | Architecture, write path, read path, compaction pipeline, key decisions |
| [03 --- Low-Level Design](./03-low-level-design.md) | Data model, Gorilla compression, inverted index, chunk format, API design |
| [04 --- Deep Dives & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Compaction storms, out-of-order ingestion, cardinality explosion, query fanout |
| [05 --- Scalability & Reliability](./05-scalability-and-reliability.md) | Horizontal scaling, sharding strategies, replication, disaster recovery |
| [06 --- Security & Compliance](./06-security-and-compliance.md) | Multi-tenancy isolation, metric data sensitivity, encryption, access control |
| [07 --- Observability](./07-observability.md) | Meta-monitoring: how to observe the TSDB itself without circular dependencies |
| [08 --- Interview Guide](./08-interview-guide.md) | 45-min pacing, TSDB-specific traps, compression trade-offs, scoring rubric |
| [09 --- Insights](./09-insights.md) | 10 non-obvious architectural insights unique to time-series database design |

---

## Complexity Rating: **Very High**

| Dimension | Rating | Justification |
|---|---|---|
| Data Model Complexity | Very High | Dimensional label model creates combinatorial cardinality space; inverted index with posting lists requires search-engine techniques; compression algorithms operate at the bit level |
| Write Path | High | Millions of concurrent series, WAL durability with memory-mapped head block, out-of-order sample handling, backpressure under sustained high-throughput |
| Read/Query Path | Very High | Arbitrary label-based fan-out across billions of data points; query language evaluation (PromQL/SQL); balancing pre-aggregation vs. on-the-fly computation; multi-resolution queries across retention tiers |
| Storage Engine | Very High | Gorilla chunk encoding, LSM-style compaction of immutable blocks, time-based partitioning, object storage offloading, downsampling pipeline with type-aware aggregation |
| Operational Complexity | High | Cardinality management, compaction tuning, retention policy enforcement, WAL sizing, memory pressure from head block, storage tier migration |

---

## What Differentiates Naive vs. Production

| Dimension | Naive Approach | Production Reality |
|---|---|---|
| **Storage** | Store each data point as a row in a relational table: (metric_name, timestamp, value) with B-tree indexes; 16+ bytes per point plus index overhead | Purpose-built columnar chunks: data points within a series stored contiguously using Gorilla encoding (delta-of-delta timestamps, XOR float values); head block in memory backed by WAL; periodic flush to immutable on-disk blocks; compaction merges blocks; object storage for cold tier. Achieves 1.37 bytes per point---12x compression |
| **Indexing** | Full-text or B-tree index on metric name; label filtering via sequential scan or LIKE queries | Inverted index mapping (label_name, label_value) → sorted posting list of series IDs; query resolution via posting list intersection (identical to search engine query processing); symbol table interns label strings to integer IDs for compact storage |
| **Ingestion** | Single-point HTTP inserts; synchronous disk write per point; no batching | Batch ingestion via Protocol Buffers or columnar Arrow format; WAL append for durability; in-memory head block buffers points; asynchronous flush to disk blocks; backpressure via admission control and per-tenant rate limiting |
| **Querying** | SQL with GROUP BY and WHERE timestamp BETWEEN; full table scan for time range; no pre-aggregation | Chunk-level time-range pruning (min/max timestamp per chunk); inverted index for label-based series selection; vectorized aggregation across matched chunks; recording rules pre-compute expensive queries; query result caching with fingerprint-based invalidation |
| **Retention** | Keep all data forever at full resolution; storage costs grow linearly without bound | Tiered retention with automatic downsampling: full resolution for recent data, 5-minute rollups for medium-term, 1-hour rollups for long-term; each rollup stores (min, max, sum, count) for type-safe aggregation; object storage for cold tier at ~$0.02/GB/month |
| **Cardinality** | Allow arbitrary labels with no limits; discover problems only when system OOMs or queries time out | Per-tenant cardinality caps enforced at ingestion; cardinality analysis dashboards; automatic label dropping for labels exceeding thresholds; cost attribution per label dimension; series creation rate limiting |
| **Out-of-Order** | Reject or silently drop late-arriving data; or sort entire partition on every insert | Out-of-order head block with configurable acceptance window (e.g., 30 minutes); late samples buffered separately and merged during compaction; enables push-based ingestion from distributed agents with clock skew |

---

## What Makes This System Unique

### The Storage Engine Is a Bet on Data Regularity

Gorilla compression achieves its extraordinary 12x ratio by exploiting two properties of monitoring data: timestamps arrive at regular intervals (delta-of-delta is usually zero) and float values change slowly between consecutive points (XOR produces few significant bits). These assumptions hold for pull-based infrastructure metrics with fixed scrape intervals and slowly-changing counters. They degrade for push-based event metrics with irregular timestamps, volatile gauges (queue depths, stock prices), and high-entropy values (hashes, random IDs encoded as floats). A TSDB's effective compression ratio is therefore a function of how well the data matches the algorithm's assumptions---making it a conditional property, not a universal guarantee. This creates a feedback loop: good instrumentation practices (regular intervals, monotonic counters) are rewarded with better compression and lower storage costs.

### Time Is the Primary Partitioning Axis---And This Changes Everything

Unlike key-value stores that partition by key hash, TSDBs partition primarily by time. Each block/chunk covers a fixed time range (2 hours, 1 day). This means that deletion is O(1)---drop the block file---while point deletes are expensive (tombstone marking). Compaction can operate independently on non-overlapping time ranges. Queries with narrow time ranges read few blocks regardless of total data volume. And retention enforcement is trivially implemented as "delete all blocks older than N days." This time-first partitioning is the single architectural decision that makes the entire system viable: it turns the most common operations (append recent, query recent, delete old) into the cheapest operations.

### The Inverted Index Problem Is Actually a Search Engine Problem

A TSDB must support queries like `cpu_usage{region="us-east", service=~"api.*"}`. This requires an inverted index that maps label values to series IDs and resolves queries via posting list intersection---exactly how search engines resolve keyword queries. The index must fit in memory for acceptable latency (disk-based lookups add 10-100ms per posting list). At 100M active series, the index alone can consume 80+ GB of RAM, forcing architectural decisions about index sharding, tiered caching, and the boundary between monolithic and distributed deployment. The TSDB's query performance ceiling is therefore determined not by data volume but by inverted index size, which is a function of cardinality.
