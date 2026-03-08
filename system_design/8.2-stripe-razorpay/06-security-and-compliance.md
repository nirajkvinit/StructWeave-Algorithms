# Security & Compliance

## PCI-DSS Level 1 Compliance

PCI-DSS Level 1 is mandatory for any entity processing more than 6 million card transactions per year. At 100M transactions/day, the payment gateway is firmly in Level 1 territory. This compliance standard fundamentally shapes the system architecture.

### The 12 PCI-DSS Requirements (Architecture Impact)

| Requirement | Description | Architectural Impact |
|-------------|-------------|---------------------|
| **1. Network Segmentation** | Install and maintain network security controls | Tokenization vault in isolated network segment; firewall between CDE and non-CDE |
| **2. Secure Configuration** | Apply secure configurations to all system components | No default passwords; hardened OS images; disabled unnecessary services |
| **3. Protect Stored Data** | Protect stored account data | PANs encrypted at rest with AES-256; CVV never stored; masking in logs |
| **4. Encrypt Transmission** | Protect cardholder data with strong cryptography during transmission | TLS 1.2+ for all external; mutual TLS between internal services in CDE |
| **5. Malware Protection** | Protect all systems against malware | Endpoint protection on all CDE hosts; container image scanning |
| **6. Secure Development** | Develop and maintain secure systems and software | Secure SDLC; code review; dependency scanning; no PAN in logs |
| **7. Restrict Access** | Restrict access to cardholder data by business need-to-know | Role-based access; only Tokenization Service accesses vault |
| **8. Identify Users** | Identify users and authenticate access | MFA for all CDE access; individual accounts (no shared credentials) |
| **9. Physical Security** | Restrict physical access to cardholder data | HSMs in physically secured facilities; tamper-evident controls |
| **10. Logging and Monitoring** | Log and monitor all access to cardholder data | Audit log for every vault access; real-time alerting on anomalies |
| **11. Security Testing** | Test security of systems regularly | Quarterly external vulnerability scans; annual penetration test by QSA |
| **12. Security Policies** | Support information security with organizational policies | Incident response plan; security awareness training |

### Cardholder Data Environment (CDE) Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Non-CDE Zone                              │
│  (Most services operate here — reduced compliance scope)         │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ API GW   │  │ Merchant │  │ Webhook  │  │Dashboard │       │
│  │          │  │ Service  │  │ Service  │  │ Service  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│  These services NEVER see raw card data.                        │
│  They work with tokens (tok_xxx, pm_xxx) only.                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     CDE Boundary                           │ │
│  │  (Firewall, network ACLs, mTLS, audit logging)            │ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │ Tokenization │  │ Card Vault   │  │    HSM       │    │ │
│  │  │ Service      │  │ (Encrypted   │  │ (Hardware    │    │ │
│  │  │              │──│  PAN Store)  │──│  Security    │    │ │
│  │  │ Ingress:     │  │              │  │  Module)     │    │ │
│  │  │ SDK→Token    │  │ AES-256-GCM  │  │              │    │ │
│  │  │ Egress:      │  │ encrypted    │  │ Key mgmt,    │    │ │
│  │  │ Token→PAN    │  │ at rest      │  │ signing,     │    │ │
│  │  │ (to acquirer │  │              │  │ encryption   │    │ │
│  │  │  only)       │  │              │  │              │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  │                                                            │ │
│  │  Access: Only Payment Orchestrator (for auth requests)    │ │
│  │  Logging: Every access logged with requestor, timestamp,  │ │
│  │           purpose, and card fingerprint (not PAN)         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Tokenization Flow

```
1. Customer enters card: 4242 4242 4242 4242, exp 12/28, CVV 123

2. Client SDK (running in browser iframe):
   - Collects card data in isolated iframe (merchant's JS cannot access)
   - Sends directly to Tokenization Service over TLS 1.3
   - Merchant's server NEVER sees the raw PAN

3. Tokenization Service (inside CDE):
   - Generates card fingerprint: SHA-256(PAN) → "fp_abc123"
   - Check: does this fingerprint already exist?
     - YES: return existing token (idempotent tokenization)
     - NO: generate new token
   - Encrypt PAN: AES-256-GCM(PAN, key_from_HSM) → encrypted_pan
   - Store: { token: "tok_xyz", encrypted_pan, exp_month, exp_year, fingerprint, last4: "4242" }
   - Return to SDK: { token: "tok_xyz", last4: "4242", brand: "visa" }

4. SDK returns token to merchant's frontend
   - Merchant sends token to their backend
   - Merchant's backend sends token to payment API
   - At NO POINT does merchant's infrastructure touch raw card data

5. During authorization:
   - Payment Orchestrator sends token to Tokenization Service
   - Tokenization Service decrypts PAN using HSM
   - Decrypted PAN sent to acquirer over dedicated mTLS connection
   - PAN held in memory only during authorization; zeroed after use
```

### Key Management

```
Key Hierarchy:
├── Master Key (in HSM, never exported)
│   ├── Key Encryption Key (KEK) — encrypts data encryption keys
│   │   ├── Data Encryption Key (DEK) for PAN vault — rotated quarterly
│   │   ├── Data Encryption Key (DEK) for API keys — rotated quarterly
│   │   └── Data Encryption Key (DEK) for webhook secrets — rotated quarterly
│   └── Signing Key — for webhook signature generation
│
│ Rotation Policy:
│ ├── DEKs: rotated quarterly (re-encrypt vault entries in background)
│ ├── KEKs: rotated annually
│ ├── Master Key: rotated per HSM vendor recommendation (typically 2-3 years)
│ └── Merchant API keys: merchant-initiated rotation; no automatic expiry
│
│ Split Knowledge:
│ ├── No single person can access the master key
│ ├── HSM requires M-of-N key custodian authentication
│ └── Key ceremony requires physical presence of multiple custodians
```

---

## SOC 2 Type II Compliance

SOC 2 certifies that the payment gateway maintains adequate controls over five trust service criteria:

| Criteria | Payment Gateway Controls |
|----------|------------------------|
| **Security** | Network segmentation, MFA, vulnerability management, incident response |
| **Availability** | 99.999% payment path SLO, DR drills, capacity planning |
| **Processing Integrity** | Idempotency, ledger reconciliation, state machine validation |
| **Confidentiality** | Encryption at rest/transit, access controls, data classification |
| **Privacy** | Data minimization, retention policies, customer data deletion |

---

## Encryption

### At Rest

| Data | Encryption | Key Management |
|------|-----------|----------------|
| **Card PANs** | AES-256-GCM | HSM-managed DEK, quarterly rotation |
| **Payment records** | Transparent Data Encryption (TDE) | Database-level encryption |
| **Ledger entries** | TDE | Database-level encryption |
| **Webhook secrets** | AES-256-GCM | Application-level encryption |
| **API keys** | Argon2 hash (secrets), plaintext (publishable) | One-way hash; cannot be recovered |
| **Backup files** | AES-256 | Separate backup encryption key |
| **Dispute evidence** | AES-256 | Object storage encryption |

### In Transit

| Connection | Protocol | Additional Controls |
|-----------|----------|---------------------|
| Customer → SDK | TLS 1.3 | Certificate pinning in mobile SDKs |
| SDK → Tokenization | TLS 1.3 | Dedicated endpoint; no shared infrastructure |
| Merchant → API Gateway | TLS 1.2+ | API key authentication; IP allowlisting optional |
| Payment Orchestrator → Acquirer | Mutual TLS | Client certificate authentication |
| Internal CDE services | Mutual TLS | Service mesh with automatic cert rotation |
| Internal non-CDE services | TLS 1.2+ | Service-to-service authentication |
| Database connections | TLS 1.2+ | Certificate verification |

---

## 3D Secure (3DS2)

3D Secure adds a cardholder authentication step to reduce fraud and shift liability from merchant to issuing bank.

### 3DS2 Flow

```
1. Payment Orchestrator → 3DS Server: "Should this payment require authentication?"
   - Send: card BIN, amount, merchant risk level, device fingerprint

2. 3DS Server → Card Network Directory: "Route to issuing bank's ACS"
   - Directory returns: issuer's Access Control Server (ACS) URL

3. 3DS Server → Issuer ACS: authentication request
   - Issuer evaluates risk using cardholder history, device, location

4. Risk-Based Decision:
   a. FRICTIONLESS (low risk): Issuer approves without customer interaction
      - Returns: ECI=05, CAVV (authentication proof)
      - No impact on checkout conversion

   b. CHALLENGE (elevated risk): Issuer requires customer verification
      - Returns: challenge URL
      - Customer redirected to issuer's authentication page
      - Customer enters: OTP, biometric, or push notification approval
      - On success: ECI=05, CAVV
      - On failure: payment declined or fallback to non-3DS

5. Payment Orchestrator receives authentication result:
   - Attach ECI + CAVV to authorization request
   - If 3DS authenticated: liability shifts to issuer (merchant protected from fraud chargebacks)
```

### 3DS Decision Matrix

| Condition | 3DS Action | Rationale |
|-----------|-----------|-----------|
| European card (PSD2/SCA required) | Mandatory 3DS | Legal requirement for Strong Customer Authentication |
| High-risk transaction (fraud score > 0.7) | Force 3DS challenge | Reduce fraud risk |
| Low-value transaction (< $30 equivalent) | Exempt from SCA | Low-value exemption under PSD2 |
| Recurring payment (card-on-file) | 3DS on first; skip on subsequent | SCA exemption for merchant-initiated transactions |
| Merchant opts out of 3DS | Skip (merchant assumes liability) | Some merchants prefer conversion over protection |

---

## Fraud Detection

### Real-Time Scoring Pipeline

```
Payment Request Arrives
        │
        ▼
┌──────────────────────┐
│   Feature Extraction  │
│   (< 10ms)           │
│                       │
│ • Card fingerprint    │
│ • IP geolocation      │
│ • Device fingerprint  │
│ • Email domain age    │
│ • Velocity (card,     │
│   IP, email in 1h/   │
│   24h)               │
│ • BIN country match   │
│ • Amount pattern      │
│ • Merchant risk tier  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Rule Engine         │
│   (< 5ms)            │
│                       │
│ Hard rules:           │
│ • Blocked BIN list    │
│ • Sanctioned country  │
│ • Velocity > threshold│
│ • Amount > $10,000    │
│   (manual review)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   ML Model Scoring    │
│   (< 50ms)           │
│                       │
│ Features → Model →    │
│ Score (0.0 - 1.0)    │
│                       │
│ Trained on:           │
│ • Historical fraud    │
│ • Chargeback data     │
│ • Network signals     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Decision            │
│                       │
│ Score < 0.3: ALLOW    │
│ 0.3 - 0.7: 3DS       │
│ 0.7 - 0.9: REVIEW    │
│ Score > 0.9: BLOCK    │
└──────────────────────┘

Total latency budget: < 100ms
```

### Velocity Checks

| Check | Window | Threshold | Action |
|-------|--------|-----------|--------|
| Same card, different merchants | 1 hour | > 5 transactions | Flag for review |
| Same IP, different cards | 1 hour | > 3 cards | Block IP |
| Same email, failed attempts | 24 hours | > 10 failures | Temporary block |
| Single card, high total amount | 24 hours | > $5,000 | Require 3DS |
| New card on merchant account | First use | Any amount | Elevated scrutiny |

---

## Threat Model

| Threat | Attack Vector | Mitigation |
|--------|--------------|------------|
| **Card testing** | Bot tries thousands of stolen cards with small amounts | Velocity limiting per IP/device; CAPTCHA escalation; block after N failures |
| **Replay attack on webhooks** | Attacker captures and replays a webhook payload | Timestamp in signature; reject webhooks with timestamp > 5 minutes old |
| **API key compromise** | Leaked merchant secret key | Key rotation; IP allowlisting; anomaly detection on key usage patterns |
| **Man-in-the-middle** | Intercept card data in transit | TLS 1.3; HSTS; certificate pinning in mobile SDKs |
| **Insider threat (vault access)** | Malicious employee accesses card vault | HSM requires M-of-N authorization; all vault access logged and alerted |
| **SQL injection on payment API** | Malicious input in payment parameters | Parameterized queries; input validation; WAF |
| **DDoS on payment endpoint** | Volumetric attack to disrupt payments | Rate limiting per merchant; geographic filtering; upstream DDoS protection |
| **Token enumeration** | Guess valid payment tokens | Tokens are 128-bit random; not sequential; rate-limited lookups |

---

## Compliance Calendar

| Activity | Frequency | Responsible |
|----------|-----------|-------------|
| PCI-DSS on-site assessment (QSA) | Annual | Security + Compliance team |
| External vulnerability scan (ASV) | Quarterly | Security team |
| Internal penetration test | Quarterly | Security team |
| SOC 2 Type II audit | Annual | Compliance + Engineering |
| Key rotation (DEKs) | Quarterly | Security team + HSM custodians |
| Access review (CDE) | Quarterly | Security team + Engineering managers |
| Incident response drill | Semi-annual | Security + SRE |
| Security awareness training | Annual | All employees |
| DR failover test | Quarterly | SRE + Payment reliability team |
