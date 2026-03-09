# Requirements & Estimations

## Functional Requirements

### Core Features

| # | Feature | Description |
|---|---------|-------------|
| F1 | **Receipt Capture & OCR** | Capture receipts via camera, email forwarding, or PDF upload; extract merchant name, date, amount, currency, tax, and line items using OCR and ML models; support 30+ languages |
| F2 | **Expense Creation & Auto-Categorization** | Create expense entries from receipts, card transactions, or manual input; auto-categorize (meals, travel, supplies, etc.) using ML; auto-populate GL codes, cost centers, and project codes |
| F3 | **Corporate Card Transaction Feed** | Ingest real-time and batch transaction feeds from card networks and issuing banks; auto-match transactions to submitted receipts using amount, date, and merchant fuzzy matching |
| F4 | **Policy Engine** | Configurable rules engine evaluating expenses against company policies in real-time; support per-diem limits, category caps, receipt-required thresholds, pre-approval rules, and geography-specific regulations |
| F5 | **Multi-Level Approval Workflows** | Support sequential, parallel, threshold-based, and delegation-based approval chains; auto-route based on amount, category, department, and cost center; handle manager absence with delegation and escalation |
| F6 | **Mileage Tracking & Per Diem** | GPS-based mileage tracking with configurable reimbursement rates per jurisdiction; automatic per-diem calculations based on travel destination, duration, and government-published rates |
| F7 | **Multi-Currency Support** | Capture expenses in any currency; apply configurable FX rate sources (corporate treasury rate, daily ECB rate, card network rate); handle conversion at submission, approval, or reimbursement time |
| F8 | **Reimbursement Processing** | Calculate net reimbursable amounts after policy adjustments; support direct deposit (ACH/SEPA/wire), payroll integration, and prepaid card top-up; handle split payments across cost centers |
| F9 | **Expense Report Generation** | Bundle individual expenses into reports with configurable grouping (by trip, project, period); enforce completeness checks before submission; support draft, submitted, approved, and paid states |
| F10 | **ERP & Accounting Integration** | Post approved expenses to general ledger with correct GL account mapping; sync with ERP systems via real-time APIs or batch file exports; support two-way reconciliation |
| F11 | **Duplicate & Anomaly Detection** | ML-powered detection of duplicate submissions (same receipt across employees, resubmitted expenses); flag anomalies such as weekend expenses, round-number patterns, split-to-avoid-threshold, and out-of-pattern spending |
| F12 | **Tax Compliance & Audit Trail** | Store original receipts with tamper-proof hashes for regulatory retention (7+ years); compute tax reclaim eligibility (VAT/GST); generate audit-ready reports with full change history |
| F13 | **Delegation & Proxy Submission** | Allow executive assistants or delegates to submit expenses on behalf of another employee; maintain clear attribution and audit trail for the delegated action |
| F14 | **Analytics & Spend Visibility** | Real-time dashboards for finance teams showing spend by category, department, project, and vendor; trend analysis, budget vs. actuals, and policy violation rates |

### User Roles

| Role | Capabilities |
|------|-------------|
| **Employee (Submitter)** | Capture receipts, create expenses, build reports, track reimbursement status, view personal spend history |
| **Manager (Approver)** | Approve/reject/return expense reports, view team spend, delegate approval authority, set team-level policies |
| **Finance Controller** | Configure policies, review flagged expenses, process reimbursements, manage GL mappings, run audit reports |
| **Auditor** | Read-only access to all expenses, receipts, approval chains, and change logs; generate compliance reports |
| **Company Admin** | Manage organizational hierarchy, card programs, integration settings, user provisioning, and global policies |
| **Delegate** | Submit and manage expenses on behalf of assigned employees with full attribution |

### Out of Scope

| Exclusion | Rationale |
|-----------|-----------|
| Travel booking (flights, hotels, car rentals) | Separate travel management system; integrate via booking-to-expense sync |
| Corporate card issuance & lifecycle | Handled by card issuing platform; we consume transaction feeds only |
| Payroll processing | Reimbursement amounts are exported to payroll; actual payroll run is external |
| Full general ledger & accounting | We post journal entries to the ERP/GL system; we do not maintain a ledger of record |
| Procurement & purchase orders | Pre-purchase workflows belong to procurement systems; we handle post-purchase expense capture |
| Invoice processing (AP) | Accounts payable for vendor invoices is a distinct workflow from employee expense reimbursement |

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **OCR Processing Latency** | p50 < 10s, p99 < 30s | Users expect near-instant feedback after capturing a receipt; longer delays cause re-uploads |
| **Policy Check Latency** | p50 < 200ms, p99 < 500ms | Policy violations must surface in real-time as the user fills in expense fields |
| **Approval Notification Latency** | p99 < 5s | Managers should receive push/email notifications within seconds of submission |
| **System Availability** | 99.95% | Expense submission is not second-critical but month-end close windows are time-sensitive |
| **Receipt Storage Durability** | 99.999999999% (11 nines) | Receipts are legal documents required for tax audits; loss is non-recoverable |
| **Audit Trail Immutability** | Append-only, tamper-proof | Regulatory requirement; every state change must be recorded with actor, timestamp, and before/after values |
| **Data Retention** | 7+ years | Tax authorities in most jurisdictions require 7-year receipt and expense record retention |
| **CAP Trade-off** | AP (Availability + Partition tolerance) with strong consistency for financial writes | Expense amounts and reimbursement records require linearizable writes; read replicas can serve dashboards with bounded staleness |
| **Card Transaction Matching Accuracy** | > 95% auto-match rate | Reducing manual matching drives adoption; false matches are correctable by the user |
| **Concurrent Report Submissions** | Handle month-end spikes (10x normal) | 80% of expense reports are submitted in the last 3 days of a reporting period |

---

## Capacity Estimations

### Traffic

```
Companies on platform:          50,000
Total employees:                5,000,000 (5M)
Monthly active employees:       3,000,000 (3M, ~60% submit at least one expense/month)
Daily active employees:         500,000 (500K)

Expense submissions per day:    500,000 (500K)
  Manual entry:                 100K (20%)
  Receipt-based (OCR):         250K (50%)
  Card-matched (auto-created): 150K (30%)

Expense reports submitted/day:  50,000 (avg 10 expenses per report)
  Normal days:                  20K reports/day
  Month-end peak (last 3 days): 150K reports/day (7.5x normal)

Average expense submissions/sec:  500K / 86,400 ≈ 6 TPS
Peak expense submissions/sec:     6 × 10 = 60 TPS (month-end)

Approval actions per day:       80,000 (50K reports + re-reviews + partial approvals)
Approval TPS (average):         80K / 86,400 ≈ 1 TPS
Approval TPS (peak):            ~10 TPS

Policy evaluations per day:     1,500,000 (1.5M)
  (Each expense triggers ~3 policy checks: on field entry, on save, on submit)
Policy evaluation TPS:
  Average:                      1.5M / 86,400 ≈ 17 TPS
  Peak:                         17 × 10 = 170 TPS

Reimbursement batches per day:  2 (morning and evening processing windows)
Reimbursements per batch:       25K employees avg, 100K at month-end
Notifications sent per day:     500K (submission confirmations, approval requests,
                                 policy warnings, reimbursement confirmations)
```

### Receipt & OCR Volume

```
Receipt images uploaded/day:    2,000,000 (2M)
  Camera captures:              1.2M (60%)
  Email-forwarded:              500K (25%)
  PDF uploads:                  300K (15%)

Average receipt image size:     1.5 MB (after client-side compression)
Daily receipt upload volume:    2M × 1.5 MB = 3 TB/day
Monthly receipt storage growth: ~90 TB/month (before deduplication)
After dedup & compression:      ~2 TB/month stored

OCR processing requests/sec:
  Average:                      2M / 86,400 ≈ 23 TPS
  Peak (morning batch):         23 × 5 = 115 TPS
OCR processing time budget:     p50 < 10s, p99 < 30s
```

### Corporate Card Transactions

```
Card transactions ingested/hour:  50,000 (50K)
Daily card transactions:          1,200,000 (1.2M)

Transaction feed sources:
  Real-time push (webhook):       60% of transactions (~720K/day)
  Batch file (daily/hourly):      40% of transactions (~480K/day)

Auto-match rate:                  95%+ (matched to receipt or expense)
Unmatched (require user action):  ~60K transactions/day
Orphan receipts (no card txn):    ~50K/day (cash, personal card, pre-card-link)

Card transaction TPS:
  Average:                        1.2M / 86,400 ≈ 14 TPS
  Peak (batch file ingestion):    ~500 TPS (5-minute burst windows)
```

### Multi-Currency & FX

```
Currencies actively used:         120+
Expenses in non-base currency:    ~30% of all expenses (150K/day)
FX rate sources polled:           5 (ECB, central banks, card networks, treasury, market)
FX rate refresh frequency:        Every 15 minutes for major pairs, daily for exotic pairs
FX rate lookups per day:          ~500K (at submission, approval, and reimbursement)

Per-diem rate tables:
  Jurisdictions tracked:          200+ countries, 500+ cities
  Rate update frequency:          Quarterly (government-published rates)
  Rate lookup TPS:                ~2 TPS average, ~20 TPS peak
```

### Storage

```
--- Receipt & Document Storage ---
Original receipt images:         1.5 MB avg × 2M/day = 3 TB/day raw
Compressed & deduplicated:       ~2 TB/month stored
7-year retention:                2 TB × 12 × 7 = ~168 TB total
Thumbnail generation:            200 KB per receipt = ~400 GB/month

--- Expense Metadata ---
Expense record size:             ~2 KB (amount, category, date, merchant, GL code,
                                 policy result, currency, tax fields, custom fields)
Daily growth:                    500K × 2 KB = 1 GB/day
Annual metadata growth:          ~365 GB/year
7-year total:                    ~2.5 TB

--- Expense Reports ---
Report record size:              ~5 KB (header, line item references, approval chain,
                                 status history, submission metadata)
Daily growth:                    50K × 5 KB = 250 MB/day
Annual growth:                   ~90 GB/year

--- Card Transaction Records ---
Transaction record size:         ~1 KB (amount, merchant, MCC, date, card last-4,
                                 match status, settlement reference)
Daily growth:                    1.2M × 1 KB = 1.2 GB/day
Annual growth:                   ~440 GB/year

--- Audit Trail ---
Audit event size:                ~500 bytes (actor, action, timestamp, entity,
                                 before/after snapshot hash)
Events per expense lifecycle:    ~15 (create, edit, submit, policy check, approve,
                                 reimburse, GL post, etc.)
Daily audit events:              500K × 15 = 7.5M events
Daily audit growth:              7.5M × 500 B = 3.75 GB/day
Annual audit growth:             ~1.4 TB/year
7-year audit total:              ~10 TB

--- Policy Configuration ---
Policy rules per company:        ~200 rules avg
Total policy storage:            50K × 200 × 2 KB = 20 GB (fits in memory/cache)

--- FX Rate Cache ---
Currency pairs tracked:          ~500 active pairs
Rate record size:                ~200 bytes (pair, bid, ask, mid, source, timestamp)
Rate history (1 year):           500 × 96 updates/day × 365 × 200 B ≈ 3.5 GB
Hot cache (current rates):       500 × 200 B = 100 KB (entirely in memory)

--- ML Model Artifacts ---
OCR models:                      ~2 GB (multiple language packs)
Categorization model:            ~500 MB
Anomaly detection model:         ~300 MB
Total ML storage:                ~3 GB (replicated to inference nodes)

--- Summary ---
Total hot storage (< 90 days):   ~30 TB (receipts + metadata + audit)
Total warm storage (90d-1yr):    ~25 TB
Total cold storage (1yr-7yr):    ~160 TB
Grand total (7-year horizon):    ~215 TB
```

### Bandwidth

```
Receipt upload bandwidth:
  Average:                       3 TB / 86,400s ≈ 35 MB/s
  Peak (morning hours):          35 × 5 = 175 MB/s

API request/response:
  Expense creation payload:      ~3 KB (fields + encoded receipt reference)
  Policy check response:         ~1 KB (pass/fail + violation details)
  Report submission payload:     ~10 KB (report header + expense IDs)

API bandwidth (peak):            60 TPS × 10 KB = 600 KB/s (negligible)

Card transaction feed:
  Batch file size:               1.2M × 1 KB = 1.2 GB/day
  Real-time webhook payload:     ~500 bytes × 14 TPS = 7 KB/s

ERP sync bandwidth:
  GL posting batch:              50K reports × 5 KB = 250 MB/day
  Reconciliation exports:        ~500 MB/day
```

---

## SLO / SLA Table

| Service | Metric | SLO | SLA | Measurement |
|---------|--------|-----|-----|-------------|
| Receipt OCR | Latency p50 | < 10s | < 20s | Upload to extracted-fields-available |
| Receipt OCR | Latency p99 | < 30s | < 60s | Including multi-page PDFs and low-quality images |
| Policy Engine | Latency p50 | < 200ms | < 400ms | Expense field change to violation response |
| Policy Engine | Latency p99 | < 500ms | < 1s | Including complex multi-rule evaluation chains |
| Expense Submission | Availability | 99.95% | 99.9% | Create, edit, and submit endpoints |
| Approval Notification | Delivery latency | < 5s | < 15s | Report submission to manager notification arrival |
| Card Transaction Ingestion | Freshness | < 5 min (real-time) | < 15 min | Transaction occurrence to platform visibility |
| Card Transaction Matching | Accuracy | > 95% | > 90% | Auto-matched without user correction |
| Receipt Storage | Durability | 99.999999999% | 99.9999999% | Original receipt available for audit at any point in 7-year window |
| Reimbursement Processing | Timeliness | T+2 business days | T+5 business days | Approval to funds deposited in employee account |
| ERP/GL Posting | Accuracy | 100% | 100% | Posted amounts and GL codes match approved report |
| ERP/GL Posting | Timeliness | < 4 hours | < 24 hours | Approval to journal entry posted in ERP |
| Duplicate Detection | Precision | > 98% | > 95% | Flagged duplicates that are actual duplicates (minimize false positives) |
| Duplicate Detection | Recall | > 90% | > 85% | Actual duplicates that are successfully flagged |
| Audit Trail | Completeness | 100% | 100% | Every state mutation recorded with actor and timestamp |
| Analytics Dashboard | Freshness | < 15 min | < 1 hour | Expense data reflected in spend dashboards |
| Month-End Burst | Capacity | 10x normal throughput | 7.5x normal | System handles last-3-day submission surge without degradation |

---

## Key Estimation Insights

1. **Month-end surge is the defining capacity challenge**: Unlike payment systems with daily peaks, expense management has a dramatic monthly cycle---80% of reports arrive in the last 3 days of the reporting period. The system must handle 7.5--10x normal load during these windows without queueing delays, as late submissions cascade into delayed reimbursements and missed accounting close deadlines.

2. **Receipt storage dominates the cost model**: At ~2 TB/month after compression with 7-year mandatory retention, receipt images account for >90% of total storage costs (~168 TB over retention horizon). Tiered storage with hot/warm/cold lifecycle policies is essential---receipts older than 90 days are rarely accessed but must remain retrievable within minutes for audit requests.

3. **OCR is compute-intensive but latency-tolerant relative to policy checks**: OCR processing at 23 average TPS with a 30s p99 budget allows asynchronous GPU-backed processing with queue-based load leveling. In contrast, policy checks at 500ms p99 must be synchronous and in-memory, making the policy engine a fundamentally different scaling challenge despite lower computational cost per request.

4. **Card transaction matching is a high-value automation lever**: With 1.2M card transactions daily and a 95%+ auto-match target, every percentage point improvement in match accuracy eliminates ~12K manual reconciliation actions per day. The matching algorithm must handle fuzzy merchant names, settlement-vs-authorization amount differences, and multi-day posting delays---making it a probabilistic matching problem rather than an exact join.

5. **Audit trail grows faster than transactional data**: At ~15 events per expense lifecycle and 500K expenses/day, the audit trail generates 1.4 TB/year---comparable to the expense metadata itself. Since audit records are append-only and immutable with 7-year retention, this becomes the second-largest storage consumer after receipts. The immutability requirement rules out traditional UPDATE/DELETE-based databases for this data.

6. **Multi-tenancy policy isolation is a correctness requirement, not just a performance one**: With 50K companies each maintaining ~200 policy rules, a policy engine bug that leaks rules across tenants could approve expenses that violate a company's compliance controls. Policy evaluation must guarantee strict tenant isolation while still achieving sub-500ms latency---requiring per-tenant rule caching with careful invalidation on policy updates.
