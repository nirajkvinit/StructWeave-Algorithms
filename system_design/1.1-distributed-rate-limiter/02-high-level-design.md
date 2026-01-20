# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture

### Component Overview

```mermaid
flowchart TB
    subgraph Clients
        C1[Web Client]
        C2[Mobile App]
        C3[API Consumer]
    end

    subgraph Edge["Edge Layer"]
        LB[Load Balancer]
        CDN[CDN / Edge Cache]
    end

    subgraph Gateway["API Gateway Layer"]
        AG1[API Gateway 1]
        AG2[API Gateway 2]
        AG3[API Gateway N]
    end

    subgraph RateLimiter["Rate Limiter Service"]
        RL1[Rate Limiter 1]
        RL2[Rate Limiter 2]
        RL3[Rate Limiter N]
        LC1[Local Cache]
        LC2[Local Cache]
        LC3[Local Cache]
    end

    subgraph Storage["Distributed Storage"]
        subgraph RedisCluster["Redis Cluster"]
            R1[(Redis Primary 1)]
            R2[(Redis Primary 2)]
            R3[(Redis Primary 3)]
            RS1[(Replica)]
            RS2[(Replica)]
            RS3[(Replica)]
        end
    end

    subgraph Config["Configuration"]
        CS[(Config Store)]
        CM[Config Manager]
    end

    subgraph Backend["Backend Services"]
        BS1[Service A]
        BS2[Service B]
        BS3[Service C]
    end

    C1 & C2 & C3 --> LB
    LB --> CDN
    CDN --> AG1 & AG2 & AG3

    AG1 --> RL1
    AG2 --> RL2
    AG3 --> RL3

    RL1 --- LC1
    RL2 --- LC2
    RL3 --- LC3

    RL1 & RL2 & RL3 <--> R1 & R2 & R3
    R1 --> RS1
    R2 --> RS2
    R3 --> RS3

    CM --> CS
    CS --> RL1 & RL2 & RL3

    RL1 --> BS1
    RL2 --> BS2
    RL3 --> BS3
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Load Balancer** | Distribute traffic, initial connection limiting |
| **API Gateway** | Authentication, routing, invokes rate limiter |
| **Rate Limiter Service** | Core limiting logic, algorithm execution |
| **Local Cache** | Hot key caching, reduce Redis round-trips |
| **Redis Cluster** | Distributed counter storage, atomic operations |
| **Config Store** | Rate limit rules, user tier mappings |

---

## Data Flow

### Request Allowed Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant RL as Rate Limiter
    participant Cache as Local Cache
    participant Redis as Redis Cluster
    participant Backend as Backend Service

    Client->>Gateway: API Request + Auth Token
    Gateway->>Gateway: Extract User ID / API Key
    Gateway->>RL: Check Rate Limit(user_id, endpoint)

    RL->>Cache: Get cached count
    alt Cache Hit (recent)
        Cache-->>RL: Return count (if within limit)
        RL-->>Gateway: ALLOWED
    else Cache Miss or Stale
        RL->>Redis: INCR rate_limit:user_id:endpoint
        Redis-->>RL: Current count + TTL
        RL->>Cache: Update cache
        RL-->>Gateway: ALLOWED (count < limit)
    end

    Gateway->>Backend: Forward Request
    Backend-->>Gateway: Response
    Gateway-->>Client: Response + Rate Limit Headers

    Note over Client: Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

### Request Throttled Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant RL as Rate Limiter
    participant Redis as Redis Cluster

    Client->>Gateway: API Request
    Gateway->>RL: Check Rate Limit(user_id, endpoint)

    RL->>Redis: GET rate_limit:user_id:endpoint
    Redis-->>RL: count = 1000 (limit = 1000)

    RL-->>Gateway: DENIED (count >= limit)

    Gateway-->>Client: HTTP 429 Too Many Requests

    Note over Client: Response includes:<br/>Retry-After: 45<br/>X-RateLimit-Reset: 1642000000
```

---

## Key Architectural Decisions

### 1. Monolith vs Microservice

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Embedded in Gateway** | Lower latency, no network hop | Tight coupling, harder to scale independently | Good for simple cases |
| **Separate Microservice** | Independent scaling, reusable | Network latency added | **Recommended** for large scale |

**Recommendation:** Separate microservice with optional local caching in gateway for hot paths.

### 2. Synchronous vs Asynchronous

| Approach | Use Case | Trade-off |
|----------|----------|-----------|
| **Synchronous** | Real-time limit enforcement | Adds latency to request path |
| **Asynchronous** | Analytics, soft limits | Cannot block requests |

**Recommendation:** Synchronous for hard limits, asynchronous for analytics/logging.

### 3. Database Choice

| Option | Pros | Cons | Best For |
|--------|------|------|----------|
| **Redis** | Fast, atomic ops, TTL support | Memory-bound | Primary choice |
| **Memcached** | Simple, fast | No atomic INCR with TTL | Basic counting |
| **In-memory (local)** | Fastest | Not distributed | Single-node, edge |
| **SQL Database** | ACID, familiar | Too slow | Never for hot path |

**Recommendation:** Redis cluster with local caching layer.

### 4. Caching Strategy

```mermaid
flowchart LR
    subgraph L1["L1: Local Cache (per node)"]
        LC[In-Memory<br/>TTL: 100-500ms<br/>Hot keys only]
    end

    subgraph L2["L2: Distributed Cache"]
        RC[Redis Cluster<br/>TTL: Window size<br/>Source of truth]
    end

    Request --> LC
    LC -->|Miss| RC
    RC -->|Response| LC
    LC -->|Hit/Updated| Response
```

**Multi-tier Caching:**
- **L1 (Local):** 100-500ms TTL, reduces Redis calls by 50-80%
- **L2 (Redis):** Source of truth, handles atomic operations

### 5. Message Queue Usage

| Scenario | Queue Needed? | Reasoning |
|----------|---------------|-----------|
| Real-time limiting | No | Must be synchronous |
| Config propagation | Optional | Pub/sub for updates |
| Audit logging | Yes | Async, non-blocking |
| Analytics | Yes | Aggregate and process |

**Recommendation:** Use pub/sub for config updates, message queue for audit logs.

---

## Architecture Pattern Checklist

- [x] **Sync vs Async:** Synchronous for enforcement, async for logging
- [x] **Event-driven vs Request-response:** Request-response for limit checks
- [x] **Push vs Pull:** Pull model (check on each request)
- [x] **Stateless vs Stateful:** Stateless services, externalized state to Redis
- [x] **Read-heavy vs Write-heavy:** Mixed (read count + write increment)
- [x] **Real-time vs Batch:** Real-time enforcement
- [x] **Edge vs Origin:** Both supported (edge for early rejection)

---

## Deployment Options

### Option A: Centralized Rate Limiter

```mermaid
flowchart TB
    subgraph DC1["Datacenter"]
        G1[Gateway 1] & G2[Gateway 2] --> RL[Rate Limiter Cluster]
        RL --> Redis[(Redis)]
    end
```

**Pros:** Simple, consistent view
**Cons:** Single point of failure, latency for remote clients

### Option B: Distributed with Shared Storage

```mermaid
flowchart TB
    subgraph DC1["Datacenter 1"]
        G1[Gateway] --> RL1[Rate Limiter]
        RL1 --> R1[(Redis Primary)]
    end

    subgraph DC2["Datacenter 2"]
        G2[Gateway] --> RL2[Rate Limiter]
        RL2 --> R2[(Redis Replica)]
    end

    R1 <-.->|Replication| R2
```

**Pros:** Geographic distribution, lower latency
**Cons:** Replication lag, eventual consistency

### Option C: Hierarchical (Edge + Origin)

```mermaid
flowchart TB
    subgraph Edge1["Edge PoP 1"]
        E1[Edge Rate Limiter]
        EL1[Local Limits]
    end

    subgraph Edge2["Edge PoP 2"]
        E2[Edge Rate Limiter]
        EL2[Local Limits]
    end

    subgraph Origin["Origin"]
        ORL[Origin Rate Limiter]
        Redis[(Redis)]
    end

    E1 & E2 --> ORL
    ORL --> Redis
    E1 --- EL1
    E2 --- EL2
```

**Pros:** Early rejection at edge, global limits at origin
**Cons:** Complex, potential double-counting

**Recommendation:** Option B for most cases, Option C for global-scale with edge requirements.

---

## Integration Points

### Upstream (Clients)

```
Rate Limit Response Headers (RFC 6585 / draft-ietf-httpapi-ratelimit-headers):

X-RateLimit-Limit: 1000          # Max requests allowed
X-RateLimit-Remaining: 456       # Requests remaining
X-RateLimit-Reset: 1640000000    # Unix timestamp when limit resets
Retry-After: 45                  # Seconds until retry (on 429)
```

### Downstream (Configuration)

```
Configuration Sources:
├── Static config files (default limits)
├── Database (user tier mappings)
├── Admin API (dynamic overrides)
└── Feature flags (A/B testing limits)
```

### Sidecar Pattern (Service Mesh)

```mermaid
flowchart LR
    subgraph Pod["Application Pod"]
        App[Application]
        SC[Sidecar Proxy]
    end

    Client --> SC
    SC -->|Rate Check| RL[Rate Limiter]
    SC --> App
```

**Use Case:** Kubernetes environments with service mesh (Istio, Linkerd)

---

## Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Redis unavailable | Cannot check limits | Fail-open with local estimation |
| Rate limiter crash | Gateway blocked | Health checks, circuit breaker |
| Network partition | Inconsistent counts | Accept temporary over-limit |
| Config store down | Stale limits | Cache config with long TTL |

**Default Failure Policy:** Fail-open (allow requests) to prioritize availability over strict enforcement.
