# Interview Guide — Data Lakehouse Architecture

## 45-Minute Interview Pacing

| Phase | Time | Focus | Deliverable |
|:---|:---|:---|:---|
| **1. Clarify** | 0 – 5 min | Scope the problem: batch vs. streaming, scale, workload mix | Written requirements list; confirm ACID is non-negotiable |
| **2. High-Level Design** | 5 – 15 min | Draw catalog → table format → object storage architecture | Architecture diagram with data flow arrows |
| **3. Deep Dive** | 15 – 30 min | ACID commit protocol, MoR vs. CoW, compaction strategy | Pseudocode for OCC commit; file layout diagram |
| **4. Scale & Trade-offs** | 30 – 40 min | Metadata scalability, multi-engine access, partition evolution | Bottleneck analysis; trade-off decisions |
| **5. Wrap-up** | 40 – 45 min | Observability, operational concerns, questions | Key metrics; monitoring approach |

## Meta-Commentary

### What Makes This Problem Unique

1. **ACID on non-ACID storage** — the core intellectual challenge is explaining how immutable object storage achieves transactional semantics through metadata layering and optimistic concurrency.
2. **Three-layer metadata hierarchy** — candidates must understand why a single-file catalog is insufficient and why the snapshot → manifest-list → manifest → data-file hierarchy exists.
3. **Write amplification vs. read amplification trade-off** — CoW vs. MoR is not a binary choice; it is a continuous spectrum controlled by compaction frequency.
4. **Open format ecosystem complexity** — the interviewer may probe awareness of multiple table formats and their design trade-offs rather than deep knowledge of one.

### Where to Spend Time

- **Start with the commit protocol** — this is where most candidates differentiate. Draw the write path: write files → build manifests → CAS on catalog pointer. Explain what happens on conflict.
- **Data skipping is your performance story** — show the progressive pruning: partition bounds → manifest file stats → column statistics → row-group-level filtering.
- **Compaction is your operational maturity signal** — interviewers at senior/staff level expect you to discuss why compaction is necessary, how it interacts with concurrent reads and writes, and how to schedule it.

### How to Approach

- **Think out loud about the metadata hierarchy** — interviewers want to see you reason about why each layer exists, not just recite it.
- **Use concrete numbers** — "A 500 TB table with 256 MB files has 2 million files; loading 2 million manifest entries at 200 bytes each is 400 MB of metadata."
- **Acknowledge the ecosystem** — mention that this is an active design space with multiple competing formats, then pick one to go deep on.

## Trade-Offs Discussion

### Trade-off 1: Copy-on-Write vs. Merge-on-Read

| Dimension | CoW | MoR |
|:---|:---|:---|
| **Pros** | Zero read-time merge overhead; simple scan logic; predictable query performance | Minimal write amplification; fast upserts; supports streaming CDC natively |
| **Cons** | Rewrites entire files for single-row changes; high write amplification | Read-time merge adds CPU; performance degrades without compaction; more complex planning |
| **When to choose** | Read-dominant BI workloads; infrequent updates | Write-heavy CDC; streaming ingestion; low-latency upsert requirements |

**Senior/staff signal**: Explain that MoR and CoW are two ends of a spectrum, and compaction frequency is the knob that moves a table along it. A freshly compacted MoR table reads identically to CoW.

### Trade-off 2: Centralized Catalog vs. Storage-Level Metadata

| Dimension | Centralized Catalog | Storage-Level (file-system catalog) |
|:---|:---|:---|
| **Pros** | Single authority for governance and atomic commits; supports credential vending; multi-engine consistency | No external dependency; metadata co-located with data; simpler deployment |
| **Cons** | Catalog is an availability dependency; requires operational management | No cross-engine consistency; directory listing is eventually consistent; no centralized ACLs |
| **When to choose** | Multi-engine, governed enterprise deployments | Single-engine, development/exploration environments |

### Trade-off 3: Hidden Partitioning vs. Explicit Partitioning

| Dimension | Hidden Partitioning | Explicit (Hive-Style) Partitioning |
|:---|:---|:---|
| **Pros** | Users query on source columns; layout evolvable without data rewrite; no partition-column maintenance in queries | Widely understood; directory-based discovery; simple tooling compatibility |
| **Cons** | Requires engine support for transform-based pruning; slightly more complex planning | Locked at creation; changing granularity requires full rewrite; user must filter on partition columns explicitly |
| **When to choose** | New lakehouse tables; long-lived tables likely to evolve | Legacy compatibility; simple, static workloads |

### Trade-off 4: Frequent Small Commits vs. Batched Large Commits

| Dimension | Frequent Small Commits | Batched Large Commits |
|:---|:---|:---|
| **Pros** | Lower data latency; fresher data visible sooner | Fewer total commits; less catalog contention; fewer small files |
| **Cons** | Creates many small files; higher compaction load; more catalog contention | Higher end-to-end latency; burst commit sizes may be large |
| **When to choose** | Low-latency streaming requirements (< 60 s) | Batch ETL; hourly or daily pipelines; high-throughput bulk loads |

### Trade-off 5: Parquet vs. ORC as Default File Format

| Dimension | Parquet | ORC |
|:---|:---|:---|
| **Pros** | Widest engine support; strong ecosystem; efficient nested-data handling | Better predicate pushdown in some engines; ACID-aware originally; lightweight built-in indexes |
| **Cons** | No built-in indexes (relies on external stats); large footer overhead for many columns | Narrower engine support; less common in Python/ML ecosystems |
| **When to choose** | Default for most lakehouse deployments; required for broadest multi-engine access | Legacy Hive environments; deeply nested data with heavy predicate pushdown |

## Trap Questions

### Trap 1: "Can we just use object storage's versioning for time travel?"

**Interviewer intent**: Test whether the candidate understands that object-level versioning operates on individual files, not on table-level snapshots.

**Best answer**: Object storage versioning tracks changes to individual objects, but a lakehouse snapshot captures the set of files that constitute a table at a point in time. Rolling back a table requires restoring the complete file set, not individual file versions. Additionally, object versioning has no concept of atomicity across multiple files — you cannot restore "all files as of time T" atomically. The table format's snapshot chain provides this table-level consistency.

### Trap 2: "Why not just use a distributed database as the catalog?"

**Interviewer intent**: Probe understanding of the catalog's simplicity requirement.

**Best answer**: The catalog only needs to store one pointer per table (current metadata location) and perform one atomic operation (CAS). A distributed database is viable and some implementations use one, but it is over-provisioned for this use case. The critical requirement is **atomicity of the pointer swap**, not distributed transactions. A lightweight key-value store, a consensus-based service, or even a relational database suffices. The complexity budget should go into the table format layer, not the catalog.

### Trap 3: "If compute is decoupled from storage, doesn't every query have high latency?"

**Interviewer intent**: Test understanding of caching and data locality strategies.

**Best answer**: Decoupled compute does add network latency compared to local-disk access. However, several mechanisms mitigate this: (1) columnar formats with predicate pushdown minimize bytes transferred; (2) data skipping eliminates 90–99% of files before any I/O; (3) local SSD caching on query workers stores hot data files and manifests; (4) parallel file fetches overlap network latency across multiple files. In practice, well-optimized lakehouse queries on cached data perform within 2–3x of co-located storage, and the cost and flexibility advantages outweigh the latency gap for analytical workloads.

### Trap 4: "Isn't compaction just a waste of resources since we're rewriting data?"

**Interviewer intent**: Test understanding of the read/write amplification trade-off.

**Best answer**: Compaction trades write amplification (rewriting data) for reduced read amplification (fewer files to scan, better statistics, no delete-file merging). Without compaction, read performance degrades proportionally to the number of small files and delete files. The total cost (write-side compaction + read-side scanning) is minimized at some optimal compaction frequency — too frequent wastes write I/O; too infrequent wastes read I/O. The key is monitoring the files-skipped ratio and read latency to find the right cadence per table.

### Trap 5: "How do you handle exactly-once semantics for streaming ingestion?"

**Interviewer intent**: Probe understanding of idempotent commits.

**Best answer**: The table format provides idempotent commits through snapshot-based conflict detection. A streaming writer checkpoints its source offset alongside each commit. On failure and restart, the writer resumes from its last checkpointed offset. If the writer re-produces files that were already committed (due to a crash after data write but before checkpoint), the commit either succeeds idempotently (if using an idempotency key) or fails on CAS (if the snapshot already advanced), and the writer reloads the latest snapshot and reconciles. The combination of source checkpointing and atomic commits provides effectively exactly-once semantics.

## Common Mistakes

| # | Mistake | Why It Fails |
|:---|:---|:---|
| 1 | Ignoring the metadata hierarchy | Treating lakehouse as "Parquet files on object storage" misses the entire ACID and governance story |
| 2 | Assuming object storage has strong consistency for listings | Some stores are eventually consistent for LIST operations; the table format bypasses listing entirely |
| 3 | Choosing MoR without discussing compaction | MoR without compaction is a ticking time bomb for read performance |
| 4 | Over-partitioning | Partitioning by high-cardinality columns creates millions of tiny partitions, each with tiny files |
| 5 | Ignoring the catalog as an availability dependency | The catalog is on the critical path for every commit and every first query; it needs high availability |
| 6 | Treating Z-ordering as free | Z-ordering requires a full data rewrite (sort + write); it is a compaction operation with significant cost |
| 7 | Not discussing schema evolution | Real-world tables evolve; ignoring this signals lack of production experience |

## Questions to Ask the Interviewer

1. What is the primary workload: BI reporting, ML feature engineering, or both?
2. What is the expected data freshness requirement — minutes, hours, or daily?
3. Are there regulatory constraints on data residency or retention?
4. How many concurrent query engines need access to the same tables?
5. What is the expected update/delete frequency relative to appends?
6. Is there an existing data platform this lakehouse must integrate with?
7. What is the acceptable cost model — optimize for storage cost, query cost, or latency?
8. Are there existing partitioning or schema conventions that must be preserved?

## Quick Reference Card

| Decision | Recommended Default | Override When |
|:---|:---|:---|
| File format | Parquet | Legacy ORC ecosystem |
| Write strategy | MoR with scheduled compaction | Read-dominant, rarely-updated tables → CoW |
| Partition granularity | day(timestamp) | High cardinality → coarser; low volume → unpartitioned |
| Target file size | 128 – 256 MB | Streaming low-latency → 64 MB; bulk batch → 512 MB |
| Compaction frequency | Every 4 hours | Streaming tables → every 1 hour; batch-only → daily |
| Snapshot retention | 7 days | Compliance → longer; cost-sensitive → 3 days |
| Z-ordering columns | 1 – 3 most-filtered columns | > 3 columns → diminishing returns |
| Catalog type | REST catalog with credential vending | Single-engine dev → file-system catalog |
