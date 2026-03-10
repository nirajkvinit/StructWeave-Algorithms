# Deep Dives & Bottlenecks — AI-Native PIX Commerce Platform

## Deep Dive 1: DICT Key Lookup at Scale

### The Problem

Every PIX transaction requires resolving a PIX key (CPF, CNPJ, phone, email, or EVP) to the recipient's account details via the DICT (Diretório de Identificadores de Contas Transacionais). With ~800 million registered keys across the Brazilian financial system and our platform processing 5+ million daily transactions, DICT lookup performance directly determines end-to-end transaction latency.

### Architecture

The DICT is operated by BCB as a centralized directory accessible via the RSFN (secure financial network). Two access patterns exist:

1. **Direct DICT Query**: PSP sends a lookup request to DICT via RSFN; DICT returns account details. Latency: 20-50ms per query. Rate-limited per PSP.
2. **Local Cache with Incremental Sync**: PSP maintains a full or partial replica of DICT, synchronized via BCB's incremental sync protocol. Lookup latency: 1-5ms (local memory access).

### Local Cache Design

```
Architecture:
    ┌─────────────────────────────────────────────┐
    │            DICT Cache Cluster                │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
    │  │ Shard 0  │  │ Shard 1  │  │ Shard 2  │  │
    │  │ Keys A-H │  │ Keys I-P │  │ Keys Q-Z │  │
    │  │  ~17 GB  │  │  ~17 GB  │  │  ~16 GB  │  │
    │  └──────────┘  └──────────┘  └──────────┘  │
    └──────────────────────┬──────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
    ┌─────────▼──┐  ┌──────▼─────┐  ┌──▼──────────┐
    │ Sync Worker│  │ Sync Worker│  │ Sync Worker │
    │ (Primary)  │  │ (Secondary)│  │ (Tertiary)  │
    └─────────┬──┘  └──────┬─────┘  └──┬──────────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼──────┐
                    │  BCB DICT   │
                    │  (via RSFN) │
                    └─────────────┘
```

**Cache data structure:** Each key entry is ~65 bytes (key hash: 32 bytes, ISPB: 8 bytes, branch: 4 bytes, account: 10 bytes, account type: 1 byte, flags: 2 bytes, timestamp: 8 bytes). 800 million keys × 65 bytes ≈ 50 GB. Sharded across nodes using consistent hashing on the key hash.

**Sync protocol:** BCB's DICT provides an incremental sync feed with sequence numbers. The sync worker polls for changes (new registrations, portability completions, deletions) every few seconds. Each change includes the sequence number, operation type, and full key-account mapping. The worker applies changes in sequence order, using the sequence number for gap detection: if a sequence gap is detected, the worker requests a full sync for the affected key range.

### Bottleneck: Cache Consistency During Key Portability

When a user ports their PIX key from one PSP to another, the DICT is updated atomically, but cache replicas lag behind. During the portability window (up to 7 business days for contested claims), a stale cache could route a payment to the old PSP.

**Mitigation:**
- For high-value transactions (>R$1,000), always validate against live DICT before settlement, even if cache has a match
- Cache entries include a `portability_pending` flag set during the claim window
- If the flag is set, the lookup falls back to a direct DICT query
- Sync worker prioritizes portability events over regular updates (processed within 1 second of receipt)

### Bottleneck: Cache Cold Start

A full DICT sync for 800M keys takes 6-8 hours over RSFN. During cold start (new node, post-disaster recovery), the cache is incomplete.

**Mitigation:**
- Warm standby replicas with continuous sync; promotion takes seconds, not hours
- During cold start, route all lookups to direct DICT with a local negative cache (keys known to not exist in DICT)
- Progressive cache population: serve from direct DICT initially, populate cache entries from query results

---

## Deep Dive 2: PIX Automático Mandate Management

### The Problem

PIX Automático introduces mandate-based recurring billing to PIX, requiring coordination between the merchant's PSP (us), the customer's PSP, and BCB's infrastructure. The billing submission window (2-10 days before the billing date) creates a scheduling challenge at scale: for a platform with 500K active mandates, the billing scheduler must process thousands of mandates daily with zero missed billing windows.

### Mandate Authorization Flow

The mandate authorization is a three-party flow:
1. Merchant creates a mandate request via our API
2. We forward the authorization request to the customer's PSP (identified by their PIX key's ISPB)
3. Customer authorizes in their PSP's app (or declines)
4. Customer's PSP notifies us of the authorization result
5. We store the active mandate and begin scheduling

The customer can cancel at any time, up to 23:59 on the day before the next billing date. Cancellation is initiated through their PSP's app, and we receive a notification.

### Billing Scheduler Design

```
FUNCTION billing_scheduler_loop():
    // Runs every hour, processes mandates due for submission

    today = current_date()
    submission_window_end = today + MAX_ADVANCE_DAYS  // 10 days ahead

    mandates_due = query(
        status = ACTIVE,
        next_billing_date <= submission_window_end,
        next_billing_date >= today + MIN_ADVANCE_DAYS,  // At least 2 days ahead
        submission_status != SUBMITTED  // Not already submitted
    )

    FOR mandate IN mandates_due:
        // Check for last-minute cancellation
        IF mandate.cancelled_before_cutoff():
            SKIP

        // Submit billing request
        charge_request = build_charge_request(mandate)
        result = submit_to_spi(charge_request)

        IF result.success:
            mandate.last_charge_status = PENDING
            mandate.submission_date = today
        ELSE:
            mandate.consecutive_failures += 1
            schedule_retry(mandate, delay=next_retry_interval(mandate.consecutive_failures))

    // AI churn prediction (async, runs on successfully billed mandates)
    ASYNC predict_churn(mandates_billed_today)
```

### Bottleneck: Billing Window Compliance

BCB mandates that billing requests must be submitted 2-10 days before the billing date. If the scheduler misses this window, the charge cannot be processed for that billing cycle, resulting in revenue loss for the merchant.

**Mitigation:**
- Multi-timezone aware scheduling (Brazil spans 4 time zones)
- Redundant scheduler instances with leader election; if the primary fails, secondary takes over within 60 seconds
- Billing submission deadline alerting: if mandates remain unsubmitted within 48 hours of the window closing, escalate to on-call
- Pre-computation: at midnight, generate the day's billing manifest and validate all mandates have current customer PSP connectivity

### Bottleneck: Customer PSP Availability

The customer's PSP must process the debit request. If their PSP is unavailable (maintenance, outage), the charge fails.

**Mitigation:**
- Retry with exponential backoff: 1h, 4h, 12h, 24h intervals
- If the customer's PSP fails repeatedly, alert the merchant so they can pursue alternative collection
- Monitor PSP health dashboards (BCB publishes PSP uptime metrics) and proactively reschedule charges away from known maintenance windows

### AI Churn Prediction Model

The churn model predicts which mandates are likely to be cancelled, enabling merchants to take proactive retention actions:

**Features:**
- Mandate age (days since activation)
- Charge history (consecutive successes, any failures)
- Billing amount relative to customer's average PIX transaction size
- Customer's overall PIX activity level (active vs. dormant)
- Time since last customer-initiated PIX to this merchant
- Season/month patterns (churn spikes after holiday spending)

**Output:** Probability of cancellation within next 30 days. High-risk mandates (>0.7) flagged to merchant via webhook.

---

## Deep Dive 3: Fraud Detection for Irrevocable Transfers

### The Problem

PIX's irrevocability means fraud must be detected before settlement—there is no chargeback mechanism. The primary fraud vectors in PIX are fundamentally different from card fraud:

1. **Social engineering (golpe do PIX):** The account holder is tricked into making a legitimate PIX transfer (romance scam, fake support call, impersonation). The transaction is technically authorized—device is the holder's, biometric passes, password is correct.
2. **Account takeover:** Fraudster gains access to the victim's banking app and initiates PIX transfers.
3. **QR code hijacking:** Fraudster replaces a merchant's legitimate QR code with their own (physical overlay or digital man-in-the-middle).
4. **Mule account networks:** Funds from fraud flow through chains of intermediary accounts to obfuscate the trail before the MED can freeze them.

### Detection Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Fraud Detection Pipeline               │
│                                                           │
│  ┌──────────┐   ┌───────────┐   ┌──────────────────┐    │
│  │ Feature   │──▶│  Model    │──▶│  Decision         │    │
│  │ Store     │   │  Ensemble │   │  Engine            │    │
│  │ (<20ms)   │   │  (<100ms) │   │  (<10ms)           │    │
│  └──────────┘   └───────────┘   └──────────────────┘    │
│       │              │                    │               │
│       ▼              ▼                    ▼               │
│  ┌──────────┐   ┌───────────┐   ┌──────────────────┐    │
│  │ Real-time │   │  Model    │   │  Rule Engine       │    │
│  │ Features  │   │  Registry │   │  (fallback for     │    │
│  │           │   │           │   │   model timeouts)   │    │
│  └──────────┘   └───────────┘   └──────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Social Engineering Detection

Social engineering is PIX's most challenging fraud vector because the account holder themselves initiates the transaction. Detection relies on behavioral deviation:

```
FUNCTION detect_social_engineering(txn_context):
    // Signal 1: Phone call during transaction
    // If the device is in a phone call while initiating a high-value PIX,
    // this is a strong indicator of coached fraud
    call_active = txn_context.device.phone_state == IN_CALL
    IF call_active AND txn_context.amount > R$500:
        risk_boost += 0.3

    // Signal 2: Unusual transaction pattern
    // First-time transfer to this payee + high amount + urgency
    first_time_payee = NOT exists_in_history(txn_context.payer, txn_context.payee)
    IF first_time_payee AND txn_context.amount > payer_avg_amount * 5:
        risk_boost += 0.25

    // Signal 3: Transaction timing anomaly
    // Transaction outside the payer's usual active hours
    hour = txn_context.initiation_time.hour
    IF hour NOT IN payer_typical_hours(txn_context.payer):
        risk_boost += 0.15

    // Signal 4: Payee key characteristics
    // Recently created EVP key (random key) receiving from many unique payers
    payee_dict = lookup_dict_metadata(txn_context.payee_key)
    IF payee_dict.key_age < 30_DAYS AND payee_dict.key_type == EVP:
        risk_boost += 0.20

    RETURN risk_boost
```

### Bottleneck: False Positive Rate at Scale

At 5 million daily transactions, even a 0.1% false positive rate means 5,000 legitimate transactions blocked daily. Each false positive is a frustrated merchant and customer—and potentially a lost sale.

**Mitigation:**
- Three-tier decision model: APPROVE (<0.55 score), STEP_UP (0.55-0.85, request additional authentication), DECLINE (>0.85)
- Step-up authentication (confirm via push notification to known device) catches uncertain cases without blocking
- Continuous model calibration: daily precision/recall monitoring per merchant segment; model weights adjusted to maintain <0.05% false positive rate
- Merchant-specific thresholds: luxury goods merchants tolerate higher decline rates; convenience stores need near-zero false positives
- Model explanability: every decline includes the top 3 contributing features, enabling merchant support teams to investigate and whitelist patterns

### Bottleneck: Latency Budget

The entire fraud scoring pipeline must complete within 200ms. Model inference alone can take 50-100ms for complex ensemble models.

**Mitigation:**
- Feature pre-computation: velocity features (transaction count/amount in 1h/24h/7d windows) maintained in real-time counters, not computed at query time
- Model distillation: complex offline model distilled into a smaller, faster online model; full model runs async for training data generation
- Cascading evaluation: fast rule engine (2ms) filters obvious approvals (returning customer, small amount, known payee) before invoking ML pipeline
- Hardware acceleration: ML inference on dedicated compute with optimized batch processing for concurrent requests
- Timeout fallback: if ML pipeline exceeds 150ms, fall back to rule-based scoring with a pre-calibrated, slightly more conservative threshold

---

## Deep Dive 4: Nota Fiscal Integration with SEFAZ

### The Problem

Every PIX commerce transaction in Brazil legally requires a Nota Fiscal Eletrônica—an electronic tax document authorized by the state tax authority (SEFAZ). The platform must generate, sign, submit, and store these documents for every transaction, integrating with 27 state SEFAZ instances (each with different availability characteristics) while computing taxes across Brazil's multi-layered tax system.

### Tax Computation Complexity

A single transaction may involve:

| Tax | Jurisdiction | Rate Range | Applies To |
|---|---|---|---|
| **ICMS** | State | 7-25% | Goods (varies by origin/destination state and product NCM code) |
| **ICMS-ST** | State | Varies | Goods subject to tax substitution (manufacturer pre-pays) |
| **IPI** | Federal | 0-330% | Manufactured goods (varies by product TIPI code) |
| **PIS** | Federal | 0.65% or 1.65% | Cumulative or non-cumulative regime |
| **COFINS** | Federal | 3% or 7.6% | Cumulative or non-cumulative regime |
| **ISS** | Municipal | 2-5% | Services (varies by municipality and service LC 116 code) |

For inter-state sales, the ICMS differential (DIFAL) must be split between origin and destination states. The merchant's tax regime (Simples Nacional for small businesses, Lucro Presumido, Lucro Real) changes how taxes are computed.

### Nota Fiscal Generation Pipeline

```
FUNCTION generate_nota_fiscal(transaction):
    // Step 1: Determine document type
    doc_type = classify_transaction(transaction)
    // NFE for goods, NFSE for services, NFCE for consumer retail

    // Step 2: Compute taxes
    merchant = lookup_merchant(transaction.merchant_account_id)
    tax_result = compute_taxes(
        items: transaction.items,
        merchant_state: merchant.state_code,
        merchant_regime: merchant.tax_regime,
        buyer_state: resolve_buyer_state(transaction.payer_key),
        buyer_type: transaction.payer_doc_type  // CPF=consumer, CNPJ=business
    )

    // Step 3: Generate XML (NF-e schema v4.0)
    xml = build_nfe_xml(
        emitter: merchant.fiscal_data,
        recipient: transaction.payer_data,
        items: transaction.items_with_tax(tax_result),
        payment: {method: "PIX", end_to_end_id: transaction.end_to_end_id},
        totals: tax_result.totals
    )

    // Step 4: Apply digital signature (ICP-Brasil A1 certificate)
    signed_xml = sign_xml(xml, merchant.digital_certificate)

    // Step 5: Submit to SEFAZ
    sefaz_endpoint = get_sefaz_endpoint(merchant.state_code, doc_type)
    response = submit_to_sefaz(sefaz_endpoint, signed_xml)

    IF response.status == AUTHORIZED:
        store_authorized_nf(signed_xml, response.protocol, response.access_key)
        notify_merchant(transaction.merchant_account_id, "NF authorized", response.access_key)
    ELSE IF response.status == REJECTED:
        error = parse_rejection(response)
        IF error.is_auto_correctable:
            corrected_xml = auto_correct(signed_xml, error)
            RETRY generate_nota_fiscal with corrected_xml
        ELSE:
            flag_for_manual_review(transaction, error)
    ELSE IF response.timeout:
        enter_contingency_mode(signed_xml, merchant.state_code)
```

### Bottleneck: SEFAZ Availability and Latency

Each of Brazil's 27 states operates its own SEFAZ instance (some share infrastructure via SEFAZ Virtual). Availability and latency vary significantly:

| SEFAZ Tier | States | Typical Latency | Availability |
|---|---|---|---|
| **Tier 1** (own infrastructure) | SP, RJ, MG, RS, PR, BA | 1-3s | 99.5%+ |
| **Tier 2** (SEFAZ Virtual) | Most others | 2-5s | 98-99% |
| **Tier 3** (known issues) | Smaller states | 3-10s | 95-98% |

**Mitigation:**
- **Contingency mode (DPEC):** When SEFAZ is unavailable, issue NF-e in contingency mode using the DPEC (Declaração Prévia de Emissão em Contingência) system. The NF-e is valid immediately; retroactive SEFAZ authorization happens when service resumes.
- **Per-state circuit breakers:** If a state's SEFAZ fails 3 consecutive requests, switch to contingency mode for that state; periodically test restoration.
- **Async pipeline:** Nota Fiscal generation is decoupled from payment confirmation. SEFAZ latency does not affect the merchant's payment notification.
- **Batch optimization:** During off-peak hours, submit correction and cancellation requests in batches to reduce API call overhead.

### Bottleneck: Tax Rule Currency

Brazil's tax rules change frequently—ICMS rates are modified by individual states, PIS/COFINS rules change with federal legislation, and ISS rates are set by 5,570 municipalities. The tax computation engine must remain current.

**Mitigation:**
- Tax rules stored in a versioned database with effective-date ranges
- Subscription to official legislative feeds (Diário Oficial) for automated rule change detection
- AI-powered change detection: monitor legislative publications for tax rule modifications, flag potential impacts, and generate draft rule updates for human review
- Pre-computation of common tax scenarios: cache ICMS rate tables for the most common origin-destination state pairs and NCM codes
- Rollback capability: if a rule change is applied incorrectly, revert to previous version and reprocess affected transactions

---

## Deep Dive 5: Split Payment Settlement Orchestration

### The Problem

Marketplaces using PIX need to split a single payment across multiple recipients: the seller, the platform (commission), the logistics provider, and potentially other parties. The split must be atomic (all-or-nothing), accurate to the centavo (no rounding losses), and comply with tax withholding requirements.

### Split Settlement Architecture

PIX's SPI supports split payments natively: when initiating a payment, the receiving PSP can specify multiple settlement destinations. However, the split configuration, validation, and tracking are the PSP's responsibility.

```
Payment: R$100.00 for a marketplace order
    ├── Seller A:        R$82.00 (82%)
    ├── Platform Fee:    R$10.00 (10%)
    ├── Logistics:       R$7.50  (7.5%)
    └── Payment Provider: R$0.50  (0.5%)
    Total:               R$100.00 ✓
```

### Challenges

**1. Atomic settlement across PSPs:** If the seller's PSP and the logistics provider's PSP are different institutions, the split must be routed through the SPI to different settlement accounts. If one leg fails, the entire payment must be handled—but PIX settlement is irrevocable.

**Solution:** Two-phase split: the full amount settles to the marketplace PSP's settlement account first (single SPI transaction). The PSP then distributes internally to sub-accounts (for participants at the same PSP) or initiates secondary PIX transfers (for external participants). The secondary transfers are separate PIX transactions, not part of the original atomic settlement.

**2. Tax withholding on splits:** When a marketplace pays a seller, income tax (IR) withholding may apply depending on the seller's entity type, the service category, and whether the payment exceeds the R$10 threshold for DARF (federal tax collection). The platform must compute, withhold, and remit these taxes.

**3. Refund handling for split payments:** If a customer requests a refund (merchant-initiated PIX return), the split must be reversed: the marketplace collects back from each participant, then returns the full amount to the customer. If a participant has already withdrawn their share, the marketplace must cover the difference.

**Solution:**
- Maintain a settlement ledger per participant with "available" and "locked" balances
- Lock funds for a configurable hold period (7-30 days) before making available for withdrawal
- On refund, debit from locked balance first; if insufficient, debit from available balance; if insufficient, create a receivable against the participant

### Bottleneck: Rounding and Centavo Precision

When splitting percentages, rounding errors can cause the splits to not sum exactly to the total. For example, R$100.00 split 33.33%/33.33%/33.34%:
- 33.33% of R$10000 centavos = 3333 centavos
- 33.33% of R$10000 centavos = 3333 centavos
- 33.34% of R$10000 centavos = 3334 centavos
- Total: 10000 centavos ✓ (works in this case, but not always)

**Solution:** Always compute N-1 participants by rounding down, assign the remainder to the last participant. This guarantees exact sum without rounding loss. The "last participant" is deterministic (sorted by participant ID) for auditability.

### Bottleneck: High-Frequency Split Recalculation

For marketplaces with dynamic commission rates (volume-based tiering, promotional periods, category-specific rates), the split rule may change between QR generation and payment receipt.

**Solution:** Split rules are snapshot at QR generation time and embedded in the charge metadata. The split applied at settlement always uses the snapshot version, not the current rule. This ensures the payer sees the correct breakdown at payment time and prevents retroactive split changes.
