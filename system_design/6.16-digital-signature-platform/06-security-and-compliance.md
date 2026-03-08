# Security & Compliance

## Authentication

### Sender Authentication

Senders (users who create and send envelopes) authenticate via standard enterprise mechanisms:

| Method | Use Case | Implementation |
|--------|----------|---------------|
| **OAuth 2.0 + OIDC** | Web application, mobile app | Authorization code flow with PKCE |
| **SAML 2.0** | Enterprise SSO integration | IdP-initiated or SP-initiated flow |
| **API Keys** | Server-to-server integrations | HMAC-signed API keys with org-level scoping |
| **MFA** | All sender accounts | TOTP, WebAuthn/FIDO2, or push notification |

### Signer Authentication

Signers may not be platform users. Authentication is per-envelope, per-signer:

| Level | Method | When to Use | Security Strength |
|-------|--------|-------------|-------------------|
| **Level 1: Email** | Signer clicks unique link sent to their email | Low-risk documents, internal signing | Low (relies on email security) |
| **Level 2: Email + OTP** | After clicking link, signer enters one-time code sent to email or SMS | Medium-risk documents (contracts, agreements) | Medium |
| **Level 3: Knowledge-Based Authentication (KBA)** | Signer answers identity questions from credit bureau data | High-risk documents (financial, legal) | Medium-High |
| **Level 4: ID Verification** | Signer uploads government ID + live selfie for comparison | Highest-risk documents (eIDAS QES, regulated industries) | High |
| **Level 5: Certificate-Based** | Signer uses personal X.509 certificate (smart card, USB token, or cloud HSM) | eIDAS Qualified Electronic Signatures | Highest |

### Signer Token Security

```
Token Properties:
- Length: 256 bits (32 bytes) cryptographically random
- Storage: SHA-256 hash stored in database (not plaintext)
- Expiry: Configurable per org (default: 72 hours from send)
- Single-use session: Token creates a session; session has its own expiry
- Bound to envelope: Token is valid only for the specific envelope
- Invalidation: Token invalidated on: signing completion, decline, void, expiry, manual resend
```

### Session Management

```
Signing Session Properties:
- Created when signer authenticates successfully
- Session ID: Cryptographically random, stored in HTTP-only secure cookie
- Session TTL: 60 minutes (renewable on activity)
- Idle timeout: 15 minutes of inactivity
- Bound to: signer_id + envelope_id + IP address
- IP binding: Optional (configurable per org; may break for mobile users)
- One active session per signer per envelope (new session invalidates old)
```

---

## Authorization

### Envelope Access Control

| Role | Create | View | Sign | Void | Download | Manage Fields | View Audit |
|------|--------|------|------|------|----------|--------------|-----------|
| **Sender** | Yes | Yes (own envelopes) | No (cannot self-sign unless also a signer) | Yes (own envelopes) | Yes | Yes (before sending) | Yes |
| **Signer** | No | Own assigned fields only | Yes (own fields) | No | Yes (after completion) | No | No |
| **CC Recipient** | No | Yes (view only) | No | No | Yes (after completion) | No | No |
| **Witness** | No | Yes (during signing) | Yes (witness signature) | No | Yes (after completion) | No | No |
| **Org Admin** | Yes | All org envelopes | No | Yes (any org envelope) | Yes | Yes | Yes |
| **Compliance Officer** | No | All org envelopes | No | No | Yes (including voided/declined) | No | Yes (full audit trail) |

### API Authorization

```
Authorization Model:
1. Authenticate request (OAuth token / API key / signer session)
2. Extract principal: {user_id, org_id, role} or {signer_id, envelope_id}
3. Check resource ownership: Does this principal have access to this envelope?
4. Check action permission: Can this role perform this action on this resource?
5. Log authorization decision to audit trail
```

---

## Cryptographic Standards

### Signature Algorithms

| Algorithm | Key Size | Use Case | Standard |
|-----------|----------|----------|----------|
| **RSA** | 2048-bit minimum, 4096-bit recommended | Document signing, platform sealing | PKCS#1 v2.1 (PSS padding) |
| **ECDSA** | P-256 (secp256r1) | Document signing (faster, smaller signatures) | FIPS 186-4 |
| **SHA-256** | 256-bit output | Document hashing, audit trail hashing | FIPS 180-4 |
| **SHA-384** | 384-bit output | High-security document hashing | FIPS 180-4 |
| **AES-256-GCM** | 256-bit key | Document encryption at rest | FIPS 197 |

### Signature Format Standards

| Format | Description | Use Case |
|--------|-------------|----------|
| **PKCS#7 / CMS** | Cryptographic Message Syntax---encapsulates signature + certificate chain | Basic digital signatures |
| **CAdES** | CMS Advanced Electronic Signatures---extends CMS with timestamps and revocation data | eIDAS-compliant long-term signatures |
| **PAdES** | PDF Advanced Electronic Signatures---CAdES embedded in PDF structure | PDF-native signatures with long-term validation |
| **XAdES** | XML Advanced Electronic Signatures | XML document signing (out of scope for this platform) |

### Encryption

| Data State | Encryption | Key Management |
|-----------|-----------|---------------|
| **In transit** | TLS 1.3 (minimum TLS 1.2) | Managed by load balancer / API gateway |
| **At rest (documents)** | AES-256-GCM | Envelope-level encryption key, wrapped by org master key |
| **At rest (database)** | Transparent data encryption (TDE) | Database-managed encryption keys |
| **At rest (audit log)** | AES-256-GCM | Separate audit encryption key (not accessible by application admins) |
| **HSM key storage** | Hardware-protected | FIPS 140-2 Level 3 physical tamper resistance |

### Envelope-Level Encryption

```
Key Hierarchy for Document Encryption:
1. Platform Master Key (stored in HSM, rotated annually)
2. Organization Master Key (derived from platform key + org_id, stored encrypted in DB)
3. Envelope Encryption Key (random AES-256 key per envelope, encrypted with org master key)
4. Document encrypted with envelope key
5. On retrieval: decrypt envelope key with org master key, then decrypt document
```

---

## Legal Compliance

### ESIGN Act (USA)

The Electronic Signatures in Global and National Commerce Act (2000) establishes:

| Requirement | Implementation |
|------------|---------------|
| **Intent to sign** | Explicit "I agree to sign electronically" consent step before signing |
| **Consent to electronic records** | Consent disclosure presented before signing; consent recorded in audit trail |
| **Association with record** | Signature is linked to specific document hash + field position |
| **Record retention** | Signed documents stored for configurable retention period (minimum 7 years) |
| **Ability to access** | All parties can download signed documents at any time during retention |
| **Record integrity** | Hash-chained audit trail + document sealing ensures integrity |

### eIDAS (European Union)

The Electronic Identification, Authentication, and Trust Services Regulation defines three signature levels:

| Level | eIDAS Article | Requirements | Platform Implementation |
|-------|--------------|-------------|----------------------|
| **Simple Electronic Signature (SES)** | Art. 25(1) | Data in electronic form attached to other data used to sign | Click-to-sign, typed name, drawn signature; platform audit trail provides evidence |
| **Advanced Electronic Signature (AES)** | Art. 26 | Uniquely linked to signatory, capable of identifying signatory, under sole control, linked to data so changes are detectable | Certificate-based signature with MFA authentication; HSM key under signer's control (activated by authentication); document hash signed |
| **Qualified Electronic Signature (QES)** | Art. 25(2) | AES requirements + created by Qualified Signature Creation Device (QSCD) + based on qualified certificate from QTSP | HSM certified to FIPS 140-2 L3 or Common Criteria EAL4+; identity verified by Qualified Trust Service Provider; qualified certificate issued; legally equivalent to handwritten signature |

### Architectural Differences Between eIDAS Levels

```
SES Flow:
  Signer → Email link → Click "Sign" → Platform stores signature image + metadata
  ↳ No cryptographic signing of document hash
  ↳ Platform audit trail is the evidence

AES Flow:
  Signer → Email link → MFA (OTP/KBA) → HSM generates document hash signature
  ↳ Signer's private key in HSM, activated by MFA
  ↳ PKCS#7 signature embedded in PDF
  ↳ Signer identified by certificate in signature

QES Flow:
  Signer → Email link → ID Verification (government ID + selfie) → QTSP issues certificate
  → HSM (QSCD-certified) signs document hash → PKCS#7/CAdES with qualified certificate
  ↳ QTSP verifies identity before certificate issuance
  ↳ HSM meets QSCD requirements (certified hardware)
  ↳ Long-term validation data (timestamps, OCSP responses) embedded
  ↳ Legally equivalent to handwritten signature across all EU member states
```

### UETA (Uniform Electronic Transactions Act)

Adopted by 47+ US states. Requirements align with ESIGN Act. Key distinction: UETA is state law; ESIGN is federal. Platform compliance with ESIGN generally satisfies UETA.

### HIPAA (Healthcare)

For healthcare documents requiring electronic signatures:

| Requirement | Implementation |
|------------|---------------|
| **Business Associate Agreement (BAA)** | Platform signs BAA with healthcare orgs |
| **Access controls** | Role-based access; minimum necessary principle |
| **Audit trail** | All access logged; 6-year retention minimum |
| **Encryption** | AES-256 at rest and in transit |
| **Data residency** | US-only data storage for HIPAA-covered data |

### Data Residency and Sovereignty

| Region | Regulation | Requirement |
|--------|-----------|-------------|
| **EU** | GDPR + eIDAS | Document data may need to stay within EU; qualified signatures require EU-based QTSP |
| **US** | ESIGN + state laws | No federal data residency requirement; some states have industry-specific rules |
| **India** | IT Act 2000 | Electronic signatures recognized; certain documents require Aadhaar-based digital signature |
| **Brazil** | MP 2.200-2 | ICP-Brasil infrastructure for legally binding digital signatures |
| **Canada** | PIPEDA + provincial laws | No strict data residency; but recommended for sensitive documents |

---

## Threat Model

### Attack Surface Analysis

| Attack Vector | Threat | Impact | Mitigation |
|--------------|--------|--------|------------|
| **Signer token replay** | Attacker intercepts email, uses signing link | Unauthorized signature on legal document | Short token expiry (72h), single-session binding, optional MFA, IP logging |
| **Signer impersonation** | Attacker claims to be authorized signer | Fraudulent signature | Multi-factor authentication (OTP, KBA, ID verification); authentication level configurable per signer |
| **PDF injection** | Attacker modifies PDF to show different content to signer vs. what is signed | Signer unknowingly signs malicious content | Server-side PDF rendering (signer sees platform-rendered image, not raw PDF); document hash covers entire PDF |
| **Audit log tampering** | Database admin modifies audit records | Legal evidence destroyed | Hash-chained audit trail detects any modification; immutable backup store; TSA timestamps |
| **Man-in-the-middle** | Attacker intercepts signing session | Session hijack, signature theft | TLS 1.3, HSTS, certificate pinning for API clients |
| **HSM key extraction** | Physical attack on HSM | All signatures compromisable | FIPS 140-2 L3 HSMs with tamper zeroization; key ceremonies with multi-party authorization |
| **Replay attack on signatures** | Reuse a captured PKCS#7 signature on a different document | Fraudulent signed document | Signature includes document hash; different document = different hash = signature invalid |
| **Bulk send abuse** | Compromised account sends spam via platform | Reputation damage, email blocklisting | Rate limiting, org-level sending quotas, abuse detection (unusual volume patterns) |
| **Denial of service on HSM** | Flood HSM with signing requests | Legitimate signatures blocked | Rate limiting at API gateway; HSM request queuing with priority; circuit breaker |

### Defense in Depth

```
Layer 1: Network
  - WAF (Web Application Firewall) blocks common attack patterns
  - DDoS protection at edge
  - TLS 1.3 for all connections

Layer 2: Application
  - Input validation on all API endpoints
  - CSRF protection on signing sessions
  - Content Security Policy headers
  - Rate limiting per user, org, and IP

Layer 3: Data
  - Encryption at rest (AES-256-GCM)
  - Encryption in transit (TLS 1.3)
  - Envelope-level encryption keys
  - HSM for all cryptographic key operations

Layer 4: Audit
  - Hash-chained audit trail
  - Immutable backup store
  - External timestamp anchoring
  - All access logged with IP and user agent

Layer 5: Compliance
  - Regular penetration testing
  - SOC 2 Type II certification
  - Annual security audits
  - GDPR Data Protection Impact Assessment
```

### Penetration Testing Focus Areas

1. **Signer token security**: Can tokens be predicted, reused, or extended beyond expiry?
2. **Cross-envelope access**: Can a signer token for Envelope A access Envelope B?
3. **PDF content manipulation**: Can the displayed PDF differ from what is cryptographically signed?
4. **Audit trail integrity**: Can audit events be modified, deleted, or reordered without detection?
5. **HSM access controls**: Can unauthorized operations be performed on HSM keys?
6. **Bulk send abuse**: Can rate limits be bypassed for bulk operations?
7. **Session fixation/hijack**: Can signing sessions be stolen or fixated?
