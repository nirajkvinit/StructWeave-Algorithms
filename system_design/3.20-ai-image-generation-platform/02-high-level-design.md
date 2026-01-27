# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer"]
        WebApp["Web Application"]
        MobileApp["Mobile App"]
        APIClient["API Clients"]
        DiscordBot["Discord Bot"]
    end

    subgraph APIGateway["API Gateway"]
        direction TB
        LoadBalancer["Load Balancer"]
        AuthService["Authentication<br/>& Authorization"]
        RateLimiter["Rate Limiter<br/>(Per Tier)"]
        RequestRouter["Request Router"]
    end

    subgraph PromptProcessing["Prompt Processing Pipeline"]
        direction TB
        PromptParser["Prompt Parser<br/>(Weights, Negatives)"]
        Translator["Multi-Language<br/>Translator"]
        SafetyPreCheck["Pre-Generation<br/>Safety Check"]
        TextEncoders["Text Encoders"]
        subgraph Encoders["Encoder Pool"]
            CLIP["CLIP ViT-L/14"]
            OpenCLIP["OpenCLIP ViT-G"]
            T5XXL["T5-XXL"]
        end
    end

    subgraph QueueManagement["Queue Management"]
        direction TB
        subgraph Queues["Priority Queues"]
            TurboQueue["Turbo Queue<br/>(P0)"]
            FastQueue["Fast Queue<br/>(P1)"]
            RelaxQueue["Relax Queue<br/>(P2)"]
        end
        FairScheduler["Fair Scheduler<br/>(Weighted + Anti-Starvation)"]
        QueueMetrics["Queue Metrics<br/>& Position Tracker"]
    end

    subgraph GPUOrchestration["GPU Orchestration"]
        direction TB
        WorkerManager["Worker Manager"]
        subgraph WarmPool["Warm Model Pool"]
            SDXLWorkers["SDXL Workers<br/>(20 GPUs)"]
            SD3Workers["SD3 Workers<br/>(10 GPUs)"]
            FluxWorkers["Flux Workers<br/>(10 GPUs)"]
        end
        subgraph ColdPool["Cold Pool"]
            ReserveGPUs["Reserve GPUs<br/>(Spot Instances)"]
        end
        ModelCache["Model Cache<br/>(LoRA + ControlNet)"]
        VRAMManager["VRAM Manager<br/>(Fragmentation Control)"]
    end

    subgraph DiffusionEngine["Diffusion Engine"]
        direction TB
        ModelComposer["Model Composer<br/>(Base + LoRA + CN)"]
        LatentInit["Latent Initializer"]
        DenoisingLoop["Denoising Loop"]
        subgraph Samplers["Sampler Options"]
            DDIM["DDIM"]
            DPMpp["DPM++ 2M"]
            EulerA["Euler A"]
            LCM["LCM"]
        end
        CFGProcessor["CFG Processor"]
        VAEDecoder["VAE Decoder"]
    end

    subgraph PostProcessing["Post-Processing"]
        direction TB
        SafetyPostCheck["Post-Generation<br/>Safety Check"]
        subgraph SafetyClassifiers["Safety Classifiers"]
            NSFWClassifier["NSFW Classifier"]
            BiasDetector["Bias Detector"]
            CSAMScanner["CSAM Scanner"]
        end
        Watermarker["Watermark Embedder<br/>(Stable Signature)"]
        FormatOptimizer["Format Optimizer<br/>(WebP/AVIF)"]
        MetadataEmbedder["Metadata Embedder<br/>(C2PA)"]
    end

    subgraph Delivery["Delivery Layer"]
        direction TB
        ImageStorage[("Image Storage<br/>(Object Storage)")]
        CDN["CDN<br/>(Global Edge)"]
        ThumbnailGen["Thumbnail<br/>Generator"]
        URLSigner["URL Signer<br/>(Presigned URLs)"]
    end

    subgraph Supporting["Supporting Services"]
        direction TB
        UsageTracker["Usage Tracker<br/>& Billing"]
        NotificationSvc["Notification<br/>Service"]
        AuditLogger["Audit Logger"]
        ModelRegistry["Model Registry"]
    end

    ClientLayer --> APIGateway
    APIGateway --> PromptProcessing
    PromptProcessing --> QueueManagement
    QueueManagement --> GPUOrchestration
    GPUOrchestration --> DiffusionEngine
    DiffusionEngine --> PostProcessing
    PostProcessing --> Delivery

    GPUOrchestration <--> ModelRegistry
    QueueManagement --> UsageTracker
    PostProcessing --> AuditLogger
    Delivery --> NotificationSvc

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef prompt fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef queue fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef gpu fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef diffusion fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef safety fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef storage fill:#eceff1,stroke:#546e7a,stroke-width:2px

    class WebApp,MobileApp,APIClient,DiscordBot client
    class LoadBalancer,AuthService,RateLimiter,RequestRouter gateway
    class PromptParser,Translator,TextEncoders,CLIP,OpenCLIP,T5XXL prompt
    class TurboQueue,FastQueue,RelaxQueue,FairScheduler,QueueMetrics queue
    class WorkerManager,SDXLWorkers,SD3Workers,FluxWorkers,ReserveGPUs,ModelCache,VRAMManager gpu
    class ModelComposer,LatentInit,DenoisingLoop,DDIM,DPMpp,EulerA,LCM,CFGProcessor,VAEDecoder diffusion
    class SafetyPreCheck,SafetyPostCheck,NSFWClassifier,BiasDetector,CSAMScanner,Watermarker safety
    class ImageStorage,CDN,ThumbnailGen,URLSigner,FormatOptimizer,MetadataEmbedder storage
```

---

## Request Flow

### Generation Request Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Gateway as API Gateway
    participant Prompt as Prompt Pipeline
    participant Queue as Queue Manager
    participant GPU as GPU Orchestrator
    participant Diffusion as Diffusion Engine
    participant Safety as Safety Pipeline
    participant CDN as CDN/Storage

    Client->>Gateway: POST /v1/generations
    Gateway->>Gateway: Authenticate & Rate Limit
    Gateway->>Prompt: Process Prompt

    Prompt->>Prompt: Parse weights & negatives
    Prompt->>Prompt: Pre-generation safety check

    alt Prompt Blocked
        Prompt-->>Client: 400 Blocked (safety reason)
    end

    Prompt->>Prompt: Encode with CLIP + T5
    Prompt->>Queue: Enqueue with priority
    Queue-->>Client: 202 Accepted {request_id, position}

    Note over Queue,GPU: Async Processing Begins

    Queue->>Queue: Fair scheduling
    Queue->>GPU: Dispatch to worker

    GPU->>GPU: Find warm worker or load model
    GPU->>Diffusion: Execute generation

    Diffusion->>Diffusion: Initialize latent (seed)
    loop Denoising Steps (20-50x)
        Diffusion->>Diffusion: UNet forward pass
        Diffusion->>Diffusion: Apply CFG
        Diffusion->>Diffusion: Scheduler step
    end
    Diffusion->>Diffusion: VAE decode to pixels

    Diffusion->>Safety: Post-generation check
    Safety->>Safety: NSFW + Bias + CSAM scan

    alt Image Blocked
        Safety->>Queue: Mark as blocked
        Queue-->>Client: Webhook: blocked
    else Image Allowed
        Safety->>Safety: Embed watermark
        Safety->>CDN: Upload image
        CDN->>CDN: Generate thumbnails
        CDN->>CDN: Optimize format (WebP)
        CDN-->>Queue: Upload complete
        Queue-->>Client: Webhook: completed {image_url}
    end

    Client->>Gateway: GET /v1/generations/{id}
    Gateway-->>Client: {status, images[]}
```

---

## Key Architectural Decisions

### 1. Warm Pool vs Cold Start Strategy

**Decision:** Tiered warm pool with predictive loading

| Tier | Models | GPUs | Strategy |
|------|--------|------|----------|
| **Always Hot** | SDXL base + top 5 LoRAs | 20 | Never evicted |
| **Frequently Used** | SD3, Flux Schnell | 10 each | LRU with high priority |
| **On-Demand** | Rare LoRAs, specialized | Pool | Load on first request |

**Trade-offs:**

| Approach | Pros | Cons |
|----------|------|------|
| **Large warm pool** | Instant latency, no cold starts | High idle GPU cost |
| **Small warm pool** | Lower cost | Cold start delays (15-30s) |
| **Predictive loading** | Balanced | Complexity, misprediction waste |

**Recommendation:** Start with warm pool covering 80% of traffic, expand based on cache hit rate.

### 2. Queue Priority System

**Decision:** Weighted fair scheduling with starvation prevention

```
Queue Assignment:
├── Turbo Queue (Weight: 10)
│   └── Premium users, accelerated models
├── Fast Queue (Weight: 5)
│   └── Paid users, standard processing
└── Relax Queue (Weight: 1)
    └── Free tier, background processing
```

**Fairness Mechanisms:**
1. **Weighted random selection** - Higher weight = higher selection probability
2. **Starvation prevention** - Promote after max wait (5 min for Relax)
3. **Reserved capacity** - 10% GPU guaranteed for each tier
4. **Dynamic adjustment** - Increase Relax weight during low traffic

### 3. Model Composition Strategy

**Decision:** Base model always loaded, adapters hot-swapped

```
Composition Order:
1. Base Model (SDXL/SD3/Flux) - Always in VRAM
2. LoRA Adapters - Merged at request time (0.5-2s)
3. ControlNet - Lazy loaded per request (2-4s)
4. VAE - Always loaded (shared across models)
```

**Memory Budget (A100 80GB):**
```
Base model (SDXL):     10 GB
LoRA workspace:         2 GB (for merging)
ControlNet reserve:     4 GB
Latent workspace:       8 GB (batch of 4)
Safety models:          4 GB
System overhead:        8 GB
────────────────────────────
Available per worker:  ~44 GB (safe margin)
```

### 4. Safety Pipeline Placement

**Decision:** Dual-layer safety (pre + post generation)

```mermaid
flowchart LR
    subgraph PreGen["Pre-Generation (CPU)"]
        Blocklist["Blocklist Check"]
        PromptClassifier["Prompt Classifier"]
        EntityDetect["Entity Detection"]
    end

    subgraph Generation["Generation (GPU)"]
        Diffusion["Diffusion Process"]
    end

    subgraph PostGen["Post-Generation (GPU/CPU)"]
        NSFW["NSFW Classifier"]
        Bias["Bias Detection"]
        CSAM["CSAM Scanner"]
        Watermark["Watermarking"]
    end

    PreGen -->|Pass| Generation
    PreGen -->|Block| Reject1["Reject Early<br/>(Save GPU)"]
    Generation --> PostGen
    PostGen -->|Pass| Deliver["Deliver"]
    PostGen -->|Block| Reject2["Reject<br/>(Log for review)"]
```

**Rationale:**
- Pre-gen: Block obvious violations early, save GPU cost
- Post-gen: Catch visual issues not detectable from prompt
- Critical: CSAM scanning must be post-gen (visual content)

### 5. Image Delivery Architecture

**Decision:** Async upload with CDN acceleration

```
Upload Flow:
1. Safety check complete
2. Async upload to object storage (S3/GCS)
3. Generate signed URL (1-hour expiry)
4. CDN prefetch for popular content
5. Progressive JPEG/WebP for perceived performance

Storage Tiers:
- Hot (30 days): Recent generations, fast access
- Warm (1 year): User gallery, standard access
- Cold (archive): Compliance, rare access
```

---

## Component Interactions

### Prompt Processing Pipeline

```mermaid
flowchart TB
    subgraph Input["Input Processing"]
        RawPrompt["Raw Prompt"]
        WeightParser["Weight Parser<br/>((word:1.5))"]
        NegativeExtract["Negative<br/>Extractor"]
    end

    subgraph Safety["Safety Check"]
        Blocklist["Blocklist<br/>Matching"]
        PromptGuard["PromptGuard<br/>Classifier"]
        EntityCheck["Entity<br/>Recognition"]
    end

    subgraph Encoding["Text Encoding"]
        Tokenize["Tokenization"]
        CLIPEncode["CLIP Encoding<br/>(77 tokens)"]
        T5Encode["T5 Encoding<br/>(512 tokens)"]
        Pooling["Pooled<br/>Embeddings"]
    end

    subgraph Output["Output"]
        PromptEmbeds["Prompt<br/>Embeddings"]
        NegativeEmbeds["Negative<br/>Embeddings"]
        PooledEmbeds["Pooled<br/>Embeddings"]
    end

    RawPrompt --> WeightParser --> NegativeExtract
    NegativeExtract --> Blocklist --> PromptGuard --> EntityCheck
    EntityCheck -->|Pass| Tokenize
    EntityCheck -->|Block| Reject["Reject"]
    Tokenize --> CLIPEncode & T5Encode
    CLIPEncode --> PromptEmbeds
    T5Encode --> PromptEmbeds
    CLIPEncode --> Pooling --> PooledEmbeds
    NegativeExtract --> NegativeEmbeds

    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef safety fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef output fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class WeightParser,NegativeExtract,Tokenize,CLIPEncode,T5Encode,Pooling process
    class Blocklist,PromptGuard,EntityCheck safety
    class PromptEmbeds,NegativeEmbeds,PooledEmbeds output
```

### GPU Worker State Machine

```mermaid
stateDiagram-v2
    [*] --> Initializing: Worker started
    Initializing --> LoadingModel: Load base model
    LoadingModel --> Idle: Model ready

    Idle --> ProcessingRequest: Request assigned
    ProcessingRequest --> LoadingAdapters: LoRA/CN needed
    LoadingAdapters --> Generating: Adapters loaded
    ProcessingRequest --> Generating: No adapters needed

    Generating --> PostProcessing: Generation complete
    PostProcessing --> Idle: Request complete
    PostProcessing --> Idle: Safety blocked

    Idle --> UnloadingModel: Model eviction (LRU)
    UnloadingModel --> LoadingModel: Load different model

    Generating --> Error: Generation failed
    LoadingModel --> Error: Load failed
    Error --> Recovering: Retry logic
    Recovering --> LoadingModel: Recovered
    Recovering --> Unhealthy: Max retries

    Unhealthy --> [*]: Worker terminated
```

---

## Technology Stack Recommendations

### Core Infrastructure

| Layer | Recommended | Alternatives | Rationale |
|-------|-------------|--------------|-----------|
| **Diffusion Framework** | Diffusers | ComfyUI, A1111 | Production-ready API, PyTorch native |
| **GPU Serving** | Ray Serve | Triton, custom | Flexible scaling, Python native |
| **Model Optimization** | torch.compile | TensorRT | Balance of speed and compatibility |
| **Quantization** | bitsandbytes | GPTQ, AWQ | Dynamic quantization support |

### Queue and State

| Layer | Recommended | Alternatives | Rationale |
|-------|-------------|--------------|-----------|
| **Job Queue** | Redis + Kafka | SQS, RabbitMQ | Speed (Redis) + durability (Kafka) |
| **Worker State** | Redis | etcd, DynamoDB | Fast state updates |
| **Model Registry** | MLflow | Weights & Biases | Open source, flexible |

### Storage and Delivery

| Layer | Recommended | Alternatives | Rationale |
|-------|-------------|--------------|-----------|
| **Object Storage** | S3/GCS | MinIO | Scalable, cost-effective |
| **CDN** | CloudFlare | CloudFront, Fastly | Image optimization built-in |
| **Database** | PostgreSQL | CockroachDB | Reliability, JSON support |
| **Cache** | Redis | Memcached | Rich data structures |

### Safety and Compliance

| Layer | Recommended | Alternatives | Rationale |
|-------|-------------|--------------|-----------|
| **NSFW Detection** | Custom ensemble | Hive, AWS Rekognition | Control over thresholds |
| **Watermarking** | Stable Signature | C2PA | Industry standard emerging |
| **Audit Logging** | ELK Stack | Datadog, Splunk | Cost-effective at scale |

---

## Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---------|----------|---------------|
| **Sync vs Async** | Async with webhooks | Long generation time (5-60s) |
| **Push vs Pull** | Pull (polling/webhook) | Client-initiated status checks |
| **Stateless vs Stateful** | Stateful workers | GPU models in memory |
| **Read vs Write Heavy** | Write heavy | Each request generates new data |
| **Real-time vs Batch** | Real-time with batching | User expects timely response |
| **Edge vs Origin** | Origin (GPU) + Edge (CDN) | GPU centralized, images distributed |

---

## Data Flow Summary

```
Request Journey:
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  1. INGEST         2. ENCODE        3. QUEUE         4. DISPATCH   │
│  ─────────         ──────────       ─────────        ──────────    │
│  Auth + Rate       CLIP + T5        Priority         Find warm     │
│  limit             encoding         assignment       GPU worker    │
│  (~10ms)           (~100ms)         (~1ms)           (~10ms)       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  5. COMPOSE        6. GENERATE      7. SAFETY        8. DELIVER    │
│  ───────────       ───────────      ──────────       ──────────    │
│  Load LoRA +       Denoising        NSFW + CSAM      CDN upload    │
│  ControlNet        loop             + Watermark      + notify      │
│  (0-4s)            (6-30s)          (~200ms)         (~500ms)      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Total E2E (Fast tier): 8-35 seconds
- Queue wait: 0-10s
- Processing: 8-25s
```
