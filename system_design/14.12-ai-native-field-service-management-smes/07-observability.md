# 14.12 AI-Native Field Service Management for SMEs — Observability

## Metrics

### Business Metrics (Real-Time Dashboard)

| Metric | Definition | Granularity | Alert Condition |
|---|---|---|---|
| **Jobs completed per hour** | Completed jobs / active hours | Per tenant, per fleet | < 60% of historical average for time slot |
| **First-time fix rate** | Jobs resolved in single visit / total completed | Per tenant, per tech, per job type | < 85% rolling 7-day average |
| **Average response time** | Time from job creation to technician arrival | Per tenant, per priority level | Emergency > 2 hrs; Urgent > 4 hrs; Standard > 24 hrs |
| **Fleet utilization** | (Job time + travel time) / total available hours | Per tenant, per day | < 60% (underutilized) or > 95% (burnout risk) |
| **Customer satisfaction (CSAT)** | Post-service rating average | Per tenant, per tech | < 4.0/5.0 rolling 30-day |
| **Revenue per technician-hour** | Total invoice value / billable hours | Per tenant, per tech | < 70% of tenant average |
| **Invoice accuracy rate** | Invoices without manual correction / total | Per tenant | < 99% over any 24-hour period |
| **ETA accuracy** | Actual arrival within ±15 min of predicted | Per fleet | < 80% over any 24-hour period |

### System Performance Metrics

| Metric | Collection Method | Alert Threshold |
|---|---|---|
| **Scheduling optimization latency** | Timer around ALNS solver | P95 > 5 seconds for 5 consecutive minutes |
| **Sync round-trip time** | Timer from sync request to acknowledgment | P95 > 10 seconds for 10 minutes |
| **API response latency** | Per-endpoint latency histogram | P99 > 1 second for any endpoint |
| **IoT telemetry ingestion lag** | Timestamp difference: sensor time vs. processing time | P95 > 60 seconds |
| **Notification delivery latency** | Time from trigger to provider acknowledgment | P95 > 45 seconds |
| **Database query latency** | Per-query-type histograms | P95 > 100 ms for indexed queries |
| **Cache hit rate** | Hits / (hits + misses) per cache namespace | < 80% for schedule cache; < 70% for distance matrix cache |
| **Error rate** | 5xx responses / total responses per service | > 0.5% over 5-minute window |
| **Mobile app crash rate** | Crash reports / active sessions | > 0.5% over 24 hours |

### AI/ML Model Metrics

| Metric | Definition | Alert Condition |
|---|---|---|
| **Schedule optimization gap** | Estimated gap between ALNS solution and theoretical optimal | > 10% average gap over 24 hours |
| **Job duration prediction accuracy** | MAPE (Mean Absolute Percentage Error) of predicted vs. actual duration | MAPE > 30% rolling 7-day |
| **Predictive maintenance precision** | True positive failures / total predicted failures | Precision < 80% rolling 30-day |
| **Predictive maintenance recall** | Detected failures / total actual failures | Recall < 90% rolling 30-day |
| **ETA prediction MAE** | Mean absolute error of predicted vs. actual arrival time | MAE > 20 minutes rolling 7-day |
| **Model inference latency** | Time for anomaly detection model to process one reading | P95 > 500 ms |
| **Data drift score** | Statistical drift between training and production feature distributions | Drift score > 0.2 (PSI) |

---

## Logging

### Structured Log Schema

All services emit structured JSON logs with a consistent schema:

```
{
  "timestamp": "ISO-8601",
  "level": "INFO | WARN | ERROR | DEBUG",
  "service": "scheduling-engine | job-service | sync-service | ...",
  "tenant_id": "UUID",
  "trace_id": "UUID (distributed trace)",
  "span_id": "UUID",
  "user_id": "UUID (nullable)",
  "device_id": "string (nullable)",
  "event_type": "string (structured event name)",
  "message": "human-readable description",
  "metadata": {
    // Event-specific key-value pairs
  },
  "duration_ms": "number (for timed operations)",
  "error": {
    "code": "string",
    "message": "string",
    "stack_trace": "string (ERROR level only)"
  }
}
```

### Log Categories and Retention

| Category | Event Types | Volume (est.) | Retention |
|---|---|---|---|
| **Scheduling decisions** | Job assignment, re-optimization trigger, constraint violations, dispatcher overrides | ~3M events/day | 30 days hot, 1 year cold |
| **Sync operations** | Push/pull requests, conflict resolutions, binary uploads, sync failures | ~12M events/day | 14 days hot, 90 days cold |
| **Job lifecycle** | State transitions, status updates, photo captures, invoice generation | ~10M events/day | 30 days hot, 1 year cold |
| **IoT pipeline** | Telemetry batches, anomaly detections, alert generations, model predictions | ~50M events/day | 7 days hot, 30 days cold |
| **Customer notifications** | Send attempts, delivery confirmations, failures, template renders | ~10M events/day | 14 days hot, 90 days cold |
| **Security events** | Auth attempts, permission checks, suspicious activity, device management | ~5M events/day | 90 days hot, 3 years cold |
| **API access** | Request/response logs (headers, status, latency; no PII in logs) | ~150M events/day | 7 days hot, 30 days cold |

### Critical Log Events (Always Captured)

| Event | Trigger | Action |
|---|---|---|
| `scheduling.unassignable_job` | No feasible technician for a job | Alert dispatcher; log all constraint violations that prevented assignment |
| `sync.conflict_resolution` | CRDT merge produced a non-trivial resolution | Log both conflicting values, resolution strategy, and result |
| `sync.data_loss_risk` | Device pending changes exceed 1,000 items | Alert; investigate why device hasn't synced |
| `invoice.pricing_mismatch` | Device-computed total differs from server-computed | Log both totals, pricing versions, and line item differences |
| `payment.failure` | Payment processing failed | Log failure reason, gateway response, retry status |
| `iot.false_positive_detected` | Predicted failure did not occur within prediction window | Log model inputs, prediction, actual outcome for model retraining |
| `auth.suspicious_pattern` | Multiple failed logins, unusual access time, new device | Trigger security review; potentially lock account |

---

## Distributed Tracing

### Trace Architecture

Every request receives a unique trace_id at the API gateway, propagated through all downstream service calls via headers. Traces capture the full request lifecycle:

```
Trace: "Create and schedule a new job"
├── API Gateway (2ms) — auth, rate limit, routing
├── Job Service (15ms) — validate, enrich, persist
│   ├── Database Write (5ms) — insert job record
│   └── Event Bus Publish (3ms) — job.created event
├── Scheduling Engine (2,800ms) — optimization
│   ├── Technician Query (8ms) — fetch candidates
│   ├── Distance Matrix (45ms) — travel time computation
│   │   ├── Cache Lookup (2ms) — 78% hit rate
│   │   └── Maps API Call (40ms) — cache miss entries
│   ├── ALNS Solver (2,700ms) — optimization iterations
│   │   ├── Destroy Phase (800ms) — worst removal
│   │   ├── Repair Phase (1,600ms) — regret insertion
│   │   └── Accept Check (300ms) — simulated annealing
│   └── Schedule Update (45ms) — persist new assignments
├── Notification Service (120ms) — customer + technician notifications
│   ├── Template Render (15ms)
│   ├── SMS Send (80ms) — provider API call
│   └── Push Notification (25ms) — to technician device
└── Sync Service (8ms) — queue update for technician device
Total: ~3,000ms
```

### Key Trace Paths

| Path | Services Involved | SLO | Critical for |
|---|---|---|---|
| Job creation → technician assignment | Gateway → Job → Scheduling → Route → Notification | < 5s end-to-end | Core scheduling SLO |
| Technician status update → customer ETA | Mobile App → Sync → Job → ETA Calculator → Notification | < 30s end-to-end | Customer experience |
| IoT alert → work order creation | IoT Pipeline → Anomaly Detection → Job → Scheduling | < 5 min end-to-end | Predictive maintenance value |
| Invoice generation → accounting sync | Mobile App → Sync → Invoice → Accounting Webhook | < 1 hr end-to-end | Financial accuracy |
| Device sync (full cycle) | Mobile App → Sync → Job + Invoice + Photos | < 15s for data; < 60s with photos | Technician productivity |

### Trace Sampling Strategy

| Traffic Type | Sampling Rate | Rationale |
|---|---|---|
| Errors (5xx, failures) | 100% | Every error trace is captured for debugging |
| Slow requests (> 2× P50) | 100% | All slow requests traced for performance analysis |
| Scheduling optimization | 10% | High volume but critical path; sample for cost control |
| Sync operations | 5% | Very high volume; statistical sampling sufficient |
| IoT telemetry | 1% | Extremely high volume; sample only for pipeline health |
| Normal API requests | 2% | Baseline performance monitoring |

---

## Alerting Strategy

### Alert Severity Levels

| Level | Response Time | Notification | Examples |
|---|---|---|---|
| **P1 — Critical** | < 15 min | PagerDuty + phone call to on-call | Scheduling engine down; data loss detected; security breach |
| **P2 — High** | < 1 hour | PagerDuty + Slack alert | Sync service degraded; payment processing failures > 5%; notification delivery < 90% |
| **P3 — Medium** | < 4 hours | Slack alert | ETA accuracy < 80%; first-time-fix rate drop; model drift detected |
| **P4 — Low** | Next business day | Email + dashboard flag | Cache hit rate decline; disk usage trending; certificate expiry < 30 days |

### Alert Deduplication and Grouping

- **Window-based dedup**: Same alert suppressed for 15 minutes after first fire (prevents alert storm during cascading failures)
- **Tenant grouping**: If > 10 tenants trigger the same alert, escalate to platform-level incident (not 10 separate alerts)
- **Dependency-aware suppression**: If database is down, suppress all downstream service alerts (root cause: database, not individual services)
- **Business hours adjustment**: P3/P4 alerts during off-hours are held until next business day unless they trend toward P1/P2

### Key Alert Definitions

```
ALERT: SchedulingEngineLatencyHigh
  CONDITION: scheduling_optimization_latency_p95 > 5s FOR 5 minutes
  SEVERITY: P2
  ACTION: Check ALNS iteration count; verify distance matrix cache; check tenant schedule size
  RUNBOOK: /runbooks/scheduling-latency

ALERT: SyncServiceFailureRate
  CONDITION: sync_failure_rate > 1% FOR 10 minutes
  SEVERITY: P2
  ACTION: Check database connectivity; verify CRDT merge logic; check for schema version mismatch
  RUNBOOK: /runbooks/sync-failures

ALERT: IoTPipelineBacklog
  CONDITION: iot_telemetry_processing_lag > 5 minutes FOR 15 minutes
  SEVERITY: P3
  ACTION: Check stream processing cluster; verify anomaly model inference latency; scale consumers
  RUNBOOK: /runbooks/iot-backlog

ALERT: InvoicePricingMismatch
  CONDITION: invoice_pricing_mismatch_rate > 0.5% FOR 1 hour
  SEVERITY: P3
  ACTION: Check pricing version distribution on devices; verify price book sync; check for race condition
  RUNBOOK: /runbooks/pricing-mismatch

ALERT: PredictiveMaintenanceFalsePositiveSpike
  CONDITION: pm_false_positive_rate > 15% FOR 7 days
  SEVERITY: P3
  ACTION: Check model input data quality; verify sensor calibration; investigate data drift
  RUNBOOK: /runbooks/pm-false-positives
```

---

## Dashboards

### Operational Dashboard (Dispatcher View)

| Panel | Visualization | Data Source |
|---|---|---|
| Fleet map | Real-time map with technician locations and job pins | GPS stream + job records |
| Schedule heatmap | Time-of-day × technician grid showing utilization | Schedule entries |
| Unassigned jobs | List of jobs pending assignment with priority and SLA countdown | Job service |
| Active alerts | IoT alerts requiring attention | Anomaly detection pipeline |
| Today's KPIs | Jobs completed, avg response time, CSAT, fleet utilization | Aggregated metrics |

### Platform Engineering Dashboard

| Panel | Visualization | Data Source |
|---|---|---|
| Service health grid | Green/yellow/red per service | Health checks |
| Request latency heatmap | Time × endpoint latency percentiles | Distributed traces |
| Scheduling engine capacity | CPU, memory, optimization latency per instance | Instance metrics |
| Sync pipeline health | Success rate, latency, conflict rate, queue depth | Sync service metrics |
| IoT pipeline throughput | Messages/sec, processing lag, anomaly rate | IoT pipeline metrics |
| Error rate trends | Per-service error rates over 24 hours | Log aggregation |
| Database performance | Query latency, connection pool utilization, replication lag | Database metrics |

### AI/ML Model Dashboard

| Panel | Visualization | Data Source |
|---|---|---|
| Scheduling quality score | Optimization gap trend over time | Scheduling engine logs |
| Duration prediction accuracy | MAPE trend per job type | Job completion data vs. predictions |
| Predictive maintenance ROC | Precision-recall curve, updated weekly | Prediction vs. outcome data |
| ETA accuracy distribution | Histogram of (actual - predicted) arrival times | ETA predictions vs. GPS arrival |
| Data drift monitor | Feature distribution comparison (training vs. production) | Feature store + production data |
| Model version tracker | Current model versions per equipment family; last retrain date | ML pipeline metadata |
