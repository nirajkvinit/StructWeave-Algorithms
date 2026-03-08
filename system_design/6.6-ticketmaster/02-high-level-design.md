# High-Level Design

## 1. System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WEB["Web App<br/>(React SPA)"]
        MOB["Mobile App<br/>(iOS/Android)"]
        API_EXT["Partner APIs<br/>(Resellers)"]
    end

    subgraph Edge["Edge Layer"]
        CDN["CDN / Edge Network<br/>(Fastly)"]
        WAF["WAF + Bot Shield<br/>(DDoS Protection)"]
        EDGE_WR["Edge Queue Connector<br/>(Token Validation)"]
    end

    subgraph Gateway["API Gateway Layer"]
        APIGW["API Gateway<br/>(Rate Limiting, Auth, Routing)"]
        WS_GW["WebSocket Gateway<br/>(Queue Updates, Seat Map Push)"]
    end

    subgraph Core["Core Services"]
        EVT["Event Service"]
        SEARCH["Search Service"]
        VENUE["Venue Service"]
        SEAT["Seat Map Service"]
        INV["Inventory Service<br/>(C++ Core)"]
        BOOK["Booking Service"]
        PAY["Payment Service"]
        TICKET["Ticket Service"]
        USER["User Service"]
        QUEUE["Queue Service<br/>(Virtual Waiting Room)"]
        PRICE["Pricing Service"]
        NOTIFY["Notification Service"]
        BOT["Bot Detection Service"]
    end

    subgraph DataStores["Data Layer"]
        PG["Relational DB<br/>(Events, Orders, Users)"]
        REDIS["Redis Cluster<br/>(Seat Holds, Sessions, Counters)"]
        NOSQL["NoSQL Store<br/>(Queue State, Activity Logs)"]
        SEARCH_IDX["Search Index<br/>(Elasticsearch)"]
        BLOB["Object Storage<br/>(Venue Maps, Media)"]
        TS_DB["Time-Series DB<br/>(Metrics, Analytics)"]
    end

    subgraph Async["Async Processing"]
        MQ["Message Queue<br/>(Kafka)"]
        HOLD_EXP["Hold Expiry Worker"]
        TICKET_GEN["Ticket Generation Worker"]
        ANALYTICS["Analytics Pipeline"]
    end

    subgraph External["External Services"]
        PAY_GW["Payment Gateways<br/>(Stripe, PayPal)"]
        EMAIL["Email / SMS Provider"]
        PUSH["Push Notification Service"]
    end

    WEB & MOB & API_EXT --> CDN
    CDN --> WAF --> EDGE_WR
    EDGE_WR --> APIGW
    EDGE_WR --> WS_GW

    APIGW --> EVT & SEARCH & VENUE & SEAT & BOOK & USER & QUEUE & PRICE
    WS_GW --> QUEUE & SEAT

    QUEUE --> BOT
    QUEUE --> NOSQL
    QUEUE --> REDIS

    EVT --> PG
    SEARCH --> SEARCH_IDX
    VENUE --> PG & BLOB
    SEAT --> INV
    INV --> REDIS
    BOOK --> INV & PAY & REDIS
    PAY --> PAY_GW
    TICKET --> PG & BLOB
    USER --> PG
    PRICE --> PG & REDIS
    NOTIFY --> EMAIL & PUSH

    BOOK --> MQ
    MQ --> HOLD_EXP & TICKET_GEN & ANALYTICS & NOTIFY
    ANALYTICS --> TS_DB

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef async fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#c62828,stroke-width:2px

    class WEB,MOB,API_EXT client
    class CDN,WAF,EDGE_WR edge
    class APIGW,WS_GW gateway
    class EVT,SEARCH,VENUE,SEAT,INV,BOOK,PAY,TICKET,USER,QUEUE,PRICE,NOTIFY,BOT service
    class PG,REDIS,NOSQL,SEARCH_IDX,BLOB,TS_DB data
    class MQ,HOLD_EXP,TICKET_GEN,ANALYTICS async
    class PAY_GW,EMAIL,PUSH external
```

---

## 2. Data Flow: High-Demand On-Sale

### Phase 1: Pre-Sale Queue Formation

```mermaid
sequenceDiagram
    participant Fan as Fan (Browser)
    participant CDN as CDN Edge
    participant QC as Queue Connector<br/>(Edge Worker)
    participant QS as Queue Service
    participant BOT as Bot Detection
    participant DB as DynamoDB<br/>(Queue State)
    participant WS as WebSocket Gateway

    Note over Fan,WS: Waiting Room Opens (15-30 min before on-sale)

    Fan->>CDN: GET /event/{id}/queue
    CDN->>QC: Route to queue connector
    QC->>QS: Register user in queue
    QS->>BOT: Risk assessment (device fingerprint, behavior)
    BOT-->>QS: Risk score + verdict
    alt Bot detected
        QS-->>Fan: 403 Blocked
    else Legitimate fan
        QS->>DB: Store {userId, timestamp, position, status: WAITING}
        QS-->>Fan: Queue ticket (JWT) + WebSocket URL
    end

    Fan->>WS: Connect WebSocket (queue ticket)

    Note over Fan,WS: On-Sale Time Arrives

    loop Leaky Bucket Drain
        QS->>DB: Fetch next N users (by position)
        QS->>QS: Check protected zone capacity
        QS-->>WS: Push "YOUR_TURN" to selected users
        WS-->>Fan: Access token + redirect to booking
    end
```

### Phase 2: Seat Selection & Booking

```mermaid
sequenceDiagram
    participant Fan as Fan (Browser)
    participant GW as API Gateway
    participant SM as Seat Map Service
    participant INV as Inventory Service (C++)
    participant REDIS as Redis Cluster
    participant BOOK as Booking Service
    participant PAY as Payment Service
    participant PG as PostgreSQL
    participant MQ as Message Queue
    participant TKT as Ticket Service

    Fan->>GW: GET /events/{id}/seats (access token)
    GW->>SM: Load seat map
    SM->>INV: Get current availability
    INV->>REDIS: Scan seat states (AVAILABLE/HELD/SOLD)
    REDIS-->>INV: Seat availability bitmap
    INV-->>SM: Available seats with pricing
    SM-->>Fan: Interactive seat map (SVG + data)

    Fan->>GW: POST /holds {seatIds, eventId}
    GW->>INV: Attempt seat hold
    INV->>REDIS: SETNX seat:{eventId}:{seatId} = userId (TTL 600s)
    alt Seat available
        REDIS-->>INV: OK (hold acquired)
        INV->>MQ: Emit SEAT_HELD event
        INV-->>Fan: 200 Hold confirmed (10 min timer)
    else Seat already held/sold
        REDIS-->>INV: FAIL
        INV-->>Fan: 409 Conflict (seat unavailable)
    end

    Note over Fan,TKT: User proceeds to checkout within 10 min

    Fan->>GW: POST /orders {holdId, paymentMethod}
    GW->>BOOK: Create order
    BOOK->>INV: Verify holds still valid
    INV->>REDIS: Check holds exist
    REDIS-->>INV: Valid
    BOOK->>PAY: Process payment
    PAY-->>BOOK: Payment confirmed (idempotency key)
    BOOK->>PG: INSERT order (CONFIRMED)
    BOOK->>INV: Convert holds to SOLD
    INV->>REDIS: SET seat:{eventId}:{seatId} = SOLD (no TTL)
    BOOK->>MQ: Emit ORDER_CONFIRMED event
    MQ->>TKT: Generate digital ticket
    TKT-->>Fan: Ticket delivered (rotating barcode)
```

### Phase 3: Hold Expiry (Unhappy Path)

```mermaid
sequenceDiagram
    participant REDIS as Redis Cluster
    participant WORKER as Hold Expiry Worker
    participant INV as Inventory Service
    participant MQ as Message Queue
    participant SM as Seat Map Service
    participant WS as WebSocket Gateway

    Note over REDIS,WS: User's 10-min hold expires

    REDIS->>REDIS: TTL expires, key auto-deleted
    REDIS->>WORKER: Keyspace notification (key expired)
    WORKER->>INV: Release seat hold
    INV->>MQ: Emit SEAT_RELEASED event
    MQ->>SM: Update seat availability
    SM->>WS: Push availability update to active users
    WS-->>WS: Broadcast to users viewing this event
```

---

## 3. Key Architectural Decisions

### Decision 1: Microservices vs. Monolith

| Aspect | Decision | Justification |
|--------|----------|---------------|
| **Architecture** | **Microservices** with a **monolithic Inventory Core** | The Inventory Core (C++ with assembly) is the hot path -- it must be low-latency and co-located with Redis. Other services (Event, Search, User) scale independently. |
| **Why not full microservices?** | Inventory operations require sub-millisecond coordination | Decomposing seat holds across services adds network hops and distributed transaction complexity |
| **Why not monolith?** | Search, events, notifications have different scaling profiles | On-sale traffic hits Inventory 1000x harder than Event Management |

### Decision 2: Synchronous vs. Asynchronous Communication

| Flow | Pattern | Justification |
|------|---------|---------------|
| Seat hold (SETNX) | **Synchronous** | User needs immediate confirmation; <50ms target |
| Payment processing | **Synchronous** (with timeout) | Must confirm payment before converting hold to sold |
| Ticket generation | **Asynchronous** (via queue) | Can tolerate seconds of delay after payment |
| Seat map updates | **Async push** (WebSocket) | Real-time but eventual; brief staleness acceptable |
| Analytics/logging | **Asynchronous** (fire-and-forget) | Not on critical path |
| Queue position updates | **Async push** (WebSocket) | Periodic updates, not per-change |

### Decision 3: Database Choices

| Data | Store | Justification |
|------|-------|---------------|
| Seat holds (ephemeral) | **Redis Cluster** | Sub-ms SETNX, native TTL, 100K+ ops/sec per shard |
| Queue state | **NoSQL (DynamoDB-style)** | High write throughput, auto-scaling, single-table design |
| Events, orders, users | **Relational DB (PostgreSQL)** | ACID transactions, complex queries, referential integrity |
| Event search | **Search Index (Elasticsearch)** | Full-text search, faceting, geo-queries |
| Venue maps, media | **Object Storage** | Large binary assets, CDN-friendly |
| Metrics, analytics | **Time-Series DB** | Efficient time-range queries, downsampling |

### Decision 4: Caching Strategy

| Layer | What | TTL | Invalidation |
|-------|------|-----|-------------|
| **CDN Edge** | Static venue maps, event pages, JS/CSS | 5-60 min | Surrogate keys + instant purge |
| **Edge Worker Cache** | Queue token validation | 30s | Short TTL, rebuild on miss |
| **Redis L1** | Active seat maps (bitmap), hold state | Real-time | Write-through on state change |
| **Application Cache** | Event metadata, pricing tiers | 5 min | TTL + event-driven invalidation |
| **Search Cache** | Popular search results | 1 min | Short TTL for freshness |

### Decision 5: Queue Model -- Push vs. Pull

| Aspect | Decision | Justification |
|--------|----------|---------------|
| Queue position | **Server-push via WebSocket** | Reduces polling load; 14M users polling every second = catastrophic |
| Seat availability | **Server-push via WebSocket** | Real-time updates prevent users from selecting unavailable seats |
| Queue entry | **Client-initiated (pull)** | User must actively join; prevents auto-enrollment attacks |

---

## 4. Architecture Pattern Checklist

| Pattern | Decision | Notes |
|---------|----------|-------|
| Sync vs Async | **Hybrid** | Sync for holds/payments; async for notifications/analytics |
| Event-driven vs Request-response | **Both** | Request-response for booking; event-driven for state propagation |
| Push vs Pull | **Push** (WebSocket) | Queue updates, seat availability pushed to clients |
| Stateless vs Stateful | **Stateless services** + **stateful Redis/DB** | Services scale horizontally; state lives in Redis/DB |
| Read-heavy vs Write-heavy optimization | **Write-heavy** for on-sales | Redis as write buffer; reads served from CDN/cache |
| Real-time vs Batch | **Real-time** for booking | Batch for analytics, reporting, settlement |
| Edge vs Origin | **Edge** for queue validation + static content | Origin for booking/payment (requires strong consistency) |

---

## 5. Component Responsibilities

| Service | Responsibility | Scale Profile |
|---------|---------------|---------------|
| **Queue Service** | Virtual waiting room, position tracking, admission control | Spiky: 0 to millions in seconds |
| **Bot Detection** | Device fingerprinting, behavioral analysis, risk scoring | Inline with queue joins |
| **Inventory Service** | Seat state machine (Available -> Held -> Sold), atomic holds | Extreme contention |
| **Seat Map Service** | Venue layout, pricing overlay, availability visualization | Read-heavy during on-sale |
| **Booking Service** | Order lifecycle, payment orchestration, confirmation | Write-heavy during on-sale |
| **Payment Service** | Payment gateway abstraction, idempotency, retry | External dependency bottleneck |
| **Event Service** | Event CRUD, venue assignment, sale window configuration | Low frequency, admin-facing |
| **Pricing Service** | Dynamic pricing, tier management, platinum seats | Pre-computed, read during checkout |
| **Search Service** | Full-text search, filtering, geo-queries | Steady, cache-friendly |
| **Ticket Service** | Digital ticket generation, rotating barcodes, delivery | Async post-purchase |
| **Notification Service** | Email, SMS, push for confirmations and queue updates | Async, high volume during on-sales |
