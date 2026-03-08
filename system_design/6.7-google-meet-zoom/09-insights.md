# Key Insights: Google Meet / Zoom

## Insight 1: SFU Fan-Out is O(N) Not O(N squared) -- That's the Entire Value Proposition

**Category:** Scaling
**One-liner:** SFU reduces per-participant connection count from N*(N-1)/2 (mesh) to N, making group calls economically viable beyond 4 participants.

**Why it matters:** In a peer-to-peer mesh, each participant must encode and send their stream to every other participant. At 10 participants, that's 90 streams (45 bidirectional connections). An SFU accepts one upload per participant and handles the fan-out -- the server does O(N) work per packet instead of the client doing O(N) work per stream. This single architectural decision is what makes 100+ participant meetings possible on commodity hardware.

---

## Insight 2: Signaling and Media Are Completely Decoupled Paths

**Category:** System Modeling
**One-liner:** The control plane (WebSocket signaling) and data plane (UDP media) are architecturally independent -- one can fail without affecting the other.

**Why it matters:** When the signaling server crashes, active media streams continue flowing through the SFU because the SFU has already established SRTP sessions. Participants may not see roster updates, but they can still hear and see each other. This decoupling is intentional: signaling is reliable (TCP/WebSocket) while media is best-effort (UDP/RTP). Understanding this separation is crucial for failure analysis -- a "connection issue" might be signaling-only, media-only, or both.

---

## Insight 3: Keyframe Caching Prevents Publisher Storm During Mass Joins

**Category:** Contention
**One-liner:** Without keyframe caching, N simultaneous subscribers trigger N PLI requests to the same publisher, causing encoder overload and bandwidth spikes.

**Why it matters:** When 500 people join a meeting at the same time, each subscriber needs a keyframe to start rendering video. Without caching, the SFU sends 500 PLI (Picture Loss Indication) requests to each publisher, who then generates 500 redundant keyframes. This is a self-inflicted thundering herd. By caching the last keyframe per track, the SFU serves new subscribers immediately from cache and deduplicates PLI requests -- one keyframe serves all pending subscribers.

---

## Insight 4: Congestion Control Must Be Per-Subscriber, Not Per-Room

**Category:** Traffic Shaping
**One-liner:** Each subscriber has independent network conditions -- GCC/TWCC bandwidth estimation runs separately per downlink, not as a room-wide setting.

**Why it matters:** In a 10-person meeting, one participant on fiber can receive 1080p while another on cellular gets 360p. If congestion control were room-wide, the weakest link would degrade everyone's experience. Per-subscriber TWCC feedback allows the SFU to select different simulcast layers for each recipient independently. This is the fundamental architectural advantage of SFU over MCU -- MCU produces one composite stream for all, while SFU can tailor delivery per subscriber.

---

## Insight 5: TURN Relay Creates a 2x Bandwidth Tax That Scales With User Count

**Category:** Cost Optimization
**One-liner:** ~15% of connections require TURN relay, doubling bandwidth cost per relayed stream -- at scale this becomes a significant infrastructure line item.

**Why it matters:** TURN relay means client-to-TURN-to-SFU (upload) and SFU-to-TURN-to-client (download), doubling the bandwidth consumed for that participant. At 30M concurrent streams with 15% needing TURN, that's 4.5M relayed streams consuming double bandwidth. TURN servers must be deployed at edge PoPs to minimize latency, but each PoP needs enough capacity for its region's symmetric-NAT users. The cost optimization strategy is to periodically attempt ICE restart to find direct paths, reducing TURN dependency over time.

---

## Insight 6: Simulcast Layer Switching Requires Keyframe Synchronization

**Category:** Streaming
**One-liner:** Switching from low to high simulcast layer forces a wait for the next keyframe on the high layer -- causing 100-300ms of frozen video during quality upgrades.

**Why it matters:** Video codecs use inter-frame prediction: P-frames reference previous frames. When the SFU switches a subscriber from 360p to 1080p layer, it cannot start forwarding mid-stream because the subscriber has no reference frames for the 1080p layer. It must wait for a keyframe (I-frame). If one isn't available, the SFU sends a PLI to the publisher, adding the round-trip time plus encoder processing. This creates a brief visible freeze that users notice. Strategies to mitigate: periodic keyframe insertion (every 2-3 seconds), predictive layer switching before active speaker change, and SFU keyframe caching.

---

## Insight 7: Recording and Live Delivery Are Architecturally Opposed

**Category:** System Modeling
**One-liner:** Live delivery uses SFU (forward without processing), while recording requires MCU-like compositing (decode, mix, re-encode) -- two conflicting media models in one system.

**Why it matters:** The SFU never touches packet payloads -- it's a router. But recording needs decoded frames to composite a grid layout. This means recording either requires a separate MCU compositor running alongside the SFU (real-time recording) or saving individual tracks and batch-compositing post-meeting. Neither is ideal: real-time compositing adds server cost, while batch compositing adds delay. The "recording bot as hidden participant" pattern is the industry solution -- it joins the meeting like any subscriber and receives streams from the SFU, isolating recording load from the live forwarding path.

---

## Insight 8: E2EE Disables Server-Side Intelligence -- A Fundamental Architectural Trade-off

**Category:** Security
**One-liner:** End-to-end encryption prevents the SFU from accessing media content, disabling noise cancellation, transcription, recording, and background blur.

**Why it matters:** With E2EE via Insertable Streams, the client encrypts the media frame payload before RTP packetization. The SFU sees RTP headers (needed for routing) but encrypted payload. This means every server-side feature that requires accessing audio/video content is disabled. This isn't a bug -- it's a fundamental trade-off between privacy and functionality. Organizations must choose: maximum privacy (E2EE mode, no server features) or maximum functionality (standard mode, server can process media). Some platforms offer hybrid approaches where certain features run client-side (noise cancellation) while still using E2EE.

---

## Insight 9: Active Speaker Detection Needs Debouncing to Prevent Layout Thrashing

**Category:** Streaming
**One-liner:** Without a minimum hold time (300ms+), overlapping speech causes rapid speaker switches that thrash video layouts and waste bandwidth on constant quality renegotiation.

**Why it matters:** When two people talk simultaneously, the active speaker can flip between them multiple times per second. Each flip triggers: (1) video layout change for all subscribers, (2) simulcast layer renegotiation (new speaker needs high quality, previous speaker drops to low), (3) keyframe requests for the new high-quality stream. This cascade of events wastes bandwidth and CPU. A 300ms minimum hold time with exponential moving average smoothing eliminates false transitions while keeping the system responsive to genuine speaker changes.

---

## Insight 10: Cascaded SFU Tree Topology Trades Latency for Scale

**Category:** Scaling
**One-liner:** For meetings spanning multiple regions, SFU nodes form a forwarding tree -- each inter-region hop adds 50-150ms latency but eliminates the need for every participant to connect to one server.

**Why it matters:** A meeting with participants in New York, London, and Tokyo cannot be served by a single SFU without some participants suffering 200ms+ first-hop latency. Cascaded SFU places a node in each region: participants connect to their local SFU (low latency), and SFUs exchange streams between themselves. The trade-off: inter-SFU hops add latency (cross-Atlantic: ~80ms, cross-Pacific: ~150ms). But the total latency is still better than if all participants connected to a single distant server, because only inter-region streams take the penalty, not every packet from every participant.

---

## Insight 11: UDP is Non-Negotiable for Real-Time Media -- TCP Head-of-Line Blocking Destroys Latency

**Category:** Resilience
**One-liner:** A single lost TCP segment blocks all subsequent data until retransmission succeeds -- fatal for real-time media where a 200ms stall is worse than a dropped frame.

**Why it matters:** TCP guarantees ordered delivery: if segment 5 is lost, segments 6, 7, 8 are buffered until 5 is retransmitted. For media, this means one lost packet stalls the entire stream for one RTT (typically 50-200ms). With UDP, the application simply skips the lost packet -- a brief audio glitch or video artifact, barely noticeable. This is why WebRTC mandates UDP transport for media (RTP/SRTP) and only falls back to TCP/TURN as a last resort behind restrictive firewalls. The 2-3% packet loss that's invisible over UDP becomes a 200ms stutter every few seconds over TCP.

---

## Insight 12: Geo-Routing Media Servers via Anycast Minimizes First-Hop Latency

**Category:** Edge Computing
**One-liner:** Anycast IP addressing automatically routes participants to their nearest SFU PoP, reducing first-hop latency to <20ms for 95% of users.

**Why it matters:** In video conferencing, total end-to-end latency is the sum of all hops. The first hop (client to SFU) is the most controllable. By deploying SFU nodes at 200+ edge PoPs with anycast addresses, the network layer itself selects the closest server via BGP routing. No DNS resolution delay, no geo-lookup latency, no redirect. Combined with cascaded SFU for inter-region forwarding, this keeps the controllable portion of latency (first/last hop) under 20ms, leaving the inter-region backbone latency as the only unavoidable component.
