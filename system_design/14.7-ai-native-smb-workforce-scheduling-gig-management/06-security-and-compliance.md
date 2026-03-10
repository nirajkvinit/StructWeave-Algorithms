# 14.7 AI-Native SMB Workforce Scheduling & Gig Management — Security & Compliance

## Authentication & Authorization

### Authentication Architecture

**Multi-factor authentication model:**

| Actor | Authentication Method | Token Lifetime |
|---|---|---|
| Business Owner/Admin | Email + password + optional TOTP | 24 hours (refresh: 7 days) |
| Manager | Email + password or SSO | 12 hours (refresh: 7 days) |
| Employee | Phone number + SMS OTP or biometric | 30 days (refresh: 90 days) |
| Gig Worker | Phone number + SMS OTP | 7 days (refresh: 30 days) |
| API Integration (POS, payroll) | API key + HMAC signature | No expiry (revocable) |

**Token architecture:**
- Short-lived JWT access tokens containing: tenant_id, user_id, role, location_ids (for multi-location access control).
- Long-lived opaque refresh tokens stored server-side with device binding (the refresh token is valid only from the device that created it).
- Token rotation: each refresh token use issues a new refresh token and invalidates the old one (replay detection).

### Authorization Model

Role-Based Access Control (RBAC) with location-scoping:

| Role | Schedule | Attendance | Compliance | Gig | Payroll | Settings |
|---|---|---|---|---|---|---|
| **Owner** | Full CRUD all locations | View + override all | View + override | Full control | Export all | Full access |
| **Manager** | Full CRUD own location(s) | View + override own location | View own location | Broadcast + approve | Export own location | Location settings |
| **Employee** | View own schedule, request swaps | Clock in/out, view own timesheet | Not visible | Not visible | View own hours | Personal preferences |
| **Gig Worker** | View accepted shifts only | Clock in/out for accepted shifts | Not visible | Accept/decline offers | View own earnings | Personal preferences |
| **Payroll Integrator** | Not visible | Read timesheets (approved only) | Not visible | Not visible | Read-only export | Not visible |

**Location scoping:** A manager with access to Location A cannot see schedules, employees, or timesheets for Location B—even within the same tenant. Cross-location access requires explicit Owner grant.

**API enforcement:** Every API request is validated against the RBAC policy. The middleware extracts tenant_id, user_id, and role from the JWT, then checks the requested resource against the policy. Denied requests return 403 with a generic message (no information leakage about what exists).

---

## Data Security

### Encryption

| Data State | Method | Key Management |
|---|---|---|
| In transit | TLS 1.3 for all API traffic; certificate pinning on mobile apps | Managed certificate rotation (90-day cycle) |
| At rest (database) | AES-256 encryption at the storage layer; per-tenant column-level encryption for PII fields | Tenant-specific keys stored in a managed key vault; key rotation every 365 days |
| At rest (biometrics) | AES-256 with a separate key hierarchy; biometric data stored in an isolated database | Biometric keys managed separately from PII keys; emergency key deletion capability |
| Backups | Encrypted with backup-specific keys before writing to object storage | Backup keys rotated with each full backup cycle |
| Clock-in GPS data | Encrypted at rest; retention-limited (90 days) | Auto-deletion enforced by TTL policy |

### PII Data Handling

```
PII Classification and Handling Rules:

HIGH SENSITIVITY (biometric data, government IDs):
  - Stored in isolated, encrypted database
  - Access logged and alerted
  - Retention: minimum necessary, auto-deleted on offboarding
  - Never included in analytics or exports
  - Right-to-deletion: 48-hour SLA

MEDIUM SENSITIVITY (name, phone, email, address):
  - Encrypted at rest with tenant-specific keys
  - Access restricted by RBAC
  - Retention: employment duration + 7 years (legal requirement)
  - Pseudonymized in analytics
  - Right-to-deletion: 30-day SLA (legal retention takes precedence)

LOW SENSITIVITY (availability preferences, shift history):
  - Standard encryption at rest
  - Accessible by authorized roles
  - Retention: 7 years (compliance requirement)
  - Aggregated in analytics
```

### Multi-Tenancy Data Isolation

**Isolation guarantee:** No API call, database query, cache operation, or background job can access data belonging to a different tenant.

**Enforcement layers:**

1. **Application middleware:** Every incoming request has its tenant_id extracted from the JWT. The middleware injects a tenant filter into every database query, cache key, and message queue operation. There is no code path that can bypass tenant filtering.

2. **Database-level enforcement:** Row-level security policies enforce that queries can only return rows matching the session's tenant_id. Even if application code has a bug that omits the tenant filter, the database rejects cross-tenant access.

3. **Cache key namespacing:** All cache keys are prefixed with tenant_id. Cache lookups without a tenant prefix are blocked at the client library level.

4. **Periodic audit:** An automated job runs daily, sampling 1,000 random API requests and verifying that the response data matches the requesting tenant. Any cross-tenant data detection triggers a P0 incident.

---

## Threat Model

### STRIDE Analysis

| Threat | Attack Vector | Impact | Mitigation |
|---|---|---|---|
| **Spoofing** | Stolen employee credentials used for fraudulent clock-in | Incorrect timesheet data; overpayment | Biometric verification as second factor; device binding for tokens; anomaly detection on unusual clock-in patterns |
| **Spoofing** | GPS spoofing app to fake location for remote clock-in | Employee clocks in from home instead of work location | Multi-signal verification (WiFi SSID, cell tower, accelerometer); mock-location API detection; impossible-travel detection |
| **Tampering** | Manager alters timesheet after approval to reduce hours | Employee underpayment; legal liability | Immutable event log for all timesheet changes; dual-approval for post-approval modifications; employee notification on timesheet changes |
| **Tampering** | Attacker modifies compliance rules to create loopholes | Labor law violations; penalty exposure | Compliance rules are read-only in production; changes require dual approval through a separate admin workflow; rules are cryptographically signed |
| **Repudiation** | Manager denies publishing a schedule that triggered premium pay | Dispute over who approved the schedule change | Immutable audit log with actor identity, timestamp, and IP address; schedule events are cryptographically chained (each event references the hash of the previous event) |
| **Information Disclosure** | Cross-tenant data leak through API vulnerability | Employee PII exposed to unauthorized party | Row-level security; tenant-scoped API middleware; automated cross-tenant access testing; cache key namespacing |
| **Information Disclosure** | Employee views other employees' pay rates through API manipulation | Compensation confidentiality breach | Field-level access control: pay rates visible only to Owner/Manager roles; API response filtering at the serialization layer |
| **Denial of Service** | Bot attack on clock-in endpoint during shift start surge | Legitimate employees cannot clock in | Rate limiting per device fingerprint; CAPTCHA-free challenge for suspicious patterns; elastic auto-scaling; offline clock-in capability as fallback |
| **Elevation of Privilege** | Employee modifies JWT to grant manager role | Unauthorized schedule modifications | JWT signature verification with rotating keys; role claims verified against the authorization database (not trusted solely from the token); sensitive operations require re-authentication |

### Biometric Security

Biometric data (facial recognition templates) receives special handling:

1. **On-device processing:** Facial recognition runs on the employee's mobile device. The raw image never leaves the device. Only the computed feature vector (a mathematical representation, not a recognizable face) is transmitted to the server for verification.

2. **Template storage:** Feature vectors are stored in an isolated database with separate encryption keys. They are never co-located with PII. Access requires a separate authorization path.

3. **Anti-spoofing:** The mobile app performs liveness detection (blink detection, head movement, 3D depth analysis on supported devices) to prevent photo-based spoofing.

4. **Consent and control:** Biometric enrollment requires explicit opt-in with a clear consent flow. Employees can revoke consent at any time, triggering immediate template deletion. Biometric verification is never the only clock-in method—GPS-only verification is always available as an alternative.

5. **Regulatory compliance:** Biometric data handling complies with BIPA (Illinois Biometric Information Privacy Act), CCPA biometric data provisions, GDPR Article 9 (special category data), and equivalent state laws. Written consent is collected and retained.

---

## Labor Law Compliance Architecture

### Compliance Data Flow

```
Jurisdiction identification
       ↓
Rule set binding (location → jurisdiction → active rules)
       ↓
Pre-publication validation (every schedule version)
       ↓
Real-time monitoring (during shift execution)
       ↓
Post-period reconciliation (end of pay period)
       ↓
Compliance reporting and record retention
```

### Key Compliance Domains

| Domain | Requirements | System Enforcement |
|---|---|---|
| **Predictive Scheduling** | 7–14 day advance notice; premium pay for late changes; good-faith estimate of hours at hire | Schedule publication tracking; change-window calculation; automatic premium pay computation; good-faith estimate stored per employee |
| **Overtime** | Federal: weekly > 40h. State: varies (daily, weekly, 7th consecutive day). Rate: 1.5x or 2x depending on hours and jurisdiction | Real-time hour tracking; proactive alerts before threshold; overtime cost projection in schedule optimizer |
| **Rest Periods** | 8–12 hour minimum between shifts (varies); "clopening" restrictions (close one night, open next morning) | Solver constraint; real-time detection of rest violations; block schedule publication if rest requirements not met |
| **Breaks** | Meal break (30 min) and rest break (10–15 min) requirements; timing varies; some states require paid breaks | Break scheduling within shifts; clock-in/out tracking for break compliance; alerts for missed breaks |
| **Minor Work Restrictions** | Max hours per day/week; restricted hours (no work after 7–10 PM); prohibited tasks; school-year vs. summer rules | Age-based rule activation; automatic restriction during school year; prohibited role enforcement |
| **Split Shift** | Premium pay when an employee works two shifts with > 1 hour gap in a single day | Gap detection in schedule; automatic premium calculation; optimizer avoids split shifts unless necessary |
| **Right-to-Rest** | Temporary workers: right to refuse shifts with < 11h rest without penalty | Rest period tracking for gig/temp workers; opt-in override with documentation |

### Compliance Record Retention

| Record Type | Retention Period | Legal Basis |
|---|---|---|
| Timesheets / work hour records | 7 years | FLSA, state wage laws |
| Schedule publication records | 7 years | Predictive scheduling laws |
| Schedule change records (with reasons) | 7 years | Predictive scheduling laws |
| Overtime approval records | 7 years | FLSA, state overtime laws |
| Break compliance records | 3 years | State break laws |
| Minor work records | Until minor turns 21 + 3 years | Child labor laws |
| Biometric consent records | Duration of employment + 3 years | BIPA, CCPA |
| Compliance violation records | 7 years | General labor law |

---

## API Security

### Rate Limiting

| Endpoint Category | Rate Limit | Burst Allowance |
|---|---|---|
| Authentication (login, OTP) | 5/minute per phone/email | 10 |
| Clock-in/out | 2/minute per employee | 5 |
| Schedule read | 100/minute per user | 200 |
| Schedule write | 20/minute per manager | 30 |
| Gig broadcast | 10/minute per business | 15 |
| Notification send | 1000/minute per tenant | 2000 |
| POS webhook | 100/second per integration | 500 |

### Input Validation

- All API inputs validated against JSON schema before processing.
- Employee IDs, shift IDs, and tenant IDs are UUIDs—sequential IDs that could be enumerated are never used.
- GPS coordinates validated for range (latitude: -90 to 90, longitude: -180 to 180) and precision (reject coordinates with > 8 decimal places, which suggests programmatic fabrication).
- Timestamp inputs validated against reasonable bounds (not in the future for clock-in, not more than 24 hours in the past for retroactive entries).

### Webhook Security (POS and Payroll Integrations)

- All incoming webhooks verified via HMAC-SHA256 signature.
- Webhook payloads are idempotent-processed (duplicate delivery is safe).
- Outbound webhooks (to payroll providers) include a per-integration secret and a request timestamp to prevent replay attacks.
- Webhook endpoints are rate-limited independently from user-facing APIs.
