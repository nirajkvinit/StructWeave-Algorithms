# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Points |
|------|-------|-------|------------|
| 0-5 min | **Clarify** | Ask questions, scope the problem | Define scale, confirm features |
| 5-15 min | **High-Level** | Core components, data flow | Swipe-match flow, geolocation |
| 15-30 min | **Deep Dive** | 1-2 critical components | Geosharding OR match detection |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios | Hot geoshards, race conditions |
| 40-45 min | **Wrap Up** | Summary, handle follow-ups | What you'd do differently |

---

## Phase-by-Phase Guide

### Phase 1: Clarification (0-5 min)

**Questions to Ask:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CLARIFICATION QUESTIONS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Scale:                                                                 │
│  • "How many users are we designing for? 10M? 100M?"                   │
│  • "What's the expected swipe rate? Thousands per second?"             │
│  • "Geographic distribution - global or single region?"                │
│                                                                         │
│  Features:                                                              │
│  • "Core features: profile, swipe, match, chat - anything else?"       │
│  • "Is real-time matching important, or can we batch?"                 │
│  • "Premium features in scope?"                                        │
│                                                                         │
│  Constraints:                                                           │
│  • "Latency requirements? Should swipes feel instant?"                 │
│  • "Consistency requirements for matches?"                             │
│  • "Any specific compliance needs (GDPR, location privacy)?"           │
│                                                                         │
│  If interviewer doesn't specify, state assumptions:                     │
│  "I'll assume 75M MAU, 1.6B daily swipes, global distribution,         │
│   with sub-100ms swipe latency and real-time match notifications."     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 2: High-Level Design (5-15 min)

**What to Cover:**

1. **Draw the architecture** (boxes and arrows)
   - Client → CDN → Load Balancer → API Gateway → Services → Databases

2. **Explain the core flows:**
   - Profile discovery flow
   - Swipe recording flow
   - Match detection flow (high-level)

3. **Database choices with justification:**
   - "MongoDB for flexible profile schema"
   - "Elasticsearch for geo-queries"
   - "Redis for match detection state"
   - "Kafka for async swipe processing"

**Sample Explanation:**

> "Let me walk through the high-level architecture. Users interact through mobile apps, which talk to our API through a CDN for static assets and a load balancer for API requests.
>
> The API gateway handles authentication and routes to our core services: Profile, Discovery, Swipe, Match, and Chat.
>
> For discovery, I'd use Elasticsearch with geographic sharding - I'll explain the geo approach in detail shortly.
>
> When a user swipes, we publish to Kafka for async processing. Match detection workers consume these events, check Redis for the reverse swipe, and create matches in MongoDB if found.
>
> Chat uses WebSockets for real-time messaging."

### Phase 3: Deep Dive (15-30 min)

**Choose ONE of these focus areas based on interviewer interest:**

#### Option A: Geosharded Recommendations

```
Key points to cover:
1. Why simple geohashing doesn't work at scale
   • Uneven cell sizes near poles
   • Load imbalance in dense cities

2. S2 Geometry solution
   • Hilbert curves preserve locality
   • Uniform cell distribution globally
   • "20x performance improvement"

3. Query routing
   • Convert user location to S2 cell
   • Compute covering cells for search radius
   • Route to specific Elasticsearch shards

4. Draw the data flow:
   User location → S2 Cell ID → Geoshard Router → ES Shards → Aggregate → Rank → Return
```

#### Option B: Match Detection

```
Key points to cover:
1. The core challenge: detecting mutual swipes in real-time
   • Both users swipe right → match
   • Can happen at same millisecond

2. Architecture:
   • Swipe → Kafka → Worker → Redis check → Create match

3. Race condition handling:
   • Distributed lock with canonical key ordering
   • Idempotent match creation

4. Draw the sequence:
   User A swipes → Kafka → Worker checks Redis(B→A) → MATCH! → Notify both
```

### Phase 4: Scale & Trade-offs (30-40 min)

**Bottlenecks to Discuss:**

| Bottleneck | Detection | Solution |
|------------|-----------|----------|
| Hot geoshards (NYC, LA) | QPS metrics per shard | Shard splitting, more replicas |
| Swipe velocity spikes | Kafka consumer lag | Auto-scale consumers |
| Match notification storms | Notification queue depth | Rate limiting, batching |

**Trade-offs to Articulate:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TRADE-OFF DISCUSSIONS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  S2 vs Geohash:                                                         │
│  • S2: Better uniformity, more complex math                            │
│  • Geohash: Simpler, has edge cases                                    │
│  • "Chose S2 for uniform load distribution at global scale"            │
│                                                                         │
│  Sync vs Async for Swipes:                                              │
│  • Sync: Simpler, immediate response                                   │
│  • Async: Higher throughput, slight delay                              │
│  • "Chose async via Kafka for throughput + decoupling"                 │
│                                                                         │
│  Real-time vs Batch Ranking:                                            │
│  • Real-time: Fresh results, higher compute                            │
│  • Batch: Pre-computed, may be stale                                   │
│  • "Hybrid: real-time with 5-min cache"                                │
│                                                                         │
│  Consistency for Matches:                                               │
│  • Strong: Never lose a match, higher latency                          │
│  • Eventual: Faster, might duplicate                                   │
│  • "Strong - losing a match is unacceptable"                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 5: Wrap Up (40-45 min)

**What to Cover:**

1. **Summarize key decisions:**
   > "To summarize: S2 geosharding for uniform load, Kafka for async swipe processing, Redis for fast match detection with distributed locking for race conditions."

2. **Mention what you'd do with more time:**
   > "With more time, I'd detail the ML ranking pipeline, discuss the photo moderation system, and go deeper on multi-region failover."

3. **Handle follow-up questions gracefully**

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just use geohashing?" | Show you understand limitations | "Geohashing has uneven cells near poles and in dense areas. S2 gives uniform distribution." |
| "Why not query all users, then filter by distance?" | Understand query optimization | "That doesn't scale. At 75M users, querying all would take seconds. Geosharding reduces the search space to relevant cells only." |
| "What if two users swipe right at the exact same time?" | Test race condition handling | "I use a distributed lock with sorted user IDs as the key. Only one worker creates the match; the other sees it already exists." |
| "What if Redis goes down during match detection?" | Test failure handling | "Match creation would fail. I'd queue the swipe for retry, and we have a fallback to check MongoDB directly for critical paths." |
| "Why Kafka? Why not just write to database directly?" | Understand async benefits | "Kafka decouples swipe recording from match detection, handles traffic spikes with buffering, and allows parallel processing across workers." |
| "How would you handle a celebrity with millions of fans swiping?" | Test hot spot handling | "I'd use a dedicated cache layer for celebrity profiles, rate limit visibility to spread load, and potentially shard by target user." |
| "What's the consistency model here?" | Test distributed systems knowledge | "Eventual for recommendations (stale is OK), Strong for matches and messages (cannot lose data)." |
| "How do you prevent fake profiles?" | Test security awareness | "Multi-factor: phone verification, photo verification with selfie matching, ML detection of stock photos, and behavioral analysis." |

---

## Common Mistakes to Avoid

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     COMMON MISTAKES                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ✗ Jumping to solution without clarifying requirements                 │
│    → Ask about scale, features, constraints first                       │
│                                                                         │
│  ✗ Using simple geohashing without acknowledging limitations           │
│    → Mention S2 or H3 for production-grade geo indexing                │
│                                                                         │
│  ✗ Ignoring race conditions in match detection                         │
│    → Always discuss concurrent swipe scenarios                         │
│                                                                         │
│  ✗ Not considering location privacy                                    │
│    → Mention that exact coordinates are sensitive; show city only      │
│                                                                         │
│  ✗ Designing for day-1 scale, not growth                               │
│    → Discuss how architecture handles 10x growth                       │
│                                                                         │
│  ✗ Forgetting about mobile constraints                                 │
│    → Consider bandwidth, battery, offline scenarios                    │
│                                                                         │
│  ✗ Single points of failure in architecture                            │
│    → Every component should have failover                              │
│                                                                         │
│  ✗ Not discussing trade-offs explicitly                                │
│    → For every decision, mention what you gave up                      │
│                                                                         │
│  ✗ Overcomplicating the initial design                                 │
│    → Start simple, add complexity when discussing scale                │
│                                                                         │
│  ✗ Forgetting to discuss monitoring/observability                      │
│    → At least mention: "We'd need metrics on swipe latency,            │
│      match rate, and alerts for consumer lag"                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Trade-offs Summary Table

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Geo Indexing** | Geohash (simple) | S2 Geometry (complex) | S2 - uniform distribution at scale |
| **Swipe Processing** | Sync (immediate) | Async/Kafka (buffered) | Async - throughput + decoupling |
| **Match Detection** | Poll database | Redis + events | Redis - sub-second detection |
| **Recommendations** | Pre-computed | Real-time | Hybrid - real-time with caching |
| **Consistency** | Eventual everywhere | Strong everywhere | Mixed - strong for matches, eventual for recs |
| **API Gateway** | Off-the-shelf | Custom (TAG) | Custom - for service mesh integration |
| **Real-time Chat** | Polling | WebSocket | WebSocket - lower latency, less bandwidth |
| **Photo Storage** | Database blobs | Object storage + CDN | CDN - edge caching, scalability |

---

## Capacity Estimation Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     QUICK CAPACITY MATH                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Given: 75M MAU, 35% DAU/MAU, 4 sessions/day, 15 swipes/session        │
│                                                                         │
│  DAU = 75M × 0.35 = 26.25M                                             │
│                                                                         │
│  Daily Swipes = 26.25M × 4 × 15 = 1.575B ≈ 1.6B                        │
│                                                                         │
│  Swipes/second = 1.6B ÷ 86,400 ≈ 18,500/sec                            │
│  Peak (3x) = 55,500/sec                                                 │
│                                                                         │
│  Match Rate ≈ 1.6% → 1.6B × 0.016 = 25.6M matches/day                  │
│  Matches/sec = 25.6M ÷ 86,400 ≈ 300/sec                                │
│                                                                         │
│  Storage:                                                               │
│  • Profiles: 75M × 8KB = 600GB                                         │
│  • Photos: 75M × 15MB = 1.1PB                                          │
│  • Swipes (90 days): 1.6B × 100B × 90 = 14.4TB                         │
│  • Matches (all time): 30B × 200B = 6TB                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Questions to Ask the Interviewer

```
Clarifying:
• "What's the target user base - millions or hundreds of millions?"
• "Is real-time matching a hard requirement?"
• "Any specific regions or is this global?"

Technical depth:
• "Would you like me to go deeper on the ranking algorithm?"
• "Should I discuss the ML aspects of recommendations?"
• "Want me to cover the photo moderation pipeline?"

Scope:
• "Is premium feature handling in scope?"
• "Should I discuss the chat system in detail?"
• "Do you want me to cover disaster recovery?"
```

---

## Meta-Commentary: What Makes Tinder Unique

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TINDER'S UNIQUE CHALLENGES                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. GEOGRAPHIC CONSTRAINT                                               │
│     Unlike social networks where you can follow anyone globally,        │
│     Tinder must efficiently query by proximity. This makes              │
│     geosharding a first-class concern, not an optimization.             │
│                                                                         │
│  2. RECIPROCAL MATCHING                                                 │
│     Unlike content recommendations (Netflix, TikTok) where you          │
│     optimize for single-user engagement, Tinder must satisfy            │
│     BOTH users simultaneously. This requires different ML approaches.   │
│                                                                         │
│  3. REAL-TIME MUTUAL DETECTION                                          │
│     The "It's a Match!" moment is the core value proposition.           │
│     Detecting mutual swipes in real-time at 18K swipes/sec              │
│     with race condition safety is a unique challenge.                   │
│                                                                         │
│  4. PRIVACY-SENSITIVE LOCATION DATA                                     │
│     Unlike ride-sharing (exact pickup needed), Tinder must              │
│     balance discovery utility with location privacy.                    │
│                                                                         │
│  5. FAIRNESS IN RECOMMENDATIONS                                         │
│     Everyone should get visibility, not just "attractive" users.        │
│     This requires careful exploration/exploitation balancing.           │
│                                                                         │
│  Highlight these in your interview to show deep understanding.          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TINDER INTERVIEW CHEAT SHEET                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SCALE: 75M MAU | 26M DAU | 1.6B swipes/day | 26M matches/day          │
│                                                                         │
│  KEY COMPONENTS:                                                        │
│  • S2 Geosharding (not geohash) - 20x performance                      │
│  • Kafka + Redis for match detection                                   │
│  • TinVec embeddings for recommendations                               │
│  • WebSocket (Scarlet) for real-time chat                              │
│                                                                         │
│  CRITICAL FLOWS:                                                        │
│  • Swipe → Kafka → Worker → Redis check → Match?                       │
│  • Discovery → S2 cells → ES query → ML rank → Return                  │
│                                                                         │
│  TRADE-OFFS:                                                            │
│  • S2 vs Geohash: S2 for uniformity                                    │
│  • Sync vs Async: Async for throughput                                 │
│  • Strong vs Eventual: Strong for matches                              │
│                                                                         │
│  BOTTLENECKS:                                                           │
│  • Hot geoshards → Split, replicate                                    │
│  • Consumer lag → Auto-scale                                           │
│  • Notification storms → Rate limit                                    │
│                                                                         │
│  REMEMBER:                                                              │
│  ✓ Ask clarifying questions first                                      │
│  ✓ Draw diagrams as you explain                                        │
│  ✓ Mention race conditions proactively                                 │
│  ✓ Discuss trade-offs explicitly                                       │
│  ✓ Consider privacy for location data                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Related Interview Questions

| Related Problem | Key Difference | Transferable Concepts |
|-----------------|----------------|----------------------|
| Design WhatsApp | 1:1 chat focus | WebSocket, message delivery |
| Design Facebook | Social graph, not geo | ML recommendations |
| Design Uber | Location tracking | Geospatial indexing |
| Design Netflix | Video streaming | Recommendation engine |
| Design Twitter | Public posts | Fan-out patterns |

---

*[← Back to Index](./00-index.md)*
