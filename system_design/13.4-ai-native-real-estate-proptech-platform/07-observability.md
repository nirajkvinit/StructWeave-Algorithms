# 13.4 AI-Native Real Estate & PropTech Platform — Observability

## Observability Philosophy

A real estate AI platform has a unique observability challenge: the ground truth for its primary output (property valuation) is revealed infrequently (only when a property transacts), the physical systems it controls (building HVAC) have multi-hour feedback loops (thermal inertia means a bad setpoint takes 30+ minutes to manifest as discomfort), and the compliance consequences of undetected errors are severe (fair lending violations, building safety failures). The observability architecture must detect model degradation weeks before it manifests in customer complaints, monitor physical building systems in real time while distinguishing genuine anomalies from sensor noise, and maintain audit-quality logs for regulatory examination.

---

## AVM Accuracy Monitoring

### Primary Metrics

| Metric | Definition | Target | Alert |
|---|---|---|---|
| **Median Absolute Percentage Error (MdAPE)** | Median of |AVM - sale_price| / sale_price for properties that transact | ≤ 5% (on-market), ≤ 8% (off-market) | > 6% on-market rolling 30-day |
| **Hit rate (±10%)** | Percentage of properties where AVM is within ±10% of sale price | ≥ 85% | < 82% rolling 30-day |
| **Hit rate (±5%)** | Percentage within ±5% | ≥ 60% | < 55% rolling 30-day |
| **Bias (mean signed error)** | Average of (AVM - sale_price) / sale_price; positive = overestimate | 0% ± 1% | |bias| > 1.5% |
| **Geographic bias** | MdAPE variance across metro areas | σ ≤ 2% across metros | Any metro with MdAPE > 12% |
| **Demographic parity** | MdAPE ratio between majority and minority census tracts | ≤ 1.25 | > 1.20 |

### Delayed Ground Truth Handling

AVM accuracy can only be measured when properties transact, creating a 60-90 day feedback loop (from listing to closing to price recording in public records). The observability system handles this by:

1. **Transaction matching pipeline:** Monitors county recorder feeds for new transactions. When a recorded sale matches a property in the valuation universe, the pipeline computes the valuation error (AVM estimate at the time of listing vs. actual sale price) and publishes it to the accuracy tracking system.

2. **Cohort-based monitoring:** Rather than monitoring individual property errors, the system tracks error distributions for transaction cohorts (all properties that sold in a given week). A cohort's MdAPE is meaningful once the cohort has ≥200 transactions (typically 1 week of national data).

3. **Leading indicators (proxy metrics):** Because ground truth is delayed, the platform monitors proxy metrics that correlate with accuracy but are available immediately:
   - **List-to-AVM ratio:** When a new listing price diverges significantly from the AVM estimate (>15%), it may indicate either a mispriced listing or a stale AVM. Tracking the distribution of list-to-AVM ratios over time provides an early signal of market shift that the AVM has not yet captured.
   - **Comparable freshness:** Average age of the nearest comparable sale. If comparable freshness degrades (e.g., median comparable age increases from 4 months to 8 months), valuation accuracy will degrade with a lag.
   - **Feature drift:** Statistical distribution of key features (median home price, price-per-sqft, days on market) compared to the training data distribution. Significant drift triggers proactive model retraining.

---

## Building Intelligence Monitoring

### Sensor Health Metrics

| Metric | Definition | Target | Alert |
|---|---|---|---|
| **Sensor liveness** | Percentage of sensors reporting within their expected interval | ≥ 99.5% | < 99% for any building |
| **Sensor data quality** | Percentage of readings passing plausibility checks | ≥ 99.9% | < 99.5% for any building |
| **Edge gateway uptime** | Percentage of time the building edge gateway is responsive | ≥ 99.99% | Any gateway down > 60 seconds |
| **Sensor-to-twin latency (p99)** | Time from sensor reading to digital twin state update | ≤ 5 s | > 10 s |
| **Safety path latency (p99)** | Time from safety sensor trigger to actuator command | ≤ 100 ms | > 80 ms |

### HVAC Optimization Effectiveness

| Metric | Definition | Target | Alert |
|---|---|---|---|
| **Energy savings vs. baseline** | Monthly energy consumption compared to rule-based baseline | ≥ 15% savings | < 10% savings for any building |
| **Comfort compliance** | Percentage of occupied hours where zone temperature is within comfort band (68-76°F) | ≥ 95% | < 90% for any zone |
| **Comfort complaints** | Occupant-reported temperature complaints per 1000 occupied hours | ≤ 2 | > 5 for any building |
| **Equipment cycling frequency** | Number of HVAC equipment on/off cycles per hour | ≤ 4 cycles/hour | > 6 cycles/hour (damages equipment) |
| **Demand charge savings** | Reduction in peak 15-minute electrical demand vs. no optimization | ≥ 10% | < 5% |

### Predictive Maintenance Monitoring

| Metric | Definition | Target | Alert |
|---|---|---|---|
| **Prediction lead time** | Average days between failure prediction and actual failure | ≥ 14 days | < 7 days (too late for scheduled maintenance) |
| **False positive rate** | Maintenance events triggered by prediction that found no issue | ≤ 10% | > 20% (wastes maintenance resources) |
| **Missed failure rate** | Equipment failures not predicted by the model | ≤ 5% | > 10% |
| **Equipment health score accuracy** | Correlation between predicted health score and actual remaining useful life | r ≥ 0.85 | r < 0.75 |

---

## Property Search Observability

### Search Quality Metrics

| Metric | Definition | Target | Alert |
|---|---|---|---|
| **Search latency (p50 / p99)** | End-to-end query execution time | p50 ≤ 50 ms / p99 ≤ 200 ms | p99 > 300 ms |
| **Zero-result rate** | Percentage of searches returning no results | ≤ 2% | > 5% |
| **Click-through rate (CTR)** | Percentage of search results that receive a click | ≥ 15% for position 1-3 | < 10% for position 1 |
| **Long-click rate** | Percentage of clicks where user spends > 30 seconds on listing | ≥ 40% of clicks | < 30% |
| **Listing freshness** | Time from MLS update to searchable in index | ≤ 15 minutes | > 30 minutes |
| **Index coverage** | Percentage of active MLS listings in search index | ≥ 99.5% | < 99% |

### Natural Language Query Understanding

| Metric | Definition | Target | Alert |
|---|---|---|---|
| **Query classification accuracy** | Percentage of queries where intent is correctly parsed | ≥ 90% | < 85% |
| **Entity extraction recall** | Percentage of query entities (bedrooms, price, style) correctly extracted | ≥ 95% | < 90% |
| **Query reformulation rate** | Percentage of users who immediately reformulate their query (signal of poor understanding) | ≤ 20% | > 30% |

---

## Lease Intelligence Monitoring

### Extraction Quality Metrics

| Metric | Definition | Target | Alert |
|---|---|---|---|
| **Key term extraction F1** | F1 score for top-20 most important clause types (rent, term, parties, escalation) | ≥ 95% | < 93% |
| **Overall extraction F1** | F1 across all 200+ clause types | ≥ 88% | < 85% |
| **Human review rate** | Percentage of lease extractions requiring human review (confidence < 0.9) | ≤ 15% | > 25% |
| **Processing throughput** | Leases processed per hour | ≥ 8 per GPU | < 6 per GPU |
| **Amendment resolution accuracy** | Percentage of amendments correctly composed with base lease | ≥ 90% | < 85% |
| **OCR quality score** | Average character-level confidence from OCR engine | ≥ 0.95 | < 0.90 (indicates poor scan quality batch) |

### Feedback Loop from Human Review

Human reviewers correcting low-confidence extractions provide a continuous ground truth signal:

1. Every correction is logged: original extraction, corrected value, clause type, document characteristics
2. Weekly analysis: if corrections concentrate on specific clause types, the NLP model is fine-tuned on the corrected examples
3. Monthly reporting: extraction accuracy trend by clause type, document format, and OCR quality tier
4. Alert: if human review rate for a specific lease format exceeds 40%, the format may need a dedicated preprocessing rule

---

## Climate Risk Monitoring

| Metric | Definition | Target | Alert |
|---|---|---|---|
| **Risk score coverage** | Percentage of parcels with current (< 1 year) risk scores | ≥ 99% | < 98% |
| **Risk score staleness** | Maximum age of any parcel's pre-computed risk score | ≤ 13 months | > 15 months |
| **Hindcast accuracy** | Correlation between predicted flood/fire events and actual FEMA declarations (backtest) | r ≥ 0.70 | r < 0.60 |
| **Climate data freshness** | Lag between latest GCM output release and incorporation into platform | ≤ 90 days | > 180 days |
| **On-demand computation latency** | Custom scenario analysis latency | ≤ 5 s (single property) | > 10 s |

---

## Tenant Screening Monitoring

| Metric | Definition | Target | Alert |
|---|---|---|---|
| **Decision latency (p99)** | Time from application submission to screening decision | ≤ 3 s | > 5 s |
| **Approval rate** | Overall application approval rate | Monitored (no target) | Sudden change > 10% in 7 days |
| **Approval rate by demographic group** | Approval rate parity across demographic groups | ≤ 20% disparity | > 15% disparity |
| **Adverse action notice rate** | Percentage of denials with complete adverse action notices | 100% | < 100% |
| **Dispute resolution time** | Time to resolve applicant disputes | ≤ 30 days | > 20 days |

---

## Infrastructure Observability

### System Health Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Platform Health                                    [HEALTHY]│
├──────────────┬──────────────┬──────────────┬────────────────┤
│  AVM Service │  Bldg IoT    │  Search      │  Lease NLP     │
│  ██████████  │  ██████████  │  ██████████  │  ██████████    │
│  99.95%      │  99.99%      │  99.97%      │  99.9%         │
│  p99: 22s    │  p99: 3s     │  p99: 145ms  │  7.2 min/lease │
├──────────────┴──────────────┴──────────────┴────────────────┤
│  AVM Accuracy (30-day rolling)                              │
│  MdAPE: 4.8%  Hit±10%: 87%  Bias: +0.3%                   │
│  Demographic parity ratio: 1.12  [PASS]                     │
├─────────────────────────────────────────────────────────────┤
│  Building Intelligence (50,000 buildings)                    │
│  Sensors online: 99.7%  Avg savings: 17.2%  Comfort: 96.1% │
│  Safety incidents (30-day): 0  Predictive maint accuracy: 89%│
├─────────────────────────────────────────────────────────────┤
│  Search Quality                                             │
│  QPS: 4,200  CTR-pos1: 18.3%  Zero-result: 1.2%           │
│  Index freshness: 11 min  NLQ accuracy: 92%                │
├─────────────────────────────────────────────────────────────┤
│  Climate Risk                                               │
│  Coverage: 99.4%  Staleness: 8 months  On-demand p99: 3.8s │
└─────────────────────────────────────────────────────────────┘
```

### Key Distributed Traces

| Trace | Spans | Purpose |
|---|---|---|
| On-demand valuation | API gateway → feature fetch → comparable search (ANN) → model ensemble → explainability → compliance check → response | Identify which step contributes most to p99 latency |
| Property search | API gateway → query parse → geo filter → text search → visual search → fusion/rerank → personalization → response | Detect slow retrieval modalities and fusion bottlenecks |
| Lease abstraction | Upload → OCR → layout → clause classification → entity extraction → validation → routing (auto/human) | Monitor GPU utilization and identify processing bottlenecks |
| Building command | Cloud optimizer → API → command signing → edge gateway → protocol translation → actuator → confirmation | End-to-end latency for non-safety building commands |

### Alert Escalation

| Severity | Criteria | Response | Notification |
|---|---|---|---|
| **P0 — Critical** | Building safety system failure; data breach; AVM service down during market hours | Immediate war room; 15-minute response SLA | PagerDuty + phone call to on-call |
| **P1 — High** | AVM accuracy degradation > 2%; search p99 > 500ms; sensor liveness < 98% for any building | 1-hour response; root cause analysis | PagerDuty + messaging channel |
| **P2 — Medium** | Fair lending metric approaching threshold; lease processing backlog > 24h; climate score staleness > 12 months | Same-day investigation | Messaging channel |
| **P3 — Low** | Comparable freshness degradation; minor feature drift; single MLS feed delay | Next business day review | Dashboard highlight |

### Audit Trail Requirements

All of the following are logged to immutable, append-only storage with retention per regulatory requirements:

| Event | Retention | Purpose |
|---|---|---|
| Every AVM computation (input features, model version, output, comparables) | 7 years | ECOA/fair lending examination |
| Every tenant screening decision (input, model version, decision, adverse reasons) | 5 years | FCRA/Fair Housing examination |
| Every building safety event (sensor reading, safety rule evaluation, actuator command) | 10 years | Building code compliance |
| Every command sent to building actuators | 5 years | Building operations audit |
| Every human review correction on lease extraction | 7 years | Model improvement and data quality audit |
| Disparate impact test results | 7 years | Regulatory examination |
