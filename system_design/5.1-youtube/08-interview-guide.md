# YouTube: Interview Guide

[← Back to Index](./00-index.md) | [Previous: Observability](./07-observability.md)

---

## Interview Pacing (45-min Format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify Requirements | Scope, scale, constraints | Ask about DAU, read/write ratio, latency targets |
| **5-15 min** | High-Level Design | Core components, data flow | Draw upload → transcode → CDN → playback |
| **15-30 min** | Deep Dive | 1-2 critical components | Transcoding OR view counting OR recommendations |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failures | CDN scaling, database sharding, consistency |
| **40-45 min** | Wrap Up | Summary, questions | Highlight key decisions, ask interviewer follow-ups |

---

## Phase-by-Phase Guide

### Phase 1: Clarify Requirements (0-5 min)

**Questions to Ask:**

```
FUNCTIONAL SCOPE:
1. "Are we designing the full YouTube or a specific feature?"
   Expected: Full platform - upload, playback, search, recommendations

2. "Should we include live streaming?"
   Expected: Yes, but can simplify (< 5s latency)

3. "Are we including monetization (ads)?"
   Expected: Mention it, but not deep dive

4. "Comments and engagement features?"
   Expected: Yes, at high level

SCALE REQUIREMENTS:
5. "What's our target scale?"
   - MAU: 2+ billion
   - DAU: 100+ million
   - Concurrent: 50+ million

6. "Upload volume?"
   - 500+ hours/minute uploaded

7. "Playback volume?"
   - 1 billion hours watched/day

LATENCY REQUIREMENTS:
8. "What are our latency targets?"
   - Playback start: < 200ms
   - Search: < 100ms
   - Recommendations: < 50ms
```

**Clarification Summary:**

```
"Let me summarize the requirements:
- Build a video platform at YouTube scale
- 2.5B MAU, 500+ hours uploaded/minute
- Core features: upload, transcode, playback, search, recommendations
- Key SLAs: 99.99% availability, <200ms playback start
- Include comments and basic monetization

Does this match your expectations?"
```

### Phase 2: High-Level Design (5-15 min)

**Core Components to Draw:**

```
CLIENT → CDN → API GATEWAY → SERVICES → STORAGE

Key Services:
1. Upload Service
2. Transcoding Pipeline
3. Playback Service
4. Search Service
5. Recommendation Service
6. Comments Service

Key Storage:
1. Blob Storage (video files)
2. Vitess (metadata)
3. Bigtable (analytics, history)
4. Spanner (rights, billing)
```

**Data Flow Explanation:**

```
UPLOAD FLOW:
"When a creator uploads:
1. Client uploads to Upload Service via resumable upload
2. Raw video stored in blob storage
3. Transcode job queued
4. Workers encode to H.264, VP9, AV1 in parallel
5. Multiple resolutions per codec (144p to 4K)
6. Content ID matching runs async
7. Video marked ready, available for playback"

PLAYBACK FLOW:
"When a viewer watches:
1. Request hits GeoDNS, routes to nearest CDN edge
2. Edge checks cache for video segments
3. If miss, request goes to origin via shield
4. Client downloads manifest (DASH/HLS)
5. ABR algorithm selects quality based on bandwidth
6. Segments streamed, view event logged"

RECOMMENDATION FLOW:
"When showing home page:
1. Fetch user features from feature store
2. Candidate generation: subscriptions, watch history, trending
3. Ranking model scores candidates (50ms budget)
4. Post-filtering: diversity, safety, freshness
5. Return top 50 personalized videos"
```

### Phase 3: Deep Dive (15-30 min)

**Option A: Transcoding Pipeline**

```
KEY POINTS TO COVER:

1. SCALE CHALLENGE
   "500 hours/minute = ~720K videos/day
   Each video → 24+ variants (3 codecs × 8 resolutions)
   That's 17M+ encoding jobs/day"

2. PARALLEL PROCESSING
   "Use message queue for job distribution
   Embarrassingly parallel - each segment independent
   Horizontal scaling of stateless workers"

3. CODEC STRATEGY
   "H.264 first (fastest, universal)
   VP9 for HD content (30% smaller)
   AV1 for popular videos only (10x slower to encode)"

4. CUSTOM HARDWARE
   "Google uses custom ASICs for AV1
   10x faster than CPU encoding
   Essential for cost efficiency at scale"

5. FAILURE HANDLING
   "Checkpoint every segment
   Retry failed segments only
   Dead letter queue for persistent failures
   Notify creator of permanent failures"
```

**Option B: View Counter System**

```
KEY POINTS TO COVER:

1. SCALE CHALLENGE
   "5 billion views/day = 60K views/second
   Accurate counts matter for monetization
   But 10-second lag is acceptable"

2. EVENTUAL CONSISTENCY
   "Use distributed counters (G-Counter CRDT)
   Each node maintains local count
   Periodic sync, max() for merging
   Acceptable 2-3 second display lag"

3. ANTI-FRAUD
   "30-second minimum watch time
   Deduplication window (30 min per user/video)
   ML-based bot detection
   IP reputation scoring"

4. STORAGE STRATEGY
   "Redis for real-time counts
   Bigtable for persistent storage
   Batch aggregation every minute"

5. GRACEFUL DEGRADATION
   "If fraud detection delayed, count anyway
   Flag for async review
   Better to slightly over-count than block views"
```

**Option C: Recommendation Engine**

```
KEY POINTS TO COVER:

1. TWO-STAGE ARCHITECTURE
   "Stage 1: Candidate Generation
   - 1000+ candidates from multiple sources
   - Watch history similarity
   - Subscription updates
   - Trending in topics

   Stage 2: Ranking
   - Deep neural network scorer
   - Multi-objective: relevance, engagement, quality
   - Must complete in 50ms"

2. FEATURE STORE
   "Pre-computed user features (embeddings)
   Video features (title, category, engagement)
   Low-latency serving (< 10ms)"

3. LATENCY BUDGET
   "Total: 50ms
   - Feature lookup: 10ms
   - Candidate gen: 15ms
   - Ranking: 15ms
   - Post-processing: 10ms"

4. COLD START
   "New users: demographic defaults
   New videos: content-based features
   Exploration to gather signals"

5. DIVERSITY
   "Avoid filter bubbles
   Inject varied content
   Limit videos from same channel/topic"
```

### Phase 4: Scale & Trade-offs (30-40 min)

**Scaling Discussion Points:**

```
CDN SCALING:
"98.5% cache hit rate is critical
- 100+ Tbps without CDN = impossible
- ISP peering (Google Global Cache)
- Tiered caching: edge → regional → origin"

DATABASE SCALING:
"Vitess for metadata sharding
- Shard by channel_id for creator locality
- Automatic resharding when hot
- Read replicas for scaling reads (10:1)"

TRANSCODING SCALING:
"Horizontal scaling is key
- 100K+ workers during peak
- Auto-scale based on queue depth
- Geographic distribution for uploads"
```

**Trade-off Discussions:**

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **View count consistency** | Strong (accurate) | Eventual (scalable) | **Eventual** - 2-3s lag acceptable |
| **Codec priority** | All codecs upfront | Progressive encoding | **Progressive** - H.264 first, others later |
| **Recommendation freshness** | Real-time | Cached 5 min | **Cached** with real-time signals |
| **Comment moderation** | Pre-publish | Post-publish | **Post-publish** - better UX, async moderation |

---

## Trap Questions & How to Handle

### Trap 1: "Why not just stream the original file?"

```
WHAT THEY'RE TESTING:
Understanding of ABR, codecs, bandwidth, device compatibility

WRONG ANSWER:
"Yeah, we could just serve the original for simplicity"

RIGHT ANSWER:
"Original files are too large and incompatible:
1. A 10-min 4K video could be 5GB raw
2. Not all devices support all codecs
3. No adaptive bitrate = constant buffering
4. Bandwidth costs would be 10x higher

Transcoding is essential for:
- Multiple resolutions (phone vs TV)
- Multiple codecs (H.264 for legacy, VP9/AV1 for modern)
- Segment-based streaming for seeking
- Bandwidth adaptation"
```

### Trap 2: "How do you handle a viral video?"

```
WHAT THEY'RE TESTING:
Hot spot mitigation, CDN architecture, cache strategy

WRONG ANSWER:
"Our CDN handles it automatically"

RIGHT ANSWER:
"Viral videos create hot spots. Mitigation strategies:

1. PRE-WARMING: For known releases (music drops), push to all edges

2. SHARDED CACHING: Multiple cache keys per video
   cache_key = video_id + hash(user_id) % 10
   Distributes across 10 nodes

3. READ REPLICAS: 10+ database replicas for metadata

4. RATE LIMITING: Per-video limits at edge, queue excess

5. GRACEFUL DEGRADATION: Serve slightly stale metadata

Key insight: Plan for 100x normal load on any single video"
```

### Trap 3: "Why not use strong consistency for view counts?"

```
WHAT THEY'RE TESTING:
CAP theorem understanding, trade-off reasoning

WRONG ANSWER:
"We need accurate counts for monetization"

RIGHT ANSWER:
"Strong consistency would require distributed locks or consensus,
which doesn't scale to 60K writes/second:

1. LATENCY: 2PC adds 10-100ms per write
2. AVAILABILITY: Partition = no writes
3. THROUGHPUT: Locks create bottlenecks

Eventual consistency works because:
- 2-3 second display lag is acceptable
- Final counts are accurate (reconciled in batch)
- CRDTs ensure convergence without coordination
- Monetization uses audited batch totals, not real-time

Exception: Payment transactions use Spanner (strong consistency)
because correctness > availability for money"
```

### Trap 4: "What if the transcoding queue backs up?"

```
WHAT THEY'RE TESTING:
Graceful degradation, prioritization

WRONG ANSWER:
"Just add more workers"

RIGHT ANSWER:
"Queue backup is expected during peaks. Multi-level response:

LEVEL 1 - Priority Queue:
- Monetized channels get priority
- Shorts before long-form
- Partners before new creators

LEVEL 2 - Reduced Variants:
- Skip AV1 encoding (expensive)
- Skip low resolutions (144p, 240p)
- Focus on 720p + 1080p H.264

LEVEL 3 - Delayed Features:
- Captions generated async
- Thumbnail options delayed
- Content ID check async (publish with pending)

LEVEL 4 - Communication:
- Update creator with ETA
- Show processing status
- Never lose the upload

Auto-scaling triggered at each level"
```

### Trap 5: "How do recommendations avoid filter bubbles?"

```
WHAT THEY'RE TESTING:
Understanding of recommendation system trade-offs

WRONG ANSWER:
"The algorithm optimizes for engagement"

RIGHT ANSWER:
"Pure engagement optimization creates bubbles. We balance:

1. EXPLORATION vs EXPLOITATION:
   - 80% based on user history (exploit)
   - 20% diverse/new content (explore)

2. DIVERSITY CONSTRAINTS:
   - Max 2 videos from same channel
   - Topic variety requirement
   - Fresh content boost

3. QUALITY SIGNALS:
   - Not just CTR, but watch time, satisfaction surveys
   - Penalize clickbait (high CTR, low watch time)
   - Quality score from human raters

4. BREAKING FILTER BUBBLES:
   - Inject 'bridge' content across topics
   - Surface authoritative sources for sensitive topics
   - Reduce recommendations that promote harmful patterns

Multi-objective: relevance + diversity + quality + freshness"
```

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| **Ignoring transcoding** | "Just store and serve" | Transcoding is core complexity |
| **Single database** | "MySQL handles everything" | Polyglot: Vitess + Bigtable + Spanner |
| **Underestimating CDN** | "CDN is a commodity" | CDN is THE critical component |
| **Strong consistency everywhere** | "Accuracy matters" | Eventual for counts, strong for payments |
| **Monolithic design** | "Simpler architecture" | Microservices for independent scaling |
| **Ignoring cold start** | "ML solves it" | Explicit fallback for new users/videos |
| **Forgetting moderation** | "Not core feature" | Safety is essential at scale |

---

## Questions to Ask Interviewer

```
AT THE START:
1. "Should I focus on any specific feature, or full platform?"
2. "What's our target scale - millions or billions of users?"
3. "Are there specific constraints - cost, latency, regions?"

DURING DESIGN:
4. "Should I go deeper on [transcoding/recommendations/CDN]?"
5. "Is this level of detail appropriate, or should I move on?"
6. "Would you like me to discuss the failure modes here?"

AT THE END:
7. "What aspects would you like me to elaborate on?"
8. "Are there any concerns about the design I should address?"
9. "What would be the first thing to build for an MVP?"
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      YOUTUBE INTERVIEW CHEAT SHEET                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCALE NUMBERS (memorize)          KEY COMPONENTS (draw these)              │
│  ────────────────────────          ────────────────────────────             │
│  MAU: 2.5 billion                  1. CDN (3000+ PoPs)                      │
│  DAU: 122 million                  2. Upload Service                        │
│  Hours watched/day: 1 billion      3. Transcoding Pipeline                  │
│  Hours uploaded/min: 500+          4. Playback Service                      │
│  Videos: 800 million+              5. Recommendation Engine                 │
│  CDN capacity: 100+ Tbps           6. Search Service                        │
│  Cache hit rate: 98.5%             7. Comments Service                      │
│                                                                              │
│  LATENCY TARGETS                   DATABASE CHOICES                         │
│  ───────────────                   ────────────────                         │
│  Playback start: <200ms            Vitess: Metadata (sharded MySQL)         │
│  Search: <100ms                    Bigtable: Analytics, history             │
│  Recommendations: <50ms            Spanner: Rights, billing (global)        │
│  View count lag: 2-3s OK           Colossus: Video files (blob)             │
│                                                                              │
│  TRANSCODING                       RECOMMENDATIONS                          │
│  ───────────                       ───────────────                          │
│  H.264 → VP9 → AV1                 Stage 1: Candidate generation            │
│  8+ resolutions per codec          Stage 2: Ranking (DNN)                   │
│  Custom ASICs for AV1              50ms total latency budget                │
│  Parallel segment encoding         Multi-objective scoring                  │
│                                                                              │
│  VIEW COUNTING                     CDN STRATEGY                             │
│  ────────────                      ────────────                             │
│  Eventual consistency              3-tier: Edge → Shield → Origin           │
│  G-Counter CRDT                    QUIC/HTTP3 preferred                     │
│  30s minimum watch                 ISP peering (Google GGC)                 │
│  Anti-fraud ML                     98.5% cache hit target                   │
│                                                                              │
│  COMMON TRADE-OFFS                                                          │
│  ─────────────────                                                          │
│  • Eventual consistency for views (scale > accuracy)                        │
│  • Progressive encoding (H.264 first, AV1 later)                            │
│  • Cached recommendations with real-time signals                            │
│  • Post-publish moderation (UX > safety, but fast review)                   │
│                                                                              │
│  FAILURE SCENARIOS TO MENTION                                               │
│  ────────────────────────────                                               │
│  • Viral video → CDN sharding, cache warming                                │
│  • Transcoding backlog → priority queue, reduced variants                   │
│  • Database failure → Vitess auto-failover, read replicas                   │
│  • Recommendation failure → fallback to trending                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sample Interview Dialogue

```
INTERVIEWER: "Design YouTube"

CANDIDATE: "Great! Before I start, let me clarify the scope.
Are we designing the full platform including upload, playback,
search, and recommendations? And what scale are we targeting?"

INTERVIEWER: "Yes, full platform. Assume billions of users."

CANDIDATE: "Perfect. Let me also confirm:
- Should I include live streaming?
- What about monetization and ads?
- Any specific latency requirements?"

INTERVIEWER: "Include live streaming briefly. Mention ads but
don't go deep. Standard latency expectations."

CANDIDATE: "Got it. Let me start with the high-level architecture.
[Draws diagram]

The core flow is:
1. Creator uploads video to Upload Service
2. Transcoding Pipeline converts to multiple formats
3. Videos stored in blob storage, metadata in Vitess
4. CDN serves video segments globally
5. Viewers request through Playback Service
6. Recommendations personalize the experience

Should I go deeper on transcoding or the recommendation engine?"

INTERVIEWER: "Let's discuss transcoding."

CANDIDATE: "Transcoding is the backbone of video delivery..."
[Continues with deep dive]
```

---

*[← Previous: Observability](./07-observability.md) | [Back to Index](./00-index.md)*
