# Security & Compliance — Digital Document Vault Platform

## Threat Model

### Attack Surface Analysis

The platform has a uniquely broad attack surface because it sits at the intersection of citizen identity, government documents, and inter-organizational data sharing:

| Attack Vector | Threat Actor | Risk Level | Impact |
|---|---|---|---|
| **Account Takeover via SIM Swap** | Organized crime | Critical | Attacker gains access to victim's entire document portfolio; can impersonate victim for loans, property transactions |
| **Fraudulent Document Upload** | Individual fraudsters | High | Self-uploaded fake documents used to deceive requesters; undermines platform trust |
| **Issuer API Compromise** | State-sponsored / sophisticated | Critical | Attacker pushes fake documents appearing to come from legitimate issuers; mass identity fraud |
| **Consent Manipulation** | Malicious requesters | High | Tricking subscribers into granting consent for unauthorized purposes; collecting documents for identity theft |
| **Mass Data Exfiltration** | Insider threat / APT | Critical | Extracting millions of citizens' personal documents; national security concern |
| **Certificate Authority Compromise** | State-sponsored | Critical | Forged PKI certificates allow signing fake documents that pass verification |
| **DDoS During Critical Periods** | Hacktivists / state actors | High | Blocking document access during exam admissions, tax filing deadlines |
| **API Abuse by Requesters** | Rogue requesters | Medium | Bulk document harvesting beyond consented scope; selling citizen data |
| **Insider Threat (Platform Admin)** | Malicious insider | Critical | Admin access to subscriber vaults, consent override, audit log tampering |
| **Mobile App Reverse Engineering** | Sophisticated attackers | Medium | Extracting cached documents, authentication tokens, or API keys from decompiled app |

### Threat-Specific Mitigations

**SIM Swap Attack Mitigation:**
The platform has historically been vulnerable to SIM swap attacks (early 2025 incident exposed 38M user profiles). Multi-layered defense:
1. Device binding: After initial MFA setup, associate the subscriber's account with specific device fingerprints
2. New device detection: When a login attempt comes from an unrecognized device, require additional verification beyond OTP (e.g., answering security questions set during registration, biometric, or in-person verification)
3. SIM change detection: Partner with telecom operators to receive SIM change events; trigger account lockdown for 24 hours after a SIM change, requiring re-verification
4. Rate limiting: Max 3 OTP attempts per 10-minute window; account lockout after 5 failed attempts in 24 hours

**Issuer API Compromise Mitigation:**
1. Mutual TLS between the platform and each issuer—both sides verify each other's certificates
2. Document signing certificates are separate from API authentication certificates; compromise of API credentials doesn't allow document forgery
3. Anomaly detection on push patterns: if an issuer that normally pushes 1,000 documents/day suddenly pushes 1,000,000, alert and queue for manual review
4. Certificate pinning for known issuers: the platform maintains a pinned certificate list and rejects documents signed with unexpected certificates

---

## Authentication & Authorization Design

### Subscriber Authentication

```
Authentication Flow:
1. Subscriber enters mobile number
2. Platform sends OTP via SMS gateway (6-digit, 5-minute expiry)
3. Subscriber enters OTP
4. Platform validates OTP and checks device fingerprint
5. IF known device: issue session token (JWT, 30-min expiry for web, 24-hr for mobile)
6. IF unknown device: require secondary verification
   a. Biometric check (fingerprint/face via device sensors) OR
   b. Security question answer OR
   c. Email OTP (if email registered)
7. On success: register new device as trusted, issue session token
8. Step-up authentication for sensitive operations (consent grant, document sharing):
   a. Re-verify with OTP even within active session
   b. 5-minute step-up session for the specific operation
```

### Issuer & Requester Authentication

```
Issuer/Requester Authentication:
1. OAuth 2.0 Client Credentials flow
2. Each organization receives:
   - client_id (public identifier)
   - client_secret (rotated every 90 days, stored as hashed value)
   - API key (for rate limiting and tracking)
3. Mutual TLS required for Push API and document fetch endpoints
4. Access tokens: JWT with 1-hour expiry, scoped to specific operations
5. API key rotation: automatic notification 30 days before expiry;
   grace period of 7 days where both old and new keys work
```

### Authorization Model

```
Role-Based Access Control (RBAC):

Subscriber:
    - View own documents
    - Upload self-documents
    - Grant/revoke consent
    - View activity log
    - Manage devices
    - Delete self-uploaded documents

Issuer:
    - Push documents to subscriber vaults
    - Update/revoke issued documents
    - View issuance analytics (aggregate, not per-subscriber)
    - Manage document schemas

Requester:
    - Request consent from subscribers
    - Fetch documents with valid consent token
    - Verify document authenticity
    - View own access history

Platform Admin:
    - Manage issuer/requester registrations
    - Monitor system health
    - View aggregate analytics
    - CANNOT: access subscriber documents, override consent, modify audit logs
    - All admin actions require MFA + peer approval for sensitive operations
```

---

## Data Protection

### Encryption Architecture

**Data at Rest:**
- All databases encrypted with AES-256 using envelope encryption
- Encryption keys managed by a dedicated Key Management Service (KMS)
- Key hierarchy: Master Key (in HSM) → Data Encryption Keys (per-shard, rotated monthly) → Per-Record Keys (for PII fields)
- Self-uploaded documents: encrypted in object storage with per-subscriber keys
- Subscriber PII fields (name, national ID hash, mobile hash, email) encrypted at the field level within database records

**Data in Transit:**
- TLS 1.3 for all external communication (subscriber apps, issuer APIs, requester APIs)
- Mutual TLS for issuer Push API and requester document fetch
- Internal service-to-service communication encrypted with mTLS
- Certificate pinning in mobile apps to prevent MITM attacks

**Key Rotation:**
```
Key Rotation Schedule:
    Master Key (HSM)         : Annually, with split-knowledge ceremony
    Data Encryption Keys     : Monthly, automatic rotation with zero-downtime re-encryption
    TLS Certificates         : Annually (automated via certificate management platform)
    API Client Secrets       : Every 90 days (organizations notified 30 days in advance)
    JWT Signing Keys         : Weekly rotation with 2-week overlap for token validation
```

### PII Handling

The platform processes sensitive PII at massive scale. Data protection principles:

1. **Data Minimization**: The vault stores document URI references, not document copies. The actual PII in the document lives in the issuer's repository. The vault only stores metadata necessary for document management (title, type, issuer, dates).

2. **Purpose Limitation**: Consent tokens encode the stated purpose. The platform logs the purpose with every document access. Requesters that access documents for purposes different from what was stated in the consent violate the terms and can be reported.

3. **Right to Erasure**: For self-uploaded documents, subscribers can delete at any time. For issuer-pushed documents, the subscriber can "hide" the document from their vault (remove the URI reference), but the document still exists in the issuer's repository. Consent records are retained for the legally mandated period even after document deletion (audit trail requirement).

4. **Pseudonymization**: Internal analytics use pseudonymized subscriber IDs. Aggregate statistics (document access patterns, popular document types) are computed without linking back to individual subscribers.

### Consent Management Under DPDP Act

The Digital Personal Data Protection Act, 2023 (with Rules notified November 2025) creates specific requirements:

| DPDP Requirement | Platform Implementation |
|---|---|
| **Free, specific, informed consent** | Consent request UI shows: requester name, specific documents, stated purpose, duration, access count; subscriber can modify terms before approving |
| **Withdraw consent easily** | One-tap revocation from activity log; instant effect (access tokens invalidated within 1 second) |
| **Purpose limitation** | Consent tokens are scoped to stated purpose; platform cannot enforce purpose after document delivery, but maintains audit trail for regulatory action |
| **Data minimization** | Field-level consent where issuers support it; for example, a requester needing only income verification gets only the gross income field, not the full tax return |
| **Consent Manager registration** | Platform registered as a Consent Manager under DPDP Rules (registration process effective November 2026) |
| **Breach notification** | Automated breach detection and notification pipeline; notify Data Protection Board and affected subscribers within 72 hours |
| **Children's data protection** | Enhanced consent for subscribers under 18; parental consent required; verified via DPDP-prescribed mechanisms (DigiLocker itself is specified as a parental consent verification platform in the DPDP Rules) |
| **Significant Data Fiduciary obligations** | Platform designated as SDF given 550M+ users; annual data audit, Data Protection Impact Assessment, Data Protection Officer appointment required |

---

## Compliance Requirements

### IT Act Section 9 - Legal Equivalence

Documents issued through the platform and accessed via the standardized URI mechanism carry legal equivalence to physical originals. This requires:

1. **Non-repudiation**: The issuer cannot deny having issued the document (PKI signature proves issuance)
2. **Integrity**: The document has not been modified since issuance (hash verification proves integrity)
3. **Authenticity**: The document was issued by the claimed issuer (certificate chain verification proves authenticity)
4. **Timestamping**: The issuance time is provably established (trusted timestamp authority)

### MeitY Guidelines for Digital Platforms

| Guideline | Implementation |
|---|---|
| **Data localization** | All data stored in nationally located data centers; no cross-border transfer of document content |
| **Security audit** | Annual security audit by CERT-In empaneled auditor; penetration testing quarterly |
| **ISO compliance** | ISO 27001:2022 (information security), ISO 20000 (IT service management), ISO 27034 (application security) |
| **Accessibility** | WCAG 2.1 AA compliance; support for screen readers; USSD access for feature phones |
| **Incident response** | CERT-In notification within 6 hours of a security incident; subscriber notification within 24 hours |

---

## Audit and Non-Repudiation

### Immutable Audit Trail

Every action on the platform generates an audit event signed with an HMAC using a key stored in the HSM:

```
Audit Event Structure:
{
    event_id: UUID
    event_type: "DOCUMENT_ACCESSED"
    timestamp: "2026-03-10T14:30:00.000Z"  (NTP-synchronized)
    actor: { type: "REQUESTER", id: "BANK-XYZ" }
    subject: { subscriber_id: "uuid", document_id: "uuid" }
    consent: { consent_id: "uuid", purpose: "KYC" }
    context: { ip: "203.0.113.xxx", device: "API", session: "uuid" }
    hmac: "sha256-hmac-of-above-fields"
}
```

**Tamper Detection**: Audit events are chained using hash linking (each event includes the hash of the previous event in the subscriber's audit chain). Tampering with any event breaks the hash chain, making modifications detectable.

**Retention**: Audit logs retained for 7 years per regulatory requirement. Older logs archived to immutable storage (write-once-read-many) with integrity verification during archival.

### Non-Repudiation Guarantees

| Party | Cannot Deny | Proof Mechanism |
|---|---|---|
| **Issuer** | Having issued a document | Document's digital signature verified against issuer's PKI certificate |
| **Subscriber** | Having granted consent | Consent record with step-up MFA verification; device fingerprint |
| **Requester** | Having accessed a document | Audit log entry with requester's API credentials, IP, timestamp, HMAC |
| **Platform** | Having facilitated the access | Platform's countersignature on the audit event; hash-chained audit trail |

### Forensic Readiness

The platform maintains forensic readiness for investigations:
1. **Evidence preservation**: Audit logs stored in immutable storage with cryptographic integrity
2. **Chain of custody**: Every access to audit logs for investigation purposes is itself logged
3. **Expert witness support**: Verification reports include all cryptographic evidence needed for legal proceedings (signature, certificate chain, CRL status at time of verification, platform attestation)
4. **Cross-reference capability**: Audit events can be correlated by subscriber, requester, document, consent, or time window for pattern analysis during investigations
