# Observability — Telemedicine Platform

---

## 1. Observability Strategy

A telemedicine platform requires observability across three distinct planes: **clinical operations** (are patients receiving quality care?), **technical infrastructure** (are systems healthy?), and **compliance** (are we meeting HIPAA requirements?). Each plane has different stakeholders, retention requirements, and access controls.

### Observability Pillars

| Pillar | Purpose | Retention | Access Control |
|---|---|---|---|
| **Metrics** | Quantitative health of systems and clinical operations | 90 days hot, 2 years cold | Engineering + operations |
| **Logs** | Detailed event records for debugging and compliance | 30 days hot, 7 years cold (PHI audit logs) | Engineering (app logs), compliance (audit logs) |
| **Traces** | Request flow across services for latency analysis | 14 days full, 90 days sampled | Engineering |
| **Alerts** | Proactive notification of anomalies and SLO violations | Indefinite (alert history) | On-call + management |
| **Dashboards** | Visual aggregation for different stakeholders | N/A (computed from metrics) | Role-based access |

---

## 2. Metrics

### 2.1 Golden Signals by Service

| Service | Latency (p50/p99) | Traffic (rate) | Errors (rate) | Saturation (%) |
|---|---|---|---|---|
| **API Gateway** | 15ms / 200ms | 28K req/s | 0.05% | Connection pool: 40% |
| **Scheduling Service** | 50ms / 300ms | 500 bookings/s | 0.1% | DB connections: 60% |
| **Video Signaling** | 5ms / 50ms | 2K signals/s | 0.01% | WebSocket connections: 55% |
| **SFU Cluster** | N/A (media forwarding) | 25K concurrent sessions | 0.02% packet loss | CPU: 65%, bandwidth: 70% |
| **RPM Ingestion** | 20ms / 100ms | 6K readings/s | 0.2% | Event stream lag: 500 events |
| **E-Prescribe** | 200ms / 2s | 50 prescriptions/s | 0.5% (pharmacy network errors) | Queue depth: 30% |
| **Encounter Service** | 30ms / 200ms | 1K operations/s | 0.05% | DB write throughput: 50% |
| **Auth Service** | 10ms / 80ms | 5K validations/s | 0.02% | Token cache hit rate: 95% |

### 2.2 Video Quality Metrics

```
Video quality metric collection (per session, reported every 5 seconds):

  // Client-side metrics (via WebRTC getStats() API)
  video_metrics = {
    // Quality
    mos_score:            float,    // Mean Opinion Score (1.0-5.0), computed from other metrics
    resolution_sent:      string,   // "1920x1080", "1280x720", etc.
    resolution_received:  string,
    framerate_sent:       int,      // frames per second
    framerate_received:   int,

    // Network
    rtt_ms:               float,    // round-trip time to SFU
    jitter_ms:            float,    // inter-packet arrival time variance
    packet_loss_pct:      float,    // percentage of lost packets
    bandwidth_estimate:   int,      // kbps available

    // Session health
    freeze_count:         int,      // number of video freezes
    freeze_duration_ms:   int,      // total freeze time
    audio_concealment_pct: float,   // percentage of audio reconstructed due to loss
    simulcast_layer:      string,   // current forwarded layer: "f", "h", or "q"

    // Connection
    ice_state:            string,   // "connected", "disconnected", "failed"
    transport_type:       string,   // "udp", "tcp", "turn_udp", "turn_tcp"
    reconnection_count:   int
  }

  // Computed MOS score (ITU-T P.800 approximation):
  mos = 4.5
    - 0.1 * packet_loss_pct
    - 0.03 * jitter_ms
    - 0.02 * MAX(0, rtt_ms - 100)
    - 0.5 * (freeze_duration_ms / session_duration_ms)
  mos = CLAMP(mos, 1.0, 5.0)
```

### 2.3 Business and Clinical Metrics

```
Scheduling metrics:
  appointment_booked_total          — counter, labels: visit_type, urgency
  appointment_cancelled_total       — counter, labels: reason, advance_notice
  appointment_no_show_total         — counter, labels: visit_type
  appointment_wait_time_seconds     — histogram, labels: visit_type
  provider_utilization_ratio        — gauge, labels: provider_id, specialty
  slot_fill_rate                    — gauge, labels: day_of_week, hour
  scheduling_conflict_total         — counter (double-booking attempts caught)

Video metrics:
  video_session_duration_seconds    — histogram, labels: visit_type
  video_session_mos_score           — histogram, labels: transport_type, region
  video_join_time_seconds           — histogram (time from click to media flowing)
  video_reconnection_total          — counter, labels: reason
  video_audio_only_fallback_total   — counter

RPM metrics:
  rpm_readings_ingested_total       — counter, labels: metric_type, device_type
  rpm_anomaly_detected_total        — counter, labels: severity
  rpm_alert_response_time_seconds   — histogram (time from alert to provider acknowledgment)
  rpm_device_sync_lag_seconds       — histogram

Clinical outcome metrics:
  encounter_completed_total         — counter, labels: visit_type, disposition
  prescription_sent_total           — counter, labels: controlled_substance
  referral_generated_total          — counter, labels: specialty
  patient_satisfaction_score        — gauge (post-visit survey, 1-5)
```

### 2.4 Infrastructure Metrics

```
SFU cluster:
  sfu_sessions_active               — gauge per node
  sfu_cpu_utilization_percent       — gauge per node
  sfu_bandwidth_mbps                — gauge per node (in + out)
  sfu_packet_forwarding_rate        — counter per node
  sfu_cascade_latency_ms            — histogram (inter-SFU hop latency)

Database:
  db_connections_active             — gauge per shard
  db_replication_lag_ms             — gauge per replica
  db_query_duration_seconds         — histogram, labels: query_type
  db_transaction_commit_rate        — counter per shard
  db_deadlock_total                 — counter per shard

Event stream:
  stream_consumer_lag               — gauge per consumer group
  stream_publish_rate               — counter per topic
  stream_dlq_depth                  — gauge (dead letter queue size)

Cache:
  cache_hit_rate                    — gauge per cache cluster
  cache_eviction_rate               — counter
  cache_memory_usage_percent        — gauge
```

---

## 3. Logging

### 3.1 Log Classification

| Log Type | Content | PHI Sensitivity | Retention | Storage |
|---|---|---|---|---|
| **Application logs** | Service operations, errors, debug info | None (PHI stripped) | 30 days | Central log aggregator |
| **Access logs** | API requests, response codes, latency | Minimal (user IDs only) | 90 days | Central log aggregator |
| **Audit logs** | PHI access events, consent changes, admin actions | High | 7 years | Immutable append-only store |
| **Video quality logs** | Session metrics, network stats | Low (session IDs, no PHI) | 90 days | Time-series store |
| **Security logs** | Auth attempts, WAF events, anomaly detections | Moderate | 2 years | SIEM integration |
| **Integration logs** | EHR, pharmacy, payer API interactions | Moderate (request IDs) | 1 year | Central log aggregator |

### 3.2 Structured Log Format

```json
{
  "timestamp": "2026-03-09T10:30:00.123Z",
  "level": "INFO",
  "service": "scheduling-service",
  "instance": "sched-pod-7a8b",
  "trace_id": "abc123def456",
  "span_id": "789ghi",
  "correlation_id": "req_xyz789",
  "tenant_id": "tenant_acme_health",
  "user_id": "prov_e5f6g7h8",
  "user_role": "PROVIDER",
  "action": "appointment.create",
  "resource_type": "appointment",
  "resource_id": "apt_m3n4o5p6",
  "outcome": "SUCCESS",
  "duration_ms": 45,
  "metadata": {
    "visit_type": "FOLLOW_UP",
    "slot_id": "slot_i9j0k1l2"
  }
}
```

**PHI Stripping Rules:**
```
BEFORE logging, the logging framework automatically:

  1. REMOVES known PHI fields:
     patient_name, ssn, dob, address, phone, email → replaced with "[REDACTED]"

  2. TOKENIZES identifiers:
     patient_id → logged as-is (pseudonymized token, not PHI alone)
     mrn → replaced with hash(mrn + daily_salt)

  3. TRUNCATES free-text fields:
     clinical_notes, chief_complaint, diagnosis_description → NOT logged
     Only structured codes logged (icd_code, cpt_code)

  4. VALIDATES before write:
     Regex scan for SSN patterns (XXX-XX-XXXX), phone patterns, email patterns
     Any match triggers: suppress log entry + alert security team
```

### 3.3 HIPAA Audit Log Structure

```json
{
  "audit_id": "aud_001_20260309_103000",
  "timestamp": "2026-03-09T10:30:00.000Z",
  "event_type": "PHI_ACCESS",
  "event_subtype": "PATIENT_RECORD_VIEW",

  "actor": {
    "user_id": "prov_e5f6g7h8",
    "role": "PROVIDER",
    "authentication_method": "MFA_TOTP",
    "session_id": "sess_abc123",
    "source_ip": "10.0.1.50",
    "user_agent": "ProviderDashboard/3.2.1"
  },

  "patient": {
    "patient_token": "ptk_hashed_id",
    "relationship": "TREATING_PROVIDER"
  },

  "access_details": {
    "resource_type": "ENCOUNTER",
    "resource_id": "enc_u1v2w3x4",
    "fields_accessed": ["demographics", "diagnoses", "medications", "notes"],
    "phi_classification": "FULL",
    "access_purpose": "TREATMENT",
    "consent_id": "con_xyz789",
    "data_volume_bytes": 4500
  },

  "authorization": {
    "decision": "PERMIT",
    "policy_evaluated": "provider_treating_relationship",
    "minimum_necessary_check": "PASS"
  },

  "integrity": {
    "hash": "sha256:a1b2c3d4e5f6...",
    "previous_hash": "sha256:f6e5d4c3b2a1...",
    "sequence_number": 1893742
  }
}
```

---

## 4. Distributed Tracing

### 4.1 Trace Context Propagation

```
Trace propagation across the telemedicine platform:

  HTTP headers (W3C Trace Context):
    traceparent: 00-{trace_id}-{span_id}-{trace_flags}
    tracestate: tenant=acme,priority=high

  WebSocket messages:
    { "trace_id": "...", "span_id": "...", ... }

  Event stream messages:
    Event header: X-Trace-Id, X-Span-Id

  Cross-service propagation path example (video consultation):
    Patient App
    └── API Gateway (span: gateway.request)
        └── Auth Service (span: auth.validate_token)
        └── Scheduling Service (span: scheduling.get_appointment)
        └── Video Signaling (span: signaling.join_room)
            └── SFU Cluster (span: sfu.create_session)
            └── Event Stream (span: event.session_created)
                └── Audit Service (span: audit.log_access)
                └── Notification Service (span: notify.send_push)
```

### 4.2 Critical Path Tracing

```
Video Consultation Critical Path:

  Patient clicks "Join"
  ├── [50ms]  API Gateway: authenticate + route
  ├── [30ms]  Scheduling Service: validate appointment window
  ├── [20ms]  Video Service: create room (if not exists)
  ├── [100ms] Signaling Server: WebSocket connect + join room
  ├── [200ms] ICE negotiation: STUN binding, connectivity checks
  ├── [150ms] DTLS handshake: key exchange with SFU
  ├── [50ms]  Media setup: encoder start + first keyframe
  └── [Total: ~600ms] First media frame displayed

  Latency budget:  < 3 seconds total join time
  Bottleneck:      ICE negotiation (200ms) — mitigated by ICE trickling
  Second bottleneck: DTLS handshake (150ms) — mitigated by session resumption
```

### 4.3 Sampling Strategy

| Traffic Type | Sampling Rate | Rationale |
|---|---|---|
| Video signaling | 100% | Critical path; every session matters for quality analysis |
| Appointment booking | 100% | Low volume, high business impact |
| PHI access (audit) | 100% | Compliance requirement — every access must be traced |
| RPM ingestion | 1% | Extremely high volume; sample sufficient for debugging |
| Provider search/browse | 10% | Medium volume; useful for optimization but not critical |
| Health check / heartbeat | 0% | No diagnostic value; pure noise |

---

## 5. Alerting Framework

### 5.1 Alert Tiers

| Tier | Response | Examples | On-Call Action |
|---|---|---|---|
| **P0 — Page immediately** | < 5 minutes | Video infrastructure down, PHI breach detected, authentication service failure | Wake up on-call; bridge call within 15 min |
| **P1 — Page during hours** | < 30 minutes | SFU cluster > 85% capacity, scheduling DB replication lag > 5s, error rate > 1% | Investigate within business hours; escalate if worsening |
| **P2 — Ticket** | < 4 hours | Cache hit rate < 80%, single SFU node unhealthy, audit log hash chain warning | Create incident ticket; address in current sprint |
| **P3 — Informational** | Next business day | Storage approaching quota, certificate expiring in 30 days, non-critical vulnerability | Review in daily standup; plan remediation |

### 5.2 Key Alert Definitions

| Alert | Condition | Severity | Action |
|---|---|---|---|
| **Video quality degraded** | MOS score < 3.0 for > 5% of active sessions for 5 min | P1 | Investigate SFU health, network issues; scale SFU pool if capacity-related |
| **Scheduling double-book** | Any successful double-booking detected | P0 | Immediately investigate; contact affected patients; root cause analysis |
| **PHI access anomaly** | Provider accessing > 50 patient records in 1 hour (3x normal) | P1 | Security team review; potential unauthorized access or account compromise |
| **Audit log chain break** | Hash chain verification fails | P0 | Isolate affected partition; forensic investigation; potential tampering |
| **SFU capacity critical** | Any region > 85% SFU capacity | P1 | Auto-scale should have triggered; investigate if auto-scale failed |
| **RPM critical alert unacked** | Critical vital sign alert not acknowledged by provider within 10 min | P0 | Escalate to on-call provider; page clinic supervisor |
| **DB replication lag** | Lag > 5 seconds on any PHI-containing replica | P1 | Investigate replication health; potential data loss risk |
| **Prescription delivery failure** | > 5% of prescriptions fail pharmacy network delivery for 10 min | P1 | Check pharmacy network health; queue prescriptions for retry |
| **Auth service error rate** | Error rate > 0.5% for 3 min | P0 | All logins failing; fallback to cached JWT validation |
| **Event stream consumer lag** | Lag > 50,000 events for 5 min | P2 | Scale consumers; investigate slow processing |

### 5.3 Regulatory Alert Requirements

| Requirement | Alert | Notification Target |
|---|---|---|
| **HIPAA breach indication** | Unusual bulk PHI export, unauthorized access pattern | Security team + compliance officer + legal |
| **BAA expiration** | Business Associate Agreement expiring within 60 days | Compliance officer + vendor management |
| **Consent revocation** | Patient revokes consent for active treatment relationship | Treating provider + care coordinator |
| **Audit log retention** | Audit logs approaching 7-year mark (preparation for archival) | Compliance team |
| **Controlled substance alert** | EPCS system anomaly (unusual prescribing pattern) | Compliance officer + medical director |

---

## 6. Dashboards

### 6.1 Dashboard Hierarchy

```
Level 1: Executive Dashboard (C-suite, Board)
  - Daily consultation volume + trend
  - Patient satisfaction score
  - Platform uptime percentage
  - Revenue per consultation
  - Growth metrics (new patients, providers)

Level 2: Operations Dashboard (VP Engineering, Clinical Operations)
  - Real-time concurrent sessions
  - SFU cluster utilization by region
  - Average video quality (MOS) score
  - Scheduling fill rate + no-show rate
  - Error budget burn rate per service

Level 3: Service Health Dashboard (Engineering Team)
  - Golden signals per service (latency, traffic, errors, saturation)
  - Database health (replication lag, connection pool, query latency)
  - Event stream health (consumer lag, DLQ depth)
  - Cache performance (hit rate, eviction rate)

Level 4: Clinical Operations Dashboard (Medical Director, Care Team)
  - RPM alert summary (active, acknowledged, resolved)
  - Provider response times to alerts
  - Prescription success/failure rates
  - Patient wait times by provider/clinic
  - Follow-up compliance rates

Level 5: Compliance Dashboard (HIPAA Officer, Auditors)
  - PHI access volume by role and purpose
  - Audit log integrity status (hash chain health)
  - Encryption key rotation status
  - BAA status for all business associates
  - Access anomaly incidents (flagged + resolved)
  - Training compliance (% workforce HIPAA-trained)
```

### 6.2 Real-Time Video Quality Dashboard

```
Layout:

  ┌─────────────────────────────────────────────────────────┐
  │  Active Sessions: 24,832    Avg MOS: 4.1    Regions: 4  │
  ├──────────────┬──────────────┬───────────────────────────┤
  │ Region Map   │ MOS Distrib. │  Quality Issues (live)    │
  │ (geo heat)   │ (histogram)  │  - 3 sessions < MOS 2.0   │
  │ US-E: 8,721  │ 5.0: ████   │  - 12 sessions audio-only │
  │ US-W: 6,102  │ 4.0: ██████ │  - 5 TURN fallback        │
  │ EU:   5,844  │ 3.0: ██     │  - 0 connection failures   │
  │ APAC: 4,165  │ 2.0: █      │                           │
  ├──────────────┴──────────────┴───────────────────────────┤
  │ SFU Utilization                                          │
  │ US-East:  [████████░░] 72%   US-West: [██████░░░░] 58%  │
  │ Europe:   [███████░░░] 65%   APAC:    [████░░░░░░] 42%  │
  ├──────────────────────────────────────────────────────────┤
  │ Trends (last 24h)                                        │
  │ Sessions ──── MOS ──── Packet Loss ──── Reconnections    │
  │ [sparkline]  [sparkline]  [sparkline]    [sparkline]     │
  └──────────────────────────────────────────────────────────┘
```

---

## 7. Incident Investigation Playbook

### 7.1 Video Quality Degradation Investigation

```
PLAYBOOK: Video quality degradation detected (MOS < 3.0 cluster-wide)

  Step 1: Scope assessment
    - How many sessions affected? (dashboard: Active Sessions with MOS < 3.0)
    - Which regions? (dashboard: Region Map quality overlay)
    - When did it start? (dashboard: MOS trend line)

  Step 2: Network layer check
    - Check SFU bandwidth utilization (is a cluster saturated?)
    - Check inter-region cascade latency (are cascades degraded?)
    - Check TURN server health (are relayed sessions disproportionately affected?)

  Step 3: SFU health check
    - Check CPU utilization per SFU node (is one node hot?)
    - Check packet forwarding rate (is one node dropping packets?)
    - Check if auto-scaling triggered (did new nodes come up?)

  Step 4: Client-side analysis
    - Query client-reported metrics: which transport types affected? (UDP vs TCP vs TURN)
    - Check simulcast layer distribution: are clients being forced to low layers?
    - Check reconnection rate: are clients losing connection?

  Step 5: Correlate with infrastructure events
    - Any recent deployments?
    - Any cloud provider incidents?
    - Any network configuration changes?

  Step 6: Mitigate
    - If SFU capacity: force scale-up + redistribute sessions
    - If network: redirect traffic away from affected path
    - If client bug: enable feature flag to roll back client update
```

---

*Previous: [Security & Compliance ←](./06-security-and-compliance.md) | Next: [Interview Guide →](./08-interview-guide.md)*
