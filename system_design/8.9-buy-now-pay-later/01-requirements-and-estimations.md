# Requirements & Estimations

## Functional Requirements

### Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Checkout Integration** | Embed BNPL option at merchant checkout via SDK widget, server-side API, or redirect flow; display eligible plans with APR and total cost |
| F2 | **Real-Time Credit Decision** | Approve or decline consumer in < 2s using soft credit pull, alternative data, and ML scoring; return eligible plan options with terms |
| F3 | **Pre-Qualification** | Allow consumers to check eligibility before checkout without impacting credit score; display personalized spending power |
| F4 | **Installment Plan Creation** | Create a fixed-term repayment plan (Pay-in-4, Pay-in-6, Pay-in-12, etc.) with scheduled payment dates, amounts, and APR disclosure |
| F5 | **Payment Collection** | Automatically charge consumer's payment method on scheduled dates; support auto-debit, manual payment, and partial payments |
| F6 | **Merchant Settlement** | Disburse full purchase amount (minus discount rate) to merchant within 1--3 business days of purchase confirmation |
| F7 | **Virtual Card Issuance** | Generate single-use virtual card numbers for non-integrated merchants; support card network authorization and settlement |
| F8 | **Refunds & Returns** | Process full or partial refunds; adjust remaining installment schedule proportionally; handle merchant-initiated and consumer-disputed refunds |
| F9 | **Late Fee Assessment** | Calculate and charge late fees per regulatory limits when scheduled payments are missed; provide grace periods per jurisdiction |
| F10 | **Dunning & Collections** | Execute multi-channel dunning sequences (email, SMS, push, in-app) for missed payments; escalate through hardship programs to charge-off |
| F11 | **Consumer Dashboard** | Display active plans, upcoming payments, payment history, spending power, and account settings |
| F12 | **Merchant Dashboard** | Show transaction volume, settlement reports, dispute status, integration health, and consumer analytics |
| F13 | **Dispute Resolution** | Handle consumer disputes with evidence submission, merchant response, and platform adjudication within regulatory timelines |
| F14 | **Hardship Programs** | Offer payment plan modifications, reduced payments, or extended terms for consumers experiencing financial difficulty |
| F15 | **Rewards & Loyalty** | Offer cashback, merchant-funded promotions, and loyalty points to incentivize on-time payments and repeat usage |

### User Roles

| Role | Capabilities |
|------|-------------|
| **Consumer** | Browse eligible plans, complete checkout, manage payments, request refunds, view history, upgrade spending power |
| **Merchant** | Integrate BNPL, view settlements, manage disputes, configure plan options, access analytics |
| **Underwriter** | Configure risk models, set credit policies, review borderline decisions, adjust approval thresholds |
| **Collections Agent** | Manage delinquent accounts, offer hardship plans, escalate to charge-off, coordinate debt sale |
| **Compliance Officer** | Audit credit decisions, ensure TILA disclosures, manage lending licenses, review fair lending reports |
| **Platform Admin** | System configuration, partner management, fee schedules, merchant onboarding workflows |

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Credit Decision Latency** | p50 < 800ms, p99 < 2s | Checkout abandonment increases 7% per second of delay |
| **Checkout Widget Load Time** | p99 < 500ms | Widget must render before consumer reaches payment step |
| **Payment Collection Availability** | 99.99% | Missed collection windows directly impact cash flow and default rates |
| **Merchant Settlement Accuracy** | 100% | Every settlement must reconcile to the penny against transactions |
| **Credit Decision Consistency** | Strong | Same consumer + same context must get the same decision within a scoring window |
| **Data Durability** | 99.9999% | Financial records, credit decisions, and audit logs must never be lost |
| **Plan Data Availability** | 99.99% | Consumers must always be able to view and pay their plans |
| **Virtual Card Authorization** | p99 < 3s | Must complete within card network timeout windows |
| **Regulatory Compliance** | Per jurisdiction | TILA, state lending licenses, EU CCD, dispute resolution timelines |
| **Concurrent Active Plans** | 50M+ | Plans with pending payments across all consumers |

---

## Capacity Estimations

### Traffic

```
Registered consumers:         50,000,000 (50M)
Monthly active consumers:     20,000,000 (20M)
Daily active consumers:       8,000,000 (8M)

Daily credit decisions:       3,000,000 (3M)
  Pre-qualifications:         1.5M (50%)
  Checkout approvals:         1.2M (40%)
  Declined:                   300K (10%)

Approval rate:                ~75% of checkout requests
New plans created per day:    2,000,000 (2M)
  Pay-in-4 (interest-free):  1.4M (70%)
  Pay-in-6 to Pay-in-12:     400K (20%)
  Pay-in-12+ (with APR):     200K (10%)

Average credit decisions/sec: 3M / 86,400 ≈ 35 TPS
Peak credit decisions/sec:    35 × 15 = 525 TPS
  (Peaks during Black Friday, holiday sales, flash promotions)

Daily payment collections:    5,000,000 (5M)
Peak collection batch size:   2M per collection window (3 windows/day)
```

### Plan & Payment Volume

```
Active installment plans:      50,000,000 (50M)
  Pay-in-4 plans:              30M (4 payments each → 120M scheduled payments)
  Pay-in-6 to Pay-in-12:      15M (avg 9 payments → 135M scheduled payments)
  Pay-in-12+:                  5M (avg 18 payments → 90M scheduled payments)

Total scheduled payments:      ~345M across all active plans
Payments due per day:          ~5M (distributed across 3 collection windows)

Collection success rate:
  First attempt:               92%
  After retry (within 3 days): 96%
  After dunning sequence:      98%
  Charge-off rate:             2-4% (after 120 days delinquent)

Average plan value:            $150
Total outstanding receivables: 50M × $150 × 0.6 remaining ≈ $4.5B
Daily disbursement to merchants: 2M × $150 = $300M
```

### Storage

```
--- Consumer Profiles ---
Consumer record size:          ~2 KB (demographics, KYC, linked payment methods)
Total consumer storage:        50M × 2 KB = 100 GB

--- Credit Decision Records ---
Decision record size:          ~5 KB (features, scores, model version, outcome, regulatory disclosure)
Daily growth:                  3M × 5 KB = 15 GB/day
Annual growth:                 5.5 TB/year
Retention:                     7 years (regulatory: adverse action records)

--- Installment Plans ---
Plan record size:              ~3 KB (terms, schedule, status, payment history)
Total plan storage:            50M active × 3 KB = 150 GB
Historical plans (5 years):    ~2 TB

--- Payment Records ---
Payment record size:           ~1 KB (amount, status, retry history, settlement reference)
Daily growth:                  5M × 1 KB = 5 GB/day
Annual growth:                 1.8 TB/year

--- Merchant Data ---
Merchant record size:          ~10 KB (config, settlement terms, integration keys)
Total merchant storage:        500K × 10 KB = 5 GB

--- ML Feature Store ---
Feature vector per consumer:   ~500 bytes (pre-computed features refreshed daily)
Total feature store:           50M × 500 B = 25 GB (fits in memory)

--- Document Storage ---
Dispute evidence, contracts:   ~2 MB per dispute
Annual dispute volume:         ~5M disputes × 2 MB = 10 TB/year
```

### Bandwidth

```
Credit decision request:       ~3 KB (consumer info, order details, merchant context)
Credit decision response:      ~2 KB (decision, eligible plans, disclosures)
Peak decision bandwidth:       525 × 5 KB = ~2.6 MB/s

Payment collection batch:      5M × 500 B = 2.5 GB per batch (internal)
Merchant settlement file:      500K merchants × 1 KB = 500 MB/day

Checkout widget payload:       ~50 KB (JS + CSS + config)
Widget requests at peak:       ~5,000/sec × 50 KB = ~250 MB/s (CDN-served)
```

---

## SLO / SLA Table

| Service | Metric | SLO | SLA | Measurement |
|---------|--------|-----|-----|-------------|
| Credit Decision | Latency p50 | < 800ms | < 1.5s | Checkout request to approval/decline response |
| Credit Decision | Latency p99 | < 2s | < 3s | Including soft credit pull and ML scoring |
| Credit Decision | Availability | 99.99% | 99.95% | Revenue-critical: unavailability = lost sales |
| Pre-Qualification | Latency p99 | < 3s | < 5s | Non-blocking; can tolerate higher latency |
| Payment Collection | Success rate (first attempt) | > 92% | > 90% | Auto-debit from linked payment method |
| Payment Collection | Success rate (final) | > 98% | > 97% | After all retry attempts and dunning |
| Merchant Settlement | Accuracy | 100% | 100% | Settlements must match transaction records exactly |
| Merchant Settlement | Timeliness | T+1 to T+3 | T+5 | Business days from purchase to merchant payout |
| Virtual Card Auth | Latency p99 | < 3s | < 5s | Within card network timeout requirements |
| Consumer Dashboard | Latency p99 | < 500ms | < 1s | Plan list and payment schedule display |
| Dispute Resolution | Response time | < 15 days | < 30 days | Regulatory requirement (Reg E / EU CCD) |
| Plan Creation | Durability | 99.9999% | 99.999% | Plan must be persisted before checkout confirmation |
| Dunning Notification | Delivery rate | > 99% | > 98% | At least one channel must reach consumer |

---

## Key Estimation Insights

1. **Credit decisioning is latency-critical but low-throughput**: At 525 peak TPS, the volume is manageable, but each decision requires orchestrating a soft credit pull (~500ms), feature computation (~100ms), ML inference (~50ms), and plan offer generation (~50ms)---all within a 2s budget. The challenge is latency, not throughput.

2. **Payment collection is batch-dominant**: 5M daily collections concentrated in 3 windows create burst patterns. The payment processor integration must handle 2M collection requests per window (~700 TPS sustained for 45 minutes), with retry logic for failures.

3. **Outstanding receivables dwarf daily volume**: $4.5B in outstanding receivables across 50M plans means even small improvements in collection rates (e.g., 92% to 93%) recover tens of millions in annual revenue. Collections optimization has outsized financial impact.

4. **Credit decision records are the largest growing data set**: At 5.5 TB/year with 7-year retention, credit decision records (including features, scores, and regulatory disclosures) exceed transaction data. These records are legally required for adverse action documentation and fair lending audits.

5. **Peak-to-average ratio is extreme and seasonal**: Holiday shopping (Black Friday through December) creates 15x spikes in credit decisions. Unlike payment systems with daily peaks, BNPL peaks are seasonal---requiring either pre-provisioned capacity or aggressive auto-scaling with warm-up strategies.
