# Observability

## Metrics Strategy

### USE Metrics (Utilization, Saturation, Errors) — Infrastructure

| Component | Utilization | Saturation | Errors |
|-----------|------------|------------|--------|
| **API Gateway** | Request rate (QPS), CPU %, memory % | Request queue depth, connection pool usage % | 4xx rate, 5xx rate, timeout rate |
| **Approval Engine** | Active workflow count, rule evaluations/sec | Pending task queue depth, escalation backlog | Rule evaluation failures, timeout escalations |
| **Matching Engine** | Match operations/sec, CPU % | Unmatched invoice queue depth | Match failures, false positive rate |
| **Budget Service** | Budget check operations/sec, cache hit rate | Lock wait time on budget rows, slice exhaustion rate | Budget check timeouts, encumbrance inconsistencies |
| **Database** | Query rate, connection pool %, disk I/O | Replication lag, lock queue depth, WAL size | Query errors, deadlocks, constraint violations |
| **Cache** | Hit rate %, memory usage %, eviction rate | Connection count vs. max | Connection errors, serialization errors |
| **Event Bus** | Messages/sec, partition throughput | Consumer lag (messages behind), partition count vs. limit | Dead-letter queue depth, deserialization errors |
| **Search Engine** | Queries/sec, index size, merge rate | Search queue depth, pending index updates | Query timeouts, indexing failures |

### RED Metrics (Rate, Errors, Duration) — Business Services

| Service | Rate | Errors | Duration (p50/p95/p99) |
|---------|------|--------|----------------------|
| **Requisition Create** | Requisitions/min | Validation failures, budget blocks | 200ms / 500ms / 1s |
| **Approval Action** | Approvals/min | Concurrent modification, stale state | 150ms / 400ms / 800ms |
| **PO Generation** | POs/min | Contract validation failures, dispatch errors | 300ms / 800ms / 2s |
| **Three-Way Match** | Matches/min | Match exceptions %, false positive matches | 500ms / 2s / 5s |
| **Budget Check** | Checks/min | Hard blocks, timeout rate | 50ms / 200ms / 500ms |
| **Catalog Search** | Searches/min | Zero-result searches, timeout rate | 100ms / 300ms / 800ms |
| **Bid Submission** | Bids/min (during auction) | Duplicate bids, out-of-sequence, timeout | 80ms / 150ms / 300ms |
| **Vendor Onboarding** | Onboardings/day | Screening failures, document validation errors | N/A (multi-day workflow) |

### Business KPI Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| **Requisition-to-PO cycle time** | Avg time from requisition submit to PO creation (excluding human wait) | > 24 hours (system processing; human approval time tracked separately) |
| **Approval aging** | Avg days approval tasks remain pending | > 5 business days for any step |
| **Auto-match rate** | % of invoices matched without human intervention | < 90% (trend down > 5% week-over-week) |
| **Exception resolution time** | Avg time from match exception to resolution | > 10 business days |
| **Maverick spend rate** | % of spend not on contract or off-catalog | > 20% for any cost center |
| **Vendor onboarding time** | Avg days from registration to "Active" status | > 30 days |
| **Budget utilization** | % of budget encumbered + spent by period | > 95% (budget exhaustion risk) |
| **PO dispatch success rate** | % of POs successfully delivered to vendor systems | < 95% |
| **Duplicate invoice detection rate** | % of potential duplicates caught | Track for accuracy; no auto-block target |
| **Contract compliance rate** | % of spend against active contracts | < 70% (sourcing opportunity) |

---

## Dashboard Design

### Operations Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  PROCUREMENT OPERATIONS DASHBOARD                           │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ API Health   │ Match Rate   │ Approval     │ Budget        │
│ ██████ 99.97%│ ██████ 94.2% │ Queue: 1,247 │ Alerts: 3     │
│ p99: 312ms   │ Exceptions:  │ Avg Age:     │ Near-limit    │
│              │ 847 pending  │ 2.1 days     │ cost centers  │
├──────────────┴──────────────┴──────────────┴───────────────┤
│                                                             │
│  REQUEST VOLUME (24h)         MATCH THROUGHPUT (24h)        │
│  ┌─────────────────┐          ┌─────────────────┐          │
│  │    ╱╲            │          │         ╱╲      │          │
│  │   ╱  ╲   ╱╲     │          │        ╱  ╲     │          │
│  │  ╱    ╲ ╱  ╲    │          │   ╱╲  ╱    ╲    │          │
│  │ ╱      ╳    ╲   │          │  ╱  ╲╱      ╲   │          │
│  │╱              ╲  │          │ ╱            ╲  │          │
│  └─────────────────┘          └─────────────────┘          │
│                                                             │
│  TOP EXCEPTIONS              APPROVAL BOTTLENECKS           │
│  1. Price variance (42%)     1. J.Smith (VP) - 87 pending   │
│  2. Qty mismatch (31%)      2. M.Chen (Dir) - 54 pending   │
│  3. No GRN found (18%)      3. Finance Team - 41 pending   │
│  4. Item mismatch (9%)      4. Legal Review - 28 pending   │
└─────────────────────────────────────────────────────────────┘
```

### Executive Spend Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  SPEND ANALYTICS DASHBOARD           Period: Q4 2025        │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ Total Spend  │ On-Contract  │ Savings      │ Vendor Count  │
│ $42.7M       │ 78.3%        │ $3.2M (7.5%) │ 2,847 active  │
├──────────────┴──────────────┴──────────────┴───────────────┤
│                                                             │
│  SPEND BY CATEGORY              MAVERICK SPEND TREND        │
│  ┌──────────────────┐           ┌─────────────────┐        │
│  │ IT Hardware  32% │           │ ╲                │        │
│  │ Services    28%  │           │  ╲    ╱╲         │        │
│  │ Office      15%  │           │   ╲  ╱  ╲  ╱    │        │
│  │ Marketing   12%  │           │    ╲╱    ╲╱     │        │
│  │ Other       13%  │           │                  │        │
│  └──────────────────┘           └─────────────────┘        │
│                                  21.3% → 18.1% (improving) │
│                                                             │
│  TOP 10 VENDORS BY SPEND        BUDGET UTILIZATION          │
│  1. TechCorp     $8.2M          Engineering: ████████░ 82%  │
│  2. OfficeMax    $4.1M          Marketing:   ██████░░░ 65%  │
│  3. ConsultLtd   $3.7M          Operations:  █████████ 94%  │
│  4. CloudInc     $3.3M          R&D:         ███████░░ 71%  │
│  5. SecurePro    $2.8M          Admin:       ████░░░░░ 43%  │
└─────────────────────────────────────────────────────────────┘
```

---

## Logging Strategy

### What to Log

| Category | Events | Log Level | Retention |
|----------|--------|-----------|-----------|
| **Document Lifecycle** | Create, submit, approve, reject, cancel, amend | INFO | 7 years (financial records) |
| **Approval Actions** | Approve, reject, delegate, escalate, timeout | INFO | 7 years |
| **Budget Operations** | Check, encumber, release, over-budget warning | INFO | 7 years |
| **Matching Results** | Match success, exception, resolution | INFO | 7 years |
| **Auction Events** | Bid placed, bid withdrawn, auction started/ended, extension | INFO | 5 years |
| **Security Events** | Login/logout, failed auth, permission denied, SoD violation | WARN/ERROR | 3 years |
| **Configuration Changes** | Approval rule change, tolerance change, budget change | WARN | 7 years |
| **Integration Events** | PO dispatch, cXML exchange, EDI message, vendor portal action | INFO | 3 years |
| **Performance Events** | Slow queries (> 1s), timeout, circuit breaker state change | WARN | 90 days |
| **Error Events** | Unhandled exceptions, data integrity violations | ERROR | 1 year |

### Structured Log Format

```
{
  "timestamp": "2026-03-09T14:32:17.847Z",
  "level": "INFO",
  "service": "matching-engine",
  "instance": "match-worker-03",
  "tenant_id": "t-abc123",
  "correlation_id": "corr-789xyz",
  "trace_id": "trace-456def",
  "span_id": "span-012ghi",
  "event": "INVOICE_MATCHED",
  "actor": {
    "type": "SYSTEM",
    "process": "auto-match"
  },
  "resource": {
    "type": "Invoice",
    "id": "inv-567",
    "invoice_number": "VND-2026-1234"
  },
  "details": {
    "po_number": "PO-2026-5678",
    "match_type": "THREE_WAY",
    "lines_matched": 5,
    "lines_excepted": 1,
    "total_amount": 45230.00,
    "max_price_variance_pct": 2.3,
    "processing_time_ms": 847
  },
  "outcome": "PARTIAL_MATCH"
}
```

### Log Levels Strategy

| Level | Usage | Volume Expectation | Alert |
|-------|-------|-------------------|-------|
| **ERROR** | Unrecoverable failures, data integrity issues, security breaches | < 0.1% of events | Immediate alert |
| **WARN** | Recoverable issues, SoD violations, budget warnings, slow operations | < 1% of events | Dashboard; alert if sustained |
| **INFO** | Normal business operations (document lifecycle, approvals, matches) | 90% of events | No alert |
| **DEBUG** | Detailed processing steps, rule evaluation traces | Disabled in production; enabled per-tenant for troubleshooting | No alert |

---

## Distributed Tracing

### Key Traces

| Trace | Spans | Purpose |
|-------|-------|---------|
| **Requisition-to-PO** | Requisition Create → Budget Check → Catalog Validation → Approval Route → (Human Wait) → PO Create → PO Dispatch | End-to-end procurement cycle time; identify bottlenecks |
| **Three-Way Match** | Invoice Receive → OCR/Parse → PO Lookup → GRN Lookup → Line Matching → Tolerance Check → Result Persist → Event Emit | Matching engine performance; identify slow steps |
| **Approval Chain** | Submit for Approval → Rule Evaluation → Task Creation → Notification Dispatch → (Human Wait) → Decision Record → Next Step or Complete | Workflow engine performance; notification delivery time |
| **Reverse Auction Bid** | Bid Submit (WebSocket) → Validation → Bid Record → Rank Recalculation → Broadcast Update → Client Acknowledge | Real-time bid processing latency |
| **Vendor Onboarding** | Registration → Document Upload → Compliance Screen → Credit Check → Sanctions Screen → Approval → Activation | Multi-day workflow; identify stuck stages |

### Trace Propagation

```
TRACE PROPAGATION RULES:

1. HTTP requests: W3C Trace Context headers (traceparent, tracestate)
2. Event bus messages: trace_id and span_id in message headers
3. Async jobs: trace_id passed as job metadata; new span created
4. cXML/EDI outbound: trace_id included in custom header for correlation
5. Cross-tenant: trace_id NEVER crosses tenant boundaries (security isolation)

SPAN ATTRIBUTES (standard):
    - tenant_id (always present)
    - document_type (requisition, po, invoice, etc.)
    - document_id
    - action (create, approve, match, etc.)
    - outcome (success, failure, exception)
    - user_role (requester, approver, system)
```

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Response |
|-------|-----------|----------|
| **Matching engine halted** | Zero matches processed for > 5 minutes | Page on-call; check event bus consumer health and DB connectivity |
| **Budget service unavailable** | Budget check errors > 50% for > 2 minutes | Page on-call; check DB primary and cache cluster; activate degraded mode |
| **Approval engine stalled** | Zero approval transitions for > 10 minutes | Page on-call; check workflow engine instances; verify DB locks |
| **Sealed bid integrity failure** | HSM key access error or hash verification failure | Page on-call + security team; halt bid opening; investigate |
| **Data integrity violation** | Budget invariant violation (encumbered + actual > allocated for hard budgets) | Page on-call; halt new encumbrances; run reconciliation |
| **Database replication lag > 30s** | Sustained for > 5 minutes | Page on-call; check network, disk I/O, long-running transactions |
| **Audit log hash chain broken** | Hash verification failure in audit log | Page on-call + compliance; investigate potential tampering |

### Warning Alerts

| Alert | Condition | Response |
|-------|-----------|----------|
| **Match exception rate spike** | Exception rate > 15% (normal: ~6%) over 1 hour | Notify AP manager; investigate vendor or tolerance rule changes |
| **Approval queue depth** | Any single approver has > 100 pending tasks | Notify approver's manager; suggest delegation |
| **Budget near exhaustion** | Cost center budget < 10% remaining with > 30 days in period | Notify cost center owner and finance |
| **Vendor screening backlog** | Compliance screening queue > 100 pending for > 24 hours | Notify vendor management team; check screening API circuit breaker |
| **Cache hit rate drop** | Cache hit rate < 80% for > 30 minutes | Investigate cache eviction patterns; consider capacity increase |
| **Search latency degradation** | Catalog search p95 > 1s | Investigate search index health; consider re-indexing |

### Runbook References

| Alert | Runbook | Key Steps |
|-------|---------|-----------|
| Matching engine halted | `runbook/matching-engine-recovery.md` | 1. Check consumer lag 2. Verify DB connectivity 3. Restart consumers 4. Re-process dead-letter queue |
| Budget service unavailable | `runbook/budget-service-recovery.md` | 1. Check primary DB 2. Verify cache cluster 3. Enable degraded mode 4. Run reconciliation after recovery |
| Approval engine stalled | `runbook/approval-engine-recovery.md` | 1. Check for DB deadlocks 2. Kill long-running transactions 3. Restart workflow workers 4. Verify pending tasks re-queued |
| Database replication lag | `runbook/db-replication-lag.md` | 1. Identify slow queries 2. Check disk I/O 3. Pause non-critical analytics 4. Consider promoting standby if lag unrecoverable |
| Audit integrity violation | `runbook/audit-integrity-response.md` | 1. Preserve evidence 2. Isolate affected partition 3. Verify from backup 4. Notify compliance officer |

---

## Health Check Endpoints

```
GET /health/live
    Returns: 200 if process is running
    Used by: Container orchestrator for restart decisions

GET /health/ready
    Returns: 200 if service can accept traffic
    Checks: DB connection, cache connection, event bus connection
    Used by: Load balancer for traffic routing

GET /health/deep
    Returns: Detailed health status of all dependencies
    Response:
    {
      "status": "HEALTHY",
      "components": {
        "database": { "status": "UP", "latency_ms": 3 },
        "cache": { "status": "UP", "hit_rate": 0.94 },
        "event_bus": { "status": "UP", "consumer_lag": 42 },
        "search": { "status": "UP", "index_lag_seconds": 12 },
        "hsm": { "status": "UP", "key_ops_last_hour": 847 }
      },
      "uptime_seconds": 864000,
      "version": "3.14.2"
    }
    Used by: Monitoring system for deep health assessment
```
