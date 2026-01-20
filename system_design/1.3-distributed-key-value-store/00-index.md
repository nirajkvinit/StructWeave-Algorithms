# Distributed Key-Value Store

[← Back to System Design Index](../README.md)

---

## System Overview

A **Distributed Key-Value Store** is a highly available, partition-tolerant data storage system that provides simple GET/PUT/DELETE operations on data identified by unique keys. Unlike traditional databases, it trades complex query capabilities for horizontal scalability, low latency, and fault tolerance across distributed nodes.

The system partitions data across multiple nodes using consistent hashing, replicates data for durability, and provides tunable consistency levels to balance between availability and data correctness.

---

## Complexity Rating

| Aspect | Rating | Justification |
|--------|--------|---------------|
| **Overall** | **High** | Combines distributed systems fundamentals with storage engine internals |
| Partitioning | Medium-High | Consistent hashing with virtual nodes requires careful implementation |
| Replication | High | Quorum protocols, conflict resolution, and failure handling |
| Storage Engine | High | LSM trees with compaction tuning is non-trivial |
| Consistency | High | Multiple consistency models with trade-off implications |

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| Traffic Pattern | Configurable (typically read-heavy 90:10) | Optimize read path with caching and replicas |
| Latency Sensitivity | Very High (< 10ms p99 reads) | In-memory indexes, local replicas, bloom filters |
| Consistency Model | Tunable (Eventual to Strong) | Quorum configuration (N, R, W) |
| Availability Target | 99.99%+ (4+ nines) | Replication, sloppy quorum, hinted handoff |
| Data Model | Simple key-value, schema-less | Flexible, application-managed structure |
| Partition Tolerance | Required | Consistent hashing, graceful degradation |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture, partitioning, replication strategies |
| [03 - Low-Level Design](./03-low-level-design.md) | Data model, APIs, LSM tree, algorithms |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Consistent hashing, vector clocks, compaction |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling, failure handling, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Authentication, encryption, compliance |
| [07 - Observability](./07-observability.md) | Metrics, logging, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trade-offs, trap questions |

---

## Algorithm & Approach Summary

| Aspect | Options | Recommended | Trade-off |
|--------|---------|-------------|-----------|
| **Partitioning** | Consistent Hashing, Range-based, Hash Slots | Consistent Hashing + Virtual Nodes | Uniform distribution vs range queries |
| **Replication** | Synchronous, Asynchronous, Quorum | Quorum (N=3, R=2, W=2) | Durability vs latency |
| **Storage Engine** | LSM Tree, B-Tree | LSM Tree | Write-optimized vs read-optimized |
| **Consistency** | Strong (Raft), Eventual (Dynamo) | Tunable per request | Correctness vs availability |
| **Conflict Resolution** | Last-Write-Wins, Vector Clocks, CRDTs | Vector Clocks | Simplicity vs correctness |
| **Compaction** | Size-Tiered, Leveled, FIFO | Leveled | Write amplification vs read amplification |
| **Failure Detection** | Heartbeat, Gossip Protocol | Gossip (Dynamo-style) | Overhead vs detection speed |

---

## Architecture Patterns Comparison

### Pattern 1: Dynamo-Style (AP System)
- **Examples:** DynamoDB, Cassandra, Riak, Voldemort
- **Characteristics:** Decentralized, eventually consistent, high availability
- **Key Techniques:** Consistent hashing, sloppy quorum, vector clocks, hinted handoff
- **Best For:** Shopping carts, session storage, user preferences

### Pattern 2: Raft-Based (CP System)
- **Examples:** etcd, Consul, TiKV
- **Characteristics:** Single leader, strongly consistent, linearizable reads
- **Key Techniques:** Raft consensus, leader election, log replication
- **Best For:** Configuration storage, distributed locks, metadata

### Pattern 3: Redis Cluster (Hybrid)
- **Examples:** Redis Cluster
- **Characteristics:** Hash slots, master-replica per shard, async replication
- **Key Techniques:** 16384 slots, gossip protocol, MOVED redirects
- **Best For:** Caching, real-time analytics, session storage

---

## Key Trade-offs Visualization

```
Consistency ←―――――――――――――――――――――→ Availability
     ↑                                    ↑
     Raft/Paxos consensus                 Dynamo sloppy quorum
     Single leader writes                 Multi-master writes
     Linearizable reads                   Eventual consistency
     etcd, Consul                         DynamoDB, Cassandra


Write Performance ←―――――――――――――――→ Read Performance
     ↑                                    ↑
     LSM Tree                             B-Tree
     Sequential disk writes               Random I/O optimized
     Compaction overhead                  In-place updates
     Cassandra, RocksDB                   MySQL, PostgreSQL


Simplicity ←―――――――――――――――――――――→ Correctness
     ↑                                    ↑
     Last-Write-Wins                      Vector Clocks / CRDTs
     Timestamp-based                      Causality tracking
     Potential data loss                  Conflict detection
     Simple implementation                Complex reconciliation
```

---

## Real-World Implementations

| System | Company | Architecture | Key Innovation | Scale |
|--------|---------|--------------|----------------|-------|
| **DynamoDB** | Amazon | Dynamo + B-Tree | Adaptive capacity, global tables | Trillions of requests/day |
| **Cassandra** | Apache (Facebook origin) | Dynamo + LSM Tree | Tunable consistency, wide-column | Petabytes at Netflix, Apple |
| **Redis Cluster** | Redis Labs | Hash slots + Replication | Sub-ms latency, in-memory | Millions of ops/sec |
| **etcd** | CNCF (CoreOS origin) | Raft + B-Tree (bbolt) | Strong consistency, watch API | Kubernetes control plane |
| **RocksDB** | Meta | LSM Tree (embedded) | Tunable compaction, compression | Foundation for TiKV, CockroachDB |
| **TAO** | Meta | Graph-aware cache + MySQL | Social graph optimized | Billions of reads/sec |
| **EVCache** | Netflix | Distributed Memcached | Zone-aware replication | 400M+ ops/sec |
| **Riak** | Basho | Dynamo-style | CRDTs, strong eventual consistency | IoT, gaming |

---

## When to Use / When to Avoid

### Use a Distributed KV Store When:
- Need low-latency access (< 10ms) at massive scale
- Data model is simple (key-value or key-document)
- Horizontal scalability is critical
- High availability is more important than strong consistency
- Access patterns are known (point lookups, no complex joins)

### Avoid When:
- Need complex queries, joins, or aggregations
- Strong transactional guarantees (ACID across keys) are required
- Data relationships are complex (consider graph DB)
- Scale is small enough for single-node database
- Need full-text search (consider search engine)

---

## Interview Readiness Checklist

| Concept | Must Understand | Common Pitfalls |
|---------|----------------|-----------------|
| Consistent Hashing | Virtual nodes, preference lists | Forgetting hot partition handling |
| Quorum | N, R, W relationships, sloppy quorum | Not explaining R+W>N trade-off |
| LSM Tree | Write path, read path, compaction | Ignoring write amplification |
| Vector Clocks | Conflict detection, sibling resolution | Confusing with Lamport clocks |
| Replication | Sync vs async, chain replication | Not addressing replication lag |
| Failure Handling | Hinted handoff, read repair, anti-entropy | Assuming network is reliable |

---

## References & Further Reading

### Foundational Papers
- [Dynamo: Amazon's Highly Available Key-value Store (2007)](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) - The seminal paper
- [Bigtable: A Distributed Storage System (2006)](https://static.googleusercontent.com/media/research.google.com/en//archive/bigtable-osdi06.pdf) - Wide-column model
- [TAO: Facebook's Distributed Data Store (2013)](https://www.usenix.org/system/files/conference/atc13/atc13-bronson.pdf) - Graph-aware caching

### Engineering Blogs
- [Netflix EVCache](https://netflixtechblog.com/ephemeral-volatile-caching-in-the-cloud-8eba7b124589) - Distributed caching architecture
- [Discord's Cassandra Migration](https://discord.com/blog/how-discord-stores-billions-of-messages) - Real-world scaling story
- [Uber's Schemaless](https://www.uber.com/blog/schemaless-part-one-mysql-datastore/) - MySQL-backed KV store

### Documentation
- [Redis Cluster Specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)
- [RocksDB Wiki](https://github.com/facebook/rocksdb/wiki/RocksDB-Overview)
- [Cassandra Architecture](https://cassandra.apache.org/doc/latest/cassandra/architecture/)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-20 | Initial comprehensive design |
