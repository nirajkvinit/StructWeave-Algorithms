# Requirements & Estimations — Change Data Capture (CDC) System

## Functional Requirements

### Core Features (Must-Have)

| # | Requirement | Description |
|---|------------|-------------|
| F1 | **Log-Based Change Capture** | Read database transaction logs (WAL, binlog, oplog) to capture inserts, updates, and deletes with before/after row images |
| F2 | **Initial Snapshot** | Perform a consistent full-table snapshot for initial load, recording the exact log position to enable seamless transition to streaming |
| F3 | **Ordered Event Delivery** | Deliver change events in commit order per table/partition, preserving causality within a transaction |
| F4 | **Schema Evolution Support** | Detect DDL changes (column add, rename, type change, drop) and propagate schema metadata alongside data events |
| F5 | **Offset Management** | Persist log offsets (LSN, binlog position, GTID) durably so connectors can resume after restart without data loss or duplication |
| F6 | **Multi-Source Connectors** | Support capture from multiple database engines (PostgreSQL, MySQL, MongoDB, SQL Server) with engine-specific log parsers |
| F7 | **Event Envelope Format** | Emit a standardized change event envelope containing operation type, before/after images, source metadata, timestamp, and schema |
| F8 | **Sink Delivery** | Deliver change events to configurable sinks: message brokers, search indexes, caches, data lakes, materialized view engines |

### Extended Features (Nice-to-Have)

| # | Requirement | Description |
|---|------------|-------------|
| E1 | **Transaction Boundaries** | Group change events by transaction ID so consumers can apply atomic multi-table mutations |
| E2 | **Event Filtering & Routing** | Filter events by table, column, or predicate; route different tables to different topics/sinks |
| E3 | **Event Transformation** | Apply lightweight transformations (field renaming, masking, flattening) in the pipeline before delivery |
| E4 | **Incremental Snapshots** | Re-snapshot individual tables on demand without stopping the streaming pipeline (watermark-based approach) |
| E5 | **Heartbeat Events** | Emit periodic heartbeat events to advance offsets even when source tables have no writes, preventing WAL retention bloat |

### Out of Scope

- Full ETL pipeline with complex business logic transformations (handled by downstream processing)
- Bi-directional replication / conflict resolution (handled by multi-master replication layers)
- Application-level event sourcing framework (CDC captures database-level changes, not domain events)
- Data quality validation or data governance policies (handled by data catalog / governance tools)

---

## Non-Functional Requirements

### CAP Theorem Choice

**AP with exactly-once goal** — The CDC pipeline prioritizes availability (connectors must keep capturing even during downstream outages) and partition tolerance (source and sink may be in different networks). Consistency is achieved through idempotent delivery and offset management rather than distributed transactions.

| Property | Choice | Justification |
|----------|--------|---------------|
| Consistency | Eventual (exactly-once via idempotency) | Events may be delivered at-least-once during failures; idempotent consumers and deduplication ensure exactly-once processing |
| Availability | High — capture must not stop | CDC connectors must continue reading the transaction log even when downstream sinks are temporarily unavailable; events buffer in the streaming platform |
| Partition Tolerance | Required | Source databases, CDC platform, and sink systems are often in different failure domains |

### Performance Targets

| Metric | Target | Context |
|--------|--------|---------|
| End-to-end latency (commit → consumer) | < 500 ms (p50), < 2s (p99) | Time from source commit to event availability at consumer |
| Capture throughput | > 100K events/sec per connector | Sustained capture rate from a single source database |
| Snapshot throughput | > 50K rows/sec per table | Initial load speed for tables with millions of rows |
| Sink delivery throughput | > 200K events/sec aggregate | Total delivery rate across all sinks |
| Offset commit latency | < 100 ms | Time to durably persist connector offset |
| Connector restart time | < 10 seconds | Time from connector crash to resumed capture |
| Schema propagation delay | < 5 seconds | Time from DDL execution on source to schema update in registry |

### Durability & Availability

| Metric | Target |
|--------|--------|
| Availability | 99.99% (52.6 min/year downtime) |
| Durability (events) | 99.999999999% (11 nines) via replicated streaming platform |
| RPO | 0 events (no committed change lost) |
| RTO | < 30 seconds (connector failover) |

---

## Capacity Estimations (Back-of-Envelope)

### Scenario: E-Commerce Platform with Microservices

A large e-commerce platform with 50 microservices, each owning its own database, generating real-time change feeds for search indexing, analytics, cache invalidation, and cross-service synchronization.

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| Source databases | 50 | 50 microservice databases (PostgreSQL, MySQL mix) |
| Tables monitored | 500 | ~10 tables per service |
| Average row mutations/sec | 100K | 50 services x 2K mutations/sec average |
| Peak row mutations/sec | 500K | 5x average during flash sales |
| Average event size | 1 KB | JSON envelope with before/after images, metadata |
| Peak event size | 10 KB | Large JSON/text columns |
| Event throughput (average) | 100 MB/sec | 100K events/sec x 1 KB |
| Event throughput (peak) | 500 MB/sec | 500K events/sec x 1 KB |
| Daily event volume | 8.6B events | 100K/sec x 86,400 seconds |
| Daily data volume | 8.6 TB | 8.6B events x 1 KB average |
| Retention (streaming platform) | 7 days | Hot storage for consumer replay |
| Storage (streaming platform) | 60 TB | 8.6 TB/day x 7 days |
| Replication factor | 3 | Standard for durability |
| Total storage (with replication) | 180 TB | 60 TB x 3 replicas |
| Connectors | 50 | One per source database |
| Connector workers | 20 | Distributed across connect cluster (2-3 connectors per worker) |
| Snapshot storage (temp) | 500 GB | Largest table: 500M rows x 1 KB |
| Schema registry entries | 5,000 | 500 tables x ~10 schema versions average |

### Infrastructure Summary

```
Source Databases:     50 (mixed PostgreSQL / MySQL)
Connector Workers:   20 machines (8 vCPU, 32 GB RAM each)
Streaming Platform:  12 brokers (16 vCPU, 64 GB RAM, 15 TB SSD each)
Schema Registry:     3 instances (HA cluster)
Total Storage:       ~180 TB (replicated)
Network Bandwidth:   10 Gbps between connector workers and brokers
```

---

## SLOs / SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | 99.99% | Percentage of time CDC pipeline is actively capturing and delivering changes |
| End-to-End Latency (p99) | < 2 seconds | From source commit to consumer-readable event |
| Event Loss Rate | 0% | No committed changes lost (verified by offset audit) |
| Duplicate Rate | < 0.01% | Percentage of duplicate events delivered to consumers (after dedup) |
| Connector Recovery Time | < 30 seconds | Time from connector failure to resumed capture on failover instance |
| Snapshot Completion | < 4 hours | Full snapshot of largest table (500M rows) |
| Schema Propagation | < 5 seconds | DDL change detection to schema registry update |
| Throughput | > 100K events/sec | Sustained per-connector capture rate |

---

## Read/Write Ratio Analysis

| Pipeline Segment | Read:Write | Dominant Operation |
|-----------------|------------|-------------------|
| Log capture (source) | Read-only | CDC reads WAL/binlog; zero writes to source |
| Event streaming (broker) | 1:1 | Each event is written once and read by 1-N consumers |
| Offset management | 100:1 read of offsets at startup; periodic writes | Offsets written every few seconds; read on restart |
| Schema registry | 50:1 | Schema lookups per event; schema writes only on DDL changes |
| Sink delivery | Write-heavy | Consumers read events and write to target stores |

**Overall: The CDC pipeline is read-heavy at the source (zero-impact log tailing) and write-heavy at the sink (materializing changes into downstream stores).**
