# Scalability & Reliability --- Metrics & Monitoring System

## Scalability

### Horizontal Scaling Architecture

The disaggregated TSDB architecture enables independent horizontal scaling of each component along its specific bottleneck:

| Component | Scaling Axis | Trigger | Mechanism |
|---|---|---|---|
| **Ingestion Gateway** | Request rate | >80% CPU or >10K req/s per instance | Stateless; add instances behind load balancer |
| **Distributor** | Samples/s throughput | >500K samples/s per instance | Stateless; hash ring rebalances automatically |
| **Ingester** | Active series count / memory | >2M active series or >70% memory per instance | Stateful; add node to hash ring, ring rebalances series ownership; existing ingesters flush affected series |
| **Compactor** | Pending blocks | Compaction lag >2 hours | Stateless workers; parallelize across independent block ranges; scale to match ingestion rate |
| **Query Engine** | Concurrent queries | >80% query concurrency utilized | Stateless; add query nodes; query frontend distributes across pool |
| **Query Frontend** | Cache size / request rate | Cache eviction rate >20% or >1K req/s | Stateless; shared cache backend (Redis/Memcached) scales independently |
| **Alert Evaluator** | Rule count / evaluation lag | Evaluation lag >50% of interval | Shard rule groups across evaluator instances; each evaluator owns a subset of rules |

### Scaling the Ingester Hash Ring

```
INITIAL STATE: 3 ingesters, replication factor 3
  Ingester-1: owns hash range [0, 0.33)      → 3.3M active series
  Ingester-2: owns hash range [0.33, 0.66)   → 3.3M active series
  Ingester-3: owns hash range [0.66, 1.0)    → 3.3M active series

SCALE EVENT: active series growing → add Ingester-4

STEP 1: Ingester-4 joins ring, receives tokens (virtual nodes)
STEP 2: Ring rebalances: each existing ingester transfers ~25% of series
STEP 3: Transferred series' WAL segments are replayed on Ingester-4
STEP 4: Once Ingester-4 is caught up, distributor routes new writes to it

NEW STATE: 4 ingesters, ~2.5M active series each

CRITICAL: During rebalancing, both old and new ingester accept writes
for transferred series. Deduplication at query time resolves duplicates.
```

### Auto-Scaling Triggers

```
FUNCTION evaluate_autoscaling():
    // Ingester scaling
    avg_series_per_ingester = total_active_series / ingester_count
    IF avg_series_per_ingester > SERIES_PER_INGESTER_LIMIT * 0.8:
        scale_up_ingesters(desired = CEIL(total_active_series / (SERIES_PER_INGESTER_LIMIT * 0.6)))

    // Query engine scaling
    query_queue_depth = get_metric("query_queue_depth")
    IF query_queue_depth > MAX_QUEUE_DEPTH * 0.7 FOR 5 minutes:
        scale_up_query_nodes(current_count + CEIL(current_count * 0.3))

    // Compactor scaling
    compaction_lag = get_metric("compaction_lag_hours")
    IF compaction_lag > 2.0:
        scale_up_compactors(current_count + 1)

    // Scale down (conservative: only scale down after sustained low utilization)
    IF avg_series_per_ingester < SERIES_PER_INGESTER_LIMIT * 0.3 FOR 30 minutes:
        scale_down_ingesters(desired = MAX(3, CEIL(total_active_series / (SERIES_PER_INGESTER_LIMIT * 0.6))))
```

### Database Scaling Strategy

#### Object Storage Scaling

Object storage (the primary storage backend for persistent blocks) scales transparently:
- No capacity planning required; virtually unlimited storage
- Cost scales linearly with data volume
- Read throughput scales by increasing query node count (each node fetches blocks independently)
- Write throughput limited by compactor upload parallelism (rarely a bottleneck)

#### Index Scaling

The inverted index is the memory-bound bottleneck. Scaling strategies:

| Strategy | How It Works | When to Use |
|---|---|---|
| **Vertical scaling** | Increase memory per ingester/query node | <50M active series; simplest approach |
| **Index sharding** | Partition index by series fingerprint across nodes; each query fans out to all shards | 50M-500M series; adds query fanout latency |
| **Tiered indexing** | Hot index (recent data) in memory; warm index (older blocks) on SSD with mmap | When index exceeds available memory; trades query latency for memory savings |
| **Bloom filter pre-filtering** | Bloom filter per block to quickly reject blocks that don't contain a queried series | Reduces unnecessary block reads; false positive rate of 1% with ~10 bits per series |

### Caching Layers

| Layer | What It Caches | Eviction | Hit Rate Target |
|---|---|---|---|
| **L1: Query result cache** | Full query results keyed by (query_hash, step_aligned_time_range) | TTL = step interval (e.g., 15s); LRU within capacity | >60% for dashboard queries |
| **L2: Chunk cache** | Decompressed chunks from object storage, keyed by (block_id, series_id, chunk_id) | LRU; sized to hold ~2 hours of hot data | >80% for active series |
| **L3: Index cache** | Block-level index lookups (series ID → chunk references) | LRU; sized per block count | >90% for recent blocks |
| **L4: Metadata cache** | Block metadata (time range, series count, compaction level) | TTL = 5 min; refreshed on compaction | >99% |

### Hot Spot Mitigation

| Hot Spot | Cause | Mitigation |
|---|---|---|
| **Popular metric** | A single metric (e.g., `up` or `node_cpu_seconds_total`) exists across all targets, creating a posting list with millions of entries | Split posting lists across shards; cache popular metric query results aggressively |
| **Dashboard storm** | 100+ engineers open the same incident dashboard simultaneously | Query deduplication: identical in-flight queries share a single TSDB query execution; result multicast to all waiters |
| **Ingester hot partition** | Hash ring imbalance causes one ingester to own more active series than others | Virtual nodes (128+ tokens per ingester) for statistical balancing; monitor per-ingester series count and rebalance tokens if skew >20% |

---

## Reliability & Fault Tolerance

### Single Points of Failure (SPOF) Analysis

| Component | SPOF Risk | Mitigation |
|---|---|---|
| **Ingestion Gateway** | Low | Stateless; multiple instances behind load balancer; health-checked |
| **Distributor** | Low | Stateless; any distributor can hash to any ingester |
| **Ingester** | **Medium-High** | Stateful; loss of an ingester loses its in-memory head block data. **Mitigation**: Replication factor 3; WAL on durable local storage; ring-based failover |
| **Object Storage** | Very Low | Cloud-provided 11-nines durability; multi-AZ replication built-in |
| **Hash Ring Coordinator** | **High** | Ring membership stored in coordination service (etcd/Consul). **Mitigation**: 3-5 node coordinator cluster; gossip protocol as fallback for ring state |
| **Alert Manager** | **High** | Single alert manager = SPOF for all notifications. **Mitigation**: Clustered alert manager with gossip-based state sharing; each instance can independently deliver notifications |
| **Query Frontend** | Low | Stateless; cache backend (Redis) is independently fault-tolerant |

### Redundancy Strategy

#### Ingester Replication

```
WRITE PATH WITH REPLICATION (replication_factor = 3):

  1. Distributor receives batch of samples
  2. For each series, hash labels to determine primary ingester
  3. Find next 2 ingesters on the ring (replicas)
  4. Write to all 3 ingesters in parallel
  5. Wait for quorum (2 of 3) success before acknowledging

  Write success requires: quorum_writes >= CEIL(replication_factor / 2) + 1

  If 1 ingester is down:
    - Writes continue to 2 healthy replicas (quorum met)
    - Failed writes are replayed when ingester recovers (via WAL on sender or re-ingestion)

  If 2 ingesters are down:
    - Quorum cannot be met for affected series
    - Distributor queues writes with backpressure
    - Alert: "IngesterQuorumLost" via meta-monitoring

READ PATH WITH REPLICATION:
  1. Query engine fetches data from all replicas for requested series
  2. Deduplicate overlapping samples (same timestamp + value)
  3. Merge results (union of all samples from all replicas)
  4. Deduplication is cheap: compare (timestamp, value) pairs
```

### Failover Mechanisms

#### Ingester Failure and Recovery

```
DETECTION:
  - Ring heartbeat timeout: 30 seconds (ingester stops sending heartbeats)
  - Health check failure: 3 consecutive failed checks (5 seconds apart)

FAILOVER:
  1. Ring coordinator marks ingester as LEAVING
  2. Distributor stops routing new writes to failed ingester
  3. Adjacent ingesters on the ring absorb the failed ingester's hash range
  4. Queries to affected series are served by remaining replicas

RECOVERY (when ingester restarts):
  1. Ingester replays WAL to reconstruct head block state
  2. Registers with ring coordinator as JOINING
  3. Receives token assignments (may get new range due to rebalancing)
  4. Enters ACTIVE state and begins accepting writes

TOTAL FAILOVER TIME: <60 seconds (detection) + WAL replay time (30-120 seconds)
```

### Circuit Breaker Patterns

```
CIRCUIT BREAKER for Object Storage reads:

  States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing)

  CLOSED → OPEN:
    Trigger: >50% of read requests fail in 30-second window
    Action: Stop reading from object storage; serve queries from cache + head block only
    Alert: "ObjectStorageCircuitOpen" (critical)

  OPEN → HALF_OPEN:
    Trigger: 60 seconds elapsed
    Action: Allow 10% of read requests through as probes

  HALF_OPEN → CLOSED:
    Trigger: >90% of probe requests succeed
    Action: Resume normal operation

  HALF_OPEN → OPEN:
    Trigger: >50% of probe requests fail
    Action: Stay open; extend timeout to 120 seconds

CIRCUIT BREAKER for Alert Notification delivery:

  Per notification channel (email, PagerDuty, Slack):
    CLOSED → OPEN: >80% delivery failures in 60 seconds
    Action: Queue notifications in local persistent buffer; retry via alternative channel
    Fallback: If primary channel is OPEN, escalate to secondary channel
```

### Retry Strategies

| Component | Retry Policy | Backoff | Max Retries | Notes |
|---|---|---|---|---|
| Ingestion (agent → gateway) | Retry with buffering | Exponential: 1s, 2s, 4s, 8s, 16s | 5 (then buffer locally) | Agent buffers locally during outage; replays on recovery |
| Distributor → Ingester | Retry to replica | Immediate (try next replica) | replication_factor - 1 | Ring-aware retry: try next ingester on ring |
| Query → Object Storage | Retry with backoff | Exponential: 100ms, 200ms, 400ms | 3 | Per-block retry; partial results acceptable |
| Alert notification | Retry with dedup | Exponential: 5s, 30s, 2m, 10m | 10 (over 30 minutes) | Deduplication by alert fingerprint + timestamp |
| Compaction upload | Retry idempotently | Fixed: 30s | 5 | Idempotent upload to object storage; safe to retry |

### Graceful Degradation

| Scenario | Degraded Behavior | User Impact |
|---|---|---|
| Object storage unavailable | Serve queries from cache + head block; historical data unavailable | Dashboards show only recent data; banner: "Historical data temporarily unavailable" |
| 1 of 3 ingesters down | Writes continue to 2 replicas (quorum); queries served by remaining replicas | No visible impact; slight increase in query latency due to deduplication |
| Query engine overloaded | Shed low-priority queries; alert evaluations continue; dashboards show cached data | Dashboard refresh slower; "Data may be stale" indicator; alerts unaffected |
| Alert notification channel down | Queue notifications; escalate to backup channel | Delayed notifications via primary; backup channel receives escalated alerts |
| Cardinality cap reached | Reject new series; existing series continue; diagnostic info in rejection | New metrics from a specific tenant not accepted; existing monitoring unaffected |

### Bulkhead Pattern

```
RESOURCE ISOLATION between tenants and query types:

  INGESTION BULKHEADS:
    Per-tenant goroutine pool for sample processing
    Tenant A's cardinality explosion cannot consume Tenant B's processing threads

  QUERY BULKHEADS:
    Per-tenant query concurrency slots (e.g., 20 per tenant)
    Separate slot pools for:
      - Alert evaluations (reserved, never shed)
      - Recording rules (high priority)
      - Dashboard queries (normal priority)
      - Ad-hoc API queries (low priority, first to be shed)

  MEMORY BULKHEADS:
    Per-query memory limit (e.g., 512 MB)
    Queries exceeding limit are terminated with "query too large" error
    Prevents single expensive query from OOM-killing the query engine
```

---

## Disaster Recovery

### RTO / RPO Targets

| Component | RPO (max data loss) | RTO (max downtime) | Strategy |
|---|---|---|---|
| **Metric data** | 0 (for acknowledged writes) | 15 minutes | WAL durability + object storage replication; cross-AZ ingester replicas |
| **Alert configuration** | 5 minutes | 10 minutes | Configuration stored in version-controlled config management; alerts can be re-deployed from Git |
| **Dashboard definitions** | 1 hour | 30 minutes | Dashboard JSON stored in relational database with hourly snapshots; cross-region database replication |
| **Alert state** | 1 evaluation interval | 2 minutes | Alert state is reconstructable from TSDB data; alert manager cluster synchronizes state via gossip |

### Backup Strategy

```
CONTINUOUS BACKUP (built into architecture):
  - Object storage blocks are the backup: immutable, durable (11 nines), versioned
  - WAL provides point-in-time recovery for in-memory data
  - Cross-AZ replication at ingester level provides real-time redundancy

CONFIGURATION BACKUP:
  - Alert rules, recording rules: GitOps (source of truth is Git repository)
  - Dashboard definitions: database with automated daily snapshots
  - Tenant configuration: database replication + daily export to object storage
  - Notification routes/silences: alert manager cluster state gossip + periodic snapshot

RECOVERY PROCEDURE:
  1. Deploy new TSDB cluster from infrastructure-as-code
  2. Point at existing object storage bucket (blocks are self-describing)
  3. Compactor scans and registers all blocks automatically
  4. Ingesters begin receiving new writes immediately
  5. Historical data available for queries within minutes (block metadata scan)
  6. Restore alert/dashboard configuration from Git/database backup
```

### Multi-Region Considerations

| Pattern | How It Works | Trade-off |
|---|---|---|
| **Active-passive** | Primary region handles all ingestion and queries; secondary region has read-only access to object storage blocks | Simple; cross-region bandwidth only for block replication; RTO = time to redirect traffic to secondary |
| **Active-active** | Each region has independent TSDB cluster; agents push to nearest region; cross-region query federation for global views | Low latency for regional queries; complex global queries; requires deduplication for multi-homed agents |
| **Write-local, read-global** | Each region ingests local metrics; a global query layer federates across regional TSDBs for cross-region dashboards | Best balance: local write latency, global read capability; federation query overhead for cross-region |

**Recommendation**: Write-local, read-global. Each region maintains a fully independent TSDB cluster. Global dashboards use a federation layer that fans out queries to regional clusters and merges results. This avoids cross-region write latency while enabling global observability.
