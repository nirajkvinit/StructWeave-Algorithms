# Google Photos System Design

## Overview

Google Photos is the world's largest cloud photo and video management platform, serving **1.5 billion monthly active users** who collectively store **9+ trillion photos and videos** (as of its 10th anniversary, May 2025). The platform processes approximately **4 billion uploads daily** (28 billion/week), running sophisticated ML pipelines for facial recognition, visual search, Gemini-powered "Ask Photos," auto-curation, and generative AI editing — all backed by Google's planet-scale infrastructure (Blobstore on Colossus, Spanner, Bigtable, Borg).

This design focuses on four core challenges:
1. **Image Backup & Storage** — Reliable upload, deduplication, compression, and multi-device sync at planetary scale
2. **Facial Recognition & Clustering** — FaceNet-based face grouping across billions of photos with privacy controls
3. **Visual Search** — Content-based image retrieval enabling natural language queries ("beach sunset", "dog", "birthday cake")
4. **AI-Powered Features** — Memories, Magic Eraser, Best Take, Cinematic Photos, and generative AI editing

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Scale numbers, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture, data flows, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, APIs, algorithms |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Face clustering, upload pipeline, visual search |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling, fault tolerance, DR |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Privacy, encryption, GDPR/CCPA |
| [07 - Observability](./07-observability.md) | Metrics, logging, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trap questions, trade-offs |

---

## System Characteristics

| Characteristic | Value | Design Implication |
|----------------|-------|-------------------|
| Traffic Pattern | Write-heavy (uploads), Read-heavy (viewing/browsing) | Async upload pipeline, aggressive caching for reads |
| Content Type | Images (JPEG, HEIC, RAW, WebP) + Videos (MP4, MOV) | Format-specific processing pipelines |
| File Sizes | 2-30 MB per photo, 100 MB - 4 GB per video | Chunked upload, resumable transfers |
| Consistency Model | Eventual (sync), Strong (metadata writes) | Conflict resolution for multi-device |
| Latency Target | <200ms thumbnail load, <500ms full-res load | Edge caching, progressive rendering |
| ML Processing | Async, within minutes of upload | Separate ML pipeline with priority queues |
| Global Distribution | 200+ countries | Multi-region replication, geo-aware serving |

---

## Complexity Rating

| Component | Complexity | Reason |
|-----------|------------|--------|
| Upload & Sync Pipeline | **High** | Chunked/resumable uploads, dedup, multi-device conflict resolution |
| Image Processing Pipeline | **High** | Thumbnails, format conversion, EXIF extraction, quality tiers |
| Face Clustering (FaceNet) | **Very High** | Incremental clustering across billions of faces, privacy controls |
| Visual Search & Understanding | **Very High** | Multi-modal embeddings, scene/object/text detection, natural language queries |
| AI Features (Magic Eraser, etc.) | **Very High** | Generative AI inference, on-device + cloud hybrid ML |
| Storage & Replication | **High** | Exabyte-scale blob storage, erasure coding, geo-replication |
| Sharing & Access Control | Medium | Shared albums, partner sharing, link-based access |

**Overall Complexity: Very High**

---

## Architecture Overview

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
    subgraph Clients["Client Applications"]
        direction LR
        ANDROID[Android App]
        IOS[iOS App]
        WEB[Web App<br/>photos.google.com]
        API_EXT[Photos API<br/>Third-party]
    end

    subgraph Edge["Edge & CDN"]
        GFE[Google Front End<br/>GFE]
        CDN[Google CDN<br/>Edge Cache]
    end

    subgraph Gateway["Gateway Layer"]
        APIGW[API Gateway]
        AUTH[OAuth 2.0<br/>Auth]
        QUOTA[Quota &<br/>Rate Limit]
    end

    subgraph Core["Core Services"]
        UPLOAD[Upload<br/>Service]
        MEDIA[Media Item<br/>Service]
        ALBUM[Album &<br/>Sharing Service]
        SYNC[Sync<br/>Service]
        SEARCH_SVC[Search<br/>Service]
        MEMORIES[Memories &<br/>Curation Service]
    end

    subgraph ML["ML Platform"]
        VISION[Vision AI<br/>Pipeline]
        FACE[Face<br/>Clustering]
        EMBED[Embedding<br/>Service]
        GENAI[Generative AI<br/>Magic Eraser / Best Take]
    end

    subgraph Processing["Media Processing"]
        TRANSCODE[Image/Video<br/>Transcoding]
        THUMB[Thumbnail<br/>Generator]
        EXIF_SVC[EXIF/Metadata<br/>Extractor]
    end

    subgraph Storage["Storage Layer"]
        COLOSSUS[(Colossus<br/>Blob Storage)]
        SPANNER[(Spanner<br/>Metadata)]
        BIGTABLE[(Bigtable<br/>ML Features)]
        MEMCACHE[(Memcache<br/>Hot Data)]
    end

    subgraph Streaming["Event Streaming"]
        PUBSUB[Pub/Sub<br/>Event Bus]
    end

    Clients --> Edge --> Gateway
    Gateway --> Core
    Core --> Storage
    UPLOAD --> PUBSUB
    PUBSUB --> Processing
    PUBSUB --> ML
    ML --> Storage
    Processing --> Storage

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef core fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ml fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef processing fill:#f1f8e9,stroke:#558b2f,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef streaming fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px

    class ANDROID,IOS,WEB,API_EXT client
    class GFE,CDN edge
    class APIGW,AUTH,QUOTA gateway
    class UPLOAD,MEDIA,ALBUM,SYNC,SEARCH_SVC,MEMORIES core
    class VISION,FACE,EMBED,GENAI ml
    class TRANSCODE,THUMB,EXIF_SVC processing
    class COLOSSUS,SPANNER,BIGTABLE,MEMCACHE storage
    class PUBSUB streaming
```

---

## Key Scale Numbers

| Metric | Value | Context |
|--------|-------|---------|
| Monthly Active Users | 1.5B | Confirmed May 2025 (10th anniversary) |
| Photos & Videos Stored | 9+ trillion | Doubled from 4T in 2020 to 9T+ in 2025 |
| Daily Uploads | ~4 billion | 28 billion/week (Google's public disclosure) |
| Storage Volume | Exabytes | Colossus filesystems exceed 10 EB each |
| Monthly Search Users | 370 million | People who search their photos monthly |
| Monthly Sharing Users | 440 million | People who share memories monthly |
| Monthly Editors | 210 million | People who edit photos monthly |
| ML Models Run Per Photo | 10+ | Classification, detection, face, OCR, embeddings, quality |
| Labels Applied | 2+ trillion | Total ML labels across all photos |
| Supported Formats | 20+ | JPEG, HEIC, RAW (CR2/ARW/DNG), WebP, PNG, MP4, MOV, etc. |

---

## Platform Comparison

| Aspect | Google Photos | Apple iCloud Photos | Amazon Photos | Samsung Gallery |
|--------|--------------|--------------------|--------------|-----------------|
| **Storage Model** | 15 GB free (Google One) | 5 GB free (iCloud+) | Unlimited photos (Prime) | Device + cloud |
| **ML Search** | Best-in-class NLP | On-device ML | Basic tagging | Samsung AI |
| **Face Grouping** | Cloud-based, opt-in | On-device only | Basic | On-device |
| **AI Editing** | Magic Eraser, Best Take, Reimagine | Clean Up, Memories | Basic filters | Object Eraser |
| **Cross-Platform** | Full (Android, iOS, Web) | Apple ecosystem only | Web + apps | Samsung devices |
| **Sharing** | Shared albums, partner sharing | Shared albums, Family | Family vault | Quick Share |
| **API** | Photos Library API | CloudKit (limited) | None | None |
| **Video Support** | 4K, stabilization | 4K, Live Photos | 4K | 4K |

---

## Key Technology Stack (Google Internal)

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Global Network** | Google Front End (GFE) | TLS termination, routing |
| **CDN** | Google CDN (Edge PoPs) | Image/thumbnail serving via `lh3.googleusercontent.com` |
| **Orchestration** | Borg | Container orchestration (2B+ containers/week across Google) |
| **Blob Storage** | Blobstore (on Colossus) | Photo/video binary storage, chunked and replicated across zones |
| **Filesystem** | Colossus (GFS v2) | Exabyte-scale distributed filesystem (10+ EB per filesystem, 50 TB/s reads) |
| **Metadata** | Spanner | Globally consistent metadata (confirmed by Google Cloud blog) |
| **ML Features** | Bigtable | Embeddings, face vectors, ML labels |
| **Cache** | Memcache / In-memory | Hot thumbnail and metadata cache |
| **Event Bus** | Pub/Sub | Async processing triggers |
| **Batch Processing** | Flume Pipelines | Dozens of large batch ML + data integrity pipelines |
| **ML Framework** | TensorFlow / JAX / TFLite | Vision models, FaceNet, on-device inference |
| **ML Serving** | TensorFlow Serving / TPU | Real-time inference on TPU pods |
| **Vector Search** | ScaNN / SOAR | ANN search for visual embeddings (scales to 10B+ vectors) |
| **Quality Scoring** | NIMA / MUSIQ | Aesthetic quality prediction for Memories curation |
| **NL Search** | Gemini + RAG | "Ask Photos" — natural language photo search (2024-2025) |
| **On-Device ML** | MediaPipe / BlazeFace / ML Kit | On-device face detection, image labeling (400+ categories) |

---

## Quality Tiers

| Tier | Photo Compression | Video Compression | Storage Counting |
|------|-------------------|-------------------|-----------------|
| **Original Quality** | No compression, original file preserved | No re-encoding | Counts against quota |
| **Storage Saver** | Photos >16 MP resized, JPEG compressed | Videos >1080p re-encoded | Counts against quota (post-June 2021) |
| **Express Backup** (mobile) | 3 MP, heavily compressed | 480p | Doesn't count against quota |

---

## Critical Trade-offs Summary

| Decision | Google's Choice | Alternative | Rationale |
|----------|----------------|-------------|-----------|
| Face Processing | Cloud-based (opt-in) | On-device only (Apple) | Better clustering quality across library |
| Storage Pricing | Freemium (15 GB free) | Unlimited (old model) | Sustainable business model |
| Search Architecture | Hybrid (embeddings + inverted index) | Keyword tags only | Natural language queries, semantic understanding |
| Upload Strategy | Chunked + resumable | Single-shot upload | Reliability on poor networks |
| ML Pipeline | Async post-upload | Synchronous | Don't block upload completion |
| Metadata DB | Spanner (strong consistency) | Cassandra (eventual) | Cross-device consistency for metadata |
| Image Format | WebP for serving, keep original | Convert all to JPEG | Quality preservation + bandwidth savings |

---

## What Makes Google Photos Unique

### 1. **World-Class Visual Search & Ask Photos**
- Natural language queries ("photos of my dog at the beach last summer")
- **Ask Photos** (2024-2025): Gemini-powered RAG architecture — agent model selects retrieval tools, vector-based retrieval extends metadata search, answer model analyzes visual content with Gemini's long context window
- Combines scene recognition, object detection, OCR, face recognition, temporal context
- 370 million people search their photos monthly

### 2. **FaceNet Face Clustering**
- 128-dimensional face embeddings with triplet loss training
- Incremental clustering that improves over time
- Cross-photo identity linking without manual tagging

### 3. **Generative AI Editing**
- Magic Eraser (object removal using inpainting)
- Best Take (face swap across burst photos)
- Photo Unblur (deblurring using generative models)
- Reimagine (generative scene editing with Gemini)

### 4. **Memories & Auto-Curation (NIMA/MUSIQ + Gemini)**
- ML-driven highlight reels using **NIMA** (Neural Image Assessment) for aesthetic quality scoring
- **MUSIQ** (Multi-Scale Image Quality Transformer) for resolution-agnostic quality prediction
- Automatic collages with AI-matched color palettes, animations, cinematic photos
- 2025 Recap uses **Gemini** to surface year-end highlights with personalized captions
- Contextual surfacing based on date, location, people — multi-stage filtering with 0.7 confidence threshold

### 5. **Planet-Scale Infrastructure**
- Google's own datacenter network, Colossus filesystem, Spanner database
- Hardware-accelerated ML with TPUs
- Zero-downtime updates via Borg

---

## Related Designs

| Topic | Link | Relevance |
|-------|------|-----------|
| YouTube | [5.1-youtube](../5.1-youtube/00-index.md) | Video processing pipeline patterns |
| Netflix | [5.2-netflix](../5.2-netflix/00-index.md) | Media delivery at scale |
| Instagram | [4.3-instagram](../4.3-instagram/00-index.md) | Photo storage, feed, stories |
| Blob Storage System | [1.12-blob-storage](../1.12-blob-storage-system/00-index.md) | Object storage fundamentals |
| CDN Design | [1.15-cdn](../1.15-content-delivery-network-cdn/00-index.md) | Content delivery patterns |
| Vector Database | [3.14-vector-db](../3.14-vector-database/00-index.md) | Embedding search for visual queries |
| AI Image Generation | [3.20-ai-image-gen](../3.20-ai-image-generation-platform/00-index.md) | Generative AI patterns |
| Recommendation Engine | [3.12-rec-engine](../3.12-recommendation-engine/00-index.md) | ML personalization |

---

## References

- [Google Photos builds user experience on Spanner (Google Cloud Blog)](https://cloud.google.com/blog/products/databases/google-photos-builds-user-experience-on-spanner) — Most authoritative source on Photos backend architecture
- [Google Photos Turns 10, Hosts 9+ Trillion Photos (PetaPixel, May 2025)](https://petapixel.com/2025/05/28/google-photos-turns-10-now-hosts-over-9-trillion-photos-and-videos/)
- [FaceNet: A Unified Embedding for Face Recognition and Clustering (Schroff et al., CVPR 2015)](https://arxiv.org/abs/1503.03832)
- [A Peek Behind Colossus, Google's File System (Google Cloud Blog)](https://cloud.google.com/blog/products/storage-data-transfer/a-peek-behind-colossus-googles-file-system)
- [Ask Photos: Gemini-powered AI Search (Google I/O 2024)](https://blog.google/products/photos/ask-photos-google-io-2024/)
- [Announcing ScaNN: Efficient Vector Similarity Search (Google Research)](https://research.google/blog/announcing-scann-efficient-vector-similarity-search/)
- [SOAR: New Algorithms for Even Faster Vector Search (Google Research)](https://research.google/blog/soar-new-algorithms-for-even-faster-vector-search-with-scann/)
- [Introducing NIMA: Neural Image Assessment (Google AI Blog)](https://ai.googleblog.com/2017/12/introducing-nima-neural-image-assessment.html)
- [Google Photos API Documentation](https://developers.google.com/photos)
- [Google Photos Compression Investigation (Zack Apiratitham)](https://vatthikorn.com/google-photos-compression/)
- [MediaPipe Face Detection Guide](https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector)
- [Google BIPA Settlement — $100M (SecurityInfoWatch)](https://www.securityinfowatch.com/access-identity/biometrics/news/21265683/google-to-pay-100m-class-action-settlement-in-illinois-biometric-privacy-lawsuit)
- [Google Photos 2025 Recap with Gemini (TechCrunch)](https://techcrunch.com/2025/12/03/google-photos-2025-recap-turns-to-gemini-to-find-your-highlights/)
- [How Google Photos joined the billion-user club (Fast Company)](https://www.fastcompany.com/90380618/how-google-photos-joined-the-billion-user-club)
