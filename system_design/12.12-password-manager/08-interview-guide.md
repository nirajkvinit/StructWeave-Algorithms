# 08 — Interview Guide: Password Manager

## Overview

The password manager question is a favorite in senior and staff-level SDE interviews because it sits at the intersection of cryptography, distributed systems, and client architecture. Unlike typical system design questions, it requires candidates to reason about a system where the server must be treated as adversarial—fundamentally inverting the usual server-as-authority model. A strong candidate demonstrates they understand why architecture choices are made, not just what they are.

**Difficulty level**: Senior SDE / Staff SDE
**Time allocation**: 45 minutes

---

## 45-Minute Pacing Guide

### Minutes 0–5: Clarify Scope

Ask before drawing:
- "Should this support teams/organizations, or just personal use?"
- "Are we designing the full client stack (browser extension, mobile) or just the backend services?"
- "How important is the offline-first experience?"
- "Do we need passkey support, or just traditional passwords?"
- "What threat model? Should I assume the server could be fully compromised?"

The last question is the trap — most interviewers will say "yes, assume server compromise is possible." This immediately defines the architecture as zero-knowledge.

**Good sign**: Candidate proactively brings up zero-knowledge before being prompted.
**Red flag**: Candidate assumes server-side encryption (like a typical app) without questioning it.

### Minutes 5–15: Requirements and High-Level Architecture

Lay out:
1. Core requirement: user creates vaults, stores items, syncs across devices, autofills in browser
2. Non-functional: end-to-end encryption, offline-first, < 2s sync, 50M users
3. Draw the key blocks: clients → API gateway → auth service, vault sync service → vault DB, key store

**Key moment**: When drawing the data flow, articulate that the vault items stored in the DB are ciphertext—the server cannot decrypt them. Explain the key hierarchy at a high level:
- Master password → (Argon2id) → account key → (wraps) vault key → (wraps) item keys
- Server stores only encrypted envelopes; client does all encryption/decryption

### Minutes 15–30: Deep Dives

The interviewer will probe 2–3 areas. Common deep dives:

**Deep Dive A: How does login work without transmitting the password?**
- Explain OPAQUE (or SRP as a simpler alternative if OPAQUE is too complex for the time)
- Key point: client derives auth credential locally from password; server has an OPRF-based record; protocol proves knowledge without transmission
- If OPAQUE is too deep, simplify to: "Client derives auth key using Argon2id; sends only the derived key, not the password; server compares against stored Argon2id hash"

**Deep Dive B: How do you sync across devices without conflict?**
- Per-device version vectors; CRDT semantics for item-level merge
- Server is conflict arbiter by returning current state on 409; client merges and resubmits
- Tombstones for deleted items; tombstone retention until all devices confirm sync

**Deep Dive C: How do you share a password without the server decrypting it?**
- Alice fetches Bob's public key from server (safe — public key is public)
- Alice wraps the item's encryption key with Bob's public key
- Alice uploads wrapped key to server associated with Bob's account
- Bob downloads wrapped key; decrypts with his private key; decrypts item
- Server never possesses the item key in plaintext

### Minutes 30–40: Extension Autofill and Advanced Features

Cover:
- Content script isolation (why the web page can't steal vault contents)
- Origin binding (why bank.com credentials don't autofill on evilbank.com)
- Breach checking with k-anonymity (only send first 5 chars of SHA-1 hash)
- Emergency access via time-delayed Shamir shares

### Minutes 40–45: Scalability and Trade-offs

Discuss:
- Sharding vault DB by account_id; read replicas for sync
- Why active-passive multi-region (vs active-active) makes sense here
- The fundamental trade-off between zero-knowledge guarantees and server-side functionality (can't search, can't server-side filter, can't serve personalized recommendations)

---

## Opening Phase Questions

| Question | Strong Answer Signals |
|---|---|
| "What is zero-knowledge encryption in the context of a password manager?" | Server stores only ciphertext; keys derived client-side from master password; server compromise yields no plaintext |
| "Why not just use bcrypt on the server like any other app?" | If server is breached, bcrypt hashes of vault keys can be brute-forced; zero-knowledge means there are no server-side keys to steal |
| "What's the very first thing a user does when unlocking their vault?" | Client runs Argon2id with master password → derives account key → fetches encrypted vault key → decrypts vault key → decrypts items |
| "What does the server actually store?" | Ciphertext blobs, encrypted key envelopes, account metadata, OPAQUE records, public keys—nothing decryptable without the master password |

---

## Deep Dive Phase Questions

| Question | Strong Answer | Trap |
|---|---|---|
| "How does the client authenticate without sending the password?" | OPAQUE or SRP; client runs Argon2id, sends derived auth key or OPRF output; server verifies without learning master password | Saying "we send the hashed password over TLS" — this is just bcrypt over TLS, vulnerable to server-side attacks |
| "User A wants to share a specific password with User B. Walk me through it." | A fetches B's public key; A wraps item key with B's public key; uploads to server; B downloads and decrypts with private key | "The server decrypts and re-encrypts" — this breaks zero-knowledge |
| "What happens when the user changes their master password?" | Derive new account key; re-wrap all vault keys with new account key; update OPAQUE record; invalidate all other device sessions | "Server invalidates old hash, stores new one" — misses the client-side key re-derivation |
| "Two devices edit the same password at the same time. What happens?" | Server returns 409 with current version; client merges using last-write-wins on client timestamp; version vector updated | "Last writer wins on server side" — correct but misses offline scenario; "We need a transaction" — misses that server can't read ciphertext to merge semantically |
| "How does autofill know which password to fill on this page?" | Credentials bound to registrable domain (eTLD+1); content script reports page URL to service worker; service worker returns matching credentials based on match type rules | "It matches on the full URL" — too strict; "It matches on any subdomain" — too permissive, enables subdomain hijack |
| "How would you implement emergency access for a deceased user's family?" | Shamir's Secret Sharing with trusted contacts; split account key into k-of-n shares; time-delayed access allows owner to cancel; contacts collate shares after wait period | "Family contacts the company for a password reset" — breaks zero-knowledge |

---

## Extension Phase Questions (for Staff-Level)

| Question | What It Tests |
|---|---|
| "Explain why a DOM-based clickjacking attack on a browser extension is dangerous and how you'd mitigate it." | Extension security model; content script isolation limits; iframe-based UI rendering; pointer-event overlay detection |
| "How would you handle passkey storage in the password manager?" | FIDO2 credential storage (private key encrypted as vault item); WebAuthn assertion replay; origin binding at rpId; Credential Exchange Protocol for portability |
| "What metadata does the server inevitably learn even in a zero-knowledge system, and why does it matter?" | Item counts, access patterns, device counts, timing, sharing relationships; pattern analysis reveals behavior; metadata-only subpoena still yields useful information |
| "How do you handle the case where a user forgets their master password?" | This is intentionally hard: without the master password, the account key cannot be derived; options are emergency access (Shamir shares with trusted contacts), or pre-generated recovery kit (one-time code printed at account creation); no server-side recovery path |
| "Your breach detection service is down. What's the degraded behavior and what are the security implications?" | Autofill proceeds without breach warning; not a security regression (we're not exposing new data); communicate degraded state to users; breach check is advisory, not blocking |
| "If you discovered a major password manager company claimed zero-knowledge but the server could decrypt vaults, how would you detect this?" | Independent cryptographic audit; verify that server-side code never has access to decryption keys; inspect key derivation flow; external security researchers with code access (Bitwarden's open-source model) |

---

## Common Mistakes

### Mistake 1: Storing Keys Server-Side

**What candidates say**: "The server encrypts the vault with the user's key, stored in our key management system."

**Why it's wrong**: A compromised KMS or insider threat exposes all vaults. Zero-knowledge requires keys exist only on client devices.

**Recovery prompt**: "What if your KMS is breached? What does the attacker have access to?" — A good candidate self-corrects.

### Mistake 2: Transmitting Master Password

**What candidates say**: "We hash the password with bcrypt and send it over TLS."

**Why it's wrong**: The bcrypt hash is functionally the password—if stolen from the server, it can be brute-forced offline. SRP or OPAQUE prevents this.

**Interviewer follow-up**: "What can an attacker do with that bcrypt hash if they steal your user database?"

### Mistake 3: Server-Side Sharing

**What candidates say**: "The server decrypts the item and re-encrypts it with the recipient's key."

**Why it's wrong**: Server has plaintext transiently, violating zero-knowledge. If server is compromised during sharing, plaintext is exposed.

**Fix**: Asymmetric re-encryption client-side — Alice wraps the item key with Bob's public key without server ever seeing the item key.

### Mistake 4: Ignoring Offline

**What candidates say**: "We require internet connectivity for all vault operations."

**Why it's wrong**: Password managers are used for authentication; losing network at login time locks users out of everything. Offline-first is a must.

**Follow-up**: "What happens when you're on an airplane and need to log into a site stored in your vault?"

### Mistake 5: LWW Sync Without Offline Consideration

**What candidates say**: "We use last-write-wins with server timestamp."

**Why it's wrong**: Clock skew and offline scenarios mean the "last" write is undefined. Offline devices' writes are silently dropped.

**Better answer**: Vector clocks per device; CRDT-style merge; offline writes enqueued and merged on reconnect.

### Mistake 6: Forgetting Breach Check Privacy

**What candidates say**: "We send the password hash to the breach database to check."

**Why it's wrong**: Sending the full hash to a third party reveals what passwords the user has. k-Anonymity (send only first 5 hex chars) avoids this.

---

## Scoring Rubric

### Zero-Knowledge Architecture (30 points)

| Level | Score | Descriptor |
|---|---|---|
| Outstanding | 27–30 | Independently identifies need for client-side encryption; describes full key hierarchy (master→account→vault→item keys); explains Argon2id choice; identifies AAD binding for integrity |
| Strong | 21–26 | Identifies client-side encryption; explains key hierarchy at two levels; mentions Argon2id or equivalent; correct on sharing model |
| Adequate | 15–20 | Identifies zero-knowledge concept; some key hierarchy; needs prompting for details |
| Weak | 0–14 | Designs server-side encryption; misses zero-knowledge concept entirely |

### Authentication Protocol (15 points)

| Level | Score | Descriptor |
|---|---|---|
| Outstanding | 13–15 | Describes OPAQUE or SRP; articulates why password never transmitted; understands forward secrecy implications |
| Strong | 9–12 | Describes OPAQUE or SRP with correct high-level mechanics; knows it prevents offline attacks |
| Adequate | 5–8 | Proposes Argon2id with only hash sent; understands the problem but not the full solution |
| Weak | 0–4 | Proposes sending password or bcrypt hash |

### Vault Sync and Conflict Resolution (20 points)

| Level | Score | Descriptor |
|---|---|---|
| Outstanding | 18–20 | CRDT or vector clock approach; correct offline behavior; tombstone handling; merge on conflict; batch sync optimization |
| Strong | 14–17 | Vector clocks or per-item versioning; correct 409 conflict handling; aware of offline scenario |
| Adequate | 8–13 | Versioning-based sync; misses offline or tombstone handling |
| Weak | 0–7 | LWW only; no offline consideration |

### Security & Threat Model (20 points)

| Level | Score | Descriptor |
|---|---|---|
| Outstanding | 18–20 | Articulates server-as-adversary model; identifies metadata leakage; describes extension threat model; k-anonymity breach check; emergency access via Shamir |
| Strong | 14–17 | Covers most security dimensions; one or two gaps |
| Adequate | 8–13 | Basic security measures; misses extension attack surface or metadata leakage |
| Weak | 0–7 | Generic security measures; does not engage with zero-knowledge constraints |

### Scalability (15 points)

| Level | Score | Descriptor |
|---|---|---|
| Outstanding | 13–15 | Shard by account_id; read replicas for sync; active-passive multi-region with reasoning; handles vault key rotation at scale |
| Strong | 9–12 | Correct sharding; multi-region awareness; acknowledges active-active complexity |
| Adequate | 5–8 | General scaling principles; no specifics for this domain |
| Weak | 0–4 | No scaling strategy |

---

## Interviewer Testing Signals

**Signal 1: Actively constrains server capability**
When designing the system, does the candidate voluntarily say "the server never sees X"? This shows they've internalized zero-knowledge rather than bolting it on.

**Signal 2: Identifies the key hierarchy without prompting**
Candidates who reach for a multi-level key hierarchy (master→account→vault→item) have deep knowledge of key management. Those who propose a single encryption key for everything will struggle with sharing and rotation scenarios.

**Signal 3: Handles the "forgot master password" edge case honestly**
The correct answer is: "You can't recover it from our side — that's the design." A candidate who invents a server-side password recovery mechanism is breaking zero-knowledge. Honest acknowledgment of this trade-off is a strong signal.

**Signal 4: Thinks adversarially about the extension**
The browser extension is the most hostile deployment environment in software engineering. Candidates who spontaneously discuss origin binding, content script isolation, and autofill timing demonstrate senior-level security engineering judgment.
