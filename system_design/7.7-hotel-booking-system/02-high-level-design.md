# High-Level Design

## Architecture Overview

The hotel booking system follows a **search-index-first** pattern for property discovery, an **event-driven availability propagation** pattern for inventory management, and a **saga-based orchestration** pattern for booking with payment. The architecture is shaped by three realities: (1) the platform is the authoritative inventory system and must guarantee consistency; (2) availability is a multi-dimensional calendar matrix that must be queried across date ranges; (3) rates and availability must synchronize across multiple distribution channels in near real-time.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WEB[Web App]
        MOB[Mobile App]
        EXT[Property Extranet]
    end

    subgraph Gateway["API Layer"]
        GW[API Gateway]
        BFF[BFF Service]
    end

    subgraph Core["Core Services"]
        direction TB
        SRCH[Search &<br/>Discovery Service]
        AVAIL[Availability<br/>Service]
        RATE[Rate Management<br/>Service]
        BOOK[Booking<br/>Orchestrator]
        PAY[Payment<br/>Service]
        PROP[Property<br/>Service]
        REV[Review<br/>Service]
        NOTIF[Notification<br/>Service]
        CHAN[Channel Manager<br/>Service]
        GUEST[Guest<br/>Service]
    end

    subgraph Data["Data Layer"]
        PG[(PostgreSQL<br/>Reservations · Guests · Payments)]
        AVDB[(Availability Store<br/>Room-Date Matrix)]
        REDIS[(Redis Cluster<br/>Search Cache · Rate Cache · Holds)]
        ES[(Search Index<br/>Properties · Geo · Filters)]
        KAFKA[Event Bus<br/>Availability Changes · Booking Events]
        OBJ[(Object Storage<br/>Photos · Documents)]
    end

    subgraph External["External Systems"]
        PMTGW[Payment Gateway]
        CHAPI[Channel Manager<br/>APIs]
        EMAIL[Email / SMS<br/>Provider]
        MAP[Geo / Map<br/>Service]
    end

    WEB & MOB --> GW --> BFF
    EXT --> GW
    BFF --> SRCH & BOOK & GUEST & REV
    EXT --> GW --> PROP & RATE & AVAIL

    SRCH --> ES & REDIS
    SRCH --> AVAIL
    AVAIL --> AVDB & REDIS
    RATE --> AVDB & REDIS
    BOOK --> AVAIL & PAY & GUEST
    PAY --> PMTGW
    PROP --> PG & OBJ
    REV --> PG
    GUEST --> PG
    BOOK --> KAFKA
    AVAIL --> KAFKA
    KAFKA --> CHAN & NOTIF
    CHAN --> CHAPI
    NOTIF --> EMAIL
    SRCH --> MAP

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#b71c1c,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class WEB,MOB,EXT client
    class GW,BFF gateway
    class SRCH,AVAIL,RATE,BOOK,PAY,PROP,REV,NOTIF,CHAN,GUEST service
    class PMTGW,CHAPI,EMAIL,MAP external
    class PG,OBJ data
    class KAFKA queue
    class REDIS,ES,AVDB cache
```

---

## Service Responsibilities

| Service | Responsibility | Key Characteristics |
|---------|---------------|---------------------|
| **Search & Discovery** | Geo-based property search with filters (price, stars, amenities, review score), ranking, pagination | Stateless; reads from search index + availability cache |
| **Availability Service** | Manage room-date availability matrix; check availability for date ranges; atomic inventory decrement/increment | Sharded by property; strong consistency; in-memory hot data |
| **Rate Management** | Calculate applicable rate for a room type, dates, and guest profile; manage BAR, seasonal, LOS, promotional rates | Rule engine; reads rate plans from DB; caches computed rates |
| **Booking Orchestrator** | Coordinate hold → payment → confirmation saga; handle cancellations and modifications | Saga coordinator; compensating transactions; idempotent |
| **Payment Service** | Tokenized payment processing; pre-authorization, capture, refund | PCI-DSS compliant; idempotent; supports multiple gateways |
| **Property Service** | CRUD for property listings, room types, photos, amenities, policies | Standard CRUD; photo upload to object storage |
| **Review Service** | Verified stay review submission, moderation, aggregation, display | Write-behind aggregation; fraud detection |
| **Notification Service** | Email/SMS/push for booking confirmations, reminders, review requests | Event-driven; async; template-based; multi-channel |
| **Channel Manager Service** | Synchronize availability and rates to external OTA channels; receive inbound bookings | Event-driven; retry with backoff; circuit breaker per channel |
| **Guest Service** | Guest profiles, preferences, loyalty, booking history | Standard CRUD; PII encryption |

---

## Data Flow 1: Property Search

```
User searches: "Paris, Dec 20-23, 2 adults, 1 room"

1. API Gateway → BFF → Search & Discovery Service
2. Search Service builds query:
   - Geo filter: properties within Paris bounding box
   - Date range: Dec 20, 21, 22 (3 nights)
   - Guest capacity: rooms accommodating 2 adults
   - User filters: 4+ stars, pool, free cancellation, < $300/night
3. Search Index query: geo + amenities + stars + property type
   - Returns: 2,400 candidate property IDs
4. Availability Service: batch check availability for 2,400 properties
   - Check: room_type has available_count > 0 for ALL dates (Dec 20, 21, 22)
   - Result: 1,800 properties with at least one available room type
5. Rate Service: compute nightly rate for each available room type
   - Apply BAR for dates, check LOS discounts (3-night stay may qualify)
   - Calculate total: nightly_rate × 3 + taxes + fees
   - Filter: total < $900 (3 nights × $300 max)
   - Result: 1,200 properties within budget
6. Ranking: sort by relevance score
   - Score = f(price_competitiveness, review_score, conversion_history,
              quality_score, commission_tier, recency_of_availability_update)
7. Return top 25 results (page 1) with:
   - Property name, thumbnail, star rating, review score, distance
   - Best available rate, total price, cancellation policy
   - "Only 2 rooms left!" urgency indicator (if applicable)
8. Cache result set in Redis with 60s TTL for pagination
```

---

## Data Flow 2: Booking Flow (Hold → Pay → Confirm)

```
User selects: Hotel Le Marais, Deluxe Room, Dec 20-23, Non-refundable rate

1. BFF → Booking Orchestrator: "Hold this room"
2. Booking Orchestrator → Availability Service: check + hold
   a. Check: DeluxeRoom at property P-1234 available for Dec 20, 21, 22
   b. Atomic decrement: available_count -= 1 for each of the 3 dates
   c. Create hold record with 10-min TTL
   d. If any date unavailable → return SOLD_OUT, suggest alternatives
3. Booking Orchestrator → Rate Service: compute final price
   - Rate: $180/night × 3 nights = $540
   - Taxes: $540 × 12.5% = $67.50
   - Total: $607.50
4. Return to user: "Room held for 10 minutes. Total: $607.50"

--- User enters payment details ---

5. BFF → Booking Orchestrator: "Confirm booking BK-456"
6. Booking Orchestrator → Payment Service: pre-authorize $607.50
   - Payment Service → Payment Gateway: tokenized pre-auth
   - Gateway returns: auth_code "AUTH-789"
7. Booking Orchestrator → create reservation record
   - reservation_id: "RES-456", status: CONFIRMED
   - guest_id, property_id, room_type_id, check_in, check_out, rate_plan
8. Booking Orchestrator → Payment Service: capture $607.50
   - Capture against auth_code "AUTH-789"
9. Booking Orchestrator → Event Bus: publish BookingConfirmed event
10. Channel Manager Service (async): push availability update to all OTA channels
11. Notification Service (async): send confirmation email with booking details
12. Property Extranet: new booking appears in property manager's dashboard
```

---

## Data Flow 3: Booking Sequence Diagram

```mermaid
sequenceDiagram
    actor Guest
    participant BFF as BFF Service
    participant Book as Booking Orchestrator
    participant Avail as Availability Service
    participant Rate as Rate Service
    participant Pay as Payment Service
    participant Bus as Event Bus
    participant Chan as Channel Manager
    participant Notif as Notification Service

    Guest->>BFF: Select room (Deluxe, Dec 20-23)
    BFF->>Book: holdRoom(propertyId, roomType, dates)
    Book->>Avail: checkAndHold(P-1234, Deluxe, [Dec20,21,22])
    Avail-->>Book: holdConfirmed (hold_id, expires 10 min)
    Book->>Rate: computeRate(P-1234, Deluxe, [Dec20,21,22])
    Rate-->>Book: $607.50 total
    Book-->>BFF: holdConfirmed(BK-456, $607.50, expires 10 min)
    BFF-->>Guest: "Room held — complete payment"

    Note over Guest,Notif: Guest enters payment details

    Guest->>BFF: submitPayment(BK-456, cardToken)
    BFF->>Book: confirmBooking(BK-456, cardToken)
    Book->>Pay: preAuthorize($607.50, cardToken)
    Pay-->>Book: authSuccess(AUTH-789)
    Book->>Book: createReservation(CONFIRMED)
    Book->>Pay: capture($607.50, AUTH-789)
    Pay-->>Book: captureSuccess
    Book->>Bus: BookingConfirmed event
    Book-->>BFF: bookingConfirmed(RES-456)
    BFF-->>Guest: "Booking confirmed!"
    Bus->>Chan: updateAvailability(P-1234)
    Bus->>Notif: sendConfirmation(RES-456)
    Chan-->>Chan: Push to OTA channels
    Notif-->>Guest: Confirmation email
```

---

## Reservation Lifecycle State Diagram

```mermaid
stateDiagram-v2
    [*] --> HOLD: Guest selects room
    HOLD --> CONFIRMED: Payment captured
    HOLD --> HOLD_EXPIRED: 10-min TTL expires
    HOLD_EXPIRED --> [*]: Inventory restored
    CONFIRMED --> MODIFIED: Guest changes dates/room
    CONFIRMED --> CANCEL_REQUESTED: Guest requests cancel
    CONFIRMED --> NO_SHOW: Guest does not arrive
    CONFIRMED --> CHECKED_IN: Guest arrives
    MODIFIED --> CONFIRMED: Modification confirmed
    CANCEL_REQUESTED --> CANCELLED_FREE: Within free cancellation window
    CANCEL_REQUESTED --> CANCELLED_PENALTY: Outside free cancellation window
    CANCELLED_FREE --> REFUNDED: Full refund processed
    CANCELLED_PENALTY --> PARTIAL_REFUND: Penalty applied
    REFUNDED --> [*]: Inventory restored
    PARTIAL_REFUND --> [*]: Inventory restored
    CHECKED_IN --> CHECKED_OUT: Guest departs
    NO_SHOW --> [*]: Charge applied (per policy)
    CHECKED_OUT --> REVIEW_PENDING: Review request sent
    REVIEW_PENDING --> COMPLETED: Review submitted or period expires
    COMPLETED --> [*]: Reservation archived
```

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Inventory authority** | Platform-owned (not external) | Unlike flights (GDS), the platform directly manages hotel inventory; enables strong consistency without external dependency |
| **Availability storage** | Sharded relational DB + in-memory cache | Calendar matrix requires range queries and atomic multi-row updates; sharded by property for write isolation |
| **Search strategy** | Search index for discovery + availability service for filtering | Search index handles geo + text + filters; availability service handles date-range inventory checks |
| **Booking pattern** | Saga with pre-authorization | Hold inventory → pre-authorize payment → confirm → capture; rollback if any step fails |
| **Hold mechanism** | Soft hold with TTL (10 min) | Platform-managed hold; auto-release prevents inventory lockup from abandoned bookings |
| **Channel sync** | Event-driven push (not polling) | BookingConfirmed events trigger immediate availability pushes to all channels |
| **Rate computation** | On-demand with caching | Rates depend on date, LOS, guest profile; computed per request but cached for search results |
| **Overbooking** | Configurable per property | Property managers set overbooking tolerance (e.g., 5%); availability service accounts for this |
| **Payment model** | Pre-authorize → capture (not direct charge) | Pre-auth at booking; capture at check-in or booking time (per property policy); enables easy refunds |
| **Event streaming** | Event bus for booking lifecycle events | Decouples channel sync, notifications, analytics from booking critical path |

---

## Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Primary Database** | PostgreSQL | ACID for reservations, guest records, payments; strong consistency required |
| **Availability Store** | PostgreSQL (sharded) + Redis cache | Availability matrix needs range queries; hot data cached in Redis for sub-ms reads |
| **Search Index** | Inverted index with geo support | Geo-search (bounding box, distance), full-text (property name, amenities), faceted filtering |
| **Cache Layer** | Redis Cluster | Search results cache, rate cache, hold management with TTL, session data |
| **Event Streaming** | Kafka | Durable event log for booking events, availability changes, channel sync triggers |
| **Object Storage** | Cloud object storage | Property photos (420 TB), documents, invoices |
| **API Gateway** | Rate limiting, auth, routing | Protect booking path, route to BFF, enforce rate limits per client |
| **CDN** | Edge caching | Property photos, static assets, cached search results for popular destinations |
