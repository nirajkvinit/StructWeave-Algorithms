# Interview Guide --- Time-Series Database

## Interview Pacing (45-min Format)

| Time | Phase | Focus | Key Deliverables |
|------|-------|-------|-----------------|
| 0-5 min | **Clarify** | Ask scope questions; confirm requirements | Write workload profile, query patterns, scale targets, consistency model |
| 5-15 min | **High-Level Design** | Core architecture, data flow | Write path (WAL → head block → compaction → object storage), read path (inverted index → chunk scan → aggregation), block-based time partitioning |
| 15-30 min | **Deep Dive** | Pick 1-2: compression, inverted index, compaction, downsampling | Gorilla encoding algorithm, posting list intersection, block merge strategy, tiered retention |
| 30-40 min | **Scale & Trade-offs** | Cardinality management, failure scenarios, multi-tenancy | Cardinality enforcement pipeline, ingester replication, compaction under load, disaggregated vs. monolithic |
| 40-45 min | **Wrap Up** | Summarize trade-offs, handle follow-ups | Key decisions with justifications, areas for future improvement |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **The compression algorithm is the centerpiece**: Unlike most system design interviews where the storage layer is abstracted away, a TSDB interview expects you to understand Gorilla compression at the bit level. Delta-of-delta for timestamps and XOR for float values are not just implementation details---they are the core innovation that makes the system economically viable.

2. **Cardinality, not volume, is the scaling axis**: Most candidates think in terms of data volume (GB/TB). Interviewers want to hear about cardinality (number of unique time series) as the dominant scaling constraint. A system with 100M series is harder to operate than one with 1B data points across 1M series.

3. **Time-based partitioning changes everything**: The single most important architectural insight is that time is the primary partition key. This makes deletion O(1), query pruning trivial, and compaction independently parallelizable---but it also means point deletes are expensive and out-of-order data requires special handling.

4. **The query engine is a search engine in disguise**: Label-based series resolution via inverted index and posting list intersection is directly analogous to search engine query resolution. Candidates who can draw this connection demonstrate deep architectural understanding.

### Where to Spend Most Time

- **15 minutes**: Write path (WAL → head block → compaction → storage tiering). This is the core data flow and where most interesting trade-offs live.
- **10 minutes**: Compression deep dive (Gorilla algorithm). Demonstrates understanding of why the system works at all.
- **5 minutes**: Read path and inverted index. Show you understand the query resolution strategy.
- **5 minutes**: Cardinality management and failure scenarios. Shows operational maturity.

---

## Trade-offs Discussion

### Trade-off 1: Gorilla Chunks vs. Columnar Parquet

| Decision | Option A: Gorilla Chunks | Option B: Columnar Parquet | Recommendation |
|----------|--------------------------|---------------------------|----------------|
| | **Pros**: Append-friendly (O(1) per sample); 12x compression for regular data; low per-write overhead; proven in production (Prometheus, VictoriaMetrics) | **Pros**: Better analytical query performance (column pruning, predicate pushdown); 10-20x compression across data types; standard format (data lake ecosystem); better for wide tables (multi-field) | **Hybrid**: Gorilla for hot path (in-memory head block, fast append); Parquet for cold storage (better columnar scan, ecosystem compatibility, lower cost) |
| | **Cons**: Must decompress entire chunk to read any sample; poor for analytical queries; proprietary format; compression degrades for irregular data | **Cons**: Higher write overhead (batch-oriented); more complex encoding pipeline; requires Arrow-compatible infrastructure | InfluxDB 3.0 validates this hybrid approach |

### Trade-off 2: Pull vs. Push Ingestion

| Decision | Option A: Pull (Scrape) | Option B: Push (Agent) | Recommendation |
|----------|-------------------------|------------------------|----------------|
| | **Pros**: Natural service discovery; scrape failure = health signal; centralized control; regular timestamps (excellent compression) | **Pros**: Works across firewalls; supports ephemeral workloads; scales ingestion to agents; works for IoT/edge | **Hybrid**: Pull for long-lived services; Push for ephemeral jobs, IoT, cross-network sources. Align with data source lifecycle. |
| | **Cons**: Requires network reachability; struggles with short-lived processes; server does all the work | **Cons**: No built-in health signal; requires agent-side buffering; irregular timestamps degrade compression; push storms possible | |

### Trade-off 3: Monolithic vs. Disaggregated

| Decision | Option A: Monolithic | Option B: Disaggregated | Recommendation |
|----------|---------------------|-------------------------|----------------|
| | **Pros**: Simple deployment; low latency (all local); few moving parts; easy to operate | **Pros**: Independent scaling per component; object storage for unlimited retention; multi-tenancy; failure isolation | **Scale-dependent**: Monolithic for <50M series, single-tenant. Disaggregated for >50M series, multi-tenant, or cloud-native deployment. |
| | **Cons**: Single-node caps at ~20-50M series; no multi-tenancy; compaction contends with queries | **Cons**: Operational complexity; coordination service dependency; network latency between components | |

### Trade-off 4: In-Order-Only vs. Out-of-Order Acceptance

| Decision | Option A: Reject OOO | Option B: Accept OOO (with window) | Recommendation |
|----------|---------------------|------------------------------------|----------------|
| | **Pros**: Simpler storage engine; better compression (strictly ordered); less memory; faster compaction | **Pros**: Supports push-based agents with clock skew; handles network delays gracefully; enables batch backfill; no data loss from ordering | **Accept OOO** with bounded window (5-60 min). The real world produces out-of-order data. Early Prometheus's OOO rejection was its biggest user pain point. |
| | **Cons**: Data loss from late-arriving samples; incompatible with push architectures; poor fit for IoT/edge | **Cons**: Memory overhead for OOO buffer; compaction must merge OOO data; slightly worse compression for mixed blocks | |

### Trade-off 5: Pre-Aggregation (Recording Rules) vs. Query-Time Aggregation

| Decision | Option A: Pre-Aggregate | Option B: Query-Time Only | Recommendation |
|----------|------------------------|---------------------------|----------------|
| | **Pros**: Fast dashboard loads; predictable query performance; reduces fan-out | **Pros**: No maintenance overhead; always up-to-date; no storage overhead for pre-computed series; supports ad-hoc exploration | **Both**: Pre-aggregate known hot queries (dashboard panels queried by many users); query-time for ad-hoc and exploration. Recording rules are the TSDB equivalent of materialized views. |
| | **Cons**: Storage overhead; stale until next evaluation; must be maintained; doesn't help ad-hoc queries | **Cons**: Expensive for high-cardinality aggregations; unpredictable performance; dashboard load time depends on series count | |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just use a relational database with a timestamp column?" | Understand TSDB-specific optimizations | Acknowledge it works at small scale. Explain: (1) 12x compression via Gorilla vs. row-per-point in RDBMS; (2) time-partitioned blocks enable O(1) retention deletion vs. expensive DELETE queries; (3) inverted label index enables sub-second series resolution vs. B-tree on metric name; (4) append-only WAL is simpler than MVCC. At 1M samples/second, an RDBMS falls over. |
| "What happens when a developer adds `user_id` as a metric label?" | Test cardinality awareness | This is the cardinality explosion scenario. Explain the combinatorial growth (N users x existing label combinations). Describe the enforcement pipeline: per-metric cardinality cap at ingestion, series creation rate limiting, cardinality analysis dashboard. The fix is always to drop the unbounded label. Prevention is better than cure. |
| "How does your system handle a 3-hour network partition between ingesters?" | Test failure recovery understanding | Each ingester has a local WAL. During partition, ingesters continue accepting writes locally (AP choice). After partition heals: (1) replication catches up via WAL shipping; (2) query engine deduplicates overlapping samples from replicas; (3) compaction resolves any duplicate blocks. Data is safe as long as WAL is durable. |
| "Your compression ratio dropped from 12x to 3x. What happened?" | Test understanding of compression assumptions | Gorilla compression depends on data regularity. Possible causes: (1) Irregular scrape intervals (delta-of-delta is no longer zero); (2) Volatile values (random-walk gauges produce large XOR differences); (3) New event-driven push sources with irregular timestamps; (4) High-entropy values (hashes, UUIDs encoded as floats). Diagnosis: check `tsdb_chunk_compression_ratio` by metric; identify degraded series; separate irregular sources into a different storage tier. |
| "How do you query data across both raw and downsampled tiers?" | Test multi-resolution query understanding | Query engine selects the appropriate resolution tier based on time range and step. For a 30-day query at 1-hour step, it reads from the 1-hour downsampled tier. For a 1-hour query at 15-second step, it reads raw data. The boundary between tiers is transparent to the user. Edge case: the transition point where raw data ends and downsampled begins requires stitching, and the aggregation semantics must match (can't average an average). |
| "What if compaction gets stuck and blocks keep accumulating?" | Test operational maturity | Compaction backlog causes query degradation (more files to scan) but no data loss. Immediate mitigation: scale compactor workers. Diagnosis: check compaction duration histogram for slow jobs; check disk space for space-exhaustion failures. Long-term: separate compaction onto dedicated nodes; rate-limit concurrent jobs to prevent resource contention. |

---

## Common Mistakes to Avoid

1. **Designing a general-purpose database**: TSDBs make extreme trade-offs (append-only, no point updates, time-partitioned) that general-purpose databases don't. If your design looks like PostgreSQL with a timestamp column, you've missed the point.

2. **Ignoring cardinality**: Candidates who only discuss data volume (GB) without mentioning cardinality (series count) are missing the dominant scaling constraint. Cardinality determines memory usage, index size, and query fan-out.

3. **Treating compression as magic**: Saying "we compress the data" without explaining Gorilla encoding or its assumptions signals surface-level knowledge. The interviewer wants to hear about delta-of-delta timestamps and XOR float encoding, and when they degrade.

4. **Forgetting out-of-order data**: Designing a system that only accepts in-order samples ignores push-based architectures, distributed agents with clock skew, and batch backfill---all common in real-world deployments.

5. **Skipping the query path**: Candidates often spend all time on the write path. The read path (inverted index → series resolution → chunk scan → aggregation) is equally important and where the search-engine analogy provides powerful insight.

6. **Not discussing downsampling trade-offs**: Mentioning "we downsample old data" without explaining what's lost (spikes, baselines, duration information) and what's preserved (min/max/sum/count tuple) shows incomplete understanding.

7. **Over-engineering day 1**: Designing a fully disaggregated architecture with 12 microservices when the requirements suggest 5M series is over-engineering. Start simple (single-node TSDB) and explain when and why to disaggregate.

8. **Ignoring operational concerns**: Compaction tuning, retention enforcement, cardinality monitoring, and meta-monitoring are not afterthoughts---they are core to operating a TSDB at scale.

---

## Questions to Ask Interviewer

1. **Scale**: "What's the expected number of active time series? This determines whether we need a single-node or distributed architecture."
2. **Ingestion model**: "Is data primarily push-based (agents/IoT) or pull-based (scraping)? This affects compression assumptions and out-of-order handling."
3. **Query patterns**: "Are queries primarily real-time dashboards (recent data, narrow time range) or historical analysis (long time range, downsampled)?"
4. **Retention**: "How long must we retain data at full resolution vs. downsampled? This drives the storage tiering strategy."
5. **Multi-tenancy**: "Is this a single-tenant or multi-tenant system? Multi-tenancy adds cardinality enforcement, resource isolation, and cost attribution."
6. **Consistency**: "Is read-after-write consistency required, or is eventual consistency (within seconds) acceptable?"
7. **Data types**: "Are we storing only numeric time-series, or also histograms, strings, or multi-field records?"

---

## Scoring Rubric (Interviewer Reference)

| Level | Criteria |
|---|---|
| **Strong Hire** | Explains Gorilla compression (DoD + XOR) with bit-level detail; identifies cardinality as the dominant scaling constraint; describes inverted index with posting list intersection; discusses compaction pipeline with failure handling; proposes tiered retention with downsampling semantics (min/max/sum/count); addresses out-of-order ingestion; meta-monitoring awareness |
| **Hire** | Solid write path (WAL → head → blocks → object storage); understands compression at a high level; mentions cardinality as important; describes time-based partitioning benefits; discusses basic query path; identifies compaction as necessary; mentions retention policies |
| **Lean Hire** | Reasonable architecture but missing TSDB-specific optimizations; describes general database patterns; mentions compression without explaining how; aware of time-series characteristics but doesn't exploit them in design |
| **No Hire** | Designs a relational database with timestamp column; no awareness of compression algorithms; no discussion of cardinality; no time-based partitioning; ignores compaction entirely; treats it as a generic key-value store |
