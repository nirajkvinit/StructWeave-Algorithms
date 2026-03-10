# High-Level Design — AI-Native WhatsApp+PIX Commerce Assistant

## System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer"]
        WA[WhatsApp Users<br/>165M+ Brazil]
        WABA[WhatsApp Business<br/>API Cloud]
    end

    subgraph IngressLayer["Ingress & Routing"]
        WH[Webhook Gateway]
        DD[Deduplication<br/>Service]
        MR[Message Router]
    end

    subgraph AILayer["Multimodal AI Pipeline"]
        TP[Text Parser<br/>LLM Intent Extraction]
        STT[Speech-to-Text<br/>Engine]
        CV[Computer Vision<br/>QR Decoder]
        OCR[OCR Engine<br/>Document Parser]
        IE[Intent Enrichment<br/>& Entity Resolution]
    end

    subgraph ConversationLayer["Conversation Engine"]
        CSM[Conversation<br/>State Machine]
        DM[Dialogue Manager<br/>Multi-Turn Flow]
        CT[Confirmation &<br/>Disambiguation]
    end

    subgraph PaymentLayer["Payment Execution"]
        PO[Payment<br/>Orchestrator]
        FL[Fraud & Risk<br/>Scoring Engine]
        AH[Auth Handoff<br/>Deep Link Generator]
        PIX[PIX Settlement<br/>SPI Gateway]
    end

    subgraph ReceiptLayer["Post-Settlement"]
        RG[Receipt<br/>Generator]
        NF[Nota Fiscal<br/>Service]
        TM[Template Message<br/>Sender]
    end

    subgraph DataLayer["Data & State"]
        CS[(Conversation<br/>Store)]
        TL[(Transaction<br/>Ledger)]
        UP[(User Profile<br/>& History)]
        DC[(DICT Cache)]
        MQ[[Message Queue<br/>Event Bus]]
    end

    WA <--> WABA
    WABA --> WH
    WH --> DD
    DD --> MR
    MR -->|text| TP
    MR -->|audio| STT
    MR -->|image| CV
    MR -->|image| OCR
    STT --> TP
    CV --> IE
    OCR --> IE
    TP --> IE
    IE --> CSM
    CSM <--> DM
    DM <--> CT
    CT --> PO
    PO --> FL
    FL -->|approved| AH
    AH -->|user authenticates| PIX
    PIX --> RG
    RG --> NF
    RG --> TM
    TM --> WABA

    CSM <--> CS
    PO <--> TL
    IE <--> UP
    PIX <--> DC
    MR <--> MQ

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ai fill:#fce4ec,stroke:#c62828,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class WA,WABA client
    class WH,DD,MR gateway
    class TP,STT,CV,OCR,IE ai
    class CSM,DM,CT,PO,FL,AH,PIX,RG,NF,TM service
    class CS,TL,UP data
    class DC cache
    class MQ queue
```

---

## Data Flow: Payment via Text Message

```mermaid
sequenceDiagram
    participant U as User (WhatsApp)
    participant WA as WhatsApp Cloud API
    participant WH as Webhook Gateway
    participant DD as Dedup Service
    participant LLM as Text Parser (LLM)
    participant CSM as Conversation State
    participant DM as Dialogue Manager
    participant FL as Fraud Engine
    participant AH as Auth Handoff
    participant BA as Banking App
    participant SPI as PIX SPI
    participant RG as Receipt Generator

    U->>WA: "manda 50 pra Maria do trabalho"
    WA->>WH: POST /webhook (message event)
    WH->>DD: Check message_id uniqueness
    DD-->>WH: New message (not duplicate)
    WH-->>WA: 200 OK (within 2s)

    WH->>LLM: Extract intent from text
    Note over LLM: Intent: PAYMENT<br/>Amount: R$50.00<br/>Recipient: "Maria do trabalho"<br/>Confidence: 0.92

    LLM->>CSM: Store extracted entities
    CSM->>DM: Evaluate conversation state

    Note over DM: Resolve "Maria do trabalho"<br/>against user's contact/tx history<br/>Found: Maria Silva (PIX: maria@email.com)

    DM->>WA: "Confirma enviar R$50,00 para<br/>Maria Silva (maria@email.com)<br/>via PIX? [Sim] [Cancelar]"
    WA->>U: Interactive message with buttons

    U->>WA: Taps [Sim]
    WA->>WH: POST /webhook (button reply)
    WH->>DD: Check uniqueness
    WH-->>WA: 200 OK

    WH->>CSM: Update state: CONFIRMED
    CSM->>FL: Score transaction risk
    Note over FL: Risk Score: 0.12 (LOW)<br/>Known recipient, typical amount

    FL->>AH: Generate secure handoff
    AH->>WA: Deep link to banking app<br/>"Toque para autenticar no app"
    WA->>U: Message with deep link

    U->>BA: Opens banking app, biometric auth
    BA->>SPI: pacs.008 (PIX credit transfer)
    SPI-->>BA: pacs.002 (settlement confirmed)
    BA->>WH: Callback: settlement complete

    WH->>RG: Generate receipt
    RG->>WA: In-chat receipt message
    WA->>U: "PIX enviado! R$50,00 para<br/>Maria Silva ✓<br/>ID: E12345...789<br/>10/03/2026 14:32:07"
```

---

## Data Flow: Payment via Voice Message

```mermaid
sequenceDiagram
    participant U as User (WhatsApp)
    participant WA as WhatsApp Cloud API
    participant WH as Webhook Gateway
    participant STT as Speech-to-Text
    participant LLM as Text Parser (LLM)
    participant CSM as Conversation State
    participant DM as Dialogue Manager

    U->>WA: Voice message (8 seconds, Opus)
    WA->>WH: POST /webhook (audio message)
    WH-->>WA: 200 OK

    WH->>WA: GET /media/{media_id}
    WA-->>WH: Audio file (Opus, ~15KB)

    WH->>STT: Transcribe audio
    Note over STT: Decode Opus → PCM<br/>Brazilian PT model<br/>Output: "paga o joão<br/>cinquenta conto pela<br/>pizza de ontem"<br/>Confidence: 0.88

    STT->>LLM: Parse transcription
    Note over LLM: Intent: PAYMENT<br/>Amount: R$50.00<br/>("conto" → R$1 colloquial)<br/>Recipient: "João"<br/>Memo: "pizza de ontem"

    LLM->>CSM: Store entities
    CSM->>DM: Resolve recipient

    Note over DM: Multiple "João" matches<br/>João Pedro (last PIX: 2 days ago)<br/>João Carlos (last PIX: 3 months ago)

    DM->>WA: "Entendi: pagar R$50 para João.<br/>Qual João?<br/>[João Pedro] [João Carlos]<br/>[Outro]"
    WA->>U: Disambiguation message

    U->>WA: Taps [João Pedro]
    Note over DM: Continue to confirmation<br/>and payment flow...
```

---

## Data Flow: Payment via QR Code Photo

```mermaid
sequenceDiagram
    participant U as User (WhatsApp)
    participant WA as WhatsApp Cloud API
    participant WH as Webhook Gateway
    participant CV as Computer Vision
    participant QR as QR Decoder
    participant CSM as Conversation State

    U->>WA: Photo of QR code on receipt
    WA->>WH: POST /webhook (image message)
    WH-->>WA: 200 OK

    WH->>WA: GET /media/{media_id}
    WA-->>WH: Image file (JPEG, ~200KB)

    WH->>CV: Detect QR regions in image
    Note over CV: Pre-processing:<br/>- Perspective correction<br/>- Contrast enhancement<br/>- Region detection<br/>Found: 1 QR code region

    CV->>QR: Decode QR payload
    Note over QR: BR Code TLV parsing:<br/>- Merchant: Pizzaria Bella<br/>- PIX Key: 12345678000199<br/>- Amount: R$47.50<br/>- City: São Paulo<br/>- CRC: Valid ✓

    alt Dynamic QR (COB/COBV)
        QR->>QR: Fetch charge from hosted URL
        Note over QR: GET /cobv/{txid}<br/>Validate JWT signature<br/>Check expiration
    end

    QR->>CSM: Store decoded payment info
    CSM->>WA: "QR Code lido! Pagar:<br/>R$47,50 para Pizzaria Bella<br/>CNPJ: 12.345.678/0001-99<br/>[Pagar] [Cancelar]"
    WA->>U: Confirmation with details
```

---

## Key Architectural Decisions

### 1. Sync vs. Async Communication

| Component | Model | Justification |
|---|---|---|
| Webhook ingestion | **Async** | Must acknowledge within 20s (WhatsApp timeout); actual processing happens asynchronously via message queue |
| AI pipeline (STT, CV, LLM) | **Async with streaming** | AI inference takes 1-4 seconds; queue-based with priority (text fastest, voice/image slower) |
| Payment settlement (SPI) | **Sync** | PIX settlement is inherently synchronous; the payer's PSP submits to SPI and waits for pacs.002 confirmation |
| Receipt delivery | **Async** | Decoupled from settlement; receipt generation and WhatsApp message sending happen after settlement callback |

### 2. Event-Driven vs. Request-Response

**Decision: Event-driven core with request-response at boundaries.**

The system's internal architecture is event-driven: each message ingestion produces an event that flows through the AI pipeline, conversation engine, and payment orchestrator. This enables:
- Decoupling between AI processing stages (STT can scale independently of CV)
- Retry and dead-letter handling for failed AI inferences
- Audit trail via event log (every state transition recorded)

Request-response is used only at system boundaries:
- WhatsApp Cloud API (webhooks in, API calls out)
- PIX SPI integration (pacs.008 request, pacs.002 response)
- DICT lookups (key-to-account resolution)

### 3. Database Choices (Polyglot Persistence)

| Data | Store Type | Rationale |
|---|---|---|
| **Conversation state** | Document store (e.g., MongoDB) | Flexible schema for multi-turn dialogue; per-user partition; TTL for 24-hour window expiry |
| **Transaction ledger** | Relational DB (e.g., PostgreSQL) | ACID guarantees for financial records; strong consistency; audit requirements |
| **User profiles & history** | Document store | Semi-structured user preferences, contact mappings, transaction history |
| **DICT cache** | In-memory store (e.g., Redis) | Sub-millisecond key-to-account lookups; TTL-based refresh from BCB |
| **Message deduplication** | In-memory store (e.g., Redis) | WhatsApp message ID dedup with 24-hour TTL |
| **Event bus** | Distributed log (e.g., Kafka) | Ordered event processing per conversation; replay capability; exactly-once semantics |
| **AI model registry** | Object storage + metadata DB | Model versioning, A/B testing, rollback capability |
| **Audit logs** | Append-only store | Immutable, hash-chained for regulatory compliance |

### 4. Caching Strategy

| Cache Layer | Data | TTL | Strategy |
|---|---|---|---|
| **L1 (in-process)** | Active conversation state | 5 min | LRU; ~10K concurrent conversations per node |
| **L2 (distributed)** | Conversation state, user profiles | 24 hours | Write-through for state, read-through for profiles |
| **DICT cache** | PIX key → account mappings | 15 min | Background refresh; fallback to direct DICT query on miss |
| **Template cache** | Pre-approved WhatsApp message templates | 1 hour | Refresh on template approval webhook |
| **AI model cache** | Loaded model weights | Until new version | Blue-green swap on model deployment |

### 5. Message Queue Usage

| Queue/Topic | Purpose | Ordering | Delivery |
|---|---|---|---|
| `inbound-messages` | Raw webhook events | Per-conversation (partition by user phone hash) | At-least-once with dedup |
| `ai-pipeline` | AI processing tasks | Per-conversation | At-least-once; priority sub-queues by modality |
| `payment-commands` | Confirmed payment intents | Per-user | Exactly-once (idempotency key) |
| `settlement-events` | SPI settlement callbacks | Per-transaction | At-least-once with dedup by endToEndId |
| `outbound-messages` | WhatsApp API messages to send | Per-conversation | At-least-once with rate limiting (80-1000 msg/s) |
| `audit-events` | All state transitions | Global ordering | At-least-once; append-only consumer |

---

## Architecture Pattern Checklist

- [x] **Sync vs Async**: Async ingestion + processing; sync at payment settlement boundary
- [x] **Event-driven vs Request-response**: Event-driven core; request-response at WhatsApp and PIX boundaries
- [x] **Push vs Pull**: Push-based (WhatsApp pushes webhooks to us; we push messages back via API)
- [x] **Stateless vs Stateful**: Stateless services with externalized state (conversation store, ledger); AI models loaded in memory (stateful at node level, but horizontally scalable)
- [x] **Read-heavy vs Write-heavy**: Write-heavy for ingestion (35M messages/day); read-heavy for conversation state retrieval during multi-turn flows
- [x] **Real-time vs Batch**: Real-time for all transaction paths; batch for analytics, model retraining, and compliance reporting
- [x] **Edge vs Origin**: Origin processing for AI inference (GPU requirements); edge CDN not applicable (no static content)

---

## Component Interaction Summary

### Happy Path (Text Payment)

1. **Ingress** (50ms): Webhook received → deduplicated → queued
2. **AI Extraction** (500ms-1.5s): LLM parses text → extracts intent, amount, recipient
3. **Entity Resolution** (200ms): Recipient name → PIX key via user history + DICT
4. **Conversation Turn** (100ms): State machine transitions → generates confirmation message
5. **User Confirmation** (human time): User taps "Confirm" button
6. **Fraud Scoring** (100ms): Risk assessment on extracted transaction parameters
7. **Auth Handoff** (200ms): Generate deep link with encrypted, short-lived token
8. **User Authentication** (human time): Biometric/PIN in banking app
9. **PIX Settlement** (3-10s): SPI processes pacs.008 → returns pacs.002
10. **Receipt** (500ms): Generate receipt → send via WhatsApp template message

**Total system time (excluding human interaction):** ~2-13 seconds
**Total user-perceived time (including authentication):** ~15-30 seconds

### Degraded Mode

| Failure | Degraded Behavior |
|---|---|
| LLM unavailable | Fall back to rule-based regex extraction for simple patterns; queue complex messages for retry |
| STT unavailable | Respond with "Voice messages temporarily unavailable, please type your request" |
| CV unavailable | Respond with "Photo processing unavailable, please enter PIX key manually" |
| DICT cache miss | Direct DICT query (30-50ms instead of 2ms); still within latency budget |
| SPI unavailable | Queue payment for retry; notify user of delay; this is extremely rare (PIX operates 24/7) |
| WhatsApp API rate limited | Queue outbound messages; prioritize payment confirmations and receipts over informational messages |
