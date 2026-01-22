# Secret Management System - Low-Level Design

## Data Model

### Entity Relationship Diagram

```mermaid
erDiagram
    NAMESPACE ||--o{ SECRET : contains
    NAMESPACE ||--o{ POLICY : contains
    NAMESPACE ||--o{ AUTH_MOUNT : contains
    NAMESPACE ||--o{ ENGINE_MOUNT : contains

    SECRET ||--o{ SECRET_VERSION : has
    SECRET_VERSION ||--o{ LEASE : creates

    TOKEN ||--o{ TOKEN_ACCESSOR : has
    TOKEN }o--o{ POLICY : attached

    AUTH_MOUNT ||--o{ AUTH_ROLE : defines
    AUTH_ROLE }o--o{ POLICY : attached

    ENGINE_MOUNT ||--o{ ENGINE_ROLE : defines
    ENGINE_ROLE ||--o{ LEASE : generates

    CERTIFICATE ||--o{ CRL_ENTRY : revoked_in

    AUDIT_LOG }o--|| TOKEN_ACCESSOR : performed_by

    NAMESPACE {
        string id PK
        string path
        string parent_id FK
        timestamp created_at
    }

    SECRET {
        string id PK
        string namespace_id FK
        string path
        int current_version
        json metadata
        timestamp created_at
        timestamp updated_at
    }

    SECRET_VERSION {
        string id PK
        string secret_id FK
        int version
        bytes encrypted_data
        boolean destroyed
        timestamp created_at
        timestamp deletion_time
    }

    LEASE {
        string lease_id PK
        string path
        string token_accessor FK
        int ttl_seconds
        boolean renewable
        timestamp issued_at
        timestamp expires_at
        string revoke_prefix
    }

    TOKEN {
        string accessor PK
        bytes encrypted_id
        string parent_accessor FK
        string[] policies
        int ttl_seconds
        boolean renewable
        boolean orphan
        string auth_method
        json metadata
        timestamp created_at
        timestamp expires_at
    }

    TOKEN_ACCESSOR {
        string accessor PK
        string display_name
        timestamp last_used
    }

    POLICY {
        string name PK
        string namespace_id FK
        text document
        int version
        timestamp created_at
        timestamp updated_at
    }

    AUTH_MOUNT {
        string path PK
        string type
        string namespace_id FK
        json config
        boolean local
        timestamp created_at
    }

    AUTH_ROLE {
        string name PK
        string auth_mount_path FK
        string[] policies
        int token_ttl
        int token_max_ttl
        json config
    }

    ENGINE_MOUNT {
        string path PK
        string type
        string namespace_id FK
        json config
        int default_lease_ttl
        int max_lease_ttl
        timestamp created_at
    }

    ENGINE_ROLE {
        string name PK
        string engine_mount_path FK
        text creation_statements
        text revocation_statements
        int default_ttl
        int max_ttl
    }

    CERTIFICATE {
        string serial_number PK
        string engine_mount_path FK
        string subject_cn
        bytes certificate_pem
        bytes private_key_encrypted
        timestamp not_before
        timestamp not_after
        boolean revoked
        timestamp revoked_at
    }

    CRL_ENTRY {
        string serial_number PK
        string engine_mount_path FK
        timestamp revoked_at
        int revocation_reason
    }

    AUDIT_LOG {
        string request_id PK
        timestamp time
        string type
        string auth_accessor
        string path
        string operation
        json request_data_hmac
        json response_data_hmac
        int response_status
        string remote_address
    }
```

---

## Table Schemas

### Secrets Table

```
TABLE secrets (
    id              UUID PRIMARY KEY,
    namespace_id    UUID NOT NULL REFERENCES namespaces(id),
    path            VARCHAR(512) NOT NULL,
    current_version INT NOT NULL DEFAULT 1,
    metadata        JSONB,
    cas_required    BOOLEAN DEFAULT FALSE,
    max_versions    INT DEFAULT 10,
    delete_version_after INTERVAL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(namespace_id, path)
)

INDEX idx_secrets_path ON secrets(namespace_id, path);
INDEX idx_secrets_updated ON secrets(updated_at);
```

### Secret Versions Table

```
TABLE secret_versions (
    id              UUID PRIMARY KEY,
    secret_id       UUID NOT NULL REFERENCES secrets(id),
    version         INT NOT NULL,
    encrypted_data  BYTEA NOT NULL,  -- AES-256-GCM encrypted
    destroyed       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    deletion_time   TIMESTAMP,  -- Soft delete marker

    UNIQUE(secret_id, version)
)

INDEX idx_versions_secret ON secret_versions(secret_id, version DESC);
INDEX idx_versions_deletion ON secret_versions(deletion_time) WHERE deletion_time IS NOT NULL;
```

### Leases Table

```
TABLE leases (
    lease_id        VARCHAR(256) PRIMARY KEY,  -- e.g., "database/creds/myapp/abc123"
    path            VARCHAR(512) NOT NULL,
    token_accessor  VARCHAR(64) REFERENCES tokens(accessor),
    secret_engine   VARCHAR(128) NOT NULL,
    ttl_seconds     INT NOT NULL,
    renewable       BOOLEAN NOT NULL,
    increment_limit INT,
    issued_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMP NOT NULL,
    last_renewed_at TIMESTAMP,
    revoke_data     JSONB,  -- Engine-specific revocation context

    INDEX idx_leases_expires ON leases(expires_at),
    INDEX idx_leases_token ON leases(token_accessor),
    INDEX idx_leases_prefix ON leases(path text_pattern_ops)
)
```

### Tokens Table

```
TABLE tokens (
    accessor        VARCHAR(64) PRIMARY KEY,  -- Public identifier
    encrypted_id    BYTEA NOT NULL,           -- Encrypted actual token
    parent_accessor VARCHAR(64) REFERENCES tokens(accessor),
    policies        TEXT[] NOT NULL,
    ttl_seconds     INT NOT NULL,
    explicit_max_ttl INT,
    renewable       BOOLEAN NOT NULL,
    orphan          BOOLEAN DEFAULT FALSE,
    auth_method     VARCHAR(64) NOT NULL,
    entity_id       UUID,
    display_name    VARCHAR(256),
    num_uses        INT DEFAULT 0,  -- 0 = unlimited
    uses_remaining  INT,
    metadata        JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMP,
    last_used_at    TIMESTAMP,

    INDEX idx_tokens_expires ON tokens(expires_at) WHERE expires_at IS NOT NULL,
    INDEX idx_tokens_parent ON tokens(parent_accessor),
    INDEX idx_tokens_entity ON tokens(entity_id)
)
```

### Policies Table

```
TABLE policies (
    name            VARCHAR(256) PRIMARY KEY,
    namespace_id    UUID NOT NULL REFERENCES namespaces(id),
    document        TEXT NOT NULL,  -- HCL or JSON policy document
    version         INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(namespace_id, name)
)
```

---

## API Design

### Authentication APIs

#### Login (Generic Pattern)

```
POST /v1/auth/{method}/login

Request:
{
    // Method-specific credentials
    "role_id": "abc123",     // AppRole
    "secret_id": "xyz789"    // AppRole
}

Response (200 OK):
{
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "auth": {
        "client_token": "hvs.CAESIJ...",
        "accessor": "0e9e354a-520f-df04-6867-ee81cae3d42d",
        "policies": ["default", "myapp-policy"],
        "token_policies": ["default", "myapp-policy"],
        "metadata": {
            "role_name": "myapp-role"
        },
        "lease_duration": 3600,
        "renewable": true
    }
}

Headers:
X-Vault-Token: (returned token for subsequent requests)
```

### Secret APIs

#### Read Secret (KV v2)

```
GET /v1/secret/data/{path}?version={version}

Headers:
X-Vault-Token: hvs.CAESIJ...

Response (200 OK):
{
    "request_id": "550e8400-e29b-41d4-a716-446655440001",
    "data": {
        "data": {
            "username": "admin",
            "password": "secret123"
        },
        "metadata": {
            "created_time": "2024-01-15T10:30:00Z",
            "custom_metadata": null,
            "deletion_time": "",
            "destroyed": false,
            "version": 3
        }
    }
}
```

#### Write Secret (KV v2)

```
POST /v1/secret/data/{path}

Headers:
X-Vault-Token: hvs.CAESIJ...
Content-Type: application/json

Request:
{
    "options": {
        "cas": 3  // Check-and-set: only write if current version is 3
    },
    "data": {
        "username": "admin",
        "password": "newsecret456"
    }
}

Response (200 OK):
{
    "request_id": "550e8400-e29b-41d4-a716-446655440002",
    "data": {
        "created_time": "2024-01-15T11:00:00Z",
        "custom_metadata": null,
        "deletion_time": "",
        "destroyed": false,
        "version": 4
    }
}
```

### Dynamic Secret APIs

#### Generate Database Credentials

```
GET /v1/database/creds/{role}

Headers:
X-Vault-Token: hvs.CAESIJ...

Response (200 OK):
{
    "request_id": "550e8400-e29b-41d4-a716-446655440003",
    "lease_id": "database/creds/myapp-role/abc123xyz",
    "renewable": true,
    "lease_duration": 3600,
    "data": {
        "username": "v-approle-myapp-r-abc123",
        "password": "A1b2C3d4E5f6G7h8"
    }
}
```

#### Renew Lease

```
POST /v1/sys/leases/renew

Headers:
X-Vault-Token: hvs.CAESIJ...

Request:
{
    "lease_id": "database/creds/myapp-role/abc123xyz",
    "increment": 3600
}

Response (200 OK):
{
    "request_id": "550e8400-e29b-41d4-a716-446655440004",
    "lease_id": "database/creds/myapp-role/abc123xyz",
    "renewable": true,
    "lease_duration": 3600
}
```

### PKI APIs

#### Issue Certificate

```
POST /v1/pki/issue/{role}

Headers:
X-Vault-Token: hvs.CAESIJ...

Request:
{
    "common_name": "myservice.internal",
    "alt_names": "myservice.prod.internal,myservice",
    "ttl": "24h",
    "format": "pem"
}

Response (200 OK):
{
    "request_id": "550e8400-e29b-41d4-a716-446655440005",
    "lease_id": "pki/issue/myservice/def456",
    "renewable": false,
    "lease_duration": 86400,
    "data": {
        "certificate": "-----BEGIN CERTIFICATE-----\n...",
        "issuing_ca": "-----BEGIN CERTIFICATE-----\n...",
        "ca_chain": ["-----BEGIN CERTIFICATE-----\n..."],
        "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...",
        "private_key_type": "rsa",
        "serial_number": "39:dd:2e:90:b7:23:1f:8d:d3:7d:31:c5:1b:da:84:d0:5b:65:31:58"
    }
}
```

### Transit APIs

#### Encrypt Data

```
POST /v1/transit/encrypt/{key_name}

Headers:
X-Vault-Token: hvs.CAESIJ...

Request:
{
    "plaintext": "base64-encoded-data",
    "context": "base64-encoded-context"  // For convergent encryption
}

Response (200 OK):
{
    "request_id": "550e8400-e29b-41d4-a716-446655440006",
    "data": {
        "ciphertext": "vault:v1:XjsPWPjqPrBi1N2Ms2s1QM798YyFWnO4TR4lsFA=",
        "key_version": 1
    }
}
```

### System APIs

#### Seal Status

```
GET /v1/sys/seal-status

Response (200 OK):
{
    "type": "shamir",
    "initialized": true,
    "sealed": false,
    "t": 3,           // Threshold
    "n": 5,           // Total shares
    "progress": 0,    // Unseal progress
    "version": "1.15.0",
    "cluster_name": "vault-cluster-abc123",
    "cluster_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Unseal

```
POST /v1/sys/unseal

Request:
{
    "key": "unseal-key-share-1"
}

Response (200 OK):
{
    "sealed": true,
    "t": 3,
    "n": 5,
    "progress": 1,  // 1 of 3 keys provided
    "version": "1.15.0"
}
```

---

## Core Algorithms

### Shamir's Secret Sharing

```
FUNCTION split_secret(secret: bytes, n: int, k: int) -> List[Share]:
    """
    Split a secret into n shares where k shares are needed to reconstruct.
    Uses polynomial interpolation over GF(256).

    Args:
        secret: The secret to split (e.g., master key)
        n: Total number of shares to generate
        k: Threshold - minimum shares needed to reconstruct

    Returns:
        List of n shares, each containing (x, y_values)
    """
    shares = []

    FOR each_byte IN secret:
        // Generate random polynomial of degree k-1 with byte as constant term
        coefficients = [each_byte] + random_bytes(k - 1)

        // Evaluate polynomial at n different x values (1 to n)
        FOR x IN range(1, n + 1):
            y = evaluate_polynomial(coefficients, x)
            shares[x].append(y)

    RETURN [(x, y_bytes) FOR x, y_bytes IN enumerate(shares, 1)]


FUNCTION combine_shares(shares: List[Share], k: int) -> bytes:
    """
    Reconstruct secret from k or more shares using Lagrange interpolation.
    """
    IF len(shares) < k:
        RAISE Error("Insufficient shares")

    // Use exactly k shares
    shares = shares[:k]
    x_values = [share.x FOR share IN shares]

    secret = []
    FOR byte_index IN range(len(shares[0].y_values)):
        y_values = [share.y_values[byte_index] FOR share IN shares]

        // Lagrange interpolation to find f(0) = secret byte
        secret_byte = lagrange_interpolate(x_values, y_values, 0)
        secret.append(secret_byte)

    RETURN bytes(secret)


FUNCTION lagrange_interpolate(x_vals, y_vals, x) -> int:
    """
    Lagrange interpolation in GF(256).
    """
    result = 0
    FOR i IN range(len(x_vals)):
        term = y_vals[i]
        FOR j IN range(len(x_vals)):
            IF i != j:
                // GF(256) arithmetic: division via multiplication by inverse
                term = gf256_mul(term, gf256_div(x XOR x_vals[j], x_vals[i] XOR x_vals[j]))
        result = result XOR term
    RETURN result
```

### Secret Encryption/Decryption

```
FUNCTION encrypt_secret(plaintext: bytes, context: bytes = None) -> EncryptedData:
    """
    Encrypt secret data using AES-256-GCM with the data encryption key (DEK).

    The DEK is itself encrypted by the master key (which is protected by seal).
    """
    // 1. Get current DEK (already decrypted in memory after unseal)
    dek = barrier.get_data_encryption_key()

    // 2. Optionally derive context-specific key
    IF context IS NOT None:
        // HKDF derivation for convergent encryption
        derived_key = hkdf_derive(dek, context, 32)
    ELSE:
        derived_key = dek

    // 3. Generate random 96-bit nonce
    nonce = random_bytes(12)

    // 4. Encrypt with AES-256-GCM
    ciphertext, tag = aes_gcm_encrypt(
        key=derived_key,
        nonce=nonce,
        plaintext=plaintext,
        additional_data=context  // AAD for authentication
    )

    // 5. Package result
    RETURN EncryptedData(
        version=1,
        nonce=nonce,
        ciphertext=ciphertext,
        tag=tag,
        key_version=barrier.current_key_version
    )


FUNCTION decrypt_secret(encrypted: EncryptedData, context: bytes = None) -> bytes:
    """
    Decrypt secret data. Fails if sealed or tampered.
    """
    IF barrier.is_sealed():
        RAISE SealedError("Vault is sealed")

    // 1. Get DEK for the key version used during encryption
    dek = barrier.get_data_encryption_key(encrypted.key_version)

    // 2. Derive key if context provided
    IF context IS NOT None:
        derived_key = hkdf_derive(dek, context, 32)
    ELSE:
        derived_key = dek

    // 3. Decrypt and verify
    TRY:
        plaintext = aes_gcm_decrypt(
            key=derived_key,
            nonce=encrypted.nonce,
            ciphertext=encrypted.ciphertext,
            tag=encrypted.tag,
            additional_data=context
        )
    CATCH AuthenticationError:
        RAISE TamperError("Secret data has been tampered")

    RETURN plaintext
```

### Lease Management

```
FUNCTION create_lease(
    path: string,
    token_accessor: string,
    ttl: int,
    renewable: bool,
    revoke_callback: Function
) -> Lease:
    """
    Create a new lease for a dynamic secret.
    """
    lease_id = generate_lease_id(path)
    expires_at = now() + ttl

    lease = Lease(
        lease_id=lease_id,
        path=path,
        token_accessor=token_accessor,
        ttl_seconds=ttl,
        renewable=renewable,
        issued_at=now(),
        expires_at=expires_at,
        revoke_callback=revoke_callback
    )

    // Persist lease
    storage.write(f"sys/leases/{lease_id}", lease)

    // Add to expiration queue (priority queue by expires_at)
    expiration_queue.push(lease_id, expires_at)

    // Update metrics
    metrics.increment("vault.lease.count", tags={"path_prefix": path.split("/")[0]})

    RETURN lease


FUNCTION renew_lease(lease_id: string, increment: int) -> Lease:
    """
    Renew a lease, extending its TTL.
    """
    lease = storage.read(f"sys/leases/{lease_id}")

    IF lease IS None:
        RAISE LeaseNotFoundError(lease_id)

    IF NOT lease.renewable:
        RAISE LeaseNotRenewableError(lease_id)

    // Calculate new expiration (capped by max_ttl)
    max_ttl = get_max_ttl_for_path(lease.path)
    age = now() - lease.issued_at
    remaining_max = max_ttl - age

    new_ttl = min(increment, remaining_max, lease.ttl_seconds)

    IF new_ttl <= 0:
        RAISE LeaseMaxTTLExceededError(lease_id)

    // Update lease
    lease.expires_at = now() + new_ttl
    lease.last_renewed_at = now()

    storage.write(f"sys/leases/{lease_id}", lease)
    expiration_queue.update(lease_id, lease.expires_at)

    RETURN lease


FUNCTION expire_leases():
    """
    Background goroutine that processes expired leases.
    Runs continuously, waking up for each expiration.
    """
    WHILE running:
        next_expiry = expiration_queue.peek_next_expiry()

        IF next_expiry IS None:
            sleep(1 second)
            CONTINUE

        sleep_duration = next_expiry - now()
        IF sleep_duration > 0:
            sleep(sleep_duration)

        // Process all expired leases
        WHILE True:
            lease_id = expiration_queue.pop_if_expired(now())
            IF lease_id IS None:
                BREAK

            TRY:
                revoke_lease(lease_id)
            CATCH Error as e:
                log.error(f"Failed to revoke lease {lease_id}: {e}")
                // Re-queue for retry with backoff
                expiration_queue.push(lease_id, now() + retry_backoff)


FUNCTION revoke_lease(lease_id: string):
    """
    Revoke a lease and its associated secret/credential.
    """
    lease = storage.read(f"sys/leases/{lease_id}")

    IF lease IS None:
        RETURN  // Already revoked

    // Execute engine-specific revocation
    TRY:
        lease.revoke_callback(lease.revoke_data)
    CATCH Error as e:
        log.error(f"Revocation callback failed: {e}")
        // Still delete lease to prevent retry loops

    // Delete lease from storage
    storage.delete(f"sys/leases/{lease_id}")

    // Update metrics
    metrics.decrement("vault.lease.count")
    metrics.increment("vault.lease.revoked")
```

### Policy Evaluation

```
FUNCTION evaluate_policy(
    token: Token,
    path: string,
    operation: string
) -> PolicyResult:
    """
    Evaluate whether a token is authorized for an operation on a path.

    Policy evaluation is deny-by-default and uses longest-match semantics.
    """
    // Special case: root token has all permissions
    IF "root" IN token.policies:
        RETURN PolicyResult(allowed=True, capabilities=["root"])

    // Collect all rules from all attached policies
    all_rules = []
    FOR policy_name IN token.policies:
        policy = policy_cache.get(policy_name)
        IF policy IS None:
            policy = storage.read(f"sys/policies/acl/{policy_name}")
            policy_cache.set(policy_name, policy, ttl=60)

        IF policy IS NOT None:
            all_rules.extend(parse_policy(policy.document))

    // Find matching rules using longest-match
    matching_rules = []
    FOR rule IN all_rules:
        IF path_matches(rule.path, path):
            matching_rules.append(rule)

    IF len(matching_rules) == 0:
        RETURN PolicyResult(allowed=False, reason="no matching policy")

    // Sort by specificity (longest path first)
    matching_rules.sort(key=lambda r: -len(r.path))

    // Aggregate capabilities from matching rules
    capabilities = set()
    FOR rule IN matching_rules:
        IF "deny" IN rule.capabilities:
            RETURN PolicyResult(allowed=False, reason="explicit deny")
        capabilities.update(rule.capabilities)

    // Check if requested operation is in capabilities
    required_capability = operation_to_capability(operation)

    IF required_capability IN capabilities OR "sudo" IN capabilities:
        RETURN PolicyResult(allowed=True, capabilities=list(capabilities))
    ELSE:
        RETURN PolicyResult(
            allowed=False,
            reason=f"missing capability: {required_capability}"
        )


FUNCTION path_matches(pattern: string, path: string) -> bool:
    """
    Check if a path matches a policy pattern.

    Patterns support:
    - Exact match: "secret/data/myapp"
    - Glob suffix: "secret/data/*" matches "secret/data/anything"
    - Segment wildcard: "secret/+/config" matches "secret/myapp/config"
    """
    IF pattern == path:
        RETURN True

    // Handle glob suffix
    IF pattern.endswith("*"):
        prefix = pattern[:-1]
        RETURN path.startswith(prefix)

    // Handle segment wildcards (+)
    pattern_parts = pattern.split("/")
    path_parts = path.split("/")

    IF len(pattern_parts) != len(path_parts):
        RETURN False

    FOR pattern_part, path_part IN zip(pattern_parts, path_parts):
        IF pattern_part == "+":
            CONTINUE  // Wildcard matches any segment
        IF pattern_part != path_part:
            RETURN False

    RETURN True


FUNCTION operation_to_capability(operation: string) -> string:
    """
    Map HTTP method/operation to policy capability.
    """
    mapping = {
        "GET": "read",
        "LIST": "list",
        "POST": "create",
        "PUT": "update",
        "PATCH": "update",
        "DELETE": "delete"
    }
    RETURN mapping.get(operation, "read")
```

---

## State Machines

### Seal State Machine

```mermaid
stateDiagram-v2
    [*] --> Uninitialized: First boot
    Uninitialized --> Sealed: Initialize (generates master key)
    Sealed --> Unsealing: Provide unseal key
    Unsealing --> Sealed: Reset / Timeout
    Unsealing --> Unsealed: Threshold reached
    Unsealed --> Sealed: Seal command / Step-down
    Sealed --> Unsealed: Auto-unseal (if configured)

    note right of Uninitialized
        No master key exists
        Must run init
    end note

    note right of Sealed
        Master key encrypted
        No operations possible
        Only status checks
    end note

    note right of Unsealing
        Collecting key shares
        Progress tracked
        Times out after 15 min
    end note

    note right of Unsealed
        Master key in memory
        All operations available
        Audit logging active
    end note
```

### Token Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Active: Token created
    Active --> Active: Renewed (TTL extended)
    Active --> Expired: TTL elapsed
    Active --> Revoked: Explicit revoke
    Active --> Revoked: Parent revoked
    Active --> UsesExhausted: num_uses reached
    Expired --> [*]
    Revoked --> [*]
    UsesExhausted --> [*]

    note right of Active
        Token can be used
        for authentication
    end note

    note right of Revoked
        All child tokens
        also revoked
    end note
```

### Lease Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Active: Credential generated
    Active --> Active: Renewed
    Active --> Expired: TTL elapsed (no renewal)
    Active --> Revoked: Explicit revoke
    Active --> Revoked: Token revoked
    Active --> MaxTTLReached: Max lifetime exceeded
    Expired --> Revoked: Cleanup job
    MaxTTLReached --> Revoked: Cannot renew further
    Revoked --> [*]: Credential deleted from target

    note right of Active
        Credential valid
        Can be renewed
    end note

    note right of Revoked
        Revocation callback
        executed (e.g., DROP USER)
    end note
```

---

## Data Structures

### Policy Document Format

```
// HCL format policy document
path "secret/data/myapp/*" {
    capabilities = ["create", "read", "update", "delete", "list"]
}

path "database/creds/myapp-role" {
    capabilities = ["read"]
}

path "pki/issue/myapp-cert" {
    capabilities = ["create", "update"]
}

path "transit/encrypt/myapp-key" {
    capabilities = ["update"]
}

path "transit/decrypt/myapp-key" {
    capabilities = ["update"]
}

// Deny takes precedence
path "secret/data/admin/*" {
    capabilities = ["deny"]
}
```

### Audit Log Entry Format

```
{
    "time": "2024-01-15T10:30:00.123456Z",
    "type": "request",
    "auth": {
        "client_token": "hmac-sha256:abc123...",  // HMAC, not actual token
        "accessor": "0e9e354a-520f-df04-6867-ee81cae3d42d",
        "display_name": "approle-myapp-role",
        "policies": ["default", "myapp-policy"],
        "token_policies": ["default", "myapp-policy"],
        "metadata": {
            "role_name": "myapp-role"
        },
        "entity_id": "7d2e3179-f69b-450c-7179-ac8ee8bd8ca9",
        "token_type": "service"
    },
    "request": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "operation": "read",
        "client_token": "hmac-sha256:abc123...",
        "client_token_accessor": "0e9e354a-520f-df04-6867-ee81cae3d42d",
        "namespace": {
            "id": "root"
        },
        "path": "secret/data/myapp/config",
        "data": null,
        "remote_address": "10.0.1.50"
    },
    "response": {
        "data": {
            "data": "hmac-sha256:def456...",  // HMAC of response data
            "metadata": "hmac-sha256:ghi789..."
        }
    },
    "error": ""
}
```
