# Low-Level Design — Live Leaderboard System

## Data Model

### Score Event (Event Log)

The score event is the **immutable source of truth**. Every score submission is recorded as an append-only event, enabling replay for recovery and audit.

```
ScoreEvent {
    event_id:        UUID            // Globally unique event identifier
    player_id:       UUID            // Player who achieved the score
    leaderboard_id:  STRING          // Composite key: "{game}:{mode}:{region}:{season}"
    score:           FLOAT64         // The score value (higher = better by default)
    score_type:      ENUM            // ABSOLUTE | INCREMENT | HIGHEST
    previous_score:  FLOAT64         // Score before this update (for audit trail)
    proof_hash:      STRING          // Hash of server-side game state proving the score
    source_server:   STRING          // Game server ID that generated the score
    timestamp:       TIMESTAMP_MS    // Server-authoritative timestamp
    validation:      ENUM            // PASSED | FLAGGED | PENDING_REVIEW
    metadata:        MAP<STRING,STRING>  // Game-specific context (level, mode, character)
}
```

### Leaderboard Configuration

```
LeaderboardConfig {
    leaderboard_id:    STRING        // "{game}:{mode}:{region}:{season}"
    game_id:           STRING        // Parent game identifier
    display_name:      STRING        // Human-readable name
    scoring_strategy:  ENUM          // HIGHEST | CUMULATIVE | LATEST | WEIGHTED_DECAY
    sort_order:        ENUM          // DESC (higher=better) | ASC (lower=better, e.g., speedruns)
    tiebreak_policy:   ENUM          // EARLIER_WINS | SECONDARY_KEY | SHARED_RANK
    secondary_key:     STRING        // Optional secondary sort field
    reset_schedule:    CRON_EXPR     // "0 0 1 * *" for monthly reset
    max_entries:       INT64         // Cap on total entries (0 = unlimited)
    shard_count:       INT           // Number of ranking shards
    shard_strategy:    ENUM          // HASH | RANGE | GAME_PARTITION
    created_at:        TIMESTAMP
    season_number:     INT           // Current season counter
    status:            ENUM          // ACTIVE | FROZEN | ARCHIVED
}
```

### Player Record (Metadata Store)

```
PlayerRecord {
    player_id:       UUID
    display_name:    STRING          // Public display name (sanitized)
    avatar_url:      STRING          // Profile image URL
    region:          STRING          // Geographic region for regional boards
    account_level:   INT             // Used for matchmaking-based boards
    friend_ids:      LIST<UUID>      // Cached friend list (synced from social service)
    trust_score:     FLOAT           // Anti-cheat trust metric (0.0 = suspicious, 1.0 = trusted)
    total_games:     INT             // Lifetime games played
    created_at:      TIMESTAMP
    last_active:     TIMESTAMP
}
```

### Historical Snapshot

```
LeaderboardSnapshot {
    snapshot_id:      UUID
    leaderboard_id:   STRING
    captured_at:      TIMESTAMP
    season_number:    INT
    total_entries:    INT64
    top_entries:      LIST<SnapshotEntry>  // Top 1000 preserved in full
    distribution:     ScoreDistribution    // Histogram for percentile reconstruction
    storage_path:     STRING               // Path to full snapshot in object storage
}

SnapshotEntry {
    rank:        INT64
    player_id:   UUID
    score:       FLOAT64
    metadata:    MAP<STRING,STRING>
}

ScoreDistribution {
    bucket_width:    FLOAT64
    buckets:         LIST<BucketCount>     // [{range_start, range_end, count}, ...]
    percentiles:     MAP<INT, FLOAT64>     // {50: 1250.0, 90: 3400.0, 99: 8900.0}
}
```

---

## API Design

### Score Submission

```
POST /v1/scores

Request:
{
    "player_id": "uuid-abc-123",
    "leaderboard_id": "battle-royale:solo:global:season-7",
    "score": 2450,
    "score_type": "HIGHEST",       // Only update if higher than current
    "proof": "sha256:abc123...",   // Server-generated proof hash
    "metadata": {
        "kills": "12",
        "placement": "1",
        "match_id": "match-xyz"
    }
}

Response (202 Accepted):
{
    "event_id": "evt-uuid-456",
    "status": "ACCEPTED",
    "estimated_rank_update_ms": 200
}

Error Responses:
  400: Invalid payload (missing fields, score out of bounds)
  401: Authentication failure
  403: Player banned or leaderboard frozen
  429: Rate limit exceeded
  503: Ingestion pipeline unavailable
```

### Get Player Rank

```
GET /v1/leaderboards/{leaderboard_id}/players/{player_id}/rank

Response (200 OK):
{
    "player_id": "uuid-abc-123",
    "leaderboard_id": "battle-royale:solo:global:season-7",
    "rank": 4523,
    "score": 2450,
    "total_entries": 12500000,
    "percentile": 99.96,
    "rank_type": "EXACT",          // EXACT or APPROXIMATE
    "last_updated": "2026-03-09T14:30:00Z"
}

Error Responses:
  404: Player not found on this leaderboard
```

### Get Top-N

```
GET /v1/leaderboards/{leaderboard_id}/top?count=100&offset=0

Response (200 OK):
{
    "leaderboard_id": "battle-royale:solo:global:season-7",
    "total_entries": 12500000,
    "entries": [
        {
            "rank": 1,
            "player_id": "uuid-top-1",
            "display_name": "ProGamer99",
            "score": 9850,
            "metadata": {"kills": "45", "wins": "23"}
        },
        ...
    ],
    "pagination": {
        "offset": 0,
        "count": 100,
        "has_more": true
    }
}
```

### Get Around-Me

```
GET /v1/leaderboards/{leaderboard_id}/around/{player_id}?count=10

Response (200 OK):
{
    "leaderboard_id": "battle-royale:solo:global:season-7",
    "center_player": {
        "rank": 4523,
        "player_id": "uuid-abc-123",
        "score": 2450
    },
    "entries": [
        {"rank": 4513, "player_id": "...", "score": 2455},
        ...
        {"rank": 4523, "player_id": "uuid-abc-123", "score": 2450},  // me
        ...
        {"rank": 4533, "player_id": "...", "score": 2445}
    ]
}
```

### Friend Leaderboard

```
GET /v1/leaderboards/{leaderboard_id}/friends/{player_id}

Response (200 OK):
{
    "leaderboard_id": "battle-royale:solo:global:season-7",
    "friend_count": 87,
    "my_friend_rank": 12,
    "entries": [
        {"friend_rank": 1, "player_id": "...", "display_name": "BestFriend", "score": 5200},
        ...
        {"friend_rank": 12, "player_id": "uuid-abc-123", "display_name": "Me", "score": 2450},
        ...
    ]
}
```

### Get Percentile

```
GET /v1/leaderboards/{leaderboard_id}/players/{player_id}/percentile

Response (200 OK):
{
    "player_id": "uuid-abc-123",
    "percentile": 95.3,
    "percentile_rank": "TOP_5_PERCENT",
    "tier": "DIAMOND",              // Game-defined tier mapping
    "players_above": 587500,
    "players_below": 11912500,
    "accuracy": "APPROXIMATE"       // Based on bucket counting
}
```

### Admin: Trigger Reset

```
POST /v1/admin/leaderboards/{leaderboard_id}/reset

Request:
{
    "reason": "SEASONAL_RESET",
    "new_season_number": 8,
    "archive_current": true,
    "pre_warm": true
}

Response (202 Accepted):
{
    "reset_id": "reset-uuid-789",
    "status": "IN_PROGRESS",
    "estimated_completion_seconds": 15
}
```

---

## Core Algorithms

### Algorithm 1: Score Update with Sorted Sets

The fundamental operation maps directly to sorted set commands. The sorted set maintains entries ordered by score, supporting O(log N) insertions and rank lookups.

```
FUNCTION update_score(leaderboard_id, player_id, new_score, score_type):
    key = "lb:" + leaderboard_id

    IF score_type == HIGHEST:
        // Only update if new score is higher
        current = ZSCORE(key, player_id)
        IF current != NULL AND new_score <= current:
            RETURN {updated: false, rank: ZREVRANK(key, player_id)}

    IF score_type == INCREMENT:
        // Atomically increment
        new_score = ZINCRBY(key, new_score, player_id)
    ELSE:
        // Absolute set (HIGHEST or LATEST)
        ZADD(key, new_score, player_id)

    rank = ZREVRANK(key, player_id)  // 0-indexed
    total = ZCARD(key)

    RETURN {
        updated: true,
        score: new_score,
        rank: rank + 1,             // 1-indexed for display
        total: total,
        percentile: (1 - rank / total) * 100
    }
```

> **Atomicity**: For the HIGHEST score_type, the check-and-set must be atomic. Use a server-side script (equivalent to Lua scripting in key-value stores) to avoid race conditions between ZSCORE and ZADD.

### Atomic Highest-Score Update (Server-Side Script)

```
FUNCTION atomic_update_highest(key, player_id, new_score):
    // Executed atomically on the sorted set server
    current = ZSCORE(key, player_id)

    IF current == NULL OR new_score > current:
        ZADD(key, new_score, player_id)
        new_rank = ZREVRANK(key, player_id)
        total = ZCARD(key)
        RETURN {updated: true, rank: new_rank, total: total}
    ELSE:
        current_rank = ZREVRANK(key, player_id)
        total = ZCARD(key)
        RETURN {updated: false, rank: current_rank, total: total}
```

### Algorithm 2: Tiebreaking with Composite Scores

When two players have the same score, we need deterministic ordering. The technique encodes a timestamp into the fractional part of the score.

```
FUNCTION encode_score_with_tiebreak(raw_score, timestamp):
    // raw_score: integer score (e.g., 2450)
    // timestamp: epoch milliseconds
    // Higher score wins; among equal scores, earlier timestamp wins

    // Invert timestamp so earlier = higher fractional part
    max_timestamp = 9999999999999  // Far future epoch ms
    inverted_ts = max_timestamp - timestamp

    // Encode: integer part = score, fractional part = inverted timestamp
    // This ensures ZREVRANGE naturally sorts by score DESC, then time ASC
    composite_score = raw_score + (inverted_ts / 10^13)

    RETURN composite_score

EXAMPLE:
    Player A: score=100, time=1000 → 100.8999999999000
    Player B: score=100, time=2000 → 100.8999999998000
    Player C: score=101, time=5000 → 101.8999999995000
    Sorted (DESC): C (101.899...), A (100.899...), B (100.899...)
    // C wins (higher score), A beats B (earlier timestamp)
```

### Algorithm 3: Sharded Rank Computation (Scatter-Gather)

When a leaderboard exceeds single-instance capacity, entries are distributed across shards. Computing a player's global rank requires querying all shards.

```
FUNCTION get_global_rank(leaderboard_id, player_id, shard_count):
    // Step 1: Find which shard owns this player
    owner_shard = HASH(player_id) MOD shard_count
    player_score = ZSCORE(shard_key(leaderboard_id, owner_shard), player_id)

    IF player_score == NULL:
        RETURN NOT_FOUND

    // Step 2: Scatter - ask each shard how many players have a higher score
    higher_counts = PARALLEL_FOR shard_id IN [0..shard_count-1]:
        key = shard_key(leaderboard_id, shard_id)
        // ZCOUNT returns number of entries with score in range (player_score, +inf)
        count = ZCOUNT(key, "(" + player_score, "+inf")
        RETURN count

    // Step 3: Gather - sum all counts
    global_rank = SUM(higher_counts) + 1   // +1 for 1-indexed ranking

    // Step 4: Handle ties within the owner shard
    // Players on the same shard with the same score but ranked above
    same_score_above = ZRANGEBYSCORE(
        shard_key(leaderboard_id, owner_shard),
        player_score, player_score
    ).filter(p => ZREVRANK(key, p) < ZREVRANK(key, player_id)).count()

    global_rank = global_rank + same_score_above

    RETURN {
        rank: global_rank,
        score: player_score,
        rank_type: "EXACT",
        shard_count: shard_count
    }
```

### Algorithm 4: Approximate Percentile with Bucket Counting

For billion-entry leaderboards where scatter-gather is too slow, maintain precomputed score-range buckets.

```
FUNCTION setup_percentile_buckets(leaderboard_id, bucket_width):
    // Precompute during periodic job (every 1-5 minutes)
    buckets = {}
    total = 0

    FOR each shard IN get_shards(leaderboard_id):
        // Get score distribution from each shard
        min_score = ZRANGEBYSCORE(shard, "-inf", "+inf", LIMIT 0 1)[0].score
        max_score = ZREVRANGEBYSCORE(shard, "+inf", "-inf", LIMIT 0 1)[0].score

        FOR range_start FROM min_score TO max_score STEP bucket_width:
            range_end = range_start + bucket_width
            count = ZCOUNT(shard, range_start, range_end)
            buckets[range_start] = buckets.get(range_start, 0) + count
            total = total + count

    STORE percentile_index(leaderboard_id, buckets, total)

FUNCTION get_approximate_percentile(leaderboard_id, player_score):
    index = LOAD percentile_index(leaderboard_id)

    players_below = 0
    FOR bucket IN index.buckets WHERE bucket.range_end <= player_score:
        players_below += bucket.count

    // Linear interpolation within the player's bucket
    player_bucket = find_bucket(index, player_score)
    fraction = (player_score - player_bucket.range_start) / bucket_width
    players_below += player_bucket.count * fraction

    percentile = (players_below / index.total) * 100
    RETURN {percentile: percentile, accuracy: "APPROXIMATE"}
```

### Algorithm 5: Friend Leaderboard with Pipelined Lookups

```
FUNCTION get_friend_leaderboard(leaderboard_id, player_id):
    // Step 1: Get friend list
    friends = GET_FRIENDS(player_id)
    all_players = friends + [player_id]

    // Step 2: Pipeline all score lookups in a single round-trip
    key = "lb:" + leaderboard_id
    scores = PIPELINE:
        FOR player IN all_players:
            ZSCORE(key, player)

    // Step 3: Filter out friends not on this leaderboard
    entries = []
    FOR i, player IN enumerate(all_players):
        IF scores[i] != NULL:
            entries.append({player_id: player, score: scores[i]})

    // Step 4: Sort by score descending
    entries.sort(by: score, order: DESC)

    // Step 5: Assign friend-relative ranks
    FOR i, entry IN enumerate(entries):
        entry.friend_rank = i + 1

    my_entry = entries.find(e => e.player_id == player_id)

    RETURN {
        friend_count: len(entries),
        my_friend_rank: my_entry.friend_rank,
        entries: entries
    }
```

### Algorithm 6: Seasonal Reset with Atomic Rotation

```
FUNCTION execute_seasonal_reset(leaderboard_id, new_season):
    old_key = "lb:" + leaderboard_id + ":season:" + (new_season - 1)
    new_key = "lb:" + leaderboard_id + ":season:" + new_season
    pointer_key = "lb:" + leaderboard_id + ":active"

    // Step 1: Pre-warm new leaderboard (empty but allocated)
    ENSURE_EXISTS(new_key)

    // Step 2: Snapshot old leaderboard before reset
    snapshot_id = trigger_snapshot(leaderboard_id, old_key)

    // Step 3: Atomic pointer swap
    // All queries use the pointer to find the active leaderboard
    SET(pointer_key, new_key)   // Atomic single-key operation

    // Step 4: New scores now write to new_key
    // Old scores remain queryable via old_key for historical access

    // Step 5: Async cleanup (non-blocking)
    ASYNC:
        archive_to_object_storage(old_key, snapshot_id)
        // Keep old_key in memory for 24h grace period
        SET_EXPIRY(old_key, 86400)

    RETURN {
        reset_id: generate_uuid(),
        old_season: new_season - 1,
        new_season: new_season,
        snapshot_id: snapshot_id,
        status: "COMPLETED"
    }
```

---

## Sorted Set Internals

### Data Structure: Skip List + Hash Table

The sorted set is internally a combination of two data structures:

```
Sorted Set = Skip List (ordered by score) + Hash Table (member → score)

Skip List:
  - Probabilistic balanced data structure
  - Multiple levels of linked lists
  - Level 0: all elements in sorted order
  - Level 1: ~50% of elements (skip every other)
  - Level k: ~(1/2^k) of elements
  - Expected height: O(log N)

Operations:
  ZADD:      Hash lookup + skip list insert    → O(log N)
  ZREM:      Hash lookup + skip list delete    → O(log N)
  ZSCORE:    Hash table lookup                 → O(1)
  ZREVRANK:  Skip list traversal from head     → O(log N)
  ZREVRANGE: Skip list traversal from offset   → O(log N + M) where M = range size
  ZCOUNT:    Two skip list searches (bounds)   → O(log N)
  ZCARD:     Maintained counter                → O(1)

Memory Layout (per entry):
  Hash table entry:  key pointer (8B) + value pointer (8B) + hash (8B) + next (8B) = 32B
  Skip list node:    score (8B) + backward (8B) + level array (avg 2 levels × 16B) = 48B
  Member string:     16B (UUID) + SDS overhead (9B) = 25B
  Total per entry:   ~105-120 bytes
```

### Shard Key Design

```
Leaderboard Key Pattern:
  "lb:{game_id}:{mode}:{region}:{season}:shard:{shard_id}"

Examples:
  "lb:battle-royale:solo:global:s7:shard:0"
  "lb:battle-royale:solo:na:s7:shard:0"
  "lb:racing:time-trial:global:weekly-12:shard:0"

Pointer Key (active season):
  "lb:{game_id}:{mode}:{region}:active" → points to current season key

Metadata Key:
  "lb:meta:{leaderboard_id}" → hash of leaderboard configuration
```

---

## Score Validation Pipeline

```
FUNCTION validate_score(event):
    // Layer 1: Schema Validation (< 1ms)
    IF NOT valid_uuid(event.player_id): REJECT("invalid player_id")
    IF NOT valid_leaderboard(event.leaderboard_id): REJECT("unknown leaderboard")
    IF event.score < 0 OR event.score > MAX_SCORE: REJECT("score out of bounds")

    // Layer 2: Player Status Check (< 5ms)
    player = GET_PLAYER(event.player_id)
    IF player.banned: REJECT("player banned")
    IF player.trust_score < MINIMUM_TRUST: FLAG_FOR_REVIEW()

    // Layer 3: Statistical Plausibility (< 10ms)
    config = GET_LEADERBOARD_CONFIG(event.leaderboard_id)
    current_score = ZSCORE("lb:" + event.leaderboard_id, event.player_id)

    IF config.scoring_strategy == HIGHEST:
        IF current_score != NULL AND event.score <= current_score:
            RETURN {action: SKIP, reason: "not a new high score"}

    score_delta = event.score - (current_score OR 0)
    IF score_delta > config.max_score_delta_per_update:
        FLAG_FOR_REVIEW("suspicious score jump")

    // Layer 4: Rate Check (< 1ms)
    recent_updates = COUNT_RECENT_UPDATES(event.player_id, window=60s)
    IF recent_updates > config.max_updates_per_minute:
        REJECT("rate limit exceeded")

    // Layer 5: Proof Verification (< 20ms, async for deep check)
    IF event.proof_hash != NULL:
        IF NOT verify_proof_hash(event.proof_hash, event.source_server):
            REJECT("invalid proof")

    RETURN {action: ACCEPT}
```

---

## Merge Algorithm for Sharded Top-N

When retrieving the global top-N from a sharded leaderboard, each shard returns its local top-N, and the results are merged.

```
FUNCTION get_sharded_top_n(leaderboard_id, n, shard_count):
    // Step 1: Parallel fetch top-N from each shard
    shard_results = PARALLEL_FOR shard_id IN [0..shard_count-1]:
        key = shard_key(leaderboard_id, shard_id)
        RETURN ZREVRANGE(key, 0, n-1, WITHSCORES)

    // Step 2: K-way merge (min-heap for DESC order = max-heap)
    heap = MAX_HEAP()
    cursors = [0] * shard_count

    // Initialize heap with top entry from each shard
    FOR shard_id, results IN enumerate(shard_results):
        IF results.length > 0:
            heap.push({
                score: results[0].score,
                player_id: results[0].player_id,
                shard_id: shard_id,
                index: 0
            })

    // Step 3: Extract top-N globally
    global_top = []
    WHILE global_top.length < n AND NOT heap.empty():
        top = heap.pop()
        global_top.append({
            rank: global_top.length + 1,
            player_id: top.player_id,
            score: top.score
        })

        // Push next entry from the same shard
        next_idx = top.index + 1
        shard_data = shard_results[top.shard_id]
        IF next_idx < shard_data.length:
            heap.push({
                score: shard_data[next_idx].score,
                player_id: shard_data[next_idx].player_id,
                shard_id: top.shard_id,
                index: next_idx
            })

    RETURN global_top
```

**Complexity**: O(N × log(S)) where N = requested entries, S = shard count. Since S is typically < 100 and N < 1000, this merge is sub-millisecond.

---

## Rate Limiting Design

```
Rate Limits by Endpoint:

Score Submission:
  Per player: 10 updates/minute (game-configurable)
  Per game server: 5,000 updates/second
  Global: 200,000 updates/second

Rank Queries:
  Per player (authenticated): 60 queries/minute
  Per API key: 10,000 queries/second
  Global: 1,000,000 queries/second

Friend Leaderboard:
  Per player: 10 queries/minute (expensive operation)

Admin Operations:
  Per API key: 10 operations/minute
  Reset: 1 per leaderboard per hour (safety throttle)

Implementation: Token bucket per player/API key stored in distributed cache
Window: Sliding window with millisecond precision
Response: 429 Too Many Requests with Retry-After header
```

---

*Previous: [High-Level Design](./02-high-level-design.md) | Next: [Deep Dive & Bottlenecks →](./04-deep-dive-and-bottlenecks.md)*
