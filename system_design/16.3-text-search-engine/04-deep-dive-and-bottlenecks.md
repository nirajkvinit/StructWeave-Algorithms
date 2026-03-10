# 16.3 Deep Dives & Bottlenecks

## Critical Component 1: Segment Lifecycle and Merge Strategy

### Why This Is Critical

Every write operation in a text search engine flows through the segment lifecycle: documents enter an in-memory buffer, get flushed to an immutable on-disk segment during refresh, and eventually multiple small segments are merged into larger ones. This merge process is the single largest consumer of disk I/O in the system (30-50% of total I/O under sustained load), and when merging falls behind ingestion, the system enters a cascading failure: segment count grows, query performance degrades (more segments to search), merge debt accelerates, and the system can become unresponsive.

### How It Works Internally

```
FUNCTION segment_lifecycle():
    // Step 1: In-memory buffer (IndexWriter)
    //   Documents analyzed and indexed in RAM
    //   Buffer limited to configured size (default: 10% of heap per shard)

    // Step 2: Refresh (buffer -> new segment)
    //   Every 1 second (default), buffer flushed to a new immutable segment
    //   Segment becomes searchable (near-real-time)
    //   Creates many small segments over time

    // Step 3: Merge (compact small segments -> larger segment)
    //   Background merge policy selects candidate segments
    //   Merges N small segments into 1 larger segment
    //   Reclaims space from deleted documents
    //   Rebuilds term dictionaries and posting lists

    // Step 4: Commit (fsync to disk)
    //   After merge, new segment is committed
    //   Old segments are marked for deletion
    //   File handles released after all readers finish

FUNCTION tiered_merge_policy(segments: List<Segment>) -> List<MergePlan>:
    // Tiered merge: group segments by size, merge within tiers
    // Goal: minimize total I/O while keeping segment count manageable

    tier_boundaries = [5MB, 25MB, 125MB, 625MB, 5GB]
    max_merge_at_once = 10
    segments_per_tier = 10        // Trigger merge when tier exceeds this
    max_merged_segment_size = 5GB // Never create segments larger than this

    merge_plans = []
    FOR tier IN group_by_size_tier(segments, tier_boundaries):
        IF count(tier.segments) > segments_per_tier:
            // Select segments with highest merge benefit
            // Benefit = (space_freed_by_deleted_docs + compaction_gain) / merge_cost
            candidates = sort_by_merge_benefit(tier.segments)
            to_merge = candidates[:max_merge_at_once]

            estimated_size = sum(s.size - s.deleted_size for s in to_merge)
            IF estimated_size <= max_merged_segment_size:
                merge_plans.append(MergePlan(
                    sources=to_merge,
                    estimated_output_size=estimated_size,
                    priority=tier.tier_level    // Smaller tiers merge first
                ))

    RETURN merge_plans
```

### Failure Modes

| Failure Mode | Impact | Mitigation |
|---|---|---|
| Merge falls behind (merge debt) | Segment count grows -> query latency increases -> more CPU for query -> less CPU for merge -> vicious cycle | Throttle indexing when merge debt exceeds threshold; increase merge thread count; dedicate I/O bandwidth for merging |
| Large merge blocks new merges | A single 5 GB merge ties up a merge thread for minutes | Limit max merge segment size; use concurrent merge scheduler with per-merge I/O throttling |
| Merge during peak query load | Merge I/O competes with query I/O on same disk | Separate hot indexing nodes from query-serving replicas; schedule force-merges during off-peak hours |
| Node crash during merge | Source segments still exist (merge is atomic); in-progress merge data is lost | No data loss: merge output is only committed after full completion; source segments are deleted only after merge is committed |

---

## Critical Component 2: Distributed Query Execution

### Why This Is Critical

A search query must be executed across all shards that may contain matching documents, with results from each shard merged into a globally-ranked result set. The coordinator must handle variable shard response times, partial failures, and ensure that the global ranking is correct despite each shard computing local BM25 scores with local statistics. This scatter-gather pattern is the primary determinant of search latency at scale.

### How It Works Internally

```
FUNCTION distributed_search(query: SearchQuery, coordinator: CoordinatorNode) -> SearchResponse:
    // Phase 0: Can-Match (optional pre-filter)
    // Ask each shard if it CAN contain matching docs (time range, routing)
    relevant_shards = []
    FOR shard IN coordinator.get_shards(query.index):
        IF shard.can_match(query):    // Check min/max values, time range
            relevant_shards.append(shard)
    // Skipping irrelevant shards reduces scatter breadth by 30-70% for time-filtered queries

    // Phase 1: DFS (optional - Distributed Frequency Statistics)
    IF query.search_type == "dfs_query_then_fetch":
        // Collect term statistics from all shards for accurate IDF
        global_stats = {}
        FOR shard IN relevant_shards:
            shard_stats = shard.get_term_stats(query.terms)
            // shard_stats: {term: (doc_freq, total_term_freq)}
            merge_stats(global_stats, shard_stats)
        // Use global_stats for BM25 scoring (more accurate for small shards)

    // Phase 2: Query (scatter)
    shard_results = parallel_execute(relevant_shards, FUNCTION(shard):
        // Each shard executes query locally
        // Returns top-K (doc_id, score) pairs + aggregation partials
        local_top_k = shard.search(query,
            size=query.from + query.size,   // Need enough to satisfy global top-K
            stats=global_stats IF dfs ELSE shard.local_stats)

        RETURN ShardResult(
            top_docs=local_top_k,           // [(doc_id, score), ...]
            total_hits=shard.count_hits(query),
            agg_partials=shard.compute_aggregations(query.aggs),
            timed_out=shard.timed_out
        )
    , timeout=query.timeout)

    // Handle partial failures
    successful_shards = [r for r in shard_results if r.success]
    failed_shards = [r for r in shard_results if not r.success]
    IF len(successful_shards) == 0:
        RAISE SearchException("All shards failed")

    // Phase 3: Merge (reduce)
    // Global top-K by score (priority queue merge)
    global_top = merge_sorted(
        [r.top_docs for r in successful_shards],
        key=lambda x: x.score,
        order=DESC
    )[query.from : query.from + query.size]

    // Merge aggregations (sum counts, merge histograms, etc.)
    merged_aggs = reduce_aggregations(
        [r.agg_partials for r in successful_shards])

    // Phase 4: Fetch (gather document bodies)
    // Group winning doc IDs by their owning shard
    fetch_requests = group_by_shard(global_top)
    fetched_docs = parallel_execute(fetch_requests, FUNCTION(shard, doc_ids):
        RETURN shard.fetch_documents(doc_ids, query.stored_fields, query.highlight)
    )

    // Assemble final response
    RETURN SearchResponse(
        hits=fetched_docs,
        total_hits=sum(r.total_hits for r in successful_shards),
        aggregations=merged_aggs,
        shards={total: len(relevant_shards),
                successful: len(successful_shards),
                failed: len(failed_shards)},
        took_ms=elapsed_time
    )
```

### The DFS Problem: Local vs. Global IDF

BM25 scoring depends on IDF (inverse document frequency), which measures how rare a term is across the entire corpus. When each shard computes BM25 independently, it uses *local* IDF (term frequency within that shard only). For evenly distributed data this approximation is acceptable, but for unevenly distributed data (e.g., time-based indexes where different shards cover different time periods), local IDF can produce incorrect rankings.

```
// Example: query for "outage" across daily indexes
// Shard for 2026-03-01 (normal day): 10 docs contain "outage" out of 1M docs
//   -> IDF = log(1 + (1M - 10) / 10) = 11.5 (very rare = high score)
// Shard for 2026-03-02 (incident day): 50,000 docs contain "outage" out of 1M docs
//   -> IDF = log(1 + (1M - 50K) / 50K) = 2.9 (common = low score)
// Without DFS, docs from 2026-03-01 get artificially higher scores
// With DFS, global IDF is used: log(1 + (2M - 50,010) / 50,010) = 3.7
```

**Trade-off**: DFS adds an extra scatter-gather round trip (+5-15ms latency) but produces correct global rankings. Most systems default to local IDF (sufficient for large, evenly distributed indexes) and offer DFS as an opt-in for small or skewed indexes.

### Failure Modes

| Failure Mode | Impact | Mitigation |
|---|---|---|
| Slow shard (straggler) | Query latency = slowest shard response | Adaptive replica selection: route to the shard copy with lowest queue depth; set per-shard timeout and return partial results |
| Shard unavailable | Missing results from that shard | Accept partial results with `_shards.failed > 0` in response; client decides whether to retry |
| Coordinator OOM on large aggregations | Global aggregation merge consumes unbounded memory | Limit aggregation cardinality (max bucket count); use `shard_size` to limit per-shard aggregation results; circuit-breaker to reject queries that would exceed memory limits |

---

## Critical Component 3: Near-Real-Time Refresh and Translog

### Why This Is Critical

The refresh mechanism is the bridge between the write path (documents indexed but not yet searchable) and the read path (documents searchable). The translog provides durability before segments are committed to disk. Together, they create the "near-real-time" property that is the defining characteristic of modern search engines, and misconfiguring either one leads to data loss or unacceptable search latency.

### How It Works Internally

```
FUNCTION write_and_refresh_cycle(shard: Shard):
    // Write path: document -> translog -> in-memory buffer
    FUNCTION index_document(doc: Document):
        // Step 1: Write to translog (durability guarantee)
        shard.translog.append(IndexOperation(doc))
        // translog.sync_mode:
        //   "request" = fsync after every write (safest, slowest)
        //   "async"   = fsync every 5 seconds (faster, risk of 5s data loss)

        // Step 2: Add to in-memory index buffer
        shard.memory_buffer.add(doc)
        // Document is durable (translog) but NOT searchable

    // Refresh cycle: in-memory buffer -> new searchable segment
    FUNCTION refresh():
        // Runs every refresh_interval (default: 1 second)
        IF shard.memory_buffer.is_empty():
            RETURN  // Skip no-op refresh

        // Create new Lucene segment from buffer contents
        new_segment = build_segment(shard.memory_buffer.drain())
        // new_segment is written to OS page cache (NOT fsync'd)

        // Update searcher to include new segment
        shard.searcher_manager.refresh()
        // NOW documents are searchable

    // Flush cycle: commit segments + truncate translog
    FUNCTION flush():
        // Runs every 30 minutes OR when translog exceeds 512MB
        // Step 1: fsync all segment files to disk
        FOR segment IN shard.uncommitted_segments:
            fsync(segment.files)

        // Step 2: Write new commit point (segments_N file)
        write_commit_point(shard.active_segments)

        // Step 3: Truncate translog (no longer needed for recovery)
        shard.translog.truncate()

    // Crash recovery: replay translog to rebuild in-memory state
    FUNCTION recover_from_crash():
        // Read last commit point to find committed segments
        committed = read_commit_point()

        // Replay translog entries after last commit
        FOR entry IN shard.translog.entries_after(committed.generation):
            shard.memory_buffer.add(entry.document)

        // Refresh to make replayed documents searchable
        refresh()
```

### Failure Modes

| Failure Mode | Impact | Mitigation |
|---|---|---|
| Node crash before flush | Uncommitted segments lost (only in OS page cache) | Translog replay recovers all acknowledged documents; translog is fsync'd per-request or every 5 seconds |
| Translog corruption | Cannot replay unfinished operations | Translog checksum verification on read; peer recovery from replica shard if translog is unrecoverable |
| Refresh storm (too many small segments) | Query performance degrades; merge falls behind | Increase refresh interval for high-throughput indexing; auto-throttle refresh when merge debt is high |

---

## Concurrency & Race Conditions

### Optimistic Concurrency Control

```
FUNCTION update_with_optimistic_concurrency(index, doc_id, update, expected_seq_no, expected_primary_term):
    // Client provides expected _seq_no and _primary_term from their last read
    // If the document has been modified since, the update is rejected

    current = get_document(index, doc_id)
    IF current._seq_no != expected_seq_no OR current._primary_term != expected_primary_term:
        RETURN 409 Conflict
        // Client must re-read and retry

    // Apply update with new seq_no
    new_seq_no = shard.next_seq_no()
    index_document(doc_id, update, seq_no=new_seq_no)
    RETURN 200 OK
```

### Primary-Replica Write Race

```
// Scenario: Primary shard receives writes A, B, C
// Replica must apply in same order to maintain consistency
// Solution: sequence numbers and primary terms

// Primary assigns monotonically increasing _seq_no to each operation
// Replica applies operations in _seq_no order
// If primary fails, new primary starts a new _primary_term
// Replicas reject operations from old primary terms
```

### Search-While-Indexing Visibility

```
// Scenario: client indexes document, then immediately searches for it
// Without explicit refresh, document may not be visible yet

// Solution 1: ?refresh=wait_for (block until next refresh includes the document)
// Solution 2: ?refresh=true (force immediate refresh -- expensive at high volume)
// Solution 3: accept eventual consistency (document visible within 1 second)

// Anti-pattern: setting refresh=true on every write
//   Creates many tiny segments, degrades search performance
//   Only acceptable for low-volume indexes
```

---

## Bottleneck Analysis

### Bottleneck 1: Segment Merge I/O Contention

| Aspect | Detail |
|---|---|
| **Symptom** | Increasing query latency; growing segment count; disk I/O at 100% |
| **Root cause** | Merge throughput cannot keep pace with segment creation rate |
| **Impact** | Every additional un-merged segment adds one file handle, one FST lookup, and one posting list scan per query |
| **Mitigation** | (1) Increase `refresh_interval` from 1s to 5-30s for bulk indexing; (2) Dedicate I/O bandwidth for merging via I/O scheduler priorities; (3) Use `force_merge` during off-peak hours for read-heavy indexes; (4) Separate indexing-heavy nodes from query-heavy nodes |

### Bottleneck 2: High-Cardinality Aggregations

| Aspect | Detail |
|---|---|
| **Symptom** | Aggregation queries consume excessive heap; circuit breaker trips |
| **Root cause** | Terms aggregation on a field with millions of unique values requires a per-shard hash map of all unique terms |
| **Impact** | OOM on data nodes; query rejection by field data circuit breaker |
| **Mitigation** | (1) Use `shard_size` parameter to limit per-shard buckets; (2) Use `composite` aggregation for paginated aggregation over high-cardinality fields; (3) Pre-aggregate using `rollup` or `transform` for known analytics queries; (4) Monitor fielddata cache size and set circuit breaker thresholds |

### Bottleneck 3: Mapping Explosion from Dynamic Fields

| Aspect | Detail |
|---|---|
| **Symptom** | Cluster state grows to hundreds of MB; master node becomes unresponsive; shard recovery slows |
| **Root cause** | Dynamic mapping creates a new field mapping for every unique field name; unbounded key-value data (user attributes, log fields) creates thousands of fields |
| **Impact** | Cluster state is replicated to every node; large cluster state slows down shard allocation, recovery, and rebalancing |
| **Mitigation** | (1) Set `index.mapping.total_fields.limit` (default 1000); (2) Use `flattened` field type for arbitrary key-value data; (3) Disable dynamic mapping (`dynamic: strict`) for production indexes; (4) Use runtime fields for ad-hoc queries on unmapped fields |
