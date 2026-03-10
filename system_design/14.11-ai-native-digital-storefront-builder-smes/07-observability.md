# 14.11 AI-Native Digital Storefront Builder for SMEs — Observability

## Metrics

### Business Metrics (Golden Signals for Stakeholders)

| Metric | Description | Collection | Alert Threshold |
|---|---|---|---|
| **Stores created/hour** | Rate of new store completions | Counter from store builder service | < 50% of rolling 7-day average for same hour |
| **GMV (hourly)** | Gross merchandise value processed | Aggregated from order service | < 60% of rolling 7-day average |
| **Conversion rate** | Storefront visitors → completed orders | Computed from analytics events | Drop > 20% in 1-hour window |
| **Payment success rate** | Successful payments / attempted payments | Counter from payment service | < 94% over 15-minute window |
| **Channel sync health** | % of product updates synced within SLO | Computed from sync completion events | < 90% synced within 5 minutes |
| **Store creation to first order** | Time from store publish to first customer order | Event correlation | Informational; trend tracking only |

### Infrastructure Metrics (RED Method)

**Rate — Requests per second:**

| Service | Metric | Dashboard |
|---|---|---|
| Storefront CDN | Requests/sec by edge location | CDN provider dashboard |
| API Gateway | Requests/sec by endpoint | Gateway metrics |
| Product Manager | CRUD operations/sec | Service metrics |
| Order Manager | Orders/sec by channel | Service metrics |
| Inventory Manager | Reservation operations/sec | Service metrics |
| Content Generator | Inference requests/sec | GPU cluster metrics |

**Errors — Error rate by type:**

| Error Category | Metric | Alert |
|---|---|---|
| 5xx errors (API) | Rate by service and endpoint | > 1% of requests in 5-min window |
| Payment failures | Rate by gateway and method | > 6% failure rate in 15-min window |
| Channel sync failures | Rate by channel | > 5% failure rate in 30-min window |
| Content generation failures | Rate by failure reason | > 10% failure rate in 1-hour window |
| Database errors | Connection failures + query timeouts | Any sustained (> 1 min) error rate |

**Duration — Latency distributions:**

| Operation | p50 target | p95 target | p99 target | Alert |
|---|---|---|---|---|
| Storefront TTFB | 50 ms | 200 ms | 500 ms | p95 > 300 ms for 5 min |
| API response | 30 ms | 150 ms | 500 ms | p95 > 200 ms for 5 min |
| Product description generation | 3 s | 8 s | 15 s | p95 > 12 s for 15 min |
| Inventory reservation | 5 ms | 20 ms | 50 ms | p95 > 30 ms for 5 min |
| Payment initiation | 500 ms | 3 s | 5 s | p95 > 4 s for 5 min |
| Multi-channel sync (inventory) | 5 s | 30 s | 60 s | p95 > 45 s for 15 min |

### AI-Specific Metrics

| Metric | Description | Target | Alert |
|---|---|---|---|
| **Description quality score** | Average quality score of AI-generated descriptions | > 0.85 | < 0.80 over 100 descriptions |
| **Description acceptance rate** | % of AI descriptions accepted by merchants without edit | > 70% | < 60% rolling 7-day |
| **Theme match satisfaction** | % of merchants keeping AI-selected theme | > 80% | < 70% rolling 7-day |
| **Pricing recommendation acceptance** | % of price suggestions accepted by merchants | > 40% | < 25% rolling 7-day |
| **Content regeneration rate** | % of descriptions manually requested for regeneration | < 15% | > 25% rolling 7-day |
| **GPU utilization** | GPU compute utilization across inference pools | 60-80% | > 90% sustained 15 min or < 30% sustained 1 hour |
| **Inference latency** | LLM inference time per request | p95 < 5 s | p95 > 8 s for 15 min |

---

## Logging

### Log Levels and Retention

| Level | Use Case | Examples | Retention |
|---|---|---|---|
| **ERROR** | Failures requiring attention | Payment processing failure, database connection error, channel API 5xx | 90 days |
| **WARN** | Degraded behavior | Channel sync retry, content quality below threshold, rate limit approaching | 30 days |
| **INFO** | Significant business events | Store created, order placed, payment settled, channel connected | 30 days |
| **DEBUG** | Troubleshooting detail | API request/response bodies (sanitized), query execution plans, cache hit/miss | 7 days |

### Structured Log Format

```
{
  "timestamp": "2026-03-10T14:30:00.123Z",
  "level": "INFO",
  "service": "product-manager",
  "instance": "pm-prod-07",
  "trace_id": "abc123def456",
  "span_id": "span_789",
  "tenant_id": "st_merchant_42",      // always present for tenant-scoped operations
  "event": "product.updated",
  "details": {
    "product_id": "prod_xyz",
    "updated_fields": ["price", "inventory"],
    "sync_triggered": true,
    "channels": ["website", "whatsapp", "instagram"]
  },
  "duration_ms": 45,
  "user_id": "usr_abc",
  "ip": "203.0.113.42"
}
```

### Log Sanitization Rules

- **Payment data:** Card numbers, CVVs, bank account numbers → replaced with `[REDACTED]`
- **Authentication tokens:** JWT tokens, API keys, OTPs → replaced with `[TOKEN]` or `[OTP]`
- **Customer PII:** Email addresses → `u***@domain.com`; phone numbers → `***XXX1234`
- **Merchant credentials:** Channel API keys, gateway secrets → `[SECRET]`

### Key Log Queries (Common Troubleshooting)

| Scenario | Query Pattern |
|---|---|
| Why did a channel sync fail? | `service=channel-sync AND tenant_id=X AND level=ERROR AND event=sync.failed` |
| Why was a payment declined? | `service=payment AND trace_id=X AND event=payment.*` |
| What happened during store creation? | `trace_id=X AND event=store.creation.*` ORDER BY timestamp |
| Why is a storefront slow? | `service=web-renderer AND tenant_id=X AND duration_ms>1000` |
| AI content quality issues? | `service=content-generator AND details.quality_score<0.80` |

---

## Distributed Tracing

### Trace Propagation

Traces propagate across all service boundaries via W3C Trace Context headers. Key trace paths:

**Trace 1: Store Creation (end-to-end)**
```
[Store Builder] → [Visual Analyzer (GPU)] → [Theme Intelligence]
                → [Content Generator (GPU)] × N products (parallel spans)
                → [Product Manager] → [Search Index] → [Web Renderer] → [CDN Publish]
Total spans: 10-50 depending on product count
Expected duration: 60-180 seconds
```

**Trace 2: Product Update → Multi-Channel Sync**
```
[API Gateway] → [Product Manager] → [Event Bus]
  → [Web Adapter] → [CDN Invalidation]
  → [WhatsApp Adapter] → [WhatsApp Business API]
  → [Instagram Adapter] → [Instagram Graph API]
  → [Marketplace Adapter] → [Marketplace API]
Total spans: 8-15 depending on connected channels
Expected duration: 5-300 seconds (varies by channel API latency)
```

**Trace 3: Customer Checkout → Payment → Order**
```
[Storefront] → [Cart Service] → [Inventory Manager (reserve)]
  → [Payment Service] → [Gateway Router] → [Payment Gateway]
  → [Order Manager] → [Notification Service (WhatsApp/SMS)]
  → [Inventory Manager (confirm)] → [Channel Sync (inventory update)]
Total spans: 10-15
Expected duration: 3-30 seconds (payment flow dominates)
```

### Sampling Strategy

| Trace Type | Sampling Rate | Rationale |
|---|---|---|
| Storefront page views | 1% | High volume; CDN serves most requests |
| API requests (merchant dashboard) | 10% | Moderate volume; useful for latency analysis |
| Store creation | 100% | Low volume; every creation is significant |
| Payment transactions | 100% | Every payment matters; full auditability |
| Channel sync operations | 10% | High volume; sample for performance analysis |
| Errored requests | 100% | Always trace errors for debugging |

---

## Alerting

### Alert Tiers

| Tier | Severity | Response Time | Notification Channel | Example |
|---|---|---|---|---|
| **P0 — Critical** | Service outage or data loss | 5 minutes | Phone call + SMS + chat | Storefront serving down; payment processing failure > 50% |
| **P1 — High** | Degraded service | 15 minutes | SMS + chat | p95 latency 2× SLO; single gateway failure; channel sync > 1 hour behind |
| **P2 — Medium** | Potential issue | 1 hour | Chat + email | Content quality score declining; single database replica lag > 30s |
| **P3 — Low** | Informational | Next business day | Email + dashboard | GPU utilization consistently low; cache hit ratio declining |

### Key Alert Definitions

```
ALERT: StorefrontAvailability
  CONDITION: success_rate(storefront_requests) < 99.99% over 5 minutes
  SEVERITY: P0
  RUNBOOK: Check CDN health → origin health → database connectivity
  AUTO-ACTION: Page on-call engineer; increase CDN TTL to serve stale content

ALERT: PaymentSuccessRate
  CONDITION: success_rate(payment_attempts) < 94% over 15 minutes
  SEVERITY: P0
  RUNBOOK: Check gateway health scores → identify failing gateway → verify failover routing
  AUTO-ACTION: Mark degraded gateway; route traffic to backup; notify merchants

ALERT: ChannelSyncLag
  CONDITION: max(sync_lag_seconds) > 1800 for any channel over 30 minutes
  SEVERITY: P1
  RUNBOOK: Check channel API status → adapter health → event queue depth
  AUTO-ACTION: Increase channel safety buffer; page on-call if inventory sync affected

ALERT: ContentQualityDegradation
  CONDITION: avg(description_quality_score) < 0.80 over 100 descriptions
  SEVERITY: P2
  RUNBOOK: Check GPU health → model version → input data quality
  AUTO-ACTION: Switch to backup model; queue affected descriptions for regeneration

ALERT: InventoryReservationContention
  CONDITION: reservation_failure_rate > 5% over 10 minutes
  SEVERITY: P1
  RUNBOOK: Check inventory DB load → lock contention → hot product identification
  AUTO-ACTION: Enable queued reservation mode for hot products

ALERT: DatabaseReplicaLag
  CONDITION: replica_lag_seconds > 30 for any replica over 5 minutes
  SEVERITY: P2
  RUNBOOK: Check replication health → write throughput → network bandwidth
  AUTO-ACTION: Remove lagging replica from read pool; alert DBA team
```

### SLO Burn Rate Alerts

Using multi-window burn rate for SLO-based alerting:

| SLO | Error Budget (monthly) | Fast Burn (1h window) | Slow Burn (6h window) |
|---|---|---|---|
| Storefront availability 99.99% | 4.3 minutes | > 14.4× burn rate → P0 | > 3× burn rate → P1 |
| Payment success 99.99% | 4.3 minutes | > 14.4× burn rate → P0 | > 3× burn rate → P1 |
| API latency p95 < 150ms | 5% of requests | > 14.4× burn rate → P1 | > 3× burn rate → P2 |

---

## Dashboards

### Dashboard 1: Business Health (Executive View)

- Active stores (total + trend)
- GMV (hourly, daily, monthly) with YoY comparison
- New store creation rate with conversion (created → published → first order)
- Payment success rate by method
- Top 10 stores by GMV
- Channel distribution (% of orders by channel)

### Dashboard 2: Platform Reliability (SRE View)

- SLO status for all tracked SLOs (traffic light indicators)
- Error budget remaining by SLO (burn-down chart)
- Service latency heatmap (services × time)
- Event queue depths by channel
- Database shard health (connections, query latency, replication lag)
- CDN cache hit ratio by edge location

### Dashboard 3: AI Pipeline Health (ML Ops View)

- Content generation throughput (requests/min by pool)
- GPU utilization by pool (sync vs. async vs. image)
- Description quality score distribution (histogram)
- Merchant acceptance rate trend
- Pricing recommendation acceptance trend
- Model inference latency by model version
- Queue depth and wait time for each AI pipeline stage

### Dashboard 4: Multi-Channel Sync (Integration View)

- Sync lag by channel (time series)
- Sync success/failure rate by channel
- API rate limit utilization by channel (% of limit consumed)
- Drift detection results (mismatches found per scan)
- Products pending sync by channel
- Channel API response time trends
