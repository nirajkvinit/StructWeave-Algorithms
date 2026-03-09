# Interview Guide — Wearable Health Monitoring Platform

## 1. The 45-Minute Pacing Guide

### Phase 1: Requirements Clarification (5–7 minutes)

**Objective:** Demonstrate structured thinking by clarifying scope before diving into design.

**Key Questions to Ask:**

| Question | Why It Matters | Strong vs. Weak |
|---|---|---|
| "What types of wearable sensors are we supporting?" | Scopes the data model and processing pipeline | **Strong:** Asks about sensor types, sampling rates, data volume. **Weak:** Assumes "just heart rate" |
| "Are we building the wearable firmware, or just the cloud platform?" | Determines system boundary | **Strong:** Clarifies the wearable ↔ phone ↔ cloud scope. **Weak:** Starts designing chip architecture |
| "Is this consumer wellness or clinical/medical grade?" | Changes regulatory requirements entirely | **Strong:** Asks about FDA SaMD, HIPAA. **Weak:** Ignores regulatory implications |
| "What's the expected device scale?" | Drives capacity planning | **Strong:** Asks for order of magnitude (millions vs. billions). **Weak:** Designs for arbitrary scale |
| "How critical is alert latency?" | Determines architecture for alert pipeline | **Strong:** Distinguishes life-safety vs. informational alerts. **Weak:** Treats all alerts equally |

**Scope Anchoring Statement (say this early):**
"I'll design a platform that ingests continuous sensor data from wearable devices through a phone-as-gateway, processes it through a cloud pipeline for anomaly detection and trend analysis, and delivers alerts to users and physicians—with HIPAA compliance throughout."

### Phase 2: High-Level Architecture (10–12 minutes)

**What to Draw:**

1. **Three-tier pipeline**: Wearable → Phone → Cloud (this is the defining architectural pattern)
2. **Data flow**: Sensor → BLE → Phone aggregation → Cloud ingestion → Processing → Storage
3. **Alert fast-path**: Separate from batch processing pipeline
4. **Key data stores**: Time-series DB, user profile store, alert store

**Architecture Diagram Talking Points:**

```
Draw this on the whiteboard:

[Wearable Sensors] --BLE--> [Phone App] --HTTPS--> [Cloud API Gateway]
         |                       |                        |
    On-device ML          HealthKit/HC              ┌─────┴─────┐
    (TinyML inference)    (platform SDK)       [Ingestion]  [Alert Fast-Path]
                                                    |              |
                                              [Stream Processing] [Anomaly Engine]
                                                    |              |
                                              ┌─────┴─────┐   [Notification]
                                          [Time-Series] [Analytics]    |
                                              DB          Batch    [User/Physician]
```

**Must-Mention Design Decisions:**

| Decision | What to Say | Why It Impresses |
|---|---|---|
| **Phone-as-gateway** | "BLE is 10–50x more power efficient than cellular. The phone acts as an intelligent middleware layer." | Shows IoT domain knowledge |
| **On-device inference** | "Critical detection (fall, arrhythmia) runs on-device with TinyML for sub-second latency." | Shows understanding of latency constraints |
| **Alert fast-path** | "Critical alerts bypass the batch pipeline. A separate low-latency path ensures < 10s end-to-end." | Shows prioritized architecture thinking |
| **Tiered storage** | "Sensor data has a value decay curve. Hot (90d, full res) → warm (1yr, aggregated) → cold (5yr)." | Shows cost-aware design |

### Phase 3: Deep Dive (15–18 minutes)

**Expect the interviewer to pick one or two areas for deep dive. Prepare for these:**

#### Deep Dive Option A: Data Sync Protocol

**Key Points to Cover:**
- BLE chunked transfer with per-chunk CRC and resume capability
- Store-and-forward: 72-hour on-device buffer survives extended disconnection
- Deduplication: device sequence numbers + phone hash check + server idempotency
- Handling phone OS background restrictions (iOS 30s background limit, Android Doze)
- Sync storm mitigation: jittered intervals + predictive auto-scaling

**Scoring Rubric:**

| Level | Indicator |
|---|---|
| **Senior** | Describes BLE sync with resumability and dedup |
| **Staff** | Discusses OS-level constraints (background execution), adaptive sync frequency |
| **Principal** | Designs the full sync state machine with conflict resolution and clock drift handling |

#### Deep Dive Option B: Anomaly Detection Pipeline

**Key Points to Cover:**
- Two-tier: on-device (TinyML, INT8 quantized) + cloud (GPU, full-precision)
- Motion artifact rejection using accelerometer as reference signal
- Hysteresis: 3 consecutive positive detections before alerting
- Personalized baselines: per-user normal ranges from 14-day rolling window
- False positive management: context-aware thresholds, multi-signal confirmation
- Cloud "second opinion" for on-device alerts

**Scoring Rubric:**

| Level | Indicator |
|---|---|
| **Senior** | Describes threshold-based detection with cloud processing |
| **Staff** | Discusses motion artifacts, confidence scoring, personalized baselines |
| **Principal** | Designs the full two-tier inference pipeline with model versioning and drift detection |

#### Deep Dive Option C: HIPAA Compliance and PHI Protection

**Key Points to Cover:**
- Encryption at rest (AES-256 with per-user keys) and in transit (TLS 1.3 + BLE encryption)
- Consent management: granular per-category, per-purpose consent grants
- Cryptographic erasure: destroy per-user key → all encrypted PHI becomes unrecoverable
- Minimum necessary access: RBAC + ABAC + consent gates
- Audit trail: immutable hash-chained log of all PHI access
- Clinical vs. wellness pipeline separation for FDA SaMD

**Scoring Rubric:**

| Level | Indicator |
|---|---|
| **Senior** | Mentions encryption and access control basics |
| **Staff** | Designs consent management, discusses cryptographic erasure, regulatory pipeline separation |
| **Principal** | Full threat model, HIPAA/GDPR gap analysis, FDA SaMD classification architecture |

### Phase 4: Scalability & Trade-offs (8–10 minutes)

**Key Scaling Points:**

1. **User-based partitioning** for time-series data (all data for one user on same shard)
2. **Multi-region deployment** driven by data residency (EU data stays in EU)
3. **Auto-scaling ingestion** with predictive pre-scaling for morning sync peaks
4. **Storage cost optimization** through tiered retention with automated downsampling

**Trade-offs to Discuss:**

| Trade-off | Option A | Option B | Recommendation |
|---|---|---|---|
| **On-device vs. cloud inference** | Low latency, limited model size | High accuracy, network dependent | Hybrid: critical on-device, nuanced in cloud |
| **Sync frequency** | High frequency → better data, more battery drain | Low frequency → battery savings, data gaps | Adaptive: frequency based on activity + battery |
| **Alert sensitivity** | High recall → more false positives → alert fatigue | High precision → may miss real events | Tuned per severity: high recall for critical, high precision for warnings |
| **Storage resolution** | Full resolution forever → expensive | Aggressive downsampling → lose detail | Tiered: full resolution hot, downsampled cold |
| **Data residency** | Single region → simpler, lower cost | Multi-region → GDPR/compliance, lower latency | Multi-region with PHI data pinning |

### Phase 5: Wrap-up (2–3 minutes)

**Demonstrate awareness of broader concerns:**
- "For monitoring, I'd track sync success rate, alert E2E latency, and false positive rate as golden metrics"
- "Battery life is the constraint that shapes every technical decision on the device side"
- "The regulatory gradient between wellness and clinical features drives pipeline separation"

---

## 2. Common Trap Questions

### Trap 1: "Why not just send all data to the cloud and process there?"

**Wrong Answer:** "Sure, the cloud has unlimited compute so we should process everything there."

**Right Answer:** "Three reasons against cloud-only: (1) **Latency** — fall detection needs sub-second response; a network round-trip can't guarantee this. (2) **Battery** — continuous cellular/Wi-Fi transmission drains a 300 mAh wearable battery in hours, not days. (3) **Privacy** — on-device inference means raw physiological signals never leave the device for routine processing, reducing PHI exposure. The correct answer is a hybrid: time-critical detection on-device, nuanced analysis in the cloud."

### Trap 2: "How do you handle a user who doesn't wear the device consistently?"

**Wrong Answer:** "We just ignore gaps in the data."

**Right Answer:** "Data gaps are expected and must be handled gracefully throughout the pipeline. (1) **Wear detection** — capacitive/optical sensor detects on-wrist state; data during off-wrist periods is flagged. (2) **Baseline computation** — only include data with sufficient wear time and signal quality. (3) **Trend analysis** — use robust estimators (Theil-Sen) that handle missing data. (4) **Health score** — reduce confidence score when data coverage falls below threshold; show 'incomplete data' indicator to user. (5) **Alerts** — suppress anomaly detection during re-wearing transition period (physiological values stabilize over 5–10 minutes)."

### Trap 3: "Can you just use a relational database for everything?"

**Wrong Answer:** "Sure, PostgreSQL can handle it."

**Right Answer:** "A relational database works for user profiles, consent grants, and alert records—structured data with relationship queries. But sensor data requires a time-series database for three reasons: (1) **Write throughput** — 250 billion sensor records per day requires purpose-built write-optimized storage. (2) **Time-range queries** — 'give me HR for the last 24 hours' is the dominant access pattern; TSDB indexes are optimized for this. (3) **Automatic downsampling** — continuous aggregation is a first-class TSDB feature; building it on top of a relational DB requires complex ETL. I'd use polyglot persistence: TSDB for sensor data, relational for clinical records, document store for user profiles."

### Trap 4: "What happens when the ML model produces wrong results?"

**Wrong Answer:** "We'll just make the model more accurate."

**Right Answer:** "Wrong results manifest differently at each tier. On-device false positives cause alert fatigue—I mitigate with hysteresis (3 consecutive positives required) and cloud confirmation (second opinion). On-device false negatives are more dangerous—I set on-device thresholds for high recall, accepting more false positives that the cloud can filter. For cloud model degradation: (1) **Monitoring** — track sensitivity/specificity continuously against labeled validation set. (2) **Drift detection** — alert if model performance drops below validation threshold. (3) **Rollback** — model versioning with instant rollback to previous version. (4) **Shadow mode** — new models run in shadow mode alongside production model before replacing it."

### Trap 5: "Why not just use HealthKit/Health Connect as the backend?"

**Wrong Answer:** "Good idea, that simplifies everything."

**Right Answer:** "HealthKit/Health Connect are device-local data stores on the user's phone—they're not cloud backends. They serve as important integration points (users expect their data in Apple Health), but they can't provide: (1) **Cross-device access** — physician dashboard, web portal, and research analytics need cloud storage. (2) **Server-side processing** — anomaly detection with population-scale models, longitudinal trend analysis. (3) **Alert orchestration** — push notifications, emergency escalation, physician alerts. (4) **FHIR integration** — EHR systems need a FHIR server endpoint. The correct architecture writes to HealthKit/Health Connect during phone-side sync (for user convenience) AND uploads to the cloud platform (for all other use cases)."

### Trap 6: "How do you handle the regulatory difference between wellness and clinical features?"

**Wrong Answer:** "We apply the same pipeline for everything."

**Right Answer:** "This is the key architectural insight. Applying clinical-grade change control (IEC 62304, FDA QSR) to step counting would make iteration impossibly slow. Not applying it to ECG/AFib detection would be a regulatory violation. I bifurcate the pipeline: wellness features (steps, sleep, activity) use standard CI/CD with rapid iteration. Clinical features (ECG, AFib, SpO2 alerts) use a validated pipeline with change control boards, clinical validation, and traceability matrices. They share infrastructure (API gateway, storage) but have separate deployment pipelines and release cycles."

---

## 3. Key Trade-off Discussions

### 3.1 Battery Life vs. Data Granularity

```
The Spectrum:

Maximum Data                                            Maximum Battery
←─────────────────────────────────────────────────────────→
25 Hz PPG continuous                                    PPG every 10 min
50 Hz accelerometer                                     Accel every 5 sec
1 Hz SpO2                                               SpO2 every hour
Continuous BLE streaming                                Sync every 4 hours

Battery life: ~1 day                                    Battery life: ~30 days

Sweet spot: Adaptive duty cycling
  - Activity-aware (exercise: high rate; sleep: low rate; stationary: minimal)
  - Battery-aware (above 50%: normal; below 20%: conservative; below 5%: critical only)
  - Clinical-mode override (RPM patient: always high rate regardless of battery)

Result: 7-14 day battery life with clinically acceptable data quality
```

### 3.2 Alert Sensitivity vs. User Trust

```
High Sensitivity                                        High Specificity
(Catch everything)                                      (Only true events)
←─────────────────────────────────────────────────────────→
99% recall                                              99% precision
30% false positive rate                                 10% miss rate
20+ alerts/week                                         1-2 alerts/month
Users mute notifications                                Users may miss real events

Resolution: Tiered sensitivity
  Critical alerts (arrhythmia, fall): Bias toward recall (98%+)
    → False positives are scary but survivable; missed events are dangerous
  Warning alerts (trend changes): Bias toward precision (90%+)
    → Users tolerate occasional warnings; excessive warnings erode trust
  Informational (daily summaries): Low noise
    → Curated insights, not raw alerts
```

### 3.3 Privacy vs. Clinical Utility

```
Maximum Privacy                                         Maximum Clinical Utility
(On-device only)                                        (Full cloud processing)
←─────────────────────────────────────────────────────────→
All processing on device                                All data to cloud
No PHI in cloud                                         Rich physician dashboard
No population analytics                                 Population health insights
No research contribution                                Clinical trial readiness
Limited ML capability                                   Best-in-class models

Resolution: Consent-gated hybrid
  Base: On-device inference for immediate alerts (no cloud PHI needed)
  Opt-in: Cloud processing for enhanced analytics (with explicit consent)
  Opt-in: Physician sharing (consent per data category)
  Opt-in: Research contribution (de-identified, differential privacy)

The architecture must support any combination—users control the privacy dial
```

---

## 4. Scoring Rubric

### 4.1 Requirements Phase (15% of score)

| Score | Criteria |
|---|---|
| **Exceptional** | Identifies phone-as-gateway pattern, asks about regulatory scope (FDA/HIPAA), clarifies sensor types, discusses battery constraints |
| **Strong** | Asks about scale, sensor types, and alert criticality; establishes clear scope |
| **Adequate** | Asks basic questions about users and features |
| **Weak** | Jumps to design without clarifying scope; assumes consumer-only or clinical-only |

### 4.2 Architecture Phase (30% of score)

| Score | Criteria |
|---|---|
| **Exceptional** | Three-tier pipeline (device → phone → cloud) with on-device ML, alert fast-path, and regulatory pipeline separation |
| **Strong** | Clear data flow from wearable to cloud; separate alert path; appropriate storage choices |
| **Adequate** | Basic data pipeline; mentions storage and processing |
| **Weak** | Cloud-only architecture; ignores phone gateway role; no consideration of alert latency |

### 4.3 Deep Dive Phase (30% of score)

| Score | Criteria |
|---|---|
| **Exceptional** | Detailed sync protocol with resume/dedup; two-tier anomaly detection with motion artifacts; personalized baselines |
| **Strong** | Discusses sync challenges (BLE, dedup); anomaly detection with false positive management |
| **Adequate** | Basic sync description; threshold-based alerts |
| **Weak** | Handwaves sync as "just BLE transfer"; ignores motion artifacts and signal quality |

### 4.4 Scalability & Trade-offs Phase (25% of score)

| Score | Criteria |
|---|---|
| **Exceptional** | Battery-aware architecture trade-offs; alert sensitivity vs. trust analysis; HIPAA/GDPR operational impact; multi-region data residency |
| **Strong** | Discusses partitioning, tiered storage, and auto-scaling; mentions regulatory impact |
| **Adequate** | Basic horizontal scaling; mentions replication |
| **Weak** | No discussion of battery constraints; ignores regulatory requirements |

---

## 5. Differentiating Signals

### What Separates Senior from Staff

| Dimension | Senior Answer | Staff Answer |
|---|---|---|
| **Architecture** | Client-server with API and DB | Three-tier with device → phone → cloud; explains WHY phone is needed |
| **Battery** | Mentions battery as a concern | Designs adaptive duty cycling; quantifies power budget per component |
| **Anomaly Detection** | Cloud-based threshold alerts | Two-tier with TinyML; motion artifact rejection; personalized baselines |
| **Sync** | "Data syncs via BLE" | Resumable chunked protocol; dedup layers; OS background constraints |
| **Compliance** | "We encrypt data" | HIPAA safeguards; consent management; clinical vs. wellness pipeline split |
| **Scale** | "Shard the database" | User-based TSDB partitioning; tiered storage economics; sync storm prediction |

---

*Next: [Insights →](./09-insights.md)*
