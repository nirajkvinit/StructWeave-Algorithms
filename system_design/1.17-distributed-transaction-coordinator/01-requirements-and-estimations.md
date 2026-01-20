# Requirements and Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Transaction Coordination** | Coordinate multi-service transactions with atomic commit/rollback semantics | P0 |
| **Participant Management** | Register, track, and communicate with transaction participants | P0 |
| **Transaction Logging** | Durable logging of transaction state for recovery | P0 |
| **Timeout Handling** | Detect and handle stalled transactions with configurable timeouts | P0 |
| **Compensation Execution** | Execute compensating transactions for saga rollbacks | P0 |
| **Idempotency** | Support idempotent operation execution to handle retries | P0 |
| **State Queries** | Query transaction status and history | P1 |
| **Saga Definition** | Define saga workflows (steps, compensations, timeouts) | P1 |
| **Dead Letter Handling** | Handle permanently failed transactions | P1 |
| **Manual Intervention** | Admin API for stuck transaction resolution | P2 |

### Supported Patterns

```
┌────────────────────────────────────────────────────────────────────┐
│ TRANSACTION PATTERNS                                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Two-Phase Commit (2PC):                                            │
│ • Prepare phase with voting                                        │
│ • Commit/abort decision                                            │
│ • Participant acknowledgment                                       │
│ • Coordinator-driven recovery                                      │
│                                                                     │
│ Saga (Orchestration):                                              │
│ • Sequential step execution                                        │
│ • Compensation on failure                                          │
│ • State persistence per step                                       │
│ • Retry with backoff                                               │
│                                                                     │
│ Saga (Choreography):                                               │
│ • Event-driven execution                                           │
│ • Transactional outbox                                             │
│ • Event sourcing support                                           │
│ • Correlation ID tracking                                          │
│                                                                     │
│ TCC (Try-Confirm-Cancel):                                          │
│ • Try phase (reservation)                                          │
│ • Confirm phase (commit reservation)                               │
│ • Cancel phase (release reservation)                               │
│ • Timeout-based auto-cancel                                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### API Operations

| Operation | Type | Description |
|-----------|------|-------------|
| Begin Transaction | Sync | Start a new distributed transaction |
| Register Participant | Sync | Add a service to the transaction |
| Prepare | Async | Send prepare to all participants |
| Commit | Async | Commit the transaction |
| Rollback | Async | Abort and rollback the transaction |
| Get Status | Sync | Query transaction state |
| Start Saga | Sync | Begin a saga workflow |
| Execute Step | Async | Execute next saga step |
| Compensate | Async | Trigger compensation chain |
| Try/Confirm/Cancel | Sync | TCC phase operations |

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|--------|--------|-----------|
| **2PC Latency (p50)** | < 50ms | Synchronous coordination |
| **2PC Latency (p99)** | < 200ms | Includes network variance |
| **Saga Step Latency (p50)** | < 100ms | Per-step execution |
| **Saga End-to-End (p50)** | < 500ms | Typical 5-step saga |
| **Coordinator Throughput** | 10K TPS | Single coordinator instance |
| **Saga Throughput** | 1K-5K TPS | Depends on step count |
| **State Lookup** | < 10ms | Transaction status queries |

### Scalability Targets

| Metric | Scale | Notes |
|--------|-------|-------|
| **Concurrent Transactions** | 100K+ | Active transactions in flight |
| **Transaction Throughput** | 50K TPS | Aggregate across all coordinators |
| **Participants per TX** | Up to 20 | Practical limit for latency |
| **Saga Steps** | Up to 50 | Long-running workflows |
| **Transaction Log Size** | PB-scale | Historical transactions |
| **Coordinator Nodes** | 10-100 | Horizontally scalable |

### Reliability Requirements

| Requirement | Target | Mechanism |
|-------------|--------|-----------|
| **Availability** | 99.99% | Multi-node coordinators |
| **Durability** | 99.9999% | Replicated transaction logs |
| **Recovery Time** | < 30 seconds | Automatic failover |
| **Data Loss** | Zero | Synchronous replication |
| **Exactly-Once** | Required | Idempotency + deduplication |

---

## Capacity Estimation

### Reference System: E-commerce Platform

**Assumptions:**
- 10,000 orders per minute at peak
- Each order = 1 saga with 5 steps (inventory, payment, fraud check, shipping, notification)
- 95% success rate (5% require compensation)
- Average saga duration: 500ms
- Transaction log entry: 2KB average

### Traffic Calculations

```
┌────────────────────────────────────────────────────────────────────┐
│ TRAFFIC ESTIMATION                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Order Rate:                                                         │
│   Peak: 10,000 orders/min = ~167 orders/sec                        │
│   Daily: 1,000,000 orders                                          │
│                                                                     │
│ Transaction Coordinator Load:                                       │
│   Sagas/sec: 167                                                   │
│   Steps/sec: 167 × 5 = 835 step executions                         │
│   Messages/sec: 835 × 2 (command + response) = 1,670               │
│                                                                     │
│ Compensation Load (5% failure rate):                               │
│   Failed sagas/sec: 167 × 0.05 = 8.35                             │
│   Compensation steps/sec: 8.35 × 3 (avg rollback) = 25            │
│                                                                     │
│ State Machine Updates:                                              │
│   Per saga: ~10 state transitions                                  │
│   Total updates/sec: 167 × 10 = 1,670                             │
│                                                                     │
│ With 3x headroom for spikes:                                       │
│   Sagas/sec: 500                                                   │
│   State updates/sec: 5,000                                         │
│   Messages/sec: 5,000                                              │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Storage Estimation

```
┌────────────────────────────────────────────────────────────────────┐
│ STORAGE ESTIMATION                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Transaction Log Entry:                                              │
│   Transaction ID: 16 bytes (UUID)                                  │
│   State: 100 bytes (serialized state machine)                      │
│   Participant list: 500 bytes (5 participants × 100 bytes)         │
│   Timestamps: 32 bytes                                             │
│   Metadata: 200 bytes                                              │
│   Step results: 1KB (serialized responses)                         │
│   Total per TX: ~2KB                                               │
│                                                                     │
│ Daily Storage:                                                      │
│   1,000,000 transactions × 2KB = 2GB/day                           │
│   With indexes: ~4GB/day                                           │
│                                                                     │
│ Monthly Storage:                                                    │
│   4GB × 30 = 120GB/month                                           │
│                                                                     │
│ Retention (90 days):                                               │
│   360GB active data                                                │
│   Archive: Compressed to ~100GB                                    │
│                                                                     │
│ Idempotency Store:                                                  │
│   Key: 64 bytes, Value: 256 bytes                                  │
│   TTL: 24 hours                                                    │
│   Max entries: 10M × 320 bytes = 3.2GB                            │
│                                                                     │
│ Hot Data (in-memory):                                               │
│   Active transactions: 100K × 2KB = 200MB                         │
│   Idempotency cache: 1M entries × 320 bytes = 320MB               │
│   Total RAM: ~1GB per coordinator                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Message Queue Sizing

```
┌────────────────────────────────────────────────────────────────────┐
│ MESSAGE QUEUE ESTIMATION                                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Message Types:                                                      │
│   • Saga commands (step execution)                                 │
│   • Saga events (step completion)                                  │
│   • Compensation commands                                          │
│   • Status updates                                                 │
│                                                                     │
│ Message Rate:                                                       │
│   Commands: 5,000/sec                                              │
│   Events: 5,000/sec                                                │
│   Total: 10,000 messages/sec                                       │
│                                                                     │
│ Message Size:                                                       │
│   Average: 1KB (includes payload, headers, metadata)               │
│                                                                     │
│ Throughput:                                                         │
│   10,000 msg/sec × 1KB = 10MB/sec = 80Mbps                        │
│                                                                     │
│ Queue Partitioning:                                                 │
│   Partition by saga_id for ordering                                │
│   10 partitions (1,000 msg/sec per partition)                      │
│                                                                     │
│ Retention:                                                          │
│   7 days for replay capability                                     │
│   10,000 msg/sec × 86,400 sec × 7 days × 1KB = 6TB               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Service Level Objectives (SLOs)

### Latency SLOs

| Scenario | p50 | p95 | p99 | p99.9 |
|----------|-----|-----|-----|-------|
| 2PC Transaction (3 participants) | 30ms | 60ms | 100ms | 200ms |
| Saga Step Execution | 50ms | 100ms | 200ms | 500ms |
| Saga Completion (5 steps) | 300ms | 500ms | 800ms | 1500ms |
| Saga Compensation (3 steps) | 200ms | 400ms | 600ms | 1000ms |
| TCC Try Phase | 20ms | 50ms | 100ms | 200ms |
| TCC Confirm/Cancel | 20ms | 50ms | 100ms | 200ms |
| Status Query | 5ms | 10ms | 20ms | 50ms |

### Availability SLOs

| Component | SLO | Allowed Downtime/Year |
|-----------|-----|----------------------|
| Transaction Coordinator | 99.99% | 52.6 minutes |
| Saga Orchestrator | 99.99% | 52.6 minutes |
| Transaction Log Store | 99.999% | 5.26 minutes |
| Message Queue | 99.99% | 52.6 minutes |
| Admin API | 99.9% | 8.76 hours |

### Success Rate SLOs

| Metric | Target |
|--------|--------|
| Transaction Success Rate | > 99.5% |
| Compensation Success Rate | > 99.99% |
| Idempotent Operation Dedup | 100% |
| Message Delivery | Exactly once |
| State Recovery | Zero data loss |

---

## Use Cases

### Primary Use Case: Order Processing Saga

```
┌────────────────────────────────────────────────────────────────────┐
│ ORDER PROCESSING SAGA                                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Scenario: Customer places an order                                  │
│                                                                     │
│ Forward Flow:                                                       │
│   Step 1: Reserve Inventory                                        │
│     Service: Inventory Service                                     │
│     Action: Decrement available stock                              │
│     Compensation: Release reserved stock                           │
│                                                                     │
│   Step 2: Process Payment                                          │
│     Service: Payment Service                                       │
│     Action: Charge customer card                                   │
│     Compensation: Refund payment                                   │
│                                                                     │
│   Step 3: Fraud Check                                              │
│     Service: Fraud Service                                         │
│     Action: Validate transaction                                   │
│     Compensation: None (read-only)                                 │
│                                                                     │
│   Step 4: Schedule Shipping                                        │
│     Service: Shipping Service                                      │
│     Action: Create shipment                                        │
│     Compensation: Cancel shipment                                  │
│                                                                     │
│   Step 5: Send Notification                                        │
│     Service: Notification Service                                  │
│     Action: Email confirmation                                     │
│     Compensation: None (best-effort)                               │
│                                                                     │
│ Failure at Step 3 (Fraud Check fails):                            │
│   → Compensate Step 2: Refund payment                             │
│   → Compensate Step 1: Release inventory                          │
│   → Mark saga as COMPENSATED                                       │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Secondary Use Case: Bank Transfer (2PC)

```
┌────────────────────────────────────────────────────────────────────┐
│ BANK TRANSFER (2PC)                                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Scenario: Transfer $100 from Account A to Account B                │
│                                                                     │
│ Phase 1: Prepare                                                    │
│   Coordinator → Account A DB: PREPARE (debit $100)                 │
│   Coordinator → Account B DB: PREPARE (credit $100)                │
│   Both DBs: Acquire locks, write to redo log, vote COMMIT          │
│                                                                     │
│ Phase 2: Commit                                                     │
│   Coordinator receives both COMMIT votes                           │
│   Coordinator logs COMMIT decision                                 │
│   Coordinator → Account A DB: COMMIT                               │
│   Coordinator → Account B DB: COMMIT                               │
│   Both DBs: Apply changes, release locks                           │
│                                                                     │
│ Failure Handling:                                                   │
│   If Account A votes ABORT: Coordinator sends ABORT to all        │
│   If Coordinator fails: Participants query coordinator on recovery │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Use Case: Seat Reservation (TCC)

```
┌────────────────────────────────────────────────────────────────────┐
│ SEAT RESERVATION (TCC)                                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Scenario: Book flight seat + hotel room + car rental               │
│                                                                     │
│ Try Phase:                                                          │
│   Flight: Reserve seat (status = PENDING)                          │
│   Hotel: Reserve room (status = PENDING)                           │
│   Car: Reserve vehicle (status = PENDING)                          │
│   All resources held for 15 minutes                                │
│                                                                     │
│ Confirm Phase (user completes checkout):                           │
│   Flight: Confirm seat (status = CONFIRMED)                        │
│   Hotel: Confirm room (status = CONFIRMED)                         │
│   Car: Confirm vehicle (status = CONFIRMED)                        │
│                                                                     │
│ Cancel Phase (user abandons or timeout):                           │
│   Flight: Cancel reservation (status = AVAILABLE)                  │
│   Hotel: Cancel reservation (status = AVAILABLE)                   │
│   Car: Cancel reservation (status = AVAILABLE)                     │
│                                                                     │
│ Key: Each service maintains PENDING state                          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Constraints and Assumptions

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **Network Latency** | Adds to transaction time | Minimize participants, use regional deployment |
| **Participant Timeout** | Can cause blocking in 2PC | Use saga for long operations |
| **Message Ordering** | Required for choreography | Partition by correlation ID |
| **Clock Skew** | Affects timeout detection | Use logical clocks, NTP sync |
| **Database Locks** | Limit concurrency in 2PC | Keep transactions short |

### Protocol Constraints

| Constraint | Description |
|------------|-------------|
| **2PC Blocking** | Participants block if coordinator fails after prepare |
| **Saga Isolation** | No isolation between concurrent sagas |
| **TCC Reservation Time** | Resources locked during Try phase |
| **Compensation Limits** | Some operations cannot be compensated |
| **Idempotency Window** | Must retain keys for retry window |

### Assumptions

1. **Network**: Participants are reachable with bounded latency
2. **Storage**: Transaction log is durable and replicated
3. **Idempotency**: All participant operations are idempotent
4. **Compensation**: Every step has a defined compensation (may be no-op)
5. **Ordering**: Message queue preserves order within partition
6. **Clock**: Bounded clock skew across nodes (< 1 second)

---

## Out of Scope

| Feature | Reason | Alternative |
|---------|--------|-------------|
| **Distributed Locking** | Separate concern | Use Distributed Lock Manager (1.8) |
| **Service Discovery** | Infrastructure component | Use Service Discovery (1.10) |
| **Workflow Scheduling** | Different problem domain | Use Job Scheduler |
| **Event Sourcing Storage** | Separate pattern | Use Event Store |
| **Cross-Region Transactions** | Extreme complexity | Redesign for eventual consistency |

---

## Comparison with Alternatives

### Framework Comparison

| Framework | Pattern | Language | Strengths | Limitations |
|-----------|---------|----------|-----------|-------------|
| **Temporal** | Orchestration | Multi-lang | Durable execution, rich SDK | Learning curve, self-hosted complexity |
| **Apache Seata** | Multi-mode | Java | AT mode automatic, enterprise features | Java-centric |
| **Netflix Conductor** | Orchestration | Multi-lang | JSON workflows, Netflix-proven | Limited saga support |
| **Axon Framework** | Saga + ES | Java | DDD integration, event sourcing | Java/Kotlin only |
| **MassTransit** | State Machine | .NET | .NET native, RabbitMQ/Kafka support | .NET ecosystem |
| **Eventuate Tram** | Choreography | Java | Transactional outbox, CDC | Java ecosystem |

### Build vs Buy Analysis

| Factor | Build | Buy (Temporal/Seata) |
|--------|-------|---------------------|
| **Upfront Cost** | High (6-12 months) | Low (weeks to integrate) |
| **Operational Cost** | High (dedicated team) | Medium (managed option available) |
| **Customization** | Full control | Limited to framework features |
| **Learning Curve** | Team must learn distributed TX | Framework abstracts complexity |
| **When to Choose** | Unique requirements, scale | Most companies |

---

## Summary

| Category | Key Metric |
|----------|------------|
| **Scale** | 50K TPS aggregate, 100K concurrent transactions |
| **Latency** | < 50ms (2PC p50), < 500ms (Saga 5-step p50) |
| **Availability** | 99.99% |
| **Durability** | 99.9999% (zero data loss) |
| **Storage** | 4GB/day transaction logs |
| **Message Rate** | 10K messages/sec |
