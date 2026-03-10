# Security & Compliance — Error Tracking Platform

## Authentication & Authorization

### Authentication Mechanisms

| Actor | Mechanism | Details |
|-------|-----------|---------|
| **SDKs** | DSN (Data Source Name) | Project-scoped public/secret key pair embedded in the SDK configuration. Public key authenticates event submissions; secret key (optional) for management API calls. DSN format: `https://{public_key}@{host}/{project_id}` |
| **Users (Web UI)** | OAuth 2.0 / OIDC + MFA | SSO integration with identity providers. Session tokens with 24-hour expiry. Mandatory MFA for organization admins. |
| **API integrations** | API tokens (Bearer) | Scoped tokens with explicit permissions. Tokens can be org-scoped or project-scoped. Rotatable without downtime. |
| **Internal services** | Mutual TLS (mTLS) | Service-to-service communication authenticated via client certificates. Certificate rotation automated. |

### Authorization Model

**Role-Based Access Control (RBAC) with project-level granularity:**

| Role | Scope | Permissions |
|------|-------|-------------|
| Owner | Organization | Full access; billing; member management; delete org |
| Manager | Organization | Project creation; team management; alert rule management |
| Admin | Project | Project settings; source map management; issue management |
| Member | Project | View issues; comment; assign; resolve issues |
| Viewer | Project | Read-only access to issues and dashboards |

**Special permissions:**
- **PII access:** Separate permission flag. Only users with `pii:read` can see user emails, IP addresses, and unredacted breadcrumbs. Others see redacted versions.
- **Source map access:** Only project admins can upload or download source maps (they contain original source code).
- **Alert rule management:** Restricted to Admin+ to prevent accidental notification storms.

### Token Management

- DSN keys can be rotated per-project without affecting other projects
- API tokens support expiration dates (recommended: 90-day rotation)
- Revoked tokens are propagated to relay nodes within 60 seconds via push invalidation
- Session tokens stored in secure, HTTP-only cookies with SameSite=Strict

---

## Data Security

### Encryption at Rest

| Data | Encryption | Key Management |
|------|-----------|----------------|
| Event data (columnar store) | AES-256 at storage layer | Managed encryption keys; per-organization keys for enterprise plans |
| Issue metadata (relational DB) | AES-256 transparent data encryption | Database-managed keys with HSM backing |
| Source maps (object storage) | AES-256 server-side encryption | Per-release encryption keys |
| Cache (Redis) | Not encrypted at rest (ephemeral) | Contains no PII; fingerprint hashes only |
| Backups | AES-256 with separate backup keys | Backup keys stored in separate key vault |

### Encryption in Transit

- All SDK → Relay communication: TLS 1.3 (minimum TLS 1.2)
- Internal service communication: mTLS between all components
- Database connections: TLS with certificate verification
- Cross-region replication: Encrypted via TLS; data never traverses public internet

### PII Handling

Error events inherently contain PII: user email addresses, IP addresses, usernames, and potentially sensitive data in breadcrumbs, local variables, and request bodies.

**Data scrubbing pipeline (applied during ingestion):**

1. **IP address handling:** Configurable per-project — store full IP (for geo-IP), store hashed IP, or strip entirely
2. **User identity:** Email addresses hashed by default; original stored only if organization opts in
3. **Breadcrumb scrubbing:** Regex-based patterns strip credit card numbers, SSNs, API keys, and passwords from breadcrumb data
4. **Request body scrubbing:** Configurable field blocklist (e.g., `password`, `credit_card`, `ssn`); matching fields replaced with `[Filtered]`
5. **Local variable scrubbing:** Stack frame local variables containing sensitive patterns are redacted
6. **Custom scrubbing rules:** Organizations define regex patterns for domain-specific PII (e.g., patient IDs, account numbers)

**Server-side scrubbing** is enforced even if the SDK doesn't scrub client-side, ensuring PII cannot bypass controls.

### Data Masking / Anonymization

- **Aggregate analytics:** Dashboard statistics (error counts, affected user counts) never expose individual user data
- **Shared issue links:** When an issue is shared externally (e.g., linked in a GitHub issue), PII fields are automatically stripped from the shared view
- **Data export:** Exported event data respects the project's PII settings; fields marked as PII are redacted in exports

---

## Threat Model

### Top Attack Vectors

#### 1. DSN Key Exposure

**Threat:** DSN public keys are embedded in client-side JavaScript and are inherently exposed. An attacker who obtains a DSN can:
- Flood the project with fake error events (quota exhaustion, data pollution)
- Send events containing malicious payloads (XSS in error messages rendered in the UI)

**Mitigation:**
- **Rate limiting per DSN:** Token bucket rate limits prevent quota exhaustion from a single source
- **Origin validation:** Relay checks the `Origin` header against an allowlist of expected domains
- **Payload sanitization:** All event fields are HTML-escaped before rendering in the UI; CSP headers prevent inline script execution
- **Abuse detection:** Anomaly detection flags events with unusual patterns (e.g., events from unexpected user agents, events without valid stack traces)

#### 2. Source Map Exfiltration

**Threat:** Source maps contain original, unminified source code — often the most sensitive intellectual property for a web application. If an attacker gains access to source maps, they can reverse-engineer the application.

**Mitigation:**
- **Source maps are never served to browsers:** Unlike the common practice of hosting source maps alongside deployed code, the platform stores them internally and never exposes them via public URLs
- **Access control:** Only authenticated users with project admin permissions can download source maps via the API
- **Upload authentication:** Source map upload requires the DSN secret key or an API token with `project:releases` scope
- **Automatic expiration:** Source maps for old releases are automatically deleted after the retention period (default: 90 days)
- **Audit logging:** All source map uploads and downloads are logged with actor, timestamp, and IP address

#### 3. Cross-Tenant Data Leakage

**Threat:** In a multi-tenant SaaS deployment, a bug or misconfiguration could expose one organization's error data to another.

**Mitigation:**
- **Tenant isolation in storage:** Columnar store partitions include `project_id` as part of the partition key; all queries are forced to include a project_id filter at the query engine level
- **Row-level security in relational DB:** All queries are scoped to the authenticated user's organization and project memberships
- **API authorization checks:** Every API endpoint validates that the authenticated user has access to the requested project before querying data
- **Penetration testing:** Regular third-party security assessments focused on tenant isolation boundaries

#### 4. Malicious Event Injection

**Threat:** An attacker crafts error events containing XSS payloads in stack trace frames, error messages, or breadcrumbs, targeting developers who view the issue in the web UI.

**Mitigation:**
- **Output encoding:** All event data is HTML-entity encoded before rendering. Stack traces, messages, and breadcrumbs are treated as untrusted input.
- **Content Security Policy:** Strict CSP headers prevent inline script execution even if encoding is bypassed
- **Payload size limits:** Events exceeding size limits (200 KB compressed) are rejected at the relay
- **Schema validation:** Events must conform to the expected schema; unexpected fields are stripped

#### 5. Denial of Service via Event Flooding

**Threat:** An attacker generates millions of fake error events to overwhelm the platform, degrading service for all tenants.

**Mitigation:**
- **Per-DSN rate limiting:** Enforced at the relay layer before events reach the message bus
- **Spike protection:** Automatically throttles abnormal event rates per project
- **Network-level protection:** DDoS mitigation at the load balancer/CDN layer (rate limiting, IP reputation, challenge pages)
- **Quota enforcement:** Hard quota limits prevent any single organization from consuming unbounded resources

---

## Compliance

### GDPR

| Requirement | Implementation |
|-------------|---------------|
| Right to erasure | "Delete user data" API removes all events containing a specific user identifier across all projects in the organization. Propagated to columnar store (partition-level deletion), relational store, and backups (marked for exclusion from restore). |
| Data minimization | SDK data scrubbing removes unnecessary PII at collection time. Server-side scrubbing enforces organizational policies regardless of SDK configuration. |
| Data portability | Event data export API provides events in JSON format, scoped to a specific user. |
| Data residency | EU-only processing option ensures events never leave the EU region. Dedicated regional deployment with no cross-region data transfer. |
| Data processing agreement | Standard DPA available for all customers; describes data handling, sub-processors, and breach notification procedures. |
| Breach notification | Automated incident detection triggers breach assessment workflow. Notification within 72 hours as required. |

### SOC 2 Type II

- **Security:** Encryption at rest and in transit; RBAC; penetration testing; vulnerability management
- **Availability:** Multi-AZ deployment; automated failover; defined SLAs with uptime monitoring
- **Processing integrity:** Event deduplication; idempotent processing; data validation at ingestion
- **Confidentiality:** Tenant isolation; source map access controls; audit logging
- **Privacy:** PII scrubbing; data retention policies; user data deletion capabilities

### Additional Compliance

- **HIPAA:** Available as add-on for healthcare customers. Requires BAA, additional encryption controls, audit logging, and data retention enforcement.
- **PCI DSS:** Error events from payment processing systems may contain cardholder data. SDK scrubbing rules for PCI fields are pre-configured. Platform does not store or process cardholder data when properly configured.
