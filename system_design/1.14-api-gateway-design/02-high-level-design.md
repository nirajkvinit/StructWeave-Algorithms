# High-Level Design

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Key Design Decisions](#key-design-decisions)
- [Component Interactions](#component-interactions)

---

## Architecture Overview

The API Gateway sits at the edge of the infrastructure, acting as the unified entry point for all external API traffic. It handles cross-cutting concerns before routing requests to appropriate backend services.

```mermaid
flowchart TB
    subgraph "Client Layer"
        WEB[Web Apps]
        MOBILE[Mobile Apps]
        PARTNER[Partner APIs]
        IOT[IoT Devices]
    end

    subgraph "Edge Layer"
        CDN[CDN / WAF]
        LB[L4 Load Balancer]
    end

    subgraph "API Gateway Cluster"
        GW1[Gateway Node 1]
        GW2[Gateway Node 2]
        GW3[Gateway Node N]
    end

    subgraph "Supporting Services"
        REDIS[(Redis Cluster)]
        CONFIG[(Config Store)]
        DISCOVERY[Service Discovery]
    end

    subgraph "Backend Services"
        SVC1[User Service]
        SVC2[Order Service]
        SVC3[Payment Service]
        SVC4[Inventory Service]
    end

    WEB --> CDN
    MOBILE --> CDN
    PARTNER --> CDN
    IOT --> CDN

    CDN --> LB

    LB --> GW1
    LB --> GW2
    LB --> GW3

    GW1 --> REDIS
    GW2 --> REDIS
    GW3 --> REDIS

    GW1 --> CONFIG
    GW1 --> DISCOVERY

    GW1 --> SVC1
    GW1 --> SVC2
    GW2 --> SVC3
    GW3 --> SVC4
```

---

## Core Components

### 1. Request Router

The router matches incoming requests to configured routes and determines the target upstream service.

```mermaid
flowchart LR
    subgraph "Router"
        PARSE[Parse Request]
        MATCH[Route Matching]
        RESOLVE[Upstream Resolution]
    end

    REQ[Request] --> PARSE
    PARSE --> MATCH
    MATCH --> RESOLVE
    RESOLVE --> UPSTREAM[Upstream Service]

    MATCH --> |No Match| 404[404 Response]
```

**Responsibilities:**
- Path, header, and method-based routing
- Host-based virtual hosting
- Regex and prefix matching
- Priority-based route selection
- Upstream service resolution

### 2. Authentication Handler

Validates client identity before allowing request processing.

```mermaid
flowchart TB
    REQ[Request] --> EXTRACT[Extract Credentials]

    EXTRACT --> JWT{JWT Token?}
    EXTRACT --> APIKEY{API Key?}
    EXTRACT --> MTLS{mTLS Cert?}

    JWT --> |Yes| JWTVAL[Validate JWT]
    APIKEY --> |Yes| KEYVAL[Validate Key]
    MTLS --> |Yes| CERTVAL[Validate Cert]

    JWTVAL --> CLAIMS[Extract Claims]
    KEYVAL --> CONSUMER[Identify Consumer]
    CERTVAL --> IDENTITY[Extract Identity]

    CLAIMS --> CONTEXT[Request Context]
    CONSUMER --> CONTEXT
    IDENTITY --> CONTEXT

    CONTEXT --> NEXT[Next Plugin]
```

**Responsibilities:**
- Token extraction (header, cookie, query param)
- JWT signature verification (RS256, ES256)
- Token expiration and claims validation
- API key lookup and validation
- mTLS certificate chain verification
- Consumer identification and context enrichment

### 3. Rate Limiter

Enforces request quotas to protect backend services and ensure fair usage.

```mermaid
flowchart TB
    REQ[Request] --> IDENTIFY[Identify Consumer/API]
    IDENTIFY --> LOOKUP[Lookup Rate Limit Config]
    LOOKUP --> CHECK[Check Redis Counter]

    CHECK --> |Under Limit| ALLOW[Allow Request]
    CHECK --> |Over Limit| REJECT[429 Too Many Requests]

    ALLOW --> INCREMENT[Increment Counter]
    INCREMENT --> NEXT[Next Plugin]

    REJECT --> HEADERS[Add Rate Limit Headers]
    HEADERS --> RESPONSE[Return Response]
```

**Responsibilities:**
- Per-consumer rate limiting
- Per-API rate limiting
- Global rate limiting
- Sliding window / token bucket algorithms
- Rate limit header injection (X-RateLimit-*)
- Quota management for usage plans

### 4. Request Transformer

Modifies requests before forwarding to upstream services.

**Responsibilities:**
- Header addition/removal/modification
- Query parameter manipulation
- URL path rewriting
- Request body transformation
- Protocol translation (REST → gRPC)

### 5. Circuit Breaker

Prevents cascade failures by stopping requests to unhealthy upstreams.

```mermaid
stateDiagram-v2
    [*] --> Closed

    Closed --> Open : Failure threshold exceeded
    Open --> HalfOpen : Timeout elapsed
    HalfOpen --> Closed : Probe succeeds
    HalfOpen --> Open : Probe fails

    note right of Closed : Normal operation\nRequests pass through
    note right of Open : All requests fail fast\nNo upstream calls
    note right of HalfOpen : Limited probe requests\nTest if upstream recovered
```

**Responsibilities:**
- Failure counting per upstream
- State management (closed/open/half-open)
- Automatic recovery probing
- Fallback response handling

### 6. Load Balancer

Distributes requests across upstream service instances.

**Responsibilities:**
- Round-robin distribution
- Weighted distribution
- Least connections
- Consistent hashing (for caching)
- Health-aware routing

### 7. Response Handler

Processes responses before returning to clients.

**Responsibilities:**
- Response body transformation
- Header manipulation
- Response caching
- Compression (gzip, brotli)
- Error response formatting

### 8. Plugin Chain Executor

Orchestrates the execution of configured plugins in order.

```mermaid
flowchart LR
    REQ[Request] --> P1[Auth Plugin]
    P1 --> P2[Rate Limit Plugin]
    P2 --> P3[Transform Plugin]
    P3 --> P4[Log Plugin]
    P4 --> UPSTREAM[Upstream Call]

    UPSTREAM --> R1[Response Transform]
    R1 --> R2[Cache Plugin]
    R2 --> R3[Log Plugin]
    R3 --> RESP[Response]
```

---

## Data Flow

### Request Lifecycle

```mermaid
sequenceDiagram
    participant Client
    participant LB as Load Balancer
    participant GW as API Gateway
    participant Auth as Auth Handler
    participant RL as Rate Limiter
    participant Router
    participant Upstream

    Client->>LB: HTTPS Request
    LB->>GW: Forward (TLS terminated or passthrough)

    GW->>GW: Parse HTTP Request
    GW->>Auth: Authenticate

    alt Valid Token
        Auth-->>GW: Consumer Context
    else Invalid Token
        Auth-->>Client: 401 Unauthorized
    end

    GW->>RL: Check Rate Limit

    alt Under Limit
        RL-->>GW: Allowed
    else Over Limit
        RL-->>Client: 429 Too Many Requests
    end

    GW->>Router: Route Request
    Router->>Router: Match Route
    Router->>Router: Resolve Upstream

    GW->>GW: Transform Request
    GW->>Upstream: Forward Request

    Upstream-->>GW: Response
    GW->>GW: Transform Response
    GW->>GW: Log Access

    GW-->>Client: HTTP Response
```

### Request Context Object

Throughout the request lifecycle, a context object carries request state:

```
RequestContext {
    // Original request
    request: HttpRequest

    // Identified consumer (after auth)
    consumer: {
        id: "consumer-123"
        tier: "premium"
        organization: "acme-corp"
    }

    // Matched route
    route: {
        id: "route-456"
        path: "/api/v1/users/{id}"
        upstream: "user-service"
    }

    // Rate limit state
    rateLimit: {
        remaining: 950
        limit: 1000
        resetAt: 1704067200
    }

    // Timing
    timing: {
        receivedAt: timestamp
        authDuration: 2ms
        routeDuration: 0.5ms
    }

    // Tracing
    traceId: "abc-123-def"
    spanId: "span-789"
}
```

---

## Key Design Decisions

### Decision 1: Centralized vs Decentralized Gateway

| Approach | Pros | Cons |
|----------|------|------|
| **Centralized** | Single management point, consistent policy | Single point of failure, extra hop |
| **Sidecar** | No extra hop, service autonomy | Distributed management, resource overhead |
| **Hybrid** | Best of both (external=central, internal=sidecar) | Complexity |

**Decision:** Hybrid approach
- External traffic → Centralized API Gateway
- Internal service-to-service → Service mesh (sidecar)
- Reason: External traffic needs unified auth/rate limiting; internal traffic benefits from sidecar proximity

### Decision 2: Plugin Execution Model

| Model | Pros | Cons |
|-------|------|------|
| **In-Process (Lua)** | Fast, low latency | Limited language, security concerns |
| **In-Process (WASM)** | Sandboxed, multi-language | WASM overhead, ecosystem maturity |
| **External Service** | Full isolation, any language | Network latency, complexity |

**Decision:** In-process with WASM support
- Core plugins (auth, rate limit) in native code for performance
- Custom plugins via WASM for flexibility and isolation
- Reason: Balance between performance and extensibility

### Decision 3: Configuration Management

| Approach | Pros | Cons |
|----------|------|------|
| **Static Files** | Simple, auditable | Requires restart/reload |
| **Database-backed** | Dynamic, admin UI | Consistency challenges |
| **xDS Protocol** | Industry standard, push-based | Complexity, control plane dependency |

**Decision:** Database-backed with Admin API
- PostgreSQL for persistent configuration
- In-memory cache with change notifications
- Admin API for CRUD operations
- Hot reload without restart
- Reason: Operational flexibility for large route tables

### Decision 4: Rate Limiting Strategy

| Strategy | Pros | Cons |
|----------|------|------|
| **Local Only** | Fast, no network calls | Inconsistent across nodes |
| **Centralized (Redis)** | Accurate, consistent | Redis latency, SPOF |
| **Hybrid** | Balance accuracy and speed | Complexity |

**Decision:** Hybrid with Redis
- Local rate limiter for first-pass (fast rejection of obvious abuse)
- Redis for accurate cross-node counting
- Async sync to reduce Redis calls
- Reason: Accuracy matters for billing; latency matters for UX

### Decision 5: Stateless Design

**Decision:** Gateway nodes are stateless
- All state stored externally (Redis, PostgreSQL)
- Any node can handle any request
- Enables horizontal scaling and simple failover
- Reason: Operational simplicity, easy scaling

---

## Component Interactions

### Gateway ↔ Redis (Rate Limiting)

```mermaid
sequenceDiagram
    participant GW as Gateway
    participant Local as Local Cache
    participant Redis as Redis Cluster

    GW->>Local: Check local counter

    alt Local counter exists and recent
        Local-->>GW: Current count
        GW->>Local: Increment local
    else Local cache miss or stale
        GW->>Redis: GET rate_limit:{consumer}:{api}
        Redis-->>GW: Current count
        GW->>Local: Update local cache
        GW->>Redis: INCR (async pipeline)
    end
```

### Gateway ↔ Service Discovery

```mermaid
sequenceDiagram
    participant GW as Gateway
    participant Cache as Service Cache
    participant Consul as Service Discovery

    Note over GW,Consul: Background polling

    loop Every 10 seconds
        GW->>Consul: GET /health/service/{name}
        Consul-->>GW: Healthy instances
        GW->>Cache: Update instance list
    end

    Note over GW,Cache: Request time

    GW->>Cache: Get instances for "user-service"
    Cache-->>GW: [10.0.1.1:8080, 10.0.1.2:8080]
    GW->>GW: Load balance selection
```

### Gateway ↔ Config Store

```mermaid
sequenceDiagram
    participant GW as Gateway
    participant Cache as Config Cache
    participant DB as PostgreSQL
    participant Admin as Admin API

    Note over GW,DB: Startup
    GW->>DB: Load all routes, plugins
    DB-->>GW: Configuration
    GW->>Cache: Populate cache

    Note over Admin,DB: Config change
    Admin->>DB: Update route
    DB-->>Admin: Confirmed
    Admin->>GW: Notify change (via pub/sub)

    GW->>DB: Reload changed config
    GW->>Cache: Update cache
```

---

## High-Level Architecture Patterns

### Multi-Zone Deployment

```mermaid
flowchart TB
    subgraph "Zone A"
        LBA[Load Balancer A]
        GWA1[Gateway A1]
        GWA2[Gateway A2]
        REDISA[(Redis Primary)]
    end

    subgraph "Zone B"
        LBB[Load Balancer B]
        GWB1[Gateway B1]
        GWB2[Gateway B2]
        REDISB[(Redis Replica)]
    end

    DNS[Global DNS] --> LBA
    DNS --> LBB

    LBA --> GWA1
    LBA --> GWA2
    LBB --> GWB1
    LBB --> GWB2

    GWA1 --> REDISA
    GWA2 --> REDISA
    GWB1 --> REDISB
    GWB2 --> REDISB

    REDISA -.-> REDISB
```

### Request Flow Summary

| Stage | Component | Action | Latency Budget |
|-------|-----------|--------|----------------|
| 1 | TLS Handler | Terminate TLS | 0ms (pooled) |
| 2 | HTTP Parser | Parse request | 0.1ms |
| 3 | Router | Match route | 0.2ms |
| 4 | Auth Plugin | Validate token | 1ms |
| 5 | Rate Limit | Check quota | 1ms |
| 6 | Transform | Modify request | 0.2ms |
| 7 | Load Balancer | Select upstream | 0.1ms |
| 8 | Upstream Pool | Get connection | 0ms (pooled) |
| 9 | Upstream Call | Forward request | (external) |
| 10 | Response Transform | Modify response | 0.2ms |
| 11 | Logging | Access log | 0.1ms (async) |
| **Total Gateway Overhead** | | | **~3ms** |
