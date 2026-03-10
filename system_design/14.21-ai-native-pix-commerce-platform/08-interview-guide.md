# Interview Guide — AI-Native PIX Commerce Platform

## Overview

This guide structures a 45-minute system design interview around the PIX Commerce Platform. The problem uniquely tests a candidate's ability to reason about instant payment settlement (irrevocability constraints), real-time fraud detection under strict latency budgets, government system integration (tax authority APIs), and financial system correctness (exactly-once settlement, reconciliation).

---

## Interview Structure

| Phase | Duration | Focus |
|---|---|---|
| **Phase 1: Problem Framing** | 5 min | Clarify scope, identify PIX-specific constraints |
| **Phase 2: High-Level Design** | 15 min | Architecture, component layout, data flows |
| **Phase 3: Deep Dive** | 15 min | One or two critical subsystems in detail |
| **Phase 4: Scaling & Trade-offs** | 7 min | Growth, bottlenecks, operational challenges |
| **Phase 5: Wrap-up** | 3 min | Summary, what they'd do next |

---

## Phase 1: Problem Framing (5 minutes)

### Opening Prompt

> "Design a payment platform for Brazilian merchants to accept PIX payments. PIX is Brazil's instant payment system—operated by the central bank, it processes over 250 million transactions daily with settlement in under 10 seconds. Settlement is instant and irrevocable—there are no chargebacks. The platform should support QR code payments, recurring billing, and generate the legally required electronic tax invoices for every transaction."

### What Strong Candidates Ask

| Question | Why It Matters |
|---|---|
| "Are we a direct PSP connected to the central bank, or using a sponsor PSP?" | Shows understanding of PSP participation models and the SPI direct vs. indirect connectivity trade-off |
| "Which side of the transaction are we on—payer or payee?" | Critical distinction: a merchant-facing platform is on the payee/receiving side, which determines the API and flow design |
| "Is fraud detection pre-settlement or post-settlement?" | The right answer is pre-settlement (because PIX is irrevocable), but asking the question shows they're thinking about when to intervene |
| "How do recurring payments work in PIX?" | Shows awareness that PIX Automático has specific regulatory requirements (mandate-based, advance notice period) |
| "What's the tax invoice requirement—is it blocking or async?" | Reveals understanding of the Nota Fiscal system and the design choice of whether to couple tax compliance with payment processing |
| "What's the transaction volume we're designing for?" | Grounds the discussion in concrete numbers; strong candidates then do capacity math |

### Red Flags

- Assuming PIX works like card payments (chargebacks, authorization holds, batch settlement)
- Not asking about the irrevocability constraint—this is the single most important PIX design consideration
- Jumping to database schema without understanding the payment flow
- Treating all QR codes as the same (static vs. dynamic have very different architectures)

---

## Phase 2: High-Level Design (15 minutes)

### Expected Components

A strong candidate should identify these core components within 15 minutes:

| Component | Must Include | Bonus |
|---|---|---|
| **API Gateway** | Rate limiting, authentication, routing | mTLS for PSP-to-PSP, merchant API key management |
| **QR Code Service** | Static and dynamic QR generation | BR Code/EMVCo specification awareness, charge endpoint hosting |
| **Transaction Orchestrator** | Payment lifecycle management, DICT lookup | Saga pattern for distributed coordination, idempotency via endToEndId |
| **SPI Gateway** | Central bank settlement integration | RSFN network, ISO 20022 message format, settlement account management |
| **DICT Service** | Key-to-account resolution | Local cache with sync protocol, portability handling |
| **Fraud Engine** | Pre-transaction scoring | <200ms latency budget, ML + rule-based fallback |
| **Nota Fiscal Service** | Tax document generation | Async pipeline, SEFAZ integration, contingency mode |
| **Mandate Manager** | PIX Automático recurring billing | Authorization flow, scheduling, cancellation handling |
| **Reconciliation** | Settlement matching | endToEndId correlation, discrepancy detection |

### Data Flow: The PIX Payment Lifecycle

Ask the candidate to walk through a complete QR code payment flow. Strong candidates cover:

1. Merchant creates a charge → dynamic QR generated with BR Code payload
2. Customer scans QR with their banking app → their PSP reads the payload
3. Customer's PSP submits PIX payment via SPI to our PSP
4. We receive the SPI message, resolve the payer's key via DICT
5. Fraud scoring executes (<200ms)
6. We confirm acceptance → SPI settles in central bank money
7. We receive settlement confirmation (endToEndId)
8. Merchant notified via webhook
9. Nota Fiscal generated asynchronously

### Probing Questions

| Question | What It Tests |
|---|---|
| "What happens if the fraud engine takes too long?" | Fallback strategy, circuit breaker thinking, latency budget management |
| "How do you ensure exactly-once settlement?" | Idempotency, endToEndId deduplication, distributed state management |
| "Where does the transaction state live during the flow?" | Saga pattern awareness, distributed transaction management without distributed locks |
| "How does split payment work if the seller is at a different PSP?" | Understanding that PIX atomically settles to one PSP; splits within PSP vs. secondary transfers to other PSPs |

---

## Phase 3: Deep Dive Options (15 minutes)

Choose one or two based on the candidate's strengths and the role:

### Option A: Fraud Detection for Irrevocable Payments

**Prompt:** "Let's dive into the fraud engine. PIX settlement is irrevocable—once funds move, there's no chargeback. How do you design fraud detection that must make a decision before settlement?"

**Strong Answer Includes:**
- Strict latency budget (200ms total, broken down: feature extraction <20ms, model inference <100ms, decision <10ms, overhead 70ms)
- Feature categories: device fingerprint, behavioral biometrics, velocity counters, transaction graph, DICT metadata
- Social engineering detection as the hardest problem (account holder themselves initiates the transaction)
- Model ensemble (gradient boosting for tabular, GNN for graph, sequence model for behavioral)
- Three-tier decision: approve / step-up authentication / decline
- Fallback to rule-based scoring on model timeout
- Continuous calibration: optimizing for <0.05% false positive rate at 5M daily transactions

**Evaluation:**
| Level | Indicator |
|---|---|
| Junior | Binary approve/decline; single model; no latency consideration |
| Mid | Latency budget; multiple features; understands false positive cost |
| Senior | Social engineering detection; model ensemble; fallback strategy; production calibration |
| Staff+ | Mule network graph analysis; real-time feature store design; model serving infrastructure; feedback loop from MED outcomes |

### Option B: DICT Cache Design at Scale

**Prompt:** "Every PIX transaction requires looking up the recipient's key in the DICT directory—800 million keys. How do you make this fast and reliable?"

**Strong Answer Includes:**
- Local cache vs. direct query trade-off (latency: 2ms vs. 30ms)
- Cache sizing: 800M keys × ~65 bytes = ~50 GB; fits in memory across a sharded cluster
- Incremental sync protocol from BCB (sequence-numbered updates)
- Cache consistency during key portability (stale cache routes payment to wrong PSP)
- Cache miss handling (fallback to direct DICT query)
- Cold start strategy (warm standby replicas, progressive population from queries)
- Anti-fraud metadata in DICT (key age, account creation date, number of unique payers)

**Evaluation:**
| Level | Indicator |
|---|---|
| Junior | "Use a cache" without consistency analysis |
| Mid | Understands sync protocol, cache miss handling |
| Senior | Portability consistency issue, anti-fraud metadata usage, cold start strategy |
| Staff+ | Sequence gap detection, cache shard rebalancing without downtime, DICT rate limit optimization |

### Option C: Nota Fiscal Integration

**Prompt:** "Every PIX transaction requires a legally mandated electronic tax document. Brazil has 27 states, each with its own tax authority API, different tax rates, and varying reliability. How do you design this?"

**Strong Answer Includes:**
- Async pipeline (NF generation decoupled from payment confirmation)
- Tax computation complexity (ICMS varies by origin/destination state and product code)
- Per-state circuit breakers (SEFAZ availability varies from 95% to 99.5%)
- Contingency mode (DPEC) for SEFAZ outages
- XML generation and digital signature (ICP-Brasil certificate)
- 5-year legal retention requirement
- Tax rule currency (rules change frequently; versioned rule database)

**Evaluation:**
| Level | Indicator |
|---|---|
| Junior | "Generate a receipt" without understanding tax computation |
| Mid | Async pipeline, SEFAZ integration, basic tax computation |
| Senior | Per-state reliability handling, contingency mode, tax rule versioning |
| Staff+ | ICMS differential for inter-state sales, Simples Nacional vs. Lucro Real impact, tax optimization within legal bounds |

### Option D: PIX Automático Mandate Management

**Prompt:** "Merchants want recurring billing—like subscriptions. PIX Automático lets customers authorize automatic debits. How do you design the mandate lifecycle and billing scheduler?"

**Strong Answer Includes:**
- Three-party authorization flow (merchant → our PSP → customer's PSP → customer)
- BCB regulatory constraints (2-10 day advance billing, customer cancellation rights)
- Billing scheduler partitioning (no mandate can be missed)
- Retry strategy for failed debits (exponential backoff, max retries before suspension)
- Customer PSP availability as a dependency
- Churn prediction model (mandate cancellation risk scoring)
- Edge cases: customer cancels 5 minutes before billing deadline

**Evaluation:**
| Level | Indicator |
|---|---|
| Junior | "Send a PIX request every month" without mandate concept |
| Mid | Mandate authorization flow, scheduling requirements |
| Senior | Advance window compliance, retry strategy, customer PSP dependency |
| Staff+ | Scheduler partitioning for guaranteed processing, churn prediction, timezone edge cases across Brazil's 4 time zones |

---

## Phase 4: Scaling & Trade-offs (7 minutes)

### Scaling Questions

| Question | Expected Discussion |
|---|---|
| "How does the system handle Black Friday (5-8× normal traffic)?" | Pre-scaling based on calendar events; QR code service and fraud engine are the bottlenecks; SPI has its own capacity management |
| "What's your settlement account strategy?" | Pre-funding requirements; monitoring for liquidity shortfalls; cost of holding reserves at BCB vs. risk of transaction rejection |
| "How do you handle 27 different SEFAZ APIs with different reliability?" | Per-state health monitoring; contingency mode activation thresholds; batch retry during off-peak; degradation doesn't affect payments |

### Trade-off Discussions

| Trade-off | Considerations |
|---|---|
| **Fraud precision vs. recall** | Higher recall (catch more fraud) means more false positives (blocked legitimate payments). PIX's irrevocability pushes toward higher recall, but the cost is merchant revenue loss from blocked transactions. The optimal point depends on the merchant segment. |
| **DICT cache freshness vs. latency** | Fresher cache means more sync overhead and potential for sync lag alerts. Stale cache risks routing payments to old accounts during portability. The 7-day portability window is the critical concern, not normal key updates. |
| **Sync vs. async Nota Fiscal** | Sync: merchant receives NF with payment confirmation. Async: merchant receives payment first, NF 2-10 seconds later. Sync couples payment SLO to SEFAZ availability (bad); async creates a window where payment is confirmed but NF isn't issued (acceptable by regulation). |
| **Direct vs. indirect SPI participation** | Direct: lower latency, full control, higher operational burden. Indirect (via sponsor PSP): simpler operations, additional latency hop, dependency on sponsor's availability. Volume above 500K accounts mandates direct participation. |

---

## Phase 5: Wrap-up (3 minutes)

### Closing Questions

| Question | What It Tests |
|---|---|
| "What would you build first for an MVP?" | Prioritization: QR payments + basic fraud rules + settlement. NF and Automático can come later. |
| "What's the biggest operational risk?" | SPI connectivity loss (merchants can't accept payments), settlement account depletion, or fraud model degradation. |
| "How would you handle PIX expanding to cross-border payments?" | Forward-thinking: currency conversion, cross-border settlement, different regulatory requirements. |

---

## Evaluation Rubric

### Overall Assessment

| Dimension | Junior (1-2) | Mid (3) | Senior (4) | Staff+ (5) |
|---|---|---|---|---|
| **Problem Framing** | Treats PIX like card payments | Understands instant settlement but misses irrevocability implications | Grasps irrevocability as the core constraint; asks about PSP model | Reasons about the unique fraud economics, regulatory landscape, and tax complexity |
| **Architecture** | Monolithic "payment service + database" | Identifies core components but misses external system integration | Clean separation of concerns; SPI/DICT/SEFAZ as explicit integration points | Event-driven architecture with CQRS; saga pattern for distributed transactions; considers settlement account management |
| **Data Modeling** | Generic payment table | Transaction + merchant tables with PIX-specific fields | Full data model including mandates, split rules, Nota Fiscal; endToEndId as cross-system correlation key | Temporal data models for tax rule versioning; event-sourced transaction state; audit-ready schema |
| **Fraud Detection** | "Check if amount is suspicious" | Feature-based scoring with latency budget | Ensemble model with fallback; social engineering detection; false positive calibration | Graph-based mule detection; real-time feature store; feedback loop from MED outcomes; merchant-specific thresholds |
| **Operational Maturity** | No discussion of failures | Mentions SPI connectivity as a risk | Detailed failure modes for each external dependency; circuit breakers; degradation hierarchy | Chaos engineering scenarios; settlement account liquidity planning; BCB compliance monitoring; disaster recovery with RPO=0 |

### Scoring Guide

- **Strong Hire (4.5-5.0):** Candidate demonstrates deep understanding of instant payment systems, reasons about irrevocability constraints unprompted, designs for regulatory compliance (MED, LGPD, Nota Fiscal), and discusses operational maturity of a financial platform.
- **Hire (3.5-4.4):** Candidate understands the core PIX payment flow, identifies the key components, addresses fraud detection with latency constraints, and shows awareness of at least one Brazil-specific complexity (tax, regulation).
- **Lean Hire (2.5-3.4):** Candidate designs a workable payment system but misses PIX-specific nuances; treats it like a generic payment platform with faster settlement.
- **No Hire (<2.5):** Candidate cannot articulate the PIX payment flow, misses the irrevocability constraint, or designs a system that would violate BCB regulations.

---

## Common Mistakes and Trap Questions

### Mistakes Candidates Make

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| "We'll add chargeback support for fraud" | PIX has NO chargebacks. Settlement is final and irrevocable. | Pre-transaction fraud detection; MED for post-fraud recovery (limited effectiveness) |
| "Settle in batches at end of day" | PIX is real-time gross settlement, 24/7. There is no end-of-day batch. | Each transaction settles individually in real-time via SPI |
| "Store the QR code image in the database" | QR codes are generated from BR Code payloads and should be re-renderable; storing images wastes space | Store the BR Code payload (text); render QR on demand |
| "Generate tax invoice during payment" | Coupling payment processing to SEFAZ availability creates a fragile system | Async Nota Fiscal generation after settlement confirmation |
| "Use a single fraud model" | Single model creates a single point of failure and can't be updated without risk | Ensemble of models with canary deployment; rule-based fallback |
| "Put all DICT keys in one cache node" | 800M keys × 65 bytes ≈ 50 GB; exceeds single node memory in most configurations | Shard DICT cache across multiple nodes with consistent hashing |

### Trap Questions

| Question | Trap | Correct Answer |
|---|---|---|
| "Should we authorize the payment before or after fraud scoring?" | Approving before fraud scoring defeats the purpose since PIX is irrevocable | Always score before settlement; this is the only chance to prevent fraud |
| "Can we use the payer's PSP for fraud detection?" | We're the payee PSP; we can't control the payer's PSP fraud decisions | We do our own fraud scoring on the receiving side; we can reject incoming payments we deem fraudulent |
| "What if SEFAZ is down?" | Some candidates say "skip the tax invoice" | Contingency mode (DPEC) is the legally mandated fallback; you can't skip the NF, but you can defer SEFAZ authorization |
| "How do you handle a customer who cancels their PIX Automático mandate right before billing?" | Candidates may try to process the charge anyway | Customer can cancel until 23:59 the day before; the charge must not be processed. This is a BCB regulatory requirement, not a business rule. |
