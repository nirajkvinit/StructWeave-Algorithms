# Deep Dive & Bottlenecks — Data Warehouse

## Critical Component 1: Columnar Compression and Encoding Engine

### Why Is This Critical?

Compression is not merely a storage optimization — it is the mechanism that transforms a network-bound system into a CPU-bound one. In a separated compute/storage architecture, every byte of data must traverse the network from object storage to compute nodes. A 10:1 compression ratio means 10x less network transfer, 10x more effective cache capacity, and 10x less I/O wait. The encoding engine's ability to select optimal encodings per column directly determines query performance, storage cost, and network bandwidth consumption.

### How It Works Internally

The encoding engine analyzes each column's data characteristics during micro-partition creation and selects the optimal encoding:

```
Column Analysis Pipeline:

1. Sample first 10,000 values of each column
2. Compute statistics:
   - Cardinality (distinct count via HyperLogLog)
   - Sortedness (fraction of adjacent pairs in order)
   - Null fraction
   - Value range (min, max)
   - Average value length (for strings)
3. Select encoding based on decision tree:

   IF cardinality < 0.1 * row_count → DICTIONARY encoding
   ELSE IF sortedness > 0.9 → RLE + DELTA hybrid
   ELSE IF type == INTEGER AND (max - min) < 2^16 → BIT-PACKING
   ELSE IF type == TIMESTAMP → DELTA encoding (on epoch microseconds)
   ELSE → PLAIN encoding with Zstd compression
```

**Compression chain (applied in order):**

| Stage | Operation | Example |
|-------|-----------|---------|
| 1. Encoding | Dictionary, RLE, Delta, Bit-pack | "USA","USA","CAN" → [0, 0, 1] + dict{0:"USA", 1:"CAN"} |
| 2. Bit-packing | Pack encoded values into minimal bits | [0, 0, 1] with 1-bit → packed into 3 bits |
| 3. General compression | Zstd or LZ4 on encoded byte stream | Further 2-4x reduction on already-encoded data |

**Net result:** A column of country codes (200 distinct values across 100M rows) compresses from 800 MB (8 bytes per string avg) to ~2 MB (dictionary + 8-bit codes + Zstd). That is a 400:1 compression ratio.

### Failure Modes

1. **Dictionary overflow** — A column initially has low cardinality but grows beyond the dictionary size limit (e.g., free-text fields misclassified as low-cardinality).
   - **Mitigation:** Fall back to plain encoding mid-partition. Monitor dictionary cardinality growth across partitions and switch encoding proactively during re-clustering.

2. **Encoding skew across partitions** — Different partitions of the same column use different encodings (e.g., old partitions use dictionary, new ones use plain), causing inconsistent scan performance.
   - **Mitigation:** Automatic re-clustering service periodically re-encodes partitions with suboptimal encoding. Store encoding metadata in the partition footer so the scan engine adapts per partition.

3. **Decompression CPU bottleneck** — With high compression ratios, the compute node may spend more time decompressing than scanning, shifting the bottleneck from I/O to CPU.
   - **Mitigation:** Use lightweight compression (LZ4 over Zstd) for hot partitions. Vectorized decompression using SIMD instructions. Skip decompression entirely for predicate evaluation on dictionary-encoded columns (compare against dictionary codes, not raw values).

---

## Critical Component 2: Query Execution Engine (Vectorized vs. Volcano)

### Why Is This Critical?

The execution engine determines how efficiently CPU cores process the data after it has been read from storage. The traditional Volcano (iterator) model processes data one row at a time, incurring function-call overhead for every row at every operator. Vectorized execution processes data in columnar batches of 1,000-4,000 values, amortizing function-call overhead and enabling CPU-cache-friendly access patterns and SIMD parallelism.

### How It Works Internally

**Volcano Model (traditional):**

```
FOR EACH row from child operator:
    apply operator logic to single row
    emit row to parent operator

Cost per row: ~10 virtual function calls + branch mispredictions
At 1 billion rows: 10 billion function calls → ~5 seconds of overhead alone
```

**Vectorized Model (modern):**

```
FOR EACH batch (1024 rows) from child operator:
    apply operator logic to entire column batch at once
    emit batch to parent operator

Cost per batch: 1 function call + tight loop over 1024 values
At 1 billion rows: ~1 million function calls → ~0.5ms of overhead
```

**Performance comparison:**

| Metric | Volcano (row-at-a-time) | Vectorized (batch) | Improvement |
|--------|------------------------|--------------------|-------------|
| Function calls per 1B rows | 10B | 1M | 10,000x |
| L1 cache hit rate | ~60% (random access) | ~95% (sequential) | 1.6x |
| SIMD utilization | None | Full (AVX-512) | 8-16x per operation |
| Branch predictions | Poor (data-dependent) | Excellent (tight loops) | 2-3x |
| Overall scan throughput | 100 MB/s per core | 2 GB/s per core | 20x |

**Pipeline breakers:** Certain operations (hash table builds, sorts, window function evaluations) require materializing intermediate results. The execution engine inserts pipeline breakers at these points, buffering data in memory or spilling to local disk.

### Failure Modes

1. **Memory exhaustion from pipeline breakers** — A large hash join builds a hash table that exceeds available memory.
   - **Mitigation:** Graceful spill-to-disk: partition the hash table into memory-sized chunks, spill overflow to local SSD, and probe in passes. Monitor spill ratio as a key performance metric.

2. **Skewed parallelism** — One compute node processes a disproportionately large partition (data skew), becoming the bottleneck while other nodes idle.
   - **Mitigation:** Dynamic work stealing: idle nodes request work from busy nodes. Sub-partition large partitions into smaller units distributed across nodes.

3. **Query compilation latency** — Complex queries with many joins take hundreds of milliseconds to compile into vectorized execution plans.
   - **Mitigation:** Plan caching keyed by parameterized query signature. Warm caches for known dashboard queries during warehouse startup.

---

## Critical Component 3: Micro-Partition Pruning and Zone Maps

### Why Is This Critical?

Partition pruning is the single most impactful optimization in a data warehouse. A query against a 10 TB table that prunes 98% of partitions scans only 200 GB — a 50x reduction in I/O, network transfer, and compute cost. Zone maps (per-partition min/max statistics) enable this pruning without any additional storage overhead beyond the partition footer metadata.

### How It Works Internally

```
Zone Map Pruning Decision Flow:

Query: SELECT * FROM sales WHERE sale_date = '2024-06-15' AND region = 'EU'

Partition 0001: sale_date [2024-01-01, 2024-01-31], region ['AP', 'NA']
  → PRUNED (date outside range AND region outside range)

Partition 0042: sale_date [2024-06-01, 2024-06-30], region ['EU', 'NA']
  → CANDIDATE (date range includes target, region range includes target)

Partition 0043: sale_date [2024-06-01, 2024-06-30], region ['AP', 'AP']
  → PRUNED (region outside range even though date matches)
```

**Clustering depth metric:** Measures the average overlap of micro-partitions for a given column. A clustering depth of 1.0 means each value range appears in exactly one partition (perfect pruning). A depth of 50 means each value range spans 50 partitions (poor pruning).

**Pruning effectiveness by scenario:**

| Scenario | Clustering Depth | Partitions Scanned | Pruning Rate |
|----------|-----------------|-------------------|--------------|
| Query on clustering key with good clustering | 1-2 | 2 of 10,000 | 99.98% |
| Query on clustering key with moderate clustering | 10-20 | 20 of 10,000 | 99.8% |
| Query on non-clustered column | 5,000-10,000 | ~5,000 of 10,000 | 50% |
| Query with no filterable predicates | N/A | 10,000 of 10,000 | 0% |

### Failure Modes

1. **Clustering degradation over time** — As new data is loaded, micro-partitions accumulate with overlapping value ranges, reducing pruning effectiveness.
   - **Mitigation:** Automatic re-clustering service monitors clustering depth and merges/re-sorts partitions when depth exceeds a threshold. Prioritize re-clustering for tables with frequent filtered queries.

2. **Zone map ineffectiveness for high-cardinality columns** — A column with unique values (e.g., user_id) has zone maps where min/max ranges overlap heavily across all partitions.
   - **Mitigation:** Use Bloom filters for high-cardinality equality predicates. Bloom filters add ~1% storage overhead but enable pruning for columns where zone maps cannot.

3. **Predicate on computed expressions** — A query like `WHERE EXTRACT(MONTH FROM sale_date) = 6` cannot use zone maps because the predicate is on a function of the column, not the column itself.
   - **Mitigation:** The query optimizer rewrites function-based predicates into range predicates where possible (e.g., `MONTH(sale_date) = 6` → `sale_date >= '2024-06-01' AND sale_date < '2024-07-01'`). Alternatively, define a virtual clustering key on the expression.

---

## Concurrency & Race Conditions

### Race Condition 1: Concurrent Reads During Data Loading

**Scenario:** A bulk load is creating new micro-partitions while concurrent queries scan the same table.

**Resolution:** Snapshot isolation via metadata versioning. Each query sees a consistent snapshot of the metadata catalog at query start time. New partitions become visible only after the load transaction commits an atomic metadata pointer swap. In-flight queries continue reading the old partition set.

### Race Condition 2: Concurrent Materialized View Refresh and Query

**Scenario:** A materialized view refresh is writing new partitions while a query reads the view.

**Resolution:** Double-buffering: the refresh writes new partitions under a new version ID. When refresh completes, an atomic metadata update swaps the current version pointer. Queries in flight continue reading the old version; new queries see the refreshed version.

### Race Condition 3: Time Travel Snapshot vs. Partition Garbage Collection

**Scenario:** A time travel query requests data as of 48 hours ago, but partition garbage collection has already deleted old partitions beyond the retention window.

**Resolution:** Time travel retention policy is enforced at the garbage collection level. The GC process checks all active time travel retention windows before deleting any partition. Partitions are deleted only when they are outside ALL active retention windows.

### Locking Strategy

| Operation | Lock Type | Granularity | Notes |
|-----------|-----------|-------------|-------|
| SELECT query | None (snapshot isolation) | Table-level snapshot | Reads never block writes |
| INSERT / COPY | Table-level metadata lock | Metadata catalog entry | Short-duration lock during commit |
| UPDATE / DELETE | Partition-level write lock | Affected partitions | Copy-on-write creates new partitions |
| DDL (ALTER TABLE) | Schema-level exclusive lock | Table schema | Blocks concurrent DDL on same table |
| Materialized view refresh | View-level write lock | View metadata | Concurrent reads continue on old version |

---

## Bottleneck Analysis

### Bottleneck 1: Network Bandwidth Between Compute and Storage

**Problem:** In a separated architecture, every un-cached data access requires a network fetch from object storage. A single compute node scanning 1 TB of data at 10 Gbps takes 800 seconds — far exceeding query latency targets.

**Impact:** Queries on cold data (not in local cache) are 10-50x slower than queries on cached data.

**Mitigation:**
- Columnar storage with compression reduces data transfer by 10x (1 TB raw → 100 GB on wire)
- Column pruning skips irrelevant columns (query touches 3 of 50 columns → 94% reduction)
- Partition pruning skips irrelevant partitions (WHERE clause eliminates 95%+)
- Local SSD cache stores frequently accessed partitions (cache hit ratio target > 80%)
- Prefetching: read-ahead of adjacent partitions while processing current batch
- Net effect: 1 TB raw → 100 GB compressed → 6 GB after column pruning → 300 MB after partition pruning → served from SSD cache in most cases

### Bottleneck 2: Spill-to-Disk During Large Joins and Sorts

**Problem:** Hash joins and ORDER BY operations that exceed available memory must spill intermediate results to local disk, dramatically increasing query latency.

**Impact:** A query that fits in memory completes in 5 seconds; the same query with spill may take 60 seconds due to disk I/O overhead.

**Mitigation:**
- Right-size compute warehouses: larger warehouses have more memory per node
- Partial aggregation before joins reduces intermediate result sizes
- Bloom filter pre-filtering: build a Bloom filter on the smaller join side and filter the larger side before building the hash table
- Monitor spill-to-disk ratio as a key metric; alert when spill exceeds 10% of total data processed

### Bottleneck 3: Metadata Service Hot Path

**Problem:** Every query consults the metadata service for table schemas, zone maps, and access control policies. At 50+ concurrent queries per second, the metadata service becomes a bottleneck.

**Impact:** Metadata lookups add 50-200ms to query compilation time; under contention, this grows to seconds.

**Mitigation:**
- Aggressive metadata caching in the cloud services layer (most metadata changes infrequently)
- Read replicas of the metadata store for read-heavy workload
- Batch metadata lookups: a single query touching 5 tables fetches all schemas in one round trip
- Partition statistics are cached and invalidated only on data change events
