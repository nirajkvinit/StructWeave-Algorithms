# Observability — Biometric Travel Platform

## 1. Metrics

### 1.1 Biometric Accuracy Metrics

These are the most critical metrics for the platform—they directly measure the core value proposition.

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| **true_accept_rate** | Percentage of genuine matches correctly accepted | > 99.5% | < 99.0% |
| **false_accept_rate** | Percentage of impostor matches incorrectly accepted | < 0.001% | > 0.005% |
| **false_reject_rate** | Percentage of genuine matches incorrectly rejected | < 3% | > 5% |
| **liveness_detection_rate** | Percentage of presentation attacks correctly detected | > 99.5% | < 99.0% |
| **match_score_distribution** | Histogram of match scores (genuine vs. impostor) | Bimodal (well-separated) | Score overlap increasing |
| **demographic_equity_variance** | Max TAR variance across demographic groups | < 2% | > 3% |
| **1_n_rank1_accuracy** | Correct identification rate in gallery matching | > 99.9% | < 99.5% |
| **image_quality_acceptance_rate** | Percentage of captures meeting quality threshold | > 90% | < 85% |

**Accuracy Monitoring Dashboard:**

```
Biometric Accuracy (Real-Time, Rolling 1-Hour Window)
┌─────────────────────────────────────────────────────┐
│ TAR: 99.62%   FAR: 0.0008%   FRR: 2.1%            │
│                                                      │
│ Match Score Distribution:                            │
│ Genuine:  ████████████████████ 0.72 (median)        │
│ Impostor: ██ 0.15 (median)                          │
│ Separation: 0.57 (healthy)                           │
│                                                      │
│ Liveness Detection: 99.7% (3 attacks detected/hour) │
│                                                      │
│ Quality Acceptance: 92% first-attempt               │
│                                                      │
│ Demographic Equity (TAR by group):                   │
│  Group A: 99.5%  Group B: 99.7%  Group C: 99.4%    │
│  Group D: 99.6%  Variance: 0.3% (within target)     │
└─────────────────────────────────────────────────────┘
```

### 1.2 Touchpoint Performance Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| **touchpoint_processing_time_p50** | Median end-to-end touchpoint latency | < 500ms (1:1), < 800ms (1:N) | > 800ms (1:1), > 1.5s (1:N) |
| **touchpoint_processing_time_p99** | Worst-case touchpoint latency | < 1s (1:1), < 2s (1:N) | > 2s (1:1), > 3s (1:N) |
| **touchpoint_throughput** | Passengers processed per minute per lane | > 20/min (biometric) | < 15/min |
| **enrollment_duration_p50** | Median enrollment time | < 60s (kiosk) | > 90s |
| **enrollment_success_rate** | First-attempt enrollment success | > 95% | < 90% |
| **manual_fallback_rate** | Percentage of passengers falling back to manual | < 5% | > 10% |
| **touchpoint_availability** | Percentage of time touchpoint is operational | > 99.9% | < 99.5% |
| **queue_depth** | Number of passengers waiting at each touchpoint zone | < 10 per lane | > 20 per lane |
| **dwell_time** | Average time between successive touchpoints | Monitor (no target) | Deviation > 50% from baseline |

### 1.3 Gallery Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| **gallery_build_time** | Time to construct flight gallery | < 30s | > 60s |
| **gallery_distribution_time** | Time to distribute to edge nodes | < 60s | > 5 min |
| **gallery_coverage** | Enrolled passengers / total passengers per flight | > 70% | < 50% |
| **gallery_staleness** | Time since last gallery update | < 5 min | > 15 min |
| **gallery_purge_compliance** | Percentage of galleries purged within 30 min of departure | 100% | < 100% |
| **active_gallery_count** | Number of concurrent active galleries | Monitor | > airport capacity |
| **gallery_distribution_failures** | Failed gallery distributions per hour | 0 | > 2 |

### 1.4 Credential and Consent Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| **credential_verification_latency** | Time to verify VC (signature + revocation) | < 10ms (cached) | > 100ms |
| **credential_verification_failures** | Failed verifications per hour | < 0.1% of total | > 1% |
| **revocation_propagation_time** | Time from revocation to all edge nodes updated | < 5 min | > 10 min |
| **consent_revocation_count** | Consent revocations per day | Monitor | Sudden spike > 10x baseline |
| **template_deletion_compliance** | Templates deleted within 24h of flight | 100% | < 100% |
| **deletion_proof_generation** | Deletion proofs generated per deletion | 100% | < 100% |
| **blockchain_transaction_latency** | Time for credential anchor confirmation | < 2s | > 5s |
| **blockchain_validator_health** | Number of healthy validators | >= 5 (of 7) | < 5 |

### 1.5 Edge Node Health Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| **edge_cpu_utilization** | Edge node CPU usage | < 70% average | > 85% sustained |
| **edge_gpu_utilization** | NPU/TPU inference usage | < 80% average | > 90% sustained |
| **edge_memory_utilization** | Memory usage including gallery cache | < 75% | > 85% |
| **edge_camera_quality** | Average image quality score from camera | > 80 | < 60 |
| **edge_heartbeat_lag** | Time since last heartbeat | < 30s | > 90s (mark offline) |
| **edge_model_version** | ML model version running | Latest | Any node on old version > 24h |
| **edge_certificate_expiry** | Days until node certificate expires | > 30 days | < 7 days |
| **edge_event_buffer_depth** | Buffered events during connectivity issues | 0 | > 100 |

---

## 2. Logging

### 2.1 Log Categories

```
Log Category: BIOMETRIC_MATCH
  Level: INFO (accept), WARN (reject), ERROR (failure)
  Fields:
    - timestamp, touchpoint_id, edge_node_id
    - verification_type (1:1 / 1:N)
    - match_score, match_decision
    - liveness_score, liveness_decision
    - processing_time_ms
    - quality_score
    - gallery_id, gallery_size (for 1:N)
    - fallback_triggered (boolean)
  Privacy: NO passenger_did or biometric data in logs
  Retention: 90 days (hot), 1 year (warm)

Log Category: ENROLLMENT
  Level: INFO (success), WARN (retry), ERROR (failure)
  Fields:
    - timestamp, touchpoint_id
    - enrollment_method (kiosk/mobile/aadhaar)
    - document_type
    - match_score (document vs. live)
    - liveness_score
    - quality_score
    - enrollment_duration_ms
    - consent_granted (boolean)
    - failure_reason (if applicable)
  Privacy: NO PII, NO template data
  Retention: 1 year

Log Category: CREDENTIAL_VERIFICATION
  Level: INFO (valid), WARN (expired/revoked), ERROR (forgery attempt)
  Fields:
    - timestamp, touchpoint_id
    - credential_id_hash (not full credential)
    - issuer_did
    - verification_result
    - revocation_checked
    - verification_time_ms
    - cache_hit (boolean)
  Retention: 1 year

Log Category: GALLERY_LIFECYCLE
  Level: INFO
  Fields:
    - timestamp
    - gallery_id, flight_number
    - action (BUILD / DISTRIBUTE / UPDATE / PURGE)
    - gallery_size
    - distribution_targets
    - coverage_percentage
    - duration_ms
  Retention: 90 days

Log Category: CONSENT_ACTION
  Level: INFO
  Fields:
    - timestamp
    - consent_id
    - action (GRANT / REVOKE / MODIFY)
    - permissions_summary
    - propagation_started
  Privacy: passenger_did hashed
  Retention: 7 years (regulatory requirement)

Log Category: SECURITY_EVENT
  Level: WARN (suspicious), ERROR (confirmed threat)
  Fields:
    - timestamp, touchpoint_id
    - event_type (SPOOF_DETECTED, INTEGRITY_FAILURE, WATCHLIST_HIT,
                  CREDENTIAL_FORGERY, TAMPERING_DETECTED)
    - severity (MEDIUM / HIGH / CRITICAL)
    - details
    - automated_response_taken
  Retention: 7 years
  Alert: Immediate for CRITICAL
```

### 2.2 Log Privacy Controls

```
Privacy-Safe Logging Rules:

NEVER log:
  - Biometric templates (raw or encrypted)
  - Facial images
  - Passport numbers or document MRZ data
  - Full passenger names
  - Aadhaar numbers (even hashed, per UIDAI guidelines)
  - Full credential contents

ALWAYS hash before logging:
  - passenger_did -> SHA-256(passenger_did + daily_salt)
  - credential_id -> SHA-256(credential_id)
  - enrollment_id -> SHA-256(enrollment_id)

Safe to log:
  - Match scores (float values)
  - Touchpoint IDs and edge node IDs
  - Processing times
  - Decision outcomes (ACCEPT/REJECT)
  - Aggregate statistics
  - Quality scores
  - Error codes and categories
  - Gallery IDs and sizes

Log Sanitization Pipeline:
  1. Edge node generates log entry
  2. Log sanitizer checks all fields against deny list
  3. PII fields hashed with daily rotating salt
  4. Sanitized log sent to central log aggregator
  5. Original unsanitized log NOT retained
```

---

## 3. Distributed Tracing

### 3.1 Trace Architecture

Each passenger touchpoint interaction generates a distributed trace spanning edge nodes, cloud services, and external systems.

```
Trace Structure for 1:1 Verification:

TraceID: abc-123 (generated at touchpoint)
├── Span: touchpoint_interaction [500ms]
│   ├── Span: credential_presentation [200ms]
│   │   └── Span: ble_transfer [180ms]
│   ├── Span: face_capture [100ms]
│   │   ├── Span: face_detection [10ms]
│   │   └── Span: quality_assessment [5ms]
│   ├── Span: parallel_processing [150ms]
│   │   ├── Span: liveness_detection [150ms]
│   │   │   ├── Span: texture_analysis [30ms]
│   │   │   ├── Span: depth_estimation [40ms]
│   │   │   └── Span: ensemble_scoring [10ms]
│   │   ├── Span: template_extraction [140ms]
│   │   │   └── Span: npu_inference [40ms]
│   │   └── Span: credential_verification [50ms]
│   │       ├── Span: did_resolution [1ms] (cache hit)
│   │       ├── Span: signature_verify [5ms]
│   │       └── Span: revocation_check [1ms] (cache hit)
│   ├── Span: template_matching [5ms]
│   │   └── Span: cosine_similarity [1ms]
│   ├── Span: result_attestation [10ms]
│   │   └── Span: hsm_sign [8ms]
│   └── Span: journey_update [25ms]
│       └── Span: orchestrator_event [20ms]

Trace Propagation:
  - TraceID generated at touchpoint edge node
  - Propagated via gRPC metadata to cloud services
  - Stored in distributed tracing backend
  - Correlated with journey_id for end-to-end journey traces
```

### 3.2 Journey-Level Tracing

Beyond individual touchpoint traces, the system correlates all touchpoints in a passenger's journey:

```
Journey Trace (Spans Across Multiple Touchpoints):

JourneyTraceID: journey-456
├── Touchpoint: ENROLLMENT [T=0, 72s]
│   └── TraceID: abc-001
├── Touchpoint: CHECK_IN [T=+45min, 2.1s]
│   └── TraceID: abc-002
├── Touchpoint: BAG_DROP [T=+48min, 3.5s]
│   └── TraceID: abc-003
├── Touchpoint: SECURITY [T=+55min, 4.2s]
│   └── TraceID: abc-004
├── Touchpoint: BOARDING [T=+90min, 1.8s]
│   └── TraceID: abc-005
└── Journey Complete [T=+95min]

Journey Dwell Time Analysis:
  Enrollment -> Check-in:   45 min (expected: 30-60 min)
  Check-in -> Bag Drop:     3 min  (expected: 2-5 min)
  Bag Drop -> Security:     7 min  (expected: 5-15 min)
  Security -> Boarding:     35 min (expected: 20-60 min)
  Total Journey:            90 min (expected: 60-120 min)
```

---

## 4. Alerting

### 4.1 Alert Hierarchy

```
CRITICAL Alerts (Page on-call engineer immediately):
  - Any false accept detected (post-hoc audit reveals incorrect match)
  - Camera pipeline integrity failure (deepfake injection suspected)
  - Watchlist positive match
  - Template data breach indicator
  - Multiple edge nodes offline in same terminal
  - Consent audit chain integrity violation
  - Blockchain consensus failure (< 5 validators healthy)

HIGH Alerts (Notify ops team within 15 minutes):
  - FAR exceeds 0.005% (rolling 1-hour window)
  - FRR exceeds 5% (rolling 1-hour window)
  - Manual fallback rate exceeds 10% at any zone
  - Gallery distribution failure for departing flight
  - Template deletion SLO violation (any template retained > 24h)
  - Edge node model version mismatch

MEDIUM Alerts (Ticket for next business day):
  - Individual edge node offline
  - Gallery coverage below 50% for a flight
  - Enrollment success rate below 90%
  - Credential verification cache miss rate above 5%
  - Touchpoint queue depth exceeds 20

LOW Alerts (Weekly review):
  - Individual touchpoint processing time trending up
  - Camera quality score degradation (may need cleaning/calibration)
  - Certificate expiry within 30 days
  - Blockchain transaction latency trending up
```

### 4.2 Anomaly Detection

```
Anomaly Detection Models:

1. Match Score Anomaly Detection
   - Monitor distribution of genuine match scores per touchpoint
   - Alert if mean score drops by > 0.05 (may indicate environmental change
     like new lighting, dirty camera lens, or model degradation)
   - Use rolling 1-hour z-score: alert if z > 3

2. Spoofing Attempt Rate Anomaly
   - Baseline: ~2-5 presentation attacks per day per airport
   - Alert if > 3x baseline in any 1-hour window
   - May indicate organized spoofing attempt
   - Severity: HIGH (potential coordinated attack)

3. Enrollment Failure Pattern
   - Monitor enrollment failure reasons
   - Alert if "LIVENESS_FAILED" rate exceeds 5% (normal: < 1%)
   - May indicate environmental issue or attack

4. Touchpoint Throughput Anomaly
   - Baseline throughput per touchpoint per hour-of-day
   - Alert if actual throughput < 50% of baseline for > 15 minutes
   - May indicate camera failure, NPU degradation, or network issues

5. Gallery Coverage Trend
   - Monitor enrollment adoption rate over time
   - Alert on sudden drops in gallery coverage percentage
   - May indicate enrollment service issues or consent campaign problems
```

### 4.3 SLO-Based Alerting

```
SLO Burn Rate Alerts:

TAR SLO: 99.5%
  - 1-hour burn rate > 14.4x: PAGE (will exhaust monthly error budget in 5 hours)
  - 6-hour burn rate > 6x: TICKET (will exhaust monthly error budget in 5 days)
  - 3-day burn rate > 1x: REVIEW (trending toward SLO violation)

Touchpoint Availability SLO: 99.99%
  - Monthly error budget: 4.32 minutes
  - Any single touchpoint down > 1 minute: ALERT
  - 3+ touchpoints down simultaneously: PAGE

Template Deletion SLO: 100% within 24 hours
  - Any template retained > 20 hours: WARNING
  - Any template retained > 23 hours: CRITICAL
  - Any template retained > 24 hours: INCIDENT (compliance violation)
```

---

## 5. Operational Dashboards

### 5.1 Airport Operations Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  BIOMETRIC TRAVEL PLATFORM — AIRPORT OPS CENTER              │
│  Airport: DEL | Date: 2026-03-09 | Time: 07:45 UTC+5:30     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  TOUCHPOINT STATUS                                           │
│  ┌─────────┬────────┬─────────┬──────────┬─────────────────┐│
│  │ Zone    │ Online │ Offline │ Degrade  │ Throughput      ││
│  ├─────────┼────────┼─────────┼──────────┼─────────────────┤│
│  │ Enroll  │ 42/45  │ 2       │ 1        │ 28 pax/min      ││
│  │ Check-in│ 55/60  │ 3       │ 2        │ 45 pax/min      ││
│  │ BagDrop │ 35/40  │ 4       │ 1        │ 22 pax/min      ││
│  │ Security│ 72/80  │ 5       │ 3        │ 58 pax/min      ││
│  │ Immigr  │ 32/35  │ 2       │ 1        │ 20 pax/min      ││
│  │ Boarding│ 48/50  │ 1       │ 1        │ 35 pax/min      ││
│  └─────────┴────────┴─────────┴──────────┴─────────────────┘│
│                                                               │
│  BIOMETRIC PERFORMANCE (Last Hour)                           │
│  TAR: 99.6% | FAR: 0.0007% | FRR: 2.3% | Liveness: 99.8%  │
│  Avg Match Time: 320ms | Manual Fallback: 3.8%              │
│                                                               │
│  ACTIVE GALLERIES: 47 | COVERAGE: 71% avg                   │
│  ENROLLMENTS TODAY: 23,450 | VERIFICATIONS: 89,230          │
│                                                               │
│  ALERTS: 0 CRITICAL | 1 HIGH (Gallery late: AI-302)         │
│          3 MEDIUM | 12 LOW                                    │
│                                                               │
│  PRIVACY COMPLIANCE                                          │
│  Templates pending deletion: 0 (overdue: 0)                 │
│  Consent revocations today: 47 (all propagated < 5 min)     │
│  Audit chain integrity: VERIFIED (last check: 5 min ago)    │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Biometric Accuracy Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  BIOMETRIC ACCURACY MONITOR                                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  SCORE DISTRIBUTIONS (Last 24 Hours)                         │
│                                                               │
│  Genuine Matches:    ▁▂▃▅▇████▇▅▃▂▁  μ=0.73, σ=0.06       │
│  Impostor Matches:   █▇▃▁▁              μ=0.14, σ=0.08       │
│  Separation (d'):    8.2 (excellent)                          │
│                                                               │
│  THRESHOLD ANALYSIS                                          │
│  Current threshold: 0.68                                      │
│  TAR at threshold: 99.62%                                    │
│  FAR at threshold: 0.00083%                                  │
│                                                               │
│  DEMOGRAPHIC EQUITY (Last 7 Days)                            │
│  Group A: TAR 99.5% | Group B: TAR 99.7%                    │
│  Group C: TAR 99.4% | Group D: TAR 99.6%                    │
│  Max variance: 0.3% (target: < 2%)                          │
│                                                               │
│  LIVENESS DETECTION                                          │
│  Total checks: 89,230 | Attacks detected: 12                │
│  Attack types: Screen(5), Print(4), Mask(2), Unknown(1)      │
│  Detection rate: 99.87%                                      │
│                                                               │
│  TREND (7-Day Rolling)                                       │
│  TAR: ─────────── 99.5%  (stable)                           │
│  FAR: ─────────── 0.001% (stable)                           │
│  FRR: ───╲──────  2.8%->2.3% (improving)                   │
└──────────────────────────────────────────────────────────────┘
```

---

*Next: [Interview Guide ->](./08-interview-guide.md)*
