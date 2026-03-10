# Insights — Polling/Voting System

## Insight 1: Sharded Counters Transform Write Contention into a Configuration Problem

**Category:** Contention

**One-liner:** Distributing a single logical counter across N physical shards reduces write contention by 1/N, turning a hard scaling limit into a tunable parameter.

**Why it matters:** A single database row can sustain approximately 1,000 atomic increments per second before row-level locking causes severe performance degradation. When a viral poll receives 100,000 votes per second across 4 options, each option needs 25,000 increments per second—25× beyond the single-row limit. Sharded counters distribute these writes across N independent keys, each handling increments without coordinating with the others. With 50 shards per option, each shard absorbs only 500 writes per second—well within safe limits. The trade-off is read complexity: retrieving the total requires reading and summing all N shards. But this trade-off is favorable because reads can be batched (MGET) and cached, while writes cannot.

---

## Insight 2: CQRS Is Architecturally Necessary, Not an Optimization Choice

**Category:** System Modeling

**One-liner:** When write and read paths have irreconcilable performance profiles, CQRS is the only viable architecture—not a premature optimization.

**Why it matters:** In most systems, CQRS is a design choice weighed against its added complexity. In a high-throughput voting system, it's a mathematical necessity. The write model (sharded counters optimized for 100K+ increments per second) and the read model (a single aggregated result optimized for millions of reads per second) cannot coexist in one data structure. A single-model approach forces an impossible choice: optimize for writes (shards) and make reads expensive (sum all shards on every request), or optimize for reads (single row) and make writes contend. CQRS eliminates this tension by giving each path its ideal data structure, connected by an asynchronous aggregation pipeline.

---

## Insight 3: Bloom Filters Create a Zero-Network-Cost Deduplication Layer

**Category:** Data Structures

**One-liner:** A 12 MB Bloom filter rejects 60%+ of duplicate votes in microseconds, eliminating network round-trips for the most common dedup case.

**Why it matters:** Deduplication requires checking every incoming vote against all previous votes for that poll—a read operation on the critical write path. At 100,000 votes per second, even a 1ms network round-trip for each dedup check consumes 100 CPU-seconds per second just waiting for responses. A Bloom filter stored in local memory at each ingestion node checks for duplicates in approximately 1 microsecond—three orders of magnitude faster. The filter has no false negatives (if it says "not voted," that's guaranteed), so non-duplicate votes pass through without any network call. False positives (approximately 1%) harmlessly fall through to the authoritative L2 check. This pattern—probabilistic fast-path rejection backed by authoritative slow-path verification—applies broadly to any system where a uniqueness constraint must be enforced at extreme throughput.

---

## Insight 4: The Closing State Is a Consistency Reconciliation Phase

**Category:** Consistency

**One-liner:** Polls need an explicit transitional state between "active" and "closed" to drain in-flight votes and produce authoritative final results.

**Why it matters:** When a poll's end time arrives, the system cannot simply freeze the counters. Votes are distributed across a pipeline: some are in the HTTP response path, some are in the dedup check, some are queued but not yet counted, and some are in the counter increment batch. An abrupt close would lose these in-flight votes. The `Closing` state solves this by: (1) rejecting new votes at the API layer, (2) draining all queued votes (30-second timeout), (3) performing a final synchronous aggregation across all shards, and (4) cross-verifying the shard total against the dedup set cardinality. This reconciliation phase ensures the final result is exactly correct—not approximately correct—which is critical for high-stakes polls where the margin might be a single vote.

---

## Insight 5: Adaptive Shard Scaling Must Be Unidirectional During Active Polls

**Category:** Scaling

**One-liner:** Shards can safely scale up (add new shards initialized to zero) but must never scale down during an active poll, because removing shards would destroy count data.

**Why it matters:** When a poll's vote velocity increases, the system adds more shards to distribute write load. This is safe because new shards start at zero and existing shards retain their counts—aggregation simply sums more keys. But reducing shards during an active poll is destructive: removing shard #47 loses whatever count it held. This creates an asymmetry where scaling up is instant and safe, but "scaling down" can only happen after the poll closes by rebuilding counters with fewer shards. This unidirectional scaling pattern appears in other distributed systems where the scaling unit holds state (e.g., database partition splits are easy; merges are hard).

---

## Insight 6: The SADD Return Value Is a Lock-Free Compare-and-Swap

**Category:** Atomicity

**One-liner:** The atomic set-add operation's return value (1 = newly added, 0 = already existed) functions as a compare-and-swap without explicit locking, solving the concurrent dedup race condition.

**Why it matters:** A naive dedup implementation checks existence (SISMEMBER) then records the vote (SADD) in two separate operations. Between these operations, a concurrent request for the same user can also pass the existence check, resulting in a double-vote. Distributed locks solve this but add latency and deadlock risk. The elegant solution uses SADD alone: its return value indicates whether the element was newly added (1) or already existed (0). Only the request that receives 1 proceeds—all others are duplicates. This single-operation approach provides the same correctness guarantee as a lock with none of the coordination overhead. The pattern generalizes to any concurrent uniqueness enforcement where the storage engine supports atomic conditional insertion.

---

## Insight 7: Hierarchical Fan-Out Prevents WebSocket Gateway Saturation

**Category:** Streaming

**One-liner:** When a viral poll has 1 million+ subscribers, a single fan-out source saturates any gateway; hierarchical distribution through edge servers makes it tractable.

**Why it matters:** A viral poll with 1 million WebSocket subscribers receiving updates every 500ms generates 2 million messages per second. A single WebSocket gateway cluster cannot push 2M messages/second. Hierarchical fan-out solves this: the aggregation worker publishes one update to a pub/sub topic; N edge servers each subscribe to this topic and independently fan out to their local connections. If each edge server handles 10,000 connections, only 100 edge servers are needed, and the source only publishes one message. This reduces the bottleneck from "1M pushes from one source" to "1 publish + 100 edge servers each handling 10K pushes." The same pattern is used in CDN architectures, live sports score systems, and stock market data feeds.

---

## Insight 8: Split Consistency Is a Principled Design Choice, Not a Compromise

**Category:** Consistency

**One-liner:** Using strong consistency for deduplication and eventual consistency for results is not a compromise—it's the optimal consistency allocation given each operation's correctness requirements.

**Why it matters:** Many engineers treat consistency as a binary choice: strong everywhere (slow, safe) or eventual everywhere (fast, risky). A voting system demands a more nuanced approach. Deduplication requires strong consistency because allowing a duplicate vote is a correctness violation that cannot be retrospectively fixed without re-counting. Result tallies can tolerate eventual consistency because users accept that "2.3 million votes" might be "2.3 million ± a few hundred" while the poll is active—sub-second staleness is indistinguishable from real-time. This split consistency model allocates the "consistency budget" where it has the highest impact: on the write path (integrity) rather than the read path (freshness).

---

## Insight 9: Hot Poll Detection Must Be Proactive, Not Reactive

**Category:** Traffic Shaping

**One-liner:** By the time a poll overwhelms default infrastructure, votes are already being lost; detection and isolation must trigger at early velocity thresholds, not at saturation.

**Why it matters:** A celebrity poll can go from 0 to 100,000 votes per second in under 30 seconds. If hot poll detection triggers only when infrastructure is saturated (queue overflowing, latency spiking), the system has already lost votes during the ramp-up. Proactive detection monitors vote velocity with a 10-second rolling window and triggers isolation at much lower thresholds (1,000 votes/sec) than the saturation point. Better still, predictable events (polls created by accounts with millions of followers) can be pre-provisioned with hot poll infrastructure before the first vote arrives. This is the general principle of "scale before you need it"—provisioning cost is cheap compared to vote loss during a viral spike.

---

## Insight 10: The Vote Audit Log Is the Ultimate Source of Truth

**Category:** Resilience

**One-liner:** Sharded counters are a performance optimization; the append-only vote audit log is the authoritative record from which all counters can be rebuilt.

**Why it matters:** Sharded counters are fast but fragile: a cache failure, a replication bug, or a counter node crash can produce incorrect tallies. The vote audit log—an append-only, partitioned, replicated table of individual vote records—is slower to query but provides a complete, immutable record of every vote. If counters become corrupted or inconsistent, the system can rebuild them by scanning the audit log and re-counting. This makes the audit log the "source of truth" and the counters a "materialized view" of it. The architecture follows the event sourcing principle: store the facts (individual votes), derive the state (aggregated counts). This separation also enables retroactive analysis: if a new fraud detection algorithm is deployed, it can reprocess the audit log to find previously undetected bot votes.

---

## Insight 11: Anonymous Dedup Is Fundamentally Best-Effort

**Category:** Security

**One-liner:** Without a trusted identity (authenticated user_id), deduplication relies on heuristics (IP, fingerprint, session) that determined attackers can circumvent.

**Why it matters:** Anonymous voting creates a tension between accessibility (anyone can vote without an account) and integrity (each person should vote only once). The system uses a composite fingerprint (hashed IP + user agent + device fingerprint + session ID) as a pseudo-identity. But VPN users share IPs, fingerprint spoofing libraries exist, and cookies can be cleared. Each layer of the fingerprint can be individually circumvented, and sophisticated attackers circumvent all of them. This means anonymous polls cannot guarantee one-person-one-vote—they can only raise the cost of ballot stuffing. Poll creators must understand this trade-off: anonymous polls are convenient but inherently less secure. High-integrity polls should require authentication, or at minimum, phone verification.

---

## Insight 12: Adaptive Aggregation Frequency Balances Freshness Against CPU Cost

**Category:** Cost Optimization

**One-liner:** Aggregating a cold poll (5 votes/minute) every 100ms wastes 99.97% of aggregation cycles; adaptive frequency matches computation to demand.

**Why it matters:** A platform with 50,000 active polls cannot afford to aggregate every poll at the same frequency. A viral poll receiving 100,000 votes per second needs 100ms aggregation cycles for sub-second freshness. A personal poll receiving 5 votes per minute doesn't change between aggregation cycles 99.97% of the time—aggregating it every 100ms wastes CPU. Adaptive frequency (100ms for hot polls, 1s for warm, 5s for cold) reduces total aggregation CPU by 10-50× compared to uniform frequency. The vote velocity metric (measured via a rolling 10-second window) drives the decision. This pattern generalizes to any system where background processing frequency should match the rate of underlying change—not all entities change at the same rate.

---

## Insight 13: Cross-Region Dedup Requires Accepting a Small Duplicate Window

**Category:** Consistency

**One-liner:** Global dedup with sub-50ms latency is impossible across continents; per-region dedup with async sync accepts a < 500ms window where a cross-region duplicate is theoretically possible.

**Why it matters:** In a multi-region deployment, the dedup store is replicated per-region for latency reasons. A user in Europe checks the European dedup store; a user in Asia checks the Asian one. Cross-region sync happens asynchronously (typically 100-500ms). During this sync window, a coordinated attack could theoretically vote from two regions before the sync propagates. The probability of this is extremely low for legitimate users (who have consistent geographic affinity), but it's a theoretical gap. The L3 safety net (database UNIQUE constraint, which is globally consistent) catches any duplicates that slip through. The trade-off is explicit: accept a tiny theoretical duplicate window to avoid the latency cost of synchronous global dedup (100ms+ per vote).

---

## Insight 14: Idempotency Keys Transform Retries from a Bug Source into a Safety Mechanism

**Category:** Atomicity

**One-liner:** Client-generated idempotency keys allow safe retries on network failure without risking duplicate votes, turning unreliable networks into a non-issue.

**Why it matters:** Mobile networks drop requests, servers timeout, and clients retry. Without idempotency, a vote that was successfully recorded but whose acknowledgment was lost will be submitted again, creating a duplicate. With an idempotency key (a client-generated UUID sent with each vote request), the server can detect that a retry is a re-submission of an already-processed vote and return the same response without re-processing. The idempotency key is stored alongside the vote and checked on every request. This is distinct from deduplication (which prevents the same person from voting twice intentionally) and handles the infrastructure-level concern of "did my request actually succeed?" The pattern is standard for payment systems and applies equally to any operation where exactly-once semantics matter.

---

*Previous: [Interview Guide](./08-interview-guide.md)*
