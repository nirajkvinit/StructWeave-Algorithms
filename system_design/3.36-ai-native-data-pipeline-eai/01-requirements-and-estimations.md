# Requirements & Capacity Estimations

## Functional Requirements

### Core Capabilities (In Scope)

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Multi-Source Ingestion** | Connect to databases, APIs, files, streaming sources | P0 |
| **AI Schema Discovery** | Automatically discover and infer source schemas | P0 |
| **Autonomous Schema Mapping** | Map source → target fields with confidence scoring | P0 |
| **Schema Drift Handling** | Detect and adapt to upstream schema changes | P0 |
| **AI-Powered Transformations** | Generate transformations from natural language | P0 |
| **Self-Healing Pipelines** | Detect failures, diagnose root cause, auto-remediate | P0 |
| **Anomaly Detection** | Monitor freshness, volume, distribution, schema changes | P0 |
| **Data Quality Scoring** | Calculate and track multi-dimensional quality metrics | P0 |
| **Column-Level Lineage** | Track data flow from source to destination | P1 |
| **AI Connector Generation** | Create connectors from API specs or prompts | P1 |
| **LLM Data Enrichment** | Enrich data using language model reasoning | P1 |
| **Medallion Architecture** | Organize data in Bronze/Silver/Gold layers | P1 |
| **Reverse ETL** | Push processed data back to operational systems | P2 |

### Out of Scope

| Exclusion | Rationale |
|-----------|-----------|
| Data visualization/BI | Handled by downstream tools (Tableau, Looker) |
| ML model training | Separate MLOps platform concern |
| Real-time stream processing (<100ms) | Use dedicated streaming platforms |
| Data governance policy definition | Handled by data catalog/governance tools |
| Manual data entry/correction | Focus on automated pipelines |

---

## Non-Functional Requirements

### CAP Theorem Choice

| Component | CAP Choice | Justification |
|-----------|------------|---------------|
| **Ingestion Layer** | AP | Availability critical; eventual consistency acceptable |
| **Orchestration** | AP | Pipeline execution must continue; state reconciliation async |
| **Quality Gates** | CP | Data quality validation requires consistency |
| **Metadata Catalog** | CP | Schema and lineage require strong consistency |
| **Anomaly Detection** | AP | Alerts can tolerate brief inconsistency |

### Consistency Model

| Data Type | Consistency | Rationale |
|-----------|-------------|-----------|
| Raw data (Bronze) | Eventual | Append-only, reconciliation at Silver |
| Cleaned data (Silver) | Strong | Quality gates enforce validation |
| Curated data (Gold) | Strong | Business-critical, analytics-ready |
| Pipeline metadata | Strong | Configuration must be consistent |
| Quality metrics | Eventual | Aggregates can lag slightly |
| Lineage graph | Eventually Strong | Computed async, but must converge |

### Availability Targets

| Component | Target | Justification |
|-----------|--------|---------------|
| Pipeline execution | 99.9% | Critical for data freshness SLAs |
| Schema mapping service | 99.5% | Degradation acceptable (fallback to manual) |
| Anomaly detection | 99.9% | Missing anomalies has high cost |
| Self-healing controller | 99.9% | Core to autonomous operation |
| API gateway | 99.95% | Client-facing, high expectation |

### Latency Targets

| Operation | p50 | p95 | p99 | Context |
|-----------|-----|-----|-----|---------|
| Batch ingestion (per table) | 1 min | 3 min | 5 min | Full table sync |
| CDC event processing | 200ms | 500ms | 1s | Real-time capture |
| Schema inference | 5s | 15s | 30s | Per source table |
| Schema mapping (embedding) | 50ms | 100ms | 200ms | Per field |
| Schema mapping (LLM) | 500ms | 1.5s | 3s | Per ambiguous field |
| NL-to-SQL generation | 1s | 3s | 5s | Per transformation |
| Anomaly detection | 30s | 1 min | 3 min | Per metric check |
| Quality scoring | 100ms | 500ms | 1s | Per record batch |
| Self-healing remediation | 10s | 30s | 1 min | Per failure |

### Durability Guarantees

| Data Type | Durability | Implementation |
|-----------|------------|----------------|
| Raw ingested data | 99.9999% | Replicated object storage |
| Processed data | 99.9999% | Iceberg tables with snapshots |
| Pipeline metadata | 99.999% | Distributed database with replication |
| Quality metrics | 99.99% | Time-series database with retention |
| Lineage data | 99.999% | Graph database with replication |

---

## Capacity Estimations

### Assumptions

| Parameter | Value | Basis |
|-----------|-------|-------|
| Number of data sources | 1,000 | Mid-large enterprise |
| Average data per source (daily) | 10 GB | Mix of transactional and event data |
| CDC events per source | 10K/minute | Active transactional systems |
| Schema changes per source/month | 2 | Typical enterprise cadence |
| Anomaly checks per source | 10/hour | Freshness, volume, distribution |
| Transformations per pipeline | 50 | Typical complexity |
| Active pipelines | 500 | Covering primary use cases |
| Concurrent pipeline executions | 100 | Peak parallelism |

### Data Volume Estimations

| Metric | Calculation | Daily Value | Monthly Value |
|--------|-------------|-------------|---------------|
| Total data ingested | 1,000 sources × 10 GB | **10 TB** | 300 TB |
| CDC events | 1,000 × 10K × 60 × 24 | **14.4 B events** | 432 B events |
| CDC event size (avg) | 500 bytes per event | **7.2 TB** | 216 TB |
| Bronze layer (raw) | 10 TB × 1.2 (overhead) | **12 TB** | 360 TB |
| Silver layer (cleaned) | 10 TB × 0.8 (dedup) | **8 TB** | 240 TB |
| Gold layer (aggregated) | 8 TB × 0.3 (aggregation) | **2.4 TB** | 72 TB |

### Operations Estimations

| Metric | Calculation | Value |
|--------|-------------|-------|
| Schema discoveries | 1,000 sources × (initial + 2 changes/month) | 1,060/month |
| Schema mappings (fields) | 1,060 schemas × 50 fields avg | 53K fields/month |
| LLM disambiguation calls | 53K × 10% low-confidence | 5.3K calls/month |
| Transformations executed | 500 pipelines × 50 transforms × 24 | 600K/day |
| Anomaly checks | 1,000 sources × 10 checks × 24 | 240K/day |
| Self-healing interventions | 240K × 5% anomaly rate × 78% auto-heal | 9.4K/day |
| Quality scores computed | 10 TB / 100 KB × 24 | 2.4 B/day |

### QPS Estimations

| Operation | Calculation | QPS (avg) | QPS (peak) |
|-----------|-------------|-----------|------------|
| CDC event ingestion | 14.4 B / 86400 | 167K | 500K |
| Quality score computation | 2.4 B / 86400 | 28K | 84K |
| Anomaly check queries | 240K / 86400 | 2.8 | 50 |
| Schema mapping requests | 53K / 30 / 86400 | 0.02 | 10 |
| Pipeline API calls | 500 × 10 / 3600 | 1.4 | 50 |
| Lineage queries | 1000 / hour | 0.3 | 10 |

### Storage Estimations

| Storage Type | Year 1 | Year 3 | Year 5 |
|--------------|--------|--------|--------|
| Bronze (raw data) | 360 TB × 1.1 = **396 TB** | 396 × 3 = 1.2 PB | 2 PB |
| Silver (cleaned) | 240 TB × 1.1 = **264 TB** | 792 TB | 1.3 PB |
| Gold (curated) | 72 TB × 1.1 = **79 TB** | 237 TB | 395 TB |
| Metadata/catalog | 10 TB | 30 TB | 50 TB |
| Quality metrics | 5 TB | 15 TB | 25 TB |
| Lineage graph | 2 TB | 6 TB | 10 TB |
| **Total** | **756 TB** | **2.3 PB** | **3.8 PB** |

### Compute Estimations

| Component | Calculation | Units Required |
|-----------|-------------|----------------|
| Ingestion workers | 10 TB / 1 GB/worker/hour | 400 worker-hours/day |
| CDC processors | 500K events/s peak / 50K/processor | 10 processors |
| Transformation compute | 600K transforms × 10s / 3600 | 1,700 vCPU-hours/day |
| Anomaly detection | 240K checks × 1s / 3600 | 67 vCPU-hours/day |
| LLM inference | 5.3K calls × $0.01 | $53/month |
| Schema mapping (embedding) | 53K × 0.1s / 3600 | 1.5 vCPU-hours/month |

---

## SLOs and SLAs

### Service Level Objectives

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| **Pipeline Availability** | 99.9% | Monthly |
| **Data Freshness (batch)** | <6 hours | Per pipeline |
| **Data Freshness (CDC)** | <5 minutes | Per source |
| **Schema Mapping Accuracy** | >95% | Per discovery |
| **Self-Healing Success Rate** | >85% | For auto-remediable failures |
| **Anomaly Detection Latency** | <5 minutes | From occurrence to alert |
| **Quality Score Coverage** | 100% | All ingested data scored |
| **False Positive Rate (anomalies)** | <5% | Monthly |
| **Human Intervention Rate** | <30% | For pipeline issues |
| **Lineage Completeness** | >99% | Column-level coverage |

### SLA Tiers

| Tier | Availability | Freshness | Support Response |
|------|--------------|-----------|------------------|
| **Critical** | 99.99% | <1 hour | 15 minutes |
| **High** | 99.9% | <4 hours | 1 hour |
| **Standard** | 99.5% | <24 hours | 4 hours |
| **Low** | 99% | <48 hours | Next business day |

### Error Budget

| SLO | Target | Monthly Budget | Burn Rate Alert |
|-----|--------|----------------|-----------------|
| Pipeline Availability (99.9%) | 43.2 min downtime | 21.6 min/2 weeks | >2x budget |
| Data Freshness | 99% within SLA | 1% delayed | >1.5% in 6h |
| Self-Healing Rate | 85% | 15% escalation | >20% escalation |

---

## Compliance Requirements

### Data Residency

| Region | Requirement | Implementation |
|--------|-------------|----------------|
| EU (GDPR) | Data must stay in EU | Regional storage, EU compute |
| US (HIPAA) | PHI handling controls | Encryption, audit logs |
| Global | Data sovereignty | Multi-region deployment |

### Audit Requirements

| Requirement | Implementation |
|-------------|----------------|
| All data access logged | Immutable audit log |
| Transformation history | Version-controlled lineage |
| Schema change tracking | Metadata versioning |
| Quality decision audit | Decision reasoning stored |

### Retention Policies

| Data Type | Retention | Justification |
|-----------|-----------|---------------|
| Bronze (raw) | 7 days | Recovery, reprocessing |
| Silver (cleaned) | 90 days | Historical analysis |
| Gold (curated) | 7 years | Regulatory compliance |
| Audit logs | 7 years | Compliance requirement |
| Quality metrics | 2 years | Trend analysis |
| Lineage history | 3 years | Impact analysis |

---

## Capacity Planning Summary

```
+------------------------------------------------------------------------+
|                    CAPACITY PLANNING SUMMARY                            |
+------------------------------------------------------------------------+
|                                                                         |
|  DATA VOLUMES                                                           |
|  ------------                                                           |
|  Daily Ingestion:     10 TB        CDC Events:      14.4 B/day         |
|  Year 1 Storage:      756 TB       Year 5 Storage:  3.8 PB             |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  THROUGHPUT                                                             |
|  ----------                                                             |
|  CDC Events:          167K QPS (avg), 500K QPS (peak)                  |
|  Quality Scores:      28K QPS (avg), 84K QPS (peak)                    |
|  Transformations:     600K/day                                          |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  COMPUTE                                                                |
|  -------                                                                |
|  Ingestion:           400 worker-hours/day                             |
|  CDC Processing:      10 processors (peak)                             |
|  Transformation:      1,700 vCPU-hours/day                             |
|                                                                         |
+------------------------------------------------------------------------+
|                                                                         |
|  SLOs                                                                   |
|  ----                                                                   |
|  Availability:        99.9%          Freshness (CDC):  <5 min          |
|  Schema Accuracy:     95%+           Self-Heal Rate:   85%+            |
|  False Positive:      <5%            Human Intervention: <30%          |
|                                                                         |
+------------------------------------------------------------------------+
```
