# Requirements & Estimations — Live Classroom System

## Functional Requirements

### Core Features (Must-Have)

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Live Video/Audio Conferencing** | Real-time multi-party video/audio with role-based permissions (instructor, student, teaching assistant) |
| F2 | **Screen Sharing** | Full-screen, window, or tab sharing with annotation overlay capability |
| F3 | **Collaborative Whiteboard** | Multi-user real-time drawing canvas with vector objects, text, shapes, sticky notes, and laser pointer |
| F4 | **Breakout Rooms** | Dynamic creation, assignment (manual/random/pre-set), timed sessions with auto-return, instructor broadcast |
| F5 | **Chat System** | In-session text chat with threading, @mentions, file attachments, and instructor-only mode |
| F6 | **Engagement Tools** | Live polls, Q&A with upvoting, hand raise queue, emoji reactions, attendance check |
| F7 | **Session Recording** | Multi-track recording with whiteboard replay, chat transcript, and timeline-synced playback |
| F8 | **Attendance Tracking** | Automatic join/leave tracking, continuous presence verification, attendance report generation |
| F9 | **Session Scheduling** | Calendar integration, recurring sessions, pre-configured room settings, waiting room support |
| F10 | **Participant Management** | Mute/unmute controls, remove participant, pin video, spotlight speaker, lobby admission |

### Extended Features (Should-Have)

| # | Feature | Description |
|---|---------|-------------|
| F11 | **Live Transcription** | Real-time speech-to-text captions with multi-language translation |
| F12 | **Virtual Backgrounds** | ML-based background blur/replacement without green screen |
| F13 | **AI Teaching Assistant** | Automatic note-taking, action item extraction, engagement scoring |
| F14 | **LMS Integration** | LTI 1.3 compatibility for grade passback, roster sync, assignment linking |
| F15 | **Accessibility** | WCAG 2.1 AA compliance—keyboard navigation, screen reader support, high contrast mode |

### Explicitly Out of Scope

- Asynchronous course management (covered by 11.1 Online Learning Platform)
- Video on demand / pre-recorded lecture hosting
- Full LMS functionality (gradebook, syllabus, assignments)
- Social features (student profiles, study groups outside sessions)
- Payment processing and subscription management

---

## Non-Functional Requirements

### CAP Theorem Analysis

| Component | CAP Choice | Justification |
|---|---|---|
| **Media Routing (SFU)** | AP (Available + Partition-tolerant) | A partition must never freeze all media; SFU continues routing available streams while the partition is resolved |
| **Session Roster** | CP (Consistent + Partition-tolerant) | Instructor permissions (mute all, remove) must be authoritative; stale roster could allow removed participants to remain |
| **Whiteboard State** | AP with CRDT convergence | CRDTs guarantee eventual convergence without coordination; availability during partitions preserves drawing experience |
| **Chat Messages** | AP with causal ordering | Messages should flow even during partial failures; causal ordering ensures reply-to-message consistency |
| **Recording Pipeline** | CP for manifest, AP for media chunks | Recording manifest must be consistent to avoid gaps; individual media chunks are idempotent and retryable |

### Consistency Model

| Data Type | Model | Rationale |
|---|---|---|
| Session state (active/ended) | Strong consistency | All participants must agree on session lifecycle state |
| Participant roster | Strong consistency | Permission changes (mute, remove) must take immediate effect |
| Whiteboard operations | Causal consistency (CRDT) | Operations respect causal dependencies; convergence guaranteed by CRDT properties |
| Chat messages | Causal consistency | Messages appear in causal order (replies after originals) |
| Engagement data (polls, Q&A) | Eventual consistency | Poll vote counts can lag slightly; final tally is accurate |
| Analytics and metrics | Eventual consistency | Dashboard data can lag 5–30 seconds without impact |

### Availability Targets

| Component | Target | Justification |
|---|---|---|
| Media delivery (SFU) | 99.95% | 26 min/year downtime; any outage during live class is highly visible |
| Signaling service | 99.95% | Signaling loss prevents new joins and control actions |
| Whiteboard service | 99.9% | Whiteboard is supplementary; brief outage is tolerable with retry |
| Recording pipeline | 99.99% | Lost recordings cannot be recreated; durability is paramount |
| API/Scheduling service | 99.9% | Pre-session; brief outage is recoverable before class starts |

### Latency Targets

| Operation | p50 | p95 | p99 | Justification |
|---|---|---|---|---|
| Glass-to-glass media (same region) | 80ms | 120ms | 150ms | Conversational threshold; >300ms causes talk-over |
| Glass-to-glass media (cross-region) | 150ms | 250ms | 400ms | Acceptable for lecture; cascade routing minimizes |
| Signaling events (mute, hand raise) | 30ms | 50ms | 100ms | Must feel instantaneous to instructor |
| Whiteboard stroke appearance | 50ms | 80ms | 120ms | Perceived real-time collaboration threshold |
| Chat message delivery | 50ms | 100ms | 200ms | Near-instantaneous for conversation flow |
| Session join (time to first frame) | 2s | 3s | 5s | Includes ICE negotiation, DTLS handshake, first keyframe |
| Breakout room transition | 1s | 2s | 3s | Includes media rerouting and new SFU connection |
| Poll result update | 100ms | 200ms | 500ms | Real-time feel for vote tallying |
| Recording availability (post-session) | 15min | 30min | 60min | Batch composition after session ends |

### Durability Guarantees

| Data Type | Durability | Strategy |
|---|---|---|
| Session recordings | 99.999999999% (11 nines) | Multi-region object storage with erasure coding |
| Whiteboard state | 99.999% | CRDT state persisted to replicated datastore every 5s |
| Chat transcripts | 99.999% | Append-only log with synchronous replication |
| Attendance records | 99.99% | Event log with batch reconciliation |
| Session metadata | 99.999% | Replicated relational database |

---

## Capacity Estimations (Back-of-Envelope)

### Assumptions

- Platform serves a large global education provider
- 100,000 concurrent sessions at peak
- Average 30 participants per session
- 3M concurrent participants at peak
- Average session duration: 60 minutes
- 70% of sessions use video; 30% audio-only
- 20% of sessions use whiteboard actively
- 40% of sessions use breakout rooms

### Traffic Estimations

| Metric | Estimation | Calculation |
|---|---|---|
| **Peak concurrent participants** | 3,000,000 | 100K sessions x 30 participants |
| **Peak concurrent video streams (upstream)** | 600,000 | 3M participants x 20% camera-on rate |
| **Peak concurrent video streams (downstream)** | 6,000,000 | 600K senders x avg 10 receivers per stream (gallery view subset) |
| **Signaling events/sec (peak)** | 1,500,000 | 3M participants x 0.5 events/sec (heartbeat, mute toggles, presence) |
| **Chat messages/sec (peak)** | 300,000 | 100K sessions x 3 messages/sec avg |
| **Whiteboard ops/sec (peak)** | 200,000 | 20K active whiteboard sessions x 10 ops/sec |
| **Session starts/min (hour boundary)** | 4,000 | 40% of 100K sessions start within 1 minute of hour mark |

### Bandwidth Estimations

| Stream Type | Per-Participant | Aggregate (Peak) |
|---|---|---|
| **Video upstream (simulcast 3 layers)** | 2.5 Mbps (720p high + 360p mid + 180p low) | 1.5 Tbps (600K senders) |
| **Video downstream (gallery of 9)** | 3 Mbps (1 x 720p + 8 x 360p) | 6.3 Tbps (2.1M active video viewers) |
| **Audio upstream** | 50 Kbps (Opus codec) | 150 Gbps (3M participants) |
| **Audio downstream (mixed)** | 50 Kbps | 150 Gbps (3M participants) |
| **Whiteboard sync** | 5 Kbps avg per active session participant | 3 Gbps (600K whiteboard participants) |
| **Signaling/chat** | 2 Kbps | 6 Gbps (3M participants) |
| **Total aggregate bandwidth** | — | **~8 Tbps** |

### Storage Estimations

| Data Type | Daily Volume | Calculation | Year 1 |
|---|---|---|---|
| **Session recordings (raw)** | 150 TB/day | 100K sessions x 60 min x 25 MB/min avg | 54 PB |
| **Composed recordings** | 30 TB/day | 5:1 composition ratio from multi-track | 11 PB |
| **Whiteboard snapshots** | 500 GB/day | 20K sessions x 25 MB avg state | 180 TB |
| **Chat transcripts** | 50 GB/day | 100K sessions x 500 KB avg | 18 TB |
| **Attendance/analytics** | 20 GB/day | 100K sessions x 200 KB metadata | 7 TB |
| **Total storage** | ~180 TB/day | — | **~65 PB** |

### Compute Estimations

| Component | Instance Type | Count (Peak) | Justification |
|---|---|---|---|
| **SFU media nodes** | 32-core, 64 GB RAM, 10 Gbps NIC | 8,000 | Each node handles ~12 sessions of 30 participants |
| **Signaling servers** | 8-core, 16 GB RAM | 500 | Each handles ~6K WebSocket connections |
| **TURN relay servers** | 16-core, 32 GB RAM, 10 Gbps NIC | 1,000 | ~15% of participants need TURN relay |
| **Whiteboard CRDT nodes** | 16-core, 32 GB RAM | 300 | Each handles ~70 active whiteboard sessions |
| **Recording workers** | 8-core, 16 GB RAM | 2,000 | Each composes 1 session in ~20 min post-session |

---

## SLOs / SLAs

### Service Level Objectives

| Metric | Target | Measurement Window | Measurement Method |
|---|---|---|---|
| **Media availability** | 99.95% | Monthly | % of session-minutes without media interruption > 5s |
| **Glass-to-glass latency** | p99 < 150ms (same region) | Per session | RTCP sender/receiver reports |
| **Time to first frame** | p95 < 3s | Per join event | Client-side measurement from click to first decoded frame |
| **Signaling latency** | p99 < 100ms | Per event | Server-side timestamp delta |
| **Recording availability** | 99.99% | Monthly | % of sessions with complete recording within 2 hours |
| **Session start success rate** | 99.9% | Monthly | % of scheduled sessions that start within 30s of scheduled time |

### Service Level Agreements (Contractual)

| Metric | SLA Target | Penalty |
|---|---|---|
| Monthly platform uptime | 99.9% | Service credit: 10% for each 0.1% below target |
| Recording delivery | Within 4 hours of session end | Service credit if exceeded for >5% of sessions |
| Maximum session capacity | Guaranteed 500 participants per session | Architecture upgrade path to 2,000 |
| Data retention | 90-day recording retention minimum | Contractual obligation per education agreements |

---

## Growth Projections

| Metric | Year 1 | Year 3 | Year 5 |
|---|---|---|---|
| Peak concurrent sessions | 100,000 | 300,000 | 750,000 |
| Peak concurrent participants | 3M | 9M | 22M |
| SFU node count (peak) | 8,000 | 24,000 | 60,000 |
| Recording storage (cumulative) | 65 PB | 250 PB | 700 PB |
| Daily signaling events | 130B | 400B | 1T |
| Regions deployed | 8 | 15 | 25 |

---

## Cost Estimation (Year 1)

| Category | Monthly Cost | % of Total | Notes |
|---|---|---|---|
| **SFU compute** | $4.8M | 35% | 8,000 high-CPU instances |
| **Bandwidth (egress)** | $3.5M | 25% | ~8 Tbps peak, committed use discount |
| **TURN relay** | $1.2M | 9% | 1,000 relay servers + bandwidth |
| **Recording storage** | $1.5M | 11% | 65 PB with tiered storage (hot/warm/cold) |
| **Recording compute** | $0.8M | 6% | 2,000 composition workers |
| **Signaling/API compute** | $0.5M | 4% | Stateless, scales efficiently |
| **Database/cache** | $0.4M | 3% | Session state, roster, metadata |
| **Monitoring/observability** | $0.3M | 2% | Metrics, logging, tracing at scale |
| **Other (DNS, CDN, misc)** | $0.7M | 5% | CDN for recordings, DNS, certificates |
| **Total** | **~$13.7M/month** | 100% | ~$164M/year |

> **Cost optimization note:** SFU compute and bandwidth dominate costs (60%). Key levers: simulcast layer selection (sending lower resolution to non-active speakers saves 40% bandwidth), TURN usage reduction through better ICE strategies, and recording storage tiering (move to cold storage after 30 days).

---

*Previous: [Index](./00-index.md) | Next: [High-Level Design ->](./02-high-level-design.md)*
