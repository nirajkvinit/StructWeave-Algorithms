# Low-Level Design

## Data Models

### Consumer

```
Consumer {
    consumer_id         UUID        PRIMARY KEY
    email               STRING      UNIQUE, encrypted
    phone               STRING      encrypted
    first_name          STRING      encrypted
    last_name           STRING      encrypted
    date_of_birth       DATE        encrypted
    address             JSON        encrypted (street, city, state, zip, country)
    kyc_status          ENUM        (pending, verified, failed)
    kyc_verified_at     TIMESTAMP
    credit_tier         ENUM        (new, standard, preferred, premium)
    spending_power      DECIMAL     -- pre-qualified max available credit
    total_outstanding   DECIMAL     -- sum of all active plan balances
    default_payment_id  UUID        FK → PaymentMethod
    status              ENUM        (active, suspended, closed)
    created_at          TIMESTAMP
    updated_at          TIMESTAMP
}
INDEX: (email), (phone), (credit_tier, status)
```

### Payment Method

```
PaymentMethod {
    payment_method_id   UUID        PRIMARY KEY
    consumer_id         UUID        FK → Consumer
    type                ENUM        (debit_card, bank_account, credit_card)
    token               STRING      -- tokenized by payment processor
    last_four           STRING      -- display only
    expiry              STRING      -- MM/YY for cards
    is_default          BOOLEAN
    verification_status ENUM        (pending, verified, failed)
    created_at          TIMESTAMP
}
INDEX: (consumer_id, is_default)
```

### Installment Plan

```
InstallmentPlan {
    plan_id             UUID        PRIMARY KEY
    consumer_id         UUID        FK → Consumer
    merchant_id         UUID        FK → Merchant
    order_reference     STRING      -- merchant's order ID
    plan_type           ENUM        (pay_in_4, pay_in_6, pay_in_12, pay_in_n)
    total_amount        DECIMAL     -- original purchase amount
    financed_amount     DECIMAL     -- amount after down payment
    currency            STRING      -- ISO 4217
    num_installments    INT
    installment_amount  DECIMAL     -- per-installment payment
    apr                 DECIMAL     -- annual percentage rate (0 for interest-free)
    total_interest      DECIMAL     -- total interest over plan lifetime
    total_cost          DECIMAL     -- financed_amount + total_interest
    down_payment        DECIMAL     -- first payment at checkout
    status              ENUM        (active, completed, defaulted, cancelled, refunded)
    delinquency_stage   ENUM        (current, grace, late_1, late_2, late_3, collections, charge_off)
    late_fees_accrued   DECIMAL
    remaining_balance   DECIMAL     -- outstanding amount
    payment_method_id   UUID        FK → PaymentMethod
    decision_id         UUID        FK → CreditDecision
    created_at          TIMESTAMP
    completed_at        TIMESTAMP
    idempotency_key     STRING      UNIQUE
}
INDEX: (consumer_id, status), (merchant_id, created_at), (status, delinquency_stage)
INDEX: (next_payment_date) -- for collection scheduler
```

### Scheduled Payment

```
ScheduledPayment {
    payment_id          UUID        PRIMARY KEY
    plan_id             UUID        FK → InstallmentPlan
    installment_number  INT         -- 1, 2, 3, ... N
    amount              DECIMAL
    principal_portion   DECIMAL
    interest_portion    DECIMAL
    due_date            DATE
    status              ENUM        (scheduled, processing, completed, failed, overdue, waived)
    attempt_count       INT         DEFAULT 0
    last_attempt_at     TIMESTAMP
    paid_at             TIMESTAMP
    payment_reference   STRING      -- processor transaction ID
    late_fee            DECIMAL     DEFAULT 0
    grace_period_end    DATE
    created_at          TIMESTAMP
    updated_at          TIMESTAMP
}
INDEX: (plan_id, installment_number) UNIQUE
INDEX: (due_date, status) -- collection scheduler query
INDEX: (status, attempt_count) -- retry query
```

### Credit Decision

```
CreditDecision {
    decision_id         UUID        PRIMARY KEY
    consumer_id         UUID        FK → Consumer
    merchant_id         UUID        FK → Merchant
    request_context     JSON        -- order amount, merchant category, device fingerprint
    bureau_pull_id      STRING      -- soft pull reference
    feature_vector      JSON        -- all features used in scoring (for audit)
    model_version       STRING      -- ML model version used
    risk_score          DECIMAL     -- 0.0 to 1.0 (probability of default)
    affordability_score DECIMAL     -- ability to repay assessment
    fraud_score         DECIMAL     -- fraud probability
    decision            ENUM        (approved, declined, referred, error)
    decline_reasons     JSON        -- adverse action reasons (TILA requirement)
    eligible_plans      JSON        -- plan options offered if approved
    max_approved_amount DECIMAL
    tila_disclosure     JSON        -- APR, finance charge, total of payments
    decision_latency_ms INT         -- end-to-end decision time
    created_at          TIMESTAMP
}
INDEX: (consumer_id, created_at), (decision, created_at)
PARTITION: by created_at (monthly) -- high-volume, time-series access pattern
```

### Merchant

```
Merchant {
    merchant_id         UUID        PRIMARY KEY
    business_name       STRING
    business_category   STRING      -- MCC code equivalent
    integration_type    ENUM        (sdk, api, virtual_card, redirect)
    discount_rate       DECIMAL     -- merchant fee percentage (2-8%)
    settlement_cadence  ENUM        (t_plus_1, t_plus_2, t_plus_3)
    settlement_account  JSON        -- bank account details (encrypted)
    enabled_plan_types  JSON        -- which plan types merchant offers
    monthly_volume_cap  DECIMAL     -- risk limit
    status              ENUM        (onboarding, active, suspended, terminated)
    api_key_hash        STRING
    webhook_url         STRING
    created_at          TIMESTAMP
}
INDEX: (status, business_category)
```

### Merchant Settlement

```
MerchantSettlement {
    settlement_id       UUID        PRIMARY KEY
    merchant_id         UUID        FK → Merchant
    settlement_date     DATE
    gross_amount        DECIMAL     -- total transaction value
    refund_amount       DECIMAL     -- total refunds in period
    discount_fee        DECIMAL     -- gross × discount_rate
    chargeback_amount   DECIMAL
    net_amount          DECIMAL     -- gross - refunds - fee - chargebacks
    transaction_count   INT
    status              ENUM        (pending, processing, completed, failed)
    bank_reference      STRING
    created_at          TIMESTAMP
}
INDEX: (merchant_id, settlement_date), (status, settlement_date)
```

### Virtual Card

```
VirtualCard {
    card_id             UUID        PRIMARY KEY
    plan_id             UUID        FK → InstallmentPlan
    consumer_id         UUID        FK → Consumer
    card_number_token   STRING      -- tokenized PAN
    last_four           STRING
    expiry              STRING
    cvv_hash            STRING
    authorized_amount   DECIMAL
    merchant_lock       STRING      -- restricted to specific merchant
    status              ENUM        (issued, authorized, settled, expired, cancelled)
    expires_at          TIMESTAMP   -- 24h from issuance if unused
    created_at          TIMESTAMP
}
INDEX: (consumer_id, status), (plan_id)
```

---

## API Design

### Checkout APIs

```
POST /v1/checkout/initialize
Purpose: Start BNPL flow at merchant checkout
Headers: X-Merchant-API-Key, X-Idempotency-Key
Body: {
    consumer: { email, phone, name, shipping_address },
    order: { amount, currency, items[], merchant_order_id },
    session: { device_fingerprint, ip_address, user_agent }
}
Response 200: {
    checkout_session_id: "cs_abc123",
    decision: "approved",
    eligible_plans: [
        {
            plan_type: "pay_in_4",
            installment_amount: 37.50,
            total_cost: 150.00,
            apr: 0.0,
            schedule: ["2026-03-09", "2026-03-23", "2026-04-06", "2026-04-20"]
        },
        {
            plan_type: "pay_in_12",
            installment_amount: 13.50,
            total_cost: 162.00,
            apr: 15.99,
            finance_charge: 12.00,
            schedule: [...]
        }
    ],
    tila_disclosure: { ... },
    expires_at: "2026-03-09T19:00:00Z"
}
Response 200 (declined): {
    checkout_session_id: "cs_abc123",
    decision: "declined",
    adverse_action_notice: { reasons: [...], bureau_info: {...} }
}
```

```
POST /v1/checkout/confirm
Purpose: Consumer selects plan and confirms purchase
Headers: X-Merchant-API-Key, X-Idempotency-Key
Body: {
    checkout_session_id: "cs_abc123",
    selected_plan_type: "pay_in_4",
    payment_method_id: "pm_xyz789",
    consumer_consent: true,
    e_signature: "..."
}
Response 200: {
    plan_id: "plan_def456",
    status: "active",
    first_payment: { amount: 37.50, status: "completed", reference: "txn_..." },
    remaining_schedule: [...],
    merchant_notification: "sent"
}
```

### Pre-Qualification API

```
POST /v1/prequalify
Purpose: Check eligibility without hard commitment
Headers: Authorization: Bearer <consumer_token>
Body: {
    amount: 500.00,
    currency: "USD",
    merchant_id: "merch_abc"
}
Response 200: {
    qualified: true,
    spending_power: 1200.00,
    available_plans: [...],
    valid_for: "30min"
}
```

### Payment Management APIs

```
POST /v1/plans/{plan_id}/payments/{payment_id}/pay
Purpose: Consumer makes manual payment
Headers: Authorization: Bearer <consumer_token>
Body: {
    amount: 37.50,
    payment_method_id: "pm_xyz789"
}
Response 200: {
    payment_id: "pay_abc",
    status: "completed",
    remaining_balance: 112.50,
    next_payment: { amount: 37.50, due_date: "2026-04-06" }
}
```

```
POST /v1/plans/{plan_id}/refund
Purpose: Process refund (merchant or consumer initiated)
Headers: X-Merchant-API-Key, X-Idempotency-Key
Body: {
    amount: 50.00,
    reason: "partial_return",
    merchant_order_id: "ord_123"
}
Response 200: {
    refund_id: "ref_abc",
    refund_amount: 50.00,
    adjusted_plan: {
        remaining_balance: 62.50,
        adjusted_installments: [...]
    }
}
```

### Merchant APIs

```
GET /v1/merchants/settlements?from=2026-03-01&to=2026-03-08
Purpose: List settlement reports
Headers: X-Merchant-API-Key
Response 200: {
    settlements: [
        {
            settlement_id: "stl_abc",
            date: "2026-03-07",
            gross: 45000.00,
            refunds: 1200.00,
            fee: 1752.00,
            net: 42048.00,
            transaction_count: 312,
            status: "completed"
        }
    ]
}
```

### Webhook Events (Merchant)

```
POST <merchant_webhook_url>
Events:
  - plan.created      -- new plan confirmed
  - plan.completed    -- all installments paid
  - plan.defaulted    -- plan charged off
  - refund.processed  -- refund completed
  - settlement.sent   -- settlement initiated
  - dispute.opened    -- consumer dispute filed

Payload: {
    event_type: "plan.created",
    event_id: "evt_abc123",
    timestamp: "2026-03-09T15:30:00Z",
    data: { plan_id, order_reference, amount, plan_type, status }
}
Delivery: at-least-once with exponential backoff (max 5 retries over 24h)
Verification: HMAC-SHA256 signature in X-Signature header
```

---

## Core Algorithms

### Credit Decision Pipeline

```
FUNCTION evaluate_credit(consumer, order, merchant, session):
    -- Step 1: Pre-screen (fast rejection)
    IF consumer.status == suspended OR consumer.status == closed:
        RETURN Decision(declined, reason="account_suspended")
    IF consumer.total_outstanding + order.amount > platform_max_exposure:
        RETURN Decision(declined, reason="exposure_limit")
    IF order.amount < merchant.min_order OR order.amount > merchant.max_order:
        RETURN Decision(declined, reason="order_out_of_range")

    -- Step 2: Fetch features (parallel)
    features = PARALLEL:
        bureau_data   = fetch_soft_credit_pull(consumer)  -- cached 24h
        velocity      = feature_store.get(consumer.id, "velocity")
        history       = feature_store.get(consumer.id, "repayment_history")
        device        = compute_device_features(session)
        merchant_risk = feature_store.get(merchant.id, "merchant_risk")

    -- Step 3: ML scoring
    feature_vector = assemble_features(bureau_data, velocity, history, device, merchant_risk)
    risk_score     = risk_model.predict(feature_vector)     -- P(default)
    fraud_score    = fraud_model.predict(feature_vector)     -- P(fraud)
    affordability  = compute_affordability(consumer, order, bureau_data)

    -- Step 4: Decision logic
    IF fraud_score > FRAUD_THRESHOLD:
        RETURN Decision(declined, reason="fraud_risk")
    IF risk_score > RISK_HARD_DECLINE:
        RETURN Decision(declined, reasons=adverse_action_reasons(feature_vector))
    IF affordability.debt_to_income > DTI_LIMIT:
        RETURN Decision(declined, reason="affordability")

    -- Step 5: Plan eligibility
    eligible_plans = []
    max_amount = compute_max_approval(risk_score, affordability, consumer.credit_tier)

    IF risk_score < TIER_1_THRESHOLD:
        eligible_plans.add(pay_in_4(order.amount, interest=0))
        eligible_plans.add(pay_in_12(order.amount, apr=compute_apr(risk_score)))
    ELSE IF risk_score < TIER_2_THRESHOLD:
        eligible_plans.add(pay_in_4(order.amount, interest=0))
    ELSE:
        eligible_plans.add(pay_in_4(min(order.amount, max_amount), interest=0))

    -- Step 6: Generate TILA disclosure
    disclosure = generate_tila_disclosure(eligible_plans)

    -- Step 7: Audit log
    log_decision(consumer, order, feature_vector, risk_score, fraud_score, decision, disclosure)

    RETURN Decision(approved, eligible_plans, disclosure, max_amount)
```

### Installment Schedule Generator

```
FUNCTION generate_schedule(plan_type, amount, apr, start_date):
    schedule = []
    num_installments = plan_type.num_payments

    IF apr == 0:
        -- Interest-free: equal installments
        installment_amount = ROUND(amount / num_installments, 2)
        remainder = amount - (installment_amount × num_installments)
        -- Apply rounding remainder to last installment

        FOR i = 1 TO num_installments:
            due_date = start_date + (i - 1) × plan_type.interval_days
            amt = installment_amount
            IF i == num_installments:
                amt = amt + remainder
            schedule.add(ScheduledPayment(
                installment_number = i,
                amount = amt,
                principal = amt,
                interest = 0,
                due_date = due_date,
                grace_period_end = due_date + GRACE_DAYS
            ))
    ELSE:
        -- Amortized schedule with interest
        monthly_rate = apr / 12 / 100
        emi = amount × monthly_rate × (1 + monthly_rate)^num_installments
                / ((1 + monthly_rate)^num_installments - 1)
        emi = ROUND(emi, 2)
        remaining_principal = amount

        FOR i = 1 TO num_installments:
            interest_portion = ROUND(remaining_principal × monthly_rate, 2)
            principal_portion = emi - interest_portion
            IF i == num_installments:
                principal_portion = remaining_principal
                emi = principal_portion + interest_portion
            remaining_principal = remaining_principal - principal_portion
            due_date = start_date + (i - 1) × 30  -- monthly intervals

            schedule.add(ScheduledPayment(
                installment_number = i,
                amount = emi,
                principal = principal_portion,
                interest = interest_portion,
                due_date = due_date,
                grace_period_end = due_date + GRACE_DAYS
            ))

    RETURN schedule
```

### Collection Retry Strategy

```
FUNCTION collect_payment(scheduled_payment):
    plan = get_plan(scheduled_payment.plan_id)
    payment_method = get_payment_method(plan.payment_method_id)

    -- Attempt collection
    result = payment_processor.charge(
        payment_method.token,
        scheduled_payment.amount,
        idempotency_key = scheduled_payment.payment_id + "_attempt_" + attempt_count
    )

    IF result.success:
        scheduled_payment.status = "completed"
        scheduled_payment.paid_at = NOW()
        scheduled_payment.payment_reference = result.reference
        plan.remaining_balance -= scheduled_payment.amount
        IF plan.remaining_balance <= 0:
            plan.status = "completed"
        emit_event("payment.collected", scheduled_payment)
        RETURN

    -- Handle failure
    scheduled_payment.attempt_count += 1
    scheduled_payment.last_attempt_at = NOW()

    IF result.error_type == "insufficient_funds":
        -- Retry with exponential backoff
        retry_delays = [1_day, 3_days, 5_days, 7_days]
        IF scheduled_payment.attempt_count <= LEN(retry_delays):
            schedule_retry(scheduled_payment, retry_delays[attempt_count - 1])
        ELSE:
            escalate_to_delinquent(plan, scheduled_payment)

    ELSE IF result.error_type == "card_expired" OR result.error_type == "card_declined":
        -- Request updated payment method
        notify_consumer("payment_method_update_needed", plan)
        schedule_retry(scheduled_payment, 3_days)

    ELSE IF result.error_type == "processor_error":
        -- Transient error: retry sooner
        schedule_retry(scheduled_payment, 4_hours)

FUNCTION escalate_to_delinquent(plan, payment):
    IF NOW() > payment.due_date + GRACE_DAYS:
        payment.status = "overdue"
        late_fee = compute_late_fee(payment, plan.jurisdiction)
        payment.late_fee = late_fee
        plan.late_fees_accrued += late_fee
        plan.delinquency_stage = advance_delinquency(plan.delinquency_stage)
        start_dunning_sequence(plan)

    IF plan.delinquency_stage == "charge_off":
        plan.status = "defaulted"
        report_to_credit_bureau(plan)
        queue_for_debt_sale(plan)
```

### Refund Adjustment Algorithm

```
FUNCTION process_refund(plan, refund_amount):
    IF refund_amount > plan.remaining_balance:
        -- Full refund: cancel remaining installments + refund overpayment
        overpayment = refund_amount - plan.remaining_balance
        cancel_remaining_installments(plan)
        IF overpayment > 0:
            refund_to_consumer(plan.consumer_id, overpayment)
        plan.status = "refunded"
        RETURN

    -- Partial refund: adjust remaining installments proportionally
    remaining_payments = get_future_payments(plan, status="scheduled")
    total_remaining = SUM(p.amount FOR p IN remaining_payments)

    -- Distribute refund across remaining installments
    FOR payment IN remaining_payments:
        proportion = payment.amount / total_remaining
        reduction = ROUND(refund_amount × proportion, 2)
        payment.amount = payment.amount - reduction
        payment.principal = payment.principal - reduction

    -- Handle rounding: adjust last payment
    actual_reduction = SUM(original - new FOR each payment)
    IF actual_reduction != refund_amount:
        remaining_payments.last().amount += (actual_reduction - refund_amount)

    plan.remaining_balance -= refund_amount
    plan.total_amount -= refund_amount

    -- Notify merchant of adjusted settlement
    adjust_merchant_settlement(plan.merchant_id, refund_amount)
    emit_event("plan.refund_adjusted", plan, refund_amount)
```

---

## State Machine: Installment Plan Lifecycle

```
                          ┌──────────────────────┐
                          │      CREATED          │
                          │  (checkout confirmed) │
                          └──────────┬───────────┘
                                     │ first payment collected
                                     ▼
                          ┌──────────────────────┐
                 ┌───────►│       ACTIVE          │◄──────────┐
                 │        │  (payments on track)  │           │
                 │        └──────────┬───────────┘           │
                 │                   │                        │
          payment collected     payment missed           hardship plan
                 │                   │                     accepted
                 │                   ▼                        │
                 │        ┌──────────────────────┐           │
                 │        │       OVERDUE         │───────────┘
                 │        │   (grace period)      │
                 │        └──────────┬───────────┘
                 │                   │ grace period expired
                 │                   ▼
                 │        ┌──────────────────────┐
                 │        │     DELINQUENT        │
                 │        │  (dunning active)     │
                 │        └──────────┬───────────┘
                 │                   │
                 │         ┌─────────┴─────────┐
                 │         ▼                   ▼
              ┌──────────────────┐  ┌──────────────────┐
              │    HARDSHIP      │  │   CHARGE_OFF     │
              │ (modified terms) │  │ (120+ days past) │
              └──────────────────┘  └──────────────────┘
                                           │
    all payments collected                 ▼
          │                     ┌──────────────────┐
          ▼                     │    DEBT_SOLD      │
┌──────────────────────┐        │ (sent to agency)  │
│     COMPLETED        │        └──────────────────┘
│  (plan fulfilled)    │
└──────────────────────┘

Also: CANCELLED (merchant cancels order), REFUNDED (full refund processed)
```
