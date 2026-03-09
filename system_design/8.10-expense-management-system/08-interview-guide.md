# Interview Guide

## 45-Minute Interview Pacing

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|-----------------|
| **1. Requirements** | 5 min | Clarify company size, multi-currency needs, card integration, compliance requirements | Functional requirements, scale numbers, key SLOs |
| **2. High-Level Design** | 10 min | Receipt pipeline, policy engine, approval workflow, core services | System diagram, expense submission flow, component responsibilities |
| **3. Deep Dive** | 15 min | Pick 1--2: OCR pipeline, policy engine, approval workflow, card transaction matching | Detailed design of critical paths with trade-offs |
| **4. Scale & Reliability** | 7 min | Month-end surge, multi-tenant isolation, audit trail integrity | Sharding approach, failure handling, degradation strategy |
| **5. Wrap-Up** | 3 min | Summary, future enhancements (AI-powered insights) | Prioritized list of improvements |

### Meta-Commentary: Why This Problem Is Harder Than It Looks

This system is deceptively complex---it appears to be a CRUD app for tracking expenses, but a production-grade expense management platform involves:

- **ML pipeline** for receipt OCR, categorization, and fraud detection
- **Rule engine** for configurable, multi-layered policy evaluation
- **Workflow engine** for dynamic, hierarchical approval chains
- **Financial processing** for reimbursement, card reconciliation, and accounting integration

The interviewer is most likely evaluating: policy engine flexibility, approval state machine correctness, OCR pipeline reliability, and multi-tenant data isolation. Do not over-focus on ML model details for OCR---focus on the pipeline architecture and human-in-the-loop correction flows.

The **month-end surge** pattern is a key scaling concern. Expense submission volume can spike 10--20x in the last three days of a reporting period.

---

## Phase 1: Requirements Gathering (5 min)

### Questions to Ask the Interviewer

1. **"What size organizations are we targeting---SMBs with flat approval chains, or enterprises with complex hierarchical approvals?"**
   *Why*: Enterprise customers require configurable approval hierarchies, delegation rules, cost center breakdowns, and department-level budgets.

2. **"Do we need to support corporate card transaction matching, or just manual receipt-based expense reports?"**
   *Why*: Card integration adds real-time transaction feeds, automatic matching algorithms, and reconciliation workflows.

3. **"Is multi-currency support required, and do employees get reimbursed in their local currency?"**
   *Why*: Multi-currency adds exchange rate management and conversion timing decisions (submission-time vs. approval-time vs. reimbursement-time rate).

4. **"What compliance and audit requirements exist---SOX controls, tax receipt validation, per-diem government rates?"**
   *Why*: Compliance requirements determine whether audit trails need immutable storage and whether policies must enforce jurisdiction-specific rules.

### Establishing Constraints

```
"Based on our discussion, I'll design an expense management platform that:
 - Supports enterprises with 10K--100K employees per tenant
 - Handles both manual receipt submission and corporate card transaction feeds
 - Processes 5M expense reports/month across all tenants
 - Performs OCR on 20M receipts/month with < 5s processing time
 - Supports 50+ currencies with configurable conversion policies
 - Enforces configurable expense policies with sub-second evaluation
 - Handles 15x traffic surge in last 3 days of each reporting period
 - Maintains immutable audit trails for 7+ years"
```

---

## Phase 2: High-Level Design (10 min)

### Recommended Approach

1. **Start with the expense submission flow**: employee captures receipt -> OCR extracts data -> auto-categorization -> policy check -> approval routing -> reimbursement.
2. **Identify core services**: Receipt Processing (OCR), Policy Engine, Approval Workflow, Card Transaction Matching, Reimbursement, Reporting/Analytics.
3. **Draw the data flow**: Show how data moves from receipt capture through to reimbursement and accounting export.
4. **Highlight the key design decision**: The policy engine architecture---this is what differentiates an expense system from a generic form-submission app.

### Common Mistakes at This Phase

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Treating it as a CRUD app | Misses the rule engine, workflow engine, and ML pipeline complexity | Lead with the policy engine and OCR pipeline as core differentiators |
| Ignoring the card feed path | Card transactions are 60--70% of enterprise expenses | Show both manual submission AND card-matched expense flows |
| Hard-coding approval chains | Every organization has different hierarchies | Design a configurable workflow engine with dynamic routing |
| Skipping the month-end surge | The system's hardest scaling challenge is temporal | Mention bursty load patterns and pre-provisioning strategy |

---

## Phase 3: Deep Dive (15 min)

### Deep Dive Option A: OCR Receipt Pipeline

**Key points to cover:**
- **Staged pipeline**: Image upload -> Pre-processing (deskew, contrast) -> OCR extraction -> Field parsing (merchant, amount, date, tax) -> Confidence scoring -> Auto-accept or human review queue
- **Async by design**: Receipt upload returns immediately with pending status. Processing happens via a task queue. Client polls or receives push notification on completion.
- **Confidence threshold**: Above 95% auto-populate fields. Between 80--95% populate but flag for review. Below 80% route to manual entry.
- **Human-in-the-loop**: Corrections feed back as labeled training data for model improvement.
- **Duplicate detection**: Perceptual hashing prevents the same receipt from being reimbursed twice.

**Impressive addition**: "Store the raw OCR output alongside parsed fields so improved parsing logic can re-parse historical receipts without re-running the expensive OCR model."

### Deep Dive Option B: Policy Engine

**Key points to cover:**
- **Rule structure**: Policies are composed of conditions (amount > $X, category = meals) and actions (auto-approve, flag, reject, escalate).
- **Evaluation order**: Per-expense rules -> per-report rules -> per-period aggregate rules (e.g., "monthly meal spend < $500").
- **Tenant-configurable**: Policies stored as structured rule definitions, not code. Admin UI allows non-technical administrators to create/modify rules without deployments.
- **Versioning**: Every policy change is versioned. An expense is evaluated against the policy version active at submission time---never retroactively.
- **Performance**: Pre-compile frequently used policies into an in-memory evaluation tree. Policy evaluation must complete in < 50ms.

**Impressive addition**: "Aggregate policies require a real-time running total. Maintain a materialized counter per (tenant, cost_center, category, period) updated on each submission."

### Deep Dive Option C: Approval Workflow Engine

**Key points to cover:**
- **State machine**: Draft -> Submitted -> Policy_Check -> Pending_Approval -> Approved/Rejected -> Processing_Reimbursement -> Reimbursed. Each transition is an immutable audit event.
- **Dynamic routing**: Approval chain computed at submission time based on org hierarchy, amount, category, cost center. Snapshot the chain so org chart changes mid-approval do not alter it.
- **Delegation**: Approvers delegate to a substitute for a date range. Delegation is transitive up to a configurable depth with cycle detection.
- **Escalation**: Auto-escalate to manager's manager if no action within configurable SLA (e.g., 48 hours).
- **Parallel vs. sequential**: Sequential for hierarchy-based (manager -> director -> VP). Parallel for split-funded expenses (cost center A manager AND cost center B manager).

### Deep Dive Option D: Card Transaction Matching

**Key points to cover:**
- **Dual ingestion**: Batch files (daily) and real-time webhooks from card networks.
- **Matching algorithm**: Exact match on amount + date + merchant, plus fuzzy matching for tips, merchant name variations, and date mismatches (authorization vs. posting date).
- **Orphan handling**: Unmatched card transactions older than N days trigger employee reminders.
- **Split transactions**: Support splitting a single card charge across multiple expense categories (hotel bill with room + meals + parking).

---

## Trap Questions and How to Handle Them

### 1. "Can't you just use a simple if-else for policy checks?"

**Good answer**: "For a single company with five rules, yes. But enterprise expense management serves thousands of tenants, each with 50--200 rules that change quarterly. A rule engine lets administrators modify rules via UI without deployments. It supports rule composition with AND/OR logic, inheritance across org units, and version-controlled rollback---all evaluated at runtime against structured definitions, not compiled code."

### 2. "Why not process reimbursements in real-time?"

**Good answer**: "Three problems: (1) batching 1,000 reimbursements into one ACH file is 100x cheaper than individual transfers; (2) no reconciliation window means duplicate reimbursements are hard to claw back; (3) approved expenses may still be flagged by post-approval audits. Batch processing provides cost efficiency, a reconciliation buffer, and a fraud detection window."

### 3. "What if the OCR is wrong?"

**Good answer**: "Design assuming imperfect extraction. Confidence scoring routes low-confidence results to manual review. Cross-validation against card transaction data flags amount discrepancies. A correction UI lets employees fix errors, and those corrections feed back as training data. Perceptual hashing catches duplicate receipt submissions."

### 4. "Why do you need a separate approval service?"

**Good answer**: "The approval workflow has its own state machine, SLA tracking, delegation logic, and escalation rules. A separate service avoids coupling approval changes with expense submission risk. It also enables reuse---the same engine handles purchase orders, travel requests, and invoice approvals via event-driven communication."

### 5. "How do you handle expenses in 50 different currencies?"

**Good answer**: "Store every amount with its original currency. Convert at the daily rate on the transaction date for policy evaluation, but use the rate on the reimbursement processing date for actual payment. Store both original and converted amounts with the exchange rate used for auditability. A rate service caches daily rates and supports historical lookups."

### 6. "What happens when an approver is on vacation?"

**Good answer**: "Three mechanisms: (1) proactive delegation with date ranges; (2) auto-escalation after configurable SLA timeout; (3) admin override for manual reassignment. Cycle detection prevents A-delegates-to-B-delegates-to-A loops. All delegation and escalation actions are recorded in the audit trail."

### 7. "Why not just store receipts in the database?"

**Good answer**: "Receipt images (1--5 MB each) bloat table sizes, degrade query performance, and make the database the bottleneck for both reads and writes. Object storage scales horizontally, supports CDN integration, provides lifecycle policies for archival, and costs 10--50x less per GB. The database stores only metadata and a URI reference."

### 8. "How do you prevent expense fraud?"

**Good answer**: "Multi-layered: (1) duplicate detection via perceptual hashing and exact-match on (amount, date, merchant); (2) anomaly detection ML model flags spending outliers; (3) policy guardrails with hard limits and receipt requirements; (4) cross-reference validation against card transactions and calendar data; (5) random post-approval audits. All signals feed into a per-employee risk score that adjusts scrutiny level."

---

## Trade-Off Discussions

### 1. Sync vs. Async OCR Processing

Synchronous provides immediate feedback but blocks requests for 3--8 seconds and scales poorly. Asynchronous returns instantly and scales via worker pools but adds UX complexity. **Recommendation**: Async with optimistic UX---show progress indicator and allow manual entry while OCR processes, auto-populate on completion.

### 2. Embedded vs. External Policy Engine

Embedded is simpler with lower latency but couples policy changes to code deployments. External enables admin-UI policy changes and cross-service reuse but adds a network hop. **Recommendation**: External engine for enterprise tier; embedded for SMB tier.

### 3. Push vs. Pull for Card Transaction Feed

Pull (daily batch files) is simple but delays visibility by 12--24 hours. Push (webhooks) provides near-instant visibility but requires retry/dedup infrastructure. **Recommendation**: Both---webhooks for real-time visibility, batch files as the authoritative reconciliation source.

### 4. Single DB vs. Per-Tenant Database

Shared database is operationally simpler but has noisy-neighbor risk and weaker isolation. Per-tenant provides complete isolation but multiplies operational overhead. **Recommendation**: Shared with row-level security for standard tier; dedicated databases for enterprise compliance requirements.

### 5. Real-time vs. Batch Reimbursement

Real-time improves employee experience but incurs per-transaction fees and offers no reconciliation window. Batch aggregates transfers cheaply with an audit buffer but delays reimbursement. **Recommendation**: Batch with configurable frequency; optional expedited reimbursement as a premium feature.

### 6. Rule-based vs. ML-based Categorization

Rule-based is deterministic and auditor-friendly but brittle with merchant name variations. ML handles variations gracefully and learns from corrections but is non-deterministic. **Recommendation**: Hybrid---ML proposes category, rule-based overrides for known merchants, user corrections retrain the model. Audit trail records assignment method.

---

## Common Mistakes to Avoid

1. **Designing a flat approval chain**: Real organizations have matrix reporting, cost center splits, and threshold-based escalation. A single-level "send to manager" is insufficient.
2. **Treating OCR as a solved problem**: Accuracy varies wildly by receipt quality, language, and format. Design for failure with confidence scores and correction loops.
3. **Ignoring the month-end surge**: The last 3 days of a reporting period can see 15--20x normal traffic. Design auto-scaling triggers and pre-warm capacity.
4. **Forgetting the audit trail**: Every state change, policy evaluation, and approval action must be in an append-only log. Financial auditors will require this.
5. **Hard-coding currency conversion logic**: Exchange rates change daily. Conversion timing is a per-tenant business decision. Make it configurable.
6. **Overlooking card-to-expense matching**: Fuzzy matching, split transactions, and timing mismatches make this a non-trivial reconciliation problem.
7. **Designing policies as code rather than data**: Policy changes requiring deployments cannot scale to thousands of tenants. Store as structured data, evaluate at runtime.
8. **Skipping reimbursement reconciliation**: The gap between "approved" and "paid" involves payment file generation, bank acknowledgment, settlement confirmation, and failure handling.

---

## Scoring Rubric

### Junior Level (Meets Bar)
- Identifies core entities: expense, report, receipt, approver
- Designs basic submission and approval flow
- Mentions OCR for receipt processing
- Basic data model with expense categories

### Senior Level (Strong Hire)
- Designs configurable policy engine with rule composition
- Handles approval delegation, escalation, and SLA tracking
- Discusses OCR pipeline with confidence scoring and fallback
- Addresses multi-currency with conversion timing decisions
- Proposes card transaction matching with fuzzy logic
- Designs for month-end surge with scaling strategy
- Maintains immutable audit trail for compliance

### Staff Level (Exceptional)
- Designs policy engine as a reusable, tenant-configurable rule evaluation system
- Analyzes multi-tenancy isolation trade-offs with compliance context
- Discusses fraud detection as a multi-layered system
- Designs approval workflow as a separate, reusable state machine service
- Proposes OCR correction feedback loop as a continuous learning system
- Addresses reimbursement reconciliation as a financial operations pipeline

---

## Quick Reference Card

### Key Numbers

| Metric | Target |
|--------|--------|
| Tenants | 10K organizations |
| Employees per tenant | 10K--100K |
| Expense reports/month | 5M |
| Receipts processed/month | 20M |
| OCR processing latency | < 5 seconds (p95) |
| Policy evaluation latency | < 50ms (p99) |
| Month-end surge factor | 15--20x normal QPS |
| Audit log retention | 7+ years |
| Receipt storage | ~50 TB/year (at 2.5 MB avg) |

### Critical Components to Mention

- **Receipt Processing Pipeline**: Async OCR with confidence scoring and human-in-the-loop
- **Policy Engine**: Tenant-configurable rule evaluation with versioning
- **Approval Workflow Engine**: State machine with delegation, escalation, and SLA tracking
- **Card Transaction Matcher**: Dual-ingestion (webhook + batch) with fuzzy matching
- **Reimbursement Processor**: Batch payment file generation with reconciliation
- **Audit Log**: Append-only, immutable event store for all state transitions

### Differentiating Insights

1. "This looks like a CRUD app but is actually four systems: an ML pipeline, a rule engine, a workflow engine, and a financial processor."
2. "The month-end surge is the defining scaling challenge---design for 20x peak, not average load."
3. "Policy evaluation must be versioned---an expense submitted on March 1st uses March 1st policies, even if policies changed on March 2nd."
4. "Card transaction matching is a data reconciliation problem, not a simple JOIN. Merchant name normalization alone is a significant sub-problem."
5. "The audit trail is not a nice-to-have---it is a regulatory requirement. Every field change, every approval, every policy evaluation result must be recorded immutably."

---

## Extension Topics (If Time Permits)

1. **AI-powered spend insights**: Analyze spending patterns across the organization and surface optimization recommendations.
2. **Budget forecasting**: Predict future expense volume per cost center based on historical patterns and headcount changes.
3. **Tax compliance automation**: Handle jurisdiction-specific tax rules---VAT reclaim, GST input credits, government per-diem rates.
4. **Virtual card issuance**: Issue per-transaction virtual cards with pre-set spending limits and merchant restrictions.
5. **ERP integration**: Sync approved expenses to accounting systems with chart-of-accounts mapping and journal entry generation.
6. **Offline receipt capture**: Handle mobile receipt capture without connectivity using local processing and background sync.
