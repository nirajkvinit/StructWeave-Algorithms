# 12.18 Marketplace Platform — Observability

## Business Metrics (North Star Signals)

Marketplace observability starts with business health metrics, not just infrastructure metrics. An engineer must understand which technical signals map to which business outcomes.

| Business Metric | Definition | Technical Signal | Alert Threshold |
|---|---|---|---|
| **GMV** | Gross merchandise value transacted per hour | Order Service: sum of order_total on completed orders | < 80% of same hour last week |
| **Checkout conversion rate** | Completed checkouts / checkout sessions initiated | Order Service: complete_count / reserve_count | < 2σ below 7-day rolling avg |
| **Search conversion rate** | Orders initiated from search results / search queries | Search Service click-to-checkout events | < 2σ below 7-day rolling avg |
| **Take rate health** | Actual platform fee collected vs. expected | Payment Service: fee_collected / GMV | Deviation > 0.5% from target |
| **Dispute rate** | Disputes opened / orders delivered (30-day rolling) | Dispute Service: dispute_open_count / delivered_count | > 3% (platform health signal) |
| **Payout on-time rate** | Payouts within SLA / total payouts due | Payment Service: disbursed_on_time / disbursed_total | < 99.9% |
| **Fraud removal rate** | Fraudulent listings removed within 60 min / total fraud detected | Trust Service: (removed_before_60min / total_flagged) | < 95% |

---

## Service-Level Metrics

### Search Service

```
Metrics emitted per query:
  search.latency_ms{stage=recall|rerank|filter|personalize}  (histogram)
  search.result_count{query_type=keyword|browse|semantic}     (gauge)
  search.cache_hit_ratio                                      (gauge)
  search.index_shard_availability{shard_id}                   (gauge: 0 or 1)
  search.zero_result_queries_rate                             (counter ratio)
  search.degraded_mode{reason=reranker_timeout|personalization_down} (counter)

Key dashboards:
  - Search p99 latency by stage (breakdown identifies bottleneck stage)
  - Zero-result query rate (high rate → query understanding issue or inventory gap)
  - Index freshness: time-since-last-update per shard (alert on shard > 60s stale)
  - Cache hit ratio (drop indicates traffic pattern shift or cache invalidation storm)
```

### Order Service

```
Metrics:
  order.reservation_rate{result=success|conflict|unavailable}  (counter)
  order.checkout_duration_ms                                    (histogram)
  order.payment_authorization_rate{result=approved|declined|error} (counter)
  order.saga_compensation_count{step=reserve|authorize|capture} (counter: saga rollbacks)
  order.idempotency_replay_count                               (counter: duplicate requests)

Alerts:
  - Saga compensation rate > 0.5% of orders (indicates upstream system degradation)
  - Payment authorization error rate > 0.2% (excludes card declines)
  - Checkout p99 > 5 seconds (SLO: 3 seconds)
```

### Payment Service

```
Metrics:
  payment.escrow_balance_total_cents                          (gauge: total funds in escrow)
  payment.escrow_hold_count{hold_reason}                      (gauge)
  payment.disbursement_batch_size                             (histogram)
  payment.disbursement_failure_count{reason}                  (counter)
  payment.processor_error_rate{processor=primary|secondary}   (gauge)
  payment.reconciliation_discrepancy_cents                    (gauge: should be 0)

Critical alerts:
  - reconciliation_discrepancy_cents > 0 (immediate PagerDuty; financial integrity issue)
  - processor_error_rate > 1% for 2 consecutive minutes (trigger secondary failover)
  - escrow_balance_total drops unexpectedly (could indicate unauthorized disbursements)
```

### Trust & Safety

```
Metrics:
  trust.listing_fraud_score_distribution{bucket}             (histogram)
  trust.listings_flagged_for_review_rate                     (counter ratio)
  trust.listings_removed_within_60min_rate                   (counter ratio)
  trust.review_fraud_suppression_rate                        (counter ratio)
  trust.seller_quality_score_distribution{tier}              (histogram)
  trust.human_review_queue_depth{category}                   (gauge)
  trust.human_review_sla_breach_rate                         (counter ratio)
  trust.account_takeover_detections_per_hour                 (counter)
```

---

## Distributed Tracing

Every marketplace request is instrumented with distributed traces to enable cross-service latency attribution:

```
Trace: checkout request
  Root span: API Gateway (total: 2,400ms)
    └─ ListingService.checkAvailability (50ms)
    └─ OrderService.createReservation (30ms)
        └─ DB write: listings (10ms)
        └─ Cache write: reservation (5ms)
    └─ PaymentService.authorize (800ms)  ← external processor call
        └─ TokenVault.lookup (15ms)
        └─ ExternalProcessor.authorize (760ms)  ← external latency
    └─ OrderService.commitOrder (100ms)
        └─ DB write: orders (20ms)
        └─ DB write: escrow (25ms)
        └─ EventBus.publish (55ms)
    └─ NotificationService.sendConfirmation (async, not in critical path)
```

**Trace sampling:** 100% sampling for error traces; 10% sampling for successful traces; 100% sampling for fraud-flagged transactions (forensic value).

---

## Search Quality Metrics

Search quality requires business-aware metrics beyond infrastructure latency:

| Metric | Definition | Collection Method |
|---|---|---|
| **NDCG@10** | Normalized discounted cumulative gain at position 10 | Offline evaluation on human-labeled relevance judgments |
| **Click-through rate by position** | CTR at rank 1 vs. rank 10 vs. rank 48 | Click event stream joined with search results |
| **Purchase conversion by result rank** | Orders completed / search sessions reaching checkout, grouped by first result clicked rank | Join purchase events with search impression events |
| **Zero-result rate** | Queries returning 0 results / total queries | Search Service metric |
| **Reformulation rate** | Queries from same session within 60 seconds (buyer didn't find what they wanted) | Session analytics pipeline |
| **Promoted listing CTR vs. organic** | Click-through rate on promoted listings vs. equivalent organic results | A/B measurement; ensures promoted listings maintain relevance threshold |

---

## Seller Quality Score Observability

Seller quality score is a critical computed signal that drives multiple downstream systems. Its health must be continuously monitored:

```
Monitoring dimensions:
  Score distribution: histogram of all seller quality scores
    - Alert if distribution shifts materially (> 5% change in mean within 24 hours)
    - Shift indicates a data quality issue or a bug in score computation

  Propagation latency: time from qualifying event to score update in cache
    - P99 should be < 10 minutes
    - Alert if P95 exceeds 30 minutes

  Score version freshness: age of cached score per seller
    - Alert if > 1% of sellers have score older than 1 hour (computation pipeline issue)

  Score-to-tier distribution: sellers per trust tier
    - Monitor for unexpected shifts (fraud campaigns can temporarily inflate scores)
    - Comparison: week-over-week tier distribution
```

---

## Anomaly Detection and Alerting

### Trust Anomaly Alerts

| Signal | Detection Method | Alert |
|---|---|---|
| Review bombing campaign | Sudden spike in 1-star reviews for a seller (> 5× 7-day avg within 1 hour) | PagerDuty to trust team |
| Fake review campaign | Velocity burst in 5-star reviews with fraud score > 0.7 for a seller | Trust team + automatic score hold |
| Coordinated listing fraud | Multiple new accounts listing same items with similar photos within 24 hours | Automatic listing hold + fraud analyst review |
| ATO wave | Account takeover detections > 50/hour platform-wide | Security incident response |

### Financial Anomaly Alerts

| Signal | Detection Method | Alert |
|---|---|---|
| GMV drop | Current hour GMV < 70% of same hour last week | PagerDuty (SEV-1) |
| Disbursement failure spike | Disbursement failure rate > 2% in a 1-hour window | Payment team + finance team |
| Reconciliation mismatch | Escrow ledger total ≠ payment processor settlement total | Immediate SEV-1; financial investigation |
| Tax collection anomaly | Collected tax / GMV deviates > 1% from jurisdiction model | Tax team review |

---

## Dashboard Design

### Executive Dashboard (GMV, Conversion, Trust Health)

```
Top-level KPIs (real-time):
  - GMV (hourly, daily, week-to-date)
  - Checkout conversion rate (trend + vs. last week)
  - Active listings count
  - Dispute rate

Trust health panel:
  - Open disputes count and trend
  - Fraud listings removed (last 24h)
  - Account takeovers detected (last 24h)
  - Human review queue depth and SLA compliance

Search health panel:
  - p99 search latency
  - Zero-result rate
  - Index shard availability
```

### On-Call Engineering Dashboard (Infrastructure Health)

```
Per-service latency and error rate (RED metrics):
  Rate, Errors, Duration for each core service

Database health:
  - Query latency p99 per shard
  - Replication lag
  - Connection pool utilization

Event bus health:
  - Consumer lag per topic/consumer group
  - Producer throughput per topic

Payment processor health:
  - Authorization rate (success/failure/error)
  - Current processor (primary/secondary indicator)
  - Escrow balance (should be monotonically positive)
```
