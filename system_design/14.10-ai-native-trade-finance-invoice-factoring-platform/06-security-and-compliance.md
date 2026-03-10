# 14.10 AI-Native Trade Finance & Invoice Factoring Platform — Security & Compliance

## Authentication & Authorization

### Authentication Architecture

| Actor | Authentication Method | Session Management |
|---|---|---|
| MSME Users (Web/Mobile) | OAuth 2.0 + OpenID Connect with MFA; optional biometric on mobile | JWT access tokens (15-min expiry) + refresh tokens (30-day expiry, rotated on use) |
| Financier Users | OAuth 2.0 with mandatory MFA (TOTP or hardware key); IP allowlisting | JWT with 5-min expiry for sensitive operations; per-session IP binding |
| Anchor Corporate Users | SSO via SAML 2.0 integration with corporate IdP; MFA enforced | Federated session management; session terminated on IdP logout |
| ERP Integrations | API key + mutual TLS (mTLS); per-integration rate limits | Stateless; each request authenticated independently |
| TReDS Platforms | mTLS with certificate pinning; IP allowlisting | Stateless API authentication |
| Internal Services | Service mesh with mTLS; SPIFFE/SPIRE for service identity | Zero-trust service-to-service authentication |
| Platform Operations | SSO + hardware security key + privilege escalation for sensitive operations | Session recording for audit; auto-logout after 10 minutes of inactivity |

### Authorization Model

**Role-Based Access Control (RBAC) with Attribute-Based Overlays:**

```
Role Hierarchy:
├── PLATFORM_ADMIN          (full access; restricted to CXO + security team)
├── PLATFORM_OPS            (operations: settlement management, dispute resolution)
├── COMPLIANCE_OFFICER      (regulatory reports, KYC approvals, STR filing)
├── RISK_ANALYST            (credit model management, fraud review)
├── FINANCIER_ADMIN         (portfolio management, bid approval, limit management)
├── FINANCIER_ANALYST       (view portfolio, place bids, view analytics)
├── ANCHOR_ADMIN            (supplier onboarding, program management)
├── ANCHOR_VIEWER           (view program analytics, supplier status)
├── MSME_ADMIN              (manage invoices, view deals, manage users)
└── MSME_USER               (upload invoices, view deal status)
```

**Attribute-Based Overlays:**
- **Data isolation**: An MSME user can only access their own invoices and deals; a financier can only access deals they've funded or are eligible to bid on
- **Value-based escalation**: Deal approval requires a higher authority based on deal value:
  - < ₹50 lakh: auto-approved (if within financier's pre-set criteria)
  - ₹50 lakh – ₹5 crore: Financier Analyst can approve
  - ₹5 crore – ₹25 crore: Financier Admin must approve
  - > ₹25 crore: Maker-checker with two separate Financier Admins
- **Temporal access**: Month-end close operations (ledger adjustments, provisioning) are only available during the close window (last 3 business days of month)

### Maker-Checker Enforcement

All high-value or high-risk operations require maker-checker:

| Operation | Maker | Checker | Additional Controls |
|---|---|---|---|
| Deal approval (> ₹5 crore) | Financier Analyst | Financier Admin | Cannot be same person; 4-eye principle |
| Manual settlement override | Platform Ops | Platform Ops (different user) | Must provide written justification; auto-logged |
| Credit model deployment | Risk Analyst | Risk Lead | Canary deployment; automatic rollback on degradation |
| KYC override (manual approval) | Compliance Officer | Compliance Lead | Time-limited (24-hour) approval; re-verification in 30 days |
| Platform fee adjustment | Platform Ops | Platform Admin | Audit trail with business justification |
| Financier limit increase | Financier Admin | Platform Ops | Requires updated financial documents |

---

## Data Security

### Encryption

| Data Category | At Rest | In Transit | Key Management |
|---|---|---|---|
| Financial ledger entries | AES-256 (database-level TDE) | TLS 1.3 (inter-service) | HSM-backed keys; key rotation every 90 days |
| Invoice documents | AES-256 (object storage encryption) | TLS 1.3 | Per-tenant encryption keys; stored in HSM |
| Bank account details | AES-256 with application-level encryption | TLS 1.3 + tokenization | Separate encryption key from database TDE; HSM-stored |
| PAN/GSTIN (PII) | AES-256 with application-level encryption | TLS 1.3 | Encrypted at application layer before database write |
| Credit scores | Database-level TDE | TLS 1.3 | Standard database encryption key |
| Audit logs | AES-256 + integrity hashing (SHA-256 chain) | TLS 1.3 | WORM storage prevents modification; hash chain detects tampering |
| API keys and secrets | Vault-encrypted | Never transmitted in plaintext; only via vault API | Vault with auto-unsealing; secrets rotated on schedule |

### Data Masking and Tokenization

- **Bank account numbers**: Tokenized at ingestion; original stored in vault; only tokenized reference used in application logic
- **PAN numbers**: Masked in all UIs (show only last 4 digits); full PAN accessible only via authorized API call with audit logging
- **Invoice amounts**: Visible to authorized parties only; anonymized in analytics (shown as percentiles or ranges)
- **Buyer identity**: Anonymized in financier-facing marketplace view until deal is accepted; prevents cherry-picking

---

## Threat Model

### STRIDE Analysis

| Threat | Category | Attack Vector | Mitigation |
|---|---|---|---|
| **Fictitious invoice injection** | Spoofing | Fraudster creates fake invoices with fabricated buyer details to obtain financing | GST cross-verification (invoice must exist in GSTR filings); buyer confirmation workflow; e-invoice IRN validation; anomaly detection on new supplier-buyer pairs |
| **Duplicate financing** | Tampering | MSME submits same invoice to multiple platforms simultaneously | Document hash deduplication; cross-platform registry integration; GST IRN uniqueness check; behavioral monitoring (financing ratio vs. revenue) |
| **Credit score manipulation** | Tampering | Adversary manipulates input signals to inflate buyer credit score | Feature integrity checks (cross-validate bureau data with GST filings); anomaly detection on score changes; manual review for score jumps > 15 points |
| **Unauthorized deal creation** | Elevation of Privilege | Compromised MSME account used to create fraudulent deals | MFA for deal creation; transaction velocity limits; notification to MSME on every deal; IP and device fingerprinting |
| **Settlement diversion** | Tampering | Attacker modifies disbursement bank account to redirect funds | Bank account change requires re-verification (penny-drop + OTP); 48-hour cooling period for new bank accounts; maker-checker for account changes |
| **Data exfiltration** | Information Disclosure | Insider or external attacker extracts financial data for competitive intelligence or fraud | Data classification and access controls; DLP (Data Loss Prevention) on egress; database query auditing; anomaly detection on data access patterns |
| **Denial of service on settlement** | Denial of Service | Attacker floods settlement engine with invalid requests to delay legitimate settlements | Rate limiting per client; separate queues for settlement (priority) vs. general traffic; circuit breakers on external dependencies |
| **Collusion between MSME and buyer** | Spoofing | MSME and buyer collude to create fictitious invoices and split the financing proceeds | Graph-based relationship analysis; shared director/address detection; abnormal payment patterns (buyer always pays exactly on day 1 instead of at maturity) |

### API Security

| Control | Implementation |
|---|---|
| Rate limiting | Per-tenant, per-endpoint limits; graduated: 100 RPS (MSME), 1,000 RPS (financier), 5,000 RPS (ERP integration) |
| Input validation | Schema validation on all inputs; parameterized queries (no raw SQL); file upload scanning (virus, malware, embedded macros) |
| Output sanitization | PII redaction in error messages; no stack traces in production responses; structured error codes |
| Request signing | HMAC-SHA256 request signing for ERP integrations and TReDS APIs; prevents replay attacks |
| Webhook verification | HMAC signature on all outbound webhooks; recipient must verify signature before processing |

---

## Regulatory Compliance

### RBI NBFC Compliance

| Regulation | Requirement | Implementation |
|---|---|---|
| **Capital adequacy (CRAR)** | Maintain capital adequacy ratio ≥ 15% of risk-weighted assets | Real-time CRAR calculation based on funded portfolio; alerts when approaching threshold; automated rejection of new deals if CRAR would breach |
| **NPA classification** | Classify assets as NPA when overdue > 90 days; sub-standard, doubtful, loss categories | Automated DPD tracking per deal; NPA reclassification triggered at DPD=90; provisioning automatically calculated per RBI norms |
| **Provisioning norms** | Standard assets: 0.40%; Sub-standard: 15%; Doubtful: 25-100%; Loss: 100% | Real-time provisioning calculation; provisioning impact shown to financiers before deal acceptance; month-end provisioning report auto-generated |
| **Fair practices code** | Transparent pricing, no hidden charges, proper communication of terms | Pricing breakdown shown to MSME before acceptance; cooling-off period for first-time borrowers; vernacular communication of terms (if applicable) |
| **Reporting** | Monthly/quarterly returns to RBI: NPA reports, capital adequacy, ALM statements | Automated report generation from event-sourced ledger; scheduled filing with confirmation; historical report regeneration for audits |

### GST Act Compliance

| Requirement | Implementation |
|---|---|
| **E-invoicing mandate** | For invoices above threshold (currently ₹5 crore): mandatory e-invoice with IRN from GST portal; system validates IRN before accepting invoice |
| **GSTR reconciliation** | Cross-match every invoice against GSTR-1 (seller's filing) and GSTR-2B (buyer's auto-populated return); flag mismatches |
| **HSN code validation** | Validate HSN codes on invoices against government master; incorrect HSN codes may indicate fabricated invoices |
| **Tax deduction at source** | For applicable transactions, ensure TDS is correctly calculated and reported; integrate with Form 26AS reconciliation |

### FEMA and Cross-Border Compliance

| Requirement | Implementation |
|---|---|
| **Purpose code validation** | Every cross-border transaction must have a valid RBI purpose code; system enforces purpose code selection and validates against transaction type |
| **EDPMS reporting** | Export invoices must be reported in the Export Data Processing and Monitoring System; automated filing within mandated timelines |
| **LRS limits** | Individual remittances checked against Liberalized Remittance Scheme limits ($250,000/year); system tracks and enforces |
| **Correspondent banking** | Cross-border settlements routed through authorized correspondent banking channels; no direct transfers to sanctioned jurisdictions |

### AML/KYC Compliance

| Control | Implementation |
|---|---|
| **Customer Due Diligence** | Tier-based KYC: Simplified (< ₹50 lakh annual limit), Standard (₹50 lakh – ₹5 crore), Enhanced (> ₹5 crore or high-risk profile) |
| **Beneficial ownership** | Identify and verify individuals with > 10% ownership; recursive lookup for multi-layered corporate structures |
| **Transaction monitoring** | Rule-based + ML-based transaction monitoring; rules cover structuring (splitting to avoid thresholds), rapid movement, and circular flows |
| **Suspicious Transaction Reports** | Automated STR generation for detected suspicious patterns; filed with FIU-IND within mandated timeline; secure filing channel |
| **Sanctions screening** | Real-time screening against OFAC, EU, UN, and domestic sanctions lists; screening on onboarding + every transaction |
| **Record retention** | All KYC records, transaction records, and STRs retained for minimum 5 years after business relationship ends |

---

## Audit Trail Architecture

### Event-Sourced Audit Log

Every state change, user action, and system decision is recorded as an immutable event:

```
Event Structure:
{
    event_id:        <monotonic ID>,
    timestamp:       <nanosecond precision>,
    entity_type:     "INVOICE" | "DEAL" | "SETTLEMENT" | "CREDIT_SCORE" | ...,
    entity_id:       <UUID>,
    event_type:      "CREATED" | "STATUS_CHANGED" | "PRICED" | "APPROVED" | ...,
    actor_id:        <UUID of user or system service>,
    actor_type:      "USER" | "SYSTEM" | "API_CLIENT",
    actor_role:      "MSME_USER" | "FINANCIER_ADMIN" | "SETTLEMENT_ENGINE" | ...,
    old_state:       { ... },
    new_state:       { ... },
    metadata:        { ip_address, user_agent, request_id, correlation_id },
    hash:            SHA-256(previous_event_hash + this_event_data)
}
```

**Integrity Guarantees:**
- Each event's hash includes the previous event's hash → cryptographic chain prevents insertion, deletion, or reordering
- Periodic hash verification (hourly): recompute chain from last verified checkpoint; alert if any hash mismatches
- Write-once storage: audit log stored on WORM (Write Once Read Many) storage; even platform administrators cannot modify historical events
- Independent audit hash published to external timestamping service (blockchain-based or third-party TSA) daily → provides external proof that the audit log existed in a specific state at a specific time
