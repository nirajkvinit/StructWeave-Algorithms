# 14.15 AI-Native Hyperlocal Logistics & Delivery Platform for SMEs — Observability

## Observability Philosophy

A hyperlocal delivery platform has a unique observability challenge: the system's "correctness" is defined by physical-world outcomes (packages arriving on time) that are measured minutes after the decisions that caused them (matching, routing, pricing). By the time you observe a late delivery, the matching decision that caused it happened 30 minutes ago. Effective observability must therefore focus on **leading indicators** (predictive metrics that signal future problems) rather than only **lagging indicators** (delivery outcomes).

---

## Core Metrics

### Delivery Funnel Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Order Creation Rate** | Orders submitted per minute per city | Varies by time/city | > 2σ deviation from predicted (demand anomaly) |
| **Price Acceptance Rate** | Orders confirmed / orders priced | > 70% | < 60% for 15 min (pricing too aggressive) |
| **Matching Success Rate** | Orders assigned within 45s / orders confirmed | > 95% | < 90% for 10 min |
| **First-Offer Acceptance** | Rider accepts first dispatch offer | > 80% | < 70% for 30 min |
| **Pickup Time** | Time from rider assignment to package collected | < 15 min (p50) | p95 > 25 min |
| **On-Time Delivery Rate** | Delivered before customer-facing ETA | > 90% | < 85% for 1 hour |
| **Delivery Completion Rate** | Successfully delivered / total dispatched | > 97% | < 95% for 1 hour |
| **Customer Rating** | Post-delivery star rating | > 4.3 / 5.0 | < 4.0 for rolling 24h |

### Matching Engine Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Batch Window Utilization** | Orders per batch window | 5-20 orders | < 2 (underbatching) or > 50 (overload) |
| **Solver Time** | Time to solve bipartite assignment | < 500ms (p95) | > 1s for 5 min |
| **Assignment Quality Score** | Weighted sum of proximity, capacity, fairness scores | > 0.7 normalized | < 0.5 for 10 min |
| **Dead Mile Ratio** | Rider travel without package / total travel | < 15% | > 20% for 1 hour |
| **Shadow Activation Rate** | Shadow assignments used (primary rider rejected) | < 20% | > 30% for 30 min |
| **Rejection Cascade Depth** | Sequential rejections before acceptance | < 2 (p95) | p95 > 3 for 30 min |

### Route Optimizer Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Solver Invocations/min** | Route optimization requests per minute | Monitor, no target | > 2× expected (runaway re-optimization) |
| **Solution Quality (Gap)** | (heuristic_cost - lower_bound) / lower_bound | < 10% | > 20% sustained |
| **Insertion Success Rate** | New orders successfully inserted into active routes | > 70% of batch-eligible | < 50% (routes too tight) |
| **Time Window Slack** | Minimum remaining time window across batched orders | > 10 min (p25) | p25 < 5 min (cascade risk) |
| **Re-optimization Frequency** | Route changes per active delivery | < 3 | > 5 (instability) |

### ETA Engine Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **ETA MAE** | Mean absolute error (predicted vs. actual) | < 4 minutes | > 6 min for rolling 1 hour |
| **ETA Bias** | Mean signed error (positive = late, negative = early) | ±1 minute | > +3 min (systematic underestimate) |
| **On-Time Calibration** | % of deliveries within customer-facing ETA | 88-92% | < 85% or > 97% (under/over-promising) |
| **ETA Spread** | p95 - p50 of prediction distribution | < 8 minutes | > 12 min (model uncertain) |
| **Dwell Time Prediction Error** | Predicted vs. actual time at pickup/dropoff | < 3 min MAE | > 5 min for specific merchant cluster |

### Location Pipeline Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Ingestion Throughput** | Location updates processed per second | Tracks active riders | > 10% drop (rider app issue or network) |
| **Ingestion Latency** | Time from GPS reading to geospatial index update | < 500ms (p95) | > 1s for 3 min |
| **GPS Accuracy Distribution** | Reported accuracy of GPS readings | p50 < 15m | p50 > 30m (device quality degradation) |
| **Map Match Confidence** | Confidence score of road-segment matching | > 0.8 (p50) | < 0.6 for specific zone (map data issue) |
| **Geofence Trigger Accuracy** | Geofence events matching actual rider presence | > 95% | < 90% (geofence or GPS issue) |
| **Location Gap Rate** | Riders with > 30s GPS silence / active riders | < 5% | > 10% (network or app issue) |

### Fleet Economics Metrics

| Metric | Definition | Target | Alert Threshold |
|---|---|---|---|
| **Rider Utilization** | Time carrying package / total active time | > 60% | < 50% for 1 hour (oversupply or poor matching) |
| **Rider Earnings/Hour** | Average rider earnings per active hour | > $3.50 equivalent | < $2.50 (supply retention risk) |
| **Cost Per Delivery** | Total platform cost / deliveries completed | < $0.50 | > $0.70 (economics breaking) |
| **Surge Zone Coverage** | % of surge zones with ≥ 1 rider within 5 min | > 80% | < 60% (pre-positioning failure) |
| **Batch Rate** | % of deliveries in multi-stop batches | > 40% | < 25% (batching algorithm or demand issue) |
| **Demand Forecast MAPE** | Mean absolute percentage error of zone forecasts | < 20% | > 30% for 2 hours |

---

## Distributed Tracing

### Order Lifecycle Trace

Every order generates a trace spanning its entire lifecycle:

```
Trace: order_abc123
├── [0ms] order.created (Order Service)
│   └── attributes: merchant_id, pickup_zone, dropoff_zone, package_type
├── [50ms] price.computed (Pricing Service)
│   └── attributes: base_fee, surge_multiplier, zone_sd_ratio
├── [2100ms] order.confirmed (Order Service)
├── [2200ms] matching.batch_entered (Matching Engine)
│   └── attributes: batch_window_id, orders_in_batch
├── [32500ms] matching.scored (Matching Engine)
│   └── attributes: candidates_evaluated, top_score, assignment_method
├── [33000ms] matching.assigned (Matching Engine)
│   └── attributes: rider_id, dead_miles, score_breakdown
├── [35000ms] dispatch.offered (Rider App)
├── [42000ms] dispatch.accepted (Rider App)
│   └── attributes: response_time_ms
├── [45000ms] route.optimized (Route Optimizer)
│   └── attributes: waypoints, total_distance, solver_time_ms
├── [180000ms] geofence.pickup_arrived (Location Pipeline)
├── [420000ms] pickup.completed (Rider App)
│   └── attributes: dwell_time_sec
├── [900000ms] eta.updated (ETA Engine)
│   └── attributes: new_p50, new_p85, trigger_reason
├── [1800000ms] geofence.near_dropoff (Location Pipeline)
├── [1920000ms] pod.submitted (Rider App)
│   └── attributes: photo_validated, gps_match, otp_verified
└── [1925000ms] order.delivered (Order Service)
    └── attributes: total_time_min, eta_error_min, batch_size
```

### Matching Decision Audit Trail

Every matching decision is logged with full context for post-hoc analysis:

```
MatchingDecision {
  batch_window_id: "bw_20260310_143000_BLR"
  timestamp: "2026-03-10T14:30:30Z"
  orders_in_batch: 12
  candidates_evaluated: 487
  assignments: [
    {
      order_id: "ord_abc123",
      rider_id: "rdr_xyz789",
      score: 0.82,
      score_breakdown: {
        proximity: 0.91,
        capacity: 1.00,
        acceptance_prob: 0.78,
        fairness: 0.65,
        time_feasibility: 0.88
      },
      dead_miles: 1.2,
      shadow_rider: "rdr_backup456",
      shadow_score: 0.71
    }
  ]
  solver_time_ms: 340
  unmatched_orders: 0
  solution_quality_gap: 0.04
}
```

---

## Alerting Strategy

### Severity Levels

| Level | Criteria | Response Time | Examples |
|---|---|---|---|
| **P0 — Critical** | Service down, orders cannot be processed | < 5 min | Matching engine crash, order DB failure, all-city outage |
| **P1 — Major** | Significant degradation, SLO breach imminent | < 15 min | On-time rate < 80%, matching latency > 2 min, location pipeline lag |
| **P2 — Minor** | Degradation visible but not customer-impacting | < 1 hour | ETA accuracy drop, solver quality degradation, single-zone supply shortage |
| **P3 — Informational** | Anomaly detected, trend concerning | Next business day | Forecast accuracy declining, rider churn increasing, cost per delivery rising |

### Alert Routing

```
P0 → On-call engineer (page) + Engineering lead + City operations
P1 → On-call engineer (page) + City operations
P2 → On-call engineer (notification) + Team channel
P3 → Weekly operations review dashboard
```

### Composite Alerts (Leading Indicators)

| Alert | Components | Indicates |
|---|---|---|
| **Delivery Quality Degradation** | On-time rate dropping + ETA bias increasing + rider utilization > 80% | Fleet undersupply; need surge pricing or repositioning |
| **Matching Breakdown** | Rejection rate rising + dead miles increasing + solver time increasing | Model drift in acceptance prediction; retrain needed |
| **Demand Shock** | Order rate > 3σ above forecast + surge multiplier at cap + matching queue growing | Unexpected demand event; manual fleet activation needed |
| **Location Pipeline Stress** | Ingestion latency rising + GPS gap rate increasing + geofence accuracy dropping | Infrastructure issue or rider app version problem |
| **Economic Health Warning** | Cost per delivery rising + rider earnings falling + batch rate declining | Platform economics deteriorating; review pricing model |

---

## Dashboards

### City Operations Dashboard

```
┌─────────────────────────────────────────────────────────┐
│ BANGALORE — Live Operations                    14:32 IST │
├──────────┬──────────┬──────────┬──────────┬────────────┤
│ Active   │ Active   │ Orders   │ On-Time  │ Avg ETA    │
│ Orders   │ Riders   │ /min     │ Rate     │ Error      │
│  2,847   │  4,291   │   47.2   │  91.3%   │  3.2 min   │
├──────────┴──────────┴──────────┴──────────┴────────────┤
│ Zone Heatmap                                            │
│ ┌─────────────────────────────────────────────────┐    │
│ │  [Supply-Demand Ratio by Zone]                   │    │
│ │  Red: SD < 0.5   Yellow: 0.5-1.0   Green: > 1.0│    │
│ └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│ Matching Health          │ Fleet Economics              │
│ Batch solve: 340ms avg   │ Dead miles: 12.4%           │
│ Acceptance: 83%          │ Batch rate: 44%             │
│ Shadow activations: 14%  │ Rider earnings: $4.10/hr    │
│ Queue depth: 3           │ Cost/delivery: $0.38        │
├──────────────────────────┴─────────────────────────────┤
│ Alerts: [P2] ETA bias +2.3min in Koramangala zone      │
│         [P3] Forecast MAPE 24% — above target          │
└─────────────────────────────────────────────────────────┘
```

### ML Model Performance Dashboard

```
┌─────────────────────────────────────────────────────────┐
│ Model Performance — Rolling 24h                         │
├──────────────────────┬──────────────────────────────────┤
│ Demand Forecast      │ ETA Prediction                   │
│ MAPE: 18.2%         │ MAE: 3.4 min                    │
│ Trend: improving    │ Bias: +0.8 min (slight late)    │
│ Worst zone: HSR     │ Calibration: 90.1% on-time      │
│  (MAPE 31%)         │ Worst segment: dwell time        │
├──────────────────────┼──────────────────────────────────┤
│ Acceptance Model     │ Dynamic Pricing                  │
│ AUC: 0.83           │ Revenue/delivery: $3.82          │
│ Calibration: good   │ Surge activations: 23% of zones  │
│ Feature drift: none │ Avg multiplier: 1.18            │
│                      │ Rider supply response: 12 min   │
└──────────────────────┴──────────────────────────────────┘
```

---

## Log Strategy

### Structured Log Schema

```
{
  "timestamp": "2026-03-10T14:32:15.123Z",
  "level": "INFO",
  "service": "matching-engine",
  "city": "BLR",
  "trace_id": "tr_abc123",
  "span_id": "sp_def456",
  "event": "batch_assignment_completed",
  "attributes": {
    "batch_window_id": "bw_20260310_143000_BLR",
    "orders_matched": 12,
    "orders_unmatched": 0,
    "solver_time_ms": 340,
    "candidates_evaluated": 487,
    "avg_assignment_score": 0.78
  }
}
```

### Log Retention

| Log Category | Hot Storage | Warm Storage | Cold Storage |
|---|---|---|---|
| **Order lifecycle events** | 7 days | 30 days | 1 year |
| **Matching decisions** | 7 days | 30 days | 90 days |
| **Location pipeline** | 3 days | 14 days | 30 days |
| **API access logs** | 7 days | 30 days | 90 days |
| **Security events** | 30 days | 90 days | 2 years |
| **ML model predictions** | 7 days | 30 days | 90 days (for retraining) |

---

## Health Checks

### Service Health Matrix

| Service | Health Check Method | Frequency | Timeout | Failure Action |
|---|---|---|---|---|
| **Order Service** | Transaction: create + read dummy order | 10 sec | 3 sec | Alert P0, traffic reroute |
| **Matching Engine** | Score a synthetic order against dummy riders | 15 sec | 5 sec | Alert P0, activate passive |
| **Route Optimizer** | Solve a 3-stop TSP with known answer | 30 sec | 5 sec | Alert P1, fallback to heuristic |
| **ETA Engine** | Predict ETA for fixed input, check variance | 30 sec | 2 sec | Alert P2, serve cached ETAs |
| **Location Ingestion** | Inject synthetic location, verify in index | 10 sec | 2 sec | Alert P0, check stream processor |
| **Tracking Engine** | Subscribe to test order, verify push | 15 sec | 3 sec | Alert P1, enable polling fallback |
| **Demand Forecaster** | Generate forecast, check bounds | 5 min | 10 sec | Alert P2, use previous forecast |
| **Geospatial Index** | Radius query on known data | 5 sec | 1 sec | Alert P0, check replicas |
