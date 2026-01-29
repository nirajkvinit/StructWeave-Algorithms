# Low-Level Design

## Table of Contents

1. [Data Models](#data-models)
2. [Database Schema](#database-schema)
3. [Cache Schema](#cache-schema)
4. [API Design](#api-design)
5. [Core Algorithms](#core-algorithms)
6. [Indexing Strategy](#indexing-strategy)
7. [Partitioning Strategy](#partitioning-strategy)

---

## Data Models

### Tweet Object

```
Tweet {
    // Primary identifier (Snowflake)
    id: uint64                          // 8 bytes - time-sortable unique ID

    // Author information
    author_id: uint64                   // 8 bytes - user who created tweet

    // Content
    text: string(280)                   // Variable - UTF-8 encoded content
    language: string(5)                 // 5 bytes - ISO 639-1 code
    source: string(100)                 // Device/app that created tweet

    // Media attachments
    media_ids: array<uint64>            // Array of media object IDs
    media_types: array<enum>            // IMAGE, VIDEO, GIF, POLL

    // Reply/Thread information
    reply_to_tweet_id: uint64?          // Nullable - if this is a reply
    reply_to_user_id: uint64?           // Nullable - user being replied to
    conversation_id: uint64             // Root tweet of thread

    // Retweet information
    is_retweet: boolean
    retweet_of_id: uint64?              // Original tweet if retweet
    quoted_tweet_id: uint64?            // Tweet being quoted

    // Timestamps
    created_at: timestamp               // 8 bytes - creation time
    edited_at: timestamp?               // Nullable - last edit time

    // Engagement counters (denormalized for read performance)
    like_count: uint32
    retweet_count: uint32
    reply_count: uint32
    quote_count: uint32
    bookmark_count: uint32
    impression_count: uint64

    // Metadata
    possibly_sensitive: boolean         // Content warning flag
    withheld_countries: array<string>   // Geo-restrictions

    // Entity extraction (pre-computed)
    hashtags: array<Hashtag>
    mentions: array<Mention>
    urls: array<URL>
    cashtags: array<Cashtag>
}

Hashtag {
    tag: string
    start_index: uint16
    end_index: uint16
}

Mention {
    user_id: uint64
    username: string
    start_index: uint16
    end_index: uint16
}
```

### User Object

```
User {
    // Primary identifier
    id: uint64                          // 8 bytes - Snowflake ID

    // Identity
    username: string(15)                // Unique handle (@username)
    display_name: string(50)            // Display name

    // Profile
    bio: string(160)                    // Biography
    location: string(100)               // User-entered location
    url: string(100)                    // Profile website
    profile_image_url: string(500)      // Avatar URL
    profile_banner_url: string(500)     // Header image URL

    // Account status
    is_verified: boolean                // Legacy verification
    is_premium: boolean                 // Premium subscriber
    premium_tier: enum                  // NONE, BLUE, VERIFIED_ORG
    is_protected: boolean               // Private account
    is_suspended: boolean               // Account suspended

    // Timestamps
    created_at: timestamp               // Account creation

    // Denormalized counts
    followers_count: uint32
    following_count: uint32
    tweet_count: uint32
    listed_count: uint32                // Number of lists user is on

    // Settings
    default_notification_settings: NotificationSettings
    privacy_settings: PrivacySettings
}
```

### Follow Relationship

```
Follow {
    follower_id: uint64                 // User who is following
    followed_id: uint64                 // User being followed
    created_at: timestamp               // When follow happened

    // Notification preferences
    notifications_enabled: boolean      // Get notifications for this user

    // Classification
    relationship_type: enum             // FOLLOW, MUTE, BLOCK
}
```

### Engagement Object

```
Engagement {
    user_id: uint64                     // User who engaged
    tweet_id: uint64                    // Tweet engaged with
    type: enum                          // LIKE, RETWEET, BOOKMARK, VIEW
    created_at: timestamp

    // For retweets
    retweet_id: uint64?                 // ID of the retweet if applicable
}
```

### Trend Object

```
Trend {
    id: uint64
    name: string                        // Hashtag or topic name
    query: string                       // Search query for this trend

    // Volume metrics
    tweet_volume_24h: uint64            // Tweets in last 24 hours
    current_velocity: float             // Rate of change

    // Classification
    category: enum                      // NEWS, SPORTS, ENTERTAINMENT, etc.
    location_scope: enum                // GLOBAL, COUNTRY, CITY
    location_id: uint64?                // WOEID for location

    // Ranking
    rank: uint16                        // Position in trends list
    promoted: boolean                   // Paid promotion

    // Timestamps
    started_trending_at: timestamp
    peak_at: timestamp?
}
```

---

## Database Schema

### MySQL Schema (Sharded)

#### Tweets Table

```sql
-- Shard key: tweet_id (Snowflake ID embeds shard info)
CREATE TABLE tweets (
    id BIGINT UNSIGNED PRIMARY KEY,
    author_id BIGINT UNSIGNED NOT NULL,
    text TEXT CHARACTER SET utf8mb4,
    language VARCHAR(5),
    source VARCHAR(100),

    -- Reply chain
    reply_to_tweet_id BIGINT UNSIGNED,
    reply_to_user_id BIGINT UNSIGNED,
    conversation_id BIGINT UNSIGNED NOT NULL,

    -- Retweet info
    is_retweet BOOLEAN DEFAULT FALSE,
    retweet_of_id BIGINT UNSIGNED,
    quoted_tweet_id BIGINT UNSIGNED,

    -- Timestamps
    created_at TIMESTAMP(3) NOT NULL,
    edited_at TIMESTAMP(3),

    -- Counters (denormalized)
    like_count INT UNSIGNED DEFAULT 0,
    retweet_count INT UNSIGNED DEFAULT 0,
    reply_count INT UNSIGNED DEFAULT 0,
    quote_count INT UNSIGNED DEFAULT 0,
    bookmark_count INT UNSIGNED DEFAULT 0,
    impression_count BIGINT UNSIGNED DEFAULT 0,

    -- Flags
    possibly_sensitive BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Indexes
    INDEX idx_author_created (author_id, created_at DESC),
    INDEX idx_conversation (conversation_id, created_at ASC),
    INDEX idx_reply_to (reply_to_tweet_id),
    INDEX idx_retweet_of (retweet_of_id),
    INDEX idx_created (created_at DESC)
) ENGINE=InnoDB
  ROW_FORMAT=COMPRESSED
  DEFAULT CHARSET=utf8mb4;
```

#### Users Table

```sql
-- Shard key: user_id
CREATE TABLE users (
    id BIGINT UNSIGNED PRIMARY KEY,
    username VARCHAR(15) NOT NULL,
    display_name VARCHAR(50),
    bio VARCHAR(160),
    location VARCHAR(100),
    url VARCHAR(100),
    profile_image_url VARCHAR(500),
    profile_banner_url VARCHAR(500),

    -- Status flags
    is_verified BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    premium_tier TINYINT DEFAULT 0,
    is_protected BOOLEAN DEFAULT FALSE,
    is_suspended BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP(3) NOT NULL,
    updated_at TIMESTAMP(3),

    -- Counters
    followers_count INT UNSIGNED DEFAULT 0,
    following_count INT UNSIGNED DEFAULT 0,
    tweet_count INT UNSIGNED DEFAULT 0,
    listed_count INT UNSIGNED DEFAULT 0,

    -- Indexes
    UNIQUE INDEX idx_username (username),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### Follows Table

```sql
-- Shard key: follower_id (optimize for "who do I follow" queries)
CREATE TABLE follows (
    follower_id BIGINT UNSIGNED NOT NULL,
    followed_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP(3) NOT NULL,
    notifications_enabled BOOLEAN DEFAULT FALSE,

    PRIMARY KEY (follower_id, followed_id),
    INDEX idx_followed_follower (followed_id, follower_id),
    INDEX idx_created (follower_id, created_at DESC)
) ENGINE=InnoDB;
```

#### Engagements Table

```sql
-- Shard key: tweet_id (optimize for engagement lookups per tweet)
CREATE TABLE engagements (
    user_id BIGINT UNSIGNED NOT NULL,
    tweet_id BIGINT UNSIGNED NOT NULL,
    engagement_type TINYINT NOT NULL,  -- 1=LIKE, 2=RETWEET, 3=BOOKMARK
    created_at TIMESTAMP(3) NOT NULL,
    retweet_id BIGINT UNSIGNED,        -- If engagement created a retweet

    PRIMARY KEY (tweet_id, user_id, engagement_type),
    INDEX idx_user_type (user_id, engagement_type, created_at DESC),
    INDEX idx_tweet_type (tweet_id, engagement_type, created_at DESC)
) ENGINE=InnoDB;
```

---

## Cache Schema

### Redis Timeline Cache

```
# User's Home Timeline (precomputed for regular follows)
KEY: timeline:{user_id}
TYPE: Sorted Set
MEMBERS: tweet_ids (as strings)
SCORES: ranking scores (float, higher = more relevant)
MAX_SIZE: 800 entries
TTL: 300 seconds (5 minutes)

Example:
  ZADD timeline:12345 98.5 "1234567890" 95.2 "1234567891" ...
  ZREVRANGE timeline:12345 0 199 WITHSCORES  # Get top 200
```

```
# User's Own Tweets (for profile page)
KEY: user_tweets:{user_id}
TYPE: Sorted Set
MEMBERS: tweet_ids
SCORES: created_at timestamp (milliseconds)
MAX_SIZE: 3200 entries
TTL: None (permanent)

Example:
  ZADD user_tweets:12345 1704067200000 "1234567890"
```

```
# Celebrity Tweet Index (for pull model)
KEY: celebrity:{user_id}:tweets
TYPE: Sorted Set
MEMBERS: tweet_ids
SCORES: created_at timestamp
MAX_SIZE: 1000 entries
TTL: 86400 seconds (24 hours)

Example:
  ZREVRANGE celebrity:44196397:tweets 0 99  # Latest 100 tweets from Elon
```

```
# Follow List Cache
KEY: following:{user_id}
TYPE: Set
MEMBERS: followed_user_ids
TTL: 3600 seconds (1 hour)

# Follower Count (for celebrity detection)
KEY: follower_count:{user_id}
TYPE: String
VALUE: integer count
TTL: 300 seconds (5 minutes)
```

```
# Engagement Cache (for fast "did I like this" checks)
KEY: liked:{user_id}
TYPE: Set or Bloom Filter
MEMBERS: tweet_ids that user liked
TTL: 1800 seconds (30 minutes)
```

```
# Session Cache
KEY: session:{session_id}
TYPE: Hash
FIELDS: user_id, created_at, device_info, permissions
TTL: 3600 seconds (1 hour, sliding)
```

### Manhattan KV Schema

```
# Tweet Object Store
KEY: tweet:{tweet_id}
VALUE: Serialized Tweet protobuf
TTL: None (permanent until deleted)

# User Object Store
KEY: user:{user_id}
VALUE: Serialized User protobuf
TTL: None (permanent)

# Engagement Counter Store (with conflict resolution)
KEY: engagement_count:{tweet_id}
VALUE: Serialized counter map {likes, retweets, replies, quotes}
TTL: None
```

---

## API Design

### Timeline API

```yaml
# Get Home Timeline (For You feed)
GET /2/timeline/home
  Headers:
    Authorization: Bearer {access_token}

  Query Parameters:
    max_results: integer (1-100, default 20)
    pagination_token: string (cursor for pagination)
    tweet.fields: comma-separated (id, text, author_id, created_at, public_metrics, entities, attachments)
    expansions: comma-separated (author_id, referenced_tweets.id, attachments.media_keys)
    user.fields: comma-separated (id, name, username, profile_image_url, verified)
    media.fields: comma-separated (media_key, type, url, preview_image_url)

  Response: 200 OK
    {
      "data": [
        {
          "id": "1234567890",
          "text": "Tweet content here",
          "author_id": "123456",
          "created_at": "2024-01-01T12:00:00.000Z",
          "public_metrics": {
            "like_count": 100,
            "retweet_count": 50,
            "reply_count": 25,
            "quote_count": 10,
            "impression_count": 5000
          },
          "entities": {
            "hashtags": [{"tag": "example", "start": 10, "end": 18}],
            "mentions": [{"username": "user", "start": 0, "end": 5}]
          }
        }
      ],
      "includes": {
        "users": [{...}],
        "tweets": [{...}],  // Referenced tweets (quotes, replies)
        "media": [{...}]
      },
      "meta": {
        "next_token": "pagination_cursor",
        "result_count": 20,
        "newest_id": "1234567890",
        "oldest_id": "1234567880"
      }
    }

  Error Responses:
    401 Unauthorized: Invalid or expired token
    429 Too Many Requests: Rate limit exceeded
```

### Tweet Creation API

```yaml
# Create Tweet
POST /2/tweets
  Headers:
    Authorization: Bearer {access_token}
    Content-Type: application/json
    Idempotency-Key: {uuid}  # For safe retries

  Request Body:
    {
      "text": "Tweet content (max 280 chars)",
      "reply": {
        "in_reply_to_tweet_id": "1234567890",
        "exclude_reply_user_ids": ["123"]  # Don't mention these users
      },
      "quote_tweet_id": "1234567891",
      "media": {
        "media_ids": ["media_id_1", "media_id_2"],
        "tagged_user_ids": ["user_id_1"]
      },
      "poll": {
        "options": ["Option 1", "Option 2", "Option 3"],
        "duration_minutes": 1440
      },
      "reply_settings": "everyone" | "mentionedUsers" | "following",
      "geo": {
        "place_id": "place_id"
      }
    }

  Response: 201 Created
    {
      "data": {
        "id": "1234567892",
        "text": "Tweet content",
        "edit_history_tweet_ids": ["1234567892"]
      }
    }

  Error Responses:
    400 Bad Request: Invalid content (too long, duplicate, etc.)
    403 Forbidden: User suspended or restricted
    429 Too Many Requests: Rate limit exceeded
```

### Search API

```yaml
# Search Recent Tweets
GET /2/tweets/search/recent
  Headers:
    Authorization: Bearer {access_token}

  Query Parameters:
    query: string (required, max 512 chars)
      # Operators: from:, to:, @, #, is:retweet, is:reply, has:media, lang:
      # Example: "from:elonmusk -is:retweet lang:en"
    max_results: integer (10-100, default 10)
    start_time: ISO 8601 timestamp (within last 7 days)
    end_time: ISO 8601 timestamp
    since_id: tweet_id (return tweets after this)
    until_id: tweet_id (return tweets before this)
    sort_order: "recency" | "relevancy" (default: recency)
    pagination_token: string
    tweet.fields: comma-separated
    expansions: comma-separated

  Response: 200 OK
    {
      "data": [{...}],
      "includes": {...},
      "meta": {
        "newest_id": "1234567890",
        "oldest_id": "1234567880",
        "result_count": 10,
        "next_token": "cursor"
      }
    }
```

### Engagement APIs

```yaml
# Like a Tweet
POST /2/users/{user_id}/likes
  Request Body:
    {"tweet_id": "1234567890"}
  Response: 200 OK
    {"data": {"liked": true}}

# Unlike a Tweet
DELETE /2/users/{user_id}/likes/{tweet_id}
  Response: 200 OK
    {"data": {"liked": false}}

# Retweet
POST /2/users/{user_id}/retweets
  Request Body:
    {"tweet_id": "1234567890"}
  Response: 200 OK
    {"data": {"retweeted": true}}

# Follow User
POST /2/users/{user_id}/following
  Request Body:
    {"target_user_id": "target_id"}
  Response: 200 OK
    {"data": {"following": true, "pending_follow": false}}
```

### Trends API

```yaml
# Get Trends for Location
GET /2/trends/by/woeid/{woeid}
  Query Parameters:
    exclude: comma-separated (hashtags)

  Response: 200 OK
    {
      "data": [
        {
          "trend_name": "#TrendingTopic",
          "url": "https://twitter.com/search?q=%23TrendingTopic",
          "tweet_count": 125000,
          "description": "Topic description",
          "domain_context": "Entertainment · Trending"
        }
      ],
      "meta": {
        "as_of": "2024-01-01T12:00:00.000Z",
        "location": {
          "name": "Worldwide",
          "woeid": 1
        }
      }
    }
```

---

## Core Algorithms

### Algorithm 1: Snowflake ID Generation

```
ALGORITHM Snowflake_ID_Generation

PURPOSE: Generate globally unique, time-sortable 64-bit IDs without coordination

CONSTANTS:
    TWITTER_EPOCH = 1288834974657  // Nov 4, 2010 01:42:54.657 UTC (milliseconds)
    DATACENTER_BITS = 5            // 32 datacenters
    WORKER_BITS = 5                // 32 workers per datacenter
    SEQUENCE_BITS = 12             // 4096 IDs per millisecond per worker

    WORKER_SHIFT = SEQUENCE_BITS
    DATACENTER_SHIFT = SEQUENCE_BITS + WORKER_BITS
    TIMESTAMP_SHIFT = SEQUENCE_BITS + WORKER_BITS + DATACENTER_BITS
    SEQUENCE_MASK = (1 << SEQUENCE_BITS) - 1  // 4095

STATE:
    last_timestamp = -1
    sequence = 0

FUNCTION generate_id(datacenter_id, worker_id):
    timestamp = current_time_millis() - TWITTER_EPOCH

    IF timestamp < last_timestamp:
        THROW ClockMovedBackwardsException

    IF timestamp == last_timestamp:
        sequence = (sequence + 1) & SEQUENCE_MASK
        IF sequence == 0:
            // Sequence exhausted, wait for next millisecond
            timestamp = wait_for_next_millis(last_timestamp)
    ELSE:
        sequence = 0

    last_timestamp = timestamp

    id = (timestamp << TIMESTAMP_SHIFT) |
         (datacenter_id << DATACENTER_SHIFT) |
         (worker_id << WORKER_SHIFT) |
         sequence

    RETURN id

FUNCTION wait_for_next_millis(last_ts):
    WHILE current_time_millis() - TWITTER_EPOCH <= last_ts:
        // Busy wait
    RETURN current_time_millis() - TWITTER_EPOCH

PROPERTIES:
    - Generates 4,096 unique IDs per millisecond per worker
    - Total capacity: 32 × 32 × 4096 = 4.2M IDs/ms across cluster
    - IDs are k-sorted (mostly time-ordered)
    - Can extract timestamp: (id >> TIMESTAMP_SHIFT) + TWITTER_EPOCH
    - 69 years before timestamp overflow (until ~2079)

EXAMPLE:
    timestamp = 1704067200000 - 1288834974657 = 415232225343
    datacenter_id = 5
    worker_id = 10
    sequence = 100

    id = (415232225343 << 22) | (5 << 17) | (10 << 12) | 100
       = 1741790105632391268
```

### Algorithm 2: Hybrid Fan-out Distribution

```
ALGORITHM Twitter_Hybrid_Fanout

PURPOSE: Distribute tweets to follower timelines with optimal write/read trade-off

CONSTANTS:
    CELEBRITY_THRESHOLD = 100000   // Twitter's threshold (higher than Facebook)
    BATCH_SIZE = 1000              // Redis pipeline batch size
    MAX_TIMELINE_SIZE = 800        // Entries per user timeline
    NOTIFICATION_SUBSET = 10000    // Followers to notify for celebrities

DATA STRUCTURES:
    fanout_queue: Kafka topic for fan-out events
    timeline_cache: Redis sorted sets
    celebrity_index: Redis sorted sets for celebrity tweets
    follower_counts: Redis strings (cached counts)

FUNCTION distribute_tweet(author_id, tweet_id, created_at):
    // Get follower count (cached)
    follower_count = get_follower_count(author_id)

    IF follower_count >= CELEBRITY_THRESHOLD:
        handle_celebrity_tweet(author_id, tweet_id, created_at)
    ELSE:
        handle_regular_tweet(author_id, tweet_id, created_at, follower_count)

    // Always index for search (1-second target)
    search_index_queue.enqueue(tweet_id)

    // Always process for trends
    trends_pipeline.process(tweet_id)

FUNCTION handle_celebrity_tweet(author_id, tweet_id, created_at):
    // Add to celebrity index (for pull at read time)
    celebrity_index.zadd(
        key = "celebrity:" + author_id + ":tweets",
        score = created_at,
        member = tweet_id
    )
    celebrity_index.zremrangebyrank(
        key = "celebrity:" + author_id + ":tweets",
        start = 0,
        stop = -1001  // Keep only 1000 most recent
    )

    // Push to subset of followers with notifications enabled
    notification_followers = get_notification_enabled_followers(
        author_id,
        limit = NOTIFICATION_SUBSET
    )

    FOR batch IN chunk(notification_followers, BATCH_SIZE):
        pipeline = redis.pipeline()
        FOR follower_id IN batch:
            // Add to timeline with high score (celebrity boost)
            pipeline.zadd(
                "timeline:" + follower_id,
                created_at * 1.1,  // Slight boost
                tweet_id
            )
            pipeline.zremrangebyrank(
                "timeline:" + follower_id,
                0,
                -MAX_TIMELINE_SIZE - 1
            )
        pipeline.execute()

        // Publish notifications
        notification_queue.enqueue_batch(batch, tweet_id)

FUNCTION handle_regular_tweet(author_id, tweet_id, created_at, follower_count):
    // Full push to all followers
    followers = get_all_followers(author_id)

    FOR batch IN chunk(followers, BATCH_SIZE):
        // Enqueue to Kafka for async processing
        fanout_queue.enqueue({
            tweet_id: tweet_id,
            author_id: author_id,
            created_at: created_at,
            followers: batch
        })

FUNCTION fanout_worker():
    // Kafka consumer for fan-out events
    WHILE true:
        event = fanout_queue.dequeue()

        pipeline = redis.pipeline()
        FOR follower_id IN event.followers:
            // Calculate ranking score (simple: recency)
            score = event.created_at

            pipeline.zadd(
                "timeline:" + follower_id,
                score,
                event.tweet_id
            )
            // Trim to max size
            pipeline.zremrangebyrank(
                "timeline:" + follower_id,
                0,
                -MAX_TIMELINE_SIZE - 1
            )

        pipeline.execute()
        fanout_queue.commit(event)

COMPLEXITY:
    Regular tweet (N followers):
        Write: O(N) Redis operations (batched)
        Read: O(1) - precomputed

    Celebrity tweet (M followers with notifications):
        Write: O(M) where M << N (typically 10K << 100M)
        Read: O(K) where K = followed celebrities (typically <100)

EXAMPLE:
    Regular user posts (1000 followers):
        - 1000 Redis ZADD operations
        - Batched into 1 pipeline execution
        - ~10ms total

    Celebrity posts (100M followers):
        - 1 celebrity index update
        - 10K notification pushes
        - 0 fan-out writes
        - Saves: 100M - 10K = 99.99M writes
```

### Algorithm 3: Recommendation Scoring (Open-Sourced)

```
ALGORITHM Twitter_Engagement_Scoring

PURPOSE: Score candidate tweets for For You timeline ranking

CONSTANTS:
    // Engagement weights (from open-sourced algorithm)
    WEIGHT_LIKE = 1.0
    WEIGHT_RETWEET = 20.0
    WEIGHT_REPLY = 13.5
    WEIGHT_PROFILE_CLICK = 12.0
    WEIGHT_LINK_CLICK = 11.0
    WEIGHT_BOOKMARK = 10.0

    // Premium boost multipliers
    PREMIUM_BOOST_IN_NETWORK = 4.0
    PREMIUM_BOOST_OUT_OF_NETWORK = 2.0

    // Time decay parameters
    DECAY_RATE = 0.05  // Per hour

DATA STRUCTURES:
    navi_client: RPC client for Navi ML inference service
    feature_store: Feature lookup service

FUNCTION score_candidate(user, tweet, context):
    // Step 1: Extract features
    features = extract_features(user, tweet, context)

    // Step 2: Get engagement predictions from Navi
    predictions = navi_client.predict(
        model = "engagement_v3",
        features = features
    )
    // predictions contains: P(like), P(retweet), P(reply), etc.

    // Step 3: Calculate weighted engagement score
    engagement_score = (
        predictions.like_prob * WEIGHT_LIKE +
        predictions.retweet_prob * WEIGHT_RETWEET +
        predictions.reply_prob * WEIGHT_REPLY +
        predictions.profile_click_prob * WEIGHT_PROFILE_CLICK +
        predictions.link_click_prob * WEIGHT_LINK_CLICK +
        predictions.bookmark_prob * WEIGHT_BOOKMARK
    )

    // Step 4: Apply premium boost
    IF tweet.author.is_premium:
        IF is_in_network(user, tweet.author):
            engagement_score *= PREMIUM_BOOST_IN_NETWORK
        ELSE:
            engagement_score *= PREMIUM_BOOST_OUT_OF_NETWORK

    // Step 5: Apply time decay
    age_hours = (now() - tweet.created_at) / 3600
    decay_factor = 1.0 / (1.0 + DECAY_RATE * age_hours)

    // Step 6: Calculate final score
    final_score = engagement_score * decay_factor

    // Step 7: Apply integrity penalties (if any)
    IF tweet.has_integrity_flag:
        final_score *= 0.1  // Severe penalty

    RETURN final_score

FUNCTION extract_features(user, tweet, context):
    RETURN {
        // User features
        user_id: user.id,
        user_followers: user.followers_count,
        user_following: user.following_count,
        user_account_age: days_since(user.created_at),
        user_is_premium: user.is_premium,
        user_engagement_history: feature_store.get("user_engagement", user.id),

        // Tweet features
        tweet_id: tweet.id,
        tweet_age_minutes: minutes_since(tweet.created_at),
        tweet_has_media: tweet.media_ids.length > 0,
        tweet_has_link: tweet.urls.length > 0,
        tweet_language: tweet.language,
        tweet_length: len(tweet.text),

        // Author features
        author_id: tweet.author_id,
        author_followers: tweet.author.followers_count,
        author_is_verified: tweet.author.is_verified,
        author_is_premium: tweet.author.is_premium,

        // Relationship features
        is_following: user.following.contains(tweet.author_id),
        has_interacted: feature_store.get("interaction_history", user.id, tweet.author_id),

        // Context features
        time_of_day: context.request_time.hour,
        day_of_week: context.request_time.day_of_week,
        device_type: context.device_type,

        // SimClusters embeddings
        user_clusters: feature_store.get("simclusters", user.id),
        tweet_clusters: feature_store.get("tweet_clusters", tweet.id),
        cluster_similarity: cosine_similarity(user_clusters, tweet_clusters)
    }

FUNCTION is_in_network(user, author):
    // Check if user follows the author
    RETURN redis.sismember("following:" + user.id, author.id)

COMPLEXITY:
    Feature extraction: O(1) with caching
    Navi inference: O(1) - batched neural network
    Total per candidate: ~1ms
    For 1,500 candidates: ~1.5 seconds (parallelized to <500ms)
```

### Algorithm 4: Real-Time Search Indexing

```
ALGORITHM Real_Time_Search_Indexing

PURPOSE: Index tweets in ElasticSearch within 1 second of creation

CONSTANTS:
    INDEXING_SLA_MS = 1000         // 1 second target
    BATCH_SIZE = 100               // Documents per bulk request
    BATCH_WAIT_MS = 50             // Max wait before flushing batch
    KAFKA_TOPIC = "tweet-index"

ARCHITECTURE:
    [Tweetypie] → [Kafka] → [Ingestion Service] → [ES Proxy] → [ElasticSearch]

FUNCTION on_tweet_created(tweet):
    // Called by Tweetypie after tweet is stored

    document = {
        "id": tweet.id,
        "text": tweet.text,
        "author_id": tweet.author_id,
        "author_username": tweet.author.username,
        "author_display_name": tweet.author.display_name,
        "created_at": tweet.created_at,
        "language": tweet.language,

        // Pre-extracted entities
        "hashtags": extract_hashtag_texts(tweet.hashtags),
        "mentions": extract_mention_usernames(tweet.mentions),
        "urls": extract_url_domains(tweet.urls),

        // Engagement (will be updated later)
        "like_count": 0,
        "retweet_count": 0,
        "reply_count": 0,

        // Flags
        "is_retweet": tweet.is_retweet,
        "has_media": tweet.media_ids.length > 0,
        "has_link": tweet.urls.length > 0,

        // For filtering
        "possibly_sensitive": tweet.possibly_sensitive,
        "conversation_id": tweet.conversation_id
    }

    kafka.produce(
        topic = KAFKA_TOPIC,
        key = str(tweet.id),
        value = serialize(document),
        timestamp = now()
    )

FUNCTION ingestion_service():
    buffer = []
    last_flush = now()

    WHILE true:
        message = kafka.poll(timeout_ms = 10)

        IF message != null:
            buffer.append(message)

        should_flush = (
            buffer.length >= BATCH_SIZE OR
            (now() - last_flush) >= BATCH_WAIT_MS
        )

        IF should_flush AND buffer.length > 0:
            flush_to_elasticsearch(buffer)
            buffer = []
            last_flush = now()

FUNCTION flush_to_elasticsearch(messages):
    bulk_body = []

    FOR message IN messages:
        doc = deserialize(message.value)

        // Index action
        bulk_body.append({
            "index": {
                "_index": "tweets",
                "_id": doc.id
            }
        })
        bulk_body.append(doc)

    response = es_proxy.bulk(body = bulk_body)

    // Record metrics
    FOR i, item IN enumerate(response["items"]):
        latency = now() - messages[i].timestamp
        metrics.record("index_latency_ms", latency)

        IF latency > INDEXING_SLA_MS:
            metrics.increment("index_sla_breach")

    kafka.commit(messages)

ELASTICSEARCH_MAPPING:
    {
        "mappings": {
            "properties": {
                "id": {"type": "keyword"},
                "text": {
                    "type": "text",
                    "analyzer": "twitter_analyzer"
                },
                "author_id": {"type": "keyword"},
                "author_username": {
                    "type": "keyword",
                    "normalizer": "lowercase"
                },
                "created_at": {"type": "date"},
                "hashtags": {"type": "keyword"},
                "mentions": {"type": "keyword"},
                "like_count": {"type": "integer"},
                "is_retweet": {"type": "boolean"}
            }
        },
        "settings": {
            "index": {
                "refresh_interval": "1s",
                "number_of_shards": 100,
                "number_of_replicas": 2
            }
        }
    }

LATENCY_BREAKDOWN:
    Kafka produce + propagation: ~50ms
    Ingestion buffering: ~50ms
    Bulk index to ES: ~200ms
    ES refresh interval: ~500ms (configurable)
    -----------------------------------
    Total: ~800ms (under 1s target)
```

### Algorithm 5: Trends Detection

```
ALGORITHM Trends_Detection

PURPOSE: Detect trending topics within 30 seconds, predict 1.5-5 hours ahead

CONSTANTS:
    WINDOW_SIZE_MINUTES = 15
    VELOCITY_THRESHOLD = 2.0      // 2x baseline = trending
    MIN_TWEET_VOLUME = 1000       // Minimum tweets to consider
    CLUSTER_SIMILARITY = 0.7      // For grouping related hashtags

PIPELINE:
    [Tweets] → [Kafka] → [Heron] → [Aggregator] → [Detector] → [Trend Store]

DATA STRUCTURES:
    baseline_volumes: Rolling 24h average per term
    current_volumes: 15-minute window counts
    trend_candidates: Priority queue by velocity

FUNCTION stream_processor():
    // Heron topology

    SPOUT tweet_spout:
        // Read from Kafka
        FOR tweet IN kafka.consume("tweets"):
            EMIT (tweet.id, tweet.text, tweet.created_at)

    BOLT term_extractor:
        // Extract hashtags and significant terms
        ON receive(tweet_id, text, created_at):
            hashtags = extract_hashtags(text)
            terms = extract_significant_terms(text)  // NLP extraction

            FOR term IN (hashtags + terms):
                EMIT (term, 1, created_at)

    BOLT window_aggregator:
        // 15-minute tumbling windows
        window_counts: Map<term, count>

        ON receive(term, count, timestamp):
            window = get_window(timestamp, WINDOW_SIZE_MINUTES)
            window_counts[window][term] += count

        ON window_complete(window):
            FOR (term, count) IN window_counts[window]:
                EMIT (term, count, window.end_time)
            window_counts.delete(window)

    BOLT trend_detector:
        ON receive(term, count, timestamp):
            IF count < MIN_TWEET_VOLUME:
                RETURN  // Not enough volume

            baseline = baseline_volumes.get(term, default=count)
            velocity = (count - baseline) / max(baseline, 1)

            IF velocity >= VELOCITY_THRESHOLD:
                trend_candidates.push(
                    term = term,
                    velocity = velocity,
                    volume = count,
                    timestamp = timestamp
                )

FUNCTION trend_ranking():
    // Run every minute

    candidates = trend_detector.get_candidates()

    // Group related terms using K-means clustering
    clusters = cluster_terms(candidates)

    final_trends = []
    FOR cluster IN clusters:
        representative = select_representative(cluster)

        trend = {
            name: representative.term,
            query: build_search_query(cluster),
            tweet_volume: sum(t.volume FOR t IN cluster),
            velocity: max(t.velocity FOR t IN cluster),
            category: classify_category(cluster),
            location_scope: determine_scope(cluster)
        }

        final_trends.append(trend)

    // Rank by combination of velocity and volume
    final_trends.sort(key = lambda t: t.velocity * log(t.tweet_volume), reverse=True)

    // Store top 50 per location
    FOR location IN [GLOBAL, US, UK, ...]:
        location_trends = filter_by_location(final_trends, location)[:50]
        trend_store.set(location, location_trends, ttl=60)

FUNCTION cluster_terms(candidates):
    // K-means clustering based on co-occurrence

    // Build co-occurrence matrix
    cooccurrence = build_cooccurrence_matrix(candidates)

    // TF-IDF weighting
    tfidf_vectors = compute_tfidf(candidates)

    // K-means clustering
    k = estimate_k(len(candidates))  // Elbow method
    clusters = kmeans(tfidf_vectors, k)

    // Merge clusters with similarity > threshold
    merged = merge_similar_clusters(clusters, CLUSTER_SIMILARITY)

    RETURN merged

FUNCTION predict_trend(term):
    // MIT research: Predict 1.5-5 hours before peak

    time_series = get_volume_history(term, hours=24)

    // ARIMA forecasting
    model = ARIMA(time_series, order=(1,1,1))
    forecast = model.forecast(steps=5*60)  // 5 hours ahead

    // Detect if trend will peak
    current = time_series[-1]
    predicted_max = max(forecast)

    IF predicted_max > current * VELOCITY_THRESHOLD:
        hours_to_peak = argmax(forecast) / 60
        RETURN {
            will_trend: true,
            hours_to_peak: hours_to_peak,
            predicted_volume: predicted_max,
            confidence: model.confidence_interval
        }

    RETURN {will_trend: false}
```

---

## Indexing Strategy

### MySQL Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| tweets | PRIMARY | (id) | Tweet lookup |
| tweets | idx_author_created | (author_id, created_at DESC) | User's tweet history |
| tweets | idx_conversation | (conversation_id, created_at) | Thread view |
| tweets | idx_reply_to | (reply_to_tweet_id) | Find replies |
| users | PRIMARY | (id) | User lookup |
| users | idx_username | (username) UNIQUE | Handle lookup |
| follows | PRIMARY | (follower_id, followed_id) | Relationship check |
| follows | idx_followed | (followed_id, follower_id) | Follower list |
| engagements | PRIMARY | (tweet_id, user_id, type) | Engagement check |
| engagements | idx_user | (user_id, type, created_at) | User's engagements |

### ElasticSearch Indexes

| Index | Shards | Replicas | Purpose |
|-------|--------|----------|---------|
| tweets | 100 | 2 | Primary tweet search |
| tweets_recent | 10 | 2 | Last 7 days (faster) |
| users | 20 | 2 | User search |
| trends | 5 | 2 | Trend lookup |

---

## Partitioning Strategy

### Shard Key Selection

| Data Type | Shard Key | Rationale |
|-----------|-----------|-----------|
| Tweets | tweet_id (Snowflake) | Time-sorted, even distribution |
| Users | user_id | User data locality |
| Follows | follower_id | Optimize "who do I follow" queries |
| Engagements | tweet_id | Hot tweet locality |
| Timeline Cache | user_id | Per-user cache |

### Snowflake ID Shard Mapping

```
FUNCTION get_shard(tweet_id):
    // Extract datacenter and worker from Snowflake ID
    // These can be used to determine regional shard

    datacenter = (tweet_id >> 17) & 0x1F  // 5 bits
    worker = (tweet_id >> 12) & 0x1F      // 5 bits

    // Consistent hashing to map to MySQL shard
    shard_number = hash(tweet_id) % NUM_SHARDS

    RETURN shard_number

NUM_SHARDS = 100,000  // Twitter's approximate shard count
```

### Hot Spot Mitigation

```
STRATEGIES FOR HOT TWEETS:

1. Engagement Counter Sharding:
   - Shard counters by tweet_id % 100
   - Aggregate on read

2. Read Replicas:
   - Hot tweets replicated to all regions
   - Cache in multiple Redis instances

3. Approximate Counts:
   - Use HyperLogLog for impression counting
   - Display "10K+" instead of exact count
```
