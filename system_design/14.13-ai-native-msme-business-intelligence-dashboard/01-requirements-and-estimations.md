# 14.13 AI-Native MSME Business Intelligence Dashboard — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Natural language querying** — Accept business questions in natural language (English + 10 regional languages), translate to SQL via a multi-stage NL-to-SQL pipeline, execute against the tenant's data warehouse, and return results with auto-selected visualizations and narrative explanations | Query accuracy ≥ 90% on first attempt; clarification dialog when confidence < 70%; support for follow-up questions with conversational context ("now break that down by region"); response time ≤ 3 seconds for p95 queries |
| FR-02 | **Automated data source connectors** — Pluggable connectors for common MSME data sources: accounting software (Tally, Zoho Books), POS systems, e-commerce platforms, bank statement parsers, spreadsheet uploads (CSV/Excel); CDC-based incremental sync with schema drift detection | Support 20+ connector types; initial data ingestion ≤ 30 minutes for 1 million rows; incremental sync latency ≤ 15 minutes; AI-assisted column mapping with merchant confirmation; data quality scoring per source |
| FR-03 | **Semantic graph construction** — Automatically build a business semantic layer from raw data schemas: infer business concepts from column names, detect table relationships, resolve entity ambiguities, and map raw fields to standardized business metrics (revenue, margin, customer lifetime value) | Cold-start graph generation ≤ 10 minutes; semantic mapping accuracy ≥ 85% (verified by merchant); support for merchant corrections that retrain the mapping model; versioned graph with rollback |
| FR-04 | **Auto-insight generation** — Continuously analyze all tracked KPIs for anomalies, trend changes, and significant patterns; generate narrative explanations with root cause attribution; rank insights by business impact | Detect anomalies within 1 hour of data arrival; false positive rate ≤ 15% after 30-day learning period; root cause drill-down to at least 3 dimensions (product, channel, customer segment, time period); impact quantification in revenue terms |
| FR-05 | **KPI tracking and alerting** — Pre-configured and custom KPI definitions with configurable thresholds; real-time monitoring with alert escalation via WhatsApp, SMS, and in-app notifications | Support 50+ pre-built KPI templates per industry vertical; custom KPI builder via natural language ("track ratio of returns to sales by product category weekly"); threshold alerts with suppression for known seasonality |
| FR-06 | **Industry benchmark comparison** — Provide anonymized peer benchmarks for key KPIs segmented by industry, geography, revenue band, and business age; show percentile rankings and trend comparisons against the cohort | Minimum cohort size of 50 tenants for benchmark generation; differential privacy with ε ≤ 1.0; monthly benchmark refresh; benchmark categories for 30+ MSME verticals |
| FR-07 | **WhatsApp business digest** — AI-curated daily/weekly business summaries delivered via WhatsApp Business API: top 3 ranked insights, KPI status indicators (green/yellow/red), anomaly alerts with suggested actions, tap-to-explore deep links | Delivery within configurable time window (default 8:00 AM local time); message body ≤ 1024 characters per template; support for rich media (charts as images); read receipt tracking; digest personalization based on merchant's focus areas |
| FR-08 | **Interactive dashboard builder** — Drag-and-drop dashboard creation for users who prefer visual exploration; AI-suggested widget layouts based on connected data sources; auto-refresh with configurable intervals | Support 15+ chart types; dashboard sharing with role-based access; scheduled exports (PDF, Excel); mobile-responsive layouts; embeddable widgets via iframe with auth tokens |
| FR-09 | **Conversational analytics context** — Maintain conversation history for follow-up queries; support refinements ("exclude online orders"), drill-downs ("break that by city"), and comparisons ("compare with last quarter"); persist sessions for returning users | Context window of 10 previous queries per session; session persistence for 7 days; named sessions ("Monday review") that users can resume; exportable conversation threads |
| FR-10 | **Data blending and preparation** — AI-assisted data joining across sources; automatic type coercion, null handling, and deduplication; computed columns via natural language formulas; scheduled data transformations | Support joins across up to 5 data sources; AI suggests join keys from value overlap analysis; transformation lineage tracking; rollback for incorrect transformations |
| FR-11 | **Report scheduling and distribution** — Scheduled report generation and delivery via email, WhatsApp, or in-app; parameterized reports (e.g., "weekly sales report for each store location"); PDF and Excel export with branded headers | Cron-based scheduling with timezone awareness; report generation ≤ 60 seconds; distribution list management; report versioning with historical archive |
| FR-12 | **Goal tracking and forecasting** — Set business goals (revenue targets, customer acquisition, expense budgets) with AI-generated forecasts showing probability of achievement; proactive alerts when trajectory deviates from target | Forecast accuracy within ±15% for 30-day horizon; support for manual adjustments to forecast assumptions; confidence intervals displayed; "what-if" scenario modeling via natural language |

---

## Out of Scope

- **ETL pipeline management** — No custom data transformation scripting; the platform handles data prep via AI-assisted tooling, not user-written ETL jobs
- **Real-time streaming analytics** — Data freshness targets are 15-minute incremental sync, not sub-second event streaming; no CEP (complex event processing)
- **Data science workbench** — No Jupyter notebooks, custom model training, or Python/R scripting; analytics are consumed through NL queries and pre-built dashboards
- **Multi-tenant data sharing** — No cross-tenant data collaboration or shared datasets; benchmarks use anonymized aggregates only
- **Transactional operations** — No write-back to source systems; the platform is read-only analytics, not an operational tool for placing orders or updating inventory

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| NL-to-SQL query response (p95) | ≤ 3 s | Users expect conversational speed; >5 s feels broken for a "chat with data" interface |
| NL-to-SQL accuracy (first attempt) | ≥ 90% | Below 85%, users lose trust and revert to manual dashboard exploration |
| Dashboard page load (p95) | ≤ 2 s | Standard web application expectation; dashboards with 10+ widgets |
| Auto-insight detection latency | ≤ 1 hour from data arrival | Insights on yesterday's data must be ready for the morning WhatsApp digest |
| Data connector sync (p95) | ≤ 15 min incremental | Merchants expect "current" data when asking questions; 15-min staleness is acceptable |
| Semantic graph cold-start | ≤ 10 min | Onboarding experience: merchant connects data and gets first usable query within 15 minutes |
| WhatsApp digest delivery (p95) | Within 5 min of scheduled time | Late delivery misses the merchant's morning routine window |
| Benchmark computation | ≤ 4 hours (nightly batch) | Benchmarks are not real-time; nightly refresh is sufficient |
| Report generation (p95) | ≤ 60 s | Scheduled reports should not queue for minutes during peak delivery windows |

### Reliability & Availability

| Metric | Target |
|---|---|
| Platform availability | 99.9% (≤ 8.76 hours downtime/year) |
| Data pipeline reliability | 99.95% (no data loss during ingestion) |
| NL query service availability | 99.5% (LLM dependency allows slightly lower) |
| WhatsApp delivery success rate | ≥ 98% (dependent on WhatsApp API availability) |
| Scheduled report delivery | 99.9% on-time delivery |
| Data retention | 3 years hot storage, 7 years cold archive |

---

## Capacity Estimations

### User Scale

| Parameter | Estimate | Basis |
|---|---|---|
| Total registered MSMEs | 2 million | Target market: India's 63M+ MSMEs; 3% initial penetration |
| Monthly active tenants (MAT) | 800,000 (40% of registered) | Typical SaaS engagement rate for SME analytics tools |
| Daily active tenants (DAT) | 200,000 (25% of MAT) | Merchants check dashboards 1-2× daily on average |
| Avg users per tenant | 2.5 | Owner + 1-2 managers/accountants |
| Peak concurrent users | 100,000 | Morning (8-10 AM) and evening (6-8 PM) check-in patterns |

### Query Scale

| Parameter | Estimate | Calculation |
|---|---|---|
| NL queries per DAT per day | 5 | Light analytics usage pattern for MSME users |
| Total NL queries per day | 1,000,000 | 200K DAT × 5 queries |
| Peak NL queries per second | 30 | 1M queries / 86,400s × 2.5 (peak factor) |
| Dashboard widget refreshes/day | 5,000,000 | 200K DAT × 5 widgets avg × 5 refreshes |
| Auto-insight evaluations/day | 800,000 | 1 evaluation per MAT per day |
| WhatsApp digests per day | 600,000 | 75% of MAT opt-in to daily digest |

### Storage

| Parameter | Estimate | Calculation |
|---|---|---|
| Avg data per tenant | 500 MB (raw), 200 MB (columnar compressed) | ~100K transactions × 5 KB avg row size; 2.5× compression |
| Total raw data | 1 PB | 2M tenants × 500 MB |
| Total compressed analytical store | 400 TB | 2M tenants × 200 MB |
| Semantic graph per tenant | 50 KB | ~200 tables, 2000 columns, relationship metadata |
| Total semantic graphs | 100 GB | 2M tenants × 50 KB |
| Query logs (30-day retention) | 15 TB | 30M queries/month × 500 bytes avg × 30 days |
| Materialized view cache | 80 TB | 800K MAT × 100 MB avg (pre-aggregated summaries) |

### Compute

| Component | Estimate | Calculation |
|---|---|---|
| NL-to-SQL LLM inference | 120 GPU-hours/day | 1M queries × 0.4s avg GPU time per query |
| Auto-insight detection | 80 CPU-hours/day | 800K tenants × 0.36s avg per evaluation |
| Narrative generation (LLM) | 40 GPU-hours/day | 1M queries + 800K insights × 0.1s avg per narration |
| Data ingestion pipeline | 200 CPU-hours/day | 800K incremental syncs × 0.9s avg |
| Benchmark aggregation (nightly) | 50 CPU-hours | Aggregation across 2M tenants with differential privacy |

### Cost Estimation (Monthly)

| Component | Monthly Cost | Notes |
|---|---|---|
| Compute (analytical queries) | $85,000 | Columnar query engine cluster |
| GPU inference (NL-to-SQL + narration) | $120,000 | 160 GPU-hours/day × 30 days |
| Object storage (raw data) | $25,000 | 1 PB at $0.025/GB |
| Columnar analytical storage | $40,000 | 400 TB with replication |
| WhatsApp Business API | $18,000 | 600K messages/day × $0.001 avg per utility message × 30 |
| Data connectors (API calls) | $15,000 | Rate-limited API calls to source systems |
| CDN and networking | $8,000 | Dashboard asset delivery |
| **Total estimated** | **~$311,000/month** | **$0.16/MAT/month** or **$0.39/DAT/month** |

---

## SLO Summary Dashboard

| SLO | Target | Measurement | Alert Threshold |
|---|---|---|---|
| NL query accuracy | ≥ 90% | Weekly sample of 1000 queries human-evaluated | < 87% triggers model review |
| NL query latency (p95) | ≤ 3 s | Real-time percentile tracking | > 4 s triggers auto-scaling |
| Platform availability | 99.9% | Uptime monitoring per service | < 99.8% triggers incident review |
| WhatsApp delivery rate | ≥ 98% | Delivery receipts from WhatsApp API | < 96% triggers channel investigation |
| Auto-insight precision | ≥ 85% | Monthly sample of 500 insights human-evaluated | < 80% triggers threshold tuning |
| Data freshness | ≤ 15 min | Max lag across all active connectors per tenant | > 30 min triggers connector health check |
| Dashboard load time (p95) | ≤ 2 s | Real user monitoring (RUM) | > 3 s triggers performance review |
| Benchmark coverage | ≥ 80% of verticals | % of tenants with benchmarks available | < 70% triggers cohort expansion |
