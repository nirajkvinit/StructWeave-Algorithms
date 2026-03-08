# Key Insights: Facebook

## Insight 1: TAO's Two-Tier Cache as a Write-Conflict Eliminator

**Category:** Consistency
**One-liner:** A single authoritative leader cache per shard eliminates write conflicts without coordination, while follower caches provide geographic read scaling with bounded staleness.

**Why it matters:** At 1 billion+ reads per second across hundreds of thousands of MySQL shards, Facebook's TAO architecture makes a non-obvious choice: rather than using a single-tier distributed cache (which would require cache coherence protocols), it splits the cache into leaders and followers with distinct roles. Leaders are the single point of serialization for writes -- all mutations flow through them, eliminating the need for distributed consensus on cache state. Followers serve reads locally without contacting the leader, accepting bounded staleness (max 60 seconds via periodic background sync). This asymmetry is the key insight: by sacrificing perfect cross-region consistency for reads, TAO avoids the latency and complexity of distributed cache invalidation protocols while still providing strong per-shard consistency for writes.

---

## Insight 2: Shard ID Embedded in Object ID -- Immutable Routing Without Lookups

**Category:** Partitioning
**One-liner:** Encoding the shard ID in the top 16 bits of every object ID provides O(1) routing without a lookup service, while decoupling logical shards from physical servers.

**Why it matters:** Most sharded systems require a routing layer or lookup table to map objects to shards. Facebook encodes the shard directly in the object ID at creation time, which means any service anywhere in the system can determine the shard for any object by bit-shifting -- no network call, no routing table, no single point of failure. The subtlety is that the shard ID is logical, not physical: physical servers can be added or removed, and logical shards remapped via consistent hashing, without ever changing an object's ID. This also enables co-location: posts are assigned to their author's shard, and associations are stored on the source object's shard, which means a user's friends list, posts, and likes are all on the same shard. This co-location turns multi-table joins into single-shard reads, which is the reason a page load requiring 521 distinct cache reads can still complete in under 100ms.

---

## Insight 3: Hybrid Fan-Out with Dynamic Threshold Adjustment

**Category:** Scaling
**One-liner:** The celebrity problem is not solved by a static threshold -- the fan-out boundary must shift dynamically based on system load, post type, and author posting frequency.

**Why it matters:** The naive solution to the celebrity problem is a fixed threshold (e.g., push for users with <10K followers, pull for the rest). Facebook's real insight is that this threshold is not a constant -- it is a runtime variable. Under high system load, the threshold drops (more users switch to pull), reducing write amplification when the system can least afford it. Video posts lower the threshold further because they are more expensive to process. Prolific posters who create many posts per hour get a reduced threshold to prevent burst write storms. This adaptive approach means the system automatically sheds fan-out write load during peaks without manual intervention, turning the celebrity threshold into a pressure valve for the entire write pipeline.

---

## Insight 4: Lease-Based Cache Regeneration to Prevent Thundering Herds

**Category:** Caching
**One-liner:** When a hot cache key expires, a lease ensures exactly one client regenerates it while others either wait briefly or serve stale data -- preventing database stampedes.

**Why it matters:** With 521 distinct cache reads per page and billions of requests per second, even a 0.01% cache miss rate on popular keys can produce thousands of simultaneous database queries for the same data. Facebook's memcached layer uses a lease mechanism: the first client to encounter a cache miss atomically acquires a short-lived lease (10 seconds), regenerates the value from the database, and populates the cache. All other concurrent requesters see the lease is held, wait 50ms, and retry -- almost always finding the freshly populated value. The stale-while-revalidate optimization goes further: the stale value is kept with a flag, served immediately to waiting clients, while exactly one client regenerates. This pattern reduces database load by orders of magnitude during cache expiration events and is the reason Facebook can maintain 99%+ cache hit rates.

---

## Insight 5: Multi-Objective Feed Ranking with Integrity as a Hard Constraint

**Category:** System Modeling
**One-liner:** Feed ranking is not a single optimization problem -- it is a multi-objective function where engagement, user value, and content integrity are weighted and combined, with integrity acting as a hard filter rather than a soft signal.

**Why it matters:** Facebook's feed ranking evolved from EdgeRank (a simple affinity-weight-decay formula) to a deep learning system with 1000+ features and multi-task prediction heads. The non-obvious architectural decision is the treatment of integrity: while engagement and value are soft scores that trade off against each other (clickbait has high engagement but low value), integrity scores for misinformation, hate speech, and violence act as hard multipliers that can zero out any engagement score. A piece of misinformation with perfect engagement metrics still gets suppressed. This separation means the integrity model can be updated independently (e.g., during an emerging crisis) without retraining the engagement model. The weights between objectives are tuned via A/B tests and user satisfaction surveys, with regional variations for cultural differences -- making the ranking formula a living system, not a static algorithm.

---

## Insight 6: Read-Your-Writes via Time-Bounded Routing

**Category:** Consistency
**One-liner:** After a write, route that user's reads to the leader for a short consistency window (5 seconds), then fall back to eventual consistency from followers.

**Why it matters:** Eventual consistency is acceptable for most social data (your friend's like count can be a few seconds stale), but it is catastrophic for the user's own actions. If you post a comment and it does not appear on your screen, you will post it again. Facebook's TAO solves this with a per-user write tracker: after any write, the system records the user-shard pair and timestamp, and for the next 5 seconds, all reads for that user on that shard are routed to the leader instead of a follower. After the consistency window, reads return to the follower path. This is a targeted consistency upgrade -- strong consistency only when and where it matters (the writing user's own view), eventual consistency everywhere else. The 5-second window is calibrated to the maximum propagation delay from leader to followers, so by the time the window expires, followers have caught up.

---

## Insight 7: Pool Isolation in Caching to Prevent Cross-Domain Eviction

**Category:** Caching
**One-liner:** Separate cache pools for different data types (user data, feed data, graph data) prevent one data category's traffic pattern from evicting another's hot entries.

**Why it matters:** A single unified cache pool seems simpler, but at Facebook's scale it creates a subtle problem: a spike in feed cache writes (e.g., during a major event) can evict frequently-accessed user profile data, causing a cascade of database lookups for profile information that was previously cached. Facebook partitions memcached into separate pools with independent memory allocations and TTL policies. Graph data gets longer TTLs (it changes infrequently), feed data gets shorter TTLs (freshness matters more), and user session data gets its own isolated pool. Cross-region invalidation is also pool-aware, using a message queue for reliable delivery with bounded staleness under 1 second. This isolation pattern prevents one domain's access pattern from degrading another domain's cache performance.

---

## Insight 8: Idempotent Post Creation via Client-Generated Keys

**Category:** Atomicity
**One-liner:** Double-click protection on post creation uses a client-generated idempotency key with a distributed lock and cached result, ensuring exactly-once semantics for user-facing write operations.

**Why it matters:** Network timeouts on mobile connections are common, and users instinctively retry when a post appears to hang. Without idempotency, this creates duplicate posts -- a visible, user-facing bug. Facebook's solution has the client generate a UUID before the upload attempt and include it in every retry. The server checks the idempotency cache first (fast path), acquires a distributed lock keyed on the UUID (to handle true concurrent retries), double-checks the cache after the lock (in case another request won the race), creates the post, caches the result for 24 hours, and releases the lock. The double-check pattern after lock acquisition is critical -- without it, two concurrent retries that both miss the initial cache check would both create posts. This pattern applies to any user-facing mutation where network retries are expected.

---

*[← Back to Index](./00-index.md)*
