# High-Level Design

## Architecture Overview

FBLearner Flow's architecture centers on its revolutionary **futures-based execution model**. The system separates workflow definition from execution through a two-stage compilation process, enabling automatic parallelization of independent operators without requiring explicit orchestration code.

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        SDK["Python SDK"]
        AutoUI["Auto-Generated UI"]
        API["REST API"]
    end

    subgraph FlowEngine["FBLearner Flow Engine"]
        subgraph Compilation["Stage 1: DAG Compilation"]
            Parser["Workflow Parser"]
            FuturesEngine["Futures Engine"]
            TypeChecker["Type Checker"]
            DAGCompiler["DAG Compiler"]
        end

        subgraph Orchestration["Orchestration Layer"]
            Scheduler["Workflow Scheduler"]
            DependencyTracker["Dependency Tracker"]
            StateManager["State Manager"]
        end

        subgraph Execution["Stage 2: Operator Execution"]
            OperatorDispatcher["Operator Dispatcher"]
            ResourceAllocator["Resource Allocator"]
            DataMover["Data Mover"]
        end
    end

    subgraph MetadataLayer["Metadata & Storage"]
        WorkflowDB[("Workflow DB")]
        TypeRegistry[("Type Registry")]
        ArtifactStore[("Artifact Store")]
        MetricsDB[("Metrics DB")]
    end

    subgraph ComputeLayer["Compute Infrastructure"]
        subgraph SharedPool["Shared Resource Pool"]
            CPUCluster["CPU Cluster"]
            GPUCluster["GPU Cluster"]
        end
        Tupperware["Tupperware<br/>(Container Platform)"]
    end

    subgraph MLFrameworks["ML Frameworks"]
        PyTorch["PyTorch"]
        Caffe2["Caffe2"]
        ONNX["ONNX Exchange"]
    end

    subgraph Downstream["Downstream Systems"]
        FeatureStore["FBLearner<br/>Feature Store"]
        Predictor["FBLearner<br/>Predictor"]
    end

    SDK --> Parser
    AutoUI --> Parser
    API --> Parser

    Parser --> TypeChecker
    TypeChecker --> FuturesEngine
    FuturesEngine --> DAGCompiler

    DAGCompiler --> Scheduler
    Scheduler --> DependencyTracker
    DependencyTracker --> StateManager

    StateManager --> OperatorDispatcher
    OperatorDispatcher --> ResourceAllocator
    ResourceAllocator --> CPUCluster
    ResourceAllocator --> GPUCluster

    OperatorDispatcher --> DataMover
    DataMover --> ArtifactStore

    OperatorDispatcher --> Tupperware
    Tupperware --> PyTorch
    Tupperware --> Caffe2
    PyTorch --> ONNX
    ONNX --> Caffe2

    ArtifactStore --> Predictor
    FeatureStore --> OperatorDispatcher
    FeatureStore --> Predictor

    TypeRegistry --> AutoUI
    StateManager --> WorkflowDB
    OperatorDispatcher --> MetricsDB

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef compile fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef orchestrate fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef execute fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef storage fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef compute fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef framework fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef downstream fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class SDK,AutoUI,API client
    class Parser,FuturesEngine,TypeChecker,DAGCompiler compile
    class Scheduler,DependencyTracker,StateManager orchestrate
    class OperatorDispatcher,ResourceAllocator,DataMover execute
    class WorkflowDB,TypeRegistry,ArtifactStore,MetricsDB storage
    class CPUCluster,GPUCluster,Tupperware compute
    class PyTorch,Caffe2,ONNX framework
    class FeatureStore,Predictor downstream
```

---

## Core Data Flow

### Training Workflow Execution

```mermaid
sequenceDiagram
    participant User
    participant SDK as Python SDK
    participant Parser as Workflow Parser
    participant Futures as Futures Engine
    participant DAG as DAG Compiler
    participant Scheduler
    participant Allocator as Resource Allocator
    participant Operator as Operator Runner
    participant Store as Artifact Store

    User->>SDK: Define workflow with operators
    SDK->>Parser: Submit workflow definition

    rect rgb(255, 243, 224)
        Note over Parser,DAG: Stage 1: DAG Compilation
        Parser->>Futures: Parse operator calls
        Futures->>Futures: Return futures (not results)
        Futures->>Futures: Track data dependencies
        Futures->>DAG: Build dependency graph
        DAG->>DAG: Identify parallel paths
    end

    DAG->>Scheduler: Submit compiled DAG

    rect rgb(232, 245, 233)
        Note over Scheduler,Store: Stage 2: Operator Execution
        loop For each ready operator
            Scheduler->>Allocator: Request resources
            Allocator->>Operator: Allocate & start operator
            Operator->>Operator: Execute computation
            Operator->>Store: Store output artifacts
            Operator->>Scheduler: Signal completion
            Scheduler->>Scheduler: Update dependencies
        end
    end

    Scheduler->>User: Workflow complete notification
```

### Futures-Based Parallel Execution

```mermaid
flowchart TB
    subgraph Workflow["Workflow Definition (Sequential Code)"]
        direction TB
        W1["data = LoadDataOperator(path)"]
        W2["split = SplitOperator(data)"]
        W3["train = TrainOperator(split.train)"]
        W4["metrics = EvalOperator(split.test, train.model)"]
        W5["predictions = PredictOperator(split.test, train.model)"]
        W6["report = ReportOperator(metrics, predictions)"]

        W1 --> W2 --> W3
        W3 --> W4
        W3 --> W5
        W4 --> W6
        W5 --> W6
    end

    subgraph DAG["Compiled DAG (Parallel Execution)"]
        direction TB
        D1[("LoadData")]
        D2[("Split")]
        D3[("Train")]
        D4[("Eval")]
        D5[("Predict")]
        D6[("Report")]

        D1 --> D2
        D2 --> D3
        D3 --> D4
        D3 --> D5
        D4 --> D6
        D5 --> D6
    end

    subgraph Execution["Execution Timeline"]
        direction LR
        T1["T1: LoadData"]
        T2["T2: Split"]
        T3["T3: Train"]
        T4["T4: Eval + Predict<br/>(PARALLEL)"]
        T5["T5: Report"]

        T1 --> T2 --> T3 --> T4 --> T5
    end

    Workflow -->|"Futures compilation"| DAG
    DAG -->|"Dependency analysis"| Execution

    classDef workflow fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef dag fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef exec fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class W1,W2,W3,W4,W5,W6 workflow
    class D1,D2,D3,D4,D5,D6 dag
    class T1,T2,T3,T4,T5 exec
```

---

## Key Architectural Decisions

### 1. Futures-Based Execution Model

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Futures (Chosen)** | Automatic parallelization, sequential code style | More complex runtime | **Selected** |
| Eager Execution | Simple mental model | Manual parallelization | Rejected |
| Explicit DAG (Airflow-style) | Clear dependencies | Verbose, error-prone | Rejected |

**Justification:** Futures allow engineers to write natural, sequential-looking Python code while the system automatically identifies and exploits parallelism. This reduces cognitive load and eliminates manual dependency management errors.

### 2. Two-Stage Compilation

| Aspect | Stage 1: DAG Compilation | Stage 2: Execution |
|--------|--------------------------|-------------------|
| **Purpose** | Build complete dependency graph | Execute operators |
| **Output** | DAG with typed edges | Artifacts, metrics |
| **Timing** | Before any execution | After full DAG built |
| **Benefit** | Global optimization possible | Efficient scheduling |

**Justification:** Separating compilation from execution enables global DAG optimization (identifying all parallel paths) before committing any compute resources.

### 3. Operator Abstraction

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Typed Operators (Chosen)** | Reusability, auto UI, validation | Type system overhead | **Selected** |
| Raw Functions | Simple, flexible | No tooling support | Rejected |
| Task Graphs | Fine-grained | Too low-level | Rejected |

**Justification:** Strongly-typed operators enable automatic UI generation, type checking at compile time, and a rich library of reusable components.

### 4. Custom Type System

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Custom ML Types (Chosen)** | Semantic meaning, auto UI | Learning curve | **Selected** |
| Python Types | Standard, familiar | Not rich enough for ML | Rejected |
| Protocol Buffers | Cross-language | Verbose for ML data | Rejected |

**Justification:** Custom types like `FeatureSet`, `Dataset`, `Model` carry semantic meaning that enables workflow-agnostic tooling and automatic UI rendering.

### 5. Resource Declaration Model

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Declarative (Chosen)** | Auto-allocation, fairness | Less control | **Selected** |
| Manual Allocation | Full control | Error-prone, unfair | Rejected |
| Auto-detect | Zero config | Unpredictable | Rejected |

**Justification:** Operators declare their resource needs (CPU, GPU, memory), and the platform handles allocation with fairness across teams.

---

## Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---------|----------|---------------|
| Sync vs Async | **Async** | Long-running training jobs, event-driven completion |
| Event-driven vs Request-response | **Event-driven** | Operator completion triggers downstream execution |
| Push vs Pull | **Pull** | Operators pull data when ready to execute |
| Stateless vs Stateful | **Stateless operators** | State externalized to artifact store |
| Read-heavy vs Write-heavy | **Write-heavy (training)** | Large model artifacts, logs, metrics |
| Real-time vs Batch | **Batch (training)** | Training is batch; serving is separate system |
| Edge vs Origin | **Origin** | Centralized training in data centers |

---

## Component Deep Dive

### Workflow Parser

Parses Python workflow definitions and initiates the futures resolution process.

```
Responsibilities:
├── Parse workflow class and methods
├── Extract operator calls and parameters
├── Validate type annotations
├── Initialize futures tracking
└── Generate workflow metadata
```

### Futures Engine

The core innovation: tracks operator calls and builds the dependency graph without executing.

```
Responsibilities:
├── Intercept operator __call__ methods
├── Return Future objects instead of results
├── Track data dependencies between futures
├── Build adjacency list for DAG compiler
└── Detect cycles (error condition)
```

### DAG Compiler

Transforms futures into an optimized execution plan.

```
Responsibilities:
├── Topologically sort operators
├── Identify parallel execution paths
├── Optimize data locality
├── Generate execution schedule
└── Annotate with resource requirements
```

### Resource Allocator

Matches operator requirements to available resources with fairness.

```
Responsibilities:
├── Parse operator resource declarations
├── Query available pool capacity
├── Implement fairness scheduling
├── Handle priority and preemption
└── Track utilization metrics
```

### Auto UI Generator

Generates launch interfaces from typed workflow schemas.

```
Responsibilities:
├── Parse workflow input schema
├── Map types to UI components
├── Generate validation rules
├── Render typeaheads for complex types
└── Support custom plugins per team
```

---

## FBLearner Ecosystem Integration

```mermaid
flowchart LR
    subgraph DataLayer["Data Layer"]
        RawData[("Raw Data")]
        FeatureStore["FBLearner<br/>Feature Store"]
    end

    subgraph Training["Training (Flow)"]
        FlowEngine["FBLearner Flow"]
        Experiments["Experiments"]
    end

    subgraph Serving["Serving (Predictor)"]
        Predictor["FBLearner<br/>Predictor"]
        ModelRegistry["Model<br/>Registry"]
    end

    subgraph Products["Products"]
        NewsFeed["News Feed"]
        Ads["Ads"]
        Instagram["Instagram"]
    end

    RawData --> FeatureStore
    FeatureStore -->|"Training features"| FlowEngine
    FlowEngine --> Experiments
    FlowEngine -->|"Trained models"| ModelRegistry
    ModelRegistry --> Predictor
    FeatureStore -->|"Serving features"| Predictor
    Predictor --> NewsFeed
    Predictor --> Ads
    Predictor --> Instagram

    classDef data fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef training fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef serving fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef product fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class RawData,FeatureStore data
    class FlowEngine,Experiments training
    class Predictor,ModelRegistry serving
    class NewsFeed,Ads,Instagram product
```

---

## MWFS Evolution (2024)

The Meta Workflow Service (MWFS) represents the modern evolution of FBLearner Flow's orchestration layer.

```mermaid
flowchart TB
    subgraph Before["Before MWFS (Monolithic)"]
        direction TB
        OldSDK["SDK"]
        OldCore["FBLearner Core<br/>(Monolithic)"]
        OldDB[("1.7TB DB")]

        OldSDK --> OldCore
        OldCore --> OldDB
    end

    subgraph After["After MWFS (Separated)"]
        direction TB
        subgraph SDKLayer["SDK Layer"]
            FlowSDK["FBLearner SDK"]
            MLSDK["ML SDK"]
            CustomSDK["Custom SDKs"]
        end

        subgraph OrchestrationLayer["Orchestration (MWFS)"]
            StateTracker["State Tracker"]
            DependencyMgr["Dependency Manager"]
            ActionInvoker["Action Invoker"]
        end

        subgraph ActionLayer["Action Service"]
            Executors["Executors"]
            Backends["Compute Backends"]
        end

        subgraph ObservabilityLayer["Observability"]
            Events["Event Stream"]
            Metrics["Metrics"]
            Tracing["Tracing"]
        end

        ShardedDB[("Sharded DBs")]

        FlowSDK --> StateTracker
        MLSDK --> StateTracker
        CustomSDK --> StateTracker

        StateTracker --> DependencyMgr
        DependencyMgr --> ActionInvoker
        ActionInvoker --> Executors
        Executors --> Backends

        StateTracker --> Events
        Events --> Metrics
        Events --> Tracing

        StateTracker --> ShardedDB
    end

    Before -->|"Migration"| After

    classDef old fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef sdk fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef orch fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef action fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef obs fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class OldSDK,OldCore,OldDB old
    class FlowSDK,MLSDK,CustomSDK sdk
    class StateTracker,DependencyMgr,ActionInvoker orch
    class Executors,Backends action
    class Events,Metrics,Tracing obs
```

### MWFS Design Principles

| Principle | Description | Benefit |
|-----------|-------------|---------|
| **Separation of Concerns** | SDK, orchestration, execution, observability are separate | Independent scaling, evolution |
| **Event-Driven** | State changes emit events | Real-time observability |
| **Horizontally Scalable** | SQL + distributed queues | No single point of bottleneck |
| **Backend Agnostic** | Action Service abstracts execution | New backends without core changes |

---

## Framework Integration

```mermaid
flowchart TB
    subgraph Research["Research & Experimentation"]
        PyTorch["PyTorch<br/>(Flexible frontend)"]
        Notebooks["Jupyter<br/>Notebooks"]
    end

    subgraph Exchange["Model Exchange"]
        ONNX["ONNX Format"]
    end

    subgraph Production["Production Training & Serving"]
        Caffe2["Caffe2<br/>(Optimized backend)"]
        Quantized["Quantized<br/>Models"]
    end

    subgraph Serving["Inference"]
        Predictor["FBLearner Predictor"]
        Mobile["Mobile Inference"]
    end

    PyTorch -->|"Export"| ONNX
    Notebooks --> PyTorch
    ONNX -->|"Import"| Caffe2
    Caffe2 --> Quantized
    Caffe2 --> Predictor
    Quantized --> Mobile

    classDef research fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef exchange fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef production fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef serving fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class PyTorch,Notebooks research
    class ONNX exchange
    class Caffe2,Quantized production
    class Predictor,Mobile serving
```

### Framework Roles

| Framework | Role | Characteristics |
|-----------|------|-----------------|
| **PyTorch** | Research, exploration | Flexible, eager execution, rapid iteration |
| **Caffe2** | Production training & serving | Async execution, quantization, performance |
| **ONNX** | Model exchange | Framework interoperability |
| **TensorFlow** | Limited support | Legacy, some specialized models |

---

## Deployment Topology

```mermaid
flowchart TB
    subgraph Region1["Data Center Region 1"]
        subgraph FlowCluster1["Flow Cluster"]
            FlowAPI1["Flow API"]
            Scheduler1["Scheduler"]
            Workers1["Workers"]
        end

        subgraph Compute1["Compute"]
            GPU1["GPU Pool"]
            CPU1["CPU Pool"]
        end

        subgraph Storage1["Storage"]
            DB1[("Workflow DB")]
            Artifacts1[("Artifact Store")]
        end
    end

    subgraph Region2["Data Center Region 2"]
        subgraph FlowCluster2["Flow Cluster"]
            FlowAPI2["Flow API"]
            Scheduler2["Scheduler"]
            Workers2["Workers"]
        end

        subgraph Compute2["Compute"]
            GPU2["GPU Pool"]
            CPU2["CPU Pool"]
        end

        subgraph Storage2["Storage"]
            DB2[("Workflow DB")]
            Artifacts2[("Artifact Store")]
        end
    end

    subgraph Global["Global Services"]
        TypeRegistry["Type Registry"]
        ModelRegistry["Model Registry"]
        Predictor["FBLearner Predictor<br/>(Global)"]
    end

    FlowAPI1 --> Scheduler1
    Scheduler1 --> Workers1
    Workers1 --> GPU1
    Workers1 --> CPU1
    Workers1 --> Artifacts1
    Scheduler1 --> DB1

    FlowAPI2 --> Scheduler2
    Scheduler2 --> Workers2
    Workers2 --> GPU2
    Workers2 --> CPU2
    Workers2 --> Artifacts2
    Scheduler2 --> DB2

    DB1 <-->|"Replication"| DB2
    Artifacts1 <-->|"Replication"| Artifacts2

    Artifacts1 --> ModelRegistry
    Artifacts2 --> ModelRegistry
    ModelRegistry --> Predictor

    TypeRegistry --> FlowAPI1
    TypeRegistry --> FlowAPI2

    classDef cluster fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef compute fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef storage fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef global fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class FlowAPI1,Scheduler1,Workers1,FlowAPI2,Scheduler2,Workers2 cluster
    class GPU1,CPU1,GPU2,CPU2 compute
    class DB1,Artifacts1,DB2,Artifacts2 storage
    class TypeRegistry,ModelRegistry,Predictor global
```
