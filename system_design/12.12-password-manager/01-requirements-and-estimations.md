# 01 — Requirements & Estimations: Password Manager

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR1 | **Account creation & authentication** | Register with email; authenticate using OPAQUE protocol (master password never transmitted) |
| FR2 | **Master password key derivation** | Client-side Argon2id derivation produces account key and authentication credential |
| FR3 | **Vault item CRUD** | Create, read, update, delete passwords, secure notes, credit cards, TOTP seeds, SSH keys |
| FR4 | **Client-side encryption/decryption** | All item content encrypted on device before upload; server stores only ciphertext |
| FR5 | **Multi-device sync** | Vault changes propagate to all authenticated devices within seconds; offline-first |
| FR6 | **Browser extension autofill** | Detect login forms, suggest matching credentials, fill username/password with origin verification |
| FR7 | **Password generator** | Generate passwords/passphrases with configurable length, character sets, word lists |
| FR8 | **Secure sharing** | Share individual items or vaults with other users via asymmetric re-encryption |
| FR9 | **Emergency access** | Designate trusted contacts who can request access after a configurable time delay |
| FR10 | **Breach detection** | Check credentials against breach databases using k-anonymity (no full hash sent to server) |
| FR11 | **Multi-factor authentication** | TOTP, hardware security keys (FIDO2/WebAuthn), push-based 2FA |
| FR12 | **Passkey storage and autofill** | Store FIDO2 passkeys; replay WebAuthn assertions during authentication flows |
| FR13 | **Audit log** | Tamper-evident log of access events (metadata only, no plaintext) |
| FR14 | **Import/export** | Import from CSV/other managers; export encrypted vault or plaintext (with confirmation gate) |
| FR15 | **Organization vaults** | Shared vaults for teams with role-based access (viewer, editor, admin) |

---

## Out of Scope

- Full privileged access management (PAM) with session recording and just-in-time access provisioning
- Secret scanning across code repositories (CI/CD integration)
- Hardware Security Module (HSM) management for enterprise root-of-trust (mentioned architecturally but not detailed)
- Mobile SDK for third-party application integration
- Real-time collaboration/editing on shared vault items

---

## Non-Functional Requirements

### Immutability & Integrity

| Property | Requirement |
|---|---|
| **Vault integrity** | Each vault item carries an AEAD authentication tag; tampering is detectable client-side |
| **Audit log integrity** | Append-only, hash-chained audit entries; deletion or modification is cryptographically detectable |
| **Key history** | Previous vault key versions retained (encrypted) to allow decryption of older backups |

### Performance

| Operation | Target Latency (p99) |
|---|---|
| Vault unlock (local decrypt after auth) | < 500ms on mid-range device |
| Vault sync (incremental, online) | < 2s end-to-end |
| Autofill suggestion render | < 100ms after page load |
| Password generation | < 50ms |
| Breach check (k-anonymity query) | < 1s |
| Full vault initial download (500 items) | < 5s |

### Scalability

| Dimension | Requirement |
|---|---|
| **Users** | 50M registered accounts, 10M daily active users |
| **Vaults** | Horizontal scaling with consistent hashing across vault shards |
| **Sync throughput** | 50,000 vault change events per second at peak |
| **Organization vaults** | Support orgs with up to 100,000 members sharing vaults |
| **Reads vs. writes** | Read-heavy (10:1 ratio); optimize for fast ciphertext retrieval |

### Availability

| Dimension | Requirement |
|---|---|
| **Uptime** | 99.95% monthly availability for sync and auth services |
| **Offline operation** | Full read/write capability offline; sync on reconnect |
| **Degraded mode** | If sync is unavailable, local encrypted cache allows continued operation |
| **Recovery RTO** | < 1 hour for region failover |
| **Recovery RPO** | < 5 minutes of data loss on catastrophic failure |

### Security

| Control | Requirement |
|---|---|
| **Zero-knowledge** | Server never possesses master password, account key, or vault key in plaintext |
| **Transport security** | TLS 1.3 with certificate pinning in mobile apps |
| **Encryption algorithms** | AES-256-GCM, X25519, Ed25519, Argon2id, HKDF-SHA256 |
| **Key storage** | Per-device session keys in OS secure storage (Keychain, Keystore, OS secret service) |
| **Brute-force protection** | Server-side rate limiting on auth; client-side Argon2id makes offline attacks expensive |
| **Session management** | Short-lived JWT session tokens (15-min expiry); refresh tokens rotate on use |
| **Penetration testing** | Annual third-party audit; continuous automated scanning |

### Compliance

| Standard | Requirement |
|---|---|
| **SOC 2 Type II** | Annual audit covering security, availability, and confidentiality trust service criteria |
| **GDPR** | User data deletion on request; data residency options for EU users |
| **HIPAA** | Business Associate Agreement (BAA) available for enterprise health-sector customers |
| **CCPA** | California consumer privacy rights: access, deletion, opt-out |
| **NIST SP 800-63B** | Authentication guidelines for identity assurance levels; passkey support for AAL2 |

---

## Capacity Estimations

### Users & Vaults

```
Registered users:           50,000,000
Daily active users (DAU):   10,000,000  (20% of registered)
Avg vault items per user:   150
Total vault items:          50M × 150 = 7.5 billion items
Avg ciphertext per item:    ~2 KB (name + username + password + notes + metadata, encrypted)
Total vault storage:        7.5B × 2KB = 15 TB of ciphertext
Audit log entries/day:      10M DAU × 20 events = 200M entries/day
Audit log storage/year:     200M × 500 bytes × 365 = ~36 TB/year
```

### Operations & Throughput

```
Vault sync events:
  10M DAU × 5 changes/day = 50M changes/day
  Peak factor 3x:           150M changes/day at peak
  Peak per-second:          150M / (24×3600) ≈ 1,736/s average
  Burst (morning sync):     ~50,000/s

Auth events:
  10M DAU × 2 auth/day = 20M auth events/day
  Peak per-second:         ~500 auth/s average, ~5,000/s burst

Read/write ratio:           10:1 (most operations are reads during autofill)
```

### Storage

```
Vault ciphertext:                 15 TB  (current)
Annual growth (20% YoY):         +3 TB/year
Audit logs:                       36 TB/year
User key material (public keys):  50M × 256 bytes = 12.5 GB
Session/token store:              10M active sessions × 512 bytes = 5 GB
Breach database (hashed):         ~10 TB (k-anonymity prefix index)
Total current storage:            ~15 TB vault + ~50 TB audit = ~65 TB
```

### Bandwidth

```
Vault sync:
  50M changes/day × 2 KB/change = 100 GB/day upload
  Reads (10×):                   = 1 TB/day download
  Total:                         ~1.1 TB/day, ~13 MB/s average

Auth:
  20M × 2 KB = 40 GB/day

Browser extension:
  Autofill suggestions (10M DAU × 10 page loads × 200 bytes) = 20 GB/day

Peak bandwidth (10× average):    ~130 MB/s inbound, ~130 MB/s outbound
CDN cache for static assets:     reduces origin traffic by ~60%
```

---

## Service Level Objectives (SLOs)

| SLO | Target | Measurement Window |
|---|---|---|
| Authentication success latency p99 | < 500ms | Rolling 1 hour |
| Vault sync propagation p95 | < 3s | Rolling 1 hour |
| Autofill suggestion availability | 99.9% | Monthly |
| Breach check response p99 | < 1.5s | Rolling 1 hour |
| Sync service availability | 99.95% | Monthly |
| Audit log write durability | 99.999% | Annually |
| Vault data durability | 99.9999999% (9-nines) | Annually |
| Passkey authentication success rate | > 99.5% | Daily |
| Emergency access grant latency | < 24h (human-gated) | Per request |
| Mean time to detect breach | < 15 min | Per incident |
