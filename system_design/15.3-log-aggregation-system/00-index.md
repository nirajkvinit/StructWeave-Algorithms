# 15.3 Design a Log Aggregation System

## System Overview

A log aggregation system is a distributed infrastructure platform that collects, transports, indexes, stores, and searches machine-generated log data from thousands of heterogeneous sources at terabyte-per-day scale. The core engineering challenge is building an ingestion-indexing-search pipeline that can absorb bursty, schema-diverse log streams at millions of events per second, index them for sub-second interactive queries, and retain petabytes of historical data across cost-optimized storage tiers---all while maintaining the reliability guarantees expected of the system that engineers depend on when every other system is broken. Unlike metrics (fixed-schema, numeric, append-only) or traces (structured spans with parent-child relationships), logs are the most unstructured and highest-volume signal in the observability stack: free-text messages with varying formats (JSON, logfmt, plain text, multiline stack traces), unpredictable schemas that change with every deployment, and cardinality patterns driven by the content of the messages themselves rather than by pre-declared label dimensions. Production log platforms like Elasticsearch/ELK process hundreds of billions of events daily at Netflix (~500B events/day, 1.3 PB/day), Splunk powers enterprise security analytics across regulated industries, Grafana Loki pioneered the "index metadata, grep content" approach to dramatically reduce indexing costs, and CrowdStrike's LogScale demonstrated that bloom-filter-based search can achieve sub-second latency at petabyte scale without traditional inverted indexes. The defining architectural tension in log aggregation is the three-way trade-off between ingestion throughput, search speed, and storage cost---where indexing everything maximizes search speed but explodes storage and slows ingestion, indexing nothing minimizes cost but makes search unacceptably slow, and the winning strategy is to index selectively based on access patterns and query frequency.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Write Pattern** | Extremely write-heavy (100:1 to 1000:1 write-to-read ratio); append-only with no updates or deletes of individual records; bursty ingestion correlated with incidents, deployments, and traffic spikes; schema diversity across sources means each log line may have different fields |
| **Data Model** | Semi-structured event records: required fields (timestamp, severity, message, source) plus arbitrary key-value attributes; trace correlation IDs for cross-signal joining; no fixed schema---fields vary by service, version, and even individual log statement |
| **Query Pattern** | Interactive needle-in-haystack search ("find all errors from service X containing 'timeout' in the last hour"); ad-hoc aggregation ("count errors by service per minute for the last day"); pattern analysis ("show me log patterns that appeared only during the incident window"); tail/live streaming ("follow logs from pod Y in real time") |
| **Indexing Strategy** | The defining architectural choice: full-text inverted index (Elasticsearch---fast search, expensive storage), label-only index (Loki---cheap storage, slow full-text search), bloom-filter-guided scan (LogScale---fast search, fast ingestion, moderate storage), or columnar with sparse index (ClickHouse---fast aggregations, moderate full-text search) |
| **Storage Tiering** | Hot tier (SSD, 1-7 days, active indexing and querying), warm tier (HDD, 7-30 days, read-only), cold tier (object storage with searchable snapshots, 30-365 days), frozen/archive tier (object storage, 1-7 years, on-demand rehydration) |
| **Compliance Sensitivity** | Logs contain PII (usernames, IPs, email addresses), secrets (accidentally logged API keys, tokens), and security-relevant events (authentication, authorization); requires real-time PII redaction, retention policies per data classification, and tamper-evident audit trails |
| **Correlation Requirement** | Must correlate with metrics and traces via shared identifiers (trace ID, span ID, request ID) to enable unified observability; the log entry is often the only signal that explains *why* a metric anomaly or trace error occurred |

---

## Quick Navigation

| Document | Focus |
|---|---|
| [01 --- Requirements & Estimations](./01-requirements-and-estimations.md) | Functional requirements, capacity math for TB/day ingestion, SLOs |
| [02 --- High-Level Design](./02-high-level-design.md) | Architecture, write path, read path, indexing pipeline, key decisions |
| [03 --- Low-Level Design](./03-low-level-design.md) | Log data model, inverted index internals, API design, query language |
| [04 --- Deep Dives & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Indexing engine, ingestion backpressure, storage compaction, race conditions |
| [05 --- Scalability & Reliability](./05-scalability-and-reliability.md) | Horizontal scaling, sharding, replication, multi-region, disaster recovery |
| [06 --- Security & Compliance](./06-security-and-compliance.md) | PII redaction pipeline, access control, encryption, compliance frameworks |
| [07 --- Observability](./07-observability.md) | Meta-observability: monitoring the log system itself, self-referential challenges |
| [08 --- Interview Guide](./08-interview-guide.md) | 45-min pacing, indexing trade-off traps, cost optimization discussion, scoring rubric |
| [09 --- Insights](./09-insights.md) | 8 non-obvious architectural insights unique to log aggregation systems |

---

## Complexity Rating: **Very High**

| Dimension | Rating | Justification |
|---|---|---|
| Data Model Complexity | High | Semi-structured, schema-on-read data with unbounded field cardinality; multiple indexing strategies with fundamentally different trade-offs; text analysis (tokenization, stemming, n-grams) adds linguistic complexity |
| Write Path | Very High | Millions of events/second ingestion; must handle backpressure gracefully across collector-buffer-indexer pipeline; parsing and structuring happen at write time; schema conflicts across heterogeneous sources |
| Read/Query Path | Very High | Full-text search across petabytes; query language design (filtering, aggregation, pattern matching); sub-second latency for recent data, seconds-to-minutes for historical cold-tier data; query fan-out across distributed shards |
| Storage Architecture | Very High | Multi-tier storage with automatic lifecycle management; index-to-raw-data ratio varies 100x across indexing strategies; compression optimization is domain-specific; retention policies per tenant and data classification |
| Operational Complexity | Very High | The log system is the system engineers use to debug all other systems---its failure is uniquely catastrophic; self-referential monitoring problem; cost management requires continuous optimization of what to index vs. store vs. discard |

---

## What Differentiates Naive vs. Production

| Dimension | Naive Approach | Production Reality |
|---|---|---|
| **Ingestion** | HTTP endpoint that accepts one log event per request, writes synchronously to database, returns success; no buffering, no backpressure, no batching | Multi-layer pipeline: lightweight agents (Fluent Bit, OTel Collector) on every host with local filesystem buffering; durable message queue (Kafka) as a decoupling buffer absorbing TB/hour bursts; stream processors for parsing, enrichment, and routing; backpressure propagation from indexers through queue to agents with configurable drop/buffer policies |
| **Indexing** | Index every field of every log event identically using a general-purpose full-text index; no distinction between high-value and low-value fields; index configuration is static and global | Selective indexing strategy: high-cardinality fields (trace ID, request ID) indexed for exact match; low-cardinality fields (severity, service, region) indexed for filtering and aggregation; message body either full-text indexed (Elasticsearch), label-indexed-only with brute-force grep (Loki), or bloom-filtered (LogScale); index configuration per data stream based on access patterns and cost constraints |
| **Storage** | Store all logs on the same storage tier (SSD) indefinitely; delete entire indices when disk is full; no compression beyond generic filesystem-level | Four-tier storage with automated lifecycle management: hot (SSD, 1-7 days, fully indexed), warm (HDD, force-merged and read-only), cold (object storage with searchable snapshots), frozen (deep archive with on-demand rehydration); compression tuned per column (timestamps: delta-of-delta, severity: dictionary encoding, message: LZ4/ZSTD); typical 10-20x compression on raw log data |
| **Search** | Single-threaded sequential scan through all stored events; no query optimization, no caching, no parallelism; timeout or OOM on large time ranges | Distributed query execution: query planner decomposes query into shard-level subqueries; parallel execution across index shards with scatter-gather; segment-level pruning via min/max timestamp ranges; query result caching for repeated queries; bloom filter pre-filtering to skip irrelevant data blocks; memory-limited execution with spilling to disk for large aggregations |
| **Schema** | Require all services to use the same log format; reject or drop logs that don't match the expected schema; no schema evolution support | Schema-on-read: accept any format (JSON, logfmt, plain text, multiline); parsing pipelines extract structure at ingestion time or query time; type conflict resolution (same field as string in one service, integer in another); dynamic field mapping with configurable type coercion; schema registry for structured log definitions |
| **Multi-Tenancy** | Single namespace for all logs; no isolation between teams or services; one team's verbose debug logging consumes storage and degrades query performance for everyone | Tenant-isolated data streams: per-tenant ingestion quotas (GB/day) and rate limits (events/second); separate index namespaces with independent retention policies; query-time resource isolation (per-tenant concurrency limits, memory quotas); cost attribution and chargeback per team/service/environment |
| **Reliability** | If the log system is down, logs are silently dropped; no buffering, no retry, no acknowledgment; data loss is discovered only when an engineer searches for logs that aren't there | At-least-once delivery guarantee: agents buffer to local disk on network failure; Kafka provides durable, replayable buffering; indexers acknowledge only after durable write; dead-letter queues for unparseable events; WAL (write-ahead log) at the indexer for crash recovery; replication factor >= 2 for all indexed data |

---

## What Makes This System Unique

### The Indexing Strategy Is the Architecture

Unlike most systems where the database choice is important but doesn't fundamentally reshape the architecture, in a log aggregation system the indexing strategy *is* the architecture. Choosing full-text inverted indexes (Elasticsearch) means accepting 1.5-3x storage overhead for index data, designing around segment merging bottlenecks, and building for fast arbitrary queries at the cost of expensive writes. Choosing label-only indexing (Loki) means accepting slow full-text searches, designing for cheap object storage backend, and building for cost efficiency at the cost of interactive query speed. Choosing bloom-filter-guided search (LogScale) means accepting probabilistic false positives, designing for massively parallel scan architecture, and building for both fast ingestion and fast search at the cost of implementation complexity. Each choice cascades through every layer of the system: storage format, query language, capacity planning, cost model, and operational procedures.

### Schema Diversity Is the Rule, Not the Exception

A metrics system has a fixed schema (metric name, labels, timestamp, value). A tracing system has a fixed schema (trace ID, span ID, parent ID, operation, duration, tags). A log system has *no* fixed schema. Each microservice logs different fields. Each version of a service may change its log format. A single service may emit JSON logs, plain-text logs, and multiline stack traces. The same field name (`status`) may be a string in one service and an integer in another. This schema diversity is not a bug to be fixed but a fundamental property of log data that the system must embrace through schema-on-read design, type conflict resolution, and dynamic field mapping.

### The System Must Work When Everything Else Is Broken

The log aggregation system has a unique reliability requirement: it must function precisely when every other system is failing. During an incident, log volume spikes 10-100x as error logs flood in, engineers simultaneously query for root cause, and the log system experiences its peak load at the exact moment it is most critical. This creates a paradox: the system must be provisioned for incident-peak capacity (which is idle waste during normal operation) or must gracefully degrade in a way that preserves the most valuable signals (recent error logs from affected services) while shedding lower-priority traffic (debug logs from healthy services).
