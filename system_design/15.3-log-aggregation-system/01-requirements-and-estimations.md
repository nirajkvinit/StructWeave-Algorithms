# 15.3 Requirements & Estimations

## Functional Requirements

### Core Features (In Scope)

1. **Log Ingestion** --- Accept log events from heterogeneous sources (application logs, infrastructure logs, security audit logs) via multiple protocols (OTLP/gRPC, HTTP/JSON, Syslog, file tailing) at millions of events per second
2. **Log Parsing & Structuring** --- Transform unstructured/semi-structured log data into structured, queryable records: timestamp extraction, severity normalization, JSON/logfmt/grok parsing, multiline assembly (stack traces)
3. **Log Indexing** --- Build searchable indexes over ingested log data with configurable granularity: full-text indexing for high-value fields, metadata-only indexing for cost-sensitive streams, bloom-filter acceleration for needle-in-haystack queries
4. **Log Search & Query** --- Interactive search across log data with a query language supporting: field-level filtering, full-text search, regular expressions, aggregations (count, rate, percentiles), time-range windowing, and live tail/streaming
5. **Storage Tiering & Retention** --- Automatically transition log data across storage tiers (hot/warm/cold/frozen) based on age and access patterns, with configurable retention policies per data stream, tenant, and compliance classification
6. **Log Routing & Filtering** --- Route incoming logs to different processing pipelines, indexes, or storage backends based on source, content, severity, or custom rules; drop or sample low-value streams at ingestion time
7. **Alerting on Log Patterns** --- Trigger alerts based on log content: threshold alerts (error count > N in window), pattern-absence alerts (expected heartbeat log not seen), keyword alerts (security-sensitive terms detected)
8. **Correlation** --- Enrich log records with trace IDs, span IDs, and request IDs to enable cross-signal correlation with metrics and distributed traces in the broader observability platform
9. **Multi-Tenancy** --- Isolate log data, quotas, and access between tenants (teams, services, environments) with per-tenant ingestion limits, retention policies, and query resource budgets

### Out of Scope

- Metric collection and time-series storage (covered by 15.1 Metrics & Monitoring System)
- Distributed trace collection and span storage (covered by 15.2 Distributed Tracing System)
- Application Performance Monitoring (APM) correlation UI
- SIEM (Security Information and Event Management) rule engine --- though security log ingestion is in scope
- Real-time log-derived metric generation (e.g., counters from log patterns) --- mentioned but not deep-dived

---

## Non-Functional Requirements

### CAP Theorem & Consistency

| Aspect | Choice | Justification |
|---|---|---|
| CAP Position | **AP** (Availability + Partition Tolerance) | Log ingestion must never block; it is acceptable to have brief search delays (eventual consistency) but unacceptable to lose logs or reject writes during network partitions |
| Consistency Model | **Eventual Consistency** with tunable read-after-write | Ingested logs become searchable within a configurable refresh interval (default 1-5 seconds); during this window, recently ingested logs may not appear in search results; acceptable trade-off for ingestion throughput |
| Durability Guarantee | **At-least-once delivery** from source to durable storage | Logs may be duplicated under failure scenarios (agent retry, Kafka rebalance); deduplication is best-effort, not guaranteed; acceptable because log consumers tolerate duplicates better than gaps |

### Availability

| Tier | Target | Justification |
|---|---|---|
| Ingestion Pipeline | **99.95%** (26 min downtime/year) | Log loss during ingestion downtime is permanent; durable queue buffer provides minutes of tolerance, but sustained outage causes data loss |
| Search/Query | **99.9%** (8.7 hrs downtime/year) | Search degradation during incidents is painful but not catastrophic; cached dashboards and recent-data prioritization provide graceful degradation |
| Alerting | **99.95%** (26 min downtime/year) | Missed log-based alerts during outages can have security implications; redundant alert evaluation paths required |

### Latency Targets

| Operation | p50 | p95 | p99 |
|---|---|---|---|
| Ingestion (source to durable buffer) | 50 ms | 200 ms | 500 ms |
| Ingestion (source to searchable) | 2 s | 5 s | 15 s |
| Search (recent data, < 1 hour window) | 200 ms | 1 s | 3 s |
| Search (warm data, 1-30 day window) | 1 s | 5 s | 15 s |
| Search (cold data, > 30 day window) | 5 s | 30 s | 120 s |
| Live tail (new event to screen) | 500 ms | 2 s | 5 s |
| Alerting rule evaluation | 15 s | 30 s | 60 s |

---

## Capacity Estimations (Back-of-Envelope)

### Assumptions

- Large enterprise / cloud-native platform: 5,000 microservices across 50,000 containers
- Average log volume per container: 500 events/minute (mix of INFO, DEBUG, ERROR)
- Average log event size: 500 bytes (structured JSON with typical fields)
- Peak-to-average ratio: 5x during incidents/deployments
- Retention: 7 days hot, 30 days warm, 90 days cold, 365 days frozen
- Compression ratio: 10x (LZ4 for hot, ZSTD for warm/cold)

### Core Metrics

| Metric | Estimation | Calculation |
|---|---|---|
| **Events/second (average)** | ~417K events/s | 50,000 containers x 500 events/min / 60 |
| **Events/second (peak)** | ~2.1M events/s | 417K x 5 (peak factor) |
| **Raw throughput (average)** | ~200 MB/s | 417K events/s x 500 bytes |
| **Raw throughput (peak)** | ~1 GB/s | 2.1M events/s x 500 bytes |
| **Daily raw volume** | ~17 TB/day | 200 MB/s x 86,400 seconds |
| **Daily compressed volume** | ~1.7 TB/day | 17 TB / 10 (compression ratio) |
| **Hot tier storage (7 days)** | ~12 TB compressed | 1.7 TB/day x 7 days |
| **Warm tier storage (30 days)** | ~51 TB compressed | 1.7 TB/day x 30 days |
| **Cold tier storage (90 days)** | ~153 TB compressed | 1.7 TB/day x 90 days |
| **Frozen tier storage (365 days)** | ~620 TB compressed | 1.7 TB/day x 365 days |
| **Total storage (all tiers)** | ~836 TB compressed | Sum of all tiers |
| **Index storage overhead** | ~2-50 TB (hot tier) | Varies by strategy: 12 TB x 0.15 (label-only) to 12 TB x 4.0 (full-text inverted) |
| **Search QPS (average)** | ~50 queries/s | Engineers, dashboards, alerting rules |
| **Search QPS (during incident)** | ~500 queries/s | 10x surge as engineers investigate |

### Bandwidth Estimation

| Path | Bandwidth | Calculation |
|---|---|---|
| Agent-to-Kafka (ingestion) | ~200 MB/s avg, ~1 GB/s peak | Raw event throughput |
| Kafka-to-Indexers | ~200 MB/s avg | Matches ingestion rate |
| Indexer-to-Hot-Storage writes | ~20-40 MB/s | After compression + indexing |
| Hot-to-Warm tier migration | ~1.7 TB/day batch | Once per day, off-peak |
| Search query fan-out | ~500 MB/s peak | 500 queries/s x 1 MB avg scan per query |

---

## SLOs / SLAs

| Metric | Target | Measurement | Alert Threshold |
|---|---|---|---|
| **Ingestion Availability** | 99.95% | Percentage of time ingestion endpoints accept writes without error | < 99.9% over 5-min window |
| **Data Completeness** | 99.99% | Percentage of emitted log events that appear in search within 60 seconds | < 99.95% over 15-min window |
| **Search Availability** | 99.9% | Percentage of search queries that return results (even partial) within timeout | < 99.5% over 5-min window |
| **Search Latency (hot tier, p99)** | < 3 seconds | 99th percentile latency for queries over data < 1 hour old | p99 > 5s over 5-min window |
| **Ingestion-to-Searchable Lag** | < 15 seconds (p99) | Time from event emission to appearance in search results | p99 > 30s over 5-min window |
| **Alert Evaluation Lag** | < 60 seconds (p99) | Time from log event ingestion to alert firing (if matching rule exists) | p99 > 120s over 5-min window |
| **Data Durability** | 99.999% | Percentage of acknowledged log events that are not lost | Any confirmed data loss |
| **Storage Cost Efficiency** | < $0.50/GB/month (blended) | Average cost per GB across all tiers, amortized monthly | > $0.75/GB/month |

---

## Traffic Patterns & Seasonality

### Daily Pattern
```
Events/sec
2.0M |                    *****
     |                 ***     ***
1.5M |              ***           ***
     |           ***                 ***
1.0M |        ***                       ***
     |     ***                             ***
 500K|  ***         Normal business hours      ***
     |**                                          **
   0 |------------------------------------------------
     00:00  04:00  08:00  12:00  16:00  20:00  24:00
                         UTC
```

### Incident Spike Pattern
- **Trigger**: Service outage, deployment failure, security incident
- **Amplification**: 5-10x baseline within 60 seconds
- **Duration**: 15-120 minutes
- **Composition shift**: ERROR/WARN logs spike from ~5% to ~40% of volume
- **Query spike**: 10x concurrent search load as engineers investigate
- **Critical requirement**: The ingestion spike and query spike are perfectly correlated---the system is under maximum write AND read load simultaneously

### Deployment Wave Pattern
- **Trigger**: Rolling deployment across service fleet
- **Amplification**: 2-3x baseline for 10-30 minutes per service
- **Composition**: Startup/shutdown logs, health check logs, configuration reload logs
- **Key challenge**: Multiple services deploying concurrently can create sustained 3-5x load for hours during deployment windows
