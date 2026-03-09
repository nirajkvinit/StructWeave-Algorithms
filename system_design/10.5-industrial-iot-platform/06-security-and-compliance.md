# Security & Compliance — Industrial IoT Platform

## 1. Threat Model

### 1.1 Attack Surface Analysis

Industrial IoT platforms have a uniquely broad attack surface spanning both IT and OT domains, with the added concern that successful attacks can cause physical harm.

```
Attack Surface Map:

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Physical  │    │ OT       │    │ IT/OT    │    │ Cloud    │  │
│  │ Layer     │    │ Network  │    │ Boundary │    │ Services │  │
│  │           │    │          │    │          │    │          │  │
│  │ •Sensor   │    │ •PLC     │    │ •Edge    │    │ •MQTT    │  │
│  │  tamper   │    │  exploit │    │  gateway │    │  broker  │  │
│  │ •Wiring   │    │ •Modbus  │    │  comprom.│    │ •API     │  │
│  │  tap      │    │  injection│   │ •Protocol│    │  abuse   │  │
│  │ •USB      │    │ •Firmware│    │  transla.│    │ •Data    │  │
│  │  device   │    │  tamper  │    │  vulnerab│    │  exfiltr.│  │
│  │ •Physical │    │ •MITM on │    │ •OTA     │    │ •Lateral │  │
│  │  access   │    │  field   │    │  supply  │    │  movement│  │
│  │           │    │  bus     │    │  chain   │    │          │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
│  Unique IIoT Threat: Cyber-Physical Impact                      │
│  Compromised commands can cause equipment damage,               │
│  environmental release, or human injury                         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Top Threats

| Threat | Category | Impact | Likelihood |
|---|---|---|---|
| **Unauthorized actuator commands** | Integrity | Equipment damage, safety incident, environmental release | Medium |
| **Sensor data manipulation** | Integrity | Incorrect control decisions, hidden process deviations | Medium |
| **Edge gateway compromise** | Confidentiality/Integrity | Lateral movement to OT network, data exfiltration | Medium-High |
| **MQTT message injection** | Integrity | False telemetry, phantom alarms, operator confusion | Medium |
| **OTA supply chain attack** | Integrity | Malicious firmware deployed to thousands of devices | Low (high impact) |
| **Ransomware on historian** | Availability | Loss of historical data, operational blindness | Medium-High |
| **Insider threat (operator)** | All | Unauthorized process changes, data theft, sabotage | Low-Medium |
| **DDoS on cloud platform** | Availability | Loss of remote monitoring, no analytics/predictions | Medium |
| **Protocol downgrade attack** | Confidentiality | Bypass encryption on legacy protocol connections | Medium |
| **Physical sensor tampering** | Integrity | Incorrect readings, masked process deviations | Low |

### 1.3 Threat Mitigation Matrix

| Threat | Primary Mitigation | Secondary Mitigation |
|---|---|---|
| **Unauthorized actuator commands** | Two-person authorization rule; command signing with operator certificate | Rate limiting; anomaly detection on command patterns |
| **Sensor data manipulation** | End-to-end data integrity (HMAC from sensor to cloud) | Statistical anomaly detection on sensor values |
| **Edge gateway compromise** | Secure boot, TPM-based attestation, hardened OS | Network segmentation; behavior-based anomaly detection |
| **MQTT message injection** | Mutual TLS with X.509 certificates; topic ACLs | Message signing; Sparkplug B sequence validation |
| **OTA supply chain attack** | Code signing with HSM-protected keys; reproducible builds | Staged rollouts with health monitoring; automatic rollback |
| **Ransomware on historian** | Immutable backup to object storage; air-gapped backup copies | Network segmentation; endpoint detection and response |
| **Insider threat** | Role-based access; separation of duties; audit logging | Behavioral analytics; privileged access management |
| **DDoS on cloud platform** | CDN/WAF; rate limiting; geographic filtering | Edge autonomy ensures local operations continue |
| **Protocol downgrade** | Enforce minimum TLS version; disable legacy ciphers | Network monitoring for cleartext protocol traffic |

---

## 2. OT/IT Security Convergence

### 2.1 ISA/IEC 62443 Zone and Conduit Model

The ISA/IEC 62443 standard defines a zone and conduit model that segments the industrial network into security zones with controlled communication paths (conduits) between them.

```
ISA/IEC 62443 Zone Architecture:

┌─────────────────────────────────────────────────────────────┐
│ Zone 5: Enterprise Network (SL 1)                           │
│  ERP · Email · Business Intelligence · Internet Access      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Conduit: Enterprise DMZ                              │    │
│  │  Web proxy · API gateway · Data diode (outbound)    │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                              │                               │
│ Zone 4: Site Business Network (SL 2)                        │
│  Historian · MES · Quality · Maintenance Management         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Conduit: Industrial DMZ                              │    │
│  │  Firewall · Protocol inspection · Data historian     │    │
│  │  mirror · OPC UA reverse proxy                      │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                              │                               │
│ Zone 3: Site Operations (SL 2-3)                            │
│  Edge Gateways · Engineering Workstations · HMI Servers    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Conduit: Control Network Boundary                    │    │
│  │  Industrial firewall · Deep packet inspection       │    │
│  │  Protocol allowlisting · Session monitoring         │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                              │                               │
│ Zone 2: Control System Network (SL 3)                       │
│  PLCs · DCS Controllers · RTUs · Operator Workstations     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Conduit: Safety System Boundary                      │    │
│  │  Data diode (one-way OUT) · Hardware interlock      │    │
│  │  NO inbound connections allowed                     │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                              │                               │
│ Zone 1: Safety Instrumented Systems (SL 4)                  │
│  Safety PLCs · ESD · Fire & Gas · Pressure Relief          │
│  Air-gapped or data-diode protected                        │
└─────────────────────────────────────────────────────────────┘

Security Levels (SL):
  SL 1: Protection against casual or coincidental violation
  SL 2: Protection against intentional violation using simple means
  SL 3: Protection against intentional violation using sophisticated means
  SL 4: Protection against state-sponsored attacks
```

### 2.2 Security Controls by Zone

| Zone | Authentication | Encryption | Access Control | Monitoring |
|---|---|---|---|---|
| **Zone 1 (Safety)** | Physical key switches, hardwired interlocks | None (isolated network) | Physical access only; no remote access | Hardwired annunciators |
| **Zone 2 (Control)** | Username/password on HMI; certificate on PLC | Optional (many legacy devices lack encryption) | Role-based per workstation | Network traffic baseline monitoring |
| **Zone 3 (Operations)** | X.509 certificates for gateways; MFA for engineers | TLS 1.3 mandatory | RBAC with facility/area granularity | IDS/IPS with OT protocol awareness |
| **Zone 4 (Business)** | MFA for all users; service accounts with certificates | TLS 1.3 mandatory | RBAC with least privilege; PAM for admin access | SIEM integration; user behavior analytics |
| **Zone 5 (Enterprise)** | SSO with MFA; conditional access policies | TLS 1.3 mandatory | Zero-trust network access | Full SIEM/SOC monitoring |

### 2.3 Conduit Security Controls

```
Conduit Implementation:

Control → Operations Conduit (Zone 2 → Zone 3):
  Direction: Unidirectional (data OUT from control network only)
  Technology: Hardware data diode or unidirectional security gateway
  Allowed traffic:
    - OPC UA data subscriptions (control → operations): ALLOWED
    - Modbus TCP responses (control → operations): ALLOWED
    - Any inbound traffic (operations → control): BLOCKED by hardware
  Rationale: No attack from IT/cloud can reach the control network

Operations → Cloud Conduit (Zone 3 → Zone 5 via DMZ):
  Direction: Bidirectional (with strict filtering)
  Technology: Industrial firewall with DPI + OPC UA proxy
  Outbound allowed:
    - MQTT Sparkplug B to cloud broker: Port 8883 (TLS)
    - NTP time sync: Port 123
    - OTA update downloads: Port 443 (HTTPS)
  Inbound allowed:
    - MQTT command responses: Only to established sessions
    - Configuration updates: Via MQTT subscribed topics only
    - OTA firmware: Only from verified CDN origin
  Blocked:
    - SSH, RDP, Telnet: Blocked in both directions
    - Direct database connections: Blocked
    - Arbitrary HTTPS: Blocked (no general internet access)
```

---

## 3. Device Authentication and Identity

### 3.1 Certificate-Based Device Identity

```
Device Identity Lifecycle:

1. Manufacturing (Device Birth):
   - TPM 2.0 generates device keypair in hardware
   - Device CSR (Certificate Signing Request) created
   - Factory CA signs device certificate with unique Device ID
   - Certificate embedded in TPM; private key never leaves hardware
   - Device ships with: TPM-stored private key, device certificate,
     root CA certificate chain

2. Provisioning (First Connection):
   - Device connects to provisioning endpoint with factory certificate
   - Provisioning service verifies factory certificate against factory CA
   - Provisioning service issues operational certificate signed by operational CA
   - Operational certificate includes: device_id, site_id, gateway_role, validity
   - Device stores operational certificate in TPM
   - Device registered in device registry with certificate thumbprint

3. Operation (Ongoing):
   - MQTT connection authenticated via mutual TLS (mTLS)
   - Client presents operational certificate; broker verifies against operational CA
   - Broker verifies certificate not revoked (CRL/OCSP)
   - MQTT topic ACL derived from certificate attributes
     (device can only publish to its own Sparkplug namespace)

4. Certificate Rotation (Annual):
   - 30 days before expiry: device requests new certificate via CSR
   - New certificate issued; old certificate added to CRL
   - Grace period: both old and new certificates accepted for 7 days
   - If device misses rotation (offline): provisioning flow on reconnect

5. Decommissioning:
   - Certificate immediately revoked (added to CRL)
   - Device ID marked inactive in registry
   - All historical data retained per retention policy
```

### 3.2 Command Authorization

```
Command Authorization Framework:

┌────────────────────────────────────────────────────┐
│          Command Authorization Matrix               │
├─────────────────────┬──────────────────────────────┤
│ Command Type        │ Authorization Required        │
├─────────────────────┼──────────────────────────────┤
│ Read current value  │ Authenticated user + role     │
│ Read historical     │ Authenticated user + role     │
│ Change alarm limit  │ Engineer role + audit log     │
│ Shelve alarm        │ Operator role + reason + time │
│ Change scan rate    │ Engineer role + change ticket │
│ Write to actuator   │ Authorized Operator +         │
│                     │ two-person rule + audit log   │
│ Emergency shutdown  │ Operator role (no second      │
│                     │ person required for safety)   │
│ OTA firmware update │ Admin role + change ticket +  │
│                     │ approval workflow             │
│ Device provisioning │ Admin role + physical access  │
│ Configuration export│ Admin role + data class check │
└─────────────────────┴──────────────────────────────┘

Two-Person Authorization Rule (for actuator writes):
  1. Operator A initiates command from HMI/dashboard
  2. System sends authorization request to Operator B (supervisor)
  3. Operator B reviews command details and approves/rejects
  4. Both operator identities logged in immutable audit trail
  5. Command expires if not approved within 5 minutes
  6. Exception: Emergency shutdown commands bypass two-person rule
     (safety takes precedence over security process)
```

---

## 4. Data Protection

### 4.1 Data Classification

| Classification | Description | Examples | Protection |
|---|---|---|---|
| **Safety-Critical** | Data affecting safety system decisions | Safety interlock states, ESD status, fire/gas detection | Highest integrity; data diode protected; tamper-evident |
| **Process-Critical** | Real-time process control data | Temperatures, pressures, flows, setpoints | High integrity; encrypted in transit; access-controlled |
| **Operational** | Production and efficiency data | OEE metrics, production counts, quality measurements | Standard encryption; role-based access |
| **Diagnostic** | Equipment health and maintenance data | Vibration signatures, trend data, maintenance logs | Standard encryption; broader access for maintenance |
| **Configuration** | Device and system configuration | Alarm limits, scan rates, network settings | Version-controlled; change management; encrypted at rest |
| **Personal** | Worker-related data | Operator actions, shift logs, training records | GDPR/privacy compliant; minimized collection; consent |

### 4.2 Encryption Architecture

```
Encryption Strategy:

Data in Transit:
  Zone 2-3 (OT protocols):
    - Many legacy protocols (Modbus, PROFINET) lack native encryption
    - Mitigation: Network segmentation + physical access control
    - Newer devices: OPC UA with Security Policy Basic256Sha256
    - Edge gateway: encrypts all data before transmitting to cloud

  Zone 3-5 (Edge to Cloud):
    - TLS 1.3 mandatory for all MQTT connections
    - Cipher suite: TLS_AES_256_GCM_SHA384
    - Certificate pinning on edge gateway
    - No TLS termination at network boundary (end-to-end)

  Service-to-Service:
    - mTLS for all gRPC inter-service communication
    - Service mesh provides automatic certificate management

Data at Rest:
  Edge Gateway:
    - Local buffer encrypted with AES-256-GCM
    - Encryption key derived from TPM-stored master key
    - Key never exists in plaintext outside TPM

  Cloud Storage:
    - TSDB: Transparent data encryption (AES-256)
    - Object storage: Server-side encryption with customer-managed keys
    - Database: Column-level encryption for sensitive configuration

  Backup:
    - Encrypted before transfer to backup storage
    - Backup encryption keys stored in separate key management service
    - Key rotation every 90 days
```

### 4.3 Audit Trail

```
Immutable Audit Trail:

Events Captured:
  - All configuration changes (who, what, when, from_value, to_value)
  - All alarm acknowledgments and shelving actions
  - All actuator write commands (with authorization chain)
  - All OTA firmware deployments
  - All device provisioning and decommissioning
  - All access control changes (role assignments, permission grants)
  - All data export and download actions
  - All failed authentication attempts
  - All admin actions (user creation, system configuration)

Audit Record Format:
  {
    "event_id": "uuid",
    "timestamp": "2026-03-09T14:30:02.453Z",
    "event_type": "ACTUATOR_WRITE",
    "actor": {"user_id": "usr-uuid", "role": "OPERATOR", "ip": "10.0.1.42"},
    "target": {"tag": "FV-4201", "equipment": "P-4201", "site": "Plant Alpha"},
    "action": {"setpoint_from": 50.0, "setpoint_to": 75.0},
    "authorization": {
      "approver": {"user_id": "usr-uuid-2", "role": "SUPERVISOR"},
      "approved_at": "2026-03-09T14:29:58Z",
      "change_ticket": "CHG-20260309-042"
    },
    "integrity_hash": "sha256:abc123...",
    "previous_hash": "sha256:def456..."
  }

Storage:
  - Write-once, append-only event store
  - Hash chain links each record to previous (tamper-evident)
  - Replicated to separate security zone
  - Retained for minimum 7 years (regulatory requirement)
  - Periodic integrity verification (hash chain validation)
```

---

## 5. Compliance Frameworks

### 5.1 ISA/IEC 62443 Compliance

```
ISA/IEC 62443 Compliance Map:

Part 2-1: Security Management System
  ✓ Asset inventory of all OT and IIoT devices
  ✓ Risk assessment per zone and conduit
  ✓ Security policies and procedures documented
  ✓ Incident response plan for OT environments
  ✓ Regular security audits and assessments

Part 3-3: System Security Requirements
  ✓ Identification and authentication (FR 1): X.509 certificates, MFA
  ✓ Use control (FR 2): RBAC with OT-specific roles
  ✓ System integrity (FR 3): Secure boot, firmware signing
  ✓ Data confidentiality (FR 4): TLS 1.3, AES-256 at rest
  ✓ Restricted data flow (FR 5): Zone/conduit enforcement
  ✓ Timely response to events (FR 6): IDS/IPS, SIEM integration
  ✓ Resource availability (FR 7): HA architecture, DoS protection

Part 4-2: Technical Security Requirements for Components
  ✓ Edge gateway: Secure boot, TPM, hardened OS, update capability
  ✓ MQTT broker: Authentication, authorization, encryption, audit
  ✓ Cloud services: Standard cloud security baseline
  ✓ Development lifecycle: Secure SDLC for platform software
```

### 5.2 Industry-Specific Compliance

| Industry | Regulation | Key Requirements | Platform Implementation |
|---|---|---|---|
| **Pharmaceutical** | FDA 21 CFR Part 11 | Electronic records/signatures, audit trail, data integrity | Immutable audit log; electronic signature for operator actions; data integrity checks |
| **Energy** | NERC CIP | Critical infrastructure protection, access management, incident reporting | Network monitoring; access logging; automated compliance reporting |
| **Oil & Gas** | API 1164 | Pipeline SCADA security, access control, monitoring | OT-specific IDS; privileged access management; change management |
| **Chemical** | CFATS | Chemical facility anti-terrorism standards | Physical security integration; personnel surety; cyber security measures |
| **General** | GDPR/Privacy | Worker data protection, consent, right to erasure | Data minimization; consent management; pseudonymization of operator data |

### 5.3 Compliance Automation

```
Automated Compliance Monitoring:

Continuous Controls:
  1. Certificate expiry monitoring:
     - Alert 30 days before any device certificate expires
     - Auto-renew where possible; escalate where manual intervention needed

  2. Access review:
     - Monthly automated report of all active user accounts and roles
     - Flag dormant accounts (no login in 90 days) for review
     - Flag privilege escalations since last review

  3. Configuration drift detection:
     - Compare current device configurations against approved baselines
     - Flag unauthorized changes within 15 minutes
     - Auto-remediate for non-critical drift; alert for critical

  4. Network segmentation validation:
     - Continuous monitoring of zone boundary traffic
     - Alert on any traffic violating conduit rules
     - Weekly automated penetration test of zone boundaries

  5. Patch compliance:
     - Track firmware versions across all edge devices
     - Flag devices running vulnerable firmware
     - Generate patch compliance reports per site

Compliance Reporting:
  - Automated generation of compliance evidence packages
  - Pre-formatted for ISA/IEC 62443, FDA 21 CFR Part 11, NERC CIP
  - Dashboards showing compliance posture by site, zone, and control family
  - Exportable audit reports for regulatory inspection
```

---

## 6. Incident Response

### 6.1 OT-Specific Incident Response

```
OT Incident Response Plan:

Phase 1: Detection and Triage (0-15 minutes)
  - IDS/IPS alerts on anomalous OT network traffic
  - Unexpected protocol behavior (e.g., Modbus write to unusual register)
  - Sensor value anomalies not correlated with process changes
  - Edge gateway reporting tamper detection

Phase 2: Containment (15-60 minutes)
  CRITICAL DIFFERENCE from IT incident response:
  - DO NOT immediately isolate compromised equipment if it's running
    a safety-critical process
  - Priority order: 1) Safety 2) Environment 3) Production 4) Data

  Containment actions:
  a. Block compromised device's cloud connectivity (prevent lateral movement UP)
  b. If safe: isolate compromised network segment at conduit firewall
  c. If NOT safe to isolate: place in "monitor-only" mode
     (allow process data flow; block all commands)
  d. Alert operations team to transition to manual/local control
  e. Preserve forensic evidence (network captures, log snapshots)

Phase 3: Eradication (1-24 hours)
  - Identify attack vector and close it
  - Re-image compromised edge gateways from known-good firmware
  - Rotate affected certificates
  - Update firewall rules based on IOCs

Phase 4: Recovery (1-7 days)
  - Gradually restore automated control (start with non-critical loops)
  - Monitor for re-infection with enhanced logging
  - Validate sensor data integrity post-recovery

Phase 5: Post-Incident (1-4 weeks)
  - Root cause analysis (5-whys methodology)
  - Update threat model and security controls
  - Share anonymized IOCs with industry ISAC
  - Update incident response plan based on lessons learned
```

---

*Next: [Observability ->](./07-observability.md)*
