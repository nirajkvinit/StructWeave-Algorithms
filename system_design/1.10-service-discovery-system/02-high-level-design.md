# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture Overview

### Core Components

```mermaid
flowchart TB
    subgraph Clients["Service Clients"]
        C1["Order Service"]
        C2["User Service"]
        C3["API Gateway"]
    end

    subgraph Registry["Service Registry Cluster"]
        R1["Registry Node 1<br/>(Leader)"]
        R2["Registry Node 2<br/>(Follower)"]
        R3["Registry Node 3<br/>(Follower)"]
        R1 <--> R2
        R2 <--> R3
        R1 <--> R3
    end

    subgraph Services["Service Instances"]
        S1["Payment-1"]
        S2["Payment-2"]
        S3["Payment-3"]
    end

    S1 & S2 & S3 -->|"1. Register"| R1
    R1 -->|"2. Replicate"| R2 & R3
    C1 & C2 & C3 -->|"3. Discover"| R1 & R2 & R3
    R1 & R2 & R3 -->|"4. Health Check"| S1 & S2 & S3
```

### Component Responsibilities

| Component | Responsibility | Data Managed |
|-----------|---------------|--------------|
| **Registry Cluster** | Store service info, health check, serve queries | Instance records, health states |
| **Service Instance** | Register, heartbeat, serve business logic | Own metadata, health status |
| **Service Client** | Discover services, load balance, circuit break | Cached service list |
| **Health Checker** | Monitor instance health, update status | Health check results |

---

## Discovery Patterns Deep Dive

### Pattern 1: Client-Side Discovery

Client queries the registry directly and performs load balancing locally.

```mermaid
sequenceDiagram
    participant Client as Order Service
    participant Registry as Service Registry
    participant LB as Client-Side LB
    participant S1 as Payment-1
    participant S2 as Payment-2

    Note over Client,S2: Startup - Registration
    S1->>Registry: Register(payment, 10.0.1.1:8080)
    S2->>Registry: Register(payment, 10.0.1.2:8080)
    Registry-->>S1: OK
    Registry-->>S2: OK

    Note over Client,S2: Runtime - Discovery + Call
    Client->>Registry: GET /services/payment
    Registry-->>Client: [{10.0.1.1:8080}, {10.0.1.2:8080}]
    Client->>LB: Select instance
    LB-->>Client: 10.0.1.1:8080
    Client->>S1: POST /payments
    S1-->>Client: 200 OK
```

**Implementation Examples:**
- Netflix Eureka with Ribbon client
- Consul with client libraries
- ZooKeeper with Curator

**Pros:**
- Client has full control over load balancing
- No single point of failure in routing
- Can implement sophisticated routing (weighted, latency-based)

**Cons:**
- Client must include discovery library
- Library needed for each language
- Client complexity increases

---

### Pattern 2: Server-Side Discovery

Load balancer or proxy queries the registry; clients are unaware of discovery.

```mermaid
sequenceDiagram
    participant Client as Order Service
    participant LB as Load Balancer
    participant Registry as Service Registry
    participant S1 as Payment-1
    participant S2 as Payment-2

    Note over Client,S2: Startup
    S1->>Registry: Register(payment, 10.0.1.1:8080)
    S2->>Registry: Register(payment, 10.0.1.2:8080)

    Note over Client,S2: LB Syncs with Registry
    LB->>Registry: Watch(/services/payment)
    Registry-->>LB: [{10.0.1.1:8080}, {10.0.1.2:8080}]

    Note over Client,S2: Runtime - Client calls LB
    Client->>LB: POST http://payment-service/payments
    LB->>LB: Select instance
    LB->>S1: POST http://10.0.1.1:8080/payments
    S1-->>LB: 200 OK
    LB-->>Client: 200 OK
```

**Implementation Examples:**
- Kubernetes Services (kube-proxy)
- AWS Application Load Balancer
- HAProxy with Consul template
- NGINX with upstream discovery

**Pros:**
- Simple clients (no discovery logic)
- Centralized routing policies
- Language-agnostic

**Cons:**
- Load balancer is critical path
- Extra network hop
- Load balancer can become bottleneck

---

### Pattern 3: DNS-Based Discovery

Standard DNS resolution returns service IP addresses.

```mermaid
sequenceDiagram
    participant Client as Order Service
    participant DNS as DNS Server
    participant Registry as Service Registry
    participant S1 as Payment-1
    participant S2 as Payment-2

    Note over Client,S2: Registry updates DNS
    S1->>Registry: Register(payment, 10.0.1.1)
    Registry->>DNS: Update A record: payment.svc → 10.0.1.1
    S2->>Registry: Register(payment, 10.0.1.2)
    Registry->>DNS: Update A record: payment.svc → 10.0.1.1, 10.0.1.2

    Note over Client,S2: Runtime - DNS Resolution
    Client->>DNS: Resolve payment.svc
    DNS-->>Client: A: 10.0.1.1, 10.0.1.2
    Client->>Client: Pick IP (random/round-robin)
    Client->>S1: POST http://10.0.1.1:8080/payments
    S1-->>Client: 200 OK
```

**Implementation Examples:**
- CoreDNS with Kubernetes
- Consul DNS interface
- AWS Route53 health checks
- Internal DNS with low TTL

**Pros:**
- Universal compatibility (every language has DNS)
- No special client libraries
- Works with legacy applications

**Cons:**
- DNS caching causes stale data
- No health check integration (in basic DNS)
- Limited metadata (only IP/port)
- TTL-based freshness (not instant)

---

### Pattern 4: Service Mesh (Sidecar) Discovery

Sidecar proxy handles all discovery transparently.

```mermaid
sequenceDiagram
    participant Client as Order Service
    participant CSidecar as Order Sidecar
    participant CP as Control Plane
    participant SSidecar as Payment Sidecar
    participant Server as Payment Service

    Note over Client,Server: Control plane distributes config
    CP->>CSidecar: Push service endpoints
    CP->>SSidecar: Push service endpoints

    Note over Client,Server: Runtime - Transparent proxying
    Client->>CSidecar: POST http://payment-service/payments
    Note over CSidecar: Sidecar knows payment-service IPs
    CSidecar->>SSidecar: POST http://10.0.1.1:8080/payments
    SSidecar->>Server: POST /payments
    Server-->>SSidecar: 200 OK
    SSidecar-->>CSidecar: 200 OK
    CSidecar-->>Client: 200 OK
```

**Implementation Examples:**
- Istio with Envoy sidecars
- Linkerd
- Consul Connect
- AWS App Mesh

**Pros:**
- Application completely unaware
- Consistent across all languages
- Rich features (mTLS, observability, traffic management)

**Cons:**
- Resource overhead (sidecar per pod)
- Operational complexity
- Latency (two extra hops)

---

## Comparison: Discovery Patterns

| Aspect | Client-Side | Server-Side | DNS-Based | Service Mesh |
|--------|-------------|-------------|-----------|--------------|
| **Client Complexity** | High | Low | Low | Low |
| **Network Hops** | 0 extra | 1 extra | 0 extra | 2 extra |
| **Single Point of Failure** | None | Load Balancer | DNS Server | Control Plane |
| **Language Support** | Library per lang | Any | Any | Any |
| **Metadata Support** | Full | Limited | None | Full |
| **Health Integration** | Yes | Yes | Limited | Yes |
| **Resource Overhead** | Client memory | LB resources | Minimal | Sidecar per pod |

---

## High-Level Architecture

### Single Datacenter Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SINGLE DC ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Service Registry Cluster                   │   │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐                  │   │
│  │  │ Node 1  │◄──►│ Node 2  │◄──►│ Node 3  │                  │   │
│  │  │(Leader) │    │(Follower)│   │(Follower)│                  │   │
│  │  └────┬────┘    └────┬────┘    └────┬────┘                  │   │
│  │       │              │              │                        │   │
│  │       └──────────────┼──────────────┘                        │   │
│  │                      │                                        │   │
│  │              Raft Consensus / Gossip                          │   │
│  └──────────────────────┼───────────────────────────────────────┘   │
│                         │                                            │
│      ┌──────────────────┼──────────────────┐                        │
│      │                  │                  │                        │
│      ▼                  ▼                  ▼                        │
│  ┌───────┐         ┌───────┐         ┌───────┐                     │
│  │Service│ Register│Service│ Register│Service│                     │
│  │  A-1  │─────────│  A-2  │─────────│  B-1  │                     │
│  └───┬───┘         └───┬───┘         └───┬───┘                     │
│      │                 │                 │                          │
│      │ Health          │ Health          │ Health                   │
│      │ Checks          │ Checks          │ Checks                   │
│      ▼                 ▼                 ▼                          │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                        Clients                                 │ │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐                   │ │
│  │  │Client 1 │    │Client 2 │    │Client 3 │                   │ │
│  │  │(cached) │    │(cached) │    │(cached) │                   │ │
│  │  └─────────┘    └─────────┘    └─────────┘                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Multi-Datacenter Architecture

```mermaid
flowchart TB
    subgraph DC1["Datacenter 1 (US-East)"]
        R1["Registry Cluster 1"]
        S1["Services DC1"]
        C1["Clients DC1"]
        S1 --> R1
        C1 --> R1
    end

    subgraph DC2["Datacenter 2 (US-West)"]
        R2["Registry Cluster 2"]
        S2["Services DC2"]
        C2["Clients DC2"]
        S2 --> R2
        C2 --> R2
    end

    subgraph DC3["Datacenter 3 (EU)"]
        R3["Registry Cluster 3"]
        S3["Services DC3"]
        C3["Clients DC3"]
        S3 --> R3
        C3 --> R3
    end

    R1 <-->|"WAN Replication"| R2
    R2 <-->|"WAN Replication"| R3
    R1 <-->|"WAN Replication"| R3
```

### WAN Federation Detail

```
┌─────────────────────────────────────────────────────────────────────┐
│  MULTI-DC FEDERATION                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DC1 (Primary)                    DC2 (Secondary)                   │
│  ┌─────────────┐                  ┌─────────────┐                   │
│  │  Registry   │    WAN Gossip    │  Registry   │                   │
│  │  Cluster    │◄────────────────►│  Cluster    │                   │
│  │  (5 nodes)  │   ~100ms RTT     │  (5 nodes)  │                   │
│  └──────┬──────┘                  └──────┬──────┘                   │
│         │                                │                          │
│  Local Services                   Local Services                    │
│  ┌─────────────┐                  ┌─────────────┐                   │
│  │ payment-1   │                  │ payment-3   │                   │
│  │ payment-2   │                  │ payment-4   │                   │
│  │ user-1      │                  │ user-2      │                   │
│  └─────────────┘                  └─────────────┘                   │
│                                                                      │
│  Query Flow:                                                         │
│  1. Client in DC1 queries local registry                            │
│  2. Local registry returns:                                         │
│     - DC1 services (preferred, low latency)                         │
│     - DC2 services (fallback, higher latency)                       │
│  3. Client prefers local but can failover cross-DC                  │
│                                                                      │
│  Replication Strategy:                                               │
│  - Service catalog: Replicated (eventually consistent)              │
│  - Health status: Local only (too expensive cross-WAN)              │
│  - Cross-DC health via periodic sync or on-demand probe            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Registration Flow

```mermaid
sequenceDiagram
    participant Service as Payment Service
    participant Registry as Registry Leader
    participant Followers as Registry Followers
    participant HCheck as Health Checker

    Note over Service,HCheck: Service Startup
    Service->>Service: 1. Initialize, pass health checks locally
    Service->>Registry: 2. POST /register {service, host, port, metadata}
    Registry->>Registry: 3. Validate request
    Registry->>Followers: 4. Replicate via Raft/Gossip
    Followers-->>Registry: 5. Acknowledge
    Registry-->>Service: 6. 200 OK {instance_id, lease_id}

    Note over Service,HCheck: Health Monitoring
    loop Every 10-30 seconds
        alt Push Model (Heartbeat)
            Service->>Registry: Heartbeat {instance_id}
            Registry-->>Service: OK
        else Pull Model (Registry Probes)
            HCheck->>Service: GET /health
            Service-->>HCheck: 200 OK
            HCheck->>Registry: Update health status
        end
    end
```

### Discovery Flow

```mermaid
sequenceDiagram
    participant Client as Order Service
    participant Cache as Client Cache
    participant Registry as Registry
    participant LB as Client LB

    Note over Client,LB: Cache Miss - Query Registry
    Client->>Cache: Get(payment-service)
    Cache-->>Client: MISS
    Client->>Registry: GET /services/payment
    Registry-->>Client: [{id:1, host:10.0.1.1, port:8080, health:UP}, ...]
    Client->>Cache: Store(payment-service, instances, TTL=30s)

    Note over Client,LB: Cache Hit - Fast Path
    Client->>Cache: Get(payment-service)
    Cache-->>Client: [{id:1, host:10.0.1.1, ...}, {id:2, ...}]
    Client->>LB: Select(instances)
    LB-->>Client: 10.0.1.1:8080
    Client->>Client: Call 10.0.1.1:8080

    Note over Client,LB: Push Notification (Optional)
    Registry-->>Client: Watch: payment-service changed
    Client->>Cache: Invalidate(payment-service)
```

### Health Check Flow

```mermaid
sequenceDiagram
    participant Registry as Registry
    participant HCheck as Health Checker
    participant Service as Payment-1
    participant Clients as Subscribed Clients

    Note over Registry,Clients: Normal Health Check
    HCheck->>Service: GET /health
    Service-->>HCheck: 200 OK
    HCheck->>Registry: Update: Payment-1 = HEALTHY

    Note over Registry,Clients: Failed Health Check
    HCheck->>Service: GET /health
    Service-->>HCheck: Timeout / 500 Error
    HCheck->>Registry: Update: Payment-1 = UNHEALTHY (1/3)

    Note over Registry,Clients: Consecutive Failures
    HCheck->>Service: GET /health
    Service-->>HCheck: Timeout
    HCheck->>Registry: Update: Payment-1 = UNHEALTHY (2/3)
    HCheck->>Service: GET /health
    Service-->>HCheck: Timeout
    HCheck->>Registry: Update: Payment-1 = UNHEALTHY (3/3) → EVICTED

    Note over Registry,Clients: Notify Clients
    Registry->>Clients: Push: Payment-1 removed
    Clients->>Clients: Update local cache
```

---

## Key Architectural Decisions

### Decision 1: Consistency Model

| Option | Pros | Cons | Choose When |
|--------|------|------|-------------|
| **CP (Raft/ZAB)** | Strong consistency, no stale reads | Unavailable during partition | Configuration, leader election |
| **AP (Gossip)** | Always available, partition tolerant | Eventual consistency, stale reads possible | Service discovery at scale |
| **Hybrid** | Best of both | Complexity | Production systems (Consul) |

**Recommendation:** AP for discovery (availability critical), CP for coordination.

### Decision 2: Health Check Model

| Option | Pros | Cons | Choose When |
|--------|------|------|-------------|
| **Push (Heartbeat)** | Service controls timing, less registry load | Requires service changes | Service supports heartbeat |
| **Pull (Registry probes)** | No service changes needed | Registry load increases | Legacy services, black-box |
| **Hybrid** | Comprehensive coverage | Complexity | Production (Consul approach) |

**Recommendation:** Hybrid - heartbeat for registration renewal, pull for health verification.

### Decision 3: Client Caching

| Option | Pros | Cons | Choose When |
|--------|------|------|-------------|
| **No Cache** | Always fresh | High registry load, latency | Development, very small scale |
| **TTL Cache** | Reduced load, fast | Can serve stale | Most cases (30-60s TTL) |
| **TTL + Push Invalidation** | Fresh + fast | Requires watch support | Production with watch support |

**Recommendation:** TTL cache (30s) with push invalidation when available.

### Decision 4: Registry Deployment

| Option | Pros | Cons | Choose When |
|--------|------|------|-------------|
| **Embedded** | No extra infra | Coupled to application | Edge, IoT |
| **Sidecar** | App-independent | Resource per pod | Service mesh |
| **Centralized Cluster** | Simple ops, shared | Single point of concern | Most deployments |

**Recommendation:** Centralized cluster for most cases; sidecar for service mesh.

---

## Integration Points

### Where Service Discovery Fits

```mermaid
flowchart TB
    subgraph External["External Traffic"]
        User["Users"]
    end

    subgraph Edge["Edge Layer"]
        LB["Load Balancer"]
        GW["API Gateway"]
    end

    subgraph Discovery["Service Discovery"]
        Registry["Registry Cluster"]
    end

    subgraph Services["Service Layer"]
        S1["Service A"]
        S2["Service B"]
        S3["Service C"]
    end

    subgraph Data["Data Layer"]
        DB["Databases"]
        Cache["Caches"]
    end

    User --> LB
    LB --> GW
    GW -->|"Discover"| Registry
    GW --> S1
    S1 -->|"Discover"| Registry
    S1 --> S2
    S2 -->|"Discover"| Registry
    S2 --> S3
    S1 & S2 & S3 -->|"Register"| Registry
    S1 & S2 & S3 --> DB & Cache
```

### Common Integration Patterns

| Integration | Purpose | Example |
|-------------|---------|---------|
| **API Gateway** | Route to discovered backends | Kong + Consul, NGINX + service discovery |
| **Load Balancer** | Update backend pools | HAProxy + Consul template |
| **Service Mesh** | Sidecar endpoint config | Istio control plane |
| **Config Management** | Service-specific config | Consul KV, Spring Cloud Config |
| **Secrets Management** | Per-service secrets | Vault + service identity |
| **Monitoring** | Auto-discover scrape targets | Prometheus + Consul |
