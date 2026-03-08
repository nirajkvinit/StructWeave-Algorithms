# 01 - Requirements & Estimations

## Functional Requirements

### Core Features (In Scope)

| # | Feature | Description |
|---|---------|-------------|
| F1 | **RSS Feed Ingestion** | Crawl, parse, and normalize 4.5M+ podcast RSS feeds with adaptive polling |
| F2 | **Audio Upload & Transcoding** | Creators upload audio; system transcodes to multiple formats/bitrates |
| F3 | **Episode Streaming & Download** | Progressive download and adaptive streaming with resume support |
| F4 | **Catalog & Search** | Full-text and semantic search across shows, episodes, and transcripts |
| F5 | **Personalized Discovery** | ML-powered recommendations, trending, curated playlists |
| F6 | **Subscription & Library** | Subscribe to shows, auto-download new episodes, manage library |
| F7 | **Playback Sync** | Cross-device playback position synchronization |
| F8 | **Analytics (IAB 2.2)** | Compliant download/listen measurement, bot filtering, attribution |
| F9 | **Dynamic Ad Insertion** | Server-side ad stitching with targeting, frequency capping |
| F10 | **Creator Dashboard** | Upload, scheduling, analytics, monetization controls |
| F11 | **AI Transcription & Chapters** | Auto-generated transcripts, chapter markers, show notes |
| F12 | **Offline Playback** | Download episodes for offline listening with storage management |

### Out of Scope

- Live podcast streaming (covered in Twitch 5.7)
- Video podcasting (hybrid with YouTube)
- Social features (comments, community) — minimal, not core
- Music licensing / music streaming
- Podcast hosting infrastructure (we are the consumer platform, not the host)

---

## Non-Functional Requirements

### CAP Theorem Choice

**AP (Availability + Partition Tolerance)** with eventual consistency for most services.

| Service | Consistency Model | Justification |
|---------|-------------------|---------------|
| Feed Catalog | Eventual (15 min) | RSS is inherently eventually consistent |
| Playback Position | Eventual (5s) | Last-write-wins across devices |
| Analytics Events | Eventual (minutes) | Batch processing acceptable |
| Subscription State | Strong (per-user) | User expects immediate feedback |
| Ad Decisioning | Strong (per-request) | Frequency caps must be accurate |
| Creator Uploads | Strong | Must confirm upload success |

### Availability Target

| Tier | Target | Applies To |
|------|--------|------------|
| Tier 0 | 99.99% (52 min/year) | Audio streaming / CDN |
| Tier 1 | 99.95% (4.4 hr/year) | Search, recommendations, playback sync |
| Tier 2 | 99.9% (8.7 hr/year) | Creator dashboard, analytics |
| Tier 3 | 99.5% | Feed ingestion pipeline (can catch up) |

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Episode playback start | < 500ms | < 1.5s | < 3s |
| Search results | < 200ms | < 500ms | < 1s |
| Feed discovery page | < 300ms | < 800ms | < 1.5s |
| Playback position sync | < 1s | < 3s | < 5s |
| Ad decision + stitch | < 100ms | < 250ms | < 500ms |
| Feed ingestion (new episode available) | < 15 min | < 30 min | < 60 min |

### Durability Guarantees

| Data Type | Durability | Mechanism |
|-----------|------------|-----------|
| Audio files | 99.999999999% (11 nines) | Object storage with cross-region replication |
| User data | 99.9999% | Replicated databases with point-in-time recovery |
| Analytics events | 99.99% | Write-ahead log + async replication |
| Transcripts | 99.999% | Object storage (regeneratable) |

---

## Capacity Estimations (Back-of-Envelope)

### Assumptions

- 600M global podcast listeners (2026 projection)
- 20% are on our platform = **120M MAU**
- 40% DAU ratio = **48M DAU**
- Average session: 35 minutes, 1.5 episodes
- Average episode: 40 minutes, 50MB (128kbps MP3)
- 4.5M podcasts, 200M total episodes
- 50K new episodes published daily

### Traffic Estimations

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| MAU | 120M | 600M × 20% platform share |
| DAU | 48M | 120M × 40% DAU ratio |
| Read:Write Ratio | ~200:1 | Streaming vs publishing |
| Episodes streamed/day | 72M | 48M DAU × 1.5 episodes |
| QPS (streaming, avg) | 833 req/s | 72M / 86,400s |
| QPS (streaming, peak) | 4,200 req/s | 5× avg (morning/evening commute) |
| QPS (search, avg) | 280 req/s | ~24M searches/day |
| QPS (feed poll, avg) | 520 req/s | 4.5M feeds / (avg 2.4hr interval) |
| New episodes/day | 50K | Industry data |
| Playback sync events/day | 144M | 48M × 3 position saves/session |

### Storage Estimations

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Total audio catalog | 10 PB | 200M episodes × 50MB avg |
| Annual audio growth | 912 TB/yr | 50K episodes/day × 50MB × 365 |
| Transcoded variants | 30 PB | 3 formats × 10 PB |
| Transcripts | 200 TB | 200M episodes × 1MB avg text |
| Metadata DB | 500 GB | 200M episodes × 2.5KB |
| User data (profiles, subs) | 1.2 TB | 120M users × 10KB |
| Analytics events/day | 5 TB | 500M events × 10KB |
| Analytics (Year 1) | 1.8 PB | 5 TB/day × 365 |
| Cache (hot episodes) | 50 TB | Top 1% of catalog |

### Bandwidth Estimations

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Egress (avg) | 28 Gbps | 72M × 50MB / 86,400s × 8 bits |
| Egress (peak) | 140 Gbps | 5× average |
| Ingress (uploads) | 200 Mbps | 50K × 50MB / 86,400s × 8 bits |
| CDN edge traffic | 120 Gbps | 85% served from edge cache |

---

## SLOs / SLAs

| Metric | SLO Target | SLA (External) | Measurement |
|--------|------------|-----------------|-------------|
| Availability (streaming) | 99.99% | 99.95% | Synthetic probes + real user monitoring |
| Playback start latency (p99) | < 3s | < 5s | Client-side telemetry |
| Search latency (p99) | < 1s | < 2s | Server-side instrumentation |
| Feed freshness | < 15 min | < 60 min | Feed ingestion lag metric |
| Ad decision latency (p99) | < 500ms | < 1s | DAI pipeline instrumentation |
| Error rate (streaming) | < 0.01% | < 0.1% | 5xx responses / total requests |
| Analytics accuracy | IAB 2.2 compliant | Certified | Annual IAB audit |
| Data durability | 99.999999999% | 99.9999% | Object storage SLA |

### Error Budget Policy

| SLO | Monthly Budget | Burn Rate Alert |
|-----|---------------|-----------------|
| Streaming 99.99% | 4.3 min downtime | Alert at 50% burn in first 25% of window |
| Search 99.95% | 21.6 min downtime | Alert at 50% burn in first 25% of window |
| Feed freshness | 15 min p99 lag | Alert when p99 > 20 min |

---

## Key Differences from Other Media Platforms

| Aspect | Podcast Platform | Video Platform (YouTube) | Music Platform (Spotify) |
|--------|-----------------|-------------------------|-------------------------|
| Content Source | RSS federation + direct upload | Direct upload only | Licensed catalog |
| File Size | 20-150MB per episode | 100MB-10GB per video | 3-10MB per track |
| Consumption | Sequential, long-form (30-90 min) | Variable, visual attention | Short tracks, shuffled |
| Discovery | Less algorithm-dependent, word-of-mouth heavy | Algorithm-dominated | Playlist-dominated |
| Measurement | IAB 2.2 standard (industry-specific) | View count heuristics | Stream count |
| Monetization | DAI + host-read ads + subscriptions | Pre-roll/mid-roll video ads | Subscription + free tier ads |
| Transcoding | Audio-only, fewer variants | Video + audio, many variants | Audio-only, DRM-heavy |
