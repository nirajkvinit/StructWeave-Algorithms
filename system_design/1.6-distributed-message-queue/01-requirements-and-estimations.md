# Requirements and Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Messaging

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Publish Messages** | Producers publish messages to exchanges with routing keys | P0 |
| **Route Messages** | Exchanges route messages to queues via bindings | P0 |
| **Consume Messages** | Consumers receive messages from queues | P0 |
| **Acknowledge Messages** | Consumers ACK/NACK messages for delivery guarantees | P0 |
| **Publisher Confirms** | Broker confirms message persistence to producer | P0 |
| **Dead Letter Handling** | Route failed/expired messages to DLQ | P1 |
| **Message TTL** | Messages expire after configurable time | P1 |
| **Message Priority** | Higher priority messages delivered first | P2 |

### Exchange and Routing

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Direct Exchange** | Route by exact routing key match | P0 |
| **Fanout Exchange** | Broadcast to all bound queues | P0 |
| **Topic Exchange** | Pattern matching with wildcards | P1 |
| **Headers Exchange** | Route by message header attributes | P2 |
| **Custom Bindings** | Flexible exchange-to-queue bindings | P0 |

### Queue Management

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Durable Queues** | Survive broker restart | P0 |
| **Exclusive Queues** | Single consumer, auto-delete | P1 |
| **Queue Arguments** | TTL, max length, dead letter config | P1 |
| **Quorum Queues** | Raft-based replicated queues | P0 |
| **Lazy Queues** | Page messages to disk eagerly | P2 |

### Consumer Features

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Prefetch/QoS** | Limit unacknowledged messages per consumer | P0 |
| **Consumer Tags** | Identify consumers for management | P1 |
| **Exclusive Consume** | Single consumer per queue | P1 |
| **Consumer Priorities** | Prefer certain consumers | P2 |

---

## Non-Functional Requirements

### Performance

| Metric | Target | Justification |
|--------|--------|---------------|
| **Publish Latency (p99)** | < 5ms | Fast producer acknowledgment |
| **Delivery Latency (p99)** | < 10ms | Push-based delivery to consumers |
| **Throughput (per queue)** | 10K-50K msg/sec | Single queue limitation |
| **Throughput (cluster)** | 100K-500K msg/sec | Multiple queues, proper sharding |
| **Message Size** | Up to 128MB (default 128KB) | Large payloads supported |

### Availability and Reliability

| Metric | Target | Justification |
|--------|--------|---------------|
| **Availability** | 99.99% (52 min/year downtime) | Mission-critical messaging |
| **Durability** | No message loss (quorum queues) | Financial, order processing |
| **RPO** | 0 (synchronous replication) | Quorum queue guarantee |
| **RTO** | < 30 seconds | Automatic failover |

### Consistency Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONSISTENCY TRADE-OFFS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Queue Type        │ Consistency │ Availability │ Partition     │
│  ──────────────────│─────────────│──────────────│───────────    │
│  Classic Queue     │ Eventual    │ High         │ Tolerant      │
│  Quorum Queue      │ Strong      │ Majority     │ CP            │
│  Stream            │ Strong      │ Majority     │ CP            │
│                                                                  │
│  CAP Positioning:                                                │
│  • Classic queues: AP (availability over consistency)           │
│  • Quorum queues: CP (consistency over availability)            │
│                                                                  │
│  Recommendation: Quorum queues for critical data                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Scalability

| Dimension | Target | Strategy |
|-----------|--------|----------|
| **Connections** | 10K-100K concurrent | Connection pooling, channels |
| **Queues** | 10K+ per cluster | Distributed across nodes |
| **Messages/Queue** | Millions (lazy queues) | Paging to disk |
| **Cluster Size** | 3-9 nodes (quorum) | Raft consensus limitation |

---

## Capacity Estimations

### Traffic Assumptions

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRAFFIC ASSUMPTIONS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Scenario: E-commerce Order Processing                          │
│                                                                  │
│  Peak Messages:                                                  │
│  • Orders: 10K orders/sec × 5 events/order = 50K msg/sec       │
│  • Notifications: 30K msg/sec                                   │
│  • Analytics events: 100K msg/sec                               │
│  • Total: ~180K msg/sec peak                                    │
│                                                                  │
│  Average Messages:                                               │
│  • ~50K msg/sec average (30% of peak)                          │
│                                                                  │
│  Message Size:                                                   │
│  • Order events: ~2KB average                                   │
│  • Notifications: ~500 bytes                                    │
│  • Analytics: ~1KB                                              │
│  • Weighted average: ~1KB                                       │
│                                                                  │
│  Daily Volume:                                                   │
│  • 50K msg/sec × 86,400 sec = 4.3B messages/day                │
│  • 4.3B × 1KB = 4.3TB data/day (before replication)            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Memory Estimation

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEMORY REQUIREMENTS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Per-Connection Memory:                                          │
│  • TCP buffer: ~128KB                                           │
│  • Channel overhead: ~10KB per channel                          │
│  • Typical: 1 connection × 5 channels = ~180KB                  │
│                                                                  │
│  Connection Scaling:                                             │
│  • 10K connections × 180KB = 1.8GB RAM for connections          │
│  • 50K connections × 180KB = 9GB RAM for connections            │
│                                                                  │
│  Per-Message Memory (in-flight):                                │
│  • Message metadata: ~200 bytes                                 │
│  • Message body: ~1KB average                                   │
│  • Total: ~1.2KB per message                                    │
│                                                                  │
│  Queue Memory (before paging):                                   │
│  • Target: 50K messages in-memory per queue                     │
│  • 50K × 1.2KB = 60MB per queue                                │
│  • 100 queues × 60MB = 6GB for queue buffers                   │
│                                                                  │
│  Total Broker Memory:                                            │
│  • Erlang VM + runtime: 2GB                                     │
│  • Connections: 2-10GB                                          │
│  • Queue buffers: 5-20GB                                        │
│  • Recommended: 32-64GB RAM per node                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Disk Estimation

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISK REQUIREMENTS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Message Persistence:                                            │
│  • Average queue depth: 100K messages (bursts)                  │
│  • Message size: 1KB                                            │
│  • Per queue: 100MB average, 1GB peak                          │
│                                                                  │
│  Quorum Queue Overhead:                                          │
│  • Raft log segments: 8MB each                                  │
│  • Snapshot intervals                                           │
│  • ~20% overhead for replication metadata                       │
│                                                                  │
│  Total Disk (single node, 100 queues):                          │
│  • Queue data: 100 queues × 1GB peak = 100GB                   │
│  • Quorum overhead: 20GB                                        │
│  • Write-ahead log: 10GB                                        │
│  • Buffer for spikes: 2x                                        │
│  • Recommended: 500GB-1TB SSD per node                         │
│                                                                  │
│  IOPS Requirements:                                              │
│  • Write: 50K msg/sec × 2 (log + queue) = 100K writes/sec     │
│  • Read: 50K msg/sec = 50K reads/sec                           │
│  • Recommended: NVMe SSD, 50K+ IOPS                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Network Estimation

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETWORK REQUIREMENTS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Ingress (Producers → Broker):                                  │
│  • 180K msg/sec × 1KB = 180MB/sec = 1.44Gbps                   │
│                                                                  │
│  Egress (Broker → Consumers):                                   │
│  • Same as ingress (1:1 consumption): 1.44Gbps                 │
│  • With fanout (1:3 average): 4.32Gbps                         │
│                                                                  │
│  Replication (Quorum Queues):                                    │
│  • RF=3: Each message written 2 additional times               │
│  • 180MB/sec × 2 = 360MB/sec inter-node                       │
│  • Per node: ~120MB/sec replication traffic                    │
│                                                                  │
│  Total Bandwidth per Node:                                       │
│  • Client traffic: 2-5Gbps                                      │
│  • Replication: 1Gbps                                           │
│  • Recommended: 10Gbps NIC, dedicated replication network      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Level Objectives (SLOs)

### Availability SLO

| Component | Target | Measurement |
|-----------|--------|-------------|
| **Cluster Availability** | 99.99% | Uptime over rolling 30 days |
| **Queue Availability** | 99.99% | Individual queue uptime |
| **API Availability** | 99.95% | Management API uptime |

### Latency SLOs

| Operation | p50 | p99 | p99.9 |
|-----------|-----|-----|-------|
| **Publish (with confirm)** | 1ms | 5ms | 20ms |
| **Publish (no confirm)** | 0.5ms | 2ms | 10ms |
| **Consume (push delivery)** | 1ms | 5ms | 15ms |
| **Queue declare** | 5ms | 20ms | 100ms |

### Durability SLOs

| Queue Type | Durability | Data Loss Tolerance |
|------------|------------|---------------------|
| **Quorum Queue** | 99.999999% (8 nines) | Zero |
| **Classic (durable)** | 99.99% | Rare (disk failure) |
| **Classic (transient)** | Best effort | Acceptable |

### Throughput SLOs

| Scenario | Target | Notes |
|----------|--------|-------|
| **Per Queue** | 10K-50K msg/sec | Single queue bottleneck |
| **Per Node** | 100K msg/sec | Varies by message size |
| **Cluster** | 500K msg/sec | With proper sharding |

---

## Error Budget

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR BUDGET ALLOCATION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Monthly Budget (99.99% = 4.32 minutes downtime/month)          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Category             │ Budget │ Minutes │ Justification │    │
│  │──────────────────────│────────│─────────│───────────────│    │
│  │ Planned maintenance  │ 30%    │ 1.3 min │ Rolling updates│    │
│  │ Infrastructure       │ 30%    │ 1.3 min │ VM/disk issues │    │
│  │ Software bugs        │ 20%    │ 0.9 min │ RabbitMQ bugs  │    │
│  │ Configuration        │ 10%    │ 0.4 min │ Misconfig      │    │
│  │ Reserve             │ 10%    │ 0.4 min │ Unexpected     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Burn Rate Alerts:                                               │
│  • 1-hour burn rate > 14.4x → Page immediately                 │
│  • 6-hour burn rate > 6x → Page during business hours          │
│  • 24-hour burn rate > 3x → Create ticket                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hardware Recommendations

### Node Sizing

| Component | Minimum | Recommended | High Performance |
|-----------|---------|-------------|------------------|
| **CPU** | 4 cores | 8-16 cores | 32 cores |
| **RAM** | 16GB | 32-64GB | 128GB |
| **Disk** | 500GB SSD | 1TB NVMe | 2TB NVMe RAID |
| **Network** | 1Gbps | 10Gbps | 25Gbps |

### Cluster Sizing

| Workload | Nodes | Configuration |
|----------|-------|---------------|
| **Development** | 1 | Single node, no HA |
| **Production (small)** | 3 | Quorum queues, 50K msg/sec |
| **Production (medium)** | 5 | 200K msg/sec, multi-AZ |
| **Production (large)** | 7-9 | 500K+ msg/sec, dedicated |

### Quorum Queue Recommendations

| Cluster Size | Recommended Quorum | Failure Tolerance |
|--------------|-------------------|-------------------|
| 3 nodes | 3 | 1 node |
| 5 nodes | 5 | 2 nodes |
| 7 nodes | 5-7 | 2-3 nodes |

---

## Capacity Planning Formula

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAPACITY FORMULAS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Required Nodes (for throughput):                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  nodes = ceil(peak_msg_sec / msg_per_node)               │  │
│  │                                                           │  │
│  │  Example: 200K msg/sec ÷ 50K/node = 4 nodes minimum     │  │
│  │           Add 1 for quorum, 1 for headroom = 6 nodes    │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Memory per Node:                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  memory = base_vm                                        │  │
│  │         + (connections × mem_per_conn)                   │  │
│  │         + (queues × avg_queue_depth × msg_size)          │  │
│  │         + 20% headroom                                   │  │
│  │                                                           │  │
│  │  Example: 2GB + (10K × 180KB) + (50 × 50K × 1KB) + 20% │  │
│  │         = 2GB + 1.8GB + 2.5GB + 20% = 7.6GB             │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Disk per Node:                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  disk = (queues × max_queue_depth × msg_size)            │  │
│  │       × replication_factor                               │  │
│  │       × 2 (safety margin)                                │  │
│  │                                                           │  │
│  │  Example: (50 × 1M × 1KB) × 3 × 2 = 300GB               │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Requirements Checklist

### Must Have (P0)
- [ ] Publish messages to exchanges
- [ ] Route via direct and fanout exchanges
- [ ] Consumer acknowledgment (ACK/NACK)
- [ ] Publisher confirms
- [ ] Durable queues (survive restart)
- [ ] Quorum queues for HA
- [ ] Connection and channel multiplexing

### Should Have (P1)
- [ ] Topic exchange with wildcards
- [ ] Dead letter exchanges (DLX)
- [ ] Message TTL
- [ ] Consumer prefetch/QoS
- [ ] Exclusive queues
- [ ] Lazy queues (disk-backed)

### Nice to Have (P2)
- [ ] Headers exchange
- [ ] Message priority
- [ ] Consumer priority
- [ ] Delayed message delivery
- [ ] Message deduplication
