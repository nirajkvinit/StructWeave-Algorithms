# Security & Compliance — Incident Management System

## 1. Threat Model

The incident management system occupies a uniquely sensitive position in the security landscape: it has knowledge of every ongoing incident (including security incidents), the phone numbers and contact details of every on-call engineer, and the escalation paths that reveal organizational hierarchy. Compromising this system gives an attacker both intelligence about the organization's current vulnerabilities AND the ability to suppress alerts about their own activity.

### 1.1 Key Threat Actors

| Threat Actor | Motivation | Attack Vector |
|-------------|-----------|---------------|
| **External attacker (post-breach)** | Suppress alerts about their intrusion | Disable notifications, modify escalation policies, acknowledge security alerts |
| **Insider (malicious)** | Cover tracks during unauthorized activity | Modify on-call schedules, suppress alerts for specific services |
| **Insider (negligent)** | Accidental exposure of incident details | Share incident links publicly, screenshot PII in alert payloads |
| **Alert flooding attacker** | Denial-of-service via alert fatigue | Flood the system with fake alerts to desensitize responders or exhaust notification quotas |

### 1.2 Critical Assets

| Asset | Sensitivity | Risk |
|-------|------------|------|
| Alert payloads | May contain stack traces, error messages with customer data | PII exposure, GDPR/CCPA violation |
| On-call contact info | Phone numbers, email addresses | Targeted phishing, harassment |
| Escalation policies | Organizational hierarchy and response structure | Social engineering, targeted attack planning |
| Incident details | Current vulnerabilities, active security incidents | Attack amplification, reputation damage |
| API keys (integrations) | Access to create/modify/suppress alerts | Alert manipulation, false sense of security |
| Runbook credentials | Automation access to production systems | Unauthorized production access via runbook execution |

---

## 2. Authentication & Authorization

### 2.1 Authentication Model

| Context | Mechanism | Details |
|---------|-----------|---------|
| **Web UI / Dashboard** | SSO with SAML/OIDC + MFA | Primary authentication; federated with corporate IdP |
| **Emergency access** | Local accounts with hardware tokens | Bypass SSO when IdP is down (the IdP might be the system that's failing) |
| **API (integration)** | API keys with IP allowlisting | Per-integration keys with scoped permissions |
| **API (user)** | OAuth 2.0 bearer tokens | Short-lived tokens (15 min) with refresh |
| **Mobile app** | Biometric + push-based authentication | Device-bound credentials for incident acknowledgment |
| **Phone/SMS acknowledgment** | Callback verification + PIN | Engineer must enter a PIN to acknowledge via IVR; prevents call forwarding attacks |

### 2.2 Emergency Access (Break-Glass)

When the SSO provider is down (which may be the very incident being responded to), engineers must still be able to:
- Log into the incident dashboard
- Acknowledge incidents
- Modify on-call schedules

**Implementation:**
- Maintain a separate, local authentication store (not dependent on SSO)
- Break-glass accounts use hardware security keys (not passwords)
- Break-glass access is automatically logged and triggers a security review within 24 hours
- Break-glass sessions are time-limited (4 hours max)

### 2.3 Authorization Model (RBAC + ABAC)

```
Role Hierarchy:
  Platform Admin
    └── Team Admin
         └── Responder
              └── Stakeholder (read-only)

Permission Matrix:
                          Platform  Team     Responder  Stakeholder
                          Admin     Admin
  ──────────────────────  ────────  ────────  ────────  ──────────
  Create/modify services    ✓         ✓
  Modify escalation policy  ✓         ✓
  Modify on-call schedule   ✓         ✓
  Acknowledge incidents     ✓         ✓         ✓
  Resolve incidents         ✓         ✓         ✓
  Reassign incidents        ✓         ✓         ✓
  Execute runbooks          ✓         ✓         ✓*
  View incidents            ✓         ✓         ✓         ✓
  Modify notification rules ✓         ✓         ✓ (own)
  View on-call schedules    ✓         ✓         ✓         ✓
  Create integrations       ✓         ✓
  View audit logs           ✓
  Manage users              ✓

  * Responders can execute non-destructive runbooks; destructive runbooks require Team Admin approval
```

**Attribute-Based Access Control (ABAC) extensions:**
- **Team scoping** — A Team Admin can only modify schedules and policies for their own teams
- **Service scoping** — A Responder can only acknowledge incidents for services their team owns
- **Time-based** — Certain actions (e.g., modifying escalation policies) require additional approval outside business hours

---

## 3. PII and Sensitive Data Handling

### 3.1 PII in Alert Payloads

Alert payloads frequently contain sensitive information that the originating monitoring system included unintentionally:

| Data Type | How It Gets Into Alerts | Risk |
|-----------|------------------------|------|
| Customer email addresses | Error messages: "Failed to send email to user@example.com" | GDPR Article 5, CCPA |
| IP addresses | Stack traces, network error messages | PII in some jurisdictions |
| Authentication tokens | Debug logs in error payloads | Token theft |
| Database queries | Slow query alerts with parameterized queries containing user data | Data leakage |
| Stack traces | Full exception traces with local variable values | PII, secrets in variables |

### 3.2 PII Scrubbing Pipeline

```
FUNCTION ScrubAlertPayload(payload):
    // Layer 1: Pattern-based scrubbing
    patterns = [
        EMAIL_REGEX    → "[REDACTED_EMAIL]",
        CREDIT_CARD    → "[REDACTED_CC]",
        SSN_REGEX      → "[REDACTED_SSN]",
        JWT_REGEX      → "[REDACTED_TOKEN]",
        IP_V4_REGEX    → "[REDACTED_IP]",
        PHONE_REGEX    → "[REDACTED_PHONE]"
    ]

    FOR (pattern, replacement) IN patterns:
        payload = RegexReplace(payload, pattern, replacement)

    // Layer 2: Key-based scrubbing (JSON field names)
    sensitive_keys = ["password", "token", "secret", "authorization",
                      "credit_card", "ssn", "api_key"]

    FOR key IN payload.AllKeys():
        IF key.ToLower() IN sensitive_keys:
            payload[key] = "[REDACTED]"

    // Layer 3: Custom scrubbing rules (per-integration)
    custom_rules = IntegrationConfig.Get(payload.integration_id).scrub_rules
    FOR rule IN custom_rules:
        payload = rule.Apply(payload)

    RETURN payload
```

### 3.3 Data Retention and Right-to-Erasure

| Data Type | Retention | Right to Erasure | Notes |
|-----------|-----------|-----------------|-------|
| Alert payloads (scrubbed) | 90 days | Yes (delete or fully anonymize) | Scrubbed version retained; original never stored |
| Incident records | 3 years | Pseudonymize (replace user refs with hashes) | Needed for trend analysis and compliance |
| Notification records | 1 year | Yes | Phone numbers, delivery records |
| Postmortems | Indefinite | Redact names on request | Knowledge base value; anonymize authors |
| Audit logs | 7 years | No (regulatory requirement) | May need to pseudonymize user identifiers |

---

## 4. API Security

### 4.1 Integration API Key Management

- **Key generation** — Cryptographically random, 256-bit keys; displayed once at creation, never stored in plaintext (hashed with bcrypt)
- **Key scoping** — Each key is scoped to specific permissions (e.g., "can only create alerts for service X") and IP ranges
- **Key rotation** — Support for two active keys per integration (old + new) during rotation windows; rotation recommended every 90 days
- **Rate limiting** — Per-key rate limits; abusive keys are automatically throttled

### 4.2 Alert Injection Prevention

An attacker who obtains an integration API key can inject false alerts, causing:
- Alert fatigue (flood of fake P1 alerts → engineers ignore real alerts)
- Misdirection (fake alert on Service A while attacking Service B)
- Resource exhaustion (overwhelm notification quotas)

**Mitigations:**
- **Webhook signature verification** — All inbound webhooks require HMAC signature verification
- **Source IP validation** — Integration keys are bound to expected source IP ranges
- **Alert rate anomaly detection** — Flag integrations that suddenly produce 100x their normal alert volume
- **Human-in-the-loop for new integrations** — New API keys start in "shadow mode" (alerts are created but don't trigger notifications) for 24 hours

---

## 5. Runbook Security

### 5.1 Sandboxed Execution

Runbooks execute diagnostic and remediation actions on production systems. This is the most dangerous capability in the platform.

| Security Control | Implementation |
|-----------------|----------------|
| **Execution isolation** | Runbooks run in ephemeral, sandboxed containers with no persistent filesystem access |
| **Credential injection** | Production credentials are injected at runtime via a secrets manager; never stored in the runbook definition |
| **Least privilege** | Each runbook is assigned a scoped service account with only the permissions needed for its specific actions |
| **Approval gates** | Destructive actions (restart service, scale down, modify config) require real-time approval from a Team Admin |
| **Audit logging** | Every command executed by a runbook is logged with full input/output, execution user, and approval chain |
| **Timeout enforcement** | Runbooks have hard execution timeouts; a runbook that hangs cannot hold credentials indefinitely |
| **Network isolation** | Runbook execution environment can only reach pre-approved network endpoints |

### 5.2 Runbook Version Control

- All runbook changes are versioned and require review (pull-request-style approval)
- Runbook executions reference a specific version (immutable after execution)
- Rollback capability: revert a runbook to any previous version instantly

---

## 6. Compliance

### 6.1 SOC 2 Controls

| Control Area | Implementation |
|-------------|----------------|
| **CC6.1 — Access control** | RBAC with team scoping; MFA enforced; break-glass procedures documented |
| **CC6.2 — Logical access** | API keys scoped and rotated; session management with idle timeout |
| **CC7.2 — Monitoring** | All access to incident data logged; anomaly detection on admin actions |
| **CC8.1 — Change management** | Escalation policy changes versioned; schedule changes audited; runbook changes reviewed |
| **A1.2 — Availability** | Multi-region active-active; documented RTO/RPO; quarterly DR testing |

### 6.2 Audit Trail

Every action in the system produces an immutable audit log entry:

```
AuditEntry:
  id              : UUID
  timestamp       : TIMESTAMP (microsecond precision)
  actor_id        : UUID (user or API key)
  actor_type      : ENUM [user, api_key, system, runbook]
  action          : STRING (e.g., "incident.acknowledge", "schedule.override.create")
  resource_type   : STRING (e.g., "incident", "schedule", "escalation_policy")
  resource_id     : UUID
  before_state    : JSON (snapshot before the change)
  after_state     : JSON (snapshot after the change)
  ip_address      : STRING
  user_agent      : STRING
  correlation_id  : UUID (links related audit entries)
```

Audit logs are written to an append-only store (write-once, never modified or deleted) with cryptographic chaining (each entry includes the hash of the previous entry) to detect tampering.

### 6.3 Regional Data Residency

For organizations operating under GDPR, data residency rules apply:
- Alert payloads from EU-sourced integrations are processed and stored exclusively in EU regions
- Notification records (containing phone numbers) respect regional data storage requirements
- Cross-region replication excludes PII fields or uses tokenization (replace PII with region-local tokens)
