# 15.3 Security & Compliance

## Authentication & Authorization

### Authentication Mechanisms

| Interface | AuthN Method | Details |
|---|---|---|
| **Ingestion API (agent-to-platform)** | Mutual TLS + API Key | Agents authenticate with client certificates (mTLS) for transport security; API key in header for tenant identification and rate limit association |
| **Search API (user-to-platform)** | OAuth 2.0 / OIDC | SSO integration; short-lived access tokens (15 min); refresh tokens for session continuity; PKCE for browser-based clients |
| **Admin API (config management)** | OAuth 2.0 + MFA | Configuration changes (retention policies, PII rules, access grants) require multi-factor authentication; audit-logged |
| **Service-to-service (internal)** | mTLS with SPIFFE/SPIRE | Workload identity; no static credentials; automatic certificate rotation (24-hour TTL) |

### Authorization Model: RBAC with Data Stream Scoping

```
Role Hierarchy:
  Platform Admin
    └── Can: manage all tenants, configure system-wide policies, access all data
  Tenant Admin
    └── Can: manage tenant configuration, create data streams, grant access
  Data Stream Owner
    └── Can: configure stream settings, grant read/write access to stream
  Engineer (Read)
    └── Can: search and query within granted data streams
  Service Account (Write)
    └── Can: ingest logs to specific data streams
  Auditor (Read-Only)
    └── Can: read audit logs and compliance reports, no data modification

Access Control Matrix:
  Permission = (principal, action, resource_scope)

  Examples:
    ("team-payments", "search", "streams/payment-*")         // Team can search their streams
    ("sre-oncall", "search", "streams/*")                     // SRE can search all streams
    ("service-payment-api", "ingest", "streams/payment-app")  // Service can write to its stream
    ("auditor-external", "search", "streams/audit-*")         // Auditor reads only audit logs
```

### Field-Level Access Control

```
FUNCTION enforce_field_level_access(query_result: LogEvent, user: Principal) -> LogEvent:
    // Some fields are restricted based on user role
    restricted_fields = get_restricted_fields(query_result.data_stream)

    FOR field IN restricted_fields:
        IF NOT has_field_access(user, field):
            query_result.attributes[field] = "[REDACTED - insufficient permissions]"

    RETURN query_result

// Example restricted fields:
//   "user.email"     -> accessible only to "privacy-team" and "security-team"
//   "request.body"   -> accessible only to "data-stream-owner"
//   "auth.token"     -> never accessible (always redacted at ingestion)
```

---

## Data Security

### Encryption

| Layer | Method | Details |
|---|---|---|
| **In Transit** | TLS 1.3 | All communication encrypted: agent-to-queue, queue-to-processor, processor-to-indexer, client-to-query-API. Certificate rotation every 24 hours via SPIFFE/SPIRE. Minimum cipher: AES-256-GCM. |
| **At Rest (Hot/Warm)** | AES-256 volume encryption | Full-disk encryption on all storage nodes. Encryption keys managed by external KMS. Key rotation every 90 days. |
| **At Rest (Cold/Frozen)** | Server-side encryption (SSE) | Object storage encryption with customer-managed keys (CMK). Enables key revocation for tenant-level data deletion. |
| **In Processing** | Memory encryption | Sensitive fields processed in memory; no swap-to-disk for PII processing nodes. Memory cleared on process exit. |

### PII Detection & Redaction Pipeline

The PII redaction engine operates inline in the processing layer, before indexing. This ensures PII never reaches persistent storage.

```
FUNCTION pii_redaction_pipeline(event: LogEvent, policy: PIIPolicy) -> LogEvent:
    // Phase 1: Structured field scan
    FOR field_name, field_value IN event.attributes:
        // Check against known PII field names
        IF field_name IN policy.known_pii_fields:
            // ["email", "phone", "ssn", "credit_card", "password", "token", "secret"]
            event.attributes[field_name] = redact(field_value, policy.strategy)

    // Phase 2: Pattern-based detection on message body
    FOR pattern IN policy.patterns:
        matches = regex_findall(pattern.regex, event.body)
        FOR match IN matches:
            event.body = event.body.replace(match, redact(match, policy.strategy))

    // Phase 3: Context-aware detection (ML-based, optional)
    IF policy.ml_detection_enabled:
        detections = ml_pii_detector.scan(event.body)
        FOR detection IN detections:
            IF detection.confidence > policy.ml_confidence_threshold:
                event.body = event.body.replace(
                    detection.text,
                    redact(detection.text, policy.strategy)
                )

    RETURN event

FUNCTION redact(value: string, strategy: string) -> string:
    SWITCH strategy:
        CASE "mask":
            // "john@example.com" -> "j***@e*********m"
            RETURN mask_preserving_format(value)
        CASE "hash":
            // "john@example.com" -> "sha256:a1b2c3d4..."
            // Deterministic: same input always produces same hash
            // Enables correlation without exposing PII
            RETURN "sha256:" + sha256_hmac(value, tenant_secret_key)
        CASE "remove":
            RETURN "[REDACTED]"
        CASE "tokenize":
            // Replace with reversible token (for authorized de-tokenization)
            token = token_vault.tokenize(value)
            RETURN "tok:" + token
```

### PII Detection Patterns

| PII Type | Pattern | Example |
|---|---|---|
| Email | `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` | `user@example.com` |
| Phone (intl.) | `\+?[1-9]\d{1,14}` | `+14155551234` |
| SSN (US) | `\d{3}-\d{2}-\d{4}` | `123-45-6789` |
| Credit Card | `\b(?:\d[ -]*?){13,19}\b` (Luhn validated) | `4111-1111-1111-1111` |
| IPv4 Address | `\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b` | `192.168.1.42` |
| API Key/Token | `(?:api[_-]?key\|token\|bearer\|secret)[=: ]+["']?([a-zA-Z0-9_\-]{20,})` | `api_key=sk_live_abc123...` |
| JWT | `eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+` | `eyJhbGciOiJIUzI1NiJ9.eyJ...` |

### Data Masking for Non-Production

```
FUNCTION mask_for_non_prod(event: LogEvent, source_env: string, target_env: string) -> LogEvent:
    IF source_env == "production" AND target_env != "production":
        // When copying production logs to staging/dev for debugging:
        // 1. Apply aggressive PII redaction (all strategies set to "remove")
        // 2. Replace service-specific identifiers with synthetic values
        // 3. Preserve log structure and patterns but not content
        event = pii_redaction_pipeline(event, AGGRESSIVE_POLICY)
        event = anonymize_identifiers(event)
    RETURN event
```

---

## Threat Model

### Top Attack Vectors

| # | Attack Vector | Risk Level | Description |
|---|---|---|---|
| 1 | **Log Injection / Log Forging** | High | Attacker crafts log entries with malicious content (fake timestamps, spoofed severity, injected fields) to mislead investigators or trigger false alerts |
| 2 | **PII Exfiltration via Logs** | High | Developer accidentally logs sensitive data (passwords, tokens, PII); attacker with log read access extracts it |
| 3 | **Denial of Service via Log Flooding** | Medium | Compromised service floods the log pipeline with massive volume, exhausting ingestion capacity and storage |
| 4 | **Privilege Escalation via Query API** | Medium | User crafts queries to access data streams they shouldn't have access to (tenant escape, field-level bypass) |
| 5 | **Tampering with Audit Logs** | High | Attacker with admin access modifies or deletes security-relevant log entries to cover tracks |

### Mitigations

| Attack | Mitigation |
|---|---|
| **Log Injection** | Input validation at ingestion: reject events with future timestamps (> 5 min clock skew), enforce maximum event size (1MB), validate source identity (mTLS agent certificate must match claimed service); query UI HTML-encodes log content to prevent XSS from log messages |
| **PII Exfiltration** | Inline PII redaction before indexing (never store raw PII); field-level access control; audit log for all search queries (who searched what, when); anomaly detection on search patterns (unusual volume or patterns from a user) |
| **DoS via Log Flooding** | Per-service ingestion rate limits (events/s and bytes/s); per-tenant daily quota; anomaly detection on ingestion volume (alert on 10x spike from single source); sampling/dropping of excess traffic (preserve ERROR, drop DEBUG first) |
| **Privilege Escalation** | Tenant isolation at query planner level (tenant_id injected from authentication token, not from query); data stream access checked before query execution; no cross-tenant query capability even for admin (separate admin audit path) |
| **Audit Log Tampering** | Immutable audit log stream: separate data stream with write-only access (no delete API); append-only storage with hash chaining (each entry includes hash of previous entry); cross-region replication with independent access control; separate retention policy (minimum 7 years for compliance) |

### Rate Limiting & DDoS Protection

```
Rate Limiting Tiers:
  Layer 1: Network (edge firewall)
    - Connection rate: 10,000 new connections/second per source IP
    - Bandwidth: 100 MB/s per source IP

  Layer 2: API Gateway
    - Per API key: 10,000 events/second (ingestion), 100 queries/second (search)
    - Per tenant: 100,000 events/second, 500 queries/second
    - Global: 5,000,000 events/second (system capacity)

  Layer 3: Application
    - Per data stream: configurable quota (default 50,000 events/second)
    - Per query: scan limit (10GB), time limit (30s), result limit (10,000 events)
    - Per user: concurrent query limit (20)
```

---

## Compliance Frameworks

### GDPR Compliance

| Requirement | Implementation |
|---|---|
| **Right to Erasure (Art. 17)** | Log deletion API per data subject identifier; PII redaction at ingestion removes most personal data proactively; for historical data, batch redaction job scans and redacts matching records across all tiers; deletion confirmed via audit log |
| **Data Minimization (Art. 5)** | Configurable log sampling reduces volume; PII redaction removes unnecessary personal data; retention policies enforce automatic deletion; field-level filtering can exclude sensitive fields at ingestion |
| **Lawful Basis** | Legitimate interest for operational logs (debugging, security); consent for user-activity logs; documented legal basis per data stream in configuration |
| **Data Processing Agreements** | Log data processing documented in system configuration; cross-border transfer controls (data residency per tenant); processor agreements with object storage providers |
| **Breach Notification** | Security log monitoring (separate alerting pipeline); automated detection of unusual access patterns; audit trail for all data access |

### SOC 2 Type II

| Control | Implementation |
|---|---|
| **CC6.1 - Logical Access** | RBAC with data-stream scoping; MFA for admin access; quarterly access reviews |
| **CC6.6 - System Boundaries** | Tenant isolation at all layers; network segmentation between ingestion, storage, and query tiers |
| **CC7.2 - Monitoring** | Meta-monitoring of the log system itself; alerting on security-relevant events (failed auth, rate limit violations, unusual query patterns) |
| **CC8.1 - Change Management** | Configuration changes via versioned, audited API; rollback capability for all configuration changes |

### HIPAA (Healthcare Log Data)

| Requirement | Implementation |
|---|---|
| **PHI Protection** | Aggressive PII redaction for healthcare tenant data streams; specific patterns for medical record numbers, diagnosis codes, patient names |
| **Access Controls** | Role-based access with minimum necessary principle; field-level access control for PHI fields |
| **Audit Trail** | All access to healthcare log streams logged with user identity, timestamp, query, and result count; audit logs retained 7 years |
| **Encryption** | AES-256 encryption at rest and in transit; separate encryption keys per healthcare tenant |

### PCI-DSS (Payment Log Data)

| Requirement | Implementation |
|---|---|
| **Cardholder Data** | Credit card numbers redacted at ingestion (pattern detection + Luhn validation); no PAN stored in any tier; CVV/CVC never logged |
| **Access Logging** | All access to payment data streams logged; quarterly review of access logs |
| **Retention** | Payment log data retained minimum 1 year (online), minimum 5 years (archive); configurable per regulation |
| **Network Segmentation** | Payment log data streams isolated to dedicated storage nodes; separate encryption keys |

---

## Compliance-Driven Retention Matrix

| Data Classification | Hot (Days) | Warm (Days) | Cold (Days) | Frozen (Days) | Total Retention |
|---|---|---|---|---|---|
| **Operational (default)** | 7 | 23 | 60 | 275 | 365 days (1 year) |
| **Security/Audit** | 30 | 60 | 275 | 2,190 | 7 years |
| **Healthcare (HIPAA)** | 14 | 46 | 305 | 2,190 | 7 years |
| **Payment (PCI-DSS)** | 7 | 23 | 335 | 1,460 | 5 years |
| **Debug/Trace** | 3 | 4 | 0 | 0 | 7 days |
| **Performance/Metrics-from-Logs** | 7 | 23 | 60 | 0 | 90 days |
