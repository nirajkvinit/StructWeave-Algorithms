# Requirements & Estimations — AI-Native Data Catalog & Governance

## Functional Requirements

### Core Features (Must-Have)

| # | Requirement | Description |
|---|------------|-------------|
| F1 | **Metadata Ingestion** | Pull-based crawlers and push-based connectors for 50+ source types (databases, warehouses, lakehouses, BI tools, pipelines, streaming systems) |
| F2 | **Search & Discovery** | Full-text and faceted search across all metadata (table names, column descriptions, tags, owners) with usage-weighted ranking |
| F3 | **Column-Level Lineage** | Automated lineage tracking from source tables through SQL transformations, ETL jobs, and BI dashboards at the column granularity |
| F4 | **Auto-Classification** | ML-driven detection and tagging of sensitive data (PII, PHI, PCI) using NER models, regex patterns, and data sampling |
| F5 | **Policy Enforcement** | Tag-based governance policies (access control, column masking, row filtering) that inherit through the metadata hierarchy |
| F6 | **Data Quality Scoring** | Automated profiling and quality assessment across freshness, completeness, uniqueness, validity, and consistency dimensions |
| F7 | **Ownership & Collaboration** | Domain-based ownership assignment, data asset certification, glossary management, and annotation workflows |
| F8 | **Natural Language Querying** | LLM-powered interface that converts business questions into SQL queries using catalog metadata as context |

### Extended Features (Nice-to-Have)

| # | Requirement | Description |
|---|------------|-------------|
| E1 | **Impact Analysis** | Given a proposed schema change, identify all downstream assets (reports, pipelines, ML models) that would be affected |
| E2 | **Data Contracts** | Formal producer-consumer agreements with schema, quality, and SLO expectations validated at publish time |
| E3 | **Active Metadata Automation** | Event-driven workflows that trigger actions (notifications, policy enforcement, quality checks) on metadata changes |
| E4 | **Cost Attribution** | Track and attribute compute/storage costs to datasets, owners, and queries |
| E5 | **AI-Readiness Scoring** | Assess datasets for ML suitability based on completeness, bias metrics, freshness, and documentation quality |

### Out of Scope

- Data storage or query execution (the catalog is a metadata layer, not a query engine)
- ETL/ELT pipeline orchestration (handled by external schedulers)
- Data transformation logic (handled by dbt, Spark, or similar tools)
- Full-text content search within data files (handled by search engines)

---

## Non-Functional Requirements

### CAP Theorem Choice

**CP with eventual consistency for search** — Metadata writes (lineage, classification, policy) must be strongly consistent to prevent policy gaps. Search indexes can be eventually consistent with sub-second propagation delay.

| Property | Choice | Justification |
|----------|--------|---------------|
| Consistency | Strong for writes, Eventual for search | Policy enforcement cannot tolerate stale metadata; search tolerates brief delays |
| Availability | High (99.9%) | Catalog downtime blocks discovery but does not block data pipeline execution |
| Partition Tolerance | Required | Distributed metadata ingestion must survive network partitions |

### Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Search latency (p50) | < 200ms | Including ranking and facet computation |
| Search latency (p99) | < 1s | Complex queries with multiple filters |
| Lineage traversal (3 hops) | < 500ms | Column-level, upstream + downstream |
| Metadata ingestion latency | < 60s | From source change to catalog visibility |
| Auto-classification throughput | 1,000 columns/min | Per classification worker |
| NL-to-SQL response time | < 5s | Including LLM inference and SQL generation |
| Policy evaluation | < 50ms | Per access request with tag resolution |

---

## Capacity Estimation

### Reference Scenario: Large Enterprise (500 data sources)

| Metric | Value | Calculation |
|--------|-------|-------------|
| Total data assets (tables/views) | 2M | 500 sources × 4,000 avg tables |
| Total columns | 40M | 2M tables × 20 avg columns |
| Lineage edges (column-level) | 200M | 40M columns × 5 avg transformations |
| Daily metadata change events | 5M | Schema changes + lineage updates + quality signals |
| Search queries/day | 500K | 5,000 data practitioners × 100 searches/day |
| Search QPS (peak) | 50 | Concentrated during business hours |
| Metadata storage (graph + search) | 2 TB | ~1 KB per entity × 2B total entities/relationships |
| Classification scans/day | 100K columns | Incremental: new + changed columns only |
| Concurrent users | 2,000 | Peak during morning data review |
| NL-to-SQL queries/day | 10K | Growing with AI adoption |

### Storage Breakdown

| Component | Size | Notes |
|-----------|------|-------|
| Metadata graph (RDBMS) | 500 GB | Entities, relationships, properties |
| Search index | 200 GB | Full-text + facets + embeddings |
| Lineage store | 800 GB | Column-level lineage with history |
| Quality metrics history | 300 GB | 90-day rolling window |
| Audit log | 200 GB | All access and change events |
| **Total** | **2 TB** | Growing ~50% annually |

---

## SLO Table

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | 99.9% (8.7h downtime/year) | Health check + synthetic search probes |
| Search latency (p99) | < 1s | End-to-end from query to rendered results |
| Metadata freshness | < 5 min | Time from source change to catalog reflection |
| Classification accuracy | > 95% precision, > 90% recall | Validated against human-labeled ground truth |
| Lineage completeness | > 90% coverage | Percentage of tables with automated lineage |
| Policy enforcement | 100% (zero bypass) | All data access checked against active policies |
| Error rate | < 0.1% | Failed API requests / total requests |
