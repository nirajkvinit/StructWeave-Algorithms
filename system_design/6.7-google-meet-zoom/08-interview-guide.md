# Google Meet / Zoom: Interview Guide

[<- Back to Index](./00-index.md) | [Previous: Observability](./07-observability.md)

---

## Interview Pacing (45-min Format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify | Scope the problem | Ask: Max participants? Audio/video/both? Recording? E2EE? Latency target? 1-on-1 or group? |
| **5-12 min** | High-Level | Core architecture | WebRTC stack, SFU vs MCU decision, signaling vs media path separation, geo-distributed architecture |
| **12-25 min** | Deep Dive | 1-2 critical components | SFU selective forwarding, simulcast/SVC bandwidth adaptation, congestion control (GCC/TWCC), ICE/STUN/TURN |
| **25-35 min** | Scale & Trade-offs | Bottlenecks, decisions | Cascaded SFU for large meetings, recording pipeline, TURN scaling, AI features architecture |
| **35-40 min** | Reliability | Failure modes | SFU failover, graceful degradation (video to audio-only), E2EE key management |
| **40-45 min** | Wrap Up | Summary, extensions | Security (DTLS-SRTP, zoom-bombing prevention), observability, cost optimization |

---

## Meta-Commentary

### How to Approach This Problem

This is fundamentally a **real-time media routing problem**, not a traditional request-response system. The key insight interviewers want is that you understand the difference:

- Media uses UDP, not TCP. Packet loss is acceptable; delay is not.
- The SFU is a **router**, not a server. It forwards packets, not processes requests.
- Signaling and media are completely separate paths. Signaling can go down while media continues flowing.

### What Makes This System Unique / Challenging

1. **Hard real-time constraint**: 150ms mouth-to-ear. No caching, no queuing, no retry.
2. **Heterogeneous clients**: One participant on fiber, another on 3G. SFU must serve different quality to each.
3. **Stateful media servers**: Unlike stateless web servers, SFU nodes hold live room state. Failover is non-trivial.
4. **WebRTC complexity**: ICE/STUN/TURN/DTLS/SRTP -- many protocols that must work together for connectivity.

### Where to Spend Most Time

- **SFU architecture and selective forwarding** (this IS the system)
- **Bandwidth adaptation** (simulcast layer selection, congestion control)
- **Scaling to large meetings** (cascaded SFU, Last-N)
- Don't get bogged down in: UI, calendar integration, billing

---

## Phase-by-Phase Guide

### Phase 1: Clarify Requirements (0-5 min)

**Questions to Ask:**

| Question | Why It Matters |
|----------|----------------|
| "What's the maximum meeting size we need to support? (10, 100, 1000, 10000?)" | Determines topology -- P2P, single SFU, or cascaded SFU |
| "Do we need recording? Real-time or post-meeting processing?" | Recording is MCU-like, fundamentally different from live SFU path |
| "Is end-to-end encryption required?" | E2EE disables all server-side features (recording, transcription, noise cancellation) |
| "What's the latency budget? Interactive conversation or broadcast?" | Interactive demands <150ms; broadcast allows 2-5 seconds |
| "Mobile support priority?" | Affects codec selection, simulcast layer strategy, bandwidth assumptions |
| "Enterprise features like SSO, data residency?" | Influences multi-region design, compliance requirements |
| "Do we need live streaming to non-WebRTC viewers (HLS/DASH)?" | Adds a broadcast egress pipeline alongside the SFU |

**Clarification Summary:**

```
"Let me summarize the requirements:
- Build a video conferencing platform supporting 2 to 1000+ participants
- Core features: audio/video calling, screen sharing, recording, chat
- Sub-150ms latency for interactive conversation
- Support heterogeneous clients (desktop, mobile, poor networks)
- Recording with post-meeting compositing as default
- Standard encryption (DTLS-SRTP), E2EE as opt-in

Does this match your expectations?"
```

### Phase 2: High-Level Design (5-12 min)

**Core Components to Draw:**

```
CLIENT <--WebRTC--> EDGE (STUN/TURN) <--Media--> SFU CLUSTER
CLIENT <--WebSocket--> SIGNALING SERVER <--Metadata--> MEETING ORCHESTRATOR

Key insight: Two completely separate paths
1. Signaling Path: WebSocket, reliable, low bandwidth, manages room state
2. Media Path: UDP/SRTP, real-time, high bandwidth, SFU forwards packets
```

**Data Flow Explanation:**

```
JOINING A MEETING:
"When a participant joins:
1. Client connects to Signaling Server via WebSocket
2. Meeting Orchestrator selects the nearest SFU node (GeoDNS)
3. Client runs ICE connectivity checks (STUN for NAT discovery)
4. If direct path fails (~15% of users), TURN relay is used
5. DTLS handshake establishes encryption, SRTP keys derived
6. Client starts sending audio/video via simulcast (3 quality layers)
7. SFU notifies other participants via signaling of new publisher"

MEDIA FORWARDING:
"When media flows in a 10-person meeting:
1. Each participant sends 3 simulcast streams to SFU (high/med/low)
2. SFU receives 30 total incoming streams (10 participants x 3 layers)
3. For each subscriber, SFU selects the appropriate layer based on:
   - Subscriber's estimated bandwidth (TWCC feedback)
   - Video tile size in subscriber's UI layout
   - Active speaker priority
4. SFU forwards selected streams -- no decoding, no transcoding
5. Each subscriber may receive different quality for each sender"

RECORDING FLOW:
"When recording is enabled:
1. Recording bot joins as a hidden participant in the SFU
2. Bot receives all audio/video streams
3. Post-meeting: MCU compositor decodes all tracks
4. Layout engine renders active-speaker layout
5. Single output encoded to H.264/AAC, stored in object storage"
```

### Phase 3: Deep Dive (12-25 min)

Pick one area based on interviewer interest:

**Option A: SFU Selective Forwarding**

```
KEY POINTS TO COVER:

1. WHAT THE SFU DOES
   "The SFU is a packet router, not a media processor.
   It receives RTP packets from publishers and forwards
   copies to subscribers. No decoding, no transcoding.
   This is why it scales to 15x more users than an MCU."

2. SIMULCAST LAYER SELECTION
   "Each publisher sends 3 layers:
   - High: 720p/1080p at 1-2 Mbps
   - Medium: 360p at 500 Kbps
   - Low: 180p at 150 Kbps
   SFU independently selects a layer per subscriber per sender."

3. CONGESTION CONTROL
   "Two mechanisms work together:
   - GCC (Google Congestion Control): Delay-based estimation
   - TWCC (Transport-Wide Congestion Control): Per-packet feedback
   SFU continuously estimates each subscriber's available bandwidth
   and adjusts layer selection. No centralized coordinator needed."

4. KEYFRAME MANAGEMENT
   "When SFU switches simulcast layers, the subscriber needs
   a keyframe (I-frame) from the new layer. SFU sends a PLI
   (Picture Loss Indication) to the publisher. Keyframes are
   50-100 KB -- causing a brief bandwidth spike. SFU must
   rate-limit PLI requests to avoid keyframe storms."

5. ACTIVE SPEAKER DETECTION
   "SFU analyzes audio energy levels (RTP header extensions)
   to determine the active speaker. Speaker's video gets the
   high-quality layer allocation. Non-speakers may get
   low-quality or no video at all (Last-N optimization)."
```

**Option B: Bandwidth Adaptation**

```
KEY POINTS TO COVER:

1. THE CORE PROBLEM
   "In a 10-person meeting, one participant has 50 Mbps fiber
   and another has 500 Kbps mobile. The same SFU must serve
   both simultaneously with different quality."

2. SIMULCAST VS SVC
   "Simulcast: 3 separate encoded streams, SFU picks one.
   SVC: Single stream with embedded layers, SFU drops layers.

   Simulcast: Universal browser support, simpler SFU logic,
   but 1.5-2x upstream bandwidth overhead.

   SVC: 20-30% more efficient, smoother transitions,
   but limited codec support (VP9/AV1 only)."

3. SUBSCRIBER-SIDE ADAPTATION
   "Each subscriber path is independently managed:
   - TWCC feedback every 100ms reports packet arrival times
   - SFU estimates available bandwidth per subscriber
   - Layer selection adjusted per sender per subscriber
   - During congestion: audio prioritized over video always"

4. PUBLISHER-SIDE ADAPTATION
   "If publisher's upstream is constrained:
   - Reduce simulcast layers (drop high, keep med/low)
   - Lower frame rate before resolution
   - Audio never degraded below 32 Kbps Opus
   - SFU can send REMB/TMMBR to signal max bitrate"

5. GRACEFUL DEGRADATION LADDER
   "1080p -> 720p -> 360p -> 180p -> audio-only -> Opus at 32 Kbps
   Each step triggered by bandwidth estimation thresholds.
   Users see a quality indicator, not a frozen screen."
```

**Option C: NAT Traversal and Connectivity**

```
KEY POINTS TO COVER:

1. THE ICE FRAMEWORK
   "ICE gathers connectivity candidates in priority order:
   - Host: Direct local address (fastest, works on same LAN)
   - Server-Reflexive (srflx): Public IP discovered via STUN
   - Relay: Traffic routed through TURN server (always works)
   ICE tries all candidates in parallel, picks the best working path."

2. WHY TURN EXISTS
   "~15% of users are behind symmetric NATs or strict firewalls
   that block direct UDP. TURN relays media through a server
   the client can reach. Cost: 2x bandwidth (client->TURN->SFU
   instead of client->SFU directly)."

3. TURN SCALING
   "TURN servers are bandwidth-intensive, not CPU-intensive.
   Each relayed participant consumes 2x their media bandwidth.
   Deploy TURN at every edge PoP, co-located with SFU nodes.
   Use TURN over TCP/443 as last resort for corporate firewalls."

4. DTLS AND SRTP
   "DTLS handshake runs over the ICE-established path.
   SRTP keys derived from DTLS -- every media packet encrypted.
   This is mandatory in WebRTC, not optional.
   Handshake adds 200-500ms to connection setup."

5. CONNECTION MIGRATION
   "Mobile users switch between WiFi and cellular.
   ICE restart re-gathers candidates without dropping the call.
   Users experience a brief freeze (1-3 seconds), not a disconnect."
```

### Phase 4: Scale & Trade-offs (25-35 min)

**Scaling Discussion Points:**

```
LARGE MEETINGS (100+ PARTICIPANTS):
"Single SFU becomes a bottleneck beyond 50-100 participants.
Solution: Cascaded SFU -- multiple SFU nodes in a tree.
- Each SFU handles 50-100 participants
- Inter-SFU links forward only active speakers
- Geographic cascading: one SFU per region, inter-region links
- Reduces per-node fan-out while maintaining global meeting"

WEBINAR SCALE (1000-10000+):
"At this scale, it's a broadcast, not a conversation.
- Audience members are receive-only (no upstream media)
- Last-N: Only forward top 5-10 speakers' video
- CDN-style distribution for the output stream
- Consider WHIP/WHEP protocols for broadcast-scale ingest/playback"

RECORDING PIPELINE SCALING:
"Recording is async and CPU-heavy (MCU-like compositing).
- Recording bot joins as hidden participant, receives from SFU
- Post-meeting compositing avoids live performance impact
- GPU-accelerated encoding for parallel meeting processing
- Object storage for raw tracks, CDN for final recordings"

GEOGRAPHIC DISTRIBUTION:
"Latency is dominated by physics (speed of light).
- Media servers deployed in 20+ regions globally
- GeoDNS routes participants to nearest SFU
- For cross-region meetings: cascaded SFU with inter-region links
- Google's private backbone reduces inter-DC latency vs public internet"
```

### Phase 5: Reliability (35-40 min)

```
SFU FAILOVER:
"SFU holds live room state -- subscriber lists, SRTP contexts.
On crash:
1. Fast detection via 2-second heartbeat timeout
2. Signaling server detects and selects new SFU
3. Clients auto-reconnect within 5 seconds
4. New ICE + DTLS handshake established
5. Users experience a brief freeze, not a call drop

Key insight: Media state is ephemeral. We accept the brief
interruption because rebuilding state is fast."

GRACEFUL DEGRADATION:
"When network conditions worsen, degrade in order:
1. Reduce video quality (1080p -> 720p -> 360p)
2. Reduce frame rate (30fps -> 15fps -> 7fps)
3. Pause non-speaker video (Last-N=1)
4. Switch to audio-only mode
5. Reduce audio quality (Opus 128 -> 64 -> 32 Kbps)
Never drop the call if any audio path exists."

HANDLING PACKET LOSS:
"Audio: Opus has built-in FEC (Forward Error Correction).
Up to 20% packet loss recoverable without retransmission.
Video: NACK-based retransmission for important packets.
Keyframes: RTX retransmission channel for I-frame recovery.
Beyond 30% loss: audio-only mode triggered."
```

---

## Trade-offs Discussion

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Media Server Architecture** | **SFU**: Forwards packets without transcoding. Scales to 15x more users per server. Clients handle decoding. | **MCU**: Decodes, composites, re-encodes. Single stream per subscriber. Very CPU-heavy. | SFU for live meetings (cost + scale). MCU only for recording compositing. |
| | Pros: Low server CPU, horizontal scaling, flexible layouts per client | Pros: Minimal client bandwidth/CPU, single stream, consistent experience | |
| | Cons: Higher client bandwidth, client must decode N streams | Cons: 15x higher server cost, adds transcoding latency, single layout for all | |
| **Bandwidth Adaptation** | **Simulcast**: Encode 3 separate streams (high/med/low). SFU selects per subscriber. | **SVC (Scalable Video Coding)**: Single encoded stream with embedded layers. SFU drops layers. | Simulcast as primary (broader codec support). SVC for VP9/AV1 capable clients. |
| | Pros: Universal browser support, simple SFU logic | Pros: More bandwidth efficient (20-30% savings), smoother transitions | |
| | Cons: 1.5-2x upstream bandwidth, discrete quality jumps | Cons: Limited codec support, complex encoder, not all browsers support | |
| **Connectivity** | **Direct (host/srflx)**: Client connects directly to SFU via public IP or STUN-discovered address | **TURN Relay**: All traffic relayed through TURN server | Direct when possible, TURN as fallback (~15% of connections) |
| | Pros: Lowest latency, no relay cost | Pros: Works behind any NAT/firewall | |
| | Cons: Blocked by symmetric NAT (~15% of users) | Cons: Double bandwidth cost, added latency, relay server cost | |
| **Recording** | **Post-meeting compositing**: Record individual tracks, composite after meeting ends | **Real-time compositing**: MCU-like compositor runs during meeting | Post-meeting for standard recordings, real-time for live streaming use cases |
| | Pros: No live performance impact, better quality (multi-pass encoding) | Pros: Recording available immediately, supports live streaming | |
| | Cons: 15-60 min processing delay, storage for raw tracks | Cons: Additional server CPU/GPU, potential impact on live quality | |
| **Large Meeting (1000+)** | **Cascaded SFU**: Multiple SFU nodes in a tree, inter-SFU forwarding | **Single SFU with Last-N**: One powerful node, only forward top-N speakers | Cascaded SFU for active participation; Last-N for webinar-style |
| | Pros: True multi-party, no participant limit | Pros: Simpler architecture, lower inter-DC bandwidth | |
| | Cons: Inter-SFU latency, complex routing | Cons: Limits active participants, single node SPOF | |
| **E2EE** | **SFU with Insertable Streams**: Media encrypted client-side, SFU forwards encrypted packets | **No E2EE (standard)**: SFU can inspect/modify media, enables server-side features | Standard mode by default, E2EE opt-in for sensitive meetings |
| | Pros: True end-to-end encryption, no trust in server | Pros: Enables recording, transcription, noise cancellation server-side | |
| | Cons: Disables all server-side features, more complex key management | Cons: Server can theoretically access media | |

---

## Trap Questions & How to Handle

### Trap 1: "Why not just use peer-to-peer for everything?"

**What They're Testing:** Understanding of mesh scaling limits

**Bad Answer:** "P2P is always better because it avoids server costs"

**Good Answer:**
> "P2P works well for 1-on-1 calls -- lowest latency, no server cost. But mesh topology requires N x (N-1) / 2 connections. At 10 participants that's 45 connections. Each client sends 9 upstream copies of their media. CPU and bandwidth explode quadratically.
>
> **The math at 10 participants:**
> - Mesh: 45 connections, each client encodes/uploads 9 streams
> - SFU: 10 connections total, each client uploads 1 stream (3 simulcast layers)
>
> SFU reduces upstream to O(N) while the server handles the fan-out. The server cost is dramatically lower than the client-side cost of mesh. Production systems use P2P only for 1-on-1, SFU for 3+ participants."

---

### Trap 2: "Why not use MCU? It sends only one stream per client."

**What They're Testing:** Understanding of SFU vs MCU economics

**Bad Answer:** "MCU is simpler for clients, so it's better"

**Good Answer:**
> "MCU requires decode-composite-reencode for every frame from every participant. A 10-person meeting needs 10 full video decoders + 1 compositor + 1 encoder per subscriber. At 100 participants, this is economically impossible.
>
> **Server CPU comparison:**
> - SFU: Packet forwarding only. One server handles 200+ participants
> - MCU: Full transcoding pipeline. One server handles ~15 participants
>
> SFU handles 15x more participants on the same hardware. MCU's advantage (single stream per subscriber) matters less now that modern devices can decode multiple streams efficiently. MCU is reserved for recording compositing where the decode/encode is unavoidable."

---

### Trap 3: "What happens when the SFU server crashes?"

**What They're Testing:** Fault tolerance thinking for stateful real-time systems

**Bad Answer:** "We just restart it and users reconnect automatically"

**Good Answer:**
> "Unlike stateless web servers, SFU holds live room state -- subscriber lists, SRTP encryption contexts, simulcast layer assignments, congestion control state. This makes failover non-trivial.
>
> **Recovery sequence:**
> 1. Fast detection: 2-second heartbeat failure
> 2. Signaling server notifies all clients of SFU change
> 3. Client initiates ICE restart to new SFU (5 seconds)
> 4. New DTLS handshake, new SRTP keys derived
> 5. Media flows resume, simulcast layers re-negotiated
>
> Users experience a brief freeze (3-7 seconds), not a call drop. The key insight: media session state is ephemeral -- we accept the brief interruption because rebuilding is fast. We don't try to replicate SFU state in real-time; that would add latency to the normal path for a rare failure case."

---

### Trap 4: "How do you handle a participant on a 100 Kbps connection?"

**What They're Testing:** Adaptive quality and per-subscriber independence

**Bad Answer:** "We reduce quality for the whole meeting"

**Good Answer:**
> "Each subscriber gets independently adapted quality. The participant on 100 Kbps doesn't affect anyone else.
>
> **Adaptation for this participant:**
> 1. SFU sends the lowest simulcast layer (180p at 100-150 Kbps)
> 2. If even that exceeds bandwidth, switch to audio-only mode (Opus at 32 Kbps)
> 3. Congestion control (GCC/TWCC) continuously re-estimates available bandwidth
> 4. As bandwidth fluctuates, SFU dynamically switches layers
>
> **The key insight:** Each subscriber path is independently managed. The fiber user in the same meeting still gets 1080p. The SFU makes per-subscriber, per-sender layer selection decisions every few hundred milliseconds."

---

### Trap 5: "How does E2EE work if the SFU needs to route packets?"

**What They're Testing:** WebRTC security model understanding

**Bad Answer:** "The SFU decrypts the packets to route them, then re-encrypts"

**Good Answer:**
> "SFU forwards RTP packets but doesn't need to decrypt the payload. With the Insertable Streams API, the client encrypts the media frame payload before RTP packetization. The SFU sees RTP headers (routing info) but cannot access the encrypted payload.
>
> **Layer separation:**
> - RTP headers: Unencrypted, used by SFU for routing, SSRC mapping, sequence numbering
> - SRTP: Encrypts the full RTP payload (SFU-to-client hop encryption)
> - Insertable Streams: Additional client-to-client encryption of the media frame inside the RTP payload
>
> **Trade-off:** With E2EE enabled, the server cannot perform recording, transcription, noise cancellation, or any media processing. These features require access to the decoded media frames. This is why E2EE is opt-in, not default."

---

### Trap 6: "How do you record a meeting with 50 participants?"

**What They're Testing:** Recording architecture and layout strategy

**Bad Answer:** "Display all 50 videos in a grid and record the screen"

**Good Answer:**
> "Don't try to display 50 videos simultaneously. Use active-speaker layout: show the current speaker full-size, 4-5 recent speakers in thumbnails.
>
> **Recording architecture:**
> 1. A recording bot joins as a hidden participant in the SFU
> 2. Bot receives all audio and the active speakers' video streams
> 3. Post-meeting: MCU compositor decodes all tracks
> 4. Layout engine renders active-speaker layout with transitions
> 5. Single output encoded to H.264/AAC, stored in object storage
>
> **Why post-meeting compositing:**
> - No live performance impact on the meeting
> - Multi-pass encoding produces better quality at lower bitrate
> - Layout can be retrospectively adjusted
> - Trade-off: 15-60 min processing delay before recording is available
>
> For live streaming use cases, real-time compositing is needed -- but that's a separate GPU-accelerated pipeline."

---

### Trap 7: "How do you scale to 10,000 participants?"

**What They're Testing:** Understanding the boundary between conferencing and broadcasting

**Bad Answer:** "Add more SFU servers in parallel"

**Good Answer:**
> "At 10,000 participants, it's a broadcast, not a conversation. The architecture shifts fundamentally:
>
> 1. **Cascaded SFU tree**: Primary SFU for presenters, fan-out SFUs for audience regions
> 2. **Last-N**: Only the top 5-10 speakers have video forwarded. Audience is receive-only
> 3. **Audience optimization**: Receive-only participants don't need ICE/TURN -- they can use simpler protocols
> 4. **CDN-style distribution**: For the audience stream, consider WHIP (ingest) / WHEP (playback) protocols
> 5. **Selective interactivity**: Hand-raise queue, promoted speakers get temporary publish rights
>
> The key insight: don't try to make a 10,000-person meeting work like a 10-person meeting. Accept the broadcast model and optimize for it."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| **Treating media like HTTP requests** | Media is real-time, loss-tolerant, delay-intolerant. No retries, no queuing. | Design for UDP, packet loss tolerance, jitter buffers |
| **Forgetting signaling/media separation** | These are completely different paths with different requirements | Draw two separate flows: WebSocket signaling + UDP/SRTP media |
| **Choosing MCU as default** | MCU doesn't scale. SFU is the industry standard. | Start with SFU, explain why. Mention MCU only for recording. |
| **Ignoring NAT traversal** | ICE/STUN/TURN is not optional. ~15% of users need TURN relay. | Include ICE connectivity checks and TURN fallback in the design |
| **Not discussing bandwidth adaptation** | Simulcast/SVC and congestion control are core to the design | Explain per-subscriber layer selection and GCC/TWCC |
| **Over-focusing on UI/features** | The interview is about the media routing infrastructure | Spend time on SFU, simulcast, congestion control -- not chat or calendar |
| **Forgetting about recording** | It's a fundamentally different processing model (MCU-like) than live (SFU) | Explicitly call out recording as a separate pipeline |
| **Assuming all participants have the same network** | Heterogeneous networks are the norm, not the exception | Emphasize per-subscriber independent quality adaptation |

---

## Questions to Ask Interviewer

| When | Question | Why It Matters |
|------|----------|----------------|
| **At the start** | "What's the maximum meeting size -- 10, 100, 1000, or 10000?" | Determines SFU topology (single, cascaded, or broadcast) |
| **At the start** | "Do we need recording? Real-time or post-meeting?" | Recording is a fundamentally different pipeline |
| **At the start** | "Is end-to-end encryption required?" | E2EE disables all server-side media features |
| **At the start** | "What's the latency budget -- interactive or broadcast?" | Interactive (<150ms) vs broadcast (2-5 seconds) changes everything |
| **During design** | "Should I go deeper on SFU forwarding or bandwidth adaptation?" | Gauge interviewer's interest area |
| **During design** | "Mobile support priority?" | Affects codec/bandwidth decisions and simulcast strategy |
| **At the end** | "Enterprise features like SSO, data residency?" | Influences multi-region design and compliance scope |
| **At the end** | "Do we need live streaming to non-WebRTC viewers?" | Adds HLS/DASH egress pipeline to the architecture |

---

## Quick Reference Card

### WebRTC Protocol Stack

```
+-----------------------------------------+
|              Application                 |
+-----------+-----------+-----------------+
|  SRTP     |  SCTP     |  (Media/Data)   |
+-----------+-----------+                 |
|       DTLS            |  (Security)     |
+-----------------------+                 |
|       ICE             |  (Connectivity) |
+-----------+-----------+                 |
|   STUN    |   TURN    |  (NAT Traversal)|
+-----------+-----------+                 |
|       UDP / TCP       |  (Transport)    |
+-----------------------+-----------------+
```

### Key Numbers to Remember

| Metric | Value |
|--------|-------|
| Audio bandwidth (Opus) | 32-128 Kbps |
| Video bandwidth (720p) | 1-2 Mbps |
| Video bandwidth (1080p) | 2.5-4 Mbps |
| Acceptable audio latency | <150ms (mouth-to-ear) |
| Acceptable video latency | <200ms (glass-to-glass) |
| ICE connectivity check | 2-5 seconds |
| DTLS handshake | 200-500ms |
| SFU fan-out scaling | O(N) per packet |
| Mesh scaling | O(N^2) connections |
| TURN relay overhead | ~2x bandwidth |
| Simulcast upstream overhead | ~1.5-2x bandwidth |
| Keyframe size (H.264 720p) | ~50-100 KB |
| Users needing TURN relay | ~15% |
| SFU vs MCU capacity ratio | ~15x more participants on same hardware |
| SFU failover recovery time | 3-7 seconds |
| Opus FEC packet loss tolerance | Up to 20% |

### Architecture Decision Quick Reference

```
+-----------------------------------------------------------------+
|              VIDEO CONFERENCING DECISION TREE                    |
+-----------------------------------------------------------------+
|                                                                  |
|  MEETING SIZE          TOPOLOGY           KEY CONCERN            |
|  ────────────          ────────           ───────────            |
|  2 participants   -->  P2P                Lowest latency         |
|  3-50 participants --> Single SFU         Simulcast selection    |
|  50-500 participants-> Cascaded SFU       Inter-SFU routing      |
|  500-10000+       -->  Broadcast SFU      Last-N, receive-only   |
|                                                                  |
|  BANDWIDTH ADAPTATION  APPROACH           WHEN TO USE            |
|  ────────────────────  ────────           ───────────            |
|  Good network     -->  High simulcast     Fiber / WiFi users     |
|  Medium network   -->  Medium simulcast   Typical mobile         |
|  Poor network     -->  Low simulcast      3G / congested WiFi    |
|  Very poor        -->  Audio-only         <150 Kbps available    |
|                                                                  |
|  RECORDING             METHOD             TRADE-OFF              |
|  ─────────             ──────             ─────────              |
|  Standard meetings --> Post-meeting MCU   15-60 min delay        |
|  Live streaming    --> Real-time MCU      GPU cost, live impact  |
|  E2EE meetings    --> Client-side only    No server recording    |
|                                                                  |
|  ENCRYPTION            MODE               IMPACT                 |
|  ──────────            ────               ──────                 |
|  Standard         -->  DTLS-SRTP          All features work      |
|  E2EE             -->  Insertable Streams No server-side features|
|                                                                  |
|  COMMON TRADE-OFFS                                               |
|  ─────────────────                                               |
|  - SFU over MCU (15x scale, higher client bandwidth)             |
|  - Simulcast over SVC (universal support, less efficient)        |
|  - Post-meeting recording (no live impact, delayed availability) |
|  - TURN as fallback only (15% of users, 2x bandwidth cost)      |
|  - E2EE opt-in (preserves server features for most meetings)     |
|                                                                  |
|  FAILURE SCENARIOS TO MENTION                                    |
|  ────────────────────────────                                    |
|  - SFU crash --> ICE restart, 3-7s recovery, ephemeral state     |
|  - Network degradation --> Simulcast downshift, audio-only       |
|  - TURN overload --> Geo-distributed TURN, TCP/443 fallback      |
|  - Keyframe storm --> PLI rate limiting, periodic keyframes      |
|  - Cross-region latency --> Cascaded SFU, private backbone       |
|                                                                  |
+-----------------------------------------------------------------+
```

---

## Sample Interview Dialogue

```
INTERVIEWER: "Design a video conferencing system like Google Meet or Zoom"

CANDIDATE: "Great question! Before I dive in, let me clarify a few things.
What's the maximum meeting size we need to support -- small meetings
of 10 people, or large events with 1000+? Do we need recording?
And is end-to-end encryption a requirement?"

INTERVIEWER: "Support up to 500 participants. Recording is needed.
Standard encryption is fine."

CANDIDATE: "Perfect. I want to emphasize upfront that this is fundamentally
different from typical request-response systems. Media uses UDP, not TCP.
Packet loss is acceptable, but delay is not. The architecture has two
completely separate paths: signaling over WebSocket and media over
SRTP/UDP.

[Draws high-level diagram]

The core component is the SFU -- Selective Forwarding Unit. It receives
media packets from each publisher and forwards copies to subscribers
without transcoding. This is critical for scale -- an SFU handles 15x
more participants than an MCU on the same hardware.

Should I go deeper on the SFU forwarding logic, or on how we handle
bandwidth adaptation for heterogeneous clients?"

INTERVIEWER: "How does bandwidth adaptation work?"

CANDIDATE: "Each publisher sends 3 simulcast layers -- high (720p),
medium (360p), and low (180p). The SFU independently selects a layer
for each subscriber based on their estimated bandwidth using TWCC
congestion control feedback.

The key insight is per-subscriber independence. A fiber user gets
1080p while a mobile user on 3G gets 180p, in the same meeting,
from the same SFU. If conditions worsen further, the SFU degrades
gracefully: lower resolution, then lower frame rate, then audio-only.

For the 500-participant case, we'd use cascaded SFUs -- multiple
nodes in a tree, with inter-SFU links forwarding only active
speakers. Each node handles 50-100 participants..."

[Continues with scaling and recording deep dive]
```

---

*[<- Previous: Observability](./07-observability.md) | [Back to Index](./00-index.md)*
