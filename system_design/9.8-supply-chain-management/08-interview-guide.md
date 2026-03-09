# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | What to Demonstrate |
|------|-------|-------|---------------------|
| 0--5 min | **Clarify** | Ask questions, scope the problem | Understanding of supply chain domain; distinguish SCM from inventory management, procurement, or logistics alone |
| 5--15 min | **High-Level** | Core components, data flow, key decisions | Three-plane architecture (planning, execution, visibility); event-driven backbone; demand forecasting driving all downstream decisions |
| 15--30 min | **Deep Dive** | 1--2 critical components in detail | Demand forecasting engine OR inventory allocation under contention OR order routing optimization OR bullwhip effect mitigation---choose based on interviewer cues |
| 30--40 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios, consistency | IoT ingestion at scale, hot-SKU contention, real-time vs. batch planning trade-offs, multi-region supply chain coordination |
| 40--45 min | **Wrap Up** | Summary, handle follow-ups | Tie back to business impact: service levels, inventory costs, transportation efficiency, disruption resilience |

---

## Meta-Commentary: How to Approach This Problem

### What Makes This System Unique/Challenging

1. **It spans the physical and digital worlds**. Unlike pure software systems (chat, payments, social media), SCM must model physical constraints: goods have weight and volume, trucks have capacity limits, warehouses have throughput ceilings, ports have congestion. The system cannot retry a failed delivery like it retries a failed API call. Physical-world latency (transit time) dominates system latency (milliseconds).

2. **Forecasting is the foundation, not a nice-to-have**. Every candidate should recognize that demand forecasting drives all planning decisions. A system that executes perfectly but forecasts poorly will have excess inventory, stockouts, and wasted transportation capacity. Spend time on how forecasting works, how accuracy is measured, and how forecast errors cascade through the system.

3. **Multi-objective optimization is the core challenge**. The system must simultaneously minimize cost, maximize service level, balance workloads, and manage risk. These objectives conflict. The interesting design decisions are about how to manage these trade-offs: Pareto frontiers, configurable weights, and tiered optimization strategies (real-time heuristic vs. batch optimal).

4. **The bullwhip effect is an architectural problem, not just a business problem**. Systems that batch information, delay signal propagation, or optimize locally (per tier) amplify demand variability upstream. The architecture must enable real-time demand signal sharing, collaborative planning, and information transparency across supply chain tiers.

5. **IoT integration creates a unique data engineering challenge**. Ingesting 5B events/day from sensors, GPS, and RFID scanners requires a fundamentally different data pipeline than transactional order processing. The candidate should discuss tiered storage, stream processing, and how physical-world signals (temperature excursion, GPS deviation) trigger business logic (exception alerts, re-routing).

### Where to Spend Most Time

- **If interviewer is interested in ML/data**: Deep dive into demand forecasting---model selection, backtesting, the global-local training architecture, demand sensing, and forecast accuracy measurement.
- **If interviewer is interested in distributed systems**: Deep dive into inventory allocation---hot-SKU contention, optimistic vs. pessimistic locking, the write-ahead allocation log pattern, and ATP cache consistency.
- **If interviewer is interested in optimization**: Deep dive into order routing and the vehicle routing problem---the three-tier optimization strategy, construction heuristics vs. local search, and the real-time/batch trade-off.
- **If interviewer asks about resilience**: Deep dive into the control tower---exception detection, cross-domain event correlation, automated response orchestration, and the cascading impact analysis pattern.
- **If interviewer asks about scale**: Focus on IoT ingestion, event streaming architecture, and tiered storage strategies.

---

## Clarifying Questions to Ask

### Scope Questions

| Question | Why It Matters | Expected Answer |
|----------|---------------|-----------------|
| "What type of supply chain? Manufacturing, retail distribution, or e-commerce fulfillment?" | Manufacturing SCM emphasizes production planning (MRP); retail emphasizes distribution (DRP); e-commerce emphasizes speed and last-mile | Usually broad---design for a platform that supports multiple supply chain types |
| "What's the scale? Single-region or global multi-region?" | Global supply chains add cross-border compliance, multi-modal transport, and multi-timezone coordination | Global makes it more interesting and architecturally challenging |
| "Is demand forecasting in scope, or do we receive forecasts from an external system?" | If in scope, it is a major component (ML models, training pipelines, accuracy tracking) | Usually in scope---it is the most technically interesting part |
| "Do we need real-time tracking with IoT sensors, or just carrier-provided milestone updates?" | IoT adds a massive data pipeline (billions of events) vs. simple polling of carrier APIs | IoT makes it more interesting; carrier-only is simpler |
| "Is reverse logistics (returns) in scope?" | Returns require a parallel but inverted supply chain with different workflows | Usually in scope; it differentiates a thorough answer |
| "Multi-tenant SaaS or single-enterprise deployment?" | Multi-tenant adds isolation, noisy neighbor, and per-tenant configuration complexity | Multi-tenant SaaS is more architecturally interesting |

### Non-Functional Questions

| Question | Why It Matters |
|----------|---------------|
| "What's the consistency requirement for inventory allocation?" | Determines locking strategy: strong consistency (pessimistic locks) vs. optimistic concurrency |
| "What's the acceptable staleness for the control tower dashboard?" | Determines whether real-time streaming or periodic polling is needed |
| "What forecast accuracy is considered acceptable?" | Calibrates how much engineering investment in ML models is justified |
| "What's the data retention requirement for tracking events and IoT data?" | Drives the tiered storage architecture and total storage cost |

---

## Common Mistakes to Avoid

### Mistake 1: Treating SCM as Just an Order Pipeline

**What happens**: The candidate designs a simple order → warehouse → ship pipeline without addressing planning, forecasting, or network optimization.

**Why it's wrong**: The order pipeline is execution; the hard problems in SCM are in planning (what to stock where, how much to make, which carriers to use). A system that executes perfectly against a bad plan still fails. The planning layer (demand forecasting, supply planning, inventory optimization) drives all execution decisions.

**Better approach**: Start with demand forecasting as the foundation, show how it drives supply planning, then design the execution layer that carries out the plan.

### Mistake 2: Ignoring the Multi-Tier Nature of Supply Chains

**What happens**: The candidate designs a single-company system without considering supplier, carrier, and customer integration.

**Why it's wrong**: Supply chains are networks, not pipelines. The system must integrate with hundreds of external partners via EDI, APIs, and IoT. The bullwhip effect is a multi-tier problem that cannot be solved within a single organization.

**Better approach**: Discuss the partner integration layer early. Show how demand signals flow upstream to suppliers and how supply signals flow downstream to customers.

### Mistake 3: Using Eventual Consistency for Inventory Allocation

**What happens**: The candidate proposes an eventually consistent inventory service for "better scalability."

**Why it's wrong**: Inventory allocation is a physical-world constraint. If you allocate 10 units to two orders (20 total) because of stale data, you cannot ship what you don't have. This creates cancelled orders, customer service escalations, and broken SLAs.

**Better approach**: Use strong consistency (pessimistic or optimistic locking) for allocation, and eventual consistency for everything else (dashboards, analytics, forecasts). Explain the hot-SKU contention mitigation strategies for scale.

### Mistake 4: Treating IoT Data the Same as Transactional Data

**What happens**: The candidate stores IoT sensor readings (5B/day) in the same relational database as orders.

**Why it's wrong**: IoT data has a fundamentally different access pattern (append-only, time-ordered, aggregation-heavy) and volume (1000x transactional data). Storing it in a relational DB would overwhelm the database and is cost-prohibitive.

**Better approach**: Tiered storage: hot (in-memory, 24h), warm (time-series DB, 90 days), cold (object storage, years). Stream processing for real-time alerting. Only aggregated/sampled data feeds into the transactional system.

---

## Trade-offs Discussion

### Trade-off 1: Statistical vs. ML Forecasting Models

| Dimension | Statistical (ARIMA, Holt-Winters) | ML (DeepAR, LightGBM, Prophet) |
|-----------|----------------------------------|-------------------------------|
| **Accuracy** | Good for stable, regular demand patterns | Better for complex patterns with external factors |
| **Interpretability** | High---analysts can understand and adjust | Low---black-box predictions |
| **Compute cost** | Low---trains in seconds per model | High---requires GPU for training, more data |
| **Cold start** | Needs 2+ years of history | Can leverage cross-SKU patterns (transfer learning) |
| **Maintenance** | Low---well-understood algorithms | High---model drift, retraining pipelines, feature engineering |

**This system's choice**: Ensemble approach. Statistical models as baseline for all SKUs; ML models for high-value/complex-pattern SKUs where the accuracy improvement justifies the compute cost. Automatic model selection via backtesting.

### Trade-off 2: Real-Time Allocation vs. Batch Allocation

| Dimension | Real-Time (per-order) | Batch (periodic wave) |
|-----------|----------------------|-----------------------|
| **Latency** | Immediate confirmation to customer | Delayed confirmation (minutes to hours) |
| **Optimality** | Greedy---routes each order independently | Can optimize across orders (consolidation, workload balance) |
| **Contention** | High for popular items (row-level locks) | Low---single process allocates batch |
| **Customer experience** | Better---instant promise date | Worse---delayed confirmation |
| **Throughput** | Limited by lock contention | Higher aggregate throughput |

**This system's choice**: Real-time for B2C (customer expects instant confirmation); batch for B2B replenishment (bulk orders benefit from cross-order optimization). Periodic re-optimization of real-time allocations to improve routing.

### Trade-off 3: Centralized vs. Decentralized Inventory

| Dimension | Centralized (few large DCs) | Decentralized (many small nodes) |
|-----------|---------------------------|----------------------------------|
| **Inventory cost** | Lower---risk pooling reduces safety stock | Higher---each node needs its own safety stock |
| **Transportation cost** | Higher---longer average distance to customer | Lower---closer to demand |
| **Delivery speed** | Slower---longer transit times | Faster---same-day/next-day possible |
| **Complexity** | Lower---fewer nodes to manage | Higher---distributed inventory, allocation complexity |
| **Demand variability** | Absorbed by aggregation (central limit theorem) | Amplified at each small node |

**This system's choice**: Multi-echelon---strategic positioning based on product characteristics. Fast-moving items forward-deployed near demand; long-tail items centralized. Safety stock optimization per SKU-location based on demand variability and service level targets.

### Trade-off 4: Push vs. Pull Replenishment

| Dimension | Push (forecast-driven) | Pull (demand-driven) |
|-----------|----------------------|---------------------|
| **Inventory risk** | Higher---stocking based on forecast (which may be wrong) | Lower---only replenish what was consumed |
| **Service level** | Potentially higher for predictable demand | Can miss demand spikes (response lag) |
| **Suitable for** | Seasonal items, promotional items, long-lead-time items | Stable-demand items, short-lead-time items |
| **Bullwhip effect** | Can amplify if forecast is noisy | Naturally dampens (based on actual consumption) |

**This system's choice**: Hybrid. Push for seasonal/promotional items and long-lead-time goods; pull (Kanban-style) for stable-demand, short-lead-time items. The system automatically classifies each SKU's replenishment strategy based on demand pattern and lead time.

---

## Trap Questions and Strong Answers

### Trap 1: "Can you just use a single database for everything?"

**Why it's a trap**: Tests whether you understand the polyglot persistence need in SCM.

**Weak answer**: "Yes, a relational database can handle all our needs."

**Strong answer**: "No. SCM has fundamentally different data profiles that require different storage engines. Orders and inventory need relational DB with ACID for allocation correctness. Tracking events are time-series data (billions of append-only records)---a time-series DB with automatic time-partitioning and downsampling. IoT sensor data needs high-write-throughput append-only storage with aggressive TTL. Demand forecasts and analytics need a columnar store optimized for aggregation queries. Supply network topology (multi-tier supplier relationships) benefits from a graph database. Using a single DB would force trade-offs that cripple one or more critical workloads."

### Trap 2: "Why not just use real-time optimization for everything?"

**Why it's a trap**: Tests understanding of computational complexity and the real-time vs. quality trade-off.

**Weak answer**: "We should optimize everything in real time for the best results."

**Strong answer**: "Full optimization for route planning and multi-order allocation is NP-hard---solving it optimally for thousands of orders across dozens of warehouses could take hours. Instead, we use a three-tier strategy: real-time heuristics (< 200ms per order, greedy scoring), near-real-time batch re-optimization (every 15 minutes, constraint satisfaction), and overnight full MIP optimization (8-hour window, globally optimal). The real-time heuristic is 3--5% worse than optimal, which is an acceptable trade-off for instant customer confirmation. The periodic re-optimization catches the worst sub-optimal assignments."

### Trap 3: "How do you handle a flash sale with 10x normal order volume?"

**Why it's a trap**: Tests whether you can think about the system holistically under stress.

**Strong answer**: "First, the inventory problem: we pre-allocate reservation pools for the promoted SKUs before the sale, splitting inventory into per-channel pools to reduce contention. Second, the forecasting problem: the demand sensing layer detects the volume surge within minutes and adjusts short-term forecasts (sensing multiplier). Third, the fulfillment problem: we pre-warm additional WMS capacity and pre-schedule carrier pickups. Fourth, the allocation problem: for the hot-SKU, we switch from row-level locking to optimistic concurrency with retries, or use the write-ahead allocation log pattern. Fifth, the monitoring problem: the control tower monitors inventory burn rate and triggers replenishment orders to suppliers when projected stockout date drops below threshold."

### Trap 4: "Can you prevent the bullwhip effect with better forecasting?"

**Why it's a trap**: Tests understanding that the bullwhip effect has structural/architectural causes, not just forecasting causes.

**Strong answer**: "Better forecasting helps but doesn't solve the problem. The bullwhip has four structural causes that are independent of forecast quality: (1) order batching---where retailers accumulate orders and place bulk orders periodically, amplifying signal; (2) shortage gaming---where retailers over-order when they sense upcoming shortages; (3) promotion-driven forward buying---where retailers stock up during promotions; and (4) forecast updating---where each tier re-forecasts based on the orders it receives rather than end-customer demand. The architectural solutions are: real-time demand signal sharing (share POS data, not just orders), Vendor Managed Inventory (supplier sees actual consumption), order smoothing algorithms (dampen order amplification), and collaborative forecasting (CPFR). The system must be designed to propagate demand information transparently across tiers."

---

## Scoring Rubric

| Dimension | Junior (1-2) | Mid (3) | Senior (4) | Staff+ (5) |
|-----------|-------------|---------|------------|------------|
| **Domain Understanding** | Knows order → ship flow | Understands full SCM lifecycle including planning | Articulates demand forecasting as the foundation; understands bullwhip effect | Discusses multi-echelon optimization, CPFR, digital twin, and supply chain resilience as architectural concerns |
| **Architecture** | Monolithic or simple microservices | Event-driven microservices with domain boundaries | Three-plane architecture; CQRS for order management; streaming for IoT | Separate compute planes for planning/execution/visibility; ML-specific infrastructure; global-local forecast architecture |
| **Data Model** | Basic order and shipment tables | Inventory position with allocation tracking; shipment tracking events | Multi-echelon inventory model; demand forecast versioning; BOM explosion | Temporal inventory (ATP with time-phased supply/demand netting); graph model for supply network; ML feature store |
| **Algorithm Knowledge** | FIFO allocation, simple routing | ATP calculation; nearest-warehouse routing | Demand pattern classification; safety stock formula; VRP heuristics | Ensemble forecasting with backtesting; multi-objective optimization; order smoothing for bullwhip mitigation |
| **Scale Awareness** | Single database, single region | Read replicas, caching for ATP | IoT tiered storage; tenant-based sharding; solver pool scaling | Multi-region with regional autonomy; event sourcing for supply chain replay; predictive capacity scaling for seasonal spikes |
| **Trade-off Quality** | Binary choices without nuance | Recognizes trade-offs, picks reasonable defaults | Articulates Pareto trade-offs; explains when each option wins | Proposes hybrid strategies with automatic selection criteria; quantifies trade-off costs (3--5% suboptimality for 100x latency improvement) |

---

## Sample Follow-Up Questions

| Question | What It Tests | Key Points to Hit |
|----------|-------------|-------------------|
| "How would you add support for cold chain monitoring?" | IoT integration, exception-based alerting | Continuous temperature logging via IoT sensors; threshold-based alerts; automated disposition decisions; regulatory compliance (FDA) |
| "A major supplier just went offline. How does the system respond?" | Disruption management, control tower capability | Control tower detects (supplier feed stops / news API); impact assessment (which POs, which inventory, which orders); automated re-sourcing from alternate suppliers; customer notification for affected orders |
| "How do you migrate from weekly batch planning to continuous planning?" | Incremental architecture evolution | Start with demand sensing (adjust between cycles); then move to event-driven re-planning (re-plan on inventory change events); finally continuous optimization with event-driven triggers. Key challenge: avoid plan instability (nervousness) |
| "How do you measure ROI of the demand forecasting engine?" | Business impact quantification | Compare forecast-driven inventory levels to a naive baseline (reorder-point only); measure inventory $ reduction, stockout % improvement, and obsolescence $ reduction. Typical result: 15--25% inventory reduction at same or better service level |
| "How would you design the system to support a digital twin of the supply chain?" | Advanced architecture thinking | Read model of the entire supply chain state (inventory, in-transit, orders, capacity); simulation engine that replays scenarios against this state; integration with control tower for what-if analysis; separate compute environment to avoid impacting production |
| "How do you handle a supplier who consistently ships late?" | Supplier management and automated response | Supplier scoring based on on-time delivery history; automatic safety stock increase for unreliable suppliers; alert procurement to renegotiate or find alternates; automated lead-time adjustment in planning |
| "What happens when two warehouses both have partial inventory for an order?" | Split shipment and allocation strategy | Score candidates: single-source preferred (lower shipping cost); split only if no single source can fill; consider customer preference and SLA; consolidation point if geographically viable |

---

## Architecture Diagrams to Draw

### Essential Diagrams (Must-Draw)

1. **End-to-end data flow**: Demand forecast → supply plan → order capture → allocation → fulfillment → shipping → delivery. Show the event stream connecting all components.

2. **Three-plane architecture**: Planning plane, execution plane, visibility plane with clear boundaries and interaction patterns.

3. **Inventory allocation flow**: Show the ATP check, allocation with locking, cache invalidation cycle.

### Bonus Diagrams (Draw if Time Permits)

4. **Demand forecasting pipeline**: Data ingestion → feature engineering → model selection → training → backtesting → inference serving.

5. **Control tower exception detection**: Multi-source event ingestion → CEP → correlation → impact assessment → recommendation → automated/manual response.

6. **IoT data pipeline**: Device → gateway → stream processor → tiered storage (hot/warm/cold).

---

## Key Numbers to Know

| Metric | Typical Value | Why It Matters |
|--------|--------------|----------------|
| Forecast accuracy (MAPE) for A-items | 15--25% | Calibrates expectations; sub-10% is unrealistic for most products |
| Inventory days of supply | 30--60 days typical | Shows understanding of inventory investment scale |
| Perfect order rate target | 90--95% | Demonstrates knowledge of industry benchmarks |
| Bullwhip amplification factor | 2x--10x per tier | Quantifies the severity of the information architecture problem |
| IoT data volume | ~200 bytes/event, millions/day per fleet | Demonstrates understanding of data scale |
| Route optimization quality gap | 3--5% heuristic vs. optimal | Justifies the three-tier optimization architecture |
| ATP cache hit rate target | > 95% | Shows importance of caching for inventory checks |
| Order-to-ship SLA | 2--4 hours for e-commerce | Anchors fulfillment latency expectations |
