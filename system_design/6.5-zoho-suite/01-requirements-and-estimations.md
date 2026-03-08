# Requirements & Capacity Estimations

## Functional Requirements

### Multi-Product Platform

| # | Requirement | Description |
|---|---|---|
| FR-1 | **Multi-Product Platform** | 55+ integrated business applications spanning CRM, Books, People, Desk, Projects, Mail, Creator, and more |
| FR-2 | **Unified Identity & SSO** | Single Zoho account across all products via Zoho Directory — SAML 2.0, OIDC, MFA, conditional access policies |
| FR-3 | **Cross-Product Data Sharing** | Unified Data Services (UDS) enabling seamless data flow between apps — a CRM deal closing triggers an invoice in Books and a project in Projects |
| FR-4 | **Low-Code / No-Code Development** | Zoho Creator platform with Deluge scripting language for custom applications, forms, workflows, and dashboards |
| FR-5 | **Workflow Automation** | Zoho Flow (1,000+ connectors for third-party integration) and Qntrl (process orchestration for cross-functional approvals and routing) |
| FR-6 | **AI Assistant (Zia)** | AI layer across all products — 700+ pre-configured agent skills covering prediction, anomaly detection, NLP, recommendations, and conversational commands |
| FR-7 | **Analytics & BI** | Zoho Analytics with embedded BI in every product, 500+ data source connectors, drag-and-drop report builder, and auto-generated insights |

### Platform & Integration

| # | Requirement | Description |
|---|---|---|
| FR-8 | **Multi-Tenant Isolation** | Tenant-level data isolation with customizable schemas — each organization's data is logically separated with configurable field-level permissions |
| FR-9 | **API Gateway** | REST APIs for every product, webhooks for real-time event subscriptions, bulk API for batch operations, and rate limiting per plan tier |
| FR-10 | **Zoho One Bundling** | 50+ apps under a single per-employee license — unified admin console, provisioning, and billing across the entire suite |
| FR-11 | **Marketplace & Extensions** | Zoho Marketplace for third-party and custom extensions using widgets, SDKs, and serverless functions |
| FR-12 | **Communication Hub** | Unified messaging across email (Zoho Mail), chat (Zoho Cliq), and telephony (Zoho PhoneBridge) integrated into every product context |
| FR-13 | **Document Management** | Zoho WorkDrive for team file storage, real-time co-editing (Zoho Writer, Sheet, Show), and version history |

### Out of Scope

- Individual product deep-dives (each of the 55+ products could be its own system design)
- End-user mobile app rendering and offline sync mechanics
- Zoho Mail SMTP/IMAP server internals
- Payment gateway integration and billing engine internals
- Zoho Marketplace review and publishing pipeline

---

## Non-Functional Requirements

### CAP Theorem Choice

**AP for most services, CP for financial and billing** — Availability and Partition Tolerance prioritized globally, with strong consistency reserved for monetary operations:

| Operation | Consistency Model | Justification |
|---|---|---|
| CRM reads/writes | Strong (per-tenant shard) | Users expect immediate visibility of record edits within their org |
| Financial transactions (Books, Invoice) | Strong (CP) | Double-entry accounting and invoicing require strict consistency — no phantom reads or lost writes |
| Workflow/Flow execution | Eventual (at-least-once) | Actions are idempotent; sub-second delay is acceptable |
| Analytics aggregations | Eventual | Dashboards tolerate minutes of lag for aggregated metrics |
| Cross-product data sync (UDS) | Eventual | UDS propagates changes across products within seconds |
| Cross-region replication | Eventual | Data residency replicas lag by low seconds for compliance reads |

### Availability Target

| Tier | Target | Scope |
|---|---|---|
| Zoho One Platform (SLA) | 99.9% | ~44 minutes downtime/month — contractual SLA |
| Core APIs (CRM, Books, People) | 99.95% | ~22 minutes downtime/month |
| Workflow Engine (Flow, Qntrl) | 99.9% | ~44 minutes downtime/month; queued retry on failure |
| Analytics & BI | 99.5% | Non-critical; graceful degradation to cached results |
| Zia AI Services | 99.5% | AI features degrade gracefully — core CRUD unaffected |

### Latency Targets

| Operation | p50 | p95 | p99 |
|---|---|---|---|
| API call (single record CRUD) | 30ms | 100ms | 200ms |
| Cached read (hot path) | 5ms | 30ms | 50ms |
| Search/filter across records | 50ms | 200ms | 500ms |
| Cross-product data fetch (UDS) | 100ms | 300ms | 500ms |
| Workflow trigger-to-action | 500ms | 2s | 5s |
| Analytics dashboard load | 500ms | 2s | 5s |
| Zia AI inference | 200ms | 800ms | 2s |

### Durability

- Tenant data (CRM, Books, People, etc.): **99.999999999%** (11 nines) — triple-replicated across private data centers
- Documents & files (WorkDrive): 11 nines — erasure-coded blob storage with geo-redundancy
- Workflow state: Persisted in event log + database; at-least-once execution guarantee with deduplication
- Audit logs: Immutable append-only storage, configurable retention (default 1 year, enterprise up to 10 years)
- Email data (Zoho Mail): Replicated across availability zones with 30-day soft-delete recovery

### Data Residency

- **18 data center locations** across US, India, Europe, UAE, Australia, and UK
- Tenant data pinned to region based on organization's country selection at signup
- Regional isolation enforced at the storage and compute layer — no cross-border data transfer without explicit configuration
- GDPR, SOC 2 Type II, HIPAA, ISO 27001 compliance across all regions

---

## Capacity Estimations (Back-of-Envelope)

### Assumptions

- 1M+ paying customers, 150M+ total users globally
- ~20% of total users are daily active = ~30M DAU
- ~67% are monthly active = ~100M MAU
- 55+ products, average user interacts with 3-5 products daily
- 28+ countries served, 18 data center locations
- Enterprise clients: Netflix, Amazon, Hyundai, TCS, Mercedes-Benz
- 32% customer growth YoY, 20% revenue growth — $1B+ annual revenue

### Traffic Estimates

| Metric | Estimation | Calculation |
|---|---|---|
| DAU | ~30M | 150M total users x 20% daily active rate |
| MAU | ~100M | 150M total users x 67% monthly active rate |
| Read QPS (avg) | ~450K | 30M DAU x 40 reads/user/day / 86,400 sec |
| Write QPS (avg) | ~45K | 30M DAU x 4 writes/user/day / 86,400 sec (10:1 read:write) |
| Total QPS (avg) | ~500K | Read + Write combined |
| Peak QPS | ~2M | 4x average during business-hours overlap (US + India + EU) |
| Workflow executions/sec | ~50K avg, ~200K peak | 1M customers x 15 workflows avg x 300 actions/day / 86,400 |
| API calls (external integrations) | ~100K/sec | 1M customers x ~8 external API calls/day/customer / 86,400 |
| Zia AI inferences/sec | ~20K | ~5% of all requests trigger AI; 500K QPS x 0.05 |

### Storage Estimates

| Metric | Estimation | Calculation |
|---|---|---|
| Tenant structured data (Year 1) | ~10 PB | 1M customers x avg 10 GB structured data/customer (CRM records, invoices, HR data, tickets) |
| Documents & files (Year 1) | ~25 PB | 1M customers x avg 25 GB files (WorkDrive, Mail attachments, project files) |
| Email storage (Year 1) | ~10 PB | 150M users x avg ~70 GB mail/user (active mail users ~15%) = 150M x 0.15 x 70 GB |
| Analytics / event data (Year 1) | ~3 PB | 500K QPS x avg 1 KB event x 86,400 sec x 365 days / compression 3x |
| Workflow state & logs | ~2 PB | Execution history, audit trails, debug logs |
| **Total Storage (Year 1)** | **~50 PB** | Sum of above |
| **Total Storage (Year 5)** | **~250 PB** | ~50 PB x ~1.5x annual growth compounded over 5 years + retention |

### Bandwidth Estimates

| Metric | Estimation | Calculation |
|---|---|---|
| API response bandwidth | ~100 Gbps | 2M peak QPS x 5 KB avg response / 8 bits |
| File upload/download | ~200 Gbps | Document editing, WorkDrive sync, email attachments |
| Internal east-west traffic | ~150 Gbps | Cross-service RPC, UDS sync, event bus |
| Cross-region replication | ~50 Gbps | Geo-replication across 18 data centers |
| **Total sustained bandwidth** | **~500 Gbps** | Sum of above |

### Cache Estimates

| Cache Layer | Size | Contents |
|---|---|---|
| Hot tenant data | ~40 TB | Frequently accessed CRM records, contacts, deals per org |
| Session & auth tokens | ~10 TB | Active sessions, SSO tokens, Zoho Directory cache |
| API rate-limit counters | ~2 TB | Per-tenant, per-product rate limiting state |
| UDS cross-product cache | ~15 TB | Materialized cross-product views (e.g., CRM contact + support tickets + invoices) |
| Search index cache | ~20 TB | Recent query results, type-ahead suggestions |
| Zia model/feature cache | ~10 TB | Pre-computed features, embeddings, prediction caches |
| Template & config cache | ~3 TB | Workflow definitions, email templates, form schemas |
| **Total distributed cache** | **~100 TB** | Spread across 18 data center regions |

---

## SLOs / SLAs

| Metric | SLO (Internal) | SLA (Customer-Facing) | Measurement |
|---|---|---|---|
| Platform Availability | 99.95% | 99.9% | Successful responses / total requests (5-min rolling) |
| API Latency (p99) | 200ms | 500ms | Server-side response time per request |
| Cached Read Latency (p99) | 50ms | 200ms | Response time for cache-hit reads |
| Cross-Product Sync (UDS) | 5s (p99) | 30s | Source product write → target product visibility |
| Workflow Trigger-to-Action | 5s (p99) | 30s | Event trigger → action execution completion |
| Search Freshness | 5s | 30s | Record change → searchable in product |
| Analytics Dashboard Load | 2s (p95) | 5s | Full render with data from Zoho Analytics |
| Zia AI Response | 2s (p99) | 5s | AI prediction / recommendation / NLP response |
| Webhook Delivery | 99.9% | 99% | Successful delivery within 5 retries over 24 hours |
| Data Durability | 99.9999999% | 99.999% | Measured as data-loss events per year |
| Backup RPO | 1 hour | 4 hours | Recovery Point Objective for disaster recovery |
| Backup RTO | 15 minutes | 1 hour | Recovery Time Objective for disaster recovery |

---

## Read/Write Ratio Analysis

| Component | Read:Write | Implication |
|---|---|---|
| CRM Records | 10:1 | Cache-heavy; read replicas per region beneficial |
| Financial Data (Books) | 5:1 | Moderate read-heavy with strict write consistency (CP) |
| Email (Zoho Mail) | 20:1 | Extremely read-heavy; most emails read multiple times, written once |
| Workflow Engine | 1:1 | Balanced — reads for state checks, writes for transitions and logs |
| Analytics Events | 1:5 | Write-heavy ingestion; batch reads for dashboard queries |
| Search Index | 50:1 | Read-heavy queries; async background index writes |
| Document Collaboration | 3:1 | Moderate reads with frequent collaborative writes (OT/CRDT) |
| Zia AI Features | 10:1 | Mostly inference reads; periodic model training writes |
