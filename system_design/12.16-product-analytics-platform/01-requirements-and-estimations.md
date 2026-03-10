# 12.16 Product Analytics Platform — Requirements & Estimations

## Functional Requirements

| ID | Requirement | Notes |
|---|---|---|
| FR-01 | **Event Ingestion** — Accept arbitrary user events via SDK (web, mobile, server-side) with at-least-once delivery guarantee and sub-100ms acknowledgement | Clients must receive ack before TCP teardown; dedup on backend |
| FR-02 | **Event Properties** — Support schema-on-read for event properties: any key-value pair accepted, type inferred at query time | No upfront schema registration required; schema hints optional |
| FR-03 | **Funnel Analysis** — Compute ordered multi-step conversion funnels with configurable time windows, exclusion steps, and property-based breakdown | Steps must be ordered but not necessarily sequential; gaps allowed |
| FR-04 | **Retention Analysis** — Compute N-day, unbounded, and custom bracket retention cohorted by user acquisition date or first occurrence of a defining event | N-day: user must return on exactly day N; unbounded: any day on or after N |
| FR-05 | **Cohort Segmentation** — Define behavioral cohorts ("users who did X in the last 30 days") and property cohorts ("plan=enterprise") dynamically; apply any cohort to any analysis | Cohorts evaluate lazily at query time or pre-compute for reuse |
| FR-06 | **Path / Journey Analysis** — Visualize Sankey-style user flow between events: top paths after event A, most common paths before event B, drop-off at each transition | Session-aware: paths bounded by session timeout (typically 30 min idle) |
| FR-07 | **Real-Time Dashboard** — Surface live event counters and key metrics updated within 60 seconds of event occurrence | Not full query freshness—dedicated streaming rollup for key metrics |
| FR-08 | **User-Level Inspection** — Look up event history for a specific user\_id; view properties at a point in time | For debugging and customer support; access controlled by role |
| FR-09 | **Auto-Capture** — Optionally capture all DOM interactions (clicks, page views, form submissions) without explicit instrumentation | Toggleable per project; increases event volume significantly |
| FR-10 | **Event Taxonomy & Governance** — Register event schemas with required properties, types, and ownership; score event quality; flag schema violations | Schema violations still ingested; violations surfaced in data quality UI |
| FR-11 | **Alerts & Anomaly Detection** — Define metric thresholds or percentage-change rules; notify via webhook when triggered | E.g., "alert if checkout\_complete drops > 20% vs 7-day average" |
| FR-12 | **Data Export** — Export query results as CSV/JSON; stream raw events to customer's data warehouse via connector | Warehouse sync via CDC or periodic batch |
| FR-13 | **Feature Flags Integration** — Record feature flag assignment per user per event; enable flag-grouped analysis without join to external system | Flag context embedded in event envelope at SDK time |
| FR-14 | **Session Replay Linkage** — Link each event to a corresponding session replay recording for qualitative debugging | Replay stored separately; event carries session\_replay\_id reference |

---

## Out of Scope

- **A/B Testing Assignment Engine** — Assignment logic lives in a separate experimentation service (covered in 12.14); analytics platform consumes assignment events
- **Business Intelligence (BI) Dashboarding** — Ad hoc SQL queries over joined business entities; analytics platform focuses on event-based behavioral analysis
- **Data Warehouse ETL** — Transforming and modeling raw events into dimensional schemas; analytics platform stores events, not facts/dimensions
- **Clickstream Advertising Attribution** — Multi-touch attribution across ad channels requires probabilistic identity resolution beyond scope
- **Real-Time Personalization Serving** — Serving individualized recommendations in real time based on event stream; requires low-latency feature store integration

---

## Non-Functional Requirements

### Performance
| Metric | Target |
|---|---|
| Event ingestion acknowledgement latency | P99 < 100ms end-to-end from SDK to queue |
| Event pipeline to query availability | < 60 seconds for real-time tier; < 24 hours for full reprocessed accuracy |
| Funnel query latency (< 10M users, 5 steps, 30-day window) | P50 < 500ms, P99 < 2s |
| Retention query latency (12-week cohorts) | P50 < 1s, P99 < 3s |
| Path analysis query (top 20 paths after event, 30-day window) | P50 < 2s, P99 < 5s |
| Real-time dashboard metric refresh | < 60s staleness |
| User-level event lookup (last 1000 events) | P99 < 200ms |

### Reliability
| Metric | Target |
|---|---|
| Ingestion availability | 99.99% (< 52 min downtime/year) |
| Query availability | 99.9% (< 8.7 hours/year) |
| Event durability (post-ack) | 99.9999% (no data loss after acknowledgement) |
| Late event acceptance window | Up to 72 hours past event timestamp |
| Maximum acceptable event loss at SDK | 0% post-ack; < 0.1% pre-ack (network failure) |

### Scalability
| Metric | Target |
|---|---|
| Peak ingestion rate | 500K events/second sustained, 1M events/second burst |
| Unique projects (tenants) | 50,000 |
| Maximum unique users per project | 500 million |
| Maximum event properties per event | 500 key-value pairs |
| Cold storage event retention | 2 years default; configurable up to 10 years |

### Security & Compliance
| Requirement | Description |
|---|---|
| Multi-tenant isolation | Storage-level isolation per project; no cross-project query leakage |
| GDPR right-to-erasure | Delete all events by user\_id within 30 days; via tombstone + recompaction |
| PII detection | Automatic scanning of event properties for common PII patterns; flag for review |
| Data residency | Events stored in configured region; no cross-region transfer without explicit consent |
| Audit logging | All data access (query, export, user lookup) logged with actor, timestamp, query |

---

## Capacity Estimations

### Event Ingestion Volume

```
Assumptions:
  - 50,000 active projects
  - Average 20,000 DAU per project  → 1 billion total DAU-equivalents
  - Average 5 events per user per session, 2 sessions per day  → 10 events/user/day
  - Total: 1B users × 10 events = 10 billion events/day

Peak vs average:
  - Traffic is highly diurnal: 3× peak multiplier during business hours
  - Peak ingestion: 10B / 86,400 × 3 ≈ 347K events/second sustained peak
  - With burst: 500K–1M events/second (flash sales, viral launches)
```

### Storage Estimation

```
Per-event storage (columnar, compressed):
  - Envelope fields (event_name, user_id, timestamp, project_id, session_id): ~100 bytes raw
  - Average 15 event properties × 20 bytes each: ~300 bytes raw
  - Total raw: ~400 bytes/event
  - Columnar compression ratio: ~6:1 (dictionary encoding + Zstd)
  - Compressed: ~67 bytes/event

Daily ingestion:
  - 10 billion events/day × 67 bytes ≈ 670 GB/day compressed

Annual storage (2-year retention):
  - 670 GB/day × 365 × 2 ≈ 489 TB

With replication factor 3:
  - 489 TB × 3 ≈ 1.5 PB raw storage capacity required

Pre-aggregated rollup tables (10% overhead): +150 TB
User properties time-series: +50 TB
Total storage estimate: ~1.7 PB
```

### Query Volume

```
Assumptions:
  - 50,000 projects × average 10 active users each
  - Each analyst runs ~20 queries per workday (8-hour window)
  - 50,000 × 10 × 20 queries / 28,800 seconds (8h) ≈ 347 queries/second

Cache hit rate:
  - L1 result cache (identical queries): 30% hit rate
  - Warm materialized views (similar shape): 40% hit rate
  - Cold columnar scan: 30% of queries

Cold scan queries: 347 × 0.30 ≈ 104 cold queries/second
  Each cold query scans ~100M–1B rows → significant compute load
  Estimate 16-core query nodes, 10 concurrent queries per node, 20 nodes required
```

### Network Bandwidth

```
Ingestion inbound:
  - 347K events/second × 400 bytes raw = 139 MB/s ingestion bandwidth
  - With TLS overhead (+20%): ~167 MB/s

Query result outbound:
  - Average result set: 50 KB per query × 347 queries/s = 17 MB/s

Export/sync outbound:
  - 10% of events exported to warehouses: 670 GB/day × 0.1 = 67 GB/day ≈ 0.8 MB/s
```

---

## Service-Level Objectives (SLOs)

| SLO | Target | Measurement Window |
|---|---|---|
| Ingestion Availability | 99.99% | Rolling 30-day |
| Event Pipeline Freshness (P95 event visible within) | 60 seconds | Rolling 24-hour |
| Funnel Query P99 Latency | < 2 seconds | Rolling 1-hour |
| Retention Query P99 Latency | < 3 seconds | Rolling 1-hour |
| Dashboard Metric Staleness | < 60 seconds | Continuous |
| GDPR Erasure Completion | 100% within 30 days | Per request |
| Alert Trigger Latency | < 5 minutes after threshold crossed | Per alert |
