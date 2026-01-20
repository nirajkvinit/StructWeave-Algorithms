# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45 Minutes)

| Time | Phase | Focus | What to Cover |
|------|-------|-------|---------------|
| **0-5 min** | Clarify | Requirements | Scale, ordering needs, delivery guarantees, retention |
| **5-15 min** | High-Level | Architecture | Brokers, partitions, producers, consumers, replication |
| **15-30 min** | Deep Dive | Critical Component | ISR mechanism OR consumer groups (pick one) |
| **30-40 min** | Scale & Trade-offs | Challenges | Partition design, exactly-once, multi-region, failures |
| **40-45 min** | Wrap Up | Summary | Recap decisions, discuss monitoring, answer questions |

---

## Phase 1: Clarifying Questions (0-5 min)

### Must-Ask Questions

| Question | Why It Matters | Impact on Design |
|----------|---------------|------------------|
| "What's the expected throughput (messages/sec, MB/sec)?" | Determines partition count and broker sizing | 10K vs 1M msg/sec are very different |
| "Do we need ordering? If so, at what scope?" | Partitioning strategy | Global order needs 1 partition (limits scale) |
| "What delivery guarantee is needed?" | Producer/consumer configuration | At-least-once vs exactly-once |
| "How long should we retain messages?" | Storage planning | 1 day vs 30 days affects capacity |
| "How many consumer groups will read each topic?" | Topic design | Multiple groups = replay capability needed |
| "Is there a replay requirement?" | Fundamentally affects design | Replay → log-based; no replay → consider queue |

### Sample Dialogue

```
YOU: "Before diving into the design, I'd like to clarify some requirements.
     First, what throughput are we targeting?"

INTERVIEWER: "Let's say 100,000 messages per second at peak."

YOU: "Got it. And what about ordering requirements? Do messages need to
     be processed in order?"

INTERVIEWER: "Yes, but only within a customer. We don't need global ordering."

YOU: "That's helpful - we can partition by customer ID. What about delivery
     guarantees? Is at-least-once sufficient, or do we need exactly-once?"

INTERVIEWER: "We're processing financial transactions, so we need exactly-once."

YOU: "Understood. And how long should we retain messages? Is replay important?"

INTERVIEWER: "We need 7 days retention for replay and debugging."

YOU: "Perfect. Let me summarize and then walk through the design..."
```

### Requirements Summary Template

```
"Let me summarize what I've heard:
- Scale: 100K messages/second peak, which means we need a distributed cluster
- Ordering: Per-customer ordering, so we'll partition by customer ID
- Delivery: Exactly-once semantics required (idempotent producer + transactions)
- Retention: 7 days, with replay capability
- [Any other requirements]

This calls for a log-based broker design. Let me walk through the architecture..."
```

---

## Phase 2: High-Level Design (5-15 min)

### What to Cover

1. **System Overview**
   - Draw: Producers → Broker Cluster → Consumers
   - Explain: Append-only commit log, partitions, consumer groups

2. **Partitioning Strategy**
   - Key-based partitioning for ordering
   - Partition count based on throughput needs

3. **Replication**
   - ISR-based replication for durability
   - Leader-follower per partition

4. **Consumer Groups**
   - Parallel consumption
   - Exactly-one partition assignment per consumer

### Key Points to Make

```
"For the architecture, I'll use a distributed log-based broker. The core
abstraction is an append-only commit log - messages are written sequentially
and never modified.

The log is split into partitions for parallelism. Each partition is an
independent ordered log. With customer ID as the partition key, all orders
for a customer go to the same partition, guaranteeing order.

For durability, each partition is replicated across multiple brokers using
an ISR (In-Sync Replica) model. Writes are acknowledged only when all ISR
members have the data.

Consumers form consumer groups. Each partition is assigned to exactly one
consumer in a group, enabling parallel processing while maintaining order
within each partition."
```

### Draw This Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Producers                                               │
│  (partition by customer_id)                              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Broker Cluster                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Broker 1   │  │  Broker 2   │  │  Broker 3   │     │
│  │  P0 (L)     │  │  P0 (F)     │  │  P0 (F)     │     │
│  │  P1 (F)     │  │  P1 (L)     │  │  P1 (F)     │     │
│  │  P2 (F)     │  │  P2 (F)     │  │  P2 (L)     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  (L = Leader, F = Follower, each partition RF=3)        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Consumer Group: order-processor                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │ Consumer 1│  │ Consumer 2│  │ Consumer 3│           │
│  │ (P0)      │  │ (P1)      │  │ (P2)      │           │
│  └───────────┘  └───────────┘  └───────────┘           │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 3: Deep Dive (15-30 min)

### Option A: ISR and Replication Protocol

**When to choose:** If interviewer asks about durability or fault tolerance.

**Key Points:**

1. **What is ISR?**
   - In-Sync Replicas = replicas that are "caught up" to leader
   - Only ISR members can become leader
   - Writes acknowledged when ALL ISR members have data

2. **High Watermark:**
   - The "committed" offset
   - Consumers only see data up to high watermark
   - HW = minimum log end offset across all ISR members

3. **Configuration:**
   ```
   "For durability, I'd configure:
   - acks=all: Wait for all ISR to acknowledge
   - min.insync.replicas=2: Require at least 2 replicas

   This means we can lose one broker without data loss."
   ```

4. **Draw the ISR diagram:**
   ```
   Leader:    [0][1][2][3][4][5][6]    LEO=7
   Follower1: [0][1][2][3][4][5][6]    LEO=7  (in sync)
   Follower2: [0][1][2][3][4]          LEO=5  (lagging, removed from ISR)

   ISR = {Leader, Follower1}
   High Watermark = 7 (consumers can read up to offset 6)
   ```

### Option B: Consumer Groups and Rebalancing

**When to choose:** If interviewer asks about consumer scaling or coordination.

**Key Points:**

1. **Assignment:**
   - Each partition → exactly one consumer in group
   - One consumer can handle multiple partitions
   - Max parallelism = number of partitions

2. **Rebalancing:**
   - Triggered by: join, leave, crash, new partitions
   - Classic: stop-the-world (all consumers pause)
   - Cooperative: incremental (only affected partitions)

3. **Offset Management:**
   ```
   "Consumers track their position via offsets. On commit, the
   offset is stored in an internal topic. On restart or rebalance,
   consumers resume from their last committed offset.

   For exactly-once, we commit offsets as part of the transaction."
   ```

4. **Pseudocode:**
   ```
   while (running):
       records = consumer.poll(timeout=1000ms)

       for record in records:
           process(record)

       consumer.commitSync()  # or commitAsync()
   ```

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Partition Design Trade-offs

```
"For partition count, I'd consider several factors:

1. Parallelism: We need at least as many partitions as max consumers.
   With 10 consumers, need at least 10 partitions.

2. Throughput: Each partition handles ~10MB/s. For 100MB/s,
   need at least 10 partitions.

3. Ordering: More partitions = less ordering (only within partition).
   For per-customer ordering, this is fine.

4. Overhead: More partitions = more file handles, memory, slower failover.
   I'd aim for 10-100 partitions, not thousands.

I'd start with 12 partitions - room to grow, not excessive overhead."
```

### Exactly-Once Semantics

```
"For exactly-once, I'd use three mechanisms:

1. Idempotent Producer: Deduplicates retries at the broker using
   producer ID and sequence numbers.

2. Transactions: Atomic writes across partitions. Either all
   succeed or all fail.

3. Consumer Isolation: Consumers with 'read_committed' only see
   committed transactions.

For our order processing:
- Producer writes order to 'orders' topic
- Consumer reads, processes, writes to 'processed-orders'
- Consumer commits offsets IN THE SAME TRANSACTION
- If anything fails, entire transaction rolls back"
```

### Multi-Region Deployment

```
"For multi-region, I'd use asynchronous replication:

1. Primary region handles all writes
2. MirrorMaker 2 replicates to DR region
3. Topic naming: us-east.orders → replicated to us-west as us-east.orders

Trade-offs:
- RPO = replication lag (seconds)
- RTO = failover time (manual: hours, automated: minutes)

For active-active:
- Each region has its own topics
- Bidirectional replication with prefixes to avoid loops
- Application handles conflict resolution"
```

### Handling Broker Failure

```
"When a broker fails:

1. Controller detects via heartbeat timeout (~10 seconds)
2. Controller elects new leaders from ISR for affected partitions
3. Metadata updated, clients redirect to new leaders
4. Total failover: 5-30 seconds depending on partition count

If we lose multiple brokers:
- As long as ISR >= min.insync.replicas, we're fine
- If ISR drops below minimum, writes are rejected
- Prefer unavailability over data loss"
```

---

## Trap Questions & Strong Responses

### Trap 1: "Why not just use a database?"

**What they're testing:** Do you understand log-based messaging benefits?

**Strong Response:**
```
"A database could work for some cases, but log-based brokers have key
advantages:

1. Throughput: Sequential I/O is orders of magnitude faster. Kafka can
   handle millions of messages/second; databases struggle at this scale.

2. Replay: The log retains messages. New consumers can start from the
   beginning, or replay from any point. Databases delete after consumption.

3. Decoupling: Multiple consumer groups read independently without
   affecting each other. Database polling creates contention.

4. Ordered, append-only: Perfect for event sourcing, audit logs, change
   data capture.

I'd use a database for request-response or when I need complex queries.
I'd use a log-based broker for high-throughput event streaming."
```

### Trap 2: "How do you guarantee exactly-once delivery?"

**What they're testing:** Do you understand the complexity of exactly-once?

**Strong Response:**
```
"Exactly-once is hard because the network is unreliable. Here's how:

1. Idempotent producer: Each message has producer ID + sequence number.
   Broker deduplicates retries. This gives exactly-once for a single
   producer session.

2. Transactions: For multi-partition atomicity, use transactions.
   Begin, produce to multiple partitions, commit or abort atomically.

3. Consumer side: The tricky part. Even with exactly-once produce, the
   consumer might fail after processing but before committing.

   Solution: Transactional consume + produce. Consumer reads, processes,
   produces output, and commits input offset ALL in one transaction.

   Or: Idempotent processing in the consumer (handle duplicates gracefully).

Note: Exactly-once has performance overhead. At-least-once with idempotent
consumers is often the practical choice."
```

### Trap 3: "A single partition is becoming a hot spot. What do you do?"

**What they're testing:** Real-world troubleshooting ability.

**Strong Response:**
```
"A hot partition usually means skewed key distribution. Let me debug:

First, identify the cause:
- Is one key (customer) sending most traffic?
- Is the partition key wrong (causing uneven distribution)?

Solutions depend on the cause:

1. If one customer is hot:
   - Composite key: customer_id:random(N) spreads across N partitions
   - But this breaks per-customer ordering - need to handle in consumer

2. If bad partition key:
   - Change to a better key (may require migration)
   - Use round-robin for topics that don't need ordering

3. Can't change keys?
   - Over-provision that partition's broker
   - Add partitions to spread load (existing keys may still be hot)

Prevention:
- Monitor partition throughput distribution
- Test with production-like data before launch"
```

### Trap 4: "What happens if a consumer crashes mid-batch?"

**What they're testing:** Understanding of offset commit semantics.

**Strong Response:**
```
"It depends on the commit strategy:

1. Auto-commit (default):
   - Commits every 5 seconds automatically
   - If crash after processing but before commit: Records reprocessed
   - If crash after commit but before processing: Records lost
   - At-least-once at best, at-most-once at worst

2. Manual commit after processing:
   - Process batch, then commitSync()
   - If crash before commit: Records reprocessed
   - At-least-once delivery

3. Transactional (exactly-once):
   - Begin transaction
   - Process and produce output
   - Commit offsets as part of transaction
   - If crash: Entire transaction aborts, nothing committed
   - Exactly-once delivery

For our financial use case, I'd use manual commit with idempotent
processing, or full transactions if we have output topics."
```

### Trap 5: "Why partition by key instead of round-robin?"

**What they're testing:** Understanding of ordering guarantees.

**Strong Response:**
```
"Round-robin gives even distribution but no ordering guarantees.
Key-based partitioning gives per-key ordering.

For our order system, we need per-customer ordering:
- 'Order placed' must come before 'Order shipped'
- With round-robin, these could go to different partitions
- Consumer processing P0 might see 'shipped' before another sees 'placed'

With customer_id as key:
- All orders for customer A go to partition X
- Consumer for X processes in order
- Ordering guaranteed

Trade-off: If one customer has lots of orders, their partition is hot.
For most systems, this skew is acceptable. If not, we'd need composite
keys with application-level ordering."
```

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| "Messages are deleted after consumption" | Shows confusion with queues | "Log-based: retained for replay" |
| "Global ordering across partitions" | Not how partitioning works | "Ordering within partition only" |
| "Just add more partitions" | Can't reduce, disrupts key routing | Discuss partition planning upfront |
| "Exactly-once is easy" | Oversimplifies | Explain idempotence + transactions |
| "ZooKeeper for coordination" | Outdated | KRaft mode is the modern approach |
| Ignoring consumer groups | Core concept | Explain partition assignment |

---

## Quick Reference Numbers

| Metric | Typical Value | Notes |
|--------|---------------|-------|
| Partition throughput | 10-50 MB/s | Depends on message size |
| Message latency (acks=all) | 5-20ms | Network + replication |
| Partitions per topic | 6-100 | More for high throughput |
| Max partitions per broker | 4,000-10,000 | More = slower failover |
| Consumer group rebalance | 1-30 seconds | Cooperative is faster |
| ISR lag threshold | 10,000 messages or 30 seconds | replica.lag.time.max.ms |
| Retention | 7 days typical | Balance replay vs storage |
| Replication factor | 3 | Standard for production |

---

## Interview Cheat Sheet

### Opening Statement
```
"A distributed log-based broker is a high-throughput messaging system built
on append-only logs. Key concepts: partitions for parallelism, ISR for
durability, consumer groups for scalable consumption. Unlike queues,
messages are retained for replay."
```

### Architecture Summary
```
"Producers send to partition leaders. Leaders replicate to ISR followers.
Consumers poll in groups, each partition assigned to one consumer.
Offsets track position for replay and exactly-once semantics."
```

### Key Trade-offs
```
1. Throughput vs Latency: Batching helps throughput, hurts latency
2. Durability vs Performance: acks=all is safer but slower
3. Partitions: More = more parallelism but harder failover
4. Ordering: Per-partition only; global order requires single partition
```

### Closing Statement
```
"To summarize: distributed log with partitions for parallelism and scale,
ISR replication for durability, consumer groups for parallel consumption.
Key configurations: acks=all, min.insync.replicas=2, partition by key
for ordering. Monitoring focuses on consumer lag, ISR health, and
under-replicated partitions."
```

---

## Practice Questions

1. "Design a real-time analytics pipeline using a log-based broker"
2. "How would you migrate from a traditional queue to a log-based system?"
3. "Design the event streaming backbone for an e-commerce platform"
4. "How would you implement exactly-once processing for payment events?"
5. "Design a multi-region event streaming architecture with failover"
