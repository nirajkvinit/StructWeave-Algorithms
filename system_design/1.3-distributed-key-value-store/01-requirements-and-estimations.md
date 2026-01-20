# Requirements & Capacity Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features (In Scope)

| Feature | Description | Priority |
|---------|-------------|----------|
| **GET** | Retrieve value by key with configurable consistency | P0 |
| **PUT** | Store key-value pair with optional TTL | P0 |
| **DELETE** | Remove key (creates tombstone) | P0 |
| **Batch GET** | Retrieve multiple keys in single request | P1 |
| **Batch PUT** | Store multiple key-value pairs atomically | P1 |
| **TTL Support** | Automatic expiration of keys | P1 |
| **Compare-and-Swap (CAS)** | Conditional update based on version | P1 |
| **Key Listing** | List keys with prefix (if range-partitioned) | P2 |
| **Watch/Subscribe** | Notify on key changes (like etcd) | P2 |

### Out of Scope

- Complex queries (joins, aggregations, full-text search)
- Multi-key transactions (ACID across different partitions)
- SQL-like query language
- Automatic secondary indexes
- Large value support (> 1MB per value)
- Built-in data compression at application level

---

## Non-Functional Requirements

### CAP Theorem Choice

```
                    Consistency
                        /\
                       /  \
                      /    \
                     /  CA  \
                    /________\
                   /\        /\
                  /  \  CP  /  \
                 / AP \    /    \
                /______\  /______\
           Availability  Partition Tolerance
```

**Primary Choice: AP (Availability + Partition Tolerance)**
- Prioritize availability during network partitions
- Accept eventual consistency as default
- Offer tunable consistency per request

**Justification:**
- User-facing applications need continuous availability
- Brief inconsistency is acceptable (e.g., user preferences)
- Can achieve strong consistency when needed via R+W>N

### Consistency Models Supported

| Model | Description | Use Case | R, W Config |
|-------|-------------|----------|-------------|
| **Strong** | Linearizable reads | Critical data | R=ALL, W=ALL |
| **Eventual** | Reads may return stale data | High throughput | R=1, W=1 |
| **Quorum** | Majority agreement | Balanced | R=2, W=2 (N=3) |
| **Read-Your-Writes** | Session sees own writes | User sessions | Sticky routing |
| **Causal** | Preserves causality | Collaborative apps | Vector clocks |

### Latency Requirements

| Operation | p50 Target | p99 Target | p99.9 Target |
|-----------|------------|------------|--------------|
| GET (local DC) | < 1ms | < 5ms | < 10ms |
| GET (cross DC) | < 20ms | < 50ms | < 100ms |
| PUT (quorum) | < 5ms | < 15ms | < 30ms |
| PUT (strong) | < 10ms | < 30ms | < 50ms |
| DELETE | < 5ms | < 15ms | < 30ms |
| Batch GET (10 keys) | < 5ms | < 20ms | < 50ms |

### Availability & Durability

| Metric | Target | Justification |
|--------|--------|---------------|
| Availability | 99.99% (52 min/year downtime) | User-facing service |
| Durability | 99.999999999% (11 nines) | No data loss |
| Single node failure | No data loss, no downtime | RF=3 replication |
| Datacenter failure | < 1 minute RTO | Multi-DC deployment |

---

## Capacity Estimations

### Scenario: Netflix-Scale User Preferences Store

**Business Context:**
- Store user preferences: language, playback settings, profile data, recommendation metadata
- Need low-latency reads for personalization
- Eventually consistent is acceptable

### Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Monthly Active Users (MAU) | 250 million | Global streaming service |
| Daily Active Users (DAU) | 100 million (40% of MAU) | Typical engagement |
| Keys per user | 50 | Language, region, 40 preference settings, profile pointers |
| Average key size | 50 bytes | `user:12345:pref:playback_quality` |
| Average value size | 500 bytes | JSON/protobuf preference data |
| Metadata overhead | 50 bytes | Timestamp, version, checksum |
| Read:Write ratio | 95:5 | Read-heavy (preferences rarely change) |
| Sessions per user per day | 1.5 | Average viewing sessions |
| Reads per session | 30 | Initial load + navigation |
| Writes per session | 2 | Occasional preference changes |
| Replication factor | 3 | Standard for durability |
| Peak traffic multiplier | 5x | Prime time (8-11 PM) |

### Traffic Calculations

```
TOTAL KEYS:
  250M users × 50 keys/user = 12.5 billion keys

DAILY SESSIONS:
  100M DAU × 1.5 sessions/user = 150 million sessions/day

DAILY READS:
  150M sessions × 30 reads/session = 4.5 billion reads/day

DAILY WRITES:
  150M sessions × 2 writes/session = 300 million writes/day

AVERAGE QPS:
  Reads:  4.5B / 86,400 sec = 52,083 QPS
  Writes: 300M / 86,400 sec = 3,472 QPS
  Total:  55,555 QPS

PEAK QPS (5x multiplier):
  Reads:  52,083 × 5 = 260,415 QPS ≈ 260K QPS
  Writes: 3,472 × 5 = 17,360 QPS ≈ 17K QPS
  Total:  277,775 QPS ≈ 280K QPS
```

| Metric | Calculation | Value |
|--------|-------------|-------|
| Total keys | 250M × 50 | 12.5 billion |
| Daily reads | 150M × 30 | 4.5 billion |
| Daily writes | 150M × 2 | 300 million |
| Avg read QPS | 4.5B / 86,400 | ~52,000 |
| Avg write QPS | 300M / 86,400 | ~3,500 |
| Peak read QPS | 52K × 5 | ~260,000 |
| Peak write QPS | 3.5K × 5 | ~17,000 |

### Storage Calculations

```
PER-KEY STORAGE:
  Key:      50 bytes
  Value:    500 bytes
  Metadata: 50 bytes (timestamp, version, checksum)
  ─────────────────────
  Total:    600 bytes per key-value pair

RAW STORAGE:
  12.5B keys × 600 bytes = 7.5 TB

WITH REPLICATION (3x):
  7.5 TB × 3 = 22.5 TB

WITH LSM OVERHEAD (1.5x for compaction space):
  22.5 TB × 1.5 = 33.75 TB ≈ 34 TB

WITH BLOOM FILTERS & INDEXES (10% overhead):
  34 TB × 1.1 = 37.4 TB ≈ 38 TB

ANNUAL GROWTH (20% user growth):
  Year 1: 38 TB
  Year 2: 46 TB
  Year 3: 55 TB
  Year 5: 80 TB (plan for 100 TB)
```

| Metric | Calculation | Value |
|--------|-------------|-------|
| Raw storage per key | 50 + 500 + 50 | 600 bytes |
| Total raw storage | 12.5B × 600B | 7.5 TB |
| With replication (3x) | 7.5 × 3 | 22.5 TB |
| With LSM overhead | 22.5 × 1.5 | 34 TB |
| With indexes | 34 × 1.1 | ~38 TB |
| 5-year projection | 38 × 1.2^4 | ~80 TB |

### Bandwidth Calculations

```
READ BANDWIDTH (Peak):
  Request:  260K QPS × 100 bytes (key + headers) = 26 MB/s
  Response: 260K QPS × 600 bytes = 156 MB/s
  Total read: 182 MB/s = 1.46 Gbps

WRITE BANDWIDTH (Peak):
  Request:  17K QPS × 700 bytes (key + value + headers) = 11.9 MB/s
  Replication: 11.9 MB/s × 2 (to 2 replicas) = 23.8 MB/s
  Total write: 35.7 MB/s = 286 Mbps

TOTAL BANDWIDTH:
  External: 182 + 11.9 = 194 MB/s ≈ 1.6 Gbps
  Internal (replication): 23.8 MB/s ≈ 190 Mbps
```

| Direction | Calculation | Value |
|-----------|-------------|-------|
| Read response | 260K × 600B | 156 MB/s |
| Write request | 17K × 700B | 12 MB/s |
| Replication | 12 × 2 | 24 MB/s |
| Total external | 156 + 12 | 168 MB/s (1.3 Gbps) |
| Total internal | 24 MB/s | 192 Mbps |

### Infrastructure Sizing

```
NODE SPECIFICATIONS (High-memory instance):
  CPU:     16-32 cores
  Memory:  128 GB (for MemTable, bloom filters, cache)
  Storage: 4 TB NVMe SSD
  Network: 10 Gbps

CAPACITY PER NODE:
  Storage: 4 TB / 1.5 (LSM overhead) = 2.67 TB usable
  QPS:     50,000 (memory-bound reads), 10,000 (disk writes)

NODES REQUIRED (Storage-based):
  38 TB / 2.67 TB per node = 14.2 → 15 nodes

NODES REQUIRED (QPS-based for peak):
  Reads:  260K / 50K per node = 5.2 → 6 nodes
  Writes: 17K / 10K per node = 1.7 → 2 nodes

NODES REQUIRED (Replication minimum):
  3 nodes (RF=3)

RECOMMENDED CLUSTER SIZE:
  max(15, 6, 3) = 15 nodes minimum
  With 50% headroom: 15 × 1.5 = 23 nodes
  Round to: 24 nodes (8 per datacenter, 3 DCs)
```

| Factor | Calculation | Nodes Required |
|--------|-------------|----------------|
| Storage | 38 TB / 2.67 TB | 15 |
| Read QPS | 260K / 50K | 6 |
| Write QPS | 17K / 10K | 2 |
| Replication minimum | RF = 3 | 3 |
| **Recommended** | 15 × 1.5 headroom | **24 nodes** |

### Memory Requirements

```
PER-NODE MEMORY BREAKDOWN:
  MemTable (active + immutable): 2 × 256 MB = 512 MB
  Bloom filters: 10 bits/key × (12.5B/24 nodes) = 6.5 GB
  Block cache: 32 GB (hot data)
  Index blocks: 8 GB
  OS and overhead: 16 GB
  ─────────────────────────────────────────────────────
  Total: ~64 GB minimum, 128 GB recommended
```

---

## SLOs / SLAs

### Service Level Objectives

| Metric | SLO Target | Measurement Window | Error Budget |
|--------|------------|-------------------|--------------|
| Availability | 99.99% | Monthly | 4.32 minutes |
| Read latency (p99) | < 10ms | 5 minutes | N/A |
| Write latency (p99) | < 25ms | 5 minutes | N/A |
| Error rate | < 0.01% | 5 minutes | N/A |
| Durability | 99.999999999% | Annual | ~0 |

### Service Level Indicators

```yaml
SLIs:
  availability:
    good: successful_requests
    total: total_requests
    threshold: 0.9999

  read_latency:
    good: read_requests < 10ms
    total: total_read_requests
    threshold: 0.99

  write_latency:
    good: write_requests < 25ms
    total: total_write_requests
    threshold: 0.99

  error_rate:
    bad: error_responses (5xx)
    total: total_requests
    threshold: 0.0001
```

### SLA Tiers

| Tier | Availability | Support | Use Case |
|------|--------------|---------|----------|
| Standard | 99.9% | Business hours | Development, testing |
| Premium | 99.99% | 24/7, 1hr response | Production workloads |
| Enterprise | 99.999% | 24/7, 15min response | Mission-critical |

---

## Constraints & Assumptions

### Technical Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Max key size | 256 bytes | Keep index size manageable |
| Max value size | 1 MB | Prevent memory issues |
| Max keys per batch | 100 | Bound request processing time |
| Min replication factor | 3 | Durability requirement |
| Max replication factor | 7 | Diminishing returns |
| Tombstone TTL | 10 days | Balance space vs resurrection |

### Operational Assumptions

- Network latency between nodes < 1ms (same DC)
- Network latency between DCs: 20-100ms
- Node failures are independent (not correlated)
- Clock skew between nodes < 100ms (NTP synchronized)
- Disk failure rate: ~2% annual per drive
- Node maintenance window: < 1 hour per month

---

## Capacity Summary Table

| Metric | Value |
|--------|-------|
| **Users** | 250M MAU, 100M DAU |
| **Total Keys** | 12.5 billion |
| **Peak Read QPS** | 260,000 |
| **Peak Write QPS** | 17,000 |
| **Total Storage** | 38 TB (with replication) |
| **Bandwidth** | 1.6 Gbps external |
| **Cluster Size** | 24 nodes (8 per DC) |
| **Per-Node Storage** | 4 TB NVMe SSD |
| **Per-Node Memory** | 128 GB |

---

## Quick Reference: Estimation Formulas

```
Storage:
  Total = Users × Keys/User × (KeySize + ValueSize + Metadata) × RF × LSM_Overhead

Read QPS:
  Avg = DAU × Sessions/Day × Reads/Session / 86400
  Peak = Avg × PeakMultiplier

Write QPS:
  Avg = DAU × Sessions/Day × Writes/Session / 86400
  Peak = Avg × PeakMultiplier

Nodes (storage-bound):
  Nodes = TotalStorage / UsableStoragePerNode

Nodes (QPS-bound):
  Nodes = max(PeakReadQPS / ReadQPSPerNode, PeakWriteQPS / WriteQPSPerNode)

Final:
  Nodes = max(StorageNodes, QPSNodes, RF) × HeadroomMultiplier
```
