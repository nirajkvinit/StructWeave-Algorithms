# Deep Dive & Bottlenecks

## Deep Dive 1: Idempotency Key Implementation

### The Problem

A customer clicks "Pay" and the request times out after 3 seconds. The merchant's server does not know if the payment succeeded or failed. It retries the request. Without idempotency, the customer could be charged twice.

This is not a theoretical concern. Network timeouts between merchant servers and the payment gateway happen on ~0.1-0.5% of requests. At 100M daily transactions, that is 100K-500K ambiguous outcomes per day.

### The Solution: Multi-Layer Idempotency

```
Layer 1: Client-Provided Idempotency Key (API Layer)
├── Client sends Idempotency-Key header with every mutating request
├── Server stores key + request fingerprint + response in Redis (24h TTL)
├── Same key + same params → return cached response
├── Same key + different params → return 422 error
└── Key expired (>24h) → treated as new request

Layer 2: Payment-Level Deduplication (Database Layer)
├── Each PaymentIntent has a unique (merchant_id, idempotency_key) constraint
├── Even if Redis fails, the database prevents duplicate PaymentIntents
└── Acts as a safety net for the in-memory idempotency layer

Layer 3: Card Network Deduplication (External Layer)
├── Card networks track transaction by: PAN + amount + merchant_id + date
├── Duplicate authorization requests within a short window are flagged
└── Last line of defense, but unreliable for exact deduplication
```

### Key Design Decisions

**Why client-provided keys (not server-generated)?**

Server-generated keys would require the client to make two requests: one to get a key, then one to use it. This doubles latency and introduces its own failure modes. Client-generated keys (V4 UUIDs or deterministic keys like `order_{id}_attempt_{n}`) give the client full control over retry semantics.

**Why 24-hour TTL?**

Shorter TTLs risk allowing duplicates if retries happen hours later (e.g., merchant's retry queue processes slowly). Longer TTLs waste memory. 24 hours balances safety with storage efficiency. At ~200M keys/day × 1 KB, the 24h window requires ~200 GB---large but manageable for a Redis cluster.

**What about the "in_progress" race condition?**

If a request is being processed (status: "in_progress") and a retry arrives, the system returns 409 Conflict rather than processing the duplicate. The client should wait and retry after a short delay. This prevents the scenario where two identical requests process simultaneously.

### Failure Modes

| Scenario | Behavior |
|----------|----------|
| Redis unavailable | Fall back to database-level dedup (slower, but correct) |
| Request succeeds, Redis write fails | Payment succeeds; next retry with same key hits DB uniqueness constraint |
| Request fails with retryable error (500) | Delete idempotency key from Redis; allow client to retry |
| Request fails with non-retryable error (card declined) | Cache the error response; same key returns same decline |
| Client sends same key with different amount | Return 422: "Idempotency key already used with different parameters" |

---

## Deep Dive 2: Exactly-Once Payment Semantics

### Why "Exactly Once" is Hard

The payment authorization flow crosses five parties: merchant → gateway → acquirer → card network → issuing bank. A timeout at any boundary creates ambiguity:

```
Merchant ──→ Gateway ──→ Acquirer ──→ Visa ──→ Issuing Bank
                                           ↑
                              Timeout here: did the charge go through?

Possible outcomes:
1. Issuing bank never received the request → safe to retry
2. Issuing bank approved, but response was lost → DO NOT retry (double charge)
3. Issuing bank declined → safe to retry with different card
4. Issuing bank is still processing → wait and check status
```

### The Resolution: State Machine + Reconciliation

**Step 1: Persist before sending to network**

Before sending the authorization request to the acquiring bank, the payment orchestrator persists the PaymentIntent with status "processing" and a unique `network_transaction_id`. This creates a record of intent regardless of network outcome.

**Step 2: Handle ambiguous responses**

When a timeout occurs on the card network call:
1. Do NOT immediately retry the authorization
2. Query the acquiring bank's status endpoint with the `network_transaction_id`
3. If the bank confirms approval → transition to "succeeded"
4. If the bank confirms decline → transition to "requires_payment_method"
5. If the bank has no record → safe to retry (the request never arrived)
6. If the bank's status is unknown → mark as "pending_network_resolution"

**Step 3: Reconciliation sweeper**

A background process runs every 5 minutes:
1. Find all PaymentIntents in "processing" state for > 2 minutes
2. Query the acquiring bank for each unresolved payment
3. Resolve based on bank's response
4. For any still-unresolved after 1 hour, escalate to manual review

**Step 4: End-of-day settlement reconciliation**

Card networks send daily settlement files listing all approved transactions. The gateway compares settlement files against its own records:
- Transactions in settlement but not in gateway → "phantom charges" (investigate)
- Transactions in gateway but not in settlement → "missed settlements" (resubmit)
- Amount mismatches → flag for investigation

---

## Deep Dive 3: Webhook Delivery Guarantees

### Design Constraints

- **At-least-once delivery**: guaranteed (exactly-once is impossible over HTTP)
- **Ordering**: best-effort within a transaction's lifecycle (no global ordering)
- **Latency**: p50 < 2s for first delivery attempt
- **Reliability**: 99.95% delivered within 1 hour; 99.99% within 24 hours
- **Scale**: 500M events/day to 10M+ merchant endpoints

### Architecture

```
Payment Event Published
        │
        ▼
┌─────────────────────┐
│   Event Bus Topic    │
│  (partitioned by     │
│   merchant_id)       │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌────────┐  ┌────────┐
│Worker 1│  │Worker N│    Webhook Delivery Workers (horizontally scaled)
└───┬────┘  └───┬────┘
    │           │
    ▼           ▼
┌─────────────────────┐
│ Per-Endpoint Queue   │    Each merchant endpoint has its own delivery queue
│ (ordered per txn)    │    to prevent slow endpoints from blocking others
└──────────┬──────────┘
           │
    Deliver via HTTPS
           │
    ┌──────┴──────┐
    │  Success?   │
    ├─YES─────────┤──→ Mark delivered, update endpoint health
    └─NO──────────┘──→ Schedule retry (exponential backoff)
                            │
                      ┌─────┴─────┐
                      │ Exhausted? │
                      ├─YES───────┤──→ Dead Letter Queue → merchant can replay
                      └─NO────────┘──→ Re-enqueue with delay
```

### Per-Endpoint Isolation

The most critical design decision: **each merchant endpoint gets its own logical delivery queue**. Without this, a single slow or unresponsive endpoint blocks delivery to all other merchants. With per-endpoint queues:

- Slow endpoint: only its own events queue up; other merchants unaffected
- Down endpoint: retries accumulate only for that endpoint
- Endpoint recovery: backlog drains independently

### Signature Verification

Merchants verify webhook authenticity using HMAC-SHA256:

```
-- Gateway computes:
timestamp = current_unix_time
payload = event_json_string
signature = HMAC_SHA256(secret, timestamp + "." + payload)

-- Header sent:
Webhook-Signature: t=1700000000,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd

-- Merchant verifies:
1. Extract timestamp and signature from header
2. Recompute: expected = HMAC_SHA256(my_secret, timestamp + "." + raw_body)
3. Compare expected == received signature (constant-time comparison)
4. Check timestamp is within 5-minute tolerance (prevent replay attacks)
```

### Handling Duplicate Deliveries

Since delivery is at-least-once, merchants receive instructions to:
1. Store the `event.id` in their database
2. Before processing, check if this event ID was already processed
3. If already processed, return 200 OK without re-executing business logic

---

## Deep Dive 4: Card Network Timeout Handling

### The Timeout Spectrum

```
Timeout Location           Duration    Gateway's Knowledge          Action
─────────────────────────────────────────────────────────────────────────────
Gateway → Acquirer         2-5s        Request may not have         Safe to retry to acquirer
                                       reached acquirer
Acquirer → Card Network    5-15s       Acquirer may have            Query acquirer for status
                                       submitted to network
Card Network → Issuer      15-30s      Network may have             Query network (reversal
                                       authorized                   if needed)
Issuer processing          30-60s      Issuer holds funds but       Wait for settlement file
                                       response lost                reconciliation
```

### Timeout Handling Strategy

```
FUNCTION handle_authorization_timeout(payment_intent, timeout_location):

    -- Rule 1: Never blindly retry to the card network
    -- A retry could result in a double authorization hold on the customer's card

    IF timeout_location == "gateway_to_acquirer":
        -- High confidence request never reached acquirer
        -- Safe to retry with same network_transaction_id
        RETRY authorization (max 1 retry)

    ELSE IF timeout_location == "acquirer_to_network":
        -- Ambiguous: acquirer may have forwarded to network
        -- Query acquirer's transaction status API
        status = QUERY_ACQUIRER_STATUS(payment.network_transaction_id)

        IF status == "approved":
            transition_to("succeeded")
        ELSE IF status == "declined":
            transition_to("requires_payment_method")
        ELSE IF status == "not_found":
            -- Request never reached network; safe to retry
            RETRY authorization
        ELSE:
            -- Still ambiguous; wait for resolution
            transition_to("pending_network_resolution")
            SCHEDULE resolution_check(payment, delay=30_seconds)

    ELSE IF timeout_location == "network_to_issuer":
        -- Most dangerous: funds may be held on customer's card
        -- Do NOT retry (risk double hold)
        transition_to("pending_network_resolution")
        -- Request acquirer to send a reversal if no response within 5 minutes
        SCHEDULE conditional_reversal(payment, delay=5_minutes)

-- Background: reconciliation will catch any remaining ambiguities
-- within 24 hours via settlement file comparison
```

### Authorization Reversal

When a timeout results in an ambiguous authorization, the gateway sends a reversal (void) request to release the hold on the customer's card:

```
Scenario: Gateway times out waiting for authorization response
   → Acquirer confirms auth was approved (status query returns "approved")
   → But gateway already told merchant "failed" (timeout)
   → Gateway sends authorization reversal to release the hold
   → Customer's available credit is restored
   → Merchant can re-attempt the payment
```

This is why the gateway must persist the `network_transaction_id` before sending to the acquirer---it needs this ID to query status or send reversals.

---

## Deep Dive 5: Ledger Consistency and Reconciliation

### The Consistency Challenge

The ledger must satisfy two invariants at all times:

1. **Per-journal balance**: For every journal (group of related entries), SUM(debits) = SUM(credits)
2. **Per-account balance**: Account balance = SUM(all credits to account) - SUM(all debits from account)

At 400M journal entries per day (100M transactions × 4 entries each), even a 0.001% error rate means 4,000 imbalanced entries per day---each representing real money unaccounted for.

### Write-Path Consistency

```
-- All entries for a single journal are written in one atomic transaction
BEGIN TRANSACTION:
    -- Compute all entries
    entries = compute_journal_entries(payment_event)

    -- Verify balance before writing
    total_debits = SUM(entry.amount FOR entry IN entries WHERE entry.type == DEBIT)
    total_credits = SUM(entry.amount FOR entry IN entries WHERE entry.type == CREDIT)
    ASSERT total_debits == total_credits

    -- Write all entries atomically
    FOR EACH entry IN entries:
        INSERT INTO journal_entries VALUES (entry)

COMMIT TRANSACTION
-- If any INSERT fails, entire journal rolls back → no partial entries
```

### Reconciliation Tiers

```
Tier 1: Real-Time (per-write)
├── Assert debit/credit balance within each transaction
├── Reject writes that would create imbalance
└── Latency: 0ms additional (part of write path)

Tier 2: Near-Real-Time (every 5 minutes)
├── Sum all debits and credits per account for the last 5 minutes
├── Compare computed balance vs. cached account balance
├── Alert on any discrepancy > $0.01
└── Auto-correct rounding errors; escalate others

Tier 3: Daily Reconciliation (end of day)
├── Compare ledger totals vs. card network settlement files
├── Compare ledger totals vs. acquiring bank statements
├── Identify: phantom charges, missed settlements, amount mismatches
├── Generate reconciliation report for finance team
└── Target: 99.99% of dollar volume reconciled within 4 days

Tier 4: Monthly Audit
├── Full account balance recalculation from journal entries
├── Compare vs. cached balances
├── Generate audit trail for compliance
└── External auditor review (annual for SOC 2)
```

### Handling Ledger Anomalies

| Anomaly | Detection | Resolution |
|---------|-----------|------------|
| Imbalanced journal | Write-time assertion | Reject the write; alert engineering |
| Account balance drift | Tier 2 reconciliation | Recompute from journal entries; create adjustment entry |
| Settlement mismatch | Tier 3 daily recon | Investigate; create adjustment entry with approval |
| Missing ledger entry | Tier 3 (payment exists but no ledger entry) | Replay payment event through ledger service |
| Duplicate ledger entry | Tier 2 (balance drift) | Idempotency check on journal_id; void duplicate |

---

## Deep Dive 6: Dispute and Chargeback Lifecycle

### End-to-End Dispute Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Customer  │    │ Issuing  │    │   Card   │    │ Acquiring│    │ Payment  │
│           │    │  Bank    │    │ Network  │    │  Bank    │    │ Gateway  │
└─────┬────┘    └─────┬────┘    └────┬─────┘    └─────┬────┘    └─────┬────┘
      │               │              │                │               │
      │ "I didn't     │              │                │               │
      │  make this    │              │                │               │
      │  purchase"    │              │                │               │
      ├──────────────►│              │                │               │
      │               │              │                │               │
      │               │ Chargeback   │                │               │
      │               │ (reason code)│                │               │
      │               ├─────────────►│                │               │
      │               │              │                │               │
      │               │              │ Forward to     │               │
      │               │              │ acquirer       │               │
      │               │              ├───────────────►│               │
      │               │              │                │               │
      │               │              │                │ Notify gateway│
      │               │              │                ├──────────────►│
      │               │              │                │               │
      │               │              │                │  Notify       │
      │               │              │                │  merchant     │
      │               │              │                │  (webhook)    │
      │               │              │                │               │
      │               │              │                │  Merchant     │
      │               │              │                │  submits      │
      │               │              │                │◄──────────────│
      │               │              │                │  evidence     │
      │               │              │                │               │
      │               │              │  Representment │               │
      │               │              │◄───────────────│               │
      │               │              │                │               │
      │               │  Review      │                │               │
      │               │◄─────────────│                │               │
      │               │              │                │               │
      │  Decision     │              │                │               │
      │◄──────────────│              │                │               │
      │               │              │                │               │
```

### Dispute Lifecycle States

```
1. EARLY_WARNING (Visa VFMP / MC Ethoca)
   - Pre-dispute alert before formal chargeback
   - Gateway can proactively refund to prevent chargeback
   - Window: 24-72 hours

2. NEEDS_RESPONSE
   - Formal chargeback received from card network
   - Funds provisionally deducted from merchant
   - Merchant has 9-30 days to respond (varies by network and region)

3. UNDER_REVIEW
   - Merchant submitted evidence (representment)
   - Issuing bank reviewing evidence
   - Decision in 10-45 days

4. WON
   - Evidence accepted; funds returned to merchant
   - Chargeback reversed

5. LOST
   - Evidence rejected; funds remain with cardholder
   - Merchant may enter pre-arbitration (additional $500-1000 filing fee)

6. PRE_ARBITRATION
   - Either party contests the initial decision
   - 15-20 days to accept or escalate
   - Escalation to card network arbitration (binding decision)
```

### Financial Impact on Ledger

```
-- When chargeback is received (NEEDS_RESPONSE):
DEBIT  merchant_receivable      $99.00    -- funds provisionally removed
CREDIT chargeback_reserve       $99.00    -- held in reserve
DEBIT  merchant_receivable      $15.00    -- chargeback fee
CREDIT platform_fee_revenue     $15.00    -- gateway charges dispute fee

-- If merchant wins:
DEBIT  chargeback_reserve       $99.00    -- release reserve
CREDIT merchant_receivable      $99.00    -- funds returned to merchant

-- If merchant loses:
DEBIT  chargeback_reserve       $99.00    -- release reserve
CREDIT customer_refund_payable  $99.00    -- funds go to cardholder's bank
```

---

## Bottleneck Summary

| Bottleneck | Impact | Mitigation |
|-----------|--------|------------|
| **Card network latency (1-3s)** | Dominates payment authorization time; cannot be reduced | Optimize everything else to < 100ms; async post-authorization processing |
| **Idempotency store hotspot** | All payment writes check Redis; Redis cluster becomes bottleneck | Shard by merchant_id; use consistent hashing; fall back to DB on Redis failure |
| **Webhook fan-out at scale** | 500M events/day to 10M endpoints; slow endpoints create backpressure | Per-endpoint queues; circuit breakers; separate slow-endpoint pool |
| **Ledger write throughput** | 400M entries/day must be written sequentially per account | Shard ledger by merchant; batch writes; async balance computation |
| **Settlement file processing** | Daily files from card networks can be 100M+ records | Stream processing; parallel parsing by network; incremental reconciliation |
| **Dispute evidence handling** | File uploads + evidence assembly within tight deadlines | Pre-built evidence templates; auto-collect transaction metadata; deadline alerting |
| **Peak traffic bursts** | Flash sales can 13x normal traffic in seconds | Auto-scaling on payment path; pre-provisioned capacity; circuit breakers on non-critical paths |
