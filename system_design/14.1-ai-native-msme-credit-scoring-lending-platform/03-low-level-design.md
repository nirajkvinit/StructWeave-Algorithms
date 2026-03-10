# 14.1 AI-Native MSME Credit Scoring & Lending Platform — Low-Level Design

## Data Models

### Borrower Credit Profile

The borrower credit profile is the core abstraction—a continuously updated, multi-dimensional representation of an MSME's creditworthiness assembled from all available data sources.

```
BorrowerCreditProfile:
  borrower_id:           string          # globally unique borrower identifier
  business_entity_id:    string          # GSTIN or business registration number
  profile_version:       uint64          # monotonically increasing on every update
  last_updated:          datetime_us     # microsecond precision

  identity:
    kyc_status:          enum[PENDING, VERIFIED, EXPIRED, REJECTED]
    aadhaar_verified:    boolean
    pan_verified:        boolean
    ckyc_number:         string
    business_type:       enum[PROPRIETORSHIP, PARTNERSHIP, LLP, PVT_LTD]
    vintage_months:      int             # business age in months
    sector_code:         string          # NIC/ISIC industry code
    pin_code:            string          # business location

  bureau:
    bureau_score:        int             # 300-900 (null if no bureau history)
    bureau_available:    boolean
    active_tradelines:   int
    total_outstanding:   float64
    max_dpd_12m:         int             # max days-past-due in 12 months
    enquiry_count_3m:    int             # bureau pulls in last 3 months
    credit_utilization:  float64         # 0.0 - 1.0
    oldest_tradeline_months: int

  cash_flow:
    monthly_credit_avg_6m:  float64     # average monthly credits (inflows)
    monthly_debit_avg_6m:   float64     # average monthly debits (outflows)
    net_cash_flow_avg_6m:   float64
    cash_flow_volatility:   float64     # coefficient of variation
    min_monthly_balance:    float64     # lowest monthly closing balance
    emi_to_income_ratio:    float64     # existing EMI obligations / income
    salary_regularity:      float64     # 0.0 - 1.0 (for salaried proprietors)
    revenue_trend:          enum[GROWING, STABLE, DECLINING]
    revenue_seasonality:    float64     # 0.0 - 1.0 (seasonal variation index)
    cash_cushion_days:      int         # days of operating expenses covered by balance

  gst:
    gst_filing_regularity:  float64    # 0.0 - 1.0 (% of filings on time)
    gst_revenue_12m:        float64    # total revenue from GSTR-1
    gst_bank_mismatch:      float64    # deviation between GST revenue and bank credits
    input_credit_ratio:     float64    # input tax credit / output tax
    filing_gap_months:      int        # consecutive months of missed filings
    revenue_growth_yoy:     float64    # year-over-year revenue growth

  upi:
    unique_payers_30d:      int        # distinct entities paying this business
    unique_payees_30d:      int        # distinct entities this business pays
    transaction_frequency_30d: int     # total UPI transactions
    avg_transaction_amount: float64
    business_vs_personal:   float64    # 0.0 - 1.0 (fraction classified as business)
    collection_regularity:  float64    # 0.0 - 1.0 (consistency of incoming payments)
    weekend_transaction_ratio: float64 # weekend vs. weekday activity

  psychometric:
    assessment_completed:   boolean
    financial_literacy:     float64    # 0.0 - 1.0
    entrepreneurial_aptitude: float64  # 0.0 - 1.0
    risk_tolerance:         float64    # 0.0 - 1.0
    consistency_score:      float64    # 0.0 - 1.0 (anti-gaming check)
    assessment_date:        datetime

  device:
    device_fingerprint_id:  string
    device_type:            enum[ANDROID, IOS, WEB]
    app_install_age_days:   int
    location_consistency:   float64    # 0.0 - 1.0 (stable location pattern)
    battery_level_pattern:  float64    # proxy for device quality
    contact_list_size:      int        # permission-based, for social graph

  segment:
    assigned_segment:       enum[BUREAU_PLUS, THIN_FILE, NEW_TO_CREDIT]
    segment_reason:         string
    data_completeness:      float64    # 0.0 - 1.0 (% of features available)

  scores:
    credit_score:           float64    # 0.0 - 1.0 (probability of default)
    risk_grade:             enum[A1, A2, B1, B2, C1, C2, D1, D2, DECLINE]
    model_id:               string     # which model produced the score
    model_version:          string
    confidence_interval:    [float64, float64]  # [lower_bound, upper_bound] of PD
    shap_top_features:      [FeatureAttribution]  # top 5 SHAP values
```

### Loan Record

```
LoanRecord:
  loan_id:               string          # globally unique loan identifier
  borrower_id:           string
  partner_id:            string          # origination partner (null if direct)
  product:
    type:                enum[TERM_LOAN, CREDIT_LINE, INVOICE_FINANCING, WORKING_CAPITAL]
    subtype:             string          # e.g., "seasonal_agriculture", "supply_chain"

  origination:
    application_id:      string
    application_date:    datetime
    approval_date:       datetime
    disbursement_date:   datetime
    approved_amount:     float64
    disbursed_amount:    float64
    interest_rate_apr:   float64         # annualized percentage rate
    tenure_months:       int
    emi_amount:          float64
    processing_fee:      float64
    insurance_premium:   float64         # credit life insurance (if applicable)
    credit_score_at_origination: float64
    risk_grade_at_origination:   string
    underwriting_path:   enum[AUTO_APPROVED, MANUAL_APPROVED, PARTNER_APPROVED]
    co_lending:
      bank_share_pct:    float64         # bank's share in co-lending (e.g., 80%)
      nbfc_share_pct:    float64         # NBFC's share (e.g., 20%)
      bank_partner_id:   string

  repayment:
    emi_schedule:        [EMIScheduleEntry]
    total_paid:          float64
    total_outstanding:   float64
    next_emi_date:       date
    next_emi_amount:     float64
    mandate_id:          string          # e-NACH mandate reference
    mandate_status:      enum[REGISTERED, ACTIVE, SUSPENDED, REVOKED]

  delinquency:
    current_dpd:         int             # days past due
    max_dpd:             int             # maximum DPD in loan life
    delinquency_bucket:  enum[CURRENT, DPD_1_30, DPD_31_60, DPD_61_90, NPA]
    bounce_count:        int             # failed auto-debit attempts
    collection_stage:    enum[NORMAL, PRE_DUE, SOFT, HARD, FIELD, LEGAL]

  status:
    current_state:       enum[APPLIED, APPROVED, DISBURSED, ACTIVE, DELINQUENT,
                              RESTRUCTURED, CLOSED, WRITTEN_OFF, CANCELLED]
    closure_type:        enum[MATURED, PREPAID, FORECLOSED, SETTLED, WRITTEN_OFF]
    closure_date:        datetime

EMIScheduleEntry:
  installment_number:    int
  due_date:              date
  principal_component:   float64
  interest_component:    float64
  total_emi:             float64
  status:                enum[UPCOMING, DUE, PAID, OVERDUE, WAIVED, RESTRUCTURED]
  payment_date:          datetime        # actual payment date (null if unpaid)
  payment_amount:        float64         # actual amount paid
  payment_channel:       enum[NACH, UPI, MANUAL, PARTNER_DEDUCTION]
  penalty_amount:        float64         # late payment penalty
```

### Fraud Signal Record

```
FraudSignal:
  application_id:        string
  borrower_id:           string
  assessment_timestamp:  datetime
  overall_fraud_score:   float64         # 0.0 - 1.0
  risk_tier:             enum[LOW, MEDIUM, HIGH, CRITICAL]
  disposition:           enum[AUTO_PASSED, MANUAL_REVIEW, AUTO_BLOCKED]

  signals:
    identity:
      synthetic_id_score:    float64     # probability of synthetic identity
      id_document_forgery:   float64     # probability of forged KYC docs
      identity_mismatch:     boolean     # PAN-Aadhaar name mismatch
      pep_sanctions_match:   boolean     # politically exposed person / sanctions list
    velocity:
      applications_7d:       int         # applications from this borrower in 7 days
      applications_30d:      int
      bureau_enquiries_7d:   int         # bureau pulls from this identity in 7 days
      same_device_apps_7d:   int         # applications from same device in 7 days
      same_ip_apps_7d:       int
    device:
      device_age_hours:      int         # time since device first seen
      root_jailbreak:        boolean
      emulator_detected:     boolean
      vpn_proxy_detected:    boolean
      location_spoofing:     boolean
    document:
      bank_statement_tampered: float64   # probability of PDF manipulation
      gst_return_fabricated:   float64   # probability of fake GST filing
      income_inflation_score:  float64   # ratio of claimed vs. verified income
    network:
      shared_device_count:   int         # other borrowers sharing this device
      shared_address_count:  int         # other borrowers at this address
      shared_bank_account:   int         # other borrowers with same bank account
      fraud_ring_id:         string      # cluster ID if part of detected ring
      ring_size:             int         # number of nodes in fraud ring
```

### AA Consent Record

```
AAConsentRecord:
  consent_id:            string          # AA consent handle
  borrower_id:           string
  aa_provider:           string          # Account Aggregator provider
  consent_status:        enum[REQUESTED, GRANTED, ACTIVE, EXPIRED, REVOKED]
  purpose:               string          # "Credit Assessment" / "Monitoring"
  data_types:            [enum]          # DEPOSIT, TERM_DEPOSIT, GST, INSURANCE
  fip_ids:               [string]        # Financial Information Providers
  consent_start:         datetime
  consent_expiry:        datetime
  frequency:
    unit:                enum[HOURLY, DAILY, MONTHLY, ONE_TIME]
    value:               int             # fetch allowed every N units
  data_range:
    from_date:           date            # earliest data requested
    to_date:             date            # latest data requested
  fetch_history:         [FetchEvent]

FetchEvent:
  fetch_id:              string
  timestamp:             datetime
  fip_id:                string
  data_type:             string
  status:                enum[SUCCESS, PARTIAL, TIMEOUT, FIP_ERROR, CONSENT_EXPIRED]
  records_received:      int
  latency_ms:            int
  data_range_received:   [date, date]    # actual date range of data received
```

---

## API Contracts

### Credit Assessment API (Partner-Facing)

```
// Initiate a credit assessment for a borrower
POST /api/v1/credit/assess
Request:
  partner_id:            string
  borrower:
    mobile_number:       string          # primary identifier
    pan:                 string          # optional: PAN for bureau pull
    gstin:               string          # optional: GSTIN for GST data
    business_name:       string
    business_type:       enum[PROPRIETORSHIP, PARTNERSHIP, LLP, PVT_LTD]
    sector:              string
  product:
    type:                enum[TERM_LOAN, CREDIT_LINE, INVOICE_FINANCING]
    requested_amount:    float64
    tenure_months:       int             # optional: for term loans
  consent:
    aa_consent_handle:   string          # pre-obtained AA consent
  device:
    fingerprint_id:      string
    ip_address:          string
    user_agent:          string
Response:
  assessment_id:         string
  status:                enum[PROCESSING, COMPLETED, REQUIRES_PSYCHOMETRIC]
  estimated_completion_s: int            # expected seconds to complete
  callback_url:          string          # webhook for async completion

// Get assessment result
GET /api/v1/credit/assess/{assessment_id}
Response:
  status:                enum[APPROVED, DECLINED, MANUAL_REVIEW, PENDING]
  decision:
    risk_grade:          string
    approved_amount:     float64         # may differ from requested
    interest_rate_apr:   float64
    tenure_months:       int
    emi_amount:          float64
    processing_fee:      float64
    total_cost:          float64         # total interest + fees over tenure
  adverse_action:                        # populated only if declined
    reasons:             [AdverseActionReason]
    counterfactual:      string          # what would change the decision
  offer_validity_minutes: int            # time before offer expires
  kfs_url:               string         # Key Fact Statement document URL

AdverseActionReason:
  code:                  string          # e.g., "INSUFFICIENT_CASH_FLOW"
  description:           string          # human-readable reason
  feature_name:          string          # which data point drove this
  feature_value:         string          # borrower's actual value
  threshold:             string          # what value would change the outcome
```

### Disbursement API (Internal)

```
// Initiate disbursement for an approved loan
POST /api/v1/disbursement/initiate
Request:
  loan_id:               string
  disbursement_method:   enum[UPI, IMPS, NEFT]
  beneficiary:
    account_number:      string
    ifsc_code:           string
    account_holder_name: string
    vpa:                 string          # UPI VPA (for UPI disbursement)
  amount:                float64
  idempotency_key:       string          # prevent double disbursement
Response:
  disbursement_id:       string
  status:                enum[INITIATED, PENNY_DROP_VERIFICATION, FRAUD_CHECK,
                              PROCESSING, COMPLETED, FAILED]
  estimated_completion_s: int

// Disbursement status callback
POST /webhook/disbursement/status
Payload:
  disbursement_id:       string
  loan_id:               string
  status:                enum[COMPLETED, FAILED, REVERSED]
  utr_number:            string          # Unique Transaction Reference
  completion_timestamp:  datetime
  failure_reason:        string          # if failed: "INVALID_ACCOUNT", "BANK_TIMEOUT"
```

### Collection API (Internal)

```
// Get collection actions due for today
GET /api/v1/collection/actions/today?stage={soft|hard|field}
Response:
  actions:               [CollectionAction]
CollectionAction:
  action_id:             string
  loan_id:               string
  borrower_id:           string
  dpd:                   int
  outstanding_amount:    float64
  action_type:           enum[SMS, WHATSAPP, IVR, PUSH, FIELD_VISIT]
  optimal_time:          datetime        # ML-recommended contact time
  priority_score:        float64         # 0.0 - 1.0 (resolution probability)
  message_template_id:   string
  previous_attempts:     int

// Record collection outcome
POST /api/v1/collection/outcome
Request:
  action_id:             string
  outcome:               enum[CONTACTED, NO_ANSWER, PROMISE_TO_PAY, PAYMENT_MADE,
                              DISPUTE, UNREACHABLE, SKIP]
  promise_date:          date            # if promise_to_pay
  promise_amount:        float64
  notes:                 string
```

---

## Core Algorithms

### Bank Statement Transaction Categorization

The bank statement parser must convert cryptic transaction narrations into meaningful categories to compute cash flow features.

```
FUNCTION categorize_transactions(statement):
    categorized = []

    FOR transaction IN statement.transactions:
        // 1. Rule-based matching (high precision)
        category = match_known_patterns(transaction.narration)
        IF category IS NOT NULL:
            categorized.append((transaction, category, confidence=0.99))
            CONTINUE

        // 2. Keyword extraction + NLP classification
        tokens = tokenize_and_normalize(transaction.narration)
        // Remove bank-specific codes, reference numbers, dates
        clean_tokens = remove_noise_tokens(tokens)

        // 3. Feature extraction for ML classifier
        features = {
            "amount": transaction.amount,
            "is_credit": transaction.type == CREDIT,
            "day_of_month": transaction.date.day,
            "day_of_week": transaction.date.weekday,
            "tokens": clean_tokens,
            "amount_bucket": bucket_amount(transaction.amount),
            "counterparty": extract_counterparty(transaction.narration),
            "channel": detect_channel(transaction.narration)
                        // UPI, NEFT, IMPS, CASH, ATM, POS
        }

        // 4. ML classification (35 categories)
        category, confidence = transaction_classifier.predict(features)

        // 5. Cross-validation with amount patterns
        IF category == "SALARY" AND transaction.amount != historical_salary_amount(statement):
            category = "BUSINESS_INCOME"  // salary should be consistent
            confidence *= 0.7

        IF category == "EMI" AND NOT is_round_number(transaction.amount):
            confidence *= 0.8  // EMIs are typically round amounts

        categorized.append((transaction, category, confidence))

    // 6. Post-processing: enforce consistency
    categorized = enforce_category_consistency(categorized)
    // E.g., if same counterparty appears monthly with same amount, likely EMI/salary

    RETURN categorized

FUNCTION match_known_patterns(narration):
    patterns = {
        r"(NEFT|RTGS|IMPS).*(SALARY|SAL)": "SALARY",
        r"EMI.*(HDFC|ICICI|SBI|BAJAJ)": "EMI_PAYMENT",
        r"(GST|TAX|TDS).*PAYMENT": "TAX_PAYMENT",
        r"NACH.*DR": "AUTO_DEBIT",
        r"ATM.*WDL": "CASH_WITHDRAWAL",
        r"UPI.*@": "UPI_TRANSFER",
        r"(RENT|LEASE)": "RENT",
        r"(ELECTRICITY|WATER|GAS|TELECOM)": "UTILITY",
    }
    FOR pattern, category IN patterns:
        IF regex_match(pattern, upper(narration)):
            RETURN category
    RETURN NULL
```

### Credit Scoring — Ensemble with Segment Routing

```
FUNCTION score_borrower(profile, product, partner_policy):
    // 1. Determine segment
    segment = determine_segment(profile)

    // 2. Load appropriate model from registry
    model_config = model_registry.get_champion(segment, product)
    challenger_config = model_registry.get_challenger(segment, product)

    // 3. Assemble feature vector
    features = feature_store.get_features(profile.borrower_id)
    IF features.completeness < model_config.min_completeness:
        // Insufficient data — request additional data or route to psychometric
        RETURN InsufficientData(missing=features.missing_critical_features)

    // 4. Champion model scoring
    champion_score = model_config.model.predict_proba(features)
    champion_shap = compute_shap_values(model_config.model, features, top_k=5)

    // 5. Challenger model scoring (shadow mode — does not affect decision)
    challenger_score = challenger_config.model.predict_proba(features)
    log_challenger_result(challenger_config, challenger_score, profile)

    // 6. Confidence interval based on data completeness
    confidence_width = base_confidence_width * (1 / features.completeness)
    confidence_interval = [
        champion_score - confidence_width / 2,
        champion_score + confidence_width / 2
    ]

    // 7. Map PD to risk grade
    risk_grade = map_pd_to_grade(champion_score, product)

    // 8. Generate adverse action reasons (even for approvals — stored for audit)
    adverse_reasons = generate_adverse_reasons(champion_shap, features, profile)

    RETURN CreditScore(
        pd=champion_score,
        risk_grade=risk_grade,
        confidence_interval=confidence_interval,
        shap_attributions=champion_shap,
        adverse_reasons=adverse_reasons,
        model_id=model_config.model_id,
        segment=segment,
        data_completeness=features.completeness
    )

FUNCTION determine_segment(profile):
    IF profile.bureau.bureau_available AND profile.bureau.active_tradelines >= 1:
        RETURN BUREAU_PLUS
    ELIF profile.cash_flow.monthly_credit_avg_6m > 0 OR profile.gst.gst_revenue_12m > 0:
        RETURN THIN_FILE
    ELSE:
        RETURN NEW_TO_CREDIT
```

### Fraud Detection — Multi-Layer Scoring

```
FUNCTION detect_fraud(application, device_signals, bureau_data):
    fraud_signals = FraudSignal()
    fast_path_score = 0.0

    // Layer 1: Velocity checks (< 20 ms)
    velocity = compute_velocity(application.borrower_id, application.device_id)
    fraud_signals.velocity = velocity
    IF velocity.applications_7d > 3:
        fast_path_score += 0.3
    IF velocity.same_device_apps_7d > 5:
        fast_path_score += 0.4

    // Layer 2: Device risk (< 50 ms)
    device_risk = assess_device_risk(device_signals)
    fraud_signals.device = device_risk
    IF device_risk.root_jailbreak OR device_risk.emulator_detected:
        fast_path_score += 0.5
    IF device_risk.device_age_hours < 24:
        fast_path_score += 0.2

    // Layer 3: Identity verification (< 100 ms)
    identity_risk = verify_identity(application.borrower, bureau_data)
    fraud_signals.identity = identity_risk
    IF identity_risk.synthetic_id_score > 0.7:
        fast_path_score += 0.5
    IF identity_risk.identity_mismatch:
        fast_path_score += 0.3

    // Fast path decision
    IF fast_path_score > 0.8:
        fraud_signals.overall_fraud_score = fast_path_score
        fraud_signals.risk_tier = CRITICAL
        fraud_signals.disposition = AUTO_BLOCKED
        RETURN fraud_signals

    IF fast_path_score < 0.2:
        fraud_signals.overall_fraud_score = fast_path_score
        fraud_signals.risk_tier = LOW
        fraud_signals.disposition = AUTO_PASSED
        RETURN fraud_signals

    // Slow path: graph analysis + document verification (< 2 seconds)
    // Layer 4: Network/graph analysis
    graph_signals = query_fraud_graph(
        application.borrower_id,
        application.device_id,
        application.address,
        application.bank_account
    )
    fraud_signals.network = graph_signals

    // Layer 5: Document forgery detection (if documents submitted)
    IF application.has_documents:
        doc_signals = detect_document_forgery(application.documents)
        fraud_signals.document = doc_signals

    // Combined model scoring
    combined_features = assemble_fraud_features(fraud_signals)
    overall_score = fraud_ensemble_model.predict(combined_features)
    fraud_signals.overall_fraud_score = overall_score

    IF overall_score > 0.7:
        fraud_signals.risk_tier = HIGH
        fraud_signals.disposition = MANUAL_REVIEW
    ELIF overall_score > 0.4:
        fraud_signals.risk_tier = MEDIUM
        fraud_signals.disposition = MANUAL_REVIEW
    ELSE:
        fraud_signals.risk_tier = LOW
        fraud_signals.disposition = AUTO_PASSED

    RETURN fraud_signals
```

### Early Warning Signal Detection

```
FUNCTION compute_early_warning(loan, borrower_profile, current_date):
    signals = []
    ews_score = 0.0

    // 1. Cash flow deterioration (from ongoing AA monitoring)
    IF borrower_profile.cash_flow IS RECENT:
        cash_flow_change = (
            borrower_profile.cash_flow.net_cash_flow_avg_3m /
            borrower_profile.cash_flow.net_cash_flow_avg_6m
        )
        IF cash_flow_change < 0.7:  // 30% decline in recent cash flow
            signals.append("CASH_FLOW_DETERIORATION")
            ews_score += 0.3

    // 2. GST filing gaps
    IF borrower_profile.gst.filing_gap_months >= 2:
        signals.append("GST_FILING_GAP")
        ews_score += 0.2

    // 3. Bureau deterioration
    IF borrower_profile.bureau.bureau_available:
        IF borrower_profile.bureau.enquiry_count_3m > 5:
            signals.append("EXCESSIVE_BUREAU_ENQUIRIES")
            ews_score += 0.25
        IF borrower_profile.bureau.max_dpd_12m > 30:
            signals.append("EXTERNAL_DELINQUENCY")
            ews_score += 0.35

    // 4. Repayment behavior on this loan
    bounce_rate = loan.delinquency.bounce_count / loan.emi_count_elapsed
    IF bounce_rate > 0.3:
        signals.append("HIGH_BOUNCE_RATE")
        ews_score += 0.3

    // 5. UPI transaction volume decline
    IF borrower_profile.upi.transaction_frequency_30d < 0.5 * historical_avg:
        signals.append("UPI_VOLUME_DECLINE")
        ews_score += 0.15

    // 6. ML model for combined EWS
    ews_features = assemble_ews_features(loan, borrower_profile)
    ml_ews_score = ews_model.predict(ews_features)
    ews_score = max(ews_score, ml_ews_score)  // take higher of rule-based and ML

    RETURN EarlyWarning(
        loan_id=loan.loan_id,
        score=ews_score,
        signals=signals,
        recommended_action=recommend_action(ews_score, signals, loan),
        days_to_predicted_default=predict_default_timeline(ews_score)
    )
```

---

## Key Data Structures

### Feature Store — Borrower Feature Vector

The feature store maintains pre-computed feature vectors for all active borrowers, enabling sub-200ms model inference.

```
Storage per borrower: 200 features × 8 bytes (float64) = 1,600 bytes
  Plus metadata: 128 bytes (borrower_id, segment, version, completeness)
  Plus SHAP cache: 40 bytes (top 5 features × 8 bytes)
  Total per borrower: ~1,770 bytes

10M active borrowers: 10M × 1,770 bytes = ~17.7 GB
  Fits in memory on a single machine for real-time scoring
  Partitioned by borrower_id hash across 4 shards (~4.4 GB each)

Update frequency:
  - Bureau features: refreshed on bureau pull (application time + monthly monitoring)
  - Cash flow features: refreshed on each AA data fetch (at application + periodic)
  - UPI features: refreshed daily from transaction feed
  - Psychometric features: computed once at assessment time (static)
  - Device features: updated on each application/login
```

### Fraud Detection Graph

```
Graph structure:
  Nodes: borrowers, devices, addresses, bank accounts, phone numbers, IP addresses
  Edges: "used_device", "lives_at", "has_account", "has_phone", "applied_from_ip"

  Node count: ~50M (10M borrowers + linked entities)
  Edge count: ~200M (average 4 relationships per entity)

  Storage: adjacency list format
    Per edge: 32 bytes (source_id + target_id + edge_type + timestamp)
    Total: 200M × 32 bytes = ~6.4 GB

  Fraud ring detection: connected component analysis
    Query: "find all borrowers within 2 hops of borrower X through shared devices/addresses"
    Latency: < 200 ms for 2-hop traversal (using pre-computed neighbor index)

  Ring scoring: connected components where:
    - Component size > 3 borrowers AND
    - Shared device count > 1 AND
    - Applications submitted within 7-day window
    → flagged as potential fraud ring
```

### Collection Waterfall State Machine

```
State machine per delinquent loan:
  States: CURRENT → PRE_DUE → DUE_DATE → GRACE → SOFT_1 → SOFT_2 →
          HARD_1 → HARD_2 → FIELD → LEGAL → WRITE_OFF

  Transition triggers:
    PRE_DUE: EMI due date - 3 days
    DUE_DATE: EMI due date
    GRACE: DUE_DATE + 1 day (auto-debit retry)
    SOFT_1: DPD = 3 (WhatsApp + SMS)
    SOFT_2: DPD = 7 (IVR call)
    HARD_1: DPD = 15 (call center assignment)
    HARD_2: DPD = 30 (escalated call center)
    FIELD: DPD = 45 (field visit assignment)
    LEGAL: DPD = 90 (legal notice)
    WRITE_OFF: DPD = 180 (provision and write-off assessment)

  Per state: action_type, channel, message_template, escalation_rules
  ML optimization: within each state, optimize:
    - Contact time (hour of day with highest answer rate for this borrower)
    - Channel preference (some borrowers respond to WhatsApp, others to IVR)
    - Message variant (A/B test templates for resolution rate)
```
