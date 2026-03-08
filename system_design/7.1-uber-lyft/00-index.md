# Uber/Lyft Ride-Hailing Platform Design

## System Overview

A ride-hailing platform---exemplified by Uber, Lyft, Grab, and Ola---orchestrates real-time matching between riders requesting transportation and drivers offering it, at global scale. Uber processes 28M+ trips per day across 70+ countries with 5.4M+ active drivers, making it one of the highest-throughput real-time geospatial systems ever built. The core engineering challenge is the intersection of **real-time geospatial indexing** (tracking millions of moving drivers), **sub-second matching** (finding the best driver for each request), **dynamic pricing** (balancing supply and demand in near-real-time), and **trip lifecycle management** (orchestrating a multi-state distributed workflow across two mobile clients, multiple backend services, and a payment system---all while drivers move at 60 km/h and network connections drop). Unlike static matching systems (job boards, dating apps), every entity in a ride-hailing system is continuously moving, making every cached result stale within seconds.

---

## Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Read/Write Pattern** | Write-heavy for location updates (875K writes/s at peak); read-heavy for rider-facing queries (nearby drivers, ETA) |
| **Latency Sensitivity** | Very High---matching must complete in <1s; location updates must be ingested in <2s; ETA computation <500ms |
| **Consistency Model** | Strong consistency for trip state machine and payment; eventual consistency for driver locations and surge pricing |
| **Concurrency Level** | Very High---millions of concurrent driver location streams, hundreds of thousands of simultaneous trip state machines |
| **Data Volume** | High---~75B location updates/day, ~28M trips/day, trip records growing at ~10TB/year |
| **Architecture Model** | Event-driven, write-heavy geospatial pipeline with stateless matching and persistent trip state machines |
| **Real-time Requirements** | Hard real-time for matching and dispatch; soft real-time for surge pricing and ETA |
| **Complexity Rating** | **Very High** |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API design, algorithms (pseudocode) |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Geospatial index, matching engine, surge pricing, location pipeline, trip state machine |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | City-based sharding, multi-region, failure modes |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Driver verification, location privacy, PCI compliance, anti-fraud |
| [07 - Observability](./07-observability.md) | Metrics, logging, tracing, alerting |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-offs |
| [09 - Insights](./09-insights.md) | Key architectural insights, patterns, lessons |

---

## What Differentiates This from Related Systems

| Aspect | Ride-Hailing (This) | Food Delivery (7.4) | Hotel Booking (7.7) | Static Matching (e.g., Job Board) |
|--------|---------------------|---------------------|---------------------|----------------------------------|
| **Primary Unit** | Trip (driver + rider + route) | Order (restaurant + driver + customer) | Reservation (room + guest + dates) | Match (provider + consumer) |
| **Entity Movement** | Both sides moving (driver + rider location) | One side moving (delivery driver) | Static (hotel location fixed) | Static (no location tracking) |
| **Matching Window** | Seconds (<15s to find driver) | Minutes (restaurant prep time buffers) | Days-weeks (advance booking) | Hours-days (async matching) |
| **Supply Elasticity** | High (drivers go online/offline freely) | Medium (restaurants have fixed hours) | Low (room inventory is fixed) | Low (supply is listed) |
| **Pricing Model** | Dynamic (surge pricing in real-time) | Semi-dynamic (delivery fees vary) | Revenue management (yield pricing) | Fixed or negotiated |
| **Location Updates** | Continuous (every 4s per driver) | Periodic (during delivery only) | None | None |
| **State Machine** | Complex (6+ states, real-time transitions) | Complex (order lifecycle) | Simple (booked/cancelled/completed) | Simple (open/matched/closed) |
| **Geospatial Index** | In-memory, sub-second updates | In-memory for active deliveries | Static geo index | Not needed |

---

## What Makes This System Unique

1. **Real-Time Geospatial Indexing at Massive Write Throughput**: With 3.5M+ active drivers each sending location updates every 4 seconds, the system must ingest and index ~875K location writes per second into a geospatial structure that supports sub-100ms nearest-neighbor queries. This is not a read-heavy search problem---it is a write-heavy indexing problem where every entry expires in seconds.

2. **Dynamic Pricing as a Market-Clearing Mechanism**: Surge pricing is not a simple multiplier---it is a real-time economic signal computed at sub-neighborhood granularity (using hexagonal grid cells) that must balance rider demand against driver supply. The pricing engine must update multipliers every 1-2 minutes across thousands of zones per city, incorporating demand forecasting, driver supply prediction, and regulatory constraints.

3. **Supply-Demand Balancing Across a Two-Sided Market**: Unlike most systems that optimize for one user type, ride-hailing must simultaneously optimize for rider wait time, driver utilization, and platform revenue. A matching decision that minimizes one metric often worsens another, creating a multi-objective optimization problem solved under hard latency constraints.

4. **Driver State Machine with Distributed Reliability**: Each driver transitions through states (OFFLINE -> AVAILABLE -> DISPATCHED -> ON_TRIP -> back to AVAILABLE) across unreliable mobile networks. The trip state machine must be persistent, idempotent, and recoverable---if a driver's phone loses connectivity mid-trip, the system must detect the gap, maintain the trip state, and recover seamlessly when the connection resumes.

5. **Trip Lifecycle as a Distributed Saga**: A single trip involves coordinated state changes across the dispatch service, trip service, payment service, notification service, and two mobile clients. Any component can fail at any step. The trip lifecycle must be modeled as a distributed saga with compensating transactions (e.g., if payment fails after trip completion, the trip still completes but enters a payment-retry workflow).

---

## Quick Reference: Scale Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| Trips per day | ~28M | ~325 trips/second average, ~1,000/s at peak |
| Active drivers | ~5.4M | Not all online simultaneously |
| Peak concurrent online drivers | ~3.5M | Location update generators |
| Location updates/second | ~875K | 3.5M drivers / 4s interval |
| Matching latency target | <1s | From request to driver notification |
| Location update ingestion | <2s | From driver phone to geospatial index |
| ETA accuracy target | <2 min error | For trips under 15 min |
| Surge price update interval | 1-2 min | Per hexagonal zone |
| Cities served | 10,000+ | Across 70+ countries |

---

## Related Designs

| Design | Relevance |
|--------|-----------|
| [7.4 - Food Delivery System](../7.4-food-delivery-system/) | Similar dispatch and ETA problems, different matching constraints |
| [7.5 - Maps & Navigation Service](../7.5-maps-navigation-service/) | Routing engine, tile system, traffic estimation |
| [1.5 - Distributed Log-Based Broker](../1.5-distributed-log-based-broker/) | Location ingestion pipeline architecture |
| [3.5 - Uber Michelangelo ML Platform](../3.5-uber-michelangelo-ml-platform/) | ML models for ETA, surge, fraud detection |
| [1.9 - Consistent Hashing Ring](../1.9-consistent-hashing-ring/) | Sharding driver location data across workers |

---

## Sources

- Uber Engineering Blog --- H3 Hexagonal Hierarchical Spatial Index
- Uber Engineering Blog --- Ringpop: Scalable Application-Layer Sharding
- Uber Engineering Blog --- DISCO: Dispatch Optimization
- Uber Engineering Blog --- Driver Surge Pricing (Management Science)
- Uber Engineering Blog --- Michelangelo ML Platform
- Lyft Engineering Blog --- Envoy Proxy, Geospatial Services
- Research: H3 Hexagonal Grid System (Uber Open Source)
- Research: Dynamic Pricing in Two-Sided Markets (Management Science, 2021)
- Industry Statistics: Uber 2025 Annual Report, 28M trips/day, 5.4M drivers
- Conference: QCon --- Building Real-Time Geospatial Systems at Uber Scale
