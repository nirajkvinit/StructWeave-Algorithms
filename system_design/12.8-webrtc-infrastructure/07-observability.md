# Observability — WebRTC Infrastructure

## Metrics

### Call Quality Metrics

| Metric | Description | Collection Source | Good | Acceptable | Poor |
|---|---|---|---|---|---|
| **MOS Score** | Mean Opinion Score — estimated perceptual quality (1-5 scale) | Computed from RTT, jitter, packet loss | ≥ 4.0 | 3.5-4.0 | < 3.5 |
| **Packet Loss (%)** | Percentage of RTP packets not received | RTCP Receiver Reports | < 1% | 1-3% | > 3% |
| **Jitter (ms)** | Variation in inter-packet arrival time | RTCP Receiver Reports | < 15ms | 15-30ms | > 30ms |
| **Round-Trip Time (ms)** | Time for packet to reach peer and return | STUN binding response timing | < 100ms | 100-200ms | > 200ms |
| **Audio Bitrate (kbps)** | Current audio sending/receiving rate | RTP header inspection | 30-80 | 20-30 | < 20 |
| **Video Bitrate (kbps)** | Current video sending/receiving rate | RTP header inspection | > 800 | 300-800 | < 300 |
| **Video Resolution** | Current encoded/decoded resolution | RTP header extensions | ≥ 720p | 360-720p | < 360p |
| **Video Frame Rate (fps)** | Current encoded/decoded frame rate | RTP marker bit counting | ≥ 24 | 15-24 | < 15 |
| **Video Freeze Count** | Number of video freezes > 500ms | Client-side render tracking | 0 | 1-3 | > 3 |
| **Audio Concealment (%)** | Percentage of audio using PLC (Packet Loss Concealment) | Client-side decoder stats | < 1% | 1-5% | > 5% |
| **NACK Count** | Negative acknowledgments (retransmission requests) | RTCP NACK messages | < 10/min | 10-50/min | > 50/min |
| **PLI Count** | Picture Loss Indications (keyframe requests) | RTCP PLI messages | < 2/min | 2-5/min | > 5/min |
| **FIR Count** | Full Intra Requests (forced keyframe) | RTCP FIR messages | 0 | 1-2/min | > 2/min |

### MOS Score Estimation

```
FUNCTION estimate_mos(packet_loss_percent, jitter_ms, rtt_ms, codec):
    // E-model based estimation (ITU-T G.107 simplified)

    // Base R-factor for the codec
    IF codec == "OPUS":
        R0 = 93.2  // Opus has excellent quality baseline
    ELSE IF codec == "G711":
        R0 = 94.3
    ELSE:
        R0 = 90.0

    // Impairment from delay
    effective_delay = rtt_ms / 2 + jitter_ms * 2  // one-way delay estimate
    IF effective_delay < 160:
        Id = 0.024 * effective_delay + 0.11 * (effective_delay - 160) * H(effective_delay - 160)
    ELSE:
        Id = 0.024 * effective_delay + 0.11 * (effective_delay - 160)
    // H(x) = 0 if x < 0, else x (Heaviside step function)

    // Impairment from packet loss
    Ie = 0 + 30 * LN(1 + 15 * packet_loss_percent / 100)
    // 0% loss → Ie = 0; 1% loss → Ie ≈ 4.3; 5% loss → Ie ≈ 13.7; 10% loss → Ie ≈ 20

    // Advantage factor (real-time communication tolerance)
    A = 10  // Users tolerate more impairment for real-time calls

    // R-factor
    R = R0 - Id - Ie + A
    R = CLAMP(R, 0, 100)

    // Convert R-factor to MOS (1-5 scale)
    IF R < 0:
        MOS = 1.0
    ELSE IF R > 100:
        MOS = 4.5
    ELSE:
        MOS = 1 + 0.035 * R + R * (R - 60) * (100 - R) * 7e-6

    RETURN ROUND(MOS, 2)

// Example outputs:
// estimate_mos(0, 10, 50, "OPUS")  → 4.41 (excellent)
// estimate_mos(1, 20, 100, "OPUS") → 4.05 (good)
// estimate_mos(3, 30, 150, "OPUS") → 3.52 (acceptable)
// estimate_mos(5, 50, 200, "OPUS") → 2.89 (poor)
```

### Infrastructure Metrics

| Metric | Description | Source | Alert Threshold |
|---|---|---|---|
| **SFU CPU utilization** | Per-node CPU usage percentage | System metrics | > 70% sustained 5 min |
| **SFU memory utilization** | Per-node memory usage | System metrics | > 80% |
| **SFU NIC throughput** | Ingress + egress bandwidth per node | NIC counters | > 80% of NIC capacity |
| **Active tracks per node** | Number of published tracks on SFU | Application metrics | > 1,200 (approaching limit) |
| **Active rooms per node** | Number of rooms hosted on SFU | Application metrics | Informational |
| **WebSocket connections** | Concurrent signaling connections per server | Connection pool | > 40K per server |
| **Signaling message rate** | Messages processed per second | Application metrics | > 150K QPS |
| **TURN allocations** | Active relay allocations per TURN server | TURN server metrics | > 500 per server |
| **TURN bandwidth** | Per-server relay bandwidth | NIC counters | > 8 Gbps |
| **ICE success rate** | Percentage of ICE negotiations completing successfully | Application metrics | < 98% |
| **ICE gathering time (p50)** | Median time to gather all candidates | Application metrics | > 500ms |
| **ICE gathering time (p99)** | 99th percentile gathering time | Application metrics | > 2000ms |
| **DTLS handshake time** | Time to complete DTLS key exchange | Application metrics | > 500ms |
| **Room creation rate** | New rooms created per second | Application metrics | Capacity planning |
| **Oarticipant join rate** | New participants joining per second | Application metrics | Capacity planning |

### SFU-Specific Metrics

| Metric | Description | Granularity |
|---|---|---|
| **Forwarding latency** | Time from packet ingress to egress | Per-track, per-subscriber |
| **Simulcast layer distribution** | Percentage of subscribers on each layer | Per-room |
| **Layer switch count** | Number of simulcast layer switches | Per-subscriber per minute |
| **Keyframe request rate** | PLI/FIR messages sent by SFU | Per-published track |
| **Oacker queue depth** | Packets waiting in send buffer | Per-subscriber |
| **SRTP error rate** | Authentication or decryption failures | Per-participant |
| **Cascade relay latency** | Latency added by inter-SFU relay | Per-relay connection |
| **Track subscription fan-out** | Number of subscribers per published track | Per-track |

---

## Dashboard Design

### Call Quality Dashboard (Primary — Operations Team)

```
Row 1: Real-Time Quality Overview
├── Panel 1: Global MOS Score (gauge, 1-5 scale)
│   Color: green (>4.0), yellow (3.5-4.0), red (<3.5)
├── Panel 2: Packet Loss Distribution (histogram by session)
│   Buckets: 0%, <1%, 1-3%, 3-5%, >5%
├── Panel 3: Jitter Distribution (histogram by session)
│   Buckets: <15ms, 15-30ms, 30-50ms, >50ms
└── Panel 4: Active Call Volume (line chart, stacked by quality tier)

Row 2: Quality Trends (24-Hour)
├── Panel 1: MOS Score Trend (P50/P90/P99 lines)
├── Panel 2: Packet Loss Trend (P50/P90/P99 lines)
├── Panel 3: RTT Trend (P50/P90/P99 lines)
└── Panel 4: Simulcast Layer Distribution (stacked area: full/half/quarter)

Row 3: Quality by Dimension
├── Panel 1: MOS by Region (bar chart, per-region average)
├── Panel 2: MOS by Connection Type (direct/reflexive/relay)
├── Panel 3: Quality Degradation Events (timeline of MOS drops >1.0)
└── Panel 4: TURN vs Direct Quality Comparison (side-by-side MOS)
```

### Infrastructure Dashboard (Platform Team)

```
Row 1: SFU Cluster Health
├── Panel 1: Node Utilization Heatmap (grid, colored by track %)
├── Panel 2: Forwarded Packets/sec (aggregate line chart)
├── Panel 3: CPU by Node (top 10 busiest nodes)
└── Panel 4: Room Distribution (rooms per node histogram)

Row 2: TURN Infrastructure
├── Panel 1: Active Allocations by Region (stacked bar)
├── Panel 2: TURN Bandwidth (% capacity per region)
├── Panel 3: Allocation Success Rate (line, 99% target)
└── Panel 4: TURN Usage Rate (% sessions using relay)

Row 3: Capacity Planning
├── Panel 1: SFU Track Capacity (gauge per region, used/total)
├── Panel 2: TURN Allocation Capacity (gauge per region)
├── Panel 3: Peak Session Forecast (30-day projection)
└── Panel 4: Cost per Call-Minute Trend (compute + bandwidth)
```

---

## Logging

### Log Levels and Categories

| Level | Category | Example | Retention |
|---|---|---|---|
| **ERROR** | Connection failures | "ICE negotiation failed for participant abc-123 after 30s timeout" | 90 days |
| **ERROR** | Security events | "DTLS handshake failed: certificate fingerprint mismatch" | 90 days |
| **WARN** | Quality degradation | "Subscriber xyz-456 bandwidth dropped below 100 Kbps, switching to audio-only" | 30 days |
| **WARN** | Resource pressure | "SFU node sfu-east-07 at 85% NIC capacity, rejecting new room assignments" | 30 days |
| **INFO** | Session lifecycle | "Room room-789 created; Participant abc-123 joined room-789" | 14 days |
| **INFO** | Track events | "Track video-001 published by abc-123 (VP8, simulcast: f/h/q)" | 14 days |
| **INFO** | TURN events | "TURN allocation created for user-123 on turn-eu-west-03" | 14 days |
| **DEBUG** | ICE details | "ICE candidate pair host:192.168.1.5:54321 -> srflx:203.0.113.1:12345 succeeded" | 7 days |
| **DEBUG** | Bandwidth estimation | "GCC estimate for pub abc-123: 1.45 Mbps (overuse_count=0, signal=NORMAL)" | 7 days |
| **DEBUG** | Oacer events | "Oacer for sub xyz-456: send_rate=950kbps, queue_depth=3 packets" | 7 days |

### Structured Log Format

```
{
  "timestamp": "2026-03-09T14:22:33.456Z",
  "level": "INFO",
  "service": "sfu",
  "node_id": "sfu-east-07",
  "region": "us-east-1",
  "event": "participant_joined",
  "room_id": "room-789",
  "participant_id": "abc-123",
  "identity": "alice",
  "ice_candidates": {
    "host": 2,
    "srflx": 2,
    "relay": 1
  },
  "codec": {"audio": "opus", "video": "VP8"},
  "simulcast": true,
  "network_type": "wifi",
  "trace_id": "trace-abc-xyz-001"
}
```

### Critical Event Logging

**Call Quality Event Log (emitted every 10 seconds per participant):**

```
{
  "timestamp": "2026-03-09T14:22:43.456Z",
  "event": "quality_snapshot",
  "room_id": "room-789",
  "participant_id": "abc-123",
  "direction": "publish",
  "tracks": [
    {
      "track_id": "video-001",
      "kind": "video",
      "codec": "VP8",
      "bitrate_kbps": 1450,
      "resolution": "1280x720",
      "framerate": 28,
      "packets_sent": 4500,
      "packets_lost": 12,
      "loss_percent": 0.27,
      "nack_count": 3,
      "pli_count": 0,
      "jitter_ms": 8.5,
      "rtt_ms": 45
    },
    {
      "track_id": "audio-001",
      "kind": "audio",
      "codec": "opus",
      "bitrate_kbps": 48,
      "packets_sent": 500,
      "packets_lost": 1,
      "loss_percent": 0.2,
      "concealment_percent": 0.1,
      "jitter_ms": 5.2,
      "rtt_ms": 45
    }
  ],
  "mos_score": 4.35,
  "ice_state": "connected",
  "selected_candidate_pair": {
    "local": "srflx:203.0.113.1:12345/udp",
    "remote": "host:10.0.0.5:54321/udp"
  }
}
```

---

## Tracing

### Call Setup Latency Breakdown

A distributed trace across the full call setup lifecycle:

```
Trace: call_setup (trace_id: trace-abc-xyz-001)
  |
  |-- [0ms] signaling_connect
  |     Duration: 85ms
  |     Details: WebSocket upgrade + TLS handshake + token validation
  |
  |-- [85ms] room_join
  |     Duration: 12ms
  |     Details: Room lookup + participant registration + state broadcast
  |
  |-- [97ms] ice_gathering
  |     Duration: 340ms (parallel candidate gathering)
  |     |-- host_candidates: 1ms (local interfaces)
  |     |-- stun_reflexive: 45ms (STUN binding to 2 servers)
  |     |-- turn_allocation: 340ms (TURN allocation — slowest, on critical path)
  |
  |-- [97ms] sdp_exchange (parallel with ICE gathering via trickle)
  |     Duration: 65ms
  |     Details: Offer creation + signaling transit + answer processing
  |
  |-- [437ms] ice_checking
  |     Duration: 120ms
  |     Details: 8 candidate pairs checked, 3 succeeded, best pair nominated
  |     |-- pair_1 (host-host): 5ms — succeeded (selected)
  |     |-- pair_2 (srflx-srflx): 25ms — succeeded
  |     |-- pair_3 (relay-srflx): 65ms — succeeded
  |     |-- pair_4-8: failed or timed out
  |
  |-- [557ms] dtls_handshake
  |     Duration: 35ms
  |     Details: DTLS 1.2 handshake, ECDHE key exchange, SRTP key derivation
  |
  |-- [592ms] first_audio_packet
  |     Duration: 8ms
  |     Details: First SRTP audio packet sent and received
  |
  |-- [600ms] first_video_keyframe
  |     Duration: 45ms
  |     Details: VP8 keyframe encoded + packetized + sent + received + decoded
  |
  +-- [645ms] call_connected
        Total setup time: 645ms
        Time to first audio: 600ms
        Time to first video: 645ms
```

### Oer-Call Quality Trace

```
Trace: call_quality (trace_id: trace-abc-xyz-001)
  |
  |-- [0:00] call_start
  |     MOS: 4.4, Loss: 0.1%, Jitter: 5ms, RTT: 45ms
  |     Resolution: 1280x720, Bitrate: 1.5 Mbps
  |
  |-- [2:30] bandwidth_drop_detected
  |     GCC signal: OVERUSE, delay_gradient: +12ms
  |     Action: Reduce bitrate from 1.5 Mbps to 1.2 Mbps
  |
  |-- [2:35] simulcast_layer_switch
  |     Subscriber X: full → half layer
  |     Resolution: 1280x720 → 640x360
  |     Bitrate: 1.5 Mbps → 500 Kbps
  |     MOS: 4.4 → 4.0
  |
  |-- [5:00] bandwidth_recovery
  |     GCC signal: NORMAL for 3 consecutive estimates
  |     Action: Upgrade subscriber X back to full layer
  |     Resolution: 640x360 → 1280x720
  |
  |-- [12:15] network_change
  |     ICE state: connected → disconnected
  |     Trigger: WiFi → cellular handoff
  |     ICE restart initiated
  |
  |-- [12:17] ice_restart_complete
  |     New candidate pair: relay (TURN) — cellular has symmetric NAT
  |     RTT: 45ms → 120ms (TURN relay overhead)
  |     MOS: 4.2 → 3.7
  |
  |-- [25:00] call_end
  |     Duration: 25 minutes
  |     Average MOS: 4.1
  |     Total layer switches: 4
  |     Network changes: 1
  |     Oarticipant reconnections: 1
  |     Oeak packet loss: 2.3% (at 2:32)
```

---

## Alerting

### Alert Definitions

| Alert | Condition | Severity | Action |
|---|---|---|---|
| **SFU node overloaded** | CPU > 70% for 5 min OR NIC > 80% for 2 min | Critical | Stop assigning new rooms; drain participants to other nodes |
| **High packet loss** | > 5% loss for > 30 seconds (aggregate across room) | Warning | Log for quality analysis; may indicate network issue |
| **ICE failure rate spike** | ICE success rate < 95% for 5 min (platform-wide) | Critical | Check STUN/TURN server availability; possible infrastructure issue |
| **TURN server unreachable** | Health check failure on any TURN server | Critical | Remove from TURN server pool; failover to other servers |
| **Signaling latency spike** | p99 signaling message delivery > 500ms | Warning | Check WebSocket server load; possible message bus congestion |
| **DTLS handshake failures** | > 1% failure rate for 5 min | Critical | Check certificate validity; possible MITM attack |
| **MOS score degradation** | Platform-wide average MOS < 3.5 for 10 min | Critical | Investigate network issues; may indicate routing problem |
| **Room creation failures** | > 1% failure rate for 5 min | Critical | Check SFU node availability; possible capacity exhaustion |
| **Recording egress failure** | Recording fails to start or drops for > 10s | Warning | Check egress pipeline; retry on different node |
| **Cascade relay failure** | Inter-SFU relay connection lost for > 5s | Critical | Re-establish relay; affected cross-region subscriptions frozen |
| **Certificate expiration** | TLS/DTLS certificate expires within 7 days | Warning | Trigger certificate rotation |
| **TURN bandwidth exceeded** | TURN server > 90% bandwidth capacity | Warning | Scale TURN fleet; shift allocations to other servers |

### Dashboard Layout

```
WebRTC Infrastructure Dashboard
================================

[Row 1: Health Overview]
  [Active Calls: 1.2M] [Active Participants: 4.2M] [Avg MOS: 4.21] [Call Setup Success: 99.7%]

[Row 2: Quality Distribution]
  [MOS Distribution Histogram] [Packet Loss Heatmap by Region] [Jitter Distribution by Codec]

[Row 3: Infrastructure]
  [SFU Nodes: 8,400/23,000 active] [TURN Servers: 340/480 active] [Signaling: 95/140 active]
  [SFU Utilization Gauge per Region] [TURN Bandwidth per Region] [WebSocket Connections per Server]

[Row 4: ICE / Connectivity]
  [ICE Success Rate: 99.2%] [Candidate Type Distribution: host 42%, srflx 43%, relay 15%]
  [ICE Gathering Time p50/p99] [TURN Allocation Rate]

[Row 5: Quality Over Time]
  [MOS Score Trend (24h)] [Packet Loss Trend (24h)] [Bitrate Trend (24h)]
  [Simulcast Layer Distribution Over Time]

[Row 6: Errors and Incidents]
  [Active Alerts Table] [ICE Failure Breakdown] [Error Rate by Component]
```

---

## Debugging Playbook

### Problem: User Reports Poor Audio Quality

```
Investigation steps:
1. Get participant_id and room_id from user report
2. Query quality_snapshot logs for the participant:
   - Check MOS trend over call duration
   - Identify when quality degraded
3. Examine specific metrics at degradation point:
   - Packet loss > 3%? → Network issue between client and SFU
   - Jitter > 30ms? → Client or network congestion
   - RTT spike? → Routing change or TURN relay added
4. Check ICE candidate pair:
   - If relay: TURN server might be overloaded or distant
   - If srflx: NAT might be flapping
5. Check SFU-side metrics:
   - Forwarding latency spike? → SFU overloaded
   - Pacer queue depth high? → Subscriber bandwidth issue
6. Check client-side metrics (from getStats):
   - Audio concealment ratio > 5%? → Decoder struggling with loss
   - Jitter buffer target delay > 100ms? → Severe jitter
```

### Problem: Calls Failing to Connect

```
Investigation steps:
1. Check ICE failure rate dashboard — is this widespread or isolated?
2. For isolated failures:
   - Check participant's ICE candidates — were relay candidates gathered?
   - Check if TURN allocation succeeded
   - Check NAT type — symmetric NAT without TURN = guaranteed failure
   - Check corporate firewall — may block UDP entirely
3. For widespread failures:
   - Check STUN server health — are binding responses returning?
   - Check TURN server health — are allocations succeeding?
   - Check signaling server — are SDP/candidates being exchanged?
   - Check DNS — STUN/TURN server DNS resolution working?
4. Check recent deployments — configuration change that affected ICE?
```

---

*Previous: [Security & Compliance](./06-security-and-compliance.md) | Next: [Interview Guide](./08-interview-guide.md)*
