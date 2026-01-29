# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        direction LR
        WebApp["Web App<br/>(Editor UI)"]
        API["REST/GraphQL<br/>API"]
        CMS["CMS Connectors<br/>(Contentful, Sanity)"]
        Git["Git Connectors<br/>(GitHub, GitLab)"]
        SDK["SDKs<br/>(Python, JS)"]
    end

    subgraph Gateway["API Gateway Layer"]
        LB["Load Balancer"]
        AuthN["Authentication<br/>(OAuth2/OIDC)"]
        RateLimit["Rate<br/>Limiter"]
        Router["Request<br/>Router"]
    end

    subgraph Ingestion["Content Ingestion"]
        FileParser["File Parser<br/>(XLIFF, JSON, PO)"]
        Segmenter["Sentence<br/>Segmenter"]
        Extractor["String<br/>Extractor"]
        Preprocessor["Text<br/>Preprocessor"]
    end

    subgraph TMLookup["Translation Memory Layer"]
        TMCache["TM Cache<br/>(Redis)"]
        TMService["TM Query<br/>Service"]
        TMStore[("TM Store<br/>(Postgres + pgvector)")]
        FuzzyMatch["Fuzzy Match<br/>Engine"]
    end

    subgraph EngineLayer["Translation Engine Layer"]
        EngineRouter["Engine<br/>Router"]
        NMTPool["NMT Engine<br/>Pool"]
        LLMService["LLM Translation<br/>Service"]
        QEService["Quality Estimation<br/>Service"]
    end

    subgraph NMTEngines["NMT Engines"]
        direction LR
        LW["Language<br/>Weaver"]
        DeepL["DeepL"]
        GoogleNMT["Google<br/>NMT"]
        CustomNMT["Custom<br/>NMT"]
    end

    subgraph LLMEngines["LLM Providers"]
        direction LR
        GPT["GPT-4"]
        Claude["Claude"]
        Gemini["Gemini"]
    end

    subgraph Terminology["Terminology Layer"]
        GlossaryService["Glossary<br/>Service"]
        GlossaryDB[("Glossary<br/>Database")]
        BrandVoice["Brand Voice<br/>Analyzer"]
        StyleGuide["Style Guide<br/>Enforcer"]
    end

    subgraph HumanWorkflow["Human Workflow Layer"]
        JobQueue["Job<br/>Queue"]
        AssignmentEngine["Assignment<br/>Engine"]
        MTPEWorkbench["MTPE<br/>Workbench"]
        ReviewManager["Review<br/>Manager"]
        FeedbackCollector["Feedback<br/>Collector"]
    end

    subgraph Learning["Adaptive Learning"]
        EditAggregator["Edit<br/>Aggregator"]
        FineTuner["Incremental<br/>Fine-Tuner"]
        TMUpdater["TM<br/>Updater"]
        ModelRegistry["Model<br/>Registry"]
    end

    subgraph Delivery["Delivery Layer"]
        JobStore[("Job Store<br/>(Postgres)")]
        WebhookEngine["Webhook<br/>Engine"]
        NotificationService["Notification<br/>Service"]
        ExportService["Export<br/>Service"]
    end

    subgraph Analytics["Analytics & Observability"]
        MetricsDB[("Metrics<br/>Store")]
        QualityDashboard["Quality<br/>Dashboard"]
        CostTracker["Cost<br/>Tracker"]
    end

    %% Client to Gateway
    Clients --> Gateway
    LB --> AuthN --> RateLimit --> Router

    %% Gateway to Ingestion
    Router --> Ingestion
    FileParser --> Segmenter --> Extractor --> Preprocessor

    %% Ingestion to TM
    Preprocessor --> TMCache
    TMCache -->|miss| TMService
    TMService --> TMStore
    TMService --> FuzzyMatch

    %% TM to Engine
    FuzzyMatch -->|no match| EngineRouter
    TMService -->|100% match| JobStore

    %% Engine Layer
    EngineRouter --> NMTPool
    EngineRouter --> LLMService
    NMTPool --> NMTEngines
    LLMService --> LLMEngines

    %% Engine to QE
    NMTPool --> QEService
    LLMService --> QEService

    %% Terminology Integration
    EngineRouter --> GlossaryService
    GlossaryService --> GlossaryDB
    GlossaryService --> BrandVoice
    GlossaryService --> StyleGuide

    %% QE to Routing
    QEService -->|high score| JobStore
    QEService -->|low score| JobQueue

    %% Human Workflow
    JobQueue --> AssignmentEngine --> MTPEWorkbench
    MTPEWorkbench --> ReviewManager
    ReviewManager --> FeedbackCollector
    ReviewManager --> JobStore

    %% Adaptive Learning
    FeedbackCollector --> EditAggregator
    EditAggregator --> FineTuner
    EditAggregator --> TMUpdater
    FineTuner --> ModelRegistry
    ModelRegistry --> NMTPool
    TMUpdater --> TMStore

    %% Delivery
    JobStore --> WebhookEngine
    JobStore --> NotificationService
    JobStore --> ExportService
    ExportService --> Clients

    %% Analytics
    QEService --> MetricsDB
    ReviewManager --> MetricsDB
    MetricsDB --> QualityDashboard
    MetricsDB --> CostTracker

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef ingestion fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef tm fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef engine fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef terminology fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef human fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef learning fill:#e1bee7,stroke:#7b1fa2,stroke-width:2px
    classDef delivery fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
    classDef analytics fill:#ffccbc,stroke:#d84315,stroke-width:2px

    class WebApp,API,CMS,Git,SDK client
    class LB,AuthN,RateLimit,Router gateway
    class FileParser,Segmenter,Extractor,Preprocessor ingestion
    class TMCache,TMService,TMStore,FuzzyMatch tm
    class EngineRouter,NMTPool,LLMService,QEService engine
    class GlossaryService,GlossaryDB,BrandVoice,StyleGuide terminology
    class JobQueue,AssignmentEngine,MTPEWorkbench,ReviewManager,FeedbackCollector human
    class EditAggregator,FineTuner,TMUpdater,ModelRegistry learning
    class JobStore,WebhookEngine,NotificationService,ExportService delivery
    class MetricsDB,QualityDashboard,CostTracker analytics
```

---

## Data Flow

### Translation Request Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Gateway as API Gateway
    participant Parser as File Parser
    participant TM as TM Service
    participant Router as Engine Router
    participant NMT as NMT Engine
    participant QE as QE Service
    participant Queue as MTPE Queue
    participant Editor as Human Editor
    participant Store as Job Store

    Client->>Gateway: Submit translation job
    Gateway->>Gateway: Authenticate & rate limit
    Gateway->>Parser: Parse file (XLIFF/JSON)
    Parser->>Parser: Segment into sentences

    loop For each segment
        Parser->>TM: Query TM (source text)
        alt 100% TM Match
            TM-->>Store: Use cached translation
        else Fuzzy Match (>70%)
            TM-->>Router: Return fuzzy match + suggest edit
            Router->>Router: Apply fuzzy match as base
        else No Match
            TM-->>Router: No TM hit
        end

        Router->>Router: Select engine (NMT vs LLM)
        alt NMT Selected
            Router->>NMT: Translate with terminology
            NMT-->>QE: MT output
        else LLM Selected
            Router->>NMT: Translate with context
            NMT-->>QE: MT output
        end

        QE->>QE: Score translation (COMET)
        alt QE Score > 0.85
            QE-->>Store: Auto-approve
        else QE Score < 0.85
            QE-->>Queue: Route to human
            Queue->>Editor: Assign for MTPE
            Editor->>Editor: Post-edit translation
            Editor-->>Store: Submit edited translation
        end
    end

    Store->>Store: Assemble translated file
    Store-->>Client: Webhook: Job complete
    Client->>Gateway: Download translated file
```

### Engine Routing Decision Flow

```mermaid
flowchart TB
    Start["Segment<br/>Received"] --> TMCheck{"TM<br/>Match?"}

    TMCheck -->|100%| UseTM["Use TM<br/>Translation"]
    TMCheck -->|70-99%| FuzzyDecision{"Edit Distance<br/>> Threshold?"}
    TMCheck -->|<70%| ContentType{"Content<br/>Type?"}

    FuzzyDecision -->|Small edits| UseFuzzy["Use Fuzzy +<br/>Light MTPE"]
    FuzzyDecision -->|Large edits| ContentType

    ContentType -->|Technical| TechCheck{"Domain-Specific<br/>NMT Available?"}
    ContentType -->|Creative| LLMPath["Use LLM<br/>Translation"]
    ContentType -->|Legal/Medical| SpecializedPath["Specialized NMT +<br/>Full MTPE"]
    ContentType -->|UI Strings| NMTPath["Use General<br/>NMT"]

    TechCheck -->|Yes| DomainNMT["Use Domain<br/>NMT"]
    TechCheck -->|No| NMTPath

    UseTM --> QEScore
    UseFuzzy --> QEScore
    LLMPath --> QEScore
    SpecializedPath --> QEScore
    NMTPath --> QEScore
    DomainNMT --> QEScore

    QEScore{"QE Score"}
    QEScore -->|">0.85"| AutoApprove["Auto-Approve"]
    QEScore -->|"0.70-0.85"| LightMTPE["Light MTPE"]
    QEScore -->|"<0.70"| FullMTPE["Full MTPE"]
    QEScore -->|"<0.50"| Retranslate["Re-translate<br/>with LLM"]

    classDef start fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef nmt fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef llm fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef human fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef qe fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class Start start
    class TMCheck,FuzzyDecision,ContentType,TechCheck,QEScore decision
    class UseTM,UseFuzzy,NMTPath,DomainNMT nmt
    class LLMPath,SpecializedPath llm
    class AutoApprove,LightMTPE,FullMTPE,Retranslate human
```

---

## Key Architectural Decisions

### 1. Microservices vs Monolith

| Decision | Choice | Justification |
|----------|--------|---------------|
| **Architecture** | Microservices | Independent scaling of MT/QE/TM, different tech stacks for engines |
| **Communication** | Sync (API) + Async (Queue) | Real-time translation + async human workflow |
| **Service Boundaries** | By domain capability | TM Service, Engine Service, QE Service, Workflow Service |

**Rationale:** Translation platform has clearly separable concerns with different scaling needs:
- TM needs read-heavy optimization
- NMT needs GPU scaling
- Human workflow needs stateful orchestration

### 2. Synchronous vs Asynchronous

| Flow | Pattern | Justification |
|------|---------|---------------|
| TM Lookup | Synchronous | Sub-100ms requirement, critical path |
| MT Translation | Synchronous (with timeout) | Part of request flow, bounded latency |
| Human MTPE | Asynchronous | Unbounded human time, webhook completion |
| Adaptive Learning | Asynchronous | Batch aggregation, non-critical path |
| Webhook Delivery | Asynchronous | Fire-and-forget with retry |

### 3. Database Choices

| Data Type | Database | Justification |
|-----------|----------|---------------|
| **Translation Memory** | Postgres + pgvector | Structured segments + vector similarity for fuzzy match |
| **Job/Project State** | Postgres | ACID transactions, complex queries |
| **TM Cache** | Redis | Sub-10ms exact match lookups |
| **QE Scores** | TimescaleDB | Time-series analytics, retention policies |
| **Glossary** | Postgres | Relational with full-text search |
| **File Storage** | Object Storage (S3-compatible) | Large files, lifecycle management |
| **Session State** | Redis | Editor sessions, real-time collaboration |

### 4. Multi-Engine Strategy

```mermaid
flowchart LR
    subgraph Engines["Engine Pool"]
        NMT1["NMT Engine 1<br/>(Language Weaver)"]
        NMT2["NMT Engine 2<br/>(DeepL)"]
        NMT3["NMT Engine 3<br/>(Custom)"]
        LLM1["LLM 1<br/>(GPT-4)"]
        LLM2["LLM 2<br/>(Claude)"]
    end

    subgraph Router["Smart Router"]
        Classifier["Content<br/>Classifier"]
        QualityPredictor["Quality<br/>Predictor"]
        CostOptimizer["Cost<br/>Optimizer"]
        ABTest["A/B Test<br/>Selector"]
    end

    subgraph Selection["Selection Logic"]
        Rule1["Technical → NMT1"]
        Rule2["Creative → LLM1"]
        Rule3["Budget → DeepL"]
        Rule4["Experiment → Random"]
    end

    Classifier --> Selection
    QualityPredictor --> Selection
    CostOptimizer --> Selection
    ABTest --> Selection

    Selection --> Engines

    classDef router fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef engine fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef selection fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class Classifier,QualityPredictor,CostOptimizer,ABTest router
    class NMT1,NMT2,NMT3,LLM1,LLM2 engine
    class Rule1,Rule2,Rule3,Rule4 selection
```

**Decision:** Multi-engine with intelligent routing
- **Why not single engine?** Different engines excel at different content types
- **Selection criteria:** Content type, domain, quality requirement, cost budget, A/B testing

### 5. Caching Strategy

| Cache Layer | Purpose | TTL | Invalidation |
|-------------|---------|-----|--------------|
| **CDN (Edge)** | Static assets, exported files | 24h | On file update |
| **API Response Cache** | Repeated TM queries | 1h | On TM update |
| **TM Cache (Redis)** | Exact match lookups | Indefinite | On segment update |
| **QE Model Cache** | Model weights | On deploy | Model update |
| **LLM Response Cache** | Repeated prompts | 7d | TTL-based |

### 6. Message Queue Usage

| Queue | Purpose | Pattern | Ordering |
|-------|---------|---------|----------|
| **translation-jobs** | Async job processing | Work queue | Per-project FIFO |
| **mtpe-assignments** | Human task routing | Fan-out | Priority-based |
| **webhook-delivery** | Completion notifications | At-least-once | Per-customer |
| **learning-events** | Feedback aggregation | Stream | Time-ordered |
| **tm-updates** | TM replication | Pub/sub | Causal |

---

## Architecture Pattern Checklist

- [x] **Sync vs Async:** Hybrid - sync for translation, async for human workflow
- [x] **Event-driven vs Request-response:** Event-driven for learning, request-response for translation
- [x] **Push vs Pull:** Push for webhooks, pull for human task claiming
- [x] **Stateless vs Stateful:** Stateless API, stateful editor sessions
- [x] **Read-heavy vs Write-heavy:** TM is read-heavy, job store is write-heavy
- [x] **Real-time vs Batch:** Real-time translation, batch adaptive learning
- [x] **Edge vs Origin:** Origin-only (no edge translation caching due to personalization)

---

## Component Interactions

### Translation Memory Integration

```mermaid
flowchart TB
    subgraph Query["TM Query Flow"]
        Source["Source Text"]
        Preprocess["Normalize &<br/>Tokenize"]
        HashLookup["Exact Hash<br/>Lookup"]
        VectorSearch["Vector Similarity<br/>Search"]
        RankResults["Rank & Filter<br/>Results"]
    end

    subgraph Storage["TM Storage"]
        HashIndex[("Hash<br/>Index")]
        VectorIndex[("Vector<br/>Index")]
        SegmentStore[("Segment<br/>Store")]
    end

    subgraph Results["Results"]
        Exact["100% Match"]
        Fuzzy["Fuzzy Matches<br/>(70-99%)"]
        None["No Match"]
    end

    Source --> Preprocess
    Preprocess --> HashLookup
    HashLookup --> HashIndex
    HashIndex -->|hit| Exact
    HashIndex -->|miss| VectorSearch
    VectorSearch --> VectorIndex
    VectorIndex --> RankResults
    RankResults --> SegmentStore
    SegmentStore -->|matches| Fuzzy
    SegmentStore -->|no matches| None

    classDef query fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef result fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class Source,Preprocess,HashLookup,VectorSearch,RankResults query
    class HashIndex,VectorIndex,SegmentStore storage
    class Exact,Fuzzy,None result
```

### Terminology Enforcement

```mermaid
flowchart LR
    subgraph Input["Input"]
        Source["Source Text"]
        TermDB[("Glossary")]
    end

    subgraph Detection["Term Detection"]
        NER["Named Entity<br/>Recognition"]
        TermMatch["Glossary<br/>Matching"]
    end

    subgraph Enforcement["Enforcement"]
        ConstrainedDecode["Constrained<br/>Decoding"]
        PostProcess["Post-Process<br/>Replacement"]
        LLMPrompt["LLM Prompt<br/>Injection"]
    end

    subgraph Output["Output"]
        Target["Translation with<br/>Correct Terms"]
    end

    Source --> NER
    Source --> TermMatch
    TermDB --> TermMatch
    NER --> ConstrainedDecode
    TermMatch --> ConstrainedDecode
    TermMatch --> PostProcess
    TermMatch --> LLMPrompt
    ConstrainedDecode --> Target
    PostProcess --> Target
    LLMPrompt --> Target

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef detect fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef enforce fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef output fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class Source,TermDB input
    class NER,TermMatch detect
    class ConstrainedDecode,PostProcess,LLMPrompt enforce
    class Target output
```

---

## Multi-Region Architecture

```mermaid
flowchart TB
    subgraph US["US Region"]
        USLB["Load<br/>Balancer"]
        USApi["API<br/>Servers"]
        USNMT["NMT<br/>Cluster"]
        USTM[("TM<br/>Primary")]
    end

    subgraph EU["EU Region"]
        EULB["Load<br/>Balancer"]
        EUApi["API<br/>Servers"]
        EUNMT["NMT<br/>Cluster"]
        EUTM[("TM<br/>Replica")]
    end

    subgraph APAC["APAC Region"]
        APACLB["Load<br/>Balancer"]
        APACApi["API<br/>Servers"]
        APACNMT["NMT<br/>Cluster"]
        APACTM[("TM<br/>Replica")]
    end

    subgraph Global["Global Services"]
        GlobalLB["Global<br/>Load Balancer"]
        LLMGateway["LLM Gateway<br/>(Centralized)"]
        ModelRegistry["Model<br/>Registry"]
    end

    GlobalLB --> USLB
    GlobalLB --> EULB
    GlobalLB --> APACLB

    USLB --> USApi --> USNMT
    EULB --> EUApi --> EUNMT
    APACLB --> APACApi --> APACNMT

    USApi --> USTM
    EUApi --> EUTM
    APACApi --> APACTM

    USApi --> LLMGateway
    EUApi --> LLMGateway
    APACApi --> LLMGateway

    USTM <-->|"Async Replication"| EUTM
    USTM <-->|"Async Replication"| APACTM

    ModelRegistry --> USNMT
    ModelRegistry --> EUNMT
    ModelRegistry --> APACNMT

    classDef us fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef eu fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef apac fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef global fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class USLB,USApi,USNMT,USTM us
    class EULB,EUApi,EUNMT,EUTM eu
    class APACLB,APACApi,APACNMT,APACTM apac
    class GlobalLB,LLMGateway,ModelRegistry global
```

**Design Decisions:**
- **TM Replication:** Async replication from US primary to EU/APAC replicas
- **NMT:** Each region has local GPU clusters for latency
- **LLM:** Centralized gateway (API calls to providers are already global)
- **Data Residency:** EU data stays in EU region (GDPR compliance)

---

## Technology Stack Summary

| Layer | Technology | Alternative |
|-------|------------|-------------|
| **API Gateway** | Kong / AWS API Gateway | Traefik, Envoy |
| **Application** | Python (FastAPI) / Go | Node.js, Java |
| **NMT Inference** | NVIDIA Triton | TorchServe, TensorFlow Serving |
| **LLM Gateway** | Custom / Portkey | LiteLLM |
| **TM Database** | Postgres + pgvector | Elasticsearch |
| **Cache** | Redis Cluster | Memcached |
| **Job Queue** | Kafka / RabbitMQ | SQS, Redis Streams |
| **Workflow Engine** | Temporal | Airflow, Prefect |
| **Object Storage** | S3-compatible | MinIO, GCS |
| **Monitoring** | Prometheus + Grafana | Datadog |
| **Tracing** | Jaeger / OpenTelemetry | Zipkin |
