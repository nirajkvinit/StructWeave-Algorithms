# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture Overview

The Event Sourcing System consists of four primary components: the Event Store (append-only log), Snapshot Store, Projection Engine, and Read Models. Commands are processed by application services that emit events, which are then consumed by projections to build queryable read models.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        CMD[Command API]
        QRY[Query API]
    end

    subgraph Application["Application Layer"]
        APP[Application Service]
        AGG[Aggregate Repository]
        SNAP_SVC[Snapshot Service]
    end

    subgraph EventStore["Event Store Cluster"]
        ES1[Event Store Node 1]
        ES2[Event Store Node 2]
        ES3[Event Store Node 3]
        LB_ES[Load Balancer]
    end

    subgraph Storage["Persistent Storage"]
        EVENTS[(Event Log)]
        SNAPSHOTS[(Snapshot Store)]
        METADATA[(Stream Metadata)]
    end

    subgraph Projections["Projection Layer"]
        SUB[Subscription Manager]
        PROJ1[Projection Worker 1]
        PROJ2[Projection Worker 2]
        PROJ3[Projection Worker 3]
        CHECKPOINT[(Checkpoint Store)]
    end

    subgraph ReadModels["Read Models"]
        RM1[(Order Summary)]
        RM2[(User Dashboard)]
        RM3[(Analytics)]
    end

    CMD --> APP
    APP --> AGG
    AGG --> LB_ES
    AGG --> SNAP_SVC
    SNAP_SVC --> SNAPSHOTS

    LB_ES --> ES1
    LB_ES --> ES2
    LB_ES --> ES3

    ES1 --> EVENTS
    ES2 --> EVENTS
    ES3 --> EVENTS
    ES1 --> METADATA

    EVENTS --> SUB
    SUB --> PROJ1
    SUB --> PROJ2
    SUB --> PROJ3

    PROJ1 --> CHECKPOINT
    PROJ1 --> RM1
    PROJ2 --> RM2
    PROJ3 --> RM3

    QRY --> RM1
    QRY --> RM2
    QRY --> RM3
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Application Service** | Handle commands, coordinate aggregate operations |
| **Aggregate Repository** | Load/save aggregates via events and snapshots |
| **Event Store** | Persist events, ensure ordering, provide subscriptions |
| **Snapshot Store** | Store periodic state snapshots for fast loading |
| **Subscription Manager** | Manage event subscriptions, distribute to projections |
| **Projection Workers** | Process events, update read models |
| **Checkpoint Store** | Track projection progress positions |
| **Read Models** | Query-optimized views for different use cases |

---

## Write Path Architecture

### Command Processing Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Command API
    participant SVC as Application Service
    participant REPO as Aggregate Repository
    participant ES as Event Store
    participant SNAP as Snapshot Store

    C->>API: Submit Command
    API->>SVC: Process Command

    Note over SVC,SNAP: Load Aggregate State
    SVC->>REPO: Load Aggregate
    REPO->>SNAP: Get Latest Snapshot
    SNAP-->>REPO: Snapshot (version N)
    REPO->>ES: Read Events (from N+1)
    ES-->>REPO: Events [N+1...M]
    REPO->>REPO: Replay Events on Snapshot
    REPO-->>SVC: Aggregate (version M)

    Note over SVC,ES: Execute Command
    SVC->>SVC: Validate Command
    SVC->>SVC: Execute Business Logic
    SVC->>SVC: Generate Events

    Note over SVC,ES: Persist Events
    SVC->>REPO: Save Aggregate
    REPO->>ES: Append Events (expected version M)

    alt Optimistic Concurrency Check
        ES-->>REPO: Success (version M+K)
    else Version Mismatch
        ES-->>REPO: Conflict Error
        REPO-->>SVC: Retry or Fail
    end

    REPO-->>SVC: Success
    SVC-->>API: Command Result
    API-->>C: Response
```

### Write Path Component Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│ WRITE PATH ARCHITECTURE                                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    APPLICATION SERVICE                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │   Command    │  │   Domain     │  │    Event     │      │   │
│  │  │   Handler    │→ │   Logic      │→ │   Emitter    │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   AGGREGATE REPOSITORY                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │   Snapshot   │  │   Event      │  │   Version    │      │   │
│  │  │   Loader     │  │   Replayer   │  │   Manager    │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      EVENT STORE                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │   Stream     │  │   Version    │  │   Global     │      │   │
│  │  │   Writer     │  │   Checker    │  │   Sequencer  │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Event Store Architecture

### Internal Structure

```mermaid
flowchart TB
    subgraph EventStoreNode["Event Store Node"]
        API[gRPC/HTTP API]
        WRITER[Stream Writer]
        READER[Stream Reader]
        INDEXER[Index Manager]
        CACHE[Event Cache]
    end

    subgraph Persistence["Storage Layer"]
        WAL[Write-Ahead Log]
        CHUNKS[(Chunk Files)]
        INDEX[(Stream Index)]
        GLOBAL[(Global Index)]
    end

    subgraph Replication["Replication"]
        LEADER[Leader]
        FOLLOWER1[Follower 1]
        FOLLOWER2[Follower 2]
    end

    API --> WRITER
    API --> READER
    WRITER --> WAL
    WAL --> CHUNKS
    WRITER --> INDEXER
    INDEXER --> INDEX
    INDEXER --> GLOBAL
    READER --> CACHE
    CACHE --> CHUNKS

    LEADER --> FOLLOWER1
    LEADER --> FOLLOWER2
```

### Event Storage Format

```
┌────────────────────────────────────────────────────────────────────┐
│ EVENT STORAGE STRUCTURE                                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Chunk File Structure:                                              │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Chunk Header                                                    │ │
│ │ ├── Chunk ID: uint64                                           │ │
│ │ ├── Start Position: uint64                                     │ │
│ │ ├── End Position: uint64                                       │ │
│ │ └── Checksum: uint32                                          │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ Event 1                                                        │ │
│ │ ├── Length: uint32                                            │ │
│ │ ├── Global Position: uint64                                   │ │
│ │ ├── Stream ID: string                                         │ │
│ │ ├── Stream Position: uint64                                   │ │
│ │ ├── Event Type: string                                        │ │
│ │ ├── Timestamp: uint64                                         │ │
│ │ ├── Metadata: bytes                                           │ │
│ │ ├── Data: bytes                                               │ │
│ │ └── CRC: uint32                                               │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ Event 2                                                        │ │
│ │ ...                                                            │ │
│ ├────────────────────────────────────────────────────────────────┤ │
│ │ Chunk Footer                                                   │ │
│ │ └── Total Events: uint32                                      │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Index Structure:                                                    │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Stream Index (per stream)                                      │ │
│ │ ├── Stream ID → [Position 0: Chunk:Offset, Position 1: ...]   │ │
│ │                                                                │ │
│ │ Global Index                                                   │ │
│ │ ├── Global Position → Chunk:Offset                            │ │
│ │                                                                │ │
│ │ Category Index                                                 │ │
│ │ ├── Category → [Stream IDs...]                                │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Snapshot Architecture

### Snapshot Strategy

```mermaid
flowchart TB
    subgraph SnapshotDecision["When to Snapshot"]
        CHECK{Events since<br/>last snapshot?}
        THRESHOLD{"> threshold?"}
        SNAPSHOT[Create Snapshot]
        SKIP[Skip]
    end

    subgraph SnapshotStorage["Snapshot Storage"]
        SNAP_STORE[(Snapshot Store)]
        SNAP_KEY[Key: stream_id + version]
    end

    subgraph Loading["Load with Snapshot"]
        LOAD_SNAP[Load Snapshot]
        LOAD_EVENTS[Load Events After]
        REPLAY[Replay on Snapshot]
        FINAL[Final State]
    end

    CHECK --> THRESHOLD
    THRESHOLD --> |Yes| SNAPSHOT
    THRESHOLD --> |No| SKIP
    SNAPSHOT --> SNAP_STORE
    SNAP_STORE --> SNAP_KEY

    LOAD_SNAP --> LOAD_EVENTS
    LOAD_EVENTS --> REPLAY
    REPLAY --> FINAL
```

### Snapshot Storage Options

| Storage | Pros | Cons | Use Case |
|---------|------|------|----------|
| **Same DB as events** | Transactional consistency | Storage growth | Small-medium systems |
| **Separate key-value store** | Fast reads, scalable | Extra infrastructure | Large systems |
| **Object storage** | Cost-effective, unlimited | Higher latency | Cold snapshots |
| **In-memory cache** | Fastest reads | Memory limits | Hot aggregates |

---

## Projection Architecture

### Projection Flow

```mermaid
sequenceDiagram
    participant ES as Event Store
    participant SUB as Subscription
    participant PROJ as Projection
    participant CP as Checkpoint
    participant RM as Read Model

    Note over ES,RM: Catch-up Phase
    PROJ->>CP: Get Last Checkpoint
    CP-->>PROJ: Position: 1000
    PROJ->>SUB: Subscribe from 1001
    SUB->>ES: Read Events (1001...)
    ES-->>SUB: Events [1001-1100]
    SUB-->>PROJ: Events batch

    loop Process Events
        PROJ->>PROJ: Apply Event to State
        PROJ->>RM: Update Read Model
        PROJ->>CP: Save Checkpoint
    end

    Note over ES,RM: Live Phase
    ES->>SUB: New Event (1101)
    SUB-->>PROJ: Event 1101
    PROJ->>PROJ: Apply Event
    PROJ->>RM: Update Read Model
    PROJ->>CP: Save Checkpoint (1101)
```

### Projection Engine Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│ PROJECTION ENGINE                                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   SUBSCRIPTION MANAGER                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │   $all       │  │   Stream     │  │   Category   │      │   │
│  │  │ Subscription │  │ Subscription │  │ Subscription │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   PROJECTION WORKERS                         │   │
│  │                                                              │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │ Worker 1: Order Projections                            │ │   │
│  │  │ ├── OrderSummaryProjection                            │ │   │
│  │  │ ├── OrderHistoryProjection                            │ │   │
│  │  │ └── Checkpoint: orders-checkpoint                      │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  │                                                              │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │ Worker 2: Analytics Projections                        │ │   │
│  │  │ ├── RevenueByDayProjection                            │ │   │
│  │  │ ├── ProductMetricsProjection                          │ │   │
│  │  │ └── Checkpoint: analytics-checkpoint                   │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     READ MODELS                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │  PostgreSQL  │  │   MongoDB    │  │ Elasticsearch │      │   │
│  │  │  (Orders)    │  │  (Documents) │  │   (Search)   │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Projection Types

| Type | Execution | Use Case | Consistency |
|------|-----------|----------|-------------|
| **Inline** | During write | Critical reads | Strong |
| **Async** | Background | Most read models | Eventual |
| **On-demand** | At query time | Rarely accessed | Real-time |
| **Catch-up** | Historical replay | Rebuilds | Batch |

---

## Subscription Architecture

### Subscription Types

```
┌────────────────────────────────────────────────────────────────────┐
│ SUBSCRIPTION TYPES                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 1. Volatile Subscription (Live Only)                               │
│    ┌─────────────────────────────────────────────────────────────┐ │
│    │ Client connects → Only receives NEW events                  │ │
│    │ No checkpointing, client manages position                   │ │
│    │ Use: Real-time notifications, live dashboards               │ │
│    └─────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ 2. Catch-up Subscription (Historical + Live)                       │
│    ┌─────────────────────────────────────────────────────────────┐ │
│    │ Client specifies start position                             │ │
│    │ Reads historical events, then switches to live              │ │
│    │ Client manages checkpoint                                   │ │
│    │ Use: Projection rebuilds, new consumers                     │ │
│    └─────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ 3. Persistent Subscription (Server-managed)                        │
│    ┌─────────────────────────────────────────────────────────────┐ │
│    │ Server tracks checkpoint                                    │ │
│    │ Supports consumer groups (competing consumers)              │ │
│    │ Acknowledgment required                                     │ │
│    │ Use: Durable event processing, distributed consumers        │ │
│    └─────────────────────────────────────────────────────────────┘ │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Subscription Delivery Guarantees

| Mode | Guarantee | Trade-off |
|------|-----------|-----------|
| **At-most-once** | No redelivery | May lose events |
| **At-least-once** | Retry until ack | Requires idempotent handlers |
| **Exactly-once** | Dedup + at-least-once | Higher complexity |

---

## Key Design Decisions

### Decision 1: Event Storage Format

```
┌────────────────────────────────────────────────────────────────────┐
│ EVENT FORMAT OPTIONS                                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Option A: JSON                                                      │
│   Pros: Human-readable, flexible schema, easy debugging            │
│   Cons: Larger size, slower parsing                                │
│   Example: {"orderId": "123", "amount": 99.99}                    │
│                                                                     │
│ Option B: Protocol Buffers                                         │
│   Pros: Compact, fast, schema evolution support                    │
│   Cons: Requires schema registry, less readable                    │
│   Example: Binary encoded                                          │
│                                                                     │
│ Option C: Avro                                                      │
│   Pros: Schema evolution, compact with schema                      │
│   Cons: Schema registry dependency                                 │
│   Example: Binary with schema fingerprint                          │
│                                                                     │
│ Decision: JSON for flexibility + optional Protobuf for hot paths   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Decision 2: Stream Organization

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **Per-aggregate** | One stream per aggregate instance | Most common, recommended |
| **Per-entity-type** | All entities of type in one stream | Small systems |
| **Category streams** | Virtual streams by event type | Cross-aggregate queries |
| **Partitioned** | Sharded by key | High-volume writes |

**Decision**: Per-aggregate with category projections for cross-aggregate queries.

### Decision 3: Projection Execution

```
┌────────────────────────────────────────────────────────────────────┐
│ PROJECTION EXECUTION OPTIONS                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Option A: Synchronous (In-process)                                 │
│   ┌──────────────────────────────────────────────────────────┐    │
│   │ Command → Events → Projection → Response                  │    │
│   │ Pros: Strong consistency, simple                         │    │
│   │ Cons: Slower writes, projection failure blocks writes    │    │
│   └──────────────────────────────────────────────────────────┘    │
│                                                                     │
│ Option B: Asynchronous (Background)                                │
│   ┌──────────────────────────────────────────────────────────┐    │
│   │ Command → Events → Response                              │    │
│   │                    ↓                                      │    │
│   │              Projection (async)                           │    │
│   │ Pros: Fast writes, decoupled                             │    │
│   │ Cons: Eventual consistency, projection lag               │    │
│   └──────────────────────────────────────────────────────────┘    │
│                                                                     │
│ Decision: Async by default, sync for critical consistency needs    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Decision 4: Snapshot Strategy

| Strategy | Trigger | Trade-off |
|----------|---------|-----------|
| **Event count** | Every N events | Predictable, may snapshot unnecessarily |
| **Time-based** | Every T minutes | Regular, may not align with usage |
| **Size-based** | When state > threshold | Adaptive, complex to implement |
| **On-demand** | Explicit command | Manual, may forget |

**Decision**: Event count (every 100 events) with time-based fallback (daily for active streams).

---

## Data Flow Diagrams

### Write Path Data Flow

```mermaid
flowchart LR
    subgraph Command["Command Processing"]
        CMD[Command] --> VAL[Validate]
        VAL --> EXEC[Execute]
        EXEC --> EVT[Generate Events]
    end

    subgraph Persistence["Event Persistence"]
        EVT --> APPEND[Append to Stream]
        APPEND --> WAL[Write-Ahead Log]
        WAL --> INDEX[Update Index]
        INDEX --> ACK[Acknowledge]
    end

    subgraph Async["Async Processing"]
        APPEND --> |async| NOTIFY[Notify Subscribers]
        NOTIFY --> PROJ[Projections]
    end
```

### Read Path Data Flow

```mermaid
flowchart LR
    subgraph Query["Query Processing"]
        QRY[Query] --> RM[Read Model]
        RM --> RESP[Response]
    end

    subgraph AggregateLoad["Aggregate Load"]
        LOAD[Load Aggregate] --> SNAP[Load Snapshot]
        SNAP --> EVENTS[Load Events]
        EVENTS --> REPLAY[Replay]
        REPLAY --> STATE[Current State]
    end
```

### Projection Rebuild Flow

```mermaid
flowchart TB
    subgraph Rebuild["Projection Rebuild"]
        START[Start Rebuild] --> RESET[Reset Checkpoint]
        RESET --> DROP[Drop Read Model]
        DROP --> SUBSCRIBE[Subscribe from 0]
    end

    subgraph Process["Event Processing"]
        SUBSCRIBE --> BATCH[Read Batch]
        BATCH --> APPLY[Apply Events]
        APPLY --> SAVE[Save to Read Model]
        SAVE --> CHECKPOINT[Update Checkpoint]
        CHECKPOINT --> |more events| BATCH
        CHECKPOINT --> |caught up| LIVE[Switch to Live]
    end
```

---

## Integration Points

### External System Integration

| System | Integration Method | Purpose |
|--------|-------------------|---------|
| **Message Queue** | Pub/sub | Distribute events to external systems |
| **Search Engine** | Projection | Build searchable indexes |
| **Analytics** | CDC/Export | Feed data warehouse |
| **Cache** | Projection | Maintain hot caches |
| **Monitoring** | Metrics export | Observability |

### API Contracts

```
┌────────────────────────────────────────────────────────────────────┐
│ EVENT STORE API                                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Write API:                                                          │
│   POST /streams/{streamId}/events                                  │
│   Headers: Expected-Version: {version}                             │
│   Body: [{ type, data, metadata }, ...]                           │
│                                                                     │
│ Read API:                                                           │
│   GET /streams/{streamId}?from={position}&count={count}           │
│   GET /streams/$all?from={globalPosition}&count={count}           │
│   GET /streams/{streamId}/metadata                                 │
│                                                                     │
│ Subscription API:                                                   │
│   WS /subscribe/streams/{streamId}?from={position}                │
│   WS /subscribe/$all?from={globalPosition}                        │
│   POST /subscriptions/{name}/ack/{eventId}                        │
│                                                                     │
│ Snapshot API:                                                       │
│   POST /snapshots/{streamId}                                       │
│   GET /snapshots/{streamId}/latest                                 │
│                                                                     │
│ Projection API:                                                     │
│   POST /projections                                                │
│   GET /projections/{name}/state                                   │
│   POST /projections/{name}/reset                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Summary

| Component | Architecture Style | Key Decisions |
|-----------|-------------------|---------------|
| **Event Store** | Append-only log, replicated | Per-aggregate streams, global ordering |
| **Snapshots** | Key-value store | Event count trigger, separate storage |
| **Projections** | Async background workers | Checkpoint-based, idempotent |
| **Subscriptions** | Push-based with catch-up | At-least-once delivery |
| **Read Models** | Purpose-built databases | Technology per use case |
