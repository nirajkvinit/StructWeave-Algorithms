[← Back to Index](./00-index.md)

# High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Sources["Data Sources"]
        direction LR
        APP["Applications<br/>(OTel SDK)"]
        INFRA["Infrastructure<br/>(eBPF)"]
        CLOUD["Cloud APIs<br/>(AWS/GCP/Azure)"]
        THIRD["Third-Party<br/>(Webhooks)"]
    end

    subgraph Collect["Collection Layer"]
        direction LR
        AGENT["OTel Agent<br/>(per-host)"]
        GW["OTel Gateway<br/>(cluster)"]
        EBPF["eBPF<br/>Collector"]
    end

    subgraph Ingest["Ingestion Pipeline"]
        direction LR
        KAFKA[("Kafka<br/>Partitioned by<br/>trace_id")]
        FLINK["Stream Processor<br/>(Flink/Kafka Streams)"]
        SAMPLE["Adaptive<br/>Sampler"]
    end

    subgraph Store["Storage Layer"]
        direction TB
        subgraph Hot["Hot Tier (7d)"]
            CH_HOT[("ClickHouse<br/>Events/Traces")]
            TS_HOT[("VictoriaMetrics<br/>Metrics")]
        end
        subgraph Warm["Warm Tier (90d)"]
            CH_WARM[("ClickHouse<br/>Downsampled")]
        end
        subgraph Cold["Cold Tier (2y)"]
            S3[("S3/GCS<br/>Parquet")]
        end
    end

    subgraph AI["AI Layer"]
        direction TB
        BASELINE["Baseline<br/>Learning"]
        ANOM["Anomaly<br/>Detector"]
        INVEST["Investigation<br/>Agents"]
        REM["Remediation<br/>Proposer"]
    end

    subgraph Query["Query Layer"]
        direction LR
        API["Query API<br/>(GraphQL)"]
        CACHE[("Redis<br/>Query Cache")]
    end

    subgraph Human["Human Interface"]
        direction TB
        DASH["Dashboards"]
        NLQ["Natural Language<br/>Interface"]
        MCP["MCP Server<br/>(IDE)"]
        APPROVE["Approval<br/>Gateway"]
        ALERT["Alert<br/>Router"]
    end

    subgraph External["External Systems"]
        direction LR
        SLACK["Slack"]
        PD["PagerDuty"]
        JIRA["Jira"]
        K8S["Kubernetes"]
        CD["CD Pipeline"]
    end

    APP & INFRA --> AGENT --> GW
    CLOUD --> GW
    THIRD --> GW
    INFRA --> EBPF --> GW
    GW --> KAFKA
    KAFKA --> FLINK --> SAMPLE
    SAMPLE --> CH_HOT & TS_HOT
    FLINK --> BASELINE --> ANOM
    CH_HOT --> CH_WARM --> S3
    CH_HOT & TS_HOT --> API
    API --> CACHE
    CACHE --> DASH & NLQ & MCP
    ANOM --> INVEST
    INVEST --> REM --> APPROVE
    CH_HOT --> INVEST
    APPROVE --> K8S & CD
    ALERT --> SLACK & PD
    APPROVE --> JIRA

    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef collect fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef ingest fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef store fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef ai fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    classDef query fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef human fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef external fill:#efebe9,stroke:#5d4037,stroke-width:2px

    class APP,INFRA,CLOUD,THIRD source
    class AGENT,GW,EBPF collect
    class KAFKA,FLINK,SAMPLE ingest
    class CH_HOT,TS_HOT,CH_WARM,S3 store
    class BASELINE,ANOM,INVEST,REM ai
    class API,CACHE query
    class DASH,NLQ,MCP,APPROVE,ALERT human
    class SLACK,PD,JIRA,K8S,CD external
```

---

## Component Overview

### 1. Data Sources

| Source Type | Protocol | Data Type | Example |
|-------------|----------|-----------|---------|
| **Applications** | OTLP (gRPC/HTTP) | Traces, Logs, Metrics | Java app with OTel SDK |
| **Infrastructure** | eBPF, OTLP | System metrics, Network traces | Linux kernel events |
| **Cloud APIs** | REST/Webhooks | Cloud events, Audit logs | AWS CloudTrail, GCP Audit |
| **Third-Party** | Webhooks, APIs | Deployment events, Incidents | GitHub, PagerDuty |

### 2. Collection Layer

```mermaid
flowchart LR
    subgraph App["Application Pod"]
        CODE["App Code"]
        SDK["OTel SDK"]
    end

    subgraph Agent["OTel Agent (DaemonSet)"]
        REC["Receivers<br/>OTLP, Prometheus"]
        PROC["Processors<br/>Batch, Attributes"]
        EXP["Exporters<br/>OTLP"]
    end

    subgraph Gateway["OTel Gateway (Deployment)"]
        LB["Load Balancer"]
        GW1["Gateway 1"]
        GW2["Gateway 2"]
        GWN["Gateway N"]
    end

    CODE --> SDK --> REC
    REC --> PROC --> EXP
    EXP --> LB
    LB --> GW1 & GW2 & GWN

    classDef app fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef agent fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef gateway fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class CODE,SDK app
    class REC,PROC,EXP agent
    class LB,GW1,GW2,GWN gateway
```

**OTel Collector Configuration:**

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1000
  attributes:
    actions:
      - key: deployment.environment
        value: production
        action: upsert
  resource:
    attributes:
      - key: service.instance.id
        from_attribute: host.name
        action: upsert

exporters:
  otlp:
    endpoint: gateway.observability:4317
    compression: zstd

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, attributes, resource]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [batch, attributes]
      exporters: [otlp]
```

### 3. Ingestion Pipeline

```mermaid
flowchart LR
    subgraph Input["Input"]
        GW["OTel Gateway"]
    end

    subgraph Kafka["Kafka Cluster"]
        T1["traces-001"]
        T2["traces-002"]
        TN["traces-N"]
        M1["metrics-001"]
        L1["logs-001"]
    end

    subgraph Process["Stream Processing"]
        FLINK["Flink Job"]
        subgraph Tasks["Processing Tasks"]
            ENRICH["Enrichment"]
            CORR["Correlation"]
            AGG["Aggregation"]
            SAMPLE["Sampling"]
        end
    end

    subgraph Output["Output"]
        CH["ClickHouse"]
        VM["VictoriaMetrics"]
        AI["AI Pipeline"]
    end

    GW --> T1 & T2 & TN
    GW --> M1 & L1
    T1 & T2 & TN --> FLINK
    M1 & L1 --> FLINK
    FLINK --> ENRICH --> CORR --> AGG --> SAMPLE
    SAMPLE --> CH & VM
    CORR --> AI

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef kafka fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef process fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef output fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class GW input
    class T1,T2,TN,M1,L1 kafka
    class FLINK,ENRICH,CORR,AGG,SAMPLE process
    class CH,VM,AI output
```

**Key Processing Steps:**

| Step | Purpose | Example |
|------|---------|---------|
| **Enrichment** | Add metadata (geo, service graph) | Add `region: us-west-2` based on IP |
| **Correlation** | Link metrics/logs to traces | Attach `trace_id` to log records |
| **Aggregation** | Pre-compute common aggregates | P50/P95/P99 latency per endpoint |
| **Sampling** | Reduce storage while keeping interesting data | Keep 100% errors, sample 1% success |

### 4. Storage Layer

#### Tiered Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        STORAGE TIERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HOT TIER (7 days)                                              │
│  ├── ClickHouse (Events/Traces)                                 │
│  │   - Full resolution                                          │
│  │   - NVMe SSD storage                                         │
│  │   - P99 query < 500ms                                        │
│  └── VictoriaMetrics (Metrics)                                  │
│      - Full resolution time series                              │
│      - Optimized for range queries                              │
│                                                                 │
│  WARM TIER (90 days)                                            │
│  └── ClickHouse (Downsampled)                                   │
│      - 10x downsampled (1min → 10min resolution)                │
│      - HDD storage                                              │
│      - P99 query < 5s                                           │
│                                                                 │
│  COLD TIER (2 years)                                            │
│  └── Object Storage (Parquet)                                   │
│      - 100x downsampled (1min → 1hr resolution)                 │
│      - S3/GCS                                                   │
│      - Query via Spark/Trino                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### ClickHouse Schema

```sql
-- Events table (wide events with high cardinality)
CREATE TABLE events (
    timestamp DateTime64(3),
    trace_id String,
    span_id String,
    parent_span_id String,
    service_name LowCardinality(String),
    operation_name String,
    duration_ns UInt64,
    status_code LowCardinality(String),

    -- High-cardinality dimensions stored as Map
    attributes Map(String, String),

    -- Numeric attributes for aggregations
    numeric_attributes Map(String, Float64),

    -- Resource attributes
    resource_attributes Map(String, String),

    -- Correlation
    correlation_id String,

    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_service service_name TYPE set(100) GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toDate(timestamp)
ORDER BY (service_name, operation_name, timestamp)
TTL timestamp + INTERVAL 7 DAY TO VOLUME 'warm',
    timestamp + INTERVAL 90 DAY TO VOLUME 'cold'
SETTINGS index_granularity = 8192;
```

### 5. AI Layer

```mermaid
flowchart TB
    subgraph Input["Input Signals"]
        STREAM["Real-time<br/>Event Stream"]
        HIST["Historical<br/>Data"]
        META["Service<br/>Metadata"]
    end

    subgraph Baseline["Baseline Learning"]
        PROPHET["Time Series<br/>Forecasting"]
        CLUSTER["Behavior<br/>Clustering"]
        GRAPH["Dependency<br/>Graph"]
    end

    subgraph Detect["Anomaly Detection"]
        STAT["Statistical<br/>Detectors"]
        ML["ML Detectors<br/>(Isolation Forest)"]
        RULE["Rule-based<br/>Detectors"]
    end

    subgraph Investigate["Investigation Agents"]
        RCA["Root Cause<br/>Analyzer"]
        CORR["Correlation<br/>Analyzer"]
        BUBBLE["BubbleUp<br/>Analyzer"]
        DEP["Dependency<br/>Tracer"]
    end

    subgraph Remediate["Remediation"]
        PROPOSE["Action<br/>Proposer"]
        RISK["Risk<br/>Assessor"]
        EXEC["Execution<br/>Engine"]
    end

    STREAM --> STAT & ML & RULE
    HIST --> PROPHET & CLUSTER
    META --> GRAPH
    PROPHET & CLUSTER & GRAPH --> STAT & ML
    STAT & ML & RULE --> RCA
    RCA --> CORR & BUBBLE & DEP
    CORR & BUBBLE & DEP --> PROPOSE
    PROPOSE --> RISK --> EXEC

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef baseline fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef detect fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    classDef investigate fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef remediate fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px

    class STREAM,HIST,META input
    class PROPHET,CLUSTER,GRAPH baseline
    class STAT,ML,RULE detect
    class RCA,CORR,BUBBLE,DEP investigate
    class PROPOSE,RISK,EXEC remediate
```

### 6. Human Approval Workflow

```mermaid
sequenceDiagram
    participant AI as AI Agent
    participant Queue as Approval Queue
    participant Notify as Notification Service
    participant Human as Engineer
    participant Exec as Execution Engine
    participant Audit as Audit Log

    AI->>Queue: Propose remediation action
    AI->>Audit: Log proposal
    Queue->>Notify: Send approval request
    Notify->>Human: Slack/PagerDuty/Email

    alt Action Approved
        Human->>Queue: Approve with optional modifications
        Queue->>Exec: Execute action
        Exec->>Audit: Log execution
        Exec->>AI: Feedback (success/failure)
    else Action Rejected
        Human->>Queue: Reject with reason
        Queue->>Audit: Log rejection
        Queue->>AI: Feedback (rejection reason)
    else Action Timeout
        Queue->>Audit: Log timeout
        Queue->>Notify: Escalate to next approver
    end
```

**Approval Tiers:**

| Risk Level | Examples | Required Approvers | Timeout |
|------------|----------|-------------------|---------|
| **Info** | Create ticket, send notification | Auto-approved | - |
| **Low** | Scale up pods, increase limits | Any team member | 15 min |
| **Medium** | Rollback deployment, restart service | Team lead | 30 min |
| **High** | Database failover, drain node | SRE + Manager | 1 hour |
| **Critical** | Multi-region failover | VP Engineering | 2 hours |

---

## Data Flow: End-to-End

### Normal Operation Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant SDK as OTel SDK
    participant Agent as OTel Agent
    participant GW as Gateway
    participant Kafka as Kafka
    participant Proc as Processor
    participant CH as ClickHouse
    participant AI as AI Layer
    participant Dash as Dashboard

    App->>SDK: Instrument code
    SDK->>Agent: Send telemetry (OTLP)
    Agent->>Agent: Batch & enrich
    Agent->>GW: Forward batches
    GW->>Kafka: Publish to topic
    Kafka->>Proc: Consume events
    Proc->>Proc: Enrich, correlate, sample
    Proc->>CH: Write events
    Proc->>AI: Stream for analysis
    CH->>Dash: Query for visualization
    AI->>AI: Baseline comparison
    Note over AI: No anomaly detected
```

### Incident Detection Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant Proc as Processor
    participant AI as AI Layer
    participant Invest as Investigation Agent
    participant Rem as Remediation Agent
    participant Approve as Approval Gateway
    participant Human as Engineer
    participant K8s as Kubernetes
    participant Alert as Alert Router

    App->>Proc: Error spike in events
    Proc->>AI: Forward anomalous pattern
    AI->>AI: Detect deviation from baseline
    AI->>Alert: Trigger alert
    Alert->>Human: Notify via Slack

    AI->>Invest: Launch investigation
    Invest->>Invest: Query traces, logs, metrics
    Invest->>Invest: Run BubbleUp analysis
    Invest->>Invest: Trace dependencies
    Note over Invest: Root cause: Bad deployment v2.3.1

    Invest->>Rem: Propose rollback
    Rem->>Rem: Assess risk (Medium)
    Rem->>Approve: Submit for approval
    Approve->>Human: Request approval (Slack button)

    Human->>Approve: Approve rollback
    Approve->>K8s: Execute rollback
    K8s->>App: Deploy v2.3.0
    K8s->>AI: Confirm completion
    AI->>Human: Resolution confirmed
```

---

## OpenTelemetry Integration

### Collector Deployment Patterns

| Pattern | Use Case | Pros | Cons |
|---------|----------|------|------|
| **No Collector (Direct)** | Development | Simple setup | No batching, no reliability |
| **Agent (DaemonSet)** | Production K8s | Local buffering, low latency | Resource overhead per node |
| **Gateway (Deployment)** | Centralized processing | Easier management | Single point of failure |
| **Agent + Gateway** | Enterprise | Best of both | More complex |

### Recommended Pattern: Agent + Gateway

```
┌─────────────────────────────────────────────────────────────────┐
│                     KUBERNETES CLUSTER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Node 1                    Node 2                    Node N     │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────┐ │
│  │ App Pod 1       │      │ App Pod 3       │      │ ...     │ │
│  │ App Pod 2       │      │ App Pod 4       │      │         │ │
│  │ OTel Agent      │      │ OTel Agent      │      │ Agent   │ │
│  │ (DaemonSet)     │      │ (DaemonSet)     │      │         │ │
│  └────────┬────────┘      └────────┬────────┘      └────┬────┘ │
│           │                        │                     │      │
│           └────────────────────────┼─────────────────────┘      │
│                                    ▼                            │
│                         ┌──────────────────┐                    │
│                         │ OTel Gateway     │                    │
│                         │ (Deployment,     │                    │
│                         │  3 replicas)     │                    │
│                         └────────┬─────────┘                    │
│                                  │                              │
└──────────────────────────────────┼──────────────────────────────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │ Kafka / Backend │
                          └────────────────┘
```

### Correlation Context Propagation

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRACE CONTEXT PROPAGATION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Service A (Frontend)                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ trace_id: abc123                                         │   │
│  │ span_id: span_001                                        │   │
│  │ baggage: {user_id: u42, session_id: sess789}             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          │ HTTP Header:                         │
│                          │ traceparent: 00-abc123-span_001-01   │
│                          │ baggage: user_id=u42,session_id=...  │
│                          ▼                                      │
│  Service B (API)                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ trace_id: abc123 (inherited)                             │   │
│  │ span_id: span_002                                        │   │
│  │ parent_span_id: span_001                                 │   │
│  │ baggage: {user_id: u42, session_id: sess789}             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  Service C (Database)                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ trace_id: abc123 (inherited)                             │   │
│  │ span_id: span_003                                        │   │
│  │ parent_span_id: span_002                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  LOG RECORD (any service):                                      │
│  {                                                              │
│    "timestamp": "2026-01-15T10:30:00Z",                         │
│    "severity": "ERROR",                                         │
│    "message": "Database timeout",                               │
│    "trace_id": "abc123",   ← Links to trace                     │
│    "span_id": "span_003",  ← Links to specific span             │
│    "user_id": "u42"        ← From baggage                       │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Event-Based vs Metric-Based

| Decision | **Event-Based (Wide Events)** |
|----------|-------------------------------|
| Rationale | Enables high-cardinality queries, BubbleUp analysis, and flexible exploration without predefined dimensions |
| Trade-off | Higher storage cost, requires columnar DB (ClickHouse) |
| Alternative | Pre-aggregated metrics (Prometheus) - lower cost but limited exploration |

### 2. Autonomous Agents with Human Approval

| Decision | **AI proposes, Human approves** |
|----------|--------------------------------|
| Rationale | Balances automation speed with safety; builds trust gradually |
| Trade-off | Slower than fully autonomous; requires on-call availability |
| Alternative | Fully autonomous remediation - faster but higher risk |

### 3. OpenTelemetry as Foundation

| Decision | **OTel-native, vendor-neutral** |
|----------|--------------------------------|
| Rationale | Industry standard, avoids vendor lock-in, rich ecosystem |
| Trade-off | Less optimized than proprietary agents |
| Alternative | Proprietary agents (Datadog, New Relic) - better integration but lock-in |

### 4. Tiered Storage

| Decision | **Hot/Warm/Cold tiers** |
|----------|------------------------|
| Rationale | Balances query performance with cost; most queries hit recent data |
| Trade-off | Complex data lifecycle management |
| Alternative | Single tier - simpler but expensive or slow |

### 5. Stream Processing for AI

| Decision | **Real-time stream processing with Flink** |
|----------|-------------------------------------------|
| Rationale | Low-latency anomaly detection, continuous learning |
| Trade-off | Operational complexity of stream processing |
| Alternative | Batch processing - simpler but delayed detection |

---

## Integration Points

### External System Integrations

| System | Integration Type | Purpose |
|--------|-----------------|---------|
| **Kubernetes** | API, Webhooks | Auto-scaling, rollbacks, pod restarts |
| **CD Pipelines** | API (ArgoCD, Spinnaker) | Deployment rollbacks, canary adjustments |
| **Incident Management** | API (PagerDuty, Opsgenie) | Alert routing, incident creation |
| **Chat** | API (Slack, Teams) | Notifications, approval buttons |
| **Ticketing** | API (Jira, ServiceNow) | Auto-create tickets for investigations |
| **Cloud Providers** | API (AWS, GCP, Azure) | Cloud resource scaling, events |

### MCP Server for IDE Integration

```mermaid
flowchart LR
    subgraph IDE["Developer IDE"]
        CC["Claude Code"]
        CURSOR["Cursor"]
    end

    subgraph MCP["MCP Server"]
        AUTH["Auth"]
        QUERY["Query Handler"]
        VIZ["Visualization"]
    end

    subgraph Platform["Observability Platform"]
        API["Query API"]
        TRACE["Trace Store"]
        METRIC["Metrics Store"]
    end

    CC & CURSOR -->|MCP Protocol| AUTH
    AUTH --> QUERY
    QUERY --> API
    API --> TRACE & METRIC
    API --> VIZ
    VIZ -->|Charts, Traces| CC & CURSOR

    classDef ide fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef mcp fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef platform fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class CC,CURSOR ide
    class AUTH,QUERY,VIZ mcp
    class API,TRACE,METRIC platform
```

**Example MCP Interaction:**

```
Developer: "Why is the checkout service slow today?"

MCP Server:
1. Queries metrics for checkout service latency
2. Finds P99 increased from 200ms to 2.1s at 10:30 AM
3. Retrieves sample slow traces
4. Runs BubbleUp analysis
5. Returns: "Slowdown correlated with deployment v2.3.1 at 10:28 AM.
   87% of slow requests have attribute 'payment_provider=stripe_v3'.
   Recommendation: Rollback or investigate Stripe API changes."
```
