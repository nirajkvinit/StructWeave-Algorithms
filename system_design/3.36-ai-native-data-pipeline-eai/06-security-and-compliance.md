# Security & Compliance

## Security Architecture Overview

```mermaid
flowchart TB
    subgraph External["External Boundary"]
        Users["Users"]
        Sources["Data Sources"]
        Consumers["Data Consumers"]
    end

    subgraph Perimeter["Perimeter Security"]
        WAF["Web Application<br/>Firewall"]
        DDoS["DDoS<br/>Protection"]
        Gateway["API<br/>Gateway"]
    end

    subgraph AuthN["Authentication Layer"]
        IdP["Identity<br/>Provider"]
        MFA["Multi-Factor<br/>Auth"]
        ServiceAuth["Service<br/>Accounts"]
    end

    subgraph AuthZ["Authorization Layer"]
        RBAC["Role-Based<br/>Access Control"]
        ABAC["Attribute-Based<br/>Access Control"]
        ColumnSec["Column-Level<br/>Security"]
    end

    subgraph DataSec["Data Security"]
        Encryption["Encryption<br/>(Rest/Transit)"]
        Masking["Data<br/>Masking"]
        Tokenization["Tokenization"]
    end

    subgraph Monitoring["Security Monitoring"]
        SIEM["SIEM<br/>Integration"]
        Audit["Audit<br/>Logging"]
        Alerts["Security<br/>Alerts"]
    end

    Users --> WAF --> Gateway --> IdP
    Sources --> ServiceAuth --> Gateway
    Consumers --> Gateway

    IdP --> MFA --> RBAC
    ServiceAuth --> RBAC
    RBAC --> ABAC --> ColumnSec

    ColumnSec --> Encryption
    Encryption --> Masking
    Masking --> Tokenization

    DataSec --> Audit --> SIEM --> Alerts

    classDef external fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef perimeter fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef authn fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef authz fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef datasec fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef monitoring fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class Users,Sources,Consumers external
    class WAF,DDoS,Gateway perimeter
    class IdP,MFA,ServiceAuth authn
    class RBAC,ABAC,ColumnSec authz
    class Encryption,Masking,Tokenization datasec
    class SIEM,Audit,Alerts monitoring
```

---

## Authentication & Authorization

### Authentication Mechanisms

| User Type | AuthN Method | Token Type | Session Duration |
|-----------|--------------|------------|------------------|
| **Human Users** | OAuth2/OIDC + MFA | JWT | 8 hours |
| **Service Accounts** | API Keys + mTLS | JWT | 24 hours |
| **Pipelines** | Service Identity | Short-lived JWT | 1 hour |
| **External APIs** | API Keys | N/A | Per request |
| **Admin Access** | SSO + MFA + Approval | JWT | 4 hours |

### OAuth2/OIDC Flow

```mermaid
sequenceDiagram
    participant User
    participant App as EAI Platform
    participant IdP as Identity Provider
    participant API as API Gateway

    User->>App: Access Request
    App->>IdP: Redirect to IdP
    User->>IdP: Authenticate (username/password)
    IdP->>IdP: MFA Challenge
    User->>IdP: MFA Verification
    IdP->>App: Authorization Code
    App->>IdP: Exchange Code for Tokens
    IdP->>App: Access Token + Refresh Token
    App->>API: API Request + Access Token
    API->>API: Validate Token
    API->>App: Protected Resource
```

### Role-Based Access Control (RBAC)

| Role | Permissions | Scope |
|------|-------------|-------|
| **Admin** | Full access, user management | Platform-wide |
| **Data Engineer** | Create/modify pipelines, view all data | Assigned projects |
| **Data Analyst** | Read data, view lineage, run queries | Assigned datasets |
| **Operator** | Monitor, troubleshoot, restart pipelines | All pipelines |
| **Auditor** | Read-only access to all audit logs | Platform-wide |
| **Service Account** | Pipeline execution, API access | Assigned pipelines |

### Attribute-Based Access Control (ABAC)

```pseudocode
AccessPolicy {
    name: "PII Data Access"

    // Subject attributes
    subject: {
        roles: ["Data Engineer", "Data Analyst"],
        department: ["Analytics", "Security"],
        training_completed: "PII_HANDLING"
    }

    // Resource attributes
    resource: {
        classification: ["PII", "SENSITIVE"],
        data_type: ["email", "phone", "ssn"]
    }

    // Environment attributes
    environment: {
        time: "business_hours",
        location: ["office_network", "vpn"],
        device_compliance: true
    }

    // Action
    action: ["read", "query"]  // No write/export

    // Conditions
    conditions: [
        "subject.training_completed == 'PII_HANDLING'",
        "environment.device_compliance == true"
    ]
}
```

### Column-Level Security

```mermaid
flowchart TB
    subgraph Query["User Query"]
        SQL["SELECT * FROM customers"]
    end

    subgraph Policy["Column Policies"]
        EmailPolicy["email: mask_email()"]
        SSNPolicy["ssn: tokenize()"]
        NamePolicy["name: visible"]
    end

    subgraph Result["Query Result"]
        EmailMasked["email: j***@example.com"]
        SSNTokenized["ssn: TOKEN_ABC123"]
        NameVisible["name: John Smith"]
    end

    SQL --> Policy
    EmailPolicy --> EmailMasked
    SSNPolicy --> SSNTokenized
    NamePolicy --> NameVisible

    classDef query fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef policy fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef result fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class SQL query
    class EmailPolicy,SSNPolicy,NamePolicy policy
    class EmailMasked,SSNTokenized,NameVisible result
```

---

## Data Security

### Encryption Strategy

| Data State | Encryption | Key Management |
|------------|------------|----------------|
| **At Rest** | AES-256-GCM | Customer-managed keys (CMK) |
| **In Transit** | TLS 1.3 | Automatic certificate rotation |
| **In Processing** | Memory encryption | Secure enclaves (optional) |
| **In Backup** | AES-256-GCM | Separate backup keys |
| **In LLM Prompts** | Redacted/masked | N/A (PII removed) |

### Key Management Architecture

```mermaid
flowchart TB
    subgraph KeyHierarchy["Key Hierarchy"]
        MasterKey["Master Key<br/>(HSM)"]
        DataKey["Data Encryption<br/>Key (DEK)"]
        KeyWrap["Key Encryption<br/>Key (KEK)"]
    end

    subgraph KeyOps["Key Operations"]
        Rotate["Key<br/>Rotation"]
        Audit["Key Access<br/>Audit"]
        Revoke["Key<br/>Revocation"]
    end

    subgraph Usage["Key Usage"]
        TableEnc["Table<br/>Encryption"]
        ColumnEnc["Column<br/>Encryption"]
        BackupEnc["Backup<br/>Encryption"]
    end

    MasterKey --> KeyWrap
    KeyWrap --> DataKey

    DataKey --> TableEnc
    DataKey --> ColumnEnc
    DataKey --> BackupEnc

    MasterKey --> Rotate
    DataKey --> Audit
    KeyWrap --> Revoke

    classDef key fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef ops fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef usage fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class MasterKey,DataKey,KeyWrap key
    class Rotate,Audit,Revoke ops
    class TableEnc,ColumnEnc,BackupEnc usage
```

### PII Detection and Handling

```pseudocode
FUNCTION process_data_with_pii_detection(record):
    pii_fields = []

    FOR each field IN record:
        // ML-based PII detection
        pii_probability = pii_classifier.predict(field.value)

        IF pii_probability > 0.8:
            pii_type = classify_pii_type(field.value)
            pii_fields.append({
                field: field.name,
                type: pii_type,
                confidence: pii_probability
            })

    // Apply protection based on policy
    FOR each pii IN pii_fields:
        policy = get_pii_policy(pii.type)

        SWITCH policy.action:
            CASE MASK:
                record[pii.field] = mask_value(record[pii.field], pii.type)
            CASE TOKENIZE:
                record[pii.field] = tokenize_value(record[pii.field])
            CASE ENCRYPT:
                record[pii.field] = encrypt_column(record[pii.field])
            CASE REDACT:
                record[pii.field] = "[REDACTED]"

    // Log PII detection for audit
    log_pii_detection(record.id, pii_fields)

    RETURN record
```

### Data Masking Rules

| PII Type | Masking Function | Example Input | Example Output |
|----------|------------------|---------------|----------------|
| **Email** | Partial mask | john.doe@example.com | j***.d**@example.com |
| **Phone** | Last 4 digits | +1-555-123-4567 | ***-***-**-4567 |
| **SSN** | Tokenize | 123-45-6789 | TOK_A1B2C3D4 |
| **Credit Card** | First 4, last 4 | 4111-1111-1111-1111 | 4111-****-****-1111 |
| **Name** | Pseudonymize | John Smith | Person_ABC123 |
| **Address** | Generalize | 123 Main St, NYC | [City: New York] |
| **DOB** | Age range | 1985-03-15 | Age: 35-40 |

---

## Threat Model

### Top Attack Vectors

| Attack Vector | Threat | Likelihood | Impact | Mitigation |
|---------------|--------|------------|--------|------------|
| **SQL Injection** | Data exfiltration | Medium | Critical | Parameterized queries, WAF |
| **Credential Theft** | Unauthorized access | High | Critical | MFA, short-lived tokens, rotation |
| **Insider Threat** | Data leak | Medium | High | RBAC, audit logging, DLP |
| **API Abuse** | Service disruption | High | High | Rate limiting, anomaly detection |
| **Supply Chain** | Malicious code | Low | Critical | Dependency scanning, SBOMs |
| **Prompt Injection** | LLM manipulation | Medium | Medium | Input sanitization, output validation |
| **Data Poisoning** | ML model compromise | Low | High | Data validation, lineage tracking |

### Threat Mitigation Matrix

```mermaid
flowchart TB
    subgraph Threats["Threat Categories"]
        External["External<br/>Attacks"]
        Insider["Insider<br/>Threats"]
        DataThreats["Data<br/>Threats"]
    end

    subgraph Mitigations["Mitigation Controls"]
        Perimeter["Perimeter<br/>Security"]
        Access["Access<br/>Controls"]
        DataProt["Data<br/>Protection"]
        Monitor["Monitoring &<br/>Detection"]
    end

    subgraph Outcomes["Security Outcomes"]
        Prevention["Attack<br/>Prevention"]
        Detection["Threat<br/>Detection"]
        Response["Incident<br/>Response"]
    end

    External --> Perimeter --> Prevention
    Insider --> Access --> Prevention
    DataThreats --> DataProt --> Prevention

    Perimeter --> Monitor --> Detection
    Access --> Monitor --> Detection
    DataProt --> Monitor --> Detection

    Monitor --> Response

    classDef threat fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef mitigation fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef outcome fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class External,Insider,DataThreats threat
    class Perimeter,Access,DataProt,Monitor mitigation
    class Prevention,Detection,Response outcome
```

### LLM-Specific Security

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Prompt Injection** | Malicious input to LLM | Input sanitization, prompt templates |
| **Data Leakage** | PII in prompts | PII detection and redaction before LLM |
| **Output Manipulation** | Malicious generated code | SQL validation, sandboxed execution |
| **Model Extraction** | Stealing model behavior | Rate limiting, output monitoring |
| **Hallucination** | False but convincing output | Validation against schema, human review |

---

## Compliance Framework

### Regulatory Requirements

| Regulation | Scope | Key Requirements | Implementation |
|------------|-------|------------------|----------------|
| **GDPR** | EU personal data | Consent, data portability, right to erasure | Consent management, data catalog |
| **HIPAA** | US health data | PHI protection, access controls, audit | Encryption, BAAs, audit logging |
| **SOC 2** | Service organizations | Security, availability, confidentiality | Controls framework, annual audit |
| **PCI DSS** | Payment card data | Cardholder data protection | Tokenization, network segmentation |
| **CCPA** | California consumers | Consumer rights, data sale opt-out | Privacy controls, data inventory |

### GDPR Compliance

```mermaid
flowchart TB
    subgraph DataSubject["Data Subject Rights"]
        Access["Right to<br/>Access"]
        Rectify["Right to<br/>Rectification"]
        Erase["Right to<br/>Erasure"]
        Port["Right to<br/>Portability"]
    end

    subgraph Implementation["Platform Implementation"]
        Catalog["Data<br/>Catalog"]
        Lineage["Data<br/>Lineage"]
        Consent["Consent<br/>Management"]
        Export["Data<br/>Export"]
    end

    subgraph Process["Processes"]
        DSR["DSR<br/>Workflow"]
        Audit["Audit<br/>Trail"]
        DPO["DPO<br/>Dashboard"]
    end

    Access --> Catalog --> DSR
    Rectify --> Lineage --> DSR
    Erase --> Lineage --> DSR
    Port --> Export --> DSR

    DSR --> Audit
    Audit --> DPO
    Consent --> Audit

    classDef rights fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef impl fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef process fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class Access,Rectify,Erase,Port rights
    class Catalog,Lineage,Consent,Export impl
    class DSR,Audit,DPO process
```

### Data Subject Request (DSR) Handling

```pseudocode
FUNCTION handle_data_subject_request(request):
    // Step 1: Verify identity
    IF NOT verify_identity(request.subject):
        RETURN RequestDenied("Identity verification failed")

    // Step 2: Find all data for subject
    data_locations = lineage_service.find_data_for_subject(request.subject_id)

    // Step 3: Process based on request type
    SWITCH request.type:
        CASE ACCESS:
            data = collect_all_data(data_locations)
            RETURN generate_access_report(data)

        CASE ERASURE:
            // Check if erasure is allowed
            retention_holds = check_retention_requirements(data_locations)
            IF retention_holds:
                RETURN RequestDenied("Data under legal hold")

            FOR each location IN data_locations:
                delete_data(location, request.subject_id)
                log_deletion(location, request)

            RETURN ErasureComplete()

        CASE PORTABILITY:
            data = collect_all_data(data_locations)
            export = generate_portable_format(data)
            RETURN export

        CASE RECTIFICATION:
            FOR each correction IN request.corrections:
                update_data(correction.location, correction.field, correction.new_value)
                log_rectification(correction, request)

            RETURN RectificationComplete()

    // Step 4: Log request for audit
    audit_log.record(request, result)
```

### Data Residency

| Region | Data Types Allowed | Storage Location | Compute Location |
|--------|-------------------|------------------|------------------|
| **EU** | EU personal data | EU data centers | EU region |
| **US** | US data, global data | US data centers | US region |
| **APAC** | Regional data | Singapore/Sydney | APAC region |
| **Global** | Non-personal data | Any region | Nearest region |

---

## Audit & Logging

### Audit Event Categories

| Category | Events | Retention | Access |
|----------|--------|-----------|--------|
| **Authentication** | Login, logout, MFA | 2 years | Security team |
| **Authorization** | Permission changes, access denials | 7 years | Auditors |
| **Data Access** | Queries, exports, downloads | 7 years | Compliance |
| **Data Modification** | Creates, updates, deletes | 7 years | Compliance |
| **Pipeline Execution** | Runs, errors, remediations | 1 year | Operations |
| **Admin Actions** | Config changes, user management | 7 years | Auditors |

### Audit Log Schema

```
AuditEvent {
    event_id:       UUID
    timestamp:      Timestamp
    event_type:     String              // e.g., "DATA_ACCESS", "AUTH_LOGIN"

    // Actor
    actor_id:       String
    actor_type:     String              // USER, SERVICE, SYSTEM
    actor_ip:       String
    actor_location: String

    // Action
    action:         String              // e.g., "READ", "WRITE", "DELETE"
    resource_type:  String              // e.g., "PIPELINE", "TABLE", "COLUMN"
    resource_id:    String

    // Context
    request_id:     String
    session_id:     String
    user_agent:     String

    // Result
    outcome:        String              // SUCCESS, FAILURE, DENIED
    error_code:     String
    error_message:  String

    // Data sensitivity
    data_classification: String         // PUBLIC, INTERNAL, CONFIDENTIAL, PII
    pii_accessed:   Boolean
    columns_accessed: String[]
}
```

### Log Integrity Protection

```mermaid
flowchart LR
    subgraph Source["Log Sources"]
        App["Application<br/>Logs"]
        Audit["Audit<br/>Events"]
        Security["Security<br/>Events"]
    end

    subgraph Processing["Log Processing"]
        Collector["Log<br/>Collector"]
        Hasher["Hash<br/>Generator"]
        Signer["Digital<br/>Signer"]
    end

    subgraph Storage["Immutable Storage"]
        WORM["WORM<br/>Storage"]
        Archive["Long-term<br/>Archive"]
    end

    subgraph Verification["Integrity Verification"]
        Verify["Hash<br/>Verification"]
        Alert["Tampering<br/>Alert"]
    end

    App --> Collector
    Audit --> Collector
    Security --> Collector

    Collector --> Hasher
    Hasher --> Signer
    Signer --> WORM
    WORM --> Archive

    WORM --> Verify
    Verify -->|Mismatch| Alert

    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef process fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef storage fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef verify fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class App,Audit,Security source
    class Collector,Hasher,Signer process
    class WORM,Archive storage
    class Verify,Alert verify
```

---

## Security Checklist

### Pre-Deployment Security Review

- [ ] All secrets stored in secret manager (not in code/config)
- [ ] TLS 1.3 enabled for all external connections
- [ ] Authentication required for all API endpoints
- [ ] RBAC configured with least privilege
- [ ] PII detection enabled for all data pipelines
- [ ] Audit logging enabled and shipping to SIEM
- [ ] Encryption at rest enabled for all storage
- [ ] Rate limiting configured on API gateway
- [ ] Vulnerability scanning in CI/CD pipeline
- [ ] Penetration test completed

### Ongoing Security Operations

- [ ] Weekly vulnerability scan review
- [ ] Monthly access review
- [ ] Quarterly penetration testing
- [ ] Annual compliance audit
- [ ] Continuous security monitoring
- [ ] Regular key rotation (90 days)
- [ ] Incident response drill (bi-annual)

---

## Security Summary

```
+------------------------------------------------------------------------+
|                      SECURITY SUMMARY                                   |
+------------------------------------------------------------------------+
|                                                                         |
|  AUTHENTICATION                    AUTHORIZATION                        |
|  --------------                    -------------                         |
|  OAuth2/OIDC + MFA for users       RBAC: 6 predefined roles            |
|  API Keys + mTLS for services      ABAC: PII access policies            |
|  Short-lived JWTs                  Column-level security                |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  DATA PROTECTION                   COMPLIANCE                           |
|  ---------------                   ----------                           |
|  AES-256-GCM at rest              GDPR: Full DSR support               |
|  TLS 1.3 in transit               HIPAA: PHI controls, BAAs            |
|  PII detection & masking          SOC 2: Annual audit                  |
|  Tokenization for sensitive       PCI DSS: Cardholder protection       |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  AUDIT & MONITORING                                                     |
|  ------------------                                                     |
|  All actions logged (7 year retention)                                 |
|  SIEM integration for real-time alerting                               |
|  Immutable log storage (WORM)                                          |
|  Regular access reviews                                                 |
|                                                                         |
+------------------------------------------------------------------------+
```
