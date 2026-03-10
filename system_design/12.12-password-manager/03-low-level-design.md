# 03 — Low-Level Design: Password Manager

## Data Models

### Vault Item (stored server-side as ciphertext)

```
VaultItem {
  id:                UUID            // globally unique, generated client-side
  vault_id:          UUID            // parent vault identifier
  owner_account_id:  UUID
  schema_version:    integer         // for forward compatibility
  item_type:         enum            // login, secure_note, card, identity, ssh_key, passkey
  created_at:        timestamp       // server-received time (metadata, not encrypted)
  modified_at:       timestamp       // last server-received modification time
  client_modified_at: timestamp      // client-reported modification time (in ciphertext)
  version_vector:    map<device_id, integer>  // CRDT vector clock
  encrypted_data:    bytes           // AES-256-GCM ciphertext of ItemPayload
  encrypted_item_key: bytes          // item key wrapped in vault key
  data_nonce:        bytes           // 12-byte GCM nonce for encrypted_data
  auth_tag:          bytes           // 16-byte GCM authentication tag
  integrity_sig:     bytes           // Ed25519 signature over (id, vault_id, encrypted_data, encrypted_item_key)
  device_sig_key_id: UUID            // which device key signed this
  is_deleted:        boolean         // tombstone flag (true = soft-deleted)
  folder_id:         UUID?           // optional folder/collection grouping
  favorite:          boolean         // user-starred flag (unencrypted, acceptable metadata leak)
}
```

**ItemPayload (encrypted content):**
```
ItemPayload {
  title:           string
  username:        string?
  password:        string?
  totp_secret:     string?           // Base32-encoded TOTP seed
  urls:            list<URLRecord>
  custom_fields:   list<CustomField>
  notes:           string?
  card_number:     string?
  expiry:          string?
  cvv:             string?
  ssh_private_key: string?
  passkey_credential: PasskeyRecord?
  tags:            list<string>
  client_modified_at: timestamp
}

URLRecord { url: string, match_type: enum }  // match_type: exact, domain, starts_with, regex
CustomField { name: string, value: string, field_type: enum }
```

---

### Account Key Envelope (stored server-side, never decryptable by server)

```
AccountKeyEnvelope {
  account_id:          UUID
  email_hash:          string        // SHA-256 of email for lookup; real email stored separately
  opaque_record:       bytes         // OPAQUE server-side registration record
  encrypted_account_key: bytes       // account key encrypted with KDF-derived key; server cannot decrypt
  account_key_nonce:   bytes
  vault_key_envelopes: list<VaultKeyEnvelope>
  device_key_envelopes: list<DeviceKeyEnvelope>
  public_key:          bytes         // X25519 public key (for receiving shared items)
  signing_public_key:  bytes         // Ed25519 public key (for verifying item signatures)
  created_at:          timestamp
  last_auth_at:        timestamp
  mfa_config:          MFAConfig
}

VaultKeyEnvelope {
  vault_id:              UUID
  encrypted_vault_key:   bytes       // vault key wrapped in account key
  vault_key_nonce:       bytes
  key_rotation_version:  integer
}

DeviceKeyEnvelope {
  device_id:             UUID
  device_name:           string
  platform:              enum        // browser_extension, mobile_ios, mobile_android, desktop
  encrypted_session_key: bytes       // short-lived session key wrapped in account key
  created_at:            timestamp
  last_seen_at:          timestamp
  trusted:               boolean
}
```

---

### Shared Item Record

```
SharedItemRecord {
  id:                UUID
  item_id:           UUID            // the VaultItem being shared
  source_account_id: UUID            // Alice's account
  target_account_id: UUID            // Bob's account
  encrypted_item_key: bytes          // item key wrapped in Bob's public key (X25519 + AES-256-GCM)
  key_nonce:          bytes
  permissions:        enum           // read_only, can_edit
  granted_at:         timestamp
  expires_at:         timestamp?
  revoked_at:         timestamp?
}
```

---

### Emergency Access Record

```
EmergencyAccessRecord {
  id:                   UUID
  grantor_account_id:   UUID         // vault owner (Alice)
  grantee_account_id:   UUID         // trusted contact (Bob)
  key_share:            bytes        // one Shamir share, encrypted with Bob's public key
  share_index:          integer      // which share (1 of n)
  threshold:            integer      // minimum shares needed (k)
  wait_period_days:     integer      // 1-30 days
  status:               enum         // pending_invite, active, request_sent, approved, cancelled
  request_sent_at:      timestamp?
  auto_approve_at:      timestamp?   // wait_period_days after request_sent_at
  approved_at:          timestamp?
}
```

---

### Audit Log Entry (append-only)

```
AuditLogEntry {
  id:               UUID
  account_id:       UUID
  event_type:       enum   // vault_unlock, item_create, item_update, item_delete, share_grant,
                           // emergency_access_request, login_success, login_failure,
                           // mfa_challenge, export_performed, breach_check
  device_id:        UUID?
  ip_hash:          string  // SHA-256 of IP; not plaintext to limit PII
  user_agent_hash:  string
  item_id:          UUID?   // if event relates to a specific item
  metadata:         bytes   // minimal encrypted context (no plaintext credentials)
  timestamp:        timestamp
  prev_entry_hash:  bytes   // SHA-256 of previous entry (hash chain for tamper detection)
  entry_hash:       bytes   // SHA-256 of this entry's content
}
```

---

## API Design

### Authentication

```
POST /v1/auth/register/start
  Body: { email_hash: string, opaque_request: bytes }
  Response: { opaque_response: bytes, session_id: UUID }

POST /v1/auth/register/finish
  Body: { session_id: UUID, opaque_finish: bytes,
          encrypted_account_key: bytes, public_key: bytes, signing_public_key: bytes }
  Response: { account_id: UUID }

POST /v1/auth/login/start
  Body: { email_hash: string, opaque_request: bytes }
  Response: { opaque_response: bytes, session_id: UUID }

POST /v1/auth/login/finish
  Body: { session_id: UUID, opaque_finish: bytes, device_id: UUID, mfa_token: string? }
  Response: { access_token: JWT, refresh_token: string,
              encrypted_account_key: bytes, vault_key_envelopes: list<VaultKeyEnvelope> }

POST /v1/auth/refresh
  Body: { refresh_token: string }
  Response: { access_token: JWT, refresh_token: string }

POST /v1/auth/logout
  Headers: Authorization: Bearer <access_token>
  Body: { device_id: UUID }
  Response: 204 No Content
```

### Vault Operations

```
GET /v1/vaults/{vault_id}/items
  Headers: Authorization: Bearer <access_token>
  Query: { since_version: integer?, page_cursor: string? }
  Response: {
    items: list<VaultItemEnvelope>,  // ciphertext + metadata only
    next_cursor: string?,
    vault_version: integer
  }

POST /v1/vaults/{vault_id}/items
  Headers: Authorization: Bearer <access_token>
  Body: VaultItem  (fully encrypted)
  Response: { id: UUID, modified_at: timestamp, server_version: integer }

PUT /v1/vaults/{vault_id}/items/{item_id}
  Headers: Authorization: Bearer <access_token>
  Body: VaultItem  (fully encrypted, includes version_vector for conflict detection)
  Response: { modified_at: timestamp, server_version: integer }
  Error 409: ConflictResponse { server_item: VaultItem }  // client must merge

DELETE /v1/vaults/{vault_id}/items/{item_id}
  Headers: Authorization: Bearer <access_token>
  Body: { version_vector: map<device_id, integer> }
  Response: 200  (tombstone set; item retained until sync propagation confirmed)

POST /v1/vaults/{vault_id}/sync
  Headers: Authorization: Bearer <access_token>
  Body: { device_id: UUID, last_sync_version: integer }
  Response: { changes: list<VaultItem>, server_version: integer }
```

### Sharing

```
GET /v1/accounts/{account_id}/public-key
  Response: { account_id, public_key: bytes, signing_public_key: bytes }

POST /v1/shares
  Body: SharedItemRecord
  Response: { share_id: UUID }

DELETE /v1/shares/{share_id}
  Response: 204 No Content  (server removes; client should re-encrypt item with new key)

GET /v1/shares/received
  Response: list<SharedItemRecord>  (filtered to calling account's shares)
```

### Emergency Access

```
POST /v1/emergency-access/invite
  Body: { grantee_email_hash, key_shares: list<EncryptedShare>, threshold, wait_period_days }
  Response: { access_id: UUID }

POST /v1/emergency-access/{access_id}/request
  Response: { auto_approve_at: timestamp }

POST /v1/emergency-access/{access_id}/cancel
  Response: 204 No Content

GET /v1/emergency-access/{access_id}/shares
  Headers: Authorization: Bearer <grantee_token>
  Response: list<EncryptedShare>  (only after wait_period elapsed or owner approved)
```

### Breach Detection

```
GET /v1/breach/check/{hash_prefix}
  Query: { hash_prefix: string }  // first 5 hex characters of SHA-1 hash (k-anonymity)
  Response: { hashes: list<string> }  // all suffixes matching prefix
  // Client checks locally if full hash is in the list
```

---

## Core Algorithms (Pseudocode)

### Key Derivation Hierarchy

```
function deriveAccountKey(masterPassword, email, params):
  // Argon2id stretches master password; email is salt input
  salt = SHA256(email.toLowerCase())
  stretchedKey = Argon2id(
    password  = masterPassword,
    salt      = salt,
    memory    = 65536 KB,   // 64 MB
    iterations = 3,
    parallelism = 4,
    outputLen = 64           // 512 bits
  )
  // Split into two 256-bit halves
  authKey      = stretchedKey[0:32]   // used in OPAQUE
  accountKey   = stretchedKey[32:64]  // used for key encryption

  return (authKey, accountKey)

function deriveVaultKey(accountKey, vaultId):
  // HKDF expands accountKey into vault-specific key
  vaultKey = HKDF-Expand(
    prk  = accountKey,
    info = "vault-key-v1:" + vaultId,
    len  = 32
  )
  return vaultKey

function deriveItemKey():
  // Item keys are random, not derived — enables independent rotation
  return SecureRandom(32)  // 256-bit random key
```

### Encrypt / Decrypt Item

```
function encryptItem(itemPayload, itemKey):
  nonce     = SecureRandom(12)         // 96-bit GCM nonce
  plaintext = Serialize(itemPayload)   // canonical JSON or protobuf
  (ciphertext, tag) = AES-256-GCM-Encrypt(
    key       = itemKey,
    nonce     = nonce,
    plaintext = plaintext,
    aad       = ""                     // additional authenticated data if needed
  )
  return { ciphertext, nonce, tag }

function decryptItem(envelope, itemKey):
  (plaintext, valid) = AES-256-GCM-Decrypt(
    key        = itemKey,
    nonce      = envelope.nonce,
    ciphertext = envelope.ciphertext,
    tag        = envelope.tag
  )
  if not valid:
    raise IntegrityError("Decryption failed — vault data may be tampered")
  return Deserialize(plaintext)

function wrapKey(keyToWrap, wrappingKey):
  nonce = SecureRandom(12)
  (wrapped, tag) = AES-256-GCM-Encrypt(
    key       = wrappingKey,
    nonce     = nonce,
    plaintext = keyToWrap
  )
  return { wrapped, nonce, tag }

function unwrapKey(wrappedEnvelope, wrappingKey):
  (rawKey, valid) = AES-256-GCM-Decrypt(
    key        = wrappingKey,
    nonce      = wrappedEnvelope.nonce,
    ciphertext = wrappedEnvelope.wrapped,
    tag        = wrappedEnvelope.tag
  )
  if not valid: raise IntegrityError()
  return rawKey
```

### OPAQUE Registration (Client Side)

```
function opaqueRegisterStart(masterPassword, email):
  (authKey, accountKey) = deriveAccountKey(masterPassword, email, defaultParams)

  // OPAQUE blind: client generates OPRF input from authKey
  (blindInput, blindingFactor) = OPRF.blind(authKey)

  state = { blindingFactor, accountKey }
  return { opaqueRequest: blindInput, clientState: state }

function opaqueRegisterFinish(opaqueResponse, clientState, email):
  // Evaluate blinded OPRF output
  oprfOutput = OPRF.unblind(opaqueResponse.evaluatedBlind, clientState.blindingFactor)

  // Derive OPAQUE registration key material
  exportKey = OPAQUE.finalizeRegistration(oprfOutput, email)

  // Encrypt account key with exportKey (server never sees accountKey or masterPassword)
  encryptedAccountKey = wrapKey(clientState.accountKey, exportKey)

  return {
    opaqueRecord:       opaqueResponse.serverRecord,
    encryptedAccountKey: encryptedAccountKey,
    publicKey:           X25519.publicKey(clientState.accountKey),
    signingPublicKey:    Ed25519.publicKey(clientState.accountKey)
  }
```

### CRDT Vault Sync — Merge Logic

```
function mergeVaultChanges(localItems, serverChanges):
  merged = copy(localItems)

  for serverItem in serverChanges:
    localItem = merged.get(serverItem.id)

    if localItem is null:
      // New item from another device
      merged[serverItem.id] = serverItem

    elif serverItem.is_deleted and not localItem.is_deleted:
      // Delete wins over edit in add-wins CRDT with delete tombstones
      // Only if server delete vector dominates local edit vector
      if vectorDominates(serverItem.version_vector, localItem.version_vector):
        merged[serverItem.id] = serverItem  // apply tombstone
      // else: local edit happened after delete — keep local (conflict logged)

    elif not serverItem.is_deleted and localItem.is_deleted:
      // Local deleted, server has newer edit — server edit wins if it dominates
      if vectorDominates(serverItem.version_vector, localItem.version_vector):
        merged[serverItem.id] = serverItem  // resurrect item
      // else: keep local tombstone

    else:
      // Both exist, both modified — merge by highest timestamp within each device clock
      mergedVector = mergeClock(localItem.version_vector, serverItem.version_vector)
      if localItem.client_modified_at >= serverItem.client_modified_at:
        merged[serverItem.id] = localItem
        merged[serverItem.id].version_vector = mergedVector
      else:
        merged[serverItem.id] = serverItem
        merged[serverItem.id].version_vector = mergedVector

  return merged

function vectorDominates(v1, v2):
  // v1 dominates v2 if v1[d] >= v2[d] for all d, and v1[d] > v2[d] for at least one d
  for device in union(v1.keys, v2.keys):
    if v1.get(device, 0) < v2.get(device, 0):
      return false
  return v1 != v2
```

### Shamir's Secret Sharing — Emergency Access

```
function splitAccountKey(accountKey, n, k):
  // Split 256-bit key into n shares, requiring k to reconstruct
  // Using GF(2^8) polynomial secret sharing
  prime = large_prime  // Shamir's uses prime field
  secret = BigInt(accountKey)

  // Generate random polynomial of degree k-1
  coefficients = [secret] + [SecureRandom(256 bits) for _ in range(k-1)]

  shares = []
  for i in 1..n:
    x = i
    y = evaluatePolynomial(coefficients, x, prime)
    shares.append({ index: i, value: y })

  return shares

function reconstructAccountKey(shares, k, prime):
  // Lagrange interpolation at x=0 to recover secret (constant term)
  assert len(shares) >= k
  selectedShares = shares[0:k]
  secret = lagrangeInterpolationAtZero(selectedShares, prime)
  return Bytes(secret)

function encryptShareForContact(share, contactPublicKey):
  // Ephemeral X25519 key exchange
  ephemeralPrivate = X25519.generateKeyPair()
  sharedSecret = X25519.DH(ephemeralPrivate.private, contactPublicKey)
  encryptionKey = HKDF(sharedSecret, "emergency-share-v1")
  return {
    ephemeralPublic: ephemeralPrivate.public,
    encryptedShare:  AES-256-GCM-Encrypt(encryptionKey, Serialize(share))
  }
```

### k-Anonymity Breach Check

```
function checkPasswordBreach(plainPassword):
  // HIBP-style k-anonymity: only send first 5 hex chars of SHA-1 hash
  sha1Hash = SHA1(plainPassword).hex().toUpperCase()
  prefix   = sha1Hash[0:5]
  suffix   = sha1Hash[5:]

  // Query server with prefix only — server learns nothing about actual password
  allSuffixes = BreachAPI.getHashes(prefix)  // returns all matching suffixes

  for entry in allSuffixes:
    if entry.hash_suffix == suffix:
      return { breached: true, count: entry.prevalence_count }

  return { breached: false }
```

### Autofill Origin Matching

```
function findMatchingCredentials(currentUrl, vault):
  candidates = []
  currentDomain = extractRegistrableDomain(currentUrl)   // e.g., "bank.com"
  currentOrigin = extractOrigin(currentUrl)               // e.g., "https://bank.com"

  for item in vault.loginItems():
    for urlRecord in item.urls:
      match = false
      switch urlRecord.match_type:
        case exact:
          match = (currentUrl == urlRecord.url)
        case domain:
          itemDomain = extractRegistrableDomain(urlRecord.url)
          match = (currentDomain == itemDomain)
        case starts_with:
          match = currentUrl.startsWith(urlRecord.url)
        case regex:
          match = Regex(urlRecord.url).test(currentUrl)

      // Always enforce same registrable domain — prevent subdomain hijack
      itemDomain = extractRegistrableDomain(urlRecord.url)
      if itemDomain != currentDomain:
        match = false  // cross-domain never matches regardless of rule

      if match:
        candidates.append(item)
        break

  // Sort by last-used recency, then alphabetically
  return sortByRecencyThenAlpha(candidates)
```
