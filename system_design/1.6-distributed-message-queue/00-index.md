# Distributed Message Queue (RabbitMQ/ActiveMQ) - System Design

## System Overview

A **Distributed Message Queue** is a broker-centric messaging system that facilitates asynchronous communication between services using **queue semantics**—messages are delivered to consumers, acknowledged, and then deleted. Unlike log-based brokers (Kafka) that retain messages indefinitely, message queues provide **transient messaging** with sophisticated routing capabilities through exchanges, bindings, and routing keys.

This architecture—implemented by systems like RabbitMQ, ActiveMQ, and Azure Service Bus—excels at **task distribution**, **request buffering**, and **service decoupling** where complex routing logic and guaranteed delivery are more important than message replay or high-throughput streaming.

The system is designed around **exchanges** for routing, **queues** for buffering, and **acknowledgments** for delivery guarantees, with support for features like dead letter handling, message priorities, and TTL.

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| Traffic Pattern | Request-response, task distribution | Optimize for individual message handling |
| Latency Sensitivity | High (sub-10ms p99) | Push-based delivery, minimal batching |
| Consistency Model | At-least-once (default), exactly-once (with dedup) | Consumer idempotency recommended |
| Availability Target | 99.99% with quorum queues | Raft-based replication for durability |
| Data Model | Queue (delete after ACK) | Messages are ephemeral, not replayed |
| State | Stateful (broker holds messages) | Queue depth monitoring critical |
| Message Retention | Until consumed + acknowledged | Not for audit/replay use cases |

---

## Complexity Rating

| Aspect | Rating | Justification |
|--------|--------|---------------|
| **Overall** | Medium-High | Exchange routing, acknowledgment protocols, clustering |
| Exchange Routing | Medium | Multiple exchange types with pattern matching |
| Queue Management | Medium | Message persistence, consumer coordination |
| Acknowledgment | Medium-High | Publisher confirms, consumer ACK/NACK, dead letters |
| High Availability | High | Quorum queues (Raft), cluster coordination |
| Dead Letter Handling | Medium | DLX configuration, retry strategies |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture, exchange routing, data flow |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, APIs, routing algorithms |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Exchange engine, quorum queues, ACK pipeline |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Clustering, federation, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Authentication, authorization, encryption |
| [07 - Observability](./07-observability.md) | Metrics, logging, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trade-offs, trap questions |

---

## Message Queue vs Log-Based Broker

| Feature | Message Queue (RabbitMQ) | Log-Based Broker (Kafka) |
|---------|-------------------------|-------------------------|
| **Core Abstraction** | Queue (FIFO, delete after ACK) | Append-only commit log |
| **Message Lifecycle** | Consumed → Acknowledged → Deleted | Retained for configured period |
| **Consumer Model** | Push-based (broker pushes to consumer) | Pull-based (consumer polls) |
| **Replay Capability** | No (message deleted after ACK) | Yes (seek to any offset) |
| **Routing** | Complex (exchanges, routing keys, bindings) | Simple (topic → partition) |
| **Message Priority** | Supported | Not supported (FIFO only) |
| **Ordering** | Per-queue (single consumer) | Per-partition |
| **Throughput** | Medium (10K-100K msg/sec) | Very High (100K-1M+ msg/sec) |
| **Latency** | Very Low (sub-ms possible) | Low-Medium (batching) |
| **Use Case** | Task queues, RPC, routing | Event streaming, pipelines |

**When to Choose Message Queue:**
- Complex routing requirements (fan-out, topic-based, headers)
- Task distribution with acknowledgment
- RPC/request-reply patterns
- Message priorities needed
- Low latency, individual message processing

**When to Choose Log-Based Broker:**
- Event streaming and replay requirements
- High-throughput data pipelines
- Event sourcing architecture
- Multiple independent consumers for same data

---

## Delivery Semantics Comparison

| Semantics | Description | Implementation | Use Case |
|-----------|-------------|----------------|----------|
| **At-Most-Once** | Fire and forget, may lose messages | No ACK, no confirms | Metrics, non-critical logs |
| **At-Least-Once** | Guaranteed delivery, may duplicate | Publisher confirms + consumer ACK | Default for most systems |
| **Exactly-Once** | No loss, no duplicates | Deduplication at consumer | Financial transactions |

**Message Queue Default:** At-least-once with publisher confirms and consumer acknowledgment. Exactly-once requires consumer-side idempotency.

---

## Exchange Types Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXCHANGE TYPES                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. DIRECT EXCHANGE                                             │
│  ┌──────────┐   routing_key="order"   ┌─────────────┐          │
│  │ Producer │ ────────────────────────► │ order_queue │          │
│  └──────────┘                          └─────────────┘          │
│  • Exact routing key match                                       │
│  • Point-to-point messaging                                      │
│                                                                  │
│  2. FANOUT EXCHANGE                                             │
│  ┌──────────┐         ┌─────────────┐                          │
│  │ Producer │ ────┬───► │ queue_1     │                          │
│  └──────────┘     │   └─────────────┘                          │
│                   │   ┌─────────────┐                          │
│                   └───► │ queue_2     │                          │
│                       └─────────────┘                          │
│  • Broadcast to all bound queues                                │
│  • Ignores routing key                                          │
│                                                                  │
│  3. TOPIC EXCHANGE                                              │
│  ┌──────────┐   "order.us.created"   ┌─────────────┐          │
│  │ Producer │ ────────────────────────► │ us_orders   │  (order.us.*)  │
│  └──────────┘         │              └─────────────┘          │
│                       │              ┌─────────────┐          │
│                       └──────────────► │ all_created │  (*.*.created) │
│                                      └─────────────┘          │
│  • Pattern matching with wildcards (* = one word, # = zero+)   │
│  • Flexible pub/sub routing                                     │
│                                                                  │
│  4. HEADERS EXCHANGE                                            │
│  ┌──────────┐   headers: {type: pdf}  ┌─────────────┐          │
│  │ Producer │ ────────────────────────► │ pdf_queue   │          │
│  └──────────┘                          └─────────────┘          │
│  • Route based on message headers                               │
│  • Most flexible, least performant                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Trade-offs Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                MESSAGE QUEUE TRADE-OFFS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Durability ◄───────────────────────────► Performance           │
│       │                                            │             │
│  Persistent messages                     Transient messages      │
│  Quorum queues                          Classic queues           │
│  Publisher confirms                     Fire-and-forget          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Routing Flexibility ◄──────────────────► Throughput            │
│       │                                            │             │
│  Headers exchange                        Direct exchange         │
│  Complex patterns                        Simple routing          │
│  Multiple bindings                       Single queue            │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Ordering ◄─────────────────────────────► Parallelism           │
│       │                                            │             │
│  Single consumer                         Multiple consumers      │
│  Single queue                            Sharded queues          │
│  Strict FIFO                            Competing consumers      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Consistency ◄──────────────────────────► Availability          │
│       │                                            │             │
│  Quorum queues                           Classic mirrored        │
│  Synchronous replication                 Async replication       │
│  Pause-minority                          Ignore partitions       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### The Message Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGE FLOW                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Producer                    Broker                 Consumer     │
│  ┌───────┐    ┌──────────────────────────────┐    ┌───────┐    │
│  │       │    │  ┌──────────┐  ┌───────────┐ │    │       │    │
│  │ App   │───►│  │ Exchange │──► │  Queue   │ │───►│ Worker│    │
│  │       │    │  └──────────┘  └───────────┘ │    │       │    │
│  └───────┘    └──────────────────────────────┘    └───────┘    │
│      │                  │               │               │        │
│      │                  │               │               │        │
│      ▼                  ▼               ▼               ▼        │
│  1. Publish         2. Route       3. Buffer      4. Deliver    │
│  message            to queue(s)    message        to consumer    │
│      │                  │               │               │        │
│      ▼                  │               │               ▼        │
│  5. Confirm         (bindings      (persistence)  6. Process    │
│  (optional)          determine)                        │        │
│                                                        ▼        │
│                                                   7. ACK/NACK   │
│                                                        │        │
│                                    ┌───────────────────┘        │
│                                    ▼                             │
│                            8. Delete from queue                  │
│                               (or requeue/DLQ)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Queue Types

| Queue Type | Description | Durability | Performance | Use Case |
|------------|-------------|------------|-------------|----------|
| **Classic** | Traditional queue | Optional | Highest | High throughput, tolerate loss |
| **Quorum** | Raft-based replication | Strong | Good | Critical data, HA required |
| **Stream** | Log-like queue | Strong | Highest | Replay needed (Kafka-like) |

### Acknowledgment Modes

```
┌─────────────────────────────────────────────────────────────────┐
│                ACKNOWLEDGMENT MODES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CONSUMER ACKNOWLEDGMENT                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  auto_ack=true   → Message removed immediately on deliver│   │
│  │                    Risk: Message lost if consumer crashes │   │
│  │                                                          │   │
│  │  auto_ack=false  → Message held until explicit ACK       │   │
│  │                    basic.ack()   → Remove from queue     │   │
│  │                    basic.nack()  → Requeue or discard    │   │
│  │                    basic.reject() → Requeue or discard   │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  PUBLISHER CONFIRMS                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  Publisher ──publish──► Broker                           │   │
│  │                            │                             │   │
│  │                            ▼                             │   │
│  │                       Persisted to disk?                 │   │
│  │                       Replicated to quorum?              │   │
│  │                            │                             │   │
│  │  Publisher ◄──confirm──── YES                            │   │
│  │                                                          │   │
│  │  Guarantees: Message won't be lost by broker             │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## When to Use a Distributed Message Queue

**Use When:**
- Task distribution with guaranteed processing
- Service decoupling with buffering
- Complex routing requirements (topic, headers)
- Request-reply / RPC patterns
- Message priorities needed
- Work queues with competing consumers
- Dead letter handling required
- Low latency individual message delivery

**Avoid When:**
- Need message replay (use log-based broker)
- Event sourcing / audit requirements
- Very high throughput (>500K msg/sec)
- Multiple independent consumer groups for same data
- Long-term message retention needed
- Stream processing pipelines

---

## Real-World Implementations

| System | Company | Architecture | Key Innovation | Scale |
|--------|---------|--------------|----------------|-------|
| **RabbitMQ** | VMware | Erlang, AMQP | Quorum queues (Raft), flexible routing | Millions of msg/sec (clustered) |
| **ActiveMQ Artemis** | Apache | Java, multi-protocol | High performance journal, clustering | Enterprise messaging |
| **Amazon MQ** | AWS | Managed RabbitMQ/ActiveMQ | Fully managed, Multi-AZ | Managed service |
| **Azure Service Bus** | Microsoft | Cloud-native | Sessions, transactions, dead letter | Enterprise cloud |
| **IBM MQ** | IBM | Enterprise | Decades of reliability, mainframe integration | Legacy enterprise |
| **Apache Qpid** | Apache | AMQP reference | Standards compliance | Standards-focused |

---

## AMQP Protocol Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    AMQP 0-9-1 MODEL                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Connection (TCP)                                                │
│  ├── Channel 1 (lightweight virtual connection)                 │
│  │   ├── Publish to exchange                                    │
│  │   ├── Consume from queue                                     │
│  │   └── Declare exchanges/queues                               │
│  ├── Channel 2                                                  │
│  │   └── ...                                                    │
│  └── Channel N (multiplexed over single TCP)                    │
│                                                                  │
│  Benefits:                                                       │
│  • Single TCP connection, multiple channels                     │
│  • Channel-level flow control                                   │
│  • Isolation (channel error doesn't affect others)              │
│  • Efficient resource usage                                     │
│                                                                  │
│  Virtual Host (vhost):                                          │
│  • Namespace for exchanges, queues, bindings                    │
│  • Permission boundary (multi-tenancy)                          │
│  • Logical grouping of resources                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Systems

- **[Distributed Log-Based Broker](../1.5-distributed-log-based-broker/00-index.md)** - Kafka-style event streaming
- **[Distributed Key-Value Store](../1.3-distributed-key-value-store/00-index.md)** - Often used for message metadata
- **[Distributed Lock Manager](../1.8-distributed-lock-manager/00-index.md)** - Coordination primitives

---

## References

### Engineering Blogs
- [CloudAMQP: RabbitMQ Best Practices](https://www.cloudamqp.com/blog/part1-rabbitmq-best-practice.html) - Production deployment guide
- [Indeed: RabbitMQ at Scale](https://engineering.indeedblog.com/blog/2020/06/rabbitmq-event-streaming/) - Large-scale deployment patterns
- [Wix: Message Queue Architecture](https://www.wix.engineering/) - Real-world production experience

### Technical Documentation
- [RabbitMQ Documentation](https://www.rabbitmq.com/docs) - Official documentation
- [AMQP 0-9-1 Specification](https://www.rabbitmq.com/tutorials/amqp-concepts.html) - Protocol concepts
- [Quorum Queues](https://www.rabbitmq.com/docs/quorum-queues) - Raft-based replicated queues

### Architecture Guides
- [RabbitMQ Clustering Guide](https://www.rabbitmq.com/docs/clustering) - Multi-node setup
- [RabbitMQ Reliability Guide](https://www.rabbitmq.com/docs/reliability) - Durability and acknowledgments
