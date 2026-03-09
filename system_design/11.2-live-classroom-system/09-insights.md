# Insights — Live Classroom System

## Insight 1: The Media Plane and Control Plane Must Be Architecturally Independent—They Fail Differently

**Category:** Architecture

**One-liner:** A live classroom is two systems in a trench coat—a UDP-based, latency-critical media plane and a TCP-based, reliable control plane—and coupling them is the fastest path to correlated failures.

**Why it matters:**

The most important architectural decision in a live classroom system is recognizing that real-time media routing (WebRTC SFU) and session management (signaling, roster, permissions) are fundamentally different systems masquerading as one product. The media plane operates on UDP with microsecond timing constraints—every packet of audio must arrive within a 20-200ms jitter window or it's useless. The control plane operates on TCP with traditional request-response semantics—a signaling event can tolerate 500ms of latency without any user impact.

These planes have opposing failure modes. When the SFU crashes, media immediately stops for all affected participants—there is no retry, no queue, no graceful degradation for in-flight packets. When the signaling server crashes, media continues flowing (the SFU has all active routing state), but new participants can't join and control actions (mute, remove) stop working. If you couple these systems—for example, by having the signaling server and SFU share a process or depend on the same database for real-time decisions—a signaling database outage kills media delivery. The architectural principle is isolation: the SFU should be able to route media packets even if every other system in the platform is down. The control plane manages the SFU but should never be in the media critical path.

This split also affects scaling strategy. The SFU is inherently stateful—it holds active media sessions that cannot be migrated without disruption. The signaling server should be stateless, reading session state from a distributed cache, so that any instance can serve any client. Scaling SFU requires geographic placement (near participants) and capacity pre-planning. Scaling signaling is standard horizontal web service scaling. Treating them as a unified system leads to either over-provisioning the expensive SFU fleet or under-provisioning the critical media plane.

---

## Insight 2: Simulcast Layer Selection Is the Single Biggest Lever for Cost, Quality, and Scalability

**Category:** Cost Optimization

**One-liner:** The decision of which video quality layer to forward to each subscriber determines 60% of the system's bandwidth cost, and getting it wrong either wastes money (too high) or degrades experience (too low).

**Why it matters:**

In a simulcast WebRTC system, each publisher sends 3 video encodings simultaneously: high (720p, ~2 Mbps), medium (360p, ~500 Kbps), and low (180p, ~150 Kbps). The SFU's layer selection algorithm decides which layer each subscriber receives. For a 30-participant session where one person is speaking, the optimal allocation is: 1 subscriber (the listener looking at the speaker) gets the high layer, 8 subscribers (gallery view) get the low layer, and 21 subscribers (off-screen in the participant list) get audio only. The suboptimal allocation—sending the high layer to all 29 subscribers—uses 4x the bandwidth for no perceptible quality improvement.

At scale (3 million concurrent participants), this layer selection decision drives the entire cost structure. SFU egress bandwidth is the dominant cost (25% of total platform cost). A 30% reduction in average layer quality—achieved by intelligent selection based on viewport visibility, speaker activity, and available bandwidth—translates directly to a 30% reduction in bandwidth cost, saving millions annually. The algorithm must continuously adapt: when a student scrolls their gallery view, the newly visible participants should upgrade from audio-only to low-quality video within 500ms, while the participants that scrolled off-screen should downgrade. This is a real-time bin-packing problem where the constraint is the subscriber's available bandwidth and the objective is maximizing perceived quality.

The bandwidth estimation algorithm (Google Congestion Control) is equally critical. If the estimator underestimates available bandwidth, the subscriber sees unnecessary quality reduction. If it overestimates, packets are lost, causing freezes and artifacts that are worse than a lower-quality smooth stream. The estimator uses RTCP receiver reports (delay gradients and loss statistics) to model the network condition every 100ms. Getting this estimation wrong by even 20% has cascading effects on quality and cost.

---

## Insight 3: Hour-Boundary Thundering Herds Are a Schedule-Driven Capacity Cliff That Traditional Auto-Scaling Cannot Handle

**Category:** Scaling

**One-liner:** University schedules create a predictable but extreme traffic pattern—40% of daily sessions starting in a 60-second window—that requires schedule-aware capacity pre-warming, not reactive auto-scaling.

**Why it matters:**

Traditional auto-scaling works by detecting increased load and provisioning new capacity. This works for gradual traffic ramps (e-commerce browsing, social media feeds) where a 30-second provisioning delay is invisible. In a live classroom system, the load profile is a step function: at 9:00:00 AM, the load jumps from X to 3X within 60 seconds because thousands of classes are scheduled to start at the top of the hour. By the time a reactive auto-scaler detects the spike (10-15 seconds), provisions new SFU nodes (30-60 seconds), and warms them (10 seconds), the burst window is nearly over and thousands of students experienced failed joins or degraded quality.

The solution is schedule-aware pre-warming. The system reads the session schedule 10 minutes before the hour boundary, calculates the required SFU capacity (number of scheduled sessions × average SFU units per session × 1.3 headroom factor), and pre-provisions that capacity. Pre-warming includes starting the SFU process, loading TLS certificates, pre-allocating UDP socket pools, and running readiness checks. When 9:00:00 AM arrives, the capacity is already waiting.

This transforms a systems engineering problem into a data engineering problem: the accuracy of the schedule data determines the effectiveness of pre-warming. Sessions created at the last minute, sessions that run over (overlapping with the next hour's start), and no-show sessions (scheduled but never started) all create prediction error. A hybrid approach works best: schedule-based pre-warming for predictable capacity, plus a small reactive buffer (10% over-provision) for unscheduled demand, plus a fast-scaling pool of "standby" SFU nodes that are booted but not allocated, ready to accept sessions in <5 seconds.

---

## Insight 4: CRDTs Solve Whiteboard Convergence but Create a Monotonically Growing State Problem That Requires Application-Level Garbage Collection

**Category:** Data Structures

**One-liner:** CRDTs guarantee that all clients converge to the same whiteboard state without coordination, but the price is tombstoned objects that grow memory unboundedly—requiring a garbage collection protocol that's harder to design than the CRDT itself.

**Why it matters:**

CRDTs (Conflict-Free Replicated Data Types) are the mathematically correct solution for collaborative whiteboard synchronization. When two users simultaneously draw strokes, move objects, or delete elements, CRDTs guarantee that all clients converge to the identical final state without any central coordinator. This is a powerful property that eliminates the need for OT (Operational Transformation) servers, supports offline editing, and survives relay server failures.

The hidden cost is state growth. When a user deletes a whiteboard object, the CRDT cannot actually remove it from the data structure. Instead, it marks the object as "tombstoned"—logically deleted but physically present. This tombstone must persist until every connected client has acknowledged the deletion. In a 3-hour whiteboard-intensive session where an instructor creates and erases hundreds of diagrams, the CRDT state grows to contain every object ever created, including tombstones. A session that visually shows 50 objects might have 500 objects in the CRDT state (450 tombstoned), consuming 10x the expected memory.

The garbage collection protocol is where the real complexity lies. The server must track which clients have processed which operations (a vector clock per client). Only when every client's vector clock is past a tombstone's creation time can the tombstone be safely removed. But clients go offline, reconnect, leave the session, and join late—each of these cases must be handled. A client that was offline for 30 minutes and reconnects needs to merge with the current state; if tombstones were GC'd during that window, the client might "resurrect" deleted objects. The practical solution is periodic compaction: the server creates a clean snapshot of the current visible state (no tombstones), assigns it a new version, and requires all clients to reset to this snapshot before continuing. Late-joining clients always start from the latest snapshot, avoiding the full history replay.

---

## Insight 5: Breakout Rooms Are a Dynamic Topology Orchestration Problem Disguised as a Feature Toggle

**Category:** System Modeling

**One-liner:** Creating breakout rooms isn't "starting 5 new sessions"—it's atomically splitting one media topology into 5 sub-topologies with maintained parent state, bidirectional transitions, and synchronized dissolution.

**Why it matters:**

At first glance, breakout rooms seem simple: create N small sessions, assign participants, and merge them back later. But this mental model misses the critical constraints that make breakout room orchestration one of the hardest problems in the system. First, the transition must be near-instantaneous—participants must move from main room to breakout room with <3 seconds of media interruption. If breakout rooms were separate sessions, each participant would need to go through the full join flow (ICE negotiation, DTLS handshake, SDP exchange) for the new session, taking 3-5 seconds of silence plus 2 seconds of media ramp-up.

The solution is to maintain the main room SFU connection in a paused state while establishing the breakout connection. The client has two peer connections simultaneously—one to the main room SFU (paused, keeping the DTLS session alive) and one to the breakout room SFU (active). When breakout rooms dissolve, the client simply resumes the main room connection and drops the breakout connection. This "warm connection" pattern reduces return-to-main time from 5-7 seconds to under 1 second.

The instructor "visit" pattern adds another dimension. When the instructor visits a breakout room, they need to see and hear that room's participants without leaving the main room's context. This means the instructor's SFU connection simultaneously subscribes to the breakout room's media while keeping the main room subscription warm. The instructor's published stream (audio + video) is simultaneously forwarded to both the breakout room and the main room. This multi-homed subscription pattern is conceptually simple but mechanically complex: the SFU must manage overlapping subscription sets, avoid duplicate audio delivery, and cleanly tear down the breakout subscription when the instructor leaves without affecting the main room connection.

---

## Insight 6: SFU Failover Mid-Session Is a Hard Real-Time Problem Where "Eventually Consistent" Means "Visibly Broken"

**Category:** Resilience

**One-liner:** When an SFU node crashes during a live lecture, every millisecond of media gap is perceived by every participant—there is no retry buffer, no queue, and no eventual consistency that can mask the disruption.

**Why it matters:**

In most distributed systems, failover is designed around eventual recovery: a database replica promotes in 5 seconds, and the application retries queued writes. Users might experience a brief slowdown, but the system catches up. In a live classroom, there is no catching up. Audio and video are consumed in real-time—if 3 seconds of audio are lost during failover, those 3 seconds of the lecture are permanently gone. Every participant in the session perceives the outage simultaneously, and unlike a webpage that loads slowly, a frozen video feed triggers immediate "something is broken" anxiety.

The failover protocol must minimize the media gap, and every phase is on the critical path. Detection (health check failure) takes 2 seconds—you can't make it faster without causing false positives. SFU selection (finding a pre-warmed node) takes 0.5 seconds. Notifying clients via the signaling channel takes 0.5 seconds. Client ICE restart (new DTLS handshake to new SFU) takes 2-4 seconds. Total: 5-7 seconds of silence. For a normal class, this is disruptive but survivable. For an exam or a critical lecture moment, it's unacceptable.

The "shadow SFU" pattern reduces this to <2 seconds. A shadow SFU node receives a real-time copy of all published streams (via media forking) but doesn't serve any subscribers. It's a hot standby with current media state. On primary failure, subscribers are redirected to the shadow, which already has the latest keyframes and SRTP context—no ICE restart needed, just a transport-level redirect. The cost is 2x SFU resources for critical sessions, but the reliability improvement (from 7-second gap to <2-second gap) is worth it for high-value sessions.

---

## Insight 7: DTLS-SRTP Encryption Makes the SFU a Trusted Intermediary—and E2EE Fundamentally Changes What the SFU Can Do

**Category:** Security

**One-liner:** Standard WebRTC encryption (DTLS-SRTP) encrypts media in transit but the SFU decrypts the transport layer to route packets—enabling recording, transcription, and quality optimization, but requiring trust in the server infrastructure.

**Why it matters:**

WebRTC's default encryption model uses DTLS for key exchange and SRTP for media encryption. This protects media in transit between the client and the SFU, and between the SFU and other clients. However, the SFU terminates the DTLS session—it decrypts incoming SRTP packets (to read RTP headers for routing decisions), then re-encrypts them with the subscriber's SRTP keys. The SFU can theoretically read the media content. This is by design: the SFU needs RTP header access for simulcast layer selection, active speaker detection, RTCP feedback processing, and recording.

For most educational use cases, this is acceptable—the platform operator is trusted, and the features enabled by server-side media access (recording, transcription, noise suppression, virtual backgrounds) are high-value. But for sensitive sessions (student counseling, academic misconduct hearings, medical education with patient data), the ability for the server to access media content is a compliance and trust concern.

End-to-end encryption (E2EE) via the Insertable Streams API adds a second encryption layer inside the RTP payload. The SFU can still read RTP headers (needed for routing) but cannot decrypt the media content. This is a fundamental trade-off: E2EE disables recording (server can't access content to record), transcription (server can't access audio to transcribe), server-side noise suppression, virtual backgrounds, and accurate active speaker detection (which relies on decoded audio levels). The MLS (Messaging Layer Security) protocol manages the group key distribution with forward secrecy. This is not a simple toggle—it changes the architectural capabilities of the entire system, and the decision must be made at session creation time, not mid-session.

---

*Back to: [Index ->](./00-index.md)*
