# 14.1 AI-Native MSME Credit Scoring & Lending Platform — Observability

## Observability Philosophy

MSME lending platform observability must span three distinct domains with different monitoring cadences: the **decision pipeline** (application intake through disbursement, requiring second-level visibility to detect latency degradation or service failures that block loan origination), the **model health plane** (credit scoring accuracy, fairness, and drift, requiring daily-to-weekly visibility with 90-day lagging indicators for default prediction), and the **portfolio health plane** (delinquency, early warning signals, and collection effectiveness, requiring daily batch monitoring with trend analysis). Each domain has fundamentally different alert semantics—a scoring latency spike is an operational emergency, a model Gini decline is a strategic concern, and a delinquency rate increase may be a seasonal pattern or a systemic problem requiring investigation.

---

## Decision Pipeline Metrics

### Application Processing

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `pipeline.applications_per_minute` | Inbound application rate | Per forecast | Deviation > 50% from hourly forecast |
| `pipeline.e2e_latency_p99_s` | End-to-end decision latency (auto-approve path) | ≤ 5 s | > 8 s |
| `pipeline.aa_fetch_latency_p95_s` | AA data fetch time per FIP | ≤ 45 s | > 60 s per FIP |
| `pipeline.aa_fetch_success_rate` | % of AA fetches returning data | > 95% | < 90% per FIP |
| `pipeline.parsing_latency_p95_s` | Bank statement parsing time | ≤ 8 s (10-page statement) | > 15 s |
| `pipeline.scoring_latency_p99_ms` | Model inference time | ≤ 200 ms | > 500 ms |
| `pipeline.auto_approve_rate` | % of applications auto-approved | 25–35% | < 20% or > 45% (policy drift) |
| `pipeline.auto_decline_rate` | % of applications auto-declined | 35–45% | < 25% or > 55% |
| `pipeline.manual_review_rate` | % routed to manual review | 20–30% | > 40% (model uncertainty spike) |
| `pipeline.manual_review_queue_depth` | Pending manual review applications | < 500 | > 1,000 (queue backlog) |
| `pipeline.manual_review_sla_breach_pct` | % of reviews exceeding 4-hour SLA | < 5% | > 15% |

### Data Processing Quality

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `parsing.transaction_categorization_accuracy` | % of transactions correctly categorized (sampled) | > 92% | < 88% |
| `parsing.uncategorized_transaction_pct` | % of transactions with "UNKNOWN" category | < 5% | > 10% |
| `parsing.gst_bank_mismatch_rate` | % of applications with GST-bank revenue mismatch > 30% | < 15% | > 25% (data quality or fraud signal) |
| `parsing.ocr_failure_rate` | % of document pages failing OCR extraction | < 2% | > 5% |
| `feature.completeness_avg` | Average feature completeness across applications | > 70% | < 60% (data source degradation) |
| `feature.store_staleness_pct` | % of feature vectors older than 90 days | < 10% | > 20% |

---

## Credit Scoring & Model Health Metrics

### Model Performance (Lagging — 90-Day Vintage)

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `model.gini_coefficient` | Gini coefficient on 90-day vintage | > 0.40 | < 0.35 (model degradation) |
| `model.ks_statistic` | KS statistic (max separation between good/bad distributions) | > 0.30 | < 0.25 |
| `model.auc_roc` | Area under ROC curve | > 0.75 | < 0.70 |
| `model.calibration_brier` | Brier score (calibration quality) | < 0.15 | > 0.20 (miscalibrated) |
| `model.vintage_default_rate` | 90-day default rate for each origination month | Per risk grade target | > 1.5x expected for any grade |

### Model Stability (Leading — Daily)

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `model.psi_score_distribution` | Population Stability Index on score distribution | < 0.10 | > 0.20 (significant drift) |
| `model.psi_feature_{name}` | PSI per top-20 feature | < 0.10 each | > 0.25 (feature distribution shift) |
| `model.approval_rate_7d` | 7-day rolling approval rate | ± 5% of target | Deviation > 10% |
| `model.avg_score_7d` | 7-day rolling average credit score | Stable within ±0.02 | Change > 0.05 |
| `model.challenger_gini_delta` | Challenger Gini minus champion Gini | Monitored | > +0.02 sustained for 30 days (promotion candidate) |

### Model Fairness (Weekly)

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `fairness.approval_rate_gender_gap` | Approval rate difference (male vs. female) | < 5 pp | > 8 pp |
| `fairness.approval_rate_geo_variance` | Variance of approval rates across top-50 pin codes | Low | Any pin code > 2x or < 0.5x overall rate |
| `fairness.interest_rate_gender_gap_bps` | Average APR difference (male vs. female) at same risk grade | < 50 bps | > 200 bps |
| `fairness.equalized_odds_tpr_gap` | True positive rate gap across demographic groups | < 0.05 | > 0.10 |
| `fairness.counterfactual_flip_rate` | % of declines that would be approved with different demographics | < 2% | > 5% |

---

## Fraud Detection Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `fraud.scoring_latency_p99_ms` | Fraud scoring latency | ≤ 500 ms | > 800 ms |
| `fraud.auto_block_rate` | % of applications auto-blocked by fraud detection | 1–3% | > 5% (fraud spike or false-positive spike) |
| `fraud.manual_review_rate` | % routed to fraud review | 3–5% | > 8% |
| `fraud.stacking_detected_daily` | Loan stacking cases detected per day | Informational | > 2x 30-day average |
| `fraud.ring_detected_weekly` | Fraud rings detected per week | Informational | > 5 rings/week (coordinated attack) |
| `fraud.first_emi_default_rate` | % of loans defaulting on first EMI | < 2% | > 3% (early payment default spike) |
| `fraud.false_positive_rate` | % of manually reviewed fraud flags found to be legitimate | < 30% | > 50% (model precision degradation) |
| `fraud.graph_query_latency_p95_ms` | Fraud graph traversal time | ≤ 200 ms | > 500 ms |
| `fraud.velocity_check_latency_p99_ms` | Velocity check execution time | ≤ 20 ms | > 50 ms |

---

## Disbursement & Collection Metrics

### Disbursement

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `disbursement.e2e_latency_p95_min` | Time from approval to fund credited | ≤ 5 min | > 10 min |
| `disbursement.success_rate` | % of disbursements completed successfully | > 98% | < 95% |
| `disbursement.penny_drop_success_rate` | % of penny-drop verifications successful | > 97% | < 93% |
| `disbursement.rail_success_rate_{rail}` | Success rate per payment rail (UPI/IMPS/NEFT) | > 99% (UPI), > 99.5% (IMPS) | < 95% for any rail |
| `disbursement.mandate_registration_success` | % of e-mandate registrations successful | > 85% | < 75% |
| `disbursement.daily_volume_crore` | Daily disbursement amount | Per forecast | Deviation > 30% from forecast |

### Collection

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `collection.auto_debit_success_rate` | % of NACH deductions successful on first attempt | > 75% | < 65% |
| `collection.contact_rate` | % of delinquent borrowers successfully contacted | > 60% | < 45% |
| `collection.promise_to_pay_conversion` | % of promises that convert to actual payment | > 50% | < 35% |
| `collection.sms_delivery_rate` | % of SMS messages delivered | > 95% | < 90% |
| `collection.whatsapp_read_rate` | % of WhatsApp messages read within 24h | > 70% | < 55% |
| `collection.field_visit_resolution_rate` | % of field visits resulting in payment | > 40% | < 25% |
| `collection.optimal_time_hit_rate` | % of contacts made within ML-recommended window | > 80% | < 60% |

---

## Portfolio Health Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| `portfolio.total_outstanding_crore` | Total portfolio outstanding | Per plan | Deviation > 10% from plan |
| `portfolio.dpd_0_pct` | % of portfolio current (DPD=0) | > 92% | < 88% |
| `portfolio.dpd_1_30_pct` | % of portfolio DPD 1-30 | < 5% | > 7% |
| `portfolio.dpd_31_60_pct` | % of portfolio DPD 31-60 | < 2% | > 3% |
| `portfolio.dpd_61_90_pct` | % of portfolio DPD 61-90 | < 1% | > 1.5% |
| `portfolio.npa_pct` | % of portfolio NPA (DPD > 90) | < 3% | > 4% |
| `portfolio.ews_triggered_pct` | % of active loans with early warning signal | Informational | > 10% (systemic stress) |
| `portfolio.vintage_loss_rate_{month}` | Cumulative loss rate by origination month | Per risk grade | > 1.5x expected |
| `portfolio.concentration_top10_pct` | % of portfolio in top 10 borrowers | < 5% | > 10% (concentration risk) |
| `portfolio.sector_concentration` | Maximum exposure to any single sector | < 20% | > 30% |

---

## Dashboard Structure

### Operations Dashboard (Real-Time)

```
┌────────────────────────────────────────────────────────────────────┐
│ LENDING PLATFORM STATUS: OPERATIONAL      Apps/min: 345  ↑ 12%     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─ Pipeline Health ──────────┐  ┌─ Fraud Detection ────────────┐ │
│  │ Decision Latency p99: 3.2s │  │ Auto-Block Rate: 2.1%        │ │
│  │ AA Fetch p95: 28s    ✓     │  │ Manual Review: 4.3%          │ │
│  │ Scoring p99: 145ms   ✓     │  │ Stacking Today: 23 cases     │ │
│  │ Auto-Approve: 31%         │  │ Rings Detected: 1            │ │
│  │ Manual Queue: 234    ✓     │  │ Fraud Score p99: 380ms  ✓    │ │
│  └────────────────────────────┘  └───────────────────────────────┘ │
│                                                                    │
│  ┌─ Disbursement ─────────────┐  ┌─ Collection ─────────────────┐ │
│  │ Today: ₹892 Cr disbursed   │  │ Auto-Debit Success: 76%      │ │
│  │ Success Rate: 98.7%   ✓    │  │ Contact Rate: 63%            │ │
│  │ UPI Rail: 99.2%     ✓     │  │ PTP Conversion: 48%          │ │
│  │ IMPS Rail: 99.5%    ✓     │  │ SMS Delivery: 96%       ✓    │ │
│  │ Pending: 45 disbursements  │  │ WhatsApp Read: 72%      ✓    │ │
│  └────────────────────────────┘  └───────────────────────────────┘ │
│                                                                    │
│  ┌─ Data Source Health ─────────────────────────────────────────┐  │
│  │ AA (Bank A): ✓ 22s   AA (Bank B): ✓ 31s   AA (Bank C): ⚠ 55s│  │
│  │ Bureau: ✓ 2.1s       KYC: ✓ 1.4s          CKYC: ✓ 0.8s    │  │
│  │ UPI Feed: ✓ active   GST Portal: ✓ 18s    e-Mandate: ✓     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─ Model Health ────────────────────────────────────────────────┐ │
│  │ Champion (bureau-plus): Gini 0.44 ✓   PSI: 0.08 ✓           │ │
│  │ Champion (thin-file):   Gini 0.38 ✓   PSI: 0.12 ⚠           │ │
│  │ Champion (NTC):         Gini 0.31 ✓   PSI: 0.07 ✓           │ │
│  │ Fairness: Gender gap 3.2pp ✓   Geo variance: Normal ✓       │ │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

## Alerting Strategy

### Alert Severity Classification

| Severity | Response Time | Examples | Notification Channel |
|---|---|---|---|
| **CRITICAL** | Immediate (<5 min) | Fraud service down (disbursements blocked), credit scoring engine crash, payment rail total failure, double-disbursement detected | PagerDuty + phone call to on-call engineer |
| **HIGH** | < 30 minutes | Decision latency > 10s sustained, auto-approve rate swing > 15%, first-EMI default spike, fraud ring detected | Slack alert + on-call page |
| **MEDIUM** | < 2 hours | AA FIP degradation, model PSI > 0.2, manual review queue > 1000, auto-debit success rate < 65% | Slack channel + email |
| **LOW** | < 8 hours | Feature staleness > 20%, parsing accuracy below target, collection contact rate drop, challenger model outperformance | Dashboard highlight + daily digest |
| **INFO** | Daily review | Portfolio composition changes, vintage analysis updates, regulatory report generation status | Daily summary email |

### Alert Correlation and Deduplication

```
Correlation rules:
  - AA FIP timeout → suppress individual application timeout alerts for that FIP
  - Payment rail degradation → suppress individual disbursement failure alerts for that rail
  - Model PSI spike → correlate with feature-level PSI spikes to identify root cause feature
  - Delinquency rate increase → correlate with geographic and sector distribution
    to distinguish systemic vs. localized issue

Suppression during known events:
  - Festival season: suppress approval rate alerts (expected increase)
  - Bank holiday: suppress auto-debit failure alerts (expected: banks not processing)
  - Regulatory reporting window: suppress audit trail query latency alerts

Escalation:
  - CRITICAL unacknowledged for 10 minutes → escalate to engineering lead
  - HIGH unacknowledged for 30 minutes → escalate to platform manager
  - Any regulatory compliance alert → immediate compliance officer notification
  - Any double-disbursement or data breach → immediate C-level notification
```

---

## Distributed Tracing for Credit Decisions

Every credit decision generates a trace spanning the full pipeline:

```
Trace: Loan Application LA-2026-0312-789456
  ├─ [0 ms] Application received via partner API (partner: ECOM_PARTNER_A)
  ├─ [50 ms] KYC verification initiated (Aadhaar eKYC + PAN verification)
  ├─ [1,200 ms] KYC verified: Aadhaar ✓, PAN ✓, CKYC match ✓
  ├─ [1,250 ms] AA consent verified; data fetch initiated for 2 FIPs
  ├─ [1,300 ms] Bureau pull initiated
  ├─ [3,500 ms] Bureau response received: score 712, 3 tradelines
  ├─ [22,000 ms] FIP-1 (Bank A): 6 months bank statement received
  ├─ [22,100 ms] Bank statement parsing started (8 pages)
  ├─ [26,300 ms] Parsing complete: 342 transactions categorized
  ├─ [35,000 ms] FIP-2 (GST Network): 12 months GST returns received
  ├─ [35,500 ms] Feature engineering: 186/200 features computed (completeness: 93%)
  ├─ [35,700 ms] Segment: BUREAU_PLUS (bureau available + bank statements)
  ├─ [35,750 ms] Credit scoring: champion model v4.2 invoked
  ├─ [35,890 ms] Score: PD=0.042, risk_grade=B1, confidence=[0.028, 0.056]
  ├─ [35,900 ms] SHAP: top factors: cash_flow_volatility (-0.12),
  │              bureau_score (+0.08), gst_filing_regularity (+0.06)
  ├─ [35,950 ms] Fraud scoring: fast-path rules ✓, graph query (230ms) ✓
  ├─ [36,180 ms] Fraud score: 0.08 (LOW), disposition: AUTO_PASSED
  ├─ [36,200 ms] Underwriting decision: APPROVED (auto-approve path)
  ├─ [36,250 ms] Pricing: APR 18.5%, tenure 12 months, EMI ₹18,420
  ├─ [36,300 ms] KFS generated and displayed to borrower
  ├─ [38,000 ms] Borrower accepted offer
  ├─ [38,100 ms] Penny-drop verification initiated
  ├─ [43,500 ms] Penny-drop ✓: account verified, name match 0.92
  ├─ [43,600 ms] Disbursement initiated via UPI
  ├─ [67,200 ms] Disbursement completed: UTR HDFC2026031278945
  ├─ [67,300 ms] e-Mandate registration initiated
  ├─ [67,400 ms] Loan activated: EMI schedule generated (12 installments)
  └─ [95,000 ms] e-Mandate registered successfully

Total pipeline: 95 seconds (AA fetch dominated: 34 seconds)
Credit decision (scoring + fraud + underwriting): 500 ms
Disbursement: 29 seconds (UPI settlement)

Trace stored in: audit trail (8-year retention)
```
