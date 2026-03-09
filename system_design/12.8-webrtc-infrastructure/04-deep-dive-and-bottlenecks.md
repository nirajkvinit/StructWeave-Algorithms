# Deep Dive & Bottlenecks — WebRTC Infrastructure

## Deep Dive 1: SFU Media Router

### Why This Component Is Critical

The SFU media router is the heart of the system—it handles every media packet flowing between participants. A room with 10 participants each sending 2 tracks (audio + video) with 9 subscribers per track means the SFU processes 10 × 2 = 20 incoming tracks and routes 20 × 9 = 180 outgoing track copies per room. At the platform level, thousands of concurrent rooms mean millions of packets per second flowing through the router. Any inefficiency here—an extra memory copy, a lock contention point, a suboptimal buffer size—multiplies across every packet and directly impacts latency, CPU utilization, and maximum node capacity.

### Internal Mechanics

**Packet Reception Pipeline:**

```
1. UDP Socket Receive
   - Kernel delivers RTP packet to userspace via recvmmsg (batch receive)
   - Batch size: 64-128 packets per syscall to reduce context switches
   - Each packet: ~1200 bytes (MTU-sized)

2. SRTP Demultiplex
   - First byte inspection: distinguish STUN, DTLS, SRTP, SRTCP
   - SRTP: decrypt payload using per-participant SRTP context
   - Identify track by SSRC (Synchronization Source identifier)

3. Track Ingress Buffer
   - Per-track circular buffer (capacity: 1-2 seconds of packets)
   - Handles packet reordering (sequence number gaps)
   - Detects packet loss via sequence number gaps
   - Maintains per-track statistics: packets received, bytes, loss rate

4. Simulcast Layer Router
   - Inspect RTP header extension for simulcast RID (stream identifier)
   - Route to appropriate layer buffer (full/half/quarter)
   - Track keyframe positions for clean layer switching
```

**Packet Forwarding Pipeline:**

```
1. Subscription Manager
   - Maintains a map: track_id -> [subscriber_contexts]
   - Each subscriber context holds:
     - Selected simulcast layer
     - SRTP encryption context (subscriber's keys)
     - Sequence number rewriter (translates publisher seq to subscriber seq)
     - Timestamp rewriter (maintains continuity across layer switches)
     - Pacer state (send rate limiting)

2. Layer Selection
   - Reads subscriber's bandwidth estimate (from TWCC/REMB feedback)
   - Applies simulcast selection algorithm (see 03-low-level-design)
   - On layer switch: wait for next keyframe on target layer
   - Rewrite RTP sequence numbers and timestamps for continuity

3. Packet Forwarding
   - For each subscriber of the track:
     a. Select packet from the chosen layer's buffer
     b. Rewrite RTP header (seq, timestamp, SSRC -> subscriber's SSRC)
     c. SRTP encrypt with subscriber's key material
     d. Enqueue in subscriber's send buffer
     e. Pacer releases packets at controlled rate

4. RTCP Processing
   - Receiver Reports (RR): subscriber reports packet loss and jitter
   - TWCC feedback: per-packet arrival timestamps for bandwidth estimation
   - PLI/FIR: subscriber requests keyframe (on layer switch or corruption)
   - REMB: receiver-estimated max bitrate
   - Forward relevant RTCP to publisher (e.g., PLI triggers keyframe)
```

**Memory Layout Optimization:**

```
Per-track buffer design:
  - Ring buffer of RTP packet slots
  - Each slot: [header (12-72 bytes) | payload (up to 1200 bytes) | metadata]
  - Metadata: arrival_time, sequence_number, marker_bit, is_keyframe
  - No heap allocation per packet — pre-allocated pool
  - Zero-copy forwarding: subscriber reads from publisher's ring buffer
    (only header rewriting and re-encryption create new data)
```

### Failure Modes

| Failure | Impact | Handling |
|---|---|---|
| **Publisher disconnects** | All subscribers lose their feed | Send `track_unpublished` event; subscribers see freeze then black frame |
| **Subscriber bandwidth drops** | Congestion, packet loss on subscriber link | SFU detects via TWCC, switches to lower simulcast layer within 1-2 seconds |
| **SSRC collision** | Two publishers use the same SSRC, packets get mixed | SFU remaps SSRCs internally; assigns unique forwarded SSRCs per subscriber |
| **Keyframe loss** | Subscriber cannot decode until next keyframe | SFU sends PLI (Picture Loss Indication) to publisher requesting keyframe |
| **SFU node overload** | Packets queued, forwarding latency increases | Shed load: reject new room assignments; drain participants to other nodes |
| **Network partition** | Cascaded SFU loses connection to peer SFU | Participants on isolated node continue locally; cross-node subscriptions freeze |

### Performance Characteristics

| Metric | Value | Constraint |
|---|---|---|
| Packets processed per second per core | ~50,000 | Dominated by SRTP encrypt/decrypt |
| Forwarding latency (ingress to egress) | 1-3ms | Measured packet-in to packet-out on same node |
| Memory per track (buffer) | ~2 MB | 1.5 seconds × 1.5 Mbps / 8 = 281 KB + metadata overhead |
| Memory per participant (state) | ~50 KB | ICE state, SRTP contexts, subscription map |
| CPU per SRTP operation | ~1 μs | AES-128-CM with hardware acceleration |
| Maximum tracks per 10 Gbps node | ~1,500 | Limited by aggregate bitrate, not CPU |

---

## Deep Dive 2: ICE / NAT Traversal Engine

### Why This Component Is Critical

ICE determines whether a call connects at all. If ICE fails, there is no media flow—period. The engine must handle a bewildering variety of NAT types (full cone, restricted cone, port-restricted, symmetric), network configurations (dual-stack IPv4/IPv6, VPNs, corporate proxies), and platform quirks (mobile OS restrictions on background UDP, browser sandboxing). ICE must complete quickly (users expect to see video within 2 seconds of clicking "join") while being thorough enough to find the optimal path. The tension between speed and thoroughness defines the engineering challenge.

### Internal Mechanics

**NAT Types and Connectivity Matrix:**

```
                          Remote Candidate Type
                    Host    Server-Reflexive    Relay
Local:
  Host              Direct     Possible*       Always
  Server-Reflexive  Possible*  Depends on NAT  Always
  Relay             Always     Always           Always

* "Possible" means: works if both NATs are not symmetric.
  Symmetric NAT blocks server-reflexive connectivity → TURN required.
```

**NAT Type Distribution (Observed in Production):**

```
Full Cone NAT:           ~15% of clients (most permissive)
Address-Restricted NAT:  ~30% of clients
Port-Restricted NAT:     ~35% of clients
Symmetric NAT:           ~15% of clients (requires TURN)
No NAT (public IP):      ~5% of clients (servers, some enterprises)
```

**ICE Candidate Gathering Sequence:**

```
FUNCTION gather_candidates(stun_servers, turn_servers):
    candidates = []

    // Phase 1: Host candidates (immediate, no network call)
    FOR each local_interface IN get_network_interfaces():
        IF interface.is_up AND NOT interface.is_loopback:
            candidate = create_host_candidate(interface.address, allocate_port())
            candidate.priority = compute_priority(HOST, interface.preference)
            candidates.APPEND(candidate)
            EMIT candidate_event(candidate)  // Trickle to remote via signaling

    // Phase 2: Server-reflexive candidates (STUN, ~5-50ms per server)
    FOR each stun_server IN stun_servers (PARALLEL):
        response = send_stun_binding(stun_server, timeout=2000ms)
        IF response.success:
            srflx_candidate = create_srflx_candidate(
                response.mapped_address,
                response.mapped_port,
                base=local_candidate
            )
            srflx_candidate.priority = compute_priority(SRFLX, ...)
            candidates.APPEND(srflx_candidate)
            EMIT candidate_event(srflx_candidate)

    // Phase 3: Relay candidates (TURN allocation, ~50-200ms)
    FOR each turn_server IN turn_servers (PARALLEL):
        allocation = send_turn_allocate(
            turn_server,
            credentials=get_turn_credentials(),
            lifetime=600,  // 10 minute allocation
            timeout=3000ms
        )
        IF allocation.success:
            relay_candidate = create_relay_candidate(
                allocation.relay_address,
                allocation.relay_port,
                base=local_candidate
            )
            relay_candidate.priority = compute_priority(RELAY, ...)
            candidates.APPEND(relay_candidate)
            EMIT candidate_event(relay_candidate)

    RETURN candidates

// Total gathering time: ~200-500ms (dominated by TURN allocation)
// With trickle ICE: first host candidates available in <1ms
```

**Connectivity Check Optimization — Aggressive Nomination:**

```
Standard ICE:
  1. Check all pairs → find all successful pairs → nominate best
  Result: thorough but slow (hundreds of ms to seconds)

Aggressive Nomination:
  1. Set USE-CANDIDATE flag on every check from controlling agent
  2. First check that succeeds in BOTH directions becomes nominated
  Result: faster (first successful pair wins) but may not be optimal

Production approach: Aggressive nomination with a brief "improvement window"
  1. Use aggressive nomination for immediate connectivity
  2. Continue checking higher-priority pairs for 1-2 seconds
  3. If a better pair succeeds, switch via ICE restart
```

### Failure Modes

| Failure | Impact | Handling |
|---|---|---|
| **All STUN servers unreachable** | No server-reflexive candidates; only host and relay | TURN relay becomes critical; if TURN also fails, ICE fails entirely |
| **TURN allocation denied** | No relay candidate; symmetric NAT users cannot connect | Retry with different TURN server; if all fail, show user connectivity error |
| **ICE timeout** | No candidate pair succeeded within timeout (30s default) | Report failure to application; suggest network troubleshooting |
| **ICE consent expiry** | Peer stops responding to consent checks (30s) | Close connection; trigger reconnection flow |
| **Network interface change** | Mobile: WiFi → cellular handoff | ICE restart: re-gather candidates, re-run checks on new interface |
| **Oort filtering by firewall** | Enterprise firewall blocks UDP | Fall back to TURN over TCP (port 443) — looks like HTTPS to firewall |

### Critical Edge Case: Oort 443 Fallback Chain

```
Connection attempt priority:
1. UDP direct (fastest, cheapest)
2. UDP via STUN reflexive (fast, no server cost)
3. UDP via TURN relay (adds relay hop latency)
4. TCP via TURN relay (TCP overhead adds ~20ms)
5. TLS via TURN relay on port 443 (looks like HTTPS, bypasses most firewalls)

Each fallback adds latency but increases connectivity probability.
Total fallback chain may take 5-10 seconds to exhaust all options.
Enterprise networks often require step 5 — ~8% of corporate users.
```

---

## Deep Dive 3: Adaptive Bitrate and Congestion Control

### Why This Component Is Critical

Congestion control is the single largest determinant of perceived call quality. A call with stable 500 Kbps and no packet loss looks and sounds better than a call that oscillates between 2 Mbps and 100 Kbps with 5% loss during transitions. The challenge is that WebRTC shares the network with other traffic (downloads, streaming, other calls), and must adapt in real-time without causing or suffering from congestion. The adaptation must be fast enough to respond to bandwidth changes (< 1 second) but stable enough to avoid oscillation (which causes visible quality flickering).

### Internal Mechanics

**Three-Party Adaptation Loop:**

The congestion control system spans three components that form a feedback loop:

```
Publisher (Sender)                    SFU                        Subscriber (Receiver)
       |                               |                               |
       | 1. Send RTP with              |                               |
       |    transport-wide seq nums    |                               |
       |------------------------------>|                               |
       |                               | 2. Forward selected           |
       |                               |    simulcast layer             |
       |                               |------------------------------>|
       |                               |                               |
       |                               |        3. TWCC feedback        |
       |                               |    (per-packet arrival times)  |
       |                               |<------------------------------|
       |                               |                               |
       |  4. Aggregate TWCC            |                               |
       |     + apply GCC               |                               |
       |<------------------------------|                               |
       |                               |                               |
       | 5. Adjust encoder bitrate     |                               |
       |    based on BW estimate       |                               |
       |                               |                               |
       |                               | 6. SFU independently          |
       |                               |    estimates subscriber BW    |
       |                               |    and switches simulcast     |
       |                               |    layers accordingly         |
```

**Bandwidth Estimation Convergence:**

```
Initial bandwidth estimate: 300 Kbps (conservative start)

Ramp-up phase (first 10 seconds):
  - GCC starts with AIMD (Additive Increase, Multiplicative Decrease)
  - Increase: +5% every 100ms while no overuse detected
  - Typical ramp: 300 -> 600 -> 900 -> 1200 -> 1500 Kbps in ~5 seconds

Steady state:
  - Estimate oscillates within ±10% of true available bandwidth
  - Overuse detection triggers 15% decrease
  - Recovery takes ~2 seconds of additive increase

Competing flows:
  - When another WebRTC call starts on same network:
    - Both GCC instances detect increased delay
    - Both reduce by 15%, then compete for bandwidth
    - Converge to ~equal share within 5-10 seconds
    - Slower convergence than TCP (intentional — avoids quality oscillation)
```

**SFU-Side Bandwidth Estimation (Independent of Sender):**

```
FUNCTION estimate_subscriber_bandwidth(subscriber):
    // SFU sends probe packets to subscriber
    // Subscriber returns TWCC feedback

    // Method 1: TWCC-based estimation
    twcc_estimate = analyze_twcc_feedback(subscriber.twcc_reports)

    // Method 2: Loss-based estimation
    loss_rate = subscriber.rtcp_receiver_report.fraction_lost
    IF loss_rate > 0.05:  // > 5% loss
        loss_estimate = subscriber.current_send_rate * (1 - loss_rate) * 0.85
    ELSE:
        loss_estimate = subscriber.current_send_rate * 1.05

    // Method 3: REMB from subscriber
    remb_estimate = subscriber.last_remb_value

    // Take minimum of all estimates (most conservative)
    estimated_bw = MIN(twcc_estimate, loss_estimate, remb_estimate)

    // Apply to simulcast layer selection
    select_simulcast_layer(subscriber, estimated_bw)
```

**Interaction Between Sender GCC and SFU Layer Selection:**

```
Scenario: Publisher sends 3 simulcast layers
  Full:    1280x720 @ 1.5 Mbps
  Half:    640x360  @ 500 Kbps
  Quarter: 320x180  @ 150 Kbps

Subscriber A: 2 Mbps estimated bandwidth
  -> SFU selects Full layer (1.5 Mbps < 2 Mbps * 0.80)
  -> Subscriber sees 720p video

Subscriber B: 400 Kbps estimated bandwidth
  -> SFU selects Quarter layer (150 Kbps < 400 Kbps * 0.80)
  -> Subscriber sees 180p video
  -> Note: SFU does NOT select Half (500 Kbps > 400 * 0.80 = 320 Kbps)

Subscriber C: Bandwidth drops from 2 Mbps to 300 Kbps
  -> SFU detects via TWCC within ~500ms
  -> Immediately switches from Full to Quarter (no waiting for upgrade threshold)
  -> Requests keyframe from publisher for clean switch
  -> Subscriber sees brief freeze (100-300ms) then 180p video
  -> When bandwidth recovers: SFU waits 3 consecutive good estimates before upgrading
```

### Failure Modes

| Failure | Impact | Handling |
|---|---|---|
| **TWCC feedback stops** | SFU cannot estimate subscriber bandwidth | Fall back to REMB; if that also stops, assume last known estimate with 10% reduction per second |
| **GCC oscillation** | Sender bitrate swings wildly, causing quality flickering | Increase overuse threshold hysteresis; lengthen hold period after decrease |
| **Bandwidth collapses to near-zero** | Video freezes, audio breaks up | Switch to audio-only mode; pause all video tracks; resume video when bandwidth recovers |
| **All simulcast layers too high** | Even lowest layer exceeds subscriber bandwidth | SFU sends PLI to force keyframe; codec dynamically lowers bitrate within the layer |
| **Competing non-adaptive flow** | TCP download on same network causes loss | GCC backs off more than TCP (by design — real-time media is loss-sensitive); user experiences degraded quality during download |

---

## Bottleneck Analysis

### Bottleneck 1: SFU Port Exhaustion

**Problem:** Each participant connection uses a UDP port on the SFU. With 1,000 participants on a single SFU node, that is 1,000 UDP ports. If each participant also has TURN fallback, the TURN server needs 2 ports per allocation (client-facing + peer-facing).

**Mitigation:**
- Use port ranges: allocate ephemeral ports from a large range (10000-65535 = 55K ports)
- BUNDLE: multiplex all media (audio + video + data) over a single port per participant
- With BUNDLE, a 10,000-port range supports 10,000 concurrent participants per SFU IP address
- Multiple IP addresses per SFU node for additional capacity

### Bottleneck 2: SRTP Encrypt/Decrypt CPU

**Problem:** Every forwarded packet requires SRTP decryption (publisher's keys) and re-encryption (subscriber's keys). At 50,000 packets/second with 1 μs per operation = 100ms of CPU time per second (10% of one core). For a node with 1,500 tracks, this becomes the CPU bottleneck.

**Mitigation:**
- Hardware AES acceleration (AES-NI instructions) reduces SRTP cost to ~0.3 μs
- Zero-copy forwarding where possible (avoid decrypt/re-encrypt when keys match)
- With E2EE (Insertable Streams), SFU skips payload decrypt entirely — only header processing

### Bottleneck 3: Keyframe Storms

**Problem:** When a new participant joins a large room, they need keyframes from all publishers to start decoding. 50 publishers × 1 keyframe each = 50 concurrent keyframes, each 10-50x larger than a delta frame. This creates a burst of 50 × 50 KB = 2.5 MB within 100ms.

**Mitigation:**
- Stagger keyframe requests: request 5 at a time, wait for delivery, then next 5
- Keyframe cache: SFU stores the last keyframe per track, serves from cache instead of re-requesting
- Prioritize audio + active speaker video first; background participants' video can wait

### Bottleneck 4: Signaling Server Fan-Out

**Problem:** In a room with 100 participants, a single mute event must be delivered to 99 other participants. At 100 rooms with 100 participants each, a burst of events can create 100 × 99 = 9,900 WebSocket writes for a single event across all rooms.

**Mitigation:**
- Batch events: collect events within a 50ms window and send as a single message
- Per-room event channel with dedicated goroutine/thread
- Rate-limit non-critical events (quality updates: max 1/second per participant)
- Separate rooms across signaling server instances

### Bottleneck 5: TURN Bandwidth Cost

**Problem:** TURN relays all media through the server, doubling bandwidth consumption (ingress + egress). At $0.01/GB, a 25-minute 1:1 video call at 2 Mbps consumes: 2 Mbps × 2 (both directions) × 25 min × 60s × 2 (relay doubling) / 8 = 1.5 GB → $0.015 per call. At scale (240K concurrent TURN sessions), monthly TURN bandwidth can exceed $1M.

**Mitigation:**
- Minimize TURN usage: aggressive ICE candidate testing to avoid unnecessary relay
- Use SFU-integrated TURN: if the SFU is on the media path anyway, TURN is free (media already flows through SFU)
- Time-limited TURN credentials: allocations expire, preventing resource leaks
- TURN over TCP/TLS only when UDP is blocked (most cases don't need TCP overhead)

---

## Concurrency Challenges

### Challenge 1: Concurrent ICE Negotiations

**Problem:** When 50 participants join a room simultaneously, the SFU must handle 50 concurrent ICE negotiations. Each involves multiple STUN connectivity checks, DTLS handshakes, and state machine transitions. The per-participant ICE state machine has 6 states and must handle timeouts, retransmissions, and role conflicts.

**Solution:**
- Per-participant ICE agent running in its own lightweight thread/goroutine
- Non-blocking STUN transaction map with timeout-based cleanup
- DTLS handshake pool: limit concurrent handshakes to 10 per SFU node (handshake is CPU-intensive due to asymmetric crypto)

### Challenge 2: Media Stream Multiplexing

**Problem:** With BUNDLE, all RTP, RTCP, STUN, and DTLS packets arrive on the same UDP port. The SFU must demultiplex based on packet content: STUN uses specific magic cookie, DTLS uses content type byte, RTP/RTCP use version bits and payload type ranges.

**Solution:**
```
FUNCTION demultiplex_packet(packet):
    first_byte = packet[0]

    IF first_byte == 0 OR first_byte == 1:
        // STUN: first byte is 0x00 (binding request) or 0x01 (binding response)
        RETURN handle_stun(packet)
    ELSE IF 20 <= first_byte <= 63:
        // DTLS: content type range
        RETURN handle_dtls(packet)
    ELSE IF 128 <= first_byte <= 191:
        // RTP or RTCP: version = 2 (bits 6-7 = 10)
        payload_type = packet[1] AND 0x7F
        IF payload_type >= 200 AND payload_type <= 204:
            RETURN handle_rtcp(packet)
        ELSE:
            RETURN handle_rtp(packet)
    ELSE:
        DROP packet  // Unknown protocol

// This runs for EVERY packet — must be < 100ns
```

### Challenge 3: Room State Consistency Across Cascaded SFUs

**Problem:** When a room spans 3 SFU nodes across regions, each node has a local view of participants and tracks. A participant joining on Node A must be visible to subscribers on Nodes B and C. Track published/unpublished events must propagate with minimal delay but without overwhelming the inter-node link.

**Solution:**
- Pub/sub message bus for state synchronization (eventual consistency)
- Each node publishes state changes to a room-specific topic
- Other nodes subscribe and update local state
- Conflict resolution: node that hosts the participant is the authority for that participant's state
- Media follows state: when Node B learns about a track on Node A, it establishes a relay subscription
