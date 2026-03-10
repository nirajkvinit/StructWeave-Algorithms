# 12.12 Password Manager

## System Overview

A password manager is a security-critical application that generates, stores, and auto-fills credentials on behalf of users—protecting hundreds of secrets behind a single master password. At scale, a production password manager serves tens of millions of users, each holding vaults of 50–500+ encrypted items (passwords, TOTP seeds, credit cards, secure notes), synchronized across browsers, mobile devices, and desktop clients in near real time. The central design challenge is **zero-knowledge encryption**: the server stores only ciphertext and never possesses the keys needed to decrypt it—meaning even a full server compromise yields no plaintext credentials. This requires a layered key hierarchy derived entirely on the client, authentication protocols that never transmit the master password, conflict-free vault synchronization across offline-capable devices, secure sharing and emergency access without exposing root secrets, and browser extensions capable of autofill while resisting DOM-based injection attacks. Getting any one of these wrong does not merely degrade user experience—it catastrophically erodes user trust and potentially exposes billions of credentials.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Architecture Style** | Client-heavy, zero-knowledge; server acts as encrypted blob storage and sync coordinator |
| **Core Abstraction** | Hierarchical key envelope: master password → account key → vault key → item key |
| **Encryption Standard** | AES-256-GCM for symmetric encryption; X25519 for asymmetric operations; Argon2id for key derivation |
| **Authentication Protocol** | OPAQUE (aPAKE) — authenticates without transmitting the master password to the server |
| **Sync Model** | CRDT-based or vector-clock optimistic sync with per-item versioning; offline-first |
| **Sharing Model** | Asymmetric re-encryption: shared vault keys encrypted with recipient's public key |
| **Extension Model** | Browser extension with content script isolation; autofill via heuristic DOM analysis |
| **Emergency Access** | Time-delayed key escrow or Shamir's Secret Sharing threshold scheme |
| **Passkey Integration** | FIDO2/WebAuthn hybrid: password manager stores and replays passkey credentials |
| **Threat Model** | Server-side adversary, network adversary, malicious extension, compromised device |

---

## Quick Navigation

| Document | Focus Area |
|---|---|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | System architecture, key design decisions, data flow diagrams |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, core algorithms in pseudocode |
| [04 - Deep Dives & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Zero-knowledge crypto, vault sync, browser extension, emergency access |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Horizontal scaling, replication, conflict resolution, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Threat model, key management, breach response, SOC2/GDPR |
| [07 - Observability](./07-observability.md) | Metrics, secret-safe logging, tracing, alerting, security dashboards |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, scoring rubric |
| [09 - Insights](./09-insights.md) | 8 key architectural insights |

---

## What Differentiates This System

| Dimension | Naive Password Store | Production Password Manager |
|---|---|---|
| **Encryption** | Server-side encryption with server-held keys | Client-side AES-256-GCM; server stores only ciphertext |
| **Authentication** | Password hash comparison (bcrypt/scrypt) | OPAQUE aPAKE — master password never transmitted |
| **Key Derivation** | Single hashed password as key | Layered hierarchy: Argon2id → account key → vault key → per-item key |
| **Sync** | Last-write-wins with version number | CRDT-based per-item sync with vector clocks; offline-first |
| **Sharing** | Share plaintext or re-encrypt on server | Asymmetric re-encryption: share encrypted vault key, server never decrypts |
| **Emergency Access** | Admin password reset (breaks zero-knowledge) | Time-delayed access with threshold cryptography; user controls expiry |
| **Browser Autofill** | Direct DOM injection, no origin checks | Heuristic DOM analysis with origin binding, clickjacking defenses |
| **Breach Detection** | Manual or none | k-Anonymity API against breach databases (no full hash sent) |
| **Audit** | Server-side logs of plaintext operations | Tamper-evident audit log of encrypted operation metadata only |
| **Passkeys** | Separate authenticator app | Integrated passkey storage with Credential Exchange Protocol support |

---

## What Makes This System Unique

### 1. The Server as a Blind Storage Layer
Unlike most distributed systems where the server contains business logic over meaningful data, a zero-knowledge password manager deliberately blinds the server. The server orchestrates storage, sync, and sharing—but processes only opaque ciphertext envelopes. This inversion of the usual server-as-authority pattern means correctness guarantees that would normally be enforced server-side (e.g., "this user owns this vault entry") must instead be verified cryptographically by the client. Every architectural decision ripples from this constraint: key management, authentication, sharing, and even observability must work without the server ever touching plaintext.

### 2. Hierarchical Key Envelopes Enable Granular Access Control
The key hierarchy—master password → stretched account key → vault key → per-item key—is not merely organizational. Each level of wrapping enables a specific capability: rotating a vault key without re-encrypting every item, sharing a subset of items by re-encrypting only those item keys, revoking a device by invalidating only its copy of the account key, and recovering an account without transmitting the master password. This envelope model is the core architectural primitive that makes fine-grained, zero-knowledge access control tractable at scale.

### 3. Offline-First Sync Without Conflicts
Password managers must function on aircraft, subways, and in remote areas. Clients maintain a full local copy of the encrypted vault and apply mutations optimistically. When connectivity returns, a conflict-free merge strategy—using either CRDT semantics for additive operations (adding/updating items) or last-write-wins with vector-clock tiebreaking for deletes—reconciles diverged replicas. The challenge is that merge logic must operate entirely on ciphertext metadata (timestamps, item IDs, version vectors), never on decrypted content, because the sync server cannot decrypt.

### 4. Browser Extension as High-Value Attack Surface
The browser extension sits at the intersection of the most hostile environment (arbitrary web pages) and the highest-value assets (all user credentials). DOM-based clickjacking attacks demonstrated in 2025 can invisibly manipulate autofill interactions. Origin-bound credential scoping (ensuring passwords for `bank.com` never autofill on `bank.com.evil.com`), content script isolation via extension messaging APIs, and anti-phishing heuristics (visual similarity detection, certificate transparency checks) are all required defenses. The extension must also securely store a session token after the vault is unlocked, protecting it from JavaScript-accessible storage without sacrificing usability.
