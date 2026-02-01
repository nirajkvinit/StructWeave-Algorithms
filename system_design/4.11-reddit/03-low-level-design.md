# Reddit: Low-Level Design

[← Back to Index](./00-index.md) | [← High-Level Design](./02-high-level-design.md) | [Next: Deep Dives →](./04-deep-dive-and-bottlenecks.md)

---

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

### ThingDB Entity Model

Reddit's data model uses a **two-table pattern** called ThingDB, where all entities are "Things" with a common structure plus type-specific attributes.

```
THING TYPE PREFIXES:

t1_ = Comment
t2_ = Account (User)
t3_ = Link (Post)
t4_ = Message
t5_ = Subreddit
t6_ = Award
```

### Post Object (t3_)

```
Post {
    // Thing Table fields
    id: string              // t3_xxxxxx (base36 encoded)
    thing_type: int         // 3
    ups: int32              // Upvote count
    downs: int32            // Downvote count
    created_utc: timestamp  // Unix timestamp

    // Data Table fields (key-value)
    title: string           // Post title (max 300 chars)
    selftext: string?       // For text posts (max 40,000 chars)
    url: string?            // For link posts
    author_id: string       // t2_xxxxxx
    subreddit_id: string    // t5_xxxxxx
    subreddit_name: string  // Display name (denormalized)

    // Computed/cached fields
    score: int32            // ups - downs
    upvote_ratio: float     // ups / (ups + downs)
    num_comments: int32     // Denormalized count

    // Flags
    is_self: boolean        // Text post vs link
    over_18: boolean        // NSFW
    spoiler: boolean
    locked: boolean         // No new comments
    stickied: boolean       // Pinned to top

    // Optional
    flair_id: string?
    flair_text: string?
    thumbnail: string?      // URL or "self", "default", "nsfw"
    media: MediaMetadata?
}
```

### Comment Object (t1_)

```
Comment {
    // Thing Table fields
    id: string              // t1_xxxxxx
    thing_type: int         // 1
    ups: int32
    downs: int32
    created_utc: timestamp

    // Data Table fields
    body: string            // Comment text (max 10,000 chars)
    body_html: string       // Rendered HTML (cached)
    author_id: string       // t2_xxxxxx
    link_id: string         // Parent post (t3_xxxxxx)
    parent_id: string       // Parent comment or post

    // Computed fields
    score: int32
    depth: int32            // Nesting level (0 = top-level)

    // Flags
    is_submitter: boolean   // Is the post author (OP)
    collapsed: boolean      // Hidden by default (low score)
    collapsed_reason: string? // "crowd control", "score"
    stickied: boolean       // Mod-pinned comment

    // Moderation
    distinguished: string?  // "moderator", "admin"
    edited: timestamp?      // Last edit time
}
```

### Vote Object

```
Vote {
    user_id: string         // t2_xxxxxx
    thing_id: string        // t1_/t3_xxxxxx
    direction: int8         // 1 (up), -1 (down), 0 (unvote)
    created_utc: timestamp

    // Composite primary key: (user_id, thing_id)
}
```

### Subreddit Object (t5_)

```
Subreddit {
    // Thing Table fields
    id: string              // t5_xxxxxx
    thing_type: int         // 5
    created_utc: timestamp

    // Data Table fields
    name: string            // Unique, lowercase
    display_name: string    // Display name (case preserved)
    title: string           // Full title
    description: string     // Sidebar content (markdown)
    public_description: string // Short description

    // Counts
    subscribers: int64      // Subscriber count
    active_users: int32     // Online now (approximate)

    // Settings
    subreddit_type: enum    // public, private, restricted
    over_18: boolean        // NSFW subreddit
    submission_type: enum   // any, self, link

    // Customization
    icon_img: string?       // Community icon URL
    banner_img: string?     // Banner URL
    primary_color: string?  // Hex color

    // Rules
    rules: Rule[]           // Subreddit rules
    wiki_enabled: boolean
}
```

### User/Account Object (t2_)

```
Account {
    // Thing Table fields
    id: string              // t2_xxxxxx
    thing_type: int         // 2
    created_utc: timestamp

    // Data Table fields
    name: string            // Username (unique)

    // Karma (denormalized)
    link_karma: int64       // Post karma
    comment_karma: int64    // Comment karma
    awardee_karma: int64    // Awards received
    awarder_karma: int64    // Awards given
    total_karma: int64      // Sum of all

    // Status
    is_gold: boolean        // Premium subscription
    is_mod: boolean         // Moderator of any subreddit
    verified: boolean       // Email verified

    // Privacy
    hide_from_robots: boolean
    pref_show_snoovatar: boolean
}
```

---

## Database Schema

### PostgreSQL ThingDB Schema

```sql
-- Core Things table (partitioned by thing_type)
CREATE TABLE things (
    id VARCHAR(20) PRIMARY KEY,
    thing_type SMALLINT NOT NULL,
    ups INTEGER DEFAULT 0,
    downs INTEGER DEFAULT 0,
    created_utc TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE,
    spam BOOLEAN DEFAULT FALSE,

    -- Partitioning key
    CONSTRAINT things_type_check CHECK (thing_type BETWEEN 1 AND 10)
) PARTITION BY LIST (thing_type);

-- Partitions for each thing type
CREATE TABLE things_comments PARTITION OF things FOR VALUES IN (1);
CREATE TABLE things_accounts PARTITION OF things FOR VALUES IN (2);
CREATE TABLE things_links PARTITION OF things FOR VALUES IN (3);
CREATE TABLE things_messages PARTITION OF things FOR VALUES IN (4);
CREATE TABLE things_subreddits PARTITION OF things FOR VALUES IN (5);

-- Indexes on things
CREATE INDEX idx_things_type_created ON things (thing_type, created_utc DESC);
CREATE INDEX idx_things_ups ON things (ups) WHERE thing_type = 3;

-- Data table (key-value store for attributes)
CREATE TABLE thing_data (
    thing_id VARCHAR(20) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    PRIMARY KEY (thing_id, key)
);

-- Index for common lookups
CREATE INDEX idx_thing_data_author ON thing_data (value)
    WHERE key = 'author_id';
CREATE INDEX idx_thing_data_subreddit ON thing_data (value)
    WHERE key = 'subreddit_id';
CREATE INDEX idx_thing_data_parent ON thing_data (value)
    WHERE key = 'parent_id';

-- Votes table (sharded by subreddit for isolation)
CREATE TABLE votes (
    user_id VARCHAR(20) NOT NULL,
    thing_id VARCHAR(20) NOT NULL,
    direction SMALLINT NOT NULL CHECK (direction IN (-1, 0, 1)),
    created_utc TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, thing_id)
);

-- Index for thing vote counts
CREATE INDEX idx_votes_thing ON votes (thing_id, direction);

-- Subreddit membership (relations table)
CREATE TABLE rel_subreddit_members (
    subreddit_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    rel_type SMALLINT NOT NULL,  -- 1=subscriber, 2=moderator, 3=banned
    created_utc TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (subreddit_id, user_id, rel_type)
);

-- Comment tree optimization (materialized path)
CREATE TABLE comment_tree (
    comment_id VARCHAR(20) PRIMARY KEY,
    link_id VARCHAR(20) NOT NULL,
    path LTREE NOT NULL,  -- PostgreSQL ltree extension
    depth INTEGER NOT NULL,

    INDEX idx_comment_tree_link (link_id),
    INDEX idx_comment_tree_path USING GIST (path)
);
```

### Cassandra Schema (Heavy Writes)

```cql
-- Vote events for analytics and replay
CREATE TABLE vote_events (
    subreddit_id TEXT,
    bucket_day DATE,
    event_time TIMESTAMP,
    user_id TEXT,
    thing_id TEXT,
    direction TINYINT,
    PRIMARY KEY ((subreddit_id, bucket_day), event_time, user_id, thing_id)
) WITH CLUSTERING ORDER BY (event_time DESC);

-- Hot lists by subreddit (materialized)
CREATE TABLE hot_lists (
    subreddit_id TEXT,
    rank INT,
    thing_id TEXT,
    hot_score DOUBLE,
    updated_at TIMESTAMP,
    PRIMARY KEY (subreddit_id, rank)
);
```

---

## Cache Schema

### Redis Data Structures

```
# Subreddit Hot List (Sorted Set)
KEY: subreddit:{subreddit_id}:hot
TYPE: ZSET
MEMBERS: post_ids (t3_xxxxxx)
SCORES: hot_score (float)
TTL: 60 seconds
OPERATIONS:
  ZADD subreddit:t5_2qh1i:hot 1234.56 t3_abc123
  ZREVRANGE subreddit:t5_2qh1i:hot 0 24 WITHSCORES
  ZREMRANGEBYRANK subreddit:t5_2qh1i:hot 0 -1001  // Keep top 1000

# Subreddit Rising List
KEY: subreddit:{subreddit_id}:rising
TYPE: ZSET
SCORES: rising_score (velocity × freshness)
TTL: 30 seconds

# Subreddit New List
KEY: subreddit:{subreddit_id}:new
TYPE: ZSET
SCORES: created_utc (timestamp)
TTL: 30 seconds

# Subreddit Top (time-bucketed)
KEY: subreddit:{subreddit_id}:top:{period}
TYPE: ZSET
PERIODS: hour, day, week, month, year, all
SCORES: score (ups - downs)
TTL: varies by period

# Comment Tree Cache
KEY: comments:{post_id}
TYPE: STRING (JSON)
VALUE: Serialized comment tree with "more" stubs
TTL: 60 seconds
SIZE: 50-200 KB typical

# Vote Count Cache (for rapid updates)
KEY: thing:{thing_id}:votes
TYPE: HASH
FIELDS: ups, downs, score
TTL: 5 seconds
OPERATIONS:
  HINCRBY thing:t3_abc123:votes ups 1
  HGETALL thing:t3_abc123:votes

# User Session
KEY: session:{token}
TYPE: HASH
FIELDS: user_id, created_at, last_active
TTL: 24 hours

# Rate Limiting
KEY: rate:{user_id}:{action}:{window}
TYPE: STRING (counter)
TTL: Window duration
OPERATIONS:
  INCR rate:t2_xyz:vote:60
  EXPIRE rate:t2_xyz:vote:60 60
```

### Memcached Object Cache

```
# Post Object Cache
KEY: thing:t3_xxxxxx
VALUE: Serialized Post object (JSON/MessagePack)
TTL: 300 seconds (5 min)
SIZE: 2-5 KB

# Comment Object Cache
KEY: thing:t1_xxxxxx
VALUE: Serialized Comment object
TTL: 300 seconds
SIZE: 500 bytes - 2 KB

# User Object Cache
KEY: thing:t2_xxxxxx
VALUE: Serialized Account object
TTL: 600 seconds
SIZE: 1 KB

# Subreddit Object Cache
KEY: subreddit:t5_xxxxxx
VALUE: Serialized Subreddit object
TTL: 600 seconds
SIZE: 5-20 KB
```

---

## API Design

### Core Endpoints

```yaml
# Submit Vote
POST /api/vote
  Headers:
    Authorization: Bearer {access_token}
  Body:
    id: string        # Thing ID (t1_/t3_xxxxxx)
    dir: integer      # 1 (up), -1 (down), 0 (remove)
  Response:
    success: boolean
  Rate Limit: 60 votes/minute

# Get Subreddit Feed
GET /r/{subreddit}/{sort}
  Path:
    subreddit: string # Subreddit name
    sort: enum        # hot, new, rising, top, controversial
  Query:
    t: enum           # hour, day, week, month, year, all (for top)
    limit: integer    # 1-100, default 25
    after: string     # Fullname for pagination (t3_xxxxxx)
    before: string    # Fullname for pagination
  Response:
    kind: "Listing"
    data:
      children: Post[]
      after: string?
      before: string?

# Get Comments
GET /comments/{post_id}
  Path:
    post_id: string   # Post ID without prefix
  Query:
    sort: enum        # best, top, new, controversial, old, qa
    limit: integer    # Number of top-level comments
    depth: integer    # Max nesting depth
    comment: string?  # Highlight specific comment
  Response:
    - Post object
    - Comment tree with "more" stubs

# Load More Comments
GET /api/morechildren
  Query:
    link_id: string   # Post fullname (t3_xxxxxx)
    children: string  # Comma-separated comment IDs
    sort: enum
  Response:
    things: Comment[]

# Submit Post
POST /api/submit
  Body:
    sr: string        # Subreddit name
    kind: enum        # self, link, image, video
    title: string     # 1-300 chars
    text: string?     # For self posts
    url: string?      # For link posts
    flair_id: string?
    nsfw: boolean?
    spoiler: boolean?
  Response:
    json:
      data:
        id: string
        name: string  # Fullname (t3_xxxxxx)
        url: string   # Permalink

# Submit Comment
POST /api/comment
  Body:
    parent: string    # Parent fullname (t1_/t3_)
    text: string      # 1-10000 chars (markdown)
  Response:
    json:
      data:
        things: Comment[]
```

### Pagination Pattern

```
CURSOR-BASED PAGINATION:

Request 1:
  GET /r/programming/hot?limit=25
  Response:
    {
      "data": {
        "children": [post1, post2, ..., post25],
        "after": "t3_abc123",  // Last post ID
        "before": null
      }
    }

Request 2:
  GET /r/programming/hot?limit=25&after=t3_abc123
  Response:
    {
      "data": {
        "children": [post26, post27, ..., post50],
        "after": "t3_xyz789",
        "before": "t3_abc123"
      }
    }

Implementation:
  cursor = decode(after)  // post_id
  SELECT * FROM posts
  WHERE subreddit_id = :sr
    AND (hot_score, id) < (SELECT hot_score, id FROM posts WHERE id = cursor)
  ORDER BY hot_score DESC, id DESC
  LIMIT :limit + 1  // Fetch one extra to detect "has more"
```

---

## Core Algorithms

### Algorithm 1: Hot Ranking

```
ALGORITHM Reddit_Hot_Score

PURPOSE: Rank posts by combination of votes and recency

CONSTANTS:
    REDDIT_EPOCH = 1134028003  // December 8, 2005 UTC
    DECAY_FACTOR = 45000       // ~12.5 hours

FUNCTION calculate_hot_score(ups, downs, created_utc):
    // Net score
    score = ups - downs

    // Order of magnitude (logarithmic scaling)
    order = log10(max(abs(score), 1))

    // Sign of score
    IF score > 0:
        sign = 1
    ELSE IF score < 0:
        sign = -1
    ELSE:
        sign = 0

    // Time component (seconds since Reddit epoch)
    seconds = created_utc - REDDIT_EPOCH

    // Final hot score
    hot_score = sign * order + seconds / DECAY_FACTOR

    RETURN hot_score

EXAMPLES:
    Post A: 10 upvotes, 0 downvotes, 12.5 hours old
      score = 10
      order = log10(10) = 1
      seconds = 12.5 * 3600 = 45000
      hot_score = 1 + 45000/45000 = 2.0

    Post B: 100 upvotes, 0 downvotes, 25 hours old
      score = 100
      order = log10(100) = 2
      seconds = 25 * 3600 = 90000
      hot_score = 2 + 90000/45000 = 4.0

    Post C: 1 upvote, 0 downvotes, just posted
      score = 1
      order = log10(1) = 0
      seconds = NOW - REDDIT_EPOCH ≈ 660,000,000
      hot_score = 0 + 660000000/45000 ≈ 14666.67

KEY INSIGHTS:
    - Time dominates for new content
    - 10 votes = 100 votes + 12.5 hours age
    - 100 votes = 1000 votes + 12.5 hours age
    - Negative scores decay faster (pushed to bottom)
```

### Algorithm 2: Best Ranking (Wilson Score)

```
ALGORITHM Reddit_Best_Score

PURPOSE: Rank comments by confidence-weighted vote ratio

CONSTANTS:
    Z = 1.96  // 95% confidence interval

FUNCTION calculate_best_score(ups, downs):
    n = ups + downs

    IF n == 0:
        RETURN 0

    // Observed ratio
    p = ups / n

    // Wilson score lower bound
    // Formula: (p + z²/2n - z×√(p(1-p)/n + z²/4n²)) / (1 + z²/n)

    z_squared = Z * Z
    left = p + z_squared / (2 * n)
    right = Z * sqrt(p * (1 - p) / n + z_squared / (4 * n * n))
    under = 1 + z_squared / n

    best_score = (left - right) / under

    RETURN best_score

EXAMPLES:
    Comment A: 1 upvote, 0 downvotes
      n = 1, p = 1.0
      best_score ≈ 0.206

    Comment B: 100 upvotes, 20 downvotes
      n = 120, p = 0.833
      best_score ≈ 0.759

    Comment C: 5 upvotes, 0 downvotes
      n = 5, p = 1.0
      best_score ≈ 0.565

KEY INSIGHTS:
    - Favors items with more total votes
    - Higher confidence = higher score
    - Comment B (120 votes, 83%) > Comment A (1 vote, 100%)
    - Prevents early "perfect ratio" from dominating
```

### Algorithm 3: Rising Detection

```
ALGORITHM Reddit_Rising_Score

PURPOSE: Identify posts gaining momentum quickly

CONSTANTS:
    FRESHNESS_WINDOW = 2  // hours
    MIN_VOTES = 5

FUNCTION calculate_rising_score(ups, downs, created_utc):
    score = ups - downs

    IF score < MIN_VOTES:
        RETURN 0

    // Age in hours
    age_hours = (NOW - created_utc) / 3600

    IF age_hours < 0.1:  // Less than 6 minutes
        age_hours = 0.1  // Avoid division by zero/instability

    // Vote velocity (votes per hour)
    vote_velocity = score / age_hours

    // Freshness boost for very new posts
    IF age_hours < FRESHNESS_WINDOW:
        freshness_boost = 2.0 - (age_hours / FRESHNESS_WINDOW)
    ELSE:
        freshness_boost = 1.0

    rising_score = vote_velocity * freshness_boost

    RETURN rising_score

EXAMPLES:
    Post A: 50 upvotes in 30 minutes
      age_hours = 0.5
      velocity = 50 / 0.5 = 100 votes/hour
      boost = 2.0 - (0.5 / 2) = 1.75
      rising_score = 100 * 1.75 = 175

    Post B: 100 upvotes in 5 hours
      age_hours = 5
      velocity = 100 / 5 = 20 votes/hour
      boost = 1.0
      rising_score = 20 * 1.0 = 20

KEY INSIGHTS:
    - Detects "tomorrow's hot posts" early
    - High velocity + fresh = top rising
    - Decays as post ages
```

### Algorithm 4: Controversial Ranking

```
ALGORITHM Reddit_Controversial_Score

PURPOSE: Surface polarizing content with high engagement

FUNCTION calculate_controversial_score(ups, downs):
    total = ups + downs

    IF total == 0:
        RETURN 0

    // Balance (how evenly split)
    IF ups > downs:
        balance = downs / ups
    ELSE IF downs > ups:
        balance = ups / downs
    ELSE:
        balance = 1.0  // Perfect split

    // Magnitude (total engagement)
    magnitude = ups + downs

    // Controversial = high engagement + balanced votes
    controversial_score = magnitude * balance

    RETURN controversial_score

EXAMPLES:
    Post A: 100 upvotes, 95 downvotes
      balance = 95/100 = 0.95
      magnitude = 195
      score = 195 * 0.95 = 185.25  (HIGH)

    Post B: 1000 upvotes, 10 downvotes
      balance = 10/1000 = 0.01
      magnitude = 1010
      score = 1010 * 0.01 = 10.1  (LOW)

    Post C: 50 upvotes, 50 downvotes
      balance = 1.0
      magnitude = 100
      score = 100 * 1.0 = 100  (MEDIUM)
```

### Algorithm 5: Comment Tree Construction

```
ALGORITHM Build_Comment_Tree

PURPOSE: Construct hierarchical comment display with pagination

CONSTANTS:
    MAX_DEPTH = 10
    INITIAL_LOAD = 200
    COLLAPSE_THRESHOLD = -4
    MORE_CHILDREN_LIMIT = 20

FUNCTION build_comment_tree(post_id, sort, limit):
    // Fetch all comments for post
    comments = db.query(
        "SELECT * FROM things t
         JOIN thing_data d ON t.id = d.thing_id
         WHERE d.key = 'link_id' AND d.value = :post_id",
        post_id
    )

    // Build lookup maps
    comment_map = {}
    children_map = {}  // parent_id -> children[]

    FOR comment IN comments:
        comment_map[comment.id] = comment
        parent_id = comment.parent_id

        IF parent_id NOT IN children_map:
            children_map[parent_id] = []
        children_map[parent_id].append(comment)

    // Sort children at each level
    FOR parent_id, children IN children_map:
        sort_comments(children, sort)

    // Build tree from roots (direct replies to post)
    roots = children_map.get(post_id, [])
    tree = []
    count = 0

    FOR root IN roots:
        IF count >= limit:
            // Create "more" stub for remaining
            remaining_ids = [c.id FOR c IN roots[count:]]
            tree.append(MoreComments(ids=remaining_ids, count=len(remaining_ids)))
            BREAK

        node = build_node(root, children_map, 0, MAX_DEPTH, limit - count)
        tree.append(node)
        count += count_nodes(node)

    RETURN tree

FUNCTION build_node(comment, children_map, depth, max_depth, remaining):
    node = {
        "comment": comment,
        "replies": [],
        "collapsed": comment.score < COLLAPSE_THRESHOLD
    }

    IF depth >= max_depth OR remaining <= 0:
        children = children_map.get(comment.id, [])
        IF len(children) > 0:
            node["more"] = MoreComments(ids=[c.id FOR c IN children], count=len(children))
        RETURN node

    children = children_map.get(comment.id, [])
    child_count = 0

    FOR child IN children:
        IF child_count >= MORE_CHILDREN_LIMIT:
            remaining_ids = [c.id FOR c IN children[child_count:]]
            node["replies"].append(MoreComments(ids=remaining_ids[:5], count=len(remaining_ids)))
            BREAK

        child_node = build_node(child, children_map, depth + 1, max_depth, remaining - child_count)
        node["replies"].append(child_node)
        child_count += count_nodes(child_node)

    RETURN node

FUNCTION sort_comments(comments, sort):
    IF sort == "best":
        comments.sort(key=lambda c: wilson_score(c.ups, c.downs), reverse=True)
    ELSE IF sort == "top":
        comments.sort(key=lambda c: c.score, reverse=True)
    ELSE IF sort == "new":
        comments.sort(key=lambda c: c.created_utc, reverse=True)
    ELSE IF sort == "old":
        comments.sort(key=lambda c: c.created_utc)
    ELSE IF sort == "controversial":
        comments.sort(key=lambda c: controversial_score(c.ups, c.downs), reverse=True)
```

---

## Indexing Strategy

### PostgreSQL Indexes

```sql
-- Things table indexes
CREATE INDEX idx_things_type_score ON things (thing_type, (ups - downs) DESC)
    WHERE thing_type = 3 AND deleted = FALSE;

CREATE INDEX idx_things_created ON things (thing_type, created_utc DESC)
    WHERE deleted = FALSE;

-- Data table indexes (filtered for common queries)
CREATE INDEX idx_data_subreddit ON thing_data (value, thing_id)
    WHERE key = 'subreddit_id';

CREATE INDEX idx_data_author ON thing_data (value, thing_id)
    WHERE key = 'author_id';

CREATE INDEX idx_data_link ON thing_data (value, thing_id)
    WHERE key = 'link_id';  -- Comments by post

CREATE INDEX idx_data_parent ON thing_data (value, thing_id)
    WHERE key = 'parent_id';  -- Comment children

-- Votes table indexes
CREATE INDEX idx_votes_thing_dir ON votes (thing_id, direction);
CREATE INDEX idx_votes_user_recent ON votes (user_id, created_utc DESC);

-- Composite index for hot ranking queries
CREATE INDEX idx_posts_hot ON things (
    (SELECT value FROM thing_data WHERE thing_id = things.id AND key = 'subreddit_id'),
    ((ups - downs)::float / greatest(1, extract(epoch from now()) - extract(epoch from created_utc))) DESC
) WHERE thing_type = 3 AND deleted = FALSE;
```

### Elasticsearch Mappings

```json
{
  "reddit_posts": {
    "mappings": {
      "properties": {
        "id": { "type": "keyword" },
        "title": {
          "type": "text",
          "analyzer": "english",
          "fields": {
            "exact": { "type": "keyword" }
          }
        },
        "selftext": {
          "type": "text",
          "analyzer": "english"
        },
        "author": { "type": "keyword" },
        "subreddit": { "type": "keyword" },
        "created_utc": { "type": "date" },
        "score": { "type": "integer" },
        "num_comments": { "type": "integer" },
        "over_18": { "type": "boolean" },
        "flair": { "type": "keyword" }
      }
    }
  }
}
```

---

## Partitioning Strategy

### Subreddit-Based Sharding

```
SHARDING STRATEGY:

Vote Queue Partitioning:
    partition_id = consistent_hash(subreddit_id) % 100

Database Sharding (for very large scale):
    shard_id = consistent_hash(subreddit_id) % NUM_SHARDS

Benefits:
    - Hot subreddits isolated
    - Related data co-located
    - Efficient subreddit feed queries

Example Distribution:
    Shard 0: r/programming, r/learnprogramming, r/coding
    Shard 1: r/funny, r/memes
    Shard 2: r/AskReddit, r/NoStupidQuestions
    ...

Cross-Shard Queries:
    - r/all aggregation (sample from all shards)
    - User profile (fan-out to all shards)
    - Global search (Elasticsearch, not sharded by subreddit)
```

### Hot List Materialization

```
MATERIALIZATION STRATEGY:

Per-Subreddit Hot Lists:
    Redis: subreddit:{id}:hot (sorted set)
    Updated: Every 30-60 seconds by background workers
    Size: Top 1000 posts per subreddit

Global Lists (r/popular, r/all):
    Strategy: Sample top N from each subreddit
    Weighting: Subscriber count, recent activity
    Rate limiting: Max X posts per subreddit per hour
    Updated: Every 60 seconds

Precomputation Workers:
    FOR each subreddit:
        posts = fetch_recent_posts(subreddit, 1000, last_24h)
        scored = [(calculate_hot(p), p.id) FOR p IN posts]
        scored.sort(reverse=True)

        REDIS.ZADD(f"subreddit:{subreddit.id}:hot", *flatten(scored))
        REDIS.EXPIRE(f"subreddit:{subreddit.id}:hot", 120)
```

---

## Next Steps

- [Deep Dives & Bottlenecks →](./04-deep-dive-and-bottlenecks.md)
