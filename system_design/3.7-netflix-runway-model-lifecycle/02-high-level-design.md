# High-Level Design

## Architecture Overview

Netflix Runway consists of five core subsystems that work together to manage model lifecycle:

```mermaid
flowchart TB
    subgraph External["External Systems"]
        direction TB
        Metaflow["Metaflow<br/>Workflow Framework"]
        Maestro["Maestro<br/>Scheduler"]
        Axion["Axion<br/>Fact Store"]
        Titus["Titus<br/>Container Platform"]
        Kafka["Kafka<br/>Event Bus"]
    end

    subgraph Runway["Netflix Runway"]
        direction TB
        subgraph RegistryService["Registry Service"]
            ModelCatalog["Model Catalog"]
            VersionMgr["Version Manager"]
            PolicyStore["Policy Store"]
            RegistryDB[("Registry DB<br/>(PostgreSQL)")]
        end

        subgraph DependencyService["Dependency Service"]
            LineageParser["Lineage Parser"]
            GraphBuilder["Graph Builder"]
            ImpactEngine["Impact Engine"]
            GraphDB[("Graph DB<br/>(Neo4j)")]
        end

        subgraph HealthService["Health Service"]
            StalenessEngine["Staleness Engine"]
            DriftCalculator["Drift Calculator"]
            PerformanceMonitor["Performance Monitor"]
            MetricsDB[("Time-Series DB")]
        end

        subgraph GroundTruthService["Ground Truth Service"]
            PredictionLogger["Prediction Logger"]
            OutcomeCollector["Outcome Collector"]
            JoinPipeline["Join Pipeline"]
            GroundTruthDB[("Ground Truth Store")]
        end

        subgraph RetrainService["Retrain Service"]
            PolicyEvaluator["Policy Evaluator"]
            TriggerManager["Trigger Manager"]
            CascadeController["Cascade Controller"]
            WorkflowCoordinator["Workflow Coordinator"]
        end

        API["Runway API Gateway"]
    end

    subgraph Consumers["Consumers"]
        Dashboard["Runway Dashboard"]
        Alerts["Alert System"]
        Teams["ML Teams"]
    end

    Metaflow -->|"Workflow lineage"| LineageParser
    Metaflow -->|"Model artifacts"| ModelCatalog
    Axion -->|"Feature distributions"| DriftCalculator
    Kafka -->|"Prediction events"| PredictionLogger
    Kafka -->|"User events"| OutcomeCollector

    ModelCatalog --> RegistryDB
    VersionMgr --> RegistryDB
    PolicyStore --> RegistryDB

    LineageParser --> GraphBuilder
    GraphBuilder --> GraphDB
    ImpactEngine --> GraphDB

    StalenessEngine --> MetricsDB
    DriftCalculator --> MetricsDB
    PerformanceMonitor --> MetricsDB

    PredictionLogger --> JoinPipeline
    OutcomeCollector --> JoinPipeline
    JoinPipeline --> GroundTruthDB

    GroundTruthDB --> PerformanceMonitor
    MetricsDB --> PolicyEvaluator

    PolicyEvaluator --> TriggerManager
    TriggerManager --> CascadeController
    CascadeController --> WorkflowCoordinator
    WorkflowCoordinator --> Maestro

    API --> RegistryService
    API --> DependencyService
    API --> HealthService
    API --> RetrainService

    Dashboard --> API
    Alerts --> API
    Teams --> API

    classDef external fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef db fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef consumer fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class Metaflow,Maestro,Axion,Titus,Kafka external
    class ModelCatalog,VersionMgr,PolicyStore,LineageParser,GraphBuilder,ImpactEngine,StalenessEngine,DriftCalculator,PerformanceMonitor,PredictionLogger,OutcomeCollector,JoinPipeline,PolicyEvaluator,TriggerManager,CascadeController,WorkflowCoordinator,API service
    class RegistryDB,GraphDB,MetricsDB,GroundTruthDB db
    class Dashboard,Alerts,Teams consumer
```

---

## Key Architectural Decisions

### Decision 1: Separate Services vs Monolith

| Option | Pros | Cons |
|--------|------|------|
| **Monolith** | Simple deployment, shared state | Hard to scale independently |
| **Microservices** | Independent scaling, team ownership | Complexity, network calls |

**Decision: Domain-based Services (5 services)**

- Registry, Dependency, Health, Ground Truth, and Retrain services
- Each service owns its data store
- Services communicate via Kafka events + synchronous API for queries
- Rationale: Different scaling requirements (ground truth is write-heavy, registry is read-heavy)

### Decision 2: Dependency Storage

| Option | Pros | Cons |
|--------|------|------|
| **Relational (PostgreSQL)** | ACID, familiar | Poor graph traversal |
| **Graph Database (Neo4j)** | Native graph queries, fast traversal | Additional infrastructure |
| **Document Store** | Flexible schema | No native graph support |

**Decision: Graph Database (Neo4j/JanusGraph)**

- Dependencies are inherently a graph: models -> features -> data sources
- Impact analysis requires multi-hop traversal
- Cypher queries naturally express upstream/downstream relationships
- Rationale: Graph queries like "find all models affected by this feature change" are core operations

### Decision 3: Ground Truth Architecture

| Option | Pros | Cons |
|--------|------|------|
| **Batch Only** | Simple, accurate | High latency (24h+) |
| **Streaming Only** | Low latency | Complex, potential accuracy issues |
| **Lambda Architecture** | Best of both | Dual pipeline complexity |

**Decision: Lambda Architecture (Streaming + Batch)**

```mermaid
flowchart LR
    subgraph Input["Input Streams"]
        Predictions["Prediction<br/>Events"]
        Outcomes["Outcome<br/>Events"]
    end

    subgraph Speed["Speed Layer (Streaming)"]
        StreamJoin["Stream<br/>Join"]
        SpeedStore[("Speed View<br/>(Redis)")]
    end

    subgraph Batch["Batch Layer"]
        BatchJoin["Batch<br/>Join"]
        BatchStore[("Master Store<br/>(HDFS/S3)")]
    end

    subgraph Serving["Serving Layer"]
        MergeView["Merge View"]
        PerformanceAPI["Performance<br/>API"]
    end

    Predictions --> StreamJoin
    Outcomes --> StreamJoin
    StreamJoin --> SpeedStore

    Predictions --> BatchJoin
    Outcomes --> BatchJoin
    BatchJoin --> BatchStore

    SpeedStore --> MergeView
    BatchStore --> MergeView
    MergeView --> PerformanceAPI

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef speed fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef batch fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef serving fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class Predictions,Outcomes input
    class StreamJoin,SpeedStore speed
    class BatchJoin,BatchStore batch
    class MergeView,PerformanceAPI serving
```

- Speed layer: Approximate ground truth within hours for fast feedback
- Batch layer: Accurate ground truth with late-arriving labels
- Serving layer: Merges both views, prefers batch when available
- Rationale: Some signals need fast feedback, but accuracy matters for retraining decisions

### Decision 4: Staleness Detection Approach

| Option | Pros | Cons |
|--------|------|------|
| **Single Metric (Age)** | Simple | Misses performance issues |
| **Single Metric (Performance)** | Direct measure | Delayed feedback |
| **Multi-Signal Fusion** | Comprehensive | Complex thresholding |

**Decision: Multi-Signal Fusion with Configurable Policies**

- Combine age, data drift (PSI), concept drift (KL), and performance metrics
- Each model defines a staleness policy with weighted signals
- Policy engine evaluates composite staleness score
- Rationale: Different models have different staleness profiles; one-size-fits-all doesn't work

### Decision 5: Retraining Coordination

| Option | Pros | Cons |
|--------|------|------|
| **Direct Metaflow Trigger** | Simple | Bypasses scheduling |
| **Maestro Integration** | Unified scheduling, resource management | Additional dependency |
| **Custom Scheduler** | Full control | Duplicate functionality |

**Decision: Maestro Integration**

- Runway evaluates retraining policies and creates trigger requests
- Maestro handles actual workflow scheduling and resource allocation
- Benefits from Maestro's queue management, priority, and SLO enforcement
- Rationale: Maestro already handles 100K+ workflows; no need to rebuild scheduling

---

## Data Flow

### Model Registration Flow

```mermaid
sequenceDiagram
    participant Engineer as ML Engineer
    participant API as Runway API
    participant Registry as Registry Service
    participant Metaflow as Metaflow
    participant Dependency as Dependency Service

    Engineer->>API: Register Model (model_id, metadata)
    API->>Registry: Create Model Entry

    Registry->>Metaflow: Fetch Workflow Lineage
    Metaflow-->>Registry: Workflow Graph (features, data sources)

    Registry->>Dependency: Extract Dependencies
    Dependency->>Dependency: Build/Update Graph

    Registry-->>API: Model Registered
    API-->>Engineer: Success + Model ID

    Note over Dependency: Async: Discover transitive dependencies
    Dependency->>Dependency: Traverse upstream models
    Dependency->>Dependency: Link downstream consumers
```

### Staleness Detection Flow

```mermaid
sequenceDiagram
    participant Scheduler as Scheduled Job
    participant Health as Health Service
    participant Axion as Axion Fact Store
    participant GroundTruth as Ground Truth Service
    participant Registry as Registry Service
    participant Policy as Policy Evaluator

    Scheduler->>Health: Trigger Staleness Scan

    loop For Each Model
        Health->>Registry: Get Model + Policy
        Registry-->>Health: Model Metadata, Staleness Policy

        par Collect Signals
            Health->>Axion: Get Feature Distributions (current)
            Health->>Health: Compare to Training Distribution
            Health->>Health: Calculate PSI, KL Divergence
        and
            Health->>GroundTruth: Get Recent Performance
            GroundTruth-->>Health: Accuracy, Precision, Recall
        end

        Health->>Health: Calculate Age Signal
        Health->>Health: Fuse Signals (weighted)
        Health->>Policy: Evaluate Against Threshold
        Policy-->>Health: Staleness Decision

        alt Model is Stale
            Health->>Registry: Update Status (AT_RISK)
            Health->>Policy: Check Retrain Policy
        end
    end
```

### Retraining Trigger Flow

```mermaid
sequenceDiagram
    participant Health as Health Service
    participant Policy as Policy Evaluator
    participant Cascade as Cascade Controller
    participant Dependency as Dependency Service
    participant Retrain as Retrain Service
    participant Maestro as Maestro

    Health->>Policy: Model Marked Stale
    Policy->>Policy: Evaluate Retrain Policy

    alt Auto-Retrain Enabled
        Policy->>Cascade: Request Retrain Trigger
        Cascade->>Dependency: Get Downstream Models
        Dependency-->>Cascade: Downstream Model List

        Cascade->>Cascade: Check Concurrent Retrain Limit
        Cascade->>Cascade: Apply Cool-down Period

        alt Within Limits
            Cascade->>Retrain: Create Retrain Job
            Retrain->>Maestro: Submit Workflow
            Maestro-->>Retrain: Workflow ID
            Retrain->>Retrain: Track Job Status
        else Limit Exceeded
            Cascade->>Cascade: Queue for Later
            Cascade->>Health: Emit "Retrain Queued" Event
        end
    else Manual Review Required
        Policy->>Health: Emit "Review Required" Alert
    end
```

### Ground Truth Collection Flow

```mermaid
sequenceDiagram
    participant Model as Model Serving
    participant Kafka as Kafka
    participant Speed as Speed Layer
    participant Batch as Batch Layer
    participant Serving as Serving Layer
    participant Health as Health Service

    Model->>Kafka: Prediction Event<br/>(prediction_id, model_id, prediction, timestamp)

    Note over Model: User interacts with content...

    Model->>Kafka: Outcome Event<br/>(prediction_id, actual_outcome, timestamp)

    par Speed Layer (Streaming)
        Kafka->>Speed: Prediction + Outcome Events
        Speed->>Speed: Window Join (1-hour window)
        Speed->>Speed: Store in Redis (TTL: 24h)
    and Batch Layer (Daily)
        Kafka->>Batch: Events to HDFS
        Note over Batch: Daily batch job
        Batch->>Batch: Full Outer Join (7-day window)
        Batch->>Batch: Handle Late Arrivals
        Batch->>Batch: Store to Parquet
    end

    Health->>Serving: Query Performance Metrics
    Serving->>Serving: Merge Speed + Batch Views
    Serving-->>Health: Aggregated Performance
```

---

## Component Responsibilities

### Registry Service

| Component | Responsibility |
|-----------|---------------|
| **Model Catalog** | CRUD operations for model metadata, search, listing |
| **Version Manager** | Track model versions, artifacts, training runs |
| **Policy Store** | Store staleness and retrain policies per model |
| **Registry DB** | Persistent storage (PostgreSQL) |

### Dependency Service

| Component | Responsibility |
|-----------|---------------|
| **Lineage Parser** | Extract dependencies from Metaflow workflow metadata |
| **Graph Builder** | Construct and update dependency graph |
| **Impact Engine** | Compute upstream/downstream impact analysis |
| **Graph DB** | Store dependency relationships (Neo4j) |

### Health Service

| Component | Responsibility |
|-----------|---------------|
| **Staleness Engine** | Orchestrate periodic staleness checks |
| **Drift Calculator** | Compute PSI, KL divergence from distributions |
| **Performance Monitor** | Track model accuracy, precision, recall over time |
| **Metrics DB** | Time-series storage for historical metrics |

### Ground Truth Service

| Component | Responsibility |
|-----------|---------------|
| **Prediction Logger** | Capture predictions from serving layer |
| **Outcome Collector** | Capture user behavior/outcomes |
| **Join Pipeline** | Match predictions to outcomes |
| **Ground Truth DB** | Store joined prediction-outcome pairs |

### Retrain Service

| Component | Responsibility |
|-----------|---------------|
| **Policy Evaluator** | Evaluate retrain policies against staleness signals |
| **Trigger Manager** | Create and track retrain job requests |
| **Cascade Controller** | Prevent cascading retrains, manage queue |
| **Workflow Coordinator** | Interface with Maestro for execution |

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| Sync vs Async | **Both** | Sync for queries, async for events (Kafka) |
| Event-driven vs Request-response | **Event-driven** for data flow | Predictions/outcomes flow as events |
| Push vs Pull | **Pull** for staleness, **Push** for alerts | Scheduled scans + event-driven notifications |
| Stateless vs Stateful | **Stateless services** | State in databases, services horizontally scalable |
| Read-heavy vs Write-heavy | **Read-heavy** (Registry), **Write-heavy** (Ground Truth) | Different scaling per service |
| Real-time vs Batch | **Both** (Lambda architecture) | Speed layer + batch layer for ground truth |
| Edge vs Origin | **Origin only** | Lifecycle management is centralized |

---

## Integration Points

### Metaflow Integration

```
Direction: Runway <- Metaflow (read)
Data: Workflow lineage, model artifacts, training metadata
Method: Metaflow Metadata Service API
Frequency: On model registration, on workflow completion
```

### Maestro Integration

```
Direction: Runway -> Maestro (write)
Data: Retrain workflow triggers
Method: Maestro REST API
Frequency: On retrain decision (avg 25/day)
```

### Axion Integration

```
Direction: Runway <- Axion (read)
Data: Feature distributions (current production)
Method: Axion Query API
Frequency: Hourly for drift calculation
```

### Kafka Integration

```
Topics:
  - runway.predictions: Prediction events from serving
  - runway.outcomes: User behavior/outcome events
  - runway.staleness: Staleness status changes
  - runway.retrains: Retrain trigger events

Consumer Groups:
  - runway-ground-truth: Consumes predictions + outcomes
  - runway-alerts: Consumes staleness events
```

---

## Failure Scenarios and Handling

| Scenario | Impact | Handling |
|----------|--------|----------|
| Metaflow unavailable | Cannot register new models | Queue registrations, retry with backoff |
| Maestro unavailable | Cannot trigger retrains | Queue triggers, alert ops, manual fallback |
| Graph DB unavailable | No dependency queries | Serve from cache, degrade to model-only view |
| Ground Truth pipeline lag | Delayed performance metrics | Fall back to drift-only staleness |
| Kafka consumer lag | Delayed ground truth | Monitor lag, scale consumers |

---

## System Context Diagram

```mermaid
C4Context
    title System Context - Netflix Runway

    Person(engineer, "ML Engineer", "Develops and deploys models")
    Person(ops, "ML Ops", "Monitors model health")

    System(runway, "Netflix Runway", "Model Lifecycle Management")

    System_Ext(metaflow, "Metaflow", "Workflow Framework")
    System_Ext(maestro, "Maestro", "Scheduler")
    System_Ext(axion, "Axion", "Fact Store")
    System_Ext(titus, "Titus", "Serving Platform")
    System_Ext(pagerduty, "PagerDuty", "Alerting")

    Rel(engineer, runway, "Registers models, views health")
    Rel(ops, runway, "Monitors staleness, reviews retrains")

    Rel(runway, metaflow, "Reads workflow lineage")
    Rel(runway, maestro, "Triggers retraining workflows")
    Rel(runway, axion, "Reads feature distributions")
    Rel(runway, titus, "Receives prediction logs")
    Rel(runway, pagerduty, "Sends alerts")
```
