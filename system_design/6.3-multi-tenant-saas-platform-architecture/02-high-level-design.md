# High-Level Design

## System Architecture

The multi-tenant SaaS platform follows a **layered architecture** with tenant context propagated through every layer. The design uses a **shared-everything** model at the database layer (Salesforce-style pivoted data) combined with **cell-based deployment** at the infrastructure layer for blast radius containment.

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer"]
        WebApp["Web Application<br/>(Org-specific UI)"]
        MobileApp["Mobile App"]
        ExtAPI["External API<br/>Integrations"]
    end

    subgraph EdgeLayer["Edge / Gateway Layer"]
        GLB["Global Load<br/>Balancer (GeoDNS)"]
        CDN["CDN<br/>(Static Assets)"]
        WAF["WAF / DDoS<br/>Protection"]
    end

    subgraph GatewayLayer["API Gateway Layer"]
        TenantRouter["Tenant Router<br/>(Org → Instance)"]
        AuthN["AuthN Service<br/>(OAuth2/OIDC)"]
        RateLimiter["Rate Limiter<br/>(Per-Org Quotas)"]
        APIGateway["API Gateway<br/>(Versioning, Throttling)"]
    end

    subgraph PlatformRuntime["Platform Runtime (Per Cell)"]
        direction TB
        subgraph MetadataLayer["Metadata Layer"]
            MetaEngine["Metadata Engine"]
            MetaCache["Metadata Cache<br/>(Distributed)"]
            SchemaResolver["Schema Resolver<br/>(Virtual → Physical)"]
        end

        subgraph ExecutionLayer["Execution Layer"]
            QueryCompiler["Query Compiler<br/>(OrgID injection)"]
            FormulaEngine["Formula Engine<br/>(Expression Evaluator)"]
            WorkflowEngine["Workflow Engine<br/>(Triggers, Rules)"]
            ValidationEngine["Validation Engine<br/>(Rule Evaluator)"]
        end

        subgraph GovernorLayer["Resource Management"]
            GovernorLimits["Governor Limits<br/>Enforcer"]
            ResourceTracker["Resource Tracker<br/>(CPU, Memory, Queries)"]
            TenantQuota["Tenant Quota<br/>Manager"]
        end
    end

    subgraph DataLayer["Data Layer"]
        subgraph PrimaryDB["Primary Database (Partitioned by OrgID)"]
            UDD["Universal Data<br/>Dictionary<br/>(MT_Objects, MT_Fields)"]
            MTData["MT_Data<br/>(Pivoted Storage)"]
            MTIndexes["MT_Indexes<br/>(Typed Indexes)"]
            MTRelations["MT_Relationships"]
        end
        subgraph SupportDB["Supporting Stores"]
            SearchIdx["Search Index<br/>(Full-text)"]
            FileStore["File / Blob<br/>Storage"]
            AuditLog["Audit Log<br/>(Append-only)"]
        end
        subgraph CacheLayer["Cache Layer"]
            DataCache["Data Cache<br/>(Hot Records)"]
            QueryCache["Query Result<br/>Cache"]
        end
    end

    subgraph AsyncLayer["Async Processing"]
        MQ["Message Queue<br/>(Event Bus)"]
        BulkProcessor["Bulk API<br/>Processor"]
        AsyncWorker["Async Worker<br/>(Futures, Batch)"]
        ReportEngine["Report Engine<br/>(Analytics)"]
    end

    WebApp --> GLB
    MobileApp --> GLB
    ExtAPI --> GLB
    GLB --> CDN
    GLB --> WAF
    WAF --> TenantRouter
    TenantRouter --> AuthN
    AuthN --> RateLimiter
    RateLimiter --> APIGateway
    APIGateway --> MetaEngine
    MetaEngine --> MetaCache
    MetaEngine --> SchemaResolver
    SchemaResolver --> QueryCompiler
    QueryCompiler --> GovernorLimits
    GovernorLimits --> ResourceTracker
    ResourceTracker --> MTData
    ResourceTracker --> MTIndexes
    MetaEngine --> FormulaEngine
    MetaEngine --> WorkflowEngine
    MetaEngine --> ValidationEngine
    MetaEngine --> UDD
    MTData --> DataCache
    QueryCompiler --> QueryCache
    APIGateway --> MQ
    MQ --> BulkProcessor
    MQ --> AsyncWorker
    MQ --> ReportEngine
    SchemaResolver --> SearchIdx
    MetaEngine --> FileStore
    GovernorLimits --> AuditLog
    MTData --> MTRelations

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fce4ec,stroke:#c62828,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef platform fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef async fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class WebApp,MobileApp,ExtAPI client
    class GLB,CDN,WAF edge
    class TenantRouter,AuthN,RateLimiter,APIGateway gateway
    class MetaEngine,MetaCache,SchemaResolver,QueryCompiler,FormulaEngine,WorkflowEngine,ValidationEngine,GovernorLimits,ResourceTracker,TenantQuota platform
    class UDD,MTData,MTIndexes,MTRelations,SearchIdx,FileStore,AuditLog data
    class DataCache,QueryCache cache
    class MQ,BulkProcessor,AsyncWorker,ReportEngine async
```

---

## Data Flow

### Write Path (Record Create/Update)

```mermaid
sequenceDiagram
    participant C as Client
    participant AG as API Gateway
    participant TR as Tenant Router
    participant ME as Metadata Engine
    participant VE as Validation Engine
    participant WE as Workflow Engine
    participant GL as Governor Limits
    participant QC as Query Compiler
    participant DB as MT_Data (DB)
    participant AC as Audit Log

    C->>AG: POST /api/v1/sobjects/Account
    AG->>TR: Route by Org-ID header
    TR->>ME: Resolve org metadata (cached)
    ME-->>TR: Object schema, field map, rules

    Note over TR,ME: Phase 1: Pre-validation
    TR->>VE: System validation (required fields, types)
    VE->>VE: Custom validation rules (formula eval)
    VE-->>TR: Validation result

    alt Validation Failed
        TR-->>C: 400 Bad Request + error details
    end

    Note over TR,GL: Phase 2: Governor check
    TR->>GL: Check transaction limits
    GL->>GL: Increment: DML count, CPU time
    GL-->>TR: Within limits / LIMIT_EXCEEDED

    alt Governor Limit Exceeded
        TR-->>C: 429 Governor Limit Exceeded
    end

    Note over QC,DB: Phase 3: Physical write
    TR->>QC: Translate virtual fields → flex columns
    QC->>QC: Map field → Value{N} slot
    QC->>QC: Inject OrgID into INSERT
    QC->>DB: INSERT INTO MT_Data (OrgID, ObjID, Value0..N)
    DB-->>QC: GUID assigned

    Note over QC,DB: Phase 4: Index update
    QC->>DB: INSERT INTO MT_Indexes (typed copies)

    Note over WE,AC: Phase 5: Post-processing
    QC->>WE: Fire after-save triggers
    WE->>WE: Execute workflow rules
    WE->>WE: Field updates (re-trigger if changed)
    QC->>AC: Append audit entry (who, what, when)

    QC-->>C: 201 Created + record GUID
```

### Read Path (Query Execution)

```mermaid
sequenceDiagram
    participant C as Client
    participant AG as API Gateway
    participant MC as Metadata Cache
    participant GL as Governor Limits
    participant QC as Query Compiler
    participant QRC as Query Result Cache
    participant IDX as MT_Indexes
    participant DB as MT_Data

    C->>AG: GET /api/v1/query?q=SELECT Name, Revenue FROM Account WHERE Industry='Tech'
    AG->>MC: Resolve: Account → ObjID, Name → slot, Revenue → slot, Industry → slot
    MC-->>AG: Field mappings + security (FLS check)

    AG->>GL: Check: SOQL count < 100, records < 50,000
    GL-->>AG: Within limits

    AG->>QC: Compile virtual query → physical SQL

    Note over QC: Virtual: SELECT Name, Revenue FROM Account WHERE Industry='Tech'
    Note over QC: Physical: SELECT Value3, Value7 FROM MT_Data<br/>WHERE OrgID=:org AND ObjID=:obj<br/>AND GUID IN (SELECT GUID FROM MT_Indexes<br/>WHERE OrgID=:org AND StringValue='Tech'<br/>AND FieldNum=12)

    QC->>QRC: Check query cache (OrgID + query hash)
    alt Cache Hit
        QRC-->>C: Cached result (with freshness check)
    end

    QC->>IDX: Execute index lookup
    IDX-->>QC: Matching GUIDs
    QC->>DB: Fetch records by GUIDs
    DB-->>QC: Raw flex column data
    QC->>QC: Convert VARCHAR → typed values
    QC->>QC: Evaluate formula fields
    QC->>QC: Apply field-level security (mask restricted fields)
    QC->>QRC: Cache result
    QC-->>C: JSON response with typed records
```

---

## Key Architectural Decisions

### 1. Shared Schema with Metadata Overlay (vs. Schema-per-Tenant)

**Decision:** Single shared physical schema with metadata-driven virtual schema (Salesforce UDD approach)

| Factor | Shared Schema + Metadata | Schema-per-Tenant | Database-per-Tenant |
|--------|--------------------------|--------------------|--------------------|
| **Tenant density** | 8,000+ orgs/instance | ~500 orgs/instance | ~100 orgs/instance |
| **Provisioning time** | Milliseconds (insert metadata rows) | Seconds (DDL operations) | Minutes (full DB spin-up) |
| **Customization depth** | Very high (virtual anything) | Medium (real DDL) | High (full control) |
| **Cross-tenant migration** | Complex (metadata transformation) | Medium (schema export) | Easiest (backup/restore) |
| **Operational complexity** | Low (single DB to manage) | High (N schemas to migrate) | Very high (N DBs) |
| **Noisy neighbor risk** | Higher (mitigated by governor limits) | Medium | Lowest |

**Justification:** At 10,000+ tenants, schema-per-tenant creates unmanageable DDL overhead (migrations across 10K schemas). The metadata approach allows instant provisioning and infinite customization without physical schema changes.

### 2. Cell-Based Deployment Architecture

**Decision:** Deploy the platform in independent **cells**, each containing a complete copy of the application stack (app servers, database, caches, queues).

**Cell design:**
- Each cell serves ~500-2,000 tenant organizations
- Cells are independently deployable, scalable, and upgradeable
- A tenant is assigned to exactly one cell (no cross-cell data)
- Cell routing handled by a global control plane

**Why cells over monolithic shared infrastructure:**
- **Blast radius containment** -- a database failure in Cell-3 affects only Cell-3 tenants
- **Independent scaling** -- cells with "hot" tenants get more resources without affecting others
- **Canary deployments** -- roll new versions to one cell first, verify, then propagate
- **Compliance** -- cells can be deployed in specific regions for data residency

### 3. Synchronous vs. Asynchronous Communication

| Operation | Model | Justification |
|-----------|-------|---------------|
| CRUD operations | **Synchronous** (request-response) | Users expect immediate confirmation |
| Bulk data operations | **Asynchronous** (queue-based) | 10K+ record operations must not block |
| Workflow execution | **Sync for inline**, async for heavy actions | Inline field updates are sync; email/callouts are async |
| Report generation | **Asynchronous** | Complex aggregations can take seconds-minutes |
| Cross-cell events | **Asynchronous** (event bus) | Cells must not have synchronous dependencies |
| Audit logging | **Asynchronous** (fire-and-forget) | Must not add latency to user operations |

### 4. Database Choice: Relational with Pivoted Model

**Decision:** Relational database (PostgreSQL or Oracle) with the pivoted/EAV data model

**Why relational over NoSQL for the data layer:**
- Governor limits require **transaction support** (ACID) for limit enforcement
- Validation rules and workflow triggers need **transactional consistency**
- The typed index tables need **B-tree indexes** for range queries
- Audit trails need **ordered, durable writes**
- 30+ years of proven operational tooling (backups, monitoring, replication)

**Why pivoted model over traditional relational:**
- Adding a "custom field" is an INSERT (metadata row), not an ALTER TABLE
- No schema migrations across thousands of tenants
- Slot reuse enables 500+ fields per object without wide-table penalties
- Trade-off: query performance relies on typed index tables, not native column indexing

### 5. Caching Strategy (Multi-Layer)

| Cache Layer | What | TTL | Invalidation |
|-------------|------|-----|-------------|
| **L1: In-process** | Metadata for current org | Request duration | Per-request |
| **L2: Distributed (Redis)** | Metadata, query results, session | 5-15 min | Transactional invalidation on metadata change |
| **L3: CDN** | Static assets, API docs | 1 hour | Purge on deploy |
| **Query result cache** | Frequently executed queries per org | 30 sec | Invalidated on any write to the object |

**Critical:** Metadata cache invalidation must be **transactional** -- when a tenant adds a custom field, all app servers must see the new field within the metadata sync SLO (< 100ms). This is implemented via a pub/sub notification channel that triggers cache eviction.

### 6. Message Queue Usage

| Use Case | Pattern | Queue Type |
|----------|---------|-----------|
| Bulk API processing | Producer-consumer | Persistent, tenant-partitioned |
| Workflow async actions | Event-driven | Priority queue (per-tenant fairness) |
| Cross-cell notifications | Pub/sub | Topic-based (cell events) |
| Audit log ingestion | Fire-and-forget | High-throughput append |
| Report/analytics jobs | Job queue | Scheduled, priority-based |

---

## Architecture Pattern Checklist

- [x] **Sync vs Async** -- Sync for CRUD, async for bulk/reports/workflows
- [x] **Event-driven vs Request-response** -- Request-response for API, event-driven for internal orchestration
- [x] **Push vs Pull** -- Push for real-time updates (WebSocket per org), pull for reports
- [x] **Stateless vs Stateful** -- App servers are stateless; state lives in DB + cache
- [x] **Read-heavy optimization** -- Query result caching, typed index tables, read replicas
- [x] **Real-time vs Batch** -- Real-time for CRUD, batch for bulk API and analytics
- [x] **Edge vs Origin** -- CDN for static assets, origin for dynamic tenant-specific data
- [x] **Cell-based deployment** -- Independent cells for blast radius containment

---

## Component Interaction Summary

```mermaid
flowchart LR
    subgraph ControlPlane["Global Control Plane"]
        TR["Tenant Registry<br/>(Org → Cell mapping)"]
        DP["Deployment<br/>Pipeline"]
        MON["Global<br/>Monitoring"]
    end

    subgraph Cell1["Cell 1 (Region: US-East)"]
        direction TB
        APP1["App Servers"]
        DB1["Database<br/>(Partitioned)"]
        CACHE1["Cache Cluster"]
        MQ1["Message Queue"]
    end

    subgraph Cell2["Cell 2 (Region: EU-West)"]
        direction TB
        APP2["App Servers"]
        DB2["Database<br/>(Partitioned)"]
        CACHE2["Cache Cluster"]
        MQ2["Message Queue"]
    end

    subgraph Cell3["Cell 3 (Region: AP-South)"]
        direction TB
        APP3["App Servers"]
        DB3["Database<br/>(Partitioned)"]
        CACHE3["Cache Cluster"]
        MQ3["Message Queue"]
    end

    TR --> Cell1
    TR --> Cell2
    TR --> Cell3
    DP --> Cell1
    DP --> Cell2
    DP --> Cell3
    MON --> Cell1
    MON --> Cell2
    MON --> Cell3

    classDef control fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef cell fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class TR,DP,MON control
    class APP1,DB1,CACHE1,MQ1,APP2,DB2,CACHE2,MQ2,APP3,DB3,CACHE3,MQ3 cell
```
