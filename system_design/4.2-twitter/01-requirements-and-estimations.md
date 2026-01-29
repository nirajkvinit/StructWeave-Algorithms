# Requirements and Estimations

## Table of Contents

1. [Functional Requirements](#functional-requirements)
2. [Non-Functional Requirements](#non-functional-requirements)
3. [Capacity Estimations](#capacity-estimations)
4. [SLOs and SLAs](#slos-and-slas)
5. [Traffic Patterns](#traffic-patterns)
6. [Cost Considerations](#cost-considerations)

---

## Functional Requirements

### P0 - Must Have (Core Features)

| Feature | Description | Key Considerations |
|---------|-------------|-------------------|
| **Home Timeline (For You)** | Personalized tweet stream | ML ranking, hybrid fan-out, real-time updates |
| **Tweet Creation** | 280-character tweets with media | Media upload, thread support, edit history |
| **Retweet / Quote Tweet** | Content amplification | Write amplification handling, deduplication |
| **Follow / Unfollow** | Unidirectional relationships | Asymmetric graph, instant timeline update |
| **Search** | Real-time tweet and user search | <1 second indexing, relevance ranking |
| **Trends** | Real-time trending topics | Predictive detection, geographic filtering |
| **Notifications** | Mentions, likes, retweets, follows | Real-time push, batching for high-volume |
| **User Profile** | Bio, tweets, followers, following | Profile page caching, tweet history |

### P1 - Important

| Feature | Description |
|---------|-------------|
| **Lists** | Curated collections of accounts |
| **Bookmarks** | Private saved tweets |
| **Spaces** | Live audio conversations |
| **Communities** | Topic-based discussion groups |
| **Premium / Verification** | Blue checkmark, enhanced features |
| **Polls** | Interactive tweet polls |
| **Scheduled Tweets** | Post tweets at future time |

### P2 - Nice to Have

| Feature | Description |
|---------|-------------|
| **Analytics** | Tweet performance metrics |
| **Moments** | Curated story collections |
| **Fleet-style Stories** | Ephemeral content (deprecated) |
| **Voice Tweets** | Audio-only tweets |

### Out of Scope

| Feature | Reason | Where It Lives |
|---------|--------|----------------|
| Direct Messages | Separate encryption system | DM Service (E2E encrypted) |
| Ads Platform | Dedicated auction system | Ads Infrastructure |
| Media Processing | Specialized CDN infrastructure | Media Service |
| Analytics Dashboard | Separate data warehouse | Analytics Platform |
| Moderation Tools | Trust & Safety system | Content Moderation Service |

---

## Non-Functional Requirements

### Latency Requirements

| Operation | p50 Target | p99 Target | Max Acceptable |
|-----------|------------|------------|----------------|
| Timeline Load | 300ms | 1.5s | 3s |
| Tweet Creation | 100ms | 500ms | 1s |
| Search Query | 100ms | 500ms | 1s |
| Search Indexing | - | <1s | 2s |
| Like/Retweet | 50ms | 200ms | 500ms |
| Follow/Unfollow | 100ms | 300ms | 1s |
| Trends Update | - | <30s detection | 60s |
| Notification Push | - | <5s | 30s |

### Availability Requirements

| Service | Target | Allowed Downtime/Year | Justification |
|---------|--------|----------------------|---------------|
| Timeline Service | 99.99% | 52.6 minutes | Core user experience |
| Tweet Service | 99.99% | 52.6 minutes | Content creation critical |
| Search Service | 99.9% | 8.76 hours | Slightly degraded OK |
| Trends Service | 99.9% | 8.76 hours | Can serve stale trends |
| Notification Service | 99.9% | 8.76 hours | Eventual delivery acceptable |

### Consistency Requirements

| Data Type | Consistency Model | Rationale |
|-----------|------------------|-----------|
| Tweet Content | Strong (within shard) | Author's source of truth |
| Timeline Cache | Eventual (seconds) | Freshness vs latency trade-off |
| Follow Graph | Strong (within shard) | Critical for fan-out correctness |
| Engagement Counts | Eventual (minutes) | High write volume, approx OK |
| Search Index | Eventual (<1 second) | Real-time requirement |
| User Profile | Strong | User expects immediate updates |

### Durability Requirements

| Data Type | Durability | Replication |
|-----------|------------|-------------|
| Tweets | 99.999999999% (11 9s) | 3 replicas, cross-region |
| User Data | 99.999999999% (11 9s) | 3 replicas, cross-region |
| Timeline Cache | Best effort | Single region, regenerable |
| Engagement Counts | 99.99% | 2 replicas, async |
| Media Files | 99.999999999% (11 9s) | Blob storage, erasure coding |

---

## Capacity Estimations

### User and Traffic Assumptions

| Metric | Value | Source/Rationale |
|--------|-------|------------------|
| DAU | 250 million | Industry estimates (2024-2025) |
| MAU | 450 million | ~55% DAU/MAU ratio |
| Tweets per day | 500 million | Engineering blog |
| Average followers per user | 700 | Platform average |
| Median followers per user | 100 | Power law distribution |
| Celebrity threshold | 100,000 | Higher than Facebook due to asymmetry |
| Celebrities (>100K followers) | ~50,000 accounts | 0.02% of users |
| Premium subscribers | 10 million | Paid tier users |
| Average tweet size | 140 bytes | ~100 characters average |
| Average media attachment | 30% of tweets | Images, videos |
| Timeline loads per user/day | 20 | Active session count |
| Likes per tweet (average) | 10 | Engagement rate |
| Retweets per tweet (average) | 2 | Lower than likes |

### Traffic Calculations

#### Timeline Reads

```
Timeline Read QPS:
  = DAU × Timeline loads per day / Seconds per day
  = 250,000,000 × 20 / 86,400
  = 5,000,000,000 / 86,400
  = 57,870 QPS (average)

Peak Timeline QPS (3x average):
  = 57,870 × 3
  ≈ 175,000 QPS (peak)

Major Event Peak (10x average):
  = 57,870 × 10
  ≈ 580,000 QPS (breaking news, elections)
```

#### Tweet Writes

```
Tweet Write QPS:
  = Tweets per day / Seconds per day
  = 500,000,000 / 86,400
  = 5,787 QPS (average)

Peak Tweet QPS (3x average):
  = 5,787 × 3
  ≈ 17,400 QPS (peak)
```

#### Engagement Writes

```
Like Write QPS:
  = Tweets per day × Likes per tweet / Seconds per day
  = 500,000,000 × 10 / 86,400
  = 57,870 QPS (average)

Retweet Write QPS:
  = Tweets per day × Retweets per tweet / Seconds per day
  = 500,000,000 × 2 / 86,400
  = 11,574 QPS (average)

Total Engagement QPS:
  ≈ 70,000 QPS (average)
  ≈ 210,000 QPS (peak)
```

### Fan-out Calculations (Critical for Twitter)

```
Regular User Tweets (Push Model):
  Tweets from users with <100K followers:
  = 500M tweets × 95% (non-celebrity tweets)
  = 475 million tweets/day

  Fan-out writes for regular tweets:
  = 475M × 700 (average followers)
  = 332.5 billion feed cache writes/day
  = 3,850,000 writes/second (average)

Celebrity Tweets (Pull Model):
  Tweets from users with >=100K followers:
  = 500M × 5% (celebrity tweets)
  = 25 million tweets/day

  These are NOT fanned out - pulled at read time
  Saves: 25M × 1M (avg celebrity followers) = 25 trillion writes/day avoided

Comparison with Naive Fan-out:
  If ALL tweets used push model:
  = 500M tweets × 700 avg followers (including celebrities)
  = 350 billion writes/day

  With celebrity exclusion, we save ~5% of writes
  But those 5% would be 25 TRILLION writes (extreme amplification)
```

### Storage Calculations

#### Tweet Storage

```
Tweet Object Size:
  - Tweet ID: 8 bytes (Snowflake)
  - Author ID: 8 bytes
  - Content: 280 chars × 4 bytes (UTF-8) = 1,120 bytes
  - Created timestamp: 8 bytes
  - Reply metadata: 24 bytes
  - Retweet metadata: 16 bytes
  - Engagement counters: 24 bytes
  - Flags and settings: 16 bytes
  - Total: ~1,224 bytes ≈ 1.4 KB per tweet

Daily Tweet Storage:
  = 500M tweets × 1.4 KB
  = 700 GB/day

Annual Tweet Storage:
  = 700 GB × 365
  = 255 TB/year (tweets only)

5-Year Tweet Storage:
  = 255 TB × 5
  = 1.275 PB
```

#### Media Storage

```
Media Assumptions:
  - 30% of tweets have media
  - Average image: 500 KB
  - Average video: 10 MB (10% of media tweets)

Daily Media Storage:
  Images = 500M × 30% × 90% × 500 KB = 67.5 TB/day
  Videos = 500M × 30% × 10% × 10 MB = 150 TB/day
  Total = 217.5 TB/day

Annual Media Storage:
  = 217.5 TB × 365
  ≈ 79 PB/year
```

#### User Data Storage

```
User Profile Size:
  - User ID: 8 bytes
  - Username: 15 bytes
  - Display name: 50 bytes
  - Bio: 160 bytes
  - Profile image URL: 200 bytes
  - Metadata: 200 bytes
  - Total: ~633 bytes ≈ 1 KB

Total User Storage:
  = 450M users × 1 KB
  = 450 GB (static, slow growth)
```

#### Follow Graph Storage

```
Follow Relationship Size:
  - Follower ID: 8 bytes
  - Followed ID: 8 bytes
  - Timestamp: 8 bytes
  - Flags: 4 bytes
  - Total: 28 bytes ≈ 32 bytes (aligned)

Total Follow Edges:
  = 450M users × 700 avg following
  = 315 billion edges

Follow Graph Storage:
  = 315B × 32 bytes
  = 10 TB
```

### Cache Sizing

```
Timeline Cache (Redis):
  Active users needing cache: 50M (20% of DAU)
  Timeline entries per user: 800 tweets
  Entry size: 64 bytes (tweet_id + score + metadata)

  Timeline Cache Size:
  = 50M × 800 × 64 bytes
  = 2.56 TB

Celebrity Tweet Index:
  Celebrities: 50,000 accounts
  Recent tweets per celebrity: 1,000
  Entry size: 64 bytes

  Celebrity Index Size:
  = 50K × 1,000 × 64 bytes
  = 3.2 GB (fits in memory)

User Session Cache:
  Active sessions: 100M
  Session size: 512 bytes

  Session Cache Size:
  = 100M × 512 bytes
  = 51.2 GB
```

### Summary Table

| Metric | Calculation | Result |
|--------|-------------|--------|
| Timeline Read QPS (avg) | 250M DAU × 20 loads / 86,400s | 58,000 |
| Timeline Read QPS (peak) | 58,000 × 3 | 175,000 |
| Tweet Write QPS (avg) | 500M / 86,400s | 5,800 |
| Fan-out Writes/sec | 475M tweets × 700 followers / 86,400s | 3.85M |
| Daily Tweet Storage | 500M × 1.4 KB | 700 GB |
| Annual Tweet Storage | 700 GB × 365 | 255 TB |
| Timeline Cache | 50M users × 800 × 64B | 2.56 TB |
| Follow Graph | 315B edges × 32B | 10 TB |

---

## SLOs and SLAs

### Internal SLOs

| Service | Metric | Target | Error Budget (monthly) |
|---------|--------|--------|------------------------|
| Home Mixer | Availability | 99.99% | 4.32 minutes |
| Home Mixer | Latency (p99) | <1.5s | 1% can exceed |
| Tweetypie | Availability | 99.99% | 4.32 minutes |
| Tweetypie | Write latency (p99) | <500ms | 1% can exceed |
| Search | Availability | 99.9% | 43.2 minutes |
| Search | Indexing latency | <1s | 99% indexed within 1s |
| Trends | Detection latency | <30s | 95% detected within 30s |

### External SLAs (API)

| Tier | Rate Limit | Availability SLA | Support |
|------|------------|------------------|---------|
| Free | 100 tweets/month read | 95% | Community |
| Basic ($100/mo) | 10K tweets/month | 99% | Email |
| Pro ($5,000/mo) | 1M tweets/month | 99.9% | Priority |
| Enterprise | Custom | 99.99% | Dedicated |

### SLO Dashboard Metrics

```
PRIMARY METRICS:
├── Timeline Success Rate: % of timeline requests returning 200
├── Timeline p99 Latency: 99th percentile response time
├── Tweet Creation Success: % of tweets successfully created
├── Search Indexing Lag: Time from tweet creation to searchability
├── Notification Delivery: % delivered within 5 seconds
└── Fan-out Queue Depth: Messages pending in fan-out queue

SECONDARY METRICS:
├── Cache Hit Rate: % of timeline requests served from cache
├── ML Inference Latency: Navi model prediction time
├── GraphJet Traversal Time: Out-of-network discovery latency
├── ElasticSearch Query Latency: Search execution time
└── Cross-region Replication Lag: Data sync delay
```

---

## Traffic Patterns

### Daily Traffic Distribution

```
                    Timeline QPS by Hour (UTC)
     |
200K |                                    ___
     |                                 __/   \__
175K |                              __/         \__
     |                           __/               \
150K |                        __/                   \__
     |                     __/                         \
125K |                  __/                             \__
     |               __/                                   \
100K |            __/                                       \__
     |         __/                                             \
 75K |      __/                                                 \__
     |   __/                                                       \
 50K |__/                                                           \__
     |________________________________________________________________
     0  2  4  6  8  10 12 14 16 18 20 22 24
                    Hour (UTC)

Peak hours: 14:00-20:00 UTC (US East afternoon + Europe evening)
Trough: 06:00-10:00 UTC (Night in Americas, morning in Asia)
Peak-to-trough ratio: 3x
```

### Event-Driven Spikes

| Event Type | Traffic Multiplier | Duration | Example |
|------------|-------------------|----------|---------|
| Breaking News | 10-50x | 1-4 hours | Major news events |
| Sports Events | 5-10x | 2-3 hours | Super Bowl, World Cup |
| Elections | 10-20x | 12-24 hours | Presidential elections |
| Celebrity Announcements | 5-10x | 1-2 hours | Major celebrity tweets |
| Product Launches | 3-5x | 1-2 hours | Apple events, game releases |
| Hashtag Campaigns | 2-5x | 4-24 hours | Trending movements |

### Geographic Distribution

| Region | % of Traffic | Peak Hours (Local) | Primary Data Center |
|--------|--------------|-------------------|---------------------|
| North America | 30% | 6 PM - 11 PM | US-East, US-West |
| Europe | 25% | 7 PM - 12 AM | EU-West |
| Asia Pacific | 25% | 8 PM - 1 AM | APAC (Japan, Singapore) |
| Latin America | 10% | 8 PM - 1 AM | US-East (closest) |
| Middle East/Africa | 10% | 7 PM - 12 AM | EU-West (closest) |

---

## Cost Considerations

### Infrastructure Cost Breakdown (Estimated Annual)

| Category | Component | Annual Cost | % of Total |
|----------|-----------|-------------|------------|
| **Compute** | API Servers | $50M | 15% |
| | ML Inference (GPU) | $80M | 24% |
| | Stream Processing | $30M | 9% |
| **Storage** | Tweet Storage | $20M | 6% |
| | Media Storage (CDN) | $100M | 30% |
| | Cache (Redis) | $15M | 5% |
| **Database** | MySQL Clusters | $25M | 8% |
| | ElasticSearch | $10M | 3% |
| **Network** | Bandwidth | $10M | 3% |
| | Cross-region | $5M | 2% |
| **Total** | | ~$345M | 100% |

### Cost Optimization Strategies

| Strategy | Savings | Trade-off |
|----------|---------|-----------|
| Celebrity pull model | 40% fan-out compute | Slightly higher read latency |
| Tiered ML ranking | 30% GPU costs | Light model less accurate |
| Cache hit optimization | 20% DB costs | Memory costs |
| Media CDN tiering | 25% storage costs | Slower access to old media |
| Reserved instances | 30% compute costs | Less flexibility |

### Cost Per User

```
Annual cost per DAU:
  = $345M / 250M DAU
  = $1.38 per DAU per year

Annual cost per MAU:
  = $345M / 450M MAU
  = $0.77 per MAU per year

Revenue requirement per user (at 20% margin):
  = $1.38 / 0.80
  = $1.73 ARPU needed to break even
```

---

## Capacity Planning Summary

### Year 1 vs Year 5 Projections

| Metric | Year 1 | Year 3 | Year 5 |
|--------|--------|--------|--------|
| DAU | 250M | 350M | 500M |
| Tweets/day | 500M | 750M | 1B |
| Timeline QPS (peak) | 175K | 300K | 500K |
| Tweet Storage | 255 TB | 765 TB | 1.3 PB |
| Media Storage | 79 PB | 237 PB | 395 PB |
| MySQL Shards | 100K | 150K | 250K |
| Redis Cache | 2.5 TB | 4 TB | 6 TB |

### Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| Timeline p99 > 2s | Sustained 5 min | Add Home Mixer capacity |
| Fan-out queue depth > 10M | Any time | Scale fan-out workers |
| Cache hit rate < 60% | Sustained 1 hour | Add Redis shards |
| Search indexing lag > 2s | Sustained 5 min | Scale ingestion service |
| MySQL CPU > 80% | Sustained 10 min | Add read replicas |
