# Netflix Runway Model Lifecycle Management

## Overview

**Netflix Runway** is a model lifecycle management system responsible for managing the health and freshness of all ML models driving Netflix personalization. Presented at USENIX OpML '20 by Eugen Cepoi and Liping Peng from Netflix's Personalization Infrastructure team, Runway addresses the critical challenge of maintaining hundreds of production ML models over time - detecting when models become stale, discovering dependencies between models, collecting ground truth for performance measurement, and automatically triggering retraining when needed.

**Key Differentiator:** While Metaflow handles "how to run" ML pipelines and Maestro handles "when to run" them, Runway focuses on "what is the health of deployed models" - the post-deployment lifecycle that determines whether a model is still serving its purpose effectively.

---

## System Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| Traffic Pattern | Event-driven + periodic scans | Background processing, not real-time serving |
| Latency Sensitivity | Low (async operations) | Optimize for accuracy over speed |
| Consistency Model | Eventual (metrics), Strong (registry) | Daily aggregations acceptable for drift metrics |
| Availability Target | 99.9% for Model Registry | Staleness detection can tolerate brief delays |
| State Management | Event-sourced | Full audit trail of model state transitions |
| Scale Target | 500+ models, 100K+ workflows | Graph with thousands of dependency edges |

---

## Complexity Rating

| Component | Rating | Justification |
|-----------|--------|---------------|
| **Overall** | High | Combines graph-based dependency tracking with statistical drift detection algorithms |
| Model Registry | Medium | CRUD operations with versioning, lineage tracking, and policy management |
| Dependency Graph Engine | High | DAG construction, cycle detection, impact analysis, auto-discovery |
| Staleness Detection | Very High | Multi-signal drift detection (PSI, KL divergence, performance), statistical rigor |
| Ground Truth Collection | High | Delayed label handling, streaming/batch joins, attribution windows |
| Auto-Retraining Engine | High | Policy evaluation, trigger coordination, cascade management |
| Maestro Integration | Medium | Event-driven workflow triggering, status synchronization |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, APIs, algorithms (PSI, KL divergence, staleness fusion) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Dependency graph, ground truth pipeline, staleness engine |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Model governance, access control, audit logging |
| [07 - Observability](./07-observability.md) | Metrics, dashboards, drift monitoring, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-minute pacing, trap questions, trade-offs |

---

## Core Components

| Component | Responsibility | Key Innovation |
|-----------|----------------|----------------|
| **Model Registry** | Centralized catalog of all deployed models | Stores dependency metadata alongside versioning, not just artifacts |
| **Dependency Graph Engine** | Discover and maintain model relationships | Auto-discovery from Metaflow lineage, not manual declaration |
| **Ground Truth Collector** | Gather actual outcomes for predictions | Handles delayed labels with attribution windows |
| **Staleness Detector** | Monitor data drift, concept drift, performance decay | Multi-signal fusion with configurable policies |
| **Retraining Orchestrator** | Trigger and coordinate model retraining | Policy-based decisions, not just threshold crossings |
| **Maestro Integration** | Workflow coordination and scheduling | Event-driven triggers into existing orchestration |

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph Sources["Data Sources"]
        Metaflow["Metaflow<br/>Workflows"]
        Maestro["Maestro<br/>Scheduler"]
        Predictions["Prediction<br/>Logs"]
        Events["User<br/>Events"]
    end

    subgraph Runway["Runway Core"]
        subgraph Registry["Model Registry"]
            ModelCatalog["Model Catalog"]
            VersionStore["Version Store"]
            MetadataDB[("Metadata DB")]
        end

        subgraph DependencyEngine["Dependency Engine"]
            GraphBuilder["Graph Builder"]
            ImpactAnalyzer["Impact Analyzer"]
            DependencyDB[("Graph DB")]
        end

        subgraph HealthEngine["Health Engine"]
            StalenessDetector["Staleness<br/>Detector"]
            DriftMonitor["Drift<br/>Monitor"]
            PerformanceTracker["Performance<br/>Tracker"]
        end

        subgraph RetrainEngine["Retrain Engine"]
            PolicyEngine["Policy Engine"]
            TriggerEvaluator["Trigger<br/>Evaluator"]
            PipelineCoordinator["Pipeline<br/>Coordinator"]
        end
    end

    subgraph GroundTruth["Ground Truth Pipeline"]
        LabelCollector["Label Collector"]
        FeedbackJoiner["Feedback Joiner"]
        GroundTruthStore[("Ground Truth<br/>Store")]
    end

    subgraph Actions["Actions"]
        RetrainTrigger["Retrain<br/>Trigger"]
        Alerting["Alerting"]
        Dashboard["Dashboard"]
    end

    Metaflow --> GraphBuilder
    Metaflow --> ModelCatalog
    Maestro --> PipelineCoordinator
    Predictions --> LabelCollector
    Events --> LabelCollector

    GraphBuilder --> DependencyDB
    LabelCollector --> FeedbackJoiner
    FeedbackJoiner --> GroundTruthStore

    GroundTruthStore --> PerformanceTracker
    DependencyDB --> ImpactAnalyzer

    StalenessDetector --> PolicyEngine
    DriftMonitor --> PolicyEngine
    PerformanceTracker --> PolicyEngine

    PolicyEngine --> TriggerEvaluator
    TriggerEvaluator --> RetrainTrigger
    TriggerEvaluator --> Alerting

    RetrainTrigger --> Maestro

    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef registry fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef engine fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef ground fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef action fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class Metaflow,Maestro,Predictions,Events source
    class ModelCatalog,VersionStore,MetadataDB registry
    class GraphBuilder,ImpactAnalyzer,DependencyDB,StalenessDetector,DriftMonitor,PerformanceTracker,PolicyEngine,TriggerEvaluator,PipelineCoordinator engine
    class LabelCollector,FeedbackJoiner,GroundTruthStore ground
    class RetrainTrigger,Alerting,Dashboard action
```

---

## Netflix ML Ecosystem Integration

Runway operates as part of Netflix's broader ML infrastructure:

```mermaid
flowchart LR
    subgraph DataLayer["Data Layer"]
        Axion["Axion<br/>Fact Store"]
        DataWarehouse["Data<br/>Warehouse"]
    end

    subgraph MLPlatform["ML Platform"]
        Metaflow["Metaflow<br/>Workflows"]
        Maestro["Maestro<br/>Scheduler"]
        Runway["Runway<br/>Lifecycle"]
    end

    subgraph Serving["Serving Layer"]
        Titus["Titus<br/>Containers"]
        FoundationModel["Foundation<br/>Model"]
    end

    subgraph Personalization["Personalization"]
        Recommendations["Recommendations"]
        Search["Search"]
        Discovery["Discovery"]
    end

    Axion --> Metaflow
    DataWarehouse --> Metaflow

    Metaflow --> Maestro
    Maestro --> Runway
    Runway --> Maestro

    Metaflow --> Titus
    FoundationModel --> Titus

    Titus --> Recommendations
    Titus --> Search
    Titus --> Discovery

    classDef data fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef platform fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef serving fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef personalization fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class Axion,DataWarehouse data
    class Metaflow,Maestro,Runway platform
    class Titus,FoundationModel serving
    class Recommendations,Search,Discovery personalization
```

---

## Runway vs Related Systems

| Aspect | Runway | Metaflow | Maestro | MLflow |
|--------|--------|----------|---------|--------|
| **Primary Focus** | Model lifecycle health | Workflow orchestration | Job scheduling | Experiment tracking |
| **Key Question Answered** | "Is this model still healthy?" | "How to run this pipeline?" | "When to run this job?" | "What experiments ran?" |
| **Staleness Detection** | Core feature | N/A | N/A | Limited |
| **Dependency Graph** | Yes, auto-discovered | Workflow lineage only | Job dependencies | N/A |
| **Ground Truth** | Built-in collection | N/A | N/A | Manual logging |
| **Auto-Retraining** | Policy-based triggers | Manual | Schedule-based | N/A |
| **Integration** | Consumes Metaflow/Maestro | Standalone | Standalone | Standalone |

---

## Key Numbers

| Metric | Value | Context |
|--------|-------|---------|
| Netflix subscribers | 300M+ | Global personalization at scale |
| Production models | 500+ | Personalization, discovery, search |
| Metaflow projects | 3,000+ | Training pipelines generating models |
| Daily predictions | Billions | Ground truth collection volume |
| Recommendation contribution | 80%+ | Of all viewing hours |
| Foundation model refresh | Daily | Fine-tuning with embedding stability |
| Maestro workflows | 100K+ | Concurrent workflow capacity |

---

## Model Lifecycle States

```mermaid
stateDiagram-v2
    [*] --> Registered: Model Registration
    Registered --> Active: Deployed to Production

    Active --> Monitoring: Continuous Health Checks
    Monitoring --> Active: Healthy

    Monitoring --> AtRisk: Drift Detected
    AtRisk --> Retraining: Policy Triggered
    AtRisk --> Active: False Alarm

    Retraining --> Validating: Training Complete
    Validating --> Active: Validation Passed
    Validating --> Rollback: Validation Failed

    Rollback --> Active: Previous Version Restored

    Active --> Deprecated: Manual Deprecation
    AtRisk --> Deprecated: Extended Staleness

    Deprecated --> [*]: Retired

    note right of AtRisk
        Staleness score > threshold
        OR performance drop detected
        OR data drift significant
    end note

    note right of Retraining
        Coordinated via Maestro
        New training run in Metaflow
    end note
```

---

## Interview Readiness Checklist

- [ ] Explain the difference between Runway (lifecycle) and Metaflow (workflow)
- [ ] Understand dependency graph construction from pipeline lineage
- [ ] Know staleness detection techniques (PSI, KL divergence, performance drift)
- [ ] Describe ground truth collection challenges with delayed labels
- [ ] Explain auto-retraining policy engine vs simple threshold triggers
- [ ] Know how cascading staleness is detected via dependency graph
- [ ] Understand embedding stability challenges for foundation models
- [ ] Describe trade-offs: accuracy vs latency in staleness detection
- [ ] Know integration patterns with Maestro for retraining coordination
- [ ] Explain canary deployments and rollback strategies for retrained models

---

## Quick Reference Card

```
+-----------------------------------------------------------------------+
|          NETFLIX RUNWAY - QUICK REFERENCE                              |
+-----------------------------------------------------------------------+
|                                                                        |
|  CORE COMPONENTS                   SCALE TARGETS                       |
|  ----------------                  --------------                       |
|  * Model Registry                  * 500+ registered models            |
|  * Dependency Graph Engine         * 5,000+ dependency edges           |
|  * Ground Truth Collector          * Billions of predictions/day       |
|  * Staleness Detector              * <1 hour detection latency         |
|  * Retraining Orchestrator         * 50+ concurrent retrains           |
|  * Maestro Integration             * 100K+ workflows                   |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  STALENESS SIGNALS                 TRIGGER TYPES                       |
|  -----------------                 --------------                       |
|  * Age-based (days since train)    * Performance threshold             |
|  * Data drift (PSI on inputs)      * Drift threshold                   |
|  * Concept drift (output shift)    * Scheduled                         |
|  * Performance drop (vs baseline)  * Manual                            |
|  * Embedding instability           * Cascade (upstream stale)          |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  INTERVIEW KEYWORDS                                                    |
|  ------------------                                                    |
|  Model registry, dependency graph, staleness detection, drift,         |
|  PSI, KL divergence, ground truth, delayed labels, auto-retraining,   |
|  policy engine, Maestro integration, cascade analysis, embedding       |
|  stability, canary deployment, rollback, model health monitoring       |
|                                                                        |
+-----------------------------------------------------------------------+
```

---

## Related Systems

- [3.4 MLOps Platform](../3.4-mlops-platform/00-index.md) - Generic MLOps patterns and concepts
- [3.5 Uber Michelangelo](../3.5-uber-michelangelo-ml-platform/00-index.md) - Feature store-centric ML platform
- [3.6 Netflix Metaflow](../3.6-netflix-metaflow-ml-workflow-platform/00-index.md) - Workflow orchestration framework
- [2.6 Distributed Job Scheduler](../2.6-distributed-job-scheduler/00-index.md) - General scheduling patterns
- [1.18 Event Sourcing System](../1.18-event-sourcing-system/00-index.md) - Event-driven state management

---

## References

- [Runway - Model Lifecycle Management at Netflix | USENIX OpML '20](https://www.usenix.org/conference/opml20/presentation/cepoi) - Original presentation
- [Supporting Diverse ML Systems at Netflix](https://netflixtechblog.com/supporting-diverse-ml-systems-at-netflix-2d2e6b6d205d) - ML platform overview
- [ML Observability at Netflix](https://netflixtechblog.com/ml-observability-bring-transparency-to-payments-and-beyond-33073e260a38) - Monitoring practices
- [Maestro: Netflix's Workflow Orchestrator](https://netflixtechblog.com/maestro-netflixs-workflow-orchestrator-ee13a06f9c78) - Scheduler integration
- [Evolution of ML Fact Store (Axion)](https://netflixtechblog.com/evolution-of-ml-fact-store-5941d3231762) - Training-serving consistency
- [Foundation Model for Personalized Recommendation](https://netflixtechblog.com/foundation-model-for-personalized-recommendation-1a0bd8e02d39) - Unified model approach
- [Integrating Netflix's Foundation Model](https://netflixtechblog.medium.com/integrating-netflixs-foundation-model-into-personalization-applications-cf176b5860eb) - Embedding stability
- [Netflix Maestro GitHub](https://github.com/Netflix/maestro) - Open-source orchestrator
