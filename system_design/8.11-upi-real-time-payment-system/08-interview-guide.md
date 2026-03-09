# Interview Guide

## 45-Minute Interview Pacing

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|-----------------|
| **1. Clarify** | 5 min | Scope: "Are we designing the NPCI central switch or the full ecosystem?" Clarify P2P vs P2M, scale targets, geo scope | Functional requirements, scale numbers, key constraints |
| **2. High-Level Design** | 10 min | Four-party model, hub-and-spoke, VPA abstraction, message flow | System diagram, pay/collect flows, component responsibilities |
| **3. Deep Dive** | 15 min | Pick 1--2: NPCI switch routing, double-debit prevention, settlement engine, UPI Lite offline sync | Detailed design of critical paths with trade-offs |
| **4. Scale & Trade-offs** | 10 min | Handling 32K+ peak TPS, bank CBS bottleneck, festival surge planning | Sharding approach, failure handling, degradation strategy |
| **5. Wrap-Up** | 5 min | Extensions (Project Nexus, credit line), regulatory constraints, operational concerns | Prioritized list of improvements |

---

## Meta-Commentary: What Makes UPI Unique

Before diving in, understand why UPI is architecturally distinct from other payment systems:

- **It is a REGULATED MULTI-PARTY system**---you do not control the banks' core banking systems (CBS), yet you must guarantee transaction consistency across 500+ independent banking institutions
- **The NPCI switch is a stateless router, not a fund holder**---it never touches money, never sees the PIN, and never knows the bank balance
- **Where to spend most time in the interview**: The message routing through the NPCI switch and the double-debit/double-credit prevention mechanisms
- **Common mistake**: Designing it like a simple payment gateway---UPI is fundamentally different because it is a 4-party protocol (payer PSP, payer bank, payee bank, payee PSP) coordinated through a central switch
- **Key insight to demonstrate**: Understanding that the NPCI switch is stateless and that the real complexity lives in coordinating eventual consistency across independently operated banking systems

---

## Phase 1: Requirements Gathering (5 min)

### Questions to Ask the Interviewer

1. **"Are we designing the NPCI switch, a PSP app, or the full ecosystem?"**
   *Why*: The NPCI switch is a message router; a PSP manages VPAs and user experience; the full ecosystem includes settlement, dispute resolution, and offline payments. Each has radically different architectural concerns.

2. **"Should we focus on P2P transfers, P2M (merchant) payments, or both?"**
   *Why*: P2M adds QR code flows, merchant settlement cycles, and refund handling. P2P is simpler but still requires collect request spam prevention.

3. **"What scale---current India (700M/day) or projected (1B+/day)?"**
   *Why*: Determines whether we need to discuss sharding strategies, multi-datacenter routing, and the transition from vertical to horizontal scaling.

4. **"Do we need to cover cross-border (Project Nexus) or UPI Lite/offline?"**
   *Why*: Cross-border adds currency conversion, international bank integration, and compliance with multiple regulatory regimes. UPI Lite adds on-device wallet sync challenges.

5. **"Is UPI Lite/offline in scope?"**
   *Why*: UPI Lite X (NFC offline) and 123PAY (IVR-based) represent fundamentally different architectural patterns---on-device processing with deferred settlement.

### Establishing Constraints

```
After discussion, state your assumptions clearly:

"Based on our discussion, I'll design the NPCI central switch and the
surrounding ecosystem that:
 - Supports both P2P and P2M payment flows
 - Routes 700M+ daily transactions across 500+ member banks
 - Achieves 32K+ peak TPS with sub-second routing latency
 - Resolves 400M+ VPAs in real-time
 - Guarantees exactly-once transaction processing (no double-debit)
 - Settles via multilateral net settlement in T+0 windows
 - Enforces 30-second transaction timeout with auto-reversal"
```

---

## Phase 2: High-Level Design (10 min)

### Recommended Approach

1. **Start with the four-party model**: Draw the payer (device) → payer PSP → NPCI switch → payee PSP → payee bank (issuer/acquirer) flow. Emphasize that NPCI is a message router, not a funds holder.

2. **Identify core components**: VPA Resolution Service, NPCI Switch (message router), Transaction State Store, Settlement Engine, Auto-Reversal System, Bank Connector Gateway.

3. **Draw the pay flow**: Payer initiates → PSP encrypts PIN with issuer bank's public key → PSP sends to NPCI → NPCI resolves payee VPA → NPCI routes debit request to payer's bank → bank validates PIN and debits → NPCI routes credit request to payee's bank → payee bank credits → confirmation propagates back.

4. **Highlight the key design decision**: The switch is stateless---all transaction state is externalized to a distributed store, enabling horizontal scaling.

### Common Mistakes at This Phase

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Treating NPCI as a database or fund holder | NPCI never holds funds or account data; it routes messages | Describe NPCI as a stateless message router with external state store |
| Ignoring the bank CBS as the actual bottleneck | Banks' legacy core banking systems are the slowest link | Show CBS as an external dependency with circuit breakers per bank |
| Not discussing settlement separately from transactions | Transaction routing and settlement are fundamentally different flows | Draw them as separate subsystems with different timing guarantees |
| Assuming UPI is "just an API" | UPI is a 4-party protocol with cryptographic requirements | Show the message envelope structure and PIN encryption flow |
| Forgetting regulatory constraints | Data localization, 2FA mandate, and transaction limits are hard requirements | Mention RBI mandates as system invariants early |

---

## Phase 3: Deep Dive (15 min)

### Deep Dive Option A: NPCI Switch Routing and VPA Resolution

**Key points to cover:**
- **VPA resolution**: When `user@psp` is received, NPCI queries the PSP's VPA registry to get the linked bank account. Cached with 15-min TTL since VPA remapping is rare (~0.01% daily).
- **Message routing**: NPCI maintains a bank connectivity matrix---which banks are reachable, via which channels, with what latency. Routes are selected based on bank health scores.
- **Stateless switch**: Each switch node processes messages independently. Transaction state (pending, debited, credited, reversed) lives in an external distributed key-value store keyed by transaction ID.
- **Horizontal scaling**: During festival surges (Diwali peaks at 4x normal), additional switch nodes are spun up with zero state migration---they simply read/write to the shared state store.
- **Bank health monitoring**: NPCI publishes real-time health scores per bank. If a bank's CBS response time degrades beyond threshold, the circuit breaker trips and users see "bank temporarily unavailable" rather than timeouts.

**Impressive addition**: "The VPA resolution layer is architecturally identical to DNS---a human-readable address resolved to a system-internal address via an indirection layer. Like DNS, we can cache aggressively because the mapping changes infrequently."

### Deep Dive Option B: Double-Debit Prevention and Auto-Reversal

**Key points to cover:**
- **Idempotency via RRN**: Every transaction carries a unique Retrieval Reference Number (RRN). Banks use this to ensure that replayed messages do not cause duplicate debits or credits.
- **The partial failure problem**: In a 4-party system, the debit can succeed at the payer's bank but the credit can fail at the payee's bank. This leaves money in limbo.
- **Auto-reversal protocol**: If the credit leg fails or times out, NPCI initiates an automatic reversal to the payer's bank within the 30-second window. If the reversal itself fails, a reconciliation job picks it up.
- **T+1 reconciliation**: Every night, NPCI and all banks exchange transaction logs. Any discrepancy (debit without matching credit) triggers an automatic reversal within 48 hours.
- **State machine**: Each transaction moves through: INITIATED → DEBIT_REQUESTED → DEBITED → CREDIT_REQUESTED → CREDITED → SETTLED. Any timeout triggers a compensating transition.

**Impressive addition**: "The auto-reversal protocol converts every ambiguous intermediate state into a guaranteed final state---either fully completed or fully reversed. This is a distributed saga pattern, but with regulatory teeth: NPCI mandates 48-hour reversal SLAs."

### Deep Dive Option C: Settlement Engine

**Key points to cover:**
- **Multilateral net settlement**: Instead of settling 700M individual transactions, NPCI calculates net positions per bank pair. If Bank A owes Bank B ₹100Cr and Bank B owes Bank A ₹80Cr, only ₹20Cr moves.
- **Settlement windows**: Multiple settlement cycles per day (currently 4--6 windows). Each window aggregates all transactions since the last window.
- **Liquidity management**: Banks pre-fund settlement accounts. If a bank's net obligation exceeds its pre-funded balance, NPCI can delay that bank's settlement or invoke a liquidity facility.
- **Reconciliation**: Three-way match between NPCI's transaction log, payer bank's log, and payee bank's log. Discrepancies trigger investigation workflows.
- **Settlement finality**: Once NPCI confirms settlement, it is irrevocable. This is enforced by the central bank's settlement infrastructure.

---

## Trap Questions and How to Handle Them

### "Why not just build UPI as a blockchain?"

**Trap**: Tests understanding of throughput constraints vs. decentralization.

**Good answer**: "Blockchain consensus at 700M transactions per day is impractical. UPI's centralized switch achieves 32K+ peak TPS, which no public blockchain matches. Blockchain's value proposition is trustless decentralization, but UPI already has a trusted central authority (NPCI, regulated by RBI). Adding consensus overhead would increase latency from milliseconds to seconds without adding meaningful trust guarantees in this regulated context."

### "What happens if NPCI goes down?"

**Trap**: Tests single-point-of-failure awareness.

**Good answer**: "NPCI operates active-active data centers with automatic failover. But I should acknowledge that NPCI IS a regulatory SPOF by design---similar to how payment card networks are single points of failure for card transactions. This is a deliberate regulatory choice: centralized oversight enables compliance enforcement, dispute resolution, and settlement guarantees. The mitigation is operational excellence (99.95%+ uptime SLA) rather than architectural elimination of the SPOF."

### "Why not let banks talk directly to each other?"

**Trap**: Tests understanding of ecosystem coordination costs.

**Good answer**: "Peer-to-peer bank communication creates O(N²) integration complexity---with 500+ banks, that is 250,000+ bilateral connections, each with its own message format, error handling, and settlement agreement. The hub-and-spoke model reduces this to O(N) connections. Beyond engineering simplicity, the hub enables standardized dispute resolution, unified settlement, centralized fraud detection, and regulatory oversight. Card networks made the same architectural choice decades ago for the same reasons."

### "How do you handle a bank whose CBS is slow?"

**Trap**: Tests operational maturity.

**Good answer**: "NPCI implements a circuit breaker per bank. If a bank's CBS response time exceeds the threshold (e.g., p99 > 5 seconds) or error rate spikes, the circuit trips. New transactions to that bank receive an immediate 'bank temporarily unavailable' response instead of queuing up and timing out. NPCI publishes real-time bank health scores that PSP apps can use to show proactive warnings. For degraded-but-functional banks, NPCI can reduce the routing priority, sending only high-priority transactions."

### "What if someone sends 1000 collect requests to your VPA?"

**Trap**: Tests spam and abuse awareness.

**Good answer**: "Defense is layered: PSP-level rate limiting caps outbound collect requests per user (e.g., 20/hour). NPCI-level aggregate throttling caps inbound collect requests per target VPA (e.g., 50/day from unique senders). Users can configure block lists and auto-decline rules in their PSP app. Repeated offenders trigger escalation to NPCI's fraud team. The collect request flow is inherently riskier for spam than pay flow because the payee initiates it---this is why UPI added mandatory user confirmation before any collect request debits funds."

### "How does UPI work without internet?"

**Trap**: Tests knowledge of UPI Lite and 123PAY.

**Good answer**: "Two offline mechanisms exist. UPI Lite X uses NFC for device-to-device offline transfers---both devices maintain an on-device wallet pre-funded up to ₹2,000, and the NFC transaction updates local balances without server communication. When connectivity returns, the device syncs with the server and settles the delta. 123PAY uses IVR (phone call) based flows for feature phone users---no internet required, the transaction is processed via USSD/IVR gateway to NPCI. Both represent a tiered processing strategy: small offline transactions use simplified flows, while large transactions require the full NPCI switch path."

---

## Trade-Off Discussions

### Routing Model

| Dimension | Hub-and-Spoke (NPCI) | Peer-to-Peer (Bank-to-Bank) | Recommendation |
|-----------|----------------------|----------------------------|----------------|
| Integration complexity | O(N)---each bank connects to NPCI only | O(N²)---every bank pair needs a connection | **Hub**---500+ banks make P2P infeasible |
| Settlement | Centralized multilateral netting | Bilateral settlement per bank pair | **Hub**---netting reduces liquidity by 60--70% |
| Compliance | Single enforcement point | Each bank pair must enforce independently | **Hub**---regulatory oversight is centralized |
| Latency | Extra hop through NPCI (~10ms) | Direct connection is faster | P2P wins on latency, but 10ms is negligible |
| Resilience | NPCI is a SPOF | No single point of failure | P2P wins on resilience, but operational excellence mitigates |

**Recommendation**: Hub-and-spoke. The O(N²) integration cost and settlement complexity of peer-to-peer is prohibitive at 500+ banks. The SPOF risk is mitigated through active-active deployments.

### Transaction Model

```
Synchronous end-to-end:
  + User gets instant confirmation ("money sent")
  + Simpler error handling---success or failure, no ambiguity
  - Requires all 4 parties to respond within 30 seconds
  - Bank CBS latency directly impacts user experience

Asynchronous with eventual confirmation:
  + Tolerates slow bank CBS responses
  + Can queue and retry without user waiting
  - User sees "pending" instead of instant confirmation
  - Creates ambiguous states that require reconciliation
  - Consumer trust is lower ("did my money actually go?")

Recommendation: Synchronous. UPI's value proposition is INSTANT payment.
The 30-second timeout with auto-reversal handles the failure cases.
```

### VPA Resolution Strategy

```
Real-time lookup per transaction:
  + Always fresh---VPA changes reflected immediately
  + No cache invalidation complexity
  - 700M lookups/day creates massive load on PSP registries
  - Adds 5-15ms latency per transaction

Cached with 15-minute TTL:
  + 90%+ cache hit rate reduces PSP registry load by 10x
  + Saves 5-15ms per cached resolution
  - Stale data risk: VPA remapped but cache serves old mapping
  - Cache invalidation needed on VPA updates

Recommendation: Cached with 15-min TTL. VPA remapping is extremely rare
(~0.01% of VPAs change daily). The stale-data risk is mitigated by the
PSP pushing invalidation events on VPA changes.
```

### Settlement Approach

```
Real-Time Gross Settlement (RTGS-style):
  + Immediate finality per transaction
  + No batch reconciliation needed
  - 700M individual settlements/day is operationally impossible
  - Each bank needs massive liquidity reserves
  - Central bank settlement system cannot handle this volume

Multilateral Net Settlement (batch):
  + Reduces 700M transactions to thousands of net transfers
  + Banks need 60-70% less liquidity
  + Reconciliation happens in defined windows
  - Settlement finality is delayed (T+0 windows, not per-transaction)
  - Batch failures affect all transactions in the window

Recommendation: Net settlement. The liquidity reduction alone makes this
the only viable option at UPI's scale.
```

### PIN Handling

```
NPCI decrypts and re-encrypts:
  + NPCI can validate PIN format before forwarding
  + Simpler key management (one key pair per bank-NPCI link)
  - NPCI becomes a high-value target (sees all PINs)
  - Compromise of NPCI exposes all users' PINs
  - Violates principle of least privilege

End-to-end encryption to issuer bank:
  + NPCI never sees the PIN (zero-knowledge routing)
  + PSP never sees the PIN
  + Compromise of NPCI or PSP does not expose PINs
  - Key distribution: each device needs the issuer bank's public key
  - Key rotation requires app updates or key distribution protocol

Recommendation: End-to-end. NPCI should never see the PIN. This is a
fundamental security principle---the router should not have access to
the secret it routes.
```

---

## Scoring Rubric

### Junior Level (Meets Bar)
- Identifies UPI as a multi-party system with a central switch
- Draws basic pay flow from payer to payee through NPCI
- Mentions VPA as a payment address
- Recognizes the need for transaction timeouts
- Basic understanding that NPCI routes but does not hold funds

### Senior Level (Strong Hire)
- Designs the stateless switch architecture with external state store
- Handles double-debit prevention via RRN-based idempotency
- Discusses the auto-reversal protocol for partial failures
- Explains VPA resolution with caching strategy
- Proposes circuit breakers per bank for CBS failures
- Discusses multilateral net settlement vs. gross settlement
- Mentions end-to-end PIN encryption (NPCI never sees PIN)

### Staff Level (Exceptional)
- Explains the hub-and-spoke trade-off quantitatively (O(N) vs O(N²))
- Designs the settlement engine with liquidity management
- Discusses UPI Lite offline architecture and sync-on-reconnect
- Analyzes festival surge handling (4x peak) with horizontal scaling
- Proposes T+1 reconciliation as a safety net for auto-reversal
- Discusses Project Nexus cross-border extension architecture
- Addresses regulatory constraints (data localization, 2FA mandate) as system invariants
- Explains why NPCI being a SPOF is a deliberate regulatory design choice

---

## Quick Reference Card

| Metric | Value |
|--------|-------|
| Annual transactions (2025) | 228.3 billion |
| Daily average | 700M+ |
| Peak TPS | 32K+ |
| Member banks | 500+ |
| Registered VPAs | 400M+ |
| NPCI transaction timeout | 30 seconds |
| Settlement model | T+0 multilateral net settlement |
| Per-transaction limit | ₹1 lakh (₹5 lakh for specific categories) |
| Auto-reversal SLA | 48 hours |
| VPA cache TTL | 15 minutes |
| Settlement windows per day | 4--6 |
| Net settlement liquidity saving | 60--70% vs gross |

---

## Extension Topics (If Time Permits)

1. **Project Nexus (cross-border UPI)**: How do you extend the hub-and-spoke model to route transactions between India's NPCI and foreign payment switches (e.g., Singapore's PayNow, Thailand's PromptPay)? Currency conversion, FX rate locking, and cross-border settlement.

2. **UPI credit line**: How do you enable banks to offer pre-approved credit lines accessible via UPI? This changes the transaction model from "debit savings account" to "draw from credit line" with interest accrual.

3. **Merchant discount rate (MDR) optimization**: With zero MDR for UPI, how do PSPs and banks sustain the infrastructure? Discuss cross-subsidization, value-added services, and data monetization.

4. **UPI AutoPay (recurring mandates)**: How do you handle standing instructions with e-mandate where the merchant can pull funds on a schedule without per-transaction PIN entry?

5. **Fraud detection at switch level**: How does NPCI detect suspicious patterns across the entire network (e.g., a sudden spike in collect requests, mule account detection, velocity checks) without seeing transaction details?
