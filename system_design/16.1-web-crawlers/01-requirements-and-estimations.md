# Requirements & Estimations — Web Crawlers

## Functional Requirements

### Core Features

1. **URL Discovery & Extraction** — Parse fetched HTML pages to extract hyperlinks, normalize them to canonical form, and feed new URLs back into the crawl frontier. Support extraction from various content types (HTML, XML sitemaps, RSS feeds) and handle relative URLs, redirects, and URL-encoded characters.

2. **URL Frontier Management** — Maintain a priority-ordered queue of billions of URLs awaiting crawl. The frontier combines two scheduling dimensions: *priority* (which URLs are most important to fetch) and *politeness* (which URLs can be fetched now without violating per-host rate limits). Support both first-crawl discovery and recrawl scheduling.

3. **Distributed Page Fetching** — Download web pages via HTTP/HTTPS using a fleet of distributed fetcher workers. Handle connection pooling, timeouts, redirect chains (with depth limits), content-type detection, encoding negotiation, and conditional GET (If-Modified-Since) for recrawl efficiency.

4. **Politeness Enforcement** — Respect robots.txt directives (Disallow, Crawl-delay, Sitemap), enforce per-host and per-IP rate limits, and adaptively reduce crawl rate when target hosts show signs of stress (elevated response times, increased error rates). Cache robots.txt files with TTL-based refresh.

5. **URL & Content Deduplication** — Prevent duplicate work at two levels: (a) URL-level deduplication via normalization and Bloom filters to avoid re-enqueuing known URLs, and (b) content-level deduplication via cryptographic hashes (exact match) and locality-sensitive hashing (SimHash/MinHash for near-duplicates) to avoid re-indexing identical or substantially similar content.

6. **Spider Trap Detection** — Identify and avoid URL patterns that generate unbounded crawl work: infinitely deep directory structures, calendar pages with no end date, session IDs creating infinite URL variations, and dynamically generated content with no new information. Enforce per-host URL budget limits and URL depth/length thresholds.

7. **Recrawl Scheduling** — Determine when to revisit previously crawled pages based on their historical change frequency, page importance (PageRank or similar), and freshness requirements. Prioritize frequently-changing high-value pages (news homepages, product listings) over rarely-changing low-value pages (old blog posts, archived content).

8. **DNS Resolution** — Perform high-throughput DNS lookups with a local caching resolver to avoid overwhelming upstream DNS servers. Cache results with TTL awareness and support pre-fetching for URLs in the near-term crawl queue.

### Out of Scope

- **Search ranking and indexing** — The crawler feeds content to the indexer but does not build or query the search index itself
- **Content rendering** — JavaScript-heavy single-page applications require a separate rendering pipeline (headless browser farm); the base crawler handles static HTML
- **Natural language processing** — Content classification, entity extraction, and language detection are downstream pipeline stages
- **Advertising and monetization** — How search results are monetized is orthogonal to the crawl infrastructure
- **User-facing search API** — Query serving, result ranking, and snippet generation are separate systems

---

## Non-Functional Requirements

### CAP Theorem Position

**AP (Availability + Partition Tolerance)** — The crawl system must continue operating during network partitions. It is acceptable for different frontier partitions to temporarily have inconsistent views of URL state (one partition may re-enqueue a URL that another partition has already crawled). Deduplication catches these duplicates eventually. Halting the crawl during a partition is unacceptable — every hour of downtime means millions of pages become stale.

### Consistency Model

**Eventual Consistency for URL state** — Whether a URL has been "seen" or "crawled" can propagate with small delays across frontier partitions. The deduplication layer (Bloom filters, content hashes) provides probabilistic guarantees that converge to correctness over time. A small percentage of duplicate fetches is acceptable; missing pages entirely is not.

**Strong Consistency for robots.txt enforcement** — A fetcher must never violate a robots.txt directive due to stale data. Robots.txt cache entries must be refreshed before they expire, and a missing or expired robots.txt must trigger a fresh fetch before any page on that host is crawled.

### Availability Target

| Component | Target | Rationale |
|-----------|--------|-----------|
| Frontier Service | 99.95% | Frontier unavailability halts all crawling; brief interruptions cause cascading queue starvation |
| Fetcher Fleet | 99.9% | Individual fetcher failures are tolerated; fleet-level availability matters |
| DNS Resolver Cache | 99.99% | Every fetch requires DNS; resolver downtime blocks the entire pipeline |
| Content Storage | 99.9% | Brief write delays are tolerable; fetched pages can be buffered |
| Deduplication Service | 99.9% | Downtime causes duplicate fetches (wasteful but not catastrophic) |

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| URL enqueue (frontier insert) | <5ms | <20ms | <50ms |
| URL dequeue (next URL to crawl) | <10ms | <50ms | <100ms |
| DNS resolution (cached) | <1ms | <5ms | <10ms |
| DNS resolution (cache miss) | <50ms | <200ms | <500ms |
| Page fetch (network round-trip) | <500ms | <2s | <5s |
| robots.txt fetch and parse | <100ms | <500ms | <1s |
| Content dedup check (Bloom filter) | <1ms | <5ms | <10ms |
| Content dedup check (SimHash) | <10ms | <50ms | <100ms |

### Durability Guarantees

- **Fetched page content:** Durable — stored in distributed object storage with replication; content loss requires expensive re-fetching
- **URL frontier state:** Durable with periodic checkpointing — complete frontier loss requires full reconstruction from the URL database (hours of recovery)
- **Crawl metadata (timestamps, ETags, change frequency):** Durable — stored in the URL database; loss degrades recrawl scheduling quality
- **Deduplication state (Bloom filters):** Reconstructible — Bloom filter loss causes temporary duplicate fetches until rebuilt from the URL database
- **robots.txt cache:** Ephemeral with TTL — cache loss triggers re-fetches on next access (minor bandwidth cost)

---

## Capacity Estimations (Back-of-Envelope)

**Reference deployment:** Web-scale search engine crawler covering ~10 billion known URLs, fetching ~1 billion pages per day.

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Known URLs in frontier | ~10 billion | Based on estimated crawlable web size |
| Pages fetched per day | ~1 billion | Target for comprehensive web coverage |
| Pages fetched per second (avg) | ~11,500 | 1B / 86,400 seconds |
| Pages fetched per second (peak) | ~25,000 | ~2.2x average (diurnal patterns — crawl more when target regions are off-peak) |
| Average page size (compressed) | ~50 KB | HTML + headers after gzip decompression and stripping |
| Daily bandwidth (inbound) | ~50 TB | 1B pages x 50 KB |
| Unique hosts discovered | ~500 million | ~10B URLs across ~500M distinct hosts |
| DNS lookups per second | ~5,000 | With 95% cache hit rate: 11,500 x 0.05 = ~575 misses, plus prefetch |
| robots.txt fetches per day | ~5 million | 500M hosts / 100 (not all active) with 24h TTL refresh |
| New URLs discovered per day | ~500 million | ~50 outgoing links per page x 1B pages, ~1% are genuinely new |
| Bloom filter size (URL dedup) | ~12 GB | 10B entries x 10 bits/entry for 1% false positive rate |
| Storage per day (raw pages) | ~50 TB | 1B pages x 50 KB average |
| Storage per year (raw pages) | ~18 PB | 50 TB x 365 days |
| URL metadata storage | ~2 TB | 10B URLs x ~200 bytes metadata each |
| Fetcher worker count | ~5,000 | Each worker handles ~200 concurrent connections = 1M connections total |
| Concurrent TCP connections | ~1 million | 5,000 workers x 200 connections each |

---

## SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Crawl throughput | >1B pages/day | Pages successfully fetched and stored per 24h rolling window |
| Freshness (top-1M pages) | <4 hours stale | Time since last successful crawl for the top 1M pages by importance |
| Freshness (all known pages) | <30 days stale | 90th percentile age of last successful crawl across all known URLs |
| Politeness violation rate | 0% | Pages fetched in violation of robots.txt Disallow directives |
| Crawl-delay compliance | >99.9% | Percentage of fetches respecting the host's Crawl-delay directive |
| Duplicate fetch rate | <5% | Percentage of fetches that retrieve content identical to the last crawl |
| Spider trap escape rate | >99% | Percentage of detected traps where the crawler successfully stopped within 1,000 URLs |
| DNS resolution success rate | >99.99% | Percentage of DNS lookups that resolve successfully |
| Fetcher availability | >99.9% | Percentage of time the fetcher fleet is operating at >80% capacity |

---

## Constraints Unique to Web Crawlers

### Politeness Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| robots.txt compliance | Must fetch and obey robots.txt before crawling any page on a host | Requires robots.txt cache with TTL; expired entries block crawling until refreshed |
| Crawl-delay enforcement | Some hosts specify minimum seconds between requests | Reduces effective throughput per host; some hosts set aggressively high delays (60s+) |
| Per-host rate limiting | Even without explicit Crawl-delay, should not exceed ~1 request/second per host | Limits how fast any single host can be crawled regardless of page importance |
| IP-based throttling | Multiple hosts on the same IP (shared hosting) share a rate limit | Requires IP-to-host mapping; shared hosting makes per-host limits insufficient |
| Adaptive backoff | Must reduce crawl rate when host shows stress signals (5xx errors, rising latency) | Fetchers need feedback loop from response metrics to politeness parameters |

### Scale Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| Frontier size | Billions of URLs must be prioritized and dequeued efficiently | In-memory priority queues impossible; requires disk-backed frontier with hot/cold partitioning |
| DNS throughput | Thousands of DNS lookups per second; upstream resolvers have rate limits | Local caching resolver with TTL management; pre-resolution for queued URLs |
| Connection limits | Operating system limits on concurrent TCP connections per machine | Worker fleet must be distributed; connection pooling with per-host limits |
| Storage growth | Petabytes per year of raw page content | Tiered storage: recent crawls on fast storage, historical on cold object storage |
| URL normalization ambiguity | Same page reachable via many URL variants | Aggressive normalization rules with domain-specific overrides; residual duplicates caught by content dedup |
