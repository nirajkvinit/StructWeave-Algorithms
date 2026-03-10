# Interview Guide — Chaos Engineering Platform

## Interview Pacing (45-min format)

| Time | Phase | Focus |
|------|-------|-------|
| 0-5 min | Clarify | Scope: What fault types? Which environments? Scale (how many hosts/services)? Continuous chaos or GameDay-only? Integration with existing observability? |
| 5-15 min | High-Level | Three-tier architecture (control plane → command queue → agents), experiment lifecycle, blast radius concept, steady-state hypothesis |
| 15-30 min | Deep Dive | Pick 1-2: blast radius calculation with dependency graph, steady-state hypothesis engine, agent safety mechanisms, or GameDay orchestration |
| 30-40 min | Scale & Trade-offs | Meta-reliability problem, concurrent experiment safety, scaling the agent fleet, rollback guarantees |
| 40-45 min | Wrap Up | Summarize safety layers, acknowledge trade-offs, discuss security/compliance implications |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **Safety is the primary constraint, not performance:** Unlike most system designs where the challenge is handling scale or latency, the chaos platform's defining challenge is ensuring that intentional fault injection never causes unintended damage. Every architectural decision — from blast radius validation to agent safety timers — is primarily a safety decision. Candidates who optimize for throughput or latency without discussing safety have missed the point.

2. **The platform must be more reliable than what it tests:** This recursive reliability requirement is the most intellectually interesting aspect of the design. The chaos platform must survive the failures it injects. If you test your payment service by injecting network latency, and the chaos platform's command queue also experiences latency, rollback commands are delayed. Mentioning this early demonstrates systems maturity.

3. **Blast radius is a graph problem, not a count:** Naive candidates describe blast radius as "percentage of instances affected." Senior candidates recognize that the blast radius includes indirect impact through the service dependency graph. A fault on a database affects every service that depends on that database, even if only 10% of the database instances are targeted.

4. **The observability paradox:** The platform depends on the observability stack to evaluate steady-state hypotheses. But what if the chaos experiment targets the observability stack? The platform cannot evaluate whether the system is healthy if the system it uses to measure health is under chaos. This is a fundamental design tension that reveals depth of thinking.

### Where to Spend Most Time

- **Deep Dive (15-30 min):** Blast radius controller and steady-state hypothesis engine are the two most interview-relevant components. The BRC demonstrates graph-based thinking, concurrent experiment safety, and safety-critical design. The SSHE demonstrates real-time monitoring, false positive management (grace periods), and the observability dependency problem.

- **Don't spend time on:** Agent installation mechanics, specific fault injection implementations (how exactly tc/netem works), UI design for the dashboard, or CI/CD integration details. These are important in practice but not what differentiates a senior answer from a junior one.

---

## Trade-offs Discussion

### Trade-off 1: Agent-Based vs. Agentless Fault Injection

| Decision | Agent-Based | Agentless (API-driven) |
|----------|-------------|----------------------|
| | **Pros:** Full range of fault types (network, compute, state); sub-second injection/reversion; agent carries autonomous safety timer; works on any infrastructure | **Pros:** No deployment overhead; no agent maintenance; leverages cloud provider APIs |
| | **Cons:** Must deploy and maintain agents on every host; agent is an attack surface; agent bugs can cause damage | **Cons:** Limited fault types (only cloud-level); slow injection/reversion (API propagation); no autonomous safety — depends on API availability for rollback |
| **Recommendation** | Agent-based for precision and safety (autonomous rollback); supplement with agentless for cloud-level faults (zone failure, managed service disruption) |

### Trade-off 2: Centralized vs. Distributed Blast Radius Control

| Decision | Centralized BRC (Chosen) | Distributed BRC |
|----------|-------------------------|-----------------|
| | **Pros:** Global view of all active experiments; single authority prevents conflicting experiments; simpler consistency model | **Pros:** No single point of failure; each region/team manages independently; lower latency for local decisions |
| | **Cons:** Single point of failure (mitigated by HA); global lock for concurrent experiments; all experiment submissions route through one service | **Cons:** Cross-region experiments require coordination anyway; harder to enforce global limits; eventual consistency risks allowing conflicting experiments |
| **Recommendation** | Centralized for safety (global consistency is more important than availability of experiment submission); HA with leader election |

### Trade-off 3: Fail-Open vs. Fail-Closed for Safety Mechanisms

| Decision | Fail-Closed (Chosen) | Fail-Open |
|----------|---------------------|-----------|
| | **Pros:** When the safety mechanism fails, the experiment stops — safe default; aligns with principle of least damage | **Pros:** Experiments continue running; less experiment waste; more resilience testing coverage |
| | **Cons:** False SSM failures cause unnecessary experiment aborts; reduces chaos coverage | **Cons:** When safety fails, faults may persist without monitoring — potential for real outages |
| **Recommendation** | Fail-closed for all safety mechanisms. A wasted experiment is far less costly than an unmonitored fault persisting in production. The platform should err on the side of caution. |

### Trade-off 4: Strict Scheduling vs. Continuous Chaos

| Decision | Strict Scheduling | Continuous / Random (Chaos Monkey-style) |
|----------|-------------------|------------------------------------------|
| | **Pros:** Predictable; engineers are available to observe; easier to get organizational buy-in; compliance-friendly | **Pros:** Tests real readiness (not just "prepared" readiness); finds weaknesses that scheduled tests miss; builds true resilience culture |
| | **Cons:** Engineers "prepare" for chaos (defeating the purpose); doesn't test real incident response readiness | **Cons:** Harder to get organizational buy-in; may cause fatigue; harder to attribute metric changes to experiments vs. real issues |
| **Recommendation** | Start with strict scheduling (build confidence); graduate to continuous chaos as the organization matures. Support both modes. |

### Trade-off 5: Rich Hypothesis Engine vs. Simple Threshold

| Decision | Rich Hypothesis Engine | Simple Threshold |
|----------|----------------------|-----------------|
| | **Pros:** Supports complex conditions (AND/OR combinations, rate-of-change, percentile comparisons); fewer false positives | **Pros:** Easy to understand and configure; predictable behavior; lower latency for evaluation |
| | **Cons:** Complex configuration; harder to debug when hypothesis evaluation seems wrong; more processing overhead | **Cons:** More false positives (simple thresholds don't handle noisy metrics well); may miss subtle degradation patterns |
| **Recommendation** | Simple thresholds with grace periods for most experiments; rich conditions available for advanced users. Most experiments need "error rate < 1% for 30 seconds" — not a complex rule engine. |

---

## Trap Questions & How to Handle

### Trap 1: "How do you handle a chaos experiment that causes a real outage?"

**Wrong answer:** "The blast radius limits prevent that from happening."

**Right answer:** Blast radius limits reduce the probability but cannot eliminate it. The defense is layered: (1) blast radius limits reduce scope, (2) steady-state monitoring detects impact, (3) automated rollback reverts the fault, (4) agent safety timers provide independent revert, (5) human kill switch as last resort. Additionally, the platform must integrate with incident management — if a real incident is declared, all experiments auto-abort. Post-outage: the experiment design, blast radius calculation, and guardrails are reviewed and tightened.

### Trap 2: "Why not just run chaos experiments in staging?"

**Wrong answer:** "You're right, staging is safer."

**Right answer:** Production and staging behave differently. Staging lacks production traffic patterns, real data volumes, geographic distribution, and cross-service interaction at scale. Chaos engineering specifically tests production resilience because that's where the unknown-unknowns live. The goal is not to find bugs (that's what staging tests do) — it's to discover systemic weaknesses that only manifest under real-world conditions. However, the maturity path is staging → pre-production → production with increasingly strict guardrails.

### Trap 3: "What if the chaos platform itself goes down during an experiment?"

**Wrong answer:** "We make the chaos platform highly available so it doesn't go down."

**Right answer:** HA reduces the probability but doesn't eliminate it. The architecture must handle this case explicitly: (1) agents carry local safety timers — they autonomously revert faults after the experiment's maximum duration, regardless of control plane state. (2) On control plane restart, the orchestrator loads active experiments from the database and reconciles with agent states. (3) The command queue uses persistent messaging — commands survive broker restarts. The key insight is that the agent is the safety net, not the control plane.

### Trap 4: "How is this different from load testing?"

**Wrong answer:** "Chaos engineering is like load testing but more random."

**Right answer:** Load testing answers "can the system handle X requests per second?" — it tests capacity under normal operation. Chaos engineering answers "what happens when things break?" — it tests resilience under failure conditions. Load testing increases normal load; chaos engineering injects abnormal conditions (server failures, network partitions, dependency outages). They are complementary: you might run a load test + chaos experiment simultaneously to test resilience under both high load and partial failure.

### Trap 5: "Why not just use feature flags to simulate failures?"

**Wrong answer:** "Feature flags are too limited."

**Right answer:** Feature flags can simulate application-level failures (return error for 10% of requests to a specific endpoint) and are valuable for that purpose. But they cannot simulate infrastructure-level failures: network latency, packet loss, disk pressure, process crashes, clock skew, DNS failures. These infrastructure failures are where the most dangerous unknown-unknowns live, because applications rarely test against them. The chaos platform and feature flags serve different layers of the resilience testing stack.

---

## What Good vs. Great Looks Like

### Good Answer (Senior Level)

- Three-tier architecture with control plane, agent fleet, and observability integration
- Mentions blast radius as a key safety mechanism
- Describes experiment lifecycle with rollback
- Discusses approval workflow for production
- Mentions that the platform needs to be reliable

### Great Answer (Staff+ Level)

- Everything in "Good" plus:
- Blast radius as a graph problem with dependency traversal
- TOCTOU race condition in concurrent blast radius checks (solved with locking + reservation)
- Agent-side safety timer as independent safety layer (defense-in-depth)
- The observability paradox (what if the chaos experiment targets the monitoring system?)
- The meta-reliability recursive requirement
- Grace period tuning as a safety vs. noise trade-off
- Fail-closed principle for all safety mechanisms
- Revert-before-inject pattern for crash safety
- Experiment annotations for on-call context
