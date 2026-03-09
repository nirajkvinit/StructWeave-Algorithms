# Requirements & Estimations

## Functional Requirements

### Core Lead Management
1. **Lead Capture** --- Ingest leads from web forms, API integrations, email parsing, CSV imports, and marketing automation platforms; deduplicate against existing leads and contacts using configurable matching rules (email, phone, company name + domain)
2. **Lead Enrichment** --- Automatically enrich lead records with firmographic data (company size, industry, revenue, technology stack) from external data providers via asynchronous enrichment pipelines
3. **Lead Scoring** --- Assign numeric scores based on configurable rule sets (demographic fit + behavioral signals) and optional ML-based predictive models trained on historical conversion data; scores update in near-real-time as new signals arrive
4. **Lead Qualification & Routing** --- Automatically qualify leads as MQL/SQL/SAL based on score thresholds; route qualified leads to sales reps via territory-based assignment, round-robin distribution, or capacity-weighted allocation
5. **Lead Conversion** --- Convert a qualified lead into an Account, Contact, and Opportunity in a single atomic transaction, preserving all lead history and activity associations

### Account & Contact Management
6. **Account Hierarchy** --- Model parent-child account relationships for corporate hierarchies (subsidiary → division → parent company); support unlimited nesting depth with rollup aggregation (total revenue, total contacts, total opportunities)
7. **Contact Roles** --- Associate contacts with opportunities in specific roles (decision maker, influencer, evaluator, blocker) to model buying committees and influence networks
8. **Merge & Deduplication** --- Merge duplicate account or contact records with configurable field-level master selection (keep value from record A for name, record B for phone); reassign all child records (opportunities, activities, cases) to the surviving record

### Opportunity & Pipeline Management
9. **Pipeline Stages** --- Configurable pipeline stages per sales process (e.g., Prospecting → Qualification → Proposal → Negotiation → Closed Won / Closed Lost); each stage has a probability percentage and optional validation requirements (fields that must be populated before advancing)
10. **Opportunity Products** --- Associate product line items with opportunities, supporting quantity, unit price, discount percentage, and custom pricing schedules; calculate opportunity amount as the sum of line item totals
11. **Sales Forecasting** --- Roll up opportunity amounts by stage probability, close date, and owner to produce team and organizational forecasts; support commit categories (Pipeline, Best Case, Commit, Closed) with manual override capabilities
12. **Quota Management** --- Define quotas per rep, team, and territory by period (monthly, quarterly, annual); track attainment as the ratio of closed-won amount to quota with real-time dashboard visibility

### Custom Objects & Metadata
13. **Custom Object Definition** --- Allow tenant administrators to create new entity types (custom objects) with custom fields, relationships, page layouts, validation rules, and list views---all through a point-and-click interface without code deployment
14. **Field Types** --- Support text, number, currency, date, datetime, picklist, multi-picklist, checkbox, email, phone, URL, textarea, rich text, formula, auto-number, lookup (foreign key), and master-detail (cascade delete) field types
15. **Formula Fields** --- Computed fields defined by expressions that reference other fields on the same or related objects; support arithmetic, string, date, and logical operators; recalculate on every read or on referenced field change
16. **Rollup Summary Fields** --- On master-detail relationships, aggregate child records (COUNT, SUM, MIN, MAX) with optional filter criteria; update asynchronously when child records change
17. **Validation Rules** --- Boolean expressions that must evaluate to true before a record can be saved; reference any field on the record or related records; display custom error messages on validation failure

### Workflow & Automation
18. **Record-Triggered Flows** --- Visual automation builder where tenants define trigger conditions (record created, record updated with field change, record deleted), entry criteria, and actions (field updates, email alerts, task creation, record creation, API callouts)
19. **Approval Processes** --- Multi-step approval workflows with sequential or parallel approver assignment, approval/rejection actions, escalation rules, and delegation support
20. **Scheduled Actions** --- Time-dependent workflow actions (send follow-up email 3 days after opportunity creation if stage has not advanced)

### Activity & Email Tracking
21. **Activity Timeline** --- Unified chronological view of all activities (emails, calls, meetings, tasks, notes) associated with a record, aggregated from the record itself and all related records
22. **Email Integration** --- Bidirectional sync with email providers; log sent/received emails to CRM records via email-to-record matching; track email opens and link clicks
23. **Task Management** --- Create, assign, and track tasks with due dates, priority, and status; associate tasks with any CRM record

### Reporting & Dashboards
24. **Report Builder** --- Drag-and-drop report builder supporting tabular, summary, and matrix report formats; filter by any field; group by up to three levels; add calculated columns
25. **Cross-Object Reports** --- Join data across related objects (Opportunities with Products with Accounts) for multi-dimensional analysis
26. **Dashboard Components** --- Charts, gauges, tables, and metrics assembled into configurable dashboards with auto-refresh; support drill-down from dashboard to underlying report
27. **Scheduled Reports** --- Automated report generation and email delivery on configurable schedules (daily pipeline summary, weekly forecast report)

### API Platform
28. **REST API** --- CRUD operations on all standard and custom objects with field-level filtering, pagination, and sorting
29. **Bulk API** --- Batch processing for large data operations (import 500K records, mass update, mass delete) with asynchronous job tracking
30. **Streaming API** --- Push-based change data capture for real-time integration; publish record change events, platform events, and custom events
31. **Metadata API** --- Programmatic access to schema definitions, page layouts, workflow rules, and deployment configurations for CI/CD pipelines

---

## Non-Functional Requirements

### Performance
| Metric | Target | Notes |
|--------|--------|-------|
| Record detail page load | < 300ms (p95) | Including formula field evaluation and related list counts |
| List view render | < 500ms (p95) | Up to 2,000 records with column sorting and filtering |
| SOQL query execution | < 2s (p95) | For queries within governor limits (50K record retrieval cap) |
| Lead score update latency | < 5s | From behavioral event ingestion to score recalculation |
| Bulk API throughput | > 10,000 records/second | For batch insert/update operations |
| Search response time | < 500ms (p95) | Global search across all objects with type-ahead suggestions |
| Report generation | < 5s (p95) | For reports scanning up to 100K records; complex reports up to 30s |

### Availability & Reliability
| Metric | Target |
|--------|--------|
| Platform availability | 99.95% (excludes planned maintenance windows) |
| Data durability | 99.999999999% (eleven nines) |
| RPO (Recovery Point Objective) | < 1 minute |
| RTO (Recovery Target Objective) | < 15 minutes |
| Planned maintenance window | < 30 minutes per month |
| Zero-downtime deployments | Required for platform upgrades |

### Scalability
| Metric | Target |
|--------|--------|
| Max tenants per database instance | 5,000 (with org_id partitioning) |
| Max records per tenant | 500 million (across all objects) |
| Max custom objects per tenant | 400 |
| Max custom fields per object | 500 |
| Max workflow rules per object | 500 |
| Max concurrent API connections per tenant | 1,000 |
| Horizontal scaling | Add database instances and compute nodes without downtime |

---

## Governor Limits (Per-Transaction Resource Caps)

Governor limits are the defining architectural constraint of a multi-tenant CRM platform. Every feature, every automation, and every API call operates within these bounds:

| Resource | Synchronous Limit | Asynchronous Limit |
|----------|-------------------|-------------------|
| SOQL queries issued | 100 | 200 |
| Records retrieved by SOQL | 50,000 | 50,000 |
| DML statements | 150 | 150 |
| Records processed by DML | 10,000 | 10,000 |
| CPU time | 10,000 ms | 60,000 ms |
| Heap size | 6 MB | 12 MB |
| Callouts (external HTTP) | 100 | 100 |
| Callout timeout (per call) | 10 seconds | 120 seconds |
| Total callout timeout | 120 seconds | 120 seconds |
| Email invocations | 10 | 10 |
| Future method calls | 50 | 50 |
| Queueable jobs enqueued | 50 | 50 |
| Trigger recursion depth | 16 | 16 |

---

## Capacity Estimations

### User & Traffic Modeling

**Assumptions:**
- 150,000 tenants, 7.5M total users
- 10% concurrent during peak business hours: 750K concurrent users
- Average user generates 200 requests/day (page loads, saves, searches, API calls)

**Calculations:**

```
Daily requests:
  7,500,000 users x 200 requests/user = 1,500,000,000 requests/day

Peak requests per second:
  Assume 40% of daily traffic in 4-hour peak window
  1,500,000,000 x 0.40 / (4 x 3600) = ~41,667 RPS

  With 3x burst headroom: ~125,000 RPS peak capacity required

API traffic (external integrations):
  ~2,000,000,000 API calls/day
  Peak: ~100,000 API calls/second
```

### Storage Estimations

```
Record storage:
  150,000 tenants x 5,000,000 records/tenant (avg) = 750 billion records
  Average record size: ~2 KB (fields + metadata overhead)
  Raw record storage: 750B x 2 KB = ~1.5 PB

Activity & history storage:
  200,000,000 emails/day x 5 KB avg = 1 TB/day
  500,000,000 workflow executions/day x 0.5 KB = 250 GB/day
  30-day activity retention (hot): ~37.5 TB
  2-year history (warm): ~900 TB

Attachments & files:
  ~50 GB/tenant average = ~7.5 PB total

Search index:
  ~20% of record storage = ~300 TB

Total storage footprint: ~10 PB (with replication and indexing)
```

### Compute Estimations

```
Application tier:
  125,000 peak RPS / 500 RPS per node = 250 application nodes
  With 2x redundancy: 500 application nodes

Workflow execution:
  500,000,000 executions/day
  Peak: ~20,000 executions/second
  At 100 executions/second/worker: 200 workflow worker nodes

Bulk API processing:
  50,000 concurrent bulk jobs (estimated peak)
  At 10 jobs per worker: 5,000 bulk worker nodes (auto-scaled)

Lead scoring:
  50,000,000 leads/day x 3 scoring evaluations avg = 150M scoring events/day
  Peak: ~5,000 scoring events/second
  At 500 events/second/node: 10 scoring nodes

Report generation:
  10,000,000 reports/day
  Peak: ~500 reports/second
  At 20 concurrent reports per node: 25 report execution nodes
```

### Network Estimations

```
Inbound bandwidth (requests):
  125,000 RPS x 5 KB avg request = ~625 MB/s inbound

Outbound bandwidth (responses):
  125,000 RPS x 20 KB avg response (including list views) = ~2.5 GB/s outbound

Internal traffic (service-to-service):
  ~5x external traffic for metadata lookups, cache, queue, search = ~15 GB/s

Event bus throughput:
  ~1,000,000 events/second peak across all event types
  At 1 KB/event = ~1 GB/s
```

---

## SLOs (Service Level Objectives)

| SLO | Target | Measurement Window |
|-----|--------|--------------------|
| Record CRUD latency (p99) | < 500ms | Rolling 5-minute window |
| Search latency (p99) | < 1s | Rolling 5-minute window |
| Report execution (p95) | < 10s | Rolling 1-hour window |
| API availability | 99.95% | Monthly |
| Bulk API job completion | < 30 minutes for 500K records | Per-job measurement |
| Lead score freshness | < 30s from event to updated score | Rolling 5-minute window |
| Workflow execution latency | < 5s for synchronous; < 60s for async | Rolling 5-minute window |
| Platform error rate | < 0.1% of all requests | Rolling 1-hour window |
| Data replication lag | < 5s to read replicas | Continuous monitoring |
| Search index freshness | < 10s from record save to searchable | Rolling 5-minute window |

---

## Failure Budget Allocation

With a 99.95% availability target, the monthly failure budget is ~22 minutes:

| Category | Budget Share | Minutes/Month |
|----------|-------------|---------------|
| Planned deployments | 40% | ~9 min |
| Infrastructure incidents | 30% | ~6.5 min |
| Database failovers | 15% | ~3.3 min |
| Unplanned platform errors | 15% | ~3.3 min |

---

## Phased Delivery Roadmap

| Phase | Scope | Key Deliverables |
|-------|-------|-----------------|
| **Phase 1: Core CRM** | Lead, Contact, Account, Opportunity with standard fields; basic pipeline views; REST API | Single-tenant MVP with fixed schema; manual lead assignment; basic list views |
| **Phase 2: Automation** | Workflow rules, validation rules, formula fields; email integration; basic reports | Rule engine with trigger framework; email tracking; tabular reports |
| **Phase 3: Custom Objects** | Metadata engine for custom objects and fields; lookup and master-detail relationships; rollup summaries | Virtual schema layer; metadata-driven CRUD; cross-object relationships |
| **Phase 4: Multi-Tenancy** | Org-based isolation; governor limits; per-tenant metadata caching; shared database infrastructure | Tenant resolver; governor limit enforcement; metadata cache per org |
| **Phase 5: Advanced Platform** | Bulk API; Streaming API; approval processes; flow builder; lead scoring; marketplace/packaging | Async processing infrastructure; ML scoring pipeline; ISV packaging framework |
| **Phase 6: Enterprise** | Territory management; quota tracking; forecasting; data archival; dedicated database tier | Advanced assignment engine; forecast rollup; tiered storage |
