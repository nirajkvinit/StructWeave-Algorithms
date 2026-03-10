# 16.8 Design a Change Data Capture (CDC) System

## Overview

A Change Data Capture (CDC) system is a data integration pattern that detects and captures row-level changes — inserts, updates, and deletes — from a database's transaction log and delivers them as an ordered stream of events to downstream consumers. Rather than polling tables for differences or relying on application-level dual writes, CDC tails the database's own write-ahead log (WAL in PostgreSQL) or binary log (binlog in MySQL), the same mechanism the database uses for crash recovery and replication. This approach adds zero query load to the source, preserves the exact transaction ordering, captures changes that bypass application code (schema migrations, manual fixes), and makes every downstream system — search indexes, caches, data warehouses, materialized views — a deterministic function of the source of truth. CDC has become the backbone of event-driven microservice architectures, powering the outbox pattern, CQRS projections, real-time analytics, and cross-system consistency without distributed transactions.

## Key Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Write-driven, read-propagating** | The system is activated by source database writes; its output feeds read-optimized downstream stores |
| **Low-latency streaming** | End-to-end change propagation typically achieves sub-second latency (50-500ms from commit to downstream delivery) |
| **Exactly-once semantic goal** | The pipeline must guarantee that each source change appears exactly once in every downstream consumer, despite at-least-once transport |
| **Schema-aware** | Change events carry both data and schema metadata; the system must handle DDL changes (column adds, renames, type changes) without data loss |
| **Ordered and transactional** | Events must preserve per-table ordering and, ideally, transaction boundaries so downstream consumers can reconstruct consistent database states |
| **Stateful with checkpoint** | Connectors maintain offset positions (log sequence numbers) enabling exactly-once restart after crash or rebalancing |
| **Heterogeneous source/sink** | A single CDC platform typically captures from multiple database engines and delivers to multiple sink types (message brokers, search engines, caches, lakes) |

## Complexity Rating: **High**

Designing a production CDC system requires deep understanding of database internals (WAL structure, logical decoding, binlog formats), distributed offset management, schema evolution across decoupled producers and consumers, the snapshot-to-streaming handoff problem (ensuring no duplicates or gaps when transitioning from initial load to live streaming), and exactly-once delivery semantics in the face of connector restarts and rebalancing. The system sits at the intersection of database replication, distributed streaming, and schema governance.

## Quick Links

| # | Section | Description |
|---|---------|-------------|
| 01 | [Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| 02 | [High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| 03 | [Low-Level Design](./03-low-level-design.md) | Data model, API design, core algorithms (pseudocode) |
| 04 | [Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | WAL retention, schema evolution, snapshot-to-streaming handoff |
| 05 | [Scalability & Reliability](./05-scalability-and-reliability.md) | Horizontal scaling, connector failover, disaster recovery |
| 06 | [Security & Compliance](./06-security-and-compliance.md) | WAL access control, PII masking, GDPR considerations |
| 07 | [Observability](./07-observability.md) | Replication lag, connector health, dashboards, alerting |
| 08 | [Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-off frameworks |
| 09 | [Insights](./09-insights.md) | Key architectural insights and non-obvious lessons |

## Technology Landscape

| Category | Representative Systems | Approach |
|----------|----------------------|----------|
| Log-Based CDC Platform | Debezium, Maxwell, Canal | Tail database transaction logs via logical decoding / binlog; emit structured change events |
| Managed CDC Service | Cloud-native DMS, Fivetran, Airbyte | Fully managed connectors with auto-scaling and monitoring |
| Watermark-Based CDC | Netflix DBLog | Interleave WAL events with table selects using watermark tokens for non-blocking snapshots |
| Embedded CDC Library | Debezium Engine, pg_logical | In-process CDC without external infrastructure (no message broker dependency) |
| Streaming Platform | Apache Kafka, Redpanda, Apache Pulsar | Durable, partitioned log that stores and distributes CDC events to consumers |
| Schema Registry | Confluent Schema Registry, Apicurio | Centralized schema versioning, compatibility enforcement (Avro, Protobuf, JSON Schema) |
| CDC-Native Databases | CockroachDB Changefeeds, TiDB TiCDC, Spanner Change Streams | Built-in CDC as a first-class database feature |

## Key Concepts Referenced

- **Write-Ahead Log (WAL)** — Database durability mechanism that logs every mutation before applying it; CDC reads this log instead of querying tables
- **Logical Decoding** — PostgreSQL feature that decodes WAL entries into human-readable change events via output plugins
- **Binary Log (binlog)** — MySQL's row-based replication log that records every row-level mutation
- **Outbox Pattern** — Application writes domain events to an outbox table within the same transaction as business data; CDC captures the outbox table for reliable event publishing
- **Offset / Log Sequence Number (LSN)** — Position marker in the transaction log used to track CDC progress and enable restart without data loss
- **Schema Registry** — Centralized service that stores and validates event schemas, enforcing compatibility rules across versions
- **Snapshot** — Point-in-time full table read used for initial load before streaming begins; must be consistent with the streaming start position
- **Exactly-Once Semantics** — Guarantee that each source change is delivered and processed exactly once, achieved through idempotent writes and transactional offset commits
