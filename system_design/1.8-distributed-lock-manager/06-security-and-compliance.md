# Security and Compliance

[← Back to Index](./00-index.md)

---

## Threat Model

### Assets to Protect

| Asset | Description | Impact if Compromised |
|-------|-------------|----------------------|
| Lock state | Current lock holders, fencing tokens | Mutual exclusion violated |
| Lease data | Active leases, TTLs | Unauthorized lock acquisition |
| Cluster membership | Node addresses, Raft state | Cluster takeover |
| Client credentials | Certificates, tokens | Impersonation |
| Audit logs | Who acquired what lock when | Compliance violation |

### Threat Actors

| Actor | Capability | Goal |
|-------|------------|------|
| External attacker | Network access | Data theft, service disruption |
| Malicious insider | Valid credentials | Unauthorized access, sabotage |
| Compromised service | Valid service credentials | Escalate privileges |
| Rogue node | Cluster access | Byzantine behavior |

### Attack Vectors

```
┌─────────────────────────────────────────────────────────────────┐
│                ATTACK SURFACE                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CLIENT → LOCK SERVICE                                       │
│     ├── Credential theft (impersonate client)                   │
│     ├── Request forgery (acquire locks without auth)            │
│     └── DoS (exhaust connections/locks)                         │
│                                                                  │
│  2. NODE → NODE (Raft)                                          │
│     ├── Node impersonation (join cluster as rogue)              │
│     ├── Log injection (corrupt Raft log)                        │
│     └── Election manipulation (force leader change)             │
│                                                                  │
│  3. STORAGE                                                      │
│     ├── Direct disk access (bypass API)                         │
│     ├── Backup theft (offline attack)                           │
│     └── Snapshot tampering                                      │
│                                                                  │
│  4. NETWORK                                                      │
│     ├── Eavesdropping (intercept credentials)                   │
│     ├── MITM (modify requests/responses)                        │
│     └── Traffic analysis (infer lock patterns)                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication

### mTLS (Mutual TLS)

```
┌─────────────────────────────────────────────────────────────────┐
│                mTLS AUTHENTICATION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client                            Lock Service                  │
│    │                                   │                         │
│    │────── TLS ClientHello ──────────▶│                         │
│    │                                   │                         │
│    │◀───── TLS ServerHello ───────────│                         │
│    │       + Server Certificate        │                         │
│    │       + Certificate Request       │                         │
│    │                                   │                         │
│    │────── Client Certificate ───────▶│                         │
│    │       + Client Key Exchange       │                         │
│    │       + Certificate Verify        │                         │
│    │                                   │                         │
│    │◀───── Verify Client Cert ────────│                         │
│    │       (Extract CN for identity)   │                         │
│    │                                   │                         │
│    │◀═════ Encrypted Channel ════════▶│                         │
│                                                                  │
│  Certificate fields used for identity:                          │
│  • Common Name (CN): Service name                               │
│  • Organization (O): Team/namespace                             │
│  • SAN: Additional allowed identities                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Certificate Configuration

```yaml
# Lock service server certificate
server_cert:
  common_name: lock-manager.prod.svc
  organization: infrastructure
  san:
    - DNS:lock-manager.prod.svc
    - DNS:lock-manager.prod.svc.cluster.local
    - IP:10.0.1.10
    - IP:10.0.1.11
    - IP:10.0.1.12
  key_usage:
    - digitalSignature
    - keyEncipherment
  extended_key_usage:
    - serverAuth

# Client certificate (per service)
client_cert:
  common_name: payment-service
  organization: team-payments
  key_usage:
    - digitalSignature
  extended_key_usage:
    - clientAuth
```

### Token-Based Authentication (Alternative)

```
┌─────────────────────────────────────────────────────────────────┐
│                TOKEN-BASED AUTH                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  For environments where mTLS is impractical                     │
│                                                                  │
│  Client                                                          │
│    │                                                             │
│    │  1. Request token from auth service                        │
│    │     └── JWT with claims: {sub: "payment-svc", ...}        │
│    │                                                             │
│    │  2. Send request with token                                │
│    │     └── Authorization: Bearer <jwt>                        │
│    │                                                             │
│  Lock Service                                                    │
│    │                                                             │
│    │  3. Validate token                                         │
│    │     ├── Verify signature (public key)                      │
│    │     ├── Check expiration                                   │
│    │     └── Extract identity from claims                       │
│    │                                                             │
│    │  4. Check authorization (see ACL section)                  │
│                                                                  │
│  Token structure:                                                │
│  {                                                               │
│    "iss": "auth.company.com",                                   │
│    "sub": "payment-service",                                    │
│    "aud": "lock-manager",                                       │
│    "exp": 1705750800,                                           │
│    "groups": ["team-payments", "lock-writers"]                  │
│  }                                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authorization

### Path-Based ACL Model

```
┌─────────────────────────────────────────────────────────────────┐
│                ACL MODEL                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Lock paths follow hierarchical structure:                      │
│                                                                  │
│  /team-payments/                                                │
│  ├── database/                                                  │
│  │   ├── users/                                                │
│  │   │   └── schema-migration    (lock)                        │
│  │   └── orders/                                               │
│  │       └── schema-migration    (lock)                        │
│  └── cache/                                                     │
│      └── warm-up                 (lock)                        │
│                                                                  │
│  ACL Rules:                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Principal         │ Path Pattern      │ Permissions       │  │
│  │───────────────────│───────────────────│───────────────────│  │
│  │ payment-service   │ /team-payments/*  │ read, write       │  │
│  │ migration-job     │ /*/database/*/s*  │ write             │  │
│  │ monitoring        │ /**               │ read              │  │
│  │ admin             │ /**               │ read, write, admin│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Permissions:                                                    │
│  • read: Get lock status, watch                                │
│  • write: Acquire, release locks                               │
│  • admin: Create/delete lock paths, modify ACLs                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ACL Evaluation

```
FUNCTION check_authorization(principal, path, permission):
    // Find all matching ACL rules
    matching_rules = []

    FOR rule IN acl_rules:
        IF rule.principal_matches(principal):
            IF rule.path_matches(path):
                matching_rules.append(rule)

    // Sort by specificity (most specific first)
    matching_rules.sort(by=specificity, order=descending)

    // Apply most specific matching rule
    IF matching_rules is empty:
        RETURN DENY  // Default deny

    most_specific = matching_rules[0]
    IF permission IN most_specific.permissions:
        RETURN ALLOW
    ELSE:
        RETURN DENY


FUNCTION path_matches(pattern, path):
    // Pattern syntax:
    // * = single path segment
    // ** = any number of segments

    pattern_parts = pattern.split("/")
    path_parts = path.split("/")

    // Match using glob-style rules
    RETURN glob_match(pattern_parts, path_parts)
```

### RBAC (Role-Based Access Control)

```yaml
# Role definitions
roles:
  lock-reader:
    permissions:
      - action: read
        paths: ["/**"]

  lock-writer:
    permissions:
      - action: read
        paths: ["/**"]
      - action: write
        paths: ["/${team}/**"]  # team interpolated from identity

  lock-admin:
    permissions:
      - action: read
        paths: ["/**"]
      - action: write
        paths: ["/**"]
      - action: admin
        paths: ["/**"]

# Role bindings
bindings:
  - role: lock-reader
    subjects:
      - kind: Group
        name: developers

  - role: lock-writer
    subjects:
      - kind: ServiceAccount
        name: payment-service
        namespace: production

  - role: lock-admin
    subjects:
      - kind: User
        name: ops-admin
```

---

## Data Protection

### Encryption at Rest

```
┌─────────────────────────────────────────────────────────────────┐
│                ENCRYPTION AT REST                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Option 1: Volume-level encryption (dm-crypt/LUKS)             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Application                                               │  │
│  │     │                                                     │  │
│  │     ▼                                                     │  │
│  │ Filesystem (ext4/xfs)                                    │  │
│  │     │                                                     │  │
│  │     ▼                                                     │  │
│  │ dm-crypt (LUKS encryption layer)                        │  │
│  │     │                                                     │  │
│  │     ▼                                                     │  │
│  │ Physical disk                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Key management:                                                │
│  • Key stored in KMS (AWS KMS, HashiCorp Vault)               │
│  • Key fetched at boot time                                    │
│  • Key never persisted on disk                                 │
│                                                                  │
│  ──────────────────────────────────────────────────────────── │
│                                                                  │
│  Option 2: Application-level encryption                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Application                                               │  │
│  │     │                                                     │  │
│  │     ▼                                                     │  │
│  │ Encrypt(data, DEK)  →  encrypted_data                    │  │
│  │     │                                                     │  │
│  │     ▼                                                     │  │
│  │ Storage (Raft log, snapshots)                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Data Encryption Key (DEK) encrypted with KEK from KMS         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Encryption in Transit

```yaml
# TLS configuration for all communications

# Client to server
client_tls:
  enabled: true
  cert_file: /etc/lock-manager/client.crt
  key_file: /etc/lock-manager/client.key
  ca_file: /etc/lock-manager/ca.crt
  verify_client_cert: true  # mTLS

# Peer to peer (Raft)
peer_tls:
  enabled: true
  cert_file: /etc/lock-manager/peer.crt
  key_file: /etc/lock-manager/peer.key
  ca_file: /etc/lock-manager/ca.crt
  verify_peer_cert: true

# TLS settings
tls_config:
  min_version: TLS1.3
  cipher_suites:
    - TLS_AES_256_GCM_SHA384
    - TLS_CHACHA20_POLY1305_SHA256
```

---

## Audit Logging

### Audit Event Schema

```json
{
  "timestamp": "2025-01-20T10:15:30.123Z",
  "event_id": "evt_abc123",
  "event_type": "LOCK_ACQUIRE",
  "principal": {
    "type": "ServiceAccount",
    "name": "payment-service",
    "source_ip": "10.0.2.45"
  },
  "resource": {
    "type": "Lock",
    "path": "/team-payments/database/users/schema-migration"
  },
  "request": {
    "lease_id": 7587848390234,
    "timeout_ms": 30000
  },
  "response": {
    "status": "SUCCESS",
    "fencing_token": 15892
  },
  "metadata": {
    "cluster_id": "lock-manager-prod",
    "node_id": "node-1",
    "raft_term": 42,
    "revision": 15892
  }
}
```

### Audit Event Types

| Event Type | Description | Required Fields |
|------------|-------------|-----------------|
| `LOCK_ACQUIRE` | Lock acquisition attempt | path, lease_id, result |
| `LOCK_RELEASE` | Lock release | path, holder |
| `LEASE_GRANT` | New lease created | lease_id, ttl, client |
| `LEASE_REVOKE` | Lease revoked | lease_id, reason |
| `LEASE_EXPIRE` | Lease expired | lease_id, held_locks |
| `AUTH_FAILURE` | Authentication failed | principal, reason |
| `AUTHZ_DENIED` | Authorization denied | principal, path, permission |
| `MEMBER_ADD` | Node added to cluster | node_id, peer_url |
| `MEMBER_REMOVE` | Node removed from cluster | node_id, reason |

### Audit Log Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                AUDIT LOG PIPELINE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Lock Service                                                    │
│      │                                                           │
│      │ (Every auditable event)                                  │
│      ▼                                                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Audit Logger                            │ │
│  │  • Structured JSON format                                 │ │
│  │  • Include all context                                    │ │
│  │  • Never block on audit write                             │ │
│  └───────────────────────────────────────────────────────────┘ │
│      │                                                           │
│      ▼                                                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Local Buffer                            │ │
│  │  • Ring buffer (1GB)                                      │ │
│  │  • Persist to disk async                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
│      │                                                           │
│      ▼                                                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Log Aggregation (Fluentd/Vector)              │ │
│  │  • Ship to central logging                                │ │
│  │  • Add node metadata                                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│      │                                                           │
│      ▼                                                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                 SIEM / Log Analytics                       │ │
│  │  • Long-term retention (7 years for compliance)          │ │
│  │  • Search and analysis                                    │ │
│  │  • Alerting on suspicious patterns                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Compliance Considerations

### SOC 2

| Control | Implementation |
|---------|----------------|
| CC6.1 - Logical access | mTLS client authentication, RBAC |
| CC6.2 - Access provisioning | Certificate issuance via PKI |
| CC6.3 - Access removal | Certificate revocation, CRL/OCSP |
| CC7.1 - Change management | Audit logs for all configuration changes |
| CC7.2 - System monitoring | Metrics, alerting, intrusion detection |

### PCI-DSS

| Requirement | Implementation |
|-------------|----------------|
| 2.3 - Encrypt admin access | TLS 1.3 for all connections |
| 3.4 - Render PAN unreadable | Not applicable (no PAN stored) |
| 7.1 - Restrict access | RBAC, principle of least privilege |
| 10.1 - Audit trails | Comprehensive audit logging |
| 10.5 - Secure audit trails | Immutable log storage |

### GDPR

| Article | Implementation |
|---------|----------------|
| Art. 5 - Data minimization | Lock metadata only, no personal data in lock values |
| Art. 25 - Privacy by design | Encryption at rest and in transit |
| Art. 30 - Records of processing | Audit logs as processing record |
| Art. 32 - Security measures | mTLS, RBAC, encryption |

---

## Security Hardening Checklist

| Category | Item | Priority |
|----------|------|----------|
| **Network** | mTLS for all client connections | P0 |
| **Network** | mTLS for peer (Raft) connections | P0 |
| **Network** | Firewall rules (deny by default) | P0 |
| **Network** | No public internet exposure | P0 |
| **Auth** | Client certificate rotation (90 days) | P1 |
| **Auth** | Service account per application | P1 |
| **Auth** | No shared credentials | P0 |
| **Authz** | Path-based ACLs enabled | P1 |
| **Authz** | Default deny policy | P0 |
| **Authz** | Regular ACL review | P2 |
| **Encryption** | Encryption at rest enabled | P1 |
| **Encryption** | TLS 1.3 minimum | P0 |
| **Encryption** | Key rotation (annual) | P1 |
| **Audit** | All operations logged | P0 |
| **Audit** | Log integrity protection | P1 |
| **Audit** | Log retention (7 years) | P1 |
| **Operations** | Secrets in vault (not config files) | P0 |
| **Operations** | Regular security patches | P0 |
| **Operations** | Vulnerability scanning | P1 |

---

## Incident Response

### Security Incident Types

| Incident | Severity | Initial Response |
|----------|----------|------------------|
| Credential compromise | Critical | Revoke certs, rotate keys |
| Unauthorized lock access | High | Investigate, review ACLs |
| DoS attack | High | Rate limit, block source |
| Data exfiltration | Critical | Isolate, forensics |
| Rogue node | Critical | Remove from cluster, investigate |

### Response Procedure

```
INCIDENT RESPONSE PROCEDURE

1. DETECT
   - Alert from SIEM (unusual patterns)
   - User report
   - Anomaly detection

2. TRIAGE
   - Assess scope and impact
   - Determine severity level
   - Notify incident commander

3. CONTAIN
   - Isolate affected components
   - Revoke compromised credentials
   - Block malicious IPs

4. ERADICATE
   - Remove threat actor access
   - Patch vulnerabilities
   - Rotate all affected credentials

5. RECOVER
   - Restore from known-good state
   - Verify system integrity
   - Gradual service restoration

6. LEARN
   - Root cause analysis
   - Update detection rules
   - Improve procedures
```
