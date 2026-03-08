# Security & Compliance

## Threat Model

A no-code/low-code platform has a uniquely broad attack surface because it executes **user-defined code** against **customer-owned databases** while managing **third-party credentials**. The platform is simultaneously a code execution environment, a credential vault, and a network proxy.

### Top Attack Vectors

| # | Attack Vector | Severity | Likelihood | Impact |
|---|--------------|----------|------------|--------|
| 1 | **Sandbox escape** (code execution in transforms) | Critical | Medium | Full server compromise, tenant data breach |
| 2 | **SSRF via data connectors** (user-specified URLs) | Critical | High | Access to internal network, cloud metadata |
| 3 | **SQL injection through binding expressions** | High | Medium | Unauthorized data access/modification |
| 4 | **Credential theft** (connector configs) | Critical | Low | Access to customer databases |
| 5 | **Cross-tenant data leakage** | Critical | Low | One org sees another org's data |
| 6 | **Privilege escalation** (component visibility bypass) | High | Medium | Unauthorized UI actions |
| 7 | **Denial of service** (resource exhaustion in sandbox) | Medium | High | Platform degradation |

---

## Credential Storage

### Architecture

All data connector credentials (database passwords, API tokens, OAuth secrets) are stored encrypted and never leave the server.

```
PSEUDOCODE: Credential Management

FUNCTION store_connector_credential(org_id, connector_id, raw_config):
    // Step 1: Generate a unique data encryption key (DEK) for this connector
    dek = crypto.generate_aes_256_key()

    // Step 2: Encrypt the connector config with the DEK
    encrypted_config = crypto.aes_gcm_encrypt(
        plaintext = serialize(raw_config),
        key = dek,
        aad = f"{org_id}:{connector_id}"  // Additional Authenticated Data
    )

    // Step 3: Encrypt the DEK with the org's key encryption key (KEK)
    // KEK is stored in an HSM or key management service
    org_kek = key_management_service.get_kek(org_id)
    encrypted_dek = crypto.aes_wrap(dek, org_kek)

    // Step 4: Store encrypted config + encrypted DEK
    credential_store.upsert(connector_id, {
        encrypted_config: encrypted_config,
        encrypted_dek: encrypted_dek,
        kek_version: org_kek.version,
        algorithm: "AES-256-GCM",
        created_at: now()
    })

    // Step 5: Zero the plaintext DEK from memory
    crypto.secure_zero(dek)
    crypto.secure_zero(raw_config)


FUNCTION get_decrypted_config(org_id, connector_id):
    // Step 1: Load encrypted record
    record = credential_store.get(connector_id)

    // Step 2: Decrypt DEK using org's KEK
    org_kek = key_management_service.get_kek(org_id, version=record.kek_version)
    dek = crypto.aes_unwrap(record.encrypted_dek, org_kek)

    // Step 3: Decrypt config with DEK
    config = crypto.aes_gcm_decrypt(
        ciphertext = record.encrypted_config,
        key = dek,
        aad = f"{org_id}:{connector_id}"
    )

    crypto.secure_zero(dek)
    RETURN deserialize(config)
```

### Key Management

| Layer | Key | Rotation | Storage |
|-------|-----|----------|---------|
| **Key Encryption Key (KEK)** | Per-organization AES-256 | 90 days automatic | HSM / Key Management Service |
| **Data Encryption Key (DEK)** | Per-connector AES-256-GCM | On credential update | Encrypted in database |
| **TLS certificates** | Platform-wide | Annual auto-renewal | Certificate manager |
| **API signing keys** | Per-organization | 365 days | HSM |

### Critical Rules

1. **Credentials never returned to client**: API responses for connector configuration return `"password": "********"`, never the actual value. Credentials can only be overwritten, never read back.
2. **No plaintext in logs**: Credential values must never appear in application logs, error messages, or stack traces.
3. **Audit on access**: Every credential decryption is logged with the user context, query ID, and timestamp.
4. **Scoped access**: Only the Query Execution Engine and Connector Test Service can decrypt credentials. No human access without break-glass procedure.

---

## Query Sandbox Security

### V8 Isolate Hardening

| Control | Implementation | Purpose |
|---------|---------------|---------|
| **Global scope restriction** | Remove `fetch`, `XMLHttpRequest`, `WebSocket`, `require`, `process`, `Function` constructor | Prevent network access, code loading, process introspection |
| **Memory limit** | 128 MB per isolate | Prevent memory exhaustion attacks |
| **CPU time limit** | 5 seconds wall-clock | Prevent infinite loops, cryptomining |
| **Stack depth limit** | 1 MB stack | Prevent stack overflow attacks |
| **Frozen builtins** | All injected objects are deep-frozen | Prevent prototype pollution |
| **No code generation** | Block `Function()` constructor, template string exploitation | Prevent dynamic code construction |
| **Output validation** | Result must be JSON-serializable | Prevent object reference leaks |

### Sandbox Escape Mitigations

| Attack Class | Example | Mitigation |
|-------------|---------|------------|
| **Prototype pollution** | `({}).constructor.constructor('return process')()` | `Function` constructor removed; all prototypes frozen |
| **Global scope leakage** | Accessing `this` to reach `global` | Strict mode enforced; wrapper function scoping |
| **Side-channel timing** | High-resolution timers for cache attacks | `performance.now()` removed; `Date.now()` downgraded to ms precision |
| **Resource exhaustion** | `while(true){}` or `Array(1e9)` | CPU timeout + memory limit enforced by V8 engine |
| **Eval injection** | Nested expression evaluation | Expression evaluator uses AST-based parser, not string concatenation |

---

## SSRF Prevention

### The SSRF Threat

No-code platforms allow users to configure REST API connectors with arbitrary URLs. A malicious user could configure a connector pointing to `http://169.254.169.254/latest/meta-data/` (cloud metadata service) or `http://internal-admin-panel:8080/`.

### Defense Strategy

```
PSEUDOCODE: SSRF Prevention in Connector Proxy

FUNCTION validate_connector_url(url):
    parsed = parse_url(url)

    // Block 1: Deny private/internal IP ranges
    resolved_ips = dns_resolve(parsed.hostname)
    FOR ip IN resolved_ips:
        IF is_private_ip(ip):       // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
            RAISE SSRFError("Cannot connect to private IP addresses")
        IF is_link_local(ip):       // 169.254.0.0/16 (cloud metadata)
            RAISE SSRFError("Cannot connect to link-local addresses")
        IF is_loopback(ip):         // 127.0.0.0/8
            RAISE SSRFError("Cannot connect to loopback addresses")

    // Block 2: Deny internal service hostnames
    IF parsed.hostname IN INTERNAL_HOSTNAME_BLOCKLIST:
        RAISE SSRFError("Cannot connect to internal services")

    // Block 3: Require HTTPS for non-database connectors
    IF parsed.scheme != "https" AND connector_type == "rest_api":
        WARN("Non-HTTPS connections are not recommended")
        // Allow HTTP for backward compatibility but log a warning

    // Block 4: DNS rebinding protection
    // Pin the resolved IP and use it for the actual connection
    // Don't re-resolve DNS at connection time
    RETURN {url: url, pinned_ip: resolved_ips[0]}


FUNCTION is_private_ip(ip):
    RETURN ip IN 10.0.0.0/8
        OR ip IN 172.16.0.0/12
        OR ip IN 192.168.0.0/16
        OR ip IN 169.254.0.0/16
        OR ip IN 127.0.0.0/8
        OR ip IN ::1/128
        OR ip IN fc00::/7
```

### DNS Rebinding Protection

A sophisticated SSRF variant: the attacker controls a DNS server that first resolves to a public IP (passing validation), then re-resolves to an internal IP when the actual connection is made.

**Mitigation**: DNS pinning. The platform resolves the hostname once during validation and uses the resolved IP address for the actual connection. The connection is never made by re-resolving the hostname.

---

## Authentication & Authorization

### Authentication

| Method | Used By | Flow |
|--------|---------|------|
| **SSO (SAML 2.0 / OIDC)** | Enterprise builders and end-users | IdP-initiated or SP-initiated flow |
| **Email/password + MFA** | Non-SSO builders | Platform-managed credentials with TOTP or WebAuthn |
| **JWT session tokens** | All authenticated sessions | Short-lived access (15 min) + long-lived refresh (7 days) |
| **API keys** | External integrations | Org-scoped, rotatable, rate-limited |
| **Embedded app tokens** | Public-facing deployed apps | Signed tokens with embedded permissions |

### SCIM Provisioning

Enterprise customers manage user/group membership in their identity provider (Okta, Azure AD). SCIM 2.0 sync ensures:
- New employees automatically get access to relevant apps
- Departed employees are immediately deprovisioned
- Group membership changes propagate to component visibility and row-level security

---

## Audit Logging

### What Is Logged

| Event Category | Events | Retention |
|---------------|--------|-----------|
| **Query execution** | query.executed (query name, connector, duration, row count, user) | 1 year |
| **Authentication** | auth.login, auth.logout, auth.mfa_challenge, auth.failed | 2 years |
| **Permission changes** | permission.granted, permission.revoked, role.changed | 7 years |
| **App lifecycle** | app.created, app.published, app.deleted, app.rollback | 7 years |
| **Connector management** | connector.created, connector.updated, connector.tested | 2 years |
| **Admin actions** | org.settings_changed, group.created, scim.sync | 7 years |

### What Is NOT Logged

- **Query result data**: May contain PII; never logged
- **Query parameter values**: May contain sensitive data; logged as `"[REDACTED]"`
- **Connector credentials**: Never logged in any form
- **Component state snapshots**: Too voluminous; not security-relevant

### Audit Log Integrity

| Control | Implementation |
|---------|---------------|
| **Append-only** | Audit log store does not support UPDATE or DELETE operations |
| **Tamper detection** | Hash chain: each event includes the hash of the previous event |
| **Separate access** | Audit log store has separate access controls from the main database |
| **Compliance export** | Audit logs can be exported to a customer-managed object storage bucket |

---

## Compliance

### Framework Coverage

| Framework | Relevance | Key Requirements |
|-----------|-----------|-----------------|
| **SOC 2 Type II** | All enterprise customers | Access controls, encryption, audit logging, incident response |
| **GDPR** | European customers | Data residency, right to deletion, DPA (Data Processing Agreement) |
| **HIPAA** | Healthcare apps | BAA required, PHI handling via connector proxy, audit trails |
| **PCI DSS** | Payment-related apps | Credential isolation, network segmentation, vulnerability scanning |
| **ISO 27001** | Enterprise certification | Information security management system |

### Data Residency

The platform does not store customer business data---all data flows through the connector proxy and is not persisted. However, two types of data require residency controls:

1. **Connector credentials**: Encrypted database passwords must be stored in the customer's designated region
2. **Audit logs**: Query execution logs (which include query text that may reference PII) must be stored in the customer's designated region

**Implementation**: Per-org region configuration. Credential store and audit log store are regionally deployed. The connector proxy instances in each region handle only that region's connectors.

---

## Security Checklist for No-Code Platforms

| # | Control | Status |
|---|---------|--------|
| 1 | All connector credentials encrypted at rest with envelope encryption | Required |
| 2 | User-defined code runs in V8 Isolates with resource limits | Required |
| 3 | All outbound network calls from connector proxy validated against SSRF blocklist | Required |
| 4 | SQL queries parameterized (never string-concatenated) | Required |
| 5 | Audit log for every query execution with user context | Required |
| 6 | Component visibility rules enforced server-side (not just client-side) | Required |
| 7 | Row-level security filters injected as subquery wrappers | Required |
| 8 | SSO integration with SCIM provisioning for enterprise | Required |
| 9 | DNS rebinding protection via IP pinning | Required |
| 10 | Sandbox `Function` constructor and code generation primitives removed | Required |
