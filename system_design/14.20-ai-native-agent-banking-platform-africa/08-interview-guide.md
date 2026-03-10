# Interview Guide — AI-Native Agent Banking Platform for Africa

## Overview

This guide structures a 45-minute system design interview around the agent banking platform. The problem is rich because it combines financial system design (ledgers, double-entry, atomicity), distributed systems (offline-first, eventual consistency, conflict resolution), AI/ML (biometric matching, fraud detection, demand prediction), and physical-world constraints (cash logistics, device limitations, regulatory compliance).

---

## Recommended Pacing

| Phase | Duration | Focus |
|---|---|---|
| **Requirements & Scope** | 5-7 min | Clarify scale, identify core features, define boundaries |
| **High-Level Design** | 10-12 min | Architecture, CICO flows, key components |
| **Deep Dive #1** | 10-12 min | Candidate chooses or interviewer steers to most relevant area |
| **Deep Dive #2** | 8-10 min | Second area — ideally contrasting (e.g., if #1 was data model, #2 is offline/distributed) |
| **Scalability & Trade-offs** | 5-7 min | Multi-region, growth, key trade-offs |

---

## Opening Prompt

> "Design an agent banking platform for Africa that allows a network of 500,000+ human agents (shop owners, kiosk operators) to provide banking services — deposits, withdrawals, transfers, bill payments, and account opening — on behalf of a financial institution. Agents operate across regions with varying connectivity, from 4G urban to no-connectivity rural areas. The system processes over 1 billion transactions per month."

### Clarifying Questions a Strong Candidate Should Ask

| Question | Why It Matters | Good Answer to Give |
|---|---|---|
| "What channels do agents use — dedicated POS, smartphone app, or USSD?" | Shows awareness that device diversity drives architecture | "All three — POS terminals, Android apps, and USSD for feature phones" |
| "What percentage of transactions happen offline?" | Critical for deciding consistency model | "15-25% on average, up to 40% in rural areas" |
| "How is customer identity verified — do customers have government ID?" | Drives KYC and biometric design | "Many don't have ID. The platform uses fingerprint and facial biometrics with tiered KYC" |
| "Is this single-country or multi-country?" | Affects compliance architecture significantly | "Multi-country across West and East Africa, starting with Nigeria" |
| "Who manages agent cash/float rebalancing?" | Shows understanding of the physical-digital boundary | "The platform predicts and coordinates, but agents physically travel to rebalance" |
| "What are the regulatory constraints?" | Demonstrates awareness that fintech is regulated | "CBN mandates geo-fencing, agent exclusivity, daily limits, and real-time STR reporting" |

---

## What Great Looks Like at Each Phase

### Phase 1: Requirements & Scope (5-7 min)

**Strong signals:**
- Identifies that this is fundamentally different from building a banking app — the primary users are agents, not end customers
- Recognizes the float management problem unprompted ("the agent needs both cash and e-float, and every transaction shifts the balance")
- Asks about the offline percentage before designing the architecture (shows they know it's a first-class concern, not an edge case)
- Mentions regulatory compliance without prompting

**Red flags:**
- Treats this as a standard payments system without addressing the agent layer
- Ignores offline scenarios or treats them as rare edge cases
- Doesn't ask about scale or transaction volume

### Phase 2: High-Level Design (10-12 min)

**Strong signals:**
- Draws an offline-first architecture where the device has local processing capability, not just a thin client
- Separates the platform's real-time ledger from core banking integration (understanding that core banking is a dependency, not the source of truth for real-time balances)
- Shows the float management service as a distinct component, not buried inside the transaction engine
- Includes biometric verification as a distinct service with on-device and server-side components
- Shows multi-channel support (POS, mobile, USSD) through a channel adapter pattern

**Red flags:**
- Designs a purely online architecture where every transaction requires a server round-trip
- Puts the core banking system as the direct ledger for transactions (this would be too slow and too coupled)
- Doesn't address how agent float balances are tracked

### Phase 3: Deep Dives

#### Deep Dive Option A: Float Management

**Leading question:** "Walk me through what happens when an agent starts running low on e-float. How does the system detect this and what happens?"

**Strong answer includes:**
- Per-agent demand forecasting (not just monitoring current balance, but predicting when depletion will happen)
- Understanding the cash/e-float duality — e-float depletion means the agent has too much cash, not that they've lost money
- Rebalancing logistics: digital top-up for e-float (fast), physical cash deposit/pickup (slow)
- Super-agent hierarchy as the rebalancing network
- Correlated demand problem on salary days

**Exceptional answer adds:**
- Complementary rebalancing — matching agents with opposite imbalances
- Pre-positioning before predicted demand spikes
- The 1.5x rule as a heuristic for new agents without history
- Dynamic float limit adjustment based on agent performance tier

#### Deep Dive Option B: Offline Transaction Processing

**Leading question:** "An agent in a rural area has been offline for 4 hours and processed 50 transactions. They just came back online. Walk me through what happens."

**Strong answer includes:**
- Local risk controls applied offline (per-transaction limits, daily cumulative limits, balance checks against last-known state)
- Cryptographic signing of offline transactions for tamper detection
- Sequence numbers for ordering and gap detection
- Server-side validation of each transaction against current server state
- Conflict resolution strategy for balance mismatches (who bears the loss?)

**Exceptional answer adds:**
- Sync wave management (jittered sync to avoid thundering herd)
- The economic incentive design: agent bears loss from offline conflicts, which incentivizes staying online
- Compensating transactions vs. reversals as conflict resolution mechanisms
- 72-hour offline capacity design and what happens at the boundary

#### Deep Dive Option C: Biometric KYC in Harsh Conditions

**Leading question:** "How do you handle fingerprint verification when the customer is a farmer with worn fingerprints, using a $50 POS terminal in direct sunlight?"

**Strong answer includes:**
- Quality assessment on-device before attempting match
- Adaptive thresholds — lower quality inputs use relaxed thresholds but require additional authentication factors
- Multi-modal fusion — combining degraded fingerprint with degraded facial for acceptable composite score
- Guided capture UX (prompting to clean finger, try different finger, move to shade)
- Fallback chain when biometrics fail entirely

**Exceptional answer adds:**
- The lab-vs-field accuracy gap and its implications for threshold tuning
- Cancelable biometrics for breach resilience
- 1:N deduplication scaling (LSH-based approximate nearest neighbor)
- Training data diversity requirements — models must be trained on captures from these specific low-quality devices

#### Deep Dive Option D: Fraud Detection

**Leading question:** "An agent is generating 200 transactions per day, all ₦4,999 (just below the ₦5,000 commission tier breakpoint), with only 3 unique customer biometric templates. What's happening and how does the system detect it?"

**Strong answer includes:**
- Recognizes this as phantom transaction fraud (agent fabricating transactions)
- Round-number analysis and commission-optimization detection
- Biometric diversity metric as a fraud indicator
- Velocity analysis compared to peer agents
- Graph-based analysis for collusion detection

**Exceptional answer adds:**
- The economic incentive that creates phantom transactions (commission structure)
- Statistical signatures: uniform inter-arrival times, low biometric diversity, round-number bias
- The tension between auto-blocking (reduces fraud loss) and false positives (suspending legitimate agents destroys their livelihood)
- Agent-level risk scoring that decays over time (rehabilitation path for reformed agents)

---

## Trap Questions and Expected Responses

### Trap 1: "Why not just use strong consistency for everything?"

**Expected response:** Strong consistency for the ledger (balance must never double-spend) but eventual consistency for analytics, float predictions, and agent performance scores. Attempting strong consistency across all data in a system with 15-25% offline transactions is impossible — the offline device cannot participate in a quorum. The key insight is identifying which data requires strong consistency (balances, limits) vs. which tolerates staleness (dashboards, scores).

### Trap 2: "Why not store biometrics in the cloud and always match server-side?"

**Expected response:** Because 15-25% of transactions occur offline — if biometric verification requires server connectivity, those transactions cannot authenticate customers. On-device template caching for frequent customers enables offline verification. The security trade-off (templates on device vs. server) is mitigated by device encryption, attestation, and remote wipe capability.

### Trap 3: "Can't you just use the national ID database for KYC instead of biometrics?"

**Expected response:** Many customers lack government-issued IDs — that's why they're using agent banking instead of traditional banks. Biometric KYC provides an alternative identity anchor. National ID verification is valuable as an additional signal (Tier 3 KYC) but cannot be the sole verification method. Additionally, national ID databases have variable availability (frequently down, slow responses) — the system cannot depend on them for real-time transaction authentication.

### Trap 4: "Why not just prevent offline transactions to avoid conflicts?"

**Expected response:** This would make agent banking useless in its most important context — rural areas where connectivity is unreliable are exactly the areas that most need agent banking services. The entire value proposition of agent banking is extending financial services to underserved areas. Disabling offline transactions would be equivalent to closing bank branches in rural areas. The 5-10% conflict rate from offline transactions is a manageable cost compared to the 100% service loss from requiring connectivity.

### Trap 5: "How do you handle an agent who steals the device and runs?"

**Expected response:** Multi-layered defense: (1) Remote wipe erases all cached biometric templates and encryption keys within minutes; (2) Device attestation fails if the device is moved outside geo-fence; (3) Session timeout requires re-authentication; (4) Offline transaction limits cap maximum exposure; (5) The device's value decreases rapidly without valid credentials. The key is that the maximum financial exposure from a stolen device is bounded by the offline daily limit × time until remote wipe executes.

---

## Scoring Rubric

| Dimension | Below Bar | At Bar | Above Bar |
|---|---|---|---|
| **Requirements gathering** | Jumps to design without understanding offline/float constraints | Asks about scale, offline %, and regulatory | Also asks about device types, rebalancing logistics, and customer ID challenges |
| **Architecture** | Online-only; no float management; no biometric service | Offline-aware; separate float tracking; biometric pipeline | Offline-first; event-sourced; regional processing nodes; multi-channel adapter |
| **Data model** | Generic transaction table without double-entry | Double-entry ledger; agent float tracking; biometric templates | Also: offline sequence numbering; conflict resolution metadata; tiered KYC model |
| **Offline handling** | Not addressed or hand-waved | Store-and-forward with basic sync | Full conflict resolution strategy; loss assignment; sync wave management; 72-hour capacity |
| **Float management** | Not addressed | Static threshold alerts | AI-driven prediction; complementary rebalancing; salary-day pre-positioning |
| **Fraud detection** | Not addressed | Basic velocity checks | Statistical phantom detection; graph-based collusion; quality-of-biometric-diversity metric |
| **Scalability** | Single-region monolith | Multi-region with replication | Federated multi-country with compliance engine; regional processing nodes; partitioned ledger |
| **Trade-off articulation** | No trade-offs discussed | Identifies 1-2 key trade-offs | Deeply reasons about offline-vs-consistency, quality-vs-inclusion for biometrics, auto-block-vs-false-positive for fraud |

---

## Follow-Up Questions for Strong Candidates

1. "If you had to expand from Nigeria to Kenya and Tanzania next month, what architectural changes would you need?"
2. "How would you handle a scenario where the biometric deduplication database needs to scale from 50 million to 500 million templates?"
3. "The CBN just mandated that all agent transactions must include real-time geo-fence validation. How does this affect your offline design?"
4. "A competitor is offering agents 30% higher commissions. How would your platform detect and respond to agent attrition before it happens?"
5. "How would you design the system to support a new transaction type — micro-insurance sales at agent locations — with minimal changes?"
