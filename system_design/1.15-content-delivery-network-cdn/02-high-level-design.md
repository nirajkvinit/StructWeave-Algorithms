# High-Level Design

[← Back to Index](./00-index.md)

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Key Design Decisions](#key-design-decisions)
- [Communication Patterns](#communication-patterns)

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph Users["End Users"]
        U1[User - Asia]
        U2[User - Europe]
        U3[User - Americas]
    end

    subgraph DNS["DNS Layer"]
        AD[Anycast DNS / GeoDNS]
    end

    subgraph EdgeLayer["Edge Layer (L1 Cache)"]
        subgraph PoP1["Tokyo PoP"]
            LB1[Load Balancer]
            E1A[Edge Server 1]
            E1B[Edge Server 2]
        end
        subgraph PoP2["Frankfurt PoP"]
            LB2[Load Balancer]
            E2A[Edge Server 1]
            E2B[Edge Server 2]
        end
        subgraph PoP3["Virginia PoP"]
            LB3[Load Balancer]
            E3A[Edge Server 1]
            E3B[Edge Server 2]
        end
    end

    subgraph ShieldLayer["Origin Shield Layer (L2 Cache)"]
        OS1[Shield - Asia Pacific]
        OS2[Shield - Europe]
        OS3[Shield - Americas]
    end

    subgraph Origin["Origin Layer"]
        OM[Origin Manager]
        O1[(Origin Server)]
        O2[(Object Storage)]
    end

    subgraph Control["Control Plane"]
        CP[Control Plane]
        PM[Purge Manager]
        CM[Config Manager]
        AN[Analytics]
    end

    U1 --> AD
    U2 --> AD
    U3 --> AD

    AD --> |"Anycast/GeoDNS"| LB1 & LB2 & LB3

    LB1 --> E1A & E1B
    LB2 --> E2A & E2B
    LB3 --> E3A & E3B

    E1A & E1B --> |"Cache Miss"| OS1
    E2A & E2B --> |"Cache Miss"| OS2
    E3A & E3B --> |"Cache Miss"| OS3

    OS1 & OS2 & OS3 --> |"Shield Miss"| OM
    OM --> O1 & O2

    CP --> E1A & E1B & E2A & E2B & E3A & E3B
    PM --> OS1 & OS2 & OS3
    AN --> LB1 & LB2 & LB3
```

---

## Core Components

### 1. DNS Layer

Routes users to the nearest PoP using one of two strategies:

```mermaid
flowchart LR
    subgraph "Anycast Routing"
        direction TB
        U1[User] --> |"Resolves cdn.example.com"| DNS1[DNS Server]
        DNS1 --> |"Returns: 192.0.2.1"| U1
        U1 --> |"BGP routes to nearest"| E1[Nearest Edge]
    end

    subgraph "GeoDNS Routing"
        direction TB
        U2[User] --> |"Resolves cdn.example.com"| DNS2[DNS Server]
        DNS2 --> |"Checks user IP"| GEO[GeoIP Database]
        GEO --> |"User is in Asia"| DNS2
        DNS2 --> |"Returns: 192.0.2.10<br/>(Tokyo PoP IP)"| U2
    end
```

| Routing Type | Mechanism | Failover Speed | Best For |
|--------------|-----------|----------------|----------|
| **Anycast** | Same IP announced via BGP from all PoPs | Seconds (BGP) | Stateless content |
| **GeoDNS** | Different IP per region via DNS | Minutes (TTL) | Session stickiness |

### 2. Edge Layer (L1 Cache)

Edge servers at each PoP handle user requests, TLS termination, and content caching.

```mermaid
flowchart TB
    subgraph EdgeServer["Edge Server Architecture"]
        TLS[TLS Termination]
        HTTP[HTTP Parser]

        subgraph CacheLayer["Cache Layer"]
            HotCache[Hot Cache<br/>In-Memory<br/>1GB LRU]
            WarmCache[Warm Cache<br/>SSD<br/>100TB]
        end

        REQ[Request Router]
        CONN[Connection Pool<br/>to Shield]
    end

    Client --> TLS
    TLS --> HTTP
    HTTP --> REQ

    REQ --> |"Check"| HotCache
    HotCache --> |"Miss"| WarmCache
    WarmCache --> |"Miss"| CONN

    CONN --> Shield
```

**Responsibilities:**
- TLS termination (HTTPS)
- HTTP/2 and HTTP/3 (QUIC) support
- Cache lookup and storage
- Request routing to shield on miss
- Response compression (gzip, brotli)
- Access logging

### 3. Origin Shield Layer (L2 Cache)

Intermediate cache that collapses requests to origin, reducing origin load.

```mermaid
flowchart TB
    subgraph Shield["Origin Shield"]
        RC[Request Coalescing]
        CACHE[Regional Cache<br/>200TB SSD]
        OM[Origin Mapper]
        CB[Circuit Breaker]
    end

    E1[Edge PoP 1] --> |"Miss"| RC
    E2[Edge PoP 2] --> |"Miss"| RC
    E3[Edge PoP 3] --> |"Miss"| RC

    RC --> |"Single Request"| CACHE
    CACHE --> |"Miss"| OM
    OM --> |"Map to Origin"| CB
    CB --> Origin
```

**Responsibilities:**
- Request collapsing (deduplication)
- Regional cache for all edge PoPs in region
- Circuit breaker for origin protection
- Multi-origin failover
- Serve stale on origin failure

### 4. Origin Layer

Customer's infrastructure serving original content.

**Supported Origin Types:**
- HTTP/HTTPS servers
- Object storage (S3-compatible)
- Load balancers
- Other CDNs (origin stacking)

### 5. Control Plane

Manages configuration, purging, and analytics.

```mermaid
flowchart TB
    subgraph ControlPlane["Control Plane"]
        API[API Gateway]

        subgraph Services["Core Services"]
            CFG[Config Service]
            PURGE[Purge Service]
            CERT[Certificate Manager]
            ANALYTICS[Analytics Service]
        end

        subgraph Storage["Storage"]
            KV[(Config KV Store)]
            TS[(Time-Series DB)]
            LOG[(Log Storage)]
        end
    end

    Customer --> API
    API --> CFG & PURGE & CERT & ANALYTICS

    CFG --> KV
    ANALYTICS --> TS
    PURGE --> |"Fan-out to all PoPs"| Edge

    KV --> |"Config Push"| Edge
```

---

## Data Flow

### Cache Hit Flow (Happy Path)

```mermaid
sequenceDiagram
    participant User
    participant DNS
    participant Edge as Edge Server
    participant Cache as Local Cache

    User->>DNS: Resolve cdn.example.com
    DNS->>User: 192.0.2.1 (Anycast)

    User->>Edge: GET /image.jpg
    Edge->>Edge: TLS Termination
    Edge->>Cache: Lookup cache key
    Cache->>Edge: Cache HIT
    Edge->>User: 200 OK + Content

    Note over Edge: Total latency: 5-20ms
```

### Cache Miss Flow (Full Path)

```mermaid
sequenceDiagram
    participant User
    participant Edge as Edge Server
    participant Shield as Origin Shield
    participant Origin

    User->>Edge: GET /image.jpg
    Edge->>Edge: Cache MISS

    Edge->>Shield: GET /image.jpg
    Shield->>Shield: Cache MISS

    Shield->>Origin: GET /image.jpg
    Origin->>Shield: 200 OK + Content

    Shield->>Shield: Store in cache
    Shield->>Edge: 200 OK + Content

    Edge->>Edge: Store in cache
    Edge->>User: 200 OK + Content

    Note over User,Origin: Total latency: 100-500ms
```

### Request Coalescing Flow

```mermaid
sequenceDiagram
    participant E1 as Edge PoP 1
    participant E2 as Edge PoP 2
    participant E3 as Edge PoP 3
    participant Shield as Origin Shield
    participant Origin

    Note over E1,E3: Same content requested<br/>from multiple PoPs

    E1->>Shield: GET /video/segment.ts
    E2->>Shield: GET /video/segment.ts
    E3->>Shield: GET /video/segment.ts

    Shield->>Shield: Request already in flight
    Shield->>Shield: Add E2, E3 to waiters

    Shield->>Origin: GET /video/segment.ts (single request)
    Origin->>Shield: 200 OK + Content

    par Fan-out response
        Shield->>E1: 200 OK + Content
        Shield->>E2: 200 OK + Content
        Shield->>E3: 200 OK + Content
    end

    Note over Shield: Origin sees 1 request<br/>instead of 3
```

---

## Key Design Decisions

### Decision 1: Anycast vs GeoDNS Routing

| Approach | Pros | Cons |
|----------|------|------|
| **Anycast** | Fast failover (BGP), simple DNS, DDoS distribution | Session issues during failover, requires BGP expertise |
| **GeoDNS** | Session stickiness, fine-grained control | Slow failover (DNS TTL), complex DNS management |

**Decision: Anycast (Primary) + GeoDNS (Fallback)**

**Rationale:**
- Most CDN content is stateless (cacheable)
- Anycast provides faster failover (seconds vs minutes)
- DDoS traffic naturally distributes across all PoPs
- GeoDNS available for customers requiring stickiness

### Decision 2: Cache Hierarchy Depth

| Approach | Pros | Cons |
|----------|------|------|
| **Two-Tier (Edge → Origin)** | Simpler, lower latency | High origin load on cache misses |
| **Three-Tier (Edge → Shield → Origin)** | Better origin protection, higher hit rate | Additional hop latency, complexity |

**Decision: Three-Tier with Optional Shield**

**Rationale:**
- Origin shield reduces origin load by 90%+
- Request collapsing prevents thundering herd
- Regional caches improve hit rate for long-tail content
- Shield can be bypassed for latency-critical paths

### Decision 3: TLS Termination Strategy

| Approach | Pros | Cons |
|----------|------|------|
| **Edge Termination** | Caching possible, HTTP/2 multiplexing | Keys at edge, compliance concerns |
| **Pass-Through** | True E2E encryption, simpler | No caching, higher latency |

**Decision: Edge Termination with Secure Key Storage**

**Rationale:**
- Must decrypt to cache and optimize
- Keys stored in secure enclaves (HSM)
- Re-encrypt to origin (mTLS) for sensitive content
- Offer pass-through option for compliance needs

### Decision 4: Cache Invalidation Strategy

| Approach | Pros | Cons |
|----------|------|------|
| **TTL Only** | Simple, no coordination | Stale content until expiry |
| **TTL + Push Purge** | Fresh content on demand | Purge propagation delay |
| **Surrogate Keys** | Granular group purge | Additional metadata overhead |

**Decision: TTL + Push Purge + Surrogate Keys**

**Rationale:**
- TTL handles normal refresh (90% of cases)
- Push purge for urgent updates (breaking changes)
- Surrogate keys for efficient group invalidation
- stale-while-revalidate for zero-latency refresh

### Decision 5: HTTP Protocol Support

| Protocol | Pros | Cons |
|----------|------|------|
| **HTTP/1.1** | Universal support | Head-of-line blocking, many connections |
| **HTTP/2** | Multiplexing, header compression | TCP head-of-line blocking |
| **HTTP/3 (QUIC)** | 0-RTT, connection migration, no HoL | Newer, UDP-based (firewall issues) |

**Decision: Support All (HTTP/1.1, HTTP/2, HTTP/3)**

**Rationale:**
- HTTP/3 for mobile users (connection migration)
- HTTP/2 as default for most clients
- HTTP/1.1 fallback for legacy clients
- Protocol negotiation via ALPN

---

## Communication Patterns

### Edge-to-Shield Communication

```
Edge Server                    Shield
    |                            |
    |---- TCP/TLS Connection --->|
    |                            |
    |---- HTTP Request --------->|
    |<--- HTTP Response ---------|
    |                            |
    (Connection pooled for reuse)
```

**Connection Management:**
- Connection pooling (10-50 connections per edge → shield pair)
- Keep-alive for connection reuse
- Health checks for connection validation
- Circuit breaker for shield failures

### Purge Propagation

```mermaid
sequenceDiagram
    participant Customer
    participant API as API Gateway
    participant Purge as Purge Service
    participant Msg as Message Queue
    participant Shield as Shield Nodes
    participant Edge as Edge PoPs

    Customer->>API: POST /purge<br/>{"urls": ["/image.jpg"]}
    API->>Purge: Validate + Authorize

    Purge->>Msg: Publish purge event

    par Fan-out to all nodes
        Msg->>Shield: Purge event
        Shield->>Shield: Delete from cache

        Msg->>Edge: Purge event (all PoPs)
        Edge->>Edge: Delete from cache
    end

    Note over Customer,Edge: Global propagation: ~150ms

    Edge->>Purge: Acknowledge
    Purge->>API: Purge complete
    API->>Customer: 200 OK
```

### Config Distribution

```mermaid
flowchart TB
    subgraph ControlPlane["Control Plane"]
        API[API]
        CFG[Config Service]
        KV[(Config Store)]
    end

    subgraph Distribution["Config Distribution"]
        PUSH[Push Service]
        PULL[Pull Endpoint]
    end

    subgraph Edge["Edge PoPs"]
        E1[PoP 1]
        E2[PoP 2]
        E3[PoP N]
    end

    API --> CFG
    CFG --> KV

    KV --> |"Change Event"| PUSH
    PUSH --> |"WebSocket/gRPC Stream"| E1 & E2 & E3

    E1 & E2 & E3 --> |"Periodic Sync"| PULL
```

**Configuration Types:**
- Customer domains and origins
- Cache rules and TTLs
- SSL certificates
- WAF rules
- Rate limiting policies

---

## Component Interaction Summary

```mermaid
flowchart TB
    subgraph External
        Users
        Origins
    end

    subgraph CDN["CDN Infrastructure"]
        DNS[DNS Layer]
        EDGE[Edge Layer]
        SHIELD[Shield Layer]
        CTRL[Control Plane]
    end

    Users --> |"1. DNS Resolution"| DNS
    DNS --> |"2. Route to PoP"| EDGE
    EDGE --> |"3. Cache Miss"| SHIELD
    SHIELD --> |"4. Origin Fetch"| Origins

    CTRL --> |"Config/Purge"| EDGE & SHIELD
```

---

## System Boundaries

### What the CDN Handles

| Responsibility | Details |
|----------------|---------|
| Content caching | Static and cacheable dynamic content |
| TLS termination | HTTPS at edge |
| Request routing | Anycast/GeoDNS to nearest PoP |
| Origin protection | Shield, rate limiting, circuit breaker |
| DDoS mitigation | Absorb attacks at edge |
| Content optimization | Compression, minification |
| Video delivery | HLS/DASH streaming |

### What the CDN Does NOT Handle

| Responsibility | Where It Belongs |
|----------------|------------------|
| Content generation | Origin servers |
| Business logic | Application layer |
| Persistent storage | Origin storage systems |
| User authentication | Application (though CDN can validate tokens) |
| Database queries | Backend services |
| Real-time bidirectional | WebSocket servers (though CDN can proxy) |
