# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture

### Control Plane vs Data Plane Overview

```mermaid
flowchart TB
    subgraph Clients["Client Applications"]
        WebApp[Web Application]
        Mobile[Mobile App]
        API[API Client]
        Admin[Admin Console]
    end

    subgraph ControlPlane["Control Plane"]
        subgraph PolicyAdmin["Policy Administration"]
            PolicyMgr[Policy Manager]
            RoleMgr[Role Manager]
            PolicyStore[(Policy Store)]
        end

        subgraph IdentityAdmin["Identity Administration"]
            UserMgr[User Manager]
            GroupMgr[Group Manager]
            TenantMgr[Tenant Manager]
            Directory[(User Directory)]
        end

        subgraph IdPConfig["Identity Provider Config"]
            IdPMgr[IdP Manager]
            SAMLConfig[SAML Config]
            OIDCConfig[OIDC Config]
        end
    end

    subgraph DataPlane["Data Plane"]
        subgraph AuthServices["Authentication Services"]
            AuthN[Authentication<br/>Service]
            MFA[MFA Service]
            TokenSvc[Token Service]
        end

        subgraph AuthZServices["Authorization Services"]
            PEP[Policy Enforcement<br/>Point - PEP]
            PDP[Policy Decision<br/>Point - PDP]
            PolicyCache[(Policy Cache)]
        end

        subgraph SessionMgmt["Session Management"]
            SessionSvc[Session Service]
            SessionStore[(Session Store<br/>Redis Cluster)]
        end

        subgraph Provisioning["Provisioning"]
            SCIM[SCIM Service]
            JIT[JIT Provisioner]
        end
    end

    subgraph ExternalIdPs["External Identity Providers"]
        Google[Google]
        Microsoft[Azure AD]
        Okta[Okta]
        SAML[SAML IdPs]
    end

    subgraph AuditSystem["Audit & Observability"]
        AuditLog[(Audit Log)]
        Metrics[Metrics]
        Alerts[Alerting]
    end

    WebApp & Mobile & API --> AuthN
    Admin --> ControlPlane

    AuthN --> MFA
    AuthN --> TokenSvc
    AuthN --> SessionSvc
    AuthN --> Directory
    AuthN <--> ExternalIdPs

    API --> PEP
    PEP --> PDP
    PDP --> PolicyCache
    PolicyCache --> PolicyStore

    SCIM --> Directory
    JIT --> Directory

    AuthN & PDP & SessionSvc --> AuditLog
```

### Component Responsibilities

| Component | Layer | Responsibility |
|-----------|-------|---------------|
| **Authentication Service** | Data | Handle login flows, protocol translation (OAuth2, OIDC, SAML) |
| **MFA Service** | Data | Multi-factor verification (WebAuthn, TOTP, SMS) |
| **Token Service** | Data | Generate, sign, and validate tokens (JWT, opaque) |
| **Session Service** | Data | Manage session lifecycle, distributed session state |
| **Policy Enforcement Point (PEP)** | Data | Intercept requests, call PDP, enforce decisions |
| **Policy Decision Point (PDP)** | Data | Evaluate policies against request context |
| **Policy Manager** | Control | CRUD operations on policies, versioning |
| **User Manager** | Control | User lifecycle, attribute management |
| **Tenant Manager** | Control | Multi-tenant configuration, isolation |
| **SCIM Service** | Data | User provisioning, sync with external directories |

---

## Data Flow

### OAuth 2.0 Authorization Code Flow with PKCE

```mermaid
sequenceDiagram
    participant User
    participant Client as Client App
    participant AuthZ as Authorization<br/>Server
    participant Token as Token Service
    participant Resource as Resource Server

    Note over Client: Generate code_verifier (random)
    Note over Client: code_challenge = SHA256(code_verifier)

    User->>Client: Click "Login"
    Client->>AuthZ: GET /authorize?<br/>response_type=code&<br/>client_id=xxx&<br/>redirect_uri=xxx&<br/>code_challenge=xxx&<br/>code_challenge_method=S256&<br/>scope=openid profile&<br/>state=xxx

    AuthZ->>User: Present login page
    User->>AuthZ: Enter credentials
    AuthZ->>AuthZ: Validate credentials
    AuthZ->>AuthZ: Check MFA requirement

    opt MFA Required
        AuthZ->>User: Request MFA
        User->>AuthZ: Provide MFA code
        AuthZ->>AuthZ: Verify MFA
    end

    AuthZ->>AuthZ: Generate authorization code
    AuthZ->>AuthZ: Store code_challenge with code
    AuthZ->>Client: 302 Redirect to redirect_uri?<br/>code=xxx&state=xxx

    Client->>Token: POST /token<br/>grant_type=authorization_code&<br/>code=xxx&<br/>redirect_uri=xxx&<br/>client_id=xxx&<br/>code_verifier=xxx

    Token->>Token: Verify code_verifier matches<br/>stored code_challenge
    Token->>Token: Generate access_token (JWT)
    Token->>Token: Generate refresh_token
    Token->>Token: Generate id_token (OIDC)

    Token->>Client: {access_token, refresh_token,<br/>id_token, expires_in}

    Client->>Resource: GET /api/resource<br/>Authorization: Bearer {access_token}
    Resource->>Resource: Validate JWT signature
    Resource->>Resource: Check claims (exp, aud, scope)
    Resource->>Client: Resource data
```

### SAML 2.0 SP-Initiated SSO Flow

```mermaid
sequenceDiagram
    participant User
    participant SP as Service Provider<br/>(Our App)
    participant IdP as Identity Provider<br/>(External)

    User->>SP: Access protected resource
    SP->>SP: No session found
    SP->>SP: Generate AuthnRequest

    SP->>User: Redirect to IdP with<br/>SAMLRequest (base64, deflate)

    User->>IdP: GET /sso?SAMLRequest=xxx&RelayState=xxx

    IdP->>User: Present login page
    User->>IdP: Authenticate

    IdP->>IdP: Generate SAML Assertion
    IdP->>IdP: Sign assertion with private key

    IdP->>User: POST form to SP ACS URL<br/>with SAMLResponse

    User->>SP: POST /acs<br/>SAMLResponse=xxx&RelayState=xxx

    SP->>SP: Validate XML signature
    SP->>SP: Check assertion conditions<br/>(NotBefore, NotOnOrAfter, Audience)
    SP->>SP: Extract NameID and attributes
    SP->>SP: Create local session

    SP->>User: Redirect to original resource
```

### Token Validation Flow (Warm Path)

```mermaid
flowchart TB
    subgraph Client["API Client"]
        Request[API Request with<br/>Bearer Token]
    end

    subgraph Gateway["API Gateway / PEP"]
        Extract[Extract Token]
        TypeCheck{Token Type?}
    end

    subgraph JWTPath["JWT Validation (Local)"]
        ParseJWT[Parse JWT Header]
        GetKey[Get Public Key<br/>from JWKS Cache]
        VerifySig[Verify Signature]
        CheckClaims[Check Claims<br/>exp, iat, aud, iss]
        JWTValid{Valid?}
    end

    subgraph OpaquePath["Opaque Token Validation"]
        Introspect[Call /introspect<br/>Endpoint]
        CacheCheck{In Cache?}
        TokenLookup[Lookup in<br/>Token Store]
        CheckActive[Check active,<br/>exp, scope]
        OpaqueValid{Valid?}
    end

    subgraph Result["Result"]
        Allow[Allow Request]
        Deny[Deny Request<br/>401/403]
    end

    Request --> Extract
    Extract --> TypeCheck

    TypeCheck -->|JWT| ParseJWT
    ParseJWT --> GetKey
    GetKey --> VerifySig
    VerifySig --> CheckClaims
    CheckClaims --> JWTValid
    JWTValid -->|Yes| Allow
    JWTValid -->|No| Deny

    TypeCheck -->|Opaque| CacheCheck
    CacheCheck -->|Hit| CheckActive
    CacheCheck -->|Miss| Introspect
    Introspect --> TokenLookup
    TokenLookup --> CheckActive
    CheckActive --> OpaqueValid
    OpaqueValid -->|Yes| Allow
    OpaqueValid -->|No| Deny
```

### Policy Evaluation Flow

```mermaid
flowchart TB
    subgraph Request["Incoming Request"]
        ReqData[Request with<br/>User, Resource, Action]
    end

    subgraph PEP["Policy Enforcement Point"]
        BuildContext[Build Authorization<br/>Context]
        CallPDP[Call Policy<br/>Decision Point]
        Enforce[Enforce Decision]
    end

    subgraph PDP["Policy Decision Point"]
        L1Cache{L1 Cache<br/>In-Process}
        L2Cache{L2 Cache<br/>Redis}
        LoadPolicy[Load Policy<br/>from Store]
        Evaluate[Evaluate Policy<br/>Against Context]
        Decision[ALLOW / DENY]
    end

    subgraph Context["Authorization Context"]
        Subject[Subject<br/>user_id, roles, groups]
        Resource[Resource<br/>type, id, owner]
        Action[Action<br/>read, write, delete]
        Environment[Environment<br/>time, IP, device]
    end

    ReqData --> BuildContext
    BuildContext --> Subject & Resource & Action & Environment
    Subject & Resource & Action & Environment --> CallPDP

    CallPDP --> L1Cache
    L1Cache -->|Hit| Decision
    L1Cache -->|Miss| L2Cache
    L2Cache -->|Hit| Evaluate
    L2Cache -->|Miss| LoadPolicy
    LoadPolicy --> Evaluate
    Evaluate --> Decision

    Decision --> Enforce
    Enforce -->|Allow| Continue[Continue to<br/>Resource]
    Enforce -->|Deny| Reject[Return 403<br/>Forbidden]
```

---

## Key Architectural Decisions

### 1. Token Strategy: JWT vs Opaque

| Aspect | JWT (External APIs) | Opaque (Internal Services) |
|--------|---------------------|---------------------------|
| **Validation** | Local (no network) | Requires introspection |
| **Revocation** | Delayed (until expiry) | Immediate |
| **Size** | Larger (contains claims) | Small (reference only) |
| **Stateless** | Yes | No |
| **Best For** | Public APIs, microservices | Admin sessions, sensitive ops |

**Decision:** Use **JWT for external API access** (stateless validation at edge) and **opaque tokens for internal/admin sessions** (instant revocation capability).

**Rationale:** External APIs need to validate millions of requests per second without hitting a central service. Internal admin operations require immediate revocation when sessions are compromised.

### 2. Session Storage: Stateless vs Stateful

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Fully Stateless (JWT only)** | No session store | Cannot revoke, no rich metadata | Not for high-security |
| **Stateful (Redis)** | Instant revocation, rich state | Session store required | **Chosen** |
| **Hybrid (JWT + Session ID)** | Stateless validation + revocation | Complexity | Alternative |

**Decision:** **Stateful sessions in Redis** with JWT access tokens for API calls.

**Rationale:** Sessions store rich metadata (device info, location, activity), support instant revocation, and enable features like "sign out all devices." JWT access tokens (short-lived) reduce session store load for API validation.

### 3. Policy Engine Architecture

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Centralized OPA** | Single source of truth | Network latency | **Complex policies** |
| **Sidecar/Embedded** | Low latency | Policy sync complexity | **High-volume paths** |
| **Hybrid** | Best of both | Operational complexity | **Chosen** |

**Decision:** **Hybrid approach** - embedded policy cache for hot paths, centralized OPA for complex decisions.

**Rationale:** Simple RBAC checks (is user in role X?) can be evaluated locally with cached data. Complex ABAC/ReBAC policies (can user X access document Y given relationships?) route to centralized OPA for consistency.

### 4. Authorization Model Selection

| Model | Complexity | Best For | Examples |
|-------|------------|----------|----------|
| **RBAC** | Low | Clear hierarchies | Admin/User/Viewer roles |
| **ABAC** | Medium | Dynamic rules | Time-based access, location |
| **ReBAC** | High | Relationship-driven | Document sharing, org hierarchy |

**Decision:** Support **all three models** with RBAC as default, ABAC for policies, ReBAC for fine-grained sharing.

**Rationale:** Different use cases need different models. Start simple (RBAC), add policies (ABAC) as needed, enable ReBAC for collaborative features.

### 5. Multi-Tenant Isolation

| Approach | Isolation | Complexity | Cost |
|----------|-----------|------------|------|
| **Shared database, row-level** | Medium | Low | Low |
| **Schema per tenant** | High | Medium | Medium |
| **Database per tenant** | Highest | High | High |

**Decision:** **Row-level isolation** with `tenant_id` + **separate encryption keys per tenant**.

**Rationale:** Row-level provides sufficient isolation for most cases while keeping operational complexity low. Per-tenant encryption keys add a security layer - a compromised key only affects one tenant.

---

## Authentication Protocol Flows

### WebAuthn Registration (Passkey Creation)

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Server as IAM Server
    participant Auth as Authenticator<br/>(Passkey)

    User->>Browser: Click "Register Passkey"
    Browser->>Server: POST /webauthn/register/start

    Server->>Server: Generate challenge (random bytes)
    Server->>Server: Create PublicKeyCredentialCreationOptions

    Server->>Browser: {challenge, rp, user,<br/>pubKeyCredParams, timeout}

    Browser->>Auth: navigator.credentials.create(options)
    Auth->>User: Verify identity (biometric/PIN)
    User->>Auth: Confirm

    Auth->>Auth: Generate key pair
    Auth->>Auth: Sign challenge with private key
    Auth->>Browser: PublicKeyCredential<br/>{id, rawId, response, type}

    Browser->>Server: POST /webauthn/register/finish<br/>{credential}

    Server->>Server: Verify challenge matches
    Server->>Server: Verify origin matches RP ID
    Server->>Server: Store public key and credential ID

    Server->>Browser: {success: true}
    Browser->>User: "Passkey registered!"
```

### WebAuthn Authentication (Passkey Login)

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Server as IAM Server
    participant Auth as Authenticator<br/>(Passkey)

    User->>Browser: Click "Sign in with Passkey"
    Browser->>Server: POST /webauthn/authenticate/start

    Server->>Server: Generate challenge
    Server->>Server: Get user's credential IDs

    Server->>Browser: {challenge, timeout,<br/>rpId, allowCredentials}

    Browser->>Auth: navigator.credentials.get(options)
    Auth->>User: Verify identity (biometric/PIN)
    User->>Auth: Confirm

    Auth->>Auth: Find matching credential
    Auth->>Auth: Sign challenge with private key
    Auth->>Browser: PublicKeyCredential with<br/>authenticatorData, signature

    Browser->>Server: POST /webauthn/authenticate/finish<br/>{credential}

    Server->>Server: Verify signature with stored public key
    Server->>Server: Verify authenticatorData flags
    Server->>Server: Update sign count (replay protection)
    Server->>Server: Create session

    Server->>Browser: {success: true, session_token}
    Browser->>User: "Welcome back!"
```

---

## Deployment Topologies

### Single Region (Multi-AZ)

```mermaid
flowchart TB
    subgraph Region["Region (us-east-1)"]
        LB[Global Load Balancer]

        subgraph AZ1["Availability Zone A"]
            Auth1[Auth Service]
            Policy1[Policy Engine]
            Redis1[(Redis Primary)]
            PG1[(PostgreSQL Primary)]
        end

        subgraph AZ2["Availability Zone B"]
            Auth2[Auth Service]
            Policy2[Policy Engine]
            Redis2[(Redis Replica)]
            PG2[(PostgreSQL Replica)]
        end

        subgraph AZ3["Availability Zone C"]
            Auth3[Auth Service]
            Policy3[Policy Engine]
            Redis3[(Redis Replica)]
            PG3[(PostgreSQL Replica)]
        end

        JWKS[(JWKS Endpoint<br/>CDN-cached)]
    end

    Internet[Internet] --> LB
    LB --> Auth1 & Auth2 & Auth3
    Auth1 & Auth2 & Auth3 --> Redis1
    Auth1 & Auth2 & Auth3 --> PG1
    Redis1 --> Redis2 & Redis3
    PG1 --> PG2 & PG3
```

### Multi-Region Active-Active

```mermaid
flowchart TB
    subgraph Global["Global Layer"]
        DNS[GeoDNS / Anycast]
        GlobalDir[(Global Directory<br/>CockroachDB / Spanner)]
    end

    subgraph USEast["US East"]
        LB1[Regional LB]
        Auth1[Auth Cluster]
        Session1[(Session Store)]
        PolicyCache1[(Policy Cache)]
    end

    subgraph USWest["US West"]
        LB2[Regional LB]
        Auth2[Auth Cluster]
        Session2[(Session Store)]
        PolicyCache2[(Policy Cache)]
    end

    subgraph EU["EU West"]
        LB3[Regional LB]
        Auth3[Auth Cluster]
        Session3[(Session Store)]
        PolicyCache3[(Policy Cache)]
    end

    DNS --> LB1 & LB2 & LB3

    LB1 --> Auth1
    LB2 --> Auth2
    LB3 --> Auth3

    Auth1 & Auth2 & Auth3 --> GlobalDir

    Session1 <-.->|Cross-region sync| Session2 <-.-> Session3

    Note1[Users route to<br/>nearest region]
    Note2[Sessions replicated<br/>for failover]
```

---

## Integration Points

### External Identity Provider Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                     IAM System                                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Federation Hub                               │   │
│  │                                                          │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │  OIDC   │  │  SAML   │  │  LDAP   │  │ Social  │    │   │
│  │  │ Adapter │  │ Adapter │  │ Adapter │  │ Adapter │    │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │   │
│  └───────┼───────────┼───────────┼───────────┼────────────┘   │
│          │           │           │           │                 │
└──────────┼───────────┼───────────┼───────────┼─────────────────┘
           │           │           │           │
           ▼           ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Azure   │ │  Okta    │ │ Active   │ │  Google  │
    │   AD     │ │  SAML    │ │ Directory│ │   OAuth  │
    └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Service Integration Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Services                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│   │  User   │    │ Order   │    │ Payment │    │ Content │     │
│   │ Service │    │ Service │    │ Service │    │ Service │     │
│   └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘     │
│        │              │              │              │            │
│        └──────────────┴──────────────┴──────────────┘            │
│                              │                                   │
│                              ▼                                   │
│                    ┌──────────────────┐                         │
│                    │   API Gateway    │                         │
│                    │   (PEP Role)     │                         │
│                    └────────┬─────────┘                         │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    IAM System                             │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │   │
│  │  │   Token    │  │   Policy   │  │   User     │         │   │
│  │  │ Validation │  │   Engine   │  │ Directory  │         │   │
│  │  └────────────┘  └────────────┘  └────────────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **Auth service down** | Users cannot log in | Multi-AZ, multiple replicas |
| **Session store down** | Existing sessions lost | Redis Cluster with persistence |
| **Policy store down** | AuthZ decisions fail | Local policy cache, default deny |
| **Database down** | No user lookups | Read replicas, connection pooling |
| **MFA service down** | MFA verification fails | Graceful degradation (allow cached) |
| **External IdP down** | Federated login fails | Cached assertions, local fallback |
| **JWKS endpoint down** | JWT validation fails | CDN caching, local key cache |
| **Network partition** | Regional isolation | Cross-region session replication |

**Graceful Degradation Strategies:**

1. **Cached Policies** - Continue with last-known-good policy for brief outages
2. **Token Refresh** - Allow expired tokens brief grace period during outages
3. **Read Replicas** - Serve reads from replicas if primary down
4. **Circuit Breakers** - Fail fast on external IdP issues, offer local auth

**Static Stability:** Authentication continues with cached data for up to 5 minutes during complete backend outage. New logins queue and retry; existing sessions remain valid.
