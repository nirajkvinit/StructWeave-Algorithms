# High-Level Design

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Key Architectural Decisions](#key-architectural-decisions)
4. [Caching Strategy](#caching-strategy)
5. [Multi-Region Deployment](#multi-region-deployment)
6. [Architecture Pattern Checklist](#architecture-pattern-checklist)

---

## System Architecture

### Component Architecture Diagram

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        iOS[iOS App]
        Android[Android App]
        Web[Web App]
        APIClients[API Consumers]
    end

    subgraph Edge["Edge Layer"]
        CDN[CDN<br/>Static Assets + Media]
        EdgePOP[Edge PoPs<br/>Geographic Distribution]
    end

    subgraph Gateway["Gateway Layer"]
        GLB[Global Load Balancer<br/>GeoDNS + L7]
        APIGateway[API Gateway<br/>Routing + Transformation]
        Auth[Auth Service<br/>OAuth 2.0 + Sessions]
        RateLimit[Rate Limiter<br/>Token Bucket]
    end

    subgraph Timeline["Timeline Services"]
        HomeMixer[Home Mixer<br/>Timeline Assembly]
        ProductMixer[Product Mixer<br/>Feed Framework]
        CandidateRetrieval[Candidate Retrieval<br/>In/Out Network]
    end

    subgraph Tweet["Tweet Services"]
        Tweetypie[Tweetypie<br/>Tweet CRUD]
        MediaService[Media Service<br/>Upload + Processing]
        FanoutService[Fanout Service<br/>Timeline Distribution]
    end

    subgraph Social["Social Graph Services"]
        GraphService[Social Graph Service<br/>Follow/Follower]
        GraphJet[GraphJet<br/>In-Memory Traversal]
    end

    subgraph Discovery["Discovery Services"]
        SearchService[Search Service<br/>Tweet + User Search]
        TrendsService[Trends Service<br/>Trending Topics]
        ExploreService[Explore Service<br/>Discovery Feed]
    end

    subgraph ML["ML Platform"]
        Navi[Navi<br/>ML Inference - Rust]
        SimClusters[SimClusters<br/>Community Embeddings]
        TwHIN[TwHIN<br/>Knowledge Graph]
        RankingModels[Ranking Models<br/>Engagement Prediction]
    end

    subgraph Notification["Notification Services"]
        NotificationService[Notification Service]
        PushService[Push Service<br/>APNs + FCM]
        EmailService[Email Service]
    end

    subgraph Streaming["Streaming Infrastructure"]
        Kafka[Kafka<br/>Event Bus]
        Heron[Heron<br/>Stream Processing]
        Summingbird[Summingbird<br/>Lambda Architecture]
    end

    subgraph Data["Data Layer"]
        Manhattan[(Manhattan KV<br/>Primary Store)]
        MySQL[(MySQL<br/>100K+ Shards)]
        Redis[(Redis Cluster<br/>Timeline Cache)]
        ES[(ElasticSearch<br/>Search Index)]
        FeatureStore[(Feature Store<br/>ML Features)]
    end

    Clients --> Edge
    Edge --> Gateway

    Gateway --> Timeline
    Gateway --> Tweet
    Gateway --> Social
    Gateway --> Discovery
    Gateway --> Notification

    HomeMixer --> ML
    HomeMixer --> Redis
    HomeMixer --> GraphJet

    Tweetypie --> Manhattan
    Tweetypie --> FanoutService
    FanoutService --> Kafka

    SearchService --> ES
    TrendsService --> Heron

    Social --> MySQL
    GraphJet --> GraphService

    Kafka --> Heron
    Heron --> FeatureStore

    ML --> FeatureStore

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff8e1,stroke:#ff8f00,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef timeline fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef tweet fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef social fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef discovery fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ml fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef notification fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    classDef streaming fill:#e0f7fa,stroke:#00838f,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class iOS,Android,Web,APIClients client
    class CDN,EdgePOP edge
    class GLB,APIGateway,Auth,RateLimit gateway
    class HomeMixer,ProductMixer,CandidateRetrieval timeline
    class Tweetypie,MediaService,FanoutService tweet
    class GraphService,GraphJet social
    class SearchService,TrendsService,ExploreService discovery
    class Navi,SimClusters,TwHIN,RankingModels ml
    class NotificationService,PushService,EmailService notification
    class Kafka,Heron,Summingbird streaming
    class Manhattan,MySQL,Redis,ES,FeatureStore data
```

### Service Responsibilities

| Service | Responsibility | Scale Characteristics |
|---------|----------------|----------------------|
| **Home Mixer** | Assembles personalized timeline using Product Mixer framework | 5B ranking decisions/day, <1.5s latency |
| **Product Mixer** | Generic feed construction framework (Scala) | Declarative pipelines, parallel execution |
| **Tweetypie** | Tweet CRUD operations, content validation | 500M tweets/day write throughput |
| **Fanout Service** | Distributes tweets to follower timelines | 3.85M writes/sec for regular users |
| **GraphJet** | In-memory social graph for discovery | Billions of edges, sub-ms traversal |
| **Navi** | ML model inference (Rust) | Sub-millisecond predictions, GPU-optimized |
| **Search Service** | Real-time tweet and user search | <1 second indexing latency |
| **Trends Service** | Trending topic detection | Real-time streaming, predictive algorithms |

---

## Data Flow Diagrams

### Timeline Request Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Gateway as API Gateway
    participant HomeMixer as Home Mixer
    participant Redis as Redis Cache
    participant GraphJet
    participant Navi as Navi ML
    participant Manhattan

    Client->>Gateway: GET /timeline/home
    Gateway->>Gateway: Authenticate + Rate Limit
    Gateway->>HomeMixer: Timeline Request

    par Parallel Fetch
        HomeMixer->>Redis: Get Pushed Timeline
        Note over Redis: ~800 tweet IDs (regular follows)

        HomeMixer->>GraphJet: Get Out-of-Network Candidates
        Note over GraphJet: ~750 tweets via graph traversal
    end

    HomeMixer->>HomeMixer: Merge Candidates (~1,500 total)

    HomeMixer->>Manhattan: Hydrate Tweet Objects
    Note over Manhattan: Batch fetch tweet content

    HomeMixer->>Navi: Score Candidates
    Note over Navi: Engagement prediction for each tweet

    Navi-->>HomeMixer: Scored Tweets

    HomeMixer->>HomeMixer: Rank + Filter + Diversify
    Note over HomeMixer: Apply diversity constraints, freshness

    HomeMixer-->>Gateway: ~200 Ranked Tweets
    Gateway-->>Client: Timeline Response

    Note over Client,Manhattan: Total latency budget: <1.5 seconds<br/>220 CPU-seconds of computation
```

### Tweet Creation Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Gateway as API Gateway
    participant Tweetypie
    participant Manhattan
    participant Kafka
    participant Fanout as Fanout Service
    participant Redis as Redis Cache
    participant Search as Search Service
    participant ES as ElasticSearch

    Client->>Gateway: POST /tweets {content, media}
    Gateway->>Gateway: Authenticate + Validate
    Gateway->>Tweetypie: Create Tweet

    Tweetypie->>Tweetypie: Validate Content
    Note over Tweetypie: Length, mentions, hashtags, safety

    Tweetypie->>Manhattan: Store Tweet
    Note over Manhattan: Generate Snowflake ID, persist

    Manhattan-->>Tweetypie: Tweet ID

    par Async Processing
        Tweetypie->>Kafka: Publish TweetCreated Event

        Kafka->>Fanout: Fan-out Event
        Fanout->>Fanout: Check Follower Count

        alt Regular User (<100K followers)
            Fanout->>Redis: Push to Follower Timelines
            Note over Redis: Insert tweet_id into each follower's sorted set
        else Celebrity (>=100K followers)
            Fanout->>Redis: Add to Celebrity Index Only
            Note over Redis: Will be pulled at read time
        end

        Kafka->>Search: Index Event
        Search->>ES: Index Tweet
        Note over ES: Target: <1 second latency
    end

    Tweetypie-->>Gateway: Tweet Created Response
    Gateway-->>Client: 201 Created {tweet_id}

    Note over Client,ES: Write path optimized for latency<br/>Fan-out handled asynchronously
```

### Search Query Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Gateway as API Gateway
    participant Search as Search Service
    participant Proxy as ES Proxy
    participant ES as ElasticSearch
    participant Manhattan
    participant Ranking as Ranking Service

    Client->>Gateway: GET /search?q=query
    Gateway->>Search: Search Request

    Search->>Proxy: Query via Proxy
    Note over Proxy: Custom proxy for metrics, routing

    Proxy->>ES: Execute Search
    Note over ES: Inverted index lookup, relevance scoring

    ES-->>Proxy: Matching Tweet IDs + Scores
    Proxy-->>Search: Results

    Search->>Manhattan: Hydrate Tweet Objects
    Note over Manhattan: Batch fetch for matched tweets

    Search->>Ranking: Re-rank Results
    Note over Ranking: Apply personalization, recency

    Ranking-->>Search: Ranked Results
    Search-->>Gateway: Search Response
    Gateway-->>Client: Results

    Note over Client,Ranking: Search indexing: <1 second from tweet creation<br/>Query latency: <500ms p99
```

### Trends Detection Flow

```mermaid
sequenceDiagram
    autonumber
    participant Tweets as Tweet Stream
    participant Kafka
    participant Heron as Heron/Spark
    participant TrendDetector as Trend Detector
    participant TrendStore as Trend Store
    participant API as Trends API

    loop Continuous Stream
        Tweets->>Kafka: Tweet Events
        Kafka->>Heron: Stream Processing

        Heron->>Heron: Extract Hashtags + Terms
        Heron->>Heron: Window Aggregation (15 min)

        Heron->>TrendDetector: Term Frequencies
    end

    TrendDetector->>TrendDetector: Calculate Velocity
    Note over TrendDetector: velocity = (current - baseline) / baseline

    TrendDetector->>TrendDetector: Apply Detection Algorithms
    Note over TrendDetector: TF-IDF, LDA, K-means, BTM

    TrendDetector->>TrendDetector: Filter + Cluster
    Note over TrendDetector: Group related hashtags

    TrendDetector->>TrendStore: Update Trends
    Note over TrendStore: By region, category

    API->>TrendStore: GET /trends
    TrendStore-->>API: Current Trends

    Note over Tweets,API: Trend detection: <30 seconds<br/>Prediction capability: 1.5-5 hours ahead
```

---

## Key Architectural Decisions

### Decision 1: Product Mixer Framework for Timeline

**Context:** Twitter needs to serve 5 billion ranking decisions daily with <1.5 second latency while requiring 220 CPU-seconds of computation per request.

```mermaid
flowchart TB
    subgraph ProductMixer["Product Mixer Architecture"]
        Request[Request] --> ProductPipeline[Product Pipeline]
        ProductPipeline --> MixerPipeline[Mixer Pipeline]

        MixerPipeline --> |"Parallel"|CandidatePipeline1[In-Network<br/>Candidate Pipeline]
        MixerPipeline --> |"Parallel"|CandidatePipeline2[Out-of-Network<br/>Candidate Pipeline]
        MixerPipeline --> |"Parallel"|CandidatePipeline3[Ads<br/>Candidate Pipeline]

        CandidatePipeline1 --> ScoringPipeline[Scoring Pipeline]
        CandidatePipeline2 --> ScoringPipeline
        CandidatePipeline3 --> ScoringPipeline

        ScoringPipeline --> FilterPipeline[Filter Pipeline]
        FilterPipeline --> Response[Response]
    end

    classDef pipeline fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    class ProductPipeline,MixerPipeline,CandidatePipeline1,CandidatePipeline2,CandidatePipeline3,ScoringPipeline,FilterPipeline pipeline
```

| Approach | Pros | Cons |
|----------|------|------|
| **Product Mixer (Chosen)** | Declarative pipelines, parallel execution, open-sourced | Scala expertise required |
| Custom imperative code | Full control, simple debugging | Hard to parallelize, maintain |
| GraphQL resolvers | Flexible, client-driven | Not optimized for feed use case |

**Decision:** Product Mixer because it enables:
- Declarative pipeline definition with automatic parallelization
- 220 CPU-seconds in <1.5s wall-clock via massive parallelism
- Clear separation of candidate sources, scoring, and filtering
- Reusable across Home, Search, and Notifications

### Decision 2: Hybrid Fan-out with 100K Threshold

**Context:** Twitter's unidirectional graph allows extreme follower counts (150M+), making pure push model infeasible.

```
FAN-OUT COMPARISON:

                    PUSH MODEL                    PULL MODEL
                    (Regular Users)               (Celebrities)

Write Time:         Expensive                     Cheap
                    (fan to N followers)          (index only)

Read Time:          Cheap                         Expensive
                    (precomputed)                 (merge at read)

Best For:           Users with                    Users with
                    <100K followers               >=100K followers

Twitter Adoption:   95% of tweets                 5% of tweets
                    (332B writes/day)             (pulls at read)
```

| Approach | Fan-out Writes/Day | Read Latency Impact |
|----------|-------------------|---------------------|
| Pure Push | 25+ trillion (infeasible) | Minimal |
| Pure Pull | 0 | High (>3s) |
| **Hybrid 100K (Chosen)** | 332 billion | +50-100ms for celebrities |

**Decision:** Hybrid with 100K threshold because:
- 100K is optimal for Twitter's asymmetric graph (higher than Facebook's 10K)
- Eliminates write amplification from top 50K accounts
- Only adds 50-100ms to read path for celebrity content
- Can dynamically adjust threshold based on load

### Decision 3: Three-Stage Recommendation Pipeline

**Context:** Need to select ~200 relevant tweets from billions of possibilities.

```mermaid
flowchart LR
    subgraph Stage1["Stage 1: Candidate Retrieval"]
        direction TB
        InNetwork[In-Network<br/>750 tweets]
        OutNetwork[Out-of-Network<br/>750 tweets]
        InNetwork --> Candidates[~1,500 Candidates]
        OutNetwork --> Candidates
    end

    subgraph Stage2["Stage 2: Scoring"]
        direction TB
        Features[Feature Extraction]
        Navi[Navi ML Inference]
        Score[Engagement Score]
        Features --> Navi --> Score
    end

    subgraph Stage3["Stage 3: Ranking"]
        direction TB
        Rank[Sort by Score]
        Diversity[Apply Diversity]
        Filter[Quality Filters]
        Rank --> Diversity --> Filter
    end

    Stage1 --> Stage2
    Stage2 --> Stage3
    Stage3 --> Final[~200 Tweets]

    classDef stage1 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef stage2 fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef stage3 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class InNetwork,OutNetwork,Candidates stage1
    class Features,Navi,Score stage2
    class Rank,Diversity,Filter stage3
```

**Stage Details:**

| Stage | Input | Output | Key Components |
|-------|-------|--------|----------------|
| Candidate Retrieval | User context | ~1,500 tweets | In-network (followed), Out-of-network (GraphJet) |
| Scoring | Candidates + Features | Scored tweets | Navi (Rust), engagement prediction |
| Ranking | Scored tweets | ~200 tweets | Diversity, freshness, quality filters |

### Decision 4: GraphJet for Out-of-Network Discovery

**Context:** 50% of For You content comes from accounts users don't follow.

```mermaid
flowchart TB
    subgraph GraphJet["GraphJet In-Memory Graph"]
        direction LR
        Users[User Nodes]
        Tweets[Tweet Nodes]
        Users <--> |"Engagement<br/>Edges"|Tweets
    end

    subgraph Discovery["Discovery Methods"]
        RealGraph[Real Graph<br/>Engagement-based]
        SimClusters[SimClusters<br/>Community-based]
        TwHINEmbed[TwHIN<br/>Knowledge Graph]
    end

    GraphJet --> Discovery
    Discovery --> Candidates[Out-of-Network<br/>Candidates]

    classDef graph fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef discovery fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class Users,Tweets graph
    class RealGraph,SimClusters,TwHINEmbed discovery
```

| Approach | Latency | Memory | Discovery Quality |
|----------|---------|--------|-------------------|
| **GraphJet (Chosen)** | <10ms | ~100GB | High (real engagement data) |
| Graph database queries | 50-100ms | Disk-based | High |
| Precomputed recommendations | <1ms | High | Medium (stale) |

**Decision:** GraphJet because:
- Sub-millisecond traversal required for timeline latency budget
- Bipartite user-tweet graph enables multiple discovery algorithms
- In-memory design fits within modern server memory
- Segmented storage allows focus on recent interactions

### Decision 5: Manhattan vs TAO

**Context:** Need distributed key-value storage for tweets and user data.

| Feature | Manhattan (Twitter) | TAO (Facebook) |
|---------|---------------------|----------------|
| Data Model | Key-Value | Objects + Associations |
| Consistency | Tunable | Strong per-shard |
| Caching | Integrated | Two-tier (Leader/Follower) |
| Use Case | General KV | Social graph optimized |
| Open Source | Partially | No |

**Decision:** Manhattan because:
- Simpler key-value model sufficient for tweets
- Tunable consistency supports different use cases
- Multi-tenant architecture for different data types
- Better fit for Twitter's existing infrastructure

---

## Caching Strategy

### Cache Hierarchy

```mermaid
flowchart TB
    subgraph Client["Layer 1: Client Cache"]
        AppCache[App Cache<br/>TTL: 30s]
    end

    subgraph CDN["Layer 2: CDN"]
        CDNCache[CDN Cache<br/>TTL: 24h for static]
    end

    subgraph Redis["Layer 3: Redis Timeline Cache"]
        TimelineCache[Timeline Cache<br/>TTL: 5 min]
        CelebrityIndex[Celebrity Index<br/>TTL: 24h]
        SessionCache[Session Cache<br/>TTL: 1h]
    end

    subgraph Manhattan["Layer 4: Manhattan Cache"]
        TweetCache[Tweet Object Cache<br/>TTL: 10 min]
        UserCache[User Profile Cache<br/>TTL: 10 min]
    end

    subgraph MySQL["Layer 5: MySQL"]
        Source[(Source of Truth)]
    end

    Client --> CDN --> Redis --> Manhattan --> MySQL

    classDef l1 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef l2 fill:#fff8e1,stroke:#ff8f00,stroke-width:2px
    classDef l3 fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef l4 fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef l5 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class AppCache l1
    class CDNCache l2
    class TimelineCache,CelebrityIndex,SessionCache l3
    class TweetCache,UserCache l4
    class Source l5
```

### Cache Configuration

| Cache Layer | TTL | Size | Hit Rate Target | Invalidation |
|-------------|-----|------|-----------------|--------------|
| Client App | 30 seconds | 10 MB | 20% | On refresh |
| CDN (static) | 24 hours | Distributed | 95% | Purge API |
| Timeline (Redis) | 5 minutes | 2.5 TB | 70% | On new tweet/follow |
| Celebrity Index | 24 hours | 3 GB | 90% | On new celebrity tweet |
| Tweet Object | 10 minutes | 500 GB | 90% | Write-through |
| User Profile | 10 minutes | 100 GB | 95% | Write-through |

### Cache Invalidation Strategy

```
TIMELINE CACHE INVALIDATION:

Trigger: New tweet from followed account
  1. Tweetypie publishes TweetCreated to Kafka
  2. Fanout Service consumes event
  3. For regular users: INSERT into follower timeline sorted sets
  4. For celebrities: INSERT into celebrity index only

Trigger: New follow relationship
  1. Social Graph Service publishes FollowCreated
  2. Timeline Service receives event
  3. Mark user's timeline cache as dirty
  4. Background job rebuilds timeline (or lazy on next read)

Trigger: Tweet deletion
  1. Tweetypie publishes TweetDeleted
  2. Fanout Service removes from all cached timelines
  3. Search Service removes from index
```

---

## Multi-Region Deployment

### Geographic Distribution

```mermaid
flowchart TB
    subgraph Global["Global Layer"]
        GeoDNS[GeoDNS<br/>Route by Location]
        GlobalLB[Global Load Balancer]
    end

    subgraph USEast["US-East (Primary)"]
        USELB[Regional LB]
        USEServices[Core Services]
        USEMySQL[(MySQL Primary)]
        USERedis[(Redis)]
    end

    subgraph USWest["US-West"]
        USWLB[Regional LB]
        USWServices[Core Services]
        USWMySQL[(MySQL Replica)]
        USWRedis[(Redis)]
    end

    subgraph EU["EU-West (GDPR)"]
        EULB[Regional LB]
        EUServices[Core Services]
        EUMySQL[(MySQL - EU Data)]
        EURedis[(Redis)]
    end

    subgraph APAC["APAC"]
        APACLB[Regional LB]
        APACServices[Core Services]
        APACMySQL[(MySQL Replica)]
        APACRedis[(Redis)]
    end

    GeoDNS --> GlobalLB
    GlobalLB --> USELB
    GlobalLB --> USWLB
    GlobalLB --> EULB
    GlobalLB --> APACLB

    USEMySQL -.->|"Async Replication"|USWMySQL
    USEMySQL -.->|"Async Replication"|APACMySQL

    Note1[EU data stays in EU<br/>for GDPR compliance]

    classDef global fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef region fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class GeoDNS,GlobalLB global
    class USELB,USEServices,USWLB,USWServices,EULB,EUServices,APACLB,APACServices region
    class USEMySQL,USWMySQL,EUMySQL,APACMySQL,USERedis,USWRedis,EURedis,APACRedis data
```

### Regional Responsibilities

| Region | Role | Data Residency | Traffic % |
|--------|------|----------------|-----------|
| US-East | Primary write region | Global (non-EU) | 35% |
| US-West | Read replica, failover | Global (non-EU) | 20% |
| EU-West | EU data primary | EU users only (GDPR) | 25% |
| APAC | Read replica | Global (non-EU) | 20% |

### Cross-Region Replication

```
REPLICATION STRATEGY:

Tweets:
  - Async replication from primary region
  - Lag tolerance: <30 seconds
  - Conflict resolution: Last-write-wins with timestamp

User Data:
  - EU users: Stays in EU region
  - Non-EU users: Primary in US-East, replicated async

Timeline Cache:
  - Region-local only
  - Rebuilt from source on cache miss
  - No cross-region replication

Search Index:
  - Region-local indices
  - Near-real-time replication from tweet store
```

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async Communication** | Hybrid | Sync for reads (latency), Async for fan-out (throughput) |
| **Event-driven vs Request-response** | Event-driven for writes | Kafka enables decoupling, replay, scaling |
| **Push vs Pull Model** | Hybrid (100K threshold) | Balance write amplification vs read latency |
| **Stateless vs Stateful Services** | Stateless | Horizontal scaling, easier failover |
| **Read-heavy vs Write-heavy Optimization** | Both | Write-heavy fan-out, Read-heavy timeline |
| **Real-time vs Batch Processing** | Real-time dominant | News/trends require freshness |
| **Edge vs Origin Processing** | Edge for static | CDN for media, origin for dynamic |
| **Monolith vs Microservices** | Microservices | Clear boundaries, independent scaling |
| **SQL vs NoSQL** | Polyglot | MySQL (relations), Manhattan (KV), Redis (cache), ES (search) |
| **Strong vs Eventual Consistency** | Eventual (mostly) | Timeline eventual, tweets strong per-shard |

---

## Technology Choices Summary

| Component | Technology | Justification |
|-----------|------------|---------------|
| Primary Language | Scala | Functional, concurrent, JVM ecosystem |
| ML Inference | Rust (Navi) | Performance-critical, memory-safe |
| RPC Framework | Finagle | Twitter-developed, high-concurrency |
| Event Streaming | Kafka | Durability, replay, high throughput |
| Stream Processing | Heron | Twitter-developed Storm successor |
| Timeline Cache | Redis | In-memory, sorted sets, pub/sub |
| KV Store | Manhattan | Multi-tenant, tunable consistency |
| Search Index | ElasticSearch | Full-text, real-time indexing |
| Graph Traversal | GraphJet | In-memory, sub-ms latency |
| Load Balancing | Custom (Finagle) | Service mesh integration |
