# Interview Guide

## 45-Minute Interview Pacing

| Phase | Duration | Focus | What to Evaluate |
|-------|----------|-------|------------------|
| **Problem Framing** | 0-5 min | Clarify scope: which HCM domains? Single or multi-tenant? Scale? | Asks about employee count, pay frequencies, jurisdiction complexity, compliance requirements |
| **Requirements** | 5-12 min | Functional and non-functional; prioritization of domains | Distinguishes payroll accuracy from self-service latency; identifies compliance as a first-class concern |
| **High-Level Architecture** | 12-22 min | Service decomposition, data flow, key decisions | Proposes domain-partitioned services; identifies payroll as batch vs. time capture as real-time |
| **Deep Dive** | 22-37 min | Payroll engine internals or benefits enrollment or time tracking | Demonstrates understanding of gross-to-net pipeline, retroactive adjustments, or enrollment spike handling |
| **Scalability & Trade-offs** | 37-42 min | Multi-tenant scaling, batch parallelism, compliance across jurisdictions | Discusses checkpoint recovery, jurisdiction-specific engines, effective dating |
| **Wrap-up** | 42-45 min | Open questions, extensions, future considerations | On-demand pay, AI-driven workforce planning, global expansion |

---

## Opening Question and Expected Scoping

### The Prompt

> "Design a Human Capital Management system like Workday or SAP SuccessFactors. The platform should handle payroll processing, benefits administration, and time tracking for organizations with up to 200,000 employees across multiple countries."

### Strong Scoping Response

A strong candidate will ask clarifying questions:

1. **Which domains are in scope?** "Should I focus on the payroll engine, benefits, and time tracking? Or include compensation planning, talent management, and workforce analytics too?" *(Shows awareness that HCM is extremely broad)*
2. **Multi-tenant or single-org?** "Is this a SaaS platform serving many organizations, or an internal system for one company?" *(Dramatically affects architecture)*
3. **Geographic scope?** "How many countries? US-only payroll is different from global payroll with 40 jurisdictions." *(Shows awareness of compliance complexity)*
4. **Pay frequency?** "What pay schedules---weekly, biweekly, semi-monthly, monthly? Multiple schedules within the same org?" *(Shows understanding of payroll batch mechanics)*
5. **Integration requirements?** "Do we need to generate ACH files, EDI carrier feeds, and tax filing submissions, or can we assume downstream systems handle that?" *(Shows awareness of the output side)*

### Red Flag: Jumping straight to database schema or API design without understanding the payroll calculation pipeline, compliance requirements, or batch processing constraints.

---

## Key Discussion Areas

### Area 1: Payroll Calculation Engine

**Interviewer probe:** "Walk me through how the system calculates an employee's paycheck for a biweekly pay period."

**Expected answer should cover:**
- Gross earnings calculation (salary ÷ periods or hours × rate)
- Distinction between pre-tax deductions (401k, HSA) and post-tax deductions (Roth, garnishments)
- Tax calculation sequence: federal → state → local → FICA
- YTD accumulators for correct progressive taxation and annual limits
- Net pay = gross - pre-tax deductions - taxes - post-tax deductions

**Strong answer additionally covers:**
- Imputed income (group term life over $50K, company car)
- Garnishment priority ordering (child support > tax levy > creditor garnishment)
- Multi-state taxation for remote employees (work state vs. residence state vs. reciprocal agreements)
- Retroactive adjustments and their impact on YTD accumulators

**Follow-up probe:** "What happens when an employee gets a raise effective 3 months ago?"

**Expected:** Retroactive recalculation of affected periods, calculation of the gross difference, application to the current period as a retro earnings line, with tax implications (the retro amount is taxed at the current marginal rate, not the original period's rate).

### Area 2: Batch Processing and Parallelism

**Interviewer probe:** "You need to process payroll for 150,000 employees within a 4-hour window. How do you design the batch pipeline?"

**Expected answer should cover:**
- Employee calculations are embarrassingly parallel (no inter-employee dependencies)
- Partition employees across worker pools
- Checkpoint after each employee for resumability
- Separate calculation from commitment (review gate before ACH generation)

**Strong answer additionally covers:**
- Resource contention on shared state (YTD accumulators require careful concurrency handling)
- Tax rule caching to avoid per-employee database lookups
- Error isolation: one employee's failure should not block the entire run
- Throughput math: 150K ÷ 4 hours = 37,500/hour ≈ 625/min; with 200ms per employee, need ~2 concurrent workers minimum, but want 50+ for safety margin and fault tolerance

### Area 3: Effective Dating and Temporal Queries

**Interviewer probe:** "An HR admin needs to see what an employee's salary was on a specific date 18 months ago. How does your data model support this?"

**Expected answer should cover:**
- Effective-dated records with (effective_start, effective_end) ranges
- Query pattern: `WHERE effective_start <= target_date AND effective_end > target_date`
- Distinction from audit trail (effective dating tracks the business timeline; audit tracks the system-entry timeline)

**Strong answer additionally covers:**
- Bi-temporal modeling: separate "effective date" (when the change applies in the business) from "recorded date" (when the change was entered into the system)
- This distinction matters for retroactive changes: a raise entered today but effective 3 months ago has recorded_date = today and effective_date = 3 months ago
- Implications for payroll: payroll calculation must use the effective timeline; audit queries may need the recorded timeline

### Area 4: Benefits Enrollment Architecture

**Interviewer probe:** "During open enrollment, 50,000 employees are simultaneously reviewing and selecting benefits. How do you handle this traffic spike?"

**Expected answer should cover:**
- Pre-compute personalized enrollment packages before enrollment opens
- Serve plan comparisons from read-optimized cache
- Queue-based election submission with asynchronous processing
- Horizontal scaling of the web tier

**Strong answer additionally covers:**
- Idempotent election submissions (clicking "Confirm" twice should not double-enroll)
- Enrollment window enforcement (elections outside the window are rejected)
- Dependent age-out validation during enrollment (child turning 26 mid-plan-year)
- Carrier feed delta generation after enrollment close
- Graceful degradation strategy: if under extreme load, serve cached plan data even if slightly stale

### Area 5: Organizational Hierarchy Design

**Interviewer probe:** "How do you model an organization where an employee reports to one manager (supervisory), is charged to a different cost center (financial), and belongs to a separate legal entity (compliance)?"

**Expected answer should cover:**
- Multiple independent hierarchy types, not a single tree
- Each hierarchy stored as a separate graph structure
- Employees are nodes in multiple graphs simultaneously

**Strong answer additionally covers:**
- Different hierarchies have different update frequencies and consistency requirements
- Hierarchy type affects different system behaviors (approval routing vs. tax jurisdiction vs. cost allocation)
- Closure table or materialized path for efficient subtree queries
- Effective dating on hierarchy relationships for scheduled reorganizations
- The reorganization cascade problem: moving a VP moves 5,000 employees, requiring careful incremental update

---

## Trap Questions and Strong Answers

### Trap 1: "Should we use a microservices architecture?"

**Weak answer:** "Yes, microservices are industry standard. Each domain gets its own service."

**Strong answer:** "The answer depends on the team structure and the deployment constraints. Payroll, benefits, time, and leave are genuinely different bounded contexts with different data ownership, scaling characteristics, and release cadences---payroll changes require extensive testing and approval while self-service UI changes can ship daily. So domain-partitioned services make sense at the service boundary level. However, within each domain (e.g., payroll), a modular monolith is often preferable because payroll calculation requires tight coordination between earnings, deductions, and taxes, and distributing that across multiple services adds latency and complicates the transactional boundary. The key decision is: which boundaries are services, and which are modules within a service?"

### Trap 2: "Can we use eventual consistency for payroll?"

**Weak answer:** "No, payroll must be strongly consistent."

**Strong answer:** "Within a single payroll calculation, strong consistency is non-negotiable---the gross-to-net pipeline is a strict sequential calculation where each step depends on the previous. However, the question is more nuanced than it seems. Between domains, we already tolerate eventual consistency: when an employee's address changes, the update propagates to payroll's tax jurisdiction via an event, and there's a brief window where payroll's materialized view is stale. This is acceptable because payroll is batch-oriented---we gather all inputs at the start of the run and lock them, so mid-run changes are deferred to the next period. The critical invariant is: within a pay run, the input snapshot is frozen and calculations are deterministic. Between runs, eventual consistency is actually the design."

### Trap 3: "Why not calculate payroll in real-time instead of batch?"

**Weak answer:** "Batch is simpler to implement."

**Strong answer:** "There's actually a growing demand for real-time payroll (on-demand pay / earned wage access), but it's architecturally different from traditional batch payroll. The challenge with real-time payroll is that many calculation inputs are not available in real-time: approved time data may lag by a day, benefits deductions are per-period not per-day, garnishment calculations depend on period-level disposable income, and tax withholding uses annualized methods that assume periodic payments. A real-time system can provide an estimate of earned-but-unpaid wages based on known hours and a simplified tax estimate, but the authoritative payroll calculation must happen at period-end when all inputs are finalized. The architecture needs both: a streaming estimation path for on-demand pay and a batch authority path for official payroll."

### Trap 4: "How do you handle a payroll bug that's been miscalculating taxes for the last 6 months?"

**Weak answer:** "Recalculate all affected periods and adjust."

**Strong answer:** "This is one of the most operationally complex scenarios in HCM. First, we must determine the scope: which employees, which jurisdictions, and which tax types were affected. Then we have two correction approaches: (1) recalculate all affected periods with the corrected logic and issue retro adjustments in the next pay period, or (2) calculate a lump-sum correction for the aggregate difference. Approach 1 is more accurate but computationally expensive and creates complex YTD accumulator adjustments. The tax implications are also subtle: if we over-withheld, the employees will get a refund---either through payroll adjustment or their annual tax filing. If we under-withheld, we may need to make the employees whole by absorbing the tax liability as an employer expense. We also need to file corrected quarterly tax returns (941-X) and potentially amended W-2s at year-end. The key point is that the system must support mass retroactive recalculation and maintain an audit trail showing the original calculation, the error, and the correction."

### Trap 5: "Why not store the org hierarchy as a simple parent_id column?"

**Weak answer:** "That's fine, we can just use recursive queries."

**Strong answer:** "An adjacency list with parent_id is fine for writes (moving an employee is a single row update) but terrible for the reads that HCM needs. Consider: 'Show me all employees under this VP' requires recursion to an unknown depth. 'Calculate total compensation for this cost center including all sub-cost-centers' requires aggregating across a tree. 'Find the approval chain for this purchase' walks up the tree. With 150,000 employees and 7-8 levels of hierarchy, recursive queries are expensive and slow. The right answer depends on the hierarchy's read/write ratio and change frequency. For the supervisory hierarchy (changes often, needs ancestor queries for approval routing), a closure table works well. For the cost center hierarchy (changes rarely, primarily used for aggregation rollups), a materialized path enables efficient LIKE-prefix queries. The key insight is that different hierarchies in the same system may use different storage strategies."

---

## Scoring Rubric

### Junior Level (L3-L4)

| Criterion | Expectation |
|-----------|-------------|
| Requirements | Identifies basic payroll flow: salary → deductions → net pay |
| Architecture | Proposes a reasonable service split (payroll, time, benefits) |
| Data model | Defines employee, pay run, and time entry tables |
| Scalability | Mentions batch processing and database indexing |
| Missing | Little awareness of tax complexity, retroactive adjustments, compliance requirements, or effective dating |

### Mid-Level (L5)

| Criterion | Expectation |
|-----------|-------------|
| Requirements | Distinguishes between payroll, benefits, and time as separate domains; identifies compliance requirements |
| Architecture | Domain-partitioned services with event-driven integration; batch orchestration for payroll |
| Data model | Effective-dated records, proper payroll result schema with earnings/deduction/tax lines |
| Deep dive | Can explain gross-to-net pipeline including pre-tax vs. post-tax deduction ordering |
| Scalability | Employee-level parallelism for payroll; checkpoint recovery; caching for tax rules |
| Missing | May not address multi-jurisdiction complexity, retroactive adjustment mechanics, or org hierarchy scaling |

### Senior Level (L6)

| Criterion | Expectation |
|-----------|-------------|
| Requirements | Identifies compliance as a first-class architectural concern; scopes multi-jurisdiction challenges |
| Architecture | Clear bounded contexts with well-reasoned service boundaries; CQRS for analytics; explains why certain domains are batch vs. real-time |
| Data model | Bi-temporal modeling (effective date vs. recorded date); immutable payroll records; encrypted PII fields |
| Deep dive | Explains retroactive adjustment mechanics, garnishment priority ordering, benefits enrollment spike handling, or FMLA tracking complexity |
| Scalability | Multi-tenant payroll isolation; jurisdiction-specific calculation engines; global payroll architecture |
| Compliance | Addresses SOX segregation of duties, GDPR erasure with retention exceptions, HIPAA for benefits data |
| Trade-offs | Articulates batch vs. real-time payroll trade-off; strong vs. eventual consistency nuances; hierarchy storage strategy selection |

### Staff+ Level (L7+)

| Criterion | Expectation |
|-----------|-------------|
| All L6 criteria | Met and articulated with depth |
| System-level thinking | Discusses how payroll, benefits, and time interact as a system---not just individually |
| Operational maturity | Addresses disaster recovery for payroll (what happens if the run fails 2 hours before ACH cutoff), anomaly detection, and fraud prevention |
| Business impact awareness | Connects technical decisions to business outcomes: missed payroll affects employee trust; incorrect tax withholding creates legal liability; poor self-service performance increases HR support costs |
| Evolution strategy | Discusses how to add on-demand pay, AI-driven workforce analytics, or global expansion without re-architecting the core |
| Edge cases | Proactively raises edge cases: multi-state taxation, cross-midnight shifts, FMLA intermittent leave tracking, merger/acquisition data migration |

---

## Extension Topics (If Time Allows)

| Topic | Discussion Points |
|-------|------------------|
| **On-demand pay (earned wage access)** | Streaming estimation vs. batch authority; partial disbursement tracking; how earned-but-unpaid wages are calculated before period-end |
| **AI-driven workforce analytics** | Attrition prediction models; compensation benchmarking; skills gap analysis; ethical considerations for AI in HR decisions |
| **Merger and acquisition** | Migrating employee data between HCM systems; harmonizing compensation structures, benefits plans, and leave policies; maintaining dual payroll during transition |
| **Multi-country payroll expansion** | Adding a new country: new tax engine module, statutory deduction rules, government filing formats, data residency requirements; country-specific employee self-service |
| **Compliance automation** | Auto-detecting regulation changes and modeling their impact; ACA eligibility tracking (variable-hour employees); predictive compliance risk scoring |
| **Employee data portability** | GDPR data portability across HCM vendors; open data standards for HR; verifiable employment history (blockchain-based employment verification) |
