# Interview Guide

[Back to Index](./00-index.md)

---

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | What to Cover |
|------|-------|-------|---------------|
| **0-5 min** | Clarify | Scope and constraints | Scale, geography, existing systems, compliance |
| **5-15 min** | High-Level | Architecture overview | Core components, integration story, data flows |
| **15-30 min** | Deep Dive | 1-2 critical components | EMPI, Bed Management, OR Scheduling, or RCM |
| **30-40 min** | Trade-offs | Bottlenecks, scaling, failures | Consistency vs availability, AI accuracy |
| **40-45 min** | Wrap Up | Summary, follow-ups | Open questions, what you'd do with more time |

---

## Phase 1: Clarifying Questions to Ask

Before diving into design, clarify the scope:

### Scale Questions
1. "How many hospitals are we designing for? Single facility or a network?"
2. "What's the bed count? (This drives ADT volume and bed management complexity)"
3. "What's the expected admission volume—inpatient, outpatient, ED?"
4. "Do we need to support operating rooms, or is this administrative only?"

### Integration Questions
5. "Is there an existing EMR (Epic, Cerner, MEDITECH) we need to integrate with, or greenfield?"
6. "Do we need to support HL7v2 for legacy systems, or can we be FHIR-only?"
7. "What external systems need integration—labs, radiology, pharmacy, payers?"

### Compliance Questions
8. "Which compliance frameworks are mandatory—HIPAA, GDPR, NABH, JCAHO?"
9. "Are there data residency requirements? (EU data stays in EU, India data stays in India)"
10. "What's the audit retention requirement? (HIPAA: 6 years, NHS: 8 years)"

### AI Requirements
11. "Are AI features (bed prediction, OR optimization) core requirements or nice-to-have?"
12. "Can we use external AI APIs, or must models be self-hosted for compliance?"

---

## Phase 2: High-Level Design Talking Points

### Key Architecture Points to Make

**1. Position HMS as Operational Layer (Not Clinical)**
> "The HMS orchestrates hospital operations—patient identity, bed allocation, OR scheduling, revenue cycle—while complementing clinical systems like the EMR. The EMR owns clinical documentation; we own operational workflows."

**2. EMPI is the Identity Backbone**
> "The Enterprise Master Patient Index is the single source of truth for patient identity. It uses probabilistic matching to handle dirty data—typos, nicknames, variations—and prevents both duplicate records and dangerous mis-matches."

**3. Integration Architecture**
> "We integrate with EMR via FHIR R4 for modern systems, plus an HL7v2 adapter for legacy. The integration hub handles 300K messages/day, translating between formats. We use Kafka as the event backbone for durability and replay."

**4. Saga Pattern for ADT Workflows**
> "ADT workflows are complex multi-step processes—registration, insurance verification, bed assignment, encounter creation, billing setup. We use the Saga pattern with an orchestrator to coordinate these steps and handle compensating transactions on failure."

**5. AI is Native, Not Bolted On**
> "AI is embedded in core workflows—bed prediction informs assignment decisions, case duration prediction improves OR scheduling, coding AI assists the revenue cycle. Models are self-hosted for HIPAA compliance."

### Architecture Diagram to Draw

```
[Clients] → [API Gateway + Auth + OPA] → [Core Services]
                                              ↓
                        ┌────────────────────────────────────┐
                        │ EMPI | Bed Mgmt | ADT | OR | RCM   │
                        └────────────────────────────────────┘
                                              ↓
                        ┌────────────────────────────────────┐
                        │      AI Platform (Self-hosted)      │
                        │  Bed Prediction | OR Duration | LOS │
                        └────────────────────────────────────┘
                                              ↓
                        ┌────────────────────────────────────┐
                        │      Integration Hub               │
                        │  FHIR + HL7v2 → EMR, LIS, Payers  │
                        └────────────────────────────────────┘
                                              ↓
                        [PostgreSQL | Redis | Kafka | TimescaleDB]
```

---

## Phase 3: Deep Dive Options

### Option A: Enterprise Master Patient Index (EMPI)

**Opening Statement:**
> "The EMPI is critical because patient identity errors cause safety risks, billing problems, and fragmented care. A 5-10% duplicate rate is typical without a good EMPI."

**Key Points to Cover:**

1. **Probabilistic Matching (Fellegi-Sunter Model)**
   - Fields have weights based on discriminating power
   - SSN exact match: +15 weight
   - DOB match: +8 weight
   - Name fuzzy match (Jaro-Winkler > 0.92): +3 weight
   - Thresholds: Certain (>15), Probable (10-15), New (<5)

2. **Blocking to Reduce Comparison Space**
   - Without blocking: Compare against all 2M patients
   - With blocking: Compare against ~500 candidates
   - Multiple blocking strategies (Soundex + DOB, Phone + ZIP)

3. **False Positive vs False Negative Trade-offs**
   - False positive (wrong merge): CRITICAL safety risk
   - False negative (duplicate): Operational/billing issue
   - Tune for precision over recall on auto-merge

4. **Human-in-the-Loop Review**
   - Probable matches queued for HIM review
   - Merge requires dual approval
   - Unmerge capability with full audit trail

**Sample Question:**
> "How would you handle a patient who registered as 'Bob Smith' last visit and 'Robert Smith, Jr.' this visit?"

**Answer:**
> "The matching algorithm uses nickname expansion (Bob=Robert) and ignores suffixes for comparison. We'd compute a high match score based on DOB and SSN. If above the 'certain' threshold, auto-match; if 'probable', queue for human review with both records displayed."

---

### Option B: Real-Time Bed Management with AI

**Opening Statement:**
> "Bed management is critical because ED boarding—patients waiting for beds—is the #1 cause of ED crowding. AI prediction can reduce boarding by 30-40%."

**Key Points to Cover:**

1. **Real-Time State Management**
   - Redis for sub-10ms bed queries (hot path)
   - PostgreSQL for durability and audit (source of truth)
   - Event-driven updates via Kafka

2. **Double-Booking Prevention**
   - PostgreSQL exclusion constraint: `EXCLUDE USING gist (bed_id WITH =, tstzrange(start, end) WITH &&)`
   - Database-level enforcement, not application logic
   - Retry with next-best bed on conflict

3. **AI Bed Prediction Model**
   - Features: Historical census, scheduled admissions, ED census, predicted discharges
   - Model: XGBoost + Prophet ensemble
   - Accuracy: MAPE <10% for 24h horizon
   - Pre-computed every 15 minutes, cached in Redis

4. **Failure Modes**
   - Redis down: Fallback to PostgreSQL (slower)
   - AI unavailable: Use historical average
   - Concurrent assignment: Exclusion constraint prevents conflicts

**Sample Question:**
> "Two nurses simultaneously try to assign the same bed to different patients. What happens?"

**Answer:**
> "The PostgreSQL exclusion constraint on the bed_assignment table prevents overlapping time ranges for the same bed. The first INSERT succeeds; the second fails with a constraint violation. The application catches this, and the second nurse sees 'Bed already assigned' and is shown the next-best available bed."

---

### Option C: OR Scheduling Optimization

**Opening Statement:**
> "OR time costs $50-100/minute, and average utilization is only 65-70%. Case duration prediction and scheduling optimization can improve utilization by 15-20%."

**Key Points to Cover:**

1. **Case Duration Prediction Model**
   - Features: Procedure code, surgeon history, patient factors (BMI, ASA, comorbidities)
   - Model: Gradient Boosting with surgeon-specific fine-tuning
   - Accuracy: MAE <15 minutes for 85% of cases

2. **Constraint Programming for Scheduling**
   - Hard constraints: No overlaps, surgeon availability, equipment
   - Soft constraints: Minimize turnover, first case on time, surgeon preference
   - Solver: CP-SAT with 5-minute time budget

3. **Block Scheduling vs. Open Scheduling**
   - Block: Dedicated surgeon time slots (predictable, may be underutilized)
   - Open: First-come allocation (flexible, may cause conflicts)
   - Most use hybrid: Block for high-volume surgeons, open for remainder

4. **Emergency Case Handling**
   - Reserve 20% OR capacity for emergencies
   - Emergency cases bump elective cases based on priority
   - Notification cascade to affected teams

**Sample Question:**
> "A surgeon's case runs 2 hours over the predicted time. What happens to the subsequent cases?"

**Answer:**
> "The system monitors actual start/end times. When a case runs long, we trigger re-optimization for remaining cases. Options: 1) Delay subsequent cases and notify teams, 2) Move cases to available rooms, 3) For end-of-day cases, extend into overtime with approval. The AI model learns from overruns to improve future predictions for this surgeon/procedure combination."

---

### Option D: Revenue Cycle with AI Coding

**Opening Statement:**
> "Revenue leakage from coding errors is 1-3% of revenue. AI-assisted coding can reduce coder workload by 40% and denial rates by 50%."

**Key Points to Cover:**

1. **AI Coding Model Architecture**
   - Input: Clinical documentation (discharge summary, op notes)
   - NER: BioBERT extracts diagnoses, procedures, symptoms
   - Output: ICD-10-CM, ICD-10-PCS, CPT codes with confidence

2. **Human-in-the-Loop Workflow**
   - High confidence (>85%): Auto-populate, highlight for review
   - Medium confidence: Suggest with alternatives
   - Low confidence: Flag for manual coding
   - All codes require human approval

3. **Compliance Checks**
   - NCCI edits (bundling rules)
   - LCD/NCD (local/national coverage determinations)
   - Gender/age appropriateness
   - Query physicians for documentation gaps

4. **DRG Calculation**
   - Group diagnoses and procedures into DRG
   - DRG determines hospital payment for inpatient stays
   - AI optimizes principal diagnosis selection for accuracy

**Sample Question:**
> "How do you prevent AI from upcoding to maximize revenue?"

**Answer:**
> "Three safeguards: 1) AI suggests codes based on documentation evidence, not revenue optimization. 2) Human coders review all suggestions before submission—they're legally responsible. 3) Retrospective audits compare AI suggestions to external auditor findings, flagging systematic bias. We monitor acceptance rate and accuracy against coding audits."

---

## Trade-Off Discussions

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **EMPI: Auto-merge threshold** | Strict (fewer auto-merges) | Lenient (more auto-merges) | Strict—false positives are safety risks |
| **Bed state: Redis consistency** | Eventual (fast) | Strong (sync write) | Eventual with PostgreSQL as source of truth |
| **OR scheduling: Block vs Open** | Block (predictable) | Open (flexible) | Hybrid—block for high-volume, open for rest |
| **AI hosting: Cloud vs Self-hosted** | Cloud (easier) | Self-hosted (compliant) | Self-hosted for HIPAA (PHI can't leave VPC) |
| **Integration: FHIR-only vs HL7v2** | Modern only | Support legacy | Both—FHIR primary, HL7v2 adapter for legacy |

---

## Trap Questions and Best Answers

### Trap 1: "Why not just use the EMR's bed management?"

**What Interviewer Wants:** Understand you know the distinction between clinical and operational systems.

**Best Answer:**
> "EMRs like Epic and Cerner have ADT modules, but they're clinically focused—documenting patient location, not optimizing placement. A dedicated HMS provides operational optimization: AI-powered bed prediction, housekeeping integration, real-time capacity dashboards, and ED boarding reduction. The EMR is the system of record for clinical data; HMS is the operational orchestrator. They share data via FHIR but serve different purposes."

---

### Trap 2: "How do you prevent double-booking beds?"

**What Interviewer Wants:** Test your knowledge of concurrency control.

**Best Answer:**
> "I'd use PostgreSQL's exclusion constraint with temporal ranges: `EXCLUDE USING gist (bed_id WITH =, tstzrange(start, end) WITH &&)`. This is database-level enforcement, not application logic—even concurrent INSERTs will fail if they conflict. For the read path, I'd cache bed state in Redis for sub-10ms queries, but always validate against PostgreSQL on write. If a conflict occurs, the application retries with the next-best bed."

---

### Trap 3: "Can you achieve 100% accuracy on EMPI matching?"

**What Interviewer Wants:** Test your understanding of probabilistic systems.

**Best Answer:**
> "No—100% is impossible with probabilistic matching. The goal is to minimize false positives (merged wrong patients = safety risk) while accepting some false negatives (duplicates = operational issue). I'd tune thresholds to favor precision over recall for automatic merges, with human review for edge cases in the 'probable' range. We'd also run periodic batch re-matching to catch missed duplicates."

---

### Trap 4: "Why use AI for bed prediction when you have scheduled admissions?"

**What Interviewer Wants:** Test domain knowledge of hospital operations.

**Best Answer:**
> "Scheduled admissions are only 30-40% predictable. The rest come from ED (unpredictable), transfers from other facilities, and unscheduled OR cases. AI combines historical patterns (time of year, day of week, flu season), current census, ED acuity distribution, and LOS predictions to forecast demand. Even 10% improvement in prediction accuracy significantly reduces ED boarding hours—which is both a safety and compliance issue."

---

### Trap 5: "What if the Saga orchestrator crashes mid-workflow?"

**What Interviewer Wants:** Test your understanding of distributed transaction failure modes.

**Best Answer:**
> "The Saga state is persisted in the database before each step. On restart, the orchestrator reads incomplete sagas and resumes from the last completed step. If a step was in progress, we check if it completed (idempotent operations help here). If the step failed, we execute compensating transactions for completed steps in reverse order. For example, if bed assignment completed but billing setup failed, we'd release the bed and mark the encounter as cancelled."

---

### Trap 6: "How do you handle a mass casualty event with 10x normal admissions?"

**What Interviewer Wants:** Test your thinking about surge capacity.

**Best Answer:**
> "Three layers: 1) **Pre-provisioned surge capacity**—additional Redis nodes, database connections, API pods that can be activated. 2) **Priority queuing**—ED admissions get priority over elective, critical over routine. 3) **Graceful degradation**—disable non-essential AI features (readmission prediction), switch to simplified workflows (skip detailed insurance verification), increase batch sizes. Post-event, we'd review what worked and adjust pre-provisioning."

---

## Keywords and Terminology

| Term | Definition |
|------|------------|
| **EMPI** | Enterprise Master Patient Index—single source of truth for patient identity |
| **ADT** | Admit-Discharge-Transfer—core hospital workflow events |
| **LOS** | Length of Stay—days patient stays in hospital |
| **ALOS** | Average Length of Stay—metric across population |
| **ED Boarding** | Patients waiting in ED for inpatient beds |
| **Block Time** | Dedicated OR time allocated to a surgeon/service |
| **Turnover Time** | Time between OR cases (includes cleaning, setup) |
| **First Case On-Time** | Metric for OR efficiency—first case starts as scheduled |
| **DRG** | Diagnosis Related Group—payment classification for inpatient stays |
| **Case Mix Index** | Average DRG weight—indicates complexity of cases |
| **NCCI Edits** | National Correct Coding Initiative—bundling rules for claims |
| **Fellegi-Sunter** | Statistical model for probabilistic record matching |
| **IHE PIX/PDQ** | IHE profiles for patient identity cross-referencing |
| **FHIR** | Fast Healthcare Interoperability Resources—modern data exchange standard |
| **HL7v2** | Legacy healthcare messaging standard (pipe-delimited) |
| **HIPAA** | US healthcare privacy and security law |
| **NABH** | National Accreditation Board for Hospitals (India) |
| **JCAHO** | Joint Commission—US hospital accreditation |

---

## System Design Variations

### Variation 1: Single Community Hospital (200 beds)

**Simplifications:**
- No EMPI federation (single source)
- Simpler OR scheduling (3-5 ORs)
- PostgreSQL for everything (no Redis needed at this scale)
- HL7v2 integration may not be needed

**Focus Areas:**
- Integration with existing EMR
- Basic bed management
- Compliance (HIPAA/NABH)

---

### Variation 2: Multi-Hospital Network (10,000 beds)

**Additional Complexity:**
- Federated EMPI across hospitals
- Cross-facility bed visibility and transfers
- Multi-region deployment with data residency
- More sophisticated AI models (more training data)

**Focus Areas:**
- EMPI federation and patient linking
- Cross-facility workflows
- Scalability and multi-tenancy

---

### Variation 3: Academic Medical Center

**Additional Requirements:**
- Research integration (IRB workflows)
- Teaching hospital workflows (residents, supervision)
- Complex case mix (rare procedures)

**Focus Areas:**
- Research consent management
- Supervision requirements in OR
- Case complexity handling

---

## 30-Second Summary

> "A Hospital Management System orchestrates operational workflows—patient identity (EMPI), bed management, OR scheduling, and revenue cycle—distinct from clinical systems like EMR. The architecture uses FHIR R4 for integration, a Saga pattern for complex ADT workflows, and AI for bed demand prediction and OR case duration optimization. EMPI uses probabilistic matching with blocking strategies to resolve patient identity at scale. Bed management uses Redis for real-time queries and PostgreSQL exclusion constraints for double-booking prevention. Compliance is enforced via OPA policies supporting HIPAA, GDPR, NABH, and JCAHO. The key differentiator from EMR is operational optimization, not clinical documentation."

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│          HMS INTERVIEW QUICK REFERENCE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CLARIFY (0-5 min)          HIGH-LEVEL (5-15 min)              │
│  ─────────────────          ──────────────────────              │
│  • How many beds?           • EMPI = identity backbone         │
│  • Existing EMR?            • Saga for ADT workflows           │
│  • Compliance needed?       • FHIR + HL7v2 integration         │
│  • AI requirements?         • Self-hosted AI (HIPAA)           │
│                                                                 │
│  DEEP DIVE OPTIONS (15-30 min)                                 │
│  ──────────────────────────────                                 │
│  A. EMPI: Probabilistic matching, Fellegi-Sunter, blocking    │
│  B. Bed Mgmt: Redis + PG, exclusion constraint, AI prediction │
│  C. OR Scheduling: Duration ML, constraint programming         │
│  D. Revenue Cycle: BioBERT NER, NCCI edits, human-in-loop     │
│                                                                 │
│  KEY TRADE-OFFS (30-40 min)                                    │
│  ──────────────────────────                                     │
│  • EMPI: Precision > Recall (safety)                           │
│  • Bed: Eventual Redis, Strong PG (source of truth)            │
│  • OR: Hybrid block/open scheduling                            │
│  • AI: Self-hosted for HIPAA                                   │
│                                                                 │
│  TRAP QUESTION ANSWERS                                          │
│  ─────────────────────                                          │
│  "Why not EMR bed mgmt?" → Clinical vs operational             │
│  "100% EMPI accuracy?"   → Impossible, tune for precision      │
│  "Double-booking?"       → PG exclusion constraint             │
│  "Why AI for beds?"      → Only 30-40% is scheduled            │
│                                                                 │
│  NUMBERS TO KNOW                                                │
│  ────────────────                                               │
│  • 2000 beds, 50K admissions/year, 300K messages/day           │
│  • Bed query: <50ms (Redis), EMPI: <100ms (with blocking)     │
│  • OR utilization: 65-70% typical, 85%+ with optimization      │
│  • EMPI duplicate rate: 5-10% without, <1% with good EMPI     │
│  • AI bed prediction: MAPE <10% (24h horizon)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Interview Topics

If the interviewer shifts focus, be ready to discuss:

- **[EMR/EHR Design](../2.23-compliance-first-ai-native-emr-ehr-phr/08-interview-guide.md)** - Clinical documentation, FHIR server
- **[Clinical Decision Support](../2.24-ai-powered-clinical-decision-support/08-interview-guide.md)** - Drug interactions, clinical guidelines
- **[Pharmacy System](../2.25-compliance-first-ai-native-pharmacy-os/08-interview-guide.md)** - Medication dispensing, controlled substances
- **[Distributed Transactions](../1.17-distributed-transaction-coordinator/08-interview-guide.md)** - Saga pattern deep dive
- **[Identity Management](../2.5-identity-access-management/08-interview-guide.md)** - OAuth, OIDC, RBAC/ABAC
