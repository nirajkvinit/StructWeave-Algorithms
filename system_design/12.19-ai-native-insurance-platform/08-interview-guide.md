# 12.19 AI-Native Insurance Platform — Interview Guide

## Overview

Designing an AI-native insurance platform is a senior/staff-level question that tests the intersection of ML systems design, financial regulatory compliance, event-driven architecture, graph databases, and behavioral pricing. It is richer than most system design questions because the "business logic" (underwriting, pricing, fraud detection) is itself an engineering problem—not a simple CRUD workflow. Interviewers are looking for candidates who understand that insurance is a regulated ML application, not just a web application that happens to use ML.

**Typical time allocation:** 45–55 minutes

---

## 45-Minute Interview Pacing

| Phase | Time | Focus |
|---|---|---|
| Requirements clarification | 5–7 min | Lines of business, real-time vs. batch, regulatory context, key differentiators (UBI/telematics) |
| Back-of-envelope estimation | 5–7 min | Quote QPS, telematics events/sec, claims volume, fraud graph size |
| High-level architecture | 8–10 min | Quote pipeline → telematics → claims FNOL → fraud scoring → regulatory layer |
| Deep dive (interviewer-directed) | 12–15 min | Underwriting pipeline OR fraud detection OR telematics OR regulatory compliance |
| Extensions and trade-offs | 5–7 min | CAT event scaling, model drift, behavioral pricing fairness |
| Wrap-up | 2–3 min | |

---

## Opening Phase: Requirements Clarification

### Questions the Candidate Should Ask

**Lines of business and scope:**
- "Which lines of insurance are we covering—auto only, or also home, renters, life?"
- "Are we building for a single US state to start, or 50-state coverage from day one?"
- "Is telematics-based behavioral pricing in scope, or is this a standard application-data-only underwriter?"

**Real-time requirements:**
- "What's the target customer experience for quoting—can we call external data bureaus synchronously, or must we return a score before external data arrives?"
- "For claims: are we targeting autonomous claims payment (no adjuster), or is the AI just a first-pass intake and triage system?"

**Scale:**
- "What's the expected policy count and annual quote volume?"
- "What percentage of policyholders are expected to opt into telematics?"

**Regulatory context:**
- "Is FCRA adverse action notice compliance in scope from day one?"
- "Are we expected to handle the 50-state rate filing process technically, or just flag it as an out-of-scope compliance function?"

### Strong Candidate Signal

A strong candidate immediately asks about the regulatory environment and frames it as an architecture constraint, not a post-launch compliance concern. They recognize that "which variables can be used in which state" is not a data problem—it is a configuration problem that shapes the entire feature pipeline and model deployment strategy.

---

## Deep Dive Phase: Common Interviewer Probes

### Deep Dive 1: Underwriting Pipeline Design

**Interviewer prompt:** "Walk me through how you'd design the real-time underwriting engine—from the moment a customer submits a quote request to the moment they see a bindable offer."

**Strong response covers:**
- External bureau calls (MVR, CLUE, credit) are the latency bottleneck; fire in parallel immediately on request receipt
- Preliminary quote pathway (application-data-only scoring) while bureau calls are in flight; reconcile after bureau data arrives
- State-parameterized feature set—the model doesn't run on all features; it runs on the state-approved feature subset
- Immutable risk score record written before policy binding—not after
- SHAP attribution computation async (post-scoring), not on the critical path
- Graceful degradation tiers (GLM → GBM → manual underwriting) when ML infrastructure has issues

**Trap question:** "Why not just train one big national model for all 50 states?"

**Expected answer:** A single national model cannot satisfy state-by-state regulatory requirements. A model trained on California data where credit score is prohibited must never have seen credit score as an input during training—otherwise the model may have implicitly learned credit score through proxy variables, invalidating the California rate filing. The algorithm, feature set, and sometimes the model weights themselves are approved on a per-state basis by the insurance commissioner. The system must be able to demonstrate to a California regulator that credit score was never used.

### Deep Dive 2: Fraud Detection Architecture

**Interviewer prompt:** "A newly submitted auto claim looks straightforward—a rear-end collision with two parties. How would you detect that this claim is part of an organized fraud ring?"

**Strong response covers:**
- Graph model: represent every entity (claimant, vehicle, provider, body shop, location) as a node; claims create edges
- 2-hop subgraph retrieval for every new claim: look at who the claimant has been in accidents with, which providers they've used, whether those providers appear in many other suspect claims
- GNN inference on subgraph: entity embeddings capture network context that is invisible to per-claim rules
- Batch ring detection (Louvain community detection) runs weekly on the full graph to surface structured fraud networks to SIU
- Real-time scoring on FNOL is synchronous (blocks payment decision); ring detection is batch (produces investigative leads)
- Fraud score must be explainable: which graph features (e.g., "this body shop appeared in 12 high-fraud claims in the past 6 months") drove the score

**Trap question:** "Why not just use rule-based fraud detection? Rules are interpretable and auditable."

**Expected answer:** Rule-based systems can catch known fraud patterns but are easily evaded by sophisticated rings that learn the rules. They also produce high false positive rates when tuned broadly. The fundamental limitation is that rules evaluate claims in isolation; organized ring fraud is defined by network structure, not individual claim characteristics. A claim can be completely legitimate in isolation (plausible accident description, reasonable claim amount) but be part of a coordinated network of 40 staged accidents—only the graph reveals this. Rules are still valuable as first-pass filters and for explainability, but they cannot substitute for graph-based detection.

### Deep Dive 3: Telematics Pipeline

**Interviewer prompt:** "A policyholder's smartphone SDK has been collecting driving data for 3 months and they believe their score is incorrect because the device was in the car while a different person was driving. How does your system handle this?"

**Strong response covers:**
- Driver identification is a real problem in telematics: device ≠ driver. High-quality systems use secondary signals (Bluetooth pairing with vehicle, trip start time alignment with known commute patterns, gyrometric fingerprinting) to estimate driver identity
- Trip-level dispute mechanism: customer can flag individual trips within a 30-day window; flagged trips are excluded from behavioral scoring pending investigation
- Explainability: the customer portal should show their rolling score, top contributing/detracting trips, and which behavioral dimensions (braking, speed, phone use) are pulling the score down—enabling meaningful dispute
- Data retention for disputes: aggregated trip features retained for 30 days; raw GPS available for 30 days only for dispute resolution, then purged
- Manual re-rating on dispute resolution: if trips are excluded, the score is recomputed and the premium adjusted retroactively if significant

**Trap question:** "Should the telematics system store raw GPS traces server-side to enable better dispute resolution?"

**Expected answer:** No. Storing raw GPS traces is a major privacy risk—it creates a detailed record of every location the customer has visited, creating liability for the insurer. A subpoena or data breach would expose extraordinarily sensitive personal data. The right design is to compute all features on-device and upload only aggregated trip metrics. For disputes, the customer can optionally upload a limited-window trace from their own device, which the insurer analyzes and discards. The privacy cost of raw GPS storage (in terms of consumer trust, regulatory risk, and breach liability) far exceeds the benefit.

### Deep Dive 4: Regulatory Compliance at Scale

**Interviewer prompt:** "Your data science team has trained a new model that significantly improves loss ratio prediction. How does it get from their laptop to production underwriting decisions?"

**Strong response covers:**
- Model artifact is committed to the model registry; does NOT go to production immediately
- Actuarial analysis: run disparate impact tests on all protected class proxies; document loss separation by model score decile
- Rate filing package: generate SERFF-format filing for each state the model will be used in; includes algorithm description, input variables, output definitions, and statistical exhibits
- State-by-state regulatory review: each state has its own timeline (15-day prior approval, file-and-use, use-and-file, or no-prior-approval, depending on state)
- Algorithm version registry: when State A approves the new model, the `rate_algorithm` config for State A is updated to activate the new model artifact; State B continues using the previous version
- Immutable history: the old rate_algorithm version is never deleted—policies bound under it must be ratable for regulatory audit for 7+ years

**Trap question:** "Can you just shadow-test the new model (run it without using its output for pricing) while waiting for regulatory approval?"

**Expected answer:** Shadow testing is valuable and common, but there is a subtlety: using the new model's output for any pricing-related decision (including pricing experiments or soft offers) before regulatory approval is a regulatory violation in prior-approval states. Shadow testing must be clearly documented as non-binding—the actual pricing decision must use only the approved algorithm. Shadow results can be used as evidence in the rate filing to demonstrate the model's predictive accuracy to the regulator, but cannot influence actual premiums until approved.

---

## Extension Questions

### Extension 1: CAT Event Handling

"A hurricane is making landfall. Within 2 hours, your FNOL volume is 100× normal. Walk me through how your system responds."

Good answer covers:
- Geospatial claims density detection triggers CAT mode automatically
- Conversational AI intake simplified to structured web form (cannot scale AI conversation at 100× volume)
- Fraud scoring shifted from synchronous to async (claim acknowledged immediately; fraud scored within 24 hours)
- Straight-through payment suspended for affected region (fraud scoring delay means payment cannot be auto-approved)
- CAT adjuster pool activation (pre-contracted surge staffing)
- FNOL queue must be durable with at-least-once delivery—no claims lost regardless of processing backlog

### Extension 2: Behavioral Pricing Fairness

"A policyholders' advocacy group claims that your telematics-based pricing discriminates against low-income drivers who live in urban areas (more stop-and-go, more nighttime driving, less highway). How would you respond architecturally?"

Good answer covers:
- Disparate impact analysis must test the behavioral score itself against income/geography proxies, not just individual features
- Actuarial justification: each behavioral variable must have documented correlation with loss probability, not just correlation with income
- Opt-out availability: telematics must be optional; standard pricing must be available at all times
- Some behavioral features may be legitimate risk predictors even if correlated with income (nighttime driving correlates with both lower income AND higher crash risk); others may be correlated with income without loss correlation and should be excluded
- Disclosure: the insurer must disclose which behavioral factors affect pricing; consumers must be able to improve their score

### Extension 3: Model Retraining Governance

"How often should you retrain the underwriting model, and what prevents a poorly trained version from going to production?"

Good answer covers:
- Retraining frequency: annually for filed algorithms (regulatory constraint), more frequently for fraud scoring (no rate filing required)
- Model risk management (MRM) framework: champion-challenger testing (new model on shadow quotes for 90 days); statistical validation against holdout; backtesting on recent loss cohort
- Disparate impact gate: must pass before any deployment consideration
- Rate filing activation: approved algorithm must be filed before use; cannot use a newly trained model without regulatory approval
- Rollback plan: previous model version stays in registry; can reactivate in < 1 hour if new model shows adverse behavior post-deployment

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---|---|---|
| Treating regulatory compliance as a post-launch concern | State insurance regulations shape the data model, feature pipeline, and model deployment from day one | Frame prohibited factors and rate filing as architecture constraints, not external requirements |
| Designing a single national model for all states | Rate algorithms are state-approved; different states may have different approved features and weights | Algorithm version registry with per-state activation |
| Assuming fraud scoring can be asynchronous | Fraud scoring on the FNOL path prevents fraudulent claims from entering the payment queue | Synchronous fraud scoring at FNOL; async only under CAT mode |
| Storing raw GPS server-side | Privacy liability, breach risk, regulatory exposure; consumer trust | Edge aggregation on device; feature vectors only uploaded; opt-in dispute window |
| Not addressing the bureau enrichment latency | External MVR/CLUE/credit calls are slow; synchronous waiting produces terrible UX | Parallel fan-out; preliminary quote with reconciliation |
| Ignoring loss ratio monitoring as an observability concern | Technical system health metrics don't detect model drift; mispriced risk is financially catastrophic | Actuarial monitoring (loss ratio by cohort, PSI) as first-class observability |
| One-size-fits-all fraud scoring | Individual claim scoring misses organized ring fraud | Graph-based detection with GNN for ring patterns; per-claim scoring only for individual signals |
| FCRA adverse action as an afterthought | FCRA requires specific reason codes and delivery timelines; missing deadlines is a regulatory violation | Adverse action notice generation is a synchronous step in the underwriting decision flow |

---

## Scoring Rubric

### Basic (passing score)
- Identifies quote → score → bind flow with external data enrichment
- Designs basic claims intake with fraud check
- Proposes telematics data collection at high level
- Acknowledges regulatory requirements exist

### Intermediate (strong hire)
- Designs parallel bureau fan-out with preliminary quote pathway
- Addresses state-by-state prohibited factors as a configuration problem
- Proposes fraud scoring at FNOL as synchronous; distinguishes from ring detection
- Designs telematics trip aggregation with behavioral score
- Addresses immutable risk score record for regulatory audit

### Advanced (exceptional hire / staff)
- Algorithm version registry with per-state regulatory gated activation
- GNN-based fraud ring detection over heterogeneous entity graph
- Loss ratio cohort monitoring as actuarial observability (not just technical metrics)
- Disparate impact testing gate before model deployment
- Edge-side aggregation for telematics privacy preservation
- CAT mode architecture for claims surge
- Bureau enrichment degradation handling with fallback tiers
- FCRA adverse action reason code generation from SHAP attribution

### Signals of Exceptional Depth
- Recognizes that prohibited factor exclusion must be verifiable by a regulator—not just applied at runtime but logged in the risk score record
- Understands that shadow testing a new model is subject to the same regulatory constraints as production use for pricing decisions
- Frames the telematics opt-in rate as an adverse selection signal (high-risk drivers opt out), suggesting actuarial monitoring of behavioral score lift over time
- Identifies the FCRA hard pull vs. soft pull distinction and its architectural implication for quote caching

---

## Interviewer Testing Signals

Use these prompts to test specific depth:

| Test | Prompt |
|---|---|
| Regulatory depth | "California prohibits using credit scores for auto insurance rating. How does your system guarantee a California applicant's credit score never influenced their premium?" |
| Fraud detection sophistication | "A claimant has no fraud history and their individual claim looks legitimate. Why might you still flag it for SIU review?" |
| Telematics privacy | "Your telematics system records a customer's 3am drive to a hospital. Should you use this information for any insurance purpose?" |
| Bureau enrichment failure | "Your MVR provider's API is down. What happens to your quote funnel?" |
| Model deployment | "Your new underwriting model is trained and validated. Can you deploy it to production today?" |
| CAT event scaling | "A wildfire is sweeping through a major metro area. Your FNOL rate just spiked 50× in 15 minutes. What does your system do without human intervention?" |
| Adverse action | "A customer was denied a policy. They call asking why. What information is your system required to provide, and within what timeframe?" |
