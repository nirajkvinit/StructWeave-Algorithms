# Distributed LRU Cache - System Design

## System Overview

A **Distributed LRU Cache** is a high-performance, in-memory data layer that accelerates read-heavy applications by storing frequently accessed data closer to compute. Unlike persistent storage systems, it coordinates eviction policies across distributed nodes, maintains eventual consistency, and protects backend systems from traffic spikes through stampede prevention mechanisms. The system is designed to be ephemeral—data loss through eviction is expected and acceptable.

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| Traffic Pattern | Extremely read-heavy (99:1 typical) | Optimize read path above all else |
| Latency Sensitivity | Critical (< 1ms target) | In-memory only, minimize network hops |
| Consistency Model | Eventual | Cache-aside pattern, TTL-based expiry |
| Availability Target | 99.99%+ | Cache must never be the bottleneck |
| Data Model | Key-value, ephemeral | No durability guarantees |
| State | Stateful (holds cached data) | Requires careful node management |
| Data Loss | Expected (eviction) | Differs fundamentally from KV stores |

---

## Complexity Rating

| Aspect | Rating | Justification |
|--------|--------|---------------|
| **Overall** | Medium-High | Combines distributed systems with memory management |
| Partitioning | Medium | Consistent hashing (standard) or hash slots (Redis-style) |
| Eviction Coordination | High | Local vs global LRU, memory pressure handling |
| Cache Invalidation | High | Multiple strategies with consistency trade-offs |
| Stampede Prevention | High | Requires locking or probabilistic approaches |
| Hot Key Handling | High | Single key can overwhelm a node |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data structures, APIs, algorithms |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Stampede prevention, hot keys, race conditions |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance |
| [06 - Security & Compliance](./06-security-and-compliance.md) | AuthN/AuthZ, encryption, threat model |
| [07 - Observability](./07-observability.md) | Metrics, logging, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trade-offs, trap questions |

---

## Eviction Policy Comparison

| Policy | Description | Hit Rate | Memory | Complexity | Best For |
|--------|-------------|----------|--------|------------|----------|
| **LRU** | Evict least recently used | Good | O(1) per entry | Low | General purpose, most workloads |
| **LFU** | Evict least frequently used | Better for skewed | Higher (counters) | Medium | Stable access patterns |
| **ARC** | Adaptive (LRU + LFU hybrid) | Best | 2x metadata | High | Variable access patterns |
| **Random** | Evict random entry | Acceptable | O(1) | Lowest | When simplicity matters |
| **TTL-only** | Evict expired entries | N/A | O(1) | Low | Time-sensitive data |

**Recommendation:** LRU for most use cases due to simplicity and good performance. Consider ARC for workloads with variable access patterns where hit rate is critical.

---

## Partitioning Strategy Comparison

| Strategy | Description | Pros | Cons | Used By |
|----------|-------------|------|------|---------|
| **Consistent Hashing** | Hash key to position on ring | Even distribution, graceful scaling | Implementation complexity | EVCache, Dynamo |
| **Consistent Hashing + Virtual Nodes** | Multiple positions per physical node | Better balance, handles heterogeneous nodes | More ring entries | Netflix EVCache |
| **Hash Slots** | Fixed 16384 slots, CRC16 mod | Predictable, easy migration | Manual slot management | Redis Cluster |
| **Client-side Sharding** | Client determines target node | Simple servers, no coordination | Client complexity, no rebalancing | Memcached |

**Recommendation:** Consistent hashing with virtual nodes (128-256 per node) for production systems. Provides automatic rebalancing and handles node failures gracefully.

---

## Caching Pattern Comparison

| Pattern | Description | Consistency | Latency | Complexity |
|---------|-------------|-------------|---------|------------|
| **Cache-Aside** | App manages cache reads/writes | Eventually consistent | Lowest read | Low |
| **Write-Through** | Write to cache + DB together | Strong | Higher write | Medium |
| **Write-Behind** | Write to cache, async to DB | Eventual | Lowest write | High (data loss risk) |
| **Read-Through** | Cache fetches on miss | Eventually consistent | Lowest read | Medium |
| **Refresh-Ahead** | Proactively refresh before expiry | Fresh data | Background work | Medium |

**Recommendation:** Cache-aside for most applications. Add event-driven invalidation for data requiring fresher consistency.

---

## Real-World Implementations

| System | Company | Architecture | Key Innovation | Scale |
|--------|---------|--------------|----------------|-------|
| **EVCache** | Netflix | Ketama hashing, multi-zone | Zone-aware replication, 3 copies | 22K servers, 400M ops/sec, 14 PB |
| **TAO** | Meta | Leader-follower, MySQL backend | Social graph optimized, 10-nines consistency | Billions reads/sec |
| **Redis Cluster** | Redis Labs | 16384 hash slots, gossip | Built-in clustering, Lua scripting | Millions ops/sec |
| **Memcached** | Various | Client-side sharding, slab allocator | Simplicity, raw speed | Foundation for many systems |
| **Mcrouter** | Meta | Memcached proxy | Connection pooling, routing | Trillions of requests/day |

---

## Key Trade-offs Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTED CACHE TRADE-OFFS                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Consistency ◄─────────────────────────────► Performance        │
│       │                                            │             │
│  Strong invalidation                    Best-effort TTL          │
│  Event-driven updates                   Fire-and-forget          │
│  Lower hit rate                         Higher hit rate          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Simplicity ◄──────────────────────────────► Hit Rate           │
│       │                                            │             │
│  LRU eviction                           ARC/LFU eviction         │
│  Single tier                            Multi-tier (L1/L2)       │
│  No replication                         Multi-zone replication   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Memory Cost ◄─────────────────────────────► Availability       │
│       │                                            │             │
│  Single copy                            3x replication           │
│  No hot standby                         Cross-zone replicas      │
│  Lower cost                             Higher availability      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## When to Use a Distributed Cache

**Use When:**
- Read-heavy workloads (read:write ratio > 10:1)
- Tolerance for stale data (seconds to minutes acceptable)
- Need to protect backend databases from traffic spikes
- Latency-sensitive applications (need sub-millisecond response)
- Data can be reconstructed from source of truth
- Predictable, repeatable access patterns

**Avoid When:**
- Need strong consistency guarantees
- Write-heavy workloads
- Data must never be lost (use persistent KV store instead)
- Unpredictable access patterns (cache won't help)
- Working set exceeds available memory budget
- Single-use data (no repeat access)

---

## Distributed Cache vs Distributed KV Store

| Aspect | Distributed LRU Cache | Distributed KV Store |
|--------|----------------------|---------------------|
| **Primary Goal** | Reduce latency, protect backend | Durable data storage |
| **Durability** | Not required (ephemeral) | Required (persistent) |
| **Data Loss** | Expected (eviction) | Never acceptable |
| **Consistency** | Eventual only | Tunable (strong to eventual) |
| **Storage Engine** | In-memory only | LSM Tree, B-Tree, disk-based |
| **Recovery** | Reconstruct from source | Restore from replicas/backup |
| **Replication Purpose** | Availability only | Durability + availability |
| **Unique Challenges** | Stampede, hot keys, eviction | Compaction, tombstones, consensus |
| **Examples** | Memcached, Redis (cache mode), EVCache | DynamoDB, Cassandra, Redis (persistent) |

---

## Related Systems

- **[Distributed Key-Value Store](../1.3-distributed-key-value-store/00-index.md)** - Persistent storage layer that cache sits in front of
- **[Distributed Rate Limiter](../1.1-distributed-rate-limiter/00-index.md)** - Often implemented using distributed cache
- **[Distributed Load Balancer](../1.2-distributed-load-balancer/00-index.md)** - Routes traffic to cache nodes

---

## References

### Engineering Blogs
- [Meta: Cache Made Consistent](https://engineering.fb.com/2022/06/08/core-infra/cache-made-consistent/) - Achieving 10-nines cache consistency
- [Meta: TAO - The Power of the Graph](https://engineering.fb.com/2013/06/25/core-infra/tao-the-power-of-the-graph/) - Social graph caching architecture
- [Netflix: Caching for a Global Netflix](https://netflixtechblog.com/caching-for-a-global-netflix-7bcc457012f1) - Multi-region caching strategy
- [Netflix: Cache Warming with EBS](https://netflixtechblog.medium.com/cache-warming-leveraging-ebs-for-moving-petabytes-of-data-adcf7a4a78c3) - Petabyte-scale cache warming

### Technical Documentation
- [Redis Cluster Specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/) - Hash slots and gossip protocol
- [Netflix EVCache GitHub](https://github.com/Netflix/EVCache) - Open source distributed cache
- [Memcached Protocol](https://github.com/memcached/memcached/blob/master/doc/protocol.txt) - Simple cache protocol

### Academic Papers
- [Consistent Hashing and Random Trees](https://www.cs.princeton.edu/courses/archive/fall09/cos518/papers/chash.pdf) - Original consistent hashing paper
- [Scaling Memcache at Facebook](https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf) - NSDI 2013
