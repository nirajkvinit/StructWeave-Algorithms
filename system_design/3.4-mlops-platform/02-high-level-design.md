# High-Level Design

[Back to Index](./00-index.md)

---

## System Architecture

The MLOps Platform follows a modular architecture with clear separation between pipeline orchestration, experiment tracking, and model registry. Each component can scale independently while maintaining integration through well-defined APIs and shared storage.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        PythonSDK["Python SDK"]
        RSDK["R SDK"]
        CLI["CLI Tools"]
        WebUI["Web Dashboard"]
        CICD["CI/CD Pipelines"]
        Jupyter["Jupyter Notebooks"]
    end

    subgraph Gateway["API Gateway Layer"]
        LB["Load Balancer"]
        APIGateway["API Gateway"]
        AuthService["Auth Service<br/>(OAuth2/OIDC)"]
        RateLimiter["Rate Limiter"]
    end

    subgraph Orchestration["Pipeline Orchestration Service"]
        subgraph Scheduler["Scheduler"]
            DAGParser["DAG Parser"]
            TaskScheduler["Task Scheduler"]
            DepResolver["Dependency Resolver"]
            ResourceMgr["Resource Manager"]
        end
        subgraph ExecutionMgr["Execution Manager"]
            TaskQueue["Task Queue"]
            CheckpointMgr["Checkpoint Manager"]
            RetryHandler["Retry Handler"]
        end
    end

    subgraph Executors["Execution Layer"]
        K8sExecutor["Kubernetes<br/>Executor"]
        SparkExecutor["Spark<br/>Executor"]
        RayExecutor["Ray<br/>Executor"]
        LocalExecutor["Local<br/>Executor"]
    end

    subgraph Tracking["Experiment Tracking Service"]
        TrackingAPI["Tracking API"]
        RunManager["Run Manager"]
        MetricWriter["Metric Writer"]
        ArtifactHandler["Artifact Handler"]
        CompareEngine["Comparison Engine"]
    end

    subgraph Registry["Model Registry Service"]
        RegistryAPI["Registry API"]
        VersionMgr["Version Manager"]
        AliasMgr["Alias Manager"]
        StageMgr["Stage Manager"]
        LineageMgr["Lineage Manager"]
    end

    subgraph Storage["Storage Layer"]
        MetadataDB[("Metadata DB<br/>(PostgreSQL)")]
        MetricStore[("Metric Store<br/>(ClickHouse)")]
        ArtifactStore[("Artifact Store<br/>(Object Storage)")]
        SearchIndex[("Search Index<br/>(Elasticsearch)")]
    end

    subgraph Compute["Compute Infrastructure"]
        GPUCluster["GPU Clusters"]
        CPUCluster["CPU Clusters"]
        SpotFleet["Spot/Preemptible"]
    end

    subgraph External["External Integrations"]
        FeatureStore["Feature Store"]
        MLServing["ML Serving<br/>(3.2)"]
        DataLake["Data Lake"]
        NotificationSvc["Notifications"]
    end

    Clients --> LB
    LB --> APIGateway
    APIGateway --> AuthService
    APIGateway --> RateLimiter

    APIGateway --> Orchestration
    APIGateway --> Tracking
    APIGateway --> Registry

    Scheduler --> ExecutionMgr
    ExecutionMgr --> TaskQueue
    TaskQueue --> Executors
    Executors --> Compute

    Executors --> TrackingAPI
    TrackingAPI --> MetricWriter
    TrackingAPI --> ArtifactHandler

    MetricWriter --> MetricStore
    ArtifactHandler --> ArtifactStore
    RunManager --> MetadataDB

    RegistryAPI --> MetadataDB
    RegistryAPI --> ArtifactStore
    LineageMgr --> MetadataDB

    Registry --> External
    Tracking --> SearchIndex

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef orchestration fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef tracking fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef registry fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef compute fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class PythonSDK,RSDK,CLI,WebUI,CICD,Jupyter client
    class LB,APIGateway,AuthService,RateLimiter gateway
    class DAGParser,TaskScheduler,DepResolver,ResourceMgr,TaskQueue,CheckpointMgr,RetryHandler orchestration
    class TrackingAPI,RunManager,MetricWriter,ArtifactHandler,CompareEngine tracking
    class RegistryAPI,VersionMgr,AliasMgr,StageMgr,LineageMgr registry
    class MetadataDB,MetricStore,ArtifactStore,SearchIndex storage
    class GPUCluster,CPUCluster,SpotFleet,K8sExecutor,SparkExecutor,RayExecutor,LocalExecutor compute
```

---

## Data Flow Diagrams

### Training Pipeline Execution Flow

```mermaid
sequenceDiagram
    participant User as Data Scientist
    participant SDK as Python SDK
    participant API as API Gateway
    participant Scheduler as Pipeline Scheduler
    participant Executor as Task Executor
    participant Tracker as Experiment Tracker
    participant Registry as Model Registry
    participant Storage as Artifact Store

    User->>SDK: Define pipeline + submit
    SDK->>API: POST /pipelines/run
    API->>Scheduler: Schedule pipeline

    Scheduler->>Scheduler: Parse DAG
    Scheduler->>Scheduler: Resolve dependencies
    Scheduler->>Scheduler: Allocate resources

    loop For each task in topological order
        Scheduler->>Executor: Dispatch task
        Executor->>Tracker: mlflow.start_run()
        Executor->>Tracker: log_params(hyperparams)

        loop Training iterations
            Executor->>Executor: Train step
            Executor->>Tracker: log_metrics(loss, acc)
        end

        Executor->>Storage: Upload model artifact
        Executor->>Tracker: log_artifact(model_path)
        Executor->>Tracker: end_run()
        Executor->>Scheduler: Task complete
    end

    Scheduler->>Registry: Register model version
    Registry->>Storage: Link artifact
    Scheduler->>User: Pipeline complete notification
```

### Model Registration and Promotion Flow

```mermaid
sequenceDiagram
    participant DS as Data Scientist
    participant SDK as SDK
    participant Registry as Model Registry
    participant Storage as Artifact Store
    participant Approval as Approval System
    participant Serving as ML Serving

    DS->>SDK: mlflow.register_model(model_uri, name)
    SDK->>Registry: Create model version
    Registry->>Storage: Verify artifact exists
    Registry->>Registry: Assign version number
    Registry-->>SDK: version_id

    DS->>SDK: Set alias @candidate
    SDK->>Registry: set_alias("model", "@candidate", version)
    Registry->>Registry: Update alias pointer

    Note over DS,Serving: Validation in Staging

    DS->>SDK: Request stage transition to Production
    SDK->>Approval: Create approval request
    Approval->>Approval: Validate model card
    Approval->>Approval: Check bias metrics
    Approval-->>SDK: Approved

    SDK->>Registry: transition_stage(version, "Production")
    Registry->>Registry: Archive previous @champion
    Registry->>Registry: Set new @champion alias

    Registry->>Serving: Webhook: new production model
    Serving->>Registry: Fetch model by @champion
    Serving->>Storage: Download artifact
    Serving->>Serving: Deploy model
```

### Experiment Comparison Flow

```mermaid
sequenceDiagram
    participant User as User
    participant UI as Web Dashboard
    participant API as Tracking API
    participant MetricDB as Metric Store
    participant MetaDB as Metadata DB

    User->>UI: Select runs to compare
    UI->>API: GET /runs/compare?run_ids=[...]

    par Fetch metadata
        API->>MetaDB: Get run info, params
    and Fetch metrics
        API->>MetricDB: Get metrics for runs
    end

    API->>API: Aggregate metrics (min, max, last)
    API->>API: Compute metric diffs
    API-->>UI: Comparison result

    UI->>UI: Render comparison table
    UI->>UI: Render metric charts
    UI-->>User: Display comparison
```

---

## Key Architectural Decisions

### Decision 1: Pipeline Definition Language

| Option | Pros | Cons |
|--------|------|------|
| **Python SDK (code-first)** | Full expressiveness, IDE support, testable | Harder to visualize, version control of DAG |
| **YAML (config-first)** | Declarative, easy visualization, GitOps friendly | Limited expressiveness, no conditionals |
| **Hybrid (Recommended)** | Best of both - Python compiles to YAML | Additional complexity |

**Decision:** Hybrid approach where Python SDK generates serializable DAG definitions.

```
# Python definition
@pipeline
def training_pipeline(learning_rate: float):
    data = prepare_data()
    model = train_model(data, lr=learning_rate)
    evaluate_model(model)

# Compiles to YAML for execution
pipeline:
  name: training_pipeline
  tasks:
    - id: prepare_data
      operator: python
    - id: train_model
      depends_on: [prepare_data]
      params: {lr: "{{learning_rate}}"}
    - id: evaluate_model
      depends_on: [train_model]
```

### Decision 2: Metric Storage Backend

| Option | Pros | Cons |
|--------|------|------|
| **PostgreSQL** | Simple, ACID, familiar | Poor for time-series, cardinality issues |
| **InfluxDB** | Time-series optimized | Limited query flexibility |
| **ClickHouse (Recommended)** | High cardinality, fast aggregations, SQL | Operational complexity |
| **TimescaleDB** | PostgreSQL compatible, time-series | Scaling challenges |

**Decision:** ClickHouse for metric storage due to:
- High-cardinality support (millions of unique run IDs)
- Fast analytical queries (aggregations, comparisons)
- Efficient compression for numeric time-series
- SQL compatibility for ad-hoc queries

### Decision 3: Model Registry Consistency

| Option | Pros | Cons |
|--------|------|------|
| **Eventual consistency** | Higher availability, simpler | Alias race conditions possible |
| **Strong consistency (Recommended)** | Atomic alias updates, no phantom reads | Slightly lower availability |

**Decision:** Strong consistency for model registry because:
- Alias updates must be atomic (only one @champion at a time)
- Production deployment depends on correct alias resolution
- Acceptable trade-off given registry is not high-throughput

### Decision 4: Artifact Storage Strategy

| Option | Pros | Cons |
|--------|------|------|
| **Inline in DB** | Simple, transactional | Size limits, backup complexity |
| **Object storage (Recommended)** | Scalable, cost-effective, CDN-ready | Eventual consistency, separate system |
| **Distributed FS (HDFS)** | Fast for large files | Operational overhead |

**Decision:** Object storage (S3-compatible) because:
- Unlimited scale for PB of model artifacts
- Built-in durability (11 9s)
- Cost-effective for large files
- CDN integration for fast downloads

### Decision 5: Executor Architecture

| Option | Pros | Cons |
|--------|------|------|
| **Push-based** | Lower latency, simpler workers | Scheduler bottleneck |
| **Pull-based (Recommended)** | Scalable, workers self-pace | Polling overhead |
| **Hybrid** | Adaptive | Complexity |

**Decision:** Pull-based with long-polling because:
- Executors pull tasks from queue when ready
- Natural backpressure handling
- Easy horizontal scaling
- Fault-tolerant (task requeue on failure)

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Async for pipeline execution, sync for API | Training is long-running |
| **Event-driven vs Request-response** | Event-driven (task completion triggers next) | DAG workflow pattern |
| **Push vs Pull** | Pull-based task execution | Executor scalability |
| **Stateless vs Stateful** | Stateless services, stateful storage | Horizontal scaling |
| **Read-heavy vs Write-heavy** | Write-heavy (metrics), read-heavy (registry) | Tiered storage strategy |
| **Real-time vs Batch** | Batch metric writes, real-time alerts | Efficiency vs freshness |

---

## Component Interactions

### Service Dependencies

```mermaid
flowchart LR
    subgraph Core["Core Services"]
        Pipeline["Pipeline<br/>Orchestrator"]
        Tracking["Experiment<br/>Tracker"]
        Registry["Model<br/>Registry"]
    end

    subgraph Storage["Storage"]
        MetaDB[("Metadata DB")]
        MetricDB[("Metric Store")]
        ArtifactDB[("Artifact Store")]
    end

    subgraph Infra["Infrastructure"]
        Queue["Task Queue"]
        Cache["Cache Layer"]
    end

    Pipeline --> Queue
    Pipeline --> MetaDB
    Pipeline --> Tracking
    Pipeline --> Registry

    Tracking --> MetaDB
    Tracking --> MetricDB
    Tracking --> ArtifactDB
    Tracking --> Cache

    Registry --> MetaDB
    Registry --> ArtifactDB
    Registry --> Cache
```

### Failure Domain Isolation

| Service | Failure Impact | Isolation Strategy |
|---------|---------------|-------------------|
| Pipeline Scheduler | New jobs can't start | Leader election, job queue persists |
| Experiment Tracker | Metrics may buffer client-side | Client buffering, async writes |
| Model Registry | Can't promote models | Read replicas for queries |
| Metric Store | Historical queries fail | Hot/warm/cold tiering |
| Artifact Store | Can't download models | CDN caching, multi-region |

---

## Integration Points

### External System Integrations

```mermaid
flowchart TB
    subgraph MLOps["MLOps Platform"]
        Pipeline["Pipeline<br/>Orchestrator"]
        Tracker["Experiment<br/>Tracker"]
        Registry["Model<br/>Registry"]
    end

    subgraph Upstream["Upstream Systems"]
        DataLake["Data Lake"]
        FeatureStore["Feature Store"]
        LabelPlatform["Labeling Platform"]
    end

    subgraph Downstream["Downstream Systems"]
        MLServing["ML Serving<br/>(3.2)"]
        Monitoring["Model<br/>Monitoring"]
        CICD["CI/CD<br/>Pipeline"]
    end

    subgraph Notifications["Notification Channels"]
        Slack["Slack"]
        Email["Email"]
        Webhook["Webhooks"]
    end

    DataLake --> Pipeline
    FeatureStore --> Pipeline
    LabelPlatform --> Pipeline

    Registry --> MLServing
    Registry --> CICD
    Tracker --> Monitoring

    Pipeline --> Notifications
    Registry --> Notifications
```

### Integration Patterns

| Integration | Pattern | Protocol |
|-------------|---------|----------|
| Feature Store | SDK integration, point-in-time API | gRPC |
| Data Lake | URI-based references | S3/GCS protocol |
| ML Serving | Webhook on model promotion | HTTP + Object storage |
| CI/CD | API trigger, artifact download | REST API |
| Monitoring | Metric export, alert subscription | Prometheus/OpenTelemetry |

---

## Technology Mapping

### Recommended Stack

| Component | Primary Choice | Alternative |
|-----------|---------------|-------------|
| **API Gateway** | Kong / Envoy | NGINX Plus |
| **Pipeline Orchestrator** | Airflow / Dagster | Prefect, Kubeflow Pipelines |
| **Experiment Tracking** | MLflow | Weights & Biases, Neptune |
| **Model Registry** | MLflow Registry | Custom + Kubeflow |
| **Metadata Database** | PostgreSQL | CockroachDB |
| **Metric Storage** | ClickHouse | TimescaleDB |
| **Artifact Storage** | MinIO / S3-compatible | GCS, Azure Blob |
| **Task Queue** | Redis Streams / Kafka | RabbitMQ |
| **Search** | Elasticsearch | OpenSearch |
| **Cache** | Redis | Memcached |

---

## Security Architecture

### Network Topology

```mermaid
flowchart TB
    subgraph Public["Public Zone"]
        Internet["Internet"]
    end

    subgraph DMZ["DMZ"]
        LB["Load Balancer"]
        WAF["WAF"]
    end

    subgraph Private["Private Zone"]
        subgraph AppTier["Application Tier"]
            APIServers["API Servers"]
            TrackingServers["Tracking Servers"]
            SchedulerServers["Scheduler Servers"]
        end

        subgraph DataTier["Data Tier"]
            MetaDB[("Metadata DB")]
            MetricDB[("Metric Store")]
        end

        subgraph ComputeTier["Compute Tier"]
            GPUNodes["GPU Nodes"]
            CPUNodes["CPU Nodes"]
        end
    end

    subgraph Storage["Storage Zone"]
        ArtifactStore[("Artifact Store")]
    end

    Internet --> WAF
    WAF --> LB
    LB --> AppTier
    AppTier --> DataTier
    AppTier --> ComputeTier
    AppTier --> ArtifactStore
    ComputeTier --> ArtifactStore
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant SDK
    participant Gateway
    participant Auth as Auth Service
    participant API as MLOps API

    User->>SDK: Configure credentials
    SDK->>Auth: OAuth2 token request
    Auth->>Auth: Validate credentials
    Auth-->>SDK: Access token + refresh token

    SDK->>Gateway: API request + Bearer token
    Gateway->>Auth: Validate token
    Auth-->>Gateway: Token valid + claims
    Gateway->>API: Forward request + user context
    API-->>Gateway: Response
    Gateway-->>SDK: Response
```

---

## Deployment Architecture

### Multi-Environment Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Tracking │  │ Registry │  │ Pipeline │  Local/Dev Cluster   │
│  └──────────┘  └──────────┘  └──────────┘                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Promote artifacts
┌─────────────────────────────────────────────────────────────────┐
│                      STAGING                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Tracking │  │ Registry │  │ Pipeline │  Staging Cluster     │
│  └──────────┘  └──────────┘  └──────────┘                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Promote models (@champion)
┌─────────────────────────────────────────────────────────────────┐
│                     PRODUCTION                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Tracking │  │ Registry │  │ Pipeline │  Prod Cluster        │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                                              Multi-region       │
└─────────────────────────────────────────────────────────────────┘
```

### Kubernetes Deployment

```yaml
# Simplified deployment structure
namespace: mlops-platform

deployments:
  - name: tracking-server
    replicas: 6
    resources:
      cpu: 4
      memory: 16Gi
    hpa:
      min: 3
      max: 20
      metric: cpu_utilization
      target: 70%

  - name: registry-api
    replicas: 4
    resources:
      cpu: 2
      memory: 8Gi

  - name: pipeline-scheduler
    replicas: 3  # Leader election
    resources:
      cpu: 8
      memory: 32Gi

statefulsets:
  - name: metadata-postgres
    replicas: 3  # Primary + 2 replicas
    storage: 1Ti

  - name: metric-clickhouse
    replicas: 8
    storage: 4Ti per node
```
