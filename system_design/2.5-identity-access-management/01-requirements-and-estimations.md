# Requirements & Capacity Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features (In Scope)

1. **Authentication Services**
   - OAuth 2.0 authorization server with all grant types
   - OpenID Connect (OIDC) for identity layer
   - SAML 2.0 identity provider and service provider
   - Social login integration (Google, Microsoft, GitHub, etc.)
   - Multi-factor authentication (WebAuthn/Passkeys, TOTP, SMS, Email)
   - Passwordless authentication (Magic links, Passkeys)
   - Enterprise SSO with federated identity providers

2. **Authorization Services**
   - Role-Based Access Control (RBAC) with hierarchical roles
   - Attribute-Based Access Control (ABAC) with policy engine
   - Relationship-Based Access Control (ReBAC) for fine-grained permissions
   - Policy management and versioning
   - Real-time policy evaluation with caching

3. **User Management**
   - User directory with flexible schema
   - Group and organization management
   - SCIM 2.0 provisioning and deprovisioning
   - Just-In-Time (JIT) user provisioning
   - Self-service user registration and profile management
   - Password reset and account recovery flows

4. **Session & Token Management**
   - JWT and opaque token generation
   - Refresh token rotation with reuse detection
   - Session management and single logout
   - Token introspection and revocation
   - Cross-domain session synchronization

5. **Multi-Tenancy**
   - Tenant isolation with separate configurations
   - Custom branding per tenant
   - Tenant-specific identity providers
   - Usage metering and quotas

6. **Administration & Compliance**
   - Admin console for configuration management
   - Comprehensive audit logging
   - Security event notifications
   - Compliance reporting (SOC2, HIPAA, GDPR)

### Out of Scope

- Customer Identity and Access Management (CIAM) marketing features
- Consent management for GDPR (separate system)
- Privileged Access Management (PAM)
- API key management (covered by API Gateway)
- Service mesh identity (covered by Service Mesh design)

---

## Non-Functional Requirements

### CAP Theorem Choice

**Control Plane: CP (Consistency + Partition Tolerance)**

**Justification:**
- Policy changes must be immediately consistent
- User deprovisioning must take immediate effect
- Role assignments require strong consistency

**Data Plane: AP (Availability + Partition Tolerance)**

**Justification:**
- Authentication must remain available during partial outages
- Token validation should work even if central services degraded
- Session data can tolerate brief inconsistency windows

### Consistency Model

| Component | Consistency Requirement |
|-----------|------------------------|
| Policy definitions | Strongly consistent |
| User deprovisioning | Strongly consistent |
| Role/permission changes | Strongly consistent |
| Session data | Eventually consistent |
| Token validation | Eventually consistent (JWT: immediate, opaque: near-real-time) |
| Audit logs | Eventually consistent (ordered) |
| Analytics/metrics | Eventually consistent |

**Acceptable Inconsistency Windows:**

| Scenario | Acceptable Delay |
|----------|------------------|
| Policy update propagation | < 1 second |
| User deactivation propagation | < 5 seconds |
| Role change effect | < 5 seconds |
| Session revocation propagation | < 10 seconds |
| Audit log visibility | < 30 seconds |

### Availability Targets

| Component | Target | Justification |
|-----------|--------|---------------|
| **Authentication service** | 99.99% | Login critical for all applications |
| **Token validation** | 99.999% | Every API call depends on it |
| **Policy engine** | 99.99% | Authorization for all requests |
| **Admin console** | 99.9% | Can tolerate brief outages |
| **Provisioning (SCIM)** | 99.9% | Batch operations, can retry |

**Regional HA Requirements:**
- Multi-AZ deployment for all critical components
- Active-active across at least 2 regions for global deployments
- Automatic failover with < 30 second RTO
- Session data replicated across regions

### Latency Targets

| Operation | Percentile | Target | Justification |
|-----------|------------|--------|---------------|
| JWT validation (local) | p99 | < 1ms | Hot path, called every request |
| Token introspection | p99 | < 10ms | Network hop required |
| Policy evaluation (cached) | p99 | < 5ms | Authorization on every request |
| Policy evaluation (cold) | p99 | < 50ms | Complex policy first load |
| User login (password) | p99 | < 500ms | Intentional delay for security |
| User login (SSO redirect) | p99 | < 200ms | User-facing, perceived performance |
| MFA verification | p99 | < 300ms | Hardware token response time |
| SCIM user creation | p99 | < 1s | Batch operation |

### Throughput

| Operation | Target | Notes |
|-----------|--------|-------|
| **Logins per day (cold path)** | 500M+ | Peak at business hours |
| **Token validations per day (warm path)** | 50B+ | 100:1 ratio to logins |
| **Policy evaluations per second** | 1M+ | Every API request |
| **Peak concurrent sessions** | 100M+ | Global user base |
| **SCIM operations per hour** | 100K+ | Batch provisioning |

### Durability

| Data Type | Durability Requirement |
|-----------|----------------------|
| User credentials | Highly durable (11 9s) |
| User profiles | Highly durable (11 9s) |
| Audit logs | Highly durable (7 years for compliance) |
| Session data | Durable during session lifetime |
| Policy definitions | Highly durable, version controlled |
| Tokens | Ephemeral (in-memory acceptable) |

---

## Capacity Estimations (Back-of-Envelope)

### Platform Scale Assumptions

| Metric | Value | Notes |
|--------|-------|-------|
| Total users | 500M+ | Global user directory |
| Daily active users | 100M+ | DAU for authentication |
| Tenants (organizations) | 500K+ | Multi-tenant SaaS |
| Average logins per user per day | 5 | Multiple applications |
| Daily logins | 500M+ | 100M × 5 |
| Token validations per login session | 100 | Average API calls |
| Daily token validations | 50B+ | 500M × 100 |
| Average policy evaluations per request | 1 | Simple case |
| Policy evaluations per day | 50B+ | Matches token validations |

### Traffic Pattern Analysis

**Cold Path (Authentication):**
```
Peak logins = 500M / day
           = ~5,800 logins/second average
           = ~30,000 logins/second peak (5x during business hours)
```

**Warm Path (Token Validation):**
```
Peak validations = 50B / day
                 = ~580,000 validations/second average
                 = ~3M validations/second peak
```

### Database Sizing

**User Directory (PostgreSQL + Distributed Store):**
```
Users: 500M × 2KB per user = 1 TB
Groups: 50M × 500B = 25 GB
Roles: 10M × 1KB = 10 GB
Policies: 1M × 5KB = 5 GB
Audit logs: 50B events/year × 500B = 25 PB/year (tiered storage)
Total active data: ~1.5 TB
```

**Session Store (Redis/In-Memory):**
```
Concurrent sessions: 100M
Session size: 1 KB
Total memory: 100 GB (distributed across cluster)
With replication: 300 GB total
```

### Token Validation Throughput

**JWT Validation (Local):**
```
CPU per validation: 0.1ms (signature verification)
Validations per core: 10,000/second
For 3M/second peak: 300 cores dedicated to validation
With 50% headroom: 450 cores
```

**Token Introspection (Network):**
```
Introspection latency: 5ms average
Connections per instance: 10,000
Instances needed for 3M/second: 300 instances × 10K connections each
```

### Policy Engine Sizing

```
Policy evaluation: 0.5ms average (cached)
Evaluations per core: 2,000/second
For 3M/second peak: 1,500 cores
With caching (90% hit rate): 150 cores for cold evaluations
Policy cache memory: 10 GB per region
```

### Regional Deployment

| Component | Count per Region | Specification |
|-----------|------------------|---------------|
| Auth service nodes | 100+ | 8 CPU, 16 GB RAM |
| Token validation service | 200+ | 4 CPU, 8 GB RAM |
| Policy engine nodes | 50+ | 16 CPU, 32 GB RAM |
| User directory (primary) | 3 | 64 CPU, 256 GB RAM |
| User directory (replicas) | 5+ | 32 CPU, 128 GB RAM |
| Session cache (Redis) | 20 nodes | 32 GB RAM each |
| Policy cache (Redis) | 10 nodes | 16 GB RAM each |

---

## SLOs / SLAs

### Service Level Objectives (Internal)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Authentication Success Rate** | 99.9% | Successful logins / attempts (excl. user errors) |
| **Token Validation Latency** | < 1ms p99 | JWT validation time |
| **Policy Evaluation Latency** | < 5ms p99 | Cached policy evaluation |
| **Session Availability** | 99.99% | Session retrieval success |
| **Audit Log Completeness** | 100% | No lost security events |
| **Provisioning Latency** | < 5s p99 | SCIM user creation |

### Service Level Agreements (External)

| Metric | Commitment | Remedy |
|--------|------------|--------|
| Monthly Availability | 99.99% | Service credits |
| Authentication Latency | < 500ms p99 | Performance credits |
| Token Validation | < 10ms p99 | Performance credits |
| Data Durability | 99.999999999% (11 9s) | Data guarantee |
| Compliance Certifications | SOC2, HIPAA, GDPR | Audit reports |

### Error Budget

| Period | Allowed Downtime (99.99%) | Allowed Downtime (99.9%) |
|--------|---------------------------|--------------------------|
| Monthly | 4.32 minutes | 43.2 minutes |
| Quarterly | 12.96 minutes | 2.16 hours |
| Annually | 52.6 minutes | 8.76 hours |

---

## Constraints & Assumptions

### Technical Constraints

1. **Password hashing** - Must use memory-hard algorithms (Argon2id)
2. **Token signing** - RSA 2048+ or ECDSA P-256 minimum
3. **Encryption at rest** - AES-256 for all sensitive data
4. **TLS** - TLS 1.3 for all communications
5. **MFA timeout** - WebAuthn ceremony timeout 60 seconds
6. **Session lifetime** - Configurable, max 30 days
7. **Access token lifetime** - 5-60 minutes (configurable)
8. **Refresh token lifetime** - 1-90 days (configurable)

### Platform Limits

| Resource | Limit |
|----------|-------|
| Users per tenant | 10M |
| Groups per tenant | 100K |
| Roles per tenant | 10K |
| Policies per tenant | 10K |
| Custom attributes | 100 per entity |
| MFA devices per user | 10 |
| Active sessions per user | 100 |
| API rate limit | 10K requests/minute/tenant |
| SCIM batch size | 1,000 users |

### Security Constraints

1. **Credential storage** - Never store plaintext passwords
2. **Token transmission** - Always over HTTPS
3. **PKCE** - Required for public OAuth clients
4. **State parameter** - Required for OAuth flows
5. **Nonce** - Required for OIDC flows
6. **Origin validation** - Required for WebAuthn
7. **Rate limiting** - Required on all authentication endpoints
8. **Brute-force protection** - Account lockout after N failures

### Compliance Constraints

1. **Data residency** - Regional data storage options
2. **Right to be forgotten** - GDPR deletion within 30 days
3. **Audit retention** - 7 years for financial services
4. **Access logging** - All authentication events logged
5. **Consent tracking** - Record user consent for data processing

### Assumptions

1. Users have modern browsers supporting WebAuthn
2. Network latency between regions < 100ms
3. External IdPs have > 99.9% availability
4. TOTP device clocks are synchronized within 30 seconds
5. HSM hardware is available for key management
6. All client applications support OAuth 2.0 / OIDC

---

## Success Criteria

| Criteria | Measurement | Target |
|----------|-------------|--------|
| Authentication success rate | Successful / Total attempts | > 99.5% |
| MFA adoption rate | MFA-enabled users / Total users | > 80% |
| Passkey adoption | Passkey users / MFA users | > 30% (2+ years) |
| Token validation latency | p99 latency | < 1ms (JWT), < 10ms (introspection) |
| Policy cache hit rate | Cache hits / Total evaluations | > 95% |
| Provisioning automation | SCIM-provisioned / Manual | > 90% |
| Security incidents | Credential-related breaches | 0 |
| Compliance audit pass rate | Passed controls / Total controls | 100% |
