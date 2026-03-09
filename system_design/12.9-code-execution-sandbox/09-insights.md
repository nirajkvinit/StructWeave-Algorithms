# Insights — Code Execution Sandbox

## Insight 1: Defense-in-Depth Is Not Optional

**Category:** Security

**One-liner:** Every isolation layer will eventually be breached; security comes from the combination, not any single layer.

**Why it matters:** Container escape CVEs are published regularly. Kernel exploits bypass seccomp filters. cgroup limits can have edge cases. No single security mechanism can guarantee containment of adversarial code. The strength of a sandbox comes from layering 5-7 independent defenses (namespaces, seccomp-BPF, cgroups, capability dropping, filesystem restrictions, network isolation, time limits) so that breaching one layer still leaves the attacker facing several more. This principle inverts the common engineering instinct to find "the right tool"—in sandbox security, the right answer is always "all of them."

---

## Insight 2: Users Are Adversarial by Design

**Category:** System Modeling

**One-liner:** Unlike most systems where abuse is an edge case, a sandbox's primary use case involves executing untrusted code.

**Why it matters:** Most distributed systems are designed for cooperative users, with abuse handling as an afterthought. A code execution sandbox inverts this assumption: the system's entire purpose is to run code that might be malicious. Fork bombs, memory bombs, network exfiltration attempts, and sandbox escape probes aren't edge cases—they're the expected workload. This adversarial assumption fundamentally changes how you design resource management, error handling, and monitoring. Every input path, output path, and resource boundary must be designed assuming the user is actively trying to break it.

---

## Insight 3: Warm Pool Economics — Pre-Creation Trades Cost for Latency

**Category:** Cost Optimization

**One-liner:** Pre-creating sandboxes trades idle resource cost for cold start latency; optimal pool size is a queuing theory problem.

**Why it matters:** Creating a namespace-isolated, seccomp-filtered sandbox takes 1-3 seconds. At 175 submissions/second, this latency is unacceptable. Warm pools reduce lease time to < 100ms by pre-creating sandboxes, but idle sandboxes consume memory (80-200MB each). The optimal pool size follows Little's Law: steady-state pool size = arrival rate × (lease duration + scrub duration), plus a burst buffer. Over-provisioning wastes memory; under-provisioning causes cold starts. The pool must be partitioned by language (different runtimes can't be shared), adding another dimension to the optimization.

---

## Insight 4: Fork Bombs Expose the Gap Between Process Limits and System Stability

**Category:** Contention

**One-liner:** PID limits alone are insufficient without cgroup-scoped CPU throttling and wall-clock timeout enforcement.

**Why it matters:** Setting `pids.max = 64` prevents exponential process creation beyond 64 processes. But 64 processes all executing `while(true){}` still consume significant CPU, potentially starving other sandboxes on the same host. The full defense requires three layers working in concert: PID limits (cap process count), CPU quotas (throttle total CPU consumption of the cgroup), and wall-clock timeouts (hard kill after deadline). This insight generalizes beyond fork bombs: in adversarial systems, resource limits must be enforced across multiple dimensions simultaneously because attackers will exploit any single unguarded resource.

---

## Insight 5: seccomp-BPF Allowlisting Is More Secure Than Blocklisting

**Category:** Security

**One-liner:** An allowlist of ~50 syscalls blocks new kernel additions by default, preventing zero-day kernel exploits via unknown syscalls.

**Why it matters:** The Linux kernel adds new syscalls with each major version (e.g., `io_uring_setup` appeared in 5.1 and quickly became a major attack surface). A blocklist-based seccomp policy that was comprehensive in kernel 5.4 may be dangerously incomplete in kernel 6.1. An allowlist (default-deny) ensures that any new syscall is automatically blocked until explicitly reviewed and permitted. The maintenance cost is higher—you must test each language runtime against the allowlist—but the security guarantee is fundamentally stronger. This is the same principle behind firewall allowlisting: it's always safer to permit what you know than to block what you know.

---

## Insight 6: MicroVMs Provide VM-Level Isolation with Container-Level Speed

**Category:** Scaling

**One-liner:** Technologies like Firecracker achieve < 125ms boot time by skipping BIOS/bootloader, delivering hardware isolation without VM-level startup costs.

**Why it matters:** Traditional VMs offer the strongest isolation (separate kernel, hardware-enforced memory boundaries) but boot in 5-30 seconds—too slow for per-submission sandboxing. MicroVMs strip the virtual machine to its essential components: skip BIOS, skip bootloader, use a minimal kernel, and load a rootfs directly. This achieves boot times under 125ms with ~5MB memory overhead per VM. The result is that the old trade-off between "secure but slow" (VMs) and "fast but risky" (containers) has a middle path. For adversarial code execution, this enables per-submission hardware isolation without sacrificing latency SLOs.

---

## Insight 7: Network Isolation Is Binary by Design

**Category:** Security

**One-liner:** Partial network access in a sandbox is almost always a security hole; the only safe options are "none" or "strictly proxied."

**Why it matters:** Many sandbox designs attempt fine-grained network control: "allow HTTP but block SSH," or "allow outbound to specific IPs." In practice, attackers tunnel arbitrary protocols over HTTP, exfiltrate data via DNS queries, and exploit HTTP client libraries for SSRF. DNS tunneling alone can exfiltrate kilobytes per second through a seemingly innocent DNS resolver. An empty network namespace (no interfaces, not even loopback) eliminates the entire network attack surface by construction. When network access is genuinely needed (rare), it must go through a proxy that allowlists specific URLs, inspects TLS traffic, and enforces bandwidth limits.

---

## Insight 8: Compilation and Execution Are Separate Security Domains

**Category:** System Modeling

**One-liner:** Compiler bugs can be exploited with crafted source files, so compilation needs its own resource limits and runs inside the sandbox.

**Why it matters:** Compilers are complex programs that parse arbitrary input—exactly the conditions where buffer overflows and code execution vulnerabilities arise. A crafted C++ source file with deeply nested templates or specific preprocessor directives could trigger a compiler bug that grants code execution during compilation. If compilation happens outside the sandbox (e.g., on the worker host), a compiler exploit gives the attacker host access. Running compilation inside the same sandbox, with separate (often more generous) resource limits, ensures that even a compiler exploit remains contained. This insight generalizes: any tool that processes untrusted input is itself an attack surface.

---

## Insight 9: Output Is an Attack Vector

**Category:** Resilience

**One-liner:** Unbounded stdout/stderr can OOM the result collector; output must be truncated at the sandbox boundary.

**Why it matters:** A simple `while(true) { print("A" * 1000000); }` can generate gigabytes of output per second. If the worker process buffers this output in memory (waiting for the program to finish), the worker—not the sandbox—runs out of memory. This is subtle because the cgroup memory limit only protects the sandbox process, not the worker process that reads its output. The solution is to cap the output buffer at the sandbox boundary (64KB is typical) and discard excess. This principle applies broadly: any channel between a sandboxed process and its supervisor (stdout, stderr, file output, shared memory) must have bounded buffers.

---

## Insight 10: Language Runtime Diversity Is an Operational Multiplier

**Category:** Cost Optimization

**One-liner:** Each new language adds a security surface, dependency chain, and warm pool partition, multiplying operational complexity.

**Why it matters:** Supporting 60+ languages isn't just 60 different compiler installations. Each language requires: a custom seccomp profile (Java needs threading syscalls; Python needs execve for its interpreter; C needs neither), a separate warm pool partition (Python sandboxes can't serve Java requests), a unique memory profile (Java's JVM needs 200MB idle; C programs need 40MB), distinct compilation/execution workflows, and independent version management and CVE tracking. Going from 10 to 60 languages doesn't increase complexity linearly—it multiplies it. This is why tiered support (Tier 1 with full warm pools, Tier 3 with cold start only) is essential: not all languages deserve equal operational investment.

---

## Insight 11: Queue-Based Architecture Provides Natural Backpressure

**Category:** Traffic Shaping

**One-liner:** When workers are saturated, the queue grows and provides visibility into capacity needs without dropping requests.

**Why it matters:** A synchronous code execution API (submit → block → result) collapses under load: when workers are full, new requests either timeout or get rejected. A queue-based architecture transforms this into a graceful degradation: the queue absorbs spikes, and queue depth becomes a visible metric for auto-scaling decisions. At 500 messages deep, auto-scaling kicks in. At 10,000 messages, backpressure kicks in (503 for low-priority requests). The queue depth is also a natural SLO signal—if P95 queue wait exceeds the threshold, the auto-scaler reacts before users notice latency degradation. The queue turns a cliff (sudden failure) into a slope (gradual degradation).

---

## Insight 12: Execution Time Limits Need Both Wall-Clock and CPU-Time Bounds

**Category:** Contention

**One-liner:** A `sleep(infinity)` uses zero CPU but blocks a worker forever; wall-clock limits catch what CPU limits miss.

**Why it matters:** CPU time limits (via cgroups `cpu.max`) measure actual computation cycles. An infinite loop `while(true){}` exhausts CPU time quickly and is caught. But `while(true) { sleep(1); }` uses near-zero CPU time—it will never trigger a CPU-based limit, yet it blocks a worker indefinitely. Similarly, a program stuck on a blocking I/O call (e.g., `read()` on a pipe that never gets data) consumes no CPU but holds a worker. Wall-clock time limits (external timers with SIGTERM/SIGKILL) catch all these cases regardless of CPU usage patterns. Both limits are independently necessary—neither subsumes the other.

---

*Previous: [Interview Guide](./08-interview-guide.md)*
