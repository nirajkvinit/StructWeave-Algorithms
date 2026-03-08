# Low-Level Design

## Data Models

### Payment Intent

```
PaymentIntent {
    id:                  string       -- "pi_xyz789" (globally unique)
    merchant_id:         string       -- FK to Merchant
    idempotency_key:     string       -- client-provided, unique per merchant
    amount:              integer      -- amount in smallest currency unit (e.g., cents)
    currency:            string       -- ISO 4217 (e.g., "usd", "inr", "eur")
    status:              enum         -- requires_payment_method | requires_confirmation |
                                         requires_action | processing | requires_capture |
                                         succeeded | canceled | refunded | partially_refunded | disputed
    capture_method:      enum         -- automatic | manual
    payment_method_id:   string       -- FK to PaymentMethod (tokenized)
    customer_id:         string       -- FK to Customer (optional)
    description:         string       -- merchant-provided description
    metadata:            jsonb        -- arbitrary key-value pairs from merchant
    amount_capturable:   integer      -- amount that can still be captured (manual capture)
    amount_received:     integer      -- amount successfully captured
    authorization_code:  string       -- from card network on approval
    network_transaction_id: string    -- card network reference for this auth
    failure_code:        string       -- decline reason code (if failed)
    failure_message:     string       -- human-readable decline reason
    risk_score:          float        -- fraud engine score (0.0 - 1.0)
    three_d_secure:      jsonb        -- { version, status, eci, cavv }
    presentment_currency: string      -- currency shown to customer
    settlement_currency: string       -- currency merchant receives
    fx_rate:             decimal      -- locked FX rate at auth time
    created_at:          timestamp
    updated_at:          timestamp
    canceled_at:         timestamp    -- null if not canceled
    captured_at:         timestamp    -- null if not yet captured
    expires_at:          timestamp    -- auth hold expiration (7-30 days)
}

Index: (merchant_id, created_at DESC)           -- merchant dashboard queries
Index: (idempotency_key, merchant_id) UNIQUE    -- idempotency deduplication
Index: (status, created_at)                      -- batch processing queries
Index: (customer_id, created_at DESC)            -- customer payment history
```

### Payment Method (Tokenized)

```
PaymentMethod {
    id:                  string       -- "pm_card_abc" (globally unique)
    merchant_id:         string       -- FK to Merchant
    customer_id:         string       -- FK to Customer (for saved cards)
    type:                enum         -- card | bank_transfer | upi | wallet
    status:              enum         -- active | expired | revoked

    -- Card-specific fields (stored in tokenization vault)
    card_token:          string       -- vault reference (never raw PAN)
    card_brand:          enum         -- visa | mastercard | amex | rupay
    card_last4:          string       -- last 4 digits for display
    card_exp_month:      integer      -- expiration month
    card_exp_year:       integer      -- expiration year
    card_fingerprint:    string       -- hash of full card number (for dedup)
    card_country:        string       -- issuing country
    network_token:       string       -- Visa/MC network token (if available)

    -- Bank transfer fields
    bank_name:           string
    account_last4:       string
    routing_number:      string       -- masked

    -- UPI fields
    upi_vpa:             string       -- virtual payment address

    billing_address:     jsonb        -- for AVS verification
    created_at:          timestamp
}

Index: (customer_id, type)                       -- list customer's payment methods
Index: (card_fingerprint)                        -- detect duplicate cards
```

### Merchant

```
Merchant {
    id:                  string       -- "merch_001" (globally unique)
    business_name:       string
    business_type:       enum         -- individual | company | non_profit
    country:             string       -- ISO 3166 country code
    default_currency:    string       -- settlement currency
    status:              enum         -- pending_verification | active | suspended | deactivated
    risk_tier:           enum         -- low | medium | high | critical

    -- KYC/KYB
    kyc_status:          enum         -- pending | verified | rejected
    kyc_verified_at:     timestamp
    business_registration_number: string

    -- API Configuration
    api_key_live_hash:   string       -- hashed live secret key
    api_key_test_hash:   string       -- hashed test secret key
    publishable_key_live: string      -- "pk_live_..."
    publishable_key_test: string      -- "pk_test_..."

    -- Pricing
    card_rate_percent:   decimal      -- e.g., 2.9 (percent)
    card_rate_fixed:     integer      -- e.g., 30 (cents)
    payout_schedule:     enum         -- daily | weekly | monthly | manual
    payout_delay_days:   integer      -- e.g., 2 (T+2)

    -- Webhook Configuration (stored separately, shown for context)
    -- See WebhookEndpoint model

    created_at:          timestamp
    updated_at:          timestamp
}

Index: (status)                                  -- active merchant queries
Index: (api_key_live_hash) UNIQUE                -- API authentication
Index: (api_key_test_hash) UNIQUE
```

### Ledger Entry (Double-Entry)

```
JournalEntry {
    id:                  string       -- globally unique, sequential
    journal_id:          string       -- groups related debits/credits
    account_id:          string       -- FK to LedgerAccount
    entry_type:          enum         -- DEBIT | CREDIT
    amount:              integer      -- always positive, in smallest currency unit
    currency:            string       -- ISO 4217
    description:         string       -- human-readable
    reference_type:      string       -- "payment_intent" | "refund" | "payout" | "fee" | "dispute"
    reference_id:        string       -- FK to the originating entity
    merchant_id:         string       -- FK to Merchant
    created_at:          timestamp    -- immutable, no updated_at
    sequence_number:     bigint       -- monotonically increasing per account
}

LedgerAccount {
    id:                  string       -- "la_merch001_receivable"
    merchant_id:         string       -- FK to Merchant (null for platform accounts)
    account_type:        enum         -- asset | liability | revenue | expense
    account_name:        string       -- "merchant_receivable" | "platform_fee" | "network_fee" | ...
    currency:            string
    balance:             integer      -- computed: SUM(credits) - SUM(debits)
    created_at:          timestamp
}

-- CRITICAL INVARIANT: For every journal_id, SUM(debits) = SUM(credits)
-- This is enforced at write time and verified during reconciliation

Index: (journal_id)                              -- fetch all entries for a journal
Index: (account_id, created_at)                  -- account statement / balance calc
Index: (reference_type, reference_id)            -- find ledger entries for a payment
Index: (merchant_id, created_at)                 -- merchant financial reporting
```

### Webhook Event & Endpoint

```
WebhookEndpoint {
    id:                  string       -- "we_001"
    merchant_id:         string       -- FK to Merchant
    url:                 string       -- HTTPS endpoint URL
    secret:              string       -- HMAC signing secret (encrypted at rest)
    enabled_events:      string[]     -- ["payment_intent.succeeded", "charge.refunded", ...]
    status:              enum         -- active | disabled
    disabled_reason:     string       -- "consecutive_failures" | "merchant_disabled"
    failure_count:       integer      -- consecutive delivery failures
    last_delivery_at:    timestamp
    created_at:          timestamp
}

WebhookEvent {
    id:                  string       -- "evt_001" (globally unique)
    type:                string       -- "payment_intent.succeeded"
    merchant_id:         string       -- FK to Merchant
    data:                jsonb        -- event payload (snapshot of object at event time)
    created_at:          timestamp

    -- Not stored in main table, but tracked per-endpoint:
}

WebhookDeliveryAttempt {
    id:                  string
    event_id:            string       -- FK to WebhookEvent
    endpoint_id:         string       -- FK to WebhookEndpoint
    attempt_number:      integer      -- 1, 2, 3, ...
    status:              enum         -- pending | delivered | failed | exhausted
    response_code:       integer      -- HTTP status code (null if timeout/connection error)
    response_body:       string       -- first 1KB of response (for debugging)
    error_message:       string       -- connection error detail
    next_retry_at:       timestamp    -- scheduled retry time (null if delivered or exhausted)
    delivered_at:        timestamp    -- null if not yet delivered
    created_at:          timestamp
}

Index: (event_id, endpoint_id)                   -- delivery status per endpoint
Index: (endpoint_id, status, next_retry_at)      -- retry queue processing
Index: (merchant_id, created_at DESC)            -- merchant event log
```

### Dispute

```
Dispute {
    id:                  string       -- "dp_001"
    payment_intent_id:   string       -- FK to PaymentIntent
    merchant_id:         string       -- FK to Merchant
    amount:              integer      -- disputed amount
    currency:            string
    reason:              enum         -- fraudulent | duplicate | product_not_received |
                                         product_unacceptable | subscription_canceled |
                                         credit_not_processed | general
    status:              enum         -- warning_needs_response | needs_response |
                                         under_review | won | lost | accepted
    network_reason_code: string       -- card network-specific reason code
    card_network:        enum         -- visa | mastercard | amex
    evidence_due_by:     timestamp    -- deadline for merchant evidence submission

    -- Evidence (merchant-submitted)
    evidence:            jsonb        -- { receipt, shipping_tracking, customer_communication, ... }
    evidence_submitted_at: timestamp

    -- Resolution
    resolved_at:         timestamp
    net_worth:           integer      -- amount after resolution (negative if lost)

    created_at:          timestamp
    updated_at:          timestamp
}

Index: (merchant_id, status)                     -- merchant dispute dashboard
Index: (status, evidence_due_by)                 -- upcoming deadlines
Index: (payment_intent_id)                       -- dispute for a payment
```

---

## API Design

### Payment Intents API

```
POST /v1/payment_intents
Headers:
    Authorization: Bearer sk_live_...
    Idempotency-Key: "order_12345_attempt_1"
    Content-Type: application/json
Body:
{
    "amount": 9900,
    "currency": "usd",
    "payment_method": "pm_card_abc",
    "capture_method": "automatic",
    "confirm": true,
    "description": "Order #12345",
    "metadata": { "order_id": "12345" }
}
Response: 200 OK
{
    "id": "pi_xyz789",
    "status": "succeeded",
    "amount": 9900,
    "amount_received": 9900,
    "currency": "usd",
    "payment_method": "pm_card_abc",
    "created": 1700000000,
    "metadata": { "order_id": "12345" }
}

---

POST /v1/payment_intents/{id}/capture
Headers:
    Authorization: Bearer sk_live_...
    Idempotency-Key: "capture_pi_xyz789"
Body:
{
    "amount_to_capture": 9900       -- optional: partial capture
}
Response: 200 OK
{
    "id": "pi_xyz789",
    "status": "succeeded",
    "amount_received": 9900
}

---

POST /v1/payment_intents/{id}/cancel
Headers:
    Authorization: Bearer sk_live_...
    Idempotency-Key: "cancel_pi_xyz789"
Response: 200 OK
{
    "id": "pi_xyz789",
    "status": "canceled",
    "canceled_at": 1700000100
}

---

GET /v1/payment_intents/{id}
Headers:
    Authorization: Bearer sk_live_...
Response: 200 OK
{
    "id": "pi_xyz789",
    "status": "succeeded",
    ...full PaymentIntent object...
}

---

GET /v1/payment_intents?limit=10&starting_after=pi_abc&created[gte]=1699900000
Headers:
    Authorization: Bearer sk_live_...
Response: 200 OK
{
    "data": [ ...array of PaymentIntents... ],
    "has_more": true,
    "url": "/v1/payment_intents"
}
```

### Refunds API

```
POST /v1/refunds
Headers:
    Authorization: Bearer sk_live_...
    Idempotency-Key: "refund_pi_xyz789_full"
Body:
{
    "payment_intent": "pi_xyz789",
    "amount": 9900,                  -- optional: omit for full refund
    "reason": "requested_by_customer"
}
Response: 200 OK
{
    "id": "re_001",
    "payment_intent": "pi_xyz789",
    "amount": 9900,
    "status": "succeeded",
    "reason": "requested_by_customer",
    "created": 1700001000
}
```

### Webhook Endpoints API

```
POST /v1/webhook_endpoints
Headers:
    Authorization: Bearer sk_live_...
Body:
{
    "url": "https://merchant.com/webhooks",
    "enabled_events": ["payment_intent.succeeded", "charge.refunded"]
}
Response: 200 OK
{
    "id": "we_001",
    "url": "https://merchant.com/webhooks",
    "secret": "whsec_...",           -- returned only on creation
    "enabled_events": ["payment_intent.succeeded", "charge.refunded"],
    "status": "active"
}
```

### Disputes API

```
POST /v1/disputes/{id}/submit_evidence
Headers:
    Authorization: Bearer sk_live_...
Body:
{
    "evidence": {
        "receipt": "file_upload_id",
        "shipping_tracking_number": "1Z999AA10123456784",
        "customer_communication": "file_upload_id",
        "uncategorized_text": "Customer received item on Jan 5..."
    }
}
Response: 200 OK
{
    "id": "dp_001",
    "status": "under_review",
    "evidence_submitted_at": 1700002000
}
```

---

## Algorithms

### Algorithm 1: Idempotency Key Processing

```
FUNCTION process_idempotent_request(merchant_id, idempotency_key, request_params):
    -- Step 1: Compute composite key
    cache_key = HASH(merchant_id + ":" + idempotency_key)

    -- Step 2: Atomic check-and-set in Redis
    existing = REDIS.GET(cache_key)

    IF existing IS NOT NULL:
        -- Step 3a: Key exists — check if same request params
        IF existing.request_fingerprint != HASH(request_params):
            RETURN ERROR 422 "Idempotency key reused with different parameters"

        IF existing.status == "in_progress":
            -- Original request still processing — return 409 Conflict
            RETURN ERROR 409 "Request is still being processed"

        IF existing.status == "complete":
            -- Return cached response (same status code and body)
            RETURN existing.response_code, existing.response_body

    -- Step 3b: New key — atomically set with TTL
    success = REDIS.SET(cache_key, {
        request_fingerprint: HASH(request_params),
        status: "in_progress",
        created_at: NOW()
    }, NX=true, TTL=86400)            -- NX = only if not exists; TTL = 24 hours

    IF NOT success:
        -- Race condition: another request set the key between GET and SET
        -- Retry from Step 2 (loop, max 3 retries)
        RETRY

    -- Step 4: Execute the actual payment operation
    TRY:
        result = execute_payment(request_params)

        -- Step 5: Cache the response
        REDIS.SET(cache_key, {
            request_fingerprint: HASH(request_params),
            status: "complete",
            response_code: result.status_code,
            response_body: result.body,
            created_at: NOW()
        }, TTL=86400)

        RETURN result

    CATCH error:
        -- Step 6: On failure, mark as failed (allow retry with same key)
        IF error is retryable (network timeout, 500):
            REDIS.DELETE(cache_key)    -- allow client to retry
        ELSE:
            REDIS.SET(cache_key, {
                status: "complete",
                response_code: error.status_code,
                response_body: error.body
            }, TTL=86400)              -- cache the error response too

        RETURN error
```

### Algorithm 2: Webhook Delivery with Exponential Backoff

```
FUNCTION deliver_webhook(event, endpoint):
    MAX_ATTEMPTS = 9
    BASE_DELAY_SECONDS = 60            -- 1 minute
    MAX_DELAY_SECONDS = 259200         -- 3 days

    FOR attempt = 1 TO MAX_ATTEMPTS:
        -- Construct signed payload
        timestamp = UNIX_TIMESTAMP_NOW()
        signature = HMAC_SHA256(
            key = endpoint.secret,
            message = timestamp + "." + JSON_SERIALIZE(event)
        )

        -- Attempt delivery
        TRY:
            response = HTTP_POST(
                url = endpoint.url,
                headers = {
                    "Content-Type": "application/json",
                    "Webhook-Signature": "t=" + timestamp + ",v1=" + signature,
                    "Webhook-Id": event.id
                },
                body = JSON_SERIALIZE(event),
                timeout = 10_SECONDS
            )

            IF response.status_code >= 200 AND response.status_code < 300:
                -- Success
                record_delivery(event.id, endpoint.id, attempt, "delivered", response.status_code)
                RESET endpoint.failure_count to 0
                RETURN SUCCESS

            -- Non-2xx response
            record_delivery(event.id, endpoint.id, attempt, "failed", response.status_code)

        CATCH timeout_error:
            record_delivery(event.id, endpoint.id, attempt, "failed", null, "timeout")

        CATCH connection_error:
            record_delivery(event.id, endpoint.id, attempt, "failed", null, error.message)

        -- Calculate next retry delay with exponential backoff + jitter
        IF attempt < MAX_ATTEMPTS:
            delay = MIN(BASE_DELAY_SECONDS * (2 ^ (attempt - 1)), MAX_DELAY_SECONDS)
            jitter = RANDOM(0, delay * 0.2)    -- 20% jitter
            next_retry = NOW() + delay + jitter
            schedule_retry(event.id, endpoint.id, attempt + 1, next_retry)
            RETURN RETRY_SCHEDULED

    -- All attempts exhausted
    move_to_dead_letter_queue(event.id, endpoint.id)
    INCREMENT endpoint.failure_count
    IF endpoint.failure_count > 100:
        disable_endpoint(endpoint.id, reason="consecutive_failures")
        notify_merchant(endpoint.merchant_id, "Webhook endpoint disabled")
```

### Algorithm 3: Double-Entry Ledger Recording

```
FUNCTION record_payment_in_ledger(payment_intent):
    journal_id = GENERATE_UUID()
    merchant_id = payment_intent.merchant_id
    amount = payment_intent.amount_received
    currency = payment_intent.currency

    -- Calculate fees
    merchant = GET_MERCHANT(merchant_id)
    platform_fee = FLOOR(amount * merchant.card_rate_percent / 100) + merchant.card_rate_fixed
    network_fee = calculate_network_fee(payment_intent)  -- interchange + assessment
    platform_revenue = platform_fee - network_fee
    merchant_net = amount - platform_fee

    -- Create balanced journal entries (all within one atomic transaction)
    BEGIN TRANSACTION:
        -- Entry 1: Customer pays full amount → Merchant receivable
        INSERT JournalEntry(journal_id, merchant_receivable_account, CREDIT, amount, currency,
            "Payment received", "payment_intent", payment_intent.id, merchant_id)

        -- Entry 2: Platform collects full amount from payment processor
        INSERT JournalEntry(journal_id, processor_settlement_account, DEBIT, amount, currency,
            "Settlement from processor", "payment_intent", payment_intent.id, merchant_id)

        -- Entry 3: Platform fee deducted from merchant receivable
        INSERT JournalEntry(journal_id, merchant_receivable_account, DEBIT, platform_fee, currency,
            "Platform fee", "payment_intent", payment_intent.id, merchant_id)

        -- Entry 4: Platform fee credited to platform revenue
        INSERT JournalEntry(journal_id, platform_revenue_account, CREDIT, platform_fee, currency,
            "Platform fee revenue", "payment_intent", payment_intent.id, merchant_id)

        -- INVARIANT CHECK: sum of debits = sum of credits for this journal
        total_debits = amount + platform_fee
        total_credits = amount + platform_fee
        ASSERT total_debits == total_credits

    COMMIT TRANSACTION

    -- Update account balances (can be async, derived from journal entries)
    update_account_balance(merchant_receivable_account, +merchant_net)
    update_account_balance(platform_revenue_account, +platform_revenue)


FUNCTION record_refund_in_ledger(refund, original_payment):
    journal_id = GENERATE_UUID()

    -- Reverse the original entries proportionally
    refund_ratio = refund.amount / original_payment.amount_received
    platform_fee_refund = FLOOR(original_platform_fee * refund_ratio)

    BEGIN TRANSACTION:
        -- Reverse merchant receivable
        INSERT JournalEntry(journal_id, merchant_receivable_account, DEBIT, refund.amount, ...)
        INSERT JournalEntry(journal_id, processor_settlement_account, CREDIT, refund.amount, ...)

        -- Reverse platform fee (proportional)
        INSERT JournalEntry(journal_id, platform_revenue_account, DEBIT, platform_fee_refund, ...)
        INSERT JournalEntry(journal_id, merchant_receivable_account, CREDIT, platform_fee_refund, ...)

        ASSERT sum_debits == sum_credits
    COMMIT TRANSACTION
```

### Algorithm 4: Payment State Machine Transition

```
FUNCTION transition_payment_status(payment_intent_id, event):
    -- Acquire row-level lock to prevent concurrent transitions
    payment = SELECT * FROM PaymentIntent WHERE id = payment_intent_id FOR UPDATE

    current_status = payment.status
    new_status = RESOLVE_NEXT_STATUS(current_status, event)

    -- Validate transition against allowed state machine
    VALID_TRANSITIONS = {
        "requires_payment_method": ["requires_confirmation", "canceled"],
        "requires_confirmation":   ["requires_action", "processing", "canceled"],
        "requires_action":         ["processing", "canceled"],
        "processing":              ["requires_capture", "succeeded", "requires_payment_method", "canceled"],
        "requires_capture":        ["succeeded", "canceled"],
        "succeeded":               ["refunded", "partially_refunded", "disputed"],
        "partially_refunded":      ["refunded", "disputed"],
        "disputed":                ["succeeded", "refunded"]
    }

    IF new_status NOT IN VALID_TRANSITIONS[current_status]:
        RAISE InvalidTransitionError(
            "Cannot transition from " + current_status + " to " + new_status
        )

    -- Persist transition with audit trail
    UPDATE PaymentIntent SET
        status = new_status,
        updated_at = NOW(),
        -- Set relevant timestamps
        captured_at = IF(new_status == "succeeded" AND current_status == "requires_capture", NOW(), captured_at),
        canceled_at = IF(new_status == "canceled", NOW(), canceled_at)
    WHERE id = payment_intent_id

    -- Record status change event
    INSERT PaymentStatusChange(payment_intent_id, current_status, new_status, event, NOW())

    -- Publish event for downstream consumers
    PUBLISH_EVENT("payment_intent." + new_status, payment)

    RETURN payment with updated status
```
