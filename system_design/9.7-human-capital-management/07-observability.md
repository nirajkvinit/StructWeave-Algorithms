# Observability

## Metrics Framework

### Payroll Engine Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `payroll.run.duration_seconds` | Histogram | Total wall-clock time for a pay run from start to completion | > 80% of window (3.2 hours of 4-hour window) |
| `payroll.run.employees_processed` | Counter | Employees calculated per run, segmented by status (success, error, skipped) | Error rate > 0.1% |
| `payroll.calculation.duration_ms` | Histogram | Per-employee calculation time | p99 > 500ms |
| `payroll.run.progress_pct` | Gauge | Percentage of employees calculated in the current run | Stall detection: no progress for > 5 minutes |
| `payroll.tax.calculation_duration_ms` | Histogram | Tax engine response time per employee | p95 > 200ms |
| `payroll.retro.adjustments_count` | Counter | Number of retroactive adjustments per run | > 5% of population (may indicate data quality issue) |
| `payroll.anomaly.detections` | Counter | Anomalies flagged by post-calculation checks | Any P0 anomaly (zero net pay, ghost employee) |
| `payroll.ytd.accumulator_drift` | Gauge | Difference between running YTD and recalculated YTD | Any non-zero drift |
| `payroll.ach.generation_time_seconds` | Histogram | Time to generate direct deposit file | > 30 minutes |
| `payroll.commit.approval_latency_hours` | Histogram | Time between calculation completion and commit approval | > 2 hours (approaching cutoff) |

### Time and Attendance Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `time.punch.ingestion_rate` | Counter | Punches received per second | Sustained drop > 50% from expected (clock outage) |
| `time.punch.ack_latency_ms` | Histogram | End-to-end punch acknowledgment time | p95 > 2000ms |
| `time.punch.dedup_rate` | Counter | Duplicate punches detected and discarded | > 5% of total (possible clock malfunction) |
| `time.exception.count` | Counter | Time exceptions by type (missed punch, late, overtime) | Missed punches > 3% of daily punches |
| `time.timecard.approval_rate` | Gauge | Percentage of timecards approved before payroll cutoff | < 95% with < 24 hours to cutoff |
| `time.clock.offline_count` | Gauge | Number of time clocks currently offline | > 5% of fleet |
| `time.clock.queue_depth` | Gauge | Punches queued locally on offline clocks | > 1000 on any single clock |
| `time.geofence.violation_rate` | Counter | Mobile punches outside geofence boundaries | > 2% (possible policy issue or GPS drift) |

### Benefits Administration Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `benefits.enrollment.submissions_rate` | Counter | Elections submitted per minute | During open enrollment: sustained > 90% of capacity |
| `benefits.enrollment.error_rate` | Counter | Failed election submissions | > 1% |
| `benefits.enrollment.completion_pct` | Gauge | Percentage of eligible employees who completed enrollment | < 50% with < 1 week remaining |
| `benefits.enrollment.latency_ms` | Histogram | Time to process an election submission | p95 > 1000ms |
| `benefits.carrier_feed.delivery_success` | Counter | Carrier feeds successfully transmitted | Any failure triggers alert |
| `benefits.carrier_feed.rejection_rate` | Counter | Records rejected by carrier acknowledgment | > 0.5% of records |
| `benefits.life_event.processing_time_hours` | Histogram | Time from life event submission to enrollment window opening | > 48 hours (regulatory risk) |
| `benefits.cobra.notification_timeliness` | Gauge | COBRA notifications sent within 14-day requirement | Any breach |

### Leave Management Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `leave.balance.query_latency_ms` | Histogram | Leave balance lookup response time | p95 > 150ms |
| `leave.accrual.batch_duration_seconds` | Histogram | Nightly accrual batch run time | > 30 minutes |
| `leave.accrual.errors` | Counter | Employees whose accrual failed | Any count > 0 |
| `leave.request.approval_latency_hours` | Histogram | Time from request to manager approval | > 72 hours (employee satisfaction) |
| `leave.fmla.entitlement_remaining_hours` | Gauge | Per-employee FMLA hours remaining | < 40 hours (approaching exhaustion) |
| `leave.negative_balance.count` | Gauge | Employees with negative leave balances | Any count (potential policy violation) |

### Employee Self-Service Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `ess.concurrent_sessions` | Gauge | Active employee sessions | > 80% of capacity |
| `ess.api.latency_ms` | Histogram | API response time by endpoint | p95 > 300ms |
| `ess.api.error_rate` | Counter | 5xx errors per endpoint | > 0.5% |
| `ess.auth.failed_attempts` | Counter | Failed authentication attempts | > 10 per user in 1 hour (brute force) |
| `ess.paystub.download_rate` | Counter | Pay stub downloads on payday | Used for capacity planning |

---

## Logging Strategy

### Log Levels and Categories

| Category | Level | Content | Retention |
|----------|-------|---------|-----------|
| **Payroll calculation** | INFO | Employee ID, run ID, gross/net (masked), calculation hash | 7 years |
| **Payroll calculation** | ERROR | Employee ID, run ID, error details, input snapshot | 7 years |
| **Tax calculation** | DEBUG | Jurisdiction, bracket applied, taxable amount, result | 90 days (verbose) |
| **Time punch ingestion** | INFO | Employee ID, timestamp, source, location, ack status | 3 years |
| **Benefits enrollment** | INFO | Employee ID, plan ID, coverage, election status | 7 years |
| **API requests** | INFO | Endpoint, method, user, response code, latency | 90 days |
| **Security events** | WARN/ERROR | Auth failures, SOD violations, sensitive data access | 10 years |
| **Integration events** | INFO | Carrier/bank/agency, file reference, record count, status | 7 years |

### Structured Log Format

```
{
  "timestamp": "2025-11-15T14:30:22.456Z",
  "service": "payroll-engine",
  "level": "INFO",
  "trace_id": "abc-123-def-456",
  "span_id": "span-789",
  "tenant_id": "tenant-001",
  "event": "employee_calculation_complete",
  "employee_id": "emp-12345",
  "pay_run_id": "run-2025-11-15-001",
  "gross_pay": "[MASKED]",
  "net_pay": "[MASKED]",
  "calculation_hash": "sha256:a1b2c3...",
  "duration_ms": 145,
  "earnings_count": 3,
  "deductions_count": 7,
  "tax_jurisdictions": 4,
  "retro_periods": 0,
  "anomaly_flags": []
}
```

**Sensitive data masking**: Payroll amounts, SSNs, and bank account numbers are never logged in plaintext. Logs contain calculation hashes and record counts for debugging without exposing PII.

---

## Distributed Tracing

### Key Trace Flows

#### Payroll Run Trace

```
payroll-run (root span, duration: ~3 hours)
├── input-assembly (per-employee, parallelized)
│   ├── fetch-employee-master (50ms)
│   ├── fetch-compensation (30ms)
│   ├── fetch-time-data (40ms)
│   ├── fetch-benefits-elections (25ms)
│   └── fetch-ytd-accumulators (20ms)
├── gross-calculation (per-employee)
│   ├── base-pay-calc (5ms)
│   ├── premium-earnings (10ms)
│   └── retro-adjustment (0-200ms, depends on lookback depth)
├── deduction-calculation (per-employee)
│   ├── pre-tax-deductions (10ms)
│   ├── tax-engine-call (30-80ms)
│   │   ├── federal-tax (10ms)
│   │   ├── state-tax (10-30ms, varies by state count)
│   │   ├── local-tax (5-15ms)
│   │   └── fica-calculation (5ms)
│   └── post-tax-deductions (10ms)
├── finalization (per-employee)
│   ├── ytd-update (15ms)
│   ├── pay-stub-generation (25ms)
│   └── gl-entry-generation (10ms)
└── output-generation (batch)
    ├── ach-file-generation (5-15 min)
    ├── tax-filing-accumulation (2-5 min)
    └── payroll-register-generation (1-3 min)
```

#### Time Punch Trace

```
time-punch-ingestion (root span)
├── receive-punch (1ms)
├── authenticate-device (5ms)
├── validate-employee (10ms)
│   └── check-active-employment (cache hit: 1ms, miss: 30ms)
├── geofence-check (5ms, mobile only)
├── dedup-check (3ms)
├── persist-to-time-store (10ms)
├── exception-detection (5ms)
│   ├── check-schedule-variance (3ms)
│   └── check-consecutive-hours (2ms)
├── acknowledge-to-clock (2ms)
└── emit-event (async, 1ms)
```

---

## Dashboards

### Payroll Operations Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYROLL OPERATIONS DASHBOARD                  │
├──────────────────────┬──────────────────────┬───────────────────┤
│  Active Pay Runs     │  Overall Progress    │  Time Remaining   │
│  ████ 3 of 8 today   │  ████████░░ 78%     │  ⏱ 1h 42m to     │
│                      │  117,000 / 150,000   │    ACH cutoff     │
├──────────────────────┴──────────────────────┴───────────────────┤
│  Pay Run Status by Tenant                                       │
│  Tenant A (50K) ████████████████████░░░ 85% [On Track]         │
│  Tenant B (30K) ██████████████████████████ 100% [Complete]      │
│  Tenant C (10K) ████████████████░░░░░░░░░ 65% [⚠ Slow]        │
│  Tenants D-F    ██████████████████████████ 100% [Complete]      │
├─────────────────────────────────────────────────────────────────┤
│  Error Summary                          │  Anomaly Alerts       │
│  Calculation errors: 12 (0.008%)        │  Net pay deviation: 8 │
│  Missing time data: 5                   │  New bank account: 3  │
│  Tax jurisdiction unknown: 2            │  Zero net pay: 1 🔴   │
│  Benefits election mismatch: 3          │  Ghost employee: 0    │
├─────────────────────────────────────────┴───────────────────────┤
│  Tax Calculation Performance                                     │
│  Avg per employee: 45ms ✅  │  p99: 180ms ✅  │  Cache hit: 98% │
├─────────────────────────────────────────────────────────────────┤
│  Payroll History (Last 6 Periods)                               │
│  Period    │ Employees │ Gross Total   │ Errors │ Duration      │
│  Nov-P2    │ 148,500   │ $XX.XM        │ 8      │ 2h 45m        │
│  Nov-P1    │ 149,200   │ $XX.XM        │ 15     │ 2h 52m        │
│  Oct-P2    │ 147,800   │ $XX.XM        │ 5      │ 2h 38m        │
└─────────────────────────────────────────────────────────────────┘
```

### Time and Attendance Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                TIME AND ATTENDANCE DASHBOARD                     │
├──────────────────────┬──────────────────────┬───────────────────┤
│  Punches Today       │  Clock Health        │  Exceptions Today │
│  📊 142,500          │  🟢 487 / 500 Online │  ⚠ 1,250 open    │
│  vs 140,200 expected │  🔴 13 Offline       │  (0.88% of total) │
├──────────────────────┴──────────────────────┴───────────────────┤
│  Punch Ingestion Rate (24h)                                     │
│  12am  4am  ──8am──  12pm  4pm  ──8pm──  12am                 │
│  ░░░░░░░░█████████░░░░░░░░█████████░░░░░░                      │
│  Peak: 7:02 AM — 480 punches/sec                                │
├─────────────────────────────────────────────────────────────────┤
│  Timecard Approval Status (Current Period)                      │
│  Approved: ██████████████████████ 82%                           │
│  Submitted: █████ 12%                                           │
│  Open: ██ 6%  [⚠ Cutoff in 36 hours]                           │
├─────────────────────────────────────────────────────────────────┤
│  Exception Types                                                 │
│  Missed punch:    ████████████ 580 (46%)                        │
│  Late arrival:    ████████ 340 (27%)                            │
│  Overtime alert:  █████ 200 (16%)                               │
│  Geofence issue:  ███ 130 (10%)                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Benefits Enrollment Dashboard (During Open Enrollment)

```
┌─────────────────────────────────────────────────────────────────┐
│              OPEN ENROLLMENT DASHBOARD — Day 8 of 21            │
├──────────────────────┬──────────────────────┬───────────────────┤
│  Enrollment Progress │  Active Sessions     │  System Health    │
│  ████████░░ 62%      │  👥 12,450 concurrent│  🟢 All healthy  │
│  93,000 / 150,000    │  Peak today: 18,200  │  Latency p95: 450ms│
├──────────────────────┴──────────────────────┴───────────────────┤
│  Completion by Population                                       │
│  Corporate:  ██████████████████ 78%                             │
│  Field/Ops:  ████████████ 52%                                   │
│  New Hires:  ██████ 35%  [⚠ Target: 100% by Day 14]           │
│  Part-Time:  ████████ 41%                                       │
├─────────────────────────────────────────────────────────────────┤
│  Plan Selection Trends                                          │
│  Medical PPO: 45% (-3% vs last year)                           │
│  Medical HDHP: 38% (+5% vs last year)                          │
│  HSA Opt-In: 35% (+8% vs last year)                            │
├─────────────────────────────────────────────────────────────────┤
│  Errors & Support                                               │
│  Eligibility denials: 45    │ Dependent verification pending: 89│
│  Submission errors: 12      │ Support tickets opened: 156       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alerting Rules

### Critical (P0) — Immediate Response

| Alert | Condition | Notification |
|-------|-----------|-------------|
| Payroll run stalled | No progress for > 10 minutes during active run | Page on-call payroll engineer + payroll ops manager |
| ACH cutoff at risk | Payroll run < 90% complete with < 1 hour to cutoff | Page payroll ops director; prepare manual payment fallback |
| Zero net pay detected | Any employee with gross > 0 and net ≤ 0 | Block run commit; alert payroll specialist |
| Benefits enrollment system down | 5xx error rate > 5% during open enrollment | Page platform engineering; activate enrollment extension plan |
| Payroll data breach detected | Unauthorized bulk access to compensation or SSN data | Page security team; trigger incident response |

### High (P1) — 30-Minute Response

| Alert | Condition | Notification |
|-------|-----------|-------------|
| Time clock fleet degradation | > 10% of clocks offline for > 15 minutes | Alert facilities and IT support |
| Carrier feed delivery failure | Carrier feed not delivered within SLA window | Alert benefits administrator |
| Payroll anomaly spike | > 20 anomalies detected in a single pay run | Alert payroll specialist for review before commit |
| Leave accrual batch failure | Nightly accrual completes with > 0 errors | Alert leave administrator |
| Tax calculation errors | Tax engine returning errors for > 0.05% of calculations | Alert payroll engineering |

### Medium (P2) — Business Hours Response

| Alert | Condition | Notification |
|-------|-----------|-------------|
| Timecard approval deadline approaching | < 24 hours to cutoff with > 10% unapproved timecards | Email notification to managers with pending approvals |
| Open enrollment completion lagging | < 50% completion at enrollment midpoint | Email HR communications team |
| Self-service latency degradation | p95 > 500ms for > 30 minutes | Alert platform engineering |
| SOD violation detected | Any soft-block SOD violation logged | Email compliance team |
| Employee data change spike | > 3x normal rate of employee record changes | Alert HR operations (possible bulk import or integration issue) |

---

## Health Checks

### Service Health Endpoints

```
GET /health/payroll-engine
  Checks:
    - Database connectivity (employee, payroll DBs)
    - Tax engine reachability
    - Batch orchestrator status
    - YTD accumulator consistency (spot check)

GET /health/time-capture
  Checks:
    - Time series store write latency
    - Clock ingestion queue depth
    - Deduplication cache availability
    - Event bus connectivity

GET /health/benefits
  Checks:
    - Benefits database connectivity
    - Carrier connectivity (SFTP endpoints reachable)
    - Enrollment window configuration loaded
    - Eligibility rule engine responsive

GET /health/leave
  Checks:
    - Leave balance cache freshness
    - Accrual engine last successful run
    - Policy engine configuration loaded
```

### Synthetic Monitoring

| Test | Frequency | Description |
|------|-----------|-------------|
| Employee profile load | Every 1 minute | Fetch a synthetic employee's full profile including benefits, leave, compensation |
| Pay stub download | Every 5 minutes | Download the most recent pay stub for a synthetic employee |
| Time punch round-trip | Every 1 minute | Submit a synthetic punch and verify acknowledgment |
| Leave balance query | Every 1 minute | Query leave balance for a synthetic employee |
| Benefits plan comparison | Every 5 minutes (every 1 min during open enrollment) | Load plan comparison page for a synthetic employee |
| Org chart traversal | Every 5 minutes | Render 3-level org chart from a test manager node |
