# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture

### Component Overview

```mermaid
flowchart TB
    subgraph Users["User Access Layer"]
        U1[Corporate User]
        U2[Remote Worker]
        U3[Contractor]
        D1[Managed Device]
        D2[BYOD Device]
    end

    subgraph ControlPlane["Control Plane"]
        subgraph Identity["Identity Services"]
            IDP[Identity Provider<br/>OIDC/SAML]
            MFA[MFA Service]
            DIR[Directory Service]
        end

        subgraph Policy["Policy Services"]
            PAP[Policy Admin Point<br/>Git-ops]
            PDP[Policy Decision Point<br/>Cluster]
            PS[(Policy Store)]
        end

        subgraph PKI["PKI Infrastructure"]
            CA[Certificate Authority<br/>SPIFFE/SPIRE]
            HSM[HSM<br/>Key Protection]
            CRL[CRL/OCSP<br/>Revocation]
        end

        subgraph DeviceTrust["Device Trust"]
            DTS[Device Trust Service]
            DI[(Device Inventory)]
            ATT[Attestation Service]
        end
    end

    subgraph DataPlane["Data Plane (Enforcement)"]
        subgraph Edge["Edge / Access Proxy"]
            AP[Access Proxy<br/>Identity-Aware]
        end

        subgraph Mesh["Service Mesh"]
            PEP1[PEP Sidecar]
            PEP2[PEP Sidecar]
            PEP3[PEP Sidecar]
        end

        subgraph Services["Protected Resources"]
            S1[Service A]
            S2[Service B]
            S3[Service C]
            DB[(Database)]
            API[Internal API]
        end
    end

    subgraph Observability["Observability"]
        AUD[(Audit Log<br/>Store)]
        SIEM[SIEM]
    end

    U1 & U2 & U3 --> D1 & D2
    D1 & D2 --> AP

    AP -->|1. Authenticate| IDP
    IDP -->|2. MFA| MFA
    IDP -->|3. User Info| DIR

    AP -->|4. Device Check| DTS
    DTS --> DI
    DTS --> ATT

    AP -->|5. Policy Check| PDP
    PDP --> PS
    PAP --> PS

    AP -->|6. Access Granted| PEP1

    PEP1 & PEP2 & PEP3 -->|mTLS| CA
    CA --> HSM
    CA --> CRL

    PEP1 --- S1
    PEP2 --- S2
    PEP3 --- S3

    PEP1 <-->|mTLS| PEP2
    PEP2 <-->|mTLS| PEP3

    S1 & S2 & S3 --> DB & API

    AP & PDP & DTS --> AUD
    AUD --> SIEM
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Access Proxy** | Entry point for user access, identity verification, device checks |
| **Identity Provider (IdP)** | User authentication, SSO, token issuance |
| **MFA Service** | Multi-factor authentication challenges |
| **Policy Decision Point (PDP)** | Evaluate access requests against policies |
| **Policy Admin Point (PAP)** | Manage policy lifecycle, version control |
| **Policy Store** | Store and replicate policies across regions |
| **Certificate Authority (CA)** | Issue/revoke workload certificates |
| **Device Trust Service** | Assess and track device security posture |
| **Policy Enforcement Point (PEP)** | Enforce decisions at service mesh sidecar |
| **Audit Log Store** | Immutable record of all access decisions |

---

## Data Flow

### User Access Request Flow

```mermaid
sequenceDiagram
    participant User
    participant Device
    participant AP as Access Proxy
    participant IdP as Identity Provider
    participant DTS as Device Trust
    participant PDP as Policy Decision
    participant PEP as PEP Sidecar
    participant Service

    User->>Device: Request access to resource
    Device->>AP: HTTPS request

    AP->>IdP: Authenticate user (token/redirect)
    IdP->>IdP: Validate credentials
    IdP->>IdP: Enforce MFA if required
    IdP-->>AP: User identity token (JWT)

    AP->>DTS: Check device posture
    DTS->>DTS: Validate device certificate
    DTS->>DTS: Check compliance (patches, encryption)
    DTS-->>AP: Device trust score + attestation

    AP->>PDP: AuthZ request (user, device, resource, action)
    PDP->>PDP: Load applicable policies
    PDP->>PDP: Evaluate ABAC/ReBAC rules
    PDP->>PDP: Calculate risk score
    PDP-->>AP: Decision: ALLOW/DENY + conditions

    alt Access Allowed
        AP->>PEP: Forward request with identity context
        PEP->>PEP: Validate mTLS certificate
        PEP->>Service: Proxied request
        Service-->>PEP: Response
        PEP-->>AP: Response
        AP-->>Device: Response
    else Access Denied
        AP-->>Device: 403 Forbidden + reason
    end

    Note over AP,PDP: All decisions logged to audit
```

### Service-to-Service mTLS Flow

```mermaid
sequenceDiagram
    participant SvcA as Service A
    participant PEPA as PEP (Sidecar A)
    participant PEPB as PEP (Sidecar B)
    participant SvcB as Service B
    participant CA as Certificate Authority
    participant PDP as Policy Decision

    Note over PEPA,CA: Certificate bootstrap (startup)
    PEPA->>CA: CSR (Certificate Signing Request)
    CA->>CA: Validate workload identity
    CA-->>PEPA: Signed certificate (24h TTL)

    Note over SvcA,SvcB: Service call
    SvcA->>PEPA: HTTP request to Service B

    PEPA->>PEPB: TLS ClientHello
    PEPB-->>PEPA: TLS ServerHello + Cert
    PEPA->>PEPA: Validate cert chain + SPIFFE ID
    PEPA->>PEPB: Client Certificate
    PEPB->>PEPB: Validate cert chain + SPIFFE ID

    Note over PEPA,PEPB: mTLS established

    PEPB->>PDP: AuthZ check (source: SvcA, dest: SvcB, action)
    PDP-->>PEPB: ALLOW

    PEPB->>SvcB: Forward request
    SvcB-->>PEPB: Response
    PEPB-->>PEPA: Response (encrypted)
    PEPA-->>SvcA: Response
```

### Certificate Issuance and Rotation

```mermaid
sequenceDiagram
    participant Workload
    participant Agent as SPIRE Agent
    participant Server as SPIRE Server
    participant CA as Certificate Authority
    participant SDS as Secret Discovery Service

    Note over Workload,CA: Initial certificate issuance

    Workload->>Agent: Request identity (Unix socket)
    Agent->>Agent: Attest workload (process, k8s pod)
    Agent->>Server: SVID request with attestation
    Server->>Server: Validate attestation
    Server->>CA: Sign certificate request
    CA->>CA: Sign with intermediate CA key
    CA-->>Server: X.509 SVID
    Server-->>Agent: SVID + trust bundle
    Agent-->>Workload: Certificate via SDS

    Note over Workload,SDS: Automatic rotation (before expiry)

    loop Every 12 hours (50% of TTL)
        Agent->>Agent: Check certificate expiry
        Agent->>Server: Rotate SVID request
        Server->>CA: New certificate
        CA-->>Server: Fresh X.509 SVID
        Server-->>Agent: New SVID
        Agent->>SDS: Push new certificate
        SDS-->>Workload: Hot-reload certificate
    end
```

---

## Key Architectural Decisions

### 1. Control Plane vs Data Plane Separation

| Aspect | Control Plane | Data Plane |
|--------|--------------|------------|
| **Components** | PDP, CA, IdP, Policy Store | PEP sidecars, Access Proxy |
| **Traffic pattern** | Moderate, config/policy sync | High, every request |
| **Latency sensitivity** | Lower (batch sync) | Very high (inline) |
| **Scaling approach** | Scale for consistency | Scale for throughput |
| **Failure mode** | Cached policies continue | Direct user impact |

**Recommendation:** Keep control plane centralized for consistency, data plane distributed for performance.

### 2. Centralized vs Distributed Policy Evaluation

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Centralized PDP** | Consistent decisions, easier audit | Latency, SPOF | Smaller deployments |
| **Distributed PDP** | Low latency, fault tolerant | Consistency lag | High-scale, global |
| **Hybrid** | Balance of both | Complexity | Enterprise (recommended) |

**Recommendation:** Hybrid with local PDP cache and central policy sync.

```mermaid
flowchart LR
    subgraph Central["Central Control"]
        PAP[Policy Admin]
        PS[(Policy Store)]
    end

    subgraph Region1["Region 1"]
        PDP1[PDP]
        Cache1[(Local Cache)]
    end

    subgraph Region2["Region 2"]
        PDP2[PDP]
        Cache2[(Local Cache)]
    end

    PAP --> PS
    PS -->|Sync| PDP1 & PDP2
    PDP1 --> Cache1
    PDP2 --> Cache2

    PEP1[PEP] --> PDP1
    PEP2[PEP] --> PDP2
```

### 3. Push vs Pull Certificate Distribution

| Approach | Pros | Cons | Use Case |
|----------|------|------|----------|
| **Pull (on-demand)** | Fresh certs, simple | Latency on first use | Low-volume workloads |
| **Push (SDS)** | Pre-loaded, no latency | Agent complexity | Service mesh (recommended) |
| **Hybrid** | Balance | More components | Large scale |

**Recommendation:** Secret Discovery Service (SDS) pattern for service mesh workloads.

### 4. JWT vs Opaque Tokens

| Token Type | Pros | Cons | Use Case |
|------------|------|------|----------|
| **JWT (self-contained)** | No lookup needed, claims included | Size, can't revoke easily | User sessions |
| **Opaque (reference)** | Small, revocable | Requires lookup | Service tokens |
| **PASETO** | Modern JWT alternative | Less adoption | Security-critical |

**Recommendation:** JWT for user identity (short-lived), with token binding to device.

### 5. Service Mesh Integration

```mermaid
flowchart TB
    subgraph WithMesh["With Service Mesh"]
        App1[Application]
        SC1[Sidecar<br/>mTLS + Policy]
        App2[Application]
        SC2[Sidecar]
        App1 --- SC1
        App2 --- SC2
        SC1 <-->|mTLS| SC2
    end

    subgraph WithoutMesh["Without Service Mesh"]
        App3[Application<br/>+ SDK]
        App4[Application<br/>+ SDK]
        App3 <-->|mTLS via SDK| App4
    end
```

**Recommendation:** Service mesh for uniform mTLS; SDK for legacy or non-containerized workloads.

---

## Architecture Pattern Checklist

- [x] **Sync vs Async:** Sync for access decisions, async for audit logging
- [x] **Event-driven vs Request-response:** Request-response for policy checks
- [x] **Push vs Pull:** Push for certs (SDS), pull for policy sync
- [x] **Stateless vs Stateful:** Stateless PEP, stateful PDP (policy cache)
- [x] **Read-heavy vs Write-heavy:** Read-heavy (policy checks >> policy updates)
- [x] **Real-time vs Batch:** Real-time decisions, batch analytics
- [x] **Edge vs Origin:** Both (edge proxy + origin PEP)

---

## Deployment Options

### Option A: Single Region

```mermaid
flowchart TB
    subgraph Region["Primary Region"]
        subgraph Control["Control Plane"]
            IDP[IdP]
            PDP[PDP Cluster]
            CA[CA]
        end

        subgraph Data["Data Plane"]
            AP[Access Proxy]
            PEP1[PEP]
            PEP2[PEP]
        end
    end

    Users --> AP
    AP --> IDP & PDP
    PEP1 & PEP2 --> CA
```

**Pros:** Simple, consistent
**Cons:** Single region failure = total outage

### Option B: Multi-Region Active-Active

```mermaid
flowchart TB
    subgraph Region1["Region 1"]
        IDP1[IdP]
        PDP1[PDP]
        CA1[CA]
        AP1[Access Proxy]
    end

    subgraph Region2["Region 2"]
        IDP2[IdP]
        PDP2[PDP]
        CA2[CA]
        AP2[Access Proxy]
    end

    subgraph Global["Global"]
        GLB[Global Load Balancer]
        PS[(Policy Store<br/>Replicated)]
        RootCA[Root CA<br/>Offline]
    end

    Users --> GLB
    GLB --> AP1 & AP2

    PS -->|Sync| PDP1 & PDP2
    RootCA -->|Cross-sign| CA1 & CA2
```

**Pros:** High availability, regional failover
**Cons:** Policy sync complexity, cross-region latency

### Option C: Hybrid with Edge

```mermaid
flowchart TB
    subgraph Edge["Edge PoPs"]
        E1[Edge Proxy]
        E2[Edge Proxy]
        LC1[(Token Cache)]
        LC2[(Token Cache)]
    end

    subgraph Origin["Origin"]
        AP[Access Proxy]
        IDP[IdP]
        PDP[PDP]
        CA[CA]
    end

    Users --> E1 & E2
    E1 --- LC1
    E2 --- LC2

    E1 & E2 -->|Token validation| Origin
    E1 & E2 -->|Policy miss| PDP
```

**Pros:** Low latency, edge caching
**Cons:** Cache invalidation complexity

**Recommendation:** Option B for enterprise, Option C for global consumer apps.

---

## Integration Points

### Upstream (Identity Sources)

```
Identity Providers:
├── Corporate IdP (SAML/OIDC)
├── Cloud IAM (AWS IAM, Azure AD, GCP IAM)
├── Social login (for B2C)
└── Partner IdPs (federated)

Device Sources:
├── MDM/UEM systems (device inventory)
├── EDR agents (security posture)
├── TPM attestation (hardware trust)
└── Browser fingerprinting (web access)
```

### Downstream (Protected Resources)

```
Resource Types:
├── Web applications
├── APIs (REST, gRPC)
├── Databases
├── Cloud resources
├── SaaS applications (via SAML proxy)
└── SSH/RDP access
```

### Sidecar Pattern (Service Mesh)

```mermaid
flowchart LR
    subgraph Pod["Kubernetes Pod"]
        App[Application<br/>Port 8080]
        SC[Sidecar Proxy<br/>Port 15001]
        Agent[SPIRE Agent<br/>Unix Socket]
    end

    Ingress --> SC
    SC -->|mTLS validated| App
    Agent -->|Certs via SDS| SC
```

---

## Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **IdP unavailable** | No new logins | Cached tokens valid, graceful degradation |
| **PDP cluster down** | No policy decisions | Local cache with TTL, fail-closed or fail-open choice |
| **CA unavailable** | No new certificates | Existing certs valid until expiry, extended TTL |
| **Device Trust down** | No posture checks | Cached posture data with expiry |
| **mTLS cert expired** | Service-to-service fails | Grace period, automatic rotation |
| **Policy store corrupt** | Incorrect decisions | Versioned backups, instant rollback |

**Default Failure Policy:** Fail-closed (deny access) for security, with cached decisions to maintain continuity.
