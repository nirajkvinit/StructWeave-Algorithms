# 14.15 AI-Native Hyperlocal Logistics & Delivery Platform for SMEs — Interview Guide

## Interview Format: 45-Minute System Design

### Pacing Guide

| Phase | Time | Focus | Signals to Watch |
|---|---|---|---|
| **Problem Exploration** | 0-7 min | Clarify scope, identify core challenges, discuss use cases | Does the candidate recognize the real-time nature? Do they ask about SME-specific constraints (low delivery values, cost sensitivity)? |
| **High-Level Design** | 7-20 min | Architecture, major components, data flow | Do they separate real-time path from analytical path? Do they think about geo-partitioning early? |
| **Deep Dive** | 20-37 min | Matching algorithm, route optimization, ETA prediction (pick 1-2) | Can they articulate why greedy matching fails? Do they recognize the NP-hard nature of VRP? |
| **Scalability & Trade-offs** | 37-43 min | Location pipeline scale, batching trade-offs, failure modes | Do they consider the GPS update firehose? Can they reason about degradation modes? |
| **Wrap-up** | 43-45 min | Summary, open questions | Clean summary of key decisions and trade-offs |

---

## Opening Problem Statement

> "Design a hyperlocal logistics and delivery platform for small and medium businesses. An SME creates a delivery request, and the system matches it to a nearby rider who picks up the package and delivers it within a promised time window. The platform serves a large Indian metro city with 50,000 merchant partners and handles 500,000 deliveries per day."

### Clarifying Questions to Expect (and What Good Answers Look Like)

| Question | Why It's Good | Key Information to Share |
|---|---|---|
| "What's the delivery radius? Is this within a city or intercity?" | Shows understanding of hyperlocal scope | Within a city, 80% of deliveries < 7 km, max 30 km |
| "What types of packages? Food delivery or general logistics?" | Package type affects matching constraints | General packages: documents, parcels, boxes. Not food (no temperature constraint) |
| "What's the delivery time expectation? Same-day or under an hour?" | Time constraint drives architecture | Three tiers: express (30 min), standard (60 min), economy (2 hours) |
| "Do riders handle multiple deliveries at once?" | Batching is a core design challenge | Yes, up to 3-4 orders per trip when compatible |
| "What's the average delivery value?" | Economics drive system constraints | $2-5 per delivery; platform must be extremely cost-efficient |
| "Are riders employees or gig workers?" | Affects control model and compliance | Gig workers; platform cannot dictate routes, only incentivize |

---

## Phase 1: Problem Exploration (0-7 min)

### What Distinguishes Levels

| Level | Characteristics |
|---|---|
| **Junior** | Focuses on CRUD operations (create order, assign rider); treats it as a simple marketplace; doesn't consider real-time constraints |
| **Mid** | Identifies matching and routing as core problems; thinks about GPS tracking; may not consider batching or dynamic pricing |
| **Senior** | Immediately identifies: (1) real-time matching is the critical path, (2) batching economics are essential at low delivery values, (3) ETA is a promise management problem, (4) location data scale is non-trivial |
| **Staff** | All of the above plus: asks about demand forecasting and pre-positioning, recognizes the three-way tension (speed vs. cost vs. fairness in batching), identifies that geo-partitioning is the natural scaling boundary |

### Red Flags

- Treats it as a simple queue (FIFO dispatch to nearest rider)
- Ignores delivery economics ($3 delivery can't afford heavy compute)
- Assumes perfect GPS accuracy and instant rider response
- Designs for a single global database without geo-partitioning

---

## Phase 2: High-Level Design (7-20 min)

### Expected Components

A strong candidate should identify these components unprompted:

1. **Order Service**: Order creation, validation, state management
2. **Matching Engine**: Rider-order assignment (the brain)
3. **Route Optimizer**: Multi-stop route planning
4. **Tracking Engine**: Real-time position broadcasting
5. **Location Ingestion**: GPS stream processing
6. **Pricing Engine**: Dynamic pricing with surge
7. **ETA Engine**: Time-to-delivery prediction
8. **Demand Forecaster**: Predictive fleet management

### Probing Questions

**Q: "How does rider matching work?"**

| Response Quality | Answer |
|---|---|
| **Weak** | "Assign the closest rider" |
| **Acceptable** | "Score riders on distance, vehicle type, and availability; pick the highest score" |
| **Strong** | "Batch orders over a short window (e.g., 30 seconds), build a cost matrix with road-network distances and multi-objective scoring, solve bipartite assignment for global optimum; pre-compute shadow assignments for rejections" |
| **Exceptional** | All of the above plus discusses why batching window size is a latency-vs-quality trade-off, explains the cost matrix construction bottleneck (road-network queries dominate), and suggests contraction hierarchies for fast distance computation |

**Q: "How do you handle the GPS location data from thousands of riders?"**

| Response Quality | Answer |
|---|---|
| **Weak** | "Store in a database, query when needed" |
| **Acceptable** | "Use a time-series database; riders push location every few seconds" |
| **Strong** | "Stream processing pipeline: riders push every 3 seconds → ingestion gateway validates and deduplicates → fan-out to geospatial index (real-time) and time-series store (historical) → geofence evaluation for automatic status transitions" |
| **Exceptional** | Adds Kalman filtering for noise, map matching for road snapping, discusses at-most-once vs. at-least-once semantics for real-time vs. historical paths, mentions riders as traffic probes for speed estimation |

**Q: "What database do you use for tracking rider positions?"**

| Response Quality | Answer |
|---|---|
| **Weak** | "A relational database with lat/lng columns" |
| **Acceptable** | "A geospatial database with spatial indexes" |
| **Strong** | "An in-memory geospatial index (geohash-partitioned) for real-time queries—it must handle 5,000 writes/sec and 10,000 reads/sec with sub-millisecond latency; a separate time-series store for historical trails" |

---

## Phase 3: Deep Dive (20-37 min)

### Deep Dive Option A: Rider Matching

**Setup**: "Let's dive into the matching algorithm. You have 200 pending orders and 500 available riders. Walk me through how you assign riders to orders."

**Expected progression**:
1. Define the scoring function (what makes a good assignment?)
2. Recognize this is an assignment problem, not a search problem
3. Discuss batching vs. greedy dispatch trade-offs
4. Address the cost matrix construction bottleneck
5. Handle rejection and reassignment flow

**Follow-up trap**: "A rider is 500m from a pickup but has a low acceptance rate (40%). Another rider is 2 km away but has 95% acceptance rate. Who do you assign?"

**Strong answer**: "It depends on the overall batch context. If this is the only order in the zone, the high-acceptance rider reduces reassignment latency risk. If there are many orders, the nearby rider might be assigned even with lower acceptance because the shadow assignment covers the rejection case. The scoring function balances proximity and acceptance probability—you can tune the weights based on whether the system is currently supply-constrained (favor high acceptance) or supply-abundant (favor proximity)."

### Deep Dive Option B: Route Optimization

**Setup**: "A rider has 2 orders already (Order A pickup done, heading to Order A dropoff and Order B pickup). A new Order C arrives that could be batched. How do you decide whether to add it and where to insert it?"

**Expected progression**:
1. Define insertion feasibility (time windows, capacity)
2. Enumerate insertion positions (O(n²) for pickup+dropoff pair)
3. Compute insertion cost (detour + delay to existing orders)
4. Compare against assigning to fresh rider
5. Discuss re-optimization after insertion

**Follow-up trap**: "What if inserting Order C makes Order A's delivery 8 minutes late?"

**Strong answer**: "The insertion is infeasible if it violates Order A's time window. But 'late' depends on how much slack Order A has—if the customer-facing ETA was set at p85 and we're still within the distribution, the insertion might be feasible even though the expected delivery time increased. The system should check against the hard time window, not against the optimistic ETA."

### Deep Dive Option C: ETA Prediction

**Setup**: "How do you predict delivery time with ±4 minute accuracy?"

**Expected progression**:
1. Decompose into components: travel time, pickup dwell, dropoff dwell
2. Travel time: road network with real-time traffic
3. Recognize that fixed overhead (dwell time) dominates short distances
4. Discuss probabilistic vs. point estimates
5. ETA as a promise: asymmetric cost of early vs. late

**Follow-up trap**: "Your ETA model predicts 28 minutes. The actual delivery takes 35 minutes. How do you diagnose whether this is a model problem or an operational problem?"

**Strong answer**: "Break down the error by component. Compare predicted vs. actual travel time (if travel was accurate but dwell was wrong, the dwell model needs retraining, not the travel model). Check whether the error was rider-specific (this rider is consistently slower) or zone-specific (this zone always has longer pickups—maybe it's a commercial area with elevators). Also check if this was a batch delivery and the preceding stop's delay cascaded. The trace should have all these breakpoints."

---

## Trap Questions

### Trap 1: "Can you just use Haversine distance for matching?"

**What it tests**: Understanding of road-network vs. straight-line distance.

**Trap**: Haversine distance is fast but misleading. Two points 500m apart by Haversine might be 3 km by road (river between them, one-way streets, highway divider). Using Haversine for matching produces assignments where the rider cannot reach the pickup within the time window despite appearing "close."

**Good answer**: "Haversine is fine for candidate pruning (quick filter to eliminate definitely-too-far riders), but the actual scoring must use road-network distance. Pre-computed contraction hierarchies make road-network queries fast enough (< 1ms) for the scoring phase."

### Trap 2: "How does your system handle 500,000 orders per day?"

**What it tests**: Can the candidate distinguish between throughput and peak load?

**Trap**: 500K/day is ~6 orders/second average—trivial. But 20% of orders concentrate in the peak hour, creating 28 orders/second. And each order triggers 50+ matching evaluations, route optimization, and real-time tracking. The challenge is not the order rate but the cascade of computations per order.

**Good answer**: "500K/day average is not the challenge. Peak hour at 28 orders/second, with each triggering matching (50 candidate evaluations), route optimization (2-second solver), and 50,000 concurrent tracking sessions—that's the real load. I'd focus on the matching engine's batch-solve throughput and the location pipeline's sustained ingestion rate."

### Trap 3: "Why not just use a graph database for the delivery graph?"

**What it tests**: Understanding of update frequency vs. query patterns.

**Trap**: Graph databases are optimized for complex traversals on relatively static graphs. The delivery graph has 5,000 node position updates/second and every query needs a consistent snapshot. Traditional graph databases would collapse under this write pressure and cannot provide snapshot isolation at this frequency.

**Good answer**: "A graph database would struggle with the write throughput—5,000 position updates per second requiring index updates. The delivery graph is better modeled as an in-memory geospatial index with copy-on-write snapshots. Graph databases are useful for the road network (which changes slowly), not for the rider position overlay."

### Trap 4: "What if a rider's phone battery dies mid-delivery?"

**What it tests**: Resilience thinking for physical-world failures.

**Good answer**: "The system detects GPS silence after 30 seconds and shows 'last known position' to the tracking viewer. After 2 minutes, it alerts operations. The order is not automatically reassigned (the rider still has the package). Operations contacts the rider via phone call. If unreachable for 10 minutes, the order is flagged for manual intervention. Meanwhile, the customer is proactively notified of the tracking gap."

---

## Scoring Rubric

### Dimension Scores (1-5)

| Dimension | 1 (Weak) | 3 (Competent) | 5 (Exceptional) |
|---|---|---|---|
| **Problem Understanding** | Treats as simple CRUD marketplace | Identifies matching, routing, and tracking as core challenges | Articulates the three-way tension (speed/cost/fairness), recognizes SME economics constraints, asks about batching |
| **Architecture** | Monolithic design, single database | Microservices with clear separation; identifies geo-partitioning | Event-driven architecture with CQRS; separate real-time and analytical paths; geo-partitioned with within-city scaling strategy |
| **Algorithm Design** | Greedy nearest-rider matching | Multi-objective scoring with reasonable factors | Batch matching with bipartite optimization; discusses cost matrix construction, contraction hierarchies, and shadow assignments |
| **Scale Reasoning** | Ignores location data volume | Identifies GPS firehose as a challenge | Quantifies: 5K updates/sec, geofence evaluation optimization, discusses at-most-once for real-time vs. at-least-once for historical |
| **Trade-off Articulation** | No trade-offs discussed | Mentions latency-vs-quality trade-off in matching | Deep discussion of batch window sizing, ETA percentile selection (promise buffer), insertion-vs-new-route economics, and degradation hierarchy |

### Overall Assessment

| Score | Level | Description |
|---|---|---|
| **5-10** | Not Ready | Insufficient depth for senior SDE interview |
| **11-15** | Developing | Shows potential; needs deeper understanding of real-time systems |
| **16-20** | Competent | Solid senior-level understanding; good architecture with reasonable trade-offs |
| **21-25** | Strong | Staff-level thinking; anticipates problems, quantifies trade-offs, designs for failure |

---

## Discussion Extensions (If Time Permits)

### Extension 1: Multi-City Expansion

"You're expanding from 1 city to 10 cities. What changes?"

**Key points**: Geo-partitioned architecture means minimal changes to real-time systems. Challenges: (1) model transfer—demand and ETA models trained on City A may not work for City B (different traffic patterns, road networks); (2) cold-start in new cities with no historical data; (3) shared services (billing, merchant accounts) now serve 10× load; (4) operational tooling must support per-city dashboards with cross-city aggregation.

### Extension 2: Scheduled vs. On-Demand Economics

"30% of your merchants place the same delivery every day (e.g., a bakery delivering to 5 cafes every morning). How do you optimize?"

**Key points**: Scheduled deliveries are a planning problem (solved overnight with full VRP optimizer), not a real-time matching problem. They allow pre-committed rider allocation (guaranteed capacity at lower cost), route optimization with all orders known (optimal, not heuristic), and lower pricing for merchants (predictable demand reduces platform risk). The challenge is mixing scheduled routes with on-demand orders without degrading either.

### Extension 3: Competitive Dynamics

"A competitor launches with 50% lower prices. How does your system respond?"

**Key points**: This is not a system design question—it's a product question. But the system can enable competitive responses: (1) cost reduction through better batching (the system's optimization quality is its moat), (2) reliability differentiation (lower-priced competitors often have worse ETAs due to thinner rider supply), (3) SME retention through analytics and integration (switching cost from API integration and delivery analytics). The system can also support promotional pricing with per-merchant or per-zone price overrides.
