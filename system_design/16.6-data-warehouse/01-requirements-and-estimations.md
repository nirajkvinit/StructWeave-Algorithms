# Requirements & Estimations — Data Warehouse

## Functional Requirements

### Core Features (Must-Have)

| # | Requirement | Description |
|---|------------|-------------|
| F1 | **Data Ingestion** | Bulk loading (COPY/INSERT), micro-batch streaming, and schema-validated data import from structured sources |
| F2 | **SQL Query Engine** | Full ANSI SQL support including JOINs, subqueries, window functions, CTEs, and set operations |
| F3 | **Columnar Scan & Filter** | Column-level predicate pushdown with partition pruning to minimize data scanned |
| F4 | **Aggregation & Grouping** | Distributed GROUP BY, DISTINCT, HAVING, and rollup/cube operations across petabyte-scale data |
| F5 | **Join Processing** | Hash joins, sort-merge joins, and broadcast joins with automatic strategy selection |
| F6 | **Schema Management** | DDL operations for databases, schemas, tables, views, and constraints with online schema evolution |
| F7 | **Materialized Views** | Pre-computed aggregates with automatic incremental refresh when source tables change |
| F8 | **Transaction Support** | ACID semantics for DML operations with snapshot isolation for concurrent read/write |

### Extended Features (Nice-to-Have)

| # | Requirement | Description |
|---|------------|-------------|
| E1 | **Time Travel** | Query historical snapshots of data at any point within a retention window |
| E2 | **Data Sharing** | Zero-copy sharing of live data between organizational units without data movement |
| E3 | **Semi-Structured Data** | Native support for JSON, Avro, and Parquet with schema-on-read for nested fields |
| E4 | **External Tables** | Query data in external object storage without loading it into the warehouse |
| E5 | **Workload Management** | Automatic classification and prioritization of queries by resource requirements and business priority |

### Out of Scope

- Real-time transactional processing (OLTP workloads with single-row latency requirements)
- Unstructured data storage (images, video, raw text — handled by object storage or data lake)
- Stream processing engine (real-time event processing handled by dedicated streaming platform)
- Machine learning model training (compute-intensive training delegated to ML platform)

---

## Non-Functional Requirements

### CAP Theorem Choice

**CP with tunable staleness** — Analytical queries must see a consistent snapshot of data (no partial loads visible). Availability is important but brief unavailability during compute cluster scaling or failover is acceptable since analytical workloads are latency-tolerant.

| Property | Choice | Justification |
|----------|--------|---------------|
| Consistency | Strong (snapshot isolation) | Queries must see a consistent view; partial loads produce incorrect aggregations |
| Availability | High but not absolute | Seconds of unavailability during cluster resize is acceptable for analytical workloads |
| Partition Tolerance | Required | Distributed compute and storage must survive network partitions |

### Performance Targets

| Metric | Target | Context |
|--------|--------|---------|
| Simple aggregation (single table) | < 2s (p50), < 5s (p99) | COUNT/SUM/AVG over filtered partition of a billion-row table |
| Complex join query (3-5 tables) | < 10s (p50), < 30s (p99) | Star schema join with dimension filtering |
| Full table scan (1 TB) | < 30s (p50), < 60s (p99) | Unfiltered scan of a large fact table |
| Data loading (bulk) | > 1 GB/s per compute node | Compressed Parquet/CSV ingestion throughput |
| Data loading (micro-batch) | < 60s end-to-end latency | From event arrival to query-visible |
| Concurrent queries | 200+ simultaneous | Without significant latency degradation |
| Query compilation | < 500 ms | SQL parsing, optimization, and plan generation |

### Durability & Availability

| Metric | Target |
|--------|--------|
| Availability | 99.95% (4.4 hours/year downtime) |
| Durability | 99.999999999% (11 nines) |
| RPO | 0 (no data loss — committed data persists in durable object storage) |
| RTO | < 60 seconds (stateless compute recovery from object storage) |

---

## Capacity Estimations (Back-of-Envelope)

### Scenario: Enterprise Analytics Platform

A retail enterprise with 50,000 employees, 200M daily transactions, serving BI dashboards, ad-hoc queries, and regulatory reporting across 3 years of historical data.

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Daily raw data ingested | 500 GB | 200M transactions x 2.5 KB avg row size |
| Daily compressed data | 50 GB | 10:1 compression ratio (columnar + encoding) |
| Annual storage growth | 18 TB compressed | 50 GB/day x 365 days |
| Total storage (3 years) | 55 TB compressed | 18 TB x 3 years + metadata + time travel snapshots |
| Total raw equivalent | 550 TB | 55 TB compressed / 10:1 ratio |
| Fact table rows (3 years) | 220B | 200M/day x 365 x 3 years |
| Dimension tables | 500M rows total | Products, customers, stores, employees |
| Concurrent BI users | 500 | Dashboard viewers during business hours |
| Peak query QPS | 50 | 500 users x ~6 queries/min / 60 |
| Ad-hoc analyst queries | 2,000/day | 100 analysts x 20 queries/day |
| ETL batch loads | 24/day | Hourly incremental loads |
| Metadata catalog size | 50 GB | Table schemas, partition statistics, access logs |
| Query result cache | 100 GB | LRU cache for repeated dashboard queries |

### Storage Architecture Summary

```
Total Compressed Storage:  ~55 TB (3 years)
Replication Factor:        3x (object storage durability)
Compute Cluster:           8-16 nodes x 32 vCPU + 256 GB RAM (elastic)
Hot Cache (per node):      2 TB NVMe SSD for frequently accessed partitions
Metadata Service:          3-node replicated cluster, 50 GB
```

---

## SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | 99.95% | Percentage of minutes where query submission succeeds |
| Query Latency (p99, simple) | < 5 seconds | Single-table aggregation with partition pruning |
| Query Latency (p99, complex) | < 30 seconds | Multi-table join with window functions |
| Data Freshness | < 60 seconds | Time between commit in source system and query visibility |
| Error Rate | < 0.1% | Percentage of queries returning system errors |
| Throughput | > 50 QPS sustained | Concurrent query execution rate |
| Compute Scaling | < 60 seconds | Time to provision additional compute capacity |
| Recovery Time | < 60 seconds | Time to resume query processing after compute failure |

---

## Read/Write Ratio Analysis

| Workload Type | Read:Write | Dominant Operation |
|---------------|------------|-------------------|
| BI dashboards | 500:1 | Repeated aggregation queries, cached results |
| Ad-hoc analytics | 200:1 | Exploratory queries with varying predicates |
| Regulatory reporting | 100:1 | Scheduled reports with fixed query patterns |
| ETL/ELT processing | 5:1 | Bulk data transformations with heavy writes |
| Data science exploration | 50:1 | Large scans with statistical sampling |
| Data sharing | 1000:1 | Consumer queries against shared datasets |

**Overall weighted ratio: ~100:1 (read-heavy)**
