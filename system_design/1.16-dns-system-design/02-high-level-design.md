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
    subgraph Clients["Client Layer"]
        C1[Browser/App]
        C2[OS Resolver]
    end

    subgraph Recursive["Recursive Resolver Layer"]
        subgraph RL1["Anycast Location 1"]
            LB1[Load Balancer]
            R1A[Resolver 1]
            R1B[Resolver 2]
            CACHE1[(Cache)]
        end
        subgraph RL2["Anycast Location 2"]
            LB2[Load Balancer]
            R2A[Resolver 1]
            R2B[Resolver 2]
            CACHE2[(Cache)]
        end
    end

    subgraph Hierarchy["DNS Hierarchy"]
        ROOT[Root Servers<br/>13 identifiers]
        subgraph TLD["TLD Servers"]
            COM[.com]
            ORG[.org]
            NET[.net]
        end
        subgraph AUTH["Authoritative Servers"]
            AUTH1[ns1.example.com]
            AUTH2[ns2.example.com]
        end
    end

    subgraph GSLB["GSLB / Authoritative Layer"]
        HC[Health Checker]
        GEO[(GeoIP Database)]
        POLICY[Routing Policy]
        ZONE[(Zone Database)]
    end

    subgraph Control["Control Plane"]
        API[Management API]
        CONFIG[Config Service]
        ANALYTICS[Analytics]
    end

    C1 --> C2
    C2 --> |"Anycast 1.1.1.1"| LB1 & LB2

    LB1 --> R1A & R1B
    LB2 --> R2A & R2B

    R1A & R1B --> CACHE1
    R2A & R2B --> CACHE2

    R1A & R2A --> |"Iterative"| ROOT
    ROOT --> TLD
    TLD --> AUTH

    AUTH1 & AUTH2 --> HC
    AUTH1 & AUTH2 --> GEO
    AUTH1 & AUTH2 --> POLICY
    AUTH1 & AUTH2 --> ZONE

    API --> CONFIG
    CONFIG --> AUTH1 & AUTH2
    ANALYTICS --> R1A & R2A
```

---

## Core Components

### 1. Recursive Resolver Layer

The recursive resolver accepts queries from clients and performs the full resolution process.

```mermaid
flowchart TB
    subgraph Resolver["Recursive Resolver Architecture"]
        UDP[UDP Listener<br/>Port 53]
        TCP[TCP Listener<br/>Port 53]
        DOH[DoH Listener<br/>Port 443]
        DOT[DoT Listener<br/>Port 853]

        PARSE[Query Parser]

        subgraph CacheLayer["Cache Layer"]
            HOT[Hot Cache<br/>In-Memory LRU]
            WARM[Warm Cache<br/>Shared Memory]
        end

        RESOLVE[Resolution Engine]
        VALIDATE[DNSSEC Validator]
        UPSTREAM[Upstream Pool]
    end

    Client --> UDP & TCP & DOH & DOT
    UDP & TCP & DOH & DOT --> PARSE
    PARSE --> HOT
    HOT --> |"Miss"| WARM
    WARM --> |"Miss"| RESOLVE
    RESOLVE --> VALIDATE
    RESOLVE --> UPSTREAM
    UPSTREAM --> |"Root/TLD/Auth"| External
```

**Responsibilities:**
- Accept client queries (UDP, TCP, DoH, DoT)
- Check local cache first
- Perform iterative resolution on cache miss
- Validate DNSSEC signatures
- Cache responses according to TTL
- Rate limit abusive clients

### 2. Authoritative Name Server

Serves as the source of truth for configured zones.

```mermaid
flowchart TB
    subgraph Authoritative["Authoritative Server Architecture"]
        RECV[Query Receiver]

        subgraph ZoneEngine["Zone Engine"]
            LOOKUP[Zone Lookup]
            MATCH[Name Matching]
            WILDCARD[Wildcard Handler]
        end

        subgraph GSLB["GSLB Engine"]
            GEO[GeoIP Lookup]
            HEALTH[Health Status]
            WEIGHT[Weight Calculator]
            LATENCY[Latency Data]
        end

        SIGN[DNSSEC Signer]
        RESP[Response Builder]
    end

    subgraph Storage["Zone Storage"]
        PRIMARY[(Primary Zone DB)]
        REPLICA[(Read Replicas)]
    end

    Query --> RECV
    RECV --> LOOKUP
    LOOKUP --> PRIMARY & REPLICA
    LOOKUP --> MATCH --> WILDCARD

    MATCH --> GEO & HEALTH & WEIGHT & LATENCY
    GEO & HEALTH & WEIGHT & LATENCY --> RESP

    RESP --> SIGN --> Response
```

**Responsibilities:**
- Serve authoritative answers for owned zones
- Implement GSLB routing policies
- Sign responses with DNSSEC
- Handle zone transfers (AXFR/IXFR)
- Process dynamic updates

### 3. DNS Hierarchy

The global DNS hierarchy with root, TLD, and authoritative servers.

```mermaid
flowchart TB
    subgraph Root["Root Server System"]
        direction LR
        A[a.root-servers.net]
        B[b.root-servers.net]
        C[c.root-servers.net]
        M[m.root-servers.net]
        NOTE1[13 identifiers<br/>1900+ instances<br/>via Anycast]
    end

    subgraph TLD["TLD Servers"]
        direction LR
        GTLD[Generic TLDs<br/>.com .org .net]
        CCTLD[Country Code TLDs<br/>.uk .de .jp]
        NEWTLD[New TLDs<br/>.app .dev .cloud]
    end

    subgraph Auth["Authoritative Servers"]
        direction LR
        MANAGED[Managed DNS<br/>Route53, Cloudflare]
        SELF[Self-Hosted<br/>BIND, PowerDNS]
    end

    Root --> TLD
    TLD --> Auth
```

### 4. GSLB (Global Server Load Balancing)

Intelligent traffic routing at the DNS layer.

```mermaid
flowchart TB
    subgraph GSLB["GSLB System"]
        subgraph Input["Input Data"]
            QUERY[DNS Query]
            CLIENT[Client IP]
        end

        subgraph Decision["Decision Engine"]
            GEO[(GeoIP DB)]
            HEALTH[(Health Status)]
            WEIGHTS[(Weights)]
            LATENCY[(Latency Map)]
        end

        subgraph Policies["Routing Policies"]
            P1[Geographic Routing]
            P2[Weighted Round Robin]
            P3[Latency-Based]
            P4[Failover]
        end

        subgraph Output["Output"]
            ANSWER[Selected IP/Record]
        end
    end

    QUERY --> Decision
    CLIENT --> GEO
    GEO --> P1
    HEALTH --> P4
    WEIGHTS --> P2
    LATENCY --> P3
    P1 & P2 & P3 & P4 --> ANSWER
```

**GSLB Routing Policies:**

| Policy | Description | Use Case |
|--------|-------------|----------|
| **Geographic** | Route based on client location | Regional content, data sovereignty |
| **Weighted** | Distribute by percentage | Gradual rollouts, A/B testing |
| **Latency-Based** | Route to lowest latency | Performance optimization |
| **Failover** | Primary/secondary with health checks | High availability |
| **Geoproximity** | Nearest endpoint with bias | Fine-tuned geographic control |

### 5. Control Plane

Manages configuration, zones, and analytics.

```mermaid
flowchart TB
    subgraph ControlPlane["Control Plane"]
        API[Management API]

        subgraph Services["Core Services"]
            ZONE[Zone Service]
            RECORD[Record Service]
            HEALTH[Health Service]
            POLICY[Policy Service]
        end

        subgraph Storage["Storage"]
            DB[(Zone Database)]
            KV[(Config Store)]
            TS[(Time-Series)]
        end
    end

    subgraph DataPlane["Data Plane"]
        AUTH1[Auth Server 1]
        AUTH2[Auth Server 2]
        AUTHN[Auth Server N]
    end

    Customer --> API
    API --> ZONE & RECORD & HEALTH & POLICY

    ZONE --> DB
    HEALTH --> KV

    DB --> |"Zone Sync"| AUTH1 & AUTH2 & AUTHN
    KV --> |"Config Push"| AUTH1 & AUTH2 & AUTHN
```

---

## Data Flow

### Recursive Resolution Flow (Cache Miss)

```mermaid
sequenceDiagram
    participant Client
    participant Resolver as Recursive Resolver
    participant Cache
    participant Root as Root Server
    participant TLD as .com TLD
    participant Auth as example.com Auth

    Client->>Resolver: Query: www.example.com A?
    Resolver->>Cache: Lookup www.example.com
    Cache->>Resolver: MISS

    Note over Resolver: Check if .com NS cached

    Resolver->>Root: Query: www.example.com A?
    Root->>Resolver: Referral: .com NS = a.gtld-servers.net

    Resolver->>Cache: Store .com NS (TTL: 172800)

    Resolver->>TLD: Query: www.example.com A?
    TLD->>Resolver: Referral: example.com NS = ns1.example.com

    Resolver->>Cache: Store example.com NS (TTL: 86400)

    Resolver->>Auth: Query: www.example.com A?
    Auth->>Resolver: Answer: www.example.com A 93.184.216.34

    Resolver->>Cache: Store A record (TTL: 3600)
    Resolver->>Client: Answer: 93.184.216.34

    Note over Resolver: Total time: 50-200ms
```

### Recursive Resolution Flow (Cache Hit)

```mermaid
sequenceDiagram
    participant Client
    participant Resolver as Recursive Resolver
    participant Cache

    Client->>Resolver: Query: www.example.com A?
    Resolver->>Cache: Lookup www.example.com
    Cache->>Resolver: HIT: 93.184.216.34 (TTL: 2400 remaining)
    Resolver->>Client: Answer: 93.184.216.34

    Note over Resolver: Total time: 1-5ms
```

### GSLB Resolution Flow

```mermaid
sequenceDiagram
    participant Client
    participant Resolver
    participant Auth as GSLB Authoritative
    participant GeoIP
    participant Health

    Client->>Resolver: Query: api.example.com A?
    Resolver->>Auth: Query: api.example.com A?

    Auth->>GeoIP: Lookup client IP location
    GeoIP->>Auth: Location: Tokyo, Japan

    Auth->>Health: Check endpoint health
    Health->>Auth: Tokyo: Healthy, Singapore: Healthy

    Note over Auth: Apply routing policy:<br/>Geographic → Tokyo endpoint

    Auth->>Resolver: Answer: api.example.com A 203.0.113.10
    Resolver->>Client: Answer: 203.0.113.10

    Note over Auth: Client routed to Tokyo datacenter
```

### Zone Transfer Flow (AXFR)

```mermaid
sequenceDiagram
    participant Secondary as Secondary NS
    participant Primary as Primary NS
    participant Zone as Zone Database

    Note over Secondary: Check SOA serial periodically

    Secondary->>Primary: SOA query: example.com
    Primary->>Zone: Get current SOA
    Zone->>Primary: SOA serial: 2024011501
    Primary->>Secondary: SOA serial: 2024011501

    Note over Secondary: Serial increased, initiate transfer

    Secondary->>Primary: AXFR request: example.com
    Primary->>Zone: Read all records
    Zone->>Primary: All records

    Primary->>Secondary: SOA (start)
    Primary->>Secondary: NS records
    Primary->>Secondary: A records
    Primary->>Secondary: MX records
    Primary->>Secondary: ... all records ...
    Primary->>Secondary: SOA (end)

    Note over Secondary: Transfer complete<br/>Zone updated
```

---

## Key Design Decisions

### Decision 1: Anycast vs Unicast Deployment

| Approach | Pros | Cons |
|----------|------|------|
| **Anycast** | Auto-failover, DDoS distribution, low latency | BGP complexity, stateless only |
| **Unicast** | Session stickiness, simpler setup | Manual failover, single point |

**Decision: Anycast for all DNS services**

**Rationale:**
- DNS is inherently stateless (query/response)
- Anycast provides automatic geographic routing
- DDoS traffic naturally distributed
- BGP reconvergence is fast enough (seconds)

### Decision 2: Resolution Strategy

| Approach | Pros | Cons |
|----------|------|------|
| **Recursive** | Client simplicity, central caching | Resolver load |
| **Iterative** | Distributed load | Client complexity |
| **Forwarding** | Simple setup | Dependency on upstream |

**Decision: Recursive resolvers with iterative upstream**

**Rationale:**
- Clients use simple stub resolvers
- Recursive resolvers handle complexity
- Iterative queries to hierarchy for control
- Caching at resolver level

### Decision 3: Cache Architecture

| Approach | Pros | Cons |
|----------|------|------|
| **Per-Resolver** | No coordination, simple | Duplicate storage |
| **Shared Cache** | Higher hit ratio | Coordination overhead |
| **Hierarchical** | Best of both | Complexity |

**Decision: Hierarchical caching (L1 per-resolver, L2 shared)**

**Rationale:**
- L1 (per-resolver): Sub-millisecond hot cache
- L2 (shared): Higher hit ratio for warm cache
- Reduces upstream queries significantly

### Decision 4: GSLB Decision Point

| Approach | Pros | Cons |
|----------|------|------|
| **At Resolver** | Full client info | Resolver modification |
| **At Authoritative** | Standard protocol | Limited client info (EDNS-Client-Subnet) |
| **Hybrid** | Best accuracy | Complexity |

**Decision: Authoritative-level GSLB with EDNS-Client-Subnet**

**Rationale:**
- Works with any resolver
- EDNS-Client-Subnet provides client subnet info
- Standard DNS protocol
- Authoritative server has routing policy

### Decision 5: Zone Storage Architecture

| Approach | Pros | Cons |
|----------|------|------|
| **File-based** | Simple, portable | Slow updates |
| **Database** | Fast queries, transactions | Complexity |
| **In-Memory** | Fastest | Size limits, durability |

**Decision: Database with in-memory cache**

**Rationale:**
- Database for durability and consistency
- In-memory cache for query performance
- Supports dynamic updates
- Easy replication

---

## Communication Patterns

### DNS Query/Response

```
Client                    Resolver
  |                         |
  |---- UDP Query -------->|
  |<--- UDP Response ------|
  |                         |

Standard DNS: UDP port 53
- Max 512 bytes (original)
- EDNS0: Up to 4096 bytes
- Falls back to TCP if truncated
```

### DNS over HTTPS (DoH)

```
Client                    Resolver
  |                         |
  |---- TLS Handshake ---->|
  |<--- TLS Handshake -----|
  |                         |
  |---- HTTP/2 POST ------>|
  |     Content-Type:       |
  |     application/dns-message
  |<--- HTTP/2 Response ---|
  |                         |

DoH: TCP port 443
- Full HTTP/2 semantics
- Encrypted, firewall-friendly
- Higher latency than UDP
```

### DNS over TLS (DoT)

```
Client                    Resolver
  |                         |
  |---- TLS Handshake ---->|
  |<--- TLS Handshake -----|
  |                         |
  |---- DNS Query -------->|
  |<--- DNS Response ------|
  |                         |

DoT: TCP port 853
- Standard DNS over TLS
- Dedicated port (can be blocked)
- Lower overhead than DoH
```

### Zone Transfer (AXFR/IXFR)

```
Secondary                 Primary
  |                         |
  |---- TCP Connect ------>|
  |<--- TCP Accept --------|
  |                         |
  |---- AXFR Query ------->|
  |<--- SOA (start) -------|
  |<--- Record 1 ----------|
  |<--- Record 2 ----------|
  |<--- ... ---------------|
  |<--- SOA (end) ---------|
  |                         |

Zone Transfer: TCP port 53
- Always TCP (large payload)
- AXFR: Full transfer
- IXFR: Incremental (changes only)
```

---

## Component Interaction Summary

```mermaid
flowchart TB
    subgraph External["External"]
        CLIENTS[Clients]
        HIERARCHY[DNS Hierarchy]
    end

    subgraph DNS["DNS Infrastructure"]
        RESOLVER[Resolver Layer]
        AUTH[Authoritative Layer]
        GSLB[GSLB Engine]
        CTRL[Control Plane]
    end

    CLIENTS --> |"1. Query"| RESOLVER
    RESOLVER --> |"2. Cache Miss"| HIERARCHY
    HIERARCHY --> |"3. Referral"| RESOLVER
    RESOLVER --> |"4. Query Auth"| AUTH
    AUTH --> |"5. GSLB Decision"| GSLB
    GSLB --> |"6. Routed Answer"| AUTH
    AUTH --> |"7. Response"| RESOLVER
    RESOLVER --> |"8. Response"| CLIENTS

    CTRL --> |"Config"| AUTH & GSLB
```

---

## System Boundaries

### What DNS Handles

| Responsibility | Details |
|----------------|---------|
| Name resolution | Domain to IP translation |
| Service discovery | SRV records for service locations |
| Mail routing | MX records for email |
| Traffic management | GSLB, failover, load balancing |
| Security | DNSSEC authentication |
| Privacy | DoH/DoT encryption |

### What DNS Does NOT Handle

| Responsibility | Where It Belongs |
|----------------|------------------|
| Application routing | Load balancers, reverse proxies |
| Session management | Application layer |
| Real-time health | Dedicated health check systems |
| Fine-grained auth | Application/API gateway |
| Data storage | Databases |
| Connection management | TCP/application layer |
