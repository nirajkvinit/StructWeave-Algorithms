# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45-min Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| **0-5 min** | Clarify | Scope the problem | Ask about scale, use cases, consistency needs |
| **5-15 min** | High-Level | Core architecture | Components, data flow, algorithm choice |
| **15-30 min** | Deep Dive | Critical components | Race conditions, distributed consistency |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failures | Scaling strategy, failure modes |
| **40-45 min** | Wrap Up | Summary, Q&A | Highlight trade-offs, handle follow-ups |

---

## Phase-by-Phase Guide

### Phase 1: Clarification (0-5 min)

**Questions to ask the interviewer:**

| Question | Why It Matters |
|----------|---------------|
| What's the expected scale (QPS)? | Determines architecture complexity |
| Read-heavy, write-heavy, or mixed? | Affects storage and caching strategy |
| What are the latency requirements? | Influences algorithm and storage choice |
| Single region or multi-region? | Impacts consistency model |
| What consistency is acceptable? | Strong vs eventual affects design |
| Per-user, per-IP, or both? | Determines key structure |
| What happens when limit is exceeded? | 429 response, queuing, or degraded service |

**Sample clarification conversation:**

> "Before I dive in, I'd like to clarify a few things. Are we designing this for a specific scale, say 100K QPS or 1M QPS? And is this for a single datacenter or do we need to support multi-region deployment?"

### Phase 2: High-Level Design (5-15 min)

**What to cover:**

1. **Draw the architecture**
   - Client → Load Balancer → API Gateway → Rate Limiter → Backend
   - Show Redis as distributed storage

2. **Explain the data flow**
   - "When a request comes in, we extract the user ID, check the rate limit in Redis, and either allow or deny..."

3. **Justify algorithm choice**
   - "I'd recommend sliding window counter because it provides good accuracy without the memory overhead of sliding window log..."

**Diagram to draw:**

```
┌────────┐    ┌─────────┐    ┌──────────────┐    ┌─────────┐    ┌─────────┐
│ Client │───▶│   LB    │───▶│ Rate Limiter │───▶│  Redis  │    │ Backend │
└────────┘    └─────────┘    └──────────────┘    └─────────┘    └─────────┘
                                    │                               ▲
                                    └───────────────────────────────┘
                                         (if allowed)
```

### Phase 3: Deep Dive (15-30 min)

**Pick 1-2 areas to go deep:**

| Topic | What to Explain |
|-------|-----------------|
| **Race Conditions** | Check-then-act problem, Lua scripts for atomicity |
| **Algorithm Details** | Pseudocode, time/space complexity, trade-offs |
| **Distributed Consistency** | CAP choice, replication lag handling |
| **Redis Architecture** | Sharding, replication, failover |

**Deep dive example (Race Conditions):**

> "The main challenge here is race conditions. If two requests arrive simultaneously, both might read the same count, both pass the check, and both increment - exceeding our limit. The solution is to use Redis Lua scripts which execute atomically. Let me write the pseudocode..."

### Phase 4: Scale & Trade-offs (30-40 min)

**Address these concerns:**

1. **Scaling**
   - "To handle 1M QPS, we'd shard Redis by user ID using consistent hashing..."

2. **Failure handling**
   - "If Redis fails, we have two options: fail-open (allow all) or fail-closed (deny all). For availability, I'd recommend fail-open with local rate limiting as fallback..."

3. **Bottlenecks**
   - "The main bottleneck is Redis. Hot keys can overwhelm a single shard. We can mitigate with local aggregation..."

### Phase 5: Wrap Up (40-45 min)

**Summarize your design:**

> "To summarize: we have a distributed rate limiter using sliding window counter algorithm, backed by Redis cluster for storage. Key trade-offs include choosing eventual consistency for lower latency, and fail-open mode for availability. The system can handle 1M QPS with proper sharding and local caching."

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **On the critical path** - Adds latency to every API request
2. **Must handle failures gracefully** - Can't block legitimate traffic
3. **Distributed coordination** - Maintaining accurate counts across nodes
4. **Race conditions** - Concurrent requests can bypass limits
5. **Time sensitivity** - Algorithms depend on accurate time

### Where to Spend Most Time

| Topic | Time Investment | Why |
|-------|----------------|-----|
| Algorithm trade-offs | High | Core of the problem |
| Race condition handling | High | Shows distributed systems knowledge |
| Failure modes | Medium | Shows operational thinking |
| Capacity estimation | Medium | Shows quantitative skills |
| Security | Low | Usually not the focus |

### How to Approach This Problem

1. **Start simple** - Single server, in-memory counter
2. **Add complexity gradually** - "Now if we need to distribute this..."
3. **Think about failures** - "What if Redis goes down?"
4. **Be explicit about trade-offs** - "We sacrifice X for Y because..."

---

## Trade-offs Discussion

### Consistency vs Latency

| Option | Pros | Cons | When to Choose |
|--------|------|------|----------------|
| **Strong Consistency** (single Redis) | Accurate counts | Higher latency, SPOF | Low scale, single DC |
| **Eventual Consistency** (local cache + sync) | Low latency | May over-admit slightly | High scale, multi-DC |

**Recommendation:** Eventual consistency. Rate limiting doesn't require financial-grade accuracy.

### Algorithm Choice

| Option | Pros | Cons | When to Choose |
|--------|------|------|----------------|
| **Token Bucket** | Burst-friendly, simple | Can consume entire bucket instantly | APIs expecting bursts |
| **Sliding Window Counter** | Accurate, memory-efficient | Slightly more complex | Most use cases |
| **Fixed Window** | Simplest | 2x burst at boundaries | When simplicity matters more |

### Failure Mode

| Option | Pros | Cons | When to Choose |
|--------|------|------|----------------|
| **Fail-Open** | High availability | No protection during failure | User-facing APIs |
| **Fail-Closed** | Always protected | May block legitimate users | Security-critical APIs |

### Storage Choice

| Option | Pros | Cons | When to Choose |
|--------|------|------|----------------|
| **Centralized Redis** | Simple, consistent | SPOF, higher latency | < 100K QPS |
| **Sharded Redis** | Scales horizontally | Operational complexity | > 100K QPS |
| **Local + Distributed** | Lowest latency | Eventual consistency | Multi-region |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just use an in-memory counter?" | Understand distributed challenges | "Works for single server, but with multiple servers we need shared state. Otherwise, a user could get N times the limit by hitting different servers." |
| "What if Redis fails?" | Test failure thinking | "We have options: fail-open allows requests (prioritizes availability), fail-closed denies (prioritizes protection). I'd recommend fail-open with local fallback limits and alerting." |
| "How would you handle 100x the current scale?" | Forward thinking | "At 100x, we'd need sharded Redis, hierarchical rate limiting with edge enforcement, and potentially CRDT-based counters for multi-region." |
| "Why not use a database instead of Redis?" | Understand performance requirements | "Database would add 10-50ms latency per request. With rate limiting on the critical path, we need sub-5ms latency. Redis gives us sub-1ms with atomic operations." |
| "What about clock skew between servers?" | Distributed systems knowledge | "Clock skew can cause window misalignment. Solutions include using server-side Redis TIME command, or accepting small inconsistency at window boundaries." |
| "How do you prevent users from bypassing limits?" | Security awareness | "Multi-layered approach: limit by user ID (authenticated), by IP (unauthenticated), by API key. Use fingerprinting for sophisticated attackers. Combine with edge-level DDoS protection." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | What to Do Instead |
|---------|--------------|-------------------|
| Jumping to solution | Miss requirements | Always clarify first |
| Over-engineering day 1 | Complexity without need | Design for 10x, not 1000x |
| Single algorithm for all | Different use cases | Explain when to use each |
| Ignoring failures | Unrealistic design | Always discuss failure modes |
| Forgetting latency impact | Rate limiter becomes bottleneck | Target <5ms added latency |
| Not discussing trade-offs | Appears one-dimensional | Explicitly state trade-offs |
| Assuming strong consistency | Unrealistic for distributed | Default to eventual, justify if strong needed |
| Using distributed locks | Too slow, complex | Use atomic operations instead |

---

## Questions to Ask Interviewer

### If Time Permits

| Question | Shows |
|----------|-------|
| "Are there different limits for different user tiers?" | Product thinking |
| "Do we need to support burst traffic?" | Algorithm awareness |
| "Is there an existing API gateway we'd integrate with?" | Practical thinking |
| "What's the current monitoring/alerting infrastructure?" | Operational maturity |
| "Are there compliance requirements (GDPR, SOC2)?" | Enterprise awareness |

---

## Interview Scoring Rubric

### What Interviewers Look For

| Criterion | Poor | Average | Excellent |
|-----------|------|---------|-----------|
| **Requirements** | Dives in immediately | Asks some questions | Thorough clarification, identifies edge cases |
| **High-Level Design** | Missing components | Basic architecture | Clear, complete, explains data flow |
| **Algorithm Knowledge** | One algorithm only | Knows options | Compares trade-offs, picks appropriate one |
| **Distributed Systems** | Ignores distribution | Mentions challenges | Deep on race conditions, consistency |
| **Scalability** | "Add more servers" | Basic sharding | Comprehensive scaling strategy |
| **Failure Handling** | Not discussed | Basic failover | Graceful degradation, circuit breakers |
| **Trade-offs** | One-sided | Mentions trade-offs | Explicit, justified decisions |
| **Communication** | Unstructured | Organized | Clear, engages interviewer |

---

## Quick Reference Card

**Pull out these numbers in interview:**

| Metric | Target |
|--------|--------|
| Rate limit check latency | < 5ms p99 |
| Availability | 99.99% |
| Throughput | 1M QPS |
| Memory per user | ~75 bytes |
| Redis operations | O(1) for most algorithms |

**Key algorithms to remember:**

| Algorithm | Memory | Burst | Best For |
|-----------|--------|-------|----------|
| Token Bucket | O(1) | Yes | Stripe |
| Sliding Window Counter | O(1) | Balanced | Cloudflare |
| Fixed Window | O(1) | Boundary issue | GitHub |

**Go-to answers:**

- Consistency: "Eventual, because slight over-limit is acceptable"
- Storage: "Redis, for atomic operations and low latency"
- Failure: "Fail-open with local fallback"
- Algorithm: "Sliding window counter for accuracy and efficiency"
