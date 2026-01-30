# WhatsApp: High-Level Design

## Table of Contents
- [System Architecture](#system-architecture)
- [Data Flow](#data-flow)
- [Key Architectural Decisions](#key-architectural-decisions)
- [Technology Stack](#technology-stack)
- [Multi-Region Deployment](#multi-region-deployment)

---

## System Architecture

### Complete System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        iOS[iOS App]
        Android[Android App]
        Web[Web Client]
        Desktop[Desktop App]
    end

    subgraph EdgeLayer["Edge Layer"]
        DNS[GeoDNS]
        CDN[CDN Network]
        LB[Load Balancer\nL4/L7]
    end

    subgraph GatewayLayer["Connection Gateway Layer"]
        direction LR
        EJ1[ejabberd\nNode 1]
        EJ2[ejabberd\nNode 2]
        EJN[ejabberd\nNode N]
    end

    subgraph CoreServices["Core Services"]
        direction TB
        MR[Message Router]
        PS[Presence Service]
        KS[Key Distribution\nService]
        MS[Media Service]
        NS[Notification\nService]
        RS[Registration\nService]
        GS[Group\nService]
    end

    subgraph DataLayer["Data Layer"]
        direction TB
        subgraph HotStore["Hot Storage"]
            MN[(Mnesia\nOffline Queue)]
            RC[(Redis Cluster\nPresence Cache)]
        end
        subgraph ColdStore["Persistent Storage"]
            CS[(Cassandra\nMessage Metadata)]
            PG[(PostgreSQL\nUser Data)]
        end
        subgraph MediaStore["Media Storage"]
            BS[(Blob Storage)]
        end
    end

    subgraph ExternalServices["External Services"]
        APNS[Apple Push\nNotification]
        FCM[Firebase Cloud\nMessaging]
        SMS[SMS Gateway]
        STUN[STUN/TURN\nServers]
    end

    %% Client connections
    iOS & Android & Web & Desktop -->|DNS Lookup| DNS
    DNS -->|Nearest DC| LB
    iOS & Android & Web & Desktop -->|Persistent TCP| LB
    iOS & Android -->|Media Download| CDN

    %% Gateway layer
    LB --> EJ1 & EJ2 & EJN

    %% Gateway to services
    EJ1 & EJ2 & EJN --> MR
    EJ1 & EJ2 & EJN --> PS
    EJ1 & EJ2 & EJN --> KS

    %% Service to storage
    MR --> MN
    MR --> CS
    MR --> NS
    PS --> RC
    KS --> PG
    RS --> PG & SMS
    GS --> PG
    MS --> BS & CDN
    NS --> APNS & FCM

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef gateway fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef service fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef hotstorage fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef coldstorage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef external fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class iOS,Android,Web,Desktop client
    class DNS,CDN,LB edge
    class EJ1,EJ2,EJN gateway
    class MR,PS,KS,MS,NS,RS,GS service
    class MN,RC hotstorage
    class CS,PG,BS coldstorage
    class APNS,FCM,SMS,STUN external
```

### Component Responsibilities

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **GeoDNS** | Route users to nearest data center | DNS with geo-awareness |
| **Load Balancer** | Distribute connections across gateway nodes | L4 load balancing |
| **CDN** | Cache and serve encrypted media files | Edge caching |
| **ejabberd Gateway** | Handle persistent connections, XMPP protocol | Erlang/BEAM |
| **Message Router** | Route messages to online recipients or offline store | Erlang processes |
| **Presence Service** | Track online/offline status, last seen | Redis-backed |
| **Key Distribution Service** | Manage prekey bundles for E2EE | Dedicated service |
| **Media Service** | Handle media uploads/downloads | HTTP service |
| **Notification Service** | Send push notifications | APNs/FCM integration |
| **Registration Service** | Phone verification, user onboarding | SMS integration |
| **Group Service** | Group creation, membership management | Transactional |

---

## Data Flow

### Message Send Flow (Online Recipient)

```mermaid
sequenceDiagram
    participant Alice as Alice's App
    participant GW_A as Gateway<br/>(Alice's Region)
    participant Router as Message<br/>Router
    participant Presence as Presence<br/>Service
    participant GW_B as Gateway<br/>(Bob's Region)
    participant Bob as Bob's App

    Note over Alice: Encrypt message with<br/>Bob's session key<br/>(Double Ratchet)

    Alice->>GW_A: Send encrypted message
    GW_A->>Alice: ACK (single tick ✓)

    GW_A->>Router: Route message
    Router->>Presence: Is Bob online?
    Presence-->>Router: Online at GW_B

    Router->>GW_B: Forward message
    GW_B->>Bob: Deliver message

    Note over Bob: Decrypt with<br/>session key

    Bob->>GW_B: Delivery ACK
    GW_B->>Router: Delivery confirmed
    Router->>GW_A: Update status
    GW_A->>Alice: Delivered (double tick ✓✓)

    Note over Bob: User opens chat
    Bob->>GW_B: Read receipt
    GW_B->>Router: Read status
    Router->>GW_A: Read confirmed
    GW_A->>Alice: Read (blue ticks ✓✓)
```

### Message Send Flow (Offline Recipient)

```mermaid
sequenceDiagram
    participant Alice as Alice's App
    participant GW_A as Gateway
    participant Router as Message<br/>Router
    participant Presence as Presence<br/>Service
    participant Queue as Offline Queue<br/>(Mnesia)
    participant Push as Notification<br/>Service
    participant FCM as FCM/APNs
    participant Bob as Bob's App

    Note over Alice: Encrypt message

    Alice->>GW_A: Send encrypted message
    GW_A->>Alice: ACK (single tick ✓)

    GW_A->>Router: Route message
    Router->>Presence: Is Bob online?
    Presence-->>Router: Offline

    Router->>Queue: Store encrypted message
    Queue-->>Router: Stored

    Router->>Push: Notify Bob
    Push->>FCM: Push notification
    FCM->>Bob: "New message from Alice"

    Note over Bob: Opens WhatsApp,<br/>connects to gateway

    Bob->>GW_A: Connect + Authenticate
    GW_A->>Queue: Fetch pending messages
    Queue-->>GW_A: Return Alice's message
    GW_A->>Bob: Deliver message

    Note over Bob: Decrypt message

    Bob->>GW_A: Delivery ACK
    GW_A->>Queue: Delete from queue
    GW_A->>Router: Delivery confirmed
    Router->>Alice: Delivered (double tick ✓✓)
```

### E2EE Session Setup (X3DH)

```mermaid
sequenceDiagram
    participant Alice as Alice's App
    participant Server as Key Server
    participant Bob as Bob's App

    Note over Alice: First message to Bob<br/>No existing session

    Alice->>Server: Request Bob's prekey bundle
    Server-->>Alice: Bob's keys:<br/>• Identity Key (IK_B)<br/>• Signed Prekey (SPK_B)<br/>• One-Time Prekey (OPK_B)

    Note over Alice: X3DH Key Agreement:<br/>DH1 = DH(IK_A, SPK_B)<br/>DH2 = DH(EK_A, IK_B)<br/>DH3 = DH(EK_A, SPK_B)<br/>DH4 = DH(EK_A, OPK_B)<br/>SK = KDF(DH1 || DH2 || DH3 || DH4)

    Note over Alice: Initialize Double Ratchet<br/>with shared secret SK

    Alice->>Server: Send encrypted message +<br/>Alice's IK_A, EK_A

    Server->>Bob: Deliver message

    Note over Bob: X3DH Key Agreement:<br/>(reverse computation)<br/>Derive same SK

    Note over Bob: Initialize Double Ratchet<br/>Decrypt message
```

### Media Upload/Download Flow

```mermaid
sequenceDiagram
    participant Alice as Alice's App
    participant GW as Gateway
    participant Media as Media<br/>Service
    participant Blob as Blob<br/>Storage
    participant CDN as CDN
    participant Bob as Bob's App

    Note over Alice: Generate random<br/>256-bit media key

    Note over Alice: Encrypt image with<br/>media key (AES-256)

    Alice->>Media: Upload encrypted blob
    Media->>Blob: Store blob
    Blob-->>Media: Blob URL + hash
    Media-->>Alice: {url, hash}

    Note over Alice: Create message:<br/>• Blob URL<br/>• Media key (encrypted)<br/>• Hash

    Alice->>GW: Send message (with media ref)
    GW->>Bob: Deliver message

    Note over Bob: Extract media key<br/>from message

    Bob->>CDN: Download blob (URL)
    CDN-->>Bob: Encrypted blob

    Note over Bob: Verify hash<br/>Decrypt with media key
```

### Voice/Video Call Setup

```mermaid
sequenceDiagram
    participant Alice as Alice
    participant GW_A as Gateway A
    participant Signal as Signaling<br/>Server
    participant STUN as STUN/TURN
    participant GW_B as Gateway B
    participant Bob as Bob

    Note over Alice: Initiate call

    Alice->>GW_A: Call request (encrypted)
    GW_A->>Signal: Route call invite
    Signal->>GW_B: Forward invite
    GW_B->>Bob: Incoming call (ring)

    Bob->>GW_B: Accept call
    GW_B->>Signal: Call accepted

    par ICE Candidates Exchange
        Alice->>STUN: Get public IP/port
        STUN-->>Alice: ICE candidates
        Bob->>STUN: Get public IP/port
        STUN-->>Bob: ICE candidates
    end

    Signal->>GW_A: Bob's ICE candidates
    Signal->>GW_B: Alice's ICE candidates

    Note over Alice,Bob: Try P2P connection

    alt P2P Successful
        Alice<-->Bob: Direct SRTP stream
    else NAT blocks P2P
        Alice->>STUN: Use TURN relay
        STUN->>Bob: Relay SRTP
    end

    Note over Alice,Bob: Encrypted voice/video<br/>using SRTP (AES-128)
```

---

## Key Architectural Decisions

### Decision 1: Erlang/BEAM vs Traditional Languages

| Aspect | Erlang/BEAM | Go/Java | Decision |
|--------|-------------|---------|----------|
| **Concurrency Model** | Lightweight processes (2KB) | Goroutines/Threads (KB-MB) | **Erlang** |
| **Fault Tolerance** | Built-in supervision trees | Manual implementation | **Erlang** |
| **Hot Code Swapping** | Native support | Requires restart | **Erlang** |
| **Talent Pool** | Smaller | Large | Go/Java |
| **Ecosystem** | Focused on telecom | General purpose | Depends |

**WhatsApp's Choice: Erlang**

**Rationale:**
- 2KB per connection allows 2M+ connections per server
- "Let it crash" philosophy isolates failures
- Hot code swapping enables zero-downtime deployments
- BEAM was designed for telecom (exactly messaging's requirements)

### Decision 2: XMPP (ejabberd) vs Custom Protocol

| Aspect | XMPP (ejabberd) | Custom Protocol | Decision |
|--------|-----------------|-----------------|----------|
| **Time to Market** | Fast (existing server) | Slow | XMPP |
| **Extensibility** | Standardized extensions | Full control | Custom |
| **Performance** | Good (with tuning) | Optimal | Custom |
| **Ecosystem** | Libraries exist | Build from scratch | XMPP |

**WhatsApp's Choice: Modified ejabberd (XMPP)**

**Rationale:**
- ejabberd is Erlang-native, fits the stack
- Heavy modifications for scale (rewrote core components)
- XMPP provides good primitives for messaging
- Not strictly XMPP-compliant anymore (optimized)

### Decision 3: Mnesia vs Redis for Offline Queue

| Aspect | Mnesia | Redis | Decision |
|--------|--------|-------|----------|
| **Language Integration** | Erlang native | External | **Mnesia** |
| **Distributed** | Built-in | Cluster mode | Both |
| **Persistence** | RAM + disk | RAM + disk | Both |
| **Latency** | Sub-ms (in-process) | 0.1-1ms (network) | Mnesia |
| **Ops Complexity** | Part of Erlang | Separate system | Mnesia |

**WhatsApp's Choice: Mnesia**

**Rationale:**
- No network hop (same Erlang VM)
- Distributed replication built-in
- Schema defined in Erlang
- Transactions with ACID guarantees

### Decision 4: Store-and-Forward vs Long-Term Server Storage

| Aspect | Store-and-Forward | Server Storage | Decision |
|--------|-------------------|----------------|----------|
| **Privacy** | Minimal retention | All history on server | **Store-and-Forward** |
| **E2EE Compliance** | Server is blind | Same (encrypted) | Both |
| **Storage Cost** | Minimal | Massive | Store-and-Forward |
| **Sync Complexity** | On-device backup | Server-based | Store-and-Forward |
| **Offline Access** | Device only | Any device | Server Storage |

**WhatsApp's Choice: Store-and-Forward**

**Rationale:**
- Messages deleted after delivery (privacy)
- Reduces server storage costs dramatically
- Aligns with E2EE philosophy (server shouldn't hold data)
- User controls backup (encrypted to iCloud/Google Drive)

### Decision 5: Signal Protocol vs Custom E2EE

| Aspect | Signal Protocol | Custom E2EE | Decision |
|--------|-----------------|-------------|----------|
| **Security Audit** | Extensively audited | Needs audit | **Signal** |
| **Forward Secrecy** | Built-in (Double Ratchet) | Must implement | Signal |
| **Backward Secrecy** | Built-in (DH Ratchet) | Must implement | Signal |
| **Trust** | Industry standard | Untrusted initially | Signal |
| **Flexibility** | Limited customization | Full control | Custom |

**WhatsApp's Choice: Signal Protocol**

**Rationale:**
- Open Whisper Systems partnership (2014)
- Battle-tested cryptography
- Provides forward and backward secrecy
- Respected by security community

---

## Technology Stack

### Complete Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  iOS          │  Android      │  Web          │  Desktop        │
│  (Swift/ObjC) │  (Java/Kotlin)│  (React)      │  (Electron)     │
│               │               │               │                 │
│  libsignal-protocol-c / libsignal-protocol-java                 │
│  SQLite (local storage)                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        NETWORK LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Protocol:      Noise Protocol (transport encryption)          │
│  Connection:    Persistent TCP (WebSocket for web)              │
│  Messaging:     Modified XMPP                                   │
│  Media:         HTTPS (encrypted blob upload/download)          │
│  VoIP:          SRTP over UDP (with STUN/TURN)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  OS:            FreeBSD                                         │
│  Runtime:       Erlang/OTP on BEAM VM                           │
│  Connection:    ejabberd (heavily modified)                     │
│  Load Balance:  L4 load balancers                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Offline Queue: Mnesia (Erlang distributed DB)                  │
│  Presence:      Redis-like caching                              │
│  Messages:      Cassandra (metadata only, E2EE content)         │
│  User Data:     PostgreSQL                                      │
│  Media:         Blob Storage (S3-like)                          │
│  CDN:           Edge caching for media                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                        │
├─────────────────────────────────────────────────────────────────┤
│  Push:          Apple Push Notification Service (APNs)          │
│                 Firebase Cloud Messaging (FCM)                  │
│  SMS:           Twilio / Nexmo (verification)                   │
│  VoIP:          Custom STUN/TURN infrastructure                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Selection Rationale

| Component | Technology | Why |
|-----------|------------|-----|
| **Server Language** | Erlang | 2KB processes, fault tolerance, hot swap |
| **Server OS** | FreeBSD | Network performance, kernel tuning |
| **Connection Server** | ejabberd | Erlang native, XMPP primitives |
| **Offline Storage** | Mnesia | In-process, distributed, Erlang native |
| **User Data** | PostgreSQL | ACID transactions, proven reliability |
| **Message Metadata** | Cassandra | Distributed, high write throughput |
| **Caching** | Redis-like | Sub-ms presence lookups |
| **Media Storage** | Blob Storage | Scalable object storage |
| **E2EE** | Signal Protocol | Industry standard, audited |
| **VoIP Encryption** | SRTP | Real-time encryption standard |
| **Transport** | Noise Protocol | Modern transport encryption |

---

## Multi-Region Deployment

### Global Architecture

```mermaid
flowchart TB
    subgraph Users["Global Users"]
        U_IN[Users in India]
        U_BR[Users in Brazil]
        U_US[Users in US]
        U_EU[Users in Europe]
    end

    subgraph DNS["Global DNS"]
        GDNS[GeoDNS]
    end

    subgraph India["India Region"]
        LB_IN[Load Balancer]
        EJ_IN[ejabberd Cluster]
        MN_IN[(Mnesia)]
        CS_IN[(Cassandra)]
    end

    subgraph Brazil["Brazil Region"]
        LB_BR[Load Balancer]
        EJ_BR[ejabberd Cluster]
        MN_BR[(Mnesia)]
        CS_BR[(Cassandra)]
    end

    subgraph US["US Region"]
        LB_US[Load Balancer]
        EJ_US[ejabberd Cluster]
        MN_US[(Mnesia)]
        CS_US[(Cassandra)]
    end

    subgraph Europe["Europe Region"]
        LB_EU[Load Balancer]
        EJ_EU[ejabberd Cluster]
        MN_EU[(Mnesia)]
        CS_EU[(Cassandra)]
    end

    subgraph GlobalRouter["Global Message Routing"]
        GMR[Global Router]
    end

    U_IN -->|DNS| GDNS -->|India DC| LB_IN
    U_BR -->|DNS| GDNS -->|Brazil DC| LB_BR
    U_US -->|DNS| GDNS -->|US DC| LB_US
    U_EU -->|DNS| GDNS -->|EU DC| LB_EU

    LB_IN --> EJ_IN
    LB_BR --> EJ_BR
    LB_US --> EJ_US
    LB_EU --> EJ_EU

    EJ_IN --> MN_IN & CS_IN
    EJ_BR --> MN_BR & CS_BR
    EJ_US --> MN_US & CS_US
    EJ_EU --> MN_EU & CS_EU

    EJ_IN <--> GMR
    EJ_BR <--> GMR
    EJ_US <--> GMR
    EJ_EU <--> GMR

    classDef user fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef region fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef storage fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef router fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class U_IN,U_BR,U_US,U_EU user
    class GDNS,LB_IN,LB_BR,LB_US,LB_EU edge
    class EJ_IN,EJ_BR,EJ_US,EJ_EU region
    class MN_IN,MN_BR,MN_US,MN_EU,CS_IN,CS_BR,CS_US,CS_EU storage
    class GMR router
```

### Cross-Region Message Routing

**Scenario**: Alice (India) sends message to Bob (Brazil)

```
1. Alice → India Gateway (persistent connection)
2. India Gateway → Global Router (route lookup)
3. Global Router → Brazil Gateway (Bob's home region)
4. Brazil Gateway → Bob (deliver message)
5. Bob → Brazil Gateway → India Gateway → Alice (delivery ACK)
```

### User-to-Region Affinity

| Strategy | Description |
|----------|-------------|
| **Phone Number Prefix** | +91 (India) → India region |
| **Registration Location** | IP geolocation at signup |
| **Latency-Based** | Redirect to lowest-latency DC |
| **Sticky Sessions** | Maintain affinity once assigned |

### Data Replication Strategy

| Data Type | Replication | Consistency |
|-----------|-------------|-------------|
| User Profile | Cross-region (async) | Eventual |
| Prekey Bundles | Cross-region (async) | Eventual |
| Offline Queue | Single region (Mnesia) | Strong within region |
| Presence | Single region (cache) | Eventual |
| Group Membership | Cross-region (async) | Eventual |

### Failover Strategy

| Scenario | Detection | Recovery |
|----------|-----------|----------|
| Node failure | Health checks (5s) | Supervisor restarts process |
| Cluster failure | Load balancer health | Route to other nodes |
| Region failure | DNS health checks | Redirect to secondary region |
| Data center failure | Active monitoring | Manual failover to DR site |

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Async (persistent connections) | Real-time delivery without polling |
| **Push vs Pull** | Push-based delivery | Immediate message delivery |
| **Stateless vs Stateful** | Stateful connections | Session state in Erlang process |
| **Event-driven vs Request-response** | Event-driven | Publish message, async delivery |
| **Read-heavy vs Write-heavy** | Write-heavy | Every send is a write |
| **Real-time vs Batch** | Real-time | Instant messaging requirement |
| **Edge vs Origin** | Origin (with CDN for media) | Connections to gateway, CDN for media |
| **Monolith vs Microservices** | Monolith (ejabberd) | Single deployment unit for messaging |
