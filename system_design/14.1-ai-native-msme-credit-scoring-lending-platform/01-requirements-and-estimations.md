# 14.1 AI-Native MSME Credit Scoring & Lending Platform — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Alternative data ingestion** — Ingest borrower financial data through Account Aggregator (AA) framework (bank statements, GST returns), UPI transaction feeds, e-commerce seller analytics, and accounting software integrations; parse, categorize, and normalize into a unified feature set | Support 50+ Financial Information Providers (FIPs); handle PDF, JSON, and XML bank statement formats; transaction categorization accuracy >92% |
| FR-02 | **Credit scoring engine** — Run champion-challenger ensemble of ML models (gradient-boosted trees, logistic regression, thin-file specialist models) to produce risk grade, probability of default (PD), and pricing recommendation for each application | Sub-2-second scoring latency; support 200+ features; separate models per product (term loan, credit line, invoice financing) and segment (new-to-credit, repeat borrower, thin-file) |
| FR-03 | **Psychometric assessment** — Administer gamified financial literacy and entrepreneurial aptitude assessments; score behavioral responses for credit risk prediction; detect gaming and random-answer patterns | 10–15 minute assessment; anti-gaming detection (response time analysis, consistency checks); scores calibrated to 90-day default outcomes |
| FR-04 | **Underwriting decision engine** — Apply hard policy rules (regulatory limits, product eligibility, blacklists), ML credit score, and pricing model in sequence; route edge cases to human underwriters; generate adverse action reasons for every decline | Configurable score bands for auto-approve, auto-decline, and manual review; human queue SLA <4 hours; adverse action reasons compliant with fair lending regulations |
| FR-05 | **Instant digital disbursement** — Disburse approved loans via UPI, IMPS, NEFT, or mobile money within 5 minutes of approval; verify beneficiary account via penny-drop; register e-mandate/e-NACH for automated repayment collection | Support 30+ destination banks; penny-drop verification <10 seconds; e-mandate success rate >85% |
| FR-06 | **Loan lifecycle management** — Manage loan states (applied, approved, disbursed, active, delinquent, closed, written-off); process prepayments, restructuring, and top-up loans; calculate interest accrual, penalties, and foreclosure amounts | Real-time outstanding balance; support for reducing-balance and flat-rate interest; regulatory cooling-off period enforcement |
| FR-07 | **Collection management** — Execute automated collection waterfall (pre-due reminders, post-due nudges, soft collection, hard collection, field collection, legal action); optimize contact timing and channel via ML; manage e-mandate/auto-debit execution | Multi-channel: SMS, WhatsApp, email, IVR, app push; contact timing optimization for >15% improvement in payment rates; auto-debit retry logic with bank-specific success patterns |
| FR-08 | **Fraud detection** — Real-time application fraud scoring (synthetic identity, document forgery, velocity checks, device fingerprinting); post-disbursement fraud monitoring (loan stacking, early payment default, behavioral anomalies); fraud ring detection via graph analysis | Application fraud detection <500 ms; stacking detection via daily bureau refresh; graph-based ring detection across shared devices, addresses, bank accounts |
| FR-09 | **Model governance and explainability** — Maintain model registry with version control; produce SHAP-based feature attributions for every decision; generate counterfactual explanations; monitor model fairness across demographic segments; enforce champion-challenger promotion workflow | Model approval requires fairness certification; feature attribution for top 5 reasons per decision; population stability index (PSI) monitoring with automated drift alerts |
| FR-10 | **Embedded finance API** — Expose lending-as-a-service APIs for partner platforms (e-commerce marketplaces, accounting SaaS, supply chain platforms) to embed credit offers at point of sale; manage partner-specific credit policies, revenue sharing, and co-lending arrangements | Partner onboarding <5 business days; white-label loan offer widgets; co-lending with bank/NBFC partners with automated capital allocation |
| FR-11 | **Regulatory compliance engine** — Generate Key Fact Statements (KFS) with APR calculation; enforce cooling-off period for loan cancellation; manage borrower grievance redressal with SLA tracking; produce regulatory reports for RBI submissions | KFS generation at approval; grievance resolution SLA <15 days; digital lending app registration compliance |
| FR-12 | **Portfolio analytics and early warning** — Monitor portfolio health (delinquency buckets, NPA ratios, vintage analysis); detect early warning signals for borrower distress (cash flow deterioration, GST filing gaps, UPI transaction volume decline); trigger proactive restructuring | Early warning detection 60–90 days before default; vintage cohort analysis at daily granularity; stress testing under macroeconomic scenarios |
| FR-13 | **Credit line management** — Manage revolving credit lines with dynamic limit adjustment based on borrower behavior; process drawdown requests with instant disbursement; monitor utilization patterns for limit increase/decrease decisions | Real-time available balance; dynamic limit recalculation weekly; drawdown-to-disbursement <2 minutes |
| FR-14 | **Document verification and OCR** — Extract and verify information from KYC documents (Aadhaar, PAN, business registration), financial documents (bank statements, GST returns, ITR), and business documents (invoices, purchase orders); detect forged/tampered documents | OCR accuracy >97% for printed documents; forgery detection for digitally altered PDFs (font inconsistency, metadata tampering); cross-validation across document types |

---

## Out of Scope

- **Deposit or savings products** — Only lending products; no liability-side banking
- **Foreign exchange or cross-border remittances** — Domestic MSME lending only
- **Equity or venture capital investment** — Debt products only; no equity underwriting
- **Insurance product distribution** — No credit insurance or embedded insurance bundling
- **Physical branch operations** — Fully digital platform; no branch-based loan origination workflows

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Credit decision latency (p99) | ≤ 5 s (auto-approve path) | Embedded finance partners require near-instant decisions at point of sale |
| AA data fetch + parsing (p95) | ≤ 45 s | AA framework response times vary by FIP; must not block decision if one FIP is slow |
| Fraud scoring latency (p99) | ≤ 500 ms | Must complete before disbursement authorization |
| Disbursement execution (p95) | ≤ 5 min from approval | Market expectation for digital lending; regulatory clock starts at approval |
| Penny-drop verification (p99) | ≤ 15 s | Must confirm beneficiary account before disbursement |
| Collection auto-debit execution | Within 30 min of scheduled time | Bank NACH windows have specific processing times |
| Model inference (p99) | ≤ 200 ms | Credit scoring must not be the bottleneck in the decision pipeline |
| API response for embedded partners (p99) | ≤ 3 s | Partner UX requires fast offer generation |

### Reliability & Availability

| Metric | Target |
|---|---|
| Core lending platform availability | 99.95% (≤ 4.4 hours downtime/year) |
| Credit decision service availability | 99.99% — business-critical; downtime = lost applications |
| Disbursement service availability | 99.9% — depends on external payment rails |
| Collection service availability | 99.9% — NACH execution depends on banking infrastructure |
| Fraud detection service availability | 99.99% — must never fail silently (fail-closed: block disbursement if fraud service is down) |
| Data durability for loan records | 99.999999999% (11 nines) — regulatory requirement for 8-year retention |
| Event ordering guarantee | Per-loan causal ordering for all state transitions |

### Scalability

| Metric | Target |
|---|---|
| Loan applications processed per day | 500,000 (peak festival season: 1.5M) |
| Concurrent active loans managed | 10M loans across all products |
| AA data fetches per day | 1M consent-and-fetch operations |
| Credit scoring inferences per day | 2M (applications + pre-qualification + limit reviews) |
| Collection actions per day | 5M multi-channel touchpoints (SMS, WhatsApp, IVR, push) |
| Bank statement pages parsed per day | 50M pages (average 10 pages per statement × 5M statements) |
| Embedded finance API calls per day | 10M (offer checks + eligibility + applications) |
| Bureau pulls per day | 1.5M (application + monitoring + stacking detection) |

### Security & Compliance

| Requirement | Specification |
|---|---|
| RBI Digital Lending Directions 2025 | Direct-to-borrower disbursement, fee disclosure, cooling-off period, grievance redressal, DLA registration |
| Data privacy | Personal data encryption at rest (AES-256) and in transit (TLS 1.3); consent-based data access via AA; data retention per regulatory mandate |
| KYC compliance | Video KYC or Aadhaar OTP-based eKYC; CKYC registry integration; re-KYC at regulatory intervals |
| Fair lending | Model fairness monitoring across gender, geography, and religion; no use of protected attributes or strong proxies; documented model governance |
| Anti-money laundering | Transaction monitoring for suspicious patterns; STR filing for threshold breaches; PEP/sanctions screening |
| Audit trail | Immutable logging of every credit decision, disbursement, collection action, and data access; 8-year retention |

---

## Capacity Estimations

### Application Processing Volume

**Assumptions:**
- 500,000 applications/day baseline (festival peak: 1.5M)
- Each application: AA data fetch + document verification + credit scoring + underwriting decision
- 70% auto-decided (approve or decline); 30% routed to manual review

```
Application throughput:
  Baseline: 500,000 / 86,400 sec = ~6 applications/sec
  Festival peak: 1,500,000 / 86,400 sec = ~17 applications/sec
  Peak hour (10 AM - 2 PM festival day): 5x concentration = ~85 applications/sec
  Per application pipeline: AA fetch (30s) + parsing (5s) + scoring (0.2s) + decision (0.1s)
  Pipeline is parallelized: AA fetch runs concurrently with document verification
  Effective wall-clock time: ~45 seconds for auto-approve; ~4 hours for manual review
```

### Bank Statement Processing

```
Bank statement parsing:
  5M statements/day × 10 pages average = 50M pages/day
  Per page: OCR + NLP transaction categorization = ~500 ms
  Daily compute: 50M × 500 ms = 25,000,000 seconds = ~289 CPU-days
  With 500 parallel workers: ~14 hours (within daily processing window)

  Per statement output: ~200 categorized transactions
  Transaction categories: 35 categories (salary, rent, EMI, business revenue,
    supplier payment, utility, cash withdrawal, UPI transfer, etc.)
  Category accuracy target: >92% overall; >95% for revenue-critical categories

  Storage per statement: ~50 KB (parsed + categorized transactions)
  Daily: 5M × 50 KB = 250 GB/day
  Monthly: ~7.5 TB
  With 3x compression: ~2.5 TB/month
```

### Credit Scoring Compute

```
Scoring pipeline:
  2M inferences/day (applications + pre-quals + limit reviews)
  Per inference:
    Feature vector assembly: ~50 ms (200+ features from multiple data sources)
    Champion model (gradient-boosted, 500 trees): ~10 ms
    Challenger model (logistic regression): ~2 ms
    Thin-file model (when applicable): ~15 ms
    SHAP explanation (top 5 features): ~100 ms
    Total per inference: ~180 ms

  Daily compute: 2M × 180 ms = 360,000 seconds = ~4.2 CPU-days
  With 50 scoring workers: handles peak of 85 apps/sec with headroom

  Model artifact size: ~500 MB (champion) + ~50 MB (challenger) + ~200 MB (thin-file)
  Feature store: 10M active borrower profiles × 2 KB each = 20 GB (fits in memory)
```

### Fraud Detection Compute

```
Application fraud scoring:
  500K applications/day × fraud feature computation
  Per application:
    Device fingerprint analysis: ~50 ms
    Velocity checks (5 lookback windows): ~20 ms
    Identity verification cross-checks: ~100 ms
    Document forgery detection (when applicable): ~2 seconds
    Graph query (shared attributes): ~200 ms
    Total: ~400 ms (excluding document forgery path)

  Daily compute: 500K × 400 ms = 200,000 seconds = ~2.3 CPU-days

Post-disbursement monitoring:
  10M active loans × daily behavioral scoring
  Per loan: ~10 ms (lightweight feature update + model score)
  Daily: 10M × 10 ms = 100,000 seconds = ~1.2 CPU-days

Stacking detection:
  Bureau refresh for 100K highest-risk loans/day
  Per refresh: ~500 ms (bureau API + comparison)
  Daily: 100K × 500 ms = 50,000 seconds = ~0.6 CPU-days
```

### Disbursement and Collection Volume

```
Disbursement:
  Approval rate: ~40% of applications = 200,000 disbursements/day
  Average loan amount: ₹2,00,000 (~$2,400)
  Daily disbursement volume: ₹40,000 crore (~$4.8B)
  Disbursement channels: UPI (60%), IMPS (25%), NEFT (15%)
  Peak: 800 disbursements/hour during festival season

Collection:
  10M active loans × monthly EMI collection
  Daily collection attempts: 333,000 (10M / 30 days)
  Auto-debit success rate: ~75% on first attempt
  Failed auto-debit → retry next day: 83,000/day
  Collection touchpoints: 5M/day across all channels
    SMS: 2M, WhatsApp: 1.5M, Push notification: 1M, IVR: 300K, Field: 200K
```

### Storage Summary

```
Loan records (10M active, 8-year history):     ~500 GB
Bank statement parsed data (3-year):            ~90 TB (compressed)
Credit scoring feature store (active):          ~20 GB (in-memory)
Credit decision audit trail (8-year):           ~5 TB
AA consent and data logs (8-year):              ~2 TB
Fraud detection graph (identity linkages):      ~50 GB
Document images (KYC, statements, 8-year):      ~200 TB (object storage)
Model artifacts and training data:              ~5 TB
Collection interaction logs (8-year):           ~10 TB
Portfolio analytics materialized views:         ~500 GB
```

---

## SLO Summary

| SLO | Target | Measurement Window |
|---|---|---|
| Credit decision latency (auto-path) p99 | ≤ 5 s | Rolling 1-hour |
| Model inference p99 | ≤ 200 ms | Rolling 1-hour |
| Fraud scoring p99 | ≤ 500 ms | Rolling 1-hour |
| AA data fetch p95 | ≤ 45 s | Rolling 1-hour |
| Disbursement completion p95 | ≤ 5 min | Rolling 1-hour |
| Collection auto-debit execution | Within 30 min of schedule | Per batch window |
| Credit decision service availability | 99.99% | Monthly |
| Fraud detection service availability | 99.99% | Monthly |
| Core platform availability | 99.95% | Monthly |
| Loan record durability | 99.999999999% | Annual |
| Model drift alert (PSI > 0.2) | ≤ 24 h from drift onset | Daily monitoring |
| Adverse action reason generation | 100% of declines | Per decision |
