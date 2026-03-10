# High-Level Design — Chaos Engineering Platform

## System Architecture

The platform follows a three-tier architecture: **control plane** (experiment API, scheduler, blast radius controller, steady-state monitor), **execution plane** (fault injector agents deployed on target hosts), and **integration plane** (observability connectors, notification channels, CI/CD hooks).

```mermaid
flowchart TB
    subgraph Users["Users & Integrations"]
        UI[Web Dashboard]
        CLI[CLI / SDK]
        CICD[CI/CD Pipeline]
        API_EXT[External API Clients]
    end

    subgraph ControlPlane["Control Plane"]
        API[Experiment API]
        SCHED[Scheduler]
        ORCH[Experiment Orchestrator]
        BRC[Blast Radius Controller]
        SSM[Steady-State Monitor]
        RB[Rollback Engine]
        APPROVE[Approval Workflow]
        GD[GameDay Coordinator]
    end

    subgraph DataStore["Data Layer"]
        DB[(Experiment DB)]
        QUEUE[Command Queue]
        AUDIT[(Audit Log)]
        CACHE[State Cache]
    end

    subgraph ExecutionPlane["Execution Plane (per Host)"]
        AGENT[Fault Injector Agent]
        NET_INJ[Network Fault Module]
        CPU_INJ[Compute Fault Module]
        APP_INJ[Application Fault Module]
        STATE_INJ[State Fault Module]
        TIMER[Safety Timer]
    end

    subgraph IntegrationPlane["Integration Plane"]
        OBS[Observability Connector]
        METRICS[Metrics API]
        TRACES[Trace API]
        NOTIFY[Notification Service]
        DEP[Dependency Graph Service]
    end

    UI --> API
    CLI --> API
    CICD --> API
    API_EXT --> API

    API --> APPROVE
    APPROVE --> ORCH
    API --> SCHED
    SCHED --> ORCH
    ORCH --> BRC
    ORCH --> SSM
    ORCH --> RB
    GD --> ORCH

    ORCH --> QUEUE
    QUEUE --> AGENT
    AGENT --> NET_INJ
    AGENT --> CPU_INJ
    AGENT --> APP_INJ
    AGENT --> STATE_INJ
    AGENT --> TIMER

    ORCH --> DB
    ORCH --> AUDIT
    BRC --> DB
    BRC --> DEP
    BRC --> CACHE

    SSM --> OBS
    OBS --> METRICS
    OBS --> TRACES
    SSM --> RB

    RB --> QUEUE
    ORCH --> NOTIFY

    classDef user fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef control fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef exec fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef integration fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class UI,CLI,CICD,API_EXT user
    class API,SCHED,ORCH,BRC,SSM,RB,APPROVE,GD control
    class DB,AUDIT data
    class QUEUE,CACHE cache
    class AGENT,NET_INJ,CPU_INJ,APP_INJ,STATE_INJ,TIMER exec
    class OBS,METRICS,TRACES,NOTIFY,DEP integration
```

---

## Experiment Lifecycle

```mermaid
sequenceDiagram
    participant User as User / CI Pipeline
    participant API as Experiment API
    participant Approve as Approval Workflow
    participant BRC as Blast Radius Controller
    participant Orch as Orchestrator
    participant SSM as Steady-State Monitor
    participant Queue as Command Queue
    participant Agent as Fault Injector Agent
    participant Obs as Observability Systems
    participant RB as Rollback Engine

    User->>API: Submit experiment definition
    API->>API: Validate schema, resolve targets
    API->>BRC: Check blast radius constraints
    BRC->>BRC: Query dependency graph, check concurrent experiments
    alt Blast radius exceeds limits
        BRC-->>API: Reject (blast radius too large)
        API-->>User: Error: reduce scope
    else Blast radius approved
        BRC-->>API: Approved with computed blast radius
    end

    alt Production target
        API->>Approve: Request human approval
        Approve-->>API: Approved / Rejected
    end

    API->>Orch: Schedule experiment
    Orch->>SSM: Start baseline measurement
    SSM->>Obs: Query current metrics (error rate, latency, throughput)
    SSM-->>Orch: Baseline established

    Orch->>Queue: Enqueue fault injection commands
    Queue->>Agent: Deliver commands (with safety timeout)
    Agent->>Agent: Apply fault (e.g., add 200ms network latency)
    Agent-->>Orch: ACK: fault applied

    loop Every evaluation interval (1-5 seconds)
        SSM->>Obs: Query current metrics
        SSM->>SSM: Compare against hypothesis bounds
        alt Hypothesis violated
            SSM->>RB: Trigger rollback
            RB->>Queue: Enqueue rollback commands
            Queue->>Agent: Deliver rollback
            Agent->>Agent: Revert fault
            Agent-->>Orch: ACK: fault reverted
            Orch-->>User: Experiment failed (hypothesis violated)
        end
    end

    Note over Orch: Duration expires or all steps complete
    Orch->>RB: Trigger cleanup
    RB->>Queue: Enqueue revert commands
    Queue->>Agent: Revert all faults
    Agent-->>Orch: ACK: clean
    Orch->>Orch: Generate results report
    Orch-->>User: Experiment complete (pass/fail + report)
```

---

## Data Flow: Multi-Step Scenario Execution

This diagram shows how a multi-step chaos scenario (progressive escalation) flows through the system — starting with a small blast radius and increasing if the system handles the initial fault.

```mermaid
flowchart LR
    subgraph Scenario["Scenario: Progressive Latency Test"]
        S1["Step 1<br/>10% of pods<br/>50ms latency"]
        S2["Step 2<br/>25% of pods<br/>100ms latency"]
        S3["Step 3<br/>50% of pods<br/>200ms latency"]
    end

    subgraph Gates["Steady-State Gates"]
        G1{"Error rate<br/>&lt; 0.1%?"}
        G2{"Error rate<br/>&lt; 0.5%?"}
        G3{"Evaluate<br/>results"}
    end

    subgraph Outcomes["Outcomes"]
        PASS[Scenario Pass]
        FAIL1[Fail at Step 1]
        FAIL2[Fail at Step 2]
        FAIL3[Fail at Step 3]
        ROLLBACK[Rollback All]
    end

    S1 --> G1
    G1 -->|Yes| S2
    G1 -->|No| FAIL1
    S2 --> G2
    G2 -->|Yes| S3
    G2 -->|No| FAIL2
    S3 --> G3
    G3 -->|Pass| PASS
    G3 -->|Fail| FAIL3

    FAIL1 --> ROLLBACK
    FAIL2 --> ROLLBACK
    FAIL3 --> ROLLBACK

    classDef step fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef gate fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef pass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef fail fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef rollback fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class S1,S2,S3 step
    class G1,G2,G3 gate
    class PASS pass
    class FAIL1,FAIL2,FAIL3 fail
    class ROLLBACK rollback
```

---

## Key Architectural Decisions

### 1. Agent-Based vs. Agentless Fault Injection

| Aspect | Agent-Based (Chosen) | Agentless (API-driven) |
|--------|---------------------|----------------------|
| **Fault types** | Full range: network (iptables/tc), compute (cgroups), process kill, disk fill, clock skew | Limited to cloud-provider API faults (instance stop, network ACL) |
| **Rollback reliability** | Agent has local timer — can autonomously revert if control plane is unreachable | Depends on control plane reaching cloud API for revert |
| **Deployment overhead** | Requires agent installation on every target host | No deployment; uses existing cloud/platform APIs |
| **Latency** | Sub-second fault application (local execution) | Seconds to minutes (API call → provider propagation) |
| **Recommendation** | Agent-based for host/container/network faults (precision + autonomous rollback); supplement with agentless for cloud-level faults (zone failure, managed service disruption) |

### 2. Push vs. Pull for Fault Commands

| Aspect | Push via Queue (Chosen) | Pull (Agent polls) |
|--------|------------------------|--------------------|
| **Latency** | Sub-second delivery via persistent connection | Bounded by poll interval (1-10 seconds) |
| **Rollback speed** | Immediate command delivery | Up to one poll interval delay |
| **Connection overhead** | Persistent WebSocket/gRPC connections from all agents | Periodic HTTP requests |
| **Partition behavior** | Agent detects disconnect immediately, starts safety timer | Agent may not know it's partitioned until next poll fails |
| **Recommendation** | Push for commands (latency-critical); pull as fallback reconciliation (agent periodically confirms its fault state matches control plane expectations) |

### 3. Centralized vs. Distributed Steady-State Evaluation

| Aspect | Centralized (Chosen) | Distributed (per-agent) |
|--------|---------------------|------------------------|
| **Global view** | Can evaluate aggregate metrics (cluster-wide error rate, cross-service latency) | Agent only sees local metrics |
| **Single point of failure** | SSM failure means no hypothesis checking — must be highly available | No central dependency |
| **Query efficiency** | Batches metric queries to observability backend | Each agent queries independently (N × query load) |
| **Recommendation** | Centralized SSM with HA (leader election); agents carry a local "safety kill switch" for hard limits (e.g., local CPU > 95% → auto-revert, regardless of SSM) |

### 4. Experiment State: Database vs. State Machine Service

| Aspect | Database-Backed State Machine (Chosen) | In-Memory State Service |
|--------|---------------------------------------|------------------------|
| **Durability** | Survives control plane restart; experiment state is always recoverable | Lost on crash unless checkpointed |
| **Consistency** | Database transactions enforce valid state transitions | Requires distributed consensus protocol |
| **Recovery** | On restart, load active experiments from DB and reconcile with agent states | Must rebuild state from agents or WAL |
| **Recommendation** | Database (relational) with strict state machine constraints; use optimistic locking for concurrent updates |

### 5. Safety Timeout: Server-Side vs. Agent-Side

| Aspect | Agent-Side Safety Timeout (Chosen) | Server-Side Only |
|--------|-----------------------------------|------------------|
| **Partition safety** | Agent autonomously reverts after timeout even if control plane is unreachable | If control plane is down, fault persists indefinitely |
| **Accuracy** | May revert prematurely if network is slow but experiment is still healthy | Central authority has full context |
| **Complexity** | Agents must maintain local experiment state and timers | Simpler agent logic |
| **Recommendation** | Defense-in-depth: agent-side timeout (conservative, e.g., 2× expected duration) + server-side orchestration (normal path). Agent timeout is a safety net, not the primary control mechanism |

---

## Architecture Pattern Checklist

- [x] **Sync vs Async communication decided** — Sync for API calls and approval workflows; async (message queue) for agent commands
- [x] **Event-driven vs Request-response decided** — Event-driven for experiment lifecycle (state transitions emit events to SSM, audit log, notifications); request-response for API and metric queries
- [x] **Push vs Pull model decided** — Push for fault commands via persistent connections; pull for reconciliation
- [x] **Stateless vs Stateful services identified** — Orchestrator is stateful (experiment lifecycle); API servers are stateless; agents are stateful (local fault state + safety timer)
- [x] **Read-heavy vs Write-heavy optimization applied** — Write-light (experiment CRUD is low-volume); read-heavy during experiments (continuous metric queries)
- [x] **Real-time vs Batch processing decided** — Real-time for steady-state monitoring and rollback; batch for post-experiment analytics and report generation
- [x] **Defense-in-depth for safety** — Multiple independent safety mechanisms: blast radius controller, steady-state monitor, agent safety timeout, concurrent experiment limits

---

## Component Interaction Summary

| Component | Inputs | Outputs | State |
|-----------|--------|---------|-------|
| Experiment API | User requests, CI/CD triggers | Validated experiment definitions | Stateless (delegates to DB) |
| Blast Radius Controller | Experiment targets, dependency graph | Approved/rejected blast radius | Active experiment registry, dependency cache |
| Experiment Orchestrator | Scheduled experiments, approval results | Fault commands, rollback triggers, results | Experiment state machine (DB-backed) |
| Steady-State Monitor | Real-time metrics from observability | Hypothesis pass/fail signals | Baseline measurements, evaluation history |
| Rollback Engine | Abort triggers from SSM, timeouts, manual | Revert commands to agents | Rollback state per experiment |
| Fault Injector Agent | Fault commands from queue | ACK/NACK, health heartbeats | Local fault state, safety timers |
| GameDay Coordinator | GameDay definitions, participant actions | Orchestrated experiment sequences, reports | GameDay state, team assignments |
| Scheduler | Cron definitions, one-time schedules | Experiment triggers at scheduled times | Schedule registry |
