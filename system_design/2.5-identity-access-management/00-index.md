# Identity & Access Management (IAM) System - System Design

## System Overview

An **Identity & Access Management (IAM) System** is a centralized platform that handles authentication (verifying who users are), authorization (determining what they can do), and user lifecycle management across applications and services. Modern IAM systems support multiple authentication protocols (OAuth2, OIDC, SAML), diverse authorization models (RBAC, ABAC, ReBAC), phishing-resistant multi-factor authentication (WebAuthn/Passkeys), and automated user provisioning (SCIM).

The architecture separates a **control plane** responsible for policy administration, user directory management, identity provider configuration, and tenant management from a **data plane** that handles high-volume authentication flows, token validation, and authorization decisions. The key technical challenges include achieving sub-10ms policy evaluation latency at scale, maintaining strong security guarantees while enabling seamless user experiences, supporting complex multi-tenant architectures, and ensuring regulatory compliance across jurisdictions.

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| **Traffic Pattern** | Bimodal: login bursts + steady token validation | Cold path (auth) and warm path (validation) optimization |
| **Consistency Model** | Strong for auth decisions, eventual for sessions | Revocation propagation window trade-off |
| **Security Posture** | Zero-trust, defense-in-depth | Every request authenticated and authorized |
| **Scale Asymmetry** | 100:1 validation-to-login ratio | Token validation must be highly optimized |
| **Multi-tenancy** | Strong isolation between tenants | Separate encryption keys, audit trails |
| **Compliance** | SOC2, HIPAA, GDPR, FedRAMP | Data residency, audit logging, retention policies |

---

## Complexity Rating

**Very High**

- Multi-protocol authentication (OAuth2, OIDC, SAML, WebAuthn)
- Multiple authorization models (RBAC, ABAC, ReBAC) with policy engine
- Token management with multiple strategies (JWT, opaque, refresh rotation)
- Phishing-resistant MFA (WebAuthn/Passkeys, TOTP fallback)
- User provisioning and lifecycle (SCIM, JIT provisioning)
- Multi-tenant architecture with tenant isolation
- Federated identity with external IdPs
- Compliance requirements (SOC2, HIPAA, GDPR)
- Sub-10ms p99 authorization decisions at scale
- Credential security (Argon2id, HSM-backed signing)

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/Non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture, authentication/authorization flows, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data model, API design, algorithm pseudocode |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Policy engine, session management, token lifecycle, MFA deep dives |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Multi-region, policy caching, graceful degradation |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Threat model, credential security, compliance mapping |
| [07 - Observability](./07-observability.md) | Metrics, logging, security dashboards, brute-force detection |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trade-offs, trap questions, common mistakes |

---

## Core Components Summary

| Component | Responsibility | Criticality |
|-----------|---------------|-------------|
| **Identity Provider (IdP)** | User authentication, SSO, protocol translation | Critical - gateway to all identity |
| **Policy Engine (PDP)** | Evaluate authorization policies, make access decisions | Critical - security enforcement |
| **Policy Enforcement Point (PEP)** | Intercept requests, call PDP, enforce decisions | Critical - access control boundary |
| **User Directory** | Store identities, attributes, group memberships | Critical - source of identity truth |
| **Session Manager** | Create, validate, revoke sessions and tokens | Critical - stateful identity context |
| **MFA Service** | Multi-factor authentication (WebAuthn, TOTP, SMS) | Critical - authentication security |
| **Provisioning Service** | User lifecycle, SCIM integration, JIT provisioning | Important - identity automation |
| **Audit Logger** | Security event logging, compliance reporting | Important - compliance and forensics |

---

## Algorithm Summary

| Algorithm/Pattern | Purpose | Complexity | Key Insight |
|-------------------|---------|------------|-------------|
| **Policy Evaluation (OPA/Rego)** | Evaluate ABAC/ReBAC policies | O(policy size) | Graph traversal for relationship-based rules |
| **JWT Validation** | Verify token signatures and claims | O(1) | Local validation with cached public keys |
| **Token Introspection** | Check opaque token validity | O(1) network | Centralized revocation check |
| **Refresh Token Rotation** | Issue new tokens, detect reuse | O(1) | Family-based rotation with reuse detection |
| **Password Hashing (Argon2id)** | Secure credential storage | O(memory × iterations) | Memory-hard to resist GPU attacks |
| **WebAuthn Challenge-Response** | Phishing-resistant authentication | O(1) | Asymmetric cryptography with origin binding |
| **Session Clustering** | Distributed session management | O(1) with consistent hashing | Sticky sessions with failover |

---

## Architecture Trade-offs at a Glance

```
Stateless Tokens (JWT) ←――――――――→ Stateful Tokens (Opaque)
          ↑                              ↑
    No server lookup               Instant revocation
    Self-contained claims          Central authority needed
    Cannot revoke instantly        Lookup per request
    (External APIs)                (Internal services)

Centralized Policy Engine ←―――――→ Distributed Policy Cache
          ↑                              ↑
    Single source of truth         Lower latency
    Always consistent              Eventually consistent
    Network hop required           Local evaluation
    (Write path, complex rules)    (Read path, hot policies)

RBAC (Role-Based) ←―――――――――――――→ ReBAC (Relationship-Based)
          ↑                              ↑
    Simpler to understand          Fine-grained permissions
    Fewer entities                 Scales with relationships
    Role explosion at scale        Complex policy language
    (Enterprise apps)              (Collaborative apps)
```

---

## Protocol Comparison

| Protocol | Purpose | Token Format | Best For |
|----------|---------|--------------|----------|
| **OAuth 2.0** | Authorization delegation | Access/Refresh tokens | API access, 3rd-party apps |
| **OIDC** | Authentication + OAuth2 | ID Token (JWT) | User authentication, SSO |
| **SAML 2.0** | Federated SSO | XML assertions | Enterprise SSO, legacy systems |
| **WebAuthn/FIDO2** | Passwordless MFA | Public key credentials | Phishing-resistant auth |
| **SCIM** | User provisioning | JSON REST | User lifecycle automation |

---

## Authorization Model Comparison

| Model | Access Based On | Complexity | Best For |
|-------|-----------------|------------|----------|
| **RBAC** | User's assigned roles | Low | Enterprise apps with clear hierarchies |
| **ABAC** | User/resource/environment attributes | Medium | Dynamic access rules, compliance |
| **ReBAC** | Relationships between entities | High | Collaborative apps (Google Docs-like) |
| **Hybrid** | Combination of above | High | Complex enterprise requirements |

---

## Real-World References

| Provider | Architecture | Key Innovation |
|----------|------------|----------------|
| **Okta** | Cloud-native, event-sourced | Universal Directory, Workforce Identity |
| **Auth0** | Developer-first, extensible | Actions (serverless hooks), Rules |
| **Zitadel** | Event-sourced, self-hosted option | CQRS architecture, open source |
| **Keycloak** | Self-hosted, Red Hat backed | Extensive protocol support |
| **AWS IAM** | Policy-based, resource-centric | Fine-grained policies, principal hierarchy |
| **Google Zanzibar** | ReBAC at scale | Relationship tuples, global consistency |

---

## Related Systems

- **API Gateway** - Often first integration point for IAM
- **Service Mesh** - mTLS and authorization at service level
- **Secret Management** (Vault) - Credential storage, dynamic secrets
- **Audit Logging** - SIEM integration for security monitoring
- **Zero Trust Architecture** - IAM as foundation for zero trust
- **Directory Services** (LDAP, AD) - Legacy identity stores
