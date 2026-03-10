# 14.3 AI-Native MSME Accounting & Tax Compliance Platform — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Automated transaction ingestion** — Ingest financial transactions from bank feeds (real-time via open banking APIs and batch via statement upload), payment gateways, POS terminals, UPI business accounts, and e-commerce marketplace settlement reports; normalize, deduplicate, and enrich each transaction with counterparty resolution and preliminary categorization | Support 100+ banks for direct feeds; handle CSV, MT940, OFX, PDF statement formats; deduplication across multiple ingestion channels (same transaction from bank feed and from payment gateway); enrichment latency <500ms per transaction |
| FR-02 | **ML-powered transaction categorization** — Classify each ingested transaction into the correct chart of accounts entry (revenue category, expense type, asset movement, liability change) using a hierarchical ML classifier trained on industry-specific accounting patterns; support user corrections that fine-tune the business-specific model without degrading global model accuracy | Hierarchical classification: industry → account group → specific account; 95% accuracy for new businesses, 99% after 3 months of corrections; explain categorization reasoning to user; batch re-categorization when user corrects a pattern |
| FR-03 | **Double-entry journal generation** — Automatically generate balanced debit-credit journal entries for every financial event (bank transactions, invoices, payments, adjustments, depreciation); enforce the accounting equation as a database-level invariant; support multi-line compound journal entries with tax component breakdowns | Every journal entry must balance (total debits = total credits); support reversal entries, adjusting entries, and recurring entries; provide manual journal entry interface for non-automated transactions; maintain full edit history with reason codes for every modification |
| FR-04 | **Invoice creation and OCR extraction** — Create GST/VAT-compliant invoices with auto-computed tax components; extract structured data from received invoices/receipts using OCR with layout-aware ML; populate purchase ledger entries from extracted data; cross-validate extracted amounts against payment records | Invoice creation with HSN/SAC code lookup, auto-rate determination, and e-invoicing compliance; OCR extraction accuracy >97% for printed invoices, >90% for handwritten; support for 15+ invoice template layouts; batch processing for bulk invoice upload |
| FR-05 | **E-invoicing compliance** — Generate e-invoice JSON in GST INV-01 schema, submit to IRP for IRN generation, embed returned IRN and QR code into invoice; support e-invoice cancellation within regulatory window; maintain e-invoice status tracking across the lifecycle (generated → submitted → IRN received → cancelled) | IRP submission latency <2s for synchronous flow; automatic retry with failover across IRP endpoints; pre-submission validation for all 50 mandatory fields; support for debit notes, credit notes, and export invoices through IRP |
| FR-06 | **Bank reconciliation engine** — Match bank statement transactions to ledger entries using probabilistic multi-attribute matching (amount, date, reference, counterparty); support 1:1, 1:N, N:1, and N:M match patterns; surface unmatched items with ML-ranked suggestions; auto-learn business-specific reconciliation patterns | Auto-match rate >85% for established businesses; <5 minutes for full monthly reconciliation of 500 transactions; support for tolerance-based matching (bank charges, rounding differences); handle timing differences (cheque clearance delays, settlement lag) |
| FR-07 | **Multi-jurisdiction tax computation** — Compute tax obligations in real-time per transaction line item across GST (India), VAT (EU), and sales tax (US) regimes; support rate lookup by HSN/SAC code, supply type, jurisdiction pair, and business scheme; handle reverse charge, composition scheme, zero-rating, and exemptions | Tax rule updates without code deployment; support for 8,000+ HSN codes with rate mapping; inter-state vs. intra-state determination; input tax credit tracking and eligibility computation; effective-date semantics for rate changes |
| FR-08 | **GST return filing** — Auto-populate and file GSTR-1 (outward supplies), GSTR-3B (summary return), GSTR-9 (annual return); reconcile outward supplies with GSTR-2B (inward supplies from counterparties); flag ITC discrepancies where supplier has not filed; support both monthly and quarterly filing frequencies | Continuous pre-computation of return data; GSTR-2B reconciliation with mismatch categorization (amount mismatch, missing invoice, duplicate, rate difference); filing queue with deadline-aware prioritization; acknowledgment tracking |
| FR-09 | **Chart of accounts management** — Auto-generate industry-specific chart of accounts at onboarding; suggest new accounts when novel transaction types are detected; support chart restructuring during business type changes; maintain account hierarchy (group → sub-group → account → sub-account) with inheritance of tax treatment and reporting classification | Industry-specific templates for 20+ MSME verticals (retail, manufacturing, trading, services, restaurants, healthcare); chart migration wizard for business restructuring; account merging and splitting with retroactive journal reclassification |
| FR-10 | **Financial reporting** — Generate balance sheet, profit & loss statement, cash flow statement, and trial balance conforming to Ind AS, IFRS, or local GAAP; support comparative period analysis, ratio computation, and management commentary; produce tax-specific reports (GST annual computation, TDS certificates, advance tax workings) | On-demand and scheduled report generation; PDF and Excel export; comparative periods (current vs. previous year, current vs. budget); automatic adjusting entries for accruals, prepayments, and depreciation; audit-ready financial statements with drill-down from any line item to source journal entries |
| FR-11 | **Audit trail and compliance** — Maintain append-only, cryptographically chained audit log for every transaction, journal entry, modification, and deletion; support regulatory audit queries (trace any balance sheet line to source documents); generate audit reports with hash verification for data integrity | Merkle tree structure for tamper detection; 8-year data retention per statutory requirements; audit export in regulator-specified formats; user access log with IP, device, and action tracking |
| FR-12 | **Multi-entity and multi-currency** — Support businesses with multiple GST registrations (branches in different states), related entities requiring inter-company elimination, and foreign currency transactions with daily exchange rate revaluation | Consolidated reporting across entities; inter-company transaction matching and elimination; foreign currency translation with realized and unrealized gain/loss computation; transfer pricing documentation support |
| FR-13 | **Cash flow forecasting** — Predict future cash positions based on recurring transaction patterns, outstanding receivables aging, upcoming payables, tax payment schedules, and seasonal business patterns; alert when projected cash balance falls below configurable threshold | 30/60/90-day forward projection; receivable collection probability scoring; payable payment scheduling optimization; what-if scenario modeling (delayed payment from top customer, GST rate change impact) |
| FR-14 | **Accountant/CA collaboration** — Provide read-only and edit access for external chartered accountants; support journal entry approval workflows; enable bulk adjustment posting; provide filing delegation where the CA can file returns on behalf of the business | Role-based access (business owner, bookkeeper, CA, auditor); approval workflows for journal entries above configurable thresholds; CA dashboard with multi-client overview; delegation tokens with scoped permissions and expiry |

---

## Out of Scope

- **Payroll processing** — Employee salary computation, PF/ESI contributions, and TDS on salary; handled by specialized HRMS platforms
- **Inventory management** — Stock tracking, warehouse management, and cost of goods sold computation; platform accepts inventory-related journal entries but does not manage physical inventory
- **Project costing** — Job costing, work-in-progress tracking, and milestone billing for project-based businesses
- **Lending or credit products** — No credit scoring, loan origination, or financing; purely accounting and compliance
- **Payment processing** — Does not process payments (UPI, NEFT, cards); ingests transaction data from payment providers

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Transaction categorization latency (p99) | ≤ 500 ms | Must feel instantaneous when viewing bank feed |
| Journal entry creation (p99) | ≤ 200 ms | Atomic double-entry write must be fast for UI responsiveness |
| Bank reconciliation (500 txns) (p95) | ≤ 30 s | Monthly reconciliation for a typical MSME should complete in under a minute |
| E-invoice IRP round-trip (p95) | ≤ 3 s | Invoice creation should not block on IRP response |
| Tax computation per line item (p99) | ≤ 50 ms | Must not add perceptible latency to invoice creation (invoices may have 50+ line items) |
| GSTR-1 return generation (p95) | ≤ 60 s for 1,000 invoices | Pre-computation reduces this, but on-demand generation must be responsive |
| Financial report generation (p95) | ≤ 10 s for trial balance, ≤ 30 s for full financial statements | Accountants expect near-instant report access |
| OCR invoice extraction (p95) | ≤ 5 s per page | Batch upload of 100 invoices should complete in <10 minutes |

### Reliability & Availability

| Metric | Target |
|---|---|
| Core ledger service availability | 99.99% (≤ 52 min downtime/year) — financial data integrity is paramount |
| Transaction ingestion pipeline availability | 99.95% — temporary ingestion delays are tolerable if no data is lost |
| E-invoicing service availability | 99.9% — dependent on external IRP uptime; graceful queuing when IRP is down |
| Filing service availability | 99.95% — must be near-100% during filing deadline windows |
| Data durability for financial records | 99.999999999% (11 nines) — statutory requirement for 8-year retention |
| Event ordering guarantee | Per-business causal ordering for all journal entries (no out-of-order ledger mutations) |
| Zero-data-loss guarantee | No acknowledged transaction may be lost; write-ahead logging with synchronous replication |

### Security & Compliance

| Requirement | Specification |
|---|---|
| Data encryption | AES-256 at rest; TLS 1.3 in transit; field-level encryption for PAN, bank account numbers, and financial amounts |
| Access control | Role-based access with business-owner, bookkeeper, CA, and auditor roles; row-level security per business entity |
| GST compliance (India) | E-invoicing, GSTR-1/3B/9 filing, GSTR-2B reconciliation, ITC computation, composition scheme support |
| VAT compliance (EU) | Standard and reduced rate computation, reverse charge, intra-community supply, OSS reporting, ViDA preparation |
| Audit trail | Immutable, append-only journal with cryptographic chaining; meets statutory audit requirements |
| Data residency | Financial data stored in the jurisdiction of the business entity; configurable per-entity data residency rules |

### Scalability Targets

| Metric | Target |
|---|---|
| Active MSME businesses on platform | 5M businesses |
| Transactions ingested per day | 200M (average 40 txns/business/day across 5M businesses) |
| Journal entries written per day | 300M (transactions + auto-generated tax entries + adjustments) |
| Invoices created per day | 50M (including both outward and inward) |
| E-invoices submitted to IRP per day | 20M |
| Bank reconciliation operations per day | 500K full reconciliation runs (each covering ~500 transactions) |
| GST returns filed per month | 5M (one per business per month for GSTR-1 and GSTR-3B) |
| Concurrent users during peak hours | 2M (morning hours when businesses review previous day's transactions) |

---

## Capacity Estimations

### Transaction Ingestion Volume

**Assumptions:**
- 5M active MSME businesses
- Average 40 transactions/day per business (range: 5 for micro, 200 for medium)
- Each transaction: ~2 KB raw + 1 KB metadata + 0.5 KB categorization features

```
Daily transaction volume:
  5M businesses × 40 txns/business = 200M transactions/day
  200M / 86,400 sec = ~2,315 transactions/sec (average)
  Peak hour (9 AM - 11 AM): 3x concentration = ~6,945 transactions/sec
  Month-end filing period: 5x spike = ~11,575 transactions/sec

Per-transaction storage:
  Raw + metadata + features = 3.5 KB per transaction
  Daily: 200M × 3.5 KB = 700 GB/day
  Monthly: 700 GB × 30 = 21 TB/month
  Annual: 21 TB × 12 = 252 TB/year
```

### Journal Entry Storage

**Assumptions:**
- Each transaction generates 1.5 journal entries on average (1 for the transaction + 0.5 for tax components and adjustments)
- Each journal entry: ~1 KB (header + 2-6 line items)

```
Daily journal entries:
  200M txns × 1.5 = 300M journal entries/day
  Storage: 300M × 1 KB = 300 GB/day
  Monthly: 300 GB × 30 = 9 TB/month
  Annual (with 8-year retention): 9 TB × 12 × 8 = 864 TB

Journal entry write throughput:
  300M / 86,400 sec = ~3,472 writes/sec (average)
  Peak hour: ~10,416 writes/sec
```

### Invoice and OCR Processing

**Assumptions:**
- 50M invoices/day (20M outward + 30M inward via OCR/import)
- Outward invoices: ~5 KB each (structured data)
- Inward invoices (OCR): ~500 KB image + 5 KB extracted data
- 20M e-invoices submitted to IRP daily

```
Invoice storage:
  Outward: 20M × 5 KB = 100 GB/day
  Inward images: 30M × 500 KB = 15 TB/day (object storage, compressed)
  Inward extracted data: 30M × 5 KB = 150 GB/day

OCR processing throughput:
  30M invoices / 86,400 sec = ~347 invoices/sec
  At 5 seconds per OCR extraction: need 1,735 concurrent OCR workers
  Peak hour (3x): 5,205 concurrent OCR workers

E-invoice IRP submissions:
  20M / 86,400 sec = ~231 submissions/sec (average)
  Peak hour: ~694 submissions/sec
  At 3 seconds per IRP round-trip: need 2,082 concurrent IRP connections
```

### Bank Reconciliation Compute

**Assumptions:**
- 500K reconciliation runs/day (some businesses reconcile daily, most monthly)
- Average 500 bank transactions and 400 ledger entries per reconciliation
- Matching algorithm: O(n × m × k) where n=bank txns, m=ledger entries, k=candidate window size (typically 10)

```
Reconciliation compute:
  Per run: 500 × 400 × 10 = 2M comparison operations
  Daily: 500K × 2M = 1 trillion comparison operations
  At 1M comparisons/sec per core: 1,000,000 core-seconds/day
  Spread over 86,400 seconds: ~12 cores continuously
  Peak (month-end, 80% of reconciliations in 3 days): ~120 cores

Memory per reconciliation:
  500 bank txns × 2 KB + 400 ledger entries × 1 KB = 1.4 MB
  Concurrent reconciliations (peak): 5,000 × 1.4 MB = 7 GB
```

### GST Filing Bandwidth

**Assumptions:**
- 5M GSTR-1 and 5M GSTR-3B filings per month
- Average GSTR-1 JSON payload: 500 KB (1,000 invoices × 500 bytes each)
- Filing deadline window: 70% of filings in last 48 hours

```
Filing volume during deadline:
  3.5M filings in 48 hours = ~20 filings/sec (average during deadline)
  Peak hour during deadline: 5x = ~100 filings/sec
  Bandwidth: 100 filings/sec × 500 KB = 50 MB/sec upload to government portal

Government portal capacity limitation:
  Portal accepts ~50 concurrent connections per IP
  Need IP rotation or multiple filing proxies
  Session management: 10-minute token expiry × 100 concurrent sessions = 1,000 sessions rotating
```

### Storage Summary

| Component | Daily Growth | Monthly Growth | Annual Growth | 8-Year Retention |
|---|---|---|---|---|
| Transaction records | 700 GB | 21 TB | 252 TB | 2 PB |
| Journal entries | 300 GB | 9 TB | 108 TB | 864 TB |
| Invoice images (OCR) | 15 TB | 450 TB | 5.4 PB | 43.2 PB (tiered to cold storage) |
| Invoice structured data | 250 GB | 7.5 TB | 90 TB | 720 TB |
| Audit logs | 100 GB | 3 TB | 36 TB | 288 TB |
| **Total (excluding images)** | **1.35 TB** | **40.5 TB** | **486 TB** | **3.9 PB** |
| **Total (including images)** | **16.35 TB** | **490.5 TB** | **5.9 PB** | **47.1 PB** |
