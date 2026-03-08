# Digital Wallet System Design

## System Overview

A digital wallet---exemplified by Apple Pay, Google Pay, Paytm, and PhonePe---manages virtual stored-value accounts that enable users to load money (top-up), transfer funds peer-to-peer (P2P), pay merchants via QR code or NFC, and track transaction history across a financial-grade ledger. Paytm processes over 6 billion monthly transactions; Google Pay India handles 450M+ monthly active users. The core engineering challenge is the intersection of **ledger consistency** (every rupee/dollar must be accounted for via double-entry bookkeeping---debit one account, credit another---with zero tolerance for imbalance), **P2P transfer atomicity** (debiting sender and crediting receiver must be an all-or-nothing operation, even when accounts are on different database shards), **double-spend prevention** (a user with 100 balance must never be able to initiate two simultaneous 80 transfers that both succeed), and **regulatory compliance** (tiered KYC verification, transaction limits, anti-money-laundering monitoring, and money transmission licensing). Unlike payment gateways that simply route transactions between banks, a digital wallet holds actual monetary value on behalf of users---making it a quasi-banking system subject to financial regulations, audit requirements, and fiduciary responsibilities for user funds.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Write-heavy: every top-up, transfer, and payment creates ledger entries; balance reads are frequent but derived from ledger |
| **Latency Sensitivity** | High---P2P transfers must complete in < 2s; QR/NFC payments must complete in < 1s for tap-to-pay UX |
| **Consistency Model** | Strong consistency for ledger operations (balance check + debit must be atomic); eventual consistency for transaction history views and analytics |
| **Financial Integrity** | Zero tolerance---ledger must always balance (sum of all debits = sum of all credits); no double-spend, no negative balances |
| **Data Volume** | Very High---200M+ transactions/day, each producing 2+ ledger entries; full audit trail retained for 7+ years |
| **Architecture Model** | Double-entry ledger as foundation; saga-based orchestration for cross-shard P2P; event-driven for notifications and fraud scoring |
| **Regulatory Burden** | Very High---KYC/AML, money transmission licenses, PCI-DSS for card-linked wallets, data localization |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Ledger consistency, P2P atomicity, double-spend prevention, hot wallet management |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Wallet sharding, ledger partitioning, multi-region, idempotent operations |
| [06 - Security & Compliance](./06-security-and-compliance.md) | PCI-DSS, KYC/AML, tiered verification, fraud detection, encryption |
| [07 - Observability](./07-observability.md) | Transaction success rate, ledger reconciliation, fraud metrics, latency percentiles |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trade-offs, trap questions |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Digital Wallet (This) | Payment Gateway (5.5) | Traditional Banking | Crypto Wallet |
|--------|----------------------|----------------------|--------------------|--------------|
| **Funds Ownership** | Platform holds funds on behalf of users (custodial) | Routes transactions; never holds funds | Bank holds deposits under banking license | User holds private keys (non-custodial) |
| **Ledger Model** | Internal double-entry ledger per user | Pass-through; no internal ledger per user | Core banking ledger (GL/SL) with T+1 settlement | Blockchain is the public ledger |
| **Transfer Speed** | Instant (same-ledger P2P) | Depends on bank settlement (T+0 to T+2) | T+0 to T+2 (ACH, wire) | Minutes to hours (block confirmation) |
| **Balance Source** | Internal ledger (authoritative) | No stored balance; queries bank/card network | Core banking system | Blockchain UTXO/account state |
| **Regulatory Model** | Money transmitter / PPI license | Payment processor license | Full banking charter | Varies (MSB, VASP, unregulated) |
| **Consistency Requirement** | Absolute (double-entry must balance) | At-least-once delivery with reconciliation | Absolute (regulated) | Consensus-based (eventual finality) |
| **Identity Model** | Tiered KYC (basic → full based on limits) | Merchant-level onboarding | Full KYC at account opening | Pseudonymous or anonymous |

---

## What Makes This System Unique

1. **Double-Entry Ledger as the Core Primitive**: Every financial operation---top-up, transfer, payment, refund, fee collection---is expressed as a pair of ledger entries (debit one account, credit another). The sum of all debits must always equal the sum of all credits. This is not just an accounting convention; it is the fundamental invariant that prevents money from being created or destroyed within the system. Every architectural decision---from database schema to API design---flows from preserving this invariant.

2. **Atomic Balance-Check-and-Debit**: The most critical operation is ensuring that a balance check and the subsequent debit happen atomically. If a user has 100 and initiates two concurrent 80 transfers, only one must succeed. This requires either pessimistic locking (SELECT FOR UPDATE), optimistic concurrency control (version-based CAS), or serialized execution per wallet---and the choice has profound scalability implications.

3. **P2P Transfers Across Shard Boundaries**: When sender and receiver wallets live on different database shards, the transfer becomes a distributed transaction. Unlike banking systems that use T+1 settlement, digital wallets promise instant transfers---requiring either a saga pattern with compensating transactions or a dedicated transfer ledger that acts as an intermediary.

4. **Custodial Responsibility for User Funds**: Unlike payment gateways that simply route transactions, a digital wallet holds actual money. This creates fiduciary obligations: user funds must be escrowed in partner banks, the operational float must be monitored, and the platform's own revenue (fees, interest) must be cleanly separated from user funds in the ledger.

5. **Tiered KYC with Progressive Feature Unlock**: Regulators require identity verification proportional to risk. A minimal-KYC wallet (phone number only) might allow 10,000/month; a full-KYC wallet (government ID + address proof) allows 200,000/month. The system must enforce transaction limits per KYC tier and support seamless upgrade flows.

6. **Multi-Channel Payment Surface**: The same wallet balance is accessible via NFC tap (tokenized through secure element), QR code scan (merchant-presented or user-presented), in-app payments, bill payments, and bank transfers---each with different latency requirements, security models, and regulatory treatment.

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Registered wallets | ~500M | Across all user tiers |
| Monthly active wallets | ~200M | ~40% monthly active rate |
| Transactions per day | ~200M | P2P + merchant + top-up + bill pay |
| Peak transactions/sec | ~23,000 | 10x average during festivals/events |
| Ledger entries per day | ~500M | 2-3 entries per transaction (double-entry + fees) |
| Average transaction value | ~$15 | Dominated by small-value P2P and merchant payments |
| P2P transfer latency (p99) | < 2s | End-to-end including ledger write |
| QR/NFC payment latency (p99) | < 1s | Tap-to-pay experience |
| Ledger imbalance tolerance | 0 | Sum(debits) must equal Sum(credits) at all times |
| Transaction history retention | 7+ years | Regulatory and audit requirement |
| Daily settlement volume | ~$3B | Aggregate of all transaction values |
| KYC tier distribution | 60% basic, 30% intermediate, 10% full | Pyramid shaped |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [5.5 - Payment Processing System](../5.5-payment-processing-system/) | Payment gateway integration, PCI compliance, tokenization |
| [8.2 - Stripe/Razorpay](../8.2-stripe-razorpay/) | Payment orchestration, merchant settlement, idempotency |
| [8.3 - Zerodha](../8.3-zerodha/) | Financial ledger patterns, order matching, regulatory compliance |
| [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/) | Event streaming for transaction events, audit trail |
| [4.1 - Notification System](../4.1-notification-system/) | Real-time transaction notifications, push alerts |

---

## Sources

- Modern Treasury --- How to Build a Digital Wallet Product
- Uber Engineering --- Ledger System Design at Scale (Immutable Ledger Consistency)
- Stripe Engineering --- Double-Entry Accounting for Payment Systems
- Apple --- Apple Pay Security and Privacy Overview
- EMVCo --- Payment Tokenization Specification
- Reserve Bank of India --- Master Direction on Prepaid Payment Instruments
- FinCEN --- Money Services Business Registration Requirements
- SEON --- Digital Wallet Fraud Prevention Strategies
- AlgoMaster --- Design Digital Wallet System Design Interview Guide
- PCI Security Standards Council --- PCI-DSS v4.0 Requirements
