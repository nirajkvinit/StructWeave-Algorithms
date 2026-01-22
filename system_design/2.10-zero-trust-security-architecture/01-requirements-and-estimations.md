# Requirements & Capacity Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features (In Scope)

1. **Identity-Based Access Control**
   - Authenticate every request (user + device + context)
   - Support multiple identity providers (corporate IdP, partners)
   - Enable single sign-on (SSO) with MFA enforcement
   - Issue and validate short-lived access tokens

2. **Mutual TLS (mTLS) for All Communication**
   - Service-to-service authentication via certificates
   - Automatic certificate issuance for workloads
   - Certificate rotation without service disruption
   - Support for SPIFFE/SPIRE workload identities

3. **Policy-Based Access Control**
   - Real-time policy evaluation (ABAC + ReBAC)
   - Context-aware decisions (time, location, risk score)
   - Fine-grained resource permissions
   - Policy versioning and rollback

4. **Device Trust Verification**
   - Device posture assessment (OS version, patches, encryption)
   - Platform-specific attestation (TPM, secure enclave)
   - Continuous device compliance monitoring
   - Support for managed and BYOD devices

5. **Continuous Session Validation**
   - Re-evaluate access during active sessions
   - Step-up authentication for sensitive operations
   - Session termination on policy violation
   - Risk-based authentication challenges

6. **Micro-Segmentation**
   - Application-level network policies
   - Least-privilege access enforcement
   - Lateral movement prevention
   - Workload-to-workload authorization

### Out of Scope

- Network-level firewalls (assumed existing)
- VPN infrastructure (being replaced)
- Endpoint antivirus/EDR (separate system, provides signals)
- Physical security and badge access
- Data loss prevention (DLP) - separate system

---

## Non-Functional Requirements

### CAP Theorem Choice

**CP (Consistency + Partition Tolerance)** for Policy Decisions

**Justification:**
- Security policies must be consistently enforced
- Stale policy allowing unauthorized access is unacceptable
- During partition, prefer to deny access (fail-closed for security)
- However, cached policies can serve during brief outages

### Consistency Model

| Component | Consistency Requirement |
|-----------|------------------------|
| Policy decisions | Strong (latest policy applied) |
| Certificate validation | Cached with CRL/OCSP check |
| Device posture | Eventually consistent (minutes) |
| Session state | Strong per-session |
| Audit logs | Append-only, durable |

**Policy Propagation Window:** < 30 seconds globally

### Availability Target

| Component | Target | Downtime/Year | Rationale |
|-----------|--------|---------------|-----------|
| PDP (Policy Decision) | 99.999% | 5.26 minutes | Critical path |
| Identity Provider | 99.99% | 52.6 minutes | Authentication critical |
| Certificate Authority | 99.99% | 52.6 minutes | Service communication |
| Device Trust Service | 99.9% | 8.76 hours | Can cache posture |
| Audit Logging | 99.99% | 52.6 minutes | Compliance required |

**Rationale:** Zero Trust infrastructure is on the critical path for ALL access. Downtime means users cannot work and services cannot communicate.

### Latency Targets

| Operation | Target | Justification |
|-----------|--------|---------------|
| Policy evaluation (p50) | < 2ms | Inline with every request |
| Policy evaluation (p99) | < 10ms | Tail latency budget |
| Certificate validation | < 1ms | mTLS handshake overhead |
| Token validation | < 5ms | JWT verification |
| Device posture check | < 100ms | Can be async/cached |
| Full authentication flow | < 2s | User-facing, includes MFA |

### Durability

| Data Type | Durability | Storage |
|-----------|-----------|---------|
| Policy definitions | 99.9999% | Replicated config store |
| Certificates (CA keys) | 99.999999% | HSM + backup |
| Access decision logs | 99.999% | Time-series + archive |
| Session state | Best effort | Distributed cache |
| Device inventory | 99.99% | Database with replication |

### Throughput

- **Policy Evaluations:** 1 million per second (enterprise scale)
- **Certificate Issuance:** 10,000 per minute (rotation + new workloads)
- **Token Validations:** 500,000 per second
- **Audit Events:** 100,000 per second (ingestion)

---

## Capacity Estimations (Back-of-Envelope)

### Assumptions

- Large enterprise: 100,000 employees
- 50 authenticated actions per employee per hour (peak)
- 10,000 microservices with mTLS
- 100 service-to-service calls per user request
- 24-hour certificate TTL, 12-hour rotation
- 30-day audit log retention (hot), 7-year archive

### Traffic Estimates

| Metric | Calculation | Value |
|--------|-------------|-------|
| **Peak concurrent users** | 100K × 30% | 30,000 users |
| **User auth checks/sec** | 30K × 50/3600 | ~420 checks/sec |
| **Service-to-service calls/sec** | 420 × 100 | ~42,000 calls/sec |
| **Policy evaluations/sec** | 420 + 42,000 | ~50,000 evaluations/sec |
| **Design target (3x headroom)** | 50K × 3 | **~150,000 evals/sec** |

### Certificate Lifecycle

| Metric | Calculation | Value |
|--------|-------------|-------|
| **Active certificates** | 10,000 services × 3 replicas | 30,000 certs |
| **Rotation frequency** | Every 12 hours | 2x per day |
| **Cert issuance rate** | 30K × 2 / 86400 | ~0.7 certs/sec avg |
| **Peak rotation (coordinated)** | 30K in 10 minutes | ~50 certs/sec peak |

### Storage Estimates

**Policy Store:**
```
Average policy size: 5 KB (JSON/YAML)
Number of policies: 10,000 (rules, roles, conditions)
Total policy storage: 50 MB

With versioning (10 versions): 500 MB
With 3x replication: 1.5 GB
```

**Certificate Store:**
```
Certificate size: 2 KB (X.509)
Active certificates: 30,000
CA chain + metadata: 1 KB per cert
Total: ~90 MB

With CRL data: +50 MB
Total cert storage: ~150 MB
```

**Audit Log Storage:**
```
Log entry size: 500 bytes (structured JSON)
Events per second: 100,000
Per day: 100K × 86400 × 500B = ~4.3 TB/day

30-day hot storage: ~130 TB
Compressed (10:1): ~13 TB hot storage
```

### Bandwidth Estimates

| Direction | Calculation | Value |
|-----------|-------------|-------|
| Policy sync (per node) | 50MB / 30s burst | ~1.7 MB/s peak |
| Certificate downloads | 50/s × 3KB | 150 KB/s |
| Audit log ingestion | 100K/s × 500B | 50 MB/s |
| mTLS overhead | 2KB handshake × 50K/s | 100 MB/s |

### Infrastructure Estimate

| Component | Count | Specification |
|-----------|-------|---------------|
| PDP Cluster | 10-15 nodes | 16 CPU, 32GB RAM |
| Identity Provider | 5-7 nodes | 8 CPU, 16GB RAM |
| Certificate Authority | 3-5 nodes | 8 CPU, 16GB RAM, HSM |
| Device Trust Service | 3-5 nodes | 8 CPU, 32GB RAM |
| Policy Store (distributed) | 5-7 nodes | 8 CPU, 64GB RAM, SSD |
| Audit Log Pipeline | 10+ nodes | 16 CPU, 64GB RAM, NVMe |

---

## SLOs / SLAs

### Service Level Objectives (Internal)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Policy eval availability** | 99.999% | (successful evals / total evals) |
| **Policy eval latency (p99)** | < 10ms | End-to-end decision time |
| **Certificate issuance latency** | < 500ms | CSR to signed cert |
| **Policy propagation time** | < 30s | Update to enforcement |
| **False denial rate** | < 0.01% | Legitimate access blocked |
| **Audit log delivery** | < 5 minutes | Event to searchable |

### Service Level Agreements (External)

| Metric | Commitment | Penalty |
|--------|------------|---------|
| Authentication availability | 99.9% monthly | Service credits |
| Access decision accuracy | > 99.99% | Investigation within 24h |
| Incident response (P1) | < 15 minutes | Escalation |
| Policy change SLA | < 5 minutes | Best effort |

### Error Budget

| Period | Allowed Downtime | Allowed Failed Decisions |
|--------|-----------------|-------------------------|
| Monthly (99.999%) | 26 seconds | 0.001% of requests |
| Quarterly | 78 seconds | Rolling calculation |
| Annual | 5.26 minutes | Executive review |

---

## Constraints & Assumptions

### Technical Constraints

1. **Latency budget** - Policy check adds to every request path
2. **PKI complexity** - CA must never lose private keys
3. **Clock synchronization** - Required for certificate validation
4. **Platform diversity** - Must support multiple OS, device types
5. **Legacy systems** - Some cannot support mTLS (need proxies)

### Business Constraints

1. **Regulatory compliance** - Audit logs must be immutable
2. **User experience** - Authentication friction minimized
3. **Migration timeline** - Gradual rollout over 12-18 months
4. **Multi-cloud** - Must work across cloud providers
5. **Third-party access** - Contractors, vendors need access

### Assumptions

1. Users have corporate-managed or registered devices
2. Network connectivity is available (no offline mode)
3. Time synchronization (NTP) is reliable
4. HSM infrastructure exists for CA key protection
5. Identity Provider (IdP) is already deployed

---

## Success Criteria

| Criteria | Measurement | Target |
|----------|-------------|--------|
| Security incidents from lateral movement | Post-breach analysis | 0 successful |
| VPN-related helpdesk tickets | Support metrics | 90% reduction |
| Time to access for new employees | Onboarding metrics | < 1 hour |
| Policy change to enforcement | Deployment metrics | < 5 minutes |
| User authentication friction | User surveys | < 5% complaints |
| Compliance audit findings | Audit reports | 0 critical findings |
