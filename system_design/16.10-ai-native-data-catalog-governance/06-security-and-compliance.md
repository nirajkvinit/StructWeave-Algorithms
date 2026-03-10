# Security & Compliance — AI-Native Data Catalog & Governance

## Threat Model

A data catalog is a high-value target because it contains the **map of all organizational data** — knowing what sensitive data exists and where it lives is precisely the information an attacker needs to plan a data exfiltration. Compromising the catalog also enables policy manipulation to remove masking rules or access controls.

### Attack Vectors

| # | Attack Vector | Risk Level | Description |
|---|--------------|------------|-------------|
| 1 | **Catalog enumeration** | Critical | An attacker with minimal catalog access discovers the existence and location of sensitive datasets by browsing metadata, even without access to the actual data |
| 2 | **Policy manipulation** | Critical | An insider modifies or disables masking/access policies to expose sensitive columns to unauthorized users |
| 3 | **Classification poisoning** | High | An attacker deliberately mislabels columns (removing PII tags) to bypass tag-based governance policies |
| 4 | **NL-to-SQL injection** | High | A user crafts a natural language query that tricks the LLM into generating SQL that bypasses row filters or accesses restricted tables |
| 5 | **Connector credential theft** | High | Metadata connectors store credentials for 50+ data sources; compromising the credential store exposes all connected systems |
| 6 | **Lineage graph manipulation** | Medium | Falsifying lineage edges to obscure the true origin of data, hiding compliance violations |
| 7 | **Search result inference** | Medium | Even without direct data access, search result metadata (column names, descriptions, tags) can reveal sensitive business information |

---

## Authentication & Authorization

### Authentication

| Mechanism | Use Case |
|-----------|----------|
| **OIDC / SAML SSO** | All human users via corporate identity provider |
| **API tokens (JWT)** | Service-to-service communication, CI/CD pipelines |
| **Service accounts** | Metadata connectors, classification workers, automation bots |
| **mTLS** | Internal service mesh communication |

### Authorization Model: Tag-Based ABAC

The platform uses **Attribute-Based Access Control (ABAC)** where access decisions are based on metadata tags rather than explicit per-asset permissions:

```
Policy Structure:
  WHEN entity.tags MATCH {sensitivity: "confidential"}
  AND user.attributes NOT MATCH {clearance: "L3", domain: entity.domain}
  THEN DENY access

  WHEN entity.tags MATCH {pii_type: ANY}
  AND user.attributes NOT MATCH {role: "data_steward"}
  THEN APPLY column_masking(sha256_hash)
```

### Access Control Layers

| Layer | Scope | Mechanism |
|-------|-------|-----------|
| **Catalog visibility** | Can the user see that this entity exists? | Domain-based access lists; search results filtered by visibility policies |
| **Metadata read** | Can the user see full metadata (description, lineage, quality)? | Role-based: data consumers see basic info; data stewards see full detail |
| **Data preview** | Can the user see sample data values? | Tag-based: PII columns show masked previews; non-PII shows real values |
| **Policy management** | Can the user create/modify governance policies? | Admin role + domain scope; all policy changes require approval workflow |
| **Classification override** | Can the user change auto-classification labels? | Data steward role + audit trail; overrides logged with justification |

### Privilege Escalation Prevention

- **Separation of duties:** The person who creates a policy cannot approve it. Policy changes require a different approver.
- **Tag immutability audit:** Auto-classified tags cannot be removed without explicit "classification override" permission and a logged justification.
- **Policy change alerting:** All policy modifications trigger real-time alerts to the security team.

---

## Data Security

### Encryption

| Layer | Mechanism | Key Management |
|-------|-----------|---------------|
| **In transit** | TLS 1.3 for all API and inter-service communication | Automated certificate rotation via service mesh |
| **At rest (metadata)** | AES-256 for metadata database and search index | Customer-managed keys (CMK) with key rotation every 90 days |
| **At rest (audit log)** | AES-256 on immutable object storage | Separate key from metadata store; write-once policy |
| **Connector credentials** | AES-256 with envelope encryption in secrets manager | Per-connector key; auto-rotation supported |
| **Data samples** | Encrypted in transit; never persisted at rest | Samples are ephemeral — used during classification, then discarded |

### Credential Vending for Connectors

Connectors do not store long-lived credentials. Instead:

1. Connector authenticates to catalog's credential service using its service account
2. Credential service issues a **short-lived token** (15-minute TTL) scoped to specific metadata operations (read-only schema, query log access)
3. Token is used to connect to the data source
4. Token expires automatically — even if intercepted, the window of exploitation is minimal

### PII Protection in the Catalog Itself

The catalog contains metadata about PII but may also display PII in:
- **Column sample values** in search results
- **NL-to-SQL query results** that return actual data

**Mitigation:**
- Sample values pass through the policy engine before display — PII-tagged columns show masked samples
- NL-to-SQL results are filtered through the same masking/row-filter policies as direct SQL access
- Classification tags in search results show the presence of PII (e.g., "Contains: PII:email") without exposing actual values

---

## Compliance

### GDPR

| Requirement | Implementation |
|-------------|----------------|
| **Right to erasure** | Lineage graph enables tracing all downstream copies of a user's data; erasure workflow propagates deletion requests through the lineage chain |
| **Data minimization** | Quality scoring flags datasets with excessive PII collection; automated recommendations to minimize |
| **Processing records** | Audit log maintains a complete record of who accessed what data, when, and for what purpose |
| **Data protection impact assessment** | Impact analysis API shows all downstream uses of a PII-containing dataset, automating DPIA documentation |
| **Consent tracking** | Tags record consent basis per dataset; policies enforce access restrictions based on consent status |

### SOC 2

| Control | Implementation |
|---------|----------------|
| **Access control (CC6)** | ABAC policies with tag-based enforcement; all access decisions logged |
| **Change management (CC8)** | Policy changes require approval workflow; full version history maintained |
| **Monitoring (CC7)** | Real-time alerting on policy violations, unauthorized access attempts, classification overrides |
| **Risk assessment (CC3)** | Auto-classification continuously assesses data sensitivity; quality scoring identifies data risk |

### HIPAA (Healthcare Data)

| Safeguard | Implementation |
|-----------|----------------|
| **Access controls** | PHI-tagged columns require explicit "healthcare_role" attribute; auto-masking for all other users |
| **Audit controls** | Every metadata access to PHI-tagged entities is logged with user, timestamp, and purpose |
| **Integrity controls** | Classification of PHI columns cannot be overridden without compliance officer approval |
| **Transmission security** | All API communication encrypted via TLS 1.3; mTLS between internal services |

---

## Audit Logging

### What Is Logged

| Event Category | Examples | Retention |
|---------------|----------|-----------|
| **Access events** | Search queries, entity views, lineage traversals, data previews | 2 years |
| **Policy events** | Policy creation, modification, deletion, evaluation results | 7 years |
| **Classification events** | Auto-classification results, manual overrides, confidence changes | 7 years |
| **Admin events** | User management, connector configuration, domain changes | 7 years |
| **NL-to-SQL events** | Natural language queries, generated SQL, execution context | 2 years |

### Audit Log Architecture

```
Audit events → Append-only write → Immutable object storage
                                         │
                                    ┌─────▼─────┐
                                    │ Compliance │
                                    │ Query      │
                                    │ Engine     │
                                    └────────────┘
```

- **Immutability:** Audit logs are written to object storage with a write-once-read-many (WORM) policy. No event can be modified or deleted after writing.
- **Tamper detection:** Each log entry includes a hash chain (hash of current entry includes hash of previous entry). Breaking the chain is detectable.
- **Compliance queries:** "Show all users who accessed PII-tagged entities in the commerce domain in Q1 2026" runs against the audit index in seconds.
