# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        Mobile["Mobile Apps"]
        Web["Web Apps"]
        TV["Smart TV"]
        Voice["Voice<br/>Assistants"]
        IoT["IoT Devices"]
    end

    subgraph EdgeLayer["Edge Layer (Global CDN)"]
        GeoDNS["GeoDNS"]
        subgraph EdgePoP["Edge PoP (200+ locations)"]
            EdgeLB["Edge Load<br/>Balancer"]
            EdgeCache["Personalized<br/>Cache"]
            EdgeScorer["ONNX<br/>Scorer"]
            EdgeBandit["Edge<br/>Bandit"]
            EdgeKV["Edge KV<br/>Store"]
        end
    end

    subgraph StreamingLayer["Streaming Layer"]
        EventStream["Event Stream<br/>(Kafka)"]
        subgraph StreamProc["Stream Processing Cluster"]
            EventRouter["Event<br/>Router"]
            ContextAgg["Context<br/>Aggregator"]
            EmbedStream["Streaming<br/>Embeddings"]
            EmotionProc["Emotion<br/>Processor"]
            BanditUpdate["Bandit<br/>Updater"]
        end
        StreamState["Stream State<br/>(RocksDB)"]
    end

    subgraph OriginLayer["Origin Layer (Multi-Region)"]
        GlobalLB["Global Load<br/>Balancer"]
        subgraph APILayer["API Gateway"]
            RateLimiter["Rate<br/>Limiter"]
            ABRouter["A/B<br/>Router"]
            AuthZ["AuthZ"]
        end
        subgraph Services["Core Services"]
            Orchestrator["Personalization<br/>Orchestrator"]
            ContextBuilder["Context<br/>Builder"]
            CandidateRetrieval["Candidate<br/>Retrieval"]
            DeepRanker["Deep<br/>Ranker"]
            BanditEngine["Contextual<br/>Bandit"]
            LLMReasoner["LLM<br/>Reasoner"]
            Explainer["Explanation<br/>Generator"]
        end
    end

    subgraph DataLayer["Data & ML Layer"]
        subgraph VectorInfra["Vector Infrastructure"]
            VectorDB[("Multi-Modal<br/>Vector DB")]
            EmbedIndex["Embedding<br/>Index (HNSW)"]
        end
        subgraph FeatureInfra["Feature Infrastructure"]
            OnlineStore[("Online Store<br/>(Redis)")]
            UserProfile[("User Profile<br/>Store")]
            BanditParams[("Bandit<br/>Parameters")]
        end
        subgraph MLInfra["ML Infrastructure"]
            ModelServing["Model<br/>Serving"]
            LLMGateway["LLM<br/>Gateway"]
            ModelRegistry["Model<br/>Registry"]
        end
    end

    subgraph BatchLayer["Batch Pipeline"]
        DataLake[("Data Lake")]
        subgraph BatchJobs["Batch Processing"]
            EmbedTraining["Embedding<br/>Training"]
            BanditTraining["Bandit Model<br/>Training"]
            OfflineEval["Offline<br/>Evaluation"]
        end
    end

    %% Client to Edge
    Clients --> GeoDNS
    GeoDNS --> EdgeLB
    EdgeLB --> EdgeCache
    EdgeCache -->|miss| EdgeScorer
    EdgeScorer --> EdgeBandit
    EdgeBandit --> EdgeKV

    %% Edge to Origin
    EdgeLayer -->|cache miss / complex| GlobalLB
    GlobalLB --> APILayer
    APILayer --> Orchestrator

    %% Orchestration
    Orchestrator --> ContextBuilder
    Orchestrator --> CandidateRetrieval
    Orchestrator --> DeepRanker
    Orchestrator --> BanditEngine
    Orchestrator -->|when needed| LLMReasoner
    Orchestrator --> Explainer

    %% Service to Data
    ContextBuilder --> OnlineStore
    ContextBuilder --> UserProfile
    CandidateRetrieval --> VectorDB
    DeepRanker --> ModelServing
    BanditEngine --> BanditParams
    LLMReasoner --> LLMGateway

    %% Event Streaming
    Clients --> EventStream
    EventStream --> EventRouter
    EventRouter --> ContextAgg
    EventRouter --> EmbedStream
    EventRouter --> EmotionProc
    EventRouter --> BanditUpdate
    ContextAgg --> StreamState
    EmbedStream --> VectorDB
    ContextAgg --> OnlineStore
    BanditUpdate --> BanditParams

    %% Batch Pipeline
    EventStream --> DataLake
    DataLake --> EmbedTraining
    DataLake --> BanditTraining
    EmbedTraining --> ModelRegistry
    BanditTraining --> ModelRegistry
    ModelRegistry --> ModelServing
    ModelRegistry --> EdgeScorer

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef streaming fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef origin fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef batch fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class Mobile,Web,TV,Voice,IoT client
    class GeoDNS,EdgeLB,EdgeCache,EdgeScorer,EdgeBandit,EdgeKV edge
    class EventStream,EventRouter,ContextAgg,EmbedStream,EmotionProc,BanditUpdate,StreamState streaming
    class GlobalLB,RateLimiter,ABRouter,AuthZ,Orchestrator,ContextBuilder,CandidateRetrieval,DeepRanker,BanditEngine,LLMReasoner,Explainer origin
    class VectorDB,EmbedIndex,OnlineStore,UserProfile,BanditParams,ModelServing,LLMGateway,ModelRegistry data
    class DataLake,EmbedTraining,BanditTraining,OfflineEval batch
```

---

## Data Flow: Real-Time Personalization Request

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Edge as Edge PoP
    participant Stream as Stream Processor
    participant Origin as Origin API
    participant Context as Context Builder
    participant Feature as Feature Store
    participant Retrieval as Candidate Retrieval
    participant Vector as Vector DB
    participant Ranker as Deep Ranker
    participant Bandit as Bandit Engine
    participant LLM as LLM Reasoner

    Client->>Edge: GET /personalize?user=123&context=home
    Edge->>Edge: Check personalized cache

    alt Cache Hit (80%)
        Edge->>Edge: Apply edge bandit (exploration check)
        Edge-->>Client: Return cached + explored items
    else Cache Miss
        Edge->>Origin: Forward request with edge context

        par Parallel Context Building
            Origin->>Context: Build user context
            Context->>Feature: Get real-time features
            Feature-->>Context: Session features, recent actions
            Context->>Feature: Get user embedding
            Feature-->>Context: Current user embedding
        end

        Context-->>Origin: Enriched context

        Origin->>Retrieval: Get candidates (user_emb, context)

        par Multi-Source Retrieval
            Retrieval->>Vector: Collaborative ANN (user_emb)
            Vector-->>Retrieval: 500 collab candidates
            Retrieval->>Vector: Content ANN (preference_emb)
            Vector-->>Retrieval: 300 content candidates
            Retrieval->>Vector: Trending in user segments
            Vector-->>Retrieval: 200 trending candidates
        end

        Retrieval->>Retrieval: Merge, dedupe, filter (1000 → 500)
        Retrieval-->>Origin: 500 candidates

        Origin->>Ranker: Rank candidates
        Ranker->>Feature: Batch fetch item features
        Feature-->>Ranker: Item features
        Ranker->>Ranker: Deep neural scoring
        Ranker-->>Origin: Scored candidates (top 100)

        Origin->>Bandit: Apply exploration
        Bandit->>Bandit: Thompson Sampling
        Bandit-->>Origin: Final ranking with exploration

        alt Complex Request (5%)
            Origin->>LLM: Generate explanation
            LLM-->>Origin: Personalized reasoning
        end

        Origin-->>Edge: Personalized response
        Edge->>Edge: Cache response (user-specific TTL)
        Edge-->>Client: Final response
    end

    Note over Client,LLM: Edge: <50ms | Origin: <100ms | LLM path: <200ms
```

---

## Data Flow: Streaming Embedding Update

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Event as Event Stream
    participant Router as Event Router
    participant Context as Context Aggregator
    participant Embed as Embedding Streamer
    participant Emotion as Emotion Processor
    participant Bandit as Bandit Updater
    participant Feature as Feature Store
    participant Vector as Vector DB
    participant Params as Bandit Params

    Client->>Event: User interaction (click, view, purchase)
    Event->>Router: Route event by type

    par Parallel Processing
        Router->>Context: Update session context
        Context->>Context: Aggregate window (5min, 1hr, 24hr)
        Context->>Feature: Write updated features

        Router->>Embed: Trigger embedding update
        Embed->>Embed: Compute incremental embedding
        Embed->>Vector: Upsert user embedding

        Router->>Emotion: Extract emotional signals
        Emotion->>Emotion: Sentiment analysis
        Emotion->>Feature: Write emotion features

        Router->>Bandit: Update bandit posterior
        Bandit->>Bandit: Bayesian update (alpha, beta)
        Bandit->>Params: Write updated parameters
    end

    Note over Client,Params: Latency target: <60 seconds end-to-end
```

---

## Data Flow: Multi-Modal Embedding Pipeline

```mermaid
flowchart LR
    subgraph Input["Content Input"]
        Text["Text<br/>(Title, Description)"]
        Image["Image<br/>(Thumbnail, Photos)"]
        Audio["Audio<br/>(Music, Podcast)"]
        Video["Video<br/>(Clips, Frames)"]
    end

    subgraph Encoders["Modality Encoders"]
        TextEnc["Text Encoder<br/>(Transformer)"]
        ImageEnc["Image Encoder<br/>(ViT/CLIP)"]
        AudioEnc["Audio Encoder<br/>(Wav2Vec)"]
        VideoEnc["Video Encoder<br/>(VideoMAE)"]
    end

    subgraph Fusion["Fusion Layer"]
        Proj["Projection<br/>Layers"]
        Attn["Cross-Modal<br/>Attention"]
        Pool["Weighted<br/>Pooling"]
    end

    subgraph Output["Unified Embedding"]
        Unified["512/1024-dim<br/>Multi-Modal Vector"]
    end

    Text --> TextEnc
    Image --> ImageEnc
    Audio --> AudioEnc
    Video --> VideoEnc

    TextEnc --> Proj
    ImageEnc --> Proj
    AudioEnc --> Proj
    VideoEnc --> Proj

    Proj --> Attn
    Attn --> Pool
    Pool --> Unified

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef encoder fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef fusion fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef output fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class Text,Image,Audio,Video input
    class TextEnc,ImageEnc,AudioEnc,VideoEnc encoder
    class Proj,Attn,Pool fusion
    class Unified output
```

---

## Key Architectural Decisions

### Decision 1: Three-Tier vs Two-Tier Architecture

| Criterion | Two-Tier (Edge + Origin) | Three-Tier (Edge + Streaming + Origin) |
|-----------|--------------------------|----------------------------------------|
| **Latency** | 50-100ms | <50ms at edge |
| **Freshness** | Minutes to hours | Sub-minute |
| **Complexity** | Lower | Higher |
| **Cost** | Lower | Higher |
| **Real-time Adaptation** | Limited | Full session adaptation |

**Decision: Three-Tier Architecture**

**Rationale:**
- Sub-minute embedding freshness requires dedicated streaming layer
- Edge scoring with streaming context enables <50ms latency
- Separation of concerns: edge (delivery), streaming (freshness), origin (complexity)
- Allows independent scaling of each tier

---

### Decision 2: Streaming Embeddings vs Batch Embeddings

| Criterion | Batch (Daily) | Streaming (Real-time) |
|-----------|---------------|----------------------|
| **Freshness** | 24 hours | <60 seconds |
| **Cost** | Lower (scheduled) | Higher (always-on) |
| **Complexity** | Simple | Complex (state management) |
| **User Experience** | Stale within session | Adaptive within session |
| **Cold Start** | Poor | Good (fast adaptation) |

**Decision: Streaming with Batch Fallback**

**Architecture:**
```
Streaming Path (primary):
  Event → Stream Processor → Incremental Embedding → Vector DB
  Latency: <60 seconds
  Used for: Active users with recent interactions

Batch Path (fallback):
  Data Lake → Embedding Training → Full Recomputation → Vector DB
  Latency: Daily
  Used for: Inactive users, new model deployment
```

**Rationale:**
- User intent changes within a session (Netflix research)
- Streaming embeddings capture "budget travel" → "business class" pivots
- Batch provides fallback and enables full model retraining

---

### Decision 3: LLM Integration Strategy

| Criterion | LLM as Ranker | LLM as Reasoner (RAG) | No LLM |
|-----------|---------------|----------------------|--------|
| **Latency** | 200-500ms | 100-200ms (cached) | <100ms |
| **Cost** | Very High | Medium | Low |
| **Accuracy** | Highest | High | Good |
| **Explainability** | Excellent | Excellent | Limited |
| **Scale** | Limited | Moderate | Unlimited |

**Decision: LLM as Reasoner with Selective Invocation**

**Invocation Criteria:**
```
Invoke LLM when:
  1. Explainability required (user requested "why this?")
  2. Cold start user (insufficient history for embeddings)
  3. Low confidence from bandit (uncertainty > threshold)
  4. High-value decision (purchase consideration)
  5. Complex cross-domain personalization

Do NOT invoke when:
  1. Cache hit with high confidence
  2. Returning user with strong signals
  3. Latency budget exhausted
  4. Rate limit reached
```

**Rationale:**
- LLM latency (100-200ms) exceeds edge budget (<50ms)
- Selective invocation keeps cost manageable (~5-10% of requests)
- RAG approach leverages user context without fine-tuning

---

### Decision 4: Contextual Bandit Algorithm

| Criterion | Epsilon-Greedy | UCB | Thompson Sampling | LinUCB |
|-----------|----------------|-----|-------------------|--------|
| **Exploration** | Random | Optimistic | Probability matching | Confidence bound |
| **Regret** | Linear | Logarithmic | Logarithmic | Logarithmic |
| **Implementation** | Simple | Medium | Medium | Complex |
| **Contextual** | No | No | Yes (with features) | Yes (native) |
| **Interpretability** | Low | Medium | Medium | High |

**Decision: Thompson Sampling with Contextual Features**

**Algorithm:**
```
For each request:
  1. Observe context x (user features, session state)
  2. For each candidate item i:
     a. Sample θ_i ~ Beta(α_i, β_i)  // Posterior
     b. Predict reward: r_i = f(x, θ_i)  // Contextual model
  3. Select items with highest sampled rewards
  4. Observe actual reward (click, engagement)
  5. Update posteriors: α_i += reward, β_i += (1 - reward)
```

**Rationale:**
- Thompson Sampling naturally balances exploration/exploitation
- Probability matching is intuitive and robust
- Contextual extension handles diverse user segments
- Recent research (NeurIPS 2025) validates Feel-Good TS improvements

---

### Decision 5: Edge Personalization Strategy

| Criterion | No Edge Personalization | Edge Cache Only | Edge Scoring |
|-----------|------------------------|-----------------|--------------|
| **Latency** | 70-100ms | 20-40ms (hit) | 30-50ms |
| **Cache Hit Rate** | N/A | 70-80% | 80-90% |
| **Personalization Quality** | Highest | Stale | Good |
| **Edge Compute Cost** | None | Low | Medium |

**Decision: Edge Scoring with Personalized Cache**

**Architecture:**
```
Edge Components:
  1. Personalized Cache
     - Key: hash(user_id, context_type, segment)
     - TTL: 5-15 minutes (dynamic based on activity)
     - Size: ~100GB per PoP

  2. ONNX Scorer
     - Lightweight ranking model (~10MB)
     - Runs on edge workers
     - Latency: <15ms

  3. Edge Bandit
     - Local exploration with global sync
     - Thompson Sampling with shared posteriors
     - Exploration rate: 10-15%

  4. Edge KV Store
     - User context (last 10 interactions)
     - Session state
     - Synced from streaming layer every 30s
```

**Rationale:**
- 80%+ requests served from edge (<50ms)
- ONNX enables ML on edge without GPU
- Personalized cache keys prevent mixing user results
- Edge bandit maintains exploration without origin round-trip

---

## Component Interactions

```mermaid
flowchart TB
    subgraph External["External Systems"]
        Clients["Clients"]
        Analytics["Analytics"]
        ML["ML Training"]
    end

    subgraph EdgeServices["Edge Services"]
        EdgeCache["Edge Cache"]
        EdgeScore["Edge Scorer"]
        EdgeBandit["Edge Bandit"]
    end

    subgraph StreamServices["Streaming Services"]
        EventProc["Event Processor"]
        EmbedStream["Embed Streamer"]
        ContextAgg["Context Aggregator"]
    end

    subgraph OriginServices["Origin Services"]
        Orchestrator["Orchestrator"]
        Retrieval["Retrieval"]
        Ranker["Ranker"]
        Bandit["Bandit Engine"]
        LLM["LLM Reasoner"]
    end

    subgraph DataStores["Data Stores"]
        VectorDB["Vector DB"]
        FeatureStore["Feature Store"]
        UserStore["User Store"]
        BanditStore["Bandit Store"]
    end

    Clients -->|requests| EdgeCache
    EdgeCache -->|miss| EdgeScore
    EdgeScore -->|complex| Orchestrator
    EdgeBandit -->|exploration| EdgeScore

    Clients -->|events| EventProc
    EventProc --> EmbedStream
    EventProc --> ContextAgg
    EmbedStream --> VectorDB
    ContextAgg --> FeatureStore

    Orchestrator --> Retrieval
    Orchestrator --> Ranker
    Orchestrator --> Bandit
    Orchestrator -->|conditional| LLM

    Retrieval --> VectorDB
    Ranker --> FeatureStore
    Bandit --> BanditStore
    LLM --> FeatureStore

    Orchestrator --> Analytics
    VectorDB --> ML
    FeatureStore --> ML

    classDef external fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef stream fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef origin fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class Clients,Analytics,ML external
    class EdgeCache,EdgeScore,EdgeBandit edge
    class EventProc,EmbedStream,ContextAgg stream
    class Orchestrator,Retrieval,Ranker,Bandit,LLM origin
    class VectorDB,FeatureStore,UserStore,BanditStore data
```

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Sync (serving), Async (streaming, training) | Low latency serving, high throughput processing |
| **Event-driven vs Request-response** | Both | Events for updates, requests for personalization |
| **Push vs Pull** | Push (embeddings to edge), Pull (features on-demand) | Freshness at edge, flexibility at origin |
| **Stateless vs Stateful** | Stateless services, Stateful streaming | Scale services, maintain context |
| **Read-heavy vs Write-heavy** | Read-heavy serving, Write-heavy streaming | Optimize for QPS, handle event volume |
| **Real-time vs Batch** | Real-time primary, Batch fallback | Freshness priority with reliability |
| **Edge vs Origin** | Edge-first with origin fallback | Latency optimization |

---

## Technology Mapping

| Component | Options | Recommended | Rationale |
|-----------|---------|-------------|-----------|
| **Edge Platform** | Cloudflare Workers, Fastly, Akamai | Cloudflare Workers | V8 isolates, global KV, ML support |
| **Event Streaming** | Kafka, Pulsar, Kinesis | Kafka | Throughput, ecosystem, exactly-once |
| **Stream Processing** | Flink, Kafka Streams, Spark | Flink | Low latency, state management |
| **Vector Database** | Pinecone, Weaviate, Qdrant, Milvus | Qdrant or Weaviate | Multi-modal, real-time updates |
| **Feature Store** | Redis, Feast+Redis, Tecton | Redis Cluster | Sub-ms latency, streams integration |
| **Model Serving** | Triton, TorchServe, KServe | Triton | GPU batching, ONNX support |
| **LLM Gateway** | vLLM, TensorRT-LLM, Portkey | vLLM + Portkey | Inference speed + routing |
| **Bandit Library** | Vowpal Wabbit, custom | Custom (Thompson) | Full control, contextual |
| **Orchestration** | Kubernetes, Ray | Kubernetes | Standard, GPU scheduling |

---

## Deployment Topology

```mermaid
flowchart TB
    subgraph Global["Global Layer"]
        GeoDNS["GeoDNS"]
        GlobalLB["Global Load<br/>Balancer"]
    end

    subgraph USWest["Region: US-West"]
        subgraph EdgeUSW["Edge PoPs (20)"]
            EdgeW1["PoP: SFO"]
            EdgeW2["PoP: LAX"]
            EdgeW3["PoP: SEA"]
        end
        subgraph OriginUSW["Origin Cluster"]
            APIGWW["API Gateway"]
            ServicesW["Services"]
            GPUW["GPU Nodes"]
        end
        subgraph DataUSW["Data Stores"]
            VectorW[("Vector DB")]
            RedisW[("Redis")]
        end
        subgraph StreamUSW["Streaming"]
            KafkaW["Kafka"]
            FlinkW["Flink"]
        end
    end

    subgraph USEast["Region: US-East"]
        subgraph EdgeUSE["Edge PoPs (15)"]
            EdgeE1["PoP: NYC"]
            EdgeE2["PoP: DC"]
        end
        subgraph OriginUSE["Origin Cluster"]
            APIGWE["API Gateway"]
            ServicesE["Services"]
            GPUE["GPU Nodes"]
        end
        subgraph DataUSE["Data Stores"]
            VectorE[("Vector DB")]
            RedisE[("Redis")]
        end
        subgraph StreamUSE["Streaming"]
            KafkaE["Kafka"]
            FlinkE["Flink"]
        end
    end

    subgraph EU["Region: EU-West"]
        subgraph EdgeEU["Edge PoPs (15)"]
            EdgeEU1["PoP: FRA"]
            EdgeEU2["PoP: LON"]
        end
        subgraph OriginEU["Origin Cluster"]
            APIGWEU["API Gateway"]
            ServicesEU["Services"]
            GPUEU["GPU Nodes"]
        end
        subgraph DataEU["Data Stores"]
            VectorEU[("Vector DB")]
            RedisEU[("Redis")]
        end
    end

    subgraph SharedInfra["Shared Infrastructure"]
        ModelReg["Model Registry"]
        DataLake[("Data Lake")]
        TrainCluster["Training<br/>Cluster"]
    end

    GeoDNS --> EdgeUSW
    GeoDNS --> EdgeUSE
    GeoDNS --> EdgeEU

    EdgeUSW -->|miss| GlobalLB
    EdgeUSE -->|miss| GlobalLB
    EdgeEU -->|miss| GlobalLB

    GlobalLB --> OriginUSW
    GlobalLB --> OriginUSE
    GlobalLB --> OriginEU

    VectorW -.->|sync| VectorE
    VectorE -.->|sync| VectorEU
    RedisW -.->|sync| RedisE
    RedisE -.->|sync| RedisEU

    TrainCluster --> ModelReg
    ModelReg --> ServicesW
    ModelReg --> ServicesE
    ModelReg --> ServicesEU

    DataLake --> TrainCluster

    classDef global fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef origin fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef shared fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class GeoDNS,GlobalLB global
    class EdgeW1,EdgeW2,EdgeW3,EdgeE1,EdgeE2,EdgeEU1,EdgeEU2 edge
    class APIGWW,ServicesW,GPUW,APIGWE,ServicesE,GPUE,APIGWEU,ServicesEU,GPUEU origin
    class VectorW,RedisW,VectorE,RedisE,VectorEU,RedisEU,KafkaW,FlinkW,KafkaE,FlinkE data
    class ModelReg,DataLake,TrainCluster shared
```

---

## Integration Points

| Integration | Protocol | Direction | Purpose |
|-------------|----------|-----------|---------|
| Client SDKs | REST/gRPC | Inbound | Personalization requests |
| Event Collection | Kafka | Inbound | User interactions |
| Analytics Export | Kafka | Outbound | Personalization events |
| A/B Testing | gRPC | Bidirectional | Experiment allocation |
| Model Registry | gRPC | Pull | Model deployment |
| LLM Gateway | REST/gRPC | Outbound | LLM inference |
| Content Catalog | Kafka | Inbound | New item embeddings |
| User Management | gRPC | Bidirectional | Profile sync |
| Edge Sync | WebSocket | Push | Context and cache updates |
