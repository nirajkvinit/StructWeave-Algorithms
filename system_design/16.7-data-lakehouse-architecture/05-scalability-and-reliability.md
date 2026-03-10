# Scalability & Reliability — Data Lakehouse Architecture

## Storage Scaling

### Object Storage: Effectively Infinite

Object storage scales horizontally by design — the lakehouse inherits virtually unlimited capacity at commodity cost. The real scaling challenge is **not data volume but metadata volume**.

| Data Scale | Files (256 MB avg) | Manifest Entries | Planning Overhead |
|:---|:---|:---|:---|
| 1 TB | 4 000 | 4 K | < 1 s |
| 100 TB | 400 000 | 400 K | 2–5 s |
| 1 PB | 4 000 000 | 4 M | 10–30 s without optimization |
| 10 PB | 40 000 000 | 40 M | Minutes without caching / pruning |

### Metadata Scaling Strategies

1. **Partition pruning** — eliminates 90–99% of manifests for time-bounded queries. A well-partitioned 10 PB table behaves like a 100 GB table for queries with tight predicates.
2. **Manifest merging** — consolidate thousands of small manifests (from frequent commits) into fewer large ones. Reduces fan-out from O(commits) to O(partitions).
3. **Statistics tier** — maintain an aggregated statistics index (partition-level min/max) in the catalog or a dedicated sidecar file. Eliminates full manifest loading for highly selective queries.
4. **Snapshot expiration** — limit snapshot retention to bound metadata growth. A table with 1 M commits but 7-day retention only materializes ~10 K active snapshots.

## Compute Scaling

### Query Engine Elasticity

Because compute is decoupled from storage, query engines scale independently based on workload.

| Scaling Dimension | Mechanism | Trigger |
|:---|:---|:---|
| Horizontal (add nodes) | Add query workers to the cluster | Queue depth > threshold or p99 > target |
| Vertical (bigger nodes) | Increase memory/CPU per worker | Single-query memory pressure (large joins, aggregations) |
| Auto-scale down | Remove idle workers after cooldown | No queries for N minutes |
| Workload isolation | Separate clusters per workload class | BI dashboards vs. ML feature pipelines vs. ad-hoc exploration |

### Ingestion Scaling

| Pattern | Mechanism | Throughput |
|:---|:---|:---|
| Single-writer batch | One Spark/Flink job | 1–10 GB/s depending on cluster size |
| Multi-writer parallel | Multiple jobs writing to disjoint partitions | Linearly scales with writer count |
| Streaming micro-batch | Continuous job with 10–60 s trigger intervals | 100 MB – 1 GB per interval per writer |
| File-group-level concurrency | Writers append to assigned file groups | Avoids commit contention across writers |

### Compaction Scaling

- Compaction is a compute-intensive background operation (read + sort + write).
- Scale by parallelizing across partitions — each partition compacted independently.
- Dedicated compaction cluster prevents resource contention with interactive queries.
- Budget compaction compute at ~20% of total ingestion compute.

## Multi-Engine Access

A core lakehouse promise: the same table is accessible from multiple engines without data duplication.

### How It Works

1. All engines communicate with the **same catalog** via the REST protocol.
2. The catalog returns the current metadata file location and vends temporary credentials scoped to the table's storage prefix.
3. Each engine loads manifests, performs its own planning (pruning, skipping), and reads data files directly from object storage.
4. Engines may use different execution strategies (vectorized columnar, code-generated) but all interpret the same file format and statistics.

### Consistency Guarantees Across Engines

| Scenario | Guarantee |
|:---|:---|
| Engine A reads, Engine B writes concurrently | A sees the snapshot it pinned; B's commit is invisible to A's in-flight query |
| Engine A and B both write | Standard OCC: one commits, the other retries on conflict |
| Engine A compacts, Engine B queries | B continues reading old files until its next query pins the post-compaction snapshot |
| Engine A updates schema, Engine B reads | B sees the new schema on its next metadata refresh; in-flight queries use the pinned schema |

### Challenges

- **Statistics interpretation** — different engines may collect or interpret column statistics slightly differently, leading to suboptimal pruning decisions.
- **Write format variations** — one engine's Parquet writer may use different compression, encoding, or page sizes than another, creating non-uniform file performance.
- **Catalog caching** — engines that aggressively cache metadata may serve stale snapshots; a TTL-based refresh policy balances freshness against catalog load.

## Fault Tolerance

### Single Points of Failure

| Component | Failure Mode | Mitigation |
|:---|:---|:---|
| Catalog service | Unavailable — no new commits, no snapshot resolution | Active-passive replication; read replicas for query planning |
| Object storage | Region outage | Cross-region replication; RPO = replication lag |
| Query engine coordinator | Node crash | Stateless coordinator with automatic restart; query retry |
| Compaction worker | Mid-compaction crash | Orphan files cleaned by vacuum; compaction restarts from scratch |
| Metadata files | Corruption or accidental deletion | Immutable metadata with version chain; restore from parent snapshot |

### Data Recovery Mechanisms

1. **Snapshot rollback** — revert to any previous snapshot by updating the catalog pointer. All data files from that snapshot are still on object storage (within retention period).
2. **Cherry-pick recovery** — selectively apply changes from one snapshot branch to another (WAP workflow).
3. **Orphan file cleanup** — vacuum process identifies files not referenced by any live snapshot and deletes them after a safety retention period (default 3–7 days).

### Failover Mechanisms

**Catalog failover**:
- Active catalog node fails → passive node promoted within 5–15 seconds.
- During failover: reads succeed using cached metadata; writes queue and retry after promotion.
- RTO: < 30 s. RPO: 0 (synchronous replication of catalog state).

**Query engine failover**:
- Worker node fails mid-query → coordinator reassigns that worker's scan splits to surviving workers.
- Coordinator fails → client retries with a new coordinator (stateless).

### Circuit Breaker Pattern

| Circuit | Trigger | Fallback |
|:---|:---|:---|
| Catalog commit | 3 consecutive CAS failures | Backoff with jitter; alert on-call |
| Object storage read | 5 consecutive timeouts on same prefix | Switch to replica region; degrade to cached results |
| Compaction | Compaction job fails 3 times on same partition | Skip partition; alert; manual investigation |
| Metadata refresh | Catalog unreachable for > 60 s | Serve queries from last cached snapshot; warn users of staleness |

### Graceful Degradation

| Severity | Condition | Behavior |
|:---|:---|:---|
| Level 0 — Normal | All systems operational | Full functionality |
| Level 1 — Degraded freshness | Catalog temporarily unreachable | Queries served from cached metadata; writes queued |
| Level 2 — Read-only | Catalog write path down | Queries continue; ingestion paused |
| Level 3 — Reduced scope | Object storage prefix throttled | Queries on unaffected partitions continue; throttled partitions return errors |
| Level 4 — Offline | Object storage region outage | All operations fail; failover to DR region initiated |

## Disaster Recovery

| Metric | Target | Mechanism |
|:---|:---|:---|
| RPO | < 1 hour | Cross-region metadata replication + object storage replication |
| RTO | < 30 minutes | Automated DNS failover + pre-warmed standby catalog |
| Backup frequency | Continuous (metadata); daily (full validation) | Metadata replicated synchronously; data files replicated asynchronously |
| Backup verification | Weekly | Automated restore test to isolated environment |

### Multi-Region Considerations

- **Active-passive**: Single write region; reads served from both. RPO = replication lag (minutes).
- **Active-active**: Both regions accept writes to different table subsets. Requires partition-level region ownership to avoid cross-region conflicts.
- **Metadata conflict resolution**: If both regions accept writes to the same table, snapshot IDs may diverge. Resolution requires a global ordering service or accepting last-writer-wins semantics.

## Hot-Spot Mitigation

| Hot Spot | Cause | Mitigation |
|:---|:---|:---|
| Single-partition write concentration | Time-partitioned table with all current writes to "today" partition | Add bucketing (hash on secondary key) within the hot partition |
| Catalog commit contention | High-frequency streaming commits to one table | Batch multiple micro-batches; increase commit interval |
| Object storage prefix throttling | All files under same prefix | Distribute files across prefixed paths using hash-based directory layout |
| Popular table metadata | Thousands of concurrent queries loading same manifests | Manifest caching at engine level; CDN-like metadata cache tier |

## Auto-Scaling Triggers

| Metric | Threshold | Action |
|:---|:---|:---|
| Query queue depth | > 20 pending queries | Scale out query workers |
| Query p99 latency | > 15 s | Scale out query workers |
| Compaction backlog (small files) | > 10 000 files under 10 MB in any partition | Spawn additional compaction workers |
| Ingestion lag | > 5 minutes behind source | Scale out ingestion workers |
| Memory pressure | > 85% used on any query worker | Scale up (larger instances) or scale out |
