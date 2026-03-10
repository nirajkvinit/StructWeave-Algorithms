# High-Level Design — AI-Native Agent Banking Platform for Africa

## System Context

The agent banking platform sits at the intersection of multiple systems:

- **Agent Devices** (POS terminals, smartphones, feature phones) — the edge nodes where transactions originate, often in low-connectivity environments
- **Core Banking Systems** — the ledger of record for customer accounts and settlement
- **National Identity Databases** — biometric and demographic identity registries (e.g., NIMC in Nigeria, NIDA in Tanzania)
- **Telecom Networks** — USSD channels, SMS gateways, and mobile money interoperability
- **Regulatory Systems** — real-time reporting interfaces to central banks and financial intelligence units
- **Payment Networks** — interbank switches, card networks, mobile money networks for interoperability
- **Super-Agent Networks** — hierarchical distribution networks for float management and agent support

---

## Architecture

```mermaid
---
config:
  theme: neutral
  look: neo
---
flowchart TB
    subgraph Edge["Agent Edge Layer"]
        POS[POS Terminal]
        APP[Agent Mobile App]
        USSD[USSD Channel]
        SMS[SMS Gateway]
    end

    subgraph Gateway["API Gateway & Channel Orchestration"]
        GW[API Gateway]
        CHA[Channel Adapter]
        RL[Rate Limiter]
        AUTH[Auth Service]
    end

    subgraph Core["Core Transaction Services"]
        TXN[Transaction Engine]
        LEDGER[Double-Entry Ledger]
        FLOAT[Float Management Service]
        SETTLE[Settlement Engine]
    end

    subgraph Identity["Identity & KYC Services"]
        BIO[Biometric Engine]
        KYC[KYC Service]
        DEDUP[Deduplication Service]
        IDFED[Identity Federation]
    end

    subgraph Agent["Agent Management"]
        ONBOARD[Agent Onboarding]
        PERF[Performance Scoring]
        TIER[Tier Management]
        GEO[Geo-Fencing Service]
    end

    subgraph AI["AI & Analytics Layer"]
        FRAUD[Fraud Detection Engine]
        FPRED[Float Prediction Service]
        PLACE[Placement Optimizer]
        RISK[Risk Scoring Engine]
    end

    subgraph Offline["Offline & Sync Layer"]
        SYNC[Sync Service]
        CONFLICT[Conflict Resolution]
        QUEUE[Transaction Queue]
    end

    subgraph Data["Data Layer"]
        TXDB[(Transaction DB)]
        AGDB[(Agent DB)]
        BIODB[(Biometric Store)]
        CACHE[(Distributed Cache)]
        EVENTS[(Event Stream)]
        LAKE[(Analytics Data Lake)]
    end

    subgraph External["External Integrations"]
        CBANK[Core Banking]
        NATID[National ID Systems]
        TELCO[Telecom Partners]
        REG[Regulatory Reporting]
        BILLER[Biller Network]
    end

    POS & APP & USSD & SMS --> GW
    GW --> CHA --> RL --> AUTH
    AUTH --> TXN & FLOAT & BIO

    TXN --> LEDGER --> TXDB
    TXN --> SETTLE
    FLOAT --> FPRED
    FLOAT --> CACHE

    BIO --> KYC --> DEDUP
    BIO --> BIODB
    KYC --> IDFED --> NATID

    TXN --> FRAUD --> RISK
    FRAUD --> EVENTS
    FPRED --> LAKE

    ONBOARD --> AGDB
    PERF --> AGDB
    GEO --> AGDB

    SYNC --> CONFLICT --> QUEUE --> TXN

    SETTLE --> CBANK
    TXN --> TELCO
    TXN --> BILLER
    FRAUD --> REG

    PLACE --> LAKE

    classDef edge fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef identity fill:#fce4ec,stroke:#c62828,stroke-width:2px
    classDef ai fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef external fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class POS,APP,USSD,SMS edge
    class GW,CHA,RL,AUTH gateway
    class TXN,LEDGER,FLOAT,SETTLE,SYNC,CONFLICT,QUEUE service
    class BIO,KYC,DEDUP,IDFED,ONBOARD,PERF,TIER,GEO identity
    class FRAUD,FPRED,PLACE,RISK ai
    class TXDB,AGDB,BIODB,EVENTS,LAKE data
    class CACHE cache
    class CBANK,NATID,TELCO,REG,BILLER external
```

---

## Component Descriptions

### Agent Edge Layer

| Component | Responsibility |
|---|---|
| **POS Terminal** | Dedicated hardware device with card reader, receipt printer, fingerprint scanner; runs embedded agent application; stores offline transaction queue; communicates via cellular data or Wi-Fi |
| **Agent Mobile App** | Android application for smartphone-based agents; supports camera-based facial KYC, NFC-based card reading; maintains local encrypted database for offline operations |
| **USSD Channel** | Session-based text interface for feature phone agents and customers; supports basic transactions through menu-driven flows; 182-character message limit per screen drives terse but complete interaction design |
| **SMS Gateway** | Asynchronous notification channel for transaction receipts, float alerts, and compliance notifications; fallback channel when USSD sessions time out |

### API Gateway & Channel Orchestration

| Component | Responsibility |
|---|---|
| **API Gateway** | Entry point for all agent requests; TLS termination, request routing, protocol translation (USSD text → structured API calls); payload compression for bandwidth optimization |
| **Channel Adapter** | Normalizes requests from heterogeneous channels (POS proprietary protocols, REST from mobile app, USSD session data, SMS commands) into a unified internal message format |
| **Rate Limiter** | Per-agent and per-device rate limiting; prevents abuse and protects backend from runaway devices; adaptive limits based on agent tier and historical patterns |
| **Auth Service** | Multi-factor authentication: device binding (IMEI/serial), agent PIN, and optional biometric; session management with configurable timeouts; device attestation to detect rooted/tampered devices |

### Core Transaction Services

| Component | Responsibility |
|---|---|
| **Transaction Engine** | Orchestrates the complete transaction lifecycle: request validation, compliance rule evaluation, balance checks, ledger posting, receipt generation; supports idempotent retry for network instability |
| **Double-Entry Ledger** | Immutable append-only ledger implementing double-entry bookkeeping; every transaction creates exactly two entries (debit and credit); ensures mathematical consistency; partitioned by account ID for horizontal scaling |
| **Float Management Service** | Tracks real-time cash and e-float balances for every agent; processes rebalancing requests; enforces float limits by agent tier; interfaces with AI float prediction for proactive alerts |
| **Settlement Engine** | Computes net settlement positions between agents, super-agents, and banking partners; generates settlement files for core banking; handles multi-currency settlement for cross-border corridors |

### Identity & KYC Services

| Component | Responsibility |
|---|---|
| **Biometric Engine** | Processes fingerprint and facial biometric captures; quality scoring and rejection of sub-threshold captures; template extraction using standard algorithms (minutiae-based for fingerprint, embedding-based for facial); 1:1 verification and 1:N identification |
| **KYC Service** | Manages tiered KYC levels (basic, standard, full); orchestrates document verification, biometric capture, and identity database queries; tracks KYC status and expiry |
| **Deduplication Service** | Performs 1:N biometric search against the enrolled population to detect duplicate identities; uses approximate nearest neighbor search with locality-sensitive hashing for sub-linear search time; critical for preventing identity fraud |
| **Identity Federation** | Integrates with national identity databases (NIMC, NIDA, IPRS) for identity verification; handles varying API formats, availability patterns, and response times across jurisdictions |

### AI & Analytics Layer

| Component | Responsibility |
|---|---|
| **Fraud Detection Engine** | Real-time transaction scoring using ensemble of rule-based and ML models; detects phantom transactions, collusion, float diversion; generates alerts and auto-blocks high-risk transactions; maintains per-agent risk profiles |
| **Float Prediction Service** | Time-series forecasting of per-agent cash and e-float needs; incorporates seasonality (day-of-week, market days, salary cycles), weather, and local event data; generates rebalancing recommendations |
| **Placement Optimizer** | Analyzes geographic demand patterns, population density, economic indicators, and competitive landscape to recommend optimal agent locations; identifies underserved areas for recruitment targeting |
| **Risk Scoring Engine** | Computes composite risk scores for agents, customers, and transactions; inputs include transaction patterns, biometric quality trends, device health indicators, and compliance history; outputs risk tiers that drive dynamic limit adjustment |

---

## Data Flow: Cash-In (Deposit) Transaction

```mermaid
---
config:
  theme: neutral
  look: neo
---
sequenceDiagram
    participant C as Customer
    participant A as Agent Device
    participant GW as API Gateway
    participant AUTH as Auth Service
    participant BIO as Biometric Engine
    participant TXN as Transaction Engine
    participant LED as Ledger
    participant FLT as Float Service
    participant FRD as Fraud Engine
    participant CB as Core Banking

    C->>A: Presents cash + phone number
    A->>A: Capture fingerprint
    A->>GW: POST /transactions/cash-in {amount, customer_id, biometric}
    GW->>AUTH: Validate agent session + device binding
    AUTH-->>GW: Authenticated

    GW->>BIO: Verify customer biometric (1:1)
    BIO-->>GW: Identity confirmed (score: 0.94)

    GW->>FRD: Score transaction risk
    FRD-->>GW: Risk: LOW (score: 0.12)

    GW->>TXN: Execute cash-in
    TXN->>TXN: Validate limits (daily, per-txn)
    TXN->>LED: Debit agent e-float, Credit customer account
    LED-->>TXN: Ledger entries posted

    TXN->>FLT: Update agent float balance
    FLT->>FLT: Check float threshold alerts

    TXN->>CB: Post to core banking (async)

    TXN-->>GW: Transaction receipt {txn_id, timestamp, balance}
    GW-->>A: Success response
    A->>A: Print/display receipt
    A-->>C: Receipt + confirmation
```

### Key Points in Cash-In Flow

1. **Biometric verification happens before transaction processing** — prevents unauthorized deposits and builds audit trail
2. **Fraud scoring runs in parallel with biometric check** — if either fails, transaction is rejected before any ledger mutation
3. **Agent e-float is debited** — the agent "sells" e-value to the customer in exchange for physical cash; this is the fundamental CICO economic model
4. **Core banking posting is asynchronous** — the platform maintains its own real-time ledger; core banking is updated with eventual consistency (typically < 30 seconds)
5. **Float threshold check is a side-effect** — after every transaction, the system checks whether the agent's remaining e-float is below the warning threshold (20% of allocated float) and triggers proactive rebalancing if needed

---

## Data Flow: Biometric KYC Enrollment

```mermaid
---
config:
  theme: neutral
  look: neo
---
sequenceDiagram
    participant C as Customer
    participant A as Agent Device
    participant GW as API Gateway
    participant BIO as Biometric Engine
    participant QA as Quality Assessor
    participant DD as Dedup Service
    participant NID as National ID DB
    participant KYC as KYC Service

    C->>A: Request account opening
    A->>A: Capture demographic data
    A->>A: Capture fingerprint (right index)
    A->>QA: Local quality check
    QA-->>A: Quality: GOOD (score: 78/100)

    A->>A: Capture facial image
    A->>QA: Local quality + liveness check
    QA-->>A: Quality: ACCEPTABLE (score: 65/100), Liveness: PASS

    A->>GW: POST /kyc/enroll {demographics, fingerprint, facial, agent_id}
    GW->>BIO: Extract biometric templates
    BIO-->>GW: Templates extracted

    GW->>DD: 1:N deduplication search
    DD->>DD: Search against 50M+ enrolled templates
    DD-->>GW: No duplicate found

    GW->>NID: Verify against national ID (if ID provided)
    NID-->>GW: Identity verified

    GW->>KYC: Create KYC record
    KYC->>KYC: Determine KYC tier based on data provided
    KYC-->>GW: KYC Level 2 approved

    GW-->>A: Enrollment complete {customer_id, kyc_tier, limits}
    A-->>C: Account activated, transaction limits explained
```

### Key Points in KYC Flow

1. **Local quality assessment** — rejects poor captures immediately, avoiding wasted bandwidth uploading unusable biometrics
2. **Liveness detection** — prevents spoofing with printed photos or screen replay attacks
3. **1:N deduplication is critical** — prevents one person from opening multiple accounts with slight biometric variations; this is the most computationally expensive step
4. **National ID verification is optional** — many customers lack government-issued ID; tiered KYC allows basic accounts with biometrics-only at lower transaction limits
5. **KYC tier determines transaction limits** — Level 1 (phone number only): ₦50K daily; Level 2 (biometrics): ₦200K daily; Level 3 (government ID + biometrics): ₦500K daily

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Offline-first architecture** | Device maintains local ledger and processes transactions offline with store-and-forward | 30-40% of agent locations experience daily connectivity drops; financial services cannot be unavailable when network is down |
| **Double-entry ledger as source of truth** | Platform maintains its own ledger separate from core banking | Core banking systems have high latency (500ms+) and limited throughput; platform ledger enables sub-second transactions with async core banking sync |
| **On-device biometric matching** | Biometric templates cached on device for offline 1:1 verification | Cannot depend on server connectivity for customer authentication; on-device matching enables full offline transaction capability |
| **Event-sourced transaction log** | Every state change captured as an immutable event | Enables complete audit trail, offline conflict resolution by replaying events, and streaming to analytics pipeline |
| **Multi-channel single backend** | POS, mobile app, USSD, and SMS all route to the same transaction engine | Avoids channel-specific business logic divergence; ensures consistent behavior regardless of agent's device type |
| **Regional processing nodes** | Deploy processing nodes in regional data centers close to agent concentrations | Reduces latency for 80% of transactions; provides regional resilience when inter-region connectivity fails |
| **Hierarchical float management** | Super-agent → Agent hierarchy mirrors physical cash distribution | Aligns digital float structure with physical cash logistics; super-agents serve as both digital and physical rebalancing points |
| **Configurable compliance engine** | Rule-based policy engine with per-jurisdiction rule sets | Regulatory requirements vary by country and change frequently; hardcoding rules would require code deployment for every regulatory update |
