# Deep Dive & Bottlenecks — NewSQL Database

## Critical Component 1: Clock Skew and Read Uncertainty

### Why Is This Critical?

Serializable isolation in a distributed database requires a total ordering of all transactions. Without perfectly synchronized clocks, two nodes may assign timestamps that disagree about the order of concurrent events. If Node A commits a write at physical time T=100 and Node B starts a read at physical time T=101, but Node B's clock is actually 5ms behind Node A's clock, Node B might miss the write — violating serializability. The clock synchronization strategy fundamentally determines the system's consistency guarantees and transaction latency.

### How It Works Internally

**Hybrid Logical Clocks (HLC)** combine physical time with a logical counter:

```
HLC = (wall_time_ns, logical_counter)

Ordering rules:
  1. Compare wall_time first
  2. If wall_time equal, compare logical_counter
  3. On each local event, increment logical_counter
  4. On receiving a remote message, advance wall_time to
     max(local_wall_time, remote_wall_time) and adjust logical_counter
```

**Read uncertainty interval:** Each transaction maintains a `max_timestamp` that represents the upper bound of clock uncertainty (typically `read_timestamp + max_clock_offset`, where `max_clock_offset` is ~250ms for NTP).

```
Read Uncertainty Window:
  read_ts ──────────[uncertainty interval]──────────── max_ts
            ▲                                            ▲
        Transaction                                  Upper bound
        start time                                   of real time
```

When a reader encounters a value with a timestamp between `read_ts` and `max_ts`, it cannot determine whether this value was committed before or after the read started. The reader must **restart the transaction at a higher timestamp** to resolve the ambiguity.

### Performance Impact

| Clock Skew | Uncertainty Window | Restart Probability | Latency Impact |
|-----------|-------------------|--------------------|--------------------|
| < 1ms (PTP) | 1ms | < 0.01% | Negligible |
| < 10ms (NTP well-tuned) | 10ms | ~0.1% | Minimal |
| < 250ms (NTP default) | 250ms | ~2-5% | Noticeable on write-heavy workloads |
| > 500ms (NTP degraded) | 500ms | ~10%+ | Significant latency spikes |

### Failure Modes

1. **NTP server failure** — If the NTP source becomes unavailable, node clocks drift at their hardware rate (~30ppm = 2.6s/day). The HLC continues advancing but the uncertainty window grows unboundedly.
   - **Mitigation:** Nodes self-quarantine when detected clock offset exceeds a threshold. Multiple NTP sources with cross-validation.

2. **Clock jump** — A sudden NTP correction jumps physical time forward or backward. A forward jump is safe (HLC advances). A backward jump is dangerous — it could violate the monotonicity invariant.
   - **Mitigation:** HLC always takes the maximum of physical clock and current HLC wall_time, so backward jumps are absorbed. However, a backward jump causes the logical counter to increment rapidly until physical time catches up, which is harmless but wastes timestamp space.

3. **Read restart storm** — Under high contention, many readers encounter uncertain values and restart, creating a cascade of retried transactions.
   - **Mitigation:** Observed timestamp tracking — once a leaseholder serves a read at timestamp T, it records T as an observed timestamp. Future reads from the same node can narrow the uncertainty window since the leaseholder guarantees no committed writes exist between its observed timestamp and the read timestamp.

---

## Critical Component 2: Range Splits and Merges

### Why Is This Critical?

Ranges are the fundamental unit of data distribution. A range that grows too large (>512 MB default) slows compaction, increases replication costs, and creates hot spots. A range that becomes too small wastes Raft group resources (each range maintains its own Raft state machine, WAL, and leader election overhead). The system must continuously split large ranges and merge underutilized ones — all while serving ongoing reads and writes without interruption.

### How It Works Internally

**Range Split Process:**

```
FUNCTION split_range(range, split_key):
    // Step 1: Choose split point (midpoint of range by size or key count)
    IF split_key is NULL:
        split_key = find_midpoint(range)

    // Step 2: Propose split via Raft (must be committed by quorum)
    split_command = RaftCommand(
        type = SPLIT,
        original_range_id = range.id,
        new_range_id = allocate_range_id(),
        split_key = split_key
    )

    raft_propose(range, split_command)

    // Step 3: On commit, atomically create two range descriptors
    //   Left range:  [original.start_key, split_key)
    //   Right range: [split_key, original.end_key)
    //
    //   Both ranges initially share the same replicas
    //   Raft state is forked: right range starts with a snapshot

    // Step 4: Both ranges begin independent Raft operation
    //   Reads/writes to keys < split_key → left range
    //   Reads/writes to keys >= split_key → right range

    // Step 5: Rebalancer may later move one range to a different node
```

**Range Merge Process (reverse of split):**

```
FUNCTION merge_ranges(left_range, right_range):
    // Preconditions:
    //   - Ranges are adjacent (left.end_key == right.start_key)
    //   - Both ranges are below minimum size threshold
    //   - Both ranges have the same replica placement

    // Step 1: Freeze the right range (stop accepting writes)
    freeze(right_range)

    // Step 2: Transfer right range's data to left range via Raft
    merge_command = RaftCommand(
        type = MERGE,
        left_range_id = left_range.id,
        right_range_id = right_range.id
    )

    raft_propose(left_range, merge_command)

    // Step 3: On commit, left range expands to cover both key spans
    //   left_range.end_key = right_range.end_key
    //   right_range is deleted

    // Step 4: Right range's Raft group is disbanded
```

### Split/Merge Decision Criteria

| Trigger | Action | Threshold |
|---------|--------|-----------|
| Range size exceeds max | Split | > 512 MB (configurable) |
| Range QPS exceeds limit | Split | > 2,500 QPS per range |
| Range CPU time exceeds limit | Split | > 500ms/s CPU per range |
| Two adjacent ranges below min | Merge | Both < 10 MB and < 50 QPS |
| Range split count exceeds limit | Backpressure | System-wide range budget |

### Failure Modes

1. **Split during active transaction** — A transaction writes intents to a range, then the range splits. The intents now span two ranges.
   - **Mitigation:** The split operation is atomic via Raft. Intents are logically associated with their keys, not their range. After split, each range owns the intents for its key span. The transaction coordinator resolves intents on both ranges during commit.

2. **Cascading splits** — A hot range splits, but the hot key is near the split point. Both child ranges receive equal load and immediately need to split again.
   - **Mitigation:** Load-based splitting chooses split points that bisect the load distribution, not just the key space. Hot key detection uses QPS sampling to find the optimal split point.

---

## Critical Component 3: Distributed Deadlock Detection

### Why Is This Critical?

In a single-node database, deadlock detection uses a local wait-for graph. In a distributed NewSQL database, transaction A on Node 1 may wait for transaction B on Node 2, which waits for transaction C on Node 3, which waits for transaction A — a distributed deadlock cycle that no single node can detect.

### How It Works Internally

**Push-based deadlock detection:**

Rather than building a global wait-for graph (expensive in a distributed system), NewSQL databases use a push-based approach:

```
FUNCTION handle_write_conflict(reader_txn, blocking_txn):
    // Reader encounters a write intent from blocking_txn

    // Step 1: Check if blocking_txn is still active
    txn_record = read_txn_record(blocking_txn.id)

    IF txn_record.status == COMMITTED:
        resolve_intent_as_committed()
        RETURN PROCEED

    IF txn_record.status == ABORTED:
        resolve_intent_as_aborted()
        RETURN PROCEED

    // Step 2: Determine who should wait (priority-based)
    IF reader_txn.priority > blocking_txn.priority:
        // Reader has higher priority: PUSH the blocker
        push_txn_timestamp(blocking_txn)  // force blocker to restart
        RETURN PROCEED
    ELSE:
        // Reader has lower priority: WAIT
        wait_for_txn(blocking_txn, timeout=5s)

        IF timeout_exceeded:
            // Potential deadlock — abort reader and retry
            abort_and_retry(reader_txn)

// Priority assignment:
//   - Each transaction starts with a random priority
//   - On restart, priority increases (prevents starvation)
//   - System transactions get highest priority
```

**Deadlock prevention via wound-wait:**

| Scenario | Higher Priority Txn (older) | Lower Priority Txn (younger) |
|----------|---------------------------|------------------------------|
| Higher wants lock held by Lower | Wound: abort the younger txn | — |
| Lower wants lock held by Higher | — | Wait: block until higher completes |

### Failure Modes

1. **Phantom deadlock** — A transaction is detected as part of a deadlock cycle, but the blocking transaction already committed (stale information). The system aborts a transaction unnecessarily.
   - **Mitigation:** Always verify the blocking transaction's current status before aborting. Use the transaction heartbeat mechanism — if a transaction's heartbeat is recent, it is still active.

2. **Priority inversion** — A low-priority long-running analytics transaction holds locks that block high-priority OLTP transactions.
   - **Mitigation:** OLTP and analytics workloads use separate transaction pools. Analytics queries use historical (follower) reads that never block writes.

---

## Concurrency & Race Conditions

### Race Condition 1: Write-Write Conflict Across Ranges

**Scenario:** Two transactions both read the same row, then attempt to update it. Without detection, the later write overwrites the earlier one (lost update).

**Resolution:** Serializable snapshot isolation (SSI) detects this at commit time. Each transaction reads at its start timestamp and writes at its commit timestamp. If Transaction B attempts to commit a write to a key that was written by Transaction A after B's read timestamp, B's commit is rejected with a "serialization failure" error. The client retries the transaction, which sees A's committed write.

### Race Condition 2: Intent Resolution During Commit

**Scenario:** Transaction A writes an intent to key K. A reader encounters the intent and checks A's transaction record. Between the read of the transaction record and the intent resolution, A commits.

**Resolution:** The intent resolution process is idempotent. If the reader resolves the intent as "pending" but A has since committed, the reader's resolution attempt simply converts the intent to a committed value (the correct outcome). If A had aborted, the resolution removes the intent. Both paths converge to the correct state.

### Race Condition 3: Lease Transfer During Read

**Scenario:** A client sends a read to the leaseholder. While the read is in progress, the lease transfers to a different replica. The old leaseholder may serve a stale read.

**Resolution:** Leases are tied to a specific epoch. Before serving a read, the leaseholder verifies its lease is still valid by checking the lease expiration timestamp. If the lease has expired, the read is rejected and the client retries against the new leaseholder. Lease transfers include a lease start timestamp that prevents the new leaseholder from serving reads at timestamps earlier than the old lease's last served read timestamp.

### Locking Strategy

| Operation | Lock Type | Granularity |
|-----------|-----------|-------------|
| Point read | No lock (MVCC snapshot) | Key-level timestamp check |
| Range scan | No lock (MVCC snapshot) | Scanned key range timestamp check |
| Single-key write | Exclusive intent | Key-level (write intent) |
| Multi-key transaction | Exclusive intents | Per-key intents across ranges |
| Schema change | Distributed lease | Table-level (schema change lease) |
| Range split/merge | Raft proposal | Range-level (via Raft consensus) |

---

## Bottleneck Analysis

### Bottleneck 1: Hot Range (Single Range Receives Disproportionate Traffic)

**Problem:** A single range containing a popular key (e.g., a global counter, a frequently updated row) receives write QPS that exceeds the Raft consensus throughput for that range (~2,500 writes/sec per range).

**Impact:** Writes queue behind Raft consensus; latency spikes from milliseconds to seconds.

**Mitigation:**
- Load-based range splitting: automatically split the hot range to distribute writes across multiple Raft groups
- Hash-sharded indexes for sequential keys: add a hash prefix to distribute sequential inserts (auto-increment IDs, timestamps) across ranges
- Application-level bucketing: partition counters into N buckets, each in a different range, and sum on read

### Bottleneck 2: Cross-Range Transaction Latency

**Problem:** A transaction touching 10 ranges requires intents on all 10, followed by a commit. Even with parallel commits, the latency is bounded by the slowest Raft group.

**Impact:** Tail latency (p99) is dominated by the slowest range replica.

**Mitigation:**
- Locality-aware schema design: design primary keys to co-locate related data within a single range
- Transaction pipelining: pipeline Raft proposals so that the next intent write begins before the previous one is acknowledged
- Read-only optimization: single-range read-only transactions bypass the transaction coordinator entirely

### Bottleneck 3: LSM-Tree Compaction Stalls

**Problem:** Background compaction (merging SST files across levels) consumes CPU and disk I/O. During heavy compaction, foreground read/write latency increases due to resource contention.

**Impact:** Latency spikes during compaction; write stalls if Level 0 file count exceeds threshold.

**Mitigation:**
- Rate-limited compaction: bound compaction I/O to a fraction of available disk bandwidth
- Tiered compaction for write-heavy workloads (reduces write amplification)
- Leveled compaction for read-heavy workloads (reduces space amplification and read amplification)
- Separate disk I/O queues for foreground operations and background compaction
