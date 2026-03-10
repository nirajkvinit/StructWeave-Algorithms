# Section 7: Logistics & Marketplace

> Part of the [System Design Insights Index](../insights-index.md). For cross-cutting patterns, see [Insights by Category](./by-category.md).

---

### 7.1 Uber/Lyft [View](../7.1-uber-lyft/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | H3 Hexagonal Grid over Geohash -- Uniform Cell Size Eliminates Boundary Artifacts in Ride-Hail Matching | Data Structures |
| 2 | Two-Phase Matching -- Nearest Driver ≠ Fastest Dispatch; Geo Filter and ETA Ranking Are Separate Problems | System Modeling |
| 3 | Surge Pricing as a Market-Clearing Mechanism -- Sub-Neighborhood Granularity and Near-Real-Time Computation | System Modeling |
| 4 | Location Pipeline at 875K Writes/Second -- Tiered Write Path Prevents Relational Database Collapse | Scaling |
| 5 | Trip State Machine as Single Source of Truth -- Persistent State Machine Enables Idempotent Recovery | Resilience |

---

### 7.2 Airbnb [View](../7.2-airbnb/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | The Calendar Double-Booking Prevention Pattern -- Per-Date State + Distributed Lock Is the Only Viable Approach | Contention |
| 2 | Authorize-Then-Capture Payment Hold -- Decoupling Authorization from Capture Creates a Multi-Day Distributed Transaction | Resilience |
| 3 | Eventual vs. Strong Consistency Split by Domain -- The Consistency Boundary Is the Hardest Architecture Decision | Consistency |
| 4 | Two-Sided Marketplace Trust Architecture -- Asymmetric Enforcement Between Supply and Demand | Security |
| 5 | Geo + ML Hybrid Search Ranking -- Map Results Require a Fundamentally Different Ranking Theory Than List Results | Search |
| 6 | iCal External Calendar Sync via Polling -- Poll-Based Synchronization Creates an Unavoidable Consistency Gap | Scaling |
| 7 | Per-Date Status Modeling for Calendar -- Date-Level Granularity Outperforms Range-Based and Bitmap Approaches | Data Modeling |
| 8 | Price Hold Window & Race Condition -- Lock TTL and Payment Authorization Timing Create a Narrow Correctness Window | Contention |
| 9 | Review Gate via Booking Verification -- Structural Anti-Fraud Mechanism, Not Just a Policy Choice | Data Modeling |
| 10 | Split Payout with Escrow Timing -- 24-Hour Delay Is an Architectural Safety Mechanism | Pricing |
| 11 | Host Instant Book vs. Request Mode Flexibility -- Market Equilibrium Mechanism, Not Feature Bloat | Scaling |
| 12 | Listing Indexing Freshness vs. Accuracy Trade-off -- Search Index and Source of Truth Must Be Decoupled | Consistency |
| 13 | The Reservation Reaper Pattern -- Temporary States Require Automated Cleanup to Prevent State Leaks | Resilience |
| 14 | Service Block Facade Pattern -- Domain-Aligned Blocks Solve the Microservice Coordination Problem | Scaling |
| 15 | Contact Information Detection as a Revenue Protection Mechanism -- Message Scanning Is an Architectural Necessity | Security |

---

### 7.3 Car Parking System [View](../7.3-car-parking-system/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | Hierarchical Object Model for Physical Systems -- Corporation → Lot → Floor → Zone → Spot Reflects Infrastructure Topology | Data Modeling |
| 2 | Edge-First Gate Control for Physical Barrier Reliability -- Cloud-Only Design Creates Unacceptable Single Points of Failure | Resilience |
| 3 | Spot Availability Bitmap for O(1) Lookups -- 10,000 Lots Compressed into ~6 MB of Redis with Microsecond Latency | Data Structures |
| 4 | Optimistic Locking for Low-Contention Slot Allocation -- Contention Ratio Determines the Right Concurrency Control | Contention |
| 5 | IoT Sensor Pipeline with Debouncing -- Requiring Two Consistent Readings Eliminates Phantom State Changes | IoT / Resilience |
| 6 | Offline-First Gate with Reconciliation on Reconnect -- Transforms Availability Problem into Eventual Consistency Problem | Resilience |
| 7 | Time-Window Reservation to Prevent Slot Squatting -- Balances User Flexibility Against Lot Utilization | Data Modeling |
| 8 | Per-Lot Sharding for Operational Isolation -- Zero Cross-Shard Transactions for All Operational Flows | Scaling |
| 9 | Short-Lived QR Code Pattern for Physical Access -- Dynamic TOTP-Style Tokens Prevent Screenshot Replay Attacks | Security |
| 10 | Pricing Rule Engine with Period-Based Rates -- Composable Rules Handle Peak/Off-Peak, Daily Caps, and Surge | Pricing |
| 11 | Fail-Open Exit Gates for Revenue vs Traffic Trade-off -- Traffic Backup Cost Far Exceeds Deferred Payment Cost | Resilience |
| 12 | Sensor-Gate Cross-Validation as a Reliability Layer -- Each Source Compensates for the Other's Weaknesses | IoT / Consistency |
| 13 | Physical State Always Overrides Logical State -- The Car Does Not Disappear Because the Booking Expired | Consistency |

---

### 7.4 Food Delivery System [View](../7.4-food-delivery-system/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | Redis GEORADIUS for Sub-Second Driver Proximity Queries -- O(N+M) Geo Queries at Memory Speed | Geo / Scaling |
| 2 | Three-Sided Marketplace Coordination Pattern -- Synchronizing Customer, Restaurant, and Driver in Real-Time | Marketplace |
| 3 | Location Update Storm -- Batching and Pipeline Writes Absorb 100K Writes/Second | Scaling |
| 4 | Multi-Stage ETA with ML Correction Loop -- Composition of Three Independent Uncertain Estimates | ML / ETA |
| 5 | Optimistic Lock on Driver Status for Assignment -- Lua Script Atomic GET-CHECK-SET Eliminates Blocking | Contention |
| 6 | Geo-Sharding by City for Operational Independence -- Natural Locality Eliminates Cross-City Dependencies | Scaling |
| 7 | Smooth Surge Pricing with EWMA to Prevent Thrashing -- Gradual Multiplier Changes Prevent Destructive Oscillation | Marketplace |
| 8 | Saga Pattern for Order-Assignment-Payment Coordination -- Compensating Transactions Handle Five-Service Rollback | Resilience |
| 9 | Driver Stacking and Batching for Route Optimization -- Transforms Matching into a VRP with Time-Window Constraints | Scaling |
| 10 | Server-Side GPS Trajectory Validation -- Physical Impossibility Detection Defeats GPS Spoofing Fraud | Security |
| 11 | Real-Time Tracking with WebSocket and Dead Reckoning Client -- Decouples Visual Update Rate from Data Update Rate | Data Modeling |
| 12 | Restaurant Prep Time Learning Per Historical Data -- Per-Restaurant per-Time-Slot Data Is the Highest-Leverage ETA Feature | ML / ETA |
| 13 | Lazy Dispatch Timing -- Optimal Assignment Time Maximizes Driver Utilization and Food Freshness Simultaneously | Marketplace |
| 14 | Event-Driven Order Lifecycle for Extensibility and Resilience -- State Transitions as Kafka Events Decouple Consumers | Resilience |
| 15 | Hierarchical Circuit Breakers for Graceful Degradation -- Tier-Based Criticality Preserves Core Flow During Incidents | Resilience |

---

### 7.5 Maps & Navigation Service [View](../7.5-maps-navigation-service/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | Contraction Hierarchies -- 1000× Speedup for Route Queries Through Node-Importance Preprocessing | Algorithms |
| 2 | Tile Pyramid -- Quadtree-Based Geographic Decomposition Enables Efficient Rendering at Any Scale | Data Modeling |
| 3 | CDN-First Tile Serving -- At 35M Req/Sec, the CDN IS the System, Not a Cache Layer | Caching |
| 4 | Vector Tiles Enable Client-Side Rendering -- 60-75% Bandwidth Reduction and Runtime Style Customization | Scaling |
| 5 | Map Matching with Hidden Markov Models -- HMM-Based Viterbi Decoding Snaps Noisy GPS to Road Segments | Algorithms |
| 6 | Crowdsourced Probe Vehicle Traffic at Scale -- Millions of Navigation Sessions Provide Global Coverage | Scaling |
| 7 | In-Memory Road Graph for Sub-Second Routing -- Disk-Based Graph Traversal Is 100× Too Slow for Production | Scaling |
| 8 | Hierarchical Geocoding with Fuzzy Matching -- Country-Specific Parsing + Spatial Ranking for Diverse Address Formats | Data Modeling |
| 9 | Geopolitical Sensitivity in Map Data -- Disputed Borders Require Multi-Version Tile Serving by User Country | Data Modeling |
| 10 | Delta Tile Invalidation on Road Network Change -- Surgical Bounding-Box Invalidation Over Full Pyramid Rebuild | Caching |
| 11 | Bidirectional Search for Faster Pathfinding -- Simultaneous Source + Destination Search Halves Explored Space | Algorithms |
| 12 | Traffic Time-Slice Historical Profiles + Real-Time Blend -- Confidence-Weighted Blending Handles Sparse Live Data | Traffic |
| 13 | Hybrid Tile Generation -- Pre-Render Low Zoom, On-Demand High Zoom Exploits Zipf Distribution of Requests | Caching |
| 14 | Offline-First Navigation with On-Device Routing -- Downloaded Region Packages Enable Full Navigation Without Network | Resilience |

---

### 7.6 Flight Booking System [View](../7.6-flight-booking-system/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | GDS as External Authoritative System -- Circuit Breaker Pattern When Inventory Truth Lives Outside the Platform | Resilience |
| 2 | Two-Phase Seat Hold with TTL Expiry -- Lease-Based Concurrency Control Delegates Authority to the GDS | Contention |
| 3 | Aggressive Search Result Caching with Stale Re-Verification -- Cache Broadly for Browsing, Verify Narrowly at Booking | Caching |
| 4 | Saga Pattern for Multi-Step Booking with Compensating Transactions -- Four-System Transaction with No Distributed Lock | Resilience |
| 5 | Fare Rules as a Domain-Specific Rule Engine -- ATPCO's 31 Categories Require First-Class Architectural Treatment | Data Modeling |
| 6 | Fan-Out Search Aggregation with Timeout Isolation -- Per-Provider Timeouts Prevent Slowest Source from Penalizing All | Scaling |
| 7 | NDC vs. GDS: Direct vs. Intermediary Trade-off -- Mid-Transition Industry Requires Hybrid Architecture | External Dependencies |
| 8 | Inventory Race Condition -- Optimistic Display for Search, Authoritative GDS Resolution at Booking | Contention |
| 9 | PNR as Universal Aviation Record -- Distributed Synchronized Record Shared Across GDS, Airlines, and Agents | Data Modeling |
| 10 | Revenue Management: Load Factor + Time-to-Departure Pricing -- Two Primary Signals for Perishable Inventory Pricing | Pricing |
| 11 | APIS Compliance: Pre-Departure Passenger Data Reporting -- Regulatory Requirements Create Hard Architectural Constraints | External Dependencies |
| 12 | Cache Stampede Prevention for Popular Routes -- Lock-Based Refresh Prevents Redundant GDS Calls on Expiry | Caching |
| 13 | Interline Agreement Graph for Connection Validation -- Partnership Graph Required Beyond Schedule Data | Data Modeling |

---

### 7.7 Hotel Booking System [View](../7.7-hotel-booking-system/09-insights.md)

| # | Insight | Category |
|---|---------|----------|
| 1 | Platform-Owned Inventory: The Consistency Buck Stops Here | Consistency |
| 2 | Calendar Matrix: Multi-Dimensional Inventory as a Data Structure Problem | Data Structures |
| 3 | Intentional Overbooking: Probabilistic Inventory Management | System Modeling |
| 4 | Event-Driven Channel Synchronization: Consistency Across Independent Systems | Resilience |
| 5 | Atomic Conditional Updates: Concurrency Without Distributed Locks | Contention |
| 6 | Search Architecture: Discovery Then Verification | Scaling |
| 7 | Soft Hold with TTL: Balancing Reservation Guarantees and Inventory Utilization | Contention |
| 8 | Rate Management: The Yield Curve as a First-Class Architectural Concept | Cost Optimization |

