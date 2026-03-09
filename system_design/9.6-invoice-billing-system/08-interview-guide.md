# Interview Guide

## Interview Format: 45-Minute System Design

### Pacing Guide

| Phase | Time | Focus | Signals to Look For |
|-------|------|-------|---------------------|
| **Phase 1: Requirements** | 0--8 min | Scope billing system; identify core vs. nice-to-have features; define scale | Candidate clarifies: recurring vs. one-time billing, usage-based metering, multi-currency, revenue recognition depth |
| **Phase 2: High-Level Design** | 8--22 min | Architecture; service boundaries; data flow for billing run and payment collection | Clear separation of subscription management, invoice generation, payment collection, and dunning; event-driven communication |
| **Phase 3: Deep Dive** | 22--38 min | Pick 1--2 critical components and go deep on data model, algorithms, failure handling | Proration calculation, dunning retry strategy, billing run idempotency, invoice immutability model |
| **Phase 4: Trade-offs & Extensions** | 38--45 min | Discuss alternatives, limitations, and extensions | Revenue recognition complexity, multi-gateway orchestration, tax compliance challenges |

---

## Phase 1: Requirements Gathering

### Key Questions the Candidate Should Ask

| Question | Why It Matters | Strong Answer |
|----------|---------------|---------------|
| "What billing models do we need to support?" | Determines complexity of pricing engine | Identifies flat-rate, per-unit, tiered, volume, and usage-based as distinct models requiring different calculation logic |
| "Do we need to handle mid-cycle plan changes?" | Proration is a major complexity driver | Recognizes proration as a non-trivial problem; asks about upgrade, downgrade, and quantity change scenarios |
| "What payment methods and geographies?" | Drives gateway architecture decisions | Understands that credit card, ACH/SEPA, and wire transfer have different latency, failure, and reconciliation characteristics |
| "Is revenue recognition in scope?" | ASC 606 compliance adds significant complexity | Asks about deferred revenue, performance obligations, and whether rev-rec needs to be real-time or batch |
| "What's the scale? How many subscriptions?" | Determines whether batch or real-time billing is needed | Quantifies: subscriptions, invoices/month, usage events/day, payment TPS |
| "How critical is financial accuracy?" | Sets the consistency model | Recognizes that billing requires strong consistency for financial operations; contrasts with eventual consistency for analytics |

### Red Flags in Requirements Phase

- Jumps to solution without asking about billing models or scale
- Does not distinguish between subscription billing and one-time invoicing
- Ignores failed payment handling (dunning) as a core requirement
- Does not ask about regulatory requirements (tax, revenue recognition)

---

## Phase 2: High-Level Architecture

### Expected Components

A strong candidate should identify these core services:

| Component | Purpose | Key Design Decisions |
|-----------|---------|---------------------|
| **Subscription Service** | Manage subscription lifecycle (create, upgrade, cancel) | State machine with valid transitions; snapshot for billing |
| **Usage Metering Pipeline** | Ingest, deduplicate, aggregate usage events | Separate from billing pipeline; eventually consistent with convergence guarantee |
| **Invoice Generation Engine** | Produce invoices at billing cycle boundaries | Batch with partitioning; exactly-once via idempotency; immutable after finalization |
| **Pricing / Rating Engine** | Apply pricing rules to subscription and usage data | Support multiple pricing models; cached for performance |
| **Payment Orchestrator** | Route payments to gateways; handle success/failure | Gateway abstraction; cascade routing; idempotent charges |
| **Dunning Engine** | Recover failed payments | State machine per failed payment; smart retry timing; gateway cascade |
| **Revenue Recognition Engine** | Generate recognition schedules per ASC 606 | Async; decoupled from invoice generation; dual ledger (cash vs. revenue) |

### Architecture Diagram Discussion Points

| Topic | Good Discussion | Excellent Discussion |
|-------|----------------|---------------------|
| **Billing clock** | "We need a scheduler to trigger invoice generation" | "The billing clock is a partitioned scheduler that buckets subscriptions by billing date. It must handle timezone differences, month-end edge cases, and be idempotent to prevent double-billing after restarts" |
| **Invoice immutability** | "Invoices are stored and don't change" | "Invoices are immutable after finalization---this is a legal requirement. Corrections are issued as credit/debit notes that reference the original invoice. This creates an append-only financial document chain" |
| **Payment orchestration** | "We call a payment gateway" | "We abstract multiple gateways behind a routing layer. Gateway selection is based on payment method, geography, cost optimization, and reliability. Failed charges cascade to alternative gateways before entering dunning" |

### Common Mistakes in High-Level Design

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Putting everything in one service | Billing, payment, and metering have fundamentally different scaling characteristics | Separate services with event-driven communication |
| Real-time invoice generation for all cases | Cannot generate 35M invoices in real-time on the 1st of the month | Batch billing run with partitioned parallel processing |
| Ignoring the metering pipeline | Usage-based billing needs a dedicated ingestion → aggregation pipeline | Separate metering from billing; metering produces billing-ready aggregates |
| Synchronous payment in billing run | Gateway latency (2--30s per call) would make billing runs take days | Decouple: generate all invoices first, then process payments asynchronously via queue |

---

## Phase 3: Deep Dive Topics

### Deep Dive Option A: Proration Engine

**Interviewer prompt**: "A customer upgrades from Plan A ($50/month) to Plan B ($100/month) on day 15 of a 30-day billing cycle. How does the system handle this?"

**Expected answer progression**:

| Level | Response |
|-------|----------|
| **Basic** | "Credit $25 for unused Plan A, charge $50 for remaining Plan B" |
| **Good** | "Calculate daily rates based on actual days in the billing period. Credit = ($50/30) × 15 days remaining. Charge = ($100/30) × 15 days remaining. Use consistent rounding: round credits down, charges up" |
| **Excellent** | "Handle multiple changes in one period. Track each plan segment with start/end dates. Generate proration line items that appear on the next invoice (or immediately, depending on merchant configuration). Consider edge cases: upgrade on the billing date itself, upgrade to annual plan mid-monthly cycle, upgrade with quantity change. Use calendar-day weighting so February prorations differ from July" |

**Follow-up questions**:
- "What if the customer changes plans 3 times in one billing period?"
- "How do you handle proration for usage-based charges?"
- "What rounding strategy do you use, and why?"

### Deep Dive Option B: Dunning & Payment Recovery

**Interviewer prompt**: "A customer's payment fails. Walk me through the dunning process."

**Expected answer progression**:

| Level | Response |
|-------|----------|
| **Basic** | "Retry the payment a few times, then cancel the subscription" |
| **Good** | "Classify the decline (hard vs. soft). For soft declines (insufficient funds), schedule retries with increasing delays (3, 7, 14 days). For hard declines (expired card), notify the customer to update their payment method. Track dunning state per invoice" |
| **Excellent** | "Implement intelligent retry timing: analyze decline reason, optimize for time-of-day and day-of-week based on historical success patterns. Cascade across gateways---if Gateway A declined, try Gateway B. Run a parallel communication track: email sequences with escalating urgency. Implement grace periods before service impact. Monitor recovery rate by decline code and adjust strategy based on data. Recognize that dunning directly impacts involuntary churn and revenue retention" |

**Follow-up questions**:
- "How do you prevent double-charging if the customer pays manually while an automatic retry is in-flight?"
- "How would you implement smart retry timing?"
- "What metrics would you use to measure dunning effectiveness?"

### Deep Dive Option C: Billing Run at Scale

**Interviewer prompt**: "We need to generate 35 million invoices on the 1st of every month. How?"

**Expected answer progression**:

| Level | Response |
|-------|----------|
| **Basic** | "Process subscriptions in parallel" |
| **Good** | "Partition subscriptions by billing date and tenant. Process each partition with a dedicated worker. Use idempotency keys to prevent duplicate invoices. Generate invoices in batch, then process payments asynchronously" |
| **Excellent** | "Partition by billing date (most subscriptions on day 1, so that partition is largest). Sub-partition by tenant_id hash for parallelism. Use advisory locks to prevent concurrent billing of the same subscription. Implement checkpointing so crashed workers resume from last successful point. Run catch-up sweeps 6 hours after billing run to find any missed subscriptions. Decouple invoice generation from payment collection---generate first, then queue for payment. Pre-compute charges where possible to reduce per-invoice processing time. Handle month-end edge cases (billing day 31 in a 28-day month)" |

### Deep Dive Option D: Revenue Recognition

**Interviewer prompt**: "How does the system handle revenue recognition under ASC 606?"

**Expected answer progression**:

| Level | Response |
|-------|----------|
| **Basic** | "Record revenue when payment is received" |
| **Good** | "Revenue is recognized when performance obligations are satisfied, not when payment is received. An annual subscription paid upfront has 12 monthly recognition events. Maintain a recognition schedule per invoice" |
| **Excellent** | "ASC 606 has five steps: identify the contract, identify performance obligations, determine transaction price, allocate price to obligations, and recognize when obligations are satisfied. For SaaS, the obligation is providing service over the subscription period (straight-line recognition). For usage-based billing, revenue is recognized at the point of consumption. For multi-element arrangements (subscription + setup fee + premium support), allocate the transaction price using stand-alone selling prices. Maintain dual ledgers: cash (when money moved) and revenue (when obligations were fulfilled). Rev-rec runs as an async pipeline consuming invoice finalization events" |

---

## Trap Questions

### Trap 1: "Can we just use a cron job to trigger billing?"

**What they're testing**: Understanding of distributed scheduling reliability.

**Trap response**: "Yes, cron runs daily and generates invoices."

**Strong response**: "A single cron job is a single point of failure. If it misses a run, invoices are not generated. We need a distributed scheduler with leader election, catch-up processing, and exactly-once guarantees. The scheduler must handle timezone differences---a subscription in Tokyo and one in New York with the same billing date should bill at different UTC times. Also, cron does not natively support partitioned parallel processing."

### Trap 2: "Why not just update the invoice when a correction is needed?"

**What they're testing**: Understanding of invoice immutability as a legal and financial requirement.

**Trap response**: "We update the invoice amount and resend it."

**Strong response**: "Invoices are legal documents that cannot be modified after finalization in most jurisdictions (EU VAT directive, India GST, etc.). Corrections must be issued as credit notes (reducing amount) or debit notes (increasing amount) that reference the original invoice. This append-only model preserves the audit trail: auditors can see the original invoice, every correction, and verify the net balance. It also simplifies reconciliation---the original document is never ambiguous."

### Trap 3: "How do you handle floating-point precision for financial calculations?"

**What they're testing**: Awareness of a fundamental billing engineering challenge.

**Trap response**: "Use double-precision floats" or does not address it.

**Strong response**: "Never use floating-point for financial calculations. Store all amounts as integers in the smallest currency unit (cents for USD, pence for GBP). Perform all arithmetic as integer operations. Define explicit rounding rules (round half-up for standard, round-down for credits to customer, round-up for charges). Handle zero-decimal currencies (JPY, KRW) separately. Verify that line items sum exactly to the invoice total---any rounding residual is added as an explicit adjustment line."

### Trap 4: "Why not retry failed payments every hour until they succeed?"

**What they're testing**: Understanding of dunning strategy and customer experience.

**Trap response**: "More retries means more recovered revenue."

**Strong response**: "Aggressive retries are counterproductive for several reasons: (1) Card networks track and penalize excessive retry rates---repeated declines on the same card can lead to hard blocks. (2) Most soft declines (insufficient funds) resolve around pay-cycle dates, not hours later. (3) Each failed attempt costs processing fees. (4) Customers may perceive aggressive retries as hostile. Smart dunning spaces retries strategically (3, 7, 14 days), optimizes for time-of-day, classifies declines to avoid retrying hard failures, and coordinates communication with the customer."

### Trap 5: "Should the metering pipeline use strong consistency?"

**What they're testing**: Understanding of consistency trade-offs in billing.

**Trap response**: "Yes, billing needs to be accurate, so everything should be strongly consistent."

**Strong response**: "Metering ingestion should be eventually consistent. Events arrive at 100K+/sec---strong consistency at that rate would require distributed transactions that destroy throughput. Instead, the metering pipeline uses eventual consistency with a defined convergence window (5 minutes). The billing engine waits for a `usage.period_closed` event confirming aggregation is complete before generating usage-based invoices. The key insight is that strong consistency is required at the invoice level (final amounts must be exact), but not at the event ingestion level."

---

## Scoring Rubric

### Senior Engineer (L5/E5)

| Criterion | Meets Bar | Exceeds Bar |
|-----------|-----------|-------------|
| **Requirements** | Identifies subscription, invoicing, and payment as core features | Proactively identifies proration, dunning, and revenue recognition as complex sub-systems |
| **Architecture** | Clean service separation with event-driven communication | Explains billing clock design, invoice immutability, and metering pipeline separation |
| **Deep dive** | Correctly implements proration or dunning with basic edge cases | Handles multi-change proration, gateway cascade, smart retry timing |
| **Data model** | Sensible invoice + payment + subscription schema | Explains integer-based amounts, status state machines, idempotency design |
| **Trade-offs** | Identifies batch vs. real-time billing trade-off | Discusses consistency models per component; explains billing run partitioning |

### Staff Engineer (L6/E6)

| Criterion | Meets Bar | Exceeds Bar |
|-----------|-----------|-------------|
| **System scope** | Comprehensive billing system with all major components | Addresses revenue recognition, multi-currency, and tax integration as first-class concerns |
| **Scale reasoning** | Calculates billing run throughput requirements | Designs partition rebalancing, billing date spreading, and pre-computation strategies |
| **Failure handling** | Idempotent operations; retry with backoff | Multi-layer exactly-once guarantee (check + lock + constraint); gateway circuit breakers; billing run catch-up sweeps |
| **Financial correctness** | Understands invoice immutability | Explains dual ledger (cash vs. revenue), credit note chain, and rounding strategy across millions of transactions |
| **Organizational impact** | Good technical design | Considers merchant experience, finance team needs, compliance requirements, and cross-team integration points |

---

## Discussion Starters for Each Topic

| Topic | Good Opening Question |
|-------|----------------------|
| **Proration** | "What happens financially when a customer upgrades mid-cycle?" |
| **Dunning** | "8% of charges fail. How do we recover that revenue?" |
| **Billing run** | "35 million invoices on day 1. How do we not fall over?" |
| **Revenue recognition** | "When does $1200 from an annual subscription become revenue?" |
| **Multi-currency** | "Customer is in Japan, merchant reports in USD. How does an invoice work?" |
| **Idempotency** | "What's the worst thing that can happen if we generate a duplicate invoice?" |
| **Gateway orchestration** | "We use 3 payment gateways. How do we decide which one to use?" |
