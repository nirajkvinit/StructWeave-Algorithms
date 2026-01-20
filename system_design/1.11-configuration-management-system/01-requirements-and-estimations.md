# Requirements & Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Requirements

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-1 | Key-Value Storage | P0 | Store configuration as key-value pairs with hierarchical or flat namespacing |
| FR-2 | Read Operations | P0 | Get single key, get with prefix, list keys |
| FR-3 | Write Operations | P0 | Create, update, delete keys with atomic semantics |
| FR-4 | Watch/Subscribe | P0 | Real-time notifications when keys change |
| FR-5 | Versioning | P0 | Track revision/version for each key and global state |
| FR-6 | Atomic Transactions | P1 | Multi-key operations with all-or-nothing semantics |
| FR-7 | Compare-and-Swap (CAS) | P1 | Conditional updates based on current version |

### Coordination Requirements

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-8 | Session/Lease Management | P0 | Client sessions with TTL, automatic cleanup on disconnect |
| FR-9 | Ephemeral Keys | P0 | Keys that auto-delete when session expires |
| FR-10 | Sequential Keys | P1 | Monotonically increasing key suffixes for ordering |
| FR-11 | Leader Election Primitive | P1 | Built-in or recipe-based leader election support |
| FR-12 | Distributed Locks | P1 | Mutual exclusion with timeout and auto-release |

### Extended Requirements

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-13 | Namespace/Prefix Isolation | P2 | Logical separation of key spaces (multi-tenancy) |
| FR-14 | Compaction | P2 | Remove old revisions to reclaim storage |
| FR-15 | Snapshots | P2 | Point-in-time backup of entire state |
| FR-16 | Range Queries | P2 | Efficient queries over key ranges |
| FR-17 | Bulk Import/Export | P3 | Migration and backup tooling |

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Requirement | Rationale |
|--------|-------------|-----------|
| **Write Latency (p50)** | < 10ms | Consensus overhead is unavoidable |
| **Write Latency (p99)** | < 50ms | Account for leader election, disk sync |
| **Read Latency (p50)** | < 2ms | In-memory serving |
| **Read Latency (p99)** | < 10ms | Includes follower reads, serialization |
| **Watch Notification** | < 100ms | From write commit to client notification |
| **Write Throughput** | > 10,000 ops/sec | Single leader bottleneck limits this |
| **Read Throughput** | > 100,000 ops/sec | Distributed across followers |

### Consistency Requirements

| Metric | Requirement | Description |
|--------|-------------|-------------|
| **Write Consistency** | Linearizable | All writes appear in a single global order |
| **Read Consistency** | Linearizable (configurable) | Option for stale reads from followers |
| **Watch Ordering** | FIFO per connection | Events delivered in order they occurred |
| **Transaction Isolation** | Serializable | Multi-op transactions are atomic |

### Reliability Requirements

| Metric | Target | Description |
|--------|--------|-------------|
| **Availability** | 99.99% | < 52 minutes downtime/year |
| **Durability** | Zero data loss | Committed writes survive any single failure |
| **Fault Tolerance** | (N-1)/2 failures | For N-node cluster |
| **Recovery Time** | < 30 seconds | Leader election after failure |
| **Data Integrity** | Checksums on all data | Detect corruption |

### Scalability Requirements

| Metric | Target | Description |
|--------|--------|-------------|
| **Services/Clients** | > 10,000 concurrent | Watching configuration |
| **Keys** | > 100,000 | Total keys in the system |
| **Key Size** | < 1 KB (typical) | Key path/name |
| **Value Size** | < 1 MB (max) | Configuration payloads |
| **Total Data Size** | < 10 GB | In-memory + WAL storage |
| **Watch Connections** | > 50,000 concurrent | Long-lived watch streams |

---

## Use Cases

### Primary Use Cases

#### 1. Application Configuration Distribution

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Dynamic Configuration Update                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Scenario:                                                           │
│  - 500 instances of payment-service need rate limit config          │
│  - Rate limit changes from 1000/sec to 2000/sec                     │
│  - All instances must update within 1 second                        │
│                                                                      │
│  Flow:                                                               │
│  1. Admin updates config:                                            │
│     PUT /config/payment/rate-limit → {"limit": 2000, "window": 1}  │
│                                                                      │
│  2. Config system commits write through consensus                    │
│                                                                      │
│  3. Watch notifications sent to all 500 instances:                   │
│     Instance-1 ← Watch event: /config/payment/rate-limit changed   │
│     Instance-2 ← Watch event: /config/payment/rate-limit changed   │
│     ...                                                              │
│     Instance-500 ← Watch event: /config/payment/rate-limit changed │
│                                                                      │
│  4. Each instance fetches new value and applies                     │
│                                                                      │
│  Outcome: All instances using new rate limit within 100ms           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2. Kubernetes Cluster State (etcd)

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Kubernetes API Server + etcd                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Stored in etcd:                                                     │
│  /registry/pods/default/nginx-deployment-abc123                     │
│  /registry/services/default/nginx-service                           │
│  /registry/configmaps/default/nginx-config                          │
│  /registry/secrets/default/nginx-tls                                │
│                                                                      │
│  Write Flow (kubectl apply):                                         │
│  1. kubectl → API Server: Create Pod spec                           │
│  2. API Server → etcd: PUT /registry/pods/...                       │
│  3. etcd: Replicate via Raft, commit                                │
│  4. etcd → API Server: Success                                       │
│  5. Controller watches → Scheduler picks node                       │
│  6. Kubelet watches → Creates container                             │
│                                                                      │
│  Scale:                                                              │
│  - 5000 nodes, 150,000 pods                                         │
│  - ~500,000 keys in etcd                                            │
│  - ~15,000 watches from controllers/kubelets                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3. Leader Election for Job Scheduler

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Scheduler Leader Election                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Scenario:                                                           │
│  - 3 scheduler instances for high availability                      │
│  - Only 1 should process jobs at a time                             │
│  - If leader crashes, another must take over                        │
│                                                                      │
│  Election Algorithm (using sequential ephemeral nodes):             │
│                                                                      │
│  1. Each scheduler creates ephemeral sequential node:               │
│     Scheduler-A: /election/leader-0000000001                        │
│     Scheduler-B: /election/leader-0000000002                        │
│     Scheduler-C: /election/leader-0000000003                        │
│                                                                      │
│  2. List children, find lowest sequence → that's the leader        │
│     Scheduler-A (0001) = LEADER                                     │
│                                                                      │
│  3. Non-leaders watch the node immediately before them:             │
│     Scheduler-B watches 0001                                        │
│     Scheduler-C watches 0002                                        │
│                                                                      │
│  4. If Scheduler-A crashes:                                         │
│     - Session expires, ephemeral node 0001 deleted                  │
│     - Scheduler-B gets watch notification                           │
│     - Scheduler-B is now lowest → becomes leader                   │
│                                                                      │
│  Failover Time: Session timeout (10-30s) + election (~100ms)       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4. Distributed Lock for Critical Section

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Inventory Update Lock                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Scenario:                                                           │
│  - Multiple order-service instances                                 │
│  - Decrementing inventory must be atomic                            │
│  - Prevent overselling                                               │
│                                                                      │
│  Lock Acquisition:                                                   │
│  1. Order-Service-1 attempts:                                        │
│     PUT /locks/inventory/sku-12345                                  │
│     Value: {"holder": "order-svc-1", "acquired": "2025-01-20T..."}  │
│     Condition: Key does not exist (create-only)                     │
│                                                                      │
│  2. Config system checks condition:                                  │
│     - Key doesn't exist → Create succeeds → Lock acquired          │
│     - Key exists → Create fails → Lock not acquired                │
│                                                                      │
│  3. Order-Service-1 has exclusive access:                           │
│     - Read inventory                                                 │
│     - Decrement                                                      │
│     - Write back                                                     │
│                                                                      │
│  4. Release lock:                                                    │
│     DELETE /locks/inventory/sku-12345                               │
│     Condition: Value matches (only holder can release)              │
│                                                                      │
│  Safety: Lease TTL ensures lock released if holder crashes          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Secondary Use Cases

| Use Case | Description | Example |
|----------|-------------|---------|
| Feature Flag Storage | Boolean/percentage flags for rollouts | `{"dark_mode": {"enabled": true, "rollout": 25}}` |
| Database Credentials Rotation | Coordinate credential updates | Store current credentials, services watch for changes |
| Service Mesh Config | Envoy xDS config source | Traffic rules, retry policies |
| Circuit Breaker State | Shared circuit breaker across instances | Open/closed state per downstream service |
| A/B Test Configuration | Experiment parameters | Test variants, traffic allocation |
| Maintenance Mode | Global service state flags | `{"maintenance": true, "message": "..."}` |

---

## Capacity Estimations

### Reference Architecture: 10,000 Services, 100,000 Keys

```
┌─────────────────────────────────────────────────────────────────────┐
│  REFERENCE SCENARIO                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Scale:                                                              │
│    - 10,000 microservices (distinct service types)                  │
│    - 100,000 service instances total (10 instances avg per service) │
│    - 100,000 configuration keys                                     │
│    - 50,000 active watch connections                                │
│                                                                      │
│  Traffic Patterns:                                                   │
│    - Reads: 50,000 QPS (peak)                                       │
│    - Writes: 500 QPS (peak, during deployments/config changes)      │
│    - Watch notifications: 5,000/sec (during config updates)         │
│    - Read:Write ratio: 100:1                                        │
│                                                                      │
│  Deployment:                                                         │
│    - 5-node cluster (tolerates 2 failures)                          │
│    - 3 datacenters (regional clusters with federation)              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Requirements

```
Key-Value Record Size:
┌────────────────────────────────────────────────────────────────┐
│ Field              │ Size    │ Notes                           │
├────────────────────┼─────────┼─────────────────────────────────┤
│ key                │ 200 B   │ "/services/payment/config/v2"   │
│ value              │ 500 B   │ Average config payload (JSON)   │
│ create_revision    │ 8 B     │ Global revision at creation     │
│ mod_revision       │ 8 B     │ Global revision at last update  │
│ version            │ 8 B     │ Per-key version counter         │
│ lease_id           │ 8 B     │ Associated lease (if ephemeral) │
│ metadata           │ 100 B   │ TTL, flags, checksums           │
└────────────────────┴─────────┴─────────────────────────────────┘
Total per key: ~850 bytes

Storage for 100,000 keys:
  - Key-value data: 100,000 × 850 B = 85 MB
  - Index structures: ~20 MB (B-tree/radix tree for prefix queries)
  - WAL (write-ahead log): ~500 MB (retained revisions)
  - Snapshots: ~100 MB (compressed)
  - Total on disk: ~700 MB
  - In-memory working set: ~150 MB

Storage for 1,000,000 keys:
  - Key-value data: 1M × 850 B = 850 MB
  - Index structures: ~200 MB
  - WAL: ~5 GB
  - Total on disk: ~7 GB
  - In-memory: ~1.5 GB
```

### Watch Connection Memory

```
┌─────────────────────────────────────────────────────────────────────┐
│  WATCH MEMORY ESTIMATION                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Per Watch Connection:                                               │
│    - Connection state: ~1 KB                                        │
│    - Watch filter (key/prefix): ~200 B                              │
│    - Event buffer: ~4 KB (pending events)                           │
│    - Total: ~5 KB per watch                                         │
│                                                                      │
│  For 50,000 watches:                                                │
│    - Watch state: 50,000 × 5 KB = 250 MB                           │
│    - Connection overhead (TCP, TLS): ~500 MB                        │
│    - Total: ~750 MB for watch subsystem                             │
│                                                                      │
│  Watch Storm Scenario (all watches triggered):                      │
│    - 50,000 notifications × 1 KB event = 50 MB burst               │
│    - Spread over 100ms = 500 MB/s network burst                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Bandwidth Requirements

```
┌─────────────────────────────────────────────────────────────────────┐
│  BANDWIDTH ESTIMATION                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Normal Operations:                                                  │
│                                                                      │
│  Read Traffic:                                                       │
│    - 50,000 reads/sec × 600 B response = 30 MB/s                   │
│                                                                      │
│  Write Traffic (to leader):                                          │
│    - 500 writes/sec × 700 B request = 350 KB/s                     │
│                                                                      │
│  Replication Traffic (leader → followers):                          │
│    - 500 writes/sec × 4 followers × 700 B = 1.4 MB/s               │
│                                                                      │
│  Watch Notifications (steady state):                                │
│    - 1,000 events/sec × 1 KB × 10 avg watchers = 10 MB/s           │
│                                                                      │
│  Total Steady State: ~45 MB/s outbound                              │
│                                                                      │
│  Peak (Config Storm):                                                │
│    - Mass config update triggers 50,000 watches                     │
│    - 50,000 × 1 KB = 50 MB burst over 100ms = 500 MB/s peak        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Cluster Sizing Guidelines

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLUSTER SIZING                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Small (< 10,000 keys, < 1,000 watches):                            │
│    - 3 nodes                                                         │
│    - 2 vCPU, 4 GB RAM each                                          │
│    - 50 GB SSD (NVMe preferred)                                     │
│    - Handles 5,000 reads/sec, 500 writes/sec                        │
│                                                                      │
│  Medium (10,000 - 100,000 keys, < 10,000 watches):                  │
│    - 5 nodes                                                         │
│    - 4 vCPU, 8 GB RAM each                                          │
│    - 100 GB SSD                                                      │
│    - Handles 50,000 reads/sec, 2,000 writes/sec                     │
│                                                                      │
│  Large (100,000+ keys, 50,000+ watches):                            │
│    - 5-7 nodes                                                       │
│    - 8 vCPU, 16 GB RAM each                                         │
│    - 200 GB NVMe SSD (low latency critical)                         │
│    - Handles 100,000+ reads/sec, 5,000+ writes/sec                  │
│                                                                      │
│  Kubernetes Control Plane (etcd):                                    │
│    - Up to 1,000 nodes: 3 etcd nodes, 4 vCPU, 16 GB RAM            │
│    - 1,000-3,000 nodes: 5 etcd nodes, 8 vCPU, 32 GB RAM            │
│    - 3,000+ nodes: Dedicated etcd cluster, consider sharding        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## SLOs / SLAs

### Service Level Objectives

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Write Availability** | 99.99% | Successful writes / Total write attempts |
| **Read Availability** | 99.999% | Successful reads / Total read attempts |
| **Write Latency (p50)** | < 10ms | Histogram of write durations |
| **Write Latency (p99)** | < 50ms | Histogram of write durations |
| **Read Latency (p50)** | < 2ms | Histogram of read durations |
| **Read Latency (p99)** | < 10ms | Histogram of read durations |
| **Watch Delivery (p99)** | < 100ms | Time from commit to client notification |
| **Leader Election** | < 30s | Time to elect new leader after failure |

### Consistency SLOs

| Metric | Target | Description |
|--------|--------|-------------|
| **Linearizable Reads** | 100% (when requested) | Read reflects all prior writes |
| **Watch Ordering** | 100% | Events delivered in commit order |
| **Transaction Atomicity** | 100% | All or nothing for multi-op transactions |
| **Durability** | Zero data loss | Committed data survives single node failure |

### Capacity SLOs

| Metric | Target | Description |
|--------|--------|-------------|
| **Max Keys** | 1,000,000 | Before performance degrades |
| **Max Key Size** | 1 KB | Path length limit |
| **Max Value Size** | 1 MB | Per-key value limit |
| **Max Watches** | 100,000 | Concurrent watch connections |
| **Max Transactions/sec** | 10,000 | Write throughput limit |

---

## Constraints & Assumptions

### Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| Single Leader Writes | All writes go through elected leader | Write throughput bounded by single node |
| Quorum Requirement | Majority must acknowledge writes | Cluster unavailable if majority lost |
| Memory-Bound | Data + index should fit in memory | Limits total data size |
| Network Latency | Consensus requires round-trips | WAN clusters have higher write latency |
| Sequential Revisions | Global revision number for ordering | Single counter is potential bottleneck |

### Assumptions

| Assumption | Rationale |
|------------|-----------|
| Small configuration values | < 1 KB typical; not for blob storage |
| Read-heavy workload | Config rarely changes, frequently read |
| Clients tolerate ~100ms staleness | Follower reads acceptable for most cases |
| Network is mostly reliable | Partitions are rare, not the norm |
| Clients have stable connectivity | Watches require persistent connections |

---

## Out of Scope

| Concern | Why Out of Scope | Handled By |
|---------|-----------------|------------|
| Large Blob Storage | Config systems optimize for small values | Object storage (S3, GCS) |
| High Write Throughput | Consensus limits writes; not designed for this | Stream processing, message queues |
| Cross-Region Strong Consistency | WAN latency makes this impractical | Accept eventual consistency or single region |
| Schema Validation | Config systems store bytes, not typed data | Application layer or schema registry |
| Secret Encryption | Config systems provide ACL, not encryption | Secret managers (Vault, AWS Secrets Manager) |
| Service Discovery | Different consistency requirements | Dedicated service discovery (Consul catalog) |

---

## Requirements Traceability

| Requirement | Addressed In | Implementation |
|-------------|--------------|----------------|
| FR-1: KV Storage | 03-low-level-design | Data model, storage engine |
| FR-2,3: Read/Write | 02-high-level-design, 03-low-level | API design, data flow |
| FR-4: Watch | 03-low-level-design, 04-deep-dive | Watch manager, event dispatch |
| FR-5: Versioning | 03-low-level-design | Revision tracking |
| FR-6,7: Transactions/CAS | 03-low-level-design | Transaction API |
| FR-8,9: Sessions | 03-low-level-design, 04-deep-dive | Session manager, lease handling |
| FR-10,11,12: Coordination | 04-deep-dive | Leader election, lock recipes |
| NFR: Performance | 05-scalability | Scaling strategies |
| NFR: Security | 06-security | ACL, mTLS, encryption |
