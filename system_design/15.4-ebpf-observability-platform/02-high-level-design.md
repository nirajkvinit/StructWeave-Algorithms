# High-Level Design — eBPF-based Observability Platform

## System Architecture

The platform follows a three-layer architecture: **kernel data plane** (eBPF programs attached to kernel hooks), **node-level control plane** (user-space agent managing eBPF lifecycle and event processing), and **cluster-level analytics plane** (central collectors, storage, and query engines).

```mermaid
flowchart TB
    subgraph Kernel["Linux Kernel (per Node)"]
        direction LR
        subgraph Hooks["Attach Points"]
            KP[kprobes / kretprobes]
            TP[Tracepoints]
            TC[TC Hooks]
            XDP[XDP]
            LSM[LSM Hooks]
            CGRP[cgroup Hooks]
            PERF[perf_events]
        end
        subgraph Programs["eBPF Programs"]
            NET[Network Observer]
            SYS[Syscall Tracer]
            SEC[Security Enforcer]
            PROF[CPU Profiler]
            PROTO[Protocol Parser]
        end
        subgraph Maps["eBPF Maps"]
            RB[Ring Buffer]
            CT[Connection Track Map]
            POD[PID-to-Pod Map]
            POL[Policy Map]
            STATS[Per-CPU Stats Array]
        end
        KP --> SYS
        TP --> SYS
        TC --> NET
        XDP --> NET
        LSM --> SEC
        CGRP --> NET
        PERF --> PROF
        NET --> CT
        NET --> PROTO
        SYS --> RB
        PROTO --> RB
        SEC --> POL
        SEC --> RB
        PROF --> RB
        NET --> POD
        SYS --> POD
    end

    subgraph Agent["User-Space Agent (per Node)"]
        LDR[Program Loader]
        CONS[Ring Buffer Consumer]
        ENR[K8s Enricher]
        FLT[Filter / Aggregator]
        BUF[Local WAL Buffer]
        MGMT[Lifecycle Manager]
    end

    subgraph Cluster["Cluster-Level Services"]
        COLL[Event Collector]
        TSDB[Time-Series DB]
        TRACE[Trace Store]
        PROF_STORE[Profile Store]
        SEC_STORE[Security Event Store]
        QUERY[Query Engine]
        DASH[Dashboard / UI]
        ALERT[Alert Manager]
    end

    RB --> CONS
    CONS --> ENR
    ENR --> FLT
    FLT --> BUF
    BUF --> COLL
    LDR --> Programs
    MGMT --> LDR

    COLL --> TSDB
    COLL --> TRACE
    COLL --> PROF_STORE
    COLL --> SEC_STORE
    TSDB --> QUERY
    TRACE --> QUERY
    PROF_STORE --> QUERY
    SEC_STORE --> QUERY
    QUERY --> DASH
    QUERY --> ALERT

    classDef kernel fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef hook fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef program fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef maps fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef agent fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef cluster fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class KP,TP,TC,XDP,LSM,CGRP,PERF hook
    class NET,SYS,SEC,PROF,PROTO program
    class RB,CT,POD,POL,STATS maps
    class LDR,CONS,ENR,FLT,BUF,MGMT agent
    class COLL,TSDB,TRACE,PROF_STORE,SEC_STORE,QUERY,DASH,ALERT cluster
```

---

## eBPF Program Lifecycle

```mermaid
sequenceDiagram
    participant Agent as User-Space Agent
    participant Compiler as eBPF Compiler (CO-RE)
    participant Verifier as Kernel Verifier
    participant JIT as JIT Compiler
    participant Hook as Kernel Hook
    participant Map as eBPF Maps
    participant RB as Ring Buffer
    participant Consumer as Ring Buffer Consumer

    Agent->>Compiler: Load CO-RE ELF object
    Compiler->>Compiler: Apply BTF relocations
    Compiler->>Verifier: Submit bytecode + BTF
    Verifier->>Verifier: Static analysis (DAG walk, bounds check)
    alt Verification fails
        Verifier-->>Agent: Reject with error log
        Agent->>Agent: Log error, try fallback program
    else Verification passes
        Verifier->>JIT: Approved bytecode
        JIT->>JIT: Translate to native machine code
        JIT->>Hook: Attach to kernel hook point
    end

    Note over Hook,Map: Runtime execution path
    Hook->>Hook: Kernel event triggers eBPF program
    Hook->>Map: Read/update connection tracking
    Hook->>Map: Lookup PID-to-Pod mapping
    Hook->>RB: Submit enriched event
    RB->>Consumer: Poll for new events
    Consumer->>Agent: Deliver to processing pipeline
```

---

## Data Flow: Network Request Observation

This sequence shows how a single HTTP request between two Kubernetes pods is captured, enriched, and delivered — all without any application instrumentation.

```mermaid
sequenceDiagram
    participant PodA as Pod A (Client)
    participant Kernel as Linux Kernel
    participant TC as TC eBPF Program
    participant Proto as Protocol Parser
    participant Maps as eBPF Maps
    participant RB as Ring Buffer
    participant Agent as Node Agent
    participant Collector as Central Collector

    PodA->>Kernel: send() syscall (HTTP GET /api/users)
    Kernel->>TC: TC egress hook fires
    TC->>Maps: Lookup source cgroup → Pod A identity
    TC->>Proto: Parse L7 protocol headers
    Proto->>Proto: Detect HTTP/1.1 GET, extract path, headers
    Proto->>Maps: Store request metadata in connection map (keyed by 5-tuple + seq)

    Note over Kernel: ... network transit ...

    Kernel->>TC: TC ingress hook fires (response)
    TC->>Maps: Lookup connection map for matching request
    TC->>Proto: Parse HTTP response (status 200, content-length)
    Proto->>Proto: Calculate latency (response_ts - request_ts)
    Proto->>RB: Submit complete request/response event

    RB->>Agent: Consume event from ring buffer
    Agent->>Agent: Enrich with K8s metadata (pod name, namespace, labels)
    Agent->>Agent: Aggregate into RED metrics (rate, errors, duration)
    Agent->>Collector: Forward via gRPC (batched, compressed)
    Collector->>Collector: Index for querying, trigger alerts
```

---

## Key Architectural Decisions

### 1. In-Kernel Filtering vs. User-Space Filtering

| Aspect | In-Kernel (Chosen) | User-Space |
|--------|-------------------|------------|
| **Volume reduction** | 10-100x before crossing kernel boundary | Full event volume crosses boundary |
| **CPU overhead** | Higher per-event eBPF cost, but far fewer events processed user-side | Lower per-event kernel cost, but massive user-space processing |
| **Flexibility** | Limited by verifier (no unbounded loops, 512B stack) | Arbitrary processing logic |
| **Latency** | Sub-microsecond filtering | Millisecond-scale (context switch + copy) |
| **Recommendation** | Filter aggressively in-kernel: drop uninteresting events, aggregate counters, pre-compute RED metrics | Only use for complex correlation that exceeds verifier limits |

### 2. Ring Buffer vs. Perf Buffer

| Aspect | Ring Buffer (Chosen) | Perf Buffer |
|--------|---------------------|-------------|
| **Memory efficiency** | Single shared buffer across all CPUs | Per-CPU buffers (N × buffer_size total) |
| **Event ordering** | Globally ordered (MPSC) | Per-CPU ordered; requires user-space merge |
| **Overhead (32-core node)** | ~7% CPU overhead | ~35% CPU overhead |
| **Kernel requirement** | Linux 5.8+ | Linux 4.x+ |
| **Back-pressure** | Atomic reserve/commit; events can be dropped with counter | Per-CPU watermarks; harder to detect global pressure |
| **Recommendation** | Use ring buffer for all event streaming; fall back to perf buffer only on pre-5.8 kernels |

### 3. CO-RE vs. Per-Kernel Compilation

| Aspect | CO-RE (Chosen) | Per-Kernel Compilation |
|--------|---------------|----------------------|
| **Portability** | Single binary runs across kernel versions (with BTF) | Must compile on each target kernel |
| **Build complexity** | Compile once with target-agnostic headers | Requires kernel headers on every node |
| **Runtime cost** | BTF relocation at load time (negligible) | Full compilation at load time (seconds) |
| **Kernel requirement** | BTF-enabled kernel (5.2+, most distros since 2020) | Any kernel with headers |
| **Recommendation** | CO-RE as primary path; ship pre-compiled fallbacks for known non-BTF kernels |

### 4. Push vs. Pull for Event Delivery

| Aspect | Push (Chosen) | Pull |
|--------|--------------|------|
| **Freshness** | Events delivered within seconds of capture | Bounded by poll interval |
| **Back-pressure** | Requires flow control (agent buffers when collector is slow) | Collector controls consumption rate |
| **Network efficiency** | Batching + compression over persistent gRPC streams | HTTP polling overhead |
| **Failure handling** | Agent buffers locally during collector outage | Collector simply stops pulling |
| **Recommendation** | Push with flow control: persistent gRPC streams, local WAL buffer, exponential backoff on failure |

### 5. Synchronous vs. Asynchronous Security Enforcement

| Aspect | Synchronous In-Kernel (Chosen for enforcement) | Async User-Space (for detection) |
|--------|-----------------------------------------------|----------------------------------|
| **Latency** | <10μs — decision made before syscall returns | Milliseconds — event reaches user space after syscall completes |
| **Blocking capability** | Can prevent the operation (kill process, deny syscall) | Can only alert; operation already completed |
| **Policy complexity** | Limited by eBPF constraints (no external lookups) | Arbitrary rule engines, ML models |
| **Use case** | Runtime enforcement: block unauthorized exec, file access | Behavioral detection: anomaly scoring, correlation |
| **Recommendation** | Layered approach: synchronous in-kernel enforcement for high-confidence policies, async user-space detection for complex behavioral analysis |

---

## Architecture Pattern Checklist

- [x] **Sync vs Async communication decided** — Synchronous in-kernel enforcement; async event streaming for observability
- [x] **Event-driven vs Request-response decided** — Event-driven: kernel events trigger eBPF programs; ring buffer delivers events asynchronously
- [x] **Push vs Pull model decided** — Push from agents to collectors via persistent gRPC streams
- [x] **Stateless vs Stateful services identified** — eBPF programs are stateless (maps provide shared state); agents are stateless (WAL provides durability); collectors are stateless behind a load balancer
- [x] **Read-heavy vs Write-heavy optimization applied** — Write-heavy: optimized for event ingestion throughput; read path is query-time aggregation
- [x] **Real-time vs Batch processing decided** — Real-time for event streaming and security; batch for profile aggregation and long-term analytics
- [x] **Edge vs Origin processing considered** — Heavy edge processing (in-kernel filtering, per-node aggregation) to minimize central load

---

## Component Interaction Summary

| Component | Inputs | Outputs | State |
|-----------|--------|---------|-------|
| eBPF Programs | Kernel events (syscalls, packets, scheduling) | Filtered events → ring buffer; map updates | Connection tracking maps, per-CPU counters |
| Node Agent | Ring buffer events, K8s API watch | Enriched events → collector; metrics → local Prometheus | K8s metadata cache, WAL buffer |
| Central Collector | gRPC event streams from all agents | Indexed events → storage backends | Deduplication state, routing rules |
| Time-Series DB | Aggregated metrics | Query results for dashboards | Metric time series with retention policies |
| Trace Store | Distributed trace spans | Trace queries, dependency graphs | Span storage with trace ID indexing |
| Profile Store | Compressed pprof profiles | Flame graph queries, diff profiles | Profile storage with time-range indexing |
| Security Event Store | Policy violation events | Security alerts, audit queries | Immutable audit log |
| Query Engine | User queries (PromQL, TraceQL, custom) | Aggregated results, visualizations | Query cache |
