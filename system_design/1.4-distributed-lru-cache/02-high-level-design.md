# High-Level Design

[← Back to Index](./00-index.md)

---

## System Architecture

### Overview Diagram

```mermaid
flowchart TB
    subgraph Clients["Application Layer"]
        App1[App Server 1]
        App2[App Server 2]
        App3[App Server N]
    end

    subgraph CacheProxy["Cache Proxy Layer (Optional)"]
        Proxy1[Mcrouter/Twemproxy]
        Proxy2[Mcrouter/Twemproxy]
    end

    subgraph CacheLayer["Distributed Cache Cluster"]
        subgraph ZoneA["Availability Zone A"]
            CA1[Cache Node A1<br/>Shards 0-33%]
            CA2[Cache Node A2<br/>Shards 34-66%]
            CA3[Cache Node A3<br/>Shards 67-100%]
        end

        subgraph ZoneB["Availability Zone B"]
            CB1[Cache Node B1<br/>Replica]
            CB2[Cache Node B2<br/>Replica]
            CB3[Cache Node B3<br/>Replica]
        end

        subgraph ZoneC["Availability Zone C"]
            CC1[Cache Node C1<br/>Replica]
            CC2[Cache Node C2<br/>Replica]
            CC3[Cache Node C3<br/>Replica]
        end
    end

    subgraph Backend["Storage Layer"]
        DB[(Primary Database)]
        ReadReplica[(Read Replicas)]
    end

    App1 & App2 & App3 --> Proxy1 & Proxy2
    Proxy1 & Proxy2 --> CacheLayer

    CA1 -.->|Async Replication| CB1 & CC1
    CA2 -.->|Async Replication| CB2 & CC2
    CA3 -.->|Async Replication| CB3 & CC3

    CacheLayer -->|Cache Miss| Backend
```

### Component Responsibilities

| Component | Responsibility | Scaling Strategy |
|-----------|---------------|------------------|
| **Application Servers** | Business logic, cache-aside implementation | Horizontal, stateless |
| **Cache Proxy (Optional)** | Connection pooling, routing, failover | Horizontal, stateless |
| **Cache Nodes** | Store cached data, handle get/set/delete | Horizontal, add nodes |
| **Database** | Source of truth, handle cache misses | Vertical + read replicas |

---

## Consistent Hashing with Virtual Nodes

### Hash Ring Concept

```mermaid
flowchart TB
    subgraph Ring["Hash Ring (0 to 2^32-1)"]
        direction TB
        P0["Position 0°<br/>Node A (v1)"]
        P45["Position 45°<br/>Node C (v2)"]
        P90["Position 90°<br/>Node B (v1)"]
        P135["Position 135°<br/>Node A (v2)"]
        P180["Position 180°<br/>Node C (v1)"]
        P225["Position 225°<br/>Node B (v2)"]
        P270["Position 270°<br/>Node A (v3)"]
        P315["Position 315°<br/>Node B (v3)"]
    end

    Key1["Key: user:123<br/>Hash: 0x1A3F..."]
    Key2["Key: product:456<br/>Hash: 0x8B2C..."]

    Key1 -->|"Clockwise to<br/>next node"| P45
    Key2 -->|"Clockwise to<br/>next node"| P180
```

### Virtual Node Distribution

```
┌─────────────────────────────────────────────────────────────┐
│              VIRTUAL NODES ON HASH RING                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Physical Node A (128 virtual nodes):                        │
│  ├── A-v0   at position 0x0000...                           │
│  ├── A-v1   at position 0x00FF...                           │
│  ├── A-v2   at position 0x01FE...                           │
│  └── ...    (128 positions spread across ring)              │
│                                                              │
│  Physical Node B (128 virtual nodes):                        │
│  ├── B-v0   at position 0x0080...                           │
│  ├── B-v1   at position 0x017F...                           │
│  └── ...                                                     │
│                                                              │
│  Benefits:                                                   │
│  ✓ Even distribution of keys                                 │
│  ✓ Smooth rebalancing on node add/remove                     │
│  ✓ Heterogeneous nodes (more vnodes for larger nodes)        │
│  ✓ Better failure distribution                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Lookup Algorithm

```mermaid
flowchart LR
    Key[Key: product:123] --> Hash[Hash Function<br/>MD5/Ketama]
    Hash --> Position[Ring Position<br/>0x3F7A2B1C]
    Position --> Search[Binary Search<br/>Clockwise]
    Search --> Node[Target Node<br/>Node B-v47]
    Node --> Physical[Physical Node B]
```

---

## Data Flow Patterns

### Cache-Aside Pattern (Read Path)

```mermaid
sequenceDiagram
    participant App as Application
    participant Cache as Cache Cluster
    participant DB as Database

    App->>Cache: GET(product:123)

    alt Cache Hit
        Cache-->>App: {name: "Widget", price: 29.99}
        Note over App: Return to user (< 1ms)
    else Cache Miss
        Cache-->>App: NOT_FOUND
        App->>DB: SELECT * FROM products WHERE id=123
        DB-->>App: {name: "Widget", price: 29.99}
        App->>Cache: SET(product:123, data, TTL=3600)
        Cache-->>App: OK
        Note over App: Return to user (10-50ms)
    end
```

### Cache-Aside Pattern (Write Path)

```mermaid
sequenceDiagram
    participant App as Application
    participant Cache as Cache Cluster
    participant DB as Database

    App->>DB: UPDATE products SET price=34.99 WHERE id=123
    DB-->>App: OK (1 row affected)

    alt Invalidation Strategy
        App->>Cache: DELETE(product:123)
        Cache-->>App: OK
        Note over Cache: Next read will fetch fresh data
    else Write-Through Strategy
        App->>Cache: SET(product:123, updated_data, TTL=3600)
        Cache-->>App: OK
        Note over Cache: Cache immediately consistent
    end
```

### Write-Through vs Write-Behind Comparison

```mermaid
flowchart TB
    subgraph WriteThrough["Write-Through Pattern"]
        WT1[Application] -->|1. Write| WT2[Cache]
        WT2 -->|2. Sync Write| WT3[Database]
        WT3 -->|3. Confirm| WT2
        WT2 -->|4. Confirm| WT1
    end

    subgraph WriteBehind["Write-Behind Pattern"]
        WB1[Application] -->|1. Write| WB2[Cache]
        WB2 -->|2. Confirm| WB1
        WB2 -->|3. Async Queue| WB3[Write Buffer]
        WB3 -->|4. Batch Write| WB4[Database]
    end
```

| Pattern | Latency | Consistency | Data Loss Risk | Use Case |
|---------|---------|-------------|----------------|----------|
| **Write-Through** | Higher (sync DB write) | Strong | None | Critical data |
| **Write-Behind** | Lower (async) | Eventual | Yes (buffer loss) | High write throughput |
| **Invalidation** | Lowest | Eventual | None | General purpose |

---

## Replication Architecture

### Leader-Follower Model (Per Shard)

```mermaid
flowchart TB
    subgraph Shard1["Shard 1 (Keys 0-33%)"]
        L1[Leader<br/>Zone A]
        F1A[Follower<br/>Zone B]
        F1B[Follower<br/>Zone C]

        L1 -->|Async Replication| F1A
        L1 -->|Async Replication| F1B
    end

    Write[Write Request] -->|All writes to leader| L1

    Read1[Read Request<br/>Zone A] -->|Prefer local| L1
    Read2[Read Request<br/>Zone B] -->|Prefer local| F1A
    Read3[Read Request<br/>Zone C] -->|Prefer local| F1B
```

### Replication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Leader as Leader (Zone A)
    participant F1 as Follower (Zone B)
    participant F2 as Follower (Zone C)

    Client->>Leader: SET(key, value)
    Leader->>Leader: Store in memory
    Leader-->>Client: OK (acknowledged)

    par Async Replication
        Leader->>F1: Replicate(key, value)
        F1-->>Leader: ACK
    and
        Leader->>F2: Replicate(key, value)
        F2-->>Leader: ACK
    end

    Note over Leader,F2: Replication lag: 1-10ms typically
```

### Zone-Aware Routing

```
┌─────────────────────────────────────────────────────────────┐
│                  ZONE-AWARE ROUTING                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Read Preference Order:                                      │
│  1. Local zone replica (lowest latency)                      │
│  2. Same region, different zone                              │
│  3. Leader (if local unavailable)                            │
│  4. Any available replica                                    │
│                                                              │
│  Write Routing:                                              │
│  1. Always to shard leader                                   │
│  2. Leader determined by consistent hash                     │
│  3. Failover to new leader on failure                        │
│                                                              │
│  Example (User in Zone B):                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GET(key) → hash(key) → Shard 2                      │   │
│  │  Shard 2 replicas: Zone A (leader), Zone B, Zone C   │   │
│  │  Preference: Zone B (local) → Zone A → Zone C        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Architectural Decisions

### Decision 1: Partitioning Strategy

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Consistent Hashing + Virtual Nodes** | Hash to ring position, walk clockwise | Even distribution, smooth scaling | Implementation complexity |
| Hash Slots (Redis-style) | Fixed 16384 slots, CRC16 mod | Predictable, explicit management | Manual slot migration |
| Client-side Sharding | Client computes target node | Simple servers | Client complexity, no auto-rebalance |
| Range Partitioning | Key ranges to nodes | Range queries possible | Uneven distribution |

**Recommendation:** Consistent hashing with 128-256 virtual nodes per physical node.

**Rationale:**
- Automatic rebalancing when nodes added/removed
- Only K/N keys move on topology change (K=keys, N=nodes)
- Virtual nodes ensure even distribution
- Industry proven (EVCache, Dynamo)

### Decision 2: Replication Strategy

| Option | Consistency | Availability | Complexity |
|--------|-------------|--------------|------------|
| **No Replication** | N/A | Low (node failure = data loss) | Lowest |
| **Leader-Follower (Async)** | Eventual | High | Medium |
| Leader-Follower (Sync) | Strong | Medium | High |
| Multi-Master | Eventual (conflicts) | Highest | Highest |

**Recommendation:** Leader-follower with asynchronous replication.

**Rationale:**
- Async replication doesn't block writes
- Followers provide read scaling and failover
- Acceptable for cache (stale data OK)
- Netflix EVCache uses this model

### Decision 3: Cache Invalidation Strategy

| Strategy | Implementation | Consistency | Latency Impact |
|----------|----------------|-------------|----------------|
| **TTL Only** | Set expiration on write | Eventual (TTL window) | None |
| **Explicit Invalidation** | DELETE on data change | Near-immediate | Extra round trip |
| **Event-Driven** | Subscribe to DB changes | Near-immediate | Background process |
| **Write-Through** | Update cache on write | Immediate | Write latency |

**Recommendation:** TTL-based with event-driven invalidation for critical data.

**Rationale:**
- TTL provides baseline consistency
- Event-driven catches critical updates faster
- No write latency impact
- Handles missed events gracefully (TTL fallback)

### Decision 4: Client Connection Model

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Direct Connection** | Client connects to each cache node | Lowest latency | Connection explosion |
| **Proxy Layer** | Mcrouter/Twemproxy in front | Connection pooling, failover | Extra hop |
| **Sidecar Proxy** | Per-app proxy (service mesh) | Isolation, observability | Resource overhead |

**Recommendation:** Proxy layer (Mcrouter) for large deployments, direct for smaller.

**Rationale:**
- Proxy handles connection pooling (10K clients × 30 nodes = 300K connections vs 10K)
- Automatic failover and retries
- Request routing and load balancing
- Single point for observability

---

## Architecture Pattern Checklist

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| ✅ Sync vs Async | Sync for client requests, async for replication | Latency for reads, throughput for replication |
| ✅ Event-driven vs Request-response | Request-response for cache ops | Cache operations are synchronous by nature |
| ✅ Push vs Pull | Pull (cache-aside) | Application controls caching logic |
| ✅ Stateful vs Stateless | Stateful (cache nodes hold data) | By definition - cache stores data |
| ✅ Read-heavy optimization | Read from any replica | 99:1 read-write ratio |
| ✅ Real-time vs Batch | Real-time | Sub-millisecond latency required |
| ✅ Edge vs Origin | Origin (centralized cache cluster) | Shared cache for all app servers |

---

## Integration Points

### Upstream Dependencies (Cache Clients)

| Consumer | Protocol | Usage Pattern |
|----------|----------|---------------|
| Web Application | TCP (Memcached/Redis protocol) | Cache-aside reads |
| API Gateway | TCP | Response caching |
| Background Workers | TCP | Pre-warming, invalidation |
| Admin Console | HTTP/gRPC | Stats, flush operations |

### Downstream Dependencies

| Dependency | Protocol | Failure Impact |
|------------|----------|----------------|
| Database | SQL/NoSQL | Cache misses go to DB |
| Service Discovery | DNS/Consul | Node discovery |
| Monitoring | Prometheus/StatsD | No functional impact |
| Config Service | HTTP | Topology updates |

---

## Failure Modes and Mitigation

### Node Failure

```mermaid
flowchart TB
    subgraph Before["Before Failure"]
        N1[Node A<br/>Keys 0-33%]
        N2[Node B<br/>Keys 34-66%]
        N3[Node C<br/>Keys 67-100%]
    end

    subgraph During["Node B Fails"]
        N1A[Node A<br/>Keys 0-33%]
        N2A[Node B<br/>❌ DOWN]
        N3A[Node C<br/>Keys 67-100%]
    end

    subgraph After["After Redistribution"]
        N1B[Node A<br/>Keys 0-50%]
        N3B[Node C<br/>Keys 51-100%]
    end

    Before -->|"Node B<br/>crashes"| During
    During -->|"Consistent hashing<br/>redistributes"| After
```

| Failure | Detection | Mitigation | Impact |
|---------|-----------|------------|--------|
| Single node | Health check (5s) | Failover to replica | Temporary misses for node's keys |
| Availability zone | Multiple node failures | Route to other zones | Higher latency, full availability |
| Network partition | Timeout, gossip | Serve stale from local | Eventual consistency |
| Full cluster | All nodes down | Fall back to database | High DB load, degraded latency |

### Mitigation Strategies

```
┌─────────────────────────────────────────────────────────────┐
│                  FAILURE MITIGATION LAYERS                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Connection Retry                                   │
│  ├── Retry with exponential backoff                         │
│  ├── Max 3 retries, 100ms base delay                        │
│  └── Circuit breaker after 5 failures                       │
│                                                              │
│  Layer 2: Replica Failover                                   │
│  ├── Automatic failover to zone replica                     │
│  ├── Leader election via gossip/consensus                   │
│  └── Typical failover time: 1-5 seconds                     │
│                                                              │
│  Layer 3: Graceful Degradation                              │
│  ├── Return stale data if available                         │
│  ├── Serve from remaining nodes (partial cache)             │
│  └── Fall through to database                               │
│                                                              │
│  Layer 4: Database Protection                               │
│  ├── Rate limiting on cache miss path                       │
│  ├── Request coalescing (single-flight)                     │
│  └── Circuit breaker to database                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Deployment Topology Options

### Option 1: Single Region, Multi-AZ (Recommended Start)

```mermaid
flowchart TB
    subgraph Region["US-East Region"]
        subgraph AZ1["AZ-1"]
            C1[Cache 1-3]
            App1[App Servers]
        end
        subgraph AZ2["AZ-2"]
            C2[Cache 4-6]
            App2[App Servers]
        end
        subgraph AZ3["AZ-3"]
            C3[Cache 7-9]
            App3[App Servers]
        end
    end

    App1 --> C1 & C2 & C3
    App2 --> C1 & C2 & C3
    App3 --> C1 & C2 & C3
```

**Pros:** Low latency, simpler operations, cost-effective
**Cons:** Single region failure affects all users

### Option 2: Multi-Region with Regional Caches

```mermaid
flowchart TB
    subgraph USEast["US-East"]
        UE_Cache[Cache Cluster]
        UE_DB[(Primary DB)]
    end

    subgraph USWest["US-West"]
        UW_Cache[Cache Cluster]
        UW_DB[(Read Replica)]
    end

    subgraph EU["EU-West"]
        EU_Cache[Cache Cluster]
        EU_DB[(Read Replica)]
    end

    UE_DB -->|Replication| UW_DB & EU_DB
    UE_Cache -.->|Invalidation Events| UW_Cache & EU_Cache
```

**Pros:** Global availability, local latency
**Cons:** Cross-region consistency complexity, higher cost

### Deployment Comparison

| Aspect | Single Region Multi-AZ | Multi-Region |
|--------|----------------------|--------------|
| Latency | 1-2ms same region | 1-2ms local, 50-200ms cross-region |
| Availability | 99.99% | 99.999% |
| Consistency | Strong within region | Eventual across regions |
| Cost | $$ | $$$$ |
| Complexity | Medium | High |
| Use case | Most applications | Global, zero-downtime required |
