# Interview Guide

[← Back to Index](./00-index.md)

---

## 45-Minute Interview Pacing

| Time | Phase | Focus |
|------|-------|-------|
| 0-5 min | **Requirements Clarification** | Understand scope, patterns needed, scale |
| 5-15 min | **High-Level Design** | Choose pattern (2PC vs Saga vs TCC), draw architecture |
| 15-25 min | **Pattern Deep Dive** | State machine, failure handling, compensation |
| 25-35 min | **Trade-offs & Challenges** | CAP, blocking vs eventual, idempotency |
| 35-45 min | **Production Concerns** | Scalability, monitoring, recovery |

---

## Requirements Phase (0-5 minutes)

### Questions to Ask

1. **Scope**: "What services need coordination? Same datacenter or cross-region?"
2. **Consistency**: "Is strong consistency required, or is eventual consistency acceptable?"
3. **Latency**: "What's the target latency for a complete transaction?"
4. **Scale**: "How many transactions per second do we need to support?"
5. **Failure tolerance**: "How should we handle partial failures?"

### Key Clarifications

| Question | Implication |
|----------|-------------|
| "Strong consistency needed?" | Yes → 2PC, No → Saga |
| "Long-running operations?" | Yes → Saga, No → 2PC or TCC |
| "Resource reservation?" | Yes → TCC, No → 2PC or Saga |
| "Heterogeneous systems?" | Yes → Saga, No → 2PC possible |
| "Cross-region?" | Yes → Saga (2PC too latency-sensitive) |

---

## High-Level Design Phase (5-15 minutes)

### Pattern Selection Framework

```
┌────────────────────────────────────────────────────────────────────┐
│ PATTERN SELECTION DECISION TREE                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Q1: Do all participants share the same database?                   │
│     YES → Consider single DB transaction (no distributed TX)       │
│     NO  → Continue                                                 │
│                                                                     │
│ Q2: Is strong (ACID) consistency required?                         │
│     YES → Q3                                                       │
│     NO  → Saga pattern (eventual consistency)                      │
│                                                                     │
│ Q3: Are all participants homogeneous databases?                    │
│     YES → Two-Phase Commit (2PC/XA)                               │
│     NO  → Consider Saga with business-level compensation          │
│                                                                     │
│ Q4: Is there a resource reservation use case?                      │
│     YES → TCC (Try-Confirm-Cancel)                                │
│     NO  → Saga orchestration or choreography                       │
│                                                                     │
│ Q5: Do you need central visibility/control?                        │
│     YES → Saga orchestration                                       │
│     NO  → Saga choreography (event-driven)                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Architecture Diagram to Draw

```
┌─────────────────────────────────────────────────────────────────┐
│ WHITEBOARD: SAGA ORCHESTRATION ARCHITECTURE                      │
│                                                                  │
│   ┌─────────┐                                                   │
│   │ Client  │                                                   │
│   └────┬────┘                                                   │
│        │                                                        │
│        ▼                                                        │
│   ┌─────────────────┐         ┌──────────────────┐             │
│   │  Orchestrator   │────────►│  State Store     │             │
│   │  (Saga Engine)  │         │  (Saga + Idem)   │             │
│   └────────┬────────┘         └──────────────────┘             │
│            │                                                    │
│    ┌───────┴───────┬───────────────┐                          │
│    │               │               │                           │
│    ▼               ▼               ▼                           │
│ ┌──────┐       ┌──────┐       ┌──────┐                        │
│ │Svc A │       │Svc B │       │Svc C │                        │
│ └──────┘       └──────┘       └──────┘                        │
│                                                                  │
│ Key Components to Mention:                                      │
│ 1. Orchestrator: Drives saga execution                         │
│ 2. State Store: Persists saga state for recovery               │
│ 3. Idempotency Store: Prevents duplicate execution             │
│ 4. Participants: Execute steps + compensations                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deep Dive Phase (15-25 minutes)

### State Machine (Must Know)

```
Draw this state machine on the whiteboard:

    STARTED → RUNNING → COMPLETED
                │
                ▼
          COMPENSATING → COMPENSATED
                │
                ▼
              FAILED (manual intervention)
```

### Compensation Design

Explain with a concrete example:

```
Order Saga Example:

Forward:
  T1: Reserve Inventory  → C1: Release Inventory
  T2: Charge Payment     → C2: Refund Payment
  T3: Schedule Shipping  → C3: Cancel Shipping

If T3 fails:
  Execute C2 (Refund Payment)
  Execute C1 (Release Inventory)
  Mark saga as COMPENSATED
```

### Idempotency (Critical Topic)

```
Key Points to Cover:

1. Why needed: Network retries, at-least-once delivery
2. Implementation:
   - Idempotency key = saga_id + step_id + attempt
   - Check before execute, store result after
3. Storage: Cache + persistent store
4. TTL: Must cover retry window (e.g., 24 hours)
```

---

## Trade-offs Discussion (25-35 minutes)

### Key Trade-off Table

| Trade-off | Option A | Option B | Key Factor |
|-----------|----------|----------|------------|
| **2PC vs Saga** | 2PC: Strong consistency | Saga: High availability | Latency tolerance |
| **Orchestration vs Choreography** | Orchestration: Central control | Choreography: Loose coupling | Debugging needs |
| **Sync vs Async** | Sync: Simpler | Async: Higher throughput | Latency requirements |
| **Strong vs Eventual** | Strong: Easier reasoning | Eventual: Better availability | Business requirements |

### CAP Theorem Discussion

```
Distributed Transactions and CAP:

2PC: Chooses Consistency over Availability
  - Blocking on coordinator failure
  - Network partition → abort (safe but unavailable)

Saga: Chooses Availability over Consistency
  - Eventual consistency (intermediate states visible)
  - Continues during partitions via compensation

TCC: Middle ground
  - Strong isolation during Try phase
  - Eventual consistency for Confirm/Cancel
```

---

## Production Concerns (35-45 minutes)

### Scaling Strategy

```
Explain horizontal scaling:

1. Partition coordinators by transaction ID
2. Each coordinator handles subset of transactions
3. Shared nothing architecture
4. Scale: Add more coordinators
```

### Monitoring (Key Points)

- Success rate: > 99.5%
- Latency p99: < 500ms
- Compensation rate: Alert if > 5%
- Dead letter queue: Alert if > 0

### Recovery Scenario

Walk through this scenario:
```
Coordinator crashes during saga execution:
1. New coordinator starts
2. Reads incomplete sagas from state store
3. For each saga:
   - Check last completed step
   - Resume from next step (forward or compensation)
4. Idempotency ensures no duplicate execution
```

---

## Common Trap Questions

### Trap 1: "Why not just use 2PC for everything?"

**Bad Answer**: "2PC is simple and always works."

**Good Answer**:
- 2PC has the blocking problem: if coordinator fails after prepare, participants are stuck
- Latency is poor for cross-datacenter (multiple round trips)
- Doesn't work well with heterogeneous systems (microservices vs databases)
- Saga provides better availability at the cost of eventual consistency

### Trap 2: "How do you ensure exactly-once execution?"

**Bad Answer**: "We use exactly-once message delivery."

**Good Answer**:
- True exactly-once is impossible in distributed systems
- We achieve *effective* exactly-once via:
  - At-least-once delivery (retries)
  - Idempotent consumers (deduplication)
- Idempotency key stored in persistent store
- Check before execute, store result after execute

### Trap 3: "What if compensation fails?"

**Bad Answer**: "Retry until it works."

**Good Answer**:
- Compensations must be idempotent (retry-safe)
- Use exponential backoff with max retries
- After retries exhausted: move to dead letter queue
- Alert operations team for manual intervention
- Some compensations may require business-level resolution (e.g., customer service call)

### Trap 4: "How do you handle concurrent transactions accessing same resource?"

**Bad Answer**: "Use distributed locks."

**Good Answer**:
- For 2PC: Database locks during prepare phase
- For Saga: No isolation! Intermediate states visible
- For TCC: Reservation provides isolation during Try phase
- Options:
  - Semantic locking (mark record as "in transaction")
  - Commutative updates (CRDTs)
  - Business-level conflict resolution
  - Optimistic concurrency with retry

### Trap 5: "Your saga has no isolation. Isn't that a problem?"

**Bad Answer**: "No, eventual consistency is fine."

**Good Answer**:
- Yes, lack of isolation is a real concern
- Mitigations:
  - Semantic locks (pessimistic: mark records in-use)
  - Version numbers (optimistic: detect conflicts, retry)
  - Commutative operations (order doesn't matter)
  - Business process design (avoid conflicts by design)
- Trade-off: Accepted for availability and scalability benefits

---

## Implementation Comparison

| System | Pattern | Language | Key Feature |
|--------|---------|----------|-------------|
| **Temporal** | Orchestration | Multi | Durable execution, replay |
| **Apache Seata** | Multi-mode | Java | AT mode (automatic) |
| **Netflix Conductor** | Orchestration | Multi | JSON workflow definitions |
| **Axon Framework** | Saga + ES | Java/Kotlin | Event sourcing integration |
| **MassTransit** | State Machine | .NET | .NET native, RabbitMQ |

### When to Mention Each

- **E-commerce, microservices**: Temporal, Conductor
- **Java enterprise**: Seata, Axon
- **.NET shop**: MassTransit
- **Financial, banking**: Custom 2PC, Saga with strong guarantees

---

## Quick Reference Card

### Must-Know Formulas

```
2PC Latency = 2 × (log_write + max(participant_latency))

Saga Latency = Σ step_latencies (sequential)
             = max(step_latencies) (parallel where possible)

Transactions/sec per coordinator ≈ 5,000 (with sync replication)
```

### Critical Numbers

| Metric | Target |
|--------|--------|
| Transaction success rate | > 99.5% |
| 2PC latency p50 | < 50ms |
| Saga latency p50 | < 500ms |
| Compensation success | > 99.99% |
| Idempotency TTL | 24 hours |
| Coordinator failover | < 30 seconds |

### Key Concepts Checklist

- [ ] Pattern selection (2PC vs Saga vs TCC)
- [ ] State machine design
- [ ] Compensation logic
- [ ] Idempotency implementation
- [ ] Failure scenarios (coordinator, participant, network)
- [ ] CAP trade-offs
- [ ] Horizontal scaling
- [ ] Recovery procedures

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| "Use 2PC for everything" | Blocking, latency issues | Choose pattern based on requirements |
| "Saga provides ACID" | Saga is eventual consistency | Be explicit about consistency model |
| "Ignore idempotency" | Causes duplicate operations | Always implement idempotency |
| "Compensation always works" | Can fail, need fallback | Design for compensation failure |
| "Single coordinator is fine" | Single point of failure | Discuss HA from the start |
| "Forget about monitoring" | Can't debug production issues | Include observability in design |

---

## Questions to Ask Interviewer

1. "What's the expected transaction volume and latency requirements?"
2. "Are the participating services in the same datacenter or distributed?"
3. "Is there an existing message queue infrastructure we should leverage?"
4. "What's the tolerance for eventual consistency vs strong consistency?"
5. "Are there existing patterns the team has experience with?"

---

## Summary: Interview Success Factors

1. **Choose the right pattern** - Show you understand trade-offs
2. **Draw clear diagrams** - State machine, architecture
3. **Handle failures gracefully** - Compensation, recovery
4. **Discuss idempotency** - Critical for exactly-once
5. **Address production concerns** - Scaling, monitoring, HA
6. **Know real implementations** - Temporal, Seata, etc.
