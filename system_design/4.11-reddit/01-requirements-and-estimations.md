# Reddit: Requirements and Estimations

[← Back to Index](./00-index.md) | [Next: High-Level Design →](./02-high-level-design.md)

---

## Table of Contents

1. [Functional Requirements](#functional-requirements)
2. [Non-Functional Requirements](#non-functional-requirements)
3. [Capacity Estimations](#capacity-estimations)
4. [SLOs and SLAs](#slos-and-slas)
5. [Traffic Patterns](#traffic-patterns)
6. [Storage Calculations](#storage-calculations)

---

## Functional Requirements

### P0 - Must Have (Core Features)

| Feature | Description | Key Considerations |
|---------|-------------|-------------------|
| **Post Creation** | Text posts, link posts, image/video posts | Media processing, subreddit rules validation |
| **Voting System** | Upvote/downvote on posts and comments | Hot algorithm, manipulation prevention |
| **Comment Threading** | Hierarchical nested comments | Tree construction, "load more" pagination |
| **Subreddit Management** | Create, join, browse communities | Isolation, moderation tools |
| **Content Feed** | Home, Popular, All, subreddit-specific | Multiple ranking algorithms |
| **Search** | Posts, comments, subreddits, users | Full-text, relevance ranking |
| **User Accounts** | Registration, authentication, profiles | Karma tracking, preferences |
| **Moderation Tools** | Remove, ban, AutoModerator, reports | Per-subreddit rules |

### P1 - Important Features

| Feature | Description | Key Considerations |
|---------|-------------|-------------------|
| **Awards/Gilding** | Gold, Silver, community awards | Virtual currency, inventory |
| **Karma Tracking** | Post karma, comment karma, awardee karma | Aggregation, display |
| **User Profiles** | Overview, posts, comments, saved | Timeline views |
| **Cross-posting** | Share posts across subreddits | Deduplication, attribution |
| **Flairs** | User flairs, post flairs | Per-subreddit customization |
| **Saved Content** | Save posts/comments for later | Per-user storage |
| **Subscriptions** | Follow subreddits, users | Feed personalization |
| **Notifications** | Replies, mentions, trending | Real-time delivery |

### P2 - Nice to Have

| Feature | Description |
|---------|-------------|
| **Reddit Talk** | Audio rooms within subreddits |
| **Reddit Live** | Live threads for events |
| **Polls** | Community voting on questions |
| **Predictions** | Prediction tournaments |
| **Reddit Recap** | Annual user statistics |

### Out of Scope

| Feature | Reason |
|---------|--------|
| **Chat/Messaging** | Separate real-time system |
| **Reddit Premium Billing** | Payment/subscription system |
| **Ad Auction** | Advertising platform |
| **Mobile Push Infrastructure** | APNs/FCM integration layer |
| **Creator Monetization** | Tipping, subscriptions |

---

## Non-Functional Requirements

### Latency Requirements

| Operation | p50 Target | p99 Target | Rationale |
|-----------|------------|------------|-----------|
| Feed Load (Hot) | 200ms | 500ms | Precomputed, cache-friendly |
| Feed Load (New) | 150ms | 400ms | Simple timestamp sort |
| Vote Submission | 30ms | 150ms | Optimistic UI, async processing |
| Post Creation | 200ms | 500ms | Sync write, async indexing |
| Comment Load | 100ms | 300ms | Cached tree, lazy children |
| Comment Submit | 100ms | 300ms | Sync write, tree update |
| Search Query | 200ms | 600ms | Elasticsearch, relevance scoring |
| Subreddit Load | 100ms | 300ms | Metadata cached |

### Availability Requirements

| Service | Availability Target | Justification |
|---------|---------------------|---------------|
| Feed Service | 99.99% | Core user experience |
| Vote Service | 99.99% | Critical engagement |
| Post Service | 99.99% | Content creation |
| Comment Service | 99.99% | Core engagement |
| Search Service | 99.9% | Degraded mode acceptable |
| Moderation Service | 99.9% | Queue-based, async OK |
| Notification Service | 99.9% | Eventual delivery acceptable |

### Consistency Requirements

| Data Type | Consistency Model | Staleness Tolerance | Rationale |
|-----------|------------------|---------------------|-----------|
| Post Content | Strong | 0 | Source of truth |
| Comment Content | Strong | 0 | Source of truth |
| Vote Records | Strong (per-user) | 0 | Prevent double voting |
| Vote Counts | Eventual | 5-10 seconds | High write volume |
| Hot Rankings | Eventual | 30-60 seconds | Background computation |
| Karma Totals | Eventual | Minutes | Aggregated metric |
| Search Index | Eventual | 30-60 seconds | Async indexing |

### Durability Requirements

| Data Type | Durability | Backup Frequency |
|-----------|------------|------------------|
| Posts | 99.9999999% | Real-time replication |
| Comments | 99.9999999% | Real-time replication |
| Votes | 99.999% | Hourly snapshots |
| User Accounts | 99.9999999% | Real-time replication |
| Subreddit Config | 99.9999999% | Real-time replication |

---

## Capacity Estimations

### User and Traffic Assumptions

| Metric | Value | Source |
|--------|-------|--------|
| DAU | 116 million | Q3 2025 reports |
| MAU | 1+ billion | Official statistics |
| Concurrent Users (peak) | ~20 million | ~17% of DAU |
| Sessions per DAU | 3 | Average visits/day |
| Feed Loads per Session | 5 | Scrolling, subreddit browsing |
| Average Session Length | 8 minutes | Platform average |

### Read Traffic Calculations

```
FEED LOADS:

Feed loads/day = DAU × sessions × loads_per_session
               = 116M × 3 × 5
               = 1.74 billion feed loads/day

Average QPS = 1.74B / 86,400
            = 20,139 QPS

Peak QPS (3x average) = 60,417 QPS

COMMENT LOADS:

Posts viewed/day = DAU × posts_per_session
                 = 116M × 10
                 = 1.16 billion post views/day

Comment tree loads/day = post_views × comment_expansion_rate
                       = 1.16B × 0.6
                       = 696 million comment loads/day

Average QPS = 696M / 86,400
            = 8,055 QPS
```

### Write Traffic Calculations

```
VOTE PROCESSING:

Votes/day = 58 million (known metric)
Average Vote QPS = 58M / 86,400 = 671 QPS
Peak Vote QPS (3x) = 2,013 QPS

Write amplification per vote:
  - Vote record write: 1
  - Score update: 1
  - Hot ranking recalc: 1 (batched)
  - Cache invalidation: 1
Total: ~4 operations per vote

Effective write ops/second (peak) = 2,013 × 4 = 8,052 ops/s

COMMENT CREATION:

Comments/day = 7.5 million
Average QPS = 7.5M / 86,400 = 87 QPS
Peak QPS (3x) = 261 QPS

POST CREATION:

Posts/year = 430 million
Posts/day = 430M / 365 = 1.18 million
Average QPS = 1.18M / 86,400 = 14 QPS
Peak QPS (3x) = 42 QPS
```

### Vote Queue Sharding Calculation

```
SUBREDDIT-BASED QUEUE PARTITIONING:

Total active subreddits: ~100,000
Queue partitions (N): 100

Votes per partition (average) = 58M / 100 = 580,000 votes/day/partition
Peak per partition = 1,740 QPS × 100 partitions = 17.4 QPS/partition

Hot subreddit skew factor: 10x
Hot partition peak = 174 QPS (manageable per worker)

Benefits:
- r/funny votes isolated from r/programming
- Partition-level failure isolation
- Horizontal scaling per partition
```

### Capacity Summary Table

| Metric | Average | Peak | Notes |
|--------|---------|------|-------|
| Feed Load QPS | 20,000 | 60,000 | Hot/New/Rising sorts |
| Comment Load QPS | 8,000 | 24,000 | Tree with pagination |
| Vote QPS | 670 | 2,000 | Upvotes + downvotes |
| Comment Write QPS | 87 | 260 | New comments |
| Post Write QPS | 14 | 42 | New posts |
| Search QPS | 3,000 | 9,000 | Full-text queries |

---

## SLOs and SLAs

### Service Level Objectives

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| Availability (Feed) | 99.99% | Monthly |
| Availability (Vote) | 99.99% | Monthly |
| Feed Latency (p99) | <500ms | 5-minute rolling |
| Vote Latency (p99) | <150ms | 5-minute rolling |
| Comment Load (p99) | <300ms | 5-minute rolling |
| Vote Score Freshness | <30 seconds | 99th percentile |
| Error Rate (5xx) | <0.1% | Hourly |
| Search Latency (p99) | <600ms | 5-minute rolling |

### SLO Budget Calculation

```
MONTHLY AVAILABILITY BUDGET:

99.99% availability = 0.01% downtime
Monthly minutes = 30 × 24 × 60 = 43,200 minutes
Allowed downtime = 43,200 × 0.0001 = 4.32 minutes/month

99.9% availability = 0.1% downtime
Allowed downtime = 43,200 × 0.001 = 43.2 minutes/month

DISTRIBUTION:
- Planned maintenance: 2 minutes (rolling deploys)
- Incident budget: 2.32 minutes
- Safety margin: 0 minutes
```

### Critical SLA Contracts

| Service | External SLA | Internal Target | Penalty Threshold |
|---------|-------------|-----------------|-------------------|
| Feed API | 99.9% | 99.99% | <99.5% |
| Vote API | 99.9% | 99.99% | <99.5% |
| Comment API | 99.9% | 99.99% | <99.5% |
| Search API | 99.5% | 99.9% | <99% |

---

## Traffic Patterns

### Daily Traffic Profile

```
TYPICAL DAILY PATTERN (US-CENTRIC):

    Traffic
    ▲
100%│                    ████████
    │                ████        ████
 75%│            ████                ████
    │        ████                        ████
 50%│    ████                                ████
    │████                                        ████
 25%│
    │
    └────────────────────────────────────────────────▶ Time
      00   04   08   12   16   20   24   (PST)
           │    │         │    │
           │    │         │    └─ Evening peak (7-10 PM)
           │    │         └────── Afternoon steady
           │    └──────────────── Work hours browsing
           └───────────────────── Night trough

Peak hours: 7-10 PM PST (evening browsing)
Trough: 3-6 AM PST
Peak/Trough ratio: 3-4x
```

### Event-Driven Traffic Spikes

| Event Type | Traffic Multiplier | Duration | Example |
|------------|-------------------|----------|---------|
| **AMA (Celebrity)** | 10-50x on subreddit | 2-4 hours | Obama AMA (2012) |
| **Breaking News** | 5-20x site-wide | 6-24 hours | Major news events |
| **Meme Viral** | 5-10x on subreddit | 12-48 hours | r/wallstreetbets GME |
| **Sports Events** | 3-5x on game threads | 3-4 hours | Super Bowl, World Cup |
| **Reddit Down** | N/A (failure) | Variable | Cascading failures |

### Traffic Spike Handling

```
SPIKE MITIGATION STRATEGIES:

1. HOT SUBREDDIT ISOLATION
   - Subreddit-sharded vote queues
   - Dedicated cache partitions
   - Auto-scaling per subreddit

2. PRECOMPUTED HOT LISTS
   - Top N posts materialized
   - Background refresh (30-60s)
   - Serve stale on spike

3. GRACEFUL DEGRADATION
   - Disable real-time vote counts
   - Show cached comment trees
   - Queue new content

4. RATE LIMITING
   - Per-user vote velocity limits
   - Per-subreddit post limits
   - API tier throttling
```

---

## Storage Calculations

### Post Storage

```
POST RECORD SIZE (ThingDB model):

Thing Table entry:
  - id: 12 bytes (t3_xxxxxx)
  - thing_type: 2 bytes
  - ups: 4 bytes
  - downs: 4 bytes
  - created_utc: 8 bytes
  - flags: 4 bytes
  Total: ~35 bytes

Data Table entries (average 15 keys):
  - thing_id: 12 bytes
  - key: 20 bytes average
  - value: 100 bytes average
  Per entry: ~132 bytes
  Total: 15 × 132 = 1,980 bytes

Average post size: ~2 KB (without media)

ANNUAL STORAGE:

Posts/year = 430 million
Storage/year = 430M × 2 KB = 860 GB/year (posts only)

With replication (3x) = 2.58 TB/year
With indexes = 3.5 TB/year
```

### Comment Storage

```
COMMENT RECORD SIZE:

Thing Table entry: ~35 bytes
Data Table entries (average 10 keys):
  - body: 200 bytes average
  - parent_id: 12 bytes
  - link_id: 12 bytes
  - other metadata: 100 bytes
  Total: ~324 bytes

Average comment size: ~360 bytes

ANNUAL STORAGE:

Comments/day = 7.5 million
Comments/year = 7.5M × 365 = 2.74 billion
Storage/year = 2.74B × 360 bytes = 986 GB/year

With replication (3x) = 2.96 TB/year
With indexes = 4 TB/year
```

### Vote Storage

```
VOTE RECORD SIZE:

Vote table entry:
  - user_id: 12 bytes
  - thing_id: 12 bytes
  - direction: 1 byte
  - created_utc: 8 bytes
  Total: ~33 bytes

ANNUAL STORAGE:

Votes/day = 58 million
Votes/year = 58M × 365 = 21.2 billion
Storage/year = 21.2B × 33 bytes = 700 GB/year

With indexes = 1.4 TB/year
With replication = 4.2 TB/year
```

### Cache Requirements

```
REDIS CACHE SIZING:

Hot List Cache (per subreddit):
  - Subreddits with hot lists: 50,000
  - Posts per hot list: 100
  - Entry size: post_id + score = 20 bytes
  - Per subreddit: 2 KB
  - Total: 50,000 × 2 KB = 100 MB

User Feed Cache:
  - Active users with cached feeds: 10 million
  - Posts per feed: 200
  - Entry size: 20 bytes
  - Per user: 4 KB
  - Total: 10M × 4 KB = 40 GB

Comment Tree Cache:
  - Hot posts with cached trees: 100,000
  - Average tree size: 50 KB
  - Total: 100,000 × 50 KB = 5 GB

TOTAL REDIS: ~50 GB (with overhead)

MEMCACHED SIZING:

Object cache (posts, comments, users):
  - Cache hit target: 95%
  - Working set: 10% of total data
  - Estimated: 500 GB
```

### Storage Summary

| Data Type | Annual Growth | 5-Year Projection | Replication |
|-----------|---------------|-------------------|-------------|
| Posts | 860 GB | 4.3 TB | 3x |
| Comments | 986 GB | 4.9 TB | 3x |
| Votes | 700 GB | 3.5 TB | 3x |
| Media | 10 TB | 50 TB | 2x (CDN) |
| Search Index | 2 TB | 10 TB | 2x |
| **Total** | **~15 TB** | **~75 TB** | - |

---

## Cost Considerations

### Infrastructure Cost Drivers

| Component | Cost Driver | Optimization |
|-----------|-------------|--------------|
| Compute | Vote processing, feed generation | Batch processing, Go migration |
| Storage | Media, backups | CDN offload, compression |
| Bandwidth | Media delivery | CDN caching, adaptive bitrate |
| Cache | Redis, Memcached | Tiered eviction, hot-cold split |
| Database | PostgreSQL, Cassandra | Read replicas, sharding |

### Cost Optimization Strategies

```
1. GO MIGRATION
   - 50% reduction in P99 latency
   - Fewer instances needed for same throughput
   - Lower memory footprint

2. PRECOMPUTATION
   - Hot lists computed once, served many times
   - Reduces per-request CPU
   - Cache-friendly patterns

3. SUBREDDIT SHARDING
   - Efficient resource allocation
   - Scale hot subreddits independently
   - Avoid over-provisioning cold subreddits

4. MEDIA CDN
   - Offload 95%+ of bandwidth
   - Edge caching reduces origin load
   - Pay-per-use model
```

---

## Next Steps

- [High-Level Design →](./02-high-level-design.md)
