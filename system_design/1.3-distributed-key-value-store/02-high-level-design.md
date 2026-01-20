# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture Overview

The distributed key-value store follows a **decentralized, peer-to-peer architecture** (Dynamo-style) where any node can serve any request. This eliminates single points of failure and enables horizontal scaling.

### Core Components

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        C1[Application 1]
        C2[Application 2]
        C3[Application N]
    end

    subgraph Routing["Routing Layer"]
        SDK[Client SDK<br/>Cluster-aware]
        LB[Load Balancer<br/>Optional]
    end

    subgraph Cluster["Storage Cluster"]
        subgraph Node1["Node A"]
            CO1[Coordinator]
            SE1[Storage Engine]
            RM1[Replication Mgr]
        end

        subgraph Node2["Node B"]
            CO2[Coordinator]
            SE2[Storage Engine]
            RM2[Replication Mgr]
        end

        subgraph Node3["Node C"]
            CO3[Coordinator]
            SE3[Storage Engine]
            RM3[Replication Mgr]
        end
    end

    subgraph Gossip["Membership & Failure Detection"]
        GM[Gossip Protocol]
    end

    C1 & C2 & C3 --> SDK
    SDK --> LB
    LB --> Node1 & Node2 & Node3
    Node1 <--> Node2 <--> Node3
    Node1 & Node2 & Node3 <--> GM
```

### Component Responsibilities

| Component | Responsibility | Key Features |
|-----------|---------------|--------------|
| **Client SDK** | Request routing, connection pooling | Cluster topology awareness, retries |
| **Coordinator** | Handle client requests, coordinate replicas | Any node can coordinate any key |
| **Storage Engine** | Persist data, manage LSM tree | MemTable, SSTables, compaction |
| **Replication Manager** | Sync data across replicas | Hinted handoff, anti-entropy |
| **Gossip Protocol** | Cluster membership, failure detection | Decentralized, eventually consistent |

---

## Consistent Hash Ring Architecture

### Virtual Nodes Distribution

```mermaid
flowchart TB
    subgraph Ring["Consistent Hash Ring (0 to 2^128)"]
        direction TB

        subgraph Tokens["Token Positions"]
            T1["Token 0°<br/>Node A (vnode 1)"]
            T2["Token 45°<br/>Node B (vnode 1)"]
            T3["Token 90°<br/>Node C (vnode 1)"]
            T4["Token 135°<br/>Node A (vnode 2)"]
            T5["Token 180°<br/>Node B (vnode 2)"]
            T6["Token 225°<br/>Node C (vnode 2)"]
            T7["Token 270°<br/>Node A (vnode 3)"]
            T8["Token 315°<br/>Node B (vnode 3)"]
        end
    end

    subgraph Physical["Physical Nodes"]
        A["Node A<br/>vnodes: 1, 2, 3<br/>~37.5% data"]
        B["Node B<br/>vnodes: 1, 2, 3<br/>~37.5% data"]
        C["Node C<br/>vnodes: 1, 2<br/>~25% data"]
    end

    T1 & T4 & T7 --> A
    T2 & T5 & T8 --> B
    T3 & T6 --> C
```

### Key-to-Node Mapping

```
Key: "user:12345:preferences"

Step 1: Hash the key
  hash = MD5("user:12345:preferences")
       = 0x7A3B2C1D... (128-bit value)

Step 2: Find position on ring
  position = hash mod 2^128

Step 3: Walk clockwise to find coordinator
  coordinator = first_node_at_or_after(position)
              = Node B (vnode 1 at 45°)

Step 4: Build preference list (N=3 replicas)
  preference_list = [Node B, Node C, Node A]
  (Skip duplicate physical nodes)
```

---

## Data Flow Diagrams

### Write Path (Quorum: N=3, W=2)

```mermaid
sequenceDiagram
    participant Client
    participant SDK as Client SDK
    participant Coord as Coordinator<br/>(Node B)
    participant R1 as Replica 1<br/>(Node B - local)
    participant R2 as Replica 2<br/>(Node C)
    participant R3 as Replica 3<br/>(Node A)

    Client->>SDK: PUT(key, value, consistency=QUORUM)
    SDK->>SDK: hash(key) → Node B
    SDK->>Coord: Forward request

    par Parallel writes to replicas
        Coord->>R1: Write locally
        Coord->>R2: Write to Node C
        Coord->>R3: Write to Node A
    end

    R1-->>Coord: ACK (local)
    R2-->>Coord: ACK
    Note over Coord: W=2 achieved ✓
    Coord-->>SDK: Success (version: v2)
    SDK-->>Client: 200 OK

    R3-->>Coord: ACK (arrives later)
    Note over Coord: All 3 replicas written
```

### Read Path with Read Repair (R=2)

```mermaid
sequenceDiagram
    participant Client
    participant Coord as Coordinator
    participant R1 as Replica 1
    participant R2 as Replica 2
    participant R3 as Replica 3

    Client->>Coord: GET(key, consistency=QUORUM)

    par Parallel reads from replicas
        Coord->>R1: Read request
        Coord->>R2: Read request
        Coord->>R3: Read request
    end

    R1-->>Coord: value_v2, clock={A:1, B:2}
    R2-->>Coord: value_v2, clock={A:1, B:2}
    Note over Coord: R=2 achieved, versions match ✓
    Coord-->>Client: value_v2

    R3-->>Coord: value_v1, clock={A:1, B:1}
    Note over Coord: Stale replica detected!

    rect rgb(255, 230, 230)
        Note over Coord,R3: Read Repair (async)
        Coord->>R3: Repair with value_v2
        R3-->>Coord: Repair ACK
    end
```

### Write Path with Hinted Handoff (Node Failure)

```mermaid
sequenceDiagram
    participant Client
    participant Coord as Coordinator
    participant R1 as Replica 1<br/>(Healthy)
    participant R2 as Replica 2<br/>(Healthy)
    participant R3 as Replica 3<br/>(FAILED)
    participant R4 as Hint Node<br/>(Healthy)

    Client->>Coord: PUT(key, value)

    Coord->>R1: Write request
    Coord->>R2: Write request
    Coord-xR3: Write request (TIMEOUT)

    Note over Coord: R3 failed, use hinted handoff
    Coord->>R4: Write with HINT<br/>(intended for R3)

    R1-->>Coord: ACK
    R2-->>Coord: ACK
    R4-->>Coord: ACK (hint stored)

    Note over Coord: W=2 achieved ✓
    Coord-->>Client: Success

    rect rgb(230, 255, 230)
        Note over R3,R4: Later: R3 recovers
        R4->>R3: Deliver hinted data
        R3-->>R4: ACK
        R4->>R4: Delete hint
    end
```

---

## Key Architectural Decisions

### Decision 1: Partitioning Strategy

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Consistent Hashing** | Hash key to position on ring | Even distribution, minimal rebalancing | No range queries |
| Range Partitioning | Split by key ranges | Range queries, locality | Hot spots, complex splits |
| Hash Slots (Redis) | Fixed 16384 slots | Predictable, easy migration | Manual slot management |

**Decision: Consistent Hashing with Virtual Nodes**

*Rationale:*
- Uniform distribution of data across nodes
- Adding/removing nodes affects minimal data (~1/N)
- Virtual nodes (100-256 per physical) smooth out variance
- No single coordinator for partition assignment

### Decision 2: Replication Strategy

| Option | Description | Consistency | Latency | Availability |
|--------|-------------|-------------|---------|--------------|
| Synchronous | Wait for all replicas | Strong | High | Lower |
| Asynchronous | Fire-and-forget | Eventual | Low | High |
| **Quorum (N,R,W)** | Wait for majority | Tunable | Medium | High |
| Chain Replication | Sequential through chain | Strong | Medium | Medium |

**Decision: Quorum-based with Sloppy Quorum**

```
Default configuration: N=3, R=2, W=2

Consistency guarantee: R + W > N → 2 + 2 > 3 ✓
  - At least one node in read set has latest write

Sloppy quorum:
  - During failures, write to any N healthy nodes
  - Use hinted handoff to recover original replicas
```

### Decision 3: Consistency Model

| Model | Implementation | Trade-off |
|-------|----------------|-----------|
| **Strong (CP)** | Raft/Paxos, single leader | High latency, may reject during partition |
| **Eventual (AP)** | Async replication | Low latency, may return stale |
| **Tunable** | Configurable R, W per request | Flexibility, complexity |

**Decision: Tunable Consistency (Dynamo-style)**

```yaml
Consistency levels:
  ONE:
    reads: Return from any replica
    writes: Ack from any replica
    use_case: Maximum speed, eventual consistency

  QUORUM:
    reads: Return from R replicas (majority)
    writes: Ack from W replicas (majority)
    use_case: Balanced consistency/availability

  ALL:
    reads: Return from all N replicas
    writes: Ack from all N replicas
    use_case: Strong consistency, lower availability

  LOCAL_QUORUM:
    reads: Quorum within local datacenter
    writes: Quorum within local datacenter
    use_case: Cross-DC deployments
```

### Decision 4: Conflict Resolution

| Option | Description | Data Loss Risk | Complexity |
|--------|-------------|----------------|------------|
| Last-Write-Wins (LWW) | Highest timestamp wins | Yes (silent) | Low |
| **Vector Clocks** | Track causality, detect conflicts | No (explicit) | Medium |
| CRDTs | Mathematically mergeable types | No | High |
| Application Resolution | Return all versions to client | No | Client complexity |

**Decision: Vector Clocks with LWW Fallback**

*Rationale:*
- Detect truly concurrent writes
- Return siblings to application when conflict detected
- Fall back to LWW for simple cases (client preference)

### Decision 5: Storage Engine

| Option | Description | Write Optimized | Read Optimized |
|--------|-------------|-----------------|----------------|
| **LSM Tree** | Append-only, periodic compaction | Yes | Medium (with bloom filters) |
| B-Tree | In-place updates | Medium | Yes |
| Hash Index | In-memory hash map | Yes | Yes (point queries only) |

**Decision: LSM Tree (RocksDB/LevelDB style)**

*Rationale:*
- Write-optimized for high write throughput
- Bloom filters accelerate reads
- Good compression ratios
- Industry proven (Cassandra, RocksDB)

---

## Multi-Datacenter Architecture

```mermaid
flowchart TB
    subgraph DC1["Datacenter 1 (US-East)"]
        subgraph Cluster1["Local Cluster"]
            N1A[Node A]
            N1B[Node B]
            N1C[Node C]
        end
        LB1[Load Balancer]
    end

    subgraph DC2["Datacenter 2 (US-West)"]
        subgraph Cluster2["Local Cluster"]
            N2A[Node A]
            N2B[Node B]
            N2C[Node C]
        end
        LB2[Load Balancer]
    end

    subgraph DC3["Datacenter 3 (EU)"]
        subgraph Cluster3["Local Cluster"]
            N3A[Node A]
            N3B[Node B]
            N3C[Node C]
        end
        LB3[Load Balancer]
    end

    Client1[US Users] --> LB1
    Client2[EU Users] --> LB3

    Cluster1 <-->|Async Replication| Cluster2
    Cluster2 <-->|Async Replication| Cluster3
    Cluster1 <-->|Async Replication| Cluster3

    Note1[Each DC has full copy<br/>LOCAL_QUORUM for low latency<br/>EACH_QUORUM for strong consistency]
```

### Cross-DC Consistency Options

| Level | Behavior | Latency | Use Case |
|-------|----------|---------|----------|
| LOCAL_ONE | Ack from 1 local node | Lowest | Reads only |
| LOCAL_QUORUM | Ack from local majority | Low | Most operations |
| EACH_QUORUM | Ack from majority in each DC | High | Critical writes |
| ALL | Ack from all nodes everywhere | Highest | Rarely used |

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| ✅ Sync vs Async | Async with quorum | Balance consistency and latency |
| ✅ Event-driven vs Request-response | Request-response | Simpler for KV operations |
| ✅ Push vs Pull | Pull (client requests) | Standard KV access pattern |
| ✅ Stateless vs Stateful | Stateful (data storage) | By definition |
| ✅ Read-heavy vs Write-heavy | Configurable (default read-heavy) | LSM + caching |
| ✅ Real-time vs Batch | Real-time | Low latency requirement |
| ✅ Centralized vs Decentralized | Decentralized | No SPOF, any node can serve |
| ✅ Leader vs Leaderless | Leaderless (Dynamo) | Higher availability |

---

## Request Routing Options

### Option 1: Client-Side Routing (Recommended)

```mermaid
flowchart LR
    Client[Client with SDK] --> |Knows topology| N1[Node 1]
    Client --> N2[Node 2]
    Client --> N3[Node 3]

    Note1[SDK maintains cluster map<br/>Direct routing to coordinator<br/>No extra hop]
```

**Pros:** Lowest latency, no single point of failure
**Cons:** SDK complexity, topology updates needed

### Option 2: Proxy-Based Routing

```mermaid
flowchart LR
    Client --> Proxy[Proxy/Router]
    Proxy --> N1[Node 1]
    Proxy --> N2[Node 2]
    Proxy --> N3[Node 3]

    Note1[Proxy handles routing<br/>Simple clients<br/>Extra network hop]
```

**Pros:** Simple clients, centralized routing logic
**Cons:** Extra hop, proxy can be bottleneck

### Option 3: Any-Node Routing (Cassandra-style)

```mermaid
flowchart LR
    Client --> N1[Node 1<br/>Coordinator]
    N1 --> N2[Node 2]
    N1 --> N3[Node 3]

    Note1[Any node can coordinate<br/>May require forwarding<br/>Simple client]
```

**Pros:** Simple client, any node as entry point
**Cons:** May forward requests (extra hop for some keys)

---

## Component Interaction Diagram

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer"]
        App[Application]
        SDK[Client SDK]
    end

    subgraph CoordinatorLayer["Coordinator Layer (on each node)"]
        Router[Request Router]
        Consist[Consistency Manager]
        Conflict[Conflict Resolver]
    end

    subgraph StorageLayer["Storage Layer"]
        MemT[MemTable]
        WAL[Write-Ahead Log]
        SST[SSTables]
        Bloom[Bloom Filters]
        Cache[Block Cache]
    end

    subgraph ReplicationLayer["Replication Layer"]
        HH[Hinted Handoff]
        RR[Read Repair]
        AE[Anti-Entropy]
        Merkle[Merkle Trees]
    end

    subgraph MembershipLayer["Membership Layer"]
        Gossip[Gossip Protocol]
        FD[Failure Detector]
        Ring[Token Ring]
    end

    App --> SDK
    SDK --> Router
    Router --> Consist
    Consist --> Conflict

    Router --> MemT
    MemT --> WAL
    MemT --> SST
    SST --> Bloom
    SST --> Cache

    Consist --> HH
    Consist --> RR
    RR --> AE
    AE --> Merkle

    Router --> Gossip
    Gossip --> FD
    FD --> Ring
```

---

## Summary: High-Level Architecture

| Aspect | Choice | Alternative Considered |
|--------|--------|----------------------|
| **Topology** | Decentralized P2P | Master-slave |
| **Partitioning** | Consistent hashing + vnodes | Range partitioning |
| **Replication** | Quorum (N=3, R=2, W=2) | Synchronous, chain |
| **Consistency** | Tunable per-request | Fixed strong/eventual |
| **Conflict Resolution** | Vector clocks | LWW only |
| **Storage** | LSM Tree | B-Tree |
| **Routing** | Client-side aware | Proxy-based |
| **Failure Handling** | Sloppy quorum + hinted handoff | Strict quorum |
