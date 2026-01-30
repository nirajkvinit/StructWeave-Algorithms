# Requirements & Estimations

[← Back to Index](./00-index.md) | [Next: High-Level Design →](./02-high-level-design.md)

---

## Functional Requirements

### Core Features (In Scope)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Photo Upload** | Upload photos with filters, captions, and location tags | P0 |
| **Video Upload** | Upload videos up to 60 minutes (Reels up to 15 min) | P0 |
| **Feed** | Personalized timeline of posts from followed accounts | P0 |
| **Stories** | 24-hour ephemeral photo/video content | P0 |
| **Explore** | Discovery feed with personalized recommendations | P0 |
| **Reels** | Short-form vertical video (up to 3 min in-app, 15 min upload) | P0 |
| **Follow/Unfollow** | Unidirectional follow relationships | P0 |
| **Like/Comment** | Engagement on posts | P0 |
| **Direct Sharing** | Share posts via DM | P1 |
| **Search** | Find users, hashtags, locations | P1 |
| **Notifications** | Activity alerts (likes, comments, follows) | P1 |

### Out of Scope

| Feature | Reason |
|---------|--------|
| Full Direct Messaging System | Separate system design (focus on feed/media) |
| Instagram Shopping | E-commerce layer complexity |
| Instagram Live | Real-time streaming is distinct architecture |
| IGTV (deprecated) | Merged into main video |
| Ads Platform | Separate monetization system |
| Creator Monetization | Subscriptions, badges separate |

---

## Non-Functional Requirements

### CAP Theorem Choice

**Choice: AP (Availability + Partition Tolerance)**

| Aspect | Decision | Justification |
|--------|----------|---------------|
| **Availability** | 99.99% target | User experience critical; brief inconsistency acceptable |
| **Consistency** | Eventual (feed), Strong (uploads) | Feed can be stale for seconds; uploads must confirm |
| **Partition Tolerance** | Required | Multi-region deployment across global data centers |

### Consistency Model

| Component | Consistency Level | Reason |
|-----------|-------------------|--------|
| Media Uploads | Strong (per-upload) | User must see their upload succeeded |
| Feed Timeline | Eventual (seconds) | Stale feed acceptable; cache-first rendering |
| Like/Comment Counts | Eventual | Approximate counts sufficient |
| Follow Relationships | Strong (eventual propagation) | Core graph integrity |
| Stories | Strong on write, eventual on read | Must appear immediately after posting |
| Explore | Eventual | Recommendations can be slightly stale |

### Availability Targets

| Component | Target | Measurement |
|-----------|--------|-------------|
| Overall Platform | 99.99% | Monthly uptime |
| Feed Service | 99.99% | Successful feed loads |
| Upload Service | 99.9% | Upload success rate |
| Stories Service | 99.99% | Stories availability |
| Explore Service | 99.95% | Can degrade gracefully |

**Downtime Budget (99.99%):**
- Monthly: 4.32 minutes
- Yearly: 52.56 minutes

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Feed Load | 100ms | 150ms | 200ms |
| Upload Acknowledgment | 500ms | 800ms | 1s |
| Media Playback Start | 200ms | 400ms | 600ms |
| Stories Tray Load | 80ms | 120ms | 150ms |
| Explore Feed Load | 150ms | 250ms | 350ms |
| Search Results | 100ms | 200ms | 300ms |

### Durability Guarantees

| Data Type | Durability | Strategy |
|-----------|------------|----------|
| Media Files | 99.999999999% (11 nines) | Multi-region replication, erasure coding |
| User Metadata | 99.9999% (6 nines) | PostgreSQL replication |
| Feed Data | 99.99% (4 nines) | Cassandra replication (RF=3) |
| Stories (active) | 99.99% | Edge cached + origin |
| Stories (expired) | N/A | Deleted after 24h (or archived to Highlights) |

---

## Capacity Estimations

### User Base

| Metric | Value | Calculation |
|--------|-------|-------------|
| MAU | 2,000,000,000 | Given |
| DAU | 500,000,000 | 25% of MAU (high engagement) |
| Peak Concurrent Users | 50,000,000 | 10% of DAU |
| Average Session Duration | 30 minutes | Industry data |
| Sessions per Day | 7 | High engagement platform |

### Content Volume

| Metric | Value | Calculation |
|--------|-------|-------------|
| Photos uploaded/day | 80,000,000 | ~85% of 95M uploads |
| Videos uploaded/day | 15,000,000 | ~15% of 95M uploads |
| **Total uploads/day** | **95,000,000** | Given (Meta data) |
| Uploads/second (avg) | 1,100 | 95M / 86,400 |
| Uploads/second (peak) | 3,300 | 3x average |
| Stories posted/day | 500,000,000 | 500M+ Stories DAU |
| Reels uploaded/day | 10,000,000 | Estimated |

### Read:Write Ratio

| Operation | Ratio | Calculation |
|-----------|-------|-------------|
| Feed reads : Post writes | 100:1 | Each post viewed 100x on average |
| Stories views : Stories posts | 50:1 | Stories viewed by ~50 followers avg |
| Explore loads : New content | 1000:1 | Discovery surfaces same content repeatedly |

### QPS Calculations

| Operation | Average QPS | Peak QPS | Calculation |
|-----------|-------------|----------|-------------|
| Feed Loads | 200,000 | 600,000 | 500M DAU × 7 sessions / 86,400s × 3 |
| Media Uploads | 1,100 | 3,300 | 95M / 86,400 × 3 |
| Stories Views | 500,000 | 1,500,000 | High ephemeral engagement |
| Explore Loads | 100,000 | 300,000 | Discovery feature |
| Like/Comment | 50,000 | 150,000 | Engagement actions |
| Search | 30,000 | 90,000 | User searches |
| **Total** | **~900,000** | **~2,700,000** | Combined |

### Storage Estimations

**Per-Media Storage:**

| Media Type | Average Size (Raw) | Average Size (Processed) | Variants |
|------------|-------------------|-------------------------|----------|
| Photo | 3 MB | 500 KB (optimized) | 3 thumbnails (1440px, 250px, thumbhash) |
| Video (short) | 50 MB | 10 MB (AV1) | 4 ABR variants + H.264 fallback |
| Video (long) | 500 MB | 100 MB (AV1) | 4 ABR variants + H.264 fallback |
| Story | 2 MB | 400 KB | 2 variants |
| Reel | 30 MB | 8 MB (AV1) | 4 ABR variants |

**Daily Storage Growth:**

| Component | Calculation | Daily Growth |
|-----------|-------------|--------------|
| Photos | 80M × 500KB × 4 variants | ~160 TB |
| Videos | 15M × 20MB avg × 5 variants | ~1.5 PB |
| Stories | 500M × 400KB × 2 variants | ~400 TB |
| Reels | 10M × 8MB × 5 variants | ~400 TB |
| **Total Daily** | | **~2.5 PB** |
| **Yearly (before dedup)** | | **~900 PB** |

**With Deduplication (estimated 40% savings):**
- Daily: ~1.5 PB
- Yearly: ~550 PB

### Bandwidth Estimations

| Flow | Calculation | Bandwidth |
|------|-------------|-----------|
| **Ingress (Uploads)** | 95M × 5MB avg / 86,400s | ~55 Gbps |
| **Egress (Reads)** | 100:1 ratio × 55 Gbps × 0.7 (cache hit) | ~3.8 Tbps |
| **CDN Egress** | 3.8 Tbps × 0.85 (CDN hit rate) | ~3.2 Tbps |
| **Origin Egress** | 3.8 Tbps × 0.15 | ~570 Gbps |

### Cache Size Estimations

| Cache Layer | Purpose | Size Calculation | Recommended |
|-------------|---------|------------------|-------------|
| **Feed Cache (Redis)** | Precomputed timelines | 500M DAU × 800 posts × 200B per post ID | ~80 TB |
| **Stories Cache** | Active Stories metadata | 500M Stories × 1KB | ~500 GB |
| **Media CDN Cache** | Hot media files | Top 10% of content × 5MB avg | ~50 PB (distributed) |
| **Session Cache** | User sessions | 50M concurrent × 1KB | ~50 GB |
| **ML Feature Cache** | Precomputed features | Hot users × 10KB | ~5 TB |

---

## SLOs / SLAs

### Service Level Objectives

| Metric | Target | Measurement Window | Alerting Threshold |
|--------|--------|-------------------|-------------------|
| **Availability** | 99.99% | Monthly | < 99.95% |
| **Feed Latency (p99)** | < 200ms | Rolling 5 min | > 180ms |
| **Upload Success Rate** | 99.9% | Hourly | < 99.5% |
| **Stories Delivery** | 99.99% | Daily | < 99.9% |
| **Media Start Time (p95)** | < 400ms | Rolling 5 min | > 350ms |
| **Error Rate** | < 0.1% | Hourly | > 0.05% |

### SLA Tiers (External)

| Tier | Availability | Latency (p95) | Support |
|------|-------------|---------------|---------|
| Consumer | 99.9% | Best effort | Community |
| Business | 99.95% | < 300ms | Email |
| Enterprise API | 99.99% | < 200ms | 24/7 |

---

## Throughput Requirements

| Service | Writes/sec | Reads/sec | Data Size/Operation |
|---------|------------|-----------|---------------------|
| Media Service | 3,300 (peak) | 300,000 | 5MB avg (upload), 500KB (read) |
| Feed Service | 5,000 | 600,000 | 50KB (feed page) |
| Stories Service | 10,000 | 1,500,000 | 500KB (Story) |
| Like Service | 150,000 | 50,000 | 100B (like event) |
| Follow Service | 10,000 | 100,000 | 50B (relationship) |
| Notification Service | 500,000 | 100,000 | 200B (notification) |

---

## Growth Projections

### 5-Year Growth Model

| Metric | Year 1 | Year 2 | Year 3 | Year 5 |
|--------|--------|--------|--------|--------|
| MAU | 2B | 2.2B | 2.4B | 2.8B |
| DAU | 500M | 550M | 600M | 700M |
| Uploads/day | 95M | 110M | 130M | 180M |
| Storage (cumulative) | 550 PB | 1.2 EB | 2.0 EB | 4.0 EB |
| Peak QPS | 2.7M | 3.2M | 3.8M | 5.0M |

### Infrastructure Implications

| Component | Year 1 | Year 5 | Scaling Strategy |
|-----------|--------|--------|------------------|
| Database Shards | 10,000 | 25,000 | Horizontal sharding |
| CDN Edge Nodes | 200 | 400 | Geographic expansion |
| ML Inference Capacity | 90M pred/sec | 200M pred/sec | GPU scaling |
| Storage Clusters | 100 | 250 | Capacity addition |

---

## Cost Considerations

### Cost Breakdown (Estimated Annual)

| Category | % of Total | Key Drivers |
|----------|------------|-------------|
| Storage | 35% | Media files, replication, archival |
| Compute | 25% | ML inference, transcoding, API servers |
| Network/CDN | 20% | Egress, CDN PoPs, bandwidth |
| Database | 10% | PostgreSQL, Cassandra clusters |
| ML/AI | 8% | Training, feature computation |
| Other | 2% | Monitoring, security, misc |

### Cost Optimization Strategies

| Strategy | Impact | Implementation |
|----------|--------|----------------|
| AV1 Codec Adoption | 30% bandwidth reduction | Already at 70%+ adoption |
| Video Encoding Optimization | 94% compute reduction | Achieved |
| Intelligent Caching | 35% bandwidth savings | ML-driven prefetching |
| Storage Tiering | 40% storage cost reduction | Hot/warm/cold tiers |
| Compression (images) | 50% storage reduction | ML-based adaptive compression |

---

## Summary Table

| Category | Metric | Value |
|----------|--------|-------|
| **Users** | MAU | 2 billion |
| | DAU | 500 million |
| **Content** | Uploads/day | 95 million |
| | Uploads/sec (peak) | 3,300 |
| **Traffic** | Peak QPS | 2.7 million |
| | Read:Write Ratio | 100:1 |
| **Storage** | Daily Growth | ~1.5 PB (after dedup) |
| | Yearly Growth | ~550 PB |
| **Bandwidth** | Ingress | 55 Gbps |
| | Egress | 3.8 Tbps |
| **Latency** | Feed p99 | <200ms |
| | Upload ack | <1s |
| **Availability** | Target | 99.99% |
| **ML Scale** | Predictions/sec | 90 million |
| | Features/request | 65 billion |

---

*[← Back to Index](./00-index.md) | [Next: High-Level Design →](./02-high-level-design.md)*
