# Google Meet / Zoom System Design

## Overview

Google Meet / Zoom is a real-time video conferencing platform supporting everything from 1-on-1 calls to large meetings with 1000+ participants. The system's defining challenge is **real-time media delivery at scale** -- achieving sub-200ms end-to-end latency for audio and video across globally distributed participants while continuously adapting to heterogeneous network conditions. Built on WebRTC as the transport layer (ICE, STUN/TURN, DTLS-SRTP), the architecture centers on a **Selective Forwarding Unit (SFU)** for media routing, with hybrid P2P/SFU/MCU topology selection based on meeting size. The system employs simulcast and SVC (Scalable Video Coding) for per-subscriber bandwidth adaptation, server-side MCU compositing for recording, and AI-powered features including noise cancellation, background replacement, and real-time transcription -- all served through a global infrastructure of geo-routed media servers.

## Key Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Traffic Pattern** | Sustained real-time streams with diurnal peaks aligned to business hours across time zones |
| **Read:Write Ratio** | Symmetric -- each participant both sends and receives media simultaneously |
| **Consistency Model** | Eventual consistency for signaling metadata; strict ordering for media frames within each stream |
| **Latency Sensitivity** | Ultra-critical -- <150ms mouth-to-ear latency required for interactive conversation |
| **Contention Level** | Moderate -- SFU handles N streams per participant rather than N-squared connections |
| **Data Sensitivity** | HIPAA/GDPR compliance for enterprise deployments, optional end-to-end encryption |

## Complexity Rating

**Very High** -- Combines hard real-time constraints with adaptive bitrate media processing, hybrid topology orchestration, global media server routing, AI-powered audio/video enhancement, server-side recording compositing, and per-subscriber bandwidth adaptation across heterogeneous network conditions.

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning |
| [02 - High-Level Design](./02-high-level-design.md) | System architecture, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, core algorithms |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | SFU scaling, media routing, bandwidth adaptation |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, DR |
| [06 - Security & Compliance](./06-security-and-compliance.md) | E2E encryption, HIPAA/GDPR, threat model |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |

## What Makes This System Unique

1. **Real-Time Constraint**: Unlike most distributed systems where latency is measured in hundreds of milliseconds or seconds, video conferencing has a hard latency budget of roughly 150ms mouth-to-ear. Every architectural decision -- media server placement, codec selection, jitter buffer depth, network path -- must respect this non-negotiable constraint.
2. **Heterogeneous Clients**: Participants in the same meeting range from fiber-connected desktops with dedicated GPUs to mobile phones on congested 3G networks. The system must adapt media quality independently per subscriber, delivering different resolutions and bitrates to each participant simultaneously.
3. **Media is Not Data**: Video and audio streams are loss-tolerant but delay-intolerant -- the exact opposite of typical request/response distributed systems. A dropped frame is acceptable; a 500ms delay makes conversation impossible. This inverts conventional reliability assumptions.
4. **N-Way Topology Problem**: Each participant both produces and consumes multiple media streams. Scaling from 2 participants (where P2P works) to 10 (where SFU is optimal) to 1000+ (where cascaded SFUs with active speaker detection are necessary) requires fundamentally different architectures that the system must dynamically select and transition between.
5. **Recording vs Live Path**: Recording requires server-side compositing with MCU-like behavior (decoding, mixing, and re-encoding all streams into a single output), while live delivery uses SFU forwarding (no transcoding). These two conflicting media processing models must coexist within one system, often for the same meeting simultaneously.

## Real-World Scale

| Metric | Value |
|--------|-------|
| Google Meet monthly participants | 300M+ (2025) |
| Zoom daily meeting participants (peak) | 350M+ |
| Zoom annual meeting minutes | 3.3 trillion |
| Google global network edge locations | 202 |
| Google private fiber network | 2M+ miles |
| Zoom co-located data centers | 20+ globally |
| LiveKit (open-source SFU) annual calls | 3B+ |
| SFU vs MCU efficiency | SFU handles ~15x more participants on same hardware |
| Audio latency target (glass-to-glass) | Sub-100ms |

## Sources

- Google Cloud Network Infrastructure
- Zoom Architecture Technical Library
- LiveKit Open-Source SFU Documentation
- WebRTC.org and W3C WebRTC Standards
- RFC 8825-8831 (WebRTC Architecture RFCs)
- Tsahi Levent-Levi WebRTC Predictions 2026
