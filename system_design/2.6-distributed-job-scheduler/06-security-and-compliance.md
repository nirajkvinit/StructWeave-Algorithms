# Security & Compliance

[← Back to Scalability](./05-scalability-and-reliability.md) | [Next: Observability →](./07-observability.md)

---

## Threat Model

### Attack Surface

```mermaid
flowchart TB
    subgraph External["External Threats"]
        ATK1[Malicious User]
        ATK2[Compromised Client]
        ATK3[External Attacker]
    end

    subgraph API["API Layer"]
        GW[API Gateway]
        AUTH[Auth Service]
    end

    subgraph Core["Core Services"]
        SCH[Scheduler]
        WORK[Workers]
        QUEUE[Queue]
    end

    subgraph Data["Data Layer"]
        DB[(Database)]
        SECRETS[Secret Store]
        LOGS[Log Storage]
    end

    ATK1 -->|1. Unauthorized Access| GW
    ATK2 -->|2. Malicious Jobs| GW
    ATK3 -->|3. Network Attacks| GW

    GW --> AUTH
    AUTH --> SCH
    SCH --> DB
    SCH --> QUEUE
    QUEUE --> WORK
    WORK --> SECRETS
    WORK --> LOGS

    style ATK1 fill:#ff6b6b
    style ATK2 fill:#ff6b6b
    style ATK3 fill:#ff6b6b
```

### Threat Categories

| Category | Threat | Impact | Likelihood |
|----------|--------|--------|------------|
| **Authentication** | API key theft | High | Medium |
| **Authorization** | Privilege escalation | High | Low |
| **Job Injection** | Malicious job payload | Critical | Medium |
| **Resource Exhaustion** | Fork bomb, infinite loops | High | Medium |
| **Data Exposure** | Secrets in logs | High | Medium |
| **Network** | Man-in-the-middle | Medium | Low |
| **Supply Chain** | Compromised dependencies | Critical | Low |

---

## Authentication

### API Authentication

```
Supported Methods:

1. API Keys (Service-to-Service)
   - Long-lived tokens for internal services
   - Scoped to specific tenants/permissions
   - Rotatable without downtime

2. OAuth 2.0 / OIDC (User Access)
   - Short-lived access tokens
   - Refresh token rotation
   - SSO integration

3. mTLS (Worker Authentication)
   - Client certificates for workers
   - Certificate rotation via orchestration
   - Strong machine identity

Request Authentication Flow:
┌─────────────────────────────────────────────────────────────┐
│ Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9 │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Validate JWT        │
│ - Signature valid?  │
│ - Not expired?      │
│ - Issuer trusted?   │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Extract Claims      │
│ - tenant_id         │
│ - user_id           │
│ - scopes            │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Authorize Request   │
│ - Has required      │
│   scope?            │
│ - Tenant matches?   │
└─────────────────────┘
```

### Worker Authentication

```
mTLS Certificate Structure:

Subject: CN=worker-pool-a.scheduler.internal
SAN: DNS:worker-pool-a.scheduler.internal
Issuer: CN=Scheduler Internal CA
Validity: 24 hours (auto-renewed)

Certificate Attributes:
- worker_pool: "pool-a"
- environment: "production"
- capabilities: ["execute_jobs", "report_status"]

Validation:
1. Certificate chain valid
2. Certificate not revoked (CRL/OCSP)
3. Worker pool authorized for queue
4. Certificate not expired
```

---

## Authorization

### Role-Based Access Control (RBAC)

```
Role Hierarchy:

TENANT_ADMIN
├── Can manage all jobs within tenant
├── Can manage tenant users
├── Can view all execution history
└── Can configure tenant settings

JOB_OWNER
├── Can CRUD own jobs
├── Can trigger own jobs
├── Can view own execution history
└── Cannot modify others' jobs

JOB_VIEWER
├── Can view job definitions
├── Can view execution history
└── Cannot modify or trigger jobs

SYSTEM_ADMIN (Internal)
├── Cross-tenant access
├── System configuration
├── Maintenance operations
└── Audit log access
```

### Permission Matrix

| Resource | Action | Tenant Admin | Job Owner | Job Viewer |
|----------|--------|--------------|-----------|------------|
| Job | Create | Yes | Yes | No |
| Job | Read | Tenant | Own | Tenant |
| Job | Update | Tenant | Own | No |
| Job | Delete | Tenant | Own | No |
| Job | Trigger | Tenant | Own | No |
| Execution | View | Tenant | Own | Tenant |
| Execution | Cancel | Tenant | Own | No |
| Logs | View | Tenant | Own | Tenant |

### Authorization Enforcement

```
FUNCTION authorize_request(user, action, resource):
    // 1. Get user's roles for tenant
    roles = get_user_roles(user.id, resource.tenant_id)

    IF roles.is_empty():
        THROW ForbiddenException("No access to tenant")

    // 2. Check if any role permits action
    FOR role IN roles:
        permissions = get_role_permissions(role)
        IF permissions.allows(action, resource):
            RETURN AUTHORIZED

    // 3. Check resource ownership
    IF action IN [UPDATE, DELETE, TRIGGER]:
        IF resource.owner_id == user.id:
            RETURN AUTHORIZED

    THROW ForbiddenException("Insufficient permissions")


// Example policy definition
Policy: job_owner_permissions
  Resources: jobs/*
  Actions: [create, read, update, delete, trigger]
  Condition: resource.owner_id == request.user_id

Policy: tenant_viewer_permissions
  Resources: jobs/*, executions/*
  Actions: [read]
  Condition: resource.tenant_id == request.user.tenant_id
```

---

## Data Security

### Encryption at Rest

| Data Type | Encryption Method | Key Management |
|-----------|-------------------|----------------|
| Job Definitions | AES-256-GCM | KMS |
| Execution Records | AES-256-GCM | KMS |
| Job Payloads | AES-256-GCM | Per-tenant keys |
| Secrets | AES-256-GCM + Envelope | Dedicated secret store |
| Logs | AES-256-GCM | Separate log encryption key |

### Encryption in Transit

```
TLS Configuration:

Minimum Version: TLS 1.3
Cipher Suites:
- TLS_AES_256_GCM_SHA384
- TLS_CHACHA20_POLY1305_SHA256
- TLS_AES_128_GCM_SHA256

Certificate Requirements:
- RSA 2048-bit minimum (4096 preferred)
- ECDSA P-256 or P-384
- Validity: 90 days maximum
- Auto-renewal via cert-manager

Internal Traffic:
- Service mesh (mTLS between all services)
- No plaintext internal communication
```

### Secrets Management

```
Secret Handling Flow:

1. Job Definition (Secret Reference)
   {
       "payload": {
           "api_key": "${secrets.API_KEY}",
           "db_password": "${secrets.DB_PASSWORD}"
       }
   }

2. Secret Resolution (At Execution Time)
   Worker fetches secrets from vault just before execution
   Never stored in job payload or logs

3. Secret Injection
   Inject as environment variables
   Memory-only (not written to disk)
   Cleared after execution

Secret Store Integration:
├── HashiCorp Vault
├── Cloud KMS (AWS KMS, GCP KMS, Azure Key Vault)
└── Kubernetes Secrets (for k8s workers)

Secret Rotation:
- Secrets rotated on schedule (30-90 days)
- Jobs continue working during rotation
- Old secrets remain valid for grace period
```

### PII and Sensitive Data

```
Data Classification:

CONFIDENTIAL:
- API keys, passwords, tokens
- Encryption: Always, at rest and in transit
- Logging: Never log

SENSITIVE:
- Email addresses, user IDs
- Encryption: At rest
- Logging: Masked (user***@example.com)

INTERNAL:
- Job names, schedules
- Encryption: At rest
- Logging: Allowed

PUBLIC:
- System metrics, aggregated stats
- Encryption: In transit
- Logging: Allowed

Data Masking in Logs:
BEFORE: {"api_key": "sk_live_abc123xyz"}
AFTER:  {"api_key": "sk_live_***REDACTED***"}
```

---

## Job Security

### Job Payload Validation

```
Validation Rules:

1. Schema Validation
   - Job payload must match expected schema
   - Reject unknown fields
   - Type checking for all fields

2. Content Security
   - No executable code in payload (unless explicitly allowed)
   - URL validation (allow-listed domains only)
   - Size limits (max 64 KB payload)

3. Injection Prevention
   - Sanitize string inputs
   - Parameterized queries only
   - No shell command construction from user input

Validation Pipeline:
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Schema     │───▶│   Content    │───▶│  Business    │
│   Check      │    │   Scan       │    │  Rules       │
└──────────────┘    └──────────────┘    └──────────────┘
     │                    │                    │
     ▼                    ▼                    ▼
  Reject if           Reject if           Reject if
  invalid schema      malicious           rule violation
```

### Resource Limits

```
Per-Job Limits:
{
    "max_execution_time_seconds": 3600,      // 1 hour
    "max_memory_mb": 2048,                    // 2 GB
    "max_cpu_cores": 2,
    "max_output_size_mb": 100,
    "max_log_size_mb": 50,
    "max_network_connections": 100
}

Per-Tenant Limits:
{
    "max_concurrent_executions": 100,
    "max_jobs": 10000,
    "max_executions_per_day": 100000,
    "max_payload_size_kb": 64
}

Enforcement:
- Hard limits enforced by container runtime
- Soft limits trigger warnings
- Exceeded limits terminate job with clear error
```

### Worker Isolation

```
Isolation Layers:

LAYER 1: Network Isolation
├── Workers in isolated network segment
├── Egress firewall (allow-listed destinations)
├── No direct internet access (via proxy only)
└── Service mesh for internal communication

LAYER 2: Container Isolation
├── Non-root execution
├── Read-only filesystem
├── No privileged capabilities
├── Seccomp profiles
└── AppArmor/SELinux policies

LAYER 3: Resource Isolation
├── CPU limits (cgroups)
├── Memory limits (OOM killer)
├── Disk I/O limits
└── Network bandwidth limits

LAYER 4: Process Isolation
├── PID namespace isolation
├── Separate /tmp per job
├── Clean environment variables
└── No access to host processes
```

---

## Audit Logging

### Audit Events

| Event Category | Events Logged |
|----------------|---------------|
| **Authentication** | Login, logout, token refresh, auth failure |
| **Authorization** | Permission denied, role change |
| **Job Management** | Create, update, delete, pause, resume |
| **Execution** | Start, complete, fail, cancel, retry |
| **Admin Actions** | Config change, user management |

### Audit Log Format

```
{
    "timestamp": "2024-01-15T10:30:00.000Z",
    "event_type": "JOB_CREATED",
    "event_id": "evt_abc123",
    "actor": {
        "type": "USER",
        "id": "user_xyz",
        "ip_address": "192.168.1.100",
        "user_agent": "SchedulerSDK/1.0"
    },
    "resource": {
        "type": "JOB",
        "id": "job_123",
        "tenant_id": "tenant_456"
    },
    "action": "CREATE",
    "result": "SUCCESS",
    "metadata": {
        "job_name": "daily-report",
        "schedule": "0 9 * * *"
    },
    "request_id": "req_789"
}
```

### Audit Log Retention

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Authentication | 2 years | Immutable storage |
| Authorization | 2 years | Immutable storage |
| Job Operations | 1 year | Standard storage |
| Executions | 90 days | Standard storage |
| System Events | 90 days | Standard storage |

---

## Compliance

### Regulatory Frameworks

| Framework | Requirements | Implementation |
|-----------|--------------|----------------|
| **SOC 2 Type II** | Security controls, availability | Audit logging, encryption, access controls |
| **GDPR** | Data protection, right to deletion | Data encryption, deletion APIs, consent tracking |
| **HIPAA** | PHI protection | Encryption, audit trails, BAA with customers |
| **PCI DSS** | Cardholder data security | Network segmentation, encryption, logging |

### Data Residency

```
Data Residency Configuration:

Tenant Settings:
{
    "tenant_id": "tenant_eu",
    "data_residency": "EU",
    "allowed_regions": ["eu-west-1", "eu-central-1"],
    "prohibited_regions": ["us-*", "ap-*"]
}

Enforcement:
1. Job creation validates region
2. Worker selection respects residency
3. Logs stored in compliant region
4. Replication limited to allowed regions
```

### Right to Deletion (GDPR Article 17)

```
Deletion Request Flow:

1. User requests deletion via API
2. System identifies all related data:
   - Job definitions
   - Execution history
   - Logs referencing user
   - Audit events (retained with masking)

3. Deletion execution:
   - Soft delete immediately (data inaccessible)
   - Hard delete within 30 days
   - Purge from backups within 90 days

4. Confirmation:
   - Audit log entry (deletion completed)
   - Notification to user

Note: Audit logs retained but PII masked
```

---

## Security Checklist

### Development Phase
- [ ] Input validation on all endpoints
- [ ] Parameterized queries (no SQL injection)
- [ ] Output encoding (no XSS)
- [ ] Secrets never in code or logs
- [ ] Dependency vulnerability scanning

### Deployment Phase
- [ ] TLS 1.3 enforced everywhere
- [ ] mTLS for internal services
- [ ] Network segmentation configured
- [ ] Worker isolation verified
- [ ] Secrets in vault (not env vars)

### Operations Phase
- [ ] Audit logging enabled
- [ ] Log monitoring for anomalies
- [ ] Regular penetration testing
- [ ] Incident response plan documented
- [ ] Security training for team

---

**Next:** [Observability →](./07-observability.md)
