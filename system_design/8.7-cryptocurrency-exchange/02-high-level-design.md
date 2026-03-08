# High-Level Design

## Architecture Overview

The cryptocurrency exchange follows a **CQRS + event-sourcing** architecture. The matching engine is the single source of truth---a deterministic state machine that processes orders and emits events. All downstream systems (balance service, market data, risk engine, settlement) consume these events independently. The custody layer (hot/warm/cold wallets) operates as a separate security domain with its own authorization boundaries.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WEB[Web App]
        MOB[Mobile App]
        APIC[API Clients]
        FIX[FIX Protocol]
    end

    subgraph Gateway["API Gateway Layer"]
        GW[API Gateway]
        WS[WebSocket Gateway]
        RL[Rate Limiter]
        AUTH[Auth Service]
    end

    subgraph TradingCore["Trading Core"]
        OMS[Order Management<br/>Service]
        ME[Matching Engine<br/>per pair]
        RISK[Pre-Trade<br/>Risk Check]
    end

    subgraph BalanceLayer["Balance & Settlement"]
        BAL[Balance Service]
        SETTLE[Settlement<br/>Service]
        LED[Ledger Service]
        FEE[Fee Service]
    end

    subgraph MarketData["Market Data"]
        MDP[Market Data<br/>Processor]
        OB[Order Book<br/>Aggregator]
        CANDLE[Candlestick<br/>Generator]
        TICKER[Ticker Service]
    end

    subgraph Custody["Custody Layer"]
        HW[Hot Wallet<br/>Service]
        WW[Warm Wallet<br/>Service]
        CW[Cold Wallet<br/>Manager]
        HSM[HSM / MPC<br/>Signing]
    end

    subgraph Blockchain["Blockchain Layer"]
        DEP[Deposit<br/>Monitor]
        WITH[Withdrawal<br/>Broadcaster]
        NODE[Blockchain<br/>Nodes]
    end

    subgraph DataStores["Data Stores"]
        PG[(Primary DB<br/>PostgreSQL)]
        TS[(Time-Series DB)]
        RD[(Redis Cache)]
        EL[Event Log<br/>Append-Only]
    end

    subgraph Support["Support Services"]
        KYC[KYC/AML<br/>Service]
        NOTIF[Notification<br/>Service]
        FRAUD[Fraud<br/>Detection]
        MARGIN[Margin &<br/>Liquidation]
    end

    WEB & MOB & APIC --> GW
    FIX --> OMS
    GW --> RL --> AUTH --> OMS
    GW --> WS
    OMS --> RISK --> ME
    ME --> EL
    EL --> BAL & SETTLE & MDP & MARGIN
    BAL --> LED
    SETTLE --> FEE
    MDP --> OB & CANDLE & TICKER
    OB & CANDLE & TICKER --> WS
    BAL --> PG
    MDP --> TS
    OMS --> RD
    DEP --> NODE
    WITH --> NODE
    DEP --> BAL
    WITH --> HW
    HW --> HSM
    WW --> HSM
    CW --> HSM
    HW <--> WW <--> CW
    KYC --> PG
    FRAUD --> BAL
    MARGIN --> ME

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class WEB,MOB,APIC,FIX client
    class GW,WS,RL,AUTH gateway
    class OMS,ME,RISK,BAL,SETTLE,LED,FEE,MDP,OB,CANDLE,TICKER,HW,WW,CW,HSM,DEP,WITH,NODE,KYC,NOTIF,FRAUD,MARGIN service
    class PG,TS,EL data
    class RD cache
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Matching engine model** | Single-threaded per pair, event-sourced | Determinism eliminates race conditions; replay enables audit and recovery |
| **State management** | CQRS (command/query separation) | Write path (matching) optimized for throughput; read path (market data) optimized for fan-out |
| **Custody architecture** | Hot/warm/cold with MPC signing | Defense-in-depth; hot wallet exposure minimized; MPC eliminates single private key risk |
| **Order book data structure** | Red-black tree per side (bid/ask) | O(log n) insert/delete/match; maintains sorted order for price-time priority |
| **Market data distribution** | Publish-subscribe via message broker | Decouples matching engine from millions of consumers; enables independent scaling |
| **Balance updates** | Event-driven from matching engine | Single source of truth; no dual-write; balances always consistent with trade events |
| **Blockchain integration** | One microservice per chain family | UTXO chains (Bitcoin) and account chains (Ethereum) have fundamentally different deposit/withdrawal logic |
| **Database strategy** | Relational for balances/orders; time-series for market data | ACID for financial correctness; columnar time-series for efficient candlestick queries |

---

## Data Flow: Order Lifecycle

```mermaid
sequenceDiagram
    participant U as Trader
    participant GW as API Gateway
    participant OMS as Order Management
    participant RISK as Risk Check
    participant ME as Matching Engine
    participant EL as Event Log
    participant BAL as Balance Service
    participant MD as Market Data
    participant WS as WebSocket

    U->>GW: Place limit order (BTC/USDT, buy 1 BTC @ $60,000)
    GW->>GW: Authenticate + rate limit
    GW->>OMS: Forward order
    OMS->>RISK: Pre-trade validation
    RISK->>BAL: Check available balance (60,000 USDT)
    BAL-->>RISK: Balance sufficient
    RISK->>RISK: Position limits, pair status
    RISK-->>OMS: Approved
    OMS->>BAL: Lock 60,000 USDT (available → locked)
    OMS->>ME: Submit order to engine
    ME->>ME: Match against order book
    alt Full or partial fill
        ME->>EL: Emit fill events
        EL->>BAL: Update balances (unlock + settle)
        EL->>MD: Trade event
        MD->>WS: Push to subscribers
        BAL-->>U: Fill notification
    else No match (rests on book)
        ME->>EL: Emit order-accepted event
        EL->>MD: Order book update
        MD->>WS: Push book delta
    end
    ME-->>OMS: Execution report
    OMS-->>GW: Order response
    GW-->>U: Confirmation
```

---

## Data Flow: Deposit Pipeline

```mermaid
sequenceDiagram
    participant USER as User
    participant EX as Exchange UI
    participant ADDR as Address Service
    participant NODE as Blockchain Node
    participant DEP as Deposit Monitor
    participant CONF as Confirmation Tracker
    participant BAL as Balance Service
    participant NOTIF as Notification

    USER->>EX: Request deposit address (ETH)
    EX->>ADDR: Generate address for user
    ADDR->>ADDR: Derive from HD wallet (BIP-44)
    ADDR-->>EX: Display deposit address + QR
    USER->>NODE: Send ETH to deposit address
    NODE->>DEP: New transaction detected
    DEP->>DEP: Parse tx, identify user, validate amount
    DEP->>CONF: Track confirmation count
    loop Every block
        NODE->>CONF: New block mined
        CONF->>CONF: Increment confirmations
    end
    CONF->>CONF: Required confirmations reached (64 for ETH)
    CONF->>BAL: Credit user balance
    BAL->>BAL: Update available balance
    BAL->>NOTIF: Deposit confirmed
    NOTIF->>USER: Push notification + email
```

---

## Data Flow: Withdrawal Pipeline

```mermaid
sequenceDiagram
    participant USER as User
    participant GW as API Gateway
    participant WITH as Withdrawal Service
    participant FRAUD as Fraud Check
    participant BAL as Balance Service
    participant APPROVE as Approval Engine
    participant SIGN as MPC Signer
    participant HW as Hot Wallet
    participant NODE as Blockchain Node

    USER->>GW: Request withdrawal (2 BTC to address)
    GW->>WITH: Process withdrawal
    WITH->>BAL: Check available balance
    BAL-->>WITH: Balance sufficient
    WITH->>BAL: Lock withdrawal amount + fee
    WITH->>FRAUD: Risk assessment
    FRAUD->>FRAUD: Check address reputation, velocity, amount
    alt Low risk (automated)
        FRAUD-->>WITH: Auto-approved
        WITH->>SIGN: Request transaction signing
        SIGN->>SIGN: MPC threshold signing (3-of-5)
        SIGN-->>WITH: Signed transaction
        WITH->>HW: Broadcast via hot wallet
        HW->>NODE: Submit to blockchain
        NODE-->>WITH: Transaction hash
        WITH->>BAL: Debit balance (locked → withdrawn)
        WITH->>USER: Tx hash + confirmation
    else High risk (manual review)
        FRAUD-->>WITH: Requires manual approval
        WITH->>APPROVE: Queue for compliance review
        APPROVE->>APPROVE: Human reviewer checks
        APPROVE-->>WITH: Approved / Rejected
    end
```

---

## Component Responsibilities

### Trading Core

| Component | Responsibility |
|-----------|---------------|
| **Order Management Service** | Order validation, lifecycle tracking, cancel/amend handling, idempotency |
| **Matching Engine** | Price-time priority matching, order book maintenance, fill generation, deterministic execution |
| **Pre-Trade Risk Check** | Balance verification, position limits, pair trading status, self-trade prevention |

### Balance and Settlement

| Component | Responsibility |
|-----------|---------------|
| **Balance Service** | Available/locked/frozen balance management, atomic transitions, double-spend prevention |
| **Settlement Service** | Post-trade settlement, balance transfers between buyer and seller |
| **Ledger Service** | Immutable double-entry ledger of all balance changes, reconciliation source of truth |
| **Fee Service** | Maker/taker fee calculation, VIP tier lookup, fee discounts, fee collection to platform account |

### Custody

| Component | Responsibility |
|-----------|---------------|
| **Hot Wallet Service** | Automated withdrawals, balance monitoring, rebalance triggers |
| **Warm Wallet Service** | Buffer between hot and cold, multi-sig transfers, scheduled sweeps |
| **Cold Wallet Manager** | Air-gapped storage, manual multi-party ceremony for withdrawals |
| **HSM/MPC Signing** | Threshold signature generation, key share management, ceremony orchestration |

### Market Data

| Component | Responsibility |
|-----------|---------------|
| **Market Data Processor** | Consume matching engine events, normalize trade/book data |
| **Order Book Aggregator** | Maintain L2 (price-level) and L3 (order-level) book snapshots |
| **Candlestick Generator** | Aggregate trades into OHLCV candles at multiple intervals |
| **Ticker Service** | Compute 24h rolling statistics (price, volume, change) per pair |

---

## Cross-Cutting Concerns

### Idempotency

Every order submission carries a client-generated `client_order_id`. The Order Management Service deduplicates using a Redis-backed idempotency cache (30s TTL) with a database unique constraint as safety net. Duplicate submissions return the original response without re-processing.

### Event Sourcing and Replay

The matching engine writes every input and output to an append-only event log. On recovery, the engine replays the log from the last snapshot to reconstruct state. This guarantees:
- Zero order loss after acknowledgment
- Deterministic audit trail for regulatory review
- Ability to replay any point in time for debugging

### Rate Limiting

Three tiers of rate limiting:
1. **IP-level**: 1,200 requests/min (anti-DDoS)
2. **Account-level**: Varies by VIP tier (120-6,000 orders/min)
3. **Pair-level**: Prevents single user from overwhelming one market

### Circuit Breaking

If the matching engine falls behind (input queue depth > threshold), the gateway rejects new orders with a "system busy" response rather than queuing unboundedly. This prevents cascading latency during flash crashes.
