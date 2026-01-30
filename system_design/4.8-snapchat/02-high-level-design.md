# High-Level Design

## Overview

Snapchat's architecture has evolved from a monolithic Google App Engine application to a sophisticated **multicloud microservices platform** running across AWS and Google Cloud. This design prioritizes:

1. **Ephemeral-first storage** - Volatile memory for temporary content
2. **Camera-first UX** - Sub-6-second launch, real-time AR
3. **Scale** - 5.4B Snaps/day across 300+ microservices
4. **Cost optimization** - 65% reduction through multicloud strategy

---

## System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer"]
        direction LR
        iOS["iOS App<br/>(Swift)"]
        Android["Android App<br/>(Kotlin)"]
        Spectacles["Spectacles<br/>(SnapOS)"]
        Web["Web App"]
    end

    subgraph EdgeLayer["Edge / CDN Layer"]
        CDN["Global CDN<br/>(Media, Lenses)"]
        EdgeCompute["Edge Compute<br/>(AR Model Cache)"]
    end

    subgraph GatewayLayer["API Gateway Layer"]
        LB["Load Balancer"]
        APIGW["API Gateway"]
        AuthService["Auth Service<br/>(OAuth, Sessions)"]
        RateLimiter["Rate Limiter"]
    end

    subgraph ServiceMesh["Service Mesh (Envoy)"]
        direction TB
        Switchboard["Switchboard<br/>(Config Control)"]
        EnvoyProxy["Envoy Proxies<br/>(10M QPS)"]
    end

    subgraph CoreServices["Core Services"]
        MessagingService["Messaging Service<br/>(Snaps)"]
        StoriesService["Stories Service<br/>(24h TTL)"]
        ChatService["Chat Service<br/>(Real-time)"]
        MapService["Map Service<br/>(Location)"]
        LensService["Lens Service<br/>(AR Distribution)"]
        MediaService["Media Service<br/>(Upload/Transcode)"]
        FriendsService["Friends Service<br/>(Social Graph)"]
        NotificationService["Notification Service<br/>(Push)"]
    end

    subgraph MLServices["ML Services"]
        ARInference["AR Inference<br/>(On-device)"]
        ContentMod["Content Moderation<br/>(Server-side)"]
        Recommendations["Recommendations<br/>(Stories, Friends)"]
        FaceDetection["Face Detection<br/>(Landmark)"]
    end

    subgraph DataLayer["Data Layer"]
        subgraph Volatile["Ephemeral Storage"]
            VolatileMemory[("Volatile Memory<br/>(RAM Cluster)")]
        end
        subgraph Persistent["Persistent Storage"]
            DynamoDB[("DynamoDB<br/>(User Data)")]
            Cassandra[("Cassandra<br/>(Time-series)")]
            BlobStorage[("Blob Storage<br/>(Media)")]
        end
        subgraph Cache["Cache Layer"]
            Redis[("Redis<br/>(Session, Hot Data)")]
            LocalCache["Local Cache<br/>(Per Service)"]
        end
    end

    subgraph Infrastructure["Infrastructure Layer"]
        AWS["AWS<br/>(Primary)"]
        GCP["Google Cloud<br/>(Secondary)"]
        K8s["Kubernetes<br/>(Orchestration)"]
    end

    ClientLayer --> EdgeLayer
    EdgeLayer --> GatewayLayer
    GatewayLayer --> ServiceMesh
    ServiceMesh --> CoreServices
    CoreServices <--> MLServices
    CoreServices --> DataLayer
    DataLayer --> Infrastructure

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef mesh fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ml fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef infra fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class iOS,Android,Spectacles,Web client
    class CDN,EdgeCompute edge
    class LB,APIGW,AuthService,RateLimiter gateway
    class Switchboard,EnvoyProxy mesh
    class MessagingService,StoriesService,ChatService,MapService,LensService,MediaService,FriendsService,NotificationService service
    class ARInference,ContentMod,Recommendations,FaceDetection ml
    class VolatileMemory,DynamoDB,Cassandra,BlobStorage data
    class Redis,LocalCache cache
    class AWS,GCP,K8s infra
```

---

## Component Responsibilities

| Component | Responsibility | Scale |
|-----------|---------------|-------|
| **API Gateway** | Request routing, auth, rate limiting | 200K+ req/s |
| **Service Mesh (Envoy)** | Service-to-service communication | 10M QPS |
| **Switchboard** | Centralized service configuration | 300+ services |
| **Messaging Service** | Ephemeral Snap delivery and deletion | 62K Snaps/s |
| **Stories Service** | 24-hour content management | 1B Stories |
| **Chat Service** | Real-time text, voice, video | 50M concurrent |
| **Map Service** | Location tracking and sharing | 400M MAU |
| **Lens Service** | AR model distribution | 6B plays/day |
| **Media Service** | Upload, transcode, store | 31 GB/s upload |
| **Friends Service** | Social graph, discovery | 306M users |
| **Content Moderation** | Safety, abuse detection | All content |
| **AR Inference** | On-device ML processing | 60 FPS |

---

## Data Flow Diagrams

### 1. Ephemeral Snap Flow (Send → View → Delete)

```mermaid
sequenceDiagram
    autonumber
    participant Alice as Alice (Sender)
    participant Client as Snapchat App
    participant CDN as CDN
    participant Media as Media Service
    participant Msg as Messaging Service
    participant Volatile as Volatile Memory
    participant Push as Push Service
    participant Bob as Bob (Recipient)

    Alice->>Client: Capture Snap + Apply Lens
    Client->>Client: Compress & Encrypt (TLS)
    Client->>CDN: Upload encrypted media
    CDN->>Media: Store temporarily
    Media-->>Client: media_id

    Client->>Msg: Send Snap (media_id, recipient: Bob)
    Msg->>Msg: Validate sender/recipient
    Msg->>Volatile: Store Snap metadata + media_ref
    Msg->>Push: Notify Bob
    Msg-->>Client: Snap sent confirmation

    Push->>Bob: Push notification
    Bob->>Msg: Open Snap request
    Msg->>Volatile: Fetch Snap metadata
    Msg->>CDN: Get media URL (signed, time-limited)
    Msg-->>Bob: Snap content

    Bob->>Bob: View Snap (timer starts)
    Bob->>Msg: Snap viewed (ACK)

    Note over Msg,Volatile: All recipients viewed?
    Msg->>Volatile: Mark for deletion
    Msg->>Media: Delete media
    Media->>CDN: Purge from cache
    Volatile->>Volatile: Remove metadata

    Note over Msg: Snap fully deleted
```

### 2. Story Post Flow (Create → Distribute → Expire)

```mermaid
sequenceDiagram
    autonumber
    participant User as User
    participant Client as App
    participant Media as Media Service
    participant Stories as Stories Service
    participant CDN as CDN
    participant Cache as Redis Cache
    participant Friends as Friends Service
    participant Viewers as Viewers

    User->>Client: Create Story (photo/video + effects)
    Client->>Client: Compress media
    Client->>Media: Upload media
    Media->>Media: Transcode (multiple qualities)
    Media->>CDN: Distribute to edge
    Media-->>Client: media_url

    Client->>Stories: Post Story (media_url, privacy: friends)
    Stories->>Stories: Set expires_at = now + 24h
    Stories->>Cache: Add to user's story list
    Stories->>Friends: Get friend list
    Friends-->>Stories: friend_ids[]

    loop For each friend
        Stories->>Cache: Add to friend's story feed
    end
    Stories-->>Client: Story posted

    Note over Stories: 24 hours later...

    Stories->>Stories: Expiration worker triggers
    Stories->>Cache: Remove from all feeds
    Stories->>Media: Archive or delete
    Stories->>CDN: Invalidate cached content
```

### 3. AR Lens Application Flow

```mermaid
sequenceDiagram
    autonumber
    participant User as User
    participant Camera as Camera Module
    participant FaceTrack as Face Tracking
    participant LensEngine as Lens Engine
    participant SnapML as SnapML Runtime
    participant CDN as CDN (Model Cache)
    participant LensService as Lens Service

    User->>Camera: Open camera
    Camera->>FaceTrack: Start face detection

    loop Every frame (16ms for 60FPS)
        Camera->>FaceTrack: Frame input
        FaceTrack->>FaceTrack: Detect landmarks (68 points)
        FaceTrack-->>LensEngine: Face mesh data
    end

    User->>LensEngine: Select Lens

    alt Lens not cached
        LensEngine->>CDN: Fetch Lens bundle
        CDN-->>LensEngine: ML model + assets
        LensEngine->>LensEngine: Cache locally
    end

    LensEngine->>SnapML: Load model

    loop Real-time processing
        Camera->>LensEngine: Frame + face mesh
        LensEngine->>SnapML: Run inference
        SnapML-->>LensEngine: Effect output
        LensEngine->>LensEngine: Composite effect
        LensEngine-->>Camera: Rendered frame
    end

    User->>Camera: Capture
    Camera->>LensService: Log Lens usage (analytics)
```

### 4. Snap Map Location Update Flow

```mermaid
sequenceDiagram
    autonumber
    participant User as User
    participant App as Snapchat App
    participant Location as Location Service
    participant MapService as Map Service
    participant GeoIndex as Geospatial Index (H3)
    participant Cache as Redis
    participant Friends as Friends Service
    participant Viewer as Friend Viewing Map

    Note over User,App: User has location sharing enabled

    loop Every 15-60 seconds
        App->>Location: Get current location
        Location-->>App: (lat, lon, accuracy)
        App->>MapService: Update location
        MapService->>MapService: Validate & throttle
        MapService->>GeoIndex: Index by H3 cell
        MapService->>Cache: Update user location
    end

    Viewer->>MapService: Get friends' locations
    MapService->>Friends: Get friend list with permissions
    Friends-->>MapService: visible_friends[]
    MapService->>Cache: Batch get locations
    Cache-->>MapService: locations[]
    MapService->>MapService: Apply privacy filters
    MapService-->>Viewer: Friend locations on map

    Note over MapService: Generate heatmap for high-activity areas
    MapService->>GeoIndex: Aggregate location density
    GeoIndex-->>MapService: Heatmap data
    MapService->>CDN: Cache heatmap tiles
```

### 5. Media Upload & Processing Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client as App
    participant Gateway as API Gateway
    participant Upload as Upload Service
    participant Blob as Blob Storage
    participant Transcode as Transcoder
    participant CDN as CDN
    participant Moderation as Content Mod

    Client->>Client: Capture media
    Client->>Client: Client-side compression
    Client->>Gateway: POST /media/upload (chunked)
    Gateway->>Upload: Route to upload service

    loop Chunked upload
        Upload->>Blob: Write chunk
        Upload-->>Client: Chunk ACK
    end

    Upload->>Upload: Assemble chunks
    Upload->>Blob: Store original
    Blob-->>Upload: blob_id

    par Parallel processing
        Upload->>Transcode: Queue transcoding job
        Transcode->>Transcode: Generate qualities (480p, 720p, 1080p)
        Transcode->>Blob: Store variants
        Transcode->>CDN: Pre-warm popular edges
    and
        Upload->>Moderation: Queue for review
        Moderation->>Moderation: AI scan (CSAM, violence, spam)
        alt Content flagged
            Moderation->>Upload: Block content
        else Content safe
            Moderation->>Upload: Approve
        end
    end

    Upload-->>Client: media_id, cdn_url
```

---

## Key Architectural Decisions

### Decision 1: Multicloud (AWS + GCP) vs Single Cloud

| Factor | Multicloud (Chosen) | Single Cloud |
|--------|---------------------|--------------|
| **Cost** | 65% reduction via optimization | Volume discounts |
| **Vendor Lock-in** | None | High |
| **Complexity** | Higher (service mesh needed) | Lower |
| **Reliability** | Higher (multi-provider) | Single provider SLA |
| **Compliance** | Regional flexibility | Limited |

**Decision**: Multicloud with Envoy service mesh for abstraction.

**Rationale**: At Snapchat's scale, the 65% cost savings outweigh operational complexity. Service mesh (Envoy) abstracts cloud-specific details.

### Decision 2: Volatile Memory vs Database TTL for Ephemeral

| Factor | Volatile Memory (Chosen) | Database with TTL |
|--------|-------------------------|-------------------|
| **Deletion Guarantee** | Strong (RAM = gone) | Requires explicit deletion |
| **Backup Risk** | None (by design) | Backups might retain data |
| **Cost** | Higher (RAM expensive) | Lower |
| **Latency** | Sub-ms | Few ms |
| **Recovery** | None | Possible |

**Decision**: Volatile memory for ephemeral content.

**Rationale**: Snapchat's core promise is ephemeral content. Database TTL cannot guarantee deletion (backups, replicas). Volatile memory ensures content is truly gone.

### Decision 3: Server-Side Encryption vs End-to-End Encryption

| Factor | Server-Side (Chosen) | End-to-End |
|--------|---------------------|------------|
| **Content Moderation** | Full capability | Metadata only |
| **CSAM Detection** | Server-side AI | Client-side (controversial) |
| **Law Enforcement** | Can comply | Cannot provide content |
| **Deletion Guarantee** | Server-controlled | Client-dependent |
| **User Privacy** | Trust in Snapchat | Cryptographic guarantee |

**Decision**: Server-side encryption (TLS + at-rest).

**Rationale**: Snapchat prioritizes content moderation and guaranteed deletion over E2EE. The ephemeral model provides privacy through deletion, not encryption.

### Decision 4: On-Device AR vs Cloud AR

| Factor | On-Device (Chosen) | Cloud AR |
|--------|-------------------|----------|
| **Latency** | <16ms per frame | 50-200ms round-trip |
| **Frame Rate** | 60 FPS achievable | Not possible |
| **Privacy** | Data stays on device | Frames uploaded |
| **Model Size** | Limited by device | Unlimited |
| **Offline** | Works | Requires network |

**Decision**: On-device AR with SnapML.

**Rationale**: 60 FPS requires <16ms per frame. Network latency makes cloud AR impossible for real-time face tracking.

### Decision 5: Microservices (300+) vs Monolith

| Factor | Microservices (Chosen) | Monolith |
|--------|----------------------|----------|
| **Independent Scaling** | Yes | No |
| **Deployment** | Per-service | All-or-nothing |
| **Complexity** | High (service mesh) | Lower |
| **Team Autonomy** | High | Coordination required |
| **Debugging** | Distributed tracing | Simpler |

**Decision**: 300+ microservices with Envoy service mesh.

**Rationale**: AR, messaging, Map, and Stories have vastly different scaling patterns. Independent scaling is critical at Snapchat's scale.

---

## Technology Stack

```mermaid
flowchart LR
    subgraph Client["Client"]
        iOS["iOS<br/>Swift"]
        Android["Android<br/>Kotlin"]
        OnDeviceML["On-Device ML<br/>SnapML, CoreML, TFLite"]
    end

    subgraph Backend["Backend Services"]
        Go["Go<br/>(Primary)"]
        Java["Java<br/>(Legacy)"]
        Python["Python<br/>(ML Services)"]
    end

    subgraph Data["Data Stores"]
        DynamoDB["DynamoDB"]
        Cassandra["Cassandra"]
        Redis["Redis"]
        S3["Object Storage"]
    end

    subgraph Infra["Infrastructure"]
        K8s["Kubernetes"]
        Envoy["Envoy<br/>Service Mesh"]
        AWS["AWS"]
        GCP["Google Cloud"]
    end

    Client --> Backend
    Backend --> Data
    Data --> Infra

    classDef tech fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    class iOS,Android,OnDeviceML,Go,Java,Python,DynamoDB,Cassandra,Redis,S3,K8s,Envoy,AWS,GCP tech
```

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Mobile** | Swift (iOS), Kotlin (Android) | Native apps |
| **On-Device ML** | SnapML, Core ML, TensorFlow Lite | AR inference |
| **Real-Time** | WebSockets, gRPC | Chat, presence |
| **Backend** | Go (primary), Java, Python | Services |
| **Service Mesh** | Envoy | 10M QPS service-to-service |
| **Config** | Switchboard (internal) | Service configuration |
| **Orchestration** | Kubernetes | Container management |
| **User Data** | DynamoDB | Primary database |
| **Time-Series** | Cassandra | Location history, analytics |
| **Cache** | Redis | Hot data, sessions |
| **Blob** | S3/GCS | Media storage |
| **CDN** | Global CDN | Content delivery |
| **Cloud** | AWS (primary) + GCP | Infrastructure |

---

## Multi-Region Architecture

```mermaid
flowchart TB
    subgraph Global["Global Layer"]
        GlobalLB["Global Load Balancer"]
        GlobalCDN["Global CDN"]
    end

    subgraph USEast["US-East (Primary)"]
        USELB["Regional LB"]
        USEServices["Services Cluster"]
        USEData["DynamoDB + Cassandra"]
    end

    subgraph USWest["US-West"]
        USWLB["Regional LB"]
        USWServices["Services Cluster"]
        USWData["Read Replicas"]
    end

    subgraph EU["EU-West"]
        EULB["Regional LB"]
        EUServices["Services Cluster"]
        EUData["DynamoDB + Cassandra"]
    end

    subgraph APAC["APAC"]
        APACLB["Regional LB"]
        APACServices["Services Cluster"]
        APACData["Read Replicas"]
    end

    GlobalLB --> USELB
    GlobalLB --> USWLB
    GlobalLB --> EULB
    GlobalLB --> APACLB

    USELB --> USEServices --> USEData
    USWLB --> USWServices --> USWData
    EULB --> EUServices --> EUData
    APACLB --> APACServices --> APACData

    USEData <-.->|Async Replication| EUData
    USEData <-.->|Async Replication| USWData
    USEData <-.->|Async Replication| APACData

    classDef global fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef region fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class GlobalLB,GlobalCDN global
    class USELB,USEServices,USWLB,USWServices,EULB,EUServices,APACLB,APACServices region
    class USEData,USWData,EUData,APACData data
```

### Regional Strategy

| Region | Role | Data |
|--------|------|------|
| **US-East** | Primary write region | Full DynamoDB + Cassandra |
| **US-West** | Secondary, user affinity | Read replicas + local writes |
| **EU-West** | GDPR compliance, low latency | Full dataset (EU users) |
| **APAC** | Low latency for Asia | Read replicas + local writes |

### Cross-Region Replication

| Data Type | Replication | Consistency |
|-----------|-------------|-------------|
| **User Profiles** | Async, all regions | Eventual |
| **Ephemeral Snaps** | No replication | Region-local |
| **Stories** | CDN (edge cache) | TTL-based |
| **Location Data** | Region-local only | Strong (within region) |
| **Social Graph** | Async, all regions | Eventual |

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Both | Sync for reads, async for writes/deletion |
| **Event-driven vs Request-response** | Hybrid | Events for deletion, request for reads |
| **Push vs Pull** | Push (Snaps), Pull (Stories) | Real-time for messaging |
| **Stateless vs Stateful** | Stateless services | State in data stores |
| **Read-heavy vs Write-heavy** | Balanced (1:1.8) | Unlike typical social apps |
| **Real-time vs Batch** | Real-time | Ephemeral nature requires it |
| **Edge vs Origin** | Edge for AR models, CDN | Low latency critical |

---

## Service Communication Patterns

### Synchronous (gRPC/REST)

- User authentication
- Snap retrieval
- Friend list queries
- Real-time chat messages

### Asynchronous (Message Queue)

- Snap deletion processing
- Media transcoding
- Push notifications
- Analytics events
- Content moderation

### Event-Driven

- Snap viewed events → Trigger deletion
- Story posted → Fan-out to friends
- Location update → Map refresh
- Friend added → Notification

---

## Summary

Snapchat's architecture is distinguished by:

1. **Ephemeral-first design** - Volatile memory ensures deletion
2. **Camera as home screen** - On-device AR, <6s launch
3. **Multicloud** - AWS + GCP with 65% cost savings
4. **Service mesh** - 300+ microservices, 10M QPS
5. **Server-side moderation** - No E2EE, enables content safety
6. **Real-time at scale** - 5.4B Snaps/day, <100ms delivery
