# Interview Guide — Online Learning Platform

## 1. 45-Minute Pacing Guide

### Phase 1: Requirements Clarification (5 minutes)

**What to establish upfront:**

| Question | Why It Matters |
|---|---|
| "Are we designing for recorded courses, live sessions, or both?" | Live sessions add WebRTC/real-time infrastructure; recorded-only simplifies to CDN + VOD |
| "How many concurrent learners at peak?" | 100K vs. 5M concurrent streams changes CDN architecture fundamentally |
| "Do we need certificates or credentials?" | Adds credential issuance, verification API, optional blockchain anchoring |
| "Is content free or monetized?" | Monetization adds payment processing, subscription management, DRM requirements |
| "Do we need offline support?" | Offline adds DRM license persistence, local storage encryption, progress sync protocol |
| "Single language or multi-language?" | Multi-language adds subtitle processing, auto-captioning pipeline, RTL support |

**Clarifying questions that impress interviewers:**
- "Should we support adaptive learning paths, or is the course structure fixed by the instructor?"
- "Do we need to handle code execution for programming courses, or just video + quizzes?"
- "Is content DRM-protected, or is it okay if learners can download and share videos?"
- "Do we need enterprise B2B features like SSO, seat management, and compliance reporting?"

### Phase 2: High-Level Architecture (10 minutes)

**Draw these components on the whiteboard:**

1. **Client Layer** — Web app, mobile apps (iOS/Android), with offline capability
2. **CDN Layer** — Multi-CDN for adaptive bitrate video delivery (HLS/DASH), DRM encryption
3. **API Gateway** — Auth, rate limiting, routing; GraphQL for client-driven queries
4. **Content Pipeline** — Upload → transcode (multi-bitrate) → DRM encrypt → distribute to CDN
5. **Core Services** — Organized by domain:
   - Course domain (catalog, content graph, search)
   - Learner domain (progress tracking, enrollment, profile)
   - Assessment domain (quiz engine, peer review, plagiarism detection)
   - Credential domain (certificate generation, Open Badges, verification)
6. **Data Layer** — Relational DB (courses, users), time-series DB (progress events), search index, object storage (video), cache
7. **AI/ML Layer** — Recommendation engine, adaptive learning, engagement prediction

**Key narrative:** "The core insight is that video delivery and progress tracking have fundamentally different architectural requirements. Video is a read-heavy, bandwidth-dominated CDN problem—cache video segments at the edge and let the CDN handle scale. Progress tracking is a write-heavy, consistency-critical stateful problem—every progress event must be durably recorded because losing a learner's progress is as bad as losing a bank transaction. The architecture cleanly separates these two concerns: video goes through CDN, progress goes through an event-sourced pipeline with strong durability guarantees."

### Phase 3: Deep Dive (20 minutes)

The interviewer will likely ask you to dive into one of these areas. Be prepared for all:

**Option A: Video Delivery Pipeline**
- Transcoding: raw upload → multi-bitrate encoding (1080p, 720p, 480p, 360p, audio-only)
- CMAF packaging: single segment format serving both HLS and DASH
- DRM: Widevine (Chrome/Android), FairPlay (Safari/iOS), PlayReady (Edge/Windows)
- Multi-CDN: primary handles 70%, secondary 30%, health-check-based failover
- ABR algorithm: buffer-based quality selection with hysteresis to prevent oscillation
- Offline downloads: persistent DRM license (30 days validity, 48-hour playback window)

**Option B: Progress Tracking System**
- Event sourcing: append-only progress events, materialized views for current state
- Cross-device sync: per-device position tracking, MAX position for resume
- Deduplication: (user_id, lesson_id, session_id, sequence) as idempotency key
- Video watch tracking: interval-based watched-seconds aggregation (handle seeking/rewatching)
- Completion calculation: weighted by content type (assessments count more than videos)
- Offline sync: local SQLite buffer → batch upload on reconnection → server-side merge

**Option C: Assessment Engine**
- Anti-cheating: randomized questions from pool (3x pool size), randomized option order
- Server-side grading: correct answers never sent to client
- Code execution: ephemeral sandboxed containers (CPU/memory/time/network limits)
- Peer review: reviewer assignment algorithm, outlier removal, weighted grade aggregation
- Adaptive questions: IRT-based question selection (Fisher information maximization)

**Option D: Recommendation Engine**
- Hybrid: collaborative filtering + content-based + popularity signals
- Collaborative: user embeddings → approximate nearest neighbors → find similar learners
- Content-based: skill gap analysis → match courses to missing skills
- Cold start: onboarding quiz for new users, content features for new courses
- Business rules: diversity constraints (max 3 per instructor, multi-category in top 10)

### Phase 4: Trade-offs and Extensions (10 minutes)

**Key trade-offs to discuss proactively:**

| Trade-off | Option A | Option B | Your Recommendation |
|---|---|---|---|
| **Progress granularity** | Every second (high storage, precise resume) | Every 5 seconds (lower storage, slight imprecision) | 5-second batches; 90%+ watch counts as complete |
| **DRM level** | Full DRM (Widevine L1, HDCP required) | Token-signed URLs only (no DRM) | Full DRM for paid content; signed URLs for free |
| **Search architecture** | Embedded in relational DB | Dedicated search engine | Dedicated search engine (CQRS); relational as source of truth |
| **Recommendation freshness** | Real-time per request | Pre-computed, 6-hour refresh | Pre-computed with event-triggered refresh on course completion |
| **Certificate verification** | Centralized DB lookup | Blockchain-anchored | DB lookup + optional blockchain for high-value credentials |
| **Transcoding strategy** | Eager (transcode all on upload) | Lazy (transcode on first view) | Eager for enrolled courses; lazy for long-tail |

---

## 2. Common Interview Questions

### 2.1 System Design Questions

**Q: "How would you ensure a learner's video progress is never lost, even if they close the browser mid-video?"**

**Strong answer:**
"I'd use a three-layer approach. First, the video player sends progress events every 5 seconds to the server via a batch API—this handles normal operation. Second, the browser's `beforeunload` event triggers a final synchronous progress save using the Beacon API, which completes even as the tab closes. Third, the client stores progress in localStorage as a fallback. On the next session, the client sends any unsaved local progress before requesting the server's state. On the server side, progress events are written to an event-sourced log with 3-way replication, so even if one node fails mid-write, the event is durable. The materialized progress state is rebuilt from the event log, with periodic snapshots for fast reconstruction. This combination means progress survives browser crashes, network failures, and server failures."

**Q: "How would you handle 5 million concurrent video streams?"**

**Strong answer:**
"The key is that video delivery is fundamentally a CDN problem, not an origin server problem. The 5 million streams are served by the CDN's edge PoPs globally—our origin servers never see anywhere close to that traffic. With a 95%+ cache hit ratio, the origin handles only about 250K requests/sec for cache misses. I'd use a multi-CDN strategy—70% to the primary CDN, 30% to a secondary—with real-time health monitoring that shifts traffic on degradation. An origin shield (regional cache between edge and origin) further reduces origin load. The video manifests have 30-second CDN TTLs so they're heavily cached. The only origin-hitting traffic is long-tail content with low view counts; for those, I'd consider on-demand transcoding (store only the source, transcode when someone actually watches)."

**Q: "How would you detect and prevent cheating on assessments?"**

**Strong answer:**
"I'd implement defense in depth across four layers. First, question integrity: maintain a pool 3–5x the quiz size, randomize both question order and option order per learner, and use parameterized questions (different numbers for each learner). Correct answers never leave the server. Second, session integrity: server-side timers (the client timer is cosmetic), one active session per user, and submission locked to the session that started it. Third, post-submission analysis: compare answer patterns across submissions to detect sharing, analyze time-per-question (instant correct answers after long pauses suggest lookup), and run plagiarism detection on essays and code. For code, I'd use AST-level comparison that's resistant to variable renaming. Fourth, for high-stakes exams, optional proctoring via webcam with AI-based anomaly detection. The important principle is that most learners are honest—the system should be invisible to them while making cheating unreliable for dishonest ones."

### 2.2 Deep Dive Questions

**Q: "Walk me through what happens when an instructor uploads a 45-minute lecture video."**

**Strong answer:**
"The upload uses resumable chunked uploads—the file is split into 5 MB chunks, each with a SHA-256 hash for integrity. The upload service reassembles chunks, runs virus scanning, and stores the raw file in object storage. Then the transcoding pipeline activates: first, it probes the file for metadata (codec, resolution, duration). It splits the video at scene boundaries into ~30-second chunks and fans out parallel encoding jobs—each chunk encoded to 5 renditions (1080p, 720p, 480p, 360p, audio-only) using two-pass variable bitrate for consistent quality. That's ~90 encoding tasks for a 45-minute video. The encoded chunks are merged per rendition, then segmented into 6-second CMAF segments serving both HLS and DASH. DRM encryption is applied (Widevine + FairPlay + PlayReady keys), manifests are generated, thumbnails and preview sprites are extracted, and auto-captioning generates a subtitle track. The whole process takes 30–90 minutes depending on GPU worker availability. On completion, segments are pushed to CDN origin, and the course service is notified that the video is ready for the instructor to review and publish."

**Q: "How would you design the course recommendation engine?"**

**Strong answer:**
"I'd use a hybrid approach with three signals. Collaborative filtering finds learners with similar course histories using pre-computed user embeddings and approximate nearest neighbors—if learners who took courses A, B, C also took course D, and you've taken A, B, C, then D is recommended. Content-based filtering computes skill gap analysis—it maps your completed courses to skills acquired, identifies skill gaps relative to your learning goals, and recommends courses that fill those gaps. The third signal is popularity-weighted by recency—trending courses get a boost. I'd blend these with weights (45% collaborative, 35% content, 15% popularity, 5% recency), then apply business rules: no more than 3 courses from the same instructor, at least 3 different categories in the top 10, and boost courses matching the user's subscription tier. For cold start, new users get an onboarding quiz that maps to skill areas, and new courses get content-based features until enough interaction data accumulates. The recommendations are pre-computed and cached with a 6-hour TTL, refreshed on course completion."

### 2.3 Estimation Questions

**Q: "Estimate the storage needed for video content on a platform with 500,000 courses."**

**Strong answer:**
"Let me work through this. Average course has 30 lectures at 12 minutes each, so about 6 hours of content per course. For the source video at 1080p, that's roughly 1.5 GB per hour of content, so about 9 GB per course source. But we need multiple renditions: 1080p at 5 Mbps, 720p at 2.5 Mbps, 480p at 1 Mbps, 360p at 500 Kbps, and audio-only at 128 Kbps. The combined bitrate is about 9 Mbps, which is 4 GB per hour. So 6 hours × 4 GB = about 24 GB per course in renditions, plus 9 GB source. Using CMAF to serve both HLS and DASH from the same segments saves about 40% versus dual packaging. So roughly 24 GB per course with CMAF. Across 500,000 courses: 500K × 24 GB = 12 PB for renditions plus 4.5 PB for source files. Total: roughly 16–17 PB. With 10,000 new lectures daily at about 8 GB each, that's 80 TB/day growth. I'd use tiered storage—popular courses on fast storage, long-tail on cold storage—and consider storing only the source for rarely-viewed courses, transcoding on-demand."

---

## 3. Trap Questions and Anti-Patterns

### 3.1 Common Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| **Sending correct answers to the client** | Trivially inspected via browser dev tools; undermines all assessment integrity | Server-side grading only; client sends answers, server returns score |
| **Storing progress as a single percentage** | Loses granularity; can't resume to exact position; can't track which parts were watched | Event-sourced progress with per-second tracking; percentage is a derived view |
| **Single CDN provider** | Single point of failure for 90%+ of bandwidth; no leverage for pricing | Multi-CDN with health-based failover; origin shield |
| **Relational DB for progress events** | 500K events/sec write-heavy pattern destroys relational DB; wrong tool | Time-series DB or event streaming platform with append-only writes |
| **Synchronous transcoding** | 45-minute video takes 30–90 minutes to transcode; blocks the upload API | Async transcoding pipeline with task queue; webhook on completion |
| **Ignoring DRM for paid content** | Videos easily ripped and redistributed; instructor trust destroyed | Multi-DRM (Widevine + FairPlay + PlayReady) with forensic watermarking |
| **Progress updates in real-time DB** | Every 5-second heartbeat → 500K writes/sec → DB saturated | Event streaming buffer → batch persistence → cache for reads |

### 3.2 Trick Questions

**"Why not just use a relational database for everything?"**

**Answer:** "Different access patterns need different storage engines. Course metadata is read-heavy with complex joins—perfect for a relational DB. Progress events are write-heavy, append-only, and time-keyed—a time-series DB handles this 10–100x better. Search needs inverted indexes and faceted aggregation—a search engine is purpose-built for this. Video segments are large binary blobs with CDN-integrated delivery—object storage is the only viable option. Using a relational DB for everything would work at small scale (1,000 users) but would catastrophically fail at 10 million users, specifically on the progress event writes."

**"Can you just store video in a database?"**

**Answer:** "Technically possible with BLOB columns, but architecturally terrible. Video files average 8 GB per lecture across renditions. Databases aren't designed for multi-GB objects—they cause transaction log bloat, backup/restore nightmares, and eliminate CDN integration. Object storage is purpose-built for this: virtually unlimited scale, CDN-native (direct edge delivery), lifecycle policies for cost optimization, and cross-region replication. The database stores video metadata and URLs pointing to object storage."

**"Why not compute recommendations in real-time for each request?"**

**Answer:** "At 50M MAU with 200K active users at any moment, real-time recommendation means running the full collaborative filtering + content-based pipeline 200K times per second. The collaborative filtering step alone involves nearest-neighbor search across 100M+ user embeddings. Instead, pre-compute recommendations offline (batch or near-real-time) and cache per user. The cache is refreshed every 6 hours or on significant events (course completion). This reduces recommendation serving to a cache lookup—sub-10ms vs. 500ms+ for real-time computation."

---

## 4. Scoring Rubric

### 4.1 Junior Level (Pass: 3/5 areas)

| Area | Expectation |
|---|---|
| **Requirements** | Identifies video delivery, progress tracking, and assessments as core |
| **Architecture** | Draws client → API → backend → database; mentions CDN for video |
| **Data Model** | Course and user tables; basic enrollment relationship |
| **Scaling** | Mentions CDN caching; may suggest database read replicas |
| **Trade-offs** | Identifies at least one: storage vs. compute for transcoding |

### 4.2 Senior Level (Pass: 5/7 areas)

| Area | Expectation |
|---|---|
| **Requirements** | Comprehensive list including DRM, offline, multi-device sync, credentials |
| **Architecture** | Microservices by domain; event-driven progress; multi-CDN; content pipeline |
| **Data Model** | Event-sourced progress; separate storage engines per access pattern |
| **Deep Dive** | Can go deep on at least 2 of: video pipeline, progress tracking, assessment engine, recommendations |
| **Scaling** | Multi-region; database sharding by user_id; CDN origin shield; tiered storage |
| **Security** | DRM architecture; assessment integrity; FERPA/COPPA awareness |
| **Trade-offs** | Articulates 3+ trade-offs with clear reasoning and recommendation |

### 4.3 Staff Level (Pass: 7/8 areas)

| Area | Expectation |
|---|---|
| **Requirements** | Numbers-driven estimation; SLO definitions; growth projections |
| **Architecture** | CQRS for catalog; event sourcing for progress; GraphQL for multi-client; CMAF for dual HLS/DASH |
| **Data Model** | IRT for adaptive assessments; watched-interval tracking; Merkle tree for certificate batching |
| **Deep Dive** | Detailed knowledge of ABR algorithms, DRM license flow, Kalman-filter-like question selection |
| **Scaling** | Cost optimization (spot instances for transcoding, tiered storage, lazy transcoding for long-tail) |
| **Security** | Full threat model; forensic watermarking; blockchain credential anchoring |
| **Trade-offs** | Discusses second-order effects (DRM latency impact on TTFB, event sourcing snapshot frequency trade-offs) |
| **Operational** | SLO error budgets; chaos engineering experiments; graceful degradation levels |

---

## 5. System Design Comparison

### 5.1 How This Differs from Similar Systems

| Compared To | Key Differences |
|---|---|
| **Video Streaming (entertainment)** | Learning platform adds: progress tracking with resume, assessments, credentials, content hierarchy with prerequisites, peer review. Entertainment adds: recommendation at much larger scale, live streaming at massive concurrency, content licensing complexity. |
| **Document Collaboration (e.g., shared editing)** | Both need real-time sync, but learning platform syncs progress state (write-heavy, user-scoped) while collaboration syncs document state (read-write, multi-user conflict resolution with CRDTs). |
| **E-commerce** | Learning platform's "purchase" is enrollment with ongoing access (vs. one-time delivery). Progress tracking has no e-commerce equivalent. Both need payment, search, and recommendations, but learning adds credential issuance. |
| **Social Network** | Both have user profiles and content feeds, but learning platform content is structured (hierarchical courses vs. flat posts), consumption is sequential (progress through ordered lessons), and the platform has an explicit assessment/grading system. |

### 5.2 Extension Questions

| Extension | Key Considerations |
|---|---|
| **Add live cohort-based courses** | WebRTC infrastructure, real-time chat, session recording, timezone scheduling, cohort management |
| **Add interactive coding labs** | Cloud IDE (container per user), persistent workspace, real-time collaboration, resource quotation |
| **Add mobile offline for enterprise** | MDM integration, enterprise DRM policies, offline assessment support, bulk content pre-loading |
| **Add AI tutoring assistant** | LLM integration, course-context-aware Q&A, guardrails against revealing assessment answers, per-query cost management |
| **Add marketplace for instructor content** | Revenue sharing, content quality scoring, dispute resolution, tax compliance, instructor payouts |

---

*Next: [Insights ->](./09-insights.md)*
