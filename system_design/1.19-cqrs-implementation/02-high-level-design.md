# High-Level Design

## Overview

This document presents the high-level architecture for a CQRS implementation, including data flow diagrams, component interactions, and key architectural decisions.

---

## System Architecture

### Complete Architecture Diagram

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WEB[Web Application]
        MOBILE[Mobile App]
        API_EXT[External APIs]
    end

    subgraph Gateway["API Gateway Layer"]
        GW[API Gateway]
        AUTH[Auth Service]
    end

    subgraph CommandSide["Command Side"]
        CMD_API[Command API]
        CMD_VALID[Command Validator]
        CMD_HANDLER[Command Handlers]
        DOMAIN[Domain Model]
        WRITE_DB[(Write Database)]
        OUTBOX[(Outbox Table)]
        IDEMP[(Idempotency Store)]
    end

    subgraph EventBus["Event Distribution"]
        RELAY[Outbox Relay]
        BROKER[Message Broker]
        DLQ[Dead Letter Queue]
    end

    subgraph QuerySide["Query Side"]
        QUERY_API[Query API]
        CACHE[Query Cache]
        READ_DB1[(Read Model:<br/>List View)]
        READ_DB2[(Read Model:<br/>Detail View)]
        READ_DB3[(Read Model:<br/>Search Index)]
    end

    subgraph Projections["Projection Layer"]
        PROJ_MGR[Projection Manager]
        PROJ_1[List Projection]
        PROJ_2[Detail Projection]
        PROJ_3[Search Projection]
        CHECKPOINT[(Checkpoint Store)]
    end

    WEB --> GW
    MOBILE --> GW
    API_EXT --> GW
    GW --> AUTH
    AUTH --> CMD_API
    AUTH --> QUERY_API

    CMD_API --> CMD_VALID
    CMD_VALID --> CMD_HANDLER
    CMD_HANDLER --> IDEMP
    CMD_HANDLER --> DOMAIN
    DOMAIN --> WRITE_DB
    DOMAIN --> OUTBOX

    OUTBOX --> RELAY
    RELAY --> BROKER
    BROKER --> DLQ

    BROKER --> PROJ_MGR
    PROJ_MGR --> PROJ_1
    PROJ_MGR --> PROJ_2
    PROJ_MGR --> PROJ_3
    PROJ_MGR --> CHECKPOINT

    PROJ_1 --> READ_DB1
    PROJ_2 --> READ_DB2
    PROJ_3 --> READ_DB3

    QUERY_API --> CACHE
    CACHE --> READ_DB1
    CACHE --> READ_DB2
    CACHE --> READ_DB3
```

---

## Component Overview

### Command Side Components

| Component | Responsibility | Technology Options |
|-----------|---------------|-------------------|
| Command API | HTTP endpoints for commands | REST, gRPC |
| Command Validator | Input validation, authorization | Application code |
| Command Handler | Business logic orchestration | Domain services |
| Domain Model | Business rules, invariants | DDD aggregates |
| Write Database | Persistent state storage | PostgreSQL, MySQL |
| Outbox Table | Event staging for reliable delivery | Same DB as write |
| Idempotency Store | Track processed commands | Redis, DB table |

### Query Side Components

| Component | Responsibility | Technology Options |
|-----------|---------------|-------------------|
| Query API | HTTP endpoints for queries | REST, GraphQL |
| Query Cache | Reduce read model load | Redis, Memcached |
| Read Model (List) | Paginated list queries | PostgreSQL, MongoDB |
| Read Model (Detail) | Single entity queries | PostgreSQL, DynamoDB |
| Read Model (Search) | Full-text search | Elasticsearch, Algolia |

### Projection Components

| Component | Responsibility | Technology Options |
|-----------|---------------|-------------------|
| Outbox Relay | Poll outbox, publish to broker | Debezium, custom |
| Message Broker | Event distribution | Kafka, RabbitMQ |
| Projection Manager | Coordinate projection workers | Custom orchestrator |
| Projections | Transform events to read models | Event handlers |
| Checkpoint Store | Track processing position | Redis, DB table |
| Dead Letter Queue | Failed event storage | Broker feature |

---

## Data Flow Diagrams

### Command (Write) Path

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant CMD as Command API
    participant H as Command Handler
    participant D as Domain
    participant WDB as Write DB
    participant OUT as Outbox

    C->>GW: POST /commands/create-order
    GW->>CMD: Forward (authenticated)
    CMD->>CMD: Validate command structure
    CMD->>H: CreateOrderCommand

    H->>H: Check idempotency key
    alt Duplicate command
        H-->>CMD: Return cached result
    else New command
        H->>D: Load aggregate
        D->>WDB: Read current state
        WDB-->>D: State + version
        D->>D: Apply business rules
        D->>D: Generate events

        Note over D,OUT: Single transaction
        D->>WDB: Save state (with version check)
        D->>OUT: Insert events to outbox
        D->>H: Store idempotency key

        H-->>CMD: Command accepted
    end
    CMD-->>GW: 202 Accepted
    GW-->>C: {commandId, status: "accepted"}
```

### Event Synchronization Path

```mermaid
sequenceDiagram
    participant OUT as Outbox Table
    participant RELAY as Outbox Relay
    participant BROKER as Message Broker
    participant PM as Projection Manager
    participant PROJ as Projection
    participant RDB as Read Database
    participant CKP as Checkpoint Store

    loop Every 100ms
        RELAY->>OUT: Poll unpublished events
        OUT-->>RELAY: Events batch
        RELAY->>BROKER: Publish events
        BROKER-->>RELAY: Ack
        RELAY->>OUT: Mark as published
    end

    BROKER->>PM: Deliver events
    PM->>PROJ: Route to projection

    loop For each event
        PROJ->>PROJ: Transform event
        PROJ->>RDB: Update read model
        RDB-->>PROJ: Success
        PROJ->>CKP: Update checkpoint
    end

    PM-->>BROKER: Ack batch
```

### Query (Read) Path

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant Q as Query API
    participant CACHE as Cache
    participant RDB as Read Database

    C->>GW: GET /orders?status=pending
    GW->>Q: Forward (authenticated)

    Q->>CACHE: Check cache
    alt Cache hit
        CACHE-->>Q: Cached result
    else Cache miss
        Q->>RDB: Query read model
        RDB-->>Q: Results
        Q->>CACHE: Store in cache
    end

    Q->>Q: Add freshness metadata
    Q-->>GW: {data, lastUpdated, version}
    GW-->>C: Response
```

---

## Key Architectural Decisions

### Decision 1: Synchronization Mechanism

```
┌────────────────────────────────────────────────────────────────────┐
│ SYNC MECHANISM OPTIONS                                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Option A: Outbox Pattern                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Write DB + Outbox Table → Relay → Message Broker            │   │
│  │                                                              │   │
│  │ Pros:                                                        │   │
│  │ • Atomicity with write (same transaction)                   │   │
│  │ • No dual-write problem                                     │   │
│  │ • Works with any database                                   │   │
│  │                                                              │   │
│  │ Cons:                                                        │   │
│  │ • Polling overhead                                          │   │
│  │ • Additional table management                               │   │
│  │ • Relay component to maintain                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Option B: Change Data Capture (CDC)                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Write DB → CDC Connector → Message Broker                   │   │
│  │                                                              │   │
│  │ Pros:                                                        │   │
│  │ • No application changes                                    │   │
│  │ • Captures all changes automatically                        │   │
│  │ • Lower latency (log-based)                                 │   │
│  │                                                              │   │
│  │ Cons:                                                        │   │
│  │ • DB-specific (need connector)                              │   │
│  │ • Schema changes more complex                               │   │
│  │ • Less control over event format                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Option C: Domain Events (Direct Publish)                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Write DB + Broker (dual write)                              │   │
│  │                                                              │   │
│  │ Pros:                                                        │   │
│  │ • Simplest implementation                                   │   │
│  │ • Low latency                                               │   │
│  │                                                              │   │
│  │ Cons:                                                        │   │
│  │ • Dual-write consistency issues                             │   │
│  │ • Message loss possible                                     │   │
│  │ • NOT RECOMMENDED for production                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  RECOMMENDATION: Outbox Pattern for most cases                     │
│                  CDC when capturing existing DB changes            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Decision 2: Read Model Stores

```mermaid
flowchart LR
    subgraph Events["Domain Events"]
        E[Event Stream]
    end

    subgraph Projections["Projection Types"]
        P1[List Projection]
        P2[Detail Projection]
        P3[Search Projection]
        P4[Analytics Projection]
    end

    subgraph Stores["Specialized Stores"]
        S1[(Relational DB<br/>PostgreSQL)]
        S2[(Document Store<br/>MongoDB)]
        S3[(Search Engine<br/>Elasticsearch)]
        S4[(OLAP<br/>ClickHouse)]
    end

    E --> P1
    E --> P2
    E --> P3
    E --> P4

    P1 --> S1
    P2 --> S2
    P3 --> S3
    P4 --> S4
```

| Read Model | Best Store Type | Use Case |
|------------|-----------------|----------|
| List views with filtering | Relational (PostgreSQL) | Paginated tables with sorting |
| Nested/hierarchical data | Document (MongoDB) | Order with embedded items |
| Full-text search | Search engine (Elasticsearch) | Product search, logs |
| Time-series analytics | OLAP (ClickHouse) | Dashboards, reports |
| High-speed key-value | Cache (Redis) | Session data, counters |

### Decision 3: Consistency Strategy

```
┌────────────────────────────────────────────────────────────────────┐
│ CONSISTENCY STRATEGIES                                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Strategy 1: Full Async (Eventual Consistency)                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Command → Ack → (async) → Projection → Read Model           │   │
│  │                                                              │   │
│  │ • Highest throughput                                        │   │
│  │ • Unbounded staleness possible                              │   │
│  │ • Best for: Analytics, dashboards, non-critical reads       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Strategy 2: Read-Your-Writes (Version Token)                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Command → Ack(version) → Query(minVersion) → Wait/Return    │   │
│  │                                                              │   │
│  │ • User sees their own writes                                │   │
│  │ • Others may see stale data                                 │   │
│  │ • Best for: User-facing UIs after mutation                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Strategy 3: Sync Projection (Strong Consistency)                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Command → DB + Projection (same transaction) → Ack          │   │
│  │                                                              │   │
│  │ • No staleness                                              │   │
│  │ • Lower throughput                                          │   │
│  │ • Best for: Critical financial data                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Strategy 4: Hybrid (Per-Projection)                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Critical projections: Sync                                  │   │
│  │ Others: Async with bounded lag                              │   │
│  │                                                              │   │
│  │ • Balance of consistency and performance                    │   │
│  │ • More complex to implement                                 │   │
│  │ • Best for: Mixed requirements                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Decision 4: Event Schema

```
┌────────────────────────────────────────────────────────────────────┐
│ EVENT ENVELOPE STRUCTURE                                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  {                                                                  │
│    // Metadata (for routing and processing)                        │
│    "eventId": "uuid-v4",                                           │
│    "eventType": "OrderCreated",                                    │
│    "aggregateType": "Order",                                       │
│    "aggregateId": "order-123",                                     │
│    "version": 1,                                                   │
│    "timestamp": "2025-01-15T10:30:00Z",                           │
│    "correlationId": "request-abc",                                 │
│    "causationId": "command-xyz",                                   │
│                                                                     │
│    // Schema versioning                                            │
│    "schemaVersion": "1.0",                                         │
│                                                                     │
│    // Business data                                                │
│    "data": {                                                       │
│      "customerId": "cust-456",                                     │
│      "items": [...],                                               │
│      "totalAmount": 99.99                                          │
│    }                                                                │
│  }                                                                  │
│                                                                     │
│  Key Design Choices:                                                │
│  • Include all data needed for projection (no lookups)             │
│  • Schema version for forward compatibility                        │
│  • Correlation ID for distributed tracing                          │
│  • Causation ID for event lineage                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

### Single-Region Deployment

```mermaid
flowchart TB
    subgraph AZ1["Availability Zone 1"]
        LB1[Load Balancer]
        CMD1[Command API]
        Q1[Query API]
        PROJ1[Projections]
    end

    subgraph AZ2["Availability Zone 2"]
        LB2[Load Balancer]
        CMD2[Command API]
        Q2[Query API]
        PROJ2[Projections]
    end

    subgraph DataLayer["Data Layer (Multi-AZ)"]
        WDB_P[(Write DB<br/>Primary)]
        WDB_R[(Write DB<br/>Replica)]
        RDB[(Read DB<br/>Cluster)]
        BROKER_C[Message Broker<br/>Cluster]
    end

    LB1 --> CMD1
    LB1 --> Q1
    LB2 --> CMD2
    LB2 --> Q2

    CMD1 --> WDB_P
    CMD2 --> WDB_P
    WDB_P --> WDB_R

    PROJ1 --> BROKER_C
    PROJ2 --> BROKER_C
    PROJ1 --> RDB
    PROJ2 --> RDB

    Q1 --> RDB
    Q2 --> RDB
```

### Multi-Region Deployment

```mermaid
flowchart TB
    subgraph US["US Region (Primary)"]
        US_CMD[Command API]
        US_Q[Query API]
        US_WDB[(Write DB)]
        US_RDB[(Read DB)]
        US_PROJ[Projections]
    end

    subgraph EU["EU Region (Read Replica)"]
        EU_CMD[Command API<br/>Proxy]
        EU_Q[Query API]
        EU_RDB[(Read DB<br/>Replica)]
        EU_PROJ[Projections]
    end

    subgraph ASIA["Asia Region (Read Replica)"]
        ASIA_CMD[Command API<br/>Proxy]
        ASIA_Q[Query API]
        ASIA_RDB[(Read DB<br/>Replica)]
        ASIA_PROJ[Projections]
    end

    EU_CMD -->|Forward| US_CMD
    ASIA_CMD -->|Forward| US_CMD

    US_CMD --> US_WDB
    US_WDB -->|CDC/Replication| EU_PROJ
    US_WDB -->|CDC/Replication| ASIA_PROJ

    EU_PROJ --> EU_RDB
    ASIA_PROJ --> ASIA_RDB

    US_PROJ --> US_RDB
```

---

## API Design Overview

### Command API

```
┌────────────────────────────────────────────────────────────────────┐
│ COMMAND API PATTERNS                                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Pattern 1: REST-style Commands                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ POST /orders                        (CreateOrder)           │   │
│  │ POST /orders/{id}/cancel            (CancelOrder)           │   │
│  │ POST /orders/{id}/items             (AddItem)               │   │
│  │ DELETE /orders/{id}/items/{itemId}  (RemoveItem)            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Pattern 2: Task-Based Commands                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ POST /commands/create-order                                 │   │
│  │ POST /commands/cancel-order                                 │   │
│  │ POST /commands/add-item-to-order                            │   │
│  │ POST /commands/remove-item-from-order                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Response Pattern:                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ {                                                           │   │
│  │   "commandId": "cmd-123",                                   │   │
│  │   "status": "accepted",                                     │   │
│  │   "aggregateId": "order-456",                               │   │
│  │   "version": 3,                 // For read-your-writes    │   │
│  │   "timestamp": "2025-01-15T10:30:00Z"                       │   │
│  │ }                                                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Query API

```
┌────────────────────────────────────────────────────────────────────┐
│ QUERY API PATTERNS                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  List Queries:                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ GET /orders?status=pending&page=1&limit=20                  │   │
│  │ GET /orders?customerId=123&sort=createdAt:desc              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Detail Queries:                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ GET /orders/{id}                                            │   │
│  │ GET /orders/{id}/items                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Search Queries:                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ GET /orders/search?q=laptop&filters=status:pending          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Response Pattern (with freshness):                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ {                                                           │   │
│  │   "data": [...],                                            │   │
│  │   "pagination": { "page": 1, "limit": 20, "total": 150 },  │   │
│  │   "meta": {                                                 │   │
│  │     "lastUpdated": "2025-01-15T10:30:00Z",                 │   │
│  │     "version": 1234,            // For consistency check   │   │
│  │     "cached": false                                         │   │
│  │   }                                                         │   │
│  │ }                                                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Read-Your-Writes Pattern:                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ GET /orders/{id}?minVersion=3                               │   │
│  │                                                              │   │
│  │ • If version >= 3: Return immediately                       │   │
│  │ • If version < 3: Wait (with timeout) or return stale      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### External System Integration

```mermaid
flowchart LR
    subgraph CQRS["CQRS System"]
        CMD[Command Side]
        QUERY[Query Side]
        EVENTS[Event Stream]
    end

    subgraph External["External Systems"]
        ERP[ERP System]
        NOTIF[Notification Service]
        ANALYTICS[Analytics Platform]
        SEARCH[Search Service]
    end

    ERP -->|Commands| CMD
    CMD -->|Webhooks| ERP

    EVENTS -->|Subscribe| NOTIF
    EVENTS -->|Subscribe| ANALYTICS
    EVENTS -->|Subscribe| SEARCH

    ANALYTICS -->|Queries| QUERY
```

### Integration Patterns

| Integration | Pattern | Description |
|-------------|---------|-------------|
| Incoming commands | REST API, gRPC | External systems send commands |
| Event consumption | Message subscription | External systems react to events |
| Outbound webhooks | Event-driven | Notify external systems of changes |
| Query federation | API composition | Combine data from multiple read models |
| Batch import | Command batching | Bulk data import via commands |
