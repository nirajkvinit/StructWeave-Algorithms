# Deep Dive & Bottlenecks

[← Back to Index](./00-index.md)

---

## Critical Component 1: HNSW Index Construction & Tuning

### Why This Is Critical

HNSW is the most common index type for vector databases due to its excellent balance of search speed and recall. However, misconfigured parameters can lead to:
- **Poor recall**: Missing relevant results (bad user experience)
- **Slow queries**: Latency SLO violations
- **Memory explosion**: OOM crashes
- **Slow index builds**: Hours instead of minutes

### The Parameter Trilemma

```
                         RECALL
                           ▲
                          /│\
                         / │ \
                        /  │  \
                       /   │   \
                      /  SWEET │ \
                     /    SPOT  \  \
                    / ┌─────────┐ \
                   /  │ M=16    │  \
                  /   │ ef=100  │   \
                 /    └─────────┘    \
                /                      \
               ▼──────────────────────▶
            MEMORY                    SPEED
```

### Parameter Deep Dive

#### M (Maximum Connections)

```
M determines the graph connectivity:
─────────────────────────────────────────────────────────

M=4:  Sparse graph
      • Fast search (fewer neighbors to evaluate)
      • Lower memory
      • Lower recall (can miss nearest neighbors)
      • Best for: Low-dimensional vectors (<100 dims)

M=16: Balanced (default)
      • Good trade-off for most use cases
      • ~40 edges per node average (across layers)
      • Best for: 128-768 dimensions

M=32: Dense graph
      • Better recall
      • Slower search
      • 2x memory vs M=16
      • Best for: High-dimensional (>1024) or high-recall requirements

M=64: Very dense
      • Diminishing returns on recall
      • Significant memory overhead
      • Best for: Critical applications where recall >99% required

Memory formula:
  Graph memory ≈ n × M × 2 × avg_layers × sizeof(int)
              ≈ n × 16 × 2 × 1.5 × 4 bytes
              ≈ 192 bytes per vector (M=16)
```

#### ef_construction (Build-Time Quality)

```
Higher ef_construction = better index quality, slower build
─────────────────────────────────────────────────────────

ef_construction=64:
  • Fast build (~2 min for 1M vectors)
  • Acceptable quality
  • May have suboptimal connections

ef_construction=200: (default)
  • Balanced build time (~8 min for 1M vectors)
  • Good quality for production

ef_construction=400:
  • Slow build (~20 min for 1M vectors)
  • Marginal quality improvement
  • Useful when index is built once, queried millions of times

Rule of thumb: ef_construction should be at least 2 × M
```

#### ef_search (Query-Time Recall/Speed Trade-off)

```
ef_search controls the search quality at query time:
─────────────────────────────────────────────────────────

ef_search=10:   ~80% recall, ~1ms latency
ef_search=50:   ~93% recall, ~3ms latency
ef_search=100:  ~96% recall, ~5ms latency
ef_search=200:  ~98% recall, ~10ms latency
ef_search=500:  ~99% recall, ~25ms latency

Critical constraint: ef_search >= k (top-k results)

Trade-off visualization:

Recall
100% ─────────────────────────────────●─
 98% ─────────────────────●───────────
 96% ────────────●────────
 93% ─────●──────
 80% ●────
     └────┼────┼────┼────┼────┼────────► Latency
          1ms  3ms  5ms  10ms 25ms
```

### Memory Layout Optimization

```
Optimal memory layout for cache efficiency:
─────────────────────────────────────────────────────────

Poor layout (random access):
┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐
│ Vec 0 │   │Graph 0│   │ Vec 1 │   │Graph 1│  ...
└───────┘   └───────┘   └───────┘   └───────┘
    ↑           ↑
    Cache miss every access (vectors and graph interleaved)

Optimal layout (contiguous):
┌───────────────────────────────────────────────┐
│   Vectors (contiguous float array)             │
│   [V0][V1][V2][V3]...[Vn]                      │
└───────────────────────────────────────────────┘
┌───────────────────────────────────────────────┐
│   Graph (contiguous neighbor arrays)           │
│   [N0][N1][N2]...[Nn]                          │
└───────────────────────────────────────────────┘

Benefits:
  • Sequential memory access for vectors
  • Better cache prefetching
  • ~30% faster search in practice
```

### Failure Modes

| Failure | Symptom | Root Cause | Solution |
|---------|---------|------------|----------|
| OOM during build | Process killed | Too many vectors for RAM | Reduce M, use disk-based index |
| Low recall | Missing relevant results | ef_search too low | Increase ef_search |
| Slow queries | High p99 latency | ef_search too high | Reduce ef_search, add shards |
| Index corruption | Search returns wrong results | Crash during build | Rebuild from WAL |

---

## Critical Component 2: Filtered Vector Search

### Why This Is Critical

Most real-world queries include metadata filters (e.g., "find similar products where category='electronics' AND price<500"). Naive approaches either:
- **Miss results**: Pre-filtering may exclude nearby vectors
- **Are slow**: Post-filtering wastes compute on irrelevant vectors

### The Filtering Challenge

```
Query: Find 10 nearest neighbors where category = "electronics"

Dataset: 10M vectors, 100 categories (100K electronics)

Pre-filter approach:
─────────────────────────────────────────────────────────
1. Filter to 100K electronics vectors
2. Build/search separate index for filtered set

Problem: Need 100 different indexes for 100 categories!
         Or rebuild index per query (very slow)


Post-filter approach:
─────────────────────────────────────────────────────────
1. Search all 10M vectors for top-1000
2. Filter to electronics
3. Return top-10 from filtered set

Problem: If electronics is only 1% of data,
         need to retrieve 1000 candidates to find 10 matches!
         With 0.1% filter selectivity, need 10,000 candidates.


In-filter approach (ACORN):
─────────────────────────────────────────────────────────
1. Modify HNSW traversal to skip non-matching nodes
2. Continue search until k matching results found

Best of both worlds: Fast and complete results
```

### ACORN Algorithm (Adaptive Constraints on Retrieval in HNSW)

```
FUNCTION acorn_search(query, k, ef, filter_predicate):
    INPUT:
        query: query vector
        k: number of filtered results needed
        ef: base candidate list size
        filter_predicate: function(metadata) -> bool

    // Adaptive ef based on filter selectivity
    estimated_selectivity = estimate_filter_selectivity(filter_predicate)
    adjusted_ef = ef / estimated_selectivity  // e.g., ef=100, 10% selective -> 1000

    // Cap at reasonable maximum
    adjusted_ef = min(adjusted_ef, 10 × ef)

    candidates = MinHeap()
    filtered_results = MaxHeap(size=k)
    visited = Set()

    entry_point = get_entry_point()
    candidates.insert(entry_point, compute_distance(query, entry_point))

    WHILE candidates is not empty AND filtered_results.size() < k:
        current = candidates.pop_min()

        IF current IN visited:
            CONTINUE
        visited.add(current)

        // Check filter BEFORE expensive distance computations
        IF filter_predicate(current.metadata):
            distance = compute_distance(query, current.vector)

            IF filtered_results.size() < k OR distance < filtered_results.peek_max():
                filtered_results.push(current, distance)
                IF filtered_results.size() > k:
                    filtered_results.pop_max()

        // Always explore neighbors (even if current doesn't match filter)
        // This is key: don't stop at non-matching nodes
        FOR neighbor IN get_neighbors(current):
            IF neighbor NOT IN visited:
                // Use distance approximation for priority
                approx_dist = compute_distance(query, neighbor.vector)
                candidates.insert(neighbor, approx_dist)

    RETURN filtered_results

Key insight: Continue exploring through non-matching nodes to reach
             matching nodes on the other side of the graph.
```

### Selectivity Estimation

```
FUNCTION estimate_filter_selectivity(filter_predicate):
    // Option 1: Exact count (slow, accurate)
    IF has_metadata_index(filter_predicate.field):
        matching_count = metadata_index.count(filter_predicate)
        RETURN matching_count / total_vectors

    // Option 2: Sampling (fast, approximate)
    sample_size = 1000
    matches = 0
    FOR i IN 0..sample_size:
        random_vector = get_random_vector()
        IF filter_predicate(random_vector.metadata):
            matches += 1

    RETURN matches / sample_size

    // Option 3: Statistics (fastest, requires precomputation)
    // Maintain histograms/cardinality estimates per field
    RETURN precomputed_stats[filter_predicate.field][filter_predicate.value]
```

### Metadata Index Integration

```
┌─────────────────────────────────────────────────────────────┐
│              Hybrid Index Structure                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   Vector Index      │    │     Metadata Indexes        │ │
│  │   (HNSW)            │    │                             │ │
│  │                     │    │  category_idx (B-tree)      │ │
│  │   [Graph structure] │    │    "electronics" → [1,5,9]  │ │
│  │                     │    │    "clothing" → [2,3,7]     │ │
│  │                     │    │                             │ │
│  │                     │    │  price_idx (B-tree)         │ │
│  │                     │    │    [0-100] → [2,7]          │ │
│  │                     │    │    [100-500] → [1,3,5]      │ │
│  │                     │    │                             │ │
│  │                     │    │  timestamp_idx (LSM)        │ │
│  │                     │    │    sorted by time           │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│           │                             │                    │
│           └────────────┬────────────────┘                    │
│                        │                                     │
│                        ▼                                     │
│              ┌───────────────────┐                           │
│              │  Query Execution  │                           │
│              │  (filter-aware)   │                           │
│              └───────────────────┘                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Query execution strategy:

High selectivity (>50% match):
  → Use vector search with in-filter

Medium selectivity (5-50% match):
  → Use ACORN algorithm

Low selectivity (<5% match):
  → Pre-filter using metadata index, then vector search on filtered set

Very low selectivity (<0.1% match):
  → Brute force on metadata-filtered set (small enough)
```

---

## Critical Component 3: Real-Time Indexing

### Why This Is Critical

Users expect newly inserted vectors to be searchable immediately, but:
- HNSW is optimized for static graphs
- Index updates are expensive
- Consistency between replicas is challenging

### The Real-Time Challenge

```
Timeline of a vector insertion:
─────────────────────────────────────────────────────────

t=0ms     Client sends upsert request
t=5ms     Write to WAL (durability)
t=10ms    Acknowledge to client ← Client happy!
          ...
t=100ms   Batch accumulated
t=500ms   Background indexing starts
t=800ms   Vector added to HNSW graph ← Now searchable!

Problem: 800ms gap where vector exists but isn't searchable
```

### L0 Buffer Architecture (Pinecone's Approach)

```
┌─────────────────────────────────────────────────────────────┐
│              L0 Buffer + Static Index                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Query arrives                                               │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Query Router                         ││
│  └────────────────────────┬────────────────────────────────┘│
│                           │                                  │
│           ┌───────────────┴───────────────┐                 │
│           ▼                               ▼                  │
│  ┌─────────────────┐            ┌─────────────────────────┐ │
│  │   L0 Buffer     │            │    Static HNSW Index    │ │
│  │ (recent writes) │            │    (bulk of data)       │ │
│  │                 │            │                         │ │
│  │ - Brute force   │            │ - HNSW O(log n)         │ │
│  │ - Small (10K)   │            │ - Large (100M)          │ │
│  │ - Immediate     │            │ - Background indexed    │ │
│  └────────┬────────┘            └────────────┬────────────┘ │
│           │                                   │              │
│           └───────────────┬───────────────────┘              │
│                           ▼                                  │
│                    Merge Results                             │
│                    (re-rank top-k)                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Performance:
  L0 brute force (10K vectors): ~1ms
  Static HNSW (100M vectors): ~5ms
  Merge: <1ms
  Total: ~7ms (acceptable overhead)
```

### Background Merge Strategy

```
FUNCTION background_merge_loop():
    WHILE true:
        SLEEP(merge_interval)  // e.g., 60 seconds

        IF l0_buffer.size() > threshold:  // e.g., 50K vectors
            // Create new static segment
            new_segment = build_hnsw_index(l0_buffer.vectors)

            // Atomic swap
            LOCK(index_lock):
                segments.append(new_segment)
                l0_buffer.clear()

            // Optional: Merge multiple segments
            IF segments.count() > max_segments:
                merged = merge_segments(segments)
                segments = [merged]


Segment merge strategy (LSM-tree inspired):
─────────────────────────────────────────────────────────

Level 0: L0 buffer (mutable, small)
Level 1: Recent segments (1-5 segments, 100K vectors each)
Level 2: Merged segments (1-2 segments, 10M vectors each)
Level 3: Base index (single segment, 100M+ vectors)

Merge triggers:
  - L0 size > 50K → flush to L1
  - L1 segment count > 5 → merge to L2
  - L2 segment count > 2 → merge to L3

Query fans out to all levels, results merged
```

### Write-Ahead Log (WAL) Design

```
WAL ensures durability before ack:
─────────────────────────────────────────────────────────

Write flow:
  1. Receive upsert(vector, id, metadata)
  2. Serialize to WAL entry
  3. Append to WAL (fsync for durability)
  4. Add to L0 buffer (in-memory)
  5. Acknowledge to client

Recovery flow:
  1. Load latest snapshot
  2. Replay WAL entries after snapshot
  3. Rebuild L0 buffer
  4. Ready to serve queries

WAL segment management:
  - Segments: 64 MB each
  - Retention: Until included in snapshot
  - Checkpoint: Every 1 hour or 100K writes

┌─────────────────────────────────────────────────────────────┐
│  WAL Directory                                               │
├─────────────────────────────────────────────────────────────┤
│  segment_0001.wal  [snapshot_v42 includes]  → DELETE        │
│  segment_0002.wal  [snapshot_v42 includes]  → DELETE        │
│  segment_0003.wal  [after snapshot_v42]     → KEEP          │
│  segment_0004.wal  [after snapshot_v42]     → KEEP (active) │
└─────────────────────────────────────────────────────────────┘
```

---

## Bottleneck Analysis

### Bottleneck 1: Memory Pressure at Scale

```
Problem:
─────────────────────────────────────────────────────────
100M vectors × 768 dims × 4 bytes = 307 GB (vectors alone)
+ HNSW graph overhead: ~32 GB
+ Metadata indexes: ~10 GB
+ Buffers, OS, overhead: ~20 GB
= 369 GB RAM needed

Most cloud instances max out at 256-512 GB RAM
→ Forces sharding earlier than expected

Mitigation strategies:

1. Product Quantization (reduce vector size)
   - 768 dims → 96 bytes (32x compression)
   - 307 GB → ~10 GB vectors
   - Trade-off: ~2-5% recall loss

2. Memory-mapped files
   - Keep graph in RAM, vectors on SSD
   - Access vectors via mmap
   - Trade-off: Higher latency for distant vectors

3. Tiered storage
   - Hot vectors in RAM
   - Warm vectors in SSD cache
   - Cold vectors in object storage
   - Trade-off: Complexity, variable latency

4. Earlier sharding
   - Split at 30-50M vectors per shard
   - Trade-off: More infrastructure cost
```

### Bottleneck 2: Index Rebuild Latency

```
Problem:
─────────────────────────────────────────────────────────
Index rebuild triggered by:
  - Parameter changes (M, ef_construction)
  - Dimension changes (rare, usually avoided)
  - Corruption recovery
  - Compaction/merge operations

100M vectors × 768 dims:
  - Build time: 2-4 hours (CPU)
  - Build time: 15-30 minutes (GPU-accelerated)

During rebuild:
  - Old index serves queries (stale data)
  - High CPU/GPU usage
  - Increased latency

Mitigation strategies:

1. Background rebuild with atomic swap
   - Build new index while old serves queries
   - Atomic pointer swap when ready
   - Trade-off: 2x memory during rebuild

2. Incremental rebuild
   - Rebuild one segment at a time
   - Trade-off: Longer total time, less resource spike

3. GPU acceleration (NVIDIA cuVS)
   - 10-15x faster index builds
   - Trade-off: GPU cost, data transfer overhead

4. Avoid full rebuilds
   - Use segment-based architecture
   - Only rebuild affected segments
```

### Bottleneck 3: Filter Selectivity Impact

```
Problem:
─────────────────────────────────────────────────────────
Filter selectivity directly impacts query performance:

Selectivity    Required ef    Latency
─────────────────────────────────────
100% (no filter)   100         5ms
50%                200         8ms
10%                1000        20ms
1%                 10000       100ms
0.1%               N/A         Use metadata-first

With very selective filters, HNSW degenerates to near-brute-force

Mitigation strategies:

1. Hybrid execution planning
   - Estimate selectivity before query
   - Choose strategy based on estimate:
     * High selectivity: Vector-first with in-filter
     * Low selectivity: Metadata-first, brute force filtered set

2. Partition by common filter dimensions
   - Separate HNSW indexes per category
   - Query routes to appropriate partition
   - Trade-off: Index proliferation, cross-partition queries expensive

3. Pre-filtered bitmap indexes
   - Maintain bitmaps for common filter combinations
   - Intersect bitmap with HNSW candidates early
   - Trade-off: Storage overhead, maintenance complexity

4. Query result caching
   - Cache results for frequent filter combinations
   - Trade-off: Cache invalidation complexity, memory

Selectivity estimation quality is crucial:
  - Overestimate selectivity → slow query (too low ef)
  - Underestimate selectivity → slow query (too high ef)
```

---

## Concurrency Considerations

### Read-Write Conflicts

```
Scenario: Concurrent read and write to same vector
─────────────────────────────────────────────────────────

Read flow:
  1. Query arrives
  2. Search HNSW graph (traverses neighbors)
  3. Compute distances to candidates
  4. Return top-k

Write flow:
  1. Upsert arrives for vector V
  2. Update V's embedding
  3. Update V's neighbors in graph

Conflict: Reader traversing to V while V being updated

Solutions:

1. Copy-on-Write (Immutable segments)
   - Writes create new segment
   - Reads see consistent snapshot
   - Old segments garbage collected
   - Used by: Milvus, Weaviate

2. MVCC (Multi-Version Concurrency Control)
   - Each vector has version number
   - Reads see version at query start time
   - Writers increment version
   - Used by: Qdrant

3. Read-Write Locks
   - Fine-grained locks per graph region
   - Readers acquire shared lock
   - Writers acquire exclusive lock
   - Trade-off: Lock contention at high write rate
```

### Distributed Locking for Index Operations

```
Operations requiring cluster-wide coordination:
─────────────────────────────────────────────────────────

1. Collection creation/deletion
   - All nodes must agree on schema
   - Use distributed consensus (Raft/Paxos)

2. Shard rebalancing
   - Move shard from node A to node B
   - Must not lose data or serve stale results
   - Steps:
     a. Pause writes to shard
     b. Sync shard to new node
     c. Update routing table (atomic)
     d. Resume writes
     e. Delete shard from old node

3. Index parameter changes
   - All shards must use consistent parameters
   - Rolling update with version checking

Coordination service (etcd/ZooKeeper):
  - Leader election for coordinators
  - Distributed locks for operations
  - Watch for configuration changes
```

---

## Performance Anti-Patterns

| Anti-Pattern | Impact | Solution |
|--------------|--------|----------|
| **Wrong M for dimensions** | Poor recall or slow queries | M=16 for 128-768d, M=32 for 1024+d |
| **ef_search < k** | Missing results | Always ef_search >= k |
| **Post-filter on selective queries** | Slow queries | Use in-filter or metadata-first |
| **No index on filter fields** | Slow filter evaluation | Index common filter columns |
| **Synchronous index updates** | High write latency | Async with L0 buffer |
| **Single huge segment** | Long rebuild times | Segment-based architecture |
| **Unnormalized vectors with dot product** | Incorrect results | Normalize or use cosine |

---

## Monitoring Critical Paths

```
Key metrics for early warning:
─────────────────────────────────────────────────────────

Memory:
  vector_memory_bytes / total_ram > 0.7  → Warning
  vector_memory_bytes / total_ram > 0.85 → Critical

L0 Buffer:
  l0_buffer_size > 50K vectors → Trigger merge
  l0_buffer_age > 5 minutes   → Alert (merge stuck?)

Query Performance:
  recall@10 < 0.90  → Index quality degraded
  p99_latency > 2x baseline → Investigate

Index Health:
  segment_count > 10  → Need compaction
  rebuild_in_progress = true for > 4 hours → Alert
```
