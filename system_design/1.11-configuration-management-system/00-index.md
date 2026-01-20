# Configuration Management System

[← Back to System Design Index](../README.md)

---

## Overview

A **Configuration Management System** provides centralized storage, coordination, and dynamic distribution of configuration data across distributed applications. Unlike traditional static configuration files, these systems enable real-time configuration updates, watch-based notifications, and coordination primitives like leader election and distributed locking.

The core problem configuration management solves is: *"How do we maintain consistent configuration across hundreds or thousands of service instances, update them dynamically without restarts, and coordinate distributed operations?"*

Configuration management systems like ZooKeeper, etcd, and Consul KV form the backbone of modern distributed infrastructure, powering everything from Kubernetes cluster coordination to feature flag distribution.

---

## Complexity Rating

| Aspect | Rating | Justification |
|--------|--------|---------------|
| **Overall** | **High** | Consensus protocols, strong consistency, and coordination semantics add significant complexity |
| Core Concept | Medium | Key-value storage with watches is intuitive |
| Consensus Protocol | High | Raft/ZAB implementation requires deep understanding |
| Watch Mechanism | Medium-High | Event ordering, memory management, coalescing |
| Session/Lease Management | Medium | Heartbeats, ephemeral data, timeout handling |
| Multi-Datacenter | High | WAN latency, consistency trade-offs, failover |

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| Read:Write Ratio | ~100:1 | Read-heavy workload, optimize for read latency |
| Write Latency | < 50ms (p99) | Consensus overhead for durability |
| Read Latency | < 10ms (p99) | In-memory serving, follower reads |
| Consistency Model | Linearizable | Sequential writes, ordered reads |
| Data Size per Key | < 1 MB (typically < 1 KB) | Small configuration values, not blob storage |
| Watch Notification | < 100ms | Near real-time updates to subscribers |
| Cluster Size | 3, 5, or 7 nodes | Odd numbers for quorum; larger = slower writes |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/NFR, capacity planning (10K services, 100K keys), SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture, data flow, consensus layer, watch manager |
| [03 - Low-Level Design](./03-low-level-design.md) | Data model, API design, algorithms (Raft, watch dispatch) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Consensus deep dive, watch storms, session management |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Horizontal scaling, multi-DC deployment, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | mTLS, ACLs, encryption at rest, audit logging |
| [07 - Observability](./07-observability.md) | Metrics, alerting, operational runbooks |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, system comparison |

---

## Configuration Management vs. Related Systems

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONFIGURATION MANAGEMENT vs. RELATED SYSTEMS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Configuration Management (ZooKeeper, etcd, Consul KV):             │
│  ├── Strong consistency (linearizable writes)                       │
│  ├── Small data (< 1 MB per key)                                   │
│  ├── Watch mechanism for real-time updates                          │
│  ├── Coordination primitives (locks, leader election)               │
│  └── Examples: Feature flags, service config, cluster metadata      │
│                                                                      │
│  Service Discovery (Consul, Eureka):                                │
│  ├── Eventual consistency often acceptable                          │
│  ├── High availability priority                                     │
│  ├── Focus on health checking and instance lists                    │
│  └── Examples: Finding service endpoints                            │
│                                                                      │
│  Key-Value Store (Redis, DynamoDB):                                 │
│  ├── Higher throughput, larger data                                 │
│  ├── Eventual or strong consistency (configurable)                  │
│  ├── No coordination primitives                                     │
│  └── Examples: Session data, caching, user profiles                 │
│                                                                      │
│  Secret Management (Vault, AWS Secrets Manager):                    │
│  ├── Focus on encryption, rotation, audit                           │
│  ├── Dynamic secret generation                                      │
│  ├── Stronger access controls                                       │
│  └── Examples: Database credentials, API keys                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Model Comparison

| Aspect | ZooKeeper | etcd | Consul KV |
|--------|-----------|------|-----------|
| **Data Structure** | Hierarchical (tree/znodes) | Flat (key prefixes emulate hierarchy) | Flat with prefix matching |
| **Key Format** | `/path/to/node` | `/path/to/key` | `path/to/key` |
| **Max Value Size** | 1 MB | 1.5 MB | 512 KB |
| **Versioning** | Per-node version counter | Global revision + mod_revision | Per-key ModifyIndex |
| **Node Types** | Persistent, Ephemeral, Sequential | Persistent with optional lease | Persistent with optional session |
| **Watch Scope** | Single node or children | Key, prefix, or range | Key or prefix |

### Hierarchical vs. Flat Data Model

```
┌─────────────────────────────────────────────────────────────────────┐
│  HIERARCHICAL MODEL (ZooKeeper)                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  /                                                                   │
│  ├── /services                                                       │
│  │   ├── /services/payment                                          │
│  │   │   ├── /services/payment/config                               │
│  │   │   └── /services/payment/leader                               │
│  │   └── /services/order                                            │
│  │       └── /services/order/config                                 │
│  └── /locks                                                          │
│      └── /locks/inventory-001                                        │
│                                                                      │
│  Pros: Natural namespacing, watch children changes                   │
│  Cons: Each level is a separate node, more metadata overhead         │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  FLAT MODEL (etcd)                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  /services/payment/config     → {json config}                       │
│  /services/payment/leader     → {leader id}                         │
│  /services/order/config       → {json config}                       │
│  /locks/inventory-001         → {lock holder}                       │
│                                                                      │
│  Pros: Simpler model, efficient prefix queries                       │
│  Cons: No implicit hierarchy, must use prefixes carefully            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Real-World Implementations

| System | Protocol | Consistency | Key Innovation |
|--------|----------|-------------|----------------|
| **ZooKeeper** | ZAB (Zookeeper Atomic Broadcast) | CP (linearizable) | Ephemeral nodes, session management, sequential znodes |
| **etcd** | Raft | CP (linearizable) | Simple API, Kubernetes-native, efficient watch with revision |
| **Consul KV** | Raft | CP (linearizable) | Combined with service discovery, ACL tokens, multi-DC |
| **Netflix Archaius** | Polling | Eventual | Layered config (static + dynamic), Java-focused |
| **Apache Curator** | ZooKeeper client | CP (via ZK) | High-level recipes (locks, leader election, caches) |
| **Spring Cloud Config** | HTTP/Git | Eventual | Git-backed, environment-specific, refresh scope |

### Implementation Comparison

| Feature | ZooKeeper | etcd | Consul KV |
|---------|-----------|------|-----------|
| **Consensus** | ZAB | Raft | Raft |
| **Language** | Java | Go | Go |
| **Client Libraries** | Multi-language | Multi-language | Multi-language |
| **Watch Mechanism** | One-time triggers (re-register) | Persistent watch with revision | Blocking queries or watch |
| **Transaction Support** | Multi-op transaction | Transaction (compare-then-set) | Transaction (check-and-set) |
| **Lease/Session** | Session with timeout | Lease with TTL | Session with TTL |
| **Multi-DC** | Observer nodes | Requires proxy/gateway | Native WAN federation |
| **Kubernetes Integration** | External | Native (control plane) | Via Helm/operator |

---

## Common Use Cases

### 1. Dynamic Configuration Distribution

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Feature Flag Updates                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Admin Updates Feature Flag:                                         │
│    PUT /config/features/dark-mode → {"enabled": true, "rollout": 10}│
│                                                                      │
│  Services Watching Config:                                           │
│    Service A ←── Watch notification: dark-mode changed              │
│    Service B ←── Watch notification: dark-mode changed              │
│    Service C ←── Watch notification: dark-mode changed              │
│                                                                      │
│  Result: All 1000 instances update within 100ms                     │
│                                                                      │
│  Without Config System:                                              │
│    - Redeploy all services, or                                       │
│    - Wait for config file polling (30-60s delays), or               │
│    - Custom pub/sub infrastructure                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Leader Election

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Scheduler Leader Election                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Scheduler-1, Scheduler-2, Scheduler-3 compete for leadership       │
│                                                                      │
│  1. Each creates ephemeral sequential node:                         │
│     /election/scheduler-0000000001 (Scheduler-1)                    │
│     /election/scheduler-0000000002 (Scheduler-2)                    │
│     /election/scheduler-0000000003 (Scheduler-3)                    │
│                                                                      │
│  2. Lowest sequence number wins:                                    │
│     Scheduler-1 → LEADER (processes jobs)                           │
│     Scheduler-2 → FOLLOWER (watches Scheduler-1's node)             │
│     Scheduler-3 → FOLLOWER (watches Scheduler-2's node)             │
│                                                                      │
│  3. If Scheduler-1 crashes:                                         │
│     - Ephemeral node auto-deleted (session timeout)                 │
│     - Scheduler-2 notified, becomes new leader                      │
│     - Failover in ~30 seconds (session timeout)                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Distributed Locking

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Inventory Update Lock                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Order-Service wants exclusive access to update inventory:          │
│                                                                      │
│  1. Acquire lock:                                                    │
│     PUT /locks/inventory-sku-123                                    │
│     Body: {"holder": "order-service-1", "lease": 30s}               │
│                                                                      │
│  2. If key doesn't exist → Lock acquired                            │
│     If key exists → Wait or fail                                    │
│                                                                      │
│  3. Perform inventory update                                         │
│                                                                      │
│  4. Release lock:                                                    │
│     DELETE /locks/inventory-sku-123                                 │
│                                                                      │
│  Safety: Lease auto-expires if holder crashes                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Service Configuration (Kubernetes Pattern)

```
┌─────────────────────────────────────────────────────────────────────┐
│  USE CASE: Kubernetes ConfigMap in etcd                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ConfigMap stored in etcd:                                          │
│    /registry/configmaps/default/app-config                          │
│                                                                      │
│  Value:                                                              │
│    data:                                                             │
│      DATABASE_URL: "postgres://..."                                 │
│      LOG_LEVEL: "info"                                              │
│      CACHE_TTL: "300"                                               │
│                                                                      │
│  Kubelet watches for changes:                                        │
│    - Mounts ConfigMap as volume or env vars                         │
│    - Updates in pod without restart (volume mount)                  │
│    - Or triggers rolling restart (env var change)                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Trade-offs Summary

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Data Model** | Hierarchical (ZooKeeper) | Flat with prefixes (etcd) | Flat for simplicity, hierarchical for complex namespacing |
| **Consistency** | Strong (linearizable) | Eventual | Strong for config/coordination (can't afford stale) |
| **Watch Model** | One-time trigger | Persistent stream | Persistent stream (etcd style) for reliability |
| **Cluster Size** | 3 nodes | 5+ nodes | 3 for most; 5 for critical systems needing higher fault tolerance |
| **Read Path** | Leader only | Follower reads | Follower reads for scalability, leader for strict linearizability |

---

## Interview Readiness Checklist

| Concept | Must Understand | Common Pitfalls |
|---------|----------------|-----------------|
| Why Config Management | Dynamic updates, coordination | Confusing with general KV stores |
| Consensus Protocol | Raft/ZAB basics, quorum | Not explaining write path through leader |
| Watch Mechanism | Subscribe, notifications | Forgetting about watch storm scenarios |
| Session/Lease | TTL, ephemeral data | Not connecting to leader election/locks |
| Consistency Model | Linearizable vs eventual | Claiming eventual is acceptable for config |
| Cluster Sizing | Odd numbers, quorum math | Suggesting even number of nodes |
| Multi-DC | WAN challenges, latency | Assuming synchronous replication across DCs |

---

## References & Further Reading

### Documentation
- [ZooKeeper Programmer's Guide](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html)
- [etcd Documentation](https://etcd.io/docs/)
- [Consul KV Store](https://developer.hashicorp.com/consul/docs/dynamic-app-config/kv)
- [Netflix Archaius](https://github.com/Netflix/archaius)

### Engineering Blogs
- [Alibaba: 10,000-node Kubernetes etcd optimization](https://www.alibabacloud.com/blog/)
- [Criteo: Consul blocking query lessons](https://medium.com/criteo-engineering)
- [Uber: Configuration Management at Scale](https://eng.uber.com/)

### Academic Papers
- [In Search of an Understandable Consensus Algorithm (Raft)](https://raft.github.io/raft.pdf)
- [ZooKeeper: Wait-free coordination for Internet-scale systems](https://www.usenix.org/legacy/events/atc10/tech/full_papers/Hunt.pdf)
- [Paxos Made Simple - Leslie Lamport](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-20 | Initial comprehensive design |
