# 14.8 AI-Native Quality Control for SME Manufacturing — Security & Compliance

## Authentication and Authorization

### Multi-Layer Auth Architecture

```
Layer 1: Cloud Platform (Human Users)
  - Identity provider integration (SAML/OIDC) for enterprise SSO
  - Multi-factor authentication for admin and quality manager roles
  - Role-based access control (RBAC):
    ┌──────────────────────┬──────────────────────────────────────────────┐
    │ Role                 │ Permissions                                  │
    ├──────────────────────┼──────────────────────────────────────────────┤
    │ Tenant Admin         │ Manage factories, stations, users, billing   │
    │ Quality Manager      │ Train models, deploy, review, configure      │
    │ Quality Inspector    │ View dashboards, review queue, export reports│
    │ Operator             │ View station status, acknowledge alerts      │
    │ Auditor (read-only)  │ View inspection records, audit trail, reports│
    └──────────────────────┴──────────────────────────────────────────────┘

Layer 2: Edge Device Authentication
  - Each edge device has a unique device certificate (X.509) provisioned
    during factory setup, stored in hardware secure element (TPM/TEE)
  - Device certificates signed by platform CA; cloud verifies on every connection
  - Certificate rotation: annual, initiated by cloud platform
  - Revocation: immediate via CRL/OCSP if device is decommissioned or compromised

Layer 3: Factory Gateway Authentication
  - Gateway authenticates to cloud using factory-level certificate
  - Edge devices authenticate to gateway using device certificates
  - Mutual TLS (mTLS) for all gateway-to-cloud communication
  - Gateway acts as proxy: edge devices never communicate directly with cloud

Layer 4: Model Artifact Integrity
  - Every model artifact is signed by the cloud training pipeline
  - Edge devices verify signature before loading any model
  - Prevents: tampered models, unauthorized model injection, rollback attacks
```

### API Security

```
Cloud API:
  - OAuth 2.0 / JWT for user-facing APIs
  - API keys with per-tenant rate limiting for programmatic access
  - All API calls logged with: caller identity, action, resource, timestamp
  - Rate limits: 100 requests/min per user; 1,000 requests/min per tenant

Device API (edge → cloud):
  - mTLS with device certificate
  - Request signing (HMAC) for integrity protection
  - Replay protection via monotonic nonce + timestamp validation
  - Rate limits: per-device limits to prevent compromised device flooding

Internal APIs (service-to-service):
  - Service mesh with mTLS
  - Service accounts with least-privilege IAM policies
```

---

## Data Security

### Data Classification

```
┌─────────────────────────────────┬───────────────┬──────────────────────────────┐
│ Data Type                       │ Classification│ Handling                     │
├─────────────────────────────────┼───────────────┼──────────────────────────────┤
│ Inspection images (defects)     │ Confidential  │ Encrypted at rest/transit;   │
│                                 │               │ tenant-isolated storage      │
├─────────────────────────────────┼───────────────┼──────────────────────────────┤
│ Trained model weights           │ Confidential  │ Tenant-owned; encrypted;     │
│                                 │               │ never shared across tenants  │
├─────────────────────────────────┼───────────────┼──────────────────────────────┤
│ Training datasets               │ Confidential  │ Tenant-isolated; encrypted;  │
│                                 │               │ deletable on tenant request  │
├─────────────────────────────────┼───────────────┼──────────────────────────────┤
│ Inspection metadata             │ Internal      │ Encrypted at rest; tenant-   │
│ (timestamps, decisions, stats)  │               │ scoped queries only          │
├─────────────────────────────────┼───────────────┼──────────────────────────────┤
│ Station telemetry               │ Internal      │ Encrypted at rest            │
│ (health metrics)                │               │                              │
├─────────────────────────────────┼───────────────┼──────────────────────────────┤
│ Pre-trained backbone weights    │ Platform      │ Shared across tenants        │
│ (domain templates)              │               │ (not tenant IP)              │
├─────────────────────────────────┼───────────────┼──────────────────────────────┤
│ Platform configuration          │ Internal      │ Encrypted; version-controlled│
└─────────────────────────────────┴───────────────┴──────────────────────────────┘
```

### Intellectual Property Protection

Inspection images and trained models contain proprietary manufacturing information—product designs, defect patterns, production quality levels—that represent significant competitive intelligence.

```
Protection measures:

1. Tenant isolation:
   - Object storage: separate bucket or prefix per tenant with IAM policies
   - Database: tenant_id column on every table; enforced at query layer
   - No cross-tenant data access, even by platform operators

2. Model IP:
   - Trained models are derived from tenant's images + platform's base backbone
   - Tenant owns the trained model (contractually)
   - Model weights encrypted on edge devices; decrypted only in secure NPU memory
   - If tenant cancels: models deleted from cloud and edge within 30 days
     (configurable for compliance)

3. Image transit security:
   - TLS 1.3 for all cloud communication
   - On factory LAN: optional encryption (performance trade-off for high-throughput stations)
   - Edge device local storage: encrypted at rest (device-level encryption key
     stored in hardware secure element)

4. Data residency:
   - Tenant chooses data region (for factories in regulated industries)
   - Training can be region-constrained (model trained in same region as data)
   - Cross-region replication only to regions approved by tenant

5. Platform operator access:
   - No platform engineer can view tenant images without explicit consent
   - Debugging uses synthetic/anonymized data
   - Any access to production tenant data requires: justification, approval,
     time-bounded access window, full audit trail
```

### Edge Device Security

```
1. Secure boot:
   - Bootloader verifies OS image signature before loading
   - OS verifies application signature before launching
   - Prevents: rootkit installation, unauthorized firmware

2. Encrypted storage:
   - Full-disk encryption with hardware-bound key (TPM/TEE)
   - If device is physically stolen, disk contents are unreadable
   - Key not recoverable without the specific hardware module

3. Network isolation:
   - Edge devices should be on a dedicated VLAN, isolated from
     factory office network and internet
   - Only allowed connections: factory gateway (for sync), PLC (for actuation)
   - Firewall rules: deny all except explicit allowlist

4. Remote attestation:
   - Edge device periodically proves to cloud that its software stack
     is unmodified (secure boot measurement + runtime integrity check)
   - If attestation fails: device quarantined from fleet updates,
     operator notified to investigate

5. Physical security:
   - IP65 enclosure with tamper-evident seal
   - Physical USB/serial ports disabled in production mode
   - Debug access requires physical jumper + cloud authorization code
```

---

## Threat Model

### Threat 1: Malicious Model Injection

```
Attack: Adversary uploads a tampered model to an edge device that
  intentionally passes defective parts (sabotage) or rejects all parts (denial)

Attack vectors:
  a. Compromised cloud account deploys malicious model via OTA
  b. Physical access to edge device, manual model replacement
  c. Man-in-the-middle during OTA download, substituting model artifact

Mitigations:
  a. MFA + role separation (only Quality Manager can deploy;
     deployment requires approval from Tenant Admin for production stations)
  b. Secure boot + encrypted storage + tamper-evident enclosure
  c. Model artifact signing (asymmetric cryptography); edge device verifies
     signature against cloud CA public key before loading

  Additionally: Shadow mode deployment ensures ANY new model is validated
  against the production model before it can make real decisions.
```

### Threat 2: Training Data Poisoning

```
Attack: Adversary injects mislabeled images into the training dataset
  (e.g., labels defective images as "good") to degrade model quality

Attack vectors:
  a. Compromised operator account uploads malicious training data
  b. Active learning pipeline is manipulated (operator consistently
     mislabels borderline images during review)

Mitigations:
  a. Training data provenance tracking (who uploaded, when, from where)
  b. Automated outlier detection on training datasets (flag images that
     are very different from the majority in their class)
  c. Model validation on held-out test set (poisoned model will show
     degraded performance on clean test data)
  d. Shadow mode catches models that perform worse than production
```

### Threat 3: Inspection Image Exfiltration

```
Attack: Competitor or insider extracts inspection images to learn about
  product designs, quality levels, or defect patterns

Attack vectors:
  a. Compromised cloud account downloads images via API
  b. Physical access to edge device extracts images from local storage
  c. Network sniffing on factory LAN captures images in transit

Mitigations:
  a. API access logging + anomaly detection (unusual download volume triggers alert)
     Rate limiting on bulk image downloads
  b. Full-disk encryption + disabled USB ports + tamper-evident enclosure
  c. TLS for all communication; optional encryption on factory LAN for
     sensitive deployments
```

### Threat 4: Denial of Inspection Service

```
Attack: Adversary disrupts inspection capability, causing uninspected
  parts to reach customers

Attack vectors:
  a. DDoS on cloud platform (irrelevant: edge operates independently)
  b. Disrupting factory network (edge operates independently)
  c. Electromagnetic interference to corrupt camera data
  d. Physical damage to inspection stations

Mitigations:
  a-b. Edge-first architecture makes cloud/network attacks ineffective
       against real-time inspection
  c. Shielded camera cables (STP or fiber); EMI detection in frame
     quality validation (corrupt frames are flagged, not processed)
  d. Redundant stations on critical lines; PLC alerts operator when
     station goes offline; physical station in a protected enclosure
```

---

## Compliance

### ISO 9001:2015 — Quality Management Systems

```
Requirements addressed:
  - 7.1.5 Monitoring and measuring resources:
    Inspection stations are calibrated measuring resources; platform provides
    calibration records, accuracy metrics, and traceability

  - 8.5.1 Control of production and service provision:
    Automated inspection as a controlled process with documented procedures,
    trained personnel (operators), and validated equipment (models)

  - 8.6 Release of products and services:
    Every inspection decision is recorded with evidence (image, confidence,
    model version); non-conforming products diverted automatically

  - 10.2 Nonconformity and corrective action:
    Defect trend analytics enable root cause analysis; defect patterns
    linked to production batches, materials, and process parameters

Platform support:
  - Immutable audit trail for every inspection event
  - Exportable quality reports per batch, date range, and station
  - Model validation records documenting accuracy at deployment time
  - Calibration records for camera and lighting checks
```

### Industry-Specific Compliance

```
Automotive (IATF 16949):
  - Statistical process control (SPC) charts from inspection data
  - Measurement system analysis (MSA) for the vision inspection system
    (repeatability and reproducibility studies using reference samples)
  - Production Part Approval Process (PPAP) documentation support

Pharmaceutical (FDA 21 CFR Part 11):
  - Electronic records with integrity controls (audit trail, signatures)
  - System validation documentation (IQ/OQ/PQ templates)
  - Access controls and audit trail for all inspection records
  - Change control for model updates (documented, approved, validated)

Food (FSSC 22000 / HACCP):
  - Critical Control Point (CCP) monitoring via inspection stations
  - Continuous recording with deviation alerting
  - Traceability from raw material to finished product inspection

Electronics (IPC standards):
  - Solder joint classification per IPC-A-610 criteria
  - Defect severity mapping to IPC accept/reject standards
  - Visual inspection records per IPC-7711/7721
```

### Data Retention and Deletion

```
Retention policies (configurable per tenant):
  - Defect images: minimum 1 year, maximum 7 years (regulatory dependent)
  - Pass images (sampled): minimum 30 days, maximum 1 year
  - Inspection metadata: minimum 1 year, maximum 10 years
  - Training datasets: retained until tenant requests deletion
  - Model versions: retained until superseded + 90-day buffer
  - Audit logs: minimum 3 years

Deletion:
  - Tenant requests data deletion → executed within 30 days
  - Deletion is cryptographic (key destruction) for efficiency on large datasets
  - Deletion certificate provided to tenant for compliance records
  - Backup copies purged within 90 days of deletion request

Right to audit:
  - Tenants can request audit reports at any time
  - Platform provides self-service export of all tenant data
  - Independent third-party audit available on enterprise tier
```
