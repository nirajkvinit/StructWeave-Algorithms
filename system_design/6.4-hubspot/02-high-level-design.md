# High-Level Design

## System Architecture

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
flowchart TB
    subgraph Clients["Client Layer"]
        WEB[Web App<br/>React SPA]
        MOBILE[Mobile Apps]
        THIRDPARTY[Third-Party Apps<br/>Marketplace]
        WEBHOOK_SUB[Webhook Subscribers]
    end

    subgraph Edge["Edge Layer — 250+ PoPs"]
        CDN[CDN / Static Assets]
        CFWORKER[Cloudflare Workers<br/>API Router]
    end

    subgraph Hublet["Hublet — Isolated Pod"]
        subgraph Gateway["API Gateway Layer"]
            APIGW[API Gateway<br/>Rate Limiting / Auth]
            OAUTH[OAuth Server]
        end

        subgraph Core["Core Services"]
            CRM_SVC[CRM Service<br/>Objects / Properties / Associations]
            WORKFLOW_SVC[Workflow Engine<br/>DAG Executor]
            EMAIL_SVC[Email Service<br/>Composition / Delivery]
            SCORING_SVC[Lead Scoring Service]
            FORM_SVC[Forms & Landing Pages]
            TIMELINE_SVC[Activity Timeline Service]
        end

        subgraph Platform["Platform Services"]
            SEARCH_SVC[Search & Segmentation]
            ANALYTICS_SVC[Analytics Engine]
            WEBHOOK_SVC[Webhook Delivery Service]
            INTEGRATION_SVC[Integration / Sync Service]
            NOTIFICATION_SVC[Notification Service]
        end

        subgraph EventBus["Event Bus — Kafka (80 Clusters)"]
            KAFKA_CRM[[CRM Events]]
            KAFKA_WF[[Workflow Actions<br/>Swimlanes]]
            KAFKA_EMAIL[[Email Events]]
            KAFKA_ANALYTICS[[Analytics Events]]
        end

        subgraph DataLayer["Data Layer"]
            VITESS[(Vitess / MySQL<br/>1,000+ Clusters<br/>750+ Shards)]
            HBASE[(HBase<br/>100 Clusters<br/>7,000+ RegionServers)]
            REDIS[(Redis<br/>Cache Layer)]
            ES[(Search Index<br/>Inverted Index)]
        end

        subgraph StorageLayer["Storage Layer"]
            BLOB[Blob Storage<br/>Files / Attachments / Logs]
        end
    end

    subgraph External["External Systems"]
        ISP[ISP SMTP Servers<br/>Gmail / Outlook / Yahoo]
        ENRICHMENT[Data Enrichment<br/>Clearbit / ZoomInfo]
        CRM_EXT[External CRMs<br/>Salesforce / Dynamics]
    end

    WEB --> CDN
    WEB --> CFWORKER
    MOBILE --> CFWORKER
    THIRDPARTY --> CFWORKER
    CFWORKER --> APIGW
    APIGW --> OAUTH
    APIGW --> Core
    APIGW --> Platform

    CRM_SVC --> HBASE
    CRM_SVC --> VITESS
    CRM_SVC --> REDIS
    CRM_SVC --> KAFKA_CRM
    CRM_SVC --> TIMELINE_SVC

    WORKFLOW_SVC --> KAFKA_WF
    WORKFLOW_SVC --> CRM_SVC
    WORKFLOW_SVC --> EMAIL_SVC
    WORKFLOW_SVC --> SCORING_SVC

    EMAIL_SVC --> KAFKA_EMAIL
    EMAIL_SVC --> BLOB
    EMAIL_SVC --> ISP

    SCORING_SVC --> HBASE
    SCORING_SVC --> KAFKA_CRM

    SEARCH_SVC --> ES
    SEARCH_SVC --> VITESS

    ANALYTICS_SVC --> KAFKA_ANALYTICS
    ANALYTICS_SVC --> HBASE

    WEBHOOK_SVC --> WEBHOOK_SUB
    WEBHOOK_SVC --> KAFKA_CRM

    INTEGRATION_SVC --> CRM_EXT
    INTEGRATION_SVC --> ENRICHMENT
    INTEGRATION_SVC --> CRM_SVC

    KAFKA_CRM --> WORKFLOW_SVC
    KAFKA_CRM --> SEARCH_SVC
    KAFKA_CRM --> ANALYTICS_SVC
    KAFKA_CRM --> WEBHOOK_SVC

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff8e1,stroke:#f57f17,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef platform fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef kafka fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef storage fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#c62828,stroke-width:2px

    class WEB,MOBILE,THIRDPARTY,WEBHOOK_SUB client
    class CDN,CFWORKER edge
    class APIGW,OAUTH gateway
    class CRM_SVC,WORKFLOW_SVC,EMAIL_SVC,SCORING_SVC,FORM_SVC,TIMELINE_SVC service
    class SEARCH_SVC,ANALYTICS_SVC,WEBHOOK_SVC,INTEGRATION_SVC,NOTIFICATION_SVC platform
    class KAFKA_CRM,KAFKA_WF,KAFKA_EMAIL,KAFKA_ANALYTICS kafka
    class VITESS,HBASE,REDIS,ES data
    class BLOB storage
    class ISP,ENRICHMENT,CRM_EXT external
```

---

## Data Flow: Core Paths

### Write Path — CRM Record Update

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
sequenceDiagram
    participant C as Client
    participant CF as Cloudflare Worker
    participant GW as API Gateway
    participant CRM as CRM Service
    participant DEDUP as Dedup Service
    participant HB as HBase
    participant K as Kafka
    participant WF as Workflow Engine
    participant SEARCH as Search Service
    participant TL as Timeline Service

    C->>CF: PUT /crm/v3/objects/contacts/123
    CF->>CF: Extract Hublet from API key
    CF->>GW: Route to correct Hublet
    GW->>GW: Rate limit + Auth check
    GW->>CRM: Update contact
    CRM->>DEDUP: Check dedup window (100ms)
    DEDUP-->>CRM: Not duplicate
    CRM->>HB: Write updated record
    HB-->>CRM: Ack
    CRM->>K: Emit CRM_OBJECT_UPDATED event
    CRM-->>GW: 200 OK
    GW-->>C: Response

    par Async Consumers
        K->>WF: Evaluate enrollment triggers
        K->>SEARCH: Update search index
        K->>TL: Append to timeline
    end
```

### Read Path — CRM Search

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant SEARCH as Search Service
    participant CACHE as Redis Cache
    participant IDX as Search Index
    participant CRM as CRM Service
    participant HB as HBase

    C->>GW: POST /crm/v3/objects/contacts/search
    GW->>SEARCH: Forward search request
    SEARCH->>CACHE: Check query cache
    alt Cache Hit
        CACHE-->>SEARCH: Cached result IDs
    else Cache Miss
        SEARCH->>IDX: Execute filter query
        IDX-->>SEARCH: Matching record IDs
        SEARCH->>CACHE: Cache result IDs (TTL: 30s)
    end
    SEARCH->>CRM: Hydrate records by IDs
    CRM->>HB: Batch read records
    HB-->>CRM: Record data
    CRM-->>SEARCH: Hydrated records
    SEARCH-->>GW: Search results
    GW-->>C: 200 OK + results
```

### Workflow Execution Path

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
sequenceDiagram
    participant K as Kafka (CRM Events)
    participant WF as Workflow Engine
    participant EVAL as Condition Evaluator
    participant SW as Swimlane Router
    participant KA as Kafka (Action Swimlane)
    participant WORKER as Action Worker
    participant EMAIL as Email Service
    participant CRM as CRM Service

    K->>WF: CRM_OBJECT_UPDATED event
    WF->>WF: Match against enrollment triggers
    WF->>EVAL: Evaluate entry conditions
    EVAL-->>WF: Contact qualifies for Workflow #42

    WF->>WF: Load DAG, determine next action
    WF->>SW: Route action to appropriate swimlane
    SW->>SW: Check action type + latency prediction
    SW->>KA: Publish to "fast-actions" swimlane

    KA->>WORKER: Consume action
    alt Send Email Action
        WORKER->>EMAIL: Trigger email send
        EMAIL-->>WORKER: Queued
    else Update Property Action
        WORKER->>CRM: Update contact property
        CRM-->>WORKER: Updated
    else Delay Action
        WORKER->>KA: Schedule delayed re-publish
    end

    WORKER->>WF: Action complete, advance DAG
    WF->>WF: Evaluate next step (branch/condition/action)
```

---

## Key Architectural Decisions

### 1. Monoglot Microservices (Java + Dropwizard)

| Factor | Decision |
|---|---|
| **Choice** | All 3,000+ backend services in Java using Dropwizard |
| **Why** | Maximizes shared tooling investment — one build system, one set of libraries, one monitoring stack. Engineers move between teams without language ramp-up |
| **Trade-off** | Sacrifices language specialization (e.g., Python for ML, Go for networking) for operational uniformity |
| **Mitigation** | Custom code actions in workflows support Node.js/Python in sandboxed execution |

### 2. Hublet-Based Multi-Tenancy (Pod Architecture)

| Factor | Decision |
|---|---|
| **Choice** | Each region (na1, eu1, na2) is a full, independent copy of the entire platform |
| **Why** | GDPR data residency compliance; blast radius containment; independent scaling per region |
| **Trade-off** | Massive infrastructure duplication; every feature must work across all Hublets |
| **Alternative** | Shared infrastructure with row-level tenant isolation (Salesforce model) |
| **Why not alternative** | Hublets provide stronger isolation guarantees; network-level database lockdown prevents cross-tenant traffic |

### 3. HBase for CRM Objects

| Factor | Decision |
|---|---|
| **Choice** | All CRM objects (contacts, companies, deals, custom objects) in a single HBase table |
| **Why** | Wide-column model fits naturally: each object is one row, properties are columns, unlimited horizontal scale |
| **Trade-off** | Requires careful hotspot prevention; no SQL joins (must denormalize or fan out) |
| **Mitigation** | Client-side deduplication service (100ms window) + HBase quotas per tenant |

### 4. Vitess/MySQL for Relational Data

| Factor | Decision |
|---|---|
| **Choice** | 1,000+ MySQL clusters managed by Vitess on Kubernetes |
| **Why** | Relational integrity for metadata, configurations, account data; Vitess provides horizontal sharding transparently |
| **Trade-off** | Operational complexity of managing 750+ shards per datacenter |
| **Mitigation** | Custom Vitess Kubernetes operator; OR-Tools based balancer for even distribution |

### 5. Event-Driven Architecture (Kafka Everywhere)

| Factor | Decision |
|---|---|
| **Choice** | 80 Kafka clusters, ~4,000 topics — all state changes emit events |
| **Why** | Decouples producers from consumers; enables workflow triggers, search indexing, analytics, webhooks all from the same event stream |
| **Trade-off** | Eventual consistency; debugging event chains is harder than request-response |
| **Mitigation** | Distributed tracing across Kafka consumers; swimlane isolation for workflow engine |

### 6. Kafka Swimlanes for Workflow Engine

| Factor | Decision |
|---|---|
| **Choice** | Multiple Kafka topics per action type with dedicated consumer pools |
| **Why** | Prevents noisy-neighbor: one customer's bulk enrollment doesn't block another's real-time trigger |
| **Trade-off** | Increased topic management complexity; ~12 simultaneous swimlanes |
| **Alternative** | Single queue with priority lanes |
| **Why not** | Single queue creates head-of-line blocking; swimlanes provide true isolation |

---

## Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---|---|---|
| Sync vs Async | **Async-first** (Kafka) for cross-service; **Sync** (REST) for user-facing CRM CRUD | CRM reads need immediate response; workflow execution is inherently async |
| Event-driven vs Request-response | **Event-driven** for workflow triggers, analytics, search indexing; **Request-response** for API calls | Event-driven enables decoupled fan-out; API calls need synchronous responses |
| Push vs Pull | **Push** (webhooks) for external integrations; **Pull** (Kafka consumers) for internal processing | Webhooks are standard for third-party apps; internal consumers control their own pace |
| Stateless vs Stateful | **Stateless** services with state in HBase/MySQL/Kafka | Enables horizontal scaling; Kafka provides durable state for workflow execution |
| Read vs Write optimization | **Read-optimized** for CRM (cache, replicas); **Write-optimized** for analytics (append-only HBase) | CRM is 10:1 read:write; email analytics is 1:3 read:write |
| Real-time vs Batch | **Real-time** for CRM and workflows; **Batch** for analytics aggregation and ML scoring | Users expect instant CRM updates; analytics reports can lag by minutes |
| Edge vs Origin | **Edge** routing only (Cloudflare Workers); all processing at origin Hublet | Routing decisions are lightweight; CRM logic requires data locality |

---

## Component Interaction Summary

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
flowchart LR
    subgraph Triggers["Event Sources"]
        A[Form Submission]
        B[Property Change]
        C[Email Interaction]
        D[Page Visit]
        E[API Call]
    end

    subgraph EventBus["Kafka Event Bus"]
        K[[CRM Events]]
    end

    subgraph Consumers["Event Consumers"]
        WF[Workflow Engine]
        SEARCH[Search Indexer]
        ANALYTICS[Analytics Pipeline]
        WEBHOOK[Webhook Dispatcher]
        SCORE[Lead Scorer]
    end

    Triggers --> K
    K --> Consumers

    classDef trigger fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef kafka fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef consumer fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class A,B,C,D,E trigger
    class K kafka
    class WF,SEARCH,ANALYTICS,WEBHOOK,SCORE consumer
```

Every CRM mutation produces a Kafka event. Multiple independent consumers — workflow engine, search indexer, analytics pipeline, webhook dispatcher, and lead scorer — all subscribe to the same event stream. This fan-out pattern is the backbone of HubSpot's extensibility.
