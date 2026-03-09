# 12.9 Code Execution Sandbox

## System Overview

A Code Execution Sandbox is a security-critical platform that accepts arbitrary, untrusted source code from users, compiles and executes it within tightly isolated environments under strict resource constraints, and returns execution results—all while guaranteeing that no submitted code can escape its sandbox, access other users' data, compromise the host infrastructure, or exhaust shared resources. Production systems serving millions of daily submissions across 60+ programming languages must maintain sub-2-second execution latency for typical programs, process thousands of concurrent submissions, enforce hard limits on CPU time, memory, disk I/O, and network access, support real-time output streaming, and provide accurate test case verdict evaluation—while operating under the fundamental assumption that every single submission is potentially malicious.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Architecture Style** | Queue-based worker pool with ephemeral sandboxed execution environments, decoupled submission ingestion from execution |
| **Core Abstraction** | Ephemeral execution environment—a short-lived, resource-constrained, network-isolated process container that is created, used once, and destroyed |
| **Processing Model** | Asynchronous submission processing via message queue with synchronous result delivery; real-time output streaming via WebSocket |
| **Isolation Model** | Defense-in-depth: Linux namespaces (PID, mount, network, user) + seccomp-BPF syscall filtering + cgroups v2 resource limits + read-only root filesystem, optionally wrapped in microVM (Firecracker) or user-space kernel (gVisor) |
| **Security Posture** | Adversarial by default—every submission is treated as an attack. Zero-trust execution with capability dropping, privilege de-escalation, and network egress blocking |
| **Resource Management** | Hard cgroups v2 limits on CPU time (wall-clock and CPU-clock), memory (with OOM kill), process count (fork bomb prevention), disk write (tmpfs size cap), and network (disabled or proxied) |
| **Data Consistency** | Eventual consistency for submission records; strong consistency for verdict determination (all test cases must complete before final verdict) |
| **Availability Target** | 99.9% for submission API; 99.5% for execution pipeline (degraded mode: queue submissions, delay execution) |
| **Latency Targets** | < 500ms sandbox creation (warm pool); < 2s total for simple single-file programs; < 10s for compilation-heavy languages; configurable per-problem time limits up to 30s |
| **Scalability Model** | Horizontally scaled stateless API tier; auto-scaled worker pools partitioned by language runtime; queue-based load leveling absorbs submission spikes |

---

## Quick Navigation

| Document | Focus Area |
|---|---|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, submission lifecycle, key isolation decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API contracts, scheduling algorithms, pseudocode |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Sandbox isolation internals, worker pool mechanics, resource enforcement |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Auto-scaling, warm pools, crash recovery, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Threat model, defense-in-depth, attack vector mitigations |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, security alerting |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trade-offs, trap questions, common mistakes |
| [09 - Insights](./09-insights.md) | Key architectural insights and cross-cutting patterns |

---

## What Differentiates This System

| Dimension | Naive Code Runner | Production Execution Sandbox |
|---|---|---|
| **Isolation** | Run code in a Docker container with default settings | Defense-in-depth: namespaces + seccomp-BPF + cgroups v2 + read-only FS + capability dropping, optionally inside microVM |
| **Resource Limits** | Set a timeout and hope for the best | Hard cgroups v2 enforcement for CPU (wall + CPU clock), memory (OOM kill), PID count (fork bomb), disk (tmpfs cap), network (disabled) |
| **Security Model** | Trust that containers are secure | Assume every submission is an attack—block dangerous syscalls, drop all capabilities, disable networking, use ephemeral environments |
| **Warm Pool** | Create a new container per submission (2-5s cold start) | Pre-warmed pool of ready sandboxes, leased in < 100ms, scrubbed and returned after use |
| **Language Support** | Install compilers on the host | Immutable language runtime images with pinned compiler versions, pulled into warm pool at startup |
| **Output Handling** | Capture stdout after execution completes | Real-time output streaming with size limits, stderr separation, compilation output capture, and binary output detection |
| **Verdict Logic** | Simple string comparison | Configurable comparison: exact match, whitespace-tolerant, floating-point epsilon, special judge functions |
| **Scale** | Single worker, sequential execution | Hundreds of workers across multiple pools, queue-based load leveling, auto-scaling by language demand |

---

## What Makes This System Unique

### 1. Security Is the Primary Constraint, Not Performance

Unlike most distributed systems where the primary engineering challenge is throughput, latency, or consistency, a code execution sandbox is fundamentally a **security system** that happens to need performance. Every architectural decision—from the choice of isolation technology to the warm pool design to the output capture mechanism—is evaluated first through a security lens: "Can this be exploited?" This inverts the normal optimization priority and creates trade-offs that don't exist in other systems.

### 2. Adversarial Users Are the Normal Case

Most systems design for cooperative users and handle abuse as an edge case. A code execution sandbox must assume that **every single input is a potential attack**. Fork bombs, memory bombs, symlink traversals, /proc exploitation, timing side-channels, network exfiltration, and sandbox escape attempts are not edge cases—they are the expected workload. This adversarial assumption fundamentally changes how you design resource management, process lifecycle, and error handling.

### 3. The Cold Start vs Security Trade-Off

Warm pools dramatically reduce sandbox creation latency (from 2-5s to < 100ms), but they introduce a new attack surface: if a previous execution leaves any residual state in a recycled sandbox, the next execution might access it. Scrubbing a sandbox for safe reuse must be as thorough as creating a new one—but faster. This creates a unique engineering challenge where performance optimization (reuse) and security guarantees (isolation) are in direct tension.

### 4. Multi-Language Runtime Complexity

Supporting 60+ programming languages means managing dozens of compiler/interpreter versions, each with different filesystem requirements, execution models (compiled vs interpreted), memory profiles, and security characteristics. A Java submission needs a JVM with 256MB+ heap; a C submission needs gcc and produces native binaries with direct syscall access; a Python submission needs an interpreter with potentially dangerous standard library modules. Each language has its own threat model.

---

## Complexity Rating

| Dimension | Rating | Notes |
|---|---|---|
| **Security** | ★★★★★ | Adversarial users, sandbox escape prevention, defense-in-depth, zero-trust execution |
| **Infrastructure** | ★★★★★ | MicroVM/container orchestration, warm pools, multi-language runtime management |
| **Concurrency** | ★★★★☆ | Worker pool scheduling, queue management, concurrent sandbox lifecycle |
| **Latency Sensitivity** | ★★★★☆ | Sub-2s execution target, warm pool optimization, cold start elimination |
| **Scale** | ★★★☆☆ | Thousands of concurrent executions (compute-bound, not data-bound) |
| **Domain Complexity** | ★★★★☆ | Multi-language compilation, verdict evaluation, resource limit enforcement |

---

## Key Trade-offs at a Glance

| Trade-off | Dimension A | Dimension B | Typical Resolution |
|---|---|---|---|
| **VM vs Container Isolation** | Stronger isolation (hardware boundary) | Lower overhead, faster startup | MicroVM (Firecracker) for untrusted code; gVisor for moderate trust with container ergonomics |
| **Warm Pool vs Cold Start** | Pre-warmed sandboxes (fast, resource-consuming) | On-demand creation (slow, resource-efficient) | Warm pool sized to P95 demand per language; overflow to cold start with degraded latency SLO |
| **Security vs Latency** | More isolation layers (slower) | Fewer layers (faster, less secure) | Defense-in-depth with warm pools to amortize setup cost; never sacrifice security for speed |
| **Language Breadth vs Depth** | Support 60+ languages (complex runtime management) | Support 5-10 languages deeply (simpler) | Tiered support: Tier 1 (warm pool) for popular languages, Tier 2 (cold start) for others |
| **Resource Generosity vs Fairness** | Generous limits (better UX) | Tight limits (more concurrent users) | Per-problem configurable limits with platform-wide maximums; tighter defaults for free tier |
| **Synchronous vs Async Execution** | Block until result (simpler client) | Queue and poll (better throughput) | Async with WebSocket streaming; short-poll fallback; timeout at 30s |

---

## Scale Reference Points

| Metric | Small Platform | Medium Platform | Large Platform |
|---|---|---|---|
| Daily submissions | 50K | 500K | 5M+ |
| Peak concurrent executions | 50 | 500 | 5,000+ |
| Supported languages | 10 | 30 | 60+ |
| Worker nodes | 5 | 50 | 500+ |
| Warm pool size (total) | 100 | 1,000 | 10,000+ |
| Avg execution time | 1.5s | 1.5s | 1.5s |
| P99 queue wait time | 200ms | 500ms | 2s |
| Sandbox creation time (cold) | 3s | 3s | 3s |
| Sandbox lease time (warm) | 50ms | 50ms | 50ms |

---

## Technology Landscape

| Component | Technology Options | Selection Criteria |
|---|---|---|
| **Sandbox Isolation** | Linux namespaces + seccomp-BPF, gVisor (runsc), Firecracker microVM, nsjail, WASM/WASI | Security requirements vs operational complexity vs performance overhead |
| **Resource Limits** | cgroups v2, rlimits, nsjail built-in | Granularity of control, kernel version requirements |
| **Syscall Filtering** | seccomp-BPF with custom profiles, Kafel BPF language | Number of allowed syscalls, per-language customization needs |
| **Message Queue** | Distributed message broker, streaming platform | Throughput, ordering guarantees, dead letter support |
| **Worker Orchestration** | Container orchestrator, custom scheduler | Auto-scaling granularity, resource packing efficiency |
| **Language Runtimes** | Immutable container images per language/version | Image size, startup time, security surface |
| **Result Storage** | Document store, relational database | Query patterns, retention requirements |
| **Output Streaming** | WebSocket, Server-Sent Events | Bidirectional needs, proxy compatibility |
| **Warm Pool Management** | Custom pool manager with health checks | Scrubbing thoroughness, lease/return speed |
