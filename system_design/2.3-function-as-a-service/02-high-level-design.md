# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture

### Control Plane vs Data Plane Overview

```mermaid
flowchart TB
    subgraph Clients["Clients & Event Sources"]
        SDK[SDK / CLI]
        HTTP[HTTP Requests]
        Queue[Message Queues]
        Storage[Storage Events]
        Cron[Scheduled Events]
    end

    subgraph ControlPlane["Control Plane"]
        subgraph APILayer["API Layer"]
            APIGW[API Gateway]
            FnAPI[Function API]
        end

        subgraph Management["Management Services"]
            Registry[(Function Registry)]
            ConfigStore[(Config Store)]
            ScalingCtrl[Scaling Controller]
        end

        subgraph Orchestration["Orchestration"]
            WorkerMgr[Worker Manager]
            Placement[Placement Service]
            WarmPool[Warm Pool Manager]
        end
    end

    subgraph DataPlane["Data Plane"]
        subgraph FrontendWorkers["Frontend Workers"]
            FW1[Frontend 1]
            FW2[Frontend 2]
            FWN[Frontend N]
        end

        subgraph WorkerFleet["Worker Fleet (Bare-metal)"]
            subgraph Worker1["Worker Host 1"]
                Slot1A[MicroVM Slot]
                Slot1B[MicroVM Slot]
                Slot1C[MicroVM Slot]
            end
            subgraph Worker2["Worker Host 2"]
                Slot2A[MicroVM Slot]
                Slot2B[MicroVM Slot]
            end
            subgraph WorkerN["Worker Host N"]
                SlotNA[MicroVM Slot]
                SlotNB[MicroVM Slot]
            end
        end
    end

    subgraph Storage["Storage Layer"]
        CodeStore[(Code Storage<br/>S3/GCS)]
        L2Cache[(Regional Cache<br/>L2)]
        LogStore[(Log Aggregator)]
        MetricsDB[(Metrics Store)]
    end

    SDK --> APIGW
    HTTP --> FW1 & FW2 & FWN
    Queue --> FW1 & FW2 & FWN
    Storage --> FW1
    Cron --> FW1

    APIGW --> FnAPI
    FnAPI --> Registry & ConfigStore
    FnAPI --> WorkerMgr

    ScalingCtrl --> WorkerMgr
    WorkerMgr --> Placement
    WorkerMgr --> WarmPool
    Placement --> Worker1 & Worker2 & WorkerN

    FW1 & FW2 & FWN --> Placement
    FW1 & FW2 & FWN --> Worker1 & Worker2 & WorkerN

    Worker1 & Worker2 & WorkerN --> L2Cache
    L2Cache --> CodeStore
    Worker1 & Worker2 & WorkerN --> LogStore
    Worker1 & Worker2 & WorkerN --> MetricsDB
```

### Component Responsibilities

| Component | Layer | Responsibility |
|-----------|-------|---------------|
| **API Gateway** | Control | External API endpoint, authentication, request routing |
| **Function API** | Control | CRUD operations for functions, versions, configurations |
| **Function Registry** | Control | Persistent storage of function metadata and versions |
| **Scaling Controller** | Control | Monitor demand signals, make scaling decisions |
| **Worker Manager** | Control | Coordinate execution environment lifecycle across fleet |
| **Placement Service** | Control | Select optimal worker for each invocation |
| **Warm Pool Manager** | Control | Maintain pre-initialized execution environments |
| **Frontend Workers** | Data | Route invocations, handle sync/async, apply throttling |
| **Worker Fleet** | Data | Execute functions in isolated MicroVM/container sandboxes |
| **Code Storage** | Storage | Durable storage for function packages (multi-region) |
| **Regional Cache (L2)** | Storage | Shared cache for frequently-used function code |
| **Log Aggregator** | Storage | Collect and index function execution logs |

---

## Data Flow

### Synchronous Invocation (HTTP Request)

```mermaid
sequenceDiagram
    participant Client as Client
    participant FW as Frontend Worker
    participant PS as Placement Service
    participant WM as Worker Manager
    participant WH as Worker Host
    participant MVM as MicroVM
    participant Cache as Code Cache

    Client->>FW: POST /invoke/my-function
    FW->>FW: Authenticate & Authorize
    FW->>FW: Check rate limits

    FW->>PS: Get execution slot for function-id

    alt Warm Instance Available
        PS-->>FW: Worker Host X, Slot Y (warm)
        FW->>WH: Forward request to slot
        WH->>MVM: Invoke handler
        MVM->>MVM: Execute user code
        MVM-->>WH: Response
        WH-->>FW: Response
    else Cold Start Required
        PS->>WM: Request new slot
        WM->>WH: Allocate MicroVM slot
        WH->>WH: Start Firecracker MicroVM (~125ms)
        WH->>Cache: Fetch function code
        Cache-->>WH: Code package
        WH->>MVM: Initialize runtime
        MVM->>MVM: Run user init code
        PS-->>FW: Worker Host X, Slot Y (ready)
        FW->>WH: Forward request
        WH->>MVM: Invoke handler
        MVM-->>WH: Response
        WH-->>FW: Response
    end

    FW-->>Client: HTTP Response

    Note over WH,MVM: MicroVM kept warm for subsequent requests
```

### Asynchronous Invocation (Queue-based)

```mermaid
sequenceDiagram
    participant ES as Event Source (SQS)
    participant Poller as Event Poller
    participant Queue as Internal Queue
    participant FW as Frontend Worker
    participant PS as Placement Service
    participant WH as Worker Host
    participant DLQ as Dead Letter Queue

    ES->>Poller: Poll for messages
    Poller->>Poller: Batch messages
    Poller->>Queue: Enqueue invocation requests

    loop Process Queue
        FW->>Queue: Dequeue batch
        FW->>PS: Get execution slots
        PS-->>FW: Worker assignments

        par Parallel Invocations
            FW->>WH: Invoke function (msg 1)
            WH-->>FW: Success
        and
            FW->>WH: Invoke function (msg 2)
            WH-->>FW: Success
        and
            FW->>WH: Invoke function (msg 3)
            WH-->>FW: Failure
        end

        FW->>ES: Delete successful messages

        alt Retry Available
            FW->>Queue: Re-enqueue failed (with backoff)
        else Max Retries Exceeded
            FW->>DLQ: Send to dead letter queue
        end
    end
```

### Cold Start vs Warm Start Paths

```mermaid
flowchart TB
    subgraph Request["Incoming Request"]
        REQ[Invocation Request]
    end

    REQ --> CHECK{Warm slot<br/>available?}

    CHECK -->|Yes| WARM[Route to Warm Slot]
    WARM --> INVOKE[Invoke Handler]
    INVOKE --> RESP[Return Response]

    CHECK -->|No| COLD[Cold Start Path]

    subgraph ColdPath["Cold Start Breakdown"]
        COLD --> ALLOC[Allocate Worker Slot<br/>~10ms]
        ALLOC --> BOOT[Boot MicroVM<br/>~125ms]
        BOOT --> FETCH[Fetch Code<br/>~50-200ms]
        FETCH --> RUNTIME[Init Runtime<br/>~50-500ms]
        RUNTIME --> USERINIT[User Init Code<br/>Variable]
    end

    USERINIT --> INVOKE

    subgraph Optimizations["Cold Start Optimizations"]
        OPT1[Provisioned Concurrency<br/>Pre-warmed slots]
        OPT2[SnapStart<br/>Checkpoint after init]
        OPT3[Multi-tier Caching<br/>L1/L2/L3]
        OPT4[Predictive Warming<br/>ML-based]
    end

    OPT1 -.-> CHECK
    OPT2 -.-> USERINIT
    OPT3 -.-> FETCH
    OPT4 -.-> COLD
```

---

## Key Architectural Decisions

### 1. MicroVM vs Container vs V8 Isolate

| Approach | Security | Cold Start | Languages | Memory | Verdict |
|----------|----------|------------|-----------|--------|---------|
| **MicroVM (Firecracker)** | Strongest (hardware) | ~125ms | Any | ~5 MB overhead | **AWS Lambda** |
| **gVisor** | Strong (syscall filter) | ~50-100ms | Any | Lower than VM | Google Cloud Run |
| **Container** | Moderate (namespace) | ~200-500ms | Any | Variable | OpenFaaS, older platforms |
| **V8 Isolate** | Good (process isolation) | <5ms | JS/WASM | ~1/10th Node.js | **Cloudflare Workers** |

**Rationale:** MicroVMs provide the strongest multi-tenant isolation with acceptable cold start for most workloads. V8 Isolates excel at edge with near-zero cold start but limited to JavaScript/WASM.

### 2. Centralized vs Distributed Placement

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Centralized placement** | Global view, optimal decisions, simpler | Scale limits, latency | Hybrid (regional) |
| **Distributed placement** | Lower latency, fault isolated | Suboptimal placement, coordination | Regional cells |

**Rationale:** Use regional placement services that have full view within a region. Cross-region is handled at higher level (GeoDNS, global load balancer).

### 3. Pull vs Push for Event Sources

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Pull (polling)** | Backpressure control, batch efficiency | Latency, polling overhead | **Queue sources** |
| **Push (webhook)** | Low latency, simple | No backpressure, need buffering | **HTTP triggers** |

**Rationale:** Queues use pull model for controlled consumption and batching. HTTP uses push for immediate response requirement.

### 4. Warm Pool Strategy

| Strategy | Pros | Cons | Use Case |
|----------|------|------|----------|
| **No warm pool** | Lowest cost | High cold start rate | Infrequent functions |
| **Per-function warm pool** | Best latency | Memory cost | High-traffic functions |
| **Shared warm pool** | Balanced cost/latency | Runtime mismatch possible | Medium traffic |
| **Provisioned concurrency** | Guaranteed warm | Continuous cost | Latency-critical |

**Rationale:** Layered approach - provisioned for latency-critical, per-function warm pools for steady traffic, shared pools for long tail.

### 5. Code Caching Strategy

| Tier | Location | Capacity | Latency | Hit Rate Target |
|------|----------|----------|---------|-----------------|
| **L1** | Worker local | 50 GB | <1ms | 80% (recent) |
| **L2** | Regional shared | 20 TB | <10ms | 95% |
| **L3** | Object storage | Unlimited | 50-200ms | 100% |

**Rationale:** Multi-tier caching minimizes code download latency. L1 for hot functions, L2 for regional popularity, L3 as durable origin.

---

## Architecture Pattern Checklist

- [x] **Sync vs Async:** Both - sync for HTTP, async for queue/event processing
- [x] **Event-driven vs Request-response:** Event-driven internally; request-response for sync invocations
- [x] **Push vs Pull:** Push for HTTP triggers; Pull for queue-based event sources
- [x] **Stateless vs Stateful:** Stateless functions; state externalized to databases/cache
- [x] **Read-heavy vs Write-heavy:** Mixed - heavy writes (logs, metrics); heavy reads (code fetch)
- [x] **Real-time vs Batch:** Real-time invocations; batch for event source polling
- [x] **Leader election:** For scaling controller, placement service coordination

---

## Deployment Topologies

### Single Region

```mermaid
flowchart TB
    subgraph Region["Region (us-east-1)"]
        subgraph AZ1["Availability Zone A"]
            CP1[Control Plane]
            FW1[Frontend Workers]
            WF1[Worker Fleet]
            Cache1[(L2 Cache)]
        end

        subgraph AZ2["Availability Zone B"]
            CP2[Control Plane]
            FW2[Frontend Workers]
            WF2[Worker Fleet]
            Cache2[(L2 Cache)]
        end

        subgraph AZ3["Availability Zone C"]
            CP3[Control Plane]
            FW3[Frontend Workers]
            WF3[Worker Fleet]
            Cache3[(L2 Cache)]
        end

        LB[Regional Load Balancer]
        CodeS3[(Code Storage<br/>S3 - Regional)]
    end

    Internet[Internet] --> LB
    LB --> FW1 & FW2 & FW3
    FW1 --> WF1
    FW2 --> WF2
    FW3 --> WF3
    WF1 --> Cache1
    WF2 --> Cache2
    WF3 --> Cache3
    Cache1 & Cache2 & Cache3 --> CodeS3
```

### Multi-Region (Active-Active)

```mermaid
flowchart TB
    subgraph Global["Global Layer"]
        DNS[Route 53 / GeoDNS]
        GlobalLB[Global Load Balancer]
        CodeOrigin[(Code Storage<br/>Multi-region)]
    end

    subgraph USEast["us-east-1"]
        LB1[Regional LB]
        CP1[Control Plane]
        DF1[Data Plane]
        Cache1[(L2 Cache)]
    end

    subgraph USWest["us-west-2"]
        LB2[Regional LB]
        CP2[Control Plane]
        DF2[Data Plane]
        Cache2[(L2 Cache)]
    end

    subgraph EU["eu-west-1"]
        LB3[Regional LB]
        CP3[Control Plane]
        DF3[Data Plane]
        Cache3[(L2 Cache)]
    end

    subgraph APAC["ap-southeast-1"]
        LB4[Regional LB]
        CP4[Control Plane]
        DF4[Data Plane]
        Cache4[(L2 Cache)]
    end

    DNS --> GlobalLB
    GlobalLB --> LB1 & LB2 & LB3 & LB4
    LB1 --> CP1 --> DF1
    LB2 --> CP2 --> DF2
    LB3 --> CP3 --> DF3
    LB4 --> CP4 --> DF4
    DF1 --> Cache1 --> CodeOrigin
    DF2 --> Cache2 --> CodeOrigin
    DF3 --> Cache3 --> CodeOrigin
    DF4 --> Cache4 --> CodeOrigin
```

---

## Integration Points

### Event Source Integrations

```
┌─────────────────────────────────────────────────────────────┐
│                     Event Sources                            │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│   HTTP   │  Queue   │ Storage  │  Stream  │   Scheduled    │
│ (API GW) │  (SQS)   │  (S3)    │ (Kinesis)│    (Cron)      │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴───────┬────────┘
     │          │          │          │             │
     ▼          ▼          ▼          ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Event Router / Poller                      │
│   - Source-specific adapters                                │
│   - Batching and filtering                                  │
│   - Retry and error handling                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                ┌────────────────┐
                │ Frontend Worker │
                └────────────────┘
```

### Execution Environment Interface

```
Function Invocation → Worker Host → Sandbox Manager
                                          │
                         ┌────────────────┼────────────────┐
                         │                │                │
                         ▼                ▼                ▼
                   Firecracker        gVisor          Container
                    MicroVM         Sandbox           Runtime
                         │                │                │
                         └────────────────┼────────────────┘
                                          │
                                          ▼
                                    ┌──────────┐
                                    │  User    │
                                    │ Function │
                                    │   Code   │
                                    └──────────┘
```

### Observability Integration

```
┌─────────────────────────────────────────────────────────────┐
│                     Function Execution                       │
└──────┬────────────────────┬────────────────────┬────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
  ┌─────────┐         ┌──────────┐        ┌───────────┐
  │  Logs   │         │ Metrics  │        │  Traces   │
  │ stdout  │         │ Duration │        │ Context   │
  │ stderr  │         │ Memory   │        │ Propagate │
  │ custom  │         │ Errors   │        │           │
  └────┬────┘         └────┬─────┘        └─────┬─────┘
       │                   │                    │
       ▼                   ▼                    ▼
  ┌─────────────────────────────────────────────────────────┐
  │              Observability Pipeline                      │
  │  ┌──────────┐    ┌────────────┐    ┌───────────────┐   │
  │  │CloudWatch│    │ Prometheus │    │ X-Ray/Jaeger  │   │
  │  │  Logs    │    │  /Datadog  │    │               │   │
  │  └──────────┘    └────────────┘    └───────────────┘   │
  └─────────────────────────────────────────────────────────┘
```

---

## Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **Frontend worker down** | Partial invocation failures | Multiple frontends behind LB, health checks |
| **Worker host down** | Functions on that host fail | Reschedule to other hosts, warm pool redistribution |
| **Placement service down** | No new cold starts possible | Leader election, fallback to local decisions |
| **Code cache miss** | Slower cold start | Multi-tier caching, prefetching |
| **Control plane unavailable** | No deployments, no scaling changes | Existing functions continue (static stability) |
| **Event source disconnection** | Events not processed | Retry with backoff, DLQ |
| **MicroVM crash** | Single invocation fails | Container restart, new slot allocation |
| **Network partition** | Regional isolation | Multi-AZ within region, cross-region fallback |

**Static Stability:** Data plane continues executing existing functions even if control plane is unavailable. Warm instances serve requests, but no new cold starts or configuration changes until recovery.
