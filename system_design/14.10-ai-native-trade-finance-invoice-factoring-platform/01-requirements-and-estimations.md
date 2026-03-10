# 14.10 AI-Native Trade Finance & Invoice Factoring Platform — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Invoice ingestion and digitization** — Accept invoices in multiple formats (PDF, image, e-invoice JSON, ERP integration, TReDS API); extract structured fields (invoice number, date, amount, GST details, line items, buyer/seller GSTIN, payment terms) using AI-powered OCR and document understanding | Field extraction accuracy ≥ 98% for e-invoices, ≥ 95% for scanned PDFs; support for handwritten invoices at ≥ 85% accuracy; processing latency ≤ 10 seconds per invoice; batch upload support for 1,000+ invoices |
| FR-02 | **GST cross-verification** — Validate uploaded invoices against GSTN (Goods and Services Tax Network) filings; cross-match invoice details with GSTR-1 (seller's outward supply) and GSTR-2B (buyer's inward supply auto-populated); flag discrepancies in amount, GSTIN, HSN codes, or invoice dates | Real-time GSTN API integration; handle API rate limits (50 requests/minute per GSTIN); tolerance for minor amount mismatches (≤ ₹100 or ≤ 0.5%); flag missing filings as high-risk |
| FR-03 | **Buyer credit assessment engine** — Compute real-time creditworthiness scores for invoice buyers using multi-factor AI models: financial statements, payment history on platform, industry benchmarks, credit bureau data, GST filing regularity, legal proceedings, and macroeconomic indicators | Credit score refresh frequency: daily for active buyers, weekly for dormant; support for 500,000+ buyer profiles; model inference latency ≤ 200 ms; explainable scoring with factor-level contribution breakdown |
| FR-04 | **Dynamic invoice pricing** — Calculate discount rates for each invoice in real-time based on: buyer credit score, invoice characteristics (amount, tenor, industry), platform-wide liquidity conditions, financier portfolio appetite, concentration risk, and seasonal factors | Pricing latency ≤ 500 ms per invoice; support for batch pricing (1,000 invoices in ≤ 30 seconds); rate granularity to 1 basis point (0.01%); pricing audit trail for every calculation |
| FR-05 | **Financier matching and auction** — Match invoices with interested financiers based on their investment criteria (buyer rating, industry preference, tenor range, minimum/maximum ticket size); support both fixed-price acceptance and competitive bidding models | Matching latency ≤ 2 seconds; support for 200+ active financiers; bid validity windows (15 minutes to 24 hours); partial acceptance (financier funds 60% of invoice, another funds 40%) |
| FR-06 | **Multi-party settlement orchestration** — Execute atomic settlement flows: disbursement to supplier on deal acceptance, collection from buyer on maturity, fee distribution to platform, return distribution to financier, insurance claim processing on default—with escrow-based fund management | Settlement initiation within 4 hours of deal acceptance; buyer collection via automated mandates (NACH/e-mandate); reconciliation within T+1; support for partial payments and grace periods |
| FR-07 | **Supply chain finance programs** — Enable anchor-buyer programs where large corporates onboard their supplier base for preferential financing; auto-approve invoices based on buyer-confirmed payables; program-level credit limits and pricing tiers | Support for 1,000+ anchor programs; bulk supplier onboarding (500+ suppliers per program); auto-approval based on buyer ERP integration; program-level analytics and reporting |
| FR-08 | **Export finance and cross-border transactions** — Process export invoices with multi-currency support; digitize letters of credit; validate shipping and customs documentation; integrate with ECGC for export credit insurance; file EDPMS returns automatically | Support for 50+ currencies; LC document checking against UCP 600 rules; automated EDPMS filing; forward contract booking for currency hedging; cross-border settlement via SWIFT |
| FR-09 | **Credit insurance underwriting** — Offer AI-underwritten trade credit insurance that protects financiers against buyer default; compute premiums based on buyer risk, invoice characteristics, and portfolio exposure; process claims automatically on verified defaults | Premium calculation latency ≤ 1 second; policy issuance within 24 hours; automated claim assessment within 5 business days; portfolio-level exposure monitoring with concentration limits |
| FR-10 | **Fraud detection and prevention** — Detect fraudulent invoices including duplicates (same invoice submitted to multiple platforms), fictitious invoices (no underlying trade), circular trading (related parties creating artificial receivables), and invoice manipulation (altered amounts or dates) | Duplicate detection accuracy ≥ 99.5%; false positive rate ≤ 2%; real-time detection latency ≤ 5 seconds; integration with industry-level invoice registries; behavioral anomaly detection |
| FR-11 | **KYC/AML compliance engine** — Automated onboarding with video KYC, document verification (PAN, GSTIN, bank statements, board resolutions), beneficial ownership identification, sanctions screening, and ongoing transaction monitoring for suspicious patterns | Onboarding completion in ≤ 30 minutes; sanctions screening against 20+ global watchlists; ongoing transaction monitoring with automated STR (Suspicious Transaction Report) filing; periodic KYC refresh triggers |
| FR-12 | **Working capital analytics and recommendations** — Analyze MSME's receivables, payables, and cash flow patterns; recommend optimal financing mix (factoring vs. credit line vs. overdraft); project cash flow gaps and proactively suggest invoice financing before the gap materializes | Cash flow projection accuracy ≥ 85% for 30-day horizon; recommendations within 5 seconds of data refresh; integration with MSME's accounting software/ERP; monthly working capital health reports |
| FR-13 | **Financier portfolio management** — Provide financiers with portfolio analytics: exposure by buyer, industry, tenor; portfolio performance (yield, default rate, DPD distribution); risk-adjusted return calculations; automated portfolio rebalancing alerts | Real-time portfolio dashboard; configurable alerts for concentration breaches; automated provisioning calculations per RBI norms; regulatory reporting (NPA classification, provisioning) |
| FR-14 | **TReDS integration** — Integrate with RBI-authorized TReDS platforms (RXIL, M1xchange, Invoicemart) for interoperable invoice discounting; support TReDS-mandated workflows for factoring units involving MSMEs and large corporates | Compliance with TReDS regulations; bi-directional API integration; real-time bid synchronization; settlement through authorized clearing mechanisms |

---

## Out of Scope

- **Term lending and project finance** — No medium/long-term business loans, project finance, or working capital term loans; focus is exclusively on short-term receivable financing (≤ 180 days)
- **Equity and debt fundraising** — No equity investment, venture debt, or bond issuance capabilities; the platform handles only trade-linked receivable financing
- **Full ERP or accounting software** — No general-purpose accounting, invoicing, or ERP functionality; the platform integrates with existing systems rather than replacing them
- **Physical branch operations** — No branch-based customer service, cash handling, or physical document collection; all operations are digital-first
- **Consumer lending** — No personal loans, consumer credit cards, or retail lending; all financing is strictly B2B trade receivable-backed

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Invoice OCR and extraction (p95) | ≤ 10 s per invoice | MSMEs uploading invoices expect near-instant processing; batch uploads must not block the UI |
| GST cross-verification (p95) | ≤ 15 s per invoice | GSTN API latency is 2–5 s; with retries and validation logic, 15 s is realistic |
| Credit score computation (p95) | ≤ 200 ms | Real-time pricing depends on credit score; must not be the bottleneck in the pricing pipeline |
| Dynamic pricing (p95) | ≤ 500 ms per invoice | Financiers expect real-time pricing; delays cause missed bidding windows |
| Financier matching (p95) | ≤ 2 s | Post-pricing, matching should be near-instant to maximize deal conversion |
| Settlement initiation (p95) | ≤ 4 hours from deal acceptance | Supplier expects same-day disbursement for accepted deals |
| Fraud detection (p95) | ≤ 5 s per invoice | Must complete before pricing and matching to prevent fraudulent invoices from entering the marketplace |
| API gateway response (p99) | ≤ 300 ms for read operations | Standard fintech API latency expectation |

### Reliability & Availability

| Metric | Target |
|---|---|
| Platform availability | 99.95% (≤ 4.4 hours downtime/year) |
| Settlement engine availability | 99.99% — financial transactions must not be lost or duplicated |
| Ledger service availability | 99.999% — double-entry ledger is the financial source of truth |
| Fraud detection availability | 99.99% — a gap in fraud detection exposes the platform to financial loss |
| Data durability | 99.999999999% (11 nines) for financial records |
| Settlement idempotency | 100% — every settlement instruction must be idempotent to prevent double disbursement |

### Scalability

| Metric | Target |
|---|---|
| Invoices processed per day | 500,000 (peak: 1.5M during quarter-end) |
| Active deals under management | 2M concurrent (invoices awaiting maturity) |
| Active buyer profiles | 500,000 |
| Active supplier profiles | 2M |
| Active financier accounts | 500 |
| Concurrent API requests | 10,000 per second |
| Settlement transactions per day | 200,000 |
| Cross-border transactions per day | 10,000 |

### Security & Compliance

| Requirement | Specification |
|---|---|
| Data encryption | AES-256 at rest, TLS 1.3 in transit; HSM-backed encryption for financial keys |
| Regulatory compliance | RBI NBFC norms, FEMA regulations, GST Act, IT Act 2000, DPDP Act 2023 |
| Audit trail | Immutable event-sourced log of every transaction, state change, and user action; 10-year retention |
| Access control | Role-based access with attribute-based policy overlay; maker-checker for high-value operations |
| Data residency | All financial data stored within India; cross-border data sharing only with anonymization for analytics |

---

## Capacity Estimations

### Transaction Volume

| Parameter | Value | Derivation |
|---|---|---|
| Daily invoices uploaded | 500,000 | Mature platform serving 2M MSMEs, each uploading ~0.25 invoices/day on average |
| Peak daily invoices | 1,500,000 | Quarter-end (March, September) surge: 3x normal volume |
| Invoice verification throughput | ~35,000/hour sustained | 500K / 14 operating hours; burst to 100K/hour at quarter-end |
| Deals created per day | 300,000 | ~60% of uploaded invoices convert to funded deals |
| Average invoice amount | ₹5,00,000 ($6,000) | MSME B2B invoice; range from ₹50,000 to ₹5 crore |
| Daily transaction value | ₹15,000 crore ($1.8B) | 300,000 deals × ₹5L average |
| Active deals (awaiting maturity) | 2,000,000 | Average 45-day tenor × 300K deals/day ÷ 7 (weekdays) |

### Compute

| Parameter | Value | Derivation |
|---|---|---|
| OCR inferences per day | 500,000 | 1 per uploaded invoice |
| Credit model inferences per day | 2,000,000 | Multiple scores per deal (buyer, supplier, invoice-level) + daily batch refresh |
| Fraud model inferences per day | 1,500,000 | Per-invoice + cross-reference checks + periodic portfolio scans |
| ML model GPU-hours per day | 120 hours | OCR (50h) + credit scoring (40h) + fraud detection (20h) + pricing models (10h) |
| API compute (CPU) | 200 cores sustained, 600 peak | 10K RPS × 20ms average processing |

### Storage

| Parameter | Value | Derivation |
|---|---|---|
| Invoice documents per day | 2.5 TB | 500K invoices × 5 MB average (PDF + extracted data) |
| Financial ledger entries per day | 5 GB | 300K deals × 6 ledger entries × 3 KB per entry |
| Audit event log per day | 10 GB | ~20M events × 500 bytes average |
| Credit model feature store | 500 GB total | 500K buyer profiles × 2,000 features × 500 bytes |
| Document storage (6-month retention) | 450 TB | 2.5 TB/day × 180 days |
| Ledger + audit (10-year retention) | 55 TB | (5 + 10) GB/day × 3,650 days |

### Bandwidth

| Parameter | Value | Derivation |
|---|---|---|
| Invoice upload bandwidth (peak) | 2 Gbps | 100K invoices/hour × 5 MB × 8 bits / 3600 seconds (quarter-end peak) |
| GSTN API traffic | 200 Mbps | 35K verifications/hour × 20 KB request/response |
| Inter-service communication | 5 Gbps | Microservice mesh: pricing, matching, settlement, fraud |
| External API (financier integrations) | 500 Mbps | 500 financiers × real-time bid/deal updates |
| **Total peak bandwidth** | **~8 Gbps** | Dominated by document uploads and inter-service communication |
