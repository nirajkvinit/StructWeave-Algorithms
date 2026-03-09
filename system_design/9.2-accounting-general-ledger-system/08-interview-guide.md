# Interview Guide

## 45-Minute Interview Pacing

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|-----------------|
| **1. Problem Framing** | 5 min | Clarify scope: entity count, industry, regulatory requirements, ERP integration | Functional requirements, scale numbers, consistency SLOs |
| **2. High-Level Architecture** | 10 min | Core components, CQRS separation, event sourcing for audit trail, data store selection | System diagram, posting flow, component responsibilities |
| **3. Deep Dive** | 15 min | Pick 2--3: double-entry engine, bank reconciliation, period close, multi-currency, revenue recognition, audit trail | Detailed design of critical paths with trade-offs |
| **4. Scalability & Bottlenecks** | 10 min | Month-end posting storm, hot account sharding, report isolation, multi-entity consolidation | Scaling strategy, failure handling, degradation approach |
| **5. Trade-offs & Extensions** | 5 min | Consistency vs. performance, real-time vs. batch, storage growth management | Prioritized trade-off analysis, extension roadmap |

### Meta-Commentary: Why This Problem Is Harder Than It Looks

An accounting system appears to be a straightforward transactional database application, but a production-grade general ledger involves:

- **Domain-specific invariants**: The fundamental accounting equation (Assets = Liabilities + Equity) must hold at all times---a single unbalanced entry corrupts the entire ledger
- **Immutability as a core constraint**: Unlike most systems where you can "fix" data, accounting mandates append-only corrections via reversing entries
- **Temporal complexity**: Period close, multi-currency revaluation, and intercompany elimination are multi-step orchestrated workflows with strict ordering
- **Regulatory weight**: SOX compliance, audit trail integrity, and segregation of duties are not optional features---they are foundational requirements

The interviewer is most likely evaluating: understanding of double-entry bookkeeping, CQRS/event sourcing applied to financial data, concurrency handling for hot accounts, and awareness of compliance constraints. Do not over-focus on generic microservice patterns---demonstrate domain depth.

---

## Phase 1: Problem Framing (Minutes 0--5)

### Questions to Ask the Interviewer

1. **"Are we designing for a single entity or multi-entity with consolidation across subsidiaries?"**
   *Why*: Multi-entity introduces intercompany elimination, minority interest calculations, and consolidation hierarchies that fundamentally shape the data model.

2. **"What industry---SaaS with subscription revenue, manufacturing with inventory costing, or financial services with trading positions?"**
   *Why*: Industry determines sub-ledger complexity. SaaS needs revenue recognition (ASC 606). Manufacturing needs cost-of-goods-sold tracking. Financial services needs mark-to-market revaluation.

3. **"Is SOX compliance required, and do we need segregation of duties enforcement?"**
   *Why*: SOX mandates that the person creating a journal entry cannot be the person approving it. This affects API design, workflow engine, and access control throughout the system.

4. **"Does this integrate with an existing ERP, or is this the system of record?"**
   *Why*: Integration mode means accepting journal entries from upstream systems with idempotency and reconciliation. System-of-record mode means owning the chart of accounts and sub-ledger management.

### Establishing Constraints

```
"Based on our discussion, I'll design a general ledger system that:
 - Supports 50+ entities with hierarchical consolidation
 - Processes 10M journal entries/month with sub-second posting latency
 - Maintains strong consistency for all ledger writes (debits = credits)
 - Handles 100+ currencies with daily revaluation
 - Provides immutable, hash-chained audit trail retained for 10+ years
 - Survives 50x posting volume during month-end close (last 3 days)
 - Enforces segregation of duties with configurable approval workflows
 - Generates financial statements (balance sheet, income statement, cash flow)
   within 30 minutes of period close"
```

---

## Phase 2: High-Level Architecture (Minutes 5--15)

### Recommended Approach

1. **Start with the journal entry posting flow**: Source system submits entry -> Validation (balanced? authorized? period open?) -> GL Posting Engine writes to ledger -> Event emitted -> Balances updated -> Audit trail recorded.
2. **Identify core services**: Journal Entry Service, GL Posting Engine, Chart of Accounts Service, Sub-Ledger Services (AR/AP/FA), Reconciliation Engine, Period Close Orchestrator, Reporting Engine.
3. **Establish the CQRS split**: Write path uses a relational store with ACID transactions for the ledger. Read path uses materialized views and an analytical store for reporting.
4. **Highlight event sourcing**: Journal entries are natural events. The current balance is a projection of all posted entries. This provides a built-in audit trail.

### Common Mistakes at This Phase

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Using eventual consistency for the ledger | A trial balance that does not balance is a showstopper---auditors will reject the system | Use strong consistency with ACID transactions for all posting operations |
| Storing mutable balance records | Overwriting balances destroys the audit trail and makes reconciliation impossible | Balances are derived from immutable journal entries; cache them but never treat them as source of truth |
| Single monolithic posting service | Month-end close and daily posting compete for the same resources | Separate posting infrastructure from reporting; use CQRS to isolate read and write workloads |
| Ignoring the chart of accounts hierarchy | A flat account list cannot support roll-up reporting or consolidation | Design accounts as a tree with parent-child relationships and configurable segment structures |

---

## Phase 3: Deep Dive (Minutes 15--30)

### Deep Dive Option A: Double-Entry Posting Engine with Balance Sharding

**Key points to cover:**

- **Balanced entry validation**: Every journal entry must have total debits equal total credits. Enforce at three levels: (1) application-level validation before persistence, (2) database-level CHECK constraint on the entry table, (3) periodic reconciliation job that verifies all entries in a period sum to zero.

- **Posting pseudocode**:

```
FUNCTION postJournalEntry(entry):
    VALIDATE entry.totalDebits == entry.totalCredits
    VALIDATE entry.period IS open
    VALIDATE entry.approver != entry.creator  // SoD

    BEGIN TRANSACTION
        INSERT entry INTO journal_entries WITH status = 'posted'
        FOR EACH line IN entry.lines:
            INSERT line INTO journal_lines
            UPDATE account_balance_shard
                SET balance = balance + line.amount
                WHERE account_id = line.account_id
                  AND shard_id = HASH(entry.id) MOD shard_count
        INSERT audit_event WITH hash = SHA256(prev_hash + entry_data)
    COMMIT TRANSACTION

    EMIT event JournalEntryPosted(entry.id)
```

- **Hot account problem**: Cash and revenue accounts receive thousands of concurrent postings. A single row lock creates a bottleneck. Solution: shard the balance across N rows per account. Each posting writes to one shard selected by hash. Balance reads merge all shards:

```
FUNCTION getAccountBalance(account_id, as_of_date):
    shards = SELECT SUM(balance) FROM account_balance_shards
             WHERE account_id = account_id
               AND effective_date <= as_of_date
    RETURN shards.sum
```

- **Optimistic concurrency**: Use version vectors on balance shards. If a concurrent update incremented the version, retry with backoff. For hot accounts with high contention, increase shard count dynamically.

**Impressive addition**: "Balance sharding introduces a merge-on-read cost. For reporting queries that aggregate thousands of accounts, pre-compute period-end snapshots during close so reports read from a single materialized row per account per period."

### Deep Dive Option B: Bank Reconciliation Auto-Matching

**Key points to cover:**

- **Three-phase matching pipeline**:
  - **Phase 1 -- Exact match**: Match bank statement lines to GL entries on (amount, date, reference number). Catches 60--70% of transactions.
  - **Phase 2 -- Fuzzy match**: Apply tolerances: amount +/- 0.01 (rounding), date +/- 3 days (clearing delay), payee name Levenshtein similarity > 0.85. Catches 15--20%.
  - **Phase 3 -- ML-based match**: Model trained on historical decisions handles many-to-one groupings, description parsing, and pattern recognition. Catches 5--10% with confidence scoring.

- **Confidence routing**: Above 0.95 auto-confirmed. Between 0.70--0.95 flagged for human review. Below 0.70 enters investigation queue.

- **Many-to-one matching**: A single bank deposit may represent multiple GL entries (batch customer payments). Group GL entries by date and verify sum matches within tolerance.

- **Reconciliation state machine**: Unreconciled -> Auto-Matched -> Reviewed -> Confirmed -> Reconciled. Unmatched items after N days trigger investigation workflow.

**Impressive addition**: "Track matching accuracy by phase over time. If Phase 1 match rate drops, it signals a data quality issue in reference numbers. If Phase 3 improves, promote learned rules into Phase 2 for deterministic matching."

### Deep Dive Option C: Period Close Orchestration

**Key points to cover:**

- **Close sequence** (strict ordering): Soft close -> Sub-ledger reconciliation -> Accruals/adjustments -> Bank reconciliation -> Multi-currency revaluation -> Intercompany elimination -> Trial balance verification -> Hard close -> Financial statement generation -> Year-end close (annually, closing income/expense to retained earnings).

- **Orchestration as a state machine**: Each step is a state transition. The machine persists progress so that if revaluation fails, the system re-runs from that step without re-executing prior steps (idempotent steps).

- **Blocking dependencies**: Sub-ledger discrepancies block close until resolved. Parent entity close cannot proceed until all subsidiary closes complete.

- **Multi-entity consolidation**: After subsidiaries close, generate elimination entries for intercompany receivables/payables and revenue/expenses, then produce consolidated statements.

**Impressive addition**: "Model the close calendar as a DAG of tasks with dependencies. Visualize progress so controllers can see which subsidiaries are blocking the consolidated close."

### Deep Dive Option D: Multi-Currency with Revaluation

**Key points to cover:**

- **Three currency layers**: Source (transaction currency), functional (entity's operating currency), reporting (parent's presentation currency).

- **Exchange rate management**: Daily rates from a feed service stored as effective-dated, immutable rows. Never overwrite a rate.

- **Transaction recording**: Store source amount, exchange rate, and functional-currency equivalent---all immutable once posted.

- **Periodic revaluation**: For each foreign-currency monetary account, compute gain/loss as (balance_in_source * period_end_rate) minus current_functional_balance. Post unrealized gain/loss entries. Reverse unrealized entries at period start; record realized gain/loss on settlement.

**Impressive addition**: "For hyperinflationary economies, standard revaluation is insufficient. Consider IAS 29 adjustments that restate non-monetary items using a general price index."

### Deep Dive Option E: Revenue Recognition Engine (ASC 606)

**Key points to cover:**

- **Five-step model**: (1) Identify the contract, (2) Identify performance obligations, (3) Determine transaction price, (4) Allocate price to obligations, (5) Recognize revenue when obligations are satisfied.

- **Contract decomposition**: A single sales order may contain multiple performance obligations (software license, implementation services, ongoing support). Each has a distinct revenue recognition schedule.

- **Recognition schedules**: Point-in-time (product delivered), over-time (service rendered), usage-based (consumption metering). Each generates journal entries on different triggers.

- **Modification handling**: Contract amendments require re-evaluation of allocation. The engine must support prospective and cumulative catch-up adjustment methods.

**Impressive addition**: "Revenue recognition errors are a top cause of financial restatements. Build a shadow ledger that independently computes revenue from raw contract data. Discrepancies between the shadow and primary ledger trigger alerts before financial close."

### Deep Dive Option F: Immutable Audit Trail with Hash Chaining

**Key points to cover:**

- **Hash chain construction**: Each audit event includes a SHA-256 hash of the previous event (combining prev_hash + timestamp + user_id + action + entity + payload_hash). Modifying any historical event breaks the chain from that point forward.

- **Verification**: A background job periodically re-computes the hash chain and verifies integrity. Any break triggers an immediate alert.

- **Access control**: The audit log table has no UPDATE or DELETE grants. Even database administrators cannot modify the trail without detection.

- **Tiered retention**: Hot (current fiscal year, primary database), warm (1--7 years, compressed columnar storage), cold (7+ years, immutable object storage with legal hold).

**Impressive addition**: "Maintain per-entity hash chains rather than a global chain. This allows independent verification per entity without requiring the parent's full chain traversal."

---

## Phase 4: Scalability & Bottlenecks (Minutes 30--40)

### Month-End Posting Storm

The last three days of a reporting period can see 50x normal posting volume as adjusting entries, accruals, and reconciliation corrections flow in simultaneously.

- **Predictable spike**: Unlike random traffic spikes, month-end is scheduled. Pre-provision dedicated close infrastructure.
- **Batch posting**: Aggregate individual journal lines into batch entries. A single batch of 10,000 lines in one transaction is faster than 10,000 individual single-line transactions.
- **Queue-based processing**: Route entries through a message queue with dedicated consumer pools. Priority queues ensure close-critical entries (accruals, revaluation) process before discretionary adjustments.
- **Separate close infrastructure**: Dedicated posting nodes for period-close workloads prevent interference with daily operational posting.

### Hot Account Problem

- **Diagnosis**: Cash and revenue accounts in a large enterprise may receive 10,000+ concurrent postings per second.
- **Solution**: Balance sharding (described in Deep Dive A). Partition each hot account's balance across N shards. Writers select a shard via hash; readers merge all shards.
- **Dynamic shard scaling**: Monitor contention metrics. If retry rates exceed threshold, automatically increase shard count for that account.

### Report Generation Isolation

- **Problem**: Complex financial reports (trial balance, consolidation) perform heavy aggregation queries that compete with posting for database resources.
- **Solution**: CQRS with read replicas. Posting writes to the primary. Reports query from a replica or a dedicated analytical store populated via change data capture.
- **Materialized period snapshots**: At period close, snapshot all account balances into a denormalized reporting table. Historical reports query snapshots, not the live ledger.

### Multi-Entity Consolidation

- **Challenge**: A parent entity with 50 subsidiaries requires aggregating all balances, eliminating intercompany transactions, and handling minority interests.
- **Approach**: Async processing with a dependency graph. Each subsidiary closes independently. When all subsidiaries in a consolidation group are closed, trigger elimination entry generation and consolidated statement production.
- **Elimination entries**: Automatically identify and eliminate intercompany receivables/payables, revenue/expenses, and investments/equity using configurable matching rules.

---

## Phase 5: Trade-offs & Extensions (Minutes 40--45)

### Key Trade-off Discussions

**1. Strong Consistency vs. Write Throughput for GL Posting**

Strong consistency ensures trial balance integrity at all times but limits throughput to what a single serializable transaction can sustain. Relaxing to "eventual balance consistency" increases throughput but risks temporary trial balance imbalance. **Recommendation**: Strong consistency for the core ledger is non-negotiable. Achieve throughput via balance sharding, not by relaxing consistency guarantees.

**2. Real-Time vs. Batch Bank Reconciliation**

Real-time reconciliation provides instant visibility into cash position but requires streaming infrastructure and handles partial matches poorly. Batch reconciliation (daily or intra-day) is simpler and allows many-to-one matching with complete data. **Recommendation**: Batch reconciliation as the primary method with real-time match attempts for exact matches. Flag exceptions for the next batch cycle.

**3. Event Sourcing Storage Growth**

Event sourcing provides a natural audit trail but grows unboundedly. Ten million entries per month at 2 KB each is 240 GB/year of raw events. **Recommendation**: Snapshot balances at period boundaries. Events older than the retention requirement move to cold storage. Replay from the nearest snapshot rather than from genesis.

**4. Embedded vs. External Approval Workflow**

Embedding approval logic in the posting service is simpler but couples authorization with transaction processing. A separate workflow service enables reuse across journal entries, purchase orders, and payment approvals. **Recommendation**: External workflow service for enterprises requiring SOX compliance; inline approval for simpler deployments.

### Extension Points

1. **Continuous close**: Eliminate the concept of monthly close by continuously reconciling and generating real-time financial statements.
2. **AI-driven anomaly detection**: Flag journal entries that deviate from historical patterns---unusual amounts, unusual accounts, unusual timing, unusual preparers.
3. **Predictive cash flow**: Use historical posting patterns to forecast future cash positions.
4. **Blockchain-anchored audit trail**: Periodically anchor the hash chain root to a public blockchain for third-party verifiability without running a full blockchain.

---

## Common Questions and Strong Answers

### Q1: "How do you ensure debits always equal credits?"

**Strong answer**: "Enforcement at four layers: (1) **Application validation**---the API rejects any entry where the sum of debit lines does not equal the sum of credit lines before touching the database. (2) **Database constraint**---a CHECK constraint or trigger on the journal entry table that verifies balance on INSERT. (3) **Event-level verification**---the event emitted after posting includes a hash that encodes the balanced entry, and consumers verify it. (4) **Periodic reconciliation**---a scheduled job computes the sum of all debits and credits per period and alerts if they differ by even one cent. The principle is defense-in-depth: no single layer is trusted alone."

### Q2: "What happens when two users post to the same account simultaneously?"

**Strong answer**: "For normal accounts with moderate contention, optimistic locking with version vectors suffices. The first transaction commits; the second detects a version mismatch and retries. For hot accounts like cash or revenue that receive thousands of concurrent postings, I use **balance sharding**: the account's balance is split across N rows, each posting targets one shard selected by a hash of the entry ID, and balance reads merge all shards. This converts a single-row bottleneck into N independent write targets. Shard count is tunable per account based on observed contention."

### Q3: "How do you handle corrections if entries are immutable?"

**Strong answer**: "Accounting has a fundamental principle: you never delete or modify a posted entry. Instead, corrections are made through **reversing entries**---a new entry that is the exact mirror (debits become credits, credits become debits) of the original, effectively zeroing its impact. Then a new correct entry is posted. For partial corrections, an **adjusting entry** posts only the difference. The audit trail shows the original, the reversal, and the correction as three distinct, linked events. This preserves the complete history and satisfies auditor requirements."

### Q4: "How does the system handle a 100x spike during month-end close?"

**Strong answer**: "Month-end spikes are predictable, which is an advantage. Four strategies: (1) **Pre-provisioned close infrastructure**---dedicated posting nodes spun up before close begins, sized based on historical close volumes. (2) **Batch posting**---aggregate thousands of adjusting entries into batch transactions rather than individual posts. (3) **Queue-based ingestion**---a message queue absorbs the burst; dedicated consumer pools process at a controlled rate with back-pressure. (4) **Priority-based processing**---close-critical entries (accruals, revaluation, elimination) get priority queue lanes; discretionary entries queue behind them. The close orchestrator tracks progress and can dynamically allocate more consumers to bottleneck stages."

### Q5: "How do you prevent fraud in the accounting system?"

**Strong answer**: "Five-layer defense: (1) **Segregation of duties**---the entry creator, approver, and poster must be different users, enforced by the system, not by policy alone. (2) **Dual approval**---entries above configurable thresholds require two independent approvals. (3) **Hash-chained audit trail**---every action is recorded in a tamper-evident log; modifying any historical record breaks the chain and triggers alerts. (4) **Anomaly detection**---flag entries that deviate from historical patterns: unusual amounts, unusual account combinations, entries posted outside business hours, entries just below approval thresholds. (5) **Real-time alerting**---critical events (manual journal entries to revenue accounts, entries posted during close by non-close personnel) trigger immediate notification to controllers."

### Q6: "How do you handle multi-currency in a global enterprise?"

**Strong answer**: "Three currency layers: source (transaction currency), functional (entity's operating currency per IAS 21), and reporting (parent's presentation currency). Every transaction stores the source amount, the exchange rate, and the functional-currency equivalent---all immutable. Daily rates are ingested from a rate service and stored as effective-dated records, never overwritten. At period end, a revaluation process restates all foreign-currency monetary balances at the closing rate and posts unrealized gain/loss entries. These unrealized entries are reversed at the start of the next period. When the underlying asset or liability settles, the system records the realized gain/loss. For consolidation, subsidiary functional-currency balances are translated to the reporting currency using the closing rate for balance sheet items and the average rate for income statement items, with the translation adjustment posted to other comprehensive income."

### Q7: "Explain the bank reconciliation matching algorithm."

**Strong answer**: "A three-phase pipeline. Phase 1 is **exact matching**: match on amount, date, and reference number---this catches 60--70% of transactions and is deterministic. Phase 2 is **fuzzy matching** for the remaining items: apply tolerances on amount (within one cent for rounding), date (within three days for clearing delays), and merchant/payee name (Levenshtein similarity above 0.85). This catches another 15--20%. Phase 3 is **ML-based matching**: a model trained on historical matching decisions handles many-to-one groupings (multiple GL entries matching one bank deposit), description parsing, and pattern recognition. Each match gets a confidence score. Above 0.95 is auto-confirmed. Between 0.70 and 0.95 is flagged for human review. Below 0.70 remains unmatched and enters an investigation queue. Matching accuracy is tracked per phase to detect data quality regressions."

### Q8: "How does period close work?"

**Strong answer**: "Period close is a ten-step orchestrated workflow: (1) **Soft close**---block new routine entries but allow authorized adjustments. (2) **Sub-ledger reconciliation**---verify AR, AP, and fixed asset sub-ledgers tie to their GL control accounts. (3) **Accruals and adjustments**---post recurring entries like depreciation, amortization, and accrued expenses. (4) **Bank reconciliation**---confirm all bank accounts are reconciled for the period. (5) **Multi-currency revaluation**---restate foreign-currency balances at period-end rates and post gain/loss entries. (6) **Intercompany elimination**---for multi-entity, generate entries that eliminate intercompany receivables/payables and revenue/expenses. (7) **Trial balance verification**---confirm total debits equal total credits across all accounts. (8) **Hard close**---permanently lock the period. (9) **Financial statement generation**---produce balance sheet, income statement, and cash flow statement. (10) **Year-end close** (annually)---close all income and expense accounts to retained earnings. The process is modeled as a state machine with each step idempotent and resumable."

---

## Trap Questions and How to Handle Them

| Trap | Why It's a Trap | Better Response |
|------|----------------|-----------------|
| "Just use blockchain for the audit trail" | Blockchain adds consensus overhead, throughput limitations, and operational complexity for a single-organization ledger | "Hash chaining provides tamper evidence without consensus overhead. Each audit event includes a SHA-256 hash of the previous event, creating a verifiable chain. A blockchain is warranted only if external parties need independent verification---and even then, anchoring the chain root periodically is sufficient." |
| "Use eventual consistency for the GL" | A temporarily unbalanced trial balance is a compliance violation, not just a degraded experience | "The general ledger is one of the few systems where strong consistency is genuinely non-negotiable. A trial balance that does not balance, even temporarily, is a red flag for auditors. I achieve write throughput through balance sharding, not by relaxing consistency." |
| "Store everything in a document store" | Financial data requires ACID transactions, referential integrity, and complex aggregation queries | "The core ledger needs ACID transactions to guarantee that debits equal credits within each entry. Relational storage with strong typing prevents the data quality issues that plague document stores for financial data. I use a document or columnar store only for the reporting read path." |
| "Just lock the entire GL during posting" | Global locks serialize all posts and destroy throughput | "Global locks reduce a distributed system to a single-threaded one. Row-level optimistic locking handles normal accounts. Balance sharding handles hot accounts. The goal is maximum concurrency while maintaining per-entry atomicity." |
| "Corrections should update the original entry" | Violates the immutability principle that underpins all of accounting | "Accounting standards require that posted entries are never modified. Corrections are posted as reversing entries followed by new correct entries. This preserves the complete audit trail and is a regulatory requirement, not a design preference." |
| "Real-time consolidation across entities" | Consolidation requires complete period data from all subsidiaries, which is inherently batch | "Consolidation depends on all subsidiaries completing their individual closes---it is a dependency graph, not a streaming operation. Attempting real-time consolidation means working with incomplete data that changes underneath you, leading to phantom elimination entries and incorrect minority interest calculations." |

---

## Scoring Rubric

### Junior Level (Meets Bar)

- Understands double-entry bookkeeping (debits = credits)
- Designs basic journal entry creation and storage
- Identifies core entities: account, journal entry, journal line
- Mentions the need for an audit trail
- Basic relational data model for the ledger

### Senior Level (Strong Hire)

- Designs CQRS architecture separating posting from reporting
- Explains event sourcing as a natural fit for the audit trail
- Addresses hot account concurrency with balance sharding
- Discusses period close as an orchestrated multi-step workflow
- Handles multi-currency with revaluation and gain/loss tracking
- Designs bank reconciliation with multi-phase matching
- Enforces segregation of duties in the system design
- Articulates trade-offs between consistency and throughput

### Staff+ Level (Exceptional)

- Discusses continuous close as the evolution beyond periodic close
- Brings up ASC 606 / IFRS 15 revenue recognition complexity and its five-step model
- Explains intercompany elimination with minority interest and translation adjustments
- Designs hash-chained audit trail with cryptographic tamper evidence
- Addresses data sovereignty for multi-jurisdictional entities (data residency per entity)
- Discusses triple-entry accounting with cryptographic proofs for inter-organizational trust
- Designs the consolidation hierarchy as a DAG with dependency-based close orchestration
- Proposes shadow ledger for independent revenue verification

---

## Red Flags to Avoid

1. **Not understanding double-entry bookkeeping**: If you cannot explain why debits must equal credits, you have lost credibility for the entire discussion.
2. **Suggesting mutable ledger entries**: Proposing UPDATE or DELETE on posted entries signals a fundamental misunderstanding of accounting principles.
3. **Ignoring the audit trail**: Treating audit logging as a "nice to have" rather than a foundational requirement shows lack of domain awareness.
4. **Using eventual consistency for the core ledger**: This is a disqualifying design choice for financial systems.
5. **Not addressing segregation of duties**: SOX-compliant organizations require this. Ignoring it suggests unfamiliarity with enterprise financial systems.
6. **Overlooking multi-currency complexity**: Saying "just convert at posting time" misses revaluation, realized vs. unrealized gains, and translation adjustments.
7. **Treating period close as a simple flag**: Close is a multi-step orchestrated process, not "set period.closed = true."
8. **Ignoring the month-end posting surge**: Designing for average load without addressing the predictable 50x spike is a scaling blind spot.

---

## Quick Reference Card

### Key Numbers

| Metric | Target |
|--------|--------|
| Entities supported | 50+ with hierarchical consolidation |
| Journal entries/month | 10M (steady state) |
| Month-end surge factor | 50x normal posting volume |
| Posting latency | < 200ms (p95) for single entry |
| Trial balance generation | < 30 seconds per entity |
| Bank reconciliation cycle | Daily batch, intra-day for exact matches |
| Audit trail retention | 10+ years |
| Currency support | 100+ currencies with daily rate updates |
| Period close duration | < 4 hours for single entity, < 24 hours for full consolidation |

### Critical Components to Mention

- **GL Posting Engine**: ACID-compliant double-entry posting with balance sharding for hot accounts
- **Chart of Accounts Service**: Hierarchical account structure with segment-based coding (entity.department.account.sub-account)
- **Period Close Orchestrator**: State machine driving the ten-step close sequence with dependency tracking
- **Reconciliation Engine**: Three-phase bank matching pipeline (exact, fuzzy, ML) with confidence scoring
- **Audit Trail**: Hash-chained, append-only event log with cryptographic tamper detection
- **Reporting Engine**: CQRS read path with materialized period snapshots for financial statement generation
- **Multi-Currency Engine**: Rate management, transaction recording, periodic revaluation, and translation

### Differentiating Insights

1. "This looks like a database design problem but is actually a **distributed state machine** problem---period close, reconciliation, and consolidation are all multi-step workflows with strict ordering constraints."
2. "The fundamental accounting equation (A = L + E) is a **system-wide invariant** that must hold after every transaction. This is the strongest consistency requirement most engineers will ever encounter."
3. "Balance sharding for hot accounts is the **write-scaling** strategy; CQRS with materialized snapshots is the **read-scaling** strategy. Together they address both dimensions."
4. "The audit trail is not logging---it is a **first-class data structure** with cryptographic integrity guarantees. It is the system's proof of correctness."
5. "Month-end close is the accounting system's equivalent of a **distributed consensus** problem: all subsidiaries must agree on their numbers before the parent can consolidate."
