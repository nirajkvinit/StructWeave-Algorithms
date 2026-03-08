# Low-Level Design

## Data Models

### Core Entity Relationship

```mermaid
%%{init: {'theme': 'neutral'}}%%
erDiagram
    ENTITY ||--o{ CHART_OF_ACCOUNTS : "owns"
    CHART_OF_ACCOUNTS ||--o{ GL_ACCOUNT : "defines"
    GL_ACCOUNT ||--o{ SUB_LEDGER : "controls"
    SUB_LEDGER ||--o{ ACCOUNT : "contains"
    ACCOUNT ||--o{ LEDGER_ENTRY : "has"
    ACCOUNT ||--o{ HOLD : "has"
    ACCOUNT }o--|| PRODUCT : "configured by"
    LEDGER_ENTRY }o--|| JOURNAL : "belongs to"
    JOURNAL }o--o| SAGA : "coordinated by"
    PRODUCT ||--o{ RATE_SCHEDULE : "has"
    PRODUCT ||--o{ FEE_SCHEDULE : "has"
    ACCOUNT ||--o{ ACCRUAL_STATE : "tracks"
```

### Account Table

```
Table: accounts
├── account_id          UUID PRIMARY KEY
├── entity_id           UUID NOT NULL          -- banking entity / tenant
├── sub_ledger_id       UUID NOT NULL          -- FK to sub_ledger
├── product_id          UUID NOT NULL          -- FK to product catalog
├── account_number      VARCHAR(34) UNIQUE     -- IBAN or internal number
├── account_type        ENUM('DEPOSIT','LOAN','CREDIT_LINE','INTERNAL','NOSTRO','VOSTRO')
├── currency            CHAR(3) NOT NULL       -- ISO 4217 (USD, EUR, GBP)
├── status              ENUM('ACTIVE','DORMANT','FROZEN','CLOSED','PENDING')
├── opened_at           TIMESTAMP NOT NULL
├── closed_at           TIMESTAMP NULL
├── customer_id         UUID NULL              -- NULL for internal GL accounts
│
├── -- Materialized Balances (updated atomically with ledger postings)
├── ledger_balance      DECIMAL(18,4) NOT NULL DEFAULT 0  -- sum of all posted entries
├── available_balance   DECIMAL(18,4) NOT NULL DEFAULT 0  -- ledger - holds + credit_limit
├── hold_balance        DECIMAL(18,4) NOT NULL DEFAULT 0  -- sum of active holds
├── credit_limit        DECIMAL(18,4) NOT NULL DEFAULT 0  -- for credit accounts
├── balance_version     BIGINT NOT NULL DEFAULT 0         -- optimistic concurrency
│
├── -- Metadata
├── created_at          TIMESTAMP NOT NULL
├── updated_at          TIMESTAMP NOT NULL
└── INDEX idx_entity_customer (entity_id, customer_id)
    INDEX idx_sub_ledger (sub_ledger_id)
    INDEX idx_product (product_id)
    INDEX idx_status (status)

Shard key: account_id (hash-based sharding)
```

### Ledger Entry Table (Immutable, Append-Only)

```
Table: ledger_entries
├── entry_id            UUID PRIMARY KEY
├── journal_id          UUID NOT NULL          -- groups entries into a balanced journal
├── account_id          UUID NOT NULL          -- FK to accounts
├── entity_id           UUID NOT NULL          -- for tenant isolation
├── entry_type          ENUM('DEBIT','CREDIT')
├── amount              DECIMAL(18,4) NOT NULL -- always positive
├── currency            CHAR(3) NOT NULL
├── balance_after       DECIMAL(18,4) NOT NULL -- account balance after this entry
│
├── -- Temporal
├── posting_date        DATE NOT NULL          -- when posted to ledger
├── value_date          DATE NOT NULL          -- when value is effective (for interest)
├── created_at          TIMESTAMP NOT NULL
│
├── -- Classification
├── transaction_type    VARCHAR(50) NOT NULL   -- PAYMENT, INTEREST, FEE, TRANSFER, etc.
├── gl_account_code     VARCHAR(20) NOT NULL   -- Chart of Accounts code
├── description         VARCHAR(255)
├── reference_id        VARCHAR(100)           -- external reference
│
├── -- Immutability enforcement
├── is_reversal         BOOLEAN DEFAULT FALSE
├── reversed_entry_id   UUID NULL              -- points to entry being reversed
│
└── INDEX idx_account_date (account_id, posting_date DESC)
    INDEX idx_journal (journal_id)
    INDEX idx_gl_code_date (gl_account_code, posting_date)
    INDEX idx_value_date (account_id, value_date)

Shard key: account_id (co-located with accounts table)
Partition key: posting_date (monthly partitions for archival)

CONSTRAINT: No UPDATE or DELETE allowed (enforced at DB and application level)
```

### Journal Table

```
Table: journals
├── journal_id          UUID PRIMARY KEY
├── entity_id           UUID NOT NULL
├── idempotency_key     VARCHAR(128) UNIQUE    -- client-generated dedup key
├── journal_type        VARCHAR(50) NOT NULL   -- PAYMENT, ACCRUAL, FEE, SETTLEMENT
├── status              ENUM('POSTED','REVERSED')
├── total_amount        DECIMAL(18,4) NOT NULL -- sum of debit amounts (= sum of credits)
├── currency            CHAR(3) NOT NULL
├── posting_date        DATE NOT NULL
├── value_date          DATE NOT NULL
├── description         VARCHAR(255)
├── created_by          VARCHAR(100) NOT NULL  -- actor / service name
├── created_at          TIMESTAMP NOT NULL
├── saga_id             UUID NULL              -- FK to saga (if cross-shard)
│
└── INDEX idx_idempotency (idempotency_key)
    INDEX idx_posting_date (entity_id, posting_date)
```

### Saga Table (Cross-Shard Coordination)

```
Table: sagas
├── saga_id             UUID PRIMARY KEY
├── saga_type           VARCHAR(50) NOT NULL   -- TRANSFER, SETTLEMENT, FX_CONVERSION
├── status              ENUM('INITIATED','DEBIT_DONE','CREDIT_DONE','COMPLETED',
│                            'COMPENSATING','COMPENSATED','FAILED')
├── idempotency_key     VARCHAR(128) UNIQUE
├── source_account_id   UUID NOT NULL
├── target_account_id   UUID NOT NULL
├── amount              DECIMAL(18,4) NOT NULL
├── currency            CHAR(3) NOT NULL
│
├── -- Step tracking
├── debit_journal_id    UUID NULL
├── credit_journal_id   UUID NULL
├── compensation_journal_id UUID NULL
│
├── -- Retry / timeout
├── retry_count         INT DEFAULT 0
├── max_retries         INT DEFAULT 3
├── timeout_at          TIMESTAMP NOT NULL
│
├── created_at          TIMESTAMP NOT NULL
├── updated_at          TIMESTAMP NOT NULL
└── INDEX idx_status (status) WHERE status NOT IN ('COMPLETED','COMPENSATED','FAILED')
```

### Product Catalog

```
Table: products
├── product_id          UUID PRIMARY KEY
├── entity_id           UUID NOT NULL
├── product_code        VARCHAR(50) UNIQUE
├── product_name        VARCHAR(100) NOT NULL
├── product_type        ENUM('SAVINGS','CHECKING','TERM_DEPOSIT','PERSONAL_LOAN',
│                            'MORTGAGE','CREDIT_LINE','NOSTRO')
├── currency            CHAR(3) NOT NULL
├── status              ENUM('ACTIVE','DISCONTINUED','DRAFT')
│
├── -- Interest Configuration
├── interest_enabled    BOOLEAN DEFAULT FALSE
├── rate_type           ENUM('FIXED','VARIABLE','TIERED') NULL
├── day_count_convention ENUM('ACT_365','ACT_360','ACT_ACT','30_360') NULL
├── compounding_freq    ENUM('DAILY','MONTHLY','QUARTERLY','ANNUALLY','NONE') NULL
├── accrual_frequency   ENUM('DAILY','MONTHLY') DEFAULT 'DAILY'
│
├── -- Limits
├── min_balance         DECIMAL(18,4) DEFAULT 0
├── max_balance         DECIMAL(18,4) NULL
├── daily_txn_limit     DECIMAL(18,4) NULL
│
├── -- Fees (references fee_schedules table)
├── -- Lifecycle
├── dormancy_days       INT NULL               -- days of inactivity before dormant
├── maturity_months     INT NULL               -- for term deposits
│
├── effective_from      DATE NOT NULL
├── effective_to        DATE NULL
├── created_at          TIMESTAMP NOT NULL
└── INDEX idx_entity_type (entity_id, product_type)
```

### Interest Accrual State

```
Table: accrual_state
├── account_id          UUID PRIMARY KEY       -- FK to accounts
├── last_accrual_date   DATE NOT NULL
├── accrued_amount      DECIMAL(18,6) NOT NULL DEFAULT 0  -- unpaid accrued interest
├── principal_balance   DECIMAL(18,4) NOT NULL -- balance used for accrual calc
├── applicable_rate     DECIMAL(8,6) NOT NULL  -- annual rate as decimal
├── rate_tier           VARCHAR(50) NULL       -- which rate tier applies
├── next_capitalization DATE NULL              -- when accrued interest compounds
├── updated_at          TIMESTAMP NOT NULL
└── INDEX idx_accrual_date (last_accrual_date)
```

### GL Account & Chart of Accounts

```
Table: chart_of_accounts
├── coa_id              UUID PRIMARY KEY
├── entity_id           UUID NOT NULL
├── account_code        VARCHAR(20) UNIQUE     -- e.g., "2100" for Customer Deposits
├── account_name        VARCHAR(100) NOT NULL
├── account_category    ENUM('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')
├── parent_code         VARCHAR(20) NULL       -- for hierarchical CoA
├── is_control_account  BOOLEAN DEFAULT FALSE  -- TRUE = has sub-ledger
├── sub_ledger_type     VARCHAR(50) NULL       -- DEPOSITS, LOANS, etc.
├── normal_balance      ENUM('DEBIT','CREDIT') NOT NULL
├── status              ENUM('ACTIVE','INACTIVE')
├── created_at          TIMESTAMP NOT NULL
└── INDEX idx_entity_category (entity_id, account_category)
```

---

## API Design

### Ledger Posting API

```
POST /v1/journals
Headers:
  Idempotency-Key: {client-generated UUID}
  X-Entity-Id: {banking entity ID}
  Authorization: Bearer {token}

Request:
{
  "journal_type": "PAYMENT",
  "posting_date": "2026-03-09",
  "value_date": "2026-03-09",
  "description": "Salary payment to employee",
  "entries": [
    {
      "account_id": "acc-sender-uuid",
      "entry_type": "DEBIT",
      "amount": 5000.00,
      "gl_account_code": "2100",
      "description": "Salary disbursement"
    },
    {
      "account_id": "acc-receiver-uuid",
      "entry_type": "CREDIT",
      "amount": 5000.00,
      "gl_account_code": "2100",
      "description": "Salary received"
    }
  ]
}

Response (201 Created):
{
  "journal_id": "jrn-uuid",
  "status": "POSTED",
  "posting_reference": "POST-20260309-ABC123",
  "entries": [
    { "entry_id": "ent-1-uuid", "balance_after": 45000.00 },
    { "entry_id": "ent-2-uuid", "balance_after": 12500.00 }
  ],
  "created_at": "2026-03-09T14:30:00Z"
}

Errors:
  400: Entries do not balance (sum debits ≠ sum credits)
  402: Insufficient balance on debit account
  409: Duplicate idempotency key (returns original response)
  423: Account frozen or closed
```

### Balance Inquiry API

```
GET /v1/accounts/{account_id}/balance
Headers:
  X-Entity-Id: {banking entity ID}

Response (200 OK):
{
  "account_id": "acc-uuid",
  "currency": "USD",
  "ledger_balance": 50000.00,
  "available_balance": 47500.00,
  "hold_balance": 2500.00,
  "credit_limit": 0.00,
  "as_of": "2026-03-09T14:30:00Z",
  "balance_version": 4521
}
```

### Account Statement API

```
GET /v1/accounts/{account_id}/statements?from=2026-02-01&to=2026-02-28&page=1&size=50

Response (200 OK):
{
  "account_id": "acc-uuid",
  "period": { "from": "2026-02-01", "to": "2026-02-28" },
  "opening_balance": 42000.00,
  "closing_balance": 50000.00,
  "total_debits": 15000.00,
  "total_credits": 23000.00,
  "entries": [
    {
      "entry_id": "ent-uuid",
      "posting_date": "2026-02-03",
      "value_date": "2026-02-03",
      "entry_type": "CREDIT",
      "amount": 5000.00,
      "balance_after": 47000.00,
      "description": "Salary received",
      "reference_id": "PAY-20260203-XYZ"
    }
  ],
  "pagination": { "page": 1, "size": 50, "total_entries": 127 }
}
```

### Cross-Shard Transfer API (Internal)

```
POST /v1/transfers
Headers:
  Idempotency-Key: {UUID}

Request:
{
  "source_account_id": "acc-sender-uuid",
  "target_account_id": "acc-receiver-uuid",
  "amount": 1000.00,
  "currency": "USD",
  "description": "Internal fund transfer"
}

Response (202 Accepted):   -- async for cross-shard
{
  "saga_id": "saga-uuid",
  "status": "INITIATED",
  "estimated_completion": "2026-03-09T14:30:02Z"
}
```

### GL Reconciliation API

```
GET /v1/reconciliation/gl-summary?entity_id={uuid}&date=2026-03-09

Response (200 OK):
{
  "entity_id": "ent-uuid",
  "date": "2026-03-09",
  "status": "BALANCED",
  "summary": [
    {
      "gl_code": "2100",
      "gl_name": "Customer Deposits",
      "gl_balance": 8500000000.00,
      "sl_total": 8500000000.00,
      "difference": 0.00,
      "status": "RECONCILED"
    }
  ],
  "total_assets": 15200000000.00,
  "total_liabilities": 12800000000.00,
  "total_equity": 2400000000.00,
  "balance_check": "ASSETS = LIABILITIES + EQUITY: PASSED"
}
```

---

## Core Algorithms

### Algorithm 1: Atomic Ledger Posting with Balance Update

```
FUNCTION post_journal(journal_request):
    // Step 1: Validate double-entry invariant
    total_debits = SUM(entry.amount FOR entry IN journal_request.entries
                       WHERE entry.type = DEBIT)
    total_credits = SUM(entry.amount FOR entry IN journal_request.entries
                        WHERE entry.type = CREDIT)
    IF total_debits ≠ total_credits:
        RAISE BalanceError("Journal does not balance")

    // Step 2: Check idempotency
    existing = LOOKUP idempotency_cache[journal_request.idempotency_key]
    IF existing IS NOT NULL:
        RETURN existing.response

    // Step 3: Determine if cross-shard
    shards = UNIQUE(GET_SHARD(entry.account_id) FOR entry IN entries)
    IF LENGTH(shards) > 1:
        RETURN initiate_saga(journal_request)

    // Step 4: Single-shard atomic posting
    BEGIN TRANSACTION (SERIALIZABLE on affected accounts)

    FOR EACH entry IN journal_request.entries:
        // Lock account row
        account = SELECT * FROM accounts
                  WHERE account_id = entry.account_id
                  FOR UPDATE

        // Validate account status
        IF account.status NOT IN ('ACTIVE'):
            ROLLBACK
            RAISE AccountError("Account not active")

        // For debit entries: check sufficient balance
        IF entry.type = DEBIT:
            IF account.available_balance < entry.amount:
                ROLLBACK
                RAISE InsufficientFundsError()

        // Calculate new balance
        IF entry.type = DEBIT:
            new_ledger = account.ledger_balance - entry.amount
            new_available = account.available_balance - entry.amount
        ELSE:
            new_ledger = account.ledger_balance + entry.amount
            new_available = account.available_balance + entry.amount

        // Insert immutable ledger entry
        INSERT INTO ledger_entries (
            entry_id, journal_id, account_id, entry_type,
            amount, balance_after, posting_date, value_date,
            gl_account_code, ...
        ) VALUES (NEW_UUID(), journal_id, entry.account_id,
                  entry.type, entry.amount, new_ledger, ...)

        // Update materialized balance atomically
        UPDATE accounts SET
            ledger_balance = new_ledger,
            available_balance = new_available,
            balance_version = balance_version + 1,
            updated_at = NOW()
        WHERE account_id = entry.account_id

    // Insert journal record
    INSERT INTO journals (journal_id, idempotency_key, status, ...)
    VALUES (journal_id, request.idempotency_key, 'POSTED', ...)

    COMMIT TRANSACTION

    // Step 5: Post-commit
    CACHE idempotency_key → response (TTL: 24h)
    INVALIDATE balance_cache[affected_account_ids]
    EMIT event PostingCompleted(journal_id, entries)

    RETURN posting_response
```

### Algorithm 2: Daily Interest Accrual

```
FUNCTION run_daily_accrual(accrual_date):
    // Process each shard in parallel
    FOR EACH shard IN account_shards PARALLEL:

        // Fetch accounts needing accrual on this shard
        accounts = SELECT a.account_id, a.ledger_balance, a.currency,
                          s.accrued_amount, s.applicable_rate,
                          s.last_accrual_date, s.next_capitalization,
                          p.day_count_convention, p.compounding_freq
                   FROM accounts a
                   JOIN accrual_state s ON a.account_id = s.account_id
                   JOIN products p ON a.product_id = p.product_id
                   WHERE p.interest_enabled = TRUE
                     AND a.status = 'ACTIVE'
                     AND s.last_accrual_date < accrual_date
                   ORDER BY a.account_id

        // Batch process accounts
        FOR EACH batch OF 1000 accounts:
            journal_entries = []

            FOR EACH account IN batch:
                // Calculate day fraction based on convention
                days = accrual_date - account.last_accrual_date
                day_fraction = calculate_day_fraction(
                    days, account.day_count_convention, accrual_date)

                // Calculate daily interest
                // For tiered rates: calculate interest per tier bracket
                daily_interest = account.ledger_balance
                                 × account.applicable_rate
                                 × day_fraction

                // Round per regulatory standard
                daily_interest = ROUND(daily_interest, 4)  // 4 decimal precision

                // Check for capitalization (compounding)
                IF accrual_date >= account.next_capitalization:
                    // Compound: post accrued interest to principal
                    compound_amount = account.accrued_amount + daily_interest
                    ADD journal_entry: DEBIT interest_expense, compound_amount
                    ADD journal_entry: CREDIT account, compound_amount
                    UPDATE accrual_state SET accrued_amount = 0,
                        next_capitalization = NEXT_PERIOD(compounding_freq)
                ELSE:
                    // Accrue only (memo posting)
                    UPDATE accrual_state SET
                        accrued_amount = accrued_amount + daily_interest,
                        last_accrual_date = accrual_date

            // Post batch journal entries atomically
            post_journal(journal_entries)

    RETURN accrual_summary

FUNCTION calculate_day_fraction(days, convention, date):
    SWITCH convention:
        CASE ACT_365:  RETURN days / 365
        CASE ACT_360:  RETURN days / 360
        CASE ACT_ACT:  RETURN days / days_in_year(date)
        CASE 30_360:   RETURN adjusted_30_360_days(days) / 360
```

### Algorithm 3: GL Reconciliation

```
FUNCTION reconcile_gl(entity_id, reconciliation_date):
    breaks = []

    // Step 1: For each control account in CoA
    control_accounts = SELECT * FROM chart_of_accounts
                       WHERE entity_id = entity_id
                         AND is_control_account = TRUE

    FOR EACH control IN control_accounts:
        // Get GL control account balance
        gl_balance = SELECT SUM(
                        CASE WHEN entry_type = 'DEBIT' THEN amount
                             ELSE -amount END
                     ) FROM ledger_entries
                     WHERE gl_account_code = control.account_code
                       AND posting_date <= reconciliation_date

        // Get sum of all sub-ledger accounts
        sl_total = SELECT SUM(ledger_balance) FROM accounts
                   WHERE sub_ledger_id IN (
                       SELECT sub_ledger_id FROM sub_ledgers
                       WHERE gl_control_code = control.account_code
                   )

        // Compare
        difference = ABS(gl_balance - sl_total)
        IF difference > 0.01:  // tolerance for rounding
            breaks.ADD({
                gl_code: control.account_code,
                gl_balance: gl_balance,
                sl_total: sl_total,
                difference: difference
            })
            ALERT("GL Reconciliation break", control.account_code, difference)

    // Step 2: Verify accounting equation
    total_assets = SUM(gl_balance WHERE category = 'ASSET')
    total_liabilities = SUM(gl_balance WHERE category = 'LIABILITY')
    total_equity = SUM(gl_balance WHERE category = 'EQUITY')

    IF ABS(total_assets - total_liabilities - total_equity) > 0.01:
        CRITICAL_ALERT("Accounting equation violation!")

    // Step 3: Generate reconciliation report
    STORE reconciliation_report(entity_id, date, breaks, status)
    RETURN breaks
```

---

## Idempotency Strategy

| Layer | Mechanism | TTL | Purpose |
|-------|-----------|-----|---------|
| **Fast path** | Distributed cache lookup on idempotency_key | 24 hours | Instant dedup for retries |
| **Safety net** | UNIQUE constraint on journals.idempotency_key | Permanent | Prevents duplicates even if cache misses |
| **Cross-shard** | UNIQUE constraint on sagas.idempotency_key | Permanent | Dedup for saga-coordinated transfers |
| **Batch operations** | Composite key: (batch_run_id + account_id) | Per batch | Prevents double-accrual if batch restarts |
