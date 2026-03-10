# 13.2 AI-Native Logistics & Supply Chain Platform — Interview Guide

## Overview

Designing an AI-native logistics and supply chain platform is a senior/staff-level system design question that tests the intersection of combinatorial optimization under real-time constraints, high-throughput event stream processing, ML forecasting pipelines, and physical-digital system integration. Unlike pure software systems (design a URL shortener, design a chat system), this question requires reasoning about NP-hard optimization problems with strict latency budgets, IoT data ingestion at massive scale, hierarchical forecasting with coherence constraints, and the physical reality that optimization plans must be feasible in the real world (trucks have capacity limits, AMRs can collide, containers lose connectivity). Interviewers use this question to assess whether a candidate can design systems that bridge the gap between mathematical optimization and operational reality.

**Typical time allocation:** 45–55 minutes

---

## 45-Minute Interview Pacing

| Phase | Time | Focus |
|---|---|---|
| Requirements clarification | 5–7 min | Scope (which subsystems?), scale, transport modes, cold chain, real-time requirements |
| Back-of-envelope estimation | 5–7 min | Shipment volume, telemetry rate, VRP instance size, forecast universe, warehouse throughput |
| High-level architecture | 8–10 min | Telemetry ingestion → route optimization → visibility → forecasting → warehouse |
| Deep dive (interviewer-directed) | 12–15 min | Route optimization OR demand forecasting OR warehouse orchestration OR visibility/ETA |
| Extensions and trade-offs | 5–7 min | Disruption handling, cold chain, multi-modal visibility, peak season scaling |
| Wrap-up | 2–3 min | |

---

## Opening Phase: Requirements Clarification

### Questions the Candidate Should Ask

**Scope:**
- "Which subsystems are in scope? Route optimization, demand forecasting, warehouse, fleet management, last-mile — all of them, or should I focus on a subset?"
- "Are we designing for a single shipper or a multi-tenant platform serving thousands of shippers?"
- "What transport modes are in scope? Road only, or multi-modal including ocean, rail, and air?"

**Scale:**
- "How many active shipments are we tracking concurrently? How many vehicles in the fleet?"
- "What's the telemetry update frequency? GPS every 30 seconds, every 5 minutes?"
- "How many warehouses and how many AMRs per warehouse?"

**Real-time requirements:**
- "When a new order arrives or a traffic delay occurs, how fast does the route need to be re-optimized? Seconds or minutes?"
- "How fresh does the ETA need to be? Updated every 5 minutes or truly real-time?"

**Cold chain and compliance:**
- "Is cold chain monitoring in scope? What regulatory compliance is required?"
- "Are there driver privacy considerations (GDPR for telematics)?"

### Strong Candidate Signal

A strong candidate immediately recognizes the NP-hardness of the routing problem and asks about the trade-off between solution quality and computation time: "For a depot with 3,000 stops and 200 vehicles, an exact VRP solver won't terminate in acceptable time. Are we targeting a solution within 5% of optimal in under 30 seconds, or is there a different quality-latency trade-off?" This signals awareness that the core technical challenge is not designing the API or database schema—it is solving computationally hard optimization problems under production constraints.

---

## Deep Dive Phase: Common Interviewer Probes

### Deep Dive 1: Route Optimization Design

**Interviewer prompt:** "Walk me through how you'd design the route optimization engine. Specifically: how do you handle a new order arriving at 10 AM when routes are already in progress?"

**Strong response covers:**
- VRP formulation: stops, time windows, vehicle capacity, multi-depot
- Metaheuristic solver choice (ALNS, genetic algorithm) with reasoning: exact solvers cannot scale
- Warm-start architecture: maintain in-memory solution state; apply incremental perturbation for new orders rather than re-solving from scratch
- Insertion heuristics for adding a new stop (cheapest feasible insertion across all active routes)
- Quality threshold: trigger full ALNS improvement only when incremental insertion degrades solution cost beyond a threshold
- Re-optimization batching: queue events and trigger re-optimization every 60–90 seconds, not per-event
- Solver state durability: checkpoint every 60 seconds for crash recovery

**Trap question:** "Why not just solve the full VRP every time a new order comes in?"

**Expected answer:** For a depot with 200 vehicles and 3,000 stops, a full ALNS solve takes 30 seconds. If a new order arrives every 10 seconds, the solver can never catch up. More importantly, 95% of the existing solution is unaffected by one new order. Re-solving from scratch wastes computation and may produce a completely different route plan, confusing drivers who are mid-route. The warm-start approach preserves the stable parts of the solution and only perturbs the affected routes.

**Trap question:** "A driver's vehicle breaks down at 2 PM. What happens?"

**Expected answer:** The solver removes all unvisited stops from the broken vehicle's route. These orphaned stops are re-inserted into other vehicles' routes using regret-based insertion (prioritize stops that have few good alternatives). If some stops cannot be feasibly inserted (no vehicle can reach them within the time window), they are escalated to a dispatcher for manual assignment or customer notification of delay. The entire process must complete within 5 seconds so the affected customers' ETAs are updated promptly.

### Deep Dive 2: Demand Forecasting Pipeline

**Interviewer prompt:** "You need to forecast demand for 10 million SKU-location combinations. How do you design the forecasting pipeline, and what's the difference between a naive and production approach?"

**Strong response covers:**
- Probabilistic forecasting: quantile predictions, not single point forecasts; pinball loss function
- Hierarchical reconciliation: SKU-level forecasts must sum to category-level forecasts; MinT or similar coherent reconciliation
- Why coherence matters: incoherent forecasts create contradictory inventory signals at different levels
- Pipeline architecture: feature engineering → per-SKU model inference (parallelized) → hierarchy reconciliation (large matrix operation)
- Cold start handling for new SKUs: similar SKU transfer, category disaggregation, planner override
- Regime change detection: CUSUM control charts on forecast error to detect when the model's assumptions no longer hold

**Trap question:** "Why not just use a single deep learning model that forecasts all SKUs simultaneously?"

**Expected answer:** A single model for 10M SKU-locations requires enormous training data and compute. More critically, it couples unrelated forecasts: retraining to fix accuracy for one product category risks degrading accuracy for another. In practice, the industry uses per-category or per-cluster models (gradient-boosted trees are the production workhorse, not deep learning, for tabular demand data) trained on category-specific features. The reconciliation layer handles cross-SKU coherence without requiring a single monolithic model.

### Deep Dive 3: Warehouse Orchestration

**Interviewer prompt:** "You have 2,000 AMRs in a warehouse. How do you coordinate them to avoid collisions and optimize pick paths?"

**Strong response covers:**
- Digital twin: real-time in-memory representation of warehouse state (AMR positions, bin occupancy, conveyor status)
- Pick-path optimization: TSP/shortest-path on the warehouse graph; exact DP for small lists, heuristics + 2-opt for larger lists
- Multi-agent path planning: spatial partitioning into zones; time-space reservation for path segments; deadlock detection via wait-for graph
- AMR task assignment: not just "nearest AMR to next pick"—consider battery level, current cargo, and downstream staging area proximity
- Collision avoidance: lower-priority AMR yields (detours or waits); priority based on task urgency and remaining battery
- Slotting optimization: high-velocity SKUs near staging areas; co-pick affinity considered

**Trap question:** "What happens when the warehouse orchestrator crashes?"

**Expected answer:** AMRs must not stop dead in the aisles (safety hazard). AMRs should have a local fallback: stop safely in designated holding positions, continue executing their last cached task queue if they have one, and report their position continuously. The orchestrator recovers by rebuilding the digital twin from AMR position reports, recent bin scan events, and conveyor status sensors. Full recovery should take under 2 minutes. During recovery, human pickers can receive task assignments from a simplified backup system.

### Deep Dive 4: Multi-Modal Visibility and ETA

**Interviewer prompt:** "A shipment goes from Shanghai to Chicago: ocean, then rail, then truck. How do you provide end-to-end visibility and predict the final delivery ETA?"

**Strong response covers:**
- Multi-source signal ingestion: AIS (ocean), railroad RFID (rail), GPS (truck), carrier EDI (all modes)
- Signal normalization into canonical event format with source-specific confidence weighting
- Mode transition handling: ocean-to-rail handoff at port (customs delay, drayage scheduling); rail-to-truck handoff at intermodal terminal
- ETA model that handles multi-leg journeys: predict arrival at each transition point, then propagate forward
- Confidence degradation: further into the future, wider confidence intervals; ocean ETA is ± days, truck ETA is ± hours
- Stale signal handling: if the ocean carrier's EDI hasn't updated in 12 hours, down-weight that source and rely more on AIS position

**Trap question:** "The container ship is delayed by 3 days due to port congestion. What happens to the downstream rail and truck legs?"

**Expected answer:** This is a cascading re-planning problem. The disruption manager detects the delay (AIS shows vessel waiting at anchor), estimates the new port arrival time, and triggers downstream re-optimization: the rail booking may need to be moved to a later departure, the truck pickup at the rail terminal rescheduled, and the final customer ETA updated. The system should proactively notify the customer of the new ETA and offer alternatives (expedited truck from port instead of rail, if the SLA is at risk). The what-if simulator can evaluate the cost-benefit of each alternative before committing.

---

## Extension Questions

### Extension 1: Cold Chain Compliance

"A pharmaceutical shipment requires continuous temperature monitoring with regulatory audit trail. How does the platform handle this?"

Good answer covers:
- IoT sensors with local buffering for connectivity gaps
- Tamper-evident audit trail with hash chaining and HSM-backed HMAC
- Real-time excursion detection with immediate alerting (within 60 seconds)
- Disposition decision workflow: excursion detected → alert → human decides release/quarantine/reject → decision documented in audit trail
- Regulatory retention: 7 years for pharmaceutical (EU GDP), 2 years for food (FDA FSMA)

### Extension 2: Disruption Handling at Scale

"A hurricane is approaching the Gulf Coast. 10,000 shipments will be affected. What does the system do?"

Good answer covers:
- External signal integration (weather API, NOAA forecasts)
- Geofence-based affected shipment identification
- Priority-based batch re-optimization (most time-critical shipments first)
- Pre-computed contingency routes for high-volume lanes
- Customer proactive notification with revised ETAs
- Rate-limited re-optimization to prevent overwhelming the solver fleet

### Extension 3: Peak Season Scaling

"Holiday shipping season: volume goes from 2M to 10M shipments per day for 6 weeks. How do you prepare?"

Good answer covers:
- Calendar-driven predictive scaling (not reactive auto-scaling)
- Pre-warming solver instances, stream processing partitions, and inference clusters 72 hours before predicted surge
- Forecast models with explicit holiday features to avoid underforecasting
- Temporary fleet expansion with gig drivers; wider delivery windows for routing flexibility
- CDN-backed customer tracking pages to handle 10x tracking page views

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---|---|---|
| Using an exact VRP solver for production-scale routing | Exact solvers cannot scale beyond ~50 stops; NP-hard problem requires heuristics | Metaheuristic solver (ALNS) with warm-start incremental re-optimization |
| Generating deterministic point demand forecasts | No uncertainty information for safety stock decisions; misleadingly precise | Probabilistic quantile forecasts with hierarchical reconciliation |
| Planning warehouse AMR paths independently | Independent path planning causes collisions and deadlocks | Time-space reservation with zone-based multi-agent path planning |
| Treating ETA as distance/speed calculation | Ignores traffic patterns, stop dwell times, carrier reliability, and disruptions | ML-based ETA with multi-source signal fusion and conformal prediction intervals |
| Re-solving VRP from scratch on every change | Wastes compute; produces unstable routes that confuse drivers | Warm-start: incremental perturbation with quality-threshold-triggered full re-optimization |
| Ignoring forecast hierarchy coherence | SKU-level forecasts that don't sum to category totals create contradictory inventory signals | MinT reconciliation to enforce mathematical coherence across the hierarchy |
| Treating the warehouse as a static model | Plans fail when aisles are blocked, AMRs need charging, or conveyors are down | Digital twin with real-time state updates; plan against actual physical state |
| Single-source ETA for multi-modal shipments | Relying on carrier EDI alone misses delays visible in GPS/AIS | Multi-source signal fusion with source-specific confidence weighting |

---

## Scoring Rubric

### Basic (passing score)
- Identifies main subsystems: route optimization, shipment tracking, demand forecasting
- Designs a basic telemetry ingestion pipeline with shipment tracking
- Mentions VRP as the core routing problem; proposes some form of heuristic solver
- Proposes a database schema for shipments and routes

### Intermediate (strong hire)
- Two-phase routing: initial planning + real-time re-optimization
- Probabilistic demand forecasting (mentions uncertainty quantification)
- Multi-source visibility with signal normalization
- Discusses ETA prediction as an ML problem, not a simple calculation
- Addresses warehouse AMR coordination at a high level
- Mentions cold chain monitoring as a compliance requirement

### Advanced (exceptional hire / staff)
- Warm-start ALNS solver with incremental perturbation and quality-threshold re-optimization
- Hierarchical forecast reconciliation (MinT or similar); explains why coherence matters for inventory
- Digital twin architecture for warehouse orchestration with real-time physical state tracking
- Multi-agent path planning for AMR fleet with deadlock prevention
- Multi-source ETA with source-specific confidence weighting and conformal prediction intervals
- Disruption handling: cascading re-planning across multi-modal legs
- Cold chain audit trail with tamper-evident hash chaining
- Peak season scaling with calendar-driven pre-warming

### Signals of Exceptional Depth
- Spontaneously identifies the re-optimization frequency trade-off: too frequent wastes compute, too infrequent misses savings; proposes event batching with critical-event fast-path
- Recognizes that forecast reconciliation is the computational bottleneck in the forecasting pipeline, not individual model inference
- Notes that warehouse digital twin consistency is a concurrent read/write problem requiring actor-based or CRDT-based state management
- Proposes ETA notification debouncing to avoid alerting customers on trivial ETA changes
- Identifies cold chain sensor connectivity gaps as a compliance risk and proposes buffered readings with retroactive excursion detection

---

## Interviewer Testing Signals

| Test | Prompt |
|---|---|
| NP-hardness awareness | "How long would it take to find the optimal route for 3,000 stops and 200 vehicles?" |
| Warm-start vs. cold-start | "A new order arrives while drivers are already mid-route. Walk me through exactly what the solver does." |
| Forecast coherence | "The SKU-level forecasts for beverages sum to 10,000 units, but the category forecast says 8,000. What went wrong and how do you fix it?" |
| Physical-digital gap | "Two AMRs are heading toward each other in a narrow aisle. How does the system prevent a collision?" |
| Multi-modal ETA | "The container ship is 3 days late. How does this affect the truck leg ETA 2,000 miles inland?" |
| Cold chain compliance | "The temperature sensor lost connectivity for 2 hours during transit. What's the compliance status of the shipment?" |
| Cascading failure | "The route optimization engine goes down. What happens to drivers who are currently mid-route?" |
