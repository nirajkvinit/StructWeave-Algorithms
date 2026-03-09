# Interview Guide

## 45-Minute Interview Pacing

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|-----------------|
| **1. Requirements** | 5 min | Clarify scope: wholesale vs retail, single country or cross-border, offline required, programmability scope | Functional requirements, scale numbers, privacy stance |
| **2. High-Level Design** | 10 min | Two-tier architecture, token vs account model, core data flow | System diagram, issuance/redemption flow, component responsibilities |
| **3. Deep Dive** | 15 min | Pick 1--2: offline payments + double-spend, programmable money, cross-border settlement | Detailed design of critical paths with trade-offs |
| **4. Scale & Trade-offs** | 10 min | Nation-scale throughput, privacy vs compliance, offline vs online consistency | Sharding approach, privacy model, consistency guarantees |
| **5. Wrap-Up** | 5 min | Monetary policy implications, future evolution | Extensions, what you would build next |

---

## Meta-Commentary: What Makes This Topic Unique

This is a rare interview topic that combines distributed systems, cryptography, monetary economics, and regulatory compliance into a single design challenge. It tests whether a candidate can reason about systems where the constraints are not just technical but also societal.

**What makes it unique:** The central bank is both the issuer AND the regulator, creating design constraints unlike any commercial system. There is no competitor, no profit motive, and failure is not measured in revenue loss but in economic instability.

**Where to spend most time:** The two-tier architecture and offline payment mechanism are the most technically interesting and interview-differentiating areas. These two topics demonstrate deep understanding of why CBDC exists and what makes it architecturally distinct from both cryptocurrency and existing digital payments.

**Common mistake:** Treating CBDC like a cryptocurrency. CBDCs are centrally issued, permissioned, and designed to COMPLEMENT (not replace) commercial banking. A candidate who starts drawing a blockchain with miners has fundamentally misunderstood the problem.

---

## Phase 1: Requirements Gathering (5 min)

### Questions to Ask the Interviewer

1. **"Is this a wholesale (banks only) or retail (public) CBDC, or both?"**
   *Why*: Wholesale CBDC serves dozens of banks for interbank settlement; retail CBDC serves hundreds of millions of citizens for everyday payments. The architecture, scale, privacy model, and offline requirements differ dramatically.

2. **"Which country or jurisdiction? Regulations vary dramatically."**
   *Why*: China's e-CNY prioritizes state oversight; the Digital Euro emphasizes privacy; India's Digital Rupee focuses on financial inclusion. The jurisdiction determines the privacy-compliance balance.

3. **"Must it support offline payments?"**
   *Why*: Offline capability requires hardware trust (Secure Elements), local token storage, and deferred reconciliation---fundamentally different from an always-online system.

4. **"What's the target scale? 500M users is very different from 50K banks."**
   *Why*: Retail CBDC at population scale requires sharding, geographic distribution, and throughput that exceeds any existing payment system.

5. **"Is cross-border settlement in scope?"**
   *Why*: Cross-border adds multi-currency atomic swaps, FX rate oracles, and multi-sovereign governance---each a deep design challenge.

6. **"What's the privacy stance? Cash-like anonymity or bank-like traceability?"**
   *Why*: This determines whether the system uses token-based (UTXO) or account-based models, and whether zero-knowledge proofs or tiered anonymity are needed.

### Establishing Constraints

```
After discussion, state your assumptions clearly:

"Based on our discussion, I'll design a retail CBDC platform that:
 - Uses a two-tier architecture (central bank → intermediaries → users)
 - Supports both online and offline payments
 - Handles 500M wallet holders, 10B transactions/year
 - Supports programmable money with constrained conditions
 - Implements tiered privacy (anonymous for small, identified for large)
 - Targets < 500ms payment confirmation for online transactions
 - Includes cross-border settlement as an extension"
```

---

## Phase 2: High-Level Design (10 min)

### Recommended Approach

1. **Start with the two-tier architecture.** Draw the central bank at the top (issuance, monetary policy, supply control), intermediaries in the middle (KYC, wallet management, transaction routing), and end users at the bottom (wallets, offline storage).

2. **Identify core components**: Issuance Ledger, Intermediary Sub-Ledgers, Token Management (mint/burn), Wallet Service, Offline Payment Module, Programmable Conditions Engine, Reconciliation Service, Cross-Border Gateway.

3. **Draw the issuance flow**: Central bank mints CBDC → distributes to intermediary → intermediary credits user wallet. And the reverse for redemption.

4. **Highlight the key design decision**: Token model vs account model---and why a hybrid is likely optimal.

### Common Mistakes at This Phase

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Designing it as a blockchain | CBDCs are centrally issued; decentralized consensus is unnecessary and too slow | Use a permissioned ledger or centralized DB with cryptographic proofs |
| Direct central bank-to-citizen model | Disintermediates banks, creates systemic risk | Always use the two-tier model with intermediaries |
| Ignoring offline payments | This is the killer feature differentiating CBDC from existing digital payments | Include Secure Element-based offline token transfer |
| Treating it like a payment gateway | CBDC is money itself, not a payment rail | Emphasize issuance/redemption lifecycle, not just transaction routing |

---

## Phase 3: Deep Dive (15 min)

### Deep Dive Option A: Offline Payments & Double-Spend Prevention

**Key points to cover:**
- **Hardware trust anchor**: Secure Element (SE) or Trusted Execution Environment (TEE) maintains balance and monotonic counter that device OS cannot modify
- **Token transfer flow**: Sender's SE decrements balance → generates signed token → receiver's SE verifies signature chain → increments balance
- **Double-spend prevention**: SE enforces monotonic counter; cloned devices produce counter conflicts on resync
- **Resync protocol**: When device reconnects, SE submits offline transaction log to intermediary; intermediary verifies counter continuity and updates sub-ledger
- **Risk management**: Offline spending caps (e.g., equivalent of $500), maximum offline duration (e.g., 14 days), after which wallet requires resync
- **Failure mode**: What if SE is physically compromised? Rate-limit offline issuance, insurance fund for losses below threshold, forensic detection for above

**Impressive addition**: "The offline token carries a chain of custody---each transfer appends a signed hop. On resync, the intermediary can trace the full offline path and detect anomalies like circular transfers (A→B→A) that suggest collusion."

### Deep Dive Option B: Programmable Money Engine

**Key points to cover:**
- **Condition types**: Expiry date, spending category whitelist, geographic boundary, recipient whitelist, minimum holding period
- **Condition language**: NOT Turing-complete. A constrained rule set evaluated at transaction time: `IF condition THEN allow/deny`
- **Immutability**: Conditions set at mint time, never changed retroactively---this is a protocol-level guarantee
- **Sunset clause**: Every condition has a mandatory expiry; no permanent restrictions on money
- **Public registry**: All approved condition types are published; no secret conditions
- **Evaluation flow**: At payment time, wallet checks local conditions → intermediary re-validates → ledger confirms

**Impressive addition**: "Programmable conditions must be composable but not conflicting. A stimulus token with both 'expires in 90 days' and 'only at grocery stores' must have a resolution rule if the conditions interact unexpectedly. The condition engine uses a priority-ordered evaluation with explicit conflict resolution."

### Deep Dive Option C: Cross-Border Settlement

**Key points to cover:**
- **Atomic PvP**: Payment-versus-Payment on a shared multi-CBDC ledger; two currencies swap simultaneously
- **Shared infrastructure**: Each participating central bank runs validator nodes on a permissioned DLT
- **FX rate oracle**: Trusted by all parties; can use median of central bank-published rates
- **Governance**: No single central bank controls the shared ledger; a neutral coordinating body (like the BIS) manages protocol upgrades
- **Settlement finality**: Once atomic swap completes, it is irrevocable---no chargebacks, no correspondent bank delays
- **Liquidity management**: Each central bank pre-funds a pool on the shared ledger; pool size limits settlement volume

---

## Trap Questions and How to Handle Them

### 1. "Why not just use cryptocurrency or a system like Bitcoin?"

**Trap**: Tests whether you understand the fundamental difference between CBDC and crypto.

**Good answer**: "Decentralized consensus (Proof of Work, Proof of Stake) is designed for trustless environments where no single entity is authoritative. CBDC is the opposite---the central bank IS the trusted authority. Using decentralized consensus would sacrifice throughput (Bitcoin handles 7 TPS vs. the millions needed for nation-scale retail), add unnecessary energy costs, eliminate monetary policy control, provide no legal tender status, and make offline payments impossible. CBDC is centrally issued, permissioned digital money---architecturally closer to a distributed database than a blockchain."

### 2. "Why not put everyone on a central bank ledger directly?"

**Trap**: Tests understanding of systemic risk and banking system stability.

**Good answer**: "Direct CBDC (central bank serving every citizen) would disintermediate commercial banks, destroying their deposit funding base. Banks fund 60--70% of their lending through deposits. If deposits migrate to CBDC, credit creation collapses---businesses cannot get loans, mortgages dry up, the economy contracts. Additionally, the central bank cannot handle retail KYC/AML for hundreds of millions of accounts, cannot provide customer service for lost wallets, and becomes a catastrophic single point of failure. The two-tier model preserves commercial banking while adding central bank money as a digital option."

### 3. "How do you prevent the government from surveilling all transactions?"

**Trap**: Tests understanding of the privacy-compliance tension.

**Good answer**: "The architecture implements tiered privacy. Tier 1 wallets (small balances, low limits) require minimal identity---transactions are pseudonymous and intermediary-held, invisible to the central bank. Tier 2 wallets (higher limits) require full KYC but data is held by the intermediary, not the central bank. The central bank sees aggregate flows, not individual transactions. For enhanced privacy, zero-knowledge proofs can verify transaction validity (amount within limits, sender has sufficient balance) without revealing sender, receiver, or amount to the central bank. The key architectural commitment: the central bank's ledger records token movements between intermediaries, not between individuals."

### 4. "What happens if everyone converts bank deposits to CBDC in a crisis?"

**Trap**: Tests understanding of the "digital bank run" problem---the number one concern of central banks and commercial banks.

**Good answer**: "This is prevented through multiple architectural safeguards enforced at the ledger level, not as bypassable business rules. Hard balance caps (e.g., 3,000 currency units per person) physically prevent accumulation. Waterfall mechanisms auto-convert excess CBDC to a linked bank account. Tiered remuneration applies negative interest above the cap, making hoarding expensive. Conversion rate limits throttle how fast deposits can become CBDC. These are system invariants: during a crisis, any soft limit WILL be bypassed, so the caps must be enforced at the ledger's transaction validation layer."

### 5. "How is offline payment different from a prepaid card?"

**Trap**: Tests understanding of what makes CBDC legally and architecturally distinct.

**Good answer**: "Five key differences. First, CBDC tokens are legal tender---a merchant cannot refuse them, unlike prepaid card value. Second, they are backed by the central bank with zero counterparty risk; prepaid cards carry issuer risk. Third, CBDC tokens are interoperable across ALL wallets from any intermediary; prepaid cards work only on their issuer's network. Fourth, CBDC can carry programmable conditions (expiry, spending restrictions); prepaid cards cannot. Fifth, offline CBDC-to-CBDC transfer works peer-to-peer without any intermediary involvement; prepaid card transactions always require issuer authorization."

### 6. "What consensus mechanism would you use?"

**Trap**: Tests whether you default to blockchain thinking.

**Good answer**: "This depends on the architecture choice. If using a centralized database (which many CBDC projects prefer for performance), no consensus mechanism is needed---the central bank's ledger is authoritative. If using a permissioned DLT for transparency and multi-party verification, use crash-fault-tolerant consensus (Raft) for a single-organization deployment, or Byzantine-fault-tolerant consensus (PBFT) if multiple organizations run notary nodes. Never Proof of Work or Proof of Stake---those are for permissionless systems where anyone can join. The consensus participants are known, vetted central bank infrastructure nodes, not anonymous miners."

### 7. "How does cross-border CBDC work without SWIFT?"

**Trap**: Tests understanding of atomic settlement and multi-party infrastructure.

**Good answer**: "Cross-border CBDC uses atomic Payment-versus-Payment on a shared multi-CBDC ledger. Each participating central bank runs validator nodes. When Country A wants to pay Country B, the platform locks Country A's CBDC and Country B's CBDC simultaneously, performs an atomic swap at the agreed FX rate, and releases both---or neither. This eliminates correspondent banking chains, reduces settlement from 2--5 days to seconds, and removes the $44 average per-transaction cost of intermediaries. The FX rate can be sourced from participating central banks' published rates. The key challenge is governance: protocol upgrades, dispute resolution, and adding new currencies require multi-sovereign agreement."

### 8. "Can programmable money be used for social control?"

**Trap**: Tests understanding of the ethical and architectural safeguards needed.

**Good answer**: "This is the most important design constraint. The architecture must make social control structurally impossible, not just policy-prohibited. Safeguards: conditions are set at mint time by authorized entities through a public registry of approved condition types---no secret conditions exist. Conditions cannot be retroactively changed after issuance. Every condition type has a mandatory sunset clause. The condition language is intentionally limited (expiry, category, geography)---no conditions based on identity, behavior, or social metrics are expressible in the language. An independent audit body reviews the condition registry. The central bank publishes transparency reports on condition usage. If the architecture allows arbitrary conditions, it WILL eventually be abused."

---

## Trade-Off Discussions

### 1. Token-Based vs. Account-Based Model

```
Token-based (UTXO model):
  + Enables offline payments (tokens are self-contained value objects)
  + Better privacy (transactions do not require identity lookup)
  + Cash-like properties (bearer instrument)
  - Complex double-spend prevention (requires hardware trust)
  - Harder to implement AML monitoring
  - Token management overhead (splitting, merging denominations)

Account-based model:
  + Simpler implementation (traditional balance ledger)
  + Better audit trail and AML compliance
  + Easier to implement holding limits and interest
  - Cannot work offline (requires ledger lookup)
  - Less privacy (every transaction linked to an account)
  - Not cash-equivalent (requires identity for every transfer)

Optimal: Hybrid model. Tokens for offline/low-value (cash replacement),
accounts for online/high-value (bank transfer replacement).
```

### 2. Centralized Database vs. Distributed Ledger Technology

```
Centralized database:
  + Higher throughput (millions of TPS achievable)
  + Simpler operations, lower latency
  + Central bank has full control
  - Single point of failure (requires extensive redundancy)
  - Less transparency for intermediaries
  - Trust concentrated in one entity's infrastructure

Distributed ledger (permissioned):
  + Multi-party verification increases trust
  + Resilience through redundancy across participants
  + Transparency for auditors and intermediaries
  - Lower throughput (consensus overhead)
  - More complex operations and upgrades
  - Governance challenges for protocol changes

Optimal: Centralized for retail tier (performance), DLT for wholesale
tier (multi-party trust between banks and central bank).
```

### 3. Full Privacy vs. Full Transparency

```
Cash-like anonymity:
  + Preserves civil liberties and financial privacy
  + Encourages adoption (no surveillance fear)
  + Cash-equivalent for unbanked populations
  - Enables money laundering, tax evasion, terrorism financing
  - Regulators and FATF will not approve
  - Cannot enforce holding limits or programmable conditions

Bank-like traceability:
  + Full AML/CFT compliance
  + Enables programmable conditions and holding limits
  + Law enforcement can trace illicit flows
  - Citizens reject surveillance currency (adoption risk)
  - Creates potential for government overreach
  - Not equivalent to cash (loses key property of physical money)

Optimal: Tiered privacy. Small amounts anonymous (Tier 1), larger
amounts identified (Tier 2), with ZKPs enabling compliance
verification without revealing transaction details.
```

### 4. Offline Duration Limits

```
Short (7 days): Less double-spend risk, frequent reconciliation,
  but poor cash replacement for rural areas.
Long (30 days): Better cash replacement, disaster-resilient,
  but higher risk window and reconciliation complexity.

Optimal: Configurable per jurisdiction. Urban: 7 days.
Rural/underserved: 30 days. Emergency override: unlimited
with post-event reconciliation.
```

### 5. Programmability Scope

```
Turing-complete: Maximum flexibility, but security risks (bugs
  freeze money), halting problem, enables dystopian control.
Limited rule set: Predictable, auditable, safe, but less flexible
  and requires protocol upgrades for new condition types.

Optimal: Limited rule set with versioned extensions. Start with
5-10 condition types. Add new types through governed protocol
upgrade process with public review.
```

### 6. Interest on CBDC Holdings

```
Interest-bearing: Powerful monetary policy tool, but competes
  with bank deposits and accelerates disintermediation.
Non-interest-bearing: Simpler, positions as "digital cash,"
  but loses a monetary policy lever.

Optimal: Non-interest-bearing below holding cap (digital cash),
with negative interest above cap as a hoarding deterrent.
```

### 7. Cross-Border Architecture

```
Hub model (mBridge-style): Atomic PvP, single integration point,
  lower cost at scale, but requires multi-sovereign governance.
Bilateral: Full sovereignty retained, simpler governance, but
  does not scale (N*(N-1)/2 agreements) and no atomic multi-currency.

Optimal: Hub model for major corridors, bilateral for smaller ones.
```

---

## Scoring Rubric

### Junior Level (Meets Bar)
- Understands CBDC is central bank money, not cryptocurrency
- Draws a basic two-tier architecture
- Mentions token or account model
- Recognizes need for offline payments
- Basic understanding of privacy concerns

### Senior Level (Strong Hire)
- Designs the two-tier architecture with clear responsibilities per tier
- Explains token vs account trade-offs and proposes hybrid
- Designs offline payment flow with Secure Element and double-spend prevention
- Addresses the digital bank run problem with holding limits
- Discusses tiered privacy model with ZKP option
- Proposes programmable money with safety constraints
- Mentions Merkle-based reconciliation between tiers

### Staff Level (Exceptional)
- Analyzes monetary policy implications of architectural choices
- Designs cross-border atomic PvP settlement with governance model
- Proposes hardware trust root with threat model for SE compromise
- Discusses the programmability-dystopia spectrum with architectural safeguards
- Designs the reconciliation protocol with Merkle proofs for supply verification
- Addresses the hybrid token-account architecture with tier-specific privacy
- Quantifies trade-offs (e.g., offline risk exposure as function of cap and duration)
- Discusses real-world CBDC projects (e-CNY, Digital Euro, mBridge) to ground design choices

---

## Extension Topics (If Time Permits)

1. **Financial inclusion**: How does CBDC serve the unbanked? Minimal-KYC wallets, NFC-only devices without smartphones, agent networks for cash-in/cash-out.

2. **Disaster resilience**: How does the system function during natural disasters when infrastructure is down? Extended offline mode, mesh-network token transfer, post-disaster reconciliation.

3. **Interoperability with existing payment rails**: How does CBDC coexist with existing card networks, real-time payment systems, and mobile money platforms?

4. **Central bank digital identity**: Should the CBDC platform also provide identity infrastructure, or should it consume external identity systems?
