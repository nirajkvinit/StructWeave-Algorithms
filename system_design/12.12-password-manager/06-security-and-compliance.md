# 06 — Security & Compliance: Password Manager

## Threat Model

### Assets and Adversaries

| Asset | Value | Adversary |
|---|---|---|
| Master password | Unlocks entire vault | Phishing, keylogger, shoulder surfing |
| Account key | Decrypts all vault keys | Memory scraping, device compromise |
| Vault key | Decrypts all items in a vault | Key store breach, insider threat |
| Item keys | Decrypts individual credentials | Vault DB breach |
| Session tokens | Provides authenticated API access | Network interception, XSS, token theft |
| Authentication credential (OPAQUE record) | Enables impersonation | Server DB breach |
| Emergency key shares | Enable account recovery | Compromised trusted contact |
| Breach database prefix queries | Infers password patterns | Traffic analysis |

### Threat Categories

**T1 — Server-Side Compromise**
- Attacker gains read/write access to vault database
- Impact: Access to ciphertext only (zero-knowledge protection); no plaintext without client-side keys
- Residual risk: Metadata leak (which accounts have items, item counts, modification times); integrity attacks if AAD not enforced

**T2 — Authentication Bypass**
- Brute force or credential stuffing against auth endpoint
- Mitigations: OPAQUE (master password never transmitted); server-side rate limiting (5 failed attempts = 15-min lockout + CAPTCHA); anomaly detection on login patterns

**T3 — Client Device Compromise**
- Malware on user device reads vault key from memory
- Impact: Full vault access
- Mitigations: Auto-lock on inactivity; biometric-protected device keys; memory encryption in OS Secure Enclave; short session TTL

**T4 — Browser Extension Attack**
- Malicious web page exploits autofill to extract credentials
- Mitigations: Content script isolation; origin-bound credential scoping; isTrusted event validation; DOM-based clickjacking defenses

**T5 — Supply Chain Attack on Extension**
- Compromised extension update distributes malicious version
- Mitigations: Extension signing; reproducible builds; CI/CD with dependency hash pinning; browser store review process; auto-rollback capability

**T6 — Insider Threat**
- Malicious employee at password manager company
- Impact: Access to ciphertext, metadata, key envelopes (still requires master password to decrypt)
- Mitigations: Zero-knowledge architecture limits blast radius; access logs; separation of duties; dual-control for key store administration

**T7 — Emergency Access Abuse**
- Attacker social-engineers trusted contact to initiate emergency access
- Mitigations: Multi-day wait period; immediate notification to account owner; owner can cancel at any time; threshold > 1 requires multiple colluding contacts

**T8 — Passkey Relay Attack**
- Attacker attempts to relay passkey authentication to a different origin
- Mitigations: WebAuthn origin binding (rpId must match origin); passkey credential scoped to specific rpId at registration; browser enforces origin binding

---

## Zero-Knowledge Proof Architecture

### What the Server Can and Cannot Know

**Server CAN observe:**
- Account IDs and email hashes (for account lookup)
- Item metadata: item IDs, vault IDs, timestamps, version vectors, is_deleted flag
- Number of items per vault
- Ciphertext sizes (rough approximation of content length)
- Access patterns: which items are synced most frequently, from which device IDs
- Emergency access relationships (who designated whom)
- IP addresses (hashed for audit, raw for rate limiting)
- Public keys (by definition public)

**Server CANNOT observe:**
- Master password or any derivative
- Account key, vault key, item keys in plaintext
- Item content: titles, usernames, passwords, notes, URLs
- Organization membership of specific credentials
- Which websites a user's credentials belong to

**AAD Enforcement (Addressing USENIX 2026 research):**
All encrypted items include the following in AEAD additional authenticated data:
```
AAD = SHA256(item_id || vault_id || schema_version || key_rotation_version)
```
This prevents the server from transposing ciphertext between items (integrity attack), as the auth tag validation would fail with wrong AAD values.

---

## Key Management

### Key Lifecycle

```
┌─────────────────────────────────────────────────────┐
│  ACCOUNT KEY LIFECYCLE                               │
│                                                       │
│  Create:     Derived from master password (Argon2id) │
│              Never stored in plaintext anywhere       │
│  Store:      Wrapped in OPAQUE exportKey at server   │
│  Access:     Re-derived at each login via OPAQUE     │
│  Rotate:     On master password change               │
│  Revoke:     On account deletion (key gone; ctext    │
│              retained per compliance, unreadable)    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  VAULT KEY LIFECYCLE                                 │
│                                                       │
│  Create:     Random 256-bit on vault creation        │
│  Store:      Wrapped in account key; stored server   │
│  Access:     Unwrapped by client using account key   │
│  Rotate:     On shared vault member revocation;      │
│              annual rotation recommended for orgs    │
│  Revoke:     Remove vault key envelope from revoked  │
│              account; existing items re-encrypted    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  ITEM KEY LIFECYCLE                                  │
│                                                       │
│  Create:     Random 256-bit per item at creation     │
│  Store:      Wrapped in vault key; stored with item  │
│  Access:     Unwrapped by client using vault key     │
│  Rotate:     If item is re-shared or explicitly      │
│              rotated by user                         │
│  Revoke:     Removed with item deletion              │
└─────────────────────────────────────────────────────┘
```

### Algorithm Choices and Rationale

| Algorithm | Use Case | Rationale |
|---|---|---|
| Argon2id | Key derivation from master password | Memory-hard; resists GPU/ASIC brute force; winner of Password Hashing Competition |
| AES-256-GCM | Symmetric encryption of all item content | NIST-approved; authenticated encryption (AEAD); hardware acceleration ubiquitous |
| X25519 | Asymmetric key exchange (sharing, emergency access) | Faster than RSA-4096; no parameter selection vulnerabilities; standard for modern key exchange |
| Ed25519 | Digital signatures (item integrity) | Fast verification; small key/signature size; secure against side-channel attacks |
| HKDF-SHA256 | Key derivation from shared secrets | Standard IETF key derivation; HMAC-based; strong security proofs |
| OPAQUE | Password-authenticated key exchange | UC-secure; prevents server-side offline attacks; IETF in progress |
| Shamir's Secret Sharing | Emergency access key splitting | Information-theoretically secure; well-studied; NIST-endorsed (NISTIR 8214C) |

---

## Breach Response Procedures

### Vault Data Breach

If vault database is compromised:
1. **T+0**: Incident declared; security team alerted; database access revoked
2. **T+1 hour**: Forensic snapshot taken; affected time range determined
3. **T+4 hours**: All active sessions invalidated; users forced to re-authenticate
4. **T+8 hours**: Affected user notification sent (required by GDPR within 72 hours of detection)
5. **T+24 hours**: Public transparency report published (scope, impact, protective measures)
6. **User action required**: Change master password (rotates account key; renders stolen ciphertext useless for new keys); generate new passwords for affected items

**Why a vault data breach is not catastrophic under zero-knowledge**: Stolen ciphertext without client-side keys requires brute-forcing the master password offline. With Argon2id (64MB, 3 iterations), testing a single password guess requires ~1 second per core. A 12-character random password with full charset takes ~10^18 seconds on a million-core cluster.

### Authentication Credential Breach

If OPAQUE server records are stolen:
1. OPAQUE records are not directly usable for vault decryption (exportKey requires OPAQUE protocol execution with the correct master password)
2. Attacker can run dictionary attacks against OPAQUE records offline
3. Response: Force all users to rotate master passwords (invalidates old OPAQUE records)
4. Weak passwords become the primary risk; breach detection UI warns users with weak passwords

### Key Store Breach

If encrypted account key envelopes are stolen:
1. Each envelope is protected by OPAQUE exportKey (requires master password to derive)
2. Compound attack: OPAQUE record + key envelope allows offline master password brute force against both simultaneously
3. Mitigation: Key store and auth store physically separated; different access credentials; separate network segment

---

## Compliance Framework

### SOC 2 Type II Controls

| Trust Service Criterion | Control |
|---|---|
| CC6.1 (Logical access) | RBAC; MFA required for admin; OPAQUE auth for users |
| CC6.6 (Threat protection) | WAF; DDoS mitigation; intrusion detection |
| CC7.1 (Anomaly detection) | ML-based login anomaly detection; rate limiting |
| CC9.1 (Vendor management) | Third-party dependency audits; SBOM maintained |
| A1.1 (Availability) | 99.95% SLO; auto-scaling; DR procedures |
| C1.1 (Confidentiality) | Zero-knowledge architecture; encrypted in transit and at rest |

### GDPR Compliance

| Requirement | Implementation |
|---|---|
| **Data minimization** | Server stores only ciphertext and metadata; no plaintext user data |
| **Right to erasure** | Account deletion removes all vault ciphertext, key envelopes, and audit log PII within 30 days |
| **Data portability** | Users can export vault in encrypted format (decryptable only with master password) |
| **Breach notification** | Automated pipeline detects and reports to DPA within 72 hours |
| **EU data residency** | EU accounts pinned to EU-West region; no cross-border transfer of user data |
| **DPA agreements** | Data Processing Agreements with all sub-processors |
| **Privacy by design** | Zero-knowledge architecture is the technical implementation of privacy by design |

### HIPAA Considerations

For enterprise health-sector customers with PHI in vaults:
- Business Associate Agreement (BAA) required before provisioning
- Enhanced audit logging with longer retention (7 years)
- Minimum password strength enforced at org level (12+ characters, complexity rules)
- Mandatory MFA for all organization accounts
- Access controls: vault items tagged with PHI classification; view logs required

---

## Security Hardening Checklist

### Server Hardening

- [ ] TLS 1.3 only; no TLS 1.0/1.1; HSTS with preloading
- [ ] Certificate Transparency monitoring; alert on unexpected issuance
- [ ] HTTP security headers: CSP, X-Frame-Options, X-Content-Type-Options
- [ ] Database connections over TLS with mutual auth
- [ ] Secrets (DB passwords, API keys) stored in managed secrets vault with automatic rotation
- [ ] Network segmentation: vault DB not directly reachable from internet
- [ ] Web Application Firewall with OWASP rule set + custom rules for password manager API

### Extension Hardening

- [ ] Manifest V3 (removes remote code execution capability)
- [ ] Strict CSP in extension manifest: no eval, no inline scripts
- [ ] All external resources hashed in CSP
- [ ] Extension signing with published public key; signature verification on update
- [ ] Content Security Policy prevents extension loading untrusted resources
- [ ] API calls pinned to production domain; no wildcard permissions

### Client Hardening

- [ ] Mobile: certificate pinning with backup pins; pin rotation process defined
- [ ] Memory: sensitive keys zeroed from memory after use (where language permits)
- [ ] Clipboard: auto-clear clipboard after 30 seconds when credential is copied
- [ ] Screen capture: vault content blocked from screenshots/screen recording on mobile
- [ ] Jailbreak/root detection: warn user; optionally disable biometric unlock
- [ ] Anti-tampering: code signing verified at startup on desktop
