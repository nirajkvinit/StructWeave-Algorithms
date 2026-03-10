# 15.3 Deep Dive & Bottlenecks

## Critical Component 1: The Indexing Engine

### Why This Is Critical

The indexing engine is the heart of the log aggregation system---it transforms a stream of raw log events into a searchable, queryable index. Every design decision in the indexing engine directly determines the system's three most important properties: ingestion throughput, search latency, and storage cost. A poorly designed indexer becomes either the write bottleneck (if indexing is too slow to keep up with ingestion) or the cost bottleneck (if indexing produces oversized indexes that dominate storage costs).

### How It Works Internally

#### Segment-Based Architecture

The indexing engine uses an **LSM-tree-inspired** architecture where new data is buffered in memory and periodically flushed to immutable on-disk segments:

1. **In-Memory Buffer (Head Segment)**: Incoming events are appended to an in-memory data structure. The buffer maintains both the raw events and partially constructed index structures (term-to-posting-list maps, bloom filter builders). The buffer is bounded by a configurable memory limit (default: 256MB per shard).

2. **Write-Ahead Log (WAL)**: Before an event is added to the in-memory buffer, it is appended to a sequential WAL file on disk. The WAL is the durability guarantee---if the process crashes, the in-memory buffer is lost but can be reconstructed by replaying the WAL. WAL writes are sequential and batched (fsync every 200ms or 5MB, configurable), achieving high throughput.

3. **Refresh Cycle**: Periodically (default: 1-5 seconds), the in-memory buffer is "refreshed"---the buffered events are organized into a new immutable segment that is written to the filesystem cache (not yet fsync'd). After refresh, the events are searchable. This is the source of the "ingestion-to-searchable" latency.

4. **Flush/Commit**: Periodically (default: 30 minutes or 512MB), segments are fsync'd to durable storage and a commit point is written. The WAL is truncated up to the committed segment.

5. **Segment Merge (Compaction)**: Background threads merge multiple small segments into larger ones, improving search performance (fewer segments to search) and reclaiming space from deleted documents. Uses tiered merge policy: segments of similar sizes are merged together.

#### Inverted Index Construction Pipeline

```
Raw Event -> Tokenization -> Term Normalization -> Posting List Building -> Compression

Tokenization:
  "Connection to 10.0.1.42 timed out after 3000ms"
  -> ["connection", "to", "10.0.1.42", "timed", "out", "after", "3000ms"]

Term Normalization:
  - Lowercase folding: "Connection" -> "connection"
  - No stemming (logs need exact match, not linguistic similarity)
  - Preserve numeric tokens (important for IP addresses, ports, durations)

Posting List Building:
  term "connection" -> [doc_1, doc_7, doc_23, doc_156, ...]
  term "timeout" -> [doc_1, doc_45, doc_89, ...]

  Stored as sorted arrays of document IDs.

Compression (Frame-of-Reference):
  Original IDs: [1, 7, 23, 156, 203, 245, 302]
  Deltas:       [1, 6, 16, 133, 47, 42, 57]
  Block (128 IDs): Store min value + bit-packed deltas
  Typical compression: 1-2 bytes per document ID
```

#### Term Dictionary: Finite State Transducer (FST)

The term dictionary maps terms to their posting list offsets. A naive HashMap would require O(N) memory for N unique terms. Instead, the FST compresses the term dictionary by sharing common prefixes and suffixes:

- **Construction**: O(N * L) where N = unique terms, L = average term length
- **Lookup**: O(L) for a single term lookup
- **Memory**: Typically 3-10x smaller than a HashMap for natural language terms
- **Key property**: FSTs can be memory-mapped, so they don't consume heap memory

### Failure Modes

| Failure | Impact | Mitigation |
|---|---|---|
| **Index writer OOM** | In-memory buffer exceeds heap; process crashes; uncommitted events lost until WAL replay | Memory circuit breaker: reject new events when heap usage > 85%; WAL replay recovers uncommitted events on restart |
| **WAL corruption** | Segment of WAL unreadable; events in corrupted segment lost | Checksummed WAL entries; corrupted entries skipped during replay (logged as data loss); dual WAL for critical tenants |
| **Segment merge failure** | Merge produces corrupted segment; source segments already marked as merged | Atomic merge: new segment is fully written and verified before source segments are marked for deletion; rollback on any error |
| **Disk full** | No space for new segments or WAL; indexing halts | Disk watermark monitoring: at 85% usage, stop allocating new shards; at 90%, force-merge to reclaim deleted space; at 95%, emergency read-only mode |
| **Type conflict** | Same field has type "string" in service A and "integer" in service B; indexing fails for one type | Dynamic type resolution: store both versions with type suffix (status_str, status_int); query engine handles type coercion at query time |

---

## Critical Component 2: The Ingestion Buffer (Message Queue)

### Why This Is Critical

The message queue is the architectural backbone that decouples log producers from consumers. Without it, any downstream slowdown (indexer maintenance, segment merge storm, query load spike) directly cascades to log producers, causing agents to buffer locally, exhaust disk, and begin dropping logs. The queue transforms a tightly coupled, fragile pipeline into a resilient, independently scalable system.

### How It Works Internally

#### Partitioning Strategy

```
Topic: logs-{tenant_id}
Partitions: hash(data_stream) % NUM_PARTITIONS

Example for tenant "acme" with 32 partitions:
  "acme-app-logs"     -> partition 7
  "acme-infra-logs"   -> partition 22
  "acme-security-logs" -> partition 3
```

Each partition is an ordered, append-only log. Partitioning by data stream ensures:
- Events from the same stream are ordered (within a partition)
- Different streams can be consumed in parallel by different indexer instances
- Rebalancing is at partition granularity (not event granularity)

#### Consumer Group Management

Indexer instances form a consumer group. Each partition is assigned to exactly one indexer instance at a time (exclusive consumer). Rebalancing occurs when:
- An indexer instance joins or leaves the group (scale up/down, crash)
- A partition is added or removed (scale topic)

**Rebalance Protocol**:
1. **Cooperative Sticky Assignor**: Minimizes partition movement during rebalance. Only partitions that must move are reassigned; all others continue processing.
2. **Consumer Lag Awareness**: Before rebalance, each indexer flushes its in-memory buffer and commits its consumer offset. This prevents duplicate processing after rebalance.
3. **Static Group Membership**: Indexer instances register with a static member ID tied to their persistent storage. On restart (not crash), they reclaim their previous partition assignment without triggering a full rebalance.

#### Retention and Replay

```
Queue retention: 72 hours (3 days)

Purpose:
1. Buffer during indexer downtime (planned or unplanned)
2. Enable re-indexing: if an indexer bug corrupts data, replay from queue
3. Support new consumer groups: a new indexer pool can start consuming
   from any point in the 72-hour window

Cost: ~200 MB/s * 72 hours = ~50 TB of queue storage
(Tiered storage: recent 6 hours on SSD, remainder on HDD/object storage)
```

### Failure Modes

| Failure | Impact | Mitigation |
|---|---|---|
| **Broker failure** | Partition leaders on failed broker become unavailable; producers cannot write | Replication factor 3; in-sync replica (ISR) takes over as new leader within seconds; producers retry with exponential backoff |
| **Consumer lag explosion** | Indexer can't keep up; lag grows to millions of messages; approaches retention deadline | Alert on consumer lag; auto-scale indexer pool; emergency: increase retention temporarily + add indexer capacity |
| **Partition skew** | One data stream produces 100x more than others; its partition's indexer is overloaded | Monitor per-partition throughput; re-partition high-volume streams across multiple partitions; weight-aware consumer assignment |
| **Producer timeout** | Agent can't reach queue; local buffer fills | Agent disk buffer (500MB default); agent drops lowest-priority logs (DEBUG first) when disk buffer full; metric emitted for dropped events |
| **Rebalance storm** | Frequent indexer restarts trigger continuous rebalances; throughput drops to near zero during rebalance | Static group membership; cooperative sticky assignor; rebalance cooldown timer (minimum 60 seconds between rebalances) |

---

## Critical Component 3: The Query Execution Engine

### Why This Is Critical

The query engine is the user-facing component that determines whether engineers can find the needle in the haystack during an incident. A slow query engine during an outage means slower root-cause analysis, longer MTTR, and more customer impact. The query engine faces a unique challenge: it must deliver sub-second results for recent data while also supporting ad-hoc queries across petabytes of historical data across multiple storage tiers.

### How It Works Internally

#### Query Planning

```
FUNCTION plan_query(query: ParsedQuery, time_range: TimeRange) -> ExecutionPlan:
    // Step 1: Identify target shards
    tenant_shards = get_shards_for_tenant(query.tenant_id)
    time_filtered = filter_by_time_range(tenant_shards, time_range)
    label_filtered = filter_by_label_index(time_filtered, query.stream_selector)

    // Step 2: Estimate query cost
    estimated_docs = sum(shard.doc_count for shard in label_filtered)
    estimated_bytes = sum(shard.size_bytes for shard in label_filtered)

    // Step 3: Choose execution strategy
    IF estimated_docs < 10_000:
        strategy = SINGLE_SHARD_SEQUENTIAL
    ELSE IF estimated_bytes < 1GB:
        strategy = PARALLEL_SCATTER_GATHER
    ELSE:
        strategy = PARALLEL_WITH_EARLY_TERMINATION
        // For very large scans, return results as they arrive
        // and allow user to cancel or refine

    // Step 4: Apply query splitting for large time ranges
    IF time_range.duration > 24_HOURS:
        sub_ranges = split_time_range(time_range, interval=1_HOUR)
        // Execute sub-ranges in reverse chronological order
        // (most recent first -- higher probability of finding desired events)

    // Step 5: Assign resource budget
    plan.max_memory = per_query_memory_limit    // e.g., 256MB
    plan.max_time = per_query_timeout           // e.g., 30 seconds
    plan.max_scanned_bytes = per_query_scan_limit  // e.g., 10GB

    RETURN plan
```

#### Cross-Tier Query Routing

The query engine must transparently query across storage tiers with different latency characteristics:

| Tier | Access Method | Expected Latency | Parallelism |
|---|---|---|---|
| Hot (SSD) | Direct segment read | 1-10 ms per segment | High (local I/O) |
| Warm (HDD) | Direct segment read | 10-100 ms per segment | Moderate (seek-limited) |
| Cold (Object Storage) | Fetch searchable snapshot block | 50-500 ms per block | High (network I/O, no seek limit) |
| Frozen (Archive) | Rehydrate on demand | Minutes to hours | Low (batch rehydration) |

**Optimization**: For queries spanning multiple tiers, execute hot-tier subqueries first and stream results to the user immediately. Warm and cold tier results arrive later and are merged into the result stream. This provides perceived low latency even for cross-tier queries.

### Failure Modes

| Failure | Impact | Mitigation |
|---|---|---|
| **Query of death** | Poorly constructed query scans entire dataset; OOM or timeout | Per-query memory limit (256MB), timeout (30s), scanned-bytes limit (10GB); query killed and user notified with refinement suggestions |
| **Shard unavailability** | One shard's node is down; query returns partial results | Return partial results with `shards_successful < shards_total` in metadata; user can choose to retry or accept partial |
| **Cold tier latency spike** | Object storage latency spikes; cold-tier subqueries timeout | Separate timeout for cold-tier subqueries; return hot/warm results first, cold results as available; cache frequently accessed cold-tier blocks |
| **Result set explosion** | Aggregation query produces millions of time series buckets | Cardinality limit on `group_by` clauses (default: 10,000 groups); truncate with warning |

---

## Concurrency & Race Conditions

### Race Condition 1: Concurrent Segment Merge and Search

**Scenario**: A search query opens segment A for reading. Concurrently, a merge operation reads segment A, merges it with segment B, produces segment C, and deletes segment A. The search query now holds a reference to a deleted segment.

**Solution**: Reference counting with delayed deletion.

```
FUNCTION open_segment_for_read(segment_id) -> SegmentReader:
    ref_count = atomic_increment(segment.ref_count)
    IF segment.is_deleted:
        atomic_decrement(segment.ref_count)
        RAISE SegmentDeleted
    RETURN SegmentReader(segment)

FUNCTION close_segment_reader(reader):
    ref_count = atomic_decrement(reader.segment.ref_count)
    IF ref_count == 0 AND reader.segment.is_marked_for_deletion:
        physically_delete(reader.segment)

FUNCTION merge_complete(source_segments, new_segment):
    // Register new segment first (searchable)
    register_segment(new_segment)
    // Mark source segments for deletion (but don't physically delete)
    FOR segment IN source_segments:
        segment.is_marked_for_deletion = True
        IF segment.ref_count == 0:
            physically_delete(segment)
        // Else: deletion deferred until last reader closes
```

### Race Condition 2: Concurrent Schema Updates from Multiple Services

**Scenario**: Service A sends a log with field `response_time` as integer (42). Service B simultaneously sends a log with `response_time` as string ("42ms"). Both events arrive at the same index writer for the same shard.

**Solution**: First-writer-wins with type suffix escalation.

```
FUNCTION resolve_type_conflict(field_name, new_type, existing_type):
    IF existing_type == NULL:
        // First occurrence: establish type
        RETURN field_name, new_type

    IF new_type == existing_type:
        RETURN field_name, existing_type

    // Conflict detected
    // Strategy: keep original mapping, create suffixed alternative
    suffixed_name = field_name + "_" + type_suffix(new_type)
    log_warning("Type conflict for field '{field_name}': "
                "existing={existing_type}, new={new_type}. "
                "Storing as '{suffixed_name}'")

    RETURN suffixed_name, new_type

// Result: index contains both "response_time" (integer) and "response_time_str" (string)
// Query engine: SELECT response_time FROM logs  -> returns integer version
//               SELECT response_time_str FROM logs -> returns string version
//               Query UI shows conflict warning
```

### Race Condition 3: Consumer Rebalance During Indexing

**Scenario**: Indexer A is processing partition 7. A rebalance occurs, and partition 7 is reassigned to Indexer B. Indexer A has events in its in-memory buffer that haven't been committed (offset not advanced). Indexer B starts consuming from the last committed offset, re-processing events that Indexer A already indexed.

**Solution**: Cooperative shutdown with flush-before-revoke.

```
FUNCTION on_partitions_revoked(revoked_partitions):
    // Called before partitions are reassigned
    FOR partition IN revoked_partitions:
        // Flush in-memory buffer for this partition's events
        flush_buffer(partition)
        // Commit consumer offset to latest processed event
        commit_offset(partition, last_processed_offset[partition])
        // Sync WAL to disk
        sync_wal(partition)
    // Now the new consumer will start from the committed offset
    // No duplicate processing (assuming flush succeeds)

    // Edge case: flush fails (e.g., disk error)
    // -> offset not committed -> new consumer re-processes from last committed
    // -> deduplication at query time (idempotent indexing by event_id)
```

---

## Bottleneck Analysis

### Bottleneck 1: Segment Merge Overhead Competing with Ingestion I/O

**Problem**: At high ingestion rates, new segments are created every few seconds. The merge process must continuously merge small segments into larger ones to maintain query performance (fewer segments = faster search). Both ingestion (WAL writes, segment flushes) and merging (read old segments, write new merged segment) compete for disk I/O bandwidth.

**Impact**: Merge falls behind -> segment count grows -> search performance degrades -> query timeouts during incidents.

**Mitigation**:
| Strategy | How It Helps |
|---|---|
| **Separate I/O paths** | WAL writes on dedicated SSD; segment storage on separate SSD; merge I/O throttled to 50% of available bandwidth |
| **Tiered merge policy with adaptive scheduling** | Merge priority increases as segment count grows; emergency "mega-merge" triggered when segment count exceeds threshold (e.g., 50 segments per shard) |
| **Reduce segment creation rate** | Increase refresh interval during high load (1s -> 5s -> 15s); larger batches produce fewer, larger segments |
| **Time-based rollover** | Create new index daily; yesterday's index is fully merged once, then never merged again (read-only) |

### Bottleneck 2: Full-Text Search Across High-Cardinality Fields

**Problem**: Searching for a specific trace ID (`trace_id = "abc123def456"`) across billions of log events. The trace ID field has extremely high cardinality (unique per request), making traditional inverted index lookup efficient *if* the field is indexed. But indexing every trace ID consumes enormous storage.

**Impact**: Without trace ID indexing, finding logs for a specific trace requires scanning all events in the time range (seconds to minutes). With indexing, storage cost for trace ID posting lists can exceed the raw log storage.

**Mitigation**:
| Strategy | How It Helps |
|---|---|
| **Bloom filter on trace_id** | 1-2% of segment size; eliminates 90-99% of segments from scan; false positive rate 1% acceptable |
| **Columnar storage for trace_id** | Store trace IDs in a sorted column; binary search for exact match; O(log N) per segment |
| **Dedicated trace index** | Separate lightweight index mapping trace_id -> [segment_id, doc_offset]; tiny compared to full inverted index |
| **Query routing to tracing system** | If user queries by trace_id, route to the distributed tracing system (15.2) which already has this index; return correlated logs |

### Bottleneck 3: Incident-Correlated Load Spike (Simultaneous Write + Read Peak)

**Problem**: During an incident, log volume spikes 5-10x (error floods) while simultaneously engineers submit 10x more search queries. The system is under maximum write AND read load at the exact moment it is most critical. Write-path and read-path compete for the same resources: CPU (parsing + query execution), memory (in-memory buffers + query working set), disk I/O (WAL writes + segment reads), and network (ingestion + query results).

**Impact**: Ingestion lag increases -> recent logs not searchable -> engineers can't find root cause -> MTTR increases.

**Mitigation**:
| Strategy | How It Helps |
|---|---|
| **Resource isolation** | Separate node pools for indexing and querying; indexers never execute queries; query nodes never accept write traffic; eliminates resource contention |
| **Priority-based ingestion** | During detected incident, ERROR/FATAL logs get priority indexing; DEBUG/INFO logs queued with lower priority or sampled |
| **Pre-provisioned burst capacity** | Maintain 30% idle headroom in both indexer and query pools; auto-scaling is too slow for incident spikes (5-10 minute lag) |
| **Query result caching** | Incident queries are repetitive (same service, same time range, different filters); aggressive caching of intermediate results reduces redundant work |
| **Graceful degradation** | If indexer lag exceeds threshold: reduce refresh interval (5s -> 30s), increase batch size; if query load exceeds threshold: return partial results from hot tier only, skip warm/cold |
