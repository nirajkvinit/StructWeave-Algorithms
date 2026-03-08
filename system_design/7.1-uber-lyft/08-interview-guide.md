# Interview Guide

## 45-Minute Pacing Guide

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| 0-5 min | **Clarify & Scope** | Ask about scale, geography, vehicle types, surge requirement | Establish you understand it is a real-time geospatial matching problem, not a CRUD booking system |
| 5-10 min | **High-Level Architecture** | Draw the core components: rider/driver apps, API gateway, dispatch, matching engine, supply service, geo index, trip service, pricing | Name the services; show data flow for the ride request path |
| 10-20 min | **Deep Dive: Matching & Location** | Geospatial indexing (H3 vs geohash), two-phase matching (geo filter + ETA ranking), location ingestion pipeline at 875K writes/s | This is where you differentiate---spend the most time here |
| 20-28 min | **Deep Dive: Surge Pricing** | H3 zone-level demand/supply computation, smoothing, fare lock-in, market-clearing mechanism | Show you understand the economics, not just the engineering |
| 28-35 min | **Trip State Machine & Reliability** | State transitions, driver crash recovery, payment failure handling, distributed saga | Demonstrate fault tolerance thinking |
| 35-40 min | **Scalability & Trade-offs** | City-based sharding, why geo index fits in memory, failure modes, degradation hierarchy | Proactively discuss what happens when things fail |
| 40-45 min | **Wrap Up** | Summarize key decisions, mention what you'd explore further (ML-based matching, pool rides, multi-stop) | Leave the interviewer with a clear mental model |

---

## Opening Talking Points

Start with these to establish credibility:

1. **"This is fundamentally a real-time geospatial matching problem at write-heavy scale."** Establishes you understand the core challenge---not just "connect rider to driver."

2. **"The key tension is between location freshness and matching latency. Drivers update locations every 4 seconds, and we need to match within 1 second."** Shows you understand the real-time constraints.

3. **"I'll focus on three pillars: the geospatial index for driver tracking, the two-phase matching engine, and surge pricing as a supply-demand balancing mechanism."** Gives the interviewer a roadmap.

4. **"At Uber's scale---28M trips/day, 875K location updates per second---the architecture must be write-optimized for the location pipeline and read-optimized for the matching path."** Anchors the discussion with concrete numbers.

---

## 10 Likely Interview Questions

### 1. How do you find the nearest available driver?

**Expected Answer**: Use H3 hexagonal grid (not a database query). Encode rider's location to H3 cell at resolution 9. Query the in-memory index for drivers in that cell and expanding rings of adjacent cells. Filter by status (AVAILABLE) and vehicle type. This is Phase 1 (geo filter, <50ms). Then compute driving ETA for top 5 candidates using the routing engine (Phase 2, <500ms). Rank by composite score (ETA weight 50%, acceptance rate 20%, rating 15%, heading alignment 15%).

**Key insight**: Nearest by straight-line distance is NOT necessarily fastest to arrive. A driver 2km away heading toward you on the same road beats a driver 1km away across a highway.

### 2. Why H3 hexagonal grid instead of geohash?

**Expected Answer**: Three advantages: (1) Uniform cell area---a geohash cell at the same precision varies in size by latitude, so a 5km radius search in Reykjavik and Mumbai would cover different areas. H3 cells are consistent. (2) Equidistant neighbors---each hexagon has exactly 6 neighbors at equal distance, making ring queries natural. Geohash rectangles have 8 neighbors at varying distances. (3) No boundary artifacts---geohash cells can split a neighborhood boundary; two adjacent geohash cells may require searching 4 cells total due to edge effects.

### 3. How does surge pricing work?

**Expected Answer**: Surge is computed per H3 resolution-7 zone (neighborhood-level, ~5 km2) every 60-120 seconds. Count open ride requests (demand) and available drivers (supply) in each zone, including adjacent zones at reduced weight. Compute demand/supply ratio. Map ratio to multiplier via a configurable lookup table. Apply smoothing (max 0.5x change per interval) and regulatory caps. Publish updated multipliers to a cache. Ride requests read the pre-computed multiplier---no computation at request time.

**Economic insight**: Surge is not price gouging---it is a market-clearing mechanism. Higher prices increase supply (drivers go online or relocate) and decrease demand (riders who can wait, do), converging to equilibrium.

### 4. What happens if the driver declines or doesn't respond?

**Expected Answer**: The offer has a 15-second timeout. If declined or expired, the dispatch service re-dispatches to the next best candidate (from the original candidate list or a new query with expanded radius). Maximum 3 attempts. If all 3 fail, the rider is notified that no drivers are available. Each dispatch attempt is logged in the TRIP_OFFER table for analytics (understanding decline patterns, optimizing matching).

### 5. How do you handle GPS spoofing?

**Expected Answer**: Multi-signal validation: (1) Impossible speed detection---if two consecutive location updates imply >200 km/h, flag it. (2) Teleportation detection---if a driver "jumps" 10km in 10 seconds. (3) Sensor cross-check---compare GPS with cell tower triangulation. (4) Mock location API detection on Android. (5) Route plausibility---if trip route distance exceeds 3x straight-line distance, investigate. Flagged drivers are reviewed and potentially deactivated.

### 6. How do you scale the location ingestion pipeline for 875K updates/second?

**Expected Answer**: Tiered pipeline: Driver app -> WebSocket gateway -> Message queue (partitioned by driver_id) -> Consumer workers -> In-memory geospatial index. Key optimizations: (1) Partition by driver_id for ordering guarantees. (2) Filter stationary drivers (~40% reduction in index writes). (3) Deduplicate within 1-second windows. (4) City-based sharding of the geo index (no city exceeds ~75K updates/s). The message queue absorbs bursts; consumers auto-scale based on lag.

### 7. What if the matching service goes down?

**Expected Answer**: Matching engine is stateless---it reads from the geo index and routing engine. Immediate failover to standby instances. If the routing engine is also down (so ETA computation is impossible), fall back to distance-only matching: rank candidates by straight-line distance instead of driving ETA. Less accurate but keeps matching operational. This is Level 3 in the degradation hierarchy.

### 8. How does the trip state machine handle driver app crashes?

**Expected Answer**: (1) Heartbeat-based health check---driver app sends heartbeats every 10 seconds. Three missed heartbeats trigger a health check. (2) State digest on phone---the dispatch system sends an encrypted state digest to the driver app. On reconnection, the app returns the digest for rapid state recovery. (3) Trip continuity---the trip stays in its current state (e.g., IN_PROGRESS) during the gap; the rider sees the last known driver location. (4) Orphan detection---if the driver doesn't reconnect within 5 minutes, alert the safety team and offer the rider support options.

### 9. How do you handle multi-city deployment?

**Expected Answer**: City-based sharding. Each city (or region) has its own geospatial index, trip data partition, and surge computation. A trip in Mumbai never queries driver data in London. Regional data centers serve nearby cities for low latency. User profiles are replicated across regions (for traveling users) with eventual consistency. Analytics data is aggregated to a global warehouse asynchronously.

### 10. How is the ETA computed?

**Expected Answer**: ETA is computed by the routing engine using the road network graph, real-time traffic data, and turn penalties. For matching, ETAs are computed in parallel for the top 5 candidates (each ~100ms). Caching strategies: (1) Grid-to-grid ETA matrix pre-computed between H3 resolution-7 cell centers. (2) Popular route cache for frequent origin-destination pairs (airports, stations). (3) Fallback: straight-line distance * road factor (1.4) / average speed if routing engine is unavailable.

---

## Trade-offs to Proactively Raise

| Decision | Trade-off | Why This Choice |
|----------|-----------|-----------------|
| **In-memory geo index vs. database spatial index** | Memory cost vs. write throughput | 460MB of memory is trivial; 875K writes/s to a database is not feasible |
| **H3 vs. geohash** | Uber-specific library vs. industry standard | H3's uniform cells and equidistant neighbors make proximity queries consistent globally |
| **Two-phase matching (geo + ETA) vs. ETA-only** | Accuracy vs. latency | Computing ETA for all drivers in a city (~100K) would take minutes; geo filter narrows to 5-10 candidates in microseconds |
| **Event-driven location pipeline vs. direct writes** | Latency (adds ~1s) vs. throughput | Direct writes to the geo index at 875K/s would overwhelm it; the queue provides buffering and ordering |
| **City-based sharding vs. global index** | Operational complexity vs. data locality | A global index is unnecessary (no cross-city queries) and would introduce latency for distant cities |
| **Persistent trip state machine vs. in-memory state** | Write overhead vs. durability | Every state transition is a database write (~20ms), but trip states CANNOT be lost |
| **Surge smoothing vs. instant adjustment** | Responsiveness vs. stability | Instant surge changes cause oscillation (drivers chase zones, surge spikes/drops rapidly). Smoothing dampens oscillation but delays response to genuine demand changes by ~2 minutes. |
| **Distance-only fallback matching vs. no matching during outage** | Accuracy vs. availability | Distance-only matching produces suboptimal matches (driver 1km away across a river vs. 2km away on the same road) but keeps the platform operational |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---------------|------------------------|-------------|
| "Can you use a standard relational database for driver locations?" | Understanding of write throughput limits | "A relational DB with spatial index handles hundreds of writes/s, not 875K/s. The index would be constantly rebuilding. An in-memory geospatial index with H3 cells handles this because updates are hash map operations (O(1)), not B-tree rebalances." |
| "Why not just compute ETA for all nearby drivers?" | Understanding of computational cost | "There might be 500 available drivers within 5km. Each ETA computation calls the routing engine (~100ms). 500 * 100ms = 50 seconds sequentially, or ~10 seconds with 50 parallel workers. The two-phase approach narrows to 5 candidates first, making it 5 * 100ms = 500ms total." |
| "Why not use a pub/sub model where riders subscribe to nearby driver updates?" | Understanding of scale vs. utility | "With 3.5M drivers updating 250 times/minute each, the pub/sub fan-out would be enormous. A rider only needs nearby drivers when actively requesting a ride (a few seconds), not continuously. Pull-based querying at ride request time is far more efficient." |
| "What if surge pricing is wrong---do you refund?" | Understanding of fare lock-in | "The upfront fare shown to the rider is locked for 5 minutes. The rider confirms at that price. If surge changes after confirmation, the locked fare applies. The final fare may differ from the estimate due to route changes, but the surge component is locked." |
| "How do you prevent drivers from gaming surge?" | Understanding of incentive design | "Drivers who consistently go offline in one zone and reappear in a surge zone are flagged. The system detects patterns: repeated offline/online cycles correlated with surge activation. Additionally, surge zones are small enough (~2.5km radius) that physically relocating takes time, by which point the surge may have subsided." |
| "Can you use a simpler system for a small city with 100 drivers?" | Demonstrate scaling awareness | "Absolutely. For 100 drivers, a simple relational DB with PostGIS handles it fine. The H3 index, message queue pipeline, and multi-shard architecture are solutions to scale problems that don't exist at 100 drivers. Start simple, add complexity as needed. The city-based sharding model supports this: each city can run a simpler or more complex stack independently." |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Starting with the database schema | Misses the core challenge (real-time matching) | Start with the matching problem and location pipeline |
| Treating it as a CRUD application | Ignores real-time and geospatial aspects | Emphasize the event-driven, real-time nature from the start |
| Using a relational database for location tracking | Cannot handle write throughput | Explain in-memory geospatial index with clear justification |
| Ignoring the two-phase matching design | Results in either slow matching or inaccurate matching | Explicitly separate geo filter from ETA ranking |
| Describing surge as "just multiply the price" | Misses the economic and engineering complexity | Explain zone-level computation, smoothing, demand forecasting |
| Forgetting driver app crash scenarios | Ignores the most common failure mode | Discuss heartbeats, state digest, and orphan trip detection |
| Designing a global monolith | Doesn't account for geographic data locality | Explain city-based sharding and why cross-city queries are unnecessary |
| Over-engineering day 1 | Designing for 100M trips/day when asked about 10K | Design for 10x current scale, mention what changes at 100x |

---

## Key Numbers to Memorize

| Number | Context |
|--------|---------|
| **28M** trips/day | Uber's current daily volume |
| **875K** location updates/second | 3.5M drivers * 1 update / 4 seconds |
| **< 1s** matching latency | From ride request to driver notification |
| **< 2s** location ingestion lag | From GPS reading to geospatial index |
| **3.5M** concurrent online drivers | Peak simultaneous location reporters |
| **460 MB** geospatial index size | Fits in memory on a single server |
| **~1,000** trips/second at peak | 3x average of 325 TPS |
| **15 seconds** offer timeout | Time driver has to accept/decline |
| **3 attempts** max re-dispatch | Before "no drivers available" |
| **H3 res 9** for driver indexing | ~0.1 km2 cells, ~174m edge length |
| **H3 res 7** for surge zones | ~5.16 km2 cells, neighborhood-level |
| **1-2 min** surge update interval | How often surge multipliers are recomputed |

---

## Questions to Ask the Interviewer

1. "What's the expected scale---are we designing for a single city, a country, or global deployment?"
2. "Should I include carpooling / shared rides, or focus on single-rider trips?"
3. "Is there a specific vehicle type requirement (economy only, or economy + premium + XL)?"
4. "Should I design the pricing engine (surge) in depth, or can I treat it as a black box?"
5. "How important is the driver side---should I design the driver-facing features in detail?"
6. "Are there regulatory constraints I should consider (surge caps, driver labor classification)?"

---

## Extension Topics (If Time Permits)

If you finish early or the interviewer asks "what else would you add?":

1. **Ride pooling (shared rides)**: Matching becomes a combinatorial optimization---find a driver who can pick up 2-3 riders with overlapping routes. Requires real-time route matching and detour minimization.

2. **Scheduled rides**: Rider books a ride 30 minutes to 24 hours in advance. System must pre-match a driver at the scheduled time without over-committing supply.

3. **Multi-stop trips**: Rider adds intermediate stops. The fare calculation and ETA must account for wait time at each stop.

4. **ML-based matching**: Instead of a hand-tuned scoring function, use a trained model that predicts trip completion probability (considering driver acceptance rate, rider cancellation history, traffic patterns).

5. **Autonomous vehicle integration**: Self-driving vehicles change the matching problem: no driver acceptance step, but fleet positioning and charging/refueling become new constraints.
