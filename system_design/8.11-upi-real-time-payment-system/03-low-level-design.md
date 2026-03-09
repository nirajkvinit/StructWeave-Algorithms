# Low-Level Design

## Data Models

### VPA (Virtual Payment Address)

```
VPA {
    vpa_handle          STRING      PRIMARY KEY  -- e.g., "user@bankpsp"
    user_id             UUID        NOT NULL
    psp_id              STRING      NOT NULL     -- PSP that owns the @handle
    linked_accounts     JSON[]      -- [{ifsc, account_token, is_primary, bank_name}]
    default_account_idx INT         DEFAULT 0
    status              ENUM        (active, inactive, blocked, deleted)
    device_fingerprint  STRING      -- bound device ID for security
    created_at          TIMESTAMP
    updated_at          TIMESTAMP
}
INDEX: (psp_id, status), (user_id)
```

### Transaction

```
Transaction {
    txn_id              UUID        PRIMARY KEY
    rrn                 STRING      UNIQUE       -- Retrieval Reference Number (idempotency key)
    upi_request_id      STRING      UNIQUE       -- originating request correlation ID
    payer_vpa           STRING      NOT NULL
    payee_vpa           STRING      NOT NULL
    amount              DECIMAL     NOT NULL
    currency            STRING      DEFAULT 'INR'
    type                ENUM        (pay, collect, mandate_execute, upi_lite, reversal)
    status              ENUM        (initiated, payee_validated, debit_pending,
                                     debit_success, credit_pending, credit_success,
                                     completed, failed, reversed, expired)
    failure_reason      STRING
    initiated_at        TIMESTAMP   NOT NULL
    completed_at        TIMESTAMP
    remitter_bank_ifsc  STRING      NOT NULL
    beneficiary_bank_ifsc STRING    NOT NULL
    payer_psp_id        STRING      NOT NULL
    payee_psp_id        STRING      NOT NULL
    mcc                 STRING      -- Merchant Category Code (P2M)
    remarks             STRING
    reversal_txn_id     UUID        -- FK → Transaction (if reversed)
}
INDEX: (payer_vpa, initiated_at DESC), (payee_vpa, initiated_at DESC)
INDEX: (rrn), (status, initiated_at)
PARTITION: RANGE on initiated_at (monthly) + HASH on payer_vpa (16 shards)
RETENTION: 10 years (RBI mandate)
```

### Mandate

```
Mandate {
    mandate_id          UUID        PRIMARY KEY
    umn                 STRING      UNIQUE       -- Unique Mandate Number
    payer_vpa           STRING      NOT NULL
    payee_vpa           STRING      NOT NULL
    amount_limit        DECIMAL     NOT NULL     -- max debit per execution
    frequency           ENUM        (one_time, daily, weekly, fortnightly, monthly,
                                     bimonthly, quarterly, half_yearly, yearly, as_presented)
    start_date          DATE        NOT NULL
    end_date            DATE        NOT NULL
    status              ENUM        (created, approved, active, paused, revoked, expired, rejected)
    auto_execute        BOOLEAN     DEFAULT false
    next_execution_date DATE
    execution_count     INT         DEFAULT 0
    created_at          TIMESTAMP
    approved_at         TIMESTAMP
}
INDEX: (payer_vpa, status), (payee_vpa, status)
INDEX: (next_execution_date, status, auto_execute)
```

### UPI Lite Wallet

```
UPI_Lite_Wallet {
    wallet_id           UUID        PRIMARY KEY
    vpa                 STRING      UNIQUE FK → VPA
    balance             DECIMAL     DEFAULT 0
    max_balance         DECIMAL     DEFAULT 2000  -- regulatory cap (INR)
    max_txn_amount      DECIMAL     DEFAULT 500
    linked_bank_ifsc    STRING      NOT NULL
    linked_account_token STRING     NOT NULL
    status              ENUM        (active, suspended, closed)
    last_sync_at        TIMESTAMP   -- last reconciliation with bank
    created_at          TIMESTAMP
}
INDEX: (vpa), (status, last_sync_at)
```

### Settlement Batch

```
Settlement_Batch {
    batch_id            UUID        PRIMARY KEY
    settlement_date     DATE        NOT NULL
    settlement_window   INT         NOT NULL     -- window number (1-8 per day)
    participant_id      STRING      NOT NULL     -- bank or PSP identifier
    participant_type    ENUM        (remitter_bank, beneficiary_bank, psp)
    gross_debit         DECIMAL     NOT NULL
    gross_credit        DECIMAL     NOT NULL
    net_amount          DECIMAL     NOT NULL     -- positive = receivable, negative = payable
    txn_count           INT         NOT NULL
    status              ENUM        (pending, calculated, submitted, settled, failed, reconciled)
    settled_at          TIMESTAMP
    created_at          TIMESTAMP
}
INDEX: (settlement_date, settlement_window, participant_id)
INDEX: (participant_id, settlement_date DESC), (status, settlement_date)
```

### Dispute

```
Dispute {
    dispute_id          UUID        PRIMARY KEY
    txn_id              UUID        FK → Transaction
    rrn                 STRING      NOT NULL
    type                ENUM        (transaction_not_found, amount_mismatch, duplicate_transaction,
                                     account_debited_not_credited, beneficiary_not_credited,
                                     fraud, unauthorized)
    status              ENUM        (raised, under_review, escalated, resolved_in_favour,
                                     resolved_against, auto_resolved, closed)
    raised_by           ENUM        (payer, payee)
    raised_by_vpa       STRING      NOT NULL
    resolution          STRING
    resolution_amount   DECIMAL
    raised_at           TIMESTAMP
    sla_deadline        TIMESTAMP   -- regulatory SLA (T+5 working days)
    resolved_at         TIMESTAMP
}
INDEX: (txn_id), (raised_by_vpa, raised_at DESC), (status, sla_deadline)
```

---

## Entity Relationship Diagram

```mermaid
%%{init: {'theme': 'neutral'}}%%
erDiagram
    VPA ||--o{ Transaction : "payer or payee"
    VPA ||--o{ Mandate : "payer or payee"
    VPA ||--o| UPI_Lite_Wallet : "owns"
    Transaction ||--o| Dispute : "may have"
    Transaction }o--|| Settlement_Batch : "aggregated into"
    Mandate ||--o{ Transaction : "executes"

    VPA {
        string vpa_handle PK
        uuid user_id
        string psp_id
        json linked_accounts
        string status
    }
    Transaction {
        uuid txn_id PK
        string rrn UK
        string payer_vpa FK
        string payee_vpa FK
        decimal amount
        string type
        string status
    }
    Mandate {
        uuid mandate_id PK
        string umn UK
        string payer_vpa FK
        string payee_vpa FK
        decimal amount_limit
        string frequency
        boolean auto_execute
    }
    UPI_Lite_Wallet {
        uuid wallet_id PK
        string vpa FK
        decimal balance
        decimal max_balance
    }
    Settlement_Batch {
        uuid batch_id PK
        date settlement_date
        string participant_id
        decimal net_amount
    }
    Dispute {
        uuid dispute_id PK
        uuid txn_id FK
        string type
        string status
        string raised_by
    }
```

---

## Indexing and Partitioning Strategy

| Table | Partitioning | Rationale |
|-------|-------------|-----------|
| Transaction | RANGE on `initiated_at` (monthly) + HASH on `payer_vpa` (16 shards) | Time-range queries for history + even write distribution |
| Settlement_Batch | RANGE on `settlement_date` (daily) | Each settlement window queries a single day |
| Dispute | RANGE on `raised_at` (monthly) | SLA monitoring queries recent disputes |
| VPA | HASH on `vpa_handle` | Uniform distribution for resolution lookups |
| Mandate | RANGE on `next_execution_date` | Scheduler scans upcoming mandates efficiently |

**Data Retention**: Financial transactions retained 10 years (RBI mandate). Data older than 2 years moved to cold storage with compressed columnar format. Active query layer covers the most recent 6 months in hot storage.

---

## API Design

All APIs use JSON payloads. Every mutating request requires an idempotency key (RRN) and PSP-level authentication via mutual TLS + digital signature.

### POST /v1/pay -- Initiate pay (push) transaction

```
Request:  { payer_vpa, payee_vpa, amount, currency, remarks, mcc, rrn, encrypted_credential, device_fingerprint }
Response: { txn_id, rrn, status: "initiated", payer_vpa, payee_vpa, amount }  -- 202 Accepted
```

### POST /v1/collect -- Send collect (pull) request

```
Request:  { payee_vpa, payer_vpa, amount, currency, remarks, ref_url, rrn, expiry_minutes }
Response: { txn_id, rrn, status: "collect_pending", expiry_at }  -- 202 Accepted
```

### POST /v1/mandate/create -- Create recurring mandate

```
Request:  { payer_vpa, payee_vpa, amount_limit, frequency, start_date, end_date, auto_execute, remarks, rrn }
Response: { mandate_id, umn, status: "created", awaiting: "payer_approval" }  -- 202 Accepted
```

### POST /v1/mandate/execute -- Execute mandate payment

```
Request:  { mandate_id, umn, amount, rrn, execution_date }
Response: { txn_id, mandate_id, status: "initiated" }  -- 202 Accepted
```

### GET /v1/txn/{txn_id} -- Get transaction status

```
Response: { txn_id, rrn, status, payer_vpa, payee_vpa, amount, type, initiated_at, completed_at }  -- 200 OK
```

### POST /v1/vpa/resolve -- Resolve VPA to bank details

```
Request:  { vpa }
Response: { vpa, psp_id, name: "Bob S****", is_verified, is_merchant }  -- 200 OK
```

### POST /v1/upi-lite/topup -- Top up UPI Lite wallet

```
Request:  { vpa, amount, encrypted_credential, rrn }
Response: { wallet_id, previous_balance, topup_amount, new_balance, max_balance }  -- 200 OK
```

### POST /v1/dispute/raise -- Raise dispute

```
Request:  { txn_id, rrn, type, raised_by, description }
Response: { dispute_id, txn_id, status: "raised", sla_deadline }  -- 201 Created
```

### Rate Limiting

| Level | Limit | Window |
|-------|-------|--------|
| Per PSP | 10,000 TPS | Rolling 1 second |
| Per VPA (pay) | 20 transactions | Per hour |
| Per VPA (collect) | 10 requests | Per hour |
| Per device | 50 transactions | Per day |

---

## Core Algorithms

### 1. VPA Resolution Algorithm

Maps a VPA (user@handle) to its owning PSP and underlying bank account.

```
FUNCTION resolve_vpa(vpa_handle):
    parts = SPLIT(vpa_handle, "@")
    IF LENGTH(parts) != 2:
        RETURN Error("Invalid VPA format")

    handle_suffix = parts[1]

    // Look up handle → PSP mapping (cached for 1 hour)
    psp_entry = CACHE_GET("handle:" + handle_suffix)
    IF psp_entry IS NULL:
        psp_entry = DB_QUERY(HandleRegistry, WHERE handle = handle_suffix)
        IF psp_entry IS NULL: RETURN Error("Unknown handle")
        CACHE_SET("handle:" + handle_suffix, psp_entry, TTL=3600)

    // Check VPA-level cache (short TTL since account links can change)
    cached = CACHE_GET("vpa:" + vpa_handle)
    IF cached IS NOT NULL: RETURN cached

    // Call owning PSP to validate VPA and retrieve account details
    psp_response = CALL_PSP(psp_entry.psp_id, "/internal/vpa/validate", {vpa: vpa_handle})
    IF psp_response.status != "active":
        RETURN Error("VPA inactive or not found")

    resolution = {
        vpa: vpa_handle,
        psp_id: psp_entry.psp_id,
        psp_endpoint: psp_entry.api_endpoint,
        bank_ifsc: psp_response.primary_account.ifsc,
        account_token: psp_response.primary_account.token,
        payee_name_masked: MASK_NAME(psp_response.account_holder_name),
        is_merchant: psp_response.is_merchant
    }
    CACHE_SET("vpa:" + vpa_handle, resolution, TTL=300)
    RETURN resolution
```

### 2. Transaction Routing Algorithm

Routes each transaction leg to the appropriate participant based on load, availability, and CBS health.

```
FUNCTION route_transaction(txn, target_type, target_id):
    // Check participant health
    health = HEALTH_REGISTRY.get(target_id)
    IF health.status == "down":
        IF target_type == "bank": RETURN Error("BANK_UNAVAILABLE")
        backup = HEALTH_REGISTRY.get_backup(target_id)
        IF backup IS NULL OR backup.status != "healthy":
            RETURN Error("PSP_UNAVAILABLE")

    // Check circuit breaker
    cb = CIRCUIT_BREAKER.get_state(target_id)
    IF cb == "open":
        IF cb.last_check + HALF_OPEN_INTERVAL < NOW(): cb = "half_open"
        ELSE: RETURN Error("CIRCUIT_OPEN")

    // Select endpoint via weighted round-robin penalizing high latency
    endpoints = ENDPOINT_REGISTRY.get_active(target_id)
    selected = NULL; max_score = -1
    FOR EACH ep IN endpoints:
        score = ep.weight * (1 - ep.current_load_pct)
        IF ep.avg_latency_ms > SLA_THRESHOLD_MS: score = score * 0.5
        IF score > max_score: max_score = score; selected = ep

    IF selected IS NULL: RETURN Error("No available endpoint")

    // Dispatch with timeout, sign request with NPCI private key
    start = NOW()
    response = HTTP_POST(selected.url, SERIALIZE(txn), timeout=PER_LEG_TIMEOUT_MS,
        headers={"X-Txn-Id": txn.txn_id, "X-RRN": txn.rrn,
                 "X-Signature": SIGN(txn, NPCI_PRIVATE_KEY)})
    latency = NOW() - start

    // Update circuit breaker metrics
    IF response.status == TIMEOUT OR response.status >= 500:
        CIRCUIT_BREAKER.record_failure(target_id)
        IF failure_count >= THRESHOLD: CIRCUIT_BREAKER.set_state(target_id, "open")
    ELSE:
        CIRCUIT_BREAKER.record_success(target_id)

    RETURN response
```

### 3. UPI PIN Encryption and Validation

UPI PIN never leaves the device in plaintext. Hybrid RSA+AES encryption ensures only the issuer bank can decrypt.

```
FUNCTION encrypt_upi_pin_on_device(pin, card_last6, expiry):
    // Get bank's RSA public key (cached on device during registration)
    bank_pubkey = DEVICE_KEYSTORE.get("bank_rsa_pubkey")
    IF bank_pubkey IS NULL OR bank_pubkey.is_expired():
        bank_pubkey = FETCH_FROM_PSP("/keys/bank-pubkey")
        DEVICE_KEYSTORE.store("bank_rsa_pubkey", bank_pubkey)

    // Build credential block: PIN + card details + expiry
    credential_block = CONCAT(pin, card_last6, expiry)

    // Encrypt with AES-256-GCM session key, wrap session key with RSA-OAEP
    session_key = GENERATE_RANDOM_AES_KEY(256)
    encrypted_data = AES_ENCRYPT(credential_block, session_key, MODE=GCM)
    encrypted_key = RSA_ENCRYPT(session_key, bank_pubkey, PADDING=OAEP)

    RETURN {
        encrypted_data: BASE64(encrypted_data),
        encrypted_key: BASE64(encrypted_key),
        key_index: bank_pubkey.key_id,
        hmac: HMAC_SHA256(encrypted_data, DEVICE_AUTH_KEY)
    }

FUNCTION validate_upi_pin_at_bank(payload, account_id):
    // Decrypt using HSM-stored private key
    private_key = HSM.get_key(payload.key_index)
    session_key = RSA_DECRYPT(BASE64_DECODE(payload.encrypted_key), private_key)
    credential = AES_DECRYPT(BASE64_DECODE(payload.encrypted_data), session_key)

    pin = credential[0:4]
    card_last6 = credential[4:10]
    expiry = credential[10:14]

    // Validate card details against account
    account = CBS.get_account(account_id)
    IF account.card_last6 != card_last6 OR account.expiry != expiry:
        RETURN Error("INVALID_CREDENTIALS")

    // Validate PIN hash in HSM
    stored_hash = HSM.get_pin_hash(account_id)
    computed_hash = HSM.compute_pin_hash(pin, account.salt)
    IF stored_hash != computed_hash:
        INCREMENT_FAILED_ATTEMPTS(account_id)
        IF failed_attempts >= MAX_PIN_ATTEMPTS:
            BLOCK_UPI_ACCESS(account_id)
            RETURN Error("ACCOUNT_BLOCKED")
        RETURN Error("INCORRECT_PIN")

    RESET_FAILED_ATTEMPTS(account_id)
    RETURN Success("PIN_VALIDATED")
```

---

## Transaction State Machine

```mermaid
%%{init: {'theme': 'neutral'}}%%
stateDiagram-v2
    [*] --> initiated : PSP sends ReqPay/ReqCollect
    initiated --> payee_validated : Payee account confirmed
    initiated --> failed : Payee validation failed
    initiated --> expired : Collect request timeout

    payee_validated --> debit_pending : Debit request sent to remitter
    payee_validated --> failed : Payer declined collect

    debit_pending --> debit_success : Remitter confirms debit
    debit_pending --> failed : PIN invalid / insufficient funds

    debit_success --> credit_pending : Credit request sent to beneficiary
    credit_pending --> credit_success : Beneficiary confirms credit
    credit_pending --> reversal_pending : Credit timeout or failure

    credit_success --> completed : Both legs confirmed
    reversal_pending --> reversed : Auto-reversal completed at remitter

    completed --> [*]
    reversed --> [*]
    failed --> [*]
    expired --> [*]
```
