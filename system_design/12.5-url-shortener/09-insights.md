# Insights — URL Shortener

## Insight 1: Base62 Encoding as a Bijective Function

**Category:** Data Structures

**One-liner:** Base62 encoding establishes a bijective (one-to-one and onto) mapping between integers and short codes, meaning every integer produces a unique string and every valid string maps back to exactly one integer — enabling stateless decoding without any database lookup.

**Why it matters:**

Hash-based approaches (MD5, SHA) are one-way functions: you can go from URL to hash, but not from hash back to URL without a lookup table. Base62 encoding of a counter, by contrast, is fully reversible. Given the short code `2cQaF4t`, you can compute the original integer `125,432,917,635` purely through arithmetic — no network call, no database read. This reversibility has architectural consequences: it enables routing decisions based on the short code itself (extracting the shard key from the code's numeric prefix), validation without storage (is this a plausible code given our counter range?), and debugging (when was this code approximately created, based on its numeric value?). The bijective property also guarantees zero collisions by construction — unlike hash truncation where the birthday paradox creates collision probability proportional to the square root of the keyspace, counter-based Base62 can never produce the same code twice because the underlying counter never repeats, eliminating collision detection, retry loops, and uniqueness constraints for generated codes entirely.

---

## Insight 2: 301 vs 302 Redirect Is an Analytics-vs-Performance Trade-Off

**Category:** System Modeling

**One-liner:** The choice between HTTP 301 (permanent) and 302 (temporary) redirect is the single most consequential architectural decision in a URL shortener, because it determines whether the system even *sees* repeat traffic — and therefore whether analytics, link updates, and expiration enforcement are possible.

**Why it matters:**

When a browser receives a 301 response, it caches the redirect mapping permanently. Every subsequent visit to that short URL is resolved locally by the browser — the request never reaches the server. This means the shortener loses visibility into 80%+ of clicks from repeat visitors. For a marketing analytics platform, this is catastrophic data loss. For a pure infrastructure redirect service optimizing for minimal server load, this is a massive win — potentially reducing redirect QPS by an order of magnitude. The subtlety that separates senior from junior answers is the compromise: 301 with a short `Cache-Control: max-age` (e.g., 1 hour). This gives browsers permission to cache for a bounded period, reducing server load for burst traffic while ensuring the server sees traffic at hourly granularity for analytics. This three-way spectrum — 302 (every click), 301-with-short-max-age (periodic clicks), 301-permanent (first click only) — should be configurable per link, with 302 as the default for most use cases.

---

## Insight 3: At 100:1 Read-Write Ratio, This Is a Caching Problem First

**Category:** Caching

**One-liner:** The extreme read-to-write asymmetry (100 redirects per URL creation) means the database is architecturally irrelevant for the hot path — 95%+ of redirect traffic should never touch it, making cache design the primary engineering challenge rather than database optimization.

**Why it matters:**

At 115,000 redirects per second, even a well-optimized sharded database cannot serve point lookups at acceptable latency without caching. The math is stark: a single database read takes 5-20ms, while a cached read takes 0.1-2ms. A 95% cache hit rate reduces database load from 115K to 5,750 reads/sec — manageable with modest infrastructure. Without caching, you need 10+ database shards dedicated solely to reads. The cache doesn't "improve" performance; it makes the system architecturally feasible. This asymmetry should drive every design decision: the three-tier cache hierarchy (in-process L1 for sub-millisecond hot link access, distributed L2 for the working set, database L3 as source of truth) exists specifically because of this ratio. A system with a 10:1 ratio might survive with a single distributed cache. At 100:1, the in-process L1 becomes essential — it absorbs burst traffic from viral links without any network hop, turning a potentially overwhelming spike into a per-instance memory lookup.

---

## Insight 4: Pre-Generated Key Pool Eliminates Write-Path Contention

**Category:** Contention

**One-liner:** Counter range pre-allocation converts the coordination-heavy problem of generating globally unique short codes at write time into a simple local counter increment, eliminating per-request synchronization at the cost of maintaining a Range Server and accepting small gaps in the code sequence.

**Why it matters:**

Without pre-allocation, every URL creation requires some form of global coordination: a centralized auto-increment counter (single point of contention), distributed consensus for uniqueness (high latency), or a hash with collision checking (variable latency from retries). At 1,200 writes/sec across 10+ creation service instances, this coordination becomes a bottleneck — not because any single approach is slow, but because the overhead multiplies across instances and spikes during burst traffic. Range pre-allocation eliminates this by amortizing the coordination cost: each instance requests a batch of 10,000 IDs from the Range Server once, then generates codes locally without any further synchronization. The Range Server itself is trivial — a single atomic counter persisted to durable storage, handling ~100 range requests per second. The trade-off is gaps: if an instance crashes mid-range, unused IDs are wasted. But with 3.5 trillion possible 7-character codes, wasting a few thousand per crash is architecturally irrelevant. The Snowflake fallback (longer codes but zero coordination) ensures the write path never fails even if the Range Server is completely unreachable.

---

## Insight 5: Custom Aliases Create a Dual-Key System with Different Collision Semantics

**Category:** Consistency

**One-liner:** Supporting both system-generated short codes and user-chosen custom aliases means the system must handle two fundamentally different key types — one that is collision-free by construction (counter-based) and one that is collision-prone by nature (user input into a shared namespace).

**Why it matters:**

System-generated codes from a counter range can never collide with each other — each counter value is used exactly once. Custom aliases, by contrast, live in a shared namespace where multiple users may request the same string ("my-link", "sale", "promo"). This creates a collision domain that doesn't exist for generated codes, requiring atomic INSERT-IF-NOT-EXISTS operations, conflict responses (409 Conflict), and retry UX on the client side. The deeper design challenge is namespace interaction: can a custom alias collide with a future generated code? If the counter eventually produces the Base62 encoding of "sale", and a user already claimed "sale" as a custom alias, the system has a conflict. The solution is namespace partitioning — generated codes occupy a numeric range (counter values encoded to Base62 always start with predictable character patterns), while custom aliases are validated against different rules (requiring at least one character that counters would never produce, or reserving code patterns that start with digits for generated use). This partitioning must be designed upfront; retrofitting it after millions of codes exist is painful.

---

## Insight 6: Link Expiration Is a Lazy Deletion Problem

**Category:** Cost Optimization

**One-liner:** Expiring links through a periodic database scan seems simple but creates contention at scale; the correct approach combines lazy deletion on read (immediate correctness) with background sweep (eventual storage reclamation) — two different operations solving two different problems.

**Why it matters:**

A naive expiration cron job that scans the entire URL table every minute has O(n) cost proportional to the number of URLs. At 50 billion URLs, even with an index on `expires_at`, the scan is expensive and competes with production traffic for I/O. Worse, it creates batch deletion spikes that trigger cache invalidation storms when thousands of entries are removed simultaneously. The two-tier approach separates concerns cleanly. Lazy deletion on read means the redirect service checks `expires_at` on every lookup and returns 410 Gone if expired — this provides instant correctness with zero background overhead. Background sweep runs periodically in controlled batches (1,000 at a time), reading from a replica, to reclaim storage and clean up cache entries for URLs that were never accessed after expiration. A link that expires and is never accessed again doesn't consume redirect resources — it's cleaned up asynchronously. A link that expires but is still being clicked gets a correct 410 response immediately, regardless of whether the sweep has processed it yet. The combination ensures correctness is immediate while storage reclamation is eventual and non-disruptive.

---

## Insight 7: URL Shorteners Are Phishing Infrastructure by Design

**Category:** Security

**One-liner:** The core value proposition of a URL shortener — hiding the destination URL behind a short, opaque code — is exactly what makes it ideal infrastructure for phishing, malware distribution, and spam, making abuse detection an existential requirement rather than a nice-to-have.

**Why it matters:**

Every URL shortener is, by definition, a URL obfuscation service. A user clicking `short.ly/a1B2c3` has no way to determine whether it leads to a legitimate website or a credential-harvesting phishing page. Attackers exploit this aggressively: shorteners appear in SMS phishing campaigns (smishing), email spam, social media bots, and malware distribution chains. If a shortening service becomes known as a phishing vector, ISPs and email providers will blocklist its entire domain — killing the service for all legitimate users. This means URL reputation checking must be synchronous on the creation path: every submitted URL should be validated against known malware databases, phishing URL lists, and domain reputation services before a short code is issued. This adds 10-25ms to the write path — acceptable given that the write path is already the "slow" path at 100:1 ratio. The service must also implement retroactive scanning: a URL safe at creation time may later be weaponized (domain gets compromised), so periodic re-checks of active URLs are necessary. Abuse prevention is not a feature — it is the difference between a useful service and a blocklisted liability.

---

## Insight 8: Analytics Pipeline Decoupling — Synchronous Redirect, Asynchronous Tracking

**Category:** Scaling

**One-liner:** The analytics pipeline must be architecturally invisible to the redirect path — a fire-and-forget event emission that adds zero latency to redirects, even if the entire analytics backend is down, because redirect availability is worth more than analytics completeness.

**Why it matters:**

The redirect path serves 115,000 requests per second with a P99 latency target of 50ms. The analytics pipeline processes those same events through geo-enrichment, User-Agent parsing, deduplication, fraud detection, and batch insertion into a columnar store. If these systems were coupled — if the redirect blocked until the analytics write completed — a slow analytics insert would cascade into redirect latency spikes, degrading the entire service. The decoupling mechanism is fire-and-forget publish to a message queue: the redirect service emits the click event and immediately returns the redirect response without waiting for acknowledgment. If the queue is unavailable, events are buffered in-process (up to 10,000 entries) or dropped as a last resort. The design explicitly accepts analytics data loss over redirect latency degradation. A 0.001% loss in click accuracy during a queue outage is infinitely preferable to adding 100ms to every redirect. This priority ordering (redirect availability > analytics completeness) must be encoded in circuit breaker logic, timeout configurations, and fallback strategies throughout the system.

---

## Insight 9: Hot URL Problem — Viral Links Create Single-Key Contention

**Category:** Traffic Shaping

**One-liner:** A single viral URL can receive 50,000+ requests per second — more than some entire services handle — creating a hot-key problem where one short code dominates cache eviction, database reads, and analytics event volume, requiring graduated countermeasures at every layer.

**Why it matters:**

Standard caching assumes a roughly uniform access distribution. A viral link violates this assumption catastrophically: one key may account for 40%+ of all traffic. In a distributed cache with consistent hashing, all requests for that key route to the same cache shard, overwhelming it while other shards sit idle. If the entry expires or is evicted under LRU pressure, hundreds of concurrent requests fall through to the database simultaneously (cache stampede). The mitigation is a hot-link detection and promotion system with graduated response. When a short code exceeds a QPS threshold (e.g., 10,000 req/sec), the system activates progressive countermeasures: (1) pin the entry in L1 cache with an extended TTL so it survives LRU eviction, (2) replicate to all L2 cache shards (not just the consistent-hash owner) so no single shard is overwhelmed, (3) batch analytics events in memory and flush periodically instead of per-click emission, (4) at extreme levels (>100,000 QPS), sample analytics events at 10% and multiply counts by the sample rate. This graduated approach keeps the system stable without wasting resources on non-hot URLs.

---

## Insight 10: Idempotent URL Creation — Same Long URL, New Short Code, or Same One?

**Category:** Atomicity

**One-liner:** Whether the same long URL should always produce the same short code (idempotent) or a new one each time (generative) is a fundamental design choice that affects privacy, analytics isolation, storage efficiency, and the write path's complexity — with no universally correct answer.

**Why it matters:**

Idempotent creation (same URL → same code) seems elegant: it saves keyspace, enables deduplication, and gives users a predictable mapping. But it has hidden costs. First, it leaks information: anyone can check whether a URL was already shortened by submitting it and seeing if they get a new code or an existing one. Second, it breaks analytics isolation: if two users shorten the same URL, their click analytics are merged — user A sees user B's campaign traffic. Third, it requires an index on the long URL (or its hash) for the dedup lookup, adding latency and storage to the write path. Generative creation (new code each time) avoids all these issues but uses more keyspace. At 3.5 trillion possible 7-character codes and 100M creations per day, the keyspace lasts 96 years — keyspace conservation is not a meaningful concern. The pragmatic solution is generative by default with an opt-in `dedup=true` parameter for API users who explicitly want deterministic behavior. This preserves privacy and analytics isolation for the common case while supporting dedup when explicitly requested.

---

## Insight 11: Base62 Keyspace Exhaustion Math — Practically Infinite but Monitoring Matters

**Category:** Scaling

**One-liner:** The 7-character Base62 keyspace contains 3.5 trillion possible codes — enough for 96 years at 100 million URLs per day — making exhaustion a non-issue in practice, but the counter position should still be monitored because "practically infinite" and "actually infinite" are architecturally different.

**Why it matters:**

Keyspace math is straightforward: 62^7 = 3,521,614,606,208 codes. At 100M URLs/day (36.5B/year), the keyspace lasts ~96 years. Even at 10x growth (1B URLs/day), it lasts ~9.6 years. This means a 7-character code length is sufficient for any realistic deployment horizon. However, consumption is not perfectly efficient — counter range pre-allocation wastes IDs on instance crashes (small gaps), custom aliases consume codes from the same namespace, and deleted codes are never reused (tombstoned permanently for security). The monitoring concern is operational, not mathematical. The Range Server's counter position should be tracked as a capacity planning metric with annual review cadence. When the counter approaches 62^7, the system needs a planned migration to 8-character codes (62^8 = 218 trillion, extending capacity by 62x). This migration is straightforward if planned: new codes use 8 characters, existing 7-character codes remain valid indefinitely. If unplanned, it becomes an emergency under production pressure. The insight is that capacity planning for "practically infinite" resources still requires a monitoring signal — the failure mode is not exhaustion itself, but the absence of warning before exhaustion.

---

## Insight 12: Geographic Redirect Optimization — Edge Caching for Sub-10ms Global Latency

**Category:** Caching

**One-liner:** Deploying redirect resolution at CDN edge points of presence eliminates the cross-region round-trip for popular links, enabling sub-10ms redirect latency globally — but only for 301 redirects, creating a direct tension between edge performance and analytics capture.

**Why it matters:**

A user in Tokyo clicking a short URL served by an origin in North America incurs 150-200ms of network round-trip time before the redirect even begins. For a service whose core value is instant redirection, this latency is unacceptable for global users. Edge deployment — running redirect logic (or at least cache lookup) at CDN PoPs worldwide — eliminates the cross-region hop. Popular links cached at 200+ edge locations can be resolved in under 10ms from anywhere on the planet. The constraint is the 301/302 distinction: CDNs can cache and serve 301 responses at the edge because the redirect is permanent, but for 302 responses (the default for analytics), the CDN typically passes through to origin. This creates a three-tier latency profile: hot links with 301 get edge-cached redirects (sub-10ms globally), hot links with 302 get edge-proxied to the nearest regional origin (20-50ms), and cold links fall through to the database (50-200ms). The geographic optimization is therefore most impactful for high-traffic, analytics-optional use cases — exactly the scenario where enterprises trade analytics granularity for performance, completing the circle back to the 301-vs-302 trade-off that underpins every layer of this system.

---

*Previous: [Interview Guide](./08-interview-guide.md)*
