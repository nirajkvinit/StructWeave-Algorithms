# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45-Minute Format)

| Phase | Time | Focus | Key Activities |
|-------|------|-------|----------------|
| **Clarify** | 0-5 min | Requirements | Ask questions, scope the problem |
| **High-Level** | 5-15 min | Architecture | Draw core components, explain data flow |
| **Deep Dive** | 15-30 min | Critical Components | Pick 1-2 areas, go deep |
| **Scale & Trade-offs** | 30-40 min | Bottlenecks | Discuss failures, scaling strategies |
| **Wrap Up** | 40-45 min | Summary | Handle follow-ups, ask questions |

---

## Phase 1: Clarify Requirements (0-5 min)

### Questions to Ask

```
SCOPE QUESTIONS:

1. "What's the primary focus - News Feed, or the full platform?"
   → Narrow down to 1-2 core features

2. "What scale are we designing for?"
   → Likely answer: billions of users, millions of QPS

3. "Is this a new design or improving existing system?"
   → Determines constraints and migration concerns

4. "What's the read-to-write ratio?"
   → Confirms read-heavy (99:1 typical for social)

5. "Latency requirements?"
   → Feed: <100ms, Writes: <500ms

6. "Consistency requirements?"
   → Strong for user's own data, eventual for feed
```

### Sample Clarification Dialog

```
Interviewer: "Design Facebook"

You: "Great question. To make sure I focus on the right areas, let me ask
a few clarifying questions:

1. Should I focus on the News Feed system specifically, or include other
   features like messaging, groups, and pages?

2. What scale should I design for - are we talking about billions of users?

3. For consistency, is it acceptable for the feed to be eventually consistent,
   while ensuring users see their own posts immediately?

4. Any specific latency targets I should keep in mind?"

Interviewer: "Focus on News Feed. Yes, billions of users. Eventual consistency
for feed is fine. Target under 100ms for feed loading."

You: "Perfect. So I'll design a News Feed system at Facebook scale - about
2 billion DAU, supporting personalized feeds with sub-100ms latency. I'll
cover the social graph storage, content distribution, and ranking system.
Does that align with what you're looking for?"
```

---

## Phase 2: High-Level Design (5-15 min)

### Opening Statement

```
"Let me start with the high-level architecture. Facebook's News Feed
has three core challenges:

1. STORING the social graph - who's friends with whom
2. DISTRIBUTING content - getting posts to followers' feeds
3. RANKING content - personalizing the feed for each user

I'll design a system using TAO for graph storage, a hybrid fan-out
approach for distribution, and a multi-stage ML pipeline for ranking."
```

### Architecture to Draw

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WHITEBOARD ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   [Client] → [CDN] → [Load Balancer] → [API Gateway]                   │
│                                              │                          │
│              ┌───────────────────────────────┼───────────────────┐     │
│              │                               │                   │     │
│              ▼                               ▼                   ▼     │
│      [Feed Service]              [Post Service]        [Graph API]     │
│              │                        │                         │      │
│              │    ┌───────────────────┼─────────────────────────┘     │
│              │    │                   │                                │
│              ▼    ▼                   ▼                                │
│         [TAO Layer - Social Graph Cache]                               │
│              │                                                         │
│              ▼                                                         │
│      [Sharded MySQL - 100K+ shards]                                   │
│                                                                         │
│   PARALLEL SYSTEMS:                                                     │
│   • [Fan-out Queue] - distributes posts to feeds                       │
│   • [Ranking Service] - ML-based feed personalization                  │
│   • [Feed Cache] - precomputed user feeds                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Points to Mention

1. **TAO for Social Graph**
   - "Facebook uses TAO - a custom graph store with Objects and Associations"
   - "Two-tier cache: Leaders for consistency, Followers for read scaling"

2. **Hybrid Fan-out**
   - "Regular users: push posts to followers' feed caches (fan-out on write)"
   - "Celebrities: pull at read time to avoid write amplification"

3. **Three-Stage Ranking**
   - "Stage 1: Gather ~1500 candidates from friends, pages, groups"
   - "Stage 2: ML scoring for engagement and value prediction"
   - "Stage 3: Diversity filtering to final ~200 posts"

---

## Phase 3: Deep Dive Options (15-30 min)

### Option A: TAO Architecture Deep Dive

```
WHEN TO CHOOSE: If interviewer asks about data storage or consistency

KEY POINTS TO COVER:

1. Data Model
   • Objects: Users, Posts, Comments (id, type, data)
   • Associations: Friendships, Likes (id1, type, id2)
   • Object ID contains shard_id for routing

2. Sharding Strategy
   • 100K+ MySQL shards
   • Associations stored on source object's shard
   • Enables locality for friend-of-friend queries

3. Two-Tier Cache
   • Leaders: One per shard, authoritative, handles writes
   • Followers: Multiple per region, serve reads
   • Invalidation: Leader notifies followers on write

4. Consistency Model
   • Per-shard: Strong (single leader)
   • Cross-shard: Eventual
   • Read-your-writes: Route to leader after write

DIAGRAM TO DRAW:
   [Web Servers] → [TAO Followers (local)] → [TAO Leader] → [MySQL]
                          ↑                        │
                          └────── Invalidation ────┘
```

### Option B: News Feed Ranking Deep Dive

```
WHEN TO CHOOSE: If interviewer asks about personalization or ML

KEY POINTS TO COVER:

1. Three-Stage Pipeline
   Stage 1: Gather candidates (~1500)
   • Pushed posts from regular friends
   • Pulled posts from celebrities
   • Pages and groups the user follows

   Stage 2: ML Scoring
   • Extract features (user, post, author, context)
   • Predict engagement (P(like), P(comment), P(share))
   • Predict value (time well spent)
   • Integrity check (harmful content score)

   Stage 3: Diversity
   • No consecutive same-author posts
   • Balance content types (photos, videos, text)
   • Apply freshness boost

2. Signals Used
   • Explicit: likes, comments, shares, clicks
   • Implicit: view duration, scroll velocity
   • Social: friend closeness, mutual engagement
   • Context: time of day, device type

3. EdgeRank Evolution
   • Original: Affinity × Weight × Decay
   • Modern: Deep learning with 1000+ features

DIAGRAM TO DRAW:
   [Candidates 1500] → [Feature Extraction] → [ML Models] → [Diversity] → [Feed 200]
                              │
                       [User Features]
                       [Post Features]
                       [Context]
```

### Option C: Hot User Problem Deep Dive

```
WHEN TO CHOOSE: If interviewer asks about celebrities or scaling

KEY POINTS TO COVER:

1. Problem Statement
   • Celebrity with 100M followers posts
   • Fan-out on write: 100M cache writes per post
   • System overload, cascading failures

2. Hybrid Solution
   • Threshold: 10,000 followers
   • Below threshold: Push to followers' feeds
   • Above threshold: Pull at read time

3. Celebrity Post Flow
   • Store in celebrity index (not individual feeds)
   • At read time: Merge celebrity posts into feed
   • Optionally push to top 1000 most engaged followers

4. Dynamic Threshold
   • Adjust based on system load
   • Lower during peak hours
   • Higher during off-peak

TRADE-OFF:
   Push: Fast reads, high write cost
   Pull: Low write cost, slower reads
   Hybrid: Best of both for different user types
```

---

## Phase 4: Scale & Reliability (30-40 min)

### Bottleneck Discussion

```
TOP 3 BOTTLENECKS:

1. TAO Cache Invalidation Lag
   Problem: Cross-region eventual consistency
   Solution: Read-your-writes routing, bounded staleness

2. Feed Generation Latency
   Problem: 100ms budget, 1500 posts to score
   Solution: Precomputation for active users, tiered ranking

3. Write Amplification
   Problem: One post → 500 feed writes
   Solution: Hybrid fan-out, batch writes, selective fan-out
```

### Failure Scenario Handling

```
COMMON FAILURE SCENARIOS:

1. "What if TAO cache fails?"
   • Graceful degradation to stale data
   • Circuit breaker to prevent cascade
   • Fall back to chronological feed

2. "What if a MySQL shard is down?"
   • Automatic failover to replica
   • Single leader per shard for consistency
   • RPO: 0 (sync replication), RTO: <30 seconds

3. "What if ranking service is slow?"
   • Fallback to simpler model
   • Serve cached/precomputed feed
   • Circuit breaker after timeout

4. "What about regional failure?"
   • Multi-region active-active
   • DNS failover to backup region
   • Higher latency but functional
```

---

## Trade-offs Discussion

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Fan-out Strategy** | Write (push to all) | Read (pull at request) | **Hybrid** - Push for regular, Pull for celebrities |
| **Consistency** | Strong everywhere | Eventual everywhere | **Mixed** - Strong per-shard, Eventual cross-region |
| **Feed Freshness** | Real-time ranking | Periodic batch | **Hybrid** - Precompute + real-time merge |
| **Caching** | Aggressive (high hit rate) | Conservative (fresh data) | **Tiered** - Different TTLs per data type |
| **Database** | Single large DB | Many small shards | **Sharded** - 100K+ shards for scale |

### How to Discuss Trade-offs

```
STRUCTURE YOUR ANSWER:

"For [DECISION], we have two main options:

Option A: [DESCRIPTION]
  Pros: [LIST]
  Cons: [LIST]

Option B: [DESCRIPTION]
  Pros: [LIST]
  Cons: [LIST]

I recommend [CHOICE] because [REASONING based on requirements].

For Facebook's scale, [SPECIFIC JUSTIFICATION]."
```

---

## Trap Questions and Best Answers

### Trap 1: "Why not just use a single database?"

```
BAD ANSWER: "We need NoSQL" (vague, no reasoning)

GOOD ANSWER:
"A single database can't handle Facebook's scale. Let me break it down:

1. CAPACITY: 2 billion users × 500 friends = 1 trillion associations
   Single DB can't store or query this efficiently

2. THROUGHPUT: 700K feed requests/second, 521 cache reads each
   That's 364 million reads/second - no single DB handles this

3. AVAILABILITY: Single point of failure for 2B users
   We need geographic distribution

That's why Facebook uses 100K+ sharded MySQL instances behind TAO,
with aggressive caching to absorb the read load."
```

### Trap 2: "How do you handle a celebrity with 100M followers posting?"

```
BAD ANSWER: "Just fan-out to everyone" (doesn't scale)

GOOD ANSWER:
"This is the 'hot user' or 'celebrity problem'. Naive fan-out would mean
100M cache writes per post - that would overload the system.

The solution is HYBRID FAN-OUT:

For regular users (<10K followers): Push to followers' feeds
  • Write once to each follower's feed cache
  • Fast reads, acceptable write cost

For celebrities (≥10K followers): Pull at read time
  • Store post in celebrity index
  • When follower loads feed, merge celebrity posts
  • Avoids massive write amplification

We might also push to the top 1,000 most engaged followers
to ensure quick visibility for super-fans."
```

### Trap 3: "What if you need to ensure real-time freshness?"

```
BAD ANSWER: "Just always compute in real-time" (too slow)

GOOD ANSWER:
"There's a trade-off between freshness and latency. Here's how I'd balance it:

1. PRECOMPUTATION for most users
   • Generate feeds in background for active users
   • Serve from cache, fast response

2. INCREMENTAL UPDATES for new posts
   • When friend posts, add to precomputed feed
   • Don't regenerate entire feed

3. REAL-TIME MERGE for celebrities
   • Celebrity posts merged at read time (pulled)
   • Ensures fresh content from important sources

4. USER CONTROLS
   • 'Most Recent' option shows chronological
   • Explicit refresh triggers full regeneration

This gives sub-100ms latency while keeping feeds reasonably fresh."
```

### Trap 4: "How do you handle consistency across regions?"

```
BAD ANSWER: "Use strong consistency everywhere" (won't scale globally)

GOOD ANSWER:
"Global strong consistency would add too much latency. Instead, I'd use
a TIERED CONSISTENCY model:

1. PER-SHARD STRONG CONSISTENCY
   • Each shard has ONE leader region
   • Writes always go to leader
   • Prevents conflicts, ensures user sees their own writes

2. CROSS-REGION EVENTUAL CONSISTENCY
   • Async replication to other regions
   • Typically <1 second lag
   • Acceptable for social feed viewing

3. READ-YOUR-WRITES GUARANTEE
   • After writing, user reads route to leader
   • Avoids seeing stale version of own data
   • Session affinity or explicit routing

This balances consistency guarantees with global performance."
```

---

## Key Numbers to Memorize

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FACEBOOK SCALE NUMBERS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  USERS                                                                  │
│  • DAU: 2 billion (Facebook), 3.35 billion (Meta family)               │
│  • Average friends per user: 500                                        │
│  • Celebrity threshold: 10,000 followers                                │
│                                                                         │
│  TRAFFIC                                                                │
│  • Feed QPS: ~700,000 (peak)                                           │
│  • Post creates: ~10,000/second                                         │
│  • Likes: ~500,000/second                                               │
│  • Read:Write ratio: 99:1                                               │
│                                                                         │
│  LATENCY TARGETS                                                        │
│  • Feed load: <100ms p99                                                │
│  • Post create: <500ms p99                                              │
│  • Like/Comment: <200ms p99                                             │
│                                                                         │
│  INFRASTRUCTURE                                                         │
│  • MySQL shards: 100,000+                                               │
│  • TAO cache reads per page: 521                                        │
│  • Graph API rate limit: 200 calls/user/hour                           │
│                                                                         │
│  FEED                                                                   │
│  • Candidate pool: ~1,500 posts                                         │
│  • Final feed: ~200 posts                                               │
│  • Ranking stages: 3 (gather, score, diversity)                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | What to Do Instead |
|---------|--------------|-------------------|
| Jumping to solution | Misses requirements | Ask 3-5 clarifying questions first |
| Single database | Won't scale | Discuss sharding from the start |
| Ignoring celebrity problem | Shows lack of depth | Proactively mention hybrid fan-out |
| Strong consistency everywhere | Won't work globally | Explain tiered consistency model |
| Over-engineering day 1 | Unrealistic | Design for 10×, not 1000× initially |
| Ignoring failures | Incomplete design | Discuss graceful degradation |
| No trade-off discussion | Appears one-dimensional | Present options, justify choices |
| Forgetting privacy | Critical for social | Mention privacy checks in feed |

---

## Questions to Ask the Interviewer

At the end, ask 1-2 thoughtful questions:

```
GOOD QUESTIONS:

1. "I designed for eventual consistency on the feed. Are there specific
   features where you'd need stronger guarantees?"

2. "I focused on feed personalization. Would you like me to dive deeper
   into any other aspect like the social graph or Graph API?"

3. "For the ranking system, I mentioned ML scoring. Would you like me to
   elaborate on the specific signals or model architecture?"

4. "I assumed mobile-first traffic patterns. Does this system need to
   optimize differently for web vs mobile clients?"
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INTERVIEW QUICK REFERENCE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  5 KEY CONCEPTS TO MENTION:                                             │
│  1. TAO (social graph store with two-tier cache)                        │
│  2. Hybrid fan-out (push for regular, pull for celebrities)             │
│  3. Three-stage ranking (gather → score → diversity)                    │
│  4. Sharded MySQL (100K+ shards)                                        │
│  5. Tiered consistency (strong per-shard, eventual cross-region)        │
│                                                                         │
│  3 TRADE-OFFS TO DISCUSS:                                               │
│  1. Fan-out: Write amplification vs read latency                        │
│  2. Consistency: Freshness vs global performance                        │
│  3. Ranking: Real-time accuracy vs precomputed speed                    │
│                                                                         │
│  3 NUMBERS TO KNOW:                                                     │
│  • 2B DAU, 700K feed QPS                                                │
│  • 521 cache reads per page request                                     │
│  • 10K follower threshold for celebrities                               │
│                                                                         │
│  OPENING LINE:                                                          │
│  "Facebook's News Feed has three core challenges: storing the           │
│   social graph, distributing content, and ranking for personalization." │
│                                                                         │
│  CLOSING LINE:                                                          │
│  "To summarize: TAO for graph storage, hybrid fan-out for               │
│   distribution, and ML ranking for personalization, all designed        │
│   for 2B users at 700K QPS with sub-100ms latency."                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Related Interview Topics

If asked about variations:

| Variation | Key Differences |
|-----------|----------------|
| **Instagram** | More visual focus, Explore tab, Stories |
| **Twitter/X** | Public by default, shorter content, trends |
| **LinkedIn** | Professional graph, job recommendations |
| **TikTok** | Algorithm-heavy (not social graph based), short video |

---

*[← Back to Index](./00-index.md)*
