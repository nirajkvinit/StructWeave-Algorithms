# Food Delivery System Design (DoorDash / Zomato / Uber Eats)

## System Overview

A food delivery platform---exemplified by DoorDash, Uber Eats, Zomato, and Deliveroo---orchestrates a **three-sided marketplace** connecting customers who want food, restaurants that prepare it, and drivers (dashers) who deliver it. DoorDash alone processes 5M+ orders per day across 27+ countries with 1M+ active drivers, making it one of the most operationally complex real-time logistics systems in production. The core engineering challenge lies at the intersection of **real-time geospatial dispatch** (matching drivers to orders using proximity, ETA, and acceptance probability), **multi-stage ETA prediction** (combining restaurant prep time, driver travel time, and traffic conditions into a single estimate), **three-sided state coordination** (synchronizing order state across customer, restaurant, and driver apps with different latency and reliability requirements), and **dynamic marketplace balancing** (adjusting pricing, delivery fees, and driver incentives in real-time to maintain supply-demand equilibrium across thousands of micro-zones). Unlike a ride-hailing system where matching involves two parties and a single trip, food delivery introduces a critical third party---the restaurant---whose preparation time is variable, uncertain, and directly determines when the driver should arrive for pickup. This three-sided coordination, combined with the physical constraint that food quality degrades with time, makes the dispatch optimization problem fundamentally harder than ride-hailing.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Write-heavy for driver location updates (100K writes/s at peak); read-heavy for restaurant/menu discovery and order tracking |
| **Latency Sensitivity** | Very High---driver assignment must complete in <30s; ETA must be computed in <500ms; location updates ingested in <2s |
| **Consistency Model** | Strong consistency for order state machine and payments; eventual consistency for driver locations, surge pricing, and menu caches |
| **Concurrency Level** | Very High---500K+ concurrent driver location streams, 580+ order creations/sec at peak, millions of tracking subscriptions |
| **Data Volume** | High---~8.6B driver location updates/day, ~5M orders/day, menu catalog of 100M+ items across millions of restaurants |
| **Architecture Model** | Event-driven three-sided marketplace with geo-sharded dispatch, ML-based ETA pipeline, and saga-based order lifecycle |
| **Real-time Requirements** | Hard real-time for dispatch and tracking; soft real-time for surge pricing and ETA refinement |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Dispatch engine, location pipeline, ETA accuracy, race conditions |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Geo-sharding, multi-region, failure modes, graceful degradation |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Driver verification, location privacy, PCI compliance, fraud detection |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Food Delivery (This) | Ride-Hailing (7.1) | E-Commerce (6.1) | Hotel Booking (7.7) |
|--------|---------------------|---------------------|-------------------|---------------------|
| **Primary Unit** | Order (customer + restaurant + driver + items) | Trip (rider + driver + route) | Order (buyer + seller + items) | Reservation (guest + room + dates) |
| **Marketplace Sides** | Three (customer, restaurant, driver) | Two (rider, driver) | Two (buyer, seller) | Two (guest, hotel) |
| **Matching Complexity** | Very High---must coordinate restaurant readiness with driver arrival | High---match driver to rider location | Low---inventory check only | Low---availability check only |
| **Time Sensitivity** | Critical---food quality degrades with time; 30-45 min delivery window | Critical---rider waiting in real-time | Moderate---hours to days for shipping | Low---days to weeks booking window |
| **ETA Components** | Multi-stage: prep time + driver-to-restaurant + restaurant-to-customer | Two-stage: driver-to-rider + trip duration | Shipping estimate (hours/days) | Not applicable |
| **Supply Elasticity** | Dual---restaurant hours are fixed, driver supply is elastic | High---drivers go online/offline freely | Medium---inventory is stocked | Low---room count is fixed |
| **Location Updates** | During active delivery only (pickup to delivery phase) | Continuous (all online drivers, every 4s) | None | None |
| **Physical Constraint** | Food freshness degrades---driver must not wait too long at restaurant | None---rider waits at pickup | Package durability is not time-sensitive | None |

---

## What Makes This System Unique

1. **Three-Sided Marketplace Coordination**: Unlike ride-hailing (two-sided) or e-commerce (two-sided with async fulfillment), food delivery must synchronize three independent actors in real-time. The restaurant needs time to prepare, the driver needs to arrive at the restaurant exactly when the food is ready (not too early, not too late), and the customer needs accurate visibility into the entire chain. Mis-timing any leg wastes either the driver's time (waiting at restaurant), the food's quality (sitting ready with no driver), or the customer's patience (inaccurate ETA).

2. **Dispatch as a Multi-Objective Optimization Problem**: DoorDash's dispatch engine (DeepRed) solves a mixed-integer program that simultaneously optimizes for delivery speed, driver utilization, order batching, and acceptance probability. The system must decide not just *which* driver to assign, but *when* to dispatch (early dispatch risks driver waiting; late dispatch risks food waiting), whether to *batch* multiple orders to the same driver, and whether to *delay* dispatch to wait for a better match.

3. **Multi-Stage ETA with Compounding Uncertainty**: The total delivery ETA combines three independent uncertain estimates: restaurant preparation time (varies by cuisine, order complexity, current kitchen load), driver travel to restaurant (varies by traffic, distance, route), and driver travel from restaurant to customer (varies by traffic, distance). Each stage has its own ML model, and errors compound across stages. A 5-minute underestimate in prep time cascades into a 5-minute late delivery regardless of how accurate the travel estimates are.

4. **Stacked/Batched Orders**: A driver can carry multiple orders from the same restaurant or nearby restaurants, creating a vehicle routing problem (VRP). The dispatch engine must decide whether assigning a second order to a driver already carrying one order will delay the first order's delivery beyond its SLA. This requires real-time route optimization with time-window constraints.

5. **Supply-Demand Balancing with Asymmetric Elasticity**: Driver supply is elastic (drivers respond to surge incentives within minutes), but restaurant supply is inelastic (a restaurant cannot cook faster during peak demand). This asymmetry means surge pricing can attract more drivers but cannot reduce restaurant preparation bottlenecks. The system must forecast restaurant-level capacity and potentially throttle order acceptance for overloaded restaurants.

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Orders per day | ~5M | ~58 orders/sec average, ~580/s at peak (lunch/dinner) |
| Active restaurants | ~800K | Across all markets |
| Active drivers | ~1M | Not all online simultaneously |
| Peak concurrent online drivers | ~500K | Location update generators during meal peaks |
| Driver location updates/second | ~100K | 500K drivers / 5s interval |
| Menu items in catalog | ~100M+ | Across all restaurants |
| Average delivery time | ~35 min | From order placement to delivery |
| ETA accuracy target | ±5 min for 80% of orders | Measured from initial estimate to actual delivery |
| Driver assignment target | <30s from order confirmation | Time to find and notify a driver |
| Markets served | 30+ countries | Geo-sharded by metropolitan area |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [7.1 - Uber/Lyft Ride-Hailing](../7.1-uber-lyft/) | Similar dispatch, geo-indexing, and surge pricing; food delivery adds restaurant coordination |
| [7.5 - Maps & Navigation Service](../7.5-maps-navigation-service/) | Routing engine, travel time estimation, traffic data |
| [6.1 - E-Commerce Platform](../6.1-ecommerce-platform/) | Order lifecycle, payment processing, catalog management |
| [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/) | Event streaming for order state changes and location updates |
| [3.7 - Recommendation Engine](../3.7-recommendation-engine/) | Restaurant and menu personalization |

---

## Sources

- DoorDash Engineering Blog --- DeepRed: ML and Optimization for Dasher Dispatch
- DoorDash Engineering Blog --- Next-Generation Optimization for Dasher Dispatch
- DoorDash Engineering Blog --- Scaling Routing with Multithreading and Ruin-and-Recreate
- Uber Engineering Blog --- DeepETA: Predicting Arrival Times Using Deep Learning
- Uber Engineering Blog --- Predicting Time to Cook, Arrive, and Deliver at Uber Eats
- Zomato Engineering Blog --- Microservices Architecture and DynamoDB Migration
- Industry Statistics: DoorDash 2025 Annual Report, 5M+ orders/day, 1M+ drivers
- Conference: QCon SF 2024 --- Optimizing Search at Uber Eats
- Research: Mixed-Integer Programming for Vehicle Routing (Operations Research)
