# Buy Now Pay Later (BNPL) System Design

## System Overview

A Buy Now Pay Later platform---exemplified by Klarna, Affirm, Afterpay, and Sezzle---enables consumers to split purchases into interest-free or interest-bearing installments at checkout, while merchants receive the full payment upfront (minus a discount rate). The platform assumes the consumer's credit risk and earns revenue from merchant fees (2--8% of transaction value), late payment charges, and interest on longer-term plans. The core engineering challenge sits at the intersection of **real-time credit decisioning** (approving or declining a consumer in under 2 seconds at checkout using soft credit pulls, alternative data, and ML-based risk scoring), **installment lifecycle management** (scheduling, collecting, retrying, and reconciling payments across millions of active plans with varying terms), **merchant integration at scale** (SDK widgets, server-side APIs, and virtual card issuance for non-integrated merchants), and **regulatory compliance across jurisdictions** (Truth in Lending Act disclosures, state-level lending licenses, EU Consumer Credit Directive, APR calculations, and dispute resolution). Unlike traditional credit cards that offer revolving credit with compound interest, BNPL provides fixed-term, structured repayment plans---making the system a hybrid of a payment processor, a lending platform, and an underwriting engine operating at checkout-speed latency.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Write-heavy at checkout (credit decision + plan creation); read-heavy for repayment queries and merchant dashboards |
| **Latency Sensitivity** | Very High---credit decision must complete in < 2s during checkout to avoid cart abandonment |
| **Consistency Model** | Strong consistency for credit decisions and payment collection; eventual consistency for analytics and merchant reporting |
| **Financial Integrity** | Zero tolerance---every disbursement must have a matching repayment schedule; merchant settlements must reconcile to the penny |
| **Data Volume** | High---50M+ active installment plans, 200M+ scheduled payments, 500K+ merchant configurations |
| **Architecture Model** | Event-driven microservices; ML scoring pipeline inline with checkout; saga-based payment orchestration |
| **Regulatory Burden** | Very High---lending licenses per state/country, TILA/Reg Z disclosures, CFPB oversight, EU CCD, dispute resolution mandates |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Credit decisioning deep dive, installment collection, race conditions |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, fault tolerance, disaster recovery |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Threat model, lending compliance, data privacy, fraud prevention |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting, SLI/SLO dashboards |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trade-offs, trap questions, scoring rubric |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | BNPL (This) | Credit Card | Personal Loan | Digital Wallet | Payment Gateway |
|--------|-------------|-------------|---------------|----------------|-----------------|
| **Credit Model** | Fixed installment plan per purchase; no revolving credit | Revolving credit line with compound interest | Lump-sum disbursement with fixed EMI | No credit; spends pre-loaded balance | No credit; routes existing funds |
| **Decision Speed** | < 2s at checkout (real-time ML scoring) | Pre-approved credit line; no per-purchase decision | Days to weeks (full underwriting) | Instant (balance check only) | Instant (authorization from issuer) |
| **Risk Bearer** | BNPL platform bears consumer default risk | Issuing bank bears default risk | Lending institution bears risk | No credit risk (pre-funded) | No credit risk (pass-through) |
| **Merchant Economics** | Merchant pays 2--8% discount rate; receives full amount upfront | Merchant pays 1.5--3% interchange | No merchant involvement | Merchant pays ~1% processing fee | Merchant pays ~2.5% processing fee |
| **Regulatory Framework** | Lending license, TILA disclosure, state/EU regulations | Banking charter, Reg Z, CARD Act | Banking charter, full underwriting requirements | Money transmitter license, PPI regulations | Payment processor registration |
| **User Data Required** | Name, email, phone, soft credit pull, alternative data | Full credit application at account opening | Full income verification, hard credit pull | Phone number, tiered KYC | Card/bank details only |
| **Revenue Model** | Merchant fees + late fees + interest on long-term plans | Interest on revolving balances + interchange | Interest on principal | Transaction fees + float interest | Transaction processing fees |

---

## What Makes This System Unique

1. **Real-Time Credit Decisioning at Checkout Speed**: Unlike traditional lending that takes days, BNPL must approve or decline a consumer in under 2 seconds---during the most latency-sensitive moment of e-commerce (checkout). This requires a pre-computed feature store, a low-latency ML inference pipeline, and graceful degradation to rules-based scoring when the ML model is unavailable. The decision must balance approval rate (merchant revenue) against default rate (platform loss).

2. **Merchant-Subsidized Consumer Credit**: The economic model is inverted from traditional lending. Merchants pay the BNPL provider a discount rate (2--8%) because BNPL increases average order value by 30--50% and conversion rates by 20--30%. The platform must optimize the merchant discount rate per vertical, risk tier, and volume---making pricing a dynamic, data-driven system rather than a static fee schedule.

3. **Installment Plan as a First-Class Entity**: Each purchase creates an installment plan with its own lifecycle: creation, payment scheduling, collection attempts, partial payments, late fees, hardship modifications, and eventual completion or charge-off. With 50M+ active plans, each at a different stage, the system must efficiently manage millions of scheduled state transitions daily.

4. **Virtual Card Issuance for Universal Compatibility**: For merchants without direct BNPL integration, the platform issues single-use virtual card numbers that work on any card network. This turns the BNPL provider into a card issuer, adding tokenization, authorization, and settlement flows to the core lending platform.

5. **Dual-Sided Marketplace Dynamics**: The platform must simultaneously acquire and retain both consumers (who want flexible payment options) and merchants (who want higher conversion). Network effects are strong: more merchants attract consumers, and more consumers attract merchants. The system must track and optimize both sides of the marketplace.

6. **Collections as a Core Product Flow**: Unlike payment systems where failed transactions are retried and abandoned, BNPL must manage delinquent accounts through a structured lifecycle: dunning sequences, payment plan modifications, hardship programs, and eventually charge-off or debt sale. This collections workflow handles 5--15% of all plans and is critical to financial viability.

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Registered consumers | ~50M | Across all markets |
| Monthly active consumers | ~20M | Consumers with active plans or new purchases |
| Active merchants | ~500K | Integrated via SDK, API, or virtual card |
| Active installment plans | ~50M | Plans with remaining payments |
| New plans created per day | ~2M | Seasonal variation: 3--5x during holiday peaks |
| Scheduled payments per day | ~5M | Collection attempts across all active plans |
| Credit decisions per day | ~3M | Including pre-qualifications and checkout approvals |
| Credit decision latency (p99) | < 2s | End-to-end at checkout |
| Payment collection success rate | ~92% | First-attempt auto-debit success |
| Average order value | ~$150 | Higher than non-BNPL checkout by 30--50% |
| Annual GMV | ~$100B | Total transaction volume processed |
| Merchant discount rate | 2--8% | Varies by vertical, volume, and risk |
| Default rate (charge-off) | 2--4% | After all collection attempts exhausted |
| Late fee revenue share | ~15% | Percentage of total platform revenue |
| Regulatory jurisdictions | 30+ | US states + EU countries + UK + AU |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [8.2 - Stripe/Razorpay](../8.2-stripe-razorpay/) | Payment orchestration, merchant onboarding, idempotency patterns |
| [8.4 - Digital Wallet](../8.4-digital-wallet/) | Ledger patterns, double-entry bookkeeping, fund management |
| [8.5 - Fraud Detection System](../8.5-fraud-detection-system/) | ML-based fraud scoring, feature stores, real-time risk assessment |
| [4.1 - Notification System](../4.1-notification-system/) | Dunning notifications, payment reminders, merchant alerts |
| [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/) | Event streaming for plan state transitions, audit trail |

---

## Sources

- CFPB --- Buy Now, Pay Later: Market Trends and Consumer Impacts
- Affirm Engineering --- Real-Time Underwriting at Scale
- Klarna Engineering --- Building Checkout Experiences for 150M Consumers
- Provenir --- BNPL Credit Decisioning Architecture
- ITmagination --- Architecting a Modern Credit and Loan Underwriting Engine
- TrustDecision --- Credit Decisioning for BNPL: AI-Enhanced Risk Assessment
- New York DFS --- BNPL Regulatory Framework (2026)
- EU Consumer Credit Directive --- BNPL Provisions (2023/2225)
- Marqeta --- Virtual Card Issuance for BNPL Platforms
- Steptoe --- BNPL Regulatory Compliance Under TILA
