# Requirements & Estimations

## Functional Requirements

### Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Account Management** | Create, close, freeze, and manage deposit accounts (savings, checking, term deposit), loan accounts (personal, mortgage, business), and internal GL accounts; support account hierarchies and linked accounts |
| F2 | **Ledger Posting** | Record every financial event as immutable double-entry ledger entries (debit + credit); enforce the invariant that total debits equal total credits; support multi-leg journal entries for complex transactions |
| F3 | **Balance Inquiry** | Real-time balance queries returning available balance, ledger balance, hold balance, and projected balance; support point-in-time balance reconstruction from ledger entries |
| F4 | **Payment Processing** | Process inbound/outbound payments across multiple rails (RTGS, ACH, wire, instant payments); post to ledger atomically with payment status updates |
| F5 | **Interest Calculation** | Daily accrual engine supporting multiple day-count conventions (Actual/365, 30/360, Actual/Actual), tiered rates, compounding schedules, and promotional rate periods |
| F6 | **Fee Management** | Apply recurring fees (monthly maintenance, dormancy), event-driven fees (overdraft, wire transfer), and volume-based fee schedules; post fees as ledger entries |
| F7 | **Multi-Currency** | Maintain balances in 30+ currencies; apply FX rates at transaction time; manage nostro/vostro account reconciliation; track currency positions |
| F8 | **Product Catalog** | Configure financial products (savings, loans, credit lines) as declarative definitions specifying rates, fees, limits, lifecycle events, and accrual rules; product changes apply prospectively |
| F9 | **Statement Generation** | Produce periodic account statements (daily, monthly, annual) from ledger entries; support downloadable formats and regulatory-mandated disclosures |
| F10 | **Regulatory Reporting** | Generate Basel III capital adequacy reports, liquidity coverage ratios, risk-weighted asset calculations, and suspicious activity reports from ledger data |
| F11 | **GL Reconciliation** | Automated reconciliation of sub-ledger totals against GL control accounts; flag and quarantine discrepancies; support manual adjustment workflows |
| F12 | **Settlement & Clearing** | Batch netting for inter-bank settlements; real-time gross settlement posting; correspondent banking (nostro/vostro) account management |
| F13 | **Loan Lifecycle** | Disbursement, repayment scheduling, prepayment, restructuring, provisioning, and write-off---each producing appropriate ledger entries |
| F14 | **Holds & Earmarks** | Place holds on account balances (pending transactions, regulatory freezes, collateral); reduce available balance without affecting ledger balance |
| F15 | **Backdating & Value Dating** | Post transactions with a value date different from posting date; recalculate interest accruals affected by backdated entries |

### User Roles

| Role | Capabilities |
|------|-------------|
| **Customer** | View balances, transaction history, statements; initiate payments and transfers; manage linked accounts |
| **Teller / Branch** | Open accounts, process deposits/withdrawals, place holds, handle cash transactions |
| **Relationship Manager** | Manage commercial accounts, approve credit facilities, override limits within authority |
| **Operations** | Run EOD processing, manage payment exceptions, handle reconciliation breaks |
| **Treasury** | Manage liquidity positions, FX exposure, nostro accounts, interbank settlements |
| **Risk & Compliance** | Monitor capital adequacy, review flagged transactions, file regulatory reports |
| **Product Manager** | Define and modify product configurations (rates, fees, limits) via product catalog |
| **IT Admin** | System configuration, tenant management, access control, audit log review |

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Posting Latency** | p50 < 100ms, p99 < 500ms | Real-time payment posting for instant payment schemes |
| **Balance Query Latency** | p99 < 50ms | Balance must return instantly for payment authorization |
| **Batch Processing Window** | < 6 hours | EOD interest accrual, statement gen, regulatory calcs must complete overnight |
| **Posting Availability** | 99.995% | Downtime means payments cannot be processed; regulatory and reputational risk |
| **Ledger Consistency** | Zero imbalance | GL must balance at all times; sub-ledger reconciliation tolerance is zero |
| **Data Durability** | 99.99999% | Financial records are legally binding; loss is catastrophic |
| **Audit Trail Completeness** | 100% | Every state change must be traceable to an actor, timestamp, and authorization |
| **Regulatory Compliance** | Per jurisdiction | Basel III, SOX, PSD2, AML/KYC, data residency |
| **Multi-Tenant Isolation** | Complete data segregation | Tenant A must never see Tenant B's data; separate encryption keys |
| **Recovery Time Objective** | < 15 minutes | Active-active or hot standby for critical posting path |
| **Recovery Point Objective** | 0 (zero data loss) | Synchronous replication for ledger writes |

---

## Capacity Estimations

### Traffic

```
Total accounts:              100,000,000 (100M)
  Deposit accounts:          70M (savings, checking, term deposits)
  Loan accounts:             20M (personal, mortgage, business, credit line)
  Internal GL accounts:      500,000 (control accounts, fee accounts, suspense)
  Nostro/Vostro accounts:    10,000 (correspondent banking)

Monthly active accounts:     60,000,000 (60M)
Daily active accounts:       25,000,000 (25M)

Daily transactions:          500,000,000 (500M)
  Payment transactions:      200M (transfers, bill pay, card, instant payments)
  Interest postings:         80M (daily accrual for interest-bearing accounts)
  Fee postings:              30M (monthly fees distributed across days)
  Internal transfers:        50M (inter-account, sweeps, FX)
  Loan repayments:           40M (scheduled EMI, prepayments)
  Settlement entries:        100M (batch netting, clearing)

Average transactions/sec:   500M / 86,400 ≈ 5,787 TPS
Peak transactions/sec:      5,787 × 8 = ~46,300 TPS
  (Peaks during salary runs, month-end, quarter-end)

Balance queries/sec:         ~100,000 (payment authorizations, app opens, ATM)
```

### Ledger Volume

```
Ledger entries per transaction:   3.0 average
  Simple transfer:                2 entries (debit source, credit destination)
  Payment with fee:               3 entries (debit customer, credit payee, credit fee)
  Loan repayment:                 4 entries (debit customer, credit principal,
                                             credit interest, credit fee)
  Interest accrual:               2 entries (debit interest expense, credit accrued payable)

Daily ledger entries:        500M × 3.0 = 1.5B entries/day
Peak ledger writes/sec:      1.5B / 86,400 × 8 = ~139,000 writes/sec

Ledger entry size:           ~250 bytes
Daily ledger growth:         1.5B × 250B = 375 GB/day
Annual ledger growth:        375 GB × 365 = 137 TB/year
10-year retention:           ~1.37 PB (compressed: ~450 TB)
```

### Storage

```
--- Account Data ---
Account record size:         ~1 KB (balance, product config, metadata, status)
Total account storage:       100M × 1 KB = 100 GB
Active account index:        60M × 200B = 12 GB (fits in memory)

--- Ledger ---
Daily growth:                375 GB/day
Annual growth:               137 TB/year
Hot storage (90 days):       34 TB
Warm storage (1 year):       137 TB
Cold storage (10 years):     ~1.37 PB (compressed: ~450 TB)

--- Product Catalog ---
Product definitions:         ~5,000 active products
Product config storage:      ~50 MB (small but critical)

--- Audit Trail ---
Audit record size:           ~500 bytes (actor, action, timestamp, before/after)
Daily audit records:         ~2B (ledger entries + balance reads + admin actions)
Daily audit growth:          2B × 500B = 1 TB/day
Annual audit growth:         365 TB/year (tiered to cold storage after 1 year)

--- Regulatory Reports ---
Daily report generation:     ~10 GB (Basel III, AML, statements)
Annual regulatory storage:   ~3.6 TB
```

### Bandwidth

```
Posting request size:        ~2 KB (encrypted payload with idempotency key)
Posting response size:       ~1 KB (confirmation with posting reference)
Peak posting bandwidth:      46,300 × 3 KB = ~139 MB/s

Balance query response:      ~500 bytes
Peak balance bandwidth:      100,000 × 500B = ~50 MB/s

EOD batch throughput:        375 GB over 6 hours = ~17 MB/s sustained

Total peak bandwidth:        ~200 MB/s (modest for financial infrastructure)
```

---

## SLO / SLA Table

| Service | Metric | SLO | SLA | Measurement |
|---------|--------|-----|-----|-------------|
| Ledger Posting | Latency p50 | < 100ms | < 200ms | Entry creation to durable commit |
| Ledger Posting | Latency p99 | < 500ms | < 1s | Including cross-shard saga |
| Ledger Posting | Success rate | > 99.99% | > 99.95% | Excluding business rule rejections |
| Balance Query | Latency p99 | < 50ms | < 100ms | Cached materialized balance |
| Balance Query | Availability | 99.999% | 99.99% | Critical for payment authorization |
| Interest Accrual | Batch completion | < 4 hours | < 6 hours | Full accrual run for all accounts |
| Interest Accrual | Accuracy | ±0.01 currency unit | ±0.01 | Rounding per regulatory standard |
| GL Reconciliation | Completion | < 2 hours post-EOD | < 4 hours | All SL-to-GL controls verified |
| GL Reconciliation | Break tolerance | 0 | 0 | Any break triggers investigation |
| Settlement | Posting latency | < 1s (RTGS) | < 2s | Real-time gross settlement |
| Settlement | Batch netting | < 30 min | < 1 hour | End-of-cycle netting and posting |
| Regulatory Reports | Generation time | < 4 hours | < 8 hours | Basel III, LCR, NSFR |
| Audit Trail | Write durability | 99.99999% | 99.9999% | Synchronous replication, tamper-evident |
| Multi-Currency FX | Rate staleness | < 30s | < 60s | Real-time rate feed latency |
| Statement Generation | Monthly statements | < 8 hours | < 12 hours | All active accounts |

---

## Key Estimation Insights

1. **Ledger writes are the dominant bottleneck**: At 139,000 peak writes/sec across all ledger entries, the ledger database cluster is the most write-intensive component. Sharding by account ID with append-only entries (never update, only insert) is essential. Each shard should handle < 20,000 writes/sec to maintain sub-100ms latency.

2. **Interest accrual is a massive batch operation**: Processing 80M interest-bearing accounts nightly requires ~13,300 accounts/sec sustained over 6 hours. Each account needs its balance, rate, day-count convention, and compounding schedule evaluated. Parallel processing across account shards with independent accrual workers is the only viable approach.

3. **Balance reads outnumber writes 2:1**: At 100,000 balance queries/sec versus 46,300 posting TPS, a materialized balance (updated atomically with each ledger posting) avoids the need to sum potentially millions of ledger entries per account. The balance field is a cache of the ledger's computed state.

4. **Audit trail is the largest data producer**: At 1 TB/day, audit records grow faster than the ledger itself because every read of sensitive data (not just writes) must be logged. Tiered storage with immutable append-only writes to a separate audit store is critical.

5. **Storage is dominated by long-term retention**: With 137 TB/year in ledger data and 365 TB/year in audit data, the 10-year retention requirement produces petabyte-scale storage. Columnar compression, tiered storage policies, and periodic archival to immutable object storage are necessary.

6. **Cross-shard transactions are unavoidable**: With accounts distributed across shards, a transfer between accounts on different shards requires distributed coordination. At an estimated 30% of transactions being cross-shard, the saga orchestrator processes ~14,000 cross-shard TPS at peak---a major architectural component.
