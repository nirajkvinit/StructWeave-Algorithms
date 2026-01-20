# Distributed Load Balancer - System Design

## System Overview

A **Distributed Load Balancer** is a fundamental infrastructure component that distributes incoming network traffic across multiple backend servers to ensure high availability, reliability, and optimal resource utilization. It acts as a reverse proxy, sitting between clients and server pools, making intelligent routing decisions based on various algorithms and health status.

In distributed systems at scale, load balancers operate across multiple layers (L4/L7), handle millions of concurrent connections, and must themselves be highly available through redundancy patterns like Anycast, VRRP, or active-active clustering.

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| **Traffic Pattern** | Pass-through (mostly stateless) | High throughput, low state overhead |
| **Latency Sensitivity** | Critical | Must add < 1ms (L4) to < 5ms (L7) overhead |
| **Consistency Requirement** | Eventual (for health state) | Health propagation delay acceptable |
| **Availability Requirement** | Very High (99.99%+) | No single point of failure |
| **Connection Handling** | Millions concurrent | Efficient connection tracking required |

---

## Complexity Rating

**Medium-High**

- Core concept straightforward (distribute traffic)
- Significant complexity in consistent hashing (minimal disruption)
- L4 vs L7 trade-offs require deep understanding
- Health check design impacts availability
- High availability of the LB itself is challenging

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/Non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture, two-tier L4/L7 patterns, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data model, API design, algorithm pseudocode |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Maglev hashing, health checks, connection handling |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | DDoS protection, TLS, access control |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trade-offs, trap questions, common mistakes |

---

## L4 vs L7 Comparison

| Aspect | Layer 4 (Transport) | Layer 7 (Application) |
|--------|---------------------|----------------------|
| **OSI Layer** | TCP/UDP | HTTP/HTTPS/gRPC |
| **Decision Basis** | IP + Port (5-tuple hash) | URL, headers, cookies, content |
| **Latency Overhead** | Microseconds | Milliseconds |
| **TLS Termination** | No (pass-through) | Yes (can inspect/modify) |
| **Content Routing** | No | Yes (path-based, host-based) |
| **Session Persistence** | Source IP only | Cookies, headers |
| **Use Case** | High-throughput, gaming, video | APIs, web apps, microservices |

---

## Algorithm Summary

| Algorithm | Distribution | Consistency | Overhead | Best For |
|-----------|-------------|-------------|----------|----------|
| **Round Robin** | Even | None (no state) | O(1) | Stateless, identical backends |
| **Weighted Round Robin** | Proportional | None | O(1) | Heterogeneous capacity |
| **Least Connections** | Load-aware | Per-connection state | O(n) | Varying request durations |
| **Power of Two Choices** | Near-optimal | Minimal state | O(1) | High-scale, dynamic backends |
| **Maglev Hashing** | Even, consistent | Minimal disruption | O(1) lookup | Stateful backends, cache servers |
| **Source IP Hash** | Deterministic | Session affinity | O(1) | Sticky sessions without cookies |

---

## Real-World References

| Company | Implementation | Key Insight |
|---------|---------------|-------------|
| **Google** | Maglev (L4) + GFE (L7) | Software L4 LB, 10Gbps per node, consistent hashing with 65537 table |
| **Netflix** | ELB + Zuul + Custom | Choice-of-2 algorithm, server utilization scoring, 1M+ RPS |
| **Meta** | Katran (L4) + Proxygen (L7) | eBPF-based L4, XDP for packet processing |
| **Cloudflare** | Unimog (L4) + Anycast | Global Anycast network, edge-based routing |
| **Envoy** | xDS-based (L7) | CNCF standard, service mesh data plane |

---

## Key Trade-offs at a Glance

```
L4 (Speed) ←――――――――――――――→ L7 (Intelligence)
     ↑                           ↑
     Packet forwarding           Content-aware routing
     Microsecond latency         Millisecond latency
     No content inspection       Full HTTP inspection

Consistency ←――――――――――――――→ Simplicity
     ↑                           ↑
     Maglev/Consistent Hash      Round Robin
     Minimal connection drop     No state management
     Complex implementation      Easy to implement

Active Health Checks ←――――――→ Passive Health Checks
     ↑                           ↑
     Proactive detection         Zero overhead
     Additional load on backends Reacts only after failures
     Configurable intervals      Uses real traffic
```

---

## Architecture Patterns

### Pattern 1: Two-Tier L4/L7 (Recommended for Scale)

```
Internet → Anycast VIP → L4 LB Pool → L7 LB Pool → Backend Services
                         (Maglev)     (Envoy/Nginx)
```

- L4 handles raw throughput and connection distribution
- L7 handles intelligent routing, TLS, retries

### Pattern 2: Single-Tier L7 (Simpler, Lower Scale)

```
Internet → DNS → L7 LB (HA pair) → Backend Services
                 (HAProxy/Nginx)
```

- Suitable for moderate traffic
- Easier to operate

### Pattern 3: Service Mesh Sidecar

```
Client Pod → Sidecar Proxy → Service Discovery → Target Sidecar → Target Pod
             (Envoy)         (Consul/Istio)      (Envoy)
```

- Load balancing pushed to application layer
- Per-pod proxies handle routing

---

## Related Systems

- **API Gateway** - Often sits behind/integrates with L7 LB
- **Service Discovery** - Provides backend membership to LB
- **CDN** - Edge caching, uses LB concepts at PoPs
- **Rate Limiter** - Often co-located or integrated with LB
- **Service Mesh** - Distributes LB to sidecar proxies
