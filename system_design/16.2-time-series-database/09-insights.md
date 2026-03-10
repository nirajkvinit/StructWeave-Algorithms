# Insights --- Time-Series Database

## Insight 1: Time-Based Partitioning Is the Single Architectural Decision That Makes Every Core Operation Cheap

**Category:** Partitioning

**One-liner:** By partitioning data into immutable, time-bounded blocks (2h, 6h, 24h), the TSDB transforms the most common operations---append recent data, query recent data, and delete old data---into the cheapest possible operations, at the cost of making point deletes and out-of-order inserts expensive.

**Why it matters:** In a key-value store or relational database, the primary partitioning axis is the key hash or primary key range. Deletion of expired data requires scanning and removing individual rows, which is O(N) in the number of rows to delete. In a TSDB, time-based partitioning means retention enforcement is O(1): drop the entire block file for any block whose max_time is older than the retention threshold. No scanning, no tombstones, no compaction---just a file delete. Similarly, queries with time-range filters can prune entire blocks without reading them (check min/max timestamp in block metadata). And because recent data is always in the head block (in-memory), the most common query pattern---"what happened in the last 15 minutes?"---hits the fastest storage tier automatically. This partitioning choice is what makes TSDBs fundamentally different from general-purpose databases: it is an extreme bet on temporal locality that fails for random-access workloads but delivers extraordinary efficiency for time-ordered append-and-query patterns. The trade-off is that point deletes (GDPR erasure of a specific series) require expensive tombstone marking followed by compaction to physically remove the data, and out-of-order inserts require a separate buffer and merge path because the primary data structure is append-only within each time partition.

---

## Insight 2: Gorilla Compression Is a Bet on Data Regularity That Fails Gracefully but Expensively

**Category:** Data Structures

**One-liner:** Delta-of-delta achieves 64x timestamp compression and XOR achieves 12x value compression because metric data is regular---but when these assumptions break (event-driven push, volatile gauges, hash-like values), compression degrades from 12x to 2-3x, tripling storage costs without any system error or warning.

**Why it matters:** Gorilla compression is frequently cited as achieving 1.37 bytes per data point (12x vs. 16 bytes uncompressed), but this ratio is conditional on two assumptions: (1) timestamps arrive at fixed intervals (making delta-of-delta zero for 96% of samples), and (2) consecutive values are similar (making XOR produce few significant bits for 51% of samples). These assumptions hold for pull-based monitoring with fixed scrape intervals and slowly-changing counters, but they degrade silently for push-based event metrics (irregular timestamps make DoD non-zero, costing 7-32 bits instead of 1), volatile gauges (large XOR differences, costing 27-37 bits instead of 1), and high-entropy values like hashes (XOR is essentially random, compressing to ~64 bits---worse than uncompressed). The critical operational insight is that compression degradation produces no error, no alert, and no visible failure---just higher storage costs that accumulate over weeks. A TSDB operator who assumes uniform 12x compression for capacity planning will dramatically underestimate storage for heterogeneous workloads. The architectural response is to monitor compression ratio per metric type and separate high-regularity metrics (infrastructure, counters) from low-regularity metrics (events, volatile gauges) into different storage paths with different compression strategies and cost models.

---

## Insight 3: The Inverted Index Is a Search Engine, Not a Database Index---and This Changes the Scaling Model

**Category:** Data Structures

**One-liner:** TSDB label resolution via posting list intersection is architecturally identical to how search engines resolve keyword queries, and the index must fit in memory for acceptable latency---making index size (not data volume) the binding constraint that determines the maximum series capacity per node.

**Why it matters:** A TSDB query like `cpu_usage{region="us-east", service=~"api.*"}` is resolved by looking up the posting list for each label matcher and intersecting them---exactly how Lucene resolves keyword queries via term posting lists. This architectural equivalence has profound implications. First, optimization techniques from information retrieval---Roaring bitmaps for posting list compression, skip pointers for faster intersection, starting intersection with the smallest posting list---directly apply to TSDB query optimization. Second, the critical performance constraint is not data volume (bytes stored) but index size (number of unique series and their label combinations). At 25M active series with 8 labels each, the index consumes ~20 GB of RAM. At 100M series, it requires ~80 GB, which exceeds typical node memory and forces index sharding. The index determines the architectural transition point from single-node to distributed deployment. Third, regex matchers (like `service=~"api.*"`) require scanning all values for a label name, making them analogous to wildcard queries in search engines---known to be expensive. Production TSDBs cache compiled regex results and encourage exact matchers for performance-critical queries.

---

## Insight 4: Out-of-Order Ingestion Is Not an Edge Case---It Is the Default for Push-Based Architectures

**Category:** Consistency

**One-liner:** Rejecting out-of-order samples (as early Prometheus did) works for single-scraper pull architectures but breaks entirely for distributed push-based systems where network delays, clock skew, and batch retries make out-of-order arrival the norm rather than the exception.

**Why it matters:** The original Prometheus TSDB design assumed a single scraper pulling metrics at regular intervals from targets it discovers---guaranteeing in-order timestamps within each series. When the ecosystem shifted toward push-based ingestion (OpenTelemetry, distributed agents, IoT gateways), out-of-order samples became ubiquitous. A batch of samples from Agent A (clock ahead by 2 seconds) arrives at 10:00:02 with timestamps up to 10:00:02, followed by a batch from Agent B (clock behind by 1 second) with timestamps up to 09:59:59. If the TSDB rejects Agent B's samples as "out of order," data is permanently lost. The architectural response is a separate out-of-order head block that accepts samples within a configurable time window (5-60 minutes), buffers them in a sorted tree (not append-only), and merges them into the main timeline during compaction. This adds memory overhead (OOO buffer per series), compaction complexity (merge-sort with deduplication), and slightly degrades compression (mixed-order samples within blocks compress less well). But the alternative---silent data loss---is worse. The key design decision is the size of the OOO window: too small and legitimate late data is lost; too large and memory consumption grows unboundedly.

---

## Insight 5: Downsampling Must Store Four Aggregations Per Interval Because No Single Aggregation Preserves the Original Signal

**Category:** Cost Optimization

**One-liner:** Averaging loses spikes, max preserves spikes but loses baselines, min loses peaks, and count loses magnitude---so a downsampled interval must store (min, max, sum, count) to support any aggregation function at query time, quadrupling storage cost but still 25x cheaper than full resolution.

**Why it matters:** Downsampling from 15-second to 5-minute resolution provides a 20x reduction in data points. The naive approach is to average values within each 5-minute window. But averaging is lossy in a specific and dangerous way: a 10-second CPU spike to 100% (which caused a service restart) becomes a gentle uptick to 70% when averaged over a 5-minute window. An operator reviewing the downsampled data would never notice the spike. Taking the max preserves the spike (100%) but loses duration information (was it 1 second or 4 minutes 59 seconds?) and destroys the baseline (what was "normal"?). Taking the min preserves the baseline but hides the anomaly entirely. No single aggregation function preserves all dimensions of the original signal. The production solution is to store a tuple of (min, max, sum, count) for each downsampled interval. This enables reconstructing any aggregation at query time: avg = sum/count, min and max are stored directly, rate = sum/time. The storage cost is 4x a single aggregation but still 5x cheaper than full resolution (20x point reduction / 4x aggregation overhead = 5x net savings). The critical subtlety is that downsampling must be **type-aware**: counters should be downsampled by rate of increase (sum of deltas per interval), not by averaging counter values (which produces meaningless results because counters are monotonic).

---

## Insight 6: The Head Block Double-Buffer Swap Eliminates Write-Path Locks at the Cost of Temporary Memory Duplication

**Category:** Contention

**One-liner:** To flush the head block to disk without blocking incoming writes, the TSDB uses a double-buffer technique: atomically swap the current head pointer to a new empty head, then flush the old head at leisure---trading 2x peak memory for zero write-path contention.

**Why it matters:** The head block is the hottest data structure in the TSDB: every incoming sample is appended to a series' chunk in the head block. Flushing the head block to disk (creating an immutable block) requires iterating all series and their chunks---a process that takes seconds to minutes for millions of series. If the flush holds a lock on the head block during this time, write latency spikes catastrophically. The double-buffer technique solves this by creating a new, empty head block and atomically swapping the head pointer. New writes immediately flow to the new head block with zero contention. The flusher reads the old head block without any concurrent writers (it's no longer the current head), converts it to an immutable disk block, and releases the memory. The trade-off is transient memory duplication: during the flush window, both the old head (being flushed) and the new head (accepting writes) exist in memory. At 25M series, the old head consumes ~37 GB and the new head starts near zero but grows---peak memory during flush approaches 2x steady state. This pattern is common in high-throughput systems (RCU in the Linux kernel uses a similar principle): trade memory for lock elimination on the critical path.

---

## Insight 7: Compaction Is Not Just Optimization---It Is the Mechanism That Resolves Out-of-Order Data, Enforces Deletions, and Bounds Query Complexity

**Category:** System Modeling

**One-liner:** While compaction appears to be a background optimization (merge small blocks into large ones for better read performance), it is actually the only mechanism that physically applies tombstone deletions, merges out-of-order data into the correct timeline, and prevents unbounded growth in the number of files the query engine must scan.

**Why it matters:** In most database systems, compaction is an optimization that improves read performance by reducing file count and eliminating deleted entries. In a TSDB, compaction serves three roles that are not optional: (1) **Deletion enforcement**: When a user requests series deletion (GDPR erasure, cardinality cleanup), the system writes a tombstone marker. Tombstoned data is only physically removed during compaction. Without compaction, deleted data remains on disk and continues to consume storage. (2) **Out-of-order resolution**: Samples that arrived out of order are stored in a separate OOO block. Compaction merge-sorts these with the main blocks, producing correctly-ordered, deduplicated blocks. Without compaction, the query engine must perform this merge at query time for every query. (3) **Query complexity bounding**: Each query must open, read indexes for, and scan chunks from every block that overlaps the query time range. Without compaction, block count grows linearly with time, making queries progressively slower. Compaction bounds the maximum number of blocks per time range to O(log T) instead of O(T). The implication is that compaction health is not a performance metric---it is a correctness and durability metric. A compaction backlog means tombstoned data is not being deleted, OOO data is not being resolved, and query performance is degrading. Compaction monitoring should be treated with the same urgency as ingestion monitoring.

---

## Insight 8: Cardinality Is an Adversarial Scaling Problem Because It Grows Combinatorially, Not Linearly

**Category:** Scaling

**One-liner:** A single developer adding one unbounded label (user_id) to a metric with 5 existing labels can multiply total series count from 100K to 100B overnight---a combinatorial explosion that no auto-scaling system can absorb because it happens at the index level (memory), not the data level (disk).

**Why it matters:** Most distributed systems scale along predictable axes: more users → more requests → more storage. Growth is linear and forecastable. TSDB cardinality breaks this model because it grows as the Cartesian product of label dimensions. A metric with labels {method: 4 values, endpoint: 50, status: 5, region: 4} produces 4x50x5x4 = 4,000 series. Adding a label {pod: 1,000 values} produces 4,000,000 series. Adding {user_id: 1,000,000 values} produces 4,000,000,000 series. This is not gradual growth---it is a cliff. The memory impact is immediate (each series requires ~320 bytes for index + head chunk) and cannot be mitigated by adding disk storage---the index must fit in RAM. Auto-scaling cannot help because provisioning 1.28 TB of RAM in response to a label change is not operationally feasible. The fix is always the same: drop the unbounded label. The architectural lesson is that cardinality enforcement must be a **proactive admission control system** (reject new series above threshold) rather than a reactive scaling system (add capacity when memory grows). The ingestion pipeline must include a cardinality firewall---analogous to a network firewall---that prevents unbounded series creation before it reaches the storage engine.

---

## Insight 9: The Columnar Revolution in TSDBs Is Not About Compression---It Is About Decoupling the Write Format from the Read Format

**Category:** Architecture

**One-liner:** InfluxDB 3.0's shift from custom TSM format to Apache Arrow (in-memory) + Parquet (on-disk) is not primarily a compression improvement---it is an architectural decision to decouple the write-optimized format (row-oriented WAL append) from the read-optimized format (columnar scan with predicate pushdown), enabling each to be independently optimized.

**Why it matters:** Traditional TSDBs use a single format for both writing and reading---Gorilla-encoded chunks are appended to during ingestion and scanned during queries. This coupling forces a compromise: the format must be reasonably efficient for both paths but optimal for neither. InfluxDB 3.0's architecture breaks this coupling by using three distinct formats: (1) WAL entries in a row-oriented append-optimized format (fast writes, crash recovery); (2) in-memory data in Apache Arrow columnar format (vectorized query execution, SIMD-accelerated aggregation, zero-copy sharing between query engine threads); (3) persistent storage in Parquet files on object storage (columnar compression, predicate pushdown, column pruning, ecosystem interoperability with data lake tools). The write path optimizes for append throughput; the read path optimizes for analytical query performance; and the background conversion process (WAL → Arrow → Parquet) runs asynchronously without blocking either path. This decoupling enables each layer to evolve independently: the write format can be optimized for lower latency without affecting query performance, and the read format can be optimized for better compression without affecting ingestion throughput. The broader architectural insight is that in systems with asymmetric read/write patterns (and TSDBs have 100:1 write-to-read ratios), decoupling the formats is often superior to compromising on a single format.

---

## Insight 10: The WAL Is Not Just a Crash Recovery Mechanism---Its Operational Characteristics Directly Determine Recovery Time, Replication Lag, and Write Latency Distribution

**Category:** Resilience

**One-liner:** WAL segment size, checkpoint frequency, and replay parallelism are not implementation details---they directly determine ingester unavailability after a crash (30 seconds with frequent checkpoints vs. 5 minutes without), replication lag (WAL shipping latency), and write latency tail (periodic fsync introduces p99 spikes).

**Why it matters:** In most database architectures, the WAL is an abstraction hidden behind the storage engine interface. In a TSDB, the WAL's operational characteristics are directly visible to operators and users. WAL replay time equals ingester downtime after a crash: a 2-hour head block window at 1.67M samples/second generates 12B samples in the WAL (~190 GB uncompressed). Full replay requires deserializing every sample and reconstructing the in-memory head block---a process that takes 3-5 minutes. WAL checkpointing (writing a snapshot of the head block state) reduces replay to only the delta since the last checkpoint (typically 5-30 seconds of data), cutting recovery time to 10-30 seconds. But checkpointing itself introduces a write latency spike: the head block must be briefly frozen to write a consistent snapshot, causing ingestion to queue during the checkpoint. The trade-off between frequent checkpoints (faster recovery, more latency spikes) and infrequent checkpoints (slower recovery, smoother writes) is a parameter that directly affects both reliability SLOs and write latency SLOs. Furthermore, the WAL is the foundation of replication: ingester replicas are created by shipping and replaying WAL segments. WAL segment format, compression, and shipping latency therefore determine replication lag---which determines RPO for ingester failures. A WAL design that produces large, infrequently-rotated segments has lower write overhead but higher replication lag (and thus higher RPO) than one with small, frequently-rotated segments.
