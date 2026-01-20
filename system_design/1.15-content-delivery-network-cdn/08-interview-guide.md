# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Approach

### 45-Minute Pacing Guide

```
┌────────────────────────────────────────────────────────────────────┐
│ CDN SYSTEM DESIGN - 45 MINUTE INTERVIEW                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ [0-5 min] REQUIREMENTS CLARIFICATION                               │
│ ────────────────────────────────────                               │
│ • What scale? (requests/sec, bandwidth, global regions)           │
│ • What content types? (static, video, API)                        │
│ • Latency requirements? (<50ms typical)                           │
│ • Cache consistency needs? (eventual OK?)                         │
│ • Security requirements? (DDoS, WAF)                              │
│                                                                     │
│ Good Answer: "Let me design for 100K RPS, 1 Tbps, 200+ PoPs,     │
│ <50ms TTFB for cache hits, eventual consistency acceptable,       │
│ with DDoS protection built in."                                    │
│                                                                     │
│ [5-15 min] HIGH-LEVEL ARCHITECTURE                                 │
│ ─────────────────────────────────                                  │
│ • Draw multi-tier architecture: Edge → Shield → Origin            │
│ • Explain Anycast routing to nearest PoP                          │
│ • Show request flow for cache hit and miss                        │
│ • Mention key decision: origin shield for request collapsing      │
│                                                                     │
│ Key Components to Draw:                                            │
│   ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐          │
│   │  DNS   │───▶│  Edge  │───▶│ Shield │───▶│ Origin │          │
│   │Anycast │    │  PoPs  │    │        │    │        │          │
│   └────────┘    └────────┘    └────────┘    └────────┘          │
│                                                                     │
│ [15-25 min] DEEP DIVE: CACHE INVALIDATION                         │
│ ─────────────────────────────────────────                          │
│ • Explain purge propagation challenge (200+ PoPs)                 │
│ • TTL-based vs push purge trade-offs                              │
│ • Surrogate keys for efficient group invalidation                 │
│ • Fastly-style instant purge (~150ms)                             │
│                                                                     │
│ [25-35 min] DEEP DIVE: RELIABILITY + SECURITY                     │
│ ───────────────────────────────────────────                        │
│ • Anycast failover mechanics (BGP)                                │
│ • Serving stale on origin failure                                 │
│ • DDoS protection (L3/L4 + L7)                                    │
│ • Signed URLs for access control                                  │
│                                                                     │
│ [35-40 min] VIDEO STREAMING + SCALING                             │
│ ─────────────────────────────────────                              │
│ • HLS/DASH segment caching                                        │
│ • Request coalescing for thundering herd                          │
│ • Adding new PoPs for scaling                                     │
│                                                                     │
│ [40-45 min] WRAP-UP                                                │
│ ──────────────────                                                 │
│ • Summarize key trade-offs made                                   │
│ • Mention what you'd add with more time                           │
│ • Answer follow-up questions                                       │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Whiteboard Strategy

```
┌────────────────────────────────────────────────────────────────────┐
│ WHITEBOARD LAYOUT                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ LEFT SIDE: Architecture Diagram                              │  │
│  │                                                               │  │
│  │        ┌──────────┐                                          │  │
│  │        │  Users   │                                          │  │
│  │        └────┬─────┘                                          │  │
│  │             │ Anycast                                        │  │
│  │        ┌────▼─────┐                                          │  │
│  │        │   Edge   │ ◄─── 200+ PoPs globally                 │  │
│  │        │   PoPs   │                                          │  │
│  │        └────┬─────┘                                          │  │
│  │             │ Cache miss                                     │  │
│  │        ┌────▼─────┐                                          │  │
│  │        │  Shield  │ ◄─── Request collapsing                 │  │
│  │        │  (L2)    │                                          │  │
│  │        └────┬─────┘                                          │  │
│  │             │                                                 │  │
│  │        ┌────▼─────┐                                          │  │
│  │        │  Origin  │                                          │  │
│  │        └──────────┘                                          │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ RIGHT SIDE: Key Numbers & Formulas                           │  │
│  │                                                               │  │
│  │  Scale:                                                       │  │
│  │  • 100K+ RPS aggregate                                       │  │
│  │  • 200+ PoPs globally                                        │  │
│  │  • 400+ Tbps capacity                                        │  │
│  │                                                               │  │
│  │  Latency Targets:                                            │  │
│  │  • Cache hit: < 20ms p50, < 50ms p99                        │  │
│  │  • Cache miss: < 200ms p50                                   │  │
│  │  • Purge propagation: < 200ms                               │  │
│  │                                                               │  │
│  │  Key Ratios:                                                  │  │
│  │  • Cache hit ratio: > 95% (static)                          │  │
│  │  • Origin offload: > 90%                                     │  │
│  │  • Shield collapse ratio: 90%+                               │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Key Talking Points

### Must-Mention Concepts

| Topic | What to Say | Why It Matters |
|-------|-------------|----------------|
| **Anycast Routing** | "All PoPs announce same IP via BGP, traffic routes to nearest" | Core of CDN architecture |
| **Cache Hierarchy** | "Edge → Shield → Origin, with shield collapsing requests" | Origin protection is critical |
| **Surrogate Keys** | "Tag-based invalidation for efficient purge of related content" | Shows knowledge of real CDN systems |
| **Request Coalescing** | "Multiple requests for same content wait for single origin fetch" | Prevents thundering herd |
| **stale-while-revalidate** | "Serve stale immediately, refresh async in background" | Zero-latency refresh |
| **HTTP/3 QUIC** | "0-RTT handshake, connection migration for mobile" | Modern protocol awareness |

### Things to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| Just saying "use CDN" | Too shallow | Explain multi-tier architecture |
| Ignoring invalidation | Biggest challenge in CDN | Discuss TTL + purge + surrogate keys |
| Missing origin shield | Shows limited understanding | Explain request collapsing, origin protection |
| No security discussion | CDN is first line of defense | Cover DDoS, WAF, signed URLs |
| Ignoring consistency | Real trade-off | Acknowledge eventual consistency, discuss SWR |

---

## Trap Questions & Answers

### Question: "How do you handle cache invalidation globally?"

```
┌────────────────────────────────────────────────────────────────────┐
│ GOOD ANSWER                                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ "This is one of the hardest problems in CDN design. I'd use       │
│ a multi-layered approach:                                          │
│                                                                     │
│ 1. TTL-based expiration (primary):                                 │
│    Most content uses Cache-Control headers. Origin sets TTL,       │
│    content naturally expires. No coordination needed.              │
│                                                                     │
│ 2. Push purge for urgent updates:                                  │
│    When content must be invalidated immediately, I'd use a        │
│    fanout architecture:                                            │
│    - API receives purge request                                    │
│    - Publish to message queue                                      │
│    - Regional aggregators fan out to PoPs                         │
│    - Each PoP acknowledges completion                             │
│    - Target: < 200ms global propagation                           │
│                                                                     │
│ 3. Surrogate keys for group invalidation:                         │
│    Tag content with keys like 'product-123'. When product         │
│    changes, purge by tag instead of enumerating URLs.             │
│    Uses inverted index at each edge node.                         │
│                                                                     │
│ 4. Soft purge (stale marking):                                    │
│    Instead of delete, mark as stale. Next request triggers        │
│    revalidation. Faster than hard delete."                        │
│                                                                     │
│ Trade-off: Purge adds operational complexity, but TTL-only       │
│ means potentially serving stale content for hours.                 │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Question: "What happens when a PoP fails?"

```
┌────────────────────────────────────────────────────────────────────┐
│ GOOD ANSWER                                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ "With Anycast routing, PoP failures are handled automatically     │
│ by the network:                                                     │
│                                                                     │
│ 1. Detection:                                                       │
│    - Health checks running every 1-5 seconds                      │
│    - Monitor: CPU, memory, origin reachability, error rate        │
│                                                                     │
│ 2. Proactive Withdrawal:                                           │
│    - Before complete failure, detect degradation                  │
│    - Withdraw BGP announcement for this PoP                       │
│    - Traffic starts shifting to other PoPs                        │
│                                                                     │
│ 3. BGP Reconvergence:                                              │
│    - Routers recalculate best paths                               │
│    - Takes 10-90 seconds depending on network                     │
│    - Users routed to next-nearest PoP                             │
│                                                                     │
│ 4. During Transition:                                              │
│    - Some in-flight TCP connections may reset                     │
│    - Clients retry and succeed on new PoP                         │
│    - New PoP may have cache miss (cold cache)                     │
│                                                                     │
│ 5. Recovery:                                                        │
│    - Fix issue, verify health                                      │
│    - Gradually re-announce BGP (25% → 50% → 100%)                │
│    - Cache warms up as traffic returns                            │
│                                                                     │
│ Key insight: Anycast makes this mostly automatic. The challenge   │
│ is making failover fast enough that users don't notice."          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Question: "How do you protect against DDoS attacks?"

```
┌────────────────────────────────────────────────────────────────────┐
│ GOOD ANSWER                                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ "CDNs are natural DDoS mitigation because of distributed          │
│ capacity. I'd implement multi-layer defense:                       │
│                                                                     │
│ Layer 3/4 (Volumetric):                                            │
│ - Anycast distributes attack across all PoPs                      │
│ - BGP Flowspec for dynamic filtering rules                        │
│ - Rate limiting per source IP at network edge                     │
│ - 400+ Tbps capacity absorbs large attacks                        │
│                                                                     │
│ Layer 7 (Application):                                              │
│ - WAF rules for known attack patterns                             │
│ - Bot detection via fingerprinting                                │
│ - JavaScript challenges for suspicious requests                   │
│ - Rate limiting per IP/session                                    │
│                                                                     │
│ Origin Protection:                                                  │
│ - Hide real origin IP                                             │
│ - Origin firewall allows only CDN IPs                             │
│ - Authenticated origin pull (secret header)                       │
│ - Rate limiting at shield to prevent origin overload             │
│                                                                     │
│ Key numbers:                                                        │
│ - Cloudflare: 300+ Tbps capacity                                  │
│ - Can absorb attacks that would take down any single origin       │
│                                                                     │
│ Trade-off: More filtering = more latency. Balance security        │
│ with performance."                                                 │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Question: "How do you handle video streaming at scale?"

```
┌────────────────────────────────────────────────────────────────────┐
│ GOOD ANSWER                                                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ "Video streaming is the most demanding CDN use case. Here's       │
│ how I'd handle it:                                                 │
│                                                                     │
│ Content Structure (HLS/DASH):                                      │
│ - Master playlist: Lists quality levels (360p, 720p, 1080p)      │
│ - Variant playlists: Lists segments for each quality             │
│ - Segments: 2-10 second chunks of video                          │
│                                                                     │
│ Caching Strategy:                                                   │
│ - Playlists: Short TTL (5-10s for live, longer for VOD)          │
│ - Segments: Long TTL (24h+), effectively immutable               │
│ - Key insight: Segments are 95%+ of bandwidth                    │
│                                                                     │
│ Request Coalescing:                                                │
│ - New popular video = many simultaneous requests                  │
│ - Without coalescing: origin overload                            │
│ - Shield collapses N edge requests → 1 origin request            │
│                                                                     │
│ Pre-positioning for Live Events:                                   │
│ - Pre-warm caches before event                                    │
│ - Scale origin shield capacity                                    │
│ - Aggressive stale-if-error for resilience                       │
│                                                                     │
│ Adaptive Bitrate:                                                  │
│ - Player monitors bandwidth                                       │
│ - Switches quality dynamically                                    │
│ - CDN caches all quality levels                                  │
│                                                                     │
│ Numbers:                                                            │
│ - 5 Mbps average per viewer                                       │
│ - 1M concurrent viewers = 5 Tbps                                  │
│ - 95%+ from edge cache, < 5% hits origin"                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Trade-off Discussions

### Anycast vs GeoDNS Routing

| Factor | Anycast | GeoDNS |
|--------|---------|--------|
| Failover Speed | Seconds (BGP) | Minutes (DNS TTL) |
| Session Stickiness | Challenging | Easy |
| Implementation | Requires BGP expertise | DNS-based, simpler |
| DDoS Distribution | Natural across all PoPs | Concentrated per region |
| **Best For** | Stateless content | Session-sticky apps |

**Interview Answer:** "I'd use Anycast for most CDN traffic since it's stateless. For customers needing session affinity, offer GeoDNS as an option with low TTLs for faster failover."

### Two-Tier vs Three-Tier Cache

| Factor | Two-Tier (Edge → Origin) | Three-Tier (Edge → Shield → Origin) |
|--------|--------------------------|-------------------------------------|
| Latency | Lower (one less hop) | Higher (extra hop) |
| Origin Load | Higher (all edge misses hit origin) | Lower (shield collapses requests) |
| Complexity | Simpler | More complex |
| Cache Hit Ratio | Lower | Higher (shield cache) |

**Interview Answer:** "Three-tier is essential at scale. Origin shield typically reduces origin load by 90%+ through request collapsing. The extra hop adds ~10-20ms but protects origin from thundering herd."

### TTL-Only vs Push Purge

| Factor | TTL-Only | TTL + Push Purge |
|--------|----------|------------------|
| Complexity | Simple | More complex |
| Freshness | Up to TTL stale | Immediately fresh |
| Coordination | None needed | Global propagation |
| Cost | Lower | Higher (purge infrastructure) |

**Interview Answer:** "Use TTL as default (covers 90% of cases), but support push purge for urgent updates. Surrogate keys make purge efficient for related content groups."

---

## Common Mistakes

| Mistake | Impact | Correct Approach |
|---------|--------|------------------|
| Treating CDN as simple cache | Misses geographic distribution | Discuss multi-PoP architecture, Anycast |
| Ignoring origin shield | Underestimates origin protection | Explain request collapsing, circuit breaker |
| Not discussing invalidation | Missing hardest problem | Cover TTL, purge, surrogate keys |
| Forgetting security | CDN is first defense | Discuss DDoS, WAF, signed URLs |
| No capacity numbers | Can't validate design | Mention: 100K+ RPS, 1+ Tbps, 200+ PoPs |
| Missing video streaming | Common use case | Discuss HLS/DASH, segment caching |

---

## Follow-up Questions to Expect

1. **"How would you handle a viral video launch?"**
   - Pre-position content in all PoPs
   - Aggressive request coalescing
   - Scale origin shield
   - Long stale-if-error for resilience

2. **"What if you need strong consistency?"**
   - Acknowledge trade-off with latency
   - Options: no-cache, must-revalidate
   - Consider API Gateway for dynamic content
   - CDN best for eventually consistent content

3. **"How do you measure CDN effectiveness?"**
   - Cache hit ratio (>95% for static)
   - Origin offload (>90%)
   - TTFB percentiles (p50, p99)
   - Error rate (<0.1%)

4. **"How do you handle personalized content?"**
   - Edge compute (Lambda@Edge, Workers)
   - Vary header for variants
   - Cache key based on session/user segment
   - Or bypass CDN for fully personalized

5. **"What's the difference between CDN and Reverse Proxy?"**
   - CDN: Global distribution, Anycast, caching focus
   - Reverse Proxy: Single location, routing focus
   - CDN uses reverse proxy at each PoP
   - CDN adds geographic distribution layer

---

## Quick Reference Card

```
┌────────────────────────────────────────────────────────────────────┐
│ CDN CHEAT SHEET                                                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Architecture:                                                       │
│   Users → Anycast DNS → Edge PoP → Shield → Origin                │
│                                                                     │
│ Key Numbers:                                                        │
│   • 200+ PoPs globally                                             │
│   • 400+ Tbps aggregate capacity                                   │
│   • < 20ms cache hit TTFB (p50)                                   │
│   • < 200ms purge propagation                                      │
│   • > 95% cache hit ratio (static)                                │
│   • > 90% origin offload                                           │
│                                                                     │
│ Cache Headers:                                                      │
│   Cache-Control: public, max-age=3600, s-maxage=86400             │
│   Cache-Control: stale-while-revalidate=60, stale-if-error=300    │
│   Surrogate-Key: product-123 category-electronics                  │
│                                                                     │
│ Invalidation:                                                       │
│   1. TTL expiration (default)                                      │
│   2. Push purge (urgent)                                           │
│   3. Surrogate keys (group)                                        │
│   4. Soft purge (mark stale)                                       │
│                                                                     │
│ Routing:                                                            │
│   Anycast: Same IP, BGP routes to nearest                         │
│   GeoDNS: Different IP per region                                  │
│                                                                     │
│ Security Layers:                                                    │
│   L3/L4: Anycast distribution, rate limiting                       │
│   L7: WAF, bot detection, JS challenge                             │
│   Access: Signed URLs, geo-restrictions                            │
│                                                                     │
│ Video Streaming:                                                    │
│   Manifest: Short TTL (5-10s)                                      │
│   Segments: Long TTL (24h+, immutable)                             │
│   Request coalescing for popular content                           │
│                                                                     │
│ Failover:                                                          │
│   PoP: BGP withdraw → reconverge (10-90s)                         │
│   Origin: Serve stale, try backup origin                          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Clarifying Questions to Ask

At the start of the interview, ask:

1. **Scale**: "What scale are we designing for? 10K RPS? 100K? 1M?"
2. **Content Types**: "Static assets only, or also video streaming and API caching?"
3. **Geographic Scope**: "Global or specific regions?"
4. **Latency Requirements**: "What's the target TTFB? <50ms? <100ms?"
5. **Consistency**: "Is eventual consistency acceptable? What's the max staleness?"
6. **Security**: "Do we need DDoS protection? WAF? Access control?"

These questions help scope the problem and show you understand the trade-offs.
