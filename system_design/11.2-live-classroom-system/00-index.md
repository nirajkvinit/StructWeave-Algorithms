# 11.2 Live Classroom System

## System Overview

A Live Classroom System is the real-time backbone of synchronous online education, orchestrating low-latency video/audio conferencing via WebRTC Selective Forwarding Units (SFUs), CRDT-based collaborative whiteboards, dynamic breakout room routing, screen sharing with annotation overlays, interactive engagement tools (polls, Q&A, hand raise), session recording with multi-track composition, and attendance analytics—all delivered across web, mobile, and desktop clients. Unlike asynchronous learning platforms that optimize for CDN-cached content delivery, live classrooms are fundamentally a real-time distributed systems problem where the critical path is measured in milliseconds, not seconds. Modern implementations serve institutions ranging from K-12 schools to global universities, supporting 500+ concurrent participants per session with glass-to-glass latency under 150ms, dynamic SFU cascading across geographic regions, real-time whiteboard synchronization using conflict-free replicated data types (CRDTs), and AI-powered features including live transcription, automatic noise suppression, and intelligent camera framing. The architecture must handle extreme burst patterns—thousands of classrooms starting simultaneously at the top of the hour—while maintaining jitter-free media delivery and sub-second failover when media nodes fail mid-session.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Architecture Style** | Microservices with WebRTC SFU media plane, event-driven signaling via WebSockets, CRDT-synced collaboration layer |
| **Core Abstraction** | Session as a real-time media topology graph (Main Room > Participants > Media Tracks > Breakout Rooms) with shared interaction state |
| **Processing Model** | Real-time for media routing and signaling; near-real-time for whiteboard CRDT sync; batch for recording composition and analytics |
| **AI Integration** | ML for noise suppression, virtual backgrounds, auto-framing, live transcription/translation, engagement scoring |
| **Media Delivery** | WebRTC with SFU-based selective forwarding, simulcast encoding, temporal/spatial layer selection, SVC for adaptive quality |
| **Collaboration Engine** | CRDT-based whiteboard with vector graphics, sticky notes, laser pointer, and real-time cursor presence |
| **Data Consistency** | Strong consistency for session/roster state, causal consistency for whiteboard CRDT ops, eventual consistency for analytics |
| **Availability Target** | 99.95% for live sessions (any downtime during a class is catastrophic), 99.99% for session recordings |
| **Latency Profile** | <150ms glass-to-glass for media, <50ms for signaling events (hand raise, mute), <100ms for whiteboard strokes |
| **Extensibility** | Plugin-based engagement tools (polls, quizzes, timers), LTI integration for LMS, third-party recording storage |

---

## Quick Navigation

| Document | Focus Area |
|---|---|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flows, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API contracts, core algorithms |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | SFU cascading, CRDT whiteboard, breakout room routing |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Threat model, FERPA/COPPA, E2EE, content moderation |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-minute pacing, trade-offs, common pitfalls |
| [09 - Insights](./09-insights.md) | Key architectural insights and cross-cutting patterns |

---

## What Differentiates This System

| Dimension | Basic Video Conferencing | Live Classroom System |
|---|---|---|
| **Media Architecture** | Single SFU, fixed quality, all participants equal | Cascaded SFU mesh, role-based media priority (instructor > student), simulcast with subscriber-driven layer selection |
| **Interaction Model** | Mute/unmute, screen share, basic chat | Hand raise queues, moderated Q&A, live polls, breakout room orchestration, annotation layers, shared whiteboard |
| **Whiteboard** | Static screen share of a drawing app | CRDT-synchronized collaborative canvas with vector objects, multi-cursor presence, undo/redo per user, and persistent state |
| **Breakout Rooms** | Pre-assigned static rooms | Dynamic room creation, real-time participant shuffling, instructor broadcast-to-all, room-level recording, timed auto-return |
| **Recording** | Single mixed video file | Multi-track recording (separate audio/video per participant), whiteboard replay, chat transcript, timeline-synced playback |
| **Attendance** | Manual or basic join/leave logs | Continuous presence detection, attention scoring, engagement analytics, automated attendance certificates |
| **Scale Profile** | 10-50 participants, single region | 500+ participants, geo-distributed SFU cascade, thousands of concurrent sessions |
| **Resilience** | Session lost on server failure | Mid-session SFU failover with <2s media interruption, SRTP key renegotiation, automatic reconnection |
| **Compliance** | Basic data privacy | FERPA, COPPA, GDPR, accessibility (WCAG 2.1 AA), content moderation for minor safety |
| **AI Features** | Basic noise cancellation | Real-time transcription, auto-translation, smart camera framing, engagement heatmaps, AI teaching assistant |

---

## What Makes This System Unique

### 1. The Media Plane and Control Plane Are Two Fundamentally Different Systems
The live classroom has a split-brain architecture: the media plane (WebRTC SFU) handles real-time audio/video with microsecond-level timing constraints and UDP-based transport, while the control plane (signaling, roster, permissions) uses reliable TCP/WebSocket transport with traditional request-response patterns. These two planes have radically different scaling characteristics, failure modes, and consistency requirements. The SFU must be stateful (it holds active media sessions), latency-critical (every millisecond of jitter is perceptible), and geographically proximate to participants. The control plane can be stateless, tolerates higher latency, and scales horizontally behind load balancers. Designing these as a unified system leads to cascading failures; designing them as independent systems with well-defined interfaces is the key architectural insight.

### 2. Breakout Rooms Transform a Single-Topology Problem into Dynamic Topology Orchestration
Without breakout rooms, a live session is a single media topology: N participants connected to 1 SFU. Breakout rooms transform this into a dynamic set of sub-topologies that must be created, populated, monitored, and dissolved in real-time—while maintaining a "return to main room" capability that instantly reconverges all media streams. The orchestration challenges are significant: participant media tracks must be rerouted between SFU instances without audible gaps, the instructor must be able to "visit" breakout rooms (temporarily joining multiple topologies), and timed auto-return requires synchronized countdown across all rooms. This is effectively a real-time network topology management problem.

### 3. The Whiteboard Is a Distributed Database, Not a Drawing Canvas
A collaborative whiteboard appears to be a simple drawing application, but it's actually a distributed database problem. Multiple users simultaneously create, modify, and delete vector objects (strokes, shapes, text, sticky notes) with sub-100ms synchronization requirements. The system must handle concurrent edits to the same object (two users moving the same sticky note), maintain causal ordering (delete must follow create even if received out of order), and support per-user undo/redo that doesn't affect other users' operations. CRDTs solve the convergence problem mathematically, but the real challenge is designing CRDT types for geometric operations (move, resize, rotate, group) that maintain visual consistency without operational transformation overhead.

### 4. Hour-Boundary Thundering Herds Are the Defining Capacity Challenge
Unlike most systems where traffic grows gradually, live classrooms experience extreme burst patterns. University schedules concentrate class starts at the top of the hour—9:00 AM, 10:00 AM, 11:00 AM. A platform serving 10,000 concurrent sessions might see 3,000 of them start within a 60-second window. Each session start triggers SFU allocation, SRTP key negotiation, TURN relay setup, ICE connectivity checks, roster population, and whiteboard state initialization. The system must pre-warm SFU capacity based on schedule data and stagger connection establishment across the burst window without delaying any individual session start beyond 3 seconds.

---

## Scale Reference Points

| Metric | Value |
|---|---|
| **Global virtual classroom market** | ~$35 billion (2026), growing at 14% CAGR |
| **Concurrent live sessions (large platform)** | 50,000–200,000 simultaneous sessions |
| **Peak concurrent participants** | 5M–15M simultaneous users across all sessions |
| **Participants per session (typical)** | 20–50 (class), 200–500 (lecture), 2,000+ (webinar) |
| **Media bandwidth per participant** | 1.5–4 Mbps downstream, 0.5–2 Mbps upstream |
| **Aggregate SFU bandwidth (peak)** | 5–20 Tbps across all sessions |
| **Signaling events per second** | 500,000–2,000,000 events/sec (mute, hand raise, chat, presence) |
| **Whiteboard operations per second** | 100,000–500,000 CRDT ops/sec across all sessions |
| **Recording storage (daily)** | 50–200 TB/day (multi-track raw recordings) |
| **Session start rate (peak hour)** | 3,000–5,000 new sessions/minute at hour boundaries |
| **Breakout room operations** | 50,000–100,000 room create/dissolve operations per hour |
| **Chat messages per second** | 200,000–500,000 messages/sec across all sessions |

---

## Technology Landscape

| Layer | Component | Role |
|---|---|---|
| **Media Transport** | WebRTC with SFU (Selective Forwarding Unit) | Real-time audio/video routing with simulcast, temporal/spatial layer selection, SRTP encryption |
| **Signaling Layer** | WebSocket-based signaling server | Session negotiation (SDP offer/answer), ICE candidate exchange, room state updates |
| **Whiteboard Engine** | CRDT-synchronized vector canvas | Collaborative drawing with conflict-free merging, per-user undo, and persistent state |
| **Breakout Orchestrator** | Session topology manager | Dynamic room creation, participant routing, timed transitions, instructor broadcast |
| **Recording Pipeline** | Multi-track capture and composition | Per-participant audio/video capture, whiteboard replay, post-session composition to MP4 |
| **Engagement Service** | Real-time interaction engine | Polls, Q&A, hand raise queue, reactions, attendance tracking |
| **Chat Service** | In-session messaging | Real-time chat with threading, @mentions, file sharing, message moderation |
| **Transcription Service** | Speech-to-text pipeline | Real-time captions, multi-language translation, searchable transcript generation |
| **TURN/STUN Service** | NAT traversal relay | TURN relay for participants behind symmetric NATs, STUN for address discovery |
| **API Gateway** | Rate-limited reverse proxy | REST/gRPC routing, authentication, rate limiting, WebSocket upgrade handling |
| **Analytics Pipeline** | Stream + batch processing | Engagement metrics, attention scoring, session quality monitoring, usage reporting |
| **Notification Service** | Multi-channel delivery | Session reminders, recording availability, schedule changes |

---

*Next: [Requirements & Estimations ->](./01-requirements-and-estimations.md)*
