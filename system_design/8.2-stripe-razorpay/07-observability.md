# Observability

## Payment Success Metrics

### Primary Dashboard: Payment Health

| Metric | Formula | Target | Alert Threshold |
|--------|---------|--------|-----------------|
| **Payment Success Rate** | succeeded / (succeeded + failed) | > 95% | < 93% sustained 5 min |
| **Authorization Rate** | authorized / submitted_to_network | > 85% | < 80% sustained 5 min |
| **Capture Rate** | captured / authorized | > 99% | < 97% sustained 15 min |
| **Decline Rate (gateway)** | gateway_declined / total | < 2% | > 3% sustained 5 min |
| **Decline Rate (issuer)** | issuer_declined / submitted_to_network | < 15% | > 20% sustained 5 min |
| **Error Rate (5xx)** | 5xx_responses / total_requests | < 0.01% | > 0.05% sustained 2 min |
| **Idempotent Hit Rate** | idempotent_cache_hits / total_writes | ~2-5% | > 10% (possible client bug) |

### Authorization Rate by Card Network

```
Dashboard: Authorization Success Rate (5-minute rolling window)

Visa:        ████████████████████░░  89.2%  (target: > 85%)
Mastercard:  ███████████████████░░░  87.5%  (target: > 85%)
Amex:        ██████████████████░░░░  84.1%  (target: > 80%)
UPI:         █████████████████████░  95.8%  (target: > 93%)
Bank Xfer:   ████████████████████░░  91.3%  (target: > 88%)

Breakdown by decline reason:
├── Insufficient funds:    42%  (normal — cardholder issue)
├── Do not honor:          18%  (issuer-side, investigate if trending up)
├── Invalid card:          12%  (expired/closed cards)
├── Fraud suspected:        9%  (issuer's fraud rules triggered)
├── 3DS authentication:     8%  (cardholder failed challenge)
├── Card restricted:        5%  (geographic or merchant category block)
└── Technical failure:      6%  (network/issuer timeout — actionable)
```

### Payment Funnel Metrics

```
Payment Funnel (daily):

PaymentIntent created:        100,000,000  (100%)
├── Requires payment method:    5,000,000  ( 5%)   ← abandoned before card entry
├── Requires confirmation:      3,000,000  ( 3%)   ← created but not confirmed
├── Requires 3DS action:        8,000,000  ( 8%)   ← redirected to 3DS
│   ├── 3DS completed:          6,800,000  (85% of 3DS)
│   └── 3DS abandoned:          1,200,000  (15% of 3DS) ← conversion loss
├── Processing:                         0  ( ~0%)  ← transient state
├── Succeeded:                 78,000,000  (78%)   ← target: > 75%
├── Requires capture:           2,000,000  ( 2%)   ← manual capture pending
├── Failed (declined):         10,000,000  (10%)   ← investigate breakdown
└── Canceled:                   2,000,000  ( 2%)   ← merchant/customer canceled
```

---

## Latency Metrics

### Payment Authorization Latency Breakdown

```
Component Latency (p50 / p95 / p99):

API Gateway processing:          2ms /    5ms /   10ms
Idempotency check (Redis):       1ms /    2ms /    5ms
Risk Engine scoring:            15ms /   40ms /   80ms
Tokenization (vault decrypt):    5ms /   10ms /   20ms
Acquiring bank round-trip:     800ms / 1800ms / 2500ms   ← dominates
3D Secure (when triggered):   3000ms / 8000ms /15000ms   ← major contributor
Ledger recording:                5ms /   15ms /   30ms
Event publishing:                2ms /    5ms /   10ms
─────────────────────────────────────────────────────────
Total (without 3DS):          830ms / 1877ms / 2655ms
Total (with 3DS):            3830ms / 9877ms /17655ms
```

### Latency Percentile Tracking

| Metric | p50 | p95 | p99 | p99.9 | Alert (p99) |
|--------|-----|-----|-----|-------|-------------|
| Payment auth (no 3DS) | 830ms | 1.9s | 2.7s | 4.0s | > 3s sustained 5 min |
| Payment auth (with 3DS) | 3.8s | 9.9s | 17.7s | 25s | > 20s sustained 5 min |
| Refund processing | 200ms | 500ms | 1.2s | 3.0s | > 2s sustained 10 min |
| Status check (GET) | 5ms | 20ms | 50ms | 200ms | > 100ms sustained 5 min |
| Webhook first delivery | 1.5s | 5s | 15s | 60s | > 30s sustained 10 min |
| Dashboard page load | 500ms | 1.5s | 3s | 5s | > 5s sustained 15 min |

---

## Webhook Delivery Metrics

### Delivery Health Dashboard

| Metric | Formula | Target | Alert Threshold |
|--------|---------|--------|-----------------|
| **First-Attempt Success Rate** | delivered_on_first / total_events | > 95% | < 90% sustained 10 min |
| **Delivery Rate (1 hour)** | delivered_within_1h / total_events | > 99.95% | < 99.5% sustained 30 min |
| **Delivery Rate (24 hours)** | delivered_within_24h / total_events | > 99.99% | < 99.9% sustained 1 hour |
| **Average Delivery Latency** | avg(delivery_time - event_time) | < 2s | > 5s sustained 10 min |
| **Retry Rate** | retried_events / total_events | < 5% | > 10% sustained 30 min |
| **Dead Letter Queue Size** | events_in_DLQ | < 1000 | > 5000 sustained 1 hour |
| **Disabled Endpoints** | endpoints_disabled_today | < 50 | > 200 in 24 hours |

### Per-Endpoint Health

```
Endpoint Health Categories:

HEALTHY (95%+ first-attempt success):     8,500,000 endpoints (85%)
DEGRADED (80-95% success):                  900,000 endpoints (9%)
UNHEALTHY (50-80% success):                 400,000 endpoints (4%)
FAILING (< 50% success):                    150,000 endpoints (1.5%)
DISABLED (consecutive failures > 3 days):     50,000 endpoints (0.5%)
```

### Webhook Queue Depth Monitoring

```
Queue Depth by Priority:

Immediate (payment events):    ████░░░░░░░░░░░  2,500    (target: < 10,000)
Standard (dispute, refund):    ██░░░░░░░░░░░░░░    800    (target: < 50,000)
Retry queue:                   ███████░░░░░░░░░ 15,000    (target: < 100,000)
Dead letter queue:             █░░░░░░░░░░░░░░░    120    (target: < 1,000)
```

---

## Financial Reconciliation Monitoring

### Daily Reconciliation Dashboard

| Check | Expected | Tolerance | Action on Breach |
|-------|----------|-----------|-----------------|
| **Ledger balance (all accounts)** | Debits = Credits | $0.00 | P0 alert; halt payouts; investigate |
| **Gateway vs. network settlement** | Match within $100 | $100 per day | P1 alert; manual reconciliation |
| **Captured vs. settled** | Match within 0.01% | 0.01% of volume | P2 alert; investigate discrepancies |
| **Refund ledger vs. network** | Exact match | $0.00 | P1 alert; hold affected refunds |
| **Payout amounts vs. ledger** | Exact match | $0.00 | P0 alert; halt payouts |
| **Fee calculations** | Match rate schedule | $0.01 per txn | P2 alert; batch correction |

### Reconciliation Timeline

```
Real-Time (continuous):
├── Ledger balance assertion on every write
├── Idempotency collision detection
└── Double-payment detection

T+0 (same day):
├── Hourly ledger balance summation
├── Payment count: gateway vs. acquirer
└── Refund count: gateway vs. network

T+1 (next business day):
├── Settlement file comparison (Visa, Mastercard, acquirer)
├── Interchange fee verification
└── Payout calculation verification

T+2 (settlement day):
├── Funds received from acquirer vs. expected
├── Merchant payout amounts verified
└── Reserve balance recalculation

T+4 (reconciliation close):
├── 99.99% of dollar volume verified
├── Outstanding exceptions flagged for manual review
└── Monthly close preparation
```

---

## Distributed Tracing

### Trace Structure for a Payment

```
Trace ID: abc-123-def (generated at API Gateway)

[Span 1] API Gateway (2ms)
  ├── merchant_id: merch_001
  ├── idempotency_key: order_123_v1
  └── api_version: 2024-01-01

  [Span 2] Idempotency Check (1ms)
    ├── cache_result: miss
    └── store: redis_cluster_1

  [Span 3] Payment Orchestrator (825ms)
    ├── payment_intent_id: pi_xyz
    ├── amount: 9900
    └── currency: usd

    [Span 3.1] Risk Engine (18ms)
      ├── fraud_score: 0.12
      ├── decision: allow
      └── features_evaluated: 47

    [Span 3.2] Tokenization Service (6ms)
      ├── token: tok_abc
      ├── card_brand: visa
      └── card_last4: 4242

    [Span 3.3] Acquirer Request (795ms)   ← dominant span
      ├── acquirer: bank_xyz
      ├── network: visa
      ├── auth_code: A12345
      ├── response: approved
      └── network_latency_ms: 790

    [Span 3.4] Ledger Recording (5ms)
      ├── journal_id: jrnl_001
      └── entries_count: 4

    [Span 3.5] Event Publishing (2ms)
      ├── event_type: payment_intent.succeeded
      └── event_id: evt_001
```

### Key Trace Attributes

| Attribute | Purpose |
|-----------|---------|
| `payment_intent_id` | Correlate all spans for one payment |
| `merchant_id` | Filter traces by merchant |
| `idempotency_key` | Detect duplicate requests |
| `card_network` | Segment latency by network |
| `acquirer_response_code` | Debug decline reasons |
| `fraud_score` | Correlate risk decisions with outcomes |
| `3ds_triggered` | Measure 3DS impact on latency/conversion |

---

## Alerting Strategy

### Alert Severity Levels

| Severity | Response Time | Examples |
|----------|--------------|---------|
| **P0 (Critical)** | < 5 minutes | Payment path down; ledger imbalance; double-charge detected |
| **P1 (High)** | < 15 minutes | Auth rate drop > 5%; webhook delivery rate < 99%; acquirer timeout spike |
| **P2 (Medium)** | < 1 hour | Dashboard degraded; payout delay; single merchant affected |
| **P3 (Low)** | Next business day | Elevated retry rate; slow non-critical path; capacity warning |

### Key Alerts

| Alert | Condition | Severity | Runbook Action |
|-------|-----------|----------|----------------|
| Payment path availability < 99.99% | 5-min rolling | P0 | Check acquirer connectivity; enable failover |
| Payment error rate > 0.5% | 2-min rolling | P0 | Check deployment; rollback if recent deploy |
| Ledger imbalance detected | Any occurrence | P0 | Halt affected payouts; investigate journal entries |
| Authorization rate drop > 5% from baseline | 15-min rolling | P1 | Check per-network rates; contact acquirer if single network |
| Webhook delivery rate < 99% (1h window) | 30-min rolling | P1 | Check webhook worker health; investigate queue depth |
| Idempotency store (Redis) unavailable | Any occurrence | P1 | Fall back to DB dedup; investigate Redis cluster health |
| Payment latency p99 > 3s | 5-min rolling | P1 | Check acquirer latency; scale payment orchestrator |
| Payout not sent by scheduled time | T+2 deadline | P2 | Check payout worker; verify ledger balance; manual payout |
| Fraud score model latency > 100ms | 10-min rolling | P2 | Check model serving infrastructure; fall back to rule engine |

---

## Audit Logging

### What Is Logged

| Event Category | Examples | Retention |
|---------------|---------|-----------|
| **Card vault access** | Every tokenization, detokenization, deletion | 7 years |
| **Payment state transitions** | Every status change with before/after state | 7 years |
| **API key operations** | Creation, rotation, revocation | 7 years |
| **Merchant configuration changes** | Webhook endpoint changes, payout schedule changes | 7 years |
| **Admin actions** | Merchant approval, risk tier changes, manual refunds | 7 years |
| **Authentication events** | Login, MFA, session creation | 2 years |
| **CDE access** | Every access to the cardholder data environment | 7 years |

### Audit Log Format

```
{
    "timestamp": "2025-01-15T10:30:00.000Z",
    "event_type": "card_vault.detokenize",
    "actor": {
        "type": "service",
        "id": "payment-orchestrator-pod-7",
        "ip": "10.0.1.42"
    },
    "resource": {
        "type": "payment_method",
        "id": "pm_card_abc",
        "card_fingerprint": "fp_xyz"     -- NOT the PAN
    },
    "context": {
        "payment_intent_id": "pi_xyz789",
        "merchant_id": "merch_001",
        "reason": "authorization_request",
        "trace_id": "abc-123-def"
    },
    "result": "success"
}
```
