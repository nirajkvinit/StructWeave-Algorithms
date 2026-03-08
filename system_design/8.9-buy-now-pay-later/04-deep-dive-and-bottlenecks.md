# Deep Dive & Bottlenecks

## 1. Real-Time Credit Decisioning Engine

### The Problem

A BNPL credit decision must complete in under 2 seconds during checkout---the most conversion-sensitive moment in e-commerce. Each decision requires orchestrating multiple data sources (credit bureau, feature store, device fingerprint), running an ML model, computing plan eligibility, generating regulatory disclosures, and persisting an audit record. Every additional 100ms of latency costs measurable conversion loss.

### Architecture Deep Dive

The credit decision pipeline is structured as a **staged pipeline with parallel fan-out**:

**Stage 1: Pre-Screen (< 10ms)**
Fast rule-based checks that reject obviously ineligible requests without touching external services: account status, platform exposure limits, order amount bounds, merchant-level blocks, and velocity limits (e.g., max 3 active plans). This stage rejects ~10--15% of requests, saving expensive downstream processing.

**Stage 2: Data Assembly (< 500ms, parallelized)**
The most latency-sensitive stage. Three data fetches happen in parallel:
- **Soft credit pull**: Bureau data is cached for 24 hours per consumer. Cache hit ratio is ~70% (repeat consumers within a day). On cache miss, the bureau API call takes 300--500ms.
- **Feature store lookup**: Pre-computed features (repayment history, velocity, behavioral signals) are served from an in-memory store. Latency: 5--10ms.
- **Device/session scoring**: Device fingerprint, IP geolocation, and browser signals are computed client-side and validated server-side. Latency: 10--20ms.

The total Stage 2 latency is MAX(bureau_call, feature_lookup, device_scoring) ≈ 500ms (worst case, bureau cache miss).

**Stage 3: ML Inference (< 100ms)**
The assembled feature vector (200+ features) is passed to the risk model and fraud model. Models are served via a low-latency inference service with models pre-loaded in memory. Batch inference is not an option; each request requires individual scoring. Model versions are deployed via blue-green deployment with shadow scoring to validate new models against production traffic.

**Stage 4: Decision Logic & Plan Eligibility (< 50ms)**
Rule-based decision layer that combines ML scores with business rules: risk thresholds, affordability checks (debt-to-income ratio), merchant-specific policies, and regulatory constraints (state-level lending limits, maximum APR caps).

**Stage 5: Disclosure Generation & Audit (< 50ms, partially async)**
TILA disclosure computation (APR, finance charge, total of payments) is synchronous (required in response). Audit record persistence is fire-and-forget to a durable queue---the decision response is not blocked by audit write completion.

### Bottleneck Analysis

| Bottleneck | Impact | Mitigation |
|-----------|--------|------------|
| Bureau API latency (300--500ms) | Dominates decision latency on cache miss | 24h cache per consumer; fallback to bureau-less scoring model (higher risk tolerance, lower approval limit) |
| ML model cold start | First request after deployment takes 2--5s | Pre-warm models on deployment; canary routing to new model instances |
| Feature store staleness | Stale features lead to incorrect risk scores | Hourly refresh for active consumers; event-driven updates for material changes (missed payment, new plan) |
| Audit write amplification | Each decision generates ~5KB of audit data | Async write via durable queue; batch persist to audit database |

### Race Condition: Concurrent Checkout Sessions

**Scenario**: A consumer opens two browser tabs at different merchants and initiates checkout simultaneously. Both credit decisions see the same outstanding balance and approve, potentially exceeding the consumer's safe exposure limit.

**Solution**: Pessimistic reservation lock. When a credit decision is approved, a "credit reservation" is created with a short TTL (15 minutes). Subsequent credit decisions see the reservation and reduce available spending power accordingly. If the checkout is not confirmed within the TTL, the reservation expires.

```
FUNCTION check_and_reserve_credit(consumer_id, amount):
    LOCK consumer_credit_mutex(consumer_id):  -- distributed lock, 5s TTL
        current_outstanding = get_total_outstanding(consumer_id)
        active_reservations = get_active_reservations(consumer_id)
        total_committed = current_outstanding + SUM(active_reservations)

        IF total_committed + amount > consumer.spending_power:
            RETURN insufficient_credit

        create_reservation(consumer_id, amount, ttl=15_minutes)
        RETURN reservation_id
```

---

## 2. Payment Collection at Scale

### The Problem

5 million scheduled payments per day, concentrated in 3 collection windows (morning, afternoon, evening), must be collected reliably. Each collection attempt involves charging a consumer's payment method via an external payment processor. Failures must be retried intelligently, and the system must handle partial payments, expired cards, insufficient funds, and processor outages---all while maintaining exactly-once payment semantics.

### Collection Architecture

**Batch Generation**: A scheduler queries `ScheduledPayment WHERE due_date <= TODAY AND status = 'scheduled'`, partitioned by payment processor to optimize batch API calls. Payments are grouped into batches of 1,000 for processor submission.

**Idempotent Execution**: Each collection attempt is identified by `payment_id + attempt_number`. The payment processor deduplicates on this key. Even if the collection service crashes and replays the batch, no consumer is charged twice.

**Processor Fan-Out**: Different consumers use different payment methods routed to different processors. The orchestration layer fans out to multiple processors in parallel, respecting each processor's rate limits and batch size constraints.

**Result Reconciliation**: Processor responses (success/failure per payment) are reconciled against the batch. Successful payments update plan state immediately. Failures are categorized and routed to the appropriate retry strategy.

### Retry Intelligence

Not all payment failures are equal. The retry strategy is tailored to the failure reason:

| Failure Reason | Retry Strategy | Max Retries | Delay Pattern |
|---------------|----------------|-------------|---------------|
| Insufficient funds | Exponential backoff (1d, 3d, 5d, 7d) | 4 | Wait for paycheck cycle |
| Card expired | Notify consumer; retry after card update | 2 | 3-day wait + notification |
| Card declined (generic) | Retry next collection window | 3 | 8h, 24h, 72h |
| Processor timeout | Immediate retry with different processor route | 3 | 0s, 30s, 2min |
| Bank maintenance | Retry next business day | 2 | Next business day |
| Fraud hold | Do not retry; flag for manual review | 0 | N/A |

### Bottleneck: Collection Window Thundering Herd

When 2M payments are due at the same collection window, the burst load on payment processors can trigger rate limiting or degraded response times.

**Solution**: Staggered batch submission with jitter. Instead of submitting all 2M payments at 9:00 AM:
1. Partition payments into 100 batches of 20K
2. Submit each batch with 30-second intervals (total: 50 minutes to submit all)
3. Within each batch, add random jitter (0--5 seconds per payment)
4. Prioritize by delinquency risk (payments already late are collected first)

---

## 3. Merchant Settlement Reconciliation

### The Problem

500K merchants receive daily or periodic settlements. Each settlement must exactly equal the sum of confirmed transactions minus refunds, chargebacks, and the merchant discount fee. A single penny of discrepancy triggers merchant disputes and regulatory scrutiny.

### Settlement Pipeline

```
1. Transaction Aggregation (T+0, end of day)
   - Query all confirmed plans for merchant in settlement window
   - Include: plan creation amount (gross)
   - Deduct: refunds processed, chargebacks, adjustments

2. Fee Calculation
   - Apply merchant-specific discount rate to gross amount
   - Apply any volume-based tier discounts
   - Calculate net settlement = gross - refunds - chargebacks - fee

3. Reconciliation Check
   - Compare computed settlement against running total from event stream
   - Flag any discrepancy > $0.01 for manual review
   - Settlement proceeds only if reconciliation passes

4. Settlement Execution (T+1 to T+3)
   - Generate bank transfer instruction
   - Submit to banking partner
   - Track settlement status to completion
   - Send settlement report to merchant (webhook + dashboard)
```

### Race Condition: Late Refund vs. Settlement Cutoff

**Scenario**: A refund is processed at 11:59 PM, but the settlement aggregation job started at 11:55 PM. The refund is not included in today's settlement, so the merchant is overpaid.

**Solution**: Settlement aggregation uses a snapshot timestamp. Any transactions or refunds with timestamps after the snapshot are included in the next settlement period. The snapshot timestamp is recorded in the settlement record for audit. A nightly reconciliation job compares settlement records against the full transaction log to detect any mismatches.

---

## 4. Virtual Card Authorization Flow

### The Problem

For non-integrated merchants, the platform issues single-use virtual cards. When the consumer uses this card, the merchant's payment processor sends an authorization request through the card network to the BNPL platform (acting as card issuer). The authorization must be processed in < 3 seconds (card network timeout), and the BNPL platform must validate that the card is being used at the correct merchant for the correct amount.

### Authorization Flow

```
Consumer → Enters virtual card at merchant checkout
Merchant → Sends auth request to acquiring bank
Acquiring Bank → Routes through card network
Card Network → Sends auth request to BNPL (as issuer)

BNPL Authorization Handler:
    1. Look up virtual card by card_number_token
    2. Validate: card not expired, not already used
    3. Validate: merchant matches merchant_lock
    4. Validate: amount <= authorized_amount (with 10% tolerance for tax/shipping)
    5. Create installment plan (same as direct integration flow)
    6. Respond with approval code

Card Network → Returns approval to acquiring bank
Acquiring Bank → Returns approval to merchant
Merchant → Completes order
```

### Bottleneck: Card Network Timeout

Card networks enforce strict timeout windows (typically 3--5 seconds). The BNPL platform must complete the full credit decision, plan creation, and first installment charge within this window when using the virtual card flow.

**Mitigation**: Pre-approval. When the consumer requests a virtual card, the credit decision is already completed. The card is issued with a pre-approved amount. The authorization handler only needs to validate the card and merchant match---skipping the expensive credit decision pipeline. This reduces authorization latency to < 500ms.

---

## 5. Delinquency Management and Collections Workflow

### The Problem

5--15% of plans experience at least one missed payment. The collections workflow must balance maximizing recovery (collecting owed amounts) with consumer experience (maintaining the relationship) and regulatory compliance (fair debt collection practices, hardship accommodation).

### Dunning Sequence

```
Day 0:   Payment fails → Auto-retry in 24h
Day 1:   Retry #1 fails → Send email reminder
Day 3:   Retry #2 fails → Send SMS + push notification
Day 5:   Retry #3 fails → Assess late fee (if permitted in jurisdiction)
Day 7:   Retry #4 fails → Offer payment plan modification
Day 14:  → In-app banner + email: hardship program offer
Day 30:  → Phone outreach (if opted in) + formal notice
Day 60:  → Final notice: plan will be charged off in 60 days
Day 90:  → Suspend consumer account; report to credit bureau
Day 120: → Charge off; queue for debt sale or collection agency
```

### Hardship Program Logic

```
FUNCTION evaluate_hardship(consumer, plan):
    -- Eligibility criteria
    IF plan.delinquency_stage NOT IN (late_2, late_3, collections):
        RETURN not_eligible  -- too early for hardship

    IF consumer has hardship_plan within last 12 months:
        RETURN not_eligible  -- prevent abuse

    -- Determine modification options
    options = []

    -- Option 1: Extended terms (reduce installment amount)
    IF plan.remaining_installments <= 12:
        extended = create_extended_schedule(
            plan.remaining_balance,
            new_term = plan.remaining_installments × 2,
            apr = plan.apr  -- maintain original APR
        )
        options.add(extended)

    -- Option 2: Reduced payment (temporary)
    reduced = create_reduced_schedule(
        plan.remaining_balance,
        reduced_amount = plan.installment_amount × 0.5,
        reduced_period = 3_months,
        then_resume_original = true
    )
    options.add(reduced)

    -- Option 3: Waive late fees
    IF plan.late_fees_accrued > 0:
        options.add(waive_late_fees(plan))

    RETURN hardship_options(options)
```

---

## 6. Critical Race Conditions Summary

| Race Condition | Trigger | Impact | Resolution |
|---------------|---------|--------|------------|
| **Concurrent checkout** | Same consumer, two merchants, simultaneous | Over-extension of credit | Credit reservation with TTL + distributed lock |
| **Double payment** | Consumer manual pay + auto-collection overlap | Consumer charged twice | Idempotency key on payment_id; optimistic lock on payment status |
| **Refund during collection** | Refund processed while payment is in-flight | Plan state inconsistency | Saga: refund waits for in-flight collection to complete or fail |
| **Settlement cutoff** | Late refund near settlement aggregation | Merchant over/underpayment | Snapshot-based aggregation with next-period carry-over |
| **Virtual card replay** | Card number reused (attack or error) | Double disbursement | Single-use enforcement: card status set to "used" atomically on first auth |
| **Plan modification during payment** | Hardship plan accepted while payment processing | Incorrect amount collected | Optimistic concurrency: payment checks plan version before executing |

---

## 7. Failure Modes and Degradation

| Failure | Impact | Graceful Degradation |
|---------|--------|---------------------|
| Credit bureau unavailable | Cannot get credit pull data | Fall back to bureau-less model with lower approval limits; flag decisions as "limited_data" |
| ML model service down | Cannot score risk | Fall back to rules-based scoring with conservative thresholds |
| Payment processor outage | Cannot collect payments | Queue payments; retry when processor recovers; extend grace period automatically |
| Feature store stale | Risk scores based on old data | Accept staleness up to 24h; reject if feature freshness > 24h |
| Database primary failover | Write unavailability | Promote replica; queue writes during failover window (seconds); replay from WAL |
| Card network timeout | Virtual card auth fails | Consumer sees "payment declined"; they can retry or use a different payment method |
| Settlement bank unavailable | Merchant payouts delayed | Queue settlements; notify affected merchants; process when bank recovers |
