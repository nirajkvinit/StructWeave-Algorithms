# Telegram: High-Level Design

## System Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        direction LR
        iOS[iOS App]
        Android[Android App]
        Desktop[Desktop<br/>macOS/Windows/Linux]
        Web[Web App<br/>WebK/WebZ]
        TDLib[TDLib<br/>Third-party]
    end

    subgraph Edge["Global Edge Layer"]
        CDN[Global CDN<br/>Media Cache]
        EdgePOP[Edge PoPs<br/>50+ Locations]
    end

    subgraph Gateway["Gateway Layer"]
        MTGW1[MTProto Gateway 1]
        MTGW2[MTProto Gateway 2]
        MTGWN[MTProto Gateway N]
        BotAPI[Bot HTTP API]
        LB[Load Balancer<br/>GeoDNS]
    end

    subgraph Core["Core Services"]
        direction TB
        AuthSvc[Auth Service<br/>Sessions, 2FA]
        MsgSvc[Messaging Service<br/>1:1, Groups]
        ChannelSvc[Channel Service<br/>Broadcast]
        ChatSvc[Chat Service<br/>State, Receipts]
        FileSvc[File Service<br/>Upload/Download]
        SecretSvc[Secret Chat<br/>E2EE]
        SearchSvc[Search Service<br/>Full-text]
        NotifSvc[Notification<br/>Push]
        BotSvc[Bot Service<br/>Webhooks]
    end

    subgraph Queue["Message Queue Layer"]
        MQ[Message Queue<br/>Async Processing]
        FanoutQ[Fanout Queue<br/>Channel Delivery]
    end

    subgraph Data["Data Layer"]
        UserDB[(User Store<br/>PostgreSQL)]
        MsgDB[(Message Store<br/>Cassandra)]
        ChannelDB[(Channel Store<br/>Cassandra)]
        FileStore[(File Store<br/>TFS)]
        SessionCache[(Session Cache<br/>Redis)]
        KeyStore[(Key Store<br/>Secure Enclave)]
        SearchIdx[(Search Index<br/>Elasticsearch)]
    end

    subgraph MultiDC["Multi-DC Replication"]
        DC_US[DC: Americas<br/>Miami]
        DC_EU[DC: Europe<br/>Amsterdam]
        DC_ASIA[DC: Asia<br/>Singapore]
        DC_ME[DC: Middle East<br/>Dubai]
    end

    subgraph External["External Services"]
        APNS[Apple Push]
        FCM[Firebase Cloud]
        SMS[SMS Gateway]
    end

    Clients -->|MTProto 2.0| LB
    Clients -->|HTTPS| CDN
    TDLib -->|MTProto| LB

    LB --> MTGW1 & MTGW2 & MTGWN
    LB --> BotAPI

    MTGW1 & MTGW2 & MTGWN --> AuthSvc
    MTGW1 & MTGW2 & MTGWN --> MsgSvc
    MTGW1 & MTGW2 & MTGWN --> ChannelSvc
    MTGW1 & MTGW2 & MTGWN --> ChatSvc
    MTGW1 & MTGW2 & MTGWN --> FileSvc
    MTGW1 & MTGW2 & MTGWN --> SecretSvc

    BotAPI --> BotSvc

    MsgSvc --> MQ
    ChannelSvc --> FanoutQ

    MQ --> MsgDB
    FanoutQ --> ChannelDB

    AuthSvc --> UserDB & SessionCache
    MsgSvc --> MsgDB & SearchIdx
    ChannelSvc --> ChannelDB
    ChatSvc --> MsgDB & SessionCache
    FileSvc --> FileStore & CDN
    SecretSvc --> KeyStore
    SearchSvc --> SearchIdx
    NotifSvc --> APNS & FCM

    Data --> MultiDC

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef queue fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef dc fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class iOS,Android,Desktop,Web,TDLib client
    class CDN,EdgePOP edge
    class MTGW1,MTGW2,MTGWN,BotAPI,LB gateway
    class AuthSvc,MsgSvc,ChannelSvc,ChatSvc,FileSvc,SecretSvc,SearchSvc,NotifSvc,BotSvc service
    class MQ,FanoutQ queue
    class UserDB,MsgDB,ChannelDB,FileStore,SessionCache,KeyStore,SearchIdx data
    class DC_US,DC_EU,DC_ASIA,DC_ME dc
    class APNS,FCM,SMS external
```

---

## Data Flow Diagrams

### Cloud Chat Message Flow

```mermaid
sequenceDiagram
    autonumber
    participant Alice as Alice's Device
    participant GW as MTProto Gateway
    participant Auth as Auth Service
    participant Msg as Message Service
    participant DB as Message Store
    participant Cache as Session Cache
    participant Push as Push Service
    participant Bob as Bob's Devices

    Alice->>GW: Send message (MTProto encrypted)
    GW->>Auth: Validate session
    Auth->>Cache: Check session token
    Cache-->>Auth: Session valid
    Auth-->>GW: Authorized

    GW->>Msg: Process message
    Msg->>DB: Store message (server encrypted)
    DB-->>Msg: Message ID + sequence

    Msg->>Cache: Lookup Bob's sessions

    alt Bob is online
        Cache-->>Msg: Active session(s)
        Msg->>Bob: Deliver via MTProto (all devices)
        Bob-->>Msg: Delivery ACK
    else Bob is offline
        Cache-->>Msg: No active session
        Msg->>Push: Send push notification
        Push->>Bob: APNs/FCM notification
    end

    Msg-->>GW: Message sent confirmation
    GW-->>Alice: Single tick (✓)

    Note over Bob: When Bob receives
    Bob-->>Msg: Delivery receipt
    Msg-->>Alice: Double tick (✓✓)

    Note over Bob: When Bob reads
    Bob-->>Msg: Read receipt
    Msg-->>Alice: Read indicator
```

### Secret Chat Key Exchange

```mermaid
sequenceDiagram
    autonumber
    participant Alice as Alice's Device
    participant Server as Telegram Server
    participant Bob as Bob's Device

    Note over Alice,Bob: Initiating Secret Chat (Diffie-Hellman)

    Alice->>Alice: Generate DH parameters (g, p)
    Alice->>Alice: Generate private key (a)
    Alice->>Alice: Compute g^a mod p

    Alice->>Server: Send (g, p, g^a mod p)
    Server->>Bob: Relay encrypted blob

    Bob->>Bob: Generate private key (b)
    Bob->>Bob: Compute g^b mod p
    Bob->>Bob: Compute shared secret: (g^a)^b mod p

    Bob->>Server: Send g^b mod p
    Server->>Alice: Relay encrypted blob

    Alice->>Alice: Compute shared secret: (g^b)^a mod p

    Note over Alice,Bob: Both have same shared secret
    Note over Alice,Bob: Server CANNOT compute secret (doesn't know a or b)

    rect rgb(200, 230, 200)
        Note over Alice,Bob: Verify Key Fingerprint
        Alice->>Alice: Display fingerprint image
        Bob->>Bob: Display fingerprint image
        Note over Alice,Bob: Users compare visually (out-of-band)
    end

    rect rgb(230, 200, 200)
        Note over Alice,Bob: All subsequent messages E2EE
        Alice->>Server: Encrypted message (server cannot read)
        Server->>Bob: Relay encrypted blob
        Bob->>Bob: Decrypt with shared secret
    end
```

### Channel Message Fanout

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Channel Admin
    participant GW as Gateway
    participant Channel as Channel Service
    participant Fanout as Fanout Queue
    participant Workers as Fanout Workers
    participant SubDB as Subscriber DB
    participant Delivery as Delivery Service
    participant Subs as Subscribers (43M)

    Admin->>GW: Post to channel
    GW->>Channel: Process channel message

    Channel->>Channel: Store message
    Channel->>SubDB: Get subscriber shards
    SubDB-->>Channel: Shard list (1000 shards)

    Channel->>Fanout: Queue fanout jobs (1000 tasks)

    par Parallel Fanout
        Fanout->>Workers: Shard 1 (43K subscribers)
        Fanout->>Workers: Shard 2 (43K subscribers)
        Fanout->>Workers: Shard N...
    end

    loop For each shard
        Workers->>SubDB: Get subscriber batch
        SubDB-->>Workers: 1000 subscribers

        Workers->>Delivery: Batch deliver

        alt Subscriber online
            Delivery->>Subs: Push via MTProto
        else Subscriber offline
            Delivery->>Delivery: Queue for push notification
        end
    end

    Note over Workers,Subs: 43M deliveries in ~60 seconds
    Note over Workers,Subs: Batched push notifications
```

---

## Key Architectural Decisions

### 1. Protocol Choice: MTProto 2.0 (Custom)

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **MTProto 2.0** | Mobile-optimized, binary efficient, multi-transport | Custom = harder to audit | **Chosen** |
| XMPP | Standard, well-understood | XML verbose, not mobile-optimized | Rejected |
| Signal Protocol | Industry-standard E2EE | Doesn't fit cloud storage model | Used for Secret Chats only |
| WebSocket + JSON | Simple, universal | Verbose, not encrypted by default | Rejected |

**Rationale**: MTProto is optimized for unreliable mobile networks, supports session independence from connections, and provides efficient binary encoding. The dual-encryption model (cloud + secret) requires custom protocol flexibility.

### 2. Storage Model: Server-Side Cloud Storage

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Server-side storage** | Multi-device sync, search, history | Server can access content | **Chosen** |
| Store-and-forward (WhatsApp) | True E2EE, privacy | No multi-device, no search | Rejected for cloud chats |
| P2P storage | Maximum privacy | Unreliable, complex | Rejected |

**Rationale**: Telegram's value proposition is seamless multi-device sync, searchable history, and convenience. Server-side storage enables these features. Secret Chats provide E2EE option for privacy-conscious users.

### 3. Encryption Model: Dual (Cloud + Secret)

```
┌─────────────────────────────────────────────────────────────────┐
│  TELEGRAM DUAL ENCRYPTION MODEL                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CLOUD CHATS (Default)          SECRET CHATS (Opt-in)          │
│  ┌─────────────────────┐        ┌─────────────────────┐        │
│  │ Client-Server       │        │ End-to-End          │        │
│  │ Encryption          │        │ Encryption          │        │
│  │                     │        │                     │        │
│  │ • Multi-device sync │        │ • Device-specific   │        │
│  │ • Search enabled    │        │ • No server access  │        │
│  │ • History on login  │        │ • Self-destruct     │        │
│  │ • Server can access │        │ • 1:1 only          │        │
│  │ • Groups supported  │        │ • Visual key verify │        │
│  └─────────────────────┘        └─────────────────────┘        │
│                                                                 │
│  Use Case: Convenience          Use Case: Max Privacy          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Database Architecture: Polyglot Persistence

| Data Type | Database | Reason |
|-----------|----------|--------|
| User profiles | PostgreSQL (sharded) | Relational, ACID, complex queries |
| Messages | Cassandra | Time-series, high write throughput, partitioned by chat |
| Sessions | Redis | In-memory, fast lookups, TTL |
| Files | TFS (custom) | Large objects, deduplication |
| Search | Elasticsearch | Full-text, inverted index |
| Keys | Secure Enclave | HSM-backed, tamper-resistant |

### 5. Group/Channel Architecture

| Type | Max Size | Model | Storage |
|------|----------|-------|---------|
| Private Group | 200 | Direct delivery | Per-member inbox |
| Supergroup | 200,000 | Hybrid fanout | Shared + notification |
| Gigagroup | Unlimited | Admin-only post | Broadcast model |
| Channel | Unlimited | Broadcast | Single copy + fanout |

### 6. Multi-DC Strategy: Active-Active

```mermaid
flowchart TB
    subgraph DC1["DC Americas (Miami)"]
        LB1[Load Balancer]
        App1[App Servers]
        DB1[(Primary Shard A)]
    end

    subgraph DC2["DC Europe (Amsterdam)"]
        LB2[Load Balancer]
        App2[App Servers]
        DB2[(Primary Shard B)]
    end

    subgraph DC3["DC Asia (Singapore)"]
        LB3[Load Balancer]
        App3[App Servers]
        DB3[(Primary Shard C)]
    end

    Users[Global Users]
    GeoDNS[GeoDNS]

    Users --> GeoDNS
    GeoDNS --> LB1 & LB2 & LB3

    DB1 <-->|Async Replication| DB2
    DB2 <-->|Async Replication| DB3
    DB3 <-->|Async Replication| DB1

    classDef dc fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef user fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef lb fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef db fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class DC1,DC2,DC3 dc
    class Users,GeoDNS user
    class LB1,LB2,LB3 lb
    class DB1,DB2,DB3 db
```

**Key Principles:**
- Users routed to nearest DC via GeoDNS
- Each DC handles specific user shards (primary)
- Async replication for cross-DC consistency
- Automatic failover if DC unavailable

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Async for delivery, Sync for ACK | Reliability + responsiveness |
| **Event-driven vs Request-response** | Event-driven for fanout | Scale channel delivery |
| **Push vs Pull** | Push for messages, Pull for history | Real-time + on-demand |
| **Stateless vs Stateful** | Stateful gateways, stateless services | Connection persistence |
| **Read-heavy vs Write-heavy** | Write-heavy (messages), Read-heavy (channels) | Optimize both paths |
| **Real-time vs Batch** | Real-time delivery, batch analytics | User experience priority |
| **Edge vs Origin** | Edge for media, Origin for messages | Latency + consistency |

---

## Component Responsibilities

### Gateway Layer

| Component | Responsibility | Key Features |
|-----------|---------------|--------------|
| **MTProto Gateway** | Protocol handling, connection management | Session multiplexing, encryption |
| **Load Balancer** | Traffic distribution, health checks | GeoDNS, sticky sessions |
| **Bot API** | HTTP interface for bots | REST, webhooks, rate limiting |

### Core Services

| Service | Responsibility | Scaling Strategy |
|---------|---------------|------------------|
| **Auth Service** | Sessions, 2FA, registration | Horizontal, cached sessions |
| **Messaging Service** | 1:1 and group routing | Partition by chat ID |
| **Channel Service** | Broadcast, fanout | Queue-based workers |
| **Chat Service** | State, receipts, typing | Shard by user ID |
| **File Service** | Upload, download, CDN | Object storage + cache |
| **Secret Chat** | E2EE key exchange | Stateless relay |
| **Search Service** | Full-text search | Elasticsearch cluster |
| **Notification** | Push notifications | Batch + rate limit |

### Data Layer

| Store | Purpose | Consistency |
|-------|---------|-------------|
| **PostgreSQL** | User data, metadata | Strong (per shard) |
| **Cassandra** | Messages, channels | Eventual (tunable) |
| **Redis** | Sessions, presence, cache | Best-effort |
| **TFS** | Media files | Eventual |
| **Elasticsearch** | Search index | Eventual |

---

## Message Delivery Guarantees

### Delivery Semantics

| Scenario | Guarantee | Mechanism |
|----------|-----------|-----------|
| Online recipient | At-least-once | ACK + retry |
| Offline recipient | At-least-once | Queue + push |
| Group message | At-least-once per member | Fanout + individual ACK |
| Channel broadcast | Best-effort | Batched delivery |

### Message States

```
┌─────────────────────────────────────────────────────────────────┐
│  MESSAGE STATE MACHINE                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │ PENDING  │───>│  SENT    │───>│DELIVERED │───>│   READ   │ │
│  │          │    │ (✓)      │    │ (✓✓)     │    │(seen)    │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│       │                │                                       │
│       │                │                                       │
│       ▼                ▼                                       │
│  ┌──────────┐    ┌──────────┐                                  │
│  │  FAILED  │    │ DELETED  │                                  │
│  │ (retry)  │    │(by user) │                                  │
│  └──────────┘    └──────────┘                                  │
│                                                                 │
│  PENDING:   Client sent, awaiting server ACK                   │
│  SENT:      Server received, stored                            │
│  DELIVERED: Recipient device received                          │
│  READ:      Recipient opened chat                              │
│  FAILED:    Retry exhausted                                    │
│  DELETED:   User deleted message                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cross-Cutting Concerns

### Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    participant User as User Device
    participant GW as Gateway
    participant Auth as Auth Service
    participant SMS as SMS Gateway
    participant Session as Session Store

    User->>GW: Request auth (phone number)
    GW->>Auth: Validate phone format
    Auth->>SMS: Send verification code
    SMS-->>User: SMS with code

    User->>GW: Submit code
    GW->>Auth: Verify code
    Auth->>Auth: Generate auth key (DH exchange)
    Auth->>Session: Create session
    Session-->>Auth: Session token
    Auth-->>GW: Auth key + session
    GW-->>User: Connected (encrypted channel established)

    Note over User,Session: All subsequent requests use session
```

### Rate Limiting Strategy

| Resource | Limit | Window | Action |
|----------|-------|--------|--------|
| Messages/user | 30/sec | 1 sec | Slow down |
| Messages/group | 20/sec | 1 sec | Queue |
| Channel posts | 1/sec | 1 sec | Reject |
| File uploads | 5/min | 1 min | Queue |
| API calls (bot) | 30/sec | 1 sec | 429 error |
| Login attempts | 5/hour | 1 hour | Lockout |

### Caching Strategy

| Data | Cache Layer | TTL | Invalidation |
|------|-------------|-----|--------------|
| User profiles | Redis | 1 hour | On update |
| Session tokens | Redis | Session lifetime | On logout |
| Recent messages | Application | 5 min | On new message |
| Channel metadata | Redis | 10 min | On update |
| File locations | CDN | 24 hours | On delete |
| Search results | Elasticsearch | 5 min | On index update |

---

## Technology Choices Summary

| Layer | Technology | Alternative Considered | Why Chosen |
|-------|------------|----------------------|------------|
| Protocol | MTProto 2.0 | XMPP, WebSocket | Mobile-optimized, efficient |
| Backend | C++ (core) | Go, Rust | Performance, control |
| User DB | PostgreSQL | MySQL, CockroachDB | Mature, reliable |
| Message DB | Cassandra | ScyllaDB, DynamoDB | Proven at scale |
| Cache | Redis | Memcached | Data structures, pub/sub |
| File Storage | TFS | Object Storage | Custom optimization |
| Search | Elasticsearch | Solr, Meilisearch | Full-text, scalable |
| Queue | Custom | Kafka, RabbitMQ | Tight integration |
| CDN | Multi-provider | Single CDN | Redundancy, coverage |
