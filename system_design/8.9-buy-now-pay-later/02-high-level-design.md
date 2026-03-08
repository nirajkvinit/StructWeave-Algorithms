# High-Level Design

## Architecture Overview

The BNPL platform is decomposed into five logical layers: **Consumer & Merchant Interface** (checkout widgets, dashboards, mobile apps), **API Gateway & Orchestration** (authentication, rate limiting, request routing), **Core Domain Services** (credit decisioning, plan management, payment orchestration, merchant settlement, collections), **Data & Intelligence** (ML feature store, risk models, analytics), and **External Integrations** (credit bureaus, payment processors, card networks, banking partners). The architecture is event-driven: every state transition in the plan lifecycle emits an event consumed by downstream services (notifications, analytics, compliance audit).

---

## System Architecture Diagram

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TB
    subgraph Clients["Consumer & Merchant Layer"]
        CW[Checkout Widget / SDK]
        CA[Consumer App]
        MD[Merchant Dashboard]
        MA[Merchant API]
    end

    subgraph Gateway["API Gateway Layer"]
        AG[API Gateway]
        AUTH[Auth Service]
        RL[Rate Limiter]
    end

    subgraph Core["Core Domain Services"]
        CDS[Credit Decision Service]
        PMS[Plan Management Service]
        POS[Payment Orchestration Service]
        MSS[Merchant Settlement Service]
        COL[Collections Service]
        VCS[Virtual Card Service]
        DRS[Dispute Resolution Service]
    end

    subgraph Intelligence["Data & Intelligence"]
        FS[Feature Store]
        RML[Risk ML Models]
        ADE[Analytics & Data Engine]
    end

    subgraph Data["Data Layer"]
        CDB[(Consumer DB)]
        PDB[(Plan & Payment DB)]
        MDB[(Merchant DB)]
        DDB[(Decision Audit DB)]
        CACHE[(Decision Cache)]
        EVT[[Event Bus]]
    end

    subgraph External["External Partners"]
        CB[Credit Bureaus]
        PP[Payment Processors]
        CN[Card Networks]
        BP[Banking Partners]
        NP[Notification Providers]
    end

    CW & CA --> AG
    MD & MA --> AG
    AG --> AUTH & RL
    AG --> CDS & PMS & POS & MSS & COL & VCS & DRS

    CDS --> FS & RML & CB
    CDS --> DDB & CACHE
    PMS --> PDB
    POS --> PP & BP
    MSS --> MDB & BP
    COL --> POS & NP
    VCS --> CN
    DRS --> PMS & POS

    CDS & PMS & POS & MSS & COL --> EVT
    EVT --> ADE & NP

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef intelligence fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef external fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class CW,CA,MD,MA client
    class AG,AUTH,RL gateway
    class CDS,PMS,POS,MSS,COL,VCS,DRS service
    class FS,RML,ADE intelligence
    class CDB,PDB,MDB,DDB,CACHE,EVT data
    class CB,PP,CN,BP,NP external
```

---

## Checkout Flow (Happy Path)

```mermaid
%%{init: {'theme': 'neutral'}}%%
sequenceDiagram
    participant C as Consumer
    participant W as Checkout Widget
    participant GW as API Gateway
    participant CD as Credit Decision
    participant FS as Feature Store
    participant CB as Credit Bureau
    participant PM as Plan Management
    participant PO as Payment Orchestration
    participant MS as Merchant Settlement
    participant M as Merchant

    C->>W: Select BNPL at checkout
    W->>GW: POST /v1/checkout/initialize
    GW->>CD: Evaluate credit (consumer_id, order)

    par Parallel Data Fetch
        CD->>FS: Get pre-computed features
        CD->>CB: Soft credit pull (async if cached)
    end

    CD->>CD: ML scoring + plan eligibility
    CD-->>GW: Approved: eligible plans with terms
    GW-->>W: Display plan options + APR disclosure

    C->>W: Select Pay-in-4
    W->>GW: POST /v1/checkout/confirm
    GW->>PM: Create installment plan
    PM->>PM: Generate payment schedule
    PM->>PO: Charge first installment
    PO-->>PM: Payment confirmed

    par Post-Confirmation
        PM->>MS: Queue merchant settlement
        PM-->>GW: Plan created + confirmation
        MS->>M: Settlement (T+1 to T+3)
    end

    GW-->>W: Order confirmed + plan details
    W-->>C: Show confirmation + payment schedule
```

---

## Payment Collection Flow

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TB
    subgraph Scheduler["Collection Scheduler"]
        CS[Cron: Identify Due Payments]
        BG[Batch Generator]
    end

    subgraph Collection["Collection Engine"]
        CE[Collection Executor]
        RL[Retry Logic]
        FH[Failure Handler]
    end

    subgraph PostCollection["Post-Collection"]
        PS[Plan State Updater]
        DN[Dunning Engine]
        LF[Late Fee Calculator]
        HP[Hardship Evaluator]
    end

    subgraph External["External"]
        PP[Payment Processor]
        NP[Notification Provider]
    end

    CS -->|Due payments query| BG
    BG -->|Payment batches| CE
    CE -->|Charge request| PP
    PP -->|Success| PS
    PP -->|Failure| RL
    RL -->|Retry exhausted| FH
    FH --> LF --> DN
    DN -->|Notify consumer| NP
    FH -->|Eligible| HP
    PS -->|All paid| PS
    PS -->|Plan complete| PS

    classDef scheduler fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef collection fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef post fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef ext fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class CS,BG scheduler
    class CE,RL,FH collection
    class PS,DN,LF,HP post
    class PP,NP ext
```

---

## Key Design Decisions

### 1. Synchronous Credit Decision vs. Asynchronous Pre-Approval

| Option | Pros | Cons |
|--------|------|------|
| **Synchronous at checkout** (chosen) | Fresh data, accurate risk assessment, regulatory compliance (point-of-sale disclosure) | Adds latency to checkout; requires low-latency ML pipeline |
| Asynchronous pre-approval | Zero checkout latency; pre-computed limits | Stale risk data; consumer circumstances change; regulatory concerns about pre-approved credit |

**Decision**: Synchronous credit decision at checkout with a pre-computed feature store to minimize latency. Pre-qualification is offered as a separate, non-binding flow.

### 2. Plan Storage: Relational vs. Document Store

| Option | Pros | Cons |
|--------|------|------|
| **Relational DB** (chosen) | ACID transactions for plan state changes; complex queries for collections; referential integrity | Schema rigidity; migration cost for new plan types |
| Document store | Flexible schema for varied plan types | Weaker consistency guarantees; complex aggregation queries |

**Decision**: Relational database for plans and payments. The installment lifecycle requires strong consistency (a payment must be atomically marked as collected and the plan balance updated). Plan type variations are handled via a discriminator column and type-specific JSON metadata.

### 3. Merchant Settlement: Real-Time vs. Batch

| Option | Pros | Cons |
|--------|------|------|
| Real-time settlement | Merchants receive funds immediately | Higher operational risk; harder to reconcile; expensive bank transfer fees |
| **Batch settlement (T+1 to T+3)** (chosen) | Lower transfer costs; reconciliation window; net settlement reduces transfers | Merchants wait 1--3 days for funds |

**Decision**: Batch settlement with configurable cadence (T+1 for premium merchants, T+3 for standard). Net settlement aggregates all transactions and refunds per merchant per settlement window, reducing the number of bank transfers.

### 4. Virtual Card Strategy: Pre-Generated Pool vs. On-Demand

| Option | Pros | Cons |
|--------|------|------|
| Pre-generated pool | Instant issuance; no latency at checkout | Unused cards waste number space; management overhead |
| **On-demand generation** (chosen) | No waste; card created only when needed | Adds ~500ms to checkout for virtual card path |

**Decision**: On-demand virtual card generation with a small warm pool for latency-sensitive flows. Cards are single-use, locked to the merchant and amount, and expire within 24 hours if unused.

### 5. Collections Architecture: Centralized vs. Per-Plan State Machine

| Option | Pros | Cons |
|--------|------|------|
| Centralized collections engine | Single orchestrator; easier to audit | Single point of failure; complex state management at scale |
| **Per-plan state machine** (chosen) | Each plan independently tracks its collection state; resilient to partial failures | State explosion across 50M plans; requires efficient state queries |

**Decision**: Each installment plan has an embedded state machine tracking its lifecycle (active → payment_due → collecting → paid / overdue → delinquent → hardship / charge_off → completed). A batch scheduler identifies plans needing action, but each plan's state transitions are self-contained and idempotent.

---

## Data Flow Summary

| Flow | Source | Destination | Pattern | Volume |
|------|--------|-------------|---------|--------|
| Credit decision | Checkout widget | Credit Decision Service → Feature Store → Credit Bureau | Sync request-response | 525 peak TPS |
| Plan creation | Credit Decision Service | Plan Management Service → Plan DB | Sync (within checkout) | ~23 TPS avg |
| First installment | Plan Management Service | Payment Orchestration → Payment Processor | Sync (blocks checkout) | ~23 TPS avg |
| Scheduled collection | Collection Scheduler | Payment Orchestration → Payment Processor | Batch (3 windows/day) | 2M per window |
| Merchant settlement | Settlement Scheduler | Merchant Settlement Service → Banking Partner | Batch (daily) | 500K merchants/day |
| Dunning notification | Collections Service | Notification Provider | Async event-driven | ~400K/day |
| Virtual card auth | Card Network | Virtual Card Service → Plan Management | Sync callback | ~200K/day |
| Dispute | Consumer / Merchant | Dispute Resolution Service | Async workflow | ~15K/day |
| Feature refresh | Analytics Engine | Feature Store | Batch (hourly/daily) | 50M consumer vectors |

---

## Component Responsibilities

| Component | Responsibilities | Key Dependencies |
|-----------|-----------------|------------------|
| **Credit Decision Service** | Evaluate creditworthiness, determine plan eligibility, generate TILA disclosures, log decisions for audit | Feature Store, Risk ML Models, Credit Bureaus |
| **Plan Management Service** | Create plans, manage lifecycle states, calculate payment schedules, handle refund adjustments | Plan DB, Payment Orchestration |
| **Payment Orchestration Service** | Execute payment collection, manage retries, handle partial payments, route to payment processors | Payment Processors, Banking Partners |
| **Merchant Settlement Service** | Calculate net settlements, generate settlement files, execute bank transfers, reconcile | Merchant DB, Banking Partners |
| **Collections Service** | Manage delinquent plans, execute dunning sequences, assess late fees, offer hardship programs | Plan Management, Payment Orchestration, Notification Providers |
| **Virtual Card Service** | Issue single-use virtual cards, handle card network authorization callbacks, manage card lifecycle | Card Networks, Plan Management |
| **Dispute Resolution Service** | Intake disputes, manage evidence collection, adjudicate outcomes, execute refunds | Plan Management, Payment Orchestration |
| **Feature Store** | Pre-compute and serve consumer risk features for ML scoring; refresh on schedule | Analytics Engine, Consumer DB, Credit Bureau data |
| **Risk ML Models** | Score consumers for default probability; serve predictions at checkout latency | Feature Store, Model Registry |
