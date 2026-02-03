# High-Level Design

## Overview

This document presents the system architecture for a live sports streaming platform capable of handling 59M+ concurrent viewers with extreme traffic spikes. The design prioritizes stability over ultra-low latency, employing multi-CDN orchestration, server-side ad insertion, and ladder-based scaling.

---

## System Architecture

```mermaid
flowchart TB
    subgraph Stadium["Stadium / Broadcast Center"]
        Feed[Live Feed<br/>SDI/HDMI]
        Encoder[Primary Encoder]
        BackupEnc[Backup Encoder]
    end

    subgraph Ingest["Live Ingest Layer"]
        direction TB
        IngestLB[Ingest Load Balancer]
        Transcoder1[Transcoder Pool<br/>ABR Ladder]
        Packager1[Packager<br/>HLS/DASH/CMAF]
        SegmentStore[(Segment Store<br/>S3/Hot Storage)]
    end

    subgraph Origin["Origin Layer"]
        OriginShield[Origin Shield<br/>Request Coalescing]
        ManifestGen[Manifest Generator<br/>Per-Language]
    end

    subgraph SSAI["SSAI Layer"]
        AdDecision[Ad Decision Engine<br/>Demographic Groups]
        AdStitcher[Ad Stitcher]
        AdPodCache[(Pre-computed<br/>Ad Pods)]
    end

    subgraph CDN["Multi-CDN Edge"]
        direction LR
        Akamai[Akamai<br/>Primary]
        CDN2[CloudFront<br/>Backup 1]
        CDN3[Fastly<br/>Backup 2]
        CDNSteer[CDN Steering<br/>Service]
    end

    subgraph Clients["Client Layer"]
        Mobile[Mobile 70%<br/>iOS/Android]
        Web[Web 15%<br/>Chrome/Safari]
        TV[Smart TV 15%<br/>Fire Stick/Roku]
    end

    subgraph Control["Control Plane"]
        Gateway[API Gateway]
        Auth[Auth Service]
        Entitlement[Entitlement<br/>Service]
        DRM[DRM License<br/>Server]
        Config[Config Service<br/>Feature Flags]
    end

    subgraph Data["Data Platform"]
        Kafka[Kafka Cluster]
        Flink[Apache Flink<br/>Stream Processing]
        TSDB[InfluxDB/Victoria<br/>Metrics]
        ViewerCount[Real-time<br/>Viewer Count]
    end

    Feed --> Encoder --> IngestLB
    BackupEnc --> IngestLB
    IngestLB --> Transcoder1 --> Packager1
    Packager1 --> SegmentStore
    SegmentStore --> OriginShield
    OriginShield --> ManifestGen

    ManifestGen --> AdStitcher
    AdDecision --> AdStitcher
    AdPodCache --> AdStitcher

    AdStitcher --> Akamai
    AdStitcher --> CDN2
    AdStitcher --> CDN3
    CDNSteer --> Akamai
    CDNSteer --> CDN2
    CDNSteer --> CDN3

    Akamai --> Mobile
    Akamai --> Web
    Akamai --> TV

    Mobile -.-> Gateway
    Web -.-> Gateway
    TV -.-> Gateway

    Gateway --> Auth
    Gateway --> Entitlement
    Gateway --> DRM
    Gateway --> Config

    Akamai -.-> Kafka
    Kafka --> Flink
    Flink --> TSDB
    Flink --> ViewerCount

    classDef stadium fill:#ffecb3,stroke:#ff6f00,stroke-width:2px
    classDef ingest fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef origin fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ssai fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef cdn fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef control fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class Feed,Encoder,BackupEnc stadium
    class IngestLB,Transcoder1,Packager1,SegmentStore ingest
    class OriginShield,ManifestGen origin
    class AdDecision,AdStitcher,AdPodCache ssai
    class Akamai,CDN2,CDN3,CDNSteer cdn
    class Mobile,Web,TV client
    class Gateway,Auth,Entitlement,DRM,Config control
    class Kafka,Flink,TSDB,ViewerCount data
```

---

## Component Descriptions

### Stadium / Broadcast Center

| Component | Responsibility | Details |
|-----------|----------------|---------|
| Live Feed | Raw video input | SDI/HDMI from cameras |
| Primary Encoder | Initial encoding | Low-latency H.264/HEVC |
| Backup Encoder | Redundancy | Hot standby, automatic failover |

### Live Ingest Layer

| Component | Responsibility | Scaling |
|-----------|----------------|---------|
| Ingest Load Balancer | Route feeds to transcoders | Active-passive |
| Transcoder Pool | ABR ladder creation | 6 quality tiers × N redundancy |
| Packager | HLS/DASH/CMAF segmentation | 4-second segments |
| Segment Store | Hot segment storage | S3 with edge caching |

### Origin Layer

| Component | Responsibility | Key Feature |
|-----------|----------------|-------------|
| Origin Shield | Request coalescing | Collapse 1M requests to 1 origin fetch |
| Manifest Generator | Per-user manifests | Language, quality, ad markers |

### SSAI Layer

| Component | Responsibility | Scale |
|-----------|----------------|-------|
| Ad Decision Engine | Targeting logic | 50-100 demographic groups |
| Ad Stitcher | Manifest manipulation | Seamless ad insertion |
| Ad Pod Cache | Pre-computed ad sequences | Per demographic group |

### Multi-CDN Edge

| CDN | Role | Traffic Share |
|-----|------|---------------|
| Akamai | Primary | 70% |
| CloudFront | Backup 1 | 20% |
| Fastly | Backup 2 | 10% |
| CDN Steering | Traffic director | Real-time decisions |

### Control Plane

| Service | Responsibility | SLO |
|---------|----------------|-----|
| API Gateway | Request routing | < 50ms P99 |
| Auth Service | User authentication | < 50ms P99 |
| Entitlement | Subscription validation | 99%+ cache hit |
| DRM License | Key delivery | < 200ms P99 |
| Config Service | Feature flags | Eventually consistent |

### Data Platform

| Component | Responsibility | Throughput |
|-----------|----------------|------------|
| Kafka | Event streaming | 10M+ events/sec |
| Apache Flink | Stream processing | Real-time aggregation |
| Time Series DB | Metrics storage | 1M+ points/sec |
| Viewer Count | Real-time counter | 59M concurrent |

---

## Data Flow: Live Streaming

```mermaid
sequenceDiagram
    autonumber
    participant Stadium as Stadium Feed
    participant Trans as Transcoder
    participant Pack as Packager
    participant Origin as Origin Shield
    participant SSAI as Ad Stitcher
    participant CDN as CDN Edge
    participant Client as Mobile App

    Stadium->>Trans: Raw feed (1080p60)
    Trans->>Trans: ABR encoding (6 qualities)
    Trans->>Pack: Encoded streams
    Pack->>Pack: Segment (4s chunks)
    Pack->>Origin: Segments + base manifest

    Client->>CDN: Request manifest
    CDN->>Origin: Cache miss
    Origin->>SSAI: Generate personalized manifest
    SSAI->>SSAI: Insert ad markers
    SSAI->>CDN: Stitched manifest
    CDN->>Client: Return manifest

    loop Every 4 seconds
        Client->>CDN: Request segment N
        alt Cache hit
            CDN->>Client: Return cached segment
        else Cache miss
            CDN->>Origin: Fetch segment
            Origin->>CDN: Return segment
            CDN->>Client: Return segment
        end
    end

    Note over Client,CDN: Latency: 30-40s glass-to-glass
```

### Latency Breakdown

| Stage | Latency | Cumulative |
|-------|---------|------------|
| Capture to encoder | ~1s | 1s |
| Encoding (ABR) | ~3s | 4s |
| Packaging | ~2s | 6s |
| Origin to CDN | ~1s | 7s |
| CDN propagation | ~2s | 9s |
| Segment duration | 4s | 13s |
| Player buffer | 12-16s | 25-29s |
| Network jitter buffer | 5-10s | 30-39s |

---

## Data Flow: SSAI (Ad Insertion)

```mermaid
sequenceDiagram
    autonumber
    participant Client as Mobile App
    participant CDN as CDN Edge
    participant Stitch as Ad Stitcher
    participant AdSrv as Ad Decision
    participant AdCache as Ad Pod Cache

    Note over Client: Ad break marker detected

    Client->>CDN: Request ad manifest
    CDN->>Stitch: Forward request + user context

    Stitch->>Stitch: Identify demographic group
    alt Pre-computed pod available
        Stitch->>AdCache: Fetch cached ad pod
        AdCache->>Stitch: Return ad sequence
    else Compute new pod
        Stitch->>AdSrv: Request ad decision
        AdSrv->>AdSrv: Run targeting logic
        AdSrv->>Stitch: Return ad URLs
    end

    Stitch->>Stitch: Stitch ads into manifest
    Stitch->>CDN: Return stitched manifest
    CDN->>Client: Ad manifest

    loop For each ad segment
        Client->>CDN: Request ad segment
        CDN->>Client: Return (cached) ad segment
    end

    Client->>Stitch: Beacon: ad impression
    Stitch->>AdSrv: Log impression (async)

    Note over Client: Resume live content
```

### SSAI Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SSAI vs CSAI | SSAI | No ad-blocker bypass, unified QoE |
| Targeting granularity | 50-100 groups | Balance personalization vs cache efficiency |
| Ad pod caching | Yes | Reduce ad server load at scale |
| Fallback strategy | Generic ads | Never fail to show ads |

---

## Data Flow: Traffic Spike Handling

```mermaid
sequenceDiagram
    autonumber
    participant Sched as Match Scheduler
    participant Scale as Auto-Scaler
    participant Infra as AWS Infrastructure
    participant Shield as Origin Shield
    participant CDN as Multi-CDN

    Note over Sched: T-60 minutes: Match scheduled

    Sched->>Scale: Trigger L1 scaling
    Scale->>Infra: Provision 2x baseline
    Infra->>Scale: Ready (90s)

    Note over Sched: T-30 minutes: Toss time

    Sched->>Scale: Trigger L2 scaling
    Scale->>Infra: Provision 5x baseline
    Infra->>Scale: Ready
    Scale->>Shield: Warm cache

    Note over Sched: T-10 minutes: Pre-match

    Sched->>Scale: Trigger L3 scaling
    Scale->>Infra: Provision 10x baseline
    Scale->>CDN: Pre-position content

    Note over Sched: T-0: Match starts

    par Thundering herd arrives
        CDN->>Shield: 1M concurrent requests
        Shield->>Shield: Coalesce to 1 origin request
        Shield->>CDN: Single response, fan out
    end

    Note over Scale: Monitor and react

    loop Reactive scaling
        Scale->>Scale: Check metrics
        alt Capacity < 80%
            Scale->>Infra: Add instances
        end
    end
```

### Scaling Ladder

| Level | Trigger | Capacity | Action |
|-------|---------|----------|--------|
| L0 | Always | 1x baseline | Normal operation |
| L1 | T-60 min | 2x baseline | Pre-warm |
| L2 | T-30 min | 5x baseline | Cache warming |
| L3 | T-10 min | 10x baseline | Full pre-positioning |
| L4 | Reactive | 20x+ baseline | Dynamic scaling |

---

## Key Architectural Decisions

### 1. Multi-CDN with Origin Shield

**Decision**: Use multiple CDNs with an origin shield layer

```
┌─────────────────────────────────────────────────────────────┐
│                        Origin Shield                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Request Coalescing Engine               │   │
│  │                                                      │   │
│  │  1,000,000 requests  ──────►  1 origin request      │   │
│  │  for same segment           + fan-out response      │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────┐        ┌─────────┐        ┌─────────┐
   │ Akamai  │        │CloudFront│       │ Fastly  │
   │  (70%)  │        │  (20%)  │        │  (10%)  │
   └─────────┘        └─────────┘        └─────────┘
```

**Rationale**:
- No single CDN can handle 80+ Tbps alone
- Origin protection from thundering herd
- Failover capability for regional outages
- Negotiate better rates with competition

### 2. 30-40 Second Latency Trade-off

**Decision**: Target 30-40s glass-to-glass, not ultra-low (<10s)

| Factor | Ultra-Low (<10s) | Our Choice (30-40s) |
|--------|------------------|---------------------|
| Buffer size | 2-3 segments | 8-10 segments |
| Rebuffering | Higher risk | Very low |
| ABR stability | Difficult | Stable |
| Scale | Challenging | Proven at 59M |
| Social media sync | Near real-time | Slight delay |

**Rationale**: At 59M concurrent viewers, stability beats speed. A 1% rebuffer event affects 590,000 users simultaneously.

### 3. SSAI Over CSAI

**Decision**: Server-Side Ad Insertion

| Aspect | CSAI (Client-Side) | SSAI (Server-Side) |
|--------|-------------------|-------------------|
| Ad blockers | Bypassable | Immune |
| Stream continuity | Visible switch | Seamless |
| Analytics | Client-dependent | Unified |
| Scale complexity | Lower | Higher |
| Personalization | Full | Group-based |

**Rationale**: Revenue protection and unified QoE measurement justify the complexity.

### 4. Mobile-First Architecture

**Decision**: Optimize for mobile (70% of traffic)

| Optimization | Implementation |
|--------------|----------------|
| Bitrate ladder | Include 360p, 480p tiers |
| Segment size | 4s (balance bandwidth estimation) |
| Startup quality | Start low, upgrade fast |
| Offline mode | Download for poor connectivity |
| Battery | Efficient codecs, adaptive polling |

---

## Architecture Pattern Checklist

| Pattern | Applied | Implementation |
|---------|---------|----------------|
| Load Balancing | Yes | CDN steering, API gateway |
| Caching | Yes | Multi-tier: CDN, Origin Shield, App |
| Circuit Breaker | Yes | CDN failover, SSAI fallback |
| Bulkhead | Yes | Isolated services, separate pools |
| CQRS | Partial | Read-heavy, eventual consistency |
| Event Sourcing | Yes | Kafka for analytics events |
| Saga | No | Not needed for streaming |
| Sidecar | Yes | Metrics collection, logging |
| Gateway | Yes | API Gateway, CDN steering |
| Strangler | No | Greenfield design |

---

## Component Interaction Matrix

| Component | Depends On | Depended By |
|-----------|------------|-------------|
| Transcoder | Ingest LB | Packager |
| Packager | Transcoder | Origin Shield |
| Origin Shield | Packager, Segment Store | Ad Stitcher, CDN |
| Ad Stitcher | Origin Shield, Ad Decision | CDN |
| CDN | Ad Stitcher | Clients |
| API Gateway | - | Auth, Entitlement, DRM |
| Auth Service | - | API Gateway |
| Kafka | CDN (events) | Flink |
| Flink | Kafka | TSDB, Viewer Count |

---

## Next Steps

See [03-low-level-design.md](./03-low-level-design.md) for detailed data models, API specifications, and algorithms.
