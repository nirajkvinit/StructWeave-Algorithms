# High-Level Design — Code Execution Sandbox

## 1. System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WEB["Web IDE Client"]
        API_CLIENT["API Client"]
        CONTEST["Contest Platform"]
    end

    subgraph Gateway["API Gateway Layer"]
        LB["Load Balancer"]
        AUTH["Auth / Rate Limiter"]
        SUBMIT_API["Submission API"]
        STATUS_API["Status API"]
        WS_GW["WebSocket Gateway"]
    end

    subgraph Processing["Processing Layer"]
        QUEUE["Submission Queue"]
        SCHEDULER["Worker Scheduler"]
        DLQ["Dead Letter Queue"]
    end

    subgraph Workers["Execution Worker Pool"]
        direction LR
        W1["Worker 1"]
        W2["Worker 2"]
        WN["Worker N"]
    end

    subgraph Sandbox["Sandbox Layer (per Worker)"]
        POOL_MGR["Warm Pool Manager"]
        SANDBOX_ENV["Sandboxed Environment<br/>namespaces + seccomp + cgroups"]
        RUNTIME["Language Runtime"]
    end

    subgraph Storage["Storage Layer"]
        RESULT_DB[("Result Store")]
        CODE_STORE[("Code / Object Storage")]
        TC_STORE[("Test Case Store")]
        CACHE["Result Cache"]
    end

    subgraph Monitoring["Observability"]
        METRICS["Metrics Collector"]
        LOGS["Log Aggregator"]
        ALERTS["Alert Manager"]
    end

    WEB --> LB
    API_CLIENT --> LB
    CONTEST --> LB
    LB --> AUTH
    AUTH --> SUBMIT_API
    AUTH --> STATUS_API
    AUTH --> WS_GW

    SUBMIT_API --> QUEUE
    SUBMIT_API --> CODE_STORE
    STATUS_API --> RESULT_DB
    STATUS_API --> CACHE
    WS_GW -.->|stream output| W1

    QUEUE --> SCHEDULER
    SCHEDULER --> W1
    SCHEDULER --> W2
    SCHEDULER --> WN
    QUEUE --> DLQ

    W1 --> POOL_MGR
    POOL_MGR --> SANDBOX_ENV
    SANDBOX_ENV --> RUNTIME

    W1 --> RESULT_DB
    W1 --> TC_STORE
    W1 --> CACHE

    W1 --> METRICS
    W1 --> LOGS
    METRICS --> ALERTS

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef monitor fill:#fce4ec,stroke:#c62828,stroke-width:2px

    class WEB,API_CLIENT,CONTEST client
    class LB,AUTH,SUBMIT_API,STATUS_API,WS_GW gateway
    class SCHEDULER,W1,W2,WN,POOL_MGR,SANDBOX_ENV,RUNTIME service
    class RESULT_DB,CODE_STORE,TC_STORE data
    class CACHE cache
    class QUEUE,DLQ queue
    class METRICS,LOGS,ALERTS monitor
```

---

## 2. Submission Lifecycle

The journey of a code submission from client to verdict follows this flow:

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Submission API
    participant Q as Message Queue
    participant S as Scheduler
    participant W as Worker
    participant PM as Pool Manager
    participant SB as Sandbox
    participant TC as Test Case Store
    participant DB as Result Store
    participant WS as WebSocket Gateway

    C->>API: POST /submissions {code, language, problem_id}
    API->>API: Validate & rate-limit
    API->>DB: Store submission (status: queued)
    API->>Q: Enqueue submission_id
    API-->>C: 202 Accepted {submission_id}

    Q->>S: Dequeue next submission
    S->>S: Select worker (language affinity + load)
    S->>W: Assign submission

    W->>DB: Update status → compiling
    W->>PM: Lease sandbox (language: python3.11)
    PM->>PM: Check warm pool → hit
    PM-->>W: Sandbox handle (lease_id)

    W->>SB: Inject source code
    W->>SB: Compile (if compiled language)
    alt Compilation Error
        W->>DB: Store verdict: CE
        W-->>C: Result: Compilation Error
    end

    W->>TC: Fetch test cases for problem_id
    loop For each test case
        W->>SB: Execute with stdin[i], limits
        SB->>WS: Stream stdout (real-time)
        WS->>C: Forward output stream
        SB-->>W: {stdout, stderr, exit_code, time_ms, memory_kb}
        W->>W: Compare output vs expected
        W->>DB: Store test case verdict
        alt Time Limit Exceeded
            W->>SB: SIGKILL → collect partial output
            W->>DB: Store verdict: TLE
        end
    end

    W->>DB: Store final verdict + aggregated results
    W->>PM: Return sandbox (lease_id)
    PM->>PM: Scrub sandbox → return to warm pool
    W-->>C: Final result (via poll or WebSocket)
```

---

## 3. Key Architectural Decisions

### Decision 1: Isolation Technology Selection

| Option | Security | Performance | Operational Complexity | Verdict |
|---|---|---|---|---|
| **Plain Docker** | Low — shared kernel, 340 syscalls exposed | High — near-native | Low | Insufficient for untrusted code |
| **Docker + seccomp + gVisor** | High — user-space kernel intercepts syscalls | Medium — 10-30% I/O overhead | Medium | Good balance for most workloads |
| **Firecracker microVM** | Very High — hardware VM boundary, separate kernel | Medium — 125ms boot, 5MB overhead | High — kernel/rootfs management | Best for adversarial environments |
| **WASM/WASI** | High — no kernel access, capability-based | High — near-native for supported languages | Medium — limited language support | Future option; limited language coverage today |
| **nsjail** | High — namespaces + cgroups + seccomp-BPF + Kafel | High — minimal overhead | Low — single binary, protobuf config | Excellent for competitive programming |

**Selected Approach:** Tiered isolation based on trust level:
- **Tier 1 (Default):** nsjail with namespaces + cgroups v2 + seccomp-BPF — covers 90% of use cases with minimal overhead
- **Tier 2 (High Security):** gVisor (runsc) for untrusted or long-running submissions
- **Tier 3 (Maximum Isolation):** Firecracker microVM for contest environments or enterprise deployments

### Decision 2: Warm Pool Strategy

**Problem:** Creating a fresh sandbox takes 1-3 seconds (namespace setup, filesystem mount, cgroup creation). At 175 submissions/second, this latency is unacceptable.

**Solution:** Pre-warm a pool of ready-to-use sandboxes per language runtime.

| Aspect | Design Choice | Rationale |
|---|---|---|
| Pool sizing | Per-language, based on historical demand | Python pool: 200, C++: 150, Java: 100, etc. |
| Minimum pool size | 10% of peak demand per language | Guarantee warm hits for steady-state traffic |
| Maximum pool size | 150% of peak demand per language | Cap resource consumption during low traffic |
| Scrubbing on return | Full filesystem wipe, PID namespace reset, cgroup reset | Prevent cross-submission data leakage |
| Health checks | Periodic liveness probe (exec a no-op in sandbox) | Detect and replace broken sandboxes |
| Eviction | LRU eviction when total pool exceeds cluster limit | Free memory during low-demand periods |
| Replenishment | Background thread maintains pool at target size | Async creation doesn't block request path |

### Decision 3: Queue Architecture

**Problem:** Submission ingestion rate can spike 10× during contests. Workers process at a fixed rate determined by compute capacity.

**Solution:** Message queue decouples submission acceptance from execution.

| Aspect | Design Choice |
|---|---|
| Queue type | Persistent message queue with at-least-once delivery |
| Partitioning | By language (enables language-affinity worker routing) |
| Priority | Contest submissions get higher priority than practice |
| Visibility timeout | 60 seconds (if worker doesn't ACK, message re-queues) |
| Dead letter queue | After 3 failed attempts, move to DLQ for manual review |
| Ordering | Per-user FIFO within partition (prevent starvation) |
| Backpressure | If queue depth > 10,000, return 503 with retry-after header |

### Decision 4: Test Case Execution Model

| Option | Pros | Cons | Selected |
|---|---|---|---|
| **Sequential in single sandbox** | Simple; reuse compiled binary | Single test failure affects subsequent tests; harder to parallelize | Default |
| **Parallel across sandboxes** | Faster total execution; isolated failures | Higher resource usage; compilation duplicated per sandbox | For contests |
| **Sequential with early termination** | Stop on first failure; save resources | User doesn't see all failing tests | Optional |

---

## 4. Data Flow Summary

### Write Path (Submission → Execution)

1. **Client** sends code via REST API
2. **API Gateway** validates, rate-limits, authenticates
3. **Submission API** stores code in Object Storage, metadata in Result Store, enqueues submission ID
4. **Scheduler** dequeues, selects worker based on language affinity and current load
5. **Worker** leases sandbox from warm pool, injects code, compiles, executes against test cases
6. **Worker** stores per-test-case verdicts and final aggregate verdict in Result Store

### Read Path (Result Retrieval)

1. **Client** polls `GET /submissions/{id}` or listens on WebSocket
2. **Status API** checks Result Cache → Result Store
3. Returns submission status, per-test-case verdicts, execution metrics

### Streaming Path (Real-Time Output)

1. **Client** opens WebSocket connection to WebSocket Gateway
2. **Worker** pipes sandbox stdout/stderr to WebSocket Gateway via internal pub/sub
3. **Gateway** forwards output chunks to client with < 100ms latency
4. Connection closes when execution completes or times out

---

## 5. Architecture Pattern Checklist

| Pattern | Application in This System |
|---|---|
| **Queue-Based Load Leveling** | Message queue absorbs submission spikes; workers consume at steady rate |
| **Competing Consumers** | Multiple workers consume from the same queue; work is distributed |
| **Bulkhead** | Separate worker pools per language prevent one language's issues from affecting others |
| **Circuit Breaker** | If a language runtime consistently fails, stop scheduling to that pool and alert |
| **Sidecar** | Monitoring agent runs alongside worker, collecting metrics and logs |
| **Strangler Fig** | Migrate from Docker-based isolation to gVisor/Firecracker incrementally |
| **Ephemeral Infrastructure** | Sandboxes are created, used once, destroyed—no persistent state |
| **Object Pool** | Warm pool of pre-created sandboxes, leased and returned |
| **Defense in Depth** | Multiple overlapping security layers (namespaces, seccomp, cgroups, read-only FS) |
