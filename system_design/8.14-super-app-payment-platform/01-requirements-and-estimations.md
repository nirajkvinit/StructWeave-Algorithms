# Requirements & Estimations

## Functional Requirements

### Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **UPI P2P and P2M Payments** | Send and receive money via VPA (virtual payment address), QR code scan, or phone number lookup; support collect requests, split bills, and recurring mandates via UPI AutoPay |
| F2 | **Multi-Bank Account Linking** | Link multiple bank accounts from different banks via UPI; perform real-time balance check, set default account, and switch accounts per transaction; manage device binding per bank |
| F3 | **Bill Payments (BBPS)** | Fetch and pay bills across 20,000+ billers via Bharat BillPay integration; support categories including electricity, telecom, DTH, insurance, municipal taxes, and water; provide payment confirmation and T+1 settlement |
| F4 | **NFC Contactless Tap-to-Pay** | Enable cardless NFC payments using Host Card Emulation (HCE) with tokenized credentials; support tap-to-pay at any contactless terminal without requiring a physical card |
| F5 | **Rewards and Cashback Engine** | Manage a points economy with configurable earn/burn rules; deliver gamified engagement via scratch cards, streaks, and referral bonuses; enforce real-time budget constraints on cashback disbursals |
| F6 | **Merchant QR Code Ecosystem** | Generate static and dynamic QR codes for merchants; process QR-based payments with instant settlement notification; provide merchant analytics dashboard with daily/weekly settlement reports |
| F7 | **Mini-App/Applet Framework** | Host third-party services (travel booking, food delivery, shopping) within a sandboxed runtime inside the super app; manage lifecycle, permissions, and resource isolation for each mini-app |
| F8 | **Financial Services Marketplace** | Offer embedded finance products---pre-approved personal loans, mutual fund SIP investments, insurance policies, and digital gold---with in-app origination, KYC, and tracking |
| F9 | **Request Money and Group Splitting** | Allow users to send payment requests to contacts; support group expense creation with automatic split calculation and settlement tracking across group members |
| F10 | **Transaction History and Spend Analytics** | Display complete transaction history across all payment rails with search, filter, and categorization; provide monthly spend summaries, category-wise breakdowns, and budget tracking insights |

### Supporting Features

| # | Feature | Description |
|---|---------|-------------|
| S1 | **KYC Tier Management** | Support tiered KYC levels (minimum, full, digilocker-verified) with progressive feature unlocking; manage document verification and periodic re-KYC |
| S2 | **Device Binding and Security** | Bind user identity to device via SIM-based verification, device fingerprint, and hardware attestation; manage MPIN lifecycle (creation, change, reset) |
| S3 | **Push Notifications and Alerts** | Send real-time transaction confirmations, payment requests, bill reminders, cashback notifications, and promotional offers across push, SMS, and in-app channels |
| S4 | **Merchant Onboarding and KYC** | Self-service merchant registration with business verification, QR code generation, settlement account setup, and POS SDK integration |
| S5 | **Dispute and Complaint Management** | Handle transaction disputes with NPCI-mandated timelines; support chargeback flows for card-based transactions; manage consumer complaints with SLA tracking |
| S6 | **Multi-Language and Accessibility** | Support 12+ regional languages for pan-India reach; comply with accessibility standards for screen readers and assistive technologies |

### User Roles

| Role | Capabilities |
|------|-------------|
| **Consumer** | Link bank accounts, make/receive payments, pay bills, use NFC, redeem rewards, access financial products, use mini-apps |
| **Merchant** | Register business, generate QR codes, view settlements, manage refunds, access sales analytics, integrate POS SDK |
| **Financial Partner** | Offer lending/insurance/investment products via marketplace; manage disbursals, repayments, and policy lifecycle |
| **Mini-App Developer** | Build and deploy applets within the platform; manage app lifecycle, permissions, and user data access |
| **Risk/Compliance Officer** | Configure fraud rules, review flagged transactions, manage KYC tiers, ensure regulatory compliance |
| **Platform Admin** | System configuration, partner onboarding, fee schedule management, escalation handling, operational monitoring |

---

## Out of Scope

| Exclusion | Rationale |
|-----------|-----------|
| **Card network switch operation** | Visa/Mastercard/RuPay switch processing is handled by the card networks; the platform integrates as a token requestor, not a switch |
| **Banking core ledger** | Actual account debits/credits are performed by partner banks via UPI/IMPS rails; the platform does not hold deposits |
| **Regulatory compliance reporting systems** | Statutory filings, audit trail generation, and regulatory reporting are handled by dedicated compliance and CA systems |
| **Physical POS terminal hardware design** | Hardware design for payment terminals is out of scope; the platform provides software SDKs for terminal integration |
| **Telecom infrastructure** | SMS delivery, USSD channels, and telecom-level infrastructure are provided by carrier partners |
| **Credit bureau integration internals** | Credit score retrieval is consumed as a service; building credit scoring models is out of scope |

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **CAP Trade-off** | CP for payment transactions (no double-spend, no phantom credits); AP for read paths (balance display, history, recommendations) | Financial integrity is non-negotiable; read paths can tolerate short staleness windows |
| **Availability** | 99.99% for payment flows | UPI ecosystem mandates near-continuous uptime; downtime directly impacts millions of users and merchants |
| **UPI Transaction Latency** | p50 < 800ms, p99 < 2s end-to-end | NPCI SLA requires transactions to complete within 2s; user expectation is sub-second for P2P |
| **NFC Tap-to-Pay Latency** | p99 < 500ms | Contactless payments must feel instantaneous; terminal timeout is typically 1s |
| **Bill Fetch Latency** | p95 < 3s | Biller response times vary; platform must aggregate and respond within consumer patience threshold |
| **Fraud Detection Latency** | p99 < 100ms | Risk scoring must complete inline before transaction authorization; cannot block the payment flow |
| **Data Durability** | Zero transaction loss | Every financial transaction must be durably persisted before acknowledgment; write-ahead logging with synchronous replication |
| **Throughput** | 15,000 TPS sustained; 50,000 TPS burst | Festival spikes (Diwali, New Year) create 3--4x normal load; flash cashback campaigns create sudden bursts |
| **Data Localization** | All financial data stored within country borders | Regulatory mandate for payment data storage; no cross-border replication of transaction records |
| **Recovery Time Objective** | < 30s for critical payment services | Active-active deployment across regions; automatic failover with no manual intervention |
| **Recovery Point Objective** | Zero for financial transactions | Synchronous replication ensures no committed transaction is lost during failover |
| **Idempotency** | All payment APIs must be idempotent | Network retries, app restarts, and timeout-driven retries must not create duplicate transactions |
| **Backward Compatibility** | API versioning with 6-month deprecation cycle | Millions of merchant integrations and mini-apps depend on stable APIs; breaking changes cause ecosystem disruption |

---

## Capacity Estimations

### Traffic

```
Registered users:              500,000,000 (500M)
Monthly active users:          200,000,000 (200M)
Daily active users:            200,000,000 (200M, ~40% of registered)

Daily UPI transactions:        700,000,000 (700M)
  P2P transfers:               280M (40%)
  P2M (merchant payments):     350M (50%)
  Bill payments (BBPS):        20M (~3%)
  UPI AutoPay mandates:        30M (~4%)
  Other (requests, refunds):   20M (~3%)

Average TPS:                   700M / 86,400 ≈ 8,100 TPS
Peak TPS:                      ~50,000 TPS (Diwali/New Year; ~6x average)
Sustained peak duration:       2-4 hours during festival windows

NFC tap-to-pay transactions:   5,000,000 (5M) per day
  Growing at:                  ~30% quarter-over-quarter

Reward/cashback events:        50,000,000 (50M) per day
  Scratch card reveals:        30M
  Cashback credits:            15M
  Referral bonuses:            5M

Bill fetch requests:           40,000,000 (40M) per day
  Unique bill payments:        20M (50% conversion from fetch to pay)

Financial service interactions: 10,000,000 (10M) per day
  Loan eligibility checks:    5M
  MF SIP transactions:        3M
  Insurance quotes:            2M

Mini-app launches:             30,000,000 (30M) per day
  Average session duration:    3 minutes
```

### Storage

```
--- User Profiles ---
User record size:              ~3 KB (profile, KYC tier, device info, preferences)
Total user storage:            500M x 3 KB = 1.5 TB

--- VPA Mappings ---
VPA record size:               ~200 bytes (VPA handle, linked bank, user ID, status)
Total VPA records:             ~800M (users can have multiple VPAs)
VPA storage:                   800M x 200 B = 160 GB

--- Transaction Records ---
Transaction record size:       ~3 KB (amount, payer/payee, bank refs, status, timestamps, metadata)
Daily growth:                  700M x 3 KB = 2.1 TB/day
Annual growth:                 ~766 TB/year
Retention:                     10 years (regulatory requirement)

--- Bill Payment Records ---
Bill record size:              ~2 KB (biller ID, consumer number, amount, status, receipt)
Daily growth:                  20M x 2 KB = 40 GB/day
Annual growth:                 ~14.6 TB/year

--- Merchant Profiles ---
Merchant record size:          ~5 KB (business info, QR config, settlement terms, KYC docs)
Total merchant storage:        30M x 5 KB = 150 GB

--- Rewards Ledger ---
Reward event size:             ~500 bytes (type, amount, campaign ID, status, expiry)
Daily growth:                  50M x 500 B = 25 GB/day
Annual growth:                 ~9.1 TB/year

--- Financial Services Records ---
Loan/MF/Insurance record:     ~10 KB (product details, terms, disbursement, repayment schedule)
Monthly growth:                2M x 10 KB = 20 GB/month
Annual growth:                 ~240 GB/year

--- Fraud and Risk Data ---
Risk event record:             ~1 KB (features, score, decision, model version)
Daily growth:                  700M x 1 KB = 700 GB/day (one risk evaluation per txn)
Retention:                     3 years for model training; 7 years for audit

--- Device Fingerprint Store ---
Device record size:            ~500 bytes (hardware ID, OS version, app version, binding status)
Total devices:                 ~600M (some users have multiple devices)
Device storage:                600M x 500 B = 300 GB

--- Mini-App Assets ---
Average mini-app bundle:       ~2 MB (JS, assets, config)
Total mini-app storage:        500 x 2 MB = 1 GB (CDN-cached)

--- Aggregate Annual Storage ---
Total new data per year:       ~800 TB (dominated by transaction records)
With replication (3x):         ~2.4 PB/year
Cumulative (with history):     ~15 PB across full retention window
```

### Bandwidth

```
UPI transaction request:       ~2 KB (payer VPA, payee VPA, amount, device context)
UPI transaction response:      ~1 KB (status, bank ref, timestamp)
Peak transaction bandwidth:    50,000 TPS x 3 KB = ~150 MB/s

Bill fetch request/response:   ~5 KB (biller details, outstanding amounts)
Bill fetch peak:               ~1,000 req/s x 5 KB = ~5 MB/s

Push notifications:            500M/day x ~500 B = ~250 GB/day
Peak push bandwidth:           ~30 MB/s (concentrated around transaction confirmation)

Mini-app asset serving:        ~10,000 req/s x 50 KB avg = ~500 MB/s (CDN-served)

Merchant settlement files:     30M records/day x 500 B = ~15 GB/day (batch)

Internal replication:          3x write amplification on transaction data
                               2.1 TB/day x 3 = ~6.3 TB/day internal bandwidth

Total peak bandwidth:          ~50 Gbps (including API, push, mini-app assets, internal replication)
```

---

## Capacity Summary

| Metric | Estimation | Calculation |
|--------|-----------|-------------|
| **DAU** | ~200M | 500M registered x 40% daily active |
| **Transactions/day** | ~700M | 200M users x 3.5 txns/day average |
| **Peak TPS** | ~50,000 | 6x average during Diwali/New Year festivals |
| **Average TPS** | ~8,100 | 700M / 86,400 seconds |
| **Storage/year** | ~15 PB | 700M x 365 x 3 KB avg record + indexes + replicas + logs |
| **Bill payments/day** | ~20M | ~10% of MAU use bill pay on any given day |
| **Reward events/day** | ~50M | Cashback credits, scratch cards, referral bonuses |
| **NFC transactions/day** | ~5M | Growing ~30% QoQ as contactless adoption increases |
| **Cache size** | ~500 GB | User sessions, VPA mappings, hot merchant configs, rate limits |
| **Bandwidth (peak)** | ~50 Gbps | API traffic + push notifications + mini-app assets + internal replication |

---

## SLO / SLA Table

| Service | Metric | SLO | SLA | Measurement |
|---------|--------|-----|-----|-------------|
| UPI Transaction | Latency p50 | < 800ms | < 1.5s | End-to-end: app to NPCI to bank and back |
| UPI Transaction | Latency p99 | < 2s | < 3s | Including bank processing and callback |
| UPI Transaction | Availability | 99.99% | 99.95% | Successful transactions / total initiated |
| NFC Tap-to-Pay | Latency p99 | < 500ms | < 800ms | Tap to terminal acknowledgment including tokenization |
| Bill Fetch | Latency p95 | < 3s | < 5s | Request to biller API response display |
| Bill Payment | Success rate | > 99.5% | > 99% | Successful bill payments / total attempts |
| Fraud Detection | Scoring latency p99 | < 100ms | < 200ms | Risk score computation per transaction (inline) |
| Reward Engine | Disbursal accuracy | 100% | 100% | Cashback amount must match campaign rules exactly |
| Reward Engine | Latency p99 | < 500ms | < 1s | Scratch card reveal to credit confirmation |
| Merchant Settlement | Accuracy | 100% | 100% | Zero reconciliation mismatches between transactions and settlements |
| Merchant Settlement | Timeliness | T+0 to T+1 | T+2 | Business days from transaction to merchant bank credit |
| Mini-App Load | Latency p95 | < 2s | < 3s | App launch to interactive state |
| Financial Services | Loan disbursal | < 30s | < 60s | Pre-approved loan: approval to bank credit |
| Push Notification | Delivery rate | > 99% | > 98% | Transaction confirmation delivered within 5s |
| Error Rate | Platform-attributable | < 0.1% | < 0.5% | Failures caused by platform (excluding bank/network errors) |
| VPA Resolution | Latency p99 | < 50ms | < 100ms | VPA to bank account lookup from cache |
| Device Binding | Success rate | > 99.9% | > 99.5% | First-attempt device binding success |
| KYC Verification | Processing time | < 60s | < 120s | Document submission to verification result |

---

## Key Estimation Insights

1. **Transaction volume dwarfs all other metrics**: At 700M daily UPI transactions, the transaction processing pipeline is the dominant engineering challenge. Even a 0.01% failure rate means 70,000 failed transactions per day---each potentially requiring manual investigation or customer support intervention. The system must be designed for extreme reliability, not just high throughput.

2. **Storage growth is relentless and retention-bound**: With ~2.1 TB of new transaction data generated daily and a 10-year regulatory retention requirement, storage management becomes a first-class architectural concern. Tiered storage (hot/warm/cold), efficient compression, and partitioning strategies are essential to keep costs manageable while maintaining query performance for recent data.

3. **Peak-to-average ratio demands elastic infrastructure**: The 6x peak-to-average TPS ratio during festivals means the system must either pre-provision for 50,000 TPS (wasting 83% of capacity during normal hours) or implement aggressive auto-scaling with sub-minute warm-up. Connection pool management to sponsor banks becomes the real bottleneck during spikes, as banks have fixed connection limits.

4. **NFC latency budget is extremely tight**: The 500ms end-to-end requirement for tap-to-pay leaves almost no room for network hops. Token resolution, risk scoring, and authorization must happen in parallel rather than sequentially. Pre-computed tokens cached on-device and optimistic authorization with post-facto verification are common patterns to meet this budget.

5. **Reward engine volume exceeds transaction volume on campaign days**: During promotional campaigns, reward events (50M/day baseline) can spike to 200M+, as each transaction triggers multiple reward evaluations (cashback eligibility, streak progress, referral chain updates). The reward budget enforcement system must handle these spikes without over-disbursing---making it effectively a distributed rate limiter with financial consequences for failures.

6. **Multi-rail complexity multiplies failure modes**: Unlike a single-rail payment system, the super app must handle failures across UPI, BBPS, NFC, and card rails---each with different timeout behaviors, retry semantics, and reconciliation processes. A UPI timeout requires a different recovery flow than an NFC timeout, and the platform must route around individual bank outages while maintaining consistent user experience.

7. **VPA resolution is the hottest cache path**: With 800M VPA handles queried on every transaction, VPA-to-bank-account resolution is the single most frequently accessed data path. A cache miss on VPA lookup adds ~200ms to the transaction flow (database round-trip), which can push the p99 past the 2s SLA. The VPA cache must maintain > 99.9% hit rate with consistent invalidation when users change their linked accounts.

8. **Risk data volume rivals transaction data**: Each of the 700M daily transactions generates a ~1 KB risk evaluation record (features, score, model version, decision). At 700 GB/day and 3-year retention for model retraining, the fraud/risk dataset grows to ~750 TB---approaching the size of the transaction dataset itself. This data is critical for model improvement but requires separate storage and processing infrastructure.

---

## Failure Budget Analysis

| Service | Availability Target | Allowed Downtime/Year | Allowed Failed Txns/Day | Impact of Breach |
|---------|---------------------|-----------------------|------------------------|-----------------|
| UPI Payments | 99.99% | 52.6 minutes | 70,000 | NPCI penalty, user trust erosion, merchant revenue loss |
| NFC Payments | 99.95% | 4.38 hours | 2,500 | User fallback to physical card; limited immediate revenue impact |
| Bill Payments | 99.9% | 8.76 hours | 20,000 | Delayed bill payment; low urgency but high complaint volume |
| Reward Engine | 99.9% | 8.76 hours | 50,000 | Missed cashback; user dissatisfaction but no financial loss to user |
| Merchant Settlement | 99.99% | 52.6 minutes | 3,000 | Merchant cash flow impact; breach triggers contractual SLA penalties |
| Mini-App Platform | 99.5% | 43.8 hours | N/A | Third-party service degradation; does not impact core payments |

### Failure Budget Allocation Strategy

- **70% of budget reserved for planned maintenance**: Database migrations, schema changes, and infrastructure upgrades consume the majority of allowed downtime. These are scheduled during low-traffic windows (2 AM -- 5 AM IST).
- **20% reserved for unplanned incidents**: Hardware failures, network partitions, and dependency outages. The active-active architecture should absorb most failures without user-visible impact.
- **10% buffer for unexpected edge cases**: Race conditions, configuration drift, and cascading failures that escape testing.

---

## Seasonal and Event-Driven Scaling Considerations

| Event | Expected TPS Multiple | Duration | Key Bottleneck |
|-------|-----------------------|----------|---------------|
| Diwali / New Year | 6x average (~50,000 TPS) | 2--4 hours | Sponsor bank connection pools; NPCI switch capacity |
| IPL cricket match cashback | 3x average (~25,000 TPS) | 3 hours per match | Reward engine budget enforcement; push notification throughput |
| Salary day (1st/7th of month) | 2x average (~16,000 TPS) | 8 hours | Bill payment biller API capacity; UPI AutoPay mandate execution |
| Flash cashback campaign | 4x for rewards (~200M events) | 30 minutes | Distributed budget counter; cache invalidation storm |
| Government subsidy credit | 2x for specific banks | 2 hours | Single-bank routing concentration; bank-side rate limits |
| Month-end merchant settlement | 1.5x for settlement batch | 4 hours | Settlement reconciliation; batch processing throughput |

These patterns dictate that auto-scaling must be event-aware, not purely reactive. Pre-warming connection pools and scaling compute 30 minutes before predicted spikes (based on historical patterns and calendar events) is essential to avoid cold-start latency during the first minutes of a surge.
