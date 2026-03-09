# Observability

## Observability Strategy

Billing system observability must serve two distinct audiences: **operations teams** who need real-time system health and **finance teams** who need billing accuracy and revenue metrics. The strategy is organized into four pillars: metrics, logging, tracing, and alerting.

---

## Key Metrics

### Business Metrics (Finance-Facing)

| Metric | Description | Aggregation | Dashboard |
|--------|-------------|-------------|-----------|
| **Monthly Recurring Revenue (MRR)** | Sum of active subscription monthly values | Per tenant; platform-wide | Revenue Dashboard |
| **Annual Recurring Revenue (ARR)** | MRR × 12 | Per tenant; platform-wide | Revenue Dashboard |
| **Net Revenue Retention (NRR)** | (Starting MRR + expansion - contraction - churn) / Starting MRR | Monthly per cohort | Revenue Dashboard |
| **Churn Rate** | Cancelled subscriptions / active subscriptions | Monthly; broken down by voluntary vs. involuntary | Churn Dashboard |
| **Involuntary Churn Rate** | Dunning-cancelled / active subscriptions | Monthly | Dunning Dashboard |
| **First-Attempt Payment Success Rate** | Successful first charges / total first charges | Hourly; by gateway; by payment method | Payments Dashboard |
| **Dunning Recovery Rate** | Recovered payments / total dunning entries | 30-day rolling; by decline code | Dunning Dashboard |
| **Average Revenue Per Account (ARPA)** | Total MRR / active customers | Monthly | Revenue Dashboard |
| **Credit Note Ratio** | Credit note value / invoice value | Monthly; per tenant | Financial Health |
| **Days Sales Outstanding (DSO)** | Average days between invoice date and payment date | 30-day rolling | Collections Dashboard |

### System Metrics (Operations-Facing)

| Metric | Description | Alert Threshold | Collection Method |
|--------|-------------|-----------------|-------------------|
| **Billing run progress** | Invoices generated / invoices expected | < 90% completion after 8 hours | Counter in billing workers |
| **Billing run duration** | Time from first invoice to last invoice | > 16 hours | Timer in billing clock |
| **Invoice generation rate** | Invoices generated per second | < 100/sec during billing run (expected: 140/sec) | Rate counter |
| **Invoice generation errors** | Failed invoice generations per minute | > 10/min | Error counter |
| **Payment processing latency (p50/p95/p99)** | Time from payment initiation to gateway response | p99 > 10 seconds | Histogram |
| **Payment queue depth** | Pending payment attempts in queue | > 50,000 | Queue size gauge |
| **Usage event ingestion rate** | Events accepted per second | Sustained < 50K/sec (expected: 100K+) | Rate counter |
| **Usage event ingestion lag** | Time between event timestamp and processing | > 5 minutes | Lag gauge |
| **Usage event deduplication rate** | Duplicate events / total events | > 5% (indicates client retry storm) | Ratio gauge |
| **Webhook delivery success rate** | Successful deliveries / total deliveries (first attempt) | < 95% | Rate counter |
| **Webhook delivery latency (p95)** | Time from event creation to delivery acknowledgment | > 30 seconds | Histogram |
| **Tax calculation latency (p99)** | Tax API call duration | > 2 seconds | Histogram |
| **PDF generation latency (p99)** | Time to render invoice PDF | > 10 seconds | Histogram |
| **Database connection pool utilization** | Active connections / pool size | > 85% | Gauge |
| **Cache hit rate** | Cache hits / (hits + misses) for pricing data | < 90% | Ratio gauge |

### Gateway-Specific Metrics

| Metric | Per Gateway | Alert Threshold |
|--------|------------|-----------------|
| **Success rate** | Yes | < 85% (investigate gateway issue) |
| **Latency p99** | Yes | > 15 seconds |
| **Timeout rate** | Yes | > 2% |
| **Decline rate by code** | Yes | Sudden spike in any decline code |
| **Volume (TPS)** | Yes | Approaching gateway rate limit |

---

## Logging Strategy

### Log Categories

| Category | Log Level | Retention | Purpose |
|----------|-----------|-----------|---------|
| **Financial operations** | INFO | 7 years | Invoice creation, payment attempts, credit notes---regulatory audit trail |
| **Billing run operations** | INFO | 90 days | Partition progress, worker assignments, completion status |
| **API requests** | INFO | 30 days | Request/response metadata (no sensitive data in logs) |
| **Payment gateway communication** | DEBUG | 30 days | Gateway request/response (PAN/token redacted) |
| **Usage event processing** | DEBUG | 7 days | Deduplication decisions, aggregation snapshots |
| **Security events** | WARN/ERROR | 1 year | Authentication failures, authorization violations, anomaly detections |
| **System errors** | ERROR | 90 days | Unhandled exceptions, timeout errors, circuit breaker trips |

### Structured Log Format

```
{
    "timestamp": "2025-03-01T00:15:23.456Z",
    "level": "INFO",
    "service": "invoice-engine",
    "trace_id": "abc123def456",
    "span_id": "span789",
    "tenant_id": "tenant_abc",
    "event": "invoice.finalized",
    "invoice_id": "inv_xyz",
    "subscription_id": "sub_123",
    "amount": 14999,
    "currency": "USD",
    "line_item_count": 3,
    "tax_amount": 1200,
    "billing_run_id": "run_2025-03-01",
    "partition_id": "p-42",
    "duration_ms": 245
}
```

### Sensitive Data Handling in Logs

| Data Type | Log Treatment |
|-----------|--------------|
| Card numbers | **Never logged**; system never receives raw PAN |
| Payment tokens | Logged as `tok_***last4` (masked) |
| Customer email | Logged only in security events; hashed in operational logs |
| Invoice amounts | Logged (financial audit requirement) |
| API keys | Logged as `sk_***last4` (masked) |
| Gateway API credentials | **Never logged** |

---

## Distributed Tracing

### Trace Propagation

Every billing operation carries a trace context through all services. Key trace spans:

```
Billing Run Trace (per subscription):
├── billing-clock.select-subscription           [1ms]
├── invoice-engine.generate-invoice             [200ms]
│   ├── subscription-service.fetch-subscription [15ms]
│   ├── metering-service.get-usage-aggregate    [25ms]
│   ├── pricing-engine.calculate-charges        [10ms]
│   ├── proration-engine.calculate-proration    [5ms]
│   ├── coupon-service.apply-discounts          [3ms]
│   ├── tax-service.calculate-tax               [80ms]  ← external API
│   ├── wallet-service.apply-credits            [5ms]
│   ├── invoice-engine.assemble-invoice         [10ms]
│   └── invoice-engine.persist-invoice          [30ms]
├── payment-orchestrator.collect-payment        [2500ms]
│   ├── gateway-router.select-gateway           [1ms]
│   ├── gateway.charge                          [2000ms] ← external API
│   └── payment-orchestrator.record-result      [15ms]
└── event-bus.publish-events                    [5ms]
```

### Critical Trace Points

| Trace Point | Why It Matters |
|-------------|---------------|
| **Invoice generation duration breakdown** | Identifies which sub-step is slow (tax API? usage fetch? DB write?) |
| **Payment gateway round-trip** | Measures external dependency latency; critical for timeout tuning |
| **Dunning retry chain** | Traces the full lifecycle of a failed payment through all retry attempts across gateways |
| **Webhook delivery chain** | Tracks event from internal publication through delivery to merchant endpoint |
| **Cross-service invoice flow** | From subscription fetch → invoice generation → payment → revenue recognition |

---

## Dashboards

### Dashboard 1: Billing Run Command Center

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| Billing run progress (% complete) | Progress bar with ETA | Billing worker counters |
| Invoices generated per minute (current vs. expected) | Time-series line chart | Invoice generation rate metric |
| Error rate during billing run | Time-series with threshold line | Error counter |
| Partition status (running / completed / failed) | Heat map | Partition state table |
| Worker utilization | Bar chart per worker | Worker metrics |
| Catch-up sweep status | Status indicator | Sweep job logs |

### Dashboard 2: Payment Health

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| Payment success rate (real-time, 5-min window) | Gauge with red/yellow/green zones | Payment metrics |
| Success rate by gateway | Stacked bar chart | Per-gateway metrics |
| Decline code distribution (last 24 hours) | Pie chart | Decline code counter |
| Payment latency percentiles | Histogram / heat map | Latency histogram |
| Gateway health status | Status indicators (healthy/degraded/down) | Circuit breaker state |
| Payment volume (TPS) by gateway | Stacked area chart | TPS counters |

### Dashboard 3: Dunning Effectiveness

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| Active dunning entries | Counter with trend | Dunning state table |
| Recovery rate (30-day rolling) | Line chart with target line (45%) | Recovery rate metric |
| Recovery rate by decline code | Grouped bar chart | Per-decline-code recovery |
| Average retries to recovery | Number with trend | Dunning retry analytics |
| Revenue at risk (in active dunning) | Currency amount with trend | Dunning entries × invoice amounts |
| Dunning → cancellation conversion | Funnel chart | Subscription cancellation events |

### Dashboard 4: Revenue & Financial Health

| Panel | Visualization | Data Source |
|-------|---------------|-------------|
| MRR / ARR (current + trend) | Line chart with growth rate | Revenue metrics |
| New MRR vs. churned MRR | Waterfall chart | Subscription events |
| Invoice volume (generated vs. paid vs. overdue) | Stacked bar chart | Invoice status counters |
| Days Sales Outstanding (DSO) | Line chart with benchmark | Payment date analytics |
| Credit note ratio | Line chart with threshold (< 2% target) | Credit note metrics |
| Revenue recognition completeness | Progress bar (% of invoices with rev-rec entries) | Rev-rec pipeline metrics |

---

## Alerting Rules

### Critical Alerts (Page Immediately)

| Alert | Condition | Notification Channel |
|-------|-----------|---------------------|
| **Billing run stalled** | No new invoices generated for > 30 minutes during active billing run | PagerDuty + Slack |
| **Payment processing down** | Payment success rate < 50% for > 5 minutes | PagerDuty + Slack |
| **All gateways unhealthy** | All configured payment gateways have open circuit breakers | PagerDuty + Slack + Email to gateway contacts |
| **Database replication lag** | Replication lag > 30 seconds on financial data replicas | PagerDuty |
| **Double invoice detected** | Duplicate (subscription_id, period) found in reconciliation | PagerDuty + Finance alert |
| **Usage ingestion stopped** | Zero events processed for > 5 minutes during business hours | PagerDuty |

### High-Priority Alerts (Respond Within 1 Hour)

| Alert | Condition | Notification Channel |
|-------|-----------|---------------------|
| **Payment success rate degraded** | Success rate < 85% for > 15 minutes | Slack + Email |
| **Gateway latency spike** | Any gateway p99 > 15 seconds for > 10 minutes | Slack |
| **Billing run behind schedule** | < 50% complete after 8 hours | Slack + Email |
| **Tax service unavailable** | Tax API returning errors for > 10 minutes | Slack |
| **Webhook delivery backlog** | Undelivered webhooks > 100K | Slack |
| **Dunning recovery rate drop** | Recovery rate < 30% (rolling 7-day) | Slack + Email to finance |

### Warning Alerts (Review Next Business Day)

| Alert | Condition | Notification Channel |
|-------|-----------|---------------------|
| **Credit note ratio high** | > 3% of invoice value issued as credit notes (30-day) | Email to finance |
| **Usage dedup rate elevated** | > 3% duplicate events (suggests client issues) | Slack |
| **Cache hit rate low** | Pricing cache hit rate < 85% | Slack (engineering) |
| **PDF generation slow** | p99 > 10 seconds | Slack (engineering) |
| **API error rate elevated** | > 1% of API requests returning 5xx | Slack (engineering) |

---

## SLI / SLO Monitoring

| SLI | Measurement | SLO Target | Error Budget (30-day) | Dashboard |
|-----|-------------|------------|----------------------|-----------|
| Invoice generation completeness | Invoices generated / invoices due | 100% | 0 (zero tolerance) | Billing Run |
| Payment API availability | Successful responses / total requests | 99.99% | 4.3 minutes | Payment Health |
| Usage ingestion availability | Events accepted / events received | 99.95% | 21.6 minutes | Metering |
| Payment collection success (first attempt) | Successful charges / total charges | > 92% | Monitored, not budgeted | Payment Health |
| Invoice accuracy | Invoices without corrections / total invoices | > 99.9% | 0.1% may require credit notes | Financial Health |
| Webhook delivery (first attempt) | Successful deliveries / total deliveries | 99.9% | 43.2 minutes | Webhook |
| API latency (p99) | 99th percentile response time | < 500ms | 1% of requests may exceed | API Health |

---

## Reconciliation Reports

### Daily Reconciliation

| Report | Purpose | Automated Check |
|--------|---------|----------------|
| **Invoice-Payment reconciliation** | Every paid invoice has exactly one successful payment totaling the invoice amount | `SUM(payments) == invoice.amount_paid` for every paid invoice |
| **Billing completeness** | Every active subscription due today has a generated invoice | `COUNT(unbilled_due_subscriptions) == 0` |
| **Usage-Invoice reconciliation** | Usage aggregates match invoice line items for usage-based charges | `usage_aggregate.total == SUM(usage_line_items)` per subscription |
| **Credit note balance** | No invoice has credit notes exceeding its original amount | `SUM(credit_notes) <= invoice.total` for every invoice |
| **Gateway settlement** | Recorded payments match gateway settlement reports | `platform_payments == gateway_settlement` (within tolerance) |

### Monthly Reconciliation

| Report | Purpose |
|--------|---------|
| **Revenue recognition completeness** | Every finalized invoice has a corresponding rev-rec schedule |
| **MRR reconciliation** | Computed MRR matches sum of active subscription values |
| **Tax filing reconciliation** | Tax amounts on invoices match tax authority filing totals |
| **Currency conversion audit** | Exchange rates used on invoices match treasury rate feed within tolerance |
