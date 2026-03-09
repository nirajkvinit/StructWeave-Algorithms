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

**Requirements phase (5 min):** Immediately establish that this is a **security-first system**. Ask: "Should I assume all submitted code is potentially malicious?" (The answer is always yes.) This signals that you understand the domain. Also clarify:

- Is this for competitive programming, online education, or CI/CD?
- How many languages? 5 or 50+?
- Are there contests with synchronized start times?
- Real-time output streaming or batch results?

Nail down the scale: daily submissions (5M), peak submissions/sec (175), languages (60+).

**High-level design (10 min):** Draw the queue-based worker pool architecture early. Show the decoupling between submission ingestion and execution—this is the single most important architectural decision. Name the key components:

1. **Submission API** — accepts code, validates, enqueues
2. **Message Queue** — decouples ingestion from execution; absorbs spikes
3. **Scheduler** — assigns submissions to workers based on language affinity and load
4. **Worker Pool** — stateless compute nodes that execute sandboxed code
5. **Warm Pool Manager** — maintains pre-created sandboxes per language
6. **Sandbox Environment** — isolated execution environment with defense-in-depth
7. **Result Store + Cache** — persists verdicts and execution metadata
8. **WebSocket Gateway** — streams output in real-time

Show the submission lifecycle: Client → API → Queue → Scheduler → Worker → Sandbox → Result.

**Isolation deep dive (12 min — this is where you win or lose):** The interviewer wants to see **layered thinking**. Walk through each isolation layer systematically:

1. **Namespaces** (PID, mount, network, user, IPC, UTS, cgroup) — what each isolates
2. **seccomp-BPF** — allowlist ~50 syscalls; explain why allowlist not blocklist
3. **cgroups v2** — CPU, memory, PID count, disk I/O limits
4. **Filesystem** — read-only root, tmpfs workspace, no /proc or /sys
5. **Network** — empty namespace (no interfaces at all)
6. **Capabilities** — drop ALL, set NO_NEW_PRIVS
7. **Time limits** — wall-clock + CPU time, both needed

Then cover 3-4 specific threats: fork bombs, memory bombs, network exfiltration, /proc exploitation.

**Worker pool (8 min):** Show you understand the cold start problem and why warm pools exist. Cover:

- Cold start: 1-3s (namespace creation, filesystem mount, cgroup setup)
- Warm pool: < 100ms lease from pre-created pool
- Scrubbing: must be as thorough as creation (filesystem wipe, PID reset, cgroup reset)
- Per-language partitioning: Python pool can't serve Java requests
- Tiered strategy: Tier 1 (warm), Tier 2 (partial), Tier 3 (cold only)

**Scale & reliability (5 min):** Focus on:

- Queue-based load leveling: absorb 10× spikes without dropping requests
- Auto-scaling signals: queue depth, P95 wait, CPU utilization, warm pool hit rate
- Worker crash recovery: queue visibility timeout → auto-retry on another worker
- Poison message detection: 3 failures → dead letter queue
- Circuit breaker per language runtime

---

## 2. Meta-Commentary

### What Makes This System Unique in Interviews

This system is fundamentally different from most system design questions:

**1. Security is the primary constraint, not performance.** In most systems, you optimize for throughput, latency, or consistency. Here, you optimize for isolation. Every performance optimization must be evaluated against: "Does this create a new attack vector?"

**2. Users are adversarial by nature.** Unlike a social media platform where 99.9% of users are cooperative, a code execution sandbox's *primary use case* involves executing untrusted code. Even well-intentioned users accidentally write fork bombs, infinite loops, and memory-hogging programs. Malicious users will actively try to escape.

**3. The interviewer wants to see defense-in-depth thinking.** Saying "I'll use Docker for isolation" shows surface-level understanding. The strong answer layers multiple independent defenses: namespaces for process isolation, seccomp for syscall filtering, cgroups for resource limits, filesystem restrictions for data isolation, network namespaces for network isolation, and time limits for runaway prevention.

**4. OS-level knowledge is a differentiator.** Candidates who can discuss Linux namespaces, seccomp-BPF, cgroups v2, and capability dropping demonstrate systems engineering depth. You don't need to recite syscall numbers, but knowing that PID namespaces prevent cross-process visibility, or that `pids.max` in cgroups prevents fork bombs, sets you apart.

**5. The "simple" approach is dangerously wrong.** A naive design (run code in a Docker container, set a timeout) is vulnerable to dozens of attacks. The interviewer will probe whether you understand why Docker alone is insufficient for untrusted code execution.

### What the Interviewer Is Testing

| Signal | Strong Answer | Weak Answer |
|---|---|---|
| **Security depth** | Multi-layer isolation with specific mechanisms | "Put it in Docker" |
| **Adversarial thinking** | Proactively identifies fork bombs, memory bombs, /proc exploitation | Only discusses happy path |
| **Systems knowledge** | Discusses namespaces, seccomp-BPF, cgroups v2, capabilities | Vague "isolation" without specifics |
| **Trade-off reasoning** | VM vs container vs microVM with clear criteria | Picks one without discussing alternatives |
| **Operational maturity** | Warm pool sizing, circuit breakers, crash recovery, observability | Stops at the architecture diagram |
| **Resource enforcement** | CPU, memory, PIDs, disk, network limits independently addressed | "Set a timeout" as the complete resource strategy |

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
| **nsjail vs gVisor vs Firecracker** | nsjail: minimal overhead, single binary, excellent for competitive programming. gVisor: user-space kernel, high I/O overhead | Firecracker: full VM isolation, 125ms boot, strongest isolation | nsjail for baseline; escalate to Firecracker for contests/enterprise. gVisor is the middle ground for workloads that need more isolation than nsjail but can't afford microVM overhead |

---

## 4. Trap Questions

### "Why not just use Docker?"

**Why it's a trap:** Docker with default settings exposes 300+ syscalls, runs as root (unless configured), shares the host kernel, and has a long history of container escapes.

**Strong answer:** "Docker alone is insufficient for untrusted code. Default Docker shares the host kernel with 300+ syscalls exposed, runs processes that map to UID 0 on the host, and has had multiple escape vulnerabilities. We need additional layers: user namespace mapping (container root → host nobody), seccomp-BPF to restrict syscalls to ~50, cgroups v2 for hard resource limits, and read-only filesystem with minimal /dev. Optionally, we wrap everything in a microVM for hardware-level isolation."

### "How do you handle fork bombs?"

**Why it's a trap:** This tests whether you understand cgroups PID limits AND why PID limits alone aren't sufficient.

**Strong answer:** "Three layers: first, `pids.max = 64` via cgroups v2 so fork() returns EAGAIN after 64 processes. But those 64 processes still consume CPU, so second, the CPU time quota limits their total CPU consumption. Third, the wall-clock timeout kills the entire cgroup after the time limit plus a grace period. The combination of PID limit + CPU limit + wall-clock timeout provides triple defense."

### "What if someone exploits a kernel vulnerability?"

**Why it's a trap:** Tests whether you know about microVM isolation and defense-in-depth beyond user-space protections.

**Strong answer:** "This is why defense-in-depth is essential. seccomp-BPF reduces the kernel attack surface from 300+ to ~50 syscalls—the vulnerable syscall might not be in our allowlist. Capability dropping removes privileges needed for many exploits. User namespace mapping means even a successful root exploit inside the sandbox gains only nobody privileges on the host. For maximum isolation, we run sandboxes inside microVMs, providing a hardware boundary—a kernel exploit inside the microVM only compromises the guest kernel, not the host."

### "Why not run in the cloud provider's serverless?"

**Why it's a trap:** Serverless functions have cold starts, limited runtime customization, no isolation control, and prohibitive pricing at scale.

**Strong answer:** "Serverless functions aren't designed for adversarial workloads. We lose control over the isolation stack—we can't configure seccomp profiles, cgroup limits, or filesystem restrictions. Cold starts are unpredictable (500ms-5s). We can't maintain warm pools. Pricing at 5M executions/day would be prohibitive. And we can't stream output in real-time. Custom worker infrastructure gives us the control needed for security and the economics needed for scale."

### "How do you support 30+ languages efficiently?"

**Why it's a trap:** Tests understanding of the operational complexity multiplier from multi-language support.

**Strong answer:** "Tiered approach: Tier 1 (5-10 popular languages) gets dedicated warm pools, language-affinity workers, and optimized seccomp profiles. Tier 2 (10-20 additional) gets smaller warm pools with cold start fallback. Tier 3 (niche languages) runs on demand with cold starts. All languages share a common base image layer to minimize storage and pull times. Each language has its own seccomp profile because different runtimes need different syscalls (Java needs clone3 for threading; Python needs execve for interpreter startup; C needs neither)."

### "What if the code runs forever?"

**Why it's a trap:** Tests whether you understand the CPU vs wall-clock time distinction.

**Strong answer:** "Two independent time limits: CPU time (via cgroups cpu.max) catches infinite computation—`while(true){}` exhausts its CPU quota quickly. Wall-clock time (external timer) catches non-CPU resource consumption—`while(true){ sleep(1); }` uses zero CPU but blocks a worker forever. We need both because a program can consume resources without consuming CPU (sleeping, blocked I/O, waiting on locks). The wall-clock timer sends SIGTERM, waits 500ms for graceful shutdown, then SIGKILL."

### "Can users share data between submissions?"

**Why it's a trap:** Tests whether you understand the isolation guarantees of warm pool scrubbing.

**Strong answer:** "No. Each submission runs in a fresh or fully scrubbed sandbox. Warm pool scrubbing includes: wipe /workspace and /tmp, kill all processes via cgroup.kill, reset cgroup counters (CPU, memory accounting), and verify filesystem integrity (check for symlinks). The scrubbed sandbox is as clean as a freshly created one, but faster to provision. If scrubbing fails or takes too long, the sandbox is destroyed and replaced rather than reused. Cross-submission isolation is a security invariant, not an optimization target."

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

### Mistake 6: Over-Engineering the Data Layer

**What candidates do:** Spend 10 minutes designing a sharded submission database with complex indexing strategies.

**Why it's wrong:** This system is compute-bound, not data-bound. The database stores 8KB per submission (source + results + metadata). Even at 5M submissions/day, that's 39GB/day — trivially handled by a standard database. The bottleneck is the execution worker pool, not the data store.

**Fix:** Sketch a simple schema in 2 minutes (submission table + test case results table), mention time-based partitioning for retention management, and move on to the interesting parts: isolation architecture and worker pool design.

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

### Architecture in One Sentence

A queue-based worker pool where each worker leases ephemeral sandboxes (Linux namespaces + seccomp-BPF + cgroups v2) from a warm pool, executes untrusted code under strict resource limits with no network access, compares output against test cases, and returns verdicts—all while assuming every submission is an attack.

### Five Things to Say in the First 5 Minutes

1. "This is a security system first, compute system second."
2. "Every submission must be treated as potentially malicious."
3. "Isolation needs defense-in-depth: namespaces, seccomp, cgroups, filesystem restrictions, network isolation."
4. "Decouple ingestion from execution via a message queue for backpressure and fault tolerance."
5. "Warm pools amortize sandbox creation cost, but scrubbing on return is security-critical."

### Seven Layers of Defense (Memorize This)

| Layer | Mechanism | What It Prevents |
|---|---|---|
| 1 | Kernel namespaces (PID, mount, net, user, IPC) | Process/filesystem/network visibility |
| 2 | seccomp-BPF (allowlist ~50 syscalls) | Dangerous kernel interactions |
| 3 | Capability dropping (ALL + NO_NEW_PRIVS) | Privilege escalation |
| 4 | cgroups v2 (CPU, memory, PIDs, I/O) | Resource exhaustion |
| 5 | Filesystem restrictions (read-only root, tmpfs) | Persistent file manipulation |
| 6 | Network isolation (empty namespace) | Data exfiltration, C2, lateral movement |
| 7 | Time limits (wall-clock + CPU-clock) | Infinite execution, worker blocking |

### Key Numbers

| Metric | Value | Why It Matters |
|---|---|---|
| Warm pool lease time | < 100ms | Performance SLO depends on this |
| Cold start time | 2–3s | Why warm pools are necessary |
| Seccomp allowed syscalls | ~50 of 300+ | Attack surface reduction |
| cgroup PID limit | 64 | Fork bomb containment |
| Default memory limit | 256 MB | cgroup OOM kill threshold |
| Output buffer cap | 64 KB | Prevents output-based DoS on worker |
| Lease TTL | 120s | Safety net for stuck sandboxes |
| Worker heartbeat timeout | 30s | Crash detection speed |
| Queue visibility timeout | 60s | Auto-retry window for failed submissions |

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
