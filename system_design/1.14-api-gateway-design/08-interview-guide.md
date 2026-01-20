# Interview Guide

## Table of Contents
- [45-Minute Interview Pacing](#45-minute-interview-pacing)
- [Clarifying Questions](#clarifying-questions)
- [Key Discussion Points](#key-discussion-points)
- [Trap Questions](#trap-questions)
- [Common Mistakes](#common-mistakes)
- [Quick Reference Card](#quick-reference-card)

---

## 45-Minute Interview Pacing

| Phase | Time | Focus | Deliverable |
|-------|------|-------|-------------|
| **Requirements** | 5 min | Clarify scope, scale, constraints | Written requirements list |
| **High-Level Design** | 10 min | Architecture, components, data flow | System diagram |
| **Core Components** | 15 min | Router, auth, rate limiting, upstream | Component deep dive |
| **Scalability** | 8 min | Horizontal scaling, fault tolerance | Scaling strategy |
| **Trade-offs** | 5 min | Decisions, alternatives | Trade-off summary |
| **Buffer** | 2 min | Questions, clarifications | - |

### Phase 1: Requirements (5 minutes)

**Start with:** "Before I design, let me understand the requirements..."

Ask about:
1. Scale: "How many requests per second? How many backend services?"
2. Protocols: "Just REST, or also gRPC, WebSocket, GraphQL?"
3. Auth: "What authentication methods? JWT, API keys, OAuth2?"
4. Critical features: "Which cross-cutting concerns are must-haves?"

**Write down:**
- Functional: Routing, auth, rate limiting, transformation
- Non-functional: < 5ms gateway latency, 99.99% availability, 100K+ RPS

### Phase 2: High-Level Design (10 minutes)

**Draw the architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Clients ──► CDN/WAF ──► L4 LB ──► [API Gateway Cluster] ──►   │
│                                          │                       │
│                             ┌────────────┼────────────┐         │
│                             ▼            ▼            ▼         │
│                          [Redis]     [Config]    [Discovery]    │
│                                                                  │
│  [API Gateway Cluster] ──► Backend Services                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Explain components:**
- Gateway cluster (stateless, horizontally scalable)
- Redis for rate limiting state
- Config store for route definitions
- Service discovery for upstream resolution

**Data flow:** Walk through a single request lifecycle

### Phase 3: Core Components (15 minutes)

Spend ~5 minutes each on the three most critical components:

#### A. Request Router (5 min)
- Trie-based path matching for efficiency
- Priority rules for overlapping routes
- Route caching for hot paths

#### B. Authentication (5 min)
- JWT validation pipeline
- JWK caching to avoid IdP calls
- Token extraction from header/cookie

#### C. Rate Limiting (5 min)
- Distributed token bucket with Redis
- Local + global hybrid approach
- Sliding window algorithm for accuracy

### Phase 4: Scalability (8 minutes)

**Horizontal scaling:**
- Stateless design, any node handles any request
- Auto-scaling based on CPU/RPS
- Multi-zone deployment for HA

**Fault tolerance:**
- Circuit breakers for upstream failures
- Retry with exponential backoff
- Graceful degradation (bypass non-critical plugins)

**Draw multi-zone architecture:**
```
Zone A: [GW1, GW2] ──► Redis Primary
Zone B: [GW3, GW4] ──► Redis Replica
```

### Phase 5: Trade-offs (5 minutes)

Discuss key decisions:

| Decision | Options | Your Choice | Rationale |
|----------|---------|-------------|-----------|
| Deployment | Centralized vs Sidecar | Centralized | Unified management |
| Rate limiting | Local vs Distributed | Hybrid | Balance accuracy/latency |
| Config | Static vs Dynamic | Dynamic (DB) | Operational flexibility |
| Plugin model | Lua vs WASM | WASM | Isolation + multi-language |

---

## Clarifying Questions

### Scale Questions

| Question | Why It Matters |
|----------|----------------|
| "How many requests per second at peak?" | Determines cluster size |
| "How many backend services?" | Affects route table size |
| "How many concurrent connections?" | Memory sizing |
| "What's the acceptable latency overhead?" | Plugin budget |

**Sample answers to target:**
- 100K-1M RPS typical for large-scale APIs
- 100-1000 backend services
- 100K+ concurrent connections
- < 5ms gateway overhead at p50

### Feature Questions

| Question | Why It Matters |
|----------|----------------|
| "What protocols need support?" | HTTP/1.1, HTTP/2, WebSocket, gRPC |
| "What authentication methods?" | JWT, API keys, OAuth2, mTLS |
| "Do we need response caching?" | Caching layer complexity |
| "Is request transformation needed?" | Plugin chain design |

### Operational Questions

| Question | Why It Matters |
|----------|----------------|
| "How often do routes change?" | Config management approach |
| "What's the deployment model?" | Kubernetes, bare metal, etc. |
| "Multi-region requirement?" | DR and latency concerns |

---

## Key Discussion Points

### Point 1: Why API Gateway vs Just Load Balancer?

**Good answer:**
"A load balancer distributes traffic but doesn't understand the application layer. An API Gateway adds:
- Authentication/authorization enforcement
- Rate limiting per consumer
- Request/response transformation
- Protocol translation (REST ↔ gRPC)
- Unified observability
- API versioning and deprecation

For microservices with multiple clients and cross-cutting concerns, a gateway provides value beyond pure load distribution."

### Point 2: Centralized Gateway vs Service Mesh Sidecar

**Good answer:**
"Trade-off between simplicity and latency:
- **Centralized**: Easier management, single place for policies, but adds network hop
- **Sidecar**: No extra hop for service-to-service, but distributed configuration

**Recommendation**: Hybrid approach:
- External traffic → Centralized gateway (unified auth/rate limiting)
- Internal service-to-service → Service mesh sidecar (lower latency)

This gives you the best of both: centralized control for external APIs and low-latency for internal communication."

### Point 3: Rate Limiting Accuracy vs Performance

**Good answer:**
"Pure local rate limiting is fast but inaccurate across nodes. Pure distributed (Redis) is accurate but adds latency.

**Hybrid approach:**
1. Local rate limiter for fast rejection (obvious abuse)
2. Global Redis counter for accurate cross-node tracking
3. Async sync to batch Redis operations

Accept slight over-limit during sync windows (eventual consistency). For billing-critical APIs, use synchronous Redis with acceptable latency trade-off."

### Point 4: Plugin Architecture Trade-offs

**Good answer:**
"Plugin execution model options:

| Model | Pros | Cons |
|-------|------|------|
| In-process (Lua) | Fast, low latency | Limited language, security |
| In-process (WASM) | Sandboxed, multi-lang | Overhead, ecosystem |
| External (sidecar/service) | Full isolation | Network latency |

**Recommendation**:
- Core plugins (auth, rate limit) in native code for performance
- Custom plugins via WASM for flexibility and isolation
- External service calls only when unavoidable"

---

## Trap Questions

### Trap 1: "Why not just use NGINX?"

**Why it's a trap:** Tests if you understand the difference between reverse proxy and API gateway.

**Good answer:**
"NGINX is a great reverse proxy and can be extended (Kong is built on NGINX). But out-of-box, it lacks:
- Built-in JWT/OAuth validation
- Distributed rate limiting
- Consumer management
- Admin API for dynamic config
- API analytics

You can build these on NGINX, but an API Gateway provides them integrated. NGINX is a foundation; API Gateway is a complete solution for API management."

### Trap 2: "What if Redis (rate limiter) goes down?"

**Why it's a trap:** Tests fault tolerance thinking.

**Good answer:**
"Design for Redis failure:

1. **Fall back to local rate limiting** - Less accurate but still functional
2. **Circuit breaker on Redis** - Don't block requests on Redis timeout
3. **Configurable fail-open/fail-closed** per API:
   - Public APIs: Fail open (allow requests)
   - Sensitive APIs: Fail closed (reject requests)
4. **Redis cluster with replicas** - No single point of failure

The gateway should degrade gracefully, not fail completely."

### Trap 3: "How do you handle 10x traffic spike?"

**Why it's a trap:** Tests auto-scaling and graceful degradation.

**Good answer:**
"Multiple defense layers:

1. **CDN/WAF** absorbs initial spike, caches cacheable responses
2. **Auto-scaling** adds gateway nodes (triggered by RPS/CPU)
3. **Rate limiting** protects backends from overload
4. **Circuit breakers** prevent cascade failures
5. **Request shedding** - At extreme load, reject low-priority requests

Also, **distinguish planned vs unplanned**:
- Planned (sale event): Pre-scale infrastructure
- Unplanned (viral): Rate limiting + shedding + scale-up

Key metric: Maintain SLO for high-priority traffic even under extreme load."

### Trap 4: "How do you validate JWT without calling the IdP every time?"

**Why it's a trap:** Tests understanding of JWT mechanics.

**Good answer:**
"JWTs are self-contained; validation doesn't require IdP:

1. **Parse token** - Extract header, payload, signature
2. **Fetch public key** - From JWKS endpoint (cached!)
3. **Verify signature** - Cryptographic verification with public key
4. **Validate claims** - exp, iss, aud, etc.

**Optimization:**
- Cache JWKS for 1 hour (with background refresh)
- Use ECDSA (ES256) for faster verification than RSA

**Limitation:**
- Cannot detect real-time revocation
- Solution: Short token expiry (15 min) + refresh tokens"

### Trap 5: "What's in the critical path vs what can be async?"

**Why it's a trap:** Tests understanding of latency optimization.

**Good answer:**
"**Critical path (must be synchronous):**
- Route matching
- Authentication validation
- Rate limit check
- Request transformation (if modifying)
- Upstream request/response

**Can be async:**
- Logging (buffer and batch write)
- Metrics export (background aggregation)
- Config refresh (background polling)
- Rate limit sync to Redis (batched)
- Cache population (async after response)

**Key principle:** Keep request path fast, defer non-blocking work."

---

## Common Mistakes

### Mistake 1: Over-Engineering Day 1

**Wrong:** Adding 20 plugins, multiple caching layers, complex routing rules.

**Right:** Start with essentials (routing, auth, rate limiting), add complexity as needed.

**Why:** Each plugin adds latency. Operational complexity increases exponentially.

### Mistake 2: Ignoring Plugin Chain Latency

**Wrong:** Assuming plugins are "free."

**Right:** Budget latency per plugin (e.g., 5ms total = 1ms auth + 1ms rate limit + 1ms transform + 2ms buffer).

**Why:** At 100K RPS, even 1ms extra = 100 CPU-seconds per second.

### Mistake 3: Single Redis for Rate Limiting

**Wrong:** Single Redis instance for global rate limiting.

**Right:** Redis cluster with read replicas, local cache fallback.

**Why:** Redis becomes SPOF; latency affects every request.

### Mistake 4: Not Considering Configuration Management

**Wrong:** "We'll figure out config later."

**Right:** Design for config CRUD, validation, hot reload, versioning.

**Why:** In production, config changes are frequent. Bad config = outage.

### Mistake 5: Forgetting About WebSocket/Long-lived Connections

**Wrong:** Designing only for HTTP request/response.

**Right:** Consider connection upgrade, long-lived connection handling.

**Why:** WebSocket needs different timeout, health check, and auth expiry handling.

### Mistake 6: Synchronous Auth Service Calls

**Wrong:** Calling auth service for every request.

**Right:** JWT self-validation + JWKS caching.

**Why:** External service call adds 10-50ms latency per request.

---

## Quick Reference Card

### Key Numbers

| Metric | Target |
|--------|--------|
| Gateway latency p50 | < 5ms |
| Gateway latency p99 | < 20ms |
| RPS per node | 50K-100K |
| Availability | 99.99% |
| Routes supported | 10K+ |
| Concurrent connections | 50K+ per node |

### Core Components

```
┌─────────────────────────────────────────────┐
│              API Gateway                     │
├─────────────────────────────────────────────┤
│  [Router] → [Auth] → [RateLimit] → [Route]  │
│                         │                    │
│                      [Redis]                 │
│                                              │
│  [Transform] → [Upstream Pool] → [Backend]  │
│                                              │
│  [Response] ← [Cache] ← [Log]               │
└─────────────────────────────────────────────┘
```

### Algorithm Choices

| Component | Algorithm |
|-----------|-----------|
| Route matching | Trie (radix tree) |
| Rate limiting | Token bucket / Sliding window |
| Load balancing | Round-robin, Least connections, Consistent hash |
| Auth | JWT (ES256), JWKS caching |
| Circuit breaker | Closed → Open → Half-open |

### Scaling Formula

```
Nodes = Peak_RPS / RPS_per_node × (1 + Redundancy_factor)

Example:
Nodes = 200,000 / 50,000 × 1.5 = 6 nodes
```

### Key Trade-offs

| Trade-off | Option A | Option B |
|-----------|----------|----------|
| Gateway model | Centralized | Sidecar (mesh) |
| Plugin execution | In-process (fast) | External (isolated) |
| Rate limiting | Local (fast, inaccurate) | Distributed (accurate, slower) |
| Config | Static file | Dynamic (DB/API) |
| Auth validation | Per-request IdP call | JWT self-validation |

### Interview Checklist

Before finishing, ensure you covered:

- [ ] Requirements clarification
- [ ] High-level architecture diagram
- [ ] Request flow walkthrough
- [ ] Core components (router, auth, rate limit)
- [ ] Scalability strategy
- [ ] Fault tolerance (circuit breaker, retry)
- [ ] At least 2 trade-off discussions
- [ ] Metrics and monitoring mention

### One-Liner Summaries

**What is an API Gateway?**
"A unified entry point that handles cross-cutting concerns (auth, rate limiting, routing) for backend APIs."

**How is it different from a load balancer?**
"Load balancer distributes traffic; gateway understands application protocols and enforces policies."

**How do you scale it?**
"Stateless design with shared state in Redis; horizontal scaling behind L4 load balancer."

**How do you handle failures?**
"Circuit breakers for upstream, graceful degradation for dependencies (fall back to local rate limiting if Redis fails)."
