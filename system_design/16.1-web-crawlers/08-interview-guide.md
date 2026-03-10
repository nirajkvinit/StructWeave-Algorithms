# Interview Guide — Web Crawlers

## Interview Pacing (45-min format)

| Time | Phase | Focus |
|------|-------|-------|
| 0-5 min | Clarify | Scope: scale (how many pages/day?), coverage vs. freshness priority, robots.txt compliance, content types (HTML only or also JS-rendered?), single vs. multi-datacenter |
| 5-15 min | High-Level | Crawl pipeline (frontier → fetcher → parser → dedup → store), URL frontier concept (front queues + back queues), feedback loop (discovered URLs → frontier) |
| 15-30 min | Deep Dive | Pick 1-2: URL frontier architecture (Mercator), politeness engine, content deduplication (Bloom + SimHash), or spider trap detection |
| 30-40 min | Scale & Trade-offs | Frontier partitioning, distributed fetcher fleet, coverage vs. freshness trade-off, DNS bottleneck, Bloom filter sizing |
| 40-45 min | Wrap Up | Summarize key design decisions, acknowledge trade-offs, mention observability and compliance |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **Politeness is a hard constraint, not a soft guideline:** Unlike most systems where the goal is to maximize throughput, a web crawler must deliberately throttle itself. You cannot make a single host faster by adding more fetchers — the per-host rate limit is inviolable. This inverts the normal scaling paradigm: adding more hardware enables crawling more hosts in parallel, not crawling individual hosts faster. Candidates who propose "just add more machines" without understanding the per-host bottleneck have missed the fundamental constraint.

2. **The frontier is the most interesting data structure in the system:** The URL frontier is not a simple queue — it is simultaneously a priority queue (scheduling by importance), a rate limiter (per-host politeness), and a deduplication filter (Bloom filter). The Mercator two-queue architecture (front queues for priority + back queues for politeness) is the canonical solution. Candidates who describe the frontier as "just a queue" are missing the core design challenge.

3. **Deduplication operates at three levels, each with different accuracy-cost trade-offs:** URL normalization (cheap, catches ~60% of dupes), exact content hashing (moderate, catches ~30% more), and near-duplicate detection via SimHash (expensive, catches the remaining ~10%). Each level has failure modes that the next level catches. Mentioning all three demonstrates depth.

4. **The web is adversarial:** Spider traps, cloaking (serving different content to crawlers vs. browsers), redirect bombs, and deliberate attempt to exhaust crawl budget are all real. The crawler must be defensive without being paranoid — blocking too aggressively means losing coverage.

5. **Coverage, freshness, and politeness form an impossible triangle:** You cannot maximize all three simultaneously. More coverage means less time for recrawling (worse freshness). More frequent recrawling means less time for new discovery (worse coverage). And politeness constrains both. Demonstrating awareness of this trade-off triangle is a strong signal.

### Where to Spend Most Time

- **Deep Dive (15-30 min):** The URL frontier (Mercator architecture) and politeness engine are the two most interview-differentiating components. The frontier demonstrates knowledge of priority scheduling, per-host rate limiting, and the front-queue/back-queue pattern. The politeness engine shows awareness of robots.txt, adaptive rate limiting, and the coverage-freshness-politeness trade-off.

- **Don't spend time on:** HTML parsing implementation details, specific HTTP client configurations, content rendering (headless browsers), or search ranking algorithms. These are downstream concerns that don't differentiate a web crawler design.

---

## Trade-offs Discussion

### Trade-off 1: Breadth-First vs. Best-First Crawling

| Decision | Breadth-First | Best-First (Chosen) |
|----------|---------------|---------------------|
| | **Pros:** Simple implementation; discovers all pages at each depth before going deeper; good for comprehensive coverage | **Pros:** Prioritizes high-value pages; maximizes value of limited crawl budget; adapts to page importance |
| | **Cons:** Treats all pages as equally important; wastes budget on low-value pages; no notion of page importance | **Cons:** Requires importance signals (may be inaccurate); can miss valuable deep pages if importance heuristics are wrong; more complex frontier |
| **Recommendation** | Best-first with priority queues in the frontier; bias toward high-importance pages but never completely starve low-priority discovery |

### Trade-off 2: In-Memory Frontier vs. Disk-Backed Frontier

| Decision | In-Memory Frontier | Disk-Backed Frontier (Chosen) |
|----------|-------------------|-------------------------------|
| | **Pros:** Extremely fast dequeue (sub-millisecond); simple implementation | **Pros:** Handles billions of URLs; survives process restarts; bounded memory |
| | **Cons:** Cannot hold billions of URLs (>100 GB at 10B URLs); lost on crash; expensive memory cost | **Cons:** Disk I/O adds latency (~5-50ms per operation); more complex with hot/cold partitioning |
| **Recommendation** | Hybrid: hot front of queues in memory (~100M URLs), cold tail on disk; dequeue operates from memory; background process refills memory from disk |

### Trade-off 3: Aggressive Deduplication vs. Loose Deduplication

| Decision | Aggressive (Bloom + SimHash + URL normalization) (Chosen) | Loose (URL normalization only) |
|----------|----------------------------------------------------------|-------------------------------|
| | **Pros:** Minimizes wasted bandwidth; reduces storage costs; improves crawl efficiency | **Pros:** Simple; fast; no false positives from Bloom filter |
| | **Cons:** SimHash adds processing overhead per page; Bloom filter false positives cause missed URLs (~1%); three-stage pipeline is complex | **Cons:** 30-40% of fetches are duplicate content from different URLs; massive storage waste |
| **Recommendation** | Aggressive dedup — at 1B pages/day, even 10% duplicate reduction saves 5 TB/day of bandwidth and storage |

### Trade-off 4: Centralized URL Database vs. Embedded Frontier State

| Decision | Centralized URL DB (Chosen) | Frontier-Embedded State |
|----------|----------------------------|------------------------|
| | **Pros:** Global view of all URLs; supports complex queries (freshness analytics, coverage reports); single source of truth | **Pros:** No external dependency; faster (no network roundtrip); simpler deployment |
| | **Cons:** Database becomes a bottleneck at high write rates; adds latency to enqueue/dequeue path | **Cons:** No global visibility; hard to compute coverage/freshness metrics; frontier partition loss = data loss |
| **Recommendation** | Centralized URL DB for metadata and analytics, with frontier partitions maintaining their own local queues for fast dequeue; async sync between frontier and DB |

### Trade-off 5: Fixed Recrawl Interval vs. Adaptive Recrawl

| Decision | Fixed Interval | Adaptive (Chosen) |
|----------|---------------|-------------------|
| | **Pros:** Simple; predictable resource usage; easy to reason about coverage | **Pros:** Allocates recrawl budget to pages that actually change; avoids wasting bandwidth on static pages |
| | **Cons:** Wastes bandwidth recrawling pages that never change; misses rapidly-changing pages between intervals | **Cons:** Requires historical change data (cold-start problem for new pages); change frequency estimation can be wrong |
| **Recommendation** | Adaptive with exponential backoff/speedup; newly discovered pages get an aggressive initial interval (e.g., 24h) which adapts based on observed changes |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just use a simple FIFO queue for the frontier?" | Understand priority + politeness separation | "A FIFO queue ignores two critical dimensions: page importance (a news homepage should be crawled before a 10-year-old blog post) and per-host politeness (consecutive URLs from the same host would violate rate limits). The Mercator two-queue architecture separates priority (front queues) from politeness (back queues), solving both problems." |
| "How do you handle a host that returns 5xx for robots.txt?" | Test defensive design thinking | "Conservative approach: assume all URLs are disallowed until we can successfully fetch robots.txt. Retry with exponential backoff. If the host is consistently returning 5xx, it's likely having issues — our politeness policy should avoid adding load to a struggling host anyway." |
| "What if you discover a new URL that's on a host you've never seen?" | Test understanding of the cold-start problem | "The host needs a robots.txt fetch before any page can be crawled. We enqueue the URL, trigger a robots.txt pre-fetch for the new host, and the URL waits in the back queue until robots.txt is resolved. For host importance signals (PageRank, authority), we use defaults until data accumulates." |
| "Why not just use a distributed hash table for URL dedup instead of Bloom filters?" | Understand probabilistic vs. exact trade-offs at scale | "A DHT gives exact answers but requires network roundtrips per lookup (10B URLs x 11,500 checks/sec = massive network load). A Bloom filter gives probabilistic answers with 1% false positives but operates in-memory at sub-millisecond latency. The false positives cost us ~1% of potential new URLs — a tiny price for avoiding network-dependent dedup." |
| "What happens at 100x your current scale?" | Forward-thinking architectural changes | "At 100B pages, the primary changes are: (1) frontier partitions increase from 256 to ~2,500, (2) Bloom filter grows to ~120 GB (needs distributed approach), (3) content store grows to ~1.8 EB/year (requires aggressive retention policies and compression), (4) fetcher fleet grows to ~50,000 workers across more data centers. The architecture (partitioned frontier, distributed fetchers, multi-level dedup) scales linearly — no fundamental redesign needed." |
| "Can you just crawl the entire web and be done?" | Test understanding of web dynamism | "The web changes continuously. About 30-40% of pages change within a week. 'Being done' is impossible — the crawl is perpetual. The real challenge is recrawl scheduling: deciding which pages to revisit and how often, given finite bandwidth." |

---

## Common Mistakes to Avoid

1. **Treating the frontier as a simple queue** — The frontier is the most complex component; failing to discuss priority scheduling and per-host politeness is a major miss
2. **Ignoring politeness entirely** — Proposing to "fetch as fast as possible" shows a lack of real-world understanding; politeness is the defining constraint
3. **Forgetting about DNS** — At web scale, DNS resolution is a serious bottleneck; not mentioning DNS caching suggests inexperience with distributed systems
4. **Only discussing URL-level dedup** — Content-level dedup (exact hash + SimHash) catches a large percentage of duplicates that URL normalization misses
5. **Proposing a single-machine design** — Even as a starting point, a single-machine crawler cannot handle web-scale requirements; start distributed
6. **Not discussing the coverage-freshness trade-off** — This is the central resource allocation question; ignoring it means ignoring the system's primary optimization problem
7. **Over-engineering the parsing/indexing pipeline** — The interviewer asked about the crawler, not the search engine; stay focused on fetching and scheduling
8. **Ignoring failure modes** — What happens when a fetcher crashes mid-crawl? When a frontier partition fails? When DNS resolvers go down?

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|----------|---------------|
| What's the target scale — millions or billions of pages per day? | Determines whether frontier fits in memory or needs disk-backed design |
| Do we need to handle JavaScript-rendered pages? | Adds a headless browser rendering farm (significant complexity) |
| What's the priority — coverage (new pages) or freshness (recrawling)? | Determines frontier priority allocation strategy |
| Are we crawling the open web or a specific set of domains? | Domain-specific crawlers have simpler politeness and discovery |
| What consistency guarantees does the downstream indexer need? | Determines whether content store needs strong consistency or eventual is fine |
| Is there an existing search index we're refreshing, or building from scratch? | Cold start (no priority signals) vs. warm start (PageRank data available) |
| How important is geographical distribution of fetchers? | Determines whether we need multi-region fetcher deployment |
| What's the budget constraint — bandwidth, storage, or compute? | Helps prioritize optimization efforts |
