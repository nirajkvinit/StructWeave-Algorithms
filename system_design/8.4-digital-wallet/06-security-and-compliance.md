# Security & Compliance

## Threat Model

### Attack Surface

```
┌────────────────────┬───────────────────────────┬──────────────────────┐
│ Attack Vector      │ Threat                    │ Impact               │
├────────────────────┼───────────────────────────┼──────────────────────┤
│ Account Takeover   │ Stolen credentials, SIM   │ Unauthorized         │
│                    │ swap, phishing             │ fund transfer        │
├────────────────────┼───────────────────────────┼──────────────────────┤
│ Double-Spend       │ Concurrent requests from  │ Balance goes negative│
│                    │ multiple devices           │ (financial loss)     │
├────────────────────┼───────────────────────────┼──────────────────────┤
│ API Abuse          │ Replay attacks, parameter │ Unauthorized         │
│                    │ tampering, injection       │ transactions         │
├────────────────────┼───────────────────────────┼──────────────────────┤
│ Insider Threat     │ Privileged employee       │ Unauthorized fund    │
│                    │ accessing user accounts   │ movement, data theft │
├────────────────────┼───────────────────────────┼──────────────────────┤
│ Money Laundering   │ Structuring, layering     │ Regulatory penalties,│
│                    │ through multiple accounts │ license revocation   │
├────────────────────┼───────────────────────────┼──────────────────────┤
│ Fake Identity      │ Synthetic IDs bypass KYC  │ Untraceable accounts │
│                    │ creating mule accounts    │ used for fraud       │
├────────────────────┼───────────────────────────┼──────────────────────┤
│ QR Code Tampering  │ Replace merchant QR with  │ Payments diverted    │
│                    │ attacker's QR code        │ to attacker          │
├────────────────────┼───────────────────────────┼──────────────────────┤
│ Data Breach        │ Database exfiltration     │ PII exposure,        │
│                    │                           │ regulatory penalties  │
└────────────────────┴───────────────────────────┴──────────────────────┘
```

---

## Authentication & Authorization

### Multi-Factor Authentication

```
Authentication layers:
Layer 1: Phone number + OTP (account access)
Layer 2: App PIN / Biometric (session authentication)
Layer 3: Transaction PIN / Biometric (per-transaction authorization)

Transaction authorization matrix:
┌─────────────────────┬────────────────────────────────────────┐
│ Transaction Type    │ Required Authentication                │
├─────────────────────┼────────────────────────────────────────┤
│ Balance check       │ Layer 1 + Layer 2 (session)           │
│ Transaction history │ Layer 1 + Layer 2 (session)           │
│ P2P transfer < $50  │ Layer 1 + Layer 2 + Layer 3 (PIN)    │
│ P2P transfer ≥ $50  │ Layer 1 + Layer 2 + Layer 3 (biometric)│
│ Merchant payment    │ Layer 1 + Layer 2 + Layer 3 (biometric)│
│ Withdrawal          │ Layer 1 + Layer 2 + Layer 3 + OTP    │
│ Add payment instr.  │ Layer 1 + Layer 2 + Layer 3 + OTP    │
│ Change PIN          │ Layer 1 + Layer 2 + Old PIN + OTP    │
│ KYC submission      │ Layer 1 + Layer 2 (session)           │
└─────────────────────┴────────────────────────────────────────┘
```

### Device Binding

```
Each wallet is bound to a registered device:
1. First login: device fingerprint stored (hardware ID, OS, app version)
2. Subsequent logins: device fingerprint verified
3. New device detected:
   a. Step-up authentication: OTP to registered phone
   b. Cooling-off period: reduced limits for 24 hours on new device
   c. Old device notified: "Login from new device detected"

Device fingerprint components:
  - Hardware identifier (non-resettable)
  - Screen resolution and density
  - Installed app list hash (privacy-safe)
  - Network characteristics
  - Timezone and locale settings

Max devices per wallet: 2 (active simultaneously)
Device removal: requires OTP verification
```

### Session Management

```
JWT-based session tokens:
  Access token TTL: 15 minutes (auto-refresh)
  Refresh token TTL: 30 days (revocable)
  Transaction token: single-use, 5-minute TTL (for each payment)

Session security:
  - Tokens bound to device fingerprint
  - Concurrent session limit: 2 devices
  - Automatic logout on suspicious activity
  - Session revocation on password change or device removal
```

---

## KYC / AML Compliance

### Tiered KYC Framework

```
┌─────────┬──────────────────┬──────────────────┬──────────────────┐
│ Tier    │ Verification     │ Limits           │ Features         │
├─────────┼──────────────────┼──────────────────┼──────────────────┤
│ Tier 0  │ Phone number     │ None (cannot     │ View-only,       │
│ (None)  │ only             │ transact)        │ explore app      │
├─────────┼──────────────────┼──────────────────┼──────────────────┤
│ Tier 1  │ Phone + email +  │ $500/txn         │ P2P transfer,    │
│ (Basic) │ self-declared    │ $1,000/day       │ merchant payment,│
│         │ name + DOB       │ $10,000/month    │ top-up (card)    │
├─────────┼──────────────────┼──────────────────┼──────────────────┤
│ Tier 2  │ Tier 1 + govt ID │ $2,000/txn       │ All Tier 1 +     │
│ (Inter.)│ verification +   │ $5,000/day       │ bank linking,    │
│         │ address proof    │ $50,000/month    │ withdrawal,      │
│         │                  │                  │ bill pay         │
├─────────┼──────────────────┼──────────────────┼──────────────────┤
│ Tier 3  │ Tier 2 + video   │ $10,000/txn      │ All Tier 2 +     │
│ (Full)  │ KYC + proof of   │ $20,000/day      │ multi-currency,  │
│         │ income/source    │ $200,000/month   │ higher withdrawal│
│         │                  │                  │ FX conversion    │
└─────────┴──────────────────┴──────────────────┴──────────────────┘

KYC verification flow:
1. User submits documents (ID photo, selfie, address proof)
2. Automated verification:
   a. OCR extraction of document fields
   b. Face match: selfie vs. ID photo (liveness detection)
   c. Document authenticity check (MRZ validation, hologram detection)
   d. Name/DOB match against government database
3. Risk scoring: auto-approve (score < 30), manual review (30-70), auto-reject (> 70)
4. Manual review queue for borderline cases
5. Approved → tier upgraded → limits increased immediately
```

### AML Monitoring

```
Anti-Money Laundering checks:
1. Sanctions screening: check all parties against global sanctions lists
   - OFAC (US), EU sanctions, UN sanctions, local lists
   - Checked at: account creation, each transaction, periodic batch re-screen

2. Transaction monitoring rules:
   Rule: Structuring detection
     IF user makes > 5 transactions in 24h
     AND each transaction is just below reporting threshold ($3,000)
     AND total exceeds $10,000
     THEN: flag for investigation

   Rule: Rapid fund movement
     IF wallet receives top-up AND transfers out > 80% within 1 hour
     THEN: flag as potential layering

   Rule: Geographic anomaly
     IF transaction originates from high-risk jurisdiction
     AND user profile indicates different home country
     THEN: enhanced review

   Rule: Network analysis
     IF multiple wallets share device fingerprint or IP
     AND show coordinated transfer patterns
     THEN: flag as potential mule network

3. Suspicious Activity Reports (SARs):
   - Auto-generated for high-risk patterns
   - Compliance officer review within 24 hours
   - Filed with FinCEN / local FIU within regulatory deadline
```

### Money Transmission Licensing

```
Regulatory requirements by jurisdiction:
  United States: MSB registration (FinCEN) + state MTL (47 states + DC)
  European Union: EMD2 (E-Money Directive) license
  India: PPI (Prepaid Payment Instrument) license from RBI
  United Kingdom: EMI (Electronic Money Institution) license from FCA
  Singapore: MPI (Major Payment Institution) license from MAS

Key obligations:
  - Segregation of user funds (held in trust at partner bank)
  - Regular regulatory reporting (transaction volumes, AML stats)
  - Capital adequacy requirements
  - Annual audit by licensed external auditor
  - Data localization (user data stored in jurisdiction for India, EU)
  - Consumer protection (dispute resolution, fraud liability limits)
```

---

## Fraud Detection

### Real-Time Fraud Scoring Pipeline

```
Transaction submitted → Fraud Detection Service (< 100ms)

Feature extraction (parallel, < 30ms):
├── Velocity features (from Redis):
│   ├── txn_count_1h, txn_count_24h, txn_count_7d
│   ├── total_amount_1h, total_amount_24h
│   ├── unique_recipients_24h
│   └── failed_txn_count_1h
├── Device features:
│   ├── device_age_days, is_new_device
│   ├── device_trust_score, is_rooted_jailbroken
│   └── device_fingerprint_match
├── Behavioral features:
│   ├── typical_txn_amount (mean, stddev)
│   ├── typical_txn_time (hour of day pattern)
│   ├── typical_recipient_type
│   └── session_duration_before_txn
├── Network features:
│   ├── ip_risk_score, is_vpn_tor
│   ├── geolocation_vs_home_distance
│   └── ip_country_match_profile
└── Relationship features:
    ├── sender_receiver_prior_txn_count
    ├── receiver_account_age_days
    └── receiver_inbound_txn_diversity

ML model inference (< 50ms):
  Input: 50+ features
  Output: risk_score (0-100)

Decision:
  score < 30:  APPROVE (auto-approve, log for audit)
  score 30-70: GRAY ZONE (approve with enhanced monitoring OR step-up auth)
  score > 70:  DECLINE (block transaction, alert user)
  score > 90:  DECLINE + SUSPEND (block + freeze wallet for review)
```

### Velocity Rules (Pre-ML Layer)

```
Hard limits applied BEFORE ML scoring (< 5ms):

Rule 1: Max 20 transactions per hour per wallet
Rule 2: Max $5,000 total value per hour per wallet
Rule 3: Max 5 unique new recipients per day
Rule 4: Max 3 failed PIN attempts → temporary lock (30 min)
Rule 5: No transactions from known-compromised device fingerprints
Rule 6: No transactions exceeding KYC tier limits
Rule 7: Max 2 device changes per 24 hours

These rules catch obvious abuse without ML model latency.
ML model handles nuanced patterns the rules cannot express.
```

### Device Fingerprinting

```
Device risk assessment:
  Factor 1: Hardware integrity
    - Is device rooted/jailbroken? (+30 risk points)
    - Is running in emulator? (+50 risk points)
    - Is accessibility service intercepting touches? (+20 risk points)

  Factor 2: App integrity
    - Is app tampered/repackaged? (block entirely)
    - Is debugger attached? (block entirely)
    - Is screen overlay detected? (+15 risk points)

  Factor 3: Device history
    - Number of wallets created from this device
    - Number of wallets banned from this device
    - Device age (new device = higher risk)

  Factor 4: Behavioral biometrics
    - Touch pressure and area patterns
    - Typing rhythm (PIN entry cadence)
    - Scroll velocity patterns
    - Deviation from user's baseline → increased risk
```

---

## Encryption & Data Protection

### Data Classification

```
┌──────────────┬──────────────────────────────┬─────────────────────┐
│ Level        │ Data Types                   │ Protection          │
├──────────────┼──────────────────────────────┼─────────────────────┤
│ Critical     │ Transaction PIN, card tokens, │ HSM-managed keys,  │
│              │ bank account details,         │ field-level encrypt,│
│              │ biometric templates           │ never logged        │
├──────────────┼──────────────────────────────┼─────────────────────┤
│ Sensitive    │ Wallet balances, transaction │ AES-256 at rest,    │
│              │ history, KYC documents,       │ TLS in transit,     │
│              │ phone numbers                 │ access-controlled   │
├──────────────┼──────────────────────────────┼─────────────────────┤
│ Internal     │ Transaction IDs, timestamps, │ Encrypted at rest,  │
│              │ service logs, system metrics  │ standard access     │
│              │                              │ controls            │
├──────────────┼──────────────────────────────┼─────────────────────┤
│ Public       │ Merchant names, fee schedule │ No encryption       │
│              │                              │ needed              │
└──────────────┴──────────────────────────────┴─────────────────────┘
```

### Encryption Architecture

```
Transport: TLS 1.3 for all API communication
  - Certificate pinning in mobile apps
  - mTLS between internal services

At rest: AES-256-GCM for database encryption
  - Transparent data encryption (TDE) for database volumes
  - Field-level encryption for PII (phone, email, bank details)
  - Separate encryption keys per data classification level

Key management:
  - HSM (Hardware Security Module) for master keys
  - Envelope encryption: data encrypted with DEK, DEK encrypted with KEK in HSM
  - Key rotation: every 90 days (automatic)
  - Key per shard: compromise of one shard's key does not expose others

Tokenization:
  - Card numbers: tokenized via payment network tokenization
  - Bank accounts: internal tokenization (reference token → encrypted details)
  - Phone numbers: hashed for lookup, encrypted for display
```

### PCI-DSS Compliance

```
Scope: Card-linked wallet top-up and card payments

PCI-DSS v4.0 requirements applied:
  Requirement 1: Network segmentation (card processing in isolated VLAN)
  Requirement 3: Protect stored cardholder data (tokenized, never stored raw)
  Requirement 4: Encrypt transmission (TLS 1.3)
  Requirement 6: Secure development (SAST/DAST in CI pipeline)
  Requirement 8: Strong access control (MFA for all admin access)
  Requirement 10: Logging and monitoring (all card data access logged)
  Requirement 11: Regular security testing (quarterly ASV scans, annual pentest)
  Requirement 12: Security policies and procedures

Scope minimization: Use payment processor SDK for card capture
  → Card numbers never touch wallet backend servers
  → Only tokenized references stored
  → PCI scope limited to token storage and API calls
```

---

## NFC / Contactless Payment Security

### Tokenization Flow (NFC Tap-to-Pay)

```
Setup (one-time):
1. User adds wallet to device's NFC payment capability
2. Device generates device-specific key pair in Secure Element (SE)
3. Wallet backend provisions a Device Account Number (DAN)
   → DAN replaces actual wallet ID in NFC transactions
4. DAN stored in Secure Element → cannot be extracted by OS or apps

Payment flow:
1. User holds phone near POS terminal
2. SE authenticates user (biometric/PIN on device)
3. SE generates one-time cryptogram:
   Cryptogram = HMAC(DAN + amount + timestamp + counter, device_key)
4. NFC transmits: DAN + cryptogram + counter (NOT wallet ID or balance)
5. POS terminal sends to payment network
6. Payment network validates cryptogram with wallet backend
7. Wallet backend: validate → debit wallet → confirm to POS

Security properties:
  - Real wallet ID never transmitted over NFC
  - Cryptogram is one-time use (replay attack impossible)
  - Device key never leaves Secure Element
  - Stolen DAN without device key is useless
```

### QR Code Security

```
Merchant-presented QR:
  Content: signed(merchant_id + amount + nonce + timestamp, merchant_key)
  Verification: user's app validates signature before processing payment
  Expiry: QR valid for 5 minutes (nonce prevents replay)
  Tamper detection: if signature invalid → reject and alert user

User-presented QR (for receiving payments):
  Content: signed(wallet_id + one_time_token, user_session_key)
  Token: valid for 60 seconds, single-use
  Display: auto-refresh QR every 30 seconds

QR tampering prevention:
  - Dynamic QR (not static) with time-bound tokens
  - Merchant QR signed with merchant's registered key
  - Amount displayed on both sender and receiver screens before confirmation
```

---

## Audit Trail

```
Every action in the system produces an immutable audit record:

Audit record schema:
  - event_id (UUID)
  - event_type (TRANSACTION, LOGIN, KYC_SUBMIT, ADMIN_ACTION, etc.)
  - actor_id (user, admin, or system)
  - actor_type (USER, MERCHANT, ADMIN, SYSTEM)
  - resource_type (WALLET, TRANSACTION, KYC_RECORD)
  - resource_id
  - action (CREATE, READ, UPDATE, DEBIT, CREDIT, APPROVE, REJECT)
  - details (JSON: before/after state, IP, device, location)
  - timestamp

Storage: append-only log (Kafka → object storage)
Retention: 7 years minimum (regulatory)
Access: compliance team via read-only analytics interface
Integrity: hash chain (each record includes hash of previous record)
```
