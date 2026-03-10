# Scalability & Reliability --- Time-Series Database

## Scalability

### Horizontal vs. Vertical Scaling Decisions

| Component | Scaling Strategy | Justification |
|---|---|---|
| **Ingestion Gateway** | Horizontal | Stateless; scale by adding instances behind load balancer |
| **Distributor** | Horizontal | Stateless; hash ring membership updated via gossip protocol |
| **Ingester** | Horizontal (with rebalancing) | Stateful; adding ingesters requires ring rebalancing and series migration; replication factor 3 ensures availability during rebalancing |
| **Query Frontend** | Horizontal | Stateless; split and route queries to query engine pool |
| **Query Engine** | Horizontal | Stateless per query; each engine reads from shared block storage; scale based on query concurrency |
| **Compactor** | Horizontal (sharded by time range) | Stateless workers that pick up compaction jobs; scale based on block accumulation rate |
| **Object Storage** | Managed/Infinite | Cloud-managed; no capacity planning needed; scale is limited only by cost |

### Auto-Scaling Triggers and Thresholds

| Component | Scale-Up Trigger | Scale-Down Trigger | Min/Max Instances |
|---|---|---|---|
| Ingestion Gateway | CPU > 70% for 5 min | CPU < 30% for 15 min | 3 / 50 |
| Ingester | Memory > 80% OR series/node > 5M | Memory < 40% AND series/node < 2M | 5 / 100 |
| Query Engine | Query queue depth > 50 for 3 min | Queue depth = 0 for 15 min | 3 / 30 |
| Compactor | Pending compaction jobs > 100 | No pending jobs for 30 min | 2 / 20 |

### Database Scaling Strategy

#### Ingester Ring Scaling

```
FUNCTION scale_ingesters(current_count, target_count):
    IF target_count > current_count:
        // Scale up: add new nodes to ring
        FOR i IN range(target_count - current_count):
            new_node = provision_ingester()
            ring.add_node(new_node, VIRTUAL_NODES=128)
            // New node receives ~1/target_count of all series
            // Series migration happens lazily:
            //   - New samples for migrated series go to new node
            //   - Old node's head block for those series is flushed to disk
            //   - No bulk data migration needed

    ELSE IF target_count < current_count:
        // Scale down: drain node before removal
        drain_node = select_least_loaded_ingester()
        drain_node.stop_accepting_new_series()
        drain_node.flush_all_head_blocks()
        // Wait until all WAL data is persisted as blocks
        ring.remove_node(drain_node)
        decommission(drain_node)
```

#### Sharding Strategy for >100M Series

At extreme scale (>100M active series), a single hash ring becomes insufficient. The architecture transitions to a **two-level sharding** model:

```
Level 1: Tenant-based sharding
  Each tenant is assigned to a "cell" (isolated ingester ring + query engine pool)
  Tenant → Cell mapping stored in a coordination service
  Large tenants get dedicated cells; small tenants are co-located

Level 2: Series-based sharding (within a cell)
  Within each cell, series are distributed across ingesters via consistent hash ring
  Standard ring mechanics: hash series fingerprint → ingester assignment

Benefits:
  - Tenant isolation: one tenant's cardinality explosion doesn't affect others
  - Independent scaling: cells scale based on their tenant's needs
  - Failure isolation: cell-level failures affect only that cell's tenants
```

### Caching Layers

| Cache Layer | What It Caches | Eviction | Size |
|---|---|---|---|
| **L1: Query result cache** | Full query results keyed by (query fingerprint, time range, step) | LRU + TTL (60s for recent data, 1h for historical) | 5-10 GB per query frontend |
| **L2: Block index cache** | Block-level inverted index and series metadata | LRU; warm on block open | 10-20 GB per query engine |
| **L3: Chunk data cache** | Decompressed chunk data for frequently accessed series | LRU; priority by access frequency | 5-10 GB per query engine |
| **L4: Metadata cache** | Tenant configs, series-to-ingester mappings, block manifests | TTL (5 min) with invalidation on change | 1-2 GB per component |

### Hot Spot Mitigation

| Hot Spot Type | Cause | Mitigation |
|---|---|---|
| **Hot ingester** | Uneven series distribution in hash ring (popular metrics hash to same range) | Virtual nodes (128 per ingester) for better distribution; adaptive ring rebalancing |
| **Hot series** | One series receives disproportionate samples (e.g., global counter aggregated by every pod) | Series-level rate limiting at distributor; pre-aggregation at agent level |
| **Hot time range** | All queries focus on the most recent 15 minutes (dashboards auto-refresh) | Query result caching with step alignment; recording rules for hot dashboard queries |
| **Hot block** | Many queries touch the same compacted block (popular service's last 24 hours) | Block-level read caching; replicate hot blocks across multiple query engine local caches |

---

## Reliability & Fault Tolerance

### Single Points of Failure (SPOF) Identification

| Component | SPOF Risk | Mitigation |
|---|---|---|
| Coordination Service | If coordination service fails, ring membership cannot update | 3-node or 5-node quorum; gossip-based ring as fallback; cached ring state on each node |
| Ingester | Series data in head block is lost if ingester dies before flush | Replication factor 3: each series written to 3 ingesters; WAL on local SSD enables recovery |
| Compactor | If compactor fails, blocks accumulate but no data loss | Multiple compactor workers; job queue with retry; blocks remain queryable even without compaction |
| Object Storage | Loss of cold-tier data | Provider-managed 11-nines durability; cross-region replication for critical tenants |
| Query Frontend | Single point for all queries | Multiple stateless instances behind load balancer; clients retry on failure |

### Redundancy Strategy

#### Ingester Replication

```
FUNCTION write_with_replication(series, sample, ring):
    replicas = ring.get_replicas(series.fingerprint, REPLICATION_FACTOR=3)

    success_count = 0
    FOR EACH replica IN replicas:
        TRY:
            replica.write(series, sample)
            success_count += 1
        CATCH timeout_or_error:
            log_warning("replica write failed", replica, error)

    // Quorum write: succeed if majority replicas acknowledge
    IF success_count >= QUORUM (2 of 3):
        RETURN SUCCESS
    ELSE:
        RETURN FAILURE("insufficient replicas")

// Read path deduplication:
// When querying, the query engine reads from all replicas
// and deduplicates by (series_id, timestamp)
// This handles the case where replicas have slightly different data
```

### Failover Mechanisms

| Scenario | Detection | Recovery |
|---|---|---|
| **Ingester crash** | Heartbeat timeout (30s) | Ring marks node as unhealthy; replicas serve reads; new ingester joins ring; WAL replay recovers in-memory state (30s-5min depending on checkpoint frequency) |
| **Compactor failure** | Job timeout (10 min) | Job returned to queue; another compactor picks it up; source blocks remain available |
| **Query engine OOM** | Process exit; health check failure | Kubernetes restarts pod; query frontend retries to different engine; query result cache prevents repeat computation |
| **Object storage unavailable** | Read timeout; 5xx errors | Circuit breaker trips after 3 failures in 10s; queries fall back to local block cache; ingestion continues to local disk; uploads retry with exponential backoff |

### Circuit Breaker Patterns

```
FUNCTION query_with_circuit_breaker(block_source, query):
    breaker = get_circuit_breaker(block_source)

    IF breaker.state == OPEN:
        IF block_source == OBJECT_STORAGE:
            RETURN query_local_cache_only(query)  // graceful degradation
        ELSE:
            RETURN error("source unavailable, retry later")

    TRY:
        result = block_source.execute(query)
        breaker.record_success()
        RETURN result
    CATCH timeout_or_error:
        breaker.record_failure()
        IF breaker.failure_count >= THRESHOLD (5 in 30s):
            breaker.trip()  // CLOSED → OPEN
            schedule_half_open_check(breaker, AFTER=30s)
        THROW
```

### Retry Strategy

| Operation | Retry Policy | Max Retries | Backoff |
|---|---|---|---|
| Ingestion write (to replica) | Immediate retry to different replica | 2 | None (try next replica) |
| Object storage read | Exponential backoff | 3 | 100ms → 500ms → 2s |
| Compaction job | Re-queue with delay | 5 | 1min → 5min → 15min → 1h → 4h |
| Query execution | Frontend retries to different engine | 2 | 100ms (different engine) |
| Block upload | Exponential backoff with jitter | 10 | 1s → 5s → 30s (capped) |

### Graceful Degradation

| Scenario | Degraded Behavior | User Impact |
|---|---|---|
| Object storage down | Queries limited to locally cached blocks; historical queries return partial data | Recent data available; long-range queries show gaps |
| Compaction backlog | More block files to scan per query; slightly higher latency | Queries work but slower; no data loss |
| High cardinality spike | New series creation rejected; existing series continue accepting data | Dashboard queries work; new metric series fail to appear |
| Memory pressure | Head block window reduced from 2h to 1h; OOO window reduced | More frequent block flushes; some late samples rejected |

---

## Disaster Recovery

### RTO and RPO Targets

| Scenario | RPO | RTO | Strategy |
|---|---|---|---|
| Single ingester failure | 0 (replicated) | 2 minutes (WAL replay) | Replication factor 3; WAL on local SSD |
| Availability zone failure | < 5 seconds (replication lag) | 5 minutes (ring rebalancing) | Cross-AZ ingester placement; 3-way replication spans AZs |
| Region failure | < 1 hour (async replication lag) | 30 minutes (DNS failover + cold start) | Async block replication to standby region; object storage cross-region replication |
| Object storage corruption | 0 (versioned) | 15 minutes (restore from version) | Object versioning; cross-region replication |

### Backup Strategy

```
TSDB Backup Architecture:
  1. WAL: continuously replicated to 2 additional ingesters (synchronous)
  2. Blocks: uploaded to object storage immediately after compaction (async, <5 min lag)
  3. Object storage: cross-region replication (provider-managed, <15 min lag)
  4. Index metadata: snapshotted to object storage every hour
  5. Tenant configuration: version-controlled in coordination service with snapshots

Recovery procedure:
  1. Provision new TSDB cluster in standby region
  2. Point to cross-region replicated object storage
  3. Reconstruct inverted index from block files (10-30 min for 25M series)
  4. Warm head block from most recent WAL backup (if available)
  5. Resume ingestion; accept data gap between last backup and recovery
```

### Multi-Region Considerations

| Approach | Pros | Cons | Use Case |
|---|---|---|---|
| **Active-Passive** | Simple; low cost; no write conflicts | RPO = replication lag; RTO = failover time; standby region idle | Most deployments; cost-sensitive |
| **Active-Active (per-tenant)** | Near-zero RPO for critical tenants; instant failover | Complexity; potential inconsistency during partition; 2x cost | Premium tier tenants; regulatory requirements |
| **Write-local, Query-global** | Each region ingests its own data; global query fans out to all regions | Cross-region query latency; complex query routing | Geographically distributed monitoring (each region monitors itself) |
