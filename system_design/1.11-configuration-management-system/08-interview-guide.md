# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45 minutes)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Problem Setup** | Why config management? | Static config problems, coordination needs |
| 5-15 min | **Core Design** | Architecture, data flow | Consensus layer, KV store, watch mechanism |
| 15-25 min | **Deep Dive** | Consensus, watches | Raft basics, event ordering, session/lease |
| 25-35 min | **Scalability** | Scaling, reliability | Read scaling, multi-DC, failover |
| 35-45 min | **Trade-offs** | System comparison, security | ZooKeeper vs etcd vs Consul, ACLs |

---

## Whiteboard Strategy

### Step 1: Start with the Problem (2 min)

```
"Let me first explain WHY we need a configuration management system..."

Draw this:

THE PROBLEM: Static Configuration
┌─────────────────────────────────────────────────────────────┐
│  config.yaml (deployed with application):                    │
│    db_connection: "postgres://10.0.1.1:5432/prod"           │
│    rate_limit: 1000                                          │
│    feature_dark_mode: false                                  │
│                                                              │
│  PROBLEMS:                                                   │
│  1. Change config → Redeploy all 500 instances             │
│  2. No coordination (who is the leader?)                    │
│  3. No real-time updates (poll every 60s?)                  │
│  4. No atomic multi-key updates                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: High-Level Architecture (5 min)

```
"Configuration management solves this with a centralized, consistent store..."

Draw this:

                   ┌─────────────────────────┐
                   │   Config Cluster         │
                   │   ┌─────────────────┐   │
                   │   │ Leader (Raft)   │   │
                   │   └────────┬────────┘   │
                   │     ┌──────┴──────┐     │
                   │     │   │         │     │
                   │   ┌─┴─┐ │       ┌─┴─┐   │
                   │   │ F1│ │       │ F2│   │
                   │   └───┘ │       └───┘   │
                   └─────────┼───────────────┘
                             │
      ┌──────────────────────┼──────────────────────┐
      │                      │                      │
      ▼                      ▼                      ▼
  ┌─────────┐          ┌─────────┐           ┌─────────┐
  │Service A│          │Service B│           │Admin CLI│
  │ (watch) │          │ (watch) │           │ (write) │
  └─────────┘          └─────────┘           └─────────┘

Key Points:
• All writes go through leader (consensus)
• Reads can go to any node (eventual or linearizable)
• Watch mechanism for real-time updates
• Leases for ephemeral data (leader election, locks)
```

### Step 3: Data Model and APIs (3 min)

```
"The core data model is key-value with versioning..."

DATA MODEL:
┌─────────────────────────────────────────────────────────────┐
│  Key: /config/payment/rate-limit                             │
│  Value: {"limit": 1000, "window": 1}                        │
│                                                              │
│  Metadata:                                                   │
│    create_revision: 1000    (global revision at creation)   │
│    mod_revision: 1050       (global revision at last mod)   │
│    version: 3               (per-key version)               │
│    lease: 12345             (optional, for ephemeral keys)  │
└─────────────────────────────────────────────────────────────┘

KEY APIs:
• Put(key, value, lease?) → revision
• Get(key/prefix) → [{key, value, revision}]
• Delete(key/prefix) → deleted_count
• Watch(key/prefix, start_revision) → event stream
• Transaction(compare[], success[], failure[]) → result
• LeaseGrant(ttl) → lease_id
• LeaseKeepAlive(lease_id) → remaining_ttl
```

### Step 4: Consensus (5 min)

```
"Strong consistency requires consensus across nodes..."

RAFT CONSENSUS (simplified):
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  1. Client sends write to Leader                            │
│                                                              │
│  2. Leader appends to log, sends to Followers               │
│     Leader: [1,1] [1,2] [2,3] [NEW]                        │
│                    ↓                                        │
│     F1:     [1,1] [1,2] [2,3] [NEW]  ✓ ACK                 │
│     F2:     [1,1] [1,2] [2,3] [NEW]  ✓ ACK                 │
│                                                              │
│  3. Majority (2/3) acked → Entry committed                  │
│                                                              │
│  4. Apply to state machine, respond to client               │
│                                                              │
│  Guarantees:                                                 │
│  • Linearizable: all writes appear in single order         │
│  • Durable: committed writes survive minority failures     │
│  • Consistent: all nodes see same sequence                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘

QUORUM MATH:
• 3 nodes: need 2 to commit → survive 1 failure
• 5 nodes: need 3 to commit → survive 2 failures
• 7 nodes: need 4 to commit → survive 3 failures
```

### Step 5: Watch Mechanism (3 min)

```
"Watch provides real-time updates without polling..."

WATCH FLOW:
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  1. Client subscribes:                                       │
│     Watch(/config/app/*, start_revision=100)                │
│                                                              │
│  2. Server tracks subscription:                              │
│     watchers["/config/app/*"] += client_1                   │
│                                                              │
│  3. When key changes (revision 105):                        │
│     PUT /config/app/db → value                              │
│                                                              │
│  4. Server finds matching watchers, sends event:            │
│     Event(PUT, /config/app/db, value, revision=105)        │
│                                                              │
│  5. Client receives event, updates local cache              │
│                                                              │
│  Guarantees:                                                 │
│  • FIFO per watch (events in revision order)               │
│  • No gaps (all events from start_revision delivered)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Step 6: Scaling and Reliability (5 min)

```
"How do we scale reads and handle failures?..."

READ SCALING:
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  Option 1: Follower reads (serializable)                    │
│  • Read from any node                                        │
│  • May be slightly stale                                     │
│  • Scales horizontally                                       │
│                                                              │
│  Option 2: Linearizable reads (via leader)                  │
│  • Leader confirms it's still leader                        │
│  • Guaranteed fresh                                          │
│  • Doesn't scale (all reads to leader)                      │
│                                                              │
│  Option 3: Client-side caching (recommended)                │
│  • Cache config locally                                      │
│  • Watch for invalidation                                    │
│  • Near-zero latency, infinite scale                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

FAILOVER:
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  T=0:    Leader crashes                                     │
│  T=150ms: Followers detect (no heartbeat)                   │
│  T=200ms: Election starts                                   │
│  T=250ms: New leader elected                                │
│  T=300ms: Cluster operational                               │
│                                                              │
│  Total downtime: ~300ms (automatic)                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Talking Points

### When Asked "What is Configuration Management?"

> "A configuration management system provides centralized, strongly consistent storage for application configuration and coordination data. Unlike a regular database, it's optimized for small values with real-time change notification through watches. It also provides coordination primitives like distributed locks and leader election via leases and ephemeral keys. Think of it as the 'source of truth' for how your distributed system should behave, with guarantees that all nodes see the same configuration."

### When Asked "Why Not Just Use a Database?"

> "Regular databases are optimized for different use cases. Configuration management systems offer:
> 1. **Watch mechanism**: Real-time notifications instead of polling
> 2. **Strong consistency**: Linearizable writes for coordination
> 3. **Coordination primitives**: Built-in leader election, locks via leases
> 4. **Optimized for small data**: Low latency for ~1KB values
> 5. **Simpler operations**: 3-7 nodes vs complex sharded databases
>
> A database can store config, but lacks native watches and coordination features."

### When Asked "Explain Raft Consensus"

> "Raft is a consensus protocol that ensures all nodes agree on a sequence of operations. Key concepts:
> 1. **Leader election**: One node is leader, handles all writes
> 2. **Log replication**: Leader replicates entries to followers
> 3. **Commit**: Entry committed when majority acknowledges
> 4. **Term**: Logical clock that increments on each election
>
> The key insight is that quorum-based replication (majority) ensures any two majorities overlap, so committed data is never lost even if minority fails."

### When Asked "How Do Watches Work?"

> "Watches are subscriptions to key changes. When a client creates a watch on a key or prefix, the server tracks that subscription. When any write occurs that matches the watch filter, the server pushes an event to the client with the new value and revision number.
>
> The client can specify a start_revision to receive all changes since that point, enabling catch-up after disconnection. Events are guaranteed to arrive in revision order within a single watch, and revision tracking ensures no events are missed."

---

## Trap Questions & How to Handle

### Trap 1: "Why not just use Redis?"

**What they want:** Understanding of consistency requirements.

**Good answer:**
> "Redis is excellent for caching and high-throughput scenarios, but has different consistency guarantees:
> 1. **Consistency**: Redis Cluster uses asynchronous replication; you can lose acknowledged writes. Config management needs strong consistency.
> 2. **Coordination**: Redis lacks native distributed locks with fencing tokens, leases with auto-cleanup.
> 3. **Watches**: Redis pub/sub doesn't guarantee delivery or ordering like etcd watches.
>
> For configuration and coordination, you need the guarantees that Raft consensus provides. For caching, Redis is better."

### Trap 2: "How do you handle a slow client that can't keep up with watch events?"

**What they want:** Understanding of backpressure and resource management.

**Good answer:**
> "This is the 'slow consumer' problem. Solutions:
> 1. **Bounded event queue**: Each watcher has a limited queue (e.g., 1000 events). If full, disconnect the client.
> 2. **Revision tracking**: Disconnected client can reconnect with last-received revision and catch up.
> 3. **Compaction awareness**: If client is too far behind (revision compacted), send error and let client reinitialize.
> 4. **Event coalescing**: For very slow clients, send only latest value for each key rather than every intermediate change.
>
> The key is protecting the server while allowing clients to catch up gracefully."

### Trap 3: "What happens during a network partition?"

**What they want:** Understanding of CAP theorem trade-offs.

**Good answer:**
> "Configuration management systems are CP (consistent + partition-tolerant):
> 1. **Majority partition**: Continues operating, can elect leader, accept writes
> 2. **Minority partition**: Cannot form quorum, rejects writes, may serve stale reads
> 3. **Leader in minority**: Leader steps down (leader lease expires), minority becomes read-only
>
> This is the right trade-off for config: it's better to reject writes than accept conflicting writes. Clients in minority partition should use cached data and retry.
>
> For cross-DC scenarios, either accept higher latency (stretched cluster) or use regional clusters with eventual consistency (async replication)."

### Trap 4: "How do you handle the leader being a bottleneck?"

**What they want:** Understanding of scaling limitations.

**Good answer:**
> "The leader bottleneck is fundamental to consensus-based systems. Mitigations:
> 1. **Batch writes**: Collect writes for a few ms, commit as single Raft entry
> 2. **Pipeline replication**: Don't wait for each entry to commit before sending next
> 3. **Read scaling**: Serve reads from followers (serializable) or use client caching
> 4. **Sharding**: For extreme scale, partition keyspace across clusters (e.g., by tenant/namespace)
>
> In practice, a single etcd cluster handles 10,000+ writes/sec, which is sufficient for configuration use cases. If you need more, you probably need a different system."

### Trap 5: "How is this different from service discovery?"

**What they want:** Clear separation of concerns.

**Good answer:**
> "There's overlap, but different optimization points:
>
> **Configuration Management** (etcd, ZooKeeper):
> - Strong consistency (linearizable)
> - Small data, low write rate
> - Coordination primitives (locks, elections)
> - Watch for config changes
>
> **Service Discovery** (Eureka, Consul catalog):
> - High availability, eventual consistency acceptable
> - High churn (instances starting/stopping)
> - Health checking focus
> - DNS integration
>
> Consul actually has both: KV store (config) + Catalog (discovery). They're often co-located because both need a consistent distributed store underneath."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Correct Approach |
|---------|---------------|------------------|
| Suggesting eventual consistency for config | Config changes must be atomic and visible to all | Strong consistency (Raft/ZAB) |
| Ignoring the leader bottleneck | All writes go through one node | Mention batching, read scaling, sharding |
| Forgetting about watches | Polling is inefficient | Explain watch mechanism, event ordering |
| Not mentioning leases | Core for coordination | Explain TTL, ephemeral data, keepalive |
| Proposing even-numbered clusters | Doesn't improve fault tolerance | Explain quorum math (3, 5, 7 nodes) |
| Overlooking compaction | Unbounded storage growth | Mention compaction, revision history |

---

## Implementation Comparison Table

| Feature | ZooKeeper | etcd | Consul KV |
|---------|-----------|------|-----------|
| **Consensus** | ZAB | Raft | Raft |
| **Data Model** | Hierarchical (znodes) | Flat (key-value) | Flat (key-value) |
| **Watch** | One-time trigger | Persistent stream | Blocking query / watch |
| **Max Value Size** | 1 MB | 1.5 MB | 512 KB |
| **Session/Lease** | Session (heartbeat) | Lease (TTL) | Session (TTL) |
| **Multi-DC** | Observer nodes | External proxy | Native WAN federation |
| **Best For** | Hadoop ecosystem, coordination | Kubernetes, modern infra | Service mesh, multi-DC |

### When to Choose Each

```
┌─────────────────────────────────────────────────────────────────────┐
│  CHOOSING A SYSTEM                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Choose ZooKeeper if:                                                │
│  • Existing Java/Hadoop ecosystem                                   │
│  • Need hierarchical data model                                     │
│  • Using Kafka (ZK dependency, though changing)                     │
│                                                                      │
│  Choose etcd if:                                                     │
│  • Building on Kubernetes (native)                                  │
│  • Want simple, modern API (gRPC)                                   │
│  • Need efficient range/prefix queries                              │
│                                                                      │
│  Choose Consul KV if:                                                │
│  • Need both config and service discovery                           │
│  • Multi-datacenter is priority                                     │
│  • Want built-in ACLs and UI                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONFIG MANAGEMENT CHEAT SHEET                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CORE CONCEPT                                                        │
│  • Centralized, consistent key-value store                          │
│  • Strong consistency via consensus (Raft/ZAB)                      │
│  • Watch mechanism for real-time updates                            │
│  • Leases for ephemeral data and coordination                       │
│                                                                      │
│  DATA MODEL                                                          │
│  • Key: path-like string (/config/app/db)                          │
│  • Value: bytes (typically JSON, < 1 MB)                           │
│  • Revision: global logical clock for ordering                      │
│  • Version: per-key update counter                                  │
│                                                                      │
│  CONSENSUS                                                           │
│  • Leader handles all writes                                        │
│  • Replicates to followers via log                                  │
│  • Committed when majority acknowledges                             │
│  • Quorum: 3 nodes → 2 needed, 5 nodes → 3 needed                 │
│                                                                      │
│  WATCHES                                                             │
│  • Subscribe to key or prefix                                       │
│  • Server pushes events on change                                   │
│  • Revision tracking for no-gaps guarantee                          │
│                                                                      │
│  LEASES                                                              │
│  • TTL-based session                                                │
│  • Client sends keepalive periodically                              │
│  • Attached keys deleted when lease expires                         │
│  • Enables: leader election, distributed locks                      │
│                                                                      │
│  SCALING                                                             │
│  • Write: single leader (batch, pipeline)                           │
│  • Read: follower reads, client caching                             │
│  • Extreme: shard by namespace                                      │
│                                                                      │
│  SYSTEMS                                                             │
│  • ZooKeeper: hierarchical, ZAB, Java ecosystem                    │
│  • etcd: flat, Raft, Kubernetes native                             │
│  • Consul: flat, Raft, multi-DC, service discovery                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Practice Questions

### Basic Level
1. What problem does configuration management solve?
2. Draw the basic architecture of a config management system
3. What is the difference between a regular database and a config store?

### Intermediate Level
4. Explain how Raft consensus ensures consistency
5. How do watches work and what guarantees do they provide?
6. What are leases and how do they enable leader election?

### Advanced Level
7. How would you design a multi-datacenter config system?
8. Compare ZooKeeper, etcd, and Consul - when would you choose each?
9. How do you handle the leader bottleneck at scale?
10. What happens to watches during a network partition?

---

## Red Flags in Your Answer

If you hear yourself saying these, course correct:

| Red Flag | Problem | Fix |
|----------|---------|-----|
| "Eventual consistency is fine for config" | Config needs strong consistency | Explain why writes must be linearizable |
| "Just use Redis/Postgres" | Misses coordination requirements | Discuss watches, leases, consistency |
| "4-node cluster for better availability" | Even numbers don't help | Explain quorum math, use 3, 5, or 7 |
| "Poll the config every few seconds" | Inefficient, high latency | Describe watch mechanism |
| "All nodes can accept writes" | Violates consensus | Single leader for writes |
| "It's like a distributed file system" | Different consistency model | Emphasize small data, strong consistency |
