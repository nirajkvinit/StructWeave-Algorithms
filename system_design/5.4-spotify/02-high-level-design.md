# High-Level Design

## Architecture Overview

Spotify's architecture follows a microservices pattern running on Google Kubernetes Engine (GKE), with a multi-CDN strategy for audio delivery. The system is organized into distinct layers: client applications, CDN/edge layer, API gateway, core services, ML platform, data platform, and storage.

```mermaid
flowchart TB
    subgraph Clients["Client Applications"]
        direction LR
        iOS[iOS App<br/>AVPlayer]
        ANDROID[Android App<br/>ExoPlayer]
        DESKTOP[Desktop<br/>Electron/CEF]
        WEB[Web Player<br/>HTML5 Audio]
        DEVICES[Smart Devices<br/>Embedded SDK]
    end

    subgraph Edge["CDN & Edge Layer"]
        direction LR
        AKAMAI[Akamai<br/>Audio Primary]
        FASTLY[Fastly<br/>API Cache]
        GCP_CDN[GCP CDN<br/>Failover]
        LB[Cloud Load<br/>Balancer]
    end

    subgraph GKE["Google Kubernetes Engine"]
        subgraph Gateway["API Gateway Layer"]
            APIGW[API Gateway<br/>Rate Limiting]
            AUTH[Auth Service<br/>OAuth 2.0]
            CONNECT_GW[Connect Gateway<br/>Device Routing]
        end

        subgraph CoreServices["Core Services"]
            PLAYBACK[Playback<br/>Service]
            CATALOG[Catalog<br/>Service]
            PLAYLIST[Playlist<br/>Service]
            SEARCH[Search<br/>Service]
            USER[User<br/>Service]
            OFFLINE[Offline/DRM<br/>Service]
            CONNECT[Spotify Connect<br/>Service]
            SOCIAL[Social<br/>Service]
        end

        subgraph Content["Content Services"]
            PODCAST[Podcast<br/>Service]
            LYRICS[Lyrics<br/>Service]
            ARTIST[Artist<br/>Service]
        end

        subgraph MLPlatform["ML Platform"]
            BART[BaRT<br/>Recommendations]
            DISCOVER[Discover Weekly<br/>Generator]
            RADIO[Radio<br/>Generator]
            AUDIO_ML[Audio<br/>Analysis]
        end

        subgraph DataPlatform["Data Platform"]
            KAFKA[Apache Kafka<br/>Event Bus]
            FLINK[Apache Flink<br/>Stream Processing]
            BEAM[Apache Beam<br/>Batch/Stream]
            SCIO[Scio<br/>Data Pipelines]
        end
    end

    subgraph Storage["Storage Layer"]
        subgraph Operational["Operational Stores"]
            CASSANDRA[(Cassandra<br/>User/Playlist)]
            BIGTABLE[(Bigtable<br/>History)]
            POSTGRES[(Cloud SQL<br/>Metadata)]
            ELASTIC[(Elasticsearch<br/>Search Index)]
        end
        subgraph Analytics["Analytics Stores"]
            BIGQUERY[(BigQuery<br/>Data Warehouse)]
            GCS_ANALYTICS[(Cloud Storage<br/>Data Lake)]
        end
        subgraph Content["Content Storage"]
            GCS[(Cloud Storage<br/>Audio Files)]
        end
    end

    Clients --> Edge
    Edge --> Gateway
    Gateway --> CoreServices
    Gateway --> Content
    CoreServices --> MLPlatform
    CoreServices --> Operational
    MLPlatform --> Analytics
    DataPlatform --> Analytics
    Content --> Content

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef cdn fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef core fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ml fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef data fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class iOS,ANDROID,DESKTOP,WEB,DEVICES client
    class AKAMAI,FASTLY,GCP_CDN,LB cdn
    class APIGW,AUTH,CONNECT_GW gateway
    class PLAYBACK,CATALOG,PLAYLIST,SEARCH,USER,OFFLINE,CONNECT,SOCIAL core
    class PODCAST,LYRICS,ARTIST core
    class BART,DISCOVER,RADIO,AUDIO_ML ml
    class KAFKA,FLINK,BEAM,SCIO data
    class CASSANDRA,BIGTABLE,POSTGRES,ELASTIC,BIGQUERY,GCS_ANALYTICS,GCS storage
```

---

## Key Architectural Decisions

### 1. Multi-CDN vs Own CDN

| Aspect | Multi-CDN (Spotify) | Own CDN (Netflix) |
|--------|---------------------|-------------------|
| Traffic Volume | ~12 Tbps peak | ~400 Tbps peak |
| % of Internet | <1% | ~15% |
| File Sizes | 4 MB avg (songs) | 2-10 GB (movies) |
| Investment | Operational expense | Capital expense |
| Control | Limited, vendor-dependent | Full control |
| Flexibility | Easy vendor switching | ISP negotiations needed |

**Decision: Multi-CDN**
- Audio files are small enough that CDN costs are manageable
- Lower traffic volume doesn't justify building own infrastructure
- Multiple CDNs provide geographic coverage and redundancy
- Focus engineering resources on core product (recommendations, playlists)

### 2. GCP Migration (2016-2017)

| Before (On-Premise) | After (GCP) |
|---------------------|-------------|
| Own data centers (London, Stockholm) | Google Cloud regions |
| Helios (custom orchestration) | Google Kubernetes Engine |
| Custom data pipelines | BigQuery, Dataflow |
| PostgreSQL | Cloud Bigtable + Cassandra |

**Benefits Realized:**
- 100% infrastructure managed by Google
- BigQuery for ML training data
- Auto-scaling with GKE
- Global low-latency with Cloud CDN backup

### 3. Microservices Architecture

| Characteristic | Spotify Approach |
|----------------|------------------|
| Service Count | 200+ microservices |
| Languages | Java (primary), Scala, Node.js, Python |
| Framework | Spring Boot for Java services |
| Communication | Sync (gRPC, HTTP) + Async (Kafka) |
| Discovery | Consul / GKE native service discovery |
| Developer Portal | Backstage (open-sourced) |

### 4. Database Selection

| Use Case | Database | Justification |
|----------|----------|---------------|
| User Data | Cassandra | High write throughput, eventual consistency |
| Playlists | Cassandra | Scalable, partition by playlist_id |
| Listening History | Bigtable | Time-series optimized, high volume |
| Metadata | Cloud SQL (PostgreSQL) | Relational integrity, complex queries |
| Search | Elasticsearch | Full-text search, fuzzy matching |
| Analytics | BigQuery | Serverless, ML integration |

---

## Data Flow Diagrams

### Audio Playback Flow

```mermaid
sequenceDiagram
    participant C as Client App
    participant G as API Gateway
    participant P as Playback Service
    participant DRM as DRM Service
    participant CAT as Catalog Service
    participant CDN as CDN (Akamai/Fastly)
    participant GCS as Cloud Storage

    C->>G: POST /v1/me/player/play {track_id}
    G->>G: Validate auth token
    G->>P: Forward request

    P->>CAT: Get track metadata
    CAT-->>P: {duration, artists, album, file_ids}

    P->>P: Check subscription tier
    P->>P: Select quality tier based on subscription

    P->>DRM: Get stream token
    DRM->>DRM: Generate time-limited token
    DRM-->>P: {token, expires_in: 3600}

    P->>P: Select optimal CDN (latency, capacity)
    P-->>C: {stream_urls[], file_id, token, metadata}

    Note over C: Client starts streaming

    loop Audio Chunks (320kbps = 40KB/sec)
        C->>CDN: GET /audio/{file_id}/chunk?token=xxx
        alt Cache Hit (95% of requests)
            CDN-->>C: Audio chunk (10-30KB)
        else Cache Miss
            CDN->>GCS: GET /audio/{file_id}
            GCS-->>CDN: Full audio file
            CDN->>CDN: Cache file
            CDN-->>C: Audio chunk
        end
    end

    Note over C: Track completes or skips

    C->>G: POST /v1/me/player/events
    Note right of G: {event: "track_end", position_ms, skip: false}
```

### Offline Download Flow

```mermaid
sequenceDiagram
    participant C as Client App
    participant G as API Gateway
    participant O as Offline Service
    participant DRM as DRM Service
    participant U as User Service
    participant CDN as CDN
    participant DB as Cassandra

    C->>G: POST /v1/me/offline/tracks {track_ids[], device_id}
    G->>O: Forward request

    O->>U: Validate subscription (Premium required)
    U-->>O: {tier: "premium", valid: true}

    O->>O: Check offline limits
    Note right of O: Max 10,000 tracks per device<br/>Max 5 devices per account

    O->>DB: Get current offline manifest
    DB-->>O: {device_id -> [existing_tracks]}

    O->>O: Calculate delta (new tracks needed)

    loop For each new track
        O->>DRM: Generate device-bound key
        DRM->>DRM: Create AES-256 key
        DRM->>DRM: Bind to device hardware ID
        DRM->>DRM: Set 30-day expiry
        DRM-->>O: {encrypted_key, key_id, expires_at}
    end

    O->>DB: Store offline manifest
    O-->>C: {downloads: [{track_id, url, key, expires}]}

    par Parallel Downloads (max 3 concurrent)
        C->>CDN: GET /audio/{track_1}
        CDN-->>C: Encrypted audio file
        C->>C: Re-encrypt with device key
        C->>C: Store in secure storage
    and
        C->>CDN: GET /audio/{track_2}
        CDN-->>C: Encrypted audio file
        C->>C: Re-encrypt with device key
    end

    C->>G: POST /v1/me/offline/confirm {downloaded_tracks[]}
    G->>O: Update manifest
    O->>DB: Mark tracks as downloaded

    Note over C: Every 30 days
    C->>G: POST /v1/me/offline/refresh
    Note right of G: Re-authenticate to extend keys
```

### Playlist Sync Flow (Collaborative)

```mermaid
sequenceDiagram
    participant C1 as User 1 (Phone)
    participant C2 as User 2 (Desktop)
    participant G as API Gateway
    participant PS as Playlist Service
    participant CRDT as CRDT Engine
    participant RT as Real-time Service
    participant DB as Cassandra

    Note over C1,C2: Both users editing same playlist

    C1->>G: POST /v1/playlists/{id}/tracks<br/>{uri: "spotify:track:A", position: 0}
    G->>PS: Add track

    par Concurrent edit
        C2->>G: POST /v1/playlists/{id}/tracks<br/>{uri: "spotify:track:B", position: 0}
        G->>PS: Add track
    end

    PS->>CRDT: Apply operation (User 1)
    CRDT->>CRDT: Generate operation ID<br/>(user_id, lamport_clock)
    CRDT->>DB: Write operation

    PS->>CRDT: Apply operation (User 2)
    CRDT->>CRDT: Generate operation ID
    CRDT->>CRDT: Merge concurrent operations
    Note right of CRDT: Both tracks kept<br/>Order: A at 0, B at 1<br/>(earlier timestamp wins position)
    CRDT->>DB: Write merged state

    PS-->>C1: {snapshot_id: "v3", tracks: [A, B, ...]}
    PS-->>C2: {snapshot_id: "v3", tracks: [A, B, ...]}

    PS->>RT: Broadcast update
    RT-->>C1: WebSocket: playlist_updated
    RT-->>C2: WebSocket: playlist_updated

    Note over C1,C2: Both clients now have consistent view
```

### Spotify Connect Flow

```mermaid
sequenceDiagram
    participant PHONE as Phone App
    participant G as API Gateway
    participant CONN as Connect Service
    participant STATE as State Store
    participant SPEAKER as Smart Speaker

    Note over PHONE,SPEAKER: User wants to transfer playback

    PHONE->>G: GET /v1/me/player/devices
    G->>CONN: List active devices
    CONN->>STATE: Get user's device registry
    STATE-->>CONN: [{phone, speaker, laptop}]
    CONN-->>PHONE: Available devices

    PHONE->>G: PUT /v1/me/player<br/>{device_id: "speaker_123"}
    G->>CONN: Transfer playback

    CONN->>STATE: Get current playback state
    STATE-->>CONN: {track, position_ms, queue}

    CONN->>SPEAKER: Push playback command
    Note right of SPEAKER: Via persistent WebSocket

    SPEAKER-->>CONN: ACK (ready to play)
    CONN->>PHONE: Pause playback
    PHONE-->>CONN: Paused

    CONN->>SPEAKER: Play from position
    SPEAKER->>SPEAKER: Start playback

    CONN->>STATE: Update active device
    CONN-->>PHONE: Transfer complete

    Note over PHONE: Now shows remote control UI

    PHONE->>G: POST /v1/me/player/next
    G->>CONN: Skip track
    CONN->>SPEAKER: Play next track
```

### Home Feed Generation Flow

```mermaid
sequenceDiagram
    participant C as Client App
    participant G as API Gateway
    participant HOME as Home Service
    participant REC as BaRT Recommendations
    participant CAT as Catalog Service
    participant CACHE as Redis Cache
    participant DB as Cassandra

    C->>G: GET /v1/me/home
    G->>HOME: Get personalized feed

    HOME->>CACHE: Check pre-computed feed
    alt Cache Hit
        CACHE-->>HOME: Cached feed (TTL: 1 hour)
    else Cache Miss
        HOME->>REC: Get recommendations
        REC->>DB: Get user features
        DB-->>REC: Listening history, preferences

        REC->>REC: BaRT scoring
        Note right of REC: Candidate generation (10K)<br/>Scoring (1K)<br/>Diversification (50)

        REC-->>HOME: Recommendation sections

        HOME->>CAT: Enrich with metadata
        CAT-->>HOME: Track/artist/album details

        HOME->>CACHE: Cache result (TTL: 1 hour)
    end

    HOME-->>C: {sections: [Discover Weekly, Made For You, Recently Played, ...]}
```

---

## Component Responsibilities

### Core Services

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CORE SERVICES                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PLAYBACK SERVICE                    PLAYLIST SERVICE                    │
│  ─────────────────                   ─────────────────                   │
│  • Stream URL generation             • CRUD operations                   │
│  • Quality tier selection            • Collaborative editing (CRDT)      │
│  • DRM token orchestration           • Version history                   │
│  • CDN routing                       • Share/follow management           │
│  • Playback state management         • Import/export                     │
│                                                                          │
│  CATALOG SERVICE                     OFFLINE SERVICE                     │
│  ───────────────                     ───────────────                     │
│  • Track/album/artist metadata       • Download orchestration            │
│  • Content availability              • DRM key management                │
│  • Rights management                 • Device manifest tracking          │
│  • New release indexing              • Sync status                       │
│                                      • 30-day re-authentication          │
│                                                                          │
│  SEARCH SERVICE                      USER SERVICE                        │
│  ──────────────                      ────────────                        │
│  • Full-text search                  • Profile management                │
│  • Autocomplete                      • Subscription status               │
│  • Fuzzy matching                    • Preferences/settings              │
│  • Search ranking                    • Library (saved items)             │
│  • Recent searches                   • Privacy controls                  │
│                                                                          │
│  CONNECT SERVICE                     SOCIAL SERVICE                      │
│  ───────────────                     ──────────────                      │
│  • Device discovery                  • Friend activity                   │
│  • Playback transfer                 • Following/followers               │
│  • Multi-room sync                   • Collaborative invites             │
│  • Remote control                    • Share generation                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### ML Platform

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            ML PLATFORM                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  BaRT (BANDITS FOR RECOMMENDATIONS AS TREATMENTS)                        │
│  ───────────────────────────────────────────────                         │
│  • Multi-armed bandit framework for personalization                      │
│  • Explores new content while exploiting known preferences               │
│  • Real-time feature serving (user, track, context)                      │
│  • A/B testing infrastructure for recommendation strategies              │
│                                                                          │
│  DISCOVER WEEKLY GENERATOR                                               │
│  ─────────────────────────                                               │
│  • Weekly batch pipeline (Monday morning)                                │
│  • Collaborative filtering + content-based hybrid                        │
│  • Diversity constraints (genre, artist variety)                         │
│  • Freshness optimization (new-to-user tracks)                           │
│                                                                          │
│  AUDIO ANALYSIS                                                          │
│  ──────────────                                                          │
│  • Tempo, key, mode detection                                            │
│  • Energy, danceability, valence scoring                                 │
│  • Genre classification                                                  │
│  • Audio fingerprinting                                                  │
│                                                                          │
│  PODCAST RECOMMENDATIONS                                                 │
│  ───────────────────────                                                 │
│  • Episode-level recommendations                                         │
│  • Topic modeling from transcripts                                       │
│  • Listening pattern analysis (skip, complete)                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Patterns Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| Sync vs Async | Hybrid | Sync for playback (latency), Async for analytics (volume) |
| Event-driven vs Request-response | Hybrid | Request-response for APIs, Event-driven for data pipelines |
| Push vs Pull | Push | Real-time updates via WebSocket for Connect/Collab |
| Stateless vs Stateful | Mostly Stateless | State in databases, services are stateless |
| Read-heavy vs Write-heavy | Read-heavy | Optimize for streaming, secondary writes for events |
| Real-time vs Batch | Hybrid | Real-time for playback, Batch for recommendations |
| Edge vs Origin | Edge-heavy | CDN caches 95%+ of audio requests |

---

## CDN Strategy Deep Dive

### Multi-CDN Architecture

```mermaid
flowchart TB
    subgraph Clients["Global Clients"]
        US[US Users]
        EU[EU Users]
        ASIA[Asia Users]
        LATAM[LatAm Users]
    end

    subgraph CDNLayer["CDN Layer"]
        subgraph Primary["Primary CDN (Akamai)"]
            AKAMAI_US[US PoPs]
            AKAMAI_EU[EU PoPs]
            AKAMAI_ASIA[Asia PoPs]
        end
        subgraph Secondary["Secondary CDN (Fastly)"]
            FASTLY_US[US Edge]
            FASTLY_EU[EU Edge]
        end
        subgraph Backup["Backup CDN (GCP)"]
            GCP_CDN[Global Edge]
        end
    end

    subgraph Origin["Origin (GCS)"]
        GCS_US[us-central1]
        GCS_EU[europe-west1]
        GCS_ASIA[asia-east1]
    end

    US --> AKAMAI_US
    EU --> AKAMAI_EU
    ASIA --> AKAMAI_ASIA
    LATAM --> FASTLY_US

    AKAMAI_US -.->|Cache Miss| GCS_US
    AKAMAI_EU -.->|Cache Miss| GCS_EU
    AKAMAI_ASIA -.->|Cache Miss| GCS_ASIA

    US -.->|Failover| FASTLY_US
    EU -.->|Failover| FASTLY_EU
    US -.->|Failover| GCP_CDN

    classDef cdn fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef origin fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class AKAMAI_US,AKAMAI_EU,AKAMAI_ASIA,FASTLY_US,FASTLY_EU,GCP_CDN cdn
    class GCS_US,GCS_EU,GCS_ASIA origin
```

### CDN Selection Logic

```
ALGORITHM: CDN Selection

INPUT: user_location, track_popularity, current_cdn_health

1. Get CDN latency estimates for user region
2. Check CDN health status (real-time monitoring)
3. Consider track popularity (popular = cached everywhere)

IF cdn_akamai.latency < 50ms AND cdn_akamai.healthy:
    RETURN akamai

ELSE IF cdn_fastly.latency < 50ms AND cdn_fastly.healthy:
    RETURN fastly

ELSE:
    RETURN gcp_cdn  // Fallback
```

---

## Technology Stack Summary

| Layer | Component | Technology |
|-------|-----------|------------|
| **Client** | iOS | Swift, AVPlayer |
| **Client** | Android | Kotlin, ExoPlayer |
| **Client** | Desktop | Electron/CEF, C++ |
| **Client** | Web | React, HTML5 Audio API |
| **CDN** | Primary | Akamai |
| **CDN** | Secondary | Fastly |
| **CDN** | Backup | GCP Cloud CDN |
| **Load Balancer** | | GCP Cloud Load Balancing |
| **Container** | Orchestration | Google Kubernetes Engine |
| **Service Mesh** | | Envoy (emerging) |
| **Backend** | Primary | Java 17+, Spring Boot |
| **Backend** | Secondary | Scala, Node.js |
| **API** | Style | REST (public), gRPC (internal) |
| **Message Queue** | | Apache Kafka |
| **Stream Processing** | | Apache Flink, Beam |
| **User Data** | | Apache Cassandra |
| **Time-Series** | | Google Cloud Bigtable |
| **Relational** | | Cloud SQL (PostgreSQL) |
| **Search** | | Elasticsearch |
| **Cache** | | Redis, Memcached |
| **Audio Storage** | | Google Cloud Storage |
| **Analytics** | | BigQuery |
| **ML Training** | | TensorFlow, PyTorch |
| **ML Serving** | | Custom (BaRT) |
| **Monitoring** | | Prometheus, Grafana |
| **Logging** | | Cloud Logging, Fluentd |
| **Developer Portal** | | Backstage |
