# Interview Guide

## Table of Contents

1. [Interview Pacing](#interview-pacing)
2. [Clarifying Questions](#clarifying-questions)
3. [High-Level Architecture to Draw](#high-level-architecture-to-draw)
4. [Deep Dive Options](#deep-dive-options)
5. [Trade-offs Discussion](#trade-offs-discussion)
6. [Trap Questions](#trap-questions)
7. [Key Numbers to Memorize](#key-numbers-to-memorize)
8. [Common Mistakes to Avoid](#common-mistakes-to-avoid)
9. [Sample Interview Walkthrough](#sample-interview-walkthrough)

---

## Interview Pacing

### 45-Minute Format

| Phase | Time | Focus | Tips |
|-------|------|-------|------|
| **Clarify** | 0-5 min | Requirements, scope | Ask 3-5 questions, confirm scale |
| **High-Level** | 5-15 min | Architecture, data flow | Draw 5-7 main components |
| **Deep Dive** | 15-30 min | 1-2 critical components | Choose based on interviewer interest |
| **Scale & Trade-offs** | 30-40 min | Bottlenecks, failures | Proactively discuss limitations |
| **Wrap Up** | 40-45 min | Summary, questions | Summarize key decisions |

### 60-Minute Format

| Phase | Time | Focus |
|-------|------|-------|
| **Clarify** | 0-7 min | Extended requirements discussion |
| **High-Level** | 7-20 min | Full architecture with data flows |
| **Deep Dive** | 20-40 min | 2-3 components in detail |
| **Scale** | 40-50 min | Bottlenecks, failures, growth |
| **Wrap Up** | 50-60 min | Summary, follow-up questions |

---

## Clarifying Questions

### Essential Questions to Ask

```
1. "Should I focus on the For You timeline, or include Search and Trends?"
   Why: Scope determines depth vs breadth

2. "What scale should I design for - hundreds of millions of users?"
   Why: Confirms capacity estimation assumptions
   Expected: ~250M DAU, 500M tweets/day

3. "Is this read-heavy or write-heavy, or should I optimize for both?"
   Why: Determines fan-out strategy discussion
   Expected: Write-heavy for fan-out, read-heavy for timeline

4. "What are the latency requirements for timeline loading?"
   Why: Drives caching and ranking decisions
   Expected: <1.5 seconds p99

5. "How should I handle users with 100M+ followers?"
   Why: Opens discussion of celebrity problem - key differentiator
   Expected: Interviewer wants to hear about hybrid fan-out

6. "Should I consider real-time features like trends and live updates?"
   Why: Adds streaming architecture if included
   Expected: Usually yes, discuss briefly

7. "Is geographic distribution in scope?"
   Why: Multi-region adds complexity
   Expected: Often yes, especially for senior roles
```

### Questions NOT to Ask

- "What database should I use?" (You should propose and justify)
- "How much time do we have?" (Already given, shows poor time management)
- "Is this the right approach?" (Propose confidently, explain trade-offs)

---

## High-Level Architecture to Draw

### Minimum Viable Architecture (5-7 Components)

```
Draw this in 5-10 minutes:

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    [Clients]                                                    │
│        ↓                                                        │
│    [CDN + Load Balancer]                                        │
│        ↓                                                        │
│    [API Gateway] ←──── [Rate Limiter]                           │
│        ↓                                                        │
│    ┌───────────────────────────────────────┐                    │
│    │           Core Services               │                    │
│    │                                       │                    │
│    │  [Tweetypie]    [Home Mixer]  [Search]│                    │
│    │  (Tweet CRUD)   (Timeline)    (ES)    │                    │
│    └───────────────────────────────────────┘                    │
│        ↓                  ↓          ↓                          │
│    [Kafka]           [Navi ML]   [ElasticSearch]                │
│        ↓                                                        │
│    [Fanout Service]                                             │
│        ↓                                                        │
│    ┌───────────────────────────────────────┐                    │
│    │           Data Layer                  │                    │
│    │                                       │                    │
│    │  [Manhattan]  [Redis Cache]  [MySQL]  │                    │
│    │  (KV Store)   (Timelines)    (Shards) │                    │
│    └───────────────────────────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Key data flows to explain:
1. Timeline read: Client → Home Mixer → Redis (cache) + Navi (ML)
2. Tweet write: Client → Tweetypie → Kafka → Fanout → Redis
3. Search: Client → Search Service → ElasticSearch
```

### Extended Architecture (If Time Permits)

Add these components in deep dive:

- **GraphJet**: For out-of-network discovery
- **SimClusters/TwHIN**: For embeddings and recommendations
- **Trends Service**: For trending topics
- **Notification Service**: For push notifications

---

## Deep Dive Options

### Option A: Home Mixer (Timeline Assembly)

**When to choose:** Interviewer asks about personalization, ML, or feed ranking

```
KEY POINTS TO COVER:

1. PRODUCT MIXER FRAMEWORK
   - Declarative pipeline in Scala
   - Parallel candidate source fetching
   - Two-stage ranking (light + heavy)

2. CANDIDATE SOURCES
   - In-network: 50% from followed accounts (Redis)
   - Out-of-network: 50% from graph exploration (GraphJet)

3. LATENCY BUDGET
   - Total: 1.5 seconds
   - Requires 220 CPU-seconds of computation
   - Achieved through massive parallelism

4. SCORING FORMULA (Mention this is open-sourced)
   Likes×1 + Retweets×20 + Replies×13.5 + ProfileClicks×12

5. KEY INSIGHT
   "The heavy ranker uses 150x more CPU than the latency budget
   allows - we achieve this through batching and parallelism"
```

### Option B: Celebrity/Hot User Problem

**When to choose:** Interviewer asks about scale challenges or compares to Facebook

```
KEY POINTS TO COVER:

1. THE PROBLEM
   - @elonmusk has 150M followers
   - Naive fan-out: 150M writes per tweet
   - 10 tweets/day = 1.5B writes from ONE user

2. TWITTER vs FACEBOOK
   - Twitter: Unidirectional (follow)
   - Facebook: Bidirectional (friend) with 5K cap
   - Twitter has MORE extreme celebrity problem

3. SOLUTION: HYBRID FAN-OUT
   - Regular users (<100K): Push to follower timelines
   - Celebrities (>=100K): Pull at read time
   - Threshold is 100K (10x Facebook's 10K)

4. RETWEET AMPLIFICATION
   - 100K retweets × 1000 followers each = 100M more writes
   - Solution: Deduplication, viral content detection

5. KEY INSIGHT
   "The pull model adds 50-100ms to read latency, but saves
   trillions of writes per day - worthwhile trade-off"
```

### Option C: Search Infrastructure

**When to choose:** Interviewer asks about real-time requirements or ElasticSearch

```
KEY POINTS TO COVER:

1. INDEXING SLA
   - Target: <1 second from tweet to searchable
   - Previous: 15 seconds (reduced by 15x)

2. PIPELINE
   Tweet → Kafka → Ingestion Service → ES Proxy → ElasticSearch

3. CUSTOM COMPONENTS
   - Ingestion Service: Handles Twitter's traffic spikes
   - ES Proxy: Metrics, routing, circuit breaking
   - Backfill Service: 100s of TBs historical data

4. LATENCY BREAKDOWN
   - Kafka: 50ms
   - Ingestion: 60ms
   - ES bulk index: 200ms
   - ES refresh: 500ms
   - Total: ~800ms (under 1s)

5. KEY INSIGHT
   "Standard ES ingestion couldn't handle Twitter's scale,
   so we built a custom Kafka-backed pipeline"
```

---

## Trade-offs Discussion

### Major Trade-off Decisions

| Decision | Option A | Option B | Twitter's Choice | Why |
|----------|----------|----------|------------------|-----|
| **Fan-out strategy** | Pure push | Pure pull | Hybrid (100K threshold) | Balance write amp vs read latency |
| **Timeline mix** | 100% followed | 100% discovery | 50/50 split | Engagement vs user control |
| **Ranking model** | Single pass | Two-stage | Two-stage (light + heavy) | Latency vs accuracy |
| **Search consistency** | Strong | Eventual | Eventual (<1s) | Real-time requirement |
| **Celebrity threshold** | 10K (Facebook) | 500K | 100K | Twitter's graph is more extreme |

### Trade-off Discussion Framework

```
When discussing any trade-off:

1. STATE THE PROBLEM
   "We need to distribute 500M tweets/day to 250M users"

2. PRESENT OPTIONS
   "We could use push (precompute) or pull (on-demand)"

3. ANALYZE EACH
   Push: Fast reads, expensive writes
   Pull: Cheap writes, slow reads

4. EXPLAIN DECISION
   "Hybrid makes sense because..."

5. ACKNOWLEDGE LIMITATIONS
   "The downside is 50-100ms additional latency for celebrity content"
```

---

## Trap Questions

### Trap 1: "Why not just fan-out to all followers?"

```
❌ BAD ANSWER:
"We can handle it with more servers"

✅ GOOD ANSWER:
"That would work for most users, but Twitter has accounts with
150 million followers. If @elonmusk posts 10 tweets per day,
that's 1.5 billion writes daily - from a single user.

We use hybrid fan-out with a 100K follower threshold - higher
than Facebook's 10K because Twitter's asymmetric follow graph
allows more extreme follower counts.

For celebrities, we index their tweets separately and merge
them at read time, adding about 50-100ms latency but saving
trillions of writes per day."
```

### Trap 2: "How is Twitter different from Facebook?"

```
✅ GOOD ANSWER (Hit these points):

"Several key differences:

1. GRAPH TYPE
   - Twitter: Unidirectional (I follow you, you don't follow me)
   - Facebook: Bidirectional (we're friends mutually)
   - Impact: Twitter allows 150M followers, Facebook caps at 5K friends

2. CELEBRITY DISTRIBUTION
   - Twitter: 100K threshold for pull model (10x Facebook's)
   - More extreme power law distribution

3. CONTENT VELOCITY
   - Twitter: Real-time, news-focused, tweets live for hours
   - Facebook: Personal content lives for days
   - Impact: Twitter needs faster cache invalidation

4. AMPLIFICATION
   - Twitter: Retweets weighted 20x in ranking (viral by design)
   - Facebook: Shares are less viral
   - Impact: Higher write amplification from viral content

5. PRIVACY DEFAULT
   - Twitter: Public by default
   - Facebook: Friends-only default
   - Impact: Simpler privacy checks, broader content discovery"
```

### Trap 3: "What if the ML ranking service goes down?"

```
✅ GOOD ANSWER:
"We have multiple fallback levels:

Level 1: Use the light ranker instead of heavy ranker
- Still ML-based, just simpler
- Slightly less personalized but fast

Level 2: Serve chronological timeline
- No ML, just sort by time
- Works but lower engagement

Level 3: Serve cached stale timeline
- Return last successful response
- May be minutes old but functional

We use circuit breakers with a 60-second open duration.
After 10 failures in 30 seconds, we trip the breaker and
fall back automatically. This is tested in chaos engineering
exercises monthly."
```

### Trap 4: "How would you handle 10x scale?"

```
❌ BAD ANSWER:
"Just add more servers"

✅ GOOD ANSWER:
"At 10x scale (2.5B DAU, 5B tweets/day), several things break:

1. FAN-OUT: 3.3 trillion writes/day becomes 33 trillion
   Solution: Lower celebrity threshold to 50K, more aggressive pull

2. TIMELINE ASSEMBLY: 1.75M QPS becomes 17.5M QPS
   Solution: Regional caching, precompute more aggressively

3. STORAGE: 2.5 PB/year becomes 25 PB/year
   Solution: Tiered storage, aggressive archival

4. ML INFERENCE: Need 10x GPU capacity
   Solution: Model distillation, lighter models for tail users

5. SEARCH INDEXING: 50B tweets/day to index
   Solution: Partition by time, eventual consistency for old content

The architecture fundamentally holds, but we'd need to be more
aggressive about trade-offs - more eventual consistency,
more caching, more precomputation."
```

### Trap 5: "What about trending topics manipulation?"

```
✅ GOOD ANSWER:
"Bot manipulation of trends is a real threat. We mitigate through:

1. ACCOUNT QUALITY SCORING
   - Weight contributions by account reputation
   - New accounts contribute less
   - Accounts with bot-like patterns filtered

2. VELOCITY NORMALIZATION
   - 1000 tweets from 1000 accounts > 1000 from 10 accounts
   - Require diversity of sources

3. GEOGRAPHIC SPREAD
   - Global trends need multi-region participation
   - Single-location spikes flagged for review

4. PREDICTIVE DETECTION
   - MIT research showed trends can be predicted 1.5-5 hours ahead
   - Artificial patterns detectable by their unnatural growth curves

5. HUMAN REVIEW
   - Top 10 trends get manual verification
   - Especially during elections or sensitive events

The cat-and-mouse game continues, but multiple layers make
manipulation increasingly expensive and detectable."
```

---

## Key Numbers to Memorize

```
┌─────────────────────────────────────────────────────────────────┐
│                    TWITTER SCALE NUMBERS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  USERS:                                                         │
│    DAU: 250 million                                             │
│    MAU: 450 million                                             │
│    Average followers: 700                                       │
│    Celebrity threshold: 100,000 followers                       │
│                                                                 │
│  TRAFFIC:                                                       │
│    Tweets/day: 500 million                                      │
│    Timeline QPS: 175,000 (peak: 300K)                           │
│    MySQL shards: 100,000+                                       │
│    Ranking decisions/day: 5 billion                             │
│                                                                 │
│  TIMELINE:                                                      │
│    Latency budget: 1.5 seconds                                  │
│    CPU-seconds: 220 (per request)                               │
│    Candidates retrieved: 1,500                                  │
│    Final tweets: 200                                            │
│    In-network: 50%                                              │
│    Out-of-network: 50%                                          │
│                                                                 │
│  SCORING WEIGHTS:                                               │
│    Likes: 1x                                                    │
│    Retweets: 20x (highest - drives virality)                    │
│    Replies: 13.5x                                               │
│    Profile clicks: 12x                                          │
│    Link clicks: 11x                                             │
│    Bookmarks: 10x                                               │
│    Premium boost: 4x (in-network), 2x (out-of-network)          │
│                                                                 │
│  SEARCH:                                                        │
│    Indexing latency: <1 second (was 15s)                        │
│    Improvement: 15x faster                                      │
│                                                                 │
│  FAN-OUT:                                                       │
│    Regular user writes/day: 332 billion                         │
│    Celebrity threshold: 100K (vs Facebook's 10K)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | What to Do Instead |
|---------|--------------|-------------------|
| **Ignoring celebrity problem** | Core Twitter challenge | Discuss 100K threshold and hybrid fan-out |
| **Treating like Facebook** | Different graph model | Explain unidirectional vs bidirectional |
| **Simple fan-out for all** | Won't scale for 150M followers | Hybrid push/pull approach |
| **Ignoring retweets** | Major write amplification source | Discuss deduplication strategy |
| **Missing search** | Core feature, real-time requirement | Cover 1-second indexing pipeline |
| **Single ML model** | Too slow for latency budget | Two-stage ranking (light + heavy) |
| **No failure scenarios** | Shows incomplete thinking | Proactively discuss graceful degradation |
| **Generic numbers** | Not Twitter-specific | Use actual Twitter scale numbers |
| **Skipping out-of-network** | It's 50% of feed | Explain GraphJet, SimClusters |
| **Forgetting trends** | Shows unfamiliarity | At least mention briefly |

---

## Sample Interview Walkthrough

### Opening (0-5 minutes)

```
INTERVIEWER: "Design Twitter"

YOU: "Great, I'd like to clarify a few things first.

Should I focus on the main For You timeline, or include Search
and Trends as well?

[Interviewer: Focus on timeline, mention search briefly]

What scale should I design for?

[Interviewer: Assume hundreds of millions of users]

And how should I handle accounts with massive follower counts,
like celebrities with 100 million followers?

[Interviewer: That's a great question, I'd like to hear your thoughts]

Perfect. Let me start with the high-level architecture..."
```

### High-Level (5-15 minutes)

```
YOU: "At a high level, Twitter is a read-heavy system for
timeline access but write-heavy for the fan-out process.

[Draw basic architecture]

The main components are:

1. CLIENTS connect through a CDN and load balancer to our
   API Gateway, which handles auth and rate limiting.

2. CORE SERVICES include:
   - Tweetypie for tweet CRUD
   - Home Mixer for timeline assembly
   - Search Service backed by ElasticSearch

3. For the DATA LAYER, we have:
   - Manhattan as our primary KV store
   - Redis for timeline caching
   - MySQL shards for structured data

4. KAFKA connects everything for async processing

The key insight is the HYBRID FAN-OUT model. When a tweet
is created..."

[Explain timeline read and write flows]
```

### Deep Dive (15-30 minutes)

```
YOU: "Let me dive deeper into the Home Mixer, which assembles
the personalized timeline.

The challenge is we need 220 CPU-seconds of computation but
only have 1.5 seconds of latency budget. We achieve this
through massive parallelism.

[Draw Home Mixer architecture]

We fetch candidates from two sources in parallel:
- In-network: 50% from followed accounts via Redis
- Out-of-network: 50% from GraphJet graph traversal

Then we score using a two-stage approach:
- Light ranker: Quick filter 1500 → 500 candidates
- Heavy ranker: Full ML model on GPU for final 200

The scoring formula was open-sourced:
Retweets are weighted 20x, which explains Twitter's virality..."

[Continue with details on celebrity problem, search, etc.]
```

### Scale & Trade-offs (30-40 minutes)

```
YOU: "Let me discuss some key trade-offs and bottlenecks.

The biggest challenge is the CELEBRITY PROBLEM. Unlike Facebook,
Twitter's unidirectional graph allows 150M followers. Naive
fan-out would mean 1.5 billion writes per day from just @elonmusk.

We use a 100K threshold - 10x higher than Facebook's - to
determine push vs pull. This adds 50-100ms to read latency
but saves trillions of writes.

For FAILURE SCENARIOS, if Navi ML goes down:
- Level 1: Fall back to light ranker
- Level 2: Serve chronological
- Level 3: Serve cached stale timeline

This is protected by circuit breakers...

[Discuss other bottlenecks and mitigations]"
```

### Wrap Up (40-45 minutes)

```
YOU: "To summarize the key decisions:

1. HYBRID FAN-OUT with 100K threshold for celebrities
2. TWO-STAGE RANKING for latency within 220 CPU-seconds
3. 50/50 IN-NETWORK/OUT-OF-NETWORK for engagement
4. <1 SECOND SEARCH INDEXING via Kafka-backed pipeline

The main trade-off is read latency vs write amplification,
and we've optimized for the Twitter-specific case of extreme
follower counts.

Do you have any questions about specific components?"
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│              TWITTER INTERVIEW QUICK REFERENCE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OPENING QUESTIONS:                                             │
│  1. Focus area? (Timeline/Search/Trends)                        │
│  2. Scale? (250M DAU, 500M tweets/day)                          │
│  3. Celebrity handling? (150M followers scenario)               │
│                                                                 │
│  KEY DIFFERENTIATORS FROM FACEBOOK:                             │
│  • Unidirectional graph (follow, not friend)                    │
│  • Higher celebrity threshold (100K vs 10K)                     │
│  • Retweets 20x weight (more viral)                             │
│  • Real-time/news focus (faster cache invalidation)             │
│                                                                 │
│  ARCHITECTURE COMPONENTS TO DRAW:                               │
│  • CDN → LB → API Gateway → Core Services                       │
│  • Tweetypie (tweets), Home Mixer (timeline), Search (ES)       │
│  • Kafka (events), Navi (ML), GraphJet (graph)                  │
│  • Manhattan (KV), Redis (cache), MySQL (shards)                │
│                                                                 │
│  HYBRID FAN-OUT:                                                │
│  • <100K followers: PUSH to Redis timelines                     │
│  • ≥100K followers: PULL at read time                           │
│  • Saves trillions of writes/day                                │
│                                                                 │
│  TIMELINE PIPELINE:                                             │
│  • 1,500 candidates → Light rank → Heavy rank → 200 tweets      │
│  • 220 CPU-sec in 1.5s via parallelism                          │
│  • 50% in-network + 50% out-of-network                          │
│                                                                 │
│  GRACEFUL DEGRADATION:                                          │
│  • Level 1: Light ranker fallback                               │
│  • Level 2: Chronological timeline                              │
│  • Level 3: Cached stale response                               │
│                                                                 │
│  TRAP QUESTION ANSWERS:                                         │
│  • "Just scale?" → No, explain hybrid fan-out                   │
│  • "Like Facebook?" → No, explain unidirectional graph          │
│  • "ML fails?" → Circuit breaker + degradation levels           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
