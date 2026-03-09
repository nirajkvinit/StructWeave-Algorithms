# Interview Guide — RTB System

## 1. 45-Minute Pacing Strategy

### Phase 1: Requirements & Scope (8 minutes)

```
Minute 0-2: Clarify the Role
  "Are we designing the DSP (buy-side), SSP (sell-side), or the exchange (marketplace)?"
  → Most interviews focus on the DSP or the exchange; clarify before proceeding.

  "What scale are we targeting? Startup DSP (100K QPS) or major platform (10M+ QPS)?"

Minute 2-5: Functional Requirements
  Must cover:
  ✓ Bid request processing pipeline (receive → evaluate → respond)
  ✓ Auction mechanism (first-price; mention the industry shift from second-price)
  ✓ Budget management and pacing
  ✓ Impression/click tracking
  ✓ Campaign management (CRUD, targeting)

  Bonus points:
  ✓ Frequency capping
  ✓ Fraud detection
  ✓ Privacy compliance (GDPR/cookieless)

Minute 5-8: Non-Functional Requirements & Estimations
  Key numbers to derive on the whiteboard:
  ✓ Latency: <100ms end-to-end (50-80ms for DSP processing)
  ✓ Throughput: 1-10M QPS depending on scale
  ✓ Availability: 99.95% (bid serving), 99.99% (tracking)
  ✓ Back-of-envelope: bandwidth, storage, compute
```

### Phase 2: High-Level Design (12 minutes)

```
Minute 8-12: Architecture Diagram
  Draw the full flow: Publisher → SSP → Exchange → DSPs → Auction → Winner

  Key components to show:
  ✓ Bidder nodes (stateless, horizontally scaled)
  ✓ Feature store (user profiles, segments)
  ✓ ML inference service (CTR/CVR prediction)
  ✓ Budget pacer (PID controller)
  ✓ Event stream (impression/click tracking)
  ✓ Reporting pipeline (batch analytics)

Minute 12-16: Data Flow
  Walk through the bid request lifecycle:
  1. SSP constructs OpenRTB bid request with impression details
  2. Exchange fans out to eligible DSPs in parallel
  3. DSP: targeting → feature lookup → ML inference → bid calc → respond
  4. Exchange runs first-price auction, selects winner
  5. Winner creative rendered; impression pixel fires
  6. Events flow to billing and analytics

Minute 16-20: Key Decisions
  ✓ Synchronous bid path vs async tracking (explain the boundary)
  ✓ Edge-deployed bidders vs centralized (latency argument)
  ✓ JSON (external) vs protobuf (internal) protocol choice
  ✓ Eventually consistent budget vs strongly consistent (latency trade-off)
```

### Phase 3: Deep Dive (15 minutes)

```
Minute 20-25: Budget Pacing (most common deep dive)
  ✓ The distributed budget problem (80 nodes, 1 campaign)
  ✓ Budget leasing approach (central service issues leases)
  ✓ PID controller for pacing multiplier
  ✓ Race condition: two nodes spending simultaneously → overspend
  ✓ Hard stop circuit breaker at 105% daily budget

Minute 25-30: Auction Engine OR Fraud Detection
  Auction Engine:
    ✓ Timeout management (early termination optimization)
    ✓ Deal priority tiers (guaranteed > preferred > PMP > open)
    ✓ Floor price enforcement

  Fraud Detection:
    ✓ GIVT vs SIVT classification
    ✓ Pre-bid (IP blocklist, device validation) vs post-bid (behavioral analysis)
    ✓ Cost of false positives (blocking legitimate users) vs false negatives (paying for fraud)

Minute 30-35: Scaling & Reliability
  ✓ Geo-distributed edge bidding (why cross-continent RTT kills bids)
  ✓ Feature cache warming (cold start problem)
  ✓ Load shedding hierarchy (optimization → feature → traffic → circuit breaker)
  ✓ Graceful degradation (feature store down → contextual-only bidding)
```

### Phase 4: Wrap-Up (10 minutes)

```
Minute 35-40: Observability & Operations
  ✓ Key metrics: QPS, bid rate, win rate, latency p99, spend pacing
  ✓ SSP/DSP discrepancy detection (why counts differ)
  ✓ Revenue impact of outages (every second of downtime = lost impressions)

Minute 40-45: Extensions & Trade-offs
  ✓ Privacy evolution (Topics API, Protected Audience, cookieless)
  ✓ Bid shading (first-price auction optimization)
  ✓ ML model serving (in-process vs sidecar vs remote service)
  ✓ Supply chain verification (ads.txt, sellers.json)
```

---

## 2. Trap Questions & How to Handle Them

### 2.1 "Why not use a message queue for bid requests?"

```
Trap: Candidate proposes queuing bid requests for asynchronous processing.

Why it's wrong:
  Bid requests have a hard 100ms deadline. By the time a message is enqueued,
  a consumer picks it up, processes it, and responds — the deadline has passed.
  RTB bid requests MUST be processed synchronously. There is no retry, no
  redelivery, no dead letter queue. A missed deadline = lost impression = $0.

Correct answer:
  "Bid request processing is synchronous HTTP — the exchange expects a response
  within 80-100ms or discards the bid. We use message queues for the
  asynchronous path: impression events, budget reconciliation, and analytics.
  The bid serving path is a hot synchronous pipeline with no buffering."
```

### 2.2 "Can you guarantee exactly-once budget deduction?"

```
Trap: Candidate tries to design a distributed transaction for budget.

Why it's a trap:
  Exactly-once semantics across distributed bidder nodes would require
  distributed locks or two-phase commit — adding 20-50ms latency and
  introducing a single point of failure. This is unacceptable in RTB.

Correct answer:
  "We accept eventual consistency for budget tracking. Each bidder node has a
  local budget lease. Slight overspend (bounded to one lease period per node)
  is corrected during reconciliation. A hard stop circuit breaker at 105%
  of daily budget prevents runaway overspend. The trade-off: we might overspend
  by 2-5% vs. adding 30ms of latency for strong consistency."
```

### 2.3 "How do you handle a cold-start for a new campaign?"

```
Trap: Candidate doesn't address the bootstrapping problem.

The challenge:
  ML models need historical data to predict CTR/CVR for a new campaign.
  Without data, bid prices are inaccurate — too high wastes budget,
  too low wins nothing.

Correct answer:
  "New campaigns use an exploration phase:
   1. Start with category-average CTR/CVR priors (transfer learning)
   2. Bid conservatively at manual CPM for first 1000 impressions
   3. Collect engagement data and train campaign-specific model
   4. Gradually transition from prior-based to model-based bidding (Thompson sampling)
   5. Full optimization after ~10K impressions of data

   This is the classic explore-exploit trade-off in online advertising."
```

### 2.4 "Why not cache everything to avoid feature store lookups?"

```
Trap: Candidate over-caches without considering memory constraints.

The challenge:
  2 billion user profiles × 2 KB = 4 TB
  You cannot fit 4 TB in the memory of each bidder node (32 GB RAM).

Correct answer:
  "We use a tiered caching strategy:
   L1: In-process LRU cache (~1M profiles, ~2 GB) — <0.1ms, 30% hit rate
   L2: Local SSD (~100M profiles) — <1ms, 60% hit rate
   L3: Distributed remote store — 5-10ms, 99% hit rate

   The working set (users actively browsing) fits in L1/L2 for most requests.
   For cache misses, we fall back to contextual-only features rather than
   waiting for L3 if we're tight on latency budget."
```

### 2.5 "Should the DSP run its own auction across campaigns?"

```
The nuance:
  When a DSP has 100K campaigns, many may be eligible for the same impression.
  The DSP must select ONE bid to send to the exchange.

Correct answer:
  "Yes, the DSP runs an internal auction (or ranking) across all eligible
  campaigns. Each campaign's bid is computed independently (targeting, ML,
  budget pacing), then the DSP selects the highest-value bid to send.

  This is different from the exchange-level auction:
  - Exchange auction: across DSPs (external, determines the winner)
  - DSP internal ranking: across campaigns (internal, determines which bid to send)

  The DSP's internal ranking considers expected revenue (bid price × win probability)
  and long-term campaign health (don't burn one campaign's budget when another
  could bid on a better impression later)."
```

### 2.6 "What happens when the ML model makes a bad prediction?"

```
The challenge:
  If the CTR model overestimates, the DSP overbids → wastes budget.
  If it underestimates, the DSP underbids → never wins → under-delivers.

Correct answer:
  "Multiple safety layers:
   1. Bid ceiling: Hard cap per impression (never bid more than X CPM)
   2. Budget pacing: PID controller reduces bids if spending too fast
   3. Model monitoring: Compare predicted CTR vs actual CTR hourly
      - If prediction/actual ratio > 1.5: alert; consider model rollback
   4. Canary deployment: New models tested on 5% of traffic first
   5. Fallback: If model service is down, use rule-based bidding (historical avg)
   6. Post-hoc: Daily reconciliation catches systemic over/underspend"
```

---

## 3. Trade-Offs Table

| Trade-Off | Option A | Option B | Recommended |
|---|---|---|---|
| **Latency vs Personalization** | Skip user features → faster, less accurate bids | Full feature lookup → slower, more accurate bids | Tiered: personalized when cache hit; contextual when miss |
| **Spend Accuracy vs Throughput** | Synchronous budget check → exact spend; +20ms latency | Distributed leasing → approximate; no latency | Leasing with reconciliation (B) |
| **Bid Shading Aggression** | Aggressive shading → lower costs but lower win rate | Minimal shading → higher win rate but overpayment | Adaptive: adjust alpha based on campaign objectives |
| **Feature Freshness vs Cache Hit Rate** | Short TTL → fresh data; more cache misses | Long TTL → stale data; fewer cache misses | TTL proportional to data volatility (5min for budget; 1hr for segments) |
| **Fraud Strictness vs Inventory Access** | Aggressive filtering → fewer fraud losses; miss some legitimate users | Lenient filtering → more inventory access; some fraud passes through | Tiered by advertiser preference (brand safety vs reach) |
| **Edge vs Centralized Bidding** | Edge: lowest latency, highest infra cost | Centralized: higher latency, lower cost | Edge for top 3-5 exchange regions; contextual for tail regions |
| **First-Price vs Second-Price Auction** | First-price: simpler, higher revenue for publishers | Second-price: truthful bidding, lower revenue | First-price (industry standard) with bid shading on DSP side |
| **JSON vs Protobuf** | JSON: universal, debuggable, larger | Protobuf: compact, fast, requires schema sync | JSON for OpenRTB external; protobuf for internal services |
| **In-Process ML vs Remote Service** | In-process: zero network hop; larger node footprint | Remote: shared GPU; network latency added | In-process for light models; remote for complex deep learning |
| **Exact vs Approximate Frequency Caps** | Exact: requires distributed locks; +30ms | Approximate: probabilistic counters; eventual consistency | Approximate with periodic reconciliation (±1 impression acceptable) |

---

## 4. Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Say Instead |
|---|---|---|
| Proposing message queues for bid serving | 100ms deadline means no async buffering | "Bid serving is synchronous HTTP; async is for event processing only" |
| Using a relational DB for user feature lookup | Too slow (5-50ms) for real-time bidding at scale | "Feature store uses distributed in-memory KV with tiered caching" |
| Ignoring the multi-party nature | DSP, SSP, Exchange are separate companies with separate systems | "The RTB ecosystem is multi-party; we control the DSP only" |
| Designing for second-price auction | Industry transitioned to first-price in 2019-2021 | "We use first-price with bid shading to avoid overpayment" |
| Treating frequency caps as strongly consistent | Distributed locks would destroy latency | "Approximate frequency caps with eventual consistency are sufficient" |
| Forgetting privacy/consent | GDPR, CCPA are non-negotiable in ad-tech | "Every bid evaluates consent signals; cookieless fallback is essential" |
| Over-engineering fault tolerance for bids | A lost bid is a lost $0.005 impression, not a bank transaction | "Graceful degradation: we'd rather bid with less data than not bid at all" |
| Ignoring bid shading in first-price auctions | Without shading, DSP overpays on every won impression | "Bid shading is critical — we estimate market price and shade bids toward it" |

---

## 5. Calibration: What "Good" Looks Like

### 5.1 Senior Engineer (L5-L6)

```
Expectations:
  ✓ Clear articulation of the bid request lifecycle
  ✓ Understands first-price auction and bid shading at a conceptual level
  ✓ Identifies latency as THE critical constraint and designs around it
  ✓ Proposes stateless bidders with cached data for horizontal scaling
  ✓ Addresses budget pacing at a high level (knows about distributed budget problem)
  ✓ Mentions feature store, ML inference, and event streaming pipeline
  ✓ Handles at least one deep dive well (budget pacing OR fraud detection)
```

### 5.2 Staff Engineer (L6-L7)

```
Expectations (everything above, plus):
  ✓ Derives capacity numbers and latency budgets
  ✓ Explains PID controller for budget pacing with trade-off analysis
  ✓ Discusses bid shading algorithm and win price estimation
  ✓ Addresses race conditions explicitly (budget overspend, frequency cap drift)
  ✓ Designs multi-region edge bidding with data replication strategy
  ✓ Proposes load shedding hierarchy for overload scenarios
  ✓ Understands SSP/DSP discrepancy problem and reconciliation approach
  ✓ Discusses privacy evolution (Topics API, Protected Audience)
  ✓ Handles two or more deep dives with confidence
```

### 5.3 Principal Engineer (L7+)

```
Expectations (everything above, plus):
  ✓ Discusses Agentic RTB Framework and container-based bidding evolution
  ✓ Analyzes ecosystem economics (exchange fees, supply path optimization)
  ✓ Proposes ML model lifecycle (cold start, A/B testing, canary, rollback)
  ✓ Designs observability strategy with discrepancy detection and reconciliation
  ✓ Considers long-term architectural evolution (privacy-first, serverless bidding)
  ✓ Addresses supply chain integrity holistically (ads.txt + sellers.json + schain)
  ✓ Navigates all deep dives fluently and connects trade-offs across domains
```

---

## 6. Interviewer Follow-Up Questions

These are likely follow-up questions after the main design:

```
Scaling:
  "What happens when QPS doubles overnight?" → Autoscaling + load shedding
  "Can this work for CTV/video?" → Heavier processing; dedicated video bidder pool

Budget:
  "What if an advertiser has a $100 daily budget?" → Smaller leases; more conservative pacing
  "How do you handle timezone differences?" → Pacing uses advertiser timezone; UTC for billing

Fraud:
  "How do you balance fraud strictness with fill rate?" → Advertiser-configurable risk tolerance
  "What if your fraud model has a bug?" → Canary deployment; rollback; manual override

Privacy:
  "How does the system work without cookies?" → Contextual targeting + Topics API + first-party data
  "What about children's content?" → COPPA flag in bid request; no behavioral targeting

Operations:
  "How do you debug why a specific impression wasn't shown?" → Trace ID through entire lifecycle
  "How do you handle a model deployment that degrades CTR?" → Canary testing + auto-rollback
```
