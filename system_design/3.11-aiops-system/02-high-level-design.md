# High-Level Design

This document describes the high-level architecture, data flows, and key design decisions for the AIOps system.

---

## Architecture Overview

The AIOps system follows a **five-layer architecture** that implements the Observe-Analyze-Act paradigm:

```mermaid
flowchart TB
    subgraph External["External Systems"]
        direction LR
        MON[Monitoring Tools]
        ITSM[ITSM Systems]
        CLOUD[Cloud Platforms]
        NOTIFY[Notification Channels]
    end

    subgraph L1["Layer 1: Ingestion"]
        direction LR
        TC[Telemetry Collector]
        AR[Alert Receiver]
        NR[Normalizer]
        EN[Enricher]
    end

    subgraph L2["Layer 2: Stream Processing"]
        direction LR
        MQ[(Message Queue)]
        SP[Stream Processor]
        AGG[Aggregator]
        FE[Feature Extractor]
    end

    subgraph L3["Layer 3: Analytics"]
        direction LR
        AD[Anomaly Detection]
        AC[Alert Correlation]
        RCA[RCA Engine]
        PRED[Predictive Engine]
    end

    subgraph L4["Layer 4: Action"]
        direction LR
        AO[Automation Orchestrator]
        RB[Runbook Engine]
        NS[Notification Service]
        ESC[Escalation Manager]
    end

    subgraph L5["Layer 5: Knowledge"]
        direction LR
        TG[(Topology Graph)]
        MR[(Model Registry)]
        FB[Feedback Loop]
        KB[(Knowledge Base)]
    end

    subgraph Storage["Storage Layer"]
        direction LR
        TSDB[(Time-Series DB)]
        DOC[(Document Store)]
        CACHE[(Cache)]
        OBJ[(Object Storage)]
    end

    External --> L1
    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> External

    L3 <--> L5
    L2 --> Storage
    L3 --> Storage
    L4 --> Storage
    L5 --> Storage

    classDef external fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef ingestion fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef stream fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef analytics fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef action fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef knowledge fill:#ede7f6,stroke:#4527a0,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class MON,ITSM,CLOUD,NOTIFY external
    class TC,AR,NR,EN ingestion
    class MQ,SP,AGG,FE stream
    class AD,AC,RCA,PRED analytics
    class AO,RB,NS,ESC action
    class TG,MR,FB,KB knowledge
    class TSDB,DOC,CACHE,OBJ storage
```

---

## Layer Descriptions

### Layer 1: Ingestion Layer

**Purpose:** Collect and normalize telemetry data from heterogeneous sources.

| Component | Responsibility | Input | Output |
|-----------|----------------|-------|--------|
| Telemetry Collector | Receive metrics, logs, traces via OTLP/Prometheus/custom protocols | Raw telemetry | Normalized events |
| Alert Receiver | Receive alerts from external alerting systems | Webhook alerts | Unified alert format |
| Normalizer | Transform data to common schema | Heterogeneous data | Normalized data |
| Enricher | Add metadata (host info, service tags) | Normalized data | Enriched data |

### Layer 2: Stream Processing Layer

**Purpose:** Process data in real-time, aggregate, and extract features for ML.

| Component | Responsibility | Input | Output |
|-----------|----------------|-------|--------|
| Message Queue | Buffer and distribute events | Enriched events | Partitioned streams |
| Stream Processor | Real-time transformation and filtering | Event streams | Processed events |
| Aggregator | Compute time-window aggregations | Raw metrics | Aggregated metrics |
| Feature Extractor | Extract ML features from telemetry | Aggregated data | Feature vectors |

### Layer 3: Analytics Layer

**Purpose:** Detect anomalies, correlate alerts, and identify root causes.

| Component | Responsibility | Input | Output |
|-----------|----------------|-------|--------|
| Anomaly Detection | Three-tier ML/statistical detection | Feature vectors | Anomaly alerts |
| Alert Correlation | Cluster related alerts into incidents | Raw alerts | Incidents |
| RCA Engine | Identify root cause using causal inference | Incidents + topology | Root cause rankings |
| Predictive Engine | Forecast future issues | Historical data | Predictive alerts |

### Layer 4: Action Layer

**Purpose:** Execute automated remediations and notify stakeholders.

| Component | Responsibility | Input | Output |
|-----------|----------------|-------|--------|
| Automation Orchestrator | Coordinate runbook execution | RCA results | Remediation actions |
| Runbook Engine | Execute remediation scripts | Action requests | Execution results |
| Notification Service | Send alerts to channels | Incidents | Notifications |
| Escalation Manager | Handle escalation policies | Unresolved incidents | Escalations |

### Layer 5: Knowledge Layer

**Purpose:** Maintain state, models, and domain knowledge.

| Component | Responsibility | Input | Output |
|-----------|----------------|-------|--------|
| Topology Graph | Store service dependencies | Discovery data | Dependency queries |
| Model Registry | Version and serve ML models | Trained models | Model artifacts |
| Feedback Loop | Collect operator feedback | User actions | Training labels |
| Knowledge Base | Store runbooks, documentation | Documentation | Query results |

---

## Data Flow Diagrams

### Flow 1: Metric Ingestion and Anomaly Detection

```mermaid
sequenceDiagram
    participant S as Source System
    participant TC as Telemetry Collector
    participant MQ as Message Queue
    participant SP as Stream Processor
    participant AD as Anomaly Detection
    participant TSDB as Time-Series DB
    participant NS as Notification

    S->>TC: Send metrics (OTLP/Prometheus)
    TC->>TC: Validate & normalize
    TC->>MQ: Publish to metrics topic

    par Store and Detect
        MQ->>TSDB: Write raw metrics
        MQ->>SP: Stream to processor
    end

    SP->>SP: Aggregate (5m windows)
    SP->>SP: Extract features
    SP->>AD: Send feature vectors

    AD->>AD: Tier 1: Basic detection

    alt Anomaly detected
        AD->>AD: Tier 2: Agile confirmation
        AD->>AD: Tier 3: Robust validation
        AD->>NS: Create alert
    else Normal
        AD->>AD: Update baseline
    end
```

### Flow 2: Alert Correlation

```mermaid
sequenceDiagram
    participant AS as Alert Sources
    participant AR as Alert Receiver
    participant AC as Correlation Engine
    participant TG as Topology Graph
    participant DOC as Document Store
    participant NS as Notification

    AS->>AR: Incoming alerts (batch)
    AR->>AR: Deduplicate
    AR->>AC: Send unique alerts

    AC->>AC: Group by time window (5m)
    AC->>TG: Query service dependencies
    TG-->>AC: Return dependency graph

    AC->>AC: Apply Dynamic-X-Y clustering
    AC->>AC: Compute similarity scores

    loop For each cluster
        AC->>AC: Create incident
        AC->>AC: Select representative alert
        AC->>AC: Suppress child alerts
    end

    AC->>DOC: Store incidents
    AC->>NS: Notify for new incidents
```

### Flow 3: Root Cause Analysis

```mermaid
sequenceDiagram
    participant INC as Incident
    participant RCA as RCA Engine
    participant TG as Topology Graph
    participant TSDB as Time-Series DB
    participant ML as Causal ML Model
    participant DOC as Document Store

    INC->>RCA: New incident triggered

    RCA->>TG: Get affected services
    TG-->>RCA: Service subgraph

    RCA->>TSDB: Query metrics for time range
    TSDB-->>RCA: Historical metrics

    RCA->>RCA: Build causal DAG from topology
    RCA->>ML: Apply Granger causality tests
    ML-->>RCA: Causal relationships

    RCA->>RCA: Apply Bayesian inference
    RCA->>RCA: Rank root causes by P(cause|evidence)

    RCA->>DOC: Store RCA results
    RCA->>INC: Update incident with root causes
```

### Flow 4: Automated Remediation

```mermaid
sequenceDiagram
    participant INC as Incident
    participant AO as Automation Orchestrator
    participant KB as Knowledge Base
    participant RB as Runbook Engine
    participant AP as Approver
    participant TG as Target System
    participant FB as Feedback Loop

    INC->>AO: Incident with RCA
    AO->>KB: Match runbook for root cause
    KB-->>AO: Matched runbook

    AO->>AO: Check blast radius
    AO->>AO: Check approval requirements

    alt Approval required
        AO->>AP: Request approval
        AP-->>AO: Approve/Reject
    end

    alt Approved
        AO->>RB: Execute runbook
        RB->>TG: Apply remediation
        TG-->>RB: Execution result

        RB->>RB: Validate success

        alt Success
            RB->>INC: Mark resolved
        else Failure
            RB->>RB: Trigger rollback
            RB->>AP: Escalate to human
        end
    end

    AO->>FB: Log outcome for learning
```

---

## Key Architectural Decisions

### Decision 1: Streaming vs Batch Processing

| Option | Pros | Cons |
|--------|------|------|
| **Batch** | Simpler, better for ML training | High latency, not real-time |
| **Streaming** | Real-time detection, low latency | Complex, harder to debug |
| **Lambda (Both)** | Best of both worlds | Operational complexity |

**Decision:** Streaming-first with batch for ML training

**Rationale:** AIOps requires real-time detection (<5s SLO). We use streaming for detection and batch jobs for periodic model retraining.

### Decision 2: Anomaly Detection Approach

| Option | Pros | Cons |
|--------|------|------|
| **Statistical Only** | Fast, explainable, no training | Limited accuracy for complex patterns |
| **ML Only** | High accuracy, learns patterns | Slow, black box, cold start |
| **Hybrid (Three-Tier)** | Balanced speed/accuracy | Implementation complexity |

**Decision:** Three-tier hybrid approach

**Rationale:** Different metrics need different detection strategies. Infrastructure metrics can use fast statistical methods; business KPIs benefit from ML. The three-tier system routes metrics to appropriate detectors.

### Decision 3: RCA Methodology

| Option | Pros | Cons |
|--------|------|------|
| **Correlation-Based** | Simple, fast | Correlation ≠ causation |
| **Rule-Based** | 100% accurate for known issues | Fails on novel issues |
| **Causal Inference** | True causation, handles novel cases | Complex, requires good topology |

**Decision:** Causal inference with rule-based fallback

**Rationale:** The fundamental RCA challenge is distinguishing causation from correlation. Causal inference using topology and time-series analysis provides directional causation. Rules handle known failure modes.

### Decision 4: Automation Trust Model

| Option | Pros | Cons |
|--------|------|------|
| **Full Automation** | Fast response, scalable | Risk of wrong actions, trust erosion |
| **Manual Only** | Full control, trust | Slow, doesn't scale |
| **Human-in-the-Loop** | Balanced risk/speed | Adds latency, requires availability |

**Decision:** Human-in-the-loop with progressive automation

**Rationale:** Trust is earned, not assumed. Start with human approval for all remediations, then progressively automate low-risk actions as the system proves itself.

### Decision 5: Data Store Selection

| Data Type | Recommended Store | Rationale |
|-----------|-------------------|-----------|
| Metrics | Time-Series DB (InfluxDB, VictoriaMetrics) | Optimized for time-series writes/queries |
| Logs | Document Store (Elasticsearch, Loki) | Full-text search, schema flexibility |
| Traces | Specialized Store (Jaeger, Tempo) | Trace-specific indexing and queries |
| Topology | Graph DB (Neo4j, JanusGraph) | Efficient graph traversal for RCA |
| Incidents | Document Store (MongoDB) | Flexible schema for incident data |
| Models | Object Storage (S3-compatible) | Large binary artifacts |

---

## Component Interaction Diagram

```mermaid
flowchart TB
    subgraph Ingestion["Ingestion"]
        TC[Telemetry Collector]
        AR[Alert Receiver]
    end

    subgraph Processing["Processing"]
        MQ[(Kafka)]
        SP[Stream Processor]
    end

    subgraph Detection["Detection"]
        T1[Tier 1: Basic]
        T2[Tier 2: Agile]
        T3[Tier 3: Robust]
    end

    subgraph Correlation["Correlation"]
        DXY[Dynamic-X-Y Engine]
        INC[Incident Creator]
    end

    subgraph Analysis["Analysis"]
        CG[Causal Graph Builder]
        BI[Bayesian Inference]
        RC[Root Cause Ranker]
    end

    subgraph Action["Action"]
        RM[Runbook Matcher]
        RE[Runbook Executor]
        RB[Rollback Handler]
    end

    subgraph Knowledge["Knowledge"]
        TG[(Topology Graph)]
        MR[(Model Registry)]
        FB[Feedback]
    end

    TC --> MQ
    AR --> MQ

    MQ --> SP
    SP --> T1
    T1 --> T2
    T2 --> T3

    T1 & T2 & T3 --> DXY
    AR --> DXY
    DXY --> INC

    INC --> CG
    TG --> CG
    CG --> BI
    BI --> RC

    RC --> RM
    RM --> RE
    RE --> RB

    MR --> T2 & T3
    FB --> MR
    RE --> FB

    classDef ingestion fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef processing fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef detection fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef correlation fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef analysis fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef action fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef knowledge fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class TC,AR ingestion
    class MQ,SP processing
    class T1,T2,T3 detection
    class DXY,INC correlation
    class CG,BI,RC analysis
    class RM,RE,RB action
    class TG,MR,FB knowledge
```

---

## Deployment Architecture

### Multi-Zone Deployment

```mermaid
flowchart TB
    subgraph Zone1["Availability Zone 1"]
        LB1[Load Balancer]
        ING1[Ingestion Pods]
        ANA1[Analytics Pods]
        ACT1[Action Pods]
        TSDB1[(TSDB Primary)]
        GDB1[(Graph Primary)]
    end

    subgraph Zone2["Availability Zone 2"]
        LB2[Load Balancer]
        ING2[Ingestion Pods]
        ANA2[Analytics Pods]
        ACT2[Action Pods]
        TSDB2[(TSDB Replica)]
        GDB2[(Graph Replica)]
    end

    subgraph Zone3["Availability Zone 3"]
        LB3[Load Balancer]
        ING3[Ingestion Pods]
        ANA3[Analytics Pods]
        ACT3[Action Pods]
        TSDB3[(TSDB Replica)]
        GDB3[(Graph Replica)]
    end

    subgraph Shared["Shared Services"]
        MQ[(Kafka Cluster)]
        OBJ[(Object Storage)]
        MR[(Model Registry)]
    end

    GLB[Global Load Balancer] --> LB1 & LB2 & LB3

    LB1 --> ING1 --> MQ
    LB2 --> ING2 --> MQ
    LB3 --> ING3 --> MQ

    MQ --> ANA1 & ANA2 & ANA3

    ANA1 --> TSDB1
    ANA2 --> TSDB2
    ANA3 --> TSDB3

    TSDB1 <-.-> TSDB2 <-.-> TSDB3
    GDB1 <-.-> GDB2 <-.-> GDB3

    classDef zone fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef shared fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef lb fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    class LB1,LB2,LB3,GLB lb
    class MQ,OBJ,MR shared
```

### Kubernetes Resource Allocation

| Component | Replicas | CPU (request/limit) | Memory (request/limit) | GPU |
|-----------|----------|---------------------|------------------------|-----|
| Telemetry Collector | 10 | 2/4 cores | 4/8 GB | - |
| Stream Processor | 20 | 4/8 cores | 8/16 GB | - |
| Anomaly Detection (Tier 1) | 10 | 2/4 cores | 4/8 GB | - |
| Anomaly Detection (Tier 2) | 10 | 4/8 cores | 8/16 GB | - |
| Anomaly Detection (Tier 3) | 10 | 4/8 cores | 16/32 GB | 1 |
| Correlation Engine | 5 | 4/8 cores | 8/16 GB | - |
| RCA Engine | 5 | 8/16 cores | 16/32 GB | - |
| Automation Orchestrator | 3 | 2/4 cores | 4/8 GB | - |
| Notification Service | 3 | 1/2 cores | 2/4 GB | - |

---

## API Gateway Design

```mermaid
flowchart LR
    subgraph Clients["Clients"]
        UI[Web UI]
        CLI[CLI Tool]
        SDK[SDK]
        WH[Webhooks]
    end

    subgraph Gateway["API Gateway"]
        AUTH[Authentication]
        RL[Rate Limiter]
        RT[Router]
    end

    subgraph APIs["Internal APIs"]
        ING[Ingestion API]
        QRY[Query API]
        CFG[Config API]
        AUTO[Automation API]
    end

    Clients --> AUTH
    AUTH --> RL
    RL --> RT

    RT --> ING
    RT --> QRY
    RT --> CFG
    RT --> AUTO

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef api fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class UI,CLI,SDK,WH client
    class AUTH,RL,RT gateway
    class ING,QRY,CFG,AUTO api
```

### API Endpoints Overview

| API | Method | Endpoint | Purpose |
|-----|--------|----------|---------|
| Ingestion | POST | `/api/v1/metrics/write` | Write metrics |
| Ingestion | POST | `/api/v1/logs/write` | Write logs |
| Ingestion | POST | `/api/v1/alerts/ingest` | Receive alerts |
| Query | GET | `/api/v1/incidents` | List incidents |
| Query | GET | `/api/v1/incidents/{id}` | Get incident details |
| Query | GET | `/api/v1/metrics/query` | Query metrics |
| Config | PUT | `/api/v1/config/detection` | Update detection config |
| Config | PUT | `/api/v1/config/topology` | Update topology |
| Automation | POST | `/api/v1/runbooks/{id}/execute` | Execute runbook |
| Automation | GET | `/api/v1/runbooks/{id}/status` | Check execution status |

---

## Technology Stack Reference

| Layer | Recommended | Alternatives |
|-------|-------------|--------------|
| **Message Queue** | Apache Kafka | Apache Pulsar, AWS Kinesis |
| **Stream Processing** | Apache Flink | Kafka Streams, Apache Spark Streaming |
| **Time-Series DB** | VictoriaMetrics | InfluxDB, TimescaleDB, Prometheus |
| **Graph DB** | Neo4j | JanusGraph, Amazon Neptune |
| **Document Store** | Elasticsearch | OpenSearch, MongoDB |
| **Cache** | Redis | Memcached, Hazelcast |
| **Object Storage** | MinIO | S3-compatible storage |
| **ML Framework** | PyTorch | TensorFlow, scikit-learn |
| **Container Orchestration** | Kubernetes | Nomad, Docker Swarm |
| **Service Mesh** | Istio | Linkerd, Consul Connect |

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| Sync vs Async | **Async** for ingestion, Sync for queries | High-volume ingestion requires async |
| Event-driven vs Request-response | **Event-driven** for core pipeline | Decoupling, scalability |
| Push vs Pull | **Both** (push for metrics, pull for discovery) | Support different source types |
| Stateless vs Stateful | **Stateless** services with stateful storage | Horizontal scaling |
| Read-heavy vs Write-heavy | **Write-heavy** ingestion, **Read-heavy** queries | Optimize each path separately |
| Real-time vs Batch | **Real-time** detection, Batch training | Detection SLO requires real-time |
| Edge vs Origin | **Origin** processing (centralized analytics) | Complex ML requires centralized compute |
