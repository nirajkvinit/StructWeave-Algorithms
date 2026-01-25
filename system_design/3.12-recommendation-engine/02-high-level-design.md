# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        Mobile["Mobile Apps"]
        Web["Web Apps"]
        TV["Smart TV Apps"]
        Partner["Partner APIs"]
    end

    subgraph EdgeLayer["Edge Layer"]
        CDN["CDN<br/>(Static Results)"]
        EdgeCache["Edge Cache<br/>(Personalized)"]
    end

    subgraph Gateway["API Gateway"]
        LB["Load Balancer"]
        Auth["Auth Service"]
        RateLimit["Rate Limiter"]
        ABRouter["A/B Router"]
    end

    subgraph Orchestration["Recommendation Orchestrator"]
        RecService["Recommendation<br/>Service"]
        ContextBuilder["Context<br/>Builder"]
        ResultBlender["Result<br/>Blender"]
    end

    subgraph CandidateGen["Candidate Generation Layer"]
        direction LR
        CollabSource["Collaborative<br/>Retrieval"]
        ContentSource["Content-Based<br/>Retrieval"]
        TrendingSource["Trending/<br/>Popular"]
        RecentSource["Recently<br/>Viewed Similar"]
    end

    subgraph VectorInfra["Vector Infrastructure"]
        UserEmbedding["User Embedding<br/>Service"]
        VectorDB1[("Vector DB<br/>Shard 1")]
        VectorDB2[("Vector DB<br/>Shard 2")]
        VectorDBN[("Vector DB<br/>Shard N")]
    end

    subgraph RankingLayer["Ranking Layer"]
        PreRanker["Pre-Ranker<br/>(Lightweight)"]
        MainRanker["Main Ranker<br/>(Deep Model)"]
        ReRanker["Re-Ranker<br/>(Diversity)"]
        ModelServing["Model Serving<br/>Cluster (GPU)"]
    end

    subgraph FeatureInfra["Feature Infrastructure"]
        FeatureService["Feature<br/>Service"]
        OnlineStore[("Online Store<br/>(Redis)")]
        UserProfile["User Profile<br/>Service"]
    end

    subgraph DataLayer["Data Layer"]
        ItemCatalog[("Item Catalog")]
        InteractionDB[("Interaction<br/>Store")]
        EmbeddingStore[("Embedding<br/>Store")]
    end

    subgraph Streaming["Real-time Pipeline"]
        EventStream["Event Stream<br/>(Kafka)"]
        StreamProcessor["Stream<br/>Processor"]
        RealtimeFeatures["Real-time<br/>Features"]
    end

    subgraph BatchPipeline["Batch Pipeline"]
        DataLake[("Data Lake")]
        FeaturePipeline["Feature<br/>Pipeline"]
        TrainingPipeline["Training<br/>Pipeline"]
        ModelRegistry["Model<br/>Registry"]
        EmbeddingPipeline["Embedding<br/>Pipeline"]
    end

    %% Client connections
    Clients --> EdgeLayer
    EdgeLayer --> Gateway
    Gateway --> RecService

    %% Orchestration flow
    RecService --> ContextBuilder
    RecService --> ResultBlender
    ContextBuilder --> UserProfile
    ContextBuilder --> FeatureService

    %% Candidate generation
    RecService --> CollabSource
    RecService --> ContentSource
    RecService --> TrendingSource
    RecService --> RecentSource

    CollabSource --> UserEmbedding
    ContentSource --> UserEmbedding
    UserEmbedding --> VectorDB1
    UserEmbedding --> VectorDB2
    UserEmbedding --> VectorDBN

    %% Ranking flow
    CandidateGen --> PreRanker
    PreRanker --> MainRanker
    MainRanker --> ModelServing
    MainRanker --> ReRanker
    ReRanker --> ResultBlender

    %% Feature flow
    MainRanker --> FeatureService
    FeatureService --> OnlineStore
    OnlineStore --> RealtimeFeatures

    %% Streaming pipeline
    Gateway --> EventStream
    EventStream --> StreamProcessor
    StreamProcessor --> RealtimeFeatures
    StreamProcessor --> OnlineStore
    StreamProcessor --> InteractionDB

    %% Batch pipeline
    InteractionDB --> DataLake
    DataLake --> FeaturePipeline
    FeaturePipeline --> EmbeddingStore
    DataLake --> TrainingPipeline
    TrainingPipeline --> ModelRegistry
    ModelRegistry --> ModelServing
    DataLake --> EmbeddingPipeline
    EmbeddingPipeline --> VectorDB1
    EmbeddingPipeline --> VectorDB2
    EmbeddingPipeline --> VectorDBN

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#e1f5fe,stroke:#01579b,stroke-width:1px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class Mobile,Web,TV,Partner client
    class CDN,EdgeCache edge
    class LB,Auth,RateLimit,ABRouter gateway
    class RecService,ContextBuilder,ResultBlender,CollabSource,ContentSource,TrendingSource,RecentSource,UserEmbedding,PreRanker,MainRanker,ReRanker,FeatureService,UserProfile,StreamProcessor,FeaturePipeline,TrainingPipeline,EmbeddingPipeline service
    class VectorDB1,VectorDB2,VectorDBN,ItemCatalog,InteractionDB,EmbeddingStore,DataLake,ModelRegistry storage
    class OnlineStore,RealtimeFeatures cache
    class EventStream queue
    class ModelServing compute
```

---

## Data Flow: Recommendation Request

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Gateway as API Gateway
    participant ABRouter as A/B Router
    participant RecService as Recommendation Service
    participant UserProfile as User Profile
    participant FeatureStore as Feature Store
    participant Retrieval as Retrieval Service
    participant VectorDB as Vector DB
    participant Ranker as Ranking Service
    participant ModelServer as Model Server

    Client->>Gateway: GET /recommendations?user_id=123
    Gateway->>Gateway: Rate limit check
    Gateway->>ABRouter: Route to experiment
    ABRouter->>RecService: Forward with experiment config

    par Parallel: Build Context
        RecService->>UserProfile: Get user profile
        UserProfile-->>RecService: Profile + preferences
        RecService->>FeatureStore: Get user features
        FeatureStore-->>RecService: Real-time features
    end

    RecService->>Retrieval: Get candidates (user_embedding, context)

    par Parallel: Multi-source Retrieval
        Retrieval->>VectorDB: Collaborative ANN search
        VectorDB-->>Retrieval: 1000 collaborative candidates
        Retrieval->>VectorDB: Content-based ANN search
        VectorDB-->>Retrieval: 500 content candidates
        Retrieval->>Retrieval: Get trending items
    end

    Retrieval->>Retrieval: Merge & deduplicate candidates
    Retrieval-->>RecService: 2000 unique candidates

    RecService->>Ranker: Rank candidates (user, context, candidates)

    par Parallel: Feature Enrichment
        Ranker->>FeatureStore: Get item features (batch)
        FeatureStore-->>Ranker: Item features
        Ranker->>FeatureStore: Get cross features
        FeatureStore-->>Ranker: User-item cross features
    end

    Ranker->>ModelServer: Score candidates (batched)
    ModelServer-->>Ranker: Scores

    Ranker->>Ranker: Apply diversity re-ranking
    Ranker->>Ranker: Apply business rules (filtering)
    Ranker-->>RecService: Top 50 ranked items

    RecService->>RecService: Add explanations
    RecService-->>Gateway: Recommendations + metadata
    Gateway-->>Client: JSON response

    Note over Client,ModelServer: Total latency budget: <100ms p99
```

---

## Data Flow: Training Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant Events as Event Stream
    participant StreamProc as Stream Processor
    participant OnlineStore as Online Store
    participant DataLake as Data Lake
    participant FeaturePipe as Feature Pipeline
    participant TrainPipe as Training Pipeline
    participant ModelReg as Model Registry
    participant Validator as Model Validator
    participant Serving as Model Serving
    participant Monitor as Monitoring

    Note over Events,Monitor: Daily Batch Training Pipeline

    Events->>StreamProc: User interactions (continuous)
    StreamProc->>OnlineStore: Update real-time features
    StreamProc->>DataLake: Append to interaction log

    DataLake->>FeaturePipe: Trigger daily feature computation
    FeaturePipe->>FeaturePipe: Compute batch features
    FeaturePipe->>FeaturePipe: Generate training examples
    FeaturePipe->>DataLake: Store training data

    DataLake->>TrainPipe: Trigger model training
    TrainPipe->>TrainPipe: Train two-tower model
    TrainPipe->>TrainPipe: Train ranking model
    TrainPipe->>TrainPipe: Generate embeddings
    TrainPipe->>ModelReg: Register model version

    ModelReg->>Validator: Trigger validation
    Validator->>Validator: Offline metrics (AUC, NDCG)
    Validator->>Validator: Shadow traffic test

    alt Validation Passed
        Validator->>Serving: Deploy canary (1%)
        Serving->>Monitor: Monitor online metrics

        alt Canary Healthy
            Serving->>Serving: Progressive rollout (10%, 50%, 100%)
            Monitor-->>ModelReg: Mark as production
        else Canary Degraded
            Monitor->>Serving: Automatic rollback
            Monitor-->>ModelReg: Mark as failed
        end
    else Validation Failed
        Validator-->>ModelReg: Mark as failed
        Validator-->>TrainPipe: Alert for investigation
    end
```

---

## Data Flow: Real-time Feature Update

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Gateway as API Gateway
    participant Events as Event Stream
    participant StreamProc as Stream Processor
    participant OnlineStore as Online Store
    participant EmbedService as Embedding Service
    participant VectorDB as Vector DB

    Client->>Gateway: User interaction (click, view, purchase)
    Gateway->>Events: Publish interaction event

    Events->>StreamProc: Consume event

    par Parallel Updates
        StreamProc->>StreamProc: Update windowed aggregations
        StreamProc->>OnlineStore: Write user session features
        StreamProc->>OnlineStore: Update user interaction counts
    end

    alt High-value interaction (purchase, long view)
        StreamProc->>EmbedService: Trigger embedding update
        EmbedService->>EmbedService: Compute incremental embedding
        EmbedService->>VectorDB: Update user embedding
    end

    Note over Client,VectorDB: Feature latency: <1 minute<br/>Embedding latency: <15 minutes
```

---

## Key Architectural Decisions

### Decision 1: Two-Stage vs End-to-End Architecture

| Criterion | Two-Stage (Retrieval + Ranking) | End-to-End Neural |
|-----------|--------------------------------|-------------------|
| **Scalability** | O(log N) retrieval + O(k) ranking | O(N) per request |
| **Latency** | <100ms achievable | Infeasible at scale |
| **Interpretability** | Separate components, easier debugging | Black box |
| **Flexibility** | Different models for each stage | Single model |
| **Complexity** | Higher system complexity | Lower system, higher model |

**Decision: Two-Stage Architecture**

**Rationale:**
- At 100M items and 1M QPS, scoring all items per request = 100 trillion operations/sec
- Two-stage reduces to: O(log N) ANN search + O(5000) ranking = feasible
- Industry standard: Netflix, YouTube, Pinterest, Spotify all use two-stage

---

### Decision 2: Retrieval Approach

| Criterion | Collaborative Only | Content Only | Two-Tower Hybrid |
|-----------|-------------------|--------------|------------------|
| **Cold Start (Users)** | Poor | Good | Good |
| **Cold Start (Items)** | Poor | Good | Good |
| **Personalization** | Excellent | Moderate | Excellent |
| **Diversity** | Limited | Good | Balanced |
| **Training Data** | Requires interactions | Requires metadata | Both |

**Decision: Two-Tower Model with Multi-Source Retrieval**

**Architecture:**
```
User Tower: user_features → MLP → user_embedding (256d)
Item Tower: item_features → MLP → item_embedding (256d)
Similarity: dot_product(user_embedding, item_embedding)
```

**Rationale:**
- Two-tower enables efficient ANN serving (pre-compute item embeddings)
- Combines collaborative signals (from interaction-based training) with content (from features)
- Multi-source retrieval (collaborative + content + trending) maximizes recall

---

### Decision 3: ANN Algorithm Selection

| Criterion | HNSW | IVF-PQ | ScaNN | Brute Force |
|-----------|------|--------|-------|-------------|
| **Query Latency** | ~1-5ms | ~5-10ms | ~1-3ms | 100ms+ |
| **Recall@1000** | >95% | 85-90% | >95% | 100% |
| **Memory** | High (graph + vectors) | Low (compressed) | Medium | High |
| **Index Build Time** | Medium | Fast | Fast | N/A |
| **Update Complexity** | Hard (rebuild) | Easy | Medium | Easy |

**Decision: HNSW with Product Quantization for Memory Optimization**

**Configuration:**
```
HNSW Parameters:
  M: 16 (connections per node)
  ef_construction: 200 (build-time accuracy)
  ef_search: 100 (query-time accuracy)

Product Quantization:
  segments: 32
  bits_per_segment: 8
  Memory reduction: ~4x
```

**Rationale:**
- HNSW provides best recall/latency trade-off
- Product quantization reduces memory for billion-scale indexes
- Widely supported (FAISS, Milvus, Pinecone)

---

### Decision 4: Ranking Model Architecture

| Criterion | Wide & Deep | DCN v2 | Transformer | Two-Tower |
|-----------|-------------|--------|-------------|-----------|
| **Feature Interactions** | Explicit + learned | Explicit cross | Attention-based | Limited |
| **Training Efficiency** | Good | Good | Expensive | Good |
| **Serving Latency** | ~5ms | ~5ms | ~20ms | ~1ms |
| **Accuracy** | High | Higher | Highest | Medium |

**Decision: Wide & Deep with Optional DCN Enhancement**

**Architecture:**
```
Wide Component (memorization):
  - Cross-product features
  - Linear model

Deep Component (generalization):
  - Concatenated features
  - MLP: 1024 → 512 → 256 → 128

Output: sigmoid(wide + deep)
```

**Rationale:**
- Balance of accuracy and serving latency
- Wide component captures frequent co-occurrences
- Deep component generalizes to unseen combinations
- Can enhance with DCN cross layers for better feature interactions

---

### Decision 5: Feature Store Architecture

| Criterion | Unified Store | Separate Online/Offline | Lambda Architecture |
|-----------|--------------|------------------------|---------------------|
| **Consistency** | Strong | Eventual | Eventual |
| **Latency** | Variable | Optimized per layer | Optimized |
| **Freshness** | Real-time | Tiered | Tiered |
| **Complexity** | Lower | Higher | Highest |
| **Cost** | Higher | Optimized | Optimized |

**Decision: Tiered Feature Store (Online + Offline + Real-time)**

**Architecture:**
```
Tier 1 - Real-time (sub-second):
  - Session features: last N interactions
  - Store: Redis (in-memory)
  - Update: Stream processor

Tier 2 - Online (hourly):
  - User aggregations: past 24h stats
  - Store: Redis cluster
  - Update: Micro-batch (hourly)

Tier 3 - Offline (daily):
  - Historical features: lifetime stats
  - Store: Data lake (Parquet)
  - Update: Daily batch
```

**Rationale:**
- Different freshness requirements for different features
- Cost optimization (hot/warm/cold storage tiers)
- Training uses offline store with point-in-time joins
- Serving uses online store with real-time overlay

---

## Component Interactions

```mermaid
flowchart LR
    subgraph External["External Dependencies"]
        Client["Clients"]
        Analytics["Analytics"]
    end

    subgraph Core["Core Services"]
        RecService["Recommendation<br/>Service"]
        Retrieval["Retrieval<br/>Service"]
        Ranking["Ranking<br/>Service"]
    end

    subgraph Features["Feature Services"]
        UserProfile["User Profile"]
        FeatureStore["Feature Store"]
        EmbedService["Embedding<br/>Service"]
    end

    subgraph Storage["Data Stores"]
        VectorDB["Vector DB"]
        OnlineStore["Online Store"]
        OfflineStore["Offline Store"]
    end

    subgraph ML["ML Infrastructure"]
        ModelServing["Model Serving"]
        Training["Training<br/>Pipeline"]
        Registry["Model Registry"]
    end

    Client -->|requests| RecService
    RecService -->|get candidates| Retrieval
    RecService -->|rank items| Ranking

    Retrieval -->|user embedding| EmbedService
    Retrieval -->|ANN search| VectorDB
    Retrieval -->|user context| UserProfile

    Ranking -->|fetch features| FeatureStore
    Ranking -->|model inference| ModelServing
    FeatureStore -->|read| OnlineStore
    FeatureStore -->|read| OfflineStore

    EmbedService -->|embeddings| VectorDB
    Training -->|models| Registry
    Registry -->|deploy| ModelServing
    OfflineStore -->|train data| Training

    RecService -->|events| Analytics

    classDef core fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef features fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef ml fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class RecService,Retrieval,Ranking core
    class UserProfile,FeatureStore,EmbedService features
    class VectorDB,OnlineStore,OfflineStore storage
    class ModelServing,Training,Registry ml
```

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Sync (serving), Async (training) | Low latency serving, throughput training |
| **Event-driven vs Request-response** | Both | Events for features, request for recommendations |
| **Push vs Pull** | Pull (recommendations), Push (features) | On-demand recs, proactive feature updates |
| **Stateless vs Stateful** | Stateless services, Stateful stores | Horizontal scaling, persistent state |
| **Read-heavy vs Write-heavy** | Read-heavy serving, Write-heavy training | Optimize serving path, batch training |
| **Real-time vs Batch** | Both | Real-time features, batch models |
| **Edge vs Origin** | Edge caching for popular, Origin for personalized | Latency optimization |

---

## Technology Mapping

| Component | Technology Options | Recommended | Rationale |
|-----------|-------------------|-------------|-----------|
| **Vector Database** | Pinecone, Milvus, Weaviate, FAISS | Milvus (self-hosted) or Pinecone (managed) | Scale, HNSW support, GPU acceleration |
| **Online Feature Store** | Redis Cluster, DynamoDB, ScyllaDB | Redis Cluster | Sub-ms latency, rich data structures |
| **Offline Feature Store** | Delta Lake, Iceberg, Hudi | Delta Lake | Time travel, schema evolution |
| **Model Serving** | Triton, TorchServe, TFServing | Triton Inference Server | GPU batching, multi-framework |
| **Event Streaming** | Kafka, Pulsar, Kinesis | Kafka | Throughput, ecosystem |
| **Stream Processing** | Flink, Spark Streaming, Kafka Streams | Flink | Low latency, stateful processing |
| **Orchestration** | Kubernetes, Ray, Nomad | Kubernetes + Ray | GPU scheduling, ML-native |
| **API Gateway** | Kong, Envoy, custom | Envoy | Performance, observability |
| **Experiment Platform** | LaunchDarkly, Statsig, custom | Statsig | ML-native, statistical rigor |

---

## Deployment Topology

```mermaid
flowchart TB
    subgraph Region1["Region: US-West"]
        subgraph K8s1["Kubernetes Cluster"]
            RecPod1["Recommendation<br/>Pods (50)"]
            RetrievalPod1["Retrieval<br/>Pods (100)"]
            RankPod1["Ranking<br/>Pods (GPU)"]
        end
        Redis1[("Redis<br/>Cluster")]
        Vector1[("Vector DB<br/>Shards 1-5")]
    end

    subgraph Region2["Region: US-East"]
        subgraph K8s2["Kubernetes Cluster"]
            RecPod2["Recommendation<br/>Pods (50)"]
            RetrievalPod2["Retrieval<br/>Pods (100)"]
            RankPod2["Ranking<br/>Pods (GPU)"]
        end
        Redis2[("Redis<br/>Cluster")]
        Vector2[("Vector DB<br/>Shards 1-5")]
    end

    subgraph Region3["Region: EU-West"]
        subgraph K8s3["Kubernetes Cluster"]
            RecPod3["Recommendation<br/>Pods (30)"]
            RetrievalPod3["Retrieval<br/>Pods (60)"]
            RankPod3["Ranking<br/>Pods (GPU)"]
        end
        Redis3[("Redis<br/>Cluster")]
        Vector3[("Vector DB<br/>Shards 1-5")]
    end

    subgraph Global["Global Services"]
        GLB["Global<br/>Load Balancer"]
        ModelReg["Model<br/>Registry"]
        DataLake[("Central<br/>Data Lake")]
        TrainCluster["Training<br/>Cluster"]
    end

    GLB --> K8s1
    GLB --> K8s2
    GLB --> K8s3

    ModelReg --> RankPod1
    ModelReg --> RankPod2
    ModelReg --> RankPod3

    TrainCluster --> ModelReg
    DataLake --> TrainCluster

    Vector1 -.->|sync| Vector2
    Vector2 -.->|sync| Vector3
    Redis1 -.->|sync| Redis2
    Redis2 -.->|sync| Redis3

    classDef region fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef global fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class K8s1,K8s2,K8s3 region
    class GLB,ModelReg,TrainCluster global
    class Redis1,Redis2,Redis3,Vector1,Vector2,Vector3,DataLake storage
```

---

## Integration Points

| Integration | Protocol | Direction | Purpose |
|-------------|----------|-----------|---------|
| Client SDKs | REST/gRPC | Inbound | Recommendation requests |
| Event Collection | Kafka | Inbound | User interactions |
| Analytics | Kafka | Outbound | Recommendation events |
| A/B Testing | gRPC | Bidirectional | Experiment allocation, metrics |
| Model Registry | gRPC | Bidirectional | Model deployment |
| Monitoring | Prometheus | Outbound | Metrics export |
| Content Ingestion | Kafka | Inbound | New item catalog updates |
| User Management | gRPC | Inbound | User profile updates |
