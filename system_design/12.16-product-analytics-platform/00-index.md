# 12.16 Product Analytics Platform

## System Overview

A Product Analytics Platform is a specialized data system that tracks every discrete user interaction—clicks, page views, feature activations, API calls—and transforms that raw event stream into actionable behavioral intelligence. Unlike generic business intelligence tools, a product analytics platform is purpose-built for sub-second interactive queries over petabyte-scale event datasets, enabling product teams to answer questions like "what percentage of users who performed event A within 7 days then completed event B?" without writing SQL or waiting hours for batch jobs. The core technical challenge is simultaneously satisfying two conflicting demands: accepting billions of events per day with low-latency, at-least-once durability guarantees, while serving ad hoc analytical queries that may need to scan hundreds of millions of rows and join against time-varying user property tables. Solving this requires a layered architecture: a write-optimized ingestion tier feeding an immutable columnar event store, a pre-aggregation layer that materializes common query patterns, a real-time funnel and retention computation engine, and a query router that selects the optimal execution path (hot cache, warm materialized view, or cold columnar scan) based on query shape and data recency. The system must also handle schema-on-read for flexible event properties, point-in-time user property resolution for historical accuracy, and strict multi-tenant isolation between thousands of product workspaces, all while maintaining P99 query latency under two seconds even during peak ingestion.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Architecture Style** | Lambda-like hybrid: streaming ingestion path for low-latency event capture + batch reprocessing path for historical accuracy; query layer routes across hot/warm/cold tiers |
| **Core Abstraction** | Immutable append-only event log partitioned by (project\_id, event\_date, event\_name); all analytics derived from this single source of truth |
| **Primary Write Pattern** | At-least-once event ingestion via SDK → message queue → stream processor → columnar write; deduplication via event\_id bloom filter |
| **Primary Read Pattern** | Columnar scan with bitmap predicate pushdown; pre-aggregated rollup materialized views for common funnel/retention shapes; L1 query result cache for identical repeated queries |
| **Data Model** | Schema-on-read for event properties (JSON blob); strict schema for envelope fields (event\_name, user\_id, timestamp, project\_id); user properties as time-series SCD Type 2 |
| **Consistency Model** | Eventual consistency with bounded staleness: real-time data visible within 30–60 seconds; historical data fully consistent after reprocessing window (typically 24 hours) |
| **Scale Target** | 1 billion events/day ingestion; 100 million unique users per project; 50TB–1PB cold storage per large tenant; P99 query latency < 2s for common queries |
| **Multi-tenancy** | Project-level isolation: separate storage partitions, query quotas, and access control; shared compute cluster with fair scheduling |
| **Cardinality Handling** | High-cardinality property values stored as dictionary-encoded columns; hyperloglog sketches for distinct user counts; theta sketches for set intersection |
| **Temporal Correctness** | Late-arriving events accepted up to 72 hours after event time; point-in-time user property lookups use as-of queries against SCD Type 2 user\_properties table |

---

## Quick Navigation

| Section | File | Description |
|---|---|---|
| Requirements & Capacity | `01-requirements-and-estimations.md` | Functional requirements, NFRs, capacity math |
| High-Level Design | `02-high-level-design.md` | Architecture diagram, key decisions, data flows |
| Low-Level Design | `03-low-level-design.md` | Data models, APIs, core algorithms |
| Deep Dives | `04-deep-dive-and-bottlenecks.md` | Event pipeline, funnel engine, retention engine, path analysis |
| Scalability | `05-scalability-and-reliability.md` | Partitioning, pre-aggregation, cold tiering, multi-region |
| Security & Compliance | `06-security-and-compliance.md` | PII handling, GDPR, access control |
| Observability | `07-observability.md` | Metrics, alerting, SLO dashboards |
| Interview Guide | `08-interview-guide.md` | 45-min pacing, trap questions, scoring rubric |
| Insights | `09-insights.md` | 8 architectural insights |

---

## What Differentiates Naive vs. Production

| Dimension | Naive Approach | Production Approach |
|---|---|---|
| **Event Storage** | Row-oriented relational DB; queries full-table-scan | Columnar Parquet/ORC files partitioned by date+project; predicate pushdown skips irrelevant row groups |
| **Funnel Computation** | N correlated subqueries per step; O(n²) for n steps | Bitmap-per-step with AND intersection; single-pass ordered scan using session window operator |
| **Retention Calculation** | Daily batch GROUP BY cohort date; fresh data 24h stale | Streaming retention sketch update on each returning event; pre-materialized retention matrix updated incrementally |
| **User Properties** | Latest-value snapshot only; historical queries inaccurate | SCD Type 2 time-series property table; as-of timestamp lookups for point-in-time correctness |
| **Schema Handling** | Fixed schema; new event properties require migrations | Schema-on-read with dynamic property discovery; type inference and conflict detection |
| **Query Routing** | All queries hit cold storage | Three-tier router: L1 result cache → warm materialized view → cold columnar scan |
| **Deduplication** | No deduplication; duplicate SDK retries inflate counts | Per-project bloom filter keyed on event\_id; idempotent upsert on event\_id in stream processor |
| **Cardinality** | COUNT DISTINCT on raw events; OOM for large windows | HyperLogLog sketches merged at query time; exact count only for small result sets |

---

## What Makes This System Unique

### Retroactive Event Analysis
Unlike traditional analytics that require schema definition before data collection, a product analytics platform supports retroactive event tagging: raw events are stored with all properties in schema-on-read format, and analysts can define new funnels, cohorts, or metrics that apply to historical data as far back as the retention window allows. This means a product team can instrument "sign up clicked" today and immediately see how that event correlated with retention 90 days ago—no backfill job required, because the raw events were already stored.

### Multi-Dimensional Breakdown at Query Time
Every analytical query—funnel, retention, path analysis—supports arbitrary property-based breakdown (e.g., "show me funnel conversion broken down by platform AND plan tier simultaneously"). Unlike pre-computed aggregations, this requires the query engine to dynamically group results across all combinations of the breakdown dimensions during scan time. Achieving sub-second latency for arbitrary breakdown queries requires both columnar pushdown and pre-built group-by rollup cubes for the most common breakdown dimensions.

### Behavioral Cohort Intersection
The platform distinguishes itself from SQL-based BI tools through native behavioral cohort operators: "users who did X but not Y within window W, and who have property P." These cohorts can be defined dynamically and intersected with any other analysis—a retention chart can be scoped to just a behavioral cohort, or a funnel can show conversion differences between two behavioral cohorts side by side. Implementing this efficiently requires set-algebra operations on user bitmap indexes rather than correlated subqueries.

### Event Taxonomy Governance
At scale, event schemas decay rapidly without governance: teams emit events with inconsistent names, duplicate properties, and undocumented semantics. A production platform includes a governance layer with a data contract registry—each event type has a defined schema with required properties, types, and validation rules. Events that violate the contract are flagged (but still ingested), and a data quality score per event type is surfaced to the owning team, incentivizing schema discipline without hard blocking ingestion.
