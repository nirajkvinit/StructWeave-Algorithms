# 12.15 Customer Data Platform

## System Overview

A Customer Data Platform (CDP) is a persistent, unified system that ingests behavioral events and profile attributes from every customer touchpoint — web SDKs, mobile SDKs, server-side APIs, CRM exports, and offline uploads — and resolves them into a single golden profile per individual. At production scale, a CDP processes tens of billions of raw events per day, maintains hundreds of millions of unified profiles, and evaluates thousands of audience segment definitions against those profiles in near-real-time. The core technical challenges are: (1) **identity resolution** — stitching together anonymous and authenticated signals across devices and channels into a coherent identity graph; (2) **profile unification** — merging conflicting trait values, computing derived attributes, and producing a consistent golden record under concurrent writes; (3) **real-time audience computation** — evaluating streaming events against complex boolean segment rules with sub-second latency; (4) **destination fan-out** — reliably delivering profile data and audience membership events to hundreds of downstream integrations (ad platforms, marketing automation, data warehouses) with backpressure handling and at-least-once semantics; and (5) **privacy compliance** — enforcing purpose-based consent, honoring data-subject erasure requests across all storage layers, and maintaining a tamper-proof audit trail for regulators. CDPs sit at the intersection of data engineering, streaming systems, and privacy law, making them one of the most architecturally rich platforms in the modern data stack.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Architecture Style** | Event-driven, streaming-first with eventual consistency; composable variant uses warehouse as system of record with reverse ETL activation |
| **Core Abstraction** | The unified customer profile — a persistent entity aggregating all identifiers, behavioral traits, audience memberships, and consent state for a single individual |
| **Data Volume** | 10B–100B raw events/day at enterprise scale; 100M–1B profile records; 1,000–50,000 active audience definitions |
| **Latency Profile** | Event ingestion < 200ms p99; profile update propagation < 500ms; audience membership change < 1s for streaming segments; batch segments refreshed every 15m–24h |
| **Identity Resolution** | Deterministic matching on hard IDs (email, phone hash); probabilistic matching on soft signals (device fingerprint, IP, behavioral pattern); identity graph with merge, split, and survivorship operations |
| **Consistency Model** | Profile writes are eventually consistent; identity merge operations are linearizable per identity cluster to prevent fan-out of conflicting merges |
| **Destination Delivery** | Webhook fan-out, streaming connector (publish-subscribe), batch file export (object storage), reverse ETL; per-destination retry queues with exponential backoff and dead-letter routing |
| **Privacy Model** | Purpose-based consent stored per profile; consent-aware event routing gates downstream delivery; right-to-erasure pipeline cascades deletes across all storage tiers within regulatory deadline |
| **Schema Governance** | Centralized schema registry enforces event shape at ingest; schema evolution rules distinguish additive changes (safe) from breaking changes (blocked or versioned) |
| **Deployment Model** | Multi-tenant SaaS with workspace isolation; single-tenant enterprise; increasingly warehouse-native (composable) where processing runs inside customer's data warehouse |

---

## Quick Navigation

| File | Contents |
|---|---|
| [01 — Requirements & Estimations](./01-requirements-and-estimations.md) | Functional requirements, capacity math, SLOs |
| [02 — High-Level Design](./02-high-level-design.md) | System architecture, key design decisions, data flow |
| [03 — Low-Level Design](./03-low-level-design.md) | Data models, API design, core algorithms |
| [04 — Deep Dives & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Identity engine, audience engine, destination fan-out, event pipeline |
| [05 — Scalability & Reliability](./05-scalability-and-reliability.md) | Horizontal scaling, sharding, DR, multi-region |
| [06 — Security & Compliance](./06-security-and-compliance.md) | Threat model, PII, consent, GDPR/CCPA, SOC2 |
| [07 — Observability](./07-observability.md) | Metrics, SLO dashboards, alerting, identity quality |
| [08 — Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, scoring rubric |
| [09 — Insights](./09-insights.md) | 8 key architectural insights |

---

## What Differentiates Naive vs. Production CDP

| Dimension | Naive / V1 Approach | Production Reality |
|---|---|---|
| **Event Ingestion** | Single HTTP endpoint, synchronous write to database | Multi-region edge collectors, async queue-backed, schema-validated at ingest with dead-letter for invalid events |
| **Identity Resolution** | Simple email match; one profile per email | Full identity graph with probabilistic merge; handles cookie-to-email stitching, cross-device, B2B account hierarchy |
| **Profile Storage** | Single relational table per user | Distributed document store with sharding by profile ID; separate hot (recent traits) and cold (historical events) tiers |
| **Audience Segmentation** | Nightly batch SQL query against user table | Dual-path: streaming evaluation for simple rules, periodic batch for complex SQL; incremental maintenance of segment membership |
| **Destination Delivery** | Synchronous HTTP call per event | Async fan-out queue per destination; per-destination rate limiting, retry with exponential backoff, circuit breaker, dead-letter |
| **Consent Enforcement** | Boolean "opted in" flag on profile | Per-purpose consent map (marketing, analytics, personalization); consent-aware routing prevents delivery to non-consented destinations |
| **Right to Erasure** | Delete from one database | Cascading erasure across event store, profile store, identity graph, audience cache, destination outboxes, warehouse exports, backup tiers |
| **Schema Governance** | No schema validation; any event accepted | Schema registry with per-event-type versioned schemas; breaking change detection; validation at ingest with violation metrics |

---

## What Makes a CDP Architecturally Unique

### Identity as a First-Class Graph Problem

Most platforms treat user identity as a simple lookup key. A CDP must maintain a live identity graph where nodes are identifiers (anonymous IDs, emails, phone hashes, device IDs, customer IDs) and edges represent co-occurrence evidence with confidence weights. Merge and split operations on this graph must be linearizable per cluster — you cannot allow two concurrent merges of the same set of identities to produce divergent results. The graph must also support **survivorship rules**: when two profiles merge, the system must deterministically pick which trait value wins (e.g., most recently updated, most trusted source). This is a distributed systems problem masquerading as a data problem.

### Dual-Path Segment Evaluation

A naive CDP evaluates all segment memberships via nightly batch SQL — which produces 24-hour-stale audience membership and makes real-time personalization impossible. A production CDP runs two evaluation paths simultaneously: a **streaming path** where each incoming event is matched against a set of pre-compiled segment rules expressed as a CEP (Complex Event Processing) DAG, updating membership incrementally; and a **batch path** that handles SQL-based segments too complex for streaming (multi-table joins, percentile computations, historical aggregations). The orchestration layer must determine which path each segment definition belongs to and route evaluation accordingly, while keeping both paths consistent.

### Fan-out at Scale with Heterogeneous Destinations

A CDP must deliver every profile change to potentially hundreds of destinations, each with different APIs, rate limits, authentication schemes, retry semantics, and data format requirements. At 10B events/day across 500 destinations, the fan-out multiplier creates an enormous delivery surface. Each destination needs its own delivery queue, retry policy, schema transformation, and health circuit breaker. Destinations range from real-time webhooks (latency-sensitive) to batch file exports (throughput-sensitive) to streaming connectors (ordering-sensitive). Managing this heterogeneity while guaranteeing at-least-once delivery without duplicates (idempotent delivery via deduplication keys) is one of the hardest operational problems in CDP design.

### Privacy as an Architectural Invariant

Unlike most platforms where privacy is a compliance add-on, CDPs must treat consent as an architectural invariant that flows through every data processing path. Consent state must be checked at event ingestion (is this source permitted to collect this event type?), at profile enrichment (is this trait derivable for this purpose?), at segment evaluation (is this user consented for this segment's purpose?), and at destination delivery (does the destination's declared purpose match the user's consent?). Erasure requests must cascade through a pipeline that identifies and deletes all copies of a user's data across dozens of storage systems — including immutable append-only event logs — within legally mandated timeframes, with cryptographic proof of deletion for auditors.
