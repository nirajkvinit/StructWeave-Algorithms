# Requirements & Estimations — Live Leaderboard System

## Functional Requirements

### Core Features

| ID | Feature | Description |
|---|---|---|
| FR-1 | **Score Submission** | Accept score updates from game servers with server-authoritative validation; support both absolute (set score) and relative (increment score) operations |
| FR-2 | **Rank Query** | Return a player's current rank and score on a specific leaderboard in real-time |
| FR-3 | **Top-N Retrieval** | Fetch the top N players (typically 10, 50, 100, 1000) with scores and metadata |
| FR-4 | **Around-Me Query** | Return K players above and below a given player's rank (relative leaderboard) |
| FR-5 | **Percentile Lookup** | Return a player's percentile position (e.g., "top 5%") without requiring exact global rank |
| FR-6 | **Friend Leaderboard** | Rank a player's friend list against each other on any leaderboard |
| FR-7 | **Multi-Leaderboard** | Support multiple concurrent leaderboards: per-game, per-mode, per-region, per-season, per-tournament |
| FR-8 | **Seasonal Reset** | Reset leaderboards on configurable schedules (daily, weekly, monthly, seasonal) without downtime |
| FR-9 | **Historical Snapshots** | Capture point-in-time leaderboard snapshots for post-season review and analytics |
| FR-10 | **Real-Time Notifications** | Push rank change events to subscribed clients via persistent connections |
| FR-11 | **Score Aggregation** | Support multiple scoring strategies: highest score, cumulative score, latest score, weighted average |
| FR-12 | **Tiebreaking** | Deterministic tiebreaking when players share the same score (earliest submission wins, or secondary sort key) |

### Extended Features

| ID | Feature | Description |
|---|---|---|
| FR-13 | **Tournament Brackets** | Specialized leaderboards for elimination tournaments with bracket progression |
| FR-14 | **Team Leaderboards** | Aggregate individual scores into team rankings |
| FR-15 | **Decay Scoring** | Time-weighted scores where older achievements contribute less (activity-based ranking) |
| FR-16 | **Composite Leaderboards** | Rankings computed from multiple metrics (kills + assists + objectives) |
| FR-17 | **Reward Integration** | Trigger reward distribution based on final leaderboard positions at season end |

---

## Non-Functional Requirements

### Performance

| Metric | Target | Rationale |
|---|---|---|
| **Top-N query latency** | < 50ms P99 | Players expect instant leaderboard rendering; competitive games need near-zero lag |
| **Individual rank lookup** | < 100ms P99 | Displayed in-game HUD; must not block gameplay frame rendering |
| **Score update propagation** | < 500ms P99 | Player should see their new rank within one second of achieving a score |
| **Around-me query** | < 100ms P99 | Same rendering requirement as rank lookup |
| **Friend leaderboard** | < 200ms P99 | Involves cross-referencing friend list with leaderboard data |
| **Cross-shard global rank** | < 2s P99 | Acceptable for large-scale scatter-gather operations |
| **Percentile query** | < 100ms P99 | Approximate computation acceptable; no full traversal needed |

### Availability & Durability

| Metric | Target | Rationale |
|---|---|---|
| **Read path availability** | 99.99% | Leaderboard display is non-blocking but critical for engagement; 52 min downtime/year |
| **Write path availability** | 99.95% | Score submissions can tolerate brief queueing; 4.4 hours downtime/year |
| **Score durability** | 99.9999% | No validated score should ever be lost; competitive integrity depends on it |
| **Rank accuracy** | Exact within single shard; ±0.1% across shards | Players tolerate minor cross-shard approximation but not visible rank errors |
| **Reset success rate** | 100% | Seasonal resets must never fail mid-operation; atomic rotation required |

### Scalability

| Dimension | Target |
|---|---|
| **Total players** | 100M+ unique players across all leaderboards |
| **Concurrent leaderboards** | 100,000+ (games × modes × regions × seasons) |
| **Score updates/sec (sustained)** | 50,000 |
| **Score updates/sec (peak)** | 200,000 (during global events, season finales) |
| **Rank queries/sec (sustained)** | 200,000 |
| **Rank queries/sec (peak)** | 1,000,000 (during tournament broadcasts) |
| **Entries per leaderboard** | Up to 100M per single leaderboard |
| **Read replicas per shard** | 3–5 per primary for query fan-out |

---

## Capacity Estimation

### Traffic Estimation

```
Score Updates:
  Sustained: 50,000 updates/sec
  Peak (4x): 200,000 updates/sec
  Daily total: 50,000 × 86,400 = 4.32 billion score events/day

Rank Queries:
  Sustained: 200,000 queries/sec
  Peak (5x): 1,000,000 queries/sec
  Read:write ratio: 4:1 (sustained), up to 20:1 (during spectator events)

Real-Time Subscriptions:
  Active WebSocket connections: 5M–20M concurrent
  Rank change notifications: ~100,000 events/sec (subset of score updates that change rank)
```

### Storage Estimation

```
In-Memory (Sorted Set) per 10M entries:
  Member (player ID): 16 bytes (UUID or 64-bit int)
  Score: 8 bytes (double-precision float)
  Skip list overhead: ~40 bytes per entry (pointers, levels)
  Hash table overhead: ~56 bytes per entry
  Per entry total: ~120 bytes
  10M entries: 120 × 10M = 1.2 GB
  100M entries (sharded across 10 instances): 12 GB total

Persistent Storage (Score Event Log):
  Per event: 64 bytes (player_id + leaderboard_id + score + timestamp + metadata)
  Daily: 64 × 4.32B = 276 GB/day
  Monthly: 276 × 30 = 8.3 TB/month
  With compression (4:1): ~2 TB/month

Historical Snapshots:
  Per snapshot (100M entries): ~3.2 GB (player_id + score + rank, compressed)
  Daily snapshots × 365 days: ~1.2 TB/year
  Per-leaderboard snapshots (100K boards × weekly): ~50 TB/year

Player Metadata:
  Per player: ~256 bytes (name, avatar URL, region, stats)
  100M players: 25.6 GB (fits in-memory cache)
```

### Memory Budget

```
Ranking Engine Cluster:
  Primary shards (10 instances × 1.2 GB): 12 GB
  Read replicas (3 per shard × 12 GB): 36 GB
  Overhead (fragmentation, OS): 2x multiplier
  Total ranking memory: ~96 GB

Player Metadata Cache:
  100M players × 256 bytes: 25.6 GB
  With overhead: ~40 GB

Total In-Memory Footprint: ~136 GB across cluster
```

### Bandwidth Estimation

```
Score Ingestion:
  50,000 updates/sec × 200 bytes (payload + headers) = 10 MB/s ingress
  Peak: 40 MB/s ingress

Rank Query Responses:
  200,000 queries/sec × 2 KB average response = 400 MB/s egress
  Peak: 2 GB/s egress

WebSocket Notifications:
  100,000 events/sec × 128 bytes = 12.8 MB/s
  With connection overhead: ~50 MB/s

Total Bandwidth: ~500 MB/s sustained, ~2.5 GB/s peak
```

---

## SLO / SLA Table

| SLO | Target | Measurement | Consequence of Violation |
|---|---|---|---|
| **Rank Query Latency** | P50 < 10ms, P99 < 50ms | Measured at API gateway response | Alert at P99 > 30ms; page at P99 > 100ms |
| **Score Propagation** | P99 < 500ms from submission to rankable | Timestamp diff: ingestion → sorted set write | Investigate pipeline backlog; scale ingestion workers |
| **Read Availability** | 99.99% monthly | Successful rank queries / total queries | Failover to stale replica; serve cached response |
| **Write Availability** | 99.95% monthly | Accepted score submissions / total submissions | Queue submissions; return 202 Accepted with async processing |
| **Rank Accuracy** | ±0.1% for cross-shard queries | Periodic full reconciliation vs. exact count | Trigger shard rebalance; increase reconciliation frequency |
| **Reset Completion** | < 30 seconds for atomic rotation | Time from reset trigger to new leaderboard active | Pre-warm replacement; reduce shard count per rotation batch |
| **Notification Latency** | P99 < 2s from score update to client push | End-to-end from ZADD to WebSocket frame delivery | Scale notification fan-out workers |
| **Snapshot Freshness** | < 5 minutes for hourly snapshots | Time from snapshot trigger to completion | Parallelize snapshot capture across shards |

---

## Key Constraints & Assumptions

### Constraints

1. **Memory bound**: In-memory sorted sets are limited by available RAM; a single instance cannot exceed ~50M entries before GC pressure and memory fragmentation degrade performance
2. **Single-writer per key**: Sorted set operations are atomic within a single instance but require coordination for cross-instance consistency
3. **Network partition**: During network splits, ranking shards may diverge; the system favors availability (serving possibly stale ranks) over consistency (blocking queries)
4. **Anti-cheat latency budget**: Score validation must complete within the 500ms propagation SLO; complex replay verification is async and may retroactively adjust ranks
5. **Replication lag**: Read replicas may lag the primary by 10–100ms; queries served from replicas may show slightly stale ranks

### Assumptions

1. Game servers are the source of truth for scores (server-authoritative model); client-reported scores are never trusted directly
2. Score updates are idempotent when using absolute score mode (ZADD with the same player ID overwrites)
3. Players primarily care about their relative position (top 5%, rank among friends) rather than exact global rank
4. Leaderboard popularity follows a power law: 1% of leaderboards receive 80% of queries
5. Seasonal resets are scheduled (not ad-hoc) and can be pre-planned with warm-up periods
6. Friend lists are managed by a separate social service and cached locally by the leaderboard system

---

## Envelope Math: Can One Instance Handle It?

```
Single sorted set instance capacity:
  Max entries: ~50M (before memory/performance degradation)
  ZADD throughput: ~100,000 ops/sec
  ZRANK throughput: ~200,000 ops/sec
  ZREVRANGE (top-100) throughput: ~500,000 ops/sec

Our requirements:
  Max entries per board: 100M → Need 2+ shards minimum
  Write throughput: 50K/sec → 1 instance handles this
  Read throughput: 200K/sec → 1 primary + 2 replicas handles this

Conclusion:
  For a SINGLE leaderboard with 100M entries:
    Minimum 2 shards (50M each) for capacity
    3 read replicas per shard for query throughput
    Total: 2 primary + 6 replicas = 8 instances

  For the ENTIRE platform (100K leaderboards):
    Most leaderboards are small (< 100K entries) → co-locate on shared instances
    Top 100 leaderboards (> 1M entries) → dedicated instances
    Top 10 leaderboards (> 10M entries) → multi-shard with replicas
    Estimated cluster: 50–200 instances total
```

---

*Previous: [Index](./00-index.md) | Next: [High-Level Design →](./02-high-level-design.md)*
