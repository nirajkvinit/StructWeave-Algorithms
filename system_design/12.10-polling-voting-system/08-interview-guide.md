# Interview Guide — Polling/Voting System

## 1. The 45-Minute Pacing Plan

| Time | Phase | Focus | Deliverable |
|---|---|---|---|
| 0:00–2:00 | **Clarify** | Ask questions; scope the problem | Agreed scope: poll types, scale, anonymous vs auth |
| 2:00–7:00 | **Requirements** | Functional + non-functional requirements | Write-heavy focus; CAP choice (AP + tunable); SLOs |
| 7:00–12:00 | **Estimations** | Back-of-envelope math | 60M votes/day, 100K/sec peak per poll, storage needs |
| 12:00–22:00 | **High-Level Design** | Architecture diagram + data flow | CQRS architecture; write path vs read path; key components |
| 22:00–35:00 | **Deep Dive** | Sharded counters, dedup, aggregation | The core innovation: how to handle 100K writes/sec on one entity |
| 35:00–42:00 | **Scale & Reliability** | Hot poll mitigation, fault tolerance | Adaptive sharding, auto-scaling, DR |
| 42:00–45:00 | **Wrap-Up** | Summary, trade-offs, future improvements | Key decisions recap; what you'd add with more time |

---

## 2. Meta-Commentary: What Interviewers Want to See

### The Core Signal

This problem tests your ability to handle **extreme write concentration**—millions of writes targeting a single logical entity. The interviewer wants to see that you:

1. **Recognize the hot counter problem** immediately. If you propose a simple `UPDATE count = count + 1` on a single row, you've missed the central challenge.

2. **Understand CQRS is necessary, not optional.** The write and read paths have irreconcilable requirements. Separating them isn't premature optimization—it's the only viable architecture.

3. **Can reason about consistency trade-offs.** Strong consistency for deduplication (correctness) vs eventual consistency for result tallies (performance). Explain *why* each choice is appropriate.

4. **Think about the viral scenario.** Most candidates design for average load. Strong candidates design for the worst case: the celebrity poll, the breaking-news poll, the live-TV poll.

### Common Progression of Senior vs Staff Signals

| Dimension | Senior Signal | Staff Signal |
|---|---|---|
| **Problem framing** | Identifies write-heavy nature | Quantifies the exact contention ratio (25K writes/sec per row vs 1K capacity) |
| **Counter design** | Proposes sharded counters | Explains adaptive sharding, shard count optimization, and trade-offs with read aggregation cost |
| **Dedup** | "Check before writing" | Layered dedup with Bloom filter L1, distributed set L2, DB constraint L3 |
| **Consistency** | "Use eventual consistency" | Split model: strong for dedup, eventual for tallies, with reconciliation at close |
| **Scale** | "Add more servers" | Hot poll isolation, adaptive scaling triggers, proactive pre-warming for predictable events |
| **Failure modes** | "Use replicas" | Analyzes specific failure modes: dedup store down, queue data loss, counter rebuild from audit log |

---

## 3. Questions to Ask the Interviewer

Ask these early (minute 0-2) to scope the problem correctly:

| Question | Why It Matters | Impact on Design |
|---|---|---|
| "What's the expected peak vote rate for a single poll?" | Determines if sharded counters are needed | < 1K/sec: single counter fine; > 10K/sec: sharding required |
| "Must we support anonymous voting or only authenticated users?" | Changes dedup strategy fundamentally | Anonymous = best-effort dedup (fingerprint); authenticated = exact dedup (user_id) |
| "Are results visible during active voting, or only after close?" | Determines if real-time aggregation is needed | Blind polls don't need real-time aggregation pipeline |
| "Can users change their vote?" | Adds complexity to counter operations | Vote change requires atomic decrement + increment |
| "What poll types: single-choice only, or multi/ranked?" | Ranked-choice adds algorithmic complexity | Ranked-choice requires storing ordered preferences, not just a single option |
| "Is this a standalone service or part of a larger platform?" | Determines auth, integration, and deployment constraints | Standalone: own auth; embedded: delegate to platform |

---

## 4. Trade-offs Discussion

### Trade-off 1: Sharded Counters vs Event Sourcing

| Approach | Pros | Cons | When to Choose |
|---|---|---|---|
| **Sharded counters** | Simple, fast, easy to understand; sub-ms write latency; easy to scale shards | Loss of individual vote ordering; hard to "undo" a vote | Default choice for most polling systems |
| **Event sourcing** | Complete audit trail; replay for analytics; easy vote change/retraction | Higher write amplification; complex event replay; harder to query current state | When full vote history and reprocessing are requirements |

**Recommendation:** Start with sharded counters for the write path + an append-only vote audit log for the event history. This gives you the performance of counters with the auditability of event sourcing.

### Trade-off 2: Pre-Computed Results vs On-Demand Aggregation

| Approach | Pros | Cons | When to Choose |
|---|---|---|---|
| **Pre-computed (materialized view)** | Instant reads; predictable cache performance; decoupled from write load | Stale by aggregation interval; extra infrastructure (aggregation workers) | When read volume >> write volume (most polls) |
| **On-demand aggregation** | Always fresh; no aggregation infrastructure | Expensive reads (must sum all shards); read latency scales with shard count | When freshness is critical and read rate is low |

### Trade-off 3: In-Memory Dedup vs Database Dedup

| Approach | Pros | Cons | When to Choose |
|---|---|---|---|
| **In-memory (distributed cache)** | Sub-ms latency; handles 100K+ checks/sec | Data loss on cache failure; memory cost for large polls | Default: high throughput, with DB as safety net |
| **Database (unique index)** | Durable; zero data loss risk | 5-10ms latency; bottleneck at high write rates | Safety net only; primary dedup must be in-memory |

### Trade-off 4: WebSocket vs Server-Sent Events vs Polling

| Approach | Pros | Cons | When to Choose |
|---|---|---|---|
| **WebSocket** | Bidirectional; lowest latency; efficient for frequent updates | Connection overhead; harder to scale through CDN/proxies | Live events with real-time results |
| **SSE** | Simpler than WS; works with CDN; auto-reconnect built in | One-directional only; no binary support | Standard polls with periodic updates |
| **Long polling** | Universal compatibility; works with all proxies/firewalls | Higher latency; more server resources per client | Fallback for restrictive network environments |

---

## 5. Trap Questions & How to Handle Them

### Trap 1: "Can't you just use a single counter with a database?"

**The trap:** Testing if you understand write contention at scale.

**Strong answer:** "A single row handles ~1,000 increments/sec before row-level locking degrades performance. A viral poll with 100K votes/sec needs at least 100 shards per option to avoid contention. This is the fundamental reason for sharded counters—not premature optimization, but a mathematical necessity."

### Trap 2: "Why not use a message queue and count messages?"

**The trap:** Conflating message count with vote count; ignoring deduplication.

**Strong answer:** "Message count != vote count because: (1) at-least-once delivery means duplicate messages, (2) we need real-time counts not eventual counts, (3) queue consumers may fail and retry. The queue is for decoupling ingestion from processing, not for counting. Sharded counters with explicit deduplication give us accurate counts."

### Trap 3: "Why not use blockchain for vote integrity?"

**The trap:** Testing if you can evaluate technology hype critically.

**Strong answer:** "Blockchain adds write latency (consensus), throughput limits (block size/time), and operational complexity. For a polling platform (not a government election), the integrity requirements are met by an append-only audit log with hash chaining, which provides tamper evidence without the consensus overhead. Blockchain is appropriate for trustless multi-party scenarios, but our platform is the trusted authority."

### Trap 4: "What if the Bloom filter gives a false positive?"

**The trap:** Testing if you understand the Bloom filter's role in the pipeline.

**Strong answer:** "A false positive means the Bloom filter says 'this user might have voted' when they haven't. The request falls through to L2 (distributed set check), which is authoritative. The L2 check correctly determines the user hasn't voted and allows the vote. False positives increase L2 load slightly but never cause a correctness issue. Bloom filters have *no false negatives*—if it says 'definitely not voted,' that's guaranteed correct."

### Trap 5: "How do you handle a vote arriving after the poll closes?"

**The trap:** Testing awareness of the close-time race condition.

**Strong answer:** "There's a `Closing` state between `Active` and `Closed`. When the end time is reached: (1) the API stops accepting new votes (returns 400), (2) the system drains all in-flight votes from the queue (30-second timeout), (3) a final synchronous aggregation runs, (4) results are verified against the dedup set count, (5) results are marked authoritative. Any vote that was queued before the API started rejecting is counted. Any vote that arrives after the API starts rejecting is not."

### Trap 6: "What happens when a shard counter node fails?"

**The trap:** Testing understanding of partial failures in sharded systems.

**Strong answer:** "If a counter node fails, the shards on that node become temporarily unavailable. New votes targeting those shards fail, but the ingestion tier retries with exponential backoff (the vote is already recorded in the dedup set and queue). The failed node's shards have replicas that are promoted. Aggregation uses the last known values for unavailable shards—results are temporarily stale but converge once the node recovers. No votes are lost because the queue preserves unprocessed votes."

### Trap 7: "Why not just use a distributed lock for deduplication?"

**The trap:** Testing if you understand the performance implications of distributed locks.

**Strong answer:** "A distributed lock for each vote means acquiring and releasing a lock per (user_id, poll_id) pair at 100K votes/sec. Even with fine-grained locks, this creates enormous coordination overhead. Instead, we use SADD's atomic semantics—it's effectively a compare-and-swap: 'add this element if it doesn't exist and tell me if it was new.' This achieves the same correctness guarantee as a lock but with single-operation latency, no deadlock risk, and no lock lease management."

---

## 6. Common Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| **Single counter per option** | Row-level locking caps at ~1K writes/sec; fails at scale | Sharded counters: N shards per option, writes randomly distributed |
| **Dedup on the read path** | "Check if voted when rendering results" doesn't prevent double-counting | Dedup on the write path: reject duplicates before incrementing counters |
| **Synchronous aggregation on every vote** | At 100K votes/sec, aggregating on every write wastes 99% of compute | Async periodic aggregation (100ms–5s interval) |
| **Ignoring the close-time race** | Votes in flight when poll closes are lost or miscounted | Explicit `Closing` state with queue drain and reconciliation |
| **"Just add more replicas"** | Read replicas don't help with write throughput | Write-side sharding is needed; replicas help reads only |
| **Ignoring anonymous voting complexity** | "Just use user_id" doesn't work for anonymous polls | Composite fingerprint (IP + UA + device + session) with best-effort dedup |
| **Over-engineering with blockchain** | Adds latency and complexity for a problem that doesn't require trustless consensus | Hash-chained audit log provides tamper evidence without consensus overhead |
| **Forgetting WebSocket fan-out scale** | 1M subscribers × 2 updates/sec = 2M messages/sec | Hierarchical fan-out; reduced frequency for large audiences; SSE fallback |

---

## 7. Extension Topics (If Time Permits)

| Topic | Key Points | When to Bring Up |
|---|---|---|
| **Ranked-choice voting** | Instant-runoff requires storing ordered preferences; multiple elimination rounds; computationally more expensive than simple count | If interviewer asks about poll types |
| **Weighted voting** | Different voter classes have different weights; sharded counters store weighted increments; requires trust in voter classification | If interviewer asks about fairness |
| **Multi-region voting** | Per-region dedup + async sync; cross-region dup window < 500ms; final reconciliation at close | If interviewer asks about global deployment |
| **Embeddable widgets** | Third-party JavaScript; CORS configuration; API key authentication; rate limiting per embedding domain | If interviewer asks about distribution |
| **Poll recommendation** | Collaborative filtering based on voting history; trending detection; personalized poll feed | If interviewer shifts to engagement features |
| **Regulatory compliance** | GDPR right to deletion; anonymization of vote records; data residency requirements | If interviewer asks about privacy |

---

## 8. 5-Minute Condensed Version

If the interviewer says "give me the 5-minute version":

> "A polling system's core challenge is **write concentration**: millions of votes targeting one entity. I'd use **CQRS** with **sharded counters** on the write side—each poll option's count is split across N shards so writes don't contend on a single row. **Deduplication** uses a layered approach: in-memory Bloom filter for fast rejection, distributed set for authoritative check, database unique constraint as safety net. Results are served from a **materialized view** in cache, updated by an async aggregation worker every 100-500ms. For **hot polls**, the system adaptively increases shard count, isolates to dedicated resources, and reduces WebSocket push frequency. Poll closure includes a **reconciliation phase** that drains in-flight votes and cross-verifies the dedup count against the shard total. The key trade-off is **strong consistency for dedup** (correctness) vs **eventual consistency for results** (performance)."
