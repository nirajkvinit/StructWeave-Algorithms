# AI-Native Procurement & Spend Intelligence --- High-Level Design

## 1. System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer"]
        WA["Web Application<br/>(Spend Dashboards, PO Management)"]
        MA["Mobile App<br/>(Approvals, Alerts)"]
        API_EXT["External API<br/>(ERP Integration, Supplier Portal)"]
    end

    subgraph GatewayLayer["API Gateway & Orchestration"]
        GW["API Gateway<br/>(Auth, Rate Limiting, Routing)"]
        AO["Agent Orchestrator<br/>(Multi-Agent Coordination)"]
    end

    subgraph CoreServices["Core Procurement Services"]
        IS["Intake Service<br/>(Requisition Processing)"]
        SS["Sourcing Service<br/>(Supplier Matching, RFx)"]
        CS["Contract Service<br/>(Lifecycle Management)"]
        PO["PO Engine<br/>(Generation, Routing, Matching)"]
        AW["Approval Workflow<br/>(Rules Engine, Routing)"]
    end

    subgraph IntelligenceLayer["AI / ML Intelligence Layer"]
        SCE["Spend Classification<br/>Engine"]
        SRS["Supplier Risk<br/>Scoring"]
        POpt["Price Optimization<br/>Engine"]
        DF["Demand Forecasting<br/>Service"]
        NLP["Document Intelligence<br/>(OCR + NLP Pipeline)"]
    end

    subgraph DataLayer["Data & Storage Layer"]
        PDB[("Procurement DB<br/>(POs, Requisitions)")]
        SDB[("Supplier DB<br/>(Profiles, Scores)")]
        CDB[("Contract Store<br/>(Documents, Terms)")]
        SC[("Spend Cube<br/>(OLAP Aggregations)")]
        FS[("Feature Store<br/>(ML Features)")]
        DL[("Data Lake<br/>(Raw Signals, History)")]
    end

    subgraph StreamingLayer["Event & Streaming Layer"]
        EB["Event Bus<br/>(Domain Events)"]
        SIP["Signal Ingestion<br/>Pipeline"]
        CDC["Change Data Capture"]
    end

    subgraph CacheLayer["Cache Layer"]
        RC["Results Cache<br/>(Dashboard Queries)"]
        MC["Model Cache<br/>(ML Predictions)"]
    end

    WA --> GW
    MA --> GW
    API_EXT --> GW
    GW --> AO
    AO --> IS
    AO --> SS
    AO --> CS
    AO --> PO
    AO --> AW

    IS --> EB
    SS --> SRS
    SS --> POpt
    CS --> NLP
    PO --> AW
    PO --> EB

    SCE --> FS
    SRS --> FS
    POpt --> FS
    DF --> FS
    NLP --> CDB

    IS --> PDB
    PO --> PDB
    SS --> SDB
    CS --> CDB
    SCE --> SC

    EB --> CDC
    SIP --> DL
    SIP --> SRS
    CDC --> SC

    SCE --> RC
    SRS --> MC
    SS --> RC

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class WA,MA,API_EXT client
    class GW,AO api
    class IS,SS,CS,PO,AW,SCE,SRS,POpt,DF,NLP service
    class PDB,SDB,CDB,SC,FS,DL data
    class RC,MC cache
    class EB,SIP,CDC queue
```

---

## 2. Data Flow Descriptions

### 2.1 Procurement Request Flow (Requisition → PO)

```
1. User submits purchase request (structured form or free-text via chat)
2. Intake Agent parses request → extracts item, quantity, urgency, category
3. Budget Service validates available budget for cost center
4. Sourcing Service queries Supplier DB for matching suppliers
   - Supplier Risk Scoring provides risk-adjusted rankings
   - Price Optimization suggests target pricing based on benchmarks
5. For routine purchases (below autonomous threshold):
   - PO Engine generates PO automatically
   - Approval Workflow routes for rubber-stamp confirmation
6. For strategic purchases (above threshold):
   - Approval Workflow routes through configurable approval chain
   - Parallel notifications to all required approvers
7. Approved PO sent to ERP via integration adapter
8. PO events published to Event Bus → Spend Classification picks up
9. Audit trail written to immutable log
```

### 2.2 Spend Analysis Pipeline

```
1. Transaction data ingested from multiple sources:
   - PO line items (real-time via CDC)
   - Invoices (batch via document intelligence pipeline)
   - P-Card transactions (daily feed)
   - Expense reports (daily feed)
2. Document Intelligence Pipeline processes unstructured data:
   - OCR extracts text from scanned invoices
   - NLP identifies line items, amounts, vendor, dates
   - Entity resolution maps vendor names to canonical supplier IDs
3. Spend Classification Engine:
   - Feature extraction: text embeddings, vendor features, amount patterns
   - Multi-level classification: L1 (direct/indirect) → L2 (category) → L3 (subcategory) → L4 (item type)
   - Confidence scoring: high-confidence auto-classified; low-confidence queued for human review
4. Classified transactions loaded into Spend Cube (OLAP)
5. Anomaly Detection runs over classified spend:
   - Duplicate payment detection (fuzzy matching on amount, vendor, date)
   - Price spike detection (statistical deviation from moving average)
   - Maverick spend detection (off-contract purchases)
6. Analytics dashboards refresh from Spend Cube
7. Insights pushed to recommendation engine for sourcing optimization
```

### 2.3 Supplier Risk Assessment Pipeline

```
1. Signal Ingestion Pipeline collects multi-source data:
   - Financial feeds: quarterly filings, credit score changes
   - News feeds: NLP sentiment analysis over 100K+ news sources
   - Geopolitical indices: country risk scores, sanctions lists
   - ESG data: environmental, social, governance ratings
   - Operational data: delivery performance, quality incidents
   - Regulatory: compliance certifications, audit results
2. Feature Store maintains point-in-time correct features per supplier
3. Risk Scoring Models:
   - Financial risk: gradient-boosted model on financial ratios
   - Operational risk: time-series model on delivery/quality trends
   - Reputational risk: NLP sentiment aggregation
   - Geopolitical risk: rule-based + ML on country/region features
   - Concentration risk: graph analysis on supply network topology
4. Ensemble model combines dimension scores into composite risk score
5. Risk scores cached in Model Cache for low-latency serving
6. Alerting system:
   - Threshold-based: score crosses critical threshold → immediate alert
   - Trend-based: score declining for 3+ consecutive periods → early warning
   - Event-based: specific trigger events (sanctions, bankruptcy filing) → urgent alert
7. Risk scores fed back into Sourcing Service for risk-adjusted recommendations
```

---

## 3. Sequence Diagrams

### 3.1 Autonomous PO Generation

```mermaid
sequenceDiagram
    participant U as User
    participant IA as Intake Agent
    participant BS as Budget Service
    participant SS as Sourcing Service
    participant POE as PO Engine
    participant AW as Approval Workflow
    participant ERP as ERP System
    participant EB as Event Bus

    U->>IA: Submit purchase request (free-text)
    IA->>IA: Parse & extract (item, qty, category, urgency)
    IA->>BS: Validate budget (cost center, amount)
    BS-->>IA: Budget available ✓

    IA->>SS: Find suppliers (category, geography, requirements)
    SS->>SS: Query supplier DB + risk scores + price benchmarks
    SS-->>IA: Ranked supplier recommendations

    IA->>POE: Generate PO (supplier, items, pricing, terms)
    POE->>POE: Validate against contract terms
    POE->>POE: Apply negotiated pricing from contract

    alt Amount < Autonomous Threshold
        POE->>AW: Submit for auto-approval
        AW-->>POE: Auto-approved ✓
    else Amount >= Autonomous Threshold
        POE->>AW: Route to approval chain
        AW->>U: Notify approver(s)
        U-->>AW: Approve
        AW-->>POE: Approved ✓
    end

    POE->>ERP: Transmit PO
    ERP-->>POE: PO acknowledged (ERP PO number)
    POE->>EB: Publish PO_CREATED event
    POE-->>U: PO confirmation + tracking link
```

### 3.2 Contract Compliance Check

```mermaid
sequenceDiagram
    participant PO as PO Engine
    participant CC as Compliance Checker
    participant CS as Contract Store
    participant NLP as NLP Engine
    participant AL as Alert Service
    participant AU as Audit Log

    PO->>CC: Validate PO against contracts
    CC->>CS: Fetch active contracts for supplier + category
    CS-->>CC: Contract terms (pricing, min/max qty, SLAs)

    CC->>CC: Compare PO terms vs contract terms

    alt Compliant
        CC-->>PO: Compliance check passed ✓
        CC->>AU: Log compliance verification
    else Price Deviation
        CC->>AL: Alert - price exceeds contracted rate by X%
        CC->>AU: Log price deviation finding
        AL-->>PO: Compliance warning (proceed with override option)
    else Unauthorized Supplier
        CC->>AL: Alert - supplier not on approved list
        CC->>AU: Log unauthorized supplier attempt
        AL-->>PO: Block PO (requires manual override)
    else Contract Expired
        CC->>NLP: Analyze contract for renewal terms
        NLP-->>CC: Renewal recommendation
        CC->>AL: Alert - contract expired, renewal recommended
        CC->>AU: Log expired contract finding
    end
```

---

## 4. Key Architectural Decisions

### Decision 1: Event-Driven vs. Request-Response for Inter-Service Communication

| Option | Pros | Cons |
|--------|------|------|
| **Synchronous (request-response)** | Simple mental model; immediate consistency; easier debugging | Tight coupling; cascading failures; harder to scale independently |
| **Asynchronous (event-driven)** ✅ | Loose coupling; independent scaling; natural audit trail; replay capability | Eventual consistency; complex debugging; message ordering challenges |
| **Hybrid** ✅ (chosen) | Best of both: sync for user-facing latency-sensitive paths; async for analytics, risk scoring, and ML pipelines | Two communication patterns to maintain; team must understand when to use which |

**Decision**: Hybrid approach. PO creation and approval workflows use synchronous request-response for immediate user feedback. Spend classification, risk scoring, and analytics use event-driven async processing. The Event Bus serves as the system of record for all domain events, enabling replay and audit.

### Decision 2: Shared vs. Separate ML Platform

| Option | Pros | Cons |
|--------|------|------|
| **Embedded ML per service** | Simple deployment; each team owns their model lifecycle | Duplicated infrastructure; inconsistent model management; no shared feature store |
| **Centralized ML Platform** ✅ | Shared feature store; consistent model lifecycle; efficient GPU utilization; unified monitoring | Single team bottleneck; more complex deployment; cross-team coordination |

**Decision**: Centralized ML Platform with a shared Feature Store. All ML models (spend classification, risk scoring, price optimization, demand forecasting) share the same feature computation infrastructure. Individual service teams own their model logic but deploy through the shared platform, ensuring consistent versioning, A/B testing, and monitoring.

### Decision 3: Tenant Data Isolation Strategy

| Option | Pros | Cons |
|--------|------|------|
| **Separate databases per tenant** | Strongest isolation; simple compliance; independent scaling | Operational overhead; expensive at scale; complex cross-tenant analytics |
| **Shared database, schema per tenant** | Good isolation; moderate overhead; per-schema migrations | Schema explosion at 1000+ tenants; complex connection pooling |
| **Shared database, row-level isolation** ✅ | Efficient infrastructure; easy cross-tenant operations (with consent); simple ops | Requires rigorous tenant filtering; risk of data leakage; complex access control |

**Decision**: Row-level tenant isolation with mandatory tenant context propagation. Every query includes a tenant filter enforced at the data access layer (not application logic). The ML platform uses a federated learning approach: a global model is trained on anonymized, aggregated data; tenant-specific models are fine-tuned on each tenant's data and never leave the tenant boundary.

### Decision 4: Document Intelligence Pipeline Architecture

| Option | Pros | Cons |
|--------|------|------|
| **Synchronous processing** | Immediate results; simple flow | Blocks user; GPU resources tied up during upload |
| **Asynchronous queue-based** ✅ | Non-blocking; GPU pool management; retry on failure; priority queuing | User must poll or subscribe for results; more complex UX |

**Decision**: Asynchronous queue-based pipeline. Document uploads go to object storage, a message is published to the processing queue, GPU workers pull documents for OCR + NLP, extracted data is written to the Contract Store / Spend Classification pipeline, and the user is notified via webhook/push notification. Priority queuing ensures urgent contracts (upcoming renewals) are processed before routine invoices.

---

## 5. Architecture Pattern Checklist

| Pattern | Applied? | How |
|---------|----------|-----|
| **Microservices** | ✅ | Domain-driven decomposition: Intake, Sourcing, Contracting, PO, Spend Analytics, Risk Intelligence as independent services |
| **Event Sourcing** | ✅ | PO lifecycle events (created, approved, dispatched, received, invoiced) stored as immutable event stream; enables audit and replay |
| **CQRS** | ✅ | Write path (PO creation, approvals) separated from read path (spend dashboards, analytics queries); different data models optimized for each |
| **Saga Pattern** | ✅ | Procurement workflow (budget reservation → PO creation → ERP sync → budget commitment) as a saga with compensating transactions |
| **API Gateway** | ✅ | Centralized authentication, rate limiting, request routing; tenant context injection |
| **Circuit Breaker** | ✅ | ERP integration calls protected by circuit breakers; PO creation degrades gracefully when ERP is unavailable (queued for retry) |
| **Sidecar / Service Mesh** | ✅ | mTLS between services; distributed tracing propagation; per-service rate limiting |
| **Strangler Fig** | ✅ | Migration path for customers transitioning from legacy procurement systems; gradual feature cutover |
| **Feature Store** | ✅ | Centralized ML feature computation and serving; point-in-time correctness for training; low-latency serving for inference |
| **Lambda Architecture** | Partial | Batch layer for ML model training and spend cube refresh; speed layer for real-time risk alerts; serving layer for dashboards |
| **Bulkhead** | ✅ | ML inference, document processing, and transactional workloads isolated into separate resource pools to prevent noisy-neighbor effects |
| **Outbox Pattern** | ✅ | Transactional outbox ensures domain events are published exactly once, even if the message broker is temporarily unavailable |
| **Retry with Backoff** | ✅ | External integrations (ERP sync, supplier data feeds, payment systems) use exponential backoff with jitter |
| **Data Mesh** | Partial | Each domain service owns its data products (spend data, supplier data, contract data); cross-domain queries via published data contracts |

---

## 6. Component Interaction Map

### Service Dependencies

```
Intake Service
  ├── reads → Supplier DB (supplier lookup)
  ├── calls → Budget Service (validation)
  ├── calls → Sourcing Service (supplier matching)
  ├── publishes → Event Bus (REQUISITION_CREATED)
  └── writes → Procurement DB (requisition records)

Sourcing Service
  ├── reads → Supplier DB (profiles, scores)
  ├── reads → Feature Store (risk features, price features)
  ├── calls → Supplier Risk Scoring (risk scores)
  ├── calls → Price Optimization (benchmark pricing)
  └── publishes → Event Bus (SOURCING_COMPLETED)

PO Engine
  ├── reads → Contract Store (pricing terms)
  ├── calls → Approval Workflow (routing)
  ├── calls → Budget Service (commitment)
  ├── calls → Compliance Checker (validation)
  ├── writes → Procurement DB (PO records)
  ├── calls → ERP System (PO transmission)
  └── publishes → Event Bus (PO_CREATED, PO_APPROVED, PO_DISPATCHED)

Spend Classification Engine
  ├── subscribes → Event Bus (PO_CREATED, INVOICE_PROCESSED)
  ├── reads → Feature Store (text embeddings, vendor features)
  ├── writes → Spend Cube (classified transactions)
  └── publishes → Event Bus (SPEND_CLASSIFIED, ANOMALY_DETECTED)

Supplier Risk Scoring
  ├── subscribes → Signal Ingestion Pipeline (risk signals)
  ├── reads/writes → Feature Store (risk features)
  ├── writes → Supplier DB (updated scores)
  └── publishes → Event Bus (RISK_SCORE_UPDATED, RISK_ALERT)

Document Intelligence Pipeline
  ├── reads → Object Storage (uploaded documents)
  ├── runs → OCR + NLP models (GPU workers)
  ├── writes → Contract Store (extracted terms)
  └── publishes → Event Bus (DOCUMENT_PROCESSED)
```

### Cross-Cutting Concerns

| Concern | Implementation |
|---------|---------------|
| **Authentication** | OAuth 2.0 + OIDC at API Gateway; JWT propagation to services |
| **Authorization** | RBAC + ABAC hybrid; tenant-scoped roles; fine-grained permissions per procurement action |
| **Audit Logging** | Every state change published as immutable event; centralized audit store with 10-year retention |
| **Rate Limiting** | Per-tenant, per-endpoint rate limits at API Gateway; ML inference rate limits to protect GPU resources |
| **Encryption** | TLS in transit; field-level encryption at rest for PII (supplier banking details, contact information) |
| **Observability** | Distributed tracing (all requests get trace IDs); structured logging; ML-specific metrics (model latency, prediction confidence distribution) |
