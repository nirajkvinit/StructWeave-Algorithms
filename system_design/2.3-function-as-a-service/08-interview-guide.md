# Interview Guide

[← Back to Index](./00-index.md)

---

## 45-Minute Interview Pacing

### Timeline

| Time | Phase | Focus | Key Actions |
|------|-------|-------|-------------|
| 0-5 min | **Requirements** | Clarify scope | Ask about scale, latency needs, use cases |
| 5-15 min | **High-Level Design** | Architecture | Draw control/data plane, explain invocation flow |
| 15-30 min | **Deep Dive** | Core component | Cold starts OR Isolation OR Scaling |
| 30-40 min | **Scalability & Trade-offs** | Scale, reliability | Discuss burst handling, multi-region, trade-offs |
| 40-45 min | **Wrap-up** | Security, observability | Quick touch on isolation, monitoring |

### Phase Details

#### Phase 1: Requirements (0-5 min)

**Questions to ask:**

1. "What types of workloads are we supporting? HTTP APIs, event processing, scheduled jobs?"
2. "What are the latency requirements? Is sub-100ms response critical?"
3. "What scale are we designing for? Peak invocations per second?"
4. "Is this multi-tenant (public cloud) or single-tenant (enterprise)?"
5. "Any specific runtime requirements? Languages, custom runtimes?"

**Calibrate your design:**

| Scenario | Design Focus |
|----------|--------------|
| Low latency API (<100ms) | Provisioned concurrency, warm pools |
| Event processing | Async invocation, batch processing |
| Multi-tenant cloud | Strong isolation (MicroVMs), security |
| Enterprise/single-tenant | Containers may suffice, simpler isolation |
| Edge computing | V8 isolates, global distribution |

#### Phase 2: High-Level Design (5-15 min)

**Must cover:**
1. Control plane vs data plane separation
2. Core components: API Gateway, Function Registry, Worker Manager, Worker Fleet
3. Data flow: Synchronous invocation path
4. Key architectural decisions: Isolation approach, event sources

**Whiteboard structure:**

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONTROL PLANE                             │
│  ┌─────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   API   │  │  Function   │  │  Scaling │  │    Worker    │  │
│  │ Gateway │  │  Registry   │  │Controller│  │   Manager    │  │
│  └────┬────┘  └──────┬──────┘  └────┬─────┘  └──────┬───────┘  │
└───────┼──────────────┼──────────────┼───────────────┼───────────┘
        │              │              │               │
        ▼              ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA PLANE                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Frontend Workers                       │   │
│  │   (Route invocations, apply throttling, handle async)    │   │
│  └────────────────────────────┬─────────────────────────────┘   │
│                               │                                  │
│  ┌────────────────────────────┼────────────────────────────┐    │
│  │                     WORKER FLEET                         │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │    │
│  │  │  MicroVM    │  │  MicroVM    │  │  MicroVM    │     │    │
│  │  │ (Tenant A)  │  │ (Tenant B)  │  │ (Tenant C)  │     │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

#### Phase 3: Deep Dive (15-30 min)

**Option A: Cold Start Deep Dive**
- What causes cold starts (boot, code download, runtime init, user init)
- Breakdown: MicroVM boot (~125ms) + code fetch + runtime + user code
- Optimizations: Provisioned concurrency, SnapStart, multi-tier caching
- Trade-offs: Cost vs latency

**Option B: Isolation Deep Dive**
- MicroVM architecture (Firecracker)
- Why not containers? (Kernel sharing, weaker isolation)
- Defense in depth: KVM + Jailer + seccomp + cgroups
- Performance overhead vs security strength

**Option C: Scaling Deep Dive**
- Burst scaling: Initial burst (500-3000) + sustained (+500/min)
- Warm pool management: Predictive warming, TTL expiration
- Placement algorithm: Locality, load balance, spreading
- Throttling: Per-function, per-account limits

#### Phase 4: Scalability & Trade-offs (30-40 min)

**Must cover:**
1. Handling 10,000 concurrent requests suddenly
2. Multi-region deployment for global latency
3. Static stability: Data plane survives control plane failure
4. Cost optimization: On-demand vs provisioned

#### Phase 5: Wrap-up (40-45 min)

**Quick touch on:**
- Security: Tenant isolation, IAM, execution roles
- Observability: Key metrics (invocations, errors, duration, cold starts)
- Compliance: SOC2, HIPAA considerations

---

## Trade-off Discussions

### MicroVM vs Container vs V8 Isolate

| Aspect | MicroVM | Container | V8 Isolate |
|--------|---------|-----------|------------|
| **Security** | Strongest (hardware) | Medium (namespace) | Good (process) |
| **Cold start** | ~125ms | ~200-500ms | <5ms |
| **Languages** | Any | Any | JS/WASM only |
| **Overhead** | ~5 MB | ~10-50 MB | ~1 MB |
| **Use case** | Multi-tenant cloud | Single-tenant | Edge/low-latency |

**When to choose:**
- MicroVM: Public cloud, untrusted code, strong isolation required
- Container: Single-tenant, trusted code, legacy apps
- V8 Isolate: Edge computing, JavaScript workloads, extreme latency requirements

### Provisioned vs On-Demand Concurrency

| Aspect | Provisioned | On-Demand |
|--------|-------------|-----------|
| **Cold starts** | Never (for provisioned slots) | Yes (on scale-up) |
| **Cost** | Continuous (per-hour) | Per-invocation only |
| **Latency** | Consistent, low | Variable (cold start penalty) |
| **Use case** | Latency-critical APIs | Variable traffic, dev/test |

**When to choose:**
- Provisioned: p99 latency SLA <100ms, payment processing, real-time APIs
- On-Demand: Development, batch processing, traffic with predictable patterns

### Synchronous vs Asynchronous Invocation

| Aspect | Synchronous | Asynchronous |
|--------|-------------|--------------|
| **Response** | Immediate | Eventual (callback/poll) |
| **Timeout** | Function timeout | Queue + function timeout |
| **Retry** | Client responsibility | Platform managed |
| **Use case** | HTTP APIs, real-time | Event processing, ETL |

**Design insight:** Use sync for user-facing, async for backend processing.

---

## Trap Questions & Answers

### "Why not just use containers instead of MicroVMs?"

**Trap:** Thinking containers are "good enough" for multi-tenant isolation.

**Good answer:**
"Containers share the host kernel, which creates attack surface. A kernel vulnerability could allow container escape and access to other tenants' data. MicroVMs provide hardware-level isolation via KVM, with each tenant getting their own kernel. The trade-off is slightly higher cold start (~125ms vs ~200-500ms), but for a multi-tenant cloud platform, the security benefit outweighs the performance cost. For single-tenant or trusted workloads, containers can be appropriate."

### "How do you handle 10,000 concurrent requests arriving at once?"

**Trap:** Assuming you can instantly provision 10,000 instances.

**Good answer:**
"There are physical limits to how fast we can scale. Burst capacity allows 500-3,000 concurrent cold starts immediately, followed by sustained scaling of ~500/minute. For requests exceeding burst capacity:
1. Queue with timeout for async invocations
2. Throttle (429) for sync invocations beyond capacity
3. Provisioned concurrency eliminates this problem for critical functions

The key is setting expectations: functions with strict latency SLAs should use provisioned concurrency. On-demand scaling is eventually consistent, not instant."

### "What happens if your control plane goes down?"

**Trap:** Thinking the whole system fails.

**Good answer:**
"The system exhibits static stability. The data plane continues operating with existing warm instances - functions keep executing, event sources keep invoking. What's lost: new deployments, configuration changes, new cold starts (placement service unavailable), and scaling adjustments. This is by design - we prioritize availability of existing workloads over management operations. Control plane HA (multi-AZ, leader election) minimizes this scenario."

### "How do you prevent a function from consuming all resources?"

**Trap:** Missing the multi-layer defense.

**Good answer:**
"Resource protection works at multiple levels:
1. **Per-execution:** Memory limit (cgroups hard limit), CPU limit, timeout enforcement
2. **Per-function:** Reserved/provisioned concurrency limits
3. **Per-account:** Account-level concurrency quota (e.g., 1,000 default)
4. **Platform:** Worker fleet capacity, rate limiting

If one tenant tries to monopolize resources, account limits prevent impact on others. Noisy neighbor scenarios are mitigated by MicroVM isolation (no shared kernel, rate-limited I/O) and spreading functions across workers."

### "Why is VPC cold start so much slower?"

**Trap:** Not understanding the ENI attachment process.

**Good answer:**
"VPC connectivity requires an Elastic Network Interface (ENI) in the customer's subnet. ENI creation involves:
1. Allocating IP from customer subnet
2. Attaching to the MicroVM's network namespace
3. Configuring security group rules
4. Setting up route tables

This adds 500ms-2s to cold start. Mitigations:
- Hyperplane (shared ENI pool) reduces this to ~100ms
- Provisioned concurrency keeps ENIs attached
- VPC endpoints for services like DynamoDB, S3 (avoid internet gateway)"

---

## Common Mistakes to Avoid

### Design Mistakes

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Using containers for multi-tenant | Weak isolation | MicroVMs for untrusted code |
| Ignoring cold starts | Poor user experience | Plan for provisioned concurrency |
| Stateful functions | Unpredictable behavior | Externalize state to databases |
| No timeout limits | Resource exhaustion | Always set timeouts |
| Synchronous fan-out | Latency multiplication | Use async with queue |

### Interview Mistakes

| Mistake | Impact | Correction |
|---------|--------|------------|
| Jumping to implementation | Miss requirements | Always clarify scale and use case |
| Not mentioning cold starts | Seems naive | Proactively discuss the trade-off |
| Over-engineering | Time waste | Start simple, add complexity for scale |
| Ignoring cost | Impractical design | Mention pay-per-use, provisioned trade-offs |
| No security discussion | Incomplete | Always mention tenant isolation |

---

## Quick Reference Card

### Key Numbers to Remember

| Metric | Value | Context |
|--------|-------|---------|
| MicroVM boot | ~125ms | Firecracker |
| V8 isolate boot | <5ms | Cloudflare Workers |
| Cold start (Node.js) | 150-300ms | Typical |
| Cold start (Java) | 1-5s | Without SnapStart |
| Cold start (Java SnapStart) | 100-200ms | With optimization |
| VPC cold start penalty | 500-2000ms | ENI attachment |
| Burst scaling | 500-3,000/region | Initial burst |
| Sustained scaling | +500/minute | After burst |
| Default concurrency | 1,000/account | Configurable |
| Max timeout | 15 minutes | Per invocation |
| Max memory | 10 GB | Per function |
| Payload limit (sync) | 6 MB | Request/response |
| Payload limit (async) | 256 KB | Event size |

### Architecture Decision Flowchart

```
START: "Design a FaaS platform"
  │
  ├── Multi-tenant (public cloud)?
  │     ├── Yes → MicroVMs (Firecracker)
  │     └── No → Containers may suffice
  │
  ├── Latency-critical (<100ms)?
  │     ├── Yes → Provisioned concurrency
  │     └── No → On-demand scaling
  │
  ├── JavaScript-only workloads?
  │     ├── Yes → Consider V8 isolates (edge)
  │     └── No → MicroVMs or containers
  │
  ├── Global distribution needed?
  │     ├── Yes → Multi-region + edge
  │     └── No → Single region, multi-AZ
  │
  └── Event-driven or request-response?
        ├── Request-response → Sync invocation
        └── Event-driven → Async + queues
```

### Interview Talking Points Checklist

**Requirements Phase:**
- [ ] Clarify latency requirements
- [ ] Understand scale (invocations/second)
- [ ] Multi-tenant vs single-tenant
- [ ] Runtime requirements

**High-Level Design:**
- [ ] Control plane / data plane separation
- [ ] Explain invocation flow
- [ ] Mention isolation approach
- [ ] Draw clear diagram

**Deep Dive:**
- [ ] Cold start components and optimizations
- [ ] OR isolation layers and security
- [ ] OR scaling mechanisms and limits

**Trade-offs:**
- [ ] MicroVM vs Container vs Isolate
- [ ] Provisioned vs On-demand
- [ ] Sync vs Async
- [ ] Cost vs latency

**Wrap-up:**
- [ ] Security: tenant isolation
- [ ] Observability: key metrics
- [ ] Static stability: data plane independence

---

## Sample Interview Dialogue

**Interviewer:** "Design a serverless compute platform like AWS Lambda."

**Candidate:** "Great question. Before diving in, I'd like to clarify a few requirements. First, what scale are we designing for - are we talking about a public cloud service with millions of customers, or an enterprise platform? Second, what are the latency requirements - do we need sub-100ms cold starts?"

**Interviewer:** "Let's say it's a public cloud service, handling billions of invocations per day. Latency matters - many customers use it for HTTP APIs."

**Candidate:** "Understood. For a multi-tenant public cloud at that scale, we need strong isolation and low latency. Let me outline the high-level architecture first, then we can dive deep into the cold start problem which is critical for HTTP APIs.

The system has two main planes. The control plane handles function deployment, configuration, and scaling decisions. The data plane handles actual invocations.

[Draws diagram]

For isolation, since this is multi-tenant with untrusted code, I'd use MicroVMs like Firecracker rather than containers. Each function execution gets its own lightweight VM with its own kernel, providing hardware-level isolation via KVM. This is more secure than containers which share the host kernel.

For invocations, the flow is: request comes to a frontend worker, which checks authentication and rate limits, then routes to the placement service to find a warm slot or trigger a cold start if needed. The function executes in an isolated MicroVM and returns the response.

The key challenge is cold starts. When there's no warm instance, we need to boot the MicroVM (~125ms), download function code (10-500ms depending on cache), initialize the runtime (50-500ms), and run user initialization code. For HTTP APIs, this can push latency to seconds for Java applications.

Should I dive deeper into cold start optimization or discuss the isolation architecture?"

**Interviewer:** "Let's talk about cold starts. How do you get that down to sub-100ms?"

**Candidate:** "Several approaches work together:

First, provisioned concurrency - we maintain pre-warmed instances that are always ready. This costs more (per-hour billing) but eliminates cold starts for latency-critical functions.

Second, SnapStart for heavy runtimes like Java. We run the function through initialization once, capture a memory snapshot, then restore from snapshot instead of cold booting. This can reduce Java cold starts from 5 seconds to 200ms.

Third, multi-tier code caching. L1 cache on each worker (50GB local SSD), L2 regional shared cache, L3 is object storage. With good caching, code fetch is <50ms instead of 200ms+.

Fourth, predictive warming - using ML to anticipate demand based on historical patterns and pre-warm instances before traffic arrives.

The trade-off is cost. Provisioned concurrency means paying for idle capacity. SnapStart requires additional storage. The customer decides based on their latency requirements and budget."

[Interview continues...]
