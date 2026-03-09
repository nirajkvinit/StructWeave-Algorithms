# Interview Guide — Live Leaderboard System

## 45-Minute Pacing Strategy

### Minute 0–3: Problem Clarification (3 minutes)

**Goal**: Demonstrate structured thinking by asking targeted questions before designing.

```
Essential Clarification Questions:

1. "What's the scale? How many players and how many concurrent leaderboards?"
   → Determines single-instance vs. sharded architecture

2. "What type of scoring? Highest score, cumulative, or latest?"
   → Shapes the core data operation (ZADD vs. ZINCRBY)

3. "What query patterns matter most? Top-N, individual rank, or around-me?"
   → Drives caching and read optimization strategy

4. "Are scores server-authoritative or client-reported?"
   → Determines validation pipeline complexity

5. "Are there seasonal resets? How frequently?"
   → Introduces lifecycle management as a design concern

6. "Is this for competitive play with prizes, or casual engagement?"
   → Drives anti-cheat and consistency requirements
```

**Red Flag**: Jumping straight to "Redis sorted sets" without understanding requirements. Show you think about the problem before reaching for solutions.

### Minute 3–8: Requirements & Estimation (5 minutes)

**Goal**: Translate clarifications into concrete numbers.

```
Quick Estimation Framework:

  Players: 100M total, 10M DAU
  Score updates: 50K/sec sustained, 200K/sec peak
  Rank queries: 200K/sec sustained (4:1 read-write ratio)
  Memory per 10M entries: ~1.2 GB (120 bytes × 10M)
  Total memory for 100M: ~12 GB (manageable, but needs sharding)

  Key SLOs:
    Rank query: P99 < 50ms
    Score propagation: P99 < 500ms
    Availability: 99.99% reads, 99.95% writes

State these quickly. Don't spend too long on math unless asked.
```

### Minute 8–20: High-Level Design (12 minutes)

**Goal**: Draw the architecture, explain CQRS split, and walk through data flows.

```
Architecture Walkthrough Order:

1. Draw the CQRS split (2 min):
   - Write path: Game Server → API Gateway → Validation → Event Log → Queue → Ranking Engine
   - Read path: Client → CDN → Cache → Query Service → Read Replica

2. Explain key components (5 min):
   - Ranking Engine: sorted sets (skip list + hash table)
   - Why sorted sets? O(log N) for insert, rank, and range queries
   - Event log for durability (scores persisted before ranking)
   - Read replicas for scaling queries

3. Walk through score submission flow (2.5 min):
   - Validation → event log write → queue publish → ZADD → replication

4. Walk through rank query flow (2.5 min):
   - CDN check → cache check → read replica query → enrich with metadata
```

### Minute 20–35: Deep Dive (15 minutes)

**Goal**: Demonstrate depth on the most interesting aspects. Choose 2-3 topics based on interviewer interest.

```
Topic Selection (pick what the interviewer leans toward):

Topic A: Sharding (if scale is emphasized)
  - Hash-based vs. score-range vs. hybrid sharding
  - Scatter-gather for cross-shard rank computation
  - K-way merge for sharded top-N
  - Approximate ranking with bucket counting

Topic B: Real-Time Updates (if latency is emphasized)
  - WebSocket subscription model for rank changes
  - Delta compression: only send rank changes, not full board
  - Fan-out challenge: 100K rank changes/sec to 5M subscribers
  - Selective notification: only notify if rank changed by > threshold

Topic C: Seasonal Resets (if lifecycle is emphasized)
  - Atomic key rotation with pointer swap
  - Pre-warming new season sorted sets
  - Handling in-flight writes during swap
  - Archive and snapshot management

Topic D: Anti-Cheat (if integrity is emphasized)
  - Server-authoritative scoring
  - Proof-based validation with HMAC signatures
  - Statistical anomaly detection (z-score, temporal analysis)
  - Shadow banning implementation
```

### Minute 35–45: Extensions & Trade-offs (10 minutes)

**Goal**: Show breadth and maturity in design thinking.

```
Trade-off Discussions to Offer:

1. Exact rank vs. approximate rank (latency vs. accuracy)
2. Push vs. pull for real-time updates (connection cost vs. latency)
3. Single sorted set vs. sharded (simplicity vs. scale)
4. In-memory only vs. persistent (speed vs. durability)
5. CDN caching (freshness vs. load reduction)
```

---

## Common Trap Questions & How to Handle Them

### Trap 1: "Why not just use a SQL database?"

```
Why It's a Trap:
  Interviewers want to see if you understand WHY sorted sets are better,
  not just that you know to use them.

Bad Answer:
  "Redis is faster." (Superficial)

Good Answer:
  "The fundamental issue is rank computation. In SQL, getting a player's rank
  requires COUNT(*) WHERE score > player_score, which is O(N) — about 35 seconds
  on 50M rows even with indexes. A sorted set uses a skip list that maintains
  order during insertions, making ZREVRANK O(log N) — sub-millisecond even at
  50M entries. It's not just about being 'faster' — it's a different algorithmic
  complexity class."

  "That said, we DO use a relational database for durable storage, player
  metadata, and historical queries. The sorted set is the ranking engine,
  not the source of truth. The event log is the source of truth."
```

### Trap 2: "What if the sorted set instance goes down?"

```
Why It's a Trap:
  Tests whether you understand the durability model and recovery strategy.

Bad Answer:
  "We have replicas, so it's fine." (Incomplete)

Good Answer:
  "The sorted set instance is a derived view, not the source of truth.
  The event log contains every validated score event. If the primary and
  all replicas fail simultaneously:

  1. We provision a new instance
  2. Replay the event log from the last checkpoint
  3. Rebuild the sorted set from events (ZADD each score)
  4. Rebuilding 50M entries takes ~10-30 minutes

  During recovery, read traffic gets stale cache responses. Write traffic
  is buffered in the message queue (bounded buffer, with backpressure
  at API gateway if the buffer fills). The critical insight is separating
  the 'source of truth' (event log) from the 'fast query layer' (sorted set)."
```

### Trap 3: "How do you handle a leaderboard with 1 billion entries?"

```
Why It's a Trap:
  Tests whether you can scale beyond a single sorted set's capacity
  and handle the distributed ranking problem.

Bad Answer:
  "Just shard it." (How exactly?)

Good Answer:
  "A billion entries at 120 bytes each = ~120 GB. That's 20+ shards at
  50M entries each. The challenge isn't storage — it's that rank computation
  now requires scatter-gather across 20 shards for every rank query.

  Three strategies in increasing sophistication:

  1. Hash-shard + scatter-gather: Every rank query fans out to all 20 shards.
     Latency: ~50ms parallelized. Works for moderate query rates.

  2. Approximate ranking: Precompute score-range buckets (histogram) every
     1-5 minutes. A player's percentile is interpolated from their bucket.
     Accuracy: ±0.1%. Latency: O(1) lookup. Works for 99% of use cases.

  3. Hybrid sharding: Keep a 'top tier' shard with the top 10,000 entries
     (score-range partitioned). The general population is hash-sharded.
     Top-N queries hit only the top tier. Individual ranks use approximate
     percentile for general population, exact rank for top tier."
```

### Trap 4: "How do you handle friend leaderboards at scale?"

```
Why It's a Trap:
  The naive approach (500 ZSCORE calls per friend) doesn't scale
  when millions of players request friend leaderboards simultaneously.

Bad Answer:
  "Just pipeline the ZSCORE calls." (Doesn't address scale)

Good Answer:
  "A player with 200 friends requesting a friend leaderboard triggers
  200 ZSCORE operations. Pipelining helps (single round-trip), but
  at 1M concurrent friend leaderboard requests, that's 200M ops/sec.

  The scalable approach:
  1. Use ZMSCORE (multi-key lookup) — single command for all friends
  2. Cache the result for 30 seconds (friend leaderboard changes slowly)
  3. For very active players, precompute friend leaderboard periodically
  4. Consider client-side sorting: send raw scores to client, let client sort
     (transfers 200 × 16 bytes = 3.2 KB — trivial bandwidth)

  The key insight is that friend leaderboards don't need to be real-time.
  A 30-second cache is perfectly acceptable because players won't notice
  a 30-second delay in their friend rankings."
```

### Trap 5: "What happens during a seasonal reset?"

```
Why It's a Trap:
  Tests lifecycle management and distributed coordination.

Bad Answer:
  "Just delete the sorted set and start fresh." (Terrible UX)

Good Answer:
  "A naive DELETE creates three problems: thundering herd of new submissions,
  empty leaderboard visible to players, and loss of historical data.

  The solution is atomic key rotation:
  1. Pre-warm: Create new season sorted set (empty but allocated)
  2. Snapshot: Capture current season state from a replica
  3. Swap: Atomically change the 'active season' pointer
  4. Drain: Route in-flight old-season events correctly by timestamp
  5. Archive: Move old season data to object storage asynchronously

  The swap is a single SET operation on a pointer key. Clients never see
  an empty leaderboard — they see the previous season's data until the
  pointer changes, then they see the new (initially sparse) season.
  The critical detail is handling in-flight events: a score event published
  before the swap but consumed after must be routed to the correct season."
```

### Trap 6: "How do you prevent cheating?"

```
Why It's a Trap:
  Many candidates only mention client-side anti-cheat. The interviewer
  wants to hear about server-authoritative architecture.

Bad Answer:
  "We can validate scores on the client." (Never trust the client)

Good Answer:
  "The first principle is server-authoritative scoring. Scores originate
  from game servers, not clients. The game server computes the score
  from its authoritative game state and signs the submission with an HMAC.

  The validation pipeline has two stages:
  - Synchronous (< 50ms): signature verification, bounds checking,
    rate limiting, statistical plausibility (z-score test)
  - Asynchronous: deep behavioral analysis, cross-player correlation,
    replay verification

  For detected cheaters, we use shadow banning: the cheater sees their
  own rank normally, but they're invisible to all other players. This is
  more effective than an outright ban because the cheater doesn't know
  they've been caught and doesn't create a new account immediately."
```

---

## Key Trade-offs to Discuss

### Trade-off 1: Exact Rank vs. Approximate Rank

```
Exact Rank:
  + 100% accurate
  + Required for prize distribution
  - O(shard_count) scatter-gather for sharded leaderboards
  - Higher latency at scale

Approximate Rank (Bucket-Based):
  + O(1) lookup from precomputed histogram
  + ±0.1% accuracy (sufficient for "top 5%" display)
  - Stale by bucket refresh interval (1-5 minutes)
  - Not suitable for tournament finals

Recommendation:
  Use exact rank for top-1000 and prize boundaries.
  Use approximate rank for general population percentile display.
  Let the client choose via query parameter: ?rank_type=exact|approximate
```

### Trade-off 2: Memory vs. Speed

```
All In-Memory:
  + Sub-millisecond operations
  + Simple architecture
  - Expensive (12 GB for 100M entries + replicas)
  - Limited by physical RAM

Tiered (Hot/Warm/Cold):
  + Cost-effective for large leaderboard portfolio
  + Scale to millions of leaderboards
  - On-demand loading adds latency (100-500ms for cold load)
  - Eviction policy complexity

Recommendation:
  Active competitive leaderboards: always in-memory
  Inactive/historical leaderboards: tiered with on-demand loading
```

### Trade-off 3: Consistency vs. Availability

```
Strong Consistency (Synchronous Replication):
  + Readers always see the latest rank
  + No "my rank went backward then forward" anomaly
  - Higher write latency (wait for replica acknowledgment)
  - Reduced availability during network partitions

Eventual Consistency (Async Replication):
  + Lower write latency
  + Higher availability (primary operates independently)
  - Readers may see stale rank (10-100ms lag)
  - "Phantom rank" during replication lag

Recommendation:
  Eventual consistency for 99% of queries (from replicas).
  Strong consistency ONLY for tournament finals and prize-determining queries.
  Return "rank_freshness" timestamp so clients know data age.
```

### Trade-off 4: Simplicity vs. Feature Richness

```
Simple Leaderboard (MVP):
  - Single sorted set per leaderboard
  - Top-N and individual rank queries only
  - No sharding, no friend leaderboards
  - Development time: 2 weeks

Full-Featured Leaderboard:
  - Sharded ranking engine
  - Friend leaderboards, around-me, percentile
  - Real-time WebSocket notifications
  - Anti-cheat, seasonal resets, snapshots
  - Development time: 3-6 months

Interview Strategy:
  Start with MVP, then layer complexity based on requirements.
  Show you can identify what's essential vs. what's nice-to-have.
```

---

## Scoring Rubric (What Interviewers Look For)

| Dimension | Junior Signal | Senior Signal | Staff+ Signal |
|---|---|---|---|
| **Data Structure** | "Use a database" | "Use Redis sorted sets for O(log N) rank" | "Sorted set uses skip list internally; discuss trade-offs vs. B-tree, segment tree" |
| **Scaling** | "Add more servers" | "Shard by player_id with scatter-gather" | "Hybrid sharding with top-tier + approximate ranking for general population" |
| **Consistency** | Not discussed | "Use replicas, accept eventual consistency" | "Tiered consistency: async for general, sync for prize-determining; return freshness metadata" |
| **Anti-cheat** | "Validate on client" | "Server-authoritative scoring" | "Multi-layer: HMAC proofs, statistical z-score, behavioral profiling, shadow banning" |
| **Lifecycle** | Not discussed | "Delete and recreate" | "Atomic key rotation, pre-warming, in-flight event routing, async archival" |
| **Real-time** | "Polling every second" | "WebSocket for push updates" | "Selective notification, delta compression, fan-out scaling, connection management at 5M+ concurrent" |
| **Trade-offs** | One-sided decisions | "We could do X or Y" | "X is better for this workload because [specific reasoning], but transitions to Y when [condition changes]" |

---

## Whiteboard Tips

```
Drawing Order:
  1. Start with client → API gateway → two paths (write/read)
  2. Write path: validation → event log → queue → ranking engine
  3. Read path: CDN → cache → query service → read replica
  4. Add data stores: sorted sets, event log, player store
  5. Add supporting services: notifications, snapshots, anti-cheat

Notation:
  - Use solid arrows for synchronous calls
  - Use dashed arrows for async/replication
  - Label arrows with operation names (ZADD, ZREVRANK)
  - Mark latency expectations at key boundaries

Key Numbers to Have Ready:
  - Sorted set entry: ~120 bytes
  - ZADD/ZRANK: O(log N), < 1ms for 50M entries
  - 50M entries: ~6 GB memory
  - Single instance: ~100K writes/sec, ~200K reads/sec
  - SQL rank query: O(N), ~35 seconds for 50M rows
```

---

## Differentiation Opportunities

```
Mention These If Time Permits:

1. Composite scores for tiebreaking:
   Encode timestamp in fractional part of score for deterministic ordering.

2. Leaderboard tiering (hot/warm/cold):
   Not all leaderboards deserve dedicated in-memory instances.

3. Event sourcing:
   The event log isn't just for durability — it enables replaying history,
   auditing disputed scores, and rebuilding rankings from scratch.

4. Progressive detail in caching:
   CDN caches top-100 (5s TTL), response cache handles top-1000 (1s TTL),
   around-me queries go to replicas (real-time).

5. Percentile as a product feature:
   "Top 5%" is more meaningful to most players than "rank 47,293."
   Bucket-based percentile is O(1) vs. O(log N) for exact rank.
```

---

*Previous: [Observability](./07-observability.md) | Next: [Insights →](./09-insights.md)*
