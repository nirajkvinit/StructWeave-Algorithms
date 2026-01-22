# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture

### Control Plane vs Data Plane Overview

```mermaid
flowchart TB
    subgraph EventSources["Event Sources"]
        Git[Git Webhooks]
        API[REST API]
        Schedule[Cron Scheduler]
        Manual[Manual Dispatch]
    end

    subgraph ControlPlane["Control Plane"]
        subgraph Ingestion["Ingestion Layer"]
            WebhookGW[Webhook Gateway]
            APIGateway[API Gateway]
        end

        subgraph Orchestration["Orchestration Services"]
            PipelineEngine[Pipeline Engine]
            Scheduler[Job Scheduler]
            WorkerMgr[Worker Manager]
        end

        subgraph StateManagement["State Management"]
            JobDB[(Job State DB<br/>PostgreSQL)]
            JobQueue[(Job Queues<br/>Redis)]
            ConfigStore[(Config Store)]
        end

        subgraph SecretsMgmt["Secrets & Config"]
            SecretsMgr[Secrets Manager]
            EnvMgr[Environment Manager]
        end
    end

    subgraph DataPlane["Data Plane"]
        subgraph RunnerPool["Runner Pool (Multi-Region)"]
            subgraph Pool1["Runner Pool - Linux"]
                R1[Runner 1]
                R2[Runner 2]
                R3[Runner N]
            end
            subgraph Pool2["Runner Pool - Windows"]
                RW1[Runner 1]
                RW2[Runner N]
            end
            subgraph Pool3["Runner Pool - macOS"]
                RM1[Runner 1]
                RM2[Runner N]
            end
        end
    end

    subgraph Storage["Storage Layer"]
        ArtifactStore[(Artifact Store<br/>Object Storage)]
        CacheStore[(Cache Store<br/>Object Storage)]
        LogStore[(Log Aggregator)]
        ContainerReg[(Container Registry)]
    end

    Git --> WebhookGW
    API --> APIGateway
    Schedule --> PipelineEngine
    Manual --> APIGateway

    WebhookGW --> PipelineEngine
    APIGateway --> PipelineEngine

    PipelineEngine --> Scheduler
    PipelineEngine --> JobDB

    Scheduler --> JobQueue
    Scheduler --> WorkerMgr

    WorkerMgr --> Pool1 & Pool2 & Pool3

    SecretsMgr --> R1 & R2 & R3

    R1 & R2 & R3 --> ArtifactStore
    R1 & R2 & R3 --> CacheStore
    R1 & R2 & R3 --> LogStore
    R1 & R2 & R3 --> ContainerReg

    R1 & R2 & R3 --> JobDB
```

### Component Responsibilities

| Component | Layer | Responsibility |
|-----------|-------|---------------|
| **Webhook Gateway** | Control | Receive and validate Git events, deduplicate, rate limit |
| **API Gateway** | Control | External API endpoint, authentication, request routing |
| **Pipeline Engine** | Control | Parse workflow YAML, build DAG, create job records |
| **Job Scheduler** | Control | Queue management, priority scheduling, job-to-runner assignment |
| **Worker Manager** | Control | Runner lifecycle, health monitoring, autoscaling decisions |
| **Secrets Manager** | Control | Secure secret storage, OIDC token generation, access control |
| **Runner Pool** | Data | Execute jobs in isolated containers, report status |
| **Artifact Store** | Storage | Durable storage for build artifacts, cross-job sharing |
| **Cache Store** | Storage | Dependency and build caching, LRU eviction |
| **Log Aggregator** | Storage | Real-time log ingestion, streaming, retention |

---

## Data Flow

### Pipeline Execution Flow (Push Event to Completion)

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Git as Git Provider
    participant WH as Webhook Gateway
    participant PE as Pipeline Engine
    participant Sched as Scheduler
    participant Redis as Job Queue
    participant WM as Worker Manager
    participant Runner as Runner
    participant Artifact as Artifact Store
    participant Log as Log Store

    Dev->>Git: git push
    Git->>WH: POST /webhook (push event)
    WH->>WH: Validate signature
    WH->>WH: Deduplicate event

    WH->>PE: Enqueue pipeline creation
    PE->>Git: Fetch .github/workflows/*.yml
    Git-->>PE: Workflow definitions

    PE->>PE: Parse YAML, build DAG
    PE->>PE: Evaluate conditions, matrix expansion

    loop For each job in DAG
        PE->>Redis: Create job record (status: pending)
        PE->>Sched: Notify new job
    end

    Sched->>Redis: Get runnable jobs (deps satisfied)
    Sched->>Sched: Apply priority & fair-share

    loop For each runnable job
        Sched->>WM: Request runner for job
        WM->>WM: Select from pool or scale up
        WM-->>Sched: Runner assigned
        Sched->>Runner: Dispatch job
    end

    Runner->>Git: Clone repository
    Runner->>Runner: Restore cache (if exists)

    loop For each step in job
        Runner->>Runner: Execute step
        Runner->>Log: Stream logs
    end

    Runner->>Artifact: Upload artifacts
    Runner->>Redis: Update job status (success/failure)

    Sched->>PE: Job completed
    PE->>PE: Check DAG, unblock dependent jobs
    PE->>Sched: Release dependent jobs

    Note over PE,Sched: Repeat until all jobs complete

    PE->>Git: Update commit status
```

### Job Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Queued: Job created

    Queued --> Waiting: Dependencies pending
    Waiting --> Queued: Dependencies satisfied

    Queued --> Pending: Assigned to runner
    Pending --> Running: Runner started execution

    Running --> Success: All steps passed
    Running --> Failure: Step failed
    Running --> Cancelled: User cancelled
    Running --> TimedOut: Exceeded timeout

    Pending --> Queued: Runner unavailable (retry)

    Success --> [*]
    Failure --> [*]
    Cancelled --> [*]
    TimedOut --> [*]

    note right of Queued: Ready for scheduling
    note right of Waiting: Blocked on upstream jobs
    note right of Running: Actively executing
```

### DAG Execution Pattern

```mermaid
flowchart LR
    subgraph Pipeline["Workflow: build-and-deploy"]
        subgraph Phase1["Phase 1 (Parallel)"]
            Lint[lint]
            Test[test]
            Security[security-scan]
        end

        subgraph Phase2["Phase 2"]
            Build[build]
        end

        subgraph Phase3["Phase 3 (Parallel)"]
            DeployStg[deploy-staging]
            E2E[e2e-tests]
        end

        subgraph Phase4["Phase 4"]
            DeployProd[deploy-prod]
        end
    end

    Lint --> Build
    Test --> Build
    Security --> Build

    Build --> DeployStg
    Build --> E2E

    DeployStg --> DeployProd
    E2E --> DeployProd
```

---

## Key Architectural Decisions

### 1. Scheduler Architecture: Centralized vs Distributed

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Centralized scheduler** | Global view, fair-share easy, simpler | Scale limits, single point of failure | **Chosen (with HA)** |
| **Distributed schedulers** | No bottleneck, region-local | Complex fair-share, coordination overhead | For extreme scale |

**Rationale:** A centralized scheduler with multiple replicas (leader election) provides global visibility for fair-share scheduling across organizations. At 10K jobs/second decision rate, a single scheduler cluster is sufficient. Distributed scheduling adds complexity without benefit until reaching 100K+ concurrent jobs.

### 2. Runner Isolation: Container vs MicroVM vs VM

| Approach | Startup | Security | Cost | Verdict |
|----------|---------|----------|------|---------|
| **Container** | ~1s | Shared kernel | Low | **Private/trusted runners** |
| **MicroVM (Firecracker)** | ~125ms | Separate kernel | Medium | **Public/untrusted runners** |
| **Full VM** | 30-60s | Strongest | High | Legacy, special cases |

**Rationale:**
- Public runners (untrusted code) use microVMs for hardware-level isolation, preventing kernel exploits from affecting other tenants
- Self-hosted runners in trusted environments can use containers for faster startup and lower overhead
- Full VMs reserved for macOS (required by Apple) and specialized compliance needs

### 3. Job Queue: Redis vs Kafka vs PostgreSQL

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Redis (Sorted Sets)** | Fast, priority natural, atomic ops | Single-node limits, persistence concerns | **Primary queue** |
| **PostgreSQL** | Durable, ACID, complex queries | Higher latency, polling overhead | **Job state store** |
| **Kafka** | High throughput, replay | Complex for priority, overkill | Not needed |

**Rationale:** Use Redis sorted sets for job queues (score = priority × timestamp) with PostgreSQL as durable job state store. Redis handles real-time scheduling decisions; PostgreSQL provides durability and complex queries for job history.

### 4. Artifact Storage Strategy

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Object storage (S3/GCS)** | Unlimited scale, durability | Higher latency | **All artifacts** |
| **Database BLOBs** | Lower latency, transactional | Size limits, DB load | Small metadata only |
| **Dedicated artifact service** | Optimized for patterns | Operational overhead | Abstraction layer |

**Rationale:** Store all artifacts in object storage with content-addressable paths (SHA-256). An artifact service provides deduplication, access control, and streaming upload/download. Object storage handles scale; service handles logic.

### 5. Cache Strategy

| Tier | Location | Capacity | Latency | Purpose |
|------|----------|----------|---------|---------|
| **L1** | Runner local | 50 GB | <1ms | Hot layers, frequent deps |
| **L2** | Regional shared | 10 TB | <10ms | Cross-runner sharing |
| **L3** | Object storage | Unlimited | 50-200ms | Cold cache, persistence |

**Rationale:** Multi-tier caching minimizes build time. L1 for immediate reuse on same runner, L2 for regional sharing (most effective tier), L3 for durability and cross-region.

---

## Architecture Pattern Checklist

- [x] **Sync vs Async:** Both - sync for status APIs, async for job execution
- [x] **Event-driven vs Request-response:** Event-driven (webhooks trigger pipelines)
- [x] **Push vs Pull:** Push from Git; pull model for runner job claims
- [x] **Stateless vs Stateful:** Stateless runners; state in artifact store
- [x] **Read-heavy vs Write-heavy:** Write-heavy (logs, artifacts); read for status
- [x] **Real-time vs Batch:** Real-time job execution; batch for metrics
- [x] **Leader election:** For scheduler, pipeline engine HA

---

## Deployment Topologies

### Single Region (Multi-AZ)

```mermaid
flowchart TB
    subgraph Region["Region (us-east-1)"]
        subgraph AZ1["Availability Zone A"]
            CP1[Control Plane]
            Redis1[(Redis Primary)]
            PG1[(PostgreSQL Primary)]
            Runners1[Runner Pool]
        end

        subgraph AZ2["Availability Zone B"]
            CP2[Control Plane]
            Redis2[(Redis Replica)]
            PG2[(PostgreSQL Replica)]
            Runners2[Runner Pool]
        end

        subgraph AZ3["Availability Zone C"]
            CP3[Control Plane]
            Redis3[(Redis Replica)]
            PG3[(PostgreSQL Replica)]
            Runners3[Runner Pool]
        end

        LB[Load Balancer]
        S3[(Object Storage)]
    end

    Internet[Internet] --> LB
    LB --> CP1 & CP2 & CP3
    CP1 & CP2 & CP3 --> Redis1
    CP1 & CP2 & CP3 --> PG1
    Redis1 --> Redis2 & Redis3
    PG1 --> PG2 & PG3
    Runners1 & Runners2 & Runners3 --> S3
```

### Multi-Region (Active-Active)

```mermaid
flowchart TB
    subgraph Global["Global Layer"]
        DNS[GeoDNS]
        GlobalDB[(Global Metadata<br/>CockroachDB / Spanner)]
    end

    subgraph USEast["us-east-1"]
        LB1[Regional LB]
        CP1[Control Plane]
        Queue1[(Redis Cluster)]
        Runners1[Runner Pool]
        S31[(Artifacts)]
    end

    subgraph USWest["us-west-2"]
        LB2[Regional LB]
        CP2[Control Plane]
        Queue2[(Redis Cluster)]
        Runners2[Runner Pool]
        S32[(Artifacts)]
    end

    subgraph EU["eu-west-1"]
        LB3[Regional LB]
        CP3[Control Plane]
        Queue3[(Redis Cluster)]
        Runners3[Runner Pool]
        S33[(Artifacts)]
    end

    DNS --> LB1 & LB2 & LB3
    LB1 --> CP1
    LB2 --> CP2
    LB3 --> CP3

    CP1 & CP2 & CP3 --> GlobalDB

    S31 <-.-> S32 <-.-> S33
```

---

## Integration Points

### External Integrations

```
┌─────────────────────────────────────────────────────────────────┐
│                     Event Sources                                │
├──────────┬──────────┬──────────┬──────────┬────────────────────┤
│  GitHub  │  GitLab  │ Bitbucket│ External │     Scheduled      │
│ Webhooks │ Webhooks │ Webhooks │ Webhooks │      (Cron)        │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴───────┬────────────┘
     │          │          │          │             │
     ▼          ▼          ▼          ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Webhook Gateway                                │
│   - Signature validation (HMAC)                                 │
│   - Rate limiting & deduplication                               │
│   - Event normalization                                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Pipeline Engine │
                    └────────────────┘
```

### Cloud Provider Integrations

```
┌─────────────────────────────────────────────────────────────────┐
│                     CI/CD Platform                               │
└──────┬────────────────────┬────────────────────┬────────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
  ┌─────────┐         ┌──────────┐        ┌───────────┐
  │   AWS   │         │  Azure   │        │   GCP     │
  │ ─────── │         │ ──────── │        │ ───────── │
  │ OIDC    │         │ OIDC     │        │ OIDC      │
  │ S3      │         │ Blob     │        │ GCS       │
  │ ECR     │         │ ACR      │        │ GCR       │
  │ EKS     │         │ AKS      │        │ GKE       │
  └─────────┘         └──────────┘        └───────────┘
```

### Runner Communication Protocol

```
┌────────────────┐                    ┌─────────────────┐
│   Scheduler    │                    │     Runner      │
└───────┬────────┘                    └────────┬────────┘
        │                                      │
        │  1. Register (capabilities, labels)  │
        │<─────────────────────────────────────│
        │                                      │
        │  2. Claim job (long-poll / gRPC)     │
        │<─────────────────────────────────────│
        │                                      │
        │  3. Dispatch job (specs, secrets)    │
        │─────────────────────────────────────>│
        │                                      │
        │  4. Heartbeat (status, progress)     │
        │<─────────────────────────────────────│
        │           ... (periodic) ...         │
        │                                      │
        │  5. Complete (status, outputs)       │
        │<─────────────────────────────────────│
        │                                      │
        │  6. Release runner                   │
        │─────────────────────────────────────>│
```

---

## Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **Webhook gateway down** | New pipelines not triggered | Multiple replicas behind LB, queue durably |
| **Pipeline engine down** | No new job creation | Leader election, pending events processed on recovery |
| **Scheduler down** | No new job assignments | Leader election, running jobs continue |
| **Redis down** | Queue operations fail | Redis Cluster, Sentinel failover |
| **PostgreSQL down** | No state persistence | Replicas, automatic failover |
| **Runner crash** | Single job fails | Automatic requeue, heartbeat timeout detection |
| **Artifact store unavailable** | Jobs fail on upload/download | Multi-AZ storage, retry with backoff |
| **Network partition** | Regional isolation | Jobs continue in isolated region, cross-region sync on recovery |

**Static Stability:** Running jobs continue execution even if control plane is unavailable. Runners maintain job state locally and sync status on recovery. New jobs queue durably and execute when scheduler recovers.
