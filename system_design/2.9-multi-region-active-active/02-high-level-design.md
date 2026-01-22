# High-Level Design

[← Back to Index](./00-index.md) | [Previous: Requirements →](./01-requirements-and-estimations.md) | [Next: Low-Level Design →](./03-low-level-design.md)

---

## System Architecture

```mermaid
flowchart TB
    subgraph Global["Global Layer"]
        GSLB["Global Server Load Balancer<br/>(GeoDNS + Anycast)"]
        GCM["Global Config Manager<br/>(Replicated)"]
        GHM["Global Health Monitor"]
    end

    subgraph US_East["US-East Region"]
        direction TB
        LB1["Regional Load Balancer"]
        subgraph Services1["Application Layer"]
            API1["API Servers"]
            CRE1["Conflict Resolution<br/>Engine"]
        end
        subgraph Data1["Data Layer"]
            direction LR
            DB1A["Node A"]
            DB1B["Node B"]
            DB1C["Node C"]
            DB1A <--> DB1B <--> DB1C
        end
        Cache1["Distributed Cache"]
        RT1["Replication<br/>Transport"]
    end

    subgraph EU_West["EU-West Region"]
        direction TB
        LB2["Regional Load Balancer"]
        subgraph Services2["Application Layer"]
            API2["API Servers"]
            CRE2["Conflict Resolution<br/>Engine"]
        end
        subgraph Data2["Data Layer"]
            direction LR
            DB2A["Node A"]
            DB2B["Node B"]
            DB2C["Node C"]
            DB2A <--> DB2B <--> DB2C
        end
        Cache2["Distributed Cache"]
        RT2["Replication<br/>Transport"]
    end

    subgraph APAC["APAC Region"]
        direction TB
        LB3["Regional Load Balancer"]
        subgraph Services3["Application Layer"]
            API3["API Servers"]
            CRE3["Conflict Resolution<br/>Engine"]
        end
        subgraph Data3["Data Layer"]
            direction LR
            DB3A["Node A"]
            DB3B["Node B"]
            DB3C["Node C"]
            DB3A <--> DB3B <--> DB3C
        end
        Cache3["Distributed Cache"]
        RT3["Replication<br/>Transport"]
    end

    Users_US["US Users"] --> GSLB
    Users_EU["EU Users"] --> GSLB
    Users_APAC["APAC Users"] --> GSLB

    GSLB --> LB1 & LB2 & LB3
    GHM -.->|monitor| LB1 & LB2 & LB3

    LB1 --> API1
    LB2 --> API2
    LB3 --> API3

    API1 --> CRE1 --> Data1
    API2 --> CRE2 --> Data2
    API3 --> CRE3 --> Data3

    API1 --> Cache1
    API2 --> Cache2
    API3 --> Cache3

    RT1 <-->|"Async Replication<br/>~80ms"| RT2
    RT2 <-->|"Async Replication<br/>~150ms"| RT3
    RT1 <-->|"Async Replication<br/>~180ms"| RT3

    style Global fill:#e3f2fd
    style US_East fill:#fff3e0
    style EU_West fill:#f3e5f5
    style APAC fill:#e8f5e9
```

---

## Component Responsibilities

| Component | Responsibility | Scaling Model |
|-----------|----------------|---------------|
| **Global Load Balancer** | Route users to optimal region based on latency/health | DNS-based, anycast |
| **Global Config Manager** | Distribute configuration across regions | Leader-based replication |
| **Global Health Monitor** | Track region health, trigger failover | Per-region agents |
| **Regional Load Balancer** | Distribute traffic within region | L7, horizontal scaling |
| **API Servers** | Handle business logic, coordinate writes | Stateless, auto-scale |
| **Conflict Resolution Engine** | Detect conflicts, apply resolution strategy | Co-located with data |
| **Data Cluster** | Store data with local quorum writes | Partitioned, replicated |
| **Distributed Cache** | Reduce read latency, cache hot data | Consistent hashing |
| **Replication Transport** | Ship changes to other regions | Async, batched |

---

## Data Flow Diagrams

### Write Flow (Local Commit, Async Replication)

```mermaid
sequenceDiagram
    participant Client
    participant GLB as Global LB
    participant RLB as Regional LB
    participant API as API Server
    participant CRE as Conflict Engine
    participant DB as Data Cluster
    participant RT as Replication Transport
    participant Remote as Remote Regions

    Client->>GLB: Write Request
    GLB->>RLB: Route to closest region
    RLB->>API: Forward request

    API->>API: Generate vector clock
    API->>CRE: Check for conflicts

    alt No local conflict
        CRE->>DB: LOCAL_QUORUM write
        DB-->>CRE: Write confirmed
        CRE-->>API: Success
        API-->>Client: 200 OK (committed locally)
    else Local conflict detected
        CRE->>CRE: Apply resolution (CRDT/LWW)
        CRE->>DB: Write resolved value
        DB-->>CRE: Write confirmed
        CRE-->>API: Success (conflict resolved)
        API-->>Client: 200 OK
    end

    Note over RT,Remote: Async replication (non-blocking)

    RT->>RT: Batch changes
    par Replicate to EU-West
        RT->>Remote: Send changes
        Remote-->>RT: ACK
    and Replicate to APAC
        RT->>Remote: Send changes
        Remote-->>RT: ACK
    end
```

### Read Flow (Local Read with Consistency Levels)

```mermaid
sequenceDiagram
    participant Client
    participant GLB as Global LB
    participant API as API Server
    participant Cache as Cache
    participant DB as Data Cluster

    Client->>GLB: Read Request (consistency=LOCAL_QUORUM)
    GLB->>API: Route to closest region

    alt Cache hit
        API->>Cache: Check cache
        Cache-->>API: Data found
        API-->>Client: 200 OK (from cache)
    else Cache miss
        API->>Cache: Check cache
        Cache-->>API: Miss
        API->>DB: Read with LOCAL_QUORUM
        DB-->>API: Data + vector clock
        API->>Cache: Update cache
        API-->>Client: 200 OK (from DB)
    end
```

### Global Quorum Write (Strong Consistency)

```mermaid
sequenceDiagram
    participant Client
    participant API as API Server (US-East)
    participant DB_US as US-East DB
    participant DB_EU as EU-West DB
    participant DB_APAC as APAC DB

    Client->>API: Write Request (consistency=GLOBAL_QUORUM)

    par Write to all regions
        API->>DB_US: Write
        API->>DB_EU: Write (cross-region)
        API->>DB_APAC: Write (cross-region)
    end

    DB_US-->>API: ACK (10ms)
    DB_EU-->>API: ACK (80ms)

    Note over API: Quorum achieved (2/3 regions)

    API-->>Client: 200 OK (globally consistent)

    DB_APAC-->>API: ACK (180ms, late)
```

---

## Key Architectural Decisions

### Decision 1: Write Pattern

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Write-Global** | Single write region, read anywhere | Strong consistency, simple | High latency for remote users, SPOF |
| **Write-Partitioned** | Each record has home region | No conflicts for home data | Routing complexity, cross-region for foreign data |
| **Write-Local** | Any region accepts writes | Lowest latency, highest availability | Requires conflict resolution |

**Recommendation: Write-Local**

Rationale: For a global application prioritizing availability and latency, Write-Local provides the best user experience. The complexity of conflict resolution is acceptable given our CRDT-based approach. For specific data types requiring stronger guarantees (e.g., user balances), we can use Write-Partitioned as an override.

### Decision 2: Consistency Model

| Option | Guarantee | Latency Impact | Implementation |
|--------|-----------|----------------|----------------|
| **Strong (Spanner-style)** | External consistency | High (cross-region sync) | TrueTime or commit-wait |
| **Causal+** | Causal ordering preserved | Medium | Vector clocks, session tokens |
| **Eventual** | All replicas converge eventually | Lowest | Async replication + CRDT |

**Recommendation: Eventual with Causal+ Option**

Rationale: Default to eventual consistency for maximum throughput and availability. Provide causal+ consistency via session tokens for read-your-writes guarantee. Allow per-request upgrade to GLOBAL_QUORUM for critical operations.

### Decision 3: Conflict Resolution Strategy

| Strategy | When to Use | Trade-off |
|----------|-------------|-----------|
| **CRDTs** | Counters, sets, registers | Automatic, but limited data types |
| **Vector Clocks + LWW** | Simple values, timestamps available | May lose concurrent writes |
| **Vector Clocks + Siblings** | Complex objects, app can merge | Requires application logic |
| **Custom Handlers** | Domain-specific rules | Most flexible, most complex |

**Recommendation: Layered Approach**

```
┌─────────────────────────────────────────────────────────────┐
│                  Conflict Resolution Strategy               │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Data Type Check                                   │
│    └── If CRDT type (counter, set) → Use CRDT merge         │
│                                                             │
│  Layer 2: Vector Clock Comparison                           │
│    └── If one dominates → Accept newer, discard older       │
│    └── If concurrent → Go to Layer 3                        │
│                                                             │
│  Layer 3: Resolution Policy                                 │
│    └── LWW-Register → Compare timestamps (+ region tiebreak)│
│    └── Siblings → Return all versions to application        │
│    └── Custom → Invoke registered handler                   │
└─────────────────────────────────────────────────────────────┘
```

### Decision 4: Replication Topology

| Topology | Regions | Latency | Bandwidth | Complexity |
|----------|---------|---------|-----------|------------|
| **Full Mesh** | 2-5 | Optimal (1 hop) | O(n²) | Medium |
| **Hub-Spoke** | 5-10 | +1 hop via hub | O(n) | Low |
| **Hierarchical** | 10+ | Variable | O(n log n) | High |

**Recommendation: Full Mesh for ≤5 Regions**

```mermaid
flowchart LR
    subgraph mesh["Full Mesh (3 regions)"]
        US["US-East"]
        EU["EU-West"]
        APAC["APAC"]
        US <-->|"80ms"| EU
        EU <-->|"150ms"| APAC
        US <-->|"180ms"| APAC
    end
```

For >5 regions, transition to hierarchical with regional super-nodes.

### Decision 5: Clock Synchronization

| Approach | Skew | Cost | Use |
|----------|------|------|-----|
| **TrueTime** | ~7ms | Very High | External consistency |
| **NTP** | 100-250ms | Low | General use |
| **HLC (Hybrid Logical Clock)** | Bounded | Low | Causal ordering |

**Recommendation: Hybrid Logical Clocks**

Rationale: HLC provides causal ordering guarantees without specialized hardware. Physical timestamps are used when available, with logical counters to break ties. This supports our causal+ consistency model while remaining cloud-agnostic.

---

## Technology Stack Summary

| Layer | Technology Pattern | Examples |
|-------|-------------------|----------|
| **Global Load Balancing** | GeoDNS + Anycast | Route 53, Cloudflare, NS1 |
| **Regional Load Balancing** | L7 Load Balancer | HAProxy, Envoy, Cloud LB |
| **API Layer** | Stateless Services | gRPC, REST |
| **Conflict Resolution** | CRDT Library + Custom | Automerge, Riak DT, Custom |
| **Data Store** | Distributed Database | Cassandra, CockroachDB, Custom |
| **Cache** | Distributed Cache | Redis Cluster, Memcached |
| **Replication** | CDC + Log Shipping | Debezium, Custom WAL shipping |
| **Message Transport** | Distributed Queue | Kafka, Pulsar |

---

## Regional Failover Architecture

```mermaid
stateDiagram-v2
    [*] --> Healthy: Region starts

    Healthy --> Degraded: Partial failure detected
    Healthy --> Unhealthy: Complete failure detected

    Degraded --> Healthy: Recovery
    Degraded --> Unhealthy: Further degradation

    Unhealthy --> Recovering: Failure resolved
    Recovering --> Healthy: Full recovery
    Recovering --> Unhealthy: Recovery failed

    state Healthy {
        [*] --> ServingTraffic
        ServingTraffic --> ServingTraffic: Normal operation
    }

    state Degraded {
        [*] --> PartialService
        PartialService --> PartialService: Reduced capacity
        note right of PartialService
            - Shed non-critical traffic
            - Extend cache TTLs
            - Alert on-call
        end note
    }

    state Unhealthy {
        [*] --> FailoverTriggered
        FailoverTriggered --> TrafficRerouted
        note right of TrafficRerouted
            - DNS/Anycast withdrawal
            - Traffic to other regions
            - RPO = replication lag
        end note
    }
```

---

## Cross-Region Communication

### Replication Protocol

```mermaid
sequenceDiagram
    participant Source as Source Region
    participant WAL as Write-Ahead Log
    participant Transport as Replication Transport
    participant Target as Target Region
    participant CRE as Conflict Engine

    Source->>WAL: Commit write
    WAL->>WAL: Append to log

    loop Every 10ms or 100 changes
        WAL->>Transport: Batch changes
        Transport->>Transport: Compress batch
        Transport->>Target: Send over TLS

        Target->>CRE: Apply changes

        alt No conflict
            CRE->>Target: Direct apply
        else Conflict detected
            CRE->>CRE: Resolve via CRDT/LWW
            CRE->>Target: Apply resolved value
        end

        Target-->>Transport: ACK with position
        Transport-->>WAL: Update high watermark
    end
```

### Anti-Entropy Synchronization

```mermaid
flowchart TD
    Start["Anti-Entropy Job<br/>(Every 5 minutes)"] --> BuildTree["Build Merkle Tree<br/>of local data"]
    BuildTree --> Exchange["Exchange root hashes<br/>with peer regions"]

    Exchange --> Compare{"Roots<br/>match?"}

    Compare -->|Yes| Done["No divergence<br/>Skip sync"]
    Compare -->|No| Drill["Drill down tree<br/>Find divergent ranges"]

    Drill --> Fetch["Fetch divergent<br/>key-value pairs"]
    Fetch --> Resolve["Resolve conflicts<br/>via standard path"]
    Resolve --> Update["Update local<br/>+ propagate"]
    Update --> Done
```

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Sync vs Async** | Async (default), Sync (optional) | Latency vs consistency trade-off |
| **Event-driven vs Request-response** | Request-response + Event replication | Immediate user feedback + eventual sync |
| **Push vs Pull** | Push replication, Pull on-demand | Minimize replication lag |
| **Stateless vs Stateful** | Stateless API, Stateful data | Horizontal scaling, data locality |
| **Read-heavy vs Write-heavy** | Read-local optimized | Global cache, local data clusters |
| **Real-time vs Batch** | Real-time (streaming replication) | Sub-second replication lag |
| **Edge vs Origin** | Edge caching, Origin data | Cache reads, consistent writes |

---

[← Back to Index](./00-index.md) | [Previous: Requirements →](./01-requirements-and-estimations.md) | [Next: Low-Level Design →](./03-low-level-design.md)
