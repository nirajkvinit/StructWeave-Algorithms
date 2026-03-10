# Observability — AI-Native India Stack Integration Platform

## Key Metrics

### Business Metrics

| Metric | Description | Target | Alert Threshold |
|---|---|---|---|
| **Workflow Completion Rate** | % of initiated workflows that reach COMPLETED status | > 85% | < 75% (critical); < 80% (warning) |
| **Consent Approval Rate** | % of consent requests approved by users | > 70% | < 55% (indicates UX or scope issues) |
| **eKYC First-Attempt Success** | % of eKYC attempts that succeed on first try | > 92% | < 85% (DPI degradation suspected) |
| **Credit Score Coverage** | % of assessments with full FIP data (no missing FIPs) | > 80% | < 65% (FIP availability issue) |
| **Time-to-Decision** | End-to-end latency from workflow start to credit assessment result | < 60 seconds (p50) | > 120 seconds p50 (workflow bottleneck) |
| **Loan Disbursement Success** | % of approved loans successfully disbursed via UPI | > 98% | < 95% (UPI/banking issue) |
| **Consent Revocation Rate** | % of active consents revoked by users (monthly) | < 5% (healthy) | > 10% (user trust concern) |
| **Monthly Active Users (per tenant)** | Unique users completing at least one DPI interaction | Growing MoM | Declining 2+ months (churn signal) |

### Technical Metrics — DPI Adapter Level

| Metric | Granularity | Collection | Purpose |
|---|---|---|---|
| **DPI Request Latency** | Per DPI component, per operation, percentiles (p50/p95/p99) | Histogram with 10ms buckets | Detect DPI degradation; tune adaptive timeouts |
| **DPI Success Rate** | Per DPI component, per FIP (for AA), per issuer (for DigiLocker) | Counter (success/failure/timeout) | Feed circuit breaker decisions; FIP reliability scoring |
| **DPI Error Code Distribution** | Per DPI component | Counter per error code | Identify systematic issues (e.g., UIDAI error 300 spike = OTP delivery problem) |
| **Concurrent DPI Sessions** | Per adapter | Gauge | Capacity planning; scale-up trigger |
| **DPI Quota Utilization** | Per DPI provider, per tenant | Gauge (% of allocated quota) | Prevent quota exhaustion; trigger backpressure |
| **Encryption Operation Latency** | Per operation type (key gen, encrypt, decrypt) | Histogram | HSM performance monitoring; detect crypto bottlenecks |

### Technical Metrics — Platform Level

| Metric | Description | Target |
|---|---|---|
| **API Gateway QPS** | Total requests per second across all endpoints | Track trend; alert on sudden 3x spikes |
| **API Gateway Error Rate** | % of requests returning 4xx/5xx | < 1% (4xx may be higher due to client errors) |
| **API Gateway Latency** | Gateway overhead (excluding DPI call time) | < 50ms p99 |
| **Workflow Engine Active Instances** | Number of workflows in RUNNING or PAUSED state | Track trend; capacity planning |
| **Workflow Step Transition Latency** | Time between workflow steps (engine overhead) | < 200ms p99 |
| **Event Bus Lag** | Delay between event production and consumption | < 5 seconds p99 |
| **Database Connection Pool Utilization** | % of pool used per database | < 60% (warning at 80%) |
| **Feature Extraction Throughput** | Transactions processed per second | Track vs. capacity ceiling |
| **ML Inference Latency** | Credit scoring model inference time | < 500ms p99 |
| **ML Inference Queue Depth** | Pending scoring requests | < 50 per GPU (scale trigger) |

### AI Model Metrics

| Metric | Description | Monitoring Approach |
|---|---|---|
| **Credit Score Distribution** | Distribution of scores across the 300-900 range | Daily histogram; alert on significant distribution shift (KL divergence > 0.1) |
| **Model Prediction Drift** | Change in average prediction over time | EWMA of daily average; alert on >5% change over 7 days |
| **Feature Drift** | Change in input feature distributions | Per-feature KS test; alert on p-value < 0.01 for key features |
| **Fraud Detection Precision** | % of fraud alerts that are true positives (confirmed by investigation) | Weekly manual review of sample; target > 70% |
| **Fraud Detection Recall** | % of actual fraud caught by detection system | Monthly analysis of missed fraud (reported by business clients) |
| **Score-to-Default Correlation** | Gini coefficient of credit score vs. actual default rate | Monthly cohort analysis; target Gini > 0.45 |
| **Transaction Categorization Accuracy** | % of transactions correctly categorized | Weekly sample validation; target > 90% |
| **Explanation Quality** | SHAP value stability for similar inputs | Monitor SHAP variance; alert on instability |

---

## Logging Strategy

### Log Levels and Contents

```
Log Hierarchy:

AUDIT (always on, tamper-evident, 7-year retention)
  - Every DPI interaction (request/response summaries)
  - Every consent lifecycle event
  - Every data access event
  - Every AI decision event
  - Every administrative action
  Format: structured JSON → audit log store (hash-chained)

ERROR (always on, 90-day retention)
  - DPI call failures with error codes
  - Workflow step failures with context
  - Encryption/decryption failures
  - Database errors
  - Unexpected exceptions with stack traces
  Format: structured JSON → centralized log aggregator

WARN (always on, 30-day retention)
  - DPI call latency exceeding adaptive threshold
  - Consent approaching expiry (< 7 days)
  - FIP success rate degradation
  - Quota utilization > 70%
  - Retry attempts

INFO (configurable per service, 7-day retention)
  - Workflow step transitions
  - DPI call initiation and completion
  - Feature extraction completion
  - Credit score generation
  Format: structured JSON → centralized log aggregator

DEBUG (off by default, 1-day retention when enabled)
  - Request/response payloads (SANITIZED — no PII)
  - Feature values for debugging scoring issues
  - Circuit breaker state transitions
  - Detailed timing breakdowns
  Format: structured JSON → debug log store
```

### PII Sanitization Rules

```
Sanitization Pipeline (applied before log storage):

Rule 1: Aadhaar Number Detection
  Pattern: \b\d{12}\b (12-digit numbers)
  Action: Replace with "AADHAAR_REDACTED"
  Additional: Check for Aadhaar with spaces (XXXX XXXX XXXX)

Rule 2: PAN Number Detection
  Pattern: \b[A-Z]{5}\d{4}[A-Z]\b
  Action: Replace with "PAN_REDACTED"

Rule 3: Bank Account Numbers
  Pattern: Account numbers in known formats (varies by bank)
  Action: Replace with last 4 digits only: "****1234"

Rule 4: Mobile Numbers
  Pattern: \b[6-9]\d{9}\b (Indian mobile format)
  Action: Replace with "MOBILE_REDACTED"

Rule 5: UPI VPA
  Pattern: \S+@\S+ (matches VPA format)
  Action: Replace with "VPA_REDACTED"

Rule 6: Names and Addresses
  Action: Not logged in INFO/DEBUG; included only in AUDIT (encrypted)

Rule 7: Financial Amounts
  Action: Allowed in logs (not PII); useful for debugging

Enforcement: Sanitization runs as middleware in the logging pipeline;
all log events pass through sanitizer before reaching any log store.
Unit tests verify sanitization for every log format.
```

---

## Distributed Tracing

### Trace Context Propagation

```
Trace Structure for a Loan Origination Workflow:

Root Span: workflow_execution (workflow_id=wf-123, template=loan_origination_v2)
│
├── Span: ekyc_step (step=ekyc, tenant_id=t-456)
│   ├── Span: ekyc_otp_request (dpi=UIDAI, operation=otp_generate)
│   │   └── Attributes: latency_ms=2100, otp_ref_id=xxx, result=OTP_SENT
│   ├── Span: ekyc_otp_verify (dpi=UIDAI, operation=otp_verify)
│   │   └── Attributes: latency_ms=1800, result=VERIFIED
│   └── Span: identity_resolution (operation=link_aadhaar)
│       └── Attributes: identity_node_id=user-789, confidence=0.95
│
├── Span: aa_consent_step (step=aa_consent)
│   ├── Span: consent_create (dpi=AA, aa_provider=finvu)
│   │   └── Attributes: consent_handle=aa-handle-xxx, scope=DEPOSIT_12M
│   ├── Span: consent_approval_wait (type=user_interaction)
│   │   └── Attributes: wait_duration_ms=45000, result=APPROVED
│   └── Span: consent_activate (operation=consent_lifecycle)
│       └── Attributes: new_state=ACTIVE
│
├── Span: data_fetch_step (step=data_fetch)
│   ├── Span: fip_fetch_hdfc (dpi=AA, fip=HDFC-FIP, aa=finvu)
│   │   └── Attributes: latency_ms=3200, accounts=2, transactions=2891
│   ├── Span: fip_fetch_icici (dpi=AA, fip=ICICI-FIP, aa=finvu)
│   │   └── Attributes: latency_ms=5100, accounts=1, transactions=1384
│   ├── Span: data_decrypt (operation=crypto)
│   │   └── Attributes: latency_ms=120, algorithm=AES-256-GCM
│   └── Span: feature_extraction (operation=ml_pipeline)
│       └── Attributes: latency_ms=1450, features=218, transactions=4275
│
├── Span: digilocker_step (step=digilocker_fetch)  // Parallel with data_fetch
│   ├── Span: doc_fetch_gst (dpi=DIGILOCKER, doc_type=GST_CERT)
│   │   └── Attributes: latency_ms=2800, format=XML, signature_valid=true
│   └── Span: doc_verify (operation=ai_verification)
│       └── Attributes: latency_ms=350, name_match=0.92, address_match=0.87
│
├── Span: credit_assessment_step (step=credit_assessment)
│   ├── Span: ml_inference (operation=credit_scoring, model=msme_credit_v3)
│   │   └── Attributes: latency_ms=380, score=742, confidence=0.89
│   └── Span: fraud_check (operation=fraud_detection)
│       └── Attributes: latency_ms=220, fraud_score=0.05, status=CLEAR
│
├── Span: esign_step (step=esign)
│   ├── Span: esign_initiate (dpi=ESIGN, esp=cdac)
│   │   └── Attributes: latency_ms=1500, document_hash=xxx
│   └── Span: esign_verify (dpi=ESIGN, operation=otp_verify)
│       └── Attributes: latency_ms=2200, result=SIGNED
│
└── Span: disbursement_step (step=disbursement)
    ├── Span: upi_transfer (dpi=UPI, operation=send)
    │   └── Attributes: latency_ms=3100, amount=450000, status=SUCCESS
    └── Span: workflow_complete (operation=finalize)
        └── Attributes: total_duration_ms=128500, result=COMPLETED
```

### Cross-DPI Correlation

Each DPI interaction is tagged with:
- `trace_id`: Platform-generated trace ID for the entire workflow
- `span_id`: Unique span for this specific DPI call
- `dpi_transaction_id`: The DPI provider's own transaction reference (UIDAI auth ref, AA consent handle, etc.)
- `consent_id`: The consent that authorized this interaction
- `workflow_id`: The parent workflow

This enables correlation across DPI boundaries: if a credit assessment is questioned, the trace shows every DPI call, every consent authorization, every data point, and every AI decision in the chain.

---

## Alerting Rules

### Critical Alerts (Page On-Call)

| Alert | Condition | Evaluation Window | Action |
|---|---|---|---|
| **Platform Down** | API Gateway 5xx rate > 10% | 2 minutes | Page on-call; check load balancer and backend health |
| **DPI Provider Down** | Circuit breaker OPEN for any DPI | Immediate | Page on-call; activate degradation mode; notify affected tenants |
| **Consent Store Unavailable** | Consent store read/write latency > 5 seconds or errors > 5% | 1 minute | Page on-call; all workflows blocked; check database health |
| **Audit Log Integrity Failure** | Hash chain verification fails | Hourly check | Page security team; potential tampering; preserve evidence |
| **Aadhaar Number in Logs** | Log sanitizer detects raw Aadhaar number pattern | Real-time | Page security team; immediate log purge; investigate leak source |
| **Data Breach Detected** | Anomalous data access pattern (10x normal volume from single tenant) | 5 minutes | Page security team; temporarily suspend tenant; investigate |
| **UPI Disbursement Failure Spike** | UPI failure rate > 5% in 5-minute window | 5 minutes | Page on-call; pause new disbursements; investigate with banking partner |

### Warning Alerts (Notify Team)

| Alert | Condition | Evaluation Window | Action |
|---|---|---|---|
| **eKYC Success Rate Drop** | First-attempt success < 88% | 15 minutes | Investigate UIDAI status; check OTP delivery rates |
| **FIP Latency Degradation** | Any FIP p95 > 2x its historical p95 | 10 minutes | Update adaptive timeout; consider routing away |
| **Consent Approval Rate Drop** | Approval rate < 60% for any tenant | 1 hour | Review consent scope; check AA provider UX; notify tenant |
| **ML Model Drift** | Credit score distribution KL divergence > 0.1 | Daily | Investigate feature drift; plan model retraining |
| **Quota Utilization High** | Any DPI quota > 80% | 5 minutes | Activate backpressure; review tenant allocations |
| **Encryption Key Expiry** | DPI adapter certificate < 30 days from expiry | Daily | Rotate certificate; update DPI provider registration |
| **Workflow Completion Rate Drop** | < 80% completion rate | 1 hour | Identify failing step; check DPI availability; review error distribution |

---

## Dashboards

### Executive Dashboard

```
Key Panels:
1. Total Daily Workflows (today vs. 7-day average) — single stat
2. Workflow Completion Rate (24h rolling) — gauge with red/yellow/green zones
3. Revenue Impact: Successful Assessments × Average Fee — single stat
4. DPI Health Status: Green/Yellow/Red per component — status grid
5. Top 5 Tenants by Volume — leaderboard
6. Consent Approval Funnel — funnel chart (requested → sent → approved → data fetched)
```

### DPI Operations Dashboard

```
Key Panels:
1. DPI Latency Heatmap: rows = DPI components, columns = time (5-min buckets), color = p50 latency
2. DPI Success Rate Timeline: per-component line chart (1-hour rolling)
3. DPI Error Code Distribution: stacked bar per component (last 24 hours)
4. Circuit Breaker Status: per-DPI current state (CLOSED/OPEN/HALF_OPEN)
5. FIP Performance Leaderboard: ranked by success rate × 1/latency
6. AA Data Fetch Latency Distribution: histogram per FIP
7. eKYC Method Distribution: OTP vs. biometric vs. offline (pie chart)
8. DPI Quota Utilization: per-provider gauge
```

### AI/ML Dashboard

```
Key Panels:
1. Credit Score Distribution: histogram (300-900 range, 50-point buckets)
2. Score Distribution by Tenant: violin plot per top-10 tenants
3. Feature Drift Monitor: KS statistic per top-20 features (last 30 days)
4. Model Prediction Trend: daily average score (30-day line chart)
5. Fraud Alert Volume: daily count with true-positive rate overlay
6. Transaction Categorization Accuracy: weekly sample accuracy trend
7. Feature Extraction Latency: p50/p95/p99 (last 24 hours)
8. GPU Utilization: per-GPU inference utilization gauge
```

### Consent Compliance Dashboard

```
Key Panels:
1. Active Consents by Type: AA vs. eKYC vs. DigiLocker vs. eSign (stacked area)
2. Consent State Distribution: ACTIVE/PAUSED/REVOKED/EXPIRED (donut chart)
3. Data Retention Compliance: % of data within consent DataLife vs. overdue
4. Consent Scope Analysis: average FI types per consent (are consents appropriately scoped?)
5. Revocation Timeline: time between consent creation and revocation (histogram)
6. Regulatory Audit Readiness: automated check results (pass/fail per check)
7. Data Deletion Queue: pending deletions for expired/revoked consents
8. Cross-DPI Consent Map: per-workflow, which consents are active for which DPI
```

---

## SLI/SLO Monitoring

### Service Level Indicators

| SLI | Definition | Measurement |
|---|---|---|
| **Availability** | % of requests that receive a non-5xx response | Total 2xx+3xx+4xx responses / Total requests × 100 |
| **eKYC Latency** | Time from OTP request to verified identity response | End-to-end including UIDAI call, measured at API gateway |
| **Workflow Completion** | % of workflows reaching COMPLETED within timeout | Completed workflows / (Completed + Failed + TimedOut) × 100 |
| **Data Freshness** | % of credit assessments using data fetched within consented window | Assessments with fresh data / Total assessments × 100 |
| **Consent Integrity** | % of data fetches backed by valid, active consent | Verified fetches / Total fetches × 100 (must be 100%) |
| **Audit Completeness** | % of DPI interactions with corresponding audit log entry | Audit events / DPI interactions × 100 (must be 100%) |

### SLO Targets and Error Budgets

| SLO | Target | Error Budget (30 days) | Budget Burn Alert |
|---|---|---|---|
| **Platform Availability** | 99.95% | 21.6 minutes downtime | > 50% budget burned in first 15 days |
| **eKYC Success (OTP)** | 92% first-attempt | 2.4M failures/month (at 80M volume) | > 3M failures in any 7-day window |
| **Workflow Completion** | 85% | 12M incomplete/month (at 80M volume) | < 80% completion in any 24-hour window |
| **Credit Score Latency** | < 3 seconds p99 | 1% of scores exceed 3s | > 2% exceeding 3s in any 1-hour window |
| **Consent Integrity** | 100% | Zero tolerance | Any violation = critical incident |
| **Audit Completeness** | 100% | Zero tolerance | Any missing audit event = critical incident |

### Error Budget Policy

```
When error budget is exhausted:

1. Freeze non-critical deployments
2. Redirect engineering effort to reliability improvements
3. Review and tighten circuit breaker thresholds
4. Increase monitoring granularity for affected SLI
5. Conduct incident review for top error contributors
6. Communicate with affected tenants about remediation plan

When error budget is healthy (> 50% remaining):

1. Normal deployment cadence
2. Allow experimental features behind feature flags
3. Permit DPI adapter upgrades and migrations
4. Allow onboarding of new tenants at full quota
```
