# Security and Compliance

[← Back to Index](./00-index.md)

---

## Threat Model

### Attack Vectors

```
Threat Landscape:
─────────────────────────────────────────────────────────

1. DATA EXFILTRATION
   Threat: Unauthorized access to feature data
   Attacker: Malicious insider, compromised account
   Target: PII, sensitive features

   Attack paths:
   - Direct database access
   - API abuse (bulk export)
   - Query manipulation

2. FEATURE POISONING
   Threat: Injection of malicious feature values
   Attacker: Compromised data pipeline, malicious user
   Target: Model integrity, predictions

   Attack paths:
   - Compromised data source
   - Materialization pipeline injection
   - Direct online store manipulation

3. INFERENCE ATTACKS
   Threat: Deduce sensitive data from features
   Attacker: Authorized user with malicious intent
   Target: User privacy

   Attack paths:
   - Membership inference
   - Model inversion
   - Feature correlation analysis

4. DENIAL OF SERVICE
   Threat: Overwhelm feature store
   Attacker: External attacker, misconfigured client
   Target: Availability

   Attack paths:
   - Query flood
   - Large batch requests
   - Resource exhaustion

5. PRIVILEGE ESCALATION
   Threat: Access unauthorized feature views
   Attacker: Authorized user
   Target: Cross-team data

   Attack paths:
   - API authorization bypass
   - Token manipulation
   - Misconfigured permissions
```

### Security Architecture

```mermaid
flowchart TB
    subgraph External["External"]
        USER[User/Service]
    end

    subgraph Perimeter["Security Perimeter"]
        WAF[Web Application Firewall]
        RATE[Rate Limiter]
    end

    subgraph Auth["Authentication Layer"]
        IDP[Identity Provider]
        TOKEN[Token Validator]
    end

    subgraph Authz["Authorization Layer"]
        RBAC[RBAC Engine]
        POLICY[Policy Engine]
    end

    subgraph Data["Data Layer"]
        ENCRYPT[(Encrypted Storage)]
        MASK[Data Masking]
        AUDIT[Audit Logger]
    end

    USER --> WAF --> RATE
    RATE --> TOKEN
    TOKEN --> IDP
    TOKEN --> RBAC --> POLICY
    POLICY --> MASK --> ENCRYPT
    MASK --> AUDIT

    classDef external fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef perimeter fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef auth fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef authz fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class USER external
    class WAF,RATE perimeter
    class IDP,TOKEN auth
    class RBAC,POLICY authz
    class ENCRYPT,MASK,AUDIT data
```

---

## Authentication & Authorization

### Authentication Methods

```
Authentication Mechanisms:
─────────────────────────────────────────────────────────

1. API KEYS (Service-to-Service)
   Use case: ML training pipelines, inference services
   Implementation:
   - Unique key per service account
   - Stored hashed in database
   - Rotated every 90 days

   Request:
   Authorization: Bearer fs_sk_live_xxxxxxxxxxxx

2. OAuth 2.0 / OIDC (User Access)
   Use case: Data scientists via SDK, UI access
   Implementation:
   - Integrate with corporate IdP
   - JWT tokens with short expiry (1 hour)
   - Refresh tokens for long sessions

   Flow:
   1. User authenticates with IdP
   2. IdP returns JWT
   3. SDK includes JWT in requests
   4. Feature Store validates JWT

3. SERVICE MESH (Internal Services)
   Use case: Inter-service communication
   Implementation:
   - mTLS for all service-to-service
   - SPIFFE/SPIRE for identity
   - No explicit auth in application

4. IAM ROLES (Cloud Resources)
   Use case: Accessing offline store (S3, GCS)
   Implementation:
   - IAM roles for service accounts
   - Temporary credentials
   - Cross-account access where needed
```

### Authorization Model (RBAC + ABAC)

```
Role-Based Access Control (RBAC):
─────────────────────────────────────────────────────────

Predefined Roles:

ADMIN
  - All permissions
  - Manage users and roles
  - Delete feature views

FEATURE_ENGINEER
  - Create/update feature views
  - Run materialization
  - View all features in owned projects

DATA_SCIENTIST
  - Read features (online + offline)
  - Cannot modify feature definitions
  - Limited to assigned projects

ML_SERVICE
  - Read online features only
  - High throughput allowance
  - Cannot access offline store

VIEWER
  - Read feature definitions
  - Cannot access feature values
  - Search and discovery only

─────────────────────────────────────────────────────────

Attribute-Based Access Control (ABAC):
─────────────────────────────────────────────────────────

Attributes for Fine-Grained Control:

Subject attributes:
  - user.team
  - user.clearance_level
  - user.ip_address

Resource attributes:
  - feature_view.owner_team
  - feature_view.pii_level
  - feature_view.project

Environment attributes:
  - request.time
  - request.source_ip
  - request.region

Policy Examples:

# Allow access to PII features only for approved teams
ALLOW read ON feature_view
  WHERE feature_view.pii_level == "high"
  AND user.team IN feature_view.approved_teams
  AND user.clearance_level >= 3

# Restrict offline access to business hours
ALLOW read ON offline_store
  WHERE request.time BETWEEN 09:00 AND 18:00
  OR user.role == "admin"

# Limit cross-region access
ALLOW read ON online_store
  WHERE feature_view.region == request.region
  OR user.has_cross_region_access == true
```

### Feature-Level Access Control

```
Access Control Granularity:
─────────────────────────────────────────────────────────

PROJECT LEVEL (Coarse)
  - All features in project share permissions
  - Simple to manage
  - Risk: Over-permissioning

FEATURE VIEW LEVEL (Medium)
  - Permissions per feature view
  - Balance of control and simplicity
  - Recommended for most cases

FEATURE LEVEL (Fine)
  - Individual feature permissions
  - Maximum control
  - Complex to manage

─────────────────────────────────────────────────────────

Implementation:

# Feature View Definition with Access Control
feature_view:
  name: "user_financial_features"
  access_control:
    # Who can read this feature view
    read_principals:
      - team:fraud-detection
      - service:risk-scoring-service

    # Who can modify definition
    write_principals:
      - team:ml-platform

    # PII classification
    pii_level: high

    # Data residency
    allowed_regions:
      - us-west-2
      - us-east-1

# Access Check Implementation
def check_access(user, feature_view, action):
    # Check role-based permissions
    if action in user.role.permissions:
        # Check attribute-based policies
        if evaluate_abac_policies(user, feature_view, action):
            return ALLOW
    return DENY
```

---

## Data Protection

### Encryption

```
Encryption Strategy:
─────────────────────────────────────────────────────────

AT REST:

Online Store (Redis):
  - TLS for data in transit
  - Redis Enterprise: AES-256 encryption at rest
  - Key management: Cloud KMS integration

Online Store (DynamoDB):
  - AWS-managed encryption (default)
  - Customer-managed keys (CMK) for compliance
  - Transparent to application

Offline Store (S3/GCS):
  - Server-side encryption (SSE-S3/SSE-KMS)
  - Customer-managed keys for sensitive data
  - Bucket policies enforce encryption

─────────────────────────────────────────────────────────

IN TRANSIT:

All API communication:
  - TLS 1.3 required
  - Certificate pinning for SDK
  - Internal: mTLS between services

SDK to Feature Store:
  - HTTPS only (no HTTP fallback)
  - Certificate validation enforced

─────────────────────────────────────────────────────────

Key Management:

Hierarchy:
  Master Key (HSM) → Data Encryption Keys (DEKs)

Rotation:
  - Master Key: Annually (manual)
  - DEKs: Quarterly (automatic)
  - API Keys: 90 days

Storage:
  - Cloud KMS for master keys
  - Encrypted key storage for DEKs
  - Never in application code
```

### PII Handling

```
PII Feature Management:
─────────────────────────────────────────────────────────

CLASSIFICATION:

PII Levels:
  NONE: Non-sensitive (product_id, category)
  LOW: Quasi-identifiers (age_bucket, zip_code_prefix)
  MEDIUM: Indirect PII (device_id, session_id)
  HIGH: Direct PII (email, phone, ssn_hash)

Classification Process:
1. Auto-detection during feature registration
2. ML-based PII detection for new features
3. Manual review for high-risk features
4. Periodic re-classification

─────────────────────────────────────────────────────────

PROTECTION MECHANISMS:

1. DATA MASKING
   Apply at query time based on user permissions

   Full masking: ssn → "***-**-****"
   Partial masking: email → "j***@example.com"
   Hashing: user_id → SHA256(user_id + salt)

   Implementation:
   def apply_masking(features, user_permissions):
       for feature in features:
           if feature.pii_level > user_permissions.max_pii:
               features[feature.name] = mask(feature)
       return features

2. TOKENIZATION
   Replace PII with non-sensitive tokens

   Original: email = "john@example.com"
   Tokenized: email_token = "tok_abc123"
   Mapping stored in secure vault

3. DIFFERENTIAL PRIVACY
   Add noise to aggregated features

   Use case: Count features, statistics
   Implementation: Laplace noise based on sensitivity

4. K-ANONYMITY
   Ensure features can't identify individuals

   Generalization: age=32 → age_bucket="30-40"
   Suppression: Remove rare combinations

─────────────────────────────────────────────────────────

PII in Training Data:

Policy:
- PII features excluded from training by default
- Explicit opt-in required with justification
- Audit trail for PII usage in models

Implementation:
def get_historical_features(entity_df, feature_views, include_pii=False):
    if include_pii:
        require_permission(user, "pii_training_access")
        audit_log("PII_TRAINING_ACCESS", user, feature_views)
    else:
        feature_views = filter_pii_features(feature_views)
    return pit_join(entity_df, feature_views)
```

### Data Masking Rules

```
Masking Configuration:
─────────────────────────────────────────────────────────

# Feature Store masking configuration
masking_rules:
  - feature_pattern: "*_email"
    mask_type: partial
    config:
      preserve_first: 1
      preserve_domain: true
      # john@example.com → j***@example.com

  - feature_pattern: "*_phone"
    mask_type: full
    config:
      replacement: "***-***-****"

  - feature_pattern: "*_ssn"
    mask_type: hash
    config:
      algorithm: SHA256
      salt_key_id: "ssn_salt_v1"

  - feature_pattern: "*_ip_address"
    mask_type: truncate
    config:
      preserve_octets: 2
      # 192.168.1.100 → 192.168.x.x

  - feature_pattern: "*_dob"
    mask_type: generalize
    config:
      granularity: year
      # 1990-05-15 → 1990-01-01

─────────────────────────────────────────────────────────

Role-Based Masking:

# Different masking by role
role_masking:
  data_scientist:
    - feature: "user_email"
      mask: hash  # Consistent for joins, but not readable

  ml_service:
    - feature: "user_email"
      mask: none  # Production inference needs real data
      require: explicit_pii_permission

  analyst:
    - feature: "user_email"
      mask: full  # No access to actual PII
```

---

## Compliance

### GDPR Compliance

```
GDPR Requirements for Feature Store:
─────────────────────────────────────────────────────────

RIGHT TO ACCESS (Article 15):
  Requirement: User can request all data stored about them

  Implementation:
  - Endpoint: GET /v1/users/{user_id}/features
  - Returns: All feature values for user across all views
  - Format: Machine-readable (JSON, CSV)
  - Timeline: Within 30 days

RIGHT TO ERASURE (Article 17):
  Requirement: User can request deletion of their data

  Implementation:
  - Endpoint: DELETE /v1/users/{user_id}
  - Action:
    1. Delete from online store (immediate)
    2. Delete from offline store (within 30 days)
    3. Audit log retained (legal requirement)
  - Cascading: All feature views containing user

  Pseudocode:
  def delete_user(user_id):
      # Online store - immediate
      for feature_view in get_feature_views_for_entity("user"):
          online_store.delete(f"{user_id}:{feature_view}")

      # Offline store - scheduled job
      schedule_deletion_job(user_id, entity_type="user")

      # Audit log
      audit_log("GDPR_DELETION", user_id)

RIGHT TO RECTIFICATION (Article 16):
  Requirement: User can correct inaccurate data

  Implementation:
  - Features are derived, not directly editable
  - Correction: Fix source data, re-materialize
  - Timeline: Within 30 days of source correction

DATA MINIMIZATION (Article 5):
  Requirement: Collect only necessary data

  Implementation:
  - Feature review process before creation
  - Justification required for PII features
  - Automatic flagging of unused features

─────────────────────────────────────────────────────────

Data Retention Policies:

Feature Type        | Retention  | Justification
--------------------|------------|---------------
Real-time features  | 7 days     | Session-based
Activity features   | 90 days    | Model training window
Profile features    | 2 years    | Customer relationship
Audit logs          | 7 years    | Legal requirement
Deleted user data   | 0 days     | GDPR compliance
```

### SOC 2 Controls

```
SOC 2 Trust Criteria for Feature Store:
─────────────────────────────────────────────────────────

SECURITY (CC6):

CC6.1 - Logical Access Controls:
  ✓ RBAC with least privilege
  ✓ Service accounts with limited scope
  ✓ MFA for human access
  ✓ Regular access reviews (quarterly)

CC6.2 - System Boundaries:
  ✓ Network segmentation (VPC, subnets)
  ✓ Firewall rules (allow-list only)
  ✓ No public internet access for data stores

CC6.3 - External Parties:
  ✓ Vendor security assessments
  ✓ Data processing agreements
  ✓ Cloud provider compliance (SOC 2 Type II)

─────────────────────────────────────────────────────────

AVAILABILITY (A1):

A1.1 - Capacity Management:
  ✓ Auto-scaling configured
  ✓ Capacity planning quarterly
  ✓ Performance monitoring

A1.2 - Environmental Protections:
  ✓ Multi-region deployment
  ✓ Automated failover
  ✓ Disaster recovery plan (tested annually)

─────────────────────────────────────────────────────────

CONFIDENTIALITY (C1):

C1.1 - Confidential Information:
  ✓ Data classification (PII levels)
  ✓ Encryption at rest and in transit
  ✓ Access logging

C1.2 - Disposal:
  ✓ Secure deletion procedures
  ✓ Cryptographic erasure for retired keys
```

### Audit Logging

```
Audit Log Requirements:
─────────────────────────────────────────────────────────

WHAT TO LOG:

Access Events:
  - Feature reads (online and offline)
  - Feature view creation/modification
  - User/service authentication
  - Authorization decisions (allow/deny)

Data Events:
  - Feature materialization
  - Feature deletion
  - Schema changes
  - Bulk exports

Administrative Events:
  - Permission changes
  - Configuration changes
  - System maintenance

─────────────────────────────────────────────────────────

LOG SCHEMA:

{
  "timestamp": "2026-01-26T10:30:00Z",
  "event_type": "FEATURE_READ",
  "actor": {
    "type": "service",
    "id": "inference-service-prod",
    "ip": "10.0.1.50"
  },
  "resource": {
    "type": "feature_view",
    "id": "user_profile_features",
    "project": "recommendations"
  },
  "action": {
    "type": "get_online_features",
    "entity_count": 100,
    "feature_count": 20
  },
  "outcome": {
    "status": "success",
    "latency_ms": 8
  },
  "context": {
    "request_id": "req_abc123",
    "trace_id": "trace_xyz789"
  }
}

─────────────────────────────────────────────────────────

RETENTION AND STORAGE:

Retention: 7 years (compliance requirement)
Storage: Append-only log store (immutable)
Format: JSON lines, compressed
Access: Read-only for audit, no modification

Alerting:
  - Anomalous access patterns
  - Bulk data exports
  - Permission changes
  - Failed authentication spikes
```

---

## Security Best Practices

```
Security Checklist:
─────────────────────────────────────────────────────────

INFRASTRUCTURE:
  [ ] All data stores in private subnets
  [ ] No direct internet access to databases
  [ ] Security groups with minimal rules
  [ ] VPC peering for cross-account access
  [ ] Regular security patching

AUTHENTICATION:
  [ ] No shared credentials
  [ ] API keys rotated every 90 days
  [ ] Service accounts with minimal permissions
  [ ] MFA for all human access
  [ ] SSO integration

AUTHORIZATION:
  [ ] Least privilege by default
  [ ] Feature-level access control
  [ ] Regular permission audits
  [ ] Separation of duties (dev/prod)

DATA:
  [ ] Encryption at rest (all stores)
  [ ] TLS 1.3 in transit
  [ ] PII classification and masking
  [ ] Data retention policies enforced

MONITORING:
  [ ] All access logged
  [ ] Anomaly detection enabled
  [ ] Alert on sensitive data access
  [ ] Regular log review

INCIDENT RESPONSE:
  [ ] Incident response plan documented
  [ ] Contact list maintained
  [ ] Regular drills conducted
  [ ] Post-incident reviews
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Initial security and compliance documentation |
