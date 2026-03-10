# Requirements & Estimations — AI-Native Mobile Money Super App Platform

## Functional Requirements

| ID | Requirement | Notes |
|---|---|---|
| FR-1 | **P2P Money Transfer** | User sends money to another registered user by entering recipient phone number, amount, and PIN; supports both on-network (same provider) and off-network (interoperable) transfers; confirmation via SMS to both sender and receiver; must work over USSD, app, and SMS channels |
| FR-2 | **Cash-In / Cash-Out via Agent Network** | Customer visits a physical agent to deposit cash (cash-in) or withdraw cash (cash-out); agent initiates transaction on their device, customer confirms via USSD PIN or app; agent's electronic float is debited/credited accordingly; transaction receipt sent via SMS |
| FR-3 | **Merchant Payment** | Customer pays a registered merchant via till number (USSD/app), QR code scan (app), or tap-to-pay (NFC-enabled devices); supports both online and offline merchants; merchant receives instant confirmation; daily settlement to merchant's wallet or linked bank account |
| FR-4 | **Bill Payment & Airtime Purchase** | Customer pays utility bills (electricity, water, TV), school fees, government levies, and purchases airtime/data bundles; integrates with 200+ billers via API; USSD menu-driven selection with saved frequent billers; automated recurring payments from app |
| FR-5 | **Savings Products** | Lock-away savings accounts with configurable goals and durations; automated sweep rules (save X% of every incoming transfer); interest accrual on savings balance; integration with partner banks for higher-yield fixed deposits; withdrawal restrictions based on product type |
| FR-6 | **Nano-Lending (Instant Micro-Loans)** | AI-scored instant loans from $1 to $500 disbursed to wallet in <30 seconds; automatic repayment deduction from incoming transfers; dynamic credit limits based on behavioral scoring; graduated lending (small first loan, increasing with repayment history); support for business nano-loans to merchant agents |
| FR-7 | **Micro-Insurance** | Embedded insurance products: hospital cash cover, life cover, crop insurance, device insurance; opt-in via USSD menu or auto-enrollment at transaction time; daily/weekly premium deduction from wallet; claims initiation via USSD or app; automated claims adjudication for simple cases |
| FR-8 | **Agent Float Management** | Real-time float balance tracking for 300,000+ agents; dealer hierarchy for float distribution; AI-predicted float requirements per agent per day; automated rebalancing alerts and dealer dispatch; agent performance dashboards; commission calculation and disbursement |
| FR-9 | **Cross-Border Remittance** | International money transfers between mobile money wallets across countries (Kenya↔Tanzania, Ghana↔Nigeria, etc.); real-time FX rate display; compliance with sender and receiver country regulations; corridor-specific limits and fees; integration with PAPSS for pan-African settlements |
| FR-10 | **Super App Mini-Apps** | Third-party developers build mini-apps (ride-hailing, e-commerce, ticketing) that run within the mobile money app; payments handled natively via wallet; developer API (Daraja-style) with OAuth-based authentication; sandbox environment for testing |
| FR-11 | **KYC Tiered Registration** | Progressive KYC: Tier 1 (phone number + basic info, low limits) → Tier 2 (ID document upload, medium limits) → Tier 3 (biometric verification, full limits); AI-assisted document verification; real-time ID validation against government databases |
| FR-12 | **USSD Fallback & Multi-Channel Access** | Every critical financial operation accessible via USSD (*334# style), smartphone app, and SMS command; channel-specific UX optimization; session continuity across channels where possible; offline transaction support with store-and-forward reconciliation |

---

## Out of Scope

| Item | Rationale |
|---|---|
| **Physical card issuance** | Focus is on phone-based and agent-based transactions; card programs are a separate product line |
| **Full banking license operations** | Platform operates under mobile money/e-money license, not full banking; deposits held in trust accounts at partner banks |
| **Cryptocurrency or digital asset trading** | Regulatory uncertainty in most African jurisdictions; separate compliance framework needed |
| **Stock market or investment products** | Beyond savings and micro-insurance; requires capital markets licensing |
| **Voice-based IVR transactions** | While relevant for accessibility, IVR adds a separate telephony infrastructure layer; USSD covers feature phone users |
| **White-label platform licensing** | Focus is on operating a single platform; licensing the technology stack to other MNOs is a business model decision, not a system design concern |

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| **P2P Transfer Latency (end-to-end)** | < 3 seconds (USSD), < 2 seconds (app) | USSD session timeout budget: 60–180s for entire flow; each step must complete in <3s to allow 6 steps in a 60s session |
| **USSD Menu Response Time** | < 500ms per screen | MNO USSD gateways impose response timeouts of 5–15s; platform must respond well under this to account for network latency |
| **Ledger Write Latency** | < 100ms | Double-entry ledger writes are on the critical path of every transaction; must be fast enough to leave budget for fraud checks and notifications |
| **Fraud Detection Latency** | < 200ms (inline), < 5s (async deep analysis) | Inline fraud check runs synchronously before ledger commit; high-risk transactions trigger async deep analysis that may reverse the transaction |
| **SMS Confirmation Delivery** | < 10 seconds for 95th percentile | SMS is the primary receipt for USSD users; delayed confirmation causes customer anxiety and support calls |
| **Credit Score Computation** | < 500ms for cached score, < 5s for fresh computation | Nano-loan approval must be near-instant; scores are pre-computed and cached, refreshed on each transaction |
| **Agent Float Query** | < 200ms | Agents check float balance frequently; slow queries impact agent productivity and transaction throughput |

### Reliability & Availability

| Metric | Target | Rationale |
|---|---|---|
| **Platform Availability** | 99.995% (26 min downtime/year) | Mobile money is critical financial infrastructure; any downtime affects millions of daily transactions and erodes trust |
| **Transaction Success Rate** | > 99.5% (excluding user-initiated cancellations) | Failed transactions create reconciliation problems and customer complaints; every failure requires manual investigation |
| **Zero Money Loss Guarantee** | Exactly-once ledger semantics; zero unreconciled discrepancies | Financial system: if money is debited from sender, it must be credited to receiver; any discrepancy is a regulatory and trust crisis |
| **Data Durability** | 99.9999999% (9 nines) | Transaction ledger is the system of record; losing ledger data means losing the financial truth |
| **USSD Session Completion Rate** | > 92% (sessions that complete the intended flow without timeout or drop) | Lower bound accounts for genuine user abandonment; drops below 90% indicate platform latency issues |
| **Recovery Time Objective (RTO)** | < 5 minutes for primary region failover | Extended outage means millions of users cannot access their money; RTO must be aggressive |
| **Recovery Point Objective (RPO)** | 0 (zero data loss for committed transactions) | Synchronous replication for ledger data; no committed transaction can be lost in failover |

---

## Capacity Estimations

### Baseline Assumptions

| Parameter | Value | Source |
|---|---|---|
| Registered users | 65 million | M-Pesa-scale platform across 5+ countries |
| Monthly active users | 40 million | ~60% MAU/registration ratio (industry standard) |
| Daily active users | 18 million | ~45% of MAU transact daily |
| Transactions per day | 90 million | ~5 transactions per DAU (P2P, payments, airtime, etc.) |
| Peak-to-average ratio | 3:1 | Payday spikes (25th–30th of month), holiday periods |
| Average transaction value | $8 | Mix of micro-transactions ($0.50 airtime) and larger P2P ($50+) |
| Active agents | 300,000 | Physical cash-in/cash-out points |
| USSD vs. App split | 55% USSD / 45% App | Feature phone majority but growing smartphone adoption |
| Countries of operation | 7 | Multi-jurisdiction deployment |

### Throughput Calculations

| Metric | Calculation | Result |
|---|---|---|
| **Average TPS** | 90M transactions ÷ 86,400 seconds | ~1,042 TPS |
| **Peak TPS** | 1,042 × 3 (peak ratio) | ~3,125 TPS |
| **Burst TPS** | 3,125 × 2.5 (payday + holiday overlap) | ~7,800 TPS |
| **Design capacity** | Burst TPS × 1.5 (headroom) | ~12,000 TPS |
| **USSD sessions/sec (peak)** | 3,125 × 0.55 (USSD share) | ~1,720 concurrent USSD sessions/sec |
| **SMS notifications/sec (peak)** | 3,125 × 2 (sender + receiver confirmation) | ~6,250 SMS/sec |
| **Fraud checks/sec (peak)** | 3,125 (every transaction) | ~3,125 evaluations/sec |

### Storage Estimations

| Data Type | Calculation | Annual Volume |
|---|---|---|
| **Transaction ledger** | 90M txns/day × 1 KB/txn × 365 days | ~33 TB/year |
| **USSD session logs** | 50M sessions/day × 500 bytes/session × 365 | ~9 TB/year |
| **Fraud feature vectors** | 90M txns/day × 2 KB features × 365 | ~66 TB/year |
| **Agent float snapshots** | 300K agents × 24 snapshots/day × 200 bytes × 365 | ~0.5 TB/year |
| **Credit score history** | 40M users × monthly recalc × 500 bytes × 12 | ~0.24 TB/year |
| **SMS delivery logs** | 180M messages/day × 300 bytes × 365 | ~20 TB/year |
| **Audit trail (regulatory)** | 90M events/day × 2 KB × 365 × 7-year retention | ~460 TB total |
| **Total hot storage (1 year)** | Sum of above | ~129 TB/year |

### Bandwidth Estimations

| Flow | Calculation | Bandwidth |
|---|---|---|
| **USSD gateway ↔ Platform** | 1,720 sessions/sec × 500 bytes avg payload | ~7 Mbps |
| **App ↔ API gateway** | 1,400 requests/sec × 5 KB avg | ~56 Mbps |
| **Platform ↔ SMS gateway** | 6,250 messages/sec × 300 bytes | ~15 Mbps |
| **Platform ↔ Partner banks** | 200 settlement batches/day × 10 MB avg | ~2 Mbps |
| **Inter-datacenter replication** | Synchronous ledger replication | ~50 Mbps |
| **Fraud ML inference** | 3,125 requests/sec × 3 KB feature vector | ~75 Mbps |
| **Total peak bandwidth** | Sum of above with 2× headroom | ~410 Mbps |
