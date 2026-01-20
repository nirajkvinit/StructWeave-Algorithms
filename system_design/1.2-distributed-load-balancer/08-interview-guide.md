# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45-minute format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify | Ask questions, scope the problem | Don't jump to solution |
| **5-15 min** | High-Level | Core components, data flow | Draw architecture diagram |
| **15-30 min** | Deep Dive | 1-2 critical components | Show algorithm knowledge |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failure scenarios | Discuss alternatives |
| **40-45 min** | Wrap Up | Summary, handle follow-ups | Be prepared for curveballs |

---

## Meta-Commentary: How to Approach This Problem

### What Makes Load Balancers Unique

1. **It's infrastructure** - Everyone uses it but few design it from scratch
2. **Layer matters** - L4 vs L7 is a fundamental decision
3. **Availability is paramount** - The LB failing takes down everything
4. **Performance overhead** - Every millisecond counts at this layer
5. **Stateless is preferred** - But connection affinity adds complexity

### Where to Spend Most Time

| Area | Time Allocation | Why |
|------|-----------------|-----|
| L4 vs L7 decision | 15% | Fundamental architectural choice |
| Load balancing algorithms | 25% | Shows depth of knowledge |
| Health checks | 15% | Critical for reliability |
| High availability of LB itself | 20% | Often overlooked, very important |
| Scaling and bottlenecks | 15% | Shows production thinking |
| Trade-offs discussion | 10% | Shows maturity |

### Key Insight to Demonstrate

> "The load balancer is the single point of failure for your entire system, so making the LB itself highly available is as important as the load balancing logic."

---

## Questions to Ask Interviewer

### Clarifying Questions

| Question | Why It Matters |
|----------|----------------|
| What's the expected scale (QPS, connections)? | Drives L4 vs L7, number of nodes |
| Is this for HTTP traffic or also TCP/UDP? | Determines if L4-only is sufficient |
| Do we need session affinity? | Affects algorithm choice |
| Are backends homogeneous or heterogeneous? | Affects weight strategy |
| Single region or multi-region? | Changes availability architecture |
| Is TLS termination required at LB? | Significant CPU implication |
| What's the latency budget? | Drives architecture decisions |

### Scope Questions

| Question | Narrowing Scope |
|----------|-----------------|
| Should we design the health checking system in detail? | Complex component |
| Do we need to cover the control plane (config management)? | Time-consuming |
| Is global load balancing (GeoDNS) in scope? | Big topic by itself |
| Should we discuss the backend services? | Stay focused on LB |

---

## Trade-offs Discussion

### L4 vs L7 Load Balancer

| Decision | Option A: L4 Only | Option B: L7 | Option C: Two-Tier (L4 → L7) |
|----------|-------------------|--------------|------------------------------|
| | **Pros:** Ultra-low latency, handles any protocol, simple | **Pros:** Content routing, TLS termination, retries | **Pros:** Best of both, scalable, industry standard |
| | **Cons:** No content awareness, limited session affinity | **Cons:** Higher latency, CPU-intensive | **Cons:** More components, complex |
| **Recommendation** | Simple TCP/UDP services | API/web traffic, moderate scale | **High-scale production** |

### Consistent Hashing vs Least Connections

| Decision | Consistent Hashing (Maglev) | Least Connections |
|----------|----------------------------|-------------------|
| | **Pros:** Session affinity, minimal disruption on changes, O(1) lookup | **Pros:** Load-aware, adapts to varying request durations |
| | **Cons:** Not load-aware, can lead to imbalance | **Cons:** O(n) selection, no inherent affinity |
| **Recommendation** | Caches, stateful backends | Stateless APIs with varying request times |

### Active-Active vs Active-Passive HA

| Decision | Active-Active | Active-Passive |
|----------|---------------|----------------|
| | **Pros:** Full utilization, no wasted capacity, faster failover | **Pros:** Simple, no state sync needed, clear ownership |
| | **Cons:** State sync complexity, split-brain risk | **Cons:** 50% idle capacity, slower failover |
| **Recommendation** | **High-traffic production** | Lower traffic, simpler operations |

### Health Check: Active vs Passive

| Decision | Active Health Checks | Passive Health Checks | Hybrid |
|----------|---------------------|----------------------|--------|
| | **Pros:** Proactive detection, doesn't need real traffic | **Pros:** Zero overhead, uses real requests | **Pros:** Fast detection + validation |
| | **Cons:** Additional load, can miss real issues | **Cons:** Reactive only, needs traffic | **Cons:** More complex |
| **Recommendation** | Primary method | Supplement active | **Best practice** |

---

## Trap Questions & How to Handle

### Trap 1: "Why not just use DNS round-robin?"

**What Interviewer Wants:** Understanding of DNS limitations

**Best Answer:**
> "DNS round-robin is a simple starting point, but has significant limitations:
> 1. **No health checking** - DNS doesn't know if servers are healthy
> 2. **Client caching** - Browsers cache DNS for minutes/hours, slow failover
> 3. **TTL propagation** - Even with low TTL, propagation takes time
> 4. **No load awareness** - Can't route based on actual server load
> 5. **No session affinity** - Different requests may go to different servers
>
> DNS is useful for global load balancing (GeoDNS), but we need an actual LB for the data path."

### Trap 2: "What if the load balancer fails?"

**What Interviewer Wants:** Thinking about LB availability

**Best Answer:**
> "This is critical - the LB is a potential single point of failure. We mitigate this through:
> 1. **Multiple LB nodes** with ECMP or Anycast distribution
> 2. **BGP-based failover** - If a node fails, BGP withdraws its routes in seconds
> 3. **Consistent hashing** (Maglev) - Minimizes connection disruption when nodes change
> 4. **Stateless design** - Connections can be handled by any node (with connection tracking as optimization)
> 5. **Health checks between LB nodes** - Detect and route around failures"

### Trap 3: "How do you handle a slow backend?"

**What Interviewer Wants:** Production experience, cascading failure prevention

**Best Answer:**
> "A slow backend can be worse than a down backend - it ties up connections. We handle this through:
> 1. **Timeouts** - Connection timeout, request timeout, idle timeout
> 2. **Circuit breaker** - Open circuit after N failures, fast-fail instead of waiting
> 3. **Least connections algorithm** - Naturally routes away from slow backends
> 4. **Health checks with latency** - Mark backend unhealthy if p99 exceeds threshold
> 5. **Connection limits per backend** - Prevent one slow backend from consuming all connections"

### Trap 4: "What's the difference between a load balancer and a reverse proxy?"

**What Interviewer Wants:** Conceptual clarity

**Best Answer:**
> "They're related but serve different purposes:
> - **Reverse proxy**: A server that sits in front of backend servers, forwarding requests. Focus is on the proxy functionality.
> - **Load balancer**: Distributes traffic across multiple backends. Focus is on the distribution logic.
>
> In practice, most L7 load balancers ARE reverse proxies (Nginx, HAProxy, Envoy). The term 'load balancer' emphasizes the distribution algorithm, while 'reverse proxy' emphasizes the proxying behavior. L4 load balancers (Maglev) typically forward packets without proxying."

### Trap 5: "How would you handle 100x traffic increase?"

**What Interviewer Wants:** Scaling thinking, not just "add more servers"

**Best Answer:**
> "Scaling 100x requires architectural changes, not just more nodes:
> 1. **L4 tier** - Add Anycast PoPs globally, use kernel bypass (DPDK/XDP)
> 2. **L7 tier** - Add more nodes, but also optimize TLS (ECDSA, session tickets)
> 3. **Connection handling** - May need DSR to handle asymmetric traffic
> 4. **Algorithm** - Ensure O(1) selection (Maglev), not O(n)
> 5. **Capacity planning** - Pre-position capacity, auto-scaling with aggressive triggers
> 6. **CDN offload** - Move cacheable traffic to edge
>
> I'd also ensure we have horizontal scaling automation and load testing at 100x before we need it."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Do Instead |
|---------|----------------|-------------------|
| Jumping to L7 immediately | L4 may be sufficient and faster | Ask about protocol requirements first |
| Ignoring LB's own availability | LB failure = total outage | Discuss HA for LB itself early |
| Not discussing health checks | Critical for reliability | Dedicate time to health check design |
| Forgetting about TLS overhead | Major CPU consumer at scale | Address TLS termination strategy |
| Only discussing one algorithm | Shows narrow knowledge | Compare at least 2-3 algorithms |
| Ignoring connection draining | Causes dropped connections | Mention graceful backend removal |
| Designing for 1000x on day 1 | Over-engineering | Design for 10x, mention 100x path |
| Not mentioning observability | Hard to operate in production | Include metrics, logging, tracing |

---

## Interview Scenarios

### Scenario 1: "Design a load balancer for a gaming company"

**Key considerations:**
- UDP traffic for game state (L4 required)
- Session stickiness (players must stay on same server)
- Ultra-low latency (< 1ms overhead)
- Geographic distribution (players connect to nearest PoP)

**Approach:**
1. L4 load balancer with Maglev consistent hashing
2. Anycast for geographic distribution
3. UDP + TCP support
4. Connection-based affinity (not request-based)

### Scenario 2: "Design a load balancer for an API platform"

**Key considerations:**
- HTTP/HTTPS traffic (L7 appropriate)
- Path-based routing to different services
- TLS termination at scale
- Rate limiting per customer

**Approach:**
1. Two-tier: L4 (ECMP) → L7 (Envoy/Nginx)
2. Path-based routing rules
3. TLS with session tickets and ECDSA
4. Integration with rate limiter

### Scenario 3: "Design a load balancer for a video streaming service"

**Key considerations:**
- Asymmetric traffic (small request, large response)
- High bandwidth (Gbps per backend)
- Edge caching integration
- Live streaming (persistent connections)

**Approach:**
1. DSR mode for response traffic
2. Integration with CDN edge nodes
3. Connection-based routing for live streams
4. Health checks with bandwidth awareness

---

## Quick Reference Card

### Algorithm Selection Guide

```
IF stateful backends OR cache servers:
    → Maglev Consistent Hashing

ELSE IF varying request durations:
    → Least Connections (or Weighted LC)

ELSE IF simple, homogeneous backends:
    → Round Robin

ELSE IF need load awareness with low overhead:
    → Power of Two Choices
```

### Architecture Selection Guide

```
IF QPS < 50K AND single region:
    → Single-tier L7 (HAProxy/Nginx HA pair)

ELSE IF QPS 50K-500K:
    → Two-tier with L4 → L7

ELSE IF QPS > 500K OR multi-region:
    → Anycast L4 → Regional L7 pools

IF using Kubernetes:
    → Consider Service Mesh (Envoy sidecars)
```

### Health Check Defaults

```
Protocol: HTTP (for HTTP backends), TCP (for non-HTTP)
Interval: 5 seconds
Timeout: 2 seconds
Unhealthy threshold: 3 consecutive failures
Healthy threshold: 2 consecutive successes
Path: /health
```

### Key Numbers to Remember

| Metric | Typical Value |
|--------|---------------|
| L4 latency overhead | < 100 µs |
| L7 latency overhead | < 5 ms |
| Single Maglev node | 10+ Gbps |
| Single HAProxy node | 100K-500K QPS |
| Maglev table size | 65,537 (prime) |
| Health check interval | 5-10 seconds |
| Failover time (BGP) | 1-3 seconds |
| Failover time (health check) | 15-30 seconds |

---

## Summary: Key Points to Hit

1. **Start with clarifying questions** - Scale, protocol, affinity requirements
2. **Make L4 vs L7 decision early** - Explain the trade-offs
3. **Discuss LB high availability** - Don't forget the LB can fail too
4. **Know your algorithms** - Maglev for consistency, LC for load-awareness, P2C for scale
5. **Address health checks** - Active vs passive, shallow vs deep
6. **Mention connection handling** - Draining, pooling, limits
7. **Discuss failure scenarios** - Backend failures, LB failures, network partitions
8. **Include observability** - Metrics, logging, alerting
9. **Acknowledge trade-offs** - No perfect solution, explain your choices
