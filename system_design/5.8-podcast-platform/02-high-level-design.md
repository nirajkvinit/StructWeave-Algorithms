# 02 - High-Level Design

## System Architecture

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
flowchart TB
    subgraph Clients["Client Layer"]
        direction LR
        MobileApp[Mobile App<br/>iOS / Android]
        WebApp[Web App<br/>SPA]
        SmartSpeaker[Smart Speaker<br/>Alexa / Google]
        CarPlay[CarPlay /<br/>Android Auto]
    end

    subgraph Edge["Edge & CDN"]
        LB[Load Balancer<br/>L7]
        CDN[Audio CDN<br/>Global PoPs]
        DAIS[DAI Stitching<br/>Servers]
    end

    subgraph Gateway["API Gateway"]
        AG[API Gateway<br/>Auth / Rate Limit / Routing]
    end

    subgraph CoreServices["Core Platform Services"]
        direction TB
        CatalogSvc[Catalog<br/>Service]
        SearchSvc[Search<br/>Service]
        RecoSvc[Recommendation<br/>Service]
        UserSvc[User<br/>Service]
        SubSvc[Subscription<br/>Service]
        PlaybackSvc[Playback Sync<br/>Service]
        AdSvc[Ad Decision<br/>Service]
        AnalyticsSvc[Analytics<br/>Service]
    end

    subgraph Ingestion["Ingestion Pipeline"]
        FeedCrawler[Feed Crawler<br/>Cluster]
        WebSubHub[WebSub / Podping<br/>Listener]
        FeedParser[Feed Parser<br/>& Normalizer]
        TranscodePipeline[Transcoding<br/>Pipeline]
        TranscriptionSvc[AI Transcription<br/>Service]
    end

    subgraph DataStores["Data Layer"]
        PrimaryDB[(Primary DB<br/>PostgreSQL)]
        SearchIdx[(Search Index<br/>Inverted + Vector)]
        CacheLayer[(Cache Layer<br/>Redis Cluster)]
        TimeSeries[(Time-Series DB<br/>Analytics)]
        GraphDB[(Graph Store<br/>Recommendations)]
    end

    subgraph Storage["Object Storage"]
        AudioStore[(Audio Object<br/>Storage)]
        TranscriptStore[(Transcript<br/>Storage)]
    end

    subgraph Async["Async Processing"]
        MQ[Message Queue<br/>/ Event Bus]
        Workers[Background<br/>Workers]
    end

    Clients --> LB --> AG
    Clients --> CDN
    Clients --> DAIS

    AG --> CatalogSvc & SearchSvc & RecoSvc
    AG --> UserSvc & SubSvc & PlaybackSvc
    AG --> AnalyticsSvc

    DAIS --> AdSvc
    DAIS --> CDN

    FeedCrawler --> FeedParser
    WebSubHub --> FeedParser
    FeedParser --> MQ
    MQ --> CatalogSvc
    MQ --> TranscodePipeline
    MQ --> TranscriptionSvc
    MQ --> Workers

    TranscodePipeline --> AudioStore
    TranscriptionSvc --> TranscriptStore
    AudioStore --> CDN

    CatalogSvc --> PrimaryDB
    SearchSvc --> SearchIdx
    RecoSvc --> GraphDB
    UserSvc --> PrimaryDB
    PlaybackSvc --> CacheLayer
    AnalyticsSvc --> TimeSeries
    CatalogSvc --> CacheLayer

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ingestion fill:#fce4ec,stroke:#c62828,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef storage fill:#e0f2f1,stroke:#004d40,stroke-width:2px
    classDef async fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class MobileApp,WebApp,SmartSpeaker,CarPlay client
    class LB,CDN,DAIS edge
    class AG gateway
    class CatalogSvc,SearchSvc,RecoSvc,UserSvc,SubSvc,PlaybackSvc,AdSvc,AnalyticsSvc service
    class FeedCrawler,WebSubHub,FeedParser,TranscodePipeline,TranscriptionSvc ingestion
    class PrimaryDB,SearchIdx,CacheLayer,TimeSeries,GraphDB data
    class AudioStore,TranscriptStore storage
    class MQ,Workers async
```

---

## Data Flow: Key Paths

### Path 1: New Episode Published (Write Path)

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
sequenceDiagram
    participant Host as Podcast Host
    participant Hub as WebSub Hub
    participant Crawler as Feed Crawler
    participant Parser as Feed Parser
    participant Queue as Message Queue
    participant Catalog as Catalog Service
    participant Transcode as Transcoding Pipeline
    participant AI as Transcription Service
    participant Store as Object Storage
    participant CDN as Audio CDN
    participant Push as Push Notification

    Host->>Hub: Notify: new episode published
    Hub->>Crawler: Push notification
    Note over Crawler: Or: adaptive polling detects change

    Crawler->>Host: GET RSS feed (If-None-Match / ETag)
    Host-->>Crawler: 200 OK (updated feed XML)

    Crawler->>Parser: Raw RSS XML
    Parser->>Parser: Validate, normalize, extract metadata
    Parser->>Queue: NewEpisodeEvent

    par Parallel Processing
        Queue->>Catalog: Update catalog metadata
        Catalog->>Catalog: Deduplicate, enrich
        and
        Queue->>Transcode: Transcode audio
        Transcode->>Store: Fetch original audio from host
        Transcode->>Transcode: MP3-128, AAC-64, Opus-48
        Transcode->>Store: Store transcoded variants
        Store->>CDN: Prefetch to edge PoPs
        and
        Queue->>AI: Generate transcript
        AI->>AI: Whisper ASR + diarization
        AI->>Store: Store transcript + chapters
        AI->>Catalog: Update search index
    end

    Catalog->>Push: Notify subscribers
    Push->>Push: Fan-out to subscribed users
```

### Path 2: Listener Streams Episode (Read Path)

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
sequenceDiagram
    participant App as Mobile App
    participant AG as API Gateway
    participant Catalog as Catalog Service
    participant Cache as Cache
    participant DAI as DAI Server
    participant AdSvc as Ad Decision Service
    participant CDN as Audio CDN
    participant Analytics as Analytics Service
    participant Playback as Playback Sync

    App->>AG: GET /episodes/{id}/play
    AG->>Catalog: Fetch episode metadata
    Catalog->>Cache: Check cache
    Cache-->>Catalog: Cache hit
    Catalog-->>AG: Episode metadata + audio URL

    AG-->>App: Episode manifest (DAI-enabled URL)

    App->>DAI: Request audio stream
    DAI->>AdSvc: Get ads for this user/episode
    AdSvc->>AdSvc: Targeting, frequency cap, bid
    AdSvc-->>DAI: Ad creatives + insertion points

    DAI->>CDN: Fetch episode audio segments
    CDN-->>DAI: Audio segments
    DAI->>DAI: Stitch ads into pre/mid/post positions
    DAI-->>App: Stitched audio stream

    loop Every 30 seconds during playback
        App->>Analytics: Playback event (position, duration)
        App->>Playback: Sync playback position
    end

    App->>Analytics: Episode completion event
    Analytics->>Analytics: IAB 2.2 processing
```

### Path 3: Episode Discovery (Search + Recommendation)

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
sequenceDiagram
    participant App as Mobile App
    participant AG as API Gateway
    participant Search as Search Service
    participant Reco as Recommendation Service
    participant Graph as Graph Store
    participant Cache as Cache
    participant Catalog as Catalog Service

    App->>AG: GET /discover?user_id=123

    par Parallel Fetch
        AG->>Reco: Get personalized recommendations
        Reco->>Graph: Traverse user-podcast graph
        Reco->>Cache: Get trending episodes
        Reco->>Reco: Blend collaborative + content-based
        Reco-->>AG: Ranked show/episode list
        and
        AG->>Catalog: Get new episodes from subscriptions
        Catalog->>Cache: Check subscription cache
        Catalog-->>AG: Subscription feed
    end

    AG-->>App: Discovery feed (reco + subscriptions + trending)

    Note over App: User searches for topic

    App->>AG: GET /search?q="machine learning"
    AG->>Search: Full-text + semantic search
    Search->>Search: Query inverted index + vector embeddings
    Search->>Search: Rank by relevance + popularity + freshness
    Search-->>AG: Search results (shows + episodes + transcript matches)
    AG-->>App: Search results
```

---

## Key Architectural Decisions

### 1. Monolith vs Microservices

**Decision: Microservices** with domain-oriented ownership.

| Justification | Detail |
|--------------|--------|
| Independent scaling | Feed ingestion scales differently from streaming |
| Team autonomy | Separate teams for ingestion, streaming, ads, ML |
| Failure isolation | Feed crawler outage shouldn't affect playback |
| Technology diversity | Graph DB for reco, time-series for analytics, search index for discovery |

### 2. Synchronous vs Asynchronous Communication

| Communication | Pattern | Where |
|---------------|---------|-------|
| Synchronous (gRPC) | Request-response | Client → API Gateway → Services |
| Asynchronous (events) | Event-driven | Feed ingestion → transcoding → indexing |
| Hybrid | Request + async processing | Playback → sync event fire-and-forget |

**Decision:** Event-driven for the ingestion pipeline (RSS → parse → transcode → index). Synchronous gRPC for real-time client-facing APIs. Fire-and-forget for analytics events.

### 3. Database Choices (Polyglot Persistence)

| Data | Store | Justification |
|------|-------|---------------|
| Podcast/Episode catalog | PostgreSQL (sharded) | Relational integrity, complex queries |
| User profiles & subscriptions | PostgreSQL | Transactional consistency |
| Playback positions | Redis Cluster | Low-latency read/write, ephemeral |
| Search index | Search engine (inverted + vector) | Full-text + semantic search |
| Recommendations graph | Graph database | Traversal for collaborative filtering |
| Analytics events | Time-series DB + data warehouse | High-write throughput, aggregations |
| Audio files | Object storage | Durable, cheap, CDN-integrated |
| Transcripts | Object storage + search index | Large text, searchable |

### 4. Caching Strategy

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Client      │    │  CDN Edge    │    │  Redis       │    │  Database    │
│  Cache       │ →  │  Cache       │ →  │  Cache       │ →  │  (Origin)    │
│  (episodes)  │    │  (audio)     │    │  (metadata)  │    │              │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
   L1: Device         L2: Edge           L3: App            L4: Persistent
   TTL: ∞ offline     TTL: 24h           TTL: 15 min        Source of truth
```

| Layer | What's Cached | TTL | Eviction |
|-------|---------------|-----|----------|
| L1 (Client) | Downloaded episodes, metadata | Until deleted | User-managed + auto-cleanup |
| L2 (CDN Edge) | Audio files, cover art | 24 hours | LRU per PoP |
| L3 (Redis) | Episode metadata, user subs, playback pos | 15 min (metadata), 24h (subs) | LRU |
| L4 (DB) | Full catalog, user data | Persistent | N/A |

### 5. Message Queue Usage

| Queue/Topic | Producer | Consumer | Purpose |
|-------------|----------|----------|---------|
| `feed.updated` | Feed Crawler | Feed Parser | Raw feed XML for parsing |
| `episode.new` | Feed Parser | Catalog, Transcoder, Transcription | Fan-out new episode processing |
| `episode.transcoded` | Transcoder | Catalog, CDN Prefetch | Audio ready for delivery |
| `playback.events` | Client SDK | Analytics Service | IAB 2.2 event processing |
| `ad.impressions` | DAI Server | Analytics, Billing | Ad delivery confirmation |
| `subscription.changed` | User Service | Notification, Feed Priority | Update feed polling priority |

### 6. RSS Ingestion: Poll vs Push

**Decision: Hybrid approach** — Push-first (WebSub/Podping) with adaptive polling fallback.

| Method | Coverage | Latency | Complexity |
|--------|----------|---------|------------|
| WebSub | ~30% of feeds | Real-time (seconds) | Medium (hub management) |
| Podping | ~15% of feeds (growing) | Near-real-time | Low (subscribe to bus) |
| Adaptive Polling | 100% of feeds | 2 min – 6 hours | High (scheduler) |

The adaptive polling interval is based on:
- **Update frequency** — Feeds that update daily get polled every 30 min; weekly feeds every 6 hours
- **Popularity** — Top 10K shows polled every 2-3 minutes
- **Last-Modified / ETag** — Skip full download if unchanged (HTTP 304)
- **WebSub registered** — Reduce polling for push-enabled feeds

---

## Architecture Pattern Checklist

- [x] **Sync vs Async:** Sync for client APIs, async for ingestion pipeline
- [x] **Event-driven vs Request-response:** Event-driven ingestion, request-response for streaming
- [x] **Push vs Pull:** Hybrid RSS ingestion (WebSub push + adaptive polling)
- [x] **Stateless vs Stateful:** All services stateless; state in Redis/DB
- [x] **Read-heavy optimization:** Multi-layer caching, CDN, read replicas
- [x] **Real-time vs Batch:** Real-time streaming + batch analytics aggregation
- [x] **Edge vs Origin:** Audio served from CDN edge; DAI at edge or regional PoPs

---

## Component Responsibilities

| Component | Responsibility | Scale Factor |
|-----------|---------------|--------------|
| **Feed Crawler** | Poll RSS feeds, detect changes, respect robots.txt | # of feeds × poll frequency |
| **Feed Parser** | Parse XML, normalize metadata, detect duplicates | # of feed updates/day |
| **Catalog Service** | Source of truth for shows/episodes, CRUD | # of episodes × read QPS |
| **Transcoding Pipeline** | Convert audio to multi-format (MP3, AAC, Opus) | # of new episodes/day |
| **Transcription Service** | Speech-to-text, chapter detection, keyword extraction | # of new episodes/day |
| **Search Service** | Inverted index + vector search for discovery | Search QPS |
| **Recommendation Service** | Graph-based collaborative + content-based filtering | DAU × page loads |
| **Playback Sync** | Cross-device position persistence | DAU × 3 syncs/session |
| **DAI Server** | Ad stitching into audio stream | Streaming QPS |
| **Ad Decision Service** | Targeting, bidding, frequency capping | Streaming QPS |
| **Analytics Service** | IAB 2.2 event processing, bot filtering | Events/day (500M+) |
| **Audio CDN** | Edge caching and delivery of audio files | Egress bandwidth |
