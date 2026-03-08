# Observability

## Observability Strategy

A fraud detection system requires observability across three distinct domains: **system health** (is the scoring pipeline performing within SLOs?), **model quality** (are the ML models making good predictions?), and **operational effectiveness** (is the overall fraud program achieving its goals?). Unlike typical services where observability focuses on uptime and latency, fraud detection must also monitor adversarial dynamics---detecting when fraudsters adapt faster than the models.

---

## Key Metrics

### System Health Metrics (SLI/SLO)

| Metric | SLI Definition | SLO Target | Alert Threshold |
|--------|---------------|-----------|-----------------|
| **Scoring Availability** | Successful responses / total requests | 99.95% | < 99.9% over 5 min |
| **Scoring Latency (p50)** | 50th percentile end-to-end scoring time | < 50ms | > 70ms over 5 min |
| **Scoring Latency (p99)** | 99th percentile end-to-end scoring time | < 100ms | > 130ms over 5 min |
| **Feature Store Read Latency** | p99 multi-get from RT + Batch stores | < 15ms | > 25ms over 5 min |
| **Feature Freshness** | Time since last RT feature update per entity | < 2s | > 10s for > 5% entities |
| **Model Serving Error Rate** | Model inference errors / total inferences | < 0.01% | > 0.1% over 5 min |
| **Event Processing Lag** | Max consumer lag on transaction events topic | < 5s | > 30s over 5 min |
| **Rule Evaluation Latency** | p99 rule engine evaluation time | < 10ms | > 20ms over 5 min |

### Model Quality Metrics

| Metric | Definition | Target | Measurement Cadence |
|--------|-----------|--------|-------------------|
| **AUC-ROC** | Area under receiver operating characteristic | > 0.98 | Daily (on labeled data) |
| **Precision @ 95% Recall** | Precision when recall = 95% | > 0.50 | Daily |
| **False Positive Rate** | Blocked legitimate / total blocked | < 5% | Daily (from analyst labels) |
| **Detection Rate (Recall)** | Caught fraud value / total fraud value | > 95% | Weekly (after chargeback settlement) |
| **Score Distribution** | Histogram of model scores | Stable bimodal | Daily comparison |
| **Feature Importance Stability** | Rank correlation of top features week-over-week | > 0.85 | Weekly |
| **Prediction Confidence** | Standard deviation of ensemble member scores | Monitor | Per-transaction |
| **Label Delay** | Time from transaction to ground-truth label | < 45 days | Weekly |

### Operational Effectiveness Metrics

| Metric | Definition | Target | Cadence |
|--------|-----------|--------|---------|
| **Fraud Loss Rate** | Fraud losses / total transaction volume | < 0.02% | Monthly |
| **Fraud Prevention Rate** | Value of blocked fraud / total detected fraud | > 80% | Monthly |
| **Case Resolution Time** | Median time from case creation to disposition | < 4 hours | Daily |
| **Analyst Throughput** | Cases resolved per analyst per day | 40-60 | Daily |
| **SAR Filing Timeliness** | % of SARs filed before regulatory deadline | 100% | Weekly |
| **Customer Friction Rate** | % of legitimate transactions challenged or blocked | < 0.5% | Daily |
| **Chargeback Rate** | Chargebacks / total transactions | < 0.1% | Monthly |
| **Rule Effectiveness** | Precision per active rule | > 20% | Weekly |

---

## Model Drift Detection

### Feature Distribution Monitoring

```
FUNCTION monitor_feature_drift(current_window, baseline_window):
    alerts = []

    FOR feature IN monitored_features:
        current_dist = DISTRIBUTION(current_window[feature])
        baseline_dist = DISTRIBUTION(baseline_window[feature])

        // Population Stability Index (PSI)
        psi = COMPUTE_PSI(current_dist, baseline_dist)
        IF psi > 0.25:
            alerts.append({
                severity: "critical",
                feature: feature,
                metric: "PSI",
                value: psi,
                message: "Significant distribution shift detected"
            })
        ELSE IF psi > 0.10:
            alerts.append({
                severity: "warning",
                feature: feature,
                metric: "PSI",
                value: psi,
                message: "Moderate distribution shift detected"
            })

        // Kolmogorov-Smirnov test for continuous features
        ks_stat, p_value = KS_TEST(current_dist, baseline_dist)
        IF p_value < 0.001:
            alerts.append({
                severity: "warning",
                feature: feature,
                metric: "KS",
                value: ks_stat,
                message: "Feature distribution statistically different from baseline"
            })

    RETURN alerts
```

### Score Distribution Monitoring

A healthy fraud model produces a bimodal score distribution: most transactions cluster near 0 (legitimate) with a smaller cluster near 1 (fraudulent). Changes in this distribution signal problems:

| Distribution Change | Possible Cause | Action |
|--------------------|----------------|--------|
| Scores shift higher overall | Feature store serving stale/incorrect data | Investigate feature pipeline health |
| Scores shift lower overall | Fraudsters found evasion strategy | Emergency rule tightening; prioritize retrain |
| Bimodal peaks merge | Model losing discriminative power | Trigger challenger model comparison |
| New peak appears at mid-range | New fraud pattern not in training data | Manual analysis; add new features |
| Spike in "review" zone (0.5-0.8) | Threshold calibration off | Review recent threshold changes |

### Concept Drift Detection

```
FUNCTION detect_concept_drift():
    // Compare model performance on recent labeled data vs training data
    recent_data = GET_LABELED_DATA(last_7_days)
    IF LEN(recent_data) < MIN_SAMPLE_SIZE:
        RETURN  // Not enough labeled data yet

    recent_auc = COMPUTE_AUC(model, recent_data)
    baseline_auc = model.metadata.training_auc

    drift_score = baseline_auc - recent_auc

    IF drift_score > 0.03:
        ALERT_CRITICAL("Model AUC degraded by " + drift_score +
            " — trigger emergency retrain")
    ELSE IF drift_score > 0.01:
        ALERT_WARNING("Model AUC declining — schedule priority retrain")

    // Also check per-segment performance
    FOR segment IN ["card_present", "card_not_present", "p2p", "ach"]:
        segment_auc = COMPUTE_AUC(model, FILTER(recent_data, segment))
        IF segment_auc < SEGMENT_MIN_AUC[segment]:
            ALERT("Model degraded for segment: " + segment)
```

---

## Logging Strategy

### Log Levels and Content

| Log Category | Content | Volume | Retention | Storage |
|-------------|---------|--------|-----------|---------|
| **Scoring Decision Log** | Full scoring request/response with features, scores, decision | Every transaction | 2 years | Columnar store for analytics |
| **Rule Evaluation Log** | Rules evaluated, conditions checked, outcomes | Every transaction | 90 days | Append-only log |
| **Feature Fetch Log** | Feature store queries, latencies, cache hit/miss | Every transaction | 30 days | Time-series database |
| **Model Inference Log** | Per-model scores, ensemble weights, inference latency | Every transaction | 90 days | Columnar store |
| **Case Activity Log** | Analyst actions, dispositions, notes, time spent | Every case action | 7 years | Relational database |
| **Rule Change Log** | Rule CRUD operations, who/what/when | Every change | Indefinite | Immutable audit store |
| **Model Deployment Log** | Deployment events, canary metrics, rollback events | Every deployment | 2 years | Operational log |

### Structured Scoring Log Entry

```
{
    "timestamp": "2026-03-09T14:32:00.067Z",
    "scoring_id": "scr_mno345",
    "transaction_id": "txn_abc123",
    "latency_breakdown_ms": {
        "total": 67,
        "rules_fast": 3,
        "feature_assembly": 28,
        "feature_store_rt": 4,
        "feature_store_batch": 6,
        "model_inference": 22,
        "decision_logic": 2,
        "overhead": 2
    },
    "feature_fetch": {
        "rt_cache_hit": true,
        "batch_cache_hit": false,
        "missing_features": ["batch.merchant_fraud_rate"],
        "stale_features": []
    },
    "model_scores": {
        "gbt_v23": 0.82,
        "dnn_v11": 0.78,
        "anomaly_v7": 0.45,
        "ensemble": 0.78
    },
    "rules_triggered": ["R042_new_device_high_amount", "R108_geo_anomaly"],
    "decision": "review",
    "threshold_applied": {"block": 0.85, "review": 0.60},
    "explanations": [
        {"feature": "geo_distance_km", "shap": 0.25},
        {"feature": "device_age_seconds", "shap": 0.18}
    ]
}
```

---

## Distributed Tracing

### Trace Spans for Scoring Pipeline

```
Trace: score_transaction (txn_abc123)
├── [2ms]  receive_request
├── [3ms]  rules_engine.evaluate_fast
│   ├── [1ms]  blocklist_check
│   └── [2ms]  sanctions_check
├── [28ms] feature_assembly (parallel)
│   ├── [4ms]  rt_feature_store.multi_get
│   │   ├── [2ms]  user_features
│   │   └── [3ms]  device_features
│   └── [6ms]  batch_feature_store.multi_get
│       ├── [4ms]  user_batch_features
│       └── [5ms]  merchant_features
├── [8ms]  rules_engine.evaluate_all
│   ├── [3ms]  velocity_rules
│   ├── [2ms]  geo_rules
│   └── [2ms]  amount_rules
├── [22ms] model_serving.predict
│   ├── [8ms]  gbt_v23.predict
│   ├── [12ms] dnn_v11.predict
│   ├── [3ms]  anomaly_v7.predict
│   └── [1ms]  ensemble_aggregate
├── [2ms]  decision_logic
└── [2ms]  publish_event (async, non-blocking)
Total: 67ms
```

### Cross-Service Correlation

Every scoring request generates a `trace_id` that propagates through:
1. Payment service → Scoring service (synchronous)
2. Scoring service → Event bus (asynchronous)
3. Event bus → Stream processor (feature update)
4. Event bus → Case management (if flagged)
5. Case management → Regulatory reporting (if SAR required)

This enables end-to-end tracing from initial transaction to final disposition.

---

## Alerting Framework

### Alert Priority Levels

| Priority | Response Time | Notification | Examples |
|---------|--------------|-------------|---------|
| **P0 — Critical** | < 5 minutes | Page on-call + management | Scoring service down; complete feature store failure; model serving crash |
| **P1 — High** | < 15 minutes | Page on-call | p99 latency > 150ms; FP rate spike > 10%; detection rate drop > 5% |
| **P2 — Medium** | < 1 hour | Slack notification | Feature staleness warning; consumer lag > 30s; single node failure |
| **P3 — Low** | Next business day | Dashboard only | Model drift warning; rule effectiveness degradation; capacity approaching threshold |

### Alert Definitions

```
Alert: scoring_availability_critical
  Condition: error_rate > 0.1% for 5 minutes
  Priority: P0
  Action: Page fraud-platform-oncall
  Runbook: Check scoring pod health → Check feature store → Check model serving → Activate fail-open

Alert: false_positive_spike
  Condition: FP_rate (rolling 4h) > 8%
  Priority: P1
  Action: Page fraud-ops-oncall
  Runbook: Check recent rule changes → Check model deployment → Review threshold changes → Manual threshold adjustment

Alert: model_drift_detected
  Condition: PSI > 0.25 for any top-20 feature
  Priority: P2
  Action: Notify ML team Slack channel
  Runbook: Investigate feature distribution → Check upstream data pipeline → Assess model impact → Schedule retrain

Alert: fraud_rate_anomaly
  Condition: blocked_fraud_value (rolling 24h) drops > 30% from 7-day average
  Priority: P1
  Action: Page fraud-ops-oncall + ML-oncall
  Runbook: Check if fraud rate actually dropped OR if model is missing fraud → Emergency audit of recent chargebacks
```

---

## Dashboards

### Dashboard 1: Real-Time Scoring Health

| Panel | Visualization | Data Source |
|-------|-------------|------------|
| Scoring TPS | Line chart (current vs 7-day avg) | API gateway metrics |
| Latency Distribution | Heatmap (p50/p75/p90/p95/p99) | Scoring service histograms |
| Decision Distribution | Stacked bar (allow/block/review/challenge per hour) | Scoring decision logs |
| Feature Store Health | Multi-stat (hit rates, latencies per store) | Feature fetch logs |
| Circuit Breaker Status | Status indicators per dependency | Health check metrics |
| Error Rate | Line chart with SLO burn rate | API gateway errors |

### Dashboard 2: Model Performance

| Panel | Visualization | Data Source |
|-------|-------------|------------|
| AUC-ROC Trend | Line chart (daily, last 90 days) | Offline evaluation pipeline |
| Precision-Recall Curve | Interactive PR curve (current vs baseline) | Model evaluation |
| Score Distribution | Histogram (current vs 7-day ago) | Scoring logs |
| Feature Importance | Horizontal bar (top 20 features by SHAP) | Model explainability pipeline |
| Per-Segment Performance | Table (AUC, FPR, recall by transaction type) | Segmented evaluation |
| Drift Indicators | Multi-stat (PSI per top feature) | Drift monitoring |

### Dashboard 3: Fraud Operations

| Panel | Visualization | Data Source |
|-------|-------------|------------|
| Fraud Loss Trend | Line + area chart (daily losses, rolling 30-day) | Chargeback data |
| Case Queue Depth | Gauge (open cases by priority) | Case management DB |
| Analyst Productivity | Table (cases/day, avg resolution time per analyst) | Case activity logs |
| Rule Performance | Scatter plot (trigger rate vs precision per rule) | Rule evaluation logs |
| Top Fraud Patterns | Ranked list (most common fraud types this week) | Case dispositions |
| SAR Filing Status | Kanban (draft → review → submitted → acknowledged) | Regulatory reporting |

### Dashboard 4: Executive Summary

| Panel | Visualization | Data Source |
|-------|-------------|------------|
| Fraud Prevention Value | Single stat ($M prevented this month) | Scoring + chargeback data |
| Net Fraud Rate | Gauge (actual fraud / total volume) | Chargeback reconciliation |
| Customer Impact | Single stat (legitimate transactions affected) | FP analysis |
| System Uptime | Single stat (scoring availability %) | SLO tracking |
| Model Freshness | Days since last production model update | Model deployment log |
| Regulatory Compliance | Status indicators (SAR timeliness, audit readiness) | Compliance tracking |
