# Key Insights: Distributed LRU Cache

## Insight 1: XFetch Prevents Stampedes Without Locks or Coordination

**Category:** Contention
**One-liner:** By probabilistically refreshing cache entries before expiry -- with probability increasing as TTL decreases -- XFetch spreads recomputation across time and requests, eliminating thundering herds without any distributed locking.

**Why it matters:** Cache stampede is the most dangerous failure mode of a distributed cache: a popular key expires, 1,000 concurrent requests all miss simultaneously, all query the database, and the backend collapses. Locking (mutex) prevents this but introduces lock contention, blocked waiters consuming connections, and distributed lock failure modes. XFetch uses the formula `threshold = time_remaining - (beta * ln(random()) * recompute_time)` to make each request independently decide whether to trigger an early refresh. When TTL has 50% remaining, refresh probability is ~1%; at 5% remaining, it is ~30%. Statistically, exactly one request triggers a refresh before expiry, and all other requests continue serving the cached value. No locks, no coordination, no waiters, no extra infrastructure. The self-tuning property is elegant: under higher load (more requests per second), the probability that at least one request triggers early refresh increases, making stampedes even less likely precisely when they would be most damaging.

---

## Insight 2: Two-Tier L1/L2 Caching Absorbs Hot Keys Across the Application Fleet

**Category:** Caching
**One-liner:** A small in-process L1 cache (100 items, 10-second TTL) on each application server absorbs hot key traffic before it ever reaches the distributed cache, converting a single-node bottleneck into fleet-wide distribution.

**Why it matters:** A hot key (celebrity profile, viral product) can generate 800K QPS against a single cache node, overwhelming it regardless of cluster size. The distributed cache can be perfectly sharded, but a single key maps to a single shard. L1 caching on each of 100 application servers means each server serves hot key reads from local memory, reducing distributed cache load by 99%+ (only L1 misses reach L2). The critical design element is promoting to L1 only after a key exceeds a hotness threshold (tracked via a simple counter), preventing cold data from polluting the L1 and evicting valuable entries. The 10-second TTL bounds staleness. This pattern requires zero changes to the distributed cache infrastructure -- it is purely a client-side optimization that addresses the fundamental problem: no amount of distributed cache scaling can fix a single-key bottleneck.

---

## Insight 3: Stale-While-Revalidate Trades Freshness for Zero User-Visible Latency

**Category:** Caching
**One-liner:** By serving slightly stale data immediately while refreshing in the background, stale-while-revalidate ensures users never wait for a cache miss -- the hard TTL is a safety net, not the normal path.

**Why it matters:** In a traditional cache, expiry means a synchronous database fetch that the user waits for. Stale-while-revalidate introduces two TTLs: a soft TTL (e.g., 5 minutes) after which data is "stale but servable" and a hard TTL (e.g., 60 minutes) after which data is truly expired. Between soft and hard TTL, the first request triggers an asynchronous background refresh while immediately returning the stale value. Subsequent requests during the refresh window also get the stale value (a refresh lock prevents duplicate fetches). The user experience is dramatically better: reads never block on database latency except on hard misses. The trade-off is explicitly serving stale data, but for most use cases (product listings, user profiles, recommendations) data that is 5 minutes old is indistinguishable from fresh data. This pattern pairs well with event-driven invalidation: writes publish invalidation events that delete cache entries, triggering immediate refresh on the next read.

---

## Insight 4: Count-Min Sketch Detects Hot Keys in O(1) Space Without Tracking Every Key

**Category:** Data Structures
**One-liner:** A Count-Min Sketch probabilistically estimates per-key access frequency using fixed memory (a few KB), enabling real-time hot key detection without maintaining counters for millions of distinct keys.

**Why it matters:** Detecting hot keys by maintaining exact counters for every key requires memory proportional to the number of distinct keys -- potentially millions. A Count-Min Sketch uses a fixed-size matrix (e.g., 4 hash functions x 1024 counters = 4KB) that provides frequency estimates with a bounded over-count error. When a key's estimated count exceeds a hotness threshold, it is promoted to the hot key set and triggers mitigation (L1 promotion, key splitting, or dedicated hot tier routing). Periodic decay (multiplying all counters by 0.9 every minute) handles keys that cool down, preventing the hot key set from growing unboundedly. The over-count property means the sketch may identify slightly more keys as "hot" than truly are -- a safe failure mode since the mitigation (caching more aggressively) is benign for warm keys.

---

## Insight 5: The Delete-Set Race Creates Permanent Staleness That TTL Cannot Fix

**Category:** Consistency
**One-liner:** When a cache invalidation (DELETE) races with a cache population (SET) from a stale read, the stale value can overwrite the deletion and persist until the next TTL expiry.

**Why it matters:** Thread T1 updates the database to version 2 and deletes the cache entry. Meanwhile, Thread T2 (which started before T1) reads version 1 from the database and SETs it in the cache. The execution order is: T1 DELETE, T2 SET(stale_v1). The cache now holds stale data, and since the delete already happened, no subsequent invalidation is coming -- the stale entry persists for the full TTL duration. Versioned cache entries solve this: each SET includes a version number, and the cache only accepts the write if the incoming version is newer than the stored version. This is a specific instance of the broader write-ordering problem in caches and explains why Meta invested heavily in cache consistency infrastructure despite using eventual consistency -- stale data that self-corrects in seconds is acceptable, but stale data that persists for the full TTL is not.

---

## Insight 6: Cross-Region Cache Invalidation via Message Queue Bounds Staleness to Seconds, Not Minutes

**Category:** Consistency
**One-liner:** TTL-only invalidation means users in remote regions see stale data for up to the full TTL duration; adding cross-region invalidation events via a message queue reduces staleness to message propagation delay (typically seconds).

**Why it matters:** In a multi-region deployment, a user updating their profile in US-East needs that change visible to readers in EU. With TTL-only invalidation (e.g., 5-minute TTL), EU readers see stale data for up to 5 minutes. Publishing an invalidation event to a cross-region message queue triggers immediate cache deletion in all regions, bounding staleness to the message propagation delay (1-5 seconds). The invalidation event includes the source region to prevent echo loops (a region does not process its own invalidation events). The write path becomes: update database, delete local cache, publish invalidation event. The trade-off is infrastructure complexity (message queue, consumer in each region) and the reality that the EU cache is still briefly stale between the DB write and the invalidation arrival. For stronger guarantees, write-through caching ensures the cache is updated synchronously, but at significantly higher write latency and cross-region network cost.

---

## Insight 7: A Cache Must Never Be the Availability Bottleneck -- It Is an Optimization, Not a Dependency

**Category:** Resilience
**One-liner:** If your system cannot function when the cache is cold or unavailable, you have accidentally turned an optimization layer into a critical dependency -- cache warming, circuit breakers, and backend capacity planning prevent this.

**Why it matters:** Caches start empty on restart or after a node failure. If the backend database is sized only for cache-hit traffic (e.g., 1% of total reads), a cache failure causes a 100x traffic increase to the database, overwhelming it. This cascading failure means the cache going down takes the entire system down -- the cache has become a single point of failure despite being designed as an optimization. Three mitigations are essential: (1) cache warming on startup pre-loads hot data before accepting traffic, (2) circuit breakers on the database prevent connection exhaustion during cold-cache periods, (3) the database must be provisioned to handle at least a degraded level of direct traffic. Netflix's EVCache uses EBS snapshots to warm new cache nodes with petabytes of data, avoiding cold-start thundering herds entirely.

---

## Insight 8: Serialization Format Choice Can Dominate End-to-End Cache Latency

**Category:** Cost Optimization
**One-liner:** JSON serialization on the cache client can add more latency than the network round-trip to the cache server -- switching to Protobuf or FlatBuffers can halve total cache access time.

**Why it matters:** A cache miss typically involves: network round-trip to cache server (~0.5ms), deserialization of the response (~0.1-2ms depending on format and object size), and business logic. For JSON with large objects, deserialization can exceed the network latency itself. Protobuf is 5-10x faster to serialize/deserialize than JSON and produces 2-3x smaller payloads (reducing network bandwidth). FlatBuffers goes further with zero-copy deserialization -- the serialized buffer is directly accessible without any parsing step. The trade-off is schema management (Protobuf/FlatBuffers require schema definitions and code generation) and debuggability (binary formats are not human-readable). For a cache system processing millions of operations per second, even a 0.5ms reduction per operation translates to significant CPU savings across the application fleet.

---

## Insight 9: SET-if-Not-Exists (ADD) Prevents the Double Population Race Without Distributed Locks

**Category:** Atomicity
**One-liner:** When two threads simultaneously discover a cache miss and both fetch from the database, using ADD (set-if-not-exists) instead of SET ensures only the first writer populates the cache, preventing stale overwrites.

**Why it matters:** The double population race is subtle: Thread T1 reads version 1 from the database. Thread T2 reads version 2 (data changed between the reads). T1's SET(key, v1) populates the cache. T2's SET(key, v2) overwrites with the newer version -- in this case, the outcome is fine. But if T2's SET happens first and T1's SET happens second, the cache holds stale v1. Using ADD (Memcached) or SET NX (Redis), the first writer wins and subsequent writers are silently rejected. The rejected writer can then GET from cache to obtain the value the winner wrote. This is lock-free, atomic, and incurs zero additional round-trips beyond the normal write. Combined with versioned entries (where the ADD includes a version and the cache only accepts higher versions), this eliminates an entire class of cache consistency bugs without any locking infrastructure.
