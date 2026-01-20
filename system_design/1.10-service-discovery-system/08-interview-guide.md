# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45 minutes)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Problem Setup** | Why service discovery? | Static config problems, dynamic infrastructure |
| 5-15 min | **Core Design** | Registry, registration, discovery | Draw basic architecture, explain data flow |
| 15-25 min | **Discovery Patterns** | Client-side vs server-side vs DNS | Trade-offs, when to use each |
| 25-35 min | **Deep Dive** | Health checking, consistency, failover | Push vs pull, CP vs AP, self-preservation |
| 35-45 min | **Trade-offs** | Scaling, security, multi-DC | Design decisions, follow-up questions |

---

## Whiteboard Strategy

### Step 1: Start with the Problem (2 min)

```
"Let me first explain WHY we need service discovery..."

Draw this:

THE PROBLEM: Static Configuration
┌─────────────────────────────────────────────────────────────┐
│  config.yaml:                                                │
│    payment_service:                                          │
│      - 10.0.1.1:8080                                        │
│      - 10.0.1.2:8080                                        │
│                                                              │
│  PROBLEMS:                                                   │
│  1. Instance crashes → clients still try to connect         │
│  2. New instance added → need to update config everywhere   │
│  3. Auto-scaling → config doesn't know about new instances  │
│  4. Different environments → different configs to maintain  │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Basic Architecture (5 min)

```
"Service discovery solves this with a dynamic registry..."

Draw this:

                    ┌─────────────────┐
                    │ Service Registry │
                    │    (Cluster)     │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │ payment-1│      │ payment-2│      │ payment-3│
    │ Register │      │ Register │      │ Register │
    └──────────┘      └──────────┘      └──────────┘
           ▲
           │ Discover
    ┌──────────┐
    │  order   │
    │ service  │
    └──────────┘

Flow:
1. Services REGISTER themselves on startup
2. Clients DISCOVER available instances
3. Registry performs HEALTH CHECKS
4. Unhealthy instances are REMOVED
```

### Step 3: Discovery Patterns (5 min)

```
"There are three main patterns for discovery..."

CLIENT-SIDE DISCOVERY (Netflix Eureka style):
┌────────┐     ┌──────────┐     ┌─────────┐
│ Client │────►│ Registry │     │ Service │
│        │◄────│          │     │         │
│  LB    │────────────────────► │         │
└────────┘                      └─────────┘
Client queries registry, does its own load balancing

SERVER-SIDE DISCOVERY (Kubernetes style):
┌────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐
│ Client │────►│   Load   │────►│ Registry │     │ Service │
│        │     │ Balancer │◄────│          │     │         │
│        │◄────│          │────────────────────►│         │
└────────┘     └──────────┘                      └─────────┘
Load balancer queries registry, client is simple

DNS-BASED DISCOVERY:
┌────────┐     ┌─────┐     ┌─────────┐
│ Client │────►│ DNS │     │ Service │
│        │◄────│     │     │         │
│        │────────────────►│         │
└────────┘                 └─────────┘
DNS returns service IPs, universal but limited
```

### Step 4: Health Checking (5 min)

```
"Health checking is critical to avoid routing to dead instances..."

PUSH MODEL (Heartbeat):
Service ──heartbeat──► Registry ──heartbeat──► Registry
         (every 10s)              (every 10s)
If no heartbeat for 30s → mark DOWN

PULL MODEL (Registry probes):
Registry ──GET /health──► Service
Registry ◄──200 OK────── Service
If 3 consecutive failures → mark DOWN

HYBRID (Best practice):
- Heartbeat for liveness (am I running?)
- HTTP check for readiness (can I serve traffic?)
```

### Step 5: Consistency and Failover (5 min)

```
"How do we handle registry failures?..."

CLUSTER SETUP (3-5 nodes):
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Leader  │◄───►│Follower1│◄───►│Follower2│
└─────────┘     └─────────┘     └─────────┘
    │
    ▼
Writes go to leader, replicated to followers
Can tolerate (N-1)/2 failures

CLIENT FAILOVER:
1. Try primary registry node
2. If fails, try secondary
3. If all fail, use cached data
4. If no cache, use static fallback
```

---

## Key Talking Points

### When Asked "What is Service Discovery?"

> "Service discovery is a mechanism that allows services in a distributed system to find each other dynamically. Instead of hardcoding IP addresses, services register themselves with a central registry when they start, and clients query the registry to find available instances. The registry also monitors service health and removes unhealthy instances from the pool."

### When Asked "Client-side vs Server-side Discovery?"

> "In client-side discovery, the client directly queries the registry and handles load balancing itself. This gives the client full control but requires a discovery library. In server-side discovery, a load balancer or proxy sits between the client and services, querying the registry on the client's behalf. The client just calls a single endpoint, making it simpler but adding an extra network hop. Client-side is common in Java/Spring ecosystems with Eureka, while server-side is standard in Kubernetes."

### When Asked "How do Health Checks Work?"

> "There are two models: push and pull. In push, services send periodic heartbeats to the registry - if no heartbeat arrives within the timeout, the instance is marked unhealthy. In pull, the registry proactively probes service health endpoints. Push scales better and works through NAT, but can't detect zombie processes. Pull can verify actual functionality but adds load to the registry. Most production systems use a hybrid - heartbeat for liveness, HTTP checks for readiness."

### When Asked "What About Consistency?"

> "Service discovery typically favors availability over consistency - it's better to return potentially stale data than no data at all. Systems like Eureka use eventual consistency with gossip protocol. However, some use cases like configuration or leader election need strong consistency, which is why systems like Consul offer both - Raft consensus for the KV store, gossip for service discovery."

---

## Trap Questions & How to Handle

### Trap 1: "Can't we just use DNS?"

**What they want:** Understanding of DNS limitations.

**Good answer:**
> "DNS can work for basic discovery, but has significant limitations:
> 1. **TTL caching** - DNS clients cache results, so changes take time to propagate. Even with low TTLs, some clients ignore them.
> 2. **No health integration** - DNS doesn't know if an instance is healthy; you'd need separate health checks.
> 3. **Limited metadata** - DNS only returns IPs, not port numbers, versions, or tags. SRV records help but aren't universally supported.
> 4. **No change notification** - Clients must poll; there's no push mechanism.
>
> DNS works well for stable services with low churn, like database replicas. For highly dynamic microservices, a purpose-built registry is better."

### Trap 2: "What if the registry goes down?"

**What they want:** Understanding of reliability and graceful degradation.

**Good answer:**
> "We handle this at multiple levels:
> 1. **Clustering** - Run 3-5 registry nodes with consensus; can lose minority and keep operating.
> 2. **Client caching** - Clients cache discovery results with TTL; stale data is better than no data.
> 3. **Static fallback** - Configure known-good endpoints as last resort.
> 4. **Self-preservation** - During network partitions, registries like Eureka stop evicting instances to prevent false positives from causing complete outage.
>
> The key insight is fail-open: it's better to route to a potentially stale instance list than to fail completely."

### Trap 3: "How do you prevent someone from registering a fake service?"

**What they want:** Security awareness.

**Good answer:**
> "This is called registry poisoning. We prevent it through:
> 1. **Authentication** - Services must authenticate before registering (API tokens, mTLS certificates)
> 2. **Authorization** - ACLs restrict which identities can register which services. payment-service identity can only register as 'payment'.
> 3. **Identity verification** - With SPIFFE/SPIRE, service identity is cryptographically verified via certificates
> 4. **Network policies** - Only allow registration from known IP ranges
>
> In a zero-trust model, we use mTLS everywhere - the registry verifies the client certificate matches the service being registered."

### Trap 4: "How does this work across datacenters?"

**What they want:** Multi-DC architecture understanding.

**Good answer:**
> "Multi-DC is challenging because of WAN latency and partitions. The typical approach is:
> 1. **Regional registries** - Each datacenter has its own registry cluster for local operations
> 2. **WAN federation** - Registries sync service catalogs across DCs via gossip or async replication
> 3. **Local-first queries** - Clients prefer local instances; remote instances are fallback
> 4. **Health is local** - We don't replicate health status cross-DC (too expensive); instead, probe on-demand for cross-DC calls
>
> The trade-off is consistency - cross-DC data is eventually consistent with seconds of lag."

### Trap 5: "What's the difference between service discovery and load balancing?"

**What they want:** Clear understanding of concerns.

**Good answer:**
> "Service discovery answers WHERE: which instances are available and healthy. Load balancing answers HOW: which specific instance to send this request to.
>
> Discovery: 'Payment service has instances at 10.0.1.1, 10.0.1.2, 10.0.1.3'
> Load balancing: 'This request goes to 10.0.1.2 using round-robin'
>
> They're often combined but are separate concerns. You can have discovery without load balancing (client picks randomly) or load balancing without discovery (static backend list). In client-side discovery, the client does both. In server-side discovery, they're typically separate components."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Correct Approach |
|---------|---------------|------------------|
| Forgetting health checks | Discovery alone doesn't ensure availability | Always mention health checking mechanism |
| Claiming DNS is sufficient | Ignores TTL, health, metadata limitations | Acknowledge DNS limitations, when it works |
| Single registry node | Single point of failure | Always mention clustering (3-5 nodes) |
| Ignoring client caching | Every request to registry doesn't scale | Mention client-side caching with TTL |
| Strong consistency everywhere | Impacts availability during partitions | Explain CP vs AP trade-offs |
| Forgetting graceful degradation | What happens when registry is down? | Explain failover strategy |

---

## Implementation Comparison Table

| Feature | Consul | Eureka | etcd | ZooKeeper |
|---------|--------|--------|------|-----------|
| **Primary Use** | Service discovery + KV | Service discovery | KV + coordination | Coordination + discovery |
| **Consistency** | Raft (CP) + Gossip (AP) | AP (eventual) | Raft (CP) | ZAB (CP) |
| **Health Checks** | Multiple types (HTTP, TCP, script) | Client heartbeat | Lease TTL | Session heartbeat |
| **Multi-DC** | Native WAN federation | Zone awareness | Manual federation | Observer nodes |
| **DNS Interface** | Yes (built-in) | No | No | No |
| **Language** | Go | Java | Go | Java |
| **Best For** | General-purpose, multi-DC | Java/Spring apps | Kubernetes, config | Coordination, legacy |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│  SERVICE DISCOVERY CHEAT SHEET                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CORE CONCEPT                                                        │
│  • Registry stores service instances                                │
│  • Services register on startup, deregister on shutdown             │
│  • Clients query registry to find available instances               │
│  • Health checks remove unhealthy instances                          │
│                                                                      │
│  DISCOVERY PATTERNS                                                  │
│  • Client-side: Client queries registry, does LB (Eureka)           │
│  • Server-side: Proxy queries registry (Kubernetes)                 │
│  • DNS-based: DNS returns IPs (limited metadata, TTL issues)        │
│                                                                      │
│  HEALTH CHECKING                                                     │
│  • Push (heartbeat): Service sends periodic signals                 │
│  • Pull (polling): Registry probes service endpoints                │
│  • Hybrid: Heartbeat for liveness, HTTP for readiness               │
│                                                                      │
│  CONSISTENCY                                                         │
│  • AP (Eureka): Always available, eventually consistent             │
│  • CP (ZooKeeper): Strongly consistent, unavailable during split    │
│  • Recommendation: AP for discovery, CP for coordination            │
│                                                                      │
│  RELIABILITY                                                         │
│  • Cluster: 3-5 nodes, quorum-based                                 │
│  • Client caching: TTL-based + push invalidation                    │
│  • Self-preservation: Don't evict during network issues             │
│  • Fallback: Static endpoints as last resort                        │
│                                                                      │
│  REAL-WORLD SYSTEMS                                                  │
│  • Consul: Multi-DC, DNS interface, health checks                   │
│  • Eureka: Netflix, self-preservation, Java-centric                 │
│  • etcd: Kubernetes, strong consistency, watch API                  │
│  • CoreDNS: Kubernetes DNS, plugin-based                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Practice Questions

### Basic Level
1. What problem does service discovery solve?
2. Draw the basic architecture of a service discovery system
3. What are the three main discovery patterns?

### Intermediate Level
4. Compare push vs pull health checking - when would you use each?
5. Explain the trade-offs between client-side and server-side discovery
6. What is self-preservation mode and why is it important?

### Advanced Level
7. Design a multi-datacenter service discovery system
8. How would you prevent registry poisoning attacks?
9. Compare Consul, Eureka, and etcd - when would you choose each?
10. How do you handle the registry being unavailable?

---

## Red Flags in Your Answer

If you hear yourself saying these, course correct:

| Red Flag | Problem | Fix |
|----------|---------|-----|
| "Just use DNS" | Ignores DNS limitations | Acknowledge TTL, health, metadata limits |
| "Single registry server" | Single point of failure | Mention 3-5 node cluster |
| "Strong consistency for everything" | Impacts availability | Discuss CP vs AP trade-offs |
| "Registry handles load balancing" | Conflating concerns | Separate discovery (WHERE) from LB (HOW) |
| "Health checks are simple" | Oversimplifying | Discuss false positives/negatives, thresholds |
| "Just replicate across DCs" | Ignores WAN challenges | Discuss latency, consistency, federation |
