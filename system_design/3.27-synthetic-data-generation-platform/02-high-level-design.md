# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        SDK["Python SDK"]
        CLI["CLI Tool"]
        API["REST API"]
        UI["Web Dashboard"]
    end

    subgraph Gateway["API Gateway Layer"]
        LB["Load Balancer"]
        AUTH["Auth Service<br/>(OAuth2/OIDC)"]
        RL["Rate Limiter"]
        ROUTER["Request Router"]
    end

    subgraph Orchestration["Orchestration Layer"]
        TRAIN_SCHED["Training Scheduler"]
        GEN_QUEUE["Generation Queue"]
        QUAL_PIPE["Quality Pipeline"]
        WORKFLOW["Workflow Engine"]
    end

    subgraph Processing["Processing Layer"]
        subgraph Ingestion["Data Ingestion"]
            CONN["Connectors<br/>(DB/File/Cloud)"]
            SCHEMA["Schema Analyzer"]
            PII["PII Detector"]
            PROFILE["Data Profiler"]
        end

        subgraph Preprocessing["Preprocessing"]
            ENCODE["Data Encoder"]
            NORM["Normalizer"]
            CONSTRAINT["Constraint Extractor"]
        end

        subgraph ModelZoo["Model Zoo"]
            CTGAN["CTGAN"]
            TVAE["TVAE"]
            ACTGAN["ACTGAN"]
            DIFFUSION["Diffusion<br/>Models"]
            TIMEGAN["TimeGAN"]
            TRANSFORMER["Transformer<br/>(TabularARGN)"]
        end

        subgraph Generation["Generation Engine"]
            BATCH_GEN["Batch Generator"]
            STREAM_GEN["Stream Generator"]
            COND_GEN["Conditional Generator"]
            MULTI_GEN["Multi-Table Generator"]
        end
    end

    subgraph Privacy["Privacy Layer"]
        DPSGD["DP-SGD Engine"]
        ACCOUNTANT["Privacy Accountant"]
        RISK["Risk Assessor"]
        PROTECT["Protection Mechanisms"]
    end

    subgraph Quality["Quality Service"]
        FIDELITY["Fidelity Metrics"]
        UTILITY["Utility Benchmarks"]
        PRIVACY_M["Privacy Metrics"]
        GATE["Quality Gates"]
    end

    subgraph Storage["Storage Layer"]
        PG[("PostgreSQL<br/>Metadata")]
        S3[("Object Storage<br/>Data/Models")]
        REDIS[("Redis<br/>Cache")]
        TS[("Time-Series DB<br/>Metrics")]
    end

    subgraph External["External Services"]
        GPU["GPU Cluster<br/>(Kubernetes)"]
        NOTIFY["Notifications"]
        BILLING["Billing Service"]
    end

    Clients --> Gateway
    Gateway --> Orchestration
    Orchestration --> Processing
    Processing --> Privacy
    Processing --> Quality
    Processing --> Storage
    Orchestration --> External

    Privacy --> Storage
    Quality --> Storage

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef orch fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef privacy fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef quality fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef external fill:#efebe9,stroke:#5d4037,stroke-width:2px

    class SDK,CLI,API,UI client
    class LB,AUTH,RL,ROUTER gateway
    class TRAIN_SCHED,GEN_QUEUE,QUAL_PIPE,WORKFLOW orch
    class CONN,SCHEMA,PII,PROFILE,ENCODE,NORM,CONSTRAINT,CTGAN,TVAE,ACTGAN,DIFFUSION,TIMEGAN,TRANSFORMER,BATCH_GEN,STREAM_GEN,COND_GEN,MULTI_GEN process
    class DPSGD,ACCOUNTANT,RISK,PROTECT privacy
    class FIDELITY,UTILITY,PRIVACY_M,GATE quality
    class PG,S3,REDIS,TS storage
    class GPU,NOTIFY,BILLING external
```

---

## Core Components

### 1. Data Ingestion Layer

**Purpose:** Connect to data sources, analyze schemas, detect PII, and profile data characteristics.

```mermaid
flowchart LR
    subgraph Sources["Data Sources"]
        DB["Databases"]
        FILES["Files"]
        CLOUD["Cloud Storage"]
        STREAM["Streaming"]
    end

    subgraph Connectors["Connector Layer"]
        PG_CONN["PostgreSQL"]
        MYSQL_CONN["MySQL"]
        SNOW_CONN["Snowflake"]
        PARQ_CONN["Parquet"]
        CSV_CONN["CSV"]
        S3_CONN["S3/GCS/Azure"]
    end

    subgraph Analysis["Analysis Pipeline"]
        SCHEMA["Schema Detection"]
        TYPE["Type Inference"]
        STATS["Statistics"]
        PII["PII Detection"]
        REL["Relationship Detection"]
    end

    subgraph Output["Analysis Output"]
        META["Metadata Record"]
        PROFILE["Data Profile"]
        WARNINGS["Privacy Warnings"]
    end

    Sources --> Connectors --> Analysis --> Output

    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef conn fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef analysis fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef output fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class DB,FILES,CLOUD,STREAM source
    class PG_CONN,MYSQL_CONN,SNOW_CONN,PARQ_CONN,CSV_CONN,S3_CONN conn
    class SCHEMA,TYPE,STATS,PII,REL analysis
    class META,PROFILE,WARNINGS output
```

**Capabilities:**
- Automatic schema detection and type inference
- Data profiling: cardinality, distributions, null rates
- PII detection using regex patterns and ML models
- Foreign key inference via column overlap analysis
- Multi-table relationship mapping

**Example Usage:**
```
// Ingest from PostgreSQL
dataset = ingest(
    source_type: "postgresql",
    connection: "host=db.example.com;database=sales",
    tables: ["customers", "orders", "products"],
    sample_rate: 0.1  // Profile on 10% sample
)

// Result includes:
// - Schema per table
// - Column statistics
// - PII warnings (email, phone detected)
// - Inferred FK relationships
```

### 2. Preprocessing Layer

**Purpose:** Transform raw data into model-ready format with appropriate encodings.

**Data Type Encoding:**

| Data Type | Encoding Method | Reconstruction |
|-----------|-----------------|----------------|
| Categorical (low cardinality, < 20) | One-hot encoding | Argmax |
| Categorical (high cardinality, ≥ 20) | Embedding + sampling | Nearest neighbor |
| Continuous (numeric) | Mode-specific normalization (GMM) | Inverse transform |
| DateTime | Cyclical encoding (sin/cos) + linear | Decode components |
| Text (short) | Token embedding | Detokenize |
| Boolean | Binary encoding | Threshold |

**Mode-Specific Normalization (CTGAN):**
Continuous columns are modeled as Gaussian Mixture Models (GMM) to handle multi-modal distributions. Each value is encoded as (mode, normalized_value).

```
// Preprocessing pipeline
preprocessed = preprocess(
    dataset: raw_data,
    config: {
        categorical_encoder: "embedding",
        numerical_normalizer: "mode_specific",  // GMM-based
        datetime_encoder: "cyclical",
        text_handler: "tokenize",
        constraint_extraction: true
    }
)
```

### 3. Model Zoo

**Purpose:** Provide multiple generative model architectures optimized for different data characteristics.

```mermaid
flowchart TD
    subgraph Selection["Model Selection Router"]
        INPUT["Data Profile"]
        ROUTER["Model Router"]
    end

    subgraph Models["Available Models"]
        subgraph GANs["GAN Family"]
            CTGAN["CTGAN<br/>General tabular"]
            ACTGAN["ACTGAN<br/>Labeled data"]
            COPGAN["CopulaGAN<br/>Correlations"]
        end

        subgraph VAEs["VAE Family"]
            TVAE["TVAE<br/>Probabilistic"]
        end

        subgraph Diffusion["Diffusion Family"]
            DDPM["DDPM<br/>High fidelity"]
            TABDDPM["TabDDPM<br/>Tabular optimized"]
        end

        subgraph Sequential["Sequential Models"]
            TIMEGAN["TimeGAN<br/>Time-series"]
            DGAN["DGAN<br/>Sequences"]
        end

        subgraph Transformers["Transformer Family"]
            ARGN["TabularARGN<br/>Complex data"]
            LLM["LLM-based<br/>Text + mixed"]
        end
    end

    INPUT --> ROUTER
    ROUTER --> GANs
    ROUTER --> VAEs
    ROUTER --> Diffusion
    ROUTER --> Sequential
    ROUTER --> Transformers

    classDef router fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef gan fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef vae fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef diff fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef seq fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef trans fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class INPUT,ROUTER router
    class CTGAN,ACTGAN,COPGAN gan
    class TVAE vae
    class DDPM,TABDDPM diff
    class TIMEGAN,DGAN seq
    class ARGN,LLM trans
```

**Model Selection Criteria:**

| Criterion | CTGAN | TVAE | Diffusion | TimeGAN | TabularARGN |
|-----------|-------|------|-----------|---------|-------------|
| Training speed | Fast | Fast | Slow | Medium | Medium |
| Fidelity | Good | Good | Best | Good | Better |
| Mode coverage | Medium | High | High | High | High |
| DP integration | Medium | Easy | Medium | Hard | Medium |
| Memory usage | Low | Low | High | Medium | Medium |
| Stability | Medium | High | High | Medium | High |

### 4. Training Orchestration

**Purpose:** Manage distributed GPU training, checkpointing, and hyperparameter optimization.

```mermaid
sequenceDiagram
    participant Client
    participant API as API Gateway
    participant Scheduler as Training Scheduler
    participant Queue as Job Queue
    participant Worker as GPU Worker
    participant Storage as Object Storage
    participant Privacy as Privacy Layer

    Client->>API: Submit training job
    API->>Scheduler: Create job record
    Scheduler->>Queue: Enqueue job
    Queue->>Worker: Dequeue + assign GPU

    rect rgb(230, 245, 230)
        Note over Worker: Training Loop
        Worker->>Storage: Load preprocessed data
        Worker->>Privacy: Initialize DP-SGD (if enabled)
        loop Each Epoch
            Worker->>Privacy: Clip gradients
            Privacy->>Worker: Add calibrated noise
            Worker->>Worker: Update model
            Worker->>Storage: Save checkpoint (every N epochs)
        end
    end

    Worker->>Storage: Save final model
    Worker->>Scheduler: Job complete
    Scheduler->>Client: Notify completion
```

**Training Configuration:**
```
training_config = {
    model_type: "CTGAN",
    epochs: 300,
    batch_size: 500,
    generator_lr: 2e-4,
    discriminator_lr: 2e-4,
    discriminator_steps: 1,

    // Distributed training
    distributed: {
        strategy: "DDP",  // Distributed Data Parallel
        num_gpus: 4,
        checkpoint_interval: 50
    },

    // Privacy (optional)
    privacy: {
        enabled: true,
        epsilon: 1.0,
        delta: 1e-5,
        max_grad_norm: 1.0
    }
}
```

### 5. Privacy Layer

**Purpose:** Provide mathematical privacy guarantees through Differential Privacy and related mechanisms.

```mermaid
flowchart TB
    subgraph Input["Training Request"]
        DATA["Source Data"]
        CONFIG["Privacy Config<br/>ε=1.0, δ=1e-5"]
    end

    subgraph DP["Differential Privacy Layer"]
        CLIP["Gradient Clipping<br/>(max_norm=1.0)"]
        NOISE["Noise Injection<br/>(Gaussian)"]
        ACCOUNT["Privacy Accountant<br/>(RDP)"]
    end

    subgraph Protect["Protection Mechanisms"]
        RARE["Rare Category<br/>Protection (k≥5)"]
        EXTREME["Extreme Value<br/>Capping"]
        SEQUENCE["Sequence Length<br/>Truncation"]
    end

    subgraph Output["Training Output"]
        MODEL["DP-Trained Model"]
        BUDGET["Budget Spent<br/>ε_used=0.8"]
    end

    DATA --> CLIP
    CONFIG --> CLIP
    CLIP --> NOISE
    NOISE --> ACCOUNT
    ACCOUNT --> MODEL
    ACCOUNT --> BUDGET

    DATA --> Protect
    Protect --> CLIP

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef dp fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef protect fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef output fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class DATA,CONFIG input
    class CLIP,NOISE,ACCOUNT dp
    class RARE,EXTREME,SEQUENCE protect
    class MODEL,BUDGET output
```

**Privacy Mechanisms:**

| Mechanism | Description | When Applied |
|-----------|-------------|--------------|
| **DP-SGD** | Clip gradients, add calibrated Gaussian noise | During training |
| **Privacy Accountant** | Track cumulative ε/δ spend using RDP | Per batch |
| **Rare Category Protection** | Remove categories with < k occurrences | Preprocessing |
| **Extreme Value Capping** | Truncate outliers beyond P1/P99 | Preprocessing |
| **Sequence Truncation** | Limit sequence lengths | Multi-table preprocessing |

### 6. Generation Engine

**Purpose:** Sample synthetic data from trained models with support for batch, streaming, and conditional generation.

```mermaid
sequenceDiagram
    participant Client
    participant API as API Gateway
    participant Queue as Generation Queue
    participant Worker as Generation Worker
    participant Cache as Model Cache
    participant Storage as Object Storage
    participant Quality as Quality Service

    Client->>API: Generate(model_id, n=100000, conditions)
    API->>Queue: Enqueue generation job

    Queue->>Worker: Assign job
    Worker->>Cache: Check model cache
    alt Model in cache
        Cache->>Worker: Return cached model
    else Model not cached
        Worker->>Storage: Load model
        Worker->>Cache: Cache model (TTL=1hr)
    end

    rect rgb(230, 245, 230)
        Note over Worker: Generation Loop
        Worker->>Worker: Sample latent vectors
        Worker->>Worker: Decode to data space
        Worker->>Worker: Apply inverse transforms
        Worker->>Worker: Apply constraints/conditions
    end

    Worker->>Storage: Write generated data
    Worker->>Quality: Trigger quality validation
    Quality->>Storage: Write quality report
    Quality->>Client: Notify completion + report
```

**Generation Modes:**

| Mode | Use Case | Latency | Implementation |
|------|----------|---------|----------------|
| **Batch** | Dataset creation | Minutes | Generate N rows to file |
| **Streaming** | Real-time API | < 100ms | Pre-warmed model, single-row sampling |
| **Conditional** | Edge cases, targeting | Variable | Rejection sampling or conditional model |
| **Augmentation** | Class balancing | Variable | Generate specific subpopulations |
| **Multi-table** | Relational data | Minutes | Hierarchical FK propagation |

**Conditional Generation Example:**
```
// Generate edge cases: high-income elderly with rare disease
synthetic = generate(
    model_id: "model_123",
    n_samples: 10000,
    conditions: {
        "age": { "operator": ">", "value": 65 },
        "income": { "operator": ">", "value": 200000 },
        "disease": { "operator": "=", "value": "rare_condition_x" }
    },
    seed: 42  // Reproducibility
)
```

### 7. Quality Assessment Service

**Purpose:** Evaluate synthetic data across three pillars: Fidelity, Utility, and Privacy.

```mermaid
flowchart TB
    subgraph Input["Quality Check Request"]
        REAL["Real Data<br/>(Sample)"]
        SYNTH["Synthetic Data"]
    end

    subgraph Fidelity["Fidelity Assessment"]
        MARGINAL["Marginal<br/>Distributions"]
        JOINT["Joint<br/>Distributions"]
        CORR["Correlation<br/>Matrix"]
        TEMPORAL["Temporal<br/>Patterns"]
    end

    subgraph Utility["Utility Assessment"]
        TSTR["Train Synthetic<br/>Test Real"]
        TRTS["Train Real<br/>Test Synthetic"]
        FEATURE["Feature<br/>Importance"]
        DOWNSTREAM["Downstream<br/>Tasks"]
    end

    subgraph Privacy["Privacy Assessment"]
        MIA["Membership<br/>Inference"]
        ATTR["Attribute<br/>Inference"]
        DCR["Distance to<br/>Closest Record"]
        LINK["Linkability<br/>Risk"]
    end

    subgraph Output["Quality Report"]
        SCORES["Pillar Scores"]
        OVERALL["Overall Score"]
        GATE["Pass/Fail Gate"]
        RECOMMEND["Recommendations"]
    end

    REAL --> Fidelity
    SYNTH --> Fidelity
    REAL --> Utility
    SYNTH --> Utility
    REAL --> Privacy
    SYNTH --> Privacy

    Fidelity --> SCORES
    Utility --> SCORES
    Privacy --> SCORES
    SCORES --> OVERALL
    OVERALL --> GATE
    GATE --> RECOMMEND

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef fidelity fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef utility fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef privacy fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef output fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class REAL,SYNTH input
    class MARGINAL,JOINT,CORR,TEMPORAL fidelity
    class TSTR,TRTS,FEATURE,DOWNSTREAM utility
    class MIA,ATTR,DCR,LINK privacy
    class SCORES,OVERALL,GATE,RECOMMEND output
```

---

## Data Flow Diagrams

### Training Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Ingest as Ingestion
    participant Preprocess
    participant Scheduler
    participant GPU as GPU Worker
    participant Privacy
    participant Storage
    participant Notify

    User->>API: POST /datasets (upload data)
    API->>Ingest: Analyze + profile
    Ingest->>Storage: Store raw data
    Ingest->>API: Return dataset_id + profile

    User->>API: POST /models (start training)
    API->>Scheduler: Create training job
    Scheduler->>Preprocess: Transform data
    Preprocess->>Storage: Store encoded data
    Preprocess->>Scheduler: Ready for training

    Scheduler->>GPU: Dispatch training job
    GPU->>Storage: Load encoded data
    GPU->>Privacy: Initialize DP (if enabled)

    loop Training epochs
        GPU->>GPU: Forward pass
        GPU->>Privacy: Clip + noise gradients
        GPU->>GPU: Backward pass
        opt Checkpoint interval
            GPU->>Storage: Save checkpoint
        end
    end

    GPU->>Storage: Save final model
    GPU->>Scheduler: Job complete
    Scheduler->>Notify: Send notification
    Notify->>User: Training complete
```

### Generation Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Queue as Gen Queue
    participant Worker as Gen Worker
    participant Cache
    participant Privacy
    participant Quality
    participant Storage
    participant Notify

    User->>API: POST /generations (generate request)
    API->>Privacy: Check privacy budget
    Privacy->>API: Budget available

    API->>Queue: Enqueue generation job
    Queue->>Worker: Assign to worker

    Worker->>Cache: Get model
    alt Cache miss
        Worker->>Storage: Load model
        Worker->>Cache: Cache model
    end

    Worker->>Worker: Sample synthetic data
    Worker->>Worker: Apply inverse transforms
    Worker->>Worker: Apply conditions (if any)
    Worker->>Storage: Write synthetic dataset

    Worker->>Quality: Trigger quality check
    Quality->>Storage: Load real + synthetic samples
    Quality->>Quality: Compute fidelity metrics
    Quality->>Quality: Compute utility metrics
    Quality->>Quality: Compute privacy metrics
    Quality->>Storage: Write quality report

    alt Quality passes
        Quality->>Notify: Generation complete + report
    else Quality fails
        Quality->>Notify: Generation failed quality gates
    end

    Notify->>User: Notification with results
```

### Multi-Table Generation Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Analyzer
    participant Generator
    participant Storage

    User->>API: Generate multi-table (customers, orders, items)
    API->>Analyzer: Analyze table relationships

    Analyzer->>Analyzer: Detect FK relationships
    Note over Analyzer: customers (parent)<br/>orders (child of customers)<br/>items (child of orders)

    Analyzer->>Analyzer: Topological sort
    Analyzer->>Generator: Ordered generation plan

    rect rgb(230, 245, 230)
        Note over Generator: Hierarchical Generation
        Generator->>Generator: Generate customers (root)
        Generator->>Storage: Write synthetic customers

        Generator->>Generator: Generate orders<br/>(conditioned on customer_ids)
        Generator->>Storage: Write synthetic orders

        Generator->>Generator: Generate items<br/>(conditioned on order_ids)
        Generator->>Storage: Write synthetic items
    end

    Generator->>Generator: Validate FK integrity
    Generator->>API: Multi-table dataset ready
    API->>User: Download URLs for all tables
```

---

## Key Architectural Decisions

### 1. Async-First Architecture

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Training jobs | Fully async | GPU jobs take hours; sync would timeout |
| Generation (batch) | Async with polling | Large datasets take minutes |
| Generation (streaming) | Sync | Sub-second latency required |
| Quality checks | Async | Compute-intensive; queue for throughput |

### 2. Model Artifact Storage

| Decision | Choice | Alternatives Considered |
|----------|--------|-------------------------|
| Storage backend | Object Storage (S3/GCS) | Distributed FS, HDFS |
| Model format | PyTorch checkpoints | ONNX, SavedModel |
| Versioning | Immutable versions | Mutable with history |
| Caching | Redis + local disk | Memcached, no caching |

**Rationale:** Object storage provides durability, scalability, and cost-effectiveness. PyTorch format for training continuity. Immutable versions for auditability.

### 3. Privacy Budget Management

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Budget granularity | Per-dataset | Allow dataset-specific policies |
| Accounting method | Rényi DP (RDP) | Tighter bounds than basic composition |
| Budget enforcement | Pre-check before generation | Prevent overspending |
| Budget persistence | Strongly consistent (PostgreSQL) | Critical for compliance |

### 4. Quality Gate Strategy

| Gate Type | When Applied | Failure Action |
|-----------|--------------|----------------|
| Pre-training | Before training starts | Reject if data too small or PII detected |
| Post-training | After model trained | Warn if loss not converged |
| Post-generation | After data generated | Block release if quality < threshold |
| On-demand | Manual trigger | Detailed report |

### Architecture Pattern Checklist

| Pattern | Decision | Notes |
|---------|----------|-------|
| Sync vs Async | Async for training/batch gen, sync for streaming | Long-running jobs require async |
| Event-driven vs Request-response | Hybrid - events for job status, request-response for API | Best of both worlds |
| Push vs Pull | Pull for job workers (poll queue) | Workers control concurrency |
| Stateless vs Stateful | Stateless API, stateful workers (GPU memory) | Scale API independently |
| Read-heavy vs Write-heavy | Write-heavy (generation creates large datasets) | Optimize for write throughput |
| Real-time vs Batch | Batch primary, real-time optional | Cost-effective for generation |
| Edge vs Origin | Origin processing (GPU required) | Can't run GANs at edge |

---

## Technology Choices

### Compute Layer

| Component | Technology | Rationale |
|-----------|------------|-----------|
| GPU orchestration | Kubernetes + GPU operator | Industry standard, auto-scaling |
| Job scheduling | Kubernetes Jobs / Argo Workflows | Native K8s, DAG support |
| Distributed training | PyTorch DDP / DeepSpeed | Efficient multi-GPU |
| Spot instance management | Custom controller | 70% cost savings |

### Storage Layer

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Metadata | PostgreSQL | ACID, relational, mature |
| Data/models | Object Storage (S3-compatible) | Scalable, cost-effective |
| Cache | Redis Cluster | Sub-ms latency, model caching |
| Time-series metrics | InfluxDB / TimescaleDB | Efficient metrics storage |

### Processing Layer

| Component | Technology | Rationale |
|-----------|------------|-----------|
| ML framework | PyTorch | Flexibility, DP libraries |
| Data processing | Pandas / Polars | Fast in-memory processing |
| Encoding | scikit-learn + custom | Standard transformers |
| Privacy | Opacus (PyTorch DP) | Facebook's DP library |

### API Layer

| Component | Technology | Rationale |
|-----------|------------|-----------|
| API framework | FastAPI | Async, OpenAPI, Python native |
| Authentication | OAuth2 / OIDC | Industry standard |
| Rate limiting | Redis-based | Distributed, fast |
| SDK | Python SDK | Primary user base |
