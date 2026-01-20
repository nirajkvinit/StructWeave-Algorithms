# Distributed Log-Based Broker (Kafka) - System Design

## System Overview

A **Distributed Log-Based Broker** is a high-throughput, fault-tolerant messaging system built on the abstraction of an immutable, append-only commit log. Unlike traditional message queues that delete messages after consumption, log-based brokers retain messages for a configurable period (or indefinitely), enabling multiple consumers to read from different positions in the log. This architecture—pioneered by Apache Kafka—has become the backbone of modern event-driven architectures, enabling real-time data pipelines, event sourcing, and stream processing at massive scale.

The system is designed around **partitions** as the unit of parallelism, **consumer groups** for scalable consumption, and **replicated commit logs** for durability and fault tolerance.

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| Traffic Pattern | Write-heavy, sequential | Optimize append path, leverage sequential I/O |
| Latency Sensitivity | Moderate (1-10ms acceptable) | Batching improves throughput at cost of latency |
| Consistency Model | Per-partition ordering | Strong ordering within partition, no global order |
| Availability Target | 99.99%+ | Replicated partitions, automatic failover |
| Data Model | Append-only log, key-value messages | Immutable records with optional keys |
| State | Stateful (brokers hold log segments) | Requires careful rebalancing and replication |
| Message Retention | Configurable (time/size/compaction) | Not ephemeral—differs from traditional queues |

---

## Complexity Rating

| Aspect | Rating | Justification |
|--------|--------|---------------|
| **Overall** | High | Combines distributed consensus, log storage, and consumer coordination |
| Partitioning | Medium | Static partition count, key-based routing |
| Replication | High | ISR-based protocol, leader election, consistency guarantees |
| Consumer Coordination | High | Consumer groups, rebalancing, offset management |
| Log Management | Medium-High | Segment files, compaction, retention policies |
| Metadata Management | High | KRaft consensus (replacing ZooKeeper) |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning |
| [02 - High-Level Design](./02-high-level-design.md) | KRaft architecture, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Log segments, APIs, partition assignment algorithms |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | ISR, rebalancing, compaction, race conditions |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Partition scaling, broker failures, multi-region |
| [06 - Security & Compliance](./06-security-and-compliance.md) | SASL, ACLs, encryption, GDPR considerations |
| [07 - Observability](./07-observability.md) | Broker metrics, consumer lag, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trade-offs, trap questions |

---

## Message Broker Comparison

| Feature | Log-Based Broker (Kafka) | Traditional Queue (RabbitMQ) | Cloud Pub/Sub |
|---------|-------------------------|------------------------------|---------------|
| **Message Model** | Append-only log | Queue (delete after consume) | Topic/subscription |
| **Ordering** | Per-partition | Per-queue (single consumer) | Per-ordering-key |
| **Replay** | Yes (seek to offset) | No (message deleted) | Yes (seek to timestamp) |
| **Consumer Groups** | Native (partition assignment) | Competing consumers | Subscriptions |
| **Throughput** | Very high (MB/s per partition) | Medium | High |
| **Latency** | Low-medium (batching) | Very low | Low |
| **Retention** | Configurable (days/weeks) | Until consumed | Configurable |
| **Exactly-Once** | Supported (transactions) | Via confirms + dedup | Not native |
| **Use Case** | Event streaming, pipelines | Task queues, RPC | Managed event bus |

**Recommendation:** Log-based broker for event streaming, replay requirements, and high-throughput pipelines. Traditional queues for task distribution with strict per-message acknowledgment.

---

## Delivery Semantics Comparison

| Semantics | Description | Implementation | Use Case |
|-----------|-------------|----------------|----------|
| **At-Most-Once** | Message may be lost, never duplicated | No retries, fire-and-forget | Metrics, logs (loss acceptable) |
| **At-Least-Once** | Message never lost, may be duplicated | Retry until ACK, consumer dedup needed | Default for most systems |
| **Exactly-Once** | Message delivered exactly once | Idempotent producer + transactions | Financial, inventory |

**Kafka Default:** At-least-once. Enable exactly-once via idempotent producers (`enable.idempotence=true`) and transactional writes.

---

## Metadata Management Evolution

| Approach | Description | Pros | Cons | Status |
|----------|-------------|------|------|--------|
| **ZooKeeper-based** | External ZK cluster for metadata, leader election | Mature, battle-tested | Operational complexity, separate system | Deprecated (Kafka 4.0) |
| **KRaft Mode** | Internal Raft-based metadata quorum | Single system, simpler ops, faster failover | Newer, migration required | **Recommended (Kafka 3.3+)** |

**Note:** KRaft (Kafka Raft) replaces ZooKeeper entirely in Kafka 4.0+. New deployments should use KRaft mode.

---

## Consumer Protocol Comparison

| Protocol | Description | Pros | Cons | Status |
|----------|-------------|------|------|--------|
| **Classic (Eager)** | Client-side assignment, stop-the-world rebalance | Simple, mature | Full rebalance on any change | Legacy |
| **Cooperative Sticky** | Incremental rebalance, only affected partitions move | Less disruption | More complex protocol | Current default |
| **KIP-848 (Next-Gen)** | Server-side assignment, heartbeat-based | 60-70% less coordination traffic, faster rebalance | Kafka 4.0+ only | **Future default** |

**Recommendation:** Use cooperative sticky rebalancing for Kafka 3.x. Plan for KIP-848 in Kafka 4.0+.

---

## Key Trade-offs Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                LOG-BASED BROKER TRADE-OFFS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Throughput ◄─────────────────────────────► Latency             │
│       │                                            │             │
│  Large batches                           Small batches           │
│  linger.ms=100                           linger.ms=0             │
│  High compression                        No compression          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Durability ◄────────────────────────────────► Performance      │
│       │                                            │             │
│  acks=all                                acks=1                  │
│  min.insync.replicas=2                   min.insync.replicas=1   │
│  Sync replication                        Async replication       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Partition Count ◄───────────────────────► Operational Cost     │
│       │                                            │             │
│  More parallelism                        Fewer partitions        │
│  Higher throughput                       Faster leader election  │
│  More consumer scaling                   Less metadata overhead  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Retention ◄─────────────────────────────────► Storage Cost     │
│       │                                            │             │
│  Keep 30 days                            Keep 7 days             │
│  Full replay capability                  Limited replay          │
│  Compliance/audit                        Lower storage cost      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### The Commit Log Abstraction

The fundamental data structure is an **append-only, ordered, immutable sequence of records**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        COMMIT LOG                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Offset:  0     1     2     3     4     5     6     7     ...   │
│         ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐        │
│ Records │ A │ │ B │ │ C │ │ D │ │ E │ │ F │ │ G │ │ H │  ...   │
│         └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘        │
│           ▲                       ▲                 ▲            │
│           │                       │                 │            │
│      Consumer 1              Consumer 2         Producer         │
│      (offset 0)              (offset 4)        (append here)     │
│                                                                  │
│  Properties:                                                     │
│  • Append-only: New records added at the end                    │
│  • Immutable: Records never modified after write                │
│  • Ordered: Offset provides total order within partition        │
│  • Durable: Records persisted to disk with replication          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Partitions and Parallelism

A **topic** is divided into **partitions**, each an independent commit log:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOPIC: order-events                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Partition 0: ┌─────┬─────┬─────┬─────┬─────┐                   │
│               │ 0   │ 1   │ 2   │ 3   │ 4   │ → (Broker 1)      │
│               └─────┴─────┴─────┴─────┴─────┘                   │
│                                                                  │
│  Partition 1: ┌─────┬─────┬─────┬─────┬─────┬─────┐             │
│               │ 0   │ 1   │ 2   │ 3   │ 4   │ 5   │ → (Broker 2)│
│               └─────┴─────┴─────┴─────┴─────┴─────┘             │
│                                                                  │
│  Partition 2: ┌─────┬─────┬─────┐                               │
│               │ 0   │ 1   │ 2   │ → (Broker 3)                  │
│               └─────┴─────┴─────┘                               │
│                                                                  │
│  Key Properties:                                                 │
│  • Each partition is an ordered log                             │
│  • Partitions distributed across brokers                        │
│  • Ordering guaranteed ONLY within a partition                  │
│  • Partition count is fixed after topic creation                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Consumer Groups

**Consumer groups** enable parallel consumption with exactly-once partition assignment:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONSUMER GROUP ASSIGNMENT                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Topic: order-events (6 partitions)                             │
│                                                                  │
│  Consumer Group: order-processor                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                           │   │
│  │  Consumer 1        Consumer 2        Consumer 3           │   │
│  │  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │   │
│  │  │ Partition 0 │   │ Partition 2 │   │ Partition 4 │     │   │
│  │  │ Partition 1 │   │ Partition 3 │   │ Partition 5 │     │   │
│  │  └─────────────┘   └─────────────┘   └─────────────┘     │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Rules:                                                          │
│  • Each partition assigned to exactly ONE consumer in group     │
│  • One consumer can handle multiple partitions                  │
│  • Adding consumers triggers rebalance                          │
│  • Max parallelism = number of partitions                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## When to Use a Log-Based Broker

**Use When:**
- Event streaming and real-time data pipelines
- Need for message replay (reprocessing, new consumers)
- High throughput requirements (100K+ messages/sec)
- Event sourcing architecture
- Multiple independent consumers for same data
- Ordered processing within a key/partition
- Long retention requirements (audit, compliance)

**Avoid When:**
- Simple request-response patterns (use RPC)
- Need for complex routing (use traditional message queue)
- Very low latency required (sub-millisecond)
- Small message volume (overhead not justified)
- Need for message priorities (log-based is FIFO)
- Temporary task queues (delete-after-consume pattern)

---

## Log-Based Broker vs Traditional Message Queue

| Aspect | Log-Based Broker | Traditional Message Queue |
|--------|-----------------|--------------------------|
| **Primary Goal** | Event streaming, replay | Task distribution, decoupling |
| **Message Lifetime** | Retained (configurable) | Deleted after ACK |
| **Consumer Model** | Pull (poll loop) | Push or Pull |
| **Replay Capability** | Yes (seek to any offset) | No |
| **Ordering** | Per-partition | Per-queue or none |
| **Throughput** | Very high (sequential I/O) | Medium |
| **Consumer Scaling** | Limited by partition count | Limited by queue throughput |
| **Exactly-Once** | Transactional support | Typically at-least-once |
| **Use Case** | Data pipelines, event sourcing | Background jobs, RPC |
| **Examples** | Kafka, Redpanda, Pulsar | RabbitMQ, ActiveMQ, SQS |

---

## Real-World Implementations

| System | Company | Architecture | Key Innovation | Scale |
|--------|---------|--------------|----------------|-------|
| **Kafka** | LinkedIn/Confluent | Partitioned log, ZK→KRaft | Original log-based design, ecosystem | Trillions of messages/day (LinkedIn) |
| **Redpanda** | Redpanda | C++ rewrite, Raft per partition | No JVM, lower latency, Kafka API compatible | 10x lower latency than Kafka |
| **Pulsar** | Yahoo/Apache | Segment-based, BookKeeper storage | Tiered storage, multi-tenancy | Millions of topics |
| **Kinesis** | AWS | Managed, shard-based | Serverless, AWS integration | Managed service |
| **Event Hubs** | Microsoft | Managed, partition-based | Azure integration | Managed service |

---

## Related Systems

- **[Distributed Message Queue](../1.6-distributed-message-queue/00-index.md)** - Traditional queue semantics (RabbitMQ-style)
- **[Distributed Key-Value Store](../1.3-distributed-key-value-store/00-index.md)** - Often used alongside for state storage
- **[Change Data Capture (CDC)](../3.8-change-data-capture/00-index.md)** - Common producer to log-based brokers

---

## References

### Engineering Blogs
- [LinkedIn: The Log - What Every Engineer Should Know](https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying) - Foundational article by Jay Kreps
- [Confluent: Exactly-Once Semantics](https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/) - Deep dive into EOS implementation
- [Uber: Kafka at Uber](https://www.uber.com/blog/kafka/) - Multi-region Kafka architecture

### Technical Documentation
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [KRaft Mode](https://kafka.apache.org/documentation/#kraft) - ZooKeeper-less Kafka
- [KIP-848: Next-Gen Consumer Protocol](https://cwiki.apache.org/confluence/display/KAFKA/KIP-848%3A+The+Next+Generation+of+the+Consumer+Rebalance+Protocol)

### Architecture Guides
- [Cloudurable: Kafka Architecture](https://cloudurable.com/blog/kafka-architecture/index.html) - Comprehensive architecture overview
- [Confluent: Kafka Internals](https://developer.confluent.io/courses/architecture/get-started/) - Free course on Kafka internals
