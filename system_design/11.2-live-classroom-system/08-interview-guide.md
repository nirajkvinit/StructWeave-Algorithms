# Interview Guide — Live Classroom System

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | What to Cover |
|---|---|---|---|
| 0–5 min | **Clarify** | Requirements scoping | Ask: session size, real-time vs near-real-time, recording needed, education-specific compliance, multi-region? |
| 5–10 min | **Core Abstractions** | Define the mental model | Session as a media topology graph; SFU as selective router; CRDT whiteboard; breakout rooms as sub-topologies |
| 10–20 min | **High-Level Architecture** | Major components + data flow | Draw: Client → Signaling → SFU (media plane) + Control Plane (session, roster, engagement). Explain SFU vs MCU choice |
| 20–30 min | **Deep Dive** | Pick 1–2 critical components | SFU layer selection + bandwidth estimation, OR CRDT whiteboard conflict resolution, OR breakout room orchestration |
| 30–40 min | **Scale & Reliability** | Bottlenecks + failure handling | Hour-boundary thundering herd, SFU failover mid-session, cascaded SFU for multi-region, graceful degradation hierarchy |
| 40–45 min | **Wrap-Up** | Trade-offs + extensions | E2EE trade-offs, recording architecture, compliance (FERPA/COPPA), future: AI transcription, engagement scoring |

### Phase-by-Phase Guidance

#### Phase 1: Clarify (0–5 min)
**Goal:** Show that you understand the design space is not "just video calling."

**Critical Questions to Ask:**
1. "What's the maximum session size? 50 people in a class vs 500 in a lecture vs 5000 in a webinar changes the architecture fundamentally."
2. "Is this for K-12 (COPPA compliance, minor safety) or higher education (different privacy model)?"
3. "Do we need breakout rooms? This transforms the media topology problem significantly."
4. "Is collaborative whiteboard needed? That's a distributed systems problem (CRDT) layered on top of the real-time media problem."
5. "What's the latency budget? Conversational (<150ms) vs lecture-style (<500ms acceptable)?"
6. "Multi-region deployment? A session with participants in New York and London needs SFU cascading."

**Interviewer Intent:** They want to see you recognize that "live classroom" has dramatically different requirements from "video call." The education context (compliance, roles, engagement tools, recording) is what differentiates this system.

#### Phase 2: Core Abstractions (5–10 min)
**Goal:** Establish the key mental model that the system has two independent planes.

**Key Insight to Communicate:**
> "This system has a split-plane architecture. The **media plane** handles real-time audio/video via WebRTC SFUs—it's UDP-based, latency-critical, and stateful. The **control plane** handles signaling, session management, and collaboration—it's TCP-based, reliable, and can be stateless. These two planes have fundamentally different scaling characteristics and failure modes, and they must be designed independently."

Draw this on the whiteboard immediately. It shows architectural maturity.

#### Phase 3: High-Level Architecture (10–20 min)
**Goal:** Show the major components and how data flows through them.

**Must-Cover Components:**
1. **WebRTC SFU** — Explain why SFU over MCU (scalability, flexibility, multi-track recording). Mention simulcast with 3 layers.
2. **Signaling Server** — WebSocket for SDP exchange, ICE candidates, room control events. Stateless for horizontal scaling.
3. **Session/Roster Service** — Session lifecycle, participant management, permission enforcement.
4. **Whiteboard (CRDT)** — Why CRDTs over OT (no central server needed, natural offline support). Briefly mention RGA for ordered objects, LWW registers for properties.
5. **Recording Pipeline** — Multi-track capture → post-session composition. Why not live mixing (cost, flexibility).
6. **TURN/STUN** — NAT traversal for ~15% of participants behind symmetric NATs.

**Architecture Pattern Checklist (mention explicitly):**
- Push model (SFU pushes media; server pushes events)
- Event-driven for non-critical path (analytics, attendance)
- Stateful media plane + stateless control plane
- Edge computing for media (SFU near participants)

#### Phase 4: Deep Dive (20–30 min)
**Goal:** Demonstrate depth in 1–2 areas. Choose based on what the interviewer seems most interested in.

**Option A: SFU Media Routing (recommended first choice)**
- Explain simulcast: publisher sends 3 quality layers simultaneously
- Subscriber-driven layer selection: each receiver picks quality based on bandwidth
- Bandwidth estimation: Google Congestion Control (GCC) algorithm using RTCP feedback
- Active speaker detection: audio level analysis → dynamic quality upgrades
- Show the layer selection pseudocode

**Option B: CRDT Whiteboard**
- Explain the problem: multiple users editing same canvas simultaneously
- Why CRDT over OT: no central server, automatic convergence, offline support
- CRDT types: RGA for z-ordered object list, LWW registers for positions/properties
- Tombstoning for deletes; per-user undo without affecting others
- State growth problem and compaction strategy

**Option C: Breakout Room Orchestration**
- The topology problem: splitting one session into N sub-sessions + reconvergence
- SFU allocation per room, participant media rerouting
- Instructor "visit" pattern: dual-subscription to main + breakout simultaneously
- Atomic transitions: either all participants move, or rollback
- Timed auto-return with synchronized countdown

#### Phase 5: Scale & Reliability (30–40 min)
**Goal:** Show you understand the unique scaling challenges of real-time systems.

**Must-Cover:**
1. **Hour-boundary thundering herd:** 40% of sessions start within 1 minute. Solution: schedule-aware pre-warming, staggered ICE, early SDP exchange.
2. **SFU failover:** Node crash kills active sessions. Solution: automatic failover to pre-warmed standby, ICE restart, <7s media gap (optimize to <2s with shadow SFU).
3. **Cascaded SFU for multi-region:** Star topology with instructor's region as hub. Only active speaker at high quality; thumbnails for others.
4. **Graceful degradation:** 4-level hierarchy from "reduce quality" to "audio-only emergency mode."
5. **Session size tiers:** Different SFU strategies for 20-person class vs 500-person lecture vs 2000+ webinar.

#### Phase 6: Wrap-Up (40–45 min)
**Goal:** Show breadth and forward thinking.

**Topics to Touch:**
- FERPA/COPPA compliance for education
- E2EE: possible but disables server-side features (recording, transcription)
- AI features: live transcription, auto-translation, engagement scoring
- Cost optimization: simulcast layer selection saves 40% bandwidth; TURN usage reduction
- Recordings: multi-track vs mixed, post-session composition, storage tiering

---

## Trade-Offs Discussion

### Trade-off 1: SFU vs MCU

| Aspect | SFU | MCU |
|---|---|---|
| **Pros** | Low server CPU; horizontal scaling; per-subscriber quality control; multi-track recording | Single output stream; low client bandwidth; simple client logic |
| **Cons** | Higher client bandwidth; client must decode multiple streams; complex layer management | High server CPU; vertical scaling limit; all-or-nothing quality; no multi-track recording |
| **Recommendation** | **SFU for classrooms.** The per-subscriber quality control (instructor at 720p, gallery at 180p) and multi-track recording are essential for education. SFU's horizontal scaling handles the burst pattern. MCU only considered as fallback for extremely constrained clients. |

### Trade-off 2: CRDT vs OT for Whiteboard

| Aspect | CRDT | OT |
|---|---|---|
| **Pros** | No central server; offline support; mathematical convergence guarantee; peer-to-peer friendly | Well-established for text; lower metadata overhead for text editing; intent preservation |
| **Cons** | Tombstone growth; more complex for geometric operations; metadata overhead per object | Central server required (SPOF); offline is hard; complex transformation functions for graphics |
| **Recommendation** | **CRDT for whiteboard.** The relay server can fail without losing work (clients buffer locally). Tombstone growth is manageable with periodic compaction. OT's central server dependency is a reliability risk for a real-time system. |

### Trade-off 3: Simulcast vs SVC (Scalable Video Coding)

| Aspect | Simulcast (Selected) | SVC |
|---|---|---|
| **Pros** | Widely supported by browsers; simple SFU forwarding; independent layers | Single encoded stream with embedded layers; lower publisher bandwidth; smoother quality transitions |
| **Cons** | 2-3x publisher bandwidth; redundant encoding at source | Limited browser support (VP9/AV1 SVC); SFU must understand layer structure; more complex codec handling |
| **Recommendation** | **Simulcast now, SVC roadmap.** As of 2026, simulcast (VP8/H.264) has universal browser support. SVC (VP9/AV1) support is growing but not universal. Design SFU to support both; default to simulcast for compatibility, SVC for clients that support it. |

### Trade-off 4: WebSocket vs MQTT for Signaling

| Aspect | WebSocket (Selected) | MQTT |
|---|---|---|
| **Pros** | Native browser support; bidirectional; well-understood; HTTP upgrade path | Pub/sub model natural for broadcast; QoS levels; smaller protocol overhead |
| **Cons** | Point-to-point (broadcast requires server fan-out); no built-in QoS levels | Requires MQTT broker; browser support via MQTT over WebSocket (extra layer); less common in WebRTC |
| **Recommendation** | **WebSocket for signaling.** Browser-native support eliminates an extra dependency. The server-side fan-out for broadcast events (active speaker change, participant joined) is manageable at session scale (hundreds, not millions). MQTT's pub/sub advantage doesn't outweigh the additional infrastructure dependency. |

### Trade-off 5: E2EE vs Server-Side Processing

| Aspect | E2EE Enabled | Server-Side Processing |
|---|---|---|
| **Pros** | Maximum privacy; compliance-friendly for sensitive sessions; immune to server compromise | Recording available; live transcription; AI features; better active speaker detection |
| **Cons** | No recording; no transcription; no server-side noise suppression; degraded active speaker detection | Server can access media content; insider threat risk; requires trust in infrastructure |
| **Recommendation** | **Configurable per session.** Default to server-side processing for normal classes (recording, transcription are high-value features). Enable E2EE option for sensitive sessions (therapy, legal, examinations) where privacy trumps features. Make this an instructor-level toggle. |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---|---|---|
| "Why not just use peer-to-peer WebRTC? It's simpler." | Test understanding of P2P limitations at scale | "P2P works for 2-4 participants (N*(N-1) connections). At 30 participants, that's 870 connections. Each client uploads N-1 streams—a 50 Mbps upload requirement. SFU reduces this to 1 upload per client and N selective downloads. Beyond ~5 participants, SFU is the only viable architecture." |
| "Why not mix all audio on the server like a phone bridge?" | Test MCU understanding | "Audio mixing (MCU for audio) is lightweight and viable—it reduces downstream audio to 1 stream. But video MCU compositing requires decode+encode on the server, which doesn't scale horizontally. The hybrid approach (MCU for audio, SFU for video) is common in large sessions." |
| "Can't you just use a CDN for live video?" | Test understanding of CDN vs WebRTC latency | "CDN-based live streaming (HLS/DASH) adds 3-15 seconds of latency due to segment packaging. Interactive classrooms require <150ms for conversational flow. WebRTC's SRTP-over-UDP transport achieves this. CDN is appropriate for 2000+ participant webinars where interaction is minimal." |
| "What happens if the SFU crashes mid-lecture?" | Test failure handling depth | "Active sessions on the failed SFU experience 3-7 seconds of media interruption. Auto-detection via health checks (2s), reassignment to pre-warmed SFU (1s), client ICE restart (2-4s). For critical sessions, we maintain a shadow SFU receiving a real-time stream copy—failover in <2s. The signaling channel (WebSocket) is on a separate server, so control is maintained even during SFU failure." |
| "How do you handle a session with participants across 3 continents?" | Test cascaded SFU understanding | "SFU cascade: each region has its own SFU node. Participants connect to their nearest SFU. SFUs relay the instructor's stream (high quality) and only active speaker's stream between regions. This adds one hop of inter-region latency (~100-150ms) but keeps intra-region latency optimal. Star topology with instructor's region as hub minimizes instructor-to-student latency." |
| "Isn't the whiteboard just a shared image?" | Test CRDT/collaboration understanding | "If we treat it as a shared image, only one person can draw at a time (lock-based). For true collaboration—instructor draws a diagram while a student annotates—we need concurrent editing with automatic conflict resolution. CRDTs provide this: each user's operations are applied locally and merge mathematically without a central coordinator. It's the same technology behind collaborative document editors." |
| "Why not store whiteboard state as a series of image snapshots?" | Test data model understanding | "Images lose structure—you can't undo a specific stroke, can't select and move objects, can't delete one element without redrawing everything. Vector-based CRDT state preserves each object's identity, position, and history. This enables per-user undo, object selection, and efficient incremental sync (send the operation, not the full canvas)." |
| "Breakout rooms seem easy—just create separate sessions." | Test orchestration complexity | "If they were separate sessions, you'd lose: (1) instant return-to-main (students would need to rejoin the original session, going through ICE/DTLS again—5s+ delay), (2) instructor ability to visit rooms without leaving main, (3) centralized recording across all rooms, (4) synchronized timers, and (5) breakout chat history merged into main session transcript. The orchestration that connects these sub-topologies to the parent session is the hard part." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Say Instead |
|---|---|---|
| **Starting with database schema** | Real-time media is the dominant challenge, not data storage | Start with the media plane (SFU) and signaling flow; schema is secondary |
| **Ignoring the split-plane architecture** | Treating media and control as one system leads to coupled failures | Explicitly separate media plane (UDP, stateful, latency-critical) from control plane (TCP, stateless, reliable) |
| **Designing for 10 participants** | "A classroom" implies small, but real designs handle 500+ per lecture | Always clarify scale; design for the 500-person lecture, not just the 20-person seminar |
| **Using HTTP for real-time signaling** | HTTP request-response adds 50-200ms per round trip; too slow for mute/unmute | Use WebSocket for persistent bidirectional signaling; HTTP only for session CRUD |
| **Proposing strong consistency for everything** | Strong consistency adds latency that kills real-time performance | Strong for session/roster state; causal (CRDT) for whiteboard; eventual for analytics |
| **Ignoring NAT traversal** | ~15% of users are behind symmetric NATs that block direct WebRTC | Include TURN/STUN infrastructure; explain ICE connectivity checks |
| **Treating recording as "just save the stream"** | Multi-track recording + composition is a significant pipeline | Explain: fork media at SFU → store raw tracks → post-session composition → multi-rendition output |
| **Forgetting education-specific requirements** | This isn't generic video conferencing | Mention FERPA/COPPA compliance, role-based permissions (instructor vs student), attendance tracking, engagement tools |

---

## Questions to Ask the Interviewer

| Question | What It Reveals | How It Changes Your Design |
|---|---|---|
| "What's the typical vs maximum session size?" | Determines SFU topology strategy | < 50: single SFU. 50-500: sharded SFU. 500+: tree topology or CDN hybrid |
| "Is this K-12 or higher education?" | Determines compliance requirements | K-12: COPPA compliance, parental consent, enhanced content moderation. Higher Ed: FERPA focus |
| "Are breakout rooms a must-have or nice-to-have?" | Determines topology complexity | Must-have: full orchestration + sub-session management. Nice-to-have: simplify to single topology |
| "How important is recording quality?" | Determines recording architecture | Essential: multi-track + post-composition. Nice-to-have: simple mixed recording on SFU |
| "Is this single-region or global?" | Determines cascade strategy | Single-region: simpler. Global: cascaded SFU, regional data residency, cross-region replication |
| "What's the latency tolerance?" | Determines whether CDN hybrid is an option | < 150ms: pure WebRTC. < 500ms: WebRTC with relaxed constraints. > 1s: CDN streaming viable |
| "Are there existing systems to integrate with?" | Determines API constraints | LMS integration (LTI), calendar sync, SSO—these constrain the API and auth design |

---

## Quick Reference Cards

### Card 1: SFU Capacity Planning

```
Per SFU Node (32-core, 64GB RAM, 10Gbps NIC):
- Max sessions: ~12 (at 30 participants each)
- Max simultaneous tracks routed: ~1,500
- Network: ~8 Gbps utilized (80% of 10 Gbps NIC)
- CPU: ~80% (packet forwarding is CPU-bound)
- Memory: ~20 GB (jitter buffers, subscriber state)

Fleet Sizing:
- 100K concurrent sessions → ~8,500 SFU nodes
- + 20% headroom for burst + failover → ~10,200 nodes
- + TURN relays: ~1,000 nodes (15% participants need relay)
```

### Card 2: Latency Budget Breakdown

```
Glass-to-Glass Target: 150ms (same region)

Sender encode:          10-15ms (hardware encoder) / 20-30ms (software)
Network (sender → SFU): 5-20ms (same region)
SFU forwarding:         1-5ms (packet copy, no decode)
Network (SFU → receiver): 5-20ms (same region)
Jitter buffer:          20-40ms (adaptive)
Receiver decode:        10-20ms (hardware decoder) / 20-30ms (software)
Render:                 5-16ms (next frame at 60fps)
─────────────────────────────────────────
Total:                  56-141ms typical
```

### Card 3: Key Numbers to Remember

```
WebRTC Bandwidth per participant:
  - Audio (Opus):     50 Kbps
  - Video (720p):     1.5-2.5 Mbps
  - Video (360p):     400-600 Kbps
  - Video (180p):     100-200 Kbps
  - Screen share:     1-3 Mbps (depends on content)
  - Simulcast (3 layers): 2.5-3.5 Mbps upload total

Signaling:
  - SDP offer/answer: 2-5 KB each
  - ICE candidate:    50-200 bytes each
  - Control events:   100-500 bytes each

CRDT:
  - Whiteboard op:    50-500 bytes (stroke: ~200 bytes avg)
  - Full page state:  1-10 MB (100-1000 objects)
  - Sync bandwidth:   5-50 Kbps per active participant
```

### Card 4: Architecture Decision Summary

```
Media Routing:      SFU (not MCU, not P2P)
Signaling:          WebSocket (not HTTP polling, not MQTT)
Whiteboard Sync:    CRDT (not OT, not locking)
Whiteboard Transport: WebRTC DataChannel (not WebSocket)
Session State:      Strong consistency (not eventual)
Whiteboard State:   Causal consistency via CRDT
Analytics:          Eventual consistency
Video Encoding:     Simulcast (VP8/H.264) + SVC roadmap (VP9/AV1)
Multi-Region:       Cascaded SFU (star topology, instructor as hub)
Recording:          Multi-track capture + post-session composition
Scale Approach:     Horizontal SFU fleet + schedule-aware pre-warming
```

---

*Previous: [Observability](./07-observability.md) | Next: [Insights ->](./09-insights.md)*
