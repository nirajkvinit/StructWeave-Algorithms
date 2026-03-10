# 16.4 Design a Graph Database

## Overview

A graph database is a purpose-built storage and query engine that models data as vertices (nodes), edges (relationships), and properties, enabling constant-time traversal of connected data regardless of total dataset size. Unlike relational databases that rely on expensive JOIN operations to discover relationships at query time, graph databases store relationships as first-class citizens with direct physical pointers between adjacent records, making multi-hop traversals — such as "friends of friends who work at the same company" — orders of magnitude faster. This architecture powers social networks, fraud detection rings, recommendation engines, knowledge graphs, and identity resolution systems where the value lies in the connections between entities, not just the entities themselves.

## Key Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Read-heavy for traversals** | Graph queries traverse millions of edges per second; the read path dominates for pattern matching and pathfinding |
| **Write-moderate** | Node/edge creation is steady but lower volume than time-series or log systems; relationship mutations require pointer updates |
| **Latency-sensitive** | Online graph queries (social feeds, fraud checks, recommendations) require sub-10ms traversal for 2-3 hops |
| **Relationship-first** | The schema and storage engine are optimized for relationship density; a single node may have millions of edges |
| **Power-law distributed** | Real-world graphs follow power-law degree distributions — a few "supernodes" have orders of magnitude more connections than average |
| **Query-pattern diverse** | Workloads range from simple key lookups to complex variable-length path queries and full-graph analytics |

## Complexity Rating: **Very High**

Designing a graph database that maintains constant-time adjacency traversal while scaling horizontally introduces the "graph partitioning problem" — an NP-hard challenge where any cut through the graph creates cross-partition edges that degrade traversal performance. Combined with supernode handling (vertices with millions of edges), ACID transactions over graph mutations, and the impedance mismatch between the property graph model and distributed storage, this is one of the most architecturally challenging database designs.

## Quick Links

| # | Section | Description |
|---|---------|-------------|
| 01 | [Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| 02 | [High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| 03 | [Low-Level Design](./03-low-level-design.md) | Data model, API design, core algorithms (pseudocode) |
| 04 | [Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Index-free adjacency, supernode handling, graph partitioning |
| 05 | [Scalability & Reliability](./05-scalability-and-reliability.md) | Sharding strategies, replication, fault tolerance |
| 06 | [Security & Compliance](./06-security-and-compliance.md) | Graph-specific access control, traversal escalation, compliance |
| 07 | [Observability](./07-observability.md) | Graph-specific metrics, query profiling, traversal monitoring |
| 08 | [Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-off frameworks |
| 09 | [Insights](./09-insights.md) | Key architectural insights and non-obvious lessons |

## Technology Landscape

| Category | Representative Systems | Approach |
|----------|----------------------|----------|
| Native Property Graph | Neo4j, Memgraph | Index-free adjacency, native graph storage, Cypher/GQL |
| Distributed Graph Analytics | TigerGraph | Massively parallel processing, GSQL, compiled queries |
| Cloud-Managed Graph | Neptune, CosmosDB (Gremlin) | Managed service, multi-model, serverless scaling |
| Embedded Graph | FalkorDB, Kuzu | In-process graph engine, columnar storage, sub-millisecond queries |
| RDF Triple Store | Blazegraph, Stardog | Subject-predicate-object triples, SPARQL, semantic web |
| Multi-Model with Graph | ArangoDB, OrientDB | Document + graph hybrid, AQL/SQL extensions |

## Key Concepts Referenced

- **Property Graph Model** — Vertices and edges with key-value properties and labels/types
- **Index-Free Adjacency** — Each node stores direct physical pointers to its neighbors, enabling O(1) edge traversal
- **Cypher / GQL** — Declarative pattern-matching query languages (GQL is the ISO standard: ISO/IEC 39075)
- **Supernode** — A vertex with disproportionately high edge count (power-law distribution)
- **Graph Partitioning** — Splitting a graph across machines while minimizing cross-partition edges (NP-hard)
- **Property Sharding** — Separating graph topology (kept unified) from property data (sharded across nodes)
- **Vertex-Centric Index** — Per-vertex edge index that enables efficient neighbor filtering on supernodes
