# Security and Compliance

[Back to Index](./00-index.md)

---

## Security Overview

Status page systems present a unique security profile: they must be highly accessible (public by design) while protecting administrative functions and subscriber data. The attack surface includes public APIs, webhook ingress from monitoring tools, subscriber PII, and the critical risk of unauthorized status manipulation.

### Security Principles

| Principle | Application |
|-----------|-------------|
| **Defense in Depth** | Multiple security layers (network, application, data) |
| **Least Privilege** | API keys scoped to specific operations |
| **Secure by Default** | New pages private until explicitly published |
| **Zero Trust** | Verify every request, even from "internal" sources |
| **Data Minimization** | Collect only necessary subscriber data |

---

## Authentication and Authorization

### Authentication Methods

| Method | Use Case | Strength | Notes |
|--------|----------|----------|-------|
| **API Keys** | Automation, CI/CD | Medium | Rotate regularly, scope to specific pages |
| **OAuth 2.0 / OIDC** | Admin dashboard | High | SSO integration, MFA support |
| **SAML** | Enterprise SSO | High | Corporate identity providers |
| **Token-based** | Subscriber actions | Medium | One-time use, expiring tokens |
| **None (public)** | Status page viewing | N/A | Rate limited |

### API Key Management

```
STRUCTURE APIKey:
    id: UUID
    status_page_id: UUID
    name: string              // Human-readable name
    key_hash: string          // bcrypt hash, never store plaintext
    key_prefix: string        // First 8 chars for identification
    scopes: string[]          // ["incidents:write", "components:write"]
    rate_limit: int           // Requests per minute
    ip_allowlist: string[]    // Optional IP restrictions
    expires_at: timestamp     // Optional expiration
    last_used_at: timestamp
    created_at: timestamp
    created_by: UUID          // User who created the key

SCOPES:
  - incidents:read          // Read incident data
  - incidents:write         // Create/update incidents
  - components:read         // Read component data
  - components:write        // Update component status
  - subscribers:read        // Read subscriber list
  - subscribers:write       // Manage subscribers
  - metrics:read            // Access uptime metrics
  - page:admin              // Full page administration

FUNCTION validate_api_key(key: string) -> (APIKey, error):
    prefix = key.substring(0, 8)
    candidates = query_by_prefix(prefix)

    FOR each candidate IN candidates:
        IF bcrypt_verify(key, candidate.key_hash):
            IF candidate.expires_at AND candidate.expires_at < now():
                RETURN (null, "API key expired")

            IF candidate.ip_allowlist AND request.ip NOT IN candidate.ip_allowlist:
                RETURN (null, "IP not in allowlist")

            update_last_used(candidate.id)
            RETURN (candidate, null)

    RETURN (null, "Invalid API key")
```

### Authorization Model (RBAC)

```
ROLES:
  owner:
    description: "Full control over status page"
    permissions: ["*"]

  admin:
    description: "Manage incidents and components"
    permissions:
      - incidents:*
      - components:*
      - subscribers:read
      - metrics:read

  operator:
    description: "Create and update incidents"
    permissions:
      - incidents:read
      - incidents:write
      - components:read
      - components:write

  viewer:
    description: "Read-only access"
    permissions:
      - incidents:read
      - components:read
      - metrics:read

FUNCTION authorize(user: User, resource: Resource, action: Action) -> boolean:
    user_role = get_role(user, resource.status_page_id)
    required_permission = "{resource.type}:{action}"

    IF "*" IN user_role.permissions:
        RETURN true

    IF required_permission IN user_role.permissions:
        RETURN true

    IF "{resource.type}:*" IN user_role.permissions:
        RETURN true

    RETURN false
```

---

## Data Security

### Encryption

| Data State | Encryption | Algorithm | Key Management |
|------------|------------|-----------|----------------|
| **At Rest (Database)** | Transparent | AES-256-GCM | Managed KMS |
| **At Rest (Backups)** | Encrypted | AES-256-GCM | Separate keys |
| **In Transit** | TLS | TLS 1.3 | Automated certs |
| **API Keys** | Hashed | bcrypt (cost 12) | N/A (one-way) |
| **Subscriber Tokens** | HMAC | SHA-256 | Per-page secrets |

### Sensitive Data Handling

```
SENSITIVE_DATA_CLASSIFICATION:
  HIGH:
    - API keys (hashed, never logged)
    - Webhook secrets
    - OAuth tokens

  MEDIUM:
    - Subscriber email addresses
    - Subscriber phone numbers
    - Webhook URLs

  LOW:
    - Incident titles and descriptions (public)
    - Component names (public)
    - Uptime metrics (public)

DATA_HANDLING_RULES:
  api_keys:
    storage: HASH_ONLY
    logging: MASK (show only prefix)
    display: SHOW_ONCE_ON_CREATION

  subscriber_email:
    storage: PLAINTEXT (needed for delivery)
    logging: MASK (show domain only)
    display: MASK (u***@example.com)
    export: INCLUDED (with consent)

  subscriber_phone:
    storage: PLAINTEXT (needed for SMS)
    logging: NEVER
    display: MASK (+1***789)
    export: INCLUDED (with consent)
```

### PII Protection

```
FUNCTION mask_email(email: string) -> string:
    parts = email.split("@")
    local = parts[0]
    domain = parts[1]

    IF len(local) <= 2:
        masked_local = local[0] + "*"
    ELSE:
        masked_local = local[0] + "*".repeat(len(local) - 2) + local[-1]

    RETURN masked_local + "@" + domain

FUNCTION mask_phone(phone: string) -> string:
    // E.164 format: +14155551234
    IF len(phone) < 4:
        RETURN "***"

    RETURN phone.substring(0, 3) + "*".repeat(len(phone) - 6) + phone.substring(-3)

// Logging middleware
FUNCTION sanitize_for_logging(data: object) -> object:
    sanitized = deep_copy(data)

    FOR each field IN SENSITIVE_FIELDS:
        IF field IN sanitized:
            sanitized[field] = mask_value(field, sanitized[field])

    RETURN sanitized
```

---

## Threat Model

### Attack Surface

```
┌─────────────────────────────────────────────────────────────────┐
│                     ATTACK SURFACE MAP                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PUBLIC SURFACE (Highest Exposure)                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  • Status page viewing (GET)                              │ │
│  │  • Subscriber registration (POST)                         │ │
│  │  • SSE connection establishment                           │ │
│  │  • Embedded widget loading                                │ │
│  │  • RSS/Atom feeds                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  AUTHENTICATED SURFACE (Medium Exposure)                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  • Incident management API (API key)                      │ │
│  │  • Component status API (API key)                         │ │
│  │  • Admin dashboard (OAuth/SAML)                           │ │
│  │  • Webhook ingress (HMAC signature)                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  INTERNAL SURFACE (Lower Exposure)                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  • Database connections                                   │ │
│  │  • Message queue access                                   │ │
│  │  • Internal service communication                         │ │
│  │  • Edge KV updates                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Threat Analysis

| Threat | Impact | Likelihood | Mitigation |
|--------|--------|------------|------------|
| **Unauthorized status update** | Critical (reputation) | Medium | API key auth, audit logging |
| **DDoS on status page** | High (unavailability) | High | Multi-CDN, rate limiting, edge absorption |
| **Subscriber data breach** | High (PII exposure) | Low | Encryption, access controls |
| **API key compromise** | High (unauthorized access) | Medium | Key rotation, IP allowlisting, alerting |
| **Webhook injection** | Medium (false incidents) | Medium | HMAC validation, source verification |
| **Account takeover** | High | Low | MFA, SSO, session management |
| **SQL injection** | Critical | Low | Parameterized queries, ORM |
| **XSS on status page** | Medium | Low | CSP, output encoding |

### Mitigation Strategies

#### DDoS Protection

```
DDOS_MITIGATION:
  layer_3_4:
    provider: CDN (built-in)
    capability: Absorb volumetric attacks
    capacity: 100+ Tbps

  layer_7:
    rate_limiting:
      public_pages:
        limit: 1000 requests/second/IP
        burst: 100
        action: BLOCK for 60 seconds

      api_endpoints:
        limit: 100 requests/minute/key
        burst: 20
        action: RETURN 429

      sse_connections:
        limit: 10 connections/IP
        action: REJECT new connections

    challenge_response:
      trigger: Anomalous traffic patterns
      method: JavaScript challenge
      bypass: Legitimate browsers only
```

#### API Key Security

```
API_KEY_SECURITY:
  generation:
    entropy: 256 bits (cryptographically random)
    format: sk_live_{random_32_chars}

  storage:
    algorithm: bcrypt
    cost_factor: 12
    plaintext: NEVER (show once on creation)

  usage:
    header: Authorization: Bearer {key}
    never_in_url: true
    never_logged: true (log prefix only)

  rotation:
    recommended_interval: 90 days
    grace_period: 24 hours (both keys valid)
    notification: Email admin before expiry

  compromise_response:
    1. Immediate revocation
    2. Generate new key
    3. Audit recent activity
    4. Alert affected users
```

#### Webhook Security

```
FUNCTION verify_webhook_signature(request: Request, secret: string) -> boolean:
    // Expected header: X-Signature: sha256=<hmac_hex>
    signature_header = request.headers["X-Signature"]

    IF NOT signature_header:
        RETURN false

    parts = signature_header.split("=")
    IF len(parts) != 2 OR parts[0] != "sha256":
        RETURN false

    provided_signature = parts[1]
    payload = request.body

    expected_signature = hmac_sha256(secret, payload).hex()

    // Constant-time comparison to prevent timing attacks
    RETURN constant_time_compare(provided_signature, expected_signature)

FUNCTION process_webhook(request: Request):
    // Step 1: Verify signature
    api_key = request.headers["X-API-Key"]
    webhook_config = get_webhook_config(api_key)

    IF NOT verify_webhook_signature(request, webhook_config.secret):
        log_security_event("WEBHOOK_SIGNATURE_INVALID", {api_key: api_key})
        RETURN Response(401, "Invalid signature")

    // Step 2: Verify timestamp (prevent replay)
    timestamp = request.headers["X-Timestamp"]
    IF abs(now() - parse_timestamp(timestamp)) > 5 * MINUTES:
        log_security_event("WEBHOOK_REPLAY_ATTEMPT", {api_key: api_key})
        RETURN Response(401, "Request too old")

    // Step 3: Verify source IP (if configured)
    IF webhook_config.ip_allowlist:
        IF request.ip NOT IN webhook_config.ip_allowlist:
            log_security_event("WEBHOOK_IP_REJECTED", {api_key: api_key, ip: request.ip})
            RETURN Response(403, "IP not allowed")

    // Step 4: Process webhook
    process_webhook_payload(request.body)
    RETURN Response(200, "OK")
```

---

## Compliance

### GDPR Compliance

| Requirement | Implementation |
|-------------|----------------|
| **Lawful Basis** | Consent (explicit opt-in for notifications) |
| **Data Minimization** | Collect only email/phone for notifications |
| **Right to Access** | Self-service data export |
| **Right to Erasure** | One-click unsubscribe + data deletion |
| **Data Portability** | JSON export of subscriber data |
| **Breach Notification** | 72-hour notification process |
| **Privacy by Design** | Encryption, access controls, audit logs |

### Subscriber Consent Flow

```
CONSENT_FLOW:
  1. User enters email/phone on subscribe form
  2. Show privacy policy link and consent checkbox
  3. Send confirmation email/SMS with opt-in link
  4. User clicks link to confirm (double opt-in)
  5. Store consent timestamp and source

SUBSCRIBER_CONSENT_RECORD:
  subscriber_id: UUID
  consent_given_at: timestamp
  consent_source: "web_form" | "api" | "import"
  consent_version: "v1.2"  // Privacy policy version
  ip_address: string       // For audit
  user_agent: string       // For audit

DATA_RETENTION:
  active_subscribers: UNTIL_UNSUBSCRIBE
  unsubscribed: 30 DAYS (for resubscription)
  consent_records: 7 YEARS (legal requirement)
  notification_logs: 1 YEAR
```

### CCPA Compliance

| Requirement | Implementation |
|-------------|----------------|
| **Right to Know** | Data export available |
| **Right to Delete** | Account deletion process |
| **Right to Opt-Out** | "Do Not Sell" honored (we don't sell) |
| **Non-Discrimination** | No service difference based on privacy choices |

### SOC 2 Controls

| Trust Principle | Control | Evidence |
|-----------------|---------|----------|
| **Security** | Access controls, encryption | IAM policies, TLS configs |
| **Availability** | Multi-region, monitoring | Uptime reports, DR tests |
| **Processing Integrity** | Input validation, audit logs | Code reviews, audit trails |
| **Confidentiality** | Data classification, encryption | Data inventory, key management |
| **Privacy** | Consent management, data retention | Privacy policy, deletion logs |

---

## Security Logging and Audit

### Security Events to Log

```
SECURITY_EVENTS:
  authentication:
    - LOGIN_SUCCESS
    - LOGIN_FAILURE
    - MFA_CHALLENGE
    - MFA_SUCCESS
    - MFA_FAILURE
    - API_KEY_USED
    - API_KEY_INVALID
    - SESSION_CREATED
    - SESSION_TERMINATED

  authorization:
    - ACCESS_GRANTED
    - ACCESS_DENIED
    - PERMISSION_ESCALATION

  data_access:
    - SUBSCRIBER_DATA_ACCESSED
    - SUBSCRIBER_DATA_EXPORTED
    - SUBSCRIBER_DELETED
    - BULK_DATA_EXPORT

  configuration:
    - API_KEY_CREATED
    - API_KEY_REVOKED
    - WEBHOOK_CONFIGURED
    - PERMISSION_CHANGED

  security_incidents:
    - RATE_LIMIT_EXCEEDED
    - SUSPICIOUS_PATTERN_DETECTED
    - WEBHOOK_SIGNATURE_INVALID
    - IP_BLOCKED

AUDIT_LOG_SCHEMA:
  id: UUID
  timestamp: timestamp
  event_type: string
  actor_type: "user" | "api_key" | "system"
  actor_id: string
  resource_type: string
  resource_id: string
  action: string
  result: "success" | "failure"
  ip_address: string
  user_agent: string
  metadata: JSON
  status_page_id: UUID
```

### Audit Log Retention

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Security events | 1 year | Hot storage |
| Access logs | 90 days | Hot storage |
| Authentication logs | 1 year | Warm storage |
| Compliance audit logs | 7 years | Cold storage |

---

## Incident Response

### Security Incident Classification

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| **Critical** | Active breach, data exposure | 15 minutes | Unauthorized access to subscriber data |
| **High** | Potential breach, service impact | 1 hour | API key compromise detected |
| **Medium** | Security misconfiguration | 4 hours | Weak permissions discovered |
| **Low** | Minor security issue | 24 hours | Dependency vulnerability |

### Incident Response Runbook

```
SECURITY_INCIDENT_RESPONSE:

  STEP_1_DETECT:
    sources:
      - Security monitoring alerts
      - Customer reports
      - Bug bounty submissions
      - Automated scans

  STEP_2_TRIAGE:
    - Classify severity
    - Identify scope (single tenant vs platform-wide)
    - Assign incident commander
    - Open incident channel

  STEP_3_CONTAIN:
    immediate_actions:
      - Revoke compromised credentials
      - Block suspicious IPs
      - Enable additional logging
      - Isolate affected systems if needed

  STEP_4_INVESTIGATE:
    - Review audit logs
    - Identify attack vector
    - Determine data exposure scope
    - Preserve evidence

  STEP_5_REMEDIATE:
    - Patch vulnerability
    - Rotate affected credentials
    - Update security controls
    - Deploy fixes

  STEP_6_COMMUNICATE:
    internal:
      - Update stakeholders
      - Document timeline
    external (if required):
      - Notify affected customers
      - Report to regulators (GDPR: 72 hours)
      - Public disclosure if warranted

  STEP_7_POST_INCIDENT:
    - Conduct blameless postmortem
    - Update threat model
    - Improve detection/prevention
    - Update runbooks
```

---

## Security Checklist

### Development Security

- [ ] All inputs validated and sanitized
- [ ] Parameterized queries (no string concatenation)
- [ ] Output encoding for XSS prevention
- [ ] CSRF tokens on state-changing operations
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Dependencies scanned for vulnerabilities
- [ ] Secrets not committed to code

### Infrastructure Security

- [ ] Network segmentation in place
- [ ] Firewalls configured (deny by default)
- [ ] TLS 1.3 enforced
- [ ] Certificates automated (no manual rotation)
- [ ] Encryption at rest enabled
- [ ] Backup encryption verified

### Operational Security

- [ ] MFA enforced for all admin access
- [ ] API keys rotated on schedule
- [ ] Access reviews conducted quarterly
- [ ] Security monitoring active
- [ ] Incident response plan tested
- [ ] Disaster recovery tested

---

## Next Steps

- [Observability](./07-observability.md) - Metrics, logging, tracing, and alerting
