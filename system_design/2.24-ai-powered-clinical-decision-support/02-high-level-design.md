# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["EHR Systems"]
        Epic["Epic EHR"]
        Cerner["Oracle Cerner"]
        Meditech["MEDITECH"]
        Other["Other FHIR-Enabled EHRs"]
    end

    subgraph Gateway["API Gateway Layer"]
        CDSHooks["CDS Hooks Endpoint"]
        FHIRAPI["FHIR R4 API"]
        AdminAPI["Admin API"]
        RateLimit["Rate Limiter"]
        Auth["SMART on FHIR Auth"]
    end

    subgraph Core["Core CDS Services"]
        DDI["Drug Interaction<br/>Service"]
        Diagnosis["Diagnosis Suggestion<br/>Engine"]
        Guideline["Clinical Guideline<br/>Engine"]
        RiskScore["Risk Scoring<br/>Service"]
        AlertMgr["Alert Manager"]
        Override["Override Capture<br/>Service"]
    end

    subgraph AI["AI/ML Layer"]
        DiagnosisML["Diagnosis ML Models"]
        RiskML["Risk Prediction Models"]
        XAI["Explainability Engine<br/>(SHAP/LIME)"]
        FedLearn["Federated Learning<br/>Coordinator"]
    end

    subgraph Knowledge["Knowledge Layer"]
        DrugKB["Drug Knowledge Base<br/>(DrugBank, RxNorm, FDB)"]
        GuidelineKB["Guideline Repository<br/>(CQL Encoded)"]
        TermKB["Terminology Server<br/>(SNOMED, ICD-10, LOINC)"]
        GraphDB["Drug Interaction<br/>Knowledge Graph"]
    end

    subgraph Data["Data Layer"]
        Cache["Distributed Cache<br/>(DDI Pairs, Sessions)"]
        PrimaryDB["Primary Database<br/>(Alerts, Overrides)"]
        AuditLog["Immutable Audit Log"]
        ModelRegistry["Model Registry"]
        Analytics["Analytics Store"]
    end

    subgraph Compliance["Compliance Layer"]
        Consent["Consent Verification<br/>Service"]
        PolicyEngine["Policy Engine<br/>(OPA)"]
        AuditService["Audit Service"]
        BreachDetect["Breach Detection"]
    end

    subgraph External["External Integrations"]
        DrugDBExt["Drug Database<br/>Providers"]
        GuidelineExt["Guideline<br/>Publishers"]
        RegBody["Regulatory<br/>Reporting"]
    end

    %% Client connections
    Epic --> CDSHooks
    Cerner --> CDSHooks
    Meditech --> CDSHooks
    Other --> FHIRAPI

    %% Gateway routing
    CDSHooks --> RateLimit
    FHIRAPI --> RateLimit
    RateLimit --> Auth
    Auth --> DDI
    Auth --> Diagnosis
    Auth --> Guideline
    Auth --> RiskScore

    %% Core service connections
    DDI --> DrugKB
    DDI --> GraphDB
    DDI --> Cache
    DDI --> AlertMgr

    Diagnosis --> DiagnosisML
    Diagnosis --> XAI
    Diagnosis --> TermKB
    Diagnosis --> AlertMgr

    Guideline --> GuidelineKB
    Guideline --> AlertMgr

    RiskScore --> RiskML
    RiskScore --> XAI
    RiskScore --> AlertMgr

    AlertMgr --> Override
    Override --> AuditLog

    %% AI connections
    DiagnosisML --> ModelRegistry
    RiskML --> ModelRegistry
    FedLearn --> ModelRegistry

    %% Compliance connections
    Auth --> Consent
    Consent --> PolicyEngine
    AlertMgr --> AuditService
    AuditService --> AuditLog
    AuditService --> BreachDetect

    %% Data connections
    DDI --> PrimaryDB
    Override --> PrimaryDB
    AlertMgr --> Analytics

    %% External sync
    DrugKB -.->|Monthly Sync| DrugDBExt
    GuidelineKB -.->|As Published| GuidelineExt
    AuditService -.->|Compliance Reports| RegBody
```

---

## Data Flow Diagrams

### 1. Medication Prescribe Workflow (Primary Flow)

```mermaid
sequenceDiagram
    participant EHR as EHR System
    participant CDS as CDS Hooks Gateway
    participant Auth as SMART Auth
    participant Consent as Consent Service
    participant DDI as Drug Interaction Service
    participant KB as Knowledge Base
    participant Cache as DDI Cache
    participant Alert as Alert Manager
    participant Audit as Audit Service

    EHR->>CDS: POST /cds-services/medication-prescribe
    Note over EHR,CDS: Hook: medication-prescribe<br/>Context: patientId, medications, draftOrder

    CDS->>Auth: Validate SMART Token
    Auth-->>CDS: Token Valid + Scopes

    CDS->>Consent: Check Consent (patientId, purpose=TREAT)
    Consent-->>CDS: PERMIT

    CDS->>DDI: Check Interactions (draftMed, currentMeds)

    DDI->>Cache: Get Cached DDI Pairs
    alt Cache Hit
        Cache-->>DDI: Cached Interactions
    else Cache Miss
        DDI->>KB: Query Drug Interactions
        KB-->>DDI: Interaction Data
        DDI->>Cache: Store (TTL=1hr)
    end

    DDI->>DDI: Apply Patient Context<br/>(age, renal function, conditions)
    DDI->>DDI: Calculate Severity Score

    DDI-->>Alert: Interaction Results

    alt Critical/High Severity
        Alert->>Alert: Generate Interruptive Card
    else Moderate Severity
        Alert->>Alert: Generate Passive Card
    else Low/No Interaction
        Alert->>Alert: No Card or Info Card
    end

    Alert->>Audit: Log Alert Generation
    Audit-->>Alert: Logged

    Alert-->>CDS: CDS Response (Cards)
    CDS-->>EHR: JSON Response with Cards

    Note over EHR: Display Alert to Clinician

    opt Clinician Overrides
        EHR->>CDS: POST /cds-services/feedback
        CDS->>Alert: Record Override
        Alert->>Audit: Log Override + Justification
    end
```

### 2. Diagnosis Suggestion Workflow

```mermaid
sequenceDiagram
    participant EHR as EHR System
    participant CDS as CDS Hooks Gateway
    participant Consent as Consent Service
    participant Diag as Diagnosis Engine
    participant ML as ML Inference
    participant XAI as Explainability
    participant Term as Terminology Server
    participant Alert as Alert Manager
    participant Audit as Audit Service

    EHR->>CDS: POST /cds-services/diagnosis-suggest
    Note over EHR,CDS: Context: symptoms[], vitals{},<br/>labResults[], demographics

    CDS->>Consent: Check Consent (purpose=TREAT)
    Consent-->>CDS: PERMIT

    CDS->>Diag: Request Diagnosis Suggestions

    Diag->>Term: Normalize Symptoms (SNOMED CT)
    Term-->>Diag: Normalized Symptom Codes

    Diag->>ML: Inference Request
    Note over ML: Input: symptom_vector,<br/>vital_features, lab_features

    ML->>ML: Run Ensemble Models
    ML-->>Diag: Top-N Diagnoses + Confidence

    Diag->>XAI: Explain Predictions
    XAI->>XAI: Calculate SHAP Values
    XAI-->>Diag: Feature Attributions

    Diag->>Term: Enrich with ICD-10 Codes
    Term-->>Diag: ICD-10 Mappings

    Diag-->>Alert: Formatted Suggestions

    Alert->>Alert: Generate Suggestion Cards
    Note over Alert: Cards include:<br/>- Diagnosis name<br/>- Confidence %<br/>- Contributing factors<br/>- Recommended tests

    Alert->>Audit: Log Suggestions Shown
    Audit-->>Alert: Logged

    Alert-->>CDS: CDS Response
    CDS-->>EHR: Suggestion Cards

    opt Clinician Selects Diagnosis
        EHR->>CDS: POST /cds-services/feedback
        Note over CDS: Feedback: selected_diagnosis,<br/>was_helpful: true/false
        CDS->>Diag: Record Selection
        Diag->>Audit: Log for Model Training
    end
```

### 3. Risk Score Calculation Flow

```mermaid
sequenceDiagram
    participant EHR as EHR System
    participant CDS as CDS Gateway
    participant Risk as Risk Scoring Service
    participant ML as Risk ML Models
    participant XAI as Explainability
    participant History as Score History
    participant Alert as Alert Manager

    EHR->>CDS: GET /fhir/RiskAssessment?patient=123
    Note over EHR,CDS: Request: CV Risk, Diabetes Risk

    CDS->>Risk: Calculate Risk Scores

    Risk->>Risk: Gather Patient Data
    Note over Risk: - Demographics (age, sex)<br/>- BMI, BP readings<br/>- Lab values (lipids, HbA1c, eGFR)<br/>- Smoking status<br/>- Medication history

    par PREVENT CV Risk
        Risk->>ML: Calculate PREVENT Score
        ML-->>Risk: 10-year CV Risk %
    and Diabetes Risk
        Risk->>ML: Calculate Diabetes Risk
        ML-->>Risk: 5-year Diabetes Risk %
    and QRISK (if EU)
        Risk->>ML: Calculate QRISK3
        ML-->>Risk: 10-year CV Risk %
    end

    Risk->>XAI: Explain Risk Factors
    XAI-->>Risk: Modifiable vs Non-Modifiable Factors

    Risk->>History: Store Score + Timestamp
    History-->>Risk: Previous Scores

    Risk->>Risk: Calculate Trend
    Note over Risk: Compare to 3-month,<br/>6-month, 1-year ago

    Risk-->>Alert: Risk Assessment Results

    Alert->>Alert: Generate Risk Cards
    Note over Alert: - Current score<br/>- Risk category<br/>- Trend indicator<br/>- Lifestyle recommendations

    Alert-->>CDS: FHIR RiskAssessment Resource
    CDS-->>EHR: Risk Assessment Response
```

---

## Key Architectural Decisions

### 1. Service Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Architecture Style** | Microservices | Independent scaling of DDI (high volume) vs Diagnosis (GPU-intensive) |
| **Communication** | Sync (CDS Hooks) + Async (Events) | Real-time alerts require sync; audit/analytics can be async |
| **Service Discovery** | DNS-based with health checks | Simple, reliable, cloud-agnostic |
| **API Protocol** | REST/JSON (CDS Hooks standard) | EHR interoperability requires CDS Hooks compliance |

### 2. Data Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Primary Database** | Relational (PostgreSQL) | ACID compliance for alert/override records |
| **Knowledge Graph** | Graph Database | Drug interactions are inherently relationship-centric |
| **Caching** | Distributed (Redis Cluster) | DDI pair caching, session management |
| **Audit Storage** | Append-only Log + Object Storage | Immutability, long-term retention |
| **Analytics** | Columnar (Time-series) | Efficient aggregation for metrics |

### 3. AI/ML Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Inference Location** | Cloud (primary) + Edge (optional) | Balance latency with privacy requirements |
| **Model Serving** | Dedicated inference cluster | GPU isolation, auto-scaling |
| **Explainability** | SHAP (global) + LIME (local) | Regulatory requirement for interpretability |
| **Training** | Federated Learning | Privacy-preserving; no raw PHI centralization |
| **Model Registry** | Versioned artifact store | PCCP compliance, rollback capability |

### 4. Integration Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **EHR Integration** | CDS Hooks v2.0 | HL7 standard; Epic, Cerner, MEDITECH support |
| **Data Exchange** | FHIR R4 | Modern healthcare interoperability standard |
| **Authorization** | SMART on FHIR | OAuth 2.0 + OIDC for healthcare |
| **Guideline Encoding** | Clinical Quality Language (CQL) | HL7 standard for computable guidelines |

---

## Architecture Pattern Checklist

| Pattern | Decision | Implementation |
|---------|----------|----------------|
| **Sync vs Async** | Sync for alerts, Async for audit/analytics | CDS Hooks (sync), Kafka (async events) |
| **Event-driven vs Request-response** | Both | Request-response for CDS, Events for model training |
| **Push vs Pull** | Push for alerts, Pull for risk scores | Interruptive alerts pushed; scores on-demand |
| **Stateless vs Stateful** | Stateless services | All state in cache/DB; services scale horizontally |
| **Read-heavy vs Write-heavy** | Read-heavy (DDI checks) | Aggressive caching; read replicas |
| **Real-time vs Batch** | Real-time for alerts, Batch for analytics | Sub-200ms for DDI; hourly aggregation |
| **Edge vs Origin** | Origin primary; Edge for latency-sensitive | Optional edge deployment for large health systems |

---

## Component Responsibilities

### API Gateway Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                       API GATEWAY LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  CDS Hooks      │  │  FHIR R4 API    │  │  Admin API      │ │
│  │  Endpoint       │  │                 │  │                 │ │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤ │
│  │ • Discovery     │  │ • RiskAssess    │  │ • Model Mgmt    │ │
│  │ • med-prescribe │  │ • DeviceAlert   │  │ • KB Updates    │ │
│  │ • order-sign    │  │ • CarePlan      │  │ • Config        │ │
│  │ • patient-view  │  │ • Subscription  │  │ • Monitoring    │ │
│  │ • feedback      │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 CROSS-CUTTING CONCERNS                   │   │
│  │  • Rate Limiting (token bucket per tenant)              │   │
│  │  • SMART on FHIR Authentication                         │   │
│  │  • Request/Response Logging                             │   │
│  │  • Consent Verification (inline)                        │   │
│  │  • Request Routing                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Core CDS Services

| Service | Responsibility | Dependencies | Scaling |
|---------|---------------|--------------|---------|
| **Drug Interaction Service** | DDI detection, severity calculation, alternative suggestions | Knowledge Graph, Drug KB, Cache | Horizontal (stateless) |
| **Diagnosis Suggestion Engine** | Symptom analysis, ML inference, differential ranking | ML Models, Terminology, XAI | Horizontal + GPU |
| **Clinical Guideline Engine** | CQL execution, guideline matching, gap analysis | Guideline KB, Terminology | Horizontal |
| **Risk Scoring Service** | Risk calculations, trend analysis, lifestyle recommendations | Risk Models, History Store | Horizontal |
| **Alert Manager** | Alert formatting, severity tiering, delivery | All CDS services | Horizontal |
| **Override Capture Service** | Justification recording, feedback collection | Audit Log, Primary DB | Horizontal |

### Knowledge Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                      KNOWLEDGE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              DRUG KNOWLEDGE BASE                         │   │
│  │  Sources: DrugBank, RxNorm, First Databank               │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │  • Drug metadata (names, ingredients, classes)          │   │
│  │  • DDI pairs with severity and evidence                 │   │
│  │  • Drug-condition contraindications                     │   │
│  │  • Dosing adjustments (renal, hepatic)                  │   │
│  │  • Alternative medications                               │   │
│  │  Update: Monthly sync + real-time critical alerts       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            DRUG INTERACTION KNOWLEDGE GRAPH              │   │
│  │  Model: Neo4j-style property graph                       │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │  Nodes: Drug, Ingredient, DrugClass, Condition          │   │
│  │  Edges: INTERACTS_WITH, CONTAINS, CONTRAINDICATED_IN    │   │
│  │  Properties: severity, mechanism, evidence_level        │   │
│  │  Queries: Multi-hop for novel combinations              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │             CLINICAL GUIDELINE REPOSITORY                │   │
│  │  Format: CQL (Clinical Quality Language) encoded         │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │  • ADA Standards of Care (Diabetes)                     │   │
│  │  • WHO Clinical Protocols                               │   │
│  │  • ICMR Guidelines (India)                              │   │
│  │  • ESC Recommendations (Cardiology)                     │   │
│  │  • USPSTF Preventive Services                           │   │
│  │  Update: As published by guideline bodies               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              TERMINOLOGY SERVER                          │   │
│  │  Standards: SNOMED CT, ICD-10, RxNorm, LOINC            │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │  • Concept lookup and validation                        │   │
│  │  • Hierarchical traversal (is-a relationships)          │   │
│  │  • Cross-terminology mapping                            │   │
│  │  • Synonym resolution                                   │   │
│  │  Update: Per terminology release schedule               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Event-Driven Architecture

### Event Types

| Event | Producer | Consumers | Retention |
|-------|----------|-----------|-----------|
| `alert.generated` | Alert Manager | Audit Service, Analytics | 30 days |
| `alert.delivered` | API Gateway | Audit Service | 30 days |
| `alert.overridden` | Override Service | Audit Service, Model Training | 1 year |
| `diagnosis.suggested` | Diagnosis Engine | Audit Service, Analytics | 30 days |
| `diagnosis.selected` | Feedback Handler | Model Training | 1 year |
| `risk.calculated` | Risk Service | History Store, Analytics | 30 days |
| `model.deployed` | Model Registry | All ML Services | Indefinite |
| `kb.updated` | KB Sync Service | All CDS Services | 7 days |

### Event Flow

```mermaid
flowchart LR
    subgraph Producers
        DDI[Drug Interaction]
        Diag[Diagnosis Engine]
        Risk[Risk Scoring]
        Override[Override Service]
    end

    subgraph EventBus["Event Bus (Kafka)"]
        AlertTopic[alert-events]
        DiagTopic[diagnosis-events]
        RiskTopic[risk-events]
        AuditTopic[audit-events]
        TrainingTopic[training-events]
    end

    subgraph Consumers
        Audit[Audit Service]
        Analytics[Analytics Pipeline]
        Training[Model Training]
        Compliance[Compliance Monitor]
    end

    DDI --> AlertTopic
    Diag --> DiagTopic
    Risk --> RiskTopic
    Override --> AuditTopic

    AlertTopic --> Audit
    AlertTopic --> Analytics
    DiagTopic --> Audit
    DiagTopic --> Training
    RiskTopic --> Analytics
    AuditTopic --> Audit
    AuditTopic --> Compliance

    Override --> TrainingTopic
    TrainingTopic --> Training
```

---

## Caching Strategy

### Cache Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                       CACHING ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  L1: IN-PROCESS CACHE (per service instance)            │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  • Hot DDI pairs (top 10K by frequency)                 │   │
│  │  • Active session tokens                                │   │
│  │  • Compiled CQL rules                                   │   │
│  │  TTL: 5 minutes | Size: 100MB per instance             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  L2: DISTRIBUTED CACHE (Redis Cluster)                  │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  • All DDI pairs (500K)                                 │   │
│  │  • Patient consent decisions                            │   │
│  │  • Recent risk scores                                   │   │
│  │  • ML model feature vectors                             │   │
│  │  TTL: 1 hour (DDI), 5 min (consent) | Size: 5GB        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  L3: KNOWLEDGE BASE (Read Replicas)                     │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  • Full drug database                                   │   │
│  │  • Complete knowledge graph                             │   │
│  │  • All terminology mappings                             │   │
│  │  Sync: Async from primary | Size: 20GB                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Cache Invalidation Strategy

| Cache | Invalidation Trigger | Strategy |
|-------|---------------------|----------|
| DDI Pairs | KB update event | Publish invalidation event; lazy refresh |
| Consent | Consent change event | Immediate invalidation; query on miss |
| Risk Scores | New lab results | TTL-based (scores valid for 24h) |
| CQL Rules | Guideline update | Full cache clear; warm on startup |
| Session Tokens | Token refresh/revoke | Immediate invalidation |

---

## Multi-Region Deployment

```mermaid
flowchart TB
    subgraph US["US Region (Primary for US patients)"]
        USGW[API Gateway]
        USCDS[CDS Services]
        USDB[(Primary DB)]
        USKB[(Knowledge Base)]
        USML[ML Inference]
    end

    subgraph EU["EU Region (Primary for EU patients)"]
        EUGW[API Gateway]
        EUCDS[CDS Services]
        EUDB[(Primary DB)]
        EUKB[(Knowledge Base)]
        EUML[ML Inference]
    end

    subgraph IN["India Region (Primary for India patients)"]
        INGW[API Gateway]
        INCDS[CDS Services]
        INDB[(Primary DB)]
        INKB[(Knowledge Base)]
        INML[ML Inference]
    end

    subgraph Global["Global Services"]
        ModelReg[(Model Registry)]
        KBMaster[(Knowledge Base Master)]
        FedCoord[Federated Learning Coordinator]
    end

    %% Data residency routing
    USGW --> USCDS
    EUGW --> EUCDS
    INGW --> INCDS

    %% Knowledge sync
    KBMaster -.->|Sync| USKB
    KBMaster -.->|Sync| EUKB
    KBMaster -.->|Sync| INKB

    %% Model distribution
    ModelReg -.->|Deploy| USML
    ModelReg -.->|Deploy| EUML
    ModelReg -.->|Deploy| INML

    %% Federated learning
    USML -.->|Gradients| FedCoord
    EUML -.->|Gradients| FedCoord
    INML -.->|Gradients| FedCoord
    FedCoord -.->|Updated Model| ModelReg
```

### Data Residency Rules

| Patient Location | Primary Region | DR Region | Cross-Border Rules |
|-----------------|----------------|-----------|-------------------|
| United States | US-East | US-West | HIPAA BAA required |
| European Union | EU-West | EU-North | GDPR; SCCs for transfers |
| United Kingdom | UK-London | EU-West | UK GDPR + DPA |
| India | IN-Mumbai | IN-Delhi | DPDP Act; in-country preferred |
| Australia | AU-Sydney | AU-Melbourne | Privacy Act 1988 |

---

## Technology Stack Summary

| Layer | Technology | Justification |
|-------|------------|---------------|
| **API Gateway** | Kong / Envoy | CDS Hooks routing, SMART auth, rate limiting |
| **Service Runtime** | Containerized (Kubernetes) | Horizontal scaling, isolation |
| **Primary Database** | PostgreSQL | ACID, JSON support, mature ecosystem |
| **Knowledge Graph** | Neo4j / Amazon Neptune | Relationship-centric DDI queries |
| **Cache** | Redis Cluster | DDI pair caching, session management |
| **Message Queue** | Kafka | Event streaming, audit events |
| **ML Inference** | TensorFlow Serving / Triton | GPU acceleration, model versioning |
| **Terminology Server** | HAPI FHIR Server | FHIR-native terminology operations |
| **Observability** | OpenTelemetry + Prometheus + Grafana | Distributed tracing, metrics |
| **Audit Storage** | Object Storage + Time-series DB | Immutable logs, compliance |
