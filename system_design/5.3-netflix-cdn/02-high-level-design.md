# High-Level Design

[← Back to Index](./00-index.md) | [Previous: Requirements](./01-requirements-and-estimations.md) | [Next: Low-Level Design →](./03-low-level-design.md)

---

## Architecture Overview

Netflix Open Connect separates the **Control Plane** (AWS-hosted services managing routing, fill, and monitoring) from the **Data Plane** (globally distributed OCAs serving video content). This separation allows centralized intelligence with distributed delivery.

```mermaid
flowchart TB
    subgraph Clients["Client Devices"]
        direction LR
        TV[Smart TV]
        PHONE[Mobile]
        WEB[Browser]
        CONSOLE[Console]
    end

    subgraph AWS["AWS Control Plane (Centralized)"]
        subgraph PlaybackStack["Playback Stack"]
            AUTH[Auth Service]
            PLAYBACK[Playback Service]
            LICENSE[License Service]
        end

        subgraph SteeringStack["Steering Stack"]
            STEER[Steering Service]
            HEALTH[Health Aggregator]
            PROXIMITY[Proximity Ranker]
        end

        subgraph FillStack["Fill Stack"]
            FILLCTRL[Fill Controller]
            POPULARITY[Popularity Predictor]
            MANIFEST[Manifest Generator]
        end

        subgraph DataPipeline["Data Pipeline"]
            KAFKA[Kafka Cluster]
            METRICS[Metrics Store]
        end
    end

    subgraph OpenConnect["Open Connect Data Plane (Distributed)"]
        subgraph IXP1["IXP - Americas"]
            STORAGE1[Storage OCAs<br/>Full Catalog]
        end
        subgraph IXP2["IXP - Europe"]
            STORAGE2[Storage OCAs<br/>Full Catalog]
        end
        subgraph ISP1["ISP Network A"]
            EDGE1[Edge OCAs<br/>Popular Content]
        end
        subgraph ISP2["ISP Network B"]
            EDGE2[Edge OCAs<br/>Popular Content]
        end
    end

    subgraph Origin["Origin Storage"]
        S3[(S3<br/>Master Content)]
    end

    %% Client flows
    Clients -->|1. Playback Request| PLAYBACK
    PLAYBACK --> AUTH
    PLAYBACK --> LICENSE
    PLAYBACK -->|2. Get OCA URLs| STEER
    STEER --> HEALTH
    STEER --> PROXIMITY
    STEER -->|3. Ranked OCA List| PLAYBACK
    PLAYBACK -->|4. URLs| Clients

    %% Streaming flows
    Clients -->|5. Stream Video| EDGE1
    Clients -->|5. Stream Video| EDGE2
    EDGE1 -->|Cache Miss| STORAGE1
    EDGE2 -->|Cache Miss| STORAGE2

    %% Fill flows
    POPULARITY --> FILLCTRL
    FILLCTRL --> MANIFEST
    MANIFEST -->|Fill Manifest| STORAGE1 & STORAGE2
    S3 -->|SFI Fill| STORAGE1 & STORAGE2
    STORAGE1 -->|Fill| EDGE1
    STORAGE2 -->|Fill| EDGE2

    %% Telemetry
    EDGE1 & EDGE2 -->|Health + Metrics| KAFKA
    KAFKA --> HEALTH
    KAFKA --> METRICS

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef aws fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef cdn fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef origin fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef pipeline fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px

    class TV,PHONE,WEB,CONSOLE client
    class AUTH,PLAYBACK,LICENSE,STEER,HEALTH,PROXIMITY,FILLCTRL,POPULARITY,MANIFEST aws
    class KAFKA,METRICS pipeline
    class STORAGE1,STORAGE2,EDGE1,EDGE2 cdn
    class S3 origin
```

---

## Control Plane vs Data Plane

| Aspect | Control Plane | Data Plane |
|--------|--------------|------------|
| **Location** | AWS (centralized) | Global (ISPs, IXPs) |
| **Function** | Routing decisions, fill scheduling | Video serving |
| **State** | Stateful (health, manifests) | Stateless (content cache) |
| **Scaling** | Vertical + horizontal (AWS) | Horizontal (add OCAs) |
| **Failure Impact** | Steering degradation | Local traffic affected |
| **Update Frequency** | Continuous | Nightly fill |

---

## Two-Tier OCA Architecture

```mermaid
flowchart TB
    subgraph Origin["AWS Origin"]
        S3[(S3 Storage<br/>Master Content)]
    end

    subgraph Tier1["Tier 1: Storage Appliances (IXP)"]
        subgraph IXP_US["IXP - US West"]
            S_US[Storage OCAs<br/>Full Catalog<br/>360TB each]
        end
        subgraph IXP_EU["IXP - Europe"]
            S_EU[Storage OCAs<br/>Full Catalog<br/>360TB each]
        end
        subgraph IXP_APAC["IXP - APAC"]
            S_APAC[Storage OCAs<br/>Full Catalog<br/>360TB each]
        end
    end

    subgraph Tier2["Tier 2: Edge Appliances (ISP Embedded)"]
        subgraph ISP_ATT["AT&T Network"]
            E_ATT[Edge OCAs<br/>Popular 10%<br/>120TB each]
        end
        subgraph ISP_COMCAST["Comcast Network"]
            E_COMCAST[Edge OCAs<br/>Popular 10%<br/>120TB each]
        end
        subgraph ISP_VODAFONE["Vodafone Network"]
            E_VODAFONE[Edge OCAs<br/>Popular 10%<br/>120TB each]
        end
    end

    subgraph Users["End Users"]
        U1[ATT Subscribers]
        U2[Comcast Subscribers]
        U3[Vodafone Subscribers]
    end

    S3 -->|SFI Peering<br/>Nightly Fill| S_US & S_EU & S_APAC
    S_US -->|Fill| E_ATT
    S_US -->|Fill| E_COMCAST
    S_EU -->|Fill| E_VODAFONE

    E_ATT -->|Cache Miss| S_US
    E_COMCAST -->|Cache Miss| S_US
    E_VODAFONE -->|Cache Miss| S_EU

    U1 -->|95% Traffic| E_ATT
    U2 -->|95% Traffic| E_COMCAST
    U3 -->|95% Traffic| E_VODAFONE

    classDef origin fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef storage fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef edge fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef user fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class S3 origin
    class S_US,S_EU,S_APAC storage
    class E_ATT,E_COMCAST,E_VODAFONE edge
    class U1,U2,U3 user
```

### Tier Responsibilities

| Tier | Location | Storage | Content | Fill Source | Traffic |
|------|----------|---------|---------|-------------|---------|
| **Storage** | IXPs | 360 TB | Full catalog | S3 via SFI | Long-tail, cache miss |
| **Edge** | ISP networks | 120 TB | Popular 5-10% | Storage OCAs | 95%+ of streaming |

---

## Data Flow: Video Playback

```mermaid
sequenceDiagram
    participant Client as Client Device
    participant Playback as Playback Service
    participant Steering as Steering Service
    participant EdgeOCA as Edge OCA (ISP)
    participant StorageOCA as Storage OCA (IXP)

    Client->>Playback: 1. Play "Stranger Things S5E1"
    Playback->>Playback: 2. Check auth, license, device
    Playback->>Steering: 3. Get OCA URLs for files

    Note over Steering: Check client IP<br/>Get ISP from BGP<br/>Compute proximity rank<br/>Check OCA health

    Steering-->>Playback: 4. Ranked OCA list [OCA1, OCA2, OCA3]
    Playback-->>Client: 5. Manifest with OCA URLs

    Client->>EdgeOCA: 6. GET /video/segment_001.mp4

    alt Cache Hit (95%+ cases)
        EdgeOCA-->>Client: 7a. Stream segment
    else Cache Miss
        EdgeOCA->>StorageOCA: 7b. Fetch from Storage
        StorageOCA-->>EdgeOCA: Return segment
        EdgeOCA-->>Client: Stream segment
    end

    loop Adaptive Streaming
        Client->>EdgeOCA: GET next segment
        EdgeOCA-->>Client: Stream segment
    end
```

---

## Data Flow: Nightly Fill

```mermaid
sequenceDiagram
    participant Popularity as Popularity Predictor
    participant FillCtrl as Fill Controller
    participant Manifest as Manifest Generator
    participant S3 as S3 Origin
    participant StorageOCA as Storage OCA (IXP)
    participant EdgeOCA as Edge OCA (ISP)

    Note over Popularity: Analyze viewing data<br/>Predict next-day demand<br/>At file-level granularity

    Popularity->>FillCtrl: 1. Popularity scores per file
    FillCtrl->>Manifest: 2. Generate fill manifest

    Note over Manifest: Determine files per OCA<br/>Based on region, ISP, capacity<br/>Priority: Popular > Long-tail

    Manifest->>StorageOCA: 3. Push fill manifest
    Manifest->>EdgeOCA: 3. Push fill manifest

    Note over StorageOCA,EdgeOCA: Off-peak window starts<br/>(ISP-configured time)

    S3->>StorageOCA: 4. SFI peering transfer<br/>(new/updated files)

    loop Fill Window (6-8 hours)
        StorageOCA->>EdgeOCA: 5. Transfer popular content
        EdgeOCA->>EdgeOCA: Delete unpopular files<br/>Add new files
    end

    Note over EdgeOCA: Ready before peak hours
```

---

## Fill Traffic Management

### Fill Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| **Scheduled Fill** | Nightly during off-peak window | Regular content updates |
| **Priority Fill** | Immediate propagation | New releases, hotfixes |
| **Peer Fill** | OCA-to-OCA within cluster | Load balancing |
| **Tier Fill** | Storage OCA to Edge OCA | Standard hierarchy |

### Fill Window Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TYPICAL 24-HOUR OCA TRAFFIC PATTERN                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Traffic                                                                     │
│    │                              ┌─────────┐                                │
│    │                            ╱            ╲                               │
│    │                          ╱                ╲    ← Peak (Evening)         │
│    │                        ╱                    ╲                           │
│    │                      ╱                        ╲                         │
│    │  ╲                 ╱                            ╲                 ╱     │
│    │    ╲             ╱                                ╲             ╱       │
│    │      ╲         ╱                                    ╲         ╱         │
│    │        ╲─────╱                                        ╲─────╱           │
│    │   │←─────────────────→│                                                 │
│    │   │   FILL WINDOW     │ ← Off-Peak (2am-8am local)                      │
│    └───┴───────────────────┴──────────────────────────────────────────────   │
│        00   04   08   12   16   20   24   (Hours)                            │
│                                                                              │
│  Fill Window Activities:                                                     │
│  • Download new/updated content from upstream                                │
│  • Delete content no longer in manifest                                      │
│  • Software updates (if needed)                                              │
│  • Health checks and self-repair                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Steering Architecture

### Steering Service Components

```mermaid
flowchart LR
    subgraph Input["Input Data"]
        BGP[BGP Routes<br/>from ISPs]
        HEALTH[OCA Health<br/>Reports]
        CONTENT[Content<br/>Inventory]
        CLIENT[Client IP<br/>& Device]
    end

    subgraph SteeringService["Steering Service"]
        LOOKUP[IP-to-ISP<br/>Lookup]
        PROXIMITY[Proximity<br/>Ranker]
        HEALTHCHECK[Health<br/>Filter]
        SELECTOR[OCA<br/>Selector]
    end

    subgraph Output["Output"]
        URLS[Ranked OCA<br/>URL List]
    end

    BGP --> LOOKUP
    CLIENT --> LOOKUP
    LOOKUP --> PROXIMITY
    HEALTH --> HEALTHCHECK
    HEALTHCHECK --> SELECTOR
    PROXIMITY --> SELECTOR
    CONTENT --> SELECTOR
    SELECTOR --> URLS

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef service fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef output fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class BGP,HEALTH,CONTENT,CLIENT input
    class LOOKUP,PROXIMITY,HEALTHCHECK,SELECTOR service
    class URLS output
```

### Steering Decision Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| **BGP AS-PATH Length** | High | Prefer embedded OCAs (AS-PATH=1) over IXP (AS-PATH=2) |
| **Content Availability** | High | OCA must have requested files |
| **OCA Health** | High | CPU, disk, network utilization |
| **Geographic Proximity** | Medium | Minimize network hops |
| **Load Distribution** | Medium | Balance across cluster |
| **Historical Performance** | Low | Past serving quality |

---

## BGP-Based Routing

### BGP Integration Model

```mermaid
flowchart TB
    subgraph Netflix["Netflix AS 40027"]
        CTRL[Control Plane]
    end

    subgraph IXP["IXP Location"]
        STORAGE[Storage OCAs<br/>Announce: ISP Prefixes<br/>AS-PATH: 40027]
    end

    subgraph ISP["ISP AS 12345"]
        ROUTER[ISP Router]
        EDGE[Edge OCAs<br/>Announce: ISP Prefixes<br/>AS-PATH: 40027]
    end

    subgraph Subscriber["ISP Subscriber"]
        CLIENT[Netflix Client]
    end

    CTRL -->|BGP Peering| STORAGE
    STORAGE -->|BGP Peering| ROUTER
    ROUTER -->|BGP Session| EDGE

    CLIENT -->|Route via| EDGE
    EDGE -->|Fallback| STORAGE

    Note1[Embedded OCA: AS-PATH length = 1<br/>IXP OCA: AS-PATH length = 2<br/>Steering prefers shorter path]

    classDef netflix fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef ixp fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef isp fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class CTRL netflix
    class STORAGE ixp
    class ROUTER,EDGE isp
    class CLIENT client
```

### BGP Configuration

| Parameter | Value | Notes |
|-----------|-------|-------|
| Netflix ASN | 40027 | Global Netflix identifier |
| IPv4 Prefixes | /8 to /24 | Accepted range |
| IPv6 Prefixes | /19 to /48 | Accepted range |
| Communities | Not used | Netflix ignores ISP communities |
| Session Type | eBGP | External BGP with ISPs |

---

## Key Architectural Decisions

### Decision 1: Own CDN vs Third-Party

| Option | Pros | Cons |
|--------|------|------|
| **Third-Party CDN** | Lower upfront cost, faster deployment | Per-bandwidth fees, reactive caching only |
| **Own CDN (Chosen)** | Full control, proactive caching, ISP relationships | $1B+ investment, operational complexity |

**Rationale:** At Netflix's scale (15%+ of internet traffic), owning the CDN provides:
- Cost savings vs CDN fees at this volume
- Proactive caching impossible with reactive CDNs
- ISP partnership relationships as competitive advantage
- Video-specific optimizations (AV1, film grain synthesis)

### Decision 2: Two-Tier vs Single-Tier

| Option | Pros | Cons |
|--------|------|------|
| **Single Tier (Edge only)** | Simpler architecture | Every OCA needs full catalog |
| **Two-Tier (Chosen)** | Storage efficiency, tiered caching | More complex fill management |

**Rationale:** Two-tier allows:
- Edge OCAs to cache only popular content (120TB vs 360TB)
- Storage OCAs as cache miss fallback
- Efficient use of ISP facility space/power
- Full catalog available via IXP backup

### Decision 3: Proactive vs Reactive Caching

| Option | Pros | Cons |
|--------|------|------|
| **Reactive** | Simple, cache-on-demand | First viewer has cache miss |
| **Proactive (Chosen)** | Content always available | Requires popularity prediction |

**Rationale:** Netflix's subscription model enables proactive caching:
- Known catalog (~17K titles) vs millions of UGC
- Predictable viewing patterns from historical data
- New releases have scheduled launch dates
- Off-peak fill windows don't impact viewing

### Decision 4: BGP Steering vs Anycast

| Option | Pros | Cons |
|--------|------|------|
| **Anycast** | Simple, automatic failover | Less control, session stickiness issues |
| **BGP Steering (Chosen)** | Fine-grained control, ISP integration | More complex, requires ISP cooperation |

**Rationale:** BGP steering enables:
- Preference for embedded OCAs (AS-PATH=1)
- Integration with ISP routing infrastructure
- Explicit failover control via path selection
- SFI peering for fill traffic

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| Sync vs Async | Both | Sync for playback requests, async for fill |
| Event-driven vs Request-response | Request-response | Streaming is request-driven |
| Push vs Pull | Push (fill) | Proactive content distribution |
| Stateless vs Stateful | Stateless (OCAs) | Content cache, no user state |
| Read-heavy vs Write-heavy | Read-heavy | 99:1 ratio, optimize for serving |
| Real-time vs Batch | Batch (fill) | Nightly content updates |
| Edge vs Origin | Edge-heavy | 95%+ traffic from OCAs |

---

## High-Level Component Summary

| Component | Responsibility | Scale | Technology |
|-----------|----------------|-------|------------|
| **Playback Service** | Auth, licensing, manifest | 100K+ req/s | AWS |
| **Steering Service** | OCA selection, URL generation | 100K+ req/s | AWS |
| **Fill Controller** | Schedule content distribution | Daily batch | AWS |
| **Popularity Predictor** | Forecast demand per file | Daily ML pipeline | AWS |
| **Storage OCAs** | Full catalog cache, fill source | ~2,000 appliances | FreeBSD/NGINX |
| **Edge OCAs** | Popular content, serving | ~17,000 appliances | FreeBSD/NGINX |
| **Health Aggregator** | OCA monitoring, alerting | 300K reports/min | AWS/Kafka |

---

*Next: [Low-Level Design →](./03-low-level-design.md)*
