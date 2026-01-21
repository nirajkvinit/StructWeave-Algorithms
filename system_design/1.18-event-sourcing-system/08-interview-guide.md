# Interview Guide

[← Back to Index](./00-index.md)

---

## 45-Minute Interview Pacing

| Time | Phase | Focus |
|------|-------|-------|
| 0-5 min | **Requirements Clarification** | Understand use case, consistency needs, scale |
| 5-15 min | **High-Level Design** | Event store, projections, snapshot strategy |
| 15-25 min | **Component Deep Dive** | Schema evolution, projection consistency |
| 25-35 min | **Trade-offs & Challenges** | CQRS integration, eventual consistency |
| 35-45 min | **Production Concerns** | Scalability, GDPR, monitoring |

---

## Requirements Phase (0-5 minutes)

### Questions to Ask

1. **Use case**: "What kind of data are we storing? Orders, financial transactions, user activity?"
2. **Audit requirements**: "Do we need complete history for compliance or debugging?"
3. **Query patterns**: "What queries will be most common? List views, aggregations?"
4. **Consistency needs**: "Is eventual consistency acceptable for reads?"
5. **Scale**: "What's the expected event rate and total data volume?"

### Key Clarifications

| Question | Implication |
|----------|-------------|
| "Need complete history?" | Yes → Event Sourcing, No → Consider CRUD |
| "Strong consistency for reads?" | Yes → Sync projections, No → Async ok |
| "High write volume?" | Yes → Consider partitioning |
| "Long-lived entities?" | Yes → Need snapshot strategy |
| "Regulatory compliance?" | Yes → Consider GDPR, retention policies |

---

## High-Level Design Phase (5-15 minutes)

### Architecture to Draw

```
┌─────────────────────────────────────────────────────────────────┐
│ WHITEBOARD: EVENT SOURCING ARCHITECTURE                          │
│                                                                  │
│   ┌─────────┐         ┌─────────────┐                           │
│   │ Commands│ ──────► │  Aggregate  │                           │
│   └─────────┘         │  Handler    │                           │
│                       └──────┬──────┘                           │
│                              │                                   │
│                              ▼                                   │
│                       ┌─────────────┐                           │
│                       │ Event Store │◄──┐                       │
│                       │ (append-only)│   │                       │
│                       └──────┬──────┘   │                       │
│                              │          │                        │
│                              ▼          │                        │
│                       ┌─────────────┐   │                        │
│                       │ Projections │   │ Load Events            │
│                       │  (async)    │   │                        │
│                       └──────┬──────┘   │                        │
│                              │          │                        │
│                              ▼          │                        │
│   ┌─────────┐         ┌─────────────┐   │                       │
│   │ Queries │ ──────► │ Read Models │───┘                       │
│   └─────────┘         └─────────────┘                           │
│                                                                  │
│ Key Points:                                                     │
│ 1. Events are the source of truth                              │
│ 2. State reconstructed by replaying events                     │
│ 3. Projections build query-optimized read models               │
│ 4. Snapshots optimize aggregate loading                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components to Discuss

| Component | Purpose | Key Design Decision |
|-----------|---------|---------------------|
| **Event Store** | Persist events | Append-only, global ordering |
| **Aggregate** | Business logic | Emit events, not state changes |
| **Projections** | Build read models | Sync vs async |
| **Snapshots** | Optimize loading | Frequency strategy |

---

## Deep Dive Phase (15-25 minutes)

### Event Schema Design

Draw this on whiteboard:

```
Event Structure:
{
  "event_id": "uuid",
  "stream_id": "order-123",
  "stream_position": 5,
  "global_position": 12345,
  "event_type": "OrderCreated",
  "data": { business payload },
  "metadata": { correlation_id, user_id, timestamp }
}

Key Points:
- Stream position: ordering within aggregate
- Global position: total ordering across system
- Metadata: tracing, audit information
```

### Optimistic Concurrency

Explain with example:

```
User A loads order (version 5)
User B loads order (version 5)
User A saves (expect 5) → Success, now version 6
User B saves (expect 5) → CONFLICT! Current is 6

Resolution options:
1. Retry: Reload, re-apply command
2. Merge: If commands are commutative
3. Fail: Return error to user
```

### Schema Evolution (Critical Topic)

```
Strategies for handling schema changes:

1. Weak Schema (Flexible)
   - Store as JSON, handle missing fields
   - Pro: Easy evolution
   - Con: No compile-time safety

2. Upcasting (Recommended)
   - Events have schema version
   - Transform old events on read
   - Chain: V1 → V2 → V3 → current

3. Copy-Transform
   - Create new event types
   - Keep old for backward compatibility
```

---

## Trade-offs Discussion (25-35 minutes)

### Key Trade-off Table

| Trade-off | Option A | Option B | Key Factor |
|-----------|----------|----------|------------|
| **Sync vs Async Projections** | Sync: Strong consistency | Async: Better performance | Read latency tolerance |
| **Snapshot Frequency** | Frequent: Fast loads | Infrequent: Less I/O | Stream length |
| **Event Granularity** | Fine: Detailed history | Coarse: Simpler | Business requirements |
| **Strong vs Weak Schema** | Strong: Type safety | Weak: Flexibility | Team discipline |

### Event Sourcing + CQRS Discussion

```
When to combine with CQRS:

Event Sourcing Only:
- Write model = replay events
- Read model = same replay
- Simple but limited queries

Event Sourcing + CQRS:
- Write model = replay events
- Read models = denormalized projections
- Complex queries supported
- Eventually consistent reads
```

### Consistency Model

```
Event Store: Strongly consistent (within stream)
Projections: Eventually consistent (by default)

Options for stronger consistency:
1. Sync projections (in same transaction)
2. Read-your-writes (wait for position)
3. Polling until position reached
```

---

## Production Concerns (35-45 minutes)

### Scaling Strategy

```
Event Store Scaling:
1. Read replicas for subscriptions
2. Partition by stream category
3. Consistent hash partitioning

Projection Scaling:
1. Partition by stream/category
2. Multiple workers per partition
3. Competing consumers (careful with ordering)
```

### GDPR Compliance

Explain crypto-shredding:

```
Problem: Events are immutable, but GDPR requires deletion

Solution: Crypto-shredding
1. Encrypt PII with per-user key
2. On deletion request: delete the key
3. Events remain but PII is unreadable
4. Projections rebuilt will skip/anonymize
```

### Monitoring (Key Points)

- Projection lag: Alert if > 60 seconds
- Dead letter queue: Alert if > 0
- Concurrency conflicts: Monitor rate
- Snapshot age: Alert if too old

---

## Common Trap Questions

### Trap 1: "Why not just use a traditional database with an audit log?"

**Bad Answer**: "Event sourcing is always better for auditing."

**Good Answer**:
- Traditional DB + audit log can work, but they can diverge
- With event sourcing, the log IS the source of truth, not a copy
- Key benefit: temporal queries ("what was state at time T?")
- Trade-off: More complex, eventual consistency for reads
- Use event sourcing when: audit is critical, need temporal queries, or different read models

### Trap 2: "How do you handle events that were stored incorrectly?"

**Bad Answer**: "Delete the event and re-add it."

**Good Answer**:
- Events are immutable - never delete or modify
- Options:
  1. **Compensating event**: Add event that corrects the mistake
  2. **Ignore in projections**: Skip known-bad events
  3. **Upcasting**: Transform on read to fix issues
- The history shows the mistake AND the correction (audit trail)

### Trap 3: "Your projections are eventually consistent. How do users know they're seeing current data?"

**Bad Answer**: "We use synchronous projections for everything."

**Good Answer**:
- Most reads can tolerate eventual consistency (list views, dashboards)
- For critical reads after writes:
  1. Return event position with write response
  2. Client polls/waits until projection catches up
  3. Or use inline/sync projection for that specific read
- Example: After submitting order, wait for order confirmation view to catch up

### Trap 4: "What if the projection logic has a bug and the read model is wrong?"

**Bad Answer**: "Restore from backup."

**Good Answer**:
- Fix the bug in projection code
- Drop and rebuild the read model from events
- Events are immutable source of truth
- This is a STRENGTH of event sourcing - read models are derived, can always be rebuilt
- Use blue-green deployment for rebuilds to avoid downtime

### Trap 5: "How do you handle a stream with millions of events?"

**Bad Answer**: "Just replay all of them."

**Good Answer**:
- Snapshots: Store periodic state checkpoints
- Load latest snapshot, replay only events since
- Snapshot every N events (e.g., 100)
- Trade-off: More storage for faster loads
- For very long streams: consider archival or stream splitting

---

## Real-World Implementations

| System | Type | Key Features |
|--------|------|--------------|
| **EventStoreDB** | Purpose-built | Native projections, built-in subscriptions |
| **Marten** | PostgreSQL-based | .NET integration, document store |
| **Axon Framework** | Java framework | CQRS integration, saga support |
| **Kafka + Custom** | DIY | High throughput, flexible |
| **DynamoDB Streams** | Managed | Serverless, AWS integration |

### When to Use Each

- **General purpose, polyglot**: EventStoreDB
- **.NET ecosystem**: Marten
- **Java enterprise**: Axon Framework
- **High throughput, existing Kafka**: Kafka + custom
- **Serverless/AWS**: DynamoDB Streams

---

## Quick Reference Card

### Must-Know Formulas

```
Aggregate Load Time ≈ Snapshot_Load + (Events_Since_Snapshot × Event_Process_Time)

Projection Lag = Head_Position - Checkpoint_Position

Replay Time (full) = Total_Events / Processing_Rate
Example: 100M events / 50K per sec = 2000 sec ≈ 33 minutes
```

### Critical Numbers

| Metric | Target |
|--------|--------|
| Event append latency p50 | < 5ms |
| Event append latency p99 | < 20ms |
| Projection lag | < 60 seconds |
| Snapshot age | < 500 events |
| Events per stream (comfortable) | < 10,000 |
| Full rebuild time | < 2 hours |

### Key Concepts Checklist

- [ ] Event store append-only semantics
- [ ] Optimistic concurrency control
- [ ] Projections and read models
- [ ] Snapshot strategy
- [ ] Schema evolution (upcasting)
- [ ] GDPR compliance (crypto-shredding)
- [ ] Eventual consistency trade-offs
- [ ] CQRS integration

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| "Store current state in events" | Events should capture WHAT happened, not current state | Store facts: "OrderPlaced", not "Order: {current state}" |
| "Modify events when wrong" | Breaks immutability, audit trail | Use compensating events |
| "One huge event with everything" | Hard to evolve, large storage | Small, focused events per change |
| "Sync projections everywhere" | Slows writes, tight coupling | Async by default, sync only when needed |
| "Skip snapshots" | Long load times as streams grow | Implement from the start |
| "Ignore schema evolution" | Breaking changes impossible | Plan upcasting strategy early |

---

## Questions to Ask Interviewer

1. "What are the main entities that need event sourcing? Are there some that don't?"
2. "What's the expected query latency requirement for read models?"
3. "Are there regulatory requirements that affect data retention or deletion?"
4. "Is there an existing event backbone (Kafka, RabbitMQ) we should integrate with?"
5. "What's the team's experience with eventual consistency?"

---

## Summary: Interview Success Factors

1. **Explain the WHY** - When event sourcing adds value vs when it's overkill
2. **Draw clear diagrams** - Event store, projections, read models
3. **Handle schema evolution** - Upcasting is critical
4. **Discuss consistency trade-offs** - Sync vs async projections
5. **Address production concerns** - Snapshots, GDPR, monitoring
6. **Know real implementations** - EventStoreDB, Marten, Axon
