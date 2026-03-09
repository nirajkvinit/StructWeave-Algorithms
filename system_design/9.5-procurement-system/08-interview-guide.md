# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | What to Demonstrate |
|------|-------|-------|---------------------|
| 0--5 min | **Clarify** | Ask questions, scope the problem | Understanding of procurement domain; ability to distinguish P2P from payment systems, inventory, or ERP |
| 5--15 min | **High-Level** | Core components, data flow, key decisions | Document lifecycle chain (Req → PO → GRN → Invoice → Match); approval engine as workflow orchestrator; event-driven architecture choice |
| 15--30 min | **Deep Dive** | 1--2 critical components in detail | Three-way matching algorithm OR approval workflow engine OR budget encumbrance model---choose based on interviewer cues |
| 30--40 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios, consistency | Quarter-end spikes, budget contention, sealed bid integrity, multi-tenant isolation; discuss CP vs AP choices per component |
| 40--45 min | **Wrap Up** | Summary, handle follow-ups | Tie back to business impact: financial controls, audit compliance, operational efficiency |

---

## Meta-Commentary: How to Approach This Problem

### What Makes This System Unique/Challenging

1. **It's a workflow system, not a request-response system**. The core challenge is not throughput or latency---it is orchestrating a multi-stage, multi-actor process with configurable rules, exception handling, and complete audit trails. Most candidates default to designing high-throughput data pipelines. Instead, focus on the state machine complexity.

2. **Financial correctness trumps performance**. Unlike consumer systems where eventual consistency is acceptable, procurement requires absolute consistency for budget encumbrances and three-way matching. A budget that shows "available" when it is not leads to financial over-commitment. This is a domain where "correct but slow" beats "fast but eventually consistent."

3. **The approval engine is the hardest component**. It looks simple ("just a chain of approvals") but the complexity lies in: multi-dimensional rule evaluation (amount × category × vendor risk × cost center × custom rules), parallel vs. sequential steps, delegation chains, timeout escalation, self-approval prevention, and organizational hierarchy changes mid-flight.

4. **Three-way matching is a constrained optimization problem**. It is not just "compare three numbers." Partial deliveries, split invoices, unit-of-measure conversions, and multi-currency scenarios make it a line-level assignment problem with tolerance thresholds.

### Where to Spend Most Time

- **If interviewer is interested in workflow design**: Deep dive into the approval engine---rule evaluation, chain resolution, delegation, escalation, and concurrent approval handling.
- **If interviewer is interested in data consistency**: Deep dive into budget encumbrance---the three-state model (soft/hard/actual), concurrency control, and the budget slice pattern for high-contention cost centers.
- **If interviewer is interested in algorithm design**: Deep dive into three-way matching---the scoring-based line assignment algorithm, tolerance rules, and exception routing.
- **If interviewer asks about security**: Sealed bid cryptography, SOX compliance controls, and separation of duties enforcement.

---

## Clarifying Questions to Ask

### Scope Questions

| Question | Why It Matters | Expected Answer |
|----------|---------------|-----------------|
| "Is this a multi-tenant SaaS platform or a single-organization deployment?" | Multi-tenant adds isolation, noisy neighbor, and per-tenant configuration complexity | Most interesting as multi-tenant SaaS |
| "What's the scale? Small business (100s of POs/year) or enterprise (millions)?" | Determines whether to optimize for simplicity or scalability | Enterprise scale makes it interesting |
| "Do we need to support competitive bidding (RFQ/reverse auctions) or just direct purchasing?" | Sealed bid and auction components add significant complexity | Usually yes---it is what differentiates a procurement system from a simple purchase order system |
| "What level of budget control---advisory warnings or hard blocks?" | Hard blocks require strong consistency; advisory allows eventual consistency | Both---configurable per cost center |
| "Is vendor management in scope, or just the purchasing workflow?" | Vendor lifecycle (onboarding, scoring, risk) is a significant subsystem | Usually in scope |
| "What integration points---just ERP/GL, or also vendor portals (cXML/EDI)?" | Integration complexity adds architectural considerations | Usually full integration |

### Non-Functional Questions

| Question | Why It Matters |
|----------|---------------|
| "What's the consistency requirement for budget checks?" | Determines the database locking and caching strategy |
| "What's the audit retention period?" | Affects storage planning and archival strategy |
| "Are there regulatory compliance requirements (SOX, GDPR)?" | Drives security architecture, audit trail design, and SoD enforcement |
| "What's the acceptable approval latency (system processing, not human wait)?" | Determines whether approval engine can be async or must be sync |

---

## Trade-offs Discussion

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **Approval Engine: Embedded vs. External** | Embed workflow logic in the application | Use a dedicated workflow orchestration engine (e.g., Temporal/Cadence pattern) | **Embedded with DSL** for procurement-specific optimizations; external engines add latency and operational complexity for a domain with well-defined state machines |
| | Pros: Domain-specific optimizations; fewer network hops; simpler deployment | Pros: Built-in retry, timeout, saga patterns; visualization tools; general-purpose | |
| | Cons: Must build timeout/escalation/retry from scratch | Cons: Learning curve; operational overhead; may not fit procurement-specific rules | |
| **Budget: Strong vs. Eventually Consistent** | Strong consistency (row-level locks on every budget check) | Eventually consistent with periodic reconciliation | **Strong consistency with caching optimization**: Budget correctness is non-negotiable for SOX; use cached pre-check to avoid DB round-trip for clearly-insufficient budgets; pessimistic lock only for the commit |
| | Pros: Zero over-commitment risk; SOX-friendly | Pros: Higher throughput; no lock contention | |
| | Cons: Lock contention at quarter-end; serialization bottleneck | Cons: Risk of over-commitment; requires reconciliation jobs; SOX audit concerns | |
| **Matching: Strict vs. Fuzzy** | Require exact match (item ID, quantity, price) | Scoring-based fuzzy matching with configurable tolerance | **Fuzzy matching with confidence thresholds**: Strict matching causes > 50% exception rate in practice (vendor descriptions differ, UOM varies); fuzzy matching with auto-approve above 85% confidence and human review below dramatically reduces AP workload |
| | Pros: Zero false-positive risk; simple implementation | Pros: Higher auto-match rate; reduced manual work | |
| | Cons: High exception rate (> 50%); heavy AP burden | Cons: False positive risk; more complex algorithm; requires tuning | |
| **Document Storage: Relational vs. Event-Sourced** | Traditional relational model with current-state tables | Event-sourced with event store and projections | **Relational with event-driven notifications**: Full event sourcing adds complexity without proportional benefit for procurement; current-state queries are the dominant pattern; version history table provides audit trail; events used for cross-service communication |
| | Pros: Simple queries; well-understood; good tooling | Pros: Perfect audit trail; temporal queries; replay capability | |
| | Cons: Must build audit trail separately; version history requires explicit design | Cons: Query complexity; eventual consistency for projections; storage overhead; steep learning curve | |
| **Sealed Bids: Application vs. HSM Encryption** | Application-level encryption with server-managed keys | HSM-backed encryption with time-locked key release | **HSM-backed**: Application-level encryption means server-side code can decrypt bids early; HSM with time-locked release ensures even system administrators cannot access bids before opening time; essential for bid integrity trust |
| | Pros: Simpler implementation; no HSM dependency | Pros: Cryptographic guarantee against premature access; stronger trust model | |
| | Cons: Admin can decrypt early; weaker trust model | Cons: HSM operational complexity; cost; single point of failure if HSM unavailable | |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Why not just use a simple if-else chain for approvals?" | Test understanding of approval complexity | "If-else works for a single organization with fixed rules. But multi-tenant platforms need per-tenant configurable rules---hundreds of organizations, each with unique approval matrices. A rule engine with DSL lets organizations define approval logic as data, not code, so each tenant can customize without deploying new code. The rule compilation + caching approach gives us the flexibility of interpreted rules with near-compiled performance." |
| "Three-way matching is just comparing three numbers---why is it complex?" | Test understanding of real-world matching challenges | "In theory, yes. In practice: partial deliveries (GRN covers 60% of PO), split invoices (two invoices for one PO), unit-of-measure conversions (PO in cases, invoice in each), description mismatches (vendors use different item names), multi-currency reconciliation, and retroactive PO amendments. The matching engine is actually a constrained assignment problem with tolerance thresholds---not a simple equality check." |
| "Why not eventual consistency for budgets? It's just an internal control." | Test understanding of financial controls | "Eventual consistency for budgets means two concurrent requisitions could both see 'budget available' and both commit---leading to over-encumbrance. In a SOX-controlled environment, over-commitment requires manual journal entries, audit explanations, and potentially financial restatements. The cost of strong consistency (lock contention at quarter-end) is far less than the cost of a SOX finding. We mitigate the contention with budget slices---pre-allocated per-instance budgets that reduce the DB lock frequency." |
| "Can't you just send all bids in plaintext and trust the system not to open them early?" | Test understanding of sealed bid integrity | "Trust-based systems fail when incentives misalign. A procurement officer could peek at bids to favor a vendor (a form of bid rigging). Cryptographic sealing with HSM-backed time-locked keys removes the ability to cheat, not just the policy. Even a database administrator with full production access cannot decrypt bids before the opening time. This is a defense-in-depth approach: policy says 'don't look early', but cryptography makes it technically impossible." |
| "What if the CFO goes on vacation and has 200 pending approvals?" | Test understanding of workflow edge cases | "Multiple mechanisms: (1) Delegation---CFO sets up an out-of-office delegation to VP Finance before leaving; pending tasks are re-assigned. (2) Timeout escalation---if no delegation is set, tasks auto-escalate to CFO's manager (e.g., CEO or Board Finance Committee) after N hours. (3) Batch delegation---admin can bulk-reassign pending tasks. (4) Amount-based delegation---rules can auto-delegate items below a threshold (e.g., CFO only reviews > $500K; $100K-$500K auto-delegates to VP Finance). The system should never have an approval chain that permanently stalls." |
| "Why not just use an off-the-shelf workflow engine?" | Test pragmatic architecture thinking | "For a single organization, an off-the-shelf engine (Camunda, Temporal) works well. For a multi-tenant SaaS, the challenge is that each tenant has unique approval rules, tolerance thresholds, and budget controls. Off-the-shelf engines handle the execution (timeout, retry, state management) but not the domain logic (rule evaluation, budget encumbrance, matching algorithms). The sweet spot is using workflow engine patterns (state machine, saga, compensation) but implementing them with procurement-domain-specific semantics. If you use an external engine, you still need to build the procurement logic---and you add the operational complexity of the engine itself." |
| "How would you handle 10x scale?" | Test forward-thinking scaling ability | "Current bottlenecks at 10x: (1) Budget contention---budget slice pattern already handles this; increase slice count. (2) Matching throughput---embarrassingly parallel; scale horizontally. (3) Approval queue materialization---add more read replicas and increase cache TTL. (4) Catalog search---add search engine shards. The architectural change needed at 10x is shard-per-tenant for the largest tenants, instead of the current shared-with-RLS model. At 100x, I would consider separating the matching engine into its own service cluster with dedicated database shards, and introducing a streaming analytics pipeline instead of batch aggregation." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Correct Approach |
|---------|---------------|-----------------|
| **Treating procurement as a CRUD app** | Procurement is a workflow system with complex state machines, not just data entry and retrieval | Design around the document lifecycle chain and the approval workflow engine |
| **Ignoring the approval engine complexity** | "Just a chain of approvals" underestimates multi-dimensional rules, delegation, escalation, concurrent approval, and SoD | Present approval as the core complexity; discuss rule evaluation, chain resolution, and edge cases |
| **Using eventual consistency for financial data** | Budget over-commitment and matching errors have real financial and compliance consequences | Strong consistency for budgets and matching; eventual consistency only for analytics and search |
| **Forgetting vendor as an actor** | Vendors interact with the system (submit bids, acknowledge POs, submit invoices) with different security context | Design the vendor portal as a separate trust boundary with restricted access |
| **Ignoring SOX compliance** | Procurement systems in public companies are SOX-controlled; the audit trail is not optional | Build SoD enforcement, audit trail, and change management into the core architecture |
| **Over-focusing on throughput** | Procurement is not a high-throughput system like ad serving or payment processing; correctness > speed | Discuss consistency, audit completeness, and workflow correctness rather than QPS optimization |
| **Single-tenant design in a SaaS context** | Ignoring multi-tenant isolation leads to data leakage and noisy neighbor problems | Design tenant isolation at database, cache, search, and event bus layers |
| **Ignoring the three-way matching algorithm** | Glossing over matching as "just comparison" misses the combinatorial complexity | Present the scoring-based assignment algorithm, tolerance rules, and partial delivery handling |

---

## Scoring Rubric (Senior/Staff Level)

| Criterion | Excellent (5) | Good (3-4) | Needs Improvement (1-2) |
|-----------|---------------|------------|-------------------------|
| **Requirements** | Identifies P2P lifecycle, approval complexity, matching, budget control, vendor management, SOX compliance | Covers basic PO lifecycle and approvals; mentions matching | Only describes CRUD operations for POs |
| **Architecture** | Event-driven microservices with domain boundaries; CQRS for read/write optimization; workflow engine with configurable rules | Reasonable service decomposition; identifies major components | Monolithic design; missing key components |
| **Data Model** | Complete document chain with referential integrity; budget encumbrance three-state model; approval chain with configurable steps | PO and invoice tables with basic relationships | Single table or oversimplified model |
| **Algorithms** | Three-way matching as scoring-based assignment; approval chain resolution with multi-dimensional rules; budget encumbrance state machine | Basic matching logic; simple approval chain | No algorithmic depth |
| **Consistency** | Articulates where strong vs. eventual consistency is needed; budget locks with slice pattern; optimistic locking for approvals | Mentions consistency requirements | No consistency discussion |
| **Security** | SOX controls, SoD enforcement, sealed bid cryptography, audit trail with tamper detection | Basic authentication and role-based access | Minimal security consideration |
| **Scale** | Identifies quarter-end spikes, budget contention, matching parallelism, tenant isolation strategies | Discusses horizontal scaling generally | No scaling discussion or "just add servers" |
| **Trade-offs** | Discusses 3+ trade-offs with nuanced reasoning (strong vs. eventual consistency, strict vs. fuzzy matching, embedded vs. external workflow engine) | Mentions 1-2 trade-offs | No trade-off discussion |

---

## Interview Flow Example

### Opening (0--5 min)

**Interviewer**: "Design a procurement system."

**Candidate**: "Before I start, let me clarify a few things:

1. **Scope**: Are we designing the full procure-to-pay lifecycle (requisition through payment authorization), or just the purchase order management?
2. **Scale**: Is this for a single enterprise or a multi-tenant SaaS platform?
3. **Bidding**: Do we need competitive bidding capabilities (RFQ, reverse auctions)?
4. **Compliance**: Are there SOX or similar regulatory requirements?
5. **Integration**: What external systems do we integrate with (ERP, vendor portals, banking)?

Based on the typical interview format, I'll design a multi-tenant SaaS procurement platform covering the full P2P lifecycle with competitive bidding, configurable approvals, three-way matching, and SOX compliance."

### High-Level Design (5--15 min)

"The system has a seven-stage document lifecycle: Requisition → RFQ (optional) → Quote → Purchase Order → Goods Receipt → Invoice → Payment Authorization. Let me draw the architecture..."

[Draw the architecture diagram with Core Services, Approval Engine, Matching Engine, Budget Service, and Vendor Management as primary domains]

"Key architectural decisions:
1. **Event-driven** for cross-service communication (document lifecycle events)
2. **Strong consistency** for budget and matching; eventual for analytics
3. **Configurable workflow engine** with DSL for tenant-specific approval rules
4. **Multi-tenant** with tenant_id-scoped data access at every layer"

### Deep Dive (15--30 min)

[Choose one of: Approval Engine, Three-Way Matching, or Budget Encumbrance based on interviewer interest]

"Let me deep-dive into the three-way matching engine, as it's the core financial control..."

[Walk through the scoring-based assignment algorithm, tolerance rules, partial delivery handling, and exception routing]

### Scale & Trade-offs (30--40 min)

"The primary scalability challenges are:
1. **Quarter-end approval spikes** (5--8x normal volume)---mitigated by materialized approval queues and batch approval UI
2. **Budget contention** during year-end budget flush---mitigated by budget slice pre-allocation
3. **Month-end invoice matching batches** (10K+ invoices from large vendors)---mitigated by parallel matching workers

Key trade-off: Strong consistency for budgets vs. eventual consistency. We choose strong because SOX compliance requires accurate budget control, but we optimize with cached pre-checks to reduce DB lock frequency."

### Wrap Up (40--45 min)

"To summarize: the system is architected as an event-driven microservices platform with three critical components---the approval workflow engine (configurable rule-based routing), the three-way matching engine (scoring-based line assignment), and the budget control service (three-state encumbrance model with distributed locking). The design prioritizes correctness and auditability over raw throughput, which is appropriate for a financial controls system. SOX compliance is enforced through separation of duties, immutable audit trails, and configurable approval matrices."
