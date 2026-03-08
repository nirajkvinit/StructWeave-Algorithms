# Key Insights: Reddit

## Insight 1: Subreddit-Sharded Vote Queues for Hot Spot Isolation

**Category:** Partitioning
**One-liner:** Sharding vote processing queues by subreddit ensures that a viral post in one community cannot degrade vote processing for the entire platform.

**Why it matters:** When r/wallstreetbets goes viral with 20x normal traffic, its votes all hash to a single queue partition. That partition can auto-scale to 10-20 workers while the other 99 partitions continue processing at baseline capacity. Without subreddit-based sharding, a single hot subreddit would cause a platform-wide vote processing backlog, delaying score updates and hot-list ranking for all communities. This community-based isolation pattern applies to any multi-tenant system where one tenant's activity spike should not degrade service for others.

---

## Insight 2: Optimistic UI with Read-Your-Writes for Vote Counts

**Category:** Consistency
**One-liner:** Show the user their vote immediately via optimistic client-side update, then reconcile asynchronously via cached counters and background workers.

**Why it matters:** With 58M votes per day and asynchronous score recalculation, there is an inherent delay between voting and score convergence. Optimistic UI eliminates perceived latency by incrementing the count client-side instantly, while Redis counters provide a fast read path for other users. The "read-your-writes" pattern -- storing recent votes in the user's session and applying them to displayed counts -- prevents the confusing "my vote didn't count" experience without requiring strong consistency. Other users see the eventually consistent count, which is acceptable since nobody expects sub-second vote accuracy from others.

---

## Insight 3: The Hot Algorithm's Logarithmic Vote Dampening

**Category:** System Modeling
**One-liner:** Reddit's Hot algorithm uses log10(score) so that early votes have disproportionate influence, making it nearly impossible for old posts to outrank new ones through sheer volume.

**Why it matters:** The formula `sign(score) * log10(max(|score|, 1)) + seconds/45000` creates a system where 10 upvotes on a new post are equivalent to 100 upvotes on a post that is 12.5 hours older. This logarithmic dampening means the first 10 votes matter as much as the next 90, naturally favoring fresh content and preventing vote-rich old posts from permanently dominating the feed. The 45,000-second constant sets the decay rate, and the negative score behavior (sign function) ensures heavily downvoted content sinks faster than neutral content rises. This makes vote manipulation expensive: buying 1,000 votes only provides 3 units of score (log10(1000) = 3).

---

## Insight 4: Wilson Score for Confidence-Weighted Comment Ranking

**Category:** System Modeling
**One-liner:** Wilson score's lower confidence bound prevents a comment with 1 upvote and 0 downvotes from outranking one with 100 upvotes and 20 downvotes.

**Why it matters:** Naive percentage-based ranking (upvotes/total) gives perfect scores to low-sample items. Wilson score uses a 95% confidence interval to favor items with more votes, even if their ratio is slightly lower. With only 1 vote, the lower bound is very low (high uncertainty); with 100 votes at 83% approval, the lower bound is much higher (high confidence). This statistical ranking is critical for comment threading where sorting quality directly affects readability, and applies to any system ranking items with sparse, noisy signals: product reviews, restaurant ratings, or Q&A platforms.

---

## Insight 5: ThingDB's Two-Table Flexible Schema Model

**Category:** Data Structures
**One-liner:** Reddit's entire data model uses just two tables -- a Thing table for fixed columns and a Data table for flexible key-value attributes -- enabling schema evolution without migrations.

**Why it matters:** The Thing table holds universal fields (id, type, ups, downs, created_utc) while the Data table stores arbitrary key-value pairs per thing. Adding a new attribute ("flair_text" for posts, "subscriber_count" for subreddits) requires no ALTER TABLE statements on tables with billions of rows. The trade-off is more complex queries requiring JOINs on the Data table, but this EAV (Entity-Attribute-Value) pattern provided the schema flexibility needed for Reddit's rapid feature iteration during early growth.

---

## Insight 6: PostgreSQL UPSERT for Atomic Vote Deduplication

**Category:** Atomicity
**One-liner:** A single UPSERT statement with ON CONFLICT atomically handles both new votes and vote changes, eliminating the race condition of concurrent votes from multiple devices.

**Why it matters:** When a user votes from their phone and desktop simultaneously, both requests see "no existing vote" and would insert duplicates without atomic handling. PostgreSQL's `INSERT ... ON CONFLICT (user_id, thing_id) DO UPDATE` resolves this in a single atomic operation, returning whether the row was inserted or updated via `(xmax = 0) AS is_new`. This eliminates the check-then-act race condition without requiring application-level distributed locking.

---

## Insight 7: Invalidate-on-Write for Comment Tree Cache Consistency

**Category:** Caching
**One-liner:** Never update a cached comment tree in place -- delete it on any write and rebuild from the database on the next read.

**Why it matters:** Concurrent replies to the same comment could cause lost updates if the system tried to surgically update the cached tree. Instead, Reddit treats the comment tree cache as read-only: any new comment, edit, or deletion invalidates the cache for all sort variants of that post. The next read rebuilds the tree from the authoritative database. This trades slightly higher read latency on cache miss for strong correctness guarantees, which is acceptable because hot posts have their trees precomputed by background workers every 60-300 seconds.

---

## Insight 8: Sampled Aggregation with Diversity Constraints for r/all

**Category:** Scaling
**One-liner:** Rather than querying all 100,000 subreddits, r/all samples top posts from active subreddits, weights by subscriber count, and caps per-subreddit representation.

**Why it matters:** A naive UNION ALL of top 100 posts from each of 100,000 subreddits would produce 10 million candidates requiring cross-shard sorting. Instead, Reddit samples from active subreddits, applies a capped logarithmic weight based on subscriber count (min(log10(subscribers), 3)), and enforces a maximum of 3 posts per subreddit for diversity. This precomputed result is cached in Redis for 60 seconds, transforming an impossible real-time cross-shard query into a manageable background job served at 20K QPS.

---

## Insight 9: Community-Based Sharding vs. User-Based Fanout

**Category:** Partitioning
**One-liner:** Reddit's hot-spot pattern is subreddit-based (viral community), not celebrity-based (famous user), requiring fundamentally different isolation strategies than Twitter or Facebook.

**Why it matters:** Twitter solves the celebrity problem with push/pull hybrid fanout based on follower count. Reddit's challenge is different: when r/pics goes viral, millions of votes flood a single community's processing pipeline. The solution is subreddit-based queue sharding with auto-scaling workers per partition, not user-graph-based fanout. This architectural distinction means Twitter's solutions do not directly transfer to Reddit, and interviewers specifically test whether candidates understand this difference.

---

## Insight 10: Batch Score Updates with Priority and Debouncing

**Category:** Traffic Shaping
**One-liner:** Batch pending score updates into 100-item groups with 1-second windows, prioritizing hot posts while debouncing repeated updates to the same item.

**Why it matters:** With 58M votes per day (670 QPS), individually recalculating hot scores would overwhelm the database. Batching reduces write amplification by fetching current state for 100 items in a single query and issuing batched Redis ZADD commands via pipeline. Debouncing prevents redundant recalculations when a post receives multiple votes within the batch window. Priority queuing ensures that high-scoring posts (above 1,000 votes) get processed first, keeping the visible hot list accurate for the content users actually see.

---

## Insight 11: Selective Time-Decay Recalculation

**Category:** Cost Optimization
**One-liner:** Only recalculate time-decay scores for the top 100 posts per subreddit and recent posts with high vote counts, skipping the vast majority of content.

**Why it matters:** Hot scores depend on time, meaning they change continuously even without new votes. Recalculating scores for all posts across 100,000 subreddits is infeasible. A background worker runs every 60 seconds, recalculating only the current top-N and recent high-scoring posts per active subreddit. Posts older than 48 hours, with fewer than 10 votes, or already outside the top 500 are skipped entirely. The hot list is trimmed to the top 1,000 per subreddit to bound Redis memory usage. This reduces the recalculation workload by over 99%.

---

## Insight 12: Comment Tree Depth Limiting with "Load More" Stubs

**Category:** Data Structures
**One-liner:** Cap comment tree construction at 200 comments and 10 levels deep, inserting "load more" stubs that reference remaining child IDs for on-demand fetching.

**Why it matters:** Viral posts with 10,000+ comments produce tree structures that are expensive to build and serialize. By limiting initial loads to 200 comments with a depth ceiling of 10 levels, Reddit keeps response sizes manageable and build times under 1 second. The "more" stubs contain references to the first 5 child IDs plus a total count, enabling progressive loading without sending the entire tree. Precomputation for the top 1,000 posts in each of the 3 main sort orders further avoids recomputing expensive trees on every page load.

---

## Insight 13: Shadowbanning for Transparent Vote Manipulation Prevention

**Category:** Security
**One-liner:** Shadowbanned users' votes are stored but never affect scores, creating the illusion of normal operation while neutralizing manipulation.

**Why it matters:** Openly banning vote manipulators causes them to create new accounts and adapt their tactics. Shadowbanning lets the system accept and store their votes normally (the user sees no error via optimistic UI), but silently skips the score update and queue enqueue steps. Combined with REV2 ML pipeline detection (vote timing patterns, session behavior, account characteristics), this multi-layered approach handles everything from individual bot accounts to coordinated voting rings. The graduated response (score < 0.3: allow, 0.3-0.7: rate limit, > 0.7: shadowban) avoids false-positive collateral damage.

---

## Insight 14: Graceful Degradation Under Extreme Load

**Category:** Resilience
**One-liner:** When a hot partition's queue exceeds 100,000 items, skip score recalculation entirely and just store votes, deferring ranking updates to batch recovery.

**Why it matters:** During extreme viral events, vote processing can fall behind even with auto-scaled workers. Rather than letting the system collapse, Reddit's degraded mode stores votes durably but skips the expensive score recalculation and hot-list update steps. Once queue depth drops below 1,000, normal processing resumes and scores are batch-recalculated. Users see slightly stale rankings but the core voting data is never lost -- a principled trade-off between ranking freshness and system availability.

---

## Insight 15: Go Migration with Tap-Compare Testing

**Category:** Resilience
**One-liner:** Shadow production traffic to the new Go implementation, compare responses against the Python original in real time, and cut over only after achieving response parity.

**Why it matters:** Rewriting a production service is one of the highest-risk operations in software engineering. Reddit's tap-compare approach mitigated this by running both implementations in parallel, comparing responses across millions of requests, and flagging discrepancies for investigation. Only after consistent response parity was traffic gradually shifted. The Go migration delivered a 50% p99 latency reduction for the comments and accounts services, demonstrating that language/runtime choice has material impact at scale. This pattern (also called shadow testing) is the safest approach to any critical-path migration.

---
