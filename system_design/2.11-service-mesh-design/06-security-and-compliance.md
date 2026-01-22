# Service Mesh Design - Security & Compliance

[Back to Index](./00-index.md) | [Previous: Scalability](./05-scalability-and-reliability.md) | [Next: Observability](./07-observability.md)

---

## Security Architecture

### Zero-Trust Model

```
ZERO-TRUST PRINCIPLES IN SERVICE MESH:
═══════════════════════════════════════════════════════════════

Traditional (Perimeter) Model:
─────────────────────────────────────────────────────────────
  Outside ──┬── Firewall ──┬── Inside (Trusted)
            │              │
            │   ┌──────────┴─────────────────┐
            │   │  Services communicate      │
            │   │  freely inside network     │
            │   │  (no auth between services)│
            │   └────────────────────────────┘

Zero-Trust Model (Service Mesh):
─────────────────────────────────────────────────────────────
  Every request authenticated and authorized,
  regardless of network location

  ┌────────────────────────────────────────────────────────┐
  │                    MESH BOUNDARY                        │
  │                                                         │
  │  Service A ──mTLS──► Service B ──mTLS──► Service C     │
  │     │                   │                   │          │
  │     │    Identity       │    Identity       │          │
  │     │    Verified       │    Verified       │          │
  │     │    Authz Check    │    Authz Check    │          │
  │                                                         │
  │  Every hop: Authenticate → Authorize → Encrypt         │
  └────────────────────────────────────────────────────────┘

Key Principles:
─────────────────────────────────────────────────────────────
1. Never trust, always verify
2. Assume breach (defense in depth)
3. Least privilege access
4. Verify explicitly (every request)
5. Encrypt everything
```

---

## Authentication (AuthN)

### Mutual TLS (mTLS)

```
MTLS IN SERVICE MESH:
═══════════════════════════════════════════════════════════════

Standard TLS (one-way):
─────────────────────────────────────────────────────────────
  Client ─────────────────────────────────► Server
          Server presents certificate
          Client verifies server identity
          (Server doesn't verify client)

Mutual TLS (two-way):
─────────────────────────────────────────────────────────────
  Client ◄────────────────────────────────► Server
          Both present certificates
          Both verify each other's identity
          Strong mutual authentication

Certificate Chain:
─────────────────────────────────────────────────────────────

  ┌─────────────────────────────────────────────────────────┐
  │                      ROOT CA                             │
  │  (Trust anchor, offline, air-gapped storage)            │
  └─────────────────────────┬───────────────────────────────┘
                            │ Signs
                            ▼
  ┌─────────────────────────────────────────────────────────┐
  │                  INTERMEDIATE CA                         │
  │  (Istiod built-in CA or external)                       │
  └─────────────────────────┬───────────────────────────────┘
                            │ Signs
                            ▼
  ┌─────────────────────────────────────────────────────────┐
  │                 WORKLOAD CERTIFICATES                    │
  │  (Short-lived, 24h default, per-pod)                    │
  │                                                          │
  │  Subject Alternative Name (SAN):                        │
  │  URI: spiffe://cluster.local/ns/default/sa/frontend     │
  └─────────────────────────────────────────────────────────┘
```

### SPIFFE Identity Framework

```
SPIFFE (Secure Production Identity Framework for Everyone):
═══════════════════════════════════════════════════════════════

SPIFFE ID Format:
─────────────────────────────────────────────────────────────
  spiffe://<trust-domain>/<workload-identifier>

Examples:
  spiffe://cluster.local/ns/production/sa/api-server
  spiffe://example.org/region/us-east/workload/database

Components:
─────────────────────────────────────────────────────────────
• Trust Domain: Unique identifier for the trust boundary
• Workload Path: Hierarchical path identifying the workload

SVID (SPIFFE Verifiable Identity Document):
─────────────────────────────────────────────────────────────
  X.509-SVID: Standard X.509 certificate with SPIFFE ID in SAN
  JWT-SVID: JWT token with SPIFFE ID in subject claim

Mesh Implementation:
─────────────────────────────────────────────────────────────
• Istio: Built-in SPIFFE support via Istiod CA
• Linkerd: Uses SPIFFE-compatible identities
• SPIRE: Standalone SPIFFE implementation (can integrate)

Identity Derivation (Kubernetes):
─────────────────────────────────────────────────────────────
  Pod metadata → SPIFFE ID

  Pod:
    namespace: production
    serviceAccount: api-server
        │
        ▼
  SPIFFE ID: spiffe://cluster.local/ns/production/sa/api-server

  Identity is automatically derived, no application changes needed
```

### PeerAuthentication Configuration

```
PEER AUTHENTICATION MODES:
═══════════════════════════════════════════════════════════════

Mode: STRICT
─────────────────────────────────────────────────────────────
• Only mTLS traffic accepted
• Plaintext connections rejected
• Recommended for production

Mode: PERMISSIVE
─────────────────────────────────────────────────────────────
• Accept both mTLS and plaintext
• Useful during migration
• Should be temporary

Mode: DISABLE
─────────────────────────────────────────────────────────────
• mTLS disabled
• Not recommended (security risk)

Configuration Examples:
─────────────────────────────────────────────────────────────

# Mesh-wide strict mTLS
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system    # Applies to entire mesh
spec:
  mtls:
    mode: STRICT

# Namespace-level permissive (for migration)
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: legacy-apps
spec:
  mtls:
    mode: PERMISSIVE

# Workload-level with port exception
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: api-server
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE    # Health check port
```

---

## Authorization (AuthZ)

### AuthorizationPolicy

```
AUTHORIZATION POLICY STRUCTURE:
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                  AuthorizationPolicy                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  selector:                                                   │
│    matchLabels:                                              │
│      app: api-server     ←── Which workloads to protect     │
│                                                              │
│  action: ALLOW | DENY | CUSTOM | AUDIT                      │
│                                                              │
│  rules:                                                      │
│    - from:               ←── Source conditions (WHO)         │
│        - source:                                             │
│            principals: ["cluster.local/ns/web/sa/frontend"] │
│            namespaces: ["production"]                       │
│            ipBlocks: ["10.0.0.0/8"]                         │
│                                                              │
│      to:                 ←── Destination conditions (WHAT)   │
│        - operation:                                          │
│            methods: ["GET", "POST"]                         │
│            paths: ["/api/*"]                                │
│            ports: ["8080"]                                  │
│                                                              │
│      when:               ←── Additional conditions           │
│        - key: request.headers[x-api-key]                    │
│          values: ["valid-key"]                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Evaluation Order:
─────────────────────────────────────────────────────────────
1. CUSTOM policies (external authorization)
2. DENY policies (if any match, request denied)
3. ALLOW policies (if any match, request allowed)
4. Default: Deny if any policy exists, Allow if none

Policy Patterns:
─────────────────────────────────────────────────────────────

# Allow specific service to call another
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/frontend
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/v1/*"]

# Deny all traffic except explicitly allowed
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}    # Empty spec = deny all
```

### Request Authentication (JWT)

```
REQUEST AUTHENTICATION:
═══════════════════════════════════════════════════════════════

Purpose: Validate JWT tokens from end users
─────────────────────────────────────────────────────────────

Flow:
  User → [JWT] → Ingress Gateway → [JWT validated] → Service

Configuration:
─────────────────────────────────────────────────────────────

apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      audiences:
        - "api.example.com"
      forwardOriginalToken: true
      fromHeaders:
        - name: Authorization
          prefix: "Bearer "

# Require valid JWT
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://auth.example.com/*"]
      when:
        - key: request.auth.claims[groups]
          values: ["admin", "api-users"]

Combined AuthN/AuthZ:
─────────────────────────────────────────────────────────────
• mTLS: Service-to-service authentication (workload identity)
• JWT: End-user authentication (user identity)
• AuthorizationPolicy: Fine-grained access control
```

---

## Threat Model

### Attack Vectors

| Attack Vector | Description | Mesh Protection |
|---------------|-------------|-----------------|
| **Man-in-the-Middle** | Intercept service traffic | mTLS encrypts all traffic |
| **Service Impersonation** | Pretend to be another service | mTLS identity verification |
| **Unauthorized Access** | Call services without permission | AuthorizationPolicy |
| **Lateral Movement** | Compromise spreads within network | Zero-trust, least privilege |
| **Data Exfiltration** | Steal data via network | Egress controls, encryption |
| **Token Theft** | Steal JWT/certificates | Short-lived certs, token validation |
| **Replay Attack** | Reuse captured requests | Request signing, nonces |

### Threat Mitigation Matrix

```
THREAT MITIGATION:
═══════════════════════════════════════════════════════════════

┌────────────────────────────────────────────────────────────┐
│  Threat              │ Mitigation        │ Mesh Feature    │
├────────────────────────────────────────────────────────────┤
│  Eavesdropping       │ Encryption        │ mTLS            │
│  Spoofing            │ Authentication    │ SPIFFE identity │
│  Tampering           │ Integrity         │ TLS             │
│  Elevation           │ Least privilege   │ AuthzPolicy     │
│  DoS                 │ Rate limiting     │ Rate limits     │
│  Info disclosure     │ Access control    │ AuthzPolicy     │
│  Repudiation         │ Audit logging     │ Access logs     │
└────────────────────────────────────────────────────────────┘

Defense in Depth:
─────────────────────────────────────────────────────────────

Layer 1: Network (mTLS)
  • All traffic encrypted
  • Identity embedded in certificate

Layer 2: Transport (Connection)
  • TLS 1.3
  • Strong cipher suites

Layer 3: Application (Authorization)
  • Per-request authorization
  • Attribute-based access control

Layer 4: Observability (Detection)
  • Access logs
  • Anomaly detection
  • Security metrics
```

### Security Controls

```
SECURITY CONTROLS BY LAYER:
═══════════════════════════════════════════════════════════════

Control Plane Security:
─────────────────────────────────────────────────────────────
• Istiod runs with least privilege
• RBAC for Istio CRD management
• Webhook authentication
• Secure xDS communication

Data Plane Security:
─────────────────────────────────────────────────────────────
• Sidecar injection via secure webhook
• Read-only root filesystem
• No privileged containers (except init)
• Resource limits enforced

Certificate Security:
─────────────────────────────────────────────────────────────
• Short-lived certificates (24h default)
• Automatic rotation
• Private keys never leave proxy
• Root CA offline storage recommended

Network Security:
─────────────────────────────────────────────────────────────
• No plaintext allowed (STRICT mode)
• Egress traffic controlled
• Network policies complement mesh
```

---

## Compliance

### Compliance Framework Alignment

| Framework | Relevant Controls | Mesh Contribution |
|-----------|-------------------|-------------------|
| **SOC 2** | CC6.1 (Encryption), CC6.6 (Access Control) | mTLS, AuthorizationPolicy |
| **PCI-DSS** | Req 4 (Encrypt transmission) | mTLS for all traffic |
| **HIPAA** | 164.312(e)(1) (Transmission security) | Encryption in transit |
| **GDPR** | Art 32 (Security of processing) | Encryption, access control |
| **NIST 800-53** | SC-8 (Transmission Confidentiality) | mTLS, audit logging |

### Audit Logging

```
AUDIT LOGGING FOR COMPLIANCE:
═══════════════════════════════════════════════════════════════

What to Log:
─────────────────────────────────────────────────────────────
• Source identity (SPIFFE ID)
• Destination service
• Request method and path
• Authorization decision (allow/deny)
• Timestamp
• Response code

Access Log Format:
─────────────────────────────────────────────────────────────
{
  "timestamp": "2024-01-15T10:30:00Z",
  "source_principal": "spiffe://cluster.local/ns/web/sa/frontend",
  "destination_service": "api-server.production.svc",
  "request_method": "POST",
  "request_path": "/api/v1/orders",
  "response_code": 200,
  "response_flags": "-",
  "authority": "api-server:8080",
  "upstream_host": "10.0.1.5:8080",
  "duration_ms": 45,
  "bytes_received": 1024,
  "bytes_sent": 256,
  "x_forwarded_for": "192.168.1.1",
  "user_agent": "frontend-service/1.0",
  "request_id": "abc123-def456",
  "authorization_decision": "ALLOW",
  "authorization_policy": "allow-frontend-to-api"
}

Log Retention:
─────────────────────────────────────────────────────────────
• Real-time: Stream to SIEM
• Short-term: 30 days in log aggregation
• Long-term: 1-7 years depending on compliance
• Immutable storage for audit trail
```

### Certificate Management Compliance

```
CERTIFICATE LIFECYCLE COMPLIANCE:
═══════════════════════════════════════════════════════════════

Requirement: Track certificate issuance and rotation
─────────────────────────────────────────────────────────────

Issuance Record:
  • Who requested (pod identity)
  • When issued
  • Validity period
  • Issuing CA
  • SPIFFE ID granted

Rotation Record:
  • Old certificate serial
  • New certificate serial
  • Rotation timestamp
  • Reason (scheduled/emergency)

Revocation (if implemented):
  • Certificate serial
  • Revocation time
  • Reason
  • Requested by

Audit Trail:
─────────────────────────────────────────────────────────────
All certificate operations logged to:
  • Control plane logs
  • Audit events
  • External SIEM (recommended)
```

---

## Security Best Practices

### Production Checklist

| Category | Practice | Status |
|----------|----------|--------|
| **mTLS** | STRICT mode mesh-wide | Required |
| **Certificates** | 24h or shorter validity | Recommended |
| **Authorization** | Default deny, explicit allow | Required |
| **Egress** | Controlled via egress gateway | Recommended |
| **JWT** | Validate at ingress | If applicable |
| **Secrets** | External secret management | Recommended |
| **Audit** | Access logs to SIEM | Required |
| **Updates** | Regular Istio upgrades | Required |

### Security Anti-Patterns

```
AVOID THESE:
═══════════════════════════════════════════════════════════════

❌ PERMISSIVE mode in production
   Why: Allows plaintext, defeats purpose

❌ Wildcard authorization policies
   Why: Violates least privilege

❌ Long-lived certificates (> 7 days)
   Why: Extends compromise window

❌ Disabling sidecar for "performance"
   Why: Creates security gap

❌ Ignoring egress traffic
   Why: Data exfiltration risk

❌ Hardcoded secrets in config
   Why: Exposure risk, rotation difficulty

❌ No audit logging
   Why: Cannot detect or investigate breaches
```

---

**Next: [07 - Observability](./07-observability.md)**
