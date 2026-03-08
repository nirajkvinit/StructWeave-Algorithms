# Payment Gateway System Design (Stripe / Razorpay)

## System Overview

A payment gateway---exemplified by Stripe, Razorpay, Adyen, and Square---orchestrates the secure movement of money between customers, merchants, card networks, and banks. Stripe processes over 1 billion API requests per day and handles hundreds of billions of dollars annually; Razorpay processes 7,500+ UPI transactions per second across India's 106 billion annual digital payment transactions. The core engineering challenge is the intersection of **exactly-once payment semantics** (ensuring a customer is charged precisely once despite network failures, retries, and concurrent requests), **multi-party financial orchestration** (coordinating authorization, capture, and settlement across card networks, issuing banks, acquiring banks, and merchant accounts with 2-3 second latency budgets), **regulatory compliance** (PCI-DSS Level 1 for card data, SOC 2 for operational controls, PSD2/SCA for European transactions, and country-specific regulations), and **financial integrity** (double-entry ledger systems that must balance to the penny across billions of daily transactions). Unlike typical CRUD applications, a payment gateway operates in a domain where bugs have direct monetary consequences---a double charge, a missed refund, or a ledger imbalance means real money is lost or misattributed.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Write-heavy on the payment path (create, authorize, capture); read-heavy for dashboards and reporting |
| **Latency Sensitivity** | Very High---payment authorization p99 < 2s; webhook delivery p99 < 5s |
| **Consistency Model** | Strong consistency for payment state transitions and ledger; eventual consistency for analytics and reporting |
| **Financial Integrity** | Zero tolerance---every cent must be accounted for; double-entry ledger must balance at all times |
| **Idempotency** | Critical---every mutating API call must be idempotent to prevent double charges on retry |
| **External Dependency** | High---card networks (Visa, Mastercard), issuing banks, acquiring banks, 3D Secure providers |
| **Regulatory Burden** | Very High---PCI-DSS Level 1, SOC 2, PSD2/SCA, country-specific payment regulations |
| **Data Volume** | High---1B+ API requests/day, 100M+ transactions/day, petabytes of ledger entries/year |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, payment flow, webhook delivery, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design with idempotency, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Idempotency keys, exactly-once semantics, webhook delivery, ledger consistency |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Payment path isolation, multi-region, circuit breakers, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | PCI-DSS Level 1, tokenization vault, 3D Secure, fraud detection |
| [07 - Observability](./07-observability.md) | Payment success rates, authorization metrics, webhook delivery, reconciliation |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Payment Gateway (This) | E-Commerce Platform | Banking Core | Digital Wallet |
|--------|----------------------|---------------------|-------------|----------------|
| **Core Challenge** | Exactly-once payment semantics across distributed parties | Catalog, cart, fulfillment orchestration | Account management, interest calculation | Balance management, P2P transfers |
| **Consistency Requirement** | Strong consistency on payment state + ledger balance | Eventual consistency acceptable for most paths | Strong consistency for all account mutations | Strong consistency for balance, eventual for history |
| **External Dependencies** | Card networks, issuing banks, acquiring banks, 3D Secure | Payment gateway, shipping carriers | Central bank, interbank networks | Payment gateway, bank integrations |
| **Idempotency** | Critical---every API call must be idempotent | Important for checkout, less critical elsewhere | Important for transfers | Important for transfers |
| **Regulatory Scope** | PCI-DSS L1, SOC 2, PSD2, country-specific | PCI-DSS (delegated to gateway), consumer protection | Basel III, banking regulations, AML/KYC | E-money regulations, AML/KYC |
| **Latency Budget** | 2-3s for authorization (card network round-trip) | 5-10s for checkout flow | Seconds to minutes for transfers | Sub-second for balance checks |
| **Data Sensitivity** | Card numbers (PAN), CVV, bank account details | Addresses, order history | Full financial records, SSN | Transaction history, balance |
| **Revenue Model** | Per-transaction fees (2.9% + $0.30 typical) | Product margin | Interest spread, fees | Transaction fees, float income |

---

## What Makes This System Unique

1. **Exactly-Once Payment Semantics in a Distributed System**: Unlike most distributed systems where "at-least-once" with deduplication is acceptable, a payment gateway must guarantee that a customer is charged exactly once. Network timeouts between the gateway and card network create an ambiguous state---did the charge succeed or not? The idempotency key system, combined with request fingerprinting and state machines, resolves this ambiguity.

2. **Multi-Party Authorization Flow with Strict Latency Budgets**: A single payment traverses the merchant's application, the payment gateway, the acquiring bank, the card network (Visa/Mastercard), and the issuing bank---five parties, each with their own processing time, all within a 2-3 second window. Any party can decline, timeout, or return an ambiguous response.

3. **Double-Entry Ledger at Massive Scale**: Every financial movement---charge, refund, fee, payout, dispute---must be recorded as balanced debit/credit entries in an immutable ledger. Stripe's ledger processes 5 billion events per day and verifies 99.99% of dollar volume within four days. A single imbalance means money is unaccounted for.

4. **Webhook Delivery as a Distributed Notification System**: Merchants depend on webhooks for real-time payment status updates. The gateway must deliver events with at-least-once semantics, exponential backoff retry for up to 3 days, cryptographic signature verification, and handle millions of merchant endpoints with varying reliability.

5. **PCI-DSS Level 1 as an Architectural Constraint**: Handling raw card numbers (PANs) requires network segmentation, hardware security modules (HSMs) for key management, tokenization vaults, quarterly penetration testing, and annual on-site audits. This compliance requirement fundamentally shapes the system architecture---the tokenization vault becomes the most isolated and heavily protected component.

6. **Payment State Machine with External Authority**: Unlike application-level state machines, the payment state machine must reconcile local state with external authoritative systems (card networks, banks). The gateway may believe a payment succeeded, but the network may have declined it---or vice versa. Reconciliation processes must detect and resolve these discrepancies daily.

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| API requests per day | ~1B+ | Stripe's reported volume |
| Transactions per day | ~100M | Across all payment methods |
| Peak transactions/sec | ~15,000 | 10x average during flash sales |
| Authorization latency | 1-3s | Card network round-trip |
| Webhook events per day | ~500M | Multiple events per transaction lifecycle |
| Webhook retry window | 3 days | Exponential backoff in live mode |
| Idempotency key TTL | 24 hours | Keys pruned after 24h |
| Ledger events per day | ~5B | Stripe's reported ledger volume |
| Ledger verification | 99.99% within 4 days | Dollar volume fully reconciled |
| Card authorization hold | 7 days default | Up to 30 days with extended auth |
| Dispute response window | 9-30 days | Varies by network and region |
| PCI-DSS audit frequency | Annual | On-site assessment by QSA |
| Merchant webhook endpoints | ~10M+ | Each with different reliability |
| Settlement cycle | T+2 | Funds available 2 business days after capture |
| UPI transactions/sec (India) | ~7,500 | Razorpay/India ecosystem peak |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [5.5 - Payment Processing System](../5.5-payment-processing-system/) | Core payment flow, card network integration |
| [8.1 - Amazon E-Commerce](../8.1-amazon/) | Merchant-side payment integration, checkout flow |
| [8.4 - Digital Wallet](../8.4-digital-wallet/) | Stored value, P2P transfers, wallet-as-payment-method |
| [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/) | Event streaming for payment events, webhook fan-out |
| [2.1 - Distributed Cache](../2.1-distributed-cache/) | Idempotency key storage, rate limiting |

---

## Sources

- Stripe Engineering Blog --- Designing Robust and Predictable APIs with Idempotency
- Stripe Engineering Blog --- Ledger: Stripe's System for Tracking and Validating Money Movement
- Stripe Documentation --- PaymentIntents Lifecycle and State Machine
- Stripe Documentation --- Webhook Event Delivery and Retry Strategy
- Brandur Leach --- Implementing Stripe-like Idempotency Keys in Postgres
- PCI Security Standards Council --- Tokenization Guidelines Information Supplement
- Visa --- Compelling Evidence 3.0 Rules (2025)
- Mastercard --- Chargeback Guide Merchant Edition (2025)
- Razorpay Engineering --- Banking Stack Architecture (2025)
- ByteByteGo --- How VISA Works When Swiping a Credit Card
- NPCI --- Unified Payments Interface Transaction Statistics (2025)
