# Insights — Pastebin

## Insight 1: Immutable Content Is a Caching Superpower

**Category:** Caching

**One-liner:** Because paste content never changes after creation, every cache layer--from CDN edge to application memory--can cache aggressively with infinite TTL, transforming a potentially complex cache coherence problem into a trivially simple "cache everything, evict only on delete" model.

**Why it matters:**

Most web applications struggle with cache invalidation because content changes unpredictably. Pastebin sidesteps this entirely: once a paste is created, its content is immutable. The URL `/aB3kX9m` will always return the same text. This means CDN edges can cache with long TTLs (5-60 minutes), application caches can hold content indefinitely (until evicted by LRU), and even browser caches can use strong ETags based on the content hash. The only cache invalidation events are deletion and expiration, both of which are owner-initiated and relatively rare compared to read volume.

This property is more powerful than it appears. In a typical CRUD application, a cache hit rate above 90% requires sophisticated invalidation strategies. In a pastebin, 95%+ hit rates are achievable with simple TTL-based caching because content doesn't change. The engineering effort saved on cache invalidation logic can be redirected to other concerns like abuse detection and expiration management.

---

## Insight 2: Content-Addressable Storage Turns Deduplication into a Free Side Effect

**Category:** Data Structures

**One-liner:** By using the SHA-256 hash of paste content as the storage key, deduplication becomes automatic--identical content maps to the same key, and the system naturally stores only one copy regardless of how many users paste the same text.

**Why it matters:**

In practice, 15-30% of pastes contain identical content: "Hello World" programs, default configuration templates, common error messages, and test data. Without deduplication, a large-scale pastebin wastes terabytes of storage on redundant copies. Content-addressable storage eliminates this waste by design: the storage key is the content hash, so identical content can only produce one blob.

The elegance is that deduplication requires zero additional infrastructure--no separate dedup service, no content comparison pipeline, no fuzzy matching. It's a simple hash lookup before write. The cost is reference counting: the system must track how many paste metadata entries reference each content blob, and only delete the blob when the count reaches zero. This reference counting introduces its own complexity (drift, race conditions, reconciliation), but the overall trade-off strongly favors deduplication at any meaningful scale.

---

## Insight 3: The Expiration Problem Is Really Three Different Problems

**Category:** System Modeling

**One-liner:** Paste expiration seems like one feature ("delete after X time") but decomposes into three distinct engineering problems--immediate correctness (don't serve expired content), storage reclamation (actually delete the data), and index maintenance (keep queries fast)--each requiring a different solution.

**Why it matters:**

A naive approach uses a single mechanism: a background job that periodically scans for expired pastes and deletes them. This fails in three ways. First, between scans, expired pastes are still served to users (correctness gap). Second, scanning billions of rows for expired records locks the database (performance impact). Third, the expiration index itself grows without bound, slowing the scan further (feedback loop).

The three-tier solution addresses each problem independently. Lazy deletion on read provides immediate correctness--no expired paste is ever served, regardless of cleanup lag. Background sweep handles storage reclamation in controlled batches during off-peak hours, reading from replicas to avoid impacting the primary. TTL-based indexes (where supported) or partial indexes on `expires_at` keep the expiration query fast by excluding already-deleted records. The insight is that conflating these three concerns into one mechanism creates a system that does all three poorly; separating them allows each to be optimized independently.

---

## Insight 4: The URL Slug Is a Security Boundary, Not Just an Identifier

**Category:** Security

**One-liner:** For unlisted pastes (the default), the 8-character random slug is the sole access control mechanism--it's a capability token embedded in a URL, making key generation quality a security-critical concern, not just a naming convenience.

**Why it matters:**

When a user creates an unlisted paste, they share the URL with intended recipients. There is no login gate, no permission check--anyone with the URL can read the paste. This means the slug itself is the security boundary. If slugs are predictable (auto-increment), sequential (timestamp-based), or from a small keyspace (6-char alphanumeric = 2 billion), an attacker can enumerate valid URLs and discover private content.

The 8-character Base62 keyspace (218 trillion combinations) makes enumeration computationally infeasible: at 1,000 guesses per second, full enumeration would take 6.9 million years. But the keyspace alone isn't sufficient--the system must also rate-limit 404 responses to prevent high-speed scanning, monitor for sequential access patterns, and ensure the random number generator used for slug creation is cryptographically secure (not pseudorandom with a predictable seed). This elevates what seems like a simple "generate a random ID" task into a security-critical system design decision.

---

## Insight 5: Separation of Storage and Presentation Unlocks Multi-Format Serving

**Category:** System Modeling

**One-liner:** By storing raw text and serving syntax-highlighted output as a rendering concern (not a storage concern), the system can serve the same paste as HTML, plain text, JSON, embedded widget, or PDF without storing multiple copies.

**Why it matters:**

A naive implementation might store pre-rendered HTML with syntax highlighting. This seems efficient (render once, serve many times) but creates several problems: the rendered output is 3-5x larger than raw text (storage cost), changing the highlighting theme requires re-rendering all pastes (maintenance burden), and supporting new output formats (JSON API, raw text, embed iframe) requires either additional stored versions or stripping the HTML.

The correct abstraction is to store raw text plus a language hint, and treat rendering as a transformation applied at serving time. For web browsers, the client-side highlighting library renders on demand. For embeds, a server-side renderer produces cached HTML. For API consumers, raw text is returned as-is. For crawlers, pre-rendered HTML provides SEO value. This separation of concerns means a single stored blob serves all use cases, and new output formats can be added without touching storage.

---

## Insight 6: Reference Counting Is the Price of Deduplication

**Category:** Consistency

**One-liner:** Content deduplication via hashing saves 15-30% of storage but introduces a distributed reference counting problem--the system must accurately track how many pastes reference each content blob, and get it exactly right to avoid either orphaned blobs (wasted storage) or premature deletion (data loss).

**Why it matters:**

Reference counting appears simple: increment on paste creation, decrement on paste deletion, delete the blob when count reaches zero. In practice, it's fragile. Concurrent deletions can race: two transactions both read count=1, both decrement to 0, both queue the blob for deletion--but only one deletion is needed. Transaction rollbacks can desync counts: a paste creation increments the ref count, then fails; the ref count is now too high. Expiration sweep workers process thousands of deletions per minute, each decrementing a ref count, creating write contention on popular content hashes.

The practical solution combines atomic database decrements (reference_count = reference_count - 1, not read-modify-write), async blob deletion (verify count=0 before actually deleting), and periodic reconciliation (weekly scan that recalculates counts from actual paste references). The reconciliation is the safety net--it catches all forms of drift. The insight is that any deduplication system that relies on reference counting must budget for reconciliation as a first-class operational concern, not an afterthought.

---

## Insight 7: Rate Limiting Anonymous Services Requires Multi-Signal Identity

**Category:** Traffic Shaping

**One-liner:** When most users are anonymous, IP address alone is a weak identity signal for rate limiting--shared IPs (corporate NATs, VPNs, mobile carriers) cause legitimate users to be throttled, while determined attackers rotate IPs freely.

**Why it matters:**

A pastebin's strength is friction-free usage: no account required to create or read a paste. But this means the system cannot reliably identify individual users for rate limiting. IP-based limiting fails for shared IPs: a large corporate office behind a single NAT address might have hundreds of legitimate users, all sharing one rate limit quota. Conversely, an attacker using a botnet or proxy network can rotate through thousands of IPs, making per-IP limits ineffective.

The solution uses multi-signal fingerprinting: IP address weighted by subnet diversity, browser fingerprint (for web), API key (for authenticated users), and behavioral signals (paste creation frequency, content size distribution, time between requests). The system assigns each signal a confidence weight and computes a composite rate limit. A request from a known API key gets generous limits regardless of IP. A request from a fresh IP with no browser fingerprint and rapid-fire submission patterns gets strict limits and a CAPTCHA challenge. This graduated approach minimizes impact on legitimate users while maintaining effective abuse prevention.

---

## Insight 8: Burn-After-Reading Converts a Stateless Read into a Stateful Mutation

**Category:** Atomicity

**One-liner:** The "burn after reading" feature transforms a simple GET request into an atomic read-and-delete operation, fundamentally changing the concurrency model for that endpoint from embarrassingly parallel to serialized.

**Why it matters:**

Normal paste reads are perfectly parallelizable: 1,000 concurrent readers of the same paste all get the same content, and the system scales linearly. Burn-after-reading breaks this model: exactly one reader should see the content, and all others should get 404. This turns a GET request into a compare-and-swap operation--atomically check that the paste hasn't been read, mark it as read, and return the content.

The implementation requires careful handling: use an atomic UPDATE with a WHERE clause (SET is_read = TRUE WHERE slug = X AND is_read = FALSE), check affected rows (1 = success, 0 = already read), and only return content if the update succeeded. This must happen at the database level--application-level locking would be insufficient in a multi-instance deployment. CDN caching must be disabled for burn-after-reading pastes (Cache-Control: no-store), and the cache layer must be bypassed entirely. This single feature forces the system to distinguish between cacheable and non-cacheable reads at every layer, adding complexity disproportionate to its apparent simplicity.

---

## Insight 9: CDN Cache TTL Is a Correctness Knob, Not Just a Performance Knob

**Category:** Caching

**One-liner:** For a pastebin, the CDN cache TTL directly controls the maximum time a deleted or expired paste remains accessible to the world--making it a correctness and security parameter, not just a latency optimization.

**Why it matters:**

When a user deletes a paste containing accidentally leaked credentials, the CDN may continue serving the cached content until the TTL expires. A 1-hour TTL means the leaked credentials remain publicly accessible for up to an hour after the user thinks they've deleted them. This converts a performance tuning parameter into a security-sensitive configuration.

The solution is layered: short default TTL (5 minutes) bounds the maximum staleness window, active CDN purge on deletion provides near-immediate removal for sensitive cases, and the CDN purge API is called with "urgent" priority for pastes flagged as containing sensitive content. The trade-off is clear: shorter TTL = better correctness but lower cache hit rate and more origin traffic. Longer TTL = better performance but wider staleness window. For a pastebin, 5 minutes is the sweet spot--long enough for meaningful cache benefit on popular pastes, short enough that accidental data exposure is bounded.

---

## Insight 10: The Key Pool Is a Pre-Materialized Index of Future State

**Category:** Contention

**One-liner:** The Key Generation Service pre-generates thousands of unique slugs before they're needed, converting the latency-sensitive, contention-prone problem of generating a collision-free identifier at write time into a simple O(1) dequeue operation.

**Why it matters:**

Without a pre-generated pool, every paste creation must generate a random slug and verify uniqueness against the database--a read-modify-write cycle that becomes a contention point under high write load. If a collision is detected, the system must retry, adding variable latency. Under peak load (70 QPS), these retries and uniqueness checks create unpredictable write latency.

The KGS eliminates this entirely by pre-computing the uniqueness guarantee. The pool contains slugs that are already verified unique--claiming one is a simple atomic operation (SELECT FOR UPDATE SKIP LOCKED). The SKIP LOCKED clause is critical: it ensures concurrent writers don't block each other waiting for the same row, instead each getting a different available slug. The pool acts as a buffer between the unpredictable arrival of write requests and the predictable batch generation of unique identifiers. The monitoring threshold (alert at 20% capacity) ensures the pool never runs dry, and the fallback strategy (UUID generation) ensures the write path never fails even if the KGS is completely down.

---

## Insight 11: Paste Size Limits Are an Abuse Surface Area Control

**Category:** Security

**One-liner:** The maximum paste size (512 KB) isn't just a resource constraint--it's a deliberate security boundary that limits the blast radius of abuse: storage exhaustion attacks, content scanning costs, and the viability of using the service as a file hosting platform.

**Why it matters:**

Without size limits, an attacker can upload multi-gigabyte files disguised as "pastes," rapidly consuming storage and bandwidth. Even with rate limiting (10 pastes/hour), unlimited size means 10 x 1 GB = 10 GB per attacker per hour. With 512 KB limits, the same attacker can only consume 5 MB per hour--a 2,000x reduction in damage potential.

Size limits also affect the abuse detection pipeline. Content scanning (regex matching, ML classification) has O(n) time complexity in content size. A 1 MB paste takes 200x longer to scan than a 5 KB paste. Without limits, the abuse detection pipeline becomes the bottleneck during abuse waves. The 512 KB limit ensures scanning remains fast and predictable, keeping the write path latency within SLO even under adversarial load. The limit also discourages using the pastebin as a general-purpose file hosting service (which would attract DMCA issues and different abuse patterns), keeping the service focused on its core use case: sharing text and code snippets.

---

## Insight 12: Eventual Consistency in View Counts Is a Feature, Not a Compromise

**Category:** Cost Optimization

**One-liner:** Batching view count updates (flushing every 30 seconds instead of writing on every read) reduces database write load by 99%+ for popular pastes, and the staleness is not a bug--approximate view counts are perfectly acceptable for a paste-sharing service.

**Why it matters:**

A naive implementation increments view_count in the database on every read request. For a paste with 10,000 reads per minute, this means 10,000 database writes per minute for a single row--creating a write hot spot that degrades the entire metadata store. The row-level lock contention alone would add 5-10ms to every read.

Batching solves this by buffering increments in memory and flushing periodically. At 10,000 reads/minute with 30-second flush intervals, the database sees 1 write every 30 seconds instead of 167 writes per second--a 5,000x reduction. The trade-off is that view counts are stale by up to 30 seconds. But who cares? View counts on a pastebin are vanity metrics--no user makes a decision based on whether a paste has 42 or 45 views. The system can even display "~40 views" to set expectations of approximation. This is a case where perfect accuracy has real cost and zero value, making eventual consistency the obviously correct choice.
