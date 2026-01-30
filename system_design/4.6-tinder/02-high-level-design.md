# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        direction LR
        iOS["iOS App"]
        Android["Android App"]
        Web["Web App"]
    end

    subgraph EdgeLayer["Edge Layer"]
        CDN["Multi-CDN<br/>(Photos, Static Assets)"]
        GeoDNS["GeoDNS<br/>(Region Routing)"]
    end

    subgraph GatewayLayer["API Gateway Layer"]
        GLB["Global Load Balancer"]
        TAG["Tinder Application Gateway<br/>(TAG)"]
        Auth["Auth Service<br/>(OAuth2/JWT)"]
        RateLimiter["Rate Limiter<br/>(Token Bucket)"]
    end

    subgraph ServiceMesh["Service Mesh (Envoy Sidecar)"]
        direction TB

        subgraph CoreServices["Core Services"]
            ProfileSvc["Profile Service"]
            DiscoverySvc["Discovery Service"]
            SwipeSvc["Swipe Service"]
            MatchSvc["Match Service"]
            ChatSvc["Chat Service"]
            NotifSvc["Notification Service"]
        end

        subgraph SupportServices["Support Services"]
            MediaSvc["Media Service<br/>(Photo Upload)"]
            LocationSvc["Location Service"]
            PreferenceSvc["Preference Service"]
            BlockSvc["Block/Report Service"]
            SubscriptionSvc["Subscription Service"]
        end
    end

    subgraph MLPlatform["ML Platform"]
        RecommendationEngine["Recommendation Engine<br/>(TinVec)"]
        RankingModel["Ranking Model"]
        EmbeddingStore["Embedding Store"]
        FeatureStore["Feature Store"]
    end

    subgraph GeoshardInfra["Geoshard Infrastructure"]
        GeoshardRouter["Geoshard Router<br/>(S2 Geometry)"]
        CellManager["Cell Manager"]
    end

    subgraph EventStreaming["Event Streaming"]
        KafkaSwipes["Kafka<br/>(Swipe Events)"]
        KafkaMatches["Kafka<br/>(Match Events)"]
        KafkaNotif["Kafka<br/>(Notifications)"]
        MatchWorkers["Match Detection<br/>Workers"]
    end

    subgraph DataLayer["Data Layer"]
        MongoDB[("MongoDB Cluster<br/>(Profiles, Swipes, Matches)")]
        ES[("Elasticsearch<br/>(Geosharded Index)")]
        Redis[("Redis Cluster<br/>(Cache, State)")]
        BlobStore[("Blob Storage<br/>(Photos)")]
    end

    subgraph NotifDelivery["Notification Delivery"]
        WebSocket["WebSocket Gateway<br/>(Scarlet)"]
        APNS["APNS"]
        FCM["FCM"]
    end

    %% Client to Edge
    iOS --> GeoDNS
    Android --> GeoDNS
    Web --> GeoDNS
    iOS --> CDN
    Android --> CDN
    Web --> CDN

    %% Edge to Gateway
    GeoDNS --> GLB
    CDN --> BlobStore
    GLB --> TAG
    TAG --> Auth
    TAG --> RateLimiter

    %% Gateway to Services
    RateLimiter --> ProfileSvc
    RateLimiter --> DiscoverySvc
    RateLimiter --> SwipeSvc
    RateLimiter --> MatchSvc
    RateLimiter --> ChatSvc
    RateLimiter --> MediaSvc
    RateLimiter --> SubscriptionSvc

    %% Discovery Flow
    DiscoverySvc --> GeoshardRouter
    GeoshardRouter --> CellManager
    CellManager --> ES
    DiscoverySvc --> RecommendationEngine
    RecommendationEngine --> RankingModel
    RankingModel --> EmbeddingStore
    RecommendationEngine --> FeatureStore

    %% Swipe Flow
    SwipeSvc --> KafkaSwipes
    KafkaSwipes --> MatchWorkers
    MatchWorkers --> Redis
    MatchWorkers --> MatchSvc
    MatchSvc --> KafkaMatches
    MatchSvc --> MongoDB

    %% Notification Flow
    KafkaMatches --> NotifSvc
    NotifSvc --> KafkaNotif
    KafkaNotif --> WebSocket
    KafkaNotif --> APNS
    KafkaNotif --> FCM

    %% Chat Flow
    ChatSvc --> WebSocket
    ChatSvc --> MongoDB
    ChatSvc --> Redis

    %% Profile Flow
    ProfileSvc --> MongoDB
    MediaSvc --> BlobStore
    LocationSvc --> GeoshardRouter
    PreferenceSvc --> MongoDB

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ml fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef geo fill:#fff8e1,stroke:#ff8f00,stroke-width:2px
    classDef streaming fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef notif fill:#e0f2f1,stroke:#00796b,stroke-width:2px

    class iOS,Android,Web client
    class CDN,GeoDNS edge
    class GLB,TAG,Auth,RateLimiter gateway
    class ProfileSvc,DiscoverySvc,SwipeSvc,MatchSvc,ChatSvc,NotifSvc,MediaSvc,LocationSvc,PreferenceSvc,BlockSvc,SubscriptionSvc service
    class RecommendationEngine,RankingModel,EmbeddingStore,FeatureStore ml
    class GeoshardRouter,CellManager geo
    class KafkaSwipes,KafkaMatches,KafkaNotif,MatchWorkers streaming
    class MongoDB,ES,Redis,BlobStore data
    class WebSocket,APNS,FCM notif
```

---

## Data Flow Diagrams

### 1. Profile Discovery Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client as Mobile Client
    participant TAG as API Gateway (TAG)
    participant Discovery as Discovery Service
    participant Geoshard as Geoshard Router
    participant ES as Elasticsearch
    participant ML as Recommendation Engine
    participant Redis as Redis Cache
    participant MongoDB as MongoDB

    Client->>TAG: GET /recommendations
    TAG->>TAG: Authenticate (JWT)
    TAG->>Discovery: Forward request

    Discovery->>Redis: Check cached recommendations
    alt Cache hit
        Redis-->>Discovery: Return cached profiles
        Discovery-->>Client: Return recommendations
    else Cache miss
        Discovery->>MongoDB: Get user preferences
        MongoDB-->>Discovery: Age, distance, gender prefs

        Discovery->>Geoshard: Get S2 cells for radius
        Geoshard-->>Discovery: Cell IDs to query

        Discovery->>ES: Query geosharded index
        Note over ES: Filter by distance, age, gender<br/>Exclude: swiped, blocked
        ES-->>Discovery: ~5000 candidate profiles

        Discovery->>ML: Rank candidates
        ML->>ML: TinVec similarity scoring
        ML->>ML: Apply ranking factors
        ML-->>Discovery: Scored & sorted profiles

        Discovery->>Discovery: Apply diversity rules
        Discovery->>Redis: Cache recommendations (5 min TTL)
        Discovery-->>Client: Return top 50 profiles
    end
```

### 2. Swipe & Match Detection Flow

```mermaid
sequenceDiagram
    autonumber
    participant UserA as User A (Client)
    participant TAG as API Gateway
    participant Swipe as Swipe Service
    participant Kafka as Kafka
    participant Worker as Match Worker
    participant Redis as Redis
    participant Match as Match Service
    participant MongoDB as MongoDB
    participant Notif as Notification Service
    participant UserB as User B (Client)

    UserA->>TAG: POST /swipe {target: B, action: LIKE}
    TAG->>Swipe: Forward swipe
    Swipe->>Kafka: Publish swipe event
    Swipe-->>UserA: 200 OK (async processing)

    Kafka->>Worker: Consume swipe event

    Worker->>Redis: GET swipes:B:A
    Note over Redis: Check if B already swiped right on A

    alt B has NOT swiped on A
        Worker->>Redis: SET swipes:A:B = LIKE (TTL: 90d)
        Worker->>MongoDB: Insert swipe record
        Note over Worker: No match yet, done
    else B already swiped RIGHT on A
        Worker->>Worker: MATCH DETECTED!
        Worker->>MongoDB: Create match record
        Worker->>MongoDB: Create conversation
        Worker->>Redis: Invalidate swipe keys
        Worker->>Match: Notify match created

        Match->>Kafka: Publish MATCH event
        Match->>Notif: Trigger notifications

        par Notify User A
            Notif->>UserA: WebSocket: "It's a Match!"
        and Notify User B
            Notif->>UserB: Push notification: "New Match!"
        end
    end
```

### 3. Real-Time Chat Flow

```mermaid
sequenceDiagram
    autonumber
    participant UserA as User A
    participant WSA as WebSocket (A)
    participant Chat as Chat Service
    participant Kafka as Kafka
    participant MongoDB as MongoDB
    participant Redis as Redis
    participant WSB as WebSocket (B)
    participant UserB as User B
    participant FCM as FCM/APNS

    UserA->>WSA: Connect WebSocket
    WSA->>Chat: Register connection
    Chat->>Redis: Store connection: user_a -> ws_node_1

    UserA->>WSA: Send message to B
    WSA->>Chat: {conv_id, to: B, text: "Hey!"}

    Chat->>MongoDB: Persist message
    Chat->>Kafka: Publish message event

    Chat->>Redis: GET connection:B

    alt User B is online
        Redis-->>Chat: ws_node_2
        Chat->>WSB: Forward message
        WSB->>UserB: Display message
        UserB->>WSB: ACK received
        WSB->>Chat: Mark delivered
    else User B is offline
        Redis-->>Chat: null (no connection)
        Chat->>FCM: Send push notification
        FCM->>UserB: Push: "New message from A"
    end

    Chat->>MongoDB: Update delivery status
    Chat->>WSA: Delivery confirmation
    WSA->>UserA: Show delivered indicator
```

### 4. Photo Upload Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client as Mobile Client
    participant TAG as API Gateway
    participant Media as Media Service
    participant Validator as Image Validator
    participant Processor as Image Processor
    participant Blob as Blob Storage
    participant CDN as CDN
    participant MongoDB as MongoDB

    Client->>TAG: POST /photos/upload-url
    TAG->>Media: Request presigned URL
    Media->>Blob: Generate presigned upload URL
    Blob-->>Media: Presigned URL (15 min TTL)
    Media-->>Client: Return upload URL

    Client->>Blob: PUT image directly
    Blob-->>Client: 200 OK

    Client->>TAG: POST /photos/process {blob_key}
    TAG->>Media: Process uploaded photo

    Media->>Blob: Download original
    Media->>Validator: Validate image
    Note over Validator: Check format, size, content policy

    alt Validation passes
        Media->>Processor: Generate variants
        Processor->>Processor: Create thumbnails (3 sizes)
        Processor->>Processor: Apply compression
        Processor->>Processor: Strip metadata (EXIF)

        par Upload all variants
            Processor->>Blob: Upload original (optimized)
            Processor->>Blob: Upload large thumbnail
            Processor->>Blob: Upload medium thumbnail
            Processor->>Blob: Upload small thumbnail
        end

        Media->>MongoDB: Save photo metadata
        Media->>CDN: Warm cache for photo URLs
        Media-->>Client: Return photo URLs
    else Validation fails
        Media->>Blob: Delete uploaded file
        Media-->>Client: 400 Bad Request
    end
```

---

## Key Architectural Decisions

### 1. Microservices vs Monolith

| Decision | Choice | Justification |
|----------|--------|---------------|
| Architecture | **500+ Microservices** | Independent scaling, team autonomy, fault isolation |

**Trade-offs:**
- (+) Services scale independently (swipe service scales separately from chat)
- (+) Different teams own different services
- (+) Technology diversity possible per service
- (-) Operational complexity (service mesh required)
- (-) Distributed tracing essential for debugging
- (-) Network latency between services

### 2. S2 Geosharding vs Traditional Geohashing

| Approach | Pros | Cons |
|----------|------|------|
| **Geohashing** | Simple, well-understood | Uneven cells near poles, boundary issues |
| **S2 Geometry** ✓ | Uniform cells, Hilbert curves, no polar distortion | More complex math |

**Why S2:**
- Hilbert curves preserve spatial locality (nearby points → nearby cells)
- Uniform cell distribution globally (no polar distortion)
- 20x performance improvement in query throughput
- Natural load balancing across cells

### 3. Database Selection

| Data Type | Choice | Justification |
|-----------|--------|---------------|
| Profiles | **MongoDB** | Flexible schema, document model for profiles |
| Swipes | **MongoDB** | High write throughput, time-series-like data |
| Matches | **MongoDB** | Document model, relationship tracking |
| Messages | **MongoDB** | Document model, threading support |
| Search Index | **Elasticsearch** | Full-text search, geospatial queries, aggregations |
| Cache/State | **Redis** | Sub-ms latency, data structures for matching |

**Polyglot Persistence Benefits:**
- Each store optimized for its access pattern
- Elasticsearch handles complex geo queries
- Redis provides real-time state for match detection
- MongoDB provides flexible schema for evolving features

### 4. Synchronous vs Asynchronous Communication

| Flow | Choice | Justification |
|------|--------|---------------|
| Swipe Processing | **Async (Kafka)** | High throughput, decoupled match detection |
| Profile Fetch | **Sync (gRPC)** | Low latency required, <100ms SLO |
| Match Notification | **Async (Kafka + WebSocket)** | Event-driven, real-time delivery |
| Chat Messages | **Async (WebSocket)** | Real-time bidirectional |

### 5. Push vs Pull for Recommendations

| Approach | Pros | Cons |
|----------|------|------|
| **Pull (on-demand)** ✓ | Fresh recommendations, no stale data | Query latency on each request |
| Push (precomputed) | Instant response | Staleness, storage overhead |

**Hybrid Approach:**
- Pull with short caching (5-minute TTL)
- Background refresh for active users
- Invalidate cache on significant preference changes

### 6. Real-Time Messaging: Polling vs WebSocket

| Approach | Before (Polling) | After (WebSocket) |
|----------|-----------------|-------------------|
| Latency | ~1 second | Microseconds |
| Data usage | High (continuous polling) | Low (event-driven) |
| Server load | 500K requests/sec | 5K connections/node |
| Complexity | Simple | Connection management |

**WebSocket (Scarlet) chosen for:**
- Instant message delivery
- Reduced mobile data consumption
- Lower server CPU usage
- Better user experience

---

## Architecture Pattern Checklist

| Pattern | Decision | Implementation |
|---------|----------|----------------|
| Sync vs Async | **Hybrid** | Sync for reads, Async for writes |
| Event-driven vs Request-response | **Event-driven** for writes | Kafka for swipes, matches, notifications |
| Push vs Pull | **Pull with caching** | On-demand recommendations with 5-min cache |
| Stateless vs Stateful | **Stateless services** | State in Redis/MongoDB |
| Read-heavy vs Write-heavy | **Read-heavy (50:1)** | Cache-heavy architecture |
| Real-time vs Batch | **Real-time** | WebSocket, streaming Kafka |
| Edge vs Origin | **Edge for photos** | Multi-CDN, origin for API |

---

## Service Responsibilities

### Core Services

| Service | Responsibility | Dependencies | SLO |
|---------|----------------|--------------|-----|
| **Profile Service** | User profiles, preferences, photos | MongoDB, Blob Storage | 99.9%, <200ms |
| **Discovery Service** | Profile recommendations | Elasticsearch, ML Platform | 99.9%, <100ms |
| **Swipe Service** | Record swipe actions | Kafka, MongoDB | 99.99%, <100ms |
| **Match Service** | Create/query matches | MongoDB, Redis, Kafka | 99.99%, <2s |
| **Chat Service** | Real-time messaging | MongoDB, Redis, WebSocket | 99.9%, <500ms |
| **Notification Service** | Push notifications | Kafka, APNS, FCM, WebSocket | 99.9%, best-effort |

### Support Services

| Service | Responsibility | Notes |
|---------|----------------|-------|
| **Media Service** | Photo upload, processing, moderation | Presigned URLs, async processing |
| **Location Service** | Geo updates, geoshard routing | S2 cell calculation |
| **Preference Service** | Discovery filters | Age, distance, gender |
| **Block Service** | Block/report users | Affects recommendations |
| **Subscription Service** | Premium features | Boost, Super Like, Passport |

---

## Cross-Cutting Concerns

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. User logs in via OAuth2 (Google/Apple/Facebook) or phone/email     │
│  2. Auth Service validates credentials, issues JWT                      │
│  3. JWT contains: user_id, subscription_tier, expiry                    │
│  4. TAG validates JWT on every request                                  │
│  5. Services receive user_id in X-User-Id header                        │
│                                                                         │
│  Token Refresh:                                                         │
│  • Access token: 1 hour expiry                                         │
│  • Refresh token: 30 days expiry                                       │
│  • Rotation on each refresh                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Rate Limiting

| Endpoint | Limit | Window | Rationale |
|----------|-------|--------|-----------|
| GET /recommendations | 60/min | Per user | Prevent scraping |
| POST /swipe | 1000/hour | Per user | Natural usage cap |
| POST /messages | 200/hour | Per user | Spam prevention |
| POST /photos | 10/day | Per user | Resource protection |
| Auth endpoints | 5/min | Per IP | Brute force prevention |

### Service Mesh (Envoy)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ENVOY SIDECAR RESPONSIBILITIES                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Traffic Management:                                                    │
│  • Load balancing (round-robin, least-connections)                     │
│  • Circuit breaking (fail-fast on unhealthy upstreams)                 │
│  • Retries with exponential backoff                                    │
│  • Timeouts per route                                                  │
│                                                                         │
│  Security:                                                              │
│  • mTLS between all services                                           │
│  • Certificate rotation                                                │
│                                                                         │
│  Observability:                                                         │
│  • Distributed tracing (inject trace headers)                          │
│  • Metrics export (Prometheus format)                                  │
│  • Access logging                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Region Deployment

```mermaid
flowchart TB
    subgraph Global["Global Layer"]
        GeoDNS["GeoDNS"]
        GlobalCDN["Global CDN"]
    end

    subgraph US["US Region (Primary)"]
        US_LB["Load Balancer"]
        US_Services["Services"]
        US_MongoDB[("MongoDB Primary")]
        US_ES[("Elasticsearch")]
        US_Redis[("Redis")]
    end

    subgraph EU["EU Region"]
        EU_LB["Load Balancer"]
        EU_Services["Services"]
        EU_MongoDB[("MongoDB Secondary")]
        EU_ES[("Elasticsearch")]
        EU_Redis[("Redis")]
    end

    subgraph APAC["APAC Region"]
        APAC_LB["Load Balancer"]
        APAC_Services["Services"]
        APAC_MongoDB[("MongoDB Secondary")]
        APAC_ES[("Elasticsearch")]
        APAC_Redis[("Redis")]
    end

    GeoDNS --> US_LB
    GeoDNS --> EU_LB
    GeoDNS --> APAC_LB

    US_MongoDB <-.->|Replication| EU_MongoDB
    US_MongoDB <-.->|Replication| APAC_MongoDB

    US_Redis <-.->|XDCR| EU_Redis
    US_Redis <-.->|XDCR| APAC_Redis

    classDef global fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef region fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class GeoDNS,GlobalCDN global
    class US_LB,US_Services,EU_LB,EU_Services,APAC_LB,APAC_Services region
    class US_MongoDB,US_ES,US_Redis,EU_MongoDB,EU_ES,EU_Redis,APAC_MongoDB,APAC_ES,APAC_Redis data
```

### Regional Routing Rules

| User Location | Primary Region | Failover |
|---------------|----------------|----------|
| North America | US-East | US-West → EU |
| Europe | EU-West | EU-Central → US |
| Asia-Pacific | APAC-Singapore | APAC-Sydney → US |
| South America | US-East | EU-West |

### Data Locality

| Data Type | Strategy | Rationale |
|-----------|----------|-----------|
| Profiles | Global replication | Users travel, profiles needed everywhere |
| Swipes | Regional + async sync | Local writes, eventual global visibility |
| Matches | Global replication | Both users may be in different regions |
| Messages | Regional with sync | Conversation should feel local |
| Photos | Global CDN | Edge caching handles distribution |

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Client** | iOS (Swift), Android (Kotlin), Web (React) | Mobile-first experience |
| **CDN** | Multi-vendor (CloudFront, Akamai, Fastly) | Photo delivery, static assets |
| **Load Balancer** | Cloud-native ALB | Traffic distribution |
| **API Gateway** | TAG (Spring Cloud Gateway) | Routing, auth, rate limiting |
| **Service Mesh** | Envoy | mTLS, traffic management |
| **Compute** | Containerized (ECS/Kubernetes) | Service deployment |
| **Primary DB** | MongoDB | Profiles, swipes, matches, messages |
| **Search** | Elasticsearch | Geosharded discovery index |
| **Cache** | Redis (ElastiCache) | Session, swipe state, hot data |
| **Queue** | Kafka | Event streaming |
| **Object Storage** | Cloud blob storage | Photos |
| **Real-time** | WebSocket (Scarlet) | Chat, notifications |
| **Push** | APNS, FCM | Mobile push notifications |
| **Geo** | S2 Geometry | Geospatial indexing |
| **ML** | TinVec, Custom models | Recommendations |

---

*Next: [Low-Level Design →](./03-low-level-design.md)*
