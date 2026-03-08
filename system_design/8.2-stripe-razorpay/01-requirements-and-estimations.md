# Requirements & Estimations

## Functional Requirements

### Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Payment Processing** | Accept payments via cards (Visa, Mastercard, Amex), bank transfers, UPI, wallets; support authorize-only and authorize+capture flows |
| F2 | **Idempotent API** | Every mutating API call accepts an idempotency key; retried requests return the original response without re-executing the operation |
| F3 | **Webhook Delivery** | Deliver real-time event notifications (payment succeeded, failed, refunded, disputed) to merchant-configured HTTPS endpoints with retry |
| F4 | **Refunds** | Full and partial refunds with automatic ledger adjustments; refund to original payment method |
| F5 | **Multi-Currency** | Accept payments in 135+ currencies; handle FX rate locking at authorization, settlement in merchant's preferred currency |
| F6 | **Merchant Dashboard** | Real-time transaction monitoring, analytics, payout tracking, dispute management, API key management |
| F7 | **Dispute Management** | Receive chargeback notifications from card networks; allow merchants to submit representment evidence; track dispute lifecycle |
| F8 | **Payouts** | Aggregate captured funds and disburse to merchant bank accounts on configurable schedules (T+2, weekly, monthly) |
| F9 | **Tokenization** | Store card-on-file as tokens for recurring payments; PCI-compliant vault with network tokenization support |
| F10 | **3D Secure Authentication** | Integrate with 3DS2 protocol for Strong Customer Authentication (SCA); risk-based challenge flow |
| F11 | **Subscription Billing** | Recurring charges on configurable intervals; dunning management with smart retry for failed payments |
| F12 | **Merchant Onboarding** | KYC/KYB verification, risk scoring, tiered rate assignment, API key provisioning |

### User Roles

| Role | Capabilities |
|------|-------------|
| **Customer** | Initiates payment, completes 3D Secure challenge, views receipts |
| **Merchant Developer** | Integrates payment API, configures webhooks, manages API keys, views logs |
| **Merchant Admin** | Dashboard access, refund initiation, dispute response, payout configuration |
| **Risk Analyst** | Fraud rule configuration, transaction review, merchant risk assessment |
| **Platform Admin** | System configuration, card network management, compliance monitoring, merchant approval |
| **Finance Operations** | Reconciliation, ledger auditing, payout management, settlement oversight |

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Payment Authorization Latency** | p50 < 1s, p99 < 2.5s | Card network round-trip dominates; must not add significant gateway overhead |
| **Payment Path Availability** | 99.999% (five nines) | Every minute of downtime = lost revenue for merchants; payment path is the most critical |
| **Webhook Delivery Latency** | p50 < 2s, p99 < 30s | Merchants depend on timely notifications for order fulfillment |
| **Webhook Delivery Rate** | 99.95% within 1 hour | At-least-once delivery with exponential backoff retry up to 3 days |
| **Dashboard Availability** | 99.9% | Important but not revenue-critical; degraded mode acceptable |
| **Idempotency Guarantee** | 100% for same key within 24h | Zero tolerance for double charges; idempotency key TTL is 24 hours |
| **Ledger Accuracy** | 100% balanced | Every transaction must have balanced debit/credit entries; zero imbalance tolerance |
| **Data Durability** | 99.9999999% (nine nines) | Financial records must never be lost; regulatory retention requirements (7+ years) |
| **PCI-DSS Compliance** | Level 1 | Mandatory for processing >6M transactions/year |
| **Concurrent Payments** | 15,000/s at peak | Flash sales, holiday shopping, month-end billing runs |

---

## Capacity Estimations

### Traffic

```
Daily API requests:         1,000,000,000 (1B)
Daily transactions:         100,000,000 (100M)
  - Card payments:          60M (60%)
  - Bank transfers/UPI:     30M (30%)
  - Wallet payments:        10M (10%)

Average transactions/sec:   100M / 86,400 ≈ 1,157 txn/sec
Peak transactions/sec:      1,157 × 13 ≈ 15,000 txn/sec

API requests per transaction: ~10 (create, confirm, authorize, capture, webhook, status checks)
Average API requests/sec:   1B / 86,400 ≈ 11,574 req/sec
Peak API requests/sec:      11,574 × 5 ≈ 57,870 req/sec
```

### Webhook Delivery

```
Events per transaction:     ~5 (created, requires_action, succeeded/failed, charge.captured, receipt)
Daily webhook events:       100M × 5 = 500,000,000 (500M)
Average webhooks/sec:       500M / 86,400 ≈ 5,787/sec
Peak webhooks/sec:          5,787 × 5 ≈ 29,000/sec

Merchant endpoints:         ~10,000,000 (10M configured endpoints)
Average delivery latency:   ~1.5s (p50)
Retry rate:                 ~5% (endpoints returning non-2xx on first attempt)
Events retried:             500M × 0.05 = 25M/day
```

### Storage

```
--- Transaction Database ---
Transactions per day:       100,000,000
Transaction record size:    ~2 KB (payment, metadata, idempotency, status history)
Daily transaction growth:   100M × 2 KB = 200 GB/day
Annual transaction growth:  200 GB × 365 = 73 TB/year
7-year retention:           511 TB

--- Ledger ---
Ledger entries per txn:     ~4 (merchant credit, platform fee debit, network fee, reserve)
Daily ledger entries:       100M × 4 = 400M entries
Ledger entry size:          ~500 bytes
Daily ledger growth:        400M × 500B = 200 GB/day
Annual ledger growth:       73 TB/year

--- Idempotency Key Store ---
Keys per day:               ~200M (not all API calls use idempotency keys)
Key + response size:        ~1 KB (key hash + status code + response body hash)
Active keys (24h window):   200M × 1 KB = 200 GB
Storage type:               In-memory (Redis) with 24h TTL

--- Tokenization Vault ---
Stored card tokens:         ~500M active tokens
Token record size:          ~500 bytes (token, encrypted PAN, expiry, fingerprint)
Total vault size:           500M × 500B = 250 GB
Growth rate:                ~50M new tokens/year

--- Webhook Event Log ---
Events per day:             500M
Event record size:          ~1 KB (event type, payload, delivery attempts, status)
Daily event growth:         500 GB/day
Retention:                  30 days active, 1 year archived
Active storage:             500 GB × 30 = 15 TB
```

### Bandwidth

```
Payment API request:        ~2 KB average
Payment API response:       ~3 KB average
Peak payment bandwidth:     15,000 × 5 KB = 75 MB/s

Webhook payload:            ~2 KB average
Peak webhook bandwidth:     29,000 × 2 KB = 58 MB/s

Dashboard API:              ~50 KB per page load
Peak dashboard bandwidth:   ~500 MB/s (100K concurrent merchant sessions)

Total peak bandwidth:       ~650 MB/s outbound
```

---

## SLO / SLA Table

| Service | Metric | SLO | SLA | Measurement |
|---------|--------|-----|-----|-------------|
| Payment Authorization | Latency p50 | < 1s | < 1.5s | Gateway processing time (excluding card network) |
| Payment Authorization | Latency p99 | < 2.5s | < 4s | End-to-end including card network round-trip |
| Payment Authorization | Availability | 99.999% | 99.99% | Payment path uptime |
| Payment Authorization | Success rate | > 95% | > 90% | Excluding legitimate declines |
| Webhook Delivery | First-attempt latency p50 | < 2s | < 5s | From event generation to first delivery attempt |
| Webhook Delivery | Delivery rate (1h) | > 99.95% | > 99.5% | Events delivered within 1 hour |
| Webhook Delivery | Delivery rate (24h) | > 99.99% | > 99.95% | Events delivered within 24 hours |
| Refund Processing | Latency p99 | < 5s | < 10s | Refund initiation to network submission |
| Idempotency | Correctness | 100% | 100% | Same key always returns same result within TTL |
| Ledger | Balance accuracy | 100% | 100% | Debits = Credits for every reconciliation cycle |
| Ledger | Verification latency | < 4 days | < 7 days | 99.99% of dollar volume verified |
| Dashboard | Availability | 99.9% | 99.5% | Merchant-facing dashboard uptime |
| Dashboard | Latency p99 | < 3s | < 5s | Page load time |
| Payout | On-time delivery | > 99.9% | > 99.5% | Payouts sent by scheduled date |
| Merchant Onboarding | KYC completion | < 24h | < 48h | Automated verification turnaround |

---

## Key Estimation Insights

1. **Idempotency store fits in memory**: At 200 GB for a 24-hour window of idempotency keys, this comfortably fits in a Redis cluster. The 24-hour TTL ensures automatic cleanup, and the in-memory access pattern provides sub-millisecond lookup for every payment request.

2. **Ledger growth rivals transaction storage**: The ledger generates roughly the same data volume as the transaction database (~73 TB/year each) because every transaction produces multiple balanced entries. Ledger storage must be append-only and immutable, adding constraints beyond normal database operations.

3. **Webhook delivery is a massive fan-out problem**: 500M events/day to 10M merchant endpoints, each with different reliability characteristics. A 5% first-attempt failure rate means 25M retries/day, requiring a robust queue-based delivery system with per-endpoint circuit breakers.

4. **Payment path must handle 13x burst**: Peak traffic (flash sales, month-end billing) can reach 15,000 txn/sec---13x the daily average. The payment path must be provisioned for peak, not average, because any dropped payment is lost revenue.

5. **Seven-year retention creates petabyte-scale archives**: Financial regulations require 7+ years of transaction records. At 73 TB/year for transactions alone, this accumulates to 500+ TB, requiring tiered storage with hot/warm/cold strategies.
