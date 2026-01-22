# Interview Guide

[← Back to Index](./00-index.md)

---

## 45-Minute Interview Pacing

### Timeline

| Time | Phase | Focus | Key Actions |
|------|-------|-------|-------------|
| 0-5 min | **Clarification** | Scope & requirements | Ask about scale, multi-tenant, build types |
| 5-15 min | **High-Level Design** | Architecture | Draw control/data plane, explain pipeline flow |
| 15-30 min | **Deep Dive** | Core component | Scheduler OR Caching OR Worker Isolation |
| 30-40 min | **Scalability & Trade-offs** | Scale, reliability | Discuss queue handling, multi-region, failure recovery |
| 40-45 min | **Wrap-up** | Security, observability | Quick touch on isolation, SLSA, monitoring |

### Phase Details

#### Phase 1: Clarification (0-5 min)

**Questions to ask:**

1. "What scale are we designing for? Thousands or millions of jobs per day?"
2. "Is this multi-tenant (public cloud) or single-tenant (enterprise)?"
3. "What types of builds? Container builds, compiled languages, tests only?"
4. "Do users provide their own runners, or is it fully managed?"
5. "What cloud providers need to be supported for deployments?"

**Calibrate your design:**

| Scenario | Design Focus |
|----------|--------------|
| Multi-tenant cloud (GitHub Actions) | Strong isolation (microVMs), fair-share scheduling |
| Enterprise self-hosted (Jenkins) | Containers sufficient, simpler security |
| Container-focused (Docker builds) | Layer caching critical, registry integration |
| Large monorepo (Google-scale) | Incremental builds, affected test detection |
| Strict compliance (FedRAMP) | Audit logging, data residency, SLSA |

#### Phase 2: High-Level Design (5-15 min)

**Must cover:**
1. Control plane vs data plane separation
2. Core components: Pipeline Engine, Scheduler, Worker Manager, Runner Pool
3. Data flow: Webhook → Pipeline creation → Job scheduling → Execution
4. Key storage: PostgreSQL (job state), Redis (queues), Object Storage (artifacts)

**Whiteboard structure:**

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONTROL PLANE                             │
│  ┌─────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Webhook │  │  Pipeline   │  │   Job    │  │   Worker     │  │
│  │ Gateway │  │   Engine    │  │ Scheduler│  │   Manager    │  │
│  └────┬────┘  └──────┬──────┘  └────┬─────┘  └──────┬───────┘  │
└───────┼──────────────┼──────────────┼───────────────┼───────────┘
        │              │              │               │
┌───────┼──────────────┼──────────────┼───────────────┼───────────┐
│       ▼              ▼              ▼               ▼           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      JOB QUEUE (Redis)                   │   │
│  └────────────────────────────┬────────────────────────────┘   │
│                               │                                 │
│  ┌────────────────────────────┼────────────────────────────┐   │
│  │                     RUNNER POOL                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │   Runner    │  │   Runner    │  │   Runner    │      │   │
│  │  │ (Container) │  │ (MicroVM)   │  │ (Container) │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          DATA PLANE                             │
└─────────────────────────────────────────────────────────────────┘
```

#### Phase 3: Deep Dive (15-30 min)

**Option A: Job Scheduling Deep Dive**
- Queue data structure (Redis sorted sets with priority score)
- Fair-share algorithm (DRF-inspired, per-org quotas)
- Exactly-once execution (distributed locks, idempotency)
- Handling 100K concurrent jobs

**Option B: Build Caching Deep Dive**
- Cache key generation (lockfile hash + platform)
- Multi-tier cache (L1 local, L2 shared, L3 object storage)
- Docker layer caching
- Cache invalidation strategies

**Option C: Worker Isolation Deep Dive**
- Container vs MicroVM trade-offs
- Network isolation (namespaces, iptables)
- Resource limits (cgroups, memory, CPU)
- Secret injection security

#### Phase 4: Scalability & Trade-offs (30-40 min)

**Must cover:**
1. Handling burst traffic (queue + autoscaling)
2. Multi-region for global teams
3. Worker crash recovery (requeue with idempotency)
4. Static stability (data plane survives control plane outage)

#### Phase 5: Wrap-up (40-45 min)

**Quick touch on:**
- Security: SLSA framework, build provenance, secrets management
- Observability: Key metrics (queue depth, success rate, pickup latency)
- Cost optimization: Spot instances, autoscaling, cache effectiveness

---

## Clarification Questions

### Must-Ask Questions

1. **Scale**: "What's the expected volume? Thousands or millions of jobs per day?"
2. **Tenancy**: "Is this multi-tenant SaaS or single-tenant enterprise?"
3. **Build Types**: "What kinds of builds - containers, compiled code, tests?"
4. **Runner Model**: "Managed runners only, or self-hosted too?"
5. **Latency Requirements**: "How fast should jobs start after triggering?"

### Follow-up Based on Answers

| If they say... | Then ask/design for... |
|----------------|------------------------|
| "Millions of jobs/day" | Sharded queues, horizontal scheduler |
| "Multi-tenant SaaS" | MicroVM isolation, fair-share scheduling |
| "Self-hosted runners" | Runner registration, heartbeat, security |
| "Container builds" | Layer caching, registry integration |
| "Sub-minute job pickup" | Warm runner pool, predictive scaling |

---

## Trade-off Discussions

### Centralized vs Distributed Scheduler

| Aspect | Centralized | Distributed |
|--------|-------------|-------------|
| **Pros** | Global view, simple fair-share | No bottleneck, region-local |
| **Cons** | Scale limits, single region | Complex coordination |
| **When** | < 100K concurrent jobs | > 100K concurrent, multi-region |
| **Examples** | GitHub Actions, GitLab CI | Uber's CI, custom systems |

### Container vs MicroVM Isolation

| Aspect | Container | MicroVM |
|--------|-----------|---------|
| **Startup** | ~1 second | ~125ms (Firecracker) |
| **Security** | Shared kernel | Separate kernel |
| **Overhead** | Lower | Higher |
| **When** | Trusted/internal code | Untrusted/public runners |

### Artifact Storage: Inline vs Object Storage

| Aspect | Inline (DB) | Object Storage |
|--------|-------------|----------------|
| **Latency** | Lower | Higher |
| **Scale** | Limited (few GB) | Unlimited |
| **Cost** | Higher per GB | Lower per GB |
| **When** | Small artifacts (<10MB) | All production systems |

---

## Trap Questions & Answers

### "Why not just use a single queue for all jobs?"

**Trap:** Missing the priority and fairness challenges.

**Good answer:**
"A single queue creates problems at scale. First, priority handling becomes O(n) to reorder. Second, fair-share across organizations is impossible - one org could monopolize the queue. Third, runner label matching gets expensive.

Instead, we use a multi-level queue structure: priority lanes (urgent, high, normal, low) with per-org fair-share within each lane, and label-specific queues for runner matching. This gives us O(log n) priority operations and prevents any single tenant from starving others."

### "What happens when a runner crashes mid-job?"

**Trap:** Forgetting about exactly-once execution concerns.

**Good answer:**
"Runner health is monitored via heartbeats every 10 seconds. If we miss 2-3 heartbeats (30s timeout), we consider the runner dead.

For the in-flight job:
1. We mark the runner offline
2. We requeue the job with a retry counter
3. A different runner picks up the job
4. We use distributed locks to prevent double-execution
5. Job state transitions are idempotent - reprocessing is safe

The key is that jobs should be designed to be idempotent. For non-idempotent operations like deployments, we use environment protection rules requiring manual approval on retry."

### "How do you prevent a malicious workflow from stealing secrets?"

**Trap:** Not understanding the scope and branch restrictions.

**Good answer:**
"Secrets are protected at multiple levels:

1. **Scope isolation**: Organization secrets can be limited to specific repositories. Repository secrets are only available to that repo.

2. **Environment protection**: Production secrets require environment approval and are restricted to specific branches (e.g., main only). A PR from a fork can't access production secrets.

3. **OIDC tokens**: For cloud access, we use short-lived OIDC tokens that include the exact workflow, branch, and commit. Cloud providers verify these claims in their trust policies.

4. **Log masking**: Secret values are automatically masked in logs to prevent accidental exposure.

5. **No secret access in PRs from forks**: By default, secrets aren't available to pull request workflows from forks."

### "How do you scale to 1 million jobs per day?"

**Trap:** Giving hand-wavy answers about "just add more servers."

**Good answer:**
"1 million jobs/day is about 12 jobs/second average, but with peaks of 50-100 jobs/second during business hours.

Scaling strategy:
1. **Scheduler**: Shard queues by label hash, run 10+ scheduler replicas with leader-per-shard
2. **Database**: PostgreSQL with read replicas for job queries, partitioned by date for cleanup
3. **Redis Cluster**: 12+ nodes for queue sharding, 3GB+ per shard
4. **Runner pool**: 10,000+ runners with autoscaling based on queue depth
5. **Artifacts**: Object storage with CDN, multipart upload for large files

The real bottleneck is usually runner capacity during bursts. We solve this with:
- Warm pool maintaining 20% idle capacity
- Predictive scaling based on historical patterns
- Burst capacity on spot/preemptible instances
- Queue depth-based autoscaling with 5-minute target clearance time"

---

## Common Mistakes to Avoid

### Design Mistakes

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Single queue | No priority, no fairness | Multi-level queues |
| Containers for public | Weak isolation | MicroVMs for untrusted code |
| Inline artifact storage | Doesn't scale | Object storage with content-addressing |
| No worker heartbeats | Can't detect failures | Heartbeat + automatic requeue |
| Ignoring cache | Slow builds | Multi-tier caching strategy |

### Interview Mistakes

| Mistake | Impact | Correction |
|---------|--------|------------|
| Jumping to implementation | Miss requirements | Always clarify scale and tenancy first |
| Not drawing diagrams | Hard to follow | Draw control/data plane separation |
| Ignoring security | Incomplete design | Mention isolation, secrets, SLSA |
| Forgetting failure cases | Seems naive | Discuss worker crash, scheduler failover |
| No numbers | Vague capacity | Give specific throughput estimates |

---

## Quick Reference Card

### Key Numbers to Remember

| Metric | Value | Context |
|--------|-------|---------|
| Jobs per day (large platform) | 70-500M | GitHub Actions scale |
| Peak concurrent jobs | 100K+ | Business hours spike |
| Job pickup latency target | < 5s p50, < 30s p99 | Queue wait time |
| MicroVM boot time | ~125ms | Firecracker |
| Container startup | ~1s | Docker |
| Heartbeat interval | 10s | Runner health check |
| Heartbeat timeout | 30s | Mark runner dead |
| Cache hit target | > 80% | Good cache strategy |
| Queue depth alert | > 10K | Scaling needed |

### Architecture Decision Flowchart

```
START: "Design a CI/CD platform"
  │
  ├── Multi-tenant (SaaS)?
  │     ├── Yes → MicroVM isolation, fair-share scheduler
  │     └── No → Containers may suffice
  │
  ├── Scale (jobs/day)?
  │     ├── < 100K → Single scheduler, simple queue
  │     └── > 100K → Sharded queues, distributed scheduler
  │
  ├── Self-hosted runners?
  │     ├── Yes → Runner registration, security policies
  │     └── No → Focus on managed pool autoscaling
  │
  ├── Compliance requirements?
  │     ├── Yes → SLSA, provenance, audit logging
  │     └── No → Basic security sufficient
  │
  └── Global teams?
        ├── Yes → Multi-region, regional caches
        └── No → Single region, multi-AZ
```

### Interview Talking Points Checklist

**Clarification Phase:**
- [ ] Clarify scale (jobs/day, concurrent)
- [ ] Multi-tenant vs single-tenant
- [ ] Build types and languages
- [ ] Runner model (managed/self-hosted)

**High-Level Design:**
- [ ] Control plane / data plane separation
- [ ] Draw webhook → pipeline → scheduler → runner flow
- [ ] Mention storage choices (PostgreSQL, Redis, S3)
- [ ] Discuss DAG execution for job dependencies

**Deep Dive:**
- [ ] Queue structure and priority handling
- [ ] OR cache hierarchy and key generation
- [ ] OR isolation layers and security
- [ ] Exactly-once job execution

**Trade-offs:**
- [ ] Centralized vs distributed scheduler
- [ ] Container vs MicroVM isolation
- [ ] Fair-share algorithm approach
- [ ] Cache effectiveness vs storage cost

**Wrap-up:**
- [ ] Security: SLSA, secrets, isolation
- [ ] Observability: queue depth, success rate, pickup latency
- [ ] Static stability: data plane independence

---

## Sample Interview Dialogue

**Interviewer:** "Design a CI/CD build system like GitHub Actions or Jenkins."

**Candidate:** "Great question. Before I start designing, I'd like to clarify a few requirements.

First, what scale are we designing for - are we building a public cloud service handling millions of jobs, or an enterprise system for thousands?

Second, is this multi-tenant where we're running untrusted code from different organizations, or single-tenant for internal use?

Third, what types of builds are most common - container builds, compiled languages, or mostly test suites?"

**Interviewer:** "Let's design for a public cloud service at GitHub Actions scale - millions of jobs per day, multi-tenant with untrusted code."

**Candidate:** "Got it. For a multi-tenant platform at that scale, security and fair scheduling are critical. Let me sketch the architecture.

[Draws diagram]

The system has two main layers. The **control plane** handles pipeline orchestration - receiving webhooks, parsing workflow YAML, scheduling jobs, and managing worker lifecycle. The **data plane** is where actual builds run in isolated environments.

For job scheduling, I'd use a multi-level queue architecture. Priority lanes separate urgent deployments from regular PR builds. Within each priority, we apply fair-share scheduling so no single organization can monopolize resources. Jobs are matched to runners by labels like 'ubuntu-latest' or 'self-hosted'.

For isolation, since this is multi-tenant with untrusted code, I'd use MicroVMs like Firecracker instead of containers. Each job gets its own VM with a separate kernel, so even a kernel exploit in one job can't affect others. The trade-off is slightly higher startup time - about 125ms versus 1 second for containers - but the security benefit is essential for a public platform.

Should I dive deeper into the scheduling algorithm or discuss the caching strategy for build acceleration?"

**Interviewer:** "Let's talk about the scheduling. How do you handle 100,000 concurrent jobs fairly?"

**Candidate:** "The key challenge is balancing priority with fairness. Here's my approach:

For the queue structure, I'd use Redis sorted sets where the score combines priority weight and timestamp. High-priority jobs (production deployments) get 3x weight, normal jobs (PR builds) get 1x, and scheduled jobs get 0.5x. Within the same priority, jobs are FIFO by timestamp.

For fair-share, I track each organization's running jobs versus their quota. If Org A is using 200% of their fair share, their jobs get a penalty modifier - say 0.5x priority. If Org B is at 0% usage, their jobs get a boost - 1.5x. This prevents any single tenant from starving others.

For exactly-once execution, when a runner claims a job, we use Redis distributed locks. The runner acquires a lock on the job ID before removing it from the queue. If the lock is already held, another runner already claimed it. Job state transitions are idempotent - if we crash and retry, the same state change is a no-op.

For the scale of 100K concurrent jobs, we'd shard the queues by label hash across a Redis Cluster. Each scheduler instance handles a subset of shards, with leader election per shard to prevent conflicts. At 10K scheduling decisions per second, a cluster of 10 scheduler instances handles the load with margin for bursts."

[Interview continues...]
