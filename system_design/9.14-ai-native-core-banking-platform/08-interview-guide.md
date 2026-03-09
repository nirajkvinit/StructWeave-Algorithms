# Interview Guide — AI-Native Core Banking Platform

## 1. 45-Minute Pacing Guide

### Phase 1: Requirements Clarification (5 minutes)

**What to establish upfront:**

| Question | Why It Matters |
|---|---|
| "Is this a greenfield platform or modernizing a legacy core?" | Determines whether you need to address coexistence and migration |
| "What's the scale — number of accounts, daily transactions?" | Drives partitioning strategy and infrastructure decisions |
| "Single entity or multi-entity, multi-currency?" | Multi-entity adds significant complexity to the data model and isolation |
| "Which payment networks and regulatory jurisdictions?" | Determines compliance engine scope and payment orchestration complexity |
| "What's the availability target? Is 99.99% sufficient or do we need 99.999%?" | Five nines vs four nines is a fundamentally different architecture |
| "Are we building Open Banking APIs for third-party access?" | Adds consent management, TPP security, and API governance layers |

**Clarifying questions that impress interviewers:**
- "Should we handle real-time gross settlement (RTGS) or is batch settlement acceptable?"
- "Do we need to support ISO 20022 natively, or is format translation at the boundary sufficient?"
- "What's the regulatory reporting cadence — daily, monthly, or real-time?"

### Phase 2: High-Level Architecture (10 minutes)

**Draw these components on the whiteboard:**

1. **Channel Layer** — API gateway with mTLS, Open Banking gateway
2. **Core Services** — Organized by bounded context:
   - Account domain (account, customer, product factory)
   - Transaction domain (transaction engine, ledger, balance)
   - Payment domain (orchestrator, FX, ISO 20022)
   - Lending domain (origination, management, collateral)
3. **Intelligence Layer** — Fraud engine (inline), AML (stream), credit scoring
4. **Compliance Layer** — Rules engine, sanctions screening, regulatory reporting
5. **Data Layer** — Event store (source of truth), read store (projections), cache
6. **Event Backbone** — Distributed streaming for CQRS and cross-service communication

**Key narrative:** "The core insight is using an event-sourced, immutable ledger as the single source of truth. All financial state derives from replaying events. This gives us built-in auditability, regulatory reconstruction capability, and the ability to build multiple optimized read models via CQRS."

### Phase 3: Deep Dive (20 minutes)

The interviewer will likely ask you to dive into one of these areas. Be prepared for all three:

**Option A: Transaction Processing Engine**
- Double-entry posting guarantee (debit + credit atomic commit)
- Account-level concurrency control (partition routing + optimistic locking)
- Hot account problem and mitigation (sub-account spreading, write coalescing)
- Idempotency implementation (key + request hash + TTL)
- Inline fraud scoring with circuit breaker fallback

**Option B: Multi-Currency Ledger**
- Currency representation (integer minor units, never floating-point)
- Cross-currency compound journal entries (5 legs for FX transaction)
- Position management and revaluation
- Exchange rate management (rate locking, spread calculation)

**Option C: Open Banking & Compliance**
- Consent lifecycle management
- PSD2 SCA flow with exemptions
- Sanctions screening pipeline (Bloom filter → exact match → fuzzy match)
- AML pattern detection (rule-based + ML, SAR filing)

### Phase 4: Scalability, Reliability, and Trade-offs (8 minutes)

**Must cover:**
- Account-based partitioning with consistent hashing
- Event store replication strategy (synchronous for RPO=0)
- Multi-region active-active with split-brain prevention
- Failover procedure (< 60 second RTO)
- Backpressure mechanisms (rate limiting → queue depth → admission control)

**Key trade-off discussions:**
- Event sourcing storage cost vs. auditability benefit
- Synchronous replication latency vs. zero data loss guarantee
- Inline fraud scoring latency vs. pre-authorization fraud prevention
- CQRS complexity vs. read/write optimization

### Phase 5: Wrap-Up (2 minutes)

Touch on:
- Security (HSM key management, PCI-DSS tokenization, mTLS)
- Observability (regulatory audit trail as first-class concern)
- One unique insight (configuration-driven product factory, cryptographic ledger chaining)

---

## 2. Key Trade-offs to Discuss

### 2.1 Event Sourcing vs. State-Based Storage

| Aspect | Event Sourcing | State-Based |
|---|---|---|
| **Auditability** | Built-in complete history | Requires separate audit log |
| **Storage cost** | Higher (all events retained) | Lower (current state only) |
| **Query complexity** | Must maintain projections | Direct queries on current state |
| **Regulatory reconstruction** | Trivial (replay events) | Difficult (requires point-in-time snapshots) |
| **Schema evolution** | Must handle event versioning | Standard migration patterns |
| **Debugging** | Replay to reproduce any state | Must add extensive logging |

**Interview answer:** "For a core banking ledger, event sourcing is almost mandatory. The regulatory requirement to reconstruct any account state at any point in time, combined with the need for a tamper-evident audit trail, makes the storage cost trade-off worthwhile. We mitigate query complexity with CQRS projections and periodic snapshots."

### 2.2 Strong Consistency vs. Availability

| Aspect | Strong Consistency | Eventual Consistency |
|---|---|---|
| **Where used** | Transaction posting, balance deduction | Balance display, analytics, reporting |
| **Latency impact** | Higher (synchronous replication) | Lower (local reads) |
| **Partition tolerance** | Sacrifices availability during network partition | Remains available with stale data |
| **Correctness** | 100% accurate at all times | May briefly show stale data |

**Interview answer:** "We use a split-consistency model. The write path (transaction posting) requires strong consistency — we cannot allow a customer to spend more than their balance due to a stale read. The read path (balance inquiries, transaction history) uses eventually consistent projections that are typically < 100ms behind. For the critical insufficient-funds check, we read from the write store directly."

### 2.3 Synchronous vs. Asynchronous Compliance Screening

| Aspect | Synchronous (inline) | Asynchronous (post-transaction) |
|---|---|---|
| **Latency impact** | +5–50ms per transaction | Zero impact on transaction latency |
| **Risk exposure** | Blocked before settlement | Potential regulatory violation if not caught |
| **Throughput impact** | Screening must scale with TPS | Can process at own pace |
| **Customer experience** | Occasional false-positive blocks | Retroactive transaction reversal |

**Interview answer:** "Sanctions screening must be synchronous — letting a sanctioned entity complete a transaction and then reversing it creates regulatory liability. AML pattern detection, however, can be asynchronous because it requires temporal analysis across multiple transactions. We use a tiered approach: Bloom filter pre-check (< 1ms for 99% of clean transactions) followed by exact match, with fuzzy matching only for cross-border transactions."

---

## 3. Common Mistakes to Avoid

### 3.1 Data Model Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Using floating-point for money | Rounding errors accumulate | Integer minor units or fixed-precision decimal |
| Storing balance as a single field | Loses audit trail, enables tampering | Derive balance from event stream, cache in projection |
| Single-currency data model | Cannot represent FX transactions properly | Native multi-currency with per-entry currency codes |
| Missing idempotency keys | Duplicate transactions on retry | Idempotency key on every mutating operation |
| Mutable ledger entries | Violates accounting principles | Append-only entries; corrections via reversals |

### 3.2 Architecture Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Single database for all data | Bottleneck, no read/write optimization | CQRS with event store + read projections |
| Distributed transactions across services | Fragile, blocking, doesn't scale | Saga pattern with compensating actions |
| Sync call to every service in transaction path | Latency compounds, availability degrades | Only inline what's critical (fraud); rest is async |
| No partition strategy for accounts | Performance wall at 10M+ accounts | Account-based consistent hashing from day one |
| Treating compliance as an afterthought | Regulatory requirements drive core architecture | Compliance engine as a first-class service from the start |

### 3.3 Reliability Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| RPO > 0 for financial data | Losing committed transactions is unacceptable | Synchronous replication (quorum writes) |
| No split-brain prevention | Two leaders accepting writes = data corruption | Fencing tokens + external arbiter + quorum |
| Manual failover process | Humans can't respond within 60-second RTO | Automated failover with safety checks |
| Same region for primary and DR | Region-level failure takes out everything | Geographically separated DR region |
| No chaos engineering | "It should work" is not a recovery plan | Regular failure injection to validate |

---

## 4. Trap Questions and How to Handle Them

### 4.1 "How do you handle a transaction that's half-committed?"

**Trap:** Candidate says "roll back the database transaction."

**Correct:** "In an event-sourced system, we never have half-committed events. The atomic write to the event store either succeeds completely (both debit and credit events) or fails completely. For distributed sagas spanning multiple services, we use compensating actions—not distributed transactions. If the credit leg fails after the debit hold was placed, the compensating action releases the hold."

### 4.2 "What happens when the fraud engine is slow?"

**Trap:** Candidate says "just approve the transaction without fraud checking."

**Correct:** "We have a circuit breaker with a rule-based fallback. If the ML fraud engine exceeds its 20ms SLA, the circuit breaker trips and routes to a simpler rule-based scoring engine that can make decisions in < 2ms. This rule engine covers the highest-risk patterns (velocity, geographic impossibility, known fraud indicators). We accept slightly reduced detection accuracy temporarily in exchange for maintaining transaction throughput. When the ML engine recovers, the circuit breaker half-opens, routes 5% of traffic to verify it's healthy, then fully restores."

### 4.3 "How do you scale the ledger to handle millions of TPS?"

**Trap:** Candidate says "just add more database nodes" without addressing ordering.

**Correct:** "We partition the event store by account ID using consistent hashing. Each partition handles a manageable subset of accounts. Within a partition, events are strictly ordered per account. Scaling means adding partitions and rebalancing accounts. The key insight is that most banking transactions only need ordering guarantees within a single account—cross-account ordering is handled by the saga coordinator, not the event store."

### 4.4 "Can you use eventual consistency for balance checks?"

**Trap:** Candidate says "yes, for better performance."

**Correct:** "Not for debit operations where insufficient funds could result in an overdraft. The insufficient-funds check must read from the strongly consistent write store, not the eventually consistent projection. However, for informational balance inquiries (mobile app balance display, account summary), eventual consistency is acceptable—the projection is typically < 100ms behind. We clearly distinguish between 'balance for decision' (strong) and 'balance for display' (eventual)."

### 4.5 "How do you handle regulatory requirements across different jurisdictions?"

**Trap:** Candidate hard-codes rules for one jurisdiction.

**Correct:** "Each entity is configured with its regulatory regime. The compliance engine loads jurisdiction-specific rule sets based on the entity's configuration. Rules are versioned and effective-dated, so regulatory changes can be deployed in advance and activated on the effective date. For multi-jurisdiction transactions (cross-border payments), we apply the union of both jurisdictions' rules. The rules engine is declarative—compliance teams can update rules without code deployments."

---

## 5. Scoring Rubric (What Interviewers Look For)

### 5.1 Senior Engineer Level

| Criterion | Expectation |
|---|---|
| **Requirements** | Identifies core banking as more than just transactions—recognizes multi-entity, compliance, and Open Banking as first-class requirements |
| **Architecture** | Draws event-sourced ledger with CQRS; identifies bounded contexts for core banking domains |
| **Data Model** | Uses double-entry bookkeeping; understands why balances are derived, not stored |
| **Concurrency** | Addresses account-level locking and the hot account problem |
| **Reliability** | Discusses RPO=0 requirement and synchronous replication |

### 5.2 Staff Engineer Level

| Criterion | Expectation |
|---|---|
| **All of Senior, plus:** | |
| **Multi-Currency** | Models FX as compound journal entries with position management |
| **Product Factory** | Proposes configuration-driven product creation (not hard-coded) |
| **Compliance** | Designs regulatory engine as a stream processor, not batch |
| **Trade-offs** | Articulates event sourcing vs. state-based with specific banking justification |
| **Failure Modes** | Discusses split-brain prevention, fencing tokens, automated failover |
| **ISO 20022** | Uses ISO 20022 as canonical internal format with translation at boundaries |

### 5.3 Principal/Architect Level

| Criterion | Expectation |
|---|---|
| **All of Staff, plus:** | |
| **Ecosystem Thinking** | Designs Open Banking as a platform, not just API compliance |
| **Cryptographic Integrity** | Proposes cryptographically chained ledger with HSM-backed signing |
| **Regulatory Architecture** | Data lineage from transaction to regulatory report field |
| **Operational Resilience** | DORA compliance, chaos engineering, graceful degradation modes |
| **Cost Optimization** | Tiered storage lifecycle, resource allocation per entity |

---

## 6. Variation Questions

| Variation | Key Difference |
|---|---|
| "Design a digital-only neobank" | No legacy integration; emphasize API-first, mobile-centric, lean compliance |
| "Design a payment processing platform" | Focus on payment orchestration, routing, settlement; lighter on account management |
| "Design a multi-currency treasury system" | Emphasize FX, position management, hedging, nostro/vostro reconciliation |
| "Design a lending platform" | Focus on origination workflow, credit scoring, loan lifecycle, provisioning |
| "Design an Open Banking aggregator" | Reverse perspective — consuming bank APIs, consent management, data normalization |

---

*Next: [Insights →](./09-insights.md)*
