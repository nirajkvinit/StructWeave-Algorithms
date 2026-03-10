# 02 — High-Level Design: Password Manager

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        WEB[Web App\nbrowser vault UI]
        EXT[Browser Extension\nautofill + overlay]
        MOB[Mobile App\niOS / Android]
        DESK[Desktop App\nnative client]
    end

    subgraph Edge["Edge & Gateway Layer"]
        CDN[CDN\nstatic assets + cached public keys]
        GW[API Gateway\nTLS termination, rate limiting,\nJWT validation]
    end

    subgraph Auth["Authentication Services"]
        OPAQUE_SVC[OPAQUE Auth Service\nregistration + login\nno plaintext password]
        MFA[MFA Service\nTOTP + WebAuthn/FIDO2]
        SESSION[Session Service\ntoken issuance + rotation]
    end

    subgraph Vault["Vault Services"]
        VSYNC[Vault Sync Service\nincremental diff, versioning]
        VITEMS[Item Store\nciphertext blob storage]
        VKEYS[Key Envelope Store\nencrypted vault/item keys]
        SHARE[Sharing Service\nasymmetric key re-encryption]
    end

    subgraph Ext["Extension & Autofill Services"]
        HINTS[Autofill Hint Service\nURL→credential metadata lookup]
        BREACH[Breach Detection Service\nk-anonymity hash prefix query]
        PWGEN[Password Generator Service\nentropy source + policy]
    end

    subgraph Emergency["Emergency & Recovery"]
        EMERG[Emergency Access Service\ntime-delay gating]
        EXPORT[Export Service\nencrypted vault export]
    end

    subgraph Infra["Infrastructure Layer"]
        VDB[(Vault DB\nsharded PostgreSQL\nciphertext + metadata)]
        KEYDB[(Key Store\nencrypted key envelopes)]
        AUDITDB[(Audit DB\nappend-only, hash-chained)]
        SYNCQ[Sync Queue\nchange event fan-out]
        CACHE[(Session Cache\nRedis-compatible)]
        BREACHDB[(Breach Hash DB\nprefix-indexed SHA-1 hashes)]
    end

    WEB & EXT & MOB & DESK --> CDN
    WEB & EXT & MOB & DESK --> GW

    GW --> OPAQUE_SVC --> MFA --> SESSION
    SESSION --> CACHE

    GW --> VSYNC --> SYNCQ
    VSYNC --> VITEMS --> VDB
    VSYNC --> VKEYS --> KEYDB
    SYNCQ --> MOB & DESK & EXT

    GW --> SHARE --> VKEYS
    GW --> HINTS --> VDB
    GW --> BREACH --> BREACHDB
    GW --> EMERG --> KEYDB
    GW --> EXPORT --> VDB

    VSYNC --> AUDITDB
    OPAQUE_SVC --> AUDITDB

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class WEB,EXT,MOB,DESK client
    class CDN,GW api
    class OPAQUE_SVC,MFA,SESSION,VSYNC,VITEMS,VKEYS,SHARE,HINTS,BREACH,PWGEN,EMERG,EXPORT service
    class VDB,KEYDB,AUDITDB,BREACHDB data
    class CACHE cache
    class SYNCQ queue
```

---

## Key Design Decisions

### Decision 1: Zero-Knowledge Architecture (Client-Side Encryption)

| Attribute | Detail |
|---|---|
| **Options** | (A) Server-side encryption with server-held keys; (B) Client-side encryption, server stores ciphertext only |
| **Decision** | Option B — all encryption/decryption on client |
| **Rationale** | A server-side compromise in option A exposes all user vaults. Option B limits blast radius to metadata even under full server compromise. The server becomes a dumb, blind storage layer. USENIX 2026 research confirms that gaps in zero-knowledge implementations are exploitable; a strict client-side model minimizes server-side attack surface, even if it complicates sharing and emergency access. |
| **Trade-offs** | Sharing and emergency access require asymmetric cryptography workarounds; server-side search is impossible; client bears computational cost of key derivation. |

### Decision 2: OPAQUE for Authentication

| Attribute | Detail |
|---|---|
| **Options** | (A) Transmit password hash (bcrypt/Argon2) over TLS; (B) SRP (Secure Remote Password); (C) OPAQUE aPAKE |
| **Decision** | Option C — OPAQUE |
| **Rationale** | Option A sends a credential derivative that a compromised server can use for offline attacks. SRP (B) is widely deployed but not UC-secure and vulnerable to some precomputation attacks. OPAQUE provides mutual authentication, forward secrecy, and UC-security proof. The master password never leaves the client — even during registration the server receives only an OPRF-blinded output. Used in production by major messaging platforms. |
| **Trade-offs** | More complex to implement than SRP; requires OPAQUE library availability; IETF draft still in progress (though implementations are stable). |

### Decision 3: CRDT-Based Vault Synchronization

| Attribute | Detail |
|---|---|
| **Options** | (A) Last-write-wins (server timestamp); (B) Operational transformation (OT); (C) CRDT per-item versioning with vector clocks |
| **Decision** | Option C — CRDT semantics with vector clocks |
| **Rationale** | LWW (A) is simple but silently drops concurrent updates from different devices. OT (B) is complex to reason about under network partitions. CRDT (C) enables offline-first operation with deterministic merge on reconnect. For a vault, items are independent—merging at item granularity with a set-level CRDT (add-wins for items, LWW within an item using vector timestamps) gives correct behavior without operational transform complexity. |
| **Trade-offs** | Tombstones must be retained for deleted items to prevent re-appearance; vector clocks grow with device count; merge logic must operate on metadata only (no plaintext inspection by server). |

### Decision 4: Asymmetric Re-Encryption for Sharing

| Attribute | Detail |
|---|---|
| **Options** | (A) Share master password or vault key directly; (B) Create shared vault with separate key; (C) Per-item key re-encryption with recipient's public key |
| **Decision** | Options B+C combined — shared vaults with per-item keys wrapped for each recipient |
| **Rationale** | Option A is a zero-knowledge violation. Option B alone doesn't support item-level sharing granularity. Combining B and C: for shared vaults, a vault key is encrypted with each member's public key; for item-level sharing, the item key is wrapped with the recipient's public key. Server orchestrates key distribution but never decrypts. Revoking access means re-encrypting the vault key with a new value and not sharing the new key with the revoked party. |
| **Trade-offs** | Key management complexity grows with sharing depth; forward secrecy on revocation requires re-encrypting all items the revoked user had access to (expensive); key transparency is hard to audit. |

### Decision 5: Time-Delayed Emergency Access with Threshold Cryptography

| Attribute | Detail |
|---|---|
| **Options** | (A) Admin password reset (breaks zero-knowledge); (B) Pre-shared backup key with trusted contact; (C) Shamir's Secret Sharing (k,n) threshold scheme with time delay |
| **Decision** | Option C — Shamir's Secret Sharing with user-configured time delay |
| **Rationale** | Option A destroys zero-knowledge guarantee. Option B requires trusting a single contact entirely. SSS allows the vault owner to split their account key into n shares, requiring k shares to reconstruct. Designating k trusted contacts means any k of them can recover the vault after a configurable waiting period (1–30 days), during which the vault owner can cancel the request. NIST NISTIR 8214C (2025) formally endorses threshold cryptography for this pattern. |
| **Trade-offs** | Requires trusted contacts to hold shares securely; time delay introduces latency in genuine emergencies; share holders must be educated users; share revocation requires re-splitting and redistributing. |

### Decision 6: Separate Key Store and Vault Store

| Attribute | Detail |
|---|---|
| **Options** | (A) Store encrypted keys alongside ciphertext in same database; (B) Separate key envelope store with different access controls |
| **Decision** | Option B — physically separate key store |
| **Rationale** | Separating key envelopes from ciphertext enables independent access control policies, separate audit trails, and different replication strategies. A key-only breach reveals no plaintext without the corresponding ciphertext; a ciphertext-only breach reveals nothing without the keys. Defense-in-depth through separation of concerns at the storage layer. |
| **Trade-offs** | Two-database transactions require eventual consistency handling; additional network hop per vault operation; operational complexity of maintaining two distinct data stores. |

---

## Data Flow: Vault Unlock and Autofill

```mermaid
flowchart LR
    subgraph Client["Client (Browser Extension)"]
        MP[Master Password\nuser input]
        KD[Key Derivation\nArgon2id]
        AK[Account Key\nlocal memory only]
        DEC[Decrypt Vault\nAES-256-GCM]
        AF[Autofill Engine\nDOM analysis + origin check]
    end

    subgraph Server["Server"]
        OPAQ[OPAQUE Auth\nblind credential check]
        EK[Encrypted Key Envelope\nvault key wrapped in account key]
        ECRYPT[Encrypted Vault Items\nciphertext blobs]
    end

    MP --> KD --> AK
    AK --> OPAQ
    OPAQ --> |session token| Client
    AK --> |session token| EK
    EK --> |encrypted vault key| DEC
    ECRYPT --> DEC
    DEC --> |plaintext items in memory| AF
    AF --> |credential suggestion| User

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    class MP,KD,AK,DEC,AF client
    class OPAQ,EK,ECRYPT service
```

---

## Data Flow: Adding a New Vault Item

```mermaid
flowchart TB
    A[User Creates Item\nplaintext in local memory] --> B[Generate Item Key\nrandom 256-bit]
    B --> C[Encrypt Item Content\nAES-256-GCM with item key]
    C --> D[Encrypt Item Key\nwrapped in vault key]
    D --> E[Sign Ciphertext Bundle\nEd25519 with device key]
    E --> F[Upload to Server\nPOST /vault/items\nsession token + ciphertext + wrapped key]
    F --> G[Server Stores\nciphertext + wrapped key + metadata]
    G --> H[Server Emits Change Event\nto sync queue]
    H --> I[Other Devices Receive Event\ndownload + decrypt with local vault key]

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef server fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class A,B,C,D,E client
    class F,G,H server
    class I client
```

---

## Data Flow: Secure Sharing

```mermaid
flowchart LR
    subgraph Sharer["Sharer (Alice)"]
        AITK[Alice: Item Key\n plaintext in memory]
        WRAP[Wrap Item Key\nencrypt with Bob's public key]
    end

    subgraph Server["Server"]
        PKR[Public Key Registry\nBob's X25519 public key]
        STORE[Store Wrapped Key\nassociated with Bob's account]
    end

    subgraph Recipient["Recipient (Bob)"]
        UNWRAP[Unwrap Item Key\ndecrypt with Bob's private key]
        DECITEM[Decrypt Item Content\nAES-256-GCM with item key]
    end

    AITK --> WRAP
    PKR --> |Bob's public key| WRAP
    WRAP --> STORE
    STORE --> UNWRAP
    UNWRAP --> DECITEM

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    class AITK,WRAP,UNWRAP,DECITEM client
    class PKR,STORE service
```
