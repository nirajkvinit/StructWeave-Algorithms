# Observability

## Overview

A ride-hailing platform operates as a real-time marketplace where milliseconds of latency or seconds of downtime translate directly into lost revenue and degraded user experience. Observability must cover the full spectrum: from individual location updates flowing through the ingestion pipeline to city-wide supply/demand health.

---

## Key Metrics

### Matching Metrics (Most Critical)

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `matching.latency.p50` | Median time from ride request to driver notification | < 400ms | > 600ms for 2 min |
| `matching.latency.p95` | 95th percentile matching latency | < 1,000ms | > 1,500ms for 1 min |
| `matching.latency.p99` | 99th percentile matching latency | < 2,000ms | > 3,000ms for 1 min |
| `matching.success_rate` | % of requests that result in a matched driver | > 95% | < 90% for 5 min |
| `matching.no_drivers_rate` | % of requests with no available drivers | < 5% | > 10% for 5 min |
| `matching.candidates_per_request` | Average number of candidate drivers per match | 5-20 | < 3 for 5 min (supply problem) |

### Dispatch Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `dispatch.acceptance_rate` | % of offers accepted by first driver | > 80% | < 70% for 10 min |
| `dispatch.avg_attempts` | Average dispatch attempts before acceptance | < 1.3 | > 2.0 for 5 min |
| `dispatch.offer_timeout_rate` | % of offers that expire without response | < 5% | > 10% for 5 min |
| `dispatch.redispatch_rate` | % of trips requiring re-dispatch | < 15% | > 25% for 5 min |

### Location Pipeline Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `location.ingestion_rate` | Location updates processed per second | ~875K/s | < 700K/s or > 1.2M/s |
| `location.pipeline_lag` | Time from driver GPS reading to index update | < 2s (p95) | > 5s for any region |
| `location.consumer_lag` | Message queue consumer lag (messages behind) | < 1,000 | > 10,000 for 2 min |
| `location.stale_evictions` | Drivers evicted due to stale location | < 0.1% of online drivers/min | > 1% for 5 min |
| `location.spoofing_flags` | GPS spoofing detections per hour | Baseline varies | 3x baseline spike |
| `location.stationary_filter_rate` | % of updates filtered (driver not moving) | 30-50% | < 20% or > 60% |

### Surge Pricing Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `surge.multiplier_by_zone` | Current surge multiplier per H3 zone | 1.0 - 3.0 typical | > 5.0 for any zone |
| `surge.zones_active` | Number of zones with surge > 1.0x | City-dependent | 2x baseline for city |
| `surge.computation_time` | Time to compute surge for entire city | < 5s | > 15s |
| `surge.demand_supply_ratio` | Aggregate demand/supply ratio per city | 0.8 - 1.5 | > 3.0 for 10 min |

### Trip Lifecycle Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `trip.completion_rate` | % of requested trips that reach COMPLETED | > 90% | < 85% for 15 min |
| `trip.cancellation_rate` | % of trips cancelled (by rider or driver) | < 10% | > 15% for 15 min |
| `trip.avg_duration_min` | Average trip duration | City-dependent | 2x baseline for city |
| `trip.state_transition_errors` | Invalid state transition attempts | 0 | > 0 (immediate alert) |
| `trip.orphan_trips` | Trips stuck in non-terminal state > 2 hours | 0 | > 0 (immediate alert) |

### ETA Accuracy Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `eta.accuracy_within_2min` | % of ETAs accurate within 2 minutes | > 90% | < 80% for 30 min |
| `eta.mean_absolute_error` | Average |predicted - actual| in minutes | < 2 min | > 4 min |
| `eta.computation_latency` | Time to compute a single ETA | < 100ms (p95) | > 200ms for 5 min |

### Driver Utilization Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `driver.online_count` | Drivers currently online per city | City-dependent | < 50% of baseline for time-of-day |
| `driver.utilization_rate` | % of online time spent on trips | 60-70% | < 40% (oversupply) or > 90% (undersupply) |
| `driver.avg_idle_time_min` | Average time between trips | < 10 min | > 20 min for city |

### Payment Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `payment.success_rate` | % of charges that succeed on first attempt | > 99.9% | < 99.5% for 5 min |
| `payment.failure_rate` | % of charges that fail after all retries | < 0.1% | > 0.5% for 5 min |
| `payment.processing_latency` | Time to process a payment | < 2s (p95) | > 5s for 2 min |

---

## Logging Strategy

### What to Log

| Event | Log Level | Content | Retention |
|-------|-----------|---------|-----------|
| Trip state transition | INFO | trip_id, old_state, new_state, actor, timestamp, metadata | 1 year |
| Dispatch offer sent | INFO | trip_id, driver_id, attempt_number, eta, distance | 90 days |
| Dispatch offer response | INFO | trip_id, driver_id, response (accepted/declined/expired), response_time_ms | 90 days |
| Matching result | INFO | trip_id, candidates_count, selected_driver, selection_reason, latency_ms | 90 days |
| Surge computation | INFO | city_id, zone_count, computation_time_ms, zones_with_surge_count | 30 days |
| Payment event | INFO | trip_id, amount, status, processor_ref, retry_count | 2 years (financial compliance) |
| GPS spoofing flag | WARN | driver_id, detection_type, details, location | 1 year |
| State transition error | ERROR | trip_id, attempted_transition, current_state, error_message | 1 year |
| Matching failure | ERROR | trip_id, reason (no_candidates, eta_timeout, all_declined), city_id | 90 days |
| Payment failure | ERROR | trip_id, amount, error_code, processor_response | 2 years |
| Service health event | WARN/ERROR | service_name, event_type (degraded, recovered), affected_cities | 90 days |

### Structured Log Format

```
{
  "timestamp": "2026-03-08T14:30:00.123Z",
  "level": "INFO",
  "service": "dispatch-service",
  "event": "trip_state_transition",
  "trace_id": "abc123def456",
  "span_id": "span789",
  "city_id": "nyc",
  "data": {
    "trip_id": "trip_xxx",
    "old_status": "dispatched",
    "new_status": "accepted",
    "driver_id": "driver_yyy",
    "response_time_ms": 8200,
    "attempt_number": 1
  }
}
```

---

## Distributed Tracing

### Key Trace Spans

A single ride request generates a trace that spans multiple services:

```
Trace: ride_request (trip_id: trip_xxx)
├── api_gateway.route_request                    [2ms]
├── pricing_service.compute_fare_estimate        [15ms]
│   ├── pricing.get_surge_multiplier             [3ms]
│   ├── routing.compute_distance_duration        [10ms]
│   └── pricing.apply_rates                      [2ms]
├── dispatch_service.create_trip                 [25ms]
│   └── trip_service.persist_trip                [20ms]
├── matching_engine.find_best_driver             [450ms]
│   ├── geo_index.query_nearby                   [8ms]
│   ├── eta_service.compute_etas (parallel x5)   [350ms]
│   │   ├── routing.compute_eta (driver_1)       [120ms]
│   │   ├── routing.compute_eta (driver_2)       [95ms]
│   │   ├── routing.compute_eta (driver_3)       [180ms]
│   │   ├── routing.compute_eta (driver_4)       [110ms]
│   │   └── routing.compute_eta (driver_5)       [350ms]
│   └── matching.score_and_rank                  [5ms]
├── dispatch_service.send_offer                  [30ms]
│   ├── trip_service.update_status               [20ms]
│   └── notification_service.push_to_driver      [10ms]
└── [async] driver_response (up to 15s)
    └── trip_service.update_status               [20ms]
```

### Trace Propagation

- All synchronous calls propagate `trace_id` and `span_id` via HTTP headers
- Async messages (via message queue) carry `trace_id` in message metadata
- WebSocket messages carry `trace_id` for correlation with server-side events

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Action |
|-------|-----------|--------|
| Matching latency spike | p95 > 2s for 2 minutes in any city | Page on-call; investigate ETA service, geo index, routing engine |
| Location pipeline stall | Consumer lag > 30s for any region | Page on-call; check message queue health, consumer instances |
| Trip state consistency violation | Any trip in invalid state | Page on-call; immediate investigation (data corruption risk) |
| Payment failure rate spike | Failure rate > 1% for 5 minutes | Page on-call; check payment processor status |
| Driver supply cliff | Online drivers < 30% of baseline for time-of-day in a city | Page city operations; potential outage or external event |
| Orphan trip detected | Any trip in non-terminal state > 2 hours | Page on-call; manual trip resolution needed |
| Data center health | Multi-probe health check failure | Page on-call; initiate failover runbook |

### Warning Alerts (Non-Page)

| Alert | Condition | Action |
|-------|-----------|--------|
| Surge computation slow | City surge computation > 10s | Investigate stream processor; may need more resources |
| ETA accuracy degradation | Mean absolute error > 3 min for 30 min | Check routing engine data freshness (traffic data stale?) |
| Dispatch acceptance rate drop | < 70% for 10 minutes in a city | Investigate driver app issues; check offer display |
| Stale driver evictions spike | > 2% of online drivers/hour | Check network conditions; possible carrier outage |
| WebSocket reconnection rate high | > 5% of connections reconnecting/minute | Check gateway health; possible infrastructure issue |

---

## Dashboards

### Real-Time City Operations Dashboard

The primary operational dashboard showing per-city health:

| Panel | Visualization | Data Source |
|-------|---------------|------------|
| **Live Map** | Driver positions (available/on-trip), active surge zones | Geospatial index + surge cache |
| **Supply & Demand** | Time-series: online drivers vs. open requests (5-min windows) | Stream processor |
| **Matching Health** | Gauges: success rate, p50/p95 latency, acceptance rate | Metrics store |
| **Surge Heatmap** | Choropleth map of surge multipliers by zone | Surge cache |
| **Trip Funnel** | Funnel: requests → matched → accepted → completed | Trip service metrics |
| **Pipeline Health** | Time-series: location ingestion rate, consumer lag | Message queue metrics |
| **Active Trips** | Counter: trips by state (en_route, in_progress, etc.) | Trip service |

### Trip Funnel Dashboard

```
Ride Requests:        1000  ████████████████████  100%
├── Matched:           950  ███████████████████   95%
├── Accepted:          900  ██████████████████    90%
├── Driver Arrived:    870  █████████████████     87%
├── Trip Started:      860  █████████████████     86%
├── Trip Completed:    840  ████████████████      84%
├── Cancelled (rider):  80  ██                     8%
├── Cancelled (driver): 30  █                      3%
└── No Drivers:         50  █                      5%
```

### Driver Earnings Dashboard

| Panel | Content |
|-------|---------|
| Daily/weekly/monthly earnings | Time-series chart |
| Trips completed | Count + trend |
| Online hours | Total + utilization rate |
| Rating trend | 30-day rolling average |
| Surge earnings | Earnings from surged trips vs. normal |

### System Health Dashboard

| Panel | Content |
|-------|---------|
| Service status | UP/DOWN/DEGRADED for each service per region |
| API latency | p50/p95/p99 per endpoint |
| Error rate | Errors/second by service |
| Database health | CPU, connections, replication lag |
| Message queue health | Throughput, consumer lag, disk usage |
| WebSocket connections | Active connections, reconnection rate |

---

## Runbook References

| Scenario | Runbook |
|----------|---------|
| Matching latency spike | Check ETA service → Routing engine → Geo index → Network |
| Location pipeline stall | Check message queue → Consumer instances → Geo index write errors |
| Payment failure spike | Check payment processor status page → Circuit breaker state → Retry queue depth |
| Surge anomaly (all zones at max) | Check stream processor → Demand aggregation → Supply counting |
| Driver supply drop | Check driver app release (crash?) → Network carrier outage → External event (weather, holiday) |
| Orphan trip resolution | Load trip state → Contact driver/rider → Manual state transition → Fare adjustment |
| Data center failover | Verify standby health → Switch DNS → Confirm traffic shift → Monitor for 30 min |
