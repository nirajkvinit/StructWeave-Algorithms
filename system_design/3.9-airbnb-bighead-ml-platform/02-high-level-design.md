# High-Level Design

## 5-Layer Architecture

Airbnb BigHead follows a layered architecture that separates concerns across the ML lifecycle while maintaining integration through well-defined interfaces.

```mermaid
flowchart TB
    subgraph L1["Layer 1: Client Layer"]
        DS["Data Scientists<br/>(Feature & Model Dev)"]
        MLE["ML Engineers<br/>(Pipeline & Serving)"]
        SVC["Production Services<br/>(Search, Pricing, Recs)"]
    end

    subgraph L2["Layer 2: Development Layer"]
        RS["Redspot<br/>(Containerized Jupyter)"]
        BHL["BigHead Library<br/>(Pipeline SDK)"]
        PYDK["Python SDK<br/>(Feature Definition)"]
    end

    subgraph L3["Layer 3: Orchestration Layer"]
        MLA["ML Automator<br/>(DAG Generator)"]
        AF["Airflow<br/>(Workflow Engine)"]
        SCH["Job Scheduler<br/>(Resource Manager)"]
    end

    subgraph L4["Layer 4: Feature Layer (Zipline/Chronon)"]
        DSL["Feature DSL<br/>(Declarative Definitions)"]

        subgraph L4B["Batch Processing"]
            SPK["Spark Jobs<br/>(Historical Computation)"]
            HIVE[("Hive<br/>(Offline Store)")]
        end

        subgraph L4S["Streaming Processing"]
            FLK["Flink Jobs<br/>(Real-time Computation)"]
            KFK["Kafka<br/>(Event Bus)"]
            KVOL[("KV Store<br/>(Online Store)")]
        end
    end

    subgraph L5["Layer 5: Serving Layer"]
        DT["Deep Thought<br/>(Model Server)"]
        MR[("Model Registry<br/>(Artifact Store)")]
        FAPI["Feature API<br/>(Online Lookup)"]
    end

    %% Client to Development
    DS --> RS
    DS --> PYDK
    MLE --> BHL
    SVC --> DT

    %% Development to Orchestration
    RS --> BHL
    BHL --> MLA
    PYDK --> DSL

    %% Orchestration to Processing
    MLA --> AF
    AF --> SCH
    SCH --> SPK
    SCH --> FLK

    %% Feature Processing
    DSL --> SPK
    DSL --> FLK
    SPK --> HIVE
    FLK --> KFK
    KFK --> KVOL

    %% Serving Integration
    DT --> FAPI
    FAPI --> KVOL
    DT --> MR
    BHL --> MR

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef dev fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef orch fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef batch fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef stream fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef serving fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef storage fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class DS,MLE,SVC client
    class RS,BHL,PYDK dev
    class MLA,AF,SCH orch
    class DSL,SPK batch
    class FLK,KFK stream
    class DT,MR,FAPI serving
    class HIVE,KVOL storage
```

---

## Layer Descriptions

### Layer 1: Client Layer

| Component | Users | Responsibilities |
|-----------|-------|------------------|
| **Data Scientists** | Model developers | Define features, train models, evaluate experiments |
| **ML Engineers** | Platform users | Deploy pipelines, optimize serving, monitor production |
| **Production Services** | Automated systems | Request predictions for search, pricing, recommendations |

### Layer 2: Development Layer

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| **Redspot** | Docker + JupyterHub | Containerized notebooks with reproducible environments |
| **BigHead Library** | Python (scikit-learn wrapper) | Pipeline definition, training utilities, model serialization |
| **Python SDK** | Python | Feature definition DSL, API clients |

### Layer 3: Orchestration Layer

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| **ML Automator** | Custom Python | Parse code → Generate Airflow DAGs automatically |
| **Airflow** | Apache Airflow | Workflow scheduling, dependency management, monitoring |
| **Job Scheduler** | Custom + K8s | Resource allocation, priority queuing, capacity management |

### Layer 4: Feature Layer (Zipline/Chronon)

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| **Feature DSL** | Python declarative | Single source of truth for feature definitions |
| **Spark Jobs** | Apache Spark | Batch feature computation, backfills |
| **Flink Jobs** | Apache Flink | Streaming feature computation |
| **Kafka** | Apache Kafka | Event bus for real-time data |
| **Hive (Offline)** | Apache Hive | Historical feature storage for training |
| **KV Store (Online)** | Custom/Redis | Low-latency feature serving |

### Layer 5: Serving Layer

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| **Deep Thought** | Kubernetes + Docker | Real-time model inference |
| **Model Registry** | Custom | Model versioning, artifact storage, deployment state |
| **Feature API** | REST/gRPC | Online feature lookup interface |

---

## Data Flow Diagrams

### Training Pipeline Flow

```mermaid
sequenceDiagram
    participant DS as Data Scientist
    participant RS as Redspot
    participant DSL as Feature DSL
    participant MLA as ML Automator
    participant AF as Airflow
    participant SPK as Spark
    participant HIVE as Hive (Offline)
    participant BHL as BigHead Library
    participant MR as Model Registry

    DS->>RS: Develop in notebook
    DS->>DSL: Define features

    rect rgb(232, 245, 233)
        Note over DSL,HIVE: Feature Backfill
        DSL->>SPK: Compile to Spark SQL
        SPK->>HIVE: Write historical features
    end

    DS->>BHL: Define training pipeline
    BHL->>MLA: Submit for productionization

    rect rgb(243, 229, 245)
        Note over MLA,AF: DAG Generation
        MLA->>MLA: Parse Python AST
        MLA->>AF: Generate Airflow DAG
    end

    rect rgb(255, 243, 224)
        Note over AF,MR: Training Execution
        AF->>SPK: Trigger feature job
        SPK->>HIVE: Read training data
        AF->>BHL: Trigger training
        BHL->>BHL: Train model
        BHL->>MR: Register model
    end
```

### Online Prediction Flow

```mermaid
sequenceDiagram
    participant SVC as Service (Search)
    participant DT as Deep Thought
    participant FAPI as Feature API
    participant KV as KV Store (Online)
    participant MR as Model Registry

    SVC->>DT: POST /predict {entity_keys}

    DT->>MR: Resolve model version
    MR-->>DT: Model artifact location

    rect rgb(224, 247, 250)
        Note over DT,KV: Feature Lookup
        DT->>FAPI: GET /features {entity_keys, feature_names}
        FAPI->>KV: Batch lookup
        KV-->>FAPI: Feature values
        FAPI-->>DT: Feature vector
    end

    rect rgb(255, 253, 231)
        Note over DT: Model Inference
        DT->>DT: Transform features (same DSL)
        DT->>DT: Execute model
    end

    DT-->>SVC: {prediction, metadata}
```

### Lambda Architecture for Features

```mermaid
flowchart LR
    subgraph Sources["Data Sources"]
        EVT["Events<br/>(Bookings, Searches)"]
        SNP["Snapshots<br/>(User, Listing)"]
    end

    subgraph Batch["Batch Path (Accuracy)"]
        HIVE1[("Hive<br/>(Raw Data)")]
        SPK["Spark<br/>(Daily Jobs)"]
        HIVE2[("Hive<br/>(Features)")]
    end

    subgraph Stream["Streaming Path (Freshness)"]
        KFK["Kafka<br/>(Event Stream)"]
        FLK["Flink<br/>(Stateful Agg)"]
        KV1[("KV Store<br/>(Online)")]
    end

    subgraph Serve["Serving"]
        FAPI["Feature API"]
        TRAIN["Training Jobs"]
    end

    EVT --> HIVE1
    EVT --> KFK
    SNP --> HIVE1

    HIVE1 --> SPK
    SPK --> HIVE2

    KFK --> FLK
    FLK --> KV1

    HIVE2 --> TRAIN
    KV1 --> FAPI

    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef batch fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef stream fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef serve fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class EVT,SNP source
    class HIVE1,SPK,HIVE2 batch
    class KFK,FLK,KV1 stream
    class FAPI,TRAIN serve
```

---

## Key Architectural Decisions

### Decision 1: Declarative Feature DSL vs Imperative Code

| Aspect | Declarative DSL (Chosen) | Imperative Code |
|--------|-------------------------|-----------------|
| **Pros** | Single source of truth, train-serve consistency, optimization opportunities | Flexible, familiar to developers |
| **Cons** | Learning curve, limited expressiveness | Consistency bugs, duplicate logic |
| **Decision** | **Declarative DSL** - The #1 ML production bug is train-serve skew |

### Decision 2: Lambda Architecture vs Kappa Architecture

| Aspect | Lambda (Chosen) | Kappa |
|--------|----------------|-------|
| **Pros** | Historical accuracy guaranteed, batch for correctness, stream for freshness | Single codebase, simpler operations |
| **Cons** | Two code paths, sync complexity | Late data handling complex, reprocessing expensive |
| **Decision** | **Lambda** - Point-in-time correctness requires batch path for training |

### Decision 3: Automatic vs Manual DAG Generation

| Aspect | Automatic (Chosen) | Manual |
|--------|-------------------|--------|
| **Pros** | Reduced boilerplate, enforced patterns, faster iteration | Full control, explicit dependencies |
| **Cons** | Less flexibility, debugging harder | Inconsistent across teams, error-prone |
| **Decision** | **Automatic** - 80% reduction in pipeline code, pattern enforcement |

### Decision 4: Kubernetes-Native vs Custom Serving

| Aspect | Kubernetes (Chosen) | Custom Platform |
|--------|--------------------|--------------------|
| **Pros** | Container isolation, ecosystem tooling, auto-scaling | Optimized for ML, lower overhead |
| **Cons** | Complexity, K8s operational burden | Maintenance cost, limited ecosystem |
| **Decision** | **Kubernetes** - Leverage ecosystem for serving, custom for ML-specific |

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Both | Sync for predictions, async for training pipelines |
| **Event-Driven vs Request-Response** | Both | Event-driven for features, request-response for predictions |
| **Push vs Pull** | Pull (serving) | Features pulled on-demand at prediction time |
| **Stateless vs Stateful** | Stateless (serving) | Models loaded from registry, no in-memory state |
| **Read vs Write Optimization** | Read-heavy | Online store optimized for feature lookups |
| **Real-time vs Batch** | Lambda (both) | Batch for accuracy, streaming for freshness |
| **Edge vs Origin** | Origin | No edge caching for ML predictions |

---

## Technology Stack

```mermaid
flowchart TB
    subgraph Lang["Languages & SDKs"]
        PY["Python<br/>(Primary SDK)"]
        SC["Scala<br/>(Spark Jobs)"]
        JV["Java<br/>(Flink Jobs)"]
    end

    subgraph Compute["Compute Engines"]
        SPK["Apache Spark<br/>(Batch Processing)"]
        FLK["Apache Flink<br/>(Stream Processing)"]
        K8S["Kubernetes<br/>(Container Orchestration)"]
    end

    subgraph Storage["Storage Systems"]
        HIVE["Apache Hive<br/>(Offline Features)"]
        KV["KV Store<br/>(Online Features)"]
        S3["Object Storage<br/>(Model Artifacts)"]
    end

    subgraph Messaging["Messaging & Orchestration"]
        KFK["Apache Kafka<br/>(Event Streaming)"]
        AF["Apache Airflow<br/>(Workflow Orchestration)"]
    end

    subgraph ML["ML Frameworks"]
        TF["TensorFlow"]
        PT["PyTorch"]
        XG["XGBoost"]
        SK["scikit-learn"]
    end

    subgraph Dev["Development Tools"]
        JUP["Jupyter<br/>(Notebooks)"]
        DOC["Docker<br/>(Containerization)"]
        GIT["Git<br/>(Version Control)"]
    end

    PY --> SPK
    PY --> FLK
    SC --> SPK
    JV --> FLK

    SPK --> HIVE
    FLK --> KV
    KFK --> FLK

    AF --> SPK
    AF --> K8S

    K8S --> TF
    K8S --> PT
    K8S --> XG
    K8S --> SK

    DOC --> JUP
    DOC --> K8S

    classDef lang fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef compute fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef msg fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef ml fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef dev fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class PY,SC,JV lang
    class SPK,FLK,K8S compute
    class HIVE,KV,S3 storage
    class KFK,AF msg
    class TF,PT,XG,SK ml
    class JUP,DOC,GIT dev
```

---

## Component Integration Summary

| Integration | Source | Target | Protocol | Data Format |
|-------------|--------|--------|----------|-------------|
| Feature Definition | Python SDK | Zipline DSL | Python API | DSL Objects |
| DAG Generation | BigHead Library | ML Automator | Python API | AST |
| DAG Execution | ML Automator | Airflow | Airflow API | DAG Python |
| Batch Features | Airflow | Spark | SparkSubmit | Spark Job |
| Streaming Features | Kafka | Flink | Kafka Protocol | Avro/JSON |
| Feature Serving | Deep Thought | Feature API | gRPC | Protobuf |
| Model Loading | Deep Thought | Model Registry | HTTP | Model Artifact |
| Prediction Request | Services | Deep Thought | REST/gRPC | JSON/Protobuf |

---

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Zone1["Availability Zone 1"]
        subgraph K8S1["Kubernetes Cluster"]
            DT1["Deep Thought<br/>Pods (N)"]
            FAPI1["Feature API<br/>Pods (M)"]
        end
        KV1[("KV Store<br/>Replica")]
    end

    subgraph Zone2["Availability Zone 2"]
        subgraph K8S2["Kubernetes Cluster"]
            DT2["Deep Thought<br/>Pods (N)"]
            FAPI2["Feature API<br/>Pods (M)"]
        end
        KV2[("KV Store<br/>Replica")]
    end

    subgraph Shared["Shared Infrastructure"]
        LB["Load Balancer"]
        MR[("Model Registry")]
        AF["Airflow<br/>(HA)"]
        SPK["Spark Cluster"]
        HIVE[("Hive<br/>(Partitioned)")]
    end

    LB --> DT1
    LB --> DT2
    DT1 --> FAPI1
    DT2 --> FAPI2
    FAPI1 --> KV1
    FAPI2 --> KV2
    KV1 <--> KV2
    DT1 --> MR
    DT2 --> MR
    AF --> SPK
    SPK --> HIVE

    classDef zone fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef shared fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef lb fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class Zone1,Zone2 zone
    class Shared shared
    class LB lb
```
