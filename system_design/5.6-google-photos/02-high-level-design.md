# Google Photos — High-Level Design

## System Architecture

```mermaid
---
config:
  look: neo
  theme: base
  themeVariables:
    primaryColor: '#4a90d9'
    fontFamily: 'Inter, system-ui, sans-serif'
---
flowchart TB
    subgraph Clients["Client Layer"]
        direction LR
        ANDROID[Android App<br/>Camera Backup]
        IOS[iOS App<br/>Camera Backup]
        WEB[Web App<br/>photos.google.com]
        API_3P[Photos API<br/>Third-party Apps]
    end

    subgraph EdgeLayer["Edge & Ingress"]
        GFE[Google Front End<br/>TLS Termination]
        CDN[Google CDN<br/>Edge PoPs]
        GSLB[Global Server<br/>Load Balancing]
    end

    subgraph GatewayLayer["Gateway & Auth"]
        APIGW[API Gateway<br/>Routing & Versioning]
        OAUTH[OAuth 2.0<br/>Authorization]
        QUOTA_SVC[Quota Service<br/>Storage Limits]
        RATELIMIT[Rate Limiter<br/>Per-user / Per-IP]
    end

    subgraph CoreServices["Core Services"]
        UPLOAD_SVC[Upload Service<br/>Chunked / Resumable]
        MEDIA_SVC[Media Item Service<br/>CRUD Operations]
        ALBUM_SVC[Album Service<br/>Organization]
        SHARE_SVC[Sharing Service<br/>Access Control]
        SYNC_SVC[Sync Service<br/>Device Sync Tokens]
        SEARCH_SVC[Search Service<br/>Query Processing]
        MEMORIES_SVC[Memories Service<br/>Auto-Curation]
        TRASH_SVC[Trash Service<br/>Soft Delete / TTL]
    end

    subgraph MediaPipeline["Media Processing Pipeline"]
        direction LR
        EXIF[EXIF / Metadata<br/>Extraction]
        THUMB[Thumbnail<br/>Generation]
        TRANSCODE[Format Conversion<br/>WebP / HEIC]
        QUALITY[Quality Tier<br/>Processing]
        VIDEO_PROC[Video<br/>Transcoding]
    end

    subgraph MLPipeline["ML Processing Pipeline"]
        direction LR
        CLASSIFY[Image<br/>Classification]
        DETECT[Object<br/>Detection]
        FACE_DETECT[Face<br/>Detection]
        FACE_EMBED[Face<br/>Embedding]
        OCR[OCR / Text<br/>Detection]
        SCENE[Scene<br/>Understanding]
        EMBED_GEN[Visual Embedding<br/>Generation]
    end

    subgraph MLServices["ML Services"]
        FACE_CLUSTER[Face Clustering<br/>Service]
        SEARCH_INDEX[Search Index<br/>Builder]
        GENAI_SVC[Generative AI<br/>Magic Eraser / Reimagine]
        MEMORY_ML[Memory Curation<br/>ML]
    end

    subgraph EventBus["Event Bus"]
        PUBSUB[Pub/Sub<br/>Event Streaming]
    end

    subgraph StorageLayer["Storage Layer"]
        subgraph BlobStore["Blob Storage"]
            COLOSSUS[(Colossus / GFS<br/>Original Files)]
            THUMB_STORE[(Thumbnail<br/>Store)]
            SERVING_STORE[(Serving Copies<br/>WebP / Compressed)]
        end
        subgraph MetadataStore["Metadata Storage"]
            SPANNER[(Spanner<br/>Media Metadata<br/>Albums, Sharing)]
            BIGTABLE_ML[(Bigtable<br/>ML Features<br/>Embeddings)]
        end
        subgraph CacheLayer["Cache Layer"]
            MEMCACHE[Memcache<br/>Hot Metadata]
            THUMB_CACHE[Thumbnail Cache<br/>Edge + Origin]
        end
        subgraph SearchStore["Search Infrastructure"]
            INVERTED_IDX[(Inverted Index<br/>Labels / Tags)]
            VECTOR_IDX[(Vector Index<br/>Visual Embeddings)]
        end
    end

    Clients --> EdgeLayer
    EdgeLayer --> GatewayLayer
    GatewayLayer --> CoreServices

    UPLOAD_SVC -->|"Upload Event"| PUBSUB
    PUBSUB -->|"Process Media"| MediaPipeline
    PUBSUB -->|"Run ML Models"| MLPipeline

    MediaPipeline --> BlobStore
    MLPipeline --> MLServices
    MLServices --> MetadataStore
    MLServices --> SearchStore

    MEDIA_SVC --> MetadataStore
    MEDIA_SVC --> CacheLayer
    SEARCH_SVC --> SearchStore
    SEARCH_SVC --> CacheLayer

    CDN --> THUMB_STORE
    CDN --> SERVING_STORE

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef core fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef pipeline fill:#f1f8e9,stroke:#558b2f,stroke-width:2px
    classDef ml fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef mlsvc fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef search fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    classDef event fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class ANDROID,IOS,WEB,API_3P client
    class GFE,CDN,GSLB edge
    class APIGW,OAUTH,QUOTA_SVC,RATELIMIT gateway
    class UPLOAD_SVC,MEDIA_SVC,ALBUM_SVC,SHARE_SVC,SYNC_SVC,SEARCH_SVC,MEMORIES_SVC,TRASH_SVC core
    class EXIF,THUMB,TRANSCODE,QUALITY,VIDEO_PROC pipeline
    class CLASSIFY,DETECT,FACE_DETECT,FACE_EMBED,OCR,SCENE,EMBED_GEN ml
    class FACE_CLUSTER,SEARCH_INDEX,GENAI_SVC,MEMORY_ML mlsvc
    class COLOSSUS,THUMB_STORE,SERVING_STORE,SPANNER,BIGTABLE_ML storage
    class MEMCACHE,THUMB_CACHE cache
    class INVERTED_IDX,VECTOR_IDX search
    class PUBSUB event
```

---

## Data Flow: Upload Path

```mermaid
---
config:
  look: neo
  theme: base
---
sequenceDiagram
    participant C as Client App
    participant GFE as Google Front End
    participant US as Upload Service
    participant CS as Colossus<br/>(Blob Store)
    participant SP as Spanner<br/>(Metadata)
    participant PS as Pub/Sub
    participant MP as Media Pipeline
    participant ML as ML Pipeline
    participant SI as Search Index
    participant FC as Face Cluster

    Note over C,FC: Phase 1: Upload & Store

    C->>GFE: POST /upload (chunked, resumable)
    GFE->>US: Route to nearest datacenter

    alt Resumable Upload
        US->>CS: Check for existing upload session
        CS-->>US: Session state (bytes received)
        US-->>C: Resume from byte offset
    end

    C->>US: Send file chunks (1-8 MB each)
    US->>US: Hash each chunk (SHA-256)
    US->>CS: Write chunks to Colossus
    CS-->>US: Chunk ACK

    Note over US: All chunks received, verify integrity

    US->>US: Verify full file hash
    US->>CS: Finalize blob (atomic commit)
    US->>SP: Write media item metadata
    SP-->>US: Metadata committed (globally consistent)
    US-->>C: 200 OK {mediaItemId, uploadToken}

    Note over C,FC: Phase 2: Async Processing

    US->>PS: Emit "MediaUploaded" event

    par Media Processing
        PS->>MP: Trigger media pipeline
        MP->>CS: Read original blob
        MP->>MP: Extract EXIF metadata
        MP->>MP: Generate thumbnails (256px, 512px, 1024px)
        MP->>MP: Create WebP serving copy
        MP->>CS: Write thumbnails + serving copies
        MP->>SP: Update metadata (dimensions, GPS, camera, etc.)
    and ML Processing
        PS->>ML: Trigger ML pipeline
        ML->>CS: Read image
        ML->>ML: Run classification (1000+ labels)
        ML->>ML: Run object detection
        ML->>ML: Run face detection + embedding
        ML->>ML: Run OCR
        ML->>ML: Generate visual embedding (512-dim)
        ML->>SP: Write ML labels to metadata
    end

    Note over C,FC: Phase 3: Index & Cluster

    ML->>SI: Update inverted index (labels → mediaId)
    ML->>SI: Update vector index (embedding → mediaId)
    ML->>FC: Submit face embeddings for clustering
    FC->>FC: Incremental cluster update
    FC->>SP: Update face → person mapping
```

---

## Data Flow: Search Path

```mermaid
---
config:
  look: neo
  theme: base
---
sequenceDiagram
    participant C as Client
    participant GFE as GFE
    participant SS as Search Service
    participant QP as Query Parser
    participant II as Inverted Index
    participant VI as Vector Index
    participant FC as Face Clusters
    participant SP as Spanner
    participant MC as Memcache
    participant CDN as CDN

    C->>GFE: GET /search?q="my dog at the beach"
    GFE->>SS: Route search request

    SS->>QP: Parse query
    QP->>QP: Intent classification
    QP-->>SS: {entities: ["dog", "beach"],<br/>type: "visual+semantic",<br/>person: null, date: null}

    par Multi-Signal Search
        SS->>II: Lookup labels: "dog", "beach"
        II-->>SS: Candidate set A (label matches)
    and
        SS->>VI: ANN search with query embedding
        VI-->>SS: Candidate set B (semantic matches)
    end

    SS->>SS: Merge & rank candidates<br/>(weighted fusion)
    SS->>SP: Fetch metadata for top-K results
    SP-->>SS: Media item details
    SS->>MC: Cache result set

    SS-->>C: Search results (mediaItemIds + thumbnailURLs)

    C->>CDN: Load thumbnails
    CDN-->>C: Thumbnail images
```

---

## Data Flow: View/Browse Path

```mermaid
---
config:
  look: neo
  theme: base
---
sequenceDiagram
    participant C as Client
    participant CDN as Google CDN
    participant TS as Thumbnail Store
    participant SS as Serving Store
    participant MC as Memcache
    participant SP as Spanner
    participant MS as Media Service

    Note over C,MS: Browse (Grid View)

    C->>MS: GET /mediaItems?pageToken=X&pageSize=100
    MS->>MC: Check metadata cache
    alt Cache Hit
        MC-->>MS: Cached media list
    else Cache Miss
        MS->>SP: Query media items (paginated, by timestamp DESC)
        SP-->>MS: Media items + metadata
        MS->>MC: Cache result
    end
    MS-->>C: {items: [...], nextPageToken: Y}

    par Parallel Thumbnail Loading
        C->>CDN: GET /thumbnail/item1 (256px)
        CDN->>TS: Origin fetch (if not cached)
        TS-->>CDN: Thumbnail blob
        CDN-->>C: WebP thumbnail
    and
        C->>CDN: GET /thumbnail/item2 (256px)
        CDN-->>C: WebP thumbnail (edge cached)
    end

    Note over C,MS: Full Resolution View

    C->>CDN: GET /media/item1/full?w=1920
    alt CDN Cache Hit
        CDN-->>C: Serving copy (WebP, resized)
    else CDN Cache Miss
        CDN->>SS: Fetch serving copy
        SS-->>CDN: Full-res serving copy
        CDN-->>C: Image with progressive loading
    end
```

---

## Key Architectural Decisions

### 1. Monolith vs Microservices

| Decision | **Microservices** |
|----------|-------------------|
| **Rationale** | Different components scale independently: upload spikes ≠ search spikes ≠ ML processing load |
| **Services** | Upload, Media, Album, Sharing, Sync, Search, Memories, ML Pipeline, Face Clustering |
| **Communication** | Sync (gRPC between services), Async (Pub/Sub for processing pipelines) |
| **Trade-off** | Higher operational complexity, but necessary at Google's scale |

### 2. Synchronous vs Asynchronous

| Path | Model | Justification |
|------|-------|---------------|
| Upload → Store | Synchronous | User needs confirmation that upload succeeded |
| Upload → ML Processing | **Asynchronous** | ML can take seconds to minutes; don't block upload |
| Upload → Thumbnail Generation | **Asynchronous** | Generated within seconds, served from cache once ready |
| Search Query | Synchronous | User expects immediate results |
| Face Clustering | **Asynchronous** | Batch + incremental; can take minutes to hours |
| Sync notification | **Asynchronous** | Push via FCM/APNs; pull-based reconciliation |

### 3. Database Choices

| Data Type | Storage | Justification |
|-----------|---------|---------------|
| **Photo/Video blobs** | Colossus (Distributed Filesystem) | Exabyte-scale, erasure-coded, geo-replicated |
| **Media metadata** | Spanner (Globally Consistent SQL) | Strong consistency for ownership, sharing, deletion |
| **ML features/embeddings** | Bigtable (Wide-column) | High write throughput for ML pipeline output |
| **Search index (labels)** | Custom Inverted Index | Fast term-based lookup |
| **Search index (visual)** | Custom Vector Index (ScaNN) | ANN search for visual similarity |
| **Hot metadata cache** | Memcache | Sub-millisecond reads for frequently accessed data |
| **Sync state** | Spanner | Consistent sync tokens across devices |

### 4. Caching Strategy

```
┌─────────────────────────────────────────────────────────┐
│ L1: Client Cache (Device)                               │
│   • Recent thumbnails in memory/disk cache              │
│   • Full-res images viewed recently                     │
│   • Offline-available content                           │
├─────────────────────────────────────────────────────────┤
│ L2: CDN Edge Cache (Google PoPs)                        │
│   • Popular thumbnails (hot photos, shared albums)      │
│   • Public/shared content                               │
│   • TTL: 24 hours (thumbnails), 1 hour (metadata)      │
├─────────────────────────────────────────────────────────┤
│ L3: Origin Cache (Memcache)                             │
│   • Media item metadata for active users                │
│   • Search results cache (per-user, short TTL)          │
│   • Album membership lists                              │
│   • Face cluster mappings                               │
├─────────────────────────────────────────────────────────┤
│ L4: Serving Copy Store                                  │
│   • Pre-generated WebP copies at standard resolutions   │
│   • Thumbnails at 256px, 512px, 1024px                  │
│   • Separated from original blobs for fast serving      │
├─────────────────────────────────────────────────────────┤
│ L5: Origin Storage (Colossus)                           │
│   • Original quality files                              │
│   • Erasure-coded, geo-replicated                       │
└─────────────────────────────────────────────────────────┘
```

### 5. Message Queue Usage

| Event | Queue | Consumers | Priority |
|-------|-------|-----------|----------|
| `MediaUploaded` | Pub/Sub topic | Media Pipeline, ML Pipeline | High |
| `ThumbnailReady` | Pub/Sub topic | CDN Prewarmer, Sync Service | High |
| `MLProcessingComplete` | Pub/Sub topic | Search Indexer, Face Clusterer | Medium |
| `FaceClusterUpdated` | Pub/Sub topic | Search Indexer, Memories Service | Low |
| `AlbumModified` | Pub/Sub topic | Sync Service, Notification Service | Medium |
| `MediaDeleted` | Pub/Sub topic | Blob Cleanup, Index Cleanup | Low |
| `ShareCreated` | Pub/Sub topic | Notification Service, Permission Service | Medium |

---

## Architecture Pattern Checklist

- [x] **Sync vs Async**: Upload = sync, ML/thumbnail = async via Pub/Sub
- [x] **Event-driven vs Request-response**: Event-driven for all post-upload processing
- [x] **Push vs Pull**: Push for sync notifications (FCM/APNs), pull for reconciliation
- [x] **Stateless vs Stateful**: All services stateless; state in Spanner/Colossus
- [x] **Read-heavy vs Write-heavy**: Read-heavy (10:1 ratio); CDN + cache for reads
- [x] **Real-time vs Batch**: Real-time for serving, batch for ML retraining & re-clustering
- [x] **Edge vs Origin**: Thumbnails served from edge CDN; ML runs at origin datacenters

---

## Multi-Region Architecture

```mermaid
---
config:
  look: neo
  theme: base
---
flowchart TB
    subgraph US["US Region"]
        direction TB
        US_GFE[GFE] --> US_SVC[Services]
        US_SVC --> US_SP[(Spanner<br/>Leader)]
        US_SVC --> US_COL[(Colossus<br/>Primary)]
        US_ML[ML Pipeline<br/>TPU Pods]
    end

    subgraph EU["EU Region"]
        direction TB
        EU_GFE[GFE] --> EU_SVC[Services]
        EU_SVC --> EU_SP[(Spanner<br/>Replica)]
        EU_SVC --> EU_COL[(Colossus<br/>Replica)]
        EU_ML[ML Pipeline<br/>TPU Pods]
    end

    subgraph APAC["APAC Region"]
        direction TB
        AP_GFE[GFE] --> AP_SVC[Services]
        AP_SVC --> AP_SP[(Spanner<br/>Replica)]
        AP_SVC --> AP_COL[(Colossus<br/>Replica)]
        AP_ML[ML Pipeline<br/>TPU Pods]
    end

    US_SP <-->|"Paxos Sync"| EU_SP
    EU_SP <-->|"Paxos Sync"| AP_SP
    US_COL <-->|"Async Replication"| EU_COL
    EU_COL <-->|"Async Replication"| AP_COL

    GSLB[Global Server<br/>Load Balancing] --> US_GFE
    GSLB --> EU_GFE
    GSLB --> AP_GFE

    classDef region fill:#f5f5f5,stroke:#424242,stroke-width:2px
    classDef gfe fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef svc fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef db fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef ml fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef lb fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class US_GFE,EU_GFE,AP_GFE gfe
    class US_SVC,EU_SVC,AP_SVC svc
    class US_SP,EU_SP,AP_SP,US_COL,EU_COL,AP_COL db
    class US_ML,EU_ML,AP_ML ml
    class GSLB lb
```

**Key Decisions:**
- **Spanner**: Synchronous Paxos replication — strong consistency for metadata globally
- **Colossus**: Asynchronous replication — eventual consistency for blobs (read from nearest replica)
- **ML Processing**: Run in same region as upload to minimize data movement
- **GSLB**: Routes users to nearest healthy region based on latency + capacity

---

## Upload Protocol: Resumable Upload

```
Client                              Upload Service
  │                                       │
  │─── POST /upload/init ───────────────→│
  │    {filename, size, mimeType,         │
  │     hash, quality_tier}               │
  │                                       │
  │←── 200 {uploadSessionId, chunkSize} ──│
  │                                       │
  │─── PUT /upload/{sessionId}/chunk/0 ──→│
  │    [bytes 0..chunkSize]               │
  │←── 200 {bytesReceived: chunkSize} ────│
  │                                       │
  │─── PUT /upload/{sessionId}/chunk/1 ──→│
  │    [bytes chunkSize..2*chunkSize]     │
  │←── 200 {bytesReceived: 2*chunkSize} ──│
  │                                       │
  │         ... (network failure) ...      │
  │                                       │
  │─── GET /upload/{sessionId}/status ───→│
  │←── 200 {bytesReceived: 2*chunkSize} ──│
  │                                       │
  │─── PUT /upload/{sessionId}/chunk/2 ──→│  ← Resume from last ACK'd byte
  │    [remaining bytes]                  │
  │←── 200 {bytesReceived: total} ────────│
  │                                       │
  │─── POST /upload/{sessionId}/finalize →│
  │←── 200 {mediaItemId, status: ok} ─────│
```

**Key properties:**
- **Idempotent chunks**: Retrying a chunk write is safe (server checks offset)
- **Session TTL**: Upload sessions expire after 7 days
- **Chunk size**: 1-8 MB (adaptive based on network quality)
- **Integrity**: SHA-256 hash verified on finalization
- **Deduplication**: Hash-based dedup before storage (skip if identical blob exists)
