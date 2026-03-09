# Security & Compliance — Smart Home Platform

## 1. Threat Model

### 1.1 Threat Actors

| Actor | Motivation | Capability | Primary Targets |
|---|---|---|---|
| **Remote attackers** | Home surveillance, ransomware, botnet recruitment | Network scanning, exploit kits, credential stuffing | Cameras, locks, hub cloud API |
| **Local network attackers** | Break-in facilitation, stalking | Physical proximity, ARP spoofing, Wi-Fi sniffing | Door locks, security cameras, garage doors |
| **Malicious firmware** | Supply chain attack, data exfiltration | Embedded in device firmware from compromised manufacturer | Any device with network access |
| **Insider threats** | Data harvesting, unauthorized surveillance | Employee access to cloud infrastructure | User data, device telemetry, camera feeds |
| **Disgruntled ex-residents** | Harassment, unauthorized access | Previous credentials, physical access to hub | All devices, especially locks and cameras |
| **Botnet operators** | DDoS amplification, crypto mining | Automated vulnerability scanning at scale | Low-security IoT devices, hub processing power |

### 1.2 STRIDE Threat Analysis

| Threat | Component | Attack Vector | Mitigation |
|---|---|---|---|
| **Spoofing** | MQTT Broker | Forged device identity | Mutual TLS with per-device certificates |
| **Tampering** | Hub firmware | Modified firmware image | Signed firmware with secure boot chain |
| **Repudiation** | Command log | Deny sending unlock command | Cryptographically signed command audit trail |
| **Info Disclosure** | Camera streams | Intercepted video feed | End-to-end encryption with per-home keys |
| **Denial of Service** | Cloud API | Volumetric attack on APIs | Rate limiting, DDoS mitigation, auto-scaling |
| **Elevation of Privilege** | User access | Guest escalates to owner | Role-based access with permission boundaries |

---

## 2. Security Architecture

### 2.1 Defense in Depth

```
Layer 1: Physical Security
  ├── Hub secure boot chain (verified firmware before execution)
  ├── Tamper detection on security-critical devices
  ├── Hardware security module on hub for key storage
  └── Protocol-level encryption (Zigbee AES-128, Z-Wave S2)

Layer 2: Network Security
  ├── TLS 1.3 for all cloud connections
  ├── Mutual TLS (mTLS) for hub-to-cloud authentication
  ├── Network segmentation (IoT VLAN recommendation)
  ├── Encrypted Zigbee/Z-Wave mesh networks
  └── Matter CASE session encryption

Layer 3: Transport Security (MQTT)
  ├── TLS 1.3 for MQTT connections
  ├── Per-device X.509 certificates for MQTT authentication
  ├── Topic-level access control (devices can only publish to own topics)
  └── Message payload encryption for sensitive data

Layer 4: Application Security
  ├── OAuth 2.0 + PKCE for mobile app authentication
  ├── Home-scoped authorization (users see only their homes)
  ├── Input validation on all API endpoints
  ├── Rate limiting per user, per home, per API
  └── OWASP Top 10 protections

Layer 5: Data Security
  ├── AES-256 encryption at rest for all stored data
  ├── Per-home encryption keys (key-per-tenant model)
  ├── End-to-end encryption for camera/microphone data
  ├── PII masking in logs and analytics
  └── Secure deletion on account/device removal

Layer 6: Operational Security
  ├── Principle of least privilege for all service accounts
  ├── No direct infrastructure access (all operations via APIs)
  ├── Secret rotation (certificates, keys, tokens)
  ├── Dependency vulnerability scanning (daily)
  └── Penetration testing (quarterly)
```

### 2.2 Device Authentication

**Hub Authentication (mTLS):**

```
Hub Certificate Lifecycle:

Manufacturing:
  1. Hub generates key pair in hardware security module (HSM)
  2. Certificate signing request (CSR) sent to PKI during factory provisioning
  3. Device certificate signed by platform CA
  4. Certificate chain stored in hub's secure storage
  5. Certificate includes: device_id, manufacturing_date, hardware_model

Runtime:
  1. Hub presents client certificate during TLS handshake
  2. Cloud validates certificate chain against platform CA
  3. Cloud extracts device_id from certificate subject
  4. Cloud verifies device_id is registered and not revoked
  5. MQTT session established with device_id-scoped permissions

Certificate Renewal:
  - Certificates valid for 2 years
  - Automatic renewal initiated 90 days before expiry
  - New certificate provisioned via secure channel
  - Old certificate remains valid during transition period
  - If renewal fails: hub operates with degraded capabilities (local only)
```

**Device Authentication (Protocol Level):**

```
Zigbee Security:
  - Network key distributed during join (AES-128)
  - Trust Center link key for device-specific encryption
  - Install Code-based joining for secure pairing

Z-Wave Security (S2):
  - Authenticated key exchange during inclusion
  - AES-128 encryption for all command classes
  - Three security classes: S2 Access Control, S2 Authenticated, S2 Unauthenticated

Matter Security:
  - PASE (Passcode-Authenticated Session Establishment) for commissioning
  - CASE (Certificate Authenticated Session Establishment) for runtime
  - Device Attestation Certificate (DAC) verifies device authenticity
  - Node Operational Certificates (NOC) for ongoing communication
  - Group keys for multicast commands
```

### 2.3 Authorization Model

```
Role-Based Access Control:

Home Owner:
  - Full control of all devices and settings
  - Add/remove members and guests
  - Create/modify automation rules
  - Access all cameras and locks
  - Delete home and all data

Home Member:
  - Control devices (commands, scenes)
  - View device state and history
  - Create personal automation rules
  - View cameras (if owner grants permission)
  - Cannot remove other members or delete home

Guest:
  - Time-limited access (1 hour to 30 days)
  - Scope-limited (specific devices only)
  - Cannot create automation rules
  - Cannot view camera feeds
  - Cannot add/remove devices
  - Access automatically revoked after expiry

Child Account:
  - Restricted device control (parent-configured)
  - No access to locks or security devices
  - Cannot modify automations
  - Activity visible to parents
  - Age-appropriate content filtering on displays

API Partner:
  - OAuth 2.0 client credentials
  - Scope-limited to specific capabilities
  - Per-partner rate limiting
  - User must explicitly authorize each partner
  - Revocable at any time
```

### 2.4 Access Revocation for Ex-Residents

```
PROCEDURE RevokeAccess(home_id, user_id, initiated_by):
    // Critical security procedure for ex-residents

    1. VERIFY initiated_by has OWNER role for home_id
    2. REMOVE user_id from home membership
    3. INVALIDATE all OAuth tokens for user_id scoped to home_id
    4. REMOVE user_id from all guest lists
    5. DELETE all automation rules created by user_id in home_id
    6. REVOKE any shared camera access
    7. REGENERATE lock access codes associated with user_id
    8. NOTIFY hub to update local access control list
    9. LOG access revocation in audit trail

    // Physical security recommendations
    10. RECOMMEND owner change lock codes
    11. RECOMMEND owner review camera sharing settings
    12. RECOMMEND owner check for unknown guest accounts

    // For voice assistants
    13. REMOVE user_id voice profile from home voice recognition
    14. REVOKE any linked voice assistant account permissions
```

---

## 3. Privacy Protection

### 3.1 Data Classification

| Data Category | Sensitivity | Examples | Handling |
|---|---|---|---|
| **Camera/audio data** | Critical | Video feeds, audio recordings | End-to-end encrypted; never stored in cloud without explicit consent |
| **Location data** | High | Home address, GPS coordinates, presence | Encrypted at rest; minimal retention; no sharing without consent |
| **Device usage patterns** | Medium | When devices are used, energy consumption | Aggregated for analytics; user opt-out available |
| **Device metadata** | Low | Manufacturer, model, firmware version | Stored for device management; anonymized for aggregate analytics |
| **Automation rules** | Medium | User-defined rules revealing lifestyle patterns | Encrypted per home; not shared with partners |

### 3.2 Camera and Microphone Data Handling

```
Camera Data Protection:

Principle: User controls where camera data goes

Local Processing Mode (Default):
  - Motion detection runs on hub (edge AI)
  - No video data leaves the home network
  - Thumbnails/clips stored on hub local storage
  - User can review clips on local network only

Cloud Clip Mode (Opt-In):
  - Short motion-triggered clips uploaded to cloud
  - End-to-end encrypted with per-home key
  - Cloud cannot decrypt (zero-knowledge model)
  - Clips auto-deleted after configurable period (default: 7 days)

Live Stream Mode:
  - Peer-to-peer connection (WebRTC) preferred
  - Falls back to relay server if P2P fails
  - Stream encrypted end-to-end (app ↔ camera)
  - Relay server sees only encrypted bytes
  - No recording unless user explicitly enables

Microphone Data:
  - Voice assistant wake word detection: on-device
  - Post-wake-word audio: sent to NLU service (encrypted)
  - NLU processing: audio deleted after intent extraction
  - No audio retained beyond processing window
  - User can disable microphones per device
  - Physical mute button on devices with microphones
```

### 3.3 Data Minimization

```
Data Collection Principles:

1. Collect only what's needed:
   - Sensor data: only what automation rules reference
   - Usage patterns: anonymized and aggregated
   - Error logs: no PII, device IDs only

2. Retention limits:
   - Real-time device state: current only (no history by default)
   - Event history: 30 days (user-configurable)
   - Camera clips: 7 days (user-configurable)
   - Audit logs: 1 year
   - Deleted account data: 30-day grace period, then permanent deletion

3. User controls:
   - Per-device data sharing toggle
   - "Local-only" device designation (no cloud telemetry)
   - Bulk data export (machine-readable format)
   - Account deletion with all associated data
   - Opt-out of analytics and suggestion features
```

---

## 4. OTA Firmware Security

### 4.1 Secure Update Pipeline

```
Firmware Update Security Chain:

Build Phase:
  1. Firmware built in isolated, audited CI/CD environment
  2. Static analysis and vulnerability scanning
  3. Code signing with HSM-stored manufacturer key
  4. Reproducible builds for independent verification
  5. Signed manifest includes: version, hash, minimum compatible version

Distribution Phase:
  1. Signed firmware uploaded to distribution CDN
  2. Distribution servers verify signature before serving
  3. HTTPS-only download with certificate pinning
  4. Delta updates where possible (signed binary diffs)

Installation Phase (on device):
  1. Device downloads firmware (via hub or directly)
  2. Device verifies signature against trusted root certificate
  3. Device verifies firmware hash matches manifest
  4. Device writes to inactive partition (A/B partitioning)
  5. Device reboots into new firmware
  6. New firmware runs self-tests
  7. If self-tests pass: mark new partition as active
  8. If self-tests fail: automatic rollback to previous partition
  9. Device reports firmware version to cloud

Anti-Rollback Protection:
  - Firmware version counter stored in one-time-programmable fuse
  - Device refuses to install firmware with lower version counter
  - Prevents attacker from downgrading to known-vulnerable firmware
```

### 4.2 Staged Rollout Strategy

```
OTA Rollout Stages:

Stage 1: Internal (0.1%):
  - Deploy to internal/dogfood devices
  - Monitor for 48 hours
  - Automated health checks: device reboot rate, error rate, connectivity

Stage 2: Canary (1%):
  - Deploy to randomly selected external devices
  - Monitor for 72 hours
  - Compare metrics against control group (non-updated devices)
  - Automatic halt if: reboot rate +5%, error rate +2%, connectivity drops

Stage 3: Early Adopters (10%):
  - Deploy to devices opted into early updates
  - Monitor for 48 hours
  - Wider metric comparison

Stage 4: General Availability (50%):
  - Deploy to half the fleet
  - Monitor for 24 hours

Stage 5: Full Rollout (100%):
  - Deploy to all remaining devices
  - Monitor for 7 days
  - Close rollout ticket

Rollback Criteria (Automatic):
  - Device reboot rate increases > 10% over baseline
  - Device-to-cloud connectivity drops > 2%
  - Error rate increases > 5%
  - User-reported issues exceed threshold
```

---

## 5. Matter Security Model

### 5.1 Matter Security Architecture

```
Matter Security Layers:

Device Attestation:
  - Every Matter device has a Device Attestation Certificate (DAC)
  - DAC chain: Device cert → Product cert → Vendor cert → CSA root
  - During commissioning, controller verifies DAC against CSA trust anchors
  - Prevents counterfeit devices from joining the network

Commissioning Security (PASE):
  - User provides setup code (QR code, NFC, manual entry)
  - PASE protocol establishes encrypted session from passcode
  - SPAKE2+ password-authenticated key exchange
  - Session key derived; commissioning proceeds over encrypted channel

Operational Security (CASE):
  - After commissioning, device receives Node Operational Certificate
  - CASE sessions established using certificates (not passcodes)
  - Sigma protocol for mutual authentication
  - Per-session encryption keys (AES-128-CCM)
  - Sessions can be established with multiple controllers

Multi-Admin Security:
  - Matter allows multiple controllers (fabrics) per device
  - Each fabric has independent encryption keys
  - Controller A cannot intercept Controller B's communication
  - User explicitly approves each new controller
  - Maximum fabrics per device: 5 (specification limit)
```

---

## 6. Vulnerability Management

### 6.1 Device Vulnerability Lifecycle

```
Vulnerability Detection:
  1. CVE monitoring for all device firmware components
  2. Automated vulnerability scanning of firmware images
  3. Bug bounty program for security researchers
  4. Customer-reported security concerns

Assessment:
  1. CVSS scoring for affected devices
  2. Impact analysis: which devices, how many homes
  3. Exploitability assessment: network-reachable? authentication-required?

Remediation:
  1. Critical (CVSS 9.0+): Patch within 48 hours; emergency OTA rollout
  2. High (CVSS 7.0-8.9): Patch within 7 days; prioritized rollout
  3. Medium (CVSS 4.0-6.9): Patch in next scheduled update
  4. Low (CVSS < 4.0): Patch in next feature release

Communication:
  1. Security advisory published for critical/high vulnerabilities
  2. In-app notification for affected users
  3. Coordinated disclosure with device manufacturers
  4. Post-mortem for critical vulnerabilities
```

### 6.2 End-of-Life Device Policy

```
When a device reaches end of manufacturer support:

Phase 1 - Notification (6 months before EOL):
  - In-app warning on affected devices
  - Email notification to home owners
  - Recommendation for replacement devices

Phase 2 - Feature Freeze:
  - No new features for EOL devices
  - Security patches continue for 12 months
  - Device continues to function normally

Phase 3 - Security Deprecation:
  - Security patches cease
  - Device flagged as "Security Risk" in app
  - Automation rules using EOL devices show warning
  - Optional: isolate EOL devices to separate network segment

Phase 4 - Removal Recommendation:
  - Strong warning to remove device
  - One-click migration: suggests replacement + migrates automations
  - Device NOT forcefully removed (user choice)
```

---

## 7. Compliance Requirements

### 7.1 Regulatory Framework

| Regulation | Jurisdiction | Key Requirements | System Impact |
|---|---|---|---|
| **GDPR** | EU/EEA | Data protection, right to erasure, consent | Per-home encryption, deletion pipeline, consent UI |
| **CCPA/CPRA** | California | Consumer data rights, opt-out of sale | Data export API, do-not-sell flag |
| **UK PSTI Act** | UK | No default passwords, vulnerability reporting, support period | Unique credentials, security update commitment |
| **EU Cyber Resilience Act** | EU | Security-by-design, vulnerability handling, SBOM | Secure development lifecycle, incident reporting |
| **ETSI EN 303 645** | Global (IoT) | IoT security baseline requirements | 13 security provisions for consumer IoT |
| **Matter Certification** | Global | CSA certification requirements | Interoperability and security testing |

### 7.2 ETSI EN 303 645 Compliance

```
13 Security Provisions for Consumer IoT:

 1. No universal default passwords → Unique per-device credentials
 2. Implement vulnerability disclosure → Security contact, bug bounty
 3. Keep software updated → OTA update infrastructure
 4. Securely store credentials → HSM on hub, secure element on devices
 5. Communicate securely → TLS 1.3, protocol-level encryption
 6. Minimize exposed attack surface → Disable unused services, ports
 7. Ensure software integrity → Signed firmware, secure boot
 8. Ensure personal data is secure → Encryption at rest and in transit
 9. Make systems resilient to outages → Offline operation, graceful degradation
10. Examine telemetry data → Minimize collection, user visibility
11. Make it easy to delete data → One-click data deletion per device/home
12. Make installation easy → Zero-configuration goal, secure defaults
13. Validate input data → Input validation at all protocol boundaries
```

---

*Next: [Observability →](./07-observability.md)*
