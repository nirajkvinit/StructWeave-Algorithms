# High-Level Design

[← Back to Index](./00-index.md)

---

## The Hash Ring Concept

### Core Idea

Consistent hashing maps both **keys** and **nodes** onto a circular hash space (the "ring"). The ring represents all possible hash values from 0 to 2^32-1 (or 2^64-1), arranged in a circle where the maximum value wraps around to 0.

```mermaid
flowchart TB
    subgraph Ring["Hash Ring (0 to 2³²-1)"]
        direction LR
        H0["0"]
        H25["2³⁰<br/>(25%)"]
        H50["2³¹<br/>(50%)"]
        H75["3×2³⁰<br/>(75%)"]
    end

    subgraph Nodes["Nodes on Ring"]
        NA["Node A<br/>pos: 15%"]
        NB["Node B<br/>pos: 45%"]
        NC["Node C<br/>pos: 80%"]
    end

    subgraph Keys["Keys Mapped"]
        K1["key1<br/>hash: 10%"]
        K2["key2<br/>hash: 30%"]
        K3["key3<br/>hash: 60%"]
    end

    K1 -->|"Clockwise to"| NA
    K2 -->|"Clockwise to"| NB
    K3 -->|"Clockwise to"| NC
```

### Key Assignment Rule

**A key is assigned to the first node encountered when walking CLOCKWISE from the key's hash position.**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HASH RING VISUALIZATION                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                              0 (top)                                 │
│                                │                                     │
│                           ┌────┴────┐                               │
│                      ────/    [A]    \────        Node A at 10%     │
│                    /                      \                          │
│                  /                          \                        │
│                /                              \                      │
│               │                                │                     │
│          [C]  │                                │  [B]                │
│   Node C ─────│                                │───── Node B         │
│   at 75%      │                                │      at 40%        │
│               │                                │                     │
│                \                              /                      │
│                  \                          /                        │
│                    \                      /                          │
│                      ────\          /────                           │
│                           └────┬────┘                               │
│                                │                                     │
│                           (50% - bottom)                            │
│                                                                      │
│  Key Assignment:                                                     │
│  • key "user:123" hashes to 5%   → walks to A (first node ≥ 5%)    │
│  • key "order:456" hashes to 25% → walks to B (first node ≥ 25%)   │
│  • key "product:789" hashes to 50% → walks to C (first node ≥ 50%) │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Why the Ring Works: Minimal Disruption

### Adding a Node

When a new node joins, it only takes keys from its immediate predecessor's range.

```mermaid
flowchart LR
    subgraph Before["Before: 3 Nodes"]
        B1["A: 0-33%<br/>B: 34-66%<br/>C: 67-100%"]
    end

    subgraph After["After: Add Node D at 50%"]
        A1["A: 0-33%<br/>B: 34-50%<br/>D: 51-66% ⬅ NEW<br/>C: 67-100%"]
    end

    Before -->|"Add D"| After

    Note1["Only keys 51-66%<br/>move from B to D<br/>(~16% of total)"]
```

### Removing a Node

When a node leaves, its keys move to its successor.

```mermaid
flowchart LR
    subgraph Before2["Before: 4 Nodes"]
        B2["A: 0-25%<br/>B: 26-50%<br/>C: 51-75%<br/>D: 76-100%"]
    end

    subgraph After2["After: Remove Node B"]
        A2["A: 0-25%<br/>C: 26-75% ⬅ Gets B's keys<br/>D: 76-100%"]
    end

    Before2 -->|"Remove B"| After2

    Note2["Only B's keys<br/>move to C<br/>(~25% of total)"]
```

### Mathematical Proof of Minimal Disruption

```
Given:
  - N nodes in the ring
  - K total keys
  - Each node owns approximately K/N keys

When adding 1 node:
  - New node takes a portion from 1 successor
  - Keys moved ≈ K/N (from one node's range)
  - Fraction moved = (K/N) / K = 1/N

When removing 1 node:
  - Removed node's keys go to 1 successor
  - Keys moved = K/N (exactly one node's keys)
  - Fraction moved = 1/N

Compare to Modulo Hashing:
  - Changing from N to N+1 nodes
  - hash(key) % N → hash(key) % (N+1)
  - Almost ALL keys change assignment
  - Fraction moved ≈ (N-1)/N ≈ 1 - 1/N

Example (N = 100 nodes, K = 1M keys):
  Consistent Hashing: ~10,000 keys move (1%)
  Modulo Hashing: ~990,000 keys move (99%)
```

---

## Virtual Nodes (VNodes)

### The Problem with Basic Consistent Hashing

With only one position per node, key distribution can be highly uneven:

```
┌─────────────────────────────────────────────────────────────────────┐
│  PROBLEM: 3 Nodes with Single Positions                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Ring positions (random hash values):                                │
│    Node A: 10%                                                       │
│    Node B: 15%    ← A and B are close together!                     │
│    Node C: 80%                                                       │
│                                                                      │
│  Key Distribution:                                                   │
│    Node A: keys in range [80%, 10%]  = 30% of keys                  │
│    Node B: keys in range [10%, 15%]  = 5% of keys   ← UNFAIR!       │
│    Node C: keys in range [15%, 80%]  = 65% of keys  ← OVERLOADED!   │
│                                                                      │
│  With 1M total keys:                                                 │
│    Node A: 300,000 keys                                              │
│    Node B: 50,000 keys   (6x less than C!)                          │
│    Node C: 650,000 keys                                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### The Solution: Virtual Nodes

Each physical node is represented by multiple positions (virtual nodes) on the ring:

```mermaid
flowchart TB
    subgraph Physical["Physical Nodes"]
        PA["Server A<br/>(16 GB RAM)"]
        PB["Server B<br/>(16 GB RAM)"]
        PC["Server C<br/>(8 GB RAM)"]
    end

    subgraph Virtual["Virtual Nodes on Ring"]
        VA1["A-v1<br/>pos: 5%"]
        VA2["A-v2<br/>pos: 35%"]
        VA3["A-v3<br/>pos: 72%"]

        VB1["B-v1<br/>pos: 18%"]
        VB2["B-v2<br/>pos: 55%"]
        VB3["B-v3<br/>pos: 88%"]

        VC1["C-v1<br/>pos: 42%"]
        VC2["C-v2<br/>pos: 95%"]
    end

    PA --> VA1 & VA2 & VA3
    PB --> VB1 & VB2 & VB3
    PC --> VC1 & VC2
```

### Virtual Node Distribution

```
┌─────────────────────────────────────────────────────────────────────┐
│  VIRTUAL NODES: Even Distribution                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  With V=150 virtual nodes per physical node:                         │
│                                                                      │
│  Ring (simplified view):                                             │
│  0%────────────────────────────────────────────────────────────100% │
│  │A│B│C│A│B│C│A│B│C│A│B│C│A│B│C│A│B│C│...│A│B│C│A│B│C│             │
│                                                                      │
│  Each physical node's virtual nodes are spread across the ring,     │
│  creating roughly equal-sized segments.                              │
│                                                                      │
│  Statistical Effect:                                                 │
│  - With 3 nodes × 150 vnodes = 450 positions                        │
│  - Average segment size = 100% / 450 ≈ 0.22% of ring                │
│  - Each physical node owns ~33.3% ± small variance                  │
│                                                                      │
│  Distribution Quality vs VNode Count:                                │
│  ┌────────────┬─────────────────────────────────────┐               │
│  │ VNodes     │ Standard Deviation (% of mean)      │               │
│  ├────────────┼─────────────────────────────────────┤               │
│  │ 1          │ 50-100%  (highly variable)          │               │
│  │ 50         │ ~14%                                │               │
│  │ 150        │ ~8%                                 │               │
│  │ 500        │ ~4%                                 │               │
│  └────────────┴─────────────────────────────────────┘               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Weighted Virtual Nodes for Heterogeneous Capacity

```mermaid
flowchart LR
    subgraph Servers["Physical Servers"]
        S1["Server 1<br/>32 GB RAM<br/>Weight: 2"]
        S2["Server 2<br/>16 GB RAM<br/>Weight: 1"]
        S3["Server 3<br/>16 GB RAM<br/>Weight: 1"]
    end

    subgraph VNodes["Virtual Node Allocation"]
        V1["S1: 300 vnodes<br/>(50% of ring)"]
        V2["S2: 150 vnodes<br/>(25% of ring)"]
        V3["S3: 150 vnodes<br/>(25% of ring)"]
    end

    S1 --> V1
    S2 --> V2
    S3 --> V3
```

---

## Data Flow: Key Lookup

### Lookup Process

```mermaid
sequenceDiagram
    participant Client
    participant HashRing as Hash Ring (Local)
    participant Node as Target Node

    Client->>Client: key = "user:12345"
    Client->>HashRing: GetNode(key)

    Note over HashRing: 1. Compute hash(key)
    Note over HashRing: 2. Binary search for<br/>first position ≥ hash
    Note over HashRing: 3. Map position → node

    HashRing-->>Client: Node B

    Client->>Node: GET user:12345
    Node-->>Client: {data}
```

### Lookup with Replication

```mermaid
sequenceDiagram
    participant Client
    participant Ring as Hash Ring
    participant N1 as Node B (Primary)
    participant N2 as Node C (Replica 1)
    participant N3 as Node A (Replica 2)

    Client->>Ring: GetNNodes(key, 3)

    Note over Ring: Walk clockwise from<br/>key position, collect<br/>3 distinct physical nodes

    Ring-->>Client: [B, C, A]

    par Write to all replicas
        Client->>N1: PUT(key, value)
        Client->>N2: PUT(key, value)
        Client->>N3: PUT(key, value)
    end

    N1-->>Client: OK
    N2-->>Client: OK
    N3-->>Client: OK
```

---

## Replication Using the Ring

### Preference List (Dynamo-style)

The ring naturally provides a **preference list** for replication:

```
┌─────────────────────────────────────────────────────────────────────┐
│  PREFERENCE LIST FOR KEY                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Given: Replication factor N = 3                                     │
│                                                                      │
│  For key "user:123":                                                 │
│    1. Hash key → position 25% on ring                               │
│    2. Walk clockwise to find first node: B (at 30%)                 │
│    3. Continue walking for N-1 more PHYSICAL nodes: C, A            │
│    4. Preference list = [B, C, A]                                   │
│                                                                      │
│  Ring:                                                               │
│    [A-v1]───[key]───[B-v2]───[C-v1]───[B-v1]───[A-v2]───[C-v2]     │
│      10%     25%      30%      45%      60%      75%      90%       │
│                                                                      │
│  Note: Skip B-v1 because B is already in list (only physical nodes) │
│                                                                      │
│  Read/Write Quorum:                                                  │
│    - Write to W nodes (e.g., W=2)                                   │
│    - Read from R nodes (e.g., R=2)                                  │
│    - Where R + W > N for consistency                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Zone-Aware Replica Selection

```mermaid
flowchart TB
    subgraph Ring["Hash Ring"]
        K["Key Position"]
    end

    subgraph Zone1["Zone A"]
        A1["Node A1"]
        A2["Node A2"]
    end

    subgraph Zone2["Zone B"]
        B1["Node B1"]
        B2["Node B2"]
    end

    subgraph Zone3["Zone C"]
        C1["Node C1"]
        C2["Node C2"]
    end

    K -->|"1st replica"| A1
    K -->|"2nd replica<br/>(skip A2, same zone)"| B1
    K -->|"3rd replica<br/>(skip B2, same zone)"| C1

    Note["For N=3 replicas across zones:<br/>Skip nodes until different zone found"]
```

---

## Comparison: Alternative Partitioning Strategies

### Modulo Hashing vs Consistent Hashing

```mermaid
flowchart TB
    subgraph Modulo["Modulo Hashing"]
        M1["hash(key) % N"]
        M2["Simple: O(1)"]
        M3["❌ Catastrophic on resize"]
        M4["❌ ~100% keys move"]
    end

    subgraph Consistent["Consistent Hashing"]
        C1["Ring + Clockwise"]
        C2["Lookup: O(log N)"]
        C3["✓ Minimal disruption"]
        C4["✓ ~1/N keys move"]
    end
```

### Consistent Hashing vs Hash Slots (Redis)

| Aspect | Consistent Hashing | Hash Slots (Redis) |
|--------|-------------------|-------------------|
| **Approach** | Continuous ring, vnodes | Fixed 16,384 slots |
| **Slot Assignment** | Hash → ring position | CRC16(key) % 16384 |
| **Rebalancing** | Automatic with vnodes | Manual slot migration |
| **Flexibility** | Any number of nodes | Best with slot multiples |
| **Complexity** | Higher (ring management) | Lower (slot → node map) |
| **Used By** | Cassandra, Dynamo | Redis Cluster |

```
┌─────────────────────────────────────────────────────────────────────┐
│  REDIS HASH SLOTS                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Total Slots: 16,384 (fixed)                                        │
│                                                                      │
│  Slot Assignment (example with 3 nodes):                            │
│    Node A: slots 0-5460                                             │
│    Node B: slots 5461-10922                                         │
│    Node C: slots 10923-16383                                        │
│                                                                      │
│  Key Lookup:                                                         │
│    slot = CRC16(key) % 16384                                        │
│    node = slot_to_node_map[slot]                                    │
│                                                                      │
│  Adding Node D:                                                      │
│    Manually migrate slots from A, B, C to D                         │
│    e.g., D gets slots 0-1000, 5461-6461, 10923-11923               │
│                                                                      │
│  Trade-off: More predictable, but requires manual rebalancing       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Consistent Hashing vs Range Partitioning

| Aspect | Consistent Hashing | Range Partitioning |
|--------|-------------------|-------------------|
| **Key Distribution** | Hash-based (uniform) | Key-range based |
| **Range Queries** | Not supported | Efficient |
| **Hot Spots** | Less likely | Common (sequential keys) |
| **Rebalancing** | Hash-based | Split ranges |
| **Used By** | Cassandra, Dynamo | HBase, Bigtable |

---

## Node Membership Management

### Membership Protocol Options

```mermaid
flowchart TB
    subgraph Centralized["Option 1: Centralized"]
        Coord["Coordinator<br/>(ZooKeeper/etcd)"]
        CN1["Node 1"]
        CN2["Node 2"]
        CN3["Node 3"]

        Coord <--> CN1 & CN2 & CN3
    end

    subgraph Gossip["Option 2: Gossip Protocol"]
        GN1["Node 1"]
        GN2["Node 2"]
        GN3["Node 3"]
        GN4["Node 4"]

        GN1 <-.->|gossip| GN2
        GN2 <-.->|gossip| GN3
        GN3 <-.->|gossip| GN4
        GN4 <-.->|gossip| GN1
    end
```

### Membership View Consistency

```
┌─────────────────────────────────────────────────────────────────────┐
│  MEMBERSHIP VIEW CONSISTENCY                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Challenge: All nodes must agree on ring state for consistent       │
│             key-to-node mapping                                      │
│                                                                      │
│  Approaches:                                                         │
│                                                                      │
│  1. Strong Consistency (ZooKeeper/etcd)                             │
│     + All nodes see same ring at same time                          │
│     + No routing inconsistency                                       │
│     - Higher latency for membership changes                         │
│     - Dependency on coordination service                             │
│                                                                      │
│  2. Eventual Consistency (Gossip)                                   │
│     + Decentralized, no SPOF                                        │
│     + Scales to large clusters                                      │
│     - Temporary routing inconsistency during changes                │
│     - Requires handling of stale views                              │
│                                                                      │
│  3. Client-Side Caching with TTL                                    │
│     + Reduces coordination overhead                                  │
│     + Fast lookups from local ring                                  │
│     - Stale during TTL window                                       │
│     - Need cache invalidation on changes                            │
│                                                                      │
│  Production Choice: Gossip + request forwarding for stale views     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| ✅ Hash Function | MD5/xxHash/MurmurHash | Uniform distribution, deterministic |
| ✅ Ring Size | 2^32 | Standard, sufficient for all practical scales |
| ✅ Virtual Nodes | 150-200 per physical node | Balance distribution vs memory |
| ✅ Lookup Structure | Sorted array | Simple, fast binary search |
| ✅ Replication | Clockwise N nodes | Natural preference list |
| ✅ Membership | Gossip + forwarding | Scalable, handles inconsistency |
| ✅ Weighted Nodes | VNode count proportional | Support heterogeneous capacity |

---

## Key Architectural Decisions

### Decision 1: Hash Function Selection

| Option | Speed | Distribution | Compatibility | Recommendation |
|--------|-------|--------------|---------------|----------------|
| MD5 | Medium | Excellent | High (Ketama) | **Interoperability** |
| xxHash | Very Fast | Excellent | Lower | **Performance critical** |
| MurmurHash3 | Fast | Excellent | Medium | General purpose |
| CRC32 | Very Fast | Good | High | Redis compatibility |

**Recommendation:** xxHash for new systems, MD5/Ketama for Memcached compatibility.

### Decision 2: Virtual Node Count

| Nodes | Recommended VNodes | Memory | Distribution Quality |
|-------|-------------------|--------|---------------------|
| < 10 | 200-500 | ~100 KB | Excellent required |
| 10-100 | 150-200 | ~1-3 MB | Good balance |
| 100-1000 | 100-150 | ~15-30 MB | Acceptable |
| > 1000 | 50-100 | Memory concern | Statistical averaging helps |

**Recommendation:** 150 vnodes for most deployments.

### Decision 3: Ring Data Structure

| Option | Lookup | Insert/Delete | Memory | Recommendation |
|--------|--------|---------------|--------|----------------|
| Sorted Array | O(log n) | O(n) | Compact | **Stable membership** |
| Red-Black Tree | O(log n) | O(log n) | Higher | Frequent changes |
| Skip List | O(log n) | O(log n) | Higher | Concurrent access |

**Recommendation:** Sorted array (membership changes are infrequent).

---

## Integration Points

### Where Consistent Hashing Fits

```mermaid
flowchart TB
    subgraph Application["Application Layer"]
        App["Application Code"]
    end

    subgraph Routing["Routing Layer"]
        LB["Load Balancer"]
        Ring["Consistent Hash Ring"]
    end

    subgraph Data["Data Layer"]
        N1["Node 1"]
        N2["Node 2"]
        N3["Node 3"]
    end

    App --> LB
    LB --> Ring
    Ring --> N1 & N2 & N3
```

### Common Integration Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| **Client-side** | Ring in application | Memcached clients |
| **Proxy-side** | Ring in proxy layer | Mcrouter, Twemproxy |
| **Embedded** | Ring in database nodes | Cassandra, Riak |
| **Load Balancer** | Ring in LB | Envoy, HAProxy |
