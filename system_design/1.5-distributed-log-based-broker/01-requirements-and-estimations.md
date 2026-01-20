# Requirements and Capacity Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features (In Scope)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Publish** | Produce messages to topics with optional key | P0 |
| **Subscribe** | Consume messages from topics via consumer groups | P0 |
| **Partitioning** | Distribute topic data across partitions by key | P0 |
| **Consumer Groups** | Parallel consumption with partition assignment | P0 |
| **Offset Management** | Track consumer position, enable replay | P0 |
| **Replication** | Replicate partitions across brokers for durability | P0 |
| **Retention** | Time-based and size-based message retention | P1 |
| **Log Compaction** | Key-based retention (keep latest per key) | P1 |
| **Transactions** | Atomic writes across partitions | P1 |
| **Exactly-Once** | Idempotent producers, transactional consumers | P1 |
| **Schema Registry** | Schema validation and evolution | P2 |

### Feature Details

**Publish Operation:**
- Append message to partition (key-based or round-robin)
- Support batching for throughput optimization
- Configurable durability (acks=0, 1, all)
- Idempotent writes to prevent duplicates on retry
- Optional compression (gzip, snappy, lz4, zstd)

**Subscribe Operation:**
- Join consumer group, receive partition assignment
- Poll for messages in batches
- Commit offsets (auto or manual)
- Support seek to specific offset or timestamp
- Handle rebalancing gracefully

**Log Compaction:**
- For changelog/snapshot topics
- Retain only latest value per key
- Delete tombstones (null value) after grace period
- Run as background process

### Out of Scope

| Feature | Reason |
|---------|--------|
| Message priorities | Log-based systems are FIFO by design |
| Complex routing | Use message queue for content-based routing |
| Request-response | Use RPC framework or separate reply topics |
| Message TTL per-message | Use topic-level retention instead |
| Fan-out to individual consumers | Each consumer group gets all messages |
| Delayed/scheduled delivery | Use separate scheduling service |

---

## Non-Functional Requirements

### CAP Theorem Choice: CP for Writes, AP for Reads

**Justification:**
- Writes require leader acknowledgment (consistency)
- Reads can serve from followers (availability + partition tolerance)
- During partition, writes may be unavailable (prefer consistency over lost data)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAP THEOREM POSITION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                      Consistency (C)                             │
│                           /\                                     │
│                          /  \                                    │
│                         /    \                                   │
│                        /  ★   \    ← Writes (acks=all)          │
│                       /  (CP)  \                                 │
│                      /          \                                │
│                     /            \                               │
│                    /      ○       \   ← Reads (AP)               │
│                   /     (AP)       \                             │
│                  /                  \                            │
│                 /____________________\                           │
│         Availability (A)          Partition Tolerance (P)        │
│                                                                  │
│  Write path: CP (require ISR acknowledgment)                    │
│  Read path: AP (can read from any ISR member)                   │
└─────────────────────────────────────────────────────────────────┘
```

### Ordering Guarantees

| Scope | Guarantee | Implementation |
|-------|-----------|----------------|
| Within partition | Total order | Single leader, sequential offsets |
| Across partitions | No ordering | Independent logs |
| Same key | Ordered (same partition) | Key-based partitioning |
| Transactions | Atomic visibility | Transaction markers |

**Critical Note:** Global ordering requires single partition (limits throughput).

### Durability Levels

| Level | Configuration | Durability | Latency | Use Case |
|-------|--------------|------------|---------|----------|
| Fire-and-forget | `acks=0` | May lose | Lowest | Metrics, logs |
| Leader ACK | `acks=1` | Leader crash = loss | Low | Most use cases |
| **Full ISR ACK** | `acks=all` | No loss (ISR healthy) | Higher | **Recommended** |

**Recommendation:** `acks=all` with `min.insync.replicas=2` for production workloads.

### Availability Target

| Tier | Target | Monthly Downtime | Use Case |
|------|--------|------------------|----------|
| Standard | 99.9% | 43.8 minutes | Non-critical pipelines |
| **High (Recommended)** | **99.99%** | **4.38 minutes** | **Production workloads** |
| Critical | 99.999% | 26 seconds | Financial, core infrastructure |

**Availability Calculation:**
```
Cluster availability with N brokers and RF=3:
- Single broker failure: 100% available (replicas on other brokers)
- Two broker failures: Available if ISR >= min.insync.replicas
- Availability ≈ 1 - P(RF simultaneous failures)

For 3 brokers with 99.9% individual availability:
- P(all 3 fail) = (0.001)^3 = 10^-9
- Cluster availability ≈ 99.9999999% (theoretical)
- Practical: 99.99% accounting for correlated failures
```

### Latency Requirements

| Operation | p50 Target | p95 Target | p99 Target | p99.9 Target |
|-----------|------------|------------|------------|--------------|
| Produce (acks=1) | < 2ms | < 5ms | < 10ms | < 50ms |
| Produce (acks=all) | < 5ms | < 10ms | < 20ms | < 100ms |
| Consume (cached) | < 1ms | < 2ms | < 5ms | < 10ms |
| Consume (disk) | < 5ms | < 20ms | < 50ms | < 200ms |
| Commit offset | < 5ms | < 10ms | < 20ms | < 50ms |

**Latency Budget Breakdown (Produce with acks=all):**

```
┌─────────────────────────────────────────────────────────────────┐
│              LATENCY BUDGET: PRODUCE (acks=all, p99 = 20ms)     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client serialization:      0.5ms  ██                           │
│  Network (client → leader): 1.0ms  ████                         │
│  Leader write to page cache: 0.5ms  ██                          │
│  Replication to followers:  5.0ms  ████████████████████         │
│  Follower write + ACK:      3.0ms  ████████████                 │
│  Network (leader → client): 1.0ms  ████                         │
│  Client callback:           0.5ms  ██                           │
│                            ──────                                │
│  Total:                    11.5ms  (buffer: 8.5ms for variance) │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Throughput Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| Produce throughput per broker | 50-100 MB/s | Network and disk bound |
| Consume throughput per broker | 100-200 MB/s | Page cache hits |
| Messages per second per partition | 10,000-50,000 | Depends on message size |
| Cluster total throughput | 1+ GB/s | Scales with brokers |
| Concurrent producers | 10,000+ | Connection pooling |
| Consumer groups per cluster | 1,000+ | Metadata overhead |

---

## Capacity Estimation

### Scenario: E-commerce Event Pipeline

**Business Context:**
- Large e-commerce platform
- Event-driven architecture
- Real-time analytics and ML pipelines
- Order processing, inventory updates, user activity

### Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Daily active users | 10 million | Large platform |
| Events per user per day | 50 | Page views, clicks, orders |
| Peak:average ratio | 5:1 | Flash sales, peak hours |
| Average message size | 500 bytes | JSON event payload |
| Message overhead | 100 bytes | Headers, timestamps, keys |
| Replication factor | 3 | Standard durability |
| Retention period | 7 days | Replay window |
| Compression ratio | 3:1 | JSON compresses well |

### Traffic Calculations

```
┌─────────────────────────────────────────────────────────────────┐
│                   TRAFFIC CALCULATIONS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. DAILY MESSAGE VOLUME                                        │
│  ───────────────────────                                        │
│  Messages/day: 10M users × 50 events = 500 million messages     │
│                                                                  │
│  2. AVERAGE THROUGHPUT                                          │
│  ─────────────────────                                          │
│  Messages/second: 500M / 86,400 = 5,787 msg/sec                 │
│  Data rate: 5,787 × 600 bytes = 3.5 MB/sec                      │
│                                                                  │
│  3. PEAK THROUGHPUT                                             │
│  ──────────────────                                             │
│  Peak messages/sec: 5,787 × 5 = 28,935 msg/sec ≈ 30K msg/sec   │
│  Peak data rate: 30K × 600 bytes = 18 MB/sec                    │
│                                                                  │
│  4. WITH REPLICATION                                            │
│  ───────────────────                                            │
│  Replication factor: 3                                          │
│  Total write load: 18 MB/sec × 3 = 54 MB/sec                    │
│                                                                  │
│  5. PARTITION SIZING                                            │
│  ────────────────────                                           │
│  Target per partition: 10K msg/sec (safe limit)                 │
│  Partitions needed: 30K / 10K = 3 partitions minimum            │
│  With headroom (3x): 9 partitions                               │
│  Round to nice number: 12 partitions                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Storage Calculations

```
┌─────────────────────────────────────────────────────────────────┐
│                   STORAGE CALCULATIONS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. RAW DATA PER DAY                                            │
│  ───────────────────                                            │
│  Daily messages: 500 million                                    │
│  Size per message: 600 bytes (payload + overhead)               │
│  Raw daily data: 500M × 600 bytes = 300 GB/day                  │
│                                                                  │
│  2. WITH COMPRESSION                                            │
│  ──────────────────                                             │
│  Compression ratio: 3:1 (JSON compresses well)                  │
│  Compressed daily: 300 GB / 3 = 100 GB/day                      │
│                                                                  │
│  3. WITH REPLICATION                                            │
│  ───────────────────                                            │
│  Replication factor: 3                                          │
│  Total storage per day: 100 GB × 3 = 300 GB/day                 │
│                                                                  │
│  4. RETENTION WINDOW                                            │
│  ───────────────────                                            │
│  Retention: 7 days                                              │
│  Total storage needed: 300 GB × 7 = 2.1 TB                      │
│                                                                  │
│  5. WITH HEADROOM                                               │
│  ─────────────────                                              │
│  Growth buffer: 50%                                             │
│  Index overhead: 10%                                            │
│  Total with overhead: 2.1 TB × 1.6 = 3.4 TB                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Broker Sizing

```
┌─────────────────────────────────────────────────────────────────┐
│                     BROKER SIZING                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. THROUGHPUT-BASED SIZING                                     │
│  ──────────────────────────                                     │
│  Peak write load: 54 MB/sec (with replication)                  │
│  Per-broker capacity: 50 MB/sec (conservative)                  │
│  Brokers for throughput: 54 / 50 = 2 brokers                    │
│                                                                  │
│  2. STORAGE-BASED SIZING                                        │
│  ───────────────────────                                        │
│  Total storage: 3.4 TB                                          │
│  Per-broker storage: 1-2 TB (typical)                           │
│  Brokers for storage: 3.4 / 1.5 = 3 brokers                     │
│                                                                  │
│  3. REPLICATION REQUIREMENT                                     │
│  ──────────────────────────                                     │
│  Replication factor: 3                                          │
│  Minimum brokers: 3 (one replica per broker)                    │
│                                                                  │
│  4. HIGH AVAILABILITY                                           │
│  ─────────────────────                                          │
│  Survive 1 broker failure: N+1 capacity                         │
│  Recommended: 4-5 brokers                                       │
│                                                                  │
│  5. FINAL RECOMMENDATION                                        │
│  ───────────────────────                                        │
│  Brokers: 5 (for HA and growth)                                 │
│  Per-broker: 8 cores, 32 GB RAM, 2 TB NVMe SSD                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Infrastructure Sizing Summary

| Component | Specification | Count | Notes |
|-----------|--------------|-------|-------|
| Brokers | 8 cores, 32 GB RAM, 2 TB NVMe | 5 | 3 AZs (2+2+1) |
| Controller quorum (KRaft) | 4 cores, 16 GB RAM, 100 GB SSD | 3 | Dedicated or co-located |
| Network | 10 Gbps | - | Replication traffic |
| Load balancer | L4, TCP passthrough | 2 | Active-passive |

### Capacity Estimation Table

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| DAU | 10 million | Business requirement |
| Events per day | 500 million | 10M × 50 events |
| Messages per second (avg) | 5,787 | 500M / 86,400 |
| Messages per second (peak) | 30,000 | 5× average |
| Data rate (peak) | 18 MB/sec | 30K × 600 bytes |
| Storage (7 days, compressed, RF=3) | 3.4 TB | 300 GB × 7 × 1.6 |
| Partitions (main topic) | 12 | Peak QPS / 10K + headroom |
| Brokers | 5 | HA + growth |

---

## SLOs and SLAs

### Service Level Objectives (SLOs)

| Metric | Target | Measurement Window | Rationale |
|--------|--------|-------------------|-----------|
| Availability | 99.99% | Monthly | 4.38 min downtime/month |
| Produce latency (p99) | < 20ms | 1-minute rolling | acks=all |
| Consume latency (p99) | < 10ms | 1-minute rolling | Page cache hits |
| Consumer lag | < 10,000 messages | 5-minute rolling | Near real-time |
| Under-replicated partitions | 0 | Continuous | Data durability |
| Message loss rate | 0 | Continuous | Zero data loss |

### Service Level Agreements (SLAs)

| Tier | Availability | Latency (p99 produce) | Credits |
|------|-------------|----------------------|---------|
| Standard | 99.9% | < 50ms | 10% for breach |
| Premium | 99.99% | < 20ms | 25% for breach |
| Enterprise | 99.99% | < 10ms | Custom terms |

### Error Budget

```
┌─────────────────────────────────────────────────────────────────┐
│                      ERROR BUDGET                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Monthly error budget at 99.99% availability:                    │
│                                                                  │
│  Total minutes/month: 30 × 24 × 60 = 43,200 minutes             │
│  Allowed downtime: 43,200 × 0.0001 = 4.32 minutes               │
│                                                                  │
│  Budget allocation:                                              │
│  ├── Planned maintenance:     1.0 min (23%)                     │
│  │   └── Rolling broker restarts (zero downtime)                │
│  ├── Deployments:             1.0 min (23%)                     │
│  │   └── Partition leadership transfers                         │
│  ├── Incident response:       1.5 min (35%)                     │
│  │   └── Broker failures, network issues                        │
│  └── Buffer:                  0.82 min (19%)                    │
│                                                                  │
│  Incident severity thresholds:                                   │
│  ├── P1 (total outage):       ISR < min.insync.replicas         │
│  ├── P2 (degraded):           Consumer lag > 100K               │
│  └── P3 (minor):              Single broker down, no impact     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Success Criteria

| Criteria | Measurement | Target |
|----------|-------------|--------|
| End-to-end latency | Producer timestamp to consumer processing | < 100ms (p99) |
| Consumer lag | Max offset - committed offset | < 10,000 messages |
| Throughput headroom | Peak capacity / actual usage | > 2x |
| Data durability | Messages lost / total messages | 0 |
| Replication health | Under-replicated partitions | 0 |

---

## Scaling Triggers

| Metric | Warning Threshold | Action Threshold | Response |
|--------|-------------------|------------------|----------|
| Broker CPU | > 60% | > 80% | Add brokers, rebalance partitions |
| Broker disk usage | > 70% | > 85% | Add storage or reduce retention |
| Broker network | > 70% NIC capacity | > 85% | Add brokers |
| Partition throughput | > 8K msg/sec | > 10K msg/sec | Add partitions |
| Consumer lag | > 10K messages | > 100K messages | Add consumers or partitions |
| Producer queue time | > 50ms | > 100ms | Add partitions or brokers |
| Replication lag | > 1000 messages | > 10000 messages | Investigate network/disk |

---

## Partition Count Guidelines

```
┌─────────────────────────────────────────────────────────────────┐
│                 PARTITION COUNT GUIDELINES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Factors to consider:                                            │
│                                                                  │
│  1. PARALLELISM                                                  │
│     • Max consumers in group = partition count                   │
│     • If you need 10 consumers, need >= 10 partitions           │
│                                                                  │
│  2. THROUGHPUT                                                   │
│     • Single partition: ~10K msg/sec or ~10 MB/sec              │
│     • Need 100K msg/sec? At least 10 partitions                 │
│                                                                  │
│  3. ORDERING                                                     │
│     • Each partition = one ordered stream                        │
│     • More partitions = less ordering (within key still OK)     │
│                                                                  │
│  4. OVERHEAD                                                     │
│     • Each partition = memory, file handles, CPU                │
│     • 1000s of partitions per broker is fine                    │
│     • 100K+ partitions per cluster = problems                   │
│                                                                  │
│  5. LEADER ELECTION                                              │
│     • More partitions = longer broker failover                  │
│     • 1000 partitions × 5ms each = 5 seconds                    │
│                                                                  │
│  Formula:                                                        │
│  partitions = max(                                               │
│      desired_throughput / per_partition_throughput,              │
│      max_consumer_parallelism                                    │
│  ) × growth_factor                                               │
│                                                                  │
│  Example:                                                        │
│  • Need 50K msg/sec, 10K per partition = 5 partitions           │
│  • Need 8 consumers = 8 partitions                               │
│  • Max of above = 8                                              │
│  • With 2x growth factor = 16 partitions                         │
│                                                                  │
│  ⚠️  Cannot reduce partition count after creation!               │
│      Start with moderate count, can always add more.             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
