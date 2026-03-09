# 12.8 Design WebRTC Infrastructure

## System Overview

A WebRTC Infrastructure platform provides the real-time communication fabric that enables browser-to-browser and device-to-device audio, video, and data exchange without plugins—handling the full lifecycle from NAT traversal (STUN/TURN) and connectivity negotiation (ICE) through media routing (SFU/MCU) to quality adaptation and encryption. When a user initiates a call, the signaling server orchestrates SDP offer/answer exchange over WebSockets, ICE candidates are gathered from STUN servers to discover reflexive addresses and from TURN servers to allocate relay candidates when symmetric NATs block direct connectivity, the ICE agent pairs and prioritizes candidates to find the optimal path, DTLS-SRTP handshakes establish encrypted media channels, and the SFU selectively forwards each participant's audio/video tracks to subscribers while dynamically adjusting quality via simulcast layer switching and congestion-responsive bitrate adaptation—all within a 150ms glass-to-glass latency budget. Production-grade WebRTC infrastructure at scale handles millions of concurrent media sessions across geo-distributed SFU clusters, cascades media between regions via custom relay protocols, maintains sub-100ms server-side forwarding latency, achieves 99.99% call setup success rates, supports rooms from 2 to 100,000+ participants through cascaded SFU mesh topologies, and implements true end-to-end encryption via Insertable Streams without sacrificing SFU-based quality adaptation.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Architecture Style** | SFU-centric media plane with STUN/TURN NAT traversal layer, WebSocket-based signaling plane, and cascaded mesh for multi-region distribution |
| **Core Abstraction** | Media session as a set of negotiated tracks (audio/video/data) with per-subscriber quality adaptation over an ICE-established transport |
| **Processing Model** | Ultra-low-latency packet forwarding (no transcoding) on the media path; asynchronous event-driven signaling; periodic bandwidth estimation feedback loops |
| **Protocol Stack** | SDP for session description; ICE for connectivity; DTLS-SRTP for encrypted media transport; SCTP/DTLS for data channels; RTP/RTCP for media framing and feedback |
| **Media Routing** | SFU selective forwarding with simulcast/SVC layer selection; no media mixing (MCU reserved for legacy/recording pipelines) |
| **Latency Budget** | < 150ms glass-to-glass target; < 50ms SFU forwarding hop; < 300ms ICE negotiation for 90th percentile |
| **Data Consistency** | Eventual consistency for room state across cascaded SFUs; strong consistency for authentication and billing; best-effort for real-time quality metrics |
| **Availability Target** | 99.99% for media forwarding path; 99.95% for signaling; 99.9% for TURN relay (expensive fallback) |
| **Scale Profile** | Millions of concurrent sessions; 100K+ participants per logical room via cascading; tens of Tbps aggregate media bandwidth; thousands of TURN allocations per server |
| **Security Model** | Mandatory DTLS-SRTP transport encryption; optional E2EE via Insertable Streams/SFrame; token-based room authentication; TURN credential rotation |

---

## Quick Navigation

| Document | Focus Area |
|---|---|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, bandwidth math, TURN relay sizing |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, call establishment flow, ICE negotiation sequence |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, SDP/ICE protocols, signaling API, congestion control pseudocode |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | SFU media router internals, ICE engine, adaptive bitrate deep dives |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | SFU cascading, TURN geo-distribution, call recovery, live migration |
| [06 - Security & Compliance](./06-security-and-compliance.md) | DTLS-SRTP, E2EE with Insertable Streams, TURN auth, threat model |
| [07 - Observability](./07-observability.md) | MOS scoring, call quality metrics, ICE negotiation tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing strategy, trap questions, SFU vs MCU trade-offs, meta-commentary |
| [09 - Insights](./09-insights.md) | Key architectural insights and cross-cutting real-time media patterns |

---

## What Differentiates This System

| Dimension | Naive WebRTC (P2P Only) | Production WebRTC Infrastructure |
|---|---|---|
| **NAT Traversal** | Single STUN server, hope for the best | Geo-distributed STUN + TURN fleet with ICE candidate prioritization and relay fallback |
| **Topology** | Full mesh—each peer connects to every other peer | SFU hub-and-spoke; each participant sends one upload, receives N-1 downloads |
| **Scaling** | Breaks at 4-6 participants (O(n²) connections) | Supports 100K+ participants via cascaded SFU mesh across regions |
| **Quality Adaptation** | None—single stream quality for all receivers | Per-subscriber simulcast layer switching based on individual bandwidth estimation |
| **Reliability** | Call drops on network change | ICE restart, SFU live migration, automatic server failover in < 1 second |
| **Encryption** | DTLS-SRTP (server can decrypt) | Optional true E2EE via Insertable Streams—SFU forwards opaque ciphertext |
| **Monitoring** | None—black box after connection | Real-time MOS scoring, per-track quality metrics, ICE timing breakdowns |
| **Cost** | Zero server cost (P2P) | Optimized TURN usage (< 15% of sessions), SFU resource sharing across rooms |

---

## What Makes This System Unique

### NAT Traversal as a Distributed Coordination Problem

Unlike typical client-server architectures where the server has a known public address, WebRTC must establish connectivity between two endpoints that are both behind NATs and firewalls. The ICE framework systematically discovers, tests, and selects from multiple candidate paths (host, server-reflexive, relay) using a priority-weighted connectivity check algorithm. This makes every call establishment a mini distributed consensus problem: both peers must independently discover candidates, exchange them via signaling, perform symmetric connectivity checks, and converge on the same optimal path—all within a few hundred milliseconds. The fallback hierarchy (direct → STUN-reflexive → TURN relay) is a cost-latency optimization where each tier adds latency and server cost but increases connectivity probability.

### SFU as a Selective Router, Not a Media Processor

The fundamental insight of SFU architecture is that forwarding packets is orders of magnitude cheaper than processing them. An MCU that decodes, composites, and re-encodes video for N participants requires O(N) transcoding operations—each consuming significant CPU. An SFU simply copies incoming RTP packets to subscriber output buffers, requiring only memory bandwidth and network I/O. This makes SFU scaling primarily a network capacity problem rather than a compute problem, enabling a single SFU node to handle hundreds of concurrent tracks with commodity hardware. The intelligence shifts to the edges: simulcast allows senders to encode multiple quality layers, and the SFU selects which layer each subscriber receives based on per-subscriber bandwidth estimates.

### Congestion Control as the Hidden Quality Lever

WebRTC's quality of experience is dominated not by codec quality or resolution, but by congestion control—the feedback loop that continuously estimates available bandwidth and adjusts sending bitrate. Google Congestion Control (GCC) uses one-way delay gradient measured through a Kalman filter to detect congestion before packet loss occurs, enabling proactive bitrate reduction. This delay-based approach is critical because in real-time media, even 1% packet loss causes visible artifacts, while a smooth bitrate reduction is imperceptible. The interplay between sender-side bandwidth estimation, receiver-side REMB/TWCC feedback, and SFU-side simulcast layer switching creates a three-party adaptation loop that must converge within seconds to maintain call quality.

### TURN as the Expensive Last Resort with Disproportionate Importance

TURN relay servers handle only 10-15% of WebRTC sessions (those behind symmetric NATs or restrictive firewalls), but they are disproportionately important because they represent the connectivity of last resort. Without TURN, these sessions simply fail—there is no further fallback. This creates an asymmetric cost-reliability trade-off: TURN servers must be provisioned for peak relay load, geo-distributed for latency, and maintained at high availability, yet they sit idle for 85-90% of sessions. The allocation mechanism (long-lived UDP relay binding with periodic refresh) and credential system (time-limited HMAC tokens) must balance security against the latency cost of re-allocation.

---

## Complexity Rating

| Dimension | Rating | Notes |
|---|---|---|
| **Latency Sensitivity** | ★★★★★ | Real-time media demands < 150ms glass-to-glass; jitter > 30ms causes audible artifacts |
| **Protocol Complexity** | ★★★★★ | SDP, ICE, DTLS, SRTP, SCTP, RTCP—deepest protocol stack in system design |
| **Scale (Concurrent)** | ★★★★☆ | Millions of sessions but per-session bandwidth (1-4 Mbps) limits density per node |
| **Algorithmic Depth** | ★★★★☆ | Congestion control (Kalman filter), jitter buffer (adaptive playout), ICE prioritization |
| **Networking Complexity** | ★★★★★ | NAT traversal, UDP hole punching, relay allocation, multi-path candidate selection |
| **Operational Complexity** | ★★★★☆ | Geo-distributed TURN fleet, SFU cascading, certificate management, codec negotiation |
| **Interview Frequency** | ★★★★☆ | Common at video/communication companies; tests real-time systems and networking depth |

---

## Key Terminology

| Term | Definition |
|---|---|
| **STUN** | Session Traversal Utilities for NAT — lightweight protocol for discovering a client's public IP and port by reflecting a request off a server |
| **TURN** | Traversal Using Relays around NAT — relay server that forwards media when direct and STUN-reflexive paths fail |
| **ICE** | Interactive Connectivity Establishment — framework that systematically discovers, tests, and selects the best connectivity path between peers |
| **SFU** | Selective Forwarding Unit — media server that receives tracks from publishers and selectively forwards them to subscribers without transcoding |
| **MCU** | Multipoint Control Unit — media server that decodes, mixes/composites, and re-encodes media into a single output stream per subscriber |
| **SDP** | Session Description Protocol — text format describing media capabilities, codecs, transport parameters, and ICE candidates |
| **DTLS-SRTP** | Datagram Transport Layer Security for Secure RTP — key exchange mechanism that uses DTLS handshake to derive SRTP encryption keys |
| **Simulcast** | Technique where a sender encodes the same source at multiple quality levels (e.g., 720p/360p/180p) for SFU layer selection |
| **SVC** | Scalable Video Coding — codec feature encoding video in stackable layers (spatial, temporal, quality) that can be selectively stripped by the SFU |
| **GCC** | Google Congestion Control — delay-based bandwidth estimation algorithm using Kalman filter on one-way delay gradient |
| **TWCC** | Transport-Wide Congestion Control — RTCP feedback extension providing per-packet arrival timestamps for sender-side bandwidth estimation |
| **REMB** | Receiver Estimated Maximum Bitrate — RTCP message from receiver to sender indicating estimated available bandwidth |
| **ICE Candidate** | A potential network path (host address, server-reflexive address, or relay address) that ICE tests for connectivity |
| **Offer/Answer** | SDP exchange model where the initiator sends an "offer" describing capabilities and the responder returns an "answer" with negotiated parameters |
| **Peer Connection** | The WebRTC API object representing a connection between local and remote peer, managing all tracks, ICE, and DTLS state |

---

## Scale Reference Points

| Metric | Value | Context |
|---|---|---|
| **Concurrent 1:1 calls** | ~5M globally at peak | Across all major video calling platforms combined |
| **Bandwidth per video participant** | 1.5-4 Mbps down, 0.5-2.5 Mbps up | Depends on resolution (720p vs 1080p) and simulcast layers |
| **Audio bandwidth** | 30-80 Kbps per stream | Opus codec at typical settings |
| **STUN response time** | 1-5ms | Lightweight UDP request/response; no state maintained |
| **TURN relay overhead** | 20-50ms added latency | Media traverses relay server instead of direct path |
| **ICE negotiation time** | 200-500ms typical | Candidate gathering + connectivity checks; aggressive nomination reduces this |
| **SFU forwarding latency** | 1-5ms per hop | Packet-level forwarding without decode; dominated by network stack overhead |
| **TURN sessions needing relay** | 10-15% of all sessions | Remainder succeed via direct or STUN-reflexive paths |
| **SFU tracks per node** | 500-2000 concurrent | Depends on bandwidth capacity (10-40 Gbps NIC) and track bitrates |
| **Cascaded SFU hops** | 1-3 for global rooms | Each hop adds 1-5ms plus inter-region network latency |

---

## Technology Landscape

| Component | Open-Source Options | Managed Service Approach |
|---|---|---|
| **SFU** | LiveKit, Mediasoup, Janus, Pion (library) | Managed real-time video platforms |
| **TURN/STUN** | coturn, Pion TURN | Managed TURN relay services |
| **Signaling** | Custom WebSocket server, Socket.IO | Managed WebSocket/PubSub services |
| **Codec** | VP8, VP9, AV1, H.264, Opus | Hardware-accelerated encoding on client devices |
| **Recording** | Egress pipelines (composite or track-based) | Managed recording with cloud storage |
| **Monitoring** | Custom RTCP stats collection, WebRTC getStats() API | Real-time quality dashboards |
| **E2EE** | Insertable Streams API, SFrame | Platform-specific E2EE SDKs |
