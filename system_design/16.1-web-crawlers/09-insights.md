# Insights — Web Crawlers

## Insight 1: The URL Frontier Is Not a Queue — It Is a Two-Dimensional Scheduler Solving Priority and Politeness Simultaneously

**Category:** Data Structures

**One-liner:** The Mercator two-queue architecture separates "what to crawl" (priority) from "when to crawl it" (politeness), and the interaction between these two dimensions is the single most important design decision in a web crawler.

**Why it matters:** A naive implementation treats the frontier as a priority queue: dequeue the highest-priority URL and fetch it. This fails immediately because consecutive high-priority URLs from the same host violate politeness constraints. A different naive approach uses per-host FIFO queues, which ensures politeness but ignores priority entirely — a 10-year-old blog post on `news.example.com` is crawled before the homepage. The Mercator architecture solves both by routing URLs through front queues (priority-ordered) into back queues (host-isolated, time-gated). The biased selector draws from front queues proportional to priority, and the back queue heap ensures no host is fetched before its politeness timer expires. The elegant insight is that these two dimensions are orthogonal and can be composed: the front queues control the *distribution* of crawl effort across importance levels, while the back queues control the *timing* of crawl effort per host. This separation of concerns is what makes the frontier scalable — each dimension can be tuned independently.

---

## Insight 2: Politeness Is the Defining Constraint — Not a Feature — And It Inverts the Normal Scaling Paradigm

**Category:** Scalability

**One-liner:** Adding more hardware to a web crawler does not make any individual host crawl faster — it only enables crawling more hosts in parallel — making politeness the only constraint in distributed systems that cannot be solved by horizontal scaling.

**Why it matters:** In almost every distributed system, the answer to "how do we handle more load?" is "add more machines." A database shards across more nodes; a web server adds more instances behind a load balancer. But a web crawler at a per-host level cannot be made faster by adding hardware. If `news.example.com` allows 1 request per second, then 1 machine or 10,000 machines can still only fetch 1 page per second from that host. Horizontal scaling increases the number of hosts that can be crawled simultaneously (parallelism across hosts), not the speed of crawling any individual host. This fundamentally changes the capacity planning model: the bottleneck is not total compute or bandwidth — it is the *product* of the number of active hosts times the average politeness delay per host. If the crawler knows about 500 million hosts with an average 2-second crawl delay, the theoretical maximum throughput is 250 million pages per second — far more than any crawler needs. The actual bottleneck becomes the frontier's ability to maintain and schedule across those 500 million host queues efficiently.

---

## Insight 3: Coverage, Freshness, and Politeness Form an Impossible Triangle — And the Crawler's Job Is to Navigate the Trade-off, Not Solve It

**Category:** Contention

**One-liner:** Given a fixed crawl budget, every page fetched for freshness (recrawling a known page) is a page not fetched for coverage (discovering a new page), and politeness constrains both — making crawl scheduling a resource allocation problem with no globally optimal solution.

**Why it matters:** Consider a crawl budget of 1 billion pages per day. If the crawler has 10 billion known URLs and recrawls each one every 10 days, that consumes the entire budget — leaving zero capacity for new page discovery. Conversely, dedicating the entire budget to new discovery means never recrawling existing pages — and the index becomes stale within days for fast-changing sites. The real system must continuously balance: top-1M pages might be recrawled every 4 hours (consuming ~6M fetches/day), the next 100M pages every 7 days (~14M fetches/day), and the remaining budget (~980M fetches/day) split between recrawling lower-priority pages and new discovery. Politeness further complicates this: a high-value host might have 100,000 pages due for recrawl, but its 1-second crawl delay limits throughput to 86,400 pages/day from that host — meaning it takes more than a day just to recrawl one host's pages. The scheduler must make these trade-offs continuously, and different search engines make different choices (general search engines favor freshness for head queries; archive crawlers favor coverage).

---

## Insight 4: URL Normalization Is Deceptively Hard — And Getting It Wrong Means Either Wasting 30% of Your Crawl Budget or Missing Pages Entirely

**Category:** Data Structures

**One-liner:** The same page can be reached via dozens of URL variants (different casing, trailing slashes, parameter ordering, tracking parameters, www vs. non-www), and each missed normalization rule means either a duplicate fetch (wasted bandwidth) or a false dedup match (missed page).

**Why it matters:** Simple normalization rules (lowercase the scheme and host, remove fragments, resolve `..` segments) catch the obvious cases. But the web is full of edge cases that turn normalization into an ambiguous problem. Is `http://example.com/page` the same as `http://example.com/page/` (trailing slash)? Usually yes, but some servers return different content. Is `http://example.com/page?a=1&b=2` the same as `http://example.com/page?b=2&a=1` (parameter reordering)? For most applications, yes — but some servers use parameter order meaningfully. Are `utm_source`, `fbclid`, and `sessionid` parameters part of the page identity? No — they are tracking tokens that should be stripped. But stripping the wrong parameter (one that actually changes the content) means missing a page. The consequence is that normalization must be aggressive enough to catch most duplicates (removing tracking parameters, sorting query strings, lowercasing) but conservative enough to not merge genuinely different pages. In practice, this means a curated list of "known-safe" parameters to strip, supplemented by content-level deduplication that catches the cases normalization misses.

---

## Insight 5: Bloom Filters Trade a Small False Positive Rate for Massive Memory Savings — But "Small" at 10 Billion URLs Means 100 Million Missed Pages

**Category:** System Modeling

**One-liner:** A 1% false positive rate sounds negligible until you realize that 1% of 10 billion URLs is 100 million URLs that the crawler incorrectly believes it has already seen — and some of those may be high-value pages.

**Why it matters:** Bloom filters are the standard data structure for URL deduplication at scale because the alternative (a hash set of 10 billion URLs) would require ~200 GB of memory (20 bytes per entry). A Bloom filter achieves the same purpose in ~12 GB at the cost of a 1% false positive rate. But at web scale, 1% means the crawler will reject approximately 100 million genuinely new URLs that happen to hash to occupied positions. These rejected URLs are never fetched — the crawler doesn't know they were false positives. If those 100 million URLs are uniformly distributed across the web's quality spectrum, the impact is small (0.1% of coverage). But Bloom filter false positives are not uniformly distributed — they are more likely for URLs whose hash values cluster with already-seen URLs, which can create systematic blind spots for certain URL patterns or hosts. The mitigation is periodic Bloom filter reconstruction from the URL database (which contains the ground truth of known URLs), combined with content-level dedup that catches actual duplicates even if the Bloom filter lets them through.

---

## Insight 6: DNS Resolution Is the Hidden Bottleneck — Every Fetch Requires It, Upstream Resolvers Have Rate Limits, and Cache Misses Add 50-500ms of Latency

**Category:** Performance

**One-liner:** A web crawler making 11,500 fetches per second needs 11,500 DNS resolutions per second, but even with 95% cache hit rates, the remaining 575 misses per second can saturate upstream resolvers and add hundreds of milliseconds of latency to each cache-miss fetch.

**Why it matters:** DNS is often an afterthought in system design, but for a web crawler it is in the critical path of every single fetch. Without DNS resolution, the fetcher cannot convert `example.com` to an IP address and cannot open a TCP connection. A DNS cache miss costs 50-500ms (round-trip to upstream resolver, which may recurse through the DNS hierarchy). At 5% cache miss rate and 11,500 fetches/second, that is 575 upstream DNS queries/second — which can trigger rate limiting from the upstream resolver or ISP-level DNS infrastructure. The solution is a multi-tier DNS caching strategy: (1) fetcher-local cache for the most recently resolved hosts, (2) shared regional cache for all hosts resolved by any fetcher in that region, and (3) pre-resolution of URLs in the near-term fetch queue so that DNS is resolved before the fetcher needs it. Additionally, the crawler must respect DNS TTLs — a cached result that has expired may point to a different IP (the host migrated), and fetching from the wrong IP is both a correctness problem (wrong content) and a politeness problem (hitting a server that is not the intended target).

---

## Insight 7: Spider Traps Are Not Just Malicious — Most Are Accidental — And the Crawler Must Distinguish Infinite URL Spaces from Legitimately Large Sites

**Category:** Resilience

**One-liner:** A calendar page with links to every future date and a large e-commerce site with millions of product pages look identical to a naive trap detector — both produce enormous numbers of unique URLs from a single host — and incorrectly classifying the latter as a trap means losing coverage of a valuable site.

**Why it matters:** Classic spider trap detection uses per-host URL budget limits: "if we've discovered more than 500,000 URLs from a single host, it's probably a trap." But Amazon, Wikipedia, and government databases legitimately have millions of pages. Blocking them at 500,000 URLs means massive coverage loss. Conversely, raising the limit to 10 million URLs means a calendar trap generates 10 million useless fetches before being caught. The distinguishing factor is content uniqueness: a legitimate large site has high content diversity (each product page has unique content), while a trap has low content diversity (each calendar page has the same template with a different date). The crawler must track per-host content uniqueness metrics — if a host generates many URLs but most resolve to near-duplicate content (SimHash Hamming distance < 3), it is likely a trap. This requires the dedup pipeline to feed back into the trap detector, creating a cross-component dependency that must be carefully managed (the trap detector cannot wait for SimHash results if those results take minutes to compute).

---

## Insight 8: Robots.txt Is Both a Contract and a Vulnerability — Treating a 5xx Response as "Allow Everything" Can Get the Crawler Permanently Blocked

**Category:** Security

**One-liner:** When a host's robots.txt returns a server error, the crawler must choose between two bad options: assume "disallow all" (lose coverage for a host that may have no real restrictions) or assume "allow all" (violate restrictions that the host intended to enforce but couldn't serve due to a transient error).

**Why it matters:** The robots.txt fetch is the gatekeeper for all crawling on a host. If it returns 200 OK, the directives are clear. If it returns 404, the convention is "no restrictions" (the host has chosen not to publish restrictions). But a 5xx error is ambiguous: the host has a robots.txt (it is not 404), but the server failed to serve it (internal error, temporary outage). The aggressive approach (treat as "allow all") risks crawling pages the host explicitly disallowed — and when the server recovers and the site owner sees crawler traffic to disallowed pages, they may block the crawler's entire IP range permanently. The conservative approach (treat as "disallow all") means the crawler stops fetching all pages from a host that may have perfectly permissive robots.txt — it just happened to have a server glitch when the crawler checked. Google's documented behavior is to treat 5xx as a temporary issue: continue using the cached (previous) robots.txt if available, and if no cache exists, stop crawling the host and retry the robots.txt fetch with exponential backoff. This is the "safe by default" approach: never assume permissions you haven't been explicitly granted.

---

## Insight 9: Recrawl Scheduling Is a Multi-Armed Bandit Problem — Not a Simple Timer — Because the Crawler Learns Page Change Frequency from Its Own Observations

**Category:** Performance

**One-liner:** The optimal recrawl interval for a page depends on how often it changes, but the only way to learn how often it changes is to crawl it — creating a classic exploration-exploitation trade-off where crawling too often wastes bandwidth and crawling too rarely loses freshness.

**Why it matters:** If the crawler recrawls a page every hour and finds it unchanged 23 out of 24 times, it is wasting 23 fetches per day on that page. If it recrawls every 24 hours and the page actually changes every 2 hours, the index is stale for most of the day. The adaptive approach uses an exponential moving average: if the page changed, decrease the recrawl interval (crawl more often); if unchanged, increase it (crawl less often). But this has a cold-start problem — newly discovered pages have no history, so the initial interval is a guess. It also has an observation bias — the crawler can only observe whether the page changed at the time it recrawled, not how many times it changed between recrawls. A page that changed 10 times between two 24-hour recrawls looks identical to one that changed once. Modern approaches use conditional GET (If-Modified-Since or ETag) to efficiently check for changes without downloading the full page, and predictive models that estimate change probability based on host type (news sites change frequently, academic papers rarely), path depth (homepages change more than deep pages), and content type (product prices change more than company about pages).

---

## Insight 10: The Fetcher's Connection Pool Is a Distributed Resource That Must Be Managed Like Database Connections — Per-Host Limits, Idle Timeouts, and the Thundering Herd Problem

**Category:** Performance

**One-liner:** A million concurrent TCP connections across 5,000 fetcher workers seems manageable at 200 connections each, but the real challenge is distributing those connections across 500 million potential hosts without creating hot spots, exhausting file descriptors, or triggering thundering herd reconnection storms after failures.

**Why it matters:** HTTP persistent connections (keep-alive) dramatically reduce per-fetch overhead by avoiding the TCP handshake and TLS negotiation for each request. But persistent connections consume resources on both the crawler and the target host. If the crawler opens 100 connections to `news.example.com` (a popular host), it has consumed 100 of that host's connection slots — potentially competing with real user traffic. Per-host connection limits (e.g., max 2 persistent connections per host) prevent this but mean the crawler must efficiently multiplex requests across a small number of connections. When a fetcher worker restarts (or a fleet of workers restarts simultaneously during an upgrade), all persistent connections are dropped. The reconnection storm — thousands of workers simultaneously re-establishing connections to the same popular hosts — can overwhelm those hosts. The mitigation is staggered restarts with jittered reconnection delays, combined with connection pooling that ramps up gradually (connect to 10% of hosts per second, not 100% instantly).

---

## Insight 11: Content-Addressed Storage Turns Deduplication From a Pre-Write Check Into a Free Property of the Storage Layer

**Category:** Consistency

**One-liner:** If fetched pages are stored with their content hash as the storage key, then storing the same content from two different URLs is not a "duplicate write" — it is an idempotent overwrite of the same key — eliminating the need for a separate pre-write dedup check against the content store.

**Why it matters:** The obvious approach to content dedup is: (1) compute the content hash, (2) check the content store for that hash, (3) if not found, store the content. Steps 2 and 3 are two separate operations — creating a race condition where two fetchers simultaneously fetch the same content, both check and find it absent, and both write it. With content-addressed storage (the key IS the content hash), both writes are to the same key with the same content — making them naturally idempotent. The "duplicate" write simply overwrites identical bytes at the same key, with no wasted storage and no corruption. This eliminates the need for a distributed lock or check-and-set operation on the content store, converting a concurrency problem into a non-problem. The content dedup store then only needs to track which URLs map to which content hashes (a lightweight metadata operation), not whether the content itself has been stored.
