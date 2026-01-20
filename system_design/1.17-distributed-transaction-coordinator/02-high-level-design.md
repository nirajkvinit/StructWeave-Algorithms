# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture Overview

The Distributed Transaction Coordinator provides multiple patterns for coordinating transactions across services. The architecture supports 2PC, Saga (both orchestration and choreography), and TCC patterns.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        API[API Gateway]
        SVC[Business Services]
    end

    subgraph Coordinator["Transaction Coordinator Cluster"]
        TC1[Coordinator Node 1]
        TC2[Coordinator Node 2]
        TC3[Coordinator Node 3]
        LB[Load Balancer]
    end

    subgraph Storage["Persistent Storage"]
        TXLOG[(Transaction Log<br/>Replicated DB)]
        IDEM[(Idempotency Store<br/>Key-Value)]
        SAGA[(Saga State Store)]
    end

    subgraph Messaging["Message Infrastructure"]
        CMD[Command Queue]
        EVT[Event Queue]
        DLQ[Dead Letter Queue]
    end

    subgraph Participants["Participant Services"]
        P1[Service A]
        P2[Service B]
        P3[Service C]
    end

    API --> LB
    SVC --> LB
    LB --> TC1
    LB --> TC2
    LB --> TC3

    TC1 --> TXLOG
    TC2 --> TXLOG
    TC3 --> TXLOG

    TC1 --> IDEM
    TC1 --> SAGA

    TC1 --> CMD
    CMD --> P1
    CMD --> P2
    CMD --> P3

    P1 --> EVT
    P2 --> EVT
    P3 --> EVT

    EVT --> TC1
    EVT --> TC2
    EVT --> TC3

    CMD --> DLQ
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Transaction Coordinator** | Orchestrates transaction lifecycle, state management, decision making |
| **Transaction Log** | Durable record of all transaction states and decisions |
| **Idempotency Store** | Tracks processed operations to prevent duplicates |
| **Saga State Store** | Persists saga state machines and step progress |
| **Command Queue** | Delivers commands to participant services |
| **Event Queue** | Receives completion events from participants |
| **Dead Letter Queue** | Holds failed messages for manual review |
| **Participant Services** | Execute business operations with compensation support |

---

## Two-Phase Commit (2PC) Architecture

### Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant TC as Coordinator
    participant TL as TX Log
    participant P1 as Participant A
    participant P2 as Participant B

    C->>TC: Begin Transaction
    TC->>TL: Log TX_STARTED
    TC-->>C: TX ID

    C->>TC: Execute (operations...)

    Note over TC,P2: Phase 1: Prepare
    TC->>TL: Log PREPARING
    par Prepare All
        TC->>P1: PREPARE
        TC->>P2: PREPARE
    end

    P1->>P1: Acquire locks, write redo log
    P2->>P2: Acquire locks, write redo log

    P1-->>TC: VOTE_COMMIT
    P2-->>TC: VOTE_COMMIT

    Note over TC,P2: Phase 2: Commit
    TC->>TL: Log COMMITTING (decision point)
    par Commit All
        TC->>P1: COMMIT
        TC->>P2: COMMIT
    end

    P1->>P1: Apply changes, release locks
    P2->>P2: Apply changes, release locks

    P1-->>TC: ACK
    P2-->>TC: ACK

    TC->>TL: Log COMMITTED
    TC-->>C: TX Committed
```

### 2PC Component Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│ TWO-PHASE COMMIT ARCHITECTURE                                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    COORDINATOR                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │   Request    │  │    State     │  │   Recovery   │      │   │
│  │  │   Handler    │→ │   Machine    │→ │   Manager    │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  │         │                 │                 ↑               │   │
│  │         ↓                 ↓                 │               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │  Participant │  │ Transaction  │  │    Timer     │      │   │
│  │  │   Registry   │  │     Log      │  │   Manager    │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ↓                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │  Participant A │  │  Participant B │  │  Participant C │       │
│  │  ┌──────────┐  │  │  ┌──────────┐  │  │  ┌──────────┐  │       │
│  │  │ Resource │  │  │  │ Resource │  │  │  │ Resource │  │       │
│  │  │ Manager  │  │  │  │ Manager  │  │  │  │ Manager  │  │       │
│  │  └──────────┘  │  │  └──────────┘  │  │  └──────────┘  │       │
│  │  ┌──────────┐  │  │  ┌──────────┐  │  │  ┌──────────┐  │       │
│  │  │   Redo   │  │  │  │   Redo   │  │  │  │   Redo   │  │       │
│  │  │   Log    │  │  │  │   Log    │  │  │  │   Log    │  │       │
│  │  └──────────┘  │  │  └──────────┘  │  │  └──────────┘  │       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 2PC Decision Rules

| All Votes | Coordinator Failure | Decision |
|-----------|---------------------|----------|
| All COMMIT | Before logging decision | ABORT (timeout) |
| All COMMIT | After logging COMMIT | COMMIT on recovery |
| Any ABORT | Any time | ABORT |
| Timeout | Any time | ABORT |

---

## Three-Phase Commit (3PC) Architecture

### Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant TC as Coordinator
    participant P1 as Participant A
    participant P2 as Participant B

    C->>TC: Begin Transaction

    Note over TC,P2: Phase 1: CAN-COMMIT
    par Can Commit Query
        TC->>P1: CAN_COMMIT?
        TC->>P2: CAN_COMMIT?
    end
    P1-->>TC: YES
    P2-->>TC: YES

    Note over TC,P2: Phase 2: PRE-COMMIT
    par Pre-Commit
        TC->>P1: PRE_COMMIT
        TC->>P2: PRE_COMMIT
    end
    P1->>P1: Acquire locks, prepare
    P2->>P2: Acquire locks, prepare
    P1-->>TC: ACK
    P2-->>TC: ACK

    Note over TC,P2: Phase 3: DO-COMMIT
    par Do Commit
        TC->>P1: DO_COMMIT
        TC->>P2: DO_COMMIT
    end
    P1->>P1: Commit, release locks
    P2->>P2: Commit, release locks
    P1-->>TC: ACK
    P2-->>TC: ACK

    TC-->>C: TX Committed
```

### 3PC vs 2PC

| Aspect | 2PC | 3PC |
|--------|-----|-----|
| **Phases** | 2 (Prepare, Commit) | 3 (CanCommit, PreCommit, DoCommit) |
| **Blocking** | Blocks on coordinator failure | Non-blocking (participants can decide) |
| **Latency** | 2 round trips | 3 round trips |
| **Network Partition** | Safe (blocks) | Unsafe (can diverge) |
| **Real-World Use** | XA transactions, databases | Rarely used in practice |

---

## Saga Orchestration Architecture

### Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant O as Orchestrator
    participant S as State Store
    participant INV as Inventory
    participant PAY as Payment
    participant SHIP as Shipping

    C->>O: Start Order Saga
    O->>S: Save saga (STARTED)

    Note over O,SHIP: Forward Flow
    O->>INV: Reserve Inventory
    INV-->>O: Success
    O->>S: Save step 1 complete

    O->>PAY: Process Payment
    PAY-->>O: Success
    O->>S: Save step 2 complete

    O->>SHIP: Schedule Shipping
    SHIP-->>O: FAILURE

    Note over O,SHIP: Compensation Flow
    O->>S: Save saga (COMPENSATING)

    O->>PAY: Refund Payment
    PAY-->>O: Refunded
    O->>S: Save compensation 1 complete

    O->>INV: Release Inventory
    INV-->>O: Released
    O->>S: Save compensation 2 complete

    O->>S: Save saga (COMPENSATED)
    O-->>C: Saga Failed (Compensated)
```

### Orchestration Component Architecture

```mermaid
flowchart TB
    subgraph Orchestrator["Saga Orchestrator"]
        API[Saga API]
        ENGINE[Execution Engine]
        SM[State Machine]
        RETRY[Retry Handler]
        COMP[Compensation Engine]
    end

    subgraph Persistence["State Persistence"]
        STORE[(Saga Store)]
        IDEM[(Idempotency)]
    end

    subgraph Services["Participant Services"]
        direction LR
        S1[Step 1 Service]
        S2[Step 2 Service]
        S3[Step 3 Service]
    end

    API --> ENGINE
    ENGINE --> SM
    SM --> STORE
    ENGINE --> RETRY
    ENGINE --> COMP

    ENGINE --> S1
    ENGINE --> S2
    ENGINE --> S3

    RETRY --> IDEM
    COMP --> S1
    COMP --> S2
```

### Orchestrator Responsibilities

```
┌────────────────────────────────────────────────────────────────────┐
│ SAGA ORCHESTRATOR COMPONENTS                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Execution Engine:                                                   │
│ • Execute saga steps in defined order                              │
│ • Handle step responses (success/failure)                          │
│ • Trigger compensations on failure                                 │
│ • Manage timeouts and retries                                      │
│                                                                     │
│ State Machine:                                                      │
│ • Track saga state (RUNNING, COMPENSATING, COMPLETED, FAILED)     │
│ • Track individual step states                                     │
│ • Persist state after each transition                             │
│                                                                     │
│ Compensation Engine:                                                │
│ • Execute compensating transactions in reverse order               │
│ • Handle compensation failures                                     │
│ • Support partial compensation                                     │
│                                                                     │
│ Retry Handler:                                                      │
│ • Implement exponential backoff                                    │
│ • Respect max retry limits                                         │
│ • Move to DLQ after exhaustion                                     │
│                                                                     │
│ Idempotency Manager:                                                │
│ • Generate/validate idempotency keys                               │
│ • Deduplicate retry attempts                                       │
│ • Cache previous results                                           │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Saga Choreography Architecture

### Event-Driven Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant INV as Inventory
    participant PAY as Payment
    participant SHIP as Shipping
    participant Q as Event Queue

    C->>INV: Create Order
    INV->>INV: Reserve Stock
    INV->>Q: OrderCreated event

    Q->>PAY: OrderCreated
    PAY->>PAY: Process Payment
    PAY->>Q: PaymentCompleted event

    Q->>SHIP: PaymentCompleted
    SHIP->>SHIP: Schedule Shipment
    SHIP->>Q: ShipmentScheduled event

    Note over C,Q: If Payment Fails
    PAY->>Q: PaymentFailed event
    Q->>INV: PaymentFailed
    INV->>INV: Release Stock (Compensate)
    INV->>Q: StockReleased event
```

### Choreography Architecture

```mermaid
flowchart TB
    subgraph Services["Microservices"]
        subgraph Order["Order Service"]
            O_API[Order API]
            O_HANDLER[Event Handler]
            O_OUTBOX[(Outbox)]
        end

        subgraph Inventory["Inventory Service"]
            I_API[Inventory API]
            I_HANDLER[Event Handler]
            I_OUTBOX[(Outbox)]
        end

        subgraph Payment["Payment Service"]
            P_API[Payment API]
            P_HANDLER[Event Handler]
            P_OUTBOX[(Outbox)]
        end
    end

    subgraph Messaging["Event Bus"]
        TOPIC1[order-events]
        TOPIC2[inventory-events]
        TOPIC3[payment-events]
    end

    subgraph Infrastructure["Infrastructure"]
        CDC[CDC Connector]
        DLQ[Dead Letter Queue]
    end

    O_OUTBOX --> CDC
    I_OUTBOX --> CDC
    P_OUTBOX --> CDC

    CDC --> TOPIC1
    CDC --> TOPIC2
    CDC --> TOPIC3

    TOPIC1 --> I_HANDLER
    TOPIC1 --> P_HANDLER
    TOPIC2 --> O_HANDLER
    TOPIC2 --> P_HANDLER
    TOPIC3 --> O_HANDLER
    TOPIC3 --> I_HANDLER
```

### Transactional Outbox Pattern

```
┌────────────────────────────────────────────────────────────────────┐
│ TRANSACTIONAL OUTBOX PATTERN                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Problem: How to atomically update DB and publish event?            │
│                                                                     │
│ Solution: Write event to outbox table in same transaction          │
│                                                                     │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │  BEGIN TRANSACTION                                            │   │
│ │    UPDATE inventory SET quantity = quantity - 1               │   │
│ │    INSERT INTO outbox (event_type, payload, created_at)      │   │
│ │      VALUES ('InventoryReserved', '{"orderId": "123"}', now) │   │
│ │  COMMIT                                                       │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ CDC (Change Data Capture) or Polling reads outbox:                 │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │  Outbox Table                        Event Bus               │   │
│ │  ┌─────────────────────┐             ┌──────────────┐        │   │
│ │  │ id │ event │ status │  ────────►  │ Message Queue│        │   │
│ │  │ 1  │ {...} │ SENT   │  CDC/Poll   │              │        │   │
│ │  │ 2  │ {...} │ PENDING│             └──────────────┘        │   │
│ │  └─────────────────────┘                                     │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ Benefits:                                                           │
│ • Atomic: DB change + event in one transaction                    │
│ • Reliable: No event loss even on crash                           │
│ • Ordered: Events processed in order                               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## TCC (Try-Confirm-Cancel) Architecture

### Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant TC as TCC Coordinator
    participant F as Flight Service
    participant H as Hotel Service
    participant R as Car Rental

    C->>TC: Book Travel Package

    Note over TC,R: Try Phase (Reserve)
    par Try All
        TC->>F: Try (reserve seat)
        TC->>H: Try (reserve room)
        TC->>R: Try (reserve car)
    end
    F-->>TC: Reserved (pending)
    H-->>TC: Reserved (pending)
    R-->>TC: Reserved (pending)

    TC->>TC: All reservations successful

    Note over TC,R: Confirm Phase
    par Confirm All
        TC->>F: Confirm
        TC->>H: Confirm
        TC->>R: Confirm
    end
    F-->>TC: Confirmed
    H-->>TC: Confirmed
    R-->>TC: Confirmed

    TC-->>C: Booking Confirmed
```

### TCC Failure Handling

```mermaid
sequenceDiagram
    participant C as Client
    participant TC as TCC Coordinator
    participant F as Flight Service
    participant H as Hotel Service
    participant R as Car Rental

    C->>TC: Book Travel Package

    Note over TC,R: Try Phase
    par Try All
        TC->>F: Try (reserve seat)
        TC->>H: Try (reserve room)
        TC->>R: Try (reserve car)
    end
    F-->>TC: Reserved
    H-->>TC: FAILED (no availability)
    R-->>TC: Reserved

    TC->>TC: Try failed for Hotel

    Note over TC,R: Cancel Phase
    par Cancel Successful Tries
        TC->>F: Cancel
        TC->>R: Cancel
    end
    F-->>TC: Cancelled
    R-->>TC: Cancelled

    TC-->>C: Booking Failed
```

### TCC Resource States

```
┌────────────────────────────────────────────────────────────────────┐
│ TCC RESOURCE STATE MACHINE                                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│              ┌─────────────┐                                       │
│              │  AVAILABLE  │                                       │
│              └──────┬──────┘                                       │
│                     │ Try()                                        │
│                     ↓                                              │
│              ┌─────────────┐                                       │
│         ┌────│   PENDING   │────┐                                  │
│         │    └─────────────┘    │                                  │
│         │                       │                                  │
│  Cancel() / Timeout       Confirm()                                │
│         │                       │                                  │
│         ↓                       ↓                                  │
│  ┌─────────────┐        ┌─────────────┐                           │
│  │  AVAILABLE  │        │  CONFIRMED  │                           │
│  └─────────────┘        └─────────────┘                           │
│                                                                     │
│  Key Properties:                                                    │
│  • PENDING resources are reserved but not committed                │
│  • PENDING has timeout (e.g., 15 minutes)                         │
│  • Timeout auto-triggers Cancel()                                  │
│  • Confirm/Cancel must be idempotent                              │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### Decision 1: Coordinator High Availability

```
┌────────────────────────────────────────────────────────────────────┐
│ COORDINATOR HA OPTIONS                                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Option A: Active-Passive with Shared Storage                       │
│ ┌────────────┐      ┌────────────────┐      ┌────────────┐        │
│ │  Active    │─────►│  Shared Log    │◄─────│  Standby   │        │
│ │ Coordinator│      │  (Replicated)  │      │ Coordinator│        │
│ └────────────┘      └────────────────┘      └────────────┘        │
│ Pros: Simple, consistent state                                     │
│ Cons: Failover delay, single writer                               │
│                                                                     │
│ Option B: Active-Active with Partitioning                          │
│ ┌────────────┐  ┌────────────┐  ┌────────────┐                    │
│ │ Coord 1    │  │ Coord 2    │  │ Coord 3    │                    │
│ │ (TX 0-99)  │  │ (TX 100-199)│ │ (TX 200-299)│                   │
│ └────────────┘  └────────────┘  └────────────┘                    │
│ Pros: Higher throughput, no single point of failure               │
│ Cons: More complex, partition rebalancing                         │
│                                                                     │
│ Decision: Active-Active with consistent hashing by TX ID          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Decision 2: State Persistence Strategy

| Option | Durability | Performance | Complexity |
|--------|------------|-------------|------------|
| **Synchronous Replication** | Highest | Lower | Medium |
| **Async with WAL** | High | Higher | Medium |
| **In-Memory with Checkpoints** | Medium | Highest | Low |

**Decision**: Synchronous replication for transaction log (durability critical), async for audit logs.

### Decision 3: Message Delivery Guarantee

```
┌────────────────────────────────────────────────────────────────────┐
│ MESSAGE DELIVERY OPTIONS                                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ At-Most-Once:                                                       │
│   Fire and forget, may lose messages                               │
│   NOT suitable for transactions                                    │
│                                                                     │
│ At-Least-Once:                                                      │
│   Retry until acknowledged                                         │
│   Requires idempotent consumers                                    │
│   ✓ Suitable with idempotency                                      │
│                                                                     │
│ Exactly-Once:                                                       │
│   Deduplication + at-least-once                                    │
│   Higher complexity and latency                                    │
│   ✓ Best for financial transactions                                │
│                                                                     │
│ Decision: At-least-once with idempotency (practical exactly-once) │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 2PC Data Flow

```mermaid
flowchart LR
    subgraph Phase1["Phase 1: Prepare"]
        C1[Client] --> TC1[Coordinator]
        TC1 --> P1A[Participant A]
        TC1 --> P1B[Participant B]
        P1A --> |VOTE| TC1
        P1B --> |VOTE| TC1
    end

    subgraph Decision["Decision Point"]
        TC1 --> LOG[(TX Log)]
        LOG --> |Durable| TC2[Coordinator]
    end

    subgraph Phase2["Phase 2: Commit"]
        TC2 --> P2A[Participant A]
        TC2 --> P2B[Participant B]
        P2A --> |ACK| TC2
        P2B --> |ACK| TC2
        TC2 --> C2[Client]
    end
```

### Saga Data Flow (Orchestration)

```mermaid
flowchart TB
    START([Start]) --> STEP1

    subgraph Forward["Forward Flow"]
        STEP1[Step 1: Reserve] --> CHECK1{Success?}
        CHECK1 --> |Yes| STEP2[Step 2: Pay]
        STEP2 --> CHECK2{Success?}
        CHECK2 --> |Yes| STEP3[Step 3: Ship]
        STEP3 --> CHECK3{Success?}
        CHECK3 --> |Yes| COMPLETE([Completed])
    end

    subgraph Backward["Compensation Flow"]
        CHECK1 --> |No| FAIL([Failed])
        CHECK2 --> |No| COMP1[Compensate 1]
        CHECK3 --> |No| COMP2[Compensate 2]
        COMP2 --> COMP1
        COMP1 --> COMPENSATED([Compensated])
    end
```

---

## Integration Points

### External System Integration

| System | Integration Method | Purpose |
|--------|-------------------|---------|
| **Database** | JDBC/XA Driver | 2PC participant |
| **Message Queue** | Native client | Command/event delivery |
| **Service Discovery** | DNS/API | Participant location |
| **Monitoring** | Metrics exporter | Observability |
| **Config Service** | Pull/push | Timeout/retry configs |

### API Contracts

```
┌────────────────────────────────────────────────────────────────────┐
│ PARTICIPANT SERVICE CONTRACT                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ For 2PC Participants:                                              │
│   POST /prepare                                                    │
│   POST /commit                                                     │
│   POST /rollback                                                   │
│   GET  /status/{txId}                                              │
│                                                                     │
│ For Saga Steps:                                                     │
│   POST /execute                                                    │
│   POST /compensate                                                 │
│   Headers: Idempotency-Key, Saga-ID, Step-ID                       │
│                                                                     │
│ For TCC Resources:                                                  │
│   POST /try                                                        │
│   POST /confirm                                                    │
│   POST /cancel                                                     │
│   Headers: Reservation-ID, Timeout                                 │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Pattern | Architecture Style | State Management | Best For |
|---------|-------------------|------------------|----------|
| **2PC** | Synchronous, coordinator-driven | Transaction log | Homogeneous DBs |
| **3PC** | Synchronous, non-blocking | Transaction log | Theoretical only |
| **Saga (Orch)** | Async, centralized | Saga state store | Complex workflows |
| **Saga (Chor)** | Event-driven, distributed | Outbox + events | Loosely coupled |
| **TCC** | Sync try, async confirm | Reservation store | Resource booking |
