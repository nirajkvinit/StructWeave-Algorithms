# Interview Guide

## 45-Minute Interview Pacing

| Phase | Time | Focus | Deliverables |
|-------|------|-------|-------------|
| **1. Clarify & Scope** | 0-5 min | Understand requirements; ask clarifying questions | Functional scope, scale numbers, key constraints identified |
| **2. High-Level Design** | 5-20 min | Architecture diagram with core components | Scoring pipeline, feature stores, rules + ML, event flow |
| **3. Deep Dive** | 20-35 min | Dive into 1-2 critical components | Feature engineering pipeline OR model serving latency OR graph analysis |
| **4. Scale & Reliability** | 35-42 min | Scaling strategy and failure modes | Fail-open architecture, graceful degradation, model deployment |
| **5. Wrap-Up** | 42-45 min | Summary, trade-offs, extensions | Key design decisions, what you'd do with more time |

---

## Phase 1: Clarifying Questions to Ask

These questions demonstrate domain understanding. Ask 3-4 of the most impactful ones:

| Question | Why It Matters | Expected Answer |
|----------|---------------|-----------------|
| "Is scoring on the payment critical path (synchronous) or post-authorization (async)?" | Defines latency constraint and fail-open requirement | Synchronous; < 100ms |
| "What transaction types? Card-present, card-not-present, ACH, P2P?" | Different fraud patterns require different features | Multiple types; CNP is highest risk |
| "What's the expected fraud rate in the transaction volume?" | Determines class imbalance in training data (~0.1%) | 0.05-0.2% depending on channel |
| "Do we have labeled training data, or are we building from scratch?" | Cold-start vs. established system changes the ML approach | Assume established system with chargeback labels |
| "What's the acceptable false positive rate?" | Defines precision requirement; business-critical trade-off | < 5% of blocked transactions |
| "Are we building the rule engine, ML scoring, or both?" | Scoping—interviewer may want to focus on one | Both; hybrid architecture |
| "What's the analyst team size for manual review?" | Constrains how many cases can go to review queue | 20-50 analysts |

**Pro tip**: After asking 2-3 questions, state your assumptions for the rest: "I'll assume we're handling 10M+ transactions/day, sub-100ms latency, with a hybrid rules + ML approach. Let me know if you'd like me to adjust."

---

## Phase 2: High-Level Design Walkthrough

### What to Draw

1. **Payment service → Scoring API** (synchronous call)
2. **Decision Service** as orchestrator
3. **Rules Engine** (blocklists, velocity, geo-fencing)
4. **Feature Assembly** with two stores (real-time + batch)
5. **Model Serving** (ensemble: GBT + DNN + anomaly)
6. **Event Bus** connecting to async consumers
7. **Stream Processor** computing RT features
8. **Graph Engine** for fraud ring detection (async)
9. **Case Management** for analyst workflow

### Key Points to Articulate

- **Why hybrid rules + ML**: Rules for known patterns (fast, explainable, compliance-friendly); ML for novel patterns (adaptive, high-accuracy). Layers are complementary.
- **Why two feature stores**: Real-time features need sub-second freshness (velocity counters); batch features are pre-computed (spending profiles). Different SLAs, different infrastructure.
- **Why synchronous scoring**: Cost of missed fraud (amount + chargeback + reputation) > cost of 50-100ms latency. Fail-open circuit breaker handles availability risk.
- **Event-driven cold path**: Graph analysis, model retraining, case management don't have the 100ms constraint—decouple from hot path.

### Common Interviewer Follow-ups at This Stage

| Question | Strong Answer |
|----------|------|
| "What happens if the scoring service is down?" | "Fail-open: allow the transaction, queue for async review, alert operations. We never block payments because the fraud system is unavailable." |
| "Why not just use rules?" | "Rules catch known patterns but require manual creation. Fraudsters evolve faster than humans write rules. ML adapts to novel patterns automatically from data." |
| "Why not just use ML?" | "ML is a black box—regulators need explainability. Rules provide immediate defense (blocklists, sanctions). ML needs labeled data and time to train. Rules are the safety net." |

---

## Phase 3: Deep Dive Options

### Option A: Feature Engineering Pipeline (Recommended)

This is the highest-signal deep dive because it shows ML systems knowledge and real-time engineering.

**Key points to cover**:

1. **Real-time features**: Velocity counters using atomic increments in distributed cache. Sliding window implementation (tumbling windows + interpolation). Explain why atomic operations matter (race condition with concurrent transactions).

2. **Batch features**: Pre-computed hourly/daily. Spending profiles, geo-centroids, chargeback rates. Key insight: must use point-in-time semantics for training (no future data leakage).

3. **Feature vector assembly**: Parallel multi-get from RT + batch stores. Default value strategy for missing features. Latency budget: 15-30ms for full assembly.

4. **Feature store design**: L1 (in-process cache) → L2 (distributed cache) → L3 (persistent store). Hit rate optimization. What happens on cache miss.

### Option B: Model Serving and Deployment

1. **Ensemble architecture**: Why multiple model types (GBT for tabular, DNN for interactions, anomaly for zero-day). Weighted aggregation.
2. **Latency optimization**: Model compilation, pre-warming, off-heap memory. Cold start problem and pre-warm solution.
3. **Canary deployment**: Shadow mode → 5% canary → gradual rollout. Automatic rollback criteria. Why you can't A/B test fraud models naively (the act of blocking changes the data distribution).
4. **Model explainability**: SHAP values per prediction. Why explainability is a regulatory requirement, not a nice-to-have.

### Option C: Graph-Based Fraud Ring Detection

1. **Entity resolution**: Building the graph from shared identifiers (device, IP, address, phone).
2. **Community detection**: Louvain algorithm for finding clusters.
3. **Risk propagation**: Label spreading from confirmed fraud nodes through the graph.
4. **Supernode problem**: Degree-capped traversal to prevent graph explosion.
5. **Why async**: Full graph traversal (200ms-10s) incompatible with 100ms scoring. Pre-compute graph risk scores as batch features.

---

## Trap Questions and Strong Responses

### Trap 1: "Can't you just threshold the ML score?"

**Weak answer**: "Yes, we set a threshold at 0.5 and block everything above."

**Strong answer**: "A single global threshold is suboptimal because the cost of errors varies by context. A false positive on a $5 coffee is customer annoyance; a false positive on a $5,000 appliance purchase is lost revenue and potential customer churn. We use dynamic thresholds that adjust by: transaction amount (higher amount = lower block threshold), user trust level (long-tenured accounts get benefit of doubt), merchant risk category, and channel type. Additionally, the 'review' zone between allow and block enables human-in-the-loop decisions for ambiguous cases."

### Trap 2: "Why not train one big model instead of an ensemble?"

**Weak answer**: "Ensembles are always better."

**Strong answer**: "Different architectures excel at different aspects. GBT handles tabular features with clear decision boundaries—it excels at rules-like patterns in a learnable way. Neural networks capture non-linear feature interactions that GBT misses—like the combination of 'new device + unusual hour + round amount' being much more suspicious than any individual signal. Anomaly detection models don't need fraud labels at all—they learn 'normal' and flag deviations, catching zero-day attacks that supervised models haven't been trained on. The ensemble is not just about accuracy; it's about covering different failure modes."

### Trap 3: "Isn't the 100ms budget too tight? Why not go async?"

**Weak answer**: "The requirement says 100ms, so we need to meet it."

**Strong answer**: "The 100ms budget is driven by the economic argument: a completed fraudulent transaction costs the fraud amount plus chargeback fees ($25-50) plus regulatory reporting cost plus reputation damage. For a $1,000 fraudulent transaction, the total cost is $1,100+. The cost of 100ms added latency to the payment flow is nearly zero in user experience—humans can't perceive sub-200ms delays. The math overwhelmingly favors inline scoring. The real engineering challenge is making 100ms achievable—pre-computed features, compiled model inference, and circuit breakers for graceful degradation."

### Trap 4: "How do you handle the cold-start problem for new users?"

**Weak answer**: "We don't have historical features, so we score them normally."

**Strong answer**: "New users are inherently higher risk because we lack behavioral history—and fraudsters know this, so they exploit new accounts. For new users: (1) Batch features are replaced with segment-level defaults (average behavior for users with similar demographics/channel). (2) Real-time features still work—velocity counters start from zero, which is actually useful (a new user making 5 transactions in 1 minute is suspicious). (3) We weight rules more heavily than ML for new accounts—the rules engine applies tighter thresholds (lower block threshold). (4) Device and IP reputation features are still available—even for a new user, we know if the device was previously used for fraud. (5) Graph features work: a new account connecting to known fraud-associated entities is immediately flagged."

### Trap 5: "How do you retrain without introducing bias?"

**Weak answer**: "We retrain weekly on new data."

**Strong answer**: "The feedback loop has a critical selection bias: we only get labels for transactions we flag (analyst dispositions) or that result in chargebacks. Transactions we allow pass without verification—if we're missing a fraud pattern, we'll never learn about it from our own labels. Solution: (1) Random sampling—0.1% of allowed transactions are reviewed by analysts regardless of score, providing unbiased ground truth. (2) Point-in-time features—training uses feature snapshots from the moment of scoring, not current features, preventing data leakage. (3) Label calibration—analyst dispositions are cross-validated against chargebacks to measure analyst accuracy. (4) Population stability monitoring—if the model changes the score distribution significantly, we know it's changing the data it will learn from."

### Trap 6: "What about adversarial attacks on the model?"

**Weak answer**: "We use adversarial training."

**Strong answer**: "Adversarial drift is the defining challenge. Fraudsters test the system by observing which transactions get blocked and adapting. Defenses: (1) Don't expose raw scores externally—only return allow/block/review, not the numerical score, so attackers can't gradient-ascend against it. (2) Rate-limit scoring calls per entity to prevent systematic probing. (3) Ensemble diversity—even if an attacker finds the GBT's blind spot, the DNN and anomaly detector provide independent detection surfaces. (4) Feature importance monitoring—if a previously strong feature drops in importance, fraudsters may have learned to camouflage on that dimension. (5) Continuous feature expansion—regularly add new signals (behavioral biometrics, session patterns, network metadata) that attackers haven't yet learned to evade."

---

## Trade-off Discussions

### Precision vs. Recall

| Approach | Precision | Recall | When to Use |
|----------|----------|--------|------------|
| Conservative (high threshold) | High (~98%) | Lower (~85%) | Low-value transactions, trusted users |
| Balanced | Medium (~92%) | Medium (~93%) | Default for most transactions |
| Aggressive (low threshold) | Lower (~80%) | High (~99%) | High-value, new accounts, high-risk merchants |

**Key insight**: The optimal operating point is not global—it varies by segment. A luxury goods merchant tolerates more false positives than a grocery store.

### Rules-First vs. ML-First

| Dimension | Rules-First | ML-First |
|-----------|-----------|---------|
| Latency | Lower (rules are faster) | Higher (ML adds 20-30ms) |
| Explainability | High (deterministic logic) | Lower (needs SHAP/LIME) |
| Adaptability | Low (manual updates) | High (learns from data) |
| Coverage | Known patterns only | Known + novel patterns |
| Maintenance | High (rule proliferation) | Lower (automated retraining) |
| Compliance | Easier to audit | Requires model governance |

**Recommended**: Rules first (fast, cheap, explainable) as a filter, then ML for what rules miss.

### Feature Store: Speed vs. Freshness vs. Cost

| Feature Type | Speed | Freshness | Cost | Best For |
|-------------|-------|-----------|------|---------|
| In-process cache | < 0.1ms | 30s stale | Memory per pod | Top-10K entities |
| Distributed cache | 1-3ms | < 1s stale | Dedicated cluster | All RT features |
| Key-value store | 5-15ms | < 1h stale | Standard storage | Batch features |
| Computed inline | 0ms (no fetch) | Real-time | CPU per request | Transaction-level features |

---

## Scoring Rubric (What Interviewers Look For)

| Dimension | Weak Signal | Strong Signal |
|-----------|-------------|---------------|
| **Requirements** | Jumps to design without scoping | Asks about latency, fail-open, transaction types, FP tolerance |
| **Architecture** | Monolithic "fraud check" box | Separated hot path (scoring) from cold path (graph, retraining, cases) |
| **ML Knowledge** | "Use a random forest" | Discusses ensemble rationale, feature engineering, training/serving skew |
| **Feature Engineering** | Ignores features; focuses only on model | Designs dual-speed feature store; discusses velocity counters, point-in-time |
| **Reliability** | No failure discussion | Fail-open architecture; circuit breakers per dependency; graceful degradation levels |
| **Scale** | Vague "just scale horizontally" | Specific: feature store sharding, stream processor partitioning, model pre-warming |
| **Adversarial Thinking** | Treats it as a static ML problem | Discusses adversarial drift, feedback loops, model evasion |
| **Trade-offs** | One-size-fits-all thresholds | Dynamic thresholds by segment, precision/recall trade-off by context |
| **Compliance** | Ignores regulatory aspects | Mentions GDPR right-to-explanation, SAR filing, PCI-DSS for card data |

---

## Extensions (If Time Permits)

| Extension | Key Points |
|-----------|-----------|
| **Real-time graph queries** | For high-value transactions, run a limited 2-hop graph query inline; cache results aggressively |
| **Behavioral biometrics** | Typing speed, mouse movement, touch pressure as features; requires SDK integration |
| **Cross-merchant intelligence** | Network effect: fraud on Merchant A's device → elevated risk for same device on Merchant B |
| **Synthetic identity detection** | Graph-based detection: multiple "identities" sharing thin-file attributes suggest synthetic IDs |
| **Generative AI for case summarization** | LLM generates investigation summaries from transaction history and graph context |
| **A/B testing fraud models** | Can't naively A/B test (blocking changes the outcome); use bandit approaches or shadow scoring |
