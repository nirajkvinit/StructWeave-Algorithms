# Requirements & Estimations — Biometric Travel Platform

## 1. Functional Requirements

### 1.1 Passenger Enrollment

| Capability | Description |
|---|---|
| **Facial Capture** | High-resolution facial image capture via kiosk, mobile app, or staffed counter with ICAO-compliant pose and lighting |
| **Document Verification** | Passport/ID MRZ scanning, NFC chip reading (e-passport), and optical character recognition |
| **Identity Proofing** | Cross-verification of facial image against document photo (1:1 match) with liveness detection |
| **Template Extraction** | Generate compact facial feature vector (template) from captured image using deep learning model |
| **Credential Issuance** | Issue W3C Verifiable Credential binding facial template hash to travel document, signed by enrollment authority |
| **Wallet Provisioning** | Store biometric template and verifiable credential in passenger's mobile wallet (secure enclave) |
| **Aadhaar Integration** | For domestic travelers: verify identity via Aadhaar e-KYC with biometric authentication (fingerprint or iris as fallback) |
| **Consent Capture** | Record explicit opt-in consent with granular per-touchpoint permissions, revocable at any time |

**Key Operations:**
- Enroll passenger in under 90 seconds (kiosk) or 60 seconds (mobile pre-enrollment)
- Verify document authenticity against ICAO 9303 standards
- Generate and store biometric template with encryption key held by passenger
- Issue verifiable credential anchored to permissioned blockchain
- Support re-enrollment for template refresh (aging, appearance change)

### 1.2 Biometric Matching at Touchpoints

| Capability | Description |
|---|---|
| **1:1 Verification** | Compare live capture against enrolled template for identity confirmation |
| **1:N Identification** | Match live capture against flight manifest gallery (500–5,000 faces) for gate-based identification |
| **Liveness Detection** | Active and passive anti-spoofing: detect printed photos, screen replays, 3D masks, deepfakes |
| **Quality Assessment** | Real-time image quality scoring (ISO/IEC 29794-5) with re-capture prompts for poor-quality images |
| **Multi-Angle Tolerance** | Accept facial matches with up to +/-15 degree yaw and +/-10 degree pitch variation |
| **Demographic Fairness** | Equitable match accuracy across age, gender, and ethnicity groups (max 2% accuracy variance) |
| **Occlusion Handling** | Handle partial occlusions: glasses, headwear (religious accommodations), surgical masks (periocular matching) |

**Processing Requirements:**
- Complete 1:1 match in under 500ms including image capture and liveness check
- Complete 1:N match against 5,000-face gallery in under 1.5 seconds
- Maintain False Accept Rate (FAR) below 0.001% at all touchpoints
- Achieve True Accept Rate (TAR) above 99.5% under operational conditions
- Support both on-device matching (wallet-initiated) and server-side matching (gallery-based)

### 1.3 Credential Verification

| Capability | Description |
|---|---|
| **Digital Travel Credential (DTC)** | Verify ICAO Digital Travel Credentials stored in passenger wallets |
| **Verifiable Credential Validation** | Verify W3C VC signatures, check issuer trust chains, validate credential schemas |
| **Revocation Checking** | Real-time revocation status lookup against distributed revocation registry |
| **Selective Disclosure** | Support zero-knowledge proofs for age verification, nationality confirmation without revealing full document |
| **Boarding Pass Binding** | Cryptographically bind biometric enrollment to electronic boarding pass |
| **Cross-Airline Resolution** | Resolve passenger identity across airline boundaries for connecting flights |

**Key Operations:**
- Verify credential chain in under 200ms
- Check revocation status with 30-second staleness tolerance
- Support offline credential verification using cached issuer public keys
- Validate credential expiry, scope, and binding to biometric template

### 1.4 Journey Orchestration

| Capability | Description |
|---|---|
| **Touchpoint Sequencing** | Track passenger progress through enrollment -> check-in -> bag drop -> security -> immigration -> lounge -> boarding |
| **Status Propagation** | Propagate clearance status across touchpoints (e.g., security-cleared enables boarding gate access) |
| **Exception Handling** | Route passengers to manual processing on biometric failure, credential issues, or watchlist hits |
| **Queue Management** | Direct passengers to least-congested touchpoint lane based on real-time queue depth |
| **Flight Association** | Associate passenger biometric session with specific flight for gallery pre-staging |
| **Dwell Time Tracking** | Monitor time between touchpoints for passenger flow optimization and "last call" alerts |

### 1.5 Gallery Management

| Capability | Description |
|---|---|
| **Gallery Construction** | Build per-flight facial galleries from enrolled passenger templates for 1:N matching at gates |
| **Gallery Distribution** | Pre-stage flight galleries to boarding gate edge nodes 60-90 minutes before departure |
| **Gallery Updates** | Incrementally update galleries for late enrollments, gate changes, and rebookings |
| **Gallery Lifecycle** | Auto-purge gallery within 30 minutes of flight departure |
| **Multi-Gallery Support** | Support concurrent galleries at shared gates (back-to-back flights) |

### 1.6 Airport Integration

| Capability | Description |
|---|---|
| **CUPPS Integration** | Interface with Common Use Passenger Processing Systems for check-in and gate operations |
| **CUSS Integration** | Embed biometric enrollment in Common Use Self-Service kiosks |
| **AODB Integration** | Consume Airport Operational Database feeds for flight status, gate assignments, schedule changes |
| **BRS Integration** | Connect with Baggage Reconciliation Systems for biometric-based bag drop |
| **Border Control** | Interface with immigration systems for pre-clearance and automated border control (ABC) gates |
| **Airline DCS** | Bidirectional integration with airline Departure Control Systems for passenger status updates |

### 1.7 Consent and Privacy Management

| Capability | Description |
|---|---|
| **Granular Consent** | Per-touchpoint consent selection (e.g., opt into biometric bag drop but not biometric boarding) |
| **Consent Revocation** | Immediate revocation with cascading template deletion across all touchpoints |
| **Data Subject Rights** | Support GDPR Article 15 (access), Article 17 (erasure), Article 20 (portability) requests |
| **Consent Audit Trail** | Immutable record of all consent actions with timestamps |
| **Privacy Dashboard** | Passenger-facing view of where their biometric data is stored and when it will be deleted |
| **Auto-Deletion** | Automatic purge of all biometric data within 24 hours of flight departure |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Metric | Target | Rationale |
|---|---|---|
| **1:1 match latency (p50)** | < 300ms | Seamless touchpoint experience |
| **1:1 match latency (p99)** | < 800ms | Acceptable worst-case before passenger perceives delay |
| **1:N match latency (5K gallery, p50)** | < 800ms | Gate throughput requirement |
| **1:N match latency (5K gallery, p99)** | < 2s | Must beat manual document check time |
| **Liveness detection latency** | < 200ms | Runs in parallel with face capture |
| **Credential verification latency** | < 200ms | Cryptographic verification is compute-bound |
| **Enrollment end-to-end** | < 90s (kiosk), < 60s (mobile) | Passenger tolerance threshold |
| **Touchpoint throughput** | 20-30 passengers/minute per lane | 2.5x improvement over manual processing |
| **Gallery pre-staging** | Complete within 10 minutes for 5K passengers | Ready before gate opens |

### 2.2 Availability and Reliability

| Metric | Target | Rationale |
|---|---|---|
| **Biometric matching service** | 99.99% | Touchpoint downtime directly blocks passenger flow |
| **Enrollment service** | 99.95% | Can fall back to counter enrollment |
| **Credential verification** | 99.99% | Required for every touchpoint interaction |
| **Journey orchestration** | 99.95% | Touchpoints can operate independently in degraded mode |
| **Gallery distribution** | 99.9% | Cached galleries provide resilience |
| **Manual fallback availability** | 100% | Regulatory requirement: non-biometric path must always exist |
| **Data durability (consent records)** | 99.9999999% (9 nines) | Legal audit trail requirement |

### 2.3 Scalability

| Dimension | Requirement |
|---|---|
| **Horizontal scaling** | Add touchpoint edge nodes without platform reconfiguration |
| **Multi-airport federation** | Support 50+ airports with centralized identity and local processing |
| **Peak handling** | Handle 3x normal throughput during morning/evening flight banks |
| **Gallery scaling** | Support 1:N matching against galleries up to 10,000 faces |
| **Concurrent enrollments** | 500+ simultaneous enrollments across all airport kiosks |
| **Seasonal scaling** | Auto-scale cloud services for holiday travel peaks (2-3x baseline) |

### 2.4 Security

| Requirement | Standard |
|---|---|
| **Biometric template encryption** | AES-256-GCM with passenger-controlled keys |
| **Template transmission** | End-to-end encrypted, no intermediate storage |
| **Touchpoint authentication** | Mutual TLS with hardware-bound certificates |
| **Anti-spoofing** | ISO/IEC 30107-3 Level 2 compliant presentation attack detection |
| **Audit logging** | Tamper-evident, cryptographically chained logs for all matching decisions |
| **Key management** | HSM-backed key storage for credential signing and template encryption |
| **Watchlist screening** | Secure enclave processing for no-fly and wanted person checks |

---

## 3. Capacity Estimations

### 3.1 Biometric Matching Volume

```
Assumptions:
- Large international hub: 200,000 passengers/day
- 70% biometric adoption rate = 140,000 biometric passengers/day
- Average 6 touchpoints per passenger journey
- Peak hour factor: 15% of daily traffic in busiest hour

Daily biometric verifications:
- 140,000 passengers x 6 touchpoints = 840,000 verifications/day

Peak hour:
- 840,000 x 0.15 / 3,600 sec = ~35 verifications/sec

Peak minute (burst):
- Up to 100 verifications/sec during flight bank peaks

Design target: 200 verifications/sec (growth + burst headroom)
```

### 3.2 Enrollment Volume

```
Assumptions:
- 70% enroll via mobile app (pre-arrival)
- 30% enroll at airport kiosks
- Mobile enrollment: spread across 24 hours before flight
- Kiosk enrollment: concentrated in 2-hour pre-departure window

Kiosk enrollments per day:
- 140,000 x 0.30 = 42,000 kiosk enrollments/day

Peak kiosk enrollment rate:
- 42,000 x 0.25 (peak quarter) / 3,600 = ~3 enrollments/sec

Kiosk capacity required:
- At 90 sec/enrollment: 3 enrollments/sec x 90 sec = 270 concurrent kiosks
- With 50% utilization: ~540 kiosks deployed (matches large hub)

Mobile enrollments per day:
- 140,000 x 0.70 = 98,000 mobile enrollments/day
- Spread over 24 hours: ~1.1 enrollments/sec (manageable)
```

### 3.3 Gallery Management Volume

```
Assumptions:
- 600 flights/day from large hub
- Average 250 passengers per flight
- Gallery built 90 minutes before departure, purged 30 minutes after
- Gallery active window: ~2 hours per flight
- Average concurrent active galleries: 600 x (2/24) = 50 galleries

Gallery storage:
- Template size: 5 KB average
- Gallery per flight: 250 passengers x 5 KB = 1.25 MB
- Total active gallery storage: 50 galleries x 1.25 MB = 62.5 MB
- Easily fits in edge node memory

Gallery distribution bandwidth:
- 600 galleries/day x 1.25 MB = 750 MB/day of gallery data
- Peak: 10 galleries built in 10 minutes = 12.5 MB in 10 min

Gallery update frequency:
- Late enrollments: ~5% of passengers enroll within 60 min of departure
- ~12.5 passengers x 5 KB = 62.5 KB incremental update per flight
```

### 3.4 Biometric Template Storage

```
Per-passenger storage:
- Facial template: 5 KB (encrypted)
- Enrollment metadata: 1 KB
- Consent record: 0.5 KB
- Credential: 2 KB
- Journey events (6 touchpoints): 6 x 0.5 KB = 3 KB
Total per passenger: ~11.5 KB

Daily storage (hot):
- 140,000 passengers x 11.5 KB = 1.6 GB/day
- Templates auto-deleted within 24 hours = ~3.2 GB max hot storage

Consent and audit records (permanent):
- 140,000 passengers x 1 KB = 140 MB/day
- Annual: ~51 GB/year
- 7-year retention: ~357 GB (manageable)

Journey analytics (warm, 90-day retention):
- 840,000 events x 0.5 KB = 420 MB/day
- 90-day window: ~38 GB
```

### 3.5 Compute Requirements

```
Biometric matching compute:
- 1:1 match: ~50ms GPU inference per comparison
- 1:N match (5K gallery): ~200ms GPU inference (batch comparison)
- Liveness detection: ~30ms GPU inference
- Total per touchpoint interaction: ~80ms GPU (1:1) or ~230ms GPU (1:N)

Peak GPU requirement:
- 200 verifications/sec x 80ms (1:1 dominant) = 16 GPU-seconds/sec
- Need 16+ GPU inference units at peak (plus 50% headroom = 24 units)
- Distributed across 200-600 touchpoint edge nodes: 0.04-0.12 GPU per node
- Each edge node has a dedicated inference accelerator (NPU/TPU)

Edge node compute per touchpoint:
- Camera: 4K capture, face detection, quality assessment
- Inference: Template extraction + 1:1 match + liveness = ~80ms total
- Network: Encrypted result transmission to orchestrator
- Storage: Temporary gallery cache, audit log buffer
```

---

## 4. Service Level Objectives (SLOs)

### 4.1 Tiered SLO Framework

| Tier | Service | Availability | Latency (p99) | Error Budget |
|---|---|---|---|---|
| **Tier 0** | Biometric matching (1:1) | 99.99% | 800ms | 52.6 min/year |
| **Tier 0** | Credential verification | 99.99% | 300ms | 52.6 min/year |
| **Tier 0** | Manual fallback path | 100% | N/A | 0 min/year |
| **Tier 1** | 1:N gallery matching | 99.95% | 2s | 4.38 hrs/year |
| **Tier 1** | Journey orchestration | 99.95% | 500ms | 4.38 hrs/year |
| **Tier 1** | Enrollment service | 99.95% | 90s e2e | 4.38 hrs/year |
| **Tier 2** | Gallery distribution | 99.9% | 10 min | 8.76 hrs/year |
| **Tier 2** | Analytics and flow optimization | 99.9% | 5s | 8.76 hrs/year |
| **Tier 3** | Consent dashboard | 99.5% | 3s | 43.8 hrs/year |

### 4.2 Biometric Accuracy SLOs

| Metric | Target |
|---|---|
| **True Accept Rate (TAR)** | > 99.5% at FAR = 0.001% (1:1 verification) |
| **False Accept Rate (FAR)** | < 0.001% (1 in 100,000) |
| **False Reject Rate (FRR)** | < 3% (fallback to manual processing) |
| **Liveness detection accuracy** | > 99.8% spoof detection rate |
| **Demographic equity** | Max 2% TAR variance across demographic groups |
| **Image quality acceptance** | > 90% of captures meet quality threshold on first attempt |
| **1:N rank-1 accuracy** | > 99.9% correct identification in 5K gallery |

### 4.3 Operational SLOs

| Metric | Target |
|---|---|
| **Passenger throughput per lane** | > 20 passengers/minute (biometric), > 8/min (manual fallback) |
| **Average dwell time reduction** | 25-35% compared to non-biometric processing |
| **Template auto-deletion compliance** | 100% deleted within 24 hours of flight departure |
| **Consent revocation propagation** | < 5 minutes to all touchpoints |
| **Gallery pre-staging completion** | 100% complete 60 minutes before scheduled departure |
| **Enrollment success rate** | > 95% on first attempt (kiosk), > 90% (mobile) |

---

## 5. Constraint Analysis

### 5.1 Regulatory Constraints

| Constraint | Impact |
|---|---|
| **GDPR Article 9** | Biometric data is "special category" — requires explicit consent, DPIA, legitimate purpose |
| **India's DPDP Act 2023** | Restricts biometric processing; requires data fiduciary registration; mandates purpose limitation |
| **EDPB Opinion 11/2024** | Only on-device or passenger-key-encrypted storage is GDPR-compliant for airport biometrics |
| **ICAO 9303** | Travel document standards; DTC specification for digital passports |
| **IATA Recommended Practice 1740c** | One ID implementation standards for airline-airport interoperability |
| **ISO/IEC 30107-3** | Presentation attack detection (anti-spoofing) certification requirements |
| **National watchlist screening** | Must interface with no-fly lists without exposing biometric templates to screening authorities |
| **Non-discrimination requirements** | Must demonstrate equitable accuracy across demographic groups; bias audit obligations |

### 5.2 Technical Constraints

| Constraint | Impact |
|---|---|
| **Touchpoint hardware diversity** | Multiple camera vendors, lighting conditions, and installation angles across terminals |
| **CUPPS/CUSS platform limitations** | Shared terminal infrastructure limits hardware customization and GPU availability |
| **Ambient lighting variability** | Natural lighting changes throughout day affect facial capture quality |
| **Passenger appearance variation** | Aging, cosmetic changes, accessories, and medical conditions affect match accuracy |
| **Network segmentation** | Airport networks enforce strict segmentation between airline, airport, and government zones |
| **Edge compute constraints** | Touchpoint nodes have limited GPU/NPU capacity; must balance accuracy vs. inference speed |
| **Template interoperability** | Different facial recognition vendors produce incompatible templates; vendor lock-in risk |
| **Blockchain throughput** | Permissioned ledger must handle credential issuance without becoming a bottleneck |

---

*Next: [High-Level Design ->](./02-high-level-design.md)*
