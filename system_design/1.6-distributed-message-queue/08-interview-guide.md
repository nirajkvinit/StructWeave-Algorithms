# Interview Guide

[← Back to Index](./00-index.md)

---

## 45-Minute Interview Pacing

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTERVIEW TIMELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  0:00 - 0:05  CLARIFY REQUIREMENTS (5 min)                      │
│  ├── Ask clarifying questions                                   │
│  ├── Establish scale (messages/sec, consumers, durability)      │
│  └── Confirm functional scope                                   │
│                                                                  │
│  0:05 - 0:10  HIGH-LEVEL DESIGN (5 min)                         │
│  ├── Draw: Producers → Exchanges → Queues → Consumers           │
│  ├── Explain exchange types (direct, fanout, topic)             │
│  └── Mention clustering for HA                                  │
│                                                                  │
│  0:10 - 0:25  CORE COMPONENTS (15 min)                          │
│  ├── Exchange routing (direct vs topic patterns)                │
│  ├── Queue types (classic vs quorum)                            │
│  ├── Acknowledgment flow (publisher confirms, consumer ACK)     │
│  └── Dead letter queues                                         │
│                                                                  │
│  0:25 - 0:35  DEEP DIVE (10 min)                                │
│  ├── Quorum queues (Raft consensus)                             │
│  ├── Network partition handling (pause-minority)                │
│  └── Consumer scaling and prefetch                              │
│                                                                  │
│  0:35 - 0:43  TRADE-OFFS & EXTENSIONS (8 min)                   │
│  ├── Message queue vs log-based broker                          │
│  ├── Durability vs performance                                  │
│  └── Ordering guarantees                                        │
│                                                                  │
│  0:43 - 0:45  WRAP-UP (2 min)                                   │
│  └── Summarize key decisions                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Questions to Ask the Interviewer

### Scale Questions

| Question | Why It Matters |
|----------|----------------|
| What's the expected message rate? | Determines if single queue or sharding needed |
| How large are messages? | Memory and network planning |
| How many producers and consumers? | Connection management |
| What's the expected queue depth? | Memory vs lazy queues |

### Functional Questions

| Question | Why It Matters |
|----------|----------------|
| Do we need message ordering? | Affects consumer scaling strategy |
| Is message priority required? | Limits queue type choices (no quorum) |
| Do we need message replay? | Message queue vs log-based broker |
| What happens on processing failure? | DLQ strategy, retry logic |
| Complex routing needed? | Exchange type selection |

### Reliability Questions

| Question | Why It Matters |
|----------|----------------|
| What's the durability requirement? | Classic vs quorum queues |
| Can we lose messages? | Acknowledgment strategy |
| What's acceptable latency? | Batching, persistence trade-offs |
| Multi-region required? | Federation, shovel |

---

## Trade-offs Discussion

### Push vs Pull Consumption

```
┌─────────────────────────────────────────────────────────────────┐
│                    PUSH VS PULL                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PUSH (Message Queue - RabbitMQ default)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Broker ──push──► Consumer                               │   │
│  │                                                          │   │
│  │  Pros:                                                   │   │
│  │  • Lower latency (immediate delivery)                   │   │
│  │  • Simpler consumer logic                               │   │
│  │  • Broker controls flow (prefetch)                      │   │
│  │                                                          │   │
│  │  Cons:                                                   │   │
│  │  • Broker must track consumer state                     │   │
│  │  • Consumer can be overwhelmed                          │   │
│  │                                                          │   │
│  │  Use: Real-time processing, low latency requirements    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  PULL (Log-Based Broker - Kafka)                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Consumer ──poll──► Broker                               │   │
│  │                                                          │   │
│  │  Pros:                                                   │   │
│  │  • Consumer controls pace (backpressure)                │   │
│  │  • Batching for throughput                              │   │
│  │  • Simpler broker (no consumer state)                   │   │
│  │                                                          │   │
│  │  Cons:                                                   │   │
│  │  • Higher latency (poll interval)                       │   │
│  │  • Consumer must manage offset                          │   │
│  │                                                          │   │
│  │  Use: High throughput, batch processing, replay         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Quorum vs Classic Queues

| Aspect | Classic Queue | Quorum Queue |
|--------|---------------|--------------|
| **Consistency** | Eventual | Strong (Raft) |
| **Data Safety** | Risk on node failure | No loss with quorum |
| **Performance** | ~50K msg/sec | ~40K msg/sec |
| **Priority** | Supported | Not supported |
| **Lazy Mode** | Configurable | Always lazy-ish |
| **Non-Durable** | Supported | Not supported |
| **Use Case** | High throughput, non-critical | Critical data, HA |

### At-Least-Once vs Exactly-Once

```
┌─────────────────────────────────────────────────────────────────┐
│                    DELIVERY SEMANTICS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AT-LEAST-ONCE (Default, Recommended)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Publisher confirms + Consumer manual ACK              │   │
│  │  • Message never lost                                   │   │
│  │  • May be delivered multiple times (redelivery)         │   │
│  │  • Consumer must be idempotent                          │   │
│  │                                                          │   │
│  │  Implementation:                                         │   │
│  │  1. Enable publisher confirms                           │   │
│  │  2. Use manual ACK (auto_ack=false)                    │   │
│  │  3. Implement idempotency in consumer                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  EXACTLY-ONCE (Complex, Rare)                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Requires deduplication                                │   │
│  │  • Higher latency and complexity                        │   │
│  │                                                          │   │
│  │  Implementation:                                         │   │
│  │  1. Add message_id to every message                     │   │
│  │  2. Store processed message_ids in database             │   │
│  │  3. Check before processing                             │   │
│  │  4. Process + record in same transaction                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  AT-MOST-ONCE (Lossy, Rare)                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • No confirms, auto-ACK                                 │   │
│  │  • Messages may be lost                                 │   │
│  │  • Highest throughput                                   │   │
│  │                                                          │   │
│  │  Use: Metrics, logs where loss is acceptable            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Trap Questions and Answers

### "Why not just use Kafka?"

```
┌─────────────────────────────────────────────────────────────────┐
│  TRAP: "Why not just use Kafka?"                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Bad Answer:                                                     │
│  "Kafka is better for everything"                               │
│                                                                  │
│  Good Answer:                                                    │
│  "They're different tools for different use cases:              │
│                                                                  │
│  Choose Message Queue (RabbitMQ) when:                          │
│  • Complex routing needed (topic patterns, headers)             │
│  • Message priority required                                    │
│  • Per-message acknowledgment with delete                       │
│  • RPC / request-reply patterns                                 │
│  • Lower latency matters more than throughput                   │
│  • No need for message replay                                   │
│                                                                  │
│  Choose Log-Based Broker (Kafka) when:                          │
│  • Message replay required                                      │
│  • Very high throughput (100K+ msg/sec)                        │
│  • Event sourcing / audit requirements                          │
│  • Multiple independent consumers for same data                 │
│  • Stream processing pipelines"                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### "How do you guarantee ordering?"

```
┌─────────────────────────────────────────────────────────────────┐
│  TRAP: "How do you guarantee ordering?"                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Bad Answer:                                                     │
│  "Messages are always ordered" (False for multi-consumer)       │
│                                                                  │
│  Good Answer:                                                    │
│  "Ordering has nuances in message queues:                       │
│                                                                  │
│  Per-Queue FIFO:                                                 │
│  • Single consumer: Strict FIFO guaranteed                      │
│  • Multiple consumers: Order not guaranteed                     │
│    (Consumer A may ACK M2 before Consumer B ACKs M1)           │
│                                                                  │
│  To maintain ordering with scale:                               │
│  Option 1: Single consumer per queue                            │
│  • Limits throughput but guarantees order                       │
│                                                                  │
│  Option 2: Shard by entity key                                  │
│  • All messages for entity X go to same queue                  │
│  • Single consumer per shard                                    │
│  • Ordering within entity, parallel across entities            │
│                                                                  │
│  Option 3: Sequence numbers                                     │
│  • Add sequence number to messages                              │
│  • Consumer reorders if needed                                  │
│  • Complexity pushed to consumer"                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### "What if a consumer crashes?"

```
┌─────────────────────────────────────────────────────────────────┐
│  TRAP: "What if a consumer crashes mid-processing?"             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Bad Answer:                                                     │
│  "The message is lost" (Only true with auto-ACK)                │
│                                                                  │
│  Good Answer:                                                    │
│  "With manual acknowledgment:                                   │
│                                                                  │
│  1. Consumer receives message (unacked)                         │
│  2. Consumer crashes during processing                          │
│  3. Broker detects closed connection (heartbeat timeout)        │
│  4. Message requeued (redelivered=true flag set)               │
│  5. Another consumer receives the message                       │
│                                                                  │
│  Implications:                                                   │
│  • Message may be partially processed                           │
│  • Consumer MUST be idempotent                                  │
│  • Use prefetch to limit exposure                               │
│  • Consider x-delivery-limit for poison messages                │
│                                                                  │
│  Idempotency approaches:                                        │
│  • Check message_id before processing                          │
│  • Use database transactions with dedup key                    │
│  • Design operations to be naturally idempotent"               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### "How do you handle poison messages?"

```
┌─────────────────────────────────────────────────────────────────┐
│  TRAP: "What about messages that always fail?"                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Bad Answer:                                                     │
│  "Just retry forever" (Blocks queue, wastes resources)          │
│                                                                  │
│  Good Answer:                                                    │
│  "Implement dead letter queue (DLQ) pattern:                    │
│                                                                  │
│  1. Configure queue with DLX:                                   │
│     x-dead-letter-exchange: 'dlx'                              │
│     x-dead-letter-routing-key: 'failed'                        │
│                                                                  │
│  2. For quorum queues, add delivery limit:                      │
│     x-delivery-limit: 3                                         │
│                                                                  │
│  3. Message flow:                                               │
│     Attempt 1 → fail → requeue                                 │
│     Attempt 2 → fail → requeue                                 │
│     Attempt 3 → fail → route to DLQ                            │
│                                                                  │
│  4. DLQ consumer:                                               │
│     • Log for investigation                                    │
│     • Alert if DLQ depth grows                                 │
│     • Optional: Manual retry after fix                         │
│                                                                  │
│  The x-death header contains:                                   │
│  • Original queue                                               │
│  • Failure reason                                               │
│  • Attempt count                                                │
│  • Timestamp"                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | Correct Approach |
|---------|--------------|------------------|
| Using auto-ACK for critical messages | Messages lost if consumer crashes | Manual ACK after processing |
| Single queue for high throughput | Queue is single-threaded bottleneck | Shard across multiple queues |
| Ignoring prefetch | Consumer overwhelmed or underutilized | Set appropriate prefetch (10-100) |
| No dead letter queue | Poison messages block queue | Always configure DLX |
| Classic queues for critical data | Data loss on node failure | Use quorum queues |
| Ignoring publisher confirms | Silent message loss | Enable confirms, handle failures |
| Unbounded queue growth | Memory exhaustion | Set max-length, use lazy queues |
| Connection per request | Resource exhaustion | Connection pooling, channels |

---

## Quick Reference Card

### Exchange Type Selection

```
Use Case                     → Exchange Type
────────────────────────────────────────────
Task queue (work distribution) → Direct
Broadcast to all subscribers   → Fanout
Pattern-based routing          → Topic
Attribute-based routing        → Headers
```

### Queue Configuration

```
Requirement                  → Configuration
────────────────────────────────────────────
High availability            → Quorum queue
High throughput, non-critical → Classic queue
Large message backlog        → Lazy queue (x-queue-mode: lazy)
Message priority             → Classic + x-max-priority
Auto-expire messages         → x-message-ttl
Failed message handling      → x-dead-letter-exchange
```

### Durability Levels

```
Level              Configuration
────────────────────────────────
At-most-once       auto_ack=true, transient
At-least-once      confirms, manual ACK, persistent
Exactly-once       + consumer deduplication
```

---

## Message Queue vs Log-Based Broker Summary

| Dimension | Message Queue | Log-Based Broker |
|-----------|---------------|------------------|
| Core Model | Queue (delete after ACK) | Commit log (retain) |
| Consumer | Push-based | Pull-based |
| Replay | No | Yes |
| Routing | Complex (exchanges) | Simple (topics) |
| Ordering | Per-queue | Per-partition |
| Priority | Yes | No |
| Throughput | Medium | Very High |
| Latency | Very Low | Low-Medium |
| Use Case | Task queues, RPC | Event streaming |

---

## System Design Interview Template

```
1. REQUIREMENTS
   □ Message rate?
   □ Message size?
   □ Durability needs?
   □ Ordering requirements?
   □ Routing complexity?

2. HIGH-LEVEL DESIGN
   □ Producers → Exchanges → Queues → Consumers
   □ Exchange type selection
   □ Clustering for HA

3. CORE COMPONENTS
   □ Exchange routing
   □ Queue types
   □ Acknowledgment flow
   □ Dead letter handling

4. DEEP DIVE
   □ Quorum queues (Raft)
   □ Partition handling
   □ Consumer scaling

5. TRADE-OFFS
   □ Message queue vs log broker
   □ Durability vs performance
   □ Ordering vs parallelism
```
