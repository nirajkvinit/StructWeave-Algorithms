# High-Level Design

## System Architecture

The platform is split into two distinct planes: the **Builder Plane** (used by developers to create and edit apps) and the **Runtime Plane** (used by end-users interacting with deployed apps). Both planes share the Data Plane for metadata and credentials, but have separate scaling and availability requirements.

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TB
    subgraph ClientLayer["Client Layer"]
        BA[Builder App<br/>Visual Editor]
        RA[Runtime App<br/>Deployed App Shell]
    end

    subgraph BuilderPlane["Builder Plane"]
        ADS[App Definition<br/>Service]
        CR[Component<br/>Registry]
        VCS[Version Control<br/>Service]
        COLLAB[Collaboration<br/>Service]
    end

    subgraph RuntimePlane["Runtime Plane"]
        AG[API Gateway]
        ART[App Runtime<br/>Service]
        QEE[Query Execution<br/>Engine]
        PE[Permission<br/>Engine]
    end

    subgraph SandboxLayer["Sandbox Layer"]
        V8S[V8 Isolate<br/>Pool]
        SQLProxy[SQL Parameterizer<br/>& Validator]
    end

    subgraph ConnectorLayer["Connector Proxy Layer"]
        DCS[Data Connector<br/>Service]
        CP[Connection Pool<br/>Manager]
        CB[Circuit Breaker<br/>Registry]
    end

    subgraph DataPlane["Data Plane"]
        MDS[(Metadata Store<br/>App Definitions)]
        CCS[(Credential Store<br/>Encrypted Configs)]
        ALS[(Audit Log<br/>Store)]
        CACHE[(App Definition<br/>Cache)]
    end

    subgraph ExternalSources["Customer Data Sources"]
        PG[(PostgreSQL)]
        MY[(MySQL)]
        REST[REST APIs]
        GQL[GraphQL APIs]
        MONGO[(MongoDB)]
    end

    subgraph EventBus["Event Bus"]
        MQ[Message Queue]
    end

    BA --> ADS
    BA --> CR
    BA --> COLLAB
    ADS --> MDS
    ADS --> VCS
    VCS --> MDS

    RA --> AG
    AG --> ART
    AG --> PE
    ART --> CACHE
    ART --> QEE
    QEE --> V8S
    QEE --> SQLProxy
    QEE --> PE
    SQLProxy --> DCS
    V8S --> DCS
    DCS --> CP
    CP --> CB
    CB --> PG
    CB --> MY
    CB --> REST
    CB --> GQL
    CB --> MONGO
    DCS --> CCS

    ART --> MQ
    QEE --> MQ
    MQ --> ALS

    PE --> CACHE
    PE --> MDS
    ART --> MDS

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef sandbox fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef external fill:#efebe9,stroke:#4e342e,stroke-width:2px

    class BA,RA client
    class ADS,CR,VCS,COLLAB,ART,QEE,PE,DCS,CP,CB service
    class MDS,CCS,ALS data
    class CACHE cache
    class MQ queue
    class AG gateway
    class V8S,SQLProxy sandbox
    class PG,MY,REST,GQL,MONGO external
```

---

## Data Flow: Building and Deploying an App

### Flow 1: Builder Creates an App

```mermaid
%%{init: {'theme': 'neutral'}}%%
sequenceDiagram
    participant B as Builder (Browser)
    participant ADS as App Definition Service
    participant MDS as Metadata Store
    participant VCS as Version Control

    B->>ADS: POST /apps (create new app)
    ADS->>MDS: Insert app record + initial empty definition
    MDS-->>ADS: app_id
    ADS-->>B: app_id + editor URL

    B->>ADS: PUT /apps/{id}/definition (drag-drop component)
    Note over B,ADS: Debounced auto-save every 2s
    ADS->>MDS: Upsert app definition (development version)
    ADS->>VCS: Create auto-save checkpoint
    MDS-->>ADS: OK
    ADS-->>B: saved_at timestamp

    B->>ADS: POST /apps/{id}/publish
    ADS->>VCS: Create named release (v1.0)
    ADS->>MDS: Copy definition to published slot
    VCS-->>ADS: release_id
    ADS-->>B: Published (release_id, URL)
```

### Flow 2: End-User Loads a Deployed App

```mermaid
%%{init: {'theme': 'neutral'}}%%
sequenceDiagram
    participant U as End-User (Browser)
    participant AG as API Gateway
    participant PE as Permission Engine
    participant ART as App Runtime
    participant CACHE as App Definition Cache
    participant QEE as Query Execution Engine
    participant DCS as Data Connector Service
    participant DB as Customer Database

    U->>AG: GET /apps/{id}/runtime
    AG->>PE: Check user access to app
    PE-->>AG: ALLOWED (role: user)

    AG->>ART: Load app definition
    ART->>CACHE: Get published definition
    CACHE-->>ART: App definition JSON (cache hit)
    ART-->>AG: App definition + user context
    AG-->>U: App shell + definition JSON

    Note over U: Client renders UI from JSON metadata

    U->>AG: POST /apps/{id}/queries/{query_id}/run
    AG->>PE: Check query permissions (user, app, query)
    PE-->>AG: ALLOWED

    AG->>QEE: Execute query
    QEE->>QEE: Substitute bindings ({{state.userId}} → "user-123")
    QEE->>QEE: Parameterize SQL (prevent injection)
    QEE->>DCS: Execute parameterized query via connector
    DCS->>DB: SELECT * FROM orders WHERE user_id = $1 [$1="user-123"]
    DB-->>DCS: Result rows
    DCS-->>QEE: Raw result
    QEE->>QEE: Run JavaScript transform in V8 Isolate (if configured)
    QEE-->>AG: Transformed result
    AG-->>U: Query response data

    Note over U: Client re-renders bound components with new data
```

### Flow 3: Query Execution with Row-Level Security

```mermaid
%%{init: {'theme': 'neutral'}}%%
sequenceDiagram
    participant U as End-User
    participant QEE as Query Execution Engine
    participant PE as Permission Engine
    participant DCS as Data Connector Service
    participant DB as Database

    U->>QEE: Run query (SELECT * FROM tickets)
    QEE->>PE: Get row-level filter for user
    PE-->>QEE: Filter: "org_id = 'org-456'"

    QEE->>QEE: Inject WHERE clause
    Note over QEE: SELECT * FROM tickets<br/>WHERE org_id = $1<br/>(original query wrapped as subquery)

    QEE->>DCS: Execute with injected filter
    DCS->>DB: Parameterized query
    DB-->>DCS: Filtered rows only
    DCS-->>QEE: Result
    QEE-->>U: Data (only rows user is authorized to see)
```

---

## Key Architectural Decisions

### Decision 1: Metadata-Driven Runtime vs. Code Generation

| Aspect | Metadata-Driven (Chosen) | Code Generation |
|--------|-------------------------|-----------------|
| **How it works** | Client renders from JSON definition at runtime | Platform emits JavaScript/HTML; user deploys generated code |
| **Publish speed** | Instant (toggle flag) | Minutes (build + deploy) |
| **Debugging** | Inspect JSON definition directly | Inspect generated code (often unreadable) |
| **Security** | Platform controls execution; no arbitrary code in production | Generated code runs anywhere; harder to audit |
| **Portability** | Locked to platform runtime | Potentially portable (but practically not) |
| **Flexibility** | Limited to component library + custom components | Theoretically unlimited |
| **Performance** | JSON parsing + rendering overhead | Compiled, potentially faster |
| **Version rollback** | Swap JSON document pointer | Redeploy previous build |

**Decision**: Metadata-driven runtime. The instant publish, built-in security boundary, and simpler debugging model outweigh the flexibility of code generation. Retool, Appsmith, and ToolJet all use this approach.

### Decision 2: Sandboxed Execution Model

| Approach | Isolation | Latency | Security | Cost |
|----------|-----------|---------|----------|------|
| **V8 Isolates (Chosen for JS)** | Memory-isolated, shared process | <5ms warm start | High (no FS/network) | Low (shared process) |
| **Container per query** | OS-level | 100-500ms cold start | Very high | High (per-container) |
| **In-process eval** | None | <1ms | Very low (dangerous) | Very low |

**Decision**: V8 Isolates for JavaScript transformations. SQL queries are never "executed in a sandbox"---they are parameterized by the platform and proxied to the customer's database. The sandbox is only for user-written JavaScript transformation code.

### Decision 3: Connector Proxy Architecture

All data connector calls are proxied through the platform's server-side Data Connector Service. The client (browser) never connects directly to customer databases or APIs.

**Why server-side proxy is non-negotiable**:
- **Credential security**: Database passwords and API keys are stored encrypted server-side; never sent to the browser
- **SSRF prevention**: All outbound network calls originate from the proxy with allowlisted destinations
- **Connection pooling**: Managed server-side to avoid overwhelming customer databases
- **Audit logging**: Every query is logged with user context before it reaches the database
- **Network access**: Customer databases are often in private networks; the platform's agent/proxy connects from a known IP range

### Decision 4: App Definition Storage

| Option | Pros | Cons |
|--------|------|------|
| **Document store (MongoDB)** | Natural fit for JSON documents | Weaker transactions, harder joins for cross-app queries |
| **Relational DB with JSONB (Chosen)** | ACID transactions, rich querying, JSONB indexing | Slightly more complex schema |
| **Git-backed storage** | Built-in versioning, branching, merging | Complex for non-git operations; slow for frequent saves |

**Decision**: Relational database with JSONB column for the app definition. The app metadata (id, org, owner, status, timestamps) is stored in relational columns; the full component tree + queries + bindings is a JSONB document. This gives us ACID transactions for publishes, relational queries for admin operations, and schema flexibility for the definition itself.

### Decision 5: Real-Time Collaboration Strategy

| Approach | Complexity | Conflict Quality | Best For |
|----------|-----------|-----------------|----------|
| **Full CRDT/OT** | Very high | Perfect merge | Google Docs (character-level editing) |
| **Component-level locking** | Low | No conflicts (locked) | Simple co-editing |
| **Presence + last-write-wins (Chosen)** | Medium | Acceptable (component-level) | Visual builders (Retool, Figma) |

**Decision**: Presence-based collaboration with last-write-wins at the component level. When two builders edit the same component simultaneously, the last save wins. Presence indicators show who is selecting which component, enabling social conflict avoidance. This is sufficient because visual builder edits are coarser-grained than text editing---users rarely modify the exact same component property at the same time.

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs. Async** | Sync for query execution, async for audit/analytics | End-users need immediate query results |
| **Event-driven vs. Request-response** | Request-response for queries; event-driven for side effects | Queries are synchronous; audit/notifications are fire-and-forget |
| **Push vs. Pull** | Pull for data (query on demand); push for presence/collaboration | End-users fetch data; builders receive real-time presence updates |
| **Stateless vs. Stateful** | Stateless query execution; stateful collaboration sessions | Query engine scales horizontally; collaboration needs WebSocket state |
| **Read vs. Write optimization** | Read-optimized runtime (cached definitions); write-optimized builder (fast saves) | Runtime traffic is 100x builder traffic |
| **Real-time vs. Batch** | Real-time for queries and UI; batch for analytics/audit aggregation | User-facing is real-time; operational data is batched |
