# High-Level Design

[Back to Index](./00-index.md)

---

## System Architecture

The AI Native Offline First POS follows a **three-tier hierarchical architecture**:

1. **Terminal Layer** - Individual POS terminals with embedded AI and local storage
2. **Store Layer** - Mesh of terminals with leader election and in-store sync
3. **Cloud Layer** - Central mother server for aggregation and management

```mermaid
flowchart TB
    subgraph Terminal1["Terminal 1 (Leader)"]
        direction TB
        UI1[Touch UI]
        EdgeAI1[Edge AI Runtime]
        LocalDB1[(SQLite + CRDT)]
        SyncEngine1[Sync Engine]
        LeaderMgr[Leader Manager]
    end

    subgraph Terminal2["Terminal 2 (Follower)"]
        direction TB
        UI2[Touch UI]
        EdgeAI2[Edge AI Runtime]
        LocalDB2[(SQLite + CRDT)]
        SyncEngine2[Sync Engine]
    end

    subgraph Terminal3["Terminal 3 (Follower)"]
        direction TB
        UI3[Touch UI]
        EdgeAI3[Edge AI Runtime]
        LocalDB3[(SQLite + CRDT)]
        SyncEngine3[Sync Engine]
    end

    subgraph StoreNetwork["Store Local Network"]
        mDNS[mDNS Discovery]
        Raft[Raft Consensus]
    end

    subgraph Cloud["Mother Server (Cloud)"]
        Gateway[API Gateway]
        SyncService[Sync Service]
        EventStore[(Event Store)]
        MasterDB[(Master Database)]
        Analytics[Analytics Engine]
        AIHub[AI Model Hub]
    end

    UI1 --> EdgeAI1
    EdgeAI1 --> LocalDB1
    LocalDB1 --> SyncEngine1
    SyncEngine1 --> LeaderMgr

    UI2 --> EdgeAI2
    EdgeAI2 --> LocalDB2
    LocalDB2 --> SyncEngine2

    UI3 --> EdgeAI3
    EdgeAI3 --> LocalDB3
    LocalDB3 --> SyncEngine3

    Terminal1 <--> mDNS
    Terminal2 <--> mDNS
    Terminal3 <--> mDNS

    mDNS --> Raft
    Raft --> LeaderMgr

    SyncEngine2 <-->|P2P Sync| SyncEngine1
    SyncEngine3 <-->|P2P Sync| SyncEngine1

    LeaderMgr -.->|When Online| Gateway
    Gateway --> SyncService
    SyncService --> EventStore
    EventStore --> MasterDB
    MasterDB --> Analytics
    AIHub -.->|Model Updates| Terminal1
    AIHub -.->|Model Updates| Terminal2
    AIHub -.->|Model Updates| Terminal3

    style Terminal1 fill:#fff3e0
    style Terminal2 fill:#e8f5e9
    style Terminal3 fill:#e8f5e9
    style Cloud fill:#e3f2fd
```

---

## Component Overview

### Terminal Layer Components

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **Touch UI** | User interface, input handling | Android/Linux native |
| **Edge AI Runtime** | Local model inference | TensorFlow Lite, ONNX |
| **Local Database** | Transaction storage, CRDT state | SQLite with CRDT layer |
| **Sync Engine** | Delta computation, merge logic | Custom CRDT implementation |
| **Leader Manager** | Raft participation, leader duties | Embedded Raft library |

### Store Layer Components

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **mDNS Discovery** | Zero-config terminal discovery | Avahi (Linux), Bonjour (others) |
| **Raft Consensus** | Leader election, log replication | Custom lightweight Raft |
| **P2P Mesh** | Direct terminal-to-terminal sync | gRPC / WebSocket |

### Cloud Layer Components

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| **API Gateway** | Authentication, routing, rate limiting | Kong / Envoy |
| **Sync Service** | Receive deltas, resolve conflicts, persist | Custom microservice |
| **Event Store** | Immutable event log for all stores | Kafka / Pulsar |
| **Master Database** | Aggregated data, source of truth | PostgreSQL / CockroachDB |
| **Analytics Engine** | Cross-store analytics, reporting | ClickHouse / BigQuery |
| **AI Model Hub** | Model versioning, distribution | MLflow / Custom |

---

## Data Flow Diagrams

### Flow 1: Offline Transaction Processing

```mermaid
sequenceDiagram
    participant Cashier
    participant UI as Touch UI
    participant AI as Edge AI
    participant DB as Local SQLite
    participant CRDT as CRDT Engine
    participant Printer as Receipt Printer

    Cashier->>UI: Scan product / Add to cart
    UI->>AI: Product recognition (if camera)
    AI-->>UI: Product ID
    UI->>DB: Add item to cart

    Cashier->>UI: Complete sale
    UI->>DB: Begin transaction

    Note over DB: Generate local transaction ID<br/>(terminal_id + timestamp + counter)

    DB->>CRDT: Record transaction event
    CRDT->>CRDT: Update inventory counter (PN-Counter)
    DB->>DB: Commit to WAL

    DB-->>UI: Transaction confirmed
    UI->>Printer: Print receipt
    UI-->>Cashier: Sale complete

    Note over CRDT: Transaction queued for sync
```

### Flow 2: Terminal Discovery & Leader Election

```mermaid
sequenceDiagram
    participant T1 as Terminal 1
    participant mDNS as mDNS Service
    participant T2 as Terminal 2
    participant T3 as Terminal 3
    participant Raft as Raft Consensus

    Note over T1,T3: Store boots up

    T1->>mDNS: Register _pos._tcp.local
    T2->>mDNS: Register _pos._tcp.local
    T3->>mDNS: Register _pos._tcp.local

    mDNS-->>T1: Discovered T2, T3
    mDNS-->>T2: Discovered T1, T3
    mDNS-->>T3: Discovered T1, T2

    Note over Raft: All terminals join Raft cluster

    T1->>Raft: Start election (highest term)
    Raft->>T2: RequestVote
    Raft->>T3: RequestVote
    T2-->>Raft: Vote for T1
    T3-->>Raft: Vote for T1
    Raft-->>T1: Elected leader (term 1)

    Note over T1: T1 becomes sync coordinator

    loop Heartbeat (every 150ms)
        T1->>T2: AppendEntries (heartbeat)
        T1->>T3: AppendEntries (heartbeat)
        T2-->>T1: ACK
        T3-->>T1: ACK
    end
```

### Flow 3: In-Store CRDT Synchronization

```mermaid
sequenceDiagram
    participant T2 as Terminal 2 (Follower)
    participant T1 as Terminal 1 (Leader)
    participant T3 as Terminal 3 (Follower)

    Note over T2: Sale completed, inventory decremented

    T2->>T2: Update local PN-Counter
    T2->>T1: Push CRDT delta (transaction event)

    T1->>T1: Merge CRDT state
    T1->>T1: Check for conflicts

    alt No Conflict
        T1->>T1: Apply delta to leader state
    else Conflict Detected
        T1->>T1: Apply CRDT merge rules
        Note over T1: PN-Counter: sum all increments/decrements
    end

    T1->>T3: Broadcast merged state
    T1->>T2: Confirm sync (ACK with merged state)

    T2->>T2: Merge received state
    T3->>T3: Merge received state

    Note over T1,T3: All terminals converged
```

### Flow 4: Cloud Sync (Leader to Mother Server)

```mermaid
sequenceDiagram
    participant Leader as Leader Terminal
    participant Queue as Sync Queue
    participant Gateway as API Gateway
    participant Sync as Sync Service
    participant Kafka as Event Store
    participant DB as Master Database

    Note over Leader: Sync interval (15 min) or network restored

    Leader->>Leader: Check network connectivity

    alt Online
        Leader->>Queue: Fetch pending deltas
        Queue-->>Leader: Delta batch (compressed)

        Leader->>Gateway: POST /sync (delta batch)
        Gateway->>Gateway: Authenticate (mTLS + API key)
        Gateway->>Sync: Forward delta batch

        Sync->>Sync: Validate deltas
        Sync->>Sync: Resolve any cloud conflicts
        Sync->>Kafka: Publish events
        Kafka-->>Sync: ACK

        Sync->>DB: Update master state
        DB-->>Sync: Commit confirmed

        Sync-->>Gateway: Sync response (updates, model version)
        Gateway-->>Leader: 200 OK + updates

        Leader->>Queue: Mark deltas as synced
        Leader->>Leader: Apply cloud updates locally
    else Offline
        Note over Leader: Queue deltas, retry later
    end
```

---

## Key Architectural Decisions

### Decision 1: Local-First with CRDTs

| Aspect | Decision |
|--------|----------|
| **Choice** | CRDTs (G-Counter, PN-Counter, LWW-Register, OR-Set) |
| **Alternatives Considered** | OT (Operational Transformation), Last-write-wins only, Manual conflict resolution |
| **Rationale** | CRDTs mathematically guarantee convergence without coordination, perfect for offline scenarios |
| **Trade-off** | Higher storage overhead (state-based), limited data structure support |

**CRDT Types Used:**

| Data | CRDT Type | Merge Behavior |
|------|-----------|----------------|
| Inventory counts | PN-Counter | Sum increments, sum decrements |
| Transaction log | OR-Set (Observed-Remove) | Union of all transactions |
| Product prices | LWW-Register | Last timestamp wins |
| Customer data | LWW-Map | Per-field LWW |

### Decision 2: Raft-Based Leader Election

| Aspect | Decision |
|--------|----------|
| **Choice** | Simplified Raft consensus for leader election |
| **Alternatives Considered** | Bully algorithm, Ring election, No leader (pure P2P) |
| **Rationale** | Raft is well-understood, has formal proof, handles network partitions |
| **Trade-off** | Requires odd number of nodes for optimal quorum, complexity |

**Why Not Pure P2P:**
- Cloud sync needs a single coordinator to avoid duplicate uploads
- Ordering of events is simpler with a leader
- Conflict resolution can be centralized at leader

### Decision 3: Delta Sync with Lamport Timestamps

| Aspect | Decision |
|--------|----------|
| **Choice** | Delta-based sync with Lamport logical timestamps |
| **Alternatives Considered** | Full state sync, Vector clocks, Hybrid logical clocks |
| **Rationale** | Delta sync is bandwidth-efficient; Lamport timestamps are simple and sufficient |
| **Trade-off** | Requires tracking sync state, potential for missed deltas |

**Sync Protocol:**
```
Delta = {
  terminal_id: string,
  from_timestamp: lamport_ts,
  to_timestamp: lamport_ts,
  events: [CRDTOperation...]
}
```

### Decision 4: Edge AI with TensorFlow Lite

| Aspect | Decision |
|--------|----------|
| **Choice** | TensorFlow Lite for model inference, ONNX for model portability |
| **Alternatives Considered** | Cloud API calls, PyTorch Mobile, CoreML |
| **Rationale** | TF Lite is mature, supports quantization, runs on Android/Linux |
| **Trade-off** | Model size limits, accuracy vs latency trade-off |

**Model Deployment Pipeline:**
```
Train (Cloud) → Export (SavedModel) → Convert (TFLite) →
Quantize (INT8) → Deploy (OTA Update) → Inference (Edge)
```

### Decision 5: Hierarchical Sync (Terminal → Leader → Cloud)

| Aspect | Decision |
|--------|----------|
| **Choice** | Three-tier: Terminal syncs with Leader, Leader syncs with Cloud |
| **Alternatives Considered** | Direct terminal-to-cloud, Peer-to-peer only, Hub-and-spoke |
| **Rationale** | Reduces cloud connections, aggregates deltas, single point of coordination |
| **Trade-off** | Leader is critical path, failover needed |

```mermaid
flowchart LR
    T1[Terminal] --> L[Leader]
    T2[Terminal] --> L
    T3[Terminal] --> L
    L --> C[Cloud]

    style L fill:#fff3e0
```

---

## Architecture Pattern Checklist

| Pattern | Decision | Justification |
|---------|----------|---------------|
| **Sync vs Async** | Async (event-driven) | Offline-first requires async by nature |
| **Event-driven vs Request-response** | Event-driven | CRDTs are event-based |
| **Push vs Pull** | Push (leader broadcasts) | Faster convergence |
| **Stateless vs Stateful** | Stateful (terminals have local state) | Offline-first requirement |
| **Read-heavy vs Write-heavy** | Write-heavy (sales transactions) | Optimized for fast local writes |
| **Real-time vs Batch** | Hybrid (real-time local, batch cloud) | Balance latency and efficiency |
| **Edge vs Origin** | Edge-first | Core requirement |

---

## Network Topology

### Store Network (LAN)

```mermaid
graph TB
    subgraph Store["Store Network (192.168.1.0/24)"]
        Router[Router/Switch]
        T1[Terminal 1<br/>192.168.1.10]
        T2[Terminal 2<br/>192.168.1.11]
        T3[Terminal 3<br/>192.168.1.12]
        Printer[Receipt Printer<br/>192.168.1.50]
        BackOffice[Back Office PC<br/>192.168.1.100]
    end

    Internet((Internet))

    Router --- T1
    Router --- T2
    Router --- T3
    Router --- Printer
    Router --- BackOffice
    Router -.-> Internet

    T1 <-->|mDNS + Raft| T2
    T2 <-->|mDNS + Raft| T3
    T1 <-->|mDNS + Raft| T3
```

### Multi-Store Cloud Architecture

```mermaid
flowchart TB
    subgraph Store1["Store 1"]
        L1[Leader]
    end
    subgraph Store2["Store 2"]
        L2[Leader]
    end
    subgraph Store3["Store 3"]
        L3[Leader]
    end

    subgraph Cloud["Cloud Infrastructure"]
        LB[Load Balancer]
        API1[Sync API 1]
        API2[Sync API 2]
        Kafka[(Event Store)]
        DB[(Master DB)]
    end

    L1 --> LB
    L2 --> LB
    L3 --> LB

    LB --> API1
    LB --> API2
    API1 --> Kafka
    API2 --> Kafka
    Kafka --> DB
```

---

## State Management

### Terminal State Machine

```mermaid
stateDiagram-v2
    [*] --> Initializing: Boot
    Initializing --> Discovering: Load complete

    Discovering --> Candidate: No leader found
    Discovering --> Follower: Leader discovered

    Candidate --> Leader: Won election
    Candidate --> Follower: Lost election

    Leader --> Candidate: Leader timeout
    Follower --> Candidate: Leader timeout

    Leader --> SyncingToCloud: Network available
    SyncingToCloud --> Leader: Sync complete

    Leader --> [*]: Shutdown
    Follower --> [*]: Shutdown
```

### Sync Queue States

```mermaid
stateDiagram-v2
    [*] --> Pending: New event
    Pending --> SentToLeader: Transmitted
    SentToLeader --> AckedByLeader: Leader ACK
    AckedByLeader --> SentToCloud: Leader syncs
    SentToCloud --> Complete: Cloud ACK
    Complete --> [*]: Pruned

    SentToLeader --> Pending: Timeout/NAK
    SentToCloud --> AckedByLeader: Timeout/NAK
```

---

## Failure Modes & Handling

| Failure Mode | Detection | Handling |
|--------------|-----------|----------|
| **Leader crash** | Heartbeat timeout (500ms) | Raft election, new leader |
| **Follower crash** | Peer timeout | Continue without, resync on recovery |
| **Network partition (store)** | Split-brain detection | Smaller partition becomes read-only |
| **Internet outage** | Connectivity check | Queue syncs, continue local ops |
| **Cloud unavailable** | Sync failure | Exponential backoff retry |
| **Local DB corruption** | Checksum failure | Restore from peer or cloud |
| **AI model failure** | Inference timeout | Fallback to manual entry |
