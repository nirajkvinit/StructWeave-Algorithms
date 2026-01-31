# High-Level Design

## System Architecture

### Slack Architecture

Slack's architecture is built around four core Java services that handle real-time communication:

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TB
    subgraph Clients["Client Layer"]
        WEB[Web Browser]
        DESKTOP[Desktop App]
        MOBILE[Mobile App]
    end

    subgraph Edge["Edge Layer"]
        ENVOY[Envoy Proxy<br/>TLS Termination<br/>Load Balancing]
    end

    subgraph RealTime["Real-Time Layer (Java)"]
        GS1[Gateway Server 1]
        GS2[Gateway Server 2]
        GSN[Gateway Server N]

        CS1[Channel Server 1]
        CS2[Channel Server 2]
        CSN[Channel Server N]

        AS[Admin Servers<br/>Stateless]
        PS[Presence Servers<br/>In-Memory]
    end

    subgraph WebApp["Web Application Layer"]
        WEBAPP[Webapp<br/>PHP/Hacklang]
    end

    subgraph Data["Data Layer"]
        VITESS[(Vitess<br/>MySQL Shards)]
        REDIS[(Redis<br/>Cache + Pub/Sub)]
        ES[(Elasticsearch<br/>Search Index)]
        BLOB[(Blob Storage<br/>Files/Media)]
    end

    subgraph External["External"]
        CDN[CDN]
        PUSH[Push Services<br/>APNs/FCM]
    end

    WEB & DESKTOP & MOBILE --> ENVOY
    ENVOY --> GS1 & GS2 & GSN

    GS1 & GS2 & GSN <--> CS1 & CS2 & CSN
    GS1 & GS2 & GSN --> PS
    CS1 & CS2 & CSN --> AS
    AS --> WEBAPP

    WEBAPP --> VITESS & REDIS & ES & BLOB

    GS1 --> PUSH
    WEBAPP --> CDN

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edge fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef realtime fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef webapp fill:#e0f7fa,stroke:#00695c,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef external fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class WEB,DESKTOP,MOBILE client
    class ENVOY edge
    class GS1,GS2,GSN,CS1,CS2,CSN,AS,PS realtime
    class WEBAPP webapp
    class VITESS,REDIS,ES,BLOB data
    class CDN,PUSH external
```

**Key Components:**

| Component | Type | Purpose |
|-----------|------|---------|
| **Gateway Servers** | Stateful, in-memory | Hold WebSocket connections, route to Channel Servers |
| **Channel Servers** | Stateful, in-memory | Host channel state, fan out messages using consistent hashing |
| **Admin Servers** | Stateless | Interface between Webapp and real-time layer |
| **Presence Servers** | In-memory | Track online status, users hashed to specific servers |
| **Webapp** | PHP/Hacklang | REST APIs, business logic, database access |

---

### Discord Architecture

Discord uses Elixir/BEAM for its real-time layer, with Rust for performance-critical paths:

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TB
    subgraph Clients["Client Layer"]
        WEB[Web Browser]
        DESKTOP[Desktop App]
        MOBILE[Mobile App]
    end

    subgraph Gateway["Gateway Layer"]
        GW1[Gateway Node 1]
        GW2[Gateway Node 2]
        GWN[Gateway Node N]
    end

    subgraph Elixir["Elixir/BEAM Layer"]
        subgraph Node1["BEAM Node 1"]
            S1[Session Processes]
            G1[Guild Processes]
        end
        subgraph Node2["BEAM Node 2"]
            S2[Session Processes]
            G2[Guild Processes]
        end
        subgraph NodeN["BEAM Node N"]
            SN[Session Processes]
            GN[Guild Processes]
        end

        RELAY[Relay System<br/>15K users/relay]
    end

    subgraph Rust["Rust Data Services"]
        DS[Data Services<br/>Request Coalescing]
    end

    subgraph Data["Data Layer"]
        SCYLLA[(ScyllaDB<br/>Messages)]
        REDIS[(Redis<br/>Sessions/Cache)]
        ES[(Elasticsearch)]
        BLOB[(Blob Storage)]
    end

    subgraph Voice["Voice Layer"]
        SFU[SFU Servers<br/>WebRTC]
        SIGNALING[Signaling Server]
    end

    WEB & DESKTOP & MOBILE --> GW1 & GW2 & GWN
    GW1 --> S1
    GW2 --> S2
    GWN --> SN

    S1 --> G1
    S2 --> G2
    SN --> GN

    G1 & G2 & GN --> RELAY
    G1 & G2 & GN --> DS

    DS --> SCYLLA & REDIS & ES & BLOB

    S1 & S2 & SN --> SIGNALING
    SIGNALING --> SFU

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef elixir fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef rust fill:#ffe0b2,stroke:#e65100,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef voice fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class WEB,DESKTOP,MOBILE client
    class GW1,GW2,GWN gateway
    class S1,S2,SN,G1,G2,GN,RELAY,Node1,Node2,NodeN elixir
    class DS rust
    class SCYLLA,REDIS,ES,BLOB data
    class SFU,SIGNALING voice
```

**Key Components:**

| Component | Type | Purpose |
|-----------|------|---------|
| **Session Process** | Elixir GenServer | One per WebSocket connection, holds user state |
| **Guild Process** | Elixir GenServer | One per guild, central routing for all guild events |
| **Relay System** | Elixir | Partition large guilds (15K users per relay) |
| **Data Services** | Rust | Request coalescing, hot partition mitigation |
| **SFU Servers** | WebRTC | Selective Forwarding Unit for voice |

---

## Data Flow

### Message Send Flow (Slack)

```mermaid
%%{init: {'theme': 'neutral'}}%%
sequenceDiagram
    participant C as Client
    participant E as Envoy
    participant W as Webapp
    participant V as Vitess
    participant AS as Admin Server
    participant CS as Channel Server
    participant GS as Gateway Servers
    participant R as Recipients

    C->>E: HTTP POST /api/chat.postMessage
    E->>W: Forward request
    W->>W: Validate auth, permissions
    W->>V: Persist message
    V-->>W: ACK (message_id, timestamp)
    W->>AS: Notify real-time layer
    AS->>CS: Route to Channel Server (consistent hash)
    CS->>CS: Load channel members

    par Fanout to online members
        CS->>GS: Push to Gateway Server 1
        GS->>R: WebSocket: MESSAGE_CREATE
    and
        CS->>GS: Push to Gateway Server 2
        GS->>R: WebSocket: MESSAGE_CREATE
    end

    W-->>C: HTTP 200 {message_id, ts}
```

**Key Design Decision**: Slack uses HTTP POST (not WebSocket) for sending messages. This provides:
- Crash safety: Client has evidence of send attempt
- Mobile-friendly: Works with background fetch
- Clear success/failure semantics

---

### Message Send Flow (Discord)

```mermaid
%%{init: {'theme': 'neutral'}}%%
sequenceDiagram
    participant C as Client
    participant GW as Gateway
    participant S as Session Process
    participant G as Guild Process
    participant DS as Data Services
    participant DB as ScyllaDB
    participant R as Relay
    participant O as Other Sessions

    C->>GW: WebSocket: MESSAGE_CREATE
    GW->>S: Route to session
    S->>S: Validate permissions
    S->>G: Forward to guild process
    G->>DS: Persist message
    DS->>DB: Write (with coalescing)
    DB-->>DS: ACK
    DS-->>G: Confirm

    alt Small Guild (<15K)
        G->>O: Direct fanout to sessions
    else Large Guild
        G->>R: Distribute to relays
        R->>O: Relay fanout to sessions
    end

    O->>C: WebSocket: MESSAGE_CREATE (to recipients)
```

---

### WebSocket Connection Establishment

```mermaid
%%{init: {'theme': 'neutral'}}%%
sequenceDiagram
    participant C as Client
    participant LB as Load Balancer
    participant GW as Gateway/Session
    participant AUTH as Auth Service
    participant DB as Database

    C->>LB: HTTPS GET /gateway (discover endpoint)
    LB-->>C: wss://gateway-region.slack.com

    C->>LB: WebSocket Upgrade Request
    LB->>GW: Route to Gateway/Session
    GW->>GW: Accept WebSocket

    C->>GW: IDENTIFY {token, capabilities}
    GW->>AUTH: Validate token
    AUTH->>DB: Lookup user, workspaces
    DB-->>AUTH: User data
    AUTH-->>GW: Valid + user info

    GW->>GW: Subscribe to channels
    GW-->>C: READY {user, guilds, channels, session_id}

    loop Heartbeat
        C->>GW: HEARTBEAT
        GW-->>C: HEARTBEAT_ACK
    end
```

---

## Key Architectural Decisions

### Decision 1: Stateful Gateway Servers

| Option | Pros | Cons |
|--------|------|------|
| **Stateful (Slack/Discord)** | Low latency, efficient fanout, connection affinity | Complex failover, memory pressure |
| **Stateless** | Easy scaling, simple deployment | Requires external state store, higher latency |

**Recommendation**: Stateful gateways with graceful failover. State includes:
- WebSocket connection
- Channel/guild subscriptions
- Pending message queue
- Heartbeat timers

---

### Decision 2: Message Persistence Strategy

| Option | Pros | Cons |
|--------|------|------|
| **Write-through (Slack)** | Strong durability, clear success semantics | Higher latency on send |
| **Write-behind** | Lower latency | Risk of message loss on crash |

**Slack's Approach**: HTTP POST writes to database first, then notifies real-time layer. This ensures:
- Message is durable before client gets ACK
- Clear failure notification on database issues
- Decouples persistence from fanout

---

### Decision 3: Channel/Guild Routing

| Option | Slack | Discord |
|--------|-------|---------|
| **Strategy** | Consistent hashing to Channel Servers | Process-per-guild on BEAM |
| **Pros** | Predictable routing, good load distribution | Natural isolation, fault tolerance |
| **Cons** | Rebalancing on scale changes | Guild process can become bottleneck |
| **Large Scale** | Hash ring expansion | Relay system partitions users |

---

### Decision 4: Database Choice

| Aspect | Slack (Vitess/MySQL) | Discord (ScyllaDB) |
|--------|---------------------|-------------------|
| **Query Model** | SQL (familiar, flexible) | CQL (Cassandra-compatible) |
| **Sharding** | Automatic via Vitess | Native partitioning |
| **Consistency** | Configurable (eventual by default) | Tunable per-query |
| **Operations** | Complex (but mature tooling) | Simpler (C++, no GC pauses) |
| **Migration** | Vitess handles resharding | Discord built custom Rust tooling |

**Discord's Migration Story**: Moved from 177 Cassandra nodes to 72 ScyllaDB nodes with:
- 15ms p99 read latency (vs 40-125ms)
- 5ms p99 write latency (vs 5-70ms)
- No garbage collection pauses

---

### Decision 5: Thread vs Reply Model

| Aspect | Slack (Threads) | Discord (Replies) |
|--------|-----------------|-------------------|
| **Structure** | Single-level parent-child | Simple reply_to reference |
| **Visibility** | Threads hidden from channel by default | Replies inline in channel |
| **Notifications** | Thread participants notified separately | @mention required |
| **UX Complexity** | High (thread sidebar, "Also send to channel") | Low (just a reference) |
| **Use Case** | Detailed discussions, enterprise workflows | Quick responses, casual chat |

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Async (WebSocket push) | Real-time requirement |
| **Event-driven vs Request-response** | Event-driven for real-time, REST for mutations | Best of both |
| **Push vs Pull** | Push for online, pull for history | Optimize for common case |
| **Stateless vs Stateful** | Stateful gateways | Connection affinity |
| **Read-heavy vs Write-heavy** | Write-heavy (messages), Read-heavy (search) | Optimize separately |
| **Real-time vs Batch** | Real-time messaging, batch for search indexing | Different latency needs |
| **Edge vs Origin** | Edge for gateway routing, origin for data | Latency optimization |

---

## Component Interactions

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart LR
    subgraph Write["Write Path"]
        W1[Client POST] --> W2[Webapp]
        W2 --> W3[Database]
        W2 --> W4[Admin Server]
        W4 --> W5[Channel Server]
        W5 --> W6[Gateway Fanout]
    end

    subgraph Read["Read Path"]
        R1[Client Request] --> R2[Webapp]
        R2 --> R3[Cache Check]
        R3 -->|Miss| R4[Database]
        R3 -->|Hit| R5[Return]
        R4 --> R5
    end

    subgraph RealTime["Real-Time Path"]
        RT1[WebSocket Event] --> RT2[Gateway]
        RT2 --> RT3[Channel/Guild Process]
        RT3 --> RT4[Fanout to Subscribers]
    end

    subgraph Search["Search Path"]
        S1[Query] --> S2[Webapp]
        S2 --> S3[Elasticsearch]
        S3 --> S4[Results]
    end

    classDef write fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef read fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef realtime fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef search fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class W1,W2,W3,W4,W5,W6 write
    class R1,R2,R3,R4,R5 read
    class RT1,RT2,RT3,RT4 realtime
    class S1,S2,S3,S4 search
```
