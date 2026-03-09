# Low-Level Design

## 1. Data Models

### Entity Relationship Diagram

```mermaid
erDiagram
    LegalEntity ||--o{ AccountingPeriod : defines
    LegalEntity ||--o{ Account : owns
    LegalEntity ||--o{ JournalEntry : records
    LegalEntity ||--o{ GLBalance : maintains
    AccountingPeriod ||--o{ JournalEntry : contains
    AccountingPeriod ||--o{ GLBalance : aggregates
    JournalEntry ||--|{ JournalLine : has
    JournalLine }o--|| Account : posts_to
    Account ||--o{ GLBalance : tracks
    Account ||--o| Account : parent_of
    LegalEntity ||--o{ BankStatement : receives
    BankStatement ||--|{ BankTransaction : includes
    BankTransaction |o--o| JournalEntry : matches
    JournalEntry ||--o{ AuditEvent : generates

    LegalEntity { UUID entity_id PK STRING name STRING functional_currency STRING tax_id ENUM status }
    AccountingPeriod { UUID period_id PK UUID entity_id FK INT fiscal_year INT period_number ENUM status DATE start_date DATE end_date }
    Account { UUID account_id PK STRING account_number STRING account_name ENUM account_type UUID parent_account_id FK BOOLEAN is_summary ENUM normal_balance }
    JournalEntry { UUID entry_id PK STRING entry_number UUID entity_id FK UUID period_id FK ENUM entry_type ENUM status STRING hash STRING previous_hash }
    JournalLine { UUID line_id PK UUID entry_id FK UUID account_id FK DECIMAL debit_amount DECIMAL credit_amount UUID cost_center_id }
    GLBalance { UUID balance_id PK UUID account_id FK UUID period_id FK DECIMAL opening_balance DECIMAL closing_balance DECIMAL total_debits DECIMAL total_credits }
    BankStatement { UUID statement_id PK UUID bank_account_id FK DATE statement_date DECIMAL opening_balance DECIMAL closing_balance }
    BankTransaction { UUID transaction_id PK UUID statement_id FK DECIMAL amount ENUM match_status UUID matched_entry_id FK FLOAT confidence_score }
    AuditEvent { UUID event_id PK UUID entry_id FK STRING action UUID actor_id TIMESTAMP occurred_at JSON before_state JSON after_state }

    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
```

### Key Entity Details

```
JournalEntry   { entry_id UUID PK, entry_number STRING (auto-sequential per period),
                 entity_id UUID FK, period_id UUID FK, entry_date DATE, effective_date DATE,
                 entry_type ENUM(MANUAL|AUTOMATED|RECURRING|REVERSING|CLOSING|ADJUSTMENT),
                 source_system STRING, description TEXT, currency_code STRING(ISO 4217),
                 exchange_rate DECIMAL(18,8), status ENUM(DRAFT|PENDING_APPROVAL|APPROVED|POSTED|REVERSED),
                 created_by UUID FK, approved_by UUID FK, posted_at TIMESTAMP,
                 hash STRING(SHA-256), previous_hash STRING, reversal_of UUID FK }
  INDEX: (entity_id, period_id, status), (entity_id, entry_number) UNIQUE, (hash) UNIQUE
  PARTITION: range by entity_id + period_id

JournalLine    { line_id UUID PK, entry_id UUID FK, line_number INT, account_id UUID FK,
                 department_id UUID FK, cost_center_id UUID FK, project_id UUID FK,
                 debit_amount DECIMAL(18,4), credit_amount DECIMAL(18,4),
                 source_debit DECIMAL(18,4), source_credit DECIMAL(18,4),
                 description TEXT, tax_code STRING, intercompany_entity_id UUID FK }
  INDEX: (entry_id, line_number) UNIQUE, (account_id, entry_id), (intercompany_entity_id) WHERE NOT NULL
  CHECK: (debit_amount >= 0 AND credit_amount >= 0), (debit_amount = 0 OR credit_amount = 0)

Account        { account_id UUID PK, account_number STRING (e.g., "1100.10.001"),
                 account_name STRING, account_type ENUM(ASSET|LIABILITY|EQUITY|REVENUE|EXPENSE),
                 account_subtype STRING, parent_account_id UUID FK (nullable),
                 level INT, is_summary BOOLEAN, is_active BOOLEAN, normal_balance ENUM(DEBIT|CREDIT),
                 currency_code STRING (nullable), entity_id UUID FK, tags JSONB }
  INDEX: (entity_id, account_number) UNIQUE, (entity_id, account_type, is_active), (parent_account_id)

GLBalance      { balance_id UUID PK, account_id UUID FK, entity_id UUID FK, period_id UUID FK,
                 currency_code STRING, opening_balance DECIMAL(18,4), total_debits DECIMAL(18,4),
                 total_credits DECIMAL(18,4), closing_balance DECIMAL(18,4), last_updated TIMESTAMP }
  INDEX: (account_id, period_id, entity_id, currency_code) UNIQUE, (entity_id, period_id)

BankStatement  { statement_id UUID PK, bank_account_id UUID FK, entity_id UUID FK,
                 statement_date DATE, opening_balance DECIMAL(18,4), closing_balance DECIMAL(18,4),
                 import_format ENUM(CSV|OFX|MT940|ISO20022), imported_at TIMESTAMP }
  INDEX: (bank_account_id, statement_date) UNIQUE

BankTransaction { transaction_id UUID PK, statement_id UUID FK, date DATE, value_date DATE,
                  description TEXT, amount DECIMAL(18,4), type ENUM(DEBIT|CREDIT), reference STRING,
                  match_status ENUM(UNMATCHED|AUTO_MATCHED|MANUAL_MATCHED|EXCEPTION),
                  matched_entry_id UUID FK, confidence_score FLOAT, matched_at TIMESTAMP }
  INDEX: (statement_id, match_status), (date, amount)

AccountingPeriod { period_id UUID PK, entity_id UUID FK, fiscal_year INT, period_number INT(1-13),
                   period_name STRING, start_date DATE, end_date DATE,
                   status ENUM(FUTURE|OPEN|SOFT_CLOSED|HARD_CLOSED|ARCHIVED), closed_by UUID FK }
  INDEX: (entity_id, fiscal_year, period_number) UNIQUE, (entity_id, status)
  TRANSITIONS: FUTURE->OPEN->SOFT_CLOSED->HARD_CLOSED->ARCHIVED; SOFT_CLOSED->OPEN (reopen)
```

---

## 2. API Design

### Journal Entry APIs

```
POST /api/v1/journal-entries
  Body: { entity_id, period_id, entry_date, entry_type, currency_code, exchange_rate,
          lines: [{ account_id, debit_amount, credit_amount, cost_center_id, ... }] }
  Response 201: { entry_id, entry_number, status: "DRAFT" }

GET  /api/v1/journal-entries/{id}     -- full entry with lines, hash chain info
POST /api/v1/journal-entries/{id}/approve   Body: { approver_id, comments }
POST /api/v1/journal-entries/{id}/post      -- updates GLBalance, computes hash, emits event
POST /api/v1/journal-entries/{id}/reverse   Body: { reversal_date, period_id, reason }
GET  /api/v1/trial-balance?entity_id=&period_id=&as_of_date=
```

### Reconciliation APIs

```
POST /api/v1/reconciliation/import-statement   Body: multipart { bank_account_id, file }
POST /api/v1/reconciliation/auto-match         Body: { statement_id }
POST /api/v1/reconciliation/manual-match       Body: { transaction_id, entry_id, notes }
GET  /api/v1/reconciliation/exceptions?statement_id=&date_range=
```

### Reporting & Period APIs

```
GET  /api/v1/reports/balance-sheet?entity_id=&as_of_date=&comparative_date=
GET  /api/v1/reports/income-statement?entity_id=&period_id=&from_date=&to_date=
GET  /api/v1/reports/cash-flow?entity_id=&period_id=&method=DIRECT|INDIRECT
POST /api/v1/periods/{id}/close    Body: { close_type: "SOFT"|"HARD" }
POST /api/v1/periods/{id}/reopen   Body: { reason }  -- only from SOFT_CLOSED
```

---

## 3. Core Algorithms

### Double-Entry Validation

```
FUNCTION validateJournalEntry(entry):
    errors = []
    totalDebits  = SUM(line.debit_amount FOR line IN entry.lines)
    totalCredits = SUM(line.credit_amount FOR line IN entry.lines)

    IF totalDebits != totalCredits:
        errors.APPEND("Debits must equal credits: " + totalDebits + " vs " + totalCredits)
    IF totalDebits == 0:
        errors.APPEND("Entry total cannot be zero")
    IF COUNT(line WHERE debit > 0) == 0 OR COUNT(line WHERE credit > 0) == 0:
        errors.APPEND("Must have at least one debit and one credit line")

    FOR EACH line IN entry.lines:
        account = lookupAccount(line.account_id)
        IF account.is_summary: errors.APPEND("Cannot post to summary account")
        IF NOT account.is_active: errors.APPEND("Account inactive: " + account.account_number)
        IF account.currency_code != NULL AND account.currency_code != entry.currency_code:
            errors.APPEND("Currency mismatch on " + account.account_number)
        IF account.entity_id != entry.entity_id AND line.intercompany_entity_id IS NULL:
            errors.APPEND("Cross-entity posting requires intercompany flag")

    period = lookupPeriod(entry.period_id)
    IF period.status NOT IN [OPEN, SOFT_CLOSED]: errors.APPEND("Period closed for posting")
    IF entry.entry_date < period.start_date OR entry.entry_date > period.end_date:
        errors.APPEND("Entry date outside period boundaries")

    IF entry.currency_code != entity.functional_currency AND (entry.exchange_rate IS NULL OR <= 0):
        errors.APPEND("Exchange rate required for foreign currency entries")

    IF errors NOT EMPTY: RAISE ValidationException(errors)
    RETURN VALID
```

### GL Posting Algorithm

```
FUNCTION postJournalEntry(entry):
    validateJournalEntry(entry)
    IF entry.status != APPROVED: RAISE StateError("Must be APPROVED before posting")

    idempotencyKey = "post:" + entry.entry_id
    IF NOT acquireIdempotencyLock(idempotencyKey, ttl=300s):
        RAISE ConflictError("Posting already in progress")

    BEGIN TRANSACTION (isolation=SERIALIZABLE)
    TRY:
        entry.entry_number = generateSequentialNumber(entry.entity_id, entry.period_id)

        FOR EACH line IN entry.lines:
            balance = getOrCreateBalance(line.account_id, entry.period_id, entry.entity_id)
            ACQUIRE ROW LOCK(balance.balance_id)    -- prevents concurrent balance corruption

            balance.total_debits  += line.debit_amount
            balance.total_credits += line.credit_amount
            account = lookupAccount(line.account_id)

            IF account.normal_balance == DEBIT:
                balance.closing_balance = balance.opening_balance + balance.total_debits - balance.total_credits
            ELSE:
                balance.closing_balance = balance.opening_balance + balance.total_credits - balance.total_debits

            balance.last_posted_entry_id = entry.entry_id
            balance.last_updated = NOW()
            SAVE(balance)

        -- Compute cryptographic hash for audit chain
        previousEntry = getLastPostedEntry(entry.entity_id)
        previousHash = previousEntry.hash IF previousEntry ELSE "GENESIS"
        entry.hash = computeEntryHash(entry, previousHash)
        entry.previous_hash = previousHash
        entry.status = POSTED
        entry.posted_at = NOW()
        SAVE(entry)
        COMMIT

    CATCH exception:
        ROLLBACK
        releaseIdempotencyLock(idempotencyKey)
        RAISE exception

    -- Post-commit async (outside transaction)
    emitEvent(JournalPostedEvent(entry))
    invalidateTrialBalanceCache(entry.entity_id, entry.period_id)
    releaseIdempotencyLock(idempotencyKey)
```

### Bank Reconciliation Auto-Match

```
FUNCTION autoMatchTransactions(statementId):
    statement = loadStatement(statementId)
    bankTxns = statement.transactions.FILTER(status == UNMATCHED)
    glEntries = loadUnreconciledGLEntries(statement.bank_account_id, statement.date_range + 7d)
    matches = []
    usedGL = SET()

    -- Phase 1: Exact match on reference + amount + date
    FOR EACH bt IN bankTxns:
        exact = glEntries.FIND(e -> e.reference == bt.reference AND e.amount == bt.amount
                               AND e.date == bt.date AND e.id NOT IN usedGL)
        IF exact: matches.APPEND(Match(bt, exact, 1.0, "EXACT")); usedGL.ADD(exact.id); CONTINUE

    -- Phase 2: Fuzzy weighted scoring
    FOR EACH bt IN bankTxns.FILTER(NOT matched):
        candidates = glEntries.FILTER(e -> ABS(e.amount - bt.amount) <= bt.amount * 0.01
                                       AND ABS(daysBetween(e.date, bt.date)) <= 5
                                       AND e.id NOT IN usedGL)
        bestScore, bestCandidate = 0, NULL
        FOR EACH c IN candidates:
            amtScore  = 1.0 - ABS(c.amount - bt.amount) / bt.amount     -- weight 35%
            dateScore = 1.0 - ABS(daysBetween(c.date, bt.date)) / 5     -- weight 25%
            descScore = levenshteinSimilarity(c.description, bt.description)  -- weight 25%
            refScore  = jaccardSimilarity(c.reference, bt.reference)     -- weight 15%
            total = amtScore*0.35 + dateScore*0.25 + descScore*0.25 + refScore*0.15
            IF total > bestScore: bestScore, bestCandidate = total, c

        IF bestScore > 0.85: matches.APPEND(Match(bt, bestCandidate, bestScore, "FUZZY"))
            usedGL.ADD(bestCandidate.id); CONTINUE

    -- Phase 3: One-to-many (single bank txn to multiple GL entries)
    FOR EACH bt IN bankTxns.FILTER(NOT matched):
        combo = findSubsetSum(glEntries.FILTER(NOT IN usedGL), bt.amount, tolerance=0.01)
        IF combo: matches.APPEND(MultiMatch(bt, combo, 0.80, "AGGREGATE"))
            FOR e IN combo: usedGL.ADD(e.id)

    RETURN ReconciliationResult(matches, unmatched=bankTxns.FILTER(NOT matched),
                                match_rate=LEN(matches)/LEN(bankTxns))
```

### Cryptographic Hash Chain for Audit Trail

```
FUNCTION computeEntryHash(entry, previousHash):
    payload = canonicalSerialize(
        entry.entry_id, entry.entry_number, entry.entity_id, entry.entry_date,
        sortedLines(entry.lines),  -- sort by line_number for determinism
        entry.posted_at, previousHash
    )
    RETURN SHA256(payload)

FUNCTION verifyAuditChain(entityId, fromPeriod, toPeriod):
    entries = loadPostedEntries(entityId, fromPeriod, toPeriod, ORDER BY posted_at)
    FOR i IN RANGE(1, LEN(entries)):
        expected = computeEntryHash(entries[i], entries[i-1].hash)
        IF expected != entries[i].hash:
            RETURN ChainResult(valid=FALSE, broken_at=entries[i].entry_id, reason="Hash mismatch")
        IF entries[i].previous_hash != entries[i-1].hash:
            RETURN ChainResult(valid=FALSE, broken_at=entries[i].entry_id, reason="Pointer broken")
    RETURN ChainResult(valid=TRUE, checked=LEN(entries))
```

### Multi-Currency Revaluation

```
FUNCTION runRevaluation(entityId, periodId, revaluationDate):
    entity = loadEntity(entityId)
    monetaryAccounts = getMonetaryAccounts(entityId)  -- AP, AR, bank, loans
    currentRates = fetchExchangeRates(revaluationDate)
    revaluationEntries = []

    FOR EACH account IN monetaryAccounts:
        FOR EACH balance IN getBalancesByForeignCurrency(account.account_id, periodId):
            IF balance.currency_code == entity.functional_currency: CONTINUE
            rate = currentRates.getRate(balance.currency_code, entity.functional_currency)
            IF rate IS NULL: logWarning("No rate for " + balance.currency_code); CONTINUE

            revaluedAmount = balance.source_balance * rate
            unrealizedGL = revaluedAmount - balance.closing_balance
            IF ABS(unrealizedGL) <= MATERIALITY_THRESHOLD: CONTINUE

            gainLossAccount = getUnrealizedGainLossAccount(entityId)
            IF unrealizedGL > 0:
                debitAcct, creditAcct = account.account_id, gainLossAccount
            ELSE:
                debitAcct, creditAcct = gainLossAccount, account.account_id

            entry = buildJournalEntry(entity_id=entityId, period_id=periodId,
                entry_type=ADJUSTMENT, source_system="revaluation-engine",
                lines=[Line(debitAcct, debit=ABS(unrealizedGL)), Line(creditAcct, credit=ABS(unrealizedGL))])
            entry.status = APPROVED
            postJournalEntry(entry)
            revaluationEntries.APPEND(entry)

    RETURN RevaluationResult(entries=LEN(revaluationEntries), total_gain_loss=SUM(unrealizedGL))
```

---

## 4. Journal Entry Posting Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant JS as Journal Service
    participant GL as GL Engine
    participant DB as Database
    participant EQ as Event Queue

    C->>GW: POST /journal-entries/{id}/post
    GW->>JS: postJournalEntry(entryId)
    JS->>DB: load entry + lines + accounts + period
    DB-->>JS: entry data
    JS->>JS: validateJournalEntry(entry)
    JS->>DB: BEGIN SERIALIZABLE TXN
    loop For each journal line
        GL->>DB: SELECT FOR UPDATE gl_balance
        GL->>GL: recalculate closing_balance
        GL->>DB: UPDATE gl_balance
    end
    JS->>JS: computeEntryHash(entry, previousHash)
    JS->>DB: UPDATE entry SET status=POSTED, hash=...
    JS->>DB: COMMIT
    JS->>EQ: emit JournalPostedEvent
    JS-->>GW: 200 OK { posted entry }
    GW-->>C: 200 OK
```

---

## 5. Key Design Considerations

### Concurrency Control

| Resource | Lock Type | Scope | Rationale |
|----------|-----------|-------|-----------|
| GLBalance row | SELECT FOR UPDATE | Per account-period | Prevents lost updates from concurrent postings |
| Entry number | Advisory lock | Per entity+period | Gap-free sequential numbering |
| Period status | Optimistic (version col) | Single row | Infrequent transitions; retries acceptable |
| Hash chain | Serialized queue | Per entity | Strict ordering required for chain integrity |

### Period Close Validation

```
FUNCTION validatePeriodClose(periodId, closeType):
    -- 1. No unposted entries
    pending = countEntries(periodId, status IN [DRAFT, PENDING_APPROVAL, APPROVED])
    IF pending > 0: RAISE CloseError(pending + " entries not posted")

    -- 2. Trial balance must balance
    tb = computeTrialBalance(periodId)
    IF tb.total_debits != tb.total_credits: RAISE CloseError("Trial balance imbalanced")

    -- 3. Bank reconciliation complete (hard close only)
    IF closeType == HARD_CLOSE:
        unreconciled = countUnreconciledTransactions(periodId)
        IF unreconciled > 0: RAISE CloseError(unreconciled + " unreconciled transactions")

    -- 4. Intercompany balances net to zero
    FOR EACH pair IN getIntercompanyBalances(periodId):
        IF pair.net_balance != 0: RAISE CloseError("IC imbalance with " + pair.counterparty_id)

    -- 5. Carry forward: balance sheet accounts roll, income/expense close to retained earnings
    nextPeriod = getNextPeriod(periodId)
    IF nextPeriod:
        FOR b IN getBalances(periodId, types=[ASSET, LIABILITY, EQUITY]):
            getOrCreateBalance(b.account_id, nextPeriod).opening_balance = b.closing_balance
        netIncome = computeNetIncome(periodId)
        IF netIncome != 0:
            postClosingEntry(periodId, retainedEarningsAccount, netIncome)
```

### Interview Discussion Points

**Why hash chains over database audit logs?** Database logs can be tampered with by privileged administrators. A cryptographic hash chain ensures any modification to a posted entry breaks the chain and is immediately detectable -- required by SOX, IFRS, and GAAP compliance. Periodic checkpoint hashes reduce verification to O(n) since last checkpoint.

**Why separate source and functional currency amounts?** Storing both original transaction currency (`source_debit`/`source_credit`) and functional currency equivalents (`debit_amount`/`credit_amount`) preserves the audit trail while enabling period-end FX revaluation without losing original amounts. Required under IAS 21 / ASC 830.

**Why Period 13 (adjustment period)?** Auditors need to post year-end adjustments after monthly close without disturbing operational figures. Period 13 isolates audit adjustments and reclassifications while rolling them into annual statements.
