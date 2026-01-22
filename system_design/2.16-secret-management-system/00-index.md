# Secret Management System - System Design

## System Overview

A **Secret Management System** is a centralized platform for securely storing, accessing, distributing, and managing sensitive data such as API keys, passwords, certificates, and encryption keys. Modern secret management systems implement a zero-knowledge architecture where the platform itself cannot read the secrets it stores—all data passes through a cryptographic barrier that encrypts data at rest using keys that are themselves protected by a seal mechanism.

The architecture separates a **control plane** responsible for authentication, authorization, policy management, and audit logging from a **data plane** that handles secret storage, retrieval, dynamic credential generation, and cryptographic operations. Key technical challenges include implementing secure key hierarchies (master key → data encryption key), managing the seal/unseal lifecycle for cold starts and disaster recovery, providing dynamic short-lived credentials to eliminate static secret sprawl, and maintaining comprehensive audit trails for compliance requirements.

Unlike simple encrypted key-value stores, production secret management systems must support multiple secret engines (KV, database credentials, PKI certificates, transit encryption), pluggable authentication methods (AppRole, Kubernetes, cloud IAM, OIDC), fine-grained policy-based authorization, lease management for dynamic secrets, and high availability with disaster recovery replication.

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| **Traffic Pattern** | Read-heavy with bursty writes; 1000:1 read-to-write ratio | Optimize read path with caching; writes require strong consistency |
| **Consistency Model** | Strong for writes; eventual for cached reads | All secret updates immediately visible; cached policy evaluation acceptable |
| **Security Posture** | Zero-knowledge, defense-in-depth | Platform cannot read secrets; multiple encryption layers |
| **Availability Target** | 99.99% for reads; 99.9% for writes | Reads can use replicas; writes require leader |
| **Latency Sensitivity** | p99 < 10ms reads; p99 < 50ms writes | Critical for application startup and runtime |
| **Multi-tenancy** | Strong tenant isolation via namespaces | Separate encryption contexts, policies, audit trails |
| **Compliance** | SOC 2, HIPAA, PCI-DSS, FedRAMP | Comprehensive audit logging, encryption at rest, access controls |

---

## Complexity Rating

**Very High**

- Cryptographic key hierarchy management (master key, data encryption key, seal mechanism)
- Shamir's Secret Sharing for distributed key custody
- Multiple secret engines with different semantics (KV, database, PKI, transit)
- Dynamic credential generation with lease tracking and automatic revocation
- PKI/CA functionality (certificate issuance, rotation, revocation)
- Pluggable authentication methods (AppRole, Kubernetes, OIDC, mTLS, cloud IAM)
- Fine-grained policy language with path-based ACLs and templating
- High availability with Raft consensus and performance replication
- Disaster recovery with warm standby clusters
- Compliance requirements (audit logging, encryption, access controls)
- Seal/unseal lifecycle for cold starts and recovery

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/Non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture, secret engines, authentication flows, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data model, API design, algorithm pseudocode |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Seal/unseal, dynamic secrets, PKI engine deep dives |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Multi-region, replication, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Threat model, zero-knowledge, compliance mapping |
| [07 - Observability](./07-observability.md) | Metrics, audit logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trade-offs, trap questions, common mistakes |

---

## Core Components Summary

| Component | Responsibility | Criticality |
|-----------|---------------|-------------|
| **Seal Manager** | Protect master key via Shamir's Secret Sharing or auto-unseal; gate all operations when sealed | Critical - system unusable when sealed |
| **Cryptographic Barrier** | Encrypt/decrypt all data passing to/from storage backend | Critical - zero-knowledge guarantee |
| **Auth Methods** | Verify client identity (AppRole, Kubernetes, OIDC, mTLS, cloud IAM) | Critical - authentication gateway |
| **Policy Engine** | Evaluate path-based ACL policies for authorization decisions | Critical - access control enforcement |
| **KV Secret Engine** | Store and version static secrets with metadata | Important - most common use case |
| **Database Engine** | Generate dynamic database credentials with automatic revocation | Important - eliminates static DB passwords |
| **PKI Engine** | Issue, rotate, and revoke X.509 certificates | Important - internal TLS/mTLS |
| **Transit Engine** | Encryption-as-a-service without exposing keys | Important - application-level encryption |
| **Lease Manager** | Track TTLs, handle renewals, trigger revocations | Critical - dynamic secret lifecycle |
| **Audit Logger** | Record all operations for compliance and forensics | Critical - compliance requirement |
| **Replication Manager** | Synchronize data across performance and DR replicas | Important - HA and DR |

---

## Algorithm Summary

| Algorithm/Pattern | Purpose | Complexity | Key Insight |
|-------------------|---------|------------|-------------|
| **Shamir's Secret Sharing** | Split master key into N shares, require K to reconstruct | O(N) for split/combine | Information-theoretic security: K-1 shares reveal nothing |
| **AES-256-GCM** | Encrypt secrets at rest | O(data size) | Authenticated encryption prevents tampering |
| **HKDF (Key Derivation)** | Derive context-specific keys from master key | O(1) | Same master serves multiple purposes safely |
| **Raft Consensus** | Leader election and log replication for HA | O(log N) per operation | Strong consistency for secret updates |
| **Lease Tracking** | Monitor TTLs and trigger revocations | O(log N) insert/delete | Priority queue ordered by expiration time |
| **Policy Evaluation** | Match request path against ACL rules | O(policy count × path depth) | Longest-match wins; deny by default |
| **Token Bucket** | Rate limit API requests | O(1) | Prevent DoS and brute-force attacks |

---

## Architecture Trade-offs at a Glance

```
Shamir's Secret Sharing ←――――――――→ Cloud KMS Auto-Unseal
          ↑                                ↑
    No external dependency            Automated unsealing
    Requires human operators          Depends on cloud provider
    Highest security posture          Single point of failure risk
    (Compliance-sensitive)            (Production automation)

Static Secrets ←―――――――――――――――――→ Dynamic Secrets
          ↑                                ↑
    Simple to understand              Unique per request
    Long-lived credentials            Short TTL, auto-revoke
    Rotation burden on users          No credential sharing
    (Legacy applications)             (Modern microservices)

Long-Lived Certificates ←―――――――――→ Short-Lived Certificates
          ↑                                ↑
    Fewer issuance operations         No revocation needed
    CRL/OCSP infrastructure           Frequent rotation overhead
    Revocation is hard                Natural expiration
    (External-facing)                 (Service mesh, internal)

Centralized Secrets ←―――――――――――――→ Distributed/Federated
          ↑                                ↑
    Single source of truth            Lower latency
    Easier compliance                 Regional autonomy
    Global consistency                Eventual consistency
    (Enterprise standard)             (Multi-cloud, edge)
```

---

## Secret Engine Comparison

| Engine | Secret Type | Lifecycle | Best For |
|--------|-------------|-----------|----------|
| **KV v2** | Static key-value pairs | Manual rotation, versioned | API keys, config, passwords |
| **Database** | Dynamic DB credentials | Auto-generated, leased, auto-revoked | MySQL, PostgreSQL, MongoDB access |
| **PKI** | X.509 certificates | Issued on demand, short or long lived | Internal TLS, mTLS, service identity |
| **Transit** | Encryption keys (never exposed) | Versioned, rotatable | Application-level encryption |
| **AWS/GCP/Azure** | Cloud IAM credentials | Dynamic STS tokens | Cloud resource access |
| **SSH** | SSH certificates/OTP | Short-lived, signed | Server access |

---

## Authentication Method Comparison

| Method | Identity Source | Best For | Considerations |
|--------|----------------|----------|----------------|
| **AppRole** | RoleID + SecretID | CI/CD, automation | SecretID delivery is bootstrap challenge |
| **Kubernetes** | ServiceAccount JWT | K8s workloads | Requires K8s API access |
| **OIDC** | External IdP (Okta, Auth0) | Human users, SSO | Federated identity |
| **TLS Certificates** | Client certificate | mTLS environments | Certificate distribution |
| **AWS IAM** | EC2 instance role | AWS workloads | Cloud-specific |
| **Userpass** | Username/password | Development, testing | Not recommended for production |

---

## Real-World References

| System | Architecture | Key Innovation |
|--------|--------------|----------------|
| **HashiCorp Vault** | Seal/unseal, pluggable backends, policy-based | Industry standard; secret engines, dynamic secrets |
| **AWS Secrets Manager** | Managed service, Lambda rotation | Native RDS integration, automatic rotation |
| **Azure Key Vault** | HSM-backed, RBAC integration | Premium tier with dedicated HSM |
| **GCP Secret Manager** | IAM-native, versioned | Simple API, Cloud Audit Logs integration |
| **CyberArk Conjur** | DevOps-focused, machine identity | Kubernetes-native, policy as code |
| **Doppler** | Developer experience focus | Environment sync, change tracking |

---

## Related Systems

- **Identity & Access Management (IAM)** - Authentication source for secret access
- **Service Mesh** (Istio/Linkerd) - mTLS certificates from PKI engine
- **Zero Trust Architecture** - Secrets as foundation for workload identity
- **Configuration Management** - Non-sensitive config alongside secrets
- **CI/CD Pipelines** - Dynamic credentials for build/deploy
- **Audit/SIEM Systems** - Ingest audit logs for security monitoring
- **HSM (Hardware Security Module)** - Hardware protection for master keys

---

## Interview Quick Reference

| Topic | Time Allocation | Key Points |
|-------|-----------------|------------|
| **Seal/Unseal** | 25% | Shamir's algorithm, key hierarchy, auto-unseal trade-offs |
| **Secret Engines** | 25% | KV vs dynamic, lease management, PKI workflow |
| **Security** | 30% | Zero-knowledge, encryption layers, threat model |
| **Operations** | 20% | HA, replication, DR, compliance |

**Must discuss**: Key hierarchy (master → DEK), dynamic secrets advantage, audit requirements

**Common mistakes**: Ignoring seal complexity, forgetting lease management, no threat model
