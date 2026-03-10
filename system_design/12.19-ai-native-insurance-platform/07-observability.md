# 12.19 AI-Native Insurance Platform — Observability

## Observability Philosophy

An AI-native insurance platform has a dual observability requirement that most systems do not share: **technical SLOs** (quote latency, system uptime) and **actuarial SLOs** (loss ratio by model cohort, behavioral score predictive accuracy). Technical metrics alert on system failure. Actuarial metrics detect model drift—where the system operates perfectly from an engineering standpoint but is silently mispricing risk, which is financially devastating at insurance scale.

---

## Key Metrics by Domain

### Quote & Underwriting Metrics

| Metric | Type | SLO / Alert |
|---|---|---|
| `quote_api_latency_p99` | Histogram | Alert if > 300ms (scoring); page if > 60s (full) |
| `quote_completion_rate` | Counter | Alert if < 85% of initiated quotes reach offer stage |
| `bureau_enrichment_timeout_rate` | Counter | Alert if any bureau > 5% timeout rate |
| `bind_rate_by_channel` | Gauge | Alert on > 20% delta vs. 7-day rolling average |
| `adverse_action_notice_backlog` | Gauge | Alert if > 0 notices past FCRA 3-business-day deadline |
| `risk_score_record_write_latency` | Histogram | Alert if > 100ms (must complete before policy binding) |
| `model_inference_errors` | Counter | Page if > 0 GLM errors (fallback anchor) |

### Claims Metrics

| Metric | Type | SLO / Alert |
|---|---|---|
| `fnol_acknowledgment_latency_p99` | Histogram | Alert if > 5s; page if > 10s |
| `fraud_score_delivery_latency_p99` | Histogram | Alert if > 4s |
| `straight_through_payment_rate` | Gauge | Monitor for significant drops (fraud rule miscalibration signal) |
| `claims_intake_completion_rate` | Counter | Alert if < 70% of started FNOL conversations complete |
| `adjuster_queue_depth` | Gauge | Alert if growing faster than adjuster throughput |
| `claims_in_cat_mode` | Gauge | Dashboard indicator; operations team notified at trigger |
| `damage_assessment_queue_depth` | Gauge | Alert if CV pipeline backlog exceeds 500 items |

### Telematics Pipeline Metrics

| Metric | Type | SLO / Alert |
|---|---|---|
| `telematics_consumer_lag_minutes` | Gauge | Alert if > 10 min; page if > 30 min |
| `trip_reconstruction_timeout_rate` | Counter | Alert if > 5% of trips time out (device upload reliability issue) |
| `behavioral_score_staleness_p95` | Histogram | Alert if > 2 hours since last score update for active drivers |
| `telematics_event_duplicate_rate` | Counter | Alert if > 10% (SDK bug or replay attack indicator) |
| `trips_with_anomaly_flags_rate` | Gauge | Monitor for sudden spikes (possible sensor fraud) |

### Fraud Intelligence Metrics

| Metric | Type | SLO / Alert |
|---|---|---|
| `fraud_score_distribution` | Histogram | Monitor weekly; shift toward high scores = fraud wave |
| `siu_lead_generation_rate` | Counter | Weekly ring detection batch output; monitor for trend |
| `fraud_graph_query_latency_p99` | Histogram | Alert if 2-hop subgraph retrieval > 500ms |
| `fraud_entity_graph_growth_rate` | Gauge | Monitor for unusual spikes (data import error indicator) |
| `gnn_inference_latency_p99` | Histogram | Alert if > 1s (contributes to FNOL SLO breach) |
| `high_fraud_claims_payment_rate` | Counter | Alert if any payment initiated on HIGH or CRITICAL fraud tier claim |

---

## Actuarial / Model Performance Monitoring

These metrics are distinct from technical metrics—they measure whether the ML models remain accurate over time. Model drift in insurance is financially material: a model that underestimates risk by 10% will produce a combined ratio > 100% (unprofitable underwriting).

### Loss Ratio Monitoring by Model Cohort

```
FUNCTION monitor_loss_ratio_by_cohort():
  // Segment policies by risk score decile at binding time
  FOR decile IN 1..10:
    cohort = policies.filter(
      risk_score_decile == decile,
      effective_date BETWEEN (now() - 12 months, now() - 3 months)
      // 3-month lag for loss development
    )
    earned_premium = sum(cohort.pro_rated_premium)
    incurred_losses = sum(claims.filter(policy_id IN cohort.policy_ids).incurred_amount)
    loss_ratio = incurred_losses / earned_premium

    IF loss_ratio > expected_loss_ratio[decile] * 1.15:  // 15% adverse deviation
      ALERT "Loss ratio adverse development: decile {decile}, actual {loss_ratio:.1%},
             expected {expected_loss_ratio[decile]:.1%}"
      TRIGGER model_review_request(model_version=cohort.model_version, decile=decile)
```

This check runs monthly on a rolling 12-month cohort. Adverse loss ratio development in a specific score decile signals the model is underestimating risk for those characteristics—a retraining trigger.

### Behavioral Score Predictive Accuracy

```
FUNCTION validate_telematics_score_lift():
  // Compare loss rates for telematics-enrolled vs. unenrolled, controlling for
  // other underwriting factors

  enrolled_claims_rate   = claims_rate(policies.filter(telematics_enrolled=true))
  unenrolled_claims_rate = claims_rate(policies.filter(telematics_enrolled=false))
  observed_lift = 1.0 - (enrolled_claims_rate / unenrolled_claims_rate)

  // Within enrolled, validate score decile separation
  FOR decile IN 1..10:
    decile_claim_rate = claims_rate(telematics_policies.filter(score_decile=decile))
    expected_gradient = actuarial_model.expected_claim_rate(decile)
    IF abs(decile_claim_rate - expected_gradient) / expected_gradient > 0.20:
      ALERT "Telematics score decile {decile} not separating as expected"
```

### Feature Drift Detection

Population Stability Index (PSI) is computed weekly for each rating variable. PSI > 0.25 indicates significant population shift that may invalidate the model's calibration:

```
FUNCTION compute_psi(feature: string, reference_week: date, current_week: date) -> float:
  ref_dist   = compute_decile_distribution(feature, reference_week)
  curr_dist  = compute_decile_distribution(feature, current_week)
  psi = sum(
    (curr_dist[i] - ref_dist[i]) * ln(curr_dist[i] / ref_dist[i])
    FOR i IN 1..10
  )
  // PSI < 0.1: no change; 0.1–0.25: moderate shift; > 0.25: major shift → investigate
  RETURN psi
```

---

## Dashboards

### Operations Dashboard

Real-time view for on-call engineers and customer operations:

- Quote funnel: initiated → scored → offered → bound (conversion waterfall)
- Active in-flight quotes (count + age distribution)
- Bureau enrichment: response rate and latency per provider
- Claims queue: FNOL rate (1h, 24h), adjuster queue depth, fraud score distribution
- Telematics: events/sec, consumer lag, trip reconstruction success rate
- CAT event indicator: active/inactive, affected region, claims surge multiplier

### Actuarial Model Dashboard

Monthly view for actuarial and data science teams:

- Loss ratio by risk score decile × model version (12-month rolling)
- Model version cohort comparison (champion vs. challenger performance)
- Feature PSI heatmap (all rating variables, weekly)
- Telematics score lift vs. unenrolled baseline
- Fraud model precision-recall over rolling 90-day window
- Adverse action reason code distribution (FCRA compliance check)

### Regulatory Compliance Dashboard

Monthly/quarterly view for compliance officers:

- Adverse action notice queue: pending, delivered, overdue
- Prohibited factor exclusion audit log: counts per state per model run
- Disparate impact monitoring: approval rates by demographic proxy
- Rate filing status: pending, approved, expired per state
- OFAC screening: pending manual reviews, confirmed matches
- Data breach monitoring: anomaly detection alerts, investigation status

---

## Alerting Runbooks

### Runbook: Fraud Score Delivery SLO Breach

**Alert:** `fraud_score_delivery_latency_p99 > 4s`

1. Check GNN inference service: Is GPU utilization > 90%? Scale out inference nodes
2. Check fraud graph: Is 2-hop subgraph retrieval > 1s? Check graph DB query cache warmth
3. Check FNOL rate: Is there a CAT event? If yes, assess CAT mode activation
4. Fallback: If GNN unavailable > 5 min, switch fraud scoring to rule-based fallback (no graph) and alert data science team

### Runbook: Loss Ratio Adverse Development Alert

**Alert:** `loss_ratio_cohort_{decile} > 1.15 * expected`

1. Confirm the decile's model version — which artifact was used for these policies?
2. Check feature PSI for top features in that decile — has population shifted?
3. Pull SHAP attribution for the cohort — which features drove these scores?
4. Data science team: run backtesting on the identified model version with current data
5. Actuarial team: assess whether current premium rates are adequate or require rate revision filing
6. If model confidence compromised: flag cohort for conservative renewal pricing until investigation complete

### Runbook: Bureau Enrichment Degradation

**Alert:** `bureau_enrichment_timeout_rate > 5%` for any provider

1. Check bureau provider status page (external dependency)
2. Check cached response hit rate — is cache serving most requests?
3. If degraded bureau is MVR: activate preliminary quote pathway for all new quotes
4. Escalate to bureau vendor account team with SLA reference
5. If degraded > 30 min: notify operations team; consider widening preliminary quote uncertainty band
