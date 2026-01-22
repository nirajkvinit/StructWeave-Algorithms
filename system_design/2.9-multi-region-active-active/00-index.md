# Multi-Region Active-Active Architecture

[← Back to System Design Index](../README.md)

---

## Overview

Multi-Region Active-Active Architecture enables distributed systems to serve read and write traffic from multiple geographic regions simultaneously, with each region operating as a fully functional independent unit. Unlike active-passive setups where secondary regions remain idle until failover, active-active architectures utilize all regions continuously, providing the lowest latency for global users while achieving the highest availability guarantees.

The core challenge lies in maintaining data consistency across regions when concurrent writes occur to the same data from different locations. This design covers conflict resolution strategies including CRDTs (Conflict-free Replicated Data Types), vector clocks for causality detection, and global load balancing for optimal traffic routing.

---

## Key Characteristics

| Characteristic | Value | Notes |
|----------------|-------|-------|
| **Traffic Pattern** | Write-heavy per region, read-local | Each region handles local reads/writes |
| **Latency Target** | < 50ms local, < 300ms cross-region | Local operations prioritized |
| **Consistency Model** | Eventual with tunable per-operation | Can upgrade to strong for critical ops |
| **Availability Target** | 99.999% (5 nines) | No single region dependency |
| **CAP Position** | AP with optional CP | Default: availability; option: consistency |
| **Replication** | Asynchronous (default), Synchronous (optional) | Async for latency, sync for guarantees |
| **Conflict Resolution** | CRDT + Vector Clocks + LWW | Layered approach |

---

## Complexity Rating

| Aspect | Rating | Reason |
|--------|--------|--------|
| **Overall** | Very High | Multiple complex subsystems interacting |
| **Conflict Resolution** | Very High | CRDT math, vector clock comparisons |
| **Replication** | High | Cross-region networking, consistency |
| **Traffic Management** | Medium | Established patterns (GeoDNS, Anycast) |
| **Operations** | Very High | Multi-region debugging, failover |

---

## Document Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data model, APIs, CRDT algorithms, conflict resolution |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | CRDT engine, replication transport, bottleneck analysis |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, failover, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Cross-region encryption, data residency, threat model |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trap questions, trade-offs, quick reference |

---

## Core Components

| Component | Responsibility | Criticality |
|-----------|----------------|-------------|
| **Global Load Balancer** | Route users to optimal region via GeoDNS/Anycast | High |
| **Regional Data Cluster** | Store and serve data locally with full replica | Critical |
| **Conflict Resolution Engine** | Detect and resolve concurrent write conflicts | Critical |
| **Replication Transport** | Propagate writes between regions asynchronously | Critical |
| **Vector Clock Manager** | Track causality and detect concurrent updates | High |
| **CRDT Library** | Provide conflict-free data structures | High |
| **Health Monitor** | Detect regional failures, trigger failover | High |
| **Anti-Entropy Service** | Detect and repair divergence via Merkle trees | Medium |

---

## Write Pattern Comparison

| Pattern | Description | Consistency | Latency | Conflict Handling | Best For |
|---------|-------------|-------------|---------|-------------------|----------|
| **Write-Global** | Single global write region | Strong | High (cross-region) | None needed | Financial transactions |
| **Write-Partitioned** | Each record has home region | Strong (home) | Medium | Cross-region only | User profiles, geo-specific |
| **Write-Local** | Any region accepts writes | Eventual | Lowest | Required (CRDT/VC) | Shopping carts, social feeds |

**Recommendation:** Write-Local for maximum availability and lowest latency, with Write-Partitioned option for specific data requiring stronger guarantees.

---

## Conflict Resolution Strategy Comparison

| Strategy | Data Loss Risk | Complexity | Deterministic | Best For |
|----------|----------------|------------|---------------|----------|
| **Last-Write-Wins (LWW)** | Possible (silent) | Low | Yes (with tiebreaker) | Logs, simple values |
| **First-Update-Wins** | Possible | Low | Yes | Immutable inserts |
| **Vector Clocks + Siblings** | None | Medium | No (app resolves) | Complex objects |
| **CRDTs** | None | High | Yes (mathematical) | Counters, sets, registers |
| **Delta Resolution** | None | Medium | Yes | Financial balances |
| **Custom Handlers** | None | High | Configurable | Business-specific rules |

---

## CRDT Type Comparison

| CRDT Type | Operation | Use Case | Storage Overhead | Merge Complexity |
|-----------|-----------|----------|------------------|------------------|
| **G-Counter** | Increment only | View counts, metrics | O(regions) | O(regions) |
| **PN-Counter** | Increment/Decrement | Bidirectional counters | O(regions × 2) | O(regions) |
| **LWW-Register** | Set value (timestamp wins) | Simple key-value | O(1) | O(1) |
| **MV-Register** | Set value (keep all concurrent) | Complex objects | O(concurrent writes) | O(versions) |
| **OR-Set** | Add/Remove elements | Shopping carts, tags | O(elements × adds) | O(elements) |
| **LWW-Element-Set** | Add/Remove with timestamps | Collections | O(elements) | O(elements) |

---

## Consistency Level Comparison

| Level | Regions Involved | Latency | Availability | Use Case |
|-------|------------------|---------|--------------|----------|
| **LOCAL_ONE** | 1 local node | Lowest (~5ms) | Highest | Cached reads |
| **LOCAL_QUORUM** | Local region majority | Low (~15ms) | High | Most read/write ops |
| **GLOBAL_ONE** | Any 1 region | Medium (~100ms) | High | Global reads |
| **GLOBAL_QUORUM** | Majority of regions | High (~200ms) | Medium | Critical writes |
| **ALL** | Every region | Highest (~300ms+) | Lowest | Rare (compliance) |

---

## Replication Topology Comparison

| Topology | Connections | Propagation Delay | Failure Resilience | Operational Complexity |
|----------|-------------|-------------------|--------------------|-----------------------|
| **Full Mesh** | O(n²) | Lowest (1 hop) | Highest | High (many connections) |
| **Hub-Spoke** | O(n) | Medium (2 hops max) | Medium (hub SPOF) | Low |
| **Ring** | O(n) | High (n/2 hops avg) | Medium | Medium |
| **Hierarchical** | O(n log n) | Medium | High | Medium |

**Recommendation:** Full mesh for <5 regions; hierarchical for 5+ regions.

---

## Clock Synchronization Comparison

| Approach | Clock Skew | Cost | Consistency Guarantee |
|----------|------------|------|----------------------|
| **TrueTime (Atomic Clocks)** | ~7ms | Very High (specialized hardware) | External consistency |
| **NTP (Software)** | 100-250ms | Low | Bounded staleness |
| **Hybrid Logical Clocks (HLC)** | Bounded physical + logical | Low | Causal+ |
| **Vector Clocks** | N/A (logical only) | Low | Causal |

---

## Real-World Implementations

| System | Approach | Consistency | Conflict Resolution |
|--------|----------|-------------|---------------------|
| **Google Spanner** | TrueTime, Paxos | External (strong) | Locks, no conflicts |
| **CockroachDB** | HLC, Raft | Serializable | Locks, no conflicts |
| **Cassandra** | Vector clocks, quorum | Tunable (eventual) | LWW, custom |
| **DynamoDB Global Tables** | Last-writer-wins | Eventual | LWW with timestamps |
| **YugabyteDB** | HLC, Raft | Strong | Locks, no conflicts |
| **Redis Enterprise** | CRDTs | Eventual | CRDT merge |
| **Riak** | Vector clocks, CRDTs | Eventual | Siblings or CRDT |

---

## Active-Active vs Active-Passive

| Aspect | Active-Active | Active-Passive |
|--------|---------------|----------------|
| **Resource Utilization** | All regions serving traffic | Secondary idle until failover |
| **Latency** | Users always hit closest region | May require cross-region access |
| **Complexity** | High (conflict resolution) | Lower (single writer) |
| **RTO** | Near-zero (already serving) | Minutes (failover required) |
| **Cost** | Higher (all regions active) | Lower (secondary underutilized) |
| **Data Consistency** | Eventual (unless global quorum) | Strong (single source) |

---

## When to Use Active-Active

**Good Fit:**
- Global user base requiring low latency everywhere
- 99.99%+ availability requirements (no single point of failure)
- Read-heavy workloads with eventual consistency tolerance
- Data that can be modeled with CRDTs (counters, sets)
- Applications where availability trumps immediate consistency

**Poor Fit:**
- Strict consistency requirements (financial ledgers, inventory counts)
- Complex transactions spanning multiple records
- Data models that don't map well to CRDTs
- Cost-sensitive workloads (2N+ capacity required)
- Small user base concentrated in one geography

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│              MULTI-REGION ACTIVE-ACTIVE                     │
├─────────────────────────────────────────────────────────────┤
│  Scale Targets:                                             │
│  • 3-5 regions globally                                     │
│  • 100K+ QPS per region                                     │
│  • < 50ms local latency, < 300ms global                     │
│  • 99.999% availability                                     │
├─────────────────────────────────────────────────────────────┤
│  Key Patterns:                                              │
│  • Write-Local with CRDT conflict resolution                │
│  • Async replication (default), sync for critical ops       │
│  • Vector clocks for causality detection                    │
│  • Full mesh topology for < 5 regions                       │
├─────────────────────────────────────────────────────────────┤
│  Go-To Choices:                                             │
│  • Counters → G-Counter / PN-Counter                        │
│  • Collections → OR-Set                                     │
│  • Simple values → LWW-Register                             │
│  • Complex objects → Vector Clocks + App Resolution         │
├─────────────────────────────────────────────────────────────┤
│  Critical Numbers:                                          │
│  • Replication lag: 50-200ms typical                        │
│  • RTO: < 30 seconds (automatic failover)                   │
│  • RPO: < replication lag at failure time                   │
│  • Clock skew: 7ms (TrueTime) to 250ms (NTP)               │
├─────────────────────────────────────────────────────────────┤
│  Failure Handling:                                          │
│  • Region failure: Traffic reroutes via GeoDNS/Anycast      │
│  • Network partition: Both sides continue (AP)              │
│  • Conflict on heal: CRDT merge or vector clock resolution  │
└─────────────────────────────────────────────────────────────┘
```

---

## Interview Readiness Checklist

- [ ] Can explain Write-Local vs Write-Partitioned vs Write-Global trade-offs
- [ ] Can describe CRDT merge semantics for G-Counter and OR-Set
- [ ] Can explain vector clock comparison algorithm (before, after, concurrent)
- [ ] Can discuss CAP theorem implications for active-active
- [ ] Can design conflict resolution strategy for shopping cart use case
- [ ] Can explain read-your-writes consistency guarantee approaches
- [ ] Can describe regional failover mechanism and RTO/RPO implications
- [ ] Can discuss clock skew challenges in LWW resolution
- [ ] Can explain anti-entropy repair with Merkle trees
- [ ] Can identify when NOT to use active-active (strong consistency needs)

---

## References

- [AWS Multi-Region Active-Active Architecture](https://aws.amazon.com/blogs/architecture/disaster-recovery-dr-architecture-on-aws-part-iv-multi-site-active-active/)
- [CockroachDB: Living Without Atomic Clocks](https://www.cockroachlabs.com/blog/living-without-atomic-clocks/)
- [CRDT.tech - Conflict-free Replicated Data Types](https://crdt.tech/)
- [Redis Enterprise Active-Active](https://redis.io/active-active/)
- [Spanner: TrueTime and External Consistency](https://cloud.google.com/spanner/docs/true-time-external-consistency)
- [Shapiro et al. - A Comprehensive Study of CRDTs](https://hal.inria.fr/inria-00555588)
- [Dynamo: Amazon's Highly Available Key-Value Store](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)

---

[Next: Requirements & Estimations →](./01-requirements-and-estimations.md)
