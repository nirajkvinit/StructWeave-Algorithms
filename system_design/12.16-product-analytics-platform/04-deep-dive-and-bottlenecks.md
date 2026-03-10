# 12.16 Product Analytics Platform — Deep Dives & Bottlenecks

## Deep Dive 1: Event Ingestion Pipeline

### Architecture Detail

The ingestion pipeline must accept arbitrary event bursts while maintaining ordering guarantees strong enough for downstream funnel computation. The pipeline operates in three stages: collection, queuing, and stream processing.

**Collection tier** operates as a stateless HTTP service pool behind a load balancer. Each collector node:
1. Performs fast syntactic validation (required envelope fields, timestamp sanity check — reject events timestamped more than 7 days in the past or future)
2. Resolves anonymous\_id to user\_id via an identity resolution cache (maintained by an identify() call on login)
3. Enriches the event with geo-IP data and user-agent parsing
4. Checks the per-project bloom filter for duplicate event\_id
5. Writes accepted events to the partitioned message queue

The bloom filter check is the critical optimization: for a project receiving 1M events/day, the bloom filter has a false positive rate of 0.01% (configured for 72-hour lookback window). The filter is implemented as a counting bloom filter to support deletion (necessary for GDPR erasure of queued events).

**Queue partitioning** is by `(project_id HASH % partition_count)`. This ensures all events for a project flow through the same partition, which is critical for session reconstruction and identity stitching. However, this creates a hotspot risk when a single large customer has a traffic spike. Mitigation: overflow routing that detects partition saturation and creates temporary sub-partitions keyed by `(project_id, session_id HASH)` during spike periods.

**Stream processors** maintain a consumer group per partition and perform:
- Identity resolution: `anonymous_id → user_id` mapping (Redis cache, 24h TTL)
- Schema governance: validate against registered event schema if one exists; attach violation flags
- PII scanning: regex patterns for email, phone, SSN, credit card (surface flags; do not block)
- Dual writes: hot columnar store for immediate query availability; Parquet write-ahead for warm store

### Bottleneck: Late-Arriving Events

Events arriving up to 72 hours after event\_time create a correctness problem: pre-computed rollups calculated before the late event arrived are now stale. The resolution strategy is a two-phase system:

- **Phase 1 (0–60s):** Events written to hot store; rollups updated in-place atomically via idempotent merge
- **Phase 2 (24–72h):** Late events trigger a recomputation job for the affected date partition only; recomputed results replace stale rollups via a versioned swap (old rollup marked expired; new rollup atomic-committed)

A "staleness flag" is attached to query results that include date ranges with pending late-event recomputation, surfaced to users as "data for DATE may be updated within 72 hours."

### Bottleneck: Identity Stitching Across Devices

A user signs up on web (anonymous\_id A), later logs in on mobile (user\_id U). The identify call links U to A. But historical events with anonymous\_id A are already stored—they predate the identify call.

**Problem:** funnel queries that filter by user\_id U will miss the pre-identify web session events.

**Solution:** A graph-based identity table maps anonymous\_id → canonical user\_id. Funnel queries automatically expand user\_id filters through the identity graph: `user_id IN {U, A, ...all aliases}`. The identity graph is stored as a simple hash map in a key-value store (anonymous\_id → canonical\_user\_id), populated on every identify() call and propagated to query nodes on update.

---

## Deep Dive 2: Funnel Computation Engine

### Ordered Step Matching with Conversion Window

The funnel engine's core challenge is enforcing strict temporal ordering across steps while supporting arbitrary property breakdowns and exclusion steps—all within a sub-second query budget.

**Naive approach:** For each user, fetch all events, sort by timestamp, and check for each step in order within the time window. This is O(users × events\_per\_user × steps) and does not parallelize well.

**Production approach:** Decompose into parallel per-step scans, then join:

```
Phase 1: Per-step columnar scan (all steps in parallel)
  For step S with event_name E and filters F:
    Scan events partition WHERE event_name = E AND project_id = P AND date BETWEEN start AND end
    For each matching row: emit (user_id, event_timestamp, property_values)
    Result: user_step_table[S] = sorted list of (user_id, min_timestamp_for_this_step_per_user)

Phase 2: Step intersection with time window
  Start with step_0_users = set of user_ids in user_step_table[0]
  For each subsequent step S:
    Intersect step_S_users with step_{S-1}_users
    For each user in intersection:
      Check: step_S.timestamp >= step_{S-1}.timestamp (ordering constraint)
      Check: step_S.timestamp - step_0.timestamp <= conversion_window
    Remaining users form step_S qualified set

Phase 3: Breakdown computation
  For each breakdown dimension (e.g. "platform"):
    For each unique value of platform:
      Count qualified users at each step whose platform = value
```

The critical optimization is that Phase 1 scans run in parallel across storage tiers, and the result sets are small (one row per user per step, not one row per event per user). Even for 10M users with 5 steps, each step result set is 10M rows × 24 bytes = 240MB—fits in working memory per query worker.

### Exclusion Steps

An exclusion step filters out users who performed a disqualifying event between step N and step N+1. Implementation:

```
exclusion_bitmap = set of users who hit exclusion_event between step_N and step_N+1
qualified_step_N = qualified_step_N AND_NOT exclusion_bitmap
```

Exclusion steps increase query complexity but not asymptotic complexity—they add one parallel scan per exclusion step.

### Time-Window Per-Step vs. Global

Two time window modes exist:
1. **Global window:** User must complete all steps within conversion\_window from step 0 (simpler, common)
2. **Per-step window:** Each consecutive step pair has its own time limit (more granular, rarer)

The per-step window requires tracking the timestamp at each step for each user rather than just the step-0 timestamp, increasing memory by a factor of (number of steps). For large funnels, this is mitigated by streaming the computation step by step and discarding previous timestamps.

---

## Deep Dive 3: Retention Engine

### Cohort Matrix Pre-Computation

Retention queries are expensive when computed fully ad hoc: a 12-week retention chart over a 6-month window requires 72 individual "did user return in week X after cohort week Y?" lookups, each scanning weeks of events. The retention engine pre-materializes the cohort matrix incrementally.

**Incremental retention update:** When a return event is received for user U:
1. Look up U's cohort membership (which cohort periods does U belong to, for which return events?)
2. For each cohort membership, determine which return period this event falls into
3. Atomically set `retention_matrix[cohort_period][return_period].add(U)` on the cohort bitmap

This transforms retention computation from a batch query into a streaming update: each returning event adds one user to one cell of the matrix. The matrix is a 2D array of roaring bitmaps stored in the hot store, synced periodically to the warm/cold stores.

**Query-time computation:** When a retention query arrives, the engine:
1. Fetches the pre-computed cohort bitmaps for the requested time range
2. Computes cardinality of each cohort-period × return-period bitmap pair
3. Divides by cohort size to produce retention percentages
4. Applies any requested breakdown by fetching sub-cohorts split by property value

This reduces retention query time from O(events_in_window) to O(cohort_periods × return_periods) — typically a 100× speedup.

### Defining "Return"

Different retention definitions require careful engine support:

- **N-Day retention (strict):** User must have a return event on exactly calendar day N (not day N+1, not day N-1). Used for engagement analytics.
- **Unbounded retention:** User must have a return event on or after day N. Once a user returns, they stay "retained" for all subsequent periods. Used for billing retention.
- **Bracket retention:** User must have a return event within day ranges [D1, D2]. Used for periodic products (weekly users, monthly subscribers).

Each definition produces a different cohort matrix structure. The engine parameterizes on retention\_type and generates the correct matrix-building logic.

---

## Deep Dive 4: Path Analysis Engine

### Session Reconstruction at Scale

Path analysis requires reconstructing ordered event sequences per session—a fundamentally different access pattern from funnel queries (which access events by user\_id, not session\_id). The columnar event store is sorted by user\_id, not session\_id, so session reconstruction requires a secondary index or a separate session-ordered store.

**Secondary session index:** A compact index maps `(project_id, session_id) → list of (event_offset, event_name, timestamp)`. This index is much smaller than the full event store (no properties, just names and timestamps) and fits in warm storage with fast random access. Path queries look up session IDs in the index, then fetch full event details only for sessions containing the anchor event.

**Session timeout handling:** A session is defined as a sequence of events from one user with no gap > session\_timeout (default 30 min). Sessions are reconstructed at write time by the stream processor: when a new event arrives with a gap > 30 min from the previous event for that anonymous\_id, a new session\_id is assigned.

### Top-N Path Pruning

A naive path graph can have millions of unique edges (every distinct event-to-event transition). For visualization, only the top N edges (by frequency) are returned. Pruning strategy:

1. Build the full edge count map during scan
2. Apply minimum edge weight threshold: discard edges with count < 1% of anchor event count
3. Sort remaining edges by weight descending
4. Return top N edges, ensuring graph is connected (no dangling nodes)
5. Aggregate all pruned paths into a single "(other)" node at each depth level

---

## Race Conditions & Edge Cases

### Race Condition 1: Concurrent Rollup Updates

When two stream processor instances attempt to update the same rollup cell for the same time window, concurrent writes can produce incorrect aggregates (lost update problem).

**Resolution:** Each rollup cell write uses compare-and-swap (CAS) semantics. The stream processor reads the current value, computes the new value, and CAS-writes. On conflict, it retries. For high-frequency rollup cells (popular events in large projects), contention can cause retry storms.

**Mitigation:** Use per-processor partial rollups: each processor maintains its own rollup accumulator and flushes to the shared rollup store every 10 seconds. The flush operation uses a merge function (addition for counts, bitmap union for distinct users) rather than a pure write, which is commutative and idempotent. This reduces CAS contention by 10–100× at the cost of 10s rollup staleness.

### Race Condition 2: Identity Resolution During Funnel Query

If a user performs step 1 as anonymous, then identify()s, then performs step 2 as user\_id, and a funnel query runs during this window, the funnel engine may not connect the two events.

**Resolution:** Identity resolution is applied at query time, not just at ingestion time. The funnel query expands user\_id filters through the current state of the identity graph. This means even pre-identify events are correctly attributed to the user's canonical ID when queries run after identification.

### Edge Case: Events with Future Timestamps

Client clocks can be wrong, causing events to arrive with timestamps up to hours or days in the future. Accepting these events would corrupt date partitions.

**Resolution:** Server-assign a `server_received_at` timestamp. Use `client_timestamp` for user-facing analytics (preserves intended event order within sessions) but use `server_received_at` for partition placement. Events with `client_timestamp` more than 7 days in the future are rewritten to `server_received_at` with a flag indicating clock skew.

### Edge Case: Extremely High-Cardinality Property Values

A property like `user_email` or `full_url` can have as many unique values as events, destroying dictionary encoding efficiency and causing massive bloom filter and index overhead.

**Detection:** Governance scorer computes cardinality of each property per day. Properties with cardinality > 1M within a 24-hour window are flagged as high-cardinality. Affected properties are excluded from breakdown dimensions and their dictionary encoding is replaced with direct storage.
