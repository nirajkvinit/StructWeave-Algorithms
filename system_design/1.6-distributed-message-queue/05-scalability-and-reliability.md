# Scalability and Reliability

[← Back to Index](./00-index.md)

---

## Scalability Strategies

### Horizontal Scaling: Adding Broker Nodes

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLUSTER EXPANSION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Before: 3-node cluster (100K msg/sec capacity)                 │
│                                                                  │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐                       │
│  │ Node 1  │───│ Node 2  │───│ Node 3  │                       │
│  │ 33K/sec │   │ 33K/sec │   │ 33K/sec │                       │
│  └─────────┘   └─────────┘   └─────────┘                       │
│                                                                  │
│  After: 5-node cluster (166K msg/sec capacity)                  │
│                                                                  │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐                       │
│  │ Node 1  │───│ Node 2  │───│ Node 3  │                       │
│  │ 33K/sec │   │ 33K/sec │   │ 33K/sec │                       │
│  └────┬────┘   └────┬────┘   └────┬────┘                       │
│       │             │             │                             │
│       └──────┬──────┴──────┬──────┘                             │
│              │             │                                     │
│         ┌────┴────┐   ┌────┴────┐                               │
│         │ Node 4  │   │ Node 5  │                               │
│         │ 33K/sec │   │ 33K/sec │                               │
│         └─────────┘   └─────────┘                               │
│                                                                  │
│  Steps to Add Node:                                              │
│  1. Install RabbitMQ on new node                                │
│  2. Join cluster: rabbitmqctl join_cluster rabbit@node1        │
│  3. Wait for sync                                               │
│  4. Create new queues on new node (automatic balancing)         │
│  5. Existing quorum queues will add new node as replica         │
│                                                                  │
│  Note: Quorum queues require odd number of replicas (3, 5, 7)   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Queue Sharding for Throughput

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUEUE SHARDING                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Problem: Single queue limited to ~50K msg/sec                  │
│  Solution: Shard across multiple queues                         │
│                                                                  │
│  Option 1: Consistent Hash Exchange (Plugin)                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  Producer ──► [Consistent Hash Exchange]                 │   │
│  │                    │                                     │   │
│  │         ┌──────────┼──────────┬──────────┐              │   │
│  │         ▼          ▼          ▼          ▼              │   │
│  │    [Shard-1]  [Shard-2]  [Shard-3]  [Shard-4]          │   │
│  │     hash:     hash:      hash:      hash:               │   │
│  │     0-63      64-127     128-191    192-255             │   │
│  │         │          │          │          │              │   │
│  │         ▼          ▼          ▼          ▼              │   │
│  │    [Consumer] [Consumer] [Consumer] [Consumer]          │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Option 2: Application-Level Sharding                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  Producer:                                               │   │
│  │    shard_id = hash(message.customer_id) % num_shards    │   │
│  │    publish(exchange="orders", routing_key=shard_id)     │   │
│  │                                                          │   │
│  │  Direct Exchange with bindings:                          │   │
│  │    shard-0 → orders-0                                   │   │
│  │    shard-1 → orders-1                                   │   │
│  │    shard-2 → orders-2                                   │   │
│  │    shard-3 → orders-3                                   │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Benefits:                                                       │
│  • Linear throughput scaling                                    │
│  • Parallel processing                                          │
│  • Ordering maintained per shard key                           │
│                                                                  │
│  Trade-offs:                                                     │
│  • Consumer complexity (multiple queues)                        │
│  • Hot spots if keys are skewed                                 │
│  • No global ordering                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Connection and Channel Scaling

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONNECTION SCALING                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Problem: Each connection consumes ~100KB memory                │
│  Solution: Connection pooling + channel multiplexing            │
│                                                                  │
│  Bad Pattern (1 connection per request):                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Request 1 ──► Connection 1 ──┐                         │   │
│  │  Request 2 ──► Connection 2 ──┤                         │   │
│  │  Request 3 ──► Connection 3 ──┼──► Broker               │   │
│  │  ...                          │     (memory exhaustion) │   │
│  │  Request N ──► Connection N ──┘                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Good Pattern (connection pool + channels):                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  ┌── Channel 1 ◄── Request 1            │   │
│  │  Connection 1 ───┼── Channel 2 ◄── Request 2            │   │
│  │  (pooled)        └── Channel 3 ◄── Request 3            │   │
│  │                                                          │   │
│  │                  ┌── Channel 1 ◄── Request 4            │   │
│  │  Connection 2 ───┼── Channel 2 ◄── Request 5            │   │
│  │  (pooled)        └── Channel 3 ◄── Request 6            │   │
│  │                                         │                │   │
│  │                                         ▼                │   │
│  │                                      Broker              │   │
│  │                                 (bounded memory)         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Guidelines:                                                     │
│  • 1 connection per application instance                        │
│  • 1 channel per thread/task                                    │
│  • Max ~100 channels per connection                             │
│  • Connection pool size = num_threads / channels_per_conn       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Reliability and Fault Tolerance

### Quorum Queue Guarantees

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUORUM QUEUE GUARANTEES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Durability:                                                     │
│  • Messages written to Raft log on disk                         │
│  • Replicated to quorum before confirm                          │
│  • Survives minority node failures                              │
│                                                                  │
│  Consistency:                                                    │
│  • Strong consistency (linearizable)                            │
│  • Single leader handles all writes                             │
│  • Reads also go through leader                                 │
│                                                                  │
│  Availability:                                                   │
│  • Available if majority of nodes up                            │
│  • Automatic leader election on failure                         │
│  • Pause-minority prevents split-brain                          │
│                                                                  │
│  Failure Tolerance Table:                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Quorum Size  │  Nodes  │  Tolerated Failures  │ Quorum  │  │
│  │───────────────│─────────│──────────────────────│─────────│  │
│  │  3            │  3      │  1                   │  2      │  │
│  │  5            │  5      │  2                   │  3      │  │
│  │  7            │  7      │  3                   │  4      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Recommended: 3 or 5 node quorum (diminishing returns beyond)   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Node Failure Handling

```mermaid
sequenceDiagram
    participant Client
    participant LB as Load Balancer
    participant N1 as Node 1 (Leader)
    participant N2 as Node 2
    participant N3 as Node 3

    Note over N1,N3: Normal Operation

    Client->>LB: publish(message)
    LB->>N1: forward
    N1->>N2: replicate
    N1->>N3: replicate
    N2-->>N1: ack
    N3-->>N1: ack
    N1-->>Client: confirm

    Note over N1: Node 1 CRASHES

    N2->>N3: Raft election timeout
    N2->>N3: RequestVote (term=2)
    N3-->>N2: VoteGranted

    Note over N2: Node 2 becomes Leader

    Client->>LB: publish(message)
    LB->>N2: forward (reconnect)
    N2->>N3: replicate
    N3-->>N2: ack
    N2-->>Client: confirm

    Note over N1: Node 1 RECOVERS

    N1->>N2: AppendEntries (catch up)
    N2-->>N1: log entries
    N1->>N1: Apply entries

    Note over N1,N3: Normal 3-node operation
```

### Network Partition Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETWORK PARTITION MODES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Mode: pause-minority (recommended for quorum queues)           │
│                                                                  │
│  Partition Scenario: [Node 1] | [Node 2, Node 3]               │
│                                                                  │
│  Behavior:                                                       │
│  ┌──────────────────┐     ┌──────────────────────────────┐    │
│  │     Node 1       │     │     Nodes 2 + 3              │    │
│  │    (minority)    │     │      (majority)              │    │
│  │                  │     │                              │    │
│  │  • Detects       │     │  • Continue operating       │    │
│  │    partition     │     │  • Elect leader if needed   │    │
│  │  • PAUSES        │     │  • Accept writes            │    │
│  │  • Refuses       │     │  • Serve reads              │    │
│  │    connections   │     │                              │    │
│  │  • Waits for     │     │                              │    │
│  │    healing       │     │                              │    │
│  └──────────────────┘     └──────────────────────────────┘    │
│                                                                  │
│  Client Impact:                                                  │
│  • Connected to Node 1: Reconnect to Node 2/3 via LB           │
│  • Connected to Node 2/3: Normal operation                      │
│                                                                  │
│  Data Consistency:                                               │
│  • No split-brain                                               │
│  • No data divergence                                           │
│  • CP (consistency over availability for minority)              │
│                                                                  │
│  Other Modes:                                                    │
│  • ignore: All nodes continue (risk of split-brain)            │
│  • autoheal: Automatic resolution (may lose data)              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Message Durability Levels

```
┌─────────────────────────────────────────────────────────────────┐
│                    DURABILITY CONFIGURATIONS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Level 1: Fire and Forget (No durability)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • delivery_mode=1 (transient)                          │   │
│  │  • No publisher confirms                                 │   │
│  │  • No consumer ACK (auto_ack=true)                      │   │
│  │  • Classic queue (non-durable)                          │   │
│  │                                                          │   │
│  │  Risk: Total message loss on any failure                │   │
│  │  Use: Metrics, non-critical logs                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Level 2: Basic Durability                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • delivery_mode=2 (persistent)                         │   │
│  │  • Publisher confirms                                    │   │
│  │  • Consumer manual ACK                                   │   │
│  │  • Classic queue (durable=true)                         │   │
│  │                                                          │   │
│  │  Risk: Single node failure loses unsynced data          │   │
│  │  Use: General purpose messaging                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Level 3: High Durability (Recommended)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • delivery_mode=2 (persistent)                         │   │
│  │  • Publisher confirms                                    │   │
│  │  • Consumer manual ACK                                   │   │
│  │  • Quorum queue (Raft replication)                      │   │
│  │                                                          │   │
│  │  Risk: Majority failure loses data (very rare)          │   │
│  │  Use: Critical business messages                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Level 4: Maximum Durability                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Level 3 + Multi-region federation                    │   │
│  │  • Idempotent consumers                                 │   │
│  │  • Application-level acknowledge (outbox pattern)       │   │
│  │                                                          │   │
│  │  Risk: Minimal (region-level disaster)                  │   │
│  │  Use: Financial transactions, compliance                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Disaster Recovery

### Federation for Cross-Cluster Replication

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEDERATION ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Use Case: Multi-region deployment, DR                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Region A (Primary)          Region B (Secondary)        │   │
│  │                                                          │   │
│  │  ┌─────────────────┐        ┌─────────────────┐         │   │
│  │  │   Cluster A     │        │   Cluster B     │         │   │
│  │  │                 │        │                 │         │   │
│  │  │  [Exchange]     │        │  [Exchange]     │         │   │
│  │  │      │          │        │      ▲          │         │   │
│  │  │      ▼          │        │      │          │         │   │
│  │  │  [Queue A]──────┼────────┼──────┘          │         │   │
│  │  │                 │ Feder- │  [Queue B]      │         │   │
│  │  │  [Federation    │ ation  │  (federated)    │         │   │
│  │  │   Upstream]     │        │                 │         │   │
│  │  └─────────────────┘        └─────────────────┘         │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Configuration:                                                  │
│  • Upstream: amqp://user:pass@cluster-a.region-a.example.com   │
│  • Policy: federate queues matching "federated.*"              │
│  • Federation consumes from upstream, republishes locally      │
│                                                                  │
│  Limitations:                                                    │
│  • Asynchronous (eventual consistency)                          │
│  • One-way by default (can configure bidirectional)            │
│  • Message ordering not guaranteed across federation            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Shovel for Queue Migration

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHOVEL ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Use Case: Data migration, cross-protocol transfer              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │   Source Cluster              Destination Cluster         │  │
│  │                                                           │  │
│  │   ┌─────────────┐            ┌─────────────┐             │  │
│  │   │ Source      │            │ Destination │             │  │
│  │   │ Queue       │───SHOVEL──►│ Queue       │             │  │
│  │   └─────────────┘            └─────────────┘             │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Shovel Configuration:                                          │
│  • src-uri: amqp://source-cluster                              │
│  • src-queue: source-queue                                     │
│  • dest-uri: amqp://dest-cluster                               │
│  • dest-queue: dest-queue                                      │
│  • ack-mode: on-confirm (safest)                               │
│  • prefetch-count: 100 (tunable)                               │
│                                                                  │
│  vs Federation:                                                  │
│  • Shovel: Point-to-point, explicit config per shovel          │
│  • Federation: Policy-based, pattern matching                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Backup and Restore

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKUP STRATEGIES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Definition Export (Metadata)                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • rabbitmqctl export_definitions backup.json            │   │
│  │  • Includes: users, vhosts, queues, exchanges, bindings │   │
│  │  • Does NOT include: messages                           │   │
│  │  • Restore: rabbitmqctl import_definitions backup.json  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  2. Filesystem Backup (Full)                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Stop node (or use quorum queue snapshot)             │   │
│  │  • Backup: /var/lib/rabbitmq/mnesia/                    │   │
│  │  • Includes: definitions + messages                     │   │
│  │  • Node-specific (hostname matters)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  3. Quorum Queue Snapshot                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Quorum queues have built-in checkpointing            │   │
│  │  • Raft log compaction creates snapshots                │   │
│  │  • Can be copied from node data directory               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  RTO/RPO Targets:                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Strategy           │  RPO          │  RTO               │  │
│  │──────────────────────│───────────────│────────────────────│  │
│  │  Definition export   │  0 (metadata) │  Minutes          │  │
│  │  Filesystem backup   │  Last backup  │  Hours            │  │
│  │  Quorum queues       │  0            │  Seconds          │  │
│  │  Federation (DR)     │  ~Seconds     │  Minutes          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scaling Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCALING DECISION TREE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Need higher throughput?                                         │
│  │                                                               │
│  ├── Single queue bottleneck?                                   │
│  │   └── YES → Shard queues (consistent hash exchange)          │
│  │                                                               │
│  ├── Node CPU saturated?                                        │
│  │   └── YES → Add broker nodes                                 │
│  │                                                               │
│  ├── Memory pressure?                                           │
│  │   ├── High queue depth → Use lazy queues                     │
│  │   └── Many connections → Connection pooling, add nodes       │
│  │                                                               │
│  └── Network bottleneck?                                        │
│      └── YES → Dedicated cluster network, topology optimization │
│                                                                  │
│  Need higher availability?                                       │
│  │                                                               │
│  ├── Single node failure tolerance?                             │
│  │   └── Quorum queues (3-node cluster)                         │
│  │                                                               │
│  ├── AZ failure tolerance?                                      │
│  │   └── Multi-AZ deployment (1 node per AZ)                    │
│  │                                                               │
│  └── Region failure tolerance?                                  │
│      └── Federation or shovel to DR region                      │
│                                                                  │
│  Need lower latency?                                             │
│  │                                                               │
│  ├── Publish latency high?                                      │
│  │   ├── Use transient messages (if acceptable)                 │
│  │   └── Tune fsync settings                                    │
│  │                                                               │
│  └── Consumer latency high?                                     │
│      ├── Increase prefetch                                      │
│      └── Use push (basic.consume) not pull (basic.get)          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Capacity Planning Checklist

### Pre-Production

- [ ] Determine peak message rate (msg/sec)
- [ ] Estimate average message size
- [ ] Identify durability requirements (quorum vs classic)
- [ ] Calculate queue depth requirements (burst tolerance)
- [ ] Size cluster: nodes = peak_rate / 50K per queue × safety_factor
- [ ] Plan for 3x traffic growth

### Infrastructure

- [ ] Multi-AZ deployment for HA
- [ ] Load balancer for connection distribution
- [ ] NVMe SSDs for message persistence
- [ ] 10Gbps network between nodes
- [ ] Dedicated cluster network for inter-node traffic

### Monitoring Setup

- [ ] Queue depth alerts
- [ ] Consumer count alerts
- [ ] Memory/disk watermark alerts
- [ ] Cluster partition alerts
- [ ] Message rate dashboards
