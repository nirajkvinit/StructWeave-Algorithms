# 14.10 AI-Native Trade Finance & Invoice Factoring Platform — Observability

## Key Metrics

### Business Metrics (Executive Dashboard)

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| Daily Transaction Volume (DTV) | Total value of invoices funded per day | ₹15,000 crore | < ₹8,000 crore (weekday) |
| Deal Conversion Rate | Percentage of uploaded invoices that get funded | 60% | < 45% |
| Average Discount Rate | Platform-wide weighted average annualized discount rate | 10–14% | Deviation > 200 bps from previous week |
| Default Rate (30 DPD) | Percentage of deals overdue by 30+ days | < 1.5% | > 2.0% |
| NPA Rate (90 DPD) | Percentage of deals classified as NPA | < 0.5% | > 0.8% |
| Financier Utilization | Percentage of available financier capital deployed | 60–80% | < 40% (capital idle) or > 90% (capacity crunch) |
| MSME Retention (30-day) | Percentage of MSMEs who upload invoices in consecutive 30-day periods | 75% | < 60% |
| Time to Disbursement (p50) | Median time from invoice upload to fund disbursement | 4 hours | > 8 hours |

### System Performance Metrics

| Metric | Description | SLO | Alert Threshold |
|---|---|---|---|
| Invoice Processing Latency (p95) | Time from upload to fully verified status | 30 seconds | > 60 seconds |
| OCR Extraction Accuracy | Percentage of fields correctly extracted | 96% | < 93% |
| Credit Score Computation (p95) | Latency for single buyer score computation | 200 ms | > 500 ms |
| Pricing Computation (p95) | Latency for single invoice pricing | 500 ms | > 1 second |
| Financier Matching (p95) | Latency from priced invoice to matched financiers | 2 seconds | > 5 seconds |
| Settlement Saga Completion (p95) | Time from deal acceptance to disbursement confirmation | 4 hours | > 8 hours |
| GSTN API Latency (p95) | Response time for GST cross-verification | 5 seconds | > 15 seconds |
| API Gateway Response (p99) | Overall API response time for read operations | 300 ms | > 500 ms |
| API Gateway Error Rate | Percentage of 5xx responses | < 0.1% | > 0.5% |
| Queue Depth (Invoice Pipeline) | Number of unprocessed invoices in queue | < 500 | > 2,000 |

### Risk & Compliance Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| Fraud Detection Rate | Percentage of known fraud caught by automated systems | > 98% | < 95% |
| False Positive Rate (Fraud) | Percentage of legitimate invoices flagged as fraud | < 2% | > 4% |
| CRAR (Capital Adequacy) | Real-time Capital to Risk-weighted Assets Ratio | > 18% | < 16% (regulatory minimum 15%) |
| Concentration Risk | Maximum single-buyer exposure as % of total portfolio | < 10% | > 12% |
| KYC Completion Rate | Percentage of onboarding applications completed successfully | 85% | < 70% |
| STR Filing Timeliness | Percentage of suspicious transactions reported within SLA | 100% | < 100% (regulatory non-compliance) |
| GST Verification Success Rate | Percentage of invoices passing GST cross-verification | 92% | < 85% |

### Infrastructure Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| GPU Utilization (OCR/Credit Models) | GPU compute utilization for ML inference | 60–80% | > 90% (scaling needed) or < 30% (over-provisioned) |
| Database IOPS (Ledger) | Input/output operations per second on ledger DB | < 80% of provisioned | > 85% |
| Object Storage Usage | Total storage consumed by invoice documents | Monitor growth | Growth rate > 3 TB/day (above capacity plan) |
| Settlement Partition Lag | How far behind each settlement partition is from latest event | < 100 events | > 1,000 events |
| Cache Hit Rate (Credit Scores) | Percentage of credit score requests served from cache | > 90% | < 80% |
| Event Store Write Latency (p99) | Latency for persisting audit events | < 10 ms | > 50 ms |

---

## Logging Strategy

### Log Levels and Content

| Level | When | Content | Retention |
|---|---|---|---|
| **ERROR** | Operation failure: bank API timeout, settlement saga step failure, model inference error | Full error context: request ID, affected entities (invoice/deal IDs), error code, stack trace (non-PII), retry count | 1 year |
| **WARN** | Degraded operation: GSTN API slow, cache miss rate high, queue depth approaching threshold | Degradation context: metric values, threshold crossed, affected component | 6 months |
| **INFO** | Business events: invoice uploaded, deal created, settlement completed, credit score updated | Event type, entity IDs, key metadata (amount, rate, status change), actor, timestamp | 90 days (except audit-grade events: 10 years) |
| **DEBUG** | Detailed processing: OCR field-level extraction, pricing factor breakdown, fraud score components | All processing details; model inputs/outputs; intermediate states | 7 days |

### Structured Log Format

```
{
    "timestamp": "2026-03-10T14:23:45.123456Z",
    "level": "INFO",
    "service": "pricing-engine",
    "instance_id": "pricing-engine-7b4f2d",
    "trace_id": "abc123def456",
    "span_id": "span-789",
    "correlation_id": "upload-batch-2024-0310-001",
    "event": "INVOICE_PRICED",
    "entity_type": "INVOICE",
    "entity_id": "inv-uuid-123",
    "data": {
        "buyer_id": "buyer-uuid-456",
        "buyer_rating": "AA",
        "annualized_rate_bps": 1000,
        "discount_amount": 8219.18,
        "pricing_factors": {
            "base_rate": 650,
            "credit_premium": 100,
            "tenor_adj": 0,
            "liquidity_adj": -30,
            "concentration_premium": 0,
            "seasonal_adj": 25
        },
        "model_version": "credit-v3.2.1"
    },
    "duration_ms": 142
}
```

### PII Handling in Logs

| Field | Treatment |
|---|---|
| GSTIN | Last 5 digits visible; prefix masked (e.g., `XXXXXXXXXXV5Z8`) |
| PAN | Fully masked in logs; only entity UUID used for correlation |
| Bank account | Never logged; tokenized reference only |
| Invoice amounts | Logged (not PII, but access-controlled) |
| User names | First name + last initial only in logs |
| IP addresses | Logged for security events; hashed for general events |

---

## Distributed Tracing

### Trace Architecture

Each invoice processing request generates a trace that spans multiple services:

```
Trace: Invoice Upload to Disbursement (end-to-end)
│
├── Span: API Gateway (authentication, rate limiting)
│   └── Duration: 15ms
│
├── Span: OCR Engine (document understanding)
│   ├── Span: Document classification (invoice vs. PO vs. credit note)
│   │   └── Duration: 200ms
│   └── Span: Field extraction (ML inference)
│       └── Duration: 3.5s
│
├── Span: GST Verifier (cross-reference with GSTN)
│   ├── Span: GSTN API call (external)
│   │   └── Duration: 2.8s (includes retry)
│   └── Span: Field comparison and validation
│       └── Duration: 50ms
│
├── Span: Fraud Detector
│   ├── Span: Duplicate check (hash lookup)
│   │   └── Duration: 5ms
│   ├── Span: Behavioral analysis
│   │   └── Duration: 150ms
│   └── Span: Graph analysis (circular trading check)
│       └── Duration: 800ms
│
├── Span: Credit Scorer
│   ├── Span: Feature assembly (cache + database)
│   │   └── Duration: 30ms
│   └── Span: Model inference
│       └── Duration: 120ms
│
├── Span: Pricing Engine
│   └── Duration: 80ms
│
├── Span: Financier Matcher
│   └── Duration: 200ms
│
├── Span: Deal Creation
│   └── Duration: 50ms
│
└── Span: Settlement Saga
    ├── Span: Reserve financier limit
    │   └── Duration: 30ms
    ├── Span: Create escrow allocation
    │   └── Duration: 50ms
    ├── Span: Record lien
    │   └── Duration: 20ms
    ├── Span: Bank transfer initiation
    │   └── Duration: 2.1s (external bank API)
    ├── Span: Transfer confirmation (async wait)
    │   └── Duration: 12 minutes (NEFT settlement cycle)
    └── Span: Ledger recording
        └── Duration: 15ms
```

### Cross-Service Correlation

- **Trace ID**: Propagated via HTTP header `X-Trace-ID` across all service calls
- **Correlation ID**: Business-level identifier (e.g., invoice upload batch ID) that groups related traces
- **Causation chain**: Each event in the audit log references the trace ID that caused it → enables navigating from a business event to its full system trace

---

## Alerting Strategy

### Alert Tiers

| Tier | Severity | Response Time | Notification Channel | Example |
|---|---|---|---|---|
| **P0 — Critical** | Data loss risk, financial loss, regulatory violation | 5 minutes | PagerDuty (on-call engineer) + SMS + phone call | Settlement engine down; ledger inconsistency detected; CRAR below regulatory minimum |
| **P1 — High** | Service degradation, SLO breach, fraud spike | 30 minutes | PagerDuty + Slack #incidents | Invoice pipeline latency > 60s; fraud detection false positive rate > 5%; GSTN API outage |
| **P2 — Medium** | Non-critical degradation, approaching thresholds | 4 hours | Slack #alerts | Cache hit rate dropping; queue depth growing; single financier API failure |
| **P3 — Low** | Informational, optimization opportunity | Next business day | Slack #monitoring | Credit model accuracy drift; storage growth exceeding forecast; unused API endpoints |

### Key Alert Rules

```
ALERT: SettlementSagaFailure
  CONDITION: settlement_saga_status == "COMPENSATION_FAILED"
  SEVERITY: P0
  ACTION: Page on-call; halt new settlements to same buyer; investigate

ALERT: LedgerImbalance
  CONDITION: SUM(debits) != SUM(credits) for any transaction_id
  SEVERITY: P0
  ACTION: Page on-call; halt affected settlement partition; audit

ALERT: CapitalAdequacyBreach
  CONDITION: crar_ratio < 0.16
  SEVERITY: P0
  ACTION: Page on-call + compliance team; halt new deal creation if < 0.155

ALERT: FraudDetectionGap
  CONDITION: fraud_detection_service_availability < 0.999 for 5 minutes
  SEVERITY: P1
  ACTION: Hold all new invoice processing in queue until restored

ALERT: DefaultRateSpike
  CONDITION: rolling_30d_default_rate > 0.02
  SEVERITY: P1
  ACTION: Alert risk team; trigger portfolio-wide credit score refresh

ALERT: InvoicePipelineBacklog
  CONDITION: queue_depth > 5000 AND queue_depth_trend == "increasing" for 10 minutes
  SEVERITY: P2
  ACTION: Trigger auto-scaling; alert platform ops

ALERT: GSTNApiDegradation
  CONDITION: gstn_api_p95_latency > 15s OR gstn_api_error_rate > 10%
  SEVERITY: P2
  ACTION: Switch to degraded mode (process without GST verification); alert ops

ALERT: CreditModelDrift
  CONDITION: credit_model_auc < 0.82 (production monitoring)
  SEVERITY: P3
  ACTION: Alert data science team; schedule model retrain
```

### Alert Fatigue Prevention

- **Deduplication**: Same alert fires at most once per 15-minute window per entity
- **Grouping**: Related alerts (e.g., GSTN slow + GST verification backlog) grouped into a single incident
- **Auto-resolution**: Alerts auto-close when the condition is no longer true for 10 minutes
- **Snooze during maintenance**: Scheduled maintenance windows suppress non-critical alerts
- **Escalation only on persistence**: P2 alerts escalate to P1 only if unresolved for 2 hours

---

## Dashboards

### Dashboard 1: Platform Operations

| Panel | Visualization | Data Source |
|---|---|---|
| Invoice Processing Funnel | Funnel chart: Uploaded → OCR'd → GST Verified → Priced → Matched → Funded | Event log aggregation |
| Real-time Queue Depths | Line chart (per pipeline stage) | Message queue metrics |
| Settlement Status | Pie chart: Completed / In Progress / Failed / Pending | Settlement engine state |
| GSTN API Health | Status indicator + latency sparkline | External API monitoring |
| Banking API Health | Per-bank status indicators | Payment service health checks |

### Dashboard 2: Risk & Portfolio

| Panel | Visualization | Data Source |
|---|---|---|
| Portfolio Exposure Heatmap | Heatmap: buyer × industry exposure | Portfolio analytics |
| DPD Distribution | Histogram: 0, 1-30, 31-60, 61-90, 90+ days past due | Settlement tracking |
| Default Rate Trend | Line chart: 30-day rolling default rate vs. target | Settlement events |
| Fraud Detection | Time series: alerts raised, confirmed fraud, false positives | Fraud engine logs |
| Concentration Risk | Bar chart: top 10 buyer exposures as % of portfolio | Portfolio analytics |
| CRAR Gauge | Gauge showing current CRAR vs. regulatory minimum | Real-time calculation |

### Dashboard 3: MSME & Financier Experience

| Panel | Visualization | Data Source |
|---|---|---|
| Time to Disbursement | Percentile chart (p50, p90, p99) | Deal lifecycle events |
| Pricing Trends | Line chart: average rate by buyer rating tier over time | Pricing engine logs |
| Financier Bid Activity | Bar chart: bids placed, accepted, rejected per financier | Auction engine |
| MSME Onboarding Funnel | Funnel: Registered → KYC Started → KYC Approved → First Invoice | Onboarding events |
| API Latency by Endpoint | Percentile table: p50, p95, p99 per endpoint | API gateway metrics |
