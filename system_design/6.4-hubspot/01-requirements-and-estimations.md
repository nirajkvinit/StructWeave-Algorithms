# Requirements & Capacity Estimations

## Functional Requirements

### Core CRM

| # | Requirement | Description |
|---|---|---|
| FR-1 | **Object Management** | CRUD operations on Contacts, Companies, Deals, Tickets, and 38+ standard object types |
| FR-2 | **Custom Objects** | User-defined object types with custom properties, supporting many-to-many associations |
| FR-3 | **Associations** | Bidirectional, labeled relationships between any object types (Contact ↔ Company ↔ Deal) |
| FR-4 | **Properties System** | Flexible schema — text, number, date, dropdown, boolean, calculated fields per object |
| FR-5 | **Timeline / Activity Feed** | Append-only activity log per record (emails, calls, meetings, notes, page views) |
| FR-6 | **Search & Filtering** | Property-based search across all objects with compound filters and sorting |
| FR-7 | **Lists & Segmentation** | Static and dynamic contact lists based on property/behavior criteria |

### Marketing Automation

| # | Requirement | Description |
|---|---|---|
| FR-8 | **Workflow Engine** | Visual DAG-based automation — triggers, conditions, branches, delays, actions |
| FR-9 | **Email Marketing** | Template design, personalization (merge fields, dynamic content), scheduling, A/B testing |
| FR-10 | **Email Delivery** | High-volume SMTP delivery with deliverability management (SPF/DKIM/DMARC, IP warming) |
| FR-11 | **Lead Scoring** | Rule-based + AI-powered scoring combining behavioral and demographic signals |
| FR-12 | **Forms & Landing Pages** | Form builder, submission tracking, progressive profiling |
| FR-13 | **Campaign Attribution** | Multi-touch attribution across channels (first-touch, last-touch, linear, U-shaped) |

### Platform

| # | Requirement | Description |
|---|---|---|
| FR-14 | **Multi-Hub Integration** | Marketing, Sales, Service, CMS, Commerce — unified data model across products |
| FR-15 | **API & Webhooks** | REST/GraphQL APIs for all objects; webhook subscriptions for real-time events |
| FR-16 | **App Marketplace** | OAuth-based third-party app ecosystem with scoped permissions |
| FR-17 | **Analytics & Reporting** | Dashboards, funnels, attribution reports, custom report builder |
| FR-18 | **Bi-directional Sync** | Native sync with Salesforce, external CRMs, and custom integrations |

### Out of Scope

- CMS page rendering / website hosting
- Social media management
- Live chat / chatbot engine (separate design)
- Payment processing internals
- Ad management / retargeting pixel infrastructure

---

## Non-Functional Requirements

### CAP Theorem Choice

**AP with tunable consistency** — Availability and Partition Tolerance prioritized for most operations:

| Operation | Consistency Model | Justification |
|---|---|---|
| CRM reads/writes | Strong (per-Hublet) | Users expect immediate visibility of their edits |
| Workflow execution | Eventual (at-least-once) | Actions are idempotent; seconds of delay is acceptable |
| Email analytics | Eventual | Analytics dashboards tolerate minutes of lag |
| Search indexing | Eventual | Search index refresh within seconds is sufficient |
| Cross-region reads | Eventual | EU data replicated from NA primary with seconds of lag |

### Availability Target

| Tier | Target | Scope |
|---|---|---|
| CRM API | 99.95% | ~22 minutes downtime/month |
| Workflow Engine | 99.9% | ~44 minutes downtime/month |
| Email Delivery | 99.9% | Queued and retried on failure |
| Analytics | 99.5% | Non-critical, graceful degradation |

### Latency Targets

| Operation | p50 | p95 | p99 |
|---|---|---|---|
| CRM single-record read | 15ms | 50ms | 100ms |
| CRM search/filter | 50ms | 200ms | 500ms |
| Workflow action execution | 500ms | 2s | 5s |
| Email send (queued) | 100ms | 500ms | 1s |
| Dashboard load | 500ms | 2s | 5s |
| API response | 50ms | 200ms | 500ms |

### Durability

- CRM data: **99.999999999%** (11 nines) — replicated across 3 MySQL/HBase nodes
- Email content: Durable in blob storage with redundancy
- Workflow state: Persisted in Kafka + database; at-least-once execution guarantee
- Audit logs: Immutable append-only storage, 7-year retention for compliance

---

## Capacity Estimations (Back-of-Envelope)

### Assumptions

- 268,000 paying customers, average 50 users per account = ~13.4M total users
- ~30% are daily active = ~4M DAU
- Average customer has 50,000 contacts, 10,000 companies, 5,000 deals
- Average 10 workflows per customer, each processing 100 contacts/day

### Traffic Estimates

| Metric | Estimation | Calculation |
|---|---|---|
| DAU / MAU | 4M / 13.4M | 268K accounts × 50 users × 30% DAU |
| CRM Read QPS (avg) | ~500K | 4M DAU × 30 reads/user/day ÷ 86,400 |
| CRM Write QPS (avg) | ~50K | 4M DAU × 3 writes/user/day ÷ 86,400 |
| CRM Peak QPS | ~1.5M | 3× average (business hours concentration) |
| Workflow Actions/sec | ~10K avg, ~50K peak | 268K × 10 workflows × 100 actions ÷ 86,400 |
| Email Send QPS | ~150 avg, ~5K peak | 400M emails/month ÷ 30 ÷ 86,400 |
| Email Analytics Events/sec | ~30K | Sends + opens + clicks + bounces |
| API Calls/sec (external) | ~50K | 268K customers × ~15 API calls/day/customer |

### Storage Estimates

| Metric | Estimation | Calculation |
|---|---|---|
| CRM Objects (Year 1) | ~200 TB | 268K × 65K objects × avg 12 KB/object |
| CRM Objects (Year 5) | ~1 PB | Growth at ~40%/year + historical data |
| Email Analytics | 260 TB compressed | Published figure — event data (sends, opens, clicks) |
| Workflow State | ~5 TB | Active workflow instances + execution history |
| File Attachments | ~500 TB | Documents, images attached to CRM records |
| Total Storage (Year 1) | ~1 PB | CRM + Analytics + Workflows + Files |
| Total Storage (Year 5) | ~5 PB | Growth + retention requirements |

### Bandwidth Estimates

| Metric | Estimation | Calculation |
|---|---|---|
| CRM API bandwidth | ~20 Gbps | 1.5M QPS × 2 KB avg response |
| Email outbound | ~5 Gbps | 5K emails/sec × 100 KB avg email |
| Webhook delivery | ~2 Gbps | ~100K webhooks/sec × 2 KB payload |
| Internal (Kafka) | ~50 Gbps | Cross-service event traffic |

### Cache Estimates

| Cache Layer | Size | Contents |
|---|---|---|
| Hot CRM objects | ~50 TB | Frequently accessed contacts, deals by account |
| Session/auth tokens | ~5 TB | Active user sessions, OAuth tokens |
| Workflow state | ~2 TB | Active workflow execution contexts |
| Search index cache | ~10 TB | Recent query results, popular filters |
| Email templates | ~500 GB | Compiled/rendered template cache |

---

## SLOs / SLAs

| Metric | SLO (Internal) | SLA (Customer) | Measurement |
|---|---|---|---|
| CRM API Availability | 99.99% | 99.95% | Successful responses / total requests |
| CRM API Latency (p99) | 200ms | 500ms | Server-side response time |
| Workflow Execution Latency | 5s (p99) | 30s | Trigger event → action execution |
| Email Queue-to-Send | 30s (p99) | 5min | Time from queue to SMTP handoff |
| Email Deliverability | 98%+ | 95%+ | Inbox placement rate |
| Search Freshness | 5s | 30s | Record change → searchable |
| Dashboard Load Time | 2s (p95) | 5s | Full render with data |
| Webhook Delivery | 99.9% | 99% | Successful delivery within 5 retries |
| Data Durability | 99.9999999% | 99.999% | No data loss per year |

---

## Read/Write Ratio Analysis

| Component | Read:Write | Implication |
|---|---|---|
| CRM Objects | 10:1 | Cache-heavy, read replicas beneficial |
| Email Analytics | 1:3 | Write-heavy, append-only, batch reads for reports |
| Workflow Engine | 1:1 | Balanced — reads for state, writes for transitions |
| Search Index | 50:1 | Read-heavy, async index updates acceptable |
| Activity Timeline | 5:1 | Read-heavy display, append-only writes |
