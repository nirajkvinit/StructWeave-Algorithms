# Security & Compliance — Data Lakehouse Architecture

## Threat Model

### Top 5 Attack Vectors

| # | Threat | Description | Severity |
|:---|:---|:---|:---|
| 1 | **Credential leakage via catalog** | Catalog vends temporary object-storage credentials; if the vending endpoint is compromised, attackers gain direct access to data files | Critical |
| 2 | **Snapshot poisoning** | A malicious writer commits a snapshot referencing tampered data files, corrupting downstream queries and ML training | Critical |
| 3 | **Metadata exfiltration** | Manifest files contain column statistics (min/max values) that reveal data distribution even without reading actual data | High |
| 4 | **Stale credential reuse** | Temporary credentials are captured and reused after intended expiry due to clock skew or insufficient revocation | High |
| 5 | **Partition inference attack** | Partition values (e.g., date, region) are visible in file paths on object storage; attacker infers data characteristics from path patterns | Medium |

## Authentication

### Authentication Mechanisms

| Mechanism | Use Case | Strength |
|:---|:---|:---|
| OAuth 2.0 / OIDC | Interactive users (BI tools, notebooks) | Standard; supports MFA and SSO |
| Service account tokens | Engine-to-catalog communication | Machine identity; rotatable |
| mTLS | Engine-to-object-storage, engine-to-catalog | Strong mutual authentication; certificate-based |
| API keys | Programmatic access (CI/CD pipelines) | Simple but must be rotated frequently |
| SAML / LDAP federation | Enterprise SSO integration | Centralized identity management |

### Token Management

| Token Type | Lifetime | Refresh |
|:---|:---|:---|
| User access token | 15 minutes | Via refresh token (8-hour lifetime) |
| Service account token | 1 hour | Auto-rotation by secret manager |
| Object storage credential | 15 minutes (scoped) | Re-vended by catalog per request |
| mTLS certificate | 90 days | Automated renewal via certificate authority |

## Authorization

### Role-Based Access Control (RBAC)

| Role | Permissions |
|:---|:---|
| **Reader** | SELECT on granted tables; load metadata; read data files |
| **Writer** | Reader + INSERT, UPDATE, DELETE on granted tables |
| **Table Admin** | Writer + ALTER TABLE (schema evolution, partition changes), COMPACT, VACUUM |
| **Namespace Admin** | Table Admin + CREATE/DROP TABLE within namespace |
| **Catalog Admin** | Full control: namespace management, access policy, audit configuration |

### Fine-Grained Access Control

| Level | Mechanism | Example |
|:---|:---|:---|
| **Table-level** | RBAC grants on table identifiers | `GRANT SELECT ON analytics.events TO role_analyst` |
| **Column-level** | Column masking policies | PII columns (email, phone) masked for non-privileged roles |
| **Row-level** | Row filter policies attached to table | `WHERE region = current_user_region()` transparently applied |
| **Partition-level** | Access grants scoped to partition values | Finance team sees only `department = 'finance'` partitions |

### Credential Vending

The catalog acts as a **credential broker**: when a query engine needs to read data files, it requests scoped credentials from the catalog. The catalog:

1. Validates the engine's identity and the user's authorization.
2. Generates a temporary credential with permissions limited to the exact object-storage paths needed.
3. Returns the credential with a short TTL (15 minutes).
4. Logs the vending event for audit.

This prevents engines from holding long-lived, broadly-scoped storage credentials.

## Data Security

### Encryption at Rest

| Layer | Encryption | Key Management |
|:---|:---|:---|
| Object storage | Server-side encryption (AES-256-GCM) | Platform-managed keys with customer-managed key option |
| Metadata files | Same as data files (co-located on object storage) | Same key hierarchy |
| Catalog database | Transparent database encryption | Dedicated key, rotated quarterly |
| Local SSD cache | Full-disk encryption | Ephemeral keys destroyed on instance termination |

### Encryption in Transit

| Channel | Protocol | Notes |
|:---|:---|:---|
| Client → Query engine | TLS 1.3 | Certificate pinning for sensitive environments |
| Query engine → Catalog | TLS 1.3 or mTLS | mTLS recommended for service-to-service |
| Query engine → Object storage | HTTPS (TLS 1.3) | Enforced by storage policy; HTTP rejected |
| Catalog → Catalog replica | mTLS | Cross-AZ replication encrypted |

### PII Handling

| Classification | Examples | Handling |
|:---|:---|:---|
| Restricted | SSN, credit card numbers | Column-level encryption; access logged and alerted |
| Confidential | Email, phone, name | Column masking; accessible only to authorized roles |
| Internal | User IDs, session tokens | Standard encryption at rest and in transit |
| Public | Aggregated metrics, public timestamps | No special handling |

### Data Masking Techniques

| Technique | Application | Example |
|:---|:---|:---|
| Full redaction | Restricted columns for non-privileged users | `***-**-****` |
| Partial masking | Email addresses | `j***@example.com` |
| Tokenization | Columns used in joins but not displayed | Deterministic token replacing PII |
| Bucketing | Age, salary for analytics | `30-39` instead of exact age |

## Compliance

### GDPR Considerations

| Requirement | Implementation |
|:---|:---|
| Right to erasure | Delete specific rows via MoR delete files; compact to physically remove; vacuum expired snapshots containing the data |
| Right to access | Query by subject ID across all tables; export as portable format |
| Data minimization | Retention policies auto-expire partitions beyond defined periods |
| Consent tracking | Separate consent table with time-travel for audit |
| Cross-border transfers | Region-pinned tables; metadata includes data-residency tags |

**GDPR and time travel tension**: Time travel retains historical snapshots that may contain deleted user data. Mitigation: set snapshot retention shorter than the GDPR compliance window, and ensure vacuum physically removes files containing erased data.

### SOC 2 Considerations

| Control | Implementation |
|:---|:---|
| Access control | RBAC + fine-grained policies enforced at catalog layer |
| Audit logging | All catalog operations (reads, commits, grants) logged immutably |
| Encryption | At-rest and in-transit encryption for all data and metadata |
| Availability | Multi-AZ deployment with failover; uptime SLO ≥ 99.95% |
| Change management | Schema and partition evolution tracked in snapshot history |

### PCI-DSS Considerations

| Control | Implementation |
|:---|:---|
| Cardholder data isolation | Dedicated namespace with stricter access policies |
| Network segmentation | Query engines accessing PCI data run in isolated network segments |
| Audit trail | Immutable commit log with tamper-evident checksums |
| Key rotation | Encryption keys rotated every 90 days; re-encryption via compaction |

## Audit & Monitoring

### Audit Log Events

| Event | Details Captured |
|:---|:---|
| Table created / dropped | Who, when, schema, namespace |
| Snapshot committed | Who, operation type, files added/deleted, row counts |
| Schema evolved | Who, columns added/dropped/renamed, before/after schema |
| Access grant / revoke | Who granted, to whom, what scope |
| Credential vended | To whom, scope, TTL, requesting engine |
| Data accessed (query) | Who, which table, which partitions, rows scanned |
| Compaction / vacuum executed | Who triggered, partition, files affected |

### Audit Storage

- Audit logs written to a separate, append-only table in the lakehouse (self-hosted audit trail).
- Retention: minimum 1 year for SOC 2; 7 years for financial regulations.
- Access to audit tables restricted to security and compliance roles.
- Tamper detection: each audit entry includes a hash chain linking to the previous entry.
