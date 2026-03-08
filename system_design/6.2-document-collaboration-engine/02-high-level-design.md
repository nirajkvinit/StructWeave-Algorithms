# High-Level Design

## 1. System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        direction LR
        Web["Web Editor<br/>(Browser)"]
        Desktop["Desktop App"]
        Mobile["Mobile App"]
        API["API Clients"]
    end

    subgraph Edge["Edge Layer"]
        CDN["CDN<br/>(Static Assets)"]
        LB["Global Load Balancer<br/>(L7, WebSocket-Aware)"]
    end

    subgraph Gateway["Gateway Layer"]
        GW["API Gateway<br/>(Auth, Rate Limit)"]
        WSGateway["WebSocket Gateway<br/>(Connection Mgmt,<br/>Session Routing)"]
    end

    subgraph Core["Core Services"]
        direction TB
        CollabSvc["Collaboration Service<br/>(OT/CRDT Engine,<br/>Operation Transform)"]
        DocSvc["Document Service<br/>(CRUD, Metadata,<br/>Snapshots)"]
        PresenceSvc["Presence Service<br/>(Cursors, Selections,<br/>Online Status)"]
        CommentSvc["Comment Service<br/>(Threads, Suggestions,<br/>Anchors)"]
        VersionSvc["Version History<br/>Service<br/>(Snapshots, Deltas)"]
        SearchSvc["Search Service<br/>(Full-text Index)"]
        PermSvc["Permission Service<br/>(RBAC, Sharing)"]
    end

    subgraph Async["Async Processing"]
        MQ["Message Queue"]
        Workers["Background Workers<br/>(Snapshot, Index,<br/>Export, Cleanup)"]
    end

    subgraph Data["Data Layer"]
        direction TB
        OpLog["Operation Log<br/>(Append-Only,<br/>Ordered Ops)"]
        DocStore["Document Store<br/>(Snapshots +<br/>Metadata)"]
        SessionStore["Session Store<br/>(In-Memory,<br/>Presence Data)"]
        SearchIdx["Search Index"]
        CacheLayer["Cache Layer<br/>(Doc Snapshots,<br/>Op Buffers)"]
    end

    Web & Desktop & Mobile & API --> CDN
    Web & Desktop & Mobile --> LB
    API --> LB
    LB --> GW & WSGateway
    GW --> DocSvc & CommentSvc & VersionSvc & SearchSvc & PermSvc
    WSGateway --> CollabSvc & PresenceSvc
    CollabSvc --> OpLog
    CollabSvc --> DocSvc
    CollabSvc --> PresenceSvc
    DocSvc --> DocStore
    DocSvc --> CacheLayer
    PresenceSvc --> SessionStore
    CommentSvc --> DocStore
    VersionSvc --> DocStore & OpLog
    SearchSvc --> SearchIdx
    PermSvc --> DocStore
    CollabSvc --> MQ
    MQ --> Workers
    Workers --> DocStore & SearchIdx

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef async fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class Web,Desktop,Mobile,API client
    class CDN,LB edge
    class GW,WSGateway gateway
    class CollabSvc,DocSvc,PresenceSvc,CommentSvc,VersionSvc,SearchSvc,PermSvc service
    class MQ,Workers async
    class OpLog,DocStore,SessionStore,SearchIdx data
    class CacheLayer cache
```

---

## 2. Data Flow

### 2.1 Real-Time Editing Flow (OT-Based, Google Docs Model)

```mermaid
sequenceDiagram
    participant A as Client A
    participant B as Client B
    participant WS as WebSocket Gateway
    participant Collab as Collaboration Service
    participant OL as Operation Log
    participant Cache as Doc Cache

    Note over A,B: Both clients connected, viewing document at version 5

    A->>A: 1. User types "Hello" at position 10
    A->>A: 2. Apply locally (optimistic) → instant rendering
    A->>A: 3. Buffer operation in outgoing queue

    A->>WS: 4. Send: {op: insert("Hello", 10), base_version: 5, client_id: A}
    WS->>Collab: 5. Route to collaboration service (document shard)

    par Server Processing
        Collab->>Collab: 6. Check: server version == base_version?
        Note over Collab: Server at v5, client at v5 → no transform needed
        Collab->>OL: 7. Append operation to log (v5 → v6)
        Collab->>Cache: 8. Update cached document state
    end

    Collab->>WS: 9. ACK to Client A: {ack: true, server_version: 6}
    WS->>A: 10. Client A receives ACK → flush outgoing buffer
    Collab->>WS: 11. Broadcast to Client B: {op: insert("Hello", 10), version: 6}
    WS->>B: 12. Client B receives operation

    B->>B: 13. Transform against any pending local ops
    B->>B: 14. Apply transformed operation → see "Hello"
    B->>B: 15. Update local version to 6

    Note over A,B: Concurrent Edit Scenario

    par Concurrent Edits
        A->>A: 16a. Insert "X" at position 0, base v6
        A->>WS: 17a. Send op to server
    and
        B->>B: 16b. Insert "Y" at position 0, base v6
        B->>WS: 17b. Send op to server
    end

    Collab->>Collab: 18. A's op arrives first → applied as v7
    Collab->>Collab: 19. B's op arrives second, base v6 but server at v7
    Collab->>Collab: 20. Transform B's op: insert("Y", 0) vs insert("X", 0)
    Collab->>Collab: 21. Transformed: insert("Y", 1) [shift right by 1]
    Collab->>OL: 22. Append transformed op as v8

    Collab->>WS: 23. Broadcast A's op (v7) to B
    Collab->>WS: 24. Broadcast transformed B's op (v8) to A
    WS->>B: 25. B transforms A's op against pending local op
    WS->>A: 26. A applies B's transformed op

    Note over A,B: Both see "XY..." → convergence achieved
```

### 2.2 Document Open Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant Perm as Permission Service
    participant Doc as Document Service
    participant Cache as Doc Cache
    participant Collab as Collaboration Service
    participant WS as WebSocket Gateway
    participant Presence as Presence Service

    C->>GW: 1. GET /docs/{doc_id}
    GW->>Perm: 2. Check access (user_id, doc_id)
    Perm-->>GW: 3. Permission: editor

    GW->>Doc: 4. Get document state
    Doc->>Cache: 5. Check snapshot cache
    alt Cache hit
        Cache-->>Doc: 6a. Return cached snapshot + version
    else Cache miss
        Doc->>Doc: 6b. Load latest snapshot from store
        Doc->>Doc: 6c. Replay operations since snapshot
        Doc->>Cache: 6d. Cache reconstructed state
    end
    Doc-->>GW: 7. Document state + version + metadata
    GW-->>C: 8. Response: {content, version: 42, collaborators}

    C->>WS: 9. Open WebSocket: /ws/docs/{doc_id}
    WS->>Collab: 10. Join document session
    Collab->>Collab: 11. Register client in session
    Collab->>Presence: 12. Add user to presence list

    Presence->>WS: 13. Broadcast to all: "User X joined"
    WS->>C: 14. Receive presence: {users: [{id, name, cursor, color}]}

    Note over C: Client now connected, can send/receive operations
```

### 2.3 Presence Update Flow

```mermaid
sequenceDiagram
    participant A as Client A
    participant WS as WebSocket Gateway
    participant Presence as Presence Service
    participant B as Client B
    participant C as Client C

    loop Every 50-100ms during active editing
        A->>A: Cursor moved to position 45, selection: [45, 52]
        A->>WS: {type: "presence", cursor: 45, selection: [45,52], user_id: A}
        WS->>Presence: Update A's presence state
        Presence->>Presence: Debounce + batch (16ms window)
        Presence->>WS: Broadcast batched presence updates
        WS->>B: {presenceUpdates: [{user: A, cursor: 45, selection: [45,52]}]}
        WS->>C: {presenceUpdates: [{user: A, cursor: 45, selection: [45,52]}]}
    end

    Note over A,C: Presence is ephemeral — not durably stored
    Note over A,C: Lost on disconnect, no retry needed
```

---

## 3. Key Architectural Decisions

### 3.1 OT vs CRDT

**Decision: OT for centralized real-time editing; CRDT for offline reconciliation**

This hybrid approach (used by Notion) leverages the strengths of each:

| Factor | OT (Real-Time Path) | CRDT (Offline Path) |
|--------|---------------------|---------------------|
| When used | Online, connected to server | Offline or disconnected editing |
| Authority | Central server orders operations | Each replica converges autonomously |
| Latency | <200ms with optimistic local apply | Merge on reconnect (seconds to minutes) |
| Memory | Low (no per-character metadata) | Higher (tombstones, metadata per character) |
| Convergence | Server-defined total order | Mathematical guarantees |

### 3.2 Monolith vs Microservices

**Decision: Microservices with a stateful Collaboration Service**

| Component | Scaling Rationale |
|-----------|-------------------|
| Collaboration Service | **Stateful** --- holds in-memory document sessions; scaled by document partitioning |
| Document Service | Stateless CRUD; scales horizontally |
| Presence Service | Ephemeral state in memory; scales per connection count |
| Permission Service | Stateless lookups; scales horizontally with caching |
| Search Service | Independent index sharding |

### 3.3 Communication Patterns

| Communication | Pattern | Reason |
|---------------|---------|--------|
| Client ↔ Collaboration Service | **WebSocket** (bidirectional) | Real-time operation streaming; low-overhead persistent connection |
| Client ↔ Document Service | **HTTP/REST** | Request-response for CRUD operations (open, list, delete) |
| Collaboration → Presence | **In-process or shared memory** | Ultra-low latency for cursor updates |
| Collaboration → Operation Log | **Synchronous append** | Operations must be durably stored before ACK |
| Collaboration → Snapshot Workers | **Asynchronous** (Message Queue) | Periodic snapshots are non-critical-path |
| Collaboration → Notification | **Asynchronous** | Comment mentions, share notifications |

### 3.4 Database Choices

| Data Type | Storage Choice | Justification |
|-----------|---------------|---------------|
| **Operation log** | Append-only log store (partitioned by doc_id) | High write throughput; sequential reads for replay; immutable |
| **Document snapshots** | Document store (e.g., MongoDB-style) | Flexible schema for rich document structures |
| **Document metadata** | Relational DB (SQL) | ACID for permissions, sharing, ownership |
| **Presence state** | In-memory store (Redis-like) | Ephemeral; TTL-based expiry; pub/sub for broadcast |
| **Comment threads** | Document store or SQL | Threaded comments with anchoring metadata |
| **Search index** | Inverted index | Full-text search across document content |
| **Session state** | In-memory (per-service instance) | Document collaboration state is per-session |

### 3.5 Operation Log Design

The operation log is the **source of truth** for document state:

```
┌─────────────────────────────────────────────────────────┐
│ Operation Log (per document, append-only)                │
├─────────────────────────────────────────────────────────┤
│ Seq │ Version │ User │ Operation           │ Timestamp  │
│   1 │      1  │ Alice│ insert("H", 0)      │ T1         │
│   2 │      2  │ Alice│ insert("e", 1)      │ T2         │
│   3 │      3  │ Bob  │ insert("X", 0)      │ T3         │
│   4 │      4  │ Alice│ insert("l", 2)      │ T4         │
│   5 │      5  │ Bob  │ delete(1)           │ T5         │
│   …  │      …  │  …   │  …                  │  …         │
│ 100 │    100  │      │ [SNAPSHOT MARKER]   │ T100       │
│ 101 │    101  │ Carol│ format(bold, 5, 10) │ T101       │
│ …   │     …   │  …   │  …                  │  …         │
└─────────────────────────────────────────────────────────┘

Document state = Snapshot(v100) + replay(ops 101..latest)
```

### 3.6 Snapshot Strategy

| Strategy | Pros | Cons | Use Case |
|----------|------|------|----------|
| **Every N operations** (e.g., 100) | Bounded replay cost; predictable | May snapshot in middle of logical edit | Default strategy |
| **Time-based** (every 5 min) | Regular cadence; simple | May be too frequent or too rare | Supplement to operation-based |
| **On session close** | Captures natural edit boundaries | No snapshot if session is long-lived | Additional trigger |
| **On demand** (named version) | User-controlled save points | Sparse; can't rely on for recovery | User-facing "version history" |

**Hybrid approach**: Snapshot every 100 operations OR every 5 minutes (whichever comes first), plus on-demand named versions.

---

## 4. Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---------|----------|---------------|
| Sync vs Async | **Sync** for operations (must ACK); **Async** for snapshots, indexing | Operations need durability guarantee before ACK |
| Event-driven vs Request-response | **Event-driven** for operation propagation | Every edit is an event broadcast to all participants |
| Push vs Pull | **Push** via WebSocket for real-time; **Pull** for document open | Push eliminates polling latency |
| Stateless vs Stateful | **Stateful** collaboration service; stateless everything else | Document session state must be in memory for sub-ms transforms |
| Read/Write optimization | **Write-optimized** operation log; **read-optimized** snapshots | Log handles write burst; snapshots serve document loads |
| Real-time vs Batch | **Real-time** for editing; **batch** for snapshots, indexing, cleanup | Editing is inherently real-time |
| Edge vs Origin | **Origin** for all editing operations | Central server required for OT ordering |

---

## 5. Component Responsibilities

| Component | Responsibilities |
|-----------|-----------------|
| **WebSocket Gateway** | Manages persistent connections; routes operations to correct collaboration service instance; handles connection lifecycle (connect, disconnect, reconnect) |
| **Collaboration Service** | Core OT/CRDT engine; transforms operations, maintains in-memory document state, appends to operation log, broadcasts transformed operations |
| **Document Service** | CRUD for documents and metadata; loads snapshots; manages document lifecycle (create, archive, delete) |
| **Presence Service** | Tracks connected users per document; broadcasts cursor/selection positions; manages join/leave events; assigns user colors |
| **Comment Service** | Manages threaded comments and suggestions; anchors comments to text ranges; handles suggest/accept/reject workflow |
| **Version History Service** | Creates and retrieves snapshots; computes diffs between versions; supports named versions and restore |
| **Permission Service** | RBAC for document access; manages share links; enforces real-time permission changes |
| **Search Service** | Indexes document content for full-text search; updates index asynchronously on document changes |
| **Background Workers** | Periodic snapshot creation; search index updates; operation log compaction; export generation |
