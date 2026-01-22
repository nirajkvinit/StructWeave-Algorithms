# Interview Guide

[← Back to Index](./00-index.md) | [Previous: Observability](./07-observability.md)

---

## Interview Pacing (45-min format)

| Time | Phase | Focus | Key Activities |
|------|-------|-------|----------------|
| 0-5 min | **Clarify** | Understand requirements | Ask about scale, latency needs, edge vs origin |
| 5-15 min | **High-Level** | Architecture overview | Draw edge layer, sync mechanism, fallback layers |
| 15-30 min | **Deep Dive** | Critical components | Push-based sync OR edge evaluation OR consistency |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failures | Discuss staleness, memory limits, PoP failures |
| 40-45 min | **Wrap Up** | Summary, questions | Highlight key decisions, handle follow-ups |

---

## Clarifying Questions to Ask

### Scale Questions

| Question | Why It Matters |
|----------|----------------|
| "What's the expected evaluation volume per second?" | Determines if edge evaluation is necessary |
| "How many edge locations are we targeting?" | Affects sync architecture complexity |
| "What's the flag update frequency?" | Impacts push vs poll decision |
| "How many flags per organization?" | Memory constraints at edge |

### Latency Questions

| Question | Why It Matters |
|----------|----------------|
| "What's the acceptable evaluation latency?" | <5ms requires edge; <50ms allows origin |
| "What's the acceptable propagation delay?" | Streaming vs polling decision |
| "Is sub-second propagation critical?" | Determines sync architecture |

### Consistency Questions

| Question | Why It Matters |
|----------|----------------|
| "Can users see briefly stale flag values?" | Eventual consistency acceptable? |
| "Are there critical flags that need faster propagation?" | Tiered staleness budgets |
| "What happens if edge can't reach origin?" | Fallback strategy |

---

## How to Approach This Problem

### Step 1: Establish Why Edge Evaluation

Start by explaining why edge-native is different from traditional feature flags:

```
"Traditional feature flags evaluate at the origin server, adding
10-100ms network latency. For edge use cases like CDN routing,
middleware personalization, or SSR, we need sub-5ms evaluation.

Edge-native means:
1. Flag configs pre-positioned at 100+ edge PoPs
2. Evaluation happens locally in memory
3. No network hop for flag decisions"
```

### Step 2: Draw the High-Level Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ Control     │ ───> │ Sync Layer  │ ───> │ Edge Layer  │
│ Plane       │      │ (Push/SSE)  │      │ (200 PoPs)  │
│             │      │             │      │             │
│ Flag DB     │      │ Streaming   │      │ In-Memory   │
│ API         │      │ Servers     │      │ Flag Store  │
└─────────────┘      └─────────────┘      └─────────────┘
     │                                           │
     │         ← Async Propagation →             │
     │                                           │
     └───────────── Source of Truth ─────────────┘
```

### Step 3: Focus on the Unique Challenges

Spend most time on what makes edge-native special:

1. **Push-based distribution** (not pull)
2. **Sub-second global propagation** (streaming)
3. **Multi-layer fallback** (resilience)
4. **Memory constraints at edge** (optimization)

---

## Key Trade-offs to Discuss

### Trade-off 1: Push vs Pull Distribution

| Aspect | Push (Recommended) | Pull |
|--------|-------------------|------|
| **First request latency** | <5ms (pre-positioned) | Cold start penalty |
| **Bandwidth** | Proportional to changes | Proportional to requests |
| **Complexity** | Higher (streaming infra) | Lower |
| **Staleness** | <1 second | Cache TTL dependent |

**Interview Answer:**
> "I'd choose push-based distribution because it eliminates cold start latency. With pull-based, the first request to each edge PoP would need to fetch flags from origin, adding 50-200ms. With push, flag data is already at the edge before any user request arrives."

### Trade-off 2: SSE Streaming vs Polling

| Aspect | SSE Streaming (Recommended) | Polling |
|--------|---------------------------|---------|
| **Propagation latency** | <1 second | 10-60 seconds |
| **Connection overhead** | Persistent connections | Repeated connections |
| **Reliability** | Requires reconnection logic | Simpler failure handling |
| **Bandwidth** | Only changes sent | Full payload each poll |

**Interview Answer:**
> "Streaming via SSE gives us sub-second propagation. If we polled every 10 seconds, a user could see the wrong flag value for up to 10 seconds after a change. For feature flags, this staleness is often acceptable, but for kill switches or critical experiments, we need faster propagation."

### Trade-off 3: Consistency Model

| Aspect | Eventual (Recommended) | Strong |
|--------|----------------------|--------|
| **Latency** | <5ms (local read) | 50-200ms (origin read) |
| **Availability** | High (cached) | Lower (origin dependent) |
| **Staleness** | <1 second typically | None |
| **Complexity** | Lower | Higher (consensus) |

**Interview Answer:**
> "Feature flags are a perfect fit for eventual consistency. A user seeing the old flag value for 500ms after a change is acceptable. The alternative—reading from origin for every evaluation—would add 50-200ms latency and defeat the purpose of edge evaluation."

### Trade-off 4: Memory vs Completeness

| Aspect | All Flags in Memory | Lazy Loading |
|--------|--------------------|--------------|
| **First evaluation** | Instant | May need fetch |
| **Memory usage** | Higher | Lower |
| **Complexity** | Simple | LRU eviction logic |

**Interview Answer:**
> "At 500 bytes per flag and 5,000 flags, that's only 2.5MB—easily fits in edge worker memory. I'd load all flags for simplicity. If we had 100K flags, I'd implement tiered storage with hot flags in memory and cold flags in edge KV."

---

## Trap Questions & How to Handle

### Trap 1: "Why not just use a CDN cache with TTL?"

**What interviewer wants:** Understanding of push vs pull, cold start problem.

**Answer:**
> "A CDN cache with TTL has two problems:
> 1. **Cold start:** First request to each PoP must wait for origin fetch
> 2. **Staleness:** Changes take TTL duration to propagate
>
> Push-based distribution solves both—data is pre-positioned before any request, and updates propagate in <1 second via streaming."

### Trap 2: "What if the streaming connection goes down?"

**What interviewer wants:** Resilience thinking, graceful degradation.

**Answer:**
> "Multi-layer fallback:
> 1. Edge continues serving from in-memory cache (stale but available)
> 2. Fallback to polling from edge KV store (10-second intervals)
> 3. If KV unavailable, serve from memory indefinitely
> 4. Ultimate fallback: hardcoded defaults in code
>
> Availability is prioritized over freshness. A user seeing a slightly stale flag is better than no flag evaluation."

### Trap 3: "How do you handle a flag that changes every second?"

**What interviewer wants:** Understanding system limits, when edge-native isn't suitable.

**Answer:**
> "Flags changing every second would overwhelm the sync layer. Edge-native is designed for flags that change minutes to hours apart, not seconds.
>
> For high-frequency changes, I'd recommend:
> 1. Use a different mechanism (real-time config, not feature flags)
> 2. Or evaluate at origin where real-time data is available
>
> Feature flags are for release control, not real-time data."

### Trap 4: "A user sees different flag values on different requests. Why?"

**What interviewer wants:** Understanding consistency, bucketing.

**Answer:**
> "Several possible causes:
> 1. **User hitting different PoPs:** Brief inconsistency during propagation (expected, <1 second)
> 2. **Targeting key changed:** If user_id or bucketing attribute changed
> 3. **Bug in consistent hashing:** Same input should always give same bucket
>
> I'd add debugging: return flag version and PoP ID in response headers. If versions differ across PoPs, it's propagation delay. If same version but different result, investigate targeting."

### Trap 5: "How do you know if a PoP is serving stale data?"

**What interviewer wants:** Observability thinking.

**Answer:**
> "Metrics and alerting:
> 1. **Version tracking:** Each PoP reports current flag version. Alert if versions diverge for >10 seconds
> 2. **Sync lag metric:** Time since last successful sync. Alert if >5 seconds
> 3. **Propagation tracking:** Measure time from flag change to all PoPs confirming receipt
>
> Dashboard shows version distribution across PoPs—should see single version in healthy state."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Correct Approach |
|---------|---------------|------------------|
| Fetching from origin on every evaluation | Defeats purpose of edge (adds 50-200ms) | Pre-position data at edge |
| Ignoring cold start | First user to each PoP gets slow experience | Push data before requests arrive |
| Strong consistency at edge | Adds latency, defeats edge benefit | Accept eventual consistency |
| Polling for updates | 10-60 second staleness | Use streaming (SSE) for <1 second |
| Single layer fallback | PoP failure = no flags | Multi-layer: memory → KV → origin → defaults |
| Not considering memory limits | Edge workers have 128MB limit | Design for efficient storage |

---

## What Makes This System Unique

### Differentiators from Traditional Feature Flags

1. **Evaluation location:** Edge PoPs vs origin servers
2. **Latency target:** <5ms vs <50ms acceptable
3. **Distribution model:** Push-based vs pull-on-demand
4. **Consistency:** Eventual (acceptable) vs strong (overkill)
5. **Availability mode:** Serve stale vs fail closed

### Key Innovation Points

1. **Push CDN model:** Flags pre-positioned before any request
2. **Hierarchical fan-out:** Origin → Regional hubs → PoPs
3. **Multi-layer resilience:** Memory → KV → Origin → Defaults
4. **Bootstrap pattern:** Embed flags in initial HTML response

---

## 45-Minute Interview Script

### Minutes 0-5: Clarify

> "Before I design, let me clarify:
> - What's the latency requirement? (Looking for <10ms → confirms edge-native)
> - How many edge locations? (100-300 typical)
> - Flag update frequency? (Minutes/hours, not seconds)
> - Any critical flags needing faster propagation?
> - What happens if edge can't reach origin?"

### Minutes 5-15: High-Level Design

> "Given sub-10ms latency requirement, we need edge evaluation. Here's my architecture..."

*Draw the three-layer diagram:*
- Control plane (flag management, source of truth)
- Sync layer (streaming service, push-based)
- Edge layer (200+ PoPs, in-memory stores)

*Explain key flow:*
> "When admin updates a flag, it's persisted at origin, then pushed via SSE to all edge PoPs within 1 second. User requests hit nearest PoP, evaluate locally in memory, <5ms latency."

### Minutes 15-30: Deep Dive

*Pick one to go deep on:*

**Option A: Push-based Sync**
> "Let me explain how we achieve <1 second global propagation..."
> - SSE streaming vs polling trade-off
> - Hierarchical fan-out (origin → hubs → PoPs)
> - Version tracking and reconciliation
> - Reconnection with last-event-id

**Option B: Edge Evaluation Engine**
> "Let me explain how evaluation works at the edge..."
> - Rule matching algorithm (O(R×C) complexity)
> - Consistent hashing for bucketing
> - Segment caching strategy
> - Memory management under 128MB limit

**Option C: Fallback/Resilience**
> "Let me explain what happens when things fail..."
> - Multi-layer fallback hierarchy
> - Graceful degradation levels
> - Bootstrap pattern for cold start
> - Circuit breaker for origin calls

### Minutes 30-40: Scale & Trade-offs

> "Let's discuss bottlenecks and trade-offs..."

- **Streaming connections:** Solved with hierarchical fan-out
- **Memory at edge:** 5K flags × 500B = 2.5MB (fits easily)
- **Hot flags:** Pre-warm, extended cache TTL
- **Consistency:** Eventual is acceptable, <1 second staleness

*Handle interviewer challenges:*
> "What if streaming fails?" → Multi-layer fallback
> "What about 100K flags?" → Tiered storage, lazy loading

### Minutes 40-45: Wrap Up

> "To summarize, the key design decisions:
> 1. Push-based distribution eliminates cold start
> 2. SSE streaming achieves <1 second propagation
> 3. Eventual consistency is acceptable for feature flags
> 4. Multi-layer fallback ensures availability
>
> The main trade-off is complexity vs latency—this is more complex than traditional polling, but necessary for sub-5ms evaluation."

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│              EDGE-NATIVE FEATURE FLAGS - INTERVIEW              │
├─────────────────────────────────────────────────────────────────┤
│  MUST MENTION                                                   │
│  • Push-based distribution (not pull)                           │
│  • SSE streaming for <1 second propagation                      │
│  • In-memory evaluation at edge (<5ms)                          │
│  • Multi-layer fallback (memory → KV → origin → defaults)       │
│  • Eventual consistency is acceptable                           │
├─────────────────────────────────────────────────────────────────┤
│  KEY NUMBERS                                                    │
│  • Evaluation latency: <5ms P50, <15ms P99                      │
│  • Propagation: <1 second globally                              │
│  • Edge PoPs: 100-300                                           │
│  • Memory per PoP: <50MB for 10K flags                          │
│  • Staleness budget: <1 second typical                          │
├─────────────────────────────────────────────────────────────────┤
│  AVOID SAYING                                                   │
│  • "Poll origin for every evaluation" (defeats edge)            │
│  • "Strong consistency required" (adds latency)                 │
│  • "Single fallback layer" (not resilient)                      │
│  • "Flags update every second" (not the use case)               │
├─────────────────────────────────────────────────────────────────┤
│  REAL-WORLD REFERENCES                                          │
│  • LaunchDarkly Edge - 25ms bootstrap                           │
│  • Vercel Edge Config - <5ms reads                              │
│  • Statsig Edge SDK - sub-1ms evaluation                        │
│  • Unleash Enterprise Edge - millisecond streaming              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Interview Topics

If this topic comes up in combination with others:

| Related Topic | Connection Point |
|---------------|-----------------|
| **CDN Design** | Edge PoP infrastructure, anycast routing |
| **Feature Flag Management (2.7)** | Control plane, SDK design, experimentation |
| **Edge Computing Platform (2.8)** | V8 isolates, worker architecture |
| **Real-time Systems** | SSE streaming, pub/sub patterns |
| **Distributed Caching** | Multi-layer cache, consistency |

---

**[← Back to Index](./00-index.md)**
