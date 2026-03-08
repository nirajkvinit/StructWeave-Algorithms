# Key Insights: Recommendation Engine

## Insight 1: Two-Stage Architecture Is a Computational Necessity, Not a Design Preference

**Category:** Scaling
**One-liner:** Scoring all 100M items per request at 1M QPS would require 100 trillion operations/second -- the two-stage funnel (ANN retrieval then neural ranking) is the only feasible architecture.

**Why it matters:** The two-stage split exists because of a hard mathematical constraint: a neural ranking model that takes 1ms per item would need 100,000 seconds to score 100M items per request. Stage 1 uses O(log N) HNSW approximate nearest neighbor search to narrow 100M items to 1K-10K candidates in under 20ms. Stage 2 then applies an expensive Deep & Wide neural network (with 500+ features per candidate) only on this manageable subset. The further optimization of a pre-ranker (lightweight CPU model) between stages reduces GPU candidates from 5,000 to 500, cutting GPU requirements by 10x. This funnel pattern -- cheap broad filter followed by expensive precise scoring -- applies to any system where the item space is orders of magnitude larger than what can be scored per request.

---

## Insight 2: Multi-Source Retrieval with Reciprocal Rank Fusion

**Category:** Data Structures
**One-liner:** Retrieve candidates from 5+ independent sources (collaborative, content, trending, recent-similar, creator-based) and fuse rankings using RRF with a multi-source bonus to prevent single-source failure from killing recommendations.

**Why it matters:** No single retrieval source covers all scenarios. Collaborative filtering fails for new users (cold start), content-based creates filter bubbles, and trending ignores personalization. The multi-source strategy allocates explicit budgets per source (50% collaborative, 20% content, 10% trending, 15% recent-similar, 5% creator), executes all retrievals in parallel, and merges using Reciprocal Rank Fusion: score = 1/(60+rank). Items appearing in multiple sources get a bonus multiplier (1 + 0.1 x source_count), rewarding cross-source agreement. When a source fails, its budget is dynamically redistributed (e.g., collaborative failure boosts content 1.5x and trending 1.5x). This design ensures the system degrades gracefully rather than failing completely when any single retrieval path breaks.

---

## Insight 3: Versioned Embeddings to Prevent Cross-Version Similarity Corruption

**Category:** Consistency
**One-liner:** All embeddings in a single query must come from the same model version -- mixing user embeddings from V1 with item embeddings from V2 produces meaningless similarity scores.

**Why it matters:** This is a subtle but devastating race condition. When the embedding pipeline updates from model V1 to V2, a query might fetch the user embedding (computed with V1) and item embeddings (already updated to V2). Since V1 and V2 embed into different vector spaces, their dot-product similarity is mathematically meaningless -- the rankings become essentially random. The solution uses versioned embedding namespaces: all embeddings carry a model version tag, queries specify which version to use, and the active version pointer is swapped atomically only after all embeddings have been recomputed. This copy-on-write approach ensures every query sees a consistent embedding space, at the cost of temporarily storing two full copies during the transition.

---

## Insight 4: Training-Serving Skew Prevention Through Unified Feature Definitions

**Category:** Consistency
**One-liner:** Features must be defined once and used identically for both training (offline) and serving (online) -- different code paths between training and serving silently corrupt model performance.

**Why it matters:** Training-serving skew is the silent killer of recommendation quality. It occurs when a feature like "user_views_7d" is computed differently during training (batch SQL aggregation) versus serving (real-time Redis counter), producing subtly different values. The feature store solves this with a single feature definition that generates both online and offline computation logic. The critical addition is point-in-time correctness for training: when creating training data for "User clicked Item at T=100," the feature "user_views_7d" must reflect its value at T=100, not the current value. Using the current value is data leakage that inflates offline metrics but degrades production performance. A periodic reconciliation job samples 10,000 entities and compares online vs. offline values, alerting when inconsistency exceeds 1%.

---

## Insight 5: Two-Level Embeddings (Base + Session Delta) for Real-Time Personalization

**Category:** Caching
**One-liner:** Blend a daily-updated base embedding (70% weight) with a real-time session embedding computed from recent interactions (30% weight) to capture evolving user interests without retraining.

**Why it matters:** Daily batch-computed embeddings create a 24-hour staleness gap. A user who starts browsing electronics after months of browsing books will get book recommendations for up to a day. The two-level approach computes a session embedding as a recency-weighted average of item embeddings from the current session, then blends it with the base embedding: final = 0.7 x base + 0.3 x session. This provides real-time personalization without the cost of continuous embedding retraining. An alternative "fast lane" approach injects session-based features directly into the ranking model (last 10 item embeddings, session category distribution, session interaction count), letting the ranker learn to use session signals without any embedding updates at all.

---

## Insight 6: Dynamic Batching with Adaptive Sizing for GPU Inference

**Category:** Cost Optimization
**One-liner:** Accumulate ranking requests for up to 5ms, form GPU-optimal batches (padded to power-of-2), and dynamically adjust batch size based on load to maximize GPU utilization while meeting latency SLOs.

**Why it matters:** At 1M QPS with 5,000 candidates per request, naive per-request GPU inference would require 50,000 GPUs. Dynamic batching amortizes the GPU kernel launch overhead by collecting multiple requests into a single batch. The batcher waits up to 5ms (max_wait_time) or until 64 requests accumulate (max_batch_size), whichever comes first. Under high load, it triggers early when average queue wait exceeds 80% of the deadline. Under low load with headroom, it grows batch sizes (up to 128) and wait times (up to 10ms) for better GPU utilization. Batches are padded to power-of-2 sizes for optimal GPU tensor operations. Combined with TensorRT optimization and model distillation (10M-param student achieving 95% of 100M-param teacher quality at 10x speed), this reduces the GPU fleet from 50,000 to a manageable number.

---

## Insight 7: Sticky Routing During Model Canary Deployment

**Category:** Resilience
**One-liner:** During model rollout transitions, use request-ID-based sticky routing so that retries within a single request always hit the same model version, preventing inconsistent rankings.

**Why it matters:** When deploying a new ranking model via canary (1% then 10% then 50% then 100%), a request that fails and retries might hit a different pod running a different model version, producing inconsistent rankings within the same user session. The sticky routing solution hashes the request ID to deterministically assign each request to either the old or new model version throughout the deployment. The canary validation checks four critical properties: latency regression (<10% p99 increase), error rate (<1%), business metric stability (CTR within 5%), and score distribution similarity (KS test p-value > 0.01). If any check fails, the rollback atomically reverts traffic splits and notifies on-call, preventing a bad model from reaching full production.

---

## Insight 8: Feature Importance Pruning to Meet the 10ms Feature Fetch Budget

**Category:** Caching
**One-liner:** Prune 500 features down to the top 100 by model importance, and fetch them via Redis pipeline in a single round-trip, reducing feature fetch latency from 25ms to 2ms.

**Why it matters:** With 500 features and 50 microseconds per Redis GET, sequential fetching takes 25ms -- exceeding the 10ms budget for the entire feature fetch phase. The fix combines three techniques: (1) Redis pipelining groups all feature GETs for an entity into a single round-trip, collapsing 500 sequential calls into one 2ms pipeline; (2) feature importance pruning identifies the top 100 features by model feature importance scores, reducing fetch volume by 5x with minimal ranking quality loss; (3) an L1 in-process cache with 1-second TTL catches repeated feature lookups within the same request batch. Together, these optimizations achieve a 12x latency reduction while maintaining ranking quality.
