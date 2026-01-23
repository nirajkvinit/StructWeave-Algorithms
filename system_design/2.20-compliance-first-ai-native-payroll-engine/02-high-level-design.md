# High-Level Design

> **Navigation**: [Index](./00-index.md) | [Requirements](./01-requirements-and-estimations.md) | **HLD** | [LLD](./03-low-level-design.md) | [Deep Dive](./04-deep-dive-and-bottlenecks.md) | [Scale](./05-scalability-and-reliability.md) | [Security](./06-security-and-compliance.md) | [Observability](./07-observability.md) | [Interview Guide](./08-interview-guide.md)

---

## 1. System Architecture

### 1.1 Complete Architecture Diagram

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        direction TB
        AdminUI[Admin Portal<br/>Payroll Operations]
        EmployeeSSP[Employee<br/>Self-Service Portal]
        ManagerUI[Manager Portal<br/>Approvals]
        APIClient[API Clients<br/>HRIS/ERP Integration]
        MobileApp[Mobile App]
    end

    subgraph Gateway["API Gateway Layer"]
        APIGW[API Gateway]
        AuthN[Authentication<br/>OIDC/SAML/SSO]
        AuthZ[Authorization<br/>RBAC/ABAC]
        RateLimiter[Rate Limiter<br/>Per Tenant]
        TenantRouter[Tenant Router<br/>Data Isolation]
    end

    subgraph RuleManagement["Rule Management Layer"]
        RuleDiscovery[Rule Discovery<br/>Service]
        HumanApproval[Human Approval<br/>Workflow]
        RuleVersioning[Rule Version<br/>Control]
        JurisdictionMapper[Jurisdiction<br/>Mapper]
        RuleCache[Rule Cache<br/>Per Jurisdiction]
    end

    subgraph PayrollEngine["Payroll Engine Layer"]
        CalcOrchestrator[Calculation<br/>Orchestrator]
        GrossCalc[Gross Pay<br/>Calculator]
        TaxEngine[Tax Engine<br/>Multi-Jurisdiction]
        DeductionEngine[Deduction<br/>Engine]
        GarnishmentEngine[Garnishment<br/>Processor]
        NetPayCalc[Net Pay<br/>Calculator]
    end

    subgraph AIPlatform["AI Platform Layer"]
        LegalDocIngestion[Legal Document<br/>Ingestion]
        OCRService[OCR Service]
        NLPPipeline[NLP Pipeline<br/>NER + Classification]
        LLMServing[LLM Serving<br/>vLLM Cluster]
        RuleExtractor[Rule Extractor]
        ExplainEngine[Explainability<br/>Engine]
        ChangeMonitor[Regulatory<br/>Change Monitor]
        VectorDB[(Vector DB<br/>Embeddings)]
    end

    subgraph BatchProcessing["Batch Processing Layer"]
        PayRunScheduler[Pay Run<br/>Scheduler]
        BatchOrchestrator[Batch<br/>Orchestrator]
        WorkerPool[Worker Pool<br/>Calculation Workers]
        ResultAggregator[Result<br/>Aggregator]
    end

    subgraph DataLayer["Data Layer"]
        EmployeeDB[(Employee<br/>Database)]
        RuleStore[(Rule Store<br/>Versioned)]
        PayrollDB[(Payroll<br/>Database)]
        TaxTableDB[(Tax Tables<br/>7,040+ Jurisdictions)]
        AuditLog[(Audit Log<br/>Immutable)]
        LegalDocStore[(Legal Document<br/>Store)]
        CalculationArchive[(Calculation<br/>Archive)]
    end

    subgraph ComplianceLayer["Compliance Layer"]
        HumanReviewQueue[Human Review<br/>Queue]
        ComplianceReporting[Compliance<br/>Reporting]
        AuditTrailGen[Audit Trail<br/>Generator]
        ExportService[Export Service<br/>W-2, 1099]
    end

    subgraph External["External Systems"]
        TaxTableProvider[Tax Table<br/>Provider]
        BankingPartner[Banking Partner<br/>ACH/Wire]
        TaxFiling[Tax Filing<br/>Service]
        HRISPartners[HRIS Partners<br/>Workday, ADP]
    end

    %% Client to Gateway
    Clients --> APIGW
    APIGW --> AuthN
    AuthN --> AuthZ
    AuthZ --> RateLimiter
    RateLimiter --> TenantRouter

    %% Gateway to Services
    TenantRouter --> RuleManagement
    TenantRouter --> PayrollEngine
    TenantRouter --> AIPlatform
    TenantRouter --> BatchProcessing
    TenantRouter --> ComplianceLayer

    %% AI Platform Flow
    LegalDocIngestion --> OCRService
    OCRService --> NLPPipeline
    NLPPipeline --> LLMServing
    LLMServing --> RuleExtractor
    RuleExtractor --> RuleDiscovery
    ChangeMonitor --> RuleDiscovery
    LLMServing --> VectorDB
    LLMServing --> ExplainEngine

    %% Rule Management Flow
    RuleDiscovery --> HumanApproval
    HumanApproval --> RuleVersioning
    RuleVersioning --> JurisdictionMapper
    JurisdictionMapper --> RuleCache

    %% Payroll Engine Flow
    CalcOrchestrator --> GrossCalc
    GrossCalc --> TaxEngine
    TaxEngine --> DeductionEngine
    DeductionEngine --> GarnishmentEngine
    GarnishmentEngine --> NetPayCalc
    RuleCache --> TaxEngine
    TaxTableDB --> TaxEngine

    %% Batch Processing Flow
    PayRunScheduler --> BatchOrchestrator
    BatchOrchestrator --> WorkerPool
    WorkerPool --> CalcOrchestrator
    WorkerPool --> ResultAggregator

    %% Data Layer Connections
    PayrollEngine --> PayrollDB
    PayrollEngine --> EmployeeDB
    RuleManagement --> RuleStore
    AIPlatform --> LegalDocStore
    PayrollEngine --> AuditLog
    BatchProcessing --> CalculationArchive

    %% Compliance Layer
    HumanApproval --> HumanReviewQueue
    PayrollEngine --> ComplianceReporting
    AuditLog --> AuditTrailGen
    BatchProcessing --> ExportService

    %% External Integrations
    TaxTableProvider --> TaxTableDB
    ExportService --> BankingPartner
    ExportService --> TaxFiling
    APIClient --> HRISPartners

    %% Styling
    style AIPlatform fill:#e8f5e9
    style RuleManagement fill:#e3f2fd
    style PayrollEngine fill:#fff3e0
    style ComplianceLayer fill:#fce4ec
    style DataLayer fill:#f3e5f5
```

---

## 2. Key Data Flows

### 2.1 AI Rules Discovery Flow

```mermaid
sequenceDiagram
    autonumber
    participant Source as Legal Source<br/>(IRS, State Agency)
    participant Monitor as Change Monitor
    participant Ingestion as Document Ingestion
    participant OCR as OCR Service
    participant NLP as NLP Pipeline
    participant LLM as LLM Service
    participant Extractor as Rule Extractor
    participant RuleStore as Rule Store (Draft)
    participant Queue as Human Review Queue
    participant Reviewer as Human Reviewer
    participant Active as Rule Store (Active)
    participant Notify as Notification Service

    Source->>Monitor: Publish new regulation
    Monitor->>Monitor: Detect change (hash comparison)
    Monitor->>Ingestion: Trigger document ingestion

    Ingestion->>Ingestion: Download document
    Ingestion->>OCR: Extract text from PDF
    OCR->>NLP: Cleaned text

    NLP->>NLP: Section segmentation
    NLP->>NLP: Named Entity Recognition
    Note over NLP: Entities: wage amounts, time periods,<br/>employee categories, jurisdictions

    NLP->>LLM: Relevant sections + entities
    LLM->>LLM: Generate extraction prompt
    LLM->>LLM: Extract structured rules
    LLM->>Extractor: Raw extractions

    Extractor->>Extractor: Validate structure
    Extractor->>Extractor: Calculate confidence score
    Extractor->>Extractor: Deduplicate
    Extractor->>RuleStore: Draft rules with confidence

    RuleStore->>Queue: Queue for human review
    Queue->>Notify: Alert compliance team
    Notify->>Reviewer: Email/Slack notification

    Reviewer->>Queue: Review rule + AI reasoning

    alt Approved
        Reviewer->>Active: Approve (set effective date)
        Active->>Active: Create immutable version
    else Modified
        Reviewer->>Active: Modify and approve
        Active->>Active: Store with modification notes
    else Rejected
        Reviewer->>RuleStore: Reject with feedback
        RuleStore->>Extractor: Feedback for model improvement
    end

    Active->>Notify: Notify affected tenants
```

### 2.2 Gross-to-Net Calculation Flow

```mermaid
flowchart TB
    subgraph Inputs["Inputs"]
        TimeData[Time & Attendance<br/>Hours, OT, PTO]
        EmployeeProfile[Employee Profile<br/>Location, Status, Elections]
        EarningsConfig[Earnings Configuration<br/>Salary, Rates, Bonus]
        PayPeriod[Pay Period<br/>Start/End Dates]
    end

    subgraph GrossCalc["Gross Pay Calculation"]
        RegularPay[Regular Pay<br/>Hours × Rate or Salary/periods]
        OvertimePay[Overtime Pay<br/>OT Hours × Rate × 1.5]
        BonusPay[Bonus/Commission<br/>As configured]
        OtherEarnings[Other Earnings<br/>Tips, Reimbursements]
        GrossTotal[Gross Pay Total]
    end

    subgraph PreTaxDeductions["Pre-Tax Deductions"]
        Retirement401k[401k/403b<br/>Employee + Match]
        HSA[HSA Contribution]
        FSA[FSA - Medical/Dependent]
        TransitBenefits[Transit Benefits]
        HealthPremium[Health Insurance Premium]
        TaxableGross[Taxable Gross]
    end

    subgraph TaxCalculations["Tax Calculations"]
        FederalTax[Federal Income Tax<br/>W-4 + Brackets]
        SocialSecurity[Social Security<br/>6.2% up to wage base]
        Medicare[Medicare<br/>1.45% + 0.9% additional]
        StateTax[State Income Tax<br/>Work State Rules]
        LocalTax[Local Taxes<br/>City/County/School]
        TotalTaxes[Total Tax Withholding]
    end

    subgraph PostTaxDeductions["Post-Tax Deductions"]
        RothContrib[Roth 401k/IRA]
        LifeInsurance[Life Insurance<br/>(excess coverage)]
        UnionDues[Union Dues]
        CharityDeductions[Charitable Deductions]
        PostTaxTotal[Post-Tax Deductions Total]
    end

    subgraph Garnishments["Garnishments (Priority Order)"]
        TaxLevy[Tax Levies<br/>IRS, State]
        ChildSupport[Child Support]
        Alimony[Alimony]
        StudentLoan[Student Loans]
        Creditor[Creditor Garnishments]
        GarnishmentTotal[Total Garnishments]
    end

    subgraph Output["Output"]
        NetPay[Net Pay]
        PayStub[Pay Stub<br/>with Explanations]
        EmployerTaxes[Employer Tax<br/>Liabilities]
        AuditRecord[Audit Record<br/>Complete Trail]
        GLEntries[General Ledger<br/>Journal Entries]
    end

    Inputs --> GrossCalc
    RegularPay --> GrossTotal
    OvertimePay --> GrossTotal
    BonusPay --> GrossTotal
    OtherEarnings --> GrossTotal

    GrossTotal --> PreTaxDeductions
    Retirement401k --> TaxableGross
    HSA --> TaxableGross
    FSA --> TaxableGross
    TransitBenefits --> TaxableGross
    HealthPremium --> TaxableGross

    TaxableGross --> TaxCalculations
    FederalTax --> TotalTaxes
    SocialSecurity --> TotalTaxes
    Medicare --> TotalTaxes
    StateTax --> TotalTaxes
    LocalTax --> TotalTaxes

    TotalTaxes --> PostTaxDeductions
    RothContrib --> PostTaxTotal
    LifeInsurance --> PostTaxTotal
    UnionDues --> PostTaxTotal
    CharityDeductions --> PostTaxTotal

    PostTaxTotal --> Garnishments
    TaxLevy --> GarnishmentTotal
    ChildSupport --> GarnishmentTotal
    Alimony --> GarnishmentTotal
    StudentLoan --> GarnishmentTotal
    Creditor --> GarnishmentTotal

    GarnishmentTotal --> NetPay
    NetPay --> Output

    style GrossCalc fill:#e3f2fd
    style PreTaxDeductions fill:#e8f5e9
    style TaxCalculations fill:#fff3e0
    style PostTaxDeductions fill:#fce4ec
    style Garnishments fill:#f3e5f5
```

### 2.3 Jurisdiction Resolution Flow

```mermaid
flowchart TB
    subgraph Input["Employee Context"]
        Employee[Employee Record]
        WorkLocation[Work Location<br/>Office or Remote]
        ResidentLocation[Resident Location<br/>Home Address]
        EmploymentType[Employment Type<br/>W-2, 1099, etc.]
        EffectiveDate[Effective Date<br/>Pay Period]
    end

    subgraph LocationResolution["Location Resolution"]
        GeoLookup[Geocode Addresses]
        TaxShapefiles[Tax Shapefiles<br/>Lat/Long → Jurisdiction]
        WorkJurisdictions[Work Jurisdictions<br/>State, City, County, School]
        ResidentJurisdictions[Resident Jurisdictions]
    end

    subgraph JurisdictionHierarchy["Jurisdiction Hierarchy"]
        Federal[Federal Rules<br/>FLSA, FICA, Federal Tax]
        WorkState[Work State Rules<br/>Income Tax, SDI, PFL]
        ResidentState[Resident State Rules<br/>If different from work]
        LocalWork[Local Work Rules<br/>City Tax, Transit]
        LocalResident[Local Resident Rules]
        SpecialDistricts[Special Districts<br/>School, Transit]
    end

    subgraph ConflictResolution["Conflict Resolution"]
        ReciprocityCheck{Reciprocity<br/>Agreement?}
        PriorityRules[Apply Priority Rules<br/>Federal < State < Local]
        MostFavorable{Rule Type?}
        MinWageResolution[Minimum Wage<br/>Use Highest]
        OvertimeResolution[Overtime<br/>Use Most Restrictive]
        TaxResolution[Taxes<br/>Apply All Applicable]
    end

    subgraph Output["Applicable Rules"]
        FederalRules[Federal Rules Set]
        StateRules[State Rules Set]
        LocalRules[Local Rules Set]
        SpecialRules[Special Rules<br/>Union, Collective Agreement]
        RuleSnapshot[Rule Snapshot<br/>Immutable for Calculation]
    end

    Input --> LocationResolution
    GeoLookup --> TaxShapefiles
    TaxShapefiles --> WorkJurisdictions
    TaxShapefiles --> ResidentJurisdictions

    LocationResolution --> JurisdictionHierarchy

    JurisdictionHierarchy --> ConflictResolution
    ReciprocityCheck -->|Yes| PriorityRules
    ReciprocityCheck -->|No| PriorityRules
    PriorityRules --> MostFavorable

    MostFavorable -->|Minimum Wage| MinWageResolution
    MostFavorable -->|Overtime| OvertimeResolution
    MostFavorable -->|Taxes| TaxResolution

    ConflictResolution --> Output
    FederalRules --> RuleSnapshot
    StateRules --> RuleSnapshot
    LocalRules --> RuleSnapshot
    SpecialRules --> RuleSnapshot

    style ConflictResolution fill:#fff3e0
    style Output fill:#e8f5e9
```

### 2.4 Pay Run Batch Processing Flow

```mermaid
sequenceDiagram
    autonumber
    participant Scheduler as Pay Run Scheduler
    participant Orchestrator as Batch Orchestrator
    participant Validator as Pre-Flight Validator
    participant Snapshot as Rule Snapshot Service
    participant Workers as Worker Pool
    participant Calculator as Calculation Engine
    participant Aggregator as Result Aggregator
    participant Reviewer as Payroll Admin
    participant Finalizer as Finalization Service
    participant Banking as Banking Partner
    participant Archive as Archive Service

    Scheduler->>Orchestrator: Trigger pay run (tenant, schedule)

    rect rgb(230, 245, 255)
        Note over Orchestrator,Snapshot: Phase 1: Preparation
        Orchestrator->>Validator: Pre-flight checks
        Validator->>Validator: Verify employee roster complete
        Validator->>Validator: Verify time data approved
        Validator->>Validator: Verify banking info valid
        Validator-->>Orchestrator: Validation result

        Orchestrator->>Snapshot: Create rule snapshot
        Snapshot->>Snapshot: Copy all applicable rules
        Snapshot->>Snapshot: Lock snapshot (immutable)
        Snapshot-->>Orchestrator: Snapshot ID
    end

    rect rgb(232, 245, 233)
        Note over Orchestrator,Calculator: Phase 2: Calculation (Parallel)
        Orchestrator->>Orchestrator: Partition employees by jurisdiction
        Orchestrator->>Workers: Distribute work batches

        par Parallel Calculation
            Workers->>Calculator: Calculate batch 1
            Calculator->>Calculator: Gross-to-net per employee
            Calculator->>Calculator: Generate explanations
            Calculator-->>Workers: Results + explanations
        and
            Workers->>Calculator: Calculate batch 2
            Calculator-->>Workers: Results + explanations
        and
            Workers->>Calculator: Calculate batch N
            Calculator-->>Workers: Results + explanations
        end

        Workers->>Aggregator: Collect all results
        Aggregator->>Aggregator: Validate totals
        Aggregator->>Aggregator: Flag exceptions
    end

    rect rgb(255, 243, 224)
        Note over Aggregator,Reviewer: Phase 3: Review
        Aggregator-->>Reviewer: Pay run summary + exceptions
        Reviewer->>Reviewer: Review flagged items
        Reviewer->>Reviewer: Compare to previous period

        alt Exceptions Found
            Reviewer->>Orchestrator: Request corrections
            Orchestrator->>Workers: Re-calculate corrected employees
        else Approved
            Reviewer->>Finalizer: Approve pay run
        end
    end

    rect rgb(252, 228, 236)
        Note over Finalizer,Archive: Phase 4: Finalization
        Finalizer->>Finalizer: Lock calculations (immutable)
        Finalizer->>Banking: Generate ACH file
        Banking-->>Finalizer: ACH confirmation

        Finalizer->>Finalizer: Calculate employer taxes
        Finalizer->>Finalizer: Generate tax deposits
        Finalizer->>Finalizer: Update YTD accumulators
    end

    rect rgb(243, 229, 245)
        Note over Finalizer,Archive: Phase 5: Reporting
        Finalizer->>Archive: Archive pay run
        Finalizer->>Finalizer: Generate pay stubs
        Finalizer->>Finalizer: Update general ledger
        Finalizer->>Finalizer: Notify employees (pay stubs available)
    end
```

---

## 3. Architecture Layers

### 3.1 Layer Overview

| Layer | Responsibility | Key Components | Scaling Strategy |
|-------|----------------|----------------|------------------|
| **Client** | User interfaces | Admin Portal, Employee SSP, Mobile | CDN, edge caching |
| **Gateway** | Traffic management | API Gateway, Auth, Rate Limiting | Horizontal, stateless |
| **Rule Management** | Rule lifecycle | Discovery, Approval, Versioning | Event-driven, async |
| **Payroll Engine** | Calculations | Gross-to-net, Taxes, Deductions | Worker pool, parallel |
| **AI Platform** | Intelligence | NLP, LLM, Extraction, Explanation | GPU cluster, batching |
| **Batch Processing** | Pay runs | Scheduler, Workers, Aggregation | Auto-scaling workers |
| **Data** | Persistence | Employee, Rules, Payroll, Audit | Sharded, replicated |
| **Compliance** | Regulatory | Review Queue, Reporting, Export | Async, queued |

### 3.2 Service Boundaries

```mermaid
graph LR
    subgraph CoreDomain["Core Domain (In-House)"]
        RuleEngine[Rule Engine]
        CalcEngine[Calculation Engine]
        AuditService[Audit Service]
    end

    subgraph AIDomain["AI Domain (In-House)"]
        RuleExtraction[Rule Extraction]
        Explainability[Explainability]
        ChangeDetection[Change Detection]
    end

    subgraph SupportDomain["Support Domain (Partner/Build)"]
        TaxTables[Tax Tables<br/>Partner: Symmetry]
        Banking[Banking<br/>Partner: Bank]
        TaxFiling[Tax Filing<br/>Partner: Filing Service]
    end

    subgraph IntegrationDomain["Integration Domain"]
        HRISConnector[HRIS Connector]
        ERPConnector[ERP Connector]
        TimeConnector[Time & Attendance]
    end

    CoreDomain --> AIDomain
    CoreDomain --> SupportDomain
    CoreDomain --> IntegrationDomain
```

---

## 4. Key Architectural Decisions

### 4.1 Decision 1: Rule Engine Architecture

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Commercial BRMS (Drools)** | Use established business rules engine | Mature, feature-rich, tooling | License cost, less control, versioning challenges |
| **Custom DSL** | Build domain-specific rule language | Full control, optimized for payroll, native versioning | Development effort, maintenance |
| **Pure LLM** | Let LLM interpret rules at runtime | Flexible, handles ambiguity | Non-deterministic, slow, expensive |

**Decision: Custom DSL with LLM-assisted extraction**
- **Rationale**: Payroll rules have specific patterns (conditions, actions, effective dates). Custom DSL allows versioned, auditable rules while LLM handles extraction from legal documents.
- **Trade-off**: Higher initial development, but better long-term control and auditability.

### 4.2 Decision 2: AI Hosting Model

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Cloud AI APIs (OpenAI, Claude)** | Use external LLM APIs | Latest models, no infrastructure | Data leaves premises, compliance risk, latency |
| **Self-hosted vLLM** | Host open-source models on own GPUs | Data sovereignty, compliance, low latency | GPU infrastructure cost, model updates |
| **Hybrid** | Self-hosted for sensitive, cloud for general | Balance of benefits | Complexity, two systems to maintain |

**Decision: Self-hosted vLLM for all payroll AI**
- **Rationale**: Legal documents and payroll data are highly sensitive. Compliance (GDPR, SOX) requires data sovereignty. Self-hosting ensures no PII leaves the system.
- **Trade-off**: GPU infrastructure cost (~$50K-100K/year) vs. compliance risk and data security.

### 4.3 Decision 3: Tax Calculation Strategy

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Build** | Build own tax engine for all jurisdictions | Full control, no vendor dependency | Massive effort, certification challenges |
| **Partner (Symmetry, Vertex)** | Use certified tax calculation partner | Certified, maintained, 7,040+ jurisdictions | Cost, dependency, integration complexity |
| **Hybrid** | Partner for tables, own logic for application | Control over logic, certified data | Integration effort |

**Decision: Hybrid - Partner for tax tables, own calculation logic**
- **Rationale**: Tax tables require constant maintenance and certification. Partners (Symmetry) specialize in this. Our value is in rule discovery and application logic.
- **Trade-off**: Partner dependency for data, but own control over calculation and explainability.

### 4.4 Decision 4: Multi-Tenancy Model

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Database per tenant** | Separate database for each tenant | Strong isolation, easy compliance | Cost at scale, management overhead |
| **Schema per tenant** | Shared database, separate schemas | Good isolation, moderate cost | Schema management complexity |
| **Shared with encryption** | Shared tables, tenant encryption keys | Cost-efficient, scalable | Requires careful isolation, key management |

**Decision: Shared database with tenant-specific encryption**
- **Rationale**: Cost-efficient for 10K+ tenants. Encryption provides isolation without infrastructure overhead. Enterprise tenants can upgrade to dedicated.
- **Trade-off**: Requires robust row-level security and key management.

### 4.5 Decision 5: Calculation Architecture

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Real-time only** | Calculate on-demand for each request | Simple, always current | Slow for batch, resource-intensive |
| **Batch only** | Pre-calculate during pay runs | Efficient, predictable | Can't preview, stale until run |
| **Hybrid** | Real-time preview, batch for finalization | Best of both, good UX | Two code paths, complexity |

**Decision: Hybrid - Real-time for preview, Batch for pay runs**
- **Rationale**: Employees and admins need real-time previews for "what-if" scenarios. Final pay runs need batch efficiency and consistency guarantees.
- **Trade-off**: Two calculation modes to maintain, but essential for UX.

---

## 5. Component Details

### 5.1 Rule Management Layer

| Component | Responsibility | Key Interfaces |
|-----------|----------------|----------------|
| **Rule Discovery Service** | Receive AI extractions, create draft rules | `createDraftRule()`, `linkToSource()` |
| **Human Approval Workflow** | Route rules for review, track approvals | `submitForReview()`, `approve()`, `reject()` |
| **Rule Version Control** | Maintain immutable rule history | `createVersion()`, `getVersionAt()`, `compare()` |
| **Jurisdiction Mapper** | Map rules to jurisdictions | `getRulesFor()`, `resolveConflicts()` |
| **Rule Cache** | Cache active rules by jurisdiction | `get()`, `invalidate()`, `warmup()` |

### 5.2 Payroll Engine Layer

| Component | Responsibility | Key Interfaces |
|-----------|----------------|----------------|
| **Calculation Orchestrator** | Coordinate calculation pipeline | `calculate()`, `preview()`, `batch()` |
| **Gross Pay Calculator** | Sum earnings, apply overtime rules | `calculateGross()`, `applyOTRules()` |
| **Tax Engine** | Multi-jurisdiction tax withholding | `calculateFederal()`, `calculateState()`, `calculateLocal()` |
| **Deduction Engine** | Pre-tax and post-tax deductions | `applyPreTax()`, `applyPostTax()` |
| **Garnishment Processor** | Priority-ordered wage attachments | `calculateDisposable()`, `applyGarnishments()` |
| **Net Pay Calculator** | Final net pay computation | `calculateNet()`, `generateStub()` |

### 5.3 AI Platform Layer

| Component | Responsibility | Key Interfaces |
|-----------|----------------|----------------|
| **Document Ingestion** | Fetch, store, prepare legal documents | `ingest()`, `getStatus()` |
| **OCR Service** | Extract text from PDFs/images | `extractText()`, `detectLayout()` |
| **NLP Pipeline** | NER, classification, section segmentation | `extractEntities()`, `classify()`, `segment()` |
| **LLM Serving** | Self-hosted model inference | `generate()`, `embed()` |
| **Rule Extractor** | Structured rule extraction from text | `extract()`, `validate()`, `score()` |
| **Explainability Engine** | Generate calculation explanations | `explain()`, `summarize()` |
| **Change Monitor** | Detect regulatory changes | `monitor()`, `alert()`, `diff()` |

---

## 6. Integration Architecture

### 6.1 External Integrations

```mermaid
flowchart LR
    subgraph PayrollEngine["Payroll Engine"]
        Core[Core Services]
    end

    subgraph Inbound["Inbound Integrations"]
        HRIS[HRIS Systems<br/>Workday, ADP, BambooHR]
        TimeTracking[Time Systems<br/>Kronos, Deputy]
        Benefits[Benefits Platforms<br/>Gusto, Zenefits]
    end

    subgraph Outbound["Outbound Integrations"]
        Banking[Banking<br/>ACH, Wire]
        TaxAgencies[Tax Agencies<br/>IRS, State]
        ERP[ERP Systems<br/>NetSuite, SAP]
        Accounting[Accounting<br/>QuickBooks, Xero]
    end

    subgraph DataProviders["Data Providers"]
        TaxTables[Tax Tables<br/>Symmetry]
        AddressValidation[Address Validation<br/>SmartyStreets]
        BankValidation[Bank Validation<br/>Plaid]
    end

    HRIS -->|Employee Data| Core
    TimeTracking -->|Hours/Attendance| Core
    Benefits -->|Elections/Deductions| Core

    Core -->|ACH Files| Banking
    Core -->|Tax Filings| TaxAgencies
    Core -->|Journal Entries| ERP
    Core -->|Transactions| Accounting

    TaxTables -->|Rates/Rules| Core
    AddressValidation -->|Jurisdiction| Core
    BankValidation -->|Account Verify| Core
```

### 6.2 Integration Patterns

| Integration | Pattern | Protocol | Frequency |
|-------------|---------|----------|-----------|
| HRIS Sync | Pull + Webhook | REST API, SFTP | Real-time + daily batch |
| Time & Attendance | Push | REST API | Per approval |
| Tax Tables | Pull | REST API | Daily |
| Banking | Push | SFTP (NACHA format) | Per pay run |
| Tax Filing | Push | API + SFTP | Per deadline |
| ERP/Accounting | Push | REST API, webhook | Per pay run |

---

## 7. Security Architecture

### 7.1 Security Zones

```mermaid
flowchart TB
    subgraph PublicZone["Public Zone (DMZ)"]
        CDN[CDN]
        WAF[WAF]
    end

    subgraph AppZone["Application Zone"]
        Gateway[API Gateway]
        WebServers[Web Servers]
        AppServers[App Servers]
    end

    subgraph DataZone["Data Zone"]
        Databases[(Databases)]
        Cache[(Cache)]
    end

    subgraph AIZone["AI Zone (Isolated)"]
        GPUCluster[GPU Cluster]
        ModelStore[(Model Store)]
    end

    subgraph SecureZone["Secure Zone (HSM)"]
        KeyMgmt[Key Management]
        HSM[Hardware Security Module]
    end

    PublicZone --> AppZone
    AppZone --> DataZone
    AppZone --> AIZone
    DataZone --> SecureZone
    AIZone --> DataZone
```

### 7.2 Data Protection

| Data Type | Classification | Protection |
|-----------|----------------|------------|
| SSN, Tax IDs | Highly Sensitive | Field-level encryption, separate key |
| Bank Accounts | Highly Sensitive | Field-level encryption, tokenization |
| Salary, Pay | Sensitive | Tenant encryption, role-based access |
| Hours, Rates | Business | Tenant encryption |
| Audit Logs | Compliance | Append-only, integrity hash chain |

---

## 8. Deployment Architecture

### 8.1 Multi-Region Deployment

```mermaid
flowchart TB
    subgraph Global["Global Layer"]
        DNS[Global DNS<br/>GeoDNS]
        GlobalLB[Global Load Balancer]
    end

    subgraph USRegion["US Region"]
        USLB[US Load Balancer]
        USApp[US App Cluster]
        USDB[(US Database<br/>Primary)]
        USGPU[US GPU Cluster]
    end

    subgraph EURegion["EU Region"]
        EULB[EU Load Balancer]
        EUApp[EU App Cluster]
        EUDB[(EU Database<br/>Primary)]
        EUGPU[EU GPU Cluster]
    end

    subgraph Replication["Cross-Region"]
        ConfigSync[Config Sync]
        RuleSync[Rule Sync<br/>Non-PII Only]
    end

    DNS --> GlobalLB
    GlobalLB --> USLB
    GlobalLB --> EULB

    USLB --> USApp
    USApp --> USDB
    USApp --> USGPU

    EULB --> EUApp
    EUApp --> EUDB
    EUApp --> EUGPU

    USRegion <--> Replication
    EURegion <--> Replication
```

### 8.2 Data Residency Rules

| Tenant Region | Primary DB | AI Processing | Backup |
|---------------|------------|---------------|--------|
| US | US-East | US GPU Cluster | US-West |
| EU (GDPR) | EU-West | EU GPU Cluster | EU-North |
| UK (post-Brexit) | UK-South | EU GPU Cluster | EU-West |
| Canada | Canada-Central | US GPU Cluster | Canada-East |
