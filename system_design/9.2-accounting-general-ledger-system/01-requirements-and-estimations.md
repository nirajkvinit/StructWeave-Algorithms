# Requirements & Estimations

## Functional Requirements

### Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Double-Entry Journal Posting** | Create journal entries with balanced debits and credits; support manual entries, automated entries triggered by sub-ledger events, recurring entries on configurable schedules (daily, monthly, quarterly), accrual entries, and adjusting entries; enforce the fundamental invariant that total debits equal total credits for every posted entry |
| F2 | **Chart of Accounts Management** | Maintain a hierarchical Chart of Accounts (COA) with five primary account types (Asset, Liability, Equity, Revenue, Expense); support multi-segment account structures (company-division-department-natural account) with configurable segment lengths; enable account activation/deactivation with balance validation; enforce referential integrity preventing deletion of accounts with posted balances |
| F3 | **General Ledger Posting Engine** | Post approved journal entries to the GL with period validation (reject entries to closed periods); update running account balances in real time; maintain period-end balances for each account; generate real-time trial balance across all accounts; support both batch posting (month-end bulk) and real-time posting (continuous) modes |
| F4 | **Sub-Ledger Management** | Maintain Accounts Payable (AP), Accounts Receivable (AR), Fixed Assets, and Inventory sub-ledgers as detailed transaction stores; automatically generate summarized GL journal entries from sub-ledger postings; enforce sub-ledger-to-GL reconciliation by maintaining control account balances that must match sub-ledger totals |
| F5 | **Bank Reconciliation** | Ingest bank statement feeds (file-based and API-based); auto-match bank transactions against GL entries using rule-based matching (exact amount + date), fuzzy matching (amount tolerance + date range + payee similarity), and ML-powered matching for complex patterns; track matched, unmatched, and partially matched items; generate reconciliation reports with outstanding items |
| F6 | **Multi-Currency Accounting** | Record transactions in source (transaction) currency; maintain functional currency balances per entity and reporting currency for consolidated views; manage exchange rate tables with temporal validity; execute periodic unrealized gain/loss revaluation for monetary accounts (AP, AR, bank); post realized gain/loss entries on settlement; support triangulation through base currency for exotic pairs |
| F7 | **Revenue Recognition Engine** | Implement the five-step model per ASC 606 / IFRS 15: identify contracts, identify performance obligations, determine transaction price, allocate price to obligations using standalone selling price, and recognize revenue as obligations are satisfied; support point-in-time and over-time recognition with output and input methods; maintain revenue schedules with waterfall tracking |
| F8 | **Financial Reporting** | Generate Balance Sheet (statement of financial position), Income Statement (P&L), Cash Flow Statement (direct and indirect methods), and Trial Balance; support drill-down from report line items to account balances to individual journal entries to source documents; enable configurable report trees mapping GL accounts to reporting line items; support comparative period reporting and consolidation elimination |
| F9 | **Period Management** | Manage accounting periods with open, soft-close, and hard-close states; soft close allows posting only by authorized roles (Controllers) for preliminary review and adjustments; hard close freezes the period with a posting lockout enforced at the database constraint level; support year-end close procedures that zero out temporary accounts (Revenue, Expense) and post net income to Retained Earnings; maintain period calendars supporting fiscal years misaligned with calendar years (e.g., 4-4-5, 5-4-4 week patterns) |
| F10 | **Intercompany Transactions** | Record transactions between legal entities within a corporate group with due-to/due-from tracking; auto-generate matching entries on both sides of the intercompany transaction; generate elimination entries for consolidated financial reporting; maintain intercompany reconciliation with aging of unmatched items; support multi-currency intercompany settlements |
| F11 | **Audit Trail** | Maintain an immutable, append-only audit log for every ledger modification; each audit record contains actor, timestamp, action, entity, and before/after values; implement cryptographic hash chaining where each record includes a hash of the previous record, creating a tamper-evident chain; no journal entry can be deleted---corrections require reversing entries; support regulatory audit queries with full traceability from financial statement line items to source transactions |
| F12 | **Budgeting and Variance Analysis** | Define budgets per account, cost center, and period at multiple granularities (monthly, quarterly, annual); support budget versions (original, revised, forecast); track actuals vs. budget with variance reporting showing absolute and percentage deviations; enable budget lock after approval to prevent unauthorized changes; support top-down allocation and bottom-up roll-up budget methodologies |

### Supporting Features

| # | Feature | Description |
|---|---------|-------------|
| S1 | **Approval Workflows** | Configurable multi-level approval chains for journal entries based on amount thresholds, account type, and posting source; support sequential and parallel approval with delegation and escalation; enforce segregation of duties (preparer cannot be approver) |
| S2 | **Tax Integration** | Calculate and post tax liabilities (sales tax, VAT, GST, withholding tax) based on transaction attributes and jurisdiction rules; maintain tax code master with rate history; generate tax returns data and reconciliation reports |
| S3 | **Document Attachment** | Attach source documents (invoices, contracts, receipts, bank statements) to journal entries and sub-ledger transactions; store with tamper-proof hashes; support retention policies aligned with regulatory requirements (7--10 years) |
| S4 | **Currency Rate Feeds** | Ingest exchange rates from central banks, treasury systems, and market data providers; support scheduled and on-demand rate imports; maintain rate type variants (spot, average, closing, budget) with effective date ranges |
| S5 | **Custom Dimensions** | Define additional analytical dimensions beyond the COA segments (project, product line, region, channel, customer group); tag journal entry line items with dimension values for multi-dimensional reporting and analysis without proliferating the COA |
| S6 | **Regulatory Reporting** | Generate statutory reports compliant with local GAAP requirements across jurisdictions; support XBRL tagging for electronic filing; maintain mapping tables between internal COA and regulatory taxonomies; produce reports for multiple standards (IFRS, US GAAP, local GAAP) from a single ledger |

### User Roles

| Role | Capabilities |
|------|-------------|
| **Accountant** | Create and submit journal entries, perform bank reconciliation matching, run sub-ledger reports, attach supporting documents, execute routine posting operations |
| **Controller** | Approve journal entries, perform soft-close and hard-close operations, review trial balance and variance reports, override policy exceptions with documented justification, manage period calendars |
| **CFO** | View consolidated financial statements, approve year-end close, review intercompany eliminations, access executive dashboards with KPI drill-down, approve budget versions |
| **Auditor** | Read-only access to all ledger data, journal entries, audit trail, and source documents; execute audit queries and sampling; verify hash chain integrity; generate audit confirmation letters |
| **AP/AR Clerk** | Create and manage sub-ledger transactions (invoices, payments, credit memos); initiate sub-ledger-to-GL posting; perform customer/vendor account reconciliation |
| **System Administrator** | Configure COA structure, manage user roles and permissions, define approval workflows, maintain integration endpoints, manage system parameters and posting rules |

### Out of Scope

| Exclusion | Rationale |
|-----------|-----------|
| Accounts Payable invoice processing workflow | AP invoice capture, 3-way matching, and payment execution are handled by a dedicated AP automation system; we consume posted AP sub-ledger entries |
| Payroll calculation and processing | Payroll computations, tax withholding, and disbursement are managed by the payroll engine; we receive summarized payroll journal entries for GL posting |
| Procurement and purchase order management | Purchase requisitions, vendor selection, and PO lifecycle are procurement system responsibilities; we record the financial impact after goods receipt/invoice |
| Tax return filing and submission | We generate tax data and reports; actual filing with tax authorities is handled by specialized tax compliance platforms |
| Treasury management and cash forecasting | Cash position management, investment decisions, and borrowing are treasury functions; we record the resulting transactions in the GL |
| Full ERP modules (HR, supply chain, CRM) | The GL system is a financial backbone; operational modules interact via well-defined journal entry interfaces |

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Journal Posting Latency** | p50 < 100ms, p99 < 200ms | Real-time posting enables continuous close and instant trial balance accuracy; sub-ledger integrations depend on synchronous posting confirmation |
| **Trial Balance Generation** | p50 < 1s, p99 < 2s for 50K accounts | Controllers check trial balance frequently during close; delays block the close timeline and cascade into reporting delays |
| **Financial Report Generation** | p50 < 5s, p99 < 15s | Complex reports (consolidated P&L with eliminations) require multi-entity aggregation but must remain interactive for close-cycle decision making |
| **Reconciliation Batch Throughput** | 1M transactions/hour | Month-end bank reconciliation involves matching large transaction volumes; throughput below this threshold extends the close calendar by days |
| **Posting Engine Availability** | 99.99% (52.6 min downtime/year) | Posting downtime blocks all financial transaction recording across the enterprise; sub-ledger systems queue up, causing cascading delays |
| **Reporting Availability** | 99.9% (8.76 hours downtime/year) | Reporting is critical but can tolerate brief maintenance windows during non-close periods |
| **Data Durability** | Zero data loss (RPO = 0) | Financial transactions are legal records; loss of a single posted journal entry can cause regulatory violations and audit failures |
| **Recovery Time Objective** | RTO < 15 minutes | Extended GL downtime halts all financial operations across the enterprise; fast recovery is essential during close periods |
| **Scalability - Journal Entries** | 100M+ entries/year | Large enterprises with multiple subsidiaries, high-frequency sub-ledger activity, and automated entries generate this volume |
| **Scalability - Chart of Accounts** | 500K accounts across all entities | Multi-entity enterprises with segment-based COA structures and per-entity accounts reach this scale |
| **CAP Trade-off** | CP (Consistency + Partition tolerance) | Financial data demands strict consistency---a trial balance that temporarily shows an imbalanced ledger is unacceptable; availability is managed through redundancy rather than relaxed consistency |
| **Concurrent Users During Close** | 500+ concurrent users | Month-end close involves accountants, controllers, and auditors across all entities working simultaneously on journals, reconciliation, and reporting |
| **Audit Trail Immutability** | Append-only with cryptographic hash chain | Regulatory requirement for SOX, IFRS, and local GAAP compliance; any evidence of log tampering invalidates the audit opinion |

---

## Capacity Estimations

### Traffic

```
Enterprise profile:
  Legal entities:                   50 (multi-entity group)
  Accounts in COA:                  500,000 (across all entities, segments)
  Active users:                     2,000 (accountants, controllers, clerks)
  Concurrent users (normal):        200
  Concurrent users (month-end):     500+

Journal entries per day:
  Sub-ledger auto-posted:           40,000 (AP, AR, inventory, fixed assets)
  Manual entries:                   5,000 (adjustments, accruals, reclasses)
  Automated/recurring:              3,000 (depreciation, amortization, allocations)
  Intercompany:                     2,000 (cross-entity transactions)
  Total journal entries/day:        50,000
  Average line items per entry:     4 (debit + credit pairs, some multi-leg)
  Total line items/day:             200,000

Journal posting TPS:
  Average:                          50K / 86,400 ≈ 0.6 TPS
  Business-hours concentrated:      50K / 36,000 (10-hour window) ≈ 1.4 TPS
  Month-end peak (5x):             1.4 × 5 = 7 TPS
  Year-end peak (10x):             1.4 × 10 = 14 TPS

Trial balance queries per day:
  Normal:                           500 (routine checks)
  Month-end close:                  5,000 (continuous verification)
  Trial balance QPS (peak):         5,000 / 36,000 ≈ 0.14 QPS (bursty)

Financial report executions per day:
  Normal:                           100
  Month-end close:                  500 concurrent report runs
  Report QPS (peak):                ~5 QPS (concurrent batch)

Sub-ledger posting volume:
  AP transactions/day:              15,000 (invoices, payments, credit memos)
  AR transactions/day:              20,000 (invoices, receipts, adjustments)
  Fixed asset transactions/day:     2,000 (depreciation, disposals, transfers)
  Inventory transactions/day:       10,000 (receipts, issues, adjustments)
  Total sub-ledger transactions:    47,000/day

Bank reconciliation volume:
  Bank statement lines/day:         30,000
  Month-end reconciliation batch:   1,000,000 transactions (full-month matching)
  Reconciliation matching TPS:      1M / 3,600 ≈ 278 TPS (1-hour batch window)

Approval workflow actions/day:
  Journal approvals:                8,000 (manual entries requiring approval)
  Exception approvals:              500 (policy overrides, tolerance breaches)
  Approval TPS (average):          8,500 / 36,000 ≈ 0.24 TPS
```

### Storage

```
--- Journal Entry Storage ---
Journal header:                     ~500 bytes (entry ID, date, period, source,
                                    description, status, created_by, approved_by,
                                    currency, entity, hash)
Journal line item:                  ~300 bytes (account, debit/credit amount,
                                    functional amount, description, dimensions,
                                    tax code, intercompany flag)
Average entry size:                 500 + (4 × 300) = ~2 KB per entry
Daily growth:                       50K × 2 KB = 100 MB/day
Annual growth:                      100M entries × 2 KB = ~200 GB/year
5-year retention:                   ~1 TB

--- Account Balance Storage ---
Balance record per account/period:  ~200 bytes (account, period, entity,
                                    currency, opening, debits, credits,
                                    closing, budget, YTD)
Periods per year:                   12 monthly + 1 year-end adjustment = 13
Annual balance records:             500K accounts × 13 periods = 6.5M records
Annual balance storage:             6.5M × 200 B = ~1.3 GB/year
Real-time balance cache:            500K × 200 B = ~100 MB (in-memory)

--- Sub-Ledger Storage ---
AP/AR transaction record:           ~1 KB (vendor/customer, invoice reference,
                                    amounts, currency, due date, payment terms,
                                    aging bucket, matching status)
Fixed asset record:                 ~2 KB (asset details, cost, depreciation
                                    method, useful life, accumulated depreciation,
                                    location, custodian)
Daily sub-ledger growth:            47K × 1 KB ≈ 47 MB/day
Annual sub-ledger growth:           ~17 GB/year

--- Audit Trail Storage ---
Audit event record:                 ~500 bytes (event ID, timestamp, actor,
                                    action, entity type, entity ID, before hash,
                                    after hash, previous event hash, IP address,
                                    session ID, change details)
Events per journal lifecycle:       ~8 (create, validate, submit, approve,
                                    post, balance update, period check, GL sync)
Daily audit events:                 50K entries × 8 = 400K events
Daily audit growth:                 400K × 500 B = 200 MB/day
Annual audit growth:                ~73 GB/year
Sub-ledger audit events:            47K × 5 events × 500 B = ~118 MB/day
Total annual audit:                 ~115 GB/year
7-year audit retention:             ~800 GB

--- Bank Reconciliation Storage ---
Bank statement line:                ~400 bytes (date, amount, reference,
                                    description, bank code, match status)
Daily growth:                       30K × 400 B = 12 MB/day
Monthly reconciliation snapshots:   1M × 400 B = ~400 MB/month
Annual reconciliation storage:      ~5 GB/year

--- Exchange Rate Storage ---
Rate record:                        ~150 bytes (currency pair, rate type,
                                    effective date, rate, source, inverse rate)
Active currency pairs:              200 pairs × 4 rate types = 800 records
Daily rate snapshots:               800 × 4 updates/day = 3,200 records/day
Annual rate history:                3,200 × 365 × 150 B ≈ 175 MB/year
Hot cache (current rates):          800 × 150 B = 120 KB (in-memory)

--- Document Attachments ---
Average attachment size:            500 KB (invoices, contracts, receipts)
Attachments per day:                10,000
Daily attachment growth:            10K × 500 KB = 5 GB/day
Annual attachment growth:           ~1.8 TB/year
7-year retention:                   ~12.6 TB

--- Revenue Recognition Schedules ---
Active contracts:                   50,000
Schedule line items per contract:   ~24 (monthly recognition over 2-year avg)
Schedule record size:               ~200 bytes
Total rev rec storage:              50K × 24 × 200 B ≈ 240 MB
Annual growth:                      ~100 MB/year

--- Budget Storage ---
Budget records:                     500K accounts × 13 periods × 3 versions
                                    = ~19.5M records
Budget record size:                 ~150 bytes
Total budget storage:               19.5M × 150 B ≈ 3 GB

--- Summary ---
Hot storage (current period):       ~50 GB (current month journals, balances,
                                    active reconciliation, working reports)
Warm storage (current fiscal year): ~300 GB (YTD journals, sub-ledger, audit)
Cold storage (historical, 7-year):  ~15 TB (dominated by document attachments)
Grand total (7-year horizon):       ~16 TB
```

### Bandwidth

```
--- Journal Posting ---
Journal entry payload:              ~2 KB per entry
Posting API bandwidth (average):    1.4 TPS × 2 KB = 2.8 KB/s
Posting API bandwidth (peak):       14 TPS × 2 KB = 28 KB/s

--- Trial Balance ---
Trial balance response (50K accts): 50K × 100 B = ~5 MB per response
Peak trial balance bandwidth:       0.14 QPS × 5 MB = 700 KB/s

--- Financial Report Rendering ---
Report response payload:            ~2 MB (multi-page report with drill-down
                                    metadata, comparative columns)
Peak report bandwidth:              5 QPS × 2 MB = 10 MB/s

--- Sub-Ledger Sync ---
Sub-ledger batch payload:           47K × 1 KB = ~47 MB/day
Real-time sub-ledger events:        ~0.5 TPS × 1 KB = 500 B/s

--- Bank Statement Ingestion ---
Daily statement files:              30K lines × 400 B = ~12 MB/day
Month-end reconciliation batch:     1M × 400 B = ~400 MB (single batch)
Reconciliation burst bandwidth:     400 MB / 3,600s ≈ 111 KB/s

--- Document Upload ---
Attachment upload bandwidth:
  Average:                          5 GB / 86,400s ≈ 58 KB/s
  Peak (month-end):                 58 × 5 = 290 KB/s

--- Replication & Backup ---
Synchronous replication bandwidth:  ~1 MB/s (WAL streaming for RPO=0)
Daily backup transfer:              ~1 GB (incremental)

--- Inter-Service Communication ---
Internal API calls (avg):           ~50 RPS across all services
Internal bandwidth:                 50 × 2 KB = 100 KB/s
Peak internal bandwidth:            100 KB/s × 10 = 1 MB/s
```

---

## SLO / SLA Table

| Service | Metric | SLO | SLA | Measurement |
|---------|--------|-----|-----|-------------|
| Journal Posting | Latency p50 | < 100ms | < 200ms | API request to committed-and-balanced confirmation |
| Journal Posting | Latency p99 | < 200ms | < 500ms | Including multi-leg entries with 20+ line items |
| Journal Posting | Availability | 99.99% | 99.95% | Create, validate, and post endpoints |
| Trial Balance | Generation p50 | < 1s | < 2s | Query to complete trial balance for 50K accounts |
| Trial Balance | Generation p99 | < 2s | < 5s | Including filtered and dimensional drill-downs |
| Financial Reporting | Generation p50 | < 5s | < 10s | Report request to rendered output for single-entity reports |
| Financial Reporting | Generation p99 | < 15s | < 30s | Multi-entity consolidated reports with elimination entries |
| Reporting Service | Availability | 99.9% | 99.5% | Report generation and drill-down endpoints |
| Bank Reconciliation | Batch throughput | 1M txns/hour | 500K txns/hour | Full-month reconciliation matching run |
| Bank Reconciliation | Auto-match rate | > 90% | > 85% | Transactions matched without manual intervention |
| Sub-Ledger Posting | GL sync latency | < 30s | < 2 min | Sub-ledger commit to GL journal entry posted |
| Sub-Ledger Posting | Accuracy | 100% | 100% | Control account balance equals sub-ledger total |
| Period Close | Soft close duration | < 10 min | < 30 min | Initiation to all preliminary validations complete |
| Period Close | Hard close duration | < 5 min | < 15 min | Soft close to period frozen with posting lockout active |
| Multi-Currency | Revaluation batch | < 30 min | < 1 hour | Full revaluation of all monetary accounts across entities |
| Multi-Currency | Rate freshness | < 15 min | < 1 hour | Market rate publication to rate available in system |
| Revenue Recognition | Schedule execution | < 10 min | < 30 min | Monthly recognition batch for 50K active contracts |
| Audit Trail | Completeness | 100% | 100% | Every ledger mutation recorded with actor, timestamp, and hash |
| Audit Trail | Hash chain integrity | 100% | 100% | Periodic verification detects zero chain breaks |
| Data Durability | RPO | 0 (zero data loss) | < 1 min | Synchronous replication ensures no committed transaction is lost |
| Data Durability | RTO | < 15 min | < 30 min | Failover to standby with full transactional consistency |
| Intercompany | Matching accuracy | 100% | 100% | Both sides of intercompany entry balance; zero orphaned entries |
| Budget Variance | Report freshness | < 5 min | < 15 min | Actuals posted to variance report reflecting the new balance |
| Month-End Burst | Capacity | 5x normal throughput | 3x normal | System handles close-period surge without degradation |
| Year-End Burst | Capacity | 10x normal throughput | 7x normal | Year-end close with all entities closing simultaneously |

---

## Key Estimation Insights

1. **Month-end and year-end close windows define peak capacity requirements**: Unlike transactional systems with daily or hourly peaks, the GL system experiences its most intense workload during the 3--5 day close window when journal volume spikes 5--10x, trial balance queries spike 10x, and 500+ concurrent users are running reports simultaneously. The system must be provisioned for this burst while remaining cost-efficient during the remaining 25 days of the month. Auto-scaling alone is insufficient because database connections and in-memory balance caches cannot scale elastically---pre-warmed capacity pools are essential.

2. **The fundamental invariant---debits equal credits---must be enforced at every layer**: This is not just an application-level validation. Every journal entry must be atomically posted such that no partial entry (debits without matching credits) is ever visible to any reader. This requires serializable transaction isolation for posting and means the system cannot rely on eventual consistency models. The CAP trade-off firmly favors CP, and the architecture must achieve availability through active-passive replication rather than relaxed consistency.

3. **Audit trail storage grows proportionally to transactional volume but has stricter retention**: At ~115 GB/year with 7-year immutable retention, the audit trail accumulates ~800 GB that can never be compacted, updated, or deleted. Unlike transactional data where old records can be archived and summarized, every individual audit event must remain queryable for regulatory audits. This demands an append-only storage architecture (log-structured or event store) with efficient range-query indexing by entity, actor, and time.

4. **Document attachments dominate long-term storage costs despite low query frequency**: At ~1.8 TB/year with 7-year retention, attachments account for ~80% of the total storage footprint (~12.6 TB). These documents are written once and read rarely (only during audits or dispute resolution), making them ideal candidates for tiered object storage with lifecycle policies. However, they must be retrievable within minutes when auditors request them, ruling out glacier-class cold storage for recent fiscal years.

5. **Sub-ledger-to-GL reconciliation is a continuous correctness constraint, not a batch job**: The system maintains control accounts where the GL balance for each sub-ledger must exactly match the sum of detailed sub-ledger transactions at all times. With 47K sub-ledger transactions per day generating summarized GL entries, any desynchronization (due to failed posts, network partitions, or race conditions) creates a reconciliation break that blocks the close. This demands either synchronous two-phase posting or an eventually-consistent model with continuous reconciliation monitoring and automated remediation.

6. **Multi-currency revaluation is computationally intensive but infrequent**: Revaluing all monetary accounts across 50 entities with 200 currency pairs requires recalculating unrealized gain/loss for potentially hundreds of thousands of open balances. This runs monthly (or more frequently for volatile currencies) and generates thousands of journal entries. The revaluation engine must process this within a 30-minute window while the posting engine continues normal operations---requiring careful isolation to prevent revaluation entries from interfering with concurrent manual postings.
