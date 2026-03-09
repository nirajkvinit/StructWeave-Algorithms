# Requirements & Estimations — Wearable Health Monitoring Platform

## 1. Functional Requirements

### 1.1 Sensor Data Collection

| Capability | Description |
|---|---|
| **Heart Rate (PPG)** | Continuous photoplethysmography at 25–100 Hz; resting, active, and recovery HR |
| **Blood Oxygen (SpO2)** | Pulse oximetry via red/infrared LED; periodic and on-demand measurements |
| **Electrocardiogram (ECG)** | Single-lead ECG recording at 256–512 Hz; user-initiated 30-second captures |
| **Skin Temperature** | Continuous or periodic thermometry with 0.1°C resolution |
| **Accelerometer** | 3-axis motion sensing at 50–100 Hz for activity, sleep, and fall detection |
| **Gyroscope** | Angular velocity for refined motion classification and gesture detection |
| **Electrodermal Activity (EDA)** | Skin conductance for stress level estimation |
| **Barometric Altimeter** | Altitude changes for stair counting and elevation tracking |

**Key Operations:**
- Continuously sample physiological signals at sensor-appropriate frequencies
- Apply on-device signal conditioning (filtering, downsampling, windowing)
- Buffer sensor data locally during BLE disconnection periods
- Tag each measurement with timestamp, sensor ID, confidence score, and wear-state flag
- Support configurable sampling profiles (high-fidelity clinical vs. battery-saver wellness)

### 1.2 On-Device Processing and Inference

| Capability | Description |
|---|---|
| **Activity Classification** | Real-time classification: walking, running, cycling, swimming, sleeping, stationary |
| **Arrhythmia Detection** | On-device atrial fibrillation screening from PPG irregularity patterns |
| **Fall Detection** | Impact + post-impact immobility detection with emergency alert trigger |
| **Sleep Stage Classification** | Awake, light, deep, REM classification from HR variability + motion |
| **Heart Rate Variability (HRV)** | RMSSD, SDNN, and frequency-domain HRV from inter-beat intervals |
| **Motion Artifact Rejection** | Accelerometer-based signal quality assessment for PPG readings |
| **Wear Detection** | Capacitive/optical sensing to determine if device is on-wrist |

**Processing Requirements:**
- Execute TinyML inference within power budget (< 1 mW average for continuous models)
- Maintain inference latency < 500ms for critical alerts (fall, arrhythmia)
- Support model updates via over-the-air (OTA) firmware delivery
- Gracefully degrade features as battery level decreases below defined thresholds

### 1.3 Data Synchronization

| Capability | Description |
|---|---|
| **BLE Sync** | Background sync via BLE 5.x to paired smartphone companion app |
| **Batch Transfer** | Accumulated data transfer during sync windows (configurable: 5–60 min intervals) |
| **Priority Queuing** | Critical alerts (fall, arrhythmia) bypass batch queue for immediate transmission |
| **Store-and-Forward** | On-device circular buffer for 72+ hours of data during extended disconnection |
| **Conflict Resolution** | Server-side reconciliation when data arrives out of order or from multiple sync paths |
| **Platform Integration** | Write-through to HealthKit (iOS) and Health Connect (Android) during sync |
| **Direct-to-Cloud** | Optional Wi-Fi/LTE direct upload bypassing phone gateway for medical-grade devices |

**Sync Requirements:**
- Resume interrupted transfers without data loss or duplication
- Compress data before BLE transfer (target 3:1 compression ratio)
- Support simultaneous sync from multiple wearable devices per user
- Maintain sync session state across app backgrounding and phone reboots

### 1.4 Cloud Data Processing

| Capability | Description |
|---|---|
| **Data Normalization** | Standardize metrics across wearable manufacturers and sensor generations |
| **Quality Scoring** | Assign per-measurement quality scores based on motion, wear state, signal strength |
| **Derived Metrics** | Calculate composite metrics: resting HR trend, VO2 max estimate, respiratory rate |
| **Anomaly Detection** | Cloud-side ML models for subtle pattern detection beyond on-device capability |
| **Baseline Computation** | Per-user personalized baselines with rolling 14–30 day adaptive windows |
| **Population Analytics** | De-identified aggregate analytics for public health and research cohorts |

### 1.5 Health Alerts and Notifications

| Capability | Description |
|---|---|
| **Critical Alerts** | Immediate notification for detected arrhythmia, fall with no response, severe SpO2 drop |
| **Warning Alerts** | Elevated resting HR trend, abnormal HRV pattern, unusual skin temperature |
| **Wellness Insights** | Daily/weekly health summaries, sleep quality trends, activity goal achievements |
| **Emergency Escalation** | Automated emergency contact notification if user unresponsive after critical alert |
| **Physician Alerts** | Push notification to linked healthcare provider for clinically actionable events |
| **Alert Fatigue Management** | Intelligent suppression of repeat alerts within configurable cooldown windows |

### 1.6 Longitudinal Trend Analysis

| Capability | Description |
|---|---|
| **Health Score Computation** | Composite wellness score from cardiovascular, sleep, activity, and stress metrics |
| **Trend Detection** | Identify statistically significant changes in baseline health metrics over weeks/months |
| **Seasonal Adjustment** | Account for circadian, weekly, and seasonal patterns in physiological data |
| **Correlation Analysis** | Cross-metric correlation (e.g., sleep quality impact on resting HR) |
| **Predictive Risk Scoring** | Early warning scores for cardiovascular risk, sleep disorder indicators |
| **Comparative Analytics** | Age/sex/activity-adjusted percentile rankings (opt-in, de-identified) |

### 1.7 Clinical Integration

| Capability | Description |
|---|---|
| **Physician Dashboard** | Web-based clinical view with patient vital trends, alerts, and ECG strips |
| **FHIR Data Exchange** | Bidirectional EHR integration via FHIR R4 Observation, Patient, and Device resources |
| **Clinical Report Generation** | PDF/FHIR reports for ECG analysis, sleep studies, activity summaries |
| **Remote Patient Monitoring** | Continuous monitoring workflows for chronic disease management (CHF, COPD, diabetes) |
| **Care Plan Integration** | Treatment adherence tracking and medication reminder correlation |
| **Telehealth Handoff** | Context-rich handoff to telehealth sessions with recent vital trends pre-loaded |

### 1.8 User Data Management

| Capability | Description |
|---|---|
| **Data Export** | User-initiated export in standard formats (JSON, CSV, FHIR Bundle) |
| **Consent Management** | Granular consent for data sharing: research, physician access, population analytics |
| **Data Deletion** | GDPR/CCPA right-to-erasure with cryptographic verification of deletion |
| **Multi-Device Management** | Associate multiple wearables per user with device-specific data attribution |
| **Family/Dependent Management** | Guardian access to minor/dependent health data with appropriate access controls |
| **Data Portability** | Transfer data between platforms via HealthKit/Health Connect or FHIR export |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Metric | Target | Rationale |
|---|---|---|
| **On-device alert latency** | < 500ms | Fall detection and arrhythmia alerts must be near-instantaneous |
| **BLE sync throughput** | > 100 KB/s | Complete daily data sync within 30–60 seconds |
| **Cloud ingestion latency (p50)** | < 1s | Near-real-time dashboard updates for RPM scenarios |
| **Cloud ingestion latency (p99)** | < 5s | Acceptable worst-case for non-critical data |
| **Critical alert end-to-end (p99)** | < 10s | Device detection → cloud processing → physician notification |
| **Trend computation** | < 30s | Daily health score recalculation after new data sync |
| **FHIR query response** | < 500ms | Physician dashboard responsiveness |
| **ECG analysis pipeline** | < 60s | Cloud-based 12-lead-equivalent analysis from single-lead capture |

### 2.2 Availability and Reliability

| Metric | Target | Rationale |
|---|---|---|
| **Critical alert pipeline** | 99.99% | Missed arrhythmia/fall alerts have life-safety implications |
| **Data sync service** | 99.95% | Brief outages acceptable with on-device buffering |
| **Physician dashboard** | 99.95% | Clinical workflow dependency |
| **Trend analysis service** | 99.9% | Delayed insights acceptable for non-urgent analytics |
| **FHIR integration gateway** | 99.9% | EHR systems have their own retry mechanisms |
| **Data durability** | 99.999999% (8 nines) | PHI retention requirements; irreplaceable health data |
| **On-device data retention** | 72+ hours | Survivability during extended phone disconnection |

### 2.3 Scalability

| Dimension | Requirement |
|---|---|
| **Horizontal scaling** | Stateless ingestion and processing services scale with device count |
| **Data partitioning** | User-based partitioning for health records; time-based for telemetry |
| **Multi-region** | Data residency compliance; user data stored in regulatory-appropriate region |
| **Storage growth** | Time-series downsampling; hot (90 days), warm (1 year), cold (5 years) |
| **Device onboarding** | Support 1M+ new device activations per day during product launches |
| **Burst handling** | Handle 10x normal sync volume during morning sync peaks (6–9 AM local) |

### 2.4 Security

| Requirement | Standard |
|---|---|
| **PHI encryption at rest** | AES-256 with per-user encryption keys managed by HSM/KMS |
| **PHI encryption in transit** | TLS 1.3 for all cloud communication; BLE link-layer encryption |
| **Device authentication** | Mutual authentication with device-specific certificates or secure tokens |
| **API authentication** | OAuth 2.0 with PKCE for mobile apps; API keys + mTLS for FHIR integrations |
| **Access control** | RBAC + ABAC for physician access; user consent gates all data sharing |
| **Audit logging** | Immutable audit trail for all PHI access, modification, and deletion |
| **Data anonymization** | k-anonymity + differential privacy for population analytics |

---

## 3. Capacity Estimations

### 3.1 Sensor Data Volume Per Device

```
Heart Rate (PPG):
- Sampling: 25 Hz continuous, downsampled to 1 reading/sec on device
- Storage per reading: 12 bytes (timestamp + HR + confidence)
- Daily: 86,400 readings × 12 bytes = ~1 MB/day

SpO2:
- Sampling: 1 reading per 15 minutes (periodic) + on-demand
- Storage per reading: 16 bytes
- Daily: 96 periodic + ~5 on-demand = ~1.6 KB/day

ECG (user-initiated):
- Sampling: 512 Hz for 30 seconds per recording
- Storage per recording: 15,360 samples × 2 bytes = ~30 KB
- Average 1-2 recordings/day: ~45 KB/day

Accelerometer:
- Sampling: 50 Hz continuous, compressed to activity summaries
- Activity summary: 60 bytes per minute
- Daily: 1,440 summaries × 60 bytes = ~84 KB/day

Skin Temperature:
- Sampling: 1 reading per minute
- Storage per reading: 8 bytes
- Daily: 1,440 × 8 = ~11.5 KB/day

Sleep Data:
- Sleep stage classification every 30 seconds during sleep
- Storage per epoch: 20 bytes
- Daily (8 hours sleep): 960 epochs × 20 bytes = ~19 KB/day

Total per device per day: ~1.2 MB/day (compressed: ~400 KB/day)
```

### 3.2 Platform-Wide Data Volume

```
Assumptions:
- 100 million active wearable devices
- 60% sync daily (60M devices)
- Average 400 KB compressed data per sync

Daily ingestion:
- 60M devices × 400 KB = 24 TB/day compressed
- Uncompressed equivalent: ~72 TB/day

Monthly: ~720 TB compressed
Yearly: ~8.6 PB compressed
With indexes, metadata, derived metrics (2x): ~17 PB/year
```

### 3.3 Sync Traffic Patterns

```
Assumptions:
- 60M daily sync events
- 70% of syncs occur in two peaks: morning (6-9 AM) and evening (8-11 PM) local time
- Distributed across 24 time zones

Peak sync rate:
- 42M peak syncs / (3 hours × 24 time zones) = ~194K syncs/sec global peak
- Per-region peak (single time zone): ~583K syncs / 10,800 sec = ~54 syncs/sec
- Design target: 250K syncs/sec global (burst headroom)

BLE sync duration:
- Average payload: 400 KB at 100 KB/s = ~4 seconds
- With connection overhead: ~8 seconds per sync session
```

### 3.4 Alert Volume

```
Assumptions:
- 100M active devices
- Critical alert rate: 0.01% of users/day (fall, arrhythmia)
- Warning alert rate: 2% of users/day (elevated trends)
- Wellness notification rate: 80% of users/day (goals, summaries)

Daily alerts:
- Critical: 100M × 0.0001 = 10,000/day (~0.12/sec)
- Warning: 100M × 0.02 = 2,000,000/day (~23/sec)
- Wellness: 100M × 0.80 = 80,000,000/day (~926/sec)
- Total: ~82M notifications/day

Peak alert rate (morning health summary):
- 50M notifications in 3-hour morning window = ~4,600/sec
- Design target: 10,000 notifications/sec
```

### 3.5 Clinical Integration Volume

```
Assumptions:
- 5% of users linked to physician accounts (5M users)
- Average 1 FHIR data exchange per linked user per day
- Physician dashboard queries: 500K physicians × 20 queries/day

Daily FHIR volume:
- Outbound FHIR observations: 5M/day
- Physician dashboard queries: 10M queries/day
- Clinical report generations: 200K reports/day

Peak query rate:
- 70% of physician queries during clinic hours (8 AM - 5 PM)
- 7M queries / 32,400 sec = ~216 queries/sec
- Design target: 500 FHIR queries/sec
```

### 3.6 Storage Projections

```
Per-user storage over time:
- Year 1: 400 KB/day × 365 = ~143 MB (compressed)
- Year 3: ~430 MB cumulative
- Year 5: ~715 MB cumulative (with downsampling of older data)

Platform-wide (100M users, 5-year retention):
- Hot tier (90 days): 100M × 36 MB = 3.6 PB
- Warm tier (1 year): 100M × 143 MB = 14.3 PB
- Cold tier (5 years): 100M × 350 MB = 35 PB (downsampled)
- Total: ~53 PB (with replication factor 3: ~159 PB raw)
```

---

## 4. Service Level Objectives (SLOs)

### 4.1 Tiered SLO Framework

| Tier | Service | Availability | Latency (p99) | Error Budget |
|---|---|---|---|---|
| **Tier 0** | Critical health alert pipeline | 99.99% | 10s end-to-end | 52.6 min/year |
| **Tier 0** | PHI data durability | 99.999999% | N/A | Zero data loss |
| **Tier 1** | Data sync ingestion | 99.95% | 5s | 4.38 hrs/year |
| **Tier 1** | Physician dashboard / RPM | 99.95% | 1s | 4.38 hrs/year |
| **Tier 1** | FHIR integration gateway | 99.95% | 2s | 4.38 hrs/year |
| **Tier 2** | Trend analysis and health scoring | 99.9% | 30s | 8.76 hrs/year |
| **Tier 2** | User-facing mobile app API | 99.9% | 500ms | 8.76 hrs/year |
| **Tier 3** | Population analytics | 99.5% | 5min | 43.8 hrs/year |
| **Tier 3** | Research data exports | 99.5% | 10min | 43.8 hrs/year |

### 4.2 Data Quality SLOs

| Metric | Target |
|---|---|
| **Heart rate accuracy** | ±3 BPM under stationary conditions; ±5 BPM during moderate activity |
| **SpO2 accuracy** | ±2% under stationary conditions (FDA 510(k) requirement) |
| **ECG signal quality** | > 90% of recordings meet diagnostic-grade quality thresholds |
| **Data completeness** | > 99% of expected hourly summaries available within 4 hours of capture |
| **Alert precision** | > 95% precision for arrhythmia alerts (< 5% false positive rate) |
| **Alert recall** | > 98% recall for critical events (fall, sustained arrhythmia) |
| **Sync data integrity** | 100% of synced data verified via checksum; zero silent data corruption |

### 4.3 SLA Commitments (Contractual)

| Commitment | Target | Penalty Trigger |
|---|---|---|
| **Platform uptime** | 99.95% monthly | Credit 10% of monthly fees per 0.05% below |
| **Alert delivery latency** | < 30s p99 monthly | Credit 5% if monthly p99 exceeds target |
| **Data retention** | Per regulatory and user agreement | Immediate escalation if data loss detected |
| **FHIR API availability** | 99.9% monthly | Partner SLA credits if breached |
| **Data deletion compliance** | < 30 days from request | Regulatory escalation if deadline missed |

---

## 5. Constraint Analysis

### 5.1 Regulatory Constraints

| Constraint | Impact |
|---|---|
| **HIPAA (US)** | PHI must be encrypted at rest and in transit; BAA required with all cloud providers; minimum necessary access principle |
| **GDPR (EU)** | Explicit consent for health data processing; data portability; right to erasure; data residency requirements |
| **FDA SaMD (US)** | Clinical features (ECG AFib detection, SpO2 monitoring) require 510(k) or De Novo classification; ongoing post-market surveillance |
| **CE/MDR (EU)** | Medical device regulation compliance for clinical-grade features sold in European markets |
| **CCPA (California)** | Consumer rights for health data access, deletion, and opt-out of data sale |
| **PIPEDA (Canada)** | Consent-based health data collection; breach notification requirements |
| **Data Retention** | Varies by jurisdiction: HIPAA 6 years, GDPR purpose-limited, state laws may require longer |

### 5.2 Technical Constraints

| Constraint | Impact |
|---|---|
| **Wearable battery capacity** | 200–500 mAh typical; limits sensing frequency, BLE transmission, and on-device compute |
| **BLE bandwidth** | BLE 5.x theoretical max ~2 Mbps; practical throughput 100–400 KB/s |
| **On-device memory** | 256 KB–2 MB RAM on wearable MCU; limits model size for TinyML inference |
| **Sensor accuracy under motion** | PPG accuracy degrades significantly during movement; requires motion-artifact rejection |
| **Phone OS restrictions** | iOS/Android background execution limits constrain sync frequency and processing |
| **Wearable diversity** | 100+ wearable devices with different sensor sets, sampling rates, and data formats |
| **User compliance** | Users may not wear devices consistently; gaps in data must be handled gracefully |

### 5.3 Business Constraints

| Constraint | Impact |
|---|---|
| **Time-to-market** | Consumer wearable product cycles are 12–18 months; platform must support rapid feature iteration |
| **Hardware cost** | BOM cost pressure limits sensor selection and compute capability per device |
| **Clinical validation** | FDA clearance requires clinical trials (6–18 months); gates clinical feature launch timing |
| **Insurance reimbursement** | RPM reimbursement codes (CPT 99453-99458) require specific data capture and reporting formats |
| **User experience** | Battery life and comfort directly impact daily wear compliance; cannot sacrifice UX for data quality |

---

*Next: [High-Level Design →](./02-high-level-design.md)*
