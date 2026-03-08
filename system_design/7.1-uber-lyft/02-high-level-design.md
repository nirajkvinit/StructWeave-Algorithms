# High-Level Design

## System Architecture

```mermaid
---
config:
  theme: neutral
  look: neo
---
flowchart TB
    subgraph Clients["Client Layer"]
        RA[Rider App]
        DA[Driver App]
    end

    subgraph Gateway["API Gateway Layer"]
        AG[API Gateway]
        WS[WebSocket Gateway]
    end

    subgraph Core["Core Services"]
        DS[Dispatch Service]
        SS[Supply Service]
        ME[Matching Engine]
        PS[Pricing Service]
        TS[Trip Service]
        PAY[Payment Service]
        NS[Notification Service]
        LIS[Location Ingestion Service]
        ETA_S[ETA Service]
    end

    subgraph DataLayer["Data Layer"]
        GEO[(Geospatial Store)]
        RDB[(Relational DB)]
        CACHE[(Cache Layer)]
        MQ[Message Queue]
    end

    subgraph Analytics["Analytics Layer"]
        STREAM[Stream Processor]
        DW[(Data Warehouse)]
    end

    RA -->|REST/gRPC| AG
    DA -->|REST/gRPC| AG
    RA <-->|Real-time updates| WS
    DA <-->|Real-time location + offers| WS

    AG --> DS
    AG --> PS
    AG --> TS
    AG --> PAY

    DA -.->|Location stream| LIS
    LIS -->|Batch writes| MQ
    MQ -->|Consume + index| SS
    SS -->|Update positions| GEO

    DS -->|Find drivers| ME
    ME -->|Query nearby| GEO
    ME -->|Compute ETA| ETA_S
    DS -->|Create/update trip| TS
    DS -->|Send offer| NS
    DS -->|Get surge multiplier| PS

    TS -->|Persist trip state| RDB
    TS -->|Cache hot trips| CACHE
    PAY -->|Process payment| RDB

    PS -->|Read supply/demand| STREAM
    STREAM -->|Aggregate events| MQ
    MQ -->|Archive| DW

    NS -->|Push to driver/rider| WS

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef analytics fill:#fce4ec,stroke:#c62828,stroke-width:2px

    class RA,DA client
    class AG,WS gateway
    class DS,SS,ME,PS,TS,PAY,NS,LIS,ETA_S service
    class RDB,GEO data
    class CACHE cache
    class MQ queue
    class STREAM,DW analytics
```

---

## Service Responsibilities

| Service | Responsibility | Stateful? | Scale Strategy |
|---------|---------------|-----------|----------------|
| **Location Ingestion Service** | Receives raw GPS data from driver apps, validates, batches, publishes to message queue | Stateless | Horizontal; partition by driver_id |
| **Supply Service** | Consumes location events, updates the geospatial index, tracks driver availability | Stateful (geo index) | Per-city sharding |
| **Matching Engine** | Given a rider location, queries nearby available drivers, ranks by ETA, returns candidates | Stateless | Horizontal; reads from geo index |
| **Dispatch Service** | Orchestrates the trip request flow: pricing -> matching -> offer -> accept/decline -> re-dispatch | Stateless | Horizontal |
| **Trip Service** | Manages the trip state machine (REQUESTED -> COMPLETED), persists trip records | Stateful (trip state) | Shard by trip_id |
| **Pricing Service** | Computes upfront fare estimates, surge multipliers, and final fares | Stateless | Horizontal; cached surge multipliers |
| **ETA Service** | Computes estimated time of arrival using routing engine and real-time traffic data | Stateless | Horizontal; read-heavy |
| **Payment Service** | Processes charges, refunds, driver payouts; integrates with payment processors | Stateful (ledger) | Shard by user_id |
| **Notification Service** | Delivers push notifications, SMS, and WebSocket messages to riders and drivers | Stateless | Horizontal |
| **WebSocket Gateway** | Maintains persistent connections with mobile clients for real-time updates | Stateful (connections) | Per-connection affinity |

---

## Data Flow: Ride Request to Trip Completion

### Step-by-Step Flow

```mermaid
---
config:
  theme: neutral
  look: neo
---
sequenceDiagram
    participant R as Rider App
    participant AG as API Gateway
    participant PS as Pricing Service
    participant DS as Dispatch Service
    participant ME as Matching Engine
    participant GEO as Geo Index
    participant ETA as ETA Service
    participant NS as Notification
    participant D as Driver App
    participant TS as Trip Service
    participant PAY as Payment

    R->>AG: POST /trips/request (pickup, dropoff, vehicle_type)
    AG->>PS: Get fare estimate (pickup, dropoff, vehicle_type)
    PS-->>AG: {fare: $18.50, surge: 1.2x}
    AG-->>R: Fare estimate displayed

    R->>AG: POST /trips/confirm
    AG->>DS: Create trip request
    DS->>TS: Create trip (status: REQUESTED)
    DS->>ME: Find best driver (pickup_location, vehicle_type)
    ME->>GEO: Query nearby AVAILABLE drivers (radius: 5km)
    GEO-->>ME: [driver_1, driver_2, driver_3, ...] with distances
    ME->>ETA: Compute ETA for top-K candidates
    ETA-->>ME: [driver_1: 3min, driver_3: 4min, driver_2: 5min]
    ME-->>DS: Best match: driver_1 (ETA: 3min)

    DS->>TS: Update trip (status: DISPATCHED, driver: driver_1)
    DS->>NS: Send trip offer to driver_1
    NS->>D: Push: "New trip request - 3 min away, $18.50"

    alt Driver accepts
        D->>AG: POST /trips/{id}/accept
        AG->>TS: Update trip (status: ACCEPTED)
        TS->>NS: Notify rider: driver accepted
        NS->>R: Push: "Driver John is on the way (3 min)"
    else Driver declines or timeout (15s)
        D->>AG: POST /trips/{id}/decline (or timeout)
        AG->>DS: Re-dispatch
        DS->>ME: Find next best driver
        Note over DS,ME: Up to 3 attempts
    end

    Note over D,R: Driver drives to pickup
    D->>AG: POST /trips/{id}/arrived
    AG->>TS: Update trip (status: DRIVER_ARRIVED)

    D->>AG: POST /trips/{id}/start
    AG->>TS: Update trip (status: IN_PROGRESS)

    Note over D,R: Trip in progress (location tracking active)

    D->>AG: POST /trips/{id}/complete
    AG->>TS: Update trip (status: COMPLETED)
    TS->>PS: Calculate final fare (actual_distance, actual_duration)
    PS-->>TS: Final fare: $19.20
    TS->>PAY: Charge rider $19.20
    PAY-->>TS: Payment successful
    TS->>NS: Notify rider + driver: trip complete
    NS->>R: Receipt + rating prompt
    NS->>D: Earnings update
```

---

## Key Architectural Decisions

### 1. Separate Location Ingestion from Matching

**Decision**: Location data flows through a dedicated ingestion pipeline (message queue -> supply service -> geospatial index) rather than hitting the matching engine directly.

**Rationale**: Location updates (875K/s) vastly outnumber match requests (~1K/s). Coupling them would force the matching engine to handle 875x its actual workload. The ingestion pipeline can batch, deduplicate, and filter stale updates before writing to the geospatial index.

### 2. In-Memory Geospatial Index (Not Relational Database)

**Decision**: Driver locations are stored in an in-memory geospatial data structure, not in a relational database.

**Rationale**: A relational database cannot sustain 875K writes/second with sub-100ms query latency for geospatial nearest-neighbor searches. An in-memory store with geospatial indexing (geohash or H3 hexagonal grid) provides O(1) updates and O(log n) nearest-neighbor queries within the required latency bounds.

### 3. H3 Hexagonal Grid over Geohash for Spatial Partitioning

**Decision**: Use Uber's H3 hexagonal grid system rather than geohash for spatial indexing and zone definitions.

**Rationale**: Geohash cells are rectangular and vary in size at different latitudes, creating boundary artifacts. H3 hexagons have uniform area, equidistant neighbors, and a hierarchical resolution system (16 levels). This makes proximity queries consistent regardless of location and eliminates edge effects at cell boundaries.

### 4. Two-Phase Matching: Geo Filter + ETA Ranking

**Decision**: Matching is split into a fast geo-filter phase (find nearby drivers) and an expensive ETA-ranking phase (compute actual drive time for top candidates).

**Rationale**: Computing ETA for every available driver in a city would be prohibitively expensive (requires routing engine calls). The geo filter narrows from thousands of drivers to 5-10 candidates in microseconds; ETA computation then ranks those candidates in ~200ms. This two-phase design keeps matching under 1 second.

### 5. Persistent Trip State Machine

**Decision**: Every trip state transition is persisted to a durable datastore before acknowledgment, and the state machine enforces valid transitions.

**Rationale**: Trips involve money, safety, and legal liability. A lost trip state means a driver worked without getting paid, or a rider was charged without completing a trip. The state machine must survive any single component failure, including the complete loss of the dispatch service.

### 6. Event-Driven Architecture with Message Queue Backbone

**Decision**: All inter-service communication for non-latency-critical paths flows through a message queue (location updates, notifications, analytics, surge computation).

**Rationale**: Decouples the high-throughput location pipeline from the trip orchestration path. Allows independent scaling of consumers. Provides natural buffering during traffic spikes and enables replay for analytics.

### 7. City-Based Data Partitioning

**Decision**: All operational data (trips, driver locations, surge zones) is partitioned by city/region.

**Rationale**: A trip in Mumbai never interacts with driver data in New York. City-based partitioning provides natural data locality, enables regional deployments for latency, and simplifies scaling (add capacity per city as it grows).

---

## Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---------|----------|---------------|
| Sync vs Async | Sync for ride request flow; async for location ingestion, notifications, analytics | Matching must be real-time; everything else can be async |
| Event-driven vs Request-response | Event-driven for location pipeline and pricing; request-response for trip operations | Location is fire-and-forget; trip operations need acknowledgment |
| Push vs Pull | Push for driver location to server; push from server to riders via WebSocket | Both sides need real-time updates |
| Stateless vs Stateful | Matching/dispatch stateless; supply service/trip service stateful | Stateless services scale horizontally; state is in the data layer |
| Write-heavy vs Read-heavy | Write-heavy for location ingestion; read-heavy for rider-facing APIs | Different optimization strategies for each path |
| Real-time vs Batch | Real-time for matching, tracking, surge; batch for analytics, reporting | Operational systems are real-time; business intelligence is batch |
| Edge vs Origin | Edge for WebSocket termination (closest PoP); origin for matching and trip state | Minimize connection latency; centralize business logic per region |
