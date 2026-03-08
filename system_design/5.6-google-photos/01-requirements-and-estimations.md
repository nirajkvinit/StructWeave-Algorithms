# Google Photos — Requirements & Estimations

## Functional Requirements

### Core Features (In Scope)

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Photo/Video Upload** | Upload photos and videos from mobile devices, web, and desktop; support chunked/resumable uploads |
| F2 | **Auto Backup** | Automatically back up camera roll to the cloud in background; support Wi-Fi-only and metered network options |
| F3 | **Photo Browsing** | Browse photos chronologically, by album, by location, by people; infinite scroll with thumbnails |
| F4 | **Image/Video Viewing** | View full-resolution images with zoom/pan; stream video with adaptive bitrate |
| F5 | **Search** | Visual search by content ("beach", "dog"), people (face clusters), location, date, text in images (OCR) |
| F6 | **Face Grouping** | Automatically detect and cluster faces across the photo library; allow user labeling |
| F7 | **Albums** | Create, edit, and organize albums manually; auto-suggested albums |
| F8 | **Sharing** | Share individual photos, albums, or library via links; partner sharing; shared albums with comments |
| F9 | **Memories** | Auto-curated highlights from past photos surfaced based on date, people, location |
| F10 | **AI Editing** | Magic Eraser (object removal), Best Take (face swap), Photo Unblur, enhance/filters |
| F11 | **Multi-Device Sync** | Sync photo library across all devices; show consistent state |
| F12 | **Storage Management** | Show storage usage; offer quality tiers (Original vs Storage Saver); free up device space |
| F13 | **Trash & Recovery** | Soft delete with 60-day retention; permanent deletion |
| F14 | **Download & Export** | Download individual or bulk photos; Google Takeout integration |

### Out of Scope

- Social feed / discovery (not a social network)
- Live streaming
- Professional photo editing (Lightroom-level features)
- Photo printing / physical products
- Camera hardware integration beyond standard APIs

---

## Non-Functional Requirements

### CAP Theorem Analysis

| Dimension | Choice | Justification |
|-----------|--------|---------------|
| **Consistency vs Availability** | AP with tunable consistency | Photo viewing must always be available; metadata updates use strong consistency via Spanner |
| **Partition Tolerance** | Required | Multi-region deployment across Google's global network |

**Consistency Model:**
- **Photo Metadata**: Strong consistency (Spanner — linearizable reads) — ensures album membership, sharing permissions, and deletion are immediately consistent
- **Photo Blobs**: Eventual consistency — blob replication across regions is async, but reads are served from nearest replica with version checking
- **ML Features**: Eventual consistency — face clusters and search indices update asynchronously post-upload
- **Sync State**: Causal consistency — device sync tokens ensure each device sees a causally ordered view

### Availability Target

| Component | Target | Justification |
|-----------|--------|---------------|
| Photo Viewing/Browsing | 99.99% (52 min/year) | Core user-facing feature, must always be available |
| Upload Service | 99.95% (4.4 hrs/year) | Uploads can be retried; resumable upload protocol handles interruptions |
| Search | 99.9% (8.8 hrs/year) | ML-dependent, can degrade gracefully |
| ML Pipeline | 99.5% (1.8 days/year) | Async processing; delays acceptable |
| Sharing | 99.95% (4.4 hrs/year) | Time-sensitive but not mission-critical |

### Latency Targets

| Operation | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Thumbnail load (grid view) | 50ms | 150ms | 300ms |
| Full-resolution image load | 200ms | 500ms | 1s |
| Search query response | 150ms | 400ms | 800ms |
| Upload initiation | 100ms | 300ms | 500ms |
| Face cluster update (post-upload) | 30s | 2 min | 10 min |
| Album listing | 80ms | 200ms | 400ms |

### Durability Guarantees

| Guarantee | Target | Mechanism |
|-----------|--------|-----------|
| Photo data durability | 99.999999999% (11 nines) | Erasure coding + geo-replication across 3+ regions |
| Metadata durability | 99.999999999% | Spanner synchronous replication (5+ replicas) |
| Deletion compliance | Permanent within 60 days | Trash retention + crypto-shredding |

---

## Capacity Estimations (Back-of-Envelope)

### User Scale

| Metric | Value | Calculation |
|--------|-------|-------------|
| Monthly Active Users (MAU) | 1.5 billion | Confirmed May 2025 (10th anniversary) |
| Daily Active Users (DAU) | 750 million | ~50% of MAU (high engagement product) |
| Photos per user (avg library) | ~6,000 | 9 trillion total / 1.5B users |
| New photos/day per active user | ~5.3 | 4B daily uploads / 750M DAU |

### Upload Traffic

| Metric | Value | Calculation |
|--------|-------|-------------|
| Weekly uploads | 28 billion | Google public disclosure (2020; likely higher now) |
| Daily uploads | ~4 billion | 28B / 7 |
| Uploads per second (avg) | ~46,000 | 4B / 86,400 |
| Uploads per second (peak) | ~140,000 | 3x average (morning/evening spikes) |
| Average photo size (Original) | 5 MB | Mix of phone cameras (12-50 MP) |
| Average photo size (Storage Saver) | 2 MB | Compressed to ≤16 MP |
| Daily upload bandwidth | 20 PB | 4B × 5 MB (Original quality) |

### Read Traffic

| Metric | Value | Calculation |
|--------|-------|-------------|
| Read:Write ratio | 10:1 | Users browse far more than upload |
| Daily photo views | 40 billion | 10 × 4B uploads |
| Views per second (avg) | ~460,000 | 40B / 86,400 |
| Views per second (peak) | ~1.4M | 3x average |
| Avg thumbnail served | 30 KB | 256×256 JPEG/WebP |
| Avg full-res served | 2 MB | WebP-compressed serving copy |
| Daily read bandwidth | ~80 PB | Mix of thumbnails and full-res |

### Storage

| Metric | Value | Calculation |
|--------|-------|-------------|
| Total photos stored | 9+ trillion | Google public disclosure (May 2025) |
| Average stored size per photo | 3 MB | Mix of original, Storage Saver, thumbnails |
| Total raw storage | ~27 EB | 9T × 3 MB |
| With erasure coding (1.4x) | ~38 EB | Reed-Solomon (10,4) coding |
| Colossus filesystem capacity | 10+ EB per filesystem | Multiple filesystems in use |
| Daily storage growth | ~20 PB | 4B × 5 MB/photo |
| Annual storage growth | ~7.3 EB | 20 PB × 365 |
| Metadata per photo | ~2 KB | EXIF, ML labels, face vectors, album refs |
| Total metadata | ~18 TB | 9T × 2 KB |

### ML Processing

| Metric | Value | Calculation |
|--------|-------|-------------|
| ML models per photo | 10-15 | Classification, detection, face, OCR, quality, etc. |
| Total ML inferences/day | ~48 billion | 4B uploads × ~12 models |
| ML inferences/second (avg) | ~555,000 | 48B / 86,400 |
| Face embeddings generated/day | ~7.2 billion | ~1.8 faces/photo × 4B photos |
| Embedding storage per face | 512 bytes | 128-dim float32 vector |
| Total labels applied | 2+ trillion | Across all stored photos |

### Search

| Metric | Value | Calculation |
|--------|-------|-------------|
| Monthly search users | 370 million | Google public disclosure (May 2025) |
| Search queries per day | ~600 million | ~1.6 queries/day per search-active user |
| Search QPS (avg) | ~7,000 | 600M / 86,400 |
| Search QPS (peak) | ~21,000 | 3x average |
| Visual embedding per photo | 2 KB | 512-dim float32 vector |
| Total search index size | ~18 TB | 9T × 2 KB |

---

## SLOs / SLAs

| Metric | Target | Measurement | Burn Rate Alert |
|--------|--------|-------------|-----------------|
| Availability (viewing) | 99.99% | Success rate of image load requests | >0.1% errors in 5 min |
| Availability (upload) | 99.95% | Upload completion success rate | >0.5% failures in 10 min |
| Latency (thumbnail p99) | <300ms | Server-side response time | p99 > 500ms for 5 min |
| Latency (search p95) | <400ms | End-to-end search response | p95 > 600ms for 10 min |
| Upload success rate | 99.9% | Completed uploads / initiated uploads | Drop below 99% in 5 min |
| ML processing freshness | <10 min (p99) | Time from upload to searchable | p99 > 30 min |
| Sync convergence | <30s (p95) | Time for change to appear on other devices | p95 > 2 min |
| Data durability | 11 nines | Annual data loss rate | Any data loss event |
| Deletion compliance | 100% within 60 days | Crypto-shredded within SLA | Any overdue deletion |

---

## Traffic Patterns

### Daily Pattern
```
Upload Volume
    │
  3x├─────────────────────────────────╮  ╭──────
    │                                 │  │
  2x├─────────────────────╮          ╰──╯
    │                     │
  1x├─╮  ╭──────╮        ╰──────╮
    │ │  │      │               │
    │ ╰──╯      ╰───────────────╯
    └──────────────────────────────────────────
    0   4   8   12  16  20  24  (hour UTC)
         Morning    Lunch   Evening   Night
         Peak       Spike   Peak      Low
```

### Seasonal Spikes
- **Holidays** (Christmas, New Year): 2-3x normal upload volume
- **Major Events** (Olympics, World Cup): Localized spikes
- **Vacation Seasons** (Summer, Spring Break): Sustained 1.5x elevation
- **New Phone Launches** (iPhone/Pixel release): Burst of first-time backups

### Geographic Distribution

| Region | % of Traffic | Peak Hours (UTC) |
|--------|-------------|-----------------|
| Asia-Pacific | 40% | 00:00 - 06:00 |
| Europe | 25% | 06:00 - 14:00 |
| Americas | 25% | 14:00 - 22:00 |
| Rest of World | 10% | Distributed |

---

## Cost Considerations

| Component | Estimated Annual Cost | Notes |
|-----------|----------------------|-------|
| Storage (raw + replication) | $500M - $1B+ | Exabyte-scale, internal cost |
| ML Compute (TPU/GPU) | $200M - $400M | 20B inferences/day |
| Network/Bandwidth | $100M - $200M | Petabytes/day egress |
| Serving Infrastructure | $100M - $200M | Billions of requests/day |
| **Revenue Model** | Google One subscriptions | $1.99/mo (100GB) to $9.99/mo (2TB) |

> **Key Insight:** Google Photos is a **loss leader** for most free-tier users, designed to drive Google One subscriptions and keep users in the Google ecosystem. The storage cost per free user (~$0.10/year) is subsidized by the ecosystem value.
