# 03 - Low-Level Design

## Data Model

### Entity-Relationship Diagram

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
erDiagram
    PODCAST {
        uuid podcast_id PK
        string title
        string slug
        text description
        string author
        string language
        string[] categories
        string cover_art_url
        string rss_feed_url UK
        string website_url
        string feed_etag
        timestamp feed_last_modified
        int poll_interval_seconds
        enum feed_source "rss|websub|podping|direct"
        boolean explicit
        enum status "active|paused|abandoned|removed"
        int subscriber_count
        int total_episodes
        timestamp created_at
        timestamp updated_at
    }

    EPISODE {
        uuid episode_id PK
        uuid podcast_id FK
        string guid UK
        string title
        text description
        text show_notes_html
        int season_number
        int episode_number
        enum episode_type "full|trailer|bonus"
        string audio_original_url
        string audio_mp3_128_key
        string audio_aac_64_key
        string audio_opus_48_key
        int duration_seconds
        bigint file_size_bytes
        string content_type
        boolean explicit
        string transcript_key
        jsonb chapters
        timestamp published_at
        timestamp ingested_at
        enum status "processing|available|unavailable|removed"
    }

    USER {
        uuid user_id PK
        string email UK
        string display_name
        string avatar_url
        string[] preferred_categories
        string locale
        string timezone
        enum subscription_tier "free|premium"
        jsonb notification_prefs
        timestamp created_at
        timestamp last_active_at
    }

    SUBSCRIPTION {
        uuid subscription_id PK
        uuid user_id FK
        uuid podcast_id FK
        boolean auto_download
        int auto_download_limit
        boolean notifications_enabled
        timestamp subscribed_at
    }

    PLAYBACK_STATE {
        uuid user_id FK
        uuid episode_id FK
        int position_seconds
        int speed_multiplier_100
        boolean completed
        timestamp updated_at
    }

    LISTEN_HISTORY {
        uuid history_id PK
        uuid user_id FK
        uuid episode_id FK
        int listened_seconds
        int total_duration_seconds
        float completion_rate
        timestamp started_at
        timestamp ended_at
        string device_type
    }

    DOWNLOAD_EVENT {
        uuid event_id PK
        uuid episode_id FK
        string listener_id_hash
        string ip_hash
        string user_agent
        int bytes_downloaded
        int total_bytes
        boolean iab_valid
        boolean bot_filtered
        timestamp event_at
    }

    AD_CAMPAIGN {
        uuid campaign_id PK
        uuid advertiser_id FK
        string name
        string[] target_categories
        string[] target_geos
        jsonb audience_targeting
        int frequency_cap
        int frequency_window_hours
        decimal budget_remaining
        decimal cpm_bid
        enum position "pre_roll|mid_roll|post_roll"
        timestamp start_date
        timestamp end_date
        enum status "active|paused|completed"
    }

    AD_CREATIVE {
        uuid creative_id PK
        uuid campaign_id FK
        string audio_url
        int duration_seconds
        string click_through_url
        string companion_image_url
    }

    AD_IMPRESSION {
        uuid impression_id PK
        uuid creative_id FK
        uuid episode_id FK
        string listener_id_hash
        enum position "pre_roll|mid_roll|post_roll"
        int ad_position_seconds
        float listen_through_rate
        timestamp served_at
    }

    PODCAST ||--o{ EPISODE : "has"
    USER ||--o{ SUBSCRIPTION : "subscribes"
    PODCAST ||--o{ SUBSCRIPTION : "subscribed_by"
    USER ||--o{ PLAYBACK_STATE : "has"
    EPISODE ||--o{ PLAYBACK_STATE : "tracked_by"
    USER ||--o{ LISTEN_HISTORY : "has"
    EPISODE ||--o{ LISTEN_HISTORY : "listened"
    EPISODE ||--o{ DOWNLOAD_EVENT : "downloaded"
    AD_CAMPAIGN ||--o{ AD_CREATIVE : "has"
    AD_CREATIVE ||--o{ AD_IMPRESSION : "served"
    EPISODE ||--o{ AD_IMPRESSION : "has_ads"
```

### Indexing Strategy

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| `PODCAST` | `(rss_feed_url)` | Unique B-tree | Feed deduplication |
| `PODCAST` | `(status, poll_interval_seconds)` | B-tree | Crawler scheduling |
| `PODCAST` | `(subscriber_count DESC)` | B-tree | Popular shows |
| `PODCAST` | `(categories)` | GIN (array) | Category browsing |
| `EPISODE` | `(podcast_id, published_at DESC)` | B-tree | Latest episodes per show |
| `EPISODE` | `(guid)` | Unique B-tree | RSS dedup |
| `EPISODE` | `(status, published_at DESC)` | B-tree | New episode feed |
| `SUBSCRIPTION` | `(user_id, podcast_id)` | Unique B-tree | Subscription lookup |
| `SUBSCRIPTION` | `(podcast_id)` | B-tree | Subscriber count |
| `PLAYBACK_STATE` | `(user_id, episode_id)` | Primary composite | Position lookup |
| `LISTEN_HISTORY` | `(user_id, started_at DESC)` | B-tree | History feed |
| `DOWNLOAD_EVENT` | `(episode_id, event_at)` | B-tree, partitioned | IAB analytics |
| `DOWNLOAD_EVENT` | `(ip_hash, user_agent, event_at)` | B-tree | Bot/duplicate filtering |

### Partitioning / Sharding Strategy

| Table | Strategy | Key | Rationale |
|-------|----------|-----|-----------|
| `EPISODE` | Range partition by `published_at` (monthly) | Month | Hot data (recent episodes) accessed most |
| `DOWNLOAD_EVENT` | Range partition by `event_at` (daily) | Day | High write volume, time-range queries |
| `LISTEN_HISTORY` | Hash shard by `user_id` | User ID | Even distribution, user-scoped queries |
| `PLAYBACK_STATE` | Hash shard by `user_id` | User ID | Per-user lookup pattern |
| `AD_IMPRESSION` | Range partition by `served_at` (daily) | Day | Billing aggregation by time window |

### Data Retention Policy

| Data | Retention | Archive Strategy |
|------|-----------|-----------------|
| Audio files | Indefinite (while show active) | Tier to cold storage after 2 years no access |
| Episode metadata | Indefinite | N/A |
| Transcripts | Indefinite | Compressed in object storage |
| Playback state | 90 days after last update | Delete stale positions |
| Listen history | 2 years | Aggregate then purge |
| Download events | 90 days raw, 2 years aggregated | Roll up to hourly/daily aggregates |
| Ad impressions | 2 years | Required for billing reconciliation |

---

## API Design

### RESTful API (External-facing)

#### Episode Playback

```
GET /api/v1/episodes/{episode_id}
  → 200: Episode metadata + playback URL

GET /api/v1/episodes/{episode_id}/stream
  → 302: Redirect to DAI-enabled audio URL
  Headers: Range (byte-range for resume)
  Query: format=mp3|aac|opus, quality=high|medium|low

POST /api/v1/episodes/{episode_id}/playback
  Body: { position_seconds, speed, device_id }
  → 204: Playback position saved

GET /api/v1/episodes/{episode_id}/playback
  → 200: { position_seconds, speed, updated_at }

GET /api/v1/episodes/{episode_id}/transcript
  → 200: { segments: [{ start, end, text, speaker }], chapters: [...] }
```

#### Podcast & Subscription Management

```
GET /api/v1/podcasts/{podcast_id}
  → 200: Podcast details + recent episodes

GET /api/v1/podcasts/{podcast_id}/episodes?page=1&limit=20&sort=newest
  → 200: Paginated episode list

POST /api/v1/subscriptions
  Body: { podcast_id, auto_download: true, notify: true }
  → 201: Subscription created

DELETE /api/v1/subscriptions/{subscription_id}
  → 204: Unsubscribed

GET /api/v1/users/me/subscriptions?page=1&limit=50
  → 200: User's subscribed podcasts with latest episode info
```

#### Discovery & Search

```
GET /api/v1/search?q={query}&type=shows|episodes|transcripts&page=1&limit=20
  → 200: Search results with relevance scores

GET /api/v1/discover
  Query: section=for_you|trending|new_releases|categories
  → 200: Personalized discovery feed

GET /api/v1/categories
  → 200: List of podcast categories with counts

GET /api/v1/charts?category={cat}&region={geo}&period=daily|weekly
  → 200: Top charts
```

#### Creator APIs

```
POST /api/v1/creator/podcasts
  Body: { title, description, categories, cover_art (multipart) }
  → 201: Podcast created

POST /api/v1/creator/podcasts/{id}/episodes
  Body: { title, description, audio (multipart), season, episode_number }
  → 202: Episode accepted for processing

GET /api/v1/creator/podcasts/{id}/analytics
  Query: period=7d|30d|90d, metrics=downloads|listens|completion
  → 200: IAB 2.2 compliant analytics
```

### Internal gRPC APIs

```protobuf
service CatalogService {
  rpc GetEpisode(EpisodeRequest) returns (Episode);
  rpc ListEpisodes(ListEpisodesRequest) returns (EpisodeList);
  rpc UpsertEpisodeFromFeed(FeedEpisode) returns (Episode);
  rpc GetPodcastByFeedUrl(FeedUrlRequest) returns (Podcast);
}

service FeedIngestionService {
  rpc SchedulePoll(PollRequest) returns (PollResponse);
  rpc HandleWebSubNotification(WebSubEvent) returns (Ack);
  rpc HandlePodpingEvent(PodpingEvent) returns (Ack);
}

service AdDecisionService {
  rpc GetAds(AdRequest) returns (AdResponse);
  // AdRequest: { episode_id, listener_context, positions[] }
  // AdResponse: { ads: [{ creative_url, position, duration }] }
}

service PlaybackSyncService {
  rpc SavePosition(PositionUpdate) returns (Ack);
  rpc GetPosition(PositionRequest) returns (PlaybackState);
  rpc GetBatchPositions(BatchRequest) returns (BatchPlaybackState);
}

service AnalyticsService {
  rpc IngestEvent(PlaybackEvent) returns (Ack);
  // Fire-and-forget via async queue preferred
}
```

### Idempotency Handling

| Operation | Idempotency Key | Strategy |
|-----------|-----------------|----------|
| Episode ingestion | RSS `<guid>` per podcast | Deduplicate by guid + podcast_id |
| Playback position save | `user_id + episode_id` | Last-write-wins (upsert) |
| Subscription create | `user_id + podcast_id` | Unique constraint |
| Download event | `event_id` (UUID) | Client-generated UUID |
| Ad impression | `impression_id` | Server-generated UUID, deduplicated |

### Rate Limiting

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| Search | 30 req | 1 min | Per user |
| Stream | 100 req | 1 min | Per user |
| Playback sync | 60 req | 1 min | Per user |
| Creator upload | 10 req | 1 hour | Per creator |
| Discovery | 60 req | 1 min | Per user |
| Public API | 1000 req | 1 hour | Per API key |

### Versioning Strategy

URL-based versioning (`/api/v1/`, `/api/v2/`) for external APIs. Internal gRPC uses protobuf evolution with backward-compatible field additions.

---

## Core Algorithms

### 1. Adaptive Feed Polling Scheduler

```
FUNCTION CalculatePollInterval(podcast):
    base_interval = 3600  // 1 hour in seconds

    // Factor 1: Update frequency (exponential moving average)
    avg_hours_between_episodes = podcast.ema_update_interval
    IF avg_hours_between_episodes < 24:
        frequency_factor = 0.25   // Poll every 15 min for daily shows
    ELSE IF avg_hours_between_episodes < 168:  // weekly
        frequency_factor = 1.0    // Poll every hour
    ELSE:
        frequency_factor = 6.0    // Poll every 6 hours for infrequent

    // Factor 2: Popularity (subscriber count)
    IF podcast.subscriber_count > 100000:
        popularity_factor = 0.1   // Top shows: every 6 min
    ELSE IF podcast.subscriber_count > 10000:
        popularity_factor = 0.5
    ELSE IF podcast.subscriber_count > 1000:
        popularity_factor = 1.0
    ELSE:
        popularity_factor = 2.0   // Long tail: less frequent

    // Factor 3: Push-enabled (WebSub or Podping)
    IF podcast.has_websub OR podcast.has_podping:
        push_factor = 4.0   // Rely on push, poll less
    ELSE:
        push_factor = 1.0

    // Factor 4: Consecutive no-change polls (backoff)
    backoff = MIN(podcast.consecutive_no_change * 0.5, 5.0)

    interval = base_interval * frequency_factor * popularity_factor * push_factor
    interval = interval * (1 + backoff)
    interval = CLAMP(interval, 120, 86400)  // 2 min to 24 hours

    // Add jitter to prevent thundering herd
    jitter = RANDOM(0, interval * 0.1)
    RETURN interval + jitter

// Time complexity: O(1) per podcast
// Space complexity: O(1) — stored in podcast metadata
```

### 2. IAB 2.2 Download Deduplication

```
FUNCTION ProcessDownloadEvent(event):
    // Step 1: Bot filtering (user-agent classification)
    IF IsKnownBot(event.user_agent):
        event.iab_valid = false
        RETURN DiscardAsBot(event)

    // Step 2: Build dedup key
    // IAB 2.2: Same IP + User-Agent + Episode within 24 hours = 1 download
    dedup_key = HASH(event.ip_address + event.user_agent + event.episode_id)
    window_key = dedup_key + DATE(event.timestamp)

    IF EXISTS_IN_CACHE(window_key):
        existing = GET_FROM_CACHE(window_key)

        // Step 3: Byte-range accumulation
        // Only count if enough of the file was downloaded
        existing.bytes_received += event.bytes_downloaded
        UPDATE_CACHE(window_key, existing)

        IF existing.bytes_received >= episode.file_size_bytes * 0.01:
            // At least 1% downloaded — count as valid
            IF NOT existing.counted:
                existing.counted = true
                IncrementDownloadCount(event.episode_id)
        RETURN  // Deduplicated — don't double-count

    ELSE:
        // First request from this IP+UA+Episode today
        new_record = {
            bytes_received: event.bytes_downloaded,
            counted: false,
            first_seen: event.timestamp
        }
        SET_IN_CACHE(window_key, new_record, TTL=86400)

        IF event.bytes_downloaded >= episode.file_size_bytes * 0.01:
            new_record.counted = true
            IncrementDownloadCount(event.episode_id)

FUNCTION IsKnownBot(user_agent):
    // Match against IAB/ABC International Spiders & Bots list
    RETURN MATCHES_PATTERN(user_agent, BOT_PATTERNS) OR
           IS_DATACENTER_IP(ip) OR
           IS_KNOWN_PREFETCH_SERVICE(user_agent)

// Time: O(1) per event (hash lookup + cache ops)
// Space: O(unique_listeners_per_day × active_episodes)
```

### 3. Dynamic Ad Insertion Stitching

```
FUNCTION StitchAdsIntoEpisode(episode, listener_context):
    // Step 1: Determine insertion points
    insertion_points = GetInsertionPoints(episode)
    // Pre-roll: 0s, Mid-roll: marked in RSS or at chapter boundaries, Post-roll: end

    // Step 2: Request ads from Ad Decision Service
    ad_request = {
        episode_id: episode.id,
        podcast_categories: episode.podcast.categories,
        listener_geo: listener_context.geo,
        listener_demographics: listener_context.demographics,
        device_type: listener_context.device,
        positions: insertion_points,
        frequency_caps: GetFrequencyCaps(listener_context.id)
    }
    ads = AdDecisionService.GetAds(ad_request)

    // Step 3: Build stitched manifest
    manifest = []
    content_segments = SplitAtInsertionPoints(episode.audio_url, insertion_points)

    FOR i, segment IN content_segments:
        manifest.APPEND({
            type: "content",
            url: segment.url,
            byte_range: segment.range,
            duration: segment.duration
        })

        // Insert ads between segments
        IF i < LEN(insertion_points):
            position_ads = ads.ForPosition(insertion_points[i])
            FOR ad IN position_ads:
                manifest.APPEND({
                    type: "ad",
                    url: ad.creative_url,
                    duration: ad.duration,
                    tracking_urls: ad.impression_trackers,
                    click_through: ad.click_url
                })

    // Step 4: Return stitched response
    // Option A: Server-side audio concatenation (SSAI)
    // Option B: Client-side manifest with segment URLs (HLS-like)
    RETURN BuildStitchedStream(manifest)

// Time: O(n) where n = number of insertion points + ads
// Latency budget: < 100ms for ad decision, < 200ms for stitching
```

### 4. Episode Recommendation Scoring

```
FUNCTION ScoreRecommendations(user_id, candidate_episodes, limit):
    user = GetUserProfile(user_id)
    listen_history = GetRecentHistory(user_id, days=90)
    subscriptions = GetSubscriptions(user_id)

    scored_candidates = []

    FOR episode IN candidate_episodes:
        score = 0.0

        // Signal 1: Collaborative filtering (users like you listened)
        cf_score = CollaborativeFilteringScore(user_id, episode.podcast_id)
        score += cf_score * 0.30

        // Signal 2: Content similarity (topic/embedding distance)
        user_embedding = GetUserTopicEmbedding(user_id)
        episode_embedding = GetEpisodeEmbedding(episode.id)
        content_sim = CosineSimilarity(user_embedding, episode_embedding)
        score += content_sim * 0.25

        // Signal 3: Category affinity
        category_overlap = Overlap(user.preferred_categories, episode.categories)
        score += category_overlap * 0.15

        // Signal 4: Freshness decay
        hours_since_publish = HoursSince(episode.published_at)
        freshness = EXP(-hours_since_publish / 168)  // Half-life: 1 week
        score += freshness * 0.10

        // Signal 5: Popularity (normalized)
        popularity = LOG(episode.download_count + 1) / LOG(MAX_DOWNLOADS + 1)
        score += popularity * 0.10

        // Signal 6: Completion rate signal (quality proxy)
        avg_completion = episode.avg_completion_rate
        score += avg_completion * 0.10

        // Penalty: Already listened
        IF episode.id IN listen_history.episode_ids:
            score *= 0.1  // Heavily demote

        // Penalty: Same podcast over-representation (diversity)
        same_podcast_count = COUNT(scored_candidates WHERE podcast_id = episode.podcast_id)
        IF same_podcast_count >= 3:
            score *= 0.5

        scored_candidates.APPEND((episode, score))

    // Sort and return top-K with diversity interleaving
    RETURN DiversityInterleavedTopK(scored_candidates, limit)

// Time: O(n log k) with top-K heap
// Space: O(n) for candidate scoring
```

---

## State Diagrams

### Episode Processing State Machine

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
stateDiagram-v2
    [*] --> Discovered: RSS feed parsed
    Discovered --> Validating: Metadata extracted
    Validating --> Rejected: Invalid metadata
    Validating --> Transcoding: Validation passed

    Transcoding --> TranscodeFailed: FFmpeg error
    TranscodeFailed --> Transcoding: Retry (max 3)
    TranscodeFailed --> ManualReview: Retries exhausted

    Transcoding --> Transcribing: Audio transcoded
    Transcribing --> Available: Transcript generated
    Transcribing --> Available: Transcription skipped/failed

    Available --> Unavailable: Source removed (404)
    Available --> Removed: DMCA / Policy violation
    Unavailable --> Available: Source restored
    Removed --> [*]

    ManualReview --> Transcoding: Manually approved
    ManualReview --> Rejected: Permanently rejected
    Rejected --> [*]

    note right of Available
        Episode is playable
        by listeners
    end note
```

### Feed Crawler State Machine

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
stateDiagram-v2
    [*] --> Scheduled: Poll interval reached
    Scheduled --> Fetching: Worker picks up
    Fetching --> NotModified: HTTP 304
    Fetching --> Updated: HTTP 200 (content changed)
    Fetching --> Failed: HTTP 4xx/5xx / Timeout

    NotModified --> Scheduled: Reset timer
    Updated --> Parsing: Feed XML received
    Parsing --> Processed: New episodes extracted
    Parsing --> ParseError: Malformed XML
    Processed --> Scheduled: Reset timer + update ETag
    ParseError --> Scheduled: Log error, backoff

    Failed --> Scheduled: Exponential backoff
    Failed --> Abandoned: 30 consecutive failures

    Abandoned --> Scheduled: Manual reactivation

    note right of Scheduled
        Interval determined by
        adaptive algorithm
    end note
```
