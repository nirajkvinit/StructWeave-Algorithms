# AI Native ATS Cloud SaaS - High-Level Design

[← Previous: Requirements & Estimations](./01-requirements-and-estimations.md) | [Back to Index](./00-index.md) | [Next: Low-Level Design →](./03-low-level-design.md)

---

## System Architecture

### Component Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer"]
        RecruiterWeb["Recruiter Portal<br/>(React SPA)"]
        CandidatePortal["Candidate Portal<br/>(Public)"]
        MobileApp["Mobile App<br/>(iOS/Android)"]
        ConversationalUI["Conversational AI<br/>(Web Widget/SMS/WhatsApp)"]
        APIClients["Third-Party<br/>Integrations"]
    end

    subgraph EdgeLayer["Edge Layer"]
        CDN["Global CDN<br/>(Static Assets)"]
        EdgeCache["Edge Cache<br/>(Search Results)"]
    end

    subgraph GatewayLayer["API Gateway Layer"]
        LoadBalancer["Load Balancer<br/>(L7)"]
        APIGateway["API Gateway"]
        AuthService["Auth Service<br/>(OIDC/SAML)"]
        RateLimiter["Rate Limiter<br/>(Per-tenant)"]
        TenantRouter["Tenant Router"]
    end

    subgraph ATSServiceLayer["ATS Service Layer (Stateless)"]
        JobService["Job Service"]
        CandidateService["Candidate Service"]
        ApplicationService["Application Service"]
        PipelineService["Pipeline Service"]
        SchedulingService["Scheduling Service"]
        ReportingService["Reporting Service"]
        NotificationService["Notification Service"]
    end

    subgraph AIPlatformLayer["AI Platform Layer"]
        subgraph Ingestion["Document Ingestion"]
            ResumeQueue["Resume Queue"]
            ResumeParser["Resume Parser<br/>(OCR + NLP)"]
            ProfileEnricher["Profile Enricher"]
        end

        subgraph MLInference["ML Inference"]
            LLMCluster["LLM Serving Cluster<br/>(vLLM)"]
            EmbeddingService["Embedding Service<br/>(BGE/E5)"]
            ScoringEngine["Scoring Engine"]
        end

        subgraph Matching["Matching Engine"]
            VectorSearch["Vector Search"]
            HybridRanker["Hybrid Ranker<br/>(Vector + Rules)"]
            BiasDetector["Bias Detector"]
        end

        subgraph Explainability["Explainability"]
            ExplainEngine["Explain Engine<br/>(SHAP/LIME)"]
            CitationGen["Citation Generator"]
        end
    end

    subgraph DataLayer["Data Layer"]
        subgraph PrimaryData["Primary Data Stores"]
            ATSDatabase[("ATS Database<br/>(PostgreSQL)")]
            EventStore[("Event Store<br/>(Kafka)")]
            DocumentStore[("Document Store<br/>(Object Storage)")]
        end

        subgraph AIData["AI Data Stores"]
            VectorDB[("Vector Database<br/>(Milvus)")]
            ModelRegistry[("Model Registry")]
            FeatureStore[("Feature Store")]
        end

        subgraph AnalyticsData["Analytics Data"]
            AnalyticsDB[("Analytics DB<br/>(ClickHouse)")]
            AuditLog[("Audit Log<br/>(Immutable)")]
            FairnessStore[("Fairness Metrics<br/>Store")]
        end
    end

    subgraph ComplianceLayer["Compliance Layer"]
        ConsentManager["Consent Manager"]
        DataResidencyRouter["Data Residency<br/>Router"]
        AuditService["Audit Service"]
        FairnessReporter["Fairness Reporter"]
        DeletionService["Deletion Service<br/>(GDPR/CCPA)"]
    end

    subgraph ExternalIntegrations["External Integrations"]
        JobBoards["Job Boards<br/>(Indeed, LinkedIn)"]
        HRIS["HRIS Systems<br/>(Workday, SAP)"]
        CalendarAPI["Calendar APIs<br/>(Google, Outlook)"]
        BackgroundCheck["Background Check<br/>Providers"]
    end

    %% Client connections
    ClientLayer --> EdgeLayer
    EdgeLayer --> LoadBalancer
    LoadBalancer --> APIGateway

    %% Gateway flow
    APIGateway --> AuthService
    APIGateway --> RateLimiter
    APIGateway --> TenantRouter
    TenantRouter --> ATSServiceLayer
    TenantRouter --> AIPlatformLayer

    %% Service to Data
    ATSServiceLayer --> PrimaryData
    ATSServiceLayer --> EventStore

    %% AI Platform flow
    ResumeQueue --> ResumeParser
    ResumeParser --> ProfileEnricher
    ProfileEnricher --> EmbeddingService
    EmbeddingService --> VectorDB

    ScoringEngine --> LLMCluster
    ScoringEngine --> VectorSearch
    VectorSearch --> VectorDB
    ScoringEngine --> BiasDetector
    BiasDetector --> ExplainEngine

    %% Compliance
    ATSServiceLayer --> ComplianceLayer
    AIPlatformLayer --> AuditService
    BiasDetector --> FairnessReporter

    %% External
    ATSServiceLayer --> ExternalIntegrations

    %% Styling
    style AIPlatformLayer fill:#e8f5e9
    style ComplianceLayer fill:#fff3e0
    style DataLayer fill:#e3f2fd
```

---

## Data Flow Diagrams

### Resume Upload & Processing Flow

```mermaid
sequenceDiagram
    participant C as Candidate
    participant API as API Gateway
    participant CS as Candidate Service
    participant Q as Resume Queue
    participant RP as Resume Parser
    participant ES as Embedding Service
    participant VDB as Vector DB
    participant DB as ATS Database
    participant AL as Audit Log

    C->>API: Upload resume (PDF)
    API->>CS: POST /candidates/resume
    CS->>DB: Create candidate record (pending)
    CS->>Q: Enqueue resume job
    CS-->>C: 202 Accepted (job_id)

    Q->>RP: Dequeue resume
    RP->>RP: OCR (if scanned)
    RP->>RP: Layout detection
    RP->>RP: NLP entity extraction
    RP->>RP: Normalize to schema
    RP->>DB: Update candidate profile

    RP->>ES: Generate embeddings
    ES->>ES: Encode skills (1024-dim)
    ES->>ES: Encode experience (1024-dim)
    ES->>ES: Encode education (1024-dim)
    ES->>VDB: Store embeddings

    RP->>DB: Mark profile complete
    RP->>AL: Log processing event

    Note over C,AL: Candidate can track status via job_id
```

### AI Scoring & Matching Flow

```mermaid
sequenceDiagram
    participant R as Recruiter
    participant API as API Gateway
    participant MS as Matching Service
    participant VDB as Vector DB
    participant SE as Scoring Engine
    participant LLM as LLM Cluster
    participant BD as Bias Detector
    participant EE as Explain Engine
    participant DB as ATS Database
    participant AL as Audit Log

    R->>API: GET /jobs/{id}/ranked-candidates
    API->>MS: Fetch candidates for job

    MS->>VDB: Query similar candidates
    Note over MS,VDB: ANN search (HNSW)<br/>Returns top-K candidates

    loop For each candidate
        MS->>SE: Score candidate
        SE->>SE: Calculate skill match score
        SE->>SE: Calculate experience score
        SE->>LLM: Assess culture fit signals
        SE->>SE: Calculate trajectory score
        SE->>SE: Weighted aggregation

        SE->>BD: Check for bias
        BD->>BD: Compare against protected class stats
        BD->>BD: Calculate disparate impact ratio

        alt Bias detected
            BD->>SE: Flag for review
            SE->>SE: Apply debiasing adjustment
        end

        SE->>EE: Generate explanation
        EE->>EE: SHAP feature attribution
        EE->>EE: Generate citations
    end

    MS->>DB: Store scores & explanations
    MS->>AL: Log scoring decisions
    MS-->>R: Return ranked list with explanations
```

### Conversational Scheduling Flow

```mermaid
sequenceDiagram
    participant C as Candidate
    participant Chat as Chat Interface
    participant Conv as Conversational AI
    participant LLM as LLM Cluster
    participant SS as Scheduling Service
    participant Cal as Calendar API
    participant DB as ATS Database
    participant N as Notification Service

    C->>Chat: "I'm available Tuesday afternoon"
    Chat->>Conv: Process message
    Conv->>LLM: Parse intent & slots
    LLM-->>Conv: {intent: schedule, day: Tuesday, time: afternoon}

    Conv->>SS: Find available slots
    SS->>Cal: Query interviewer availability
    Cal-->>SS: Available: 2pm, 3pm, 4pm
    SS-->>Conv: Return options

    Conv->>LLM: Generate response
    LLM-->>Conv: "Great! I have Tuesday at 2pm, 3pm, or 4pm. Which works best?"
    Conv-->>C: Display options

    C->>Chat: "3pm works"
    Chat->>Conv: Process selection
    Conv->>SS: Book slot
    SS->>Cal: Create calendar event
    SS->>DB: Update application stage
    SS->>N: Send confirmations

    Conv->>LLM: Generate confirmation
    LLM-->>Conv: "You're all set for Tuesday at 3pm..."
    Conv-->>C: Confirmation message
```

---

## Key Architectural Decisions

### Decision 1: Self-Hosted LLM vs External API

| Option | Pros | Cons |
|--------|------|------|
| **Self-Hosted (Chosen)** | Data never leaves system, GDPR compliant, customizable, predictable costs | High GPU infrastructure cost, operational complexity |
| External API (OpenAI, etc.) | Easy to start, no infrastructure, latest models | Data transmission concerns, compliance risk, variable costs, explainability challenges |

**Decision:** Self-hosted LLM infrastructure using vLLM

**Rationale:**
1. Candidate PII must not be transmitted to external services
2. GDPR Article 22 requires explainability for automated decisions
3. NYC Law 144 requires bias audits - need full control over model
4. Enterprise customers demand data sovereignty
5. Predictable costs at scale vs. per-token pricing

### Decision 2: Vector Database Selection

| Option | Pros | Cons |
|--------|------|------|
| **Milvus (Chosen)** | Open-source, horizontal scaling, hybrid search | Operational complexity |
| Pinecone | Managed, easy scaling | Data residency concerns, vendor lock-in |
| Qdrant | Fast, good filtering | Smaller ecosystem |
| PostgreSQL pgvector | Unified database | Limited scale, basic ANN |

**Decision:** Milvus for vector storage with PostgreSQL for metadata

**Rationale:**
1. Need to scale to 100M+ vectors across tenants
2. Hybrid search (vector + metadata filters) required
3. Open-source enables self-hosting for compliance
4. Strong filtering support for tenant isolation

### Decision 3: Event-Driven vs Request-Response

| Pattern | Use Case | Rationale |
|---------|----------|-----------|
| **Event-Driven** | Resume processing, scoring, analytics | Async processing, audit trail, decoupling |
| **Request-Response** | Search, profile retrieval, UI operations | Low latency required, synchronous need |

**Decision:** Hybrid architecture - event-driven for AI pipeline, request-response for core ATS

```
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EVENT-DRIVEN PATH (Async)         REQUEST-RESPONSE (Sync)      │
│  ─────────────────────────         ───────────────────────      │
│  • Resume upload → parse           • Candidate search           │
│  • Parse complete → embed          • Profile retrieval          │
│  • Embed complete → index          • Application status         │
│  • Score request → AI scoring      • Dashboard data             │
│  • Score complete → store          • Real-time chat responses   │
│  • Any mutation → audit log                                     │
│                                                                 │
│  Benefits:                         Benefits:                    │
│  • Decoupled processing            • Low latency                │
│  • Retry on failure                • Immediate feedback         │
│  • Complete audit trail            • Simpler client logic       │
│  • Scale AI independently                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Decision 4: Multi-Tenancy Model

| Option | Pros | Cons |
|--------|------|------|
| **Shared DB, Row-Level Isolation (Chosen)** | Cost efficient, simpler ops | Noisy neighbor risk, compliance complexity |
| Database per tenant | Strong isolation, easier compliance | High cost, operational burden |
| Schema per tenant | Good isolation, moderate cost | Migration complexity, connection pooling |

**Decision:** Shared database with row-level tenant isolation + tenant-specific encryption

**Implementation:**
- All tables include `tenant_id` column
- Row-level security (RLS) policies enforce isolation
- Tenant-specific data encryption keys (DEKs)
- Master encryption key per region (KEK in HSM)
- Option for dedicated infrastructure for enterprise tier

### Decision 5: CQRS for Analytics

```mermaid
flowchart LR
    subgraph WriteModel["Write Model (Transactional)"]
        Commands["Commands<br/>(Create, Update, Delete)"]
        EventStore["Event Store"]
        ATSDatabase["ATS Database<br/>(PostgreSQL)"]
    end

    subgraph ReadModel["Read Model (Analytics)"]
        Projector["Event Projector"]
        AnalyticsDB["Analytics DB<br/>(ClickHouse)"]
        FairnessMetrics["Fairness Metrics"]
        SearchIndex["Search Index<br/>(Elasticsearch)"]
    end

    Commands --> EventStore
    Commands --> ATSDatabase
    EventStore --> Projector
    Projector --> AnalyticsDB
    Projector --> FairnessMetrics
    Projector --> SearchIndex

    style WriteModel fill:#e3f2fd
    style ReadModel fill:#e8f5e9
```

**Rationale:**
- Hiring analytics are read-heavy, distinct from transactional ATS
- Fairness metrics require aggregations across all decisions
- Search needs denormalized index for fast queries
- Event replay enables recalculation of historical metrics

---

## Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---------|----------|---------------|
| **Sync vs Async** | Hybrid | Sync for UI, async for AI processing |
| **Event-driven vs Request-response** | Event-driven AI pipeline | Audit trail, decoupling, retry |
| **Push vs Pull** | Pull for rankings, Push for notifications | Recruiters pull rankings, candidates receive push notifications |
| **Stateless vs Stateful** | Stateless services, stateful data stores | Horizontal scaling, session in JWT |
| **Read-heavy vs Write-heavy** | Read-heavy (100:1) | Heavy search/view, optimize read path |
| **Real-time vs Batch** | Real-time scoring, batch analytics | Immediate scoring, periodic reports |
| **Edge vs Origin** | Edge for assets + search cache | Reduce latency for global users |

---

## Component Responsibilities

### ATS Service Layer

| Service | Responsibility | Key Operations |
|---------|----------------|----------------|
| **Job Service** | Job lifecycle management | Create, publish, close, archive jobs |
| **Candidate Service** | Candidate profile management | CRUD, deduplication, consent tracking |
| **Application Service** | Application state machine | Apply, advance, reject, withdraw |
| **Pipeline Service** | Workflow orchestration | Stage transitions, automation triggers |
| **Scheduling Service** | Interview coordination | Availability, booking, reminders |
| **Reporting Service** | Analytics and compliance reports | EEOC reports, bias audits, funnels |
| **Notification Service** | Multi-channel notifications | Email, SMS, push, in-app |

### AI Platform Layer

| Component | Responsibility | Key Operations |
|-----------|----------------|----------------|
| **Resume Parser** | Document to structured data | OCR, NLP extraction, normalization |
| **Embedding Service** | Vector encoding | Skills, experience, education embeddings |
| **LLM Cluster** | Language model inference | Culture fit, explanation generation |
| **Scoring Engine** | Multi-dimensional scoring | Aggregate scores with explainability |
| **Bias Detector** | Fairness monitoring | Disparate impact, demographic parity |
| **Explain Engine** | Decision transparency | SHAP attribution, citation generation |

### Compliance Layer

| Component | Responsibility | Key Operations |
|-----------|----------------|----------------|
| **Consent Manager** | Candidate consent tracking | Collect, update, withdraw consent |
| **Data Residency Router** | Geographic data routing | Route EU data to EU, etc. |
| **Audit Service** | Immutable decision logging | Record all AI decisions with context |
| **Fairness Reporter** | Bias audit generation | NYC Law 144 reports, EEOC reports |
| **Deletion Service** | Data deletion workflows | GDPR/CCPA deletion requests |

---

## Integration Architecture

### External System Integrations

```mermaid
flowchart LR
    subgraph ATS["AI Native ATS"]
        IntegrationHub["Integration Hub"]
    end

    subgraph JobDistribution["Job Distribution"]
        Indeed["Indeed"]
        LinkedIn["LinkedIn"]
        Glassdoor["Glassdoor"]
        CareerSite["Career Site"]
    end

    subgraph HRIS["HR Systems"]
        Workday["Workday"]
        SAP["SAP SuccessFactors"]
        Oracle["Oracle HCM"]
        BambooHR["BambooHR"]
    end

    subgraph Calendar["Calendaring"]
        Google["Google Calendar"]
        Outlook["Outlook/O365"]
        Calendly["Calendly"]
    end

    subgraph Assessment["Assessment"]
        HireVue["HireVue"]
        Codility["Codility"]
        HackerRank["HackerRank"]
    end

    subgraph BackgroundCheck["Background Check"]
        Checkr["Checkr"]
        Sterling["Sterling"]
        GoodHire["GoodHire"]
    end

    IntegrationHub <--> JobDistribution
    IntegrationHub <--> HRIS
    IntegrationHub <--> Calendar
    IntegrationHub <--> Assessment
    IntegrationHub <--> BackgroundCheck
```

### Integration Patterns

| Integration Type | Pattern | Protocol |
|------------------|---------|----------|
| **Job Boards** | Push (job posting), Pull (applications) | REST API, XML feeds |
| **HRIS** | Bidirectional sync | REST API, SFTP, webhooks |
| **Calendar** | OAuth2 + Calendar API | Google/Microsoft Graph API |
| **Assessment** | Webhooks for results | REST API + webhooks |
| **Background Check** | Async request/response | REST API + webhooks |

---

## Deployment Architecture

### Multi-Region Deployment

```mermaid
flowchart TB
    subgraph Global["Global Layer"]
        GlobalLB["Global Load Balancer<br/>(GeoDNS)"]
        CDN["Global CDN"]
    end

    subgraph USRegion["US Region (Primary)"]
        USLB["Regional LB"]
        USServices["ATS Services"]
        USAI["AI Platform<br/>(GPU Cluster)"]
        USDB[("Primary DB")]
        USVector[("Vector DB")]
    end

    subgraph EURegion["EU Region (GDPR)"]
        EULB["Regional LB"]
        EUServices["ATS Services"]
        EUAI["AI Platform<br/>(GPU Cluster)"]
        EUDB[("EU DB<br/>(Isolated)")]
        EUVector[("Vector DB")]
    end

    subgraph APACRegion["APAC Region"]
        APACLB["Regional LB"]
        APACServices["ATS Services"]
        APACReadReplica[("Read Replica")]
    end

    GlobalLB --> USLB
    GlobalLB --> EULB
    GlobalLB --> APACLB

    USLB --> USServices
    USServices --> USAI
    USServices --> USDB
    USAI --> USVector

    EULB --> EUServices
    EUServices --> EUAI
    EUServices --> EUDB
    EUAI --> EUVector

    APACLB --> APACServices
    APACServices --> APACReadReplica

    USDB -.->|"Async Replication<br/>(Non-EU data only)"| APACReadReplica

    style EURegion fill:#fff3e0
```

### Data Residency Rules

| Data Type | EU Candidate | US Candidate | APAC Candidate |
|-----------|--------------|--------------|----------------|
| **Profile data** | EU only | US primary | US primary |
| **Resumes** | EU only | US primary | US primary |
| **AI embeddings** | EU only | US primary | US primary |
| **Audit logs** | EU only | US primary | US primary |
| **Analytics (anonymized)** | Global | Global | Global |

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React, TypeScript | Recruiter/candidate portals |
| **API Gateway** | Kong/Envoy | Routing, auth, rate limiting |
| **Services** | Go / Node.js | Stateless microservices |
| **Event Bus** | Kafka | Event streaming, audit |
| **Primary DB** | PostgreSQL | Transactional data |
| **Vector DB** | Milvus | Embedding storage/search |
| **Analytics DB** | ClickHouse | OLAP, reporting |
| **LLM Serving** | vLLM | Self-hosted inference |
| **Embeddings** | BGE-large | Text encoding |
| **Object Storage** | MinIO / Cloud Storage | Resumes, documents |
| **Cache** | Redis | Session, hot data |
| **Search** | Elasticsearch | Full-text search |

---

## Capacity Planning Summary

| Component | Scale Target | Scaling Strategy |
|-----------|--------------|------------------|
| **API Services** | 120 QPS peak | Horizontal auto-scaling |
| **GPU Cluster** | 26 scoring QPS | GPU pool with queue management |
| **Vector DB** | 100M vectors | Sharded by tenant hash |
| **Primary DB** | 5M candidates/year | Read replicas, eventual sharding |
| **Event Bus** | 100K events/hour | Partitioned by tenant |
