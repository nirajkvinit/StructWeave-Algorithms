# High-Level Design

[Back to Index](./00-index.md)

---

## Architecture Principles

The WhatsApp Native ERP is architected around four foundational principles:

1. **WhatsApp-First**: All core business operations happen within WhatsApp - no traditional web/mobile UI required for daily operations
2. **Privacy-First AI**: Leverage Meta's CVM (Confidential Virtual Machines) for AI processing without persistent data storage
3. **Offline-First**: Operations continue seamlessly during connectivity issues, with automatic sync on reconnection
4. **India-First Compliance**: DPDP Act, GST, UPI, and ONDC as core requirements, not afterthoughts

---

## Architecture Layers

| Layer | Responsibility | Key Components |
|-------|---------------|----------------|
| **WhatsApp Platform** | User interface, message delivery | Cloud API, Flows, Catalog |
| **BSP Gateway** | API mediation, webhook management | AiSensy/Interakt/Gallabox |
| **Message Processing** | Routing, classification, queuing | Webhook handler, message router |
| **AI Layer** | NLU, OCR, intelligent responses | Edge NLU, Meta CVM, OCR service |
| **ERP Services** | Business logic | Inventory, Orders, Invoicing, etc. |
| **Data Plane** | Persistence, sync | PostgreSQL, Event Store, Sync Queue |
| **Integration Layer** | External services | Payments (UPI), Tax (GST), Commerce (ONDC) |

---

## Complete System Architecture

```mermaid
flowchart TB
    subgraph Users["User Layer"]
        Customer[Customer<br/>WhatsApp]
        BusinessOwner[Business Owner<br/>WhatsApp]
        Staff[Staff<br/>WhatsApp]
        OfflineApp[Companion App<br/>Offline Mode]
    end

    subgraph WhatsApp["WhatsApp Platform"]
        CloudAPI[WhatsApp<br/>Cloud API]
        Flows[WhatsApp<br/>Flows Engine]
        Catalog[WhatsApp<br/>Business Catalog]
        Templates[Message<br/>Templates]
    end

    subgraph BSPLayer["BSP Gateway Layer"]
        BSP[Business Solution Provider<br/>AiSensy / Interakt]
        WebhookEndpoint[Webhook<br/>Endpoint]
        RateLimiter[Rate Limiter<br/>80 msg/sec/phone]
        SignatureValidator[Signature<br/>Validator]
    end

    subgraph MessageProcessing["Message Processing Layer"]
        MessageQueue[Message Queue<br/>Redis Streams]
        MessageRouter[Message Router<br/>Intent Routing]
        PriorityQueue[Priority Queue<br/>P0-P3]
        Deduplicator[Deduplication<br/>Message ID Cache]
    end

    subgraph AILayer["Privacy-First AI Layer"]
        EdgeNLU[Edge NLU<br/>FastText/DistilBERT]
        IntentClassifier[Intent<br/>Classifier]
        EntityExtractor[Entity<br/>Extractor]
        MetaCVM[Meta CVM<br/>Private Processing]
        OCRService[OCR Service<br/>Receipt/Invoice]
        ResponseGenerator[Response<br/>Generator]
    end

    subgraph ERPServices["ERP Service Layer"]
        InventoryService[Inventory<br/>Service]
        OrderService[Order<br/>Service]
        InvoiceService[Invoice<br/>Service]
        CustomerService[Customer<br/>Service]
        ExpenseService[Expense<br/>Service]
        AccountingService[Accounting<br/>Service]
    end

    subgraph DataPlane["Data Plane"]
        TenantRouter[Tenant Router<br/>RLS Enforcement]
        ERPDB[(PostgreSQL<br/>Tenant-Isolated)]
        EventStore[(Event Store<br/>Audit Trail)]
        DocStore[(Object Storage<br/>PDFs, Receipts)]
        OfflineQueue[(Offline<br/>Sync Queue)]
    end

    subgraph Compliance["Compliance Layer"]
        GSTService[GST Service<br/>Tax Calculation]
        ConsentManager[Consent<br/>Manager]
        AuditLog[(Audit Log<br/>Immutable)]
    end

    subgraph Integrations["External Integrations"]
        UPIGateway[UPI Gateway<br/>Payment Links]
        Razorpay[Razorpay<br/>Cards/NetBanking]
        ONDCProtocol[ONDC<br/>Protocol]
        GSTPortal[GST Portal<br/>E-Invoice]
        SMSFallback[SMS Gateway<br/>Fallback]
    end

    %% User to WhatsApp
    Users --> CloudAPI
    OfflineApp -.->|Sync| OfflineQueue

    %% WhatsApp to BSP
    CloudAPI --> BSP
    Flows --> BSP
    Catalog --> CustomerService

    %% BSP Processing
    BSP --> WebhookEndpoint
    WebhookEndpoint --> SignatureValidator
    SignatureValidator --> RateLimiter
    RateLimiter --> MessageQueue

    %% Message Processing
    MessageQueue --> Deduplicator
    Deduplicator --> MessageRouter
    MessageRouter --> PriorityQueue
    PriorityQueue --> AILayer

    %% AI Processing
    EdgeNLU --> IntentClassifier
    EdgeNLU --> EntityExtractor
    IntentClassifier --> MessageRouter
    MetaCVM --> ResponseGenerator
    OCRService --> ExpenseService

    %% ERP Services
    MessageRouter --> ERPServices
    ResponseGenerator --> BSP

    %% Data Flow
    ERPServices --> TenantRouter
    TenantRouter --> ERPDB
    TenantRouter --> EventStore
    TenantRouter --> DocStore
    OfflineQueue --> TenantRouter

    %% Compliance
    ERPServices --> GSTService
    TenantRouter --> AuditLog
    ERPServices --> ConsentManager

    %% Integrations
    InvoiceService --> UPIGateway
    InvoiceService --> Razorpay
    OrderService --> ONDCProtocol
    GSTService --> GSTPortal
    MessageRouter --> SMSFallback

    style AILayer fill:#e8f5e9
    style WhatsApp fill:#dcf8c6
    style DataPlane fill:#e3f2fd
    style Compliance fill:#fff3e0
```

---

## Key Architectural Decisions

### Decision 1: BSP vs Direct Meta API

| Option | Pros | Cons |
|--------|------|------|
| **Direct Meta API** | Full control, no middleman fees | Complex setup, compliance burden, no local support |
| **BSP (Recommended)** | Faster onboarding, managed infrastructure, India presence, compliance handled | Per-message markup, vendor dependency |

**Decision**: Use BSP (AiSensy, Interakt, or Gallabox)

**Rationale**:
- 2-3 day onboarding vs 2-3 weeks direct
- Built-in compliance for India regulations
- Local support and documentation in Hindi
- Managed webhook infrastructure
- Cost difference minimal at SMB scale (~₹0.10-0.20/message markup)

---

### Decision 2: Privacy-First AI Architecture

| Option | Pros | Cons |
|--------|------|------|
| **Self-Hosted LLM (vLLM)** | Full control, no data leaves premises | GPU costs ($80K+/month), operational complexity |
| **External API (OpenAI/Anthropic)** | Easy integration, high quality | Data leaves India (DPDP violation), cost per token |
| **Meta CVM + Edge NLU (Recommended)** | Privacy-first, no persistent storage, leverages WhatsApp infrastructure | Limited customization, Meta dependency |

**Decision**: Meta CVM for complex reasoning + Edge NLU for intent/entity

**Rationale**:
- Meta's Private Processing (April 2025) provides CVM-based AI with ephemeral keys
- Edge NLU (FastText/DistilBERT) handles 90% of requests (intent + entity) locally
- No business data stored in AI systems
- DPDP-compliant by design
- Cost-effective for SMB scale

---

### Decision 3: Multi-Tenancy Model

| Option | Pros | Cons |
|--------|------|------|
| **Database per Tenant** | Maximum isolation, easy backup/restore | High cost at 100K tenants, operational overhead |
| **Schema per Tenant** | Good isolation, moderate cost | Schema migration complexity |
| **Shared DB with RLS (Recommended)** | Cost-effective, simple operations | Requires careful RLS implementation |

**Decision**: Shared PostgreSQL with Row-Level Security

**Rationale**:
- 100K SMBs = cost is critical constraint
- Average SMB: <1000 transactions/month
- PostgreSQL RLS provides strong logical isolation
- Tenant-specific encryption keys for sensitive data
- Upgrade path to dedicated for large tenants

---

### Decision 4: Message Processing Pattern

| Option | Pros | Cons |
|--------|------|------|
| **Synchronous Processing** | Simple, immediate response | Timeout risk, no retry, blocking |
| **Async with Priority Queue (Recommended)** | Graceful degradation, priority handling, retry | Slight latency increase, complexity |

**Decision**: Async processing with priority queue

**Rationale**:
- WhatsApp webhooks have 30-second timeout
- Festival spikes need backpressure handling
- Critical messages (payments) need priority
- Failed messages need retry mechanism

**Priority Levels**:
- **P0**: Payment callbacks, order confirmations
- **P1**: Inventory updates, order creation
- **P2**: Queries, reports
- **P3**: Marketing, bulk messages

---

### Decision 5: Offline-First Strategy

| Option | Pros | Cons |
|--------|------|------|
| **Online-Only** | Simple architecture | Unusable in low connectivity |
| **Companion App Offline (Recommended)** | Full offline capability, WhatsApp handles message queuing | Two sync paths, conflict resolution needed |

**Decision**: Companion app with offline queue + WhatsApp as secondary sync channel

**Rationale**:
- India has significant connectivity gaps
- WhatsApp already handles message queuing offline
- Companion app enables full ERP functionality offline
- Conflict resolution: Last-Write-Wins for most, server-authoritative for inventory

---

## Data Flow Diagrams

### Flow 1: Message Processing Pipeline

```mermaid
sequenceDiagram
    participant C as Customer
    participant WA as WhatsApp API
    participant BSP as BSP Gateway
    participant WH as Webhook Handler
    participant MQ as Message Queue
    participant NLU as Edge NLU
    participant ERP as ERP Service
    participant DB as Database

    C->>WA: Send message
    WA->>BSP: Webhook POST
    BSP->>WH: Forward webhook

    WH->>WH: Verify signature (HMAC-SHA256)
    WH->>WH: Check deduplication (message_id)
    WH-->>BSP: 200 OK (within 30s)

    WH->>MQ: Enqueue message
    MQ->>NLU: Process message

    NLU->>NLU: Intent classification
    NLU->>NLU: Entity extraction

    alt Inventory Query
        NLU->>ERP: GET /inventory/{product}
        ERP->>DB: Query stock
        DB-->>ERP: Stock data
        ERP-->>NLU: Response data
    else Order Creation
        NLU->>ERP: POST /orders
        ERP->>DB: Create order
        DB-->>ERP: Order created
        ERP-->>NLU: Order confirmation
    end

    NLU->>BSP: Send response message
    BSP->>WA: API call
    WA->>C: Deliver message
```

### Flow 2: Order Creation via WhatsApp Flow

```mermaid
sequenceDiagram
    participant B as Business
    participant WA as WhatsApp
    participant FL as Flows Engine
    participant ERP as Order Service
    participant INV as Inventory Service
    participant PAY as Payment Service
    participant DB as Database

    B->>WA: Tap "New Order" button
    WA->>FL: Initiate Flow

    FL->>B: Screen 1: Select Customer
    B->>FL: Customer selected

    FL->>ERP: Fetch customer history
    ERP-->>FL: Recent orders

    FL->>B: Screen 2: Select Products
    B->>FL: Products + quantities

    FL->>INV: Check availability
    INV->>DB: Query stock
    DB-->>INV: Stock levels
    INV-->>FL: Availability confirmed

    FL->>B: Screen 3: Confirm Order
    Note over FL,B: Shows total, GST, payment options
    B->>FL: Confirm

    FL->>ERP: Create order
    ERP->>DB: Insert order
    ERP->>INV: Reserve stock
    ERP->>PAY: Generate UPI link
    PAY-->>ERP: Payment link

    ERP-->>FL: Order created
    FL->>B: Order confirmation + Invoice PDF + UPI link
```

### Flow 3: Invoice Generation & Payment

```mermaid
sequenceDiagram
    participant B as Business
    participant WA as WhatsApp
    participant NLU as Edge NLU
    participant INV as Invoice Service
    participant GST as GST Service
    participant PAY as Payment Gateway
    participant C as Customer

    B->>WA: "Invoice banao Sharma ji ka ₹5000"
    WA->>NLU: Process message

    NLU->>NLU: Extract: customer=Sharma, amount=5000
    NLU->>INV: Create invoice request

    INV->>GST: Calculate tax
    GST-->>INV: CGST: ₹450, SGST: ₹450

    INV->>INV: Generate invoice number (GST format)
    INV->>INV: Generate PDF
    INV->>PAY: Generate UPI link
    PAY-->>INV: upi://pay?pa=...&am=5900

    INV-->>WA: Invoice PDF + UPI link
    WA->>B: [Document] Invoice #INV-2025-0001.pdf
    WA->>B: [Button] Share with Customer

    B->>WA: Tap "Share"
    WA->>C: Invoice + Payment link

    C->>PAY: Complete UPI payment
    PAY->>INV: Payment webhook
    INV->>WA: Send receipt to Business
    WA->>B: "Payment received from Sharma ji: ₹5900"
```

### Flow 4: Expense Tracking via Receipt Photo

```mermaid
sequenceDiagram
    participant B as Business
    participant WA as WhatsApp
    participant OCR as OCR Service
    participant CVM as Meta CVM
    participant EXP as Expense Service
    participant DB as Database

    B->>WA: [Photo] Receipt image
    WA->>OCR: Image processing

    OCR->>OCR: Text extraction
    OCR->>CVM: Field extraction request
    Note over CVM: Ephemeral processing<br/>No persistent storage

    CVM->>CVM: Extract: vendor, amount, date, items
    CVM-->>OCR: Structured data

    OCR->>EXP: Create expense
    EXP->>EXP: Categorize (AI suggestion)
    EXP->>EXP: Calculate GST input credit
    EXP->>DB: Store expense

    EXP-->>WA: Confirmation message
    WA->>B: "Expense logged:<br/>Vendor: Reliance Digital<br/>Amount: ₹15,000<br/>Category: Electronics<br/>GST Credit: ₹2,700<br/><br/>[Edit] [Confirm]"

    B->>WA: [Confirm]
    EXP->>DB: Mark confirmed
```

---

## Component Design

### WhatsApp Integration Component

```mermaid
flowchart LR
    subgraph WhatsAppFeatures["WhatsApp Features Used"]
        CloudAPI[Cloud API<br/>Send/Receive]
        Flows[Flows<br/>Structured Input]
        Catalog[Catalog<br/>Product Sync]
        Templates[Templates<br/>Proactive Messages]
        Buttons[Interactive<br/>Buttons/Lists]
        Documents[Document<br/>Messages]
    end

    subgraph MessageTypes["Message Type Routing"]
        Text[Text Message]
        Image[Image/Document]
        FlowResp[Flow Response]
        ButtonResp[Button Response]
        Location[Location Share]
    end

    subgraph Handlers["Message Handlers"]
        NLUHandler[NLU Handler<br/>Natural Language]
        OCRHandler[OCR Handler<br/>Receipt/Invoice]
        FlowHandler[Flow Handler<br/>Structured Data]
        ActionHandler[Action Handler<br/>Quick Actions]
    end

    Text --> NLUHandler
    Image --> OCRHandler
    FlowResp --> FlowHandler
    ButtonResp --> ActionHandler
    Location --> ActionHandler
```

### Privacy-First AI Component

```mermaid
flowchart TB
    subgraph Input["Input Processing"]
        Message[User Message]
        Image[Image/Document]
    end

    subgraph EdgeProcessing["Edge Processing (India)"]
        EdgeNLU[Edge NLU<br/>Mumbai/Chennai]
        IntentModel[Intent Model<br/>FastText]
        EntityModel[Entity Model<br/>DistilBERT]
    end

    subgraph PrivateProcessing["Meta Private Processing"]
        CVM[Confidential VM]
        EphemeralKeys[Ephemeral Keys<br/>Per-Request]
        AnonCredentials[Anonymous<br/>Credentials]
    end

    subgraph Output["Output Generation"]
        ResponseGen[Response<br/>Generator]
        TemplateEngine[Template<br/>Engine]
    end

    Message --> EdgeNLU
    EdgeNLU --> IntentModel
    EdgeNLU --> EntityModel

    IntentModel -->|Complex Query| CVM
    EntityModel -->|Complex Query| CVM

    CVM --> EphemeralKeys
    CVM --> AnonCredentials
    CVM --> ResponseGen

    IntentModel -->|Simple Query| ResponseGen
    EntityModel -->|Simple Query| ResponseGen

    Image --> CVM

    ResponseGen --> TemplateEngine

    style PrivateProcessing fill:#e8f5e9
    style EdgeProcessing fill:#fff3e0
```

### Multi-Tenant Data Component

```mermaid
flowchart TB
    subgraph Request["Incoming Request"]
        WebhookReq[Webhook with<br/>Business Phone]
    end

    subgraph TenantResolution["Tenant Resolution"]
        PhoneLookup[Phone → Tenant ID<br/>Mapping]
        TenantContext[Set Tenant<br/>Context]
    end

    subgraph RLSEnforcement["RLS Enforcement"]
        ConnectionPool[Connection Pool<br/>Per-Region]
        SetTenantVar[SET app.tenant_id]
        RLSPolicy[RLS Policy<br/>Automatic Filtering]
    end

    subgraph TenantData["Tenant-Isolated Data"]
        TenantA[(Tenant A<br/>Data)]
        TenantB[(Tenant B<br/>Data)]
        TenantN[(Tenant N<br/>Data)]
    end

    subgraph Encryption["Encryption Layer"]
        TenantKey[Tenant-Specific<br/>DEK]
        HSM[HSM<br/>Key Storage]
    end

    WebhookReq --> PhoneLookup
    PhoneLookup --> TenantContext
    TenantContext --> ConnectionPool
    ConnectionPool --> SetTenantVar
    SetTenantVar --> RLSPolicy

    RLSPolicy --> TenantA
    RLSPolicy --> TenantB
    RLSPolicy --> TenantN

    TenantA --> TenantKey
    TenantB --> TenantKey
    TenantKey --> HSM

    style RLSEnforcement fill:#e3f2fd
    style Encryption fill:#fff3e0
```

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Async with priority queue | WhatsApp timeout handling, graceful degradation |
| **Event-driven vs Request-response** | Hybrid - Events for audit, Request for queries | Audit trail + immediate responses |
| **Push vs Pull** | Push (WhatsApp webhooks) + Pull (companion app sync) | Real-time + offline support |
| **Stateless vs Stateful** | Stateless services, stateful data layer | Horizontal scaling, session in database |
| **Read-heavy vs Write-heavy** | Mixed - read for queries, write for transactions | Separate read replicas for reports |
| **Real-time vs Batch** | Real-time for operations, batch for reports/GST export | User experience + compliance |
| **Edge vs Origin** | Edge for NLU, Origin for transactions | Latency for AI, consistency for data |

---

## Technology Stack

| Component | Technology | Selection Rationale |
|-----------|------------|---------------------|
| **BSP** | AiSensy / Interakt | India presence, Hindi docs, competitive pricing |
| **Message Queue** | Redis Streams | Simplicity, ordering, persistence |
| **Edge NLU** | FastText + DistilBERT | Multilingual, low latency, small footprint |
| **OCR** | Google Vision API / Tesseract | Accuracy vs cost trade-off |
| **ERP Database** | PostgreSQL 15+ | RLS, JSONB, mature ecosystem |
| **Event Store** | PostgreSQL (append-only table) | Simplicity, same DB, strong consistency |
| **Object Storage** | Object Storage (S3-compatible) | PDFs, receipts, scalable |
| **Cache** | Redis | Session, tenant context, deduplication |
| **Payment** | Razorpay + UPI PSP | India coverage, UPI deep links |
| **SMS Fallback** | Gupshup / Twilio | India rates, reliability |

---

## Deployment Architecture

```mermaid
flowchart TB
    subgraph India["India Deployment (DPDP Compliant)"]
        subgraph Mumbai["Mumbai (Primary)"]
            MumWebhook[Webhook Workers<br/>30 instances]
            MumERP[ERP Services<br/>20 instances]
            MumDB[(PostgreSQL<br/>Primary)]
            MumCache[Redis Cluster]
            MumStorage[(Object Storage)]
        end

        subgraph Chennai["Chennai (DR)"]
            ChennaiWebhook[Webhook Workers<br/>10 instances]
            ChennaiERP[ERP Services<br/>10 instances]
            ChennaiDB[(PostgreSQL<br/>Replica)]
            ChennaiCache[Redis Replica]
        end
    end

    subgraph Edge["Edge Locations"]
        EdgeMumbai[Edge NLU<br/>Mumbai]
        EdgeChennai[Edge NLU<br/>Chennai]
        EdgeBangalore[Edge NLU<br/>Bangalore]
    end

    subgraph External["External Services"]
        WhatsApp[WhatsApp<br/>Cloud API]
        UPI[UPI Gateway]
        GST[GST Portal]
    end

    WhatsApp --> MumWebhook
    WhatsApp --> ChennaiWebhook

    MumWebhook --> EdgeMumbai
    ChennaiWebhook --> EdgeChennai

    EdgeMumbai --> MumERP
    EdgeChennai --> ChennaiERP

    MumERP --> MumDB
    ChennaiERP --> ChennaiDB

    MumDB -.->|Replication| ChennaiDB

    style Mumbai fill:#e3f2fd
    style Chennai fill:#fff3e0
```

---

## Failure Scenarios & Handling

| Failure | Detection | Handling |
|---------|-----------|----------|
| **WhatsApp API Down** | Health check fails | Route to SMS fallback for critical |
| **BSP Unavailable** | Webhook errors | Queue locally, retry with backoff |
| **Edge NLU Timeout** | Latency >500ms | Use template responses |
| **Database Failover** | Connection errors | Automatic failover to Chennai |
| **Payment Callback Missed** | Reconciliation check | Polling backup for pending payments |
| **OCR Service Overloaded** | Queue depth >1000 | Defer non-critical, notify user |

---

## Integration Points Summary

| Integration | Protocol | Purpose |
|-------------|----------|---------|
| **WhatsApp Cloud API** | REST + Webhooks | Message send/receive |
| **WhatsApp Flows** | JSON schema | Structured input capture |
| **WhatsApp Catalog** | API sync | Product listing |
| **UPI** | Deep links + Webhooks | Payment collection |
| **Razorpay** | REST + Webhooks | Card/NetBanking |
| **GST Portal** | E-invoice API | Invoice submission |
| **ONDC** | Protocol API | Marketplace orders |
| **SMS Gateway** | REST | Fallback channel |
