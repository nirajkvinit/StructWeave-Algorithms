# Interview Guide — AI-Native Mobile Money Super App Platform

## 45-Minute Interview Pacing

| Phase | Time | Focus | Evaluation Criteria |
|---|---|---|---|
| **Phase 1: Problem Framing** | 0–8 min | Scope definition, unique constraints identification | Does the candidate immediately recognize USSD constraints, agent network complexity, and financial system guarantees? Or do they start with a generic payment system? |
| **Phase 2: High-Level Design** | 8–20 min | Architecture, major components, data flows | Can they design a dual-channel system (USSD + App) with a unified ledger? Do they account for the agent layer? |
| **Phase 3: Deep Dive** | 20–38 min | Choose 1–2 areas for detailed design (USSD session management, fraud detection, float management, credit scoring) | Depth of understanding of chosen area; awareness of edge cases specific to mobile money |
| **Phase 4: Trade-offs & Extensions** | 38–45 min | Scaling, multi-country, super app evolution | Can they reason about regulatory constraints, cross-border settlement, and platform evolution? |

---

## Phase 1: Problem Framing Questions

### Opening Question
*"Design a mobile money platform like M-Pesa that supports P2P transfers, merchant payments, agent cash-in/cash-out, and embedded financial products (nano-loans, micro-insurance) for 60 million users across multiple African countries."*

### Probing Questions

**Understanding constraints:**
- "What makes this different from designing PayPal or Venmo?"
  - **Strong answer:** Identifies USSD as primary interface (feature phone dominance), agent network as physical infrastructure layer, infrastructure constraints (intermittent connectivity, power outages), and unbanked population (no existing financial identity). Recognizes that the hard problem isn't the technology—it's building bank-grade reliability on unreliable infrastructure.
  - **Weak answer:** Treats it as a standard payment API with a "simpler interface for developing markets."

- "Who are your users and how do they access the platform?"
  - **Strong answer:** Distinguishes between feature phone users (USSD), smartphone users (app), agents (POS/app), merchants (till number/QR), and third-party developers (API). Notes that a significant percentage of users may be illiterate or have minimal digital literacy.
  - **Weak answer:** Assumes all users have smartphones and internet.

- "What are the financial system guarantees you need?"
  - **Strong answer:** Exactly-once transaction semantics, double-entry ledger, zero tolerance for money loss, regulatory audit trail, trust account reconciliation.
  - **Weak answer:** "We need ACID transactions"—correct but insufficient.

---

## Phase 2: High-Level Design Questions

### Architecture Questions

- "Walk me through the architecture from a user dialing *334# to completing a P2P transfer."
  - **Strong answer:** Phone → MNO cell tower → MNO USSD gateway → Platform USSD session manager (stateful, server-side) → sequential menu screens (5–6 steps) → PIN verification → fraud check → double-entry ledger write → SMS confirmation to both parties. Mentions the 60–180 second session timeout budget and 182-character screen limit.
  - **Weak answer:** Skips USSD entirely or treats it as a simple API call.

- "How does the agent cash-in/cash-out flow work?"
  - **Strong answer:** Describes the dual-balance problem (electronic float + physical cash), the need for both agent and customer to authenticate, the float management hierarchy (retail agent → dealer → super-agent → head office), and the rebalancing challenge.
  - **Weak answer:** Treats agents as ATMs rather than as human intermediaries with their own liquidity constraints.

- "How do you handle a transaction that commits to the ledger but the USSD session drops before the user sees confirmation?"
  - **Strong answer:** Describes the "orphaned post-commit" scenario, SMS fallback confirmation, and idempotency protection against re-initiation. May discuss transaction receipt lookup via separate USSD shortcode or mini-statement.
  - **Weak answer:** "We can retry the USSD session"—USSD sessions cannot be resumed once terminated.

### Data Model Questions

- "Design the wallet and transaction data models."
  - **Strong answer:** Wallet identified by MSISDN with balance in smallest currency unit (cents), version field for optimistic concurrency. Transaction as a double-entry journal: every transaction produces at least two ledger entries (debit + credit) that must balance. Mentions idempotency key, fraud score at time of transaction, and before/after balance snapshots for audit.
  - **Weak answer:** Single-entry balance update without journal or audit trail.

---

## Phase 3: Deep Dive Questions

### USSD Session Management Deep Dive

- "How do you manage state across a multi-step USSD session?"
  - **Strong answer:** Server-side session store (in-memory cache) keyed by (session_id, MSISDN). Session state includes: current menu position, accumulated user inputs (recipient, amount), PIN verification status, and expiry timer. The session store has a TTL matching the MNO timeout. Mentions that different MNOs have different timeouts and protocol behaviors.
  - **Weak answer:** Relies on client-side state (USSD has no client-side state).

- "What's your latency budget for each USSD screen?"
  - **Strong answer:** Total session timeout: 60–180s. User think time: ~8s per screen × 5 screens = 40s. Remaining for system: 20–140s. But network latency between user's phone and MNO gateway is variable (2–10s on 2G). Target server-side processing: <500ms per screen. This gives comfortable margin for most flows but constrains what can happen per screen—no complex computations, no external API calls that might timeout.
  - **Weak answer:** Doesn't account for the session timeout budget.

### Fraud Detection Deep Dive

- "How do you detect SIM swap fraud?"
  - **Strong answer:** Multi-layer: (1) MNO real-time notification of SIM change → immediate wallet freeze, (2) IMSI comparison on each USSD session → detect at first post-swap session, (3) behavioral biometric change detection → catch even if IMSI check isn't available. Describes the 72-hour cooling period and progressive access restoration.
  - **Weak answer:** Only mentions checking with the MNO, not the compensating controls.

- "What's the trade-off between fraud detection accuracy and transaction latency?"
  - **Strong answer:** Describes two-phase architecture: fast rule engine (<10ms) catches known patterns, ML ensemble (<200ms) catches nuanced fraud. For high-value transactions, synchronous deep analysis adds 2–3 seconds. Explains that post-commit fraud detection is a fallback but money has already moved—reversal requires cooperation.
  - **Weak answer:** Treats it as a simple threshold decision.

### Agent Float Management Deep Dive

- "How do you predict and manage agent float across 300,000 agents?"
  - **Strong answer:** Each agent is a time-series forecasting problem. Features: historical cash-in/cash-out by hour, day-of-week, day-of-month (payday), seasonality, location type (urban/rural/transport hub). Predictions drive proactive alerts to agents and dealers. Discusses the physical logistics constraint: even if you predict perfectly, moving physical cash takes hours.
  - **Weak answer:** Static float allocation or manual monitoring.

### Credit Scoring Deep Dive

- "How do you build a credit score for someone with no banking history?"
  - **Strong answer:** Uses mobile money behavioral data as proxy: transaction regularity (income stability proxy), bill payment timeliness (financial discipline proxy), savings behavior (planning capacity proxy), social graph quality (community stability proxy). Mentions ensemble model (gradient boosted trees + sequence model), graduated lending strategy (small first loan, increase with repayment), and fairness monitoring (score distributions by demographic group).
  - **Weak answer:** Suggests using traditional credit bureau data or simple rule-based scoring.

---

## Trap Questions and Common Mistakes

### Trap 1: "Can we just use REST APIs instead of USSD?"
**The trap:** This ignores the fundamental market reality. Feature phones dominate in Sub-Saharan Africa—in many markets, 60%+ of users have no smartphone. Eliminating USSD eliminates the majority of users. The candidate should explain why USSD is a hard constraint, not a design choice.

### Trap 2: "Let's use blockchain for the ledger"
**The trap:** Blockchain's consensus mechanism adds seconds of latency per transaction—incompatible with the 500ms-per-screen USSD latency budget. Mobile money doesn't need trustless consensus (the platform is the trusted intermediary). The candidate should explain why a centralized double-entry ledger is the right choice: faster, simpler, auditable, and the trust model is appropriate.

### Trap 3: "We can handle offline mode with eventual consistency"
**The trap:** "Eventual consistency" for a financial ledger means money can be double-spent. If a user's wallet shows $100 and they withdraw $100 from two different agents simultaneously (both in offline mode), eventual consistency would allow both transactions—creating $100 from nothing. The candidate should describe how offline mode uses conservative limits, cryptographic tokens, and explicit float over-commitment risk acceptance with manual resolution.

### Trap 4: "Store the PIN encrypted instead of hashed"
**The trap:** Encrypted PINs can be decrypted (by anyone with the key), while hashed PINs cannot be reversed. Even though USSD transmits PINs in cleartext (an inherent protocol limitation), storing them encrypted rather than hashed creates an unnecessary risk surface. The candidate should advocate for bcrypt hashing.

### Trap 5: "Run fraud detection asynchronously to avoid adding latency"
**The trap:** Asynchronous fraud detection means the money moves before the fraud check completes. For mobile money, once money is in the receiver's wallet, they can withdraw it at an agent within seconds—making reversal practically impossible (unlike credit card chargebacks where the merchant relationship provides a reversal path). The candidate should argue for synchronous inline fraud detection with a tight latency budget.

### Trap 6: "Use a single global database for all countries"
**The trap:** Financial regulators in most African countries mandate data residency—customer financial data must stay within the country's borders. A global database violates this. Additionally, a global database creates a single point of failure across all markets. The candidate should design country-isolated data stores with shared (anonymized) ML infrastructure.

---

## Key Trade-off Discussions

### Trade-off 1: USSD Transaction Limits vs. User Experience
- Lower USSD limits (compensating for cleartext PIN transmission) frustrate power users who must use USSD because they lack smartphones
- Higher limits increase fraud risk on the inherently less secure channel
- **Discussion point:** How do you set limits that balance security and usability? Should limits be personalized based on user risk profile?

### Trade-off 2: Fraud Detection Strictness vs. Financial Inclusion
- Strict fraud rules block more fraud but also block more legitimate transactions (false positives)
- In populations with irregular financial patterns (informal economy), "normal" behavior looks like "anomalous" behavior to traditional fraud models
- **Discussion point:** How do you calibrate fraud models for populations whose transaction patterns differ from the training data?

### Trade-off 3: Credit Model Accuracy vs. Financial Inclusion
- Conservative models approve fewer loans and have lower default rates but exclude more deserving borrowers
- Aggressive models include more people but risk portfolio losses and potential over-indebtedness
- **Discussion point:** How do you balance the social mission (financial inclusion) against portfolio risk? Is a 4% default rate acceptable if it means 30% more people get access to credit?

### Trade-off 4: Agent Offline Transaction Limits
- Higher offline limits mean agents can serve more customers during connectivity outages
- Higher limits increase the risk of float over-commitment and fraud during the reconciliation gap
- **Discussion point:** Should offline limits vary by agent trust score? What's the reconciliation process when offline transactions exceed available float?

### Trade-off 5: Multi-Country Code Sharing vs. Country-Specific Implementation
- Shared codebase reduces development effort and ensures consistent behavior
- Country-specific requirements (regulatory, MNO protocol, language) create configuration complexity
- **Discussion point:** Where is the boundary between "configuration" and "custom code"? How do you handle a country that requires a fundamentally different flow (e.g., mandatory biometric for every transaction)?

---

## Scoring Rubric

| Dimension | Junior (1-2) | Mid (3-4) | Senior (5-6) | Staff+ (7-8) |
|---|---|---|---|---|
| **Constraint Awareness** | Designs generic payment system | Mentions USSD but doesn't deeply understand constraints | Designs around USSD timeouts, 182-char limits, and feature phone dominance | Explains how USSD constraints ripple through entire system design (latency budgets, error handling, receipt mechanism) |
| **Financial Rigor** | Single-entry balance tracking | Mentions ACID but doesn't implement double-entry | Designs double-entry ledger with idempotency and audit trail | Explains trust account reconciliation, regulatory reporting, and exactly-once semantics across unreliable networks |
| **Agent Network** | Ignores agents or treats as simple endpoints | Mentions agents but doesn't address float management | Designs float tracking and rebalancing hierarchy | Explains AI-driven float forecasting, physical logistics constraints, and the cash-digital duality |
| **Fraud Detection** | Rule-based checks only | ML-based scoring mentioned | Two-phase architecture with SIM swap detection | Explains behavioral biometrics, graph-based agent collusion detection, and the latency-accuracy trade-off |
| **Multi-Country** | Single-country design | Mentions "configuration per country" | Designs data isolation for regulatory compliance | Explains cross-border settlement, multi-currency ledger, and regulatory rules engine |
| **AI Integration** | No AI consideration | Mentions fraud and credit scoring | Designs credit scoring pipeline for unbanked | Explains alternative data features, model fairness, shared phone challenge, and graph-based social scoring |
