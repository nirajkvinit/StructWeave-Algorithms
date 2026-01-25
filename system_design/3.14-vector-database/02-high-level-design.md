# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture Overview

A distributed vector database consists of several key layers working together to provide fast similarity search at scale.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        C1[Application]
        C2[RAG Pipeline]
        C3[Embedding Service]
    end

    subgraph Gateway["API Gateway Layer"]
        LB[Load Balancer]
        API[API Server]
        AUTH[Auth & Rate Limit]
    end

    subgraph Coordinator["Coordinator Layer"]
        META[Metadata Service]
        ROUTE[Query Router]
        SCHED[Index Scheduler]
    end

    subgraph IndexNodes["Index Node Layer"]
        subgraph Shard1["Shard 1"]
            IDX1[HNSW Index]
            BUF1[Write Buffer]
        end
        subgraph Shard2["Shard 2"]
            IDX2[HNSW Index]
            BUF2[Write Buffer]
        end
        subgraph Shard3["Shard 3"]
            IDX3[HNSW Index]
            BUF3[Write Buffer]
        end
    end

    subgraph Storage["Storage Layer"]
        WAL[(Write-Ahead Log)]
        BLOB[(Blob Storage)]
        SNAP[(Snapshots)]
    end

    C1 & C2 --> LB
    C3 -.->|Embeddings| C1
    LB --> API
    API --> AUTH
    AUTH --> ROUTE
    ROUTE --> META
    META --> SCHED

    ROUTE -->|Query| IDX1 & IDX2 & IDX3
    ROUTE -->|Write| BUF1 & BUF2 & BUF3

    BUF1 --> WAL
    BUF2 --> WAL
    BUF3 --> WAL

    IDX1 & IDX2 & IDX3 --> SNAP
    SNAP --> BLOB

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef coord fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef index fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef storage fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class C1,C2,C3 client
    class LB,API,AUTH gateway
    class META,ROUTE,SCHED coord
    class IDX1,IDX2,IDX3,BUF1,BUF2,BUF3 index
    class WAL,BLOB,SNAP storage
```

---

## Component Responsibilities

| Component | Responsibility | Key Decisions |
|-----------|---------------|---------------|
| **Load Balancer** | Distribute requests, health checks, SSL termination | Layer 7 for HTTP/2, round-robin |
| **API Server** | Request parsing, validation, response formatting | Stateless, horizontally scalable |
| **Auth Service** | API key validation, rate limiting, tenant isolation | Token-based, per-tenant limits |
| **Metadata Service** | Collection schemas, shard mapping, cluster state | Consistent store (etcd/ZooKeeper) |
| **Query Router** | Route queries to shards, merge results | Scatter-gather pattern |
| **Index Scheduler** | Background index builds, compaction, optimization | Priority queue, resource limits |
| **Index Node** | HNSW/IVF index, similarity search, filtering | Memory-mapped, SIMD optimized |
| **Write Buffer** | Absorb writes, batch for indexing | In-memory, size-limited |
| **WAL** | Durability for uncommitted writes | Append-only, replicated |
| **Blob Storage** | Index snapshots, cold data archival | Object storage, lifecycle policies |

---

## Data Flow

### Query Flow (Read Path)

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant API as API Server
    participant Router as Query Router
    participant Meta as Metadata
    participant S1 as Shard 1
    participant S2 as Shard 2
    participant S3 as Shard 3

    Client->>API: query(vector, k=10, filter)
    API->>API: Validate & authenticate
    API->>Router: Forward query

    Router->>Meta: Get shard mapping
    Meta-->>Router: [S1, S2, S3]

    par Scatter to all shards
        Router->>S1: search(vector, k=10, filter)
        Router->>S2: search(vector, k=10, filter)
        Router->>S3: search(vector, k=10, filter)
    end

    S1-->>Router: top-10 candidates
    S2-->>Router: top-10 candidates
    S3-->>Router: top-10 candidates

    Router->>Router: Merge & re-rank (top-10 global)
    Router-->>API: Final results
    API-->>Client: Response (10 vectors + metadata)
```

**Key Design Decisions:**

1. **Scatter-Gather**: Query all shards in parallel (data is partitioned, not replicated across shards)
2. **Over-fetch**: Each shard returns k candidates; router merges 3k candidates to find global top-k
3. **Filter Push-down**: Filters applied at shard level to reduce data transfer
4. **Timeout Handling**: Continue with partial results if a shard is slow (graceful degradation)

### Write Flow (Ingest Path)

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant API as API Server
    participant Router as Query Router
    participant Meta as Metadata
    participant Buffer as Write Buffer
    participant WAL as WAL
    participant Index as HNSW Index

    Client->>API: upsert(vectors[], metadata[])
    API->>API: Validate vectors & metadata
    API->>Router: Forward batch

    Router->>Meta: Get shard assignment (by vector ID)
    Meta-->>Router: Shard mapping

    Router->>Buffer: Write to buffer
    Buffer->>WAL: Persist (sync)
    WAL-->>Buffer: Ack
    Buffer-->>Router: Ack
    Router-->>API: Success
    API-->>Client: 200 OK (vectors queued)

    Note over Buffer,Index: Async background process

    Buffer->>Buffer: Batch accumulation
    Buffer->>Index: Flush batch to index
    Index->>Index: Insert into HNSW graph
    Index-->>Buffer: Indexed
```

**Key Design Decisions:**

1. **Write-Ahead Log**: All writes persisted to WAL before ack for durability
2. **Async Indexing**: Writes return immediately; indexing happens in background
3. **Batching**: Accumulate writes for efficient bulk insertion
4. **Buffer Search**: Recent writes in buffer are searched separately and merged with index results

---

## Core Concepts

### Sharding Strategy

Vectors are distributed across shards for horizontal scaling. Two primary approaches:

```mermaid
flowchart LR
    subgraph HashSharding["Hash-Based Sharding"]
        V1[Vector ID: abc123]
        HASH[hash mod N]
        SH1[Shard 0]
        SH2[Shard 1]
        SH3[Shard 2]

        V1 --> HASH
        HASH -->|0| SH1
        HASH -->|1| SH2
        HASH -->|2| SH3
    end

    subgraph ConsistentHash["Consistent Hashing"]
        RING((Hash Ring))
        N1[Node A<br/>0°-120°]
        N2[Node B<br/>120°-240°]
        N3[Node C<br/>240°-360°]

        RING --- N1
        RING --- N2
        RING --- N3
    end

    classDef shard fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    class SH1,SH2,SH3,N1,N2,N3 shard
```

| Strategy | Pros | Cons | Best For |
|----------|------|------|----------|
| **Hash-Based** | Simple, even distribution | Resharding requires full rebalance | Fixed cluster size |
| **Consistent Hashing** | Minimal data movement on resize | Slight imbalance possible | Dynamic scaling |
| **Range-Based** | Efficient range queries | Hot spots possible | Time-series data |

**Recommendation**: Consistent hashing with virtual nodes for production systems.

### Replication Strategy

```mermaid
flowchart TB
    subgraph Primary["Primary Shard"]
        P[Primary<br/>Read + Write]
    end

    subgraph Replicas["Replica Shards"]
        R1[Replica 1<br/>Read Only]
        R2[Replica 2<br/>Read Only]
    end

    P -->|Sync Write| R1
    P -->|Async Write| R2

    R1 -.->|Failover| P

    classDef primary fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef replica fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class P primary
    class R1,R2 replica
```

| Replication Mode | Consistency | Latency | Use Case |
|------------------|-------------|---------|----------|
| **Synchronous** | Strong (R1) | Higher | Financial, critical data |
| **Asynchronous** | Eventual (R2) | Lower | General search |
| **Quorum (W=2, R=2)** | Tunable | Medium | Balanced consistency/performance |

**Recommendation**: 1 sync replica (for fast failover) + 1 async replica (for read scaling).

### Index Types and Selection

```mermaid
flowchart TB
    START[New Collection] --> Q1{Latency<br/>Requirement?}

    Q1 -->|<10ms| Q2{Memory<br/>Budget?}
    Q1 -->|<100ms| Q3{Billion+<br/>Scale?}

    Q2 -->|Sufficient| HNSW[HNSW<br/>In-Memory]
    Q2 -->|Constrained| DISK[DiskANN<br/>SSD-Based]

    Q3 -->|Yes| IVFPQ[IVF-PQ<br/>Compressed]
    Q3 -->|No| IVF[IVF-Flat<br/>Disk-Friendly]

    HNSW --> DONE[Collection Created]
    DISK --> DONE
    IVFPQ --> DONE
    IVF --> DONE

    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef index fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class Q1,Q2,Q3 decision
    class HNSW,DISK,IVFPQ,IVF index
```

---

## Key Architectural Decisions

### Decision 1: Shared-Nothing vs Shared-Storage

| Aspect | Shared-Nothing | Shared-Storage |
|--------|---------------|----------------|
| **Architecture** | Each node owns its data | Compute separated from storage |
| **Scaling** | Scale by adding nodes | Scale compute/storage independently |
| **Failure Domain** | Node failure = data unavailable | Compute failure = quick recovery |
| **Cost** | Higher (data replicated) | Lower (storage shared) |
| **Latency** | Lower (local data) | Higher (network to storage) |
| **Examples** | Qdrant, Redis | Pinecone Serverless, Milvus 2.x |

**Recommendation**: Shared-storage for serverless/managed offerings; shared-nothing for low-latency on-prem.

### Decision 2: In-Memory vs Disk-Based Index

| Aspect | In-Memory (HNSW) | Disk-Based (DiskANN/IVF) |
|--------|------------------|--------------------------|
| **Latency** | 5-15ms p99 | 20-50ms p99 |
| **Cost** | $$$$ (RAM is expensive) | $$ (SSD is cheap) |
| **Scale Limit** | ~100M vectors/node | 1B+ vectors/node |
| **Cold Start** | Slow (load into RAM) | Fast (memory-map) |
| **Updates** | Fast (in-place) | Slower (may need merge) |

**Recommendation**: Start with in-memory HNSW; migrate to disk-based when cost becomes prohibitive.

### Decision 3: Sync vs Async Indexing

| Aspect | Synchronous | Asynchronous |
|--------|-------------|--------------|
| **Write Latency** | High (wait for index) | Low (return immediately) |
| **Searchability** | Immediate | Delayed (seconds to minutes) |
| **Consistency** | Strong | Eventual |
| **Throughput** | Lower | Higher |

**Recommendation**: Async indexing with a searchable write buffer for "best of both worlds."

### Decision 4: Filter Execution Strategy

```
Pre-Filter          In-Filter           Post-Filter
───────────         ─────────           ───────────
Filter first        Interleaved         Search first
Then search         During HNSW         Then filter
                    traversal

Pros:               Pros:               Pros:
- Fast for          - Best overall      - Always finds
  selective           performance         k results
  filters           - Balanced          - Simplest

Cons:               Cons:               Cons:
- May miss          - Complex           - Slow for
  good vectors        implementation      selective
                                          filters
```

**Recommendation**: In-filter with ACORN algorithm for HNSW (see Deep Dive section).

---

## Architecture Variants

### Variant 1: Single-Node (Development/Small Scale)

```
┌────────────────────────────────────────┐
│              Single Node               │
├────────────────────────────────────────┤
│  API Server + Index + Storage          │
│  - <10M vectors                        │
│  - No replication                      │
│  - Local persistence                   │
├────────────────────────────────────────┤
│  Examples: Chroma, pgvector            │
└────────────────────────────────────────┘
```

### Variant 2: Distributed (Production)

```
┌────────────────────────────────────────┐
│           Distributed Cluster          │
├────────────────────────────────────────┤
│  Coordinator + N Index Nodes           │
│  - 10M - 1B vectors                    │
│  - Sharding + Replication              │
│  - Managed or self-hosted              │
├────────────────────────────────────────┤
│  Examples: Milvus, Qdrant, Weaviate    │
└────────────────────────────────────────┘
```

### Variant 3: Serverless (Cloud-Native)

```
┌────────────────────────────────────────┐
│              Serverless                │
├────────────────────────────────────────┤
│  API Gateway + Auto-scaling Index      │
│  - Pay per query                       │
│  - Storage separated from compute      │
│  - No capacity planning                │
├────────────────────────────────────────┤
│  Examples: Pinecone, AWS S3 Vectors    │
└────────────────────────────────────────┘
```

---

## Integration Points

### Embedding Service Integration

```mermaid
flowchart LR
    subgraph Application
        APP[App Logic]
    end

    subgraph EmbeddingLayer["Embedding Service"]
        EMB[Embedding Model<br/>OpenAI / Cohere / Local]
    end

    subgraph VectorDB["Vector Database"]
        VDB[Vector Store]
    end

    APP -->|1. Text| EMB
    EMB -->|2. Vector| APP
    APP -->|3. Store/Query| VDB
    VDB -->|4. Results| APP

    classDef app fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef emb fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef db fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class APP app
    class EMB emb
    class VDB db
```

**Key Considerations:**
- **Model Consistency**: Same embedding model for indexing and querying
- **Dimension Alignment**: Collection dimension must match model output
- **Normalization**: Some models output normalized vectors; configure distance metric accordingly

### RAG Pipeline Integration

```mermaid
flowchart TB
    subgraph RAGPipeline["RAG Pipeline"]
        Q[User Query]
        EMB[Embed Query]
        VDB[(Vector DB)]
        CTX[Context Assembly]
        LLM[LLM Generation]
        R[Response]
    end

    Q --> EMB
    EMB --> VDB
    VDB -->|Top-k chunks| CTX
    CTX -->|Prompt + Context| LLM
    LLM --> R

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef db fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef output fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class Q input
    class EMB,CTX,LLM process
    class VDB db
    class R output
```

---

## Architecture Pattern Checklist

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Communication | Sync vs Async | **Sync for queries, Async for writes** | Low latency reads, high throughput writes |
| Event Model | Event-driven vs Request-response | **Request-response** | Simpler for search workloads |
| Push vs Pull | Push vs Pull | **Pull (on-demand queries)** | No need for streaming results |
| State | Stateless vs Stateful | **Stateful index nodes** | Index must be in memory |
| Workload | Read-heavy vs Write-heavy | **Read-heavy optimized** | 100:1 read:write ratio |
| Processing | Real-time vs Batch | **Hybrid** | Real-time search, batch indexing |
| Edge | Edge vs Origin | **Origin** | Embedding models and indexes are large |
