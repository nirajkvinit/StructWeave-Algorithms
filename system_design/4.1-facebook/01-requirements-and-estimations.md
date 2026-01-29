# Requirements and Capacity Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### P0 - Must Have (Core Features)

| Feature | Description | Key Considerations |
|---------|-------------|-------------------|
| **News Feed** | Personalized content stream for each user | ML ranking, real-time updates, diversity |
| **Post Creation** | Create text, photo, video, link posts | Media upload, audience selection, tagging |
| **Social Graph** | Friend/follow relationships | Bidirectional (friends), unidirectional (follow) |
| **Interactions** | Like, comment, share on posts | Real-time counts, notification triggers |
| **Notifications** | Real-time alerts for activity | Push, in-app, email; batching logic |
| **Graph API** | Developer access to user data | OAuth2, rate limiting, permissions |
| **Privacy Controls** | Audience selection per post | Public, Friends, Custom lists |
| **Search** | Find people, pages, groups, posts | Graph search, content search |

### P1 - Important (Enhanced Features)

| Feature | Description | Key Considerations |
|---------|-------------|-------------------|
| **Stories** | Ephemeral 24-hour content | Auto-expiry, sequential viewing |
| **Groups** | Community spaces with moderation | Membership, admin controls, feed integration |
| **Pages** | Business/creator profiles | Followers (not friends), analytics |
| **Events** | Event creation and RSVPs | Calendar integration, reminders |
| **Reactions** | Beyond like (love, haha, wow, sad, angry) | Aggregation, ranking signal |
| **Tagging** | Mention users in posts/comments | Notification, privacy checks |
| **Check-ins** | Location-based posts | Geo-tagging, place database |

### P2 - Nice to Have

| Feature | Description |
|---------|-------------|
| **Memories** | "On This Day" historical content surfacing |
| **Watch Party** | Synchronized video viewing |
| **Marketplace** | Buy/sell within platform |
| **Gaming** | Instant games integration |
| **Dating** | Separate dating profile and matching |

### Out of Scope

| Feature | Reason |
|---------|--------|
| **Messenger** | Separate system with distinct architecture |
| **Ads Platform** | Separate auction and targeting system |
| **Instagram/WhatsApp** | Separate apps with different architectures |
| **Payment Processing** | Dedicated financial system |
| **Live Streaming** | Specialized real-time video infrastructure |
| **VR/Metaverse** | Distinct platform requirements |

---

## Non-Functional Requirements

### Latency Requirements

| Operation | Target | p50 | p99 | p99.9 |
|-----------|--------|-----|-----|-------|
| Feed Load | <100ms | 30ms | 100ms | 200ms |
| Post Creation | <500ms | 100ms | 500ms | 1s |
| Like/Comment | <200ms | 50ms | 200ms | 500ms |
| Graph API Read | <100ms | 30ms | 100ms | 300ms |
| Search | <300ms | 100ms | 300ms | 500ms |
| Notification Delivery | <5s | 500ms | 3s | 5s |

### Availability Requirements

| Service | Target | Allowed Downtime/Year |
|---------|--------|----------------------|
| Feed Service | 99.99% | 52.6 minutes |
| Post Service | 99.99% | 52.6 minutes |
| Graph API | 99.9% | 8.76 hours |
| Notification Service | 99.9% | 8.76 hours |

### Consistency Requirements

| Data Type | Consistency Model | Rationale |
|-----------|------------------|-----------|
| User Profile | Strong (within shard) | Critical user data |
| Friend List | Strong (within shard) | Privacy boundary |
| Post Content | Strong (within shard) | Author's source of truth |
| Feed Cache | Eventual | Freshness vs latency trade-off |
| Like/Comment Counts | Eventual | High write volume, approximate OK |
| Cross-Region Data | Eventual | Latency requirements |

### Durability Requirements

| Data Type | Durability | Backup Strategy |
|-----------|------------|-----------------|
| User Data | 99.999999999% (11 nines) | Multi-region replication |
| Posts | 99.999999% (8 nines) | Cross-region, point-in-time recovery |
| Media | 99.999999% (8 nines) | Blob storage with erasure coding |
| Feed Cache | Best effort | Regenerable from source data |

---

## Capacity Estimations

### User and Traffic Assumptions

| Metric | Value | Source/Rationale |
|--------|-------|------------------|
| Daily Active Users (DAU) | 2 billion (Facebook only) | Conservative estimate |
| Monthly Active Users (MAU) | 3 billion | Industry data |
| Average Feed Refreshes/Day | 10 per user | Mobile + web usage |
| Posts Created/Day | 20% of DAU post, avg 2 posts | ~800M posts/day |
| Average Friends per User | 500 | Platform average |
| Average Followers (Pages) | 10,000 (median) | Highly variable |
| Celebrity Threshold | 10,000 followers | Hot user cutoff |

### Traffic Calculations

#### Read Operations (Feed Focused)

```
Feed Reads:
  = DAU × Feed Refreshes/Day
  = 2B × 10
  = 20 billion reads/day
  = 20B / 86,400 seconds
  = 231,481 QPS (average)

Peak QPS (3× average):
  = 231,481 × 3
  ≈ 700,000 QPS

TAO Read Amplification:
  = 521 cache reads per feed request (from Meta engineering)
  = 700K × 521
  = 364 million cache operations/second at peak
```

#### Write Operations

```
Post Creation:
  = DAU × Posting Rate × Posts per Poster
  = 2B × 0.2 × 2
  = 800 million posts/day
  = 800M / 86,400
  ≈ 9,260 QPS (average)

Likes:
  = Assuming 50 likes per post on average
  = 800M posts × 50 likes
  = 40 billion likes/day
  = 463,000 QPS (average)

Comments:
  = Assuming 5 comments per post on average
  = 800M × 5
  = 4 billion comments/day
  = 46,300 QPS (average)

Shares:
  = Assuming 2% of posts are shared
  = 800M × 0.02
  = 16 million shares/day
  = 185 QPS (average)
```

#### Fan-out Calculations

```
Regular User Post Fan-out (Push):
  = Posts by regular users × Average friends
  = 800M × 0.95 × 500 (95% are regular users)
  = 380 billion feed updates/day
  = 4.4 million writes/second to feed caches

Celebrity Post Fan-out (Pull):
  = Avoided by pull-based approach
  = 800M × 0.05 posts by celebrities
  = 40M celebrity posts/day (handled at read time)
```

### Storage Calculations

#### Post Storage

```
Average Post Size:
  - Post ID: 8 bytes
  - Author ID: 8 bytes
  - Content (text): 500 bytes average
  - Metadata (timestamps, privacy): 100 bytes
  - Engagement counts: 50 bytes
  = ~666 bytes per post (excluding media)

Daily Post Storage:
  = 800M posts × 666 bytes
  = 533 GB/day (metadata only)

Annual Post Storage:
  = 533 GB × 365
  ≈ 195 TB/year

5-Year Post Storage:
  ≈ 1 PB (metadata only)
```

#### Social Graph Storage

```
Friendship Associations:
  = Users × Average Friends / 2 (bidirectional)
  = 3B × 500 / 2
  = 750 billion friendships

Storage per Association:
  - id1: 8 bytes
  - atype: 2 bytes
  - id2: 8 bytes
  - timestamp: 4 bytes
  - metadata: 10 bytes
  = 32 bytes per association

Total Friendship Storage:
  = 750B × 32 bytes
  = 24 TB

All Associations (including likes, follows, etc.):
  ≈ 10× friendships
  = 240 TB
```

#### User Object Storage

```
User Objects:
  = 3 billion users × 2 KB per user
  = 6 TB

All Objects (users, posts, comments, pages, groups):
  ≈ 100 billion objects × 1 KB average
  = 100 TB
```

#### Media Storage (Separate System)

```
Photos/Videos per Day:
  = 500M media uploads/day (estimate)
  = Average 2 MB per media item
  = 1 PB/day raw

With Compression and Multiple Resolutions:
  ≈ 2-3 PB/day stored
```

### Cache Sizing

#### Feed Cache

```
Active Users Feed Cache:
  = DAU × Feed Size × Entries
  = 2B × 200 posts × 50 bytes per entry
  = 20 TB for feed pointers

Hot User Feed Cache (top 10% active):
  = 200M × 200 × 50 bytes
  = 2 TB (hot tier)
```

#### TAO Cache

```
Working Set (objects accessed in 24h):
  = Estimate 10% of all objects
  = 10B objects × 1 KB
  = 10 TB

Association Cache:
  = Hot associations (friendships, recent likes)
  = 50 billion × 32 bytes
  = 1.6 TB

Total TAO Cache:
  ≈ 12-15 TB per region
  × Multiple regions
  = 50-100 TB globally
```

### Bandwidth Calculations

```
Incoming Traffic (writes):
  = Posts + Comments + Likes + API calls
  = (9K × 1KB) + (46K × 200B) + (463K × 50B) + (100K × 500B)
  = 9 MB/s + 9.2 MB/s + 23 MB/s + 50 MB/s
  ≈ 91 MB/s average

Outgoing Traffic (reads):
  = Feed responses + API responses
  = 700K × 50 KB per feed
  = 35 GB/s at peak

Media Traffic (separate):
  = Dominates bandwidth, handled by CDN
  ≈ 100+ GB/s globally
```

---

## Capacity Summary Table

| Metric | Average | Peak | Calculation |
|--------|---------|------|-------------|
| **Feed Read QPS** | 231K | 700K | 2B DAU × 10 refreshes |
| **Post Write QPS** | 9.3K | 28K | 800M posts/day |
| **Like Write QPS** | 463K | 1.4M | 40B likes/day |
| **Comment Write QPS** | 46K | 140K | 4B comments/day |
| **TAO Cache Ops/sec** | 120M | 364M | 521× read amplification |
| **Feed Cache Writes/sec** | 1.5M | 4.4M | Fan-out from posts |
| **Post Storage/Year** | 195 TB | - | 800M × 666B × 365 |
| **Social Graph Storage** | 240 TB | - | All associations |
| **TAO Cache Size** | 50-100 TB | - | Global working set |
| **Feed Cache Size** | 20 TB | - | All users' feeds |

---

## Service Level Objectives (SLOs)

### Feed Service SLO

| Metric | Target | Error Budget (30 days) |
|--------|--------|----------------------|
| Availability | 99.99% | 4.32 minutes downtime |
| Latency (p99) | <100ms | 1% of requests can exceed |
| Error Rate | <0.01% | 2M errors allowed per day |
| Feed Quality | >95% relevant | Measured by engagement |

### Post Service SLO

| Metric | Target | Error Budget |
|--------|--------|--------------|
| Availability | 99.99% | 4.32 minutes/month |
| Create Latency (p99) | <500ms | 1% can exceed |
| Durability | 99.9999% | 800 posts lost/day max |

### Graph API SLO

| Metric | Target | Notes |
|--------|--------|-------|
| Availability | 99.9% | Lower than internal services |
| Latency (p99) | <200ms | Includes auth overhead |
| Rate Limit Accuracy | 99% | False positives acceptable |
| Error Rate | <0.1% | Clear error messages |

---

## Traffic Patterns

### Daily Pattern

```
                    Feed Traffic Pattern (UTC)

    QPS (K)
    800 │                              ╭──╮
    700 │                           ╭──╯  ╰──╮
    600 │                        ╭──╯        ╰──╮
    500 │     ╭──╮            ╭──╯              ╰──╮
    400 │  ╭──╯  ╰──╮      ╭──╯                    ╰──╮
    300 │──╯        ╰──────╯                          ╰──
    200 │
    100 │
      0 └───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───
          0   2   4   6   8  10  12  14  16  18  20  22
                            Hour (UTC)

    Peak: 18:00-22:00 local time (varies by timezone)
    Trough: 02:00-06:00 local time
    Peak/Average Ratio: ~3×
```

### Special Events

| Event Type | Traffic Multiplier | Example |
|------------|-------------------|---------|
| Major Holidays | 2-3× | New Year's Eve |
| Breaking News | 5-10× spike | Major world events |
| Sports Events | 3-5× | Super Bowl, World Cup |
| Election Results | 5-10× | US Presidential Election |
| Platform Features | 1.5-2× | New feature launches |

### Geographic Distribution

| Region | % of Traffic | Peak Hours (Local) |
|--------|--------------|-------------------|
| North America | 25% | 18:00-22:00 EST |
| Europe | 20% | 19:00-23:00 CET |
| Asia Pacific | 35% | 19:00-23:00 local |
| Latin America | 12% | 20:00-24:00 local |
| Rest of World | 8% | Varies |

---

## Constraints and Assumptions

### Technical Constraints

| Constraint | Value | Impact |
|------------|-------|--------|
| Single Request Timeout | 30 seconds | Long-tail handling |
| Max Feed Size | 5,000 posts | Pagination required |
| Max Friends | 5,000 | Graph traversal limits |
| Max Post Size | 63,206 characters | Storage planning |
| Max Photo Size | 15 MB | Upload handling |
| Max Video Size | 4 GB | Upload chunking |

### Business Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| API Rate Limit | 200 calls/user/hour | Prevent abuse |
| Data Retention | Indefinite (user choice) | User expectation |
| Privacy Default | Friends only | Regulatory compliance |
| Content Moderation SLA | 24 hours | Policy enforcement |

### Assumptions

1. **Read-Heavy Workload**: 99:1 read-to-write ratio for feed
2. **Power Law Distribution**: 5% of users generate 80% of content
3. **Celebrity Concentration**: 0.1% of users have >10K followers
4. **Geographic Spread**: Users distributed globally across timezones
5. **Mobile-First**: 90%+ traffic from mobile apps
6. **Network Variability**: Must handle 3G to 5G connections

---

## Cost Estimation

### Infrastructure Cost Breakdown (Monthly)

| Component | Estimated Cost | Notes |
|-----------|---------------|-------|
| Compute (Services) | $15M | Thousands of servers |
| TAO Cache (Memory) | $8M | 50-100 TB memory |
| MySQL Storage | $5M | 100K+ shards |
| Blob Storage (Media) | $20M | Petabytes |
| CDN (Egress) | $30M | Massive media delivery |
| Network (Internal) | $5M | Cross-region traffic |
| ML Inference (GPU) | $25M | Ranking, moderation |
| **Total** | **~$108M/month** | Order of magnitude |

### Cost Per User

```
Monthly Cost per DAU:
  = $108M / 2B DAU
  = $0.054 per user per month
  = $0.65 per user per year

Cost per Feed Load:
  = $108M / (2B × 10 × 30)
  = $0.00018 per feed load
```

---

*Next: [High-Level Design →](./02-high-level-design.md)*
