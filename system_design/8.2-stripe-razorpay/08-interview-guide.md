# Interview Guide

## 45-Minute Pacing

### Minutes 0-5: Clarify Scope

**Key clarifying questions to ask (or expect):**

| Question | Why It Matters |
|----------|---------------|
| "Are we designing a full payment gateway (like Stripe) or a payment integration for an e-commerce site?" | Full gateway = card network integration, tokenization vault, webhook delivery; integration = much simpler |
| "Do we need to handle the card network communication (ISO 8583), or can we treat the acquirer as a black box?" | Card network details show depth; treating acquirer as API is sufficient for most interviews |
| "Which payment methods: cards only, or also bank transfers, UPI, wallets?" | Cards have unique complexity (auth/capture, 3DS, chargebacks); mentioning others shows breadth |
| "Do we need webhook delivery to merchants?" | Webhooks are a major system in themselves; clarify if in scope |
| "What scale: transactions per second?" | Drives sharding, caching, and infrastructure decisions |

**Recommended scope for 45 minutes:**
- Card payment processing with authorize + capture flow
- Idempotency key system (this is THE differentiating topic)
- Webhook delivery at high level
- Ledger basics (double-entry concept)
- Mention but do not fully design: dispute handling, multi-currency, subscription billing

---

### Minutes 5-15: High-Level Architecture

Draw the architecture with these components:
1. **Client layer**: Merchant app → Client SDK (tokenizes cards) → API Gateway
2. **Idempotency Layer**: Redis-backed deduplication before any business logic
3. **Payment Orchestrator**: State machine driving authorize → capture → settle
4. **External integration**: Tokenization Vault → Acquiring Bank → Card Network → Issuing Bank
5. **Post-payment**: Ledger Service + Event Bus → Webhook Delivery Service
6. **Data stores**: PostgreSQL (payments), Redis (idempotency), Ledger DB (immutable journal), Vault (encrypted PANs)

**Key points to make:**
- "The fundamental challenge is exactly-once payment semantics---charging the customer exactly once despite network failures and retries"
- "Card data never touches the merchant's server. The client SDK tokenizes in an iframe, and we store the PAN in an isolated vault"
- "Every financial movement goes through a double-entry ledger. Debits always equal credits."
- "Webhooks use at-least-once delivery because exactly-once is impossible over HTTP"

---

### Minutes 15-28: Deep Dive --- Idempotency + Payment State Machine

This is where you differentiate. Focus on:

**1. Idempotency Key System**
- Client provides Idempotency-Key header with every mutating request
- Server stores key + request fingerprint + response in Redis (24h TTL)
- Same key + same params → return cached response (no re-execution)
- Same key + different params → return 422 error
- Key in "in_progress" state → return 409 Conflict (prevent concurrent duplicates)
- Redis failure → fall back to database uniqueness constraint

**2. The Dangerous Timeout Scenario**
- Merchant sends payment request → gateway forwards to card network → timeout
- Did the charge go through or not? This is the core problem.
- Solution: persist intent before sending to network; query acquirer status on timeout; never blindly retry to network
- Background reconciliation sweeper resolves lingering ambiguities

**3. Payment State Machine**
- States: requires_payment_method → requires_confirmation → processing → succeeded/failed
- Manual capture adds: requires_capture between processing and succeeded
- Post-success states: refunded, partially_refunded, disputed
- Every transition is validated against allowed transitions; persisted with audit trail

**4. Card Network Authorization Flow**
- Merchant → Gateway → Acquirer → Card Network (Visa/MC) → Issuing Bank → response back
- ISO 8583 message format between acquirer and network
- Authorization hold: funds blocked on card for 7 days (up to 30 with extended auth)
- Capture: actually moves the money (can be same-day or delayed)

---

### Minutes 28-38: Webhook Delivery + Ledger

**Webhook Architecture:**
- 500M events/day to 10M merchant endpoints
- At-least-once delivery with HMAC-SHA256 signature verification
- Exponential backoff retry for up to 3 days (9 attempts)
- Per-endpoint delivery queues (prevents slow endpoints from blocking others)
- Dead letter queue for exhausted retries; merchant can replay via API
- Endpoints disabled after 3 days of continuous failure; merchant notified

**Ledger System:**
- Every payment creates balanced journal entries: debits = credits
- Append-only, immutable---no UPDATE or DELETE on journal entries
- Account balance = SUM(credits) - SUM(debits) for that account
- Multi-tier reconciliation: real-time (per-write assertion), daily (vs. settlement files), monthly (full audit)
- Stripe processes 5 billion ledger events/day; 99.99% of dollar volume verified within 4 days

---

### Minutes 38-43: Security + Reliability

**PCI-DSS Architecture (30-second version):**
- Tokenization vault in isolated Cardholder Data Environment (CDE)
- HSM for key management; no single person can access master key
- Client SDK iframe ensures merchant never sees raw card data
- CDE has its own network segment, firewalls, mTLS, audit logging

**Reliability:**
- Payment path: 99.999% target (isolated compute, DB, Redis)
- Circuit breakers per card network and acquirer
- Canary deployments with automatic rollback on payment metric degradation
- In-flight payment recovery on region failure: query acquirer for status

---

### Minutes 43-45: Trade-offs + Discussion

Summarize 2-3 key trade-offs:
1. "At-least-once webhook delivery puts idempotency burden on merchants---but exactly-once is impossible over HTTP"
2. "Single-primary for payment writes (no multi-region write) sacrifices write latency for consistency---financial data cannot tolerate reconciliation conflicts"
3. "24-hour idempotency key TTL balances safety against storage cost; longer TTL would prevent very-late duplicates but costs more memory"

---

## What Makes Payment Gateway Uniquely Hard

| Challenge | Why It Is Unique | How It Shapes Architecture |
|-----------|-----------------|--------------------------|
| **Exactly-once semantics** | Double charge = real money lost; unlike most systems where at-least-once is OK | Idempotency keys, state machine, network status queries, reconciliation |
| **External card network** | Authorization outcome controlled by external party (issuing bank) | Timeout handling, status queries, reversal logic, settlement reconciliation |
| **Financial integrity** | Every cent must balance; no "eventually consistent" for money | Double-entry ledger, write-time assertions, multi-tier reconciliation |
| **PCI-DSS compliance** | Handling card data has architectural consequences, not just policy | Tokenization vault, CDE isolation, HSM, network segmentation |
| **Webhook reliability** | Merchants depend on webhooks for business operations | At-least-once delivery, exponential retry, per-endpoint isolation, DLQ |
| **Dispute handling** | External process with legal deadlines and financial consequences | Event-driven from card networks, evidence management, ledger adjustments |

---

## Key Trade-Offs Table

| Decision | Option A | Option B | Recommendation | Rationale |
|----------|----------|----------|----------------|-----------|
| **Idempotency storage** | Redis (in-memory) | Database only | Redis primary + DB fallback | Redis: sub-ms lookup on every request; DB: safety net if Redis fails |
| **Idempotency key TTL** | Short (1h) | Long (72h) | 24 hours | 1h risks late-retry duplicates; 72h wastes 3x memory; 24h is standard |
| **Webhook delivery** | At-least-once | At-most-once | At-least-once | Missing a webhook is worse than duplicate delivery; merchants can dedupe |
| **Ledger writes** | Sync (in payment path) | Async (via event) | Sync for critical entries | Financial integrity requires ledger entry before confirming payment |
| **Multi-region writes** | Multi-primary | Single primary | Single primary | Financial data must not have write conflicts; cross-region latency is OK |
| **Card tokenization** | Client-side (SDK) | Server-side (API) | Client-side | Reduces merchant PCI scope from SAQ-D to SAQ-A; major compliance benefit |
| **Fraud scoring** | Inline (blocking) | Async (non-blocking) | Inline with timeout fallback | Must block fraudulent payments before authorization; fallback to rules on timeout |
| **Capture method default** | Automatic | Manual | Automatic (configurable) | Most merchants want immediate capture; marketplaces need manual for ship-then-charge |
| **Settlement cycle** | T+0 (instant) | T+2 (standard) | T+2 with instant option | T+2 provides fraud review window; instant payout as premium feature |
| **3DS implementation** | Always required | Risk-based (optional) | Risk-based | Mandatory 3DS kills conversion (15% drop-off); risk-based balances fraud vs. UX |

---

## Trap Questions & Strong Answers

### "How do you prevent double charges?"

**Weak answer:** "We use database transactions to ensure atomicity."

**Strong answer:** "We prevent double charges with a three-layer defense. Layer 1: Client-provided idempotency keys checked in Redis before any business logic---same key returns the cached response. Layer 2: Database uniqueness constraint on (merchant_id, idempotency_key) as a safety net if Redis is unavailable. Layer 3: On card network timeouts, we never blindly retry. We query the acquirer for the transaction status using the network_transaction_id we persisted before sending. If the authorization went through, we transition to succeeded. If it did not, we retry. The dangerous case is when the acquirer also does not know---then we mark as pending and let the daily settlement reconciliation resolve it."

### "What happens if a webhook fails?"

**Weak answer:** "We retry it a few times."

**Strong answer:** "Webhook delivery uses at-least-once semantics with a structured retry strategy. On first failure, we schedule a retry at ~1 minute with exponential backoff increasing to 3 days across up to 9 attempts. Each merchant endpoint has its own logical delivery queue so a slow endpoint does not block delivery to other merchants. After 3 days of continuous failure, we disable the endpoint and email the merchant. Failed events go to a dead letter queue that merchants can replay via the API or dashboard. We also sign every webhook with HMAC-SHA256 using the merchant's secret so they can verify authenticity and check the timestamp to prevent replay attacks."

### "How do you handle partial captures?"

**Weak answer:** "We just capture a smaller amount."

**Strong answer:** "When capture_method is set to manual, the authorization creates a hold on the customer's card for the full amount. The merchant can then capture any amount up to the authorized amount within the hold window (7 days default, up to 30 with extended auth). This is critical for marketplaces where the final amount depends on what ships. If a $100 order has $30 of items out of stock, the merchant captures $70. The remaining $30 of the authorization hold is automatically released by the card network when the hold expires or when we send an explicit partial reversal. The ledger records the partial capture amount and creates a reversal entry for the uncaptured portion."

### "How does your ledger handle currency conversion?"

**Weak answer:** "We convert at the current exchange rate."

**Strong answer:** "We lock the FX rate at authorization time---this is the rate shown to the customer and the rate used for settlement. The ledger records the transaction in both the presentment currency (what the customer pays) and the settlement currency (what the merchant receives). For a EUR customer paying a USD merchant: the journal records the full amount in EUR (presentment) and the converted amount in USD (settlement) with the locked FX rate. This means the merchant sees a predictable USD amount regardless of rate fluctuation between authorization and settlement. The FX spread is a separate ledger entry representing the platform's currency conversion revenue."

### "What if the ledger gets out of balance?"

**Weak answer:** "We have monitoring to catch errors."

**Strong answer:** "Ledger balance is enforced at every layer. At write time, we assert SUM(debits) = SUM(credits) within every journal entry before committing the transaction---if the assertion fails, the write is rejected entirely, no partial entries. Every 5 minutes, a reconciliation job sums all debits and credits per account and compares against cached balances. Daily, we compare our ledger against card network settlement files and acquirer statements. If any imbalance is detected---even $0.01---it triggers a P0 alert, halts payouts to affected merchants, and requires manual investigation. The ledger is append-only and immutable, so we never correct an error by modifying an entry. Instead, we create an adjustment journal entry that brings the balance back in line, with full audit trail of the correction."

### "How do you handle a scenario where the customer's bank approves but your system crashes before recording it?"

**Weak answer:** "We use distributed transactions."

**Strong answer:** "This is one of the most dangerous failure modes. We mitigate it by persisting the PaymentIntent with status 'processing' and the network_transaction_id BEFORE sending the authorization to the acquirer. If the system crashes after the bank approves but before we record the approval, the recovery process finds all 'processing' payments older than 2 minutes, queries the acquirer for each one using the network_transaction_id, and completes the state transition. The customer sees 'payment pending' until recovery completes, typically within minutes. Additionally, the daily settlement file from the card network will include this approved transaction, so even if the query-based recovery misses it, end-of-day reconciliation catches it."

---

## Follow-Up Deep Dives

If the interviewer wants to go deeper, be prepared for:

| Topic | Key Points |
|-------|-----------|
| **Subscription billing** | Recurring charge scheduling; dunning (smart retry on failure at optimal times); proration for plan changes; grace periods |
| **Multi-party payments (Connect)** | Platform charges customer → splits to multiple merchants; destination charges vs. direct charges; platform fee deduction |
| **Network tokenization** | Visa/MC issue network tokens that replace PANs; higher auth rates; automatic card-on-file updates when card reissued |
| **Interchange optimization** | Providing Level 2/3 data (tax, line items) reduces interchange fees; BIN routing to cheaper networks (debit routing) |
| **Instant payouts** | Real-time funds delivery via push-to-card (Visa Direct, MC Send) or real-time payment rails; risk vs. speed trade-off |
| **PSD2 / SCA deep dive** | Strong Customer Authentication requirements in Europe; exemptions (low-value, recurring, TRA); merchant-initiated transactions |

---

## Red Flags to Avoid

| Red Flag | Why It Is Wrong | Correct Approach |
|----------|----------------|------------------|
| "We store card numbers in our database" | PCI-DSS violation; massive liability | Tokenization vault in isolated CDE; merchant never sees PAN |
| "We use database locks for idempotency" | Too slow for payment-path latency requirements | Redis for fast check; DB as safety net |
| "We retry to the card network on timeout" | Risk of double authorization hold | Query acquirer for status first; never blind retry |
| "We can correct ledger entries by updating them" | Violates immutability requirement for financial audit | Append correction entries; never modify or delete |
| "We deliver webhooks exactly once" | Impossible over HTTP | At-least-once with signed payloads; merchants must be idempotent |
| "We process all webhooks through a single queue" | Slow endpoint blocks all merchants | Per-endpoint delivery queues |
| "We handle 3DS for every transaction" | Destroys conversion rate (15% drop-off on challenge) | Risk-based 3DS; only challenge when fraud risk is elevated |
