# Observability

## Observability Strategy

An expense management system requires observability across three domains: **financial accuracy** (every receipt must produce correct extracted data; every reimbursement must reconcile with approved amounts), **operational throughput** (expenses must flow through OCR, policy checks, approvals, and payment without bottlenecks), and **compliance auditability** (every policy decision, approval action, and payment event must be traceable end-to-end). Traditional USE/RED infrastructure metrics are necessary but insufficient---the system must surface business-level indicators that map directly to employee satisfaction, finance team productivity, and audit readiness.

---

## Key Metrics (SLIs)

### Business Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `expense.submission_rate` | Counter per org | Expenses submitted per org per hour | Deviation > 50% from same-day-of-week baseline |
| `expense.submission_rate_per_employee` | Gauge | Average submissions per active employee per week | Monitor for anomalies (> 3x baseline) |
| `ocr.accuracy_receipt_level` | Gauge | % of receipts where all fields extracted correctly | < 92% |
| `ocr.accuracy_field_level` | Gauge per field | Per-field accuracy (amount, date, vendor, currency) | Amount accuracy < 97% |
| `card.auto_match_rate` | Gauge | % of card transactions matched to receipts automatically | < 75% |
| `policy.violation_rate` | Gauge per category | % of submissions flagged for policy violations | Spike > 2x baseline (by category or org) |
| `approval.avg_time_by_level` | Histogram | Average time from submission to each approval level | L1 > 24h, L2 > 48h |
| `reimbursement.cycle_time` | Histogram | End-to-end time from submission to payment | p50 > 5 days, p95 > 14 days |
| `automation.rate` | Gauge | % of expenses processed without human intervention | < 40% (indicates policy/OCR regression) |

### System Metrics (USE/RED)

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `ocr.pipeline.throughput` | Counter | Receipts processed per second | < 80% of provisioned capacity |
| `ocr.pipeline.latency_p50` | Histogram | Median OCR processing time | > 3s |
| `ocr.pipeline.latency_p95` | Histogram | 95th percentile OCR processing time | > 8s |
| `ocr.pipeline.latency_p99` | Histogram | 99th percentile OCR processing time | > 15s |
| `policy.engine.eval_time_p99` | Histogram | Policy evaluation latency | > 200ms |
| `approval.state_transition_latency` | Histogram | Time for workflow engine to process state changes | > 500ms |
| `card_feed.ingestion_lag` | Gauge | Delay between card network event and system ingestion | > 15 min |
| `queue.depth.ocr` | Gauge | OCR processing queue depth | > 10K (backlog building) |
| `queue.depth.reimbursement` | Gauge | Reimbursement processing queue depth | > 5K |
| `queue.depth.gl_posting` | Gauge | General ledger posting queue depth | > 2K |
| `db.connection_pool.utilization` | Gauge per service | Active connections / pool size | > 85% |
| `db.connection_pool.wait_time` | Histogram | Time waiting for available connection | > 50ms |

---

## Dashboard Design

### Dashboard 1: Operations Health

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| API Request Rate | Line chart (current vs 7-day avg) | API gateway metrics |
| Latency Distribution | Heatmap (p50/p75/p90/p95/p99 per endpoint) | Service histograms |
| Error Rate by Service | Stacked area chart | Service error counters |
| Queue Depths | Multi-line chart (OCR, reimbursement, GL posting) | Queue metrics |
| DB Connection Pool | Gauge per database (utilization %) | Connection pool metrics |
| Card Feed Ingestion Lag | Single stat + sparkline | Card feed service |

### Dashboard 2: Finance & Spend Analytics

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| Total Spend by Category | Treemap (current period) | Expense aggregation |
| Policy Violation Trend | Line chart (violations/day by category, last 30 days) | Policy engine logs |
| Reimbursement Cycle Time | Box plot (by org, by approval level) | Workflow engine |
| Automation Rate Trend | Line chart (daily, last 90 days) | Decision logs |
| Top Policy Violators | Table (org, department, violation count) | Policy engine |
| Pending Reimbursement Amount | Single stat (total $ awaiting payment) | Payment service |

### Dashboard 3: OCR Performance

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| Receipt-Level Accuracy | Line chart (daily, by receipt type) | OCR evaluation pipeline |
| Field-Level Accuracy | Horizontal bar (amount, date, vendor, currency, tax) | OCR evaluation pipeline |
| OCR Throughput | Line chart (receipts/sec, current vs capacity) | OCR service metrics |
| OCR Latency | Heatmap (p50/p95/p99 over time) | OCR service histograms |
| Confidence Score Distribution | Histogram (low/medium/high confidence buckets) | OCR output logs |
| Manual Correction Rate | Line chart (% of OCR results corrected by users) | User edit tracking |

### Dashboard 4: Approval Workflow

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| Pending Approvals by Level | Stacked bar (L1/L2/finance, by age bucket) | Workflow engine |
| Average Approval Time | Line chart (by level, by org, last 30 days) | Workflow state transitions |
| SLA Compliance | Gauge (% of approvals within SLA target) | SLA tracking |
| Bottleneck Approvers | Table (approver, pending count, avg response time) | Workflow engine |
| Auto-Approved vs Manual | Pie chart (auto-approved, single-level, multi-level) | Decision logs |
| Escalation Rate | Line chart (% of expenses requiring escalation) | Workflow engine |

---

## Logging Strategy

### Structured Log Schema

```
{
    "timestamp": "2026-03-09T10:15:32.456Z",
    "level": "INFO|WARN|ERROR",
    "service": "expense-approval-service",
    "trace_id": "tr_abc123def456",
    "span_id": "sp_789ghi",
    "correlation_id": "exp_2026030912345",
    "org_id": "org_acme_corp",
    "employee_id": "emp_redacted_hash",
    "expense_id": "exp_2026030912345",
    "event": "approval.state_transition",
    "from_state": "pending_l1",
    "to_state": "approved_l1",
    "approver_id": "emp_approver_hash",
    "amount": 245.50,
    "currency": "USD",
    "latency_ms": 38,
    "metadata": { ... }
}
```

### Log Levels by Component

| Component | INFO | WARN | ERROR |
|-----------|------|------|-------|
| **Receipt Upload** | Upload complete, file size, format detected | Unsupported format fallback, oversized file | Upload failed, storage write failure, virus scan failure |
| **OCR Pipeline** | Extraction complete, confidence scores, field values | Low confidence field (< 70%), fallback to secondary model | OCR service unavailable, extraction timeout, corrupt image |
| **Policy Engine** | Evaluation result, rules matched, auto-approved | Policy violation detected, soft limit exceeded | Policy evaluation failure, rule config error, missing org policy |
| **Approval Workflow** | State transition, approval/rejection action, delegation | SLA approaching deadline, approver reassigned | State machine violation, notification delivery failure |
| **Reimbursement** | Payment initiated, payment confirmed, batch complete | Payment retry scheduled, partial batch failure | Payment rejected by bank, reconciliation mismatch, batch abort |
| **Card Feed** | Transaction ingested, auto-matched to receipt | Duplicate transaction detected, match confidence low | Feed ingestion failure, feed provider timeout, schema mismatch |
| **GL Posting** | Journal entry posted, period close reconciled | Posting delayed, chart-of-accounts mapping missing | Posting failed, double-posting detected, GL system unreachable |

### PII Handling in Logs

```
Sensitive data NEVER appears in logs:
  - Employee names         -> redacted
  - Email addresses        -> hashed (SHA-256, salted)
  - Bank account details   -> token reference only
  - Receipt images         -> reference ID only (no image data)
  - Personal card numbers  -> last 4 digits only
  - Home addresses         -> country/state only
  - Tax IDs / SSN          -> never logged, even hashed

Employee ID: hashed in logs; mapping table secured separately
Expense amounts: logged (not PII, needed for financial debugging)
Org ID: logged in cleartext (required for multi-tenant debugging)
```

---

## Distributed Tracing

### Full Expense Lifecycle Trace

```
Trace: expense_lifecycle (exp_2026030912345)
  ┌─ [gateway] POST /v1/expenses/submit                   total: 4,200ms
  │  ├─ [auth] validate_session_token                             8ms
  │  ├─ [upload] store_receipt_image                             320ms
  │  │  ├─ [virus-scan] scan_file                                45ms
  │  │  └─ [object-store] put_object                            270ms
  │  ├─ [ocr-service] extract_receipt_data                     2,800ms
  │  │  ├─ [preprocessor] normalize_image                       150ms
  │  │  ├─ [ocr-engine] text_extraction                       1,800ms
  │  │  ├─ [field-parser] structured_extraction                 600ms
  │  │  └─ [confidence-scorer] evaluate_confidence              200ms
  │  ├─ [policy-engine] evaluate_expense                        180ms
  │  │  ├─ [rule-loader] fetch_org_rules                         15ms
  │  │  ├─ [rule-evaluator] category_limits                      25ms
  │  │  ├─ [rule-evaluator] duplicate_detection                  80ms
  │  │  └─ [rule-evaluator] receipt_requirements                 40ms
  │  ├─ [card-matcher] attempt_auto_match                       120ms
  │  ├─ [workflow-engine] initiate_approval (async)              35ms
  │  └─ [gateway] format_response                                18ms

Approval Flow Trace (continues from above):
  ┌─ [workflow-engine] process_approval                    total: varies
  │  ├─ [routing] determine_approval_chain                       25ms
  │  ├─ [notification] send_approval_request                    150ms
  │  ├─ [await] L1_approval                              ... hours/days
  │  ├─ [policy-engine] re-evaluate_post_approval                45ms
  │  └─ [workflow-engine] transition_to_approved                  20ms

Reimbursement Trace (triggered after final approval):
  ┌─ [reimbursement-service] process_payment               total: 1,800ms
  │  ├─ [validator] verify_approval_chain                        30ms
  │  ├─ [aggregator] batch_with_other_expenses                   50ms
  │  ├─ [payment-processor] initiate_transfer                 1,200ms
  │  ├─ [gl-service] post_journal_entry                         350ms
  │  └─ [notification] send_payment_confirmation                120ms
```

### Trace Sampling Strategy

| Flow | Sampling Rate | Rationale |
|------|---------------|-----------|
| Expense submission (success) | 10% | High volume, routine path |
| Expense submission (OCR failure) | 100% | Every failure must be diagnosable |
| Policy violation detected | 100% | Audit trail requirement |
| Approval action (approve/reject) | 100% | Financial control, audit trail |
| Reimbursement payment | 100% | Every payment must be fully traceable |
| Card feed ingestion (success) | 1% | Very high volume, routine |
| Card feed ingestion (failure) | 100% | Data integrity requirement |
| GL posting | 100% | Financial accuracy, audit requirement |

---

## Alerting Framework

### Critical Alerts (Page Immediately)

| Alert | Condition | Action |
|-------|-----------|--------|
| `ReimbursementPaymentFailure` | Payment batch failure rate > 5% or any single payment > $10K fails | Page finance-on-call; halt batch; verify bank connectivity |
| `OCRPipelineDown` | OCR error rate > 50% for 3 min OR queue depth growing > 1K/min | Page platform-on-call; activate degraded mode (manual entry) |
| `CardFeedIngestionStopped` | No card transactions ingested for 30 min during business hours | Page integrations-on-call; check feed provider health |
| `AuditLogWriteFailure` | Any audit log write fails | Page security-on-call; halt affected operations until resolved |
| `DatabasePrimaryDown` | Primary DB unreachable for 30s | Page infra-on-call; verify automated failover triggered |
| `GLPostingHalted` | GL posting queue growing with zero successful posts for 15 min | Page finance-on-call; check ERP connectivity |

### Warning Alerts (Investigate Within 1 Hour)

| Alert | Condition | Action |
|-------|-----------|--------|
| `OCRAccuracyBelowThreshold` | Receipt-level accuracy < 90% for 2 consecutive hours | Investigate model performance; check for new receipt formats |
| `ApprovalSLABreach` | > 10% of pending approvals exceed SLA (e.g., 48h for L1) | Notify org admins; check if key approvers are unavailable |
| `PolicyViolationSpike` | Violation rate increases > 2x baseline for any category in 4h | Investigate root cause; possible policy misconfiguration or fraud |
| `DatabaseReplicationLag` | Read replica lag > 10s for 5 min | Check replication health; possible write volume spike |
| `CardMatchRateDrop` | Auto-match rate drops below 65% for 1 hour | Check card feed schema changes; verify merchant name normalization |
| `ReimbursementCycleTimeIncrease` | p50 cycle time > 7 days (rolling 7-day window) | Identify bottleneck stage; check for approval backlog |
| `QueueDepthElevated` | Any queue depth > 80th percentile sustained for 30 min | Scale consumers; investigate upstream burst |

### Informational Alerts (Review Daily)

| Alert | Condition | Action |
|-------|-----------|--------|
| `AutomationRateDecline` | Automation rate drops > 5% week-over-week | Review policy changes and OCR accuracy trends |
| `LowSubmissionVolume` | Org submission volume < 50% of trailing 4-week average | Confirm no system issue; may indicate org-level adoption drop |
| `ExpenseCategorizationDrift` | Category distribution shifts significantly from baseline | Verify category ML model; check for new spend patterns |

---

## Runbooks

| Alert | Runbook | First Responder |
|-------|---------|-----------------|
| `ReimbursementPaymentFailure` | 1. Check payment processor status page. 2. Verify bank API connectivity. 3. Review failed payment error codes. 4. If processor-side, switch to backup processor. 5. Requeue failed payments after resolution. | Finance On-Call |
| `OCRPipelineDown` | 1. Check OCR service pod health and restart if needed. 2. Verify GPU/compute resource availability. 3. Check input queue for poison messages. 4. Enable manual-entry fallback for users. 5. Drain and reprocess queue after recovery. | Platform On-Call |
| `CardFeedIngestionStopped` | 1. Check feed provider API status. 2. Verify authentication credentials (rotate if expired). 3. Check network connectivity to provider. 4. Review last successful ingestion batch for errors. 5. Trigger manual backfill after resolution. | Integrations On-Call |
| `AuditLogWriteFailure` | 1. Check audit log storage health. 2. Verify write permissions and quotas. 3. Check for disk/storage capacity issues. 4. DO NOT resume affected operations until audit logging restored. 5. Backfill any missed audit entries from service logs. | Security On-Call |
| `OCRAccuracyBelowThreshold` | 1. Check recent receipt samples for new formats. 2. Verify preprocessing pipeline (image normalization). 3. Compare model version in production vs expected. 4. Check for upstream image quality degradation. 5. If model regression, rollback to previous version. | ML On-Call |
| `ApprovalSLABreach` | 1. Identify bottleneck approvers (query workflow engine). 2. Check if approvers are OOO without delegates configured. 3. Trigger escalation notifications. 4. If systemic, notify org admins for bulk reassignment. | Product On-Call |
| `PolicyViolationSpike` | 1. Identify which policy rules are triggering. 2. Check for recent policy configuration changes. 3. Review sample violations for false positives. 4. If misconfigured, rollback policy change. 5. If legitimate, notify compliance team. | Compliance On-Call |
| `GLPostingHalted` | 1. Check ERP system connectivity. 2. Verify chart-of-accounts mapping is current. 3. Review failed posting error messages. 4. Check for ERP maintenance windows. 5. Queue postings for retry; reconcile after recovery. | Finance On-Call |

---

## SLI/SLO Summary

### Executive Health Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│ Expense Platform Health                        2026-03-09 10:30  │
├──────────────────┬──────────────────┬────────────────────────────┤
│ OCR Pipeline     │ Approval Engine  │ Reimbursement              │
│ ──────────────   │ ──────────────   │ ──────────────             │
│ Accuracy: 94.6%  │ Avg L1: 6.2h     │ Cycle p50: 3.8 days       │
│ p99 Lat: 9.1s   │ Avg L2: 18.4h    │ Cycle p95: 8.2 days       │
│ Queue: 842       │ SLA OK: 96.3%    │ Pending: $1.24M           │
│ [SLO: OK]       │ [SLO: OK]        │ [SLO: OK]                 │
├──────────────────┴──────────────────┴────────────────────────────┤
│ Card Feed            │ Policy Engine       │ Automation           │
│ ──────────────       │ ──────────────      │ ──────────────       │
│ Lag: 4.2 min         │ Violations: 8.1%    │ Auto-processed: 62%  │
│ Auto-match: 81.3%    │ Eval p99: 85ms      │ OCR-only: 23%        │
│ Ingestion: OK        │ False pos: 2.1%     │ Manual: 15%          │
│ [SLO: OK]           │ [SLO: OK]           │ [Target: > 55%]      │
└──────────────────────────────────────────────────────────────────┘
```

### SLO Burn Rate Monitoring

```
For each SLO, track error budget consumption:

OCR Pipeline Availability (SLO: 99.9%):
  - Monthly budget: 43.2 minutes of downtime
  - Current burn rate: 0.4x (healthy)
  - Remaining budget: 38.6 minutes

Reimbursement Payment Success (SLO: 99.95%):
  - Monthly budget: 0.05% failure rate -> ~150 failed payments
  - Current burn rate: 0.6x (on track)
  - Remaining budget: 112 failed payments

Approval Workflow Latency (SLO: 95% within SLA):
  - Monthly budget: 5% of approvals may exceed SLA
  - Current burn rate: 0.8x (monitor)
  - Remaining budget: 1,200 SLA breaches

Alert on burn rate:
  - > 2x sustained 1h:   Warning (investigate)
  - > 5x sustained 30m:  Critical (page on-call)
  - > 10x any window:    Emergency (incident declared)
```
