# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        SDK["SDKs<br/>(Python, JS, Go)"]
        REST["REST API<br/>Clients"]
        GRPC["gRPC<br/>Clients"]
    end

    subgraph Gateway["API Gateway Layer"]
        LB["Load Balancer"]
        AUTH["Auth &<br/>Rate Limiting"]
        ROUTER["Query Router"]
    end

    subgraph Query["Query Processing"]
        QU["Query<br/>Understanding"]
        QEMB["Query<br/>Embedding"]
        QPARSE["Query<br/>Parser"]
    end

    subgraph Search["Search Services"]
        direction TB
        DENSE["Dense Search<br/>Service"]
        SPARSE["Sparse Search<br/>Service"]
        FUSION["Fusion<br/>Service"]
        RERANK["Reranking<br/>Service"]
    end

    subgraph Index["Indexing Pipeline"]
        INGEST["Ingestion<br/>Service"]
        DEMB["Document<br/>Embedding"]
        CHUNK["Chunking<br/>Service"]
        IWRITER["Index<br/>Writer"]
    end

    subgraph Storage["Storage Layer"]
        VECDB[("Vector DB<br/>(HNSW Index)")]
        INVERTED[("Inverted Index<br/>(BM25)")]
        DOCSTORE[("Document<br/>Store")]
        META[("Metadata<br/>Store")]
    end

    subgraph ML["ML Services"]
        BIENC["Bi-Encoder<br/>(Embeddings)"]
        CROSSENC["Cross-Encoder<br/>(Reranking)"]
        CLIP["CLIP<br/>(Multi-modal)"]
    end

    subgraph Infra["Infrastructure"]
        CACHE[("Redis<br/>Cache")]
        QUEUE[["Message<br/>Queue"]]
        CONFIG["Config<br/>Service"]
    end

    %% Client connections
    SDK --> LB
    REST --> LB
    GRPC --> LB

    %% Gateway flow
    LB --> AUTH
    AUTH --> ROUTER
    ROUTER -->|"Search"| QU
    ROUTER -->|"Index"| INGEST

    %% Query processing
    QU --> QPARSE
    QU --> QEMB
    QEMB --> BIENC
    QPARSE --> SPARSE

    %% Search flow
    QEMB --> DENSE
    QPARSE --> SPARSE
    DENSE --> FUSION
    SPARSE --> FUSION
    FUSION --> RERANK
    RERANK --> CROSSENC

    %% Index flow
    INGEST --> CHUNK
    CHUNK --> DEMB
    DEMB --> BIENC
    DEMB --> IWRITER
    IWRITER --> VECDB
    IWRITER --> INVERTED
    IWRITER --> DOCSTORE

    %% Storage connections
    DENSE --> VECDB
    SPARSE --> INVERTED
    FUSION --> META
    RERANK --> DOCSTORE

    %% Infrastructure
    DENSE --> CACHE
    QEMB --> CACHE
    INGEST --> QUEUE
    ROUTER --> CONFIG

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef ml fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef infra fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class SDK,REST,GRPC client
    class LB,AUTH,ROUTER gateway
    class QU,QEMB,QPARSE,DENSE,SPARSE,FUSION,RERANK,INGEST,DEMB,CHUNK,IWRITER service
    class VECDB,INVERTED,DOCSTORE,META storage
    class BIENC,CROSSENC,CLIP ml
    class CACHE,QUEUE,CONFIG infra
```

---

## Component Descriptions

### Client Layer

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **SDKs** | Native client libraries | Python, JavaScript, Go, Java |
| **REST API** | HTTP/JSON interface | OpenAPI 3.0 spec |
| **gRPC** | High-performance streaming | Protocol Buffers |

### Gateway Layer

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **Load Balancer** | Traffic distribution, health checks | L7 load balancer |
| **Auth & Rate Limiting** | API key validation, quota enforcement | OAuth2, token bucket |
| **Query Router** | Route to search or index path | Content-based routing |

### Query Processing

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **Query Understanding** | Intent detection, query classification | ML classifier |
| **Query Embedding** | Convert query to vector | Bi-encoder model |
| **Query Parser** | Tokenize for BM25, extract filters | Custom parser |

### Search Services

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **Dense Search** | HNSW approximate nearest neighbor | Vector DB (Qdrant, Milvus) |
| **Sparse Search** | BM25 inverted index lookup | Elasticsearch, Lucene |
| **Fusion Service** | Combine ranked lists with RRF | In-memory merge |
| **Reranking Service** | Cross-encoder re-scoring | GPU-accelerated inference |

### Indexing Pipeline

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **Ingestion Service** | Accept documents, validation | Queue-backed |
| **Document Embedding** | Generate dense + sparse vectors | Bi-encoder + SPLADE |
| **Chunking Service** | Split long documents | Sentence/semantic splitter |
| **Index Writer** | Atomic multi-index writes | Transactional writer |

### Storage Layer

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **Vector DB** | Dense embeddings + HNSW index | Qdrant, Milvus, pgvector |
| **Inverted Index** | Sparse vectors, BM25 | Elasticsearch, OpenSearch |
| **Document Store** | Full document content | PostgreSQL, Object Storage |
| **Metadata Store** | Schemas, tenant config | PostgreSQL |

---

## Data Flow: Hybrid Search Query

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Gateway as API Gateway
    participant QU as Query Understanding
    participant Embed as Embedding Service
    participant Dense as Dense Search
    participant Sparse as Sparse Search
    participant Fusion as Fusion Service
    participant Rerank as Reranking Service
    participant Cache as Cache

    Client->>Gateway: POST /v1/search {query, top_k, rerank: true}
    Gateway->>Gateway: Authenticate, rate limit
    Gateway->>Cache: Check query cache

    alt Cache Hit
        Cache-->>Gateway: Cached results
        Gateway-->>Client: 200 OK (cached)
    else Cache Miss
        Gateway->>QU: Process query
        QU->>QU: Classify intent, extract filters

        par Parallel Execution
            QU->>Embed: Encode query
            Embed->>Embed: Bi-encoder forward pass
            Embed-->>Dense: Query vector
            Dense->>Dense: HNSW search (top-1000)
        and
            QU->>Sparse: Tokenize query
            Sparse->>Sparse: BM25 search (top-1000)
        end

        Dense-->>Fusion: Dense results + scores
        Sparse-->>Fusion: Sparse results + scores

        Fusion->>Fusion: RRF merge (k=60)
        Fusion-->>Rerank: Top-100 candidates

        Rerank->>Rerank: Fetch document content
        Rerank->>Rerank: Cross-encoder batch scoring
        Rerank-->>Gateway: Top-10 reranked results

        Gateway->>Cache: Store results (TTL: 5 min)
        Gateway-->>Client: 200 OK {results, latency_ms}
    end
```

### Query Flow Timing Breakdown

| Stage | P50 Latency | P95 Latency | Notes |
|-------|-------------|-------------|-------|
| Auth & routing | 1ms | 3ms | Fast path |
| Query embedding | 5ms | 15ms | Bi-encoder |
| Dense search | 10ms | 30ms | HNSW ANN |
| Sparse search | 5ms | 15ms | Inverted index |
| RRF fusion | 1ms | 3ms | In-memory |
| Document fetch | 5ms | 15ms | Batch fetch |
| Cross-encoder | 25ms | 50ms | GPU batch |
| **Total** | **52ms** | **131ms** | |

---

## Data Flow: Document Indexing

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Gateway as API Gateway
    participant Ingest as Ingestion Service
    participant Queue as Message Queue
    participant Embed as Embedding Service
    participant Writer as Index Writer
    participant VecDB as Vector DB
    participant Inverted as Inverted Index
    participant DocStore as Document Store

    Client->>Gateway: POST /v1/documents {content, metadata}
    Gateway->>Gateway: Authenticate, validate
    Gateway->>Ingest: Forward document

    Ingest->>Ingest: Assign doc_id, validate schema
    Ingest->>Queue: Enqueue for processing
    Ingest-->>Gateway: 202 Accepted {doc_id}
    Gateway-->>Client: 202 Accepted

    Note over Queue,Writer: Async Processing

    Queue->>Embed: Dequeue document

    par Parallel Embedding
        Embed->>Embed: Generate dense embedding
    and
        Embed->>Embed: Generate sparse embedding (SPLADE)
    end

    Embed->>Writer: Embeddings + document

    Writer->>Writer: Begin transaction

    par Parallel Index Writes
        Writer->>VecDB: Insert dense vector
    and
        Writer->>Inverted: Insert sparse vector
    and
        Writer->>DocStore: Store document content
    end

    Writer->>Writer: Commit transaction
    Writer->>Queue: Acknowledge success

    Note over Client: Query after ~500ms will include new document
```

### Indexing Pipeline Timing

| Stage | P50 Latency | P95 Latency | Notes |
|-------|-------------|-------------|-------|
| Validation | 2ms | 5ms | Schema check |
| Queue enqueue | 1ms | 3ms | Fast ack |
| Dense embedding | 30ms | 80ms | Bi-encoder |
| Sparse embedding | 20ms | 50ms | SPLADE |
| Vector DB write | 10ms | 30ms | HNSW insert |
| Inverted index write | 5ms | 15ms | Index update |
| Document store | 5ms | 15ms | Storage write |
| **Total (async)** | **73ms** | **198ms** | |

---

## Two-Stage Retrieval Architecture

```mermaid
flowchart TB
    subgraph Stage1["Stage 1: Fast Retrieval"]
        direction LR
        QUERY["Query"] --> QVEC["Query<br/>Vector"]
        QUERY --> QTOK["Query<br/>Tokens"]

        QVEC --> HNSW["HNSW<br/>ANN Search"]
        QTOK --> BM25["BM25<br/>Search"]

        HNSW --> DR["Dense<br/>Results<br/>(top-1000)"]
        BM25 --> SR["Sparse<br/>Results<br/>(top-1000)"]

        DR --> RRF["RRF<br/>Fusion<br/>(k=60)"]
        SR --> RRF

        RRF --> CAND["Candidates<br/>(top-100)"]
    end

    subgraph Stage2["Stage 2: Precise Reranking"]
        direction LR
        CAND --> FETCH["Fetch<br/>Documents"]
        FETCH --> PAIRS["Query-Doc<br/>Pairs"]
        PAIRS --> CROSS["Cross-<br/>Encoder"]
        CROSS --> FINAL["Final<br/>Results<br/>(top-10)"]
    end

    Stage1 --> Stage2

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef search fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef fusion fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef rerank fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class QUERY,QVEC,QTOK input
    class HNSW,BM25 search
    class DR,SR,RRF,CAND fusion
    class FETCH,PAIRS,CROSS,FINAL rerank
```

### Stage Comparison

| Aspect | Stage 1 (Bi-encoder) | Stage 2 (Cross-encoder) |
|--------|---------------------|------------------------|
| **Model architecture** | Dual encoder, pre-computed | Single encoder, query-doc pairs |
| **Latency** | 20-50ms | 50-200ms (for 100 docs) |
| **Throughput** | 10,000 QPS | 100 QPS (per GPU) |
| **Quality** | Good | Excellent |
| **When to use** | Always (first pass) | When quality matters |

---

## Fusion Strategies

### Reciprocal Rank Fusion (RRF) - Default

```
RRF_score(doc) = Σ 1/(k + rank_i(doc))
                 i∈retrievers
```

**Configuration:**
- k = 60 (standard, provides good rank compression)
- Works with any number of retrievers
- No score normalization needed

### Linear Combination

```
Combined_score(doc) = α × dense_score + (1-α) × sparse_score
```

**Configuration:**
- α = 0.5 default (equal weight)
- Requires score normalization (min-max or z-score)
- Tunable per use case

### Fusion Strategy Comparison

| Strategy | Formula | Pros | Cons | Use Case |
|----------|---------|------|------|----------|
| **RRF (k=60)** | 1/(k+rank) | No tuning, robust | Ignores score magnitude | Default |
| **Linear** | α×dense + (1-α)×sparse | Tunable | Needs calibration | Domain-specific |
| **RelativeScore** | Normalize then combine | Score-aware | Complex | Interpretability |
| **Learned** | ML model | Optimal | Training overhead | High-volume |
| **Max** | max(dense, sparse) | Simple | Loses information | Quick baseline |

---

## Key Architectural Decisions

### Decision 1: Parallel vs Sequential Retrieval

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Parallel (fan-out)** | Lower latency, both signals equally | More resources, complexity | **Selected** |
| **Sequential (cascade)** | Lower cost, can skip sparse if dense sufficient | Higher latency | Not selected |

**Rationale:** Hybrid search value comes from combining both signals. Sequential would defeat the purpose and add latency.

### Decision 2: Fusion Strategy

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **RRF** | Parameter-free, robust, no calibration | Ignores score magnitude | **Default** |
| **Linear** | Tunable, interpretable | Requires normalization, tuning | Alternative |
| **Learned** | Optimal for domain | Training data, complexity | Future |

**Rationale:** RRF provides excellent results out-of-the-box. Offer linear combination as configurable option.

### Decision 3: Reranking Placement

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Always-on** | Best quality | Higher latency, cost | Not selected |
| **Optional (configurable)** | Flexibility, cost control | Complexity | **Selected** |
| **Never** | Fastest, cheapest | Lower quality | Not selected |

**Rationale:** Different use cases have different latency/quality trade-offs. Make reranking opt-in.

### Decision 4: Index Synchronization

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Sync (transactional)** | Strong consistency | Higher write latency | Not selected |
| **Async (eventual)** | Lower latency, higher throughput | Temporary inconsistency | **Selected** |
| **Atomic multi-write** | Best-effort consistency | Complexity | **With async** |

**Rationale:** Search can tolerate seconds of index lag. Async with atomic multi-write balances consistency and performance.

---

## Technology Selection

### Vector Database Options

| Technology | Best For | Throughput | Features |
|------------|----------|------------|----------|
| **Qdrant** | Performance | Very High | Rust, filters, payloads |
| **Milvus** | Scale | High | GPU support, hybrid |
| **Weaviate** | Multi-modal | High | Modules, GraphQL |
| **pgvector** | Simplicity | Medium | PostgreSQL integration |
| **Vespa** | Full hybrid | Very High | Native BM25+vector |

**Recommendation:** Vespa for full hybrid, Qdrant for vector-first with external BM25.

### Embedding Model Selection

| Model | Dimensions | Quality | Latency | Use Case |
|-------|------------|---------|---------|----------|
| **text-embedding-3-large** | 3072 | Excellent | 50ms | Quality-first |
| **text-embedding-3-small** | 1536 | Good | 20ms | Balanced |
| **E5-large-v2** | 1024 | Very Good | 30ms | On-prem |
| **BGE-M3** | 1024 | Very Good | 30ms | Multi-lingual |
| **SPLADE** | Variable | Good | 40ms | Learned sparse |

**Recommendation:** E5-large-v2 or BGE-M3 for on-prem, text-embedding-3-small for API.

### Reranking Model Selection

| Model | Latency (100 docs) | Quality Boost | Deployment |
|-------|-------------------|---------------|------------|
| **Cohere Rerank 3** | 50ms | +25% | API |
| **Cohere Rerank 3 Nimble** | 30ms | +20% | API |
| **ms-marco-MiniLM** | 40ms | +15% | Self-hosted |
| **bge-reranker-large** | 60ms | +25% | Self-hosted |
| **ColBERT** | 20ms | +15% | Self-hosted |

**Recommendation:** Cohere Rerank 3 Nimble for API simplicity, bge-reranker-large for self-hosted.

---

## Multi-Region Deployment

```mermaid
flowchart TB
    subgraph Region1["Region: US-East"]
        LB1["Load Balancer"]
        SEARCH1["Search Cluster"]
        RERANK1["Rerank Service"]
        VEC1[("Vector Index<br/>(Primary)")]
        INV1[("Inverted Index<br/>(Primary)")]
    end

    subgraph Region2["Region: EU-West"]
        LB2["Load Balancer"]
        SEARCH2["Search Cluster"]
        RERANK2["Rerank Service"]
        VEC2[("Vector Index<br/>(Replica)")]
        INV2[("Inverted Index<br/>(Replica)")]
    end

    subgraph Region3["Region: APAC"]
        LB3["Load Balancer"]
        SEARCH3["Search Cluster"]
        RERANK3["Rerank Service"]
        VEC3[("Vector Index<br/>(Replica)")]
        INV3[("Inverted Index<br/>(Replica)")]
    end

    subgraph Global["Global Services"]
        GDNS["GeoDNS"]
        REPL["Replication<br/>Service"]
        CONFIG["Global<br/>Config"]
    end

    GDNS --> LB1
    GDNS --> LB2
    GDNS --> LB3

    LB1 --> SEARCH1
    SEARCH1 --> RERANK1
    SEARCH1 --> VEC1
    SEARCH1 --> INV1

    LB2 --> SEARCH2
    SEARCH2 --> RERANK2
    SEARCH2 --> VEC2
    SEARCH2 --> INV2

    LB3 --> SEARCH3
    SEARCH3 --> RERANK3
    SEARCH3 --> VEC3
    SEARCH3 --> INV3

    VEC1 --> REPL
    REPL --> VEC2
    REPL --> VEC3

    INV1 --> REPL
    REPL --> INV2
    REPL --> INV3

    classDef lb fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef compute fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef global fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class LB1,LB2,LB3 lb
    class SEARCH1,SEARCH2,SEARCH3,RERANK1,RERANK2,RERANK3 compute
    class VEC1,VEC2,VEC3,INV1,INV2,INV3 storage
    class GDNS,REPL,CONFIG global
```

### Multi-Region Configuration

| Aspect | Configuration |
|--------|---------------|
| **Routing** | GeoDNS routes to nearest region |
| **Replication** | Async replication with 1-5 second lag |
| **Failover** | Automatic failover to next-nearest region |
| **Write Region** | Single primary, read from any |
| **Consistency** | Eventual (acceptable for search) |

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Async for indexing, sync for search | Write throughput vs read latency |
| **Event-driven vs Request-response** | Request-response for search, event-driven for indexing | User expectation for search |
| **Push vs Pull** | Pull for search, push for index updates | Client-initiated search |
| **Stateless vs Stateful** | Stateless services, stateful storage | Horizontal scaling |
| **Read-heavy vs Write-heavy** | Read-heavy (1000:1 ratio) | Optimize for queries |
| **Real-time vs Batch** | Near real-time indexing, batch embedding | Balance freshness vs cost |
| **Edge vs Origin** | Origin for search, edge for caching | Complex computation at origin |
