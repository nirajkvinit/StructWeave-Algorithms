# AI Native ATS Cloud SaaS - Requirements & Estimations

[Back to Index](./00-index.md) | [Next: High-Level Design →](./02-high-level-design.md)

---

## Functional Requirements

### Core Features (Must Have)

| Feature | Description | AI Enhancement |
|---------|-------------|----------------|
| **Job Management** | Create, edit, publish job postings with requirements | AI extracts skills, suggests requirements |
| **Resume Intake** | Upload resumes (PDF, DOCX, scanned), parse to structured data | Intelligent parsing, format normalization |
| **Candidate Profiles** | Unified candidate view with history, skills, experience | Auto-enrichment, skill inference |
| **Semantic Matching** | Match candidates to jobs beyond keywords | Vector embeddings, contextual understanding |
| **AI Scoring** | Multi-dimensional candidate evaluation | Skills + experience + culture + trajectory |
| **Application Pipeline** | Stage-based workflow (applied → screened → interviewed → offered) | Predictive stage duration, bottleneck alerts |
| **Interview Scheduling** | Coordinate availability, send invites | Conversational AI via chat/SMS/WhatsApp |
| **Decision Audit Trail** | Record all AI decisions with explanations | SHAP/LIME attribution, citations |
| **Bias Monitoring** | Track scoring patterns by demographic | Real-time disparate impact detection |
| **Compliance Reporting** | EEOC reports, bias audits, data exports | Automated report generation |

### Secondary Features (Should Have)

| Feature | Description |
|---------|-------------|
| **Candidate Rediscovery** | Surface past applicants for new roles |
| **Talent Pools** | Group candidates by skills/interests |
| **Email Campaigns** | Nurture passive candidates |
| **Career Site Integration** | Embed application forms on company sites |
| **Referral Tracking** | Track employee referrals, attribute hires |
| **Offer Management** | Generate offers, track approvals |
| **Onboarding Handoff** | Transfer data to HRIS on hire |

### Out of Scope

| Feature | Reason |
|---------|--------|
| Payroll processing | Separate HRIS/payroll system |
| Performance management | Post-hire domain |
| Learning management | Separate LMS system |
| Background checks | Third-party integration only |
| Video interviewing | Partner integration (HireVue, etc.) |

---

## Non-Functional Requirements

### CAP Theorem Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAP THEOREM CHOICE: CP                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CONSISTENCY (Strong)          PARTITION TOLERANCE (Required)   │
│  ─────────────────────         ─────────────────────────────    │
│  • Application state must      • Multi-region deployment        │
│    be consistent               • Network partitions happen      │
│  • AI scores must reflect      • Must handle split-brain        │
│    latest candidate data                                        │
│  • Compliance requires         AVAILABILITY (Best Effort)       │
│    accurate audit trails       ─────────────────────────────    │
│                                • 99.9% target (not 99.99%)      │
│                                • Graceful degradation for AI    │
│                                • Read-only mode during issues   │
│                                                                 │
│  JUSTIFICATION:                                                 │
│  • Hiring decisions are high-stakes (legal liability)           │
│  • EEOC audits require accurate historical data                 │
│  • Better to delay than serve stale/incorrect scores            │
│  • AI scoring can degrade gracefully (queue for later)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Consistency Model

| Component | Consistency | Justification |
|-----------|-------------|---------------|
| **Applications** | Strong | State changes must be atomic |
| **AI Scores** | Strong | Scores must match current candidate data |
| **Candidate Profiles** | Strong | PII updates must be immediate |
| **Analytics/Reports** | Eventual (5-min lag) | Aggregates tolerate staleness |
| **Search Index** | Eventual (1-min lag) | Near-real-time acceptable |
| **Audit Logs** | Strong (append-only) | Compliance requires accuracy |

### Availability Target

| Tier | Target | Components |
|------|--------|------------|
| **Critical** | 99.9% (8.76h/year downtime) | Application submission, pipeline management |
| **Standard** | 99.5% (43.8h/year downtime) | AI scoring, semantic matching |
| **Best Effort** | 99.0% (87.6h/year downtime) | Analytics, reporting, conversational AI |

**Degradation Strategy:**
- AI scoring unavailable → Queue applications, fallback to basic keyword matching
- Scheduling AI unavailable → Manual scheduling UI
- Analytics unavailable → Core ATS continues operating

### Latency Targets

| Operation | p50 | p95 | p99 | Notes |
|-----------|-----|-----|-----|-------|
| Page load (recruiter portal) | 100ms | 200ms | 500ms | Edge cached assets |
| Candidate search | 150ms | 300ms | 800ms | Vector + text hybrid |
| Resume upload + parse | 2s | 5s | 10s | Async with progress |
| AI scoring (single) | 200ms | 500ms | 1s | Pre-computed embeddings |
| Bulk ranking (100 candidates) | 1s | 3s | 5s | Parallel scoring |
| Interview scheduling (conversational) | 1s | 2s | 5s | LLM generation |
| Report generation | 5s | 15s | 30s | Background job |

### Durability Guarantees

| Data Type | Durability | Mechanism |
|-----------|------------|-----------|
| Candidate data | 99.999999999% (11 9s) | Multi-region replication, cross-zone |
| Resumes/documents | 99.999999999% (11 9s) | Object storage with versioning |
| AI scores | 99.99999% (7 9s) | Database replication |
| Audit logs | 99.999999999% (11 9s) | Append-only, immutable, replicated |
| Analytics data | 99.9999% (6 9s) | Recoverable from event replay |

---

## Capacity Estimations

### Assumptions (Large Enterprise ATS)

| Parameter | Value | Basis |
|-----------|-------|-------|
| Enterprise customers | 500 | Mid-to-large enterprises |
| Avg recruiters per customer | 50 | HR team size |
| Avg open jobs per customer | 200 | Active requisitions |
| Avg applications per job | 150 | Competitive roles |
| Resume size (avg) | 500KB | PDF with formatting |
| Candidate profile (structured) | 50KB | JSON with history |
| Embedding dimension | 1024 | BGE-large model |

### Traffic Estimations

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Total recruiters** | 500 customers × 50 recruiters | 25,000 recruiters |
| **Peak concurrent users** | 25,000 × 40% × 50% peak | ~5,000 concurrent |
| **Monthly applications** | 500 × 200 jobs × 150 apps × 0.3 monthly turnover | ~4.5M applications/month |
| **Daily applications** | 4.5M / 30 | ~150K applications/day |
| **Peak applications** | 150K × 3 (spikes) | ~450K applications/day peak |

### QPS Estimations

| Operation | Daily Volume | Avg QPS | Peak QPS (3x) |
|-----------|--------------|---------|---------------|
| Resume uploads | 150K | 1.7 | 5 |
| Resume parsing | 150K | 1.7 | 5 |
| AI scoring requests | 150K × 5 (multi-job) | 8.7 | 26 |
| Candidate searches | 25K users × 20 searches | 5.8 | 17 |
| Profile views | 25K users × 50 views | 14.5 | 44 |
| Application updates | 150K × 3 stage changes | 5.2 | 16 |
| Scheduling messages | 20K interviews × 5 msgs | 1.2 | 4 |
| **Total API requests** | - | ~40 QPS | ~120 QPS |

### Storage Estimations

| Data Type | Year 1 | Year 5 | Calculation |
|-----------|--------|--------|-------------|
| **Candidate profiles** | 2.7TB | 13.5TB | 4.5M/mo × 12 × 50KB |
| **Resumes/documents** | 27TB | 135TB | 4.5M/mo × 12 × 500KB |
| **Vector embeddings** | 220GB | 1.1TB | 4.5M × 12 × 1024 dims × 4 bytes |
| **Audit logs** | 500GB | 2.5TB | 100 bytes × 150K × 365 × 10 events |
| **Analytics (aggregated)** | 100GB | 500GB | Compressed aggregates |
| **Total storage** | ~31TB | ~153TB | - |

### Compute Estimations

| Component | Year 1 | Year 5 | Notes |
|-----------|--------|--------|-------|
| **API servers** | 20 instances | 100 instances | 4 vCPU, 16GB RAM each |
| **AI inference (GPU)** | 8 GPUs | 40 GPUs | A100/H100 for LLM serving |
| **Embedding servers** | 4 instances | 20 instances | CPU-optimized for BGE |
| **Vector DB nodes** | 6 nodes | 30 nodes | High-memory instances |
| **Database (primary)** | 3 nodes | 15 nodes | Multi-region |
| **Database (read replicas)** | 6 nodes | 30 nodes | Per-region replicas |

### Bandwidth Estimations

| Direction | Calculation | Bandwidth |
|-----------|-------------|-----------|
| **Inbound (resumes)** | 150K/day × 500KB | ~900 MB/day, ~10 KB/s avg |
| **Inbound (API)** | 40 QPS × 10KB avg request | ~400 KB/s |
| **Outbound (API)** | 40 QPS × 50KB avg response | ~2 MB/s |
| **Internal (AI)** | 10 QPS × 1MB (embeddings) | ~10 MB/s |
| **Total bandwidth** | - | ~15 MB/s avg, ~50 MB/s peak |

---

## SLOs / SLAs

### Service Level Objectives

| Metric | SLO Target | Measurement | Alert Threshold |
|--------|------------|-------------|-----------------|
| **Availability (core)** | 99.9% monthly | Synthetic probes every 1 min | <99.95% over 1 hour |
| **Availability (AI)** | 99.5% monthly | Health checks on inference | <99.7% over 1 hour |
| **Latency (p99 search)** | <800ms | Real user monitoring | >600ms p95 |
| **Latency (p99 scoring)** | <1s | Request tracing | >800ms p95 |
| **Error rate (API)** | <0.1% | 5xx responses / total | >0.05% over 10 min |
| **Throughput (applications)** | >500K/day capacity | Queue depth monitoring | Queue >10K |
| **Data freshness (search)** | <1 min lag | Index timestamp check | >2 min lag |
| **Bias metric (disparate impact)** | >0.8 ratio | Weekly fairness audit | <0.85 ratio |

### Service Level Agreements (Customer-Facing)

| Tier | Availability | Support Response | Data Retention | Price Multiplier |
|------|--------------|------------------|----------------|------------------|
| **Standard** | 99.5% | 24 hours | 2 years | 1x |
| **Professional** | 99.9% | 4 hours | 5 years | 2x |
| **Enterprise** | 99.9% + DR | 1 hour + dedicated | 7 years + compliance | 3x |

### SLA Credits

| Downtime | Credit |
|----------|--------|
| 99.0% - 99.9% | 10% monthly credit |
| 95.0% - 99.0% | 25% monthly credit |
| <95.0% | 50% monthly credit |

---

## Compliance Requirements

### Data Retention

| Data Type | Retention | Regulation Basis |
|-----------|-----------|------------------|
| **Successful hire data** | 7 years | Employment records, tax |
| **Rejected candidate data** | 2 years (default), 4 years (federal contractor) | EEOC, OFCCP |
| **AI decision audit logs** | 5 years minimum | EU AI Act, internal policy |
| **Interview recordings** | 1 year (if applicable) | State laws vary |
| **Consent records** | Duration of data + 3 years | GDPR Art. 7 |

### Geographic Data Residency

| Region | Requirement | Implementation |
|--------|-------------|----------------|
| **EU (GDPR)** | EU candidate data in EU data centers | Regional tenant routing |
| **California (CCPA)** | Deletion within 45 days, no selling | Deletion workflows |
| **New York City** | Annual bias audits published | Automated audit reports |
| **Illinois (BIPA)** | Consent for biometric data | No biometric processing (out of scope) |
| **Federal Contractors** | 4-year retention, OFCCP access | Extended retention tier |

### Bias Audit Requirements

| Jurisdiction | Requirement | Frequency |
|--------------|-------------|-----------|
| **NYC Local Law 144** | Independent bias audit, public summary | Annual |
| **EEOC Guidance** | Disparate impact analysis | Ongoing monitoring |
| **EU AI Act** | Risk assessment, human oversight | Before deployment + ongoing |
| **Internal Best Practice** | Fairness metrics dashboard | Real-time |

---

## Scalability Milestones

| Phase | Customers | Applications/Month | Key Scaling Actions |
|-------|-----------|-------------------|---------------------|
| **Launch** | 50 | 500K | Single region, shared GPU |
| **Growth** | 200 | 2M | Multi-region, dedicated GPU pool |
| **Scale** | 500 | 5M | Global edge, federated vector DB |
| **Enterprise** | 1000+ | 10M+ | Dedicated tenant infrastructure option |

---

## Cost Estimation (Year 1)

| Category | Monthly Cost | Notes |
|----------|--------------|-------|
| **Compute (API/services)** | $15,000 | 20 instances |
| **GPU infrastructure** | $40,000 | 8 A100 GPUs |
| **Database (managed)** | $10,000 | Multi-region PostgreSQL |
| **Vector database** | $8,000 | 6-node cluster |
| **Object storage** | $3,000 | 30TB with redundancy |
| **Networking/CDN** | $2,000 | Global distribution |
| **Observability** | $3,000 | Metrics, logs, traces |
| **Security/compliance** | $2,000 | WAF, audit tools |
| **Total** | ~$83,000/month | ~$1M/year |

**Cost per customer (500 customers):** ~$166/month

**Cost per application processed:** ~$0.22 (4.5M applications/year)

---

## Constraints and Assumptions

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| GPU availability | LLM inference capacity limited | Queue management, model quantization |
| Vector DB scale | Embedding search at millions scale | Sharding, ANN index optimization |
| Cold start latency | First request to sleeping tenant slow | Keep-warm pools, predictive scaling |
| Resume format variety | Parsing accuracy varies | Multi-model ensemble, human review |

### Business Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Compliance deadlines | NYC bias audit law effective | Automated audit pipeline |
| Customer data sovereignty | Some require on-premises | Hybrid deployment option |
| Integration requirements | Must work with existing HRIS | API-first, standard protocols |
| Budget sensitivity | SMB customers cost-conscious | Tiered pricing, usage-based |

### Assumptions

- Customers accept 99.9% (not 99.99%) availability for cost efficiency
- AI scoring latency of 500ms-1s is acceptable for async workflows
- English-language resumes are primary (multi-language as roadmap)
- Self-hosted AI is differentiator worth GPU infrastructure cost
- Bias detection is competitive advantage, not just compliance checkbox
