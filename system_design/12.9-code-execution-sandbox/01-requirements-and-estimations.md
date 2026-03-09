# Requirements & Estimations — Code Execution Sandbox

## 1. Functional Requirements

### Core Features

| # | Requirement | Description |
|---|---|---|
| FR-1 | **Code Submission** | Accept source code with language identifier, optional stdin input, and compilation flags via REST API |
| FR-2 | **Multi-Language Execution** | Support 60+ programming languages with configurable compiler/interpreter versions |
| FR-3 | **Resource-Limited Execution** | Enforce hard limits on CPU time (wall-clock and CPU-clock), memory, process count, disk write, and network access |
| FR-4 | **Output Capture** | Capture stdout, stderr, compilation output, and execution metadata (time, memory usage, exit code) |
| FR-5 | **Test Case Evaluation** | Run submitted code against multiple test cases and produce per-case verdicts (Accepted, Wrong Answer, Time Limit Exceeded, Memory Limit Exceeded, Runtime Error, Compilation Error) |
| FR-6 | **Real-Time Output Streaming** | Stream execution output to the client in real-time via WebSocket for interactive coding environments |
| FR-7 | **Batch Submission** | Accept multiple test cases in a single submission, execute sequentially or in parallel, aggregate results |
| FR-8 | **Custom Comparison** | Support configurable output comparison modes: exact match, whitespace-tolerant, floating-point epsilon, custom judge |
| FR-9 | **Language Discovery** | Expose API endpoint listing available languages, versions, and default resource limits |
| FR-10 | **Submission Status** | Provide submission lifecycle status: queued → compiling → running → judging → completed |

### Out of Scope

- Full IDE features (syntax highlighting, autocomplete, debugging)
- Code storage and version control
- User management and authentication (handled by parent platform)
- Problem/challenge content management
- Collaborative real-time editing
- Long-running server processes (web servers, daemons)

---

## 2. Non-Functional Requirements

### Security (Primary Constraint)

| Requirement | Target | Rationale |
|---|---|---|
| **Sandbox Escape** | Zero successful escapes | A single escape compromises the entire platform and all user data |
| **Cross-Submission Isolation** | Complete data isolation between submissions | No submission can read files, processes, or network traffic of another |
| **Host Protection** | No host filesystem/network access from sandbox | Sandbox must not be able to modify or read host state |
| **Resource Exhaustion** | No single submission can degrade others | Fork bombs, memory bombs, disk bombs must be contained within sandbox limits |
| **Network Exfiltration** | No outbound network from sandbox (default) | Prevent data theft, cryptocurrency mining, botnet participation |
| **Syscall Surface** | Minimum viable syscall allowlist per language | Reduce kernel attack surface; default-deny with per-language exceptions |

### Performance

| Requirement | Target | Rationale |
|---|---|---|
| **Submission API Latency** | P99 < 200ms | Synchronous acknowledgment that submission is accepted and queued |
| **Queue-to-Execution** | P50 < 500ms, P99 < 2s | Time from queue entry to sandbox execution start (warm pool hit) |
| **Simple Program E2E** | P50 < 1.5s, P99 < 3s | Total time from submission to result for a "Hello World" program |
| **Compilation Latency** | P50 < 2s, P99 < 5s | For compiled languages (C, C++, Java, Rust) |
| **Output Streaming** | < 100ms latency | Time from program stdout write to client WebSocket receipt |
| **Cold Start** | < 3s | Sandbox creation when warm pool is exhausted |

### Availability & Reliability

| Requirement | Target | Rationale |
|---|---|---|
| **API Availability** | 99.9% | Submission acceptance should almost never fail |
| **Execution Availability** | 99.5% | Execution may be delayed but should not be lost |
| **Zero Submission Loss** | 100% durability | Every accepted submission must eventually execute or explicitly fail |
| **Verdict Correctness** | 100% | False positives (marking correct code as wrong) erode trust; false negatives are equally damaging |
| **Graceful Degradation** | Queue-based buffering | During overload, accept submissions and increase queue time rather than rejecting |

---

## 3. Capacity Estimations

### Traffic Profile

| Metric | Value | Derivation |
|---|---|---|
| Daily active users | 500,000 | Platform assumption |
| Submissions per user per day | 10 | Average across practice and contest modes |
| **Daily submissions** | **5,000,000** | 500K × 10 |
| Peak hour factor | 3× | Contest hours drive 3× average traffic |
| Average submissions/sec | 58 | 5M / 86,400 |
| **Peak submissions/sec** | **175** | 58 × 3 |
| Contest spike factor | 10× | First minute of a popular contest |
| **Spike submissions/sec** | **580** | 58 × 10 |

### Compute Requirements

| Metric | Value | Derivation |
|---|---|---|
| Avg test cases per submission | 15 | Platform average across all problems |
| Avg execution time per test case | 500ms | Weighted average across languages |
| **Total execution-seconds per submission** | **7.5s** | 15 × 0.5s |
| Avg CPU cores per execution | 1 | Single-threaded execution (most problems) |
| **Peak concurrent executions** | **1,312** | 175 subs/sec × 7.5s per sub |
| **Spike concurrent executions** | **4,350** | 580 × 7.5 |
| Worker utilization target | 70% | Headroom for spikes |
| **Workers needed (peak)** | **1,875** | 1,312 / 0.7 |
| **Workers needed (spike)** | **6,215** | 4,350 / 0.7 |

### Memory Requirements

| Metric | Value | Derivation |
|---|---|---|
| Memory limit per execution | 256 MB | Default limit; configurable per problem |
| Worker overhead | 64 MB | Worker process, monitoring agent |
| **Memory per worker** | **320 MB** | 256 + 64 |
| **Peak cluster memory** | **586 GB** | 1,875 × 320 MB |
| Warm pool sandbox memory | 128 MB | Pre-allocated, idle sandbox footprint |
| **Warm pool memory (1,000 sandboxes)** | **125 GB** | 1,000 × 128 MB |

### Storage Requirements

| Metric | Value | Derivation |
|---|---|---|
| Avg source code size | 2 KB | Typical competitive programming submission |
| Avg output per submission | 5 KB | All test case outputs combined |
| Metadata per submission | 1 KB | Timestamps, verdicts, resource usage |
| **Storage per submission** | **8 KB** | 2 + 5 + 1 |
| **Daily storage** | **39 GB** | 5M × 8 KB |
| **Monthly storage** | **1.17 TB** | 39 GB × 30 |
| Retention period | 90 days | After which only metadata is retained |
| **Active storage** | **3.5 TB** | 90 × 39 GB |

### Network Requirements

| Metric | Value | Derivation |
|---|---|---|
| Avg request size (code + metadata) | 5 KB | Source code + JSON envelope |
| Avg response size (results) | 10 KB | Per-test-case verdicts + execution metadata |
| **Peak inbound bandwidth** | **875 KB/s** | 175 × 5 KB |
| **Peak outbound bandwidth** | **1.7 MB/s** | 175 × 10 KB |
| WebSocket streaming connections | 10,000 | Concurrent users watching output |
| **Streaming bandwidth** | **5 MB/s** | 10K connections × 500 bytes/s avg |

---

## 4. Service Level Objectives (SLOs)

### Tiered SLOs

| SLO | Gold (Contest) | Standard | Budget |
|---|---|---|---|
| **Submission acceptance** | 99.99% | 99.9% | 99.5% |
| **E2E latency (simple program)** | P99 < 2s | P99 < 3s | P99 < 5s |
| **E2E latency (compiled language)** | P99 < 5s | P99 < 8s | P99 < 12s |
| **Queue wait time** | P99 < 500ms | P99 < 2s | P99 < 10s |
| **Verdict correctness** | 100% | 100% | 100% |
| **Sandbox security** | Zero escapes | Zero escapes | Zero escapes |
| **Submission durability** | 100% | 100% | 99.9% |

### SLO Error Budget

| SLO | Monthly Budget | Allowed Failures (5M daily) |
|---|---|---|
| 99.99% acceptance | 4.3 minutes downtime | 15,000 rejected submissions |
| 99.9% acceptance | 43 minutes downtime | 150,000 rejected submissions |
| 100% verdict correctness | 0 errors | 0 incorrect verdicts |
| Zero escapes | 0 incidents | 0 sandbox breaches |

### Burn Rate Alerts

| Alert Level | Condition | Action |
|---|---|---|
| **Page (Critical)** | 14.4× burn rate over 1 hour | Immediate incident response; halt new submissions if security SLO |
| **Page (High)** | 6× burn rate over 6 hours | Escalate to on-call; investigate root cause |
| **Ticket (Medium)** | 3× burn rate over 1 day | Next business day investigation |
| **Log (Low)** | 1× burn rate sustained | Monitor trend; plan capacity adjustment |
