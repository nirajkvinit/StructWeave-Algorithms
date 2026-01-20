# Requirements & Capacity Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features (In Scope)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Lock Acquire** | Acquire exclusive lock on a named resource | P0 |
| **Lock Release** | Release a held lock | P0 |
| **TryLock** | Non-blocking attempt to acquire lock | P0 |
| **Lease Renewal** | Extend lock duration while still holding | P0 |
| **Fencing Token** | Return monotonic token with lock acquisition | P0 |
| **Lock Wait Queue** | Queue waiters for fair acquisition order | P1 |
| **Watch/Notify** | Notify waiters when lock is released | P1 |
| **Read-Write Locks** | Shared (read) vs exclusive (write) locks | P2 |
| **Lock with Data** | Store metadata alongside lock | P2 |
| **Lock Groups** | Acquire multiple locks atomically | P3 |

### Out of Scope

- Fine-grained (per-row/per-record) database locks
- Semaphores with count > 1
- Cross-datacenter lock coordination (single-region focus)
- Automatic deadlock detection across application locks
- Transaction management (2PC coordinator)

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
                  /  \  CP  /  \    ← Our Choice
                 / AP \    /    \
                /______\  /______\
           Availability  Partition Tolerance
```

**Primary Choice: CP (Consistency + Partition Tolerance)**

- Mutual exclusion REQUIRES strong consistency
- Cannot grant same lock to multiple holders
- During partition, minority side refuses lock operations
- Availability sacrificed during leader election (seconds)

**Justification:**
- A lock that can be held by two processes simultaneously is useless
- Brief unavailability (leader election) is acceptable
- Applications can retry with backoff during unavailability

### Consistency Model

| Guarantee | Description | Requirement |
|-----------|-------------|-------------|
| **Linearizability** | Operations appear atomic and in real-time order | Required |
| **Mutual Exclusion** | At most one holder per lock at any time | Required |
| **Liveness** | Lock eventually granted if holder releases/fails | Required |
| **Fairness** | Waiters acquire in FIFO order (optional) | Recommended |

### Latency Requirements

| Operation | p50 Target | p99 Target | p99.9 Target |
|-----------|------------|------------|--------------|
| Lock (uncontended) | < 5ms | < 15ms | < 30ms |
| Lock (contended, wait) | Application-dependent | - | - |
| Unlock | < 5ms | < 15ms | < 30ms |
| TryLock | < 5ms | < 15ms | < 30ms |
| Lease Renewal | < 5ms | < 15ms | < 30ms |
| Failure Detection | < 30s | - | - |

### Availability & Durability

| Metric | Target | Justification |
|--------|--------|---------------|
| Availability | 99.99% (52 min/year) | Critical infrastructure |
| Single node failure | No downtime | Raft/Paxos handles |
| Leader election | < 5 seconds | Fast election protocol |
| Lock state durability | 100% | Never lose granted lock state |
| Split-brain safety | 100% | Never grant duplicate locks |

---

## Capacity Estimations

### Scenario: Kubernetes Cluster Coordination

**Business Context:**
- Internal coordination service for Kubernetes clusters
- Leader election for controllers
- Distributed locks for operator reconciliation
- Configuration synchronization

### Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Kubernetes clusters | 50 | Large enterprise deployment |
| Nodes per cluster | 500 | Production-scale clusters |
| Controllers per cluster | 20 | Standard controllers + custom operators |
| Lock operations per controller/min | 10 | Leader election, config updates |
| Watch connections per cluster | 1,000 | Pods watching config/locks |
| Average lock hold time | 30 seconds | Typical operation duration |
| Lock key size | 100 bytes | `/kubernetes/cluster-1/controller-manager/leader` |
| Lock metadata size | 200 bytes | Holder ID, timestamp, lease info |
| Replication factor | 3 | Standard for Raft quorum |
| Peak traffic multiplier | 3x | Cluster restarts, deployments |

### Traffic Calculations

```
LOCK OPERATIONS:
  Per cluster: 20 controllers × 10 ops/min = 200 ops/min
  All clusters: 50 clusters × 200 ops/min = 10,000 ops/min
  Per second: 10,000 / 60 = 167 ops/sec

HEARTBEATS/RENEWALS:
  Active locks: 50 clusters × 20 controllers = 1,000 locks
  Renewal interval: 10 seconds
  Renewals/sec: 1,000 / 10 = 100 renewals/sec

WATCH CONNECTIONS:
  Total: 50 clusters × 1,000 watches = 50,000 connections
  Watch events/sec: ~500 (lock changes propagated)

TOTAL OPERATIONS:
  Lock ops: 167/sec
  Renewals: 100/sec
  Watch events: 500/sec
  ─────────────────────
  Total: ~770 ops/sec average

PEAK (3x multiplier):
  Total: ~2,300 ops/sec
  Round up: ~2,500 ops/sec

CONSENSUS OPERATIONS:
  Write ops (lock/unlock/renew): 267/sec avg, 800/sec peak
  Read ops (watch, status): 500/sec avg, 1,500/sec peak
```

| Metric | Calculation | Value |
|--------|-------------|-------|
| Avg lock operations/sec | 10K/min ÷ 60 | ~167 |
| Avg renewals/sec | 1K locks ÷ 10s interval | 100 |
| Avg watch events/sec | Lock changes | ~500 |
| Peak total ops/sec | 770 × 3 | ~2,300 |

### Storage Calculations

```
PER-LOCK STORAGE:
  Key:      100 bytes
  Value:    200 bytes (holder, lease, fencing token)
  Metadata: 50 bytes (internal Raft state)
  ─────────────────────
  Total:    350 bytes per lock

ACTIVE LOCKS:
  1,000 locks × 350 bytes = 350 KB

WITH RAFT LOG (7-day retention):
  Ops/day: 770 × 86,400 = 66.5M operations
  Log entry size: 400 bytes (key + value + metadata)
  Daily log: 66.5M × 400 = 26.6 GB
  7-day retention: 186 GB

WITH SNAPSHOTS:
  Snapshot frequency: Every 10K operations
  Snapshot size: ~5 MB (current state)
  Daily snapshots: 6,650
  Snapshot storage: ~33 GB

TOTAL PER NODE:
  Active state: 350 KB
  Raft log: 186 GB
  Snapshots: 33 GB
  Overhead (indexes, buffers): 50 MB
  ─────────────────────────────────
  Total: ~220 GB per node (conservative)
  Recommended: 256 GB SSD per node
```

| Metric | Calculation | Value |
|--------|-------------|-------|
| Active lock storage | 1K × 350B | 350 KB |
| Daily Raft log | 66.5M × 400B | ~27 GB |
| 7-day log retention | 27 × 7 | ~186 GB |
| Per-node storage | Log + snapshots + overhead | ~220 GB |

### Bandwidth Calculations

```
WRITE BANDWIDTH:
  Write ops: 800/sec peak × 400 bytes = 320 KB/s
  Replication: 320 KB/s × 2 followers = 640 KB/s

READ BANDWIDTH:
  Read ops: 1,500/sec peak × 300 bytes = 450 KB/s

WATCH BANDWIDTH:
  Watch updates: 500/sec × 400 bytes = 200 KB/s
  50K connections × 100 bytes/sec keep-alive = 5 MB/s

TOTAL BANDWIDTH:
  External: 320 + 450 + 200 = 970 KB/s ≈ 8 Mbps
  Internal (replication): 640 KB/s ≈ 5 Mbps
  Watch keep-alive: 5 MB/s ≈ 40 Mbps
  ─────────────────────────────────────────
  Total: ~53 Mbps (dominated by watch keep-alive)
```

### Infrastructure Sizing

```
NODE SPECIFICATIONS:
  CPU:     4-8 cores (consensus is single-threaded)
  Memory:  16 GB (active state + buffers)
  Storage: 256 GB NVMe SSD (Raft log + snapshots)
  Network: 1 Gbps

CLUSTER SIZE:
  Minimum: 3 nodes (Raft quorum)
  Recommended: 5 nodes (tolerate 2 failures)

CAPACITY PER CLUSTER:
  Write throughput: 10K-50K ops/sec (leader-bound)
  Read throughput: 50K+ ops/sec (follower reads OK)
  Concurrent locks: 100K+
  Watch connections: 100K+

FOR OUR SCENARIO:
  Peak: 2,500 ops/sec
  Single 5-node cluster handles this easily

  If scaling to 10x:
  - Consider multiple lock namespaces
  - Shard by lock prefix
```

| Factor | Calculation | Nodes Required |
|--------|-------------|----------------|
| Consensus minimum | Raft quorum | 3 |
| Fault tolerance | Tolerate 2 failures | 5 |
| Throughput | 2,500 ops/sec | 1 cluster |
| Storage | 220 GB per node | Fits 256 GB SSD |
| **Recommended** | 5-node cluster | **5 nodes** |

### Memory Requirements

```
PER-NODE MEMORY BREAKDOWN:
  Active lock state: 1 MB (with overhead)
  Raft state machine: 50 MB
  Raft log buffer: 512 MB
  Watch connections: 50K × 2KB = 100 MB
  gRPC buffers: 256 MB
  Index structures: 100 MB
  OS and overhead: 2 GB
  ─────────────────────────────────────────
  Total: ~4 GB minimum, 8 GB recommended
  With headroom: 16 GB
```

---

## SLOs / SLAs

### Service Level Objectives

| Metric | SLO Target | Measurement Window | Error Budget |
|--------|------------|-------------------|--------------|
| Availability | 99.99% | Monthly | 4.32 minutes |
| Lock latency (p99) | < 20ms | 5 minutes | N/A |
| Failure detection | < 30 seconds | Per event | N/A |
| Leader election | < 5 seconds | Per event | N/A |
| Error rate | < 0.01% | 5 minutes | N/A |

### Service Level Indicators

```yaml
SLIs:
  availability:
    good: successful_requests
    total: total_requests
    threshold: 0.9999

  lock_latency:
    good: lock_requests < 20ms
    total: total_lock_requests
    threshold: 0.99

  safety:
    bad: dual_lock_grants  # Must be 0
    total: total_grants
    threshold: 0  # Zero tolerance

  failure_detection:
    good: detected_within_30s
    total: total_failures
    threshold: 0.999
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
| Max lock key size | 1 KB | Keep index efficient |
| Max lock metadata | 64 KB | Prevent abuse |
| Max lease duration | 1 hour | Force renewal for liveness |
| Min lease duration | 5 seconds | Prevent excessive renewals |
| Max locks per client | 10,000 | Prevent resource exhaustion |
| Max waiters per lock | 1,000 | Bound queue size |

### Operational Assumptions

- Network latency between nodes < 1ms (same datacenter)
- Clock skew between nodes < 100ms (NTP synchronized)
- Node failures are independent
- Disk latency < 1ms (NVMe SSD required)
- Raft election timeout: 1-2 seconds
- Heartbeat interval: 100-300ms

---

## Capacity Summary Table

| Metric | Value |
|--------|-------|
| **Kubernetes Clusters** | 50 |
| **Active Locks** | ~1,000 |
| **Peak Lock Ops/sec** | ~800 |
| **Peak Total Ops/sec** | ~2,500 |
| **Watch Connections** | ~50,000 |
| **Per-Node Storage** | 256 GB SSD |
| **Per-Node Memory** | 16 GB |
| **Cluster Size** | 5 nodes |

---

## Quick Reference: Estimation Formulas

```
Lock Operations:
  Ops/sec = Controllers × OpsPerController/min ÷ 60

Renewals:
  Renewals/sec = ActiveLocks ÷ RenewalInterval

Storage:
  DailyLog = Ops/sec × 86400 × LogEntrySize
  TotalStorage = DailyLog × RetentionDays + Snapshots

Bandwidth:
  WriteBandwidth = WriteOps/sec × EntrySize
  ReplicationBandwidth = WriteBandwidth × (RF - 1)

Cluster Size:
  MinNodes = 2F + 1 (F = tolerable failures)
  Standard: 3 nodes (tolerate 1), 5 nodes (tolerate 2)
```

---

## Comparison: Lock Manager vs Other Systems

| Metric | Lock Manager | Key-Value Store | Message Queue |
|--------|--------------|-----------------|---------------|
| QPS | 1K-10K | 100K-1M | 100K-1M |
| Latency (p99) | 10-20ms | 1-10ms | 1-10ms |
| Consistency | Linearizable | Eventual/Strong | At-least-once |
| Storage | Small (MBs) | Large (TBs) | Large (TBs) |
| Key insight | Safety > throughput | Throughput > latency | Durability > latency |

The lock manager is write-heavy but low-volume compared to data systems. The critical constraint is **correctness**, not performance.
