# AI-Native Procurement & Spend Intelligence --- Security & Compliance

## 1. Authentication & Authorization

### 1.1 Authentication Architecture

```
Authentication Flow:
  1. User authenticates via corporate IdP (SAML 2.0 / OIDC)
  2. API Gateway validates token, extracts identity claims
  3. Gateway mints internal JWT with:
     - user_id, tenant_id, org_unit_ids
     - roles (buyer, approver, analyst, admin)
     - approval_authority_level (max spend amount)
     - category_permissions (allowed procurement categories)
  4. Internal JWT propagated to all downstream services
  5. Services validate JWT signature (public key rotation every 90 days)
  6. Token TTL: 15 min; refresh token: 8 hours

Service-to-Service Authentication:
  - mTLS between all services (certificates rotated monthly)
  - Service identity verified via service mesh
  - No service can impersonate another (strict identity binding)

API Key Authentication (for ERP integrations):
  - Tenant-scoped API keys with granular permission sets
  - Key rotation: mandatory every 90 days
  - IP allowlisting for integration endpoints
  - Rate limiting per API key
```

### 1.2 Authorization Model (RBAC + ABAC Hybrid)

#### Role-Based Access Control (RBAC)

| Role | PO Create | PO Approve | Spend View | Risk View | Admin | Contract Manage |
|------|-----------|------------|------------|-----------|-------|-----------------|
| **Requester** | Own dept only | No | Own dept | No | No | No |
| **Buyer** | Assigned categories | No | Assigned categories | Limited | No | View only |
| **Senior Buyer** | All categories | Up to $50K | All categories | Yes | No | Yes |
| **Procurement Manager** | All | Up to $500K | All | Yes | Dept | Yes |
| **VP Procurement** | All | Up to $5M | All | Yes | Division | Yes |
| **CPO** | All | Unlimited | All | Yes | Global | Yes |
| **Finance Analyst** | No | No | All (read-only) | Yes | No | View only |
| **Auditor** | No | No | All (read-only) | Yes (read-only) | Audit logs | View only |

#### Attribute-Based Access Control (ABAC) Policies

```
Policy: "Category-Scoped Procurement"
  Subject: user.role IN (buyer, senior_buyer)
  Resource: purchase_order
  Action: create
  Condition:
    po.category IN user.assigned_categories AND
    po.amount <= user.approval_authority AND
    po.org_unit IN user.accessible_org_units

Policy: "Cross-Subsidiary Data Access"
  Subject: user.role IN (finance_analyst, auditor)
  Resource: spend_data
  Action: read
  Condition:
    spend.tenant_id == user.tenant_id AND
    (spend.org_unit IN user.accessible_org_units OR
     user.has_permission("cross_subsidiary_view"))

Policy: "Supplier PII Access"
  Subject: ANY
  Resource: supplier.banking_details, supplier.contact_pii
  Action: read
  Condition:
    user.has_permission("supplier_pii_access") AND
    AuditLog.record(user, resource, action)

Policy: "Autonomous PO Override"
  Subject: user.role IN (procurement_manager, cpo)
  Resource: autonomous_po_settings
  Action: modify
  Condition:
    user.has_permission("autonomous_config") AND
    change.requires_four_eyes_approval == true
```

### 1.3 Separation of Duties

```
Critical Controls:
  - PO Creator cannot be the PO Approver (enforced by workflow engine)
  - Supplier Onboarder cannot be the PO Creator for that supplier
  - Budget Owner cannot unilaterally increase their own budget
  - ML Model Deployer cannot be the Model Validator
  - System Administrator cannot directly modify audit logs

Four-Eyes Principle for:
  - Autonomous PO threshold changes (requires 2 authorized approvers)
  - Supplier approval list modifications
  - Contract term overrides
  - Risk threshold adjustments
  - Data retention policy changes
```

---

## 2. Data Security

### 2.1 Encryption

| Layer | Mechanism | Key Management |
|-------|-----------|----------------|
| **In Transit** | TLS 1.3 for all external connections; mTLS for inter-service | Certificates managed by service mesh; auto-rotation |
| **At Rest (database)** | Transparent data encryption (TDE) | Managed key service; tenant-specific encryption keys for regulated industries |
| **At Rest (object storage)** | Server-side encryption with managed keys | Envelope encryption; key rotation every 365 days |
| **Field-Level Encryption** | Supplier banking details, tax IDs, contact PII | Application-level encryption; keys per tenant; accessible only to authorized services |
| **Search Over Encrypted Fields** | Deterministic encryption for exact-match search; tokenization for supplier tax IDs | Separate search tokens stored alongside encrypted values |

### 2.2 Data Classification

| Classification | Examples | Controls |
|----------------|----------|----------|
| **Restricted** | Supplier banking details, tax IDs, personal contact info | Field-level encryption, access logging, need-to-know access, data masking in lower environments |
| **Confidential** | Contract terms, pricing data, negotiation strategy, spend analytics | Tenant isolation, role-based access, no cross-tenant exposure, encrypted at rest |
| **Internal** | PO details, supplier profiles (non-PII), category data | Standard authentication, tenant isolation, encrypted in transit |
| **Public** | Published supplier diversity certifications, general category taxonomies | No special controls beyond authentication |

### 2.3 Data Masking and Anonymization

```
Production Data Masking (for non-production environments):
  - Supplier names: Replace with synthetic names (preserve character distribution)
  - Banking details: Replace with test bank account numbers
  - Tax IDs: Replace with format-valid synthetic IDs
  - Email addresses: Replace domain with @test.example.com
  - Phone numbers: Replace with +1-555-xxxx pattern
  - Dollar amounts: Multiply by random factor (0.8-1.2) to preserve distributions
  - Contract text: Redact specific terms, replace party names

ML Training Data Anonymization:
  - Remove all PII before cross-tenant model training
  - Aggregate spend data to category level (no individual transactions)
  - Apply differential privacy (ε = 1.0) for global model training
  - k-anonymity (k ≥ 10) for any shared analytics
```

### 2.4 Tenant Data Isolation

```
Isolation Mechanisms:
  1. Database Level:
     - Every query includes mandatory tenant_id filter
     - Enforced at ORM/data access layer (not application logic)
     - Database views scoped to tenant context
     - Periodic audit: scan query logs for queries missing tenant filter

  2. Object Storage:
     - Tenant-prefixed paths: /{tenant_id}/contracts/...
     - Bucket policies prevent cross-tenant access
     - Document intelligence workers receive only tenant-scoped documents

  3. ML Pipeline:
     - Tenant-specific models stored in isolated paths
     - Feature store partitioned by tenant
     - Training jobs run in tenant-scoped compute containers
     - Global model training uses only anonymized, aggregated data

  4. Event Bus:
     - Events include tenant_id in partition key
     - Consumers filter by tenant_id
     - No cross-tenant event consumption without explicit authorization
```

---

## 3. Threat Model

### 3.1 Threat Categories

| Threat | Attack Vector | Impact | Likelihood | Mitigation |
|--------|---------------|--------|------------|------------|
| **Fraudulent PO Creation** | Insider creates POs to shell companies | Financial loss, regulatory penalty | Medium | Separation of duties, anomaly detection on PO patterns, supplier verification checks |
| **Supplier Data Exfiltration** | Compromised account downloads supplier database | Competitive intelligence loss, privacy breach | Medium | Rate limiting on bulk data access, anomaly detection on download patterns, DLP controls |
| **ML Model Poisoning** | Attacker submits crafted feedback to bias spend classification | Misclassified spend, hidden maverick spending | Low | Human review of low-confidence classifications, statistical monitoring of classification distribution shifts, periodic model validation |
| **Contract Tampering** | Modification of contract terms in storage | Financial liability, compliance violations | Low | Immutable document storage with cryptographic hashing, version control with access logging |
| **Cross-Tenant Data Leak** | Bug in tenant filter allows data access across tenants | Privacy breach, competitive exposure | Low | Mandatory tenant filter enforcement in data access layer, periodic penetration testing, tenant isolation audits |
| **Approval Chain Bypass** | Exploiting workflow engine to skip approval steps | Unauthorized spending | Low | Approval state machine validation, immutable audit trail, reconciliation checks |
| **API Key Compromise** | Stolen ERP integration credentials | Unauthorized PO creation, data access | Medium | Key rotation policy, IP allowlisting, anomaly detection on API usage patterns |
| **Invoice Fraud** | Duplicate or inflated invoices submitted | Financial loss | Medium | Three-way matching, duplicate detection, amount anomaly flagging, vendor verification |

### 3.2 Security Monitoring

```
Detection Rules:
  1. Unusual PO patterns:
     - POs just below approval threshold (split purchase detection)
     - POs to newly onboarded suppliers with no contract
     - POs with unusually round dollar amounts
     - POs created outside business hours by non-automated accounts

  2. Account behavior anomalies:
     - Login from unusual geography or device
     - Bulk data export (> 1000 supplier records in 1 hour)
     - Approval of own POs (separation of duties violation attempt)
     - Rapid sequential PO creation (> 20 POs in 10 min by single user)

  3. Integration anomalies:
     - API calls from unauthorized IP addresses
     - Unusual volume of API calls from integration accounts
     - ERP sync failures (potential man-in-the-middle)

  4. ML pipeline anomalies:
     - Sudden shift in classification distribution (model poisoning indicator)
     - Unusual volume of classification corrections (potential manipulation)
     - Model accuracy degradation below threshold
```

---

## 4. Procurement-Specific Compliance

### 4.1 SOX Compliance (Sarbanes-Oxley)

```
Relevant Controls:
  - Internal Controls over Financial Reporting (ICFR):
    - All POs above materiality threshold require documented approval
    - Budget checks enforced before PO creation (preventive control)
    - Three-way matching before payment (detective control)
    - Separation of duties (requester ≠ approver ≠ payer)

  - Audit Trail Requirements:
    - Every PO state transition logged with actor, timestamp, justification
    - Approval decisions recorded with approver identity and delegation chain
    - Configuration changes logged (approval thresholds, autonomous PO settings)
    - Immutable audit storage: cannot be modified or deleted, even by admins
    - Retention: 7 years minimum

  - Control Testing:
    - Automated daily reconciliation: POs in system vs. POs in ERP
    - Monthly review: random sample of autonomous POs against policy
    - Quarterly: access review (verify user roles match job responsibilities)
    - Annual: external audit support (provide audit reports, evidence packages)

  - Autonomous PO SOX Controls:
    - All AI decisions logged with explainable reasoning
    - Autonomous PO parameters reviewed and approved quarterly
    - Override audit: track all manual overrides of AI recommendations
    - Sampling: 10% of autonomous POs undergo post-hoc human review
```

### 4.2 Data Residency & Privacy

```
Data Residency Requirements:
  - EU tenants: All PII and financial data stored in EU regions
  - Data sovereignty: No cross-border transfers without tenant consent
  - Sub-processor management: Track and disclose all data processors

GDPR / CCPA Compliance:
  - Supplier PII:
    - Right of access: Suppliers can request all data held about them
    - Right of erasure: Supplier data deletion (with legal retention exceptions)
    - Data minimization: Collect only PII necessary for procurement
    - Consent management: Track consent for data processing purposes
    - Data processing agreements: Maintained for all sub-processors

  - Employee PII (procurement users):
    - Activity logging minimizes PII collection
    - Pseudonymization of user IDs in analytics
    - Access logs purged after retention period (respect right to be forgotten)

Implementation:
  - Data residency tag on every data record (determines storage region)
  - Cross-region queries blocked by default (require explicit justification)
  - Automated PII scanning of uploaded documents (detect and flag)
  - Data retention automation: auto-archive/delete per policy schedules
```

### 4.3 Anti-Bribery and Corruption (FCPA / UK Bribery Act)

```
Controls:
  - Supplier due diligence: Automated screening against sanctions lists,
    PEP databases, and adverse media during onboarding
  - Gift and hospitality tracking: Flag procurement decisions where
    supplier has provided gifts above threshold
  - Third-party intermediary monitoring: Enhanced scrutiny for
    procurement through agents or intermediaries
  - High-risk geography alerts: Flag procurement from countries with
    high Corruption Perception Index scores
  - Audit trail: Complete decision chain from need to payment
```

### 4.4 Industry-Specific Regulations

| Industry | Regulation | Requirements | System Controls |
|----------|------------|--------------|-----------------|
| **Defense** | DFARS / ITAR | Supplier cybersecurity assessment, controlled technical data restrictions | Supplier certification tracking, document classification labels, export control checks |
| **Pharmaceutical** | FDA 21 CFR Part 11 | Electronic signatures, audit trails for regulated procurement | Digital signature workflow, tamper-proof audit logs, validated system documentation |
| **Financial Services** | OCC / PRA | Third-party risk management, concentration limits | Automated concentration risk monitoring, regulatory reporting, vendor assessment templates |
| **Government** | FAR / DFARS | Small business set-asides, cost accounting standards | Diversity compliance tracking, cost proposal validation, required sourcing workflows |

---

## 5. Secure ML Pipeline

### 5.1 Model Security

```
Model Training Security:
  - Training data access controls (who can add training data)
  - Input validation: sanitize training feedback to prevent poisoning
  - Statistical monitoring: alert if training data distribution shifts unexpectedly
  - Model signing: cryptographic signature on trained model artifacts
  - Model provenance: track lineage from training data to deployed model

Model Serving Security:
  - Model endpoints accessible only to authorized services (mTLS)
  - Input validation: reject malformed inference requests
  - Output sanitization: ensure model outputs do not leak training data
  - Rate limiting: prevent model extraction attacks (mass querying)
  - Prediction logging: audit trail of all predictions for accountability

Adversarial Robustness:
  - Regular testing with adversarial inputs (spend descriptions
    designed to trigger misclassification)
  - Confidence thresholds: low-confidence predictions routed to humans
  - Ensemble disagreement: if multiple models disagree, flag for review
```

### 5.2 AI Governance

```
Transparency Requirements:
  - Every autonomous PO includes machine-readable explanation
  - Supplier risk scores include dimension breakdowns
  - Spend classifications include confidence scores and alternatives
  - Price recommendations include methodology and data sources

Bias Monitoring:
  - Monitor spend classification accuracy across supplier demographics
  - Monitor supplier risk scores for geographic or size-based bias
  - Regular fairness audits on autonomous PO approval rates
  - Compare AI recommendations against human decisions for bias detection

Human Override:
  - All AI decisions can be overridden by authorized humans
  - Override reasons recorded and analyzed for model improvement
  - Override rate tracking: high override rate triggers model review
  - Escalation path: any user can flag an AI decision for review
```
