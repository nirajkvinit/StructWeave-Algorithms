# Requirements & Estimations — Telemedicine Platform

---

## 1. Functional Requirements

### 1.1 Patient Registration and Profile Management

- Patients create accounts with identity verification (government ID, insurance card scan)
- Multi-factor authentication with biometric option on mobile devices
- Insurance eligibility verification in real-time via payer integration
- Dependent profile management (parents managing children's accounts)
- Medical history intake forms with structured data capture
- Preferred pharmacy, provider, and language settings
- Consent management dashboard with granular PHI sharing controls

### 1.2 Provider Onboarding and Credentialing

- Credential verification against state medical boards and NPI registry
- Specialty tagging, sub-specialty classification, and procedure capability mapping
- License jurisdiction tracking with multi-state practice support
- Availability calendar with recurring schedule templates and exception handling
- Provider preference configuration (visit types, patient demographics, consultation duration)
- Peer review and quality scoring integration
- Continuing medical education (CME) tracking

### 1.3 Appointment Scheduling and Management

- Real-time provider availability search with specialty and location filtering
- AI-driven provider-patient matching based on condition, language, insurance, and urgency
- Appointment types: on-demand (walk-in), scheduled, follow-up, second opinion, group therapy
- Dynamic slot sizing based on visit type and provider historical patterns
- Waitlist management with automatic slot filling on cancellations
- No-show prediction with proactive overbooking and reminder escalation
- Multi-channel reminders (push notification, SMS, email) with confirmation tracking
- Rescheduling and cancellation with configurable cancellation policies
- Time zone-aware scheduling with daylight saving time handling
- Recurring appointment series for chronic care management

### 1.4 Video Consultation

- One-to-one video consultation with HD quality (720p minimum, 1080p preferred)
- Multi-party consultation (patient + primary provider + specialist + interpreter)
- Virtual waiting room with estimated wait time and queue position
- In-session screen sharing for reviewing lab results and imaging
- In-session secure chat and file sharing (images, documents)
- Session recording with patient consent (stored encrypted)
- Adaptive bitrate streaming based on network conditions
- Audio-only fallback with seamless upgrade to video when bandwidth recovers
- Provider-initiated patient handoff to another provider mid-session
- Interpreter service integration for language accessibility
- Background blur and virtual backgrounds for patient privacy

### 1.5 Clinical Documentation and E-Prescribe

- Structured encounter notes with template-based documentation
- ICD-10/ICD-11 diagnosis coding with search and auto-suggest
- CPT code selection for billing integration
- Electronic prescribing (e-prescribe) with formulary checking
- EPCS (Electronic Prescribing for Controlled Substances) with two-factor authentication
- Lab order placement with results routing back to the encounter
- Referral generation with specialist availability lookup
- After-visit summary generation and patient delivery
- Clinical decision support alerts (drug interactions, allergy checks, preventive care gaps)

### 1.6 Remote Patient Monitoring (RPM)

- Device pairing and onboarding for supported wearables and medical devices
- Continuous vital sign ingestion: heart rate, blood pressure, SpO2, glucose, temperature, weight
- Configurable alert thresholds per patient per metric with provider override
- Trend analysis with baseline deviation detection
- Automated escalation workflows: alert → secure message → urgent appointment → emergency
- Daily/weekly RPM summary reports for provider review
- Patient-facing dashboard with historical trends and goal tracking
- Batch data upload for devices without continuous connectivity

### 1.7 Billing and Insurance Integration

- Real-time insurance eligibility and benefits verification
- Automated CPT code generation based on encounter documentation
- Claim submission to clearinghouses via EDI 837 transactions
- Copay and deductible calculation with patient cost transparency
- Self-pay and subscription pricing model support
- Superbill generation for out-of-network reimbursement
- Payment processing with PCI-compliant tokenization
- Explanation of Benefits (EOB) tracking and patient billing statements

### 1.8 EHR Interoperability

- HL7 FHIR R4 API for bidirectional clinical data exchange
- CDA document generation and ingestion (Continuity of Care Documents)
- ADT (Admit/Discharge/Transfer) event subscription for care coordination
- Immunization registry reporting
- Clinical document query and retrieval from external health information exchanges
- Patient record matching and deduplication across systems
- Bulk data export for population health analytics

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Metric | Target | Rationale |
|---|---|---|
| Video end-to-end latency | < 200ms | Clinical interaction requires real-time responsiveness |
| Video join time | < 3 seconds | Patient and provider should connect without delay |
| API response time (p50) | < 100ms | Responsive UI for scheduling and clinical workflows |
| API response time (p99) | < 500ms | Tail latency must not degrade provider experience |
| Scheduling search results | < 300ms | Real-time availability display during booking |
| RPM data ingestion latency | < 5 seconds | Near-real-time vital sign visibility for monitoring |
| E-prescribe transmission | < 10 seconds | Pharmacy should receive prescription promptly |
| EHR sync latency | < 30 seconds | Clinical data should propagate within encounter context |

### 2.2 Availability

| Metric | Target | Rationale |
|---|---|---|
| Overall platform availability | 99.95% | ~4.4 hours downtime/year; healthcare is critical |
| Video infrastructure availability | 99.99% | Active consultations must not drop |
| Scheduling service availability | 99.95% | Booking should rarely be unavailable |
| RPM data pipeline availability | 99.9% | Brief delays acceptable; critical alerts have redundant paths |
| EHR integration availability | 99.9% | Async processing buffers brief outages |

### 2.3 Consistency

| Requirement | Model | Rationale |
|---|---|---|
| Appointment booking | Strong consistency | Double-booking prevention requires serializable reads |
| Patient medical records | Strong consistency | Clinical data must reflect latest updates immediately |
| Video session state | Eventual consistency | Session metadata can propagate with brief delay |
| RPM data ingestion | Eventual consistency | Time-series data tolerates brief ordering delays |
| Billing transactions | Strong consistency | Financial accuracy requires ACID guarantees |
| Audit logs | Append-only, strongly consistent | Regulatory requirement for tamper-evident logging |

### 2.4 Scalability

| Dimension | Target | Growth Model |
|---|---|---|
| Registered patients | 50M → 200M | 40% YoY growth |
| Active providers | 200K → 800K | Expanding specialties and geographies |
| Daily video consultations | 1M → 5M | Seasonal peaks at 3x average |
| Concurrent video sessions | 100K → 500K | Peak hour = 10% of daily volume |
| RPM connected devices | 10M → 50M | Wearable adoption acceleration |
| RPM data points per day | 500M → 2B | Higher-frequency monitoring protocols |
| Scheduling transactions/sec | 5K → 25K | Proportional to patient growth |
| EHR FHIR transactions/day | 10M → 50M | Increasing interoperability mandates |

### 2.5 Security

| Requirement | Standard |
|---|---|
| Data encryption at rest | AES-256 with customer-managed keys for PHI |
| Data encryption in transit | TLS 1.3 for APIs, DTLS-SRTP for media streams |
| Authentication | OAuth 2.0 + PKCE with MFA enforcement for providers |
| Authorization | RBAC + ABAC with minimum necessary PHI access |
| Audit logging | Immutable, tamper-evident logs with 7-year retention |
| Penetration testing | Annual third-party assessment with quarterly internal scans |
| Vulnerability management | Critical patches within 24 hours, high within 7 days |

---

## 3. Capacity Estimations

### 3.1 Video Bandwidth and Media Server Capacity

```
Daily consultations: 1,000,000
Average duration: 15 minutes
Peak hour concentration: 10% of daily volume in 1 hour

Peak concurrent sessions:
  = 1,000,000 × 0.10 / 4 (sessions per hour at 15min avg)
  = 25,000 concurrent sessions

Bandwidth per session (bidirectional):
  Video (720p): 1.5 Mbps up + 1.5 Mbps down = 3 Mbps
  Audio: 64 Kbps up + 64 Kbps down = 128 Kbps
  Total per session: ~3.1 Mbps

Peak aggregate bandwidth:
  = 25,000 × 3.1 Mbps
  = 77.5 Gbps

SFU server capacity: ~500 sessions per server (mid-tier)
Peak SFU servers needed:
  = 25,000 / 500
  = 50 SFU servers (+ 50% headroom = 75 servers)

TURN relay traffic (10% of sessions need relay):
  = 2,500 sessions × 3.1 Mbps = 7.75 Gbps TURN bandwidth
```

### 3.2 Storage Estimation

```
Encounter records per day: 1,000,000
Average record size: 5 KB (structured data + notes)
Daily encounter storage: 1M × 5 KB = 5 GB/day

Session recordings (10% opted-in):
  = 100,000 recordings/day × 15 min × 1.5 Mbps
  = 100,000 × 15 × 60 × 1.5 / 8 MB
  = 16.875 TB/day

RPM data:
  = 500,000,000 data points/day × 100 bytes each
  = 50 GB/day (compressed ~10 GB/day)

Medical images (store-and-forward):
  = 50,000 images/day × 2 MB average
  = 100 GB/day

Audit logs:
  = 1,000,000,000 events/day × 500 bytes
  = 500 GB/day (compressed ~100 GB/day)

Total daily storage growth: ~17 TB/day
Annual storage: ~6.2 PB/year
With 3x replication: ~18.6 PB/year
```

### 3.3 API Traffic Estimation

```
Registered patients: 50,000,000
Daily active patients: 5,000,000 (10% DAU)
Daily active providers: 150,000

Patient API calls per session:
  Login + browse: 10 calls
  Schedule appointment: 5 calls
  Video session lifecycle: 15 calls
  Post-visit actions: 5 calls
  Total: 35 calls per patient visit

Provider API calls per shift:
  Dashboard loads: 50 calls
  Per consultation: 20 calls × 15 consultations
  Documentation: 30 calls
  Total: 380 calls per provider per day

Daily API calls:
  Patient: 1,000,000 visits × 35 = 35M
  Provider: 150,000 × 380 = 57M
  RPM device: 10M devices × 24 heartbeats = 240M
  Internal service-to-service: 500M
  Total: ~832M API calls/day

Peak QPS:
  = 832M / 86,400 × 3 (peak multiplier)
  = ~28,900 QPS
```

### 3.4 Scheduling Engine Throughput

```
Daily appointments booked: 1,200,000
  (includes reschedules and cancellations)

Peak booking rate (10 AM local time across time zones):
  = 1,200,000 × 0.15 / 3,600
  = 50 bookings/second

Availability queries (10x booking rate):
  = 500 queries/second peak

Scheduling engine must handle:
  - 500 availability lookups/second
  - 50 atomic booking transactions/second
  - 200 reminder dispatches/second
  - Real-time conflict detection across overlapping requests
```

### 3.5 EHR Integration Volume

```
FHIR transactions per consultation:
  Patient resource lookup: 1
  Encounter creation: 1
  Condition/Observation writes: 3
  MedicationRequest: 1
  DiagnosticReport: 0.5
  DocumentReference: 1
  Total: ~7.5 FHIR transactions per consultation

Daily FHIR volume:
  = 1,000,000 consultations × 7.5
  = 7,500,000 transactions/day

Bulk export (nightly):
  Population health: 50M patient summaries
  Throughput: ~580 records/second sustained over 24 hours
```

---

## 4. Service Level Objectives (SLOs)

### Tiered SLO Framework

| Tier | Services | Availability | Latency (p99) | Error Rate |
|---|---|---|---|---|
| **Tier 0 — Critical** | Video signaling, media relay, authentication | 99.99% | < 200ms | < 0.01% |
| **Tier 1 — Core** | Scheduling, e-prescribe, encounter service | 99.95% | < 500ms | < 0.1% |
| **Tier 2 — Important** | RPM ingestion, EHR sync, billing | 99.9% | < 1s | < 0.5% |
| **Tier 3 — Standard** | Analytics, reporting, bulk export | 99.5% | < 5s | < 1% |

### Video Quality SLOs

| Metric | Target | Measurement |
|---|---|---|
| Mean Opinion Score (MOS) | ≥ 3.5 / 5.0 | Automated quality estimation per session |
| Video freeze rate | < 1% of session duration | Client-side metric reporting |
| Audio packet loss | < 0.5% | WebRTC stats API |
| Connection success rate | > 99.5% | Signaling server metrics |
| Reconnection time | < 5 seconds | Client-measured from disconnect to media resume |

---

## 5. Constraint Analysis

### Regulatory Constraints

| Constraint | Impact |
|---|---|
| **HIPAA Privacy Rule** | PHI access restricted to minimum necessary; patient consent required for sharing |
| **HIPAA Security Rule** | Technical safeguards: encryption, access controls, audit logging, integrity controls |
| **HITECH Act** | Breach notification within 60 days; penalties up to $1.5M per violation category |
| **State Telehealth Parity Laws** | 40+ US states require insurers to cover telehealth at parity with in-person; affects billing |
| **Ryan Haight Act** | Controlled substance prescribing via telemedicine requires DEA-registered practitioner with prior exam |
| **FDA Device Regulations** | RPM devices used for diagnosis may require FDA clearance; affects device integration strategy |
| **21st Century Cures Act** | Information blocking prohibition; must support patient data access and interoperability |

### Technical Constraints

| Constraint | Impact |
|---|---|
| **WebRTC browser support** | Must support latest two versions of major browsers; Safari WebRTC quirks require workarounds |
| **Mobile network variability** | 30% of patients on cellular; adaptive bitrate and audio fallback are essential |
| **SFU single-server limit** | ~500 concurrent sessions per SFU instance; requires cascading SFU architecture |
| **TURN server bandwidth cost** | 10% of sessions require TURN relay; significant bandwidth cost at scale |
| **HL7 FHIR version fragmentation** | External EHRs may support FHIR STU3 or DSTU2; requires version adaptation layer |
| **Prescription network latency** | Surescripts network has variable response times (2-15s); requires async submission with status polling |
| **Data residency** | Some jurisdictions require health data to remain within geographic boundaries |

---

*Previous: [Index ←](./00-index.md) | Next: [High-Level Design →](./02-high-level-design.md)*
