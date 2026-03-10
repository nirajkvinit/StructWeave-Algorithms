# Deep Dive & Bottlenecks — Web Crawlers

## Critical Component 1: URL Frontier — The Brain of the Crawler

### Why It Is Critical

The URL Frontier determines what the crawler fetches and when. Every architectural property — coverage (which pages are crawled), freshness (how often they are recrawled), and politeness (how aggressively each host is hit) — is ultimately a consequence of frontier scheduling decisions. A poorly designed frontier can waste 50%+ of crawl bandwidth on low-value pages while critical pages go stale. A frontier that fails to enforce politeness will get the crawler's IP ranges blocked by major hosts, creating coverage gaps worse than not crawling at all.

### How It Works Internally

The frontier implements the Mercator two-queue architecture:

**Front Queues (Priority Scheduling):**

The priority assigner classifies each incoming URL into one of K priority levels (typically 4-8). The classification uses multiple signals:

| Signal | Weight | Source |
|--------|--------|--------|
| Page importance (PageRank-like) | High | Precomputed from link graph |
| Host authority | Medium | Domain-level reputation score |
| Change frequency | Medium | Historical crawl data |
| Path depth | Low | URL structure (shallow = more important) |
| Content type | Low | HTML pages > PDFs > images |
| Source priority | Low | URLs discovered from high-priority pages inherit priority |

A biased selector draws from front queues with frequency proportional to their priority. For example, with 4 queues: F1 gets 40% of draws, F2 gets 30%, F3 gets 20%, F4 gets 10%. This ensures high-priority URLs are crawled first without completely starving low-priority URLs.

**Back Queues (Politeness Enforcement):**

Each back queue corresponds to exactly one host. When a URL is drawn from a front queue, it is routed to its host's back queue. Each back queue carries a `next_fetch_time` timestamp representing the earliest time the next URL from this host may be fetched. A min-heap orders all non-empty back queues by their `next_fetch_time`.

The dequeue operation:
1. Pop the back queue with the smallest `next_fetch_time` from the heap
2. If `next_fetch_time` > now, no host is ready — wait or return empty
3. Dequeue one URL from this back queue
4. Compute the new `next_fetch_time = now + crawl_delay` for this host
5. Push the back queue back into the heap with the updated `next_fetch_time`

The `crawl_delay` is the maximum of: the robots.txt `Crawl-delay` directive, the adaptive delay computed from the host's response times, and a global minimum delay (e.g., 1 second).

**Back Queue Refill:**

When a back queue is empty (all URLs for a host have been fetched), it must be refilled from the front queues. The selector draws a URL from the front queues and routes it to the appropriate back queue. If the drawn URL's host already has a non-empty back queue, it is appended there. If not, the empty back queue is repurposed for the new host.

### The Back Queue Mapping Problem

With 500 million distinct hosts and only ~10,000 back queues (memory constraint), the frontier cannot maintain a dedicated back queue per host. Instead, it uses a **host-to-queue mapping table** that dynamically assigns hosts to back queues. When a back queue empties and is refilled:

1. The current host mapping is released
2. A URL is drawn from the front queues
3. The URL's host is assigned to this back queue
4. All other queued URLs for this host are moved to this back queue

This dynamic remapping means each back queue serves one host at a time, but the host changes as the queue drains and refills. The mapping table tracks which host is currently assigned to which back queue.

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Front queue imbalance | Low-priority queue grows unboundedly while high-priority queue is always empty | Monitor queue depths; rebalance if ratio exceeds 100:1 |
| Back queue heap corruption | Fetchers get no URLs or get URLs from wrong hosts | Periodic heap validation; rebuild from back queue state on corruption |
| Host mapping table loss | Cannot route URLs to correct back queues | Persist mapping to disk; rebuild from back queue contents on restart |
| Single-host URL flood | One host has millions of URLs, dominates the frontier | Per-host URL budget (e.g., max 100K URLs per host in frontier) |
| Stale priority signals | PageRank or change frequency data is months old | Periodic batch recomputation; frontier uses best-effort signals, not perfect |

---

## Critical Component 2: Politeness Engine — The Ethical Constraint

### Why It Is Critical

Politeness is not optional — it is the fundamental constraint that distinguishes a web crawler from a DDoS attack. Violating politeness has concrete consequences: hosts block the crawler's IP ranges, reducing coverage. Overloading small servers can cause outages, creating legal liability. At web scale, even a small politeness bug (e.g., ignoring Crawl-delay for 1% of hosts) means thousands of servers are being overloaded.

### The Three Layers of Politeness

**Layer 1: robots.txt Compliance**

The crawler fetches and caches each host's `/robots.txt` file. The cache has a configurable TTL (default: 24 hours). Before any page fetch, the politeness engine checks whether the URL is allowed by the applicable robots.txt rules.

Key edge cases:
- **robots.txt returns 5xx:** Assume all URLs are disallowed (conservative) and retry robots.txt fetch with exponential backoff
- **robots.txt returns 404:** Assume all URLs are allowed (the host has no crawl restrictions)
- **robots.txt is too large (>500 KB):** Treat as empty (malformed or adversarial)
- **Multiple user-agent matches:** Use the most specific matching directive (e.g., `Googlebot` > `*`)
- **Crawl-delay specified:** Honor even if it seems unreasonably high (up to a configurable maximum, e.g., 300 seconds); beyond the maximum, deprioritize the host

**Layer 2: Per-Host Rate Limiting**

Even without an explicit Crawl-delay, the crawler enforces a minimum inter-request delay per host. The default is computed adaptively:

```
adaptive_delay(host) = MAX(
    MIN_DELAY,                           // e.g., 1 second
    host.avg_response_time * MULTIPLIER  // e.g., 10x average response time
)
```

If a host typically responds in 100ms, the adaptive delay is 1 second (10 x 100ms). If a host responds in 2 seconds (slow server), the adaptive delay is 20 seconds (10 x 2s). This heuristic ensures the crawler's load is proportional to the host's capacity.

**Layer 3: IP-Based Rate Limiting**

Multiple virtual hosts can share a single IP address (shared hosting). Fetching from `siteA.example.com` and `siteB.example.com` at 1 req/sec each creates 2 req/sec to the same physical server. The politeness engine maintains an IP-to-host mapping and enforces an aggregate rate limit per IP address.

### The Politeness-Freshness Tension

Politeness directly conflicts with freshness. A news site's homepage changes every 5 minutes, but the politeness constraint allows only one request per second to that host. With a 1-second delay, the crawler can fetch 3,600 pages/hour from that host — but the homepage is just one of those 3,600. If the site has 1 million pages, the homepage will be recrawled at most once every ~278 hours at the default politeness level.

**Resolution:** Priority queues ensure the homepage (high change frequency + high importance) is near the front of the back queue for that host. The crawler cannot fetch it more often than once per crawl-delay, but it can ensure the homepage is among the first pages fetched in each politeness window.

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| robots.txt cache corruption | All URLs for affected hosts are either blocked or unblocked incorrectly | Independent robots.txt refresh thread; cache integrity checks |
| Adaptive delay miscalculation | Crawler overwhelms slow hosts or under-utilizes fast hosts | Bound delay to [1s, 300s] range; log anomalies for review |
| IP-to-host mapping stale | Shared hosting overloaded (IP changed, new host added) | Periodic DNS re-resolution; event-driven mapping updates on fetch errors |
| Crawl-delay directive conflict | Different robots.txt rules specify conflicting delays | Use the most restrictive delay (max of all applicable rules) |

---

## Critical Component 3: Content Deduplication Pipeline — The Efficiency Guard

### Why It Is Critical

The web is full of duplicate content. Mirror sites, syndicated articles, printer-friendly versions, session-ID URL variants, and www vs. non-www versions all create duplicate pages. Without deduplication, the crawler wastes bandwidth fetching identical content, the content store bloats with redundant copies, and the downstream indexer must process (and rank) duplicates. At 1 billion pages/day, even 10% duplicates means 100 million wasted fetches — the equivalent of roughly 5 TB of wasted bandwidth per day.

### Three-Stage Deduplication

**Stage 1: URL Normalization (Pre-fetch)**

Before a URL is even enqueued in the frontier, it is normalized to a canonical form. This catches syntactic duplicates:
- `HTTP://Example.COM/Path` → `http://example.com/Path`
- `http://example.com/a/../b` → `http://example.com/b`
- `http://example.com/page?b=2&a=1` → `http://example.com/page?a=1&b=2`
- `http://example.com/page#section` → `http://example.com/page`

After normalization, the URL hash is checked against the Bloom filter. This is the cheapest dedup check: O(1) time, no network call.

**Stage 2: Exact Content Hash (Post-fetch)**

After fetching, the page content is hashed (MD5 or SHA-256). The hash is compared against the content dedup store. If an exact match exists, the page is a duplicate — it is not stored again, but the URL-to-content mapping is updated.

This catches cases where different URLs serve identical content (mirrors, URL variants not caught by normalization).

**Stage 3: Near-Duplicate Detection via SimHash (Post-fetch)**

Many duplicate pages are not byte-for-byte identical. They differ in headers, footers, timestamps, ad blocks, or minor edits. SimHash fingerprinting detects these near-duplicates:

1. Compute the 64-bit SimHash of the page's text content (after stripping HTML tags, scripts, and styles)
2. Query the SimHash index for existing pages within a Hamming distance of 3
3. If a near-duplicate is found, mark the URL as a near-duplicate of the canonical version

The SimHash index uses a multi-probe lookup: the 64-bit fingerprint is divided into B blocks (e.g., 4 blocks of 16 bits), and B separate hash tables are queried, one per block permutation. This enables O(1) amortized lookup for near-duplicates.

### Bottleneck: SimHash Index at Scale

With 10 billion unique pages, the SimHash index must store 10 billion 64-bit fingerprints. At 8 bytes each, this is 80 GB of fingerprints alone. The multi-probe index structure multiplies this by B (block count), giving ~320 GB for a 4-block index. This fits in memory on a single large machine or is easily partitioned across a small cluster.

The real bottleneck is query latency under concurrent updates. Each new page requires both a lookup (is there a near-duplicate?) and an insert (add the new fingerprint). At 11,500 pages/second, this is 23,000 index operations/second. Partitioning by the first block's hash distributes load across machines.

---

## Spider Trap Detection

### How Traps Arise

Spider traps are not always malicious. Common causes:

| Trap Type | Example | Pattern |
|-----------|---------|---------|
| Calendar pages | `/calendar/2025/01/01`, `/calendar/2025/01/02`, ... infinitely into the future | Incrementing date in URL path |
| Session IDs | `/page?sid=abc123`, `/page?sid=def456` (each visit generates a new URL) | Random parameter values creating infinite URL space |
| Infinite directory depth | `/a/a/a/a/a/a/...` (each page links to a deeper version) | Repeating path segments |
| Faceted navigation | `/products?color=red&size=M&brand=X&...` (combinatorial explosion of filters) | Exponential query parameter combinations |
| Soft 404s | Server returns 200 OK for any URL, including non-existent pages | `/anything/goes/here` returns a generic page with links |

### Detection Heuristics

```
FUNCTION detect_spider_trap(url, host_stats):
    // Heuristic 1: URL depth exceeds threshold
    IF count_path_segments(url) > MAX_PATH_DEPTH:  // e.g., 15
        RETURN TRAP_DETECTED("excessive_depth")

    // Heuristic 2: URL length exceeds threshold
    IF length(url) > MAX_URL_LENGTH:  // e.g., 2048 characters
        RETURN TRAP_DETECTED("excessive_length")

    // Heuristic 3: Repeating path segments
    segments = split_path(url)
    IF has_repeating_pattern(segments):  // e.g., /a/b/a/b/a/b
        RETURN TRAP_DETECTED("repeating_segments")

    // Heuristic 4: Host URL budget exceeded
    IF host_stats.urls_discovered > HOST_URL_BUDGET:  // e.g., 500,000
        RETURN TRAP_DETECTED("host_budget_exceeded")

    // Heuristic 5: High ratio of new URLs from this host with identical content
    IF host_stats.unique_content_ratio < 0.1:  // <10% unique content
        RETURN TRAP_DETECTED("low_content_uniqueness")

    // Heuristic 6: Known trap URL patterns (regex-based blocklist)
    IF matches_trap_pattern(url):
        RETURN TRAP_DETECTED("pattern_match")

    RETURN ALLOWED
```

---

## Bottleneck Analysis

| Bottleneck | Symptom | Root Cause | Mitigation |
|-----------|---------|------------|------------|
| DNS resolution throughput | Fetchers idle waiting for DNS responses | Upstream DNS resolvers rate-limited; cache miss rate too high | Local caching resolver with aggressive TTL; pre-resolve URLs in the near-term fetch queue; use multiple upstream resolvers |
| Per-host politeness ceiling | High-value hosts (news sites) cannot be crawled fast enough | robots.txt Crawl-delay or adaptive delay limits throughput to 1 req/sec per host | Prioritize important pages within the per-host budget; nothing can bypass the politeness constraint (this is by design) |
| Frontier dequeue contention | Fetchers block waiting for frontier partition to serve URLs | Hot partition receives disproportionate traffic; heap lock contention | Partition frontier by host hash; each partition serves independently; batch dequeue (50-100 URLs per call) |
| Bloom filter false positives | New URLs incorrectly rejected as duplicates | Bloom filter nearing capacity; accumulated dead entries | Periodic Bloom filter rebuild from URL database; scale to lower false positive rate |
| Content store write throughput | Fetched pages queue up waiting for storage | Object storage write latency under load | Buffered writes with local disk as WAL; batch uploads to object storage |
| Network bandwidth saturation | Fetcher workers cannot open new connections | Outbound bandwidth fully utilized | Add fetcher workers in additional data centers; compress transfers where possible |
| SimHash index hot spots | Near-duplicate queries slow down for popular content fingerprints | Many pages cluster around similar SimHash values (boilerplate content) | Partition SimHash index by fingerprint prefix; use dedicated hot-key handling |
