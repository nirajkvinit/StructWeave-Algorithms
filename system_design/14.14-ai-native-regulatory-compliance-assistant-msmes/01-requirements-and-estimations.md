# 14.14 AI-Native Regulatory & Compliance Assistant for MSMEs — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Business profile and obligation mapping** — Accept business registration details (type, industry, location, employee count, turnover, activities) and automatically determine all applicable regulations across central, state, and municipal jurisdictions; maintain obligation map that updates as business parameters change | Support 500+ regulation types across 28 states and 8 UTs; auto-detect threshold crossings (ESI at 10 employees, audit at ₹1 crore turnover); obligation map recomputation ≤ 5 seconds after parameter change |
| FR-02 | **Personalized compliance calendar** — Generate and maintain a dynamic compliance calendar with all filing deadlines, license renewals, inspection due dates, and periodic returns; account for turnover brackets, jurisdiction-specific dates, and holiday adjustments | Calendar computation accounts for 12+ deadline parameters per obligation; automatic recalculation when government extends deadlines; dependency-aware scheduling (annual returns blocked until monthly returns complete) |
| FR-03 | **Regulatory change monitoring** — Continuously ingest regulatory updates from government gazettes, portals, notification feeds, and legislative databases; detect changes, extract obligations, and assess impact on registered businesses | Monitor 500+ government sources; change detection latency ≤ 24 hours from publication; NLP extraction accuracy ≥ 90% for deadlines and applicability criteria; cover central and state-level sources |
| FR-04 | **Plain-language regulatory translation** — Convert dense legal/regulatory text into actionable plain-language summaries explaining what changed, who is affected, what action is needed, by when, and what the penalty for non-compliance is | Support 10+ Indian languages; reading level equivalent to 8th grade; include specific action steps; link back to original notification for reference |
| FR-05 | **Multi-channel staged notifications** — Send compliance reminders via WhatsApp, SMS, email, and in-app push at configurable intervals (90/60/30/7/1 days before deadline); support escalation chains and acknowledgment tracking | Near-zero false-negative rate for penalty-bearing deadlines; channel preference learning per user; escalation to business owner if assignee hasn't acknowledged within 48 hours; batch-optimized sending during business hours |
| FR-06 | **Document vault with auto-classification** — Provide a secure, searchable document repository where users upload or forward (via email/WhatsApp) compliance documents; AI automatically classifies by regulation, period, and document type | Support PDF, image (OCR), and email attachment ingestion; classification accuracy ≥ 92%; auto-extract key fields (challan number, filing date, amount, acknowledgment number); content-addressed storage with tamper-evident hashing |
| FR-07 | **Pre-filled filing assistance** — Pre-populate filing forms (GST returns, PF challans, professional tax returns) from business data already in the system; highlight missing fields; generate filing-ready documents for download or direct submission via API | Pre-fill accuracy ≥ 95% for fields derivable from existing data; support 50+ form types; validation rules for each form; integration with government filing portals where APIs are available |
| FR-08 | **License and permit tracking** — Track all business licenses and permits with expiration dates, renewal requirements, and issuing authority details; manage renewal workflows including document preparation, fee payment reminders, and submission tracking | Support 100+ license types (trade license, FSSAI, pollution consent, fire NOC, shop establishment); renewal window computation per license type; document checklist generation for each renewal |
| FR-09 | **Audit readiness scoring and preparation** — Continuously assess audit readiness per regulation; identify document gaps, filing inconsistencies, and compliance risks; generate pre-assembled audit packs organized by regulation and assessment period | Readiness score updated daily; gap identification within 24 hours of a missed document; audit pack generation ≤ 30 seconds; support for GST audits, labor inspections, environmental audits, and financial audits |
| FR-10 | **Compliance health dashboard** — Provide a real-time dashboard showing overall compliance score, upcoming deadlines, overdue items, recent regulatory changes, and risk-weighted priority list; support role-based views (owner, accountant, HR manager) | Dashboard load time ≤ 2 seconds; risk scoring based on penalty amount × likelihood of inspection; configurable views per role; exportable compliance reports for stakeholders |
| FR-11 | **Threshold monitoring and proactive alerts** — Monitor business metrics (employee count, turnover, interstate transactions) against regulatory thresholds; proactively alert when approaching or crossing thresholds that trigger new obligations | Monitor 30+ threshold types; alert at 80% of threshold (warning) and at crossing (action required); include specific new obligations triggered and registration deadlines |
| FR-12 | **Accountant/advisor collaboration** — Support multi-user access with role-based permissions; allow business owners to invite their CA/accountant; provide shared task lists, document sharing, and approval workflows for filings | Role-based access control (owner, admin, accountant, viewer); task assignment and tracking; approval workflow for filings requiring CA sign-off; activity audit log per user |

---

## Out of Scope

- **Direct tax filing submission** — No automated submission to government portals for income tax or corporate tax returns; the system prepares documents but the actual filing is done by the user or their CA through official portals
- **Legal advice or representation** — No legal opinions, dispute resolution, or representation before authorities; the system provides regulatory information, not legal counsel
- **Payroll processing** — No salary calculation, payslip generation, or bank transfer initiation; integrates with payroll systems for PF/ESI data but doesn't replace them
- **Accounting and bookkeeping** — No journal entries, ledger management, or financial statement preparation; integrates with accounting software for GST and financial data
- **International compliance** — No foreign regulatory tracking, export-import compliance, or cross-border tax obligations; focused exclusively on domestic Indian MSME regulations

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Dashboard load time (p95) | ≤ 2 s | Business owners check compliance status on mobile during breaks; slow loads reduce daily engagement |
| Obligation map computation (p95) | ≤ 5 s | Must feel instant when business parameters change; critical for onboarding experience |
| Regulatory change detection latency | ≤ 24 hours from publication | Balance between timeliness and parsing accuracy; most regulations have 30+ day implementation windows |
| Notification delivery (p95) | ≤ 60 s from scheduled time | Timely reminders build trust; delayed reminders erode platform credibility |
| Document classification (p95) | ≤ 10 s per document | Upload → classification must feel responsive; async processing acceptable for batch uploads |
| Audit pack generation (p95) | ≤ 30 s | Audit preparation is time-sensitive; auditor may be waiting during inspection |
| Filing form pre-fill (p95) | ≤ 5 s | Form pre-population should appear instant to maintain filing workflow momentum |
| Full-text document search (p95) | ≤ 3 s | Search across vault must be fast enough for real-time lookup during audits or meetings |
| Regulatory text summarization (p95) | ≤ 15 s | Plain-language translation can tolerate slight delay as it is consumed asynchronously |

### Reliability & Availability

| Metric | Target |
|---|---|
| Notification delivery reliability | 99.99% — missed deadline reminders directly cause penalties; near-zero tolerance for missed notifications |
| Dashboard availability | 99.9% — compliance checking is important but not real-time critical |
| Document vault availability | 99.95% — documents must be accessible during audits and inspections which are scheduled |
| Document vault durability | 99.999999999% (11 nines) — compliance documents have legal significance and multi-year retention requirements |
| Regulatory pipeline availability | 99.5% — batch pipeline with retry; brief downtime doesn't miss regulations if caught within 24 hours |
| Filing assistance availability | 99.9% — filing deadlines are known in advance; brief outages can be tolerated with advance planning |
| API availability | 99.9% — third-party integrations (accounting software, payroll) need reliable API access |

---

## Capacity Estimations

### User and Business Scale

| Parameter | Value | Basis |
|---|---|---|
| Total registered businesses | 3 million | Indian MSME digital adoption; 63M registered MSMEs, ~5% early regtech adoption |
| Monthly active businesses | 1.5 million (50%) | Higher engagement than typical SaaS due to recurring deadlines driving return visits |
| Average users per business | 2.5 | Owner + accountant + optional HR/admin |
| Total registered users | 7.5 million | 3M businesses × 2.5 users |
| Monthly active users | 3.75 million | 50% MAU rate |
| New business registrations/day | 5,000 | Growth phase for regtech in MSME segment |

### Compliance Obligation Scale

| Parameter | Value | Calculation |
|---|---|---|
| Average obligations per business | 80/year | Varies from 30 (micro, single-state) to 200+ (medium, multi-state, manufacturing) |
| Total obligation instances/year | 240 million | 3M businesses × 80 obligations |
| Active deadline entries at any time | 40 million | ~3 months of forward-looking deadlines across all businesses |
| Notifications sent/day | 8 million | 240M obligations × ~12 reminders each / 365 days |
| Peak notifications/hour | 2 million | Morning business hours concentration (9-11 AM) |

### Regulatory Content Scale

| Parameter | Value | Basis |
|---|---|---|
| Monitored government sources | 500+ | Central ministries, 28 state governments, major municipal bodies |
| New regulatory documents/day | 200-500 | Gazettes, notifications, circulars, amendments |
| Regulatory knowledge graph nodes | 50,000+ | Regulations, sections, rules, obligations, jurisdictions, thresholds |
| Regulatory knowledge graph edges | 500,000+ | Dependencies, amendments, applicability relationships |
| Regulatory text corpus | 50 GB | Accumulated regulatory text across all jurisdictions and years |

### Storage Estimations

| Data Type | Size Estimate | Calculation |
|---|---|---|
| Business profiles and obligation maps | 3 TB | 3M businesses × 1 MB (profile, parameters, obligation graph) |
| Document vault | 150 TB | 3M businesses × 50 MB avg (PDFs, receipts, certificates over time) |
| Regulatory knowledge graph | 5 TB | 50K nodes with rich metadata + 500K edges + full text of regulations |
| Notification history | 10 TB/year | 8M notifications/day × 365 × 4 KB per record (content, delivery status, timestamps) |
| Filing data and form history | 8 TB | 3M businesses × ~30 filings/year × 1 KB per filing record × multi-year retention |
| Audit trail and activity logs | 5 TB/year | 3.75M MAU × 10 events/day × 365 × 500 bytes |
| Search index | 10 TB | Full-text index of documents + regulatory text |
| Total active storage | ~191 TB | Sum of above |

### Compute Estimations

| Component | Scale | Notes |
|---|---|---|
| NLP regulatory parsing | 500-1,000 documents/day | GPU inference for NER, summarization, and obligation extraction |
| Document classification | 100,000 uploads/day | CNN + OCR pipeline for uploaded compliance documents |
| Deadline computation | 40M recomputations/day | Triggered by business events, regulatory changes, and calendar ticks |
| Notification dispatch | 8M messages/day | Multi-channel: WhatsApp, SMS, email, push |
| Dashboard queries | 5M queries/day | 3.75M MAU × 1.3 avg sessions/day × 1 dashboard load |
| Document search queries | 500K queries/day | Search during filing preparation and audit responses |

### Cost Drivers

| Component | Monthly Estimate | Notes |
|---|---|---|
| Compute (API, services) | $120,000 | Microservices across regions; deadline computation is CPU-intensive |
| GPU (NLP pipelines) | $40,000 | Regulatory parsing, document classification, summarization |
| Storage (document vault + DB) | $80,000 | 191 TB with tiered lifecycle (hot/warm/cold) |
| Notification channels | $100,000 | WhatsApp Business API + SMS gateway + email; SMS is the dominant cost |
| Graph database | $25,000 | Regulatory knowledge graph hosting and query compute |
| Search infrastructure | $15,000 | Full-text search cluster for document vault and regulatory text |
| **Total infrastructure** | **~$380,000/month** | Before notification channel pass-through optimization |
| **Per-active-business cost** | **~$0.25/month** | $380K / 1.5M active businesses |

---

## SLO Summary Dashboard

| Category | Metric | SLO | Error Budget (monthly) |
|---|---|---|---|
| **Availability** | Notification delivery | 99.99% | 4.3 minutes of downtime |
| **Availability** | Dashboard uptime | 99.9% | 43.8 minutes |
| **Availability** | Document vault uptime | 99.95% | 21.9 minutes |
| **Latency** | Dashboard load (p95) | ≤ 2 s | 5% of requests can exceed |
| **Latency** | Notification delivery (p95) | ≤ 60 s from schedule | 5% of notifications can be delayed |
| **Correctness** | Obligation mapping accuracy | ≥ 98% | 2% of obligations may need manual correction |
| **Correctness** | Document classification accuracy | ≥ 92% | 8% may require reclassification |
| **Correctness** | Filing pre-fill accuracy | ≥ 95% | 5% of fields may need manual correction |
| **Freshness** | Regulatory change detection | ≤ 24 hours | 95% of changes detected within SLO |
| **Freshness** | Audit readiness score | Updated daily | Score reflects documents uploaded through previous day |
| **Reliability** | Penalty-bearing deadline reminders | 99.99% delivery | ≤ 1 missed reminder per 10,000 deadline notifications |
| **Durability** | Document vault | 99.999999999% | Zero tolerance for document loss |
