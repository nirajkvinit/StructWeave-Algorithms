# Requirements & Use Cases

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Requirements

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-1 | Key-to-Node Mapping | P0 | Given a key, deterministically return the responsible node |
| FR-2 | Minimal Disruption | P0 | Adding/removing a node should only remap ~K/N keys |
| FR-3 | Node Addition | P0 | Dynamically add nodes without full cluster restart |
| FR-4 | Node Removal | P0 | Handle both graceful shutdown and crash scenarios |
| FR-5 | Replication Support | P1 | Return N nodes for a key to support data replication |
| FR-6 | Heterogeneous Capacity | P1 | Support nodes with different capacities (weighted distribution) |
| FR-7 | Deterministic Results | P0 | Same key always maps to same node (given same topology) |

### Extended Requirements

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-8 | Load Balancing | P1 | Bounded maximum load per node |
| FR-9 | Zone Awareness | P2 | Consider availability zones when selecting replicas |
| FR-10 | Key Range Queries | P2 | List all keys owned by a specific node |
| FR-11 | Membership Events | P2 | Notify subscribers of topology changes |

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Requirement | Rationale |
|--------|-------------|-----------|
| **Lookup Latency** | < 1 microsecond | Lookup is on critical path for every request |
| **Lookup Complexity** | O(log N) worst case | Binary search on sorted positions |
| **Memory Overhead** | < 1 KB per node | Minimal footprint per physical node |
| **Initialization Time** | < 100ms for 1000 nodes | Fast cluster startup |
| **Node Add/Remove** | < 10ms ring update | Topology changes should be fast |

### Distribution Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Key Distribution Variance** | < 10% from ideal | Max load / (Total keys / N nodes) |
| **Standard Deviation** | < 5% with 150+ vnodes | Measured across nodes |
| **Hot Spot Probability** | < 1% | No node should have > 2x average load |

### Reliability Requirements

| Metric | Target | Description |
|--------|--------|-------------|
| **Consistency** | 100% | Same key always maps to same node |
| **Availability** | Matches underlying system | Ring lookup never fails |
| **Partition Tolerance** | Depends on membership | Can operate with stale membership view |

---

## Use Cases

### Primary Use Cases

#### 1. Distributed Cache Partitioning

```
┌─────────────────────────────────────────────────────────────┐
│  USE CASE: Distributed Cache (Memcached, Redis)             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Scenario:                                                   │
│  - 10 cache servers, 100M keys                              │
│  - Need to add 2 servers for capacity                        │
│                                                              │
│  Without Consistent Hashing:                                 │
│  - hash(key) % 10 → hash(key) % 12                          │
│  - ~83% cache miss rate after scaling (83M keys move)       │
│  - Database overwhelmed with cache rebuild                   │
│                                                              │
│  With Consistent Hashing:                                    │
│  - Only ~17% of keys (17M) need to move to new servers      │
│  - Remaining 83M keys still hit cache                        │
│  - Gradual warm-up of new servers                           │
│                                                              │
│  Real-world: Netflix EVCache, Facebook Memcached            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Database Sharding

```
┌─────────────────────────────────────────────────────────────┐
│  USE CASE: NoSQL Database Partitioning                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Scenario:                                                   │
│  - User data partitioned by user_id                         │
│  - 1 billion users across 100 database nodes                │
│                                                              │
│  Operation: Add 10 nodes for growth                         │
│                                                              │
│  Key Assignment:                                             │
│  node = ring.GetNode(hash(user_id))                         │
│                                                              │
│  With Consistent Hashing:                                    │
│  - Only ~10% of users (100M) migrate to new nodes           │
│  - Migration can be done incrementally                       │
│  - Old nodes remain responsible until migration complete     │
│                                                              │
│  Real-world: Cassandra, DynamoDB, Riak                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 3. Load Balancer Backend Selection

```
┌─────────────────────────────────────────────────────────────┐
│  USE CASE: Sticky Sessions / Affinity Routing                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Scenario:                                                   │
│  - HTTP load balancer with session affinity                 │
│  - Route requests from same user to same backend            │
│                                                              │
│  Operation:                                                  │
│  backend = ring.GetNode(hash(session_id))                   │
│                                                              │
│  Benefits:                                                   │
│  - User always hits same server (session stickiness)        │
│  - Backend failure only affects 1/N users                   │
│  - Adding backends doesn't disrupt most sessions            │
│                                                              │
│  Real-world: HAProxy, Nginx, Envoy                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 4. Content Delivery Network

```
┌─────────────────────────────────────────────────────────────┐
│  USE CASE: CDN Edge Cache Routing                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Scenario:                                                   │
│  - Video streaming service with 1M unique videos            │
│  - 50 edge servers per PoP (Point of Presence)              │
│                                                              │
│  Operation:                                                  │
│  edge_server = ring.GetNode(hash(video_id))                 │
│                                                              │
│  Benefits:                                                   │
│  - Same video always cached on same edge server             │
│  - Maximizes cache hit rate                                  │
│  - Server maintenance doesn't invalidate all caches         │
│                                                              │
│  Real-world: Akamai (original use case), Cloudflare         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Secondary Use Cases

| Use Case | Key | Node | Example |
|----------|-----|------|---------|
| Message Queue Routing | message_id / partition_key | Broker partition | Kafka consumer assignment |
| Distributed Lock | lock_key | Lock coordinator | Redlock implementation |
| Service Discovery | service_instance_id | Registry shard | Consul, Eureka |
| Object Storage | object_id | Storage node | MinIO, custom blob stores |
| Rate Limiting | client_id | Rate limit bucket | Distributed rate limiters |

---

## Capacity Estimations

### Memory Requirements

#### Ring Data Structure Size

```
Ring Memory = N × V × (PositionSize + PointerSize)

Where:
  N = Number of physical nodes
  V = Virtual nodes per physical node
  PositionSize = 4 bytes (32-bit) or 8 bytes (64-bit hash)
  PointerSize = 8 bytes (64-bit pointer to node)

Example (100 nodes, 200 vnodes each, 64-bit):
  Ring Memory = 100 × 200 × (8 + 8) = 320,000 bytes ≈ 313 KB
```

#### Memory by Scale

| Nodes | VNodes/Node | Total Positions | Memory (32-bit) | Memory (64-bit) |
|-------|-------------|-----------------|-----------------|-----------------|
| 10 | 150 | 1,500 | 18 KB | 24 KB |
| 100 | 150 | 15,000 | 180 KB | 240 KB |
| 1,000 | 150 | 150,000 | 1.8 MB | 2.4 MB |
| 10,000 | 150 | 1,500,000 | 18 MB | 24 MB |

### Lookup Performance

#### Binary Search Complexity

```
Lookup Time = O(log(N × V))

For 100 nodes × 200 vnodes = 20,000 positions:
  log₂(20,000) ≈ 15 comparisons

At 1 nanosecond per comparison:
  Lookup ≈ 15-20 nanoseconds (in L1 cache)
  Lookup ≈ 100-500 nanoseconds (with memory access)
```

#### Benchmark Reference

| Operation | Time (typical) | Notes |
|-----------|----------------|-------|
| GetNode(key) | 50-200 ns | Binary search, warm cache |
| AddNode | 1-10 ms | Resort array, O(n) if array-based |
| RemoveNode | 1-10 ms | Remove positions, compact |
| GetNNodes(key, 3) | 200-500 ns | Walk clockwise for replicas |

### Virtual Node Count Selection

| VNode Count | Distribution Quality | Memory | Recommended For |
|-------------|---------------------|--------|-----------------|
| 1-10 | Poor (50%+ variance) | Minimal | Never use |
| 50-100 | Fair (10-20% variance) | Low | Small clusters |
| **150-200** | Good (< 5% variance) | Moderate | **Most production systems** |
| 500+ | Excellent (< 2% variance) | Higher | Strict SLO requirements |

### Distribution Quality Formula

```
Standard Deviation = σ = √(Σ(load_i - avg)² / N)

With V virtual nodes per physical node:
  Expected σ ≈ avg_load / √V

Example (1M keys, 100 nodes, V=200):
  avg_load = 1M / 100 = 10,000 keys/node
  Expected σ ≈ 10,000 / √200 ≈ 707 keys
  Coefficient of Variation ≈ 7.07%
```

---

## SLOs / SLAs

### Lookup Service Level Objectives

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Latency p50** | < 100 ns | Histogram of GetNode calls |
| **Latency p99** | < 1 μs | Include cache miss scenarios |
| **Latency p99.9** | < 10 μs | Worst case with memory pressure |
| **Consistency** | 100% | Same input → same output |
| **Availability** | Matches host process | Library, no external dependencies |

### Distribution Quality SLOs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Max Load Ratio** | < 1.1x average | max(keys_per_node) / avg(keys_per_node) |
| **Min Load Ratio** | > 0.9x average | min(keys_per_node) / avg(keys_per_node) |
| **Standard Deviation** | < 10% of average | σ / μ |
| **Key Movement on Add** | < 2/N of total | Keys moved / total keys |
| **Key Movement on Remove** | = 1/N of total | Exactly keys from removed node |

### Rebalancing SLOs

| Event | Target Duration | Key Movement |
|-------|-----------------|--------------|
| Add 1 node | < 1 second ring update | ~1/N keys migrate (background) |
| Remove 1 node (planned) | < 1 second ring update | 1/N keys migrate |
| Node crash | < 5 seconds detection | Handled by replication |
| Add 10% more nodes | < 5 seconds ring update | ~10% keys migrate |

---

## Constraints & Assumptions

### Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| Determinism | Hash function must be deterministic | No random seeds per instance |
| Hash Quality | Hash function must have uniform distribution | MD5, xxHash, MurmurHash |
| Network | All clients must have same view of ring | Membership protocol needed |
| Ordering | Must agree on clockwise direction | Convention, not configurable |

### Assumptions

| Assumption | Rationale |
|------------|-----------|
| Key distribution is roughly uniform | Application keys are not clustered |
| Hash function has no collisions at scale | 2^32 space is large enough |
| Node IDs are unique | Each physical node has unique identifier |
| Membership updates are infrequent | Topology changes are not per-request |
| Clients can hold ring in memory | Ring size is bounded |

---

## Out of Scope

The following are explicitly NOT part of consistent hashing algorithm:

| Concern | Responsibility |
|---------|---------------|
| Data Migration | Handled by higher-level system (database, cache) |
| Replication Protocol | Consistent hashing identifies nodes, not how to replicate |
| Failure Detection | Membership protocol (gossip, heartbeat) |
| Consensus | Separate concern (Raft, Paxos) |
| Network Communication | Transport layer concern |
| Data Storage | Application/database concern |
| Access Control | Security layer concern |

---

## Requirements Traceability

| Requirement | Addressed In | Implementation |
|-------------|--------------|----------------|
| FR-1: Key Mapping | 03-low-level-design | GetNode algorithm |
| FR-2: Minimal Disruption | 02-high-level-design | Ring property proof |
| FR-3: Node Addition | 05-scalability | AddNode algorithm |
| FR-4: Node Removal | 05-scalability | RemoveNode algorithm |
| FR-5: Replication | 03-low-level-design | GetNNodes algorithm |
| FR-6: Heterogeneous | 02-high-level-design | Weighted virtual nodes |
| FR-7: Determinism | 03-low-level-design | Hash function selection |
| FR-8: Load Balancing | 04-deep-dive | Bounded loads extension |
