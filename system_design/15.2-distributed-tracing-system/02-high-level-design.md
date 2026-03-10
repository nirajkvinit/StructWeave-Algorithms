# 02 — High-Level Design

## System Architecture

```mermaid
---
config:
  theme: neutral
  look: neo
---
flowchart TB
    subgraph Instrumentation["Instrumentation Layer"]
        SDK1[Service A<br/>OTel SDK]
        SDK2[Service B<br/>OTel SDK]
        SDK3[Service C<br/>OTel SDK]
        SDK4[Service N<br/>OTel SDK]
    end

    subgraph Collection["Collection Layer"]
        Agent1[OTel Agent<br/>Sidecar]
        Agent2[OTel Agent<br/>Sidecar]
        LB[Load Balancer<br/>Consistent Hash by Trace ID]
        C1[Collector 1]
        C2[Collector 2]
        C3[Collector N]
    end

    subgraph Processing["Processing Layer"]
        TSampler[Tail-Based<br/>Sampling Engine]
        Assembler[Trace<br/>Assembler]
        MapGen[Service Map<br/>Generator]
    end

    subgraph StreamBus["Streaming Bus"]
        Q1[Span Topic<br/>Partitioned by Trace ID]
        Q2[Sampled Span Topic]
        Q3[Aggregation Topic]
    end

    subgraph Storage["Storage Layer"]
        HotStore[(Hot Store<br/>Wide-Column DB)]
        WarmStore[(Warm Store<br/>Columnar on<br/>Object Storage)]
        ColdStore[(Cold Store<br/>Compressed on<br/>Object Storage)]
        IndexStore[(Index Store<br/>Bloom Filters +<br/>Tag Index)]
    end

    subgraph Query["Query Layer"]
        QuerySvc[Query Service]
        QueryCache[Query Cache]
        UI[Trace UI]
        API[Query API]
    end

    SDK1 --> Agent1
    SDK2 --> Agent1
    SDK3 --> Agent2
    SDK4 --> Agent2
    Agent1 --> LB
    Agent2 --> LB
    LB --> C1
    LB --> C2
    LB --> C3
    C1 --> Q1
    C2 --> Q1
    C3 --> Q1
    Q1 --> TSampler
    TSampler --> Q2
    Q2 --> Assembler
    Assembler --> HotStore
    Assembler --> IndexStore
    Q1 --> MapGen
    MapGen --> Q3
    Q3 --> HotStore
    HotStore -.->|TTL compaction| WarmStore
    WarmStore -.->|TTL compaction| ColdStore
    QuerySvc --> HotStore
    QuerySvc --> WarmStore
    QuerySvc --> ColdStore
    QuerySvc --> IndexStore
    QuerySvc --> QueryCache
    UI --> QuerySvc
    API --> QuerySvc

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class SDK1,SDK2,SDK3,SDK4 client
    class LB,Agent1,Agent2 gateway
    class C1,C2,C3,TSampler,Assembler,MapGen,QuerySvc service
    class HotStore,WarmStore,ColdStore,IndexStore data
    class QueryCache cache
    class Q1,Q2,Q3 queue
    class UI,API client
```

---

## Data Flow: Write Path (Span Ingestion)

```mermaid
---
config:
  theme: neutral
  look: neo
---
sequenceDiagram
    participant App as Service (OTel SDK)
    participant Agent as OTel Agent (Sidecar)
    participant LB as Load Balancer
    participant Collector as Collector
    participant Queue as Message Queue
    participant Sampler as Tail Sampler
    participant Writer as Storage Writer
    participant Store as Hot Store

    App->>App: Create span (start timer)
    App->>App: Execute operation
    App->>App: End span (stop timer, set status)
    App->>Agent: Batch export spans (OTLP/gRPC, async)
    Note over App: Non-blocking, fire-and-forget

    Agent->>Agent: Buffer + batch (5s or 1000 spans)
    Agent->>Agent: Apply head sampling decision
    Agent->>LB: Forward batch (OTLP/gRPC)

    LB->>Collector: Route by hash(trace_id)
    Note over LB,Collector: Consistent hashing ensures<br/>all spans of a trace<br/>reach same collector

    Collector->>Collector: Validate + normalize spans
    Collector->>Queue: Publish to span topic
    Note over Queue: Partitioned by trace_id

    Queue->>Sampler: Consume spans
    Sampler->>Sampler: Buffer spans by trace_id
    Sampler->>Sampler: Wait for trace completion (30-60s)
    Sampler->>Sampler: Evaluate sampling policy
    Note over Sampler: Keep if: error, high latency,<br/>matches custom rules

    alt Trace sampled in
        Sampler->>Queue: Publish to sampled topic
        Queue->>Writer: Consume sampled spans
        Writer->>Store: Batch write trace
    else Trace sampled out
        Sampler->>Sampler: Discard buffered spans
    end
```

---

## Data Flow: Read Path (Trace Query)

```mermaid
---
config:
  theme: neutral
  look: neo
---
sequenceDiagram
    participant User as Engineer
    participant UI as Trace UI
    participant QSvc as Query Service
    participant Cache as Query Cache
    participant Index as Index Store
    participant Hot as Hot Store
    participant Warm as Warm Store

    User->>UI: Search traces (service, operation, tags)
    UI->>QSvc: GET /api/traces?service=X&operation=Y&minDuration=500ms

    QSvc->>Cache: Check query cache
    alt Cache hit
        Cache-->>QSvc: Return cached results
    else Cache miss
        QSvc->>Index: Search tag index + bloom filters
        Index-->>QSvc: Return matching trace IDs

        QSvc->>Hot: Fetch traces by ID (parallel)
        Hot-->>QSvc: Return spans (recent traces)

        alt Trace not in hot tier
            QSvc->>Warm: Fetch from columnar store
            Warm-->>QSvc: Return spans (older traces)
        end

        QSvc->>QSvc: Assemble trace DAG
        QSvc->>QSvc: Adjust for clock skew
        QSvc->>Cache: Cache assembled trace
    end

    QSvc-->>UI: Return trace(s) with metadata
    UI->>UI: Render Gantt chart + service map
    UI-->>User: Display trace visualization
```

---

## Key Architectural Decisions

### 1. Communication Model

| Decision | Choice | Justification |
|---|---|---|
| SDK → Agent | Async, fire-and-forget (OTLP/gRPC) | Tracing must never slow down the instrumented service; SDK batches spans in memory and flushes asynchronously; if the agent is unavailable, spans are dropped silently |
| Agent → Collector | Async batch (gRPC streaming) | Agents buffer and batch spans to amortize network overhead; gRPC streaming allows backpressure signaling without blocking the agent |
| Collector → Storage | Via message queue (async) | Decouples ingestion rate from storage write rate; allows tail-based sampling as an intermediate processing step; enables replay and reprocessing |

### 2. Architecture Pattern: Event-Driven Pipeline

The system uses an **event-driven, pipeline architecture** rather than a request-response model:

- **Why not request-response**: Span ingestion is a unidirectional data flow (write-only from the application's perspective); the application never reads back its own spans in the hot path
- **Why not synchronous writes**: Storage write latency would propagate back to application services; a 50ms storage hiccup would add 50ms to every instrumented request
- **Why event-driven**: Message queue between collection and storage provides buffering, backpressure, replay capability, and a natural insertion point for tail-based sampling

### 3. Database Choices

| Component | Technology Class | Rationale |
|---|---|---|
| **Hot Store** | Wide-column (e.g., Cassandra, ScyllaDB) | High write throughput; trace ID as partition key gives O(1) lookup; TTL-based automatic expiration; linear horizontal scaling |
| **Warm/Cold Store** | Columnar on Object Storage (e.g., Parquet files) | 10-100x cheaper than wide-column; columnar format enables efficient tag-based queries without full scan; object storage provides durability and near-infinite capacity |
| **Index Store** | Inverted index + bloom filters | Bloom filters: O(1) check for "does trace ID exist in this block?"; inverted index on (service, operation, tag) for search queries; small footprint relative to span data |
| **Query Cache** | In-memory cache (e.g., Redis) | Cache assembled traces for repeated access during debugging sessions; TTL of 5-10 minutes; reduces hot store read amplification |
| **Message Queue** | Distributed log (e.g., Kafka) | Partitioned by trace ID for locality; high throughput; replay capability for reprocessing; decouples producers from consumers |

### 4. Sampling Strategy: Hybrid Head + Tail

| Sampling Tier | Where | Decision Point | Trade-off |
|---|---|---|---|
| **Head-based probabilistic** | SDK / Agent | At span creation | Low overhead, uninformed (doesn't know if trace will be interesting) |
| **Rate-limiting** | Agent | Per service/operation | Prevents high-volume services from dominating storage budget |
| **Tail-based adaptive** | Collector / Stream processor | After trace completion | Informed (sees full trace), but requires buffering all spans until trace completes |

**Hybrid approach**: Head sampling reduces volume by 90% (keeping storage manageable), then tail-based sampling at the collector ensures 100% retention of error traces, latency outliers, and traces matching custom business rules.

### 5. Consistent Hashing for Trace Affinity

All spans belonging to the same trace must be routed to the same collector instance for tail-based sampling to work. The load balancer uses **consistent hashing on trace ID**:

- Ensures all spans of a trace arrive at the same collector
- Enables the collector to maintain an in-memory buffer of partial traces
- Hash ring handles collector additions/removals with minimal trace fragmentation
- Trade-off: temporary trace incompleteness during collector scaling events (mitigated by the assembly buffer's wait window)

---

## Architecture Pattern Checklist

- [x] **Sync vs Async**: Async throughout the write path; sync only for query API
- [x] **Event-driven vs Request-response**: Event-driven pipeline for ingestion; request-response for queries
- [x] **Push vs Pull**: Push from SDKs → agents → collectors; pull from storage for queries
- [x] **Stateless vs Stateful**: Collectors are stateful during tail-sampling (buffer partial traces); query services are stateless
- [x] **Write-heavy vs Read-heavy**: Write-heavy (millions of spans/sec ingested; hundreds of queries/sec)
- [x] **Real-time vs Batch**: Real-time ingestion pipeline; batch compaction for warm/cold tiers
- [x] **Edge vs Origin**: Agents run as sidecars at the edge (on every host); collectors and storage are centralized

---

## Component Responsibilities

| Component | Responsibility | Scaling Unit |
|---|---|---|
| **OTel SDK** | Instrument code, create spans, propagate context, batch export | Per-service (embedded library) |
| **OTel Agent** | Receive spans from local services, apply head sampling, forward to collectors | Per-host (sidecar) |
| **Load Balancer** | Route span batches to collectors using consistent hashing by trace ID | Shared infrastructure |
| **Collector** | Validate, normalize, and buffer spans; publish to message queue | Horizontal: scale with ingestion rate |
| **Message Queue** | Decouple ingestion from processing; partition by trace ID | Horizontal: add partitions |
| **Tail Sampler** | Buffer complete traces, apply sampling policies, emit retained traces | Horizontal: partition by trace ID range |
| **Trace Assembler** | Build trace DAG from spans, detect missing spans, write to storage | Horizontal: scale with sampled throughput |
| **Service Map Generator** | Aggregate span relationships into service dependency graph | Single logical instance with sharded aggregation |
| **Hot Store** | Low-latency trace storage for recent data (7 days) | Horizontal: shard by trace ID |
| **Warm/Cold Store** | Cost-efficient long-term storage in columnar format | Object storage: virtually unlimited |
| **Index Store** | Bloom filters + tag indices for trace discovery | Scale with unique tag cardinality |
| **Query Service** | Serve trace lookups, search queries, and service map queries | Horizontal: scale with query QPS |
| **Query Cache** | Cache assembled traces and search results | Scale with active debugging sessions |
| **Trace UI** | Visualize traces as Gantt charts, render service maps | Static frontend; CDN-served |
