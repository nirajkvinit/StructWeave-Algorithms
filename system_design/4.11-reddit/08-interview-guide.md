# Reddit: Interview Guide

[← Back to Index](./00-index.md) | [← Observability](./07-observability.md)

---

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

| Phase | Time | Focus | What to Cover |
|-------|------|-------|---------------|
| **Clarify** | 0-5 min | Scope & requirements | Voting vs threading vs both? Scale? |
| **High-Level** | 5-15 min | Core architecture | Services, data flow, key decisions |
| **Deep Dive** | 15-30 min | 1-2 critical components | Hot algorithm OR vote pipeline |
| **Scale & Trade-offs** | 30-40 min | Bottlenecks, failures | Subreddit isolation, manipulation |
| **Wrap Up** | 40-45 min | Summary, questions | Key trade-offs, what you'd do next |

### 60-Minute Format

| Phase | Time | Focus |
|-------|------|-------|
| Clarify | 0-7 min | Requirements, scope, constraints |
| High-Level | 7-20 min | Architecture, data flow |
| Deep Dive #1 | 20-35 min | Vote processing pipeline |
| Deep Dive #2 | 35-50 min | Comment threading OR hot algorithm |
| Scale & Edge Cases | 50-57 min | Failure scenarios, edge cases |
| Wrap Up | 57-60 min | Summary |

---

## Clarifying Questions

### Essential Questions to Ask

```
QUESTION 1: "Should I focus on the voting system, comment threading,
            or both?"

WHY: Reddit's core differentiators from other social platforms.
EXPECTED: Often "focus on voting" or "cover both at high level"
IMPACT: Determines deep dive areas

QUESTION 2: "What scale should I design for - tens or hundreds of
            millions of users?"

WHY: Establishes capacity requirements
EXPECTED: 100M+ DAU, 50M+ votes/day
USE: Inform sharding, caching decisions

QUESTION 3: "Should I cover vote manipulation prevention?"

WHY: Major security concern unique to Reddit
EXPECTED: Usually "yes, briefly" or "deep dive"
IF YES: Cover velocity limits, ring detection, shadowbanning

QUESTION 4: "Are we designing r/all (global feed) or just
            individual subreddits?"

WHY: r/all has unique aggregation challenges
EXPECTED: Focus on subreddits, mention r/all
IMPACT: Cross-subreddit query complexity

QUESTION 5: "Should I cover multiple ranking algorithms
            (Hot, Best, Rising)?"

WHY: Reddit uses different algorithms for different purposes
EXPECTED: Cover Hot in detail, mention others
IMPACT: Algorithm complexity, precomputation strategy
```

### Questions That Impress

```
"What's the expected read:write ratio for votes?"
→ Shows understanding of access patterns

"Should comments be eventually consistent or strongly consistent?"
→ Shows CAP theorem awareness

"How should we handle viral posts with 10K+ comments?"
→ Shows anticipation of edge cases

"Is pseudonymous identity important for the design?"
→ Shows understanding of Reddit's unique culture
```

---

## High-Level Architecture to Draw

### Minimum Viable Architecture

```
DRAW THIS FIRST (5 minutes):

┌─────────┐
│ Clients │
└────┬────┘
     │
┌────▼────┐
│ CDN/LB  │
└────┬────┘
     │
┌────▼────┐     ┌─────────────┐
│   API   │────►│ Vote Queue  │
│ Gateway │     │ (subreddit- │
└────┬────┘     │  sharded)   │
     │          └──────┬──────┘
     │                 │
┌────▼────┐     ┌──────▼──────┐
│  Core   │     │   Score     │
│Services │     │  Workers    │
└────┬────┘     └──────┬──────┘
     │                 │
┌────▼─────────────────▼────┐
│        Data Layer         │
│  PostgreSQL | Redis | ES  │
└───────────────────────────┘

Key Points to Mention:
1. Vote queue is subreddit-sharded
2. Score calculation is async
3. Hot lists are precomputed in Redis
4. Comments use hierarchical structure
```

### Service Breakdown

```
EXPLAIN THESE SERVICES:

Vote Service:
  - Accepts vote (up/down/unvote)
  - Validates, deduplicates
  - Queues for async processing
  - Returns optimistically

Feed Service:
  - Serves hot/new/rising/top
  - Reads from precomputed Redis lists
  - Falls back to compute on cache miss

Comment Service:
  - Builds comment trees
  - Handles "load more" pagination
  - Caches hot post trees

Subreddit Service:
  - Community metadata
  - Membership, moderation
  - Rules enforcement
```

---

## Deep Dive Options

### Option A: Vote Processing Pipeline

```
DEEP DIVE: VOTE PROCESSING

1. START WITH THE FLOW
   User clicks upvote → API → Validate → Queue → Workers → Update

2. EXPLAIN QUEUE SHARDING
   "We partition by subreddit_id % N to isolate hot subreddits"

3. SHOW THE HOT ALGORITHM
   hot_score = sign(score) × log₁₀(|score|) + seconds/45000

4. DISCUSS CONSISTENCY
   "Vote counts are eventually consistent (5-30 seconds)"
   "We use optimistic UI for immediate feedback"

5. ADDRESS MANIPULATION
   "Velocity limits, ring detection, shadowbanning"

TIME ALLOCATION:
  - Flow explanation: 3 min
  - Queue sharding: 4 min
  - Hot algorithm: 5 min
  - Consistency: 2 min
  - Manipulation: 3 min
```

### Option B: Comment Threading

```
DEEP DIVE: COMMENT THREADING

1. DATA MODEL
   Comments have parent_id (either post or another comment)
   Stored flat, tree built on read

2. TREE CONSTRUCTION
   Fetch all comments for post
   Build parent-child index
   Sort at each level (Best = Wilson score)
   Truncate + add "load more" stubs

3. PAGINATION
   Initial load: 200 comments, depth 10
   "Load more" fetches specific IDs
   Cursor-based for siblings

4. CACHING
   Hot post trees cached (60s TTL)
   Invalidate on new comment
   Precompute for top 1000 posts

TIME ALLOCATION:
  - Data model: 3 min
  - Tree construction: 5 min
  - Pagination: 4 min
  - Caching: 3 min
```

### Option C: Subreddit Isolation

```
DEEP DIVE: SUBREDDIT ISOLATION

1. THE PROBLEM
   r/wallstreetbets goes viral → 20x normal vote volume
   Without isolation, affects all of Reddit

2. QUEUE PARTITIONING
   partition = hash(subreddit_id) % 100
   Each partition has dedicated workers
   Hot partitions auto-scale

3. CACHE ISOLATION
   Per-subreddit hot lists in Redis
   Separate cache pools for hot subreddits

4. R/ALL AGGREGATION
   Sample from all subreddits
   Weight by activity
   Rate limit per-subreddit contribution

TIME ALLOCATION:
  - Problem statement: 2 min
  - Queue partitioning: 5 min
  - Cache isolation: 4 min
  - r/all: 4 min
```

---

## Trade-offs Discussion

### Key Trade-offs Table

| Decision | Option A | Option B | Reddit's Choice |
|----------|----------|----------|-----------------|
| **Vote consistency** | Strong (immediate) | Eventual (delayed) | **Eventual** (with optimistic UI) |
| **Comment storage** | Nested documents | Relational + build tree | **Relational** (PostgreSQL) |
| **Ranking updates** | Real-time per vote | Batch background | **Batch** (with priority) |
| **Hot subreddit handling** | Dedicated infra | Sharded queues | **Sharded queues** |
| **Algorithm selection** | Single algorithm | Multiple per sort | **Multiple** (Hot, Best, Rising, etc.) |

### Trade-off Discussion Template

```
TEMPLATE FOR DISCUSSING TRADE-OFFS:

"For [DECISION], I'm considering [OPTION A] vs [OPTION B]."

"Option A gives us [BENEFIT A] but costs us [DRAWBACK A]."
"Option B gives us [BENEFIT B] but costs us [DRAWBACK B]."

"Given our requirements for [KEY REQUIREMENT], I'd choose [CHOICE]
because [RATIONALE]."

EXAMPLE:

"For vote count consistency, I'm considering strong vs eventual.

Strong consistency means users always see accurate counts,
but requires synchronous writes to hot paths.

Eventual consistency allows async processing and better throughput,
but users might see stale counts for a few seconds.

Given our requirement for 58 million votes per day and the fact
that exact counts aren't critical for user experience, I'd choose
eventual consistency with optimistic UI updates."
```

---

## Trap Questions

### Trap 1: "Why not real-time vote count updates?"

```
❌ BAD ANSWER:
"We could use WebSockets to push updates to all viewers."

✅ GOOD ANSWER:
"With 58 million votes per day, real-time updates would create
massive write amplification. Consider a popular post:

  - 100,000 people viewing
  - 1,000 votes per minute
  - = 100 million push events per minute for ONE post

Instead, we use:
1. Optimistic UI - client shows immediate local update
2. Eventual consistency - actual counts within 5-30 seconds
3. Polling or refresh - client fetches updated counts
4. Batch processing - aggregate updates efficiently

The trade-off is slight staleness (seconds) for 100x better
write efficiency and simpler infrastructure."
```

### Trap 2: "How is Reddit different from Twitter?"

```
❌ BAD ANSWER:
"They're similar - both have posts and voting."

✅ GOOD ANSWER:
"Several fundamental architectural differences:

1. ORGANIZATION
   - Reddit: Community-based (subreddits)
   - Twitter: User-based (follow graph)

2. HOT SPOT PATTERN
   - Reddit: Subreddit-based (r/pics goes viral)
   - Twitter: Celebrity-based (Elon tweets)

3. RANKING MODEL
   - Reddit: Democratic voting (community decides)
   - Twitter: ML engagement prediction (algorithm decides)

4. IDENTITY
   - Reddit: Pseudonymous (throwaways common)
   - Twitter: Public identity (real names)

5. CONTENT STRUCTURE
   - Reddit: Hierarchical comments (deep threading)
   - Twitter: Flat replies (single level)

These differences drive different architectural choices:
Reddit needs subreddit sharding; Twitter needs celebrity fan-out handling.
Reddit needs vote manipulation prevention; Twitter needs bot detection."
```

### Trap 3: "What about vote manipulation?"

```
❌ BAD ANSWER:
"We can use CAPTCHAs and rate limiting."

✅ GOOD ANSWER:
"Vote manipulation is Reddit's equivalent of Twitter's bot problem.
We handle it with multiple layers:

1. VELOCITY LIMITS
   - Max 500 votes per user per hour
   - Per-subreddit limits (100/hour/sr)
   - Ramp limits for new accounts

2. RING DETECTION
   - Coordinated voting patterns
   - IP clustering analysis (same subnet)
   - Account relationship graphs
   - Voting history overlap

3. SHADOWBANNING
   - User's votes appear to count locally
   - Actually don't affect scores
   - User doesn't know they're banned
   - Effective for subtle manipulation

4. ML DETECTION (REV2)
   - Flink-based stream processing
   - Real-time behavioral analysis
   - Features: timing, patterns, account age

5. KARMA REQUIREMENTS
   - Minimum karma to post in some subreddits
   - Prevents throwaway spam

The key insight is that vote manipulation is harder to detect
than spam because votes are binary and high-volume."
```

### Trap 4: "How do you handle r/all?"

```
❌ BAD ANSWER:
"Just merge all the hot lists."

✅ GOOD ANSWER:
"r/all is a cross-subreddit aggregation challenge.

THE PROBLEM:
- Need to merge hot lists from 100K+ subreddits
- Can't query all in real-time
- Hot subreddits would dominate

SOLUTION:
1. SAMPLING
   - Top N posts from each active subreddit
   - Weighted by subscriber count (with cap)

2. RATE LIMITING
   - Max 3 posts per subreddit per page
   - Prevents r/funny from dominating

3. PRECOMPUTATION
   - Background job every 60 seconds
   - Merges and ranks samples
   - Cached in Redis

4. DIVERSITY CONSTRAINTS
   - Content type balance
   - Geographic distribution (for global r/all)

The trade-off is freshness - r/all updates lag individual
subreddits by 1-2 minutes. For a global view, this is acceptable."
```

### Trap 5: "Why ThingDB instead of a normal schema?"

```
❌ BAD ANSWER:
"It's just how Reddit was built."

✅ GOOD ANSWER:
"ThingDB is Reddit's two-table data model:

STRUCTURE:
- Thing Table: id, type, ups, downs, created_utc
- Data Table: thing_id, key, value

BENEFITS:
1. Schema flexibility - add attributes without migrations
2. Polymorphism - posts, comments, users are all 'things'
3. Common operations - voting works the same for all types
4. Evolution - Reddit added awards, flairs without schema changes

TRADE-OFFS:
1. More complex queries (JOINs across tables)
2. No type safety at database level
3. Harder to optimize indexes

For a platform that's evolved over 15+ years with changing
features, this flexibility was crucial. The performance cost
is mitigated by heavy caching."
```

---

## Key Numbers to Memorize

```
┌─────────────────────────────────────────────────────────────────┐
│                    REDDIT SCALE NUMBERS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  USERS:                                                         │
│    DAU: 116 million                                             │
│    MAU: 1+ billion                                              │
│                                                                 │
│  TRAFFIC:                                                       │
│    Votes/day: 58 million                                        │
│    Upvotes/month: 2.8 billion                                   │
│    Comments/day: 7.5 million                                    │
│    Posts/year: 430+ million                                     │
│                                                                 │
│  LATENCY TARGETS:                                               │
│    Vote p99: 150ms                                              │
│    Feed p99: 500ms                                              │
│    Comment load p99: 300ms                                      │
│                                                                 │
│  HOT ALGORITHM:                                                 │
│    Formula: sign(score) × log₁₀(|score|) + seconds/45000       │
│    Decay: 12.5 hours = 1 order of magnitude                    │
│    Implication: 10 votes = 100 votes + 12.5 hours               │
│                                                                 │
│  BEST ALGORITHM (Wilson Score):                                 │
│    Confidence: 95% (z = 1.96)                                   │
│    Favors: More total votes over high ratio                     │
│                                                                 │
│  INFRASTRUCTURE:                                                │
│    Vote queue partitions: 100                                   │
│    Go migration: 50% P99 latency reduction                      │
│    Cache hit rate: 90%+                                         │
│    Hot list TTL: 60 seconds                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | What to Do Instead |
|---------|--------------|-------------------|
| **Ignoring subreddit isolation** | Core Reddit challenge | Discuss queue sharding strategy |
| **Treating like Twitter** | Different model entirely | Explain community-based vs follow-based |
| **Real-time vote counts** | Won't scale | Eventual consistency with optimistic UI |
| **Flat comments** | Reddit is hierarchical | Discuss tree construction, depth limiting |
| **Missing vote manipulation** | Security critical | Cover detection strategies |
| **Single ranking algorithm** | Reddit has multiple | Cover Hot, Best, Rising, Controversial |
| **Ignoring ThingDB** | Core data model | Explain two-table architecture |
| **Celebrity-based hot spots** | Wrong pattern | Subreddit-based isolation |
| **Strong consistency everywhere** | Overkill | Eventual for votes, strong for content |
| **Not mentioning Go migration** | Shows current architecture | Reference 50% latency improvement |

---

## Sample Interview Walkthrough

### Opening (0-5 min)

```
INTERVIEWER: "Design Reddit."

YOU: "Before I dive in, let me clarify a few things.

First, what aspects should I focus on? The voting system,
comment threading, or the overall feed?

[Interviewer: Focus on voting and the feed]

Second, what scale should I design for?

[Interviewer: Think about Reddit's current scale]

Got it - so 100M+ DAU, 50M+ votes per day. Should I cover
vote manipulation prevention?

[Interviewer: Yes, briefly]

Perfect. Let me start with an overview and then deep dive
into the vote processing pipeline."
```

### High-Level (5-15 min)

```
YOU: "At a high level, Reddit has these core components:

[Draw architecture diagram]

1. CLIENTS - web, mobile, old Reddit
2. CDN/EDGE - Fastly for static content, logged-out feeds
3. API GATEWAY - auth, rate limiting, routing
4. CORE SERVICES:
   - Vote Service - handles upvotes/downvotes
   - Feed Service - serves hot/new/rising lists
   - Comment Service - threading, pagination
   - Subreddit Service - community management

5. QUEUE LAYER - critically, vote queues are sharded by subreddit
6. DATA LAYER - PostgreSQL (ThingDB model), Redis for hot lists

The key insight is that Reddit uses subreddit-based isolation,
unlike Twitter's celebrity-based fan-out problem."
```

### Deep Dive (15-30 min)

```
YOU: "Let me deep dive into the vote processing pipeline.

When a user clicks upvote:

1. REQUEST hits Vote Service
2. RATE LIMIT check - 60 votes/min per user
3. DEDUPLICATION - check if vote exists, update or insert
4. OPTIMISTIC RESPONSE - return success immediately
5. QUEUE - enqueue to subreddit-sharded queue
6. WORKER picks up batch of votes
7. SCORE CALCULATION - hot score formula:

   sign(score) × log₁₀(|score|) + seconds/45000

   This means 10 upvotes equals 100 upvotes from 12.5 hours ago.

8. UPDATE Redis sorted set for subreddit hot list
9. INVALIDATE caches as needed

The queue sharding is crucial. If r/wallstreetbets goes viral,
partition 42 gets overwhelmed but partitions 0-41 and 43-99
are unaffected."
```

### Trade-offs (30-40 min)

```
INTERVIEWER: "Why not update scores in real-time?"

YOU: "Great question. With 58 million votes per day, real-time
would mean:

1. 670 hot score calculations per second average
2. Each calculation updates Redis sorted sets
3. Cache invalidation cascade

Instead, we batch updates:
- Queue votes by subreddit
- Process in batches of 100
- Update hot lists every 30-60 seconds

The trade-off is 30-60 second staleness, which is acceptable
because:
1. Users get optimistic UI feedback immediately
2. Exact rankings aren't critical second-by-second
3. We save 100x in write operations

For manipulation prevention, we add:
- Velocity checks (500 votes/hour max)
- Ring detection (IP clustering)
- Shadowbanning (votes appear to work but don't count)"
```

### Wrap-up (40-45 min)

```
INTERVIEWER: "Any final thoughts?"

YOU: "Three key takeaways:

1. SUBREDDIT ISOLATION is Reddit's core scaling challenge,
   solved by queue sharding and per-subreddit hot lists.

2. DEMOCRATIC RANKING means community voting determines
   content value, requiring strong manipulation prevention.

3. EVENTUAL CONSISTENCY for vote counts is acceptable
   with optimistic UI, enabling massive write throughput.

If I had more time, I'd dive into:
- Comment tree construction and the Wilson score algorithm
- The Go migration that cut P99 latency by 50%
- r/all aggregation across 100K+ subreddits"
```

---

## Quick Reference for Last-Minute Review

```
REDDIT IN 60 SECONDS:

1. Community-based (subreddits), not user-based (followers)
2. Democratic ranking (votes), not ML prediction
3. Pseudonymous identity (throwaways OK)
4. Hierarchical threading (deep comment trees)

KEY NUMBERS:
- 116M DAU, 58M votes/day, 7.5M comments/day
- Hot algorithm: log(score) + seconds/45000
- 12.5 hours = 1 order of magnitude decay

ARCHITECTURE HIGHLIGHTS:
- ThingDB: Two-table model (Thing + Data)
- Vote queues: Subreddit-sharded
- Go migration: 50% latency reduction
- Precomputed hot lists: 60s TTL

UNIQUE CHALLENGES:
- Subreddit hot spots (not celebrity)
- Vote manipulation (not bots)
- Comment tree construction
- r/all aggregation
```

---

## Good luck with your interview!
