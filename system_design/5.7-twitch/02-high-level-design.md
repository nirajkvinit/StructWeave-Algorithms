# High-Level Design

## 1. System Architecture Diagram

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
flowchart TB
    subgraph Streamers["Streamer Layer"]
        S1["Streaming Software<br/>(OBS / Twitch Studio)"]
        S2["Enhanced Broadcasting<br/>(ERTMP Multi-Encode)"]
    end

    subgraph IngestLayer["Ingest Layer (~100 Global PoPs)"]
        MP["Intelligest<br/>Media Proxy"]
        IRS["Intelligest Routing<br/>Service (IRS)"]
        CAP["Capacitor<br/>(Compute Monitor)"]
        WELL["The Well<br/>(Network Monitor)"]
    end

    subgraph ProcessingLayer["Processing Layer (Origin Data Centers)"]
        TC["Custom Transcoder<br/>(RTMP → HLS)"]
        SEG["Segment Packager<br/>(HLS Segments + Manifest)"]
        CLIP["Clip Generator"]
        VOD["VOD Archiver"]
    end

    subgraph DistributionLayer["Distribution Layer (Replication Tree)"]
        MID["Mid-Tier Cache<br/>Nodes"]
        EDGE["Edge Cache<br/>Nodes"]
    end

    subgraph ChatLayer["Chat Infrastructure"]
        CE["Chat Edge<br/>(IRC / WebSocket)"]
        PS["PubSub Service<br/>(Internal Fanout)"]
        CLUE["Clue Service<br/>(Moderation / Rules)"]
        ROOM["Room Service<br/>(Channel State)"]
    end

    subgraph AppLayer["Application Services"]
        API["API Gateway<br/>(Helix API)"]
        AUTH["Auth Service<br/>(OAuth 2.0)"]
        DISC["Discovery Service<br/>(Browse / Search)"]
        REC["Recommendation<br/>Engine"]
        NOTIFY["Notification<br/>Service"]
    end

    subgraph CommerceLayer["Commerce Layer (40+ Microservices)"]
        SUB["Subscription<br/>Service"]
        BITS["Bits / Cheering<br/>Engine"]
        ADS["Ad Insertion<br/>Service"]
        PAY["Payment<br/>Orchestration"]
    end

    subgraph DataLayer["Data & Storage Layer"]
        PG[("PostgreSQL<br/>(Primary OLTP)")]
        REDIS[("Redis<br/>(Session / Cache)")]
        OS[("OpenSearch<br/>(Full-Text Search)")]
        S3[("Object Storage<br/>(VOD / Clips)")]
        KAFKA["Event Bus<br/>(Streaming Events)"]
        DL[("Data Lake<br/>(100+ PB)")]
    end

    subgraph ViewerLayer["Viewer Layer"]
        WEB["Web Player<br/>(React / TypeScript)"]
        MOB["Mobile App<br/>(iOS Swift / Android Kotlin)"]
        TV["Living Room<br/>(Smart TV / Console)"]
    end

    S1 -->|"RTMP"| MP
    S2 -->|"ERTMP<br/>(Multi-Track)"| MP
    MP -->|"Route Query"| IRS
    IRS --> CAP
    IRS --> WELL
    MP -->|"Canonical Protocol"| TC
    TC --> SEG
    TC --> VOD
    SEG --> MID
    MID --> EDGE
    SEG --> CLIP

    EDGE -->|"HLS Adaptive<br/>Bitrate"| WEB
    EDGE --> MOB
    EDGE --> TV

    WEB <-->|"WebSocket"| CE
    MOB <-->|"WebSocket"| CE
    CE <--> PS
    CE --> CLUE
    CLUE --> ROOM

    WEB --> API
    API --> AUTH
    API --> DISC
    API --> SUB
    API --> BITS
    DISC --> REC
    DISC --> OS

    SUB --> PAY
    BITS --> PAY
    ADS --> EDGE

    TC --> KAFKA
    PS --> KAFKA
    PAY --> KAFKA
    KAFKA --> DL

    SUB --> PG
    BITS --> PG
    ROOM --> REDIS
    DISC --> PG
    VOD --> S3
    CLIP --> S3

    NOTIFY --> MOB
    NOTIFY --> WEB

    classDef streamer fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef ingest fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef dist fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef chat fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef app fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef commerce fill:#fce4ec,stroke:#c62828,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef viewer fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class S1,S2 streamer
    class MP,IRS,CAP,WELL ingest
    class TC,SEG,CLIP,VOD process
    class MID,EDGE dist
    class CE,PS,CLUE,ROOM chat
    class API,AUTH,DISC,REC,NOTIFY app
    class SUB,BITS,ADS,PAY commerce
    class PG,REDIS,OS,S3,KAFKA,DL data
    class WEB,MOB,TV viewer
```

---

## 2. Data Flow

### 2.1 Live Video — Write Path (Streamer → Viewer)

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
sequenceDiagram
    participant Streamer as Streamer (OBS)
    participant PoP as PoP (Intelligest Proxy)
    participant IRS as Intelligest Routing Service
    participant Origin as Origin (Transcoder)
    participant RepTree as Replication Tree
    participant Edge as Edge Cache
    participant Viewer as Viewer Player

    Streamer->>PoP: 1. RTMP Connect (stream key auth)
    PoP->>IRS: 2. Route query (stream properties, codec, bitrate)
    IRS-->>PoP: 3. Assigned origin DC (randomized greedy)
    PoP->>Origin: 4. Forward stream (canonical protocol)

    loop Every 2 seconds
        Origin->>Origin: 5. Transcode → 5 HLS variants
        Origin->>RepTree: 6. Push HLS segments + manifest
        RepTree->>Edge: 7. Replicate based on demand
    end

    Viewer->>Edge: 8. Request HLS manifest
    Edge-->>Viewer: 9. Return manifest (quality options)
    loop Continuous playback
        Viewer->>Edge: 10. Fetch next segment
        Edge-->>Viewer: 11. Return segment (cache hit)
        Note over Edge,Viewer: ABR: Player switches quality<br/>based on bandwidth
    end
```

### 2.2 Chat — Message Flow

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
sequenceDiagram
    participant Sender as Viewer (Sender)
    participant ChatEdge as Chat Edge Node
    participant Clue as Clue (Moderation)
    participant PubSub as PubSub Cluster
    participant OtherEdge as Other Chat Edge Nodes
    participant Recipients as Viewers (Recipients)

    Sender->>ChatEdge: 1. IRC PRIVMSG (WebSocket)
    ChatEdge->>Clue: 2. Evaluate message rules
    Note over Clue: Check: banned? subscriber?<br/>spam? AutoMod filter?
    Clue-->>ChatEdge: 3. Allow / Deny / Hold

    alt Message Allowed
        ChatEdge->>PubSub: 4. Publish to channel topic
        PubSub->>OtherEdge: 5. Fan out to all Edge nodes<br/>with subscribers for this channel
        OtherEdge->>Recipients: 6. Deliver to connected viewers
        ChatEdge->>Sender: 7. Echo back (confirmation)
    else Message Denied
        ChatEdge->>Sender: 7b. Error / silent drop
    end
```

### 2.3 Enhanced Broadcasting — Multi-Encode Path

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
sequenceDiagram
    participant Streamer as Streamer (NVIDIA GPU)
    participant OBS as OBS Studio
    participant PoP as PoP (Intelligest)
    participant Origin as Origin DC

    Note over Streamer,OBS: NVENC encodes 3 variants<br/>simultaneously on GPU
    OBS->>OBS: Encode: 1080p60, 720p30, 480p30
    OBS->>PoP: ERTMP stream (3 video tracks in 1 connection)
    PoP->>Origin: Forward multi-track stream
    Note over Origin: Bypass transcoding!<br/>Only segment packaging needed
    Origin->>Origin: Package HLS segments per track
```

---

## 3. Key Architectural Decisions

### 3.1 Architecture Pattern Checklist

| Decision | Choice | Justification |
|----------|--------|---------------|
| **Sync vs Async** | Async (video pipeline), Sync (API) | Video is a continuous pipeline; user-facing APIs need immediate response |
| **Event-driven vs Request-response** | Event-driven (video, chat, commerce events) | Decouples producers/consumers; enables analytics pipeline |
| **Push vs Pull** | Push (chat), Pull (HLS segments) | Chat needs real-time push; HLS is client-pull by design |
| **Stateless vs Stateful** | Stateful (chat edges, ingest proxies), Stateless (API services) | Chat and ingest require persistent connections; API services scale horizontally |
| **Read-heavy vs Write-heavy** | Read-heavy (25:1 viewer:streamer) | CDN caching is critical; edge nodes serve cached segments |
| **Real-time vs Batch** | Real-time (video, chat), Batch (analytics, VOD processing) | Core experience is live; analytics can be delayed |
| **Edge vs Origin** | Edge-heavy (CDN), Origin for transcoding | Segments cached at edge; compute-intensive transcoding stays at origin |

### 3.2 Microservices vs Monolith

**Choice: Microservices** (evolved from Ruby on Rails monolith)

Twitch's original Rails monolith became untenable as the platform scaled. The migration to microservices was driven by:

1. **Independent scaling** — Chat, video, and commerce have vastly different scaling profiles
2. **Technology diversity** — Go for chat (concurrency), custom C/C++ for transcoder, TypeScript for frontend
3. **Team autonomy** — 8 engineering organizations with independent deployment cycles
4. **Fault isolation** — Chat outage shouldn't affect video delivery

### 3.3 Database Choices (Polyglot Persistence)

| Database | Use Case | Justification |
|----------|----------|---------------|
| **PostgreSQL** (~94% of DB hosts) | User profiles, subscriptions, channel metadata, payments | ACID compliance, mature ecosystem, strong consistency |
| **Redis** | Chat room state, session cache, hot segment cache, rate limiting | Sub-millisecond reads, pub/sub support, TTL for ephemeral data |
| **OpenSearch** | Stream/channel search, content discovery | Full-text search with ML-based ranking |
| **Object Storage** | VODs, clips, thumbnails, emotes | Cost-effective for large binary blobs; 11-nines durability |
| **Time-Series Store** | Video quality metrics, viewer analytics | Efficient for append-only time-stamped data |
| **Data Lake (Redshift + S3)** | Historical analytics, ML training | 100+ PB of data; columnar for OLAP workloads |

### 3.4 Caching Strategy

```
┌─────────────────────────────────────────────┐
│ L1: In-Process Cache (per service instance) │
│  - Stream metadata, user sessions           │
│  - TTL: 10-30 seconds                       │
├─────────────────────────────────────────────┤
│ L2: Distributed Cache (Redis Cluster)       │
│  - Chat room state, subscriber lists        │
│  - Viewer counts, emote metadata            │
│  - TTL: 1-5 minutes                         │
├─────────────────────────────────────────────┤
│ L3: Edge Cache (Replication Tree Nodes)     │
│  - HLS segments (2-second segments)         │
│  - Manifest files (very short TTL)          │
│  - TTL: segment duration (~2s for live)     │
├─────────────────────────────────────────────┤
│ L4: Client-Side Cache (Player Buffer)       │
│  - Pre-fetched segments (2-6 seconds ahead) │
│  - Adaptive bitrate history                 │
└─────────────────────────────────────────────┘
```

### 3.5 Message Queue / Event Bus Usage

| Queue/Topic | Producer | Consumer | Pattern |
|-------------|----------|----------|---------|
| `stream.go-live` | Ingest Service | Notification, Discovery, Analytics | Fan-out |
| `stream.offline` | Ingest Service | VOD Archiver, Cleanup | Fan-out |
| `chat.message` | Chat Edge | Analytics, Moderation ML | Streaming |
| `commerce.purchase` | Payment Service | Fulfillment, Ledger, Analytics | Exactly-once |
| `commerce.subscription` | Sub Service | Entitlement, Notification | Exactly-once |
| `video.segment` | Transcoder | Replication Tree, Clip Service | Streaming |
| `user.action` | All Services | Data Lake (3M events/s) | Streaming |

---

## 4. Technology Stack Summary

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend (Web)** | TypeScript, React (Twilight) | ~80 pages, ~140 monthly contributors |
| **Frontend (Mobile)** | Swift (iOS), Kotlin (Android) | Custom native UI libraries |
| **Frontend (TV)** | Starshot Platform | Samsung, LG, Nintendo Switch |
| **Backend Services** | Go (primary) | Migrated from Ruby; chosen for concurrency |
| **Video Transcoder** | Custom C/C++ | Purpose-built, not FFmpeg |
| **API** | REST (Helix API) | 25K+ third-party apps |
| **Chat Protocol** | IRC over WebSocket | Backward-compatible with IRC clients |
| **Event Streaming** | Event Bus (Kafka-like) | 3M events/second to data lake |
| **Primary Database** | PostgreSQL | ~125 DB hosts, 300K+ TPS on largest cluster |
| **Search** | OpenSearch | ML-based ranking since 2019 rebuild |
| **Caching** | Redis | Session, state, hot data |
| **Object Storage** | Cloud Object Storage | VODs, clips, assets |
| **Data Warehouse** | Redshift + S3 | 100+ self-serve clusters |
| **Infrastructure** | Cloud-hosted | 2,000+ cloud accounts |
