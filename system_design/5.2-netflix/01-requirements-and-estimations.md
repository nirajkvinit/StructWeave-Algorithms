# Requirements & Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### P0 - Must Have (Core Product)

| Feature | Description | User Story |
|---------|-------------|------------|
| **Video Playback** | Stream content with adaptive bitrate, seek, resume | "As a user, I want to watch movies/shows seamlessly across devices" |
| **Content Catalog** | Browse and search content library | "As a user, I want to find content by title, genre, actor" |
| **Personalization** | Personalized home page, recommendations | "As a user, I want relevant suggestions based on my taste" |
| **User Profiles** | Multiple profiles per account (up to 5) | "As a family, we want separate profiles with individual histories" |
| **Watch History** | Track progress, resume playback | "As a user, I want to continue watching where I left off" |
| **Subscription Management** | Sign up, billing, plan management | "As a user, I want to manage my subscription and payment" |
| **Download (Offline)** | Download for offline viewing | "As a user, I want to download content for flights/travel" |

### P1 - Important (Growth Features)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Live Streaming** | Real-time events (sports, specials) | P1 |
| **Ads-Supported Tier** | Lower-price tier with advertisements | P1 |
| **Parental Controls** | Content restrictions, Kids profiles | P1 |
| **Interactive Content** | Branching narratives (Bandersnatch-style) | P1 |
| **Multiple Audio/Subtitle** | Multi-language support | P1 |
| **Content Ratings** | Thumbs up/down, star ratings | P1 |

### P2 - Nice to Have (Differentiation)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Games** | Cloud gaming integration | P2 |
| **Social Features** | Watch party, sharing | P2 |
| **Smart Downloads** | Auto-download next episode | P2 |
| **Sleep Timer** | Auto-pause after duration | P2 |

### Out of Scope

| Feature | Reason |
|---------|--------|
| User-generated content upload | Netflix is curated, not UGC platform |
| Live chat during streams | Different product (Twitch-like) |
| Creator monetization | No creator economy model |
| Ad-supported free tier | Business model is subscription-first |

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| Playback Start Time (p50) | <200ms | User expectation for instant play |
| Playback Start Time (p95) | <500ms | Edge cases still acceptable |
| Recommendation Latency (p99) | <50ms | Real-time personalization |
| Search Latency (p95) | <200ms | Interactive search experience |
| API Response Time (p95) | <100ms | Responsive UI |
| Rebuffering Ratio | <0.5% | Quality of Experience metric |
| Video Start Failures | <0.1% | Critical metric |

### Availability & Reliability

| Metric | Target | Justification |
|--------|--------|---------------|
| Overall Availability | 99.99% (52 min/year) | Critical entertainment service |
| Playback Availability | 99.99% | Core value proposition |
| Regional Availability | 99.95% | Acceptable per-region variance |
| CDN Cache Hit Rate | >98% | Bandwidth cost, latency |
| Data Durability | 99.999999999% (11 9s) | Content is irreplaceable |

### Consistency Model

| Data Type | Consistency | Rationale |
|-----------|-------------|-----------|
| Video Content | Strong (within encoding pipeline) | Content integrity |
| User Profiles | Strong | Account security |
| Billing/Subscription | Strong | Financial accuracy |
| Recommendations | Eventual | Freshness < perfection |
| Watch History | Eventual | Cross-device sync tolerance |
| View Counts | Eventual | Analytics aggregation |
| Content Metadata | Eventual | Propagation delay acceptable |

### CAP Theorem Choice

```
                    CONSISTENCY
                        /\
                       /  \
                      /    \
                     /      \
       Billing ─────/   AP   \───── Recommendations
       Profiles    /          \     Watch History
                  /            \    Metadata
                 /──────────────\
            AVAILABILITY      PARTITION TOLERANCE

Netflix Choice: CP for billing/profiles, AP for recommendations/history
```

**Justification:**
- **Billing**: Must be strongly consistent (financial transactions)
- **Recommendations**: Eventual consistency acceptable (slightly stale is fine)
- **Watch History**: Cross-device sync can tolerate seconds of delay
- Partition tolerance is mandatory for global service

---

## Capacity Estimations

### User Base Metrics

| Metric | Value | Calculation/Source |
|--------|-------|-------------------|
| Total Memberships | 238 million | Netflix Q4 2024 earnings |
| Active Profiles | ~500 million | Est. 2.1 profiles per account |
| Daily Active Users (DAU) | ~100 million | Est. 42% of memberships |
| Peak Concurrent Viewers | 65 million | Tyson vs Paul 2024 (verified) |
| Average Concurrent | 15-20 million | Normal prime time |

### Content Metrics

| Metric | Value | Calculation |
|--------|-------|-------------|
| Total Titles | ~17,000 | Movies + series |
| Total Episodes | ~100,000 | Est. 6 episodes/series average |
| New Content/Month | ~200 titles | Netflix release cadence |
| Content Hours Added/Month | ~1,000 hours | Est. 5 hours/title average |

### Viewing Behavior

| Metric | Value | Calculation |
|--------|-------|-------------|
| Avg Watch Time/User/Day | 2.5 hours | Industry average for subscribers |
| Total Watch Hours/Day | 250 million | 100M DAU × 2.5 hours |
| Sessions/User/Day | 1.5 | Average user behavior |
| Total Sessions/Day | 150 million | 100M DAU × 1.5 |

### Traffic Estimations

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Average QPS (API)** | 150M sessions × 100 API calls / 86,400s | ~175,000 QPS |
| **Peak QPS (API)** | 3x average | ~500,000 QPS |
| **Playback Starts/Day** | 150M sessions | 150 million |
| **Playback Starts/Second (Avg)** | 150M / 86,400s | ~1,750/sec |
| **Playback Starts/Second (Peak)** | 10x average (prime time) | ~17,500/sec |
| **Concurrent Streams (Avg)** | 15-20 million | Normal hours |
| **Concurrent Streams (Peak)** | 65 million | Live events |

### Bandwidth Estimations

| Quality | Bitrate | Typical Device |
|---------|---------|----------------|
| 4K Ultra HD | 15-25 Mbps | Smart TV |
| 1080p HD | 5-8 Mbps | Laptop, tablet |
| 720p HD | 3-5 Mbps | Mobile (WiFi) |
| 480p SD | 1-3 Mbps | Mobile (cellular) |
| **Weighted Average** | **6 Mbps** | Across all streams |

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Peak Egress Bandwidth** | 65M streams × 6 Mbps | **390 Tbps** |
| **Average Egress Bandwidth** | 20M streams × 6 Mbps | **120 Tbps** |
| **Open Connect Traffic** | 95% of total | ~370 Tbps (peak) |
| **Origin Traffic** | 5% (cache misses) | ~20 Tbps (peak) |

### Storage Estimations

#### Video Content Storage

| Item | Calculation | Result |
|------|-------------|--------|
| Avg Title Duration | 1.5 hours (movies) / 45 min (episodes) | ~1 hour avg |
| Total Content Hours | 100,000 episodes × 1 hour | 100,000 hours |
| Storage per Hour (all encodings) | 10 GB (multiple codecs, resolutions) | 10 GB/hour |
| **Total Video Storage** | 100,000 × 10 GB | **~1 PB** |
| With 3x Replication | 1 PB × 3 | **~3 PB** |

#### Metadata Storage

| Data Type | Size/Record | Records | Total |
|-----------|-------------|---------|-------|
| Title Metadata | 10 KB | 17,000 | 170 MB |
| Episode Metadata | 5 KB | 100,000 | 500 MB |
| Artwork/Thumbnails | 1 MB | 100,000 | 100 GB |
| **Total Metadata** | | | **~100 GB** |

#### User Data Storage

| Data Type | Size/User | Users | Total |
|-----------|-----------|-------|-------|
| Profile Data | 5 KB | 500M | 2.5 TB |
| Watch History | 100 KB | 500M | 50 TB |
| Preferences | 20 KB | 500M | 10 TB |
| Download Metadata | 10 KB | 238M | 2.4 TB |
| **Total User Data** | | | **~65 TB** |

#### Analytics Storage

| Metric | Calculation | Result |
|--------|-------------|--------|
| Events/Day | 38M/sec × 86,400s | 3.3 trillion events |
| Event Size (avg) | 1 KB | Compressed |
| Raw Data/Day | 3.3T × 1 KB | **3.3 PB/day** |
| Retention (raw) | 7 days | 23 PB |
| Aggregated (long-term) | 90% reduction | ~230 TB/day |

### Message Queue Estimations (Kafka)

| Metric | Value | Source |
|--------|-------|--------|
| Messages/Day | 2 trillion | Netflix Tech Blog |
| Messages/Second (avg) | 23 million | 2T / 86,400s |
| Messages/Second (peak) | 38 million | Netflix Tech Blog |
| Message Size (avg) | 1 KB | Avro compressed |
| Throughput/Second | 38 GB/s | Peak |
| Retention | 7 days | Before expiry |
| Storage for Kafka | ~23 PB | 7 days × 3.3 PB/day |

---

## Database Sizing

### CockroachDB (ACID Transactions)

| Data Type | Records | Size/Record | Total |
|-----------|---------|-------------|-------|
| User Accounts | 238M | 2 KB | 476 GB |
| Subscriptions | 238M | 1 KB | 238 GB |
| Billing History | 238M × 24 | 0.5 KB | 2.8 TB |
| Content Rights | 17K × 190 | 1 KB | 3.2 GB |
| **Total CockroachDB** | | | **~3.5 TB** |

**Cluster Sizing:**
- 380+ clusters (Netflix confirmed)
- ~10 GB per cluster average
- Multi-region replication

### Cassandra (Analytics & History)

| Data Type | Records | Size/Record | Total |
|-----------|---------|-------------|-------|
| Watch History | 500M × 100 events | 0.5 KB | 25 TB |
| Viewing Events | 3.3T/day × 7 days | 0.1 KB | 2.3 PB |
| Recommendations (cached) | 500M profiles | 10 KB | 5 TB |
| **Total Cassandra** | | | **~2.3 PB** |

### EVCache (Feature Store)

| Data Type | Records | Size/Record | Total |
|-----------|---------|-------------|-------|
| User Features | 500M | 5 KB | 2.5 TB |
| Item Features | 100K | 10 KB | 1 GB |
| Real-time Features | 500M | 2 KB | 1 TB |
| **Total EVCache** | | | **~3.5 TB** |

---

## SLOs & SLAs

### Service Level Objectives (SLOs)

| Service | Metric | Target | Measurement Window |
|---------|--------|--------|-------------------|
| **Video Playback** | Availability | 99.99% | Rolling 30 days |
| **Video Playback** | Start Time (p50) | <200ms | Per region |
| **Video Playback** | Rebuffering | <0.5% | Per session |
| **API Gateway** | Availability | 99.99% | Rolling 30 days |
| **API Gateway** | Latency (p95) | <100ms | Rolling 1 hour |
| **Recommendations** | Availability | 99.9% | Rolling 30 days |
| **Recommendations** | Latency (p99) | <50ms | Rolling 1 hour |
| **Search** | Latency (p95) | <200ms | Rolling 1 hour |
| **Content Catalog** | Availability | 99.99% | Rolling 30 days |
| **Personalization** | Freshness | <1 hour | Per user |

### Error Budgets

| Service | SLO | Error Budget (30 days) |
|---------|-----|------------------------|
| Video Playback | 99.99% | 4.3 minutes |
| API Gateway | 99.99% | 4.3 minutes |
| Recommendations | 99.9% | 43.2 minutes |
| Search | 99.9% | 43.2 minutes |

### SLA (External Commitment)

| Metric | Commitment | Remedy |
|--------|------------|--------|
| Monthly Availability | 99.9% | Service credits |
| Planned Maintenance | <4 hours/month | 48-hour notice |
| Incident Response | <15 min (P1) | Status page update |

---

## Capacity Planning Summary

### Current Scale (2025)

| Resource | Capacity | Utilization |
|----------|----------|-------------|
| CDN Bandwidth | 400+ Tbps | 97.5% peak |
| API Servers | ~50,000 instances | Auto-scaling |
| CockroachDB Clusters | 380+ | Growing |
| Kafka Partitions | 100,000+ | Per topic scaling |
| EVCache Nodes | 10,000+ | Memory-optimized |

### Growth Projections (Year 2)

| Metric | Current | Year 2 | Growth |
|--------|---------|--------|--------|
| Memberships | 238M | 280M | +18% |
| Peak Concurrent | 65M | 85M | +31% |
| Events/Second | 38M | 50M | +32% |
| Storage | 2.5 PB | 4 PB | +60% |

### Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| API Latency (p95) | >150ms | Add API servers |
| Cache Hit Rate | <95% | Expand EVCache |
| Kafka Lag | >10 min | Add partitions/consumers |
| DB CPU | >70% | Add CockroachDB nodes |
| CDN Capacity | >80% | Deploy more Open Connect appliances |

---

*Next: [High-Level Design →](./02-high-level-design.md)*
