# Interview Guide

## 45-Minute Interview Pacing

| Phase | Time | Focus | Candidate Should Demonstrate |
|-------|------|-------|------------------------------|
| **1. Clarification** | 0-5 min | Scope the problem, identify core requirements | Asks about scale (accounts, TPS), product types (deposits vs. loans vs. both), multi-currency, regulatory jurisdiction |
| **2. High-Level Design** | 5-18 min | Architecture, key components, data flow | Draws GL/SL architecture, identifies ledger as core primitive, shows CQRS separation, explains double-entry |
| **3. Deep Dive** | 18-35 min | Ledger consistency, cross-shard, interest engine | Explains atomic balance-check-and-debit, saga pattern, interest accrual batch, hot account mitigation |
| **4. Scalability & Trade-offs** | 35-42 min | Scaling, reliability, compliance | Discusses sharding strategy, DR with RPO=0, regulatory reporting, EOD batch constraints |
| **5. Wrap-Up** | 42-45 min | Edge cases, monitoring, future evolution | Mentions reconciliation dashboards, legacy migration, multi-entity tenancy |

---

## Phase 1: Clarification Questions

**Strong candidates ask these questions before designing:**

| Question | Why It Matters | Good vs. Great Answer |
|----------|---------------|----------------------|
| "What types of accounts? Deposits only or also loans and credit lines?" | Loans require interest accrual, amortization schedules, provisioning---fundamentally different from deposit accounts | **Good**: Deposits + loans. **Great**: Asks about loan lifecycle (disbursement, repayment, prepayment, write-off) and how each creates ledger entries |
| "What's the consistency requirement for the ledger?" | This should be the candidate's first instinct---financial systems require strong consistency | **Good**: Strong consistency. **Great**: Specifies the exact invariant: "debits must equal credits at all times, and no account should go below zero unless it's a credit account" |
| "Single currency or multi-currency?" | Multi-currency introduces FX complexity, nostro/vostro accounts, and position management | **Good**: Multi-currency. **Great**: Asks about day-count conventions for interest accrual and how FX rates are locked (at transaction time vs. settlement) |
| "What regulatory framework?" | Basel III, SOX, PSD2 each impose specific data requirements | **Good**: Mentions compliance. **Great**: Asks about specific regulations and their impact on data retention, audit trails, and capital calculations |
| "Is this a greenfield build or legacy modernization?" | Legacy modernization via strangler fig is the reality for most core banking projects | **Good**: Assumes greenfield. **Great**: Asks about co-existence with legacy systems, dual-write strategies, and anti-corruption layers |

---

## Phase 2: High-Level Design Evaluation

### Must-Have Components (Minimum Bar)

| Component | What to Look For |
|-----------|-----------------|
| **Double-entry ledger** | Candidate must identify double-entry bookkeeping as the core primitive. Every transaction produces debit + credit entries. This is non-negotiable. |
| **GL/SL hierarchy** | Should describe sub-ledgers rolling up to general ledger control accounts. Mentions Chart of Accounts. |
| **CQRS separation** | Separates write path (posting) from read path (balance queries, reporting). Materialized balance to avoid summing entries. |
| **Saga for cross-shard** | Identifies that transfers between sharded accounts require distributed coordination. Chooses saga over 2PC. |
| **Immutable entries** | Ledger entries are never updated or deleted. Corrections via reversing entries. This is both an accounting requirement and an audit requirement. |

### Differentiators (Strong Signal)

| Component | What It Signals |
|-----------|----------------|
| **Product catalog as configuration** | Candidate understands that core banking products are data-driven, not hard-coded |
| **Interest accrual engine** | Understands day-count conventions (30/360 vs. Actual/365), tiered rates, compounding |
| **Nostro/vostro account design** | Understands correspondent banking and multi-currency settlement |
| **Event sourcing** | Recognizes that the ledger is naturally an event store; derives state from events |
| **Reconciliation as first-class** | Designs reconciliation into the architecture (not an afterthought) |

---

## Phase 3: Deep Dive Questions

### Question 1: "How do you prevent double-spend?"

**Evaluating**: Understanding of concurrency control in financial systems

| Level | Expected Answer |
|-------|----------------|
| **Junior** | "Check balance before debit" (misses the race condition entirely) |
| **Mid** | "Use a database lock" (correct direction but vague) |
| **Senior** | "SELECT FOR UPDATE within a transaction: lock the account row, check balance, debit, update materialized balance, all atomically. The lock serializes concurrent operations on the same account." |
| **Staff** | All of the above plus: "This creates a bottleneck for hot accounts. For merchant accounts with high throughput, use sub-account sharding: split the balance across N sub-accounts, each independently lockable, reducing contention N-fold. Debits are more complex---may need to check multiple sub-accounts." |

### Question 2: "How does a transfer work when sender and receiver are on different shards?"

**Evaluating**: Distributed transaction design

| Level | Expected Answer |
|-------|----------------|
| **Junior** | "Use a distributed transaction" (doesn't know the implications) |
| **Mid** | "Use 2PC" (technically correct but fragile) |
| **Senior** | "Use a saga: debit first, then credit. If credit fails, compensate by reversing the debit. Write saga state to a durable log. Each step is idempotent." |
| **Staff** | All of the above plus: "Debit-first ordering matters---crediting first temporarily creates money. The saga log must survive coordinator crashes. Use a dedicated saga store, not the same shard DB. Monitor saga completion latency and compensation rate. Also consider co-locating frequently interacting accounts on the same shard to reduce cross-shard rate." |

### Question 3: "How do you calculate interest for 80 million accounts overnight?"

**Evaluating**: Batch processing design, domain knowledge

| Level | Expected Answer |
|-------|----------------|
| **Mid** | "Run a cron job that loops through accounts" (no parallelism concept) |
| **Senior** | "Parallel processing: each shard's accounts processed by an independent worker. Batch accounts in groups of 1000. Each batch creates a journal entry for all accruals in that batch." |
| **Staff** | All of the above plus: "Handle day-count conventions correctly (30/360, Actual/365, Actual/Actual). Tiered rates require calculating interest per bracket. Backdated transactions trigger retroactive recalculation. Use accrual_state table to track where each account left off---enables restart from checkpoint. Distinguish accrual (memo posting) from capitalization (actual balance impact). The batch must be idempotent: if it crashes and restarts, don't double-accrue." |

### Question 4: "How do you handle a reconciliation break?"

**Evaluating**: Operational maturity, financial domain understanding

| Level | Expected Answer |
|-------|----------------|
| **Mid** | "Log an error" (no operational response) |
| **Senior** | "Alert immediately (P1). Freeze the affected GL account. Investigate by tracing journal entries. Post a correcting entry with dual authorization." |
| **Staff** | All of the above plus: "Reconciliation should be continuous, not just EOD. Maintain running GL totals updated atomically with each posting. Hourly snapshot comparison catches breaks early. A break is almost always a timing issue (in-flight postings captured in SL but not yet in GL snapshot) or a bug in the posting service. True breaks (data corruption) require forensic investigation with the audit trail. Every reconciliation run produces an immutable report for regulators." |

---

## Trap Questions

### Trap 1: "Why not use a NoSQL database for the ledger?"

**The trap**: Candidate might agree because "NoSQL scales better."

**Strong answer**: "The ledger requires ACID transactions: the balance check + debit + credit must happen atomically within a single transaction. NoSQL databases typically provide eventual consistency and don't support multi-row ACID transactions. The ledger's fundamental invariant (debits = credits) cannot tolerate eventual consistency. However, NoSQL is appropriate for the event store (append-only, high throughput), balance cache (fast reads), and reporting data warehouse (columnar queries)."

### Trap 2: "Just use event sourcing---you don't need a traditional database."

**The trap**: Over-applying event sourcing.

**Strong answer**: "The ledger IS naturally event-sourced (immutable entries are events). But you still need materialized state for balance queries---you can't replay millions of events for every balance check. The materialized balance in the account table is the read model, updated in the same transaction as the ledger entry write. Event sourcing gives you the audit trail and replay capability, but the materialized view is what makes it performant."

### Trap 3: "Can't you just use a blockchain for the ledger?"

**The trap**: Conflating distributed ledger (banking term) with blockchain (DLT).

**Strong answer**: "A core banking ledger is a 'distributed ledger' in the traditional accounting sense---the ledger is distributed across sub-ledgers and reconciled. This is fundamentally different from blockchain. A blockchain's consensus mechanism (proof-of-work, proof-of-stake) adds latency incompatible with real-time payments. Banks don't need trustless consensus---they ARE the trusted party. The immutability guarantee is better achieved with append-only databases and cryptographic hash chains, which offer the same tamper-evidence without the consensus overhead."

### Trap 4: "Why not calculate interest in real-time on every transaction?"

**The trap**: Seems intuitive but creates massive complexity.

**Strong answer**: "Real-time accrual means every deposit, withdrawal, and transfer would trigger an interest recalculation and additional ledger entries. For an account with 50 transactions per month, this creates 50 accrual adjustments instead of 30 daily batch entries. It also makes rate changes mid-period extremely complex. Daily batch accrual is the banking industry standard because it's simpler, auditable, and the interest difference between daily and per-transaction accrual is negligible for retail accounts."

---

## Trade-Off Discussions

### Trade-off 1: Row Locking vs. Optimistic Concurrency

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **SELECT FOR UPDATE** (pessimistic) | Simple, guaranteed correctness, no retries | Serializes operations, limits throughput per account | Default for all accounts |
| **CAS with version** (optimistic) | Higher throughput under low contention | Retry storms under high contention; more complex | Batch operations with low collision rate |

**Decision framework**: Use pessimistic locking as the default (correctness over throughput). Switch to optimistic only for specific hot account sub-wallets where contention is predictable and retry cost is low.

### Trade-off 2: Synchronous vs. Asynchronous DR Replication

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **Synchronous** | RPO = 0 (zero data loss) | Adds 2-50ms latency per write | Ledger posting, account state |
| **Asynchronous** | No latency impact | RPO > 0 (possible data loss on failure) | Event store, audit logs, reporting |

### Trade-off 3: Monolithic Ledger vs. Per-Product Sub-Ledgers

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **Single unified ledger** | Simpler reconciliation, single source of truth | Schema must accommodate all product types | Smaller banks, greenfield builds |
| **Per-product sub-ledgers** | Optimized schemas per product, independent scaling | Complex GL reconciliation, multiple databases | Large banks with diverse product lines |

---

## Scoring Rubric

| Dimension | Below Bar | Bar | Above Bar |
|-----------|-----------|-----|-----------|
| **Problem Decomposition** | Jumps to implementation without understanding requirements | Identifies core components (ledger, accounts, payments) and their relationships | Maps the full GL/SL hierarchy, identifies Chart of Accounts, separates concerns cleanly |
| **Consistency & Correctness** | Ignores or hand-waves the double-entry invariant | Identifies double-entry requirement; implements atomic balance check + debit | Designs multi-layer enforcement (API validation → DB constraint → reconciliation → audit) |
| **Distributed Systems** | Uses 2PC without understanding failure modes | Implements saga for cross-shard; understands compensation | Designs saga log for durability, handles timeout and stuck sagas, monitors compensation rate |
| **Domain Knowledge** | No financial domain understanding | Understands basic accounting (debits/credits, balance types) | Demonstrates knowledge of interest accrual, day-count conventions, nostro/vostro, regulatory reporting |
| **Scalability** | Single-database design | Shards by account_id; uses CQRS for read/write separation | Addresses hot accounts (sub-sharding), EOD batch scaling, multi-region for global banks |
| **Operational Maturity** | No monitoring or recovery discussion | Identifies key metrics, basic alerting | Designs continuous reconciliation, runbooks for breaks, compliance calendar, DR testing |
| **Communication** | Disorganized, skips between topics | Structured approach with clear rationale | Acknowledges trade-offs explicitly, discusses alternatives, justifies choices with constraints |

---

## Common Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---------|---------------|-----------------|
| Storing balance as a single mutable field without ledger | Cannot audit, cannot reconcile, cannot detect errors | Balance is a materialized cache of the immutable ledger entries |
| Using UPDATE to correct ledger entries | Destroys audit trail, violates accounting standards | Post a reversing entry (same amounts, opposite debit/credit) |
| Ignoring the GL/SL reconciliation | Misses the core architectural pattern of banking | Sub-ledger totals must reconcile to GL control accounts; automated verification |
| Calculating balance by summing all ledger entries on every read | O(n) per query where n grows forever | Maintain materialized balance updated atomically with each posting |
| Using 2PC for cross-shard transfers | Fragile, lock-holding, single point of failure | Saga pattern with compensating transactions and durable saga log |
| Treating interest accrual as trivial | Missing day-count conventions, tiered rates, compounding, backdating | Dedicated accrual engine with product-driven configuration |
| No idempotency for financial operations | Network retries create duplicate ledger entries (real money impact) | Client-generated idempotency key with server-side dedup (cache + DB unique constraint) |
