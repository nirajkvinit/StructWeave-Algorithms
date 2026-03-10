# Interview Guide — AI-Native India Stack Integration Platform

## 45-Minute Pacing Guide

### Minutes 0-5: Problem Framing (Set the Stage)

Start by establishing why this system exists and what makes it genuinely hard:

> "India Stack is a set of digital public infrastructure APIs—Aadhaar for identity verification, Account Aggregator for consent-based financial data sharing, DigiLocker for verified documents, eSign for digital signing, and UPI for real-time payments. The challenge is building an intelligent middleware that composes these five independent DPI systems—each with different authentication models, encryption protocols, consent frameworks, data formats, and regulatory bodies—into seamless business workflows like loan origination. The key tensions are: each DPI has different reliability characteristics and latency profiles; consent is not a simple boolean but a rich, granular, time-bound artefact with different semantics per DPI; and the AI layer must extract maximum value from consent-gated, ephemeral data that cannot be stored beyond the consent period."

**Key signals to show immediately:**
- You understand India Stack is not a single API but five independent systems
- You recognize consent as the fundamental orchestration primitive (not just auth tokens)
- You articulate the specific engineering tension: composing unreliable, heterogeneous upstream APIs into reliable business workflows

### Minutes 5-15: High-Level Architecture (Core Design)

Draw the layered architecture:

1. **API Gateway**: Multi-tenant entry point with rate limiting, auth, and routing
2. **Workflow Engine**: DAG-based orchestrator that composes DPI calls into business workflows
3. **Consent Manager**: Manages heterogeneous consent models across all DPI components
4. **DPI Adapter Layer**: Five adapters (AA, eKYC, DigiLocker, eSign, UPI), each encapsulating the specific protocol, encryption, and error semantics of its DPI
5. **AI Intelligence Layer**: Feature extraction, credit scoring, fraud detection, document verification
6. **Data Layer**: Consent store, identity graph, workflow state, audit log, feature store

**Critical design decisions to articulate:**
- **Why adapters per DPI**: Protocols are fundamentally different (XML vs. REST, RSA vs. curve25519, sync vs. async). A generic abstraction would leak complexity. The adapter pattern gives us independent evolution per DPI.
- **Why saga pattern for workflows**: No distributed transactions across DPI providers. Can't rollback an Aadhaar OTP or un-fetch AA data. Saga with compensation actions provides eventual consistency.
- **Why separate consent manager**: Consent is not just authorization—it's a first-class business entity with its own lifecycle, scope, duration, and regulatory requirements. It deserves its own service.

### Minutes 15-25: Deep Dive — AA Data Pipeline (Show Depth)

This is where you differentiate. Go deep on the AA data fetch and credit scoring pipeline:

**AA Consent Flow:**
- Consent artefact with ORGANS properties (Open, Revocable, Granular, Auditable, Notice, Secure)
- Consent scope: FI types, FIP IDs, date range, frequency, DataLife
- User approves on AA's interface (redirect model)

**Data Fetch Challenges:**
- FIP latency varies 10x (2 seconds for large private banks to 90 seconds for cooperative banks)
- Solution: parallel multi-FIP fetch with progressive completion (don't wait for slowest FIP)
- Adaptive per-FIP timeouts based on EWMA of historical latency
- Multi-AA routing when same FIP accessible through different AAs

**Feature Extraction Pipeline:**
- Parse 4,000+ transactions in <2 seconds
- Categorize transactions using ML classifier (25 categories)
- Extract 200+ features: income regularity, expense volatility, EMI discipline, GST correlation, UPI behavior
- Store features (not raw data) to comply with consent DataLife restrictions

**Credit Scoring:**
- Gradient-boosted model on extracted features
- SHAP-based explainability (RBI requires rejection reasons)
- Continuous monitoring for feature drift and score distribution shift

### Minutes 25-35: Non-Functional Deep Dives (Show Breadth)

Pick 2-3 of these based on interviewer interest:

**Security & Compliance:**
- Five regulatory bodies (RBI, UIDAI, MeitY, CCA, NPCI) with different requirements
- Aadhaar number can never be stored (hash only; ₹1 crore penalty per violation)
- AA data encrypted end-to-end (curve25519 key exchange + AES-256)
- Hash-chained audit log for tamper-evident regulatory trail
- Consent revocation cascades through data deletion

**Scalability:**
- Scale each DPI adapter independently (different peak patterns)
- Per-tenant DPI quota management (noisy-neighbor prevention)
- Priority-based request queuing (interactive user P0 > batch P2)
- Data partitioning: consent store by tenant+time, audit by time, identity graph by user

**Reliability:**
- Circuit breaker per DPI provider with adaptive thresholds
- Graceful degradation: when UIDAI is down, fall back to Offline Paperless eKYC
- Workflow checkpoint and recovery: if platform crashes mid-workflow, resume from last checkpoint
- Progressive data completion: score with partial FIP data rather than fail entire workflow

### Minutes 35-42: Cross-DPI Fraud Detection (Show Integration Thinking)

This is the section that demonstrates staff-level thinking:

> "The most interesting fraud patterns are only visible when you correlate data across DPI boundaries. A synthetic identity attack passes eKYC (valid Aadhaar, OTP works) but AA data reveals zero financial history. Consent stuffing is only detectable by comparing the consent scope with the actual business purpose. Round-tripping shows up when you correlate UPI transactions with AA bank statement data."

Walk through the cross-DPI fraud detection algorithm:
1. Identity risk from eKYC (velocity checks, device fingerprinting)
2. Financial risk from AA data (dormant accounts, circular transfers)
3. Document risk from DigiLocker (name/address mismatches)
4. Composite scoring with weighted signals
5. Feedback loop: fraud outcomes improve the model over time

### Minutes 42-45: Trade-offs and Open Questions

End with mature engineering judgment:

> "Key trade-offs I'd want to discuss with the team: (1) Raw data retention vs. consent compliance—storing features is safer but loses re-analysis capability. (2) Multi-AA integration adds resilience but triples integration maintenance. (3) Credit scoring model complexity vs. explainability—deeper models score better but SHAP explanations become less intuitive. (4) Real-time fraud detection adds latency to every workflow—we need to decide which checks are inline vs. async."

---

## Common Interviewer Questions and Strong Answers

### Q1: "How do you handle a user who has accounts at 5 banks but one bank's FIP takes 90 seconds to respond?"

**Strong Answer:**
> "I'd use progressive completion. Initiate parallel fetches to all 5 FIPs. As each FIP responds, immediately start feature extraction on that FIP's data. Set adaptive timeouts per FIP based on their historical latency—maybe 10 seconds for a large private bank and 60 seconds for a cooperative bank. After 3 of 5 FIPs respond, compute a preliminary credit score. If the 4th and 5th FIPs respond within their timeout, recompute with more data and notify the client. If they timeout, flag the assessment as 'partial_coverage' with a confidence adjustment. The key insight is that 60% of the credit signal often comes from the primary salary account—so if we have that, partial data may be sufficient."

### Q2: "What happens when a user revokes their AA consent after you've already computed a credit score?"

**Strong Answer:**
> "Consent revocation triggers a cascade. First, delete all raw FIData under that consent. Second, check the DataLife parameter—if it's expired, delete extracted features too; if it's still active, schedule deletion at DataLife expiry. Third, the credit score itself is marked 'source_revoked' but NOT deleted—because (a) the business client may have already disbursed a loan based on it, and (b) we need the audit trail showing what decision was made and why. The score becomes read-only historical evidence, not an active decision input. Fourth, notify the business client that the underlying data authorization has been revoked and they should not use this score for new decisions. The audit log entries are never deleted regardless of consent status—that's a regulatory requirement."

### Q3: "Why not build your own Account Aggregator instead of integrating with existing ones?"

**Strong Answer:**
> "Three reasons: (1) Licensing—AAs must be RBI-licensed NBFCs with ₹2 crore minimum net worth and 12-18 months of regulatory process. That's not where we want to spend our time. (2) FIP coverage—existing AAs have already negotiated connectivity with 100+ FIPs. Building those connections from scratch would take years. (3) Trust boundary—the AA is a trusted intermediary between FIPs and FIUs. Being both the AI platform (FIU) and the consent manager (AA) creates a conflict of interest that regulators would scrutinize. Our value is in the AI intelligence layer and workflow orchestration, not in consent management infrastructure."

### Q4: "How do you prevent your credit scoring model from being discriminatory?"

**Strong Answer:**
> "Multiple layers. First, feature design: we exclude demographic features (age, gender, caste, religion, location as a proxy for ethnicity) from the scoring model. Second, disparate impact testing: we regularly test whether the model produces statistically different outcomes for protected groups (using aggregate, anonymized data). Third, SHAP explanations: every score comes with the top contributing factors, making it auditable. If 'UPI merchant diversity' systematically penalizes rural applicants, we catch it in the SHAP analysis. Fourth, we include sector-specific baselines—a seasonal business in agriculture should not be penalized for cash flow variance that's normal for their industry. The challenge is that even 'neutral' features like income regularity can be proxies for protected characteristics, so we run proxy discrimination tests quarterly."

### Q5: "Walk me through how you'd handle UIDAI going down for 2 hours."

**Strong Answer:**
> "Circuit breaker trips to OPEN state when UIDAI error rate exceeds 30%. Immediately, all in-flight eKYC sessions receive an error, and the workflow engine activates the fallback strategy. Primary fallback: Aadhaar Paperless Offline eKYC—this uses a pre-downloaded XML file that the user can generate from the UIDAI website. It doesn't require real-time UIDAI connectivity, provides the same identity data, but without the photo. If the user doesn't have offline eKYC XML, secondary fallback: DigiLocker-based identity verification (fetch PAN card and address proof). Third: manual document upload with AI-based verification (highest latency, lowest confidence). The workflow engine adjusts the verification confidence level based on the method used: AADHAAR_OTP > AADHAAR_OFFLINE > DIGILOCKER_DOCS > MANUAL_DOCS. Business clients configure their minimum acceptable confidence level. Every 30 seconds, the circuit breaker probes UIDAI with test traffic; when it's back, we revert to normal."

### Q6: "How do you ensure no one on your team can see individual users' bank transactions?"

**Strong Answer:**
> "Multiple controls. First, raw AA data is encrypted with per-session keys; the keys exist only in HSM and are destroyed after feature extraction. Even database administrators see encrypted blobs. Second, feature extraction happens in an automated pipeline with no human access—the service has a machine identity, not a human identity. Third, the feature store contains aggregated features (monthly income averages, not individual transactions). Fourth, production data access requires break-glass procedure: a JIRA ticket with justification, peer approval, time-limited access (1 hour max), and every query logged to the audit trail. Fifth, all non-production environments use synthetic data generated by a privacy-preserving data generator. Sixth, automated scanning checks for PII leakage in logs, dashboards, and data exports."

---

## Trap Questions and How to Handle Them

### Trap 1: "Shouldn't you just store all the raw AA data for better AI models?"

**Why it's a trap:** The interviewer is testing whether you understand the consent-gated data constraint. Storing raw data beyond consent terms violates RBI's AA framework guidelines.

**How to handle:**
> "That's tempting for model quality, but AA data retention is consent-gated. The consent artefact specifies a DataLife—typically 3-12 months—after which raw data must be deleted. We can store derived features (aggregated, anonymized) longer, and we can use the data for model training during the consent period. The key is to extract maximum signal upfront: compute all 200+ features during the consent-valid window, and design the model to work from features, not raw transactions. For model retraining, we use aggregate population statistics (not individual data) and the features computed during valid consent periods."

### Trap 2: "Can't you just use one API for everything? Why five adapters?"

**Why it's a trap:** Tests whether you understand the fundamental heterogeneity of India Stack.

**How to handle:**
> "Each DPI has a fundamentally different protocol. Aadhaar uses XML with RSA encryption and XML-DSIG signatures. AA uses REST with curve25519 key exchange and its own consent artefact format. DigiLocker uses REST with OAuth 2.0. eSign uses REST with PKI certificate signing. UPI uses its own protocol via NPCI. They have different authentication mechanisms, different encryption requirements, different error semantics, and different regulatory bodies. A single adapter would either be too generic (handling everything through if-else chains) or would leak the complexity of each DPI to the business logic layer. The adapter pattern gives us clean separation: each adapter speaks its DPI's native protocol and presents a uniform internal interface."

### Trap 3: "What if the AA provider gives you wrong data?"

**Why it's a trap:** Tests understanding of trust boundaries in the consent framework.

**How to handle:**
> "The AA doesn't provide data—it facilitates transfer. The data comes from the FIP (the bank), encrypted with keys that only the FIU (our platform) can decrypt. The AA never sees the plaintext data. So the question becomes: what if the FIP gives wrong data? That's a harder problem. We can cross-validate across signals—if the bank says income is ₹5 lakhs/month but GST filings (from DigiLocker) show revenue of ₹1 lakh/month, there's a discrepancy. We can also compare data from multiple FIPs for the same user. But ultimately, if a bank's API returns incorrect data, we're limited to flagging inconsistencies, not correcting them."

### Trap 4: "Why not process everything in real-time instead of using workflows?"

**Why it's a trap:** Tests understanding of the consent-gate pause model.

**How to handle:**
> "The workflow can't be fully real-time because consent approval is a human-in-the-loop step. When we create an AA consent request, the user must open their AA app, review the consent details, and explicitly approve. This takes 30 seconds to several minutes—sometimes hours if the user gets distracted. A pure request-response model would timeout. The workflow pattern with pause/resume at consent gates handles this naturally: the workflow pauses, the user approves at their own pace, the AA sends a callback, and the workflow resumes. Same for eSign—the user must provide an OTP for each document signing. These aren't steps we can eliminate or make async-invisible."

---

## Trade-off Discussions

### Trade-off 1: Feature Store vs. Raw Data Retention

| Dimension | Feature Store (chosen) | Raw Data Retention |
|---|---|---|
| **Regulatory compliance** | Compliant with consent DataLife restrictions | Risk of violating AA framework if not deleted on time |
| **Model retraining** | Limited to stored features; no new feature extraction from historical raw data | Full flexibility to extract new features from historical data |
| **Storage cost** | 2 KB per scoring event vs. 50 KB raw data | 25x more storage |
| **Re-analysis capability** | Cannot re-analyze raw data after consent expiry | Can recompute features if model changes |
| **Decision:** Feature store is the right default; for use cases requiring reanalysis, request longer DataLife in consent (user must agree) |

### Trade-off 2: Single AA vs. Multi-AA Integration

| Dimension | Single AA | Multi-AA (chosen) |
|---|---|---|
| **Integration effort** | One integration to maintain | 3-4 integrations; each AA has subtle API differences |
| **FIP coverage** | Limited by one AA's FIP partnerships | Union of all AAs' FIP coverage (broader reach) |
| **Availability** | Single point of failure | Failover between AAs if one is down |
| **Cost** | Negotiate volume discount with one AA | Higher fees (less leverage per AA); but competition keeps prices down |
| **Decision:** Multi-AA is essential for production; FIP coverage gaps with single AA directly reduce credit score coverage |

### Trade-off 3: Inline vs. Async Fraud Detection

| Dimension | Inline (chosen for critical checks) | Async (chosen for deep analysis) |
|---|---|---|
| **Latency impact** | Adds 200-500ms to workflow step | Zero impact on workflow latency |
| **Fraud prevention** | Blocks fraud before damage (no disbursement) | Detects fraud after the fact; may need clawback |
| **False positive impact** | Delays legitimate users if incorrectly flagged | No user impact; review queue for analysts |
| **Decision:** Hybrid—fast checks (velocity, device, identity consistency) inline; deep checks (circular transfers, pattern analysis) async with manual review |

---

## What Separates Senior from Staff-Level Answers

### Senior Engineer (L5/L6)

- Designs a working system that integrates all five DPI components
- Handles the standard non-functional requirements (scalability, reliability)
- Knows about encryption and basic security requirements
- Designs a reasonable data model and API layer
- Discusses scaling with horizontal pod scaling and database sharding

### Staff Engineer (L6+/L7)

All of the above, plus:

- **Consent as an architectural primitive:** Understands that consent is not just auth—it's a first-class business entity that shapes data lifecycle, AI model design, and system architecture. The entire platform is "consent-orchestrated," not just "consent-checked."

- **Cross-DPI correlation:** Sees that the most interesting (and hardest) problems emerge at the intersection of DPI components—synthetic identity detection requires eKYC + AA data, consent abuse detection requires AA consent patterns + business context, credit scoring requires AA data + DigiLocker documents.

- **Ephemeral data architecture:** Articulates the "train once, infer once" constraint—AA data is consent-gated and time-limited, so the AI layer must extract maximum value in a single pass. This is fundamentally different from typical ML platforms where data accumulates.

- **Regulatory multi-compliance:** Doesn't just say "we need to be compliant"—identifies the specific conflicts (UIDAI says delete after use; RBI says retain for 7 years; resolution: delete raw, retain audit hashes) and designs for them.

- **Trust boundary analysis:** Understands which parts of the system trust each other and which don't. The AA doesn't see plaintext data. The FIP can't see who's requesting. The platform can't trust FIP data quality. Each trust boundary has a specific cryptographic or protocol-level enforcement mechanism.

- **Graceful degradation as an explicit design dimension:** Doesn't treat DPI downtime as an edge case—designs the fallback matrix upfront, with confidence levels per fallback path, so the system always makes progress (possibly at lower quality) rather than blocking.

- **Data lifecycle as a first-class concern:** Designs the consent revocation cascade, data retention matrix, and regulatory reporting as integral parts of the architecture—not afterthoughts to be bolted on during compliance review.
