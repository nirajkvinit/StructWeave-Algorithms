# High-Level Design

## System Architecture

Michelangelo's architecture is organized into **three distinct planes** that separate concerns and enable independent scaling:

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer"]
        direction LR
        SDK["Python/Scala SDK"]
        MAStudio["MA Studio UI"]
        Notebooks["Jupyter Notebooks"]
        CICD["CI/CD Pipelines"]
        UberServices["Uber Services<br/>(Riders, Drivers, Eats)"]
    end

    subgraph ControlPlane["Control Plane"]
        direction TB
        subgraph K8sOperators["Kubernetes Operators"]
            ProjectOp["Project<br/>Operator"]
            PipelineOp["Pipeline<br/>Operator"]
            ModelOp["Model<br/>Operator"]
            DeployOp["Deployment<br/>Operator"]
            ServerOp["InferenceServer<br/>Operator"]
        end
        subgraph ControlServices["Control Services"]
            MetaStore["Palette<br/>Meta Store"]
            Gallery["Gallery<br/>Model Registry"]
            JobController["Job<br/>Controller"]
        end
    end

    subgraph OfflineDataPlane["Offline Data Plane"]
        direction TB
        subgraph FeaturePipelines["Feature Pipelines"]
            BatchFeature["Batch Feature<br/>Pipeline (Spark)"]
            StreamFeature["Streaming Feature<br/>Pipeline (Samza)"]
        end
        subgraph TrainingInfra["Training Infrastructure"]
            SparkCluster["Spark Cluster"]
            RayCluster["Ray Cluster"]
            GPUPool["GPU Pool<br/>(A100/H100)"]
        end
        subgraph OfflineStorage["Offline Storage"]
            DataLake["Data Lake<br/>(HDFS)"]
            HiveStore[("Hive<br/>Feature Snapshots")]
            ModelStore[("Model Artifact<br/>Store")]
        end
    end

    subgraph OnlineDataPlane["Online Data Plane"]
        direction TB
        subgraph ServingLayer["Serving Layer"]
            LB["Load Balancer"]
            PredService["Prediction Service<br/>(Virtual Sharding)"]
            Triton["Triton Inference<br/>Server"]
        end
        subgraph OnlineStorage["Online Storage"]
            Cassandra[("Cassandra<br/>Feature Store")]
            Redis[("Redis<br/>Feature Cache")]
        end
    end

    subgraph EventStream["Event Streaming"]
        Kafka["Kafka"]
    end

    %% Client connections
    SDK --> ControlPlane
    MAStudio --> ControlPlane
    Notebooks --> ControlPlane
    CICD --> ControlPlane
    UberServices --> OnlineDataPlane

    %% Control plane orchestration
    ControlPlane --> OfflineDataPlane
    ControlPlane --> OnlineDataPlane
    MetaStore --> HiveStore
    MetaStore --> Cassandra
    Gallery --> ModelStore
    Gallery --> PredService

    %% Offline data flows
    Kafka --> StreamFeature
    StreamFeature --> Cassandra
    StreamFeature --> DataLake
    DataLake --> BatchFeature
    BatchFeature --> HiveStore
    HiveStore --> Cassandra

    HiveStore --> TrainingInfra
    TrainingInfra --> ModelStore

    %% Online data flows
    LB --> PredService
    PredService --> Cassandra
    PredService --> Redis
    LB --> Triton

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef control fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef offline fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef online fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef streaming fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef storage fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class SDK,MAStudio,Notebooks,CICD,UberServices client
    class ProjectOp,PipelineOp,ModelOp,DeployOp,ServerOp,MetaStore,Gallery,JobController control
    class BatchFeature,StreamFeature,SparkCluster,RayCluster,GPUPool offline
    class LB,PredService,Triton online
    class Kafka streaming
    class DataLake,HiveStore,ModelStore,Cassandra,Redis storage
```

---

## Three-Plane Architecture

### Control Plane

**Purpose:** Manages the lifecycle of all ML entities using Kubernetes operators.

| Component | Responsibility |
|-----------|----------------|
| **Project Operator** | Manages project lifecycle, tiering, resource quotas |
| **Pipeline Operator** | Orchestrates feature and training pipelines |
| **Model Operator** | Handles model versioning, staging, promotion |
| **Deployment Operator** | Manages model deployments to serving infrastructure |
| **InferenceServer Operator** | Controls prediction service instances |
| **Palette Meta Store** | Feature metadata, schema, lineage tracking |
| **Gallery** | Model registry, artifacts, experiment tracking |
| **Job Controller** | Federates jobs across Kubernetes clusters |

**Key Design Decision:** Kubernetes operators provide standardized API conventions across all ML entities, leveraging Kubernetes' built-in machinery (API server, etcd, controller manager).

### Offline Data Plane

**Purpose:** Heavy computation workloads for feature engineering and model training.

| Component | Responsibility |
|-----------|----------------|
| **Batch Feature Pipeline** | Spark-based computation of historical features |
| **Streaming Feature Pipeline** | Samza-based real-time feature aggregation |
| **Spark Cluster** | Distributed training for traditional ML (XGBoost, etc.) |
| **Ray Cluster** | Distributed training for deep learning, LLMs |
| **GPU Pool** | Shared GPU resources (A100/H100) for training |
| **Data Lake (HDFS)** | Raw data and intermediate results |
| **Hive** | Feature snapshots for offline serving |
| **Model Artifact Store** | Versioned model binaries |

### Online Data Plane

**Purpose:** Real-time prediction serving with millisecond latency.

| Component | Responsibility |
|-----------|----------------|
| **Load Balancer** | Request routing, health checks |
| **Prediction Service** | Model inference with virtual sharding |
| **Triton Inference Server** | GPU-accelerated inference for DL models |
| **Cassandra** | Online feature store (primary) |
| **Redis** | Feature cache for ultra-low latency |

---

## Data Flow Diagrams

### Training Pipeline Flow

```mermaid
sequenceDiagram
    participant DS as Data Scientist
    participant SDK as Python SDK
    participant CP as Control Plane
    participant Gallery as Gallery Registry
    participant Palette as Palette Store
    participant Hive as Hive (Offline)
    participant Spark as Spark/Ray Cluster
    participant Store as Model Store

    DS->>SDK: Define training job
    SDK->>CP: Submit pipeline
    CP->>Gallery: Create experiment run
    CP->>Palette: Resolve feature definitions

    Palette->>Hive: Point-in-time feature query
    Hive-->>Spark: Training dataset

    CP->>Spark: Launch training job

    loop Training iterations
        Spark->>Spark: Train model
        Spark->>Gallery: Log metrics & params
        Spark->>Store: Save checkpoint
    end

    Spark->>Store: Save final model artifact
    Spark->>Gallery: Register model version
    Gallery-->>DS: Model ready for deployment
```

### Online Prediction Flow

```mermaid
sequenceDiagram
    participant Client as Uber Service
    participant LB as Load Balancer
    participant PS as Prediction Service
    participant Cache as Redis Cache
    participant Cass as Cassandra
    participant Model as Model Instance

    Client->>LB: Prediction request (model_id, entity_id, raw_features)
    LB->>PS: Route to service instance

    PS->>PS: Parse request, identify features needed

    alt Features in cache
        PS->>Cache: Lookup cached features
        Cache-->>PS: Cached feature values
    else Features not in cache
        PS->>Cass: Lookup features by entity_id
        Cass-->>PS: Feature values
        PS->>Cache: Cache features (TTL)
    end

    PS->>PS: Apply feature DSL transformations
    PS->>Model: Invoke model.predict(features)
    Model-->>PS: Prediction result

    PS-->>LB: Response (prediction, metadata)
    LB-->>Client: Prediction response
```

### Feature Computation Flow (Lambda Architecture)

```mermaid
flowchart LR
    subgraph Sources["Data Sources"]
        Events["Event Streams<br/>(Trips, Orders)"]
        Tables["Data Tables<br/>(Users, Drivers)"]
    end

    subgraph Streaming["Streaming Path (Near Real-Time)"]
        Kafka["Kafka"]
        Samza["Samza Jobs"]
    end

    subgraph Batch["Batch Path (Daily)"]
        HDFS["HDFS"]
        Spark["Spark Jobs"]
        Hive["Hive Tables"]
    end

    subgraph Serving["Serving Layer"]
        Cassandra[("Cassandra<br/>Online Store")]
        Training["Training<br/>Pipeline"]
        Prediction["Prediction<br/>Service"]
    end

    Events --> Kafka
    Kafka --> Samza
    Samza -->|"Write features"| Cassandra
    Samza -->|"Log to HDFS"| HDFS

    Tables --> HDFS
    HDFS --> Spark
    Spark --> Hive
    Hive -->|"Batch load"| Cassandra

    Hive --> Training
    Cassandra --> Prediction

    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef stream fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef batch fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef serve fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class Events,Tables source
    class Kafka,Samza stream
    class HDFS,Spark,Hive batch
    class Cassandra,Training,Prediction serve
```

---

## Key Architectural Decisions

### 1. Lambda Architecture for Features

| Decision | Lambda Architecture (Batch + Streaming) |
|----------|----------------------------------------|
| **Context** | Features need both historical accuracy and real-time freshness |
| **Options Considered** | Kappa (streaming only), Batch only, Lambda |
| **Choice** | Lambda: Dual batch + streaming paths |
| **Rationale** | Batch provides accurate historical data for training; streaming provides fresh data for serving |
| **Trade-off** | Operational complexity of maintaining two systems; mitigated by shared DSL |

### 2. Dual-Store Feature Architecture

| Decision | Hive (Offline) + Cassandra (Online) |
|----------|-------------------------------------|
| **Context** | Training needs point-in-time joins; serving needs low latency |
| **Options Considered** | Single store, Virtual feature store, Physical dual-store |
| **Choice** | Physical dual-store with materialization |
| **Rationale** | Optimized storage engine for each use case; Hive for analytical queries, Cassandra for key-value lookups |
| **Trade-off** | Data duplication; mitigated by automated sync pipelines |

### 3. Virtual Model Sharding

| Decision | Multi-model per prediction service instance |
|----------|-------------------------------------------|
| **Context** | 5,000+ models need efficient hosting |
| **Options Considered** | One model per container, dedicated instances, virtual sharding |
| **Choice** | Virtual sharding: multiple models per instance |
| **Rationale** | Better resource utilization; models loaded on-demand or at startup |
| **Trade-off** | Complexity in memory management; requires careful scheduling |

### 4. Kubernetes Operators as Control Plane

| Decision | Custom Kubernetes operators for ML entities |
|----------|-------------------------------------------|
| **Context** | Need standardized lifecycle management across ML primitives |
| **Options Considered** | Custom control plane, Kubeflow, Kubernetes operators |
| **Choice** | Custom Kubernetes operators |
| **Rationale** | Leverage K8s API machinery; standardized conventions; extensibility |
| **Trade-off** | Requires K8s expertise; operator maintenance overhead |

### 5. Ray Migration for Training/Inference

| Decision | Migrate from Spark to Ray (2024) |
|----------|----------------------------------|
| **Context** | Deep learning and LLM workloads don't fit Spark's batch model |
| **Options Considered** | Keep Spark, Dask, Ray |
| **Choice** | Ray for DL/LLM; Spark retained for traditional ML |
| **Rationale** | Ray's native Python, actor model, GPU support better for modern ML |
| **Trade-off** | Migration effort; dual-stack maintenance during transition |

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Both | Sync for predictions; async for training/feature computation |
| **Event-driven vs Request-response** | Both | Event-driven for features; request-response for predictions |
| **Push vs Pull** | Pull-based serving | Features pulled on-demand; push for feature store updates |
| **Stateless vs Stateful** | Stateless serving | Models loaded from shared storage; enables horizontal scaling |
| **Read vs Write optimization** | Read-heavy serving | Cassandra optimized for reads; write-heavy in batch paths |
| **Real-time vs Batch** | Lambda (both) | Streaming for freshness; batch for accuracy |
| **Edge vs Origin** | Origin-centric | All processing at datacenter; edge only for routing |

---

## Component Interaction Matrix

| From \ To | Prediction Service | Cassandra | Hive | Spark/Ray | Kafka | Gallery |
|-----------|-------------------|-----------|------|-----------|-------|---------|
| **Uber Services** | Sync (predict) | - | - | - | Async (events) | - |
| **Prediction Service** | - | Sync (lookup) | - | - | - | Read (model) |
| **Training Pipeline** | - | - | Read (features) | Execute | - | Write (metrics) |
| **Feature Pipeline** | - | Write | Write | Execute | Consume | - |
| **Control Plane** | Manage | - | - | Schedule | - | Manage |

---

## Deployment Architecture

### Multi-Region Topology

```mermaid
flowchart TB
    subgraph Region1["Region 1 (Primary)"]
        direction TB
        CP1["Control Plane"]
        DP1["Data Plane"]
        SS1["Serving Stack"]
    end

    subgraph Region2["Region 2 (Secondary)"]
        direction TB
        CP2["Control Plane<br/>(Read Replica)"]
        DP2["Data Plane"]
        SS2["Serving Stack"]
    end

    subgraph Global["Global Layer"]
        GLB["Global Load Balancer"]
        GalleryPrimary["Gallery<br/>(Primary)"]
        PaletteMeta["Palette Meta Store"]
    end

    GLB --> SS1
    GLB --> SS2

    CP1 <-->|"Sync"| GalleryPrimary
    CP2 <-->|"Async Replicate"| GalleryPrimary

    CP1 <--> PaletteMeta
    CP2 <--> PaletteMeta

    SS1 <-->|"Cross-region failover"| SS2

    classDef primary fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef secondary fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef global fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class CP1,DP1,SS1 primary
    class CP2,DP2,SS2 secondary
    class GLB,GalleryPrimary,PaletteMeta global
```

---

## Technology Stack Summary

| Layer | Component | Technology | Purpose |
|-------|-----------|------------|---------|
| **Client** | SDK | Python, Scala | API interaction |
| **Client** | UI | MA Studio (React) | Visual workflow |
| **Control** | Orchestration | Kubernetes Operators | Lifecycle management |
| **Control** | Metadata | PostgreSQL, etcd | Persistent state |
| **Offline** | Batch Processing | Apache Spark | Feature computation, training |
| **Offline** | Stream Processing | Apache Samza | Real-time features |
| **Offline** | Storage | HDFS, Hive | Data lake, feature snapshots |
| **Offline** | Training | Ray, PyTorch | Distributed DL training |
| **Online** | Serving | Java (custom) | Low-latency predictions |
| **Online** | GPU Serving | Triton | DL model inference |
| **Online** | Feature Store | Cassandra, Redis | Online features |
| **Streaming** | Event Bus | Apache Kafka | Event transport |

---

## Design Principles

1. **Training-Serving Consistency:** Same features and transformations used in training and serving
2. **Model-as-Code:** All model definitions version-controlled and reproducible
3. **Project Tiering:** Resource allocation based on business impact
4. **Unified Platform:** Single system for entire ML lifecycle
5. **Self-Service:** Data scientists can deploy without platform team involvement
6. **Operator Pattern:** Declarative management of ML resources
