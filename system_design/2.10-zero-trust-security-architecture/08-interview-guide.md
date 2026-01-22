# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45-min Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| **0-5 min** | Clarify | Scope the problem | Ask about scale, existing infrastructure, migration constraints |
| **5-15 min** | High-Level | Core architecture | Control plane vs data plane, key components |
| **15-30 min** | Deep Dive | Critical components | PDP, CA/mTLS, or policy model (pick 1-2) |
| **30-40 min** | Scale & Security | Bottlenecks, threats | Scaling PDP, handling failures, threat model |
| **40-45 min** | Wrap Up | Summary, Q&A | Highlight trade-offs, answer follow-ups |

---

## Phase-by-Phase Guide

### Phase 1: Clarification (0-5 min)

**Questions to ask the interviewer:**

| Question | Why It Matters |
|----------|---------------|
| What's the scale? (users, services) | Determines infrastructure complexity |
| Single cloud or multi-cloud? | Affects PKI and policy distribution |
| Existing identity provider? | Integration vs greenfield |
| Migration timeline constraints? | Phased rollout vs big-bang |
| Legacy systems that can't support mTLS? | Proxy/gateway requirements |
| Compliance requirements? | SOC 2, HIPAA, PCI affect design |

**Sample clarification conversation:**

> "Before I dive in, I'd like to understand the scope. Are we designing for a specific scale - say 10,000 users with 100 microservices, or enterprise scale with 100,000+ users? Also, is there an existing identity provider we need to integrate with, or are we building that too?"

### Phase 2: High-Level Design (5-15 min)

**What to cover:**

1. **Draw the architecture**
   - Separate control plane and data plane
   - Show: IdP, PDP, CA, PEP (sidecars), Access Proxy

2. **Explain core principles**
   - "Never trust, always verify"
   - Identity-based, not network-based
   - Continuous verification

3. **Key data flows**
   - User access flow (IdP → PDP → PEP → Service)
   - Service-to-service mTLS flow

**Diagram to draw:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONTROL PLANE                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │   IdP    │  │   PDP    │  │    CA    │  │ Device Trust Svc │    │
│  │ (Auth)   │  │ (Policy) │  │ (Certs)  │  │    (Posture)     │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
        ↓              ↓             ↓                ↓
┌─────────────────────────────────────────────────────────────────────┐
│  DATA PLANE                                                          │
│                                                                      │
│  User ──→ [Access Proxy] ──→ [PEP] ←──mTLS──→ [PEP] ──→ Service    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Phase 3: Deep Dive (15-30 min)

**Pick 1-2 areas to go deep:**

| Topic | What to Explain |
|-------|-----------------|
| **Policy Decision Point (PDP)** | Policy model (ABAC/ReBAC), caching, scaling |
| **Certificate Authority & mTLS** | SPIFFE/SPIRE, short-lived certs, rotation |
| **Device Trust** | Attestation mechanisms, posture scoring |
| **Policy Model** | Schema design, evaluation algorithm |

**Deep dive example (PDP):**

> "The PDP is critical because it's on the path of every request. Let me explain how to scale it while maintaining consistency.
>
> For policy evaluation, I'd use a hybrid ABAC model where policies define subjects, resources, and conditions. The evaluation algorithm first matches subjects, then resources, then evaluates conditions in order. First matching DENY wins, then first ALLOW.
>
> For scaling, PDP nodes are stateless - they cache policies locally and receive updates via pub/sub. This lets us scale horizontally. The trade-off is eventual consistency in policy updates, but with a 30-second max lag, this is acceptable for most use cases.
>
> For latency, I'd add multiple cache layers: decision cache (1 min TTL) for repeated identical requests, compiled policy cache, and group membership cache. This gets us sub-5ms p99 latency."

### Phase 4: Scale & Security (30-40 min)

**Address these concerns:**

1. **Scaling**
   - "PDP scales horizontally with policy caching. At 100K eval/sec, we need ~10 nodes."
   - "CA scales by using short-lived certs and jittered rotation to avoid thundering herd."

2. **Failure handling**
   - "If PDP fails, PEPs use cached decisions with degraded mode flag."
   - "For CA failure, existing certs remain valid, so services keep working."

3. **Security**
   - "Main threats: credential theft (mitigate with MFA + device binding), lateral movement (mitigate with micro-segmentation), CA compromise (HSM protection, offline root)."

### Phase 5: Wrap Up (40-45 min)

**Summarize your design:**

> "To summarize: I've designed a Zero Trust architecture with four main components: Identity Provider for user authentication with MFA, Policy Decision Point for real-time access decisions, Certificate Authority for workload identity and mTLS, and Device Trust Service for posture verification.
>
> Key trade-offs include: eventual consistency for policy distribution (< 30s lag) in exchange for lower latency, short-lived certificates (24h) for security at the cost of rotation complexity, and fail-closed for security while accepting potential availability impact.
>
> The system handles 100K+ users and 10K+ services with sub-10ms policy evaluation latency."

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **Security infrastructure IS the infrastructure** - Failure blocks everything
2. **Latency critical** - On the path of every request
3. **PKI complexity** - Managing certificates at scale is hard
4. **Migration challenge** - Greenfield is rare; usually replacing VPN/perimeter
5. **Multi-domain** - Identity, crypto, network, policy all involved

### Where to Spend Most Time

| Topic | Time Investment | Why |
|-------|----------------|-----|
| Control vs data plane separation | High | Core architecture decision |
| PDP design & scaling | High | Most complex component |
| mTLS and certificate lifecycle | High | Fundamental to Zero Trust |
| Policy model design | Medium | Important but less complex |
| Device trust | Medium | Platform-dependent |
| Observability | Lower | Important but not differentiating |

### How to Approach This Problem

1. **Start with principles** - "Never trust, always verify" guides all decisions
2. **Separate control and data planes** - Different scaling/reliability needs
3. **Think about failures** - What if PDP is down? What if CA is compromised?
4. **Consider migration** - Most enterprises have existing systems
5. **Be explicit about trade-offs** - Security vs latency, consistency vs availability

---

## Trade-offs Discussion

### Centralized vs Distributed PDP

| Option | Pros | Cons | When to Choose |
|--------|------|------|----------------|
| **Centralized PDP** | Consistent decisions, easier audit | Latency, SPOF risk | < 10K requests/sec, single region |
| **Distributed PDP** | Low latency, fault tolerant | Eventual consistency | High scale, multi-region |
| **Hybrid (recommended)** | Balance of both | Complexity | Enterprise scale |

### Short-lived vs Long-lived Certificates

| Option | Pros | Cons | When to Choose |
|--------|------|------|----------------|
| **Short-lived (24h)** | Reduced blast radius, no CRL needed | Rotation complexity, CA load | Service mesh, automated environments |
| **Long-lived (1 year)** | Simple operations | Long exposure if compromised | Legacy systems, manual processes |

### Fail-Open vs Fail-Closed

| Option | Pros | Cons | When to Choose |
|--------|------|------|----------------|
| **Fail-closed (deny)** | Security maintained | Availability impact | Security-critical systems |
| **Fail-open (allow)** | Availability maintained | Security gap | User-facing, with monitoring |
| **Degraded mode** | Balanced | Complexity | Most production systems |

### Strict vs Permissive Mode During Migration

| Option | Pros | Cons | When to Choose |
|--------|------|------|----------------|
| **Strict from day 1** | Maximum security | Disruption, user friction | Greenfield deployments |
| **Permissive (log-only)** | Easy migration | Security gaps | Legacy environments |
| **Gradual (recommended)** | Controlled rollout | Longer migration | Most enterprises |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just use a VPN?" | Understand Zero Trust vs perimeter security | "VPN assumes network = trust boundary, which fails with cloud, remote work, and insider threats. Zero Trust verifies every request regardless of network location. VPN gives all-or-nothing access; Zero Trust gives least-privilege access to specific resources." |
| "What happens if the PDP is down?" | Test failure thinking | "PEPs cache recent decisions and policies. In graceful degradation, known users accessing non-sensitive resources continue with cached decisions. For new access or sensitive resources, we fail-closed and deny. We alert immediately and have < 5 min RTO." |
| "How do you handle legacy services that can't do mTLS?" | Practical migration thinking | "We use an identity-aware proxy in front of legacy services. The proxy terminates mTLS, validates identity, and forwards plain requests to legacy services. Over time, we migrate services to native mTLS." |
| "What if someone steals a certificate?" | Security depth | "Short-lived certs (24h) limit exposure. For immediate revocation, we use CRL/OCSP checked by PEPs. Device binding means stolen cert doesn't work from different machine. If CA key is compromised, we have offline root + HSM protection for intermediate keys." |
| "How do you enforce policy consistently across regions?" | Distributed systems knowledge | "Policy store is replicated across regions with eventual consistency (< 30s lag). Each PDP node caches policies locally. For critical policies, we can require synchronous propagation before activation. Version vectors prevent conflicts." |
| "How is this different from just using OAuth/OIDC?" | Scope understanding | "OAuth/OIDC handles user authentication and coarse authorization. Zero Trust adds: device trust verification, continuous session validation, service-to-service mTLS, fine-grained ABAC policies, and micro-segmentation. It's a complete security architecture, not just auth." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | What to Do Instead |
|---------|--------------|-------------------|
| Focusing only on authentication | Zero Trust is more than auth | Cover all components: identity, policy, device, encryption |
| Ignoring certificate lifecycle | mTLS won't work without it | Discuss rotation, CA HA, SPIFFE/SPIRE |
| Forgetting migration path | Enterprises can't start fresh | Discuss phased rollout, legacy proxies |
| Over-designing day 1 | Too complex to implement | Start simple, iterate |
| Single point of failure in PDP | Blocks all access | HA design, caching, degraded modes |
| Ignoring latency impact | Users will hate it | Target < 10ms added latency |
| Not discussing threat model | Security system needs security analysis | Explicitly cover top threats |

---

## Questions to Ask Interviewer

### If Time Permits

| Question | Shows |
|----------|-------|
| "What's the current authentication mechanism?" | Practical migration thinking |
| "Are there compliance requirements like SOC 2 or HIPAA?" | Enterprise awareness |
| "How many legacy services can't support mTLS?" | Real-world constraints |
| "Is there an existing PKI infrastructure?" | Integration thinking |
| "What's the expected growth over 3 years?" | Capacity planning |

---

## Interview Scoring Rubric

### What Interviewers Look For

| Criterion | Poor | Average | Excellent |
|-----------|------|---------|-----------|
| **Principles** | Doesn't understand Zero Trust | Basic understanding | Clear articulation of "never trust, always verify" |
| **Architecture** | Missing key components | Basic architecture | Clear control/data plane separation, all components |
| **PDP Design** | No scaling consideration | Basic design | Policy model, caching, scaling strategy |
| **mTLS/PKI** | Doesn't mention certs | Basic mTLS understanding | SPIFFE/SPIRE, rotation, CA HA |
| **Security** | No threat model | Lists some threats | Comprehensive threat model with mitigations |
| **Scalability** | "Add more servers" | Basic scaling | Concrete numbers, caching strategy, regional deployment |
| **Failures** | Not discussed | Basic failover | Graceful degradation, fail-open/closed decision |
| **Trade-offs** | One-sided | Mentions trade-offs | Explicit, justified decisions for each choice |

---

## Quick Reference Card

**Pull out these numbers in interview:**

| Metric | Target |
|--------|--------|
| Policy evaluation latency (p99) | < 10ms |
| Policy propagation time | < 30 seconds |
| Certificate TTL | 24 hours |
| Certificate rotation | At 50% TTL (12 hours) |
| PDP availability | 99.999% |
| CA availability | 99.99% |

**Key components:**

| Component | Purpose |
|-----------|---------|
| **IdP** | User authentication, MFA, SSO |
| **PDP** | Policy evaluation, access decisions |
| **PEP** | Enforcement at service mesh sidecar |
| **CA** | Workload certificates, mTLS |
| **Device Trust** | Posture assessment, attestation |

**Go-to answers:**

- Zero Trust principle: "Never trust, always verify"
- Policy model: "ABAC with SPIFFE IDs for services"
- mTLS approach: "Short-lived certs (24h) via SPIFFE/SPIRE"
- Failure handling: "Fail-closed for security, cached decisions for continuity"
- Migration: "Phased rollout with permissive logging mode first"

**Production-ready differentiators:**

- Graceful degradation with decision caching
- Device binding for tokens (stolen creds don't work elsewhere)
- Risk-based step-up authentication
- HSM protection for CA keys
- Jittered certificate rotation to avoid thundering herd
