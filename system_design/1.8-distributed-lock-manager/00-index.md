# Distributed Lock Manager

[← Back to System Design Index](../README.md)

---

## System Overview

A **Distributed Lock Manager** is a coordination service that provides mutual exclusion across distributed processes. Unlike single-node locks (mutexes), distributed locks must handle network partitions, process crashes, and clock skew while ensuring that at most one process holds a lock at any time.

The core challenge is that distributed systems lack a shared memory or global clock. A process holding a lock may crash, become slow (GC pause), or get partitioned from the lock service. The system must detect these failures and release locks without violating mutual exclusion.

**Key Insight for Interviews:** A distributed lock is only truly safe when combined with **fencing tokens** - monotonic values that storage services validate to reject stale lock holders.

---

## Complexity Rating

| Aspect | Rating | Justification |
|--------|--------|---------------|
| **Overall** | **Medium-High** | Consensus protocol complexity + subtle correctness requirements |
| Consensus Protocol | High | Raft/Paxos/ZAB requires deep understanding |
| Fencing Tokens | Medium | Often overlooked but critical for correctness |
| Lease Management | Medium | Session timeouts, renewal, and failure detection |
| API Design | Low-Medium | Simple acquire/release but subtle edge cases |

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| Consistency Model | Strong (CP) | Linearizable operations required for correctness |
| Latency Sensitivity | Medium (< 20ms p99) | Lock operations on critical path |
| Availability Target | 99.99% | Must survive minority node failures |
| Lock Duration | Seconds to minutes | Lease-based with renewal for long operations |
| Throughput | 10K-100K ops/sec | Typically not the bottleneck |
| Partition Tolerance | Required | Must handle network splits safely |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Kubernetes scenario, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Cluster architecture, lock algorithms, data flow |
| [03 - Low-Level Design](./03-low-level-design.md) | Lock record structure, API design, state machines |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Fencing tokens, consensus internals, Redlock critique |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Multi-region, fault tolerance, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | mTLS, ACLs, audit logging |
| [07 - Observability](./07-observability.md) | Lock metrics, alerting, tracing |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trap questions, trade-offs |

---

## Algorithm & Approach Summary

| Aspect | Options | Recommended | Trade-off |
|--------|---------|-------------|-----------|
| **Consensus** | Raft, Paxos, ZAB | Raft | Understandability vs academic purity |
| **Lock Primitive** | Ephemeral nodes, Leases | Leases + Revision | Simplicity vs fencing support |
| **Fencing** | None, Timestamps, Revision | Raft Log Index/Revision | No fencing = unsafe for correctness |
| **Failure Detection** | Heartbeat, Session, Lease TTL | Lease TTL + Heartbeat | Fast detection vs false positives |
| **Multi-node** | Single leader, Quorum | Quorum (Raft) | Performance vs strong consistency |

---

## Architecture Patterns Comparison

### Pattern 1: Consensus-Based (CP System)

**Examples:** ZooKeeper, etcd, Consul, Chubby

**Characteristics:**
- Strong consistency via distributed consensus (Raft/Paxos/ZAB)
- Single leader handles all writes
- Fencing tokens available (zxid, revision, log index)
- Leases/sessions for failure detection

**Key Techniques:**
- Ephemeral sequential nodes (ZooKeeper)
- Lease + Key transactions (etcd)
- Session-based locks with TTL (Consul)

**Best For:** Correctness-critical locks (leader election, distributed transactions)

### Pattern 2: Probabilistic (Efficiency Locks)

**Examples:** Redlock (Redis)

**Characteristics:**
- No consensus protocol
- Multi-instance majority quorum
- Clock-based expiration
- No native fencing token support

**Key Techniques:**
- SET NX with TTL on N independent Redis instances
- Acquire lock if majority (N/2+1) succeeds
- Verify elapsed time < lock validity

**Best For:** Efficiency locks where duplicate work is acceptable (deduplication, rate limiting)

### Pattern 3: Database-Based

**Examples:** PostgreSQL advisory locks, MySQL GET_LOCK

**Characteristics:**
- Leverages existing database
- Connection-scoped or session-scoped
- Limited scalability
- No built-in fencing

**Best For:** Simple use cases where database is already in the stack

---

## Key Trade-offs Visualization

```
Consistency ←―――――――――――――――――――――→ Availability
     ↑                                    ↑
     Consensus-based (ZooKeeper, etcd)    Redlock (probabilistic)
     Strong consistency                    Eventual/Best-effort
     Survives minority failures            Survives majority failures
     Safe for correctness locks            Safe for efficiency locks


Latency ←―――――――――――――――――――――――――→ Safety
     ↑                                    ↑
     Single Redis instance                Multi-node consensus
     < 1ms                                5-20ms
     No fault tolerance                   Survives failures
     SPOF, no fencing                     Fencing tokens available


Simplicity ←―――――――――――――――――――――――→ Correctness
     ↑                                    ↑
     SET NX with TTL                      Consensus + Fencing
     Easy to implement                    Complex protocol
     GC pause vulnerability               Safe even with pauses
     Antirez Redlock                      Kleppmann critique
```

---

## Real-World Implementations

| System | Consensus | Key Innovation | Production Use | Fencing Support |
|--------|-----------|----------------|----------------|-----------------|
| **Google Chubby** | Paxos | Coarse-grained locks + file interface | GFS, Bigtable, Spanner | Yes (sequence numbers) |
| **Apache ZooKeeper** | ZAB | Ephemeral sequential nodes, watches | Kafka, HBase, Hadoop | Yes (zxid) |
| **etcd** | Raft | Leases + revision-based txns | Kubernetes | Yes (revision) |
| **Consul** | Raft | Service mesh integration, sessions | Nomad, Vault | Yes (modify index) |
| **Redlock** | None | Multi-instance majority | Redis-based systems | No (critical limitation) |

---

## When to Use / When to Avoid

### Use a Distributed Lock Manager When:
- Need mutual exclusion across multiple processes/nodes
- Correctness depends on exclusive access (not just efficiency)
- Leader election for single-writer patterns
- Coordinating distributed transactions
- Protecting critical sections in microservices

### Avoid When:
- Single-node application (use local mutex)
- Lock holder doesn't modify shared state (no fencing needed)
- High-frequency locking (> 10K/sec per key) - consider lock-free algorithms
- Can tolerate duplicate work - use idempotency instead
- Database already provides needed isolation (use row locks)

### The Fencing Rule:

> **If your storage service doesn't validate fencing tokens, your distributed lock is only safe for efficiency, not correctness.**

---

## Interview Readiness Checklist

| Concept | Must Understand | Common Pitfalls |
|---------|----------------|-----------------|
| Fencing Tokens | Why locks alone are unsafe, monotonic validation | Forgetting GC pause scenario |
| Consensus (Raft) | Leader election, log replication, commitment | Confusing availability during election |
| ZooKeeper Recipes | Sequential nodes, watches, herd effect | Creating watches on all predecessors |
| etcd Locks | Lease + key + revision as fencing token | Not explaining revision-based fencing |
| Redlock Critique | Kleppmann's arguments, when Redlock is safe | Blindly defending or attacking Redlock |
| Lease Renewal | Why renewal is needed, what happens on failure | Assuming instant failure detection |

---

## References & Further Reading

### Foundational Papers & Articles
- [Martin Kleppmann: How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html) - The definitive critique of Redlock
- [Google Chubby Paper (OSDI 2006)](https://research.google.com/archive/chubby-osdi06.pdf) - Original distributed lock service
- [Antirez: Is Redlock safe?](https://antirez.com/news/101) - Salvatore Sanfilippo's response

### Documentation
- [ZooKeeper Recipes](https://zookeeper.apache.org/doc/current/recipes.html) - Official lock recipe
- [etcd Concurrency](https://etcd.io/docs/v3.5/dev-guide/api_concurrency_reference_v3/) - Lease-based locking
- [Consul Sessions](https://developer.hashicorp.com/consul/docs/dynamic-app-config/sessions) - Session-based locks

### Analysis & Testing
- [Jepsen: etcd 3.4.3](https://jepsen.io/analyses/etcd-3.4.3) - Distributed systems testing
- [Hazelcast: Distributed Locks are Dead](https://hazelcast.com/blog/long-live-distributed-locks/) - Industry perspective

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-20 | Initial comprehensive design |
