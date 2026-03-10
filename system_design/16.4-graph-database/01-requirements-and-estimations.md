# Requirements & Estimations — Graph Database

## Functional Requirements

### Core Features (Must-Have)

| # | Requirement | Description |
|---|------------|-------------|
| F1 | **Node & Edge CRUD** | Create, read, update, delete vertices and edges with properties and labels |
| F2 | **Pattern Matching** | Declarative queries that match structural patterns (e.g., "find all triangles", "match path A→B→C") |
| F3 | **Graph Traversal** | BFS, DFS, variable-length path traversal with depth limits and filtering |
| F4 | **Shortest Path** | Weighted and unweighted shortest path between two vertices |
| F5 | **Index Management** | B-tree and full-text indexes on node/edge properties for fast lookup |
| F6 | **ACID Transactions** | Multi-statement transactions with read-committed or serializable isolation |
| F7 | **Schema Management** | Optional schema with label constraints, property type enforcement, and uniqueness constraints |
| F8 | **Aggregation** | Group-by, count, sum, avg over traversal results |

### Extended Features (Nice-to-Have)

| # | Requirement | Description |
|---|------------|-------------|
| E1 | **Graph Analytics** | PageRank, community detection, centrality measures, connected components |
| E2 | **Full-Text Search** | Integrated text search across node/edge properties |
| E3 | **Geospatial Queries** | Spatial indexing for location-based graph queries |
| E4 | **Temporal Graphs** | Time-versioned edges and nodes for historical graph queries |
| E5 | **GraphRAG Integration** | Vector embeddings on nodes for hybrid graph + semantic search |

### Out of Scope

- General-purpose relational query processing (SQL JOINs, GROUP BY on non-graph data)
- Document storage without graph relationships
- Full-text search engine (dedicated search engine handles this)
- Stream processing (handled by external event pipeline)

---

## Non-Functional Requirements

### CAP Theorem Choice

**CP with tunable consistency** — For online graph queries (fraud detection, access control), strong consistency prevents stale traversals from returning incorrect paths. For analytics workloads, eventual consistency is acceptable.

| Property | Choice | Justification |
|----------|--------|---------------|
| Consistency | Strong (default), Eventual (analytics) | Traversals must see committed writes to avoid phantom relationships |
| Availability | High but not absolute | Brief unavailability during leader failover is acceptable |
| Partition Tolerance | Required | Distributed graph must survive network partitions |

### Performance Targets

| Metric | Target | Context |
|--------|--------|---------|
| Traversal latency (1-hop) | < 1 ms (p50), < 5 ms (p99) | Single-hop neighbor lookup via index-free adjacency |
| Traversal latency (3-hop) | < 10 ms (p50), < 50 ms (p99) | Social graph "friends of friends of friends" |
| Shortest path (6 hops max) | < 100 ms (p50), < 500 ms (p99) | Shortest path in social/fraud graphs |
| Pattern match (simple) | < 50 ms (p50), < 200 ms (p99) | Triangle detection, motif matching |
| Write latency (single node/edge) | < 5 ms (p50), < 20 ms (p99) | Node/edge creation with property indexing |
| Transaction commit | < 20 ms (p50), < 100 ms (p99) | Multi-statement graph mutations |
| Analytics query (PageRank) | < 60 seconds | Full-graph iterative computation |

### Durability & Availability

| Metric | Target |
|--------|--------|
| Availability | 99.99% (52.6 min/year downtime) |
| Durability | 99.999999999% (11 nines) |
| RPO | < 1 second (synchronous replication) |
| RTO | < 30 seconds (automated failover) |

---

## Capacity Estimations (Back-of-Envelope)

### Scenario: Social Graph Platform

A social network with 500M users, average 200 connections per user, serving real-time friend-of-friend queries and recommendation traversals.

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Total Nodes | 500M | 500M user nodes + metadata nodes |
| Total Edges | 50B | 500M users x 200 avg connections / 2 (bidirectional) = 50B edges |
| Read QPS (average) | 500K | 500M DAU / 1000 = 500K QPS (traversal queries) |
| Read QPS (peak) | 2M | 4x average during peak hours |
| Write QPS (average) | 50K | New connections, profile updates, node creation |
| Write QPS (peak) | 200K | 4x average |
| Node record size | 64 bytes | ID (8B) + label pointer (8B) + first-rel pointer (8B) + first-prop pointer (8B) + flags (8B) + padding (24B) |
| Edge record size | 64 bytes | ID (8B) + start-node (8B) + end-node (8B) + type (8B) + next-rel pointers (16B) + first-prop (8B) + flags (8B) |
| Property record size | 128 bytes average | Key-value pairs, variable length with overflow chains |
| Node storage | 32 GB | 500M nodes x 64B |
| Edge storage | 3.2 TB | 50B edges x 64B |
| Property storage | 12.8 TB | ~100B property records x 128B average |
| Total storage (Year 1) | ~20 TB | Nodes + edges + properties + indexes + WAL |
| Total storage (Year 5) | ~100 TB | 5x growth with new features and edge types |
| Index storage | ~4 TB | B-tree indexes on labels, property keys, and full-text |
| Memory (hot set) | 256 GB per node | Relationship chains for active users + traversal caches |
| Bandwidth (inter-node) | 10 Gbps | Cross-partition traversal traffic during distributed queries |
| Cache hit ratio target | > 90% | Top 10% of nodes (supernodes + active users) cover 90% of traversals |

### Storage Architecture Summary

```
Total Raw Storage:  ~20 TB (Year 1)
Replication Factor: 3x
Total with Replicas: ~60 TB
Cluster Size:       20 machines x 3 TB SSD + 256 GB RAM each
```

---

## SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | 99.99% | Percentage of successful traversal queries within latency target |
| Traversal Latency (p99) | < 50 ms for 3-hop | End-to-end including network, measured at client |
| Write Latency (p99) | < 20 ms | Node/edge creation acknowledgment |
| Error Rate | < 0.01% | Percentage of queries returning errors (excluding client errors) |
| Throughput | > 500K QPS | Sustained traversal query rate across cluster |
| Data Freshness | < 100 ms | Time between write commit and read visibility on replicas |
| Recovery Time | < 30 seconds | Time to failover to standby after primary failure detection |

---

## Read/Write Ratio Analysis

| Workload Type | Read:Write | Dominant Operation |
|---------------|------------|-------------------|
| Social graph queries | 100:1 | Friend lookups, feed generation, suggestions |
| Fraud detection | 50:1 | Real-time traversal for ring detection |
| Knowledge graph | 200:1 | Entity resolution, semantic queries |
| Recommendation engine | 80:1 | Collaborative filtering via graph traversal |
| Identity graph | 20:1 | Higher write ratio from event ingestion |
| Analytics workload | 10:1 | Full-graph scans with periodic bulk loads |

**Overall weighted ratio: ~80:1 (read-heavy)**
