# Security & Compliance — NewSQL Database

## Authentication & Authorization

### Authentication Mechanisms

| Mechanism | Use Case | Implementation |
|-----------|----------|---------------|
| Username/Password | Human users, admin access | Scram-SHA-256 hashed credentials in system tables |
| Certificate-based (mTLS) | Service-to-service, inter-node | X.509 certificates with automatic rotation |
| OAuth 2.0 / OIDC | Application clients, SSO integration | JWT validation against external identity provider |
| LDAP / Active Directory | Enterprise directory integration | Delegated authentication to corporate IdP |
| Kerberos / GSSAPI | Enterprise environments | SPNEGO negotiation for transparent authentication |

### Authorization Model: SQL-Native RBAC

NewSQL databases use standard SQL GRANT/REVOKE semantics extended to distributed objects:

**Level 1: Cluster-Level Roles**

| Role | Permissions |
|------|------------|
| Admin | Full access: node management, zone configuration, user management |
| DBA | Database creation/deletion, backup/restore, schema changes |
| Developer | Read/write data, create indexes, view query plans |
| Read-only | SELECT on granted tables/views only |
| Monitoring | View cluster metrics, query statistics, range distribution |

**Level 2: Database and Table Grants**

```
-- Grant read access to specific tables
GRANT SELECT ON TABLE orders, accounts TO analyst_role;

-- Grant write access with column restrictions
GRANT INSERT, UPDATE (status, updated_at) ON TABLE orders TO service_role;

-- Revoke delete to prevent accidental data loss
REVOKE DELETE ON TABLE orders FROM service_role;

-- Grant schema change privileges to DBA
GRANT CREATE, ALTER, DROP ON DATABASE production TO dba_role;
```

**Level 3: Row-Level Security (RLS)**

```
-- Multi-tenant isolation: each tenant sees only their rows
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::INT);

-- Regional compliance: users see only their region's data
CREATE POLICY region_filter ON customers
  USING (region = current_setting('app.user_region'));
```

### Token Management

| Token Type | Lifetime | Refresh | Storage |
|-----------|----------|---------|---------|
| Session token | 1 hour | Via re-authentication | Server-side session table |
| JWT (OIDC) | 15 minutes | Via refresh token from IdP | Client-side |
| API key | 90 days | Manual rotation | Encrypted in system catalog |
| Node certificate | 1 year | Auto-rotation 30 days before expiry | On-disk, managed by cert manager |
| Inter-node auth token | 24 hours | Automatic via gossip protocol | In-memory |

---

## Data Security

### Encryption at Rest

| Component | Encryption | Key Management |
|-----------|-----------|----------------|
| LSM-tree SST files | AES-256-CTR | Per-store key, wrapped by a master key in external KMS |
| WAL | AES-256-CTR | Same store key as SST files |
| Raft log | AES-256-CTR | Same store key (persisted as WAL entries) |
| System catalog | AES-256-CTR | Separate system key |
| Backups | AES-256-GCM | Dedicated backup key in KMS |
| Temporary sort/join files | AES-256-CTR | Ephemeral key, destroyed on cleanup |

**Key hierarchy:**

```
External KMS (master key)
  └── Store encryption key (per-node, wrapped by master key)
        ├── SST file encryption (data at rest)
        ├── WAL encryption (crash recovery data)
        └── Raft log encryption (replication data)
```

### Encryption in Transit

| Connection | Protocol | Minimum Version |
|-----------|----------|----------------|
| Client → SQL gateway | TLS 1.3 | Required in production |
| SQL gateway → KV storage (intra-cluster) | mTLS | Required |
| Node → Node (Raft replication) | mTLS | Required |
| Node → Object storage (backup) | TLS 1.3 | Required |
| Admin console → cluster | TLS 1.3 | Required |

### PII Handling

| Data Category | Classification | Handling |
|--------------|---------------|---------|
| User data (name, email) | PII | Column-level encryption, row-level security |
| Financial data (balances, transactions) | Sensitive | Encryption at rest, audit logging on access |
| Query logs | May contain PII | Parameter redaction; log only query templates |
| Backup data | Contains all PII | Encrypted backups with separate key management |
| Raft log entries | Contains mutations | Encrypted in transit and at rest |

### Data Masking / Anonymization

| Technique | When Used |
|-----------|-----------|
| Column-level encryption | Encrypt specific sensitive columns (SSN, credit card) with application-managed keys |
| Dynamic data masking | Non-privileged roles see masked values (e.g., `****1234` for credit cards) |
| Query parameter redaction | Strip literal values from slow query logs, replacing with `$1`, `$2` placeholders |
| Anonymized exports | Replace identifiers with hash-based pseudonyms for analytics exports |

---

## Threat Model

### Top 5 Attack Vectors

#### 1. SQL Injection

**Threat:** Application constructs SQL queries by concatenating user input, allowing an attacker to inject malicious SQL (e.g., `'; DROP TABLE orders; --`).

**Impact:** Data exfiltration, data destruction, privilege escalation.

**Mitigation:**
- Parameterized queries enforced at the wire protocol level (prepared statements)
- SQL parser rejects multi-statement execution unless explicitly enabled
- Least-privilege roles: service accounts cannot execute DDL
- Query audit logging for anomaly detection

#### 2. Privilege Escalation via Cross-Tenant Access

**Threat:** In a multi-tenant deployment, a compromised tenant application accesses another tenant's data by bypassing row-level security.

**Impact:** Data breach across tenant boundaries.

**Mitigation:**
- Row-level security policies enforced at the SQL execution layer (not bypassable by raw KV access)
- Separate database or schema per tenant as defense-in-depth
- Regular audit of RLS policy correctness
- Tenant-scoped connection credentials that cannot override `tenant_id`

#### 3. Raft Log Replay Attack

**Threat:** An attacker with access to a node's disk captures Raft log entries and replays them on a rogue node to extract data.

**Impact:** Data exfiltration from replayed Raft entries.

**Mitigation:**
- Raft log encrypted at rest with per-node keys
- Raft group membership requires mutual TLS authentication — rogue nodes cannot join
- Raft log entries include epoch and term — stale entries are rejected
- Physical disk access requires OS-level security controls

#### 4. Denial of Service via Expensive Queries

**Threat:** A malicious or poorly written query scans the entire keyspace, consuming CPU, memory, and I/O across all nodes.

**Impact:** Cluster-wide performance degradation.

**Mitigation:**
- Statement timeout (default 30 seconds, configurable per session)
- Memory budget per query (default 256 MB, configurable)
- Admission control: limit concurrent full-table scans
- Cost-based query rejection: optimizer rejects queries with estimated cost above threshold
- Per-client rate limiting on QPS and bytes scanned

#### 5. Clock Manipulation Attack

**Threat:** An attacker manipulates the NTP source for a node, skewing its clock. This causes the node to assign incorrect timestamps, potentially allowing stale reads to appear fresh or creating transaction ordering anomalies.

**Impact:** Violation of serializable isolation guarantees.

**Mitigation:**
- Nodes monitor clock offset against cluster peers; self-quarantine if offset exceeds `max_clock_offset`
- Multiple independent NTP sources with cross-validation
- HLC protocol absorbs clock jumps without violating causal ordering
- Raft leader lease includes clock-bound checks

### Rate Limiting & DDoS Protection

| Layer | Mechanism |
|-------|-----------|
| Network | Connection rate limiting per IP |
| Transport | TLS handshake rate limiting |
| Application | Per-user/role QPS limits (token bucket) |
| Query | Admission control based on estimated query cost |
| Storage | Per-range write rate limiting to prevent Raft overload |

---

## Compliance

### GDPR Considerations

| Requirement | Implementation |
|------------|---------------|
| Right to be forgotten | DELETE from all tables + MVCC garbage collection ensures versions are purged after GC window |
| Data portability | Export user data via standard SQL SELECT with structured output (CSV, JSON) |
| Consent management | Application-level consent tracking in a dedicated table with audit trail |
| Data minimization | Column-level encryption + row-level TTL for automatic data expiration |
| Processing records | Query audit log tracks all access to PII-tagged tables |

### SOC 2 Considerations

| Control | Implementation |
|---------|---------------|
| Access control | SQL RBAC with row-level security, certificate-based inter-node auth |
| Audit logging | Immutable audit log of all DDL, DML on sensitive tables, and admin operations |
| Encryption | At-rest (AES-256) and in-transit (TLS 1.3/mTLS) |
| Availability | 99.999% SLA with automatic failover and multi-AZ replication |
| Change management | Online schema changes with version tracking in system catalog |

### HIPAA Considerations

| Requirement | Implementation |
|------------|---------------|
| Access controls | Role-based access to PHI columns with audit logging |
| Encryption | Column-level encryption for PHI fields, encryption at rest for all data |
| Audit trail | Complete audit log of all access to tables containing PHI |
| Data integrity | ACID transactions prevent partial updates to health records |
| Disaster recovery | Cross-region replication with RPO=0, automated backup verification |
