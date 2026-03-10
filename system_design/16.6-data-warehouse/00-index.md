# 16.6 Design a Data Warehouse

## Overview

A data warehouse is a purpose-built analytical storage and query engine that organizes structured data in columnar format to support high-throughput aggregation queries across petabyte-scale datasets. Unlike transactional databases optimized for single-row lookups and updates, data warehouses store data column-by-column, enabling queries that scan billions of rows but only a few columns to skip 90%+ of irrelevant data. Modern architectures separate compute from storage — stateless compute clusters read from a shared columnar storage layer backed by cloud object storage — allowing organizations to scale query concurrency and data volume independently, pay only for resources consumed, and run isolated workloads (ETL, interactive BI, machine learning) without contention. This architecture powers business intelligence dashboards, ad-hoc analytical queries, regulatory reporting, and data science workflows where the value lies in aggregating, filtering, and joining large historical datasets rather than serving real-time transactional requests.

## Key Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Read-heavy, append-mostly** | Analytical queries dominate; data is loaded in bulk or micro-batches and rarely updated in place |
| **Columnar storage** | Data stored column-by-column with type-specific encoding and compression, enabling 10-100x I/O reduction for typical queries |
| **Massively parallel processing** | Queries are decomposed into fragments executed simultaneously across dozens to hundreds of compute nodes |
| **Separation of compute and storage** | Stateless compute clusters read from durable object storage, enabling independent scaling and workload isolation |
| **Schema-on-write** | Data conforms to a predefined star or snowflake schema at load time, ensuring query-time consistency |
| **Latency-tolerant** | Queries typically complete in seconds to minutes, not milliseconds; optimized for throughput over latency |
| **Cost-proportional** | Charges scale with data scanned and compute time, making query efficiency directly tied to cost |

## Complexity Rating: **Very High**

Designing a data warehouse that maintains sub-second scan rates across petabytes of columnar data while supporting hundreds of concurrent queries introduces the "resource elasticity problem" — dynamically allocating and reclaiming compute capacity without query starvation or cold-start penalties. Combined with cost-based query optimization over star schemas with hundreds of tables, materialized view maintenance that keeps pre-computed aggregates fresh without full recomputation, and multi-tenant workload isolation that prevents a single expensive query from degrading the entire cluster, this is one of the most architecturally complex analytical systems to design at scale.

## Quick Links

| # | Section | Description |
|---|---------|-------------|
| 01 | [Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| 02 | [High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| 03 | [Low-Level Design](./03-low-level-design.md) | Data model, API design, core algorithms (pseudocode) |
| 04 | [Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Columnar internals, query execution, partition pruning |
| 05 | [Scalability & Reliability](./05-scalability-and-reliability.md) | Elastic compute, storage scaling, fault tolerance |
| 06 | [Security & Compliance](./06-security-and-compliance.md) | Row/column-level security, encryption, compliance |
| 07 | [Observability](./07-observability.md) | Query profiling, warehouse metrics, alerting |
| 08 | [Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-off frameworks |
| 09 | [Insights](./09-insights.md) | Key architectural insights and non-obvious lessons |

## Technology Landscape

| Category | Representative Systems | Approach |
|----------|----------------------|----------|
| Cloud-Native Warehouse | Snowflake, BigQuery, Redshift | Managed service, separation of compute/storage, elastic scaling |
| On-Premise MPP | Teradata, Greenplum, Vertica | Shared-nothing MPP, coupled compute/storage, dedicated hardware |
| Lakehouse | Databricks (Delta Lake), Apache Iceberg + Trino | Open table formats on object storage, unified batch + ML workloads |
| Embedded Analytics | DuckDB, ClickHouse | In-process or single-node columnar engine, low-latency OLAP |
| Federated Query | Trino, Presto, Dremio | Query engine over heterogeneous data sources without data movement |
| Streaming Warehouse | Apache Druid, Apache Pinot | Real-time ingestion with sub-second analytical queries |

## Key Concepts Referenced

- **Columnar Storage** — Data organized by column rather than row, enabling compression and scan efficiency for analytical queries
- **Micro-Partition** — A contiguous unit of columnar storage (50-500 MB uncompressed) with embedded statistics for pruning
- **MPP (Massively Parallel Processing)** — Query execution distributed across independent compute nodes that process data partitions in parallel
- **Separation of Compute and Storage** — Architecture where stateless compute clusters access a shared, durable storage layer independently
- **Zone Map** — Per-partition min/max statistics that enable the query engine to skip partitions that cannot contain matching rows
- **Materialized View** — Pre-computed query result stored as a table, refreshed incrementally as source data changes
- **Cost-Based Optimizer (CBO)** — Query planner that evaluates execution plans using statistical metadata to minimize resource consumption
