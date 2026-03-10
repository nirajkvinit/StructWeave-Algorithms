# 14.1 AI-Native MSME Credit Scoring & Lending Platform — Interview Guide

## Interview Structure (45 Minutes)

| Phase | Duration | Focus |
|---|---|---|
| **Phase 1: Requirements Scoping** | 8 min | Clarify lending scope (MSME vs. consumer, products, geography); establish scale and data availability constraints |
| **Phase 2: High-Level Architecture** | 12 min | Data ingestion architecture, credit scoring pipeline, disbursement flow, consent-based data model |
| **Phase 3: Deep Dive** | 15 min | Candidate-chosen area: alternative data scoring, fraud detection, collection optimization, or model governance |
| **Phase 4: Compliance & Fairness** | 7 min | Regulatory compliance, fair lending, model explainability, data privacy |
| **Phase 5: Trade-offs & Extensions** | 3 min | Scaling to new markets, embedded finance, co-lending models |

---

## Phase 1: Requirements Scoping (8 min)

### Opening Prompt

*"Design an AI-native credit scoring and lending platform for micro, small, and medium enterprises (MSMEs) in a market where 60% of borrowers have no credit bureau history."*

### Key Scoping Questions the Candidate Should Ask

| Question | Why It Matters | Strong Answer |
|---|---|---|
| "What percentage of borrowers have traditional credit bureau data vs. thin-file/no-file?" | Fundamentally changes the scoring architecture—bureau-rich vs. alternative data model | "60% thin-file means we need an entirely separate scoring approach; we can't rely on bureau as primary signal—we need bank statements, GST, UPI, and potentially psychometric data" |
| "What data sources are available? Is there an Account Aggregator framework or open banking?" | Data availability determines what alternative features are possible | "With AA framework, we get consent-based bank statements and GST data programmatically; without it, we need document upload and OCR—much slower and less reliable" |
| "What products are we offering—term loans, credit lines, invoice financing?" | Product mix affects underwriting, disbursement, and collection architecture | "Each product has different risk profiles and lifecycle: a 3-month working capital loan is very different from a 24-month term loan in terms of monitoring and collection" |
| "What is the disbursement expectation—instant or T+1?" | Instant disbursement via irrevocable payments fundamentally changes fraud detection requirements | "Instant disbursement via UPI means we have minutes, not days, for fraud detection—this is the defining architectural constraint" |
| "What regulatory framework governs digital lending in this market?" | Compliance shapes architecture non-negotiably: direct disbursement, KFS, cooling-off, data minimization | "Digital lending regulations mandate direct-to-borrower disbursement, fee transparency, and consent-based data access—these are architectural requirements, not afterthoughts" |

### Red Flags in Requirements Phase

- Does not ask about data availability (assumes bureau data exists for all borrowers)
- Does not distinguish between traditional and thin-file lending challenges
- Ignores regulatory compliance as an architectural driver
- Treats instant disbursement as a simple payment API call without considering fraud implications
- Does not ask about the target market's data infrastructure (AA, UPI, GST)

---

## Phase 2: High-Level Architecture (12 min)

### What Strong Candidates Cover

1. **Consent-based data architecture:** Explicitly describe how borrower data flows through the Account Aggregator framework with consent management. Differentiate between data that is pre-cached (bureau data from previous pulls) and data that requires fresh consent (bank statements, GST).

2. **Multi-model scoring architecture:** Articulate that different borrower segments (bureau-plus, thin-file, new-to-credit) require different models with different feature sets. A single model forced to handle all segments performs poorly.

3. **Fraud detection as a pre-disbursement gate:** Position fraud detection as a mandatory, fail-closed gate between approval and disbursement. Explain why fail-open (bypass fraud check if service is down) is unacceptable for irrevocable payments.

4. **Event-sourced loan lifecycle:** Describe how every state transition is captured as an immutable event for regulatory audit compliance and analytics.

5. **Embedded finance API layer:** Explain how partner platforms integrate lending at the point of sale, with partner-specific policies and co-lending capital allocation.

### Evaluation Criteria

| Criterion | Below Bar | At Bar | Above Bar |
|---|---|---|---|
| **Data architecture** | Assumes all borrowers have bureau data | Describes alternative data sources (bank statements, GST, UPI) | Designs consent-based data flow with graceful degradation for partial data; handles AA framework latency |
| **Credit scoring** | Single model for all borrowers | Separate models for different data availability segments | Champion-challenger framework with automated promotion; SHAP explainability; confidence intervals based on data completeness |
| **Fraud detection** | Basic KYC verification only | Application-time fraud scoring with velocity checks | Multi-layer architecture: fast-path (rules) + slow-path (graph); fail-closed pre-disbursement gate; post-disbursement stacking detection |
| **Regulatory awareness** | No mention of compliance | Mentions data privacy and consent | Designs around KFS, cooling-off period, direct-to-borrower disbursement, adverse action notices, fair lending monitoring |

---

## Phase 3: Deep Dive Options (15 min)

### Option A: Alternative Data Credit Scoring

**Probe questions:**
1. "How do you build a credit score for a borrower with zero bureau history?"
2. "Bank statement narrations are messy and bank-specific. How do you extract meaningful features?"
3. "How do you handle the case where a borrower has a bank statement but no GST data?"
4. "How do you know if your alternative data model is well-calibrated—that a predicted 5% default rate actually means 5% of those borrowers default?"

**What to listen for:**
- Understanding that alternative data features require substantial domain-specific engineering (not just "feed raw data into a neural network")
- Bank statement parsing with bank-specific parsers, NLP-based transaction categorization, and consistency validation
- Missingness-aware model architecture (intentional feature dropout during training)
- Calibration monitoring using predicted-vs-observed default rates binned by score decile
- Feature families: cash flow, GST compliance, UPI network, psychometric, device signals

**Trap question:** *"Why not use a large language model to analyze bank statements instead of building custom parsers?"*
- Weak answer: "Yes, an LLM would understand the narrations better."
- Strong answer: "LLMs are too slow (seconds per transaction vs. milliseconds for regex + lightweight classifier), too expensive ($0.01 per statement vs. $0.0001), non-deterministic (same narration may get different categories on different runs—unacceptable for credit decisions), and create explainability problems (regulator asks 'why was this classified as salary?' and we can't explain the LLM's reasoning). We use rule-based parsers for high-confidence patterns (85% of transactions) and a lightweight gradient-boosted classifier for the rest—fast, cheap, deterministic, and explainable."

### Option B: Fraud Detection in Digital Lending

**Probe questions:**
1. "How do you detect synthetic identity fraud—an identity constructed from real and fake data?"
2. "A borrower takes loans from 5 platforms simultaneously. How do you detect this?"
3. "How do you detect a fraud ring—multiple related applications that appear independent?"
4. "The fraud service goes down for 10 minutes. What happens to pending disbursements?"

**What to listen for:**
- Multi-layer fraud detection: velocity checks (fast, simple) → identity verification → device risk → graph analysis (slow, complex)
- Loan stacking detection via bureau refresh at T+3 and T+7 days after disbursement
- Graph-based fraud ring detection using shared device/address/bank account nodes
- Fail-closed pre-disbursement gate design with degraded-mode operation (rules-only for brief outages)
- Understanding that fraud detection precision matters more than recall (false positives block legitimate borrowers; false negatives cause financial loss)

**Trap question:** *"Couldn't you just set a high bureau score threshold to eliminate fraud?"*
- Weak answer: "Yes, requiring a 750+ bureau score would remove most fraud."
- Strong answer: "Two problems: (1) 60% of our target market has no bureau score, so we'd reject the majority of legitimate borrowers; (2) sophisticated fraud—synthetic identities, fabricated documents, loan stacking—can achieve high bureau scores through deliberate credit-building over months. Fraud detection must analyze behavioral patterns (velocity, device, network relationships) that are orthogonal to creditworthiness."

### Option C: Collection Optimization

**Probe questions:**
1. "You have 500 call center agents and 800K delinquent loans. How do you decide who to call?"
2. "How do you optimize the timing and channel for collection contacts?"
3. "A borrower's auto-debit fails. What is the retry strategy?"
4. "How do you prevent your collection practices from violating regulatory guidelines?"

**What to listen for:**
- ML-driven prioritization: P(payment | action, borrower_features) × outstanding_amount / action_cost
- Multi-channel optimization: different borrowers respond to different channels (SMS vs. WhatsApp vs. IVR)
- Bank-specific auto-debit retry strategies (success rates vary by bank, day, and time)
- Regulatory awareness: contact time windows, grievance integration, communication audit trails
- Understanding that collection is a resource allocation problem, not just a communication problem

**Trap question:** *"Why not just increase the number of auto-debit retries until payment succeeds?"*
- Weak answer: "Yes, more retries increase the chance of catching a funded account."
- Strong answer: "Each failed auto-debit costs ₹15-25 in bank charges (passed to borrower as penalty, causing resentment), increases the risk of mandate revocation (borrower contacts bank to revoke mandate after repeated deductions), and signals to the bank that this mandate has low quality (affecting future success rates). Maximum 3 retries per cycle, timed to coincide with salary credit days for that borrower's bank."

### Option D: Model Governance and Fair Lending

**Probe questions:**
1. "How do you ensure your alternative data model doesn't discriminate based on gender, caste, or religion?"
2. "A regulator asks you to explain why a specific borrower was declined. Walk me through the process."
3. "Your model's Gini coefficient drops from 0.44 to 0.38 over 3 months. What do you do?"
4. "How do you prevent borrowers from gaming your model once they understand which features matter?"

**What to listen for:**
- Understanding of proxy discrimination: features like pin code, device model, and UPI merchant categories can serve as proxies for protected attributes
- Adversarial debiasing during training + continuous fairness monitoring in production
- SHAP-based feature attribution for individual explanations; counterfactual explanations for actionable feedback
- Model monitoring pipeline: PSI for drift detection, vintage-based performance evaluation, fairness metrics disaggregated by protected attributes
- Feature engineering defenses against gaming: consistency over long periods is harder to fake than point-in-time values

**Trap question:** *"If you remove all proxy features (pin code, device model), won't you lose too much predictive power?"*
- Weak answer: "We have to accept lower accuracy for fairness."
- Strong answer: "Removing features is a blunt instrument that often doesn't solve the problem—other correlated features reconstruct the removed signal. Adversarial debiasing is more effective: it penalizes the model for learning representations that enable prediction of protected attributes, forcing it to find genuinely predictive features that are orthogonal to demographics. The accuracy loss is 2-5 Gini points—significant but manageable. We present the fairness-accuracy Pareto frontier to stakeholders and choose the operating point at the 'knee' of the curve."

---

## Phase 4: Compliance & Fairness (7 min)

### Must-Cover Topics

1. **RBI Digital Lending Directions:** Direct-to-borrower disbursement, KFS generation with APR, cooling-off period, grievance redressal, data minimization, DLA registration.

2. **Adverse action notices:** Every decline must cite specific, actionable reasons derived from actual model outputs (not generic templates). SHAP-based attribution mapped to human-readable reason codes.

3. **Consent-based data access:** AA framework enforces consent purpose, duration, and scope. Data must be deleted when consent expires. Derived features can be retained longer than raw data.

4. **Audit trail requirements:** Every credit decision, data access, and state transition immutably logged. 8-year retention. Cryptographic chaining for tamper evidence.

### Scoring Rubric

| Area | 1 (Poor) | 2 (Basic) | 3 (Strong) | 4 (Exceptional) |
|---|---|---|---|---|
| **Regulatory compliance** | No mention of digital lending regulations | Mentions KYC and data privacy | Designs around KFS, direct disbursement, cooling-off, consent management | Details APR computation, consent lifecycle management, grievance SLA tracking, data retention policies |
| **Fair lending** | No awareness of discrimination risk | Mentions not using protected attributes | Describes fairness monitoring metrics (demographic parity, equalized odds) | Implements adversarial debiasing, counterfactual explanations, fairness-accuracy Pareto analysis |
| **Explainability** | "The model decides" | Uses feature importance | SHAP-based individual explanations | Counterfactual explanations, adverse action reason code generation, confidence intervals from data completeness |

---

## Phase 5: Trade-offs & Extensions (3 min)

### Discussion Prompts

1. **"How would you extend the platform to a new country with different data infrastructure (no AA, no GST, no UPI)?"**
   - Strong: Identify which data sources are available (mobile money transaction logs, telco data, satellite imagery for agriculture lending); redesign feature engineering pipeline; retrain models from scratch (transfer learning limited because feature distributions differ fundamentally across markets); comply with local regulations.

2. **"How do you handle co-lending where a bank funds 80% and your NBFC funds 20%?"**
   - Strong: Real-time capital allocation with per-partner capital pools; atomic disbursement (both shares succeed or neither does); separate interest rate computation for each funder's share; regulatory reporting split by funding entity; handling of bank partner's credit policy overlays on top of platform scoring.

3. **"What happens when a macroeconomic shock (COVID-style) invalidates your credit models overnight?"**
   - Strong: Model trained on pre-shock data is unreliable for post-shock predictions; implement "circuit breaker" that tightens credit policy automatically when portfolio-level EWS signals spike; increase manual review percentage; accelerate model retraining with post-shock data; regulatory dialogue about moratorium and restructuring policies.

---

## Common Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Treating thin-file lending as the same problem as bureau-based lending | Without bureau data, the entire feature engineering, model architecture, and calibration approach must change | Design segment-specific models with segment-specific feature pipelines; the thin-file model is a different product, not a degraded version of the bureau model |
| Ignoring the AA data fetch latency in system design | AA fetches take 15–60 seconds, which dominates the end-to-end latency of the credit decision pipeline | Design for async data fetching; make decisions with partial data when sources timeout; score confidence intervals should widen with missing data |
| Treating fraud detection as a post-hoc analysis | With instant digital disbursement, fraud must be caught before disbursement (5-minute window); post-hoc detection means money is already lost | Pre-disbursement fraud gate (fail-closed); multi-layer scoring optimized for latency (fast rules + slow graph analysis); post-disbursement monitoring catches what real-time missed |
| Using generic templates for adverse action notices | Regulators require specific, individualized reasons based on the actual model output for each application | SHAP-based feature attribution mapped to human-readable reason codes; counterfactual explanations showing what would change the decision |
| Designing a single global credit model | Different borrower segments have fundamentally different feature availability and risk profiles | Segment-specific models (bureau-plus, thin-file, new-to-credit) with segment-specific features, training data, and performance metrics |
| Ignoring the auto-debit infrastructure complexity | NACH/e-mandate execution involves bank-specific file formats, processing windows, and success rate patterns | Bank-specific auto-debit optimization; retry timing based on historical success patterns; mandate lifecycle management |
