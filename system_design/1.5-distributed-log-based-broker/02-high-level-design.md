# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture

### Overview Diagram (KRaft Mode)

```mermaid
flowchart TB
    subgraph Producers["Producer Layer"]
        P1[Producer 1]
        P2[Producer 2]
        P3[Producer N]
    end

    subgraph BrokerCluster["Broker Cluster"]
        subgraph Controller["KRaft Controller Quorum"]
            C1[Controller 1<br/>Active]
            C2[Controller 2<br/>Follower]
            C3[Controller 3<br/>Follower]
        end

        subgraph Brokers["Data Brokers"]
            B1[Broker 1<br/>Topic-A P0 Leader<br/>Topic-A P1 Follower]
            B2[Broker 2<br/>Topic-A P0 Follower<br/>Topic-A P1 Leader]
            B3[Broker 3<br/>Topic-A P0 Follower<br/>Topic-A P1 Follower]
        end

        C1 <-->|Raft Consensus| C2 & C3
        Controller -->|Metadata Updates| Brokers
    end

    subgraph Consumers["Consumer Layer"]
        subgraph CG1["Consumer Group: analytics"]
            Con1[Consumer 1<br/>P0]
            Con2[Consumer 2<br/>P1]
        end

        subgraph CG2["Consumer Group: notifications"]
            Con3[Consumer 1<br/>P0, P1]
        end
    end

    P1 & P2 & P3 -->|Produce| BrokerCluster
    BrokerCluster -->|Consume| CG1 & CG2
```

### Component Responsibilities

| Component | Responsibility | Scaling Strategy |
|-----------|---------------|------------------|
| **Producers** | Serialize messages, batch, send to partition leaders | Horizontal, stateless |
| **KRaft Controllers** | Cluster metadata, leader election, topic management | 3-5 nodes (odd number for quorum) |
| **Brokers** | Store log segments, serve produce/fetch requests | Horizontal, add brokers + rebalance |
| **Consumers** | Poll messages, process, commit offsets | Horizontal, max = partition count |
| **Schema Registry** | Schema validation, evolution, compatibility | Horizontal, stateless (with shared storage) |

---

## KRaft Architecture (ZooKeeper-less)

### KRaft vs ZooKeeper

```mermaid
flowchart LR
    subgraph Legacy["Legacy: ZooKeeper Mode"]
        ZK1[ZooKeeper 1]
        ZK2[ZooKeeper 2]
        ZK3[ZooKeeper 3]
        LB1[Broker 1]
        LB2[Broker 2]
        LB3[Broker 3]

        ZK1 <--> ZK2 <--> ZK3
        LB1 & LB2 & LB3 --> ZK1
    end

    subgraph Modern["Modern: KRaft Mode"]
        KC1[Controller 1<br/>+Broker]
        KC2[Controller 2<br/>+Broker]
        KC3[Controller 3<br/>+Broker]
        KB1[Broker 4]
        KB2[Broker 5]

        KC1 <-->|Raft| KC2 <-->|Raft| KC3
        KC1 & KC2 & KC3 <-->|Metadata| KB1 & KB2
    end
```

### KRaft Metadata Flow

```mermaid
sequenceDiagram
    participant Admin as Admin Client
    participant Active as Active Controller
    participant Follower as Follower Controllers
    participant Broker as Brokers

    Admin->>Active: CreateTopic(orders, partitions=3, RF=3)
    Active->>Active: Append to metadata log
    Active->>Follower: Replicate via Raft

    par Metadata propagation
        Active->>Broker: Push metadata update
    end

    Broker->>Broker: Update local metadata cache
    Active-->>Admin: TopicCreated

    Note over Broker: Broker fetches metadata<br/>from active controller<br/>on startup/reconnect
```

### Controller Quorum Roles

| Role | Count | Responsibility |
|------|-------|----------------|
| **Active Controller** | 1 | Handles all write requests, leads Raft quorum |
| **Follower Controllers** | 2+ | Replicate metadata log, ready for failover |
| **Observer (optional)** | Any | Read-only, for metadata queries |

---

## Partition Distribution

### Partition Layout Across Brokers

```mermaid
flowchart TB
    subgraph Topic["Topic: order-events (6 partitions, RF=3)"]
        subgraph Broker1["Broker 1"]
            P0L["P0 (Leader)"]
            P1F1["P1 (Follower)"]
            P3F1["P3 (Follower)"]
        end

        subgraph Broker2["Broker 2"]
            P0F1["P0 (Follower)"]
            P1L["P1 (Leader)"]
            P4L["P4 (Leader)"]
        end

        subgraph Broker3["Broker 3"]
            P0F2["P0 (Follower)"]
            P2L["P2 (Leader)"]
            P5L["P5 (Leader)"]
        end

        subgraph Broker4["Broker 4"]
            P1F2["P1 (Follower)"]
            P3L["P3 (Leader)"]
            P4F1["P4 (Follower)"]
        end

        subgraph Broker5["Broker 5"]
            P2F1["P2 (Follower)"]
            P3F2["P3 (Follower)"]
            P5F1["P5 (Follower)"]
        end
    end
```

### Partition Assignment Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                 PARTITION ASSIGNMENT GOALS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. LEADER BALANCE                                              │
│     • Distribute leader partitions evenly across brokers        │
│     • Each broker should lead roughly equal partitions          │
│                                                                  │
│  2. REPLICA DISTRIBUTION                                        │
│     • Replicas of same partition on different brokers           │
│     • Ideally in different racks/availability zones             │
│                                                                  │
│  3. RACK AWARENESS                                              │
│     • Replicas spread across failure domains                    │
│     • Survive rack/AZ failure without data loss                 │
│                                                                  │
│  Example: 3 partitions, RF=3, 3 brokers, 3 racks               │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Rack A      │  Rack B      │  Rack C                  │    │
│  │  Broker 1    │  Broker 2    │  Broker 3                │    │
│  │  ──────────  │  ──────────  │  ──────────              │    │
│  │  P0 (L)      │  P0 (F)      │  P0 (F)                  │    │
│  │  P1 (F)      │  P1 (L)      │  P1 (F)                  │    │
│  │  P2 (F)      │  P2 (F)      │  P2 (L)                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Result: Any single rack failure → no data loss, no downtime   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Patterns

### Write Path (Producer → Broker)

```mermaid
sequenceDiagram
    participant Producer
    participant Leader as Partition Leader
    participant F1 as Follower 1
    participant F2 as Follower 2

    Producer->>Producer: 1. Serialize message
    Producer->>Producer: 2. Determine partition (key hash or round-robin)
    Producer->>Producer: 3. Batch messages (linger.ms)

    Producer->>Leader: 4. ProduceRequest (batch)
    Leader->>Leader: 5. Validate, assign offset
    Leader->>Leader: 6. Append to log segment

    alt acks=all (recommended)
        par Replication
            Leader->>F1: Replicate batch
            Leader->>F2: Replicate batch
        end
        F1-->>Leader: ACK
        F2-->>Leader: ACK
        Leader->>Leader: 7. Update high watermark
        Leader-->>Producer: 8. ProduceResponse (success)
    else acks=1
        Leader-->>Producer: 8. ProduceResponse (success)
        par Async replication
            Leader->>F1: Replicate batch
            Leader->>F2: Replicate batch
        end
    else acks=0
        Note over Producer: Fire and forget
    end
```

### Read Path (Broker → Consumer)

```mermaid
sequenceDiagram
    participant Consumer
    participant Coordinator as Group Coordinator
    participant Leader as Partition Leader

    Consumer->>Coordinator: 1. JoinGroup (group.id)
    Coordinator-->>Consumer: 2. Partition assignment

    loop Poll loop
        Consumer->>Leader: 3. FetchRequest (offset=1000, maxBytes=1MB)

        alt Data in page cache
            Leader-->>Consumer: 4a. FetchResponse (records) [fast]
        else Data on disk
            Leader->>Leader: Read from disk
            Leader-->>Consumer: 4b. FetchResponse (records) [slower]
        end

        Consumer->>Consumer: 5. Process records

        alt Auto-commit
            Consumer->>Coordinator: 6a. OffsetCommit (auto, async)
        else Manual commit
            Consumer->>Coordinator: 6b. OffsetCommit (manual)
            Coordinator-->>Consumer: CommitResponse
        end
    end
```

### Replication Flow

```mermaid
sequenceDiagram
    participant Leader as Partition Leader
    participant F1 as Follower 1 (ISR)
    participant F2 as Follower 2 (ISR)
    participant F3 as Follower 3 (Out of sync)

    Note over Leader: High Watermark = 100<br/>Log End Offset = 105

    par Followers fetch from leader
        F1->>Leader: Fetch(offset=101)
        F2->>Leader: Fetch(offset=100)
        F3->>Leader: Fetch(offset=50)
    end

    Leader-->>F1: Records 101-105
    Leader-->>F2: Records 100-105
    Leader-->>F3: Records 50-105

    F1->>F1: Append records
    F2->>F2: Append records
    F3->>F3: Append records (catching up)

    Note over Leader: F1 caught up to 105<br/>F2 caught up to 105<br/>F3 still at 105 (was 50)

    Leader->>Leader: Update ISR = {Leader, F1, F2}<br/>High Watermark = 105

    Note over F3: F3 rejoins ISR after<br/>catching up and staying<br/>in sync for replica.lag.time.max.ms
```

---

## Key Architectural Decisions

### Decision 1: Metadata Management

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| ZooKeeper | External coordination service | Mature, battle-tested | Operational complexity, separate system |
| **KRaft (Recommended)** | Internal Raft-based quorum | Single system, faster failover, simpler ops | Newer (GA in Kafka 3.3+) |

**Recommendation:** KRaft for all new deployments (Kafka 3.3+).

**Rationale:**
- Single system to operate
- Faster controller failover (seconds vs minutes)
- Better scalability (millions of partitions)
- No ZooKeeper znodes limits

### Decision 2: Replication Strategy

| Option | Description | Durability | Performance |
|--------|-------------|------------|-------------|
| Synchronous (all) | Wait for all replicas | Highest | Slower |
| **ISR-based (Recommended)** | Wait for in-sync replicas | High | Good |
| Asynchronous | Leader only | Lower | Fastest |

**Recommendation:** ISR-based with `acks=all` and `min.insync.replicas=2`.

**Rationale:**
- Balances durability and performance
- Tolerates slow/failed replicas
- Industry standard configuration

### Decision 3: Message Routing

| Option | Description | Ordering | Distribution |
|--------|-------------|----------|--------------|
| **Key-based hashing** | hash(key) % partitions | Per-key ordering | Uneven if skewed keys |
| Round-robin | Rotate across partitions | No ordering | Even distribution |
| Custom partitioner | Application logic | Application-defined | Application-controlled |

**Recommendation:** Key-based hashing for ordered streams, round-robin for logs/metrics.

**Rationale:**
- Most applications need per-entity ordering (orders by customer, events by user)
- Key-based ensures same key → same partition → ordering

### Decision 4: Consumer Offset Storage

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Internal topic (__consumer_offsets)** | Store in Kafka | Self-contained, replicated | Coupled to Kafka |
| External (database) | Store in external DB | Decoupled | Additional dependency |

**Recommendation:** Internal `__consumer_offsets` topic (default).

**Rationale:**
- No external dependencies
- Same durability guarantees as data
- Automatic compaction

### Decision 5: Log Retention Strategy

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **Time-based** | Delete after N days | Event streams, logs |
| Size-based | Delete when log exceeds N GB | Storage-constrained |
| **Compaction** | Keep latest per key | State snapshots, changelog |

**Recommendation:** Time-based for events (7 days), compaction for state topics.

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| ✅ Sync vs Async | Sync for produce (acks=all), async for replication (ISR) | Durability for writes, performance for replication |
| ✅ Push vs Pull | Pull (consumer polls) | Consumer controls rate, handles backpressure |
| ✅ Stateful vs Stateless | Stateful (brokers hold logs) | Log storage is core responsibility |
| ✅ Leader-Follower | Per-partition leader | Single writer, consistent ordering |
| ✅ Partitioning | Key-based hash | Per-key ordering, parallelism |
| ✅ Batch vs Individual | Batching (producer and consumer) | Throughput optimization |

---

## Integration Points

### Upstream (Producers)

| Producer Type | Protocol | Usage Pattern |
|---------------|----------|---------------|
| Application services | TCP (Kafka protocol) | Direct produce |
| CDC connectors | Kafka Connect | Database change events |
| HTTP gateways | REST Proxy | Legacy/simple integrations |
| Stream processors | Kafka Streams / Flink | Processed output |

### Downstream (Consumers)

| Consumer Type | Protocol | Usage Pattern |
|---------------|----------|---------------|
| Application services | TCP (Kafka protocol) | Direct consume |
| Data pipelines | Kafka Connect | Sink to storage |
| Stream processors | Kafka Streams / Flink | Real-time processing |
| Analytics | Batch consumers | Periodic batch processing |

### Supporting Services

| Service | Purpose | Failure Impact |
|---------|---------|----------------|
| Schema Registry | Schema validation | Produce/consume failures |
| Monitoring | Metrics collection | No functional impact |
| Alerting | Incident detection | Delayed incident response |

---

## Failure Modes and Mitigation

### Broker Failure

```mermaid
flowchart TB
    subgraph Before["Before: Broker 2 is leader for P1"]
        B1A[Broker 1<br/>P1 Follower]
        B2A[Broker 2<br/>P1 Leader ★]
        B3A[Broker 3<br/>P1 Follower]
    end

    subgraph During["Broker 2 Fails"]
        B1B[Broker 1<br/>P1 Follower]
        B2B[Broker 2<br/>❌ DOWN]
        B3B[Broker 3<br/>P1 Follower]
    end

    subgraph After["After: New leader elected"]
        B1C[Broker 1<br/>P1 Leader ★]
        B2C[Broker 2<br/>❌ DOWN]
        B3C[Broker 3<br/>P1 Follower]
    end

    Before -->|"Broker 2<br/>crashes"| During
    During -->|"Controller elects<br/>new leader from ISR"| After
```

| Failure | Detection | Mitigation | Impact |
|---------|-----------|------------|--------|
| Single broker | Heartbeat timeout (10s) | Controller elects new leader | Brief unavailability for affected partitions |
| Multiple brokers | Same | Elect from remaining ISR | May reduce ISR below minimum |
| Controller | Raft leader election | Follower becomes active | Metadata operations paused |
| Network partition | Heartbeat failure | ISR shrinks, continue with available | Split-brain prevented by ISR |

### Mitigation Strategies

```
┌─────────────────────────────────────────────────────────────────┐
│                  FAILURE MITIGATION LAYERS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Producer Retries                                      │
│  ├── Retry on transient failures (NOT_LEADER, TIMEOUT)         │
│  ├── Idempotent producer prevents duplicates on retry           │
│  └── Configurable retry count and backoff                       │
│                                                                  │
│  Layer 2: ISR-based Replication                                 │
│  ├── Data on multiple brokers before acknowledgment            │
│  ├── min.insync.replicas ensures durability threshold          │
│  └── Automatic ISR shrink/expand                                │
│                                                                  │
│  Layer 3: Automatic Leader Election                             │
│  ├── Controller detects broker failure                          │
│  ├── Elects new leader from ISR                                 │
│  └── Typical failover: 1-5 seconds                              │
│                                                                  │
│  Layer 4: Consumer Group Rebalancing                            │
│  ├── Consumers detect partition reassignment                    │
│  ├── Rebalance protocol reassigns partitions                    │
│  └── Processing continues after rebalance                       │
│                                                                  │
│  Layer 5: Multi-region Replication                              │
│  ├── MirrorMaker 2 for cross-region                            │
│  ├── Active-passive or active-active                            │
│  └── Disaster recovery capability                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deployment Topology Options

### Option 1: Single Region, Multi-AZ (Recommended Start)

```mermaid
flowchart TB
    subgraph Region["Primary Region"]
        subgraph AZ1["Availability Zone 1"]
            B1[Broker 1]
            C1[Controller 1]
        end
        subgraph AZ2["Availability Zone 2"]
            B2[Broker 2]
            C2[Controller 2]
        end
        subgraph AZ3["Availability Zone 3"]
            B3[Broker 3]
            C3[Controller 3]
        end
    end

    B1 <-->|Replication| B2 <-->|Replication| B3
    C1 <-->|Raft| C2 <-->|Raft| C3
```

**Configuration:**
- 3 AZs, rack awareness enabled
- RF=3 ensures replicas in each AZ
- Survives single AZ failure

### Option 2: Multi-Region Active-Passive

```mermaid
flowchart TB
    subgraph Primary["Primary Region (US-East)"]
        PB1[Broker 1-3]
        PC1[Controllers]
        PP[Producers]
        PCon[Consumers]
    end

    subgraph DR["DR Region (US-West)"]
        DB1[Broker 1-3]
        DC1[Controllers]
        MM[MirrorMaker 2]
    end

    PP -->|Write| PB1
    PB1 -->|Read| PCon
    PB1 -->|Replicate| MM
    MM -->|Write| DB1
```

**Use Case:** Disaster recovery, compliance (data locality)

### Option 3: Multi-Region Active-Active

```mermaid
flowchart TB
    subgraph Region1["Region 1 (US-East)"]
        R1B[Brokers]
        R1P[Local Producers]
        R1C[Local Consumers]
        R1MM[MirrorMaker]
    end

    subgraph Region2["Region 2 (EU-West)"]
        R2B[Brokers]
        R2P[Local Producers]
        R2C[Local Consumers]
        R2MM[MirrorMaker]
    end

    R1P -->|Write| R1B
    R1B -->|Read| R1C
    R2P -->|Write| R2B
    R2B -->|Read| R2C

    R1B <-->|Bidirectional| R2B
    R1MM -->|Replicate| R2B
    R2MM -->|Replicate| R1B
```

**Use Case:** Global applications, low latency for all regions

**Challenges:**
- Topic naming (prefix by region to avoid conflicts)
- Consumer offset synchronization
- Duplicate handling for bi-directional replication

### Deployment Comparison

| Aspect | Single Region Multi-AZ | Multi-Region Active-Passive | Multi-Region Active-Active |
|--------|----------------------|----------------------------|---------------------------|
| Latency | 1-5ms | Local: 1-5ms, cross-region: 50-200ms | Local: 1-5ms |
| Availability | 99.99% (AZ resilient) | 99.99% + DR capability | 99.999% |
| Complexity | Low | Medium | High |
| Cost | $$ | $$$ | $$$$ |
| RTO | Minutes | Hours (failover) | Near-zero |
| RPO | 0 (ISR) | Replication lag | Replication lag |
| Use Case | Most applications | Compliance, DR | Global, zero-downtime |
