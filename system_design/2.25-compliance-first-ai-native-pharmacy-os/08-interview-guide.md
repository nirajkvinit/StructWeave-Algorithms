# Interview Guide

[Back to Index](./00-index.md)

---

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify Requirements | Ask questions, scope the problem | Don't assume; clarify scale, jurisdiction, features |
| **5-15 min** | High-Level Design | Core components, data flow | Draw the architecture, explain trade-offs |
| **15-30 min** | Deep Dive | 1-2 critical components | Show expertise, discuss algorithms |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failure scenarios | Demonstrate senior thinking |
| **40-45 min** | Wrap Up | Summary, handle follow-ups | Be concise, address any gaps |

---

## Phase 1: Clarify Requirements (0-5 min)

### Questions to Ask

1. **Scale**: "How many pharmacies? Independent or chain?"
2. **Geography**: "US only, or international (India, EU)?"
3. **Controlled Substances**: "Do we need to handle Schedule II drugs?"
4. **Features**: "Core dispensing only, or full POS with OTC?"
5. **Offline**: "Do pharmacies have reliable connectivity?"
6. **Insurance**: "Real-time claim adjudication needed?"
7. **AI Features**: "Substitution suggestions? Demand forecasting?"

### Sample Scoping Response

> "For this design, I'll focus on a **10,000-pharmacy chain** operating in the **US**, handling **Schedule II-V controlled substances**, with **real-time insurance adjudication** and **AI-powered substitution recommendations**. I'll assume pharmacies need **offline capability** for at least a few hours. I'll also address **multi-state compliance** since that's a key challenge."

---

## Phase 2: High-Level Design (5-15 min)

### Components to Cover

1. **Client Layer**: POS terminals, admin portal, mobile app
2. **API Gateway**: Authentication, rate limiting, routing
3. **Compliance Engine**: OPA for policy enforcement
4. **Core Services**: Dispensing, Inventory, Prescription, Claims
5. **AI Platform**: Substitution engine, demand forecasting
6. **Data Layer**: PostgreSQL, Redis, Kafka, Neo4j (drug graph)
7. **External Integrations**: PMP, insurance payers, wholesalers

### Key Points to Emphasize

- **Compliance-first architecture**: Policy engine evaluates every transaction
- **CRDT for inventory**: Conflict-free sync across terminals
- **Drug knowledge graph**: Enables fast DDI and substitution lookups
- **Event sourcing for audit**: Immutable log for regulatory compliance

---

## Phase 3: Deep Dive (15-30 min)

### Option A: Controlled Substance Tracking

**Why this is critical**:
- DEA regulations are strict; violations can shut down a pharmacy
- Real-time reconciliation prevents diversion
- Hash-chained audit logs prove compliance

**Key points to cover**:
1. Perpetual inventory with running balance
2. Dual verification for high-risk operations
3. PMP integration for patient history
4. ARCOS reporting for DEA

**Sample explanation**:
> "For controlled substances, I'd implement a perpetual inventory system where every unit is tracked from receipt to dispensing. The log is append-only with hash chaining for tamper detection. Before dispensing, we query the state PMP to check the patient's history. The running balance is reconciled daily, and any discrepancy triggers an immediate alert."

### Option B: Medication Substitution Engine

**Why this is critical**:
- Cost savings for patients (generics are often 80-90% cheaper)
- Formulary compliance improves insurance approval rates
- Patient safety (allergies, DDI checks)

**Key points to cover**:
1. FDA Orange Book therapeutic equivalence codes
2. Graph-based drug knowledge base (Neo4j)
3. Patient safety filtering (allergies, DDI)
4. AI ranking model for best alternatives

**Sample explanation**:
> "The substitution engine queries the FDA Orange Book for therapeutic equivalents—drugs with 'A' ratings can be safely substituted. I'd use a graph database to model drug relationships because traversing equivalence and interaction paths is a natural graph query. The results are then filtered by patient allergies and current medications, then ranked by an ML model that considers formulary tier, cost savings, and historical pharmacist acceptance."

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Scaling Challenges to Address

1. **Multi-terminal sync**: How do you handle concurrent dispensing?
   - Answer: CRDTs (PN-Counters) for conflict-free merge

2. **Database scaling**: 10,000 pharmacies, millions of transactions
   - Answer: Shard by pharmacy_id, read replicas for analytics

3. **External API rate limits**: PMP, insurance payers
   - Answer: Caching, batching, graceful degradation

### Failure Scenarios to Discuss

1. **Cloud unreachable**: How does the pharmacy continue?
   - Answer: 24-hour offline mode with CRDT sync on reconnect

2. **PMP API down**: Can we still dispense controlled substances?
   - Answer: Yes, with manual verification and enhanced logging

3. **Database primary fails**: What's the recovery time?
   - Answer: 60-second automatic failover to synchronous standby

### Trade-offs to Discuss

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Inventory consistency** | Strong (pessimistic lock) | Eventual (CRDT) | CRDT for general, strong for CS |
| **Drug knowledge store** | Relational (PostgreSQL) | Graph (Neo4j) | Neo4j for faster traversals |
| **AI hosting** | Cloud ML APIs | Self-hosted | Self-hosted (HIPAA compliance) |
| **Offline capability** | Cloud-only | Offline-first | Hybrid (offline with CS limits) |

---

## Trap Questions and How to Handle

### Trap 1: "Why not just use a simple counter for inventory?"

**What interviewer wants**: Understand why CRDTs are necessary

**Best answer**:
> "A simple counter works for single-terminal systems, but with multiple terminals, concurrent updates can lead to race conditions. If Terminal A and B both dispense from the same batch simultaneously, a simple decrement might oversell. CRDTs, specifically PN-Counters, allow each terminal to track its own increments and decrements, which merge conflict-free. The trade-off is slightly more storage, but we get correctness without coordination."

### Trap 2: "How do you handle offline controlled substance dispensing?"

**What interviewer wants**: Test your understanding of regulatory constraints

**Best answer**:
> "This is tricky because DEA regulations require real-time reconciliation. I'd allow limited offline CS dispensing with strict controls: a daily quota per drug, mandatory pharmacist verification with biometrics, and immediate reconciliation when connectivity returns. If there's a discrepancy, the system flags it and requires investigation. The trade-off is some regulatory risk, but the alternative—no dispensing during outages—could harm patients."

### Trap 3: "What if the FDA Orange Book data is outdated?"

**What interviewer wants**: See if you think about data freshness

**Best answer**:
> "The Orange Book is updated monthly, but our cached version might be up to a week old. I'd mitigate this by: (1) syncing weekly with a freshness indicator, (2) allowing pharmacists to override with a documented reason if they know a substitution is valid, and (3) checking against multiple sources (RxNorm, FDB) and flagging conflicts. If our data is older than 7 days, we'd show a warning but still allow substitution since month-old data is usually fine."

### Trap 4: "Why not just use PostgreSQL for the drug relationships?"

**What interviewer wants**: Justify the graph database choice

**Best answer**:
> "PostgreSQL can model drug relationships with foreign keys, but querying therapeutic equivalents and DDI requires multiple JOINs across ingredient, class, and interaction tables. A 3-hop query like 'find all drugs equivalent to Drug A that don't interact with Drug B's ingredients' is a natural graph traversal but a complex recursive CTE in SQL. Neo4j makes these queries O(relationships) instead of O(table scans). The trade-off is operational complexity—now we have two databases—but the performance gain for these specific queries justifies it."

### Trap 5: "100% uptime for controlled substances—is that realistic?"

**What interviewer wants**: Test your pragmatism

**Best answer**:
> "100% is an aspirational target, not an SLA. In practice, I'd target 99.99% with multi-AZ deployment and automatic failover. For the remaining 0.01%, I'd have a documented manual fallback: paper logs, locked cabinet access, and immediate entry into the system once restored. The key is that CS operations never proceed without some form of tracking—digital or paper."

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | What to Do Instead |
|---------|--------------|---------------------|
| **Jumping to solution** | Missed requirements, wrong scope | Ask clarifying questions first |
| **Ignoring compliance** | This is the core challenge | Lead with compliance constraints |
| **Over-engineering day 1** | Shows poor judgment | Design for 10x, mention 100x as future work |
| **Forgetting offline** | Common real-world scenario | Address offline as a first-class concern |
| **Single database** | Doesn't handle scale | Mention sharding, read replicas |
| **No audit trail** | Regulatory failure | Every CS operation must be logged |
| **Cloud ML for PHI** | HIPAA violation | Self-host or use BAA-covered services |

---

## Questions to Ask the Interviewer

1. "What's the expected scale—number of pharmacies and transactions?"
2. "Is this a greenfield design or migrating from an existing system?"
3. "Any specific compliance frameworks we need to prioritize?"
4. "What's the tolerance for offline operation?"
5. "Are there existing integrations we need to support (specific payers, wholesalers)?"
6. "Is real-time substitution suggestions a must-have or nice-to-have?"

---

## Keywords and Terminology

### Pharmacy Domain
- **NDC**: National Drug Code (11-digit identifier)
- **RxCUI**: RxNorm Concept Unique Identifier
- **DAW Code**: Dispense As Written (0-9, controls substitution)
- **TE Code**: Therapeutic Equivalence code (AA, AB, BX, etc.)
- **FEFO**: First Expiry First Out (inventory picking)
- **PMP**: Prescription Monitoring Program (state database)
- **ARCOS**: DEA's Automation of Reports and Consolidated Orders System
- **EPCS**: Electronic Prescribing for Controlled Substances
- **Sig**: Prescription directions (Latin abbreviations)

### Technical Patterns
- **CRDT**: Conflict-Free Replicated Data Type
- **PN-Counter**: Positive-Negative Counter (CRDT type)
- **OPA/Rego**: Open Policy Agent / policy language
- **NCPDP**: National Council for Prescription Drug Programs (claims standard)
- **Orange Book**: FDA publication of drug equivalence
- **Hash Chain**: Linked hash for tamper detection

### Compliance
- **DEA Schedule**: Drug classification (I-V)
- **HIPAA**: Health Insurance Portability and Accountability Act
- **CDSCO**: Central Drugs Standard Control Organisation (India)
- **Schedule H/H1/X**: Indian drug schedules
- **Form 20/21**: Indian drug license forms
- **Form 41**: DEA controlled substance destruction form
- **Form 106**: DEA theft/loss report

---

## System Design Variations

### Variation 1: Single Independent Pharmacy

**Changes from reference design**:
- No sharding needed
- Single-tenant deployment
- Simpler offline mode (no CRDT needed)
- May not need AI features

### Variation 2: Hospital Pharmacy

**Additional considerations**:
- 340B drug pricing compliance
- Inpatient vs outpatient workflows
- Integration with hospital EHR (Epic, Cerner)
- Unit dose dispensing
- Automated dispensing cabinets (Pyxis, Omnicell)

### Variation 3: Mail-Order Pharmacy

**Additional considerations**:
- High-volume automation
- Shipping/logistics integration
- Different PMP reporting (receiving state)
- Longer transaction lifecycle
- No real-time patient interaction

### Variation 4: Specialty Pharmacy

**Additional considerations**:
- High-cost drugs ($10K+)
- Prior authorization workflows
- Patient support programs
- Cold chain management
- REMS (Risk Evaluation and Mitigation Strategy) drugs

---

## Interview Score Card

### What Interviewers Look For

| Criteria | Poor | Good | Excellent |
|----------|------|------|-----------|
| **Requirements** | Assumed everything | Asked some questions | Systematically clarified scope |
| **High-Level Design** | Missing components | Complete but generic | Tailored to pharmacy domain |
| **Compliance** | Ignored or superficial | Mentioned DEA/HIPAA | Deep policy engine design |
| **Deep Dive** | Surface-level | Solid algorithm | Novel insights, edge cases |
| **Trade-offs** | One-sided | Acknowledged alternatives | Justified with data/experience |
| **Failure Handling** | Not discussed | Happy path + one failure | Graceful degradation strategy |
| **Communication** | Unclear, jumped around | Organized, clear | Structured, confirmed understanding |

---

## 30-Second Summary

> "A Pharmacy Operating System requires **compliance-first architecture** because DEA and HIPAA violations can shut down operations. The core design uses **OPA for policy enforcement**, ensuring every transaction is validated against regulations. For inventory, I'd use **CRDTs** to enable conflict-free multi-terminal sync with offline capability. Drug data lives in a **graph database** for fast DDI and substitution queries. **AI features** include demand forecasting and substitution ranking, self-hosted for HIPAA compliance. The system needs **24-hour offline capability** with limits on controlled substances, and **real-time PMP integration** for patient safety."

---

## Related Systems to Reference

During the interview, you can reference these related patterns:

1. **[Distributed Lock Manager](../1.8-distributed-lock-manager/00-index.md)**: For CS inventory locking
2. **[Event Sourcing](../1.18-event-sourcing-system/00-index.md)**: For audit trail design
3. **[Offline-First POS](../2.22-ai-native-offline-first-pos/00-index.md)**: For CRDT inventory pattern
4. **[Clinical Decision Support](../2.24-ai-powered-clinical-decision-support/00-index.md)**: For drug knowledge graph
5. **[EMR/EHR System](../2.23-compliance-first-ai-native-emr-ehr-phr/00-index.md)**: For healthcare compliance patterns
