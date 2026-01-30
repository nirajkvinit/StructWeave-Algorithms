# Interview Guide

[← Back to Observability](./07-observability.md) | [Back to Index →](./00-index.md)

---

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | What to Cover |
|------|-------|-------|---------------|
| **0-5 min** | Clarify | Scope the problem | Ask about scale, features, constraints |
| **5-15 min** | High-Level | Architecture overview | Core components, data flow |
| **15-30 min** | Deep Dive | FYP recommendation system | Monolith, 50ms budget, algorithms |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failure scenarios | Prefetching, viral content, fallbacks |
| **40-45 min** | Wrap Up | Summary, Q&A | Reiterate key decisions, handle follow-ups |

---

## Phase-by-Phase Guide

### Phase 1: Clarification (0-5 min)

**Questions to Ask:**

1. "What's the expected scale? Daily active users, videos uploaded?"
2. "Is this focused on the FYP recommendation system or the full platform?"
3. "What latency targets should we design for?"
4. "Should we include live streaming and commerce features?"
5. "Any specific geographic or compliance requirements?"

**Expected Answers:**
- Scale: 1B+ DAU, 30M+ uploads/day
- Focus: Usually FYP is the main topic, but be ready for full system
- Latency: FYP inference <50ms, video start <150ms
- Features: Start with core (upload, FYP, interactions), add live/commerce if time
- Compliance: Mention regional data residency as an advanced topic

### Phase 2: High-Level Design (5-15 min)

**Key Points to Cover:**

1. **Interest Graph vs Social Graph**
   - "Unlike Instagram, TikTok uses an interest graph, not a social graph"
   - "Content is discovered based on predicted interests, not who you follow"
   - "This means every FYP request requires real-time ML inference"

2. **Core Components**
   - Client apps (iOS, Android, Web)
   - Multi-CDN for video delivery
   - API Gateway with rate limiting
   - Core services: Video, FYP, User, Interaction, Live
   - ML services: Recommendation Engine (Monolith), Moderation
   - Storage: Cassandra (timelines), PostgreSQL (metadata), Blob (videos)

3. **Data Flow**
   - Upload: Client → API → Transcode → CDN → Index
   - FYP: Client → API → ML Retrieval → ML Ranking → Prefetch hints

**Diagram to Draw:**

```
Client → CDN → API Gateway → [FYP Service → ML Engine → Feature Store]
                           → [Video Service → Transcoding → Blob Storage]
                           → [Database Cluster]
```

### Phase 3: Deep Dive - FYP Recommendation (15-30 min)

**This is where you differentiate yourself.** Spend most of your time here.

**Key Points:**

1. **50ms Latency Budget**
   - "The entire FYP pipeline must complete in 50ms p99"
   - "This is the key constraint that drives all architectural decisions"

2. **Two-Stage Pipeline**
   ```
   Stage 1: Candidate Retrieval (<10ms)
   - Two-Tower model (user embedding + item embedding)
   - ANN search to find ~5,000 candidates from millions
   - Merge with trending + explore pools

   Stage 2: Ranking (<30ms)
   - DLRM model scores all candidates
   - Multi-task predictions: P(watch), P(complete), P(like), P(share)
   - Final score = weighted combination

   Stage 3: Re-ranking (<10ms)
   - Diversity constraints (no same creator consecutively)
   - Exploration injection (30-50% explore content)
   - Quality filtering
   ```

3. **Monolith Architecture**
   - "TikTok uses a system called Monolith, published at RecSys 2022"
   - "Key innovation: Collisionless embedding table using Cuckoo HashMap"
   - "Traditional hash tables have collisions that degrade embedding quality"
   - "Online training allows model to adapt in real-time"

4. **Cold Start Handling**
   - "New users can be personalized within ~8 video interactions"
   - "Use content-based signals initially, transition to collaborative"
   - "New creators can go viral even with zero followers"

### Phase 4: Scale & Trade-offs (30-40 min)

**Bottlenecks to Discuss:**

1. **ML Inference at Scale**
   - Problem: 150K+ FYP requests/second, each needs ML inference
   - Solution: GPU batching, model quantization, caching

2. **Aggressive Prefetching**
   - Problem: Seamless swipe requires buffering 3-5 videos ahead
   - Trade-off: 30-40% bandwidth waste vs zero buffering
   - Solution: DRL-based adaptive prefetch policy

3. **Viral Content**
   - Problem: Single video gets millions of concurrent requests
   - Solution: Multi-CDN, request coalescing, pre-warming

**Failure Scenarios:**

1. "What if the ML service fails?"
   - Fallback to cached recommendations (up to 1 hour old)
   - Fallback to trending + explore content
   - Show degraded UX banner

2. "What if a region goes down?"
   - Multi-region active-active
   - DNS failover within 60 seconds
   - Accept higher latency for affected users

### Phase 5: Wrap Up (40-45 min)

**Summary Points:**
- "TikTok's unique challenge is interest-based discovery requiring real-time ML"
- "The 50ms latency budget drives all architectural decisions"
- "Monolith's collisionless embeddings enable quality at scale"
- "Aggressive prefetching trades bandwidth for seamless UX"

**Be Ready For:**
- "How would you handle 10x scale?"
- "What would you monitor to ensure health?"
- "How does this compare to Instagram/YouTube?"

---

## Meta-Commentary

### What Makes TikTok Unique

1. **Interest Graph, Not Social Graph**
   - Instagram: "Show me what my friends posted"
   - TikTok: "Show me what I'll enjoy, regardless of who made it"
   - This fundamental difference drives the entire architecture

2. **50ms Inference Budget**
   - Most recommendation systems have 100-200ms budget
   - TikTok's strict constraint enables the addictive swipe experience
   - Forces engineering excellence in ML infrastructure

3. **Creator Democratization**
   - Follower count doesn't determine reach
   - Any video can go viral based on content quality
   - Fundamentally different incentive structure for creators

4. **Aggressive Prefetching**
   - Users expect instant playback on swipe
   - TikTok accepts significant bandwidth waste for UX
   - Complex optimization problem (bandwidth vs smoothness)

### Where to Spend Most Time

| Topic | Time Allocation | Why |
|-------|-----------------|-----|
| **FYP Recommendation** | 40% | Core differentiator, most technical depth |
| **System Architecture** | 25% | Foundation, shows breadth |
| **Prefetching** | 15% | Unique challenge, shows UX thinking |
| **Scale & Reliability** | 15% | Expected, but not the main focus |
| **Other Features** | 5% | Mention briefly (live, commerce) |

### What Interviewers Look For

1. **Understanding of Constraints**: "Why can't we just cache recommendations?"
2. **ML Infrastructure Knowledge**: Two-Tower, DLRM, feature stores
3. **Trade-off Articulation**: Can you explain pros/cons clearly?
4. **Scale Intuition**: Can you estimate capacity needs?
5. **Failure Thinking**: What happens when things break?

---

## Trade-offs Discussion

### Trade-off 1: Interest Graph vs Social Graph

| Aspect | Interest Graph (TikTok) | Social Graph (Instagram) |
|--------|-------------------------|--------------------------|
| **Pros** | Content quality matters, viral potential, personalization | Relationship context, lower ML cost, predictable |
| **Cons** | High ML infrastructure cost, privacy concerns | Echo chamber of friends, harder for new creators |
| **Recommendation** | TikTok's choice enables unique value proposition |

### Trade-off 2: Real-time vs Batch Recommendations

| Aspect | Real-time (TikTok) | Batch (Pre-computed) |
|--------|--------------------|-----------------------|
| **Pros** | Fresh, personalized to current context | Lower latency, simpler infrastructure |
| **Cons** | High infrastructure cost, latency pressure | Stale, misses recent interests |
| **Recommendation** | Real-time necessary for TikTok's UX, but with caching layer |

### Trade-off 3: Prefetch Aggressiveness

| Aspect | Aggressive (TikTok) | Conservative |
|--------|---------------------|--------------|
| **Pros** | Zero buffering, best UX | Lower bandwidth cost, faster initial load |
| **Cons** | 30-40% bandwidth waste | Buffering between videos |
| **Recommendation** | Aggressive wins for engagement-driven platform |

### Trade-off 4: Personalization vs Diversity

| Aspect | High Personalization | High Diversity |
|--------|---------------------|----------------|
| **Pros** | Maximum engagement, user satisfaction | Avoids filter bubbles, content discovery |
| **Cons** | Filter bubbles, repetitive content | Lower immediate engagement |
| **Recommendation** | TikTok uses 30-50% exploration injection as balance |

---

## Trap Questions & Best Answers

### Trap 1: "Why not just use collaborative filtering?"

**What They're Testing:** Understanding of cold start problem and interest graph

**Best Answer:**
> "Collaborative filtering works well when you have user-item interaction history, but it struggles with cold start—both new users and new content. TikTok needs to surface new creators with zero followers, which collaborative filtering can't handle. Instead, TikTok uses a hybrid approach: content-based signals for cold start, transitioning to collaborative as data accumulates. The Two-Tower architecture enables this by embedding both users and videos in the same latent space."

### Trap 2: "How do you prevent filter bubbles?"

**What They're Testing:** Understanding of exploration vs exploitation

**Best Answer:**
> "TikTok addresses filter bubbles through explicit exploration injection. Research shows they use 30-50% exploration content in the FYP—videos that don't match your established interests but might expand them. They also enforce diversity constraints: no consecutive videos from the same creator or using the same sound. Additionally, the 'Not Interested' feature allows users to explicitly break out of patterns they don't want."

### Trap 3: "What if the recommendation service fails?"

**What They're Testing:** Failure thinking and graceful degradation

**Best Answer:**
> "We implement multi-level fallbacks. First, we cache recent recommendations in Redis with a 1-hour TTL—stale recommendations are better than no recommendations. Second, if cache misses, we fall back to a simpler retrieval: trending videos plus content from followed creators. Third, if all else fails, we serve globally trending content. We also use circuit breakers to prevent cascading failures and return a 'limited personalization' indicator to the client so users understand the degraded experience."

### Trap 4: "How would you handle 100x scale?"

**What They're Testing:** Forward thinking beyond current architecture

**Best Answer:**
> "At 100x scale—say 100B daily video views—I'd focus on three areas:
> 1. **ML Efficiency**: Model distillation to reduce inference cost, more aggressive caching of embedding lookups, batch inference optimization.
> 2. **Data Architecture**: Further sharding of the feature store, potentially edge-based inference for simpler ranking.
> 3. **CDN Strategy**: More aggressive edge caching, potentially P2P delivery for very viral content.
> The current architecture is designed for 10x headroom, but 100x would require fundamental changes to where ML runs."

### Trap 5: "Why not run ML on the client device?"

**What They're Testing:** Understanding of trade-offs between edge and cloud ML

**Best Answer:**
> "On-device ML is appealing for latency and privacy, but TikTok's recommendation challenge is fundamentally about matching users to a constantly changing pool of millions of videos. That matching requires centralized knowledge of all content. We can run some ML on-device—like effects processing or simple prefetch predictions—but the core ranking needs cloud infrastructure. The 50ms latency target is achievable with well-optimized cloud ML, and the personalization quality from centralized data is worth the round-trip."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Do Instead |
|---------|----------------|-------------------|
| **Treating TikTok like Instagram** | Different core model (interest vs social graph) | Emphasize real-time ML from the start |
| **Ignoring the 50ms constraint** | This is THE key technical challenge | Design around this budget explicitly |
| **Over-engineering day 1** | Start with 10x scale, not 1000x | "Design for 10x, architect for 100x" |
| **Forgetting prefetching** | Critical for the swipe UX | Discuss bandwidth vs UX trade-off |
| **No failure scenarios** | Shows incomplete thinking | Always discuss what happens when things break |
| **Not discussing trade-offs** | Missing the "why" of decisions | Every decision should have explicit trade-off |
| **Diving too deep too early** | Lose the big picture | Establish architecture before details |

---

## Questions to Ask the Interviewer

1. "What scale should I target? Global TikTok or a regional version?"
2. "Should I focus on the FYP system or the full platform including live streaming?"
3. "Any specific features you'd like me to prioritize?"
4. "What consistency guarantees are most important?"
5. "Should I consider multi-region deployment and data residency?"

---

## Quick Reference: Interview Talking Points

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TIKTOK INTERVIEW CHEAT SHEET                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  KEY DIFFERENTIATOR: Interest Graph, not Social Graph                   │
│  CRITICAL CONSTRAINT: 50ms FYP inference budget                        │
│                                                                         │
│  SCALE NUMBERS (memorize):                                              │
│  • 1.9B MAU, 1.12B DAU                                                 │
│  • 34M uploads/day (~400/sec)                                          │
│  • 150K FYP requests/sec at peak                                       │
│  • 95 min average session                                              │
│                                                                         │
│  FYP PIPELINE (50ms total):                                            │
│  • Retrieval: Two-Tower, ANN → 5K candidates (<10ms)                   │
│  • Ranking: DLRM, multi-task → scored list (<30ms)                     │
│  • Re-rank: Diversity, exploration (<10ms)                             │
│                                                                         │
│  MONOLITH KEY POINTS:                                                   │
│  • Collisionless embedding (Cuckoo HashMap)                            │
│  • Online training (real-time adaptation)                              │
│  • Published at RecSys 2022                                            │
│                                                                         │
│  PREFETCH STRATEGY:                                                     │
│  • Buffer 3-5 videos ahead                                             │
│  • 30-40% bandwidth waste accepted                                     │
│  • DRL-based adaptive policy                                           │
│                                                                         │
│  RANKING SIGNALS (priority):                                            │
│  1. Watch time  2. Completion  3. Rewatch  4. Shares  5. Likes         │
│                                                                         │
│  FALLBACK CHAIN:                                                        │
│  ML → Cached recommendations → Trending → Global trending              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Related Interview Topics

If TikTok comes up, be prepared to discuss:

| Topic | Connection |
|-------|------------|
| **Recommendation Systems** | Core of FYP architecture |
| **Feature Stores** | Critical for 50ms budget |
| **CDN Design** | Video delivery at scale |
| **Real-time ML** | Monolith architecture |
| **Content Moderation** | AI + human at scale |
| **Live Streaming** | WebRTC, gift processing |

---

*[← Back to Observability](./07-observability.md) | [Back to Index →](./00-index.md)*
