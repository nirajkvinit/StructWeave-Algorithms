# High-Level Design

## Architecture Overview

The Open-Source End-to-End ML Platform follows a **5-layer architecture** that separates concerns while enabling seamless integration between components. This design prioritizes composability, allowing organizations to swap individual components without rewriting the entire platform.

---

## System Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientLayer["1. Client Layer"]
        direction LR
        PythonSDK[Python SDK]
        CLI[CLI Tools]
        WebUI[Web UIs]
        Notebooks[Notebooks]
    end

    subgraph OrchestrationLayer["2. Orchestration Layer"]
        direction LR
        Airflow[Airflow 3.x<br/>Scheduler + Workers]
        KubeRay[KubeRay<br/>Ray Clusters]
        K8sJobs[Kubernetes<br/>Jobs/CronJobs]
    end

    subgraph MLLifecycleLayer["3. ML Lifecycle Layer"]
        direction TB
        subgraph Tracking["Experiment Tracking"]
            MLflowTracking[MLflow Tracking<br/>Server]
            MLflowRegistry[Model Registry]
        end
        subgraph Features["Feature Management"]
            FeastRegistry[Feast Registry]
            FeastOffline[Offline Store<br/>Spark/BigQuery]
            FeastOnline[Online Store<br/>Redis]
        end
    end

    subgraph ServingLayer["4. Serving Layer"]
        direction LR
        KServe[KServe<br/>InferenceService]
        FeatureServer[Feast<br/>Feature Server]
        ModelMesh[ModelMesh<br/>Multi-Model]
        InferenceGraph[Inference<br/>Graph]
    end

    subgraph InfrastructureLayer["5. Infrastructure Layer"]
        direction LR
        K8s[Kubernetes<br/>Cluster]
        ObjectStorage[Object Storage<br/>S3/GCS/MinIO]
        PostgreSQL[PostgreSQL]
        RedisCluster[Redis Cluster]
        Kafka[Kafka<br/>Event Streaming]
    end

    subgraph ObservabilityLayer["6. Observability Layer"]
        direction LR
        Prometheus[Prometheus]
        Grafana[Grafana]
        Evidently[Evidently AI]
        Loki[Loki]
    end

    %% Client connections
    PythonSDK --> MLflowTracking
    PythonSDK --> FeastRegistry
    CLI --> Airflow
    WebUI --> MLflowTracking
    WebUI --> Grafana
    Notebooks --> PythonSDK

    %% Orchestration connections
    Airflow --> KubeRay
    Airflow --> K8sJobs
    KubeRay --> MLflowTracking
    KubeRay --> FeastOffline

    %% ML Lifecycle connections
    MLflowTracking --> ObjectStorage
    MLflowTracking --> PostgreSQL
    MLflowRegistry --> ObjectStorage
    FeastRegistry --> PostgreSQL
    FeastOffline --> ObjectStorage
    FeastOnline --> RedisCluster
    Kafka --> FeastOnline

    %% Serving connections
    KServe --> MLflowRegistry
    KServe --> FeatureServer
    FeatureServer --> FeastOnline
    ModelMesh --> KServe
    InferenceGraph --> KServe

    %% Infrastructure
    KServe --> K8s
    Airflow --> K8s
    KubeRay --> K8s

    %% Observability
    Prometheus --> KServe
    Prometheus --> FeatureServer
    Prometheus --> Airflow
    Grafana --> Prometheus
    Evidently --> Prometheus
    Loki --> K8s

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef orchestration fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef lifecycle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef serving fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef infra fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef observability fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class PythonSDK,CLI,WebUI,Notebooks client
    class Airflow,KubeRay,K8sJobs orchestration
    class MLflowTracking,MLflowRegistry,FeastRegistry,FeastOffline,FeastOnline lifecycle
    class KServe,FeatureServer,ModelMesh,InferenceGraph serving
    class K8s,ObjectStorage,PostgreSQL,RedisCluster,Kafka infra
    class Prometheus,Grafana,Evidently,Loki observability
```

---

## Layer Responsibilities

### Layer 1: Client Layer

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **Python SDK** | Programmatic access to all platform services | MLflow client, Feast SDK, KServe client |
| **CLI Tools** | Command-line operations | MLflow CLI, Feast CLI, kubectl |
| **Web UIs** | Visual interfaces | MLflow UI, Airflow UI, Grafana |
| **Notebooks** | Interactive development | Jupyter integration with SDKs |

### Layer 2: Orchestration Layer

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **Airflow 3.x** | Pipeline orchestration | DAG scheduling, event-driven, Assets |
| **KubeRay** | Distributed compute | Ray clusters, auto-scaling, fault tolerance |
| **K8s Jobs** | Simple task execution | One-off jobs, CronJobs for scheduling |

### Layer 3: ML Lifecycle Layer

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **MLflow Tracking** | Experiment management | Runs, metrics, parameters, artifacts |
| **Model Registry** | Model versioning | Stages, aliases, lineage |
| **Feast Registry** | Feature metadata | Feature definitions, entities, sources |
| **Offline Store** | Historical features | Training data, point-in-time joins |
| **Online Store** | Real-time features | Low-latency serving, Redis backend |

### Layer 4: Serving Layer

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **KServe** | Model inference | Auto-scaling, canary, multi-framework |
| **Feature Server** | Feature serving API | HTTP/gRPC, batch retrieval |
| **ModelMesh** | Multi-model serving | GPU sharing, dynamic loading |
| **InferenceGraph** | Pipeline serving | Pre/post processing, ensembles |

### Layer 5: Infrastructure Layer

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **Kubernetes** | Container orchestration | Scheduling, networking, storage |
| **Object Storage** | Artifact persistence | Models, datasets, logs |
| **PostgreSQL** | Metadata storage | MLflow, Feast, Airflow metadata |
| **Redis Cluster** | Feature caching | Online store, session state |
| **Kafka** | Event streaming | Feature ingestion, triggers |

---

## Data Flow Diagrams

### Training Data Flow

```mermaid
sequenceDiagram
    participant DS as Data Scientist
    participant SDK as Python SDK
    participant Airflow as Airflow
    participant Ray as KubeRay
    participant Feast as Feast
    participant MLflow as MLflow
    participant Storage as Object Storage

    DS->>SDK: Define training pipeline
    SDK->>Airflow: Submit DAG

    Airflow->>Feast: Request training features
    Feast->>Feast: Point-in-time join
    Feast-->>Airflow: Feature DataFrame

    Airflow->>Ray: Submit training job
    Ray->>MLflow: Log parameters

    loop Training epochs
        Ray->>MLflow: Log metrics
    end

    Ray->>MLflow: Log model artifact
    Ray->>Storage: Save model files
    MLflow-->>Ray: Run ID

    Ray-->>Airflow: Training complete
    Airflow->>MLflow: Register model version
    MLflow-->>Airflow: Model version ID

    Airflow-->>DS: Pipeline complete
```

### Inference Data Flow

```mermaid
sequenceDiagram
    participant Client as Client App
    participant LB as Load Balancer
    participant KServe as KServe
    participant Transformer as Transformer
    participant FeatureServer as Feature Server
    participant Redis as Redis
    participant Predictor as Predictor
    participant Prometheus as Prometheus

    Client->>LB: Prediction request
    LB->>KServe: Route to InferenceService

    KServe->>Transformer: Pre-process
    Transformer->>FeatureServer: Get features (entity_id)
    FeatureServer->>Redis: Lookup features
    Redis-->>FeatureServer: Feature values
    FeatureServer-->>Transformer: Features

    Transformer->>Predictor: Enriched request
    Predictor->>Predictor: Model inference
    Predictor-->>Transformer: Raw prediction

    Transformer->>Transformer: Post-process
    Transformer-->>KServe: Final response
    KServe-->>LB: Response
    LB-->>Client: Prediction result

    KServe->>Prometheus: Log metrics
```

### Feature Ingestion Flow

```mermaid
sequenceDiagram
    participant Source as Data Source
    participant Kafka as Kafka
    participant Flink as Stream Processor
    participant Feast as Feast
    participant Redis as Online Store
    participant Lake as Offline Store
    participant Airflow as Airflow

    alt Streaming Path
        Source->>Kafka: Events
        Kafka->>Flink: Consume events
        Flink->>Flink: Compute features
        Flink->>Feast: Push features
        Feast->>Redis: Update online store
        Feast->>Lake: Append to offline store
    end

    alt Batch Path
        Airflow->>Source: Trigger batch job
        Source->>Feast: Batch features
        Feast->>Lake: Write to offline store
        Feast->>Redis: Backfill online store
    end
```

---

## Model Deployment Flow

```mermaid
flowchart TB
    subgraph Development["Development"]
        Train[Training Complete]
        Register[Register Model]
        Stage[Stage: None → Staging]
    end

    subgraph Validation["Validation"]
        Tests[Run Model Tests]
        Metrics[Validate Metrics]
        Approval[Human Approval]
    end

    subgraph Deployment["Deployment"]
        Promote[Stage: Staging → Production]
        CreateIS[Create InferenceService]
        Canary[Canary: 10% traffic]
        Monitor[Monitor Metrics]
        Rollout[Full Rollout: 100%]
    end

    subgraph Rollback["Rollback Path"]
        Alert[Alert Triggered]
        Rollback_Action[Rollback to Previous]
        Investigate[Investigate Issue]
    end

    Train --> Register
    Register --> Stage
    Stage --> Tests
    Tests --> Metrics
    Metrics --> Approval
    Approval --> Promote
    Promote --> CreateIS
    CreateIS --> Canary
    Canary --> Monitor
    Monitor -->|Healthy| Rollout
    Monitor -->|Degraded| Alert
    Alert --> Rollback_Action
    Rollback_Action --> Investigate

    classDef dev fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef val fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef deploy fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef rollback fill:#ffebee,stroke:#c62828,stroke-width:2px

    class Train,Register,Stage dev
    class Tests,Metrics,Approval val
    class Promote,CreateIS,Canary,Monitor,Rollout deploy
    class Alert,Rollback_Action,Investigate rollback
```

---

## Key Architectural Decisions

### Decision 1: Modular Composition vs Monolithic Platform

| Option | Pros | Cons |
|--------|------|------|
| **Modular OSS Composition** | Best-of-breed tools, no lock-in, independent updates | Integration complexity, more operational overhead |
| **Kubeflow (Monolithic)** | Integrated experience, single deployment | All-or-nothing, slower component updates |
| **Managed Platform (SageMaker)** | Fully managed, low ops | Vendor lock-in, less flexibility |

**Decision:** Modular OSS Composition

**Rationale:**
- Maximum flexibility to adopt emerging tools (e.g., vLLM for LLMs)
- No vendor lock-in enables multi-cloud deployment
- Each component can be upgraded independently
- Strong platform engineering team can handle integration

### Decision 2: Feature Store as Foundation

| Option | Pros | Cons |
|--------|------|------|
| **Feature Store-Centric** | Train-serve consistency, feature reuse | Additional complexity, learning curve |
| **Ad-hoc Feature Engineering** | Simpler initial setup | Feature skew, duplicate work, inconsistency |
| **Embedded Features** | Minimal infrastructure | Tightly coupled, hard to maintain |

**Decision:** Feature Store-Centric (Feast)

**Rationale:**
- Train-serve skew is the #1 cause of ML production bugs
- Feast provides point-in-time correctness for training
- Features become reusable assets across models
- Online/offline serving from single definition

### Decision 3: Orchestration Engine

| Option | Pros | Cons |
|--------|------|------|
| **Airflow 3.x** | Mature, large community, event-driven (3.x) | DAG-centric can be rigid |
| **Prefect 3.x** | Pythonic, transactional, fast | Smaller community |
| **Dagster** | Asset-centric, great lineage | Learning curve |
| **Kubeflow Pipelines** | K8s-native, integrated | Coupled to Kubeflow |

**Decision:** Airflow 3.x (primary), Prefect 3.x (alternative)

**Rationale:**
- Airflow 3.x adds event-driven scheduling critical for ML
- Largest community and ecosystem (320M+ downloads)
- Assets feature enables data-driven pipelines
- Well-understood by data engineering teams

### Decision 4: Model Serving Infrastructure

| Option | Pros | Cons |
|--------|------|------|
| **KServe** | CNCF project, serverless, LLM support | Requires Knative/Istio |
| **Seldon Core 2** | Drift detection built-in | Less serverless-native |
| **BentoML** | Simple developer experience | Less K8s-native |
| **Ray Serve** | Unified with training | Separate from K8s ecosystem |

**Decision:** KServe

**Rationale:**
- CNCF incubating project with strong governance
- Native serverless inference with scale-to-zero
- ModelMesh for efficient multi-model GPU sharing
- First-class LLM support in v0.15+
- InferenceGraph for complex pipelines

### Decision 5: Distributed Training

| Option | Pros | Cons |
|--------|------|------|
| **KubeRay** | Unified Ray ecosystem, auto-scaling | Learning Ray concepts |
| **Kubeflow Training Operator** | Native K8s CRDs | Limited to training |
| **Horovod** | Framework-agnostic | Manual setup |

**Decision:** KubeRay

**Rationale:**
- Uber, Spotify, OpenAI use Ray at scale
- Unified API for training and tuning
- KubeRay operator handles cluster lifecycle
- RayJob provides simple submission interface

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async Communication** | Async for training, Sync for inference | Training tolerates delays; inference needs low latency |
| **Event-driven vs Request-response** | Event-driven pipelines, request-response serving | Pipelines triggered by data; serving is synchronous |
| **Push vs Pull Model** | Push for streaming features, Pull for batch | Real-time updates pushed; batch pulls on schedule |
| **Stateless vs Stateful Services** | Stateless serving, Stateful orchestration | Serving scales horizontally; orchestration needs state |
| **Read-heavy vs Write-heavy** | Read-heavy (95% reads) | Inference dominates traffic |
| **Real-time vs Batch Processing** | Both | Online inference + batch scoring |
| **Edge vs Origin Processing** | Origin (data center) | ML workloads need GPU resources |

---

## Component Integration Matrix

```mermaid
flowchart LR
    subgraph Core["Core Components"]
        MLflow[MLflow]
        Feast[Feast]
        KServe[KServe]
        Airflow[Airflow]
    end

    subgraph Support["Supporting Infrastructure"]
        K8s[Kubernetes]
        S3[Object Storage]
        PG[PostgreSQL]
        Redis[Redis]
    end

    MLflow <--> Feast
    MLflow <--> KServe
    MLflow <--> Airflow
    Feast <--> KServe
    Feast <--> Airflow
    KServe <--> Airflow

    MLflow --> S3
    MLflow --> PG
    Feast --> S3
    Feast --> Redis
    Feast --> PG
    KServe --> K8s
    Airflow --> K8s
    Airflow --> PG

    classDef core fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef support fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class MLflow,Feast,KServe,Airflow core
    class K8s,S3,PG,Redis support
```

---

## Integration Points

### MLflow ↔ Feast Integration

```
Training Pipeline:
1. Feast provides point-in-time features for training dataset
2. MLflow logs feature schema as run artifact
3. Model registration includes feature dependencies

Inference Pipeline:
1. KServe loads model from MLflow Registry
2. Transformer calls Feast Feature Server
3. Features enriched request sent to predictor
```

### MLflow ↔ KServe Integration

```
Deployment Flow:
1. Model promoted to "Production" stage in MLflow
2. Airflow detects promotion event
3. Pipeline creates/updates KServe InferenceService
4. InferenceService pulls model from MLflow artifact store

Artifact Format:
- MLflow saves models in MLmodel format
- KServe supports mlflow:// URI scheme
- Model loaded via MLServer or custom runtime
```

### Feast ↔ KServe Integration

```
Real-time Enrichment:
1. KServe Transformer receives raw request
2. Transformer extracts entity keys
3. HTTP call to Feast Feature Server
4. Features merged with request
5. Enriched payload sent to Predictor
```

### Airflow ↔ All Components

```
Orchestration Patterns:
- Training: Airflow → KubeRay → MLflow
- Feature Backfill: Airflow → Feast (batch materialize)
- Model Deployment: Airflow → MLflow → KServe
- Monitoring: Airflow → Evidently → Alerting
```

---

## Deployment Topology

### Single-Cluster Deployment

```mermaid
flowchart TB
    subgraph Cluster["Kubernetes Cluster"]
        subgraph System["System Namespace"]
            Ingress[Ingress Controller]
            Istio[Istio/Knative]
        end

        subgraph Platform["mlplatform Namespace"]
            MLflow[MLflow]
            FeastServer[Feast Server]
            Airflow[Airflow]
        end

        subgraph Serving["model-serving Namespace"]
            KServe[KServe Controller]
            Models[InferenceServices]
        end

        subgraph Training["training Namespace"]
            RayOperator[KubeRay Operator]
            RayClusters[Ray Clusters]
        end

        subgraph Data["data Namespace"]
            Postgres[PostgreSQL]
            Redis[Redis]
        end

        subgraph Monitoring["monitoring Namespace"]
            Prometheus[Prometheus]
            Grafana[Grafana]
        end
    end

    subgraph External["External Services"]
        S3[Object Storage]
        Kafka[Kafka]
    end

    Ingress --> Platform
    Ingress --> Serving
    Platform --> Data
    Serving --> Data
    Training --> Platform
    Monitoring --> Platform
    Monitoring --> Serving
    Platform --> S3
    Platform --> Kafka

    classDef system fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef platform fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef serving fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef training fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef monitoring fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef external fill:#eceff1,stroke:#607d8b,stroke-width:2px

    class Ingress,Istio system
    class MLflow,FeastServer,Airflow platform
    class KServe,Models serving
    class RayOperator,RayClusters training
    class Postgres,Redis data
    class Prometheus,Grafana monitoring
    class S3,Kafka external
```

### Multi-Zone High Availability

| Component | Zone A | Zone B | Zone C |
|-----------|--------|--------|--------|
| **KServe Pods** | 3 replicas | 3 replicas | 3 replicas |
| **Feature Server** | 2 replicas | 2 replicas | 2 replicas |
| **MLflow Server** | 1 replica | 1 replica (standby) | - |
| **Airflow Scheduler** | Active | Standby | - |
| **PostgreSQL** | Primary | Replica | Replica |
| **Redis** | 2 nodes | 2 nodes | 2 nodes |

---

## Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Container Runtime** | containerd | 1.7+ | Container execution |
| **Orchestration** | Kubernetes | 1.28+ | Cluster management |
| **Service Mesh** | Istio | 1.20+ | Traffic management, mTLS |
| **Serverless** | Knative | 1.12+ | Scale-to-zero, revisions |
| **Experiment Tracking** | MLflow | 3.x | Experiments, model registry |
| **Feature Store** | Feast | 0.40+ | Feature management |
| **Model Serving** | KServe | 0.15+ | Inference, auto-scaling |
| **Orchestration** | Airflow | 3.x | Pipeline workflows |
| **Distributed Compute** | Ray | 2.x | Training, tuning |
| **Database** | PostgreSQL | 15+ | Metadata storage |
| **Cache** | Redis | 7+ | Online features, sessions |
| **Object Storage** | MinIO/S3 | - | Artifacts, datasets |
| **Streaming** | Kafka | 3.x | Event ingestion |
| **Monitoring** | Prometheus | 2.x | Metrics collection |
| **Visualization** | Grafana | 10+ | Dashboards |
| **Drift Detection** | Evidently | 0.5+ | Model monitoring |
| **Logging** | Loki | 2.x | Log aggregation |
