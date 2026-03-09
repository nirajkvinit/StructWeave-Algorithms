# Observability

## Metrics Strategy

### USE Metrics (Utilization, Saturation, Errors) --- Infrastructure

| Component | Utilization | Saturation | Errors |
|-----------|------------|------------|--------|
| **API Gateway** | Request rate (QPS), CPU %, memory % | Request queue depth, connection pool usage % | 4xx rate, 5xx rate, timeout rate |
| **Order Management** | Orders/sec, active order count | Unprocessed order queue depth, allocation backlog | Validation failures, allocation failures, timeout rate |
| **Inventory Allocation** | Allocations/sec, cache hit rate % | Lock wait queue depth, hot-SKU contention rate | Double-allocation incidents, deadlocks, timeout rate |
| **Warehouse Management** | Tasks/hour, pick rate, pack rate | Task queue depth per warehouse, labor utilization % | Mispick rate, system-generated exceptions |
| **Transportation Management** | Tenders/sec, rate queries/sec | Untendered shipment backlog, solver queue depth | Carrier rejection rate, tender timeout rate |
| **Demand Forecasting** | Models trained/hour, inference QPS | Training queue depth, GPU utilization % | Training failures, inference timeout rate |
| **Tracking Service** | Events ingested/sec, queries/sec | Consumer lag (events behind), unprocessed event queue | Ingestion failures, duplicate rate, out-of-order rate |
| **IoT Gateway** | Messages/sec, device connections | Connection count vs. max, message buffer usage | Connection drops, authentication failures, malformed messages |
| **Control Tower** | Dashboard renders/sec, alert evaluations/sec | Query queue depth, WebSocket connection count | Dashboard timeout rate, false alert rate |
| **Database (per shard)** | Query rate, connection pool %, disk I/O | Replication lag, lock queue depth, WAL size | Query errors, deadlocks, constraint violations |
| **Event Stream** | Messages/sec per topic, partition throughput | Consumer lag per consumer group, disk usage | Dead-letter queue depth, deserialization errors |
| **Cache** | Hit rate %, memory usage %, eviction rate | Connection count vs. max, key count | Connection errors, serialization failures |

### RED Metrics (Rate, Errors, Duration) --- Business Services

| Service | Rate | Errors | Duration (p50/p95/p99) |
|---------|------|--------|----------------------|
| **Order Create** | Orders/min | Validation failures, credit hold rate | 150ms / 400ms / 800ms |
| **ATP Check** | Checks/min | Stale cache responses, timeout rate | 50ms / 150ms / 300ms |
| **Inventory Allocate** | Allocations/min | Insufficient stock, contention failures | 100ms / 300ms / 600ms |
| **Pick Task Complete** | Picks/hour per worker | Mispick rate, task reassignment rate | N/A (human-paced) |
| **Carrier Rate Shop** | Queries/min | Carrier API failures, zero-rate responses | 500ms / 2s / 5s |
| **Route Optimize** | Solves/min | Infeasible solutions, timeout rate | 2s / 10s / 30s |
| **Shipment Tender** | Tenders/min | Carrier rejection rate, timeout | 300ms / 1s / 3s |
| **Tracking Ingest** | Events/sec | Parsing failures, duplicate rate | 10ms / 50ms / 100ms |
| **ETA Prediction** | Predictions/min | Model inference errors | 50ms / 200ms / 500ms |
| **Demand Forecast** | Models retrained/day | Training failures, convergence failures | 30s / 2min / 10min per model |
| **EDI Process** | Messages/min | Parsing errors, validation failures, duplicates | 200ms / 1s / 3s |
| **Control Tower Alert** | Alerts evaluated/min | False positive rate, missed exceptions | 500ms / 2s / 5s |

### Business KPI Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| **Perfect order rate** | % of orders delivered complete, on-time, undamaged, with correct documentation | < 90% (trigger review) |
| **Order-to-ship cycle time** | Avg time from order capture to carrier pickup | > 8 hours for standard; > 4 hours for expedited |
| **On-time delivery rate (OTIF)** | % of orders delivered by promised date | < 95% (trend down 3%+ week-over-week) |
| **Inventory days of supply** | Average days of inventory on hand by category | > 60 days for fast-movers; < 7 days (stockout risk) |
| **Stockout rate** | % of SKU-locations with zero available inventory | > 3% for A-items; > 10% for B-items |
| **Forecast accuracy (WMAPE)** | Weighted Mean Absolute Percentage Error | > 30% for A-items; > 45% for B-items |
| **Forecast bias** | Systematic over- or under-forecasting | Abs(bias) > 5% sustained for 4+ weeks |
| **Fill rate** | % of ordered quantity fulfilled from available stock | < 95% for A-items |
| **Carrier on-time pickup** | % of shipments picked up within scheduled window | < 90% |
| **Freight cost per unit shipped** | Average transport cost per unit/kg/pallet | > 10% above budget |
| **Return rate** | % of orders returned | > 15% for any product category (quality issue signal) |
| **Supplier on-time delivery** | % of POs received on or before expected date | < 85% for any active supplier |
| **Warehouse throughput** | Units picked/packed/shipped per labor hour | < 80% of target rate |
| **IoT sensor uptime** | % of sensors reporting within expected interval | < 95% |

---

## Dashboard Design

### Operations Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  SUPPLY CHAIN OPERATIONS DASHBOARD                           │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ Order Health │ Fulfillment  │ Transport    │ Inventory     │
│ ██████ 99.2% │ Ship Rate:   │ OTIF: 96.1%  │ Stockouts: 47 │
│ Orders today:│ 94.8%        │ In-transit:  │ Excess: 182   │
│ 82,341       │ Backlog: 412 │ 12,847       │ DOS: 32 days  │
├──────────────┴──────────────┴──────────────┴───────────────┤
│  EXCEPTION DASHBOARD                                         │
│  [!] 23 Late Shipments  [!] 5 Carrier Rejections            │
│  [!] 12 Temp Excursions [!] 3 Stockout Risks (A-items)      │
│  [!] 2 Port Delays      [!] 1 Supplier Quality Alert        │
├─────────────────────────────────────────────────────────────┤
│  ORDER PIPELINE                                              │
│  Created ████████████ 1,247                                  │
│  Allocated █████████ 989                                     │
│  Released ████████ 876                                       │
│  Picking ██████ 654                                          │
│  Packed ████ 432                                             │
│  Shipped ██████████████ 1,543                                │
├─────────────────────────────────────────────────────────────┤
│  FORECAST VS ACTUAL (Rolling 4 weeks)                        │
│  Week 1: Forecast: 150K | Actual: 142K | Error: -5.3%       │
│  Week 2: Forecast: 155K | Actual: 161K | Error: +3.9%       │
│  Week 3: Forecast: 148K | Actual: 147K | Error: -0.7%       │
│  Week 4: Forecast: 160K | Actual: [in progress]             │
│  Weighted MAPE (12-week): 18.2%                              │
├─────────────────────────────────────────────────────────────┤
│  TRANSPORT COST TRACKER                                      │
│  Budget MTD: $2.4M | Actual: $2.1M | Variance: -$300K       │
│  Cost/unit: $1.23 (target: $1.35)                            │
│  Mode mix: Road 62% | Ocean 25% | Air 8% | Rail 5%          │
└─────────────────────────────────────────────────────────────┘
```

### Control Tower Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  CONTROL TOWER - REAL-TIME VISIBILITY                        │
├─────────────────────────────────────────────────────────────┤
│  WORLD MAP: [Interactive map showing shipment positions]      │
│  ● 12,847 active shipments                                   │
│  ● 23 exceptions (red markers)                               │
│  ● 47 at-risk (yellow markers)                               │
├──────────────┬──────────────┬──────────────────────────────┤
│  BY MODE     │  BY STATUS   │  TOP EXCEPTIONS               │
│  Road: 8,200 │  On-time:    │  1. Shanghai port delay (47   │
│  Ocean: 3,100│  11,234      │     shipments, est. 5-day)    │
│  Air: 1,047  │  At-risk:    │  2. Carrier capacity crunch   │
│  Rail: 500   │  1,247       │     (Midwest region, 12 LTL)  │
│              │  Late: 366   │  3. Temp excursion: cold chain │
│              │              │     (3 shipments, auto-alert)  │
├──────────────┴──────────────┴──────────────────────────────┤
│  EXCEPTION AGING                                             │
│  < 1 hour: ████████ 15                                       │
│  1-4 hours: ████ 8                                           │
│  4-24 hours: ██ 4                                            │
│  > 24 hours: █ 2 [ESCALATED]                                 │
├─────────────────────────────────────────────────────────────┤
│  RECOMMENDATIONS                                             │
│  → Air-freight 12 SKUs from LA to avoid stockout at Chicago  │
│    (Est. cost: $4,200 | Stockout cost avoided: $45,000)      │
│  → Re-route 3 shipments via Atlanta hub (carrier delay)      │
│  → Pre-alert customers: 23 orders delayed 2-3 days           │
└─────────────────────────────────────────────────────────────┘
```

---

## Distributed Tracing

### Trace Structure: Order-to-Delivery

```
Trace: order-lifecycle (correlation_id: abc-123)
├── [Order Service] POST /orders (150ms)
│   ├── [Validation] validate_order (20ms)
│   ├── [ATP Cache] check_availability (8ms)
│   ├── [Allocation Service] allocate_inventory (95ms)
│   │   ├── [Inventory DB] SELECT FOR UPDATE (12ms)
│   │   ├── [Inventory DB] UPDATE allocated_qty (8ms)
│   │   └── [Cache] invalidate_atp (2ms)
│   └── [Event Stream] emit OrderAllocated (5ms)
├── [Fulfillment Orchestrator] process_allocation (25ms)
│   └── [WMS] release_to_warehouse (18ms)
├── [WMS] create_pick_task (35ms)
│   ├── [Wave Planner] batch_orders (15ms)
│   └── [Pick Optimizer] compute_pick_path (12ms)
├── ... (human picking time: ~15 minutes, not traced) ...
├── [WMS] confirm_pack (45ms)
│   └── [Label Service] generate_label (30ms)
├── [TMS] request_carrier (850ms)
│   ├── [Rate Engine] query_rates (300ms)
│   │   ├── [Carrier API - UPS] get_rate (180ms)
│   │   ├── [Carrier API - FedEx] get_rate (220ms)
│   │   └── [Cache] check_contract_rates (5ms)
│   ├── [Optimizer] select_carrier (50ms)
│   └── [Carrier API] tender_shipment (400ms)
├── [Tracking] create_tracking_record (15ms)
│   └── [Event Stream] emit ShipmentCreated (5ms)
└── ... (in-transit tracking: days, event-driven) ...
    ├── [Tracking] ingest_carrier_update (10ms per event)
    ├── [ETA Service] compute_eta (50ms)
    └── [Tracking] confirm_delivery (20ms)
        └── [Event Stream] emit OrderDelivered (5ms)
```

### Trace Sampling Strategy

| Traffic Type | Sampling Rate | Rationale |
|-------------|-------------|-----------|
| **Order lifecycle** | 10% for normal; 100% for errors and slow requests (p99+) | Balance visibility with storage cost; always capture problems |
| **IoT ingestion** | 0.1% (1 in 1000) | Extremely high volume; sample for pipeline health monitoring |
| **Carrier API calls** | 100% | External dependency; full visibility for debugging and SLA tracking |
| **Forecast training** | 100% | Low volume; each job is important |
| **Control tower queries** | 5% | Read-heavy; sample for performance profiling |

---

## Logging Strategy

### Log Levels by Service

| Service | INFO | WARN | ERROR | Structured Fields |
|---------|------|------|-------|-------------------|
| **Order Management** | Order created/updated/cancelled | Partial allocation, backorder | Allocation failure, validation error, timeout | `order_id`, `tenant_id`, `channel`, `status`, `customer_id` |
| **Inventory** | Allocation, adjustment, receipt | Low stock warning, safety stock breach | Double-allocation detected, negative inventory | `sku_id`, `location_id`, `qty_before`, `qty_after`, `operation` |
| **Transportation** | Tender sent, accepted, tracking update | Carrier rejection, rate mismatch | Tender timeout, carrier API failure | `shipment_id`, `carrier`, `tracking_num`, `service_level` |
| **Demand Forecast** | Model trained, forecast published | Accuracy degradation, bias detection | Training failure, inference timeout | `sku_id`, `location_id`, `model`, `mape`, `bias` |
| **IoT Ingestion** | (Disabled at INFO level - too high volume) | Device connectivity issue, data quality | Ingestion failure, authentication failure | `device_id`, `sensor_type`, `gateway_id` |
| **EDI Processing** | Message received, translated, processed | Schema warning, near-duplicate | Parse failure, validation error, duplicate | `partner_id`, `doc_type`, `control_number`, `direction` |
| **Control Tower** | Alert generated, recommendation made | Alert auto-suppressed (below threshold) | Correlation failure, dashboard timeout | `exception_type`, `severity`, `affected_entities` |

---

## Alerting Strategy

### Alert Priority Matrix

| Priority | Response Time | Channel | Examples |
|----------|-------------|---------|----------|
| **P0 - Critical** | < 5 min | Page on-call + Slack + phone | Order capture down, inventory DB failure, double-allocation detected |
| **P1 - High** | < 30 min | Page on-call + Slack | Allocation service degraded, carrier API outage (major carrier), tracking ingestion lag > 10 min |
| **P2 - Medium** | < 4 hours | Slack + ticket | Forecast accuracy degraded > 5%, EDI processing backlog > 1 hour, single-warehouse WMS issue |
| **P3 - Low** | Next business day | Ticket | Dashboard slow (p95 > 5s), non-critical carrier API intermittent, IoT device offline > 1 hour |

### Alert Suppression and Correlation

```
ALERT CORRELATION RULES:

RULE carrier_outage_correlation:
    IF COUNT(carrier_api_timeout WHERE carrier = X) > 10 IN 5_minutes:
        SUPPRESS individual carrier_api_timeout alerts for carrier X
        EMIT single "Carrier X API Outage" P1 alert
        INCLUDE affected_shipment_count, last_success_time

RULE port_delay_cascade:
    IF PortDelayDetected(port = X):
        SUPPRESS individual shipment_delay alerts for shipments FROM port X
        EMIT single "Port X Delay - N shipments affected" P2 alert
        INCLUDE affected_orders, projected_stockout_risk

RULE holiday_season_threshold_adjustment:
    IF current_date IN holiday_season (Nov 15 - Jan 5):
        ADJUST all latency thresholds by 1.5x
        ADJUST order_volume thresholds by 3x
        NOTE: Do not suppress error rate alerts

RULE forecast_accuracy_trend:
    IF forecast_mape > threshold FOR 4_consecutive_weeks:
        EMIT "Sustained forecast degradation" P2 alert
        DO NOT alert on individual weekly deviations
```

---

## SLI/SLO Dashboard

| SLI | Measurement | SLO Target | Burn Rate Alert |
|-----|-------------|------------|-----------------|
| **Order capture success rate** | Successful orders ÷ total order attempts | 99.95% | Alert if 1-hour burn rate exceeds 3× error budget |
| **ATP check latency** | p95 of ATP check response time | < 150ms | Alert if p95 > 300ms for 5 min |
| **Order-to-ship time** | Time from order creation to ship confirmation | < 4 hours for 95% of same-day orders | Alert if 6-hour rolling rate < 90% |
| **Tracking freshness** | Age of latest tracking update per active shipment | < 30 minutes for 99% of shipments | Alert if stale shipments > 5% for 15 min |
| **IoT ingestion rate** | Events accepted ÷ events received | > 99.99% | Alert if rejection rate > 0.01% for 5 min |
| **Forecast publication timeliness** | Forecast published before planning cycle start | 100% (weekly deadline) | Alert 2 hours before deadline if not started |
| **EDI processing success** | Successfully processed ÷ total received | > 99.5% | Alert if failure rate > 1% for 30 min |
| **Control tower dashboard load** | p95 page load time | < 3 seconds | Alert if p95 > 5s for 10 min |
