# Security & Compliance — AI-Native Core Banking Platform

## 1. Threat Model

### 1.1 Threat Actors

| Actor | Motivation | Capability | Primary Targets |
|---|---|---|---|
| **External attackers** | Financial theft, data exfiltration | Sophisticated tools, zero-days, social engineering | API endpoints, customer credentials, payment flows |
| **Nation-state actors** | Espionage, financial disruption | Advanced persistent threats, supply chain attacks | Infrastructure, encryption keys, transaction data |
| **Insider threats** | Financial gain, coercion | Direct system access, knowledge of controls | Privileged accounts, manual overrides, data exports |
| **Organized crime** | Money laundering, fraud | Synthetic identities, mule networks, account takeover | Account opening, payment initiation, AML thresholds |
| **Competitors / TPPs** | Data harvesting, abuse | Legitimate API access, scope creep | Open Banking APIs, consent boundaries |

### 1.2 STRIDE Threat Analysis

| Threat | Component | Attack Vector | Mitigation |
|---|---|---|---|
| **Spoofing** | API Gateway | Token theft, session hijack | mTLS, short-lived tokens, device binding |
| **Tampering** | Event Store | Ledger manipulation | Cryptographic chaining, append-only, WORM storage |
| **Repudiation** | Transaction Engine | Deny initiating transaction | Non-repudiation via digital signatures + audit trail |
| **Info Disclosure** | Read Store | SQL injection, data leak | Parameterized queries, field-level encryption, data masking |
| **Denial of Service** | API Gateway | Volumetric attack, resource exhaustion | Rate limiting, auto-scaling, DDoS protection |
| **Elevation of Privilege** | All services | Privilege escalation, RBAC bypass | ABAC, least privilege, service mesh authorization |

---

## 2. Security Architecture

### 2.1 Defense in Depth

```
Layer 1: Network Perimeter
  ├── DDoS mitigation (volumetric + application layer)
  ├── Web application firewall (WAF)
  ├── IP reputation filtering
  └── Geographic access restrictions

Layer 2: Transport Security
  ├── TLS 1.3 for all external connections
  ├── Mutual TLS (mTLS) for service-to-service
  ├── Certificate pinning for mobile apps
  └── Perfect forward secrecy

Layer 3: API Security
  ├── OAuth 2.0 + OpenID Connect
  ├── API key management + rotation
  ├── Request signing (HMAC or RSA)
  ├── Input validation and sanitization
  └── Rate limiting (per-client, per-API)

Layer 4: Application Security
  ├── Attribute-based access control (ABAC)
  ├── Entity-scoped data access
  ├── Secure coding practices (OWASP Top 10)
  ├── Dependency vulnerability scanning
  └── Runtime application self-protection (RASP)

Layer 5: Data Security
  ├── AES-256 encryption at rest
  ├── Field-level encryption for PII
  ├── Tokenization for card data
  ├── Data masking in non-production
  └── Cryptographic checksums for integrity

Layer 6: Infrastructure Security
  ├── Container image scanning
  ├── Pod security policies
  ├── Network policies (zero-trust mesh)
  ├── Secret management (HSM-backed)
  └── Immutable infrastructure (no SSH access)
```

### 2.2 Authentication Framework

**Customer Authentication (SCA - Strong Customer Authentication):**

```
SCA Requirements (PSD2/PSD3):
  Must use 2+ of 3 factors:
    - Knowledge: PIN, password, security question
    - Possession: OTP device, mobile app, hardware token
    - Inherence: fingerprint, face recognition, behavioral biometrics

SCA Exemptions (where allowed):
  - Low-value payments (< EUR 30, max 5 consecutive or EUR 100 cumulative)
  - Trusted beneficiaries (pre-registered by customer)
  - Recurring payments (same amount, same payee)
  - Merchant-initiated transactions
  - Transaction risk analysis (TRA) exemption when fraud rate below threshold

Authentication Flow:
  1. Customer initiates action (login, payment, etc.)
  2. Risk engine evaluates context (device, location, behavior, amount)
  3. IF low risk AND exemption applicable: proceed without SCA
  4. IF SCA required: challenge with appropriate factor combination
  5. Verify factor responses
  6. Issue short-lived access token (15 min for sensitive operations)
  7. Log authentication event with full context
```

**Service-to-Service Authentication:**

```
Inter-Service Security:
  - mTLS with auto-rotated certificates (24h lifetime)
  - Service identity via SPIFFE/SPIRE framework
  - Request-level authorization via service mesh policies
  - No shared secrets between services

Open Banking TPP Authentication:
  - eIDAS qualified certificates (QWAC + QSeal)
  - Certificate validation against trust anchor (national CA)
  - TPP registration verification against regulatory register
  - Dynamic client registration per OpenID Connect
```

### 2.3 Authorization Model (ABAC)

```
Authorization Policy Structure:

Subject:
  - user_id, role, entity_id, branch_id, clearance_level

Resource:
  - account_id, entity_id, data_classification

Action:
  - read, write, approve, override, export

Context:
  - time_of_day, source_ip, device_trust_level, channel

Example Policies:

Policy: "Branch teller can view accounts only within their branch"
  Subject.role = "TELLER" AND
  Subject.branch_id = Resource.account.branch_id AND
  Action = "READ"
  → ALLOW

Policy: "Compliance officer can view all accounts within their entity"
  Subject.role = "COMPLIANCE_OFFICER" AND
  Subject.entity_id = Resource.account.entity_id AND
  Action = "READ"
  → ALLOW

Policy: "No single user can both initiate and approve a payment > threshold"
  Subject who initiated transaction ≠ Subject who approves
  → ENFORCE (Segregation of Duties)

Policy: "Data export requires manager approval for > 1000 records"
  Action = "EXPORT" AND
  Record_count > 1000
  → REQUIRE_APPROVAL(Subject.manager)
```

---

## 3. Regulatory Compliance

### 3.1 Compliance Framework Map

| Regulation | Jurisdiction | Key Requirements | System Impact |
|---|---|---|---|
| **PCI-DSS v4.0** | Global | Card data protection, network segmentation | Tokenization, HSM, network policies |
| **PSD2 / PSD3** | EU/EEA | SCA, Open Banking APIs, TPP access | Auth framework, consent management |
| **GDPR** | EU/EEA | Data protection, right to erasure, consent | PII encryption, data lifecycle, audit |
| **Basel III/IV** | Global (banking) | Capital adequacy, liquidity, leverage | Risk calculations, regulatory reporting |
| **AML/CFT (6AMLD)** | EU | Customer due diligence, transaction monitoring | KYC, screening, STR filing |
| **BSA/FinCEN** | US | CTR filing, SAR filing, CIP | Threshold monitoring, reporting automation |
| **SOX** | US (public) | Internal controls, financial reporting integrity | Audit trail, segregation of duties |
| **DORA** | EU | Digital operational resilience | Incident reporting, ICT risk management |

### 3.2 PCI-DSS Compliance

```
Cardholder Data Protection:

Scope Reduction:
  - Tokenize card numbers at point of entry
  - Token format: preserves last 4 digits, BIN range
  - Actual PAN stored only in PCI-compliant token vault
  - All other systems work with tokens only

Network Segmentation:
  - PCI Cardholder Data Environment (CDE) isolated in dedicated network segment
  - Micro-segmentation via service mesh policies
  - No direct internet access from CDE
  - All CDE access logged and monitored

Key Management:
  - Encryption keys stored in FIPS 140-2 Level 3 HSMs
  - Dual-control key ceremonies for master keys
  - Automated key rotation: DEKs every 24h, KEKs every 90d
  - Key escrow with split-knowledge
```

### 3.3 Data Privacy (GDPR/Privacy)

```
Privacy by Design Implementation:

Data Minimization:
  - Collect only data necessary for banking operations
  - Retention periods enforced automatically per data category
  - Anonymization/pseudonymization for analytics

Right to Erasure (Right to be Forgotten):
  - Challenge: regulatory retention requirements conflict with deletion
  - Solution: Crypto-shredding
    1. Customer PII encrypted with per-customer encryption key
    2. On erasure request: destroy the encryption key
    3. Data becomes unreadable while binary data remains for regulatory retention
    4. Regulatory data (transaction records) retained with anonymized references

Consent Management:
  - Granular consent capture per data processing purpose
  - Consent versioning and audit trail
  - Automated consent expiry and renewal workflows
  - Consent withdrawal triggers downstream data access revocation

Data Subject Access Request (DSAR):
  - Automated DSAR fulfillment pipeline
  - Cross-system data inventory for complete response
  - PII detection across structured and unstructured data
  - Response within 30 days (GDPR requirement)
```

### 3.4 DORA (Digital Operational Resilience Act)

```
DORA Compliance Requirements:

ICT Risk Management:
  - Documented ICT risk management framework
  - Regular risk assessments of core banking infrastructure
  - Business impact analysis for all critical functions
  - Residual risk acceptance by management

Incident Reporting:
  - Major ICT incident classification criteria
  - Reporting to competent authority within 4 hours (initial)
  - Intermediate report within 72 hours
  - Final report within 1 month
  - Automated incident detection and classification

Digital Operational Resilience Testing:
  - Annual basic testing (vulnerability scanning, network security)
  - Advanced testing every 3 years (TLPT - threat-led penetration testing)
  - Test results reported to competent authority
  - Remediation tracking with defined timelines

ICT Third-Party Risk:
  - Register of all ICT third-party providers
  - Contractual requirements for critical providers
  - Exit strategies for critical service providers
  - Concentration risk monitoring
```

---

## 4. Fraud Prevention

### 4.1 Multi-Layer Fraud Detection

```
Layer 1: Rule-Based (Real-Time, < 1ms)
  - Velocity checks (transactions per hour/day)
  - Amount thresholds (unusual amounts for customer segment)
  - Geographic impossibility (transactions from distant locations within short time)
  - Known fraud patterns (card testing, account enumeration)

Layer 2: ML Scoring (Real-Time, < 20ms)
  - Transaction risk scoring model
  - Features: amount, merchant category, time, location, device, behavioral
  - Ensemble of gradient-boosted trees + neural network
  - Updated model deployed via canary (5% traffic → 100% over 24h)

Layer 3: Behavioral Analytics (Near-Real-Time, < 5min)
  - Customer behavioral profile comparison
  - Session analysis (navigation patterns, typing cadence)
  - Peer group deviation detection
  - Account takeover detection via login behavior anomalies

Layer 4: Network Analysis (Batch, hourly)
  - Graph analysis of transaction networks
  - Mule account detection via flow patterns
  - Synthetic identity detection via shared PII elements
  - Coordinated fraud ring identification
```

### 4.2 Fraud Decision Engine

```
ALGORITHM FraudDecision(transaction, scores):
    // Combine all scoring layers

    rule_score = scores.rule_based      // 0-100
    ml_score = scores.ml_model          // 0-100
    behavioral_score = scores.behavioral // 0-100

    // Weighted composite (weights tuned per entity/segment)
    composite = 0.3 * rule_score + 0.5 * ml_score + 0.2 * behavioral_score

    IF composite < 20:
        RETURN APPROVE
    ELSE IF composite < 50:
        RETURN APPROVE_WITH_MONITORING
        SCHEDULE_REVIEW(transaction, priority=LOW)
    ELSE IF composite < 80:
        RETURN STEP_UP_AUTHENTICATION
        // Require additional verification (OTP, biometric)
    ELSE:
        RETURN DECLINE
        CREATE_FRAUD_ALERT(transaction, composite, scores)
        IF composite > 95:
            FREEZE_ACCOUNT(transaction.source_account)
            NOTIFY_FRAUD_OPS(priority=CRITICAL)
```

---

## 5. Cryptographic Architecture

### 5.1 Key Hierarchy

```
Key Hierarchy:

Master Key (MK)
  ├── Stored in HSM, never exported
  ├── Split into 3 key custodian shares (2-of-3 quorum for recovery)
  └── Used only to wrap Key Encryption Keys

Key Encryption Keys (KEK)
  ├── Wrapped by Master Key
  ├── Rotated every 90 days
  ├── Per-entity KEKs for tenant isolation
  └── Used to wrap Data Encryption Keys

Data Encryption Keys (DEK)
  ├── Wrapped by KEK
  ├── Rotated every 24 hours
  ├── Per-service or per-data-class DEKs
  └── Used for actual data encryption

Signing Keys
  ├── Stored in HSM
  ├── Per-entity signing keys
  ├── Used for transaction non-repudiation
  └── Audit-logged usage
```

### 5.2 Ledger Integrity (Cryptographic Chaining)

```
Each event in the ledger includes a cryptographic chain:

event[n].checksum = HMAC-SHA256(
    key = ledger_signing_key,
    data = CONCAT(
        event[n-1].checksum,  // Previous event's checksum
        event[n].event_id,
        event[n].account_id,
        event[n].amount,
        event[n].timestamp,
        event[n].payload_hash
    )
)

Verification:
  - Any break in the chain indicates tampering
  - Automated chain verification runs hourly
  - Independent verification by audit system
  - Chain anchored to external timestamping service
```

---

## 6. Open Banking Security

### 6.1 TPP Security Controls

```
TPP Onboarding:
  1. Verify registration with national competent authority
  2. Validate eIDAS certificate (QWAC for transport, QSeal for signing)
  3. Register redirect URIs (strict validation, no wildcards)
  4. Issue client credentials
  5. Configure rate limits based on TPP type (AISP, PISP, CBPII)

Runtime Controls:
  - Certificate validation on every request (revocation check via OCSP)
  - Consent scope enforcement (TPP can only access consented data)
  - Per-TPP rate limiting with separate quotas
  - Request signing validation (JWS with QSeal certificate)
  - Anomaly detection on TPP behavior patterns

Incident Response:
  - Automated TPP blocking on suspicious patterns
  - Certificate revocation triggers immediate access termination
  - Regulatory notification within 4 hours of TPP security incident
```

### 6.2 Consent-Scoped Data Access

```
Data Filtering Pipeline:

  1. TPP makes API request with access token
  2. Token contains: tpp_id, customer_id, consent_id, scopes
  3. Consent service validates:
     a. Consent is AUTHORIZED status
     b. Consent has not expired
     c. Requested data is within consented scope
     d. Request frequency within consent limits
  4. Data service applies consent filter:
     a. Only return accounts listed in consent
     b. Only return data fields matching permission level
     c. Apply date range restrictions from consent
  5. Response logged with consent_id for audit

Permission Levels:
  ReadAccountsBasic    → account_id, type, currency (no balances)
  ReadAccountsDetail   → + account name, status, opened date
  ReadBalances         → + current balance, available balance
  ReadTransactions     → + transaction history within consent period
  ReadBeneficiaries    → + saved payee list
```

---

## 7. Incident Response

### 7.1 Security Incident Classification

| Severity | Definition | Response Time | Escalation |
|---|---|---|---|
| **P1 - Critical** | Active data breach, transaction manipulation, system compromise | 5 minutes | CISO, CEO, regulators |
| **P2 - High** | Attempted breach detected, vulnerability exploited | 15 minutes | Security team lead, CTO |
| **P3 - Medium** | Suspicious activity, failed attack attempts | 1 hour | Security analyst team |
| **P4 - Low** | Policy violation, misconfiguration detected | 4 hours | Security operations |

### 7.2 Regulatory Notification Requirements

| Regulation | When to Notify | Whom | Timeline |
|---|---|---|---|
| **GDPR** | Personal data breach | Supervisory authority + affected individuals | 72 hours |
| **DORA** | Major ICT incident | Competent authority | 4 hours (initial), 72h (intermediate), 1 month (final) |
| **PCI-DSS** | Cardholder data compromise | Card brands + acquiring bank | 24 hours |
| **PSD2** | Major operational/security incident | Competent authority | Without undue delay |
| **BSA** | Suspicious activity | FinCEN | 30 days (SAR filing) |

---

*Next: [Observability →](./07-observability.md)*
