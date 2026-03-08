# Key Architectural Insights

## 1. The General Ledger Is the Beating Heart---Everything Else Is Plumbing

**Category:** Data Modeling
**One-liner:** A core banking system's correctness reduces to one invariant: total debits equal total credits across the entire general ledger, and every sub-ledger reconciles to its GL control account.

**Why it matters:**
In a core banking system, the General Ledger is not just an accounting report---it is the single source of truth for the institution's entire financial position. Every deposit, loan disbursement, payment, interest accrual, fee charge, and settlement flows through the ledger as an immutable journal entry: one or more debits balanced by an equal sum of credits. The sub-ledger/general ledger hierarchy adds a second layer of integrity: the sum of all savings accounts in the Deposits Sub-Ledger must equal the Deposits Control Account in the GL. This two-level invariant (entry-level balance + sub-ledger-to-GL reconciliation) creates a self-auditing system. If any layer reports a discrepancy, the system knows *where* the error occurred. The lesson for system design broadly is that hierarchical invariants---where local correctness rolls up to global correctness---are vastly more powerful than end-to-end checks alone. They localize error detection and make debugging tractable at scale.

---

## 2. Materialized Balance Is a Cache of the Ledger---Treat It as Such

**Category:** Performance
**One-liner:** The balance field in the account table is not the source of truth---it is a derived, cached value that must be updated atomically with the ledger entry that changes it.

**Why it matters:**
A naive implementation might store balances directly and update them on each transaction. This works until you need to audit, reconcile, or handle disputes---and then you discover you have no history of how the balance arrived at its current value. The correct model is the reverse: the immutable ledger entries are authoritative, and the balance is a materialized aggregate that avoids the O(n) cost of summing potentially millions of entries. The critical design constraint is that the balance update and the ledger entry insert must happen in the *same database transaction*. If they diverge (even briefly), you have a window where the balance doesn't match the ledger---creating reconciliation breaks and potential double-spend. This pattern---treating the fast-access view as a cache of the canonical append-only log---recurs in event-sourced systems, search indexes, and CQRS read models. The discipline is always the same: the derived view must never be trusted over the source log.

---

## 3. Sagas Over 2PC: Distributed Atomicity Without Distributed Locking

**Category:** Resilience
**One-liner:** For cross-shard transfers where sender and receiver live on different database instances, a saga with compensating transactions provides atomicity without the fragility of Two-Phase Commit.

**Why it matters:**
When 30% of transactions cross shard boundaries (at 46K peak TPS, that's ~14K cross-shard sagas per second), the coordination mechanism is a critical architectural component. Two-Phase Commit guarantees atomicity but holds locks across both shards during the prepare phase. If the coordinator crashes between prepare and commit, both shards are locked until manual intervention---a catastrophic failure mode for a banking system processing billions of dollars daily. The saga pattern decomposes the transfer into sequential local transactions: debit the sender (local ACID on Shard A), then credit the receiver (local ACID on Shard B). If the credit fails, a compensating transaction reverses the debit. The key design decisions are: (1) debit-first ordering (crediting first creates money temporarily), (2) durable saga log (survives coordinator crashes for recovery), (3) idempotent steps (prevents double-posting on retry), and (4) timeout-based compensation (detects stuck steps). This saga-over-2PC trade-off applies to any system requiring atomicity across independent databases: cross-service operations, multi-vendor fulfillment, and distributed booking systems.

---

## 4. The Product Catalog Is a Domain-Specific Language for Banking

**Category:** Extensibility
**One-liner:** Modern core banking platforms treat financial products as declarative configurations---not code---enabling new product launches in days rather than months of development.

**Why it matters:**
A traditional core banking system hard-codes product behavior: savings accounts accrue interest one way, term deposits another, loans a third. Adding a new product (e.g., a high-yield savings account with tiered rates and promotional periods) requires code changes, testing, and deployment---typically a 3-6 month cycle. Modern architectures flip this: the product catalog defines every product as a configuration document specifying interest rate schedules, fee structures, accrual parameters (day-count convention, compounding frequency), limits, and lifecycle events (dormancy, maturity, rollover). The ledger engine is generic---it processes any product by reading its catalog configuration. This is effectively a domain-specific language (DSL) for financial products. The architectural insight is that when your system's variability comes from business rules (not technical complexity), encoding those rules as data rather than code gives non-engineers (product managers, treasury) the ability to drive system behavior without deployment risk. This pattern appears in rule engines, workflow systems, and any domain where business logic changes faster than technology.

---

## 5. Interest Accrual Reveals the True Complexity of "Simple" Banking

**Category:** Domain Complexity
**One-liner:** What seems like a trivial calculation (principal × rate × time) becomes an architectural challenge when you factor in day-count conventions, tiered rates, compounding schedules, backdated transactions, and the need to process 80 million accounts overnight.

**Why it matters:**
Interest accrual is the operation that separates toy banking systems from real ones. The formula `principal × rate × (days/year)` seems simple until you realize: (1) "days" depends on the day-count convention---30/360 assumes every month has 30 days; Actual/365 uses calendar days; Actual/Actual uses the actual number of days in the year (365 or 366). (2) "Rate" may be tiered: 2% on the first $10K, 3% on $10K-$50K, 4% above $50K. (3) Compounding frequency determines when accrued interest is capitalized (added to principal). (4) Backdated transactions change historical balances, requiring retroactive recalculation of all accruals since the value date. At scale, this batch operation processes 80M+ accounts nightly, each requiring balance lookup, rate determination, day fraction calculation, and ledger entry creation---all within a 6-hour window. The system design lesson is that domain complexity often hides in operations that seem trivial at prototype scale. Always ask: "What does this look like at 100 million accounts?"

---

## 6. Reconciliation Is Architecture, Not Afterthought

**Category:** Operational Excellence
**One-liner:** In core banking, reconciliation is not a nightly report---it is a continuous verification pipeline that catches errors before they compound, and its design must be integral to the posting architecture.

**Why it matters:**
Most systems treat reconciliation as an operational task: compare two data sources, flag differences, investigate manually. In core banking, this approach fails at scale and urgency. A reconciliation break (sub-ledger total doesn't match GL control account) that goes undetected for even a few hours can cascade through downstream systems: regulatory reports use stale data, capital adequacy ratios are miscalculated, and settlement files contain incorrect amounts. The correct approach is three-tiered: (1) Real-time: maintain running GL balances updated atomically with each posting. (2) Hourly: snapshot sub-ledger totals and compare against running GL totals. (3) End-of-day: full reconciliation with accounting equation verification (Assets = Liabilities + Equity). Each tier catches progressively deeper issues. The broader pattern is that verification should be layered and continuous, not point-in-time and periodic. Any system where errors compound over time (financial systems, inventory systems, distributed counters) benefits from continuous reconciliation built into the write path.

---

## 7. Legacy Modernization Is the Real Core Banking Challenge

**Category:** Migration
**One-liner:** Most core banking projects are not greenfield builds---they are legacy modernization efforts where the strangler fig pattern, dual-write periods, and anti-corruption layers are more critical than the target architecture.

**Why it matters:**
The vast majority of the world's banking infrastructure runs on decades-old mainframe systems. These systems process trillions of dollars daily and cannot be shut down for migration. The strangler fig pattern---routing one product line or customer segment at a time from the legacy system to the new platform---is the industry standard for migration. But the implementation details are treacherous: (1) Dual-write periods where both systems process the same transactions require real-time reconciliation between old and new ledgers. (2) Anti-corruption layers translate between the legacy data model (often flat-file or hierarchical) and the new model (relational, event-sourced). (3) Customer data migration requires mapping legacy account numbers to new identifiers while maintaining referential integrity. (4) Regulatory reporting must continue uninterrupted during migration, often requiring reports that aggregate data from both systems. The IDC projection that 40% of global banks will pursue "sidecar core" strategies by 2026---running new cores alongside legacy---confirms that co-existence, not replacement, is the dominant pattern. For system designers, the lesson is that migration architecture often dwarfs target architecture in complexity and risk.

---

## Cross-Cutting Themes

| Theme | Insights | Key Takeaway |
|-------|----------|-------------|
| **Financial invariants** | #1, #2 | Build the system around verifiable invariants at multiple levels: entry-level (debits = credits), account-level (balance = SUM of entries), and institutional-level (Assets = Liabilities + Equity). Each level provides independent error detection. |
| **Derived vs. authoritative state** | #2, #6 | The immutable ledger is authoritative; balances, GL totals, and reports are derived views. Treat them as caches with explicit consistency guarantees (synchronous for balances, periodic for GL totals, batch for reports). |
| **Distributed coordination** | #3 | Prefer local atomicity + eventual coordination (sagas) over global atomicity (2PC). The key enablers are idempotent operations, durable coordination logs, and compensating transactions. |
| **Configuration over code** | #4, #5 | When business rules (products, rates, fees) change faster than technology, encode them as data (product catalog) rather than code. The engine becomes generic; the configuration drives behavior. |
| **Continuous verification** | #1, #6 | Don't defer verification to batch runs. Build continuous reconciliation into the write path so that errors are caught in minutes, not hours. Layered verification (real-time → hourly → daily) catches progressively deeper issues. |
| **Legacy co-existence** | #7 | Design for co-existence from day one. Anti-corruption layers, dual-write reconciliation, and incremental migration are not temporary hacks---they are architectural components that may persist for years. |
