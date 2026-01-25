# Interview Guide

## Interview Pacing (45-Minute Format)

| Phase | Time | Focus | Deliverables |
|-------|------|-------|--------------|
| **Clarify** | 0-5 min | Requirements gathering | Scale, content type, latency, cold start |
| **High-Level Design** | 5-15 min | Architecture | Two-stage diagram, data flow |
| **Deep Dive** | 15-30 min | Critical component | Two-tower OR ranking OR feature store |
| **Scale & Reliability** | 30-40 min | Production concerns | Bottlenecks, failures, trade-offs |
| **Wrap Up** | 40-45 min | Summary | Key decisions, questions |

---

## Phase 1: Clarify Requirements (0-5 min)

### Questions to Ask

```
MUST ASK:

1. "What type of content/items are we recommending?"
   - Video (Netflix/YouTube): Long consumption, completion matters
   - Music (Spotify): Sequential, playlist context
   - Products (Amazon): Purchase intent, price sensitivity
   - Social content (TikTok): Short-form, rapid iteration

2. "What's the expected scale?"
   - Users: Millions vs Billions
   - Items: Thousands vs Hundreds of millions
   - QPS: Thousands vs Millions

   Listen for: "Netflix scale" = 200M+ users, "TikTok scale" = 1B+ users

3. "What latency is acceptable?"
   - Real-time (<100ms): Feed, homepage
   - Near real-time (<1s): Email recommendations
   - Batch (hours): Weekly digests

4. "What signals do we have?"
   - Explicit (ratings, likes): Higher quality, sparse
   - Implicit (views, clicks, time): Lower quality, dense
   - Context (device, time, location): Useful for ranking

5. "How important is cold start?"
   - New user rate: 1% vs 10% of traffic
   - New item rate: 100/day vs 100K/day

GOOD TO ASK:

6. "Read-heavy or write-heavy?"
   - Recommendations: Read-heavy
   - But training data ingestion: Write-heavy

7. "Global or regional?"
   - Latency implications
   - Content availability differences

8. "Any specific optimization goals?"
   - Engagement (time, clicks)
   - Conversion (purchases, subscriptions)
   - Diversity (coverage, freshness)
```

### Sample Clarification Dialog

```
YOU: "Before I dive in, let me understand the requirements. What type
     of content are we recommending?"

INTERVIEWER: "Videos, like a streaming platform."

YOU: "Great. What scale are we targeting - users and catalog size?"

INTERVIEWER: "Let's say 100 million users, 10 million videos."

YOU: "And for latency, is this real-time homepage recommendations
     or batch-generated?"

INTERVIEWER: "Real-time, users expect instant response."

YOU: "What signals do we have - explicit ratings or implicit behavior?"

INTERVIEWER: "Mainly implicit - watch history, completion rates, clicks."

YOU: "Last question - how important is handling new users and new content?"

INTERVIEWER: "Very important. We add 10,000 videos daily and have
              significant new user signup."

YOU: "Perfect. Let me summarize: Real-time video recommendations for
     100M users across 10M videos, using implicit signals, with
     strong cold start requirements. I'll design for <100ms latency
     and ~99.99% availability. Let me start with the architecture."
```

---

## Phase 2: High-Level Design (5-15 min)

### Opening Statement

```
"I'll design a two-stage recommendation system. This is the industry
standard approach used by Netflix, YouTube, and Spotify because it
balances accuracy with computational feasibility.

The key insight is: we can't score all 10 million items for every request.
Instead, we:
1. RETRIEVE: Use cheap O(log N) search to find 1000-5000 candidates
2. RANK: Use expensive but accurate models to score these candidates

Let me draw the architecture..."
```

### Architecture to Draw

```
[Draw this on whiteboard or describe verbally]

CLIENT → API Gateway → Recommendation Service
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
              RETRIEVAL            USER PROFILE
                    ↓                   ↓
            ┌───────┼───────┐     FEATURE STORE
            ↓       ↓       ↓           ↓
         Collab  Content Trending       ↓
            ↓       ↓       ↓           ↓
         VECTOR DATABASE                ↓
                    ↓                   ↓
              CANDIDATES (5000)         ↓
                    └─────────┬─────────┘
                              ↓
                          RANKING
                              ↓
                       MODEL SERVER (GPU)
                              ↓
                        RE-RANKING
                        (Diversity)
                              ↓
                      TOP 50 RESULTS
```

### Key Points to Mention

```
1. TWO-STAGE ARCHITECTURE:
   "Retrieval narrows 10M → 5K using embedding similarity.
    Ranking scores 5K items with rich features."

2. TWO-TOWER MODEL FOR RETRIEVAL:
   "User tower and item tower learn embeddings separately.
    Item embeddings pre-computed, user embedding computed at request time.
    Similarity = dot product. Enables fast ANN search."

3. MULTI-SOURCE RETRIEVAL:
   "We don't rely on single source. Combine:
    - Collaborative (users like you liked)
    - Content (similar to what you watched)
    - Trending (popular items)
    This handles cold start and improves coverage."

4. FEATURE STORE:
   "Separate online and offline stores.
    Online: Low latency (Redis), real-time features
    Offline: Training data, point-in-time correctness"

5. ANN SEARCH:
   "HNSW algorithm - O(log N) search.
    Pre-built index on item embeddings.
    Sharded for scale (25M items per shard)."
```

---

## Phase 3: Deep Dive (15-30 min)

### Option A: Two-Tower Embedding Model

```
INTERVIEWER: "Tell me more about the two-tower model."

RESPONSE:

"The two-tower architecture is central to modern retrieval systems.

ARCHITECTURE:
- User Tower: Takes user features → MLP → 256-dim embedding
- Item Tower: Takes item features → MLP → 256-dim embedding
- Towers are SEPARATE - no interaction until similarity computation

WHY SEPARATE TOWERS?
The key insight: Item tower can be pre-computed.
- 10M items × one embedding computation = done offline
- At serving time, only compute user embedding once
- Then do fast dot product similarity

TRAINING:
We use contrastive learning:
- Positive pairs: (user, item they interacted with)
- Negative sampling: Items user didn't interact with

Key challenge: HARD NEGATIVE SAMPLING
- Easy negatives (random items) don't help much
- Hard negatives (popular items user skipped) are informative
- In-batch negatives: Other items in same batch as negatives

LOSS FUNCTION:
Softmax cross-entropy over (positive, negatives)
Temperature parameter controls how 'soft' the distribution is

SERVING:
1. Compute user embedding (one MLP forward pass)
2. ANN search against pre-indexed item embeddings
3. Return top-K most similar items

This gives us O(log N) retrieval instead of O(N)!"
```

### Option B: ANN Search Deep Dive

```
INTERVIEWER: "How does the vector search work at scale?"

RESPONSE:

"We use HNSW - Hierarchical Navigable Small World graphs.

INTUITION:
Think of it as a multi-level skip list, but for vectors:
- Top layer: Sparse graph, long-range connections
- Bottom layer: Dense graph, precise neighbors
- Search: Start at top, greedily descend to bottom

WHY NOT BRUTE FORCE?
- 10M items × 256 dims × 4 bytes = 10GB
- Each query: 10M dot products
- At 1M QPS: 10 trillion operations/sec (impossible)

HNSW APPROACH:
- Build: O(N log N) - create multi-layer graph
- Query: O(log N) - navigate graph to find neighbors
- Recall: ~95% at 10x faster than brute force

KEY PARAMETERS:
- M (connections per node): 16 typical
- ef_construction (build quality): 200
- ef_search (query quality): 100 - trade-off vs latency

SHARDING FOR SCALE:
At 100M items, single index doesn't fit in memory:
- Shard by item_id hash
- 4 shards × 25M items each
- Scatter-gather query pattern
- Merge results from all shards

INDEX UPDATES:
- Incremental: Add new items every 15 min
- Full rebuild: Daily, during low traffic
- Atomic swap: Replace old index with new"
```

### Option C: Feature Store Deep Dive

```
INTERVIEWER: "Explain the feature store architecture."

RESPONSE:

"The feature store solves a critical problem: training-serving skew.

THE PROBLEM:
- Training: Features computed in batch, offline
- Serving: Features fetched in real-time
- If computed differently → model performs poorly in production

ARCHITECTURE:
Two-tier store:

1. ONLINE STORE (Redis):
   - Low latency (<10ms)
   - Recent features (last 24h aggregations)
   - Session features (last 10 interactions)
   - Key: user_id or item_id

2. OFFLINE STORE (Data Lake):
   - Full history
   - Point-in-time queries
   - Used for training data generation

CONSISTENCY GUARANTEE:
Same feature definition used everywhere:
- Define once in feature registry
- Serving: Materialize to online store
- Training: Point-in-time join from offline store

POINT-IN-TIME CORRECTNESS:
Critical for training! If user clicked at T=100:
- WRONG: Use features as of now
- RIGHT: Use features as of T=100

Implementation: Join on timestamp, filter to before event time

REAL-TIME FEATURES:
- Stream processor consumes events
- Updates windowed aggregations (5min, 1hr, 24hr)
- Writes to online store
- Latency: <1 minute from event to feature availability"
```

---

## Phase 4: Scale & Reliability (30-40 min)

### Bottleneck Discussion

```
INTERVIEWER: "What are the main bottlenecks?"

RESPONSE:

"Let me identify the top 3 bottlenecks:

1. FEATURE FETCH LATENCY
   Problem: 500 features × 50μs = 25ms (over budget)
   Solution:
   - Batch fetch with pipelining (single round trip)
   - Feature importance pruning (top 100 features only)
   - L1 cache for hot features
   Result: 25ms → 5ms

2. ANN SEARCH AT SCALE
   Problem: 100M items, need <20ms
   Solution:
   - Shard across 4 nodes (25M each)
   - Product quantization for memory
   - GPU acceleration if needed
   Result: Parallel queries, <15ms

3. RANKING MODEL THROUGHPUT
   Problem: 1M QPS × 5K candidates = 5B ops/sec
   Solution:
   - Two-stage: Pre-ranker filters 5K → 500
   - Dynamic batching on GPU
   - Model distillation for serving
   Result: Manageable GPU fleet"
```

### Cold Start Discussion

```
INTERVIEWER: "How do you handle cold start?"

RESPONSE:

"Cold start has two cases:

NEW USERS:
1. First request: Use demographic embedding
   - Map (country, device, language) → embedding
   - Learned during training

2. First few interactions: Popularity + exploration
   - Show trending items
   - Use epsilon-greedy: 10% random exploration

3. After ~10 interactions: Switch to personalized
   - Compute embedding from interaction history
   - Gradually reduce exploration

NEW ITEMS:
1. Content-based embedding
   - Use metadata (title, description, category)
   - Text encoder → embedding

2. Freshness boost
   - Increase retrieval score for new items
   - Decay over 7 days

3. Exploration budget
   - Reserve 5-10% of recommendations for exploration
   - Use Thompson Sampling to balance explore/exploit

KEY INSIGHT: Hybrid approach is essential.
Pure collaborative filtering fails on cold start.
Content features provide a 'warm' start."
```

### Failure Scenarios

```
INTERVIEWER: "What happens if the ranking model fails?"

RESPONSE:

"I'd implement graceful degradation with multiple fallback levels:

LEVEL 0 (NORMAL):
Full pipeline - retrieval, features, GPU ranking, diversity

LEVEL 1 (GPU FAILURE):
- Skip GPU ranking
- Use pre-ranker scores (simpler CPU model)
- Quality: 80% of normal

LEVEL 2 (FEATURE STORE FAILURE):
- Skip rich features
- Rank by retrieval similarity only
- Quality: 60% of normal

LEVEL 3 (RETRIEVAL FAILURE):
- Return popular/trending items
- No personalization
- Quality: 30% of normal

IMPLEMENTATION:
- Circuit breakers on each component
- Timeout budgets: If ranking takes >50ms, skip
- Automatic detection and fallback

The key: Always return SOMETHING.
A degraded recommendation is better than an error."
```

---

## Trade-offs Discussion

| Trade-off | Option A | Option B | Recommendation |
|-----------|----------|----------|----------------|
| **Recall vs Latency** | More candidates (better recall) | Fewer candidates (lower latency) | Tune per use case; start with 5K |
| **Personalization vs Cold Start** | Collaborative (personal) | Content-based (cold start) | Hybrid two-tower model |
| **Freshness vs Stability** | Frequent model updates | Stable model | Daily model, real-time features |
| **Exploration vs Exploitation** | More exploration (discovery) | More exploitation (engagement) | Epsilon-greedy, ε=0.05 |
| **Simple vs Complex Model** | Fast, interpretable | Better accuracy | Two-stage (simple retrieval, complex ranking) |
| **Online vs Offline Features** | Fresh but expensive | Stale but cheap | Tiered: real-time for critical, batch for rest |

---

## Trap Questions and Best Answers

### Trap 1: "Why not just use collaborative filtering?"

```
BAD ANSWER: "CF is good enough for most cases."

GOOD ANSWER:
"Collaborative filtering alone has several limitations:

1. COLD START
   - New users have no interactions → can't find similar users
   - New items have no interactions → never recommended

2. SPARSITY
   - Most users interact with <0.01% of items
   - User-user similarity matrix is extremely sparse

3. POPULARITY BIAS
   - Popular items dominate
   - Long-tail items rarely recommended

4. NO CONTENT UNDERSTANDING
   - Can't leverage item metadata
   - Can't explain recommendations

SOLUTION: Two-tower model combines:
- Collaborative signals through interaction-based training
- Content signals through item features in the tower
- Neural network captures complex non-linear patterns

This is why Netflix, Spotify, and YouTube all use hybrid approaches."
```

### Trap 2: "Why not score all items with the neural model?"

```
BAD ANSWER: "We could, with enough GPUs."

GOOD ANSWER:
"Let me do the math:

- 100M items to score per request
- 1M requests per second
- = 100 trillion scoring operations per second

Even with 1 microsecond per score:
- Need 100 million GPU-seconds per second
- That's 100 million GPUs running continuously

TWO-STAGE makes this feasible:
- Retrieval: O(log N) via ANN = ~5000 candidates
- Ranking: 5000 × 1M = 5 billion ops/sec
- With batching: ~5000 GPUs (still a lot, but feasible)

Some recent work explores 'generative retrieval' (Pinterest's PinRec)
using transformers, but two-stage remains the industry standard
because of this fundamental scalability constraint."
```

### Trap 3: "How do you prevent filter bubbles?"

```
BAD ANSWER: "Just recommend diverse items."

GOOD ANSWER:
"Filter bubbles occur when we only recommend what users already like,
creating echo chambers. This is both a UX problem and ethical concern.

MITIGATION STRATEGIES:

1. DIVERSITY CONSTRAINT in re-ranking:
   - MMR (Maximal Marginal Relevance)
   - Penalize items similar to already-selected items

2. EXPLORATION BUDGET:
   - Reserve 5-10% for non-personalized items
   - Thompson Sampling for explore/exploit balance

3. CATEGORY CAPS:
   - Max 3-5 items from same category
   - Ensures variety across topics

4. FRESHNESS BOOSTING:
   - Promote new content
   - Prevents stagnation

5. SERENDIPITY SIGNAL:
   - Occasionally include 'surprising' items
   - Items similar to diverse user's taste

TRADE-OFF: Short-term engagement often decreases with diversity.
But long-term retention improves.
We A/B test to find the right balance."
```

### Trap 4: "What about position bias in your training data?"

```
BAD ANSWER: "We log all impressions equally."

GOOD ANSWER:
"Position bias is a critical issue. Items shown at position 1 get
clicked much more often than position 10, regardless of relevance.

THE PROBLEM:
- Users click on position 1 → model learns 'position 1 is good'
- Creates feedback loop → always recommend same items
- This is NOT learning user preference, it's learning position

SOLUTIONS:

1. INVERSE PROPENSITY WEIGHTING:
   - Weight = 1 / P(click | position)
   - Down-weight clicks from prominent positions
   - Up-weight clicks from lower positions

2. POSITION AS FEATURE:
   - Include position as model input
   - Model learns to factor it out
   - At serving time, set position = 1 for all

3. RANDOMIZATION:
   - Occasionally randomize positions
   - Collect unbiased data (expensive)
   - Used sparingly (hurts UX)

4. COUNTERFACTUAL LEARNING:
   - Train on 'what would user click if shown at same position'
   - More advanced, but effective

Netflix and YouTube explicitly address this in their systems."
```

---

## Key Numbers to Memorize

| Metric | Value | Context |
|--------|-------|---------|
| Serving latency p99 | <100ms | User experience threshold |
| Retrieval latency | <20ms | Leave budget for ranking |
| Ranking latency | <50ms | GPU with batching |
| Feature fetch latency | <10ms | Redis round-trip |
| Candidates from retrieval | 1K-10K | Balance recall/cost |
| Final recommendations | 10-100 | UI constraints |
| Embedding dimension | 128-512 | 256 typical |
| HNSW ef_search | 50-200 | Recall/latency trade-off |
| ANN recall@1000 | >95% | Acceptable for HNSW |
| Model update frequency | Daily | Batch retraining |
| Cold start threshold | 10-50 | Interactions before personalization |
| Exploration rate | 5-10% | Discovery vs engagement |
| A/B test sample size | ~30K per variant | For 5% MDE, 95% power |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Scoring all items | Doesn't scale (O(N)) | Two-stage: retrieval + ranking |
| Single retrieval source | Misses coverage, fails cold start | Multi-source: CF + content + trending |
| Training on all impressions | Position bias | Inverse propensity weighting |
| Ignoring cold start | 10-30% of traffic affected | Hybrid content + collaborative |
| Over-optimizing engagement | Filter bubbles, user fatigue | Include diversity constraints |
| Same features for all stages | Inefficient | Simple features for retrieval, rich for ranking |
| Sync embedding updates | Creates latency | Async updates, versioned indexes |

---

## Quick Reference Card

```
+-----------------------------------------------------------------------+
|         RECOMMENDATION ENGINE - INTERVIEW QUICK REFERENCE              |
+-----------------------------------------------------------------------+
|                                                                        |
|  TWO-STAGE ARCHITECTURE (Why?)                                         |
|  ─────────────────────────────                                         |
|  Can't score 100M items per request (100T ops/sec impossible)          |
|  Stage 1: Retrieval O(log N) → 5K candidates                           |
|  Stage 2: Ranking O(K) → Top 50                                        |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  TWO-TOWER MODEL                    HNSW ALGORITHM                     |
|  ─────────────────                  ───────────────                    |
|  User tower → user_emb              Multi-layer graph                  |
|  Item tower → item_emb              Top: sparse, long jumps            |
|  Similarity = dot(u, i)             Bottom: dense, precise             |
|  Items pre-indexed offline          Search: O(log N)                   |
|                                     Recall: ~95%                       |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  COLD START SOLUTIONS               DIVERSITY TECHNIQUES               |
|  ────────────────────               ────────────────────               |
|  New users:                         MMR re-ranking                     |
|  - Demographic embedding            Category caps                      |
|  - Popular items                    Exploration (ε-greedy)             |
|  - Exploration (ε=0.1)              Freshness boost                    |
|                                                                        |
|  New items:                         POSITION BIAS                      |
|  - Content embedding                ─────────────────                  |
|  - Freshness boost                  Inverse propensity weighting       |
|  - Thompson sampling                Position as feature                |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  LATENCY BUDGET                     SCALE TARGETS                      |
|  ──────────────                     ─────────────                      |
|  Total: <100ms                      1B users, 100M items               |
|  Retrieval: <20ms                   1M QPS                             |
|  Features: <10ms                    99.99% availability                |
|  Ranking: <50ms                                                        |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  FALLBACK STRATEGY                                                     |
|  ─────────────────                                                     |
|  L0: Full → L1: Pre-ranker → L2: Retrieval → L3: Popular → L4: Static  |
|                                                                        |
+-----------------------------------------------------------------------+
```

---

## Real-World References

| Company | System | Key Paper/Blog | Key Innovation |
|---------|--------|----------------|----------------|
| **YouTube** | Deep Neural Networks | "Deep Neural Networks for YouTube Recommendations" (2016) | Two-stage, watch time optimization |
| **Netflix** | Personalization | "Artwork Personalization at Netflix" | Contextual bandits, A/B testing at scale |
| **Pinterest** | PinSage, PinRec | "Graph Convolutional Neural Networks" (2018), "PinRec" (2024) | GNNs, generative retrieval |
| **Spotify** | Discover Weekly | "How Discover Weekly Works" | Two-tower, audio features |
| **TikTok** | For You | "Monolith: Real Time Recommendation" | Real-time learning, embedding collisions |
| **Alibaba** | MIND | "Multi-Interest Network with Dynamic Routing" | Multi-interest representation |
| **Google** | Two-Tower | "Sampling-Bias-Corrected Neural Modeling" | In-batch negatives, bias correction |
