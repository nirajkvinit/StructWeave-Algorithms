# Scalability & Reliability — NewSQL Database

## Scalability

### Horizontal vs. Vertical Scaling

| Aspect | Vertical Scaling | Horizontal Scaling |
|--------|-----------------|-------------------|
| Approach | Larger machines (more RAM, faster NVMe) | More nodes; ranges automatically rebalanced |
| Transaction performance | Optimal — no cross-node coordination | Cross-range transactions add consensus latency |
| Capacity ceiling | ~64 TB per node (practical limit) | Petabytes across hundreds of nodes |
| Operational complexity | Simple (single node tuning) | Complex (range rebalancing, clock sync, distributed debugging) |
| Cost efficiency | Expensive at scale | Cost-effective with commodity hardware |
| When to use | < 2 TB data, single region | > 2 TB data or multi-region requirement |

**Strategy:** Horizontal scaling is the primary scaling mechanism. Unlike traditional RDBMS, a NewSQL database is designed from the ground up for horizontal scaling — adding a node automatically triggers range rebalancing, distributing data and load without manual intervention.

### Range-Based Sharding

Data is automatically sharded into ranges (contiguous key spans) that are the unit of replication, distribution, and load balancing.

```
Table: orders (primary key: order_id INT)

Key space:  [/orders/0 ─────────────────────────── /orders/MAX]

Ranges:     [/orders/0,      /orders/10000)     → Range R1 (Node 1)
            [/orders/10000,  /orders/25000)     → Range R2 (Node 2)
            [/orders/25000,  /orders/50000)     → Range R3 (Node 3)
            [/orders/50000,  /orders/MAX)       → Range R4 (Node 1)
```

#### Automatic Range Splitting

```
FUNCTION check_split_needed(range):
    IF range.size > MAX_RANGE_SIZE:        // Size-based (default 512 MB)
        RETURN split_at_midpoint(range)

    IF range.qps > MAX_RANGE_QPS:          // Load-based
        RETURN split_at_load_midpoint(range)

    IF range.cpu_time > MAX_RANGE_CPU:     // CPU-based
        RETURN split_at_load_midpoint(range)

    RETURN no_split_needed
```

#### Automatic Range Rebalancing

```
FUNCTION rebalance_cluster():
    // Runs periodically (every 1 minute)
    node_loads = collect_node_metrics()  // ranges, QPS, disk, CPU

    FOR EACH node IN over_loaded_nodes(node_loads):
        source_range = select_range_to_move(node)  // least disruptive
        target_node = select_target_node(node_loads)  // most underloaded

        // Move range: add replica to target, wait for catch-up, remove from source
        add_learner_replica(source_range, target_node)
        WAIT until_replica_caught_up(source_range, target_node)
        promote_to_voter(source_range, target_node)
        transfer_lease(source_range, target_node)
        remove_old_replica(source_range, node)
```

### Replication Strategy: Raft Groups Per Range

Each range is independently replicated via its own Raft consensus group:

| Aspect | Configuration |
|--------|--------------|
| Replication factor | 3 (default), 5 for critical system ranges |
| Raft group per range | Independent leader election, log, and state machine |
| Leader and leaseholder | Typically co-located for performance; can be separated for geo-distribution |
| Learner replicas | Non-voting replicas used during rebalancing to catch up before becoming voters |

```
Range R1 (keys: [/orders/0, /orders/10000))
  ├── Node 1: Leader + Leaseholder (serves reads/writes)
  ├── Node 2: Follower (replicates via Raft)
  └── Node 3: Follower (replicates via Raft)

Range R2 (keys: [/orders/10000, /orders/25000))
  ├── Node 2: Leader + Leaseholder
  ├── Node 3: Follower
  └── Node 1: Follower
```

### Caching Layers

| Layer | Component | Strategy | Size |
|-------|-----------|----------|------|
| L1 | Block cache | LRU, caches SST data blocks | 25% of RAM per node |
| L2 | Row cache | LRU, caches deserialized rows | 5% of RAM per node |
| L3 | SQL plan cache | LRU, invalidated on schema change | 128 MB per node |
| L4 | Range descriptor cache | Invalidated on split/merge/move | 64 MB per node |
| L5 | Raft entry cache | Bounded ring buffer per Raft group | 16 MB per range |

### Hot Spot Mitigation

| Hot Spot Type | Cause | Mitigation |
|--------------|-------|------------|
| Sequential key inserts | Auto-increment IDs, timestamps | Hash-sharded indexes distribute writes across ranges |
| Popular row reads | Frequently accessed account/product | Read from follower replicas (follower reads) |
| Popular row writes | Global counter, inventory deduction | Application-level bucketing; scatter-gather pattern |
| Large range | Bulk data load into narrow key range | Pre-split ranges before bulk load |
| Leaseholder concentration | Ranges cluster on one node | Lease rebalancing spreads leaseholders evenly |

### Auto-Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU utilization | > 70% sustained 10 min | Add node; rebalancer moves ranges to new node |
| Disk utilization | > 70% | Add node or expand storage |
| Range count per node | > 10,000 | Add node (too many Raft groups per node) |
| Replication lag | > 10 seconds | Investigate slow follower; replace if necessary |
| Cross-range transaction ratio | > 50% | Review schema; consider key design changes |
| p99 latency | > 100ms sustained | Add nodes or split hot ranges |

---

## Reliability & Fault Tolerance

### Single Points of Failure

| Component | SPOF Risk | Mitigation |
|-----------|-----------|------------|
| Range leaseholder | Loss stops reads/writes for that range | Raft elects new leader in < 10 seconds |
| SQL gateway node | Loss drops client connections | Stateless; any node can serve SQL; load balancer re-routes |
| Metadata range | Loss prevents range lookups | System ranges replicated with higher factor (5x) |
| Single node | Loss affects ranges with replicas on that node | All ranges have 3+ replicas across different nodes |
| Entire availability zone | Loss of 1/3 of replicas | Cross-AZ placement ensures quorum survives |
| Clock source (NTP) | Clock drift increases uncertainty window | Multiple NTP sources; self-quarantine on excessive skew |

### Redundancy Strategy

- **3x replication** for each range (1 leader + 2 followers across different failure domains)
- **Cross-AZ placement** — each replica in a different availability zone
- **5x replication** for system metadata ranges (cluster configuration, range descriptors)
- **Stateless SQL layer** — any node serves any SQL query; no session affinity required
- **WAL** persisted on durable storage before acknowledging writes

### Failover Mechanisms

**Raft Leader Failure:**

```
1. Followers detect heartbeat timeout (3-5 seconds configurable)
2. Follower with most up-to-date log starts election (pre-vote)
3. Candidate requests votes from other replicas
4. Majority vote grants leadership
5. New leader applies any uncommitted log entries
6. Leaseholder transfers to new leader automatically
7. Clients retry in-flight operations (idempotency keys prevent duplication)

Total failover time: 5-10 seconds
```

**Node Failure:**

```
1. Health monitor detects node unresponsive (10 seconds)
2. All Raft groups with leaders on failed node trigger elections
3. New leaders elected on surviving nodes (parallel, independent)
4. Under-replicated ranges detected (replica count < target)
5. Rebalancer adds new replicas on healthy nodes from surviving copies
6. New replicas catch up via Raft snapshot + log replay

Full re-replication: minutes to hours depending on data size
```

### Circuit Breaker Pattern

| Circuit | Trigger | Open Duration | Fallback |
|---------|---------|---------------|----------|
| Cross-node RPC | > 50% failures in 30s | 30 seconds | Route to alternate replica |
| Raft proposal | > 3 consecutive timeouts | 15 seconds | Return "range unavailable" error |
| LSM compaction | Compaction backlog > 100 files | Until cleared | Throttle writes via admission control |
| CDC pipeline | > 10 failures in 120s | 120 seconds | Buffer changes locally |

### Retry Strategy

| Operation | Retry Count | Backoff | Notes |
|-----------|-------------|---------|-------|
| Point read | 3 | Exponential (50ms, 100ms, 200ms) | Retry on different replica if leaseholder unavailable |
| Write transaction | 2 | Exponential (100ms, 250ms) | Only for transient errors; serialization failures get full retry |
| Raft proposal | 5 | Exponential (50ms → 1s) | Leader steps down after repeated failures |
| Range lookup | 3 | Exponential (25ms, 50ms, 100ms) | Refresh range cache on failure |

### Graceful Degradation

| Severity | Condition | Degradation |
|----------|-----------|-------------|
| Level 1 | Single replica down | No user impact; range still has quorum |
| Level 2 | Leaseholder down | Writes pause 5-10s during election; reads continue on followers |
| Level 3 | Minority of nodes down | Affected ranges unavailable until election; majority of ranges unaffected |
| Level 4 | Loss of quorum for some ranges | Those ranges become read-only from surviving replicas (stale reads) |
| Level 5 | Majority of cluster down | Emergency read-only mode on surviving nodes |

### Bulkhead Pattern

| Bulkhead | Resources | Purpose |
|----------|-----------|---------|
| OLTP transactions | 60% of thread pool, 50% of admission tokens | Protect latency-sensitive reads/writes |
| Distributed SQL execution | 20% of thread pool | Multi-range queries don't starve point lookups |
| Raft replication | Dedicated thread pool | Consensus never blocked by query execution |
| Background maintenance | 10% of I/O bandwidth | Compaction, GC, stats collection |

---

## Disaster Recovery

### Recovery Objectives

| Metric | Target | Strategy |
|--------|--------|----------|
| RPO (single region) | 0 seconds | Synchronous Raft replication (quorum write) |
| RTO (single region) | < 10 seconds | Automatic Raft leader election |
| RPO (cross-region) | < 1 second | Synchronous cross-region quorum (5-replica) |
| RTO (cross-region) | < 30 seconds | Leader election + client reconnection |
| RPO (region failure) | 0 seconds (with cross-region quorum) | Surviving regions have committed data |
| RTO (region failure) | < 60 seconds | Elections in surviving regions + DNS update |

### Backup Strategy

| Backup Type | Frequency | Retention | Method |
|-------------|-----------|-----------|--------|
| Incremental | Continuous | 30 days | Export committed MVCC data to object storage |
| Full snapshot | Daily | 90 days | Consistent cluster-wide snapshot via distributed timestamp |
| Point-in-time recovery | Continuous within window | 7 days | MVCC version history allows reading at any past timestamp |
| Cross-region | Continuous | 7 days | Asynchronous replication to standby region |

### Multi-Region Deployment

| Topology | Write Latency | Read Latency | Survivability | Complexity |
|----------|--------------|-------------|---------------|------------|
| Single-region, multi-AZ | < 5ms | < 2ms | Survives AZ failure | Low |
| Multi-region, 3 replicas (one per region) | ~100ms (cross-region quorum) | < 2ms (local leaseholder) | Survives region failure | Medium |
| Multi-region, 5 replicas (2+2+1) | ~100ms (cross-region quorum) | < 2ms (local reads) | Survives region failure | High |
| Multi-region with locality config | < 5ms (local writes for pinned data) | < 2ms | Survives region failure for non-pinned data | High |

**Key multi-region technique: Lease preferences**

Pin leaseholders for specific tables to the region where those tables are most accessed. A `users` table for US customers has its leaseholders in `us-east`, while EU customer data has leaseholders in `eu-west`. Reads are always fast (local leaseholder), and writes for region-pinned data complete with local quorum.
