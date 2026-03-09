# Low-Level Design — WebRTC Infrastructure

## Data Models

### Room State

```
Room:
  room_id:          string (UUID)
  name:             string
  created_at:       timestamp
  max_participants:  integer
  settings:
    video_codec:     enum [VP8, VP9, H264, AV1]
    audio_codec:     enum [OPUS]
    simulcast:       boolean
    svc_mode:        enum [NONE, L1T3, L3T3]
    recording:       boolean
    e2ee_enabled:    boolean
    max_bitrate:     integer (kbps)
  state:            enum [ACTIVE, CLOSED]
  sfu_node_id:      string (assigned SFU)
  region:           string (primary region)
```

### Participant State

```
Participant:
  participant_id:   string (UUID)
  room_id:          string (FK -> Room)
  identity:         string (user-provided display name)
  joined_at:        timestamp
  connection_state: enum [CONNECTING, CONNECTED, RECONNECTING, DISCONNECTED]
  ice_state:        enum [NEW, CHECKING, CONNECTED, COMPLETED, FAILED, CLOSED]
  dtls_state:       enum [NEW, CONNECTING, CONNECTED, FAILED, CLOSED]
  role:             enum [PUBLISHER, SUBSCRIBER, BOTH]
  permissions:
    can_publish:     boolean
    can_subscribe:   boolean
    can_record:      boolean
  network_quality:  integer (0-5 score)
  region:           string (connected region)
  sfu_node_id:      string (assigned SFU node)
```

### Track State

```
Track:
  track_id:         string (UUID)
  participant_id:   string (FK -> Participant)
  room_id:          string (FK -> Room)
  kind:             enum [AUDIO, VIDEO]
  source:           enum [CAMERA, MICROPHONE, SCREEN_SHARE, SCREEN_AUDIO]
  muted:            boolean
  simulcast_layers:
    - rid:           string (e.g., "f", "h", "q" for full/half/quarter)
      width:         integer
      height:        integer
      max_bitrate:   integer (kbps)
      max_framerate: integer
      ssrc:          integer (RTP synchronization source)
  active_layer:     string (currently forwarded layer per subscriber)
  codec:
    mime_type:       string (e.g., "video/VP8")
    clock_rate:      integer (e.g., 90000 for video, 48000 for audio)
    channels:        integer (2 for stereo audio)
    sdp_fmtp_line:   string (codec-specific parameters)
```

### Subscription State

```
Subscription:
  subscriber_id:    string (FK -> Participant)
  track_id:         string (FK -> Track)
  desired_layer:    string (requested simulcast layer)
  actual_layer:     string (currently received layer)
  paused:           boolean (subscriber-initiated pause)
  bandwidth_limited: boolean (SFU-initiated downgrade)
  estimated_bw:     integer (kbps, subscriber's available bandwidth)
```

### ICE Candidate

```
ICECandidate:
  candidate_id:     string
  participant_id:   string
  type:             enum [HOST, SERVER_REFLEXIVE, RELAY]
  protocol:         enum [UDP, TCP]
  address:          string (IP address)
  port:             integer
  priority:         integer (ICE priority formula result)
  foundation:       string (candidate grouping identifier)
  related_address:  string (base address for reflexive/relay)
  related_port:     integer
  username_fragment: string (ICE ufrag for candidate pairing)
```

### TURN Allocation

```
TURNAllocation:
  allocation_id:    string
  client_address:   string (IP:port of the client)
  relay_address:    string (public IP:port on TURN server)
  server_id:        string (TURN server identifier)
  region:           string
  protocol:         enum [UDP, TCP, TLS]
  created_at:       timestamp
  expires_at:       timestamp (allocation TTL, typically 10 min)
  bytes_relayed:    integer (for billing/monitoring)
  permissions:      list of string (peer addresses allowed to send to this allocation)
  channel_bindings: list of (channel_number, peer_address) pairs
```

---

## Protocol Design

### SDP Offer/Answer Structure

The Session Description Protocol (SDP) is the negotiation format exchanged during call setup. A simplified SDP offer structure:

```
SDP Offer:
  version:          0
  origin:
    username:       "-"
    session_id:     random 64-bit integer
    session_version: 0
    net_type:       "IN"
    addr_type:      "IP4"
    address:        "0.0.0.0"
  session_name:     "-"
  timing:           "0 0" (unbounded session)
  bundle_group:     [audio_mid, video_mid, data_mid]   // BUNDLE all media on one transport

  media_descriptions:
    - type:         "audio"
      mid:          "0"
      direction:    "sendrecv"
      rtp_params:
        - payload_type: 111
          codec:       "opus/48000/2"
          fmtp:        "minptime=10;useinbandfec=1"
      ice_ufrag:     random string
      ice_pwd:       random string
      dtls_fingerprint:
        hash:        "sha-256"
        value:       hex string of certificate fingerprint
      dtls_setup:    "actpass"
      candidates:    [list of ICE candidates]

    - type:         "video"
      mid:          "1"
      direction:    "sendrecv"
      rtp_params:
        - payload_type: 96
          codec:       "VP8/90000"
          rtcp_fb:     ["nack", "nack pli", "ccm fir", "goog-remb", "transport-cc"]
        - payload_type: 97
          codec:       "rtx/90000"  // retransmission
          apt:         96
      simulcast:
        send:        "f;h;q"  // full, half, quarter
      ice_ufrag:     (same as audio — BUNDLE)
      ice_pwd:       (same)
      candidates:    (same — shared transport)
```

### ICE Candidate Exchange Protocol

```
ICE Candidate Message (via signaling):
  type:            "candidate"
  candidate:
    foundation:     "842163049"
    component:      1  (RTP)
    protocol:       "udp"
    priority:       2122260223
    address:        "192.168.1.100"
    port:           54321
    type:           "host"
  sdp_mid:          "0"
  sdp_mline_index:  0
  ufrag:            "abc123"
```

**ICE Priority Formula:**

```
priority = (2^24) x type_preference + (2^8) x local_preference + (2^0) x (256 - component_id)

where type_preference:
  host:              126
  server_reflexive:  100
  relay (TURN):      0

Higher priority = preferred candidate (direct > reflexive > relay)
```

### DTLS-SRTP Key Exchange Flow

```
1. ICE connectivity established (STUN binding succeeds on selected pair)
2. DTLS handshake over the ICE-selected UDP path:
   a. Client sends DTLS ClientHello
   b. Server responds with ServerHello + Certificate
   c. Client verifies certificate fingerprint matches SDP fingerprint attribute
   d. Both derive shared secret via DTLS key exchange
3. SRTP keys derived from DTLS shared secret:
   - client_write_key, server_write_key (128-bit AES)
   - client_write_salt, server_write_salt
4. All subsequent RTP packets encrypted with SRTP using derived keys
5. RTCP packets encrypted with SRTCP using same key material
```

---

## API Design

### Signaling WebSocket Protocol

All signaling messages follow a typed JSON envelope:

```
SignalMessage:
  type:     string (message type identifier)
  payload:  object (type-specific data)
  seq:      integer (monotonic sequence number for ordering)
  timestamp: integer (unix milliseconds)
```

**Client → Server Messages:**

| Type | Payload | Purpose |
|---|---|---|
| `join` | `{room_id, token, sdp_offer, ice_candidates[]}` | Join room with initial SDP offer |
| `answer` | `{sdp_answer}` | Respond to SFU's offer with negotiated answer |
| `candidate` | `{candidate, sdp_mid}` | Trickle ICE candidate to SFU |
| `subscribe` | `{track_ids[], desired_layers{}}` | Subscribe to specific tracks with quality preference |
| `unsubscribe` | `{track_ids[]}` | Stop receiving specified tracks |
| `mute` | `{track_id, muted: boolean}` | Toggle track mute state |
| `set_quality` | `{track_id, max_width, max_height, max_fps}` | Subscriber requests quality cap |
| `leave` | `{}` | Gracefully leave room |
| `ping` | `{timestamp}` | Keepalive / latency measurement |

**Server → Client Messages:**

| Type | Payload | Purpose |
|---|---|---|
| `offer` | `{sdp_offer}` | SFU sends new offer when tracks are added |
| `candidate` | `{candidate, sdp_mid}` | SFU trickles ICE candidate |
| `participant_joined` | `{participant_id, identity, tracks[]}` | New participant entered room |
| `participant_left` | `{participant_id}` | Participant left room |
| `track_published` | `{participant_id, track}` | New track available for subscription |
| `track_unpublished` | `{participant_id, track_id}` | Track removed |
| `track_muted` | `{track_id, muted}` | Track mute state changed |
| `active_speakers` | `{speakers: [{participant_id, level}]}` | Ordered list of active speakers by audio level |
| `connection_quality` | `{quality: 0-5, participant_id}` | Network quality update |
| `layer_changed` | `{track_id, layer}` | SFU switched simulcast layer for a subscription |
| `pong` | `{timestamp, server_time}` | Keepalive response with RTT info |

### REST API for Room Management

```
POST   /rooms                    Create a new room
GET    /rooms/{room_id}          Get room details and participant list
DELETE /rooms/{room_id}          Close room and disconnect all participants
POST   /rooms/{room_id}/token    Generate participant access token
POST   /rooms/{room_id}/egress   Start recording or streaming egress
DELETE /rooms/{room_id}/egress   Stop egress

POST   /rooms/{room_id}/participants/{pid}/permissions
                                  Update participant permissions at runtime

GET    /health                   Server health check
GET    /metrics                  Prometheus-compatible metrics endpoint
```

**Token Generation:**

```
Token Structure:
  room_id:         string
  participant_id:  string
  identity:        string
  permissions:
    can_publish:   boolean
    can_subscribe: boolean
    can_publish_data: boolean
  valid_for:       duration (e.g., "24h")
  metadata:        arbitrary JSON (attached to participant)

Token is signed with HMAC-SHA256 using server's API secret.
Client presents token in WebSocket `join` message.
Server validates signature and extracts permissions.
```

---

## Core Algorithms

### Algorithm 1: ICE Candidate Pair Prioritization

The ICE agent must test connectivity across all possible candidate pairs and select the best one. The prioritization determines the order of connectivity checks.

```
FUNCTION compute_pair_priority(local_candidate, remote_candidate, is_controlling):
    G = MAX(local_candidate.priority, remote_candidate.priority)
    D = MIN(local_candidate.priority, remote_candidate.priority)

    // Controlling agent prefers its own higher-priority candidates
    IF is_controlling:
        tie_breaker = 1
    ELSE:
        tie_breaker = 0

    pair_priority = 2^32 * MIN(G, D) + 2 * MAX(G, D) + tie_breaker
    RETURN pair_priority

// Time complexity: O(1) per pair
// Space complexity: O(L * R) for all pairs where L = local candidates, R = remote candidates
```

```
FUNCTION run_ice_checks(local_candidates, remote_candidates, is_controlling):
    // Form all candidate pairs
    check_list = []
    FOR each local IN local_candidates:
        FOR each remote IN remote_candidates:
            IF compatible(local.protocol, remote.protocol):
                pair = CandidatePair(local, remote)
                pair.priority = compute_pair_priority(local, remote, is_controlling)
                pair.state = FROZEN
                check_list.APPEND(pair)

    // Sort by priority (highest first)
    SORT check_list BY priority DESCENDING

    // Unfreeze first pair per foundation
    foundations_seen = SET()
    FOR each pair IN check_list:
        foundation = pair.local.foundation + pair.remote.foundation
        IF foundation NOT IN foundations_seen:
            pair.state = WAITING
            foundations_seen.ADD(foundation)

    // Execute connectivity checks
    nominated_pair = NULL
    WHILE nominated_pair IS NULL AND check_list has WAITING/IN_PROGRESS pairs:
        pair = next WAITING pair from check_list
        pair.state = IN_PROGRESS

        result = send_stun_binding_request(pair.local, pair.remote)

        IF result.success:
            pair.state = SUCCEEDED
            // Aggressive nomination: nominate first successful pair
            IF is_controlling:
                send_stun_with_use_candidate_flag(pair)
                nominated_pair = pair
            // Unfreeze pairs with same foundation
            unfreeze_related_pairs(pair, check_list)
        ELSE IF result.timeout:
            pair.state = FAILED

        // Check for incoming nomination from controlling agent
        IF received_nomination FOR any succeeded pair:
            nominated_pair = that pair

    RETURN nominated_pair

// Time complexity: O(L * R * log(L * R)) for sorting + O(L * R) for checks
// Space complexity: O(L * R)
// Typical: L=4, R=4 -> 16 pairs, but pruned to ~8 after compatibility filtering
```

### Algorithm 2: Google Congestion Control (GCC) — Bandwidth Estimation

GCC estimates available bandwidth by analyzing the inter-arrival time of received packets. It detects congestion before packet loss occurs by measuring one-way delay gradients.

```
FUNCTION gcc_bandwidth_estimation(packet_arrivals):
    // State maintained across invocations
    STATE:
        estimated_bandwidth: float (current estimate in bps)
        delay_gradient: float (Kalman filter output)
        threshold: float (adaptive threshold for overuse detection)
        overuse_counter: integer
        last_decrease_time: timestamp

    // Step 1: Compute inter-arrival delay gradient
    // Group packets by send-time proximity (5ms groups)
    groups = group_packets_by_send_time(packet_arrivals, interval=5ms)

    FOR each consecutive group pair (prev_group, curr_group):
        send_delta = curr_group.send_time - prev_group.send_time
        recv_delta = curr_group.recv_time - prev_group.recv_time
        delay_delta = recv_delta - send_delta  // positive = queuing delay increasing

        // Step 2: Kalman filter to smooth delay gradient
        delay_gradient = kalman_update(delay_delta)
        //   prediction:  x_hat = x_prev
        //   innovation:  z - H * x_hat
        //   gain:        K = P * H' / (H * P * H' + R)
        //   update:      x_hat = x_hat + K * innovation
        //                P = (I - K * H) * P + Q

    // Step 3: Overuse detection with adaptive threshold
    IF delay_gradient > threshold:
        signal = OVERUSE
        overuse_counter += 1
        // Increase threshold to avoid oscillation
        threshold = threshold + K_u * (delay_gradient - threshold)
    ELSE IF delay_gradient < -threshold:
        signal = UNDERUSE
        overuse_counter = 0
        // Decrease threshold slowly
        threshold = threshold + K_d * (delay_gradient - threshold)
    ELSE:
        signal = NORMAL
        overuse_counter = 0

    // Step 4: Rate control based on signal
    SWITCH signal:
        CASE OVERUSE:
            IF overuse_counter >= OVERUSE_THRESHOLD (e.g., 3 consecutive):
                // Multiplicative decrease
                estimated_bandwidth = estimated_bandwidth * 0.85
                last_decrease_time = NOW

        CASE NORMAL:
            IF time_since(last_decrease_time) > HOLD_PERIOD (e.g., 500ms):
                // Additive increase
                estimated_bandwidth = estimated_bandwidth * 1.05

        CASE UNDERUSE:
            // No change — let increase happen naturally

    // Step 5: Clamp to bounds
    estimated_bandwidth = CLAMP(estimated_bandwidth, MIN_BW=30kbps, MAX_BW=configured_max)

    RETURN estimated_bandwidth

// Time complexity: O(N) per estimation interval where N = packets in interval
// Space complexity: O(1) for Kalman state
// Runs every ~100ms
```

### Algorithm 3: Adaptive Jitter Buffer

The jitter buffer absorbs packet timing variations to produce smooth playout. It dynamically adjusts its depth based on observed network jitter.

```
FUNCTION adaptive_jitter_buffer():
    STATE:
        buffer: priority_queue sorted by RTP sequence number
        target_delay: duration (current buffer depth target)
        min_delay: 20ms
        max_delay: 400ms
        jitter_estimate: float (exponential moving average of jitter)
        last_playout_time: timestamp
        playout_rate: duration (packet interval, e.g., 20ms for audio)

    // Called when RTP packet arrives
    FUNCTION on_packet_received(packet):
        expected_arrival = packet.rtp_timestamp / clock_rate + transmission_offset
        actual_arrival = NOW
        delay_variation = actual_arrival - expected_arrival

        // Update jitter estimate (exponential moving average)
        jitter_estimate = 0.9 * jitter_estimate + 0.1 * ABS(delay_variation)

        // Insert into buffer ordered by sequence number
        buffer.INSERT(packet)

        // Handle out-of-order: if packet seq < last played, it arrived too late
        IF packet.sequence_number < last_played_seq:
            stats.late_packets += 1
            // Still insert — might be useful for FEC reconstruction

    // Called every playout_rate interval (e.g., every 20ms for audio)
    FUNCTION get_next_frame():
        // Dynamically adjust target delay based on jitter
        ideal_delay = jitter_estimate * 2 + min_delay  // 2x jitter as safety margin
        target_delay = CLAMP(ideal_delay, min_delay, max_delay)

        // Smooth adjustment (don't jump — causes audible glitch)
        IF target_delay > current_target + 5ms:
            current_target += 2ms  // Gradually increase (insert silence)
        ELSE IF target_delay < current_target - 5ms:
            current_target -= 1ms  // Gradually decrease (skip/accelerate)

        expected_seq = last_played_seq + 1

        IF buffer.CONTAINS(expected_seq):
            frame = buffer.REMOVE(expected_seq)
            last_played_seq = expected_seq
            RETURN frame
        ELSE:
            // Packet missing — either late or lost
            IF buffer.SIZE > 0 AND buffer.PEEK().seq > expected_seq + MAX_GAP:
                // Large gap — likely loss, skip ahead
                frame = buffer.REMOVE_MIN()
                last_played_seq = frame.sequence_number
                RETURN frame
            ELSE:
                // Wait for packet (PLC - Packet Loss Concealment)
                RETURN generate_concealment_frame(last_frame)

    RETURN {on_packet_received, get_next_frame}

// Time complexity: O(log N) for insert, O(1) for playout (priority queue)
// Space complexity: O(buffer_depth / packet_interval) packets, typically 10-20 packets
```

### Algorithm 4: Simulcast Layer Selection

The SFU must decide which simulcast layer to forward to each subscriber based on their bandwidth and display requirements.

```
FUNCTION select_simulcast_layer(subscription, available_layers, bandwidth_estimate):
    // available_layers sorted by bitrate descending: [full, half, quarter]

    desired_width = subscription.requested_width   // e.g., 720 for main view, 180 for thumbnail
    desired_height = subscription.requested_height

    // Step 1: Filter layers that fit the desired resolution
    fitting_layers = []
    FOR each layer IN available_layers:
        IF layer.width >= desired_width AND layer.height >= desired_height:
            fitting_layers.APPEND(layer)

    // If no layer fits, use the highest available
    IF fitting_layers IS EMPTY:
        fitting_layers = [available_layers[0]]

    // Step 2: Select based on bandwidth
    // Reserve 20% headroom for audio and overhead
    available_for_video = bandwidth_estimate * 0.80

    // Among fitting layers, choose the highest quality that fits bandwidth
    selected = NULL
    FOR each layer IN fitting_layers SORTED BY bitrate DESCENDING:
        IF layer.max_bitrate <= available_for_video:
            selected = layer
            BREAK

    // If nothing fits bandwidth, take the lowest layer
    IF selected IS NULL:
        selected = available_layers[LAST]

    // Step 3: Hysteresis to prevent oscillation
    // Only switch up if bandwidth has been sufficient for 3 consecutive estimates
    // Switch down immediately on bandwidth drop
    IF selected.bitrate > subscription.current_layer.bitrate:
        subscription.upgrade_count += 1
        IF subscription.upgrade_count < UPGRADE_THRESHOLD (e.g., 3):
            selected = subscription.current_layer  // Hold current layer
        ELSE:
            subscription.upgrade_count = 0  // Reset on successful upgrade
    ELSE IF selected.bitrate < subscription.current_layer.bitrate:
        subscription.upgrade_count = 0  // Reset on downgrade
        // Request keyframe from publisher for clean layer switch
        request_keyframe(subscription.track_id, selected.rid)

    subscription.current_layer = selected
    RETURN selected

// Time complexity: O(L) where L = number of simulcast layers (typically 3)
// Space complexity: O(1) per subscription
```

---

## Data Flow Patterns

### Publish Flow

```
Client Camera/Mic
    |
    v
Encoder (VP8/Opus)
    |
    v  (multiple streams for simulcast)
SRTP Encrypt
    |
    v
RTP Packetizer (MTU-sized packets, ~1200 bytes)
    |
    v
ICE Transport (UDP to SFU)
    |
    v
SFU Receiver
    |
    v
SRTP Decrypt (if not E2EE)
    |
    v
Jitter Buffer (reorder, gap detection)
    |
    v
Track Router (fan-out to subscribers)
```

### Subscribe Flow

```
Track Router (selects layer per subscriber)
    |
    v
SRTP Encrypt (with subscriber's SRTP keys)
    |
    v
Pacer (smooth send rate to match subscriber bandwidth)
    |
    v
ICE Transport (UDP to subscriber)
    |
    v
Client SRTP Decrypt
    |
    v
Jitter Buffer
    |
    v
Decoder (VP8/Opus)
    |
    v
Renderer (screen/speaker)
```
