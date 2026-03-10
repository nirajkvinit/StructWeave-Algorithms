# Requirements & Estimations — NewSQL Database

## Functional Requirements

### Core Features (Must-Have)

| # | Requirement | Description |
|---|------------|-------------|
| F1 | **SQL Query Processing** | Parse, optimize, and execute standard SQL queries (SELECT, INSERT, UPDATE, DELETE) with joins, subqueries, aggregations, and CTEs |
| F2 | **Distributed ACID Transactions** | Multi-row, multi-range transactions with serializable isolation; support for BEGIN, COMMIT, ROLLBACK, and SAVEPOINT |
| F3 | **Automatic Sharding** | Transparently partition tables into ranges based on primary key ordering; automatically split and merge ranges based on size/load |
| F4 | **Consensus Replication** | Replicate each range across multiple nodes via Raft consensus; tolerate minority node failures without data loss |
| F5 | **Secondary Indexes** | Create and maintain global and local secondary indexes that are automatically distributed and kept consistent with base data |
| F6 | **Online Schema Changes** | Add/drop columns, create/drop indexes, and alter constraints without blocking reads or writes |
| F7 | **SQL Wire Protocol Compatibility** | Support PostgreSQL or MySQL wire protocol so existing applications and tools connect without modification |
| F8 | **Distributed Query Execution** | Plan and execute queries that span multiple ranges with pushdown optimization, distributed joins, and parallel scan |

### Extended Features (Nice-to-Have)

| # | Requirement | Description |
|---|------------|-------------|
| E1 | **Multi-Region Placement** | Pin ranges to specific regions with zone configurations; support locality-aware reads for low-latency access |
| E2 | **Change Data Capture (CDC)** | Stream row-level changes to external systems for event-driven architectures |
| E3 | **Follower Reads** | Serve slightly stale but consistent reads from follower replicas to reduce leaseholder load |
| E4 | **Columnar Analytics** | Maintain columnar replicas of selected tables for analytical queries (HTAP) |
| E5 | **JSON / Semi-Structured Data** | Support JSON columns with indexing and query operators alongside relational data |

### Out of Scope

- Full-text search engine (delegate to dedicated search infrastructure)
- Graph traversal queries (delegate to graph database)
- Blob/object storage (delegate to object storage service)
- Stream processing (delegate to external event pipeline)

---

## Non-Functional Requirements

### CAP Theorem Choice

**CP — Strong Consistency** — A NewSQL database prioritizes consistency and partition tolerance. Distributed ACID transactions require that all committed writes are immediately visible to subsequent reads across all nodes. During a network partition, the minority partition becomes unavailable for writes (Raft requires majority quorum), preserving consistency at the cost of availability for the affected ranges.

| Property | Choice | Justification |
|----------|--------|---------------|
| Consistency | Strong (serializable) | Financial transactions, inventory, and user accounts cannot tolerate stale or inconsistent reads |
| Availability | High but not absolute | Brief unavailability during leader election (5-10s) or minority partition is acceptable |
| Partition Tolerance | Required | Geo-distributed clusters must survive network partitions between regions |

### Performance Targets

| Metric | Target | Context |
|--------|--------|---------|
| Point read latency (single range) | < 2 ms (p50), < 10 ms (p99) | Primary key lookup within one range |
| Point write latency (single range) | < 5 ms (p50), < 20 ms (p99) | Single-row INSERT/UPDATE with Raft consensus |
| Distributed transaction (2 ranges) | < 15 ms (p50), < 50 ms (p99) | Cross-range transaction with parallel commits |
| Distributed transaction (5+ ranges) | < 30 ms (p50), < 100 ms (p99) | Wide-scatter transactions touching many ranges |
| Simple query (indexed scan, 100 rows) | < 10 ms (p50), < 50 ms (p99) | Range scan with predicate pushdown |
| Complex query (join, aggregation) | < 200 ms (p50), < 1s (p99) | Multi-table join with distributed execution |
| Online schema change | Zero-downtime | Add column or create index without blocking DML |

### Durability & Availability

| Metric | Target |
|--------|--------|
| Availability | 99.999% (5.26 min/year downtime) |
| Durability | 99.999999999% (11 nines) |
| RPO (single region) | 0 seconds (synchronous Raft replication) |
| RTO (single region) | < 10 seconds (automatic Raft leader election) |
| RPO (cross-region) | < 1 second (synchronous multi-region quorum) |
| RTO (cross-region) | < 30 seconds (leader election + DNS failover) |

---

## Capacity Estimations (Back-of-Envelope)

### Scenario: Global Financial Services Platform

A financial platform serving 50M active accounts across 3 regions, handling payment transactions, account management, and real-time balance queries.

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Total rows (Year 1) | 10B | 50M accounts x 200 avg rows per account (transactions, balances, metadata) |
| Row size (average) | 256 bytes | Primary key (16B) + MVCC timestamp (12B) + columns (180B) + overhead (48B) |
| Read QPS (average) | 200K | Balance checks, account lookups, reporting queries |
| Read QPS (peak) | 800K | 4x average during peak trading / end-of-month |
| Write QPS (average) | 50K | Payment transactions, account updates, audit records |
| Write QPS (peak) | 200K | 4x average |
| Transaction size (average) | 3 statements | Read balance, write debit, write credit |
| Ranges (average) | 100K | 10B rows x 256B = 2.56 TB / 64 MB default range size |
| Raft groups | 100K | One per range, each with 3-5 replicas |
| Raw data storage (Year 1) | 2.56 TB | 10B rows x 256 bytes |
| MVCC versions | 2x raw | GC window of 24 hours retains ~2x live data |
| Index storage | 1x raw | Secondary indexes roughly equal to base data |
| Total logical storage | ~8 TB | Data + MVCC versions + indexes + WAL |
| Replication factor | 3x | Standard 3-replica Raft groups |
| Total physical storage | ~24 TB | 8 TB x 3 replicas |
| Cluster size | 15-20 nodes | Each node: 2 TB NVMe SSD, 64 GB RAM, 16 vCPUs |
| Memory per node (hot set) | 48 GB | Block cache + MVCC intent cache + connection pools |
| Network bandwidth (inter-node) | 10 Gbps | Raft replication + distributed query traffic |

### Storage Architecture Summary

```
Total Logical Data:     ~8 TB (Year 1)
Replication Factor:     3x
Total Physical Storage: ~24 TB
Cluster Size:           15-20 nodes x 2 TB NVMe + 64 GB RAM
Range Count:            ~100K ranges (64 MB each)
Raft Groups:            ~100K (one per range)
MVCC GC Window:         25 hours (configurable)
```

---

## SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | 99.999% | Percentage of successful queries within latency target |
| Read Latency (p99) | < 10 ms | Point read measured at client, single region |
| Write Latency (p99) | < 20 ms | Single-range write measured at client |
| Transaction Latency (p99) | < 50 ms | Cross-range distributed transaction |
| Error Rate | < 0.001% | Percentage of queries returning server errors |
| Throughput | > 200K read QPS, > 50K write QPS | Sustained cluster-wide throughput |
| Data Freshness | 0 ms (strong reads) | Reads always see latest committed data |
| Recovery Time | < 10 seconds | Time to elect new Raft leader after failure |
| Replication Lag | 0 (synchronous) | Raft guarantees zero lag for committed writes |

---

## Read/Write Ratio Analysis

| Workload Type | Read:Write | Dominant Operation |
|---------------|------------|-------------------|
| Financial transactions | 4:1 | Balance checks, transfers, audit queries |
| E-commerce inventory | 10:1 | Product lookups, stock checks, order writes |
| User account management | 20:1 | Authentication, profile reads, occasional updates |
| SaaS multi-tenant | 8:1 | Tenant data queries, document reads, writes |
| IoT device registry | 5:1 | Device state reads, telemetry writes |
| Analytics + OLTP mixed | 3:1 | Reporting queries + transactional writes |

**Overall weighted ratio: ~8:1 (read-heavy with significant write volume)**
