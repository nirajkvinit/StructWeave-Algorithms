# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45 Minutes)

| Time | Phase | Focus | What to Cover |
|------|-------|-------|---------------|
| **0-5 min** | Clarify | Requirements | Scale, hit rate target, consistency needs, multi-region |
| **5-15 min** | High-Level | Architecture | Cache-aside pattern, partitioning, replication topology |
| **15-30 min** | Deep Dive | Critical Component | LRU implementation OR stampede prevention (pick one) |
| **30-40 min** | Scale & Trade-offs | Challenges | Hot keys, multi-region, eviction policies, failure modes |
| **40-45 min** | Wrap Up | Summary | Recap decisions, discuss monitoring, answer questions |

---

## Phase 1: Clarifying Questions (0-5 min)

### Must-Ask Questions

| Question | Why It Matters | Impact on Design |
|----------|---------------|------------------|
| "What's the expected scale (QPS, data size)?" | Determines cluster size, sharding strategy | 10K vs 1M QPS are very different designs |
| "What's the target hit rate?" | Determines cache size and eviction strategy | 90% vs 99% requires different approaches |
| "How stale can data be?" | TTL strategy, invalidation requirements | 1 second vs 1 hour staleness changes everything |
| "What's the read:write ratio?" | Replication strategy, consistency model | 10:1 vs 1000:1 affects architecture |
| "Is there a hot key problem?" | Need for specialized handling | Celebrity problem requires different design |
| "Multi-region deployment?" | Consistency vs latency trade-offs | Single region is much simpler |

### Sample Dialogue

```
YOU: "Before I dive into the design, I'd like to ask a few clarifying
     questions. First, what scale are we targeting?"

INTERVIEWER: "Let's say 1 million requests per second at peak."

YOU: "Got it. And what's our target hit rate?"

INTERVIEWER: "We'd like at least 95%."

YOU: "For consistency, how stale can cached data be? Are we okay with
     eventual consistency where data might be a few minutes old?"

INTERVIEWER: "A few minutes is acceptable for most data, but some data
             should be fresher, maybe within seconds."

YOU: "That helps. One more question - do we need to handle hot keys?
     Things like viral content or celebrity profiles that might get
     millions of requests?"

INTERVIEWER: "Yes, that's definitely a concern."

YOU: "Perfect. Let me summarize the requirements and then walk through
     the design..."
```

### Requirements Summary Template

```
"Let me summarize what I've heard:
- Scale: 1M QPS, which means we need a distributed cluster
- Hit rate target: 95%, so we need sufficient memory and good eviction
- Consistency: Eventual is fine, with some data needing fresher (seconds)
- Special case: Hot keys need handling
- [Any other requirements]

Does that sound right? Great, let me walk through the architecture..."
```

---

## Phase 2: High-Level Design (5-15 min)

### What to Cover

1. **System Architecture**
   - Draw: Clients → Cache Cluster → Database
   - Mention: Cache-aside pattern

2. **Partitioning**
   - Consistent hashing with virtual nodes
   - Why: Even distribution, graceful scaling

3. **Replication**
   - Leader-follower per shard
   - Why: Availability without strong consistency overhead

4. **Data Flow**
   - Read path: Check cache → hit/miss → DB on miss → populate cache
   - Write path: Update DB → invalidate cache (or write-through)

### Key Points to Make

```
"For the architecture, I'll use a cache-aside pattern where the application
manages the cache. On reads, we check the cache first. On writes, we
update the database and invalidate the cache entry.

For partitioning, I'll use consistent hashing with virtual nodes. This
gives us even distribution of keys and smooth scaling - when we add a
node, only about 1/N of keys need to move.

For availability, each shard has a leader and followers. Writes go to
the leader and replicate asynchronously. This gives us high availability
without the latency hit of synchronous replication."
```

### Draw This Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Application Servers                                     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Cache Cluster (Consistent Hashing)                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│  │ Node 1  │  │ Node 2  │  │ Node 3  │                  │
│  │ (L) + F │  │ (L) + F │  │ (L) + F │                  │
│  └─────────┘  └─────────┘  └─────────┘                  │
└─────────────────────────────────────────────────────────┘
                          │ Cache Miss
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Database (Source of Truth)                              │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 3: Deep Dive (15-30 min)

### Option A: LRU Data Structure Implementation

**When to choose:** If interviewer asks about internal implementation.

**Key Points:**

1. **Data Structure: Hash Map + Doubly Linked List**
   - Hash map: O(1) key lookup
   - Doubly linked list: O(1) move-to-head and remove-from-tail

2. **Operations:**
   - GET: Lookup in hash map, move to head
   - SET: Add/update in hash map, add to head, evict from tail if needed
   - DELETE: Remove from hash map, unlink from list

3. **Why this works:**
   ```
   Hash Map: { "key1" → Node1, "key2" → Node2, ... }

   Doubly Linked List:
   HEAD ←→ [Node1] ←→ [Node2] ←→ [Node3] ←→ TAIL
   (MRU)                                   (LRU)
   ```

4. **Pseudocode to share:**
   ```
   FUNCTION get(key):
       IF key NOT IN hash_map:
           RETURN NOT_FOUND
       node = hash_map[key]
       move_to_head(node)  // O(1)
       RETURN node.value

   FUNCTION set(key, value):
       IF key IN hash_map:
           node = hash_map[key]
           node.value = value
           move_to_head(node)
       ELSE:
           IF at_capacity:
               evict_from_tail()  // O(1)
           node = create_node(key, value)
           add_to_head(node)
           hash_map[key] = node
   ```

### Option B: Cache Stampede Prevention

**When to choose:** If interviewer is interested in distributed systems challenges.

**Key Points:**

1. **The Problem:**
   - Popular key expires
   - 1000 requests simultaneously find cache miss
   - All 1000 hit the database
   - Database overwhelmed

2. **Solution Options:**
   | Solution | How it works | Trade-off |
   |----------|--------------|-----------|
   | Locking | One request fetches, others wait | Simple but blocking |
   | XFetch | Probabilistic early refresh | No blocking, but complex |
   | Stale-while-revalidate | Serve stale, refresh async | Serves stale data |

3. **XFetch Algorithm (Recommended):**
   ```
   "The idea is to probabilistically refresh before expiry. As we get
   closer to expiration, the probability of any request triggering a
   refresh increases.

   If there's 5 minutes left on TTL, maybe 1% chance of refresh.
   If there's 10 seconds left, maybe 50% chance.

   This spreads refresh load and prevents the thundering herd."
   ```

4. **Draw the timeline:**
   ```
   |-------- Fresh --------|------ Increasingly likely to refresh ------|
   SET                     50% TTL                                    EXPIRY
   ```

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Hot Key Handling

```
"For hot keys like a viral celebrity profile, a single cache node would
be overwhelmed. I'd handle this in a few ways:

1. L1 Local Cache: Each app server has a small in-process cache. Hot keys
   get cached locally with a short TTL (10 seconds). This absorbs traffic
   across all app servers.

2. Key Splitting: For known hot keys, split into multiple sub-keys like
   celebrity:123:0, celebrity:123:1, etc. Reads randomly pick one.

3. Read Replicas: For really hot keys, replicate to all nodes and read
   from any."
```

### Multi-Region Considerations

```
"For multi-region, the main challenge is consistency. If a user updates
their profile in US-East, how quickly do we see it in EU?

Options:
1. TTL only (simple): Data might be stale up to TTL duration. Acceptable
   for most non-critical data.

2. Invalidation broadcast: On write, publish invalidation event. Other
   regions consume and delete the key. Latency is message queue delay.

3. Write-through all regions: Higher latency but immediate consistency.

For our use case, I'd recommend TTL + invalidation for important data."
```

### Eviction Policy Trade-offs

| Policy | Pros | Cons | Best For |
|--------|------|------|----------|
| LRU | Simple, effective | Not frequency-aware | General purpose |
| LFU | Keeps frequently used | Slow to adapt | Stable patterns |
| ARC | Adapts to patterns | Complex, more memory | Variable workloads |

```
"I'd start with LRU - it's simple and works well for most cases. If we
see low hit rates with LRU, we could consider ARC which adapts to access
patterns, but it requires more memory for metadata."
```

---

## Trap Questions & Strong Responses

### Trap 1: "Why not just use a bigger database?"

**What they're testing:** Do you understand why caching matters?

**Strong Response:**
```
"A few reasons. First, latency - database queries are 5-50ms due to disk
I/O and query processing. Cache is sub-millisecond because it's in-memory
and just a key lookup.

At 1M QPS, that's the difference between needing 1,000 database connections
or 50 cache nodes. The database would need massive horizontal scaling to
handle that load.

Also, caching reduces database cost - we're not paying for compute on
repeated identical queries."
```

### Trap 2: "What if cache and database disagree?"

**What they're testing:** Do you understand consistency trade-offs?

**Strong Response:**
```
"In cache-aside, the cache is always potentially stale by design. The
database is the source of truth.

We accept eventual consistency bounded by TTL. If a user updates data,
they might see stale cached data for up to the TTL duration.

For critical data, we can reduce staleness by:
1. Shorter TTLs
2. Explicit invalidation on write
3. Write-through pattern

But we're deliberately trading consistency for performance and availability."
```

### Trap 3: "A single hot key is getting 100K QPS. What do you do?"

**What they're testing:** Can you handle real distributed systems problems?

**Strong Response:**
```
"A single key at 100K QPS would overwhelm one cache node. I'd use multiple
strategies:

First, local caching. If I have 100 app servers, each with a 10-second
local cache, that's 100K requests absorbed with only 10 cache fetches
per second.

Second, key splitting. I'd split the key into 10 sub-keys distributed
across different nodes. Clients randomly select which sub-key to read.
Now it's 10K QPS per node.

Third, monitoring. I'd detect hot keys by tracking access frequency
and automatically apply these mitigations."
```

### Trap 4: "How do you handle cache warming after a full restart?"

**What they're testing:** Operational awareness

**Strong Response:**
```
"Cold cache is a real problem - hit rate goes to zero and all traffic
hits the database.

For gradual warming, I'd accept the temporary hit rate drop and let
normal traffic populate the cache. The database needs headroom for this.

For faster warming, I'd pre-warm popular keys. I can identify these from
access logs or keep a list of always-popular items.

Netflix actually uses EBS snapshots to warm their cache - they periodically
snapshot cache state to disk and restore on new nodes.

I'd also gradually shift traffic to new nodes rather than all at once."
```

### Trap 5: "Why not just set TTL to infinity?"

**What they're testing:** Understanding of cache management

**Strong Response:**
```
"Infinite TTL has several problems:

First, memory exhaustion. Without expiration, the cache grows forever
until it runs out of memory and starts evicting.

Second, stale data. If data changes in the database but the cache
never expires, users see outdated information indefinitely.

Third, no self-healing. If a bug writes bad data to cache, it stays
there forever. With TTL, it eventually corrects itself.

I'd use reasonable TTLs - maybe 5 minutes for frequently changing data,
up to an hour for stable data - combined with explicit invalidation for
writes."
```

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| "Cache is always consistent" | Shows lack of understanding | "Cache is eventually consistent by design" |
| "Just add more servers" | Oversimplified | Discuss specific scaling strategies |
| "Use Redis for everything" | Not system design thinking | Discuss trade-offs, mention alternatives |
| Forgetting cache misses | Cache isn't magic | "On miss, we fetch from database..." |
| Ignoring hot keys | Real production issue | Proactively mention hot key handling |
| No invalidation strategy | Shows incomplete design | Discuss TTL + explicit invalidation |

---

## Quick Reference Numbers

| Metric | Typical Value | Notes |
|--------|---------------|-------|
| GET latency (p99) | < 1ms | In-memory, network bound |
| Hit rate target | 95%+ | Below 90% is concerning |
| TTL range | 60s - 3600s | Depends on data freshness needs |
| Max value size | 1MB | Larger = network problems |
| Virtual nodes per server | 128-256 | More = better distribution |
| Replication factor | 2-3 | Balance availability vs cost |
| Cache:DB QPS ratio | 10x-100x | Cache should absorb most traffic |
| Memory overhead | 1.5-2x raw data | Hash table, pointers, metadata |

---

## Interview Cheat Sheet

### Opening Statement
```
"Distributed LRU Cache is an in-memory layer for read-heavy workloads.
Key challenges are: achieving high hit rate, handling hot keys,
preventing cache stampede, and maintaining eventual consistency."
```

### Architecture Summary
```
"Cache-aside pattern with consistent hashing for partitioning.
Leader-follower replication for availability. LRU eviction for
memory management. TTL + invalidation for consistency."
```

### Key Trade-offs
```
1. Consistency vs Performance: We choose eventual consistency
2. Memory vs Hit Rate: More memory = higher hit rate
3. Simplicity vs Optimization: Start with LRU, optimize if needed
```

### Closing Statement
```
"To summarize: distributed cache using consistent hashing, cache-aside
pattern, LRU eviction, and async replication. For hot keys, we use
local caching and key splitting. For stampede prevention, probabilistic
early refresh. Monitoring focuses on hit rate, latency, and memory."
```

---

## Practice Questions

1. "Design a distributed cache for a social media news feed"
2. "How would you cache user sessions across multiple data centers?"
3. "Design the caching layer for an e-commerce product catalog"
4. "How would you implement a multi-tenant cache with isolation?"
5. "Design a cache that supports both LRU and TTL eviction"
