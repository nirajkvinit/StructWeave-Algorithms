# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture Overview

A production RAG system consists of two main pipelines: the **Ingestion Pipeline** (offline) and the **Query Pipeline** (online). Both share common infrastructure for storage, embeddings, and observability.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WEB[Web App]
        API_CLIENT[API Client]
        CHAT[Chat Interface]
    end

    subgraph Gateway["API Gateway"]
        LB[Load Balancer]
        AUTH[Auth Service]
        RATE[Rate Limiter]
    end

    subgraph QueryPipeline["Query Pipeline"]
        QS[Query Service]
        QR[Query Rewriter]
        RET[Retriever]
        RANK[Reranker]
        CTX[Context Assembler]
        GEN[Generator]
    end

    subgraph IngestionPipeline["Ingestion Pipeline"]
        ING[Ingestion Service]
        PARSE[Document Parser]
        CHUNK[Chunker]
        EMB_ING[Embedding Service]
        IDX[Indexer]
    end

    subgraph Storage["Storage Layer"]
        VDB[(Vector DB)]
        DOC[(Document Store)]
        META[(Metadata Store)]
        CACHE[(Query Cache)]
    end

    subgraph External["External Services"]
        EMB_API[Embedding API]
        LLM_API[LLM API]
    end

    WEB & API_CLIENT & CHAT --> LB
    LB --> AUTH --> RATE

    RATE --> QS
    QS --> QR --> RET
    RET --> VDB
    RET --> DOC
    RET --> RANK --> CTX --> GEN
    GEN --> LLM_API

    RATE --> ING
    ING --> PARSE --> CHUNK --> EMB_ING --> IDX
    IDX --> VDB
    IDX --> DOC
    EMB_ING --> EMB_API

    QS --> CACHE

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef query fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ingest fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef storage fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef external fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class WEB,API_CLIENT,CHAT client
    class LB,AUTH,RATE gateway
    class QS,QR,RET,RANK,CTX,GEN query
    class ING,PARSE,CHUNK,EMB_ING,IDX ingest
    class VDB,DOC,META,CACHE storage
    class EMB_API,LLM_API external
```

---

## Component Responsibilities

| Component | Responsibility | Key Decisions |
|-----------|---------------|---------------|
| **Load Balancer** | Distribute requests, health checks, SSL termination | Layer 7, sticky sessions for conversations |
| **Auth Service** | API key validation, JWT verification, tenant isolation | Token-based, per-org rate limits |
| **Query Service** | Orchestrate query pipeline, manage timeouts | Async with streaming support |
| **Query Rewriter** | Expand/clarify queries, generate variants | LLM-based or rule-based |
| **Retriever** | Hybrid search (dense + sparse) | BM25 + embedding similarity |
| **Reranker** | Re-score top-N results | Cross-encoder model |
| **Context Assembler** | Build prompt with citations | Token budgeting, deduplication |
| **Generator** | Stream LLM response | Async streaming, retry logic |
| **Ingestion Service** | Coordinate document processing | Queue-based, idempotent |
| **Document Parser** | Extract text from files | Format detection, OCR fallback |
| **Chunker** | Split documents semantically | Sentence-aware, overlap handling |
| **Embedding Service** | Generate vector embeddings | Batch processing, GPU acceleration |
| **Indexer** | Write to vector DB and doc store | Transactional, upsert logic |

---

## Data Flow

### Ingestion Flow (Offline)

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant API as Ingestion API
    participant Queue as Job Queue
    participant Parser as Document Parser
    participant Chunker
    participant Embedder as Embedding Service
    participant VDB as Vector DB
    participant DocStore as Document Store

    Client->>API: POST /ingest (documents[])
    API->>API: Validate & authenticate
    API->>Queue: Enqueue job (doc_id, source)
    API-->>Client: 202 Accepted (job_id)

    Note over Queue,DocStore: Async Processing

    Queue->>Parser: Dequeue job
    Parser->>Parser: Extract text, metadata
    Parser->>DocStore: Store raw document
    Parser->>Chunker: Send extracted text

    Chunker->>Chunker: Split into chunks
    Chunker->>Embedder: Batch chunks

    Embedder->>Embedder: Generate embeddings
    Embedder->>VDB: Upsert vectors + metadata
    Embedder->>DocStore: Store chunk text

    VDB-->>Queue: Indexed (chunk_ids[])
    Queue-->>Client: Webhook: job complete
```

**Key Design Decisions:**

1. **Async Processing**: Ingestion returns immediately; processing happens in background
2. **Idempotent Writes**: Same document can be re-ingested without duplicates
3. **Transactional Indexing**: Vector DB and doc store updated together
4. **Webhook Notifications**: Clients notified when ingestion completes

### Query Flow (Online)

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant API as Query API
    participant Cache
    participant Rewriter as Query Rewriter
    participant Retriever
    participant VDB as Vector DB
    participant BM25 as BM25 Index
    participant Reranker
    participant Assembler as Context Assembler
    participant LLM as LLM API

    Client->>API: POST /query (question, filters)
    API->>API: Validate & authenticate

    API->>Cache: Check cache
    alt Cache Hit
        Cache-->>API: Cached response
        API-->>Client: 200 OK (cached)
    end

    API->>Rewriter: Expand query
    Rewriter-->>API: Rewritten query + variants

    par Parallel Retrieval
        API->>Retriever: Dense search
        Retriever->>VDB: Vector similarity (k=50)
        VDB-->>Retriever: Top-50 vectors
    and
        API->>Retriever: Sparse search
        Retriever->>BM25: BM25 search (k=50)
        BM25-->>Retriever: Top-50 docs
    end

    Retriever->>Retriever: Merge with RRF
    Retriever-->>API: Top-100 candidates

    API->>Reranker: Rerank candidates
    Reranker->>Reranker: Cross-encoder scoring
    Reranker-->>API: Top-10 reranked

    API->>Assembler: Build context
    Assembler->>Assembler: Token budgeting
    Assembler-->>API: Prompt with citations

    API->>LLM: Generate (streaming)

    loop Streaming Response
        LLM-->>API: Token chunk
        API-->>Client: SSE: token chunk
    end

    API->>Cache: Store response
    API-->>Client: SSE: [DONE]
```

**Key Design Decisions:**

1. **Query Rewriting**: Improve retrieval by expanding/clarifying queries
2. **Hybrid Search**: Dense (semantic) + Sparse (BM25) for best recall
3. **RRF Fusion**: Combine rankings without hyperparameter tuning
4. **Cross-Encoder Reranking**: 20-35% accuracy improvement
5. **Streaming Response**: Perceived latency <500ms to first token
6. **Response Caching**: 10-30% cache hit rate for common queries

---

## Hybrid Retrieval Architecture

```mermaid
flowchart TB
    subgraph Input["Query Processing"]
        Q[User Query]
        EMB[Query Embedding]
        TOK[Query Tokenizer]
    end

    subgraph DenseSearch["Dense Retrieval"]
        VDB[(Vector DB<br/>HNSW Index)]
        D_RESULTS[Top-K Dense Results]
    end

    subgraph SparseSearch["Sparse Retrieval"]
        BM25[(BM25 Index)]
        S_RESULTS[Top-K Sparse Results]
    end

    subgraph Fusion["Rank Fusion"]
        RRF[Reciprocal Rank Fusion]
        MERGED[Merged Candidates]
    end

    subgraph Reranking["Reranking"]
        CROSS[Cross-Encoder<br/>Reranker]
        FINAL[Final Top-K]
    end

    Q --> EMB --> VDB --> D_RESULTS
    Q --> TOK --> BM25 --> S_RESULTS

    D_RESULTS --> RRF
    S_RESULTS --> RRF
    RRF --> MERGED --> CROSS --> FINAL

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef dense fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef sparse fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef fusion fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef rerank fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class Q,EMB,TOK input
    class VDB,D_RESULTS dense
    class BM25,S_RESULTS sparse
    class RRF,MERGED fusion
    class CROSS,FINAL rerank
```

### Why Hybrid Search?

| Scenario | Dense Only | Sparse Only | Hybrid |
|----------|-----------|-------------|--------|
| "What is HIPAA?" | Finds related concepts | Exact match "HIPAA" | Best of both |
| "How do I return an item?" | Semantic: "return", "refund" | May miss synonyms | Covers both |
| "Error code E-4021" | Poor (rare in training) | Exact match | Handles both |
| **Overall Recall** | 85-92% | 75-85% | 90-97% |

---

## Key Architectural Decisions

### Decision 1: Chunking Strategy

```mermaid
flowchart TB
    DOC[Document] --> Q1{Document Type?}

    Q1 -->|Long-form text| SEM[Semantic Chunking]
    Q1 -->|Structured| HIER[Hierarchical Chunking]
    Q1 -->|Code| AST[AST-Based Chunking]
    Q1 -->|Tables| ROW[Row-Based Chunking]

    SEM --> Q2{Quality vs Speed?}
    Q2 -->|Speed| FIXED[Fixed + Overlap<br/>512 tokens, 50 overlap]
    Q2 -->|Quality| SEMANTIC[Sentence-Based<br/>Similarity Threshold]

    HIER --> PARENT[Parent-Child<br/>Store Both]
    AST --> FUNC[Function/Class Level]
    ROW --> CELL[Cell-Level Indexing]

    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef strategy fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class Q1,Q2 decision
    class SEM,HIER,AST,ROW,FIXED,SEMANTIC,PARENT,FUNC,CELL strategy
```

**Recommendation**: Semantic chunking with sentence awareness for text, AST-based for code.

### Decision 2: Retrieval Architecture

| Aspect | Dense Only | Hybrid (Dense + BM25) | Multi-Stage |
|--------|-----------|----------------------|-------------|
| **Recall** | 85-92% | 90-97% | 95-99% |
| **Latency** | 20-30ms | 30-50ms | 100-200ms |
| **Complexity** | Low | Medium | High |
| **Cost** | $ | $$ | $$$ |
| **Best For** | Simple Q&A | Production | High-stakes |

**Recommendation**: Hybrid search with RRF fusion for production systems.

### Decision 3: Reranking Strategy

| Approach | Accuracy | Latency | Cost | When to Use |
|----------|----------|---------|------|-------------|
| **No Reranking** | Baseline | 0ms | Free | Prototypes, low-stakes |
| **Cross-Encoder** | +20-35% | 50-150ms | $$ | Production systems |
| **LLM Reranker** | +25-40% | 200-500ms | $$$ | Highest quality needs |
| **ColBERT** | +15-25% | 20-50ms | $ | Latency-sensitive |

**Recommendation**: Cross-encoder (e.g., `bge-reranker-v2`) for 94%+ of production cases.

### Decision 4: LLM Integration

```
Streaming vs Batch:
─────────────────────────────────────────────────────────
Streaming (recommended):
• Time to first token: ~300ms
• Perceived latency: Low
• UX: Progressive rendering
• Complexity: SSE/WebSocket handling

Batch:
• Time to response: 1-3s (full generation)
• Perceived latency: High
• UX: Loading spinner
• Complexity: Simpler implementation

Recommendation: Always use streaming for user-facing apps
```

### Decision 5: Citation Strategy

| Strategy | Pros | Cons | Implementation |
|----------|------|------|----------------|
| **Inline References** | Precise, verifiable | Clutters response | `[1]`, `[2]` with footnotes |
| **End References** | Clean response | Less precise | "Sources:" section |
| **Highlighted Quotes** | Most verifiable | Longer response | Include direct quotes |
| **Linked Passages** | Interactive | Requires UI support | Clickable citations |

**Recommendation**: Inline `[1]` references with source list at end.

---

## Architecture Variants

### Variant 1: Serverless RAG

```
┌────────────────────────────────────────┐
│           Serverless Architecture       │
├────────────────────────────────────────┤
│  • Lambda/Cloud Functions for compute   │
│  • Managed vector DB (Pinecone, etc.)  │
│  • API-based LLM (no GPU management)   │
│  • S3/GCS for document storage         │
├────────────────────────────────────────┤
│  Pros: Zero ops, auto-scaling          │
│  Cons: Cold starts, vendor lock-in     │
│  Best: <1M documents, variable traffic │
└────────────────────────────────────────┘
```

### Variant 2: Self-Hosted RAG

```
┌────────────────────────────────────────┐
│           Self-Hosted Architecture      │
├────────────────────────────────────────┤
│  • Kubernetes for orchestration         │
│  • Milvus/Qdrant for vector DB         │
│  • vLLM for local LLM inference        │
│  • MinIO for document storage          │
├────────────────────────────────────────┤
│  Pros: Cost control, data privacy      │
│  Cons: Ops complexity, GPU management  │
│  Best: Enterprise, compliance needs    │
└────────────────────────────────────────┘
```

### Variant 3: Hybrid RAG

```
┌────────────────────────────────────────┐
│           Hybrid Architecture           │
├────────────────────────────────────────┤
│  • Self-hosted ingestion pipeline      │
│  • Managed vector DB (cost trade-off)  │
│  • API-based LLM for generation        │
│  • Self-hosted reranker (GPU)          │
├────────────────────────────────────────┤
│  Pros: Balance of control and simplicity│
│  Cons: Integration complexity           │
│  Best: Most production systems         │
└────────────────────────────────────────┘
```

---

## Integration Points

### Embedding Service Integration

```mermaid
flowchart LR
    subgraph Application["Application Layer"]
        ING[Ingestion]
        QRY[Query]
    end

    subgraph EmbeddingLayer["Embedding Options"]
        API[API-Based<br/>OpenAI, Cohere]
        LOCAL[Self-Hosted<br/>sentence-transformers]
        HYBRID[Hybrid<br/>Cache + API]
    end

    ING -->|Batch| API
    ING -->|Batch| LOCAL
    QRY -->|Single| HYBRID

    classDef app fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef emb fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class ING,QRY app
    class API,LOCAL,HYBRID emb
```

**Considerations:**
- **API-based**: Simple, scalable, but adds latency and cost
- **Self-hosted**: Lower latency, fixed cost, but requires GPU management
- **Hybrid**: Cache embeddings, fall back to API (recommended for queries)

### LLM Provider Integration

```mermaid
flowchart TB
    subgraph Router["LLM Router"]
        R[Request Router]
    end

    subgraph Providers["LLM Providers"]
        P1[OpenAI<br/>GPT-4]
        P2[Anthropic<br/>Claude]
        P3[Self-Hosted<br/>Llama]
        P4[Fallback<br/>GPT-3.5]
    end

    subgraph Logic["Routing Logic"]
        COST[Cost Optimization]
        QUAL[Quality Routing]
        FAIL[Failover]
    end

    R --> COST --> P3
    R --> QUAL --> P1
    R --> QUAL --> P2
    R --> FAIL --> P4

    classDef router fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef provider fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef logic fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class R router
    class P1,P2,P3,P4 provider
    class COST,QUAL,FAIL logic
```

**Routing Strategies:**
- **Cost-based**: Route simple queries to cheaper models
- **Quality-based**: Route complex queries to best models
- **Failover**: Automatic fallback on provider errors
- **Load balancing**: Distribute across providers

---

## Architecture Pattern Checklist

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Communication | Sync vs Async | **Streaming (SSE)** | Best perceived latency |
| Ingestion | Sync vs Async | **Async (queue)** | Handle large batches |
| State | Stateless vs Stateful | **Stateless services** | Horizontal scaling |
| Caching | None vs Aggressive | **Multi-layer** | Query + embedding cache |
| Retrieval | Dense vs Hybrid | **Hybrid** | Best recall |
| Reranking | None vs Cross-encoder | **Cross-encoder** | Quality improvement |
| LLM | API vs Self-hosted | **API (default)** | Simplicity, latest models |
