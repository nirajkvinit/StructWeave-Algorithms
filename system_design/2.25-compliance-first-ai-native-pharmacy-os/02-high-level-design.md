# High-Level Design

[Back to Index](./00-index.md)

---

## System Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer"]
        direction LR
        POS["Dispensing Terminal<br/>(POS + Rx Verification)"]
        BackOffice["Back-Office Portal<br/>(Admin + Reports)"]
        MobileApp["Mobile App<br/>(Pharmacist Tools)"]
        PatientPortal["Patient Portal<br/>(Refills + History)"]
    end

    subgraph EdgeLayer["Edge / Gateway Layer"]
        CDN["CDN<br/>(Static Assets)"]
        LB["Load Balancer<br/>(L7)"]
        APIGW["API Gateway<br/>(Kong/Envoy)"]
        RateLimiter["Rate Limiter"]
        AuthN["Auth Service<br/>(OIDC + MFA)"]
    end

    subgraph ComplianceLayer["Compliance Engine Layer"]
        OPA["OPA Policy<br/>Decision Point"]
        DEAEngine["DEA Compliance<br/>Engine"]
        CDSCOEngine["CDSCO Compliance<br/>Engine"]
        AuditSvc["Audit Trail<br/>Service"]
        ConsentMgr["Consent<br/>Manager"]
    end

    subgraph CoreServices["Core Services Layer"]
        InvSvc["Inventory<br/>Service"]
        DispSvc["Dispensing<br/>Service"]
        SubstSvc["Substitution<br/>Service"]
        RxSvc["Prescription<br/>Service"]
        PatientSvc["Patient<br/>Service"]
        ClaimsSvc["Claims<br/>Service"]
        SupplierSvc["Supplier<br/>Service"]
        AnalyticsSvc["Analytics<br/>Service"]
    end

    subgraph AIPlatform["AI Platform Layer"]
        DemandAI["Demand<br/>Forecasting"]
        SubstAI["Therapeutic<br/>Equivalence AI"]
        AnomalyAI["Anomaly<br/>Detection"]
        ExpiryAI["Expiry<br/>Optimizer"]
        DDIAI["DDI Enhancement<br/>Model"]
        DrugKB["Drug Knowledge<br/>Base Service"]
    end

    subgraph DataLayer["Data Layer"]
        PG[("PostgreSQL<br/>(Primary)")]
        PGReplica[("PostgreSQL<br/>(Read Replica)")]
        Redis[("Redis Cluster<br/>(Cache + Session)")]
        Kafka[("Kafka<br/>(Event Store)")]
        Neo4j[("Neo4j<br/>(Drug Graph)")]
        S3[("Object Storage<br/>(Documents)")]
        TimescaleDB[("TimescaleDB<br/>(Metrics)")]
    end

    subgraph ExternalSystems["External Integrations"]
        PMP["State PMP<br/>Systems"]
        Insurance["Insurance<br/>Payers (NCPDP)"]
        Suppliers["Drug<br/>Wholesalers"]
        FDAOrangeBook["FDA Orange<br/>Book"]
        RxNorm["RxNorm /<br/>DrugBank"]
        ERx["E-Prescribing<br/>Networks"]
        Payment["Payment<br/>Processors"]
    end

    ClientLayer --> CDN
    ClientLayer --> LB
    LB --> APIGW
    APIGW --> RateLimiter --> AuthN
    AuthN --> OPA

    OPA --> CoreServices
    CoreServices --> ComplianceLayer
    CoreServices --> AIPlatform
    CoreServices --> DataLayer
    AIPlatform --> DrugKB --> Neo4j

    CoreServices --> ExternalSystems

    PG --> PGReplica
    CoreServices --> Kafka
    Kafka --> AuditSvc

    style ClientLayer fill:#e3f2fd
    style ComplianceLayer fill:#fff3e0
    style AIPlatform fill:#e8f5e9
    style DataLayer fill:#fce4ec
    style ExternalSystems fill:#f3e5f5
```

---

## Component Overview

### Client Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Dispensing Terminal** | Electron/React, SQLite | Primary POS with offline capability, Rx verification |
| **Back-Office Portal** | React SPA | Admin, reporting, inventory management |
| **Mobile App** | React Native | Pharmacist on-the-go, alerts, approvals |
| **Patient Portal** | React SPA | Refill requests, prescription history, billing |

### Edge / Gateway Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| **CDN** | CloudFront/Fastly | Static assets, reduced latency |
| **Load Balancer** | ALB/HAProxy | L7 routing, SSL termination |
| **API Gateway** | Kong/Envoy | Routing, rate limiting, request transformation |
| **Auth Service** | Keycloak/Auth0 | OIDC, SAML, MFA for controlled substances |

### Compliance Engine Layer

| Component | Technology | Purpose |
|-----------|------------|---------|
| **OPA Policy Decision Point** | Open Policy Agent | Real-time policy evaluation |
| **DEA Compliance Engine** | Custom + OPA | Schedule verification, ARCOS preparation |
| **CDSCO Compliance Engine** | Custom + OPA | Schedule H/H1/X rules |
| **Audit Trail Service** | Kafka + PostgreSQL | Immutable event log |
| **Consent Manager** | Custom | Patient consent tracking (HIPAA) |

### Core Services Layer

| Service | Responsibility | Key APIs |
|---------|---------------|----------|
| **Inventory Service** | Stock levels, batches, expiry, FEFO | `GET/POST /inventory`, `POST /receive`, `POST /adjust` |
| **Dispensing Service** | Transaction processing, POS | `POST /dispense`, `POST /return`, `GET /transaction` |
| **Substitution Service** | Generic alternatives, cost savings | `GET /equivalents`, `POST /substitute` |
| **Prescription Service** | Rx management, refills | `POST /prescription`, `POST /refill`, `GET /patient/rx` |
| **Patient Service** | Patient profiles, allergies | `GET/POST /patient`, `GET /patient/medications` |
| **Claims Service** | Insurance adjudication | `POST /claim`, `GET /claim/status`, `POST /reversal` |
| **Supplier Service** | POs, vendor management | `POST /po`, `GET /vendors`, `POST /receive` |
| **Analytics Service** | Reports, dashboards | `GET /reports`, `GET /kpis`, `GET /trends` |

### AI Platform Layer

| Component | Model Type | Purpose |
|-----------|-----------|---------|
| **Demand Forecasting** | Prophet + XGBoost | Predict drug demand, reorder points |
| **Therapeutic Equivalence AI** | Ranking model | Score and rank substitution options |
| **Anomaly Detection** | Isolation Forest + Rules | Detect diversion, fraud |
| **Expiry Optimizer** | Regression + Rules | Predict waste, suggest actions |
| **DDI Enhancement** | NLP + Graph | Enhance DDI alerts with clinical context |
| **Drug Knowledge Base** | Graph Service | Query drug relationships |

### Data Layer

| Store | Technology | Data Type |
|-------|------------|-----------|
| **Primary DB** | PostgreSQL | Transactional data |
| **Read Replica** | PostgreSQL | Analytics queries |
| **Cache** | Redis Cluster | Session, formulary, drug catalog |
| **Event Store** | Kafka | Audit events, CDC |
| **Drug Graph** | Neo4j | Drug relationships, DDI |
| **Documents** | S3 | Prescriptions, reports, audit exports |
| **Metrics** | TimescaleDB | Operational metrics |

---

## Data Flow Diagrams

### 1. Prescription Fulfillment Flow

```mermaid
sequenceDiagram
    autonumber
    participant Term as Terminal
    participant APIGW as API Gateway
    participant Auth as Auth Service
    participant OPA as OPA Policy
    participant RxSvc as Rx Service
    participant DDI as DDI Check
    participant SubstSvc as Substitution
    participant InvSvc as Inventory
    participant ClaimsSvc as Claims
    participant DispSvc as Dispensing
    participant Audit as Audit Trail

    Term->>APIGW: POST /prescription/fill
    APIGW->>Auth: Validate token
    Auth-->>APIGW: User context (role: technician)
    APIGW->>OPA: Can user fill Rx?
    OPA-->>APIGW: ALLOW (with constraints)

    APIGW->>RxSvc: Get prescription details
    RxSvc-->>APIGW: Rx data (drug, qty, patient)

    APIGW->>DDI: Check interactions
    DDI-->>APIGW: DDI alerts (severity: moderate)

    alt Substitution Eligible (DAW=0)
        APIGW->>SubstSvc: Find equivalents
        SubstSvc-->>APIGW: Generic options with savings
        APIGW-->>Term: Show substitution options
        Term->>APIGW: Select generic
    end

    APIGW->>InvSvc: Reserve inventory (FEFO)
    InvSvc-->>APIGW: Batch allocated (lot, expiry)

    APIGW->>ClaimsSvc: Submit insurance claim
    ClaimsSvc->>Insurance: NCPDP B1 request
    Insurance-->>ClaimsSvc: B1 response (copay: $10)
    ClaimsSvc-->>APIGW: Claim adjudicated

    APIGW->>DispSvc: Create transaction
    DispSvc->>OPA: Final compliance check
    OPA-->>DispSvc: ALLOW
    DispSvc->>Audit: Log transaction
    DispSvc-->>APIGW: Transaction created (pending verification)

    APIGW-->>Term: Ready for pharmacist verification

    Note over Term: Pharmacist reviews and verifies
    Term->>APIGW: POST /transaction/{id}/verify
    APIGW->>Auth: Validate pharmacist credential
    Auth-->>APIGW: User context (role: pharmacist)

    APIGW->>DispSvc: Complete transaction
    DispSvc->>InvSvc: Deduct inventory
    DispSvc->>Audit: Log verification
    DispSvc-->>APIGW: Transaction complete

    APIGW-->>Term: Print label, ready for pickup
```

### 2. Controlled Substance Dispensing Flow

```mermaid
sequenceDiagram
    autonumber
    participant Term as Terminal
    participant APIGW as API Gateway
    participant Auth as Auth Service
    participant OPA as OPA Policy
    participant DEA as DEA Engine
    participant PMP as State PMP
    participant InvSvc as Inventory
    participant DispSvc as Dispensing
    participant CSLog as CS Log Service
    participant Audit as Audit Trail

    Term->>APIGW: POST /prescription/fill (Schedule II)
    APIGW->>Auth: Validate pharmacist + MFA
    Auth-->>APIGW: Pharmacist verified (MFA complete)

    APIGW->>OPA: Can fill Schedule II?
    OPA->>DEA: Check DEA compliance
    DEA-->>OPA: Pharmacy DEA active, schedule authorized
    OPA-->>APIGW: ALLOW (CS protocol required)

    APIGW->>PMP: Query patient history
    PMP-->>APIGW: Patient CS history (last 12 months)

    Note over APIGW: Check for red flags
    alt Red Flags Detected
        APIGW-->>Term: Alert: Early refill / multiple pharmacies
        Term->>APIGW: Pharmacist override with reason
    end

    APIGW->>DEA: Validate prescription
    DEA-->>APIGW: Rx valid (< 90 days, original only)

    APIGW->>InvSvc: Check CS inventory
    InvSvc-->>APIGW: Available (lot #ABC123, qty: 50)

    APIGW->>CSLog: Pre-log dispensing intent
    CSLog-->>APIGW: Intent logged (running balance: 50)

    APIGW->>InvSvc: Reserve CS inventory
    InvSvc-->>APIGW: Reserved (atomic decrement)

    APIGW->>DispSvc: Create CS transaction
    DispSvc->>CSLog: Log dispensing
    CSLog-->>DispSvc: Logged (running balance: 20)

    DispSvc->>PMP: Report dispensing (async)
    DispSvc->>Audit: Immutable audit entry
    DispSvc-->>APIGW: Transaction complete

    APIGW-->>Term: Print label, patient signature required

    Note over Term: Collect patient signature
    Term->>APIGW: POST /transaction/{id}/signature
    APIGW->>CSLog: Attach signature hash
    APIGW-->>Term: Dispensing complete
```

### 3. Inventory Replenishment Flow

```mermaid
sequenceDiagram
    autonumber
    participant AI as Demand AI
    participant InvSvc as Inventory Service
    participant SupplierSvc as Supplier Service
    participant ExpiryAI as Expiry Optimizer
    participant Mgr as Pharmacy Manager
    participant Supplier as Drug Wholesaler

    Note over AI: Daily forecast job (2 AM)
    AI->>InvSvc: Get historical sales (90 days)
    InvSvc-->>AI: Sales data by SKU

    AI->>AI: Run Prophet + XGBoost ensemble
    AI-->>AI: 14-day forecast per SKU

    AI->>InvSvc: Get current inventory levels
    InvSvc-->>AI: Stock levels with batches

    AI->>AI: Calculate reorder recommendations
    Note over AI: EOQ, safety stock, lead time

    AI->>ExpiryAI: Get expiry risk
    ExpiryAI-->>AI: At-risk batches

    AI->>SupplierSvc: Draft PO recommendations
    SupplierSvc-->>AI: PO draft with preferred suppliers

    SupplierSvc-->>Mgr: Notification: PO recommendations ready

    Mgr->>SupplierSvc: Review and approve PO

    alt Auto-Approved (under threshold)
        SupplierSvc->>Supplier: Submit PO (EDI 850)
    else Manual Review Required
        SupplierSvc-->>Mgr: Highlight exceptions
        Mgr->>SupplierSvc: Approve/modify
        SupplierSvc->>Supplier: Submit PO (EDI 850)
    end

    Supplier-->>SupplierSvc: PO Acknowledgment (EDI 855)
    SupplierSvc-->>Mgr: PO confirmed, ETA: 2 days

    Note over Supplier: Shipment arrives
    Mgr->>InvSvc: Receive shipment
    InvSvc->>InvSvc: Scan barcodes, verify quantities
    InvSvc->>InvSvc: Create batches (lot, expiry)
    InvSvc-->>Mgr: Receiving complete
```

---

## Key Architectural Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|-------------------------|-----------|
| **Compliance Enforcement** | OPA (Open Policy Agent) | Custom rules engine, Drools | Declarative, auditable, language-agnostic |
| **Inventory Consistency** | CRDT (PN-Counter) for multi-terminal | Event sourcing only, Last-write-wins | Conflict-free merge, offline support |
| **Drug Knowledge Store** | Neo4j Graph DB | Relational with joins, Document DB | Fast graph traversal for DDI and equivalence |
| **AI Model Hosting** | Self-hosted (HIPAA requirement) | Cloud ML APIs | Patient data cannot leave tenant |
| **Event Backbone** | Kafka | RabbitMQ, Redis Streams | Durability, replay for audit |
| **Caching Strategy** | Redis Cluster | Memcached, In-process | Distributed, persistence option |
| **POS Offline Storage** | SQLite + CRDT | IndexedDB, LocalStorage | Mature, ACID, good CRDT library support |

---

## Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---------|----------|---------------|
| **Sync vs Async** | Sync for dispensing, Async for analytics/reporting | Transaction latency critical |
| **Event-driven vs Request-response** | Hybrid - sync for transactions, events for audit/sync | Best of both worlds |
| **Push vs Pull** | Push for alerts, Pull for reports | Real-time alerts, on-demand reports |
| **Stateless vs Stateful** | Stateless services, stateful terminals | Horizontal scaling, offline capability |
| **Read-heavy vs Write-heavy** | Write-heavy (transactions), read-heavy (drug catalog) | Separate read/write paths |
| **Real-time vs Batch** | Real-time dispensing, batch for forecasting/ARCOS | Different latency requirements |
| **Edge vs Origin** | Edge for POS (offline), origin for compliance | Resilience + compliance |

---

## Multi-Terminal Sync Architecture

```mermaid
flowchart TB
    subgraph Pharmacy["Pharmacy Store"]
        subgraph Terminals["POS Terminals"]
            T1["Terminal 1<br/>SQLite + CRDT"]
            T2["Terminal 2<br/>SQLite + CRDT"]
            T3["Terminal 3<br/>SQLite + CRDT"]
        end

        subgraph LocalSync["Local Sync Layer"]
            mDNS["mDNS Discovery"]
            Leader["Leader Terminal<br/>(elected)"]
            LocalEventLog["Local Event Log"]
        end
    end

    subgraph Cloud["Cloud Services"]
        SyncAPI["Sync API"]
        EventHub["Kafka Event Hub"]
        MasterDB["Master Database"]
        ConflictResolver["Conflict Resolver"]
    end

    T1 <-->|CRDT Delta| Leader
    T2 <-->|CRDT Delta| Leader
    T3 <-->|CRDT Delta| Leader

    T1 <--> mDNS
    T2 <--> mDNS
    T3 <--> mDNS

    Leader -->|Batch Sync| SyncAPI
    SyncAPI --> EventHub
    EventHub --> MasterDB

    ConflictResolver --> EventHub

    style Pharmacy fill:#e8f5e9
    style Cloud fill:#e3f2fd
```

### Sync Modes

| Mode | Trigger | Data Synced | Conflict Strategy |
|------|---------|-------------|-------------------|
| **Immediate** | Transaction complete | Transaction, inventory delta | CRDT merge |
| **Periodic** | Every 5 minutes | All pending deltas | CRDT merge |
| **On-Reconnect** | Network restored | Full delta since last sync | CRDT merge + AI resolution |
| **Batch** | End of day | Analytics aggregates | Last-write-wins |

---

## State Machine: Prescription Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Received: E-Rx received / Manual entry
    Received --> Queued: Passed validation
    Received --> Rejected: Failed validation

    Queued --> InProgress: Technician starts filling
    InProgress --> ReadyForVerification: Fill complete
    InProgress --> OnHold: Issue (stock, DUR)

    OnHold --> InProgress: Issue resolved
    OnHold --> Cancelled: Cannot resolve

    ReadyForVerification --> Verified: Pharmacist approves
    ReadyForVerification --> ReturnToFill: Pharmacist rejects
    ReturnToFill --> InProgress: Corrections made

    Verified --> Sold: Patient picks up / Delivery
    Verified --> WillCall: Stored for pickup
    WillCall --> Sold: Patient picks up
    WillCall --> ReturnToStock: Not picked up (14 days)

    Sold --> Returned: Patient returns
    Returned --> [*]
    ReturnToStock --> [*]
    Cancelled --> [*]
    Rejected --> [*]
```

---

## Failure Modes and Handling

| Failure Mode | Detection | Impact | Handling |
|--------------|-----------|--------|----------|
| **Cloud Unreachable** | Health check timeout | No sync, limited insurance | Offline mode, queue transactions |
| **PMP API Down** | HTTP 503, timeout | Cannot check CS history | Proceed with enhanced review, retry async |
| **Insurance Payer Down** | NCPDP timeout | Cannot adjudicate | Cash price fallback, retry queue |
| **Database Primary Down** | Connection refused | Write failure | Failover to replica (promotion) |
| **Leader Terminal Down** | Heartbeat miss | Local sync disrupted | Re-election via Raft |
| **OPA Policy Engine Down** | gRPC timeout | Compliance check fails | Fail-closed (deny), alert |
| **Redis Cache Down** | Connection refused | Increased DB load | Bypass cache, direct DB |
| **Kafka Down** | Producer timeout | Audit events delayed | Local queue, replay on recovery |

---

## Network Topology

```mermaid
flowchart TB
    subgraph Internet["Internet"]
        Users["Remote Users<br/>(Patient Portal)"]
        Partners["Partners<br/>(Wholesalers, Payers)"]
    end

    subgraph CloudRegion["Cloud Region (Primary)"]
        CloudLB["Cloud Load Balancer"]
        CloudServices["Cloud Services<br/>(API, AI, Data)"]
        CloudDB["Primary Database"]
    end

    subgraph DRRegion["Cloud Region (DR)"]
        DRLB["DR Load Balancer"]
        DRServices["DR Services<br/>(Warm Standby)"]
        DRDB["Replica Database"]
    end

    subgraph PharmacyLAN["Pharmacy Local Network"]
        Router["Store Router"]
        Terminals["POS Terminals"]
        Printer["Label Printers"]
        Scanner["Barcode Scanners"]
    end

    Users --> CloudLB
    Partners --> CloudLB
    CloudLB --> CloudServices --> CloudDB

    CloudDB -->|Replication| DRDB

    Router --> CloudLB
    Terminals --> Router
    Printer --> Terminals
    Scanner --> Terminals

    Terminals <-->|mDNS| Terminals

    style CloudRegion fill:#e3f2fd
    style DRRegion fill:#fff3e0
    style PharmacyLAN fill:#e8f5e9
```

---

## Security Zones

| Zone | Components | Trust Level | Controls |
|------|------------|-------------|----------|
| **Public** | CDN, Patient Portal | Untrusted | WAF, DDoS protection |
| **DMZ** | API Gateway, Load Balancer | Semi-trusted | Rate limiting, authentication |
| **Application** | Core Services, AI | Trusted | mTLS, RBAC |
| **Data** | Databases, Cache | Highly Trusted | Encryption, network isolation |
| **Compliance** | OPA, Audit, CS Log | Highly Trusted | Immutable logs, HSM |
| **Pharmacy LAN** | Terminals, Printers | Trusted (local) | VPN, local firewall |

---

## Technology Stack Summary

| Layer | Primary | Alternative | Selection Criteria |
|-------|---------|-------------|-------------------|
| **Load Balancer** | ALB | HAProxy | Managed vs self-hosted |
| **API Gateway** | Kong | Envoy, AWS API Gateway | Plugin ecosystem, OIDC support |
| **Auth** | Keycloak | Auth0, Okta | Self-hosted for HIPAA |
| **Policy Engine** | OPA | Cedar, Custom | Community, Rego language |
| **Primary DB** | PostgreSQL | CockroachDB | Maturity, extensions |
| **Graph DB** | Neo4j | Amazon Neptune | Cypher support, AuraDB |
| **Cache** | Redis Cluster | Memcached | Persistence, data structures |
| **Message Queue** | Kafka | Pulsar, RabbitMQ | Durability, replay |
| **Object Storage** | S3 | GCS, Azure Blob | Cost, integration |
| **ML Framework** | PyTorch | TensorFlow | Model flexibility |
| **Metrics** | TimescaleDB | InfluxDB, Prometheus | SQL queries, scale |
