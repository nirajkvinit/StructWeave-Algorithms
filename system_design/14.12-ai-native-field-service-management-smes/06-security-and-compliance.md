# 14.12 AI-Native Field Service Management for SMEs — Security & Compliance

## Authentication & Authorization

### Multi-Layer Authentication

**User authentication:**
- OAuth 2.0 / OpenID Connect for web dashboard and customer portal
- JWT tokens with short expiry (15 minutes) and refresh tokens (7 days)
- Multi-factor authentication (MFA) required for dispatcher and admin roles
- Biometric authentication option on mobile app (fingerprint, face ID) for quick technician access

**Device authentication:**
- Each technician mobile device registered with a unique device certificate
- Device certificate + user credential required for sync operations (two-factor device identity)
- Device can be remotely wiped and deregistered by tenant admin
- Offline authentication uses locally cached credential hash with device certificate validation

**IoT device authentication:**
- Mutual TLS (mTLS) for all IoT device connections
- Per-device X.509 certificates provisioned during device onboarding
- Certificate rotation automated on 90-day cycle
- Device identity tied to equipment record; orphaned devices auto-quarantined

**API authentication:**
- API keys for third-party integrations (accounting systems, CRM)
- Scoped tokens with granular permissions (read-only, specific entity types)
- Rate limiting per API key to prevent abuse

### Role-Based Access Control (RBAC)

| Role | Permissions | Scope |
|---|---|---|
| **Tenant Admin** | Full system configuration; user management; billing; data export | Entire tenant |
| **Dispatcher** | Schedule management; job assignment; technician management; customer view | Assigned service zones |
| **Technician** | View assigned jobs; update job status; create invoices; collect payments | Own assignments only |
| **Office Staff** | View schedules; customer management; invoice review; reports | Read-heavy; limited write |
| **Customer** | View own service history; request service; view invoices; make payments | Own records only |
| **IoT System** | Push telemetry; receive configuration; trigger alerts | Registered devices only |

**Attribute-based access control (ABAC) extensions:**
- Geographic restrictions: technicians can only view/modify jobs within their assigned service zones
- Temporal restrictions: dispatchers can only modify future schedule entries (not historical records)
- Sensitivity restrictions: customer financial data (payment methods, billing history) accessible only to admin and office staff roles

### Tenant Isolation

**Data isolation:**
- All database tables partitioned by tenant_id; every query includes tenant_id filter enforced at the ORM level
- Row-level security (RLS) policies in the database as a second layer of defense
- Tenant_id is extracted from the JWT token and injected into the request context; application code cannot override
- Cross-tenant data access is impossible through the application layer; requires direct database access (which is restricted to platform operators)

**Compute isolation:**
- Scheduling engine instances serve multiple tenants but maintain per-tenant memory spaces with no shared state
- API rate limits applied per tenant to prevent noisy-neighbor effects
- Background job queues prioritized by tenant tier (premium tenants get dedicated queue lanes)

**Network isolation:**
- Tenant API traffic identified and tagged at the gateway level
- IoT telemetry routed through tenant-specific MQTT topics
- No lateral movement possible between tenant contexts

---

## Data Protection

### Data Classification

| Classification | Examples | Storage | Encryption | Access |
|---|---|---|---|---|
| **Critical** | Payment credentials, auth tokens | Vault / HSM | AES-256 at rest; TLS 1.3 in transit | Payment service only; never logged |
| **Sensitive** | Customer PII (name, phone, address, email) | Encrypted database columns | AES-256 at rest; TLS 1.3 in transit | Role-restricted; audit logged |
| **Confidential** | Job details, invoices, service history | Encrypted at rest (volume-level) | TLS 1.3 in transit | Tenant-scoped RBAC |
| **Internal** | Schedule data, route plans, fleet metrics | Standard database encryption | TLS 1.3 in transit | Tenant-scoped RBAC |
| **Public** | Service areas, business hours | CDN / public API | TLS 1.3 in transit | Unrestricted |

### Encryption Strategy

**At rest:**
- Database: transparent data encryption (TDE) for all tenant databases
- Object storage: server-side encryption with per-tenant encryption keys
- Mobile device: local database encrypted with device-specific key derived from user credential + device certificate
- Backups: encrypted with separate backup encryption key; key stored in hardware security module (HSM)

**In transit:**
- TLS 1.3 for all client-server communication
- mTLS for IoT device communication
- gRPC with TLS for all internal service-to-service communication
- Certificate pinning on mobile app to prevent man-in-the-middle attacks

**Key management:**
- Per-tenant data encryption keys (DEKs) wrapped with a master key (KEK) stored in HSM
- Automatic key rotation every 90 days
- Key revocation capability for compromised tenants
- Tenant offboarding triggers secure key destruction and data purge

### Data Retention and Deletion

| Data Type | Active Retention | Archive Retention | Deletion Policy |
|---|---|---|---|
| Job records | 2 years | 5 years (cold storage) | Anonymized after archive period |
| Customer PII | Active relationship + 1 year | N/A | Hard delete on customer request or tenant offboarding |
| Invoices & payments | 2 years | 7 years (regulatory) | Retained with PII anonymization after 7 years |
| IoT telemetry | 90 days (raw) | 5 years (aggregated) | Raw data purged; aggregates anonymized |
| GPS traces | 90 days | 1 year (anonymized) | Hard delete after 1 year |
| Photos | 1 year | 3 years (cold storage) | Deleted after archive period |
| Audit logs | 1 year | 3 years | Immutable; archived then purged |

### Mobile Device Security

**On-device data protection:**
- Local database encrypted at rest with AES-256; key derived from user PIN + device hardware key
- Automatic data wipe after 10 failed authentication attempts
- Remote wipe capability triggered by tenant admin or platform operator
- Screen capture prevention for sensitive screens (customer PII, payment forms)
- No customer PII stored in local logs or crash reports

**Lost device protocol:**
1. Technician or admin reports device lost/stolen
2. Device certificate revoked immediately (prevents sync)
3. Remote wipe command queued (executes on next connectivity)
4. All active sessions for the device invalidated
5. Affected customers notified if PII exposure risk exists
6. New device provisioned with fresh certificate; data re-synced from server

---

## Compliance Requirements

### Labor Law Compliance

| Requirement | Implementation |
|---|---|
| **Maximum working hours** | Scheduling engine enforces configurable daily/weekly hour limits per jurisdiction; overtime requires explicit approval |
| **Mandatory break periods** | Break windows defined per technician; optimizer never schedules jobs that would prevent required breaks |
| **Overtime calculation** | Deterministic overtime computation in pricing engine; configurable thresholds (8 hrs daily, 40 hrs weekly) |
| **Travel time tracking** | GPS-based travel time recorded separately from job time; configurable rules for paid vs. unpaid travel |
| **Certification requirements** | Jobs requiring specific certifications (electrical, gas, refrigerant) only assignable to certified technicians; expired certifications auto-flagged |
| **Right to disconnect** | No push notifications or job assignments outside configured working hours per jurisdiction |

### Privacy Regulations

| Regulation | Applicability | Implementation |
|---|---|---|
| **GDPR** | EU-based tenants and customers | Consent management; data portability API; right to erasure; DPO designation; breach notification within 72 hours |
| **CCPA/CPRA** | California-based customers | "Do not sell" opt-out; data access requests; deletion requests; annual privacy notice |
| **India DPDP Act** | India-based tenants | Consent-based processing; data localization for certain categories; grievance officer designation |
| **SOC 2 Type II** | Platform-level | Annual audit; continuous monitoring; access controls; encryption; incident response |

### GPS and Location Privacy

**Technician location tracking safeguards:**
- GPS tracking active only during working hours (configurable per technician)
- Location data is tenant-visible only (platform operators cannot access individual technician locations without audit trail)
- Technician can see their own location history and request correction
- Location precision degraded to 100m radius after working hours (for fleet-level analytics only, not individual tracking)
- Clear consent obtained during onboarding; revocable with 30-day notice (with impact on scheduling capability disclosed)

**Customer location privacy:**
- Customer addresses stored encrypted; decrypted only for active job context
- Address never shared across tenants
- Geolocation used for service zone matching only; not for marketing or analytics without explicit consent

---

## Security Monitoring and Incident Response

### Threat Model

| Threat | Attack Vector | Mitigation |
|---|---|---|
| **Unauthorized data access** | Compromised credentials; privilege escalation | MFA; RBAC with least privilege; session management; anomaly detection |
| **Cross-tenant data leakage** | Application bug; SQL injection | Tenant isolation at ORM + RLS level; input validation; parameterized queries |
| **Mobile device compromise** | Lost/stolen device; malware | Device encryption; remote wipe; certificate-based auth; app integrity checks |
| **IoT device spoofing** | Fake telemetry injection; device impersonation | mTLS; device certificate pinning; telemetry rate and range validation |
| **Man-in-the-middle** | Network interception of field traffic | TLS 1.3; certificate pinning; no sensitive data over HTTP |
| **Insider threat** | Malicious employee; social engineering | Audit logging; separation of duties; access reviews; background checks |
| **Payment fraud** | Fake invoices; payment interception | Invoice digital signatures; payment gateway tokenization; reconciliation checks |

### Audit Logging

Every security-relevant action is logged to an immutable audit store:

| Event Category | Examples | Retention |
|---|---|---|
| Authentication | Login, logout, MFA challenge, failed attempt | 1 year |
| Authorization | Permission grant/revoke, role change | 3 years |
| Data access | Customer PII view, invoice download, report export | 1 year |
| Data modification | Job creation, schedule change, price book update | 3 years |
| Device management | Device registration, certificate renewal, remote wipe | 3 years |
| Administrative | Tenant configuration change, user management, billing | 3 years |
| System | API key creation, webhook configuration, integration setup | 1 year |

### Incident Response Plan

| Phase | Actions | Timeline |
|---|---|---|
| **Detection** | Automated alerting on anomalous access patterns, failed auth spikes, cross-tenant query attempts | Real-time |
| **Triage** | Classify severity (P1-P4); assign incident commander; notify affected teams | < 15 minutes |
| **Containment** | Isolate affected tenant/device/service; revoke compromised credentials; block suspicious IPs | < 1 hour |
| **Eradication** | Identify root cause; patch vulnerability; rotate keys; verify no lateral movement | < 4 hours |
| **Recovery** | Restore from clean backup if needed; re-enable services; verify integrity | < 8 hours |
| **Post-mortem** | Root cause analysis; timeline documentation; corrective actions; customer notification if required | < 48 hours |
