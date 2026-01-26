# Requirements and Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Functionality

| Requirement | Priority | Description |
|-------------|----------|-------------|
| **Feature Registry** | P0 | Define, version, and discover feature schemas and metadata |
| **Offline Store** | P0 | Store historical feature values for training data generation |
| **Online Store** | P0 | Serve latest feature values for real-time inference (<10ms) |
| **Point-in-Time Retrieval** | P0 | Generate training data without data leakage |
| **Batch Materialization** | P0 | Sync features from offline to online store (scheduled) |
| **Feature Transformation** | P1 | Define and execute feature transformations |
| **Streaming Materialization** | P1 | Real-time feature updates via streaming pipelines |
| **Feature Monitoring** | P1 | Track data quality, drift, and staleness |
| **Feature Search** | P2 | Discover features by name, tags, or semantic similarity |
| **Feature Lineage** | P2 | Track feature dependencies and data sources |

### Feature Registry Requirements

```
Feature Definition:
─────────────────────────────────────────────────────────
• Name and description
• Schema (column names, data types)
• Entity keys (e.g., user_id, item_id)
• Event timestamp column
• TTL (time-to-live for online store)
• Tags and metadata for discovery

Supported Operations:
─────────────────────────────────────────────────────────
• CREATE feature view with schema
• UPDATE feature view (schema evolution)
• DELETE feature view (soft delete, retain history)
• SEARCH by name, tag, owner, data source
• VERSION tracking for all changes
```

### Offline Store Requirements

```
Storage:
─────────────────────────────────────────────────────────
• Time-partitioned columnar storage (Parquet, Delta Lake)
• Support for 1B+ entities, PB-scale data
• Point-in-time queries (temporal joins)
• Range queries by entity and time

Retrieval Patterns:
─────────────────────────────────────────────────────────
• Training data generation with timestamps
• Batch scoring with historical features
• Backfill for new features
• Feature exploration and analytics
```

### Online Store Requirements

```
Storage:
─────────────────────────────────────────────────────────
• Key-value storage (Redis, DynamoDB, Cassandra)
• Latest feature values per entity
• Support for 100M+ active entities
• Sub-10ms read latency at p99

Retrieval Patterns:
─────────────────────────────────────────────────────────
• Single entity lookup (e.g., get features for user_123)
• Batch entity lookup (e.g., get features for 100 users)
• Multi-feature-view lookup (combine multiple feature sets)
• Filtered retrieval (only specific features)
```

### Point-in-Time Retrieval Requirements

```
Correctness Guarantees:
─────────────────────────────────────────────────────────
• No data leakage (features only from before event time)
• Handle late-arriving data correctly
• Support event-time semantics (not processing time)
• Reproducible results across runs

Query Interface:
─────────────────────────────────────────────────────────
• Input: Entity DataFrame with (entity_key, event_timestamp)
• Output: Entity DataFrame + feature columns
• Support multiple feature views in single query
• Configurable TTL for feature staleness
```

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Online Store | Offline Store | Rationale |
|--------|--------------|---------------|-----------|
| **Latency (p50)** | <5ms | <1 min | Online for inference, offline for training |
| **Latency (p99)** | <10ms | <5 min | Tail latency critical for online |
| **Throughput** | 100K QPS | 1M rows/min | Peak inference vs batch training |
| **Batch Size** | 1-1000 entities | 1M+ rows | Online batching vs training datasets |

### Availability & Reliability

| Metric | Online | Offline | Rationale |
|--------|--------|---------|-----------|
| **Availability** | 99.99% (52 min/year) | 99.9% (8.76h/year) | Online is critical path for inference |
| **Durability** | 99.99% | 99.9999999% | Online can be rebuilt, offline is source of truth |
| **RTO** | <5 min | <1 hour | Fast failover for online |
| **RPO** | <1 min | <1 hour | Minimal data loss |

### Scalability Requirements

| Dimension | Target | Growth Strategy |
|-----------|--------|-----------------|
| **Feature Definitions** | 10,000 | Registry horizontal scaling |
| **Entities (Offline)** | 1 billion | Time partitioning, sharding by entity |
| **Entities (Online)** | 100 million active | Sharding by entity key |
| **Features per Entity** | 1,000 | Columnar storage, selective retrieval |
| **QPS (Online)** | 100,000 | Replica scaling, caching |
| **Daily Materialization Volume** | 10 TB | Incremental processing |

### Freshness Requirements

| Tier | Target Freshness | Use Case | Cost |
|------|-----------------|----------|------|
| **Real-Time** | <1 minute | Fraud detection, real-time recommendations | $$$ |
| **Near-Real-Time** | <15 minutes | Session-based features, recent activity | $$ |
| **Batch** | <24 hours | User profiles, aggregated metrics | $ |
| **Static** | Days-Weeks | Demographics, entity attributes | $ |

---

## Capacity Estimations

### Baseline Assumptions

```
Feature Definitions:
─────────────────────────────────────────────────────────
• Total feature views: 500
• Average features per view: 20
• Total feature columns: 10,000

Entity Scale:
─────────────────────────────────────────────────────────
• Total unique entities (offline): 1 billion
• Active entities (online): 100 million
• Entity types: 5 (user, item, merchant, session, device)

Data Volume:
─────────────────────────────────────────────────────────
• Average feature value size: 8 bytes (numeric)
• Average features retrieved per request: 500
• History depth (offline): 365 days
• Online retention: Latest value only
```

### Storage Calculations

```
Offline Store:
─────────────────────────────────────────────────────────
Entities: 1B
Features: 10,000
Days of history: 365
Bytes per feature: 8 (average)

Raw size: 1B × 10K × 365 × 8 bytes = 29.2 PB (uncompressed)
With compression (~10x): 2.9 PB
With partitioning overhead (~1.2x): 3.5 PB

Daily growth: 1B × 10K × 8 / 10 = 8 TB/day compressed

Online Store:
─────────────────────────────────────────────────────────
Active entities: 100M
Features per entity: 500 (subset of total)
Bytes per feature: 8 + 8 (value + timestamp)

Per entity: 500 × 16 = 8 KB
Total: 100M × 8 KB = 800 GB

With 3x replication: 2.4 TB
With index overhead (~1.5x): 3.6 TB

Feature Registry:
─────────────────────────────────────────────────────────
Feature views: 500 × 10 KB metadata = 5 MB
Version history: 500 × 100 versions × 1 KB = 50 MB
Total (with indexes): ~100 MB
```

### Compute Estimations

```
Materialization (Batch):
─────────────────────────────────────────────────────────
Daily entities to materialize: 100M (full refresh) or 10M (incremental)
Features per entity: 500
Processing rate: 100K entities/min (Spark cluster)

Full refresh: 100M / 100K = 1,000 minutes = ~17 hours
Incremental: 10M / 100K = 100 minutes = ~1.7 hours

Cluster size: 100 cores, 400 GB memory

Materialization (Streaming):
─────────────────────────────────────────────────────────
Events per second: 10,000
Processing latency: <1 minute
Workers: 10 (1,000 events/sec per worker)

Online Serving:
─────────────────────────────────────────────────────────
Peak QPS: 100,000
Latency budget: 10ms
Features per request: 500

Cache hit rate: 30% (common entities)
Backend QPS: 70,000

At 10ms per request: 70K × 0.01 = 700 cores
With connection pooling: 100-200 cores
```

### Cost Estimations (Monthly)

```
Offline Storage:
─────────────────────────────────────────────────────────
Object storage: 3.5 PB × $0.023/GB = $80,500/month
Compute (Spark): 100 cores × $0.10/hour × 720 hours = $7,200/month
Data transfer: Included

Online Storage:
─────────────────────────────────────────────────────────
Managed key-value (DynamoDB-style):
  Storage: 3.6 TB × $0.25/GB = $900/month
  Read capacity: 100K RPS × $0.00013 = $1,123/hour = $800K/month

Self-hosted (Redis cluster):
  Instances: 10 × r6g.4xlarge × $0.80/hour = $5,760/month
  Storage: Included (in-memory)

Compute (APIs, Services):
─────────────────────────────────────────────────────────
Feature serving: 20 × c6g.xlarge × $0.15/hour = $2,160/month
Registry API: 3 × m6g.large × $0.08/hour = $173/month
Materialization scheduler: 2 × m6g.medium = $58/month

Total Monthly Cost:
─────────────────────────────────────────────────────────
Economy (self-hosted online, minimal redundancy):
• Offline storage: $80,500
• Offline compute: $7,200
• Online storage: $5,760
• API compute: $2,400
• Total: ~$96,000/month

Enterprise (managed online, high redundancy):
• Offline storage: $160,000 (2x redundancy)
• Offline compute: $15,000
• Online storage: $25,000 (provisioned capacity)
• API compute: $10,000
• Total: ~$210,000/month
```

---

## Traffic Patterns

### Online Store Traffic

```
Time-based patterns:
─────────────────────────────────────────────────────────
• Peak hours: 9am-11pm (3x average) - user activity
• Off-peak: 2am-6am (0.2x average)
• Burst: Marketing campaigns, sales events (5x normal)

Query patterns:
─────────────────────────────────────────────────────────
• Single entity lookup: 60%
• Batch lookup (10-100 entities): 35%
• Large batch (100+ entities): 5%

Entity popularity (Zipf distribution):
─────────────────────────────────────────────────────────
• Top 1% entities: 30% of requests
• Top 10% entities: 70% of requests
• Long tail: 30% of requests, 90% of entities
```

### Offline Store Traffic

```
Batch patterns:
─────────────────────────────────────────────────────────
• Training data generation: 3-5 large jobs/day
• Backfill jobs: 1-2/week
• Ad-hoc exploration: 20-50 queries/day

Job sizes:
─────────────────────────────────────────────────────────
• Small (exploration): <1M rows, <10 features
• Medium (model training): 10M-100M rows, 50-200 features
• Large (full backfill): 1B+ rows, all features
```

### Materialization Traffic

```
Batch materialization:
─────────────────────────────────────────────────────────
• Frequency: Daily (most features), hourly (high-priority)
• Volume: 10-100M entity updates per job
• Window: 2am-6am (off-peak)

Streaming materialization:
─────────────────────────────────────────────────────────
• Events per second: 1K-100K
• Latency: <1 minute end-to-end
• Continuous: 24/7
```

---

## SLO Definitions

### Online Store SLOs

| Metric | Target | Error Budget (monthly) |
|--------|--------|------------------------|
| **Availability** | 99.99% | 4.3 minutes |
| **Latency p50** | <5ms | N/A |
| **Latency p99** | <10ms | N/A |
| **Latency p99.9** | <50ms | N/A |
| **Error Rate** | <0.01% | 0.01% of requests |

### Offline Store SLOs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Query Success Rate** | 99.9% | Per query |
| **PIT Query Latency** | <5 min for 10M rows | End-to-end |
| **Data Freshness** | <24h for batch features | Max staleness |
| **Backfill SLA** | <4 hours for 1 year | Full history |

### Materialization SLOs

| Tier | Freshness | Success Rate | Latency |
|------|-----------|--------------|---------|
| **Real-Time** | <1 min | 99.9% | p99 <30s |
| **Near-Real-Time** | <15 min | 99.5% | p99 <10 min |
| **Batch** | <24h | 99% | N/A |

### Data Quality SLOs

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| **Feature Completeness** | >99.9% | Non-null rate |
| **Feature Staleness** | Within TTL | % entities with fresh data |
| **Schema Compliance** | 100% | Type validation |
| **Drift Detection** | Alert within 1h | Distribution shift >3σ |

---

## Constraints & Assumptions

### Technical Constraints

```
Infrastructure:
─────────────────────────────────────────────────────────
• Cloud provider: Single cloud (multi-region)
• Data lake format: Parquet or Delta Lake
• Streaming platform: Kafka-compatible
• Compute: Spark for batch, Flink for streaming

Data:
─────────────────────────────────────────────────────────
• Entity key cardinality: <1B unique keys
• Feature value types: Numeric, string, list, map
• Max feature list length: 1000 elements
• Timestamp precision: Milliseconds
```

### Business Constraints

```
Compliance:
─────────────────────────────────────────────────────────
• PII features: Encryption at rest and in transit
• GDPR: Feature deletion within 30 days
• Audit logging: All access logged for 1 year
• Access control: Team-based permissions

Operational:
─────────────────────────────────────────────────────────
• Maintenance windows: <1h/month
• Schema changes: Backward compatible
• Feature deprecation: 90-day notice
• SLA reporting: Monthly
```

### Assumptions

```
Usage patterns:
─────────────────────────────────────────────────────────
• 80% of inference uses <100 features
• 20% of features account for 80% of reads
• Most features are numeric (80%)
• Feature freshness tolerance varies by use case

Growth:
─────────────────────────────────────────────────────────
• 20% feature growth per year
• 50% entity growth per year
• 100% QPS growth per year
```

---

## Capacity Planning Matrix

| Scale | Features | Online Entities | QPS | Offline Storage | Monthly Cost |
|-------|----------|-----------------|-----|-----------------|--------------|
| **Startup** | 100 | 1M | 1K | 10 TB | $5K |
| **Growth** | 1,000 | 10M | 10K | 100 TB | $25K |
| **Scale** | 10,000 | 100M | 100K | 1 PB | $100K |
| **Enterprise** | 50,000 | 1B | 1M | 10 PB | $500K |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Initial requirements and estimations |
