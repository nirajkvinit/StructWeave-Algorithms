# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45 minutes)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Problem Setup** | Why consistent hashing? | Explain modulo hashing failure, scaling pain |
| 5-15 min | **Core Design** | Ring concept, basic algorithm | Draw ring, show key assignment, clockwise rule |
| 15-25 min | **Virtual Nodes** | Even distribution solution | Why needed, how many, trade-offs |
| 25-35 min | **Deep Dive** | Rebalancing, failures, alternatives | Node add/remove, bounded loads, vs. Jump/Rendezvous |
| 35-45 min | **Trade-offs** | Design decisions | Compare approaches, handle follow-ups |

---

## Whiteboard Strategy

### Step 1: Start with the Problem (2 min)

```
"Let me first explain WHY we need consistent hashing..."

Draw this:

Traditional Hashing (Modulo):
┌─────────────────────────────────────────────────────────────┐
│  3 servers: hash(key) % 3                                    │
│                                                              │
│  key "A" → hash=7  → 7%3=1  → Server 1                      │
│  key "B" → hash=12 → 12%3=0 → Server 0                      │
│  key "C" → hash=15 → 15%3=0 → Server 0                      │
│                                                              │
│  ADD 1 SERVER (now 4):                                       │
│  key "A" → hash=7  → 7%4=3  → Server 3  ❌ MOVED!           │
│  key "B" → hash=12 → 12%4=0 → Server 0  ✓                   │
│  key "C" → hash=15 → 15%4=3 → Server 3  ❌ MOVED!           │
│                                                              │
│  PROBLEM: ~75% of keys must move when adding 1 server!      │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Introduce the Ring (3 min)

```
"Consistent hashing solves this by arranging the hash space in a ring..."

Draw this:

                        0 (max wraps to 0)
                          │
                     ┌────┴────┐
                ────/          \────
              /        [A]        \
            /                       \
           │                         │
      [C]  │                         │  [B]
           │                         │
            \                       /
              \                   /
                ────\        /────
                     └───┬───┘
                         │

Key Assignment Rule:
  1. Hash the key to get position
  2. Walk CLOCKWISE to find first server
  3. That server owns the key

Example:
  key "user:123" → hash → position 10%
  Walk clockwise → first server is [A] at 25%
  Server A owns "user:123"
```

### Step 3: Show Why It Helps (2 min)

```
"Now when we add a server..."

Add Server [D] at position 40%:

                        0
                          │
                     ┌────┴────┐
                ────/          \────
              /        [A]        \
            /                       \
           │          [D] ← NEW      │
      [C]  │                         │  [B]
           │                         │
            \                       /
              \                   /
                ────\        /────
                     └───┬───┘

Only keys between [A] and [D] need to move!
That's approximately 1/N of all keys (where N = number of servers)

With 4 servers: only ~25% of keys move
vs. modulo hashing: ~75% of keys move
```

### Step 4: Address the Distribution Problem (5 min)

```
"But there's a problem with basic consistent hashing..."

Problem: Uneven Distribution

If servers hash to random positions:
  Server A: position 10%
  Server B: position 15%  ← Only 5% of ring!
  Server C: position 80%  ← Gets 65% of keys!

Solution: Virtual Nodes

Each physical server gets MULTIPLE positions:

  Server A: positions at 10%, 35%, 72%
  Server B: positions at 15%, 45%, 88%
  Server C: positions at 25%, 60%, 95%

With 150+ virtual nodes per server:
  - Keys are evenly distributed
  - Each server gets ~1/N of total keys
  - Variance < 5%
```

### Step 5: Discuss Replication (3 min)

```
"For durability, we need replicas. The ring helps here too..."

To replicate to 3 nodes:
  1. Hash key → find primary node (clockwise)
  2. Continue clockwise for 2 more PHYSICAL nodes
  3. These 3 form the "preference list"

Important: Skip duplicate physical nodes!
  (Virtual nodes of same server don't count as separate replicas)

Example:
  key "order:456" → hash → position 30%
  Walk clockwise:
    - First node: B-v2 (virtual) → Physical B = PRIMARY
    - Next: A-v1 (virtual) → Physical A = REPLICA 1
    - Next: B-v3 (virtual) → SKIP (already have B)
    - Next: C-v1 (virtual) → Physical C = REPLICA 2

  Preference list: [B, A, C]
```

---

## Key Talking Points

### When Asked "What is Consistent Hashing?"

> "Consistent hashing is a technique for distributing keys across servers such that when servers are added or removed, only a minimal number of keys need to be remapped. It works by arranging both keys and servers on a circular hash space - a 'ring' - and assigning each key to the first server encountered when walking clockwise from the key's position. This ensures that adding a server only affects about 1/N of the keys, rather than nearly all keys with traditional modulo hashing."

### When Asked "Why Virtual Nodes?"

> "Virtual nodes solve the distribution problem. With just one position per server, servers can end up clustered together on the ring, leading to very uneven key distribution. By giving each server 100-200 positions spread across the ring, we statistically guarantee that each server gets approximately its fair share of keys. Virtual nodes also help with rebalancing - when a server fails, its load is distributed across many other servers rather than just one successor."

### When Asked "What's the Complexity?"

> "Lookup is O(log N) where N is total ring positions, using binary search to find the first position greater than or equal to the key's hash. With 100 servers and 150 virtual nodes each, that's log₂(15,000) ≈ 14 comparisons. Memory is O(N × V) to store all ring positions. Adding or removing a node is O(V × log(NV)) for the V insertions or deletions."

---

## Trap Questions & How to Handle

### Trap 1: "Why not just use modulo hashing? It's simpler."

**What they want:** Show you understand the scaling problem.

**Good answer:**
> "Modulo hashing is simpler, but it fails badly when the cluster size changes. If you have hash(key) % N and change to N+1 servers, approximately (N-1)/N keys need to be remapped. For 100 servers, adding one server means moving 99% of your data. With a distributed cache, this causes a thundering herd of cache misses to your database. Consistent hashing limits this to about 1/N of keys moving."

### Trap 2: "What if all traffic goes to one key?"

**What they want:** Hot spot handling.

**Good answer:**
> "The 'celebrity key' problem! Consistent hashing doesn't solve this because the key always hashes to the same position. Solutions include:
> 1. Key salting - split 'hot_key' into 'hot_key:0', 'hot_key:1', etc., and aggregate reads
> 2. Local caching - cache hot keys in application memory
> 3. Read from replicas - distribute reads across the preference list
> 4. Bounded loads extension - automatically overflow to the next node when a node is at capacity"

### Trap 3: "How do you handle a node crash?"

**What they want:** Failure handling understanding.

**Good answer:**
> "For reads, traffic automatically routes to the next node on the ring - that's the beauty of consistent hashing. For data recovery, we rely on replication:
> 1. The successor node already has replicas (if we're using the preference list)
> 2. Hinted handoff - if a node is down during a write, we store a 'hint' on another node and replay it when the node recovers
> 3. Anti-entropy - background Merkle tree comparison to detect and fix inconsistencies
> The ring itself just needs to be updated via the membership protocol, which could be gossip or a coordinator like ZooKeeper."

### Trap 4: "Can you do range queries?"

**What they want:** Understand trade-offs vs. range partitioning.

**Good answer:**
> "No, consistent hashing doesn't support efficient range queries because keys are scattered based on their hash values, not their natural order. If you need range queries, you'd use range partitioning instead, like HBase or Bigtable do. The trade-off is that range partitioning can create hot spots if there's sequential access patterns, whereas hash-based distribution is more uniform. You choose based on your access patterns."

### Trap 5: "Why not use Jump Hash instead?"

**What they want:** Knowledge of alternatives.

**Good answer:**
> "Jump hash is great when you have numbered buckets (0, 1, 2, ...) and only add nodes at the end. It's O(1) memory and has perfect distribution. But it can't handle removing arbitrary nodes or nodes with string IDs without an indirection layer. Ring-based consistent hashing is more flexible - you can add or remove any node, and nodes can have any identifier. For something like a load balancer where backends are numbered and you mostly scale up, Jump hash is ideal. For a distributed database where nodes can fail unpredictably, ring hash is better."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Correct Approach |
|---------|---------------|------------------|
| Forgetting virtual nodes | Distribution will be terrible | Always mention vnodes, suggest 150+ |
| Saying "keys move to next node only" | Only true for one vnode's range | Explain that keys distribute across many nodes |
| Not mentioning replication | Incomplete design | Explain preference list / N clockwise nodes |
| Drawing a linear hash space | Misses the wrap-around concept | Always draw a ring / circle |
| Claiming perfect distribution | False - it's statistical | Say "approximately 1/N" with variance |
| Ignoring membership protocol | Incomplete system | Mention gossip or coordinator |

---

## Follow-up Questions You Should Ask

Before diving into design, clarify:

1. **"What's the expected scale?"** - Affects vnode count and membership approach
2. **"Read-heavy or write-heavy?"** - Affects replication strategy
3. **"Can we tolerate eventual consistency?"** - Affects quorum requirements
4. **"How often do nodes change?"** - Affects membership protocol choice
5. **"Do we need weighted nodes?"** - For heterogeneous capacity

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONSISTENT HASHING CHEAT SHEET                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CORE CONCEPT                                                        │
│  • Ring of 2³² positions (0 to 4B)                                  │
│  • Keys AND nodes hashed to ring                                    │
│  • Key assigned to first node CLOCKWISE                             │
│                                                                      │
│  WHY BETTER THAN MODULO                                              │
│  • Modulo: N-1/N keys move on resize (~99% for N=100)              │
│  • Consistent: 1/N keys move (~1% for N=100)                        │
│                                                                      │
│  VIRTUAL NODES                                                       │
│  • Each physical node → 150-200 ring positions                      │
│  • Ensures even distribution (< 10% variance)                       │
│  • Failed node's load spreads across many nodes                     │
│                                                                      │
│  COMPLEXITY                                                          │
│  • Lookup: O(log N) binary search                                   │
│  • Memory: O(N × V) for ring                                        │
│  • Add/Remove: O(V log NV)                                          │
│                                                                      │
│  REPLICATION                                                         │
│  • Walk clockwise for N distinct PHYSICAL nodes                     │
│  • Skip virtual nodes of already-selected physical nodes            │
│  • This forms the "preference list"                                 │
│                                                                      │
│  ALTERNATIVES                                                        │
│  • Jump Hash: O(1) memory, perfect dist, append-only growth        │
│  • Rendezvous: O(n) lookup, simple, natural replication            │
│  • Maglev: O(1) lookup, expensive rebuild, load balancers          │
│                                                                      │
│  REAL-WORLD USAGE                                                    │
│  • Cassandra, DynamoDB: Database partitioning                       │
│  • Memcached (Ketama): Cache distribution                           │
│  • Akamai: Original CDN use case                                    │
│  • HAProxy, Envoy: Load balancer backends                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Trade-offs Discussion Template

| Decision | Option A | Option B | When to Choose A | When to Choose B |
|----------|----------|----------|------------------|------------------|
| **Algorithm** | Ring Hash | Jump Hash | Dynamic membership, failures | Static numbered backends |
| **VNode Count** | 50-100 | 200-500 | Memory constrained | Strict SLOs |
| **Hash Function** | MD5 (Ketama) | xxHash | Memcached compatibility | Performance critical |
| **Membership** | Gossip | ZooKeeper | Large clusters (100+) | Small, strong consistency |
| **Replication** | Ring-based | Separate mapping | Simple, co-located replicas | Complex placement rules |

---

## Practice Questions

### Basic Level
1. Draw the consistent hash ring with 3 nodes and show how a key is assigned
2. What happens when we add a 4th node? Which keys move?
3. What's the difference vs. modulo hashing?

### Intermediate Level
4. Explain virtual nodes - why do we need them and how many?
5. How do you select replica nodes using the ring?
6. What's the lookup complexity and why?

### Advanced Level
7. Explain the bounded loads extension
8. Compare ring hash vs. jump hash vs. rendezvous hash
9. How would you handle a "celebrity" key that gets massive traffic?
10. Design a gossip protocol for ring membership

---

## Red Flags in Your Answer

If you hear yourself saying these, course correct:

| Red Flag | Problem | Fix |
|----------|---------|-----|
| "Keys go to the closest node" | Direction matters | "First node CLOCKWISE" |
| "All keys on a failed node go to one node" | Only true without vnodes | "Spread across many nodes due to vnodes" |
| "Distribution is perfectly even" | Statistically unlikely | "Approximately even, within X% variance" |
| "We can just use MD5" | MD5 is for hashing, not security | "For position hashing, MD5/xxHash work fine" |
| "The ring stores the actual data" | Conflating routing with storage | "The ring determines which node, storage is separate" |
