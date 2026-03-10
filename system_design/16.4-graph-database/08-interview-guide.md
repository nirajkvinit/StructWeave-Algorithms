# Interview Guide — Graph Database

## Interview Pacing (45-min Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify** | Scope the problem | What kind of graph? (social, knowledge, fraud) Property graph or RDF? OLTP or analytics? Scale? |
| 5-15 min | **High-Level** | Core architecture | Native storage with index-free adjacency, node/relationship/property stores, buffer cache, WAL |
| 15-30 min | **Deep Dive** | 1-2 critical components | Pick: supernode handling, graph partitioning, or query planner. Go deep on internals. |
| 30-40 min | **Scale & Trade-offs** | Distributed challenges | Graph partitioning NP-hardness, cross-partition traversals, property sharding, replication |
| 40-45 min | **Wrap Up** | Summary + handles follow-ups | Summarize key trade-offs; discuss monitoring and operational concerns |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **The partitioning paradox:** Unlike key-value or document stores where data items are independent, graph data is inherently interconnected. Any partition boundary creates cross-partition edges that degrade the core value proposition (fast traversal). This is the fundamental tension of distributed graph databases.

2. **Power-law distribution:** Real-world graphs are not uniform. A few supernodes have millions of edges while most nodes have hundreds. Any design that assumes uniform degree distribution will fail catastrophically on real data.

3. **Query complexity is unbounded:** A simple-looking query like `MATCH (a)-[*]->(b)` can explore the entire graph. The query planner must protect the system from queries that are syntactically valid but computationally unbounded.

4. **Relationships are first-class storage:** Unlike relational databases where relationships (foreign keys) are metadata, graph databases physically store and index relationships. This is a fundamental storage engine decision, not a query language feature.

### Where to Spend Most Time

- **Storage engine:** Explain index-free adjacency thoroughly — this is the defining architectural property
- **Supernode handling:** This is where most candidates stumble. Show awareness of power-law distributions and vertex-centric indexes
- **Partitioning trade-offs:** Don't just say "shard by node ID" — explain why graph partitioning is fundamentally harder than key-value partitioning

### How to Approach This Problem

1. Start with the data model (property graph vs. RDF) — this determines everything downstream
2. Design the storage engine (index-free adjacency with fixed-size records)
3. Design the query pipeline (parser → planner → executor)
4. Address the supernode problem (relationship groups, vertex-centric indexes)
5. Discuss distribution (partitioning strategies, replication)
6. Mention security (traversal escalation is graph-specific)

---

## Trade-offs Discussion

### Decision 1: Native Graph Storage vs. Graph Layer on Existing DB

| Aspect | Native Graph Storage | Graph Layer on RDBMS/KV |
|--------|--------------------|-----------------------|
| Pros | O(1) traversal per hop; purpose-built for graph workloads; predictable performance regardless of data size | Leverage mature ecosystem; easier operations; battle-tested ACID |
| Cons | Custom storage engine to maintain; smaller ecosystem; cannot easily switch to relational queries | O(log n) per hop via index; JOINs for multi-hop; performance degrades with data size |
| **Recommendation** | **Choose native** for production graph workloads where traversal performance is the primary requirement |

### Decision 2: Eager Property Loading vs. Lazy Property Loading

| Aspect | Eager (load properties with node) | Lazy (load properties on demand) |
|--------|----------------------------------|----------------------------------|
| Pros | Single I/O per node; simpler execution model | Less memory per traversal; faster when properties aren't needed |
| Cons | Wastes memory/bandwidth when properties aren't queried | Additional I/O when properties are needed; more complex execution |
| **Recommendation** | **Choose lazy** — most traversals filter by structure first and only fetch properties for the final result set. The query planner should push down property access to the latest possible stage. |

### Decision 3: Hash Partitioning vs. Community-Based Partitioning

| Aspect | Hash Partitioning | Community-Based Partitioning |
|--------|------------------|---------------------------|
| Pros | Even distribution; simple assignment; no rebalancing | Minimizes cross-partition edges; locality for traversals |
| Cons | Random edge cuts; many cross-partition hops | Expensive to compute; uneven partition sizes; requires periodic rebalancing |
| **Recommendation** | **Community-based** for read-heavy graph workloads. Hash partitioning works only if most queries are single-node lookups (which defeats the purpose of a graph database). |

### Decision 4: MVCC vs. Lock-Based Concurrency

| Aspect | MVCC (Multi-Version) | Lock-Based |
|--------|---------------------|-----------|
| Pros | Readers never block writers; snapshot isolation for traversals | Simpler implementation; lower storage overhead |
| Cons | Storage overhead for version chains; garbage collection of old versions; write-write conflicts still need detection | Read-write contention on hot nodes; potential for deadlocks |
| **Recommendation** | **MVCC for reads, locks for writes.** Long-running traversals should see a consistent snapshot (MVCC), while write transactions use record-level locks to prevent conflicting mutations. |

### Decision 5: Adjacency List vs. Adjacency Matrix (Internal Storage)

| Aspect | Adjacency List (Linked Records) | Adjacency Matrix (Bitmap) |
|--------|-------------------------------|--------------------------|
| Pros | Space-efficient for sparse graphs; natural for variable-degree nodes | O(1) edge existence check; cache-friendly for dense subgraphs |
| Cons | O(degree) to check edge existence; not cache-friendly for random access | O(V^2) space — prohibitive for large sparse graphs |
| **Recommendation** | **Adjacency list.** Real-world graphs are sparse (average degree 200 vs. millions of nodes). Matrix representation would consume petabytes. Vertex-centric indexes provide O(log d) edge existence checks where needed. |

---

## Trap Questions & How to Handle

### Trap 1: "Why not just use a relational database with JOINs?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test understanding of why graph databases exist | At small scale (thousands of nodes), JOINs work fine. But JOINs are O(n log n) per hop and require materializing intermediate result sets. A 4-hop query across 100M rows requires 4 JOINs, each scanning and sorting millions of rows. Graph databases with index-free adjacency perform the same traversal in O(d^4) where d is the average degree — completely independent of total data size. The crossover point where graphs win is typically around 3+ hops on datasets > 1M nodes. |

### Trap 2: "How do you shard a graph?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test awareness of graph partitioning difficulty | Acknowledge that optimal graph partitioning is NP-hard (balanced min-cut problem). Discuss community detection heuristics (Louvain, Metis) that find good-enough partitions. Explain the trade-off: better partitioning requires more computation and periodic rebalancing, but reduces cross-partition traversals. Mention property sharding as an alternative: keep graph topology on one machine and distribute property data. Finally, note that many production graph databases (Neo4j until recently) chose to NOT shard, instead scaling vertically, because the traversal degradation from sharding was worse than the cost of a larger machine. |

### Trap 3: "What about supernodes — a node with 10 million edges?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test awareness of power-law distributions | Explain that supernodes are inevitable in real-world graphs (power-law distribution). Without optimization, traversing a supernode scans all 10M relationships linearly. The solution is vertex-centric indexing: organize the supernode's edges into B+ tree groups by relationship type and edge properties. This turns a O(10M) scan into O(log(10M)) = ~23 lookups for filtered queries. Also discuss: application-level strategies like edge bucketing (split a celebrity into regional sub-nodes) and query-level strategies like LIMIT push-down. |

### Trap 4: "What happens if a node is deleted while a traversal is in progress?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test concurrency understanding | This is the "ghost relationship" problem. With MVCC, the traversal sees a consistent snapshot and will still see the deleted node's version. Without MVCC, lock-based protocols prevent the delete from completing until the traversal releases its shared locks. Discuss how the delete must cascade: removing a node requires removing all its incident edges and updating the pointer chains of all neighboring nodes — a potentially expensive operation for supernodes that may need to be batched. |

### Trap 5: "How do you handle schema evolution?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test practical production thinking | Graph databases are typically schema-optional: nodes can have any properties, and new label types can be introduced without migration. This is both a strength (flexibility) and a weakness (no enforcement). For production systems, discuss: optional schema constraints (uniqueness, existence, type enforcement), online index creation (builds index in background without blocking writes), and backward-compatible property evolution (add new properties, deprecate old ones, never remove without migration). |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Designing a graph layer on top of a relational DB | Misses the fundamental value of index-free adjacency | Start with native graph storage; explain why O(1) traversal matters |
| Ignoring supernodes | Most real-world graphs have them; they dominate performance | Address power-law distribution and vertex-centric indexes early |
| Saying "just shard by node ID" | Hash sharding creates random cross-partition edges | Discuss community-based partitioning and explain why graph sharding is hard |
| No ACID transactions | Graph mutations update multiple records atomically | Explain WAL-based recovery and lock protocols |
| Ignoring the query planner | "Just traverse from the first node in the query" | Explain cost-based optimization and why starting point selection matters |
| Assuming uniform degree distribution | Leads to designs that work on benchmarks but fail on real data | Design for skewed distributions from the start |
| Not discussing memory | Graph traversals can expand exponentially | Memory budgets, streaming execution, LIMIT push-down |

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|----------|---------------|
| What types of graphs? (social, knowledge, fraud) | Determines data model and query patterns |
| What is the typical traversal depth? | 2-3 hops vs. 6+ hops requires fundamentally different optimization |
| Read-heavy or write-heavy? | Determines caching strategy and replication topology |
| Do we need real-time analytics (PageRank) or just OLTP? | Determines whether a separate analytics engine is needed |
| What is the expected graph size? (nodes, edges) | Determines whether vertical scaling suffices or sharding is required |
| Are there known supernodes? | Determines priority of supernode optimization |
| Consistency requirements? | Determines replication strategy (sync vs. async) |
| Multi-tenant or single-tenant? | Determines security model (label-based isolation vs. separate instances) |

---

## Quick Reference Card

```
GRAPH DATABASE DESIGN CHEATSHEET
─────────────────────────────────
Storage: Native graph with index-free adjacency
Records: Fixed-size (64B nodes, 64B rels, 128B props)
Traversal: O(1) per hop via physical pointers
Supernodes: Relationship groups + vertex-centric B+ indexes
Query: GQL/Cypher → Cost-based optimizer → Streaming executor
Partitioning: Community-based (Louvain/Metis) + hash fallback
Replication: Raft consensus, 3x per partition
Concurrency: MVCC for reads, record-level locks for writes
WAL: Write-ahead log with synchronous replication
Cache: Buffer cache (80% RAM) + query result cache + neighbor cache
Failover: Automatic leader election < 15 seconds
Key Metric: Buffer cache hit ratio > 90%
Key Trade-off: Partition quality vs. rebalancing cost
```
