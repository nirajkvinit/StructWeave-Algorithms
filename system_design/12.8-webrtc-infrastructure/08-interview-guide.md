# Interview Guide — WebRTC Infrastructure

## 1. Interview Pacing (45-Minute Session)

| Phase | Time | Focus | Key Deliverables |
|---|---|---|---|
| **Requirements & Scope** | 0-7 min | Clarify 1:1 vs group, max room size, latency/connectivity targets | Room sizes, NFRs, recording/E2EE needs |
| **High-Level Design** | 7-20 min | Three-plane architecture, SFU selection, call establishment flow | Architecture diagram, call sequence |
| **Deep Dive** | 20-35 min | Pick 1-2: SFU internals, congestion control, ICE, E2EE | Pseudocode, data flow, failure modes |
| **Scalability & Reliability** | 35-42 min | Cascaded SFU, TURN geo-distribution, failover, live migration | Multi-region topology, recovery analysis |
| **Wrap-Up** | 42-45 min | Trade-offs summary, security, open questions | Key decisions justified |

---

## 2. Meta-Commentary: What Makes WebRTC Unique

WebRTC is unlike most system design problems because it combines real-time media constraints (sub-150ms latency), NAT traversal complexity, and scaling challenges that don't exist in request-response systems. Interviewers use this topic to test three specific skills:

### 2.1 Real-Time Constraints Change Every Design Decision

Unlike request-response systems where a 200ms latency spike is tolerable, WebRTC operates under absolute perceptual thresholds. Glass-to-glass latency above 150ms causes noticeable conversation delay. Jitter above 30ms causes audible artifacts. Packet loss above 3% causes visible video corruption. These constraints are not SLOs to be "mostly met"—they are hard limits that determine whether the product is usable. Every architectural decision (buffering strategy, routing topology, protocol choice) must be evaluated through "what does this do to latency?"

### 2.2 NAT Traversal Is a Distributed Coordination Problem

Most candidates know "clients connect to servers." WebRTC requires understanding that clients often cannot connect to each other—or even know their own public address. The ICE framework systematically discovers, tests, and selects from multiple candidate paths (host, server-reflexive, relay). This tests networking depth rarely covered in typical system design.

### 2.3 SFU vs MCU Trade-Offs Define the Architecture

The choice between forwarding packets (SFU) and processing them (MCU) has 100x cost implications. Candidates must explain WHY SFU dominates: forwarding is an I/O operation (microseconds), while transcoding is a compute operation (milliseconds). This single distinction defines the scaling model.

### 2.4 Three Independent Planes

Most systems have a control plane and a data plane. WebRTC has three: **signaling** (WebSocket session management), **connectivity** (STUN/TURN NAT traversal), and **media** (SFU packet forwarding). These planes have different scaling characteristics, different failure modes, and different latency requirements. Demonstrating awareness of this separation shows architectural maturity.

### 2.5 The Client Is Part of the Architecture

In most system design problems, the client is a black box. In WebRTC, the client is a critical component: it encodes video (CPU-intensive), manages ICE negotiation (stateful protocol), runs congestion control (bandwidth estimation), and handles simulcast encoding. Client capabilities directly constrain the system—a mobile device cannot encode 3 simulcast layers as efficiently as a desktop, so the SFU must adapt expectations per client type.

---

## 3. Trade-Offs Discussion

### Trade-Off 1: SFU vs MCU

| Dimension | SFU | MCU |
|---|---|---|
| **Server CPU** | Minimal (packet forwarding) | Very high (decode + composite + encode) |
| **Server bandwidth** | High (N-1 streams per subscriber) | Low (1 composite per subscriber) |
| **Latency** | 1-5ms forwarding | 50-200ms encoding pipeline |
| **Quality adaptation** | Per-subscriber simulcast layers | One-size-fits-all composite |
| **Scalability** | Horizontal via cascading | Vertical (CPU-bound encoding) |
| **Use case** | Interactive calls | Legacy SIP interop, recording |

**Interview insight:** SFU shifts decoding to clients, MCU shifts encoding to servers. Encoding is 10-100x more expensive than forwarding—SFU is the universal choice for modern WebRTC.

### Trade-Off 2: Simulcast vs SVC

| Dimension | Simulcast | SVC |
|---|---|---|
| **Bandwidth overhead** | ~40% (redundant encodes) | ~15% (shared base layer) |
| **Layer switching** | Requires keyframe (100-300ms freeze) | Instant (drop layers) |
| **Codec support** | VP8, H.264, VP9, AV1 | VP9, AV1 only |
| **Encoder complexity** | Simple (3 independent encodes) | Complex (layered dependencies) |
| **SFU complexity** | Simple (select RID, forward) | Complex (parse NAL units) |
| **Client support** | Universal | Incomplete on mobile |

**Interview insight:** Simulcast is "good enough" with wide compatibility. SVC is theoretically superior but practically limited. Production systems default to simulcast, use SVC opportunistically.

### Trade-Off 3: TURN Relay vs SFU-Integrated Relay

| Dimension | Standalone TURN | SFU-Integrated TURN |
|---|---|---|
| **Architecture** | Separate TURN server fleet | TURN built into SFU |
| **Bandwidth cost** | Doubles media (extra relay hop) | Zero additional (already at SFU) |
| **Latency** | Extra hop (client → TURN → SFU) | No extra hop |
| **Flexibility** | Works with any topology (P2P too) | Only SFU-based architectures |
| **Operations** | Additional infrastructure | No additional fleet |

**Interview insight:** For SFU architectures, integrated relay eliminates cost/latency of separate hop. Standalone TURN only needed for P2P fallback.

### Trade-Off 4: WebSocket vs HTTP/2 for Signaling

| Dimension | WebSocket | HTTP/2 Server Push |
|---|---|---|
| **Communication model** | Full-duplex, persistent | Request-response with push |
| **Per-message overhead** | 2-6 bytes framing | HTTP/2 header per message |
| **Load balancer support** | Requires sticky sessions | Standard HTTP load balancing |
| **Browser support** | Universal | Push deprecated in some browsers |
| **Connection lifecycle** | Long-lived (minutes-hours) | Can be short or long |

**Interview insight:** WebSocket for client-server signaling (needs full-duplex for real-time events). HTTP/2 acceptable for server-to-server coordination.

### Trade-Off 5: Edge TURN vs Cloud-Region TURN

| Dimension | Edge PoP TURN | Cloud-Region TURN |
|---|---|---|
| **Relay latency** | Minimal (server near user) | Higher (server may be distant) |
| **Deployment count** | Many small deployments (20+) | Few large deployments (6-8) |
| **Operational cost** | Higher (more locations to manage) | Lower (fewer locations) |
| **Capacity flexibility** | Limited per-location | Elastic scaling per region |
| **Coverage** | Global, fine-grained | Regional, coarse-grained |

**Interview insight:** Tiered approach — edge TURN in 6 high-traffic regions for latency; cloud TURN in 8 secondary regions with demand-based scaling.

---

## 4. Trap Questions

### Trap 1: "Why not just use P2P for everything?"

**Why it's a trap:** Tests understanding of mesh topology scaling limits.

**Strong answer:** "Mesh requires N×(N-1)/2 connections. At 6 participants, each client needs 5 upstream and 5 downstream connections—crushing mobile bandwidth and CPU. SFU reduces to 1 upstream + (N-1) downstream with per-subscriber quality adaptation. P2P is only viable for 1:1, and even then SFU is preferred for monitoring and feature parity."

### Trap 2: "Why is TURN so expensive?"

**Why it's a trap:** Tests cost model understanding beyond "it's a server."

**Strong answer:** "TURN doubles bandwidth: every byte enters AND exits the relay. A 25-minute 1:1 call at 2 Mbps each direction consumes ~1.5 GB of relay bandwidth. At 240K concurrent TURN sessions, monthly bandwidth exceeds $1M. Optimization: SFU-integrated relay eliminates the doubling since media already flows through the SFU."

### Trap 3: "How do you handle 100-person calls?"

**Why it's a trap:** Tests architectural scaling thresholds.

**Strong answer:** "Single SFU node handles ~660 participants (10 Gbps NIC). For 100 in one room: single SFU with Last-N (only forward top N active speakers' video, audio for all). Cross-region: cascaded SFU mesh where each region's node handles local participants and relays to other regions via custom protocol."

### Trap 4: "What happens when a participant's bandwidth drops?"

**Why it's a trap:** Tests quality adaptation depth.

**Strong answer:** "Three-level response: (1) SFU detects via TWCC within ~500ms, switches simulcast layer (720p→180p)—subscriber sees brief freeze then lower resolution. (2) Bandwidth continues dropping → pause video, audio-only mode. (3) Audio insufficient → reduce Opus bitrate. Each level is per-subscriber—other participants unaffected."

### Trap 5: "Why not use TCP for media?"

**Why it's a trap:** Tests real-time protocol fundamentals.

**Strong answer:** "TCP's head-of-line blocking delays ALL subsequent packets while waiting for one retransmission. In real-time media, a packet arriving 100ms late is useless—its playout deadline passed. UDP with selective NACK retransmits only packets that can still arrive in time. TCP is last-resort only (TURN over TCP/443) when firewalls block all UDP."

### Trap 6: "How do you record encrypted calls?"

**Why it's a trap:** Tests E2EE architecture understanding.

**Strong answer:** "With DTLS-SRTP (hop-by-hop), the SFU can record—it has decrypted media access. With E2EE (Insertable Streams), the SFU sees only ciphertext. Recording requires a 'recording bot' that joins as a participant, receives E2EE keys via the same key exchange, and decrypts locally. The bot is visible in the room—recording requires explicit consent."

---

## 5. Common Mistakes

```
Mistake 1: Ignoring NAT Traversal
├── Why wrong: "Clients connect directly to the SFU" ignores that 60%+ of
│   users are behind NATs requiring STUN discovery or TURN relay
├── Impact: Works in lab/office, fails for real users
└── Correct: Full ICE with STUN + TURN fallback chain (UDP → TCP → TLS/443)

Mistake 2: Mesh Topology for Group Calls
├── Why wrong: O(n²) connections; at 6 participants each peer maintains
│   5 send + 5 receive connections
├── Impact: Bandwidth/CPU collapse at 4-6 participants
└── Correct: SFU from 3+ participants (1 upload, N-1 downloads)

Mistake 3: Not Discussing Congestion Control
├── Why wrong: "Set bitrate to 1.5 Mbps" ignores that available bandwidth
│   changes constantly and varies per subscriber
├── Impact: Fixed bitrate causes either underutilization or congestion
└── Correct: GCC bandwidth estimation + per-subscriber simulcast selection

Mistake 4: Single-Region SFU Design
├── Why wrong: One cluster forces distant users through high-latency paths
│   (100ms+ RTT to remote regions)
├── Impact: Unacceptable quality for geographically distributed users
└── Correct: Multi-region SFU cascading; connect to nearest region

Mistake 5: Treating Signaling as Stateless HTTP
├── Why wrong: Signaling uses persistent WebSocket connections with per-session state
├── Impact: Breaks real-time event delivery (joins, mutes, quality updates)
└── Correct: Sticky WebSockets, session store for state, pub/sub for fan-out

Mistake 6: Ignoring the Jitter Buffer
├── Why wrong: "Play packets as they arrive" produces choppy audio
├── Impact: Quality degrades even with zero packet loss due to timing variation
└── Correct: Adaptive jitter buffer trading latency for playout smoothness

Mistake 7: No TURN Over TCP/443 Fallback
├── Why wrong: Enterprise firewalls block UDP and non-standard TCP ports
│   (~8% of corporate users affected)
├── Impact: Complete connectivity failure for a significant user segment
└── Correct: TURN over TLS on port 443 (looks like HTTPS to firewalls)
```

---

## 6. Questions to Ask the Interviewer

```
Scope-Setting Questions:
├── "Maximum room size: 1:1 only, small groups (5-10), or large (100+)?"
│   → Determines: P2P vs SFU, cascading, Last-N optimization
├── "Do we need recording or live streaming?"
│   → Determines: E2EE constraints, egress pipeline, MCU for compositing
├── "Target connectivity success rate: 95% or 99.9%?"
│   → Determines: TURN fleet investment, TCP/443 fallback depth
├── "Enterprise users behind corporate firewalls?"
│   → Determines: TURN over TLS, UDP fallback strategy
└── "Is end-to-end encryption required?"
    → Determines: Insertable Streams, server-side capability limitations

Depth-Exploration Questions:
├── "Dive deeper into ICE negotiation or SFU forwarding pipeline?"
├── "Cover congestion control algorithm or signaling protocol?"
├── "Discuss multi-region cascading in detail?"
└── "Explore E2EE key management model?"

Alignment Questions:
├── "I'm assuming SFU over MCU for interactive use cases—correct?"
├── "I'm proposing WebSocket signaling. Justify vs HTTP/2?"
└── "Designing cascaded SFU mesh for scalability. Simplify or go deeper?"
```

---

## 7. Quick Reference Card

```
┌──────────────────────────────────────────────────────────────┐
│              WEBRTC INFRASTRUCTURE QUICK REFERENCE            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  PROTOCOL STACK                                              │
│  ├── Signaling: WebSocket (SDP + ICE candidates)            │
│  ├── Connectivity: STUN (discovery) + TURN (relay)          │
│  ├── Transport: ICE (path selection) + DTLS (key exchange)  │
│  ├── Media: SRTP/SRTCP (encrypted RTP)                      │
│  └── E2EE: Insertable Streams / SFrame (optional)           │
│                                                              │
│  SCALE NUMBERS                                               │
│  ├── Bandwidth/participant: 1.5-4 Mbps down, 0.5-2.5 up   │
│  ├── Audio: 30-80 Kbps (Opus)                               │
│  ├── SFU forwarding latency: 1-5ms per hop                  │
│  ├── ICE negotiation: 200-500ms typical                      │
│  ├── TURN sessions needing relay: 10-15%                     │
│  ├── SFU tracks per 10 Gbps node: ~1,500                    │
│  └── Target: < 150ms glass-to-glass latency                 │
│                                                              │
│  ARCHITECTURE DECISIONS                                      │
│  ├── SFU over MCU (100x cheaper per participant)            │
│  ├── Simulcast over SVC (universal codec support)           │
│  ├── WebSocket for signaling (full-duplex, low overhead)    │
│  ├── Custom protocol for SFU cascading (skip ICE/DTLS)      │
│  └── Aggressive ICE nomination (speed over optimality)       │
│                                                              │
│  TRADE-OFFS TO DISCUSS                                       │
│  ├── SFU vs MCU (forwarding vs transcoding)                 │
│  ├── Simulcast vs SVC (compatibility vs efficiency)         │
│  ├── TURN relay vs SFU-integrated relay (cost)              │
│  ├── P2P vs SFU for 1:1 (simplicity vs features)           │
│  └── E2EE vs hop-by-hop (security vs server capabilities)  │
│                                                              │
│  RED FLAGS (things to NOT say)                               │
│  ├── ✗ "Use TCP for media" (head-of-line blocking)          │
│  ├── ✗ "Mesh topology for groups" (O(n²) collapse)          │
│  ├── ✗ "Clients connect directly" (ignores NAT)            │
│  ├── ✗ "Fixed bitrate for all" (ignores congestion)        │
│  ├── ✗ "WebRTC between SFUs" (unnecessary ICE/DTLS)        │
│  └── ✗ "CDN for real-time video" (wrong latency tier)       │
│                                                              │
│  KEY INSIGHT TO ARTICULATE                                   │
│  "WebRTC has three independent planes — signaling,           │
│   connectivity, and media — each with different scaling      │
│   characteristics and failure modes. The SFU is a router,    │
│   not a processor: it forwards packets without decoding,     │
│   making scaling a network I/O problem, not a compute one."  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Scoring Rubric

### Junior Level (Meets Bar)

```
Demonstrates:
├── Client-server WebSocket signaling for SDP exchange
├── SFU forwards packets without transcoding
├── STUN/TURN exist for NAT traversal
├── Basic offer/answer SDP exchange understanding
└── Awareness that media is encrypted (DTLS-SRTP)
```

### Mid-Level (Solid)

```
Demonstrates:
├── ICE candidate gathering and selection process
├── Simulcast and per-subscriber quality adaptation
├── Horizontal SFU scaling across multiple nodes
├── DTLS-SRTP encryption with certificate fingerprint verification
├── Mobile network challenges (WiFi→cellular handoff, ICE restart)
├── TURN credential management (time-limited HMAC)
└── Basic congestion control awareness (bandwidth estimation)
```

### Senior Level (Strong Hire)

```
Demonstrates:
├── Cascaded SFU mesh design for multi-region deployments
├── GCC bandwidth estimation mechanism (delay gradient, Kalman filter)
├── SFU forwarding pipeline detail (SRTP decrypt → header rewrite → re-encrypt)
├── TURN cost optimization (SFU-integrated relay to eliminate double bandwidth)
├── E2EE via Insertable Streams and its impact on server capabilities
├── Three-party adaptation loop (publisher GCC + SFU layer + subscriber feedback)
└── ICE consent freshness and its DDoS prevention role
```

### Staff Level (Exceptional)

```
Demonstrates:
├── Custom inter-SFU relay protocol with clear rationale vs WebRTC between servers
├── Jitter buffer as a real-time scheduling problem with irrevocable decisions
├── Room size discontinuous scaling thresholds (2 / 6 / 50 / 500+)
├── SFrame protocol for standardized E2EE with per-sender key rotation
├── Live migration design for zero-downtime SFU maintenance
├── Signaling fan-out scaling with event batching and pub/sub sharding
├── Quantified TURN bandwidth cost model and cost-per-call analysis
└── Data residency implications of TURN relay location under GDPR
```

---

*Previous: [Observability](./07-observability.md) | Next: [Insights](./09-insights.md)*
