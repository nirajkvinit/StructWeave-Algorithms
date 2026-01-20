# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture

### Two-Tier L4/L7 Architecture (Recommended)

```mermaid
flowchart TB
    subgraph Internet["Internet"]
        C1[Client 1]
        C2[Client 2]
        C3[Client N]
    end

    subgraph EdgeLayer["Edge Layer (Anycast)"]
        direction TB
        VIP[Virtual IP<br/>Anycast Advertised]
    end

    subgraph L4Layer["Layer 4 Load Balancers"]
        L4_1[L4 LB Node 1<br/>ECMP/Maglev]
        L4_2[L4 LB Node 2<br/>ECMP/Maglev]
        L4_3[L4 LB Node N<br/>ECMP/Maglev]
    end

    subgraph L7Layer["Layer 7 Load Balancers"]
        L7_1[L7 LB 1<br/>TLS/Routing]
        L7_2[L7 LB 2<br/>TLS/Routing]
        L7_3[L7 LB N<br/>TLS/Routing]
    end

    subgraph Backends["Backend Services"]
        subgraph ServiceA["Service A Pool"]
            A1[Backend A1]
            A2[Backend A2]
        end
        subgraph ServiceB["Service B Pool"]
            B1[Backend B1]
            B2[Backend B2]
        end
        subgraph ServiceC["Service C Pool"]
            C1B[Backend C1]
            C2B[Backend C2]
        end
    end

    subgraph ControlPlane["Control Plane"]
        Config[(Config Store)]
        SD[Service Discovery]
        HC[Health Checker]
    end

    C1 & C2 & C3 --> VIP
    VIP --> L4_1 & L4_2 & L4_3

    L4_1 --> L7_1 & L7_2
    L4_2 --> L7_2 & L7_3
    L4_3 --> L7_1 & L7_3

    L7_1 --> A1 & B1
    L7_2 --> A2 & B2
    L7_3 --> C1B & C2B

    Config --> L4_1 & L4_2 & L4_3
    Config --> L7_1 & L7_2 & L7_3
    SD --> L7_1 & L7_2 & L7_3
    HC --> L7_1 & L7_2 & L7_3
```

### Component Responsibilities

| Component | Layer | Responsibility |
|-----------|-------|---------------|
| **Anycast VIP** | Network | Single IP advertised from multiple PoPs, BGP routing |
| **L4 Load Balancer** | Transport | Packet forwarding, ECMP distribution, consistent hashing |
| **L7 Load Balancer** | Application | TLS termination, content routing, health checks, retries |
| **Config Store** | Control Plane | Backend pool definitions, routing rules, weights |
| **Service Discovery** | Control Plane | Dynamic backend registration, DNS or API-based |
| **Health Checker** | Control Plane | Active health probes, status aggregation |

---

## Data Flow

### Normal Request Flow (L4 + L7)

```mermaid
sequenceDiagram
    participant Client
    participant DNS
    participant L4 as L4 LB (Maglev)
    participant L7 as L7 LB (Envoy)
    participant Backend

    Client->>DNS: Resolve api.example.com
    DNS-->>Client: Anycast VIP: 203.0.113.1

    Client->>L4: TCP SYN to VIP:443
    Note over L4: Hash(5-tuple) → L7 node
    L4->>L7: Forward packet (DSR or proxy)

    L7->>L7: TLS Handshake
    Client->>L7: HTTPS Request (via L4)

    Note over L7: Parse HTTP<br/>Route by path/host
    L7->>L7: Select backend (WLC)

    L7->>Backend: Forward request
    Backend-->>L7: Response

    Note over L7: Add headers<br/>(X-Request-ID, etc.)
    L7-->>Client: HTTPS Response (via L4)
```

### Direct Server Return (DSR) Flow

```mermaid
sequenceDiagram
    participant Client
    participant L4 as L4 LB
    participant Backend

    Client->>L4: Request packet<br/>Src: Client IP, Dst: VIP

    Note over L4: Rewrite MAC only<br/>Dst MAC → Backend MAC

    L4->>Backend: Packet with VIP as Dst IP<br/>(Backend has VIP on loopback)

    Note over Backend: Process request<br/>VIP is local, responds directly

    Backend-->>Client: Response packet<br/>Src: VIP, Dst: Client IP

    Note over Client: Response bypasses L4!<br/>Reduces LB bandwidth 10x
```

### Health Check Flow

```mermaid
sequenceDiagram
    participant HC as Health Checker
    participant L7 as L7 LB
    participant Backend
    participant Config as Config Store

    loop Every 5 seconds
        HC->>Backend: HTTP GET /health
        alt Healthy
            Backend-->>HC: 200 OK
            HC->>L7: Backend healthy
        else Unhealthy
            Backend-->>HC: Timeout / 5xx
            HC->>HC: Increment failure count
            alt Failures >= Threshold
                HC->>L7: Remove backend from pool
                HC->>Config: Update backend status
            end
        end
    end
```

---

## Key Architectural Decisions

### 1. L4 vs L7: When to Use Each

| Decision Factor | Choose L4 | Choose L7 |
|-----------------|-----------|-----------|
| **Protocol** | Non-HTTP (TCP/UDP raw) | HTTP/HTTPS/gRPC |
| **Latency** | Ultra-low latency critical | Can tolerate ms overhead |
| **Routing** | Simple (any backend works) | Content-based (path, header) |
| **TLS** | Pass-through or terminate elsewhere | Terminate at LB |
| **Scale** | 10M+ connections | Moderate connections |
| **Inspection** | No payload inspection needed | Need to read/modify requests |

**Recommendation:** Use two-tier (L4 → L7) for large-scale production systems.

### 2. Active-Active vs Active-Passive

| Approach | Pros | Cons | Use When |
|----------|------|------|----------|
| **Active-Active** | Full utilization, no wasted capacity | Complex state sync | High traffic, need all capacity |
| **Active-Passive** | Simple failover, no state sync | 50% idle capacity | Lower traffic, simpler ops |

**Recommendation:** Active-Active with Anycast for L4, Active-Active with DNS for L7.

### 3. State Management

| State Type | Storage | Sharing |
|------------|---------|---------|
| **Connection Table** | In-memory per node | Not shared (use consistent hashing) |
| **Health Status** | In-memory, gossip sync | Eventually consistent |
| **Configuration** | External store (etcd) | Strongly consistent |
| **TLS Sessions** | Local cache + shared cache | Optional sharing for resumption |

**Recommendation:** Minimize shared state. Use consistent hashing to route same client to same LB node.

### 4. Database/Storage Choice

| Component | Storage Type | Technology Options |
|-----------|--------------|-------------------|
| **Config Store** | Distributed KV | etcd, Consul, ZooKeeper |
| **Health State** | In-memory + gossip | SWIM protocol, Serf |
| **Metrics** | Time-series | Prometheus, InfluxDB |
| **Logs** | Log aggregator | Elasticsearch, Loki |

### 5. Connection Handling Strategy

```mermaid
flowchart LR
    subgraph Strategies["Connection Strategies"]
        direction TB
        PP[Proxy Protocol<br/>L4 preserves client IP]
        DSR[Direct Server Return<br/>Responses bypass LB]
        TP[Transparent Proxy<br/>Full proxy mode]
    end

    subgraph UseCase["Use Cases"]
        direction TB
        U1[High bandwidth<br/>streaming/video]
        U2[Need client IP<br/>at backend]
        U3[Full control<br/>request/response]
    end

    DSR --> U1
    PP --> U2
    TP --> U3
```

---

## Architecture Pattern Checklist

- [x] **Sync vs Async:** Synchronous forwarding (inline path)
- [x] **Event-driven vs Request-response:** Request-response (proxy)
- [x] **Push vs Pull:** Pull for health checks, Push for config updates
- [x] **Stateless vs Stateful:** Mostly stateless (connection table is ephemeral)
- [x] **Read-heavy vs Write-heavy:** Read-heavy (route lookups >> config changes)
- [x] **Real-time vs Batch:** Real-time (every packet/request)
- [x] **Edge vs Origin:** Edge deployment with Anycast

---

## Deployment Options

### Option A: Single-Tier L7 (Simple)

```mermaid
flowchart TB
    subgraph Simple["Simple Deployment"]
        DNS[DNS Round Robin]
        LB1[L7 LB 1<br/>HAProxy/Nginx]
        LB2[L7 LB 2<br/>HAProxy/Nginx]
        VIP[Keepalived VIP]

        B1[Backend 1]
        B2[Backend 2]
        B3[Backend 3]
    end

    DNS --> LB1 & LB2
    LB1 <-.->|VRRP| LB2
    VIP --> LB1 & LB2
    LB1 & LB2 --> B1 & B2 & B3
```

**Pros:** Simple, fewer components, easy to troubleshoot
**Cons:** Limited scale, L7 processing limits throughput
**Use Case:** Moderate traffic (< 50K QPS), single region

### Option B: Two-Tier with Anycast (Scale)

```mermaid
flowchart TB
    subgraph Scale["Scale Deployment"]
        subgraph PoP1["PoP 1"]
            L4_A[L4: Maglev]
            L7_A[L7: Envoy]
        end
        subgraph PoP2["PoP 2"]
            L4_B[L4: Maglev]
            L7_B[L7: Envoy]
        end

        Anycast[Anycast VIP]
        B1[Backend Pool]
    end

    Anycast --> L4_A & L4_B
    L4_A --> L7_A
    L4_B --> L7_B
    L7_A & L7_B --> B1
```

**Pros:** High throughput, global distribution, separation of concerns
**Cons:** Complex operations, more components
**Use Case:** High traffic (> 100K QPS), multi-region

### Option C: Service Mesh (Cloud Native)

```mermaid
flowchart TB
    subgraph Mesh["Service Mesh"]
        subgraph Pod1["Pod A"]
            App1[App Container]
            Sidecar1[Envoy Sidecar]
        end
        subgraph Pod2["Pod B"]
            App2[App Container]
            Sidecar2[Envoy Sidecar]
        end

        CP[Control Plane<br/>Istio/Linkerd]
    end

    App1 --> Sidecar1
    Sidecar1 -->|mTLS| Sidecar2
    Sidecar2 --> App2
    CP --> Sidecar1 & Sidecar2
```

**Pros:** Per-service policies, mTLS everywhere, observability built-in
**Cons:** Latency overhead, operational complexity
**Use Case:** Kubernetes, microservices, need fine-grained control

---

## Integration Points

### Upstream (Network Layer)

```
BGP / Anycast:
├── Advertise VIP from multiple locations
├── BGP communities for traffic engineering
└── ECMP for multi-path routing

DNS:
├── GeoDNS for regional routing
├── Low TTL for quick failover (30-60s)
└── Health-check integrated DNS
```

### Downstream (Backends)

```
Backend Registration:
├── Service Discovery (Consul, K8s endpoints)
├── Static configuration (config files)
├── DNS-based discovery
└── API-based registration

Health Endpoints:
├── /health - Basic liveness
├── /ready - Readiness with dependencies
└── Custom health check paths
```

### Sidecar Pattern Integration

```mermaid
flowchart LR
    subgraph External["External Traffic"]
        Client --> Ingress[Ingress LB]
    end

    subgraph Mesh["Service Mesh"]
        Ingress --> GW[Gateway Envoy]
        GW --> S1[Sidecar]
        S1 --> App1[Service A]
        S1 --> S2[Sidecar]
        S2 --> App2[Service B]
    end
```

---

## Failure Modes and Mitigations

| Failure | Impact | Detection | Mitigation |
|---------|--------|-----------|------------|
| **L4 LB node failure** | Traffic to that node lost | BGP withdrawal, ECMP reconverges | Anycast + multiple nodes |
| **L7 LB node failure** | Connections dropped | Health check from L4 | Consistent hashing minimizes impact |
| **All backends unhealthy** | Service unavailable | All health checks fail | Fail-open (serve stale), alert |
| **Config store unavailable** | No config updates | Heartbeat timeout | Use cached config, continue operating |
| **Network partition** | Split-brain possible | Gossip protocol | Prefer availability, accept staleness |
| **TLS certificate expiry** | Connection failures | Cert monitoring | Auto-renewal, alerting |

### Failure Handling Strategy

```mermaid
flowchart TD
    Failure[Failure Detected] --> Type{Failure Type?}

    Type -->|LB Node| LBF[LB Node Failure]
    Type -->|Backend| BF[Backend Failure]
    Type -->|Config| CF[Config Failure]

    LBF --> Anycast[BGP Withdraw<br/>ECMP Reconverge]
    Anycast --> Rehash[Maglev Rehash<br/>Minimal Disruption]

    BF --> Remove[Remove from Pool]
    Remove --> Drain[Drain Connections]
    Drain --> Alert[Alert On-Call]

    CF --> Cache[Use Cached Config]
    Cache --> Continue[Continue Operating]
    Continue --> AlertCF[Alert: Config Stale]
```
