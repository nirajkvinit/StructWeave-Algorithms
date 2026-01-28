# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Apps["Application Layer"]
        direction LR
        APP1["LLM Application"]
        APP2["RAG Pipeline"]
        APP3["AI Agent"]
        APP4["Multi-Agent<br/>Workflow"]
    end

    subgraph Instrument["Instrumentation Layer"]
        SDK["OTel SDK<br/>+ GenAI Conventions"]
        AF["Auto-Instrumentation<br/>(LangChain, LlamaIndex)"]
        PF["Privacy Filter<br/>(PII Redaction)"]
    end

    subgraph Gateway["Ingestion Gateway"]
        LB["Load Balancer"]
        COL1["Collector 1"]
        COL2["Collector 2"]
        COL3["Collector N"]
    end

    subgraph Stream["Stream Processing"]
        KAFKA[("Kafka<br/>Partitioned by org_id")]
        SP["Stream Processor<br/>(Trace Assembly,<br/>Cost Enrichment)"]
    end

    subgraph Storage["Storage Layer"]
        CH[("ClickHouse<br/>Traces & Spans")]
        TS[("Time-Series DB<br/>Metrics")]
        OBJ[("Object Storage<br/>Prompts/Completions")]
        VDB[("Vector DB<br/>Embeddings")]
    end

    subgraph Eval["Evaluation Layer"]
        RTE["Real-Time Evaluators<br/>(Rules, Regex, Format)"]
        AE["Async Evaluators<br/>(LLM-as-Judge)"]
        BE["Batch Evaluators<br/>(Benchmarks, Human)"]
    end

    subgraph Query["Query & API Layer"]
        API["GraphQL/REST API"]
        CACHE["Query Cache<br/>(Redis)"]
    end

    subgraph UI["Presentation Layer"]
        DASH["Dashboards"]
        ALERT["Alerting"]
        EXPORT["Export/Integrations"]
    end

    APP1 & APP2 & APP3 & APP4 --> SDK & AF
    SDK & AF --> PF --> LB
    LB --> COL1 & COL2 & COL3
    COL1 & COL2 & COL3 --> KAFKA
    KAFKA --> SP
    SP --> CH & TS & OBJ
    SP --> RTE
    CH --> AE & BE
    CH & TS & VDB --> CACHE --> API
    API --> DASH & ALERT & EXPORT
    OBJ --> VDB

    classDef apps fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef instrument fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef gateway fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef stream fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef eval fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef query fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef ui fill:#efebe9,stroke:#4e342e,stroke-width:2px

    class APP1,APP2,APP3,APP4 apps
    class SDK,AF,PF instrument
    class LB,COL1,COL2,COL3 gateway
    class KAFKA,SP stream
    class CH,TS,OBJ,VDB storage
    class RTE,AE,BE eval
    class API,CACHE query
    class DASH,ALERT,EXPORT ui
```

---

## Core Components

### 1. Instrumentation SDK

| Responsibility | Description |
|----------------|-------------|
| **Auto-Instrumentation** | Automatic hooks for popular frameworks (LangChain, LlamaIndex, OpenAI SDK) |
| **Manual Spans** | API for custom trace points and business context |
| **Context Propagation** | Maintain trace context across async boundaries, HTTP calls, queues |
| **Sampling** | Configurable head-based sampling with always-sample rules |
| **Buffering** | Local buffer to handle network blips, batch uploads |
| **PII Filtering** | Client-side redaction before data leaves the application |

**SDK Integration Pattern:**

```
# Pseudocode - SDK Usage
configure_llmops(
    api_key: "llmops_xxx",
    service_name: "my-rag-app",
    sample_rate: 0.1,  # 10% sampling
    pii_redaction: ENABLED,
    flush_interval: 5_SECONDS
)

# Auto-instrumentation captures all LangChain/OpenAI calls
# Manual spans for business context
with trace.span("user_query_processing"):
    span.set_attribute("user_tier", "premium")
    result = chain.invoke(query)
```

### 2. Telemetry Collectors

| Responsibility | Description |
|----------------|-------------|
| **Protocol Support** | OTLP (gRPC/HTTP), proprietary JSON/Protobuf |
| **Validation** | Schema validation, reject malformed spans |
| **Rate Limiting** | Per-organization rate limits to prevent abuse |
| **Enrichment** | Add server-side metadata (received timestamp, geo) |
| **Routing** | Partition by organization for downstream processing |

**Collector Deployment:**

```mermaid
flowchart LR
    subgraph Region["Region: us-east-1"]
        LB["Load Balancer"]
        C1["Collector Pod 1"]
        C2["Collector Pod 2"]
        C3["Collector Pod 3"]
    end

    SDK1["SDK"] --> LB
    SDK2["SDK"] --> LB
    SDK3["SDK"] --> LB
    LB --> C1 & C2 & C3
    C1 & C2 & C3 --> K["Kafka"]

    classDef collector fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    class C1,C2,C3 collector
```

### 3. Stream Processor

| Responsibility | Description |
|----------------|-------------|
| **Trace Assembly** | Reconstruct complete traces from out-of-order spans |
| **Token Counting** | Standardize token counts across providers |
| **Cost Calculation** | Apply model-specific pricing in real-time |
| **Aggregation** | Pre-aggregate metrics for dashboards (per-minute rollups) |
| **Deduplication** | Handle SDK retries, dedupe by span_id |
| **Routing** | Direct spans to appropriate storage tiers |

### 4. Storage Layer

| Store | Data Type | Characteristics | Query Pattern |
|-------|-----------|-----------------|---------------|
| **ClickHouse** | Traces, spans | Columnar, fast aggregations, high compression | Time-range + filters |
| **Time-Series DB** | Metrics, aggregations | Efficient time-range queries, retention policies | Dashboard panels |
| **Object Storage** | Raw prompts/completions | Cost-effective archival, content-addressed | By hash lookup |
| **Vector DB** | Prompt embeddings | ANN search, similarity queries | Semantic search |
| **Redis** | Query cache, sessions | Low-latency reads, TTL-based expiry | Recent/hot data |

### 5. Evaluation Engine

| Tier | Evaluators | Latency | Use Case |
|------|------------|---------|----------|
| **Real-Time** | Regex, format checks, length limits | < 50ms | Inline validation |
| **Near-Real-Time** | LLM-as-Judge (GPT-4o-mini) | 1-3s | Quality scoring |
| **Batch** | Benchmarks, human review, comprehensive analysis | Minutes-hours | Periodic assessment |

### 6. Query Layer

| Responsibility | Description |
|----------------|-------------|
| **Query API** | GraphQL/REST endpoints for trace retrieval and aggregation |
| **Query Optimization** | Push-down predicates, partition pruning |
| **Caching** | Cache frequent dashboard queries, invalidate on new data |
| **Access Control** | Organization/team-scoped queries |
| **Rate Limiting** | Prevent expensive queries from impacting cluster |

---

## Data Flows

### Flow 1: Trace Ingestion

```mermaid
sequenceDiagram
    autonumber
    participant App as LLM Application
    participant SDK as OTel SDK
    participant Col as Collector
    participant Kafka as Kafka
    participant SP as Stream Processor
    participant CH as ClickHouse
    participant TS as Time-Series DB

    App->>SDK: LLM call completes
    SDK->>SDK: Create span with GenAI attributes
    SDK->>SDK: Apply PII redaction
    SDK->>SDK: Buffer span locally

    loop Every 5 seconds or buffer full
        SDK->>Col: Batch upload (OTLP)
    end

    Col->>Col: Validate schema
    Col->>Col: Add server metadata
    Col->>Kafka: Publish (partitioned by org_id)

    Kafka->>SP: Consume batch
    SP->>SP: Assemble trace (buffer partial)
    SP->>SP: Calculate cost
    SP->>SP: Generate aggregations

    par Store trace
        SP->>CH: Write spans
    and Store metrics
        SP->>TS: Write aggregations
    end

    Note over CH,TS: Data available for query in < 30s
```

### Flow 2: Cost Attribution

```mermaid
sequenceDiagram
    autonumber
    participant SP as Stream Processor
    participant Price as Pricing Service
    participant CH as ClickHouse
    participant Budget as Budget Service
    participant Alert as Alerting

    SP->>SP: Extract token counts from span
    SP->>Price: Lookup model pricing
    Price-->>SP: Return pricing (input/output per 1K)

    SP->>SP: Calculate cost<br/>(input_tokens × input_price +<br/>output_tokens × output_price)

    SP->>SP: Build attribution chain:<br/>request → app → team → org

    par Write cost records
        SP->>CH: Store cost record with dimensions
    and Check budget
        SP->>Budget: Increment usage counters
        Budget->>Budget: Check against limits
        alt Budget exceeded
            Budget->>Alert: Trigger alert
            Budget-->>SP: Return THROTTLE signal
        else Within budget
            Budget-->>SP: Return OK
        end
    end
```

### Flow 3: Evaluation Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant SP as Stream Processor
    participant RT as Real-Time Evaluator
    participant Queue as Eval Queue
    participant Async as Async Evaluator
    participant LLM as Judge LLM
    participant CH as ClickHouse

    SP->>RT: Send span for real-time eval
    RT->>RT: Run format/regex checks
    RT->>CH: Store real-time scores

    alt Span selected for deep eval (sampled)
        SP->>Queue: Enqueue for async eval
        Queue->>Async: Dequeue span
        Async->>LLM: Send prompt/completion for evaluation
        LLM-->>Async: Return score + reasoning
        Async->>CH: Store evaluation result
    end

    Note over Queue,Async: Async eval runs with 1-5s latency
```

### Flow 4: Query Execution

```mermaid
sequenceDiagram
    autonumber
    participant UI as Dashboard
    participant API as Query API
    participant Cache as Redis Cache
    participant CH as ClickHouse
    participant VDB as Vector DB

    UI->>API: Query request (filters, time range)
    API->>API: Parse and validate query
    API->>API: Check permissions (org_id)

    API->>Cache: Check cache (query hash)
    alt Cache hit
        Cache-->>API: Return cached result
    else Cache miss
        alt Semantic search query
            API->>VDB: Search similar prompts
            VDB-->>API: Return matching span_ids
            API->>CH: Fetch spans by IDs
        else Structured query
            API->>CH: Execute query (pushdown filters)
        end
        CH-->>API: Return results
        API->>Cache: Store in cache (TTL: 1 min)
    end

    API-->>UI: Return formatted response
```

---

## Key Architectural Decisions

### Decision 1: OpenTelemetry vs Proprietary Instrumentation

| Aspect | OpenTelemetry | Proprietary |
|--------|---------------|-------------|
| **Portability** | Vendor-neutral, switch backends easily | Lock-in to platform |
| **Ecosystem** | Growing library of auto-instrumentations | Custom development needed |
| **Standards** | GenAI semantic conventions emerging | Custom schema |
| **Complexity** | More concepts to learn | Simpler, focused API |
| **Control** | Less control over wire format | Full control |

**Decision: OpenTelemetry with GenAI Semantic Conventions**

**Rationale**: Industry is converging on OTel. GenAI semantic conventions (started April 2024) are maturing. Benefits of ecosystem outweigh complexity costs. Custom extensions possible via attributes.

### Decision 2: ClickHouse vs Elasticsearch for Traces

| Aspect | ClickHouse | Elasticsearch |
|--------|------------|---------------|
| **Compression** | 10-15x (excellent) | 3-5x (good) |
| **Aggregation Speed** | Optimized for analytics | Good, but slower |
| **Full-Text Search** | Limited | Excellent |
| **Cost at Scale** | Lower | Higher |
| **Operational Complexity** | Moderate | Higher |
| **Time-Series Queries** | Excellent | Good |

**Decision: ClickHouse + Vector DB for semantic search**

**Rationale**: Observability workloads are aggregation-heavy, not full-text search heavy. ClickHouse's compression and query speed justify trade-off. Use vector DB for semantic similarity on prompts.

### Decision 3: Streaming vs Batch Processing

| Aspect | Streaming | Batch |
|--------|-----------|-------|
| **Latency** | Seconds | Minutes-hours |
| **Completeness** | May miss late arrivals | Complete view |
| **Complexity** | Higher (state management) | Lower |
| **Cost** | Higher (always running) | Lower (scheduled) |
| **Use Case** | Real-time dashboards, alerts | Billing, reports |

**Decision: Streaming with Batch Reconciliation**

**Rationale**: Users expect near-real-time visibility. Streaming handles 95% of traces. Batch reconciliation corrects edge cases (late arrivals, retries) and provides billing accuracy.

### Decision 4: Prompt Storage Strategy

| Aspect | Store Inline | Content-Addressed |
|--------|--------------|-------------------|
| **Storage Cost** | High (many duplicates) | Low (deduplication) |
| **Query Complexity** | Simple (join-free) | Requires hash lookup |
| **Privacy** | All data in one place | Separate content from metadata |
| **Deduplication** | None | 40-60% savings |

**Decision: Content-Addressed Storage with References**

**Rationale**: Many applications use similar or identical prompts. Content-addressing reduces storage by 40-60%. Separation enables selective retention (delete prompts, keep metadata).

### Decision 5: Multi-Tenancy Model

| Aspect | Shared Cluster | Dedicated Clusters |
|--------|----------------|-------------------|
| **Isolation** | Logical (org_id filtering) | Physical |
| **Cost Efficiency** | High | Lower |
| **Noisy Neighbor** | Risk exists | No risk |
| **Operational Overhead** | Lower | Higher |
| **Compliance** | May not satisfy all | Maximum isolation |

**Decision: Shared Cluster with Strong Logical Isolation + Dedicated Option for Enterprise**

**Rationale**: Most customers accept logical isolation with query enforcement and rate limiting. Offer dedicated clusters for enterprise customers with strict compliance requirements.

---

## Architecture Pattern Checklist

| Pattern | Decision | Notes |
|---------|----------|-------|
| Sync vs Async Communication | **Async** for ingestion, sync for queries | Kafka decouples ingestion from storage |
| Event-Driven vs Request-Response | **Event-Driven** for ingestion, request-response for API | Traces as events, queries as requests |
| Push vs Pull Model | **Push** from SDK, **pull** for evaluation | SDKs push telemetry, evaluators pull from queue |
| Stateless vs Stateful Services | **Stateless** API, **stateful** stream processing | State in Kafka + external stores |
| Read-Heavy vs Write-Heavy | **Write-heavy** ingestion, **read-heavy** dashboards | Separate paths optimized accordingly |
| Real-time vs Batch Processing | **Both** (streaming + batch reconciliation) | Real-time for monitoring, batch for billing |
| Edge vs Origin Processing | **Edge** SDK processing (PII), **origin** enrichment | Privacy at edge, cost calculation at origin |

---

## Integration Points

### Upstream Integrations

| System | Data Received | Integration Method |
|--------|---------------|-------------------|
| [LLM Gateway](../3.21-llm-gateway-prompt-management/00-index.md) | Token counts, cache status, model metadata | Direct span forwarding |
| [AI Guardrails](../3.22-ai-guardrails-safety-system/00-index.md) | Safety verdicts, blocked request info | Span attributes |
| [LLM Inference Engine](../3.23-llm-inference-engine/00-index.md) | TTFT, TPOT, KV cache metrics | Span attributes |
| Application SDKs | Traces, spans, business context | OTLP protocol |

### Downstream Integrations

| System | Data Sent | Integration Method |
|--------|-----------|-------------------|
| Alerting (PagerDuty, Slack) | Threshold violations, anomalies | Webhooks |
| BI Tools (Looker, Tableau) | Aggregated metrics, exports | SQL/API |
| Cost Management | Usage and cost data | API/Exports |
| CI/CD | Evaluation results | API/Webhooks |
| SIEM | Security events, audit logs | Syslog/API |

### API Integration Example

```
# Export traces to external system
GET /v1/traces/export
Authorization: Bearer {api_key}
Accept: application/x-ndjson

Query Parameters:
  start_time: 2026-01-27T00:00:00Z
  end_time: 2026-01-27T23:59:59Z
  format: ndjson|parquet
  include_content: false  # Exclude prompt/completion for privacy

Response: Streaming NDJSON or signed URL to Parquet file
```

---

## Deployment Topology

### Single-Region Deployment

```mermaid
flowchart TB
    subgraph AZ1["Availability Zone 1"]
        COL1["Collectors"]
        KAFKA1["Kafka Broker 1"]
        CH1["ClickHouse<br/>Shard 1 Replica 1"]
    end

    subgraph AZ2["Availability Zone 2"]
        COL2["Collectors"]
        KAFKA2["Kafka Broker 2"]
        CH2["ClickHouse<br/>Shard 1 Replica 2"]
    end

    subgraph AZ3["Availability Zone 3"]
        COL3["Collectors"]
        KAFKA3["Kafka Broker 3"]
        CH3["ClickHouse<br/>Shard 2 Replica 1"]
    end

    subgraph Shared["Shared Services"]
        API["Query API"]
        EVAL["Evaluation Workers"]
        DASH["Dashboard"]
    end

    LB["Global Load Balancer"] --> COL1 & COL2 & COL3
    COL1 & COL2 & COL3 --> KAFKA1 & KAFKA2 & KAFKA3
    KAFKA1 & KAFKA2 & KAFKA3 --> SP["Stream Processors"]
    SP --> CH1 & CH2 & CH3
    CH1 & CH2 & CH3 --> API
    API --> DASH

    classDef az1 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef az2 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef az3 fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef shared fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class COL1,KAFKA1,CH1 az1
    class COL2,KAFKA2,CH2 az2
    class COL3,KAFKA3,CH3 az3
    class API,EVAL,DASH shared
```

### Multi-Region Deployment

| Region | Role | Data Sync |
|--------|------|-----------|
| us-east-1 | Primary (active-active) | Kafka MirrorMaker |
| eu-west-1 | Primary (active-active) | Kafka MirrorMaker |
| ap-southeast-1 | Secondary (read replica) | Async replication |

**Data Sovereignty**: Each region stores data for local customers only. Cross-region queries require explicit data export/transfer approval.
