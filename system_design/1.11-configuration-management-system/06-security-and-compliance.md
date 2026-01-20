# Security & Compliance

[← Back to Index](./00-index.md)

---

## Authentication

### mTLS for Client-Server Communication

```
┌─────────────────────────────────────────────────────────────────────┐
│  MUTUAL TLS (mTLS)                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Both client and server authenticate each other:                    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Client                           Server                      │   │
│  │  ┌───────────┐                   ┌───────────┐               │   │
│  │  │ Client    │──1. ClientHello──►│ Server    │               │   │
│  │  │ Cert      │◄─2. ServerHello───│ Cert      │               │   │
│  │  │           │  + ServerCert     │           │               │   │
│  │  │           │  + CertRequest    │           │               │   │
│  │  │           │──3. ClientCert───►│           │               │   │
│  │  │           │  + KeyExchange    │           │               │   │
│  │  │           │◄─4. Verify────────│           │               │   │
│  │  │           │──5. Finished─────►│           │               │   │
│  │  │           │◄─6. Finished──────│           │               │   │
│  │  └───────────┘                   └───────────┘               │   │
│  │                                                               │   │
│  │  Encrypted Connection Established                             │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Certificate Requirements:                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Server certificate:                                          │   │
│  │  • CN or SAN must match server hostname                      │   │
│  │  • Signed by trusted CA                                      │   │
│  │  • Key usage: Server authentication                          │   │
│  │                                                               │   │
│  │  Client certificate:                                          │   │
│  │  • CN identifies the client (e.g., service name)             │   │
│  │  • Signed by trusted CA                                      │   │
│  │  • Key usage: Client authentication                          │   │
│  │  • Used for both authentication AND authorization            │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Token-Based Authentication

```
┌─────────────────────────────────────────────────────────────────────┐
│  TOKEN AUTHENTICATION                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  etcd Token Types:                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  1. Simple Token:                                             │   │
│  │     Authorization: Basic base64(user:password)               │   │
│  │     • Simple but less secure                                 │   │
│  │     • Password sent with each request                        │   │
│  │                                                               │   │
│  │  2. JWT Token:                                                │   │
│  │     Authorization: Bearer eyJhbGciOiJIUzI1NiIs...            │   │
│  │     • Short-lived tokens                                     │   │
│  │     • Contains user claims                                   │   │
│  │     • Validated without database lookup                      │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Consul Token (ACL):                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  X-Consul-Token: 0bc6bc46-f25e-4262-b2d9-ffbe1d96be6f       │   │
│  │                                                               │   │
│  │  Token properties:                                            │   │
│  │  • SecretID: Unique identifier (UUID)                        │   │
│  │  • Policies: List of attached ACL policies                   │   │
│  │  • Roles: Indirect policy attachment                         │   │
│  │  • Expiration: Optional TTL                                  │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Certificate Rotation

```
┌─────────────────────────────────────────────────────────────────────┐
│  CERTIFICATE ROTATION                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Automated Rotation Process:                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  1. Monitor certificate expiry (e.g., 30 days before)        │   │
│  │                                                               │   │
│  │  2. Generate new certificate from CA:                        │   │
│  │     • New key pair                                           │   │
│  │     • Same CN/SAN                                            │   │
│  │     • Extended validity period                               │   │
│  │                                                               │   │
│  │  3. Deploy new certificate:                                   │   │
│  │     • Rolling update of config servers                       │   │
│  │     • No downtime (one node at a time)                       │   │
│  │                                                               │   │
│  │  4. Update clients:                                           │   │
│  │     • Push new CA bundle if CA changed                       │   │
│  │     • Client certificates rotated similarly                  │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Zero-Downtime Rotation:                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  T=0: Old cert valid, new cert not yet deployed              │   │
│  │                                                               │   │
│  │  T=1: Deploy new cert alongside old cert                     │   │
│  │       Server accepts both old and new                        │   │
│  │                                                               │   │
│  │  T=2: Update clients to use new cert                         │   │
│  │       Gradual rollout                                        │   │
│  │                                                               │   │
│  │  T=3: Remove old cert from servers                           │   │
│  │       All clients using new cert                             │   │
│  │                                                               │   │
│  │  T=4: Old cert expires (no impact)                           │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Authorization

### ACL Model (Path-Based Permissions)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ACCESS CONTROL LIST (ACL)                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  etcd RBAC Model:                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Role: payment-service-role                                  │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │  Permission 1:                                       │    │   │
│  │  │    Key: /config/payment/*                           │    │   │
│  │  │    Type: READWRITE                                  │    │   │
│  │  │                                                      │    │   │
│  │  │  Permission 2:                                       │    │   │
│  │  │    Key: /config/shared/*                            │    │   │
│  │  │    Type: READ                                       │    │   │
│  │  │                                                      │    │   │
│  │  │  Permission 3:                                       │    │   │
│  │  │    Key: /locks/payment/*                            │    │   │
│  │  │    Type: READWRITE                                  │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  │  User: payment-service                                       │   │
│  │  Roles: [payment-service-role]                               │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Permission Types:                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  READ:       Get, Range queries                              │   │
│  │  WRITE:      Put, Delete                                     │   │
│  │  READWRITE:  Both read and write                             │   │
│  │                                                               │   │
│  │  Special permissions (etcd):                                 │   │
│  │  • Cluster admin (add/remove members)                        │   │
│  │  • Auth management (create users/roles)                      │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────────────────────────┐
│  RBAC HIERARCHY                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Users/Services                                               │   │
│  │       │                                                       │   │
│  │       ▼                                                       │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │              Roles                                   │    │   │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │    │   │
│  │  │  │ admin      │  │ developer  │  │ service    │    │    │   │
│  │  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘    │    │   │
│  │  └────────┼───────────────┼───────────────┼──────────┘    │   │
│  │           │               │               │                │   │
│  │           ▼               ▼               ▼                │   │
│  │  ┌─────────────────────────────────────────────────────┐  │   │
│  │  │              Policies/Permissions                    │  │   │
│  │  │                                                      │  │   │
│  │  │  admin:      /config/* (RW), /admin/* (RW)          │  │   │
│  │  │  developer:  /config/dev/* (RW), /config/prod/* (R) │  │   │
│  │  │  service:    /config/{service}/* (RW)               │  │   │
│  │  │                                                      │  │   │
│  │  └─────────────────────────────────────────────────────┘  │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Consul ACL Example:                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  policy "payment-service" {                                  │   │
│  │    key_prefix "config/payment/" {                           │   │
│  │      policy = "write"                                        │   │
│  │    }                                                          │   │
│  │    key_prefix "config/shared/" {                            │   │
│  │      policy = "read"                                         │   │
│  │    }                                                          │   │
│  │    session_prefix "" {                                       │   │
│  │      policy = "write"   # Can create sessions               │   │
│  │    }                                                          │   │
│  │  }                                                            │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Namespace Isolation

```
┌─────────────────────────────────────────────────────────────────────┐
│  NAMESPACE ISOLATION                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Multi-Tenant Isolation via Key Prefixes:                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  /tenant-a/config/...   ← Tenant A's config                 │   │
│  │  /tenant-a/locks/...    ← Tenant A's locks                  │   │
│  │                                                               │   │
│  │  /tenant-b/config/...   ← Tenant B's config                 │   │
│  │  /tenant-b/locks/...    ← Tenant B's locks                  │   │
│  │                                                               │   │
│  │  /shared/...            ← Shared across tenants              │   │
│  │                                                               │   │
│  │  ACL enforcement:                                             │   │
│  │  • Tenant A token can only access /tenant-a/*                │   │
│  │  • No cross-tenant access possible                           │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Consul Namespace (Enterprise):                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Namespace: team-payments                                    │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │  KV: config/...   (isolated)                         │    │   │
│  │  │  Services: payment-api, payment-worker               │    │   │
│  │  │  Policies: team-specific                             │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  │  Namespace: team-orders                                      │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │  KV: config/...   (isolated)                         │    │   │
│  │  │  Services: order-api, order-processor                │    │   │
│  │  │  Policies: team-specific                             │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Security

### Encryption at Rest

```
┌─────────────────────────────────────────────────────────────────────┐
│  ENCRYPTION AT REST                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Options:                                                            │
│                                                                      │
│  1. Disk-Level Encryption:                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  • LUKS (Linux), BitLocker (Windows)                         │   │
│  │  • Transparent to application                                │   │
│  │  • Protects against physical theft                           │   │
│  │  • Does NOT protect against compromised server               │   │
│  │                                                               │   │
│  │  Implementation: OS/cloud provider level                     │   │
│  │  Key management: TPM, KMS                                    │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  2. Application-Level Encryption (Client-Side):                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Client encrypts value before storing:                       │   │
│  │  PUT /config/secrets/db-password                             │   │
│  │  Value: AES-256-GCM(actual_password, key)                   │   │
│  │                                                               │   │
│  │  Pros: Config server never sees plaintext                   │   │
│  │  Cons: Client must manage encryption keys                    │   │
│  │        Cannot query/search encrypted values                  │   │
│  │                                                               │   │
│  │  Key management: Vault, AWS KMS, client-side keyring        │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  3. Server-Side Encryption (etcd example):                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Not natively supported by etcd                              │   │
│  │  Kubernetes encrypts secrets before storing in etcd:         │   │
│  │                                                               │   │
│  │  apiVersion: apiserver.config.k8s.io/v1                      │   │
│  │  kind: EncryptionConfiguration                               │   │
│  │  resources:                                                   │   │
│  │    - resources: [secrets]                                    │   │
│  │      providers:                                               │   │
│  │        - aescbc:                                              │   │
│  │            keys:                                              │   │
│  │              - name: key1                                     │   │
│  │                secret: <base64-encoded-key>                  │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Encryption in Transit (TLS)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ENCRYPTION IN TRANSIT                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TLS Configuration:                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Client → Server (Client TLS):                               │   │
│  │  --cert-file=client.crt                                      │   │
│  │  --key-file=client.key                                       │   │
│  │  --cacert=ca.crt                                             │   │
│  │                                                               │   │
│  │  Server → Server (Peer TLS):                                 │   │
│  │  --peer-cert-file=peer.crt                                   │   │
│  │  --peer-key-file=peer.key                                    │   │
│  │  --peer-trusted-ca-file=ca.crt                               │   │
│  │                                                               │   │
│  │  Minimum TLS version: 1.2 (recommend 1.3)                    │   │
│  │  Cipher suites: ECDHE-RSA-AES256-GCM-SHA384 (or better)     │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Traffic Flow:                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Client ════TLS════► Config Server (port 2379)              │   │
│  │                                                               │   │
│  │  Config Server ════TLS════► Peer Server (port 2380)         │   │
│  │                                                               │   │
│  │  All traffic encrypted:                                       │   │
│  │  • Client requests/responses                                 │   │
│  │  • Raft replication                                          │   │
│  │  • Snapshot transfers                                         │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Audit Logging

```
┌─────────────────────────────────────────────────────────────────────┐
│  AUDIT LOGGING                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  What to Log:                                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Authentication Events:                                       │   │
│  │  • Login attempts (success/failure)                          │   │
│  │  • Token/certificate validation                              │   │
│  │  • Session creation/expiry                                   │   │
│  │                                                               │   │
│  │  Authorization Events:                                        │   │
│  │  • Permission checks (allowed/denied)                        │   │
│  │  • ACL changes                                                │   │
│  │                                                               │   │
│  │  Data Access:                                                 │   │
│  │  • Key reads (optionally, can be noisy)                      │   │
│  │  • Key writes (always)                                       │   │
│  │  • Key deletes (always)                                      │   │
│  │  • Watch subscriptions                                        │   │
│  │                                                               │   │
│  │  Administrative:                                              │   │
│  │  • User/role management                                      │   │
│  │  • Cluster membership changes                                │   │
│  │  • Configuration changes                                      │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Audit Log Entry Example:                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  {                                                            │   │
│  │    "timestamp": "2025-01-20T10:30:45.123Z",                  │   │
│  │    "event_type": "KEY_WRITE",                                │   │
│  │    "user": "payment-service",                                │   │
│  │    "client_ip": "10.0.1.50",                                 │   │
│  │    "key": "/config/payment/rate-limit",                      │   │
│  │    "operation": "PUT",                                        │   │
│  │    "result": "SUCCESS",                                       │   │
│  │    "revision": 12345,                                         │   │
│  │    "latency_ms": 5                                           │   │
│  │  }                                                            │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Log Storage and Retention:                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  • Ship to SIEM (Splunk, Elasticsearch)                     │   │
│  │  • Immutable storage (write-once)                            │   │
│  │  • Retention: 90 days - 7 years (compliance dependent)       │   │
│  │  • Access restricted to security team                        │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Threat Model

### Threat 1: Unauthorized Access to Sensitive Config

```
┌─────────────────────────────────────────────────────────────────────┐
│  THREAT: Unauthorized Config Access                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Attack Vector:                                                      │
│  • Compromised service reads other services' config                 │
│  • Leaked credentials used to access sensitive data                 │
│  • Insider threat accessing production config                       │
│                                                                      │
│  Impact:                                                             │
│  • Exposure of database credentials                                 │
│  • API keys leaked                                                   │
│  • Business logic/feature flags exposed                             │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Mitigations:                                                        │
│                                                                      │
│  1. Principle of Least Privilege:                                   │
│     • Each service only accesses its own config                     │
│     • Read-only access by default                                   │
│     • Explicit grants for write access                              │
│                                                                      │
│  2. Separate Sensitive Config:                                       │
│     • Store secrets in dedicated secret manager (Vault)             │
│     • Config system stores references, not secrets                  │
│                                                                      │
│  3. Short-Lived Credentials:                                         │
│     • Tokens expire quickly (1 hour)                                │
│     • Certificate rotation                                          │
│     • Dynamic secrets when possible                                  │
│                                                                      │
│  4. Network Segmentation:                                            │
│     • Config servers in private subnet                              │
│     • Access only from known CIDRs                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Threat 2: Denial of Service on Coordination Layer

```
┌─────────────────────────────────────────────────────────────────────┐
│  THREAT: Config Server DoS                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Attack Vector:                                                      │
│  • Excessive read/write requests                                    │
│  • Watch storm (subscribing to many keys)                           │
│  • Large value writes consuming disk                                │
│  • Targeted leader to disrupt writes                                │
│                                                                      │
│  Impact:                                                             │
│  • All services lose config updates                                 │
│  • Leader election thrashing                                        │
│  • Cascading failures across infrastructure                         │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Mitigations:                                                        │
│                                                                      │
│  1. Rate Limiting:                                                   │
│     • Per-client request limits                                     │
│     • Burst allowance with sustained rate cap                       │
│     • Separate limits for reads/writes/watches                      │
│                                                                      │
│  2. Resource Quotas:                                                 │
│     • Max watches per connection: 1,000                             │
│     • Max value size: 1 MB                                          │
│     • Max keys per prefix: 10,000                                   │
│                                                                      │
│  3. Client Backpressure:                                             │
│     • Return 429 Too Many Requests                                  │
│     • Clients implement exponential backoff                         │
│                                                                      │
│  4. Cluster Protection:                                              │
│     • Multiple read replicas                                        │
│     • Client-side caching reduces load                              │
│     • Geographic distribution                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Threat 3: Configuration Tampering

```
┌─────────────────────────────────────────────────────────────────────┐
│  THREAT: Config Tampering                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Attack Vector:                                                      │
│  • Malicious config injection via compromised pipeline             │
│  • Unauthorized modification of rate limits, feature flags         │
│  • Changing service endpoints to malicious destinations            │
│                                                                      │
│  Impact:                                                             │
│  • Service disruption (bad config)                                  │
│  • Data exfiltration (redirected traffic)                          │
│  • Privilege escalation (modified permissions)                      │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Mitigations:                                                        │
│                                                                      │
│  1. Write Authorization:                                             │
│     • Only CI/CD pipelines can write production config             │
│     • Human approval required for critical changes                  │
│     • Service accounts cannot write their own config                │
│                                                                      │
│  2. Change Tracking:                                                 │
│     • All writes logged with user/source                            │
│     • Config versioning (can see history)                           │
│     • Alerting on unexpected changes                                │
│                                                                      │
│  3. Validation:                                                      │
│     • Schema validation before write                                │
│     • Policy checks (OPA) for allowed values                        │
│     • Canary deployment of config changes                           │
│                                                                      │
│  4. Rollback Capability:                                             │
│     • Quick revert to known-good config                             │
│     • Automated rollback on error metrics                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Compliance Considerations

| Requirement | How Config Management Helps | Implementation |
|-------------|----------------------------|----------------|
| **SOC 2 - Access Control** | Authentication, authorization, audit logs | mTLS, RBAC, audit logging |
| **HIPAA - Audit Trail** | Track all access to health data config | Detailed audit logging |
| **GDPR - Data Protection** | Encryption of PII-related config | Encryption at rest/transit |
| **PCI DSS - Network Security** | Secure transmission of payment config | TLS 1.2+, network segmentation |
| **FedRAMP - Authentication** | Strong authentication for federal systems | mTLS, MFA for admin access |

---

## Security Best Practices Summary

| Area | Best Practice | Priority |
|------|--------------|----------|
| **Authentication** | Enable mTLS for all connections | P0 |
| **Authorization** | Implement least-privilege ACLs | P0 |
| **Encryption** | TLS 1.2+ for all traffic | P0 |
| **Secrets** | Use dedicated secret manager, not config store | P0 |
| **Audit** | Log all writes and auth events | P1 |
| **Certificates** | Automate rotation, short validity | P1 |
| **Network** | Private subnet, restricted access | P1 |
| **Backups** | Encrypt backup snapshots | P1 |
| **Monitoring** | Alert on auth failures, ACL changes | P1 |
