# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture

Netflix's architecture follows a unique split between **Control Plane** (AWS-hosted services) and **Data Plane** (Open Connect CDN). This separation enables independent evolution and scaling of each plane.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        direction LR
        TV[Smart TVs<br/>Gibbon SDK]
        MOBILE[Mobile Apps<br/>iOS/Android]
        WEB[Web Browser<br/>HTML5 Player]
        CONSOLE[Gaming Consoles<br/>PS/Xbox]
    end

    subgraph OpenConnect["Open Connect CDN (Data Plane)"]
        direction TB
        subgraph IXP["Internet Exchange Points"]
            SA1[Storage Appliance<br/>US-East]
            SA2[Storage Appliance<br/>EU-West]
            SA3[Storage Appliance<br/>APAC]
        end
        subgraph ISPNetwork["ISP Networks"]
            EA1[Edge Appliance<br/>Comcast]
            EA2[Edge Appliance<br/>Vodafone]
            EA3[Edge Appliance<br/>NTT]
        end
    end

    subgraph AWSControl["AWS Control Plane"]
        subgraph Gateway["Gateway Layer"]
            ZUUL[Zuul Gateway<br/>Routing + Auth]
            RATE[Rate Limiter]
        end

        subgraph CoreServices["Core Services"]
            PLAYBACK[Playback Service<br/>Manifest Generation]
            CATALOG[Catalog Service<br/>Content Metadata]
            USER[User Service<br/>Profiles + Auth]
            SUB[Subscription Service<br/>Billing]
            LIVE[Live Origin<br/>Real-time Events]
        end

        subgraph MLPlatform["ML Platform"]
            HYDRA[Hydra<br/>Multi-Task Models]
            FEATURE[Feature Store<br/>EVCache]
            RUNWAY[Runway<br/>Model Lifecycle]
        end

        subgraph DataPlatform["Data Platform"]
            KAFKA[Kafka Keystone<br/>2T msgs/day]
            FLINK[Apache Flink<br/>Stream Processing]
            RDG[Real-Time Graph<br/>Entity Relations]
        end
    end

    subgraph Storage["Storage Layer"]
        S3[(S3<br/>Video Content)]
        COCKROACH[(CockroachDB<br/>380+ clusters)]
        CASSANDRA[(Cassandra<br/>Analytics)]
        EVCACHE[(EVCache<br/>Features)]
    end

    Clients -->|Video Segments| ISPNetwork
    ISPNetwork -->|Cache Miss| IXP
    IXP -->|Origin Fill| S3

    Clients -->|API Calls| Gateway
    Gateway --> CoreServices
    CoreServices --> MLPlatform
    CoreServices --> Storage
    DataPlatform --> Storage

    PLAYBACK -->|Manifest| Clients
    PLAYBACK -->|Steering| OpenConnect

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef cdn fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef core fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ml fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef data fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class TV,MOBILE,WEB,CONSOLE client
    class SA1,SA2,SA3,EA1,EA2,EA3 cdn
    class ZUUL,RATE gateway
    class PLAYBACK,CATALOG,USER,SUB,LIVE core
    class HYDRA,FEATURE,RUNWAY ml
    class KAFKA,FLINK,RDG data
    class S3,COCKROACH,CASSANDRA,EVCACHE storage
```

---

## Data Flow Diagrams

### Video Playback Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant Z as Zuul Gateway
    participant P as Playback Service
    participant H as Hydra (Personalization)
    participant OC as Open Connect CDN
    participant S3 as S3 Origin

    C->>Z: Play Request (title_id)
    Z->>P: Get Manifest
    P->>P: Check user subscription
    P->>P: Check content rights (region)
    P->>P: Select CDN URLs (steering)
    P->>H: Get personalized quality profile
    H-->>P: Device-aware quality ladder
    P-->>C: DASH/HLS Manifest

    loop Video Segments
        C->>OC: GET segment_001.mp4
        alt Cache Hit (98%+)
            OC-->>C: Video Segment
        else Cache Miss
            OC->>S3: Fetch from Origin
            S3-->>OC: Video Segment
            OC-->>C: Video Segment
        end
    end

    C->>Z: Heartbeat (position, quality)
    Z->>P: Update watch progress
```

### Content Ingestion Flow

```mermaid
sequenceDiagram
    participant S as Studio
    participant I as Ingest Service
    participant E as Encoding Pipeline
    participant QC as Quality Control
    participant C as Catalog Service
    participant OC as Open Connect

    S->>I: Upload Master File
    I->>I: Validate format, quality
    I->>E: Queue for encoding

    par Parallel Encoding
        E->>E: Encode AV1 (all resolutions)
        E->>E: Encode VP9 (all resolutions)
        E->>E: Encode H.264 (all resolutions)
    end

    E->>E: Film Grain Synthesis
    E->>E: Generate thumbnails
    E->>QC: Quality validation
    QC->>QC: Automated checks
    QC->>QC: Human review (samples)

    QC->>C: Publish metadata
    C->>OC: Trigger content distribution
    OC->>OC: Predictive placement to appliances
```

### Personalization Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant Z as Zuul
    participant R as Recommendation Service
    participant H as Hydra Model
    participant F as Feature Store (EVCache)
    participant K as Kafka

    C->>Z: GET /browse/home
    Z->>R: Get personalized home

    R->>F: Get user features
    F-->>R: Watch history, preferences
    R->>F: Get item features
    F-->>R: Title embeddings, metadata

    R->>H: Inference request
    Note over H: Multi-task prediction:<br/>- Watch probability<br/>- Completion probability<br/>- Satisfaction score
    H-->>R: Ranked titles + thumbnails

    R->>R: Assemble rows
    R-->>C: Personalized home page

    C->>K: Log impression event
    K->>F: Update real-time features
```

### Live Streaming Flow

```mermaid
sequenceDiagram
    participant V as Venue/Studio
    participant MC as MediaConnect
    participant ML as MediaLive
    participant LO as Live Origin
    participant EC as EVCache
    participant OC as Open Connect
    participant C as Clients (65M)

    V->>MC: Live feed (multiple feeds)
    MC->>MC: Redundancy handling
    MC->>ML: Feed to encoder
    ML->>ML: Real-time encoding (ABR ladder)
    ML->>LO: Push segments

    LO->>EC: Store manifest + segments
    LO->>LO: Generate live manifest

    par Global Distribution
        LO->>OC: Push to Storage Appliances
        OC->>OC: Replicate to Edge Appliances
    end

    C->>OC: GET live manifest
    OC-->>C: Manifest (refresh every 2s)
    C->>OC: GET live segment
    OC-->>C: Segment

    Note over C,OC: Latency: 10-30 seconds<br/>from venue to 65M viewers
```

---

## Key Architectural Decisions

### 1. Own CDN vs Third-Party CDN

| Aspect | Open Connect (Netflix) | Third-Party (Akamai/Cloudflare) |
|--------|------------------------|----------------------------------|
| **Cost** | CapEx + operational | $1B+/year at Netflix scale |
| **Control** | Full control over caching, routing | Limited customization |
| **ISP Relationships** | Direct partnerships, free hardware | ISP sees as external traffic |
| **Customization** | Predictive caching for catalog | Generic caching rules |
| **Latency** | Embedded in ISP network | Multi-hop from edge |

**Decision:** Build Open Connect
- Netflix traffic is 15%+ of global internet traffic
- Predictable workload (catalog-based, not UGC)
- ISPs benefit from reduced transit costs
- Long-term cost savings justify investment

### 2. Microservices Architecture

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Service Granularity** | Domain-driven | Team autonomy, independent scaling |
| **Communication** | Async-first (Kafka) | Decoupled services, resilience |
| **API Layer** | Federated GraphQL (DGS) | Schema stitching, single endpoint |
| **Service Discovery** | Envoy + ODCDS | Zero-config service mesh |
| **Framework** | Spring Boot | Java ecosystem, Netflix OSS |

### 3. Database Strategy

| Data Type | Database | Reason |
|-----------|----------|--------|
| User accounts, billing | CockroachDB | ACID, global consistency |
| Content metadata | CockroachDB | Referential integrity |
| Watch history | Cassandra | High write throughput |
| Analytics events | Cassandra | Time-series, append-only |
| ML features | EVCache | Sub-millisecond reads |
| Real-time graph | Cassandra (KVDAL) | Flexible schema, scale |

### 4. Encoding Strategy

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Primary Codec** | AV1 | 30%+ bandwidth savings vs H.264 |
| **Fallback Codec** | VP9, H.264 | Device compatibility |
| **Film Grain** | Synthesis | 24-31% bitrate reduction |
| **Per-Device** | Context-Aware Encoding | Mobile vs TV optimization |
| **Encode Timing** | Ahead of time | Encode once, serve millions |

### 5. Personalization Strategy

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Model Architecture** | Multi-task (Hydra) | Shared representations, efficiency |
| **Feature Store** | EVCache | <10ms latency |
| **Thumbnail Selection** | Per-user personalization | 20-30% engagement lift |
| **Exploration** | Multi-armed bandit | Balance explore/exploit |
| **Inference** | Real-time (<50ms) | Fresh recommendations |

---

## Architecture Pattern Checklist

| Pattern | Decision | Implementation |
|---------|----------|----------------|
| Sync vs Async | **Async-first** | Kafka Keystone for events, sync for playback |
| Event-driven vs Request-response | **Hybrid** | Events for analytics, request for playback |
| Push vs Pull | **Pull** (CDN) | Clients pull segments, manifest-driven |
| Stateless vs Stateful | **Stateless services** | State in databases/cache |
| Read-heavy vs Write-heavy | **Read-heavy** | 95%+ is video streaming |
| Real-time vs Batch | **Hybrid** | Real-time recs, batch model training |
| Edge vs Origin | **Edge-first** | 95% from Open Connect edge |

---

## Component Interaction Matrix

| Component | Interacts With | Protocol | Pattern |
|-----------|---------------|----------|---------|
| Client | Zuul Gateway | HTTPS/gRPC | Request-Response |
| Client | Open Connect | HTTPS (DASH/HLS) | Pull streaming |
| Zuul | All Services | gRPC | Load-balanced |
| Services | Kafka | Async | Event publishing |
| Services | CockroachDB | SQL | Synchronous |
| Services | Cassandra | CQL | Async writes |
| Services | EVCache | Memcached | Cache-aside |
| Flink | Kafka | Streaming | Consumer groups |
| Hydra | Feature Store | gRPC | Real-time inference |

---

## High-Level Component Responsibilities

### Control Plane (AWS)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTROL PLANE (AWS)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ GATEWAY LAYER                                                    │    │
│  │  • Zuul: Request routing, authentication, rate limiting         │    │
│  │  • Service mesh: Envoy with ODCDS (zero-config discovery)       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ CORE SERVICES                                                    │    │
│  │  • Playback: Manifest generation, DRM, CDN steering             │    │
│  │  • Catalog: Content metadata, availability, rights              │    │
│  │  • User: Authentication, profiles, preferences                  │    │
│  │  • Subscription: Billing, plans, entitlements                   │    │
│  │  • Live Origin: Real-time event streaming                       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ ML PLATFORM                                                      │    │
│  │  • Hydra: Multi-task personalization models                     │    │
│  │  • Feature Store: Real-time + batch features (EVCache)          │    │
│  │  • Runway: Model lifecycle management                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ DATA PLATFORM                                                    │    │
│  │  • Kafka Keystone: 2T messages/day event pipeline               │    │
│  │  • Flink: 38M events/second stream processing                   │    │
│  │  • Real-Time Graph: Cross-domain entity relationships           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Plane (Open Connect)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       DATA PLANE (OPEN CONNECT)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ STORAGE APPLIANCES (IXP Level)                                   │    │
│  │  • Located at Internet Exchange Points                          │    │
│  │  • Store full/near-full Netflix catalog                         │    │
│  │  • High storage capacity (100+ TB per appliance)                │    │
│  │  • Serve regional edge appliances                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                   │                                      │
│                                   ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ EDGE APPLIANCES (ISP Level)                                      │    │
│  │  • Embedded within ISP networks (free to ISPs)                  │    │
│  │  • Store regionally popular content                             │    │
│  │  • Lower latency (last mile delivery)                           │    │
│  │  • 95%+ of traffic served here                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                   │                                      │
│                                   ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ CONTENT STEERING                                                 │    │
│  │  • Control plane decides which appliance serves each request    │    │
│  │  • Based on: client location, appliance health, content cache   │    │
│  │  • Manifest includes ranked list of CDN URLs                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack Summary

```mermaid
flowchart LR
    subgraph Client["Client Stack"]
        GIBBON[Gibbon - TV SDK]
        EXO[ExoPlayer - Android]
        AV[AVPlayer - iOS]
        HTML5[HTML5 Video - Web]
    end

    subgraph Gateway["Gateway Stack"]
        ZUUL[Zuul 2]
        ENVOY[Envoy + ODCDS]
    end

    subgraph Service["Service Stack"]
        SPRING[Spring Boot]
        DGS[DGS - GraphQL]
        GRPC[gRPC]
    end

    subgraph Data["Data Stack"]
        KAFKA[Apache Kafka]
        FLINK[Apache Flink]
        COCKROACH[CockroachDB]
        CASSANDRA[Cassandra]
        EVCACHE[EVCache]
    end

    subgraph ML["ML Stack"]
        HYDRA[Hydra Models]
        RUNWAY[Runway Lifecycle]
        PYTORCH[PyTorch]
    end

    subgraph Infra["Infrastructure"]
        TITUS[Titus - Containers]
        SPINNAKER[Spinnaker - CD]
        CHAOS[Chaos Monkey]
    end

    Client --> Gateway --> Service
    Service --> Data
    Service --> ML
    Data --> Infra
    ML --> Infra

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef ml fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef infra fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class GIBBON,EXO,AV,HTML5 client
    class ZUUL,ENVOY gateway
    class SPRING,DGS,GRPC service
    class KAFKA,FLINK,COCKROACH,CASSANDRA,EVCACHE data
    class HYDRA,RUNWAY,PYTORCH ml
    class TITUS,SPINNAKER,CHAOS infra
```

---

## Cross-Cutting Concerns

### Authentication & Authorization

```mermaid
flowchart LR
    C[Client] -->|Bearer Token| Z[Zuul]
    Z -->|Validate| AUTH[Auth Service]
    AUTH -->|Check| TOKEN[(Token Store)]
    AUTH -->|Verify| ENTITLE[Entitlements]
    ENTITLE -->|Region Check| RIGHTS[(Content Rights)]

    Z -->|Authorized Request| SERVICE[Core Services]
```

### Observability

| Concern | Tool | Purpose |
|---------|------|---------|
| Metrics | Atlas | Custom time-series DB |
| Tracing | Zipkin-style | Distributed request tracing |
| Logging | Structured logs | Centralized log aggregation |
| Alerting | Mantis | Real-time anomaly detection |

### Configuration Management

| Type | Solution | Example |
|------|----------|---------|
| Static Config | Archaius | Service endpoints, timeouts |
| Dynamic Config | Feature Flags | A/B tests, rollouts |
| Secrets | Vault-like | API keys, DB credentials |

---

*Next: [Low-Level Design →](./03-low-level-design.md)*
