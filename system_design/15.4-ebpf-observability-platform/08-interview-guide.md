# Interview Guide — eBPF-based Observability Platform

## Interview Pacing (45-min format)

| Time | Phase | Focus |
|------|-------|-------|
| 0-5 min | Clarify | Scope the system: observability only, or security enforcement too? Cluster size? Kernel version constraints? Which protocols to parse? |
| 5-15 min | High-Level | Three-layer architecture (kernel data plane → node agent → central collector), eBPF program lifecycle, data flow from kernel event to dashboard |
| 15-30 min | Deep Dive | Pick 1-2: verifier constraints shaping design, ring buffer back-pressure, protocol parsing in kernel, or security enforcement architecture |
| 30-40 min | Scale & Trade-offs | Scaling the collector, kernel version compatibility matrix, ring buffer vs. perf buffer, in-kernel filtering vs. user-space filtering |
| 40-45 min | Wrap Up | Summarize key decisions, acknowledge trade-offs, discuss the meta-challenge of observing the observer |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **The verifier is an architectural constraint, not a bug:** Unlike most systems where you design the architecture first and implement it, eBPF systems are designed around what the verifier will accept. The verifier's instruction limits, stack size restrictions, and bounded-loop requirements fundamentally shape how protocol parsers, policy engines, and event pipelines are structured. Mentioning this early signals deep understanding.

2. **Zero-instrumentation is a spectrum, not a binary:** The platform can capture network flows and syscall events with true zero instrumentation, but capturing distributed traces (W3C Trace Context) requires parsing L7 headers which requires protocol-specific eBPF programs. TLS-encrypted traffic requires hooking into crypto libraries (uprobes), which is still "no application changes" but is instrumenting the runtime. Being precise about what "zero instrumentation" actually means demonstrates maturity.

3. **The observer must not become the observed:** The recursive challenge of an observability platform monitoring itself is a unique design constraint. Spend 30 seconds on this to show you've thought about the meta-problem.

4. **Kernel coupling creates a unique compatibility challenge:** No other observability system has a hard dependency on the specific Linux kernel version running on each node. CO-RE/BTF largely solves this, but the candidate should discuss what happens when it doesn't (fallback strategies, feature probing).

### Where to Spend Most Time

- **Deep Dive (15-30 min):** The verifier and ring buffer are the two most interview-relevant components. The verifier because it demonstrates understanding of a unique constraint that doesn't exist in user-space systems; the ring buffer because it's a classic systems design problem (producer-consumer under load, back-pressure, graceful degradation).

- **Don't spend time on:** Detailed storage layer design (time-series DB internals), dashboard UI architecture, or CI/CD for eBPF programs. These are important in practice but not what makes this system design unique.

---

## Trade-offs Discussion

### Trade-off 1: In-Kernel Filtering vs. User-Space Filtering

| Decision | In-Kernel Filtering | User-Space Filtering |
|----------|---------------------|---------------------|
| | **Pros:** 10-100x volume reduction before crossing kernel boundary; sub-microsecond latency; no context switch overhead | **Pros:** Arbitrary filtering logic; no verifier constraints; easier to update rules dynamically |
| | **Cons:** Limited by verifier (no unbounded loops, 512B stack); harder to debug; requires kernel programming expertise | **Cons:** Full event volume crosses kernel-user boundary; high CPU/memory overhead; context switch per event |
| **Recommendation** | In-kernel for volume reduction (drop uninteresting events early); user-space for complex correlation and behavioral analysis |

### Trade-off 2: Ring Buffer vs. Perf Buffer

| Decision | Ring Buffer (BPF_MAP_TYPE_RINGBUF) | Perf Buffer (BPF_MAP_TYPE_PERF_EVENT_ARRAY) |
|----------|-----------------------------------|---------------------------------------------|
| | **Pros:** Single shared buffer (memory efficient); global event ordering; 7% overhead on 32-core systems; reserve-commit API prevents torn reads | **Pros:** Available on older kernels (4.x+); per-CPU isolation eliminates cross-CPU contention; simpler programming model |
| | **Cons:** Requires kernel 5.8+; cross-CPU CAS contention under extreme load; single consumer | **Cons:** N × buffer_size memory; events out-of-order across CPUs; 35% overhead on 32-core systems |
| **Recommendation** | Ring buffer as primary path; perf buffer as fallback for pre-5.8 kernels |

### Trade-off 3: CO-RE vs. Per-Kernel Compilation

| Decision | CO-RE (Compile Once – Run Everywhere) | Per-Kernel Compilation (BCC-style) |
|----------|----------------------------------------|-------------------------------------|
| | **Pros:** Single binary for all kernel versions; no kernel headers needed at runtime; sub-second load time | **Pros:** Works on any kernel (even without BTF); can use kernel-version-specific features; runtime-generated code can optimize for specific kernel |
| | **Cons:** Requires BTF-enabled kernel (5.2+, ~95% of modern production kernels); CO-RE relocations may not cover all struct layout changes | **Cons:** Requires kernel headers on every node; compilation takes seconds (slow startup); LLVM/Clang dependency at runtime |
| **Recommendation** | CO-RE as primary path with pre-compiled fallback binaries for known non-BTF kernels |

### Trade-off 4: Synchronous Enforcement vs. Asynchronous Detection

| Decision | Synchronous (LSM hooks) | Asynchronous (Event streaming) |
|----------|--------------------------|-------------------------------|
| | **Pros:** Prevents the operation before it completes; no recovery needed; <10μs latency | **Pros:** Complex behavioral analysis; ML-based anomaly detection; no risk of false-positive blocking |
| | **Cons:** False positives block legitimate operations (operational risk); limited policy complexity (verifier constraints); can kill processes | **Cons:** Operation already completed when detected; can only alert, not prevent; 10-100ms delay |
| **Recommendation** | Synchronous for high-confidence, simple policies (known bad binaries, namespace violations); asynchronous for complex behavioral patterns |

### Trade-off 5: Full Event Capture vs. Sampling

| Decision | Full Capture | Statistical Sampling |
|----------|-------------|---------------------|
| | **Pros:** Complete visibility; no sampling bias; every event available for forensics | **Pros:** Dramatically lower overhead; predictable resource usage; sufficient for statistical analysis |
| | **Cons:** Enormous data volume (500K-2M events/sec/node); expensive storage; higher CPU overhead | **Cons:** Rare events may be missed; tail latency analysis less accurate; forensic analysis limited |
| **Recommendation** | Full capture with in-kernel filtering (drop uninteresting events) for network/syscall events; full capture without sampling for security events; configurable head-based sampling for traces |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|----------------------|-------------|
| "Why not just use OpenTelemetry SDK instrumentation instead of eBPF?" | Understand when eBPF adds value vs. traditional APM | "OTel SDK gives richer application-level context (business metrics, custom spans), but requires code changes in every service. eBPF provides a baseline of network, syscall, and profiling data for ALL services — including third-party, legacy, and infrastructure components — without any code changes. The ideal is both: eBPF for universal baseline, OTel SDK for application-specific enrichment." |
| "eBPF adds overhead to every syscall — isn't that dangerous in production?" | Test understanding of eBPF overhead characteristics | "The verifier guarantees programs terminate and don't corrupt kernel state, so they're safe. Overhead is typically <1% CPU: each eBPF program runs in ~100-500ns, and not all syscalls trigger eBPF programs (only attached hooks). The key insight is that in-kernel filtering means you pay the capture cost once but avoid the much larger cost of sending millions of events to user space. Netflix, Meta, and Cloudflare run eBPF in production on every server." |
| "What if the kernel version doesn't support eBPF?" | Test awareness of compatibility challenges | "Three-tier approach: (1) CO-RE programs for BTF-enabled kernels (5.2+, ~95% of production), (2) pre-compiled fallback binaries for specific known kernels without BTF, (3) minimal program suite for very old kernels (4.15+) with basic tracing only. The agent probes kernel features at startup and loads the most capable program suite available. In the worst case, the agent runs in passive mode — no eBPF, just log/metric forwarding." |
| "Can eBPF see inside encrypted (TLS) traffic?" | Test nuanced understanding of eBPF capabilities | "eBPF cannot decrypt TLS — it doesn't have access to TLS keys. But there are two approaches to observe encrypted traffic: (1) Hook into the crypto library (OpenSSL, BoringSSL) via uprobes at the point where plaintext is handed to the library for encryption, or received after decryption. This captures the plaintext without breaking TLS. (2) For kTLS (kernel TLS), hook at the sendmsg/recvmsg level where the kernel handles encryption. Both approaches work without application code changes, but they're library-specific and require knowing which crypto library the application uses." |
| "How do you handle a noisy neighbor pod generating millions of events?" | Test understanding of resource isolation in shared kernel space | "Per-cgroup rate limiting in eBPF. Each eBPF program checks a per-cgroup counter before emitting events. If a pod exceeds its event budget (e.g., 10K events/sec), additional events are dropped at the kernel level — they never reach the ring buffer or user space. The drop counter is always incremented, so the noisy pod's suppression is itself observable. This is the bulkhead pattern applied at the kernel level." |
| "What happens if your eBPF agent crashes?" | Test understanding of the kernel/user-space split | "This is where eBPF's architecture shines. eBPF programs and maps are pinned to the BPF filesystem. When the agent crashes, the eBPF programs continue running in the kernel, writing events to the ring buffer. The ring buffer accumulates events. When the agent restarts (typically <10 seconds as a DaemonSet), it re-attaches to the pinned programs and ring buffers, and drains the accumulated events. There's no observability gap — just a brief delay in event delivery. Security enforcement also continues uninterrupted because the policy maps and LSM programs persist." |

---

## Common Mistakes to Avoid

1. **Treating eBPF as "just a library"** — eBPF is not a library you call from your code; it's a program you load into the kernel that runs independently. The agent and the eBPF program have separate lifecycles, separate failure modes, and communicate only through maps and ring buffers.

2. **Ignoring the verifier** — Designing a protocol parser or policy engine without considering verifier constraints leads to programs that look correct but cannot be loaded. The verifier must be treated as a first-class architectural constraint, not an afterthought.

3. **Assuming all kernels are equal** — A design that works on kernel 6.1 may fail on kernel 5.4. CO-RE helps, but feature probing and graduated program suites are essential for production deployments across heterogeneous kernel fleets.

4. **Conflating "no code changes" with "no overhead"** — eBPF adds CPU overhead (typically <1%, but real). It adds memory overhead (maps, ring buffers). It adds complexity (verifier errors, kernel compatibility). The value proposition is not "free monitoring" — it's "monitoring without application code changes."

5. **Designing a flat collector** — At 1,000+ nodes, a single collector tier creates a fan-in bottleneck. Hierarchical collection (node → regional → central) is essential for scalability.

6. **Forgetting the meta-observability problem** — If the observability platform goes down, who observes the outage? The platform must have a self-monitoring path that is independent of its primary event pipeline.

7. **Over-indexing on security enforcement** — eBPF can block processes, deny syscalls, and kill containers. But false-positive enforcement in production is catastrophic. Start with detection-only policies; promote to enforcement only after high confidence is established.

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|----------|----------------|
| What's the expected cluster size? (100 nodes vs. 10,000 nodes) | Determines collector architecture (flat vs. hierarchical) and storage strategy |
| Which kernel versions are in production? | Determines CO-RE vs. fallback strategy, available eBPF features |
| Is security enforcement in scope, or just observability? | Dramatically changes the risk profile and complexity (enforcement has higher blast radius) |
| What protocols does the application fleet use? (HTTP/1, HTTP/2, gRPC, custom) | Determines protocol parser complexity and verifier constraints |
| Is TLS termination at the load balancer or in-pod? | Determines whether TC hooks see plaintext or encrypted traffic |
| What's the existing observability stack? (Prometheus, Jaeger, etc.) | eBPF platform should complement, not replace, existing instrumentation |
| What's the tolerance for event loss under extreme load? | Determines ring buffer sizing and sampling strategy |

---

## Scoring Rubric (Self-Assessment)

| Dimension | Junior (L4-L5) | Senior (L6) | Staff (L7+) |
|-----------|-----------------|-------------|-------------|
| **Architecture** | Describes eBPF at a high level; basic agent → collector pipeline | Three-layer architecture with kernel/user-space/cluster separation; ring buffer as data bridge | Discusses verifier as architectural constraint; CO-RE portability; hierarchical collection |
| **Deep Dive** | Knows eBPF programs run in kernel | Explains verifier purpose, map types, ring buffer vs. perf buffer | Discusses verifier instruction limits, tail call chaining, bounded loop idioms, protocol parsing under verifier constraints |
| **Scalability** | "Add more collectors" | Per-node filtering, edge aggregation, ring buffer sizing | Adaptive sampling, per-cgroup rate limits, hierarchical collection with regional aggregation, NUMA-aware ring buffer selection |
| **Security** | "eBPF runs as root" | CAP_BPF separation, unprivileged BPF disabled | BPF token signing, JIT hardening, enforcement vs. detection trade-off, verifier CVE awareness |
| **Trade-offs** | Identifies one trade-off | Discusses 2-3 with clear recommendations | Frames each decision with specific numbers (overhead %, latency, kernel version requirements) and explains when each side of the trade-off wins |
| **Failure Handling** | "Restart the agent" | Agent crash recovery via BPF pinning; ring buffer accumulates events | WAL-backed local buffer; security event priority channel; graceful degradation matrix (full → reduced → minimal → passive) |
