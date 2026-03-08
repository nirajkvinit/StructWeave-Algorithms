# High-Level Design

## Architecture Overview

The stock trading platform follows an **event-driven order pipeline** pattern for order flow and a **binary multicast fan-out** pattern for market data distribution. The architecture is shaped by three realities: (1) the exchange is the external matching authority—the broker routes, not matches; (2) market open creates a predictable but extreme 15× traffic spike; (3) every order must pass pre-trade risk checks in microseconds.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WEB[Web App — Kite]
        MOB[Mobile App]
        API[Kite Connect API<br/>Algo Trading]
    end

    subgraph Gateway["API Layer"]
        GW[API Gateway<br/>Rate Limit · Auth · Throttle]
        OGW[Order Gateway<br/>Co-located at Exchange]
    end

    subgraph Core["Core Services"]
        direction TB
        OMS[Order Management<br/>System]
        RISK[Risk Engine<br/>Margin · Limits]
        POS[Position<br/>Service]
        PORT[Portfolio &<br/>Holdings Service]
        MDS[Market Data<br/>Service]
        TICK[Ticker<br/>WebSocket Server]
        CHART[Chart &<br/>Historical Data]
        GTT[GTT Trigger<br/>Service]
        NOTIF[Notification<br/>Service]
        SETTLE[Settlement<br/>Service]
    end

    subgraph Exchange["Exchange Layer"]
        NSE[NSE<br/>FIX Gateway]
        BSE[BSE<br/>FIX Gateway]
        MCX[MCX<br/>FIX Gateway]
        MDFEED[Exchange<br/>Market Data Feed]
    end

    subgraph Data["Data Layer"]
        PG[(PostgreSQL<br/>Orders · Trades · Users)]
        TS[(Time-Series DB<br/>OHLCV · Tick Archive)]
        REDIS[(Redis Cluster<br/>Positions · Margins · Sessions)]
        KAFKA[Event Bus<br/>Order Events · Trade Events]
        OBJ[(Object Storage<br/>Contract Notes · Reports)]
    end

    WEB & MOB & API --> GW
    GW --> OMS & PORT & CHART & GTT
    OMS --> RISK
    RISK --> OGW
    OGW --> NSE & BSE & MCX
    NSE & BSE & MCX --> OGW
    OGW --> OMS
    OMS --> POS
    OMS --> KAFKA
    KAFKA --> POS & PORT & NOTIF & SETTLE
    MDFEED --> MDS
    MDS --> TICK & CHART & GTT
    TICK --> WEB & MOB & API
    POS --> REDIS
    OMS --> PG
    SETTLE --> PG
    PORT --> PG & REDIS
    CHART --> TS
    MDS --> TS
    SETTLE --> OBJ

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef exchange fill:#fce4ec,stroke:#b71c1c,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class WEB,MOB,API client
    class GW,OGW gateway
    class OMS,RISK,POS,PORT,MDS,TICK,CHART,GTT,NOTIF,SETTLE service
    class NSE,BSE,MCX,MDFEED exchange
    class PG,OBJ,TS data
    class KAFKA queue
    class REDIS cache
```

---

## Service Responsibilities

| Service | Responsibility | Key Characteristics |
|---------|---------------|---------------------|
| **Order Management System (OMS)** | Accept, validate, route, and track orders through their lifecycle | Stateful per order; idempotent order IDs; saga coordinator |
| **Risk Engine** | Pre-trade validation: margin sufficiency, position limits, circuit breaker checks, order value limits | In-process memory; sub-100μs latency; no network calls on hot path |
| **Order Gateway (Co-located)** | FIX protocol connectivity to exchange; serialize/deserialize FIX messages; handle exchange responses | Deployed in exchange colo; dedicated leased line; binary protocol |
| **Position Service** | Track real-time intraday positions, calculate unrealized P&L, manage margin utilization | In-memory state (Redis); updated on every fill; strongly consistent |
| **Portfolio & Holdings Service** | Display holdings (delivery), historical trades, dividend history, corporate actions | PostgreSQL-backed; eventual consistency acceptable |
| **Market Data Service** | Consume exchange multicast feed, normalize, aggregate into OHLCV candles | Co-located feed handler; binary protocol parsing |
| **Ticker (WebSocket Server)** | Stream real-time market data to connected clients via WebSocket | Hundreds of thousands of concurrent connections; binary frames; Go-based |
| **Chart & Historical Data** | Serve OHLCV candles, compute technical indicators, provide historical data API | Time-series DB; pre-computed indicators; CDN-cacheable |
| **GTT Trigger Service** | Monitor market prices against user-defined trigger conditions; place orders when triggered | Background workers polling market data; at-least-once trigger guarantee |
| **Settlement Service** | Reconcile trades with clearing corporation, generate contract notes, process fund settlements | Batch processing; T+1 cycle; reconciliation with NSCCL/ICCL |
| **Notification Service** | Order execution alerts, margin calls, corporate action notices | Event-driven; push/SMS/email; async from critical path |

---

## Data Flow 1: Order Placement (Market Order)

```
User places: BUY 100 shares of RELIANCE at Market Price

1. Mobile App → API Gateway: POST /orders (instrument, qty, type=MARKET, side=BUY)
2. API Gateway → OMS: validate request schema, authenticate, rate-limit
3. OMS generates order_id (UUID), persists to PostgreSQL with status=VALIDATION_PENDING
4. OMS → Risk Engine (in-process call):
   a. Check available margin: user.available_margin >= estimated_order_value
   b. Check position limits: user.net_position + 100 <= max_position_limit
   c. Check instrument circuit breaker: RELIANCE not in circuit-breaker-halt
   d. Check order value: order_value <= max_single_order_value
   → All checks pass (< 100μs)
5. OMS → Risk Engine: block margin (deduct from available, add to blocked)
6. OMS updates order status = OPEN, publishes OrderAccepted to event bus
7. OMS → Order Gateway (co-located): send FIX NewOrderSingle message
   - FIX fields: ClOrdID, Symbol, Side=BUY, OrdType=MARKET, OrderQty=100
   - Transmitted via dedicated leased line to exchange colo
8. Order Gateway → NSE FIX Gateway: FIX message over persistent TCP session
9. NSE matching engine: matches against best ask in order book
   - Fill: 100 shares @ ₹2,450.50
10. NSE → Order Gateway: FIX ExecutionReport (ExecType=FILL, LastPx=2450.50, LastQty=100)
11. Order Gateway → OMS: trade confirmation
12. OMS updates order status = COMPLETE, creates Trade record
13. OMS → Event Bus: publishes TradeExecuted event
14. Position Service (async): updates position (RELIANCE: +100 @ ₹2,450.50)
15. Position Service: recalculates unrealized P&L, updates available margin
16. Notification Service (async): push notification "RELIANCE BUY 100 @ ₹2,450.50"
17. Portfolio Service (async): updates holdings if delivery trade
```

---

## Data Flow 2: Market Data Streaming

```
User subscribes to RELIANCE, INFY, TCS on Kite watchlist

1. Exchange market data feed (binary multicast) → Co-located Feed Handler
   - Feed handler sits in exchange colo, receives tick-by-tick data
   - Binary protocol: instrument_token(4B) + LTP(4B) + volume(4B) + ...
2. Feed Handler: parse binary frames, normalize across NSE/BSE/MCX
3. Feed Handler → Broker Data Center: compressed stream via leased line
   - Compression: delta encoding + LZ4 (reduces 200 MB/s → ~40 MB/s)
4. Market Data Service: receives normalized ticks
   a. Updates in-memory latest quote cache (per instrument)
   b. Aggregates ticks into 1-min OHLCV candles
   c. Persists candles to time-series DB
5. Ticker (WebSocket Server): subscribes to instruments users are watching
   a. User's WebSocket connection has subscription list: [RELIANCE, INFY, TCS]
   b. Ticker batches updates in 100ms windows
   c. Serializes as binary WebSocket frames (not JSON—saves 60% bandwidth)
   d. Sends batched update to user's connection
6. Client app: deserializes binary frame, updates UI
   - Total latency: exchange tick → user's screen ≈ 2-5ms
```

---

## Data Flow 3: Order Lifecycle Sequence

```mermaid
sequenceDiagram
    actor User
    participant App as Kite App
    participant GW as API Gateway
    participant OMS as Order Management
    participant Risk as Risk Engine
    participant OGW as Order Gateway<br/>(Co-located)
    participant EX as Exchange<br/>(NSE)
    participant Pos as Position Service
    participant Bus as Event Bus

    User->>App: Place BUY order
    App->>GW: POST /orders
    GW->>OMS: validateAndRoute(order)
    OMS->>Risk: preTradeCheck(order)
    Risk-->>OMS: APPROVED (margin blocked)
    OMS->>OMS: persist(status=OPEN)
    OMS->>OGW: FIX NewOrderSingle
    OGW->>EX: FIX message (leased line)

    Note over EX: Exchange matching engine<br/>Price-time priority

    EX-->>OGW: FIX ExecutionReport (FILL)
    OGW-->>OMS: tradeConfirmation
    OMS->>OMS: persist(status=COMPLETE, trade)
    OMS->>Bus: TradeExecuted event
    Bus->>Pos: updatePosition
    Pos->>Pos: recalculate P&L + margin
    OMS-->>GW: orderResponse(COMPLETE)
    GW-->>App: Order filled
    App-->>User: "BUY 100 RELIANCE @ ₹2,450.50"
```

---

## Order Lifecycle State Diagram

```mermaid
stateDiagram-v2
    [*] --> VALIDATION_PENDING: User submits order
    VALIDATION_PENDING --> REJECTED: Risk check failed
    VALIDATION_PENDING --> OPEN: Risk check passed
    REJECTED --> [*]: Margin released

    OPEN --> PENDING: Sent to exchange
    PENDING --> EXECUTED: Full fill received
    PENDING --> PARTIALLY_FILLED: Partial fill
    PENDING --> CANCELLED: User cancels / exchange cancels
    PENDING --> REJECTED_BY_EXCHANGE: Exchange rejects

    PARTIALLY_FILLED --> EXECUTED: Remaining filled
    PARTIALLY_FILLED --> CANCELLED: User cancels remainder

    OPEN --> TRIGGER_PENDING: SL/SL-M order (waiting for trigger)
    TRIGGER_PENDING --> PENDING: Trigger price hit
    TRIGGER_PENDING --> CANCELLED: User cancels

    OPEN --> AMO_QUEUED: After-market order
    AMO_QUEUED --> VALIDATION_PENDING: Market opens (9:15 AM)
    AMO_QUEUED --> CANCELLED: User cancels before market open

    EXECUTED --> SETTLED: T+1 settlement complete
    CANCELLED --> [*]: Margin released
    REJECTED_BY_EXCHANGE --> [*]: Margin released
    SETTLED --> [*]: Funds/securities transferred
```

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Matching engine ownership** | Exchange-operated (NSE/BSE) | Broker is a routing intermediary, not a matching engine; regulatory requirement |
| **Exchange connectivity** | FIX protocol over co-located dedicated leased lines | Industry standard; sub-millisecond latency; persistent TCP sessions |
| **Market data transport** | Binary WebSocket frames (not JSON) | 60% bandwidth savings over JSON; critical at 500K concurrent connections |
| **Risk engine placement** | In-process with OMS (same process memory) | Pre-trade checks must complete in < 100μs; network hop would add 500μs+ |
| **Position tracking** | Redis (in-memory) + PostgreSQL (persistence) | Positions must update in real-time on every fill; Redis for speed, PostgreSQL for durability |
| **Order persistence** | Write-ahead to PostgreSQL before exchange submission | No order can be lost; crash recovery requires durable order log |
| **Market data aggregation** | Time-series DB for OHLCV candles | Efficient range queries for charts; columnar storage for analytics |
| **Event streaming** | Event bus for post-trade processing | Decouples position updates, notifications, settlement from order critical path |
| **Market open spike** | Pre-provisioned capacity + order queue with backpressure | 15× spike is predictable; auto-scaling is too slow; pre-provision + graceful degradation |
| **WebSocket server** | Go-based ticker (single binary, lightweight goroutines) | Go's goroutine model handles 500K+ concurrent connections with minimal memory overhead |

---

## Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Order Database** | PostgreSQL | ACID for orders, trades, settlements; multi-TB proven (Zerodha runs hundreds of billions of rows) |
| **Position Cache** | Redis Cluster | Sub-ms reads/writes for real-time position and margin state |
| **Time-Series Data** | ClickHouse / TimescaleDB | Columnar storage for OHLCV candles, tick archives; efficient time-range queries |
| **Event Streaming** | Kafka | Durable event log for order/trade events; replay capability for reconciliation |
| **Object Storage** | Cloud object storage | Contract notes (PDF), regulatory reports, bulk data exports |
| **WebSocket Server** | Go (custom ticker) | Goroutines for concurrent connections; binary frame serialization; minimal GC pressure |
| **Order Gateway** | Go / C++ | FIX protocol engine; co-located; latency-critical; deterministic performance |
| **Risk Engine** | Go (in-process) | Shared memory with OMS; no serialization overhead; lock-free data structures |
| **API Gateway** | Reverse proxy with rate limiting | Authentication, throttling, DDoS protection; separate from order path |
| **Client Apps** | Flutter (mobile), Web (SPA) | Cross-platform mobile; responsive web trading interface |
