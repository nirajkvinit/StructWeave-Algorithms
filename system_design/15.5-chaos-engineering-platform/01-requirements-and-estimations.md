# Requirements & Estimations — Chaos Engineering Platform

## Functional Requirements

### Core Features

1. **Fault Injection Engine** — Inject controlled faults across multiple layers: network (latency, packet loss, DNS failure, partition), compute (CPU pressure, memory pressure, I/O stress, process kill), application (HTTP error injection, request abort, dependency timeout), and state (disk fill, clock skew, certificate expiration, configuration corruption).

2. **Experiment Orchestration** — Define experiments as declarative specifications containing: target selection (host, container, service, zone), fault type and magnitude, duration, steady-state hypothesis, abort conditions, and scheduling. Support sequential multi-step experiments (scenarios) with conditional branching.

3. **Blast Radius Control** — Limit the scope of experiments using multiple dimensions: percentage of targets (e.g., 10% of pods in a service), geographic scope (single zone, single region), dependency depth (only direct dependencies, no cascading), and concurrent experiment limits (max N experiments running simultaneously on overlapping targets).

4. **Steady-State Hypothesis Monitoring** — Continuously evaluate user-defined metrics (error rate, latency percentiles, throughput, custom business metrics) against threshold bounds during experiment execution. Integrate with existing observability infrastructure (metrics, traces, logs) to pull real-time measurements.

5. **Automated Rollback** — Immediately revert all injected faults when: steady-state hypothesis is violated, experiment duration expires, manual abort is triggered, or the chaos platform itself detects an internal failure. Rollback must complete within a bounded time (target: <30 seconds from trigger to full reversion).

6. **GameDay Orchestration** — Coordinate multi-team, multi-experiment events with: pre-defined runbooks, escalation procedures, communication channel integration (chat, video), shared dashboards for all participants, time-boxed phases (briefing → injection → observation → debrief), and post-GameDay report generation.

7. **Experiment Library & Templates** — Maintain a catalog of pre-built experiment types (modeled after ChaosHub) with parameterizable templates, community-contributed experiments, and organizational custom experiments with approval workflows.

8. **Scheduling & Automation** — Support cron-based experiment scheduling for continuous chaos (e.g., "kill 1 random pod every business day at 2 PM"), CI/CD pipeline integration for pre-deployment resilience validation, and progressive automation from manual → scheduled → continuous.

### Out of Scope

- Building observability infrastructure (metrics collection, tracing, log aggregation) — the platform integrates with existing systems
- Application-level testing (unit tests, integration tests, load tests) — chaos engineering tests system behavior under failure, not functional correctness
- Incident management and on-call routing — the platform triggers alerts but does not manage incident response workflows
- Security chaos (adversarial simulation, red-teaming) — overlap exists but the threat model and tooling differ significantly

---

## Non-Functional Requirements

### CAP Theorem Position

**CP (Consistency + Partition Tolerance)** — The chaos control plane must maintain a consistent view of which experiments are running and which faults are injected. During a network partition, the platform must not lose track of active experiments — an orphaned fault injection with no controlling authority is a production outage waiting to happen. Availability of the experiment API can degrade (reject new experiments) during partitions; consistency of experiment state must not.

### Consistency Model

**Strong Consistency for experiment state** — The experiment lifecycle (created → approved → running → rolling_back → completed) must follow strict state machine transitions. Two agents must never simultaneously inject conflicting faults on the same target. The blast radius controller must have a globally consistent view of all active experiments to enforce cross-experiment safety limits.

**Eventual Consistency for results and metrics** — Experiment results, telemetry correlation, and historical analytics can tolerate seconds of staleness.

### Availability Target

| Component | Target | Rationale |
|-----------|--------|-----------|
| Experiment Control Plane | 99.99% | Must be available to execute rollbacks; downtime during an active experiment is catastrophic |
| Fault Injector Agents | 99.95% | Agents must respond to rollback commands; agent failure must trigger automatic fault reversion |
| Experiment API (new experiment submission) | 99.9% | Brief API unavailability is acceptable — it just delays new experiments |
| Dashboard & Reporting | 99.5% | Read-only; degradation is inconvenient but not dangerous |

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Fault injection (control plane → agent → applied) | <2s | <5s | <10s |
| Rollback (trigger → fault fully reverted) | <5s | <15s | <30s |
| Steady-state metric evaluation | <1s | <3s | <5s |
| Abort propagation (to all agents in experiment) | <1s | <3s | <5s |
| Experiment API response (create/read) | <200ms | <500ms | <1s |

### Durability Guarantees

- Experiment definitions: durable (persisted to database with replication)
- Active experiment state: durable with write-ahead log (must survive control plane restart)
- Fault injection state on agents: locally persisted (agent restart must know what faults to revert)
- Experiment results: durable (immutable audit record)
- Rollback commands: delivered with at-least-once semantics via persistent queue

---

## Capacity Estimations (Back-of-Envelope)

**Reference deployment:** Large enterprise, 5,000 hosts across 3 regions, 500 microservices, running 50 experiments/day (mix of automated and manual).

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Experiments per day | 50–200 | 10 scheduled (continuous chaos) + 5–20 manual + 30–170 CI/CD triggered |
| Concurrent experiments (peak) | 5–15 | Most experiments run 5–30 min; staggered scheduling limits concurrency |
| Fault injector agents | 5,000 | One agent per host (lightweight daemon) |
| Agent heartbeats per second | ~85 | 5,000 agents × 1 heartbeat/min ÷ 60 |
| Steady-state metric queries per second | 50–150 | 5–15 concurrent experiments × 5–10 metrics each × ~1 query/sec |
| Experiment result records per day | 50–200 | One result record per experiment |
| Experiment step records per day | 500–2,000 | Each experiment averages 10 steps (fault apply, verify, escalate, rollback) |
| Audit log entries per day | 5,000–20,000 | API calls + state transitions + agent events |
| Storage (experiment data, 1 year) | ~10 GB | Experiment definitions + results + audit logs (text-heavy, modest volume) |
| Storage (correlated telemetry snapshots, 1 year) | ~500 GB | Metric snapshots and trace samples captured during experiments |
| Agent binary size | 10–20 MB | Statically-linked binary with fault injection modules |
| Agent memory footprint | 30–50 MB | Heartbeat + fault state + rollback instructions |
| Control plane instances | 3–5 | Leader-elected cluster for consistency |

---

## SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Rollback completion time | <30s p99 | Time from abort trigger to all faults reverted (measured by agent confirmation) |
| Orphaned fault rate | 0% | Faults still active after experiment completion or platform failure (measured by periodic reconciliation) |
| Steady-state evaluation freshness | <5s p99 | Age of the most recent metric evaluation for any running experiment |
| Blast radius accuracy | 100% | Actual impacted targets must never exceed declared blast radius |
| Experiment state consistency | Linearizable | No two control plane nodes may disagree on experiment lifecycle state |
| Agent command delivery | >99.9% | Percentage of rollback commands successfully delivered to agents |
| Audit log completeness | 100% | Every experiment state transition and fault injection event must be logged |

---

## Constraints Unique to Chaos Engineering

### Safety Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| Blast radius ceiling | Organization-wide maximum (e.g., never affect >10% of a service's capacity) | Prevents experiments from becoming outages; hard-coded limit that requires VP-level override |
| Concurrent experiment isolation | No two experiments may inject conflicting faults on the same target simultaneously | Requires global experiment registry with target-level locking |
| Business-hours restrictions | Some experiments may only run during business hours (when engineers are available) or only outside business hours (to avoid customer impact) | Scheduling engine must enforce time windows per experiment category |
| Production gating | Experiments targeting production require additional approval (human-in-the-loop) | Approval workflow with timeout (auto-reject if not approved within N hours) |
| Dependency-aware scoping | Injecting a fault on a shared dependency (database, message queue) has a blast radius that spans all dependent services | Blast radius calculator must model the service dependency graph |

### Operational Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| Agent deployment | Agents must be deployable without application restarts or service disruption | DaemonSet (Kubernetes) or system service with zero-downtime updates |
| Network partition resilience | If the agent loses contact with the control plane during an experiment, it must autonomously revert faults after a safety timeout | Agent-side timer with local rollback capability |
| Observability dependency | Steady-state monitoring depends on external observability systems; if those systems are also under chaos, the hypothesis cannot be evaluated | Circuit breaker: abort experiment if observability data becomes unavailable |
