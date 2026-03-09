# Interview Guide — Pastebin

## 1. 45-Minute Pacing Strategy

### Phase 1: Requirements & Scope (5 minutes)

```
Minute 0-2: Clarify Scope
  "What are we optimizing for — simplicity and correctness, or massive scale?"
  → Most interviewers want both, but knowing emphasis helps prioritize.

  "Should we support anonymous users, or only authenticated?"
  → Typically both; anonymous with rate limiting.

  "Is syntax highlighting a core requirement or nice-to-have?"
  → Usually core; discuss where to render (client vs server).

Minute 2-4: Functional Requirements
  Must cover:
  ✓ Create paste (text content → unique URL)
  ✓ Read paste (URL → content with syntax highlighting)
  ✓ Paste expiration (configurable TTL)
  ✓ Access control (public, unlisted, private)
  ✓ Delete paste

  Bonus points:
  ✓ Burn after reading
  ✓ Content deduplication
  ✓ Password protection

Minute 4-5: Quick Capacity Estimation
  Key numbers to derive:
  ✓ 1M DAU, 2M pastes/day, 5:1 read:write
  ✓ Average paste: 5 KB → 10 GB/day content storage
  ✓ Write QPS: ~23 avg, ~70 peak
  ✓ Read QPS: ~116 avg, ~350 peak (but CDN absorbs 80%)
  ✓ Year 1 storage: ~3.6 TB content + 365 GB metadata
```

### Phase 2: High-Level Design (10 minutes)

```
Minute 5-8: Architecture Diagram
  Draw the core components:
  ✓ Client → CDN → Load Balancer → API Gateway
  ✓ Paste Service (core logic)
  ✓ Key Generation Service (pre-generated pool)
  ✓ Metadata DB (relational) — separate from content
  ✓ Object Storage (content blobs)
  ✓ Cache layer (between service and storage)
  ✓ Expiration worker (background cleanup)

  Key insight to articulate:
  "I'm separating metadata from content because they have different
   access patterns, scaling needs, and cost profiles."

Minute 8-12: Data Flow
  Walk through write path:
  1. Client → Gateway → rate limit → abuse scan
  2. Compute content hash → dedup check
  3. Store content in object storage (if new)
  4. Claim slug from KGS
  5. Write metadata to DB
  6. Warm cache → return URL

  Walk through read path:
  1. CDN cache check → app cache check → DB lookup
  2. Expiration check (lazy deletion if expired)
  3. Content fetch from object storage
  4. Return with syntax highlighting hints

Minute 12-15: Key Decisions
  ✓ Why separate metadata and content stores
  ✓ Why pre-generated keys (vs hash-based or auto-increment)
  ✓ Why client-side syntax highlighting (vs server-side)
  ✓ Why lazy deletion + background sweep (vs eager-only)
```

### Phase 3: Deep Dive (20 minutes)

```
Minute 15-20: Data Model & API
  ✓ Paste metadata schema (slug, content_hash, expires_at, visibility)
  ✓ Content blob addressing (hash-based key with prefix)
  ✓ REST API: POST /pastes, GET /pastes/{slug}, DELETE /pastes/{slug}
  ✓ Index design (expiration, user_pastes, content_hash)

Minute 20-25: Key Generation Deep Dive
  ✓ Why 8-char Base62: 218 trillion combinations
  ✓ KGS with pre-generated pool (SKIP LOCKED for concurrent claims)
  ✓ Pool monitoring and replenishment
  ✓ Fallback strategy (UUID if KGS fails)

Minute 25-30: Expiration & Cleanup
  ✓ Three-tier strategy: lazy deletion + TTL index + background sweep
  ✓ Sweep worker: batch processing, replica reads, rate limiting
  ✓ Edge cases: burn-after-reading race, clock skew
  ✓ Reference counting for deduplicated content

Minute 30-35: Scaling & Caching
  ✓ Multi-layer cache: CDN → app cache → DB
  ✓ Bloom filter to prevent cache thrashing
  ✓ Hot paste problem and request coalescing
  ✓ DB scaling path: replicas → vertical → sharding
```

### Phase 4: Wrap-Up (10 minutes)

```
Minute 35-40: Reliability & Operations
  ✓ SPOF analysis: DB primary, KGS, object storage
  ✓ Failover: DB standby promotion, KGS fallback to UUID
  ✓ Graceful degradation levels
  ✓ Monitoring: key pool size, expiration backlog, cache hit rate

Minute 40-45: Security & Extensions
  ✓ XSS prevention: sanitized rendering, CSP headers
  ✓ URL enumeration: 218T keyspace, rate limiting 404s
  ✓ Abuse: malware scanning, PII detection, rate limiting
  ✓ Extensions: E2E encryption, paste diffing, collaboration
```

---

## 2. Meta-Commentary: What Makes Pastebin Deceptively Tricky

Pastebin is often dismissed as "too simple" for system design interviews, but it's actually an excellent test of fundamentals:

### Surface Simplicity Hides Real Depth

```
"Simple" Aspect          → Hidden Complexity
─────────────────────────────────────────────────────────
Store text, get URL      → Key generation strategy (collision avoidance,
                           information leakage, key space exhaustion)

Delete after expiry      → Three-tier expiration (lazy + TTL + sweep),
                           reference counting for deduped content,
                           clock skew across nodes

Show with colors         → Client vs server rendering trade-off,
                           CPU cost at scale, caching rendered output

Simple CRUD              → Immutable content enables aggressive caching,
                           but deletion and expiration break cache assumptions

Store text in DB         → Metadata-content separation, object storage
                           for cost efficiency, deduplication via hashing
```

### What Interviewers Are Really Testing

1. **Can you identify the right storage separation?** (metadata vs content)
2. **Do you understand key generation trade-offs?** (random vs hash vs counter)
3. **Can you design expiration at scale?** (not just "use a cron job")
4. **Do you think about abuse?** (not just "add rate limiting")
5. **Can you layer caching effectively?** (CDN + app cache + DB cache)

---

## 3. Trade-Offs Discussion

| Trade-off | Option A | Option B | Recommendation |
|---|---|---|---|
| **Key generation** | Pre-generated pool (KGS) -- zero collision, O(1) lookup, requires pool management | Hash-based (SHA to Base62) -- simple, deterministic, collision risk with truncation | KGS for production; mention hash as simpler alternative |
| **Content storage** | Single database (simple, consistent) -- works at small scale | Separated metadata + object storage -- scales independently, cost-efficient | Separation at any serious scale; single DB for MVP only |
| **Syntax highlighting** | Server-side -- consistent rendering, no client library needed | Client-side -- offloads CPU, supports themes, instant re-rendering | Hybrid: client for web, server for embeds. Articulate trade-off clearly |
| **Expiration** | Eager deletion (cron sweep) -- consistent state, simpler queries | Lazy deletion (check on read) -- no background job, eventual cleanup | Both: lazy for correctness, sweep for storage reclamation |
| **Deduplication** | Store all (simple, no reference counting complexity) | Content-addressable (15-30% savings, requires ref counting) | Deduplicate at scale for cost savings; skip for MVP |
| **Cache invalidation** | Short TTL (5 min) -- bounded staleness, simple | Active invalidation (purge on delete) -- immediate consistency | Both: short TTL as safety net + active invalidation for deletes |
| **Paste size limit** | Small (64 KB) -- fast to process, less abuse surface | Large (10 MB) -- more flexible, supports large files | 512 KB is the sweet spot -- covers 99% of use cases |

---

## 4. Trap Questions

| Question | Why It's a Trap | Strong Answer |
|---|---|---|
| "Can you use auto-increment IDs for paste URLs?" | Leaks creation rate, enables enumeration, reveals total paste count | "Auto-increment leaks information and enables sequential enumeration. Random Base62 slugs prevent guessing. Pre-generated pool avoids collision." |
| "Why not store everything in one database?" | Tests whether you understand access pattern separation | "Metadata is small, relational, needs indexing. Content is large, immutable, benefits from cheap object storage. Different scaling profiles." |
| "How do you handle a paste that's been shared on a site with millions of users?" | Tests hot-key awareness | "CDN absorbs most traffic. For extreme cases: extend CDN TTL, replicate cache entry to all nodes, enable request coalescing at origin, consider static file promotion." |
| "What happens when the KGS runs out of keys?" | Tests operational thinking and fallback design | "Monitor pool with alerts at 20% capacity. Auto-replenish when low. Emergency fallback: generate UUID-based slugs (longer URLs but zero downtime)." |
| "Why not just use a TTL in the database for expiration?" | Tests understanding of multi-strategy approach | "TTL works for NoSQL but not all relational DBs. Even with TTL, need lazy deletion on read for immediate correctness, and background sweep for content blob cleanup and cache invalidation." |
| "How do you prevent someone from finding unlisted pastes?" | Tests security understanding of URL-as-capability | "8-char Base62 = 218 trillion combinations. At 1K guesses/sec = 6.9M years to enumerate. Rate limit 404 responses. Monitor sequential access patterns." |
| "What if two users paste the same content?" | Tests deduplication understanding | "Content-addressable storage: hash the content, check for existing blob, reuse if found. Each user gets a unique slug pointing to same content_hash. Reference counting tracks when blob can be deleted." |
| "Why not encrypt all pastes at rest?" | Tests nuanced security thinking | "We do encrypt at rest (server-side). But server-side encryption doesn't protect against compromised servers. For true confidentiality, offer optional client-side E2E encryption. Trade-off: server can't scan E2E encrypted content for abuse." |

---

## 5. Common Mistakes

```
Mistake 1: Treating It Like a URL Shortener
├── Why wrong: Pastebin stores content (up to 512 KB), not just a redirect URL
├── Impact: Undersizing storage, missing content management complexity
└── Correct: Separate metadata from content, plan for TB-scale content storage

Mistake 2: Ignoring Expiration Complexity
├── Why wrong: "Just run a cron job" fails at billion-paste scale
├── Impact: Table scans lock the database, cleanup competes with live traffic
└── Correct: Three-tier approach (lazy + TTL + background sweep with batching)

Mistake 3: Forgetting Abuse Prevention
├── Why wrong: Open paste creation is a magnet for spam, malware, data dumps
├── Impact: Service becomes a malware hosting platform, gets blacklisted
└── Correct: Content scanning pipeline, rate limiting, CAPTCHA, DMCA workflow

Mistake 4: Server-Side Rendering All Syntax Highlighting
├── Why wrong: CPU-intensive for 200+ languages at scale
├── Impact: High server cost, increased latency, scaling bottleneck
└── Correct: Client-side rendering for web; server-side only for embeds and crawlers

Mistake 5: Single Database for Everything
├── Why wrong: Mixing small metadata with large content in one DB
├── Impact: Expensive, poor scaling, inefficient storage utilization
└── Correct: Relational DB for metadata, object storage for content

Mistake 6: Not Considering Deduplication
├── Why wrong: 15-30% of pastes are duplicates (common snippets, templates)
├── Impact: Wasted storage at scale (1TB+ per year of unnecessary content)
└── Correct: Content-addressable storage with reference counting

Mistake 7: Forgetting CDN for Read Path
├── Why wrong: Read-heavy workload without CDN overloads origin
├── Impact: Poor latency for global users, unnecessary infrastructure costs
└── Correct: CDN absorbs 80%+ of reads; immutable content is perfect for CDN
```

---

## 6. Questions to Ask the Interviewer

```
Scope-Setting Questions:
├── "What scale are we targeting? Startup (10K DAU) or established platform (5M DAU)?"
├── "Are we focusing on the web interface, the API, or both?"
├── "Should the system support team/organization features?"
└── "Is search across pastes in scope, or only access by URL?"

Depth-Exploration Questions:
├── "Should we dive deeper into the expiration mechanism or the caching strategy?"
├── "Would you like me to discuss the abuse detection pipeline in more detail?"
├── "Should I walk through the multi-region disaster recovery approach?"
└── "Would you like to explore the deduplication trade-offs further?"

Alignment Questions:
├── "I'm assuming read-heavy workload (5:1 ratio). Does that match your expectation?"
├── "I'm proposing separating metadata from content. Want me to justify this further?"
└── "For expiration, I'm using a three-tier approach. Should I simplify or go deeper?"
```

---

## 7. Quick Reference Card

```
┌──────────────────────────────────────────────────────────┐
│                  PASTEBIN QUICK REFERENCE                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  SCALE NUMBERS                                           │
│  ├── 1M DAU, 2M pastes/day, 10M reads/day              │
│  ├── Write: 23 QPS avg / 70 peak                        │
│  ├── Read: 116 QPS avg / 350 peak (70 at origin)       │
│  ├── Storage: 10 GB/day, 3.6 TB/year                   │
│  └── CDN absorbs 80%+ of reads                          │
│                                                          │
│  ARCHITECTURE                                            │
│  ├── Metadata: Relational DB (leader-follower)          │
│  ├── Content: Object Storage (hash-addressed)           │
│  ├── Cache: Multi-layer (CDN + app cache + DB)          │
│  ├── Keys: Pre-generated pool (KGS), 8-char Base62     │
│  └── Workers: Expiration sweep, abuse scan (async)      │
│                                                          │
│  KEY DECISIONS                                           │
│  ├── Separate metadata from content (different scaling)  │
│  ├── KGS over hash-based keys (zero collision)          │
│  ├── Client-side syntax highlighting (save CPU)          │
│  ├── Three-tier expiration (lazy + TTL + sweep)         │
│  └── Content dedup via SHA-256 (15-30% savings)         │
│                                                          │
│  TRADE-OFFS TO DISCUSS                                   │
│  ├── KGS complexity vs hash simplicity                   │
│  ├── Dedup savings vs reference counting overhead        │
│  ├── CDN staleness vs active invalidation cost           │
│  └── Client vs server syntax highlighting                │
│                                                          │
│  RED FLAGS (things to NOT say)                           │
│  ├── ✗ "Use auto-increment IDs" (enumerable)            │
│  ├── ✗ "Store content in the DB" (expensive at scale)   │
│  ├── ✗ "Cron job for expiration" (doesn't scale)        │
│  ├── ✗ "Server-render all highlighting" (CPU bomb)      │
│  └── ✗ "No need for abuse detection" (will be abused)   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```
