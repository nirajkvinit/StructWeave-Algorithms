# Distributed Ledger / Core Banking System Design

## System Overview

A core banking system---the financial backbone of institutions like JPMorgan Chase, HSBC, and modern neobanks like Monzo and N26---manages the authoritative record of every account, balance, and transaction across an entire bank. At its heart lies a **distributed ledger** built on double-entry bookkeeping principles that have governed financial record-keeping since 1397: every transaction produces at least one debit entry and one credit entry of equal value, and the system's fundamental invariant is that total debits must always equal total credits across the entire ledger. The core banking platform orchestrates deposit accounts, loan accounts, payment processing, interest accrual, fee collection, and regulatory reporting---all while maintaining ACID guarantees across billions of ledger entries distributed over sharded databases. Modern core banking platforms like Thought Machine Vault, Temenos Transact, Mambu, and 10x Banking have shifted from monolithic mainframe architectures to cloud-native, API-first, microservices-based designs---yet the underlying ledger consistency challenge remains the same. The engineering complexity lies at the intersection of **General Ledger / Sub-Ledger reconciliation** (ensuring subsidiary account records always balance against control accounts), **cross-shard transactional consistency** (debiting one account and crediting another that live on different database shards must be atomic), **real-time interest calculation** (accruing interest across 100M+ accounts using varying day-count conventions, compounding schedules, and tiered rates), **multi-currency support** (applying FX rates at transaction time while maintaining position limits), and **regulatory compliance** (Basel III capital adequacy, SOX audit trails, PSD2 open banking APIs, and AML transaction monitoring). Unlike a digital wallet that holds stored value for consumers, a core banking ledger is the institution's canonical financial record---subject to central bank oversight, prudential regulation, and external audit.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Write-heavy for posting: every financial event creates 2+ immutable ledger entries; read-heavy for balance inquiries, statements, and reporting |
| **Latency Sensitivity** | Mixed---real-time payments require < 500ms posting; batch operations (interest accrual, EOD) tolerate minutes |
| **Consistency Model** | Strong consistency for ledger posting (double-entry invariant must hold at all times); eventual consistency for reporting views and analytics |
| **Financial Integrity** | Zero tolerance---the general ledger must always balance; every sub-ledger must reconcile to its GL control account |
| **Data Volume** | Extreme---billions of ledger entries per year; 100M+ accounts; 7-10 year retention for regulatory compliance |
| **Architecture Model** | Event-sourced immutable ledger as the core; CQRS for separating posting from querying; saga-based orchestration for cross-shard operations |
| **Regulatory Burden** | Very High---Basel III capital requirements, SOX audit trails, PSD2/Open Banking APIs, AML/KYC, data residency |
| **Complexity Rating** | **Extreme** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key design decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Ledger consistency, cross-shard posting, interest engines, hot accounts |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Sharding strategies, multi-region, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Basel III, SOX, PSD2, encryption, access control |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, reconciliation dashboards |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs, scoring rubric |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Core Banking (This) | Digital Wallet (8.4) | Payment Gateway (5.5) | Trading Platform (8.3) |
|--------|---------------------|---------------------|----------------------|----------------------|
| **Ledger Scope** | Full GL/SL hierarchy with Chart of Accounts; institution-wide | Single-purpose stored-value ledger | No internal ledger; pass-through | Order book + settlement ledger |
| **Account Types** | Deposits, loans, credit lines, nostro/vostro, internal GL accounts | Consumer wallets with tiered KYC | Merchant settlement accounts | Trading + demat accounts |
| **Interest Engine** | Full accrual engine: day-count conventions, tiered rates, compounding | Minimal (promotional cashback) | None | Margin interest only |
| **Regulatory Framework** | Banking charter, Basel III, SOX, central bank oversight | Money transmitter / PPI license | Payment processor license | Securities regulator (SEBI/SEC) |
| **Settlement Model** | Real-time gross settlement (RTGS), batch netting, T+0/T+1/T+2 | Instant internal ledger moves | Depends on bank settlement | T+1 (equities), T+0 (intraday) |
| **Multi-Currency** | Full FX desk: position management, nostro reconciliation | Basic currency conversion | Card network FX | Exchange-listed currency pairs |
| **Consistency Guarantee** | GL must balance at all times; sub-ledgers reconcile to GL control accounts | Debits = credits per wallet | At-least-once with reconciliation | Order book + settlement atomicity |
| **Product Configurability** | Highly configurable: product catalog drives account behavior (rates, fees, limits) | Fixed product types | Fixed payment flows | Fixed instrument types |

---

## What Makes This System Unique

1. **General Ledger / Sub-Ledger Architecture**: Unlike single-purpose ledgers, a core banking system maintains a hierarchical ledger structure. Sub-ledgers (deposits, loans, cards) maintain detailed account-level records. The General Ledger aggregates these into control accounts organized by a Chart of Accounts (assets, liabilities, equity, revenue, expenses). The critical invariant is that every sub-ledger's total must reconcile to its corresponding GL control account---a mismatch signals a system error.

2. **Product Catalog as Configuration Engine**: Modern core banking platforms treat financial products (savings accounts, term deposits, credit lines) as configurations rather than code. A product definition specifies interest rates, fee schedules, limit structures, accrual rules, and lifecycle events. The same ledger engine processes all products---the product catalog tells it *how*. This is what enables banks to launch new products in days rather than months.

3. **Interest Accrual at Scale**: Calculating interest across 100M+ accounts requires processing each account's principal balance, applicable rate (potentially tiered), day-count convention (Actual/365, 30/360, Actual/Actual), compounding frequency, and accrual period---then posting the accrued interest as a ledger entry. This batch operation must complete within the overnight processing window while maintaining ledger consistency.

4. **Multi-Entity / Multi-Tenant Design**: A core banking platform often serves multiple banking entities (subsidiaries, white-label partners) from a single deployment. Each entity has its own Chart of Accounts, regulatory reporting, and fund segregation---but shares infrastructure. Tenant isolation at the data layer is a non-negotiable requirement.

5. **Legacy Modernization via Strangler Fig**: Most core banking transformations cannot be "big bang" replacements. The strangler fig pattern routes individual product lines or customer segments from the legacy mainframe to the new platform incrementally, using an anti-corruption layer to translate between old and new data models. Dual-write periods require careful reconciliation.

6. **Regulatory Reporting as First-Class Citizen**: Basel III capital adequacy ratios, liquidity coverage ratios, and risk-weighted asset calculations are not afterthoughts---they consume ledger data continuously. The system must produce auditable, tamper-evident records that satisfy SOX requirements and central bank examinations.

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Total accounts | 100M+ | Deposit, loan, credit, internal GL accounts |
| Active accounts | ~60M | Monthly transacting accounts |
| Ledger entries per day | ~2B | Double-entry: 2-4 entries per transaction |
| Transactions per day | ~500M | Payments, transfers, fees, interest postings |
| Peak transactions/sec | ~50,000 | Salary runs, month-end processing, festival peaks |
| Average transaction value | ~$250 | Mix of retail and commercial |
| Posting latency (p99) | < 500ms | Real-time payment posting |
| Batch processing window | < 6 hours | EOD interest accrual, statement generation |
| Ledger imbalance tolerance | 0 | GL must balance; SL must reconcile to GL |
| Data retention | 7-10 years | Regulatory and audit requirement |
| Daily settlement volume | ~$125B | Aggregate across all payment rails |
| Interest accrual accounts | 80M+ | Accounts requiring daily interest calculation |
| Multi-currency support | 30+ currencies | With real-time FX rate application |
| Concurrent banking entities | 5-20 | Multi-tenant / multi-entity deployment |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [8.4 - Digital Wallet](../8.4-digital-wallet/) | Double-entry ledger, P2P atomicity, stored-value accounts |
| [8.2 - Stripe/Razorpay](../8.2-stripe-razorpay/) | Payment orchestration, idempotency, settlement pipelines |
| [8.3 - Zerodha](../8.3-zerodha/) | Trading ledger, settlement cycles, regulatory compliance |
| [5.5 - Payment Processing](../5.5-payment-processing-system/) | Payment rails integration, PCI compliance |
| [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/) | Event streaming for ledger events, audit trail |
| [8.5 - Fraud Detection](../8.5-fraud-detection/) | AML monitoring, transaction scoring |

---

## Sources

- Stripe Engineering --- Ledger: System for Tracking and Validating Money Movement
- Uber Engineering --- Immutable Ledger Consistency at Scale
- Modern Treasury --- Double-Entry Bookkeeping for Financial Systems
- Thought Machine --- Vault Core: Cloud-Native Core Banking Architecture
- McKinsey --- Next-Generation Core Banking Platforms
- Basel Committee on Banking Supervision --- Basel III Framework
- Temporal --- Designing High-Performance Financial Ledgers
- Griffin --- Building an Immutable Bank
- Martin Fowler --- Strangler Fig Application Pattern
- PwC --- Basel III Endgame: Capital Requirements
