# AI-Native Procurement & Spend Intelligence --- Observability

## 1. Metrics

### 1.1 Business Metrics (Procurement KPIs)

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `procurement.po.created.count` | POs created per hour | Baseline varies | > 3σ deviation from hourly baseline |
| `procurement.po.autonomous.rate` | % of POs generated without human intervention | > 60% for eligible categories | < 40% (indicates AI confidence issues) |
| `procurement.po.cycle_time.p95` | Time from requisition to PO approval | < 4 hours | > 8 hours |
| `procurement.spend.maverick.rate` | % of spend outside contracts | < 10% | > 15% |
| `procurement.savings.realized.mtd` | Month-to-date realized savings | On target per plan | < 80% of projected |
| `procurement.supplier.risk.critical.count` | Suppliers with critical risk score | 0 | > 0 (immediate alert) |
| `procurement.contract.expiring.30d.count` | Contracts expiring in 30 days | Varies | > 0 without renewal plan |
| `procurement.invoice.match.auto.rate` | % of invoices auto-matched (3-way) | > 85% | < 75% |
| `procurement.approval.pending.stale.count` | Approvals pending > 48 hours | 0 | > 10 |

### 1.2 System Performance Metrics

| Metric | Description | SLO | Alert |
|--------|-------------|-----|-------|
| `api.latency.p95` | API response latency (95th percentile) | < 500ms | > 1s |
| `api.latency.p99` | API response latency (99th percentile) | < 2s | > 5s |
| `api.error.rate` | HTTP 5xx rate | < 0.1% | > 0.5% |
| `api.throughput` | Requests per second | Baseline varies | < 50% of baseline (traffic drop) |
| `db.query.latency.p95` | Database query latency | < 100ms | > 500ms |
| `db.connections.active` | Active database connections | < 80% pool | > 90% pool |
| `db.replication.lag` | Read replica lag | < 1s | > 5s |
| `cache.hit.rate` | Cache hit rate across all caches | > 70% | < 50% |
| `event_bus.consumer.lag` | Message consumer lag (messages behind) | < 1000 | > 10000 |
| `event_bus.dlq.count` | Dead letter queue message count | 0 | > 0 |

### 1.3 ML-Specific Metrics

| Metric | Description | SLO | Alert |
|--------|-------------|-----|-------|
| `ml.classification.accuracy` | Spend classification accuracy (vs. human labels) | > 95% (L2) | < 92% |
| `ml.classification.confidence.mean` | Mean classification confidence score | > 0.85 | < 0.75 |
| `ml.classification.human_review.rate` | % of transactions requiring human review | < 10% | > 20% |
| `ml.risk_score.staleness.p95` | Age of latest risk score (95th percentile) | < 30 min | > 60 min |
| `ml.inference.latency.p95` | Model inference latency | < 100ms | > 500ms |
| `ml.inference.gpu.utilization` | GPU utilization for inference | 40-80% | > 95% (overloaded) or < 10% (waste) |
| `ml.model.drift.score` | Feature drift detection score (PSI or KL divergence) | < 0.1 | > 0.2 |
| `ml.training.pipeline.duration` | Weekly model retraining duration | < 4 hours | > 8 hours |
| `ml.prediction.distribution.shift` | Shift in prediction distribution vs. baseline | < 5% | > 15% (possible data issue or drift) |
| `ml.feature_store.freshness.p95` | Feature freshness in online store | < 5 min | > 15 min |

### 1.4 Document Intelligence Metrics

| Metric | Description | SLO | Alert |
|--------|-------------|-----|-------|
| `docint.queue.depth` | Documents waiting for processing | < 50 | > 200 |
| `docint.processing.latency.p95` | End-to-end document processing time | < 120s | > 300s |
| `docint.ocr.accuracy` | OCR character-level accuracy | > 98% | < 95% |
| `docint.extraction.accuracy` | Contract term extraction accuracy | > 90% | < 85% |
| `docint.gpu.queue_wait.p95` | Time waiting for GPU resource | < 30s | > 120s |

---

## 2. Logging

### 2.1 Log Categories and Levels

| Category | Level | Content | Retention |
|----------|-------|---------|-----------|
| **Audit Logs** | INFO | All state changes (PO created/approved/cancelled, contract signed, supplier onboarded), actor, timestamp, before/after values | 10 years (immutable) |
| **Security Logs** | WARN/ERROR | Authentication failures, authorization denials, suspicious patterns, API key usage | 3 years |
| **Transaction Logs** | INFO | PO lifecycle events, invoice processing, payment matching | 7 years (SOX) |
| **ML Decision Logs** | INFO | Every AI decision with inputs, outputs, confidence, model version, explanation | 3 years |
| **System Logs** | DEBUG/INFO | Service health, deployment events, configuration changes | 90 days |
| **Integration Logs** | INFO/WARN | ERP sync events, external API calls, data feed processing | 1 year |
| **Performance Logs** | INFO | Slow queries (> 500ms), high-latency API calls, cache misses | 30 days |

### 2.2 Structured Log Format

```
{
  "timestamp": "2026-03-09T14:30:00.123Z",
  "level": "INFO",
  "service": "po-engine",
  "trace_id": "abc-123-def-456",
  "span_id": "span-789",
  "tenant_id": "tenant-001",
  "user_id": "user-042",
  "event_type": "PO_CREATED",
  "entity_type": "purchase_order",
  "entity_id": "po-2026-000142",
  "details": {
    "supplier_id": "sup-789",
    "amount": 15000.00,
    "currency": "USD",
    "category": "IT Services",
    "is_autonomous": true,
    "autonomous_confidence": 0.97,
    "model_version": "approval-predictor-v3.2.1",
    "approval_route": "auto_approved"
  },
  "duration_ms": 1250,
  "outcome": "success"
}
```

### 2.3 PII Handling in Logs

```
Rules:
  - NEVER log supplier banking details, tax IDs, or personal contact info
  - Log supplier_id (UUID) instead of supplier names in system logs
  - Audit logs may include supplier names but must be encrypted at rest
  - User identifiers logged as user_id (UUID); full names only in audit logs
  - IP addresses logged in security events only; hashed after 90 days
  - Contract terms: log term_type and deviation percentage, never clause text
```

---

## 3. Distributed Tracing

### 3.1 Trace Propagation

```
Trace Context:
  - Trace ID generated at API Gateway (W3C Trace Context format)
  - Propagated via HTTP headers (traceparent, tracestate)
  - gRPC metadata for internal service calls
  - Event Bus messages carry trace ID for async correlation
  - ML inference requests tagged with originating trace ID

Span Hierarchy for PO Creation:
  api-gateway (total: 1250ms)
  ├── auth-validation (15ms)
  ├── intake-service (180ms)
  │   ├── parse-request (20ms)
  │   └── validate-input (10ms)
  ├── budget-service (45ms)
  │   └── db-query (12ms)
  ├── sourcing-service (350ms)
  │   ├── supplier-search (120ms)
  │   │   └── vector-similarity (80ms)
  │   ├── risk-score-lookup (30ms)
  │   │   └── feature-store-get (5ms)
  │   └── price-benchmark (200ms)
  │       └── should-cost-model (150ms)
  ├── po-engine (250ms)
  │   ├── contract-validation (60ms)
  │   ├── autonomous-decision (40ms)
  │   │   └── ml-inference (25ms)
  │   ├── db-write (30ms)
  │   └── erp-sync (120ms)
  ├── approval-workflow (50ms)
  │   └── rule-evaluation (20ms)
  └── event-publish (15ms)
```

### 3.2 Async Trace Correlation

```
Challenge: Spend classification happens asynchronously after PO creation.
How to correlate the classification trace with the originating PO trace?

Solution:
  1. PO_CREATED event carries trace_id of the PO creation request
  2. Spend Classification consumer creates a new trace
     with a link to the originating trace_id
  3. Dashboard shows: PO Creation → (async) → Spend Classification
     as a connected workflow, even though they're separate traces
  4. Same pattern for: PO Creation → Risk Score Update → Alert Generation
```

---

## 4. Alerting

### 4.1 Alert Tiers

| Tier | Severity | Response Time | Channel | Examples |
|------|----------|---------------|---------|----------|
| **P1 - Critical** | System down or data integrity at risk | < 15 min | PagerDuty + Phone | PO creation service down, data corruption detected, security breach |
| **P2 - High** | SLO violation or significant degradation | < 1 hour | PagerDuty + Slack | API p95 > 2x SLO, ML accuracy dropped below threshold, approval workflow stuck |
| **P3 - Medium** | Performance concern or anomaly detected | < 4 hours | Slack | Cache hit rate declining, ERP sync backlog growing, document queue depth high |
| **P4 - Low** | Informational or preventive | Next business day | Email + Dashboard | Model retraining completed, certificate expiring in 30 days, storage utilization > 70% |

### 4.2 Alert Rules

```
Rule: PO Service Availability
  Condition: error_rate(po-engine, 5min) > 1%
  Severity: P1
  Action: Page on-call engineer
  Runbook: Check DB connectivity, verify ERP integration, check service health

Rule: ML Classification Accuracy Degradation
  Condition: classification_accuracy(7day_rolling) < 92%
  Severity: P2
  Action: Alert ML team via Slack
  Runbook: Check for data drift, review recent training data, compare against validation set

Rule: Supplier Risk Score Staleness
  Condition: p95(risk_score_age) > 60min for > 30min
  Severity: P2
  Action: Alert risk team
  Runbook: Check signal ingestion pipeline, verify feature store health, check scoring service

Rule: Budget Over-Commitment Detection
  Condition: committed_spend > budget * 1.0 for any cost_center
  Severity: P1
  Action: Alert finance team + block new POs
  Runbook: Investigate concurrent PO race condition, verify budget ledger integrity

Rule: Autonomous PO Volume Spike
  Condition: autonomous_po_count(1hour) > 3x baseline
  Severity: P3
  Action: Alert procurement team
  Runbook: Verify ML model behavior, check for unusual requisition patterns

Rule: Document Processing Backlog
  Condition: docint_queue_depth > 200 for > 30min
  Severity: P3
  Action: Alert platform team
  Runbook: Scale GPU workers, check for stuck jobs, verify document format compatibility

Rule: Cross-Tenant Query Detected
  Condition: query without tenant_id filter detected
  Severity: P1
  Action: Immediately block query + page security team
  Runbook: Investigate query origin, review recent code deployments, audit data access
```

### 4.3 Dashboards

| Dashboard | Audience | Key Widgets |
|-----------|----------|-------------|
| **System Health** | Platform engineering | Service availability heatmap, API latency percentiles, error rate trends, resource utilization gauges |
| **ML Operations** | ML engineering | Model accuracy over time, drift scores, inference latency, training pipeline status, feature freshness |
| **Procurement Operations** | Procurement managers | PO volume trends, cycle time distribution, autonomous PO rate, savings tracking, maverick spend % |
| **Risk Intelligence** | Risk managers | Supplier risk distribution, critical alerts, score change history, concentration risk map |
| **Security & Compliance** | Security team | Auth failure rate, suspicious activity timeline, policy violations, access anomalies |
| **Integration Health** | Integration team | ERP sync status, API call volumes, error rates by integration, data freshness per source |
| **Capacity Planning** | Infrastructure team | Storage growth trends, query volume projections, GPU utilization, cost per tenant |

---

## 5. Incident Response

### 5.1 Procurement-Specific Incident Playbooks

```
Playbook: Incorrect Autonomous PO Detected
  1. Immediately pause autonomous PO generation for affected category
  2. Identify scope: how many POs affected? What time window?
  3. Review ML model predictions for the affected POs
  4. If model error: rollback to previous model version
  5. If data error: correct source data, reclassify affected transactions
  6. Notify affected approvers and procurement managers
  7. Cancel or modify incorrect POs (with approval chain documentation)
  8. Post-incident: update model validation criteria, add test case

Playbook: Budget Over-Commitment
  1. Immediately freeze PO creation for affected cost center
  2. Identify root cause: concurrent POs, race condition, stale cache
  3. Reconcile: determine actual vs. committed budget
  4. If over-committed: identify lowest-priority POs for cancellation
  5. Notify budget owner and procurement manager
  6. Fix root cause (locking, cache invalidation)
  7. Resume PO creation after budget reconciliation confirms accuracy
```
