# AI-Native Procurement & Spend Intelligence --- Interview Guide

## 1. The 45-Minute Pacing Guide

### Minute 0--3: Problem Scoping (Critical Start)

**What the interviewer expects**: Clarify the scope before jumping into design. AI-native procurement is a massive domain---you must narrow it.

**Key clarifying questions to ask**:

1. "Which procurement workflow should I focus on---the full source-to-pay lifecycle, or a specific area like spend analytics or autonomous PO generation?"
2. "What's the scale? Single enterprise or multi-tenant SaaS serving thousands of companies?"
3. "How much AI autonomy are we targeting? Should the system be able to generate POs without human approval?"
4. "What's the regulatory environment? SOX compliance? Government procurement?"
5. "Should I design the ML pipeline infrastructure, or assume ML models exist and focus on the platform?"

**Scoping decision**: If you try to cover everything, you'll design nothing well. The strongest approach is to commit to a focused scope (e.g., "I'll design a multi-tenant spend intelligence platform with autonomous PO generation, focusing on the ML classification pipeline and the PO workflow engine") and go deep.

### Minute 3--8: Requirements & Estimations

**Do**:
- State 5--7 functional requirements clearly
- State 3--4 non-functional requirements with specific numbers
- Provide a quick capacity estimation (transactions/day, storage growth, concurrent users)
- Explicitly state your consistency model choice and why (strong for POs, eventual for analytics)

**Don't**:
- Spend more than 5 minutes here
- List 20 requirements---pick the most architecturally interesting ones
- Skip non-functional requirements (this is where senior candidates differentiate)

**Strong answer example**: "For a $5B enterprise, we're looking at ~2M POs/year, 50K suppliers, 10K daily transactions to classify. I'll target p95 < 500ms for supplier search, < 2s for PO creation, and 95%+ spend classification accuracy. PO state must be strongly consistent; spend analytics can be eventually consistent with bounded staleness under 15 minutes."

### Minute 8--20: High-Level Design (Core Architecture)

**Architecture diagram should include**:
1. Client layer (web, mobile, API)
2. API Gateway with authentication
3. Core services (Intake, Sourcing, PO Engine, Approval Workflow)
4. ML Intelligence layer (Classification, Risk Scoring, Price Optimization)
5. Data stores (transactional DB, spend cube, feature store, document store)
6. Event bus for async communication
7. Document intelligence pipeline (OCR + NLP)

**Key points to hit**:
- Event-driven architecture for loose coupling between procurement services and ML pipeline
- CQRS: separate write path (PO creation) from read path (spend analytics)
- Feature store as the bridge between ML and operational services
- Agent orchestration layer for multi-agent AI coordination

**Data flow to explain**: Walk through the complete lifecycle of a purchase request:
```
Request → Intake → Budget Check → Supplier Match (w/ risk + pricing) →
PO Generation → Approval Routing → ERP Sync → Event → Spend Classification
```

### Minute 20--30: Deep Dive (Pick 1--2 Components)

The interviewer will either guide you to a component or you should propose one. Best choices:

**Option A: Spend Classification Engine** (ML-focused)
- Hierarchical classification architecture (L1→L4)
- Text embedding + vendor resolution pipeline
- Confidence calibration and human-in-the-loop routing
- Cold-start strategy for new tenants (global model → fine-tuned)
- Feedback loop: human corrections → model retraining

**Option B: Autonomous PO Decision Engine** (Systems + ML)
- Rule layer (hard constraints: budget, approved supplier, contract)
- ML layer (approval prediction model)
- Confidence thresholds for autonomy vs. fast-track vs. full approval
- Audit trail and explainability requirements (SOX)
- Anti-gaming: preventing split purchases to stay under autonomous threshold

**Option C: Supplier Risk Scoring** (Data engineering + ML)
- Multi-signal ingestion (financial, news, geopolitical, operational)
- Entity resolution (mapping news articles to supplier entities)
- Temporal smoothing (EWMA) to prevent score oscillation
- Graph-based concentration risk analysis
- Cold-start problem for new suppliers

### Minute 30--38: Scalability, Reliability, and Edge Cases

**Scalability points**:
- Tenant isolation strategy (row-level vs. schema vs. database)
- ML pipeline scaling (GPU auto-scaling, batch vs. online inference)
- Spend cube scaling (pre-aggregation, read replicas, result caching)
- Feature store scaling (online vs. offline stores)

**Reliability points**:
- Saga pattern for PO creation workflow (budget → PO → approval → ERP)
- Graceful degradation (if ML is down, POs still work without AI features)
- Circuit breaker for ERP integration (PO valid internally even without ERP sync)

**Edge cases to discuss**:
- Budget race condition (two POs for same cost center simultaneously)
- Model deployment during active classification (blue-green deployment)
- Supplier risk score spike (one bad news article vs. genuine crisis)
- Contract renewal during active POs (price change mid-flight)

### Minute 38--45: Security, Compliance, and Wrap-up

**Must mention**:
- SOX compliance: audit trail, separation of duties, control testing
- Tenant data isolation and ML data boundaries
- AI governance: explainability, bias monitoring, human override
- PII handling (supplier banking details, contact information)

---

## 2. Key Trade-Offs to Discuss

### Trade-Off 1: Autonomous PO Threshold vs. Process Efficiency

| Dimension | Low Threshold (more AI autonomy) | High Threshold (more human control) |
|-----------|----------------------------------|--------------------------------------|
| **Efficiency** | 80%+ POs auto-generated; minimal human involvement | 20--30% POs auto-generated; most require manual approval |
| **Risk** | Higher exposure to AI errors; rogue POs possible | Lower risk of unauthorized spending |
| **Compliance** | Requires robust audit trail and explainability | Traditional approval chain satisfies auditors easily |
| **User Trust** | Builds slowly; requires demonstrated accuracy | Immediate but limits AI value proposition |
| **Recommendation** | Start conservative, increase threshold as model accuracy proves itself; separate thresholds per category and risk level |

### Trade-Off 2: Global Model vs. Tenant-Specific Model

| Dimension | Global Model Only | Tenant-Specific Models | Hybrid (Recommended) |
|-----------|-------------------|------------------------|----------------------|
| **Accuracy (New Tenant)** | Good (80%+) | Poor (insufficient data) | Good (global baseline) |
| **Accuracy (Mature Tenant)** | Good but not optimal | Excellent (95%+) | Excellent |
| **Training Cost** | Low (one model) | High (N models for N tenants) | Medium (one global + incremental fine-tuning) |
| **Data Privacy** | Risk of cross-tenant leakage | Perfect isolation | Global model on anonymized data; fine-tuning on tenant data |
| **Maintenance** | Simple | Complex (N model lifecycles) | Medium (global retraining + on-demand fine-tuning) |

### Trade-Off 3: Real-Time Risk Scoring vs. Batch Scoring

| Dimension | Real-Time (per signal) | Batch (periodic) | Hybrid (Recommended) |
|-----------|------------------------|-------------------|----------------------|
| **Freshness** | Seconds | Minutes to hours | Seconds for critical signals; hours for routine |
| **Compute Cost** | High (rescore per signal) | Low (batch efficiency) | Medium |
| **Score Stability** | Noisy (every signal causes a change) | Stable (smoothed by batch) | Stable with fast response to critical events |
| **Implementation** | Complex (streaming + model serving) | Simple (batch job) | Two-path architecture |

### Trade-Off 4: Document Processing --- Synchronous vs. Asynchronous

| Dimension | Synchronous | Asynchronous (Recommended) |
|-----------|-------------|----------------------------|
| **User Experience** | Immediate results; user waits | Non-blocking; user notified when complete |
| **Resource Utilization** | GPU tied up during upload; wasteful for simple docs | GPU pool managed efficiently; priority queuing |
| **Throughput** | Limited by GPU availability | Handles burst traffic via queuing |
| **Complexity** | Simple request-response | Polling/push notifications; status tracking |

### Trade-Off 5: Spend Cube --- Pre-Aggregated vs. Live Query

| Dimension | Pre-Aggregated (MOLAP-style) | Live Query (ROLAP-style) | Hybrid (Recommended) |
|-----------|------------------------------|--------------------------|----------------------|
| **Query Latency** | Sub-second for pre-computed aggregations | Seconds to minutes depending on data volume | Fast for common queries; acceptable for ad-hoc |
| **Data Freshness** | Stale by refresh interval (15 min--1 hour) | Real-time | Near-real-time for common; real-time for ad-hoc |
| **Storage Cost** | Higher (redundant aggregated data) | Lower (query raw data) | Medium |
| **Query Flexibility** | Limited to pre-defined aggregations | Any query | Pre-aggregated for 80%; live for 20% edge cases |

---

## 3. Common Trap Questions

### Trap 1: "How would you handle spend classification for a brand new customer?"

**Bad answer**: "We'd train a custom model on their historical data."
**Why it's bad**: A new customer has no classified data. This answer ignores the cold-start problem.

**Good answer**: "We use a layered approach: 1) Start with a global model pre-trained on anonymized data from all tenants---this gives ~80% L2 accuracy from day one. 2) Supplement with industry-vertical templates that map common vendor names to categories. 3) Use active learning to strategically select the most informative transactions for human review, maximizing model improvement per annotation. 4) Fine-tune the tenant-specific model as classified data accumulates. Typically, we reach 90%+ accuracy within 30 days and 95%+ within 90 days."

### Trap 2: "Should autonomous PO generation be on by default?"

**Bad answer**: "Yes, for maximum efficiency."
**Why it's bad**: Ignores compliance risk, trust building, and regulatory requirements.

**Good answer**: "No. Autonomous PO generation should be opt-in, per-category, with configurable thresholds. The default is full approval workflow. To enable autonomy, the organization must: configure the approval threshold, demonstrate model accuracy above a minimum bar (tracked by the system), have an active contract with the supplier, and have the category eligible. We also require SOX-compliant audit trails and post-hoc sampling of autonomous decisions."

### Trap 3: "A supplier's risk score just spiked from 30 to 95 because of one news article. What do you do?"

**Bad answer**: "Immediately block all POs to that supplier."
**Why it's bad**: One news article could be noise, a rumor, or even about a different company with a similar name.

**Good answer**: "The system uses temporal smoothing (EWMA with α=0.3) so a single signal can't cause a score to jump from 30 to 95. But if it's a genuinely critical signal (sanctions, bankruptcy filing), the sanctions-specific path uses α=1.0 for immediate response. For non-critical signals: 1) Verify entity resolution (is the article about our supplier or a different company?). 2) Check signal source reliability weight. 3) Apply smoothed score update. 4) If the smoothed score crosses a warning threshold, generate an advisory alert (not a blocking action). 5) Only block POs if the score exceeds the critical threshold after smoothing AND the signal is from a high-reliability source."

### Trap 4: "How do you prevent employees from splitting purchases to stay under the autonomous approval threshold?"

**Bad answer**: "Set the threshold very low."
**Why it's bad**: Low thresholds defeat the purpose of autonomous PO generation.

**Good answer**: "Split purchase detection is a multi-layered defense: 1) **Rule-based**: Flag when the same requester creates 2+ POs to the same supplier within 48 hours that sum to above the threshold. 2) **Statistical**: Detect clustering of PO amounts just below the threshold (e.g., if the threshold is $5,000, flag a pattern of $4,900 POs). 3) **ML-based**: Train a model on historical split purchase patterns to catch sophisticated circumvention. 4) **Process**: Flagged split purchases are escalated to the procurement manager with evidence. 5) **Deterrence**: Quarterly audit reports on split purchase attempts, shared with management."

### Trap 5: "What happens if the ML classification model produces biased results?"

**Bad answer**: "We'd retrain the model."
**Why it's bad**: Doesn't explain how you detect bias or what kind of bias.

**Good answer**: "First, define what bias means in this context: are we concerned about classification accuracy varying by supplier size, geography, or industry? We monitor for this by: 1) Segmenting accuracy metrics by supplier attributes (country, size, category). 2) Tracking whether small suppliers are systematically classified into lower-margin categories. 3) Comparing AI supplier recommendations against human choices, segmented by supplier demographics. If bias is detected: 4) Investigate the training data for representation imbalance. 5) Apply stratified sampling during training to ensure balanced representation. 6) Add fairness constraints to the objective function. 7) Report bias metrics in regular AI governance reviews."

---

## 4. Common Mistakes

### Mistake 1: Designing a Monolith Instead of Domain-Driven Services

**Symptom**: A single "Procurement Service" handling requisitions, POs, approvals, contracts, spend analytics, and risk scoring.

**Problem**: Procurement domains have different scaling characteristics (risk scoring is CPU/GPU-intensive; PO approval is I/O-bound; analytics is query-intensive), different consistency requirements (PO state is strongly consistent; spend analytics is eventually consistent), and different deployment cadences (ML models retrained weekly; business rules change monthly).

**Fix**: Decompose into domain services (Intake, Sourcing, Contracting, PO Engine, Spend Analytics, Risk Intelligence) with clear boundaries and event-driven communication.

### Mistake 2: Ignoring the SOX Audit Trail

**Symptom**: Designing autonomous PO generation without considering how auditors will verify the AI's decision-making.

**Problem**: SOX requires documented internal controls. If AI generates POs autonomously, every decision must be explainable and auditable: why this supplier? Why this price? Why was human approval not required?

**Fix**: Every autonomous decision logs: the rule checks passed, the ML model version and prediction confidence, the features used, the explanation generated, and the governance threshold configuration at the time of the decision.

### Mistake 3: Treating Spend Classification as a One-Time Batch Job

**Symptom**: Designing spend classification as a nightly batch process that classifies all transactions at once.

**Problem**: Spend classification must support both real-time (new PO needs immediate category for budget validation) and batch (reclassify historical transactions after taxonomy change). A pure batch design means POs created during the day have no classification until the next morning---breaking dashboard freshness SLOs and anomaly detection.

**Fix**: Streaming classification for new transactions (sub-second latency) plus batch reclassification for historical data. The streaming path uses the current model; the batch path can use updated models for retroactive improvement.

### Mistake 4: Assuming Vendor Names Are Consistent

**Symptom**: Using vendor name as a join key between POs, invoices, and contracts.

**Problem**: The same supplier appears as "International Business Machines", "IBM Corp", "IBM Global Services", "I.B.M.", and "IBM" across different data sources. Using raw vendor names as keys results in fragmented supplier profiles, incorrect spend aggregation, and duplicated supplier onboarding.

**Fix**: Vendor name resolution pipeline: exact match → fuzzy match → ML-assisted matching → human verification. All transactions linked to canonical supplier_id, never raw name. Periodic deduplication scans to catch new variations.

### Mistake 5: Making Risk Scores Too Sensitive

**Symptom**: Supplier risk scores fluctuate wildly with each new data point, causing constant alerts and alert fatigue.

**Problem**: Raw signal data is inherently noisy. A single negative news article, a temporarily delayed shipment, or a quarterly financial dip can cause disproportionate score changes. If scores are too sensitive, procurement teams learn to ignore alerts, defeating the purpose.

**Fix**: Temporal smoothing (EWMA), minimum observation periods, signal source reliability weighting, and separate alerting thresholds for trend changes vs. acute events. Only genuine, sustained risk changes should trigger actionable alerts.

---

## 5. Scoring Rubric (What Interviewers Look For)

| Dimension | Junior (Below Bar) | Mid-Level (Bar) | Senior (Above Bar) | Staff+ (Exceptional) |
|-----------|-------------------|------------------|---------------------|----------------------|
| **Problem Scoping** | Starts designing immediately | Asks basic scope questions | Narrows scope strategically; identifies key trade-offs upfront | Reframes the problem; identifies non-obvious requirements (SOX, data residency) |
| **Architecture** | Monolith or vague boxes | Reasonable microservices; misses ML infrastructure | Clean domain separation; addresses CQRS, event sourcing, feature store | Agent orchestration layer; closed-loop architecture; explains why each component exists |
| **Data Model** | Single database for everything | Separate stores for transactional and analytical | Feature store for ML; event-sourced PO lifecycle; proper indexing strategy | Tenant-scoped sharding; vector indexes for supplier matching; temporal tables for risk |
| **ML Integration** | "We'll use AI for classification" (no details) | Describes classification pipeline | Addresses cold-start, feedback loops, model versioning, human-in-the-loop | Global vs. tenant model trade-off; anti-oscillation for risk scores; active learning |
| **Compliance** | Not mentioned | Mentions audit trail | Designs for SOX: separation of duties, autonomous PO audit, control testing | AI governance: explainability, bias monitoring, human override, differential privacy |
| **Scale & Reliability** | Not addressed | Basic horizontal scaling | Saga pattern for PO workflow; graceful degradation; DR strategy | Multi-region with data residency; feature store scaling; GPU auto-scaling |
