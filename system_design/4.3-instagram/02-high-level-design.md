# High-Level Design

[← Back to Requirements](./01-requirements-and-estimations.md) | [Next: Low-Level Design →](./03-low-level-design.md)

---

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        iOS["iOS App"]
        Android["Android App"]
        Web["Web App<br/>(instagram.com)"]
    end

    subgraph Edge["Edge Layer"]
        CDN["Proprietary CDN<br/>(scontent.cdninstagram.com)"]
        EdgeCompute["Edge Compute<br/>(ExecuTorch ML)"]
    end

    subgraph Gateway["Gateway Layer"]
        GLB["Global Load Balancer<br/>(GeoDNS)"]
        LB["Regional Load Balancer"]
        APIGateway["API Gateway"]
        Auth["Auth Service<br/>(OAuth 2.0)"]
        RateLimiter["Rate Limiter"]
    end

    subgraph CoreServices["Core Services"]
        MediaService["Media Service"]
        FeedService["Feed Service"]
        StoriesService["Stories Service"]
        ExploreService["Explore Service"]
        ReelsService["Reels Service"]
        UserService["User Service"]
        FollowService["Follow Service"]
        InteractionService["Interaction Service<br/>(Likes/Comments)"]
        NotificationService["Notification Service"]
        SearchService["Search Service"]
    end

    subgraph MLServices["ML Services"]
        RankingService["Ranking Service<br/>(1,000+ Models)"]
        RecommendationEngine["Recommendation Engine<br/>(Andromeda)"]
        ModerationService["Content Moderation<br/>(ML + Human)"]
        FeatureService["Feature Service<br/>(65B features)"]
    end

    subgraph MediaPipeline["Media Processing Pipeline"]
        UploadHandler["Upload Handler"]
        TranscodingQueue["Transcoding Queue"]
        ImageProcessor["Image Processor"]
        VideoEncoder["Video Encoder<br/>(AV1/H.264)"]
        ThumbnailGenerator["Thumbnail Generator"]
        SuperResolution["Super Resolution<br/>(VSR)"]
        FilterEngine["Filter Engine"]
    end

    subgraph Streaming["Event Streaming"]
        EventBus["Event Bus"]
        FanoutService["Fanout Service"]
        ActivityStream["Activity Stream"]
    end

    subgraph Storage["Storage Layer"]
        PostgreSQL[("PostgreSQL<br/>(User/Media Metadata)")]
        Cassandra[("Cassandra<br/>(Feed/Timeline)")]
        BlobStorage[("Blob Storage<br/>(Media Files)")]
        Redis[("Redis<br/>(Cache/Sessions)")]
        Memcached[("Memcached<br/>(Query Cache)")]
        FeatureStore[("Feature Store<br/>(ML Features)")]
        SearchIndex[("Search Index<br/>(ElasticSearch)")]
    end

    %% Client connections
    iOS --> CDN
    Android --> CDN
    Web --> CDN
    iOS --> EdgeCompute
    Android --> EdgeCompute
    CDN --> GLB
    EdgeCompute --> GLB

    %% Gateway flow
    GLB --> LB --> APIGateway
    APIGateway --> Auth
    APIGateway --> RateLimiter

    %% Core service routing
    RateLimiter --> MediaService
    RateLimiter --> FeedService
    RateLimiter --> StoriesService
    RateLimiter --> ExploreService
    RateLimiter --> ReelsService
    RateLimiter --> UserService
    RateLimiter --> SearchService

    %% Media pipeline
    MediaService --> UploadHandler
    UploadHandler --> TranscodingQueue
    TranscodingQueue --> ImageProcessor
    TranscodingQueue --> VideoEncoder
    ImageProcessor --> ThumbnailGenerator
    ImageProcessor --> FilterEngine
    VideoEncoder --> SuperResolution
    ThumbnailGenerator --> BlobStorage
    SuperResolution --> BlobStorage
    FilterEngine --> BlobStorage

    %% Feed & ranking
    FeedService --> RankingService
    FeedService --> Cassandra
    FeedService --> Redis
    StoriesService --> Redis
    StoriesService --> BlobStorage
    ExploreService --> RecommendationEngine
    ExploreService --> FeatureService
    ReelsService --> RankingService

    %% ML connections
    RankingService --> FeatureStore
    RecommendationEngine --> FeatureStore
    ModerationService --> MediaService

    %% Streaming
    MediaService --> EventBus
    InteractionService --> EventBus
    EventBus --> FanoutService
    EventBus --> ActivityStream
    FanoutService --> Cassandra
    ActivityStream --> NotificationService

    %% Storage connections
    UserService --> PostgreSQL
    FollowService --> PostgreSQL
    MediaService --> PostgreSQL
    InteractionService --> Cassandra
    SearchService --> SearchIndex

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef core fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ml fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef pipeline fill:#fff8e1,stroke:#ff8f00,stroke-width:2px
    classDef streaming fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class iOS,Android,Web client
    class CDN,EdgeCompute edge
    class GLB,LB,APIGateway,Auth,RateLimiter gateway
    class MediaService,FeedService,StoriesService,ExploreService,ReelsService,UserService,FollowService,InteractionService,NotificationService,SearchService core
    class RankingService,RecommendationEngine,ModerationService,FeatureService ml
    class UploadHandler,TranscodingQueue,ImageProcessor,VideoEncoder,ThumbnailGenerator,SuperResolution,FilterEngine pipeline
    class EventBus,FanoutService,ActivityStream streaming
    class PostgreSQL,Cassandra,BlobStorage,Redis,Memcached,FeatureStore,SearchIndex storage
```

---

## Data Flow Diagrams

### 1. Media Upload Flow

```mermaid
sequenceDiagram
    participant Client
    participant CDN
    participant APIGateway
    participant MediaService
    participant UploadHandler
    participant Queue as Transcoding Queue
    participant Processor as Media Processor
    participant BlobStore
    participant PostgreSQL
    participant EventBus
    participant Moderation

    Client->>CDN: POST /media (photo/video)
    CDN->>APIGateway: Forward request
    APIGateway->>MediaService: Authenticated request

    MediaService->>UploadHandler: Accept upload
    UploadHandler->>UploadHandler: Strip EXIF metadata
    UploadHandler->>BlobStore: Store raw media (temp)
    UploadHandler-->>Client: 202 Accepted (media_id)

    UploadHandler->>Queue: Enqueue processing job

    par Parallel Processing
        Queue->>Processor: Process image
        Processor->>Processor: Generate thumbnails (1440px, 250px, thumbhash)
        Processor->>Processor: Apply filters (if any)
        Processor->>Processor: ML compression
    and Video Path
        Queue->>Processor: Transcode video
        Processor->>Processor: Encode AV1 (primary)
        Processor->>Processor: Encode H.264 (fallback)
        Processor->>Processor: Generate ABR variants
        Processor->>Processor: Apply Super Resolution
    end

    Processor->>BlobStore: Store processed media
    Processor->>PostgreSQL: Update metadata (status: ready)
    Processor->>Moderation: Trigger content check
    Processor->>CDN: Push to edge cache

    MediaService->>EventBus: Publish MediaReady event
    EventBus->>EventBus: Trigger fanout to followers

    Note over Client,EventBus: Async processing completes in 5-30 seconds
```

### 2. Feed Generation Flow

```mermaid
sequenceDiagram
    participant Client
    participant CDN
    participant EdgeCache
    participant FeedService
    participant Redis
    participant Cassandra
    participant RankingService
    participant FeatureStore
    participant BlobStore

    Client->>CDN: GET /feed
    CDN->>EdgeCache: Check edge cache

    alt Cache Hit
        EdgeCache-->>Client: Return cached feed
    else Cache Miss
        EdgeCache->>FeedService: Request feed

        FeedService->>Redis: Get precomputed timeline

        alt Timeline Cached
            Redis-->>FeedService: Return post IDs (800 entries)
        else Timeline Miss
            FeedService->>Cassandra: Fetch timeline posts
            Cassandra-->>FeedService: Return raw timeline
            FeedService->>Redis: Cache timeline
        end

        par Ranking Pipeline
            FeedService->>FeatureStore: Get user features
            FeedService->>FeatureStore: Get post features
            FeedService->>FeatureStore: Get author features
        end

        FeedService->>RankingService: Rank posts
        RankingService->>RankingService: Apply 1,000+ ML models
        RankingService->>RankingService: Predict engagement
        RankingService->>RankingService: Apply diversity constraints
        RankingService-->>FeedService: Ranked post list

        FeedService->>BlobStore: Get media URLs (batch)
        BlobStore-->>FeedService: Signed URLs

        FeedService-->>EdgeCache: Return feed response
        EdgeCache-->>CDN: Cache response
        CDN-->>Client: Return feed
    end

    Note over Client: Client prefetches media from CDN
```

### 3. Stories Lifecycle Flow

```mermaid
sequenceDiagram
    participant Creator
    participant CDN
    participant StoriesService
    participant Redis
    participant BlobStore
    participant TTLService as Expiration Service
    participant Followers
    participant NotificationService

    %% Upload Phase
    Creator->>CDN: POST /stories (media)
    CDN->>StoriesService: Forward upload
    StoriesService->>StoriesService: Set expires_at = now + 24h
    StoriesService->>BlobStore: Store Story media
    StoriesService->>Redis: Store Story metadata
    StoriesService->>CDN: Push to edge cache
    StoriesService->>NotificationService: Notify followers
    StoriesService-->>Creator: 201 Created (story_id)

    %% View Phase
    loop For each follower viewing
        Followers->>CDN: GET /stories/{user_id}
        CDN->>Redis: Get Stories tray
        Redis-->>CDN: Return Stories metadata
        CDN->>BlobStore: Fetch Story media
        BlobStore-->>CDN: Return media
        CDN-->>Followers: Stream Story
        Followers->>StoriesService: Record view event
        StoriesService->>Redis: Update view analytics
    end

    %% Expiration Phase
    TTLService->>TTLService: Scheduled job (runs every minute)
    TTLService->>Redis: Scan for expired Stories
    Redis-->>TTLService: Return expired Story IDs

    par Cleanup
        TTLService->>Redis: Delete from active cache
        TTLService->>CDN: Invalidate edge cache
        TTLService->>BlobStore: Mark for deletion (or archive)
    end

    TTLService->>Followers: Update Stories tray (remove ring)

    Note over TTLService: Stories deleted exactly 24h after posting
```

### 4. Explore Discovery Flow

```mermaid
sequenceDiagram
    participant Client
    participant ExploreService
    participant RecommendationEngine as Andromeda
    participant FeatureService
    participant FeatureStore
    participant RankingService
    participant ContentPool
    participant BlobStore

    Client->>ExploreService: GET /explore

    %% Stage 1: Candidate Retrieval
    ExploreService->>FeatureService: Get user interests
    FeatureService->>FeatureStore: Fetch user embeddings
    FeatureStore-->>FeatureService: Return embeddings

    ExploreService->>RecommendationEngine: Retrieve candidates
    RecommendationEngine->>ContentPool: Query by interest vectors
    RecommendationEngine->>RecommendationEngine: ANN search (millions → thousands)
    RecommendationEngine-->>ExploreService: Return ~5,000 candidates

    %% Stage 2: Scoring
    ExploreService->>FeatureService: Extract features (65B total)
    par Feature Extraction
        FeatureService->>FeatureStore: User features
        FeatureService->>FeatureStore: Content features
        FeatureService->>FeatureStore: Author features
        FeatureService->>FeatureStore: Context features
    end
    FeatureService-->>ExploreService: Return feature vectors

    ExploreService->>RankingService: Score candidates
    RankingService->>RankingService: Predict engagement probabilities
    RankingService->>RankingService: Apply scoring formula
    RankingService-->>ExploreService: Scored candidates

    %% Stage 3: Filtering & Ranking
    ExploreService->>ExploreService: Apply diversity constraints
    ExploreService->>ExploreService: Content type balance
    ExploreService->>ExploreService: Quality filtering
    ExploreService->>ExploreService: Final ranking (~200 posts)

    ExploreService->>BlobStore: Get media URLs
    BlobStore-->>ExploreService: Signed URLs

    ExploreService-->>Client: Return Explore feed

    Note over ExploreService: 90M predictions/sec across all users
```

---

## Key Architectural Decisions

### 1. Service Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture Style | Microservices | Independent scaling, deployment, team ownership |
| Communication (Internal) | gRPC | Low latency, strong typing, streaming support |
| Communication (External) | REST + GraphQL | Developer familiarity, flexible queries |
| Service Discovery | DNS-based + Service Mesh | Reliability, traffic management |

### 2. Sync vs Async Communication

| Flow | Model | Reason |
|------|-------|--------|
| Media Upload | Async | Long processing time (5-30s); immediate ack needed |
| Feed Load | Sync | User waiting; low latency required |
| Stories Post | Async | Background processing, immediate confirmation |
| Fanout to Followers | Async | High volume; eventual consistency acceptable |
| ML Ranking | Sync (with timeout) | Required for response; fallback to cache |
| Notifications | Async | Fire-and-forget; batching optimization |

### 3. Database Choices

```mermaid
flowchart LR
    subgraph Polyglot["Polyglot Persistence"]
        PostgreSQL["PostgreSQL<br/>• User profiles<br/>• Media metadata<br/>• Relationships<br/>• Auth data"]
        Cassandra["Cassandra<br/>• Feed timelines<br/>• Notifications<br/>• Activity logs<br/>• Like counts"]
        BlobStore["Blob Storage<br/>• Photos<br/>• Videos<br/>• Stories<br/>• Thumbnails"]
        Redis["Redis<br/>• Session cache<br/>• Rate limiting<br/>• Stories metadata<br/>• Precomputed feeds"]
        ElasticSearch["ElasticSearch<br/>• User search<br/>• Hashtag search<br/>• Location search"]
    end

    classDef relational fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef nosql fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef blob fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef cache fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef search fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class PostgreSQL relational
    class Cassandra nosql
    class BlobStore blob
    class Redis cache
    class ElasticSearch search
```

| Database | Use Case | Why This Choice |
|----------|----------|-----------------|
| **PostgreSQL** | User profiles, media metadata, relationships | Strong consistency, ACID, complex queries |
| **Cassandra** | Feed timelines, notifications, activity | High write throughput, horizontal scaling |
| **Blob Storage** | Media files | Optimized for large binary objects |
| **Redis** | Caching, sessions, rate limiting | Sub-millisecond latency, data structures |
| **Memcached** | Query caching | Simple, fast, distributed |
| **ElasticSearch** | Search (users, hashtags, locations) | Full-text search, relevance ranking |

### 4. Caching Strategy

| Layer | Technology | Data Cached | TTL |
|-------|------------|-------------|-----|
| **L1 (Client)** | IndexedDB | Feed data, session | Session-based |
| **L2 (Edge/CDN)** | Proprietary CDN | Media files, static assets | Hours-days |
| **L3 (Application)** | Redis | Precomputed feeds, Stories | Minutes-hours |
| **L4 (Database)** | Memcached | Query results, hot rows | Seconds-minutes |

**Cache-First Rendering Strategy:**
1. Client requests feed
2. Serve cached feed immediately (2.5% faster display)
3. Fetch fresh data in background
4. Replace cached data when fresh data arrives
5. User sees instant content, then updates

### 5. Message Queue Usage

| Use Case | Pattern | Technology |
|----------|---------|------------|
| Media Processing | Work Queue | Distributed queue |
| Feed Fanout | Pub/Sub | Event streaming |
| Notifications | Priority Queue | Batch processing |
| Activity Logging | Append-only Log | Event store |
| Analytics Events | Streaming | Real-time processing |

---

## Architecture Pattern Checklist

| Pattern | Decision | Implementation |
|---------|----------|----------------|
| Sync vs Async | Hybrid | Sync for reads, async for writes |
| Event-driven vs Request-response | Both | Event-driven for updates, request-response for queries |
| Push vs Pull (Feed) | Hybrid | Push for regular users (<100K), pull for celebrities |
| Stateless vs Stateful | Stateless services | State externalized to Redis/databases |
| Read-heavy optimization | Yes | Multi-tier caching, precomputation |
| Real-time vs Batch | Both | Real-time for feed ranking, batch for ML training |
| Edge processing | Yes | CDN caching, ExecuTorch on-device ML |

---

## Hybrid Fan-out Strategy

Instagram uses the same hybrid approach as Facebook/Twitter for content distribution:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HYBRID FAN-OUT STRATEGY                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  REGULAR USERS (<100K followers)                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Fan-out on WRITE (Push Model)                                   │   │
│  │ • When user posts, push to all follower timelines               │   │
│  │ • Stored in Cassandra (follower_id, post_id, timestamp)         │   │
│  │ • Feed read = simple range query                                │   │
│  │ • Trade-off: Write amplification, but fast reads                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  CELEBRITY USERS (≥100K followers)                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Fan-out on READ (Pull Model)                                    │   │
│  │ • When user posts, store only in author's post list             │   │
│  │ • When follower loads feed, merge celebrity posts on-demand     │   │
│  │ • Trade-off: Slower reads, but manageable write load            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  TIMELINE ASSEMBLY:                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Fetch pushed posts from timeline (regular users)             │   │
│  │ 2. Fetch posts from followed celebrities (pull)                 │   │
│  │ 3. Merge and sort by timestamp                                  │   │
│  │ 4. Apply ML ranking                                             │   │
│  │ 5. Return top N posts                                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## CDN Architecture

```mermaid
flowchart TB
    subgraph Clients["Global Users"]
        US["US Users"]
        EU["EU Users"]
        APAC["APAC Users"]
    end

    subgraph CDNEdge["CDN Edge Layer"]
        USEdge["US Edge PoPs"]
        EUEdge["EU Edge PoPs"]
        APACEdge["APAC Edge PoPs"]
    end

    subgraph OriginShield["Origin Shield"]
        USShield["US Origin Shield"]
        EUShield["EU Origin Shield"]
        APACShield["APAC Origin Shield"]
    end

    subgraph Origin["Origin Data Centers"]
        USOrigin["US-East Origin"]
        USWestOrigin["US-West Origin"]
        EUOrigin["EU Origin"]
        APACOrigin["APAC Origin"]
    end

    subgraph BlobStores["Blob Storage"]
        MediaStore[("Media Storage<br/>(Multi-region replicated)")]
    end

    US --> USEdge
    EU --> EUEdge
    APAC --> APACEdge

    USEdge -->|Cache Miss| USShield
    EUEdge -->|Cache Miss| EUShield
    APACEdge -->|Cache Miss| APACShield

    USShield --> USOrigin
    EUShield --> EUOrigin
    APACShield --> APACOrigin

    USOrigin --> MediaStore
    USWestOrigin --> MediaStore
    EUOrigin --> MediaStore
    APACOrigin --> MediaStore

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef shield fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef origin fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class US,EU,APAC client
    class USEdge,EUEdge,APACEdge edge
    class USShield,EUShield,APACShield shield
    class USOrigin,USWestOrigin,EUOrigin,APACOrigin origin
    class MediaStore storage
```

**CDN Key Features:**
- **Proprietary CDN**: Instagram operates its own CDN (scontent.cdninstagram.com)
- **Edge Caching**: Media cached at PoPs closest to users
- **Origin Shield**: Intermediate caching layer protects origin
- **Intelligent Prefetching**: ML predicts content to cache (35% bandwidth savings)
- **Cache Invalidation**: Event-driven invalidation for Stories expiration

---

## ML Infrastructure Overview

```mermaid
flowchart LR
    subgraph FeatureGeneration["Feature Generation"]
        RealTimeFeatures["Real-time Features<br/>(User actions)"]
        BatchFeatures["Batch Features<br/>(Aggregations)"]
        EmbeddingFeatures["Embedding Features<br/>(DLRM vectors)"]
    end

    subgraph FeatureStore["Feature Store"]
        OnlineStore["Online Store<br/>(Low latency)"]
        OfflineStore["Offline Store<br/>(Training data)"]
    end

    subgraph ModelServing["Model Serving"]
        RankingModels["Ranking Models<br/>(1,000+)"]
        RecommendationModels["Recommendation<br/>(Andromeda)"]
        ModerationModels["Moderation<br/>(Content safety)"]
    end

    subgraph Applications["Applications"]
        Feed["Feed Ranking"]
        Explore["Explore"]
        Reels["Reels"]
        Stories["Stories Tray"]
    end

    RealTimeFeatures --> OnlineStore
    BatchFeatures --> OnlineStore
    BatchFeatures --> OfflineStore
    EmbeddingFeatures --> OnlineStore

    OnlineStore --> RankingModels
    OnlineStore --> RecommendationModels
    OnlineStore --> ModerationModels
    OfflineStore --> RankingModels

    RankingModels --> Feed
    RankingModels --> Reels
    RankingModels --> Stories
    RecommendationModels --> Explore
    ModerationModels --> Feed
    ModerationModels --> Explore

    classDef feature fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef store fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef model fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef app fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class RealTimeFeatures,BatchFeatures,EmbeddingFeatures feature
    class OnlineStore,OfflineStore store
    class RankingModels,RecommendationModels,ModerationModels model
    class Feed,Explore,Reels,Stories app
```

---

## Key Technical Decisions Summary

| Area | Decision | Trade-off |
|------|----------|-----------|
| **Storage** | Polyglot (PostgreSQL + Cassandra + Blob) | Complexity vs optimal performance per use case |
| **Caching** | Multi-tier (Client → CDN → Redis → Memcached) | Memory cost vs latency |
| **Fan-out** | Hybrid (push <100K, pull ≥100K) | Write amplification vs read latency |
| **Processing** | Async with immediate ack | User experience vs processing delay |
| **Consistency** | Eventual for feed, strong for uploads | Freshness vs availability |
| **ML Ranking** | Real-time (1,000+ models) | Latency vs personalization quality |
| **Video Codec** | AV1 primary, H.264 fallback | Compression vs device compatibility |
| **CDN** | Proprietary | Control vs cost |

---

*[← Back to Requirements](./01-requirements-and-estimations.md) | [Next: Low-Level Design →](./03-low-level-design.md)*
