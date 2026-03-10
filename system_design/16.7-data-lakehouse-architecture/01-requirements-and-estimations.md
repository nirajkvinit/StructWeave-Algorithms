# Requirements & Estimations — Data Lakehouse Architecture

## Functional Requirements

### Core (F1 – F8)

| ID | Requirement | Description |
|:---|:---|:---|
| F1 | **ACID Transactions** | Atomic, isolated commits on object storage; concurrent readers see consistent snapshots |
| F2 | **Schema Management** | Define, enforce, and evolve table schemas (add/drop/rename/reorder columns, type promotions) without rewriting data |
| F3 | **Time Travel** | Query any historical snapshot by version number or timestamp |
| F4 | **Data Ingestion** | Support batch loads, micro-batch streaming, and change-data-capture upserts into the same table |
| F5 | **Partition Management** | Create, evolve, and prune partitions; support hidden partitioning that decouples physical layout from user queries |
| F6 | **Data Skipping** | Maintain per-file column statistics (min, max, null count, distinct count) and skip irrelevant files at query time |
| F7 | **Compaction & Optimization** | Merge small files, apply Z-ordering or sort-based clustering, and vacuum expired snapshots |
| F8 | **Multi-Engine Access** | Expose governed tables to heterogeneous query engines through a catalog protocol |

### Extended (E1 – E5)

| ID | Requirement | Description |
|:---|:---|:---|
| E1 | **Incremental Processing** | Process only changes since a given snapshot (change data feed / incremental queries) |
| E2 | **Branching & Tagging** | Create isolated branches for experimentation; tag snapshots for reproducibility |
| E3 | **Row-Level Lineage** | Track provenance of individual rows across ingestion, transformation, and consumption |
| E4 | **Cross-Table Transactions** | Atomically commit changes spanning multiple tables in one catalog operation |
| E5 | **Materialized Views** | Automatically maintained summary tables that refresh incrementally from base lakehouse tables |

### Out of Scope

- Query engine internals (Spark SQL optimizer, Trino cost model)
- ML model training and serving pipelines
- Real-time sub-second event streaming (handled by a dedicated stream processor)
- Data visualization or BI tool design

## Non-Functional Requirements

| Requirement | Target | Rationale |
|:---|:---|:---|
| **Consistency** | Snapshot isolation for readers; serializable for writers | Readers never see partial writes; writer conflicts detected at commit |
| **Availability** | 99.95 % for reads; 99.9 % for writes | Reads served from replicated object storage; writes depend on catalog availability |
| **Durability** | 11 nines (99.999999999 %) | Inherited from replicated object storage |
| **Latency — Interactive Query** | p50 < 3 s, p99 < 15 s for 1 TB scan | Achieved via data skipping, caching, and columnar formats |
| **Latency — Streaming Ingest** | End-to-end < 60 s from event to queryable row | Micro-batch commit interval drives freshness |
| **Throughput** | > 10 GB/s sustained ingest per table | Parallel writers committing to distinct file groups |
| **Scalability** | Petabyte-scale tables with billions of files | Metadata hierarchy must not degrade with file count |

### CAP Theorem Position

The lakehouse operates as a **CP system** for its metadata layer. The catalog enforces linearizable commits (compare-and-swap or log-append) so that concurrent writers never produce conflicting snapshots. Reads tolerate brief unavailability of the catalog by using cached metadata, trading freshness for availability. The data layer on object storage is eventually consistent for listings but the table format's explicit file tracking bypasses listing, achieving effective strong consistency.

## Performance Targets

| Operation | Target | Condition |
|:---|:---|:---|
| Point-in-time snapshot read | < 500 ms metadata resolution | Table with 100 K files |
| Full table scan (1 TB Parquet) | < 30 s | 64-node cluster, columnar pushdown |
| Selective query with data skipping | < 3 s | Predicate matches < 1 % of files |
| Batch commit (10 K new files) | < 5 s | Single atomic commit |
| Streaming micro-batch commit | < 2 s per batch | 100 MB per batch |
| Compaction (1 TB partition) | < 15 min | Background, non-blocking reads |
| Schema evolution (add column) | < 1 s | Metadata-only operation |
| Snapshot expiration (vacuum) | < 30 min | 1 M expired files |

## Capacity Estimation

**Reference deployment**: enterprise analytics platform, 500 TB raw data, 200 concurrent users, 50 tables, mixed BI + ML workload.

### Storage

| Component | Estimate | Basis |
|:---|:---|:---|
| Raw data (Parquet on object storage) | 500 TB | Columnar compression ~4:1 on 2 PB raw |
| Metadata files (manifests, snapshots) | ~5 TB (1 % of data) | Avro manifest overhead scales with file count |
| Snapshot retention (30 days) | ~150 TB additional | Assumes 1 % daily churn, old files retained |
| Total object storage | ~655 TB | Data + metadata + retained snapshots |
| Catalog database | < 100 GB | Table pointers, access-control entries |

### Compute

| Component | Estimate | Basis |
|:---|:---|:---|
| Interactive query cluster | 64 – 256 vCPUs | Auto-scales based on concurrent query load |
| Batch ingestion cluster | 128 vCPUs sustained | 10 GB/s ingest target |
| Streaming ingestion | 32 vCPUs sustained | Micro-batch every 30 s |
| Compaction workers | 64 vCPUs (periodic) | Scheduled during off-peak hours |

### I/O

| Flow | Estimate |
|:---|:---|
| Read throughput (peak) | 50 GB/s aggregate across queries |
| Write throughput (sustained) | 10 GB/s ingestion |
| Metadata reads / s | ~5 000 (manifest fetches across concurrent queries) |
| Catalog commits / min | ~200 (batch + streaming combined) |

## SLO Summary

| SLO | Target | Measurement |
|:---|:---|:---|
| Query freshness | Data queryable within 60 s of ingestion | End-to-end latency from event timestamp to query visibility |
| Interactive query p99 | < 15 s | Measured at query-engine coordinator |
| Commit success rate | > 99.9 % | Failed commits due to conflict / timeout |
| Compaction lag | < 4 hours | Time since last compaction on any active partition |
| Snapshot availability | 99.95 % uptime | Ability to resolve current snapshot from catalog |
| Data durability | 99.999999999 % | Inherited from object storage replication |
