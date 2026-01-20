# Requirements and Capacity Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features (In Scope)

| Feature | Description | Priority |
|---------|-------------|----------|
| **GET** | Retrieve cached value by key | P0 |
| **SET/PUT** | Store key-value pair with optional TTL | P0 |
| **DELETE** | Invalidate/remove cached key | P0 |
| **Multi-GET** | Batch retrieval of multiple keys in single request | P1 |
| **TTL Support** | Automatic expiration after configurable duration | P1 |
| **Touch/Refresh TTL** | Extend TTL without modifying value | P1 |
| **Compare-and-Swap (CAS)** | Atomic conditional update | P1 |
| **Cache Statistics** | Hit rate, eviction count, memory usage | P1 |
| **Namespace Support** | Logical isolation of cache spaces | P2 |
| **Increment/Decrement** | Atomic counter operations | P2 |

### Feature Details

**GET Operation:**
- Return value if key exists and not expired
- Return NOT_FOUND if key doesn't exist or expired
- Update access time for LRU tracking
- Support optional CAS token retrieval

**SET Operation:**
- Store key-value pair in cache
- Optional TTL (default: no expiration or system default)
- Optional flags (compression hints, serialization format)
- Evict LRU entries if memory limit reached

**Multi-GET Operation:**
- Accept batch of keys (typically up to 100)
- Return partial results (some keys may be missing)
- Optimize network round-trips

### Out of Scope

| Feature | Reason |
|---------|--------|
| Persistence/durability | Cache is ephemeral by design |
| Complex queries | Key-value only, no secondary indexes |
| Transactions across keys | Would compromise performance |
| Automatic cache population | Application responsibility (cache-aside) |
| Range queries | Not supported in hash-based systems |
| Data compression | Application-level concern |
| Pub/Sub messaging | Separate concern (use message queue) |

---

## Non-Functional Requirements

### CAP Theorem Choice: AP (Availability + Partition Tolerance)

**Justification:**
- Cache must remain available during partitions
- Stale data is acceptable (bounded by TTL)
- Source of truth exists elsewhere (database)
- Performance more critical than consistency

```
┌─────────────────────────────────────────────────────────────┐
│                    CAP THEOREM POSITION                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                      Consistency (C)                         │
│                           /\                                 │
│                          /  \                                │
│                         /    \                               │
│                        /      \                              │
│                       /   CA   \                             │
│                      /          \                            │
│                     /            \                           │
│                    /      ★       \    ← Distributed Cache   │
│                   /     (AP)       \     chooses AP          │
│                  /                  \                        │
│                 /____________________\                       │
│         Availability (A)          Partition Tolerance (P)   │
│                                                              │
│  During partition: Serve potentially stale cached data       │
│  Rationale: Better stale than unavailable                    │
└─────────────────────────────────────────────────────────────┘
```

### Consistency Model

| Scenario | Consistency Level | Approach |
|----------|------------------|----------|
| Cache reads | Eventual | May return stale data within TTL window |
| Cache writes | Best effort | Async replication to followers |
| Cross-region | Eventual | TTL + optional invalidation broadcast |
| Same-region replicas | Eventual (milliseconds) | Async replication |

**Read-Your-Writes:** Not guaranteed by default. If critical, application can:
- Write-through to ensure cache updated
- Add short delay after write before read
- Use sticky sessions to same cache node

### Availability Target

| Tier | Target | Monthly Downtime | Use Case |
|------|--------|------------------|----------|
| Standard | 99.9% | 43.8 minutes | Non-critical caching |
| **High (Recommended)** | **99.99%** | **4.38 minutes** | **Production workloads** |
| Critical | 99.999% | 26 seconds | Zero-tolerance systems |

**Availability Calculation:**
```
Availability = MTBF / (MTBF + MTTR)

Where:
  MTBF = Mean Time Between Failures
  MTTR = Mean Time To Recovery

For 99.99%:
  With MTTR = 30 seconds (failover time)
  MTBF must be > 83 hours between failures per node
```

### Latency Requirements

| Operation | p50 Target | p95 Target | p99 Target | p99.9 Target |
|-----------|------------|------------|------------|--------------|
| GET (cache hit) | < 0.3ms | < 0.5ms | < 1ms | < 2ms |
| GET (cache miss) | < 0.5ms | < 1ms | < 2ms | < 5ms |
| SET | < 0.5ms | < 1ms | < 2ms | < 5ms |
| DELETE | < 0.5ms | < 1ms | < 2ms | < 5ms |
| Multi-GET (10 keys) | < 0.5ms | < 1ms | < 2ms | < 5ms |
| Multi-GET (100 keys) | < 2ms | < 5ms | < 10ms | < 20ms |

**Latency Budget Breakdown (GET):**
```
┌─────────────────────────────────────────────────────────────┐
│              LATENCY BUDGET: GET (p99 = 1ms)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Client serialization:      0.05ms  ██                       │
│  Network (client → cache):  0.20ms  ████████                 │
│  Request parsing:           0.02ms  █                        │
│  Hash lookup:               0.01ms  ▌                        │
│  Memory access:             0.02ms  █                        │
│  Response serialization:    0.05ms  ██                       │
│  Network (cache → client):  0.20ms  ████████                 │
│  Client deserialization:    0.05ms  ██                       │
│                            ──────                            │
│  Total:                     0.60ms  (buffer: 0.40ms)         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Throughput Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| GET QPS per node | 50,000 - 100,000 | Depends on value size |
| SET QPS per node | 20,000 - 50,000 | Lower due to replication |
| Cluster total QPS | 1,000,000+ | Scales horizontally |
| Concurrent connections per node | 10,000+ | Connection pooling |

### Durability

**Durability is explicitly NOT a requirement.**

| Aspect | Guarantee |
|--------|-----------|
| Data persistence | None - memory only |
| Survival of restart | None - cold start |
| Replication purpose | Availability, not durability |
| Data recovery | From source of truth (database) |

---

## Capacity Estimation

### Scenario: E-commerce Product Catalog Cache

**Business Context:**
- Large e-commerce platform
- Product catalog with 10 million items
- Peak traffic during sales events
- Global user base

### Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Total products | 10 million | Large catalog |
| Average value size | 2 KB | Product JSON (name, price, images, specs) |
| Average key size | 50 bytes | `product:12345:details` pattern |
| Metadata overhead | 100 bytes | TTL, timestamps, flags, LRU pointers |
| Hot items (actively cached) | 20% | Pareto: 20% products = 80% traffic |
| Read:Write ratio | 100:1 | Catalog updates rare |
| Peak read QPS | 1,000,000 | Prime-time shopping |
| Cache hit target | 95%+ | High hit rate essential |
| Replication factor | 2 | Availability requirement |

### Storage Calculations

```
┌─────────────────────────────────────────────────────────────┐
│                   STORAGE CALCULATIONS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. RAW DATA SIZE                                            │
│  ─────────────────                                           │
│  Hot items: 10M × 20% = 2,000,000 items                      │
│                                                              │
│  Per item:                                                   │
│    Key:      50 bytes                                        │
│    Value:    2,048 bytes (2 KB)                              │
│    Metadata: 100 bytes                                       │
│    Total:    2,198 bytes ≈ 2.2 KB                            │
│                                                              │
│  Raw storage: 2M × 2.2 KB = 4.4 GB                           │
│                                                              │
│  2. MEMORY OVERHEAD                                          │
│  ──────────────────                                          │
│  Hash table overhead: ~1.5x (load factor, pointers)          │
│  Slab allocator waste: ~10-15%                               │
│  Total overhead factor: 1.7x                                 │
│                                                              │
│  Effective storage: 4.4 GB × 1.7 = 7.5 GB per replica        │
│                                                              │
│  3. WITH REPLICATION                                         │
│  ────────────────────                                        │
│  Replication factor: 2                                       │
│  Total logical storage: 7.5 GB × 2 = 15 GB                   │
│                                                              │
│  4. GROWTH PLANNING (1TB CLUSTER)                            │
│  ─────────────────────────────────                           │
│  Target capacity: 1 TB (allowing for growth)                 │
│  Usable at 80%: 800 GB                                       │
│  Items at full capacity: 800 GB / 2.2 KB ≈ 360M items        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Traffic Calculations

```
┌─────────────────────────────────────────────────────────────┐
│                   TRAFFIC CALCULATIONS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. READ TRAFFIC                                             │
│  ────────────────                                            │
│  Peak QPS: 1,000,000 reads/sec                               │
│  At 95% hit rate: 950,000 cache hits/sec                     │
│  Cache misses: 50,000/sec → database                         │
│                                                              │
│  2. WRITE TRAFFIC                                            │
│  ─────────────────                                           │
│  Read:Write ratio: 100:1                                     │
│  Write QPS: 1,000,000 / 100 = 10,000 writes/sec              │
│                                                              │
│  3. NODE SIZING                                              │
│  ──────────────────                                          │
│  Capacity per node: 50,000 QPS (conservative)                │
│  Nodes for reads: 950,000 / 50,000 = 19 nodes                │
│                                                              │
│  4. WITH HEADROOM                                            │
│  ─────────────────                                           │
│  Headroom factor: 1.5x (50% buffer for spikes)               │
│  Minimum nodes: 19 × 1.5 = 29 nodes                          │
│  Round up: 30 nodes                                          │
│                                                              │
│  5. ZONE DISTRIBUTION                                        │
│  ──────────────────                                          │
│  Availability zones: 3                                       │
│  Nodes per zone: 10                                          │
│  Total nodes: 30                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Bandwidth Calculations

```
┌─────────────────────────────────────────────────────────────┐
│                  BANDWIDTH CALCULATIONS                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. READ BANDWIDTH                                           │
│  ─────────────────                                           │
│  Cache hits: 950,000/sec                                     │
│  Response size: 2 KB (value) + 100 bytes (overhead)          │
│  Read bandwidth: 950,000 × 2.1 KB = 2.0 GB/sec               │
│                                                              │
│  2. WRITE BANDWIDTH                                          │
│  ──────────────────                                          │
│  Writes: 10,000/sec                                          │
│  Request size: 2 KB (value) + 50 bytes (key) + overhead      │
│  Write bandwidth: 10,000 × 2.2 KB = 22 MB/sec                │
│                                                              │
│  3. REPLICATION BANDWIDTH                                    │
│  ─────────────────────────                                   │
│  Replication factor: 2 (1 additional copy)                   │
│  Replication traffic: 22 MB/sec × 1 = 22 MB/sec              │
│                                                              │
│  4. PER-NODE BANDWIDTH                                       │
│  ──────────────────────                                      │
│  Total cluster: 2.0 GB/sec + 44 MB/sec ≈ 2.05 GB/sec         │
│  Per node (30 nodes): 68 MB/sec average                      │
│  Peak per node: 68 × 2 = 136 MB/sec                          │
│                                                              │
│  5. NETWORK REQUIREMENT                                      │
│  ──────────────────────                                      │
│  Minimum NIC: 1 Gbps (125 MB/sec)                            │
│  Recommended: 10 Gbps for headroom                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Infrastructure Sizing Summary

| Component | Specification | Count | Notes |
|-----------|--------------|-------|-------|
| Cache nodes | 32 GB RAM, 8 cores, 10Gbps NIC | 30 | 10 per AZ |
| Memory per node | 24 GB allocated to cache | - | 75% of RAM |
| Total cache memory | 720 GB | - | Room for growth |
| Load balancers | L4, 10Gbps | 2 | Active-passive |

### Capacity Estimation Table

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| DAU | 10 million | Business requirement |
| MAU | 50 million | DAU × 5 (typical ratio) |
| Read:Write Ratio | 100:1 | Catalog read-heavy |
| QPS (average) | 200,000 | Off-peak |
| QPS (peak) | 1,000,000 | 5× average |
| Storage (current) | 15 GB | 2M items × 2.2 KB × 2 RF |
| Storage (capacity) | 1 TB | Growth planning |
| Bandwidth (peak) | 2 GB/sec | Cluster aggregate |
| Cache nodes | 30 | 10 per AZ × 3 AZs |

---

## SLOs and SLAs

### Service Level Objectives (SLOs)

| Metric | Target | Measurement Window | Rationale |
|--------|--------|-------------------|-----------|
| Availability | 99.99% | Monthly | 4.38 min downtime/month |
| Cache hit rate | > 95% | 5-minute rolling | Indicates cache effectiveness |
| GET latency (p99) | < 1ms | 1-minute rolling | User experience |
| SET latency (p99) | < 2ms | 1-minute rolling | Acceptable for writes |
| Error rate | < 0.01% | 5-minute rolling | Connection/timeout errors |
| Eviction rate | < 1% of capacity/hour | Hourly | Memory pressure indicator |

### Service Level Agreements (SLAs)

| Tier | Availability | Latency (p99) | Credits |
|------|-------------|---------------|---------|
| Standard | 99.9% | < 5ms | 10% for breach |
| Premium | 99.99% | < 2ms | 25% for breach |
| Enterprise | 99.99% | < 1ms | Custom terms |

### Error Budget

```
┌─────────────────────────────────────────────────────────────┐
│                      ERROR BUDGET                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Monthly error budget at 99.99% availability:                │
│                                                              │
│  Total minutes/month: 30 × 24 × 60 = 43,200 minutes          │
│  Allowed downtime: 43,200 × 0.0001 = 4.32 minutes            │
│                                                              │
│  Budget allocation:                                          │
│  ├── Planned maintenance:     1.0 min (23%)                  │
│  ├── Deployments:             1.0 min (23%)                  │
│  ├── Incident response:       1.5 min (35%)                  │
│  └── Buffer:                  0.82 min (19%)                 │
│                                                              │
│  Incident severity thresholds:                               │
│  ├── P1 (total outage):       Auto-page, all hands           │
│  ├── P2 (degraded):           Page on-call                   │
│  └── P3 (minor):              Ticket, next business day      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Success Criteria

| Criteria | Measurement | Target |
|----------|-------------|--------|
| Cache effectiveness | (DB QPS without cache - DB QPS with cache) / DB QPS without cache | > 90% reduction |
| Latency improvement | p99 latency with cache vs without | > 10× faster |
| Cost efficiency | $/million requests | < $0.05 |
| Operational burden | Pages per week | < 1 |

---

## Scaling Triggers

| Metric | Warning Threshold | Action Threshold | Response |
|--------|-------------------|------------------|----------|
| Memory usage | > 70% | > 85% | Add nodes |
| CPU usage | > 60% | > 80% | Add nodes |
| QPS per node | > 40K | > 50K | Add nodes |
| Hit rate | < 92% | < 90% | Increase capacity or TTL |
| Eviction rate | > 100/sec | > 1000/sec | Add memory/nodes |
| Connection count | > 8K | > 9K | Add nodes or connection pooling |
