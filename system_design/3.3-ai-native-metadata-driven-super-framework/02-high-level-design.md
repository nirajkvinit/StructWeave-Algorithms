# High-Level Design

[Back to Index](./00-index.md)

---

## System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer"]
        WebApp[Web Application<br/>SPA/PWA]
        MobileApp[Mobile Apps<br/>iOS/Android]
        APIClients[External API<br/>Clients]
        ChatUI[Conversational<br/>Interface]
        DevTools[Developer<br/>Tools/IDE]
    end

    subgraph EdgeLayer["Edge Layer"]
        CDN[CDN<br/>Static Assets + Metadata Cache]
        GlobalLB[Global Load<br/>Balancer]
    end

    subgraph GatewayLayer["API Gateway Layer"]
        APIGW[API Gateway]
        AuthService[Auth Service<br/>OAuth/SAML/SSO]
        RateLimiter[Rate Limiter<br/>Per Tenant]
        TenantRouter[Tenant Router<br/>Shard Selection]
        RequestValidator[Request<br/>Validator]
    end

    subgraph MetadataPlane["Metadata Plane"]
        MetadataCache[Metadata Cache<br/>Redis Cluster]
        MetadataDB[(Metadata<br/>Database)]
        SchemaRegistry[Schema<br/>Registry]
        MetadataVersioning[Versioning<br/>Service]
        DeploymentService[Deployment<br/>Service]
    end

    subgraph RuntimePlane["Runtime Engine Plane"]
        QueryEngine[Query<br/>Processor]
        FormulaEngine[Formula<br/>Engine]
        WorkflowEngine[Workflow<br/>Engine]
        ValidationEngine[Validation<br/>Engine]
        UIMetadataService[UI Metadata<br/>Service]
        TriggerOrchestrator[Trigger<br/>Orchestrator]
    end

    subgraph PermissionPlane["Permission Plane"]
        PolicyEngine[Policy<br/>Engine]
        SharingCalculator[Sharing<br/>Calculator]
        RoleHierarchyService[Role Hierarchy<br/>Service]
        PermissionCache[Permission<br/>Cache]
    end

    subgraph AIPlatform["AI Platform"]
        LLMGateway[LLM<br/>Gateway]
        LLMServing[LLM Serving<br/>Cluster]
        RAGEngine[RAG<br/>Engine]
        VectorDB[(Vector<br/>Database)]
        AgentOrchestrator[Agent<br/>Orchestrator]
        PromptRegistry[Prompt<br/>Registry]
    end

    subgraph DataPlane["Data Plane"]
        TenantDataRouter[Tenant Data<br/>Router]
        FlexColumnStore[(Flex Column<br/>Store)]
        SearchCluster[(Search<br/>Cluster)]
        BlobStorage[(Blob<br/>Storage)]
        EventStore[(Event<br/>Store)]
    end

    subgraph AuditPlane["Audit & Compliance"]
        AuditLogger[Audit<br/>Logger]
        AuditStore[(Audit<br/>Store)]
        ComplianceService[Compliance<br/>Service]
    end

    subgraph AsyncPlane["Async Processing"]
        MessageQueue[Message<br/>Queue]
        WorkflowWorkers[Workflow<br/>Workers]
        BatchProcessor[Batch<br/>Processor]
        SchedulerService[Scheduler<br/>Service]
    end

    %% Client to Edge
    ClientLayer --> CDN
    CDN --> GlobalLB
    GlobalLB --> APIGW

    %% Gateway Flow
    APIGW --> AuthService
    APIGW --> RateLimiter
    APIGW --> TenantRouter
    APIGW --> RequestValidator

    %% Gateway to Runtime
    TenantRouter --> RuntimePlane
    TenantRouter --> AIPlatform

    %% Runtime to Metadata
    RuntimePlane --> MetadataCache
    MetadataCache -.-> MetadataDB
    FormulaEngine --> MetadataCache
    WorkflowEngine --> MetadataCache
    UIMetadataService --> MetadataCache

    %% Runtime to Permissions
    RuntimePlane --> PermissionPlane
    PolicyEngine --> PermissionCache
    PermissionCache --> MetadataCache

    %% Runtime to Data
    QueryEngine --> TenantDataRouter
    TenantDataRouter --> FlexColumnStore
    TenantDataRouter --> SearchCluster
    TenantDataRouter --> BlobStorage

    %% AI Platform
    LLMGateway --> LLMServing
    LLMGateway --> RAGEngine
    RAGEngine --> VectorDB
    AgentOrchestrator --> RuntimePlane

    %% Async Processing
    WorkflowEngine --> MessageQueue
    MessageQueue --> WorkflowWorkers
    WorkflowWorkers --> RuntimePlane
    SchedulerService --> BatchProcessor

    %% Audit
    RuntimePlane --> AuditLogger
    AuditLogger --> AuditStore

    %% Styling
    style MetadataPlane fill:#e3f2fd
    style RuntimePlane fill:#e8f5e9
    style PermissionPlane fill:#f3e5f5
    style AIPlatform fill:#fff3e0
    style DataPlane fill:#fce4ec
```

---

## Data Flow Diagrams

### 1. Custom Object Creation Flow

```mermaid
sequenceDiagram
    participant Admin as Admin User
    participant API as API Gateway
    participant Auth as Auth Service
    participant Meta as Metadata Service
    participant Deploy as Deployment Service
    participant Cache as Metadata Cache
    participant DB as Metadata DB
    participant Audit as Audit Log

    Admin->>API: POST /metadata/objects {name, fields, ...}
    API->>Auth: Validate token + check admin permission
    Auth-->>API: Authorized

    API->>Meta: Create object definition
    Meta->>Meta: Validate object schema
    Meta->>Meta: Allocate flex column mappings

    Meta->>DB: BEGIN TRANSACTION
    Meta->>DB: INSERT object_definition
    Meta->>DB: INSERT field_definitions (batch)
    Meta->>DB: INSERT default_layout
    Meta->>DB: COMMIT

    Meta->>Deploy: Queue deployment
    Deploy->>Cache: Invalidate tenant metadata
    Deploy->>Audit: Log object creation

    Meta-->>API: Object created (pending deployment)
    API-->>Admin: 201 Created {object_id, status: deploying}

    Note over Deploy,Cache: Async deployment completes
    Deploy->>Cache: Warm cache with new metadata
    Deploy->>DB: UPDATE object status = deployed
```

### 2. Record CRUD with Formula Evaluation Flow

```mermaid
sequenceDiagram
    participant Client as Client App
    participant API as API Gateway
    participant Runtime as Runtime Engine
    participant Meta as Metadata Cache
    participant Perm as Permission Engine
    participant Formula as Formula Engine
    participant Valid as Validation Engine
    participant Trigger as Trigger Orchestrator
    participant Data as Flex Column Store
    participant Audit as Audit Log

    Client->>API: PATCH /data/Account/001 {Revenue: 1000000}
    API->>Runtime: Process update request

    Runtime->>Meta: Get object metadata (Account)
    Meta-->>Runtime: Object definition + field mappings

    Runtime->>Perm: Check record access (Account/001, UPDATE)
    Perm->>Perm: Check OWD + Sharing Rules + Role Hierarchy
    Perm-->>Runtime: Access granted

    Runtime->>Perm: Check field access (Revenue, EDIT)
    Perm-->>Runtime: Field access granted

    Runtime->>Valid: Validate field value
    Valid->>Meta: Get validation rules
    Valid->>Formula: Evaluate validation formulas
    Formula-->>Valid: Validation passed
    Valid-->>Runtime: Valid

    Runtime->>Trigger: Execute before-update triggers
    Trigger->>Meta: Get workflow rules (before update)
    Trigger->>Formula: Evaluate trigger criteria
    Trigger-->>Runtime: Before-triggers executed

    Runtime->>Formula: Evaluate formula fields
    Formula->>Meta: Get formula definitions
    Formula->>Data: Fetch cross-object values (if needed)
    Formula-->>Runtime: Calculated values {AnnualRevenue, Tier}

    Runtime->>Data: UPDATE record with flex column mapping
    Data-->>Runtime: Record updated

    Runtime->>Trigger: Execute after-update triggers
    Trigger->>Trigger: Queue async actions (emails, tasks)

    Runtime->>Audit: Log record change
    Runtime-->>API: Update successful
    API-->>Client: 200 OK {updated record}
```

### 3. Query Execution Flow

```mermaid
sequenceDiagram
    participant Client as Client App
    participant API as API Gateway
    participant Query as Query Processor
    participant Meta as Metadata Cache
    participant Perm as Permission Engine
    participant Sharing as Sharing Calculator
    participant Data as Flex Column Store
    participant Search as Search Cluster

    Client->>API: POST /query {SELECT Name, Revenue FROM Account WHERE Industry = 'Tech'}
    API->>Query: Process SOQL query

    Query->>Meta: Get object metadata (Account)
    Meta-->>Query: Object + Field definitions

    Query->>Query: Parse SOQL to AST
    Query->>Query: Validate fields exist
    Query->>Query: Map API names to flex columns

    Query->>Perm: Get accessible fields (FLS check)
    Perm-->>Query: Visible fields list

    Query->>Sharing: Get sharing filter for user
    Sharing->>Sharing: Evaluate OWD
    Sharing->>Sharing: Apply sharing rules
    Sharing->>Sharing: Add role hierarchy filter
    Sharing-->>Query: WHERE clause additions

    Query->>Query: Build optimized SQL
    Note over Query: SELECT flex_string_1 AS Name, flex_number_1 AS Revenue<br/>FROM object_records<br/>WHERE tenant_id = ? AND object_def_id = ?<br/>AND flex_string_5 = 'Tech'<br/>AND (owner_id = ? OR id IN (sharing_set))

    Query->>Data: Execute query
    Data-->>Query: Raw results

    Query->>Query: Map flex columns to API names
    Query->>Perm: Mask restricted fields
    Query-->>API: Query results
    API-->>Client: 200 OK {records: [...]}
```

### 4. AI Formula Generation Flow

```mermaid
sequenceDiagram
    participant Admin as Admin User
    participant API as API Gateway
    participant AI as AI Gateway
    participant RAG as RAG Engine
    participant Vector as Vector DB
    participant LLM as LLM Service
    participant Meta as Metadata Cache
    participant Valid as Formula Validator

    Admin->>API: POST /ai/formula/generate {description: "Calculate 10% discount if quantity > 100"}
    API->>AI: Generate formula request

    AI->>Meta: Get object context (current object, fields)
    Meta-->>AI: Object schema {fields, types, relationships}

    AI->>RAG: Retrieve formula documentation
    RAG->>Vector: Similarity search for formula patterns
    Vector-->>RAG: Relevant formula examples
    RAG-->>AI: Context documents

    AI->>AI: Build prompt with schema + examples
    AI->>LLM: Generate formula
    Note over LLM: Prompt includes:<br/>- Available fields and types<br/>- Supported functions<br/>- Similar formula examples<br/>- User's description
    LLM-->>AI: Generated formula: IF(Quantity > 100, Amount * 0.1, 0)

    AI->>Valid: Validate generated formula
    Valid->>Valid: Parse formula
    Valid->>Valid: Type check
    Valid->>Valid: Check field references exist
    Valid-->>AI: Formula valid

    AI-->>API: Formula + explanation + confidence
    API-->>Admin: {formula, explanation, confidence: 0.95}
```

### 5. Workflow Trigger Execution Flow

```mermaid
sequenceDiagram
    participant Runtime as Runtime Engine
    participant Trigger as Trigger Orchestrator
    participant Meta as Metadata Cache
    participant Formula as Formula Engine
    participant Queue as Message Queue
    participant Worker as Workflow Worker
    participant Data as Flex Column Store
    participant Email as Email Service
    participant Audit as Audit Log

    Runtime->>Trigger: Record updated (Case, priority changed)

    Trigger->>Meta: Get workflow rules (Case, after-update)
    Meta-->>Trigger: [Rule1: Email on High Priority, Rule2: Update SLA]

    loop For each workflow rule
        Trigger->>Formula: Evaluate entry criteria
        Note over Formula: OLD.Priority != NEW.Priority AND NEW.Priority = 'High'
        Formula-->>Trigger: Criteria met: true

        Trigger->>Trigger: Check re-evaluation setting
        Note over Trigger: Rule1: Evaluate every time → Execute<br/>Rule2: When first true → Check if was false before

        Trigger->>Queue: Enqueue workflow actions
    end

    Trigger-->>Runtime: Sync triggers complete

    Note over Queue,Worker: Async execution

    Worker->>Queue: Dequeue workflow action
    Queue-->>Worker: {action: email_alert, template: high_priority_case}

    Worker->>Meta: Get email template
    Worker->>Data: Get record fields for merge
    Worker->>Email: Send email with merged fields
    Email-->>Worker: Email sent

    Worker->>Audit: Log workflow execution
    Worker->>Queue: Acknowledge completion
```

---

## Key Architectural Decisions

### Decision 1: Flex Columns vs Schema-per-Tenant

| Option | Pros | Cons |
|--------|------|------|
| **Flex Columns (Chosen)** | No DDL, instant field creation, shared infrastructure | Query complexity, type coercion overhead |
| Schema-per-Tenant | Natural SQL, type safety | DDL latency, connection pool explosion, migration complexity |
| NoSQL Document Store | Flexible schema, easy nesting | Query limitations, transaction complexity |

**Decision:** Flex columns with metadata-driven mapping. This is the proven pattern from Salesforce's Force.com platform, enabling instant customization without database migrations.

**Implementation:**
- Pre-allocated columns: `flex_string_1..100`, `flex_number_1..50`, `flex_date_1..20`, `flex_boolean_1..20`, `flex_clob_1..10`
- Metadata tracks which flex column stores which custom field
- Runtime maps API field names to physical columns
- Indexes created on commonly filtered flex columns

---

### Decision 2: Metadata Caching Strategy

| Option | Pros | Cons |
|--------|------|------|
| **Multi-Layer Cache (Chosen)** | Low latency, cache hierarchy | Invalidation complexity |
| Single Distributed Cache | Simpler architecture | Higher latency, single point |
| No Cache (Direct DB) | Always consistent | Unacceptable latency at scale |

**Decision:** Three-layer caching (L1 in-process, L2 distributed, L3 CDN for static).

**Implementation:**
```
L1 (In-Process): 2GB per instance, 60s TTL
   - Hot object/field definitions
   - Compiled formula ASTs
   - User permission snapshots

L2 (Redis Cluster): 60GB shared, 5min TTL
   - All tenant metadata
   - Sharing calculations
   - Session data

L3 (CDN Edge): 15min TTL
   - Picklist values
   - Static layouts
   - Help text
```

**Invalidation Strategy:**
- Metadata change → Publish to invalidation topic → All instances clear L1 → Update L2
- Tenant-scoped invalidation keys: `metadata:{tenant_id}:{object_api_name}`

---

### Decision 3: Formula Engine Design

| Option | Pros | Cons |
|--------|------|------|
| **AST Interpreter (Chosen)** | Flexible, debuggable, safe | Slower than compiled |
| Compiled to Bytecode | Fast execution | Complex compilation, security risks |
| Transpile to SQL | Database-native execution | Limited function support, complex cross-object |

**Decision:** AST-based interpreter with compiled AST caching.

**Implementation:**
1. Parse formula text to tokens
2. Build Abstract Syntax Tree
3. Validate types and field references
4. Cache compiled AST
5. Evaluate AST with record context at runtime

**Optimization:**
- Short-circuit evaluation for logical operators
- Lazy loading of cross-object references
- Parallel evaluation of independent sub-expressions

---

### Decision 4: Workflow Execution Model

| Option | Pros | Cons |
|--------|------|------|
| **Hybrid Sync/Async (Chosen)** | Responsive UI, background processing | Complexity in state management |
| Fully Synchronous | Simple, predictable | Slow responses, timeout risk |
| Fully Asynchronous | Scalable | User confusion, eventual consistency |

**Decision:** Sync for validation/before-triggers, async for after-triggers/actions.

**Implementation:**
- **Before triggers:** Execute synchronously, can prevent save
- **After triggers (field updates):** Execute synchronously, included in transaction
- **After triggers (external actions):** Queue for async execution
- **Approval processes:** Fully async with status tracking

**Governor Limits:**
- Max trigger depth: 5 (prevent infinite recursion)
- Max sync execution time: 10 seconds
- Max async queue per transaction: 100 actions

---

### Decision 5: Permission Calculation Approach

| Option | Pros | Cons |
|--------|------|------|
| **On-Demand with Caching (Chosen)** | Accurate, reasonable latency | Cache invalidation complexity |
| Pre-Computed Sharing | Fast reads | Expensive writes, storage overhead |
| Pure On-Demand | Always accurate | Too slow for complex hierarchies |

**Decision:** On-demand calculation with aggressive caching and async pre-computation for common patterns.

**Implementation:**
- **Object/Field permissions:** Cached indefinitely, invalidated on permission set change
- **Record sharing:** Calculated on-demand, cached per user-record pair (5min TTL)
- **Role hierarchy:** Pre-computed tree, cached per tenant
- **Sharing rules:** Evaluated at query time, results cached

**Async Pre-Computation:**
- When sharing rule changes, queue recalculation jobs
- Large tenants: batch recalculation during low-traffic windows
- Share grants: immediately written to explicit share table

---

### Decision 6: AI Integration Architecture

| Option | Pros | Cons |
|--------|------|------|
| **Self-Hosted LLM with RAG (Chosen)** | Data privacy, customization | Infrastructure cost |
| External LLM API | Simple, no infrastructure | Data leaves platform, less control |
| Fine-Tuned Small Models | Fast, specialized | Training overhead, less flexible |

**Decision:** Self-hosted LLM cluster with RAG for context injection.

**Implementation:**
- LLM serving cluster (vLLM) for formula/workflow generation
- Vector database for documentation and example storage
- RAG pipeline injects schema context and similar examples
- Prompt registry for versioned, tested prompts
- Guardrails for output validation before applying

**AI Guardrails:**
- Formula syntax validation before suggesting
- Workflow action validation against available types
- Human approval required for production deployment
- Rate limiting per tenant

---

## Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---------|----------|---------------|
| Sync vs Async | Hybrid | Responsive UI for reads, scalable for background work |
| Event-driven vs Request-response | Event-driven for workflows | Decoupled trigger execution |
| Push vs Pull | Pull for queries, Push for real-time | Standard for data platforms |
| Stateless vs Stateful | Stateless runtime engines | Horizontal scaling |
| Read-heavy vs Write-heavy | Read-heavy (80:20) | Caching optimized for reads |
| Real-time vs Batch | Real-time for UI, Batch for bulk operations | User experience vs throughput |
| Edge vs Origin | Edge for metadata cache | Global latency reduction |

---

## Component Interaction Matrix

| Component | Metadata Cache | Permission Engine | Data Store | AI Platform |
|-----------|---------------|-------------------|------------|-------------|
| **Query Processor** | Read object/field defs | Check FLS + Sharing | Execute queries | - |
| **Formula Engine** | Read formula ASTs | - | Fetch cross-object data | - |
| **Workflow Engine** | Read workflow rules | - | Update records | - |
| **UI Renderer** | Read layouts | Check FLS | - | - |
| **Validation Engine** | Read validation rules | - | - | - |
| **AI Gateway** | Read schema context | - | - | Generate formulas |

---

## Deployment Topology

```mermaid
flowchart TB
    subgraph Region1["Region: US-East"]
        subgraph AZ1["Availability Zone 1"]
            API1[API Gateway<br/>Cluster]
            Runtime1[Runtime Engine<br/>Pool]
            Cache1[Redis<br/>Primary]
        end

        subgraph AZ2["Availability Zone 2"]
            API2[API Gateway<br/>Cluster]
            Runtime2[Runtime Engine<br/>Pool]
            Cache2[Redis<br/>Replica]
        end

        subgraph DataTier["Data Tier"]
            MetaDB1[(Metadata DB<br/>Primary)]
            MetaDB2[(Metadata DB<br/>Replica)]
            DataDB1[(Flex Store<br/>Primary)]
            DataDB2[(Flex Store<br/>Replica)]
        end

        subgraph AITier["AI Tier"]
            LLM1[LLM Serving<br/>GPU Cluster]
            Vector1[(Vector DB)]
        end
    end

    subgraph Region2["Region: EU-West"]
        subgraph AZ3["Availability Zone 1"]
            API3[API Gateway]
            Runtime3[Runtime Engine]
            Cache3[Redis Primary]
        end

        subgraph DataTier2["Data Tier"]
            MetaDB3[(Metadata DB<br/>Primary)]
            DataDB3[(Flex Store<br/>Primary)]
        end
    end

    GlobalLB[Global Load Balancer] --> Region1
    GlobalLB --> Region2

    MetaDB1 -.->|Async Replication| MetaDB3
    DataDB1 -.->|Async Replication| DataDB3
```

---

## Technology Stack Summary

| Layer | Component | Technology | Justification |
|-------|-----------|------------|---------------|
| **Edge** | CDN | Cloudflare/Fastly | Global edge caching |
| **Gateway** | Load Balancer | Envoy | gRPC + HTTP support |
| **Gateway** | API Gateway | Kong/Custom | Rate limiting, routing |
| **Auth** | Identity | Custom + OIDC | Enterprise SSO |
| **Cache** | L1 | In-process (Caffeine) | Sub-ms reads |
| **Cache** | L2 | Redis Cluster | Distributed metadata |
| **Metadata** | Database | PostgreSQL | JSONB, partitioning |
| **Data** | Flex Store | CockroachDB/Vitess | Horizontal scaling |
| **Search** | Index | Elasticsearch | Full-text, aggregations |
| **AI** | LLM Serving | vLLM | High throughput |
| **AI** | Vector DB | Milvus | RAG retrieval |
| **Queue** | Message Broker | Kafka | Workflow events |
| **Async** | Workers | Custom | Workflow execution |
