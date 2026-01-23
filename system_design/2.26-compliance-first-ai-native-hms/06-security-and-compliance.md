# Security and Compliance

[Back to Index](./00-index.md)

---

## Multi-Framework Compliance Matrix

### Regulatory Requirements by Jurisdiction

| Requirement | HIPAA (USA) | GDPR (EU) | ABDM (India) | NABH (India) | NHS (UK) | JCAHO (USA) |
|-------------|-------------|-----------|--------------|--------------|----------|-------------|
| **Data Residency** | No mandate | Within EU | Within India | India preferred | Within UK | No mandate |
| **Encryption at Rest** | Required (§164.312) | Art. 32 | Required | Required | Required | Required |
| **Encryption in Transit** | TLS 1.2+ | TLS 1.2+ | TLS 1.2+ | TLS 1.2+ | TLS 1.3 | TLS 1.2+ |
| **Audit Log Retention** | 6 years | Per purpose | 3 years | 5 years | 8 years | 6 years |
| **Breach Notification** | 60 days | 72 hours | 72 hours | 24 hours | 72 hours | 24 hours |
| **Right to Access** | 30 days | 30 days | 30 days | On request | 30 days | On request |
| **Consent Required** | Treatment exempt | Explicit | Explicit | Explicit | Explicit | Implicit |
| **De-identification** | Safe Harbor | Anonymization | De-identification | - | Anonymization | - |
| **Max Penalties** | $1.5M/year | €20M or 4% | ₹250 crore | Accreditation loss | £17.5M | Accreditation loss |

### Accreditation Standards

**NABH (National Accreditation Board for Hospitals - India)**

| Standard | Requirement | HMS Implementation |
|----------|-------------|-------------------|
| 2.1 | Unique patient identification | EMPI with mandatory identifiers |
| 2.2 | Patient information confidentiality | RBAC, field-level encryption |
| 2.3 | Medical records maintenance | FHIR-based record keeping |
| 4.1 | Patient admission process | ADT workflow with audit trail |
| 5.1 | Continuum of care documentation | Integration with EMR |
| 8.1 | Quality improvement program | Metrics dashboard, incident tracking |

**Joint Commission (JCAHO - USA)**

| Standard | Requirement | HMS Implementation |
|----------|-------------|-------------------|
| NPSG.01.01 | Two patient identifiers | EMPI + MRN + secondary identifier |
| NPSG.03.06 | Medication reconciliation | Integration with Pharmacy system |
| IC.01.01 | Infection control | Isolation room tracking in bed management |
| MM.01.01 | Medication management | OR equipment/medication tracking |
| IM.02.02 | Information management | Secure data access, audit logs |

---

## Authentication and Authorization

### Authentication Architecture

```mermaid
flowchart TB
    subgraph Users["User Types"]
        Staff[Hospital Staff]
        Patient[Patients]
        System[System Services]
    end

    subgraph IdP["Identity Provider"]
        OIDC[OIDC Provider<br/>Keycloak/Okta]
        MFA[MFA Service]
        SSO[SSO Federation]
    end

    subgraph Auth["Authorization"]
        OPA[OPA Policy Engine]
        RBAC[Role Store]
        Consent[Consent Engine<br/>(for patient data)]
    end

    subgraph HMS["HMS Services"]
        API[API Gateway]
        Services[Core Services]
    end

    Staff -->|SAML/OIDC| SSO
    Patient -->|OIDC| OIDC
    System -->|mTLS + API Key| API

    SSO --> OIDC
    OIDC --> MFA
    MFA --> API

    API --> OPA
    OPA --> RBAC
    OPA --> Consent
    OPA --> Services
```

### Role-Based Access Control (RBAC)

| Role | Bed Management | ADT | OR Scheduling | Revenue Cycle | EMPI Admin |
|------|---------------|-----|---------------|---------------|------------|
| **Attending Physician** | View | Admit/Discharge | Schedule cases | View charges | View |
| **Resident** | View | Assist (supervised) | Assist | View | View |
| **Nurse** | Assign/Transfer | Update | View | View | View |
| **Bed Management Admin** | Full access | View | View | - | - |
| **OR Scheduler** | View | View | Full access | View | - |
| **Billing Specialist** | - | View | View | Full access | - |
| **HIM Coder** | - | View | View | Coding only | - |
| **Registration Clerk** | View | Register | - | - | Create/Search |
| **EMPI Administrator** | - | - | - | - | Full access |
| **System Admin** | Config only | Config only | Config only | Config only | Config only |

### Multi-Factor Authentication Requirements

| User Type | Primary Auth | MFA Required | Allowed Methods | Session Duration |
|-----------|--------------|--------------|-----------------|------------------|
| Physician | OIDC (SSO) | Always | TOTP, FIDO2, Push | 12 hours |
| Nurse | OIDC (SSO) | Always | TOTP, FIDO2, Badge tap | 8 hours |
| Scheduler | OIDC (SSO) | Always | TOTP, FIDO2 | 8 hours |
| Billing | OIDC (SSO) | Always | TOTP, FIDO2 | 4 hours |
| Admin | OIDC (SSO) | Always | FIDO2, Hardware key | 4 hours |
| Service Account | mTLS | N/A | Certificate | Per-request |

---

## OPA Policy Examples

### Bed Assignment Policy

```rego
package hms.bed_management

import future.keywords.in

default allow = false

# Nurses can assign beds in their own unit
allow {
    input.action == "assign_bed"
    input.user.role == "nurse"
    input.user.assigned_unit == input.bed.unit_id
    input.bed.status == "available"
    input.bed.cleaning_status == "clean"
}

# Nurses can assign beds in other units with supervisor approval
allow {
    input.action == "assign_bed"
    input.user.role == "nurse"
    input.user.assigned_unit != input.bed.unit_id
    input.approval.approver_role == "supervisor"
    input.approval.timestamp > time.now_ns() - (3600 * 1e9)  # Within 1 hour
}

# Bed management admins can assign any bed
allow {
    input.action == "assign_bed"
    input.user.role == "bed_management_admin"
}

# Physicians can view bed availability
allow {
    input.action == "view_beds"
    input.user.role in ["attending_physician", "resident"]
}

# Transfer requires current assignment ownership
allow {
    input.action == "transfer_patient"
    input.user.role == "nurse"
    owns_current_assignment(input.user, input.patient.current_bed)
}

owns_current_assignment(user, bed) {
    assignment := data.bed_assignments[bed]
    assignment.assigned_by_unit == user.assigned_unit
}
```

### Revenue Cycle Policy

```rego
package hms.revenue_cycle

import future.keywords.in

default allow = false

# Billing specialists can view charges for their facility
allow {
    input.action == "view_charges"
    input.user.role == "billing_specialist"
    input.account.facility_id == input.user.facility_id
}

# Billing specialists can submit claims
allow {
    input.action == "submit_claim"
    input.user.role == "billing_specialist"
    input.claim.status == "ready_for_submission"
    all_codes_reviewed(input.claim)
}

# HIM coders can only modify coding assignments
allow {
    input.action == "modify_coding"
    input.user.role == "him_coder"
    input.coding.coder_reviewed == false
}

# HIM coders cannot modify after final billing
allow {
    input.action == "modify_coding"
    input.user.role == "him_coder"
    input.account.status != "final_billed"
}

# Supervisors can override denial holds
allow {
    input.action == "override_denial_hold"
    input.user.role == "billing_supervisor"
    input.override_reason != ""
}

all_codes_reviewed(claim) {
    codings := data.coding_assignments[claim.encounter_id]
    count([c | c := codings[_]; c.coder_reviewed == true]) == count(codings)
}
```

### EMPI Access Policy

```rego
package hms.empi

import future.keywords.in

default allow = false

# Registration clerks can search and create patients
allow {
    input.action in ["search_patient", "create_patient"]
    input.user.role == "registration_clerk"
}

# EMPI admins have full access
allow {
    input.action in ["search_patient", "create_patient", "merge_patients", "unmerge_patients", "view_audit"]
    input.user.role == "empi_administrator"
}

# Merge operations require dual approval
allow {
    input.action == "merge_patients"
    input.user.role == "empi_administrator"
    count(input.approvals) >= 2
    all_approvers_valid(input.approvals)
}

# Clinical staff can search but not modify
allow {
    input.action == "search_patient"
    input.user.role in ["attending_physician", "resident", "nurse"]
}

all_approvers_valid(approvals) {
    valid_approvals := [a | a := approvals[_]; a.approver_role == "empi_administrator"; a.timestamp > time.now_ns() - (24 * 3600 * 1e9)]
    count(valid_approvals) >= 2
}
```

---

## Encryption Strategy

### Encryption at Rest

| Data Type | Encryption | Key Management | Notes |
|-----------|------------|----------------|-------|
| **Database (PostgreSQL)** | AES-256-GCM (TDE) | HSM-backed | Automatic, transparent |
| **Redis** | AES-256 (encrypted cluster) | KMS | Requires Redis Enterprise |
| **Object Storage** | AES-256 (SSE-KMS) | KMS | Server-side encryption |
| **Backups** | AES-256 | Offline master key | Geographic separation |
| **Audit Logs** | AES-256 | Immutable key | Write-once storage |

### Field-Level Encryption

```sql
-- Sensitive fields encrypted at application level
CREATE TABLE patient_master (
    empi_id UUID PRIMARY KEY,
    golden_record JSONB NOT NULL,
    -- Encrypted fields within golden_record:
    -- ssn_encrypted: AES-256-GCM encrypted, separate key
    -- financial_data_encrypted: AES-256-GCM encrypted
    ssn_encrypted BYTEA,  -- Encrypted SSN for indexing
    ssn_hash VARCHAR(64), -- SHA-256 hash for exact match lookup
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field encryption in application layer
FUNCTION encrypt_ssn(ssn_plaintext):
    key = kms.get_key("patient-ssn-encryption-key")
    nonce = generate_random_nonce(12)
    ciphertext = aes_gcm_encrypt(key, nonce, ssn_plaintext)
    RETURN base64_encode(nonce || ciphertext)

FUNCTION decrypt_ssn(ssn_encrypted):
    key = kms.get_key("patient-ssn-encryption-key")
    data = base64_decode(ssn_encrypted)
    nonce = data[0:12]
    ciphertext = data[12:]
    RETURN aes_gcm_decrypt(key, nonce, ciphertext)
```

### Encryption in Transit

| Connection | Protocol | Certificate |
|------------|----------|-------------|
| Client → API Gateway | TLS 1.3 | Public CA (Let's Encrypt) |
| API Gateway → Services | mTLS | Internal CA |
| Service → Database | TLS 1.2 + cert pinning | Internal CA |
| Service → Redis | TLS 1.2 | Internal CA |
| Service → Kafka | TLS 1.2 + SASL | Internal CA |
| Cross-region replication | TLS 1.3 | Internal CA |

### Key Hierarchy

```
                    ┌─────────────────────────────┐
                    │   Root Key (HSM)            │
                    │   FIPS 140-2 Level 3        │
                    └─────────────┬───────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
            ▼                     ▼                     ▼
    ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
    │  Tenant KEK   │     │  Tenant KEK   │     │  Tenant KEK   │
    │  Hospital A   │     │  Hospital B   │     │  Hospital C   │
    └───────┬───────┘     └───────────────┘     └───────────────┘
            │
    ┌───────┼───────────────────────┐
    │       │                       │
    ▼       ▼                       ▼
┌───────┐ ┌───────┐           ┌───────────┐
│DEK-DB │ │DEK-   │           │DEK-Field  │
│       │ │Audit  │           │(SSN, etc.)│
└───────┘ └───────┘           └───────────┘

Key Rotation:
  - Root Key: Annual (manual ceremony)
  - Tenant KEK: 90 days
  - DEK: 30 days (automatic)
  - Field Keys: 90 days
```

---

## Threat Model

### STRIDE Analysis

| Threat | Component | Attack Vector | Mitigation |
|--------|-----------|---------------|------------|
| **Spoofing** | Authentication | Stolen credentials | MFA, session management, IP allowlisting |
| **Spoofing** | EMPI | Fake patient registration | Identity proofing, audit trail |
| **Tampering** | Bed assignments | Unauthorized changes | Audit log, RBAC, digital signature |
| **Tampering** | Billing codes | Upcoding fraud | AI detection, dual review |
| **Repudiation** | ADT actions | Deny performing action | Immutable audit log, digital signature |
| **Info Disclosure** | Patient data | Unauthorized PHI access | RBAC, field encryption, logging |
| **Info Disclosure** | Billing data | Financial data leak | Encryption, access controls |
| **DoS** | API Gateway | Volumetric attack | WAF, rate limiting, DDoS protection |
| **DoS** | Bed Management | Resource exhaustion | Circuit breaker, queue limits |
| **Elevation** | Admin functions | Privilege escalation | Least privilege, approval workflows |

### Attack Tree: Unauthorized PHI Access

```
GOAL: Access patient PHI without authorization

├─ 1. Credential Theft
│   ├─ 1.1 Phishing attack on staff [MEDIUM risk]
│   │   └─ Mitigation: Security awareness training, MFA
│   ├─ 1.2 Brute force authentication [LOW risk]
│   │   └─ Mitigation: Account lockout, rate limiting
│   └─ 1.3 Session hijacking [LOW risk]
│       └─ Mitigation: Secure cookies, short session TTL

├─ 2. Insider Threat
│   ├─ 2.1 Authorized user exceeds role [MEDIUM risk]
│   │   └─ Mitigation: RBAC, audit logging, access reviews
│   ├─ 2.2 Admin abuse [HIGH risk]
│   │   └─ Mitigation: Separation of duties, audit, approval workflows
│   └─ 2.3 Former employee access [LOW risk]
│       └─ Mitigation: Immediate deprovisioning, access reviews

├─ 3. Application Vulnerability
│   ├─ 3.1 SQL injection [LOW risk]
│   │   └─ Mitigation: Parameterized queries, WAF
│   ├─ 3.2 API authorization bypass [MEDIUM risk]
│   │   └─ Mitigation: OPA policies, penetration testing
│   └─ 3.3 IDOR (Insecure Direct Object Reference) [MEDIUM risk]
│       └─ Mitigation: Authorization checks on all resources

├─ 4. Infrastructure Attack
│   ├─ 4.1 Database breach [LOW risk]
│   │   └─ Mitigation: Encryption at rest, network isolation
│   ├─ 4.2 Backup theft [LOW risk]
│   │   └─ Mitigation: Encrypted backups, access controls
│   └─ 4.3 Log data exposure [MEDIUM risk]
│       └─ Mitigation: PHI redaction in logs, log encryption

└─ 5. Third-Party Compromise
    ├─ 5.1 Integration partner breach [MEDIUM risk]
    │   └─ Mitigation: BAAs, security assessments, data minimization
    └─ 5.2 Supply chain attack [LOW risk]
        └─ Mitigation: Vendor security reviews, SBOMs
```

### DDoS Protection

```
LAYER 1: Edge (CDN/WAF)
  - Geographic filtering (block non-service countries)
  - Bot detection and CAPTCHA
  - Rate limiting: 1000 req/min per IP
  - Scrubbing center for volumetric attacks

LAYER 2: API Gateway
  - Per-client rate limiting: 100 req/min
  - Request size limits: 10 MB max
  - Slow loris protection: 30s timeout
  - Connection limits per IP: 50

LAYER 3: Application
  - Circuit breakers on downstream services
  - Request prioritization (clinical > administrative)
  - Queue-based load leveling
  - Graceful degradation to cached responses

LAYER 4: Database
  - Connection pooling limits
  - Query timeout: 30s
  - Read replica routing for queries
```

---

## Audit and Compliance Monitoring

### Audit Log Schema

```sql
CREATE TABLE audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL,
    -- Types: ACCESS, MODIFY, DELETE, EXPORT, PRINT, LOGIN, LOGOUT, PERMISSION_CHANGE
    actor_id VARCHAR(100) NOT NULL,
    actor_type VARCHAR(20) NOT NULL,  -- USER, SERVICE, SYSTEM
    actor_role VARCHAR(50),
    actor_ip INET,
    actor_device_id VARCHAR(100),
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    patient_empi UUID,  -- If action involves a patient
    action VARCHAR(100) NOT NULL,
    action_result VARCHAR(20) NOT NULL,  -- SUCCESS, FAILURE, DENIED
    request_id UUID,  -- Correlation ID
    details JSONB,
    -- details includes: before_state, after_state, reason, etc.

    -- Immutability: No UPDATE or DELETE allowed
    -- Enforced via database permissions and application logic
);

-- Partitioned by month for efficient querying and retention
CREATE TABLE audit_log_2024_01 PARTITION OF audit_log
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Indexes for common queries
CREATE INDEX idx_audit_patient ON audit_log(patient_empi, timestamp DESC);
CREATE INDEX idx_audit_actor ON audit_log(actor_id, timestamp DESC);
CREATE INDEX idx_audit_type ON audit_log(event_type, timestamp DESC);
```

### Compliance Dashboard Metrics

```
REAL-TIME COMPLIANCE METRICS:

Access Monitoring:
  - PHI access count (last 24h): 15,234
  - Unique users accessing PHI: 1,245
  - Break-the-glass events: 3 (requires review)
  - Failed access attempts: 47
  - Access outside normal hours: 12%

Audit Completeness:
  - Events logged vs. expected: 100%
  - Log delivery latency (p99): 2.3s
  - Missing correlation IDs: 0%

Policy Violations:
  - RBAC violations detected: 5 (blocked)
  - Unusual access patterns: 12 (flagged for review)
  - Data export without approval: 0

Encryption Status:
  - Databases encrypted: 100%
  - Backups encrypted: 100%
  - In-transit encryption: 100%

Accreditation Readiness:
  - HIPAA controls compliant: 98% (2 remediation in progress)
  - NABH standards met: 95%
  - Last audit finding closure: 15 days ago
```

### Automated Compliance Checks

```yaml
# Compliance Check Automation
compliance_checks:
  - name: "PHI access logging"
    frequency: "continuous"
    check: "All PHI access events have audit log entries"
    alert_on_failure: true
    severity: "critical"

  - name: "Encryption at rest"
    frequency: "daily"
    check: "All databases have TDE enabled"
    alert_on_failure: true
    severity: "critical"

  - name: "Access review completion"
    frequency: "quarterly"
    check: "All user access reviewed by manager"
    alert_on_failure: true
    severity: "high"

  - name: "MFA enforcement"
    frequency: "hourly"
    check: "No authentication events without MFA"
    alert_on_failure: true
    severity: "critical"

  - name: "Backup encryption"
    frequency: "daily"
    check: "All backups encrypted with current key"
    alert_on_failure: true
    severity: "high"

  - name: "Patch compliance"
    frequency: "weekly"
    check: "All systems patched within 30 days of release"
    alert_on_failure: true
    severity: "medium"
```

---

## Incident Response

### Breach Response Procedure

```
BREACH RESPONSE RUNBOOK

PHASE 1: DETECTION & CONTAINMENT (0-4 hours)
  □ Identify scope of breach
  □ Isolate affected systems
  □ Preserve evidence (forensic image)
  □ Activate incident response team
  □ Notify CISO and legal

PHASE 2: INVESTIGATION (4-24 hours)
  □ Determine root cause
  □ Identify affected patients
  □ Assess data types compromised
  □ Document timeline

PHASE 3: NOTIFICATION (24-72 hours)
  □ Prepare breach notification
  □ Notify regulators (per jurisdiction):
    - HIPAA: HHS within 60 days
    - GDPR: Supervisory authority within 72 hours
    - NABH: Accreditation body within 24 hours
  □ Notify affected individuals
  □ Media statement (if required)

PHASE 4: REMEDIATION (72 hours - 30 days)
  □ Implement fixes
  □ Conduct penetration testing
  □ Update policies and training
  □ Document lessons learned

PHASE 5: POST-INCIDENT (30-90 days)
  □ Complete incident report
  □ Regulatory follow-up
  □ Process improvements
  □ Executive briefing
```

### Security Incident Severity Levels

| Level | Definition | Response Time | Examples |
|-------|------------|---------------|----------|
| **P1 - Critical** | Active breach, PHI exposed | 15 minutes | Data exfiltration, ransomware |
| **P2 - High** | Potential breach, system compromised | 1 hour | Unauthorized access detected |
| **P3 - Medium** | Security vulnerability discovered | 4 hours | Unpatched CVE, misconfig |
| **P4 - Low** | Policy violation, minor issue | 24 hours | Failed login spike, audit finding |
