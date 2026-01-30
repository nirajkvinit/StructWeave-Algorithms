# Interview Guide

[← Back to Observability](./07-observability.md) | [Back to Index →](./00-index.md)

---

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| 0-5 min | **Clarify** | Requirements, scope, constraints | Ask about feed vs Explore vs Stories focus |
| 5-15 min | **High-Level** | Core components, data flow | Draw architecture diagram |
| 15-30 min | **Deep Dive** | 1-2 critical components | Choose media pipeline OR ranking |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failures, scaling | Discuss celebrity problem |
| 40-45 min | **Wrap Up** | Summary, questions | Leave strong impression |

---

## Meta-Commentary

### What Makes Instagram Unique

1. **Media-First Platform**: Unlike Twitter/Facebook, every post requires media processing
2. **Ephemeral Content**: Stories require precise 24-hour TTL management
3. **Visual Discovery**: Explore is primary discovery mechanism (not search)
4. **High Media Volume**: 95M+ uploads/day requires dedicated processing infrastructure

### Where to Spend Most Time

| Area | Priority | Why |
|------|----------|-----|
| Media Processing Pipeline | High | Unique to Instagram, differentiator from text platforms |
| Stories TTL System | High | Interview favorite, tests distributed systems knowledge |
| Explore Ranking | Medium | ML-heavy, demonstrates ML systems knowledge |
| Feed Generation | Medium | Similar to Facebook/Twitter, expected knowledge |
| CDN Architecture | Low | Important but more generic |

### Common Interview Angles

1. **"Design Instagram"** - Open-ended, start with clarifying scope
2. **"Design Instagram's upload system"** - Focus on media processing
3. **"Design Instagram Stories"** - Focus on ephemeral content
4. **"Design Instagram Explore"** - Focus on recommendations
5. **"How would you scale Instagram to 1 billion users?"** - Focus on scaling

---

## Trade-offs Discussion

### Key Trade-offs Table

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Fan-out Strategy** | Push (write-time) | Pull (read-time) | **Hybrid**: Push for <100K followers, pull for celebrities |
| | Pros: Fast reads | Pros: Low write cost | Balances both concerns |
| | Cons: Write amplification | Cons: Slow reads | 100K threshold proven at scale |
| **Consistency** | Strong | Eventual | **Eventual for feeds**, Strong for uploads |
| | Pros: Always current | Pros: High availability | Users accept stale feeds |
| | Cons: Higher latency | Cons: Stale data | Uploads must confirm success |
| **Video Codec** | H.264 (compatible) | AV1 (efficient) | **AV1 primary** with H.264 fallback |
| | Pros: Universal support | Pros: 30% smaller files | 70% of traffic now AV1 |
| | Cons: Larger files | Cons: Older device issues | Cost savings significant |
| **Ranking** | Real-time | Precomputed | **Hybrid**: Precompute candidates, real-time ranking |
| | Pros: Fresh | Pros: Fast | Balance freshness vs latency |
| | Cons: High compute | Cons: Stale | 1,000+ models run real-time |
| **Stories Expiration** | TTL-based | Scheduled jobs | **TTL-based** with job backup |
| | Pros: Automatic | Pros: Precise control | Multiple mechanisms for reliability |
| | Cons: Clock skew | Cons: Overhead | Defense in depth |

### How to Discuss Trade-offs

```
FRAMEWORK: "The trade-off here is between X and Y..."

Example:
"The trade-off here is between write amplification and read latency.
If we push to all followers at write time, a celebrity with 50 million
followers would require 50 million writes per post—that's unsustainable.

But if we pull at read time, every feed load requires merging from
multiple sources, slowing reads.

Instagram uses a hybrid approach: push for regular users under 100K
followers (fast reads, manageable writes), and pull for celebrities
(acceptable read latency, avoids write explosion). The 100K threshold
is based on their analysis of write cost vs read latency trade-off."
```

---

## Trap Questions & How to Handle

### Trap 1: "Why not just use S3 and be done with it?"

**What interviewer wants:** Understanding of CDN optimization, edge caching, and media delivery at scale.

**Best answer:**
> "S3 (or any blob storage) is great for storage, but serving 95 million uploads daily to 2 billion users requires more. We need:
> 1. **Edge caching**: CDN PoPs reduce latency from 200ms to 20ms
> 2. **Origin shield**: Protects storage from cache miss storms
> 3. **Smart prefetching**: ML predicts what to cache (35% bandwidth savings)
> 4. **Multiple formats**: Thumbnails, preview, full-res served optimally
>
> Direct S3 would work for small scale but would be expensive and slow at Instagram's scale."

### Trap 2: "What if a celebrity posts?"

**What interviewer wants:** Understanding of the fan-out problem, hybrid push/pull architecture.

**Best answer:**
> "Great question—this is the 'celebrity problem.' If Cristiano Ronaldo (600M followers) posts and we push to all timelines, that's 600 million writes per post. At 10 posts/day, that's 6 billion writes just for one user.
>
> The solution is hybrid fan-out:
> - **Regular users (<100K followers)**: Push to follower timelines at write time
> - **Celebrities (≥100K followers)**: Store only in their post list; merge at read time
>
> When a follower loads their feed:
> 1. Fetch precomputed timeline (pushed posts)
> 2. Fetch recent posts from followed celebrities (pulled)
> 3. Merge and rank
>
> The 100K threshold is tuned based on write cost analysis."

### Trap 3: "How do you expire Stories exactly at 24 hours?"

**What interviewer wants:** Understanding of distributed TTL, cache coherence, and clock synchronization challenges.

**Best answer:**
> "Precise expiration across a distributed system is tricky. We use defense in depth:
>
> 1. **Cassandra TTL**: Rows auto-delete after 86400 seconds
> 2. **Redis EXPIREAT**: Keys expire at exact timestamp
> 3. **CDN TTL headers**: Edge cache respects max-age
> 4. **Expiration service**: Scheduled job for cleanup and CDN invalidation
> 5. **Client-side validation**: App checks expires_at before display
>
> For offline clients, when they come online, they validate locally first and sync with server. We accept ~1-2 minute tolerance at the edges.
>
> The key insight is that no single mechanism is perfect, but layered together they provide reliable 24-hour expiration."

### Trap 4: "Why not real-time ranking for everything?"

**What interviewer wants:** Understanding of compute cost vs latency trade-offs.

**Best answer:**
> "Real-time ranking for 65 billion features and 90 million predictions per second would be incredibly expensive. We use a two-stage approach:
>
> 1. **Candidate retrieval** (light models): Narrow from millions to thousands using precomputed embeddings and ANN search (~50ms)
> 2. **Ranking** (heavy models): Apply 1,000+ ML models to top candidates (~200ms)
>
> The precomputed embeddings and candidate pools are refreshed every few minutes. This gives us real-time personalization where it matters (final ranking) while keeping costs manageable.
>
> The trade-off: slightly stale candidate pool vs orders of magnitude less compute."

### Trap 5: "What happens if the database goes down?"

**What interviewer wants:** Graceful degradation, caching strategy, failure handling.

**Best answer:**
> "We have multiple layers of defense:
>
> 1. **Cache-first architecture**: Feed is served from Redis cache; database miss is rare
> 2. **Read replicas**: Multiple replicas across regions; automatic failover
> 3. **Graceful degradation**: Serve cached content, disable writes, show stale feed
> 4. **Circuit breaker**: Stop hammering failing database, return cached responses
>
> Degradation hierarchy:
> - Level 1: Serve cached feed (slightly stale)
> - Level 2: Disable new posts, serve read-only
> - Level 3: Show maintenance message
>
> For writes (uploads), we queue to durable storage and process when database recovers."

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | What to Do Instead |
|---------|--------------|---------------------|
| **Jumping to solution** | Miss important requirements | Spend 5 minutes clarifying scope |
| **Designing for 1 trillion users** | Over-engineering | Design for 10x current scale, not 1000x |
| **Ignoring media processing** | Core differentiator | Always mention upload pipeline for Instagram |
| **Single database** | Won't scale | Shard from the start for metadata |
| **Forgetting TTL complexity** | Stories are interview favorite | Discuss distributed expiration |
| **Ignoring celebrities** | Major architectural impact | Always mention hybrid fan-out |
| **Sync processing for uploads** | Poor user experience | Async with immediate ack |
| **No caching strategy** | Will fail latency requirements | Multi-tier caching is essential |
| **Ignoring failures** | Incomplete design | Always discuss circuit breakers, fallbacks |
| **Not discussing trade-offs** | Appears one-dimensional | Always present options and reasoning |

---

## Questions to Ask Interviewer

### Scope Questions
- "Should I focus on the feed, Stories, or Explore? Or a general overview?"
- "Is this for the consumer app or the API for third-party developers?"
- "Should I include video (Reels) or focus on photo sharing?"

### Scale Questions
- "What's the target scale? Millions or billions of users?"
- "Is this regional or global deployment?"
- "What's the expected upload volume?"

### Constraint Questions
- "Any latency requirements I should design for?"
- "Is real-time ranking required or can we precompute?"
- "Any budget constraints I should consider?"

### Requirement Questions
- "Should I include content moderation in the design?"
- "Is ephemeral content (Stories) in scope?"
- "Should I design for mobile-only or web as well?"

---

## Component-Specific Deep Dives

### If Asked About Media Upload

```
KEY POINTS:
1. Immediate acknowledgment (async processing)
2. EXIF stripping for privacy
3. Parallel processing (thumbnails + main)
4. Multiple output formats (preview, thumb, thumbhash)
5. AV1 encoding for video (30% savings)
6. Super Resolution for quality
7. CDN warm-up after processing
8. Content moderation check

NUMBERS TO KNOW:
- 95M uploads/day, ~1,100/sec average
- 94% compute reduction with optimized encoding
- 70% of video on AV1 codec
- Processing time: 5-30 seconds
```

### If Asked About Stories

```
KEY POINTS:
1. 24-hour TTL with multiple mechanisms
2. Cassandra TTL + Redis EXPIREAT + CDN + client
3. Stories tray ranking (viewing history, closeness, prediction)
4. Edge caching for low-latency playback
5. Expiration service for cleanup
6. Offline client handling

NUMBERS TO KNOW:
- 500M+ daily Stories users
- 24-hour = 86,400 seconds TTL
- Tray ranking factors: 35% view history, 30% closeness, 25% prediction, 10% recency
```

### If Asked About Explore/Recommendations

```
KEY POINTS:
1. Two-stage ranking (retrieval → scoring)
2. 65 billion features extracted
3. 90 million predictions per second
4. Andromeda retrieval engine (10,000x capacity)
5. 1,000+ ML models in production
6. Diversity constraints post-ranking

NUMBERS TO KNOW:
- 5,000 candidates after retrieval
- 200 final posts after ranking
- <350ms p99 latency
- 1,000+ models
```

---

## Whiteboard Strategy

### 5-Minute Architecture Sketch

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Clients ──► CDN ──► Load Balancer ──► API Gateway             │
│                           │                                      │
│                           ▼                                      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Core Services                               │   │
│   │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │   │
│   │  │ Media  │ │ Feed   │ │Stories │ │Explore │            │   │
│   │  └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘            │   │
│   └───────┼──────────┼──────────┼──────────┼────────────────┘   │
│           │          │          │          │                     │
│           ▼          ▼          ▼          ▼                     │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │         Storage Layer                                    │   │
│   │  PostgreSQL │ Cassandra │ Redis │ Blob Storage          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ML Services: Ranking (1,000+ models), Moderation, Features    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### What to Label

1. **Client types**: Mobile, Web
2. **Edge layer**: CDN (proprietary), Edge Cache
3. **Gateway**: LB, Auth, Rate Limiter
4. **Core services**: Media, Feed, Stories, Explore
5. **ML services**: Ranking, Moderation, Recommendations
6. **Storage**: PostgreSQL (metadata), Cassandra (timeline), Redis (cache), Blob (media)
7. **Key flows**: Arrows showing upload flow, feed flow

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 INSTAGRAM INTERVIEW CHEAT SHEET                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SCALE NUMBERS:                                                         │
│  • 2B MAU, 500M DAU                                                     │
│  • 95M uploads/day (1,100/sec)                                          │
│  • 90M predictions/sec (Explore)                                        │
│  • 1,000+ ML models                                                     │
│  • 65B features extracted                                               │
│                                                                         │
│  KEY ARCHITECTURE DECISIONS:                                            │
│  • Hybrid fan-out (push <100K, pull ≥100K followers)                   │
│  • AV1 codec for video (30% smaller, 70% adoption)                     │
│  • Two-stage ranking (retrieval → scoring)                             │
│  • Multi-tier caching (Client → CDN → Redis → DB)                      │
│  • Async processing with immediate ack                                  │
│                                                                         │
│  STORIES TTL:                                                           │
│  • Cassandra TTL (86400s)                                              │
│  • Redis EXPIREAT                                                       │
│  • CDN TTL headers                                                      │
│  • Expiration service                                                   │
│  • Client-side validation                                               │
│                                                                         │
│  RANKING SIGNALS:                                                       │
│  • Watch time (highest)                                                 │
│  • Shares/sends (very high)                                             │
│  • Saves (high)                                                         │
│  • Likes (medium-high)                                                  │
│                                                                         │
│  TRAP ANSWERS:                                                          │
│  • "Just use S3" → CDN + edge caching + smart prefetch                 │
│  • "Celebrity posts" → Hybrid fan-out, 100K threshold                  │
│  • "24h expiration" → Defense in depth, 5 mechanisms                   │
│  • "Real-time ranking" → Two-stage, precompute candidates              │
│                                                                         │
│  WHAT MAKES INSTAGRAM DIFFERENT:                                        │
│  • Media-first (every post needs processing)                           │
│  • Ephemeral content (Stories TTL)                                      │
│  • Visual discovery (Explore, not search)                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Final Tips

1. **Start with clarification**: "Before I dive in, I'd like to clarify a few things..."
2. **Draw early**: Get the architecture on the whiteboard in first 10 minutes
3. **Verbalize trade-offs**: "The trade-off here is X vs Y, and I'd recommend Z because..."
4. **Use real numbers**: Reference actual Instagram scale (95M uploads, 2B MAU)
5. **Mention Instagram-specific challenges**: Media processing, Stories TTL, celebrity problem
6. **End strong**: Summarize key decisions and trade-offs in last 2 minutes

---

*[← Back to Observability](./07-observability.md) | [Back to Index →](./00-index.md)*
