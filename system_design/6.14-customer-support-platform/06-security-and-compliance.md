# Security & Compliance

## Multi-Tenancy Isolation

### Data Isolation Model

The platform uses **shared-schema multi-tenancy** where all tenants share the same database schema, but every row includes a `tenant_id` column. Isolation is enforced at multiple layers:

```
PSEUDOCODE: Multi-Layer Tenant Isolation

// Layer 1: API Gateway - Tenant Context Extraction
FUNCTION extract_tenant_context(request):
    // Tenant identified by: subdomain, API key, or JWT claim
    tenant_id = NULL

    IF request.header("X-API-Key"):
        api_key = lookup_api_key(request.header("X-API-Key"))
        tenant_id = api_key.tenant_id
    ELSE IF request.jwt_claims:
        tenant_id = request.jwt_claims.tenant_id
    ELSE IF request.subdomain:
        tenant_id = lookup_tenant_by_subdomain(request.subdomain)

    IF tenant_id IS NULL:
        RETURN 401 Unauthorized

    // Inject tenant_id into request context (propagated to all downstream services)
    request.context.tenant_id = tenant_id
    RETURN request


// Layer 2: Service Layer - Mandatory Tenant Scoping
FUNCTION get_tickets(request):
    tenant_id = request.context.tenant_id  // ALWAYS present

    // Every query MUST include tenant_id filter
    // This is enforced by the ORM/query builder middleware
    tickets = db.query(
        "SELECT * FROM tickets WHERE tenant_id = ? AND status = ?",
        tenant_id, request.params.status
    )
    RETURN tickets


// Layer 3: Database Layer - Row-Level Security
// Database policy ensures no query can access rows without matching tenant_id
// Even if application code has a bug, the database prevents cross-tenant access
POLICY tenant_isolation ON tickets:
    USING (tenant_id = current_setting('app.tenant_id'))

// Before each request, set the database session variable:
SET app.tenant_id = '{tenant_id}';
```

### Tenant Context Propagation

```
PSEUDOCODE: Context Propagation Across Services

// Tenant context flows through all service calls via headers
FUNCTION call_downstream_service(service, endpoint, payload, context):
    headers = {
        "X-Tenant-ID": context.tenant_id,
        "X-Request-ID": context.request_id,
        "X-Trace-ID": context.trace_id,
        "X-Actor-ID": context.actor_id,
        "X-Actor-Type": context.actor_type  // agent, customer, system
    }

    response = http_call(service, endpoint, payload, headers)

    // Downstream service validates tenant_id matches its data
    RETURN response

// For async events (message queue), tenant_id is part of the event envelope:
EVENT_ENVELOPE = {
    "tenant_id": "tnt_abc123",
    "event_type": "ticket.created",
    "event_id": "evt_xyz789",
    "timestamp": "2026-03-08T14:30:00Z",
    "payload": { ... }
}
```

---

## Authentication & Authorization

### Authentication Flows

| Actor | Auth Method | Token Type | Lifetime |
|-------|-----------|-----------|----------|
| **Agent (web)** | SSO/OIDC or email+password | JWT access + refresh token | Access: 15 min, Refresh: 7 days |
| **Agent (mobile)** | SSO/OIDC or email+password | JWT access + refresh token | Access: 15 min, Refresh: 30 days |
| **Customer (chat widget)** | Anonymous + email identification | Session token (JWT) | Session: 24 hours |
| **Customer (help center)** | Email+password or SSO | JWT access token | Access: 1 hour |
| **API integration** | API key (per tenant) | API key (bearer) | No expiry; rotatable |
| **Webhook (inbound)** | HMAC signature verification | N/A | Per-request signature |

### Role-Based Access Control (RBAC)

```
PSEUDOCODE: Agent Permission Model

ENUM AgentRole:
    ADMIN = "admin"          // Full tenant configuration + all agent capabilities
    SUPERVISOR = "supervisor" // Team management, reporting, ticket reassignment
    AGENT = "agent"          // Ticket handling, chat, knowledge base contribution
    LIGHT_AGENT = "light"    // Read-only + internal notes only (no customer-facing replies)

PERMISSION_MATRIX = {
    "ticket.create":        [ADMIN, SUPERVISOR, AGENT],
    "ticket.view_own":      [ADMIN, SUPERVISOR, AGENT, LIGHT_AGENT],
    "ticket.view_all":      [ADMIN, SUPERVISOR],
    "ticket.reply":         [ADMIN, SUPERVISOR, AGENT],
    "ticket.internal_note": [ADMIN, SUPERVISOR, AGENT, LIGHT_AGENT],
    "ticket.reassign":      [ADMIN, SUPERVISOR],
    "ticket.delete":        [ADMIN],
    "ticket.merge":         [ADMIN, SUPERVISOR],

    "chat.handle":          [ADMIN, SUPERVISOR, AGENT],
    "chat.monitor":         [ADMIN, SUPERVISOR],  // View all active chats
    "chat.transfer":        [ADMIN, SUPERVISOR, AGENT],

    "kb.create_article":    [ADMIN, SUPERVISOR, AGENT],
    "kb.publish_article":   [ADMIN, SUPERVISOR],
    "kb.delete_article":    [ADMIN],

    "sla.configure":        [ADMIN],
    "routing.configure":    [ADMIN, SUPERVISOR],
    "automation.configure": [ADMIN, SUPERVISOR],
    "report.view":          [ADMIN, SUPERVISOR],
    "report.export":        [ADMIN],

    "tenant.configure":     [ADMIN],
    "agent.manage":         [ADMIN],
    "api_key.manage":       [ADMIN],
}

FUNCTION check_permission(agent_id, permission, resource):
    agent = get_agent(agent_id)

    // Check role-based permission
    IF agent.role NOT IN PERMISSION_MATRIX[permission]:
        RETURN DENIED

    // Check group-based restriction (if applicable)
    IF permission.startswith("ticket.") AND resource IS ticket:
        IF agent.role == AGENT AND ticket.group_id != agent.group_id:
            // Agents can only access tickets in their group
            RETURN DENIED

    RETURN ALLOWED
```

### Customer Authentication for Chat Widget

```
PSEUDOCODE: Chat Widget Authentication

// Option 1: Identified customer (logged into tenant's website)
FUNCTION authenticate_identified_customer(identity_token):
    // Tenant generates a signed token with customer details
    // Token is signed with tenant's shared secret
    claims = verify_hmac(identity_token, tenant.widget_secret)
    customer = upsert_customer(
        tenant_id = claims.tenant_id,
        email = claims.email,
        name = claims.name,
        external_id = claims.user_id
    )
    RETURN create_session_token(customer)

// Option 2: Anonymous visitor
FUNCTION authenticate_anonymous_visitor(fingerprint):
    // Create or resume anonymous session
    session = cache.get("anon_session:" + fingerprint)
    IF session IS NULL:
        session = create_anonymous_session(fingerprint)
    RETURN session.token
```

---

## PII Handling

### Data Classification

| Data Type | Classification | Storage | Access |
|-----------|---------------|---------|--------|
| Customer email | PII | Encrypted at rest | Agents with ticket access |
| Customer name | PII | Encrypted at rest | Agents with ticket access |
| Customer phone | Sensitive PII | Encrypted at rest + field-level encryption | Agents with explicit permission |
| Ticket content | May contain PII | Encrypted at rest | Agents with ticket access |
| Chat messages | May contain PII | Encrypted at rest | Agents with conversation access |
| Agent credentials | Secret | Hashed (never stored in plaintext) | System only |
| API keys | Secret | Hashed (display only last 4 chars) | Tenant admin |
| Webhook secrets | Secret | Encrypted at rest | Tenant admin |
| Credit card numbers | PCI | Auto-redacted on ingestion | Never stored |
| Social security numbers | PII | Auto-redacted on ingestion | Never stored |

### PII Detection and Redaction

```
PSEUDOCODE: Automatic PII Redaction

FUNCTION sanitize_ticket_content(text, tenant_config):
    // Auto-detect and redact sensitive data in ticket content
    patterns = {
        "credit_card": regex("\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b"),
        "ssn": regex("\\b\\d{3}-\\d{2}-\\d{4}\\b"),
        "email": regex("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"),
        "phone": regex("\\b\\+?\\d{1,3}[-.]?\\(?\\d{3}\\)?[-.]?\\d{3}[-.]?\\d{4}\\b"),
    }

    redacted_text = text
    redactions = []

    FOR name, pattern IN patterns:
        IF tenant_config.redaction_enabled_for(name):
            matches = pattern.find_all(text)
            FOR match IN matches:
                redacted_text = redacted_text.replace(match, "[REDACTED:" + name + "]")
                redactions.append({type: name, position: match.start, length: match.length})

    // Log redaction event for audit
    IF redactions:
        log_audit_event("pii_redacted", {types: redactions.map(r => r.type)})

    RETURN redacted_text
```

### Encryption

| Layer | Method | Key Management |
|-------|--------|---------------|
| **In transit** | TLS 1.3 for all connections | Automated certificate management |
| **At rest (database)** | Transparent Data Encryption (TDE) | Platform-managed encryption keys |
| **At rest (object storage)** | Server-side encryption | Platform-managed or tenant-provided keys |
| **Field-level** | Application-level encryption for sensitive fields (phone, custom PII fields) | Per-tenant encryption keys stored in key management service |
| **Chat messages** | Encrypted at rest; optional end-to-end for enterprise tenants | Tenant-scoped keys; rotation every 90 days |

---

## Compliance

### GDPR Compliance

```
PSEUDOCODE: GDPR Data Subject Rights

FUNCTION handle_data_deletion_request(tenant_id, customer_email):
    // GDPR Article 17: Right to Erasure
    customer = find_customer(tenant_id, customer_email)

    IF customer IS NULL:
        RETURN {status: "no_data_found"}

    // Step 1: Identify all customer data
    data_inventory = {
        tickets: find_tickets_by_requester(customer.id),
        conversations: find_conversations_by_customer(customer.id),
        messages: find_messages_by_sender(customer.id),
        kb_feedback: find_article_votes_by_user(customer.id),
        analytics_events: find_events_by_customer(customer.id)
    }

    // Step 2: Check for legal holds or retention obligations
    FOR ticket IN data_inventory.tickets:
        IF ticket.has_legal_hold:
            RETURN {status: "blocked", reason: "legal_hold", ticket_id: ticket.id}

    // Step 3: Anonymize customer record (not hard delete - preserve ticket structure)
    anonymize_customer(customer.id)
    // - Replace name with "Deleted Customer"
    // - Replace email with hash
    // - Clear phone, custom fields
    // - Retain ticket content for operational continuity but remove identifying info

    // Step 4: Delete pure customer data
    delete_analytics_events(customer.id)
    delete_session_data(customer.id)

    // Step 5: Audit trail
    log_audit_event("gdpr_deletion", {
        customer_id: customer.id,
        tenant_id: tenant_id,
        data_categories: data_inventory.keys(),
        requested_at: now(),
        completed_at: now()
    })

    RETURN {status: "completed", anonymized_records: count}


FUNCTION handle_data_export_request(tenant_id, customer_email):
    // GDPR Article 20: Right to Data Portability
    customer = find_customer(tenant_id, customer_email)
    data = collect_all_customer_data(customer.id)

    // Generate machine-readable export (JSON)
    export = {
        customer_profile: serialize(customer),
        tickets: serialize(data.tickets),
        conversations: serialize(data.conversations),
        messages: serialize(data.messages),
        generated_at: now()
    }

    // Store export in temporary object storage (auto-delete after 7 days)
    export_url = store_export(export, ttl=7_days)

    RETURN {status: "ready", download_url: export_url}
```

### SOC 2 Controls

| Control Area | Implementation |
|-------------|----------------|
| **Access Control** | RBAC with principle of least privilege; MFA required for admin roles; API keys with scoped permissions |
| **Audit Logging** | Immutable audit log for all data access, configuration changes, and authentication events |
| **Change Management** | All infrastructure changes via CI/CD; no direct production access; peer review required |
| **Incident Response** | Documented incident response plan; automated alerting; 24/7 on-call rotation |
| **Data Encryption** | TLS 1.3 in transit; AES-256 at rest; per-tenant encryption keys |
| **Availability** | Multi-AZ deployment; automated failover; 99.95% SLA with credits |
| **Monitoring** | Continuous monitoring of access patterns; anomaly detection for unusual data access |

### HIPAA Considerations (Healthcare Tenants)

| Requirement | Implementation |
|-------------|----------------|
| **PHI Handling** | Auto-detect and encrypt health-related information in ticket content |
| **Access Logging** | Log all access to PHI-containing tickets with who, what, when, why |
| **Business Associate Agreement** | Required for healthcare tenants; contractual obligation for data protection |
| **Minimum Necessary** | Agents see only data necessary for ticket resolution; PHI fields masked by default |
| **Breach Notification** | Automated detection of potential PHI breaches; notification within 72 hours |

---

## Audit Trail Design

```
PSEUDOCODE: Immutable Audit Log

STRUCTURE AuditEntry:
    id: uuid
    tenant_id: uuid
    timestamp: timestamp  // Authoritative server timestamp
    actor_id: uuid
    actor_type: "agent" | "customer" | "system" | "api" | "automation"
    action: string  // "ticket.created", "ticket.assigned", "agent.login", "config.changed"
    resource_type: string  // "ticket", "conversation", "article", "agent", "sla_policy"
    resource_id: uuid
    changes: jsonb  // {field: {old: value, new: value}}
    ip_address: string
    user_agent: string
    request_id: string  // Correlation with distributed tracing

// Audit log storage:
// - Primary: Append-only table in relational database (partitioned by month)
// - Archive: Streamed to append-only object storage after 90 days
// - Retention: Configurable per tenant (minimum 1 year, up to 7 years)
// - Immutability: No UPDATE or DELETE operations allowed; enforced at database level

FUNCTION log_audit_event(action, details, context):
    entry = AuditEntry(
        id = generate_uuid(),
        tenant_id = context.tenant_id,
        timestamp = get_authoritative_time(),
        actor_id = context.actor_id,
        actor_type = context.actor_type,
        action = action,
        resource_type = details.resource_type,
        resource_id = details.resource_id,
        changes = details.changes,
        ip_address = context.ip_address,
        user_agent = context.user_agent,
        request_id = context.request_id
    )

    // Write to audit log (async but durable - queued with at-least-once delivery)
    audit_queue.publish(entry)

// Audit log queries:
// - "Show all actions by agent X in the last 30 days"
// - "Show all changes to ticket #4521"
// - "Show all login events for tenant admin accounts"
// - "Export audit log for compliance review"
```

---

## API Security

### Input Validation and Sanitization

| Input Type | Validation | Sanitization |
|-----------|-----------|--------------|
| Ticket subject/body | Max length (500 chars / 50K chars) | HTML sanitization; strip script tags |
| Custom field values | Type validation per field definition | Escape special characters |
| File uploads | Max size (20MB); allowed MIME types | Virus scan; strip metadata |
| Search queries | Max length (500 chars) | Escape search engine special characters |
| API request body | JSON schema validation | Reject unknown fields (strict mode) |
| Webhook URLs | Must be HTTPS; disallow private IPs | Validate DNS resolution; no SSRF |

### Webhook Security

```
PSEUDOCODE: Webhook Signature Verification

// Outbound webhook signing (platform → tenant endpoint):
FUNCTION sign_webhook(payload, secret):
    timestamp = now().unix_timestamp
    signature_input = timestamp + "." + json_serialize(payload)
    signature = hmac_sha256(secret, signature_input)
    RETURN {
        "X-Webhook-Signature": "t=" + timestamp + ",v1=" + hex(signature),
        "X-Webhook-Timestamp": timestamp
    }

// Inbound webhook verification (tenant verifies our signature):
FUNCTION verify_webhook(headers, body, secret):
    sig_header = headers["X-Webhook-Signature"]
    timestamp = parse_timestamp(sig_header)

    // Prevent replay attacks: reject timestamps older than 5 minutes
    IF abs(now() - timestamp) > 300:
        RETURN INVALID("Timestamp too old")

    expected = hmac_sha256(secret, timestamp + "." + body)
    actual = parse_signature(sig_header)

    IF NOT constant_time_compare(expected, actual):
        RETURN INVALID("Signature mismatch")

    RETURN VALID
```

### Rate Limiting and DDoS Protection

```
PSEUDOCODE: Tiered Rate Limiting

// Layer 1: Global rate limit (DDoS protection)
// Applied at edge/CDN level: 10,000 req/s per IP

// Layer 2: Tenant rate limit
// Applied at API Gateway: based on tenant plan
TENANT_LIMITS = {
    "free":         100 req/min,
    "team":         500 req/min,
    "professional": 2000 req/min,
    "enterprise":   10000 req/min  // Or custom limit
}

// Layer 3: Per-agent rate limit
// Applied at service level: 400 req/min per agent

// Layer 4: Per-endpoint rate limit
// Applied at API Gateway: prevents abuse of expensive endpoints
ENDPOINT_LIMITS = {
    "POST /tickets":       60 req/min per agent,
    "GET /search":         100 req/min per user,
    "POST /ai/classify":   200 req/min per tenant,
    "GET /reports/export":  10 req/hour per tenant
}

FUNCTION check_rate_limit(request):
    // Check all applicable limits
    limits = [
        check_global_limit(request.ip),
        check_tenant_limit(request.tenant_id),
        check_agent_limit(request.actor_id),
        check_endpoint_limit(request.endpoint, request.actor_id)
    ]

    FOR limit IN limits:
        IF limit.exceeded:
            RETURN 429 Too Many Requests
            headers: {
                "Retry-After": limit.reset_seconds,
                "X-RateLimit-Limit": limit.max,
                "X-RateLimit-Remaining": limit.remaining,
                "X-RateLimit-Reset": limit.reset_at
            }

    RETURN ALLOW
```
