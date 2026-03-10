# 14.14 AI-Native Regulatory & Compliance Assistant for MSMEs — Security & Compliance

## The Meta-Compliance Challenge

A compliance management platform must itself be compliant. This creates a unique recursive requirement: the system that tracks whether businesses meet their regulatory obligations must meet its own regulatory obligations—data protection laws, information security standards, intermediary liability rules, and financial data handling requirements. A security breach in a compliance platform is doubly damaging: it compromises sensitive business data and simultaneously undermines the trust foundation that the platform's entire value proposition rests on.

---

## Data Classification and Protection

### Data Sensitivity Tiers

| Tier | Data Types | Protection Requirements |
|---|---|---|
| **Critical** | GST credentials, PAN numbers, bank account details, digital signatures | Encrypted at rest with envelope encryption; access logged and alerted; never cached in plaintext; field-level encryption in database |
| **Sensitive** | Filing data, financial figures (turnover, tax paid), employee counts, salary data | Encrypted at rest; access controlled by role; audit logged; retained per statutory requirements |
| **Confidential** | Business profiles, compliance calendars, obligation maps | Encrypted at rest; tenant-isolated access; no cross-tenant data leakage |
| **Internal** | Regulatory text (public information), knowledge graph, system configuration | Standard encryption at rest; broadly accessible within the platform |

### Encryption Architecture

```
Encryption Layers:
├── Transport: TLS 1.3 for all API communication
│   ├── Certificate pinning for mobile apps
│   ├── Mutual TLS for inter-service communication
│   └── HSTS headers with 1-year max-age
│
├── Storage: Envelope encryption with per-tenant keys
│   ├── Master Key: Hardware security module (HSM)
│   ├── Data Encryption Key (DEK): Per-tenant, per-data-class
│   ├── DEK encrypted by master key (key wrapping)
│   └── Key rotation: DEKs rotated quarterly; master key rotated annually
│
├── Field-Level: Critical fields encrypted at application layer
│   ├── GSTIN, PAN: Encrypted with searchable encryption (deterministic for exact match)
│   ├── Bank details: Encrypted with non-deterministic encryption (no search needed)
│   └── Digital signatures: Encrypted and access-logged
│
└── Document Vault: Content encryption + integrity
    ├── Each document encrypted with unique DEK
    ├── Content hash (SHA-256) computed before encryption
    ├── Hash stored separately from encrypted content
    └── Integrity verification: decrypt → recompute hash → compare
```

### Tenant Data Isolation

```
Isolation Enforcement Points:
├── API Layer
│   ├── JWT token includes business_id claim
│   ├── Every API request validated: requested resource belongs to token's business_id
│   └── Cross-tenant access attempt → 403 + security alert
│
├── Database Layer
│   ├── Row-level security policies enforce business_id filtering
│   ├── Database connection pool per service (not per tenant)
│   ├── Query auditing: flag queries without business_id filter
│   └── Periodic cross-tenant leakage testing (synthetic businesses)
│
├── Document Storage Layer
│   ├── Object path: /{business_id}/{year}/{document_id}
│   ├── Pre-signed URLs scoped to business_id prefix
│   ├── No listing permission—documents accessed by ID only
│   └── Cross-business document access → immediate security incident
│
└── Search Layer
    ├── Search queries always include business_id filter
    ├── Index-level: documents tagged with business_id
    ├── Query-time filtering (not index-time partitioning) for cost efficiency
    └── Periodic audit: verify search results never leak cross-tenant data
```

---

## Authentication and Authorization

### Authentication Framework

```
Authentication Flows:
├── Business Owner / Admin
│   ├── Mobile OTP (primary): Phone number + OTP via SMS/WhatsApp
│   ├── Email + Password (secondary): For web access
│   └── Biometric (optional): Fingerprint/face on mobile for quick access
│
├── Accountant / CA
│   ├── Invited via business owner with email verification
│   ├── Independent login credentials (not shared with business)
│   └── CA can be linked to multiple businesses (multi-tenant access)
│
├── API Integration (Accounting Software / Payroll)
│   ├── OAuth 2.0 with PKCE for third-party integrations
│   ├── Scoped access tokens (read-only financial data, no document access)
│   └── Token refresh rotation to prevent token theft
│
└── WhatsApp Bot
    ├── Phone number verification via WhatsApp Business API
    ├── Session-based authentication (24-hour window)
    └── Sensitive operations (filing submission) require re-verification
```

### Role-Based Access Control

| Role | Profile | Calendar | Documents | Filing | Audit | Settings |
|---|---|---|---|---|---|---|
| **Owner** | Full access | Full access | Full access | Approve & submit | Full access | Full access |
| **Admin** | Edit | Full access | Full access | Prepare & submit | Full access | Limited |
| **Accountant** | View | Full access | Upload & view | Prepare (not submit) | Full access | None |
| **HR Manager** | View (limited) | Labor law only | Labor docs only | Prepare (labor) | Labor audit only | None |
| **Viewer** | View | View | View | None | View | None |

### Sensitive Operation Controls

```
Operations Requiring Additional Verification:
├── Filing submission to government portal → OTP verification + owner approval
├── Document deletion → Soft delete only; hard delete requires owner + 7-day waiting period
├── Business parameter change (affects obligations) → Confirmation + audit log
├── Accountant invitation/removal → Owner-only with OTP
├── Data export → Rate-limited; owner-only; logged
└── Account deletion → 30-day grace period; data retained per statutory requirements
```

---

## The Platform's Own Compliance Obligations

### Data Protection Compliance

The platform itself must comply with data protection regulations:

```
Data Protection Requirements:
├── Data Processing Agreement
│   ├── Platform acts as data processor for business data
│   ├── Processing limited to compliance management purposes
│   ├── Sub-processor disclosure for cloud infrastructure, SMS gateways
│   └── Data breach notification within 72 hours
│
├── Data Retention Policy
│   ├── Active business data: Retained while account is active
│   ├── Closed account: Business data retained for 7 years (statutory requirement)
│   ├── Financial data: 8 years minimum (Income Tax Act requirement)
│   ├── Notification logs: 3 years (proof of service delivery)
│   └── System logs: 1 year (security monitoring)
│
├── Data Subject Rights
│   ├── Right to access: Business can export all their data
│   ├── Right to rectification: Business can correct profile data
│   ├── Right to deletion: Limited by statutory retention requirements
│   └── Data portability: Export in machine-readable format (JSON/CSV)
│
└── Cross-Border Data Handling
    ├── All business data stored in domestic data centers
    ├── No cross-border transfer of PII without explicit consent
    ├── Cloud infrastructure in domestic region only
    └── Third-party services (SMS, WhatsApp) may process delivery metadata internationally
```

### Information Security Standards

```
Security Certifications and Practices:
├── SOC 2 Type II compliance
│   ├── Annual audit of security controls
│   ├── Continuous monitoring between audits
│   └── Report available to enterprise customers
│
├── Penetration Testing
│   ├── Annual third-party penetration test
│   ├── Quarterly automated vulnerability scanning
│   ├── Bug bounty program for responsible disclosure
│   └── Findings remediated within 7 days (critical) / 30 days (high)
│
├── Incident Response Plan
│   ├── Severity classification: P1 (data breach) → P4 (informational)
│   ├── P1 response time: 15 minutes to acknowledge, 1 hour to contain
│   ├── Communication plan: Affected businesses notified within 72 hours
│   └── Post-incident review within 5 business days
│
└── Employee Security
    ├── Background checks for all engineers with data access
    ├── Principle of least privilege for production access
    ├── Production access via break-glass procedure with audit trail
    └── Security awareness training quarterly
```

---

## Document Integrity and Tamper Evidence

### Content-Addressed Integrity Chain

```
Document Integrity Protocol:
├── Upload
│   ├── Compute SHA-256 hash of raw document bytes
│   ├── Store hash in separate database from document blob
│   ├── Encrypt document with per-document DEK
│   ├── Store encrypted blob in object storage
│   └── Log upload event with timestamp, user, and hash
│
├── Verification (on access)
│   ├── Decrypt document blob
│   ├── Recompute SHA-256 hash
│   ├── Compare with stored hash
│   ├── If mismatch → integrity alert; serve from backup; investigate
│   └── Verification result logged
│
├── Audit Trail
│   ├── Every access logged: who, when, why (filing, audit, download)
│   ├── Log entries are append-only (immutable)
│   ├── Log integrity verified via hash chain (each entry includes hash of previous)
│   └── External audit log backup with independent integrity verification
│
└── Long-Term Preservation
    ├── Document format migration for obsolete formats (rare for PDF)
    ├── Hash algorithm migration plan (SHA-256 → future standard)
    ├── Periodic integrity verification of cold-tier documents (monthly sample)
    └── Geographic redundancy: documents replicated to 2+ data center regions
```

---

## Threat Model

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Credential stuffing on user accounts** | High | Access to business compliance data | Rate limiting, OTP-based auth (no passwords for mobile), account lockout after 5 failures |
| **Insider threat (employee access)** | Medium | Mass data exposure | Principle of least privilege, production access via break-glass, all access logged, quarterly access reviews |
| **Third-party integration compromise** | Medium | Financial data exposure via OAuth | Scoped tokens (minimal permissions), token rotation, integration health monitoring |
| **Government portal API impersonation** | Low | Filing submitted to fake portal | Certificate pinning for government API endpoints, URL allowlisting, human verification for new portal integrations |
| **Document vault data exfiltration** | Low | Bulk compliance document theft | Per-tenant encryption keys, no bulk listing API, rate-limited downloads, anomaly detection on access patterns |
| **Knowledge graph poisoning** | Low | Incorrect obligations shown to businesses | Human review for all new regulation entries, version-controlled graph with rollback, validation pipeline before promotion |
| **Notification channel hijacking** | Medium | Fake compliance notifications to businesses | Branded message templates (WhatsApp verified business), sender verification, in-app notification as source of truth |

---

## Compliance Audit of the Compliance Platform

The platform undergoes its own compliance audits:

```
Audit Schedule:
├── Quarterly: Internal security review
│   ├── Access log analysis
│   ├── Encryption key rotation verification
│   ├── Vulnerability scan results review
│   └── Incident response drill
│
├── Semi-Annual: Data protection assessment
│   ├── Data inventory update
│   ├── Retention policy compliance check
│   ├── Cross-border data transfer audit
│   └── Data subject request response time verification
│
├── Annual: External audit
│   ├── SOC 2 Type II audit
│   ├── Penetration testing
│   ├── Business continuity plan test
│   └── Disaster recovery drill with documented results
│
└── Continuous: Automated compliance monitoring
    ├── Certificate expiration monitoring
    ├── Encryption at rest verification (sample checks)
    ├── API authentication enforcement (no unauthenticated endpoints)
    └── Data retention policy enforcement (automated deletion of expired data)
```
