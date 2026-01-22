# Secret Management System - Requirements & Estimations

## Functional Requirements

### Core Secret Operations
- **Secret CRUD**: Create, read, update, delete secrets with path-based organization
- **Versioning**: Maintain version history for secrets with rollback capability
- **Metadata**: Attach custom metadata and labels to secrets
- **Soft Delete**: Mark secrets as deleted with configurable destruction delay
- **Bulk Operations**: List secrets by prefix, batch read operations

### Dynamic Secret Generation
- **Database Credentials**: Generate unique credentials for MySQL, PostgreSQL, MongoDB, Oracle
- **Cloud IAM**: Generate temporary cloud provider credentials (AWS STS, GCP, Azure)
- **SSH Certificates**: Issue short-lived SSH certificates or OTPs
- **Lease Management**: Track TTLs, support renewal, automatic revocation on expiry

### PKI / Certificate Management
- **Certificate Issuance**: Generate X.509 certificates from configured CA
- **CA Hierarchy**: Support root CA and intermediate CA configurations
- **Certificate Revocation**: Maintain CRL, support OCSP responses
- **Short-Lived Certificates**: Issue certificates with minutes-to-hours TTL

### Transit Encryption (Encryption-as-a-Service)
- **Encrypt/Decrypt**: Encrypt data without exposing encryption keys
- **Key Rotation**: Rotate encryption keys while maintaining decrypt capability for old ciphertexts
- **Rewrap**: Re-encrypt ciphertext with latest key version without exposing plaintext
- **Sign/Verify**: Digital signatures for data integrity

### Authentication
- **AppRole**: Machine-oriented authentication with RoleID and SecretID
- **Kubernetes**: ServiceAccount JWT-based authentication
- **OIDC/OAuth2**: Integration with external identity providers
- **TLS Certificates**: Client certificate authentication
- **Cloud IAM**: AWS IAM, GCP IAM, Azure AD authentication
- **LDAP/AD**: Enterprise directory integration

### Authorization
- **Policy-Based Access Control**: Path-based ACL policies
- **Capabilities**: create, read, update, delete, list, sudo, deny
- **Policy Templating**: Dynamic paths using identity metadata
- **Namespaces**: Tenant isolation with hierarchical namespaces (Enterprise)

### Audit & Compliance
- **Comprehensive Logging**: Log all requests with request/response details
- **HMAC Protection**: Hash sensitive values in audit logs
- **Multiple Backends**: File, syslog, socket audit devices
- **Tamper Evidence**: Detect audit log modifications

### Out of Scope
- Application-level secret injection (handled by sidecars, CSI drivers)
- Secret scanning in source code (handled by GitGuardian, Gitleaks)
- Password managers for end users (handled by 1Password, Bitwarden)
- Hardware key management (HSM is integration, not core functionality)

---

## Non-Functional Requirements

### CAP Theorem Position

| Component | CAP Choice | Justification |
|-----------|------------|---------------|
| **Secret Writes** | CP | All writes must be consistent; cannot have conflicting secret versions |
| **Secret Reads** | CP with caching | Reads from leader or consistent replicas; caching acceptable for policies |
| **Policy Evaluation** | AP (cached) | Slightly stale policy acceptable for sub-millisecond evaluation |
| **Audit Logging** | CP | Audit logs must be complete; block operations if audit fails |

### Consistency Requirements

| Operation | Consistency Model | Acceptable Staleness |
|-----------|------------------|---------------------|
| Secret write | Strong | 0 (immediate) |
| Secret read | Strong | 0 (must see own writes) |
| Policy update | Strong | 0 |
| Policy evaluation | Eventual | < 5 seconds (cached) |
| Lease state | Strong | 0 |
| Audit log | Strong | 0 (synchronous write) |
| Token validation | Eventual | < 1 second (revocation propagation) |

### Availability Targets

| Component | Availability | Monthly Downtime | Justification |
|-----------|--------------|------------------|---------------|
| Secret reads | 99.99% | 4.3 minutes | Applications depend on secrets at startup |
| Secret writes | 99.9% | 43.8 minutes | Writes less frequent, can queue |
| Authentication | 99.99% | 4.3 minutes | Blocks all access if down |
| Dynamic secrets | 99.9% | 43.8 minutes | Existing leases continue working |
| PKI issuance | 99.9% | 43.8 minutes | Short-lived certs need frequent renewal |
| Audit logging | 99.99% | 4.3 minutes | Operations blocked if audit fails |

### Latency Targets

| Operation | p50 | p95 | p99 | Justification |
|-----------|-----|-----|-----|---------------|
| Secret read (cached) | 1ms | 3ms | 5ms | Hot path for applications |
| Secret read (uncached) | 5ms | 15ms | 25ms | Storage backend access |
| Secret write | 10ms | 30ms | 50ms | Raft consensus required |
| Authentication | 5ms | 20ms | 50ms | May involve external IdP |
| Policy evaluation | 0.5ms | 2ms | 5ms | Cached policy lookup |
| Dynamic credential | 50ms | 150ms | 300ms | Database connection setup |
| Certificate issuance | 20ms | 50ms | 100ms | Cryptographic operations |
| Transit encrypt | 2ms | 5ms | 10ms | Pure cryptographic operation |

### Throughput Requirements

| Operation | Sustained | Burst | Notes |
|-----------|-----------|-------|-------|
| Secret reads | 10,000/sec | 50,000/sec | Application startup bursts |
| Secret writes | 100/sec | 500/sec | Relatively rare |
| Authentications | 1,000/sec | 10,000/sec | Workload scaling events |
| Lease renewals | 5,000/sec | 20,000/sec | Background renewal traffic |
| Transit operations | 5,000/sec | 25,000/sec | Application encryption needs |

### Durability Requirements

| Data Type | Durability | Retention | Backup Frequency |
|-----------|------------|-----------|------------------|
| Secrets | 99.999999% | Until deleted | Real-time replication |
| Encryption keys | 99.9999999% | Indefinite | Multiple replicas + offline backup |
| Audit logs | 99.9999% | 7 years (compliance) | Daily backup, immutable storage |
| Policies | 99.999% | Until deleted | Real-time replication |
| Leases | 99.99% | Until expiry | In-memory with persistence |

---

## Capacity Estimations

### Assumptions
- 10,000 microservices across the organization
- Each service has 5-10 secrets on average
- 1,000 dynamic credential requests per minute
- 500 certificate issuances per minute
- 30-day average secret version retention
- 7-year audit log retention

### Storage Estimations

| Metric | Calculation | Result |
|--------|-------------|--------|
| Total secrets | 10,000 services × 10 secrets | 100,000 secrets |
| Secret size (avg) | 1 KB (encrypted value + metadata) | 1 KB |
| Versions per secret | 10 versions (30-day retention) | 10 |
| Secret storage | 100,000 × 1 KB × 10 versions | 1 GB |
| Active leases | 1,000/min × 60 min avg TTL | 60,000 leases |
| Lease storage | 60,000 × 500 bytes | 30 MB |
| Policies | 1,000 policies × 5 KB | 5 MB |
| Certificates (active) | 50,000 certs × 2 KB | 100 MB |
| **Subtotal (operational)** | | **~1.2 GB** |
| Audit logs (daily) | 10M ops × 1 KB | 10 GB/day |
| Audit logs (Year 1) | 10 GB × 365 | 3.65 TB |
| **Total Year 1** | | **~4 TB** |
| **Total Year 5** | 5× growth + 5 years audit | **~25 TB** |

### Throughput Estimations

| Metric | Calculation | Result |
|--------|-------------|--------|
| DAU (services) | 10,000 microservices | 10,000 |
| Reads per service/day | 1,000 (startup + runtime) | 1,000 |
| Daily reads | 10,000 × 1,000 | 10M reads/day |
| Average QPS (reads) | 10M / 86,400 | ~115 QPS |
| Peak QPS (reads) | 10× average (deployment burst) | ~1,150 QPS |
| Daily writes | 10,000 secret updates | 10,000 |
| Average QPS (writes) | 10,000 / 86,400 | ~0.1 QPS |
| Dynamic creds/day | 1,000/min × 1,440 min | 1.44M/day |
| Cert issuances/day | 500/min × 1,440 min | 720K/day |

### Bandwidth Estimations

| Traffic Type | Calculation | Result |
|--------------|-------------|--------|
| Read responses | 115 QPS × 2 KB avg | 230 KB/s |
| Write requests | 0.1 QPS × 5 KB | 0.5 KB/s |
| Replication | 10 KB/s (log shipping) | 10 KB/s |
| Audit logging | 10M ops/day × 1 KB / 86,400 | 115 KB/s |
| **Total bandwidth** | | **~400 KB/s sustained** |
| **Peak bandwidth** | 10× sustained | **~4 MB/s** |

### Infrastructure Sizing

| Component | Minimum | Recommended | Enterprise |
|-----------|---------|-------------|------------|
| Vault nodes | 3 | 5 | 5+ per region |
| CPU per node | 4 cores | 8 cores | 16 cores |
| Memory per node | 8 GB | 16 GB | 32 GB |
| Storage per node | 50 GB SSD | 100 GB SSD | 500 GB NVMe |
| Audit storage | 5 TB | 10 TB | 50 TB (immutable) |

---

## SLOs / SLAs

### Service Level Objectives

| Metric | Target | Measurement | Alert Threshold |
|--------|--------|-------------|-----------------|
| **Availability (reads)** | 99.99% | Successful reads / Total reads | < 99.95% |
| **Availability (writes)** | 99.9% | Successful writes / Total writes | < 99.5% |
| **Latency (read p99)** | < 25ms | 99th percentile read latency | > 50ms |
| **Latency (write p99)** | < 100ms | 99th percentile write latency | > 200ms |
| **Latency (auth p99)** | < 50ms | 99th percentile auth latency | > 100ms |
| **Error rate** | < 0.1% | Errors / Total requests | > 0.5% |
| **Audit completeness** | 100% | Logged ops / Total ops | < 100% |
| **Seal recovery** | < 5 min | Time from incident to unsealed | > 10 min |

### Error Budget

| Metric | Monthly Budget | Burn Rate Alert |
|--------|----------------|-----------------|
| Read availability | 4.3 min downtime | > 1 min/day |
| Write availability | 43.8 min downtime | > 10 min/day |
| Latency (% above SLO) | 1% of requests | > 2% in 1 hour |

### Operational SLAs

| Scenario | Target | Escalation |
|----------|--------|------------|
| Unplanned seal | Unseal within 15 min | Page on-call immediately |
| Secret leak incident | Rotate within 1 hour | Security incident response |
| DR failover | Promote within 5 min | Automated with manual override |
| Policy change | Apply within 1 min | Should be near-instant |

---

## Constraints & Assumptions

### Technical Constraints
- Must support existing authentication systems (LDAP, OIDC providers)
- Cannot require application code changes for basic secret retrieval
- Must operate in air-gapped environments (no cloud dependency for core functionality)
- Audit logs must be exportable to enterprise SIEM

### Business Constraints
- Must achieve SOC 2 Type II certification
- Must support PCI-DSS requirements for payment systems
- Must support HIPAA requirements for healthcare data
- FedRAMP compliance for government contracts

### Assumptions
- Network latency between Vault nodes < 10ms (same region)
- Storage backend provides durable writes
- HSM available for FIPS-compliant deployments
- DNS and load balancing infrastructure already exists
