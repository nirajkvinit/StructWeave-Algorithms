# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45-minute format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify | Requirements, use case | Ask about correctness vs efficiency |
| **5-15 min** | High-Level | Architecture, consensus choice | Draw leader-follower diagram |
| **15-30 min** | Deep Dive | Fencing tokens, lock algorithm | This is where you differentiate |
| **30-40 min** | Scale & Trade-offs | Failure handling, bottlenecks | Show production thinking |
| **40-45 min** | Wrap Up | Summary, questions | Mention observability |

---

## Meta-Commentary: How to Approach This Problem

### What Makes Distributed Locks Unique

1. **Correctness is paramount** - Unlike most systems, "mostly works" is unacceptable
2. **Fencing is the key insight** - This separates good answers from great ones
3. **Consensus is required** - Can't hand-wave this; must understand why
4. **It's a building block** - Interviewers expect depth, not breadth
5. **Redlock is a trap** - Know when it's safe and when it's not

### Where to Spend Most Time

| Area | Time Allocation | Why |
|------|-----------------|-----|
| Fencing tokens | 25% | Most overlooked, most important |
| Lock algorithm (ZK/etcd style) | 20% | Shows you understand the recipe |
| Consensus protocol basics | 20% | Foundation for everything else |
| Failure scenarios | 20% | Shows production experience |
| API and data model | 10% | Important but less differentiating |
| Scaling | 5% | Lock managers don't need massive scale |

### Key Insight to Demonstrate

> "A distributed lock without fencing tokens is only safe for efficiency—avoiding duplicate work. For correctness—where mutual exclusion must be guaranteed—the storage service must validate monotonic fencing tokens to reject stale lock holders."

---

## Questions to Ask Interviewer

### Clarifying Questions

| Question | Why It Matters |
|----------|----------------|
| Is this for efficiency or correctness? | Determines if Redlock is acceptable |
| What's the expected lock hold duration? | Affects lease TTL design |
| Do we need fairness (FIFO ordering)? | Affects algorithm complexity |
| Single region or multi-region? | Changes latency/availability trade-offs |
| What's the expected lock operation rate? | Usually not high; validates assumptions |
| Do clients need to store data with locks? | Affects data model |

### Scope Questions

| Question | Narrowing Scope |
|----------|-----------------|
| Should I design the consensus protocol in detail? | Usually not; focus on lock service |
| Is read-write lock distinction in scope? | Adds complexity |
| Do we need cross-namespace locks? | Significantly complicates design |
| Should I cover the client library design? | Time permitting |

---

## Trade-offs Discussion

### Consensus-Based vs Redlock

| Decision | Consensus (ZK/etcd) | Redlock |
|----------|---------------------|---------|
| | **Pros:** Fencing tokens, strong guarantees, proven | **Pros:** Lower latency, simpler ops, uses existing Redis |
| | **Cons:** Higher latency, operational complexity | **Cons:** No fencing, clock assumptions, unsafe for correctness |
| **Recommendation** | **Correctness-critical locks** | Efficiency locks only |

### Lease Duration Trade-offs

| Decision | Short TTL (5-10s) | Long TTL (30-60s) |
|----------|-------------------|-------------------|
| | **Pros:** Fast failure detection, quick lock recovery | **Pros:** Less renewal traffic, tolerates more jitter |
| | **Cons:** More renewals, risk of false expiry | **Cons:** Slow failure detection, locks held longer after crash |
| **Recommendation** | High-frequency operations | Long-running operations |

### Watch Granularity

| Decision | Watch Lock Holder | Watch Predecessor |
|----------|-------------------|-------------------|
| | **Pros:** Simple implementation | **Pros:** O(1) notifications, no herd effect |
| | **Cons:** Thundering herd on release | **Cons:** More complex, chain of watches |
| **Recommendation** | Never for production | **Always use predecessor watching** |

### Multi-Region Deployment

| Decision | Single Region | Multi-Region Raft |
|----------|---------------|-------------------|
| | **Pros:** Low latency (< 5ms), simple | **Pros:** Survives region failure, high availability |
| | **Cons:** Region failure = downtime | **Cons:** High latency (60-100ms), complex |
| **Recommendation** | Most use cases | Mission-critical only |

---

## Trap Questions & How to Handle

### Trap 1: "Can't we just use Redis SET NX?"

**What Interviewer Wants:** Understanding of distributed lock limitations

**Best Answer:**
> "Single Redis SET NX has two fundamental problems:
>
> 1. **No fault tolerance** - If Redis fails, all locks are lost. No replication means SPOF.
>
> 2. **No fencing tokens** - Even with TTL, a slow client (GC pause) can corrupt data after lock expires.
>
> For efficiency locks where duplicate work is acceptable, SET NX is fine. For correctness locks, we need consensus-based systems like etcd or ZooKeeper that provide monotonic fencing tokens the storage service can validate."

---

### Trap 2: "How do you handle a GC pause?"

**What Interviewer Wants:** Deep understanding of the fencing token problem

**Best Answer:**
> "This is exactly why fencing tokens are critical. Here's the scenario:
>
> 1. Client A acquires lock with fencing token 100
> 2. Client A has a 30-second GC pause
> 3. Lock expires (TTL exceeded)
> 4. Client B acquires lock with fencing token 101
> 5. Client B writes to storage with token 101
> 6. Client A's GC ends, tries to write with token 100
> 7. **Storage rejects** because 100 < 101
>
> The key insight is that the **storage service**, not the lock service, is the last line of defense. Without fencing token validation at the storage layer, no distributed lock is truly safe for correctness."

---

### Trap 3: "Why not just use database row locks?"

**What Interviewer Wants:** Understanding of different locking scopes

**Best Answer:**
> "Database row locks are great when you're locking database resources. But distributed locks solve a different problem—coordinating across multiple services or processes that may not share a database.
>
> Use cases where database locks don't help:
> - Leader election for a service cluster
> - Coordinating a cache warmup across multiple pods
> - Preventing concurrent executions of a scheduled job
> - Protecting access to an external API with rate limits
>
> Also, database locks are tied to transaction scope. Distributed locks with leases allow longer hold times with explicit failure detection."

---

### Trap 4: "What happens during a network partition?"

**What Interviewer Wants:** Understanding of CP system behavior

**Best Answer:**
> "Our lock manager is a CP system—it prioritizes Consistency over Availability during partitions.
>
> **Scenario 1: Leader in minority partition**
> - Leader cannot commit (no quorum)
> - Clients on leader's side cannot acquire locks
> - Majority partition elects new leader
> - System remains **safe** (no dual grants) but partially **unavailable**
>
> **Scenario 2: Leader in majority partition**
> - Leader + majority continues operating normally
> - Minority partition is isolated, cannot participate
> - System remains **safe** and **available** for majority
>
> **Scenario 3: No majority possible**
> - No partition can elect leader
> - System is **safe** but **unavailable** until partition heals
>
> The key principle: We never sacrifice safety. Better to be unavailable than to grant the same lock to two holders."

---

### Trap 5: "How is this different from leader election?"

**What Interviewer Wants:** Understanding that locks and leader election are related

**Best Answer:**
> "They're closely related—leader election is essentially a special case of distributed locking.
>
> **Similarities:**
> - Both need mutual exclusion (one leader / one lock holder)
> - Both use consensus for safety
> - Both need failure detection (leader/holder crash)
>
> **Differences:**
> - **Leader election** is typically for a fixed resource (the leadership role)
> - **Distributed locks** are for arbitrary named resources
> - Leader election often uses the lock service internally
>
> In fact, you can implement leader election using our lock service:
> ```
> lock = lock_service.lock('/election/my-service', lease=30s)
> if lock.acquired:
>     become_leader(lock.fencing_token)
> ```
>
> Services like etcd provide both primitives, and internally the lock service itself uses Raft leader election."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Do Instead |
|---------|----------------|-------------------|
| Skipping fencing tokens | Makes entire design unsafe | Explain fencing early and often |
| Proposing Redlock for everything | Unsafe for correctness | Ask if efficiency or correctness |
| Watching lock holder | Causes thundering herd | Watch predecessor in queue |
| Ignoring consensus | Can't hand-wave distributed systems | At least explain why Raft/Paxos needed |
| Over-scaling | Lock managers don't need massive scale | Focus on correctness, not throughput |
| Forgetting failure scenarios | Shows lack of experience | Discuss partition, crash, slow client |
| Not mentioning lease renewal | Locks would never expire safely | Explain renewal at TTL/3 |

---

## Lock Service Selection Flowchart

```
START: Do you need a distributed lock?
         │
         ▼
┌────────────────────────────────────┐
│ Can you use database transactions? │
│ (Same DB, short hold time)         │
└────────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
   YES        NO
    │         │
    ▼         ▼
┌────────┐   ┌────────────────────────────────────┐
│Use DB  │   │ Is duplicate work acceptable?      │
│locks   │   │ (Efficiency lock)                  │
└────────┘   └────────────────────────────────────┘
                      │
                 ┌────┴────┐
                 │         │
                YES        NO (Correctness lock)
                 │         │
                 ▼         ▼
           ┌──────────┐   ┌────────────────────────┐
           │ Redlock  │   │ Do you have etcd/ZK?   │
           │ or Redis │   │ (Already in stack)     │
           │ SET NX   │   └────────────────────────┘
           └──────────┘            │
                              ┌────┴────┐
                              │         │
                             YES        NO
                              │         │
                              ▼         ▼
                        ┌──────────┐   ┌──────────┐
                        │ Use      │   │ Deploy   │
                        │ existing │   │ etcd or  │
                        │ etcd/ZK  │   │ Consul   │
                        └──────────┘   └──────────┘
```

---

## Quick Reference Card

### Lock Service Comparison

| Feature | ZooKeeper | etcd | Consul | Redlock |
|---------|-----------|------|--------|---------|
| Consensus | ZAB | Raft | Raft | None |
| Fencing token | zxid | revision | ModifyIndex | **No** |
| Watch support | Yes | Yes | Yes | No |
| Correctness safe | **Yes** | **Yes** | **Yes** | **No** |
| Latency | 10-20ms | 5-15ms | 5-15ms | 1-5ms |
| Operational complexity | High | Medium | Medium | Low |

### Key Numbers to Remember

| Metric | Typical Value |
|--------|---------------|
| Raft election timeout | 1-2 seconds |
| Raft heartbeat interval | 100-300ms |
| Lock acquisition latency | 5-20ms |
| Lease TTL | 10-30 seconds |
| Renewal interval | TTL / 3 |
| Cluster size | 3, 5, or 7 (odd) |
| Quorum (5 nodes) | 3 |
| Tolerable failures (5 nodes) | 2 |
| Throughput (single cluster) | 10K-50K ops/sec |

### Algorithm Quick Reference

```
ZooKeeper Lock Recipe:
1. Create ephemeral sequential node
2. Get children, sort by sequence
3. If lowest, have lock
4. Else watch predecessor (NOT holder!)
5. On delete event, repeat from step 2

etcd Lock:
1. Grant lease (TTL)
2. Create key with lease, get revision
3. List keys, find lowest revision
4. If mine, have lock (revision = fencing token)
5. Else watch predecessor key
6. Renew lease periodically (TTL/3)

Fencing Token Validation (Storage):
IF request.token < last_seen_token:
    REJECT (stale client)
ELSE:
    last_seen_token = request.token
    ACCEPT write
```

---

## Summary: Key Points to Hit

1. **Start with clarifying** - Efficiency vs correctness determines the entire approach
2. **Explain fencing tokens early** - This is THE differentiator for a great answer
3. **Draw the GC pause scenario** - Shows deep understanding of the problem
4. **Use consensus for correctness** - Can't hand-wave; briefly explain Raft
5. **Show the ZK/etcd recipe** - Demonstrates you know how it's actually implemented
6. **Discuss predecessor watching** - Avoids thundering herd, shows attention to detail
7. **Handle failure scenarios** - Partition, crash, slow client
8. **Mention Redlock limitations** - Shows you know the Kleppmann critique
9. **Keep scaling simple** - Lock managers don't need Netflix scale
10. **End with observability** - Metrics for lock contention, leader health

---

## Interview Scenarios

### Scenario 1: "Design a lock for database migrations"

**Key considerations:**
- Long hold time (minutes to hours)
- Must not expire during migration
- Need to detect abandoned migrations

**Approach:**
- Long lease with frequent renewal
- Store migration metadata with lock
- Watchdog to detect stuck migrations
- Fencing token passed to database operations

### Scenario 2: "Design leader election for microservices"

**Key considerations:**
- Multiple services need leaders
- Fast failover on leader crash
- Must prevent split-brain

**Approach:**
- One lock per service (`/election/{service-name}`)
- Lease-based with 30s TTL
- Winner is leader, losers watch
- Fencing token for leader operations

### Scenario 3: "Design a lock for rate limit quota"

**Key considerations:**
- High frequency operations
- Can tolerate occasional duplicate
- Need low latency

**Approach:**
- This is an **efficiency lock** - Redlock is acceptable
- Or use Redis SET NX with short TTL
- Accept that races may cause slight over-limit
- No fencing needed (just avoiding duplicate work)
