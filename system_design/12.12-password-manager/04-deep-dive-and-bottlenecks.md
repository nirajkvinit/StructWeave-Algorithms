# 04 — Deep Dives & Bottlenecks: Password Manager

## Deep Dive 1: Zero-Knowledge Encryption Architecture

### The Key Hierarchy in Detail

Zero-knowledge means the server is architecturally incapable of decrypting vault contents—not merely contractually prohibited. This requires a precise key hierarchy where every level of encryption is performed client-side before any data touches the network.

```
Master Password (memorized, never stored anywhere)
        │
        ▼ Argon2id (memory-hard KDF, 64 MB, 3 iterations)
   ┌────┴────────────────────────────────────────┐
   │                  512-bit stretched key       │
   └──────┬──────────────────────────────────────┘
          │
    ┌─────┴─────┐
    │           │
authKey    accountKey  (32 bytes each)
  (for      (master encryption key for all other keys)
  OPAQUE)
          │
          ├── wraps ──► vaultKey₁ (per vault, 256-bit random)
          │                  │
          │                  ├── wraps ──► itemKey_A (per item, 256-bit random)
          │                  ├── wraps ──► itemKey_B
          │                  └── wraps ──► itemKey_N
          │
          ├── wraps ──► vaultKey₂ (shared team vault)
          │
          └── wraps ──► deviceSessionKey (per trusted device, short-lived)
```

**Why per-item keys?** Item-level key granularity enables:
- Sharing individual items without exposing the vault key (wrap item key with recipient's public key)
- Rotating a single compromised item's key without re-encrypting the entire vault
- Future support for item-level access expiry

**The account key never leaves the client in plaintext.** When stored server-side, it is wrapped in the `exportKey` derived by OPAQUE during registration. The `exportKey` is itself never stored—it exists only transiently during the OPAQUE protocol execution.

### Limitations of Zero-Knowledge Claims

Research from ETH Zurich (USENIX Security 2026) identified 12 attacks against major password managers that technically violated zero-knowledge semantics:

1. **Integrity-only violations**: Server can swap ciphertext between items without the client detecting it—if authentication tags are valid for the item but don't bind the item ID in the AAD. **Fix**: Include item ID and vault ID as AEAD additional authenticated data (AAD), so any re-ordering is detectable.

2. **Downgrade attacks**: Servers could force older, weaker cryptographic parameters (e.g., PBKDF2 instead of Argon2id) on authentication. **Fix**: Client-enforced minimum parameters; KDF algorithm and parameters signed into the key envelope.

3. **Organization vault privilege escalation**: Admin accounts in organization vaults with server-mediated key distribution allowed server to assign vault keys to unauthorized members. **Fix**: Cryptographic membership proofs; key distribution signed by existing members.

### Key Rotation

When a user changes their master password:
1. Client derives new `accountKey'` from new master password
2. Client re-wraps all vault keys with `accountKey'` — vault keys themselves don't change
3. Client re-wraps account key for OPAQUE with new auth material
4. Atomic server update: new `encryptedAccountKey`, new `vaultKeyEnvelopes`, new OPAQUE record
5. All other devices are forcefully signed out (their session keys are now stale)

Vault key rotation (e.g., after revoking a shared user) requires:
1. Generate new vault key
2. Re-encrypt all items under new vault key (client-side, sequential or batched)
3. Upload new ciphertext blobs atomically with new vault key envelope
4. Revoke old vault key envelopes

This is expensive for large vaults but necessary for forward secrecy on revocation.

---

## Deep Dive 2: Vault Synchronization

### Offline-First Architecture

Every client maintains a local encrypted SQLite database (or equivalent structured store) containing:
- All vault item ciphertext blobs
- Item metadata (id, version_vector, timestamps, tombstones)
- Pending write queue (mutations not yet confirmed by server)
- Last-confirmed sync version per vault

**Write path (online):**
1. User edits item → client encrypts → writes to local store → increments local device clock in version vector
2. Client immediately sends to server; server confirms with updated server_version
3. Server fan-outs change event to other devices via WebSocket / push notification

**Write path (offline):**
1. User edits item → client encrypts → writes to local store
2. Mutation enqueued in pending write queue
3. On reconnect, client uploads pending queue; server resolves with CRDT merge

**Read path (online):** Client polls for changes since `last_sync_version` on reconnect; WebSocket push during active session.

**Read path (offline):** Client reads entirely from local store — no network required.

### Conflict Resolution Deep Dive

For a vault with devices A, B, C, the version vector for an item might look like:
```
localState:   { A: 5, B: 3, C: 0 }  // A and B have edited this item
serverState:  { A: 5, B: 2, C: 1 }  // C has also edited (server has B:2 not B:3)
```

Neither state dominates the other — concurrent edit by B and C on the same item. Resolution:
- Compare `client_modified_at` timestamps (last client-reported edit time)
- Higher timestamp wins within the item
- Losing version is kept as a "conflict copy" accessible to the user
- Merged version_vector: `{ A: 5, B: 3, C: 1 }` (component-wise max)

**Tombstone retention:** Deleted items (is_deleted=true) must be retained until all known devices have confirmed they received the deletion sync. The server maintains a device acknowledgment map per tombstone and purges only after all registered devices have synced past the deletion event.

### Sync Protocol Details

```
Client → Server:  POST /sync  { device_id, last_sync_version: 1047 }
Server → Client:  {
  changes: [
    { id: "abc", version_vector: {...}, encrypted_data: "...", is_deleted: false },
    { id: "def", is_deleted: true, version_vector: {...} }
  ],
  server_version: 1089,
  next_poll_after: 30s
}
```

The server applies changes to its append-only change log and resolves concurrent writes using database-level optimistic locking (`version_vector` comparison before update). Clients that fail the version check receive a 409 Conflict with the current server state, forcing client-side merge.

---

## Deep Dive 3: Browser Extension Security Model

### Architecture Overview

The browser extension comprises three isolated components:
1. **Service Worker (background script)**: Holds the unlocked vault in memory after authentication; processes autofill requests; communicates with the cloud API
2. **Content Script**: Injected into every web page; scans DOM for form fields; communicates with service worker via message passing (never shares memory)
3. **Extension Popup**: The vault UI; communicates with service worker via message passing

**Critical isolation property**: Content scripts run in an isolated world—they share the page's DOM but not its JavaScript runtime. Web page JavaScript cannot access content script variables, and vice versa. The vault keys and decrypted credentials live only in the service worker, never in the content script or page context.

### Autofill Security Controls

**Origin binding**: Credentials are bound to a registrable domain (eTLD+1). The content script reports the current page origin to the service worker; the service worker returns only matching credentials. This prevents:
- Subdomain hijacking (`evil.bank.com` cannot receive `bank.com` credentials)
- Homoglyph attacks (visual lookalike domains detected via Unicode normalization)

**DOM-based clickjacking defense** (addressing 2025 research):
- Extension overlay buttons rendered in isolated extension iframe, not injected into page DOM
- Pointer-events overlay detection: if a transparent element covers the extension iframe, autofill is blocked
- Intersection Observer API used to detect if the extension icon is fully visible before activating

**Fill-on-submit vs. fill-on-page-load**:
- Fill-on-page-load: convenient but leaks credential existence to page analytics
- Fill-on-submit: safer — credentials only filled after explicit user interaction, triggered by keypress or button click
- Production default: fill-on-demand with user click; fill-on-page-load configurable

### Session Key Storage

After vault unlock, the service worker holds the vault key in memory. Persistent storage options:
- **Memory only (safest)**: Key lost on browser restart; user re-enters master password
- **OS secure storage via native messaging**: Extension calls native app that stores key in OS keychain; survives restart; requires native host installation
- **Extension local storage (encrypted)**: Key encrypted with a device-bound key stored in OS keychain; usable in Manifest V3 service workers

Manifest V3 service workers are terminated after inactivity, requiring periodic "keep-alive" mechanisms or re-derivation from cached encrypted session.

### AI Agent Autofill Risk (2025 concern)

As AI browser agents emerge, they can trigger autofill programmatically without user interaction. Production defenses:
- Autofill only triggered on verified user gesture events (isTrusted=true in event object)
- AI agents require explicit user authorization before credential injection
- Audit log records whether autofill was user-initiated or agent-initiated

---

## Deep Dive 4: Emergency Access with Shamir's Secret Sharing

### Setup Phase (Vault Owner — Alice)

1. Alice designates Bob as emergency contact with threshold k=1, n=1 (or distributes k=2, n=3)
2. Client generates n Shamir shares of Alice's account key
3. Each share encrypted with the designated contact's public X25519 key
4. Encrypted shares uploaded to server; server stores opaque blobs associated with emergency record
5. Alice receives a recovery verification code (optional backup not requiring contacts)

### Request Phase (Emergency Contact — Bob)

1. Bob requests emergency access via the app
2. Server records request time; sends email notification to Alice
3. Alice has `wait_period_days` (1–30) to cancel the request
4. If not cancelled, server releases Bob's encrypted share to Bob after the wait period
5. Bob decrypts his share using his private key; if k=1 of n=1, full account key recovered
6. Bob can decrypt Alice's encrypted account key envelope → decrypt vault keys → decrypt vault

### Multi-Party Threshold (k=2 of n=3)

For higher security:
- Three trusted contacts (Carol, Dave, Eve) each hold one share
- Any 2 of 3 can collaborate to recover Alice's account key
- If one contact is compromised or unavailable, recovery still works with the other two
- Server serves each contact's share independently (each is encrypted for that contact's key)
- Reconstruction happens client-side using Lagrange interpolation

### Security Properties

- **Server blindness**: Server stores only encrypted shares; cannot reconstruct the account key
- **Forward secrecy from Alice's perspective**: Alice can cancel any pending request before the wait period expires
- **Share revocation**: Alice can revoke and regenerate all shares (re-split account key) without changing the vault key — useful if a contact relationship ends
- **Audit trail**: All emergency access events (invite, request, cancel, approve) logged in tamper-evident audit log

---

## Race Conditions and Edge Cases

### Concurrent Vault Key Rotation and Item Write

**Scenario**: Device A starts rotating vault key (re-encrypting all items) while Device B simultaneously writes a new item under the old vault key.

**Risk**: Device B's new item is encrypted with old vault key. After rotation, the old vault key should be discarded. Device B's item appears corrupt.

**Resolution**:
- Vault key rotation is a server-atomic operation: server increments `key_rotation_version`
- All writes must include the `key_rotation_version` they used for encryption
- Server rejects writes with stale `key_rotation_version` after rotation completes
- Device B receives 409 Conflict, re-fetches new vault key envelope, re-encrypts, retries

### Account Key Derived from Compromised Master Password

If master password is phished:
1. Attacker immediately changes master password, locking out legitimate user
2. Legitimate user has no way to prove identity to recover zero-knowledge vault

**Mitigations**:
- Email-based 2FA required for master password change
- 72-hour grace period where previous session tokens remain valid (allows legitimate user to notice and cancel)
- TOTP/WebAuthn MFA on account prevents attacker from completing master password change

### Tombstone Accumulation

With millions of active users performing frequent operations, tombstone accumulation degrades sync performance. After 90 days (configurable), tombstones are pruned if:
- All registered devices have confirmed they synced past the deletion event
- No pending emergency access grants exist that predate the deletion

Purged items are moved to encrypted backup vaults for audit retention purposes.

---

## Bottleneck Analysis

| Bottleneck | Description | Mitigation |
|---|---|---|
| **Argon2id on auth** | 64MB/3-iter Argon2id per login; at 5,000 auth/s this requires 320 GB RAM for parallel computation | Auth is client-side; server only runs OPAQUE, which is lightweight — bottleneck is on user's device, not server |
| **Vault sync fan-out** | 50,000 changes/s; each change fanned out to avg 3 devices = 150,000 push messages/s | Sync queue with connection-aware fan-out; coalesce changes if device is offline; WebSocket multiplexing per account |
| **Breach hash database queries** | 10M breach checks/day with 10 TB bloom filter / hash index | Read-replicated breach DB; CDN-cached prefix ranges (prefix space is only 16^5 = 1M buckets); most prefixes cacheable |
| **Large vault initial download** | Users with 2,000+ items: 2,000 × 2KB = 4 MB of ciphertext on first sync | Paginated download with streaming decompression; zstd compression reduces ciphertext size ~40% |
| **Key rotation for large shared vaults** | 10,000-member org vault key rotation: re-encrypting key for each member = 10,000 ECDH + AES operations | Batched server-side re-wrapping using admin's account key; admin client does operation; parallelized with concurrency limit |
| **Hot account contention** | Org admin account reads vault key 100,000 times/day as members sync | Cache encrypted vault key envelopes at CDN edge (safe — they're ciphertext); only key material changes on rotation |
