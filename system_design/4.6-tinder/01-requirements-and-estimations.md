# Requirements & Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features (Must Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **User Registration** | Sign up via phone, email, or social login (Google, Apple, Facebook) | P0 |
| **Profile Creation** | Photos (up to 9), bio, job, education, interests | P0 |
| **Location Services** | Capture and update user's geographic location | P0 |
| **Discovery Preferences** | Set age range, distance radius, gender preferences | P0 |
| **Profile Discovery** | View recommended profiles as "cards" to swipe | P0 |
| **Swipe Actions** | Like (right swipe), Pass (left swipe), Super Like | P0 |
| **Match Detection** | Detect mutual likes and create matches | P0 |
| **Match Notifications** | Real-time notification when a match occurs | P0 |
| **Messaging** | 1:1 chat between matched users | P0 |
| **Unmatch/Block** | Remove matches, block users | P0 |

### Enhanced Features (Should Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Rewind** | Undo last swipe (premium feature) | P1 |
| **Boost** | Temporarily increase profile visibility | P1 |
| **Super Like** | Special like that notifies the recipient | P1 |
| **Passport** | Change location to anywhere in the world | P1 |
| **Read Receipts** | See when messages are read | P1 |
| **Photo Verification** | AI + selfie verification for authenticity | P1 |
| **Top Picks** | Curated daily recommendations | P1 |
| **Activity Status** | Show recently active users | P1 |

### Out of Scope

- Video calling (handled by third-party)
- Group chats
- Public feeds/posts
- Live streaming
- Marketplace/commerce
- Stories feature

---

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Swipe Response | <100ms | p99 latency |
| Profile Load | <500ms | Time to first photo |
| Match Notification | <2s | End-to-end from swipe to notification |
| Message Delivery | <500ms | Send to receive (online users) |
| Discovery Query | <100ms | Recommendation retrieval |
| Photo Upload | <5s | For standard quality photo |

### Availability & Reliability

| Metric | Target | Justification |
|--------|--------|---------------|
| System Availability | 99.9% | ~8.76 hours downtime/year acceptable |
| Match Service | 99.99% | Critical path - lost matches = user churn |
| Chat Service | 99.9% | Temporary message delays acceptable |
| Data Durability | 99.999999999% | 11 nines for user data |

### Scalability Targets

| Metric | Current | Target (2x growth) |
|--------|---------|-------------------|
| MAU | 75M | 150M |
| DAU | 26M | 52M |
| Peak Swipes/sec | 50,000 | 100,000 |
| Concurrent Users | 5M | 10M |
| Messages/day | 500M | 1B |

### Consistency Model

| Operation | Consistency | Justification |
|-----------|-------------|---------------|
| Profile Updates | Strong | User expects immediate reflection |
| Swipe Recording | Strong | Critical for match detection |
| Match Detection | Strong | Cannot lose matches |
| Recommendations | Eventual | Small staleness acceptable |
| Read Receipts | Eventual | Delay acceptable |
| Like/Match Counts | Eventual | Approximate counts acceptable |

---

## Capacity Estimations

### User & Activity Metrics

| Metric | Value | Calculation |
|--------|-------|-------------|
| MAU | 75,000,000 | Given |
| DAU | 26,250,000 | 75M × 0.35 (35% DAU/MAU ratio) |
| DAU/MAU Ratio | 35% | Industry benchmark for dating apps |
| Sessions/day/user | 4 | Average user opens app 4 times/day |
| Session Duration | 10 min | Average session length |
| Swipes/session | 15 | Average swipes per session |
| Daily Swipes | 1,575,000,000 | 26.25M × 4 × 15 ≈ 1.6B |

### Throughput Calculations

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Swipes/second (avg)** | 1.6B ÷ 86,400 | **18,518 swipes/sec** |
| **Swipes/second (peak)** | 18,518 × 3 (peak factor) | **55,555 swipes/sec** |
| Match Rate | ~1.5-2% of swipes | 1.6% assumed |
| **Matches/day** | 1.6B × 0.016 | **25.6M matches/day** |
| **Matches/second** | 25.6M ÷ 86,400 | **296 matches/sec** |
| Messages/match/day | 20 | Average for active conversations |
| Active Conversations | 100M | Rough estimate |
| **Messages/day** | 100M × 5 (messages exchanged) | **500M messages/day** |
| **Messages/second** | 500M ÷ 86,400 | **5,787 messages/sec** |

### Storage Calculations

#### User Profiles

| Component | Size | Calculation |
|-----------|------|-------------|
| Profile metadata | 5 KB | JSON: name, bio, job, education, interests |
| Per photo metadata | 0.5 KB | URL, dimensions, order |
| Photos per user | 6 (avg) | |
| **Total profile data** | 8 KB | 5 KB + (6 × 0.5 KB) |
| **Total for all users** | 600 GB | 75M × 8 KB |

#### Photos (Blob Storage)

| Component | Size | Calculation |
|-----------|------|-------------|
| Original photo | 2 MB | Average uploaded size |
| Thumbnails (3 sizes) | 500 KB | Various resolutions |
| **Per photo total** | 2.5 MB | Original + thumbnails |
| Photos per user | 6 | Average |
| **Per user photos** | 15 MB | 6 × 2.5 MB |
| **Total photo storage** | 1.125 PB | 75M × 15 MB |

#### Swipe Data

| Component | Size | Calculation |
|-----------|------|-------------|
| Swipe record | 100 bytes | user_id (16B), target_id (16B), action (1B), timestamp (8B), location (16B), metadata |
| Daily swipes | 160 GB | 1.6B × 100 bytes |
| Retention period | 90 days | For recommendations |
| **Swipe storage** | 14.4 TB | 160 GB × 90 days |

#### Match Data

| Component | Size | Calculation |
|-----------|------|-------------|
| Match record | 200 bytes | Both user IDs, timestamps, conversation_id, metadata |
| Historical matches | 30B+ | All-time matches |
| **Match storage** | 6 TB | 30B × 200 bytes |

#### Message Data

| Component | Size | Calculation |
|-----------|------|-------------|
| Message record | 500 bytes | Avg including metadata |
| Daily messages | 250 GB | 500M × 500 bytes |
| Retention | 1 year | Messages kept for active conversations |
| **Message storage** | 91 TB | 250 GB × 365 days |

### Total Storage Summary

| Category | Storage | Notes |
|----------|---------|-------|
| Profile Metadata | 600 GB | MongoDB |
| Photo Blobs | 1.125 PB | Object Storage + CDN |
| Swipe Data | 14.4 TB | MongoDB (90-day rolling) |
| Match Data | 6 TB | MongoDB |
| Messages | 91 TB | MongoDB (1-year retention) |
| Search Index | 1 TB | Elasticsearch (geosharded) |
| Cache (Redis) | 500 GB | Hot data + swipe states |
| **Total** | **~1.25 PB** | Dominated by photos |

### Bandwidth Calculations

| Traffic Type | Calculation | Bandwidth |
|--------------|-------------|-----------|
| Swipe requests | 55K × 1 KB | 55 MB/s |
| Profile responses | 10K × 50 KB (inc. photo URLs) | 500 MB/s |
| Photo downloads | 100K × 500 KB (avg thumbnail) | 50 GB/s |
| Messages | 6K × 1 KB | 6 MB/s |
| **Total (peak)** | Dominated by photos | **~50 GB/s** |

### Cache Sizing

| Cache Type | Calculation | Size |
|------------|-------------|------|
| User sessions | 5M concurrent × 2 KB | 10 GB |
| Swipe state (for matching) | 1B recent swipes × 50 bytes | 50 GB |
| Hot profiles | 10M × 10 KB | 100 GB |
| Recent recommendations | 26M × 50 profiles × 100 bytes | 130 GB |
| Match state | 100M active × 500 bytes | 50 GB |
| **Total Redis** | | **~350 GB** |

---

## SLOs / SLAs

### Service Level Objectives

| Service | Metric | Target | Measurement Window |
|---------|--------|--------|-------------------|
| **Discovery** | Availability | 99.9% | Monthly |
| | Latency (p99) | <100ms | Rolling 5 min |
| | Error rate | <0.1% | Rolling 5 min |
| **Swipe** | Availability | 99.99% | Monthly |
| | Latency (p99) | <100ms | Rolling 5 min |
| | Error rate | <0.01% | Rolling 5 min |
| **Match** | Availability | 99.99% | Monthly |
| | Detection latency | <2s | Per event |
| | False negatives | 0% | Critical |
| **Chat** | Availability | 99.9% | Monthly |
| | Message delivery (p99) | <500ms | Rolling 5 min |
| | Message loss | 0% | Per message |
| **Photos** | Availability | 99.9% | Monthly |
| | Load time (p95) | <1s | Rolling 5 min |
| | Cache hit rate | >95% | Rolling 1 hr |

### Error Budgets

| Service | Availability | Monthly Error Budget |
|---------|--------------|---------------------|
| Discovery | 99.9% | 43.8 minutes downtime |
| Swipe/Match | 99.99% | 4.38 minutes downtime |
| Chat | 99.9% | 43.8 minutes downtime |
| Overall | 99.9% | 43.8 minutes downtime |

---

## Geographic Distribution

### User Distribution by Region

| Region | % of Users | Estimated DAU | Peak Time (UTC) |
|--------|------------|---------------|-----------------|
| North America | 35% | 9.2M | 02:00-06:00 |
| Europe | 25% | 6.6M | 19:00-23:00 |
| Asia-Pacific | 20% | 5.3M | 12:00-16:00 |
| Latin America | 15% | 3.9M | 00:00-04:00 |
| Others | 5% | 1.3M | Various |

### Infrastructure Implications

- **Multi-region deployment** required (at least 3 major regions)
- **GeoDNS** for routing users to nearest region
- **Geosharding** aligns with user distribution
- Peak load rotates around the clock (follow-the-sun)
- Cross-region replication for disaster recovery

---

## Growth Projections

### 5-Year Forecast

| Year | MAU | DAU | Daily Swipes | Storage (Photos) |
|------|-----|-----|--------------|------------------|
| 2025 | 75M | 26M | 1.6B | 1.1 PB |
| 2026 | 85M | 30M | 1.8B | 1.4 PB |
| 2027 | 95M | 33M | 2.0B | 1.7 PB |
| 2028 | 105M | 37M | 2.2B | 2.1 PB |
| 2029 | 115M | 40M | 2.4B | 2.5 PB |

### Capacity Planning Implications

1. **Photo storage** is the dominant cost - optimize with:
   - Aggressive compression
   - Tiered storage (hot/warm/cold)
   - Photo expiration for inactive users

2. **Swipe throughput** scales linearly - plan for:
   - Horizontal Kafka scaling
   - More geoshards in dense regions

3. **Match detection** scales with swipe² - but:
   - Redis can handle with proper sharding
   - Most checks are cache hits (very fast)

---

## Cost Estimation Framework

### Infrastructure Cost Breakdown (Monthly)

| Component | Cost Driver | Estimated % |
|-----------|-------------|-------------|
| Photo Storage + CDN | Egress, storage | 40% |
| Compute (Services) | CPU/memory | 25% |
| Database (MongoDB) | Storage, IOPS | 15% |
| Cache (Redis) | Memory | 10% |
| Search (Elasticsearch) | Compute, storage | 5% |
| Messaging (Kafka) | Throughput | 3% |
| Networking | Inter-region | 2% |

### Cost Optimization Levers

1. **CDN caching** - Higher hit rate reduces origin costs
2. **Image compression** - Smaller files = lower storage + egress
3. **Geoshard efficiency** - Query only relevant shards
4. **Reserved instances** - Predictable baseline workload
5. **Cold storage tiering** - Inactive user photos to cheaper storage

---

*Next: [High-Level Design →](./02-high-level-design.md)*
