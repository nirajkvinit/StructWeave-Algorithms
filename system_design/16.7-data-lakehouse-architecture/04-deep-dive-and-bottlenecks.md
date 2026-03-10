# Deep Dive & Bottlenecks — Data Lakehouse Architecture

## Critical Component 1: The Small-File Problem

### Why It Is Critical

Streaming ingestion, CDC pipelines, and concurrent writers continuously create small files (often < 1 MB). A table with 1 million 1 MB files instead of 4 000 × 256 MB files incurs:

- **250x more metadata** — 1 M manifest entries instead of 4 K.
- **250x more file-open overhead** — each file requires a separate HTTP GET, Parquet footer parse, and schema validation.
- **Ballooning query planning** — the optimizer must evaluate statistics for 1 M entries before executing a single scan.
- **Object storage rate limiting** — high request counts risk per-prefix throttling (typically 5 500 GET/s per prefix).

### How It Works

Small files accumulate because each micro-batch commit (every 1–60 seconds) writes at least one file per partition per writer. With 10 partitions and 30-second batches, a single writer creates 28 800 files/day; 5 concurrent writers produce 144 000 files/day.

### Failure Modes

| Failure Mode | Trigger | Impact |
|:---|:---|:---|
| Metadata explosion | Manifest file size exceeds memory of query planner | Query planning takes minutes or OOMs |
| Scan amplification | Each file scanned has < 1 MB useful data | Latency dominated by I/O setup, not data transfer |
| Compaction backlog | Compaction throughput < file creation rate | Debt grows unbounded; reads degrade progressively |
| Object store throttling | File listing / GET requests exceed rate limits | Both queries and ingestion throttled |

### Mitigations

1. **Scheduled compaction** — run bin-packing every 1–4 hours targeting 128–256 MB output files. Prioritize partitions with the most small files.
2. **Inline compaction** (Hudi-style) — compact a file group during the ingestion cycle itself, bounding small-file debt at ingestion time.
3. **Write-side buffering** — buffer micro-batches in memory or a local write-ahead log; flush to object storage only when buffer reaches target file size.
4. **Partition bucketing** — pre-assign rows to a fixed number of buckets per partition, concentrating writes into fewer files.
5. **Monitoring** — alert when any partition exceeds a configurable small-file-count threshold (e.g., > 1 000 files under 10 MB).

---

## Critical Component 2: Metadata Scalability

### Why It Is Critical

The metadata hierarchy (snapshots → manifest lists → manifests → file entries) is the single mechanism that makes ACID, time travel, and data skipping work. If metadata access becomes slow, every operation — query planning, commits, compaction — degrades.

### How It Works

A mature table accumulates metadata at every layer:

| Layer | Growth Driver | Typical Scale |
|:---|:---|:---|
| Snapshots | Every commit (append, overwrite, compact) | 10 K – 100 K snapshots over years |
| Manifest lists | One per snapshot | Equal to snapshot count |
| Manifests | One per writer per partition per commit | Millions for high-throughput tables |
| File entries | One per data file + one per delete file | Billions for petabyte-scale tables |

Loading the full manifest set for a table with 1 billion file entries requires reading gigabytes of Avro, which is infeasible on every query.

### Failure Modes

| Failure Mode | Trigger | Impact |
|:---|:---|:---|
| Cold-start latency | First query on a table loads full manifest tree | Minutes-long planning phase |
| Manifest fan-out | Thousands of manifests per snapshot | Parallel manifest reads saturate network |
| Snapshot accumulation | No expiration policy | Metadata storage exceeds data storage for small-file tables |
| Catalog contention | High commit rate on a single table | CAS retries grow; commit latency increases non-linearly |

### Mitigations

1. **Manifest merging** — periodically rewrite many small manifests into fewer large ones (analogous to data compaction but for metadata).
2. **Manifest caching** — query engines cache parsed manifest files in memory; invalidate on new snapshot.
3. **Lazy manifest loading** — load manifest summaries first (partition bounds, file counts); load full file entries only for surviving manifests after pruning.
4. **Snapshot expiration** — expire snapshots beyond retention (e.g., 7 days), then delete orphaned manifests and data files.
5. **Partition-level manifest grouping** — one manifest per partition rather than per-writer, reducing fan-out.
6. **Metadata-tier SSD cache** — store hot manifests on local SSD for sub-millisecond access.

---

## Critical Component 3: Merge-on-Read vs. Copy-on-Write

### Why It Is Critical

The choice between MoR and CoW determines the write amplification / read overhead trade-off that defines a table's performance profile.

### Copy-on-Write (CoW)

- On update or delete, the **entire Parquet file** containing affected rows is rewritten.
- Read path: simple columnar scan — no merge logic.
- Write amplification: if one row in a 256 MB file changes, the entire 256 MB is rewritten.
- Best for: infrequent updates, read-heavy BI workloads.

### Merge-on-Read (MoR)

- On update or delete, a **small delete file** (position deletes or equality deletes) or **log file** is written.
- Read path: the engine reads the base file, reads the delete/log files, and applies them at scan time.
- Write amplification: minimal — only the delta is written.
- Read amplification: grows with accumulating delete files until compaction rewrites the base.

### Performance Comparison

| Metric | CoW | MoR (fresh compaction) | MoR (stale compaction) |
|:---|:---|:---|:---|
| Write latency (single row update) | High (rewrite full file) | Low (append delete entry) | Low |
| Read latency (full scan) | Baseline | ~1.1x baseline | ~2.3x baseline |
| Storage efficiency | Lower (temporary duplication) | Higher | Higher (but delete files accumulate) |
| Compaction frequency needed | None | Moderate (daily) | Urgent |
| Implementation complexity | Low | Medium | Medium |

### Failure Modes

| Failure Mode | Trigger | Impact |
|:---|:---|:---|
| Write amplification storm (CoW) | CDC ingestion updates 10 K rows spread across 5 K files | 5 K files rewritten per commit |
| Delete file accumulation (MoR) | Compaction falls behind ingestion | Read latency degrades proportionally |
| Position-delete fan-out (MoR) | Deletes spanning many base files | Each base file read requires checking multiple delete files |
| Compaction conflict (MoR) | Compaction and ingestion both modify the same file group | One must retry, increasing commit latency |

### Decision Framework

```
IF update_frequency < 1% of table per day AND read_latency_critical:
    USE CoW
ELSE IF update_frequency > 5% of table per day OR streaming_CDC:
    USE MoR with scheduled compaction
ELSE:
    USE MoR with relaxed compaction schedule
```

---

## Critical Component 4: Partition Evolution

### Why It Is Critical

Traditional Hive-style partitioning locks the physical layout at table creation. If the initial partition granularity is wrong — too coarse (slow scans) or too fine (small-file explosion) — the only fix is a full table rewrite. Partition evolution changes layout as metadata-only operations.

### How It Works

Each partition spec is assigned a monotonically increasing `spec_id`. Manifests record the `spec_id` under which their file entries were written. The query engine maintains a mapping from each `spec_id` to its transform function.

**Query planning across mixed specs**:

```
FUNCTION resolve_predicate_across_specs(predicate, manifest_list):
    surviving = []
    FOR EACH manifest_ref IN manifest_list.entries:
        spec = load_spec(manifest_ref.spec_id)
        transformed_predicate = apply_transform(predicate, spec)
        IF partition_range_overlaps(manifest_ref.bounds, transformed_predicate):
            surviving.APPEND(manifest_ref)
    RETURN surviving
```

### Common Evolution Scenarios

| Scenario | Before | After | Motivation |
|:---|:---|:---|:---|
| Granularity refinement | `month(ts)` | `day(ts)` | Table grew; monthly partitions too large |
| Granularity coarsening | `hour(ts)` | `day(ts)` | Over-partitioning caused small-file explosion |
| Adding a dimension | `day(ts)` | `day(ts), bucket(16, user_id)` | Hot partition on popular days |
| Removing a dimension | `day(ts), region` | `day(ts)` | Region was deprecated |

### Failure Modes

| Failure Mode | Trigger | Impact |
|:---|:---|:---|
| Mixed-spec planning overhead | Many spec generations (> 10) | Planner must evaluate each spec's transform per manifest |
| Stale partition stats | Old manifests have coarse-grained bounds | Reduced pruning effectiveness on historical data |
| Rewrite temptation | Operators rewrite old data to new spec unnecessarily | Wastes compute and creates compaction debt |

### Mitigation

- Keep spec evolution to < 5 generations before consolidating old data.
- Use compaction to opportunistically rewrite old partitions to the current spec.
- Monitor data-skipping effectiveness per partition spec to decide when consolidation is worthwhile.

---

## Concurrency & Race Conditions

### Race Condition 1: Concurrent Writers to the Same Table

**Scenario**: Writer A and Writer B both read snapshot S42, prepare changes, and attempt to commit S43.

**Consequence**: One writer's CAS succeeds; the other fails and must retry.

**Resolution**: The losing writer reloads the latest snapshot, checks for conflicts (overlapping file deletes or schema incompatibility), and if no conflict exists, rebases its commit on the new snapshot. Non-overlapping partition appends are always rebaseable.

### Race Condition 2: Compaction vs. Ingestion

**Scenario**: Compaction reads files F1, F2, F3 to produce F4. Simultaneously, ingestion deletes rows from F2 (MoR: adds a delete file D1 referencing F2).

**Consequence**: If compaction commits first, F1–F3 are replaced by F4 (which includes the now-deleted rows). D1 references a file that no longer exists in the new snapshot.

**Resolution**: Compaction's commit fails because F2 was concurrently modified. Compaction retries, now reading the updated file set. Alternatively, compaction uses conflict-resolution rules that allow the delete to be rebased onto the compacted file.

### Race Condition 3: Schema Evolution During Active Writes

**Scenario**: A schema change (add column) is committed between the time a writer reads the schema and commits its files.

**Consequence**: The writer's files lack the new column. The commit may succeed if the table format treats missing columns as null.

**Resolution**: Most formats allow additive schema changes (new nullable columns) to coexist with files written under the old schema. Files written before the column addition simply return null for the new column. Incompatible changes (type narrowing, removing a required column) are rejected.

## Locking & Conflict Strategy

| Operation | Lock Type | Scope | Conflict Window |
|:---|:---|:---|:---|
| Append new files | None (optimistic) | Per-partition | At commit CAS only |
| Delete / update rows (CoW) | None (optimistic) | Per-file (rewrite) | At commit — fails if same file modified |
| Delete / update rows (MoR) | None (optimistic) | Per-file (delete file reference) | At commit — delete file references checked |
| Compaction | Advisory (optional) | Per-partition | At commit — fails if source files modified |
| Schema evolution | Table-level metadata CAS | Whole table | At commit — only one schema change per snapshot |

## Bottleneck Analysis

| Bottleneck | Root Cause | Impact | Mitigation |
|:---|:---|:---|:---|
| Catalog commit serialization | Single CAS per table per commit | High-throughput streaming tables see retry storms | Batch multiple micro-batches into one commit; use file-group-level concurrency |
| Manifest parsing at query time | Large manifest files (> 100 MB) | Query planning latency exceeds execution time | Manifest caching, lazy loading, manifest merging |
| Object storage GET latency | Each file read requires an HTTP round trip (~20–50 ms) | Becomes dominant cost for wide scans with many files | Coalesce reads, prefetch adjacent files, local SSD cache |
| Compaction I/O | Full file rewrite amplifies write volume | Compaction competes with ingestion for I/O bandwidth | Schedule during off-peak; use dedicated compaction compute |
| Delete file fan-out (MoR) | Delete files applied against many base files | O(D × B) merge cost where D = delete files, B = base files | Compact frequently; limit delete file accumulation per file group |
