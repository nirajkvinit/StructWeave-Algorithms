# Security & Compliance

## Authentication & Authorization

### Authentication Mechanisms

| Client Type | AuthN Method | Details |
|-------------|-------------|---------|
| **Web/Mobile App** | Passkey (WebAuthn/FIDO2) + JWT | Passkey creates P256 key pair on device; server verifies assertion; issues JWT for session |
| **SDK Integration** | API Key + HMAC signature | API key identifies the app; HMAC signs each request body with secret key |
| **Institutional API** | mTLS + API Key | Mutual TLS for transport; API key for identity; IP allowlisting |
| **Admin Console** | SSO (OIDC) + Hardware MFA | Federated login via enterprise IdP; FIDO2 hardware key required for admin actions |

### Passkey Authentication Flow (WebAuthn)

```mermaid
sequenceDiagram
    participant User
    participant App as Wallet App
    participant Auth as Auth Service
    participant Device as Secure Enclave (Device)

    Note over User,Device: Registration (one-time)
    User->>App: Create account
    App->>Auth: Request registration challenge
    Auth-->>App: challenge + relying_party_id
    App->>Device: navigator.credentials.create(challenge)
    Device->>Device: Generate P256 key pair in Secure Enclave
    Device-->>App: attestation (public_key + signed_challenge)
    App->>Auth: Submit attestation
    Auth->>Auth: Verify attestation + store public key
    Auth-->>App: Registration complete

    Note over User,Device: Authentication (every login)
    User->>App: Sign in
    App->>Auth: Request auth challenge
    Auth-->>App: challenge + allowCredentials
    App->>Device: navigator.credentials.get(challenge)
    Device->>User: Biometric prompt (Face ID / fingerprint)
    User-->>Device: Biometric confirmed
    Device->>Device: Sign challenge with private key
    Device-->>App: assertion (signed_challenge)
    App->>Auth: Submit assertion
    Auth->>Auth: Verify P256 signature against stored public key
    Auth-->>App: JWT access_token + refresh_token
```

### Authorization Model

**Layered authorization with RBAC + ABAC:**

| Layer | Scope | Mechanism |
|-------|-------|-----------|
| **Organization** | Who can access the org's wallets | RBAC: Admin, Signer, Viewer, Auditor |
| **Wallet** | Who can sign from this wallet | Policy engine: multi-approval quorum, role requirements |
| **Transaction** | Can this specific transaction proceed | ABAC: amount, destination, chain, time, velocity |
| **Key Share** | Can this party participate in signing | MPC protocol: only key share holders can participate; no delegation |

**Role Definitions:**

| Role | Create Wallet | View Balance | Sign Txn | Manage Policy | Manage Users |
|------|:---:|:---:|:---:|:---:|:---:|
| **Admin** | Yes | Yes | No (unless also Signer) | Yes | Yes |
| **Signer** | No | Yes | Yes (subject to policy) | No | No |
| **Viewer** | No | Yes | No | No | No |
| **Auditor** | No | Yes (read-only) | No | View only | No |

### Token Management

| Token | Lifetime | Storage | Refresh |
|-------|----------|---------|---------|
| Access JWT | 15 min | Memory only (never disk) | Via refresh token |
| Refresh token | 7 days | Secure HTTP-only cookie / Keychain | Rotation on use (one-time use) |
| API Key | Until revoked | Server-side hashed (bcrypt) | Manual rotation; old key grace period = 24h |
| Session key (ERC-4337) | Configurable (1h--30d) | On-chain smart account | New session key signed by owner key |

---

## Data Security

### Encryption at Rest

| Data | Encryption | Key Management |
|------|-----------|----------------|
| Key shares | AES-256-GCM | Encryption key stored in HSM; key share encrypted before storage; double-encryption with backup key |
| Wallet DB | AES-256 (TDE) | Database-level transparent encryption; key in HSM |
| Audit logs | AES-256-GCM + hash chain | Each entry encrypted; hash chain provides tamper evidence |
| Backups | AES-256-GCM | Backup-specific key in HSM; different from primary encryption key |
| Cache (Redis) | AES-256 | In-transit encryption via TLS; at-rest encryption for persistence files |

### Encryption in Transit

| Path | Protocol | Details |
|------|----------|---------|
| Client → API Gateway | TLS 1.3 | Certificate pinning in mobile SDK; HSTS headers |
| Service → Service | mTLS | Service mesh-managed certificates; auto-rotation every 24h |
| Signer Node → Signer Node | TLS 1.3 + application-layer encryption | MPC protocol messages additionally encrypted with session keys |
| Service → HSM | HSM vendor protocol (PKCS#11 over TLS) | Hardware-attested connection |
| Service → Blockchain | TLS 1.3 (HTTPS RPC) | Certificate validation; no self-signed certs |

### Key Hierarchy

```mermaid
flowchart TB
    ROOT[Root Master Key - HSM]
    ROOT --> KEK1[Key Encryption Key - Region A]
    ROOT --> KEK2[Key Encryption Key - Region B]

    KEK1 --> SHARE_KEY1[Share Encryption Key - Wallet Group 1]
    KEK1 --> SHARE_KEY2[Share Encryption Key - Wallet Group 2]
    KEK2 --> SHARE_KEY3[Share Encryption Key - Wallet Group 3]

    SHARE_KEY1 --> S1[Encrypted Key Share 1a]
    SHARE_KEY1 --> S2[Encrypted Key Share 1b]
    SHARE_KEY2 --> S3[Encrypted Key Share 2a]
    SHARE_KEY3 --> S4[Encrypted Key Share 3a]

    ROOT --> AUDIT_KEY[Audit Log Encryption Key]
    ROOT --> BACKUP_KEY[Backup Encryption Key]

    classDef root fill:#fce4ec,stroke:#c62828,stroke-width:3px
    classDef kek fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef share fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef data fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px

    class ROOT root
    class KEK1,KEK2 kek
    class SHARE_KEY1,SHARE_KEY2,SHARE_KEY3,AUDIT_KEY,BACKUP_KEY share
    class S1,S2,S3,S4 data
```

### PII Handling

| Data | Classification | Treatment |
|------|---------------|-----------|
| Email address | PII | Encrypted at rest; access-logged; GDPR right-to-erasure supported |
| Blockchain addresses | Pseudo-anonymous | Not PII per se, but linked to user records; treat as sensitive |
| IP addresses | PII (under GDPR) | Logged for security only; 90-day retention; anonymized in analytics |
| KYC documents | Sensitive PII | Encrypted; stored in isolated service; access requires MFA + audit log |
| Transaction data | Financial data | Encrypted; retention per regulatory requirement (5--7 years) |

---

## Threat Model

### Top Attack Vectors

| # | Attack Vector | Severity | Likelihood | Mitigation |
|---|--------------|----------|------------|------------|
| 1 | **Key share exfiltration** from compromised server | Critical | Medium | TEE/HSM enclave: key shares never in plaintext outside secure boundary; memory encryption |
| 2 | **Insider threat** (malicious employee) | Critical | Low-Medium | No single employee has access to threshold shares; MPC requires multiple parties; all access logged |
| 3 | **Supply chain attack** on MPC library | Critical | Low | Vendor security audit; reproducible builds; code signing; multiple independent MPC implementations |
| 4 | **Social engineering** for recovery | High | Medium | Time-delayed recovery (48--72h); notification to original owner; guardian threshold not publicized |
| 5 | **Transaction manipulation** (address replacement) | High | Medium | Address book with verified addresses; clipboard protection in SDK; EIP-712 typed signing for human-readable txns |
| 6 | **API key compromise** | High | Medium-High | IP allowlisting; rate limiting; transaction policies enforce limits regardless of API key |
| 7 | **Blockchain front-running / MEV** | Medium | High | Private mempool submission (Flashbots Protect); transaction simulation before signing |
| 8 | **DDoS on signing service** | Medium | Medium | Rate limiting; WAF; signing service behind private network; capacity-based auto-scaling |

### Attack Tree: Key Share Exfiltration

```mermaid
flowchart TB
    GOAL[Exfiltrate Key Shares]

    GOAL --> A1[Compromise Platform Server]
    GOAL --> A2[Compromise User Device]
    GOAL --> A3[Compromise Backup Enclave]

    A1 --> A1a[Exploit application vulnerability]
    A1 --> A1b[Insider with server access]
    A1 --> A1c[Supply chain attack on dependencies]

    A1a --> BLOCK1[TEE enclave: app cannot read key memory]
    A1b --> BLOCK2[No single person has enclave access + audit logs]
    A1c --> BLOCK3[Code signing + reproducible builds + SCA scanning]

    A2 --> A2a[Malware on user device]
    A2 --> A2b[Physical device theft]

    A2a --> BLOCK4[Key share in Secure Enclave; biometric required]
    A2b --> BLOCK5[Device lock + biometric + share alone insufficient]

    A3 --> A3a[Cloud provider compromise]
    A3 --> A3b[Backup decryption key theft]

    A3a --> BLOCK6[Backup encrypted; cloud provider cannot read]
    A3b --> BLOCK7[Decryption key in HSM; requires physical access]

    classDef goal fill:#fce4ec,stroke:#c62828,stroke-width:3px
    classDef attack fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef block fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class GOAL goal
    class A1,A2,A3,A1a,A1b,A1c,A2a,A2b,A3a,A3b attack
    class BLOCK1,BLOCK2,BLOCK3,BLOCK4,BLOCK5,BLOCK6,BLOCK7 block
```

### Rate Limiting & DDoS Protection

| Layer | Protection | Configuration |
|-------|-----------|---------------|
| **Edge (CDN/WAF)** | IP-based rate limiting, geo-blocking | 1,000 req/min per IP; block known bot networks |
| **API Gateway** | Token-based rate limiting | Per-user limits based on tier (see API design) |
| **Signing Service** | Per-wallet signing rate | 100 signs/min per wallet; circuit breaker at service level |
| **Blockchain RPC** | Connection pooling + backpressure | Max concurrent RPC calls per chain; queue overflow rejection |

---

## Compliance

### Custody Regulations

| Jurisdiction | Regulation | Key Requirements | Architecture Impact |
|-------------|-----------|-----------------|---------------------|
| **EU** | MiCA (Markets in Crypto-Assets) | Custody licensing; segregation of client assets; capital requirements | Separate hot/cold wallet pools per client; real-time asset reconciliation |
| **US (NY)** | BitLicense | Cybersecurity program; capital reserve; AML/BSA compliance | SOC 2 Type II; independent penetration testing; quarterly AML reporting |
| **US (Federal)** | Travel Rule (FinCEN) | Originator/beneficiary info for transfers > $3,000 | TRISA/TRP protocol integration; counterparty identification service |
| **Dubai** | VARA (Virtual Assets Regulatory Authority) | Technology governance; custody segregation; client asset protection | Dubai-specific data residency; local compliance officer access |
| **Singapore** | MAS Payment Services Act | Major payment institution license for custody | Segregated custody; annual audit |

### Travel Rule Implementation

```mermaid
flowchart LR
    subgraph Originator["Originator VASP (Our Wallet)"]
        O1[User initiates transfer > threshold]
        O2[Collect originator info]
        O3[Identify beneficiary VASP]
    end

    subgraph Protocol["Travel Rule Protocol"]
        TR[TRISA / TRP / OpenVASP]
    end

    subgraph Beneficiary["Beneficiary VASP"]
        B1[Receive originator info]
        B2[Screen against sanctions]
        B3[Accept / Reject]
    end

    O1 --> O2 --> O3 --> TR
    TR --> B1 --> B2 --> B3
    B3 -->|Accepted| BROADCAST[Broadcast Transaction]
    B3 -->|Rejected| BLOCK[Block Transaction + Notify User]

    classDef orig fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef proto fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef benef fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class O1,O2,O3 orig
    class TR proto
    class B1,B2,B3 benef
```

### AML/KYC Integration

| Check | Trigger | Data Required | Blocking? |
|-------|---------|---------------|-----------|
| Identity verification (KYC) | Wallet creation | Name, DOB, address, ID document | Yes---cannot create wallet until verified |
| Sanctions screening | Every outbound transfer | Destination address; counterparty identity (if known) | Yes---blocked if match found |
| Transaction monitoring | All transactions | Amount, frequency, counterparty patterns | No (async)---flagged for compliance review |
| Enhanced due diligence | High-value or high-risk patterns | Source of funds documentation | Wallet may be restricted until EDD complete |

### Audit Trail Requirements

| Event | Data Captured | Retention | Immutability |
|-------|--------------|-----------|-------------|
| Wallet creation | User ID, org ID, custody type, key version | 7 years | Hash-chained append-only log |
| Signing operation | Wallet ID, tx hash, policy decision, signer nodes, timestamp | 7 years | Hash-chained + HSM-signed |
| Policy change | Changed by, old rules, new rules, timestamp | 7 years | Hash-chained |
| Key refresh | Old version, new version, participating nodes | Indefinite | Hash-chained + HSM-signed |
| Recovery event | Recovery type, guardians involved, delay applied | Indefinite | Hash-chained + HSM-signed |
| Admin action | Admin ID, action type, target, MFA method used | 7 years | Hash-chained |

### SOC 2 Type II Controls

| Trust Service Criteria | Control | Evidence |
|----------------------|---------|----------|
| **Security** | MPC key management; HSM-backed encryption; TEE enclaves | Penetration test reports; HSM FIPS 140-2 certificates |
| **Availability** | 99.99% signing uptime; multi-region redundancy | Uptime monitoring dashboards; incident post-mortems |
| **Processing Integrity** | Signature verification before broadcast; policy enforcement | Audit log analysis; automated compliance tests |
| **Confidentiality** | Key share isolation; encrypted storage; access controls | Access review reports; encryption configuration audits |
| **Privacy** | GDPR compliance; data minimization; right to erasure | Privacy impact assessment; data retention policy enforcement |
