# Interview Guide — URL Shortener

## 1. 45-Minute Pacing Strategy

### Phase 1: Requirements & Scope (5 minutes)

```
Minute 0-2: Clarify Scope
  "What scale are we designing for — a small internal tool or a Bitly-scale platform?"
  → Determines whether you need multi-region, edge caching, analytics pipeline.

  "Should we support analytics, or just shortening and redirecting?"
  → Analytics transforms a simple redirect service into a data pipeline problem.

  "Do we need custom aliases (vanity URLs), or only system-generated codes?"
  → Custom aliases introduce collision semantics, profanity filtering, reserved words.

Minute 2-4: Functional Requirements
  Must cover:
  ✓ Shorten a URL → get a compact short code
  ✓ Redirect short URL → original destination
  ✓ Link expiration (optional TTL)
  ✓ Click analytics (count, geo, device, referrer)

  Bonus points:
  ✓ Custom alias support
  ✓ 301 vs 302 redirect choice
  ✓ Link management (update destination, delete, deactivate)
  ✓ Abuse/phishing detection on submitted URLs

Minute 4-5: Quick Capacity Estimation
  Key numbers to derive:
  ✓ 100M URLs created/day, 10B redirects/day (100:1 read:write)
  ✓ Write QPS: ~1,200 avg, ~3,600 peak
  ✓ Read QPS: ~115,000 avg, ~350,000 peak
  ✓ Storage per URL: ~350 bytes → ~35 GB/day, ~12.8 TB/year
  ✓ Total keyspace needed: 62^7 = 3.5 trillion (lasts 96 years at 100M/day)
```

### Phase 2: High-Level Design (10 minutes)

```
Minute 5-8: Architecture Diagram
  Draw the core components:
  ✓ Client → CDN/Edge → Global Load Balancer → API Gateway
  ✓ Redirect Service (read-optimized, stateless)
  ✓ Creation Service (write path, separate from redirect)
  ✓ Multi-tier cache: In-Process (L1) → Distributed Cache (L2) → DB (L3)
  ✓ URL Store (sharded key-value store)
  ✓ Message Queue → Stream Processor → Analytics Store

  Key insight to articulate:
  "I'm splitting the read and write services because the read:write ratio
   is 100:1 — they need to scale independently, with read path optimized
   for sub-10ms latency and write path optimized for correctness."

Minute 8-12: Data Flow
  Walk through write path:
  1. Client → Gateway → rate limit + auth
  2. Validate URL format + reputation check (phishing/malware)
  3. Generate short code (ID generator → Base62)
  4. Write to URL Store + populate cache
  5. Return shortened URL to client

  Walk through read path:
  1. User clicks short URL → DNS → edge/CDN
  2. L1 cache → L2 cache → DB (three-tier resolution)
  3. Expiration + soft-delete check
  4. Return 301/302 redirect with Location header
  5. Async: emit click event to message queue (fire-and-forget)

Minute 12-15: Key Decisions
  ✓ Why 302 by default (analytics fidelity vs caching optimization)
  ✓ Why multi-tier cache (100:1 ratio makes caching the primary scaling lever)
  ✓ Why async analytics (don't add latency to the redirect hot path)
  ✓ Why separate read/write services (vastly different scaling profiles)
```

### Phase 3: Deep Dive (15 minutes)

```
Minute 15-20: Data Model & API
  ✓ URL table: short_code (PK), long_url, user_id, created_at, expires_at,
    redirect_type (301/302), is_active
  ✓ Hash index on short_code (O(1) point lookup for redirect)
  ✓ Sharding by short_code prefix (uniform Base62 distribution)
  ✓ REST API: POST /api/v1/urls, GET /{short_code}, GET /api/v1/urls/{code}/analytics

Minute 20-27: ID Generation Deep Dive (The Differentiator)
  ✓ Why not auto-increment: coordination bottleneck, predictable, leaks info
  ✓ Why not hash: collision risk, longer codes, requires collision handling
  ✓ Counter range pre-allocation: Range Server allocates batches of 10K IDs
  ✓ Each instance generates codes locally from its range (no per-ID coordination)
  ✓ Snowflake fallback if Range Server is down (longer codes, but no downtime)
  ✓ Base62 encoding: [0-9a-zA-Z] → 7-char codes from 62^7 keyspace

Minute 27-30: Caching & Redirect Hot Path
  ✓ L1 (in-process): LRU, 100K entries, 15s TTL, sub-ms latency
  ✓ L2 (distributed): 500M entries, 1-6h TTL, 1-2ms latency
  ✓ Cache stampede prevention: distributed lock + jittered TTL
  ✓ Hot link handling: L1 pinning, L2 broadcast, analytics batching
  ✓ Cache invalidation on URL update: DB update → L2 delete → pubsub → L1 delete
```

### Phase 4: Scale & Wrap-Up (15 minutes)

```
Minute 30-37: Scaling & Reliability
  ✓ Database sharding by short_code prefix (consistent hashing, 64-256 shards)
  ✓ Multi-region deployment (edge redirect + centralized creation)
  ✓ Graceful degradation: cache-only mode if DB is down (serve stale data)
  ✓ Circuit breakers between redirect service and DB
  ✓ Analytics pipeline auto-scaling based on consumer lag

Minute 37-42: Analytics & Abuse Prevention
  ✓ Click event pipeline: redirect → queue → enrich (geo, UA) → dedup → store
  ✓ Hourly and daily rollup aggregation
  ✓ URL reputation scoring on creation (phishing, malware database checks)
  ✓ Rate limiting on creation (per-user, per-IP)
  ✓ 404 rate monitoring for enumeration attacks

Minute 42-45: Wrap-Up
  ✓ Summarize key trade-offs made
  ✓ Identify monitoring priorities (redirect latency, cache hit rate, pipeline lag)
  ✓ Mention extensions: vanity domains, A/B testing via redirect, link-in-bio
```

---

## 2. Meta-Commentary: What Makes URL Shortener Unique as an Interview Question

URL Shortener is the "hello world" of system design interviews — nearly every candidate has seen it. This means interviewers expect **depth, not breadth**. Surface-level answers (hash the URL, store in a database, done) will fail. The question is a vehicle for testing your ability to go deep on three areas: **ID generation trade-offs**, **read-heavy optimization**, and the **analytics pipeline**.

### What Interviewers Are Really Testing

```
"Simple" Aspect            → Hidden Depth They Want to See
──────────────────────────────────────────────────────────
Generate a short code       → ID generation trade-offs: auto-increment
                              vs hash vs Snowflake vs counter range.
                              How do you avoid coordination at scale?

Store URL, return redirect  → Multi-tier caching at 100:1 read:write.
                              Cache stampede prevention. Hot link handling.
                              Can you design a system where 95%+ of reads
                              never touch the database?

Redirect the user           → 301 vs 302 is a business + technical trade-off.
                              If you just say "302" without explaining WHY
                              and what you're sacrificing, you've missed it.

Count clicks                → Async event pipeline. How to decouple analytics
                              from the redirect hot path. How to handle
                              100K events/sec with exactly-once semantics.

Handle custom aliases       → Different collision semantics. TOCTOU race
                              conditions. Profanity filtering. Reserved words.
```

### Three Areas That Separate Strong from Weak Answers

1. **ID generation trade-offs**: Don't just pick one. Compare at least three approaches (auto-increment, hash, counter range) with pros/cons. Show you understand the coordination-vs-collision spectrum.

2. **Read-heavy optimization**: The system is 99% reads. If you don't spend significant time on caching architecture (L1, L2, DB fallback, stampede prevention, hot link handling), you're solving the wrong problem.

3. **301 vs 302 implications**: This decision cascades through the entire architecture. 301 kills analytics but reduces server load by 80%+. 302 gives full analytics but costs more. A strong answer explains when you'd use each and offers the 301-with-short-max-age compromise.

---

## 3. Trade-Offs Discussion

| Trade-off | Option A | Option B | Recommendation |
|---|---|---|---|
| **ID generation** | Base62 from counter range — shortest codes (6-7 chars), no collision, requires Range Server coordination | Hash-based (MD5 truncate to Base62) — no coordination, deterministic, collision risk at scale | Counter range for production (shortest URLs are a product feature); mention hash as simpler alternative for low-scale |
| **Redirect type** | 301 (permanent) — browser/CDN caches aggressively, 80% less server traffic, but lose analytics and can't update destination | 302 (temporary) — every click hits server, full analytics, destination updatable, but 100% server load | 302 as default for analytics fidelity; offer 301 as opt-in for static, high-traffic links. Compromise: 301 with short Cache-Control max-age (1 hour) |
| **Pre-generated IDs vs on-demand** | Pre-generated counter range — O(1) per code, no collision check, requires Range Server | On-demand generation (random + uniqueness check) — simpler, no external dependency, but per-code coordination or collision risk | Pre-generated for production scale; on-demand acceptable for < 10K QPS |
| **URL Store** | Relational DB — ACID for custom alias uniqueness, familiar tooling, limited horizontal scale | Key-value NoSQL — horizontal scaling, hash index optimized for point lookups, weaker consistency | NoSQL for redirect hot path; relational if custom alias ACID guarantees are critical. Many teams use both: NoSQL for redirects, relational for user management |
| **Cache strategy** | Cache-aside (application manages cache explicitly) — full control over TTL, eviction, and backfill strategy | Read-through (cache auto-populates on miss) — simpler application code, but less control over hot link pinning and tiered TTLs | Cache-aside for URL shortener (need different TTLs per tier, hot link pinning, custom stampede prevention) |
| **Analytics pipeline** | Synchronous counter increment on redirect — simple, real-time counts, but adds 2-5ms latency and creates write contention | Async event pipeline via message queue — zero redirect latency impact, rich analytics (geo, device), but 1-30 second delay | Async pipeline always; the 100:1 ratio means even small per-redirect latency additions multiply massively |
| **Custom alias namespace** | Shared namespace with generated codes — simpler, but custom alias could conflict with future generated codes | Separate namespace with prefix or routing — no conflicts, but adds routing complexity and longer URLs | Shared namespace with reserved range: generated codes start from counter (numeric-first Base62), custom aliases use user-defined strings with validation |

---

## 4. Trap Questions

| Question | Why It's a Trap | Strong Answer |
|---|---|---|
| "Why not just use auto-increment IDs?" | Tests awareness of information leakage, coordination bottlenecks, and predictability | "Auto-increment leaks creation rate (ID 5M today, 6M tomorrow = 1M/day), enables sequential enumeration of all URLs, and requires a single coordination point. Counter range pre-allocation gives short codes without these drawbacks — instances get batches of 10K IDs and generate locally." |
| "What if Base62 produces offensive words?" | Tests product thinking in an engineering context | "Base62 over [0-9a-zA-Z] can produce strings like profanities by chance. Mitigations: maintain a blocklist filter on generated codes (reject and regenerate), or use Base58 (exclude 0, O, l, I) to also reduce visual ambiguity. For counter-range codes, you can identify and skip known offensive numeric ranges at generation time. This is a product requirement that most candidates forget." |
| "Why not just hash the URL with MD5?" | Tests understanding of collision math and determinism trade-offs | "MD5 is 128 bits. Truncating to 7 Base62 chars (42 bits) gives ~4.4 trillion possibilities — but collision probability hits 1% at ~300M URLs (birthday paradox). You'd need a collision handling loop adding variable latency. Also, hashing is deterministic — it leaks whether a URL was already shortened, which is a privacy concern. Counter-based generation avoids both problems." |
| "How do you handle custom aliases?" | Tests concurrent system design (race conditions, atomic operations) | "Custom aliases need atomic uniqueness: use INSERT-IF-NOT-EXISTS (compare-and-swap), NOT select-then-insert, to prevent TOCTOU race conditions. Also need profanity filtering, reserved word blocking ('api', 'admin', 'help'), length validation (3-30 chars), and character restrictions. Custom aliases share the namespace with generated codes, so reserve a range or use different character patterns to prevent future collisions." |
| "What happens when a link expires during high traffic?" | Tests cache consistency under edge conditions | "The redirect service checks expiration on every request (lazy check), so expired links return 410 immediately on cache miss. But L1 cache (15s TTL) may serve stale entries briefly. The background sweep also proactively invalidates cache entries. For compliance-critical expiration (DMCA takedowns), we push invalidation via pubsub to all L1 caches for immediate effect. The 15-second window is the worst case." |
| "How would you handle 100x current scale?" | Tests your ability to identify shifting bottlenecks, not just "add more servers" | "At 100x (11.5M redirects/sec): (1) L1 must absorb 90%+ of traffic — increase per-instance cache size and instance count, (2) L2 becomes a network bottleneck — shard across more nodes with local read replicas, (3) DB should never see >1% of traffic at this scale, (4) Analytics: sample 1-10% of events to keep pipeline manageable, (5) Edge/CDN caching becomes critical — offer 301 with short max-age for popular links, (6) Geographic distribution: redirect servers at edge PoPs globally." |
| "Is this really read-heavy? You write analytics on every read." | Tests architectural decoupling awareness | "The redirect itself is a pure read: cache lookup and HTTP response. The analytics write is fully decoupled — we publish to a message queue fire-and-forget. The redirect completes in 2-5ms; the analytics event processes asynchronously seconds later. If the queue is down, we buffer locally or drop events. The redirect path never blocks on analytics writes — that's the whole point of the async pipeline." |
| "Should the same long URL always produce the same short URL?" | Tests idempotency design thinking | "It depends. Idempotent mapping (same URL → same code) saves keyspace but: (1) leaks information — you can probe whether a URL was already shortened, (2) different users can't have separate analytics for the same destination, (3) different expiration or alias settings become ambiguous. Most production systems generate a new code per request, with an optional dedup flag for API consumers who explicitly want deterministic behavior." |

---

## 5. Common Mistakes to Avoid

```
Mistake 1: Jumping to the Solution Without Clarifying Scale
├── Why wrong: A URL shortener for 1K QPS is radically different from 100K QPS
├── Impact: Under-designing (no caching) or over-designing (unnecessary sharding)
└── Correct: Ask about scale first, then let the numbers drive architecture

Mistake 2: Ignoring the Analytics Pipeline Entirely
├── Why wrong: Analytics is what makes URL shorteners valuable (and complex)
├── Impact: Misses 50% of the system's architecture — the async event pipeline
└── Correct: Design the analytics pipeline with geo enrichment, dedup, aggregation

Mistake 3: Not Discussing Caching in a 100:1 Read-Heavy System
├── Why wrong: This is fundamentally a caching problem, not a database problem
├── Impact: Proposing a DB-first architecture that fails latency requirements
└── Correct: Lead with multi-tier caching; DB is the fallback, not the primary path

Mistake 4: Single Database Without Sharding Strategy
├── Why wrong: 50B+ URLs with 115K QPS cannot run on a single DB instance
├── Impact: Shows lack of scaling awareness at the estimation stage
└── Correct: Shard by short_code prefix (uniform Base62 distribution)

Mistake 5: Using 301 Without Understanding the Consequences
├── Why wrong: 301 is cached permanently by browsers — you lose all analytics
├── Impact: Shows you don't understand redirect semantics trade-offs
└── Correct: Default to 302; explain 301 as an opt-in with clear trade-offs

Mistake 6: Saying "Just Use a Hash Function" for ID Generation
├── Why wrong: Hash-based IDs have collision risk, produce longer codes
├── Impact: Ignores the birthday paradox and coordination-vs-collision trade-off
└── Correct: Compare hash vs counter vs Snowflake with specific pros/cons

Mistake 7: Not Considering Abuse Prevention
├── Why wrong: URL shorteners are routinely used for phishing and spam
├── Impact: Shows lack of production system thinking
└── Correct: Mention URL reputation checks, rate limiting, phishing detection

Mistake 8: Synchronous Counter Increment for Analytics
├── Why wrong: Adding even 2ms to every redirect compounds at 115K QPS
├── Impact: Treating analytics as "just a counter update" misses the pipeline
└── Correct: Always decouple analytics into async pipeline
```

---

## 6. Questions to Ask the Interviewer

```
Scope-Setting Questions:
├── "What's the expected read:write ratio? I'll assume 100:1 unless stated otherwise."
├── "Do we need real-time analytics, or is near-real-time (30-second delay) acceptable?"
├── "Should we support custom aliases (vanity URLs), or only generated codes?"
├── "Is link expiration a core requirement, or a nice-to-have extension?"
└── "Do we need multi-region deployment, or is single-region sufficient?"

Depth-Exploration Questions:
├── "Should I go deeper on the ID generation strategy or the caching architecture?"
├── "Would you like me to walk through the analytics pipeline in detail?"
├── "Should I discuss the 301 vs 302 trade-off and its business implications?"
├── "Would you like me to cover the abuse prevention and URL reputation system?"
└── "Should I discuss the hot link problem and how to handle viral URLs?"

Alignment Questions:
├── "I'm proposing three-tier caching (L1 → L2 → DB). Want me to justify each tier?"
├── "I'm using counter range pre-allocation for IDs. Should I compare with hash-based?"
├── "I'm defaulting to 302 redirects for analytics. Does that match your intent?"
└── "I'm decoupling analytics into an async pipeline. Should I explore sync alternatives?"
```

---

## 7. Quick Reference Card

```
┌──────────────────────────────────────────────────────────────┐
│               URL SHORTENER QUICK REFERENCE                   │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  SCALE NUMBERS                                                 │
│  ├── 100M URLs/day, 10B redirects/day (100:1 ratio)          │
│  ├── Write: 1,200 QPS avg / 3,600 peak                       │
│  ├── Read: 115,000 QPS avg / 350,000 peak                    │
│  ├── Storage: ~350 bytes/URL → 35 GB/day, 12.8 TB/year       │
│  └── Keyspace: 62^7 = 3.5T codes → 96 years at 100M/day     │
│                                                                │
│  ARCHITECTURE                                                  │
│  ├── Read: CDN → LB → Redirect Service → L1 → L2 → DB       │
│  ├── Write: Gateway → Creation Service → ID Gen → DB → Cache │
│  ├── Analytics: Redirect → Queue → Processor → Analytics DB  │
│  ├── Sharding: by short_code prefix, consistent hashing      │
│  └── Services: separate read (redirect) and write (creation) │
│                                                                │
│  KEY DECISIONS                                                 │
│  ├── 302 by default (analytics); 301 opt-in (caching)        │
│  ├── Counter range pre-allocation for shortest codes          │
│  ├── Three-tier cache: L1 (in-process) → L2 (distributed) →DB│
│  ├── Async analytics via message queue (fire-and-forget)      │
│  └── URL reputation check on creation (phishing/malware)      │
│                                                                │
│  TRADE-OFFS TO DISCUSS                                         │
│  ├── 301 vs 302 redirect (caching vs analytics)               │
│  ├── Counter range vs hash-based IDs (short vs simple)        │
│  ├── Sync vs async analytics (latency vs data freshness)      │
│  ├── Custom alias collision handling (TOCTOU prevention)      │
│  └── Cache-aside vs read-through (control vs simplicity)      │
│                                                                │
│  RED FLAGS (things to NOT say)                                 │
│  ├── ✗ "Use auto-increment IDs" (predictable, leaks info)    │
│  ├── ✗ "Hash the URL with MD5" (collisions, longer codes)    │
│  ├── ✗ "Always use 301" (kills analytics, permanent cache)   │
│  ├── ✗ "No need for caching" (100:1 ratio demands it)        │
│  ├── ✗ "Single database" (can't scale to 115K QPS reads)     │
│  └── ✗ "Sync counter on redirect" (latency on hot path)      │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

*Previous: [Observability](./07-observability.md) | Next: [Insights](./09-insights.md)*
