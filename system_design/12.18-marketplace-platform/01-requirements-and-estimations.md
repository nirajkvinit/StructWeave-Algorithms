# 12.18 Marketplace Platform — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Listing creation** — Sellers can create listings with title, description, photos, price, quantity, category, and shipping options | Support draft, active, and archived states; photo upload up to 10 images per listing |
| FR-02 | **Search and discovery** — Buyers can search listings by keyword and filter by category, price range, location, and seller quality | Sub-200ms p99 search latency; new listings discoverable within 30 seconds of activation |
| FR-03 | **Listing recommendations** — Surface personalized recommendations on homepage and within search results based on buyer browse and purchase history | Real-time candidate generation; batch model training; near-real-time feature updates |
| FR-04 | **Cart and checkout** — Buyers can add listings to a cart, enter payment details, and complete purchase with inventory reservation | Atomic reservation + payment capture; prevent oversell across concurrent buyers |
| FR-05 | **Payment processing** — Charge buyer, hold funds in escrow, split disbursement to seller minus platform take rate and payment processing fee | PCI-DSS compliant; support credit/debit cards, digital wallets, and buy-now-pay-later |
| FR-06 | **Order management** — Both buyer and seller can view order status, tracking information, and delivery confirmation | Real-time status updates via webhook from shipping carriers |
| FR-07 | **Dispute resolution** — Buyers can open a dispute for non-delivery or item not as described; platform mediates and issues refunds or releases funds | Time-bounded buyer protection window (30 days for most categories); automated resolution for common patterns |
| FR-08 | **Reviews and ratings** — After order completion, both buyers and sellers can leave reviews and ratings for the counterparty | Review window: 60 days from delivery; fraud detection applied to all submitted reviews |
| FR-09 | **Seller payout** — Disburse seller net proceeds after escrow hold period; support bank transfer and digital wallet disbursement | Hold period varies by seller trust tier (2–7 days baseline); dispute-extended holds |
| FR-10 | **Trust and safety** — Detect and act on fraudulent listings, counterfeit goods, fake reviews, payment fraud, and account takeover | Multi-layer detection: automated signals, ML classifiers, human review queue |
| FR-11 | **Seller quality scoring** — Compute and maintain a multi-dimensional quality score per seller that feeds search ranking and payout timing | Updated asynchronously after each order completion, review, and policy action |
| FR-12 | **Messaging** — Buyers and sellers can communicate about listings and orders within a platform-monitored messaging channel | NLP scan for off-platform payment solicitation and prohibited content |
| FR-13 | **Notifications** — Send order, shipping, payment, dispute, and review notifications via email, push, and in-app channels | Templated, personalized, and time-sensitive delivery |
| FR-14 | **Seller onboarding and KYC** — Verify seller identity for large-volume merchants; collect tax information; enforce category-specific selling permissions | Tiered verification: lightweight for casual sellers, full KYB for business sellers above GMV thresholds |
| FR-15 | **Tax collection and remittance** — Collect applicable sales tax from buyers based on buyer and seller jurisdiction; remit to tax authorities | Marketplace facilitator tax obligations in 45+ US states; VAT in EU jurisdictions |

---

## Out of Scope

- **Fulfillment and logistics operations** — Third-party logistics, warehouse management, carrier contracting (assumed as external provider integrations)
- **Advertising platform** — Promoted listings, sponsored search, display advertising (separate ad-tech system)
- **Wholesale and B2B procurement** — Volume pricing, purchase orders, net-terms invoicing
- **Physical point-of-sale** — In-person transactions; this system covers digital marketplace only
- **Cryptocurrency payments** — Fiat currency only; crypto payment rails not in scope

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Search query latency (p99) | ≤ 200 ms | Buyer experience; above 300ms causes measurable conversion drop |
| Listing indexing latency | ≤ 30 seconds from activation | Sellers expect near-immediate discoverability |
| Checkout transaction latency (p99) | ≤ 3 seconds | Payment processor round-trip + inventory reservation |
| Recommendation serving latency (p99) | ≤ 100 ms | Real-time serving from pre-computed candidates |
| Dispute resolution SLA (automated) | ≤ 24 hours for auto-resolvable cases | Buyer protection expectation; 72 hours for human review |
| Payout disbursement SLA | Within hold period + 1 business day | Seller cash flow dependency |
| Fraud detection latency (listing) | ≤ 5 minutes from listing creation | Block fraudulent listings before buyer exposure |
| Review fraud detection | ≤ 60 minutes from review submission | Batch detection acceptable; real-time for anomaly spikes |

### Reliability & Availability

| Metric | Target |
|---|---|
| Payment service availability | 99.99% (≤ 52 min/year) — financial operations |
| Search service availability | 99.95% (≤ 26 min/month) |
| Order management availability | 99.99% — transactional data |
| Listing service availability | 99.9% — creation can tolerate brief outages |
| Inventory reservation consistency | Exactly-once reservation semantics; no oversell |
| Payment idempotency | All payment operations idempotent; duplicate requests safe |

### Scalability

| Metric | Target |
|---|---|
| Active listings in search index | 300M+ listings; sub-linear query time growth |
| Peak checkout transactions | 50,000 transactions/minute (holiday peak) |
| Listing creation throughput | 10,000 new listings/minute |
| Search queries | 500,000 queries/minute at peak |
| Concurrent buyers in checkout | 200,000 simultaneous sessions |

### Security & Compliance

| Requirement | Specification |
|---|---|
| Payment data | PCI-DSS Level 1 compliance; cardholder data never touches platform servers (tokenization) |
| Seller identity | KYC for merchants above regulatory thresholds; AML transaction monitoring |
| Buyer data | GDPR/CCPA compliant; data minimization for payment data; right-to-deletion workflow |
| Fraud monitoring | Real-time transaction scoring; velocity checks; device fingerprinting |

---

## Capacity Estimations

### Scale Assumptions

**Platform profile:**
- 50M monthly active buyers, 5M active sellers
- 300M active listings at any given time
- 5M orders per day
- Average order value (AOV): $45
- Daily GMV: 5M × $45 = $225M
- Take rate: 8% → daily platform revenue: ~$18M

### Listing Volume

```
Active listings:          300M
New listings/day:         3M  (sellers re-list + new items)
New listings/minute:      3M / 1440 = ~2,100/min (average)
Peak listing creation:    10,000/min (3x average during seller peak hours)

Listing record size:
  Metadata (title, price, category, etc.): ~2 KB
  Photo references (not photos): ~200 bytes × 10 photos = 2 KB
  Seller + shipping data:                  ~500 bytes
  Total per listing:                       ~5 KB

Total listing storage:
  300M × 5 KB = 1.5 TB (metadata only; photos in object storage)
```

### Search Index

```
Search index document (per listing):
  Title tokens + vector embedding: ~4 KB
  Categorical filters (structured): ~500 bytes
  Seller quality signals:           ~200 bytes
  Behavioral signals (CTR, CVR):    ~300 bytes
  Total per document:               ~5 KB

Total index size:
  300M × 5 KB = 1.5 TB raw index data
  With replicas (3×) + inverted index overhead (2×): ~9 TB

Query throughput:
  500,000 queries/min = ~8,300 QPS
  With fan-out to N shards (N=50): 8,300 × 50 = 415,000 shard-level QPS
  Each shard serves ~6M docs; query time ≤ 5ms per shard
  Total response assembled in ≤ 20ms at search layer before re-ranking (200ms budget remaining)
```

### Transaction Volume

```
Orders/day:                 5M
Orders/second (average):    5M / 86,400 = ~58 orders/sec
Peak (holiday, 5× avg):     ~290 orders/sec = ~17,400 orders/min

Per-order operations:
  Inventory reservation:    1 DB write (optimistic lock)
  Payment capture:          1 payment processor API call (~800ms latency)
  Escrow record creation:   1 DB write
  Order record:             1 DB write
  Notification trigger:     1 queue message

Payment processor API calls:
  290 peak orders/sec × 1 call = 290 calls/sec
  (within payment processor rate limits with connection pooling)
```

### Escrow and Payout

```
Active escrow accounts:
  5M orders/day × 5-day avg hold = 25M open escrow records at any time
  Each record: ~500 bytes → 12.5 GB active escrow state

Payout volume:
  5M orders/day × 70% reach payout (30% disputed/cancelled) = 3.5M payouts/day
  3.5M × $41 avg seller net (AOV $45 × 8% take rate × ~2% payment fee) = $140M/day disbursed
  Batch disbursement: 2 runs/day for standard sellers; 1 run/day for new sellers
```

### Photo Storage

```
Average photos per listing:    6
Average photo size (compressed): 800 KB
Total photo storage:
  300M listings × 6 × 800 KB = 1.44 PB

New photo uploads/day:
  3M new listings × 6 photos × 800 KB = 14.4 TB/day ingested
  (Stored in object storage with CDN caching for buyer-facing delivery)
```

### SLO Summary

| SLO | Target | Measurement Window |
|---|---|---|
| Search p99 latency | 200 ms | Rolling 1-hour |
| Checkout transaction p99 | 3 s | Rolling 1-hour |
| Inventory reservation accuracy | 0 oversells (hard constraint) | Per-incident |
| Payment capture success rate | ≥ 99.5% (excluding declined cards) | Daily |
| Listing indexing latency | 95th percentile ≤ 30 s | Rolling 1-hour |
| Dispute auto-resolution SLA | 95% within 24 hours | Weekly |
| Payout on-time rate | 99.9% within hold period + 1 BD | Weekly |
| Fraud listing removal | 95% within 60 minutes of detection | Daily |
