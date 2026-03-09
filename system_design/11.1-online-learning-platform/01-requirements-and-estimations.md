# Requirements & Estimations — Online Learning Platform

## 1. Functional Requirements

### 1.1 Core Features

| # | Feature | Description |
|---|---|---|
| F1 | **Video Delivery** | Adaptive bitrate streaming (HLS/DASH) with DRM protection, multi-CDN failover, and offline download |
| F2 | **Course Management** | Hierarchical content creation (Program > Course > Module > Lesson), versioning, and publishing workflow |
| F3 | **Progress Tracking** | Sub-second granularity progress recording with resume-to-exact-position across devices |
| F4 | **Assessment Engine** | Multiple question types, auto-grading, peer review orchestration, adaptive difficulty, plagiarism detection |
| F5 | **Recommendation Engine** | Personalized course suggestions, learning path generation, and skill gap analysis |
| F6 | **Certificate Issuance** | Verifiable digital credentials (Open Badges 3.0) with cryptographic signing and blockchain anchoring |
| F7 | **Search & Discovery** | Full-text search, faceted filtering, skill-based navigation, and trending courses |
| F8 | **Instructor Dashboard** | Revenue analytics, learner engagement metrics, content performance, and Q&A management |
| F9 | **Payment & Subscriptions** | Per-course purchase, subscription plans, enterprise licensing, refunds, and regional pricing |
| F10 | **Live Sessions** | Real-time webinar integration with chat, polls, Q&A, and recording for on-demand replay |

### 1.2 Extended Features

| # | Feature | Description |
|---|---|---|
| F11 | **Cohort-Based Learning** | Time-bound course runs with peer groups, deadlines, and collaborative assignments |
| F12 | **Gamification** | Streaks, badges, leaderboards, XP points, and achievement unlocks |
| F13 | **Discussion Forums** | Threaded discussions per course/lesson with upvoting, instructor endorsement, and moderation |
| F14 | **Multi-Language Support** | Subtitles, dubbing, auto-translation of course metadata, and RTL language support |
| F15 | **Mobile Offline** | Encrypted content download for offline viewing with progress sync on reconnection |
| F16 | **Enterprise B2B** | SSO integration (SAML/OIDC), seat management, custom catalogs, compliance reporting |
| F17 | **Content Moderation** | Automated + manual review for uploaded content quality, copyright, and policy compliance |
| F18 | **Notifications** | Multi-channel (email, push, in-app, SMS) for deadlines, recommendations, certificates, and promotions |
| F19 | **Accessibility** | WCAG 2.1 AA compliance, screen reader support, keyboard navigation, closed captions |
| F20 | **Analytics & Reporting** | Learning analytics, drop-off analysis, engagement heatmaps, and A/B testing framework |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Metric | Target | Rationale |
|---|---|---|
| **Video start time (TTFB)** | < 2 seconds (P95) | Learner abandonment increases 20% for every additional second of buffering |
| **Video rebuffer ratio** | < 0.5% of viewing time | Continuous playback is critical for learning flow state |
| **Page load time** | < 1.5 seconds (P95) | Course catalog, dashboard, lesson page loads |
| **Progress save latency** | < 500ms (P99) | Progress must feel instant; learners should never worry about losing progress |
| **Search query latency** | < 200ms (P95) | Course discovery must feel responsive |
| **Assessment submission** | < 1 second (P99) | Quiz answer recording and immediate feedback |
| **Certificate generation** | < 30 seconds | End-to-end from course completion to downloadable certificate |

### 2.2 Availability & Durability

| Metric | Target | Rationale |
|---|---|---|
| **Video playback availability** | 99.95% | 22 minutes/month max downtime; learners schedule study time |
| **Progress service availability** | 99.99% | 4.3 minutes/month; progress loss destroys learner trust permanently |
| **Assessment availability** | 99.95% | Timed exams cannot be interrupted without invalidation |
| **Progress data durability** | 99.9999999% (9 nines) | Progress data is irreplaceable; losing a learner's history is unrecoverable |
| **Video content durability** | 99.999999999% (11 nines) | Source video is the instructor's IP; loss means re-recording |
| **RPO (Recovery Point Objective)** | 0 for progress, < 1 hour for analytics | Zero progress data loss; analytics can tolerate short gaps |
| **RTO (Recovery Time Objective)** | < 5 minutes for video, < 2 minutes for progress | Fast failover to backup CDN; progress service is highest priority |

### 2.3 Scalability

| Dimension | Target |
|---|---|
| **Concurrent video streams** | 5M simultaneous streams at peak |
| **Registered users** | 150M+ total accounts |
| **Monthly active users** | 50M MAU |
| **Course catalog** | 500,000+ courses |
| **Progress events/sec** | 500,000 events/sec sustained, 1M burst |
| **Assessment submissions/day** | 15M/day (175/sec sustained, 500/sec burst) |
| **Video hours streamed/day** | 30M hours/day |
| **Content uploads/day** | 10,000 new video lectures/day |
| **Search queries/sec** | 50,000 QPS |

### 2.4 Security & Compliance

| Requirement | Description |
|---|---|
| **FERPA compliance** | Protect student education records; restrict unauthorized disclosure |
| **COPPA compliance** | Verifiable parental consent for users under 13; data minimization for minors |
| **GDPR / data privacy** | Right to erasure, data portability, consent management, data residency |
| **Content DRM** | Encrypted video with Widevine/FairPlay/PlayReady; prevent unauthorized downloading and redistribution |
| **Assessment integrity** | Anti-cheating measures: randomized questions, time limits, browser lockdown, plagiarism detection |
| **SOC 2 Type II** | Annual audit for security, availability, processing integrity, confidentiality |
| **PCI DSS** | Payment card data handling delegated to certified payment processor |
| **Accessibility** | WCAG 2.1 AA compliance for all learner-facing interfaces |

---

## 3. Capacity Planning

### 3.1 User Traffic Estimation

```
Total registered users:        150,000,000
Monthly active users (MAU):     50,000,000  (33% of registered)
Daily active users (DAU):       10,000,000  (20% of MAU)
Peak concurrent users:           5,000,000  (50% of DAU, concentrated in 4-hour peak)
Average session duration:        45 minutes
Sessions per DAU per day:        1.5

Peak requests per second:
  Page views:      10M DAU × 15 pages/session × 1.5 sessions / 86,400 sec
                 = ~2,600 page requests/sec average
                 = ~13,000 page requests/sec peak (5x multiplier)

  API calls:       10M DAU × 50 API calls/session × 1.5 sessions / 86,400 sec
                 = ~8,700 API calls/sec average
                 = ~43,500 API calls/sec peak

  Progress events: 10M DAU × 40 min video/session × 1 event/5 sec × 1.5 sessions / 86,400
                 = ~104,000 events/sec average
                 = ~520,000 events/sec peak
```

### 3.2 Video Delivery Estimation

```
Daily video hours streamed:     30,000,000 hours/day

Average bitrate (adaptive):     3 Mbps (weighted across quality levels)
Peak concurrent streams:        5,000,000

Peak bandwidth:
  5,000,000 streams × 3 Mbps = 15 Tbps peak CDN bandwidth

Video storage (source + renditions):
  Courses:                  500,000
  Avg lectures per course:  30
  Total lectures:           15,000,000
  Avg source duration:      12 minutes
  Source + renditions:      ~8 GB per lecture (1080p + 720p + 480p + 360p + audio-only)
  Total storage:            15M × 8 GB = 120 PB

  New uploads daily:        10,000 lectures/day
  Daily storage growth:     10,000 × 8 GB = 80 TB/day

CDN cache hit ratio target: > 95%
  (Popular courses are heavily cached; long tail served from origin)
```

### 3.3 Progress & Assessment Data

```
Progress events:
  Daily events:         10M DAU × 40 min × 12 events/min × 1.5 sessions
                      = 7.2 billion events/day
  Event size:           ~200 bytes (user_id, course_id, lesson_id, position, timestamp, metadata)
  Daily progress data:  7.2B × 200 bytes = ~1.44 TB/day
  Annual retention:     ~525 TB/year (before compression)
  With compression:     ~105 TB/year (5:1 compression ratio)

Assessment data:
  Submissions/day:      15,000,000
  Avg submission size:  2 KB (answers + metadata)
  Daily assessment data: 30 GB/day
  Grading results:      15M × 500 bytes = 7.5 GB/day
```

### 3.4 Search & Catalog

```
Course catalog:
  Courses:                500,000
  Avg metadata size:      10 KB (title, description, syllabus, tags, ratings)
  Total index size:       5 GB (fits in memory)
  Search QPS:             50,000 peak
  Faceted filters:        Category, difficulty, language, rating, duration, price

Autocomplete index:
  Terms:                  2,000,000 (course titles, instructor names, skills, topics)
  Prefix trie size:       ~200 MB
  Autocomplete latency:   < 50ms (P95)
```

### 3.5 Certificate & Credential

```
Course completions/month:       5,000,000
Certificates issued/month:      3,000,000 (60% opt for certificate)
Certificate verification/month: 1,000,000 (employers, institutions)

Certificate storage:
  PDF + metadata:         50 KB per certificate
  Monthly:                3M × 50 KB = 150 GB/month
  Open Badge metadata:    2 KB JSON per badge assertion
  Blockchain anchoring:   Batch 1,000 hashes per on-chain transaction (1 tx every ~3 minutes)
```

---

## 4. Service-Level Objectives (SLOs)

### 4.1 Tier 1 — Critical Path (Learner Experience)

| SLO | Target | Error Budget (30 days) |
|---|---|---|
| Video playback success rate | 99.95% | 21.6 minutes downtime |
| Progress save success rate | 99.99% | 4.3 minutes downtime |
| Video time-to-first-byte | P95 < 2s | 5% of requests may exceed |
| Progress save latency | P99 < 500ms | 1% of saves may exceed |
| Assessment submission success | 99.95% | 21.6 minutes downtime |

### 4.2 Tier 2 — Important (Platform Operations)

| SLO | Target | Error Budget (30 days) |
|---|---|---|
| Search availability | 99.9% | 43.2 minutes downtime |
| Course catalog page load | P95 < 1.5s | 5% of loads may exceed |
| Certificate generation | P95 < 30s | 5% may take longer |
| Recommendation latency | P95 < 500ms | 5% of requests may exceed |
| Payment processing success | 99.95% | 21.6 minutes downtime |

### 4.3 Tier 3 — Background (Analytics & ML)

| SLO | Target | Error Budget (30 days) |
|---|---|---|
| Analytics pipeline freshness | < 5 minutes lag | May lag longer during incidents |
| Recommendation model freshness | < 24 hours | Daily retraining cycle |
| Transcoding completion | P95 < 2 hours | 5% of uploads may take longer |
| Report generation | P95 < 5 minutes | Nightly batch reports |

---

## 5. Capacity Summary Table

| Resource | Estimation | Notes |
|---|---|---|
| **CDN bandwidth (peak)** | 15 Tbps | Multi-CDN required; no single provider handles this |
| **Video storage** | 120 PB | Source + all renditions across all courses |
| **Storage growth** | 80 TB/day | New uploads + rendition generation |
| **Progress event throughput** | 500K events/sec peak | Event streaming platform; horizontal scaling |
| **Progress data storage** | 105 TB/year | Compressed; 3-year hot retention |
| **API gateway throughput** | 43.5K RPS peak | Auto-scaling API gateway fleet |
| **Search index size** | 5 GB | In-memory; replicated across search nodes |
| **Assessment grading throughput** | 175 submissions/sec | Auto-scaling grading workers; code execution sandboxed |
| **Certificate generation** | ~1.2/sec sustained | Batch-optimized; PDF + badge + optional blockchain |
| **Database connections** | 50K+ concurrent | Connection pooling; read replicas for catalog |
| **Notification throughput** | 100M notifications/day | Email, push, in-app; batched where possible |

---

## 6. Growth Projections

| Metric | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Registered users | 100M | 150M | 220M |
| MAU | 30M | 50M | 75M |
| Courses | 300K | 500K | 800K |
| Video storage | 70 PB | 120 PB | 200 PB |
| Progress events/sec (peak) | 300K | 500K | 800K |
| CDN bandwidth (peak) | 10 Tbps | 15 Tbps | 25 Tbps |
| Revenue model complexity | B2C dominant | B2B + B2C | B2B + B2C + B2G |

### Key Scaling Triggers

| Trigger | Threshold | Action |
|---|---|---|
| CDN cache miss ratio > 10% | Origin bandwidth doubles | Add CDN tier, increase cache TTL, pre-warm popular content |
| Progress event queue depth > 100K | Consumer lag > 30 sec | Add consumer partitions, increase consumer group size |
| Search P95 latency > 300ms | Index size exceeds single node memory | Shard search index by category/language |
| Assessment grading latency > 5s | Queue depth > 50K | Scale grading workers, add code execution sandboxes |
| Video transcoding backlog > 10K | Upload-to-publish SLA at risk | Add transcoding workers, prioritize by instructor tier |

---

*Next: [High-Level Design ->](./02-high-level-design.md)*
