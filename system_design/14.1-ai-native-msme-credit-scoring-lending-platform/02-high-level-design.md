# 14.1 AI-Native MSME Credit Scoring & Lending Platform — High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Sources["Data Sources"]
        AA[Account Aggregator\nBank Statements + GST]
        BUR[Credit Bureau\nScore + History]
        UPI[UPI Transaction\nFeed]
        KYC[KYC Providers\nAadhaar + PAN + CKYC]
        ECOM[E-Commerce &\nAccounting Platforms]
        DEV[Device Signals\nFingerprint + Telemetry]
    end

    subgraph Gateway["Ingestion & API Gateway"]
        AAGW[AA Consent &\nData Fetch Gateway]
        APIGW[Partner API\nGateway]
        DOCGW[Document Ingestion\nOCR + Verification]
        EVTGW[Event Ingestion\nGateway]
    end

    subgraph Processing["Data Processing Layer"]
        BSP[Bank Statement\nParser & Categorizer]
        GSP[GST Return\nAnalyzer]
        TXP[Transaction Pattern\nExtractor]
        FEP[Feature Engineering\nPipeline]
    end

    subgraph Core["Core Intelligence Services"]
        CSE[Credit Scoring\nEngine]
        UDE[Underwriting\nDecision Engine]
        FRD[Fraud Detection\nService]
        PSY[Psychometric\nAssessment Service]
        EXP[Explainability\nService]
        PRC[Pricing &\nOffer Engine]
    end

    subgraph Lifecycle["Loan Lifecycle Services"]
        DIS[Disbursement\nOrchestrator]
        COL[Collection\nManagement]
        LMS[Loan Management\nSystem]
        EWS[Early Warning\nSignal Engine]
    end

    subgraph Data["Data Layer"]
        LDB[(Loan Database\nApplication + Lifecycle)]
        FTS[(Feature Store\nBorrower Profiles)]
        GDB[(Graph Database\nFraud Network)]
        AUD[(Audit Store\nDecision Trail)]
        DWH[(Analytics\nWarehouse)]
        DOC[(Document Store\nKYC + Statements)]
    end

    subgraph Consumer["Consumer Layer"]
        BOR[Borrower App\nMobile + Web]
        PAR[Partner Portal\nEmbedded Finance]
        UWR[Underwriter\nWorkbench]
        COD[Collection\nDashboard]
        MNG[Management\nAnalytics]
    end

    AA --> AAGW
    BUR & KYC --> APIGW
    UPI & ECOM --> EVTGW
    DEV --> EVTGW

    AAGW --> BSP & GSP
    APIGW --> FEP
    DOCGW --> FEP
    EVTGW --> TXP

    BSP & GSP & TXP --> FEP

    FEP --> FTS
    FEP --> CSE
    CSE --> UDE
    FRD --> UDE
    PSY --> CSE
    UDE --> EXP
    UDE --> PRC

    PRC --> DIS
    DIS --> LMS
    LMS --> COL
    EWS --> COL

    CSE --> AUD
    UDE --> AUD
    FRD --> AUD
    DIS --> AUD

    LMS --> LDB
    FEP --> FTS
    FRD --> GDB
    LMS --> DWH
    DOCGW --> DOC

    BOR --> APIGW
    PAR --> APIGW
    UWR --> UDE
    COD --> COL
    MNG --> DWH

    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef consumer fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class AA,BUR,UPI,KYC,ECOM,DEV source
    class AAGW,APIGW,DOCGW,EVTGW gateway
    class BSP,GSP,TXP,FEP,CSE,UDE,FRD,PSY,EXP,PRC,DIS,COL,LMS,EWS service
    class LDB,FTS,GDB,AUD,DWH,DOC data
    class BOR,PAR,UWR,COD,MNG consumer
```

---

## Key Design Decisions

### Decision 1: Consent-First Data Architecture with Graceful Degradation

The platform's data ingestion is built around India's Account Aggregator framework, where every data access requires explicit borrower consent with specified purpose, duration, and data type. Unlike platforms that pre-fetch and cache customer data, the AA architecture requires fresh consent and data retrieval for each lending interaction. The platform orchestrates parallel data fetches from multiple Financial Information Providers (FIPs)—fetching bank statements from Bank A, GST data from the GST Network, and investment data from a depository simultaneously—and makes credit decisions with whatever data arrives within the decision window.

**Implication:** The credit scoring engine must handle partial data gracefully. If a borrower has 3 bank accounts but only 2 FIPs respond within the timeout, the model must score on incomplete data. This requires "missingness-aware" ML models trained with intentional feature dropout—during training, random subsets of features are masked, and the model learns to produce calibrated predictions from partial feature vectors. The feature store tracks data completeness per borrower, and the model's confidence interval widens as features are missing, which the underwriting decision engine factors into its approve/decline logic (wider confidence → higher chance of manual review routing).

### Decision 2: Champion-Challenger Model Ensemble with Segment-Specific Routing

Rather than a single credit scoring model, the platform maintains a model ensemble organized by borrower segment: (1) a **bureau-plus model** for applicants with bureau history (logistic regression + gradient-boosted trees on 150+ features including bureau score, tradeline history, and alternative data), (2) a **thin-file model** for applicants with some financial footprint but no bureau history (gradient-boosted trees on 80+ alternative data features from bank statements, GST, and UPI), and (3) a **new-to-credit model** for applicants with minimal data (psychometric scores + device signals + basic KYC demographics + whatever transaction data is available). Each model is paired with a challenger that receives 10% of traffic in shadow mode, with automated promotion when the challenger's Gini coefficient exceeds the champion's by >2 points on 90-day vintage performance.

**Implication:** The model registry must maintain strict separation between segments to prevent data leakage (a model trained on bureau-rich data should not be evaluated on thin-file populations where it would perform poorly and distort metrics). The feature store must maintain segment-specific feature pipelines—the bureau-plus model uses bureau score as a top-3 feature, while the thin-file model does not have access to this feature and must rely entirely on cash flow metrics and behavioral signals. Promotion decisions require segment-specific sample sizes (minimum 5,000 scored applications with 90-day outcome observation per segment) to achieve statistical significance.

### Decision 3: Fail-Closed Fraud Detection with Pre-Disbursement Gate

The fraud detection service operates as a mandatory pre-disbursement gate: every approved loan must pass fraud scoring before disbursement is authorized. If the fraud service is unavailable, disbursement is blocked (fail-closed), not bypassed (fail-open). This is architecturally controversial—it means a fraud service outage halts all lending—but is necessary because the disbursement is irrevocable (UPI/IMPS transfers cannot be recalled), and a single undetected fraud burst during a service outage could exceed the platform's monthly fraud budget.

**Implication:** The fraud detection service requires 99.99% availability (≤52 minutes downtime/year). It uses a tiered architecture: a fast path (rule-based velocity checks + device fingerprint matching, <50 ms) handles 95% of applications, and a slow path (graph-based fraud ring detection + document forgery analysis, <2 seconds) handles applications flagged by the fast path. The fast-path rules are cached locally at the application processing nodes, enabling degraded-mode operation (rule-based fraud checks only) during a brief fraud service outage, with queued applications re-checked when the full service recovers.

### Decision 4: Event-Sourced Loan Lifecycle with Regulatory Audit Trail

Every loan state transition (application received, data fetched, scored, approved, disbursed, EMI due, paid, delinquent, etc.) is recorded as an immutable event in an append-only event store. The current loan state is a projection of these events, not a mutable row in a database. This event-sourced architecture serves two purposes: (1) regulatory audit compliance—every decision and state change has a complete, tamper-evident history that can be reconstructed at any point; and (2) analytics—vintage analysis, cohort behavior, and early warning models can replay event streams to analyze historical patterns.

**Implication:** The event store must handle 10M+ active loans with an average of 50 events per loan lifecycle (500M total events, growing at ~2M events/day). Events are partitioned by loan ID for per-loan ordering guarantees. The materialized views (current loan state, portfolio aggregations, delinquency buckets) are derived from the event stream via stream processing, with eventual consistency (≤5 seconds lag) acceptable for operational dashboards but not for state-changing operations (which always read from the event store's latest state).

### Decision 5: Embedded Finance API with Partner-Specific Policy Isolation

The embedded finance API allows partner platforms (e-commerce marketplaces, accounting SaaS, supply chain platforms) to offer credit at the point of sale. Each partner has an isolated policy configuration: credit policy (minimum revenue threshold, maximum loan amount, eligible sectors), pricing (risk-adjusted interest rates, partner-specific processing fees), revenue sharing (percentage split on interest income), and co-lending structure (bank/NBFC capital allocation ratios). Partner-specific policies are enforced at the API gateway level, ensuring that partner A's relaxed credit policy cannot be applied to partner B's applications.

**Implication:** The underwriting decision engine receives a `partner_id` context with every application and loads the corresponding policy configuration from a versioned policy store. Policy changes are versioned and audited (regulatory requirement: demonstrate that the policy in effect at the time of each loan's origination is documented). The co-lending structure requires real-time capital allocation: when partner A's allocated capital from Bank X is exhausted, the system must seamlessly route to Bank Y's allocation or pause lending for that partner—a distributed resource management problem that must handle race conditions when multiple concurrent applications compete for the same capital pool.

---

## Data Flow: Loan Application — From Application to Disbursement

```mermaid
flowchart LR
    A[Borrower Applies\nMobile / Partner API] --> B[KYC Verification\neKYC + PAN + CKYC]
    B --> C[AA Consent &\nData Fetch\nBank + GST + UPI]
    C --> D[Data Processing\nStatement Parsing +\nFeature Engineering]
    D --> E[Credit Scoring\nEnsemble Models +\nSegment Routing]
    E --> F{Underwriting\nDecision}
    F -->|Auto-Approve| G[Fraud Gate\nVelocity + Identity +\nDevice Checks]
    F -->|Manual Review| H[Underwriter\nQueue]
    F -->|Auto-Decline| I[Adverse Action\nNotice + Reasons]
    H -->|Approved| G
    H -->|Declined| I
    G -->|Pass| J[Disbursement\nUPI / IMPS\n+ e-Mandate Setup]
    G -->|Flag| K[Fraud Review\nQueue]
    J --> L[Loan Activated\nEMI Schedule\nGenerated]

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef output fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class A input
    class B,C,D,E,G,H process
    class F decision
    class I,J,K,L output
```

---

## Data Flow: Collection Lifecycle

```mermaid
flowchart TB
    A[EMI Due Date\nApproaching] --> B[Pre-Due Nudge\n3 Days Before\nSMS + Push]
    B --> C[Auto-Debit\nExecution\ne-NACH / e-Mandate]
    C --> D{Payment\nReceived?}
    D -->|Yes| E[Payment\nReconciliation\nUpdate Loan State]
    D -->|No| F[Retry Auto-Debit\nNext Business Day]
    F --> G{Second\nAttempt?}
    G -->|Success| E
    G -->|Fail| H[Soft Collection\nWhatsApp + IVR\nDays 1-15]
    H --> I{Resolved?}
    I -->|Yes| E
    I -->|No| J[Hard Collection\nCall Center +\nField Visit\nDays 15-60]
    J --> K{Resolved?}
    K -->|Yes| E
    K -->|No| L[Legal / Write-off\nAssessment]

    classDef trigger fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef output fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class A trigger
    class B,C,F,H,J process
    class D,G,I,K decision
    class E,L output
```

---

## Component Responsibilities Summary

| Component | Primary Responsibility | Key Interface |
|---|---|---|
| **AA Consent & Data Fetch Gateway** | Manage borrower consent flows via AA framework; orchestrate parallel data fetches from FIPs; handle timeout and partial data scenarios | Interacts with AA ecosystem (consent manager, FIPs); publishes raw financial data to processing pipeline |
| **Bank Statement Parser** | Extract transactions from bank statements (PDF, JSON, XML); categorize each transaction into 35 categories using NLP; compute cash flow summary metrics | Receives raw statements from AA gateway; produces categorized transaction ledger and cash flow features |
| **GST Return Analyzer** | Parse GST returns (GSTR-1, GSTR-3B); extract revenue trends, tax compliance signals, input credit patterns; cross-validate with bank statement deposits | Receives GST data from AA; produces revenue verification and compliance features |
| **Feature Engineering Pipeline** | Assemble 200+ features from all data sources into a unified feature vector; compute time-series features (trends, volatility, seasonality); handle missing data imputation | Reads from all data processors; writes to feature store; feeds credit scoring engine |
| **Credit Scoring Engine** | Route application to appropriate model (bureau-plus, thin-file, new-to-credit); execute champion-challenger ensemble; produce risk grade, PD, and confidence interval | Reads features from feature store; produces credit score + SHAP explanations |
| **Underwriting Decision Engine** | Apply hard policy rules, ML credit score, and pricing in sequence; route edge cases to manual queue; generate adverse action reasons | Receives score from CSE, fraud flag from FRD; produces approve/decline/review decision |
| **Fraud Detection Service** | Score application fraud risk in real-time; monitor post-disbursement for stacking and behavioral anomalies; detect fraud rings via graph analysis | Reads application data + device signals + bureau; produces fraud score and alerts |
| **Psychometric Assessment Service** | Administer gamified assessments; score responses for credit risk correlation; detect gaming and random-answer patterns | Receives assessment responses; produces psychometric credit score |
| **Explainability Service** | Generate SHAP-based feature attributions; produce counterfactual explanations; map model outputs to human-readable adverse action reason codes | Receives model output + feature vector; produces explanation for regulators and borrowers |
| **Disbursement Orchestrator** | Execute fund transfer via UPI/IMPS/NEFT; verify beneficiary account; register e-mandate; reconcile settlement | Receives approval from UDE; interacts with payment rails; updates LMS |
| **Collection Management** | Execute automated collection waterfall; optimize contact timing and channel; manage auto-debit retries; route to field collection | Reads delinquency state from LMS; dispatches multi-channel communications |
| **Early Warning Signal Engine** | Monitor borrower behavioral signals for distress prediction; trigger proactive restructuring offers; feed portfolio risk dashboards | Reads ongoing transaction data + repayment patterns; produces risk alerts |
| **Embedded Finance API** | Expose lending-as-a-service endpoints for partners; enforce partner-specific policies; manage co-lending capital allocation | Receives partner applications via API gateway; orchestrates full lending pipeline |
