# Security and Compliance

## Multi-Framework Compliance Matrix

### Global Healthcare Compliance Requirements

| Requirement | HIPAA (USA) | GDPR (EU) | HITECH | ABDM (India) | NHS (UK) | LGPD (Brazil) | Australia |
|-------------|-------------|-----------|--------|--------------|----------|---------------|-----------|
| **Encryption at Rest** | AES-256 | Required | AES-256 | Required | Required | Required | Required |
| **Encryption in Transit** | TLS 1.2+ | TLS 1.2+ | TLS 1.2+ | TLS 1.2+ | TLS 1.3 | TLS 1.2+ | TLS 1.2+ |
| **Audit Log Retention** | 6 years | Per purpose | 6 years | 3 years | 8 years | 5 years | 7 years |
| **Breach Notification** | 60 days | 72 hours | 60 days | 72 hours | 72 hours | 72 hours | 30 days |
| **Data Residency** | No mandate | Within EU | No mandate | Within India | Within UK | Within Brazil | Preferred AU |
| **Right to Access** | 30 days | 30 days | 30 days | 30 days | 30 days | 15 days | 30 days |
| **Right to Erasure** | Limited | Yes | Limited | Yes | Yes | Yes | Yes |
| **Consent Required** | Treatment exempt | Explicit | Treatment exempt | Explicit | Explicit | Explicit | Explicit |
| **De-identification** | Safe Harbor / Expert | Pseudonymization | Safe Harbor | De-identification | Anonymization | Anonymization | De-identification |
| **Minimum Necessary** | Required | Data minimization | Required | Purpose limitation | Purpose limitation | Purpose limitation | Purpose limitation |
| **BAA/DPA Required** | Yes (BAA) | Yes (DPA) | Yes (BAA) | Yes | Yes (DPA) | Yes | Yes |
| **Penalties (Max)** | $1.5M/year/violation | €20M or 4% revenue | $1.5M/year | ₹250 crore | £17.5M or 4% | 2% revenue | $2.2M AUD |

### Compliance Implementation

```
COMPLIANCE ENGINE ARCHITECTURE:

┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMPLIANCE ENGINE                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    POLICY REPOSITORY                                 │   │
│  │  ├── hipaa_policy.rego                                              │   │
│  │  ├── gdpr_policy.rego                                               │   │
│  │  ├── hitech_policy.rego                                             │   │
│  │  ├── abdm_policy.rego                                               │   │
│  │  ├── nhs_policy.rego                                                │   │
│  │  ├── lgpd_policy.rego                                               │   │
│  │  └── au_privacy_policy.rego                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    TENANT CONFIGURATION                              │   │
│  │  {                                                                  │   │
│  │    "tenant_id": "hospital-123",                                     │   │
│  │    "primary_jurisdiction": "USA",                                   │   │
│  │    "applicable_frameworks": ["HIPAA", "HITECH", "STATE_CA"],        │   │
│  │    "data_residency": "US-EAST",                                     │   │
│  │    "audit_retention_years": 6,                                      │   │
│  │    "breach_notification_hours": 60,                                 │   │
│  │    "consent_model": "opt-out-treatment",                            │   │
│  │    "de_identification_standard": "hipaa-safe-harbor"                │   │
│  │  }                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    POLICY DECISION POINT (OPA)                       │   │
│  │  -- Evaluates all applicable policies                               │   │
│  │  -- Returns most restrictive result                                 │   │
│  │  -- Provides audit trail of decisions                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

SAMPLE OPA POLICY (GDPR):

package gdpr

import future.keywords.if
import future.keywords.in

default allow := false

# Allow access if valid consent exists
allow if {
    input.purpose in ["treatment", "vital_interests"]
    valid_consent_exists
}

allow if {
    input.purpose == "research"
    explicit_research_consent_exists
    data_is_pseudonymized
}

valid_consent_exists if {
    consent := data.consents[input.patient_id]
    consent.status == "active"
    consent.scope == "patient-privacy"
    time.now_ns() < time.parse_rfc3339_ns(consent.period.end)
    input.actor in consent.authorized_actors
}

# Data subject rights
must_honor_access_request if {
    input.request_type == "data_subject_access"
    time.now_ns() - input.request_timestamp < 30 * 24 * 60 * 60 * 1000000000  # 30 days
}

must_honor_erasure_request if {
    input.request_type == "erasure"
    not input.data_required_for_legal_obligation
    not input.data_required_for_public_health
}

# Breach notification requirement
breach_notification_required if {
    input.event_type == "data_breach"
    input.risk_to_rights_and_freedoms == "high"
    notification_deadline := time.add_date(input.breach_discovery_time, 0, 0, 3)  # 72 hours
}
```

---

## Authentication and Authorization

### Authentication Architecture

```
AUTHENTICATION STACK:

┌─────────────────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  IDENTITY PROVIDERS:                                                        │
│  ├── Hospital IdP (SAML 2.0, OIDC)                                         │
│  ├── National Health ID (ABDM, NHS Login)                                  │
│  ├── Patient Portal (OIDC)                                                 │
│  └── Service Accounts (mTLS, API Keys)                                     │
│                                                                             │
│  AUTHENTICATION METHODS:                                                    │
│  ├── Username/Password + MFA (standard users)                              │
│  ├── PIV/CAC Smart Cards (government healthcare)                           │
│  ├── FIDO2 Hardware Keys (privileged access)                               │
│  ├── Biometric (break-the-glass override)                                  │
│  └── Certificate-based (system-to-system)                                  │
│                                                                             │
│  MFA REQUIREMENTS:                                                          │
│  ├── All clinical data access: MFA required                                │
│  ├── Administrative functions: MFA required                                │
│  ├── Patient portal: MFA optional (encouraged)                             │
│  └── Break-the-glass: Enhanced MFA (biometric + PIN)                       │
│                                                                             │
│  SESSION MANAGEMENT:                                                        │
│  ├── Session timeout: 15 minutes (clinical), 30 minutes (admin)            │
│  ├── Absolute timeout: 12 hours                                            │
│  ├── Concurrent sessions: Limited by role                                  │
│  └── Session binding: IP + User-Agent fingerprint                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Authorization Model

```
AUTHORIZATION LAYERS:

LAYER 1: SMART ON FHIR SCOPES
  -- API-level authorization based on OAuth 2.0 scopes

  Scope Syntax: <context>/<resource>.<permission>
  Contexts: patient | user | system
  Resources: Patient | Observation | MedicationRequest | * | ...
  Permissions: read | write | *

  Examples:
    patient/Observation.read     -- Read observations for launch patient
    user/MedicationRequest.write -- Write medication orders
    system/*.read                -- Backend system read all

LAYER 2: ROLE-BASED ACCESS CONTROL (RBAC)
  -- Organization-level authorization

  Roles:
    ├── Attending Physician
    │   └── Full clinical access to assigned patients
    ├── Resident Physician
    │   └── Clinical access with supervision requirements
    ├── Registered Nurse
    │   └── Clinical access, limited ordering
    ├── Medical Assistant
    │   └── Limited clinical access, no orders
    ├── Billing Staff
    │   └── Billing-related data only
    ├── Health Information Manager
    │   └── Record management, no clinical decisions
    └── System Administrator
        └── Technical access, no clinical data

LAYER 3: ATTRIBUTE-BASED ACCESS CONTROL (ABAC)
  -- Context-aware authorization

  Attributes:
    ├── Treatment Relationship
    │   └── Is this user part of patient's care team?
    ├── Department/Unit
    │   └── Is user in same department as patient?
    ├── Time of Day
    │   └── Is access during normal work hours?
    ├── Location
    │   └── Is user on-site or remote?
    ├── Emergency Status
    │   └── Is patient in critical condition?
    └── Data Sensitivity
        └── Is this specially protected data (HIV, mental health)?

LAYER 4: CONSENT-BASED ACCESS CONTROL
  -- Patient-level authorization

  Evaluates FHIR Consent provisions:
    ├── Purpose alignment (treatment, research, etc.)
    ├── Actor authorization (specific providers, organizations)
    ├── Data class restrictions (exclude certain resource types)
    └── Code-level restrictions (exclude specific tests/diagnoses)

AUTHORIZATION FLOW:

  REQUEST --> SMART Scope Check
                  │
                  ├── FAIL --> 403 Forbidden (insufficient scope)
                  │
                  └── PASS --> RBAC Check
                                  │
                                  ├── FAIL --> 403 Forbidden (role not authorized)
                                  │
                                  └── PASS --> ABAC Check
                                                  │
                                                  ├── FAIL --> 403 Forbidden (context violation)
                                                  │
                                                  └── PASS --> Consent Check
                                                                  │
                                                                  ├── DENY --> 403 (no consent)
                                                                  │           or BTG option
                                                                  │
                                                                  └── PERMIT --> Allow
                                                                          (with filters if needed)
```

### Token Management

```
TOKEN ARCHITECTURE:

ACCESS TOKEN (JWT):
  {
    "iss": "https://auth.ehr.example.com",
    "sub": "Practitioner/dr-smith-456",
    "aud": "https://api.ehr.example.com/fhir/r4",
    "exp": 1706054400,  // 1 hour
    "iat": 1706050800,
    "jti": "unique-token-id",

    // SMART on FHIR claims
    "patient": "Patient/123",  // Launch context
    "encounter": "Encounter/456",
    "scope": "launch patient/*.read user/MedicationRequest.write",

    // Custom claims
    "tenant_id": "hospital-789",
    "roles": ["attending_physician"],
    "department": "cardiology",
    "mfa_verified": true,
    "mfa_method": "fido2"
  }

REFRESH TOKEN:
  -- Stored server-side, opaque to client
  -- Longer lifetime (8-24 hours)
  -- Rotation on each use
  -- Revocable

TOKEN SECURITY:
  ├── Signing: RS256 (RSA with SHA-256)
  ├── Key rotation: Every 24 hours
  ├── Token revocation: Immediate via revocation list
  ├── Introspection: Available for resource servers
  └── Token binding: Optional (for high-security)

BREAK-THE-GLASS TOKEN:
  {
    "type": "btg",
    "sub": "Practitioner/dr-smith-456",
    "patient": "Patient/123",
    "reason": "life_threatening_emergency",
    "justification": "Patient unconscious, need medication history",
    "exp": 1706065200,  // 4 hours max
    "iat": 1706050800,
    "mfa_method": "biometric",
    "review_required": true,
    "review_due": 1706223600  // 48 hours
  }
```

---

## Data Security

### Encryption Architecture

```
ENCRYPTION LAYERS:

┌─────────────────────────────────────────────────────────────────────────────┐
│                      ENCRYPTION STRATEGY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ENCRYPTION IN TRANSIT:                                                     │
│  ├── External: TLS 1.3 (minimum TLS 1.2)                                   │
│  ├── Internal: mTLS between all services                                   │
│  ├── Database: TLS with certificate pinning                                │
│  └── Message queue: TLS + message-level encryption                         │
│                                                                             │
│  ENCRYPTION AT REST:                                                        │
│  ├── Database: AES-256-GCM (transparent encryption)                        │
│  ├── Object storage: AES-256 with SSE-KMS                                  │
│  ├── Backups: AES-256 with offline master key                              │
│  └── Logs: AES-256 (audit logs immutable after encryption)                 │
│                                                                             │
│  FIELD-LEVEL ENCRYPTION (PHI):                                              │
│  ├── SSN: Always encrypted, never logged                                   │
│  ├── Genetic data: Separate encryption key                                 │
│  ├── Mental health notes: Restricted key access                            │
│  ├── Substance abuse records: Part 2 compliant encryption                  │
│  └── HIV status: Specially protected, separate key                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

KEY HIERARCHY:

  Master Key (HSM)
      │
      ├── Tenant Key Encryption Key (KEK)
      │       │
      │       ├── Data Encryption Key (DEK) - Clinical Data
      │       ├── Data Encryption Key (DEK) - Audit Logs
      │       └── Data Encryption Key (DEK) - Backups
      │
      └── Field Encryption Keys
              │
              ├── PHI Field Key - SSN
              ├── PHI Field Key - Genetic
              ├── PHI Field Key - Mental Health
              └── PHI Field Key - HIV Status

KEY MANAGEMENT:

  key_rotation_policy:
    master_key: manual (on compromise or annually)
    tenant_kek: 90 days
    dek: 30 days
    field_keys: 90 days

  key_storage:
    production: HSM (FIPS 140-2 Level 3)
    development: Software vault (encrypted)
    backup: Offline, geographically distributed

  key_access:
    master_key: 3-of-5 key custodians
    tenant_kek: Automated (service identity)
    dek: Automated (service identity)
    field_keys: Role-based (privileged access only)
```

### De-identification Standards

```
DE-IDENTIFICATION METHODS:

HIPAA SAFE HARBOR (18 Identifiers Removed):
  1. Names
  2. Geographic data (smaller than state)
  3. Dates (except year) related to individual
  4. Phone numbers
  5. Fax numbers
  6. Email addresses
  7. SSN
  8. Medical record numbers
  9. Health plan beneficiary numbers
  10. Account numbers
  11. Certificate/license numbers
  12. Vehicle identifiers
  13. Device identifiers
  14. URLs
  15. IP addresses
  16. Biometric identifiers
  17. Full-face photographs
  18. Any other unique identifying number

GDPR PSEUDONYMIZATION:
  -- Replace identifiers with pseudonyms
  -- Maintain linking table (separately secured)
  -- Reversible with additional information
  -- Still considered personal data

ANONYMIZATION (GDPR Standard):
  -- Irreversible
  -- No longer personal data
  -- Aggregation (k-anonymity, l-diversity)
  -- Differential privacy

IMPLEMENTATION:

FUNCTION de_identify_for_research(patient_data, method):

    IF method == "safe_harbor":
        -- Remove all 18 HIPAA identifiers
        FOR identifier IN HIPAA_IDENTIFIERS:
            patient_data = remove_field(patient_data, identifier)

        -- Generalize dates to year only
        FOR date_field IN date_fields:
            patient_data[date_field] = extract_year(patient_data[date_field])

        -- Generalize age if > 89
        IF patient_data.age > 89:
            patient_data.age = "90+"

        -- Generalize ZIP to first 3 digits (if population > 20,000)
        patient_data.zip = generalize_zip(patient_data.zip)

    ELSE IF method == "pseudonymization":
        -- Generate pseudonymous identifier
        pseudo_id = generate_pseudonym(patient_data.id)

        -- Store mapping in secure linking table
        store_link(original_id=patient_data.id, pseudo_id=pseudo_id)

        -- Replace identifiers with pseudonyms
        patient_data.id = pseudo_id
        patient_data.mrn = hash(patient_data.mrn)
        patient_data.name = "[PSEUDONYMIZED]"

    ELSE IF method == "anonymization":
        -- Apply k-anonymity
        patient_data = apply_k_anonymity(patient_data, k=5)

        -- Add differential privacy noise
        patient_data = add_dp_noise(patient_data, epsilon=1.0)

    RETURN patient_data
```

---

## Threat Model

### STRIDE Analysis

| Threat | Category | Impact | Likelihood | Mitigation |
|--------|----------|--------|------------|------------|
| Unauthorized PHI access | Spoofing, Tampering | Critical | Medium | MFA, consent enforcement, audit |
| Insider data theft | Information Disclosure | Critical | Medium | ABAC, treatment relationships, alerts |
| Ransomware attack | Denial of Service | Critical | Medium | Immutable backups, network segmentation |
| SQL injection | Tampering | High | Low | Parameterized queries, WAF |
| API abuse | Elevation of Privilege | High | Medium | Rate limiting, anomaly detection |
| Consent bypass | Tampering | Critical | Low | Cryptographic consent verification |
| Audit log tampering | Repudiation | High | Low | Hash chains, blockchain anchoring |
| AI model poisoning | Tampering | Medium | Low | Model validation, secure training |
| Cross-site scripting | Information Disclosure | Medium | Low | CSP, output encoding |
| Man-in-the-middle | Information Disclosure | High | Low | TLS 1.3, certificate pinning |

### Attack Vectors and Mitigations

```
ATTACK VECTOR 1: Unauthorized Access to Patient Records

  Attack Path:
    1. Attacker obtains stolen credentials
    2. Logs into clinical application
    3. Searches for specific patient
    4. Exfiltrates PHI

  Mitigations:
    ├── MFA required for all access
    ├── Treatment relationship verification
    ├── Anomalous access pattern detection
    ├── Real-time alerting on sensitive record access
    └── Automatic session termination on suspicious activity

ATTACK VECTOR 2: Insider Snooping (Curiosity/Malice)

  Attack Path:
    1. Authorized user with legitimate access
    2. Accesses records outside care responsibilities
    3. Views celebrity/acquaintance records

  Mitigations:
    ├── Break-the-glass for non-care relationships
    ├── VIP patient flagging and alerts
    ├── Random audit of access patterns
    ├── Behavioral analytics (ML-based)
    └── Disciplinary consequences (policy)

ATTACK VECTOR 3: Ransomware

  Attack Path:
    1. Phishing email delivers malware
    2. Malware spreads laterally
    3. Encrypts clinical databases
    4. Demands ransom for decryption

  Mitigations:
    ├── Network segmentation (clinical isolated)
    ├── Endpoint detection and response (EDR)
    ├── Immutable backups (air-gapped)
    ├── Regular backup testing
    ├── Incident response plan
    └── Cyber insurance

ATTACK VECTOR 4: API Abuse / Data Scraping

  Attack Path:
    1. Legitimate API credentials obtained
    2. Automated bulk data extraction
    3. Exfiltration of large dataset

  Mitigations:
    ├── Rate limiting per user/tenant
    ├── Anomaly detection on query patterns
    ├── Bulk export requires additional approval
    ├── Data loss prevention (DLP) monitoring
    └── API call logging and analysis

ATTACK VECTOR 5: Supply Chain Attack (AI Model)

  Attack Path:
    1. Compromised AI model introduced
    2. Model produces malicious outputs
    3. Clinical decisions affected

  Mitigations:
    ├── Model provenance verification
    ├── Signed model artifacts
    ├── Model behavior monitoring
    ├── Human-in-the-loop for critical decisions
    └── Rollback capability to previous models
```

### DDoS Protection

```
DDOS PROTECTION LAYERS:

LAYER 1: EDGE / CDN
  ├── Rate limiting at edge
  ├── Geographic filtering
  ├── Bot detection (CAPTCHA for suspicious)
  └── Scrubbing center for volumetric attacks

LAYER 2: API GATEWAY
  ├── Connection limits per IP
  ├── Request rate limits per tenant
  ├── Payload size limits
  └── Slow loris protection (connection timeouts)

LAYER 3: APPLICATION
  ├── Circuit breakers to protect backends
  ├── Request prioritization (clinical over admin)
  ├── Graceful degradation
  └── Queue-based load leveling

RATE LIMITS:

  unauthenticated:
    per_ip: 100 req/min
    burst: 20

  authenticated_user:
    per_user: 1000 req/min
    burst: 100

  service_account:
    per_service: 10000 req/min
    burst: 500

  bulk_operations:
    per_tenant: 10 req/hour
    approval_required: true
```

---

## Compliance Operations

### Breach Detection and Response

```
BREACH DETECTION:

AUTOMATED DETECTION:
  ├── Anomalous access patterns (ML-based)
  ├── Bulk data extraction alerts
  ├── Failed authentication spikes
  ├── Geographic access anomalies
  ├── Off-hours access alerts
  └── Malware/ransomware signatures

BREACH RESPONSE PROCEDURE:

  PHASE 1: DETECTION & CONTAINMENT (0-4 hours)
    1. Alert triggered, incident created
    2. Security team notified
    3. Initial assessment of scope
    4. Contain breach (isolate systems, revoke access)
    5. Preserve evidence

  PHASE 2: INVESTIGATION (4-24 hours)
    1. Determine data affected
    2. Identify affected individuals
    3. Determine root cause
    4. Document timeline

  PHASE 3: NOTIFICATION (24-72 hours)
    1. Notify regulators (per framework requirements)
       - GDPR: 72 hours to DPA
       - HIPAA: 60 days to HHS (or sooner if 500+ individuals)
       - ABDM: 72 hours
    2. Prepare individual notifications
    3. Notify affected individuals

  PHASE 4: REMEDIATION (Ongoing)
    1. Implement fixes
    2. Conduct post-incident review
    3. Update security controls
    4. Document lessons learned

BREACH NOTIFICATION TEMPLATE:

  To: [Affected Individual]
  Subject: Notice of Data Breach

  We are writing to inform you of a security incident that may have
  affected your personal health information.

  What Happened:
    [Description of incident]

  What Information Was Involved:
    [Types of data affected]

  What We Are Doing:
    [Remediation steps]

  What You Can Do:
    [Recommended actions]

  For More Information:
    [Contact details]
```

### Audit and Reporting

```
COMPLIANCE REPORTING:

HIPAA AUDIT REPORTS:
  ├── Access log summary (who accessed what)
  ├── Consent verification reports
  ├── Break-the-glass usage reports
  ├── Security incident reports
  ├── Risk assessment results
  └── Training completion records

GDPR COMPLIANCE REPORTS:
  ├── Data processing activities (Article 30)
  ├── Data subject request log
  ├── Consent records
  ├── Data retention compliance
  ├── Third-party processor agreements
  └── DPIA (Data Protection Impact Assessment)

AUDIT TRAIL REQUIREMENTS:

  MINIMUM LOGGED EVENTS:
    ├── All PHI access (read, write, delete)
    ├── Authentication events (success, failure)
    ├── Authorization decisions
    ├── Consent changes
    ├── Configuration changes
    ├── User provisioning/deprovisioning
    └── Security-relevant events

  AUDIT LOG FIELDS:
    ├── Timestamp (UTC, millisecond precision)
    ├── Actor (user ID, service account)
    ├── Action (CRUD operation)
    ├── Resource (type, ID)
    ├── Patient (if applicable)
    ├── Consent ID (used for decision)
    ├── Outcome (success, failure, filtered)
    ├── Source IP
    ├── Session ID
    └── Correlation ID (request tracing)

  RETENTION:
    ├── Hot storage: 90 days (instant query)
    ├── Warm storage: 1 year (< 1 hour query)
    ├── Cold storage: 6-8 years (archival)
    └── Never delete before retention period

COMPLIANCE DASHBOARD:

  REAL-TIME METRICS:
    ├── Consent verification success rate
    ├── Break-the-glass usage (last 24h)
    ├── Data subject request backlog
    ├── Policy violations detected
    └── Audit log completeness

  PERIODIC REPORTS:
    ├── Monthly: Access summary, consent changes
    ├── Quarterly: Risk assessment, training status
    ├── Annual: Full compliance audit, penetration test
```

### Data Subject Rights Implementation

```
DATA SUBJECT RIGHTS (GDPR / LGPD / DPDP):

RIGHT TO ACCESS:
  -- Patient can request all data held about them

  ENDPOINT: POST /patient/{id}/$data-subject-access
  SLA: 30 days (GDPR), 15 days (LGPD)

  IMPLEMENTATION:
    1. Verify patient identity (strong authentication)
    2. Compile all FHIR resources for patient
    3. Include audit logs of who accessed their data
    4. Generate human-readable summary
    5. Provide in portable format (FHIR Bundle, PDF)

RIGHT TO RECTIFICATION:
  -- Patient can request correction of inaccurate data

  ENDPOINT: POST /patient/{id}/$rectification-request
  SLA: 30 days

  IMPLEMENTATION:
    1. Verify patient identity
    2. Log rectification request
    3. Route to clinical staff for review
    4. If valid: Update data, maintain amendment history
    5. If denied: Document reason, inform patient

RIGHT TO ERASURE (Right to be Forgotten):
  -- Patient can request deletion of their data

  ENDPOINT: POST /patient/{id}/$erasure-request
  SLA: 30 days

  IMPLEMENTATION:
    1. Verify patient identity
    2. Check for legal retention requirements:
       - Active treatment: Cannot erase
       - Legal hold: Cannot erase
       - Public health reporting: Cannot erase (but can restrict)
       - Billing/insurance: 7-year retention required
    3. If erasure allowed:
       - Soft delete (mark as deleted)
       - Remove from active systems
       - Schedule hard delete after retention period
       - Notify third parties of deletion request
    4. If erasure denied: Document reason, inform patient

RIGHT TO DATA PORTABILITY:
  -- Patient can request data in machine-readable format

  ENDPOINT: POST /patient/{id}/$export
  SLA: 30 days

  IMPLEMENTATION:
    1. Verify patient identity
    2. Generate FHIR Bundle (all patient resources)
    3. Include C-CDA document for interoperability
    4. Provide secure download link (encrypted, time-limited)
    5. Log export event

RIGHT TO RESTRICT PROCESSING:
  -- Patient can limit how their data is used

  ENDPOINT: POST /patient/{id}/$restrict-processing
  SLA: Immediate

  IMPLEMENTATION:
    1. Verify patient identity
    2. Create restrictive consent (FHIR Consent with deny provisions)
    3. Immediately enforce restriction
    4. Notify relevant systems
    5. Maintain restriction until patient lifts it
```
