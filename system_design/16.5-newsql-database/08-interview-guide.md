# Interview Guide — NewSQL Database

## Interview Pacing (45-min Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify** | Scope the problem | What workload? (OLTP, HTAP, geo-distributed?) What consistency? (serializable, snapshot?) What scale? (single-region, multi-region?) |
| 5-15 min | **High-Level** | Core architecture | SQL layer on distributed KV; range-based sharding; Raft per range; MVCC with HLC timestamps |
| 15-30 min | **Deep Dive** | 1-2 critical components | Pick: distributed transactions (parallel commits), clock synchronization (HLC), or range management (splits/merges/rebalancing). Go deep. |
| 30-40 min | **Scale & Trade-offs** | Distribution challenges | Multi-region latency, cross-range transactions, hot spots, LSM compaction |
| 40-45 min | **Wrap Up** | Summary + operational concerns | Monitoring Raft health, clock skew detection, schema change strategies |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **Three-layer coordination:** Unlike a key-value store (one layer) or a traditional RDBMS (one layer), a NewSQL database coordinates across the SQL layer (query planning), the transaction layer (distributed ACID), and the storage layer (Raft consensus). A bug or bottleneck in any layer cascades to the others.

2. **Clock synchronization without hardware:** Systems with atomic clocks (like Spanner) can simply wait out the uncertainty interval. Commodity systems using NTP must handle uncertainty windows of 100-250ms, forcing architectural compromises like read restarts and observed timestamp tracking.

3. **Range as the atomic unit:** Every design decision — replication, load balancing, transaction routing, compaction — centers on the range. Understanding how ranges split, merge, move, and replicate is understanding the system.

4. **Serializable isolation at scale:** Single-node serializable isolation is well-understood. Distributed serializable isolation requires solving timestamp ordering, write intent management, and conflict detection across nodes — while maintaining low latency.

### Where to Spend Most Time

- **Distributed transactions:** Explain how parallel commits reduce latency from 2 consensus rounds to 1. Show understanding of write intents, the STAGING state, and async resolution.
- **Clock synchronization:** Explain HLC, read uncertainty intervals, and read restarts. This is where candidates differentiate themselves.
- **Range architecture:** Explain how data is split into ranges, how each range runs its own Raft group, and how the leaseholder serves reads.

### How to Approach This Problem

1. Start with the key insight: SQL on top of a distributed KV store
2. Design the KV layer first (ranges, Raft, leaseholder)
3. Layer transactions on top (MVCC, intents, parallel commits)
4. Layer SQL on top (parser, optimizer, distributed executor)
5. Address clock synchronization (HLC, uncertainty, restarts)
6. Discuss operations (range splits, rebalancing, schema changes)

---

## Trade-offs Discussion

### Decision 1: SQL-on-KV vs. Native Distributed Relational Engine

| Aspect | SQL Layer on Distributed KV | Native Distributed Relational |
|--------|---------------------------|------------------------------|
| Pros | Clean separation of concerns; KV layer reusable; simpler storage engine | Tighter integration; fewer translation layers; potentially lower overhead |
| Cons | SQL-to-KV encoding overhead; impedance mismatch for relational operations | Monolithic; harder to evolve independently; KV not reusable |
| **Recommendation** | **Choose SQL-on-KV.** The industry has converged on this architecture (CockroachDB, TiDB, YugabyteDB) because it cleanly separates the distribution problem (KV layer) from the relational problem (SQL layer). |

### Decision 2: Per-Range Raft vs. Global Consensus

| Aspect | Per-Range Raft Groups | Global Consensus (Single Group) |
|--------|---------------------|-------------------------------|
| Pros | Independent failure domains; parallel writes to different ranges; granular replication | Simpler implementation; single log to manage; no range routing |
| Cons | Thousands of Raft groups consume resources (memory, goroutines); complex coordination | Bottleneck: all writes serialize through one leader; cannot scale writes |
| **Recommendation** | **Per-range Raft.** The only way to scale writes is to parallelize consensus across independent ranges. A single global Raft group creates a write throughput ceiling equal to one node's consensus capacity. |

### Decision 3: Serializable vs. Snapshot Isolation as Default

| Aspect | Serializable (Default) | Snapshot Isolation (Default) |
|--------|----------------------|----------------------------|
| Pros | No anomalies; application developers don't need to reason about isolation | Higher throughput; fewer aborts; compatible with more application patterns |
| Cons | Higher abort rate under contention; some workloads pay unnecessary serialization cost | Write skew anomaly possible; application must handle edge cases |
| **Recommendation** | **Serializable as default.** For a NewSQL database positioning itself as a PostgreSQL/MySQL replacement, correctness must be the default. Developers can opt into weaker isolation for specific workloads. |

### Decision 4: LSM-Tree vs. B-Tree Storage Engine

| Aspect | LSM-Tree | B-Tree |
|--------|---------|--------|
| Pros | Higher write throughput; natural MVCC versioning; better compression | Lower read amplification; no compaction overhead; predictable latency |
| Cons | Read amplification (check multiple levels); compaction consumes I/O | Write amplification on random updates; less natural for append-only MVCC |
| **Recommendation** | **LSM-tree.** The append-only write pattern aligns with MVCC (each version is a new entry) and Raft replication (followers apply log entries sequentially). Compaction overhead is manageable with proper tuning. |

### Decision 5: TrueTime vs. Hybrid Logical Clocks

| Aspect | TrueTime (Atomic Clocks) | Hybrid Logical Clocks |
|--------|------------------------|---------------------|
| Pros | Tight uncertainty (~7ms); guaranteed external consistency; simple commit protocol | No special hardware; commodity deployment; good-enough for serializable isolation |
| Cons | Requires GPS + atomic clocks in every datacenter; vendor lock-in | Wider uncertainty (~250ms); read restarts under contention; no external consistency guarantee |
| **Recommendation** | **HLC for commodity deployments.** Most applications do not need external consistency (real-time ordering visible to external observers). HLC provides serializable isolation and causal ordering at zero hardware cost. |

---

## Trap Questions & How to Handle

### Trap 1: "Why not just shard a traditional database?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Understanding of why NewSQL exists | Sharding a traditional RDBMS (via application-level sharding or middleware like Vitess) solves the storage scaling problem but loses distributed transactions, cross-shard joins, and automatic rebalancing. Every cross-shard operation becomes the application's problem. A NewSQL database provides these capabilities natively — the application writes standard SQL, and the database handles distribution transparently. The trade-off is higher single-node latency (consensus overhead) for transparent horizontal scalability. |

### Trap 2: "How do you handle clock skew without atomic clocks?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Deep understanding of clock synchronization | Explain HLC: it combines physical time with a logical counter to guarantee causal ordering. The key challenge is the read uncertainty interval — when a reader encounters a value with a timestamp within the uncertainty window, it cannot determine ordering and must restart at a higher timestamp. Explain how observed timestamps narrow the window: once a leaseholder serves a read at timestamp T, it guarantees no future committed writes exist below T, eliminating uncertainty for subsequent reads from the same node. Mention that tighter NTP configuration (PTP, chrony) reduces the uncertainty window and restart rate. |

### Trap 3: "What happens when a range is too hot?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Practical systems thinking | A "hot range" means one range's Raft group is bottlenecked. Explain three mitigation strategies in order of preference: (1) Load-based range splitting — split the hot range at the load midpoint so each half handles half the traffic with its own Raft group. (2) Hash-sharded indexes — for sequential insert patterns (auto-increment, timestamps), add a hash prefix to scatter writes across ranges. (3) Follower reads — for read-hot ranges, serve reads from followers (with bounded staleness) to reduce leaseholder load. Also mention that the fundamental limit is the Raft group's write throughput (~2,500 writes/sec per range), and the only way to exceed it is splitting. |

### Trap 4: "How does a distributed transaction commit atomically?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Deep understanding of commit protocol | Walk through parallel commits: (1) Write intents to all participating ranges in parallel via Raft. (2) Write a STAGING transaction record. (3) Once the STAGING record and all intents are durable, the transaction is implicitly committed — return success to the client in one consensus round-trip. (4) Asynchronously resolve intents (convert from provisional to committed values). Explain why STAGING works: any node discovering the STAGING record can verify whether all intents are present, and if so, the transaction is committed regardless of coordinator status. This makes the protocol resilient to coordinator failure. |

### Trap 5: "How do you do schema changes without downtime?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Operational awareness | Explain the backfill-based approach: (1) Add the new schema version to the system catalog. (2) Nodes transition through schema versions in stages — first allowing reads of the new schema, then allowing writes, then dropping the old schema. (3) For operations like adding an index, a background job scans all ranges and backfills the index entries, processing in batches to limit impact on foreground traffic. (4) The key insight is that at any moment, the cluster may have nodes running two adjacent schema versions — the protocol ensures they don't conflict. This is fundamentally different from traditional ALTER TABLE which locks the table. |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Designing a single Raft group for all data | Creates a write throughput ceiling | Per-range Raft groups for parallel consensus |
| Ignoring clock synchronization | "Just use timestamps" without addressing skew | Explain HLC, uncertainty intervals, and read restarts |
| Proposing application-level sharding | Defeats the purpose of a NewSQL database | Explain transparent range-based sharding |
| Ignoring write intents and conflict resolution | Missing the core of distributed transactions | Explain intent-based MVCC and parallel commits |
| Assuming reads are free | Reads from leaseholder still require lease verification | Explain leaseholder reads, follower reads, and their trade-offs |
| No discussion of range splits | Ranges are the fundamental unit — ignoring them misses the architecture | Explain automatic splitting, merging, and rebalancing |
| Treating SQL layer as trivial | "Just add a SQL parser" ignores distributed query planning | Explain pushdown optimization and distributed execution |

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|----------|---------------|
| Single-region or multi-region? | Determines clock synchronization strategy and replication topology |
| What consistency level is required? | Serializable vs. snapshot isolation affects transaction protocol complexity |
| Expected workload profile? (OLTP, HTAP, mixed) | Determines storage engine choice and resource allocation |
| What is the expected data size and growth rate? | Determines range count, cluster size, and scaling strategy |
| Does the application need cross-shard transactions? | Determines whether a simpler sharding approach might suffice |
| What is the current database? (migration scenario) | Determines wire protocol compatibility requirements |
| Latency budget for writes? | Determines replication topology (local quorum vs. cross-region quorum) |

---

## Quick Reference Card

```
NEWSQL DATABASE DESIGN CHEATSHEET
──────────────────────────────────
Architecture: SQL layer → Transaction layer → Distributed KV
Sharding: Range-based (contiguous key spans, auto-split at 512 MB)
Replication: Per-range Raft consensus (3x default)
Reads: Leaseholder-only (strong); follower reads (bounded stale)
Writes: Intent-based MVCC → Raft consensus → Parallel commits
Clocks: Hybrid Logical Clock (wall_time, logical_counter)
Isolation: Serializable snapshot isolation (default)
Transactions: Write intents → STAGING record → async resolve
Storage: LSM-tree per node (memtable → WAL → SST levels)
Range Ops: Auto-split (size/load), auto-merge (underutilized), rebalance
Key Metric: Raft proposal latency + cross-range transaction ratio
Key Trade-off: Clock uncertainty window vs. read restart rate
```
