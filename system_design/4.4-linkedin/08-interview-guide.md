# LinkedIn: Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Actions |
|------|-------|-------|-------------|
| **0-5 min** | Clarify | Requirements gathering | Ask scope questions, confirm features |
| **5-15 min** | High-Level | Core architecture | Draw main components, data flows |
| **15-30 min** | Deep Dive | 1-2 critical components | LIquid Graph OR Feed Ranking OR Job Matching |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failures | Discuss scaling, reliability |
| **40-45 min** | Wrap Up | Summary, questions | Recap key decisions, answer follow-ups |

---

## Phase 1: Clarify Requirements (0-5 min)

### Questions to Ask

1. **Scope**: "Should I focus on the core social networking features (connections, feed, messaging) or also include job marketplace?"

2. **Scale**: "What scale should I design for? I'm assuming 1 billion+ members, 100M+ DAU?"

3. **Features Priority**: "Which features are most important - feed ranking, connection recommendations (PYMK), or job matching?"

4. **Constraints**: "Are there specific latency requirements? I'm assuming sub-200ms for feed loads."

5. **Existing Systems**: "Should I assume LinkedIn-like infrastructure exists (distributed graph, ML platform) or design from scratch?"

### Sample Clarification Dialog

```
YOU: "Before I dive in, let me clarify the scope. LinkedIn has several major components -
      professional networking, content feed, messaging, and job marketplace. Should I
      cover all of these at a high level, or focus deeply on 1-2 areas?"

INTERVIEWER: "Let's focus on the core professional networking - connections, feed, and
             touch on job search."

YOU: "Perfect. And for scale - I'll assume we're designing for LinkedIn-like scale:
      1+ billion members, 130M+ DAU, with sub-200ms feed latency. Sound right?"

INTERVIEWER: "Yes, that's the right ballpark."

YOU: "Great. One more question - what's the key metric we're optimizing for? LinkedIn
      focuses on 'professional value' rather than engagement. Should I optimize for
      meaningful interactions?"

INTERVIEWER: "Yes, exactly. Dwell time over clicks."
```

---

## Phase 2: High-Level Design (5-15 min)

### Opening Statement

```
"LinkedIn is a professional social network with several unique characteristics that
differentiate it from consumer platforms like Facebook or Twitter:

1. BIDIRECTIONAL CONNECTIONS - Unlike Twitter's follow model, LinkedIn connections
   require mutual consent, which impacts our graph design.

2. PROFESSIONAL VALUE OVER ENGAGEMENT - We optimize for dwell time, not likes/shares,
   which changes our ranking approach.

3. TWO-SIDED MARKETPLACE - Job matching must satisfy both job seekers AND recruiters.

4. B2B REVENUE MODEL - Enterprise products (Recruiter, Sales Navigator) require
   strong data isolation.

Let me draw the high-level architecture..."
```

### Architecture to Draw

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LINKEDIN ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────┐        ┌─────────────┐        ┌─────────────────────────────┐│
│   │ Clients │ ────►  │     CDN     │ ────►  │      API Gateway           ││
│   │(Web/App)│        │(Static/Media)│        │  (Auth, Rate Limit)        ││
│   └─────────┘        └─────────────┘        └──────────┬──────────────────┘│
│                                                        │                    │
│                        ┌───────────────────────────────┼───────────────┐   │
│                        │                               │               │   │
│                        ▼                               ▼               ▼   │
│                 ┌────────────┐              ┌──────────────┐    ┌────────┐│
│                 │   FEED     │              │  CONNECTION  │    │  JOB   ││
│                 │  SERVICE   │              │   SERVICE    │    │SERVICE ││
│                 │ (360Brew)  │              │              │    │        ││
│                 └─────┬──────┘              └──────┬───────┘    └────┬───┘│
│                       │                            │                 │    │
│      ┌────────────────┼────────────────────────────┼─────────────────┼──┐ │
│      │                │                            │                 │  │ │
│      ▼                ▼                            ▼                 ▼  │ │
│  ┌───────┐     ┌───────────┐              ┌───────────────┐    ┌──────┐│ │
│  │RANKING│     │   REDIS   │              │ LIQUID GRAPH  │    │GALENE││ │
│  │(GLMix)│     │  (Cache)  │              │  (270B edges) │    │Search││ │
│  └───────┘     └───────────┘              └───────────────┘    └──────┘│ │
│      │                                            │                     │ │
│      └─────────────────┬──────────────────────────┘                     │ │
│                        ▼                                                │ │
│              ┌─────────────────┐           ┌─────────────────┐         │ │
│              │    ESPRESSO     │           │      KAFKA      │         │ │
│              │    (NoSQL)      │           │  (7T msgs/day)  │         │ │
│              └─────────────────┘           └─────────────────┘         │ │
│                                                                         │ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Points to Mention

1. **LIquid Graph**: "The professional graph with 270 billion edges is LinkedIn's core.
   Unlike sharded graphs, LIquid uses full replication for fast BFS traversal."

2. **360Brew Feed**: "Feed ranking uses 300+ signals with dwell time as the primary metric.
   Three-stage pipeline: First Pass Rankers → Second Pass → Diversity."

3. **Bidirectional Connections**: "Connection edges stored canonically (lower ID first) with
   dual indexes for O(1) lookup from either member."

4. **Job Matching**: "GLMix provides entity-level personalization - the model learns both
   per-user and per-job parameters for true two-sided optimization."

---

## Phase 3: Deep Dive Options (15-30 min)

### Option A: Professional Graph (LIquid)

**When to choose**: Interviewer asks about connections, PYMK, or graph systems.

```
KEY POINTS:

1. WHY FULL REPLICATION:
   "Bidirectional BFS for connection degree requires traversing from both ends.
   Sharding would add network hops per BFS step. Full replication enables
   sub-50ms queries despite 270B edges."

2. BIDIRECTIONAL BFS:
   "Standard BFS is O(b^d), bidirectional is O(b^(d/2)).
   For 400 connections, depth 3: 64M vs 16K node visits - 4000x improvement."

3. CONNECTION CONSISTENCY:
   "Bidirectional edges must be atomic. We store single canonical edge (lower ID first)
   with dual indexes. Kafka ensures cross-region consistency."

4. PYMK PIPELINE:
   "Candidate generation from multiple sources (2nd degree, same company, same school,
   LiGNN embeddings), then GLMix scoring, then diversity filtering."
```

### Option B: Feed Ranking (360Brew)

**When to choose**: Interviewer asks about content ranking, personalization, or ML.

```
KEY POINTS:

1. THREE-STAGE PIPELINE:
   "First Pass Rankers score per content type (articles, posts, jobs).
   Second Pass Ranker combines with full feature extraction.
   Diversity filter ensures no consecutive same-author content."

2. DWELL TIME vs ENGAGEMENT:
   "LinkedIn optimizes for dwell time, not likes. A 3-minute article read
   indicates more professional value than a quick like. This prevents clickbait
   and aligns with LinkedIn's mission."

3. SIGNAL WEIGHTS:
   "Predicted dwell time: 40%, Author expertise: 20%, Topic relevance: 15%,
   Freshness: 10%, Engagement: 10%, Comment quality: 5%."

4. FRESHNESS HANDLING:
   "Unlike Twitter, LinkedIn shows older content (2-3 weeks) if highly relevant.
   Freshness decay is gradual, not cliff-like."
```

### Option C: Job Matching

**When to choose**: Interviewer asks about marketplace, recommendations, or two-sided matching.

```
KEY POINTS:

1. TWO-SIDED OPTIMIZATION:
   "Traditional recs optimize user relevance. Job matching optimizes BOTH
   job seeker relevance AND recruiter quality (will they respond?)."

2. GLMIX MODEL:
   "Score = GlobalModel + UserBias + UserPreferences + JobBias + JobQuality.
   Entity-level parameters let model learn individual preferences."

3. GALENE SEARCH:
   "Distributed search index with real-time updates (<30s indexing).
   First filter by text match, then rank with GLMix."

4. MULTI-ARMED BANDIT:
   "For recruiter search, we balance explore (new candidate types) vs exploit
   (known good segments) using LinUCB with contextual features."
```

### Option D: Messaging (InMail)

**When to choose**: Interviewer asks about messaging, real-time, or distributed storage.

```
KEY POINTS:

1. ESPRESSO ARCHITECTURE:
   "Distributed NoSQL built on MySQL with Avro serialization.
   Personal Data Router maps member → shard location."

2. PLUGIN ARCHITECTURE:
   "Messaging pipeline uses plugins (spam filter, quality check, routing).
   Teams own specific plugins, infrastructure owns the pipeline."

3. ASYNC DELIVERY:
   "Write to sender's shard (20ms), async replicate to recipient (100ms),
   push notification (50ms). Sender sees instant, recipient within 2s."

4. REAL-TIME PRESENCE:
   "Play Framework + Akka for presence. Server-Sent Events for online status.
   Tracks millions of concurrent online members."
```

---

## Phase 4: Scale & Reliability (30-40 min)

### Bottleneck Discussion

```
TOP 3 BOTTLENECKS:

1. GRAPH TRAVERSAL AT SCALE:
   "Problem: 2nd degree query can touch 1M nodes (1000 connections × 1000).
   Solution: Pre-compute 2nd degree for active users, cache aggressively,
   sample for super-connectors."

2. FEED FRESHNESS vs LATENCY:
   "Problem: Pre-computed feeds are stale, real-time is slow.
   Solution: Hybrid approach - pre-computed base + real-time merge.
   Tiered cache invalidation based on connection strength."

3. JOB MATCHING SCALE:
   "Problem: GLMix scoring 10K jobs per search is expensive.
   Solution: Two-stage ranking - cheap BM25 first (10K→1K),
   expensive GLMix second (1K→50)."
```

### Failure Scenario Handling

```
SCENARIO: LIquid cluster fails in US-West

DETECTION:
   - Health checks fail >50%
   - Query timeout spike
   - Duration >2 minutes triggers alert

AUTOMATED RESPONSE:
   1. Update routing to skip US-West LIquid
   2. Route graph queries to US-East cluster
   3. Scale US-East capacity (already has full replica)
   4. Alert on-call

IMPACT:
   - Increased latency (cross-region)
   - No data loss (full replication)
   - Degraded PYMK (may use cached recommendations)

RECOVERY:
   - Resync US-West from checkpoint + Kafka
   - Gradual traffic shift back
   - Post-incident review
```

---

## Trade-offs Discussion

| Decision | Option A | Option B | LinkedIn's Choice |
|----------|----------|----------|-------------------|
| **Graph Storage** | Sharded (less memory) | Full replication (fast BFS) | **Full replication** - BFS speed critical |
| **Connection Model** | Unidirectional (simpler) | Bidirectional (mutual consent) | **Bidirectional** - professional context |
| **Feed Optimization** | Engagement (likes, shares) | Dwell time (value) | **Dwell time** - prevents clickbait |
| **Feed Freshness** | Real-time only | Pre-computed only | **Hybrid** - balance latency & freshness |
| **Job Matching** | User relevance only | Two-sided (user + recruiter) | **Two-sided** - marketplace health |
| **Connection Limit** | Unlimited | Capped (30K) | **Capped** - graph quality, anti-spam |
| **Message Delivery** | Sync (guaranteed) | Async (eventual) | **Async** - scale over latency |

---

## Trap Questions and Best Answers

### Trap 1: "Why not use a standard graph database like Neo4j?"

**Bad Answer**: "Neo4j would work fine, we just need to shard it."

**Good Answer**: "Neo4j and similar graph databases are great for smaller scales, but LinkedIn's graph has unique requirements:

1. **Scale**: 270 billion edges, 2 million QPS. Neo4j clusters struggle at this scale.

2. **Query Pattern**: Bidirectional BFS for connection degrees. Sharding a graph database means each BFS step could require cross-shard hops, adding 10-50ms per hop.

3. **Full Replication Trade-off**: LIquid keeps the full graph in memory (1TB+ per server). This is expensive, but enables sub-50ms BFS. The trade-off is justified because connection queries are on the critical path for almost every feature.

If starting fresh with a smaller professional network, Neo4j or Amazon Neptune would be reasonable choices until scale demands custom infrastructure."

---

### Trap 2: "How does PYMK work? Can't you just show friends-of-friends?"

**Bad Answer**: "Yes, we find 2nd-degree connections and show them."

**Good Answer**: "Friends-of-friends is one signal, but PYMK is much more sophisticated:

**Candidate Sources (not just 2nd degree)**:
- 2nd-degree connections
- Same company (current and past)
- Same school (with graduation year weighting)
- Same industry/job function
- LiGNN embedding similarity (neural network on 8.6B node graph)

**Scoring with GLMix**:
- Mutual connection count (graph signal)
- Interaction history (behavioral signal)
- Profile similarity (content signal)
- Likely to connect? (ML prediction)

**Why this matters**:
Pure 2nd-degree would miss valuable connections from same company or school. Also, not all 2nd-degree connections are equal - someone with 12 mutual connections is more relevant than someone with 1.

The LiGNN cross-domain model is particularly powerful - it can identify 'people like you who connected with people like them' patterns that simple graph traversal misses."

---

### Trap 3: "Why optimize for dwell time instead of engagement?"

**Bad Answer**: "Dwell time is just another engagement metric."

**Good Answer**: "Dwell time and engagement optimize for fundamentally different things:

**Engagement (likes, shares, comments)** can be gamed:
- Clickbait headlines get clicks but not value
- 'Great post!' comments are easy but meaningless
- Controversial content gets engagement but harms professional community

**Dwell time** measures actual value consumed:
- A 3-minute read of a technical article = genuine learning
- Scroll pauses and expansions = content worth absorbing
- Video watch time = actual attention, not just autoplay

**LinkedIn's mission** is professional development, not entertainment. Optimizing for dwell time:
- Rewards thoughtful, educational content
- Discourages engagement bait
- Attracts professionals who want value, not drama

**Trade-off**: Dwell time is harder to predict and measure. But it better aligns creator incentives with platform goals. This is why LinkedIn's content quality is generally higher than Facebook's feed."

---

### Trap 4: "Job matching seems like standard recommendation. What's different?"

**Bad Answer**: "We just recommend relevant jobs to users."

**Good Answer**: "Job matching is a **two-sided marketplace** problem, not just recommendation:

**Standard Recommendation** (Netflix):
- Optimize: User satisfaction
- Goal: User watches movie
- One-sided: Only user matters

**Job Marketplace** (LinkedIn):
- Optimize: BOTH user AND recruiter satisfaction
- Goal: User applies AND recruiter responds AND hire happens
- Two-sided: Match quality for both parties

**Why this matters**:
If we only optimize for user relevance, we'd show every job seeker the same 'hot' jobs. Recruiters get overwhelmed, stop responding, marketplace breaks.

**GLMix solves this** with entity-level parameters:
- Per-user parameters: Learn individual preferences
- Per-job parameters: Learn job quality/responsiveness
- Combined score balances user relevance with recruiter likelihood

**Additional marketplace health signals**:
- Don't over-saturate popular jobs
- Ensure new jobs get visibility
- Balance geographic distribution

This is fundamentally harder than Netflix because we're optimizing a matching market, not consumption."

---

### Trap 5: "How do you prevent InMail spam?"

**Bad Answer**: "We use rate limiting and spam filters."

**Good Answer**: "InMail spam prevention is multi-layered:

**1. Economic Friction** (most important):
- InMails cost credits (real money for recruiters)
- Credits refunded if no response in 90 days
- This creates skin-in-the-game for senders

**2. ML Pipeline (plugin architecture)**:
- Text classification (promotional vs personalized)
- Sender reputation (past response rates)
- Network signals (connection overlap)
- Template detection (mass identical messages)

**3. Recipient Controls**:
- Accept from: Anyone / Connections / Premium only
- Keyword blocklists
- Auto-archive promotional

**4. Sender Verification**:
- Account age requirements
- Profile completeness threshold
- No recent spam reports

**Why plugin architecture?**
Different teams own different spam signals. The spam team owns text classification. The trust team owns reputation. Infrastructure owns the pipeline. This separation enables rapid iteration without coordination overhead.

**Response rate feedback loop**:
Senders with low response rates see warnings. Persistent low rates = account restrictions. This creates a self-correcting system where good actors are rewarded."

---

## Key Numbers to Memorize

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     LINKEDIN KEY NUMBERS FOR INTERVIEWS                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  USERS:                              GRAPH:                                  │
│  • 1.2 billion members               • 270 billion edges                    │
│  • 134.5 million DAU                 • 2 million QPS                        │
│  • 310 million MAU                   • <50ms avg latency                    │
│  • ~400 avg connections              • 1TB+ memory per server               │
│  • 30,000 max connections            • 20-40 servers per cluster            │
│                                                                              │
│  FEED (360Brew):                     MESSAGING:                             │
│  • 300+ ranking signals              • 1B+ messages/day                     │
│  • 40% weight on dwell time          • <2s delivery latency                 │
│  • 93% spam detection accuracy       • Espresso: 500+ shards                │
│  • Content lifespan: 2-3 weeks                                              │
│                                                                              │
│  INFRASTRUCTURE:                     LATENCY TARGETS:                       │
│  • 7 trillion Kafka msgs/day         • Feed: <200ms P99                     │
│  • 100+ Kafka clusters               • Graph: <50ms P99                     │
│  • 4,000+ Kafka brokers              • Message send: <200ms                 │
│  • LiGNN: 8.6B nodes, 15TB          • Job search: <500ms                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| **Treating connections like Twitter follows** | LinkedIn connections are bidirectional, require consent | Design for mutual acceptance flow, atomic bidirectional edges |
| **Optimizing feed for engagement** | LinkedIn values professional worth, not clicks | Focus on dwell time prediction, author expertise |
| **Ignoring recruiter side of job matching** | Two-sided marketplace needs both parties satisfied | Discuss GLMix entity-level parameters, recruiter quality signals |
| **Sharding the graph naively** | BFS across shards is expensive | Explain full replication trade-off, memory cost justification |
| **Skipping rate limits discussion** | InMail spam is a real problem | Cover economic friction, ML filtering, recipient controls |
| **Over-engineering for day 1** | Start simple, scale when needed | Acknowledge simpler options work at smaller scale |
| **Not discussing trade-offs** | Every decision has pros/cons | Explicitly state what you're giving up for each choice |

---

## Questions to Ask the Interviewer

1. "Should I focus on the core social networking or also cover enterprise products like Recruiter?"

2. "What's the primary metric we're optimizing - engagement, professional value, or revenue?"

3. "Should I assume we have existing ML infrastructure, or design that as well?"

4. "Are there specific failure scenarios you'd like me to address?"

5. "Would you like me to go deeper on the graph system, feed ranking, or job matching?"

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LINKEDIN INTERVIEW QUICK REFERENCE                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  KEY DIFFERENTIATORS:                                                        │
│  ✓ Bidirectional connections (mutual consent)                               │
│  ✓ Dwell time > engagement (professional value)                             │
│  ✓ Two-sided job marketplace (seeker + recruiter)                           │
│  ✓ B2B revenue (Recruiter, Sales Navigator)                                 │
│                                                                              │
│  CORE COMPONENTS:                                                            │
│  • LIquid Graph:  Full replication, 270B edges, <50ms                       │
│  • 360Brew Feed:  300+ signals, dwell time focus                            │
│  • GLMix:         Entity-level personalization (user + job params)          │
│  • Espresso:      Distributed NoSQL, plugin architecture                    │
│                                                                              │
│  ALGORITHMS TO MENTION:                                                      │
│  • Bidirectional BFS: O(b^(d/2)) vs O(b^d)                                  │
│  • PYMK: Multi-source candidates + GLMix scoring + diversity                │
│  • Feed: FPR → SPR → Diversity (three-stage pipeline)                       │
│  • Jobs: BM25 filter → GLMix score (two-stage ranking)                      │
│                                                                              │
│  INTERVIEW DO's:                                                             │
│  ✓ Clarify scope (connections vs jobs vs messaging)                         │
│  ✓ Mention bidirectional connection model early                             │
│  ✓ Explain dwell time optimization                                          │
│  ✓ Discuss two-sided job marketplace                                        │
│  ✓ Cover failure scenarios and trade-offs                                   │
│                                                                              │
│  INTERVIEW DON'Ts:                                                           │
│  ✗ Treat like Twitter (unidirectional)                                      │
│  ✗ Optimize for likes/engagement                                            │
│  ✗ Ignore recruiter side of job matching                                    │
│  ✗ Shard graph without discussing BFS impact                                │
│  ✗ Skip rate limiting for InMail                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Related Interview Topics

| Topic | Relevance | Key Connection |
|-------|-----------|----------------|
| **Facebook** | High | Compare bidirectional connections, different engagement model |
| **Twitter** | High | Contrast unidirectional follows, real-time vs professional |
| **Recommendation Engine** | High | GLMix, two-sided marketplace, collaborative filtering |
| **Graph Database** | High | LIquid design, BFS optimization, full replication |
| **Feature Store** | Medium | ML features for ranking, real-time serving |
| **Distributed KV Store** | Medium | Espresso architecture, sharding |
| **Message Queue** | Medium | Kafka for event streaming, notifications |

---

*Previous: [← 07 - Observability](./07-observability.md) | Back to: [Index](./00-index.md)*
