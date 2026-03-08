# High-Level Design

## Architecture Overview

The digital wallet system follows a **ledger-centric** architecture where the double-entry ledger is the single source of truth for all financial state. Every service that moves money does so by writing journal entries to the ledger. The architecture is shaped by three realities: (1) ledger consistency is non-negotiable---every debit must have a corresponding credit; (2) balance checks and debits must be atomic to prevent double-spend; (3) user funds are custodial, requiring clean separation between user balances and platform revenue.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        MOB[Mobile App]
        WEB[Web App]
        MSDK[Merchant SDK]
        POS[POS Terminal<br/>NFC / QR]
    end

    subgraph Gateway["API Layer"]
        GW[API Gateway<br/>Rate Limit · Auth · Routing]
        IDEM[Idempotency<br/>Service]
    end

    subgraph Core["Core Services"]
        direction TB
        WALLET[Wallet<br/>Service]
        LEDGER[Ledger<br/>Service]
        TRANSFER[Transfer<br/>Service]
        TOPUP[Top-Up<br/>Service]
        MERCHANT[Merchant Payment<br/>Service]
        BILL[Bill Payment<br/>Service]
        WITHDRAW[Withdrawal<br/>Service]
        KYC[KYC<br/>Service]
        FRAUD[Fraud Detection<br/>Service]
        NOTIF[Notification<br/>Service]
    end

    subgraph External["External Systems"]
        BANK[Partner Banks<br/>Escrow Accounts]
        CARD[Card Networks]
        UPI[UPI / ACH<br/>Rail]
        KYCPROV[KYC Verification<br/>Provider]
        SMSPUSH[SMS / Push<br/>Gateway]
    end

    subgraph Data["Data Layer"]
        PG[(PostgreSQL Cluster<br/>Wallets · Ledger · Transactions)]
        REDIS[(Redis Cluster<br/>Balance Cache · Rate Limits · Locks)]
        KAFKA[Event Stream<br/>Transaction Events · Audit Log]
        OBJ[(Object Storage<br/>KYC Documents · Statements)]
        TSDB[(Time-Series DB<br/>Metrics · Fraud Features)]
    end

    MOB & WEB & MSDK & POS --> GW
    GW --> IDEM
    IDEM --> WALLET & TRANSFER & TOPUP & MERCHANT & BILL & WITHDRAW
    WALLET --> LEDGER
    TRANSFER --> LEDGER & FRAUD
    TOPUP --> LEDGER & BANK & CARD & UPI
    MERCHANT --> LEDGER & FRAUD
    BILL --> LEDGER
    WITHDRAW --> LEDGER & BANK
    WALLET --> KYC
    KYC --> KYCPROV & OBJ
    FRAUD --> TSDB & REDIS
    LEDGER --> PG & KAFKA
    WALLET --> PG & REDIS
    TRANSFER --> KAFKA
    KAFKA --> NOTIF & FRAUD
    NOTIF --> SMSPUSH

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#b71c1c,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class MOB,WEB,MSDK,POS client
    class GW,IDEM gateway
    class WALLET,LEDGER,TRANSFER,TOPUP,MERCHANT,BILL,WITHDRAW,KYC,FRAUD,NOTIF service
    class BANK,CARD,UPI,KYCPROV,SMSPUSH external
    class PG,OBJ data
    class KAFKA queue
    class REDIS,TSDB cache
```

---

## Service Responsibilities

| Service | Responsibility | Key Characteristics |
|---------|---------------|---------------------|
| **Wallet Service** | Wallet lifecycle (create, suspend, close), balance queries, KYC tier enforcement, linked instrument management | Read-heavy; owns wallet metadata; delegates financial ops to Ledger |
| **Ledger Service** | Append journal entries (double-entry), compute running balances, atomic balance-check-and-debit | Write-heavy; ACID; sharded by wallet ID; append-only |
| **Transfer Service** | Orchestrate P2P transfers: validate → fraud check → debit sender → credit receiver | Saga coordinator for cross-shard transfers; idempotent |
| **Top-Up Service** | Orchestrate wallet loading: initiate bank/card charge → on confirmation → credit wallet | Async confirmation from external payment rails |
| **Merchant Payment Service** | Process QR/NFC payments: decode payment request → debit user → credit merchant → record fee | Sub-second latency critical; inline fraud check |
| **Bill Payment Service** | Process bill payments to biller integrations; handle async confirmation and receipt | Integrates with biller aggregators |
| **Withdrawal Service** | Transfer wallet balance to linked bank account; enforce limits | Subject to KYC tier withdrawal limits; T+0 to T+1 |
| **KYC Service** | Manage identity verification lifecycle; document storage; tier assignment | Integrates with external verification providers |
| **Fraud Detection Service** | Real-time transaction risk scoring; velocity checks; device fingerprinting; behavioral analysis | ML model inference < 100ms; feature store in time-series DB |
| **Notification Service** | Transaction confirmations, payment requests, promotional notifications | Event-driven; multi-channel (push, SMS, email) |
| **Idempotency Service** | Deduplicate requests using client-provided idempotency keys | Redis-backed; prevents double-charges on network retries |

---

## Data Flow 1: P2P Transfer (Same Shard)

```
User A sends $50 to User B (both wallets on same database shard)

1. Mobile App → API Gateway → Transfer Service
   - Request includes: sender_wallet_id, receiver_phone, amount, idempotency_key
2. Idempotency Service: check if idempotency_key already processed
   - Key exists → return cached response (prevent double-transfer)
   - Key new → proceed
3. Transfer Service → Wallet Service: resolve receiver by phone number
   - Returns receiver_wallet_id
4. Transfer Service → Fraud Detection Service: score transaction
   - Input: sender profile, receiver profile, amount, device fingerprint, velocity features
   - Output: risk_score = 12 (low risk, threshold = 70) → proceed
5. Transfer Service → Ledger Service: execute atomic transfer
   BEGIN TRANSACTION
     a. Read sender balance (SELECT ... FOR UPDATE on wallet row)
        - balance = $200 → sufficient
     b. Insert ledger entry: DEBIT sender_wallet $50 (journal_id: J-001)
     c. Insert ledger entry: CREDIT receiver_wallet $50 (journal_id: J-001)
     d. Update sender cached balance: $200 → $150
     e. Update receiver cached balance: $80 → $130
   COMMIT
6. Transfer Service → Kafka: publish TransferCompleted event
7. Notification Service (async):
   - Push to sender: "You sent $50 to User B"
   - Push to receiver: "You received $50 from User A"
8. Return to sender: {status: "SUCCESS", new_balance: $150, txn_id: "TXN-123"}
```

---

## Data Flow 2: Merchant QR Payment

```
User scans merchant QR code to pay $25 for coffee

1. POS displays QR code containing: merchant_id, amount, order_ref, nonce
2. User's mobile app scans QR → decodes payment request
3. App displays: "Pay $25 to Coffee Shop?" → User confirms with biometric
4. Mobile App → API Gateway → Merchant Payment Service
   - Request: user_wallet_id, merchant_id, amount: $25, qr_nonce, idempotency_key
5. Idempotency check → new request → proceed
6. Fraud Detection: inline risk scoring (< 50ms)
   - Velocity check: user's 5th payment today (normal for this user) → low risk
7. Merchant Payment Service → Ledger Service: atomic payment
   BEGIN TRANSACTION
     a. SELECT sender balance FOR UPDATE: $150 ≥ $25 → proceed
     b. DEBIT user_wallet $25 (journal_id: J-002)
     c. CREDIT merchant_wallet $24.50 (journal_id: J-002, after 2% fee)
     d. CREDIT platform_fee_account $0.50 (journal_id: J-002)
     e. Update cached balances
   COMMIT
8. Kafka: publish MerchantPaymentCompleted event
9. Notifications (async):
   - Push to user: "Paid $25 to Coffee Shop"
   - Push to merchant POS: "Payment received $24.50"
   - Webhook to merchant backend: payment confirmation with order_ref
10. Return to user app: {status: "SUCCESS", new_balance: $125}
    → App shows green checkmark with amount
```

---

## Data Flow 3: Wallet Top-Up via Bank Transfer

```
User loads $500 into wallet from linked bank account

1. Mobile App → API Gateway → Top-Up Service
   - Request: wallet_id, amount: $500, source: linked_bank_account_id, idempotency_key
2. KYC tier check: user is Tier 2 (intermediate KYC)
   - Monthly top-up limit: $5,000; used this month: $2,000 → $500 allowed
3. Top-Up Service → Bank Integration: initiate debit from user's bank account
   - ACH/UPI/NEFT request with callback URL
4. Return to user: {status: "PROCESSING", estimated_time: "30 seconds to 2 minutes"}
5. --- Async bank confirmation ---
   Bank sends callback: {status: "SUCCESS", bank_ref: "BANK-789"}
6. Top-Up Service → Ledger Service: credit wallet
   BEGIN TRANSACTION
     a. INSERT ledger entry: DEBIT escrow_bank_account $500 (journal_id: J-003)
     b. INSERT ledger entry: CREDIT user_wallet $500 (journal_id: J-003)
     c. Update cached balance: $125 → $625
   COMMIT
7. Kafka: publish TopUpCompleted event
8. Notification → Push: "Your wallet has been loaded with $500. New balance: $625"
```

---

## Data Flow 4: P2P Transfer Sequence Diagram

```mermaid
sequenceDiagram
    actor Sender
    participant App as Mobile App
    participant GW as API Gateway
    participant Idem as Idempotency Service
    participant Xfer as Transfer Service
    participant Fraud as Fraud Detection
    participant Ledger as Ledger Service
    participant DB as PostgreSQL
    participant Notif as Notification Service
    actor Receiver

    Sender->>App: Send $50 to Receiver
    App->>GW: POST /transfers (idempotency_key)
    GW->>Idem: Check idempotency_key
    Idem-->>GW: Key not found (new request)
    GW->>Xfer: processTransfer(sender, receiver, $50)
    Xfer->>Fraud: scoreTransaction(context)
    Fraud-->>Xfer: risk_score: 12 (LOW)

    Xfer->>Ledger: executeTransfer(sender, receiver, $50)
    Ledger->>DB: BEGIN TRANSACTION
    Ledger->>DB: SELECT balance FROM wallets WHERE id=sender FOR UPDATE
    DB-->>Ledger: balance = $200

    Note over Ledger,DB: Balance check: $200 >= $50 ✓

    Ledger->>DB: INSERT ledger_entry (DEBIT sender $50)
    Ledger->>DB: INSERT ledger_entry (CREDIT receiver $50)
    Ledger->>DB: UPDATE wallet SET balance=$150 WHERE id=sender
    Ledger->>DB: UPDATE wallet SET balance=$130 WHERE id=receiver
    Ledger->>DB: COMMIT
    DB-->>Ledger: Transaction committed

    Ledger-->>Xfer: Transfer successful
    Xfer->>Idem: Cache response for idempotency_key
    Xfer-->>GW: {status: SUCCESS, balance: $150}
    GW-->>App: 200 OK
    App-->>Sender: "Sent $50 to Receiver ✓"

    Xfer-)Notif: TransferCompleted event
    Notif-)Sender: Push: "You sent $50"
    Notif-)Receiver: Push: "You received $50 from Sender"
```

---

## Wallet Lifecycle State Diagram

```mermaid
stateDiagram-v2
    [*] --> CREATED: User signs up (phone verified)
    CREATED --> KYC_BASIC: Basic KYC submitted
    KYC_BASIC --> ACTIVE_TIER1: Basic KYC approved
    KYC_BASIC --> KYC_REJECTED: Verification failed
    KYC_REJECTED --> KYC_BASIC: Re-submit documents
    ACTIVE_TIER1 --> ACTIVE_TIER2: Intermediate KYC approved
    ACTIVE_TIER2 --> ACTIVE_TIER3: Full KYC approved
    ACTIVE_TIER1 --> SUSPENDED: Fraud detected / compliance hold
    ACTIVE_TIER2 --> SUSPENDED: Fraud detected / compliance hold
    ACTIVE_TIER3 --> SUSPENDED: Fraud detected / compliance hold
    SUSPENDED --> ACTIVE_TIER1: Investigation cleared
    SUSPENDED --> ACTIVE_TIER2: Investigation cleared
    SUSPENDED --> ACTIVE_TIER3: Investigation cleared
    SUSPENDED --> CLOSED: Permanent ban / user request
    ACTIVE_TIER1 --> CLOSE_REQUESTED: User requests closure
    ACTIVE_TIER2 --> CLOSE_REQUESTED: User requests closure
    ACTIVE_TIER3 --> CLOSE_REQUESTED: User requests closure
    CLOSE_REQUESTED --> CLOSED: Balance withdrawn + 30-day wait
    CLOSED --> [*]: Wallet archived (data retained per policy)
```

---

## Transaction State Diagram

```mermaid
stateDiagram-v2
    [*] --> INITIATED: User submits transaction
    INITIATED --> FRAUD_CHECK: Idempotency verified
    FRAUD_CHECK --> APPROVED: Risk score below threshold
    FRAUD_CHECK --> HELD_FOR_REVIEW: Risk score in gray zone
    FRAUD_CHECK --> DECLINED: Risk score above threshold
    HELD_FOR_REVIEW --> APPROVED: Manual review passed
    HELD_FOR_REVIEW --> DECLINED: Manual review failed
    APPROVED --> PROCESSING: Ledger write started
    PROCESSING --> COMPLETED: Ledger committed successfully
    PROCESSING --> FAILED: Ledger write failed (insufficient balance, DB error)
    COMPLETED --> REVERSAL_INITIATED: Dispute / refund requested
    REVERSAL_INITIATED --> REVERSED: Reversal ledger entries committed
    FAILED --> [*]: Error returned to user
    DECLINED --> [*]: Decline returned to user
    COMPLETED --> [*]: Success (normal flow)
    REVERSED --> [*]: Refund completed
```

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Ledger model** | Double-entry with immutable journal entries | Accounting standard; enables full audit trail; ensures books always balance |
| **Balance storage** | Materialized balance field + ledger entries | Balance = SUM(credits) - SUM(debits) is too slow for real-time queries; materialize and update atomically with ledger writes |
| **Concurrency control** | Pessimistic locking (SELECT FOR UPDATE) on wallet row | Prevents double-spend; acceptable contention for per-user serialization |
| **P2P cross-shard** | Saga with transfer ledger as intermediary | Sender and receiver on different shards cannot share a transaction; saga ensures atomicity |
| **Idempotency** | Client-provided idempotency key, server-side dedup | Network retries must not cause double-charges; Redis TTL for key expiry |
| **Fraud detection** | Inline (synchronous) for all transactions | Reject high-risk transactions before ledger write; < 100ms latency budget |
| **Event streaming** | Kafka for transaction lifecycle events | Decouples notifications, analytics, fraud feature updates from transaction critical path |
| **Top-up confirmation** | Async with bank callback | Bank transfers are inherently async (ACH/NEFT); wallet credit happens on confirmation |
| **KYC tiering** | Progressive unlock with per-tier limits | Regulatory requirement; balances friction (easy onboard) with compliance (full verification for high limits) |

---

## Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Ledger Database** | PostgreSQL (sharded by wallet_id) | ACID for financial transactions; mature; row-level locking for concurrency control |
| **Balance Cache** | Redis Cluster | Sub-ms balance reads; distributed locks for cross-shard coordination |
| **Event Streaming** | Kafka | Durable event log for transaction events, audit trail, fraud feature pipeline |
| **Object Storage** | Cloud object storage | KYC documents, account statements, regulatory archives |
| **Time-Series DB** | Time-series database | Fraud feature store (velocity counters, behavioral timeseries), metrics |
| **API Gateway** | Rate limiting, JWT auth, TLS termination | Protect against abuse; authenticate; route to services |
| **Fraud ML Model** | Real-time inference service | Risk scoring within 100ms; feature store for model inputs |
| **Notification** | Push gateway + SMS provider | Multi-channel transaction alerts; regulatory requirement for debit notifications |

---

## Double-Entry Ledger: Conceptual Model

Every financial operation is expressed as a journal entry with balanced debits and credits:

```
Journal Entry J-001: P2P Transfer ($50, User A → User B)
┌─────────────────────┬──────────┬──────────┐
│ Account             │ Debit    │ Credit   │
├─────────────────────┼──────────┼──────────┤
│ User A Wallet       │ $50.00   │          │
│ User B Wallet       │          │ $50.00   │
├─────────────────────┼──────────┼──────────┤
│ Total               │ $50.00   │ $50.00   │ ← Must always balance
└─────────────────────┴──────────┴──────────┘

Journal Entry J-002: Merchant Payment ($25, User → Coffee Shop, 2% fee)
┌─────────────────────┬──────────┬──────────┐
│ Account             │ Debit    │ Credit   │
├─────────────────────┼──────────┼──────────┤
│ User Wallet         │ $25.00   │          │
│ Merchant Wallet     │          │ $24.50   │
│ Platform Fee Account│          │ $0.50    │
├─────────────────────┼──────────┼──────────┤
│ Total               │ $25.00   │ $25.00   │ ← Must always balance
└─────────────────────┴──────────┴──────────┘

Journal Entry J-003: Wallet Top-Up ($500, Bank → User)
┌─────────────────────┬──────────┬──────────┐
│ Account             │ Debit    │ Credit   │
├─────────────────────┼──────────┼──────────┤
│ Escrow Bank Account │ $500.00  │          │
│ User Wallet         │          │ $500.00  │
├─────────────────────┼──────────┼──────────┤
│ Total               │ $500.00  │ $500.00  │ ← Must always balance
└─────────────────────┴──────────┴──────────┘
```

### Chart of Accounts

```
Account Types in the Wallet System:
├── ASSET accounts
│   ├── Escrow Bank Account (money held at partner bank on behalf of users)
│   └── Receivables (pending bank settlements)
├── LIABILITY accounts
│   ├── User Wallet accounts (money owed to users)
│   └── Merchant Wallet accounts (money owed to merchants)
├── REVENUE accounts
│   ├── Transaction Fee Revenue
│   ├── Withdrawal Fee Revenue
│   └── FX Markup Revenue
└── EXPENSE accounts
    ├── Bank Transfer Costs
    ├── Payment Processing Costs
    └── Cashback/Promotional Expense
```
