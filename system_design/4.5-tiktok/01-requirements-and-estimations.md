# Requirements & Estimations

[← Back to Index](./00-index.md) | [Next: High-Level Design →](./02-high-level-design.md)

---

## Functional Requirements

### Core Features (Must Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Video Upload** | Upload short-form videos (15s-10min) with in-app editing | P0 |
| **For You Page (FYP)** | Personalized, interest-based video feed | P0 |
| **Following Feed** | Chronological feed from followed creators | P0 |
| **Video Interactions** | Like, comment, share, save, download | P0 |
| **User Profiles** | Creator profiles with video galleries | P0 |
| **Search & Discovery** | Search users, hashtags, sounds, videos | P0 |
| **Notifications** | Likes, comments, follows, mentions | P0 |

### Creator Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **In-App Video Editor** | Trim, merge, adjust speed, add text | P0 |
| **Effects & Filters** | AR effects, beautification, visual filters | P0 |
| **Sound Library** | Music, sound effects, trending audio | P0 |
| **Duet** | Side-by-side video collaboration | P1 |
| **Stitch** | Clip and respond to other videos | P1 |
| **Creator Analytics** | Views, engagement, audience demographics | P1 |
| **Creator Monetization** | Creator rewards, brand partnerships | P1 |

### Social Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Follow/Followers** | Asymmetric social graph | P0 |
| **Direct Messages** | Text, video, audio messaging | P1 |
| **Comments Threading** | Nested replies, likes on comments | P1 |
| **Live Streaming** | Real-time broadcast with chat | P1 |
| **Live Gifting** | Virtual gifts during livestreams | P1 |
| **Group Chats** | Multi-user conversations | P2 |

### Commerce Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **TikTok Shop** | In-app product discovery and purchase | P1 |
| **Affiliate Links** | Creator product recommendations | P1 |
| **Live Shopping** | Product showcases during streams | P2 |
| **Brand Partnerships** | Creator marketplace | P2 |

### Out of Scope

- Long-form video (>10 minutes)
- Desktop content creation
- Video calling (1:1 or group)
- Stories (ephemeral content)
- Augmented reality games
- Crypto/NFT features

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| **FYP Inference Latency** | <50ms p99 | Real-time recommendation serving |
| **Video Start Time** | <150ms p95 | Seamless swipe experience |
| **Video Buffering** | <1% of watch time | Aggressive prefetching goal |
| **Upload Acknowledgment** | <2s | Immediate user feedback |
| **Feed Load Time** | <200ms p95 | Initial app open experience |
| **Search Results** | <100ms p95 | Instant feedback |
| **Like/Comment Response** | <100ms | Real-time interaction feel |

### Availability & Reliability

| Metric | Target | Justification |
|--------|--------|---------------|
| **System Availability** | 99.99% | 52 minutes downtime/year max |
| **FYP Service** | 99.99% | Core user experience |
| **Video Playback** | 99.95% | CDN redundancy |
| **Upload Service** | 99.9% | Can retry; less critical |
| **Live Streaming** | 99.9% | Real-time, harder to maintain |
| **TikTok Shop** | 99.99% | Revenue-critical |

### Consistency Model

| Component | Consistency | Rationale |
|-----------|-------------|-----------|
| **FYP Feed** | Eventual | Personalization can lag slightly |
| **Video Upload** | Strong | Upload must be durable before ack |
| **Like/Comment Counts** | Eventual | Counters can converge over seconds |
| **Follow Graph** | Eventual | Follows can propagate with delay |
| **Payments (Shop)** | Strong | Financial transactions require ACID |
| **Live Gifts** | Strong | Monetary, must be consistent |
| **User Profile** | Eventual | Minor lag acceptable |

### CAP Theorem Position

**Choice: AP (Availability + Partition Tolerance)**

| Justification | Impact |
|---------------|--------|
| Global user base across unreliable networks | Must handle network partitions |
| User experience prioritized over consistency | Stale recommendations acceptable |
| Revenue depends on app availability | Downtime = lost engagement |
| Counters and feeds can eventually converge | Strong consistency not needed |

**Exceptions:** Payment processing and live gifting use CP (Consistency + Partition Tolerance) via synchronous replication.

---

## Capacity Estimations

### User Base

| Metric | Value | Calculation |
|--------|-------|-------------|
| MAU | 1.9 billion | Given (2025-2026 data) |
| DAU | 1.12 billion | 59% of MAU |
| Peak Concurrent Users | 200 million | ~18% of DAU during peak hours |
| Sessions per DAU | 8-10 | Highly habitual usage |
| Avg Session Duration | 10-12 minutes | 95 min total / 8-10 sessions |

### Content Volume

| Metric | Value | Calculation |
|--------|-------|-------------|
| Videos Uploaded/Day | 34 million | Given |
| Videos Uploaded/Second | ~394 | 34M / 86,400 |
| Videos Uploaded/Second (Peak) | ~800 | 2x average |
| Avg Video Duration | 30 seconds | Mix of 15s-60s dominant |
| Avg Video File Size (Raw) | 50 MB | 1080p, 30 fps, 30s |
| Avg Video File Size (Compressed) | 5 MB | After transcoding |

### Read/Write Ratio

| Metric | Value | Calculation |
|--------|-------|-------------|
| Videos Watched/Day | 10+ billion | ~10 videos/DAU × 1.12B DAU |
| Read:Write Ratio | ~300:1 | 10B watched / 34M uploaded |
| FYP Requests/Day | 5+ billion | ~5 feed loads/session × sessions |
| FYP Requests/Second | ~58,000 | 5B / 86,400 |
| FYP Requests/Second (Peak) | ~150,000 | 2.5x average |

### Storage Estimates

| Metric | Value | Calculation |
|--------|-------|-------------|
| **Video Storage/Day** | 170 TB | 34M × 5 MB compressed |
| **Video Storage/Year** | 62 PB | 170 TB × 365 |
| **Video Storage (5 Years)** | 310 PB | 62 PB × 5 |
| **Metadata Storage/Video** | 5 KB | Schema + indexes |
| **Metadata Storage/Day** | 170 GB | 34M × 5 KB |
| **User Profile Storage** | 10 KB/user | Profile + preferences |
| **Total User Storage** | 19 TB | 1.9B × 10 KB |
| **Interaction Data/Day** | 500 GB | Likes, comments, views |

### Bandwidth Estimates

| Metric | Value | Calculation |
|--------|-------|-------------|
| **Avg Video Bitrate** | 2 Mbps | Adaptive, avg quality |
| **Avg Watch Duration** | 20 seconds | Mix of completes and skips |
| **Data per View** | 5 MB | 2 Mbps × 20s |
| **Total Egress/Day** | 50 PB | 10B views × 5 MB |
| **Peak Egress Bandwidth** | 5 Tbps | 50 PB spread over peak hours |
| **Upload Ingress/Day** | 1.7 PB | 34M × 50 MB raw |
| **CDN Cache Hit Rate** | 95%+ | Hot content cached at edge |

### ML/Recommendation Estimates

| Metric | Value | Calculation |
|--------|-------|-------------|
| **FYP Predictions/Second** | 150,000 | Peak feed requests |
| **Candidate Videos/Request** | 5,000 | Retrieval stage output |
| **Features per Prediction** | 1,000+ | User, video, context features |
| **Embedding Dimensions** | 128-256 | User and item embeddings |
| **Model Size** | 10-50 GB | DLRM with embeddings |
| **Feature Store Lookups/Sec** | 750M | 150K × 5K candidates |

### Infrastructure Estimates

| Component | Count | Rationale |
|-----------|-------|-----------|
| **API Servers** | 10,000+ | Handle 150K+ RPS peak |
| **ML Inference Servers (GPU)** | 5,000+ | 50ms latency constraint |
| **Video Transcoding Workers** | 2,000+ | 800 uploads/sec × 3 codecs |
| **CDN Edge Nodes** | 2,000+ | 29 countries, sub-100ms latency |
| **Database Nodes (Cassandra)** | 1,000+ | Timeline storage at scale |
| **Cache Nodes (Redis)** | 500+ | Hot data, session state |

---

## SLOs / SLAs

### Service Level Objectives

| Metric | Target | Measurement | Alert Threshold |
|--------|--------|-------------|-----------------|
| **Availability** | 99.99% | Successful requests / total | <99.95% |
| **FYP Latency (p50)** | 20ms | End-to-end inference | >30ms |
| **FYP Latency (p99)** | 50ms | End-to-end inference | >75ms |
| **Video Start Time (p95)** | 150ms | Time to first frame | >300ms |
| **Upload Success Rate** | 99.5% | Successful uploads / attempts | <99% |
| **Video Buffering Ratio** | <1% | Buffering time / watch time | >2% |
| **CDN Cache Hit Rate** | 95% | Cache hits / total requests | <90% |

### Service Level Agreements (External)

| Service | SLA | Penalty |
|---------|-----|---------|
| **Core Platform** | 99.9% monthly | Service credits |
| **TikTok Shop** | 99.95% monthly | Revenue protection |
| **Creator Payouts** | 99.99% | Financial compliance |
| **Advertising Platform** | 99.9% | Ad credit compensation |

### Error Budgets

| Service | Monthly Error Budget | Calculation |
|---------|---------------------|-------------|
| **FYP Service** | 4.3 minutes | (1 - 0.9999) × 43,200 min |
| **Video Upload** | 43 minutes | (1 - 0.999) × 43,200 min |
| **Live Streaming** | 43 minutes | (1 - 0.999) × 43,200 min |
| **Payments** | 4.3 minutes | (1 - 0.9999) × 43,200 min |

---

## Summary Table

| Category | Key Metric | Value |
|----------|------------|-------|
| **Users** | DAU | 1.12 billion |
| **Content** | Videos/day | 34 million |
| **Traffic** | FYP RPS (peak) | 150,000 |
| **Storage** | Video storage/year | 62 PB |
| **Bandwidth** | Egress/day | 50 PB |
| **Latency** | FYP inference | <50ms p99 |
| **Availability** | Target | 99.99% |
| **Read:Write** | Ratio | 300:1 |

---

*[← Back to Index](./00-index.md) | [Next: High-Level Design →](./02-high-level-design.md)*
