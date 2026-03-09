# Observability — Live Classroom System

## Observability Philosophy

A live classroom system has a unique observability challenge: **quality issues are immediately visible to users and cannot be masked by retries.** A 200ms jitter spike during a lecture is perceived by every participant as audio crackling. A 2-second video freeze disrupts the instructor's flow. Unlike API-driven systems where a slow response can be retried transparently, media quality degradation is experienced in real-time. This demands proactive observability—detecting degradation before users perceive it and before it cascades.

---

## Metrics Framework

### Media Quality Metrics (Most Critical)

| Metric | Description | Collection Method | Alert Threshold |
|---|---|---|---|
| **MOS (Mean Opinion Score)** | Estimated voice quality (1.0–5.0 scale) | Computed from jitter, latency, loss via E-model | < 3.5 (warning), < 3.0 (critical) |
| **Glass-to-glass latency** | End-to-end media delay (sender encode → receiver decode) | RTCP Sender/Receiver Reports + client-side timestamp | p99 > 150ms (same region), > 400ms (cross-region) |
| **Jitter (inter-packet delay variation)** | Variation in packet arrival timing | RTCP jitter field (RFC 3550) | > 30ms (warning), > 80ms (critical) |
| **Packet loss rate** | % of RTP packets lost in transit | RTCP Receiver Report fraction_lost | > 2% (warning), > 5% (critical) |
| **FEC recovery rate** | % of lost packets recovered by FEC | SFU FEC decoder statistics | < 80% recovery (means loss exceeds FEC capacity) |
| **Video freeze events** | Number of video freezes per minute per subscriber | Client-side freeze detection (no new frame for > 500ms) | > 2 freezes/min (warning), > 5 (critical) |
| **Audio concealment rate** | % of audio frames replaced by concealment (PLC) | Client-side audio decoder stats | > 5% (warning), > 10% (critical) |
| **Simulcast layer distribution** | % of subscribers at each quality layer | SFU layer selection logs | > 50% at "low" layer suggests bandwidth issues |
| **NACK rate** | Retransmission requests per second per subscriber | SFU NACK handler | > 20 NACKs/sec suggests persistent loss |
| **PLI rate** | Picture Loss Indication requests per second | SFU PLI handler | > 1 PLI/sec suggests keyframe delivery issues |

### SFU Infrastructure Metrics (USE Method)

| Resource | Utilization | Saturation | Errors |
|---|---|---|---|
| **CPU** | % CPU across SFU process | Packet processing queue depth | Dropped packets due to CPU exhaustion |
| **Memory** | RSS memory per SFU process | GC pause frequency and duration | OOM events |
| **Network I/O** | Bandwidth in/out per NIC | UDP socket buffer overflow count | DTLS handshake failures |
| **File descriptors** | Open FD count per process | FD allocation failures | "Too many open files" errors |
| **Sessions** | Active sessions per node | Pending session allocation queue | Session allocation failures |

### Signaling Metrics (RED Method)

| Metric | Description | Alert Threshold |
|---|---|---|
| **Request rate** | WebSocket messages/sec by type (publish, subscribe, mute, etc.) | Anomalous spike > 3x baseline |
| **Error rate** | Failed signaling operations / total operations | > 1% (warning), > 5% (critical) |
| **Duration** | Latency of signaling operations (join, publish, subscribe) | p99 > 100ms (warning), > 500ms (critical) |
| **WebSocket connection count** | Active WebSocket connections per server | > 5,000 (approach capacity) |
| **WebSocket reconnection rate** | Reconnections/min across fleet | > 100/min (suggests network instability) |

### Session-Level Metrics

| Metric | Description | Granularity |
|---|---|---|
| **Session start success rate** | % of sessions that successfully start within 30s of schedule | Per session |
| **Time to first frame (TTFF)** | Time from join click to first decoded video frame | Per participant join |
| **Participant join success rate** | % of join attempts that succeed on first try | Per session |
| **Breakout room transition time** | Time from transition signal to media flowing in breakout room | Per transition |
| **Recording success rate** | % of sessions with complete recording available within 2h | Per session |
| **Active speaker accuracy** | Does the highlighted speaker match who's actually speaking | Sampled via client feedback |
| **Chat message delivery latency** | Time from send to all recipients receiving the message | Per message (sampled) |
| **Whiteboard sync latency** | Time from local draw to remote render | Per operation (sampled) |

### Engagement Metrics (Business)

| Metric | Description | Collection |
|---|---|---|
| **Camera-on rate** | % of participants with camera active | Real-time from media track status |
| **Active participation rate** | % of participants who spoke, chatted, or used whiteboard | Aggregated post-session |
| **Poll response rate** | % of participants who voted in polls | Per-poll tracking |
| **Q&A engagement** | Questions asked and upvoted per session | Per-session aggregation |
| **Attention score** | Composite metric: camera on + unmuted + active window + engagement actions | ML model per participant |
| **Session NPS** | Post-session satisfaction rating (1–5) | Client-side prompt after session end |

---

## Dashboard Design

### Level 1: Platform Health Dashboard (SRE / NOC)

| Panel | Visualization | Data Source |
|---|---|---|
| **Active sessions (global)** | Real-time counter + regional heatmap | Session service metrics |
| **Active participants (global)** | Real-time counter + trend graph | Roster service metrics |
| **SFU fleet health** | Node grid (green/yellow/red per node) | SFU health checks |
| **Aggregate MOS score** | Gauge (current) + trend (last 1h) | RTCP-derived metrics |
| **Session start success rate** | Percentage + trend (last 1h, 24h) | Session lifecycle events |
| **Error rate by service** | Stacked area chart | Service error counters |
| **Regional bandwidth** | Per-region bandwidth utilization bars | Network metrics |

### Level 2: Session Quality Dashboard (Operations)

| Panel | Visualization | Data Source |
|---|---|---|
| **Per-session MOS distribution** | Histogram of session-level MOS scores | Aggregated participant RTCP |
| **Packet loss heatmap** | Session x time heatmap colored by loss rate | SFU RTCP logs |
| **TTFF distribution** | Percentile bars (p50, p95, p99) | Client-side telemetry |
| **Simulcast layer distribution** | Stacked bar (high/mid/low/audio-only) over time | SFU subscription logs |
| **Breakout room transitions** | Success/failure rates + duration histogram | Orchestrator metrics |
| **Recording pipeline status** | Queue depth, processing time, failure rate | Composition worker metrics |

### Level 3: Individual Session Debug Dashboard (Support)

| Panel | Visualization | Data Source |
|---|---|---|
| **Participant timeline** | Gantt chart of join/leave/breakout events | Signaling event log |
| **Per-participant MOS** | Line chart per participant over session duration | Per-participant RTCP |
| **Network conditions** | Loss, jitter, RTT per participant over time | RTCP receiver reports |
| **Media track events** | Timeline of publish/subscribe/mute events | SFU event log |
| **Chat/engagement timeline** | Event markers on session timeline | Engagement event log |
| **SFU node assignment** | Which SFU node hosted which participants | Session allocation log |

---

## Logging Strategy

### What to Log

| Event Category | Log Level | Content | Retention |
|---|---|---|---|
| **Session lifecycle** | INFO | Session created/started/ended, duration, participant count | 90 days |
| **Participant join/leave** | INFO | User ID, device info, join method, SFU assignment | 90 days |
| **Media events** | DEBUG | Track publish/subscribe, simulcast layer changes, mute/unmute | 30 days |
| **Signaling errors** | ERROR | SDP negotiation failures, ICE failures, WebSocket disconnects | 90 days |
| **SFU node events** | INFO/ERROR | Node startup/shutdown, session migration, capacity alerts | 90 days |
| **Breakout room events** | INFO | Room create/dissolve, participant transitions, timer events | 90 days |
| **Recording events** | INFO/ERROR | Recording start/stop, composition start/complete/failure | 180 days |
| **Security events** | WARN/ERROR | Auth failures, rate limit hits, moderation actions, suspicious access | 1 year |
| **Compliance events** | INFO | Data access, recording download, export requests | 3 years (FERPA) |
| **RTCP statistics** | DEBUG | Per-participant jitter, loss, RTT (sampled every 5s) | 7 days |
| **Whiteboard operations** | DEBUG | CRDT operation count, state size, sync latency | 30 days |
| **Performance** | DEBUG | API response times, DB query durations, cache hit/miss | 30 days |

### Log Format (Structured JSON)

```
{
  "timestamp": "2026-03-10T09:15:23.456Z",
  "level": "INFO",
  "service": "signaling-server",
  "instance_id": "sig-us-east-07",
  "trace_id": "abc123def456",
  "span_id": "span789",
  "session_id": "session-uuid-here",
  "participant_id": "participant-uuid-here",
  "event": "participant.joined",
  "data": {
    "user_id": "user-uuid",
    "role": "student",
    "device_platform": "web",
    "device_browser": "chrome_122",
    "sfu_node": "sfu-us-east-12",
    "ice_connection_type": "host",      // host | srflx | relay
    "ttff_ms": 2340
  },
  "org_id": "org-uuid"
}
```

### Log Level Strategy

| Level | Usage | Example |
|---|---|---|
| **ERROR** | Operation failed; requires attention | SFU node crash, recording composition failure, database connection lost |
| **WARN** | Degraded state; may require action | High packet loss (>5%), SFU CPU >85%, TURN relay near capacity |
| **INFO** | Normal business events | Session started, participant joined, breakout rooms created |
| **DEBUG** | Detailed operational data | RTCP stats, simulcast layer changes, CRDT operation details |
| **TRACE** | Per-packet / per-frame data | Individual RTP packet traces (enabled only during debugging) |

---

## Distributed Tracing

### Trace Propagation

| Boundary | Propagation Method | Notes |
|---|---|---|
| Client → API Gateway | `traceparent` header (W3C Trace Context) | Standard HTTP header propagation |
| Client → WebSocket | `trace_id` in WebSocket message metadata | Custom field in signaling protocol |
| API Gateway → Backend Services | `traceparent` header (gRPC metadata) | Automatic propagation via service mesh |
| Signaling → SFU | `trace_id` in gRPC metadata | Linked to signaling operation span |
| SFU → Recording | `trace_id` in media fork metadata | Links media capture to signaling events |
| Services → Event Stream | `trace_id` in event message header | Traces cross event consumer boundaries |

### Key Spans to Instrument

| Span | Parent | Duration Target | Captures |
|---|---|---|---|
| `session.join` | Root | < 3s total | Full join flow from API request to first media frame |
| `session.join.auth` | session.join | < 50ms | Token validation, permission check |
| `session.join.sfu_allocate` | session.join | < 200ms | SFU node selection and capacity reservation |
| `session.join.signaling` | session.join | < 100ms | WebSocket setup, room state delivery |
| `session.join.ice` | session.join | < 2s | ICE connectivity check, DTLS handshake |
| `session.join.first_frame` | session.join | < 500ms | After ICE: time to first decoded frame |
| `breakout.create` | Root | < 3s | Room allocation, participant assignment, SFU setup |
| `breakout.transition` | breakout.create | < 2s | Individual participant media rerouting |
| `recording.compose` | Root | < 30min | Post-session multi-track composition |
| `whiteboard.sync` | Root | < 100ms | CRDT operation relay from source to all peers |
| `engagement.poll_create` | Root | < 200ms | Poll creation and distribution to participants |

### Trace Sampling Strategy

| Trace Type | Sampling Rate | Rationale |
|---|---|---|
| Session join (full flow) | 100% | Critical path; must be fully traced for debugging |
| Signaling operations | 10% | High volume; sampled for aggregate analysis |
| RTCP statistics | 1% | Extremely high volume; sampled for trend detection |
| Error traces | 100% | All errors fully traced for root cause analysis |
| Recording composition | 100% | Each recording is high-value; full tracing warranted |
| Whiteboard CRDT operations | 5% | High volume during active drawing |

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Response | Escalation |
|---|---|---|---|
| **SFU node down** | Health check fails for 2 consecutive checks (10s) | Auto-failover triggered; on-call paged for awareness | 5 min: escalate to SFU team lead |
| **Aggregate MOS < 3.0** | Platform-wide average MOS drops below 3.0 for 2 min | Investigate network, SFU load, cascade health | Immediate: page media infrastructure team |
| **Session start failure rate > 5%** | >5% of session starts failing in any region | Check SFU allocation, database, signaling health | 5 min: escalate to platform lead |
| **Recording pipeline stopped** | No compositions completing for 15 min | Check composition workers, object storage health | 15 min: escalate to storage team |
| **Database primary unreachable** | Primary database fails health check for 30s | Auto-promote replica; page DBA | Immediate: page database team |
| **Security: CSAM detection** | Image classifier detects potential CSAM content | Immediate content removal; legal team notified | Immediate: legal and compliance team |
| **Certificate expiry < 48h** | TLS/DTLS certificates approaching expiry | Trigger automatic renewal; page if renewal fails | 24h: escalate to security team |

### Warning Alerts (On-Call Notification)

| Alert | Condition | Response |
|---|---|---|
| **SFU CPU > 85%** | Any SFU node sustained >85% CPU for 5 min | Stop routing new sessions to node; investigate |
| **Packet loss > 3% (regional)** | Average packet loss in a region > 3% for 5 min | Investigate regional network; check ISP peering |
| **TURN relay utilization > 70%** | TURN fleet in any region at >70% bandwidth | Scale up TURN fleet; investigate why so many participants need relay |
| **Signaling WebSocket error rate > 2%** | >2% of WebSocket operations failing | Check signaling server health, Redis connectivity |
| **Chat moderation queue > 100** | >100 flagged messages awaiting review | Alert content moderation team |
| **Whiteboard CRDT state > 50 MB** | Any session's whiteboard state exceeds 50 MB | Trigger compaction; alert if compaction fails |
| **Event stream consumer lag > 10K** | Any consumer group is 10K+ events behind | Scale consumer group; investigate slow processing |

### Informational Alerts (Dashboard Only)

| Alert | Condition | Purpose |
|---|---|---|
| **Peak session count approaching record** | Within 10% of historical peak | Capacity planning awareness |
| **New SFU node provisioned** | Auto-scaler adds nodes | Scaling event tracking |
| **Recording storage > 80% quota** | Organization approaching storage quota | Proactive customer outreach |
| **API deprecation usage** | Clients using deprecated API version > 5% | Migration tracking |

---

## Runbook References

| Scenario | Runbook | Key Steps |
|---|---|---|
| SFU node failure during active sessions | `runbook/sfu-failover.md` | 1. Verify auto-failover triggered 2. Check participant reconnection rate 3. Investigate root cause 4. Replace failed node |
| High packet loss in region | `runbook/media-quality-degradation.md` | 1. Check regional SFU health 2. Verify ISP peering status 3. Check for bandwidth saturation 4. Consider cascade rerouting |
| Database failover | `runbook/database-failover.md` | 1. Verify replica promoted 2. Update connection strings 3. Check replication lag 4. Plan for original primary recovery |
| Recording composition backlog | `runbook/recording-backlog.md` | 1. Check worker health 2. Scale workers if healthy 3. Check object storage availability 4. Prioritize high-value recordings |
| Security incident (unauthorized access) | `runbook/security-incident.md` | 1. Isolate affected sessions 2. Revoke compromised credentials 3. Audit access logs 4. Notify affected users 5. Incident report within 72h |
| Hour-boundary capacity crunch | `runbook/peak-capacity.md` | 1. Verify pre-warming executed 2. Check SFU pool headroom 3. Activate emergency capacity 4. Enable degradation mode if needed |

---

## Quality of Experience (QoE) Monitoring

### Client-Side Telemetry Collection

```
CLIENT TELEMETRY REPORT (sent every 10 seconds):
{
  "session_id": "uuid",
  "participant_id": "uuid",
  "timestamp": "2026-03-10T09:15:30Z",
  "media_quality": {
    "audio_mos": 4.2,
    "video_freeze_count": 0,
    "video_resolution_current": "720p",
    "video_fps_current": 28,
    "audio_concealment_rate": 0.01,
    "jitter_buffer_ms": 25
  },
  "network": {
    "rtt_ms": 45,
    "packet_loss_percent": 0.5,
    "available_bandwidth_kbps": 3200,
    "ice_connection_type": "host",
    "transport": "udp"
  },
  "device": {
    "cpu_usage_percent": 35,
    "memory_usage_mb": 420,
    "battery_percent": 78,
    "thermal_state": "nominal"
  },
  "subscriptions": {
    "total_video_tracks": 6,
    "highest_layer": "high",
    "lowest_layer": "low"
  }
}
```

### Proactive Quality Intervention

```
FUNCTION MonitorAndIntervene(participant_telemetry):
    // Detect degradation trend before it becomes perceptible
    recent_reports = GetRecentReports(participant, window=30s)

    // Signal 1: Increasing jitter trend
    jitter_trend = LinearRegression(recent_reports.map(r => r.jitter_buffer_ms))
    IF jitter_trend.slope > 2:  // Jitter increasing by 2ms per report
        // Pre-emptively downgrade video layer before freeze occurs
        DowngradeSubscriberLayer(participant, step=-1)
        LogIntervention("proactive_layer_downgrade", participant)

    // Signal 2: Client CPU pressure
    IF recent_reports.last().cpu_usage_percent > 80:
        // Reduce rendering load
        ReduceGalleryViewCount(participant, max=4)
        DisableAnimations(participant)
        LogIntervention("cpu_relief", participant)

    // Signal 3: Battery critical on mobile
    IF recent_reports.last().battery_percent < 15:
        // Switch to audio-only mode suggestion
        SuggestAudioOnly(participant)
        LogIntervention("battery_saver_suggestion", participant)

    // Signal 4: Sustained high packet loss
    avg_loss = Average(recent_reports.map(r => r.packet_loss_percent))
    IF avg_loss > 5:
        // Suggest TURN relay if currently on direct connection
        IF participant.ice_type == "host":
            TriggerICERestart(participant, prefer_relay=true)
            LogIntervention("relay_fallback", participant)
```

---

*Previous: [Security & Compliance](./06-security-and-compliance.md) | Next: [Interview Guide ->](./08-interview-guide.md)*
