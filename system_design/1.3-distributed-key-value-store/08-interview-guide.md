# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45 Minutes)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify | Requirements, scale, constraints | Ask 4-6 clarifying questions |
| **5-15 min** | High-Level Design | Components, data flow, partitioning | Draw architecture diagram |
| **15-30 min** | Deep Dive | 1-2 critical components | Show depth (LSM or conflicts) |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failures, decisions | Discuss alternatives |
| **40-45 min** | Wrap Up | Summary, handle follow-ups | Highlight key trade-offs |

---

## Phase 1: Clarifying Questions (0-5 min)

### Must-Ask Questions

| Question | Why It Matters | Follow-up |
|----------|---------------|-----------|
| "What's the expected scale - users, data size, QPS?" | Determines architecture complexity | "What's the peak multiplier?" |
| "What's the read:write ratio?" | Affects storage engine choice | "Is it bursty or steady?" |
| "What consistency is required - strong or eventual?" | Fundamental architecture decision | "Are there specific operations that need strong?" |
| "What are the latency requirements?" | Affects caching, replication strategy | "What's acceptable p99?" |
| "Do we need range queries or just point lookups?" | Affects partitioning strategy | "What's a typical query pattern?" |
| "Multi-region deployment needed?" | Affects replication complexity | "Active-active or active-passive?" |

### Sample Clarification Dialog

```
Interviewer: "Design a distributed key-value store."

You: "Before diving in, I'd like to understand the requirements better.

1. What scale are we targeting? Number of keys, QPS?
   → 'Tens of billions of keys, 500K QPS'

2. What's the read:write ratio?
   → '90:10, read-heavy'

3. What consistency model - eventual or strong?
   → 'Eventual is fine for most, but some keys need strong'

4. Latency requirements?
   → 'Under 10ms for p99 reads'

5. Do we need range queries?
   → 'No, just point lookups by key'

6. Multi-region?
   → 'Yes, 3 regions globally'

Great, so I'm designing a read-heavy, eventually consistent KV store
at massive scale with global distribution. Let me start with the
high-level architecture..."
```

---

## Phase 2: High-Level Design (5-15 min)

### What to Cover

1. **Core Components**
   - Client SDK
   - Coordinator layer
   - Storage nodes
   - Membership/gossip

2. **Partitioning Strategy**
   - Consistent hashing with virtual nodes
   - Why: Even distribution, minimal rebalancing

3. **Replication Strategy**
   - N=3 replicas, quorum (R=2, W=2)
   - Why: Balance durability and latency

4. **Data Flow**
   - Write path: Client → Coordinator → N replicas
   - Read path: Client → Coordinator → R replicas

### Whiteboard Diagram to Draw

```
┌──────────────────────────────────────────────────────────────┐
│                         Clients                               │
│                    (SDK with cluster map)                     │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              Any Node Can Be Coordinator                      │
│                                                               │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│   │ Node A  │◄──►│ Node B  │◄──►│ Node C  │◄──►│ Node D  │  │
│   │         │    │         │    │         │    │         │  │
│   │ Tokens: │    │ Tokens: │    │ Tokens: │    │ Tokens: │  │
│   │ 0-25%   │    │ 25-50%  │    │ 50-75%  │    │ 75-100% │  │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                                                               │
│                    Gossip Protocol                            │
│              (Membership, Failure Detection)                  │
└──────────────────────────────────────────────────────────────┘
```

### Key Points to Mention

```
"I'm using a Dynamo-style architecture because:
 1. Decentralized - no single point of failure
 2. Any node can coordinate - better load distribution
 3. Eventual consistency with tunable quorum
 4. Proven at scale (DynamoDB, Cassandra)"
```

---

## Phase 3: Deep Dive (15-30 min)

### Option A: LSM Tree Storage Engine

**When to choose:** Interviewer asks about storage, writes, or performance

```
"Let me dive into how data is stored using an LSM Tree...

Write Path:
1. Write goes to Write-Ahead Log (durability)
2. Insert into MemTable (in-memory skip list)
3. When MemTable is full (64MB), flush to disk as SSTable
4. Background compaction merges SSTables

Read Path:
1. Check MemTable (most recent)
2. Check immutable MemTables
3. Check SSTables with bloom filters
4. Bloom filter says 'might exist' → check data block

Why LSM Tree?
- Write optimized (sequential writes)
- Good for write-heavy or balanced workloads
- Bloom filters make reads efficient too"
```

**Diagram to draw:**

```
  Write                      Read
    │                          │
    ▼                          ▼
┌─────────┐              ┌─────────┐
│MemTable│◄─────────────│MemTable│ (check first)
└────┬────┘              └────┬────┘
     │ flush                  │ miss
     ▼                        ▼
┌─────────┐              ┌─────────┐
│L0 SST   │◄─────────────│Bloom    │ (may exist?)
└────┬────┘              │Filter   │
     │ compact           └────┬────┘
     ▼                        │ yes
┌─────────┐              ┌────▼────┐
│L1 SST   │◄─────────────│Index    │
└────┬────┘              └────┬────┘
     │                        │
     ▼                        ▼
   (L2, L3...)          Data Block
```

### Option B: Conflict Resolution with Vector Clocks

**When to choose:** Interviewer asks about consistency, conflicts, or AP systems

```
"Let me explain how we handle concurrent writes...

Problem: Two clients update the same key simultaneously

Vector Clocks track causality:
- Each node increments its own counter
- On write: increment local counter in clock
- On read: merge clocks, detect conflicts

Example:
  Node A writes: value='A', clock={A:1}
  Node B writes: value='B', clock={B:1}

  Neither clock dominates → CONCURRENT → CONFLICT!

Resolution options:
1. Last-Write-Wins (simple but may lose data)
2. Return both to client (like Amazon shopping cart)
3. CRDTs (automatic merge, limited data types)"
```

**Diagram to draw:**

```
Client 1                    Client 2
    │                           │
    │ PUT(key, "v1")            │ PUT(key, "v2")
    ▼                           ▼
┌──────────┐              ┌──────────┐
│ Node A   │              │ Node B   │
│ clock:   │              │ clock:   │
│ {A:1}    │              │ {B:1}    │
└──────────┘              └──────────┘
        \                    /
         \                  /
          ▼                ▼
        ┌──────────────────┐
        │    CONFLICT!     │
        │                  │
        │ Neither clock    │
        │ dominates        │
        │                  │
        │ Options:         │
        │ 1. LWW           │
        │ 2. Return both   │
        │ 3. CRDT merge    │
        └──────────────────┘
```

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Trade-offs to Discuss

| Decision | Option A | Option B | Your Choice & Why |
|----------|----------|----------|-------------------|
| **Consistency** | Strong (Raft) | Eventual (Dynamo) | "Eventual with tunable quorum - need availability for user-facing" |
| **Storage** | B-Tree | LSM Tree | "LSM Tree - write-optimized, good compression" |
| **Partitioning** | Range | Hash | "Hash (consistent hashing) - uniform distribution" |
| **Conflict** | LWW | Vector Clocks | "Vector clocks - don't want silent data loss" |
| **Compaction** | Size-tiered | Leveled | "Leveled - read-heavy workload" |

### Failure Scenarios to Address

```
"What if a node fails?"
→ "Replicas serve requests. Hinted handoff stores writes for
   failed node. When it recovers, hints are delivered."

"What about network partition?"
→ "In AP mode, both sides continue serving. Conflicts detected
   via vector clocks when partition heals. Sloppy quorum ensures
   availability."

"Hot key problem?"
→ "Several options:
   1. Read from all replicas (spread load)
   2. Local caching at coordinator
   3. Split hot key into multiple keys
   4. Dedicated 'hot key' cache tier"
```

### Scaling Discussion

```
"How would you scale to 10x traffic?"
→ "1. Add more nodes - consistent hashing means minimal data movement
   2. Each new node takes ~1/N of data from existing nodes
   3. For read-heavy, add read replicas
   4. For global scale, deploy in multiple regions"

"How to add nodes without downtime?"
→ "Bootstrap new node → stream data from existing → start serving
   reads → mark as fully active. Client SDK updates automatically
   via gossip."
```

---

## Trap Questions & Responses

| Trap Question | What They're Testing | Strong Response |
|---------------|---------------------|-----------------|
| "Why not just use a relational database?" | Understanding of KV trade-offs | "RDBMS works at smaller scale but struggles with: (1) Horizontal sharding is complex, (2) Schema flexibility, (3) Latency at millions of QPS. KV stores trade query flexibility for scalability and speed." |
| "What if the coordinator fails mid-request?" | Failure handling depth | "Request times out, client retries to different coordinator. If writes partially succeeded, replicas may have inconsistent versions. Read repair and anti-entropy will reconcile. For critical writes, use higher consistency level." |
| "How do you handle split-brain?" | Partition tolerance understanding | "In AP systems like Dynamo, both partitions continue serving - we prioritize availability. Conflicts detected via vector clocks when partition heals. In CP systems, minority partition rejects writes to maintain consistency." |
| "What about transactions across multiple keys?" | Distributed systems depth | "Single-key atomicity is straightforward with CAS. Multi-key transactions require 2PC or Paxos, adding significant latency and complexity. For most KV use cases, we design schemas to avoid multi-key transactions. If needed, consider Spanner-like approach with synchronized clocks." |
| "Compaction is falling behind - what do you do?" | Operational awareness | "This means write amplification is overwhelming I/O. Solutions: (1) Rate-limit writes temporarily, (2) Switch to size-tiered compaction for write-heavy, (3) Add more nodes to reduce per-node load, (4) Upgrade to faster storage (NVMe), (5) Tune compaction parallelism." |
| "Why virtual nodes instead of just consistent hashing?" | Algorithm understanding | "Basic consistent hashing leads to uneven distribution - some nodes get more data than others based on random hash positions. Virtual nodes (100-256 per physical node) smooth out the distribution statistically. Also enables gradual capacity changes - new node takes vnodes from all existing nodes evenly." |
| "A client reads their own write and gets old data - why?" | Consistency model depth | "This is 'read-your-writes' violation due to async replication. Solutions: (1) Use QUORUM consistency (R+W>N ensures overlap), (2) Sticky sessions to same coordinator, (3) Client tracks last write version and requests min_version on reads." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| Jumping to design without clarifying | May solve wrong problem | "Let me ask a few questions first..." |
| Choosing CP without justification | Shows template thinking | "I'd choose AP because [specific reason for this use case]" |
| Ignoring replication lag | Real systems have lag | "With async replication, there's a window where..." |
| Over-engineering day 1 | Unnecessary complexity | "Start with single-DC, add multi-DC when needed" |
| Forgetting compaction | Critical for LSM stores | "Background compaction is essential - let me explain..." |
| Using SQL terminology | Shows paradigm confusion | Use: partitions, replicas, tombstones (not tables, shards) |
| Single number for latency | Shows lack of depth | "P50 is 2ms, but p99 is 15ms due to..." |
| "Just add more servers" for scale | Shallow answer | "Adding nodes requires data rebalancing, which means..." |

---

## Quick Reference Cards

### Numbers to Remember

| Metric | Typical Value | Notes |
|--------|---------------|-------|
| Read latency (p99) | < 10ms | In-memory with bloom filters |
| Write latency (p99) | < 25ms | With quorum replication |
| Replication factor | 3 | Standard for durability |
| Quorum config | N=3, R=2, W=2 | R+W>N for consistency |
| Virtual nodes | 128-256 per node | Balance vs memory |
| Bloom filter FP rate | 1% | 10 bits per key |
| MemTable size | 64 MB | Before flush |
| L0 max files | 4-8 | Before compaction stalls |
| Compaction write amp | 10-30x | Leveled compaction |
| Hash ring size | 2^64 or 2^128 | Large for uniform distribution |

### Go-To Design Choices

| Decision | Default Choice | One-Line Rationale |
|----------|---------------|-------------------|
| Architecture | Dynamo-style (AP) | High availability, tunable consistency |
| Partitioning | Consistent hashing + vnodes | Even distribution, graceful scaling |
| Replication | N=3, R=2, W=2 | Balance durability and latency |
| Storage engine | LSM tree | Write-optimized, proven at scale |
| Conflict resolution | Vector clocks | Detect conflicts, no silent loss |
| Compaction | Leveled | Read-optimized, predictable space |
| Failure detection | Gossip + phi accrual | Decentralized, adaptive |

### Diagram Templates

**Consistent Hash Ring:**
```
        0°
         │
    ╭────┴────╮
   ╱           ╲
  │  A1    B1   │
 270°           90°
  │  C1    A2   │
   ╲           ╱
    ╰────┬────╯
         │
       180°

Key → hash → position → walk clockwise → first N distinct nodes
```

**LSM Tree Levels:**
```
Memory:  [MemTable] ──flush──► [Immutable MemTable]
                                      │
Disk:    L0: [SST][SST][SST][SST]  ◄──┘
              │ compact
         L1: [SST][SST][SST]  (sorted, non-overlapping)
              │ compact
         L2: [SST][SST][SST][SST][SST]  (10x larger)
              │
         ...
```

**Quorum Diagram:**
```
N=3 replicas:  [R1] [R2] [R3]

Write (W=2):   [✓]  [✓]  [?]   → Success when 2 ack
Read (R=2):    [✓]  [✓]  [?]   → Return when 2 respond

R + W > N:     2 + 2 > 3 ✓     → Overlap guaranteed
```

---

## Interview Success Checklist

Before ending the interview, ensure you've covered:

- [ ] Clarified requirements (scale, consistency, latency)
- [ ] Drew clear architecture diagram
- [ ] Explained partitioning strategy (consistent hashing)
- [ ] Explained replication strategy (quorum)
- [ ] Deep-dived into one component (LSM or conflicts)
- [ ] Discussed at least 2 trade-offs explicitly
- [ ] Addressed failure scenarios
- [ ] Mentioned real-world systems (DynamoDB, Cassandra)
- [ ] Answered trap questions thoughtfully

---

## Final Tips

1. **Lead with trade-offs:** "There's a trade-off between X and Y. Given our requirements, I'd choose X because..."

2. **Use real numbers:** "At 500K QPS with 3 replicas, that's 1.5M internal operations per second..."

3. **Acknowledge complexity:** "This is where it gets interesting - handling conflicts in a distributed system is one of the hardest problems..."

4. **Show operational awareness:** "In production, we'd also need to monitor compaction backlog, replication lag, and hot partitions..."

5. **Connect to real systems:** "This is similar to how DynamoDB handles it, with some differences in..."
