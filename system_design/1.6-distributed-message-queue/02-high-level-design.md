# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture

### Overview Diagram

```mermaid
flowchart TB
    subgraph Producers["Producer Layer"]
        P1[Producer 1<br/>Order Service]
        P2[Producer 2<br/>Payment Service]
        P3[Producer N<br/>Notification Service]
    end

    subgraph BrokerCluster["Message Queue Cluster"]
        subgraph Node1["Node 1"]
            E1[Exchange<br/>order.topic]
            Q1[Queue<br/>order.process]
            Q2[Queue<br/>order.analytics]
        end

        subgraph Node2["Node 2"]
            E2[Exchange<br/>payment.direct]
            Q3[Queue<br/>payment.process]
            DLQ1[DLQ<br/>payment.dlq]
        end

        subgraph Node3["Node 3"]
            E3[Exchange<br/>notification.fanout]
            Q4[Queue<br/>email.send]
            Q5[Queue<br/>sms.send]
        end

        Node1 <-->|Cluster Sync| Node2 <-->|Cluster Sync| Node3
    end

    subgraph Consumers["Consumer Layer"]
        C1[Consumer Group<br/>Order Processor]
        C2[Consumer<br/>Analytics Pipeline]
        C3[Consumer<br/>Payment Handler]
        C4[Consumer<br/>Email Worker]
        C5[Consumer<br/>SMS Worker]
    end

    P1 -->|Publish| E1
    P2 -->|Publish| E2
    P3 -->|Publish| E3

    E1 -->|Route| Q1 & Q2
    E2 -->|Route| Q3
    E3 -->|Broadcast| Q4 & Q5

    Q3 -.->|Dead Letter| DLQ1

    Q1 -->|Consume| C1
    Q2 -->|Consume| C2
    Q3 -->|Consume| C3
    Q4 -->|Consume| C4
    Q5 -->|Consume| C5
```

### Component Responsibilities

| Component | Responsibility | Scaling Strategy |
|-----------|---------------|------------------|
| **Producers** | Publish messages to exchanges with routing keys | Horizontal, stateless |
| **Exchanges** | Route messages to queues based on bindings | Replicated across cluster |
| **Queues** | Buffer messages until consumed | Distributed, quorum replication |
| **Consumers** | Process messages, send acknowledgments | Horizontal, competing consumers |
| **Cluster Nodes** | Host exchanges, queues, handle connections | Add nodes for capacity |

---

## Exchange Routing Architecture

### Direct Exchange Flow

```mermaid
flowchart LR
    subgraph Producer
        P1[Producer]
    end

    subgraph DirectExchange["Direct Exchange: orders"]
        EX[Exchange<br/>type=direct]
    end

    subgraph Queues
        Q1[Queue: orders.us<br/>binding: order.us]
        Q2[Queue: orders.eu<br/>binding: order.eu]
        Q3[Queue: orders.ap<br/>binding: order.ap]
    end

    P1 -->|"routing_key=order.us"| EX
    EX -->|exact match| Q1
    EX -.->|no match| Q2
    EX -.->|no match| Q3
```

### Topic Exchange Flow

```mermaid
flowchart LR
    subgraph Producer
        P1[Producer]
    end

    subgraph TopicExchange["Topic Exchange: events"]
        EX[Exchange<br/>type=topic]
    end

    subgraph Queues
        Q1["Queue: us-orders<br/>binding: order.us.*"]
        Q2["Queue: all-created<br/>binding: *.*.created"]
        Q3["Queue: all-events<br/>binding: #"]
    end

    P1 -->|"routing_key=order.us.created"| EX
    EX -->|"order.us.* ✓"| Q1
    EX -->|"*.*.created ✓"| Q2
    EX -->|"# ✓"| Q3
```

### Fanout Exchange Flow

```mermaid
flowchart LR
    subgraph Producer
        P1[Producer]
    end

    subgraph FanoutExchange["Fanout Exchange: notifications"]
        EX[Exchange<br/>type=fanout]
    end

    subgraph Queues
        Q1[Queue: email-notifications]
        Q2[Queue: sms-notifications]
        Q3[Queue: push-notifications]
        Q4[Queue: audit-log]
    end

    P1 -->|"any routing_key"| EX
    EX -->|broadcast| Q1
    EX -->|broadcast| Q2
    EX -->|broadcast| Q3
    EX -->|broadcast| Q4
```

---

## Data Flow Patterns

### Publish with Confirms

```mermaid
sequenceDiagram
    participant Producer
    participant Channel
    participant Exchange
    participant Queue
    participant Disk

    Producer->>Channel: enable_publisher_confirms()
    Producer->>Channel: publish(exchange, routing_key, message)
    Channel->>Exchange: route_message(routing_key)
    Exchange->>Queue: enqueue(message)

    alt Persistent Message
        Queue->>Disk: persist_to_disk()
        Disk-->>Queue: write_complete
    end

    alt Quorum Queue
        Queue->>Queue: replicate_to_followers()
        Queue-->>Queue: quorum_ack
    end

    Queue-->>Channel: message_accepted
    Channel-->>Producer: basic.ack(delivery_tag)

    Note over Producer: Producer can now<br/>discard message
```

### Consume with Manual ACK

```mermaid
sequenceDiagram
    participant Consumer
    participant Channel
    participant Queue
    participant DLX as Dead Letter Exchange

    Consumer->>Channel: basic.consume(queue, auto_ack=false)
    Consumer->>Channel: basic.qos(prefetch=10)

    loop Message Delivery
        Queue->>Channel: basic.deliver(message, delivery_tag)
        Channel->>Consumer: on_message(message)

        Consumer->>Consumer: process_message()

        alt Success
            Consumer->>Channel: basic.ack(delivery_tag)
            Channel->>Queue: remove_message()
        else Failure (Requeue)
            Consumer->>Channel: basic.nack(delivery_tag, requeue=true)
            Queue->>Queue: requeue_message()
        else Failure (Discard/DLQ)
            Consumer->>Channel: basic.nack(delivery_tag, requeue=false)
            Queue->>DLX: route_to_dlx(message)
        end
    end
```

### Dead Letter Flow

```mermaid
sequenceDiagram
    participant Producer
    participant MainQueue as Main Queue
    participant DLX as Dead Letter Exchange
    participant DLQ as Dead Letter Queue
    participant DLQConsumer as DLQ Consumer

    Producer->>MainQueue: publish(message)

    Note over MainQueue: Message can be dead-lettered due to:<br/>1. Rejected (nack, requeue=false)<br/>2. TTL expired<br/>3. Queue max-length exceeded

    alt Message Rejected
        MainQueue->>MainQueue: consumer nack(requeue=false)
        MainQueue->>DLX: route(message + x-death headers)
    else TTL Expired
        MainQueue->>MainQueue: check_ttl()
        MainQueue->>DLX: route(message + x-death headers)
    else Queue Full
        MainQueue->>DLX: route(oldest_message + x-death headers)
    end

    DLX->>DLQ: enqueue(message)

    Note over DLQ: x-death headers contain:<br/>- reason (rejected/expired/maxlen)<br/>- original queue<br/>- death count<br/>- timestamp

    DLQ->>DLQConsumer: deliver(message)
    DLQConsumer->>DLQConsumer: log_error() or retry_logic()
```

---

## Cluster Architecture

### Multi-Node Topology

```mermaid
flowchart TB
    subgraph Clients
        P1[Producers]
        C1[Consumers]
    end

    subgraph LoadBalancer["Load Balancer"]
        LB[HAProxy/NLB]
    end

    subgraph Cluster["RabbitMQ Cluster"]
        subgraph AZ1["Availability Zone 1"]
            N1[Node 1<br/>Quorum Leader]
        end

        subgraph AZ2["Availability Zone 2"]
            N2[Node 2<br/>Quorum Follower]
        end

        subgraph AZ3["Availability Zone 3"]
            N3[Node 3<br/>Quorum Follower]
        end

        N1 <-->|Raft Replication| N2
        N2 <-->|Raft Replication| N3
        N1 <-->|Raft Replication| N3
    end

    P1 & C1 --> LB
    LB --> N1 & N2 & N3
```

### Quorum Queue Replication

```mermaid
sequenceDiagram
    participant Producer
    participant Leader as Leader Node
    participant F1 as Follower 1
    participant F2 as Follower 2

    Producer->>Leader: publish(message)
    Leader->>Leader: append_to_raft_log()

    par Replicate to followers
        Leader->>F1: append_entries(message)
        Leader->>F2: append_entries(message)
    end

    F1-->>Leader: ack
    F2-->>Leader: ack

    Note over Leader: Quorum achieved (2/3)

    Leader->>Leader: commit_message()
    Leader-->>Producer: confirm

    Leader->>F1: commit_index_update
    Leader->>F2: commit_index_update
```

---

## Key Architectural Decisions

### Decision 1: Queue Type Selection

| Queue Type | Consistency | Performance | Use Case |
|------------|-------------|-------------|----------|
| **Classic Queue** | Eventual | Highest throughput | Non-critical, high volume |
| **Quorum Queue** | Strong (Raft) | Good | Critical data, HA required |
| **Stream** | Strong | Very High | Replay needed, high throughput |

**Recommendation:** Quorum queues for production workloads requiring durability.

**Rationale:**
- Raft consensus provides strong durability guarantees
- Automatic leader election on node failure
- No data loss with proper quorum
- Acceptable performance for most use cases

### Decision 2: Exchange Type Selection

| Exchange Type | Routing Logic | Performance | Use Case |
|---------------|---------------|-------------|----------|
| **Direct** | Exact key match | Highest | Point-to-point, work queues |
| **Fanout** | Broadcast all | High | Pub/sub, notifications |
| **Topic** | Pattern wildcards | Medium | Flexible routing, filtering |
| **Headers** | Header attributes | Lowest | Complex attribute routing |

**Recommendation:** Direct for work queues, Topic for flexible pub/sub.

### Decision 3: Acknowledgment Strategy

| Strategy | Guarantee | Throughput | Use Case |
|----------|-----------|------------|----------|
| **Auto ACK** | At-most-once | Highest | Metrics, non-critical |
| **Manual ACK** | At-least-once | Medium | Default for most apps |
| **Manual ACK + Dedup** | Exactly-once | Lower | Financial, orders |

**Recommendation:** Manual ACK with consumer-side idempotency.

### Decision 4: Message Persistence

| Option | Durability | Performance | Use Case |
|--------|------------|-------------|----------|
| **Transient** | None (in-memory) | Highest | Temporary data, cache invalidation |
| **Persistent** | Survives restart | Medium | Default for important data |
| **Lazy Queue** | Disk-first | Variable | Large backlogs, memory-constrained |

**Recommendation:** Persistent messages with quorum queues.

### Decision 5: Prefetch Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    PREFETCH CONFIGURATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Prefetch = 1 (Fair dispatch)                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Consumer 1: [M1] → process → ack → [M3] → ...          │   │
│  │  Consumer 2: [M2] → process → ack → [M4] → ...          │   │
│  │                                                          │   │
│  │  Pros: Even distribution, no overloaded consumers        │   │
│  │  Cons: Lower throughput, more round trips               │   │
│  │  Use: Long-running tasks, heterogeneous workers         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Prefetch = 10-100 (Batched dispatch)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Consumer 1: [M1,M2,M3...M10] → process batch → ack     │   │
│  │  Consumer 2: [M11,M12...M20] → process batch → ack      │   │
│  │                                                          │   │
│  │  Pros: Higher throughput, fewer round trips              │   │
│  │  Cons: Uneven if processing times vary                  │   │
│  │  Use: Fast processing, homogeneous workers              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Recommendation:                                                 │
│  • Start with prefetch=10                                       │
│  • Tune based on processing time and consumer count            │
│  • For long tasks: prefetch=1                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| ✅ Push vs Pull | Push (broker → consumer) | Low latency, immediate delivery |
| ✅ Sync vs Async | Async (non-blocking publish) | High throughput, decoupling |
| ✅ Stateful vs Stateless | Stateful (broker holds messages) | Buffering is core responsibility |
| ✅ Leader-Follower | Quorum (Raft-based) | Strong consistency, HA |
| ✅ Message Routing | Exchange-based | Flexible routing patterns |
| ✅ Acknowledgment | Manual ACK | Guaranteed processing |

---

## Integration Points

### Upstream (Producers)

| Producer Type | Protocol | Pattern |
|---------------|----------|---------|
| Application services | AMQP 0-9-1 | Direct publish |
| API gateways | AMQP | Request buffering |
| Event generators | AMQP | Event emission |
| Scheduled jobs | AMQP | Task scheduling |

### Downstream (Consumers)

| Consumer Type | Pattern | Concurrency |
|---------------|---------|-------------|
| Worker services | Competing consumers | Multiple workers per queue |
| Notification services | Fanout consumers | One per notification type |
| Analytics pipelines | Topic subscribers | Filtered consumption |
| Dead letter handlers | DLQ consumers | Retry/logging |

### Supporting Services

| Service | Purpose | Failure Impact |
|---------|---------|----------------|
| Load Balancer | Connection distribution | Failover to other nodes |
| DNS | Cluster discovery | Connection failures |
| Monitoring | Metrics collection | No functional impact |
| Secrets Manager | Credential rotation | Auth failures |

---

## Failure Modes and Mitigation

### Node Failure

```mermaid
flowchart TB
    subgraph Before["Before: Node 1 is Queue Leader"]
        N1A[Node 1<br/>Leader ★]
        N2A[Node 2<br/>Follower]
        N3A[Node 3<br/>Follower]
    end

    subgraph During["Node 1 Fails"]
        N1B[Node 1<br/>❌ DOWN]
        N2B[Node 2<br/>Follower]
        N3B[Node 3<br/>Follower]
    end

    subgraph After["After: New Leader Elected"]
        N1C[Node 1<br/>❌ DOWN]
        N2C[Node 2<br/>Leader ★]
        N3C[Node 3<br/>Follower]
    end

    Before -->|"Node 1<br/>crashes"| During
    During -->|"Raft election<br/>(~10 sec)"| After
```

### Failure Mitigation Strategies

```
┌─────────────────────────────────────────────────────────────────┐
│                  FAILURE MITIGATION LAYERS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Publisher Confirms                                    │
│  ├── Wait for broker confirmation before discarding             │
│  ├── Retry on timeout or nack                                   │
│  └── Maintain outbox for recovery                               │
│                                                                  │
│  Layer 2: Quorum Queues                                         │
│  ├── Raft replication to multiple nodes                        │
│  ├── Automatic leader election on failure                       │
│  └── No data loss with quorum                                   │
│                                                                  │
│  Layer 3: Consumer ACK                                          │
│  ├── Message redelivered if consumer crashes                    │
│  ├── Prefetch limits unacked message exposure                  │
│  └── Idempotent processing handles redelivery                  │
│                                                                  │
│  Layer 4: Dead Letter Queues                                    │
│  ├── Capture failed messages for analysis                       │
│  ├── Implement retry strategies                                 │
│  └── Alert on DLQ growth                                        │
│                                                                  │
│  Layer 5: Cluster Redundancy                                    │
│  ├── Multi-AZ deployment                                        │
│  ├── Pause-minority partition handling                          │
│  └── Federation for DR                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

| Failure | Detection | Mitigation | Impact |
|---------|-----------|------------|--------|
| Single node | Heartbeat (5s) | Raft leader election | ~10s unavailability for affected queues |
| Network partition | Cluster partition detector | Pause-minority mode | Minority side stops accepting writes |
| Disk failure | I/O errors | Node marked down, data on replicas | No data loss with quorum |
| Consumer crash | No heartbeat | Message redelivered to other consumer | Brief reprocessing delay |

---

## Deployment Topology Options

### Option 1: Single Region, Multi-AZ (Recommended)

```mermaid
flowchart TB
    subgraph Region["Primary Region"]
        subgraph AZ1["Availability Zone 1"]
            N1[Node 1]
        end

        subgraph AZ2["Availability Zone 2"]
            N2[Node 2]
        end

        subgraph AZ3["Availability Zone 3"]
            N3[Node 3]
        end
    end

    N1 <-->|Raft| N2 <-->|Raft| N3
```

**Configuration:**
- 3 AZs, one node per AZ
- Quorum queues span all nodes
- Survives single AZ failure

### Option 2: Multi-Region with Federation

```mermaid
flowchart TB
    subgraph Region1["Region 1 (Primary)"]
        C1[Cluster<br/>3 nodes]
        FU1[Federation Upstream]
    end

    subgraph Region2["Region 2 (Secondary)"]
        C2[Cluster<br/>3 nodes]
        FD1[Federation Downstream]
    end

    FU1 -->|Federate queues| FD1
```

**Use Case:** Disaster recovery, geo-distributed consumers

### Option 3: Shovel for Cross-Cluster

```mermaid
flowchart LR
    subgraph Source["Source Cluster"]
        SQ[Source Queue]
        Shovel[Shovel]
    end

    subgraph Dest["Destination Cluster"]
        DQ[Destination Queue]
    end

    SQ --> Shovel
    Shovel -->|AMQP| DQ
```

**Use Case:** One-way replication, data migration

### Deployment Comparison

| Aspect | Single Region Multi-AZ | Multi-Region Federation | Multi-Region Shovel |
|--------|------------------------|------------------------|---------------------|
| Latency | 1-5ms | Local: 1-5ms, cross-region: 50-200ms | Same as federation |
| Consistency | Strong (Raft) | Eventual | Eventual |
| Failover | Automatic | Manual | Manual |
| Complexity | Low | Medium | Low |
| Use Case | Most applications | Active-active | Data migration, DR |
