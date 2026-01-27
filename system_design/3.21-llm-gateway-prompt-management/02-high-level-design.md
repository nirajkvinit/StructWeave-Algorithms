# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        SDK[SDK Clients]
        REST[REST API]
        STREAM[Streaming Clients]
    end

    subgraph Gateway["LLM Gateway Core"]
        INGRESS[Ingress Handler]
        AUTH[Auth & Virtual Keys]
        CACHE[Cache Manager]
        RATE[Rate Limiter]
        PM[Prompt Manager]
        ROUTER[Model Router]
        GUARD[Guardrails]
        NORM[Response Normalizer]
    end

    subgraph CacheInfra["Cache Infrastructure"]
        EXACT[(Exact Match<br/>Redis)]
        SEMANTIC[(Semantic Cache<br/>Vector DB)]
        EMBED[Embedding Service]
    end

    subgraph Providers["LLM Providers"]
        OPENAI[OpenAI]
        ANTHROPIC[Anthropic]
        AZURE[Azure OpenAI]
        LOCAL[Local Models]
    end

    subgraph Observability["Observability Stack"]
        METRICS[Metrics<br/>Prometheus]
        TRACE[Tracing<br/>Jaeger/OTLP]
        COST[Cost Tracker<br/>ClickHouse]
        LOGS[Logs<br/>Structured]
    end

    subgraph Storage["Persistence Layer"]
        CONFIG[(Config DB<br/>PostgreSQL)]
        USAGE[(Usage Logs<br/>ClickHouse)]
        KEYS[(Key Store<br/>PostgreSQL)]
    end

    SDK & REST & STREAM --> INGRESS
    INGRESS --> AUTH
    AUTH --> CACHE
    CACHE --> RATE
    RATE --> PM
    PM --> ROUTER
    ROUTER --> GUARD
    GUARD --> NORM

    CACHE --> EXACT
    CACHE --> SEMANTIC
    SEMANTIC --> EMBED

    ROUTER --> OPENAI & ANTHROPIC & AZURE & LOCAL

    AUTH --> KEYS
    PM --> CONFIG
    NORM --> USAGE

    INGRESS --> TRACE
    AUTH & CACHE & RATE & ROUTER --> METRICS
    ROUTER --> COST
    INGRESS --> LOGS

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef provider fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef obs fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef storage fill:#eceff1,stroke:#546e7a,stroke-width:2px

    class SDK,REST,STREAM client
    class INGRESS,AUTH,CACHE,RATE,PM,ROUTER,GUARD,NORM gateway
    class EXACT,SEMANTIC,EMBED cache
    class OPENAI,ANTHROPIC,AZURE,LOCAL provider
    class METRICS,TRACE,COST,LOGS obs
    class CONFIG,USAGE,KEYS storage
```

---

## Component Responsibilities

| Component | Layer | Responsibility | Key Technologies |
|-----------|-------|----------------|------------------|
| **Ingress Handler** | Gateway | TLS termination, HTTP parsing, request validation | NGINX, Envoy |
| **Auth & Virtual Keys** | Gateway | Key validation, budget check, policy enforcement | Redis, PostgreSQL |
| **Cache Manager** | Gateway | Multi-tier cache orchestration, TTL management | Redis, Vector DB |
| **Rate Limiter** | Gateway | Token-based rate limiting, quota enforcement | Redis Cluster |
| **Prompt Manager** | Gateway | Template resolution, version selection, A/B routing | PostgreSQL |
| **Model Router** | Gateway | Provider selection, failover logic, load balancing | Custom logic |
| **Guardrails** | Gateway | Input/output validation, PII detection | NeMo Guardrails |
| **Response Normalizer** | Gateway | Convert provider formats to unified response | Custom |
| **Exact Match Cache** | Cache | Hash-based response lookup | Redis |
| **Semantic Cache** | Cache | Embedding similarity search | Pinecone, Qdrant |
| **Embedding Service** | Cache | Generate embeddings for semantic cache | Local model, OpenAI |
| **Metrics** | Observability | Gateway performance, cache stats | Prometheus |
| **Tracing** | Observability | Distributed request tracing | Jaeger, OTLP |
| **Cost Tracker** | Observability | Token accounting, cost attribution | ClickHouse |
| **Config DB** | Storage | Prompt templates, routing rules | PostgreSQL |
| **Usage Logs** | Storage | Request/response logs, analytics | ClickHouse |
| **Key Store** | Storage | Virtual keys, budgets, policies | PostgreSQL |

---

## Data Flow Diagrams

### Request Flow (Happy Path)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant G as Gateway
    participant Auth as Auth Service
    participant Cache as Cache Manager
    participant RL as Rate Limiter
    participant PM as Prompt Manager
    participant R as Router
    participant P as Provider
    participant Cost as Cost Tracker

    C->>G: POST /v1/chat/completions
    G->>G: Parse request, generate trace ID
    G->>Auth: Validate virtual key

    Auth->>Auth: Check key status, load budgets
    Auth-->>G: User context (team, budgets, policies)

    G->>Cache: Check caches (exact, then semantic)

    alt Cache Hit
        Cache-->>G: Cached response
        G->>Cost: Record (0 tokens, cache hit)
        G-->>C: Return cached response
    else Cache Miss
        G->>RL: Check token budget (estimate: 1500 tokens)

        alt Rate Limited
            RL-->>G: 429 Rate Limited
            G-->>C: Error response with retry-after
        else Within Budget
            RL->>RL: Reserve tokens
            RL-->>G: Reservation confirmed

            G->>PM: Resolve prompt template (if any)
            PM-->>G: Expanded prompt

            G->>R: Select provider
            R->>R: Score providers (cost, latency, capacity)
            R-->>G: Selected: Anthropic

            G->>P: Forward request
            P-->>G: Stream response chunks

            G->>G: Normalize response format
            G->>RL: Reconcile tokens (actual: 1423)
            G->>Cache: Store in cache (async)
            G->>Cost: Record (1423 tokens, $0.021)

            G-->>C: Stream normalized response
        end
    end
```

### Semantic Cache Lookup Flow

```mermaid
sequenceDiagram
    autonumber
    participant G as Gateway
    participant CM as Cache Manager
    participant EC as Exact Cache
    participant ES as Embedding Service
    participant SC as Semantic Cache
    participant VDB as Vector DB

    G->>CM: lookup(messages, model, temperature)

    CM->>CM: Compute exact key: SHA256(messages + model + temp)
    CM->>EC: GET exact_key
    EC-->>CM: MISS

    CM->>CM: Extract user query from messages
    CM->>ES: embed(user_query)
    ES->>ES: Generate 1536-dim embedding
    ES-->>CM: query_embedding

    CM->>CM: Compute context hash (system prompt + history)

    CM->>VDB: search(embedding, filter={model, context_hash}, top_k=5)
    VDB-->>CM: candidates with similarity scores

    loop For each candidate
        CM->>CM: Check similarity >= 0.95
        CM->>CM: Verify context compatibility
        CM->>CM: Check TTL (not stale)
    end

    alt Match Found
        CM-->>G: Cached response
    else No Match
        CM-->>G: MISS
    end
```

### Multi-Provider Failover Flow

```mermaid
sequenceDiagram
    autonumber
    participant G as Gateway
    participant R as Router
    participant CB as Circuit Breaker
    participant P1 as OpenAI
    participant P2 as Anthropic
    participant P3 as Local Model

    G->>R: route(request, fallback_chain)

    R->>CB: check_health(OpenAI)
    CB-->>R: HEALTHY

    R->>P1: Forward request
    P1-->>R: 429 Rate Limited

    R->>R: Log failure, check retry policy
    R->>CB: record_failure(OpenAI, rate_limited)
    CB->>CB: Increment failure count

    R->>CB: check_health(Anthropic)
    CB-->>R: HEALTHY

    R->>R: Transform request for Anthropic format
    R->>P2: Forward request
    P2-->>R: 200 OK + Response

    R->>R: Normalize response to OpenAI format
    R-->>G: Normalized response

    Note over R,CB: OpenAI circuit remains closed<br/>but deprioritized for 60 seconds
```

---

## Multi-Tier Cache Architecture

### Cache Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    INCOMING REQUEST                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 1: EXACT MATCH CACHE (Redis)                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Key: SHA256(messages + model + temperature + seed)    │  │
│  │ Latency: <1ms                                         │  │
│  │ Hit Rate: 20-40%                                      │  │
│  │ Cost Savings: 100% (full cache hit)                   │  │
│  │ TTL: 1 hour (configurable)                            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │ MISS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 2: SEMANTIC CACHE (Vector DB)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Key: embedding(user_message)                          │  │
│  │ Similarity Threshold: 0.95                            │  │
│  │ Latency: 15-30ms (embedding + search)                 │  │
│  │ Hit Rate: 10-30%                                      │  │
│  │ Cost Savings: 100% (with quality trade-off)           │  │
│  │ TTL: 24 hours (configurable)                          │  │
│  │ Context Verification: Required                        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │ MISS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 3: PREFIX CACHE (Provider-side)                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Mechanism: Provider caches system prompt tokens       │  │
│  │ Latency: 0ms (at provider)                            │  │
│  │ Cost Savings: 50-90% on cached prefix                 │  │
│  │ Supported: Anthropic, OpenAI (2024+)                  │  │
│  │ Optimization: Consistent system prompts               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────┘
                              │ MISS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 4: FULL INFERENCE                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Full request to LLM provider                          │  │
│  │ Full token cost applies                               │  │
│  │ Response cached in Tier 1 + Tier 2                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Cache Key Generation

```
Exact Match Key:
───────────────
SHA256(
  messages: [
    {role: "system", content: "You are a helpful assistant."},
    {role: "user", content: "What is the capital of France?"}
  ],
  model: "gpt-4o",
  temperature: 0.7,
  seed: null
)
= "a1b2c3d4e5f6..."

Semantic Cache Key:
───────────────────
{
  embedding: embed("What is the capital of France?"),
  context_hash: SHA256("system:You are a helpful assistant."),
  model: "gpt-4o"
}
```

---

## Key Architectural Decisions

### Decision 1: Multi-Tier Caching

| Aspect | Decision | Alternatives Considered |
|--------|----------|------------------------|
| **Pattern** | Multi-tier (exact + semantic + prefix) | Single-tier exact, semantic-only |
| **Why** | Maximize hit rate while minimizing latency | |
| **Trade-off** | Complexity vs. 30-50% cost savings | |
| **Implementation** | Check exact first (fast), then semantic | |

**Rationale:** Exact match is fast (<1ms) but has lower hit rate. Semantic is slower (15-30ms) but catches more matches. Layering them optimizes both latency and hit rate.

### Decision 2: Token-Based Rate Limiting

| Aspect | Decision | Alternatives Considered |
|--------|----------|------------------------|
| **Pattern** | Token-based (TPM/TPH/TPD) | Request-based (RPS) |
| **Why** | Tokens reflect actual cost, not requests | |
| **Trade-off** | Requires token estimation upfront | |
| **Implementation** | Optimistic reservation with reconciliation | |

**Rationale:** A single request can cost $0.001 or $1.00 depending on tokens. Rate limiting by requests is meaningless for cost control.

### Decision 3: Virtual Keys with Hierarchical Budgets

| Aspect | Decision | Alternatives Considered |
|--------|----------|------------------------|
| **Pattern** | Virtual keys with user→team→org hierarchy | Direct provider keys |
| **Why** | Centralized control, cost attribution | |
| **Trade-off** | Additional management overhead | |
| **Implementation** | PostgreSQL for keys, Redis for budget counters | |

**Rationale:** Virtual keys enable budget enforcement, usage attribution, and instant revocation without touching provider keys.

### Decision 4: Unified Response Format

| Aspect | Decision | Alternatives Considered |
|--------|----------|------------------------|
| **Pattern** | Normalize all responses to OpenAI format | Passthrough |
| **Why** | Provider portability, consistent client code | |
| **Trade-off** | Response transformation overhead | |
| **Implementation** | Adapter pattern per provider | |

**Rationale:** Clients should not need code changes when switching providers. OpenAI format is the de facto standard.

### Decision 5: Stateless Gateway Nodes

| Aspect | Decision | Alternatives Considered |
|--------|----------|------------------------|
| **Pattern** | Stateless compute, external state | Stateful nodes |
| **Why** | Easy scaling, fault tolerance | |
| **Trade-off** | Every request hits Redis/DB | |
| **Implementation** | All state in Redis/PostgreSQL | |

**Rationale:** Stateless nodes can be added/removed without coordination. Load balancer distributes evenly.

---

## Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---------|----------|---------------|
| **Sync vs Async** | Async internal, sync API | LLM calls are async; API appears sync |
| **Event-driven vs Request-response** | Request-response | Real-time responses required |
| **Push vs Pull** | Push (streaming) | Client receives tokens as generated |
| **Stateless vs Stateful** | Stateless gateway | Scaling and fault tolerance |
| **Read-heavy vs Write-heavy** | Balanced | Cache reads + usage writes |
| **Real-time vs Batch** | Real-time | Interactive LLM applications |
| **Edge vs Origin** | Origin-first | LLM calls require origin compute |

---

## Integration Points

### External Systems

| System | Protocol | Purpose | Criticality |
|--------|----------|---------|-------------|
| **OpenAI** | HTTPS REST | LLM inference | Critical |
| **Anthropic** | HTTPS REST | LLM inference | Critical |
| **Azure OpenAI** | HTTPS REST | LLM inference | Medium |
| **Local Models** | gRPC/REST | LLM inference | Low |
| **Embedding Service** | REST/gRPC | Semantic cache | High |
| **Vector DB** | gRPC | Semantic search | High |
| **Observability** | OTLP | Tracing, metrics | Medium |

### Internal Communication

| From | To | Protocol | Pattern |
|------|-----|----------|---------|
| Ingress | Auth | In-process | Function call |
| Auth | Redis | TCP | Key-value lookup |
| Cache Manager | Vector DB | gRPC | Search |
| Router | Providers | HTTPS | Request-response + streaming |
| All Components | Metrics | Push | Prometheus exposition |
| All Components | Logs | Async | Structured logging |

---

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Internet["Internet"]
        CLIENTS[Client Applications]
    end

    subgraph Edge["Edge Layer"]
        CDN[CDN / DDoS Protection]
        GLB[Global Load Balancer]
    end

    subgraph Region1["Primary Region (US-East)"]
        subgraph AZ1["Availability Zone 1"]
            GW1[Gateway Node 1]
            GW2[Gateway Node 2]
        end

        subgraph AZ2["Availability Zone 2"]
            GW3[Gateway Node 3]
            GW4[Gateway Node 4]
        end

        subgraph Data["Data Layer"]
            REDIS[(Redis Cluster)]
            PG[(PostgreSQL)]
            CH[(ClickHouse)]
        end

        LB[Internal Load Balancer]
    end

    subgraph External["External Services"]
        VDB[(Vector DB<br/>Managed)]
        PROVIDERS[LLM Providers]
    end

    CLIENTS --> CDN --> GLB
    GLB --> LB
    LB --> GW1 & GW2 & GW3 & GW4

    GW1 & GW2 & GW3 & GW4 --> REDIS
    GW1 & GW2 & GW3 & GW4 --> PG
    GW1 & GW2 & GW3 & GW4 --> CH
    GW1 & GW2 & GW3 & GW4 --> VDB
    GW1 & GW2 & GW3 & GW4 --> PROVIDERS

    classDef internet fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef compute fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef external fill:#eceff1,stroke:#546e7a,stroke-width:2px

    class CLIENTS internet
    class CDN,GLB edge
    class GW1,GW2,GW3,GW4,LB compute
    class REDIS,PG,CH data
    class VDB,PROVIDERS external
```

### Deployment Specifications

| Component | Replicas | vCPU | Memory | Storage | Scaling Trigger |
|-----------|----------|------|--------|---------|-----------------|
| **Gateway Node** | 4+ | 4 | 8 GB | - | CPU > 70%, Latency p99 > 100ms |
| **Redis Cluster** | 6 nodes | 4 | 32 GB | 100 GB SSD | Memory > 80% |
| **PostgreSQL** | 2 (primary + replica) | 8 | 32 GB | 500 GB SSD | Connections > 80% |
| **ClickHouse** | 3 nodes | 8 | 64 GB | 2 TB SSD | Query latency |
| **Vector DB** | Managed | - | - | 50 GB | QPS limits |
