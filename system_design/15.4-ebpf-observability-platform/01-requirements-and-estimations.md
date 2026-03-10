# Requirements & Estimations — eBPF-based Observability Platform

## Functional Requirements

### Core Features

1. **Zero-Instrumentation Telemetry Collection** — Capture metrics, traces, and logs from kernel events (syscalls, network packets, file I/O, process lifecycle) without modifying application code, container images, or deployment manifests.

2. **Protocol-Aware L7 Observability** — Parse application-layer protocols (HTTP/1.1, HTTP/2, gRPC, DNS, Kafka, MySQL, PostgreSQL, Redis) directly in kernel space to extract request/response metadata (status codes, latencies, payload sizes) without decrypting TLS at the application layer.

3. **Continuous Profiling** — Sample CPU stack traces at configurable intervals (default: 19 Hz per logical CPU) and aggregate into flame graphs for on-demand and historical analysis. Support for on-CPU, off-CPU, memory allocation, and lock contention profiling.

4. **Network Flow Observability** — Track L3/L4 connections with full Kubernetes identity resolution (pod, service, namespace, labels) for network policy visibility, dependency mapping, and anomaly detection.

5. **Security Event Detection** — Monitor process execution, file access, network connections, and capability usage against configurable policy rules. Support both detection (alert-only) and enforcement (kill, signal, override) modes.

6. **Runtime Enforcement** — Execute synchronous policy decisions in-kernel (via LSM hooks and Tetragon-style TracingPolicy) to block unauthorized operations before they complete, without round-tripping to user space.

7. **Kubernetes-Native Identity** — Enrich all events with Kubernetes metadata (pod name, namespace, labels, service account, node) using cgroup-to-pod mapping maintained in eBPF maps.

8. **Distributed Trace Correlation** — Extract trace context (W3C Trace Context, B3 headers) from L7 protocol parsing to stitch service-to-service request flows without requiring application-side trace propagation libraries.

### Out of Scope

- Application Performance Management (APM) with code-level instrumentation (bytecode injection, monkey-patching)
- Log content parsing and structured extraction (the platform captures syscall-level I/O, not log semantics)
- Long-term storage and analytics (the platform produces telemetry; downstream systems like time-series databases and object storage handle retention)
- Windows or non-Linux kernel support
- eBPF program development IDE or authoring tools

---

## Non-Functional Requirements

### CAP Theorem Position

**AP (Availability + Partition Tolerance)** — Observability data is inherently tolerant of eventual consistency. A node's eBPF programs must continue capturing events even if the central collector is unreachable. Local buffering with best-effort delivery is acceptable; losing 0.1% of events during a network partition is vastly preferable to blocking application workloads.

### Consistency Model

**Eventual Consistency** — Telemetry events are append-only and immutable. Events captured on different nodes may arrive at the collector out of order; the processing pipeline reorders by timestamp within a configurable window (default: 30 seconds). Kubernetes identity enrichment uses locally-cached metadata with eventual consistency from the API server.

### Availability Target

| Component | Target | Rationale |
|-----------|--------|-----------|
| eBPF data plane (in-kernel) | 99.999% | Must never crash the kernel; verifier guarantees safety |
| User-space agent (per-node) | 99.95% | Agent restarts recover within seconds; eBPF programs persist in kernel |
| Central collector | 99.9% | Temporary unavailability causes local buffering, not data loss |
| Query/dashboard layer | 99.9% | Standard web service availability |

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| eBPF event capture (kernel → ring buffer) | <1μs | <5μs | <10μs |
| Event delivery (kernel → user-space agent) | <100μs | <500μs | <1ms |
| End-to-end (event → queryable in dashboard) | <5s | <15s | <30s |
| Profile query (flame graph render) | <500ms | <2s | <5s |
| Security policy enforcement (in-kernel decision) | <1μs | <5μs | <10μs |

### Durability Guarantees

- eBPF events in the ring buffer: best-effort (may be dropped under extreme load with counter tracking)
- Events delivered to user-space agent: at-least-once (WAL-backed local buffer)
- Events forwarded to central collector: at-least-once with idempotent deduplication
- Security audit events: guaranteed delivery with separate high-priority channel

---

## Capacity Estimations (Back-of-Envelope)

**Reference deployment:** 1,000 Kubernetes nodes, 50,000 pods, 200 microservices, 500K RPS aggregate.

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Raw kernel events/sec/node | 500K–2M | ~10K syscalls/sec/pod × 50 pods/node + network events |
| Post-filter events/sec/node | 5K–50K | In-kernel filtering reduces volume 10-100x (only interesting events pass) |
| Aggregate events/sec (cluster) | 5M–50M | 1,000 nodes × 5K–50K filtered events/node |
| Network flows/sec (cluster) | 2M | ~40 connections/sec/pod × 50K pods |
| Profile samples/sec (cluster) | 19M | 19 Hz × 1,000 nodes × ~1,000 logical CPUs total |
| Per-node agent memory | 200–500 MB | Ring buffer (64 MB) + map cache (128 MB) + processing buffers |
| Per-node eBPF map memory | 50–200 MB | Connection tracking maps + pid-to-pod maps + policy maps |
| Event bandwidth (per node → collector) | 5–50 MB/s | 50K events/sec × 100–1000 bytes/event (after compression) |
| Aggregate bandwidth (cluster → collector) | 5–50 GB/s | 1,000 nodes × 5–50 MB/s |
| Storage (1 day, post-aggregation) | 50–200 TB | Aggregated metrics + sampled traces + security events |
| Storage (30 days, tiered) | 200–500 TB | Hot tier (3 days) + warm tier (27 days, compressed) |
| Profile storage (30 days) | 10–30 TB | Compressed pprof-format profiles |

---

## SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Event capture overhead (CPU) | <1% per node | Measured via bpftop; eBPF program execution time ÷ wall clock time |
| Event capture overhead (latency) | <5μs p99 added to syscall | Kernel tracepoint overhead measurement |
| Event delivery completeness | >99.9% | Delivered events ÷ captured events (tracked via per-program counters) |
| Security enforcement latency | <10μs p99 | Time from hook entry to policy decision (measured in-kernel) |
| End-to-end dashboard freshness | <30s p99 | Timestamp of most recent event visible in query |
| Profile availability | >99.5% | Percentage of time windows with profile data available |
| Kernel compatibility | >95% of deployed kernels | Percentage of production kernel versions where all eBPF programs load successfully |
| Agent restart recovery | <10s | Time from agent crash to full event capture resumption |

---

## Constraints Unique to eBPF

### Verifier Constraints

| Constraint | Limit | Impact |
|------------|-------|--------|
| Instruction count | 1M verified instructions (kernel ≥5.2) | Complex protocol parsers may need to be split into multiple programs chained via tail calls |
| Stack size | 512 bytes | No recursive algorithms; all state must use maps or per-CPU arrays |
| Loop bounds | Must be provably bounded | Loops require `#pragma unroll` or explicit bounds; no while(true) patterns |
| Memory access | Must be bounds-checked | Every pointer dereference requires explicit null/bounds checks that the verifier can track |
| Helper functions | Allowlisted per program type | Not all map types and helpers are available in all contexts (e.g., no `bpf_probe_read` in XDP) |

### Kernel Version Matrix

| Feature | Minimum Kernel | Notes |
|---------|---------------|-------|
| Basic kprobes/tracepoints | 4.15 | Sufficient for basic syscall tracing |
| BTF support | 5.2 | Required for CO-RE portability |
| Ring buffer | 5.8 | Preferred over perf buffer for event streaming |
| LSM hooks | 5.7 | Required for security enforcement |
| Bloom filter map | 5.16 | Useful for high-performance set membership |
| User ring buffer | 6.1 | Enables user-space → kernel communication |
| BPF arena | 6.9 | Shared memory between BPF programs and user space |
