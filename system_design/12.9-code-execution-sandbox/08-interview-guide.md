# Interview Guide — Code Execution Sandbox

## 1. Interview Pacing (45-Minute Format)

| Phase | Duration | Focus | Deliverables |
|---|---|---|---|
| **Requirements** | 5 min | Clarify scope: just execution, or judging too? Languages? Scale? | FR list, NFR priorities, scale numbers |
| **High-Level Design** | 10 min | Queue-based architecture, submission lifecycle, key components | Architecture diagram, data flow |
| **Isolation Deep Dive** | 12 min | Defense-in-depth: namespaces, seccomp, cgroups, filesystem | Isolation layer diagram, threat model (top 4-5 attacks) |
| **Worker Pool & Warm Pool** | 8 min | Scheduling, warm pool lifecycle, cold start mitigation | Worker architecture, pool sizing rationale |
| **Scale & Reliability** | 5 min | Auto-scaling strategy, crash recovery, degradation | Scaling triggers, failure recovery |
| **Wrap-Up** | 5 min | Trade-offs summary, questions for interviewer | Clear articulation of design decisions |

### Phase-by-Phase Strategy

**Requirements phase:** Immediately establish that this is a **security-first system**. Ask: "Should I assume all submitted code is potentially malicious?" (The answer is always yes.) This signals that you understand the domain.

**High-level design:** Draw the queue-based worker pool architecture early. Show the decoupling between submission ingestion and execution. Name the key components: Submission API, Message Queue, Scheduler, Worker Pool, Warm Pool Manager, Sandbox Environment.

**Isolation deep dive (this is where you win or lose):** The interviewer wants to see **layered thinking**. Don't just say "use Docker." Walk through each isolation layer: namespaces → seccomp → cgroups → filesystem → network. For each, explain what it prevents. Then cover specific threats: fork bombs, memory bombs, network exfiltration.

**Worker pool:** Show you understand the cold start problem and why warm pools exist. Discuss the trade-off: warm pools trade idle resource cost for latency.

**Scale & reliability:** Focus on queue-based load leveling, auto-scaling signals, and what happens when workers crash mid-execution.

---

## 2. Meta-Commentary

### What Makes This System Unique in Interviews

This system is fundamentally different from most system design questions:

1. **Security is the primary constraint, not performance.** In most systems, you optimize for throughput, latency, or consistency. Here, you optimize for isolation. Every performance optimization must be evaluated against: "Does this create a new attack vector?"

2. **Users are adversarial by nature.** Unlike a social media platform where 99.9% of users are cooperative, a code execution sandbox's *primary use case* involves executing untrusted code. Even well-intentioned users accidentally write fork bombs, infinite loops, and memory-hogging programs. Malicious users will actively try to escape.

3. **The interviewer wants to see defense-in-depth thinking.** Saying "I'll use Docker for isolation" shows surface-level understanding. The strong answer layers multiple independent defenses: namespaces for process isolation, seccomp for syscall filtering, cgroups for resource limits, filesystem restrictions for data isolation, network namespaces for network isolation, and time limits for runaway prevention. Each layer independently contains different attack classes.

4. **OS-level knowledge is a differentiator.** Candidates who can discuss Linux namespaces, seccomp-BPF, cgroups v2, and capability dropping demonstrate systems engineering depth. You don't need to recite syscall numbers, but knowing that PID namespaces prevent cross-process visibility, or that `pids.max` in cgroups prevents fork bombs, sets you apart.

5. **The "simple" approach is dangerously wrong.** A naive design (run code in a Docker container, set a timeout) is vulnerable to dozens of attacks. The interviewer will probe whether you understand why Docker alone is insufficient for untrusted code execution.

---

## 3. Trade-offs Discussion

| Trade-off | Option A | Option B | Key Considerations |
|---|---|---|---|
| **VM vs Container vs MicroVM vs WASM** | Full VM: strongest isolation, slowest startup (5-10s) | Container + seccomp: weakest isolation, fastest (50ms). MicroVM: strong isolation + fast boot (125ms). WASM: strong isolation but limited language support | MicroVM is the sweet spot for adversarial environments; containers + seccomp work for lower trust requirements. WASM is future-looking but only supports ~10 languages today |
| **Warm pool vs Cold start** | Warm pool: fast (< 100ms lease), consumes idle resources (memory for pre-warmed sandboxes), adds complexity (scrubbing, pool management) | Cold start: simple (create on demand), slow (1-3s), no idle resource waste | Warm pool is mandatory at scale. The key insight is that scrubbing a reused sandbox must be as secure as creating a new one—otherwise you trade security for speed |
| **Shared workers vs Language-dedicated workers** | Shared: any worker can execute any language; better utilization; complex warm pool management | Dedicated: workers specialize in 1-2 languages; simpler warm pool; possible underutilization for niche languages | Hybrid: dedicated pools for top 5 languages (Python, C++, Java, JS, Go); shared pool for remainder. Language affinity routing with overflow |
| **Compilation included vs Pre-compiled** | Include compilation in sandbox: simpler; compiler has same security constraints; adds 1-5s latency | Pre-compile outside sandbox, inject binary: faster execution; but compiler bugs are now a separate security domain | Always compile inside the sandbox. Compiler exploits are real (crafted source files that trigger compiler bugs). Compilation must be sandboxed |
| **Output streaming vs Batch result** | Streaming: real-time feedback, better UX for interactive coding; complex (WebSocket per user, output buffering) | Batch: simple poll for result; no streaming overhead; worse UX | Support both: WebSocket streaming for interactive use; polling for API clients. Output must be bounded regardless (64KB cap) |
| **Allowlist vs Blocklist seccomp** | Allowlist (default-deny): safer (new syscalls blocked by default); requires per-language maintenance; may break on kernel updates | Blocklist (default-allow): easier to maintain; new syscalls are allowed by default (dangerous); miss new attack vectors | Always use allowlist. The maintenance cost is worth it—a blocklist means every new kernel version could introduce an exploitable syscall you didn't think to block |

---

## 4. Trap Questions

| Question | Why It's a Trap | Strong Answer |
|---|---|---|
| **"Why not just use Docker?"** | Docker with default settings exposes 300+ syscalls, runs as root (unless configured), shares the host kernel, and has a long history of container escapes. Saying "Docker is fine" shows you don't understand the security requirements | "Docker alone is insufficient for untrusted code. Default Docker shares the host kernel with 300+ syscalls exposed, runs processes that map to UID 0 on the host, and has had multiple escape vulnerabilities. We need additional layers: user namespace mapping (container root → host nobody), seccomp-BPF to restrict syscalls to ~50, cgroups v2 for hard resource limits, and read-only filesystem with minimal /dev. Optionally, we wrap everything in a microVM for hardware-level isolation" |
| **"How do you handle fork bombs?"** | This tests whether you understand cgroups PID limits AND why PID limits alone aren't sufficient (64 spinning processes still consume CPU) | "Three layers: first, `pids.max = 64` via cgroups v2 so fork() returns EAGAIN after 64 processes. But those 64 processes still consume CPU, so second, the CPU time quota limits their total CPU consumption. Third, the wall-clock timeout kills the entire cgroup after the time limit plus a grace period. The combination of PID limit + CPU limit + wall-clock timeout provides triple defense" |
| **"What if someone exploits a kernel vulnerability?"** | Tests whether you know about microVM isolation and defense-in-depth beyond user-space protections | "This is why defense-in-depth is essential. seccomp-BPF reduces the kernel attack surface from 300+ to ~50 syscalls—the vulnerable syscall might not be in our allowlist. Capability dropping removes privileges needed for many exploits. User namespace mapping means even a successful root exploit inside the sandbox gains only nobody privileges on the host. For maximum isolation, we run sandboxes inside microVMs, providing a hardware boundary—a kernel exploit inside the microVM only compromises the guest kernel, not the host" |
| **"Why not run in the cloud provider's serverless?"** | Serverless functions (Lambda-style) have cold starts of 500ms-5s, limited runtime customization, no control over isolation layers, and per-invocation pricing at high scale is extremely expensive | "Serverless functions aren't designed for adversarial workloads. We lose control over the isolation stack—we can't configure seccomp profiles, cgroup limits, or filesystem restrictions. Cold starts are unpredictable (500ms-5s). We can't maintain warm pools. Pricing at 5M executions/day would be prohibitive. And we can't stream output in real-time. Custom worker infrastructure gives us the control needed for security and the economics needed for scale" |
| **"How do you support 30+ languages efficiently?"** | Tests understanding of the operational complexity of multi-language support: image management, per-language seccomp profiles, warm pool partitioning, and the impact on resource allocation | "Tiered approach: Tier 1 (5-10 popular languages) gets dedicated warm pools, language-affinity workers, and optimized seccomp profiles. Tier 2 (10-20 additional) gets smaller warm pools with cold start fallback. Tier 3 (niche languages) runs on demand with cold starts. All languages share a common base image layer to minimize storage and pull times. Each language has its own seccomp profile because different runtimes need different syscalls (Java needs clone3 for threading; Python needs execve for interpreter startup; C needs neither)" |
| **"What if the code runs forever?"** | Tests whether you understand the distinction between CPU time and wall-clock time, and why both are necessary | "Two independent time limits: CPU time (via cgroups cpu.max) catches infinite computation—`while(true){}` exhausts its CPU quota quickly. Wall-clock time (external timer) catches non-CPU resource consumption—`while(true){ sleep(1); }` uses zero CPU but blocks a worker forever. We need both because a program can consume resources without consuming CPU (sleeping, blocked I/O, waiting on locks). The wall-clock timer sends SIGTERM, waits 500ms for graceful shutdown, then SIGKILL" |

---

## 5. Common Mistakes

### Mistake 1: Treating This as a Normal Web Service

**What candidates do:** Jump into API design, database schema, and caching without addressing security. Spend 30 minutes on CRUD operations for submissions.

**Why it's wrong:** The core challenge isn't building a submission API—it's building a secure execution environment. The API is trivially a REST endpoint with a queue. The security model is what differentiates a production sandbox from a homework assignment.

**Fix:** After 3-4 minutes on requirements and a quick sketch of the submission flow, pivot to: "The most critical component is the sandbox isolation layer. Let me walk through the defense-in-depth approach."

### Mistake 2: Single-Layer Isolation

**What candidates do:** Say "We'll use Docker containers" or "We'll use a VM" and move on.

**Why it's wrong:** No single isolation technology is sufficient. Docker containers share the host kernel and have had multiple escape CVEs. VMs are strong but slow. The strong answer is defense-in-depth: namespaces + seccomp + cgroups + filesystem restrictions + network isolation, optionally inside a microVM.

**Fix:** Explicitly walk through 4-5 layers, explaining what each prevents. Show the interviewer that breaching one layer doesn't compromise the system.

### Mistake 3: Ignoring Resource Limits

**What candidates do:** Set a timeout and assume everything else is fine.

**Why it's wrong:** Fork bombs, memory bombs, and disk bombs don't hit time limits directly. A fork bomb creates 65,000 processes before any timeout fires. A memory bomb OOMs the host. A disk bomb fills the host disk.

**Fix:** Address each resource independently: CPU (cgroups), memory (cgroups + OOM kill), PIDs (cgroups pids.max), disk (tmpfs size limits + rlimits), network (empty namespace), file descriptors (rlimits).

### Mistake 4: Not Discussing the Warm Pool

**What candidates do:** Assume sandbox creation is fast enough for real-time execution.

**Why it's wrong:** Creating a namespace-isolated sandbox with filesystem mounts, cgroup setup, and seccomp filtering takes 1-3 seconds. At 175 submissions/second, this means every user waits 1-3 seconds before execution even starts.

**Fix:** Introduce the warm pool concept: pre-create sandboxes and lease them on demand (< 100ms). Discuss the scrubbing challenge: returned sandboxes must be thoroughly cleaned to prevent cross-submission data leakage.

### Mistake 5: Forgetting Compilation Security

**What candidates do:** Only discuss execution security. Compile code outside the sandbox, then inject the binary.

**Why it's wrong:** Compilers are complex software with their own vulnerabilities. A crafted source file can exploit a compiler bug (e.g., buffer overflow in GCC's template parser) and gain code execution during compilation. If compilation happens outside the sandbox, the attacker has host access.

**Fix:** Explicitly state: "Compilation happens inside the same sandbox, with the same isolation constraints. The compiler is just another program running untrusted input."

---

## 6. Questions to Ask the Interviewer

Ask 2-3 of these based on what hasn't been covered:

| Question | What It Signals | What You Learn |
|---|---|---|
| "Are users expected to be adversarial, or is this a trusted environment?" | You think about threat models, not just functionality | Determines isolation depth needed |
| "What's the expected language count? 5 or 50+?" | You understand multi-language operational complexity | Drives warm pool strategy and image management |
| "Is this for competitive programming, online education, or CI/CD?" | Use case affects latency requirements, security model, and scale | Contest: bursty, latency-critical. Education: steady, interactive. CI/CD: batch, reliability-focused |
| "Do we need to support custom test case judges?" | Shows awareness of the verdict evaluation complexity | Custom judges introduce additional security concerns (judge code is also untrusted) |
| "What's the availability target during contests vs normal operation?" | Shows understanding of tiered SLOs | Contests require higher availability and faster execution |
| "Should we support real-time output streaming or is polling sufficient?" | Architecture difference between WebSocket streaming and REST polling | Streaming adds complexity but dramatically improves UX |

---

## 7. Quick Reference Card

### Must-Mention Concepts

| Concept | Key Point | When to Mention |
|---|---|---|
| **Defense-in-depth** | 5+ overlapping isolation layers; no single layer trusted | Within first 10 minutes; frame the entire isolation discussion around this |
| **Namespaces** | PID, mount, network, user, IPC, UTS, cgroup — 7 namespace types | During isolation deep dive |
| **seccomp-BPF** | Allowlist ~50 of 300+ syscalls; default-deny; per-language profiles | During isolation deep dive; specifically when asked about security |
| **cgroups v2** | Hard limits for CPU, memory, PID count, disk I/O | When discussing resource limits and fork bomb defense |
| **Warm pool** | Pre-created sandboxes; < 100ms lease vs 1-3s cold start | When discussing performance and the cold start problem |
| **Queue-based load leveling** | Decouple ingestion from execution; absorb spikes | During high-level architecture |
| **Wall-clock vs CPU time** | Both needed: infinite loop vs sleep() vs I/O blocking | When discussing time limits |
| **MicroVM** | Hardware VM boundary; < 125ms boot; strongest isolation | When differentiating isolation options or asked "what about kernel exploits?" |
| **Adversarial users** | Not an edge case—the primary workload is untrusted code | During requirements or meta-discussion |

### Architecture Diagram Checklist

Ensure your whiteboard diagram includes:

- [ ] Client → Load Balancer → API Gateway (auth + rate limit)
- [ ] Submission API → Message Queue (decoupled)
- [ ] Queue → Scheduler → Worker Pool
- [ ] Worker → Warm Pool Manager → Sandbox Environment
- [ ] Sandbox: show namespaces + seccomp + cgroups layers
- [ ] Result Store + Cache (read path)
- [ ] WebSocket Gateway (streaming path)
- [ ] Monitoring / Observability

### Complexity Differentiators

What separates a Senior answer from a Staff answer:

| Aspect | Senior Answer | Staff Answer |
|---|---|---|
| **Isolation** | "Containers with seccomp and cgroups" | "Tiered: nsjail for standard, gVisor for moderate trust, Firecracker for zero trust. Per-language seccomp profiles with allowlisting. Defense-in-depth with 5+ layers" |
| **Warm pool** | "Pre-create sandboxes" | "Pool sized per-language using queuing theory (Little's Law). Scrubbing covers filesystem wipe, PID namespace reset, cgroup counter reset, filesystem integrity verification" |
| **Fork bomb** | "Set a process limit" | "pids.max for immediate containment, CPU quota for resource conservation, wall-clock for final cleanup. The 64 processes still consume CPU—PID limits alone don't prevent resource exhaustion" |
| **Scaling** | "Auto-scale on queue depth" | "Multi-signal scaling: queue depth, P95 wait time, CPU utilization, warm pool hit rate. Pre-scale for scheduled contests. Scale-down with drain (no abrupt termination)" |
| **Failure** | "Retry failed submissions" | "Queue visibility timeout handles worker crashes (auto-retry without explicit requeue). Poison message detection after 3 failed attempts. Circuit breaker per language runtime" |

---

*Previous: [Observability](./07-observability.md) · Next: [Insights](./09-insights.md)*
