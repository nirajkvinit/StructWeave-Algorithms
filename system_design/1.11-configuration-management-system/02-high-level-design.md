# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture Overview

### Core Components

```mermaid
flowchart TB
    subgraph Clients["Client Applications"]
        C1["Service A<br/>(SDK)"]
        C2["Service B<br/>(SDK)"]
        C3["Admin CLI"]
    end

    subgraph Gateway["Access Layer"]
        LB["Load Balancer"]
    end

    subgraph Cluster["Config Server Cluster"]
        L["Leader Node"]
        F1["Follower 1"]
        F2["Follower 2"]
        L <-->|"Raft/ZAB<br/>Replication"| F1
        L <-->|"Raft/ZAB<br/>Replication"| F2
        F1 <-->|"Heartbeat"| F2
    end

    subgraph Storage["Persistent Storage"]
        WAL1["WAL (Leader)"]
        WAL2["WAL (F1)"]
        WAL3["WAL (F2)"]
        SNAP["Snapshots"]
    end

    C1 & C2 & C3 --> LB
    LB -->|"Writes"| L
    LB -->|"Reads"| L & F1 & F2
    L --> WAL1
    F1 --> WAL2
    F2 --> WAL3
    L & F1 & F2 --> SNAP
```

### Component Responsibilities

| Component | Responsibility | Key Operations |
|-----------|---------------|----------------|
| **Client SDK** | Connection management, watch handling, retry logic | Connect, Get, Put, Watch, Transaction |
| **Load Balancer** | Route writes to leader, distribute reads | Health checks, leader discovery |
| **Leader Node** | Accept writes, coordinate consensus, order operations | Propose, Commit, Replicate |
| **Follower Nodes** | Replicate leader's log, serve reads, vote in elections | Apply, Vote, Forward writes |
| **Watch Manager** | Track subscriptions, dispatch notifications | Subscribe, Notify, Coalesce |
| **Storage Engine** | Persist data, maintain indexes, manage WAL | Write WAL, Snapshot, Compact |

---

## Detailed Architecture

### Single Node Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CONFIG SERVER NODE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      API Layer (gRPC/HTTP)                    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │   │
│  │  │   KV     │  │  Watch   │  │  Lease   │  │   Txn    │     │   │
│  │  │  API     │  │   API    │  │   API    │  │   API    │     │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │   │
│  └───────┼─────────────┼─────────────┼─────────────┼───────────┘   │
│          │             │             │             │                │
│  ┌───────┴─────────────┴─────────────┴─────────────┴───────────┐   │
│  │                     Request Handler                           │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │  • Authentication / Authorization                       │  │   │
│  │  │  • Rate Limiting                                        │  │   │
│  │  │  • Request Validation                                   │  │   │
│  │  │  • Read vs Write Routing                                │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                        │
│  ┌──────────────────────────┴───────────────────────────────────┐   │
│  │                    Core Components                             │   │
│  │                                                                │   │
│  │  ┌────────────┐    ┌────────────┐    ┌────────────┐          │   │
│  │  │  Consensus │    │   Watch    │    │   Lease    │          │   │
│  │  │   Module   │    │  Manager   │    │  Manager   │          │   │
│  │  │  (Raft)    │    │            │    │            │          │   │
│  │  └─────┬──────┘    └─────┬──────┘    └─────┬──────┘          │   │
│  │        │                 │                 │                  │   │
│  │  ┌─────┴─────────────────┴─────────────────┴─────────────┐   │   │
│  │  │                   State Machine                        │   │   │
│  │  │   ┌─────────────────────────────────────────────────┐ │   │   │
│  │  │   │              In-Memory KV Store                  │ │   │   │
│  │  │   │   • B-tree/Radix tree for keys                  │ │   │   │
│  │  │   │   • Revision index for watches                  │ │   │   │
│  │  │   │   • Lease → Keys mapping                        │ │   │   │
│  │  │   └─────────────────────────────────────────────────┘ │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             │                                        │
│  ┌──────────────────────────┴───────────────────────────────────┐   │
│  │                    Storage Layer                               │   │
│  │  ┌────────────┐    ┌────────────┐    ┌────────────┐          │   │
│  │  │    WAL     │    │  Snapshot  │    │   Index    │          │   │
│  │  │  (Append)  │    │  (Periodic)│    │  (Memory)  │          │   │
│  │  └────────────┘    └────────────┘    └────────────┘          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Cluster Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        SDK["Client SDK<br/>• Connection Pool<br/>• Watch Multiplexing<br/>• Retry Logic"]
    end

    subgraph Cluster["Config Cluster (5 nodes)"]
        subgraph Leader["Leader"]
            L_API["API"]
            L_Raft["Raft Module"]
            L_SM["State Machine"]
            L_Watch["Watch Manager"]
        end

        subgraph F1["Follower 1"]
            F1_API["API"]
            F1_Raft["Raft Module"]
            F1_SM["State Machine"]
        end

        subgraph F2["Follower 2"]
            F2_API["API"]
            F2_Raft["Raft Module"]
            F2_SM["State Machine"]
        end
    end

    SDK -->|"1. Write Request"| L_API
    L_API -->|"2. Propose"| L_Raft
    L_Raft -->|"3. AppendEntries"| F1_Raft & F2_Raft
    F1_Raft & F2_Raft -->|"4. Ack"| L_Raft
    L_Raft -->|"5. Commit"| L_SM
    L_SM -->|"6. Notify"| L_Watch
    L_Watch -->|"7. Push Events"| SDK
    L_API -->|"8. Response"| SDK
```

---

## Data Flow

### Write Path (Put/Delete)

```mermaid
sequenceDiagram
    participant Client
    participant Leader as Leader Node
    participant Raft as Raft Module
    participant F1 as Follower 1
    participant F2 as Follower 2
    participant SM as State Machine
    participant Watch as Watch Manager

    Note over Client,Watch: Write Request Flow

    Client->>Leader: PUT /keys/config/db (value, lease_id)
    Leader->>Leader: Validate request, check ACL
    Leader->>Raft: Propose(PUT, key, value)

    Note over Raft,F2: Consensus Phase
    par Replicate to Followers
        Raft->>F1: AppendEntries(log_entry)
        Raft->>F2: AppendEntries(log_entry)
    end
    F1-->>Raft: Ack (success)
    F2-->>Raft: Ack (success)

    Note over Raft,SM: Commit Phase (majority acked)
    Raft->>SM: Commit(log_entry)
    SM->>SM: Apply to KV store
    SM->>SM: Update revision index
    SM->>Watch: Notify(key, new_value, revision)

    Note over Watch,Client: Notification Phase
    Watch->>Watch: Find watchers for key
    Watch-->>Client: WatchEvent(key, PUT, value, revision)

    Leader-->>Client: OK (revision: 12345)
```

### Read Path

```mermaid
sequenceDiagram
    participant Client
    participant Node as Config Node
    participant SM as State Machine
    participant Index as Key Index

    Note over Client,Index: Serializable Read (default)
    Client->>Node: GET /keys/config/db
    Node->>SM: Read(key)
    SM->>Index: Lookup(key)
    Index-->>SM: Value, Revision, Version
    SM-->>Node: KeyValue
    Node-->>Client: {key, value, revision, version}

    Note over Client,Index: Linearizable Read (strict)
    Client->>Node: GET /keys/config/db (linearizable=true)
    Node->>Node: Wait for ReadIndex confirmation
    Note right of Node: Ensures no newer writes exist
    Node->>SM: Read(key)
    SM-->>Node: KeyValue
    Node-->>Client: {key, value, revision, version}
```

### Watch Notification Flow

```mermaid
sequenceDiagram
    participant C1 as Client 1
    participant C2 as Client 2
    participant Node as Config Node
    participant Watch as Watch Manager
    participant SM as State Machine

    Note over C1,SM: Subscribe to Key
    C1->>Node: Watch(/config/app, start_revision=100)
    Node->>Watch: Register(client_1, /config/app, rev=100)
    Watch-->>C1: Watch created (watch_id=1)

    C2->>Node: Watch(/config/*, start_revision=100)
    Node->>Watch: Register(client_2, /config/*, rev=100)
    Watch-->>C2: Watch created (watch_id=2)

    Note over C1,SM: Key Update Triggers Notification
    SM->>Watch: KeyUpdated(/config/app, revision=105)

    par Notify matching watchers
        Watch->>Watch: Match /config/app against filters
        Watch-->>C1: Event(PUT, /config/app, rev=105)
        Watch-->>C2: Event(PUT, /config/app, rev=105)
    end
```

### Lease/Session Flow

```mermaid
sequenceDiagram
    participant Client
    participant Node as Config Node
    participant Lease as Lease Manager
    participant SM as State Machine

    Note over Client,SM: Create Lease (Session)
    Client->>Node: LeaseGrant(TTL=30s)
    Node->>Lease: CreateLease(id, ttl=30s)
    Lease-->>Node: Lease(id=123, ttl=30s)
    Node-->>Client: Lease(id=123, ttl=30s)

    Note over Client,SM: Attach Key to Lease
    Client->>Node: PUT /locks/my-lock, lease=123
    Node->>SM: Put(key, value, lease=123)
    SM->>Lease: AttachKey(lease=123, key=/locks/my-lock)
    Node-->>Client: OK

    Note over Client,SM: Keep Alive Loop
    loop Every 10 seconds
        Client->>Node: LeaseKeepAlive(id=123)
        Node->>Lease: Refresh(id=123)
        Lease-->>Node: TTL reset to 30s
        Node-->>Client: OK (remaining=30s)
    end

    Note over Client,SM: Lease Expiry (client disconnected)
    Lease->>Lease: TTL expired for lease 123
    Lease->>SM: RevokeKeys(lease=123)
    SM->>SM: Delete /locks/my-lock
    SM->>SM: Trigger watch notifications
```

---

## Key Architectural Decisions

### Decision 1: Consensus Protocol (Raft vs ZAB)

| Aspect | Raft | ZAB (ZooKeeper) |
|--------|------|-----------------|
| **Understandability** | Designed for clarity | More complex |
| **Leader Election** | Single term, random timeout | Epoch-based |
| **Log Replication** | Explicit log matching | ZXID ordering |
| **Implementations** | etcd, Consul, TiKV | ZooKeeper |
| **Recovery** | Leader sends full log | Snapshots + transaction log |

**Recommendation:** Raft for new systems (simpler to understand and implement), ZAB if building on ZooKeeper ecosystem.

### Decision 2: Data Model (Hierarchical vs Flat)

| Aspect | Hierarchical (ZooKeeper) | Flat (etcd) |
|--------|--------------------------|-------------|
| **Structure** | Tree of znodes | Key-value with prefixes |
| **Parent-Child** | Explicit (can watch children) | Implicit via prefix |
| **Overhead** | Node per path segment | Single key |
| **Queries** | Get children, recursive delete | Prefix range, delete range |

**Recommendation:** Flat with prefixes for simplicity; hierarchical if complex namespace management needed.

### Decision 3: Watch Model (One-Time vs Persistent)

| Aspect | One-Time Trigger (ZooKeeper) | Persistent Watch (etcd) |
|--------|------------------------------|-------------------------|
| **Re-registration** | Client must re-register after each event | Continuous until cancelled |
| **Missed Events** | Possible if slow re-registration | No, stream from revision |
| **Resource Usage** | Lower (transient) | Higher (long-lived connections) |
| **Implementation** | Simpler server-side | More complex, but reliable |

**Recommendation:** Persistent watch with revision tracking (etcd style) for reliability.

### Decision 4: Read Consistency

| Option | Behavior | Use Case |
|--------|----------|----------|
| **Serializable (default)** | May read stale data from follower | Config reads where slight staleness is OK |
| **Linearizable** | Guaranteed to see all prior writes | Critical coordination (locks, elections) |
| **Revision-based** | Read state at specific revision | Transactional consistency |

**Recommendation:** Default to serializable for performance; linearizable for coordination primitives.

---

## High-Level Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONFIGURATION MANAGEMENT SYSTEM                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   CLIENT LAYER                                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Service A     Service B     Service C     Admin CLI         │   │
│   │     │              │             │             │             │   │
│   │     └──────────────┴─────────────┴─────────────┘             │   │
│   │                        │                                      │   │
│   │                   Client SDK                                  │   │
│   │              (gRPC/HTTP, Watch Mux)                          │   │
│   └────────────────────────┼────────────────────────────────────┘   │
│                            │                                        │
│   ACCESS LAYER             │                                        │
│   ┌────────────────────────┼────────────────────────────────────┐   │
│   │                   Load Balancer                              │   │
│   │            (Leader discovery, health checks)                 │   │
│   └────────────────────────┼────────────────────────────────────┘   │
│                            │                                        │
│   CONSENSUS LAYER          │                                        │
│   ┌────────────────────────┼────────────────────────────────────┐   │
│   │           ┌────────────┴────────────┐                       │   │
│   │           │      LEADER NODE        │                       │   │
│   │           │  ┌──────────────────┐   │                       │   │
│   │           │  │    Raft Module   │   │                       │   │
│   │           │  │  • Propose       │   │                       │   │
│   │           │  │  • Replicate     │   │                       │   │
│   │           │  │  • Commit        │   │                       │   │
│   │           │  └────────┬─────────┘   │                       │   │
│   │           │           │             │                       │   │
│   │     ┌─────┼───────────┼─────────────┼─────┐                 │   │
│   │     │     │           │             │     │                 │   │
│   │     ▼     │           ▼             │     ▼                 │   │
│   │  ┌──────┐ │     ┌──────────┐        │  ┌──────┐            │   │
│   │  │ F1   │◄┼─────│ Replicate├────────┼─►│  F2  │            │   │
│   │  └──────┘ │     └──────────┘        │  └──────┘            │   │
│   │           │                         │                       │   │
│   │           └─────────────────────────┘                       │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                            │                                        │
│   STATE MACHINE            │                                        │
│   ┌────────────────────────┼────────────────────────────────────┐   │
│   │           ┌────────────┴────────────┐                       │   │
│   │           │     Apply to State      │                       │   │
│   │           └────────────┬────────────┘                       │   │
│   │                        │                                     │   │
│   │     ┌──────────────────┼──────────────────┐                 │   │
│   │     │                  │                  │                 │   │
│   │     ▼                  ▼                  ▼                 │   │
│   │  ┌──────────┐    ┌──────────┐    ┌──────────┐              │   │
│   │  │  KV      │    │  Watch   │    │  Lease   │              │   │
│   │  │  Index   │    │ Manager  │    │ Manager  │              │   │
│   │  └──────────┘    └──────────┘    └──────────┘              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                            │                                        │
│   STORAGE LAYER            │                                        │
│   ┌────────────────────────┼────────────────────────────────────┐   │
│   │     ┌──────────────────┼──────────────────┐                 │   │
│   │     │                  │                  │                 │   │
│   │     ▼                  ▼                  ▼                 │   │
│   │  ┌──────────┐    ┌──────────┐    ┌──────────┐              │   │
│   │  │   WAL    │    │ Snapshot │    │ Compacted│              │   │
│   │  │ (Active) │    │(Periodic)│    │  (Old)   │              │   │
│   │  └──────────┘    └──────────┘    └──────────┘              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Datacenter Architecture

### Regional Cluster Deployment

```mermaid
flowchart TB
    subgraph DC1["Datacenter 1 (Primary)"]
        C1["Config Cluster<br/>(5 nodes)"]
        S1["Services DC1"]
        S1 --> C1
    end

    subgraph DC2["Datacenter 2 (Secondary)"]
        C2["Config Cluster<br/>(5 nodes)"]
        S2["Services DC2"]
        S2 --> C2
    end

    subgraph DC3["Datacenter 3 (DR)"]
        C3["Config Cluster<br/>(5 nodes)"]
        S3["Services DC3"]
        S3 --> C3
    end

    C1 <-->|"Async Replication<br/>(~100ms lag)"| C2
    C2 <-->|"Async Replication<br/>(~100ms lag)"| C3
    C1 <-->|"Async Replication<br/>(~150ms lag)"| C3
```

### Multi-DC Consistency Options

```
┌─────────────────────────────────────────────────────────────────────┐
│  MULTI-DC DEPLOYMENT OPTIONS                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  OPTION 1: Single Global Cluster (Strong Consistency)               │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  DC1: L, F1          DC2: F2, F3          DC3: F4              │ │
│  │                                                                 │ │
│  │  Pros: Strong consistency, single source of truth              │ │
│  │  Cons: High write latency (WAN RTT), unavailable if DC1 lost  │ │
│  │  Use: Critical coordination where consistency > latency        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  OPTION 2: Regional Clusters + Async Replication                    │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  DC1: [L, F1, F2]    DC2: [L, F1, F2]    DC3: [L, F1, F2]     │ │
│  │        ↓ async             ↓ async             ↓ async         │ │
│  │        └─────────────────────────────────────────┘             │ │
│  │                                                                 │ │
│  │  Pros: Low latency writes, regional availability               │ │
│  │  Cons: Eventual consistency cross-DC, conflict resolution      │ │
│  │  Use: Config that can tolerate ~1s staleness                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  OPTION 3: Primary + Read Replicas (Consul Model)                   │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  DC1: Primary Cluster    DC2: WAN-joined    DC3: WAN-joined   │ │
│  │        (writes)           (forwarded)        (forwarded)       │ │
│  │                                                                 │ │
│  │  Pros: Single write path, reads anywhere                       │ │
│  │  Cons: Write latency from DC2/DC3, primary is SPOF            │ │
│  │  Use: Write-light workloads with geo-distributed reads        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### Where Config Management Fits

```mermaid
flowchart TB
    subgraph External["External"]
        Admin["Admins / CI/CD"]
    end

    subgraph Platform["Platform Layer"]
        K8s["Kubernetes<br/>(etcd)"]
        Vault["Secret Manager"]
        SD["Service Discovery"]
    end

    subgraph Config["Config Management"]
        CM["Config Cluster"]
    end

    subgraph Apps["Application Layer"]
        A1["Service A"]
        A2["Service B"]
        A3["Service C"]
    end

    Admin -->|"Update config"| CM
    K8s -->|"Cluster state"| CM
    CM -->|"Inject secrets ref"| Vault
    CM -->|"Service config"| SD
    CM -->|"Watch config"| A1 & A2 & A3
    A1 & A2 & A3 -->|"Read config"| CM
```

### Common Integrations

| Integration | Purpose | Pattern |
|-------------|---------|---------|
| **Kubernetes** | etcd stores all cluster state | Native control plane |
| **Service Mesh** | Envoy xDS configuration | Watch for updates |
| **CI/CD Pipeline** | Deploy config changes | Write on deployment |
| **Feature Flags** | Runtime toggles | Watch + local cache |
| **Secret Manager** | Reference secrets | Config points to Vault path |
| **Monitoring** | Prometheus targets | Watch for scrape config |
| **Load Balancer** | Backend pool updates | Watch for upstream changes |
