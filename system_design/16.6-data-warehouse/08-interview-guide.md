# Interview Guide — Data Warehouse

## Interview Pacing (45-min Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify** | Scope the problem | What data types? What query patterns (BI vs. ad-hoc)? Scale (TB vs. PB)? Latency tolerance? Cost sensitivity? |
| 5-15 min | **High-Level** | Core architecture | Three-layer architecture (cloud services, elastic compute, durable storage); separation of compute and storage; immutable micro-partitions |
| 15-30 min | **Deep Dive** | 1-2 critical components | Pick: columnar storage internals, query execution engine, or partition pruning. Go deep on internals. |
| 30-40 min | **Scale & Trade-offs** | Elasticity and cost | Elastic compute scaling, multi-cluster warehouses, cost optimization (pruning → caching → right-sizing), workload isolation |
| 40-45 min | **Wrap Up** | Summary + follow-ups | Summarize key trade-offs; discuss monitoring, security (RLS, masking), and operational concerns |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **The decoupled compute paradox:** Separating compute from storage eliminates resource contention but introduces network latency for every data access. The entire caching hierarchy (result cache → metadata cache → SSD cache → object storage) exists to bridge this gap, and the system's performance is determined by cache hit ratios more than raw compute power.

2. **Cost is a first-class design constraint:** Unlike OLTP databases where the primary metric is latency, a data warehouse's cost is directly proportional to bytes scanned and compute seconds consumed. Every architectural decision — columnar storage, partition pruning, materialized views, result caching — is simultaneously a performance optimization and a cost optimization.

3. **Immutability enables everything:** The decision to make micro-partitions immutable (append-only, copy-on-write for updates) cascades through the entire design: zero-contention snapshot isolation, free time travel, trivial replication, excellent compression, and simple cache invalidation. The trade-off is expensive UPDATE/DELETE operations.

4. **The optimizer is the product:** Two users writing logically equivalent SQL can experience 100x different performance depending on whether partition pruning activates, which join strategy is selected, and whether a materialized view is matched. The cost-based optimizer determines the user experience more than any other component.

### Where to Spend Most Time

- **Separation of compute and storage:** This is the defining architectural property — explain the three-layer architecture and why it enables independent scaling, workload isolation, and pay-per-query economics
- **Columnar storage and partition pruning:** Demonstrate deep understanding of how columnar encoding, zone maps, and clustering keys reduce I/O by 10-100x
- **Query execution:** Explain vectorized execution and why it outperforms row-at-a-time processing for analytical workloads

### How to Approach This Problem

1. Start by clarifying the workload (OLAP not OLTP) and scale (TB to PB)
2. Propose the three-layer architecture (cloud services → compute → storage)
3. Explain columnar storage with micro-partitions and encoding
4. Design the query path (parse → optimize → distribute → execute → return)
5. Address scaling (elastic compute, multi-cluster, auto-suspend)
6. Discuss cost optimization (pruning, caching, materialized views)
7. Cover security (RLS, column security, masking)

---

## Trade-offs Discussion

### Decision 1: Separated vs. Coupled Compute and Storage

| Aspect | Separated | Coupled (Traditional MPP) |
|--------|-----------|--------------------------|
| Pros | Independent scaling; workload isolation; pay-per-use; zero-copy data sharing; instant elasticity | Data locality — no network overhead; predictable latency; simpler architecture |
| Cons | Network latency for cold data; cache warm-up needed; more complex caching hierarchy | Wasted resources when idle; scaling requires data redistribution; workload contention |
| **Recommendation** | **Choose separated** for cloud-native deployments where elasticity and cost efficiency matter more than predictable single-query latency |

### Decision 2: Immutable Micro-Partitions vs. Mutable Storage

| Aspect | Immutable (Copy-on-Write) | Mutable (In-Place Updates) |
|--------|--------------------------|--------------------------|
| Pros | Zero-contention reads; free time travel; excellent compression; simple replication | Cheap single-row updates; lower write amplification |
| Cons | Expensive UPDATE/DELETE (rewrite partition); storage amplification from old versions | Lock contention; complex crash recovery; poor compression |
| **Recommendation** | **Choose immutable** for analytical workloads where data is append-heavy and updates are rare. The UPDATE cost is acceptable because analytical tables are loaded in bulk, not row-by-row. |

### Decision 3: Vectorized Execution vs. Code Generation (JIT Compilation)

| Aspect | Vectorized (Columnar Batches) | Code Generation (JIT) |
|--------|------------------------------|----------------------|
| Pros | Cache-friendly; SIMD-enabled; predictable performance; works well with columnar storage | Eliminates interpretation overhead; can fuse multiple operators; near-native speed |
| Cons | Still has some interpretation overhead per batch; operator boundaries not fused | Compilation latency (100ms+); code cache management; harder to debug |
| **Recommendation** | **Vectorized with selective code generation.** Use vectorized execution for the common path (scans, filters, aggregates) and JIT compilation for complex expressions and UDFs. |

### Decision 4: Pre-Computed Materialized Views vs. On-Demand Caching

| Aspect | Materialized Views | Result Cache Only |
|--------|-------------------|-------------------|
| Pros | Guaranteed fast queries for known patterns; incremental refresh; optimizer can rewrite queries to use them | Zero maintenance; no storage overhead; adapts to any query pattern |
| Cons | Storage cost; refresh latency; maintenance complexity; only helps known query patterns | Cache miss is full-cost query; invalidated on any data change; no partial reuse |
| **Recommendation** | **Both.** Materialized views for known high-frequency aggregation patterns (dashboards). Result cache for ad-hoc queries. The optimizer should transparently match queries to materialized views when available. |

### Decision 5: Star Schema vs. Denormalized Wide Tables

| Aspect | Star Schema (Fact + Dimensions) | Denormalized Wide Table |
|--------|-------------------------------|----------------------|
| Pros | Normalized; less storage; flexible query patterns; dimension updates propagate automatically | No joins needed; simpler queries; faster scans |
| Cons | Join cost at query time; more complex ETL | Data duplication; dimension updates require full reload; 100+ columns |
| **Recommendation** | **Star schema** for general-purpose warehouses. The query optimizer handles joins efficiently (broadcast small dimensions), and normalized storage enables dimension evolution without reloading fact tables. |

---

## Trap Questions & How to Handle

### Trap 1: "Why not just use a transactional database for analytics?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test understanding of OLAP vs. OLTP trade-offs | Transactional databases store data row-by-row — to compute SUM(revenue) across 1 billion rows, the engine reads entire rows (50 columns × 1B rows = 400 GB I/O) even though it needs only one column (8 GB). A columnar warehouse reads only the revenue column (8 GB) and applies compression (→ 800 MB actual I/O). That is a 500x I/O difference. Add vectorized execution (20x CPU efficiency) and partition pruning (skip 95% of data), and the total speedup is 10,000x for a typical analytical query. The trade-off is that single-row lookups and updates are slower in columnar storage. |

### Trap 2: "How do you handle updates in an append-only system?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test understanding of copy-on-write mechanics | Updates are implemented as copy-on-write: the system identifies affected micro-partitions, reads them, applies changes, writes new partitions with modifications, and atomically swaps metadata pointers. Old partitions are retained for time travel. This is expensive for single-row updates (rewriting 500 MB for one row) but efficient for bulk updates (merge operations). For CDC-style incremental updates, a merge/upsert operation groups changes by partition to minimize rewrites. The key insight is that analytical tables rarely need single-row updates — most "updates" are periodic bulk refreshes. |

### Trap 3: "What if a single query takes all the resources?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test workload management understanding | This is the "noisy neighbor" problem. The solution is workload isolation: separate compute warehouses for different workload types (BI, ETL, ad-hoc). Within a warehouse, resource governance enforces per-query memory limits, maximum execution time, and maximum bytes scanned. Queries exceeding limits are queued or terminated. Multi-cluster warehouses add compute capacity automatically when queries queue, preventing a burst of queries from degrading latency. The key metric is query queue time — if it exceeds the SLO, add clusters. |

### Trap 4: "How does partition pruning work and when does it fail?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test deep understanding of zone maps | Each micro-partition stores min/max statistics (zone maps) for every column. The optimizer evaluates query predicates against zone maps and skips partitions where the predicate cannot match. Pruning fails in three cases: (1) query predicates are on non-clustered columns with overlapping ranges across partitions, (2) predicates use functions on columns (e.g., `MONTH(date) = 6`) which prevent zone map evaluation, (3) predicates use OR conditions that span the full value range. The fix is clustering keys that physically sort data by the most-queried columns, and optimizer rewrites that convert function predicates to range predicates. |

### Trap 5: "How do you optimize cost?"

| What Interviewer Wants | Best Answer |
|------------------------|-------------|
| Test practical production thinking | Cost optimization operates at three levels. Storage: columnar compression (10x reduction), tiered storage lifecycle (hot → warm → cold), time travel retention tuning. Compute: auto-suspend idle warehouses, right-size warehouses based on actual utilization, use economy scaling mode. Query: partition pruning (reduce bytes scanned), materialized views (avoid redundant computation), result caching (avoid redundant execution). The single highest-impact optimization is clustering keys — a well-clustered table with 99% pruning rate scans 100x less data than an unclustered table, directly reducing compute time and cost. |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Designing row-based storage for analytical workloads | Misses the fundamental I/O advantage of columnar storage | Start with columnar; explain why analytical queries benefit from reading only needed columns |
| Ignoring separation of compute and storage | Assumes coupled architecture, misses elasticity discussion | Lead with the three-layer architecture; explain why decoupling enables independent scaling |
| No partition pruning discussion | Misses the single most impactful optimization | Explain zone maps, clustering keys, and pruning effectiveness early |
| Treating updates like OLTP | Single-row update patterns don't apply to analytical workloads | Explain copy-on-write and merge operations for bulk updates |
| Ignoring cost optimization | Cost is a first-class concern, not an afterthought | Discuss how every architectural decision (pruning, caching, compression) directly affects cost |
| Single warehouse for all workloads | Creates the noisy neighbor problem | Design workload isolation with separate warehouses from the start |
| No caching hierarchy | Assumes compute always reads from object storage | Design multi-tier caching: result cache → SSD cache → object storage |

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|----------|---------------|
| What is the primary workload? (BI dashboards, ad-hoc, ETL) | Determines warehouse sizing and caching strategy |
| What is the data volume and growth rate? | Determines storage tier strategy and partition sizing |
| How fresh must the data be? (minutes, hours, daily) | Determines ingestion strategy (micro-batch vs. daily bulk) |
| Are there compliance requirements? (GDPR, PCI, HIPAA) | Determines security architecture (RLS, masking, encryption) |
| How many concurrent users/queries? | Determines multi-cluster and workload management design |
| Is cost sensitivity primary or secondary? | Determines whether to optimize for performance or cost |
| Will this replace an existing system or be greenfield? | Determines migration strategy and backward compatibility |
| Is data sharing across teams required? | Determines zero-copy sharing and governance design |

---

## Quick Reference Card

```
DATA WAREHOUSE DESIGN CHEATSHEET
──────────────────────────────────
Architecture: Three layers — cloud services, elastic compute, durable storage
Storage: Columnar micro-partitions (50-500 MB), immutable, append-only
Encoding: Dictionary, RLE, Delta, Bit-pack + Zstd/LZ4 compression
Pruning: Zone maps (min/max per partition per column) + clustering keys
Execution: Vectorized (column batches of 1K-4K values), SIMD-enabled
Joins: Broadcast (small), Hash repartition (large), Co-located (pre-partitioned)
Scaling: Elastic compute clusters, independent of storage
Isolation: Separate warehouses per workload class
Caching: Result cache (shared) → SSD cache (per node) → object storage
Concurrency: Snapshot isolation via immutable partitions + metadata versioning
Materialized Views: Incremental refresh for additive aggregates
Security: RBAC + RLS + Column-level security + Dynamic data masking
Cost Levers: Partition pruning > clustering > caching > right-sizing > auto-suspend
Key Metric: Partition pruning rate (target > 95% for filtered queries)
Key Trade-off: Separation latency vs. elasticity benefit
```
