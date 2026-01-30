# Deep Dive & Bottlenecks

[← Back to Low-Level Design](./03-low-level-design.md) | [Next: Scalability & Reliability →](./05-scalability-and-reliability.md)

---

## Deep Dive 1: Media Processing Pipeline

### Why This Is Critical

The media processing pipeline is Instagram's most computationally intensive component. Every upload—95 million per day—must be processed before it can be displayed. Unlike text-based social platforms, Instagram cannot serve any content until media processing completes.

**Key Challenges:**
- 1,100 uploads/second average, 3,300+ at peak
- Video processing previously consumed 80%+ of compute resources
- Users expect immediate acknowledgment despite processing time
- Multiple output variants required (thumbnails, ABR streams)

### How It Works Internally

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MEDIA PROCESSING ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐ │
│  │   Upload    │    │ Processing  │    │     Output Generation       │ │
│  │   Handler   │───►│   Queue     │───►│                             │ │
│  └─────────────┘    └─────────────┘    │  ┌─────────────────────────┐│ │
│        │                   │            │  │ IMAGE PATH:             ││ │
│        │                   │            │  │ • ML Compression        ││ │
│        ▼                   │            │  │ • Thumbnail Gen (3 sizes)│ │
│  ┌─────────────┐           │            │  │ • Filter Application    ││ │
│  │   Temp      │           │            │  │ • Thumbhash Generation  ││ │
│  │   Storage   │           │            │  └─────────────────────────┘│ │
│  └─────────────┘           │            │  ┌─────────────────────────┐│ │
│                            │            │  │ VIDEO PATH:             ││ │
│                            │            │  │ • AV1 Encoding (primary)││ │
│                            │            │  │ • H.264 Encoding (fb)   ││ │
│                            │            │  │ • ABR Variants (4 sizes)││ │
│                            │            │  │ • Super Resolution      ││ │
│                            │            │  │ • HLS Manifest Gen      ││ │
│                            │            │  └─────────────────────────┘│ │
│                            │            └───────────────┬─────────────┘ │
│                            │                            │               │
│                            │                            ▼               │
│                            │            ┌─────────────────────────────┐ │
│                            │            │    Blob Storage (Final)     │ │
│                            │            │    + CDN Warm Cache         │ │
│                            │            └─────────────────────────────┘ │
│                            │                            │               │
│                            │                            ▼               │
│                            │            ┌─────────────────────────────┐ │
│                            └───────────►│ Content Moderation Check    │ │
│                                         └─────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### AV1 Codec: The 94% Compute Reduction

Instagram achieved a 94% reduction in video encoding compute costs through several innovations:

```
BEFORE (Simple Encoding Only):
┌────────────────────────────────────────────────────────────────────────┐
│ Video Upload → H.264 Encode (all bitrates) → Store → Serve            │
│                                                                        │
│ Problem: H.264 encoding at all quality levels consumed 80%+ of compute│
└────────────────────────────────────────────────────────────────────────┘

AFTER (Optimized Pipeline):
┌────────────────────────────────────────────────────────────────────────┐
│ Video Upload                                                           │
│     │                                                                  │
│     ├──► Quick H.264 (single bitrate) ──► Immediate Availability      │
│     │                                                                  │
│     └──► Background AV1 (all bitrates) ──► Replace H.264 when ready   │
│                                                                        │
│ Benefits:                                                              │
│ • AV1: 30% better compression (smaller files, same quality)           │
│ • AV1: 70% of video watch time now uses AV1                           │
│ • Tiered processing: fast path for immediate, quality path for final  │
│ • 94% compute reduction for "simple" encoding tier                    │
└────────────────────────────────────────────────────────────────────────┘
```

### Super Resolution at Scale

Instagram deploys Video Super Resolution (VSR) to enhance quality without increasing file size:

```
SUPER RESOLUTION PIPELINE:

Server-Side (Preprocessing):
┌─────────────────────────────────────────────────────────────────────┐
│ Low-res video → VSR Model → Enhanced source → AV1 Encode           │
│                                                                     │
│ • Applied to lower ABR tiers before encoding                       │
│ • Creates higher-quality source for compression                    │
│ • Runs on Intel OpenVINO (CPU-based, no GPU needed)               │
│ • Processing time: <10ms per frame                                 │
└─────────────────────────────────────────────────────────────────────┘

Client-Side (Playback):
┌─────────────────────────────────────────────────────────────────────┐
│ Low-bitrate stream → On-device VSR → Upscaled display              │
│                                                                     │
│ • ExecuTorch runtime for on-device ML                              │
│ • Enhances quality when bandwidth limited                          │
│ • Uses device GPU (Metal on iOS, Vulkan on Android)                │
│ • No additional bandwidth required                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Processing queue backup | Upload delays | Auto-scaling workers, priority queues |
| Encoding failure | Content unavailable | Retry with exponential backoff, fallback to H.264 |
| Blob storage unavailable | Complete outage | Multi-region replication, circuit breaker |
| CDN cache miss storm | Origin overload | Origin shield, gradual cache warming |
| Moderation service down | Unmoderated content | Queue for later, flag for manual review |

### Handling Processing Failures

```
PSEUDOCODE: ProcessingRetryLogic

function processWithRetry(job):
    maxRetries = 3
    retryDelays = [1s, 5s, 30s]  // Exponential backoff

    for attempt in range(maxRetries):
        try:
            result = processMedia(job)
            return result
        catch TransientError as e:
            if attempt < maxRetries - 1:
                sleep(retryDelays[attempt])
                continue
            else:
                // Move to dead letter queue
                DeadLetterQueue.enqueue(job, error=e)
                notifyOncall("Processing failed after retries", job)
                return markAsFailed(job)
        catch PermanentError as e:
            // Don't retry, notify user
            notifyUser(job.user_id, "Upload failed: " + e.message)
            return markAsFailed(job)
```

---

## Deep Dive 2: Stories TTL System

### Why This Is Critical

Stories are Instagram's most time-sensitive feature. Each Story must:
- Appear immediately after posting (sub-second)
- Be visible for exactly 24 hours (not 23h 59m, not 24h 1m)
- Disappear atomically across all followers' devices
- Handle offline clients that come online after expiration

**Scale:** 500+ million daily Stories users, each potentially posting multiple Stories.

### How 24-Hour TTL Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       STORIES TTL ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  POST TIME (T=0)                                                        │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Story created with:                                               │ │
│  │   • created_at = now()                                            │ │
│  │   • expires_at = now() + 86400 seconds (24h)                      │ │
│  │   • ttl_seconds = 86400 (Cassandra TTL)                           │ │
│  │                                                                   │ │
│  │ Stored in:                                                        │ │
│  │   • Cassandra (active_stories) with TTL                           │ │
│  │   • Redis (stories:{user_id}) with TTL                            │ │
│  │   • CDN edge cache with TTL                                       │ │
│  │   • Client cache with expires_at                                  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  EXPIRATION TIME (T=24h)                                               │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Multiple expiration mechanisms (defense in depth):                │ │
│  │                                                                   │ │
│  │ 1. Cassandra TTL: Row auto-deleted after 86400s                   │ │
│  │ 2. Redis EXPIREAT: Key auto-deleted at expires_at                 │ │
│  │ 3. CDN: Cache entries expire based on TTL header                  │ │
│  │ 4. Expiration Service: Scheduled job for cleanup                  │ │
│  │ 5. Client: Local validation before display                        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Expiration Service Deep Dive

```
PSEUDOCODE: StoryExpirationService

// Runs every minute
function expirationJob():
    currentTime = now()

    // 1. Find expiring Stories (batch query)
    expiringStories = Cassandra.query("""
        SELECT story_id, user_id, expires_at
        FROM active_stories
        WHERE expires_at <= ?
        ALLOW FILTERING
    """, [currentTime + 60s])  // Next minute's expiring Stories

    for story in expiringStories:
        scheduleExpiration(story, story.expires_at)


function scheduleExpiration(story, expireAt):
    // Schedule precise expiration
    delay = expireAt - now()
    if delay <= 0:
        expireStoryNow(story)
    else:
        ScheduledQueue.schedule(
            task=expireStoryNow,
            args=[story],
            executeAt=expireAt
        )


function expireStoryNow(story):
    parallel:
        // 1. Delete from Redis cache
        Redis.delete(f"stories:{story.user_id}:{story.story_id}")

        // 2. Invalidate CDN cache
        CDN.invalidate(f"/stories/{story.user_id}/{story.story_id}/*")

        // 3. Update Stories tray for all followers
        followers = getFollowers(story.user_id)
        for follower in followers:
            updateStoriesTray(follower, story.user_id)

        // 4. Archive or delete media
        if story.user.has_highlights_enabled:
            moveToArchive(story)
        else:
            BlobStorage.scheduleDelete(story.media_id, delay=24h)

        // 5. Log expiration event
        Analytics.log("story_expired", story)


function updateStoriesTray(viewer_id, author_id):
    // Check if author has any remaining active Stories
    remainingStories = Redis.get(f"stories:{author_id}")

    if isEmpty(remainingStories):
        // Remove ring indicator
        Redis.srem(f"stories_ring:{viewer_id}", author_id)
    else:
        // Update tray ranking (recalculate score)
        newScore = calculateTrayScore(viewer_id, author_id)
        Redis.zadd(f"stories_tray:{viewer_id}", newScore, author_id)
```

### Handling Offline Clients

```
CLIENT-SIDE STORY VALIDATION:

function displayStory(story):
    // Always validate before display
    if story.expires_at < localTime():
        // Story expired, don't display
        removeFromLocalCache(story)
        refreshStoriesTray()
        return null

    // Check for clock skew (up to 5 minutes tolerance)
    if abs(story.expires_at - serverTime()) > 300s:
        // Significant clock skew, sync with server
        serverExpiration = fetchExpirationFromServer(story.id)
        story.expires_at = serverExpiration

    return story


function onAppResume():
    // User opens app after being offline
    localStories = getLocalStoriesCache()

    for story in localStories:
        if story.expires_at < now():
            removeFromLocalCache(story)

    // Sync with server for any edge cases
    serverTray = fetchStoriesTray()
    reconcile(localStories, serverTray)
```

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Expiration job delays | Stories visible > 24h | Multiple TTL mechanisms (Cassandra, Redis, client) |
| CDN cache not invalidated | Expired Story served | Short TTL headers, client-side validation |
| Clock skew (client) | Wrong expiration time | Server-authoritative timestamps, NTP sync |
| Redis down | Tray ranking broken | Fallback to Cassandra, degrade gracefully |
| Cassandra partition unavailable | Stories invisible | Multi-DC replication, retry different replica |

---

## Deep Dive 3: Explore Ranking System

### Why This Is Critical

Explore is Instagram's primary discovery mechanism, driving 50%+ of content discovery. The system must:
- Process 65 billion features per request
- Make 90 million predictions per second
- Return results in <350ms (p99)
- Surface content from accounts users don't follow (out-of-network)

### Two-Stage Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     EXPLORE TWO-STAGE RANKING                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STAGE 1: CANDIDATE RETRIEVAL (Light Models)                           │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Input: User embedding (interests vector)                         │ │
│  │                                                                   │ │
│  │ Sources:                                                          │ │
│  │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐      │ │
│  │ │ Interest-Based  │ │ Cluster-Based   │ │ Trending        │      │ │
│  │ │ (ANN Search)    │ │ (Community)     │ │ (Global)        │      │ │
│  │ │ ~2000 items     │ │ ~2500 items     │ │ ~500 items      │      │ │
│  │ └─────────────────┘ └─────────────────┘ └─────────────────┘      │ │
│  │                                                                   │ │
│  │ Output: ~5,000 candidates                                         │ │
│  │ Latency Budget: 50ms                                              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              ↓                                          │
│  STAGE 2: RANKING (Heavy Models)                                       │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Input: 5,000 candidates + user context                            │ │
│  │                                                                   │ │
│  │ Feature Extraction (65 billion features total):                   │ │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐│ │
│  │ │ User Features│ │ Post Features│ │Author Feature│ │ Context    ││ │
│  │ │ - History    │ │ - Engagement │ │ - Profile    │ │ - Time     ││ │
│  │ │ - Interests  │ │ - Content    │ │ - Authority  │ │ - Device   ││ │
│  │ │ - Embeddings │ │ - Metadata   │ │ - Embeddings │ │ - Session  ││ │
│  │ └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘│ │
│  │                                                                   │ │
│  │ ML Scoring (1,000+ models):                                       │ │
│  │ - Engagement prediction (like, comment, share, save)              │ │
│  │ - Watch time prediction                                           │ │
│  │ - Quality score                                                   │ │
│  │ - Integrity score (content safety)                                │ │
│  │                                                                   │ │
│  │ Output: ~200 ranked posts                                         │ │
│  │ Latency Budget: 200ms                                             │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              ↓                                          │
│  STAGE 3: POST-RANKING FILTERS                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ - Diversity (no consecutive same-author)                          │ │
│  │ - Content type balance (photos, videos, Reels)                    │ │
│  │ - Quality floor (minimum engagement threshold)                    │ │
│  │ - Safety filtering (flagged content removed)                      │ │
│  │                                                                   │ │
│  │ Output: Final Explore feed                                        │ │
│  │ Latency Budget: 50ms                                              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  TOTAL LATENCY: <300ms (p95), <350ms (p99)                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Andromeda: Next-Gen Retrieval Engine

Instagram's Andromeda system (December 2024) revolutionized candidate retrieval:

```
ANDROMEDA ARCHITECTURE:

Traditional Approach:
┌────────────────────────────────────────────────────────────────────────┐
│ User Query → Embedding Lookup → ANN Search → Candidates               │
│                                                                        │
│ Problem: Fixed retrieval strategy, limited personalization             │
└────────────────────────────────────────────────────────────────────────┘

Andromeda Approach:
┌────────────────────────────────────────────────────────────────────────┐
│ User Query → Deep Neural Network (customized per user) → Candidates   │
│                                                                        │
│ Benefits:                                                              │
│ • 10,000x model capacity improvement                                   │
│ • Sublinear inference cost (doesn't scale with model size)            │
│ • Highly personalized retrieval                                        │
│ • 14% improvement in content quality                                   │
└────────────────────────────────────────────────────────────────────────┘
```

### Feature Store Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FEATURE STORE                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ONLINE STORE (Low Latency)                                            │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Technology: Redis + Custom caching layer                          │ │
│  │ Latency: <5ms p99                                                 │ │
│  │ Features: Pre-computed, refreshed every 5-15 minutes              │ │
│  │                                                                   │ │
│  │ Data:                                                             │ │
│  │ • User embeddings (1024-dim vectors)                              │ │
│  │ • User interest clusters                                          │ │
│  │ • Recent engagement history (last 100 actions)                    │ │
│  │ • Content embeddings (cached hot content)                         │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  OFFLINE STORE (Training Data)                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Technology: Distributed data warehouse                            │ │
│  │ Data: Historical features for model training                      │ │
│  │ Refresh: Daily batch jobs                                         │ │
│  │                                                                   │ │
│  │ Features:                                                         │ │
│  │ • 30-day engagement aggregates                                    │ │
│  │ • User behavior sequences                                         │ │
│  │ • Content performance metrics                                     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  REAL-TIME FEATURES                                                    │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Technology: Streaming pipeline                                    │ │
│  │ Latency: <1 second from event to feature                          │ │
│  │                                                                   │ │
│  │ Examples:                                                         │ │
│  │ • Current session actions                                         │ │
│  │ • Time since last open                                            │ │
│  │ • Device context (battery, network)                               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Feature store latency spike | Ranking timeout | Feature caching, stale feature fallback |
| Model inference failure | No ranking | Fallback to simpler model, cached rankings |
| Candidate retrieval empty | Empty Explore | Global trending fallback |
| Feature pipeline lag | Stale recommendations | Real-time feature supplements, monitoring |

---

## Bottleneck Analysis

### Bottleneck 1: Celebrity Uploads

**Problem:** When a celebrity (>100K followers) posts, the content must be discoverable by millions of users immediately.

```
SCENARIO: Celebrity with 50M followers posts
─────────────────────────────────────────────

Naive Approach (Fan-out on Write):
• 50M Redis writes required
• At 1ms per write = 50,000 seconds = 13.8 hours
• System completely blocked

Hybrid Approach (Instagram's Solution):
• Celebrity posts stored in author's post list only
• On feed load, merge celebrity posts on-demand
• Only ~1,000 writes (metadata, cache warming)
• Latency: < 1 second

Trade-off:
• Regular users: Faster feed reads (precomputed)
• Celebrity followers: Slightly slower feed reads (merge required)
```

**Mitigation:**
1. Hybrid fan-out with 100K follower threshold
2. Priority queue for celebrity content moderation
3. Aggressive CDN caching for celebrity media
4. Prefetch celebrity posts during app open

### Bottleneck 2: Explore Candidate Explosion

**Problem:** Explore must consider billions of posts but return in <350ms.

```
CONTENT POOL SIZE:
─────────────────────────────────────────────

Total Posts: ~50 billion (historical)
Active Posts (7 days): ~600 million
Eligible for Explore: ~300 million (quality filtered)

Without Optimization:
• 300M posts × 1000 features = 300B feature lookups
• Impossible in real-time

With Two-Stage Architecture:
• Stage 1: 300M → 5,000 (ANN search, <50ms)
• Stage 2: 5,000 × 13,000 features = 65M features
• Feasible in <300ms
```

**Mitigation:**
1. Two-stage ranking (light retrieval → heavy ranking)
2. Pre-computed content embeddings (offline)
3. Approximate Nearest Neighbor (ANN) for retrieval
4. Feature caching and batching
5. GPU-accelerated inference

### Bottleneck 3: Stories Cache Invalidation

**Problem:** When a Story expires, the cache must be invalidated across all CDN PoPs globally and all follower clients simultaneously.

```
INVALIDATION SCALE:
─────────────────────────────────────────────

Average user: 500 followers
Story expires: Invalidate across:
• 200+ CDN PoPs worldwide
• 500 follower clients (some offline)
• Redis cache entries
• Client-side caches

At 500M Stories/day:
• ~20M Stories expiring per hour
• ~350K Stories expiring per minute
• Continuous invalidation load
```

**Mitigation:**
1. TTL-based expiration (no explicit invalidation needed for Cassandra/Redis)
2. Lazy invalidation for CDN (short TTL headers)
3. Client-side validation (don't display if expired locally)
4. Batch invalidation processing (minute-level granularity)
5. Accept eventual consistency (1-2 minute tolerance)

---

## Concurrency & Race Conditions

### Race Condition 1: Double Posting

**Scenario:** User taps "Post" twice quickly, network is slow.

```
Timeline:
T=0:   User taps "Post"
T=100ms: First request sent
T=200ms: User taps again (impatient)
T=250ms: Second request sent
T=500ms: First request reaches server
T=550ms: Second request reaches server
Result: Two identical posts created

SOLUTION: Idempotency Keys

Client generates unique ID before upload:
  idempotency_key = uuid_v4()

Server checks:
  if Redis.exists(f"upload:{idempotency_key}"):
      return CachedResponse(idempotency_key)
  else:
      result = processUpload()
      Redis.setex(f"upload:{idempotency_key}", 86400, result)
      return result
```

### Race Condition 2: Like Count Inconsistency

**Scenario:** Thousands of users like a post simultaneously.

```
Timeline:
T=0:   Current like_count = 1000
T=1ms: User A reads count: 1000
T=2ms: User B reads count: 1000
T=3ms: User A writes: 1000 + 1 = 1001
T=4ms: User B writes: 1000 + 1 = 1001
Result: Two likes, but count only increased by 1

SOLUTION: Atomic Increment

Use database atomic operations:
  PostgreSQL: UPDATE posts SET like_count = like_count + 1
  Redis: INCR post:123:likes
  Cassandra: Counter columns

For eventual consistency (acceptable for likes):
  Use approximate counting with periodic reconciliation
```

### Race Condition 3: Follow/Unfollow Toggle

**Scenario:** User rapidly toggles follow button.

```
Timeline:
T=0:    User clicks "Follow"
T=50ms: Follow request sent
T=100ms: User clicks "Unfollow"
T=150ms: Unfollow request sent
T=200ms: Unfollow request processed (no relationship exists yet)
T=250ms: Follow request processed
Result: User is now following (opposite of intent)

SOLUTION: Optimistic Locking + Client State

// Client-side: Track pending operations
pendingFollow = {}

function toggleFollow(user_id):
    if pendingFollow[user_id]:
        return  // Debounce

    pendingFollow[user_id] = true
    currentState = getFollowState(user_id)
    targetState = !currentState

    result = await api.setFollowState(user_id, targetState)
    pendingFollow[user_id] = false

// Server-side: Last-write-wins with timestamp
function setFollowState(follower, following, target_state, client_timestamp):
    current = db.getFollow(follower, following)

    if current && current.updated_at > client_timestamp:
        return current  // Stale request, return current state

    if target_state:
        db.upsert("follows", {follower, following, updated_at: now()})
    else:
        db.delete("follows", {follower, following})

    return {state: target_state}
```

---

## Locking Strategies

| Scenario | Strategy | Implementation |
|----------|----------|----------------|
| Like uniqueness | Optimistic (upsert) | `INSERT ... ON CONFLICT DO NOTHING` |
| Follow state | Last-write-wins | Timestamp comparison |
| Upload processing | Pessimistic (job queue) | Distributed lock with TTL |
| Counter updates | Atomic operations | Database-level atomicity |
| Story expiration | Idempotent operations | Check-then-act with soft delete |

---

*[← Back to Low-Level Design](./03-low-level-design.md) | [Next: Scalability & Reliability →](./05-scalability-and-reliability.md)*
