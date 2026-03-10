# Scalability & Reliability — Graph Database

## Scalability

### Horizontal vs. Vertical Scaling

| Aspect | Vertical Scaling | Horizontal Scaling |
|--------|-----------------|-------------------|
| Approach | Larger machines (more RAM, faster SSDs) | More machines with graph partitioned across them |
| Traversal performance | Optimal — all data local | Degraded by cross-partition hops |
| Capacity ceiling | ~2 TB RAM, ~100 TB NVMe | Theoretically unlimited |
| Operational complexity | Simple (single instance) | Complex (distributed transactions, rebalancing) |
| Cost efficiency | Expensive at scale | Cost-effective with commodity hardware |
| When to use | Graphs < 100B edges, single datacenter | Graphs > 100B edges or multi-region |

**Strategy:** Favor vertical scaling as long as possible. A single machine with 2 TB RAM can hold a graph with ~30B edges entirely in memory. Horizontal scaling introduces the graph partitioning problem, which fundamentally degrades traversal performance for cross-partition edges.

### Graph Partitioning Strategy

#### Phase 1: Offline Community Detection

```
FUNCTION partition_graph(graph, num_partitions):
    // Step 1: Detect communities using Louvain algorithm
    communities = louvain_community_detection(graph)

    // Step 2: Merge small communities, split large ones
    balanced_communities = balance_partitions(communities, num_partitions)

    // Step 3: Assign communities to partitions minimizing edge cuts
    assignment = min_cut_assignment(balanced_communities, num_partitions)

    // Step 4: Create ghost replicas for high-traffic cross-partition edges
    ghost_nodes = identify_border_nodes(graph, assignment)
    FOR EACH ghost IN ghost_nodes:
        replicate_to_neighbor_partition(ghost, assignment)

    RETURN assignment

// Run periodically (daily/weekly) as rebalancing is expensive
```

#### Phase 2: Online Assignment for New Nodes

```
FUNCTION assign_new_node(node, existing_neighbors):
    IF existing_neighbors is empty:
        // Hash-based assignment for isolated nodes
        RETURN hash(node.id) MOD num_partitions

    // Count neighbors per partition
    partition_counts = count_neighbors_per_partition(existing_neighbors)

    // Assign to partition with most neighbors (gravity)
    best_partition = partition_with_max_count(partition_counts)

    // Check balance constraint
    IF partition_load(best_partition) > 1.2 * average_load:
        // Overflow to second-best partition
        best_partition = second_best(partition_counts)

    RETURN best_partition
```

### Database Scaling Strategy

#### Read Replicas

| Replica Type | Consistency | Use Case | Replication |
|-------------|-------------|----------|-------------|
| Synchronous follower | Strong read | OLTP traversals requiring latest data | WAL streaming, quorum ACK |
| Asynchronous follower | Eventual read | Analytics, reporting, batch jobs | WAL streaming, no ACK wait |
| Read-only snapshot | Point-in-time | Backup, testing, time-travel queries | Periodic snapshot copy |

#### Sharding Architecture

```
┌─────────────────────────────────────────────────┐
│ Query Router (stateless)                        │
│ - Parses query, identifies starting nodes       │
│ - Routes to owning partition(s)                 │
│ - Merges results from multiple partitions       │
└───────────┬───────────┬───────────┬─────────────┘
            │           │           │
    ┌───────▼──┐  ┌─────▼────┐  ┌──▼───────┐
    │Partition 1│  │Partition 2│  │Partition 3│
    │ Leader    │  │ Leader    │  │ Leader    │
    │ + 2 Foll. │  │ + 2 Foll. │  │ + 2 Foll. │
    │           │  │           │  │           │
    │ Ghost     │  │ Ghost     │  │ Ghost     │
    │ replicas  │  │ replicas  │  │ replicas  │
    │ of border │  │ of border │  │ of border │
    │ nodes     │  │ nodes     │  │ nodes     │
    └──────────┘  └──────────┘  └──────────┘
```

### Caching Layers

| Layer | Component | Strategy | Size |
|-------|-----------|----------|------|
| L1 | Query result cache | LRU with write-invalidation | 8 GB per node |
| L2 | Buffer cache (pages) | Clock-sweep eviction | 80% of available RAM |
| L3 | Neighbor cache | Cache deserialized adjacency lists for hot nodes | 16 GB per node |
| L4 | Property cache | LRU for frequently accessed properties | 8 GB per node |

### Hot Spot Mitigation

| Hot Spot Type | Cause | Mitigation |
|--------------|-------|------------|
| Supernode read | Celebrity/company node traversed by many queries | Ghost replicas across partitions; vertex-centric indexes |
| Supernode write | High-rate edge creation (new followers) | Append-only relationship groups; batch coalescing |
| Index hot key | Many queries start from same property value | Shard the index entry; route reads to replicas |
| Partition imbalance | Organic growth concentrates activity | Periodic rebalancing with online partition migration |

### Auto-Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU utilization | > 70% sustained 10 min | Add read replica |
| Buffer cache hit ratio | < 85% | Add RAM (vertical) or partition split (horizontal) |
| Cross-partition query ratio | > 30% | Trigger rebalancing / repartitioning |
| Query queue depth | > 100 | Add read replica or scale compute |
| Disk utilization | > 75% | Expand storage or add partition |

---

## Reliability & Fault Tolerance

### Single Points of Failure

| Component | SPOF Risk | Mitigation |
|-----------|-----------|------------|
| Partition leader | Loss stops writes to that partition | Raft consensus: automatic leader election in < 10s |
| Query router | Loss stops all queries | Stateless; multiple instances behind load balancer |
| WAL storage | Loss risks data loss | WAL on durable storage with replication |
| Metadata store | Loss prevents cluster coordination | Replicated metadata store (3-5 nodes) |
| Network between partitions | Loss creates split brain | Raft quorum prevents split-brain; partition leaders require majority |

### Redundancy Strategy

- **3x replication** for each partition (1 leader + 2 followers)
- **Cross-AZ deployment** — each replica in a different availability zone
- **Stateless query routers** — 3+ instances with health-check-based routing
- **WAL** stored on separate durable storage with its own replication

### Failover Mechanisms

**Leader Failure:**

```
1. Follower detects leader heartbeat timeout (5 seconds)
2. Follower starts Raft election with incremented term
3. Candidate receives majority votes from partition's replica set
4. New leader begins accepting writes
5. In-flight transactions on old leader are aborted
6. Clients retry failed writes (idempotency keys prevent duplication)

Total failover time: 5-15 seconds
```

**Read Replica Failure:**

```
1. Load balancer detects health check failure (3 consecutive failures)
2. Replica removed from rotation
3. Reads redistributed to remaining replicas
4. New replica provisioned from latest snapshot + WAL replay
5. New replica catches up and is added to rotation

Zero downtime for reads (assuming N >= 2 healthy replicas)
```

### Circuit Breaker Pattern

| Circuit | Trigger | Open Duration | Fallback |
|---------|---------|---------------|----------|
| Cross-partition call | > 50% failures in 30s | 30 seconds | Return partial results with "incomplete" flag |
| Analytics engine | > 3 timeouts in 60s | 60 seconds | Reject analytics queries, OLTP continues |
| External index (full-text) | > 5 failures in 60s | 60 seconds | Disable text search, property lookups still work |
| CDC pipeline | > 10 failures in 120s | 120 seconds | Buffer mutations locally, replay when circuit closes |

### Retry Strategy

| Operation | Retry Count | Backoff | Notes |
|-----------|-------------|---------|-------|
| Read query | 3 | Exponential (100ms, 200ms, 400ms) | Retry on different replica |
| Write transaction | 2 | Exponential (200ms, 500ms) | Only for transient errors, not constraint violations |
| Cross-partition hop | 3 | Fixed (50ms) | With speculative prefetch on retry |
| WAL replication | Unlimited | Exponential with cap (100ms → 10s) | Must eventually succeed for durability |

### Graceful Degradation

| Severity | Condition | Degradation |
|----------|-----------|-------------|
| Level 1 | Single replica down | Read traffic redistributed; no user impact |
| Level 2 | Partition leader down | Writes paused 5-15s during election; reads continue |
| Level 3 | Cross-partition network issue | Multi-partition queries return partial results |
| Level 4 | > 50% cluster unreachable | Read-only mode on surviving partitions |
| Level 5 | Full cluster failure | Serve cached results from edge cache (stale but available) |

### Bulkhead Pattern

Separate resource pools for different workload types:

| Bulkhead | Resources | Purpose |
|----------|-----------|---------|
| OLTP traversals | 60% of threads, 50% of buffer cache | Protect latency-sensitive queries |
| Analytics queries | 20% of threads, 30% of buffer cache | Prevent analytics from starving OLTP |
| Admin operations | 10% of threads, 10% of buffer cache | Schema changes, index builds |
| Background maintenance | 10% of threads, 10% of buffer cache | Compaction, statistics refresh |

---

## Disaster Recovery

### Recovery Objectives

| Metric | Target | Strategy |
|--------|--------|----------|
| RPO (Recovery Point Objective) | < 1 second | Synchronous WAL replication to 2+ replicas |
| RTO (Recovery Time Objective) | < 30 seconds | Raft-based automatic failover |
| RPO (cross-region) | < 5 seconds | Asynchronous WAL shipping to standby region |
| RTO (cross-region) | < 5 minutes | Promoted standby + DNS failover |

### Backup Strategy

| Backup Type | Frequency | Retention | Method |
|-------------|-----------|-----------|--------|
| Incremental | Continuous | 7 days | WAL archival to object storage |
| Full snapshot | Daily | 30 days | Online snapshot (copy-on-write) |
| Cross-region | Continuous | 3 days | Async WAL shipping + daily snapshot |
| Long-term archive | Weekly | 1 year | Compressed snapshot to cold storage |

### Multi-Region Considerations

| Topology | Write Latency | Read Latency | Consistency | Complexity |
|----------|--------------|-------------|-------------|------------|
| Single-region, multi-AZ | Low (< 5ms) | Low (< 2ms) | Strong | Low |
| Active-passive cross-region | Low in primary | Higher in standby | Strong in primary | Medium |
| Active-active cross-region | Medium (quorum across regions) | Low (local reads) | Eventual | Very High |

**Recommendation:** Active-passive for most use cases. Active-active only when reads must be served from multiple regions with sub-10ms latency. Graph traversal across regions is impractical (each hop adds cross-region latency), so active-active requires full graph replicas in each region.
