# Security & Compliance — Graph Database

## Authentication & Authorization

### Authentication Mechanisms

| Mechanism | Use Case | Implementation |
|-----------|----------|---------------|
| Username/Password | Human users, admin access | Bcrypt-hashed credentials in internal auth store |
| OAuth 2.0 / OIDC | Application clients, SSO integration | JWT validation against identity provider |
| API Keys | Programmatic access, service-to-service | HMAC-signed keys with rotation support |
| mTLS | Service mesh, inter-node communication | Certificate-based mutual authentication |
| LDAP/SAML | Enterprise directory integration | Delegated authentication to corporate IdP |

### Authorization Model: Multi-Level Graph Access Control

Graph databases require a richer authorization model than relational databases because access patterns are graph-structural: a query might be allowed to see a node but not traverse certain relationship types, or see a relationship but not read specific properties.

**Level 1: Database-Level RBAC**

| Role | Permissions |
|------|------------|
| Admin | Full access: schema DDL, user management, backup/restore |
| Architect | Schema DDL, index management, read/write data |
| Writer | Read and write nodes, edges, properties |
| Reader | Read-only access to all data |
| Analytics | Read-only access via analytics engine (no OLTP) |

**Level 2: Label-Based Authorization**

```
// Grant read access to Person nodes but not InternalUser nodes
GRANT TRAVERSE ON GRAPH social TO reader
GRANT READ {*} ON NODE:Person TO reader
DENY READ {*} ON NODE:InternalUser TO reader
```

Label-based security controls which node labels and relationship types a role can see. A denied label makes those nodes invisible in traversal results — queries behave as if those nodes do not exist.

**Level 3: Property-Based Authorization**

```
// Allow reading Person nodes but deny access to the SSN property
GRANT READ {name, email, age} ON NODE:Person TO analyst
DENY READ {ssn, salary} ON NODE:Person TO analyst
```

Property-based security controls which properties within an allowed label are visible. Denied properties return NULL.

**Level 4: Subgraph Segmentation**

For multi-tenant deployments, restrict each tenant to a labeled subgraph:

```
// Tenant isolation via label prefixing
GRANT ALL ON NODE:Tenant_A_* TO tenant_a_role
DENY ALL ON NODE:Tenant_B_* TO tenant_a_role
```

### Token Management

| Token Type | Lifetime | Refresh | Storage |
|-----------|----------|---------|---------|
| Access token (JWT) | 15 minutes | Via refresh token | Client-side |
| Refresh token | 24 hours | Re-authentication required | Secure cookie / keystore |
| API key | 90 days | Manual rotation or auto-rotate | Server-side encrypted store |
| Service certificate | 30 days | Auto-rotation via certificate manager | mTLS-managed |

---

## Data Security

### Encryption at Rest

| Component | Encryption | Key Management |
|-----------|-----------|----------------|
| Node store | AES-256-GCM | Per-database key, managed by external KMS |
| Relationship store | AES-256-GCM | Same database key |
| Property store | AES-256-GCM | Same database key + per-property envelope key for sensitive fields |
| WAL | AES-256-GCM | Same database key (WAL replay requires decryption) |
| Index files | AES-256-GCM | Same database key |
| Backups | AES-256-GCM | Separate backup key with cross-region replication |

**Per-property encryption:** For highly sensitive properties (SSN, credit card), an additional envelope encryption layer allows those properties to be encrypted with a separate key, enabling key rotation without re-encrypting the entire store.

### Encryption in Transit

| Connection | Protocol | Minimum Version |
|-----------|----------|----------------|
| Client → Query Router | TLS 1.3 | Required |
| Query Router → Storage Nodes | mTLS | Required |
| Storage Node → Storage Node (replication) | mTLS | Required |
| Storage Node → Object Storage (backup) | TLS 1.3 | Required |

### PII Handling

| Data Category | Classification | Handling |
|--------------|---------------|---------|
| Node properties (name, email) | PII | Property-level encryption, label-based access control |
| Relationship existence | Sensitive metadata | Relationship types may reveal sensitive info (e.g., DIAGNOSED_WITH) |
| Graph structure | Behavioral data | Traversal patterns can infer sensitive relationships |
| Query logs | Contains PII queries | Parameter redaction in logs, retain only query templates |

### Data Masking / Anonymization

| Technique | When Used |
|-----------|-----------|
| Property redaction | Non-privileged roles see NULL for sensitive properties |
| Node generalization | Replace specific identifiers with categories (e.g., city → region) |
| Edge differential privacy | Add noise to degree counts in analytics exports |
| k-anonymity for subgraphs | Ensure exported subgraphs cannot identify individuals |

---

## Threat Model

### Top 5 Attack Vectors

#### 1. Traversal Escalation Attack

**Threat:** An attacker crafts a query that starts from an authorized node and traverses through relationships to reach nodes they should not access (e.g., traversing from a public profile to an internal admin node via a shared group).

**Impact:** Unauthorized data access, bypassing label-based access control.

**Mitigation:**
- Access control checks at every hop in the traversal, not just at the query start
- Denied labels create "traversal barriers" — the traversal engine treats denied nodes as non-existent
- Audit log for traversals that touch access-controlled boundaries

#### 2. Cypher/GQL Injection

**Threat:** Application passes unsanitized user input into query strings, allowing injection of malicious graph operations (e.g., `DELETE` or `SET` operations embedded in a `MATCH` clause).

**Impact:** Data destruction, unauthorized modification, data exfiltration.

**Mitigation:**
- Parameterized queries mandatory (query templates with `$parameter` placeholders)
- Query parser rejects statements with multiple clauses when submitted via read-only endpoints
- Input validation layer strips graph query keywords from user-supplied strings

#### 3. Denial-of-Service via Expensive Traversals

**Threat:** A malicious or poorly written query triggers unbounded traversal (e.g., `MATCH (a)-[*]->(b)` without depth limits) consuming all server resources.

**Impact:** System unavailability, affecting all users.

**Mitigation:**
- Maximum traversal depth enforced at query planning stage (configurable, default 15 hops)
- Query timeout (default 30 seconds)
- Memory budget per query (default 512 MB)
- Query guard: automatic detection and termination of runaway queries
- Rate limiting by client identity

#### 4. Graph Structure Inference

**Threat:** Even with property-level encryption, an attacker with read access can infer sensitive information from graph structure alone (e.g., the existence of an edge of type DIAGNOSED_WITH between a person and a disease reveals medical information).

**Impact:** Privacy violation through structural analysis.

**Mitigation:**
- Relationship-type-based access control (deny visibility of sensitive edge types)
- Edge masking: replace sensitive edge types with generic edges in query results for non-privileged roles
- Differential privacy for graph analytics exports (add noise to edge counts and degree distributions)

#### 5. Replica Divergence / Split-Brain

**Threat:** Network partition causes replicas to diverge. If both sides accept writes, the graph enters an inconsistent state where relationship chains have conflicting pointers.

**Impact:** Data corruption, traversal loops, dangling pointers.

**Mitigation:**
- Raft consensus requires majority quorum for writes (minority partition becomes read-only)
- Fencing tokens on leader transitions prevent stale leaders from accepting writes
- Automated consistency checks on partition heal (compare WAL positions)

### Rate Limiting & DDoS Protection

| Layer | Mechanism |
|-------|-----------|
| Network | Connection rate limiting, SYN flood protection |
| Transport | TLS handshake rate limiting |
| Application | Per-client query rate limiting (token bucket) |
| Query | Cost-based query admission control (expensive queries have higher cost) |
| Traversal | Per-query hop limit and expansion budget |

---

## Compliance

### GDPR Considerations

| Requirement | Implementation |
|------------|---------------|
| Right to be forgotten | Node deletion cascade: delete node, all incident edges, all properties, and all references in indexes |
| Data portability | Export a user's ego graph (user + 1-hop neighbors + all properties) in standard graph formats (GraphML, JSON-LD) |
| Consent management | Consent modeled as graph edges (User)-[:CONSENTED_TO]->(Purpose) with temporal properties |
| Data minimization | Property-level TTL: automatically expire and delete properties after retention period |
| Processing records | Audit log of all queries that accessed PII-labeled nodes |

### SOC 2 Considerations

| Control | Implementation |
|---------|---------------|
| Access control | Multi-level RBAC with label and property authorization |
| Audit logging | Immutable audit log of all data access and administrative operations |
| Encryption | At-rest (AES-256) and in-transit (TLS 1.3/mTLS) |
| Availability | 99.99% SLA with automated failover |
| Change management | Schema changes require DDL privileges and are version-controlled |

### PCI-DSS Considerations (if storing payment data)

| Requirement | Implementation |
|------------|---------------|
| Cardholder data isolation | Payment data in separate graph database instance with dedicated encryption keys |
| Network segmentation | Payment graph accessible only from PCI-compliant network zones |
| Access logging | Every query touching payment-labeled nodes logged with user identity |
| Key rotation | Per-property encryption keys rotated every 90 days |
