# Service Mesh Design - High-Level Design

[Back to Index](./00-index.md) | [Previous: Requirements](./01-requirements-and-estimations.md) | [Next: Low-Level Design](./03-low-level-design.md)

---

## Architecture Overview

A service mesh consists of two primary components: the **data plane** (network proxies that handle actual traffic) and the **control plane** (management layer that configures and coordinates the data plane).

---

## Sidecar Architecture (Istio/Linkerd Model)

```mermaid
flowchart TB
    subgraph ControlPlane["Control Plane"]
        direction TB
        Istiod["Istiod<br/>(Pilot + Citadel + Galley)"]
        ConfigStore["Config Store<br/>(etcd/K8s API)"]

        Istiod <--> ConfigStore
    end

    subgraph DataPlane["Data Plane"]
        subgraph NS1["Namespace: frontend"]
            subgraph PodA["Pod: web-frontend"]
                AppA["web-app<br/>:8080"]
                ProxyA["envoy<br/>:15001"]
            end
        end

        subgraph NS2["Namespace: backend"]
            subgraph PodB["Pod: api-server"]
                AppB["api-app<br/>:8080"]
                ProxyB["envoy<br/>:15001"]
            end

            subgraph PodC["Pod: db-service"]
                AppC["db-app<br/>:5432"]
                ProxyC["envoy<br/>:15001"]
            end
        end
    end

    subgraph Gateways["Gateways"]
        Ingress["Ingress Gateway<br/>(Envoy)"]
        Egress["Egress Gateway<br/>(Envoy)"]
    end

    subgraph External["External"]
        Client["External Client"]
        ExtService["External API"]
    end

    Client --> Ingress
    Ingress -->|mTLS| ProxyA

    AppA --> ProxyA
    ProxyA -->|mTLS| ProxyB
    ProxyB --> AppB

    AppB --> ProxyB
    ProxyB -->|mTLS| ProxyC
    ProxyC --> AppC

    ProxyA --> Egress
    Egress --> ExtService

    Istiod -->|"xDS<br/>(config)"| ProxyA
    Istiod -->|"xDS<br/>(config)"| ProxyB
    Istiod -->|"xDS<br/>(config)"| ProxyC
    Istiod -->|"xDS<br/>(config)"| Ingress
    Istiod -->|"xDS<br/>(config)"| Egress

    style ControlPlane fill:#e3f2fd
    style DataPlane fill:#f3e5f5
    style Gateways fill:#e8f5e9
    style External fill:#fff3e0
```

---

## Sidecar-Less Architecture (Cilium / Istio Ambient)

```mermaid
flowchart TB
    subgraph ControlPlane["Control Plane"]
        CiliumOp["Cilium Operator"]
        Hubble["Hubble<br/>(Observability)"]
    end

    subgraph Node1["Node 1"]
        CiliumAgent1["Cilium Agent<br/>(eBPF)"]

        subgraph Pod1["Pod A"]
            App1["Application"]
        end

        subgraph Pod2["Pod B"]
            App2["Application"]
        end

        Kernel1["Linux Kernel<br/>eBPF Programs"]
    end

    subgraph Node2["Node 2"]
        CiliumAgent2["Cilium Agent<br/>(eBPF)"]

        subgraph Pod3["Pod C"]
            App3["Application"]
        end

        Kernel2["Linux Kernel<br/>eBPF Programs"]
    end

    App1 --> Kernel1
    App2 --> Kernel1
    Kernel1 -->|"mTLS<br/>(kernel-level)"| Kernel2
    Kernel2 --> App3

    CiliumOp --> CiliumAgent1
    CiliumOp --> CiliumAgent2

    CiliumAgent1 --> Kernel1
    CiliumAgent2 --> Kernel2

    Kernel1 --> Hubble
    Kernel2 --> Hubble

    style ControlPlane fill:#e3f2fd
    style Node1 fill:#f3e5f5
    style Node2 fill:#f3e5f5
```

---

## Istio Ambient Mode Architecture

```mermaid
flowchart TB
    subgraph ControlPlane["Control Plane"]
        Istiod["Istiod"]
    end

    subgraph Node1["Node 1"]
        Ztunnel1["Ztunnel<br/>(L4 Proxy)<br/>DaemonSet"]

        subgraph Pod1["Pod A"]
            App1["Application"]
        end

        subgraph Pod2["Pod B"]
            App2["Application"]
        end
    end

    subgraph Node2["Node 2"]
        Ztunnel2["Ztunnel<br/>(L4 Proxy)<br/>DaemonSet"]

        subgraph Pod3["Pod C"]
            App3["Application"]
        end

        Waypoint["Waypoint Proxy<br/>(L7, Optional)"]
    end

    App1 --> Ztunnel1
    App2 --> Ztunnel1

    Ztunnel1 -->|"HBONE<br/>(mTLS tunnel)"| Ztunnel2
    Ztunnel2 --> App3

    Ztunnel2 -.->|"L7 routing<br/>(if needed)"| Waypoint
    Waypoint -.-> App3

    Istiod --> Ztunnel1
    Istiod --> Ztunnel2
    Istiod --> Waypoint

    style ControlPlane fill:#e3f2fd
    style Node1 fill:#e8f5e9
    style Node2 fill:#e8f5e9
```

---

## Data Flow: Request Through Sidecar Mesh

```mermaid
sequenceDiagram
    participant Client as Client App
    participant ProxyA as Sidecar A<br/>(Envoy)
    participant ProxyB as Sidecar B<br/>(Envoy)
    participant Server as Server App

    Note over Client,Server: Service A calling Service B

    Client->>ProxyA: HTTP Request<br/>(localhost:8080)

    Note over ProxyA: 1. Intercept via iptables
    Note over ProxyA: 2. Apply routing rules
    Note over ProxyA: 3. Select endpoint (LB)
    Note over ProxyA: 4. Start mTLS handshake

    ProxyA->>ProxyB: mTLS Connection<br/>(present certificate)
    ProxyB-->>ProxyA: mTLS Handshake Complete

    ProxyA->>ProxyB: Encrypted Request<br/>(+ trace headers)

    Note over ProxyB: 1. Terminate mTLS
    Note over ProxyB: 2. Verify identity
    Note over ProxyB: 3. Apply authz policy
    Note over ProxyB: 4. Record metrics

    ProxyB->>Server: HTTP Request<br/>(localhost:8080)
    Server-->>ProxyB: HTTP Response

    Note over ProxyB: Record latency, status

    ProxyB-->>ProxyA: Encrypted Response
    ProxyA-->>Client: HTTP Response

    Note over ProxyA: Record end-to-end metrics
```

---

## Configuration Propagation Flow

```mermaid
sequenceDiagram
    participant Admin as Platform Admin
    participant K8s as Kubernetes API
    participant CP as Control Plane<br/>(Istiod)
    participant Proxy as Sidecar Proxies

    Admin->>K8s: Apply VirtualService<br/>(kubectl apply)
    K8s-->>Admin: Resource created

    K8s->>CP: Watch notification<br/>(new config)

    Note over CP: 1. Validate config
    Note over CP: 2. Generate Envoy config
    Note over CP: 3. Compute affected proxies

    CP->>Proxy: xDS Push (Delta)<br/>(RDS update)
    Proxy-->>CP: ACK

    Note over Proxy: Hot reload config<br/>(no connection drop)

    Note over Admin,Proxy: Config propagation: 1-30 seconds typical
```

---

## mTLS Handshake and Certificate Flow

```mermaid
sequenceDiagram
    participant Proxy as Sidecar Proxy
    participant CA as Certificate Authority<br/>(Istiod)
    participant Peer as Peer Proxy

    Note over Proxy,CA: Certificate Provisioning (startup)

    Proxy->>CA: CSR (Certificate Signing Request)<br/>(SPIFFE ID: spiffe://cluster/ns/svc)

    Note over CA: 1. Verify pod identity
    Note over CA: 2. Check authorization
    Note over CA: 3. Sign certificate

    CA-->>Proxy: Signed Certificate<br/>(24h validity)

    Note over Proxy: Store cert in memory<br/>Schedule renewal at 50% lifetime

    Note over Proxy,Peer: mTLS Connection

    Proxy->>Peer: ClientHello + Certificate
    Peer->>Proxy: ServerHello + Certificate

    Note over Proxy,Peer: Both verify:<br/>1. Certificate chain<br/>2. SPIFFE ID matches policy<br/>3. Certificate not expired

    Proxy->>Peer: Encrypted Application Data
```

---

## Key Architectural Decisions

### Decision 1: Sidecar vs Sidecar-less

| Factor | Sidecar (Istio/Linkerd) | Sidecar-less (Cilium/Ambient) |
|--------|-------------------------|-------------------------------|
| **L7 Features** | Full HTTP/gRPC features | Limited (L4 focus) or optional waypoint |
| **Resource Overhead** | ~60MB + CPU per pod | ~5MB per node |
| **Isolation** | Per-pod isolation | Shared per node |
| **Complexity** | Higher (more moving parts) | Lower (fewer components) |
| **Maturity** | Production-proven | Emerging (growing adoption) |

**Recommendation**: Start with sidecar model for full feature set. Consider sidecar-less for resource-constrained environments or when L7 features are not critical.

### Decision 2: Proxy Technology

| Factor | Envoy (C++) | linkerd2-proxy (Rust) | eBPF (Kernel) |
|--------|-------------|----------------------|---------------|
| **Performance** | Good | Better (lower latency) | Best (kernel-level) |
| **Memory** | ~60MB | ~10MB | Minimal |
| **Extensibility** | WASM filters, Lua | Limited | BPF programs |
| **Protocol Support** | HTTP/1-3, gRPC, TCP | HTTP/1-2, gRPC, TCP | L3/L4 + limited L7 |
| **Ecosystem** | Largest | Growing | Growing |

**Recommendation**: Envoy for maximum flexibility and ecosystem. linkerd2-proxy for performance-critical, simpler deployments. eBPF for extreme scale.

### Decision 3: Configuration Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    Configuration Approaches                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Kubernetes CRDs (Istio)              Service Mesh Interface    │
│  ─────────────────────                ───────────────────────   │
│  • VirtualService                     • TrafficTarget            │
│  • DestinationRule                    • HTTPRouteGroup           │
│  • Gateway                            • TrafficSplit             │
│  • AuthorizationPolicy                • TrafficMetrics           │
│  • PeerAuthentication                                            │
│                                                                  │
│  Pros: Fine-grained control           Pros: Portable             │
│  Cons: Istio-specific                 Cons: Limited features     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Decision 4: Multi-Cluster Strategy

| Approach | Network Requirement | Latency | Complexity |
|----------|---------------------|---------|------------|
| **Flat Network** | Pod IPs routable across clusters | Lowest | Low |
| **Gateway-Based** | Only gateway IPs exposed | Higher | Medium |
| **Federated** | Independent meshes with trust | Variable | High |

---

## Component Responsibilities

### Control Plane Components

```mermaid
flowchart LR
    subgraph Istiod["Istiod (Unified Control Plane)"]
        Pilot["Pilot<br/>─────────<br/>• Service discovery<br/>• xDS server<br/>• Config validation"]

        Citadel["Citadel<br/>─────────<br/>• Certificate authority<br/>• Identity management<br/>• Key rotation"]

        Galley["Galley<br/>─────────<br/>• Config ingestion<br/>• Validation<br/>• Distribution"]
    end

    K8s["Kubernetes API"]
    Proxies["Sidecar Proxies"]

    K8s -->|"Watch resources"| Galley
    Galley -->|"Validated config"| Pilot
    Pilot -->|"xDS (LDS/RDS/CDS/EDS)"| Proxies
    Citadel -->|"SDS (certificates)"| Proxies

    style Istiod fill:#e3f2fd
```

### Data Plane Components

| Component | Responsibility | Protocol |
|-----------|---------------|----------|
| **Sidecar Proxy** | Traffic interception, routing, mTLS, observability | HTTP/1-2, gRPC, TCP |
| **Ingress Gateway** | North-south traffic entry, TLS termination | HTTPS, HTTP/2 |
| **Egress Gateway** | Controlled external access, logging | HTTPS, TCP |
| **Waypoint Proxy** | L7 processing in ambient mode | HTTP/gRPC |

---

## Traffic Flow Patterns

### East-West Traffic (Service-to-Service)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│    Service A                           Service B                 │
│    ┌────────┐    ┌─────────┐    ┌─────────┐    ┌────────┐      │
│    │  App   │───►│ Sidecar │═══►│ Sidecar │───►│  App   │      │
│    └────────┘    └─────────┘    └─────────┘    └────────┘      │
│                       │              │                          │
│                       ▼              ▼                          │
│              ┌─────────────────────────────┐                   │
│              │   mTLS Encrypted Channel    │                   │
│              │   + Trace Context           │                   │
│              │   + Metrics Collection      │                   │
│              └─────────────────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### North-South Traffic (External to Mesh)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  External                    Mesh                               │
│  Client         Ingress      Service                            │
│    │            Gateway        │                                │
│    │    HTTPS      │    mTLS   │                                │
│    │───────────────►═══════════►                                │
│    │               │           │                                │
│    │               │           │                                │
│    │  TLS          │  Identity │                                │
│    │  Termination  │  Injection│                                │
│    │               │           │                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Synchronous (request-response) | Real-time traffic management |
| **Push vs Pull Config** | Push (xDS from control plane) | Fast propagation, consistent updates |
| **Stateless vs Stateful** | Stateless proxies, stateful control plane | Proxy resilience, simplified scaling |
| **Centralized vs Distributed** | Centralized control plane, distributed data plane | Manageability vs performance |
| **mTLS Mode** | Strict (production), Permissive (migration) | Security requirements |
| **Observability** | Automatic (proxy-generated) | No application changes |

---

## High-Level Request Processing

```mermaid
flowchart TB
    subgraph Inbound["Inbound Processing"]
        I1["1. iptables intercept"]
        I2["2. TLS termination"]
        I3["3. Protocol detection"]
        I4["4. Authentication"]
        I5["5. Authorization"]
        I6["6. Rate limiting"]
        I7["7. Route to application"]

        I1 --> I2 --> I3 --> I4 --> I5 --> I6 --> I7
    end

    subgraph Outbound["Outbound Processing"]
        O1["1. Application request"]
        O2["2. iptables intercept"]
        O3["3. Route selection"]
        O4["4. Load balancing"]
        O5["5. Circuit breaker check"]
        O6["6. Retry policy"]
        O7["7. mTLS origination"]

        O1 --> O2 --> O3 --> O4 --> O5 --> O6 --> O7
    end

    subgraph Observability["Always Active"]
        M["Metrics collection"]
        T["Trace propagation"]
        L["Access logging"]
    end

    Inbound --> Observability
    Outbound --> Observability
```

---

## Technology Stack Summary

| Layer | Component | Technology Options |
|-------|-----------|-------------------|
| **Control Plane** | Config Management | Kubernetes CRDs, etcd |
| **Control Plane** | Service Discovery | Kubernetes, Consul |
| **Control Plane** | Certificate Authority | Built-in CA, cert-manager, Vault |
| **Data Plane** | Proxy | Envoy, linkerd2-proxy, Cilium |
| **Data Plane** | Sidecar Injection | Mutating webhook, CNI plugin |
| **Observability** | Metrics | Prometheus, OpenTelemetry |
| **Observability** | Tracing | Jaeger, Zipkin, Tempo |
| **Observability** | Visualization | Kiali, Grafana |

---

**Next: [03 - Low-Level Design](./03-low-level-design.md)**
