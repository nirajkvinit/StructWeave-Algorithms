# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Activities |
|------|-------|-------|----------------|
| 0-5 min | **Clarify** | Scope the problem | Ask about scale, constraints, regulatory requirements |
| 5-15 min | **High-Level** | Architecture overview | Draw main components, identify data flows, key decisions |
| 15-30 min | **Deep Dive** | Critical components | DDI detection engine, AI explainability, alert fatigue |
| 30-40 min | **Scale & Trade-offs** | Production concerns | Bottlenecks, failure scenarios, consistency vs availability |
| 40-45 min | **Wrap Up** | Summary | Recap decisions, discuss extensions, handle follow-ups |

---

## Phase 1: Clarify (0-5 min)

### Questions to Ask the Interviewer

```
MUST-ASK QUESTIONS:

1. SCALE:
   "What scale are we designing for?"
   - Number of healthcare organizations
   - Daily prescription volume
   - Concurrent users

2. CORE REQUIREMENTS:
   "Which CDS capabilities are in scope?"
   - Drug interaction alerts (DDI)
   - Diagnosis suggestions
   - Risk scoring
   - Clinical guidelines

3. REGULATORY:
   "What regulatory requirements apply?"
   - FDA (US market)
   - EU MDR / AI Act (EU market)
   - HIPAA compliance
   - Specific certifications needed

4. INTEGRATION:
   "How will this integrate with EHRs?"
   - CDS Hooks standard
   - Direct FHIR integration
   - Proprietary APIs

5. LATENCY:
   "What are the latency requirements?"
   - Inline with prescribing workflow (< 200ms)
   - Batch acceptable for some features

NICE-TO-ASK QUESTIONS:

6. "Should the system work offline or is cloud-only acceptable?"
7. "What's the expected read:write ratio?"
8. "Are there specific drug databases we should integrate with?"
9. "Do we need multi-language/multi-region support?"
```

### Confirming Scope

```
SCOPE CONFIRMATION TEMPLATE:

"Let me confirm my understanding:

We're designing a Clinical Decision Support System that provides:
- Real-time drug interaction alerts during prescribing
- [Diagnosis suggestions / Risk scoring / Guidelines - as confirmed]

Key constraints:
- Must integrate with existing EHRs via CDS Hooks
- [FDA SaMD / EU MDR] compliance required
- Latency target: [200ms] for DDI checks
- Scale: [X] organizations, [Y] daily prescriptions

Out of scope for this discussion:
- [Items interviewer confirmed as out of scope]

Is this understanding correct?"
```

---

## Phase 2: High-Level Design (5-15 min)

### What to Cover

1. **Start with the data flow** - "Let me walk through what happens when a clinician prescribes a medication..."

2. **Identify major components**:
   - API Gateway (CDS Hooks endpoint)
   - Drug Interaction Service
   - Knowledge Base (drug interactions, guidelines)
   - Alert Manager
   - Audit Service

3. **Make key decisions explicit**:
   - Sync vs async communication
   - Caching strategy
   - Database choices

### Whiteboard Approach

```
DRAWING ORDER:

1. Start with EHR on the left
2. Draw API Gateway
3. Add core CDS services
4. Show knowledge base / data stores
5. Add caching layer
6. Connect with arrows showing data flow
7. Label with protocols (CDS Hooks, FHIR)

VERBALIZE AS YOU DRAW:

"When a clinician prescribes a medication in the EHR,
the EHR sends a CDS Hooks request to our API Gateway.
The gateway validates the SMART token and routes to
our Drug Interaction Service. This service..."
```

### Key Architectural Decisions to Justify

| Decision | Options | Recommendation | Justification |
|----------|---------|----------------|---------------|
| **Service Architecture** | Monolith vs Microservices | Microservices | DDI (high volume) scales differently than ML inference (GPU) |
| **Communication** | Sync vs Async | Sync for alerts | Clinician workflow requires immediate response |
| **Database** | SQL vs NoSQL | SQL (PostgreSQL) | ACID compliance for audit; regulatory requirement |
| **Knowledge Graph** | Relational vs Graph DB | Graph for DDI | Drug interactions are relationship-centric |
| **Caching** | Single vs Multi-layer | Multi-layer (L1+L2) | DDI pairs accessed frequently; latency critical |

---

## Phase 3: Deep Dive (15-30 min)

### Deep Dive Option 1: Drug Interaction Detection Engine

**Why this is critical:** Core value proposition; latency-sensitive; patient safety

**Key points to cover:**

1. **Multi-level detection**:
   - Ingredient-level (most specific)
   - Drug class-level (broader coverage)
   - Drug-condition contraindications
   - Patient-context adjustments (age, renal function)

2. **Knowledge base integration**:
   - Multiple sources (DrugBank, First Databank)
   - Conflicting severity resolution
   - Update cadence and validation

3. **Caching strategy**:
   - Cache DDI pairs (canonical ordering)
   - Cache patient context (short TTL)
   - Handle cache invalidation on KB update

4. **Latency optimization**:
   - Target: < 200ms p99
   - Cache hit path: < 50ms
   - KB query path: < 150ms
   - Graph traversal: circuit breaker if slow

### Deep Dive Option 2: Explainable AI for Diagnosis

**Why this is critical:** Regulatory requirement (FDA/EU); clinician trust

**Key points to cover:**

1. **Explainability methods**:
   - SHAP for feature attribution
   - Confidence calibration (isotonic regression)
   - Natural language generation for explanations

2. **Regulatory compliance**:
   - FDA GMLP principles
   - EU AI Act transparency requirements
   - Article 22 GDPR (automated decisions)

3. **Bias monitoring**:
   - Demographic fairness metrics
   - TPR disparity thresholds
   - Remediation workflow

4. **Model versioning**:
   - PCCP for pre-authorized changes
   - Rollback capability
   - Audit trail for all predictions

### Deep Dive Option 3: Alert Fatigue Mitigation

**Why this is critical:** 33-96% override rates in studies; impacts clinician trust

**Key points to cover:**

1. **Three-tier classification**:
   - Critical: Interruptive (hard stop)
   - High/Moderate: Passive (sidebar)
   - Low: Informational (non-intrusive)

2. **Suppression rules**:
   - Duplicate detection (24h window)
   - Similar alert batching
   - Recent override handling

3. **Personalization**:
   - Specialty relevance
   - Clinician history
   - Preference learning

4. **Feedback loop**:
   - Override pattern analysis
   - Model improvement from feedback
   - Alert threshold tuning

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Trade-offs Discussion

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Sensitivity vs Specificity** | High sensitivity (catch all interactions) | High specificity (reduce false positives) | Start with high sensitivity for critical; tune specificity over time |
| | Pros: Never miss dangerous interaction | Pros: Less alert fatigue | |
| | Cons: More alerts, potential fatigue | Cons: May miss edge cases | |
| **Real-time vs Batch** | All alerts real-time | Batch for non-critical | Real-time for DDI; batch acceptable for risk trends |
| | Pros: Immediate feedback | Pros: Better throughput, cost | |
| | Cons: Latency pressure, cost | Cons: Delayed insights | |
| **Cloud vs Edge** | Cloud-only inference | Edge inference for privacy | Cloud primary; edge option for sensitive deployments |
| | Pros: Easier scaling, updates | Pros: Data never leaves facility | |
| | Cons: Latency, data transfer | Cons: Update complexity | |
| **Rule-based vs ML** | Pure rule-based DDI | ML for novel combinations | Hybrid: Rules for known, ML for novel |
| | Pros: Explainable, deterministic | Pros: Catches unknown interactions | |
| | Cons: Misses novel combinations | Cons: Explainability challenge | |

### Bottleneck Analysis

```
TOP 3 BOTTLENECKS:

1. KNOWLEDGE GRAPH QUERY LATENCY
   Problem: Complex multi-hop queries can exceed 30ms
   Impact: DDI checks for polypharmacy patients
   Mitigation:
   - Pre-compute common paths (batch job)
   - Query timeout with fallback to direct matches
   - Aggressive caching of results

2. ML INFERENCE AT SCALE
   Problem: GPU-bound; expensive; cold start
   Impact: Diagnosis suggestions during peak hours
   Mitigation:
   - Model quantization (INT8)
   - Dynamic batching
   - Warm pool of loaded models

3. CONSENT VERIFICATION IN CRITICAL PATH
   Problem: Every request requires consent check
   Impact: Adds 10-30ms to critical path
   Mitigation:
   - Aggressive caching (5 min TTL)
   - Async invalidation on consent change
   - Bloom filter for negative checks
```

### Failure Scenarios

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| **Knowledge base unavailable** | No new DDI detection | Serve from cache; alert on staleness |
| **ML service down** | No diagnosis suggestions | Fall back to rule-based; show "AI unavailable" |
| **Cache cluster failure** | Increased latency | Fall through to DB; circuit breaker |
| **Primary database failure** | Cannot persist alerts | Automated failover; queue writes |
| **Regional outage** | Service unavailable in region | Traffic shift to DR region |

---

## Phase 5: Wrap Up (40-45 min)

### Summary Structure

```
"Let me summarize the key points of this design:

ARCHITECTURE:
- Microservices with CDS Hooks integration
- Multi-layer caching for sub-200ms DDI checks
- Graph database for drug interactions

KEY DECISIONS:
1. CP (consistency) over AP for patient safety
2. Hybrid rule-based + ML for DDI detection
3. Three-tier alert classification for fatigue mitigation

TRADE-OFFS MADE:
- Prioritized sensitivity over specificity for critical alerts
- Cloud-primary with edge option for privacy
- Strong consistency adds latency but ensures correctness

SCALING APPROACH:
- Horizontal for stateless services
- GPU autoscaling for ML inference
- Read replicas for database

WHAT I'D DO NEXT:
- Detailed capacity planning with real numbers
- Regulatory submission preparation (FDA 510(k))
- Integration testing with top EHR vendors"
```

### Handle Follow-up Questions

**"How would you handle 10x scale?"**
- Increase cache layer sizes
- Add more read replicas
- Consider sharding by tenant
- May need to pre-compute more DDI results

**"What if you only had 2 weeks to build an MVP?"**
- Rule-based DDI only (no ML)
- Single knowledge source (DrugBank)
- Basic alert display (no personalization)
- SQLite for MVP, migrate to Postgres later

**"How would you add a new CDS capability?"**
- Define new CDS Hooks trigger
- Add new service following existing patterns
- Integrate with audit and compliance systems
- Staged rollout with feature flag

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just use a simple rule engine?" | Understand ML value proposition | "Rules work for known interactions. ML catches novel combinations and patterns humans miss. Hybrid approach: rules for 95% of known, ML for edge cases and continuous learning." |
| "What if the AI is wrong?" | Test safety thinking | "AI provides suggestions, never final decisions. Clinician always makes choice. Explainability shows reasoning. Override workflow captures feedback. PCCP enables quick rollback if systematic issues found." |
| "Why do you need a graph database? Relational can do joins." | Test data modeling depth | "Drug interactions are inherently relationship-centric. Graph excels at multi-hop queries (drug→ingredient→enzyme→interaction). Relational would require complex self-joins that don't scale for polypharmacy scenarios." |
| "How do you handle HIPAA if you're sending data to cloud?" | Test compliance understanding | "BAA with cloud provider. Encryption at rest and in transit. Minimum necessary data principle. Consent verification before processing. Audit logging. Optional on-premise deployment for sensitive clients." |
| "What happens if the EHR sends malformed data?" | Test defensive design | "Input validation at API gateway. Schema validation against FHIR spec. Graceful degradation: log error, return safe response, alert for investigation. Never let bad input cause incorrect alert suppression." |
| "Isn't alert fatigue just a UI problem?" | Test domain understanding | "UI helps but root cause is alert precision. System-level solutions: severity tiering, personalization, duplicate suppression. Also needs clinical workflow integration and feedback loops to tune thresholds." |

---

## Common Mistakes to Avoid

### Architecture Mistakes

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| **Single database for everything** | Audit, analytics, and transactional have different requirements | Separate stores: OLTP for alerts, append-only for audit, columnar for analytics |
| **Sync ML inference on critical path** | GPU inference is slow and unreliable | Async with queue for non-critical; cached/rule-based fallback for DDI |
| **No caching strategy** | Every DDI check hits database | Multi-layer cache; most DDI pairs are repeat lookups |
| **Ignoring alert fatigue** | Clinicians will ignore all alerts | Three-tier classification; suppression rules; feedback loop |

### Compliance Mistakes

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| **Assuming CDS is exempt from FDA** | Narrower exemption than expected | Design as regulated device; PCCP for flexibility |
| **Not considering EU AI Act** | New regulation with significant requirements | Dual compliance framework (MDR + AI Act) |
| **Logging PHI in application logs** | HIPAA violation | Redact/pseudonymize before logging; separate audit log |
| **No model versioning** | Cannot reproduce or rollback | Model registry with immutable versions |

### Interview Mistakes

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| **Jumping to ML immediately** | Shows lack of domain understanding | Start with requirements; justify ML vs rules |
| **Ignoring patient safety** | Critical for healthcare | Lead with safety; mention fail-secure patterns |
| **Not mentioning regulatory** | Major constraint in healthcare | Proactively raise FDA, HIPAA, GDPR |
| **Over-engineering for day 1** | Shows poor judgment | Design for 10x, mention 100x would need changes |

---

## Quick Reference Card

### Capacity Estimation Cheat Sheet

```
QUICK ESTIMATES:

Users:
- 500 organizations × 200 prescribers = 100K users
- 50 prescriptions/day/prescriber = 5M Rx/day/500 orgs
- 2 DDI checks/Rx = 10M DDI checks/day

QPS:
- 10M DDI checks / 86,400 seconds ≈ 116 QPS avg
- Peak: 3x avg = 350 QPS
- With internal fan-out: ~1,500 QPS peak

Storage:
- Alert record: 2KB × 1.5M/day × 365 = 1.1 TB/year
- Knowledge base: 20 GB (fits in memory)
- Audit logs: 5 TB/year (compress to 1 TB)

Latency Targets:
- DDI check: 200ms p99
- Diagnosis: 2s p99
- Risk score: 400ms p99
```

### Key Numbers to Remember

| Metric | Value | Context |
|--------|-------|---------|
| Alert override rate | 33-96% | Industry studies on CDS fatigue |
| FDA AI devices approved | 1,250+ | As of 2025 |
| CDS Hooks timeout | 10 seconds | Default in spec; aim for < 2s |
| FHIR resources | 145+ | Current FHIR R4 |
| DrugBank drugs | 14,000+ | Coverage of drug database |
| HIPAA retention | 6 years | Minimum audit log retention |
| GDPR breach notification | 72 hours | Notification deadline |

### Regulatory Quick Reference

| Regulation | Key Requirement | Our Compliance |
|------------|-----------------|----------------|
| **FDA SaMD** | 510(k) or De Novo + GMLP + PCCP | Treat as Class II device |
| **EU MDR** | CE marking + Clinical evaluation | Notified Body assessment |
| **EU AI Act** | Transparency + Human oversight | Explainability + Override |
| **HIPAA** | Security Rule + Breach notification | Encryption + 60-day notify |
| **GDPR** | Consent + Portability + Article 22 | FHIR export + Human review |

---

## What Makes This System Unique/Challenging

```
UNIQUE CHALLENGES:

1. PATIENT SAFETY STAKES
   - Incorrect alert (false negative) = potential patient harm
   - Too many alerts (low precision) = alert fatigue → ignored real alerts
   - Must balance sensitivity and specificity carefully

2. REGULATORY COMPLEXITY
   - FDA SaMD for US
   - EU MDR + AI Act for EU (dual framework)
   - Narrow CDS exemptions under 21st Century Cures
   - PCCP enables agility within regulatory bounds

3. REAL-TIME + AI TENSION
   - Clinician workflow needs < 200ms response
   - Deep ML inference takes 500ms+ on GPU
   - Solution: Hybrid (rules for speed, ML for depth)

4. EXPLAINABILITY REQUIREMENT
   - Regulatory: FDA requires transparency, EU AI Act mandates explanations
   - Clinical: Doctors won't trust "black box"
   - Technical: SHAP adds latency, storage, complexity

5. KNOWLEDGE BASE LIFECYCLE
   - Drug interactions discovered weekly
   - Must update without downtime
   - Must validate updates don't cause false negatives
   - Version control for regulatory traceability

6. ALERT FATIGUE IS SYSTEMIC
   - Not just a UI problem
   - Requires ML + workflow + clinical integration
   - Feedback loop essential for continuous improvement
```

---

## Extensions to Discuss (If Time Permits)

| Extension | Key Considerations |
|-----------|-------------------|
| **Pharmacogenomics** | Genetic data adds complexity; separate consent; different latency profile |
| **Image-based diagnosis** | Radiology AI is separate FDA category; very different architecture |
| **Patient-facing alerts** | Different UX; different consent model; lower clinical threshold |
| **Multi-language support** | Terminology translation; guideline localization; regional drug names |
| **Federated learning** | Privacy-preserving training; gradient aggregation; convergence challenges |
| **Real-time vital monitoring** | Stream processing; different latency profile; IoT integration |
