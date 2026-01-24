# High-Level Design

## Two-Environment Architecture

Metaflow's defining characteristic is the **two-environment model** where the same Python code executes identically in both development (laptop) and production (cloud) environments.

```mermaid
flowchart LR
    subgraph Dev["Development Environment"]
        DevCode["Python Script<br/>(@flow, @step)"]
        LocalExec["Local Runtime"]
        LocalData["Local Datastore<br/>(~/.metaflow)"]
    end

    subgraph Prod["Production Environment"]
        ProdCode["Same Python Script"]
        CloudExec["Cloud Runtime<br/>(AWS Batch / K8s)"]
        CloudData["Cloud Datastore<br/>(S3)"]
    end

    DevCode -->|"python flow.py run"| LocalExec
    LocalExec --> LocalData

    ProdCode -->|"python flow.py run --with batch"| CloudExec
    CloudExec --> CloudData

    LocalData -.->|"metaflow configure"| CloudData

    classDef dev fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef prod fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class DevCode,LocalExec,LocalData dev
    class ProdCode,CloudExec,CloudData prod
```

### Environment Characteristics

| Aspect | Development | Production |
|--------|-------------|------------|
| Execution | Local machine | AWS Batch / Kubernetes |
| State Storage | Local filesystem | S3 / Cloud blob storage |
| Metadata | Local SQLite or remote service | PostgreSQL via Metadata Service |
| Scaling | Single machine | Auto-scaling compute pools |
| Use Case | Iteration, debugging | Scheduled jobs, large-scale training |

---

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        PythonClient["Python Client<br/>(Metaflow SDK)"]
        Notebooks["Jupyter Notebooks"]
        CLI["CLI"]
    end

    subgraph ControlPlane["Control Plane"]
        subgraph MetadataCluster["Metadata Service Cluster"]
            MetadataAPI["Metadata API<br/>(REST)"]
            MetadataDB[("PostgreSQL<br/>Primary")]
            MetadataReplica[("PostgreSQL<br/>Replica")]
        end
        StepFunctions["Step Functions<br/>(Orchestrator)"]
    end

    subgraph DataPlane["Data Plane"]
        subgraph Datastore["Datastore Layer"]
            S3Bucket[("S3 Bucket<br/>Artifacts")]
            ContentIndex["Content-Addressed<br/>Index"]
        end
    end

    subgraph ComputePlane["Compute Plane"]
        subgraph BatchPool["AWS Batch"]
            BatchQueue["Job Queue"]
            BatchCompute["Compute Environment<br/>(EC2 Auto-Scaling)"]
        end
        subgraph K8sCluster["Kubernetes (Optional)"]
            K8sScheduler["Scheduler"]
            K8sPods["Worker Pods"]
        end
    end

    subgraph Observability["Observability"]
        MetaflowUI["Metaflow UI"]
        Logs["CloudWatch<br/>Logs"]
    end

    subgraph Netflix["Netflix-Specific"]
        Maestro["Maestro<br/>Scheduler"]
        EventBridge["Event Triggers"]
    end

    Clients --> MetadataAPI
    Clients --> StepFunctions

    MetadataAPI --> MetadataDB
    MetadataDB --> MetadataReplica

    StepFunctions --> BatchQueue
    StepFunctions --> K8sScheduler
    BatchQueue --> BatchCompute
    K8sScheduler --> K8sPods

    BatchCompute --> S3Bucket
    K8sPods --> S3Bucket
    BatchCompute --> MetadataAPI
    K8sPods --> MetadataAPI

    MetaflowUI --> MetadataAPI
    MetaflowUI --> S3Bucket
    BatchCompute --> Logs
    K8sPods --> Logs

    Maestro --> StepFunctions
    EventBridge --> Maestro

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef control fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef data fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef compute fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef observe fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef netflix fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class PythonClient,Notebooks,CLI client
    class MetadataAPI,MetadataDB,MetadataReplica,StepFunctions control
    class S3Bucket,ContentIndex data
    class BatchQueue,BatchCompute,K8sScheduler,K8sPods compute
    class MetaflowUI,Logs observe
    class Maestro,EventBridge netflix
```

---

## Component Responsibilities

| Component | Responsibility | Key Characteristics |
|-----------|----------------|---------------------|
| **Metaflow Client** | DAG parsing, step invocation, artifact serialization | Stateless, runs in user process |
| **Metadata Service** | Track flows, runs, steps, tasks, artifacts | Thin REST API over PostgreSQL |
| **PostgreSQL** | Store metadata with ACID guarantees | Primary + read replicas |
| **Datastore (S3)** | Store versioned artifacts | Content-addressed, immutable |
| **Step Functions** | Orchestrate multi-step execution in cloud | State machine per run |
| **AWS Batch** | Execute steps in containers | Auto-scaling compute pool |
| **Kubernetes** | Alternative compute backend | Pod-per-task execution |
| **Metaflow UI** | Visualize runs, browse artifacts | Read-only, queries metadata/datastore |
| **Maestro (Netflix)** | Production scheduling | Event-driven, cross-workflow dependencies |

---

## DAG Execution Patterns

Metaflow supports multiple DAG patterns through Python decorators and control flow.

```mermaid
flowchart TB
    subgraph Linear["Linear Flow"]
        L1[start] --> L2[step_a] --> L3[step_b] --> L4[end]
    end

    subgraph Branch["Branch Pattern"]
        B1[start] --> B2[branch_a]
        B1 --> B3[branch_b]
        B2 --> B4[join]
        B3 --> B4
        B4 --> B5[end]
    end

    subgraph Foreach["Foreach Pattern"]
        F1[start] --> F2[foreach]
        F2 --> F3a["process(0)"]
        F2 --> F3b["process(1)"]
        F2 --> F3c["process(N)"]
        F3a --> F4[join]
        F3b --> F4
        F3c --> F4
        F4 --> F5[end]
    end

    subgraph Conditional["Conditional Pattern"]
        C1[start] --> C2{condition}
        C2 -->|True| C3[path_a]
        C2 -->|False| C4[path_b]
        C3 --> C5[end]
        C4 --> C5
    end

    classDef default fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

### Pattern Semantics

| Pattern | Decorator/Syntax | Semantics |
|---------|------------------|-----------|
| **Linear** | `self.next(step_b)` | Sequential execution, artifacts passed forward |
| **Branch** | `self.next(step_a, step_b)` | Parallel execution, join step receives all branches |
| **Foreach** | `self.next(step, foreach='items')` | Parallel tasks per item, join aggregates results |
| **Conditional** | Python if/else in step | Choose one path at runtime |

---

## Data Flow Diagrams

### Local Execution Flow

```mermaid
sequenceDiagram
    participant User
    participant Client as Metaflow Client
    participant LocalRT as Local Runtime
    participant LocalDS as Local Datastore

    User->>Client: python flow.py run
    Client->>Client: Parse DAG from decorators
    Client->>LocalRT: Execute start step
    LocalRT->>LocalDS: Save step artifacts
    LocalRT->>Client: Step complete

    loop For each step in DAG
        Client->>LocalRT: Execute next step
        LocalRT->>LocalDS: Load input artifacts
        LocalRT->>LocalDS: Save output artifacts
        LocalRT->>Client: Step complete
    end

    Client->>User: Run complete
```

### Cloud Execution Flow (@batch)

```mermaid
sequenceDiagram
    participant User
    participant Client as Metaflow Client
    participant MetaSvc as Metadata Service
    participant SF as Step Functions
    participant Batch as AWS Batch
    participant S3 as S3 Datastore

    User->>Client: python flow.py run --with batch
    Client->>Client: Parse DAG from decorators
    Client->>MetaSvc: Create run record
    Client->>SF: Create state machine for run

    SF->>Batch: Submit start step job
    Batch->>S3: Download code/dependencies
    Batch->>Batch: Execute step
    Batch->>S3: Upload artifacts
    Batch->>MetaSvc: Update step status
    Batch->>SF: Step complete

    loop For each step in DAG
        SF->>Batch: Submit next step job
        Batch->>S3: Download input artifacts
        Batch->>Batch: Execute step
        Batch->>S3: Upload output artifacts
        Batch->>MetaSvc: Update step status
        Batch->>SF: Step complete
    end

    SF->>MetaSvc: Update run status: completed
    Client->>User: Run complete
```

### Resume Flow

```mermaid
sequenceDiagram
    participant User
    participant Client as Metaflow Client
    participant MetaSvc as Metadata Service
    participant Compute as Compute Layer
    participant S3 as S3 Datastore

    User->>Client: python flow.py resume
    Client->>MetaSvc: Get previous run state
    MetaSvc->>Client: Return run with failed step

    Client->>Client: Identify resume point
    Client->>MetaSvc: Create new run (clone artifacts)

    loop For completed steps
        Client->>S3: Reference existing artifacts (no copy)
    end

    loop From resume point
        Client->>Compute: Submit step job
        Compute->>S3: Load input artifacts
        Compute->>Compute: Execute step
        Compute->>S3: Upload output artifacts
        Compute->>MetaSvc: Update step status
    end

    Client->>User: Resume complete
```

---

## Key Architectural Decisions

### Decision 1: Python Decorators vs YAML DSL

| Context | Options | Choice | Rationale | Trade-off |
|---------|---------|--------|-----------|-----------|
| Workflow definition language | YAML/JSON (Airflow), Python DSL (Prefect), Decorators (Metaflow) | Python decorators | Minimal learning curve for data scientists, IDE support, type checking | Less explicit structure, harder to visualize statically |

### Decision 2: External State vs Embedded State

| Context | Options | Choice | Rationale | Trade-off |
|---------|---------|--------|-----------|-----------|
| State management | In-process (embedded), External services | External (Metadata Service + S3) | Stateless workers, durable checkpoints, resume capability | Network overhead, additional services to operate |

### Decision 3: Content-Addressed vs Path-Based Storage

| Context | Options | Choice | Rationale | Trade-off |
|---------|---------|--------|-----------|-----------|
| Artifact storage | Path-based (run/step/artifact), Content-addressed (SHA256) | Content-addressed | Automatic deduplication, immutability, cache-friendly | Garbage collection complexity, less intuitive browsing |

### Decision 4: Step Functions vs Custom Orchestrator

| Context | Options | Choice | Rationale | Trade-off |
|---------|---------|--------|-----------|-----------|
| Cloud orchestration | Build custom, Use Step Functions, Use Kubernetes CRDs | AWS Step Functions (default) | Managed, reliable, integrates with Batch | AWS lock-in, cost at scale |

### Decision 5: Foreach Implementation

| Context | Options | Choice | Rationale | Trade-off |
|---------|---------|--------|-----------|-----------|
| Parallel fan-out | Sequential loop, Spark/Ray, Native parallel | Native parallel tasks | Simplicity, no external dependency for moderate parallelism | Orchestration overhead at high cardinality (>10K items) |

---

## Architecture Pattern Checklist

| Pattern | Decision | Implementation |
|---------|----------|----------------|
| **Sync vs Async** | Async | Steps execute asynchronously, client polls for completion |
| **Event-Driven vs Request-Response** | Hybrid | Step Functions event-driven, Client API request-response |
| **Push vs Pull** | Pull | Workers pull code/artifacts from S3 |
| **Stateless vs Stateful** | Stateless workers | All state in Metadata Service + Datastore |
| **Read-Heavy vs Write-Heavy** | Balanced | Writes during execution, reads for queries/resume |
| **Real-time vs Batch** | Batch | Designed for batch ML workflows, not streaming |
| **Centralized vs Distributed** | Centralized metadata | Single Metadata Service, distributed compute |
| **Edge vs Origin** | Origin | Compute in cloud regions, not edge |

---

## Deployment Topology

```mermaid
flowchart TB
    subgraph Region1["AWS Region (Primary)"]
        subgraph VPC1["VPC"]
            subgraph PublicSubnet["Public Subnet"]
                ALB["Application<br/>Load Balancer"]
            end
            subgraph PrivateSubnet["Private Subnet"]
                MetaSvc1["Metadata Service<br/>(ECS/Fargate)"]
                MetaSvc2["Metadata Service<br/>(ECS/Fargate)"]
                RDSPrimary[("RDS PostgreSQL<br/>Primary")]
                RDSReplica[("RDS PostgreSQL<br/>Replica")]
            end
            subgraph ComputeSubnet["Compute Subnet"]
                Batch1["AWS Batch<br/>Compute Env"]
                Batch2["AWS Batch<br/>Compute Env (GPU)"]
            end
        end
        S3Primary[("S3 Bucket<br/>Artifacts")]
    end

    subgraph Region2["AWS Region (DR)"]
        S3Replica[("S3 Bucket<br/>Replica")]
        RDSStandby[("RDS PostgreSQL<br/>Standby")]
    end

    ALB --> MetaSvc1
    ALB --> MetaSvc2
    MetaSvc1 --> RDSPrimary
    MetaSvc2 --> RDSPrimary
    RDSPrimary --> RDSReplica

    Batch1 --> S3Primary
    Batch2 --> S3Primary
    Batch1 --> MetaSvc1
    Batch2 --> MetaSvc2

    RDSPrimary -.->|"Cross-region replication"| RDSStandby
    S3Primary -.->|"Cross-region replication"| S3Replica

    classDef network fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef database fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef storage fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef compute fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class ALB network
    class MetaSvc1,MetaSvc2 service
    class RDSPrimary,RDSReplica,RDSStandby database
    class S3Primary,S3Replica storage
    class Batch1,Batch2 compute
```

---

## Technology Stack

| Layer | Component | Technology | Purpose |
|-------|-----------|------------|---------|
| **Client** | SDK | Python 3.8+ | Workflow definition and execution |
| **Client** | Serialization | Pickle, Cloudpickle | Artifact serialization |
| **Control** | Metadata Service | Python (Flask/FastAPI) | REST API for metadata |
| **Control** | Metadata Store | PostgreSQL 13+ | ACID metadata storage |
| **Control** | Orchestrator | AWS Step Functions | State machine execution |
| **Data** | Artifact Store | Amazon S3 | Blob storage |
| **Data** | Content Hash | SHA256 | Deduplication |
| **Compute** | Batch | AWS Batch | Container execution |
| **Compute** | Container | Kubernetes | Alternative compute |
| **Compute** | Container Registry | Amazon ECR | Docker image storage |
| **Observe** | UI | React + Python backend | Visualization |
| **Observe** | Logs | CloudWatch Logs | Log aggregation |

---

## Integration Points

| Integration | Type | Purpose |
|-------------|------|---------|
| **AWS Batch** | Native | Primary compute backend |
| **Kubernetes** | Native | Alternative compute backend |
| **AWS Step Functions** | Native | Production orchestration |
| **Amazon S3** | Native | Artifact storage |
| **PostgreSQL** | Native | Metadata storage |
| **MLflow** | Plugin | Experiment tracking |
| **Weights & Biases** | Plugin | Experiment tracking |
| **Airflow** | External | Can schedule Metaflow runs |
| **Argo Workflows** | Plugin | Kubernetes orchestration |
| **Dask/Ray** | Step-level | Distributed compute within steps |
