# Secret Management System - High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Clients"]
        App[Applications]
        CI[CI/CD Pipelines]
        Human[Human Operators]
        K8s[Kubernetes Workloads]
    end

    subgraph Gateway["API Layer"]
        LB[Load Balancer]
        API[API Server]
        RL[Rate Limiter]
    end

    subgraph Core["Core Services"]
        Auth[Auth Methods]
        Policy[Policy Engine]
        Token[Token Store]
        Lease[Lease Manager]
    end

    subgraph Engines["Secret Engines"]
        KV[KV Engine]
        DB[Database Engine]
        PKI[PKI Engine]
        Transit[Transit Engine]
        Cloud[Cloud IAM Engine]
    end

    subgraph Security["Security Layer"]
        Barrier[Cryptographic Barrier]
        Seal[Seal Manager]
        HSM[HSM / Cloud KMS]
    end

    subgraph Storage["Storage Layer"]
        Raft[Raft Consensus]
        Store[(Encrypted Storage)]
        Audit[(Audit Logs)]
    end

    subgraph External["External Systems"]
        OIDC[OIDC Provider]
        LDAP[LDAP/AD]
        MySQL[(MySQL)]
        PG[(PostgreSQL)]
        AWS[AWS IAM]
    end

    App --> LB
    CI --> LB
    Human --> LB
    K8s --> LB

    LB --> API
    API --> RL
    RL --> Auth

    Auth --> OIDC
    Auth --> LDAP
    Auth --> Token

    Token --> Policy
    Policy --> Engines

    KV --> Barrier
    DB --> Barrier
    DB --> MySQL
    DB --> PG
    PKI --> Barrier
    Transit --> Barrier
    Cloud --> AWS

    Barrier --> Seal
    Seal --> HSM
    Barrier --> Raft
    Raft --> Store

    API --> Audit
    Lease --> Raft
```

---

## Component Responsibilities

### API Layer

| Component | Responsibility | Implementation |
|-----------|---------------|----------------|
| **Load Balancer** | Distribute traffic across nodes; health checks | L7 LB with sticky sessions for writes |
| **API Server** | HTTP/gRPC interface; request routing | RESTful API with versioning (/v1/) |
| **Rate Limiter** | Prevent DoS; tenant quotas | Token bucket per client/path |

### Core Services

| Component | Responsibility | Criticality |
|-----------|---------------|-------------|
| **Auth Methods** | Verify client identity from various sources | Critical - gates all access |
| **Policy Engine** | Evaluate ACL rules against request path and capabilities | Critical - authorization enforcement |
| **Token Store** | Manage authentication tokens, track usage | Critical - session management |
| **Lease Manager** | Track dynamic secret TTLs, trigger renewals and revocations | Critical - secret lifecycle |

### Secret Engines

| Engine | Function | Output |
|--------|----------|--------|
| **KV v2** | Store versioned key-value secrets | Secret data + metadata |
| **Database** | Generate dynamic DB credentials | Username/password with TTL |
| **PKI** | Issue X.509 certificates | Certificate + private key |
| **Transit** | Encrypt/decrypt without key exposure | Ciphertext or plaintext |
| **Cloud IAM** | Generate cloud provider credentials | Temporary STS tokens |

### Security Layer

| Component | Responsibility | Protection |
|-----------|---------------|------------|
| **Cryptographic Barrier** | Encrypt/decrypt all persistent data | Zero-knowledge guarantee |
| **Seal Manager** | Protect master key; control access to barrier | Shamir's or auto-unseal |
| **HSM Integration** | Hardware protection for root key | FIPS 140-2 Level 3 |

### Storage Layer

| Component | Responsibility | Characteristics |
|-----------|---------------|-----------------|
| **Raft Consensus** | Distributed consensus for HA | 3-5 nodes, leader election |
| **Encrypted Storage** | Persist encrypted secrets and metadata | All data encrypted at rest |
| **Audit Logs** | Immutable operation history | Tamper-evident, HMAC protected |

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as API Server
    participant Auth as Auth Method
    participant IdP as Identity Provider
    participant Policy as Policy Engine
    participant Token as Token Store

    Client->>API: POST /v1/auth/oidc/login
    API->>Auth: Validate credentials
    Auth->>IdP: Verify with external IdP
    IdP-->>Auth: Identity confirmed + claims
    Auth->>Policy: Get policies for identity
    Policy-->>Auth: Attached policies
    Auth->>Token: Create token with policies
    Token-->>Auth: Token + accessor
    Auth-->>API: Login response
    API-->>Client: Token + lease_duration

    Note over Client: Client stores token for subsequent requests

    Client->>API: GET /v1/secret/data/myapp (Token in header)
    API->>Token: Validate token
    Token-->>API: Token valid + policies
    API->>Policy: Evaluate: can read secret/data/myapp?
    Policy-->>API: Allowed
    API-->>Client: Secret data
```

---

## Secret Read Path

```mermaid
sequenceDiagram
    participant Client
    participant API as API Server
    participant Policy as Policy Engine
    participant KV as KV Engine
    participant Barrier as Crypto Barrier
    participant Store as Storage

    Client->>API: GET /v1/secret/data/myapp/config
    API->>Policy: Check read capability
    Policy-->>API: Allowed
    API->>KV: Read path myapp/config
    KV->>Barrier: Decrypt request
    Barrier->>Store: Fetch encrypted data
    Store-->>Barrier: Encrypted blob
    Barrier-->>KV: Decrypted secret
    KV-->>API: Secret + metadata + version
    API-->>Client: Response with lease_id
```

---

## Dynamic Secret Generation Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as API Server
    participant DB as Database Engine
    participant Lease as Lease Manager
    participant MySQL as MySQL Database
    participant Store as Storage

    Client->>API: GET /v1/database/creds/myapp-role
    API->>DB: Generate credentials for role
    DB->>Store: Fetch role configuration
    Store-->>DB: Role config (creation SQL, TTL)
    DB->>MySQL: CREATE USER 'v-myapp-xyz' WITH PASSWORD
    MySQL-->>DB: User created
    DB->>Lease: Create lease for credential
    Lease->>Store: Persist lease
    Store-->>Lease: Lease stored
    Lease-->>DB: lease_id
    DB-->>API: Credentials + lease_id + ttl
    API-->>Client: {username, password, lease_id, lease_duration}

    Note over Lease: When TTL expires...

    Lease->>DB: Revoke lease abc123
    DB->>MySQL: DROP USER 'v-myapp-xyz'
    MySQL-->>DB: User dropped
    DB-->>Lease: Revocation complete
```

---

## Key Architectural Decisions

### 1. Seal Mechanism: Shamir vs Auto-Unseal

| Factor | Shamir's Secret Sharing | Cloud KMS Auto-Unseal |
|--------|------------------------|----------------------|
| **Security** | No external dependency; highest assurance | Depends on cloud provider security |
| **Operations** | Requires human operators for unseal | Automatic recovery after restart |
| **Cold Start** | Manual intervention required | Automatic within seconds |
| **Compliance** | Preferred for air-gapped, FedRAMP | Acceptable for most enterprise |
| **Disaster Recovery** | Unseal keys must be distributed | KMS key must be available |

**Recommendation**: Use Cloud KMS Auto-Unseal for production automation with Shamir as backup for DR scenarios.

### 2. Storage Backend: Integrated (Raft) vs External (Consul)

| Factor | Integrated Storage (Raft) | External (Consul) |
|--------|--------------------------|-------------------|
| **Operational Complexity** | Single system to manage | Separate Consul cluster |
| **Performance** | Optimized for Vault workload | Additional network hop |
| **HA** | Built-in leader election | Consul provides HA |
| **Snapshot/Restore** | Native Raft snapshots | Consul snapshot |
| **Scalability** | 5-node practical limit | Scales with Consul |

**Recommendation**: Use Integrated Storage (Raft) for new deployments; simpler operations with sufficient performance.

### 3. Secret Types: Static vs Dynamic

| Factor | Static Secrets | Dynamic Secrets |
|--------|---------------|-----------------|
| **Complexity** | Simple CRUD | Lease management required |
| **Security** | Long-lived, shared | Short-lived, unique per request |
| **Rotation Burden** | Manual or scheduled | Automatic on expiry |
| **Blast Radius** | Wide if leaked | Limited to single consumer |
| **Use Case** | API keys, config | DB passwords, cloud creds |

**Recommendation**: Prefer dynamic secrets for databases and cloud access; use static for truly static values (API keys from vendors).

### 4. Certificate Lifecycle: Long-Lived vs Short-Lived

| Factor | Long-Lived (months/years) | Short-Lived (hours/days) |
|--------|--------------------------|-------------------------|
| **Revocation** | CRL/OCSP infrastructure required | Natural expiration |
| **Operational Load** | Lower issuance frequency | Higher issuance frequency |
| **Security** | Revocation may not propagate | Automatic protection |
| **Use Case** | External TLS, user certs | Service mesh, mTLS |

**Recommendation**: Short-lived certificates (24h or less) for internal services; longer-lived for external-facing with proper revocation infrastructure.

---

## Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---------|----------|---------------|
| **Sync vs Async** | Synchronous for reads/writes; async for audit | Secrets need immediate consistency |
| **Push vs Pull** | Pull model (clients request secrets) | Clients control when to fetch; simpler security model |
| **Stateless vs Stateful** | Stateful (leader for writes) | Raft consensus requires leader |
| **Read vs Write optimization** | Read-optimized with write-through | 1000:1 read-to-write ratio |
| **Encryption** | Encrypt at rest and in transit | Zero-knowledge architecture |
| **Multi-tenancy** | Namespace isolation | Separate encryption contexts per tenant |

---

## Data Flow Summary

### Write Path (Strong Consistency)

```
Client → API → Auth → Policy (check write) → Engine → Barrier (encrypt) → Raft (consensus) → Storage
                                                                              ↓
                                                              Replicate to followers
```

### Read Path (Optimized)

```
Client → API → Auth → Policy (cached check) → Engine → Barrier (decrypt) → Storage (or cache)
```

### Audit Path (Synchronous)

```
Every operation → Audit Logger → Multiple backends (file, syslog, socket)
                                        ↓
                              If all backends fail → Block operation
```

---

## Integration Points

### Inbound Integrations

| System | Integration Type | Purpose |
|--------|-----------------|---------|
| OIDC Provider | Auth method | Human user authentication |
| LDAP/AD | Auth method | Enterprise directory auth |
| Kubernetes | Auth method | Workload authentication |
| CI/CD (Jenkins, GitHub Actions) | AppRole auth | Pipeline secret access |

### Outbound Integrations

| System | Integration Type | Purpose |
|--------|-----------------|---------|
| MySQL/PostgreSQL | Database engine | Dynamic credential generation |
| AWS/GCP/Azure | Cloud engine | Temporary cloud credentials |
| SIEM (Splunk, Elastic) | Audit export | Security monitoring |
| HSM | Seal mechanism | Hardware key protection |

---

## Deployment Topology

```mermaid
flowchart TB
    subgraph Region1["Region 1 (Primary)"]
        subgraph Cluster1["Vault Cluster"]
            V1[Vault Leader]
            V2[Vault Follower]
            V3[Vault Follower]
        end
        LB1[Load Balancer]
        LB1 --> V1
        LB1 --> V2
        LB1 --> V3
    end

    subgraph Region2["Region 2 (DR)"]
        subgraph Cluster2["DR Cluster"]
            V4[Vault Standby]
            V5[Vault Standby]
            V6[Vault Standby]
        end
        LB2[Load Balancer]
        LB2 --> V4
        LB2 --> V5
        LB2 --> V6
    end

    subgraph Region3["Region 3 (Performance)"]
        subgraph Cluster3["Perf Replica"]
            V7[Vault Perf Leader]
            V8[Vault Perf Follower]
        end
        LB3[Load Balancer]
        LB3 --> V7
        LB3 --> V8
    end

    V1 -.->|DR Replication| V4
    V1 -.->|Perf Replication| V7

    DNS[Global DNS] --> LB1
    DNS --> LB2
    DNS --> LB3
```

---

## Failure Scenarios and Handling

| Scenario | Detection | Response | Recovery |
|----------|-----------|----------|----------|
| **Single node failure** | Health check timeout | Traffic routed to other nodes | Replace node, rejoin cluster |
| **Leader failure** | Raft heartbeat timeout | Automatic leader election | New leader in ~10 seconds |
| **Network partition** | Split-brain detection | Minority partition becomes read-only | Heal partition, reconcile |
| **Seal triggered** | Seal status API | All operations blocked | Unseal with keys or auto-unseal |
| **Storage corruption** | Consistency checks | Restore from snapshot | Raft snapshot restore |
| **Region failure** | Cross-region health check | Promote DR cluster | DR promotion procedure |
