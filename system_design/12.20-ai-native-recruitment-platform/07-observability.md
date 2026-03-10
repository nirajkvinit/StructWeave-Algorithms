# 12.20 AI-Native Recruitment Platform — Observability

## Observability Philosophy

The recruitment platform has three distinct observability audiences with different concerns:

1. **Engineering teams**: Latency, error rates, infrastructure health, pipeline throughput
2. **Recruiting operations**: Hiring funnel conversion rates, time-to-fill, candidate drop-off, assessment completion rates
3. **Compliance teams**: Adverse impact trends, model version drift, audit log completeness, regulatory SLA adherence

Each audience needs purpose-built dashboards. Raw infrastructure metrics are necessary but not sufficient; the system must emit business-semantic metrics from within application logic, not just proxy them from infrastructure counters.

---

## Key Metrics

### Hiring Funnel Metrics (Business)

| Metric | Description | Alert Threshold |
|---|---|---|
| **Application-to-shortlist rate** | % of applicants advancing to recruiter shortlist per requisition | < 5% or > 70% (both indicate matching miscalibration) |
| **Shortlist-to-interview rate** | % of shortlisted candidates invited to interview by recruiters | < 30% sustained (recruiters rejecting AI shortlist → model quality issue) |
| **Interview-to-offer rate** | % of interviewed candidates receiving offers | Tracked by role type; major deviations indicate assessment score miscalibration |
| **Time-to-fill** | Days from requisition open to offer accepted | Per role type benchmark; alert on > 2 SD above role-type mean |
| **Candidate drop-off rate by stage** | % of candidates who stop engaging at each stage | > 30% drop-off at assessment start → UX or difficulty calibration issue |
| **Conversational AI resolution rate** | % of chatbot sessions that achieved candidate's stated intent without human escalation | < 70% → intent classifier degradation or knowledge gap |
| **Assessment completion rate** | % of candidates who started assessment and completed it | < 60% → assessment too long or too difficult; IRT calibration review |
| **Video interview submission rate** | % of candidates invited who submitted a video | < 50% → candidate friction; platform accessibility review |

### ML Model Health Metrics (Engineering + ML)

| Metric | Description | Alert Threshold |
|---|---|---|
| **Matching embedding drift (PSI)** | Population Stability Index of candidate embedding distributions over time | PSI > 0.2 → significant distribution shift; re-embedding review |
| **Compatibility model ranking stability** | Spearman rank correlation between today's and yesterday's shortlist rankings for the same candidate pool | < 0.85 → unexplained model behavior change |
| **Intent classifier confidence distribution** | P50/P95 of intent confidence scores; track low-confidence rate | > 20% of turns below 0.7 confidence → retraining needed |
| **ASR confidence by candidate language group** | Mean ASR word error rate proxy (confidence score) segmented by self-reported primary language | > 5% gap between language groups → ASR model bias review |
| **IRT theta SE at stopping** | Distribution of standard error at assessment stop; should be narrow and below 0.3 threshold | > 15% of sessions stopping with SE > 0.35 → stopping criterion or item bank issue |
| **Assessment item exposure** | Per-item administration count over 30-day rolling window | > 20% exposure rate → item retirement and replacement |

### Bias and Fairness Metrics (Compliance)

| Metric | Description | Alert Threshold |
|---|---|---|
| **Selection rate by demographic group** | Per-stage, per-requisition selection rates by gender and race/ethnicity | Any group impact ratio < 0.80 with p < 0.05 (4/5ths rule violation) |
| **Adverse impact alert frequency** | Count of bias_monitoring_batches with violation_detected = true per week | > 3 violations per week for a single employer → systematic model issue |
| **Bias batch cycle time** | Time from batch close event to bias analysis complete | > 5 min → bias monitor SLO breach |
| **Compliance hold duration** | Time from FLAGGED status to REVIEWED status for held decision batches | > 4 hours → compliance escalation |
| **Demographic data coverage** | % of candidates who provided demographic data (needed for bias analysis) | < 30% → bias analysis lacks statistical power; candidate notice language review |
| **AEDT notice compliance rate** | % of NYC candidates who received 10-day notice before AEDT application | < 100% → pipeline gate failure; immediate alert |

### Infrastructure Metrics (Engineering)

| Metric | Description | Alert Threshold |
|---|---|---|
| **ANN query p99 latency** | 99th percentile of vector index query latency | > 100 ms (should be 50 ms under normal conditions) |
| **Matching pipeline end-to-end p99** | From application received to shortlist available | > 2 s |
| **Video analysis queue depth** | Number of video submissions awaiting processing | > 5,000 (indicates > 2h lag in 30-min SLO pipeline) |
| **Conversational AI turn latency p95** | End-to-end turn processing time | > 800 ms |
| **Audit log write latency p99** | Time to write one audit entry and confirm durability | > 200 ms |
| **Erasure pipeline completion rate** | % of erasure requests completed within 30-day deadline | < 100% → immediate compliance alert |

---

## Distributed Tracing

Every candidate journey is assigned a trace_id at first contact (application or sourcing crawl). This trace_id propagates through all downstream pipeline stages:

```
Trace propagation:
  Candidate applies → trace_id generated at API gateway
  ↓
  Profile enrichment → trace_id in request header
  Embedding generation → trace_id in gRPC metadata
  ANN search → trace_id in query context
  Compatibility model inference → trace_id in batch item
  Bias monitoring → trace_id in decision event
  Audit log → trace_id as indexed field

Use cases:
  - Debug why a specific candidate was ranked #47 (pull full trace: embedding, ANN distances, feature vector, model output)
  - Investigate a bias alert (trace all decisions in the flagged batch; inspect feature attributions)
  - Diagnose a slow matching operation (trace shows which stage was slow: ANN query vs. model inference)
  - GDPR access request: trace_id enables complete reconstruction of all processing that touched a candidate's data
```

---

## Alerting and On-Call Design

### Alert Tiers

| Tier | Condition | Response |
|---|---|---|
| **SEV-1 (Page immediately)** | Bias monitor gate failure (decisions released without bias check); AEDT notice pipeline failure; audit log write failure; candidate API gateway down | On-call engineer + compliance officer paged immediately |
| **SEV-2 (Page within 15 min)** | Matching pipeline p99 > 5s; video analysis SLO at risk (queue depth > 5,000); conversational AI p95 > 2s; compatibility model unavailable | On-call engineer paged |
| **SEV-3 (Alert in business hours)** | Bias violation detected (batch FLAGGED); ASR confidence gap > 5%; intent classifier confidence degradation; model embedding drift PSI > 0.2 | ML engineer + compliance analyst notified next business day |
| **SEV-4 (Weekly digest)** | Assessment completion rate < 60%; candidate drop-off spikes; time-to-fill trending above benchmark | Recruiting ops team digest report |

### Compliance-Specific Alerting

Compliance alerts are routed to a separate on-call rotation (compliance officer + data privacy officer) to ensure that regulatory SLO breaches are handled by the appropriate function rather than relying on engineering on-call:

- GDPR erasure deadline at risk (< 7 days to 30-day deadline, not yet complete)
- LL144 bias audit publication deadline approaching (< 30 days, audit not yet generated)
- EU AI Act logging availability < 99% (regulatory logging obligation)
- Adverse impact alert in FLAGGED state > 4 hours without human review

---

## Dashboards

### Recruiter Operations Dashboard

```
Panels:
  [1] Hiring funnel funnel chart: Application → Shortlist → Interview → Offer → Hire (per week)
  [2] Time-to-fill by role type and seniority (rolling 30 days)
  [3] Candidate drop-off rate by stage (table with % change vs. prior week)
  [4] Assessment completion rate by assessment type
  [5] Chatbot resolution rate (rolling 7 days)
  [6] Top shortlist rejection reasons by recruiters (feedback loop quality)
```

### Model Health Dashboard

```
Panels:
  [1] Candidate embedding PSI trend (rolling 30-day window, daily computation)
  [2] Compatibility model ranking stability (Spearman correlation daily chart)
  [3] ANN query latency p50/p95/p99 (line chart, 1-hour resolution)
  [4] Intent classifier confidence distribution (histogram, daily snapshot)
  [5] ASR confidence by language group (grouped bar chart, weekly)
  [6] Active model versions per subsystem (table: service, version, deployed_at)
```

### Bias and Compliance Dashboard

```
Panels:
  [1] Adverse impact ratio heatmap: rows = demographic categories, columns = pipeline stages
      Color: green (ratio ≥ 0.9), yellow (0.80–0.89), red (< 0.80)
  [2] Bias alert frequency: flagged batches per week, per employer
  [3] Bias batch cycle time p50/p95 (SLO line at 5 min)
  [4] AEDT notice compliance: % of candidates noticed on time (100% target)
  [5] GDPR erasure pipeline: open requests, % on track, % at risk
  [6] LL144 audit status: generated / published / next due date
```

---

## Model Monitoring and Drift Detection

### Embedding Drift Monitoring

```
Process:
  Weekly job: Sample 10,000 candidate embeddings from the current index
  Compute PSI vs. baseline distribution (established at model deployment)
  PSI > 0.1: "slight shift" → logged, no action
  PSI > 0.2: "significant shift" → SEV-3 alert; ML engineer reviews
  PSI > 0.3: "major shift" → SEV-2 alert; consider re-embedding all profiles

Why it matters:
  If the distribution of candidate profiles shifts significantly (e.g., a new source of candidates
  from a different industry is onboarded), the ANN index may no longer accurately represent
  the candidate pool, degrading matching recall without any visible error.
```

### Assessment Item Drift Detection

```
Process:
  Daily job: For each item, compare observed p-correct rate in last 30 days vs. calibrated p-correct rate
  If |observed - calibrated| > 0.10: item flagged for re-calibration
  Items with significant drift are retired from the adaptive pool until re-calibrated

Why it matters:
  An item that was calibrated as "medium difficulty" when engineers with 3 years of experience
  took it may become "easy" as the candidate pool shifts to include more senior engineers.
  If difficulty estimates are wrong, IRT theta estimates are biased.
```
