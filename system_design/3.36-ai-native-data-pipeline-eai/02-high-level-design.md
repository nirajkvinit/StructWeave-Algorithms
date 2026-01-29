# High-Level Design

## Architecture Overview

The AI-Native Data Pipeline follows a five-layer architecture that separates concerns while enabling AI capabilities to permeate each layer. The design prioritizes autonomous operation, self-healing, and intelligent data quality management.

```mermaid
flowchart TB
    subgraph External["External Systems"]
        direction LR
        RDBMS[(Relational<br/>Databases)]
        NoSQL[(NoSQL<br/>Stores)]
        APIs[REST/GraphQL<br/>APIs]
        Files[Files<br/>(S3/GCS)]
        Streams[Event<br/>Streams]
        SaaS[SaaS<br/>Apps]
    end

    subgraph Layer1["Layer 1: Ingestion"]
        direction TB
        ConnectorMgr["Connector<br/>Manager"]
        AIConnGen["AI Connector<br/>Generator"]
        SchemaDisc["Schema<br/>Discovery"]
        CDCEngine["CDC<br/>Engine"]
        BatchPuller["Batch<br/>Puller"]
    end

    subgraph Layer2["Layer 2: AI Processing"]
        direction TB
        SchemaMapper["AI Schema<br/>Mapper"]
        TransformGen["NL-to-SQL<br/>Generator"]
        LLMEnricher["LLM<br/>Enricher"]
        QualityEngine["Quality<br/>Engine"]
    end

    subgraph Layer3["Layer 3: Orchestration"]
        direction TB
        DAGCompiler["DAG<br/>Compiler"]
        Scheduler["Pipeline<br/>Scheduler"]
        SelfHealCtrl["Self-Healing<br/>Controller"]
        AnomalyEngine["Anomaly<br/>Engine"]
    end

    subgraph Layer4["Layer 4: Storage"]
        direction TB
        subgraph Medallion["Medallion Architecture"]
            Bronze[("Bronze<br/>(Raw)")]
            Silver[("Silver<br/>(Clean)")]
            Gold[("Gold<br/>(Curated)")]
        end
        MetaCatalog[("Metadata<br/>Catalog")]
        LineageStore[("Lineage<br/>Graph")]
    end

    subgraph Layer5["Layer 5: Observability"]
        direction TB
        QualityMon["Quality<br/>Monitors"]
        PipelineMon["Pipeline<br/>Monitors"]
        CostTracker["Cost<br/>Tracker"]
        AlertMgr["Alert<br/>Manager"]
    end

    subgraph Consumers["Data Consumers"]
        direction LR
        BI[BI Tools]
        Analytics[Analytics]
        MLPlatform[ML Platform]
        AIAgents[AI Agents]
        ReverseETL[Reverse<br/>ETL]
    end

    External --> Layer1
    Layer1 --> Layer2
    Layer2 --> Layer3
    Layer3 --> Layer4
    Layer4 --> Consumers

    Layer3 --> Layer5
    Layer4 --> Layer5
    Layer5 -.->|Feedback| Layer3

    classDef external fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef layer1 fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef layer2 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef layer3 fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef layer4 fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef layer5 fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef consumer fill:#fce4ec,stroke:#880e4f,stroke-width:2px

    class RDBMS,NoSQL,APIs,Files,Streams,SaaS external
    class ConnectorMgr,AIConnGen,SchemaDisc,CDCEngine,BatchPuller layer1
    class SchemaMapper,TransformGen,LLMEnricher,QualityEngine layer2
    class DAGCompiler,Scheduler,SelfHealCtrl,AnomalyEngine layer3
    class Bronze,Silver,Gold,MetaCatalog,LineageStore layer4
    class QualityMon,PipelineMon,CostTracker,AlertMgr layer5
    class BI,Analytics,MLPlatform,AIAgents,ReverseETL consumer
```

---

## Layer Details

### Layer 1: Ingestion Layer

| Component | Responsibility | Key Features |
|-----------|----------------|--------------|
| **Connector Manager** | Manage source connections | Connection pooling, credential management, health monitoring |
| **AI Connector Generator** | Generate connectors from specs | API spec parsing, auth pattern detection, pagination inference |
| **Schema Discovery** | Infer source schemas | Type detection, nested structure handling, confidence scoring |
| **CDC Engine** | Capture real-time changes | Log-based CDC, event ordering, exactly-once delivery |
| **Batch Puller** | Full/incremental extraction | Parallel extraction, checkpoint management, rate limiting |

### Layer 2: AI Processing Layer

| Component | Responsibility | Key Features |
|-----------|----------------|--------------|
| **AI Schema Mapper** | Map source → target fields | Embedding similarity, LLM disambiguation, human-in-loop |
| **NL-to-SQL Generator** | Transform natural language to code | Prompt engineering, SQL validation, dbt model generation |
| **LLM Enricher** | Add context and derived fields | Entity extraction, classification, summarization |
| **Quality Engine** | Compute quality scores | Completeness, accuracy, consistency, timeliness |

### Layer 3: Orchestration Layer

| Component | Responsibility | Key Features |
|-----------|----------------|--------------|
| **DAG Compiler** | Generate execution DAGs | Dependency resolution, parallelization, AI-assisted optimization |
| **Pipeline Scheduler** | Execute pipelines on schedule | Cron, event-driven, backfill management |
| **Self-Healing Controller** | Detect and fix failures | Error classification, root cause analysis, remediation selection |
| **Anomaly Engine** | Detect data anomalies | Statistical analysis, ML models, adaptive thresholds |

### Layer 4: Storage Layer

| Component | Responsibility | Key Features |
|-----------|----------------|--------------|
| **Bronze (Raw)** | Store raw ingested data | Schema-on-read, full fidelity, audit trail |
| **Silver (Clean)** | Store validated data | Type coercion, deduplication, quality gates |
| **Gold (Curated)** | Store business-ready data | Aggregations, ML features, semantic models |
| **Metadata Catalog** | Track schemas and configs | Version history, search, governance policies |
| **Lineage Graph** | Track data flow | Column-level lineage, impact analysis |

### Layer 5: Observability Layer

| Component | Responsibility | Key Features |
|-----------|----------------|--------------|
| **Quality Monitors** | Track data quality metrics | Freshness, volume, distribution, schema drift |
| **Pipeline Monitors** | Track execution metrics | Duration, success rate, resource usage |
| **Cost Tracker** | Track infrastructure costs | Per-pipeline costs, optimization recommendations |
| **Alert Manager** | Route and manage alerts | Severity routing, deduplication, escalation |

---

## Data Flow Architecture

### Batch Pipeline Flow

```mermaid
sequenceDiagram
    participant Source as Data Source
    participant Connector as Connector
    participant Schema as Schema<br/>Discovery
    participant Mapper as Schema<br/>Mapper
    participant Transform as Transform<br/>Engine
    participant Quality as Quality<br/>Engine
    participant Bronze as Bronze<br/>Layer
    participant Silver as Silver<br/>Layer
    participant Gold as Gold<br/>Layer
    participant Lineage as Lineage<br/>Tracker

    Source->>Connector: Extract Data
    Connector->>Schema: Infer Schema
    Schema->>Schema: Detect Types
    Schema->>Mapper: Schema + Data Sample

    alt New Schema
        Mapper->>Mapper: Generate Mappings<br/>(Embedding + LLM)
        Mapper->>Mapper: Score Confidence
        alt Low Confidence
            Mapper->>Mapper: Flag for Human Review
        end
    end

    Mapper->>Bronze: Write Raw Data
    Bronze->>Lineage: Record Source Lineage

    Bronze->>Transform: Read for Transform
    Transform->>Transform: Apply Mappings
    Transform->>Quality: Validate Data

    alt Quality Pass
        Quality->>Silver: Write Cleaned Data
        Silver->>Lineage: Record Transform Lineage
    else Quality Fail
        Quality->>Quality: Route to Remediation
    end

    Silver->>Transform: Aggregate/Enrich
    Transform->>Gold: Write Curated Data
    Gold->>Lineage: Record Final Lineage
```

### CDC Pipeline Flow

```mermaid
sequenceDiagram
    participant Source as Source DB
    participant CDC as CDC Engine
    participant Queue as Event Queue
    participant Processor as Stream<br/>Processor
    participant Quality as Quality<br/>Check
    participant SelfHeal as Self-Healing
    participant Bronze as Bronze
    participant Silver as Silver

    Source->>CDC: Transaction Log
    CDC->>CDC: Parse Log Entry
    CDC->>Queue: Publish Event

    loop For Each Event
        Queue->>Processor: Consume Event
        Processor->>Processor: Apply Schema Mapping
        Processor->>Quality: Validate Event

        alt Valid Event
            Quality->>Bronze: Append Raw
            Quality->>Silver: Upsert Clean
        else Invalid Event
            Quality->>SelfHeal: Analyze Failure
            alt Auto-Remediate
                SelfHeal->>Processor: Retry with Fix
            else Escalate
                SelfHeal->>SelfHeal: Alert + DLQ
            end
        end
    end
```

---

## Key Architectural Decisions

### Decision 1: ELT over ETL

| Factor | ETL | ELT | Decision: ELT |
|--------|-----|-----|---------------|
| **Transformation Location** | Pre-load | Post-load | Leverage warehouse compute |
| **Raw Data Preservation** | Transformed only | Full fidelity | Better for AI/ML |
| **Schema Evolution** | Complex | Native (Iceberg) | Supports drift handling |
| **Cost** | Dedicated compute | Warehouse compute | Consolidate resources |
| **Flexibility** | Fixed transforms | Dynamic transforms | NL-to-SQL enables flexibility |

### Decision 2: Event-Driven for CDC, Scheduled for Batch

| Scenario | Pattern | Rationale |
|----------|---------|-----------|
| **Real-time sources** | Event-driven | Minimize latency, react to changes |
| **Full table syncs** | Scheduled | Predictable resource allocation |
| **Dependency chains** | Event + Schedule | Events trigger, schedule enforces SLAs |
| **Backfills** | Scheduled | Controlled resource consumption |

### Decision 3: Medallion Architecture

```
Bronze (Raw)
├── Append-only, full fidelity
├── Schema-on-read
├── Short retention (7 days)
└── Purpose: Reprocessing, audit

Silver (Cleaned)
├── Type-coerced, deduplicated
├── Quality validated
├── Medium retention (90 days)
└── Purpose: Analysis, ML features

Gold (Curated)
├── Business aggregations
├── Semantic models
├── Long retention (years)
└── Purpose: BI, reporting, AI
```

### Decision 4: Apache Iceberg for Storage Format

| Feature | Benefit for EAI |
|---------|-----------------|
| **Schema Evolution** | Handle drift without rewrites |
| **Partition Evolution** | Optimize without migration |
| **Time Travel** | Audit, debugging, reprocessing |
| **Hidden Partitioning** | Abstract partitioning from queries |
| **ACID Transactions** | Reliable concurrent writes |

### Decision 5: Semantic Layer Integration

```mermaid
flowchart LR
    subgraph Physical["Physical Layer"]
        Gold[("Gold<br/>Tables")]
    end

    subgraph Semantic["Semantic Layer"]
        Entities["Entities"]
        Metrics["Metrics"]
        Dimensions["Dimensions"]
    end

    subgraph Consumers["Consumers"]
        BI[BI Tools]
        AIAgents[AI Agents]
        NL[NL Queries]
    end

    Gold --> Entities
    Gold --> Metrics
    Gold --> Dimensions

    Entities --> BI
    Metrics --> BI
    Dimensions --> AIAgents
    Semantic --> NL

    classDef physical fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef semantic fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef consumer fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class Gold physical
    class Entities,Metrics,Dimensions semantic
    class BI,AIAgents,NL consumer
```

**Rationale:** Semantic layer provides:
- Consistent business definitions for AI agents
- Grounding to prevent LLM hallucinations
- Reusable metrics across tools

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| ✅ Sync vs Async | Async (event-driven) for CDC, Sync for batch | Latency vs throughput trade-off |
| ✅ Event-driven vs Request-response | Event-driven primary | Decoupling, scalability |
| ✅ Push vs Pull | Pull for batch, Push for CDC | Source capability varies |
| ✅ Stateless vs Stateful | Stateless workers, Stateful orchestrator | Scalability + coordination |
| ✅ Read-heavy vs Write-heavy | Write-heavy ingestion, Read-heavy analytics | Separate compute pools |
| ✅ Real-time vs Batch | Hybrid (CDC + scheduled) | Support both patterns |
| ✅ Edge vs Origin | Origin processing | Central AI model deployment |

---

## Self-Healing Architecture

```mermaid
flowchart TB
    subgraph Detection["Detection Layer"]
        PipelineExec["Pipeline<br/>Execution"]
        ErrorCapture["Error<br/>Capture"]
        AnomalyDet["Anomaly<br/>Detection"]
    end

    subgraph Classification["Classification Layer"]
        ErrorClass["Error<br/>Classifier"]
        TransientCheck{{"Transient<br/>Error?"}}
        SchemaCheck{{"Schema<br/>Drift?"}}
        DataCheck{{"Data Quality<br/>Issue?"}}
    end

    subgraph RootCause["Root Cause Analysis"]
        MLDiagnose["ML<br/>Diagnosis"]
        RuleMatch["Rule<br/>Matching"]
        ContextGather["Context<br/>Gathering"]
    end

    subgraph Remediation["Remediation Layer"]
        AutoRetry["Auto<br/>Retry"]
        SchemaUpdate["Schema<br/>Update"]
        Quarantine["Quarantine<br/>Bad Data"]
        Escalate["Human<br/>Escalation"]
    end

    subgraph Feedback["Feedback Loop"]
        Outcome["Outcome<br/>Tracking"]
        ModelUpdate["Model<br/>Update"]
    end

    PipelineExec --> ErrorCapture
    PipelineExec --> AnomalyDet

    ErrorCapture --> ErrorClass
    AnomalyDet --> ErrorClass

    ErrorClass --> TransientCheck
    TransientCheck -->|Yes| AutoRetry
    TransientCheck -->|No| SchemaCheck

    SchemaCheck -->|Yes| SchemaUpdate
    SchemaCheck -->|No| DataCheck

    DataCheck -->|Yes| Quarantine
    DataCheck -->|No| MLDiagnose

    MLDiagnose --> RuleMatch
    RuleMatch --> ContextGather
    ContextGather --> Escalate

    AutoRetry --> Outcome
    SchemaUpdate --> Outcome
    Quarantine --> Outcome
    Escalate --> Outcome

    Outcome --> ModelUpdate
    ModelUpdate -.-> MLDiagnose

    classDef detection fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef classification fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef rootcause fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef remediation fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef feedback fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class PipelineExec,ErrorCapture,AnomalyDet detection
    class ErrorClass,TransientCheck,SchemaCheck,DataCheck classification
    class MLDiagnose,RuleMatch,ContextGather rootcause
    class AutoRetry,SchemaUpdate,Quarantine,Escalate remediation
    class Outcome,ModelUpdate feedback
```

### Self-Healing Decision Matrix

| Error Type | Detection | Remediation | Auto-Heal? |
|------------|-----------|-------------|------------|
| Network timeout | Connection error | Exponential backoff retry | Yes |
| Rate limit exceeded | 429 response | Adaptive rate limiting | Yes |
| Transient DB error | Connection pool error | Retry with fresh connection | Yes |
| Schema column added | Schema diff | Update mapping, continue | Yes |
| Schema column removed | Schema diff | Flag for review, use defaults | Partial |
| Schema type change | Type coercion error | Flag for review | No |
| Data quality violation | Quality check failure | Quarantine + alert | Yes |
| Source unavailable | Connection timeout | Retry then alert | Partial |
| Out of memory | Resource error | Scale + retry | Yes |
| Unknown error | Unclassified | ML diagnosis + escalate | No |

---

## Anomaly Detection Architecture

```mermaid
flowchart TB
    subgraph Metrics["Metric Collection"]
        Freshness["Freshness<br/>Tracker"]
        Volume["Volume<br/>Counter"]
        Distribution["Distribution<br/>Profiler"]
        Schema["Schema<br/>Monitor"]
    end

    subgraph Baselines["Baseline Management"]
        Historical["Historical<br/>Analysis"]
        Seasonal["Seasonal<br/>Patterns"]
        Adaptive["Adaptive<br/>Thresholds"]
    end

    subgraph Detection["Detection Engine"]
        StatDetect["Statistical<br/>Detection"]
        MLDetect["ML<br/>Detection"]
        RuleDetect["Rule-Based<br/>Detection"]
    end

    subgraph Decision["Decision Layer"]
        Scorer["Anomaly<br/>Scorer"]
        Correlator["Cross-Metric<br/>Correlator"]
        Severity{{"Severity<br/>Classification"}}
    end

    subgraph Action["Action Layer"]
        Suppress["Auto<br/>Suppress"]
        Alert["Generate<br/>Alert"]
        AutoFix["Auto<br/>Remediate"]
    end

    Metrics --> Baselines
    Freshness --> Historical
    Volume --> Seasonal
    Distribution --> Adaptive
    Schema --> Baselines

    Baselines --> Detection
    Historical --> StatDetect
    Seasonal --> MLDetect
    Adaptive --> RuleDetect

    Detection --> Decision
    StatDetect --> Scorer
    MLDetect --> Scorer
    RuleDetect --> Scorer

    Scorer --> Correlator
    Correlator --> Severity

    Severity -->|Low| Suppress
    Severity -->|Medium| Alert
    Severity -->|High| AutoFix
    AutoFix --> Alert

    classDef metrics fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef baselines fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef detection fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef decision fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef action fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class Freshness,Volume,Distribution,Schema metrics
    class Historical,Seasonal,Adaptive baselines
    class StatDetect,MLDetect,RuleDetect detection
    class Scorer,Correlator,Severity decision
    class Suppress,Alert,AutoFix action
```

---

## Integration Points

### Source System Integration

```mermaid
flowchart LR
    subgraph Sources["Source Systems"]
        RDBMS["Relational DBs"]
        APIs["REST APIs"]
        Events["Event Streams"]
        Files["File Storage"]
    end

    subgraph Connectors["Connector Layer"]
        JDBC["JDBC<br/>Connector"]
        REST["REST<br/>Connector"]
        Kafka["Kafka<br/>Connector"]
        S3["S3<br/>Connector"]
        AIGen["AI-Generated<br/>Connector"]
    end

    subgraph Protocols["Protocols"]
        Batch["Batch<br/>Pull"]
        CDC["CDC<br/>Stream"]
        Webhook["Webhook<br/>Push"]
    end

    RDBMS --> JDBC
    APIs --> REST
    APIs --> AIGen
    Events --> Kafka
    Files --> S3

    JDBC --> Batch
    JDBC --> CDC
    REST --> Batch
    REST --> Webhook
    Kafka --> CDC
    S3 --> Batch

    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef connector fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef protocol fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class RDBMS,APIs,Events,Files source
    class JDBC,REST,Kafka,S3,AIGen connector
    class Batch,CDC,Webhook protocol
```

### Downstream Integration

| Consumer | Integration Pattern | Data Layer |
|----------|-------------------|------------|
| BI Tools | Direct query, semantic layer | Gold |
| ML Platforms | Feature extraction, batch export | Silver, Gold |
| AI Agents | Semantic layer, MCP protocol | Gold |
| Reverse ETL | Event-driven sync | Gold |
| Data Scientists | Notebook access, time travel | Silver |

---

## High Availability Design

```mermaid
flowchart TB
    subgraph Region1["Region A (Primary)"]
        Ingestion1["Ingestion<br/>Cluster"]
        Process1["Processing<br/>Cluster"]
        Orch1["Orchestration<br/>(Leader)"]
        Store1[("Storage<br/>(Primary)")]
    end

    subgraph Region2["Region B (Secondary)"]
        Ingestion2["Ingestion<br/>Cluster"]
        Process2["Processing<br/>Cluster"]
        Orch2["Orchestration<br/>(Standby)"]
        Store2[("Storage<br/>(Replica)")]
    end

    subgraph Global["Global Services"]
        LB["Global<br/>Load Balancer"]
        DNS["DNS<br/>Failover"]
        Metadata[("Metadata<br/>(Multi-Region)")]
    end

    LB --> Ingestion1
    LB --> Ingestion2
    DNS --> LB

    Ingestion1 --> Process1
    Ingestion2 --> Process2

    Process1 --> Orch1
    Process2 --> Orch2

    Orch1 --> Store1
    Orch2 --> Store2

    Store1 <-->|Async<br/>Replication| Store2
    Orch1 <-->|Leader<br/>Election| Orch2

    Metadata --> Orch1
    Metadata --> Orch2

    classDef primary fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef secondary fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef global fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class Ingestion1,Process1,Orch1,Store1 primary
    class Ingestion2,Process2,Orch2,Store2 secondary
    class LB,DNS,Metadata global
```

### Failover Strategy

| Component | Failover Mechanism | RTO |
|-----------|-------------------|-----|
| Ingestion | Auto-failover to other region | <1 min |
| Processing | Stateless, any region | <1 min |
| Orchestration | Leader election | <5 min |
| Storage | Read from replica, write to primary | <15 min |
| Metadata | Multi-region active-active | 0 |
