# Security & Compliance — Data Mesh Architecture

## Authentication & Authorization

### Authentication Mechanisms

| Mechanism | Use Case | Implementation |
|-----------|----------|---------------|
| OAuth 2.0 / OIDC | Human consumers, analyst access | JWT validation against corporate identity provider |
| Service Tokens | Domain pipelines, automated consumers | Short-lived tokens issued per data product access grant |
| mTLS | Platform service-to-service communication | Certificate-based mutual authentication between platform components |
| API Keys | External partner access, third-party integrations | Scoped keys with per-product access limits |
| SAML | Enterprise SSO integration | Federated identity with corporate directory |

### Authorization Model: Federated Data Product Access Control

Data mesh authorization is more complex than traditional database access control because ownership is distributed: each data product has its own access policy defined by the domain team, but global policies set minimum security standards that all products must satisfy.

**Level 1: Platform-Level RBAC**

| Role | Permissions |
|------|------------|
| Platform Admin | Full access: platform configuration, global policies, user management |
| Governance Council | Create/modify global policies, review compliance reports |
| Domain Admin | Manage domain-level policies, approve access requests for domain products |
| Data Product Owner | Define access policies for owned products, publish/deprecate products |
| Data Consumer | Discover products, request access, query accessible products |
| Auditor | Read-only access to all metadata, governance results, and audit logs |

**Level 2: Data Product Access Policies**

Each data product declares its access policy as part of the product descriptor:

```
access_policy:
  default: DENY
  rules:
    - principal: "team:sales-analytics"
      access: READ
      purpose: "Customer segmentation"
      expires: "2027-01-01"
    - principal: "role:data-scientist"
      access: READ
      columns: ["customer_id", "ltv_score"]  # column-level restriction
      purpose: "Model training"
    - principal: "team:finance"
      access: READ
      conditions:
        - "request.purpose IN ['reporting', 'audit']"
      approval: OWNER  # requires owner approval
```

**Level 3: Column-Level Access Control**

Fine-grained access restricts which columns a consumer can read:

```
// Consumer with full access sees:
customer_id | name         | email              | ltv_score | ssn
C001        | Alice Smith  | alice@company.com  | 15000     | 123-45-6789

// Consumer with restricted access (no PII columns) sees:
customer_id | ltv_score
C001        | 15000
```

**Level 4: Row-Level Filtering (Purpose-Based)**

```
// Regional manager sees only their region's data
access_policy:
  rules:
    - principal: "user:regional_mgr_west"
      access: READ
      row_filter: "region = 'WEST'"
```

### Token Management

| Token Type | Lifetime | Refresh | Storage |
|-----------|----------|---------|---------|
| Consumer access token (JWT) | 1 hour | Via OIDC refresh flow | Client-side |
| Service pipeline token | 24 hours | Auto-rotation by platform | Secure vault |
| API key | 90 days | Manual or auto-rotation | Server-side encrypted store |
| Data product access grant | Defined per grant (30-365 days) | Re-request required | Platform access control service |

---

## Data Security

### Encryption at Rest

| Component | Encryption | Key Management |
|-----------|-----------|----------------|
| Platform metadata store | AES-256-GCM | Platform-managed key via external KMS |
| Lineage graph store | AES-256-GCM | Platform-managed key |
| Search index | AES-256-GCM | Platform-managed key |
| Data products | AES-256-GCM (minimum) | Domain-managed keys (platform provides KMS integration) |
| Governance policy store | AES-256-GCM | Platform-managed key |
| Audit logs | AES-256-GCM | Separate audit key with restricted access |

**Data product encryption responsibility:** The platform provides encryption templates and KMS integration, but the domain team manages the encryption keys for their data products. This preserves domain ownership while ensuring a minimum encryption standard is enforced by governance policies.

### Encryption in Transit

| Connection | Protocol | Minimum Version |
|-----------|----------|----------------|
| Consumer → Platform API | TLS 1.3 | Required |
| Platform → Domain storage | mTLS | Required |
| Platform service → Platform service | mTLS | Required |
| Federated query engine → Domain storage | mTLS | Required |
| Event bus → Consumers | TLS 1.3 | Required |

### PII Handling

| Data Category | Classification | Handling |
|--------------|---------------|---------|
| Direct identifiers (name, email, SSN) | PII-HIGH | Column-level access control; encryption at rest; masking for non-privileged consumers |
| Indirect identifiers (ZIP code, age range) | PII-MEDIUM | Access control; aggregation for analytics exports |
| Behavioral data (purchase history) | PII-LOW | Access control; anonymization for cross-domain sharing |
| Aggregated metrics (domain KPIs) | NON-PII | Standard access control; no masking required |

### Data Masking / Anonymization

| Technique | When Used |
|-----------|-----------|
| Column masking | Non-privileged consumers see masked values (email → a***@company.com) |
| Tokenization | Replace PII with reversible tokens for cross-domain joining without exposing raw PII |
| k-Anonymization | Aggregated data products ensure no individual can be identified from quasi-identifiers |
| Differential privacy | Noise injection for analytics data products shared broadly |
| Purpose-based access | Different masking levels based on declared purpose of use |

---

## Threat Model

### Top 5 Attack Vectors

#### 1. Data Product Poisoning

**Threat:** A compromised domain team (or a malicious insider) publishes a data product with intentionally corrupted data — correct schema but incorrect values. Downstream consumers and automated pipelines ingest bad data, causing incorrect business decisions.

**Impact:** Silent data corruption across the mesh; trust erosion in the data mesh as a whole.

**Mitigation:**
- Quality rules in data contracts (range checks, statistical distribution validation, referential integrity)
- Anomaly detection on published data (significant deviation from historical patterns triggers alert)
- Consumer-side contract validation (consumers verify incoming data against the contract before ingesting)
- Audit trail of all published versions with rollback capability

#### 2. Cross-Domain Privilege Escalation

**Threat:** A consumer with access to Domain A's product discovers that Domain A's product contains a foreign key to Domain B's product. By joining through the federated query engine, the consumer accesses Domain B data that they were not explicitly granted access to.

**Impact:** Unauthorized data access through transitive joins.

**Mitigation:**
- Access control evaluated per data product in federated queries (access to Domain A does not grant access to Domain B)
- Federated query engine checks authorization for each source before executing subqueries
- Join-path audit: log all cross-domain joins for compliance review
- Access policies can declare "no-join" restrictions preventing their product from being joined with specific other products

#### 3. Governance Policy Bypass

**Threat:** A domain team discovers a way to publish data outside the governed pipeline — for example, directly writing to object storage and sharing the path with consumers, bypassing contract validation and governance checks.

**Impact:** Ungovened data enters the organization's decision-making process.

**Mitigation:**
- Network-level controls: only the publishing pipeline has write access to the data product storage locations
- Observability layer detects data movement outside governed channels
- Executive KPIs track "mesh coverage" — percentage of known analytical data registered as governed products
- Cultural incentives: make it easier to publish through the mesh than to bypass it

#### 4. Metadata Store Compromise

**Threat:** An attacker gains access to the metadata store, which contains the complete catalog of all data products, their schemas, owners, and access policies. This is an intelligence goldmine for understanding the organization's data assets.

**Impact:** Exposure of organizational data architecture; ability to craft targeted data access attacks.

**Mitigation:**
- Metadata store encrypted at rest and in transit
- Access to metadata store restricted to platform service accounts only (no direct human access)
- All metadata access logged and auditable
- Metadata store in private network segment, not accessible from corporate network

#### 5. Stale Access Grant Exploitation

**Threat:** A consumer's role changes (leaves team, changes department) but their data product access grants are not revoked, allowing continued access to data products they no longer have legitimate need for.

**Impact:** Data access beyond authorized scope; compliance violation.

**Mitigation:**
- Access grants have mandatory expiration dates (maximum 365 days)
- Integration with corporate identity provider: role changes trigger access review
- Periodic access certification: product owners review and re-certify consumer access quarterly
- Automated detection of unused access grants (no queries in 90 days → alert to owner)

### Rate Limiting & Abuse Protection

| Layer | Mechanism |
|-------|-----------|
| Network | Connection rate limiting at load balancer |
| API | Per-consumer rate limiting (token bucket) |
| Query | Cost-based admission control for federated queries |
| Publishing | Per-domain rate limiting to prevent catalog flooding |
| Discovery | Search rate limiting to prevent catalog scraping |

---

## Compliance

### GDPR Considerations

| Requirement | Implementation |
|------------|---------------|
| Right to be forgotten | Lineage-driven deletion: identify all data products containing the individual's data via lineage graph, notify all product owners to purge records |
| Data portability | Export individual's data across all data products via lineage traversal and cross-domain query |
| Consent management | Consent modeled as a data product ("Consent Registry" in the Legal domain) consumed by access control |
| Data minimization | Governance policy enforces purpose declaration on access grants; unused access auto-expires |
| Processing records | Complete audit log of who accessed which data products, when, and for what declared purpose |
| Data residency | Data product descriptors declare storage region; governance policy enforces residency rules |

### SOC 2 Considerations

| Control | Implementation |
|---------|---------------|
| Access control | Multi-level RBAC with product-level, column-level, and row-level restrictions |
| Audit logging | Immutable audit log of all data product access, publishing, and governance events |
| Encryption | At-rest (AES-256) and in-transit (TLS 1.3/mTLS) for all platform and data product storage |
| Change management | All governance policy changes version-controlled; data product schema changes validated against contracts |
| Availability | Platform SLA with automated failover and domain-independent fault isolation |

### Data Mesh-Specific Compliance Challenges

| Challenge | Description | Solution |
|-----------|-------------|----------|
| Distributed ownership of PII | PII exists in data products across many domains; no single team controls all PII | Governance policy requires PII classification at publish time; lineage tracks PII propagation across domains |
| Cross-domain data lineage for audits | Auditors need end-to-end lineage that spans domain boundaries | Lineage graph maintains cross-domain edges; compliance reports generated from lineage traversal |
| Consistent retention policies | Different domains may retain data for different periods | Global governance policy sets minimum/maximum retention by data classification; domain policies refine within bounds |
| Right to deletion across domains | A GDPR deletion request must propagate to all domains holding the individual's data | Automated deletion workflow: lineage graph identifies all affected products → deletion request dispatched to each domain owner → confirmation tracked centrally |
