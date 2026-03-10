# 01 — Requirements and Estimations: Customer Data Platform

## Functional Requirements

| # | Requirement | Details |
|---|---|---|
| FR-01 | **Multi-source event collection** | Accept behavioral events from web JavaScript SDK, mobile SDK (iOS/Android), server-side HTTP API, and bulk file upload; validate against registered schemas before accepting |
| FR-02 | **Schema registry** | Allow workspace administrators to register event schemas (event name, required/optional properties, property types); enforce schemas at ingest; detect and block breaking changes |
| FR-03 | **Identity resolution** | Match incoming events to existing profiles using deterministic identifiers (email hash, phone hash, custom ID); fall back to probabilistic signals (anonymous ID, device fingerprint) when no hard match exists |
| FR-04 | **Profile unification** | Maintain a persistent unified profile per individual containing: all known identifiers, trait map (first-party attributes), computed traits (derived from events), audience membership set, and consent state |
| FR-05 | **Audience building** | Allow marketers/analysts to define audience segments using boolean rules (trait filters, event occurrence filters, funnel conditions); support SQL-based custom audiences |
| FR-06 | **Real-time segment evaluation** | Evaluate streaming segment rules as events arrive; update segment membership within 1 second of a qualifying event; expose membership change events on a pub-sub topic |
| FR-07 | **Computed traits** | Allow definition of computed traits derived from event history (e.g., "total_purchases_30d", "last_seen_category"); recompute on a configurable schedule or on each relevant event |
| FR-08 | **Destination integrations** | Deliver profile data and audience membership events to registered destinations (ad platforms, CRM, marketing automation, data warehouse, webhooks) using per-destination configured schema mappings |
| FR-09 | **Destination fan-out reliability** | Guarantee at-least-once delivery to each destination; provide per-destination retry queues with exponential backoff; surface delivery failure metrics per destination |
| FR-10 | **Consent management** | Store per-user, per-purpose consent decisions; enforce consent at event ingestion, profile enrichment, and destination delivery; support GDPR opt-in and CCPA opt-out models |
| FR-11 | **Right to erasure** | Process data-subject erasure requests end-to-end within 30 days (GDPR) or 45 days (CCPA); cascade deletion across event store, profile store, identity graph, audience cache, destination outboxes, and warehouse exports |
| FR-12 | **Data governance** | Classify event properties as PII or non-PII; apply per-property transformation rules (hash, mask, drop) before forwarding to destinations; maintain data lineage metadata |
| FR-13 | **Warehouse sync** | Continuously sync raw events and unified profiles to a customer-owned data warehouse; support reverse ETL to pull warehouse-computed traits back into CDP profiles |
| FR-14 | **Audit trail** | Maintain an immutable log of all data access, consent changes, erasure requests, and administrative configuration changes for compliance reporting |
| FR-15 | **Profile lookup API** | Expose a low-latency API (< 50ms p99) for real-time profile lookup by any registered identifier, returning the unified profile with traits and active audience memberships |

---

## Out of Scope

- **Campaign execution**: The CDP delivers audiences to marketing tools; it does not send emails/push notifications itself
- **BI and analytics reporting**: Downstream data warehouse handles ad-hoc analytics; CDP is not an OLAP system
- **Attribution modeling**: Cross-channel attribution is a separate analytical function; CDP provides the event data
- **CRM functionality**: Contact management, sales pipeline, deal tracking — these are upstream data sources for the CDP

---

## Non-Functional Requirements

### Performance

| Metric | Target |
|---|---|
| Event ingestion latency (p50) | < 50ms from receipt to queue |
| Event ingestion latency (p99) | < 200ms |
| Profile write propagation (p99) | < 500ms from event to profile update visible |
| Streaming segment evaluation (p99) | < 1,000ms from event to membership change published |
| Profile lookup API (p99) | < 50ms |
| Batch segment refresh cycle | < 15 minutes for full segment re-evaluation |

### Scalability

| Metric | Target |
|---|---|
| Peak ingest throughput | 2,000,000 events/second globally |
| Total profile count | Up to 1 billion profiles per workspace |
| Concurrent active audiences | 50,000 audience definitions per workspace |
| Destination integrations | 500+ concurrent active destinations per workspace |
| Horizontal scale-out | All components scale horizontally with no single-node bottlenecks |

### Availability

| Metric | Target |
|---|---|
| Event ingestion availability | 99.99% (< 53 min/year downtime) |
| Profile read API availability | 99.99% |
| Audience evaluation | 99.9% (< 8.7 hours/year) |
| Destination delivery | 99.9% eventual delivery guarantee; transient failures recovered via retry |
| RTO (major outage) | < 30 minutes |
| RPO (data loss) | < 5 minutes of events |

### Security

| Requirement | Details |
|---|---|
| Data encryption at rest | AES-256 for all storage tiers |
| Data encryption in transit | TLS 1.3 for all connections |
| PII handling | All PII hashed or encrypted before cross-system transit; plaintext PII confined to origin-region stores |
| API authentication | Workspace write keys for SDK ingestion; OAuth 2.0 / API tokens for management API |
| Tenant isolation | Strict workspace-level isolation; no cross-workspace data access possible at query layer |
| Secrets management | Destination credentials stored in managed KMS; never logged |

### Compliance

| Requirement | Details |
|---|---|
| GDPR | Lawful basis tracking, consent management, right to access, right to erasure within 30 days, data processing agreements, data residency (EU region) |
| CCPA/CPRA | Do-not-sell/share opt-out propagation, right to delete within 45 days, sensitive data handling |
| SOC 2 Type II | Annual audit; controls for security, availability, processing integrity, confidentiality, privacy |
| Data residency | Ability to pin workspace data (event store, profile store) to a specified geographic region |

---

## Capacity Estimations

### Event Volume

```
Peak events/second globally:    2,000,000 events/sec
Daily event volume:             2,000,000 × 86,400 = ~172B events/day
                                (accounting for traffic peaks, assume avg ~500K/sec)
Average daily:                  500,000 × 86,400 = ~43B events/day

Average event payload:          ~1 KB (properties + metadata)
Raw ingest bandwidth:           500,000 × 1,024 B = ~500 MB/sec = ~43 TB/day raw
After compression (3x):         ~14 TB/day compressed ingest
```

### Profile Storage

```
Total profiles:                 1 billion profiles
Profile document size:
  - Identifiers set:            ~500 bytes
  - Trait map (100 traits avg): ~2 KB
  - Audience membership bitmap: ~5 KB (50K audiences, sparse)
  - Consent state:              ~500 bytes
  - Metadata:                   ~500 bytes
Total per profile:              ~8.5 KB
Total profile store size:       1B × 8.5 KB = ~8.5 TB (hot profile store)

Identity graph:
  Avg identifiers per profile:  5 (email hash, phone hash, anon ID, device ID, cust ID)
  Total identity graph nodes:   5B nodes
  Total edges (co-occurrences): ~3B edges
  Graph storage:                ~50 bytes/node + ~30 bytes/edge = ~340 GB
```

### Audience Evaluation

```
Active segment definitions:     50,000 per workspace, ~100 workspaces = 5M total
Segment rule evaluations/sec:   500,000 events/sec × avg 200 segments to check = 100M evaluations/sec
Streaming evaluation:           CEP engine distributes ~100M evaluations/sec across cluster
Batch segment refresh:          1B profiles × 50,000 segments = infeasible full scan
                                → incremental evaluation on event-triggered dirty profiles only
                                → typically 1-5% profiles dirty per 15-min cycle = 10-50M profile evals/cycle
```

### Destination Delivery

```
Active destinations:            500 per workspace × 100 workspaces = 50,000 total destinations
Delivery events/day:            Each raw event fans out to avg 5 destinations
                                43B events/day × 5 = ~215B delivery attempts/day
                                = ~2.5M delivery attempts/sec
Fan-out bandwidth:              215B × 1 KB avg = ~215 TB/day egress
```

### Storage Summary

| Tier | Retention | Size |
|---|---|---|
| Raw event store (hot) | 90 days | ~1.3 PB |
| Raw event store (cold archive) | 7 years | ~110 PB |
| Unified profile store | Indefinite | ~8.5 TB |
| Identity graph | Indefinite | ~340 GB |
| Audience membership cache | Current state only | ~500 GB |
| Destination outbox queues | 72-hour retry window | ~10 TB |
| Audit log | 7 years | ~5 PB |

---

## Service Level Objectives

| SLO | Target | Measurement Window |
|---|---|---|
| Event ingestion success rate | ≥ 99.95% of events accepted without error | Rolling 24 hours |
| Event-to-profile propagation p99 | < 500ms | Rolling 1 hour |
| Profile lookup API p99 latency | < 50ms | Rolling 5 minutes |
| Streaming segment update p99 | < 1,000ms | Rolling 1 hour |
| Destination delivery success rate | ≥ 99.9% within 72-hour retry window | Rolling 24 hours |
| Erasure completion rate | 100% within 30 days of request | Per request |
| Platform availability (ingest) | ≥ 99.99% | Rolling 30 days |
| Identity resolution accuracy | ≥ 99% precision on deterministic matches | Quarterly audit |
