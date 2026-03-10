# 16.5 Design a NewSQL Database

## Overview

A NewSQL database is a distributed relational database system that combines the horizontal scalability of NoSQL with the full ACID transactional guarantees and SQL compatibility of traditional relational databases. Unlike single-node RDBMS systems that scale only vertically, a NewSQL database partitions data into ranges (contiguous key spans), replicates each range across multiple nodes using consensus protocols like Raft, and coordinates distributed transactions using techniques like two-phase commit with parallel optimizations. The SQL query layer sits atop a distributed key-value storage engine, translating relational operations into distributed key-value reads and writes while maintaining serializable isolation through multi-version concurrency control (MVCC) and hybrid logical clocks. This architecture enables systems to serve globally distributed OLTP workloads — financial transactions, inventory management, user accounts — with strong consistency, automatic failover, and online schema changes, all while presenting a familiar SQL interface to applications.

## Key Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Distributed ACID** | Full ACID transactions spanning multiple nodes and ranges, using consensus-based replication and distributed commit protocols |
| **SQL-compatible** | Standard SQL interface with wire-protocol compatibility to existing databases (PostgreSQL/MySQL), enabling migration without application rewrites |
| **Range-based sharding** | Data automatically partitioned into contiguous key ranges that split and merge dynamically based on size and load |
| **Consensus replication** | Each range independently replicated via Raft consensus groups, providing fault tolerance without a single point of failure |
| **Serializable isolation** | Default serializable or serializable snapshot isolation using MVCC with timestamp ordering, preventing all anomalies |
| **Geo-distribution** | Multi-region deployment with configurable data placement, locality-aware reads, and survivability guarantees |
| **Online operations** | Schema changes, index creation, range rebalancing, and version upgrades without downtime |
| **Horizontal scalability** | Linear throughput scaling by adding nodes; automatic range splitting and rebalancing distribute load evenly |

## Complexity Rating: **Very High**

Designing a NewSQL database requires solving several interlocking distributed systems challenges simultaneously: maintaining serializable transactions across ranges that may reside on different continents, coordinating clocks without specialized hardware (TrueTime vs. hybrid logical clocks), optimizing a SQL query planner that must account for data distribution and network topology, and performing range splits and merges without blocking ongoing transactions. The interaction between the consensus layer, the transaction layer, and the SQL layer creates a three-dimensional design space where a suboptimal choice in any dimension cascades to the others.

## Quick Links

| # | Section | Description |
|---|---------|-------------|
| 01 | [Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| 02 | [High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| 03 | [Low-Level Design](./03-low-level-design.md) | Data model, API design, core algorithms (pseudocode) |
| 04 | [Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Clock skew, distributed deadlocks, range splits, cross-range transactions |
| 05 | [Scalability & Reliability](./05-scalability-and-reliability.md) | Range-based sharding, Raft replication, multi-region deployment |
| 06 | [Security & Compliance](./06-security-and-compliance.md) | Threat model, RBAC, encryption, SQL injection prevention |
| 07 | [Observability](./07-observability.md) | Raft health metrics, query latency, distributed tracing |
| 08 | [Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-off frameworks |
| 09 | [Insights](./09-insights.md) | Key architectural insights and non-obvious lessons |

## Technology Landscape

| Category | Representative Systems | Approach |
|----------|----------------------|----------|
| Geo-Distributed SQL | CockroachDB, Spanner-derivatives | Range-based sharding, Raft consensus, hybrid logical clocks, parallel commits |
| HTAP NewSQL | TiDB (TiKV + TiFlash) | Separated compute/storage, Raft per region, columnar replicas for analytics |
| Distributed PostgreSQL | YugabyteDB (DocDB) | Tablet-based sharding, per-tablet Raft groups, PostgreSQL-compatible SQL layer |
| Cloud-Native NewSQL | PlanetScale (Vitess), Aurora | MySQL-compatible, horizontal sharding with VTGate routing |
| Academic / Research | Calvin, FaunaDB | Deterministic transaction ordering, Calvin-style pre-ordering |
| Embedded NewSQL | FoundationDB + SQL layers | Ordered key-value foundation with layered SQL semantics |

## Key Concepts Referenced

- **Range** — A contiguous span of the sorted keyspace; the unit of replication, sharding, and load balancing
- **Raft Consensus** — Per-range consensus protocol ensuring replicated state machine agreement across nodes
- **Leaseholder** — The range replica that holds the lease and coordinates all reads and writes for that range
- **MVCC (Multi-Version Concurrency Control)** — Each write creates a new timestamped version; reads see a consistent snapshot
- **Hybrid Logical Clock (HLC)** — Combines physical time (NTP) with a logical counter to establish causal ordering without specialized hardware
- **Parallel Commits** — Optimization that commits a distributed transaction in one consensus round-trip instead of two
- **Range Split / Merge** — Automatic division of ranges that grow too large and merging of underutilized ranges
- **Intent** — A provisional write (MVCC value) that indicates an uncommitted transaction, resolved on commit or abort
