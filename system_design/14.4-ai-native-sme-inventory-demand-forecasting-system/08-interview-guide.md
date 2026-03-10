# 14.4 AI-Native SME Inventory & Demand Forecasting System — Interview Guide

## 45-Minute Interview Pacing

| Phase | Time | Focus | What Interviewer Evaluates |
|---|---|---|---|
| **1. Problem Scoping** | 0–7 min | Clarify requirements; identify SME-specific constraints vs. enterprise inventory; define scope boundaries (channels, forecasting, sync, batch/expiry) | Can the candidate distinguish SME constraints from enterprise? Do they ask about data sparsity, cost constraints, user sophistication? |
| **2. High-Level Design** | 7–20 min | Architecture sketch; major components (ingestion, forecasting, inventory engine, sync bus, optimization); data flow for key operations | Can they decompose the system into logical components? Do they identify the channel sync challenge? Do they consider multi-tenancy from the start? |
| **3. Deep Dive (Interviewer Choice)** | 20–35 min | One or two deep dives: probabilistic forecasting, multi-channel sync/overselling, batch/expiry management, cold-start problem, or reorder optimization | Can they go deep on distributed systems or ML aspects? Do they understand the trade-offs (consistency vs. availability in sync, accuracy vs. compute cost in forecasting)? |
| **4. Scalability & Trade-offs** | 35–42 min | Multi-tenant scaling; peak season handling; cost optimization for SME price point; fault tolerance and graceful degradation | Can they reason about cost-per-tenant economics? Do they understand multi-tenant noisy neighbor problems? Can they design graceful degradation? |
| **5. Summary & Extensions** | 42–45 min | Recap key decisions; discuss what they'd do differently with more time; mention extensions (ML model governance, predictive supplier management) | Can they self-critique their design? Do they identify the most impactful improvements? |

---

## Phase 1: Problem Scoping — Key Clarification Questions

### Questions the Candidate Should Ask

| Question | Why It Matters | Strong Answer Reveals |
|---|---|---|
| "How many SKUs does a typical SME have? What's the range?" | SKU count determines forecasting compute budget, data model design, and UI complexity | Understanding that 200–5,000 SKUs is a different world from 100K+ enterprise SKUs; sparse data implications |
| "How many channels does a typical merchant sell on?" | Determines sync complexity, overselling risk, and channel adapter design | Recognition that 3–5 channels is typical; each has different API characteristics |
| "What percentage of products are perishable?" | Determines if FEFO and batch management is a first-class concern or edge case | Understanding that 35% perishable fundamentally changes the optimization objective |
| "How much sales history is typically available?" | Determines feasibility of classical time-series methods vs. need for sparse-data techniques | Recognition that 6–12 months of noisy data requires different approaches than 5+ years of clean data |
| "What's the technical sophistication of the user?" | Determines UI/UX complexity budget; whether statistical concepts can be exposed directly | Understanding that "shopkeeper" ≠ "demand planner"; recommendations must be actionable without statistical training |
| "What's the cost target per tenant per month?" | Determines infrastructure budget and architectural decisions (shared vs. dedicated) | Recognition that $20–100/month means aggressive multi-tenancy and compute efficiency |

### Red Flags in Scoping

| Red Flag | What It Indicates |
|---|---|
| Immediately starts designing without asking about SME constraints | Candidate may default to enterprise patterns that don't fit |
| Asks only about scale numbers, not about data quality/sparsity | Misses the core ML challenge (sparse data forecasting) |
| Doesn't ask about perishable goods | Misses a critical requirement that changes the optimization fundamentally |
| Assumes strong technical users | Will design overly complex UI; won't consider natural language insights |
| Treats all channels as identical | Misses the heterogeneous consistency challenge |

---

## Phase 2: High-Level Design — Expected Components

### Minimum Viable Architecture (Strong Candidate)

A strong candidate should identify these components within 10 minutes:

| Component | Purpose | Key Design Point |
|---|---|---|
| **Channel Ingestion Layer** | Receive sales events from multiple channels | Webhook-first with polling fallback; deduplication |
| **Unified Inventory Engine** | Single source of truth for stock levels | Real-time; per-SKU-location; handles concurrent mutations |
| **Demand Forecasting Engine** | Predict future demand | Must handle sparse/intermittent data; batch processing |
| **Reorder Optimization** | When and how much to order | Safety stock + reorder point + order quantity; accounts for uncertainty |
| **Channel Sync Bus** | Push inventory changes to all channels | Priority-ordered; rate-limit-aware; oversell protection |
| **Batch/Expiry Manager** | Track batches and enforce FEFO | Optional but expected for perishable discussion |
| **Merchant Interface** | Dashboard + alerts | Natural language insights; actionable recommendations |

### Distinguishing Strong vs. Exceptional Candidates

| Aspect | Strong | Exceptional |
|---|---|---|
| **Forecasting** | Mentions need for multiple models for different demand patterns | Explains why Croston/SBA needed for intermittent demand; describes hierarchical Bayesian for cold-start; discusses model selection per SKU |
| **Sync** | Identifies need for real-time sync with overselling protection | Designs safety buffer strategy based on channel sync latency; identifies reconciliation as separate concern; discusses ATP calculation |
| **Reorder** | Mentions safety stock and reorder point | Explains convolution of demand distribution and lead time distribution for safety stock; discusses EOQ trade-offs; mentions shelf-life constraint for perishable |
| **Multi-tenancy** | Mentions shared infrastructure | Designs tenant isolation at every layer; discusses noisy neighbor prevention; computes cost-per-tenant |
| **Data model** | SKU + quantity per location | Unified inventory position with on-hand/allocated/committed/in-transit/available decomposition; batch-level tracking for perishable |

---

## Phase 3: Deep Dive — Common Topics

### Deep Dive A: Demand Forecasting for Sparse Data

**Interviewer prompt**: "Let's say 40% of SKUs sell fewer than 5 units per week. How would you forecast demand for these items?"

**Expected progression**:

| Level | Response | Score |
|---|---|---|
| **Basic** | "Use moving average or ARIMA" | Weak — doesn't understand why these fail for intermittent demand |
| **Good** | "Intermittent demand needs special methods like Croston's; separate demand size and inter-arrival time" | Solid understanding of the problem |
| **Strong** | "Classify demand patterns (smooth/erratic/intermittent/lumpy) and route to appropriate model; use ADI and CV² for classification" | Demonstrates knowledge of the demand classification framework |
| **Exceptional** | "Use hierarchical Bayesian models to borrow strength from category-level data for sparse SKUs; Bayesian posterior update as data arrives; transfer learning for cold-start" | Deep understanding of probabilistic forecasting and cold-start resolution |

**Follow-up**: "How do you generate a probability distribution, not just a point forecast, for safety stock calculation?"

| Level | Response |
|---|---|
| **Good** | "Use mean and standard deviation to assume a normal distribution" |
| **Strong** | "Intermittent demand is not normal; use compound Poisson-gamma or zero-inflated distributions; output P5/P25/P50/P75/P95 percentiles" |
| **Exceptional** | "Generate full distribution via simulation or parametric fit; use quantile regression or conformal prediction for distribution-free intervals; validate calibration by checking P5-P95 coverage rate" |

### Deep Dive B: Multi-Channel Inventory Sync

**Interviewer prompt**: "A merchant sells the same product on 4 channels. A customer on Channel A buys the last unit. How do you prevent overselling on Channels B, C, and D?"

**Expected progression**:

| Level | Response | Score |
|---|---|---|
| **Basic** | "Update all channels immediately when a sale happens" | Naive — ignores API latency and rate limits |
| **Good** | "Use webhooks for real-time updates; accept eventual consistency; handle oversells via backorder/cancellation" | Acknowledges the problem but doesn't solve it |
| **Strong** | "Reserve safety buffers per channel based on sync latency; publish available - buffer to each channel; last-unit scenarios handled by reducing published quantity to 0 on all channels when stock is low" | Practical solution with clear trade-offs |
| **Exceptional** | "Model oversell probability as P = 1 - e^(-λ × t_sync); compute channel-specific safety buffers from demand rate and sync latency; prioritize sync to highest-velocity channels; reconciliation sweeps to correct drift; dynamic buffer adjustment during peak periods" | Quantitative approach with full solution |

**Follow-up**: "What happens when a channel's API goes down for 30 minutes during a sale? Channel has stale quantities."

| Level | Response |
|---|---|
| **Good** | "Queue updates and apply when API recovers" |
| **Strong** | "Circuit breaker pattern; when channel recovers, do full reconciliation before normal sync resumes; consider temporarily pausing listings on that channel if stock is low" |
| **Exceptional** | "Estimate drift during outage: expected_oversells = λ_channel × outage_duration × P(last_unit); if expected_oversells > threshold, proactively reduce quantity on other channels to compensate; on recovery, reconcile and process any missed orders from the channel's order history API" |

### Deep Dive C: Perishable Inventory and FEFO

**Interviewer prompt**: "A grocery SME has products with 14-day shelf life. How does this change your inventory optimization?"

**Expected progression**:

| Level | Response | Score |
|---|---|---|
| **Basic** | "Track expiry dates and alert before expiry" | Necessary but insufficient |
| **Good** | "FEFO allocation for outbound orders; cap order quantities based on shelf life vs. expected sell-through" | Good operational awareness |
| **Strong** | "Joint optimization of order quantity and markdown timing; waste cost as a first-class objective alongside stockout cost; shelf-life-aware safety stock (cap safety stock so total stock ≤ shelf-life demand)" | Understands the optimization trade-off |
| **Exceptional** | "Simulation-based joint optimization of (order_quantity, markdown_timing, markdown_depth); model the interaction between markdown pricing and demand acceleration; compute expected waste rate per policy; account for the decreasing marginal value of inventory as it approaches expiry" | Full understanding of the perishable inventory problem |

### Deep Dive D: Cold-Start SKU Forecasting

**Interviewer prompt**: "A merchant adds a new product they've never sold before. How do you forecast its demand?"

| Level | Response | Score |
|---|---|---|
| **Basic** | "Wait for 4 weeks of data, then start forecasting" | Unacceptable — merchant flies blind for a month |
| **Good** | "Use category average as starting point" | Better, but ignores SKU-specific attributes (price, brand) |
| **Strong** | "Find analogous SKUs by category, price, brand; use their demand as a prior; update with Bayesian posterior as actual sales arrive" | Solid transfer learning approach |
| **Exceptional** | "Multi-attribute similarity matching with weighted dimensions (category > price > brand); Bayesian conjugate update for fast convergence; inflate uncertainty for transfer forecasts (wider safety stock); track convergence and graduate to standard pipeline when accuracy meets threshold" | Full cold-start resolution pipeline |

---

## Common Trap Questions and Answers

### Trap 1: "Why not use a single model for all SKUs?"

**The trap**: Candidate might agree that one powerful model (e.g., Prophet, DeepAR) handles everything.

**Good answer**: "Different demand patterns require fundamentally different modeling approaches. A smooth-demand SKU selling 50/day benefits from exponential smoothing. An intermittent SKU selling 3 units in random bursts per week needs Croston's method that separates demand size from inter-arrival time. A single model either overfits to the dominant pattern (smooth) and fails on intermittent, or averages across patterns and performs mediocrely on all. The overhead of maintaining 4-5 model families is justified by the accuracy gain."

### Trap 2: "Can't you achieve real-time consistency across all channels?"

**The trap**: Candidate might try to design a distributed transaction across channel APIs.

**Good answer**: "No. We don't control the channel APIs, and they have no distributed transaction support. Each channel is an independent system with different latency, rate limits, and consistency guarantees. The best we can achieve is eventual consistency with bounded divergence, using safety buffers to absorb the consistency window. Attempting strong consistency would require locking inventory during sync (blocking all sales for 5–30 seconds per mutation), which is unacceptable for business operations."

### Trap 3: "Why not just set safety stock to 2 weeks for everything?"

**The trap**: Over-simplified safety stock that ignores demand variability, lead time uncertainty, and SKU importance.

**Good answer**: "A flat 2-week buffer dramatically over-stocks C-class items (tying up cash in slow-moving inventory) while under-protecting A-class hero products (where a stockout costs 15% of weekly revenue). Safety stock must be computed per SKU considering: (1) demand variability (high CV needs more buffer), (2) lead time variability (unreliable supplier needs more buffer), (3) service level target (99% for hero products, 90% for long-tail), and (4) shelf life (can't buffer 2 weeks of a product with 14-day shelf life). The compute cost of per-SKU optimization is trivial compared to the inventory cost savings."

### Trap 4: "Why not sync inventory every second to prevent overselling?"

**The trap**: Candidate might not consider API rate limits and cost.

**Good answer**: "At 5,000 SKUs × 5 channels = 25,000 sync calls per second per tenant, times 100K tenants = 2.5 billion API calls per second. This far exceeds any channel's rate limits and would be prohibitively expensive. Instead, sync is event-driven: only update when inventory actually changes. For a tenant with 500 orders/day across 5 channels, that's ~2,500 sync calls/day—five orders of magnitude less than polling every second. The event-driven approach achieves sub-10-second sync latency for 99% of events while staying well within rate limits."

### Trap 5: "Can you just use the marketplace's built-in inventory management?"

**The trap**: Candidate might not explain why a unified platform is needed.

**Good answer**: "Marketplace inventory management is siloed—it tracks stock for that marketplace only. An SME selling on 4 channels needs a unified view: if they have 100 units and sell 3 on one channel, all channels need to reflect 97. No marketplace provides cross-channel sync. Additionally, marketplace tools don't offer: probabilistic forecasting (they provide basic analytics at best), cross-channel reorder optimization, FEFO batch management, or supplier lead time intelligence. The unified platform is the coordination layer that no individual channel provides."

### Trap 6: "How do you handle a SKU that sells 0 units most days?"

**The trap**: Testing understanding of intermittent demand vs. dead stock.

**Good answer**: "First, distinguish between dead stock (zero sales because nobody wants it) and intermittent demand (zero most days but occasional large orders from B2B customers or seasonal spikes). Dead stock (0 sales in 90+ days) should be flagged for review, not forecast. Intermittent demand requires Croston-family methods that model the inter-arrival time separately from order size. The forecast output is a probability distribution: P(0 units) = 0.7, P(3 units) = 0.2, P(5 units) = 0.1 on any given day. Safety stock for such items is computed from the compound demand distribution over the lead time period, not from a simple normal approximation."

---

## Scoring Rubric

### Dimension Scoring (1–5 scale)

| Dimension | 1 (Weak) | 3 (Competent) | 5 (Exceptional) |
|---|---|---|---|
| **Problem Understanding** | Treats as generic inventory system; misses SME constraints | Identifies SME data sparsity and cost constraints; scopes appropriately | Articulates the sparse data paradox, multi-channel consistency challenge, and perishable optimization problem; asks incisive clarifying questions |
| **Architecture** | Monolithic design or enterprise-centric with no multi-tenancy | Clean microservice decomposition; event-driven; addresses multi-tenancy | Sophisticated component design with clear data flow; identifies hot paths; designs for graceful degradation; computes cost-per-tenant |
| **Forecasting Depth** | "Use ARIMA/Prophet for everything" | Recognizes intermittent demand needs different models; mentions Croston | Explains probabilistic forecasting pipeline with model selection; hierarchical Bayesian for sparse data; cold-start transfer learning; forecast accuracy monitoring |
| **Distributed Systems** | Assumes instant sync across channels | Identifies eventual consistency and overselling risk; mentions reconciliation | Quantitative overselling analysis; safety buffer strategy; circuit breaker for channel outages; prioritized sync; reconciliation workflow |
| **Data Modeling** | Simple SKU-quantity table | Inventory position with on-hand/allocated/available decomposition | Full position model with channel allocation, batch tracking, version control, and causal ordering; unified product catalog with channel and supplier mappings |
| **Trade-off Analysis** | Makes decisions without discussing alternatives | Discusses 2-3 key trade-offs with reasoning | Systematic trade-off analysis: consistency vs. availability in sync, accuracy vs. compute cost in forecasting, safety stock vs. cash flow, batch vs. streaming for forecasts |
| **Operational Maturity** | No mention of monitoring or failure modes | Mentions basic monitoring and alerting | Defines specific forecast accuracy metrics (WAPE, bias, coverage); sync health SLOs; graceful degradation hierarchy; recovery procedures |

### Overall Score Translation

| Total Score (7 dimensions) | Assessment | Recommendation |
|---|---|---|
| **7–14** | Does not meet bar | No hire — fundamental gaps in distributed systems or ML understanding |
| **15–21** | Meets bar with concerns | Weak hire — can improve with mentorship; acceptable for senior SDE |
| **22–28** | Meets bar solidly | Hire — demonstrates strong senior/staff-level design capabilities |
| **29–35** | Exceeds bar | Strong hire — exceptional depth across architecture, ML, and distributed systems |

---

## Trade-off Discussion Topics

### 1. Forecasting Accuracy vs. Compute Cost

| Option | Pro | Con | When to Choose |
|---|---|---|---|
| **Simple models (ETS, moving average)** | Fast, cheap, low memory | Poor on intermittent/sparse data; no external signal support | C-class items; micro-tier tenants; non-seasonal stable items |
| **Full ensemble with model selection** | Best accuracy across demand patterns | 4x compute cost; more complex to operate | A/B-class items; medium/large tenants |
| **Deep learning (DeepAR, temporal fusion transformers)** | Can capture complex cross-SKU patterns | 10–50x compute cost; requires GPU; hard to explain; overkill for most SME data volumes | Only if demonstrably better on holdout; only for large tenants with 10K+ SKUs and 2+ years of data |

### 2. Channel Sync Latency vs. Cost

| Option | Sync Latency | Cost per Event | Oversell Risk |
|---|---|---|---|
| **Poll every 5 minutes** | 0–5 minutes | Low | High (proportional to demand × 5 min) |
| **Event-driven webhook** | 1–10 seconds | Medium | Low (proportional to demand × 10 sec) |
| **Event-driven + safety buffer** | 1–10 seconds effective | Medium + holding cost of buffer | Very low |
| **Real-time with reservation API** | < 1 second | High (2 API calls per order) | Near zero |

### 3. Safety Stock: Service Level vs. Cash Flow

| Service Level | Safety Stock (relative) | Stockout Risk | Cash Tied Up | Best For |
|---|---|---|---|---|
| 90% | 1.0x | 10% per cycle | Low | C-class long-tail; items with many substitutes |
| 95% | 1.3x | 5% per cycle | Medium | B-class items; moderate revenue impact |
| 99% | 1.8x | 1% per cycle | High | A-class hero products; no substitutes; high churn risk |
| 99.5% | 2.2x | 0.5% per cycle | Very high | Critical items (pharma, safety equipment) |

### 4. Multi-Tenancy: Shared vs. Dedicated

| Aspect | Fully Shared | Shared Compute + Dedicated DB | Fully Dedicated |
|---|---|---|---|
| Cost per tenant | $2–5/month | $20–50/month | $200+/month |
| Data isolation | Logical (tenant_id) | Physical DB | Physical everything |
| Noisy neighbor risk | High (mitigated by rate limiting) | Low for data; moderate for compute | None |
| Customization | None — one-size-fits-all | DB-level configurations | Full customization |
| Target segment | Micro SMEs (< 200 SKUs) | Small-medium SMEs | Large SMEs or compliance-heavy |

### 5. Forecast Freshness vs. Stability

| Approach | Freshness | Stability | Cost |
|---|---|---|---|
| **Daily batch forecast** | 24-hour lag | High (merchants see consistent numbers) | Low (batch processing) |
| **Intra-day refresh on anomaly** | Minutes for anomalous SKUs; 24h for others | Medium (occasional mid-day changes) | Moderate (targeted recomputation) |
| **Streaming forecast (every hour)** | 1-hour lag | Low (forecasts change frequently; merchants confused) | High (24x compute) |
| **Hybrid: daily batch + event-triggered refresh** | Seconds for major events; 24h otherwise | High for normal; responsive for spikes | Moderate (batch + rare real-time) |
