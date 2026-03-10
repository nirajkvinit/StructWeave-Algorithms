# Deep Dives & Bottlenecks — AI-Native Mobile Money Super App Platform

## Deep Dive 1: USSD Session Management and Timeout Handling

### The Problem

USSD (Unstructured Supplementary Service Data) was designed for simple telecom queries, not multi-step financial transactions. A typical P2P transfer requires 5–6 round-trips between the user's phone and the server, yet the entire session must complete within 60–180 seconds (depending on the MNO), with each screen limited to 182 characters. The session is stateful but fragile: if the MNO's USSD gateway doesn't receive a response within its timeout window, it silently terminates the session with no notification to the application server.

### Architecture

The USSD session engine operates as a stateful middleware between MNO USSD gateways and the core transaction engine:

**Session Store:** An in-memory distributed cache (not a persistent database—sessions are ephemeral) stores session state keyed by `(session_id, msisdn)`. Each entry contains the menu state, accumulated user inputs, PIN verification status, and the session expiry timestamp. The cache runs with replication factor 2 across availability zones, but session loss on node failure is acceptable—the user simply re-dials.

**Menu Tree Engine:** A declarative menu configuration defines the navigation tree for each financial product. Each node specifies: the text template (with variable substitution), valid input patterns, the next state on valid input, error handling for invalid input (retry up to N times, then abort), and any server-side action to execute (balance lookup, recipient name lookup, transaction submission).

**Timeout Handling—The Critical Edge Case:** The most dangerous moment is when the session times out *after* the transaction has been committed to the ledger but *before* the confirmation screen reaches the user. The user sees their session drop, thinks the transaction failed, and may re-initiate—resulting in a duplicate transfer. The system handles this through:

1. **Orphan Detection:** When the transaction engine commits a transaction, it updates the USSD session's `transaction_status` to `COMMITTED`. If the MNO subsequently sends a session timeout notification (or the session TTL expires without a final response being delivered), the system detects this as an "orphaned post-commit" session.

2. **SMS Fallback:** Orphaned sessions trigger an immediate SMS confirmation to the sender: "Your transfer of KES 5,000 to Jane was successful. Balance: KES 12,500. Ref: TXN-KE-ABCD1234." This ensures the user knows the transaction succeeded even though the USSD session dropped.

3. **Idempotency Protection:** If the user re-dials and initiates the same transfer (same recipient, same amount) within a 5-minute window, the idempotency manager detects it as a potential duplicate and presents: "You sent KES 5,000 to Jane 2 min ago. Send again? 1.Yes 2.No"

### Bottleneck: MNO USSD Gateway Capacity

MNO USSD gateways have finite concurrent session capacity. During peak hours (lunch time, evening), the gateway may reject new sessions with a busy signal. The platform cannot control this—it can only optimize its own response times to minimize session duration (faster responses = sessions complete faster = capacity freed sooner). Target: every server response should complete in <500ms to maximize the number of sessions the MNO gateway can handle.

### Bottleneck: Per-MNO Protocol Variations

Different MNOs implement USSD differently. Some send a timeout notification; others silently drop the session. Some support 182 characters per screen; others limit to 160. Some allow the application to send an unsolicited USSD push; others don't. The USSD gateway must maintain per-MNO adapters with different timeout assumptions, character limits, and session management behaviors. Testing requires physical SIM cards on each MNO's network—no reliable simulator exists.

---

## Deep Dive 2: Agent Float Management and Rebalancing

### The Problem

Each of the 300,000+ agents maintains a dual balance: electronic float (e-value in their agent wallet) and physical cash (in their till or safe). When a customer deposits cash (cash-in), the agent's e-float decreases and cash increases. When a customer withdraws (cash-out), the reverse happens. The platform only tracks e-float directly—physical cash is inferred. If an agent runs out of e-float, they cannot process cash-in transactions. If they run out of cash, they cannot process cash-outs. Either situation turns away customers and damages trust.

### The Agent Hierarchy

```
Head Office (holds master float pool in trust account at partner bank)
    └── Super-Agents (10-50 per country, hold large float allocations)
        └── Dealers (500-2000 per country, distribute float regionally)
            └── Retail Agents (50,000-100,000 per country, serve customers)
```

Float flows downward through purchases: a retail agent buys e-float from their dealer (transferring cash upward), who buys from their super-agent, who buys from head office (which debits the trust account). This hierarchy means rebalancing isn't instant—a rural agent who runs out of e-float at 3 PM must physically get cash to their dealer (who may be 10 km away) to purchase more e-float.

### AI-Driven Float Forecasting

The forecasting model treats each agent as an independent time-series prediction problem:

**Feature Engineering:**
- Historical cash-in/cash-out volumes by hour-of-day, day-of-week, day-of-month
- Agent location classification (urban commercial, rural agricultural, transport hub, border town)
- Calendar events (national holidays, local market days, school term dates, harvest seasons)
- Nearby economic indicators (whether a large employer is nearby and their payday schedule)
- Weather impact (heavy rain reduces foot traffic to agents)

**Prediction Output:** Hourly predicted cash-in and cash-out volumes for the next 72 hours, with confidence intervals. The system computes the projected e-float trajectory and identifies the first hour where float is predicted to drop below the minimum threshold.

**Rebalancing Actions:**
1. **Alert agent:** "Your float is predicted to run low by 2 PM. Visit Dealer X (3.2 km) to top up KES 50,000."
2. **Alert dealer:** "5 agents in your zone need rebalancing tomorrow. Total demand: KES 250,000."
3. **Optimize routes:** For dealer-assisted physical cash delivery, compute optimal delivery routes across a cluster of agents.
4. **Emergency digital transfer:** In some deployments, dealers can electronically transfer float to agents (debiting the dealer's wallet, crediting the agent's), bypassing the need for physical cash exchange.

### Bottleneck: Rural Agent Connectivity

Rural agents may have intermittent connectivity—2G only, with frequent dropouts. Float management commands (balance check, dealer contact) must work over USSD/SMS, not just the agent app. The system must also handle agents who operate "offline" for hours: transactions are recorded locally on the agent's POS device and synced when connectivity returns, with reconciliation logic to handle conflicts.

### Bottleneck: Cash Logistics

The digital system can predict float needs perfectly, but the physical cash delivery depends on logistics that the platform doesn't fully control: dealer vehicle availability, road conditions, security risks of transporting large cash amounts, and banking hours for cash deposits. The platform can optimize digital signals but must design for the reality that physical rebalancing has multi-hour latency.

---

## Deep Dive 3: Fraud Detection — SIM Swap, Social Engineering, Agent Collusion

### Threat Landscape

Mobile money fraud in Africa is a $3–4 billion annual problem. The primary attack vectors are fundamentally different from traditional banking fraud:

**SIM Swap Fraud (30% of losses):** The attacker visits an MNO retail outlet, presents fake ID or bribes the staff, and requests a SIM replacement for the victim's phone number. Once the new SIM is activated, the attacker receives the victim's USSD sessions and SMS confirmations. They immediately change the PIN and drain the wallet. The attack window is typically 1–4 hours between the SIM swap and the victim noticing their phone lost service.

**Social Engineering (25% of losses):** The attacker calls the victim, impersonating an M-Pesa agent or Safaricom customer service, and tricks them into sending money, sharing their PIN, or initiating a transaction that benefits the attacker. Common scripts: "You've won a promotion, send KES 1,000 to register" or "I accidentally sent you money, please send it back" (reverse transaction scam).

**Agent Collusion (20% of losses):** Agents collude with fraudsters or commit fraud directly: processing fake transactions to earn commissions, splitting large transactions to avoid reporting thresholds (structuring), registering SIM cards under fake identities for use in fraud networks, or facilitating money laundering through their cash-in/cash-out functions.

**Account Takeover via Stolen Credentials (15% of losses):** In shared-phone environments (common in rural Africa), family members or acquaintances may observe and steal the victim's PIN.

### Detection Architecture

```
Transaction Request
    │
    ├──→ [Phase 1: Rule Engine] <10ms
    │      • SIM swap check (IMSI changed in last 72h?)
    │      • Velocity checks (>N transactions in T minutes?)
    │      • Blacklist check (known fraud MSISDN/IMEI?)
    │      • Amount threshold (>daily limit for KYC tier?)
    │      │
    │      ├── BLOCK (known fraud pattern) → Reject immediately
    │      └── PASS → Continue to Phase 2
    │
    ├──→ [Phase 2: ML Ensemble] <200ms
    │      • Gradient Boosted Trees (structured features)
    │      • Graph Neural Network (social graph anomalies)
    │      • Sequence Model (transaction pattern deviation)
    │      │
    │      ├── Score > 85 → BLOCK
    │      ├── Score 60-85 → HOLD for manual review
    │      └── Score < 60 → APPROVE
    │
    └──→ [Phase 3: Async Deep Analysis] <5 seconds (post-decision)
           • Full social graph traversal
           • Cross-account pattern matching
           • Agent network analysis
           • Results feed back into Phase 2 model training
```

### SIM Swap Detection — The Critical 4-Hour Window

The platform integrates with MNO HLR (Home Location Register) to detect SIM changes. When a SIM swap is detected:

1. **Immediate:** Wallet is automatically frozen for 72 hours. No outgoing transactions allowed.
2. **Verification:** Customer must visit an agent with original ID to verify identity and re-activate.
3. **Behavioral baseline reset:** Post-reactivation, the user's behavioral biometric baseline (USSD navigation speed, transaction timing patterns) is rebuilt from scratch—any deviation from the old baseline triggers enhanced scrutiny.

**The challenge:** Not all MNOs provide real-time SIM swap notifications. For MNOs without this capability, the platform infers SIM changes from IMSI changes observed in USSD session metadata or from the device registration service. This detection has higher latency (the platform only discovers the IMSI change when the user's next USSD session reaches the platform), creating a detection gap.

### Agent Collusion Detection

Agent fraud is detected through pattern analysis across the agent's transaction history:

- **Commission farming:** Agent processes high volumes of very small transactions (just above the minimum) to maximize commission count. Detection: transaction amount distribution analysis—legitimate agents have a natural distribution; commission farmers show spikes at minimum amounts.
- **Structuring:** Agent splits large transactions into amounts below the reporting threshold ($1,000 or local equivalent). Detection: time-clustered transactions to/from the same customer that sum to amounts near reporting thresholds.
- **Ghost transactions:** Agent processes transactions between accounts they control (or controlled by accomplices) to inflate volume. Detection: graph analysis of transaction flows between wallets frequently served by the same agent.
- **Identity fraud:** Agent registers customers using fake IDs or registers the same person multiple times. Detection: biometric deduplication (where available), phone number usage pattern analysis (accounts that are only used for single transactions then abandoned).

### Bottleneck: Fraud Model Latency vs. Accuracy Trade-off

The inline fraud check must complete in <200ms (it's on the critical path of every transaction), but the most accurate fraud signals (full social graph analysis, cross-account pattern matching) require seconds to compute. The two-phase architecture resolves this: Phase 2 uses pre-computed features and lightweight models for the inline decision, while Phase 3 runs deep analysis asynchronously and can trigger post-commit reversal if fraud is detected. The risk: sophisticated fraud that evades Phase 2 but would be caught by Phase 3 results in money moving before detection. The mitigation: for high-value transactions (>$100), Phase 3 runs synchronously, adding 2-3 seconds to the transaction but providing higher accuracy.

---

## Deep Dive 4: Transaction Processing at Scale with Intermittent Connectivity

### The Problem

Processing 90 million transactions per day (peaking at 7,800 TPS) with the reliability expectations of a financial system is hard enough with reliable infrastructure. Mobile money must do this while handling:
- USSD sessions over congested 2G networks with 2-10 second round-trip latencies
- Agent devices that lose connectivity for minutes to hours
- Power outages that take entire cell tower clusters offline
- MNO USSD gateways that occasionally fail silently

### Idempotency — The Foundation

Every transaction in the system is idempotent: processing the same request twice produces the same result without duplicating the financial impact. The idempotency manager maintains a key-value store mapping `idempotency_key → (status, result)`:

- **Key generation:** For USSD transactions, the key is derived from `hash(msisdn + recipient + amount + 5_minute_time_bucket)`. For API transactions, the client provides the key explicitly.
- **Lookup:** Before processing any transaction, the idempotency manager checks if the key exists. If found and status is COMMITTED, return the cached result. If found and status is PROCESSING (another thread is handling it), wait briefly then return result. If not found, proceed with processing.
- **TTL:** Idempotency records expire after 24 hours (configurable per transaction type).

### Store-and-Forward for Agent Devices

Agents in areas with poor connectivity use devices that support offline transaction recording:

1. **Offline transaction creation:** The agent device creates a transaction record locally, including a cryptographic token signed with the device's private key (bound to the agent's wallet).
2. **Queuing:** Transactions queue in the device's local storage (encrypted at rest).
3. **Sync:** When connectivity returns, the device transmits queued transactions to the platform in batch.
4. **Validation:** The platform validates each transaction's cryptographic token, checks the agent's float balance *at sync time* (not at transaction time), and commits valid transactions. If the agent's float is insufficient for the cumulative offline transactions, the platform commits as many as possible in chronological order and rejects the remainder.
5. **Reconciliation:** Any rejected offline transactions require manual resolution between the agent and the customer.

### Bottleneck: Hot Wallet Contention

A popular agent or merchant may receive hundreds of concurrent transactions, all trying to update the same wallet balance. The double-entry ledger uses optimistic concurrency control: read balance → compute new balance → write with version check. Under high contention, this causes retries. Mitigation strategies:

- **Balance bucketing:** A hot wallet's balance is split across N partitions (e.g., 10). Each transaction targets a random partition, reducing contention by 10×. The total balance is the sum of all partitions.
- **Batch coalescing:** For merchants receiving many small payments, batch consecutive transactions into periodic (every 500ms) aggregate updates.

---

## Deep Dive 5: Credit Scoring for the Unbanked

### The Problem

Traditional credit scoring relies on credit bureau data: credit card payment history, mortgage records, bank statement analysis. In Sub-Saharan Africa, fewer than 20% of adults have any formal credit history. The 80%+ who are "credit invisible" are excluded from lending—not because they are not creditworthy, but because no data exists to assess them. Mobile money transaction history fills this gap: a user who has been receiving regular salary deposits, paying bills on time, and maintaining savings behavior for 12 months is likely creditworthy—even if they have never had a bank account.

### Feature Categories and Engineering Challenges

**Income Stability (most predictive feature cluster):** Regularity of credit transactions is the strongest predictor of repayment ability. But "income" in the informal economy doesn't look like a monthly salary: it might be daily vegetable sales, weekly agricultural market income, or sporadic gig payments. The model must detect income patterns across multiple frequencies (daily, weekly, bi-weekly, monthly, seasonal) and distinguish between earned income, social transfers (money received from family), loan proceeds, and one-time events.

**Social Graph Quality (second most predictive):** Users whose top transacting contacts are themselves creditworthy (pay bills on time, maintain balances, have repayment history) are significantly more likely to repay loans. This creates a graph-based scoring component: the user's score is partially a function of their contacts' scores. The challenge: this creates circular dependencies (A's score depends on B's, which depends on C's, which depends on A's). Solution: iterative convergence—run the graph-based scoring for N iterations until scores stabilize, similar to PageRank.

**Shared Phone Challenge:** In some households, multiple family members share a single phone and therefore a single mobile money account. The transaction patterns of a shared account look different from a single-user account: higher transaction diversity, multiple "income" sources, inconsistent spending patterns. The model must detect shared usage (sudden behavioral shifts, transactions from different geographic locations within short timeframes) and adjust scoring accordingly—shared accounts aren't inherently less creditworthy, but the model's confidence should be lower.

### Model Fairness and Regulatory Concerns

Credit scoring models can inadvertently encode bias: if women historically receive fewer loans (and therefore have fewer repayment records), the model may score women lower—perpetuating exclusion. Mitigation:
- **Protected attribute monitoring:** Track score distributions by gender, age, region, and ethnicity. Alert if any group's median score diverges by more than a threshold.
- **Calibration by cohort:** Ensure that among users with score X, the actual repayment rate is approximately the same regardless of demographic group.
- **Explainability:** For every score, generate the top 5 contributing features. If a protected attribute (or a close proxy) is a top contributor, flag for review.

### Performance: M-Shwari and Fuliza Benchmarks

The M-Shwari model (launched 2012) pioneered mobile money credit scoring with a reported 2% default rate on first-time loans, increasing to 5% for repeat borrowers taking larger amounts. Fuliza (launched 2019) extended over $5 billion in overdraft credit by 2024, with approval rates of ~70% for eligible users. These benchmarks set the bar: a well-calibrated model should achieve 2-4% default rates on micro-loans while maintaining >60% approval rates for active mobile money users—balancing financial inclusion against portfolio risk.
