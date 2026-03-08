# Observability

## 1. Key Metrics

### 1.1 Business-Critical Metrics (Tier 0)

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|----------------|
| **Order Success Rate** | `delivered_orders / placed_orders` (excluding customer cancellations) | > 97% | < 95% → page |
| **Driver Assignment Time** | Time from order confirmation to driver accepting | p90 < 30s | p90 > 45s → page |
| **ETA Accuracy** | % of orders delivered within ±5 min of initial ETA | > 80% | < 70% → warn; < 60% → page |
| **Order-to-Delivery Time** | End-to-end time from placement to delivery | p50 < 35 min | p50 > 45 min per city → warn |
| **Payment Capture Rate** | % of authorized payments successfully captured | > 99.9% | < 99.5% → page |

### 1.2 Operational Metrics (Tier 1)

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|----------------|
| **Driver Utilization** | `time_on_active_delivery / total_online_time` per driver | 60-75% | < 40% city-wide → supply surplus; > 85% → supply shortage |
| **Restaurant Acceptance Rate** | % of orders accepted by restaurants | > 95% | < 90% per restaurant → flag; < 85% city-wide → page |
| **Restaurant Prep Time Variance** | Actual prep time vs. estimated | std dev < 5 min | std dev > 10 min per restaurant → retrain |
| **Driver Acceptance Rate** | % of delivery offers accepted by drivers | > 80% | < 65% city-wide → page (likely pricing/incentive issue) |
| **Cancellation Rate** | % of placed orders cancelled (by any party) | < 5% | > 8% → warn; > 12% → page |
| **Location Update Freshness** | Age of latest location update per active driver | p99 < 10s | p99 > 30s → warn (driver offline or GPS issue) |
| **Surge Coverage** | % of zones with active surge pricing | Informational | > 50% of zones in surge → investigate supply crisis |

### 1.3 Infrastructure Metrics (Tier 2)

| Metric | Description | Alert Threshold |
|--------|-------------|----------------|
| **Order Service latency** | p99 of order CRUD operations | > 500ms → warn; > 1s → page |
| **Redis Geo write throughput** | GEOADD operations/sec across all shards | > 90% of capacity → scale |
| **Kafka consumer lag** | Messages pending for location and order consumers | > 10K messages → warn; > 50K → page |
| **WebSocket connection count** | Total concurrent WebSocket connections | > 80% of gateway capacity → scale |
| **PostgreSQL replication lag** | Bytes behind primary | > 1MB → warn; > 10MB → page |
| **Elasticsearch query latency** | Restaurant search p95 | > 200ms → warn |
| **ETA model inference latency** | ML model prediction time | p99 > 100ms → warn |

---

## 2. Distributed Tracing

### 2.1 Trace Propagation

Every order generates a trace that spans all services involved in its lifecycle. The `order_id` serves as the primary correlation key.

**Trace context propagation:** All inter-service calls (HTTP, gRPC, Kafka) carry a trace context header (`X-Trace-ID`, `X-Span-ID`, `X-Parent-Span-ID`). Kafka messages include trace context in message headers.

### 2.2 Critical Trace Points

| Span | Service | Key Attributes |
|------|---------|---------------|
| `order.create` | Order Service | customer_id, restaurant_id, item_count, total_cents |
| `payment.authorize` | Payment Service | amount, payment_method, processor_response_ms |
| `dispatch.find_candidates` | Dispatch Service | city_id, radius_km, candidates_found, search_time_ms |
| `dispatch.score_candidates` | Dispatch Service | candidate_count, top_score, scoring_time_ms |
| `dispatch.assign` | Dispatch Service | driver_id, distance_km, acceptance_probability |
| `driver.offer_sent` | Notification Service | driver_id, offer_id, channel (push/ws) |
| `driver.offer_response` | Dispatch Service | offer_id, accepted (bool), response_time_ms |
| `eta.compute` | ETA Service | prep_time, driver_to_restaurant, restaurant_to_customer, total, model_version |
| `location.update` | Location Service | driver_id, lat, lng, freshness_ms |
| `order.deliver` | Order Service | actual_delivery_time, eta_error_minutes |
| `payment.capture` | Payment Service | amount, capture_result, processor_response_ms |

### 2.3 Dispatch Decision Logging

Every dispatch decision is logged with full context for debugging and ML improvement:

```
DispatchDecisionLog:
  order_id: "ord_abc123"
  city_id: "chicago"
  timestamp: "2025-01-15T18:30:00Z"
  restaurant_location: {lat: 41.8781, lng: -87.6298}
  search_radius_km: 5.0
  candidates_found: 12
  candidates_scored: 8  (4 filtered: 2 unavailable, 2 at max orders)
  top_3_candidates:
    - driver_id: "drv_001", distance: 1.2km, score: 0.87, acceptance_prob: 0.92
    - driver_id: "drv_042", distance: 1.8km, score: 0.81, acceptance_prob: 0.88
    - driver_id: "drv_019", distance: 0.9km, score: 0.79, acceptance_prob: 0.71
  assigned_driver: "drv_001"
  assignment_reason: "highest composite score"
  total_decision_time_ms: 45
  outcome: "accepted"  (filled post-delivery)
  actual_pickup_time_mins: 8  (filled post-delivery)
```

---

## 3. Logging Strategy

### 3.1 Log Levels by Service

| Service | INFO logs | WARN logs | ERROR logs |
|---------|-----------|-----------|------------|
| **Order Service** | State transitions, ETA updates | Cancellations, slow DB queries | Payment failures, state machine violations |
| **Dispatch Service** | Assignments, offer outcomes | No candidates found, radius expansion, high assignment latency | Assignment failures, driver lock contention |
| **Location Service** | None (too high volume) | Stale driver locations, GPS anomalies | Trajectory validation failures, Redis write failures |
| **Payment Service** | Authorizations, captures | 3DS challenges, declined transactions | Capture failures, reconciliation mismatches |
| **ETA Service** | None (too high volume) | Large ETA errors (>15 min), model fallback invoked | Model serving failures |

### 3.2 Structured Log Format

All services emit structured JSON logs with consistent fields:

```
{
  "timestamp": "2025-01-15T18:30:00.123Z",
  "service": "dispatch-service",
  "level": "INFO",
  "trace_id": "abc123",
  "order_id": "ord_xyz",
  "city_id": "chicago",
  "event": "driver_assigned",
  "driver_id": "drv_001",
  "distance_km": 1.2,
  "score": 0.87,
  "candidates_considered": 12,
  "decision_time_ms": 45
}
```

---

## 4. Alerting Framework

### 4.1 Alert Severity Levels

| Severity | Response Time | Notification | Examples |
|----------|--------------|-------------|---------|
| **P0 - Critical** | Immediate (page on-call) | PagerDuty + phone call | Order placement failing; payment capture broken; dispatch completely stuck |
| **P1 - High** | 15 minutes | PagerDuty + push | Driver assignment p90 > 60s; ETA accuracy < 60%; location pipeline lag > 1 min |
| **P2 - Medium** | 1 hour | Chat alert | Single city dispatch degraded; menu cache miss rate high; elevated cancellation rate |
| **P3 - Low** | Next business day | Email digest | ETA model drift detected; ratings service slow; analytics pipeline delayed |

### 4.2 Critical Alert Definitions

```
ALERT: DispatchFailureRateHigh
  condition: dispatch_failure_rate > 1% over 5 minutes (per city)
  severity: P0
  action: Page on-call SRE + dispatch team lead
  runbook: Check driver supply in affected city; check Redis geo availability; check Kafka consumer lag

ALERT: OrderStuckInAssigned
  condition: order in DRIVER_ASSIGNED state for > 15 minutes
  severity: P1
  action: Auto-escalate: reassign to new driver; if reassignment fails 3 times, alert support
  runbook: Check if driver went offline; check driver app connectivity

ALERT: LocationServiceLag
  condition: max_location_age for active drivers > 30 seconds (per city)
  severity: P1
  action: Alert SRE
  runbook: Check Redis shard health; check Kafka consumer lag; check WebSocket gateway connectivity

ALERT: PaymentCaptureFailureRate
  condition: payment_capture_failure_rate > 0.5% over 10 minutes
  severity: P0
  action: Page on-call SRE + payments team
  runbook: Check payment processor status; check network connectivity; verify token vault availability

ALERT: ETAAccuracyDrop
  condition: eta_accuracy (within ±5 min) < 65% over 1 hour (per city)
  severity: P2
  action: Alert ETA team
  runbook: Check for major traffic event; check weather API; compare model version; check routing service health

ALERT: DriverSupplyShortage
  condition: available_drivers / pending_orders < 0.5 for > 10 minutes (per city)
  severity: P1
  action: Trigger surge pricing increase; send bonus zone notifications to nearby drivers
  runbook: Verify surge pricing is active; check if new driver onboarding is needed
```

---

## 5. Dashboards

### 5.1 Operations Dashboard (Real-Time)

```
Top Row (city selector):
  [ City: Chicago ▼ ] [ Time range: Last 1 hour ▼ ]

Row 1 - Key Numbers:
  | Active Orders: 12,430 | Active Drivers: 8,210 | Avg ETA: 33 min | Success Rate: 97.2% |

Row 2 - Order Flow (time series):
  - Orders placed/min (line chart)
  - Orders delivered/min (line chart)
  - Cancellations/min (bar overlay)

Row 3 - Dispatch Health:
  - Assignment time p50/p90/p99 (line chart)
  - Driver offer acceptance rate % (line chart)
  - Surge multiplier heatmap (geo map)

Row 4 - Driver Supply/Demand:
  - Available drivers vs. pending orders (dual-axis chart)
  - Driver utilization % (gauge)
  - Dead zones (geo map highlighting areas with 0 available drivers)
```

### 5.2 ETA Accuracy Dashboard

```
Row 1 - Accuracy Over Time:
  - % orders within ±5 min of initial ETA (7-day trend)
  - Mean absolute error in minutes (7-day trend)

Row 2 - Error Breakdown:
  - Prep time error distribution (histogram)
  - Driver-to-restaurant error distribution (histogram)
  - Restaurant-to-customer error distribution (histogram)

Row 3 - By Restaurant:
  - Top 10 restaurants with worst ETA accuracy (table)
  - Bottom quartile restaurants: avg prep time error (scatter plot)

Row 4 - Model Performance:
  - Current model version + deploy date
  - A/B test results if canary active
  - Feature importance ranking
```

### 5.3 Financial Dashboard (Daily)

```
Row 1 - Revenue:
  - Total order value, delivery fees collected, tips collected
  - Comparison vs. same day last week

Row 2 - Payment Health:
  - Authorization success rate
  - Capture success rate
  - Refund rate and total refunded amount
  - Reconciliation status (matched %, unresolved count)

Row 3 - Fraud:
  - Orders blocked by fraud scoring
  - GPS spoofing attempts detected
  - Promo abuse incidents
```
