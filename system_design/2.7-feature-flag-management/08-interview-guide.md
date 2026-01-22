# Interview Guide

[← Back to Index](./00-index.md)

---

## 45-Minute Interview Pacing

| Phase | Time | Focus | Deliverables |
|-------|------|-------|--------------|
| **Clarify** | 0-5 min | Requirements | Scale, flag types, SDK types, consistency |
| **High-Level** | 5-15 min | Architecture | Control plane, data plane, streaming |
| **Deep Dive** | 15-30 min | Critical component | Bucketing OR streaming OR evaluation |
| **Scale** | 30-40 min | Production concerns | Multi-region, edge, resilience |
| **Wrap-up** | 40-45 min | Trade-offs | Alternatives, questions for interviewer |

---

## Phase 1: Clarifying Questions (5 min)

### Essential Questions to Ask

| Question | Why It Matters | Expected Range |
|----------|----------------|----------------|
| "What's the expected scale - flags, evaluations/sec?" | Determines caching and scaling | 1K-10K flags, 100K-10M eval/sec |
| "Server-side SDKs, client-side, or both?" | Affects security model | Usually both |
| "How critical is real-time propagation?" | Push vs poll architecture | < 1 second to minutes |
| "Do we need A/B testing and experimentation?" | Adds statistical complexity | Usually yes |
| "Multi-region deployment required?" | Global architecture | Usually yes for enterprise |
| "What's the consistency requirement for flags?" | Eventual vs strong | Usually eventual OK |

### Sample Dialogue

```
You: "Before we dive in, I'd like to understand the scope. What's the expected
     scale in terms of number of flags and evaluations per second?"

Interviewer: "Let's say 10,000 flags across the organization, with peak
             evaluations of about 1 million per second globally."

You: "Got it. And are we supporting both server-side SDKs for backend services
     and client-side SDKs for web/mobile apps?"

Interviewer: "Yes, both."

You: "For flag updates, how quickly do changes need to propagate? Is sub-second
     real-time required, or is eventual consistency within a minute acceptable?"

Interviewer: "Sub-second propagation is important for our use cases."

You: "Understood. And do we need built-in A/B testing with statistical
     significance, or just basic feature toggles?"

Interviewer: "Full experimentation support would be ideal."
```

---

## Phase 2: High-Level Design (10 min)

### Quick Architecture Sketch

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Server SDK   │  │ Browser SDK  │  │ Mobile SDK   │               │
│  │ (Local eval) │  │ (Local eval) │  │ (Local eval) │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │    SSE          │    SSE          │    SSE                │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA PLANE                                      │
│  ┌─────────────────────────────────────────────┐                    │
│  │            Streaming Service (SSE)           │                    │
│  │         [Real-time flag updates]             │                    │
│  └─────────────────────┬───────────────────────┘                    │
│                        │                                             │
│  ┌─────────────────────┴───────────────────────┐                    │
│  │           Distributed Cache (Redis)          │                    │
│  └─────────────────────┬───────────────────────┘                    │
│                        │                                             │
│  ┌─────────────────────┴───────────────────────┐    ┌─────────────┐ │
│  │               Edge Layer (CDN)               │───▶│  Edge KV    │ │
│  │         [< 10ms global evaluation]           │    └─────────────┘ │
│  └─────────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CONTROL PLANE                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Admin UI   │  │   Flag API   │  │ Experiment   │               │
│  │              │──│              │──│   Service    │               │
│  └──────────────┘  └──────┬───────┘  └──────────────┘               │
│                           │                                          │
│                    ┌──────┴───────┐                                  │
│                    │   Database   │                                  │
│                    │  (PostgreSQL)│                                  │
│                    └──────────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Points to Mention

1. **Control Plane / Data Plane separation**
   - Control plane handles flag management (low traffic, strong consistency)
   - Data plane handles evaluation (high traffic, eventual consistency OK)

2. **Local evaluation in SDKs**
   - SDKs cache all flags locally
   - Evaluation is sub-millisecond, no network hop
   - Works offline with cached data

3. **Real-time streaming (SSE)**
   - Server-Sent Events for push updates
   - Polling as fallback when streaming fails
   - < 200ms global propagation target

4. **Consistent bucketing**
   - Same user always gets same variation
   - Critical for A/B test validity
   - Hash-based, deterministic

---

## Phase 3: Deep Dive Options (15 min)

Choose ONE based on interviewer interest or your strongest area:

### Option A: Consistent Bucketing Algorithm

**Why it's critical:** Users must always see the same flag value for experiment integrity.

**Key points:**
```
Hash Input: salt + flag_key + user_id
Hash Function: SHA256 (truncated to 8 bytes)
Bucket Space: 0-99999 (0.001% precision)

FUNCTION get_bucket(user_id, flag_key, salt):
    hash_input = concat(salt, ".", flag_key, ".", user_id)
    hash_value = sha256(hash_input)
    bucket = bytes_to_int(hash_value[0:8]) % 100000
    RETURN bucket / 1000.0  // 0.000 to 99.999%
```

**Address:**
- Why not random? Users would see flicker
- Rollout expansion (10% → 20%): Additive, original users stay
- Salt rotation: For re-randomizing experiments
- Cross-device consistency: Same user ID required

### Option B: SSE Streaming at Scale

**Why it's critical:** Millions of concurrent connections for real-time updates.

**Key points:**
- Fan-out architecture with Kafka/Pub-Sub
- Each streaming server handles ~100K connections
- Heartbeat every 30s to detect dead connections
- Reconnection with Last-Event-ID for catch-up

**Address:**
- Connection limits: Horizontal scaling, edge termination
- Failover: Polling fallback (30s interval)
- Message ordering: Versioned events, idempotent updates
- Memory management: Connection pooling, efficient serialization

### Option C: Flag Evaluation Engine

**Why it's critical:** Must be fast (< 1ms), deterministic, memory-efficient.

**Key points:**
```
Evaluation Order:
1. Kill switch (flag.is_on?)
2. Prerequisites (dependent flags)
3. Individual targets (user ID list)
4. Targeting rules (priority order)
5. Fallthrough (default rollout)
```

**Address:**
- Performance optimization: Compiled rules, indexed targets
- Determinism: No randomness, same input = same output
- Complex rules: Short-circuit evaluation, lazy attribute loading
- Memory budget: ~2-3MB per SDK instance for 1000 flags

### Option D: Edge Evaluation

**Why it's critical:** Global latency reduction from 50-200ms to < 10ms.

**Key points:**
- CDN workers (Cloudflare/Vercel) evaluate at edge
- Flag configs stored in edge KV store
- Staleness trade-off (TTL-based, push invalidation)
- Bootstrap client SDKs with edge-evaluated values

**Address:**
- Sync strategy: Push invalidation + TTL fallback (30s)
- Consistency: Accept eventual for flags, strong for critical
- Failure: Fall back to regional origin
- Cost: Edge compute vs latency benefit

---

## Phase 4: Scale & Reliability (10 min)

### Scaling Discussion Points

| Component | Scaling Strategy |
|-----------|-----------------|
| **Streaming** | Horizontal (N+2 per region), edge termination |
| **Redis Cache** | Cluster mode with sharding |
| **Database** | Read replicas + eventual sharding |
| **Edge** | CDN-managed, auto-scales |

### Reliability Discussion Points

| Failure Mode | Mitigation |
|--------------|------------|
| **Streaming down** | Polling fallback, cached flags |
| **API down** | Read from cache, queue writes |
| **Region failure** | Cross-region failover |
| **SDK network lost** | Local cache, offline mode |

### Sample Response

```
"For scaling streaming connections, each server handles about 100K connections.
At 1M SDKs, we'd need 10+ servers per region with N+2 redundancy.

For reliability, we use graceful degradation:
- Level 0: Full streaming (normal)
- Level 1: Polling every 30s (streaming down)
- Level 2: Cached flags only (API down)
- Level 3: Default values (cache expired)

SDKs continue working even with total backend failure because all evaluation
is local. The worst case is stale flags, not failed evaluations."
```

---

## Common Trade-offs to Discuss

### Trade-off 1: Server-Side vs Client-Side Evaluation

| Factor | Server-Side | Client-Side |
|--------|-------------|-------------|
| **Latency** | Network hop (10-50ms) | Local (< 1ms) |
| **Security** | Rules hidden | Rules exposed |
| **Context** | Full server context | Limited |
| **Recommendation** | API services | Web/mobile apps |

### Trade-off 2: Push (SSE) vs Pull (Polling)

| Factor | Push (SSE) | Pull (Polling) |
|--------|------------|----------------|
| **Latency** | Real-time (< 200ms) | Polling interval |
| **Connections** | Persistent (expensive) | Stateless (simple) |
| **Recommendation** | Primary | Fallback |

### Trade-off 3: Edge vs Origin Evaluation

| Factor | Edge | Origin |
|--------|------|--------|
| **Latency** | < 10ms globally | 50-200ms |
| **Freshness** | Eventually consistent | Always fresh |
| **Recommendation** | Latency-critical | Strong consistency |

### Trade-off 4: Real-time vs Batch Analytics

| Factor | Real-time | Batch |
|--------|-----------|-------|
| **Speed** | Immediate | Delayed (minutes/hours) |
| **Accuracy** | Sampling, estimates | Complete, precise |
| **Cost** | Higher | Lower |
| **Recommendation** | Monitoring | Statistical analysis |

---

## Trap Questions & Strong Answers

### Trap 1: "How do you ensure the same 10% of users always get the feature?"

**Trap:** Random selection per request gives different users each time.

**Strong Answer:**
"We use consistent hashing with SHA256. The hash input combines a salt, flag key, and user ID, producing a deterministic bucket (0-99999). The same user always lands in the same bucket, so they always see the same variation. This is critical for experiment integrity and user experience consistency."

### Trap 2: "What happens when you increase rollout from 10% to 20%?"

**Trap:** Re-randomizing would reassign the original 10%.

**Strong Answer:**
"With our bucketing approach, the original 10% of users (buckets 0-9999) stay in. We expand the range to include buckets 0-19999, adding new users without reshuffling existing ones. This 'additive rollout' is essential for gradual releases - users don't flip-flop between variations."

### Trap 3: "How do you handle a user in multiple experiments?"

**Trap:** Ignoring interference corrupts results.

**Strong Answer:**
"We use mutual exclusion groups. Experiments in the same group share traffic allocation - if a user is assigned to Experiment A, they're excluded from Experiment B in that group. We also use different salts per experiment so bucket assignments are independent across groups, maintaining statistical validity."

### Trap 4: "Your streaming service goes down. What happens to SDKs?"

**Trap:** Assuming SDKs stop working.

**Strong Answer:**
"SDKs are designed for resilience. When streaming fails:
1. They automatically fall back to polling every 30 seconds
2. Meanwhile, they continue serving flags from local cache
3. Even if polling fails, cached flags remain valid
4. Only if cache expires (configurable TTL) do we return defaults

The application never stops working - worst case is slightly stale flag values."

### Trap 5: "How do you detect sample ratio mismatch in experiments?"

**Trap:** Not knowing what SRM is or how to detect it.

**Strong Answer:**
"Sample Ratio Mismatch occurs when the actual split differs from expected (e.g., 52/48 instead of 50/50). We detect it by:
1. Tracking actual assignments per variation
2. Running chi-squared test against expected distribution
3. Alerting if ratio deviates beyond threshold (e.g., > 1.1 or < 0.9)

SRM indicates bucketing bugs, biased data collection, or filtering issues. We pause experiments when detected and investigate root cause."

### Trap 6: "Why not just use a simple database lookup for flag evaluation?"

**Trap:** Ignoring latency and availability implications.

**Strong Answer:**
"Database lookup adds 10-50ms latency per evaluation, multiplied by flags per request. At 1M evaluations/second, that's unsustainable database load.

Instead, we cache flags locally in SDKs and evaluate there (< 1ms). The database is only hit on SDK initialization and when flags change. This gives us:
- Sub-millisecond evaluation
- Offline capability
- No database bottleneck
- Better availability (SDKs work even when backend is down)"

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| **Random bucketing per request** | Users see feature flicker | Consistent hashing with user ID |
| **Polling-only design** | High latency updates, wasteful | SSE streaming with polling fallback |
| **Centralized evaluation** | Latency, availability bottleneck | Local SDK evaluation |
| **Ignoring offline mode** | SDK fails on network issues | Local cache with stale-while-revalidate |
| **Single-region streaming** | High latency for global users | Multi-region with edge evaluation |
| **Storing PII in targeting** | Compliance violation | Use hashed identifiers, segments |
| **No versioning on updates** | Lost updates on reconnection | Event versioning, catch-up protocol |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                FEATURE FLAG SYSTEM - INTERVIEW QUICK REF        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SCALE TARGETS             │  KEY ALGORITHMS                   │
│  • 10K flags               │  • Consistent hashing (SHA256)    │
│  • 1M eval/sec             │  • Bucket: hash % 100000          │
│  • < 1ms SDK eval          │  • Rule evaluation (priority)     │
│  • < 200ms propagation     │  • Delta sync (versioned)         │
│  • 99.99% availability     │                                   │
│                            │                                   │
├────────────────────────────┼───────────────────────────────────┤
│  ARCHITECTURE              │  FAILURE MODES                    │
│  • Control/Data plane      │  • Streaming → Polling fallback   │
│  • Local SDK evaluation    │  • API down → Cache-only          │
│  • SSE streaming           │  • Cache expired → Defaults       │
│  • Edge evaluation         │  • Network lost → Offline mode    │
│  • Consistent bucketing    │                                   │
│                            │                                   │
├────────────────────────────┼───────────────────────────────────┤
│  TRADE-OFFS                │  KEYWORDS TO MENTION              │
│  • Server vs Client eval   │  • Deterministic evaluation       │
│  • Push vs Pull updates    │  • Sticky bucketing               │
│  • Edge vs Origin          │  • Graceful degradation           │
│  • Real-time vs Batch      │  • Copy-on-write                  │
│                            │  • Mutual exclusion groups        │
│                            │  • Sample ratio mismatch          │
│                            │                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Follow-up Questions to Expect

| Question | Preparation |
|----------|-------------|
| "How would you implement flag dependencies?" | Prerequisite evaluation before main flag |
| "How do you handle schema changes in flag values?" | Versioned schemas, backward compatibility |
| "What about feature flags for ML models?" | A/B testing model versions, gradual rollout |
| "How do you prevent flag sprawl?" | Lifecycle management, archival policies |
| "What if targeting rules become too complex?" | Segments, rule compilation, performance alerts |

---

**← [Back to Index](./00-index.md)**
