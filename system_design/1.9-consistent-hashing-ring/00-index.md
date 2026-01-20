# Consistent Hashing Ring

[← Back to System Design Index](../README.md)

---

## Overview

**Consistent Hashing** is a distributed hashing technique that maps both data keys and server nodes onto a circular hash space (the "ring"), enabling minimal key remapping when nodes are added or removed. Unlike traditional modulo-based hashing where adding a server requires remapping nearly all keys, consistent hashing ensures that only approximately `K/N` keys need to move (where K = total keys, N = number of nodes).

Originally invented by Karger et al. at MIT in 1997 for distributed caching (leading to the founding of Akamai), consistent hashing has become a foundational building block for distributed systems including Amazon Dynamo, Apache Cassandra, DynamoDB, and content delivery networks.

---

## Complexity Rating

| Aspect | Rating | Justification |
|--------|--------|---------------|
| **Overall** | **Medium** | Algorithm is elegant but implementation details matter |
| Core Concept | Low | Ring + clockwise assignment is intuitive |
| Virtual Nodes | Medium | Adds complexity but essential for balance |
| Rebalancing | Medium | Migration strategies require careful design |
| Bounded Loads | Medium-High | Extension for load balancing guarantees |

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| Hash Space | 2^32 or 2^64 | Large space for uniform distribution |
| Lookup Complexity | O(log N) | Binary search on sorted ring positions |
| Space Complexity | O(N × V) | N nodes × V virtual nodes each |
| Key Remapping | ~K/N on node change | Minimal disruption property |
| Load Variance | < 10% with vnodes | Requires 100-200 vnodes per node |
| Replication Support | Built-in | Walk clockwise for N replicas |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Use Cases](./01-requirements-and-estimations.md) | When to use, functional requirements |
| [02 - High-Level Design](./02-high-level-design.md) | Ring concept, virtual nodes, data flow |
| [03 - Low-Level Design](./03-low-level-design.md) | Hash functions, data structures, pseudocode |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Hot spots, bounded loads, rebalancing |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Node add/remove, failure handling |
| [06 - Security Considerations](./06-security-and-compliance.md) | Hash attacks, membership security |
| [07 - Observability](./07-observability.md) | Metrics, distribution monitoring |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trap questions, whiteboard strategy |

---

## Algorithm Variants Comparison

| Algorithm | Lookup | Memory | Node Add/Remove | Best For |
|-----------|--------|--------|-----------------|----------|
| **Ring Hash (Karger)** | O(log n) | O(n × v) | Flexible | General purpose, databases |
| **Jump Hash (Google)** | O(log n) | O(1) | Append-only | Sharding with stable IDs |
| **Rendezvous/HRW** | O(n) | O(1) | Flexible | Small clusters, replication |
| **Maglev (Google)** | O(1) | O(n) table | Expensive rebuild | Load balancers, high throughput |
| **Bounded Loads** | O(log n) | O(n) | Flexible | Load-sensitive applications |

### When to Use Each

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ALGORITHM SELECTION GUIDE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Ring Hash (Classic Consistent Hashing)                              │
│  ├── When: Dynamic cluster membership, general purpose               │
│  ├── Examples: Cassandra, Dynamo, distributed caches                 │
│  └── Trade-off: Memory for vnodes, but most flexible                 │
│                                                                      │
│  Jump Hash                                                           │
│  ├── When: Internal sharding, stable node IDs (0, 1, 2...)          │
│  ├── Examples: Google internal systems                               │
│  └── Trade-off: Can only add nodes at end, not remove arbitrarily    │
│                                                                      │
│  Rendezvous (Highest Random Weight)                                  │
│  ├── When: Small cluster (< 100 nodes), need natural replication     │
│  ├── Examples: GitHub load balancer, Apache Ignite                   │
│  └── Trade-off: O(n) lookup acceptable for small n                   │
│                                                                      │
│  Maglev                                                              │
│  ├── When: Ultra-high throughput load balancing                      │
│  ├── Examples: Google Cloud Load Balancing, Envoy                    │
│  └── Trade-off: Expensive table rebuild, limited backend count       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The Problem Consistent Hashing Solves

### Traditional Modulo Hashing Failure

```
Scenario: 3 servers, add 1 more

Before (3 servers):                After (4 servers):
hash(key) % 3 = server             hash(key) % 4 = server

Key A: hash=7  → 7%3=1 → S1        Key A: hash=7  → 7%4=3 → S3  ❌ MOVED
Key B: hash=12 → 12%3=0 → S0       Key B: hash=12 → 12%4=0 → S0 ✓
Key C: hash=15 → 15%3=0 → S0       Key C: hash=15 → 15%4=3 → S3 ❌ MOVED
Key D: hash=22 → 22%3=1 → S1       Key D: hash=22 → 22%4=2 → S2 ❌ MOVED
Key E: hash=31 → 31%3=1 → S1       Key E: hash=31 → 31%4=3 → S3 ❌ MOVED

Result: 4 out of 5 keys (80%) need to move!
With consistent hashing: only ~25% (1/N) would move
```

### Why This Matters

| Scenario | Modulo Hashing | Consistent Hashing |
|----------|----------------|-------------------|
| Add 1 node to 10-node cluster | ~90% keys move | ~10% keys move |
| Remove 1 node from 10-node cluster | ~90% keys move | ~10% keys move |
| Cache warm-up after scaling | Nearly full rebuild | Minimal cold misses |
| Database migration cost | O(K) data movement | O(K/N) data movement |

---

## Real-World Implementations

| System | Company | How They Use Consistent Hashing |
|--------|---------|--------------------------------|
| **Dynamo** | Amazon | Partitioning + preference lists for replication |
| **DynamoDB** | Amazon | Virtual nodes, auto-scaling partitions |
| **Cassandra** | Apache (Meta origin) | 256 vnodes default, token ranges |
| **Riak** | Basho | Ring-based partitioning, CRDTs |
| **Memcached** | - | Ketama algorithm with client-side hashing |
| **Redis Cluster** | Redis | Hash slots (16384 fixed slots, variant approach) |
| **Akamai CDN** | Akamai | Original use case - web cache distribution |
| **Discord** | Discord | Message routing to correct shard |
| **HAProxy** | - | Load balancing with bounded loads |
| **Envoy** | Lyft/CNCF | Ring hash and Maglev load balancer |

---

## Core Concepts at a Glance

### The Ring

```
                           0 / 2^32
                              │
                         ┌────┴────┐
                    ────/          \────
                  /                      \
                /                          \
           ┌───┐                            ┌───┐
          /│ A │                            │ B │\
         / └───┘                            └───┘ \
        │                                          │
        │                                          │
   ─────│                                          │─────
        │                                          │
        │                                          │
         \ ┌───┐                            ┌───┐ /
          \│ D │                            │ C │/
           └───┘                            └───┘
                \                          /
                  \                      /
                    ────\          /────
                         └────┬────┘
                              │
                           2^31

   Keys are assigned to the first node encountered
   when walking CLOCKWISE from the key's hash position
```

### Virtual Nodes

```
Physical Nodes: A, B, C
Virtual Nodes:  A has 3 vnodes, B has 3 vnodes, C has 3 vnodes

Ring Distribution:
┌─────────────────────────────────────────────────────────────┐
│  Position    0%    11%   22%   33%   44%   55%   66%   77%  │
│  Node        A1    C2    B1    A2    C1    B2    A3    C3   │
│                                                    88%       │
│                                                    B3        │
└─────────────────────────────────────────────────────────────┘

Benefits:
• More even key distribution
• Load from failed node spreads across many nodes
• Heterogeneous capacity via weighted vnodes
```

---

## Key Trade-offs Summary

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Hash Function** | MD5 (Ketama) - widely compatible | xxHash - faster | MD5 for interop, xxHash for performance |
| **VNode Count** | Few (10-50) - less memory | Many (100-500) - better balance | 150-200 for most cases |
| **Lookup Structure** | Sorted Array - simple | Red-Black Tree - dynamic | Array for stable membership |
| **Replication** | Clockwise N nodes | Separate replica map | Clockwise (Dynamo-style) |
| **Membership** | Centralized coordinator | Gossip protocol | Gossip for large clusters |

---

## Interview Readiness Checklist

| Concept | Must Understand | Common Pitfalls |
|---------|----------------|-----------------|
| Ring Concept | Hash space as circle, clockwise assignment | Drawing linear instead of circular |
| Virtual Nodes | Why needed, how they help balance | Forgetting to mention vnodes |
| Minimal Disruption | K/N key movement proof | Not quantifying the improvement |
| Replication | Walking clockwise for replicas | Selecting same physical node twice |
| Hot Spots | Celebrity keys, uneven hashing | Not having mitigation strategy |
| Node Failure | Successor takes over | Not mentioning temporary vs permanent |
| Alternatives | When to use Jump/Rendezvous/Maglev | Claiming ring hash is always best |

---

## References & Further Reading

### Foundational Papers
- [Consistent Hashing and Random Trees (1997)](https://www.cs.princeton.edu/courses/archive/fall09/cos518/papers/chash.pdf) - Karger et al., the original paper
- [Dynamo: Amazon's Highly Available Key-value Store (2007)](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) - Popularized consistent hashing
- [A Fast, Minimal Memory, Consistent Hash Algorithm (2014)](https://arxiv.org/pdf/1406.2294) - Google's Jump Hash
- [Consistent Hashing with Bounded Loads (2016)](https://arxiv.org/abs/1608.01350) - Google's extension

### Engineering Blogs
- [Ably: Implementing Efficient Consistent Hashing](https://ably.com/blog/implementing-efficient-consistent-hashing)
- [ByteByteGo: Consistent Hashing Explained](https://bytebytego.com/guides/consistent-hashing/)
- [Google Research: Consistent Hashing with Bounded Loads](https://research.google/blog/consistent-hashing-with-bounded-loads/)
- [Damian Gryski: Consistent Hashing Algorithmic Tradeoffs](https://dgryski.medium.com/consistent-hashing-algorithmic-tradeoffs-ef6b8e2fcae8)

### Documentation
- [Apache Cassandra: Virtual Nodes](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html)
- [Envoy Proxy: Load Balancing](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-20 | Initial comprehensive design |
