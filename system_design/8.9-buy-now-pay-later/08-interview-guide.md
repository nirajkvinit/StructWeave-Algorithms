# Interview Guide

## 45-Minute Interview Pacing

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|-----------------|
| **1. Requirements** | 5 min | Clarify scope, identify key constraints | Functional requirements, scale numbers, key SLOs |
| **2. High-Level Design** | 12 min | Architecture, core components, data flow | System diagram, checkout flow, component responsibilities |
| **3. Deep Dive** | 18 min | Credit decisioning, payment collection, or settlement | Detailed design of 1--2 critical paths with trade-offs |
| **4. Scale & Reliability** | 7 min | Scaling strategy, failure modes | Sharding approach, failure handling, degradation strategy |
| **5. Wrap-Up** | 3 min | Extensions, trade-offs, what you'd do with more time | Prioritized list of improvements |

---

## Phase 1: Requirements Gathering (5 min)

### Questions to Ask the Interviewer

1. **"What type of BNPL are we designing---interest-free Pay-in-4 only, or also longer-term installment loans with APR?"**
   *Why*: This determines whether the system is primarily a payment facilitator (simpler) or a lending platform (requires underwriting, TILA compliance, interest calculation).

2. **"Should the system support both integrated merchants (SDK/API) and non-integrated merchants (via virtual card)?"**
   *Why*: Virtual card issuance adds card network integration, authorization handling, and settlement complexity.

3. **"What's the geographic scope---US only, or multi-jurisdictional?"**
   *Why*: Multi-jurisdiction means a rules engine for state/country-specific lending regulations, fee caps, and disclosure formats.

4. **"Is the credit decision made at checkout in real-time, or is the consumer pre-approved with a credit line?"**
   *Why*: Real-time decision requires low-latency ML pipeline; pre-approval means simpler checkout but stale risk data.

### Establishing Constraints

```
After discussion, state your assumptions clearly:

"Based on our discussion, I'll design a BNPL platform that:
 - Supports Pay-in-4 (interest-free) and Pay-in-N (with APR) plans
 - Makes real-time credit decisions at checkout in < 2 seconds
 - Integrates with merchants via SDK/API and supports virtual cards
 - Handles 50M consumers, 500K merchants, $100B annual GMV
 - Operates across multiple US states with varying regulations
 - Targets 92%+ first-attempt payment collection rate"
```

---

## Phase 2: High-Level Design (12 min)

### Recommended Approach

1. **Start with the checkout flow** (the critical path). Draw the sequence: consumer selects BNPL → credit decision → plan options displayed → consumer confirms → first payment charged → merchant notified.

2. **Identify core services**: Credit Decision, Plan Management, Payment Orchestration, Merchant Settlement, Collections, Virtual Card.

3. **Draw the data flow**: Show how data moves from checkout through to merchant settlement and consumer payments.

4. **Highlight the key design decision**: Real-time credit decisioning architecture---this is what differentiates BNPL from a payment system.

### Common Mistakes at This Phase

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Designing a generic payment system | Misses the credit/lending dimension entirely | Lead with the credit decision as the core differentiator |
| Skipping the merchant side | BNPL is a two-sided marketplace | Show both consumer checkout flow AND merchant settlement flow |
| Treating plans as simple database rows | Plans have complex lifecycle with state transitions | Mention the state machine: active → overdue → delinquent → charge_off |
| Ignoring regulatory requirements | Compliance is a first-class concern, not an afterthought | Mention TILA disclosures and adverse action notices in the checkout flow |

---

## Phase 3: Deep Dive (18 min)

The interviewer will typically ask you to go deep on one of these areas. Be prepared for any of them.

### Deep Dive Option A: Credit Decisioning Engine

**Key points to cover:**
- **Staged pipeline**: Pre-screen → Data assembly (parallel) → ML inference → Decision logic → Disclosure generation
- **Latency budget**: 2s total. Bureau call (~500ms with caching) dominates. Feature store (~10ms). ML inference (~50ms).
- **Feature store**: Pre-computed features refreshed hourly; event-driven updates for material changes. 50M vectors, 25GB, served from memory.
- **ML model serving**: Low-latency inference, blue-green deployment, shadow scoring for model validation.
- **Race condition**: Concurrent checkouts for the same consumer. Solution: credit reservation with TTL.
- **Fallback**: If ML model is down, fall back to rules-based scoring with conservative thresholds.

**Impressive addition**: "We need to store the entire feature vector and model version with every decision for regulatory audit. If a consumer disputes a decline, we must be able to replay the exact decision with the exact inputs."

### Deep Dive Option B: Payment Collection System

**Key points to cover:**
- **Batch architecture**: 5M daily collections in 3 windows. Partitioned by processor, prioritized by delinquency risk.
- **Idempotency**: Every attempt keyed by `payment_id + attempt_number`. Safe to replay.
- **Intelligent retry**: Different strategies for insufficient funds (wait for paycheck) vs. expired card (notify consumer) vs. processor error (immediate retry).
- **Thundering herd**: Staggered batch submission with jitter to avoid processor rate limiting.
- **Delinquency escalation**: Grace period → late fee → dunning sequence → hardship offer → charge-off → debt sale.
- **Financial impact**: 1% improvement in collection rate = ~$45M annual recovery on $4.5B outstanding.

**Impressive addition**: "The retry schedule should align with common payroll cycles---retry on the 1st, 15th, and last day of the month when consumers are most likely to have funds."

### Deep Dive Option C: Merchant Settlement & Reconciliation

**Key points to cover:**
- **Net settlement**: Aggregate all transactions minus refunds and chargebacks, deduct discount fee, transfer net amount.
- **Reconciliation**: Three-way reconciliation between plan creation events, payment events, and settlement records. Zero-tolerance for discrepancies.
- **Race condition**: Late refund near settlement cutoff. Solution: snapshot-based aggregation with carry-over.
- **Settlement cadence**: T+1 for premium merchants, T+3 for standard. Configurable per merchant.
- **Dispute holdback**: Merchants with high dispute rates get settlement holdbacks (% of funds held in reserve).

---

## Trap Questions and How to Handle Them

### "Why not just use a pre-approved credit line like a credit card?"

**Trap**: This seems simpler but misses the BNPL value proposition.

**Good answer**: "Pre-approved credit lines have stale risk data---a consumer's financial situation can change between approval and purchase. Per-purchase decisioning uses the most current data. Additionally, BNPL's regulatory positioning depends on being transaction-specific lending, not revolving credit. A revolving credit line would trigger full credit card regulations (CARD Act), which impose more onerous compliance requirements."

### "How do you handle a consumer who opens 10 plans across 10 merchants simultaneously?"

**Trap**: Tests understanding of exposure management across a distributed system.

**Good answer**: "Each credit decision checks the consumer's total outstanding balance plus active credit reservations. When a decision is approved but not yet confirmed, a reservation with a 15-minute TTL is created. Subsequent decisions see the reservation and reduce available spending power. This prevents over-extension without requiring a global lock. The spending_power field on the consumer profile acts as the ceiling, and total_outstanding + active_reservations is checked atomically against it."

### "What happens if your ML model starts approving too many consumers who later default?"

**Trap**: Tests understanding of model monitoring and feedback loops.

**Good answer**: "Model performance is monitored via a delayed feedback loop: we compare predicted default probability against actual default rates at 30/60/90 day intervals. If the model's calibration drifts (e.g., predicted 5% default but actual is 8%), we alert the underwriting team. In the meantime, we can immediately tighten the risk threshold (e.g., shift the cutoff from 0.3 to 0.25) as a circuit breaker. This is a config change, not a model retrain, so it takes effect in minutes. Long-term, we retrain the model with the recent cohort data."

### "How do you calculate APR for BNPL?"

**Trap**: Tests understanding of financial computation and regulatory requirements.

**Good answer**: "For interest-free Pay-in-4, the APR is 0%. But if late fees are possible, some regulators require including potential late fees in an effective APR calculation. For interest-bearing plans, APR is calculated using the actuarial method: the rate at which the present value of all scheduled payments equals the amount financed. This must account for the payment schedule, any origination fees, and compounding frequency. The APR must be disclosed to the consumer BEFORE they commit, rounded to the nearest 1/8th of a percent per TILA requirements."

### "Why not settle merchants immediately instead of T+1 or T+3?"

**Trap**: Tests understanding of operational risk and cash flow.

**Good answer**: "Delayed settlement provides three benefits: (1) a reconciliation window to catch errors before money leaves the platform, (2) a chargeback/refund buffer where we can net refunds against new transactions instead of clawing back from the merchant, and (3) cost efficiency via batch bank transfers rather than per-transaction transfers. Immediate settlement increases operational risk: if a fraudulent transaction is detected after settlement, recovery from the merchant is much harder than simply withholding it from the next settlement."

---

## Trade-Off Discussions

### Approval Rate vs. Default Rate

```
Higher approval rate:
  + More transactions → more merchant revenue → more merchant discount fees
  + Better consumer experience → higher retention
  - Higher default rate → direct financial loss
  - Increased collection costs

Lower approval rate:
  + Lower default rate → better portfolio quality
  + Less collection overhead
  - Lost revenue from declined consumers
  - Merchants may switch to competitor with higher approval rates
  - Consumer frustration → lower NPS

Optimal: Data-driven threshold optimization. The marginal revenue from approving one more
consumer should equal the expected loss from that consumer's default probability.
If E[merchant_fee] > E[default_loss], approve.
```

### Interest-Free (Pay-in-4) vs. Interest-Bearing (Pay-in-N)

```
Interest-free Pay-in-4:
  + Simple product → easier to explain, higher consumer adoption
  + No interest calculations or APR disclosure complexity
  + Revenue comes entirely from merchant fees
  - No interest revenue; merchant fee must cover all costs + profit
  - Short duration (6 weeks) limits per-plan revenue

Interest-bearing Pay-in-N:
  + Interest revenue diversifies income beyond merchant fees
  + Longer plans = higher order values = more merchant discount revenue
  - Triggers more stringent lending regulations
  - Interest calculation, APR disclosure, and compliance overhead
  - Higher default risk on longer-duration plans
  - Consumer perception: "BNPL with interest" feels like a loan
```

### In-House Underwriting vs. Third-Party Decisioning

```
In-house ML models:
  + Full control over approval logic and thresholds
  + Proprietary data advantage (repayment history, consumer behavior)
  + No per-decision fees to third party
  - Requires ML engineering team
  - Model development and validation takes months
  - Regulatory burden: must demonstrate model fairness independently

Third-party decisioning:
  + Faster time to market
  + Vendor handles model validation and fair lending compliance
  + Access to cross-industry data
  - Per-decision fees (typically $0.10-$0.50)
  - Less control over approval logic
  - Vendor lock-in; switching is expensive
  - Competitive disadvantage: competitors using same vendor get similar scores
```

---

## Scoring Rubric

### Junior Level (Meets Bar)
- Identifies BNPL as a lending system, not just a payment system
- Designs checkout flow with credit decision step
- Mentions installment plan lifecycle
- Basic data model for plans and payments
- Recognizes need for payment collection and retry

### Senior Level (Strong Hire)
- Designs real-time credit decision pipeline with latency budget breakdown
- Handles race conditions (concurrent checkout, double payment)
- Discusses intelligent collection retry with failure-type differentiation
- Addresses regulatory requirements (TILA, adverse action)
- Proposes sharding strategy for plans and payments
- Discusses merchant settlement with reconciliation
- Mentions fallback/degradation for external dependencies

### Staff Level (Exceptional)
- Designs the ML feature store and model serving architecture
- Analyzes the approval rate vs. default rate trade-off quantitatively
- Discusses fair lending compliance and model explainability
- Designs the hardship program workflow with business context
- Proposes financial reconciliation as a first-class observability concern
- Discusses virtual card issuance as a network effect strategy
- Addresses cross-jurisdictional regulatory variation with rules engine

---

## Extension Topics (If Time Permits)

1. **Super-app strategy**: How does the BNPL platform evolve beyond point-of-sale lending (e.g., savings accounts, credit building, personal finance management)?

2. **Merchant risk scoring**: How do you detect and mitigate merchant fraud (collusion with consumers, fake transactions to extract settlements)?

3. **Cross-border BNPL**: How do you handle currency conversion, cross-border regulatory compliance, and international credit assessment?

4. **Embedded finance**: How do you white-label the BNPL engine for banks or fintech partners who want to offer BNPL under their own brand?

5. **Credit bureau reporting**: Should the BNPL platform report payment history to credit bureaus? Trade-offs: helps consumers build credit, but also means late payments hurt credit scores.
