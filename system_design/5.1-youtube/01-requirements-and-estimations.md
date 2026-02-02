# YouTube: Requirements & Estimations

[← Back to Index](./00-index.md) | [Next: High-Level Design →](./02-high-level-design.md)

---

## Functional Requirements

### Core Features (P0 - Must Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Video Upload** | Upload videos up to 128GB / 12 hours with resumable uploads | P0 |
| **Video Transcoding** | Convert to multiple codecs (H.264, VP9, AV1) and resolutions (144p-8K) | P0 |
| **Video Playback** | Stream with adaptive bitrate, seek, resume watching | P0 |
| **Search** | Full-text search across titles, descriptions, transcripts | P0 |
| **Recommendations** | Personalized home feed and suggested videos | P0 |
| **Subscriptions** | Subscribe to channels, get notifications | P0 |
| **View Tracking** | Count views accurately with fraud detection | P0 |
| **User Authentication** | Sign up, login, account management | P0 |

### Creator Features (P1 - Important)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Channel Management** | Create/customize channel, branding, sections | P1 |
| **Video Management** | Edit metadata, visibility, scheduling | P1 |
| **Analytics Dashboard** | Views, watch time, revenue, audience demographics | P1 |
| **Monetization** | Ad revenue, memberships, Super Chat | P1 |
| **Live Streaming** | Real-time broadcast with chat | P1 |
| **Shorts** | Short-form vertical video (< 60s) | P1 |
| **Community Posts** | Text/image posts on channel | P1 |
| **Playlists** | Create, organize, share playlists | P1 |

### Social Features (P1 - Important)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Comments** | Threaded comments with replies | P1 |
| **Likes/Dislikes** | Engagement reactions (dislike count hidden) | P1 |
| **Share** | Share to social platforms, embed | P1 |
| **Watch History** | Track and resume watched videos | P1 |
| **Watch Later** | Save videos for later viewing | P1 |
| **Notifications** | New video, reply, subscription alerts | P1 |

### Premium Features (P2 - Nice to Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **YouTube Premium** | Ad-free, background play, downloads | P2 |
| **YouTube Music** | Music streaming integration | P2 |
| **Offline Downloads** | Download for offline viewing | P2 |
| **Picture-in-Picture** | Mini player overlay | P2 |
| **Chapters** | Video segments with titles | P2 |
| **Transcripts** | Auto-generated captions as text | P2 |

### Out of Scope

| Feature | Reason |
|---------|--------|
| YouTube TV (Live TV) | Separate product with different architecture |
| YouTube Kids | Separate app with additional safety layers |
| YouTube Gaming | Deprecated, merged into main platform |
| Video Editing | External tools (handled separately) |
| Music Publishing | YouTube Music backend |

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Justification |
|--------|--------|---------------|
| **Video Start Time** | < 200ms (p50), < 500ms (p95) | User expectation for instant playback |
| **Search Latency** | < 100ms (p50), < 300ms (p95) | Fast query response |
| **Recommendation Latency** | < 50ms (p99) | Real-time personalization |
| **Upload Processing** | < 10 min for 10-min video | Creator experience |
| **Page Load Time** | < 2s (p50) | Core Web Vitals |
| **ABR Adaptation** | < 500ms quality switch | Smooth streaming |
| **Comment Load** | < 200ms | Engagement UX |

### Availability & Reliability

| Metric | Target | Justification |
|--------|--------|---------------|
| **Overall Availability** | 99.99% (52 min downtime/year) | Critical infrastructure |
| **Video Playback Availability** | 99.999% | Core product function |
| **CDN Availability** | 99.99% per region | Multi-PoP redundancy |
| **Upload Service** | 99.9% | Acceptable brief outages |
| **Search Service** | 99.95% | High but slightly less critical |
| **MTTR (Recovery Time)** | < 5 minutes | Fast incident response |
| **Data Durability** | 99.999999999% (11 9s) | Video content is irreplaceable |

### Consistency Model

| Data Type | Consistency | Rationale |
|-----------|-------------|-----------|
| **View Counts** | Eventual (2-3s lag) | High write volume, accuracy not time-critical |
| **Like/Dislike Counts** | Eventual | Same as views |
| **Video Metadata** | Strong | Creator edits must reflect immediately |
| **Comments** | Eventual | New comments can have slight delay |
| **Subscriptions** | Strong | Subscription action must be confirmed |
| **Watch History** | Eventual | Background sync acceptable |
| **Payments/Revenue** | Strong | Financial accuracy required |
| **Content ID Claims** | Strong | Legal/copyright implications |

### CAP Theorem Choice

**Choice: AP (Availability + Partition Tolerance)**

| Aspect | Decision |
|--------|----------|
| **Primary Focus** | Availability over strict consistency |
| **Rationale** | Users expect videos to play even during network issues |
| **Trade-off** | View counts may be slightly stale (acceptable) |
| **Exception** | Payment/billing uses CP (Spanner with strong consistency) |

---

## Capacity Estimations

### User Base

| Metric | Value | Calculation |
|--------|-------|-------------|
| Monthly Active Users (MAU) | 2.5 billion | Given (industry data) |
| Daily Active Users (DAU) | 122 million | ~5% of MAU |
| Concurrent Users (Peak) | 50 million | ~40% of DAU during peak hours |
| Avg Sessions/User/Day | 1.5 | Mobile + desktop combined |
| Avg Session Duration | 40 minutes | Engagement metric |
| Logged-in Users | 80% | Most users have accounts |

### Content Volume

| Metric | Value | Calculation |
|--------|-------|-------------|
| Total Videos | 800 million | Current catalog |
| Hours Uploaded/Minute | 500+ | Given (industry data) |
| Videos Uploaded/Day | 720,000 | 500 hrs × 60 min × 24 hrs / 10 min avg |
| Avg Video Duration (Long-form) | 11.7 minutes | Platform average |
| Avg Video Duration (Shorts) | 30 seconds | Short-form content |
| Avg Raw Video Size | 500 MB | 1080p, 10 min, uncompressed |
| Avg Compressed Size (Original) | 100 MB | H.264 high quality |
| Transcoded Variants/Video | ~24 | 3 codecs × 8 resolutions |
| Storage Multiplier | ~3x | Compressed variants + thumbnails |

### Read/Write Ratio

| Metric | Value | Calculation |
|--------|-------|-------------|
| Video Views/Day | 5 billion | 1B hours / 12 min avg |
| Video Uploads/Day | 720,000 | Calculated above |
| **Read:Write Ratio** | **6,944:1** | 5B / 720K |
| Search Queries/Day | 3 billion | Second largest search engine |
| Comments Posted/Day | 500 million | Estimated engagement |
| Likes/Day | 2 billion | Higher than comments |

### Traffic Estimates

| Metric | Value | Calculation |
|--------|-------|-------------|
| Peak Video Requests/Second | 100 million | 5B views / 86,400 × 2 (peak factor) |
| Avg Bitrate (Streaming) | 5 Mbps | Mix of resolutions |
| Concurrent Streams (Peak) | 50 million | Peak concurrent users |
| **Peak Egress Bandwidth** | **250 Pbps** | 50M × 5 Mbps |
| Actual CDN Egress | 100+ Tbps | Multi-tier caching reduces load |
| API Requests/Second | 10 million | Metadata, search, recommendations |

### Storage Estimates

| Metric | Value | Calculation |
|--------|-------|-------------|
| Raw Uploads/Day | 72 PB | 720K videos × 100 MB |
| Transcoded Storage/Day | 216 PB | 72 PB × 3x multiplier |
| **New Storage/Day** | **288 PB** | Raw + transcoded |
| Storage/Year | 105 EB | 288 PB × 365 |
| Existing Catalog | ~1.5 EB | 800M videos × ~2 GB avg |
| Total Storage (5 Years) | ~600 EB | Including growth |
| Thumbnail Storage/Day | 720 GB | 720K × 1 MB (multiple sizes) |
| Caption Storage/Day | 7.2 GB | 720K × 10 KB |

### Bandwidth Estimates

| Metric | Value | Calculation |
|--------|-------|-------------|
| Upload Ingress/Day | 72 PB | Raw uploads |
| Upload Ingress Bandwidth | 6.7 Tbps | 72 PB / 86,400 |
| CDN Egress/Day | 8.6 EB | 1B hours × 5 Mbps × 3600s / 8 |
| CDN Egress Bandwidth (Avg) | 100 Tbps | Sustained average |
| CDN Egress Bandwidth (Peak) | 250 Tbps | 2.5x peak factor |
| Cache Hit Rate | 98.5% | High for popular content |
| Origin Traffic | 1.5 Tbps | 100 Tbps × 1.5% miss |

### Infrastructure Estimates

| Component | Count | Calculation |
|-----------|-------|-------------|
| CDN Edge Nodes | 3,000+ | Global presence |
| Transcoding Workers | 100,000+ | Parallel processing |
| API Servers | 50,000+ | 10M RPS / 200 RPS per server |
| Database Shards (Vitess) | 10,000+ | Metadata partitioning |
| ML Inference Servers | 20,000+ | Recommendation serving |
| Storage Servers | 1,000,000+ | Exabyte-scale storage |

---

## ML/Recommendation Estimates

| Metric | Value | Calculation |
|--------|-------|-------------|
| Recommendation Requests/Day | 10 billion | Home + suggested + search |
| Features per Request | 1,000+ | User + video + context features |
| Model Inference Latency | < 50ms | Real-time requirement |
| Daily Training Data | 80+ billion signals | Clicks, views, engagement |
| Model Size | 10+ GB | Deep neural network |
| Feature Store Queries/Sec | 10 million | Real-time feature lookup |

---

## SLOs / SLAs

### Service Level Objectives (Internal)

| Metric | Target | Measurement | Alert Threshold |
|--------|--------|-------------|-----------------|
| **Video Start Success Rate** | 99.9% | Successful playback starts / attempts | < 99.5% |
| **Rebuffering Ratio** | < 0.5% | Buffering time / total play time | > 1% |
| **Search Latency (p99)** | < 500ms | End-to-end search time | > 800ms |
| **Upload Success Rate** | 99.5% | Successful uploads / attempts | < 99% |
| **Transcoding Completion** | < 30 min | 95th percentile completion time | > 60 min |
| **CDN Cache Hit Rate** | > 95% | Cache hits / total requests | < 90% |
| **API Error Rate** | < 0.1% | 5xx errors / total requests | > 0.5% |
| **Recommendation Freshness** | < 1 hour | Time since model update | > 4 hours |

### Service Level Agreements (External/Creator)

| Metric | Guarantee | Penalty |
|--------|-----------|---------|
| **Platform Availability** | 99.9% monthly | Service credits |
| **Upload Processing** | < 24 hours | Priority support |
| **Analytics Accuracy** | 99% within 48 hours | Investigation |
| **Revenue Reporting** | Daily updates | Audit rights |
| **Support Response** | < 24 hours (partners) | Escalation path |

### Error Budget

| Service | Monthly Budget | Calculation |
|---------|---------------|-------------|
| Video Playback | 4.3 minutes | 30 days × 24 hrs × 60 min × 0.01% |
| API Gateway | 43 minutes | 30 days × 24 hrs × 60 min × 0.1% |
| Upload Service | 43 minutes | 30 days × 24 hrs × 60 min × 0.1% |
| Search | 21.6 minutes | 30 days × 24 hrs × 60 min × 0.05% |

---

## Data Retention Policies

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Video Files | Indefinite | Creator content |
| Watch History | 3 years | Privacy regulations |
| Search History | 18 months | Privacy (GDPR) |
| Comments | Until deleted | User control |
| Analytics (Detailed) | 2 years | Storage cost |
| Analytics (Aggregated) | 5 years | Trend analysis |
| Audit Logs | 7 years | Compliance |
| Payment Records | 7 years | Tax/legal requirements |

---

## Growth Projections

| Metric | Current (2026) | 2027 | 2028 |
|--------|---------------|------|------|
| MAU | 2.5B | 2.8B | 3.1B |
| Hours Uploaded/Min | 500 | 600 | 720 |
| Storage Growth/Year | 105 EB | 130 EB | 160 EB |
| CDN Capacity | 100 Tbps | 150 Tbps | 200 Tbps |
| Shorts % of Content | 40% | 50% | 55% |

---

## Cost Considerations

| Component | Relative Cost | Optimization Strategy |
|-----------|--------------|----------------------|
| **Storage** | Very High (40%) | Tiered storage, cold archive, deduplication |
| **CDN/Bandwidth** | Very High (30%) | ISP peering, edge caching, compression |
| **Transcoding** | High (15%) | Custom ASICs, prioritized encoding |
| **Compute** | Medium (10%) | Efficient algorithms, caching |
| **ML/GPU** | Medium (5%) | Model optimization, batching |

---

*[← Back to Index](./00-index.md) | [Next: High-Level Design →](./02-high-level-design.md)*
