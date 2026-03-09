# Interview Guide — Fleet Management System

## 1. 45-Minute Pacing Guide

### Phase 1: Requirements Clarification (5 minutes)

**What to establish upfront:**

| Question | Why It Matters |
|---|---|
| "What type of fleet — delivery, long-haul trucking, field service, or mixed?" | Determines route optimization constraints (many short stops vs. few long hauls), ELD applicability |
| "How many vehicles are we designing for?" | 1K vs. 100K vs. 1M vehicles fundamentally changes architecture (single DB vs. geo-partitioned, single region vs. multi-region) |
| "What's the GPS update frequency requirement?" | Every 1 second vs. every 60 seconds: 60x difference in telemetry volume |
| "Do we need compliance features (ELD, HOS, IFTA)?" | Adds edge computing requirement, exactly-once delivery semantics, tamper resistance |
| "Is route optimization needed, or just tracking?" | Route optimization adds the NP-hard solver — a major component |
| "What regions — single country or global?" | Multi-region adds data residency, GDPR considerations, timezone complexity |

**Clarifying questions that impress interviewers:**
- "Should we handle both real-time tracking AND historical route replay, or just one?"
- "Do vehicles have reliable cellular connectivity, or do we need to handle extended offline periods?"
- "Are we optimizing routes once per day or dynamically re-optimizing throughout the day?"
- "Do we need to send commands to vehicles (remote lock, engine cutoff), or is this read-only telemetry?"

### Phase 2: High-Level Architecture (10 minutes)

**Draw these components on the whiteboard:**

1. **Vehicle Edge Layer** — Telematics unit with GPS, OBD-II, sensors, edge compute
2. **Vehicle Gateway** — MQTT broker cluster for device-to-cloud communication
3. **Stream Processing Layer** — Telemetry ingestion, normalization, geofence evaluation, CEP
4. **Core Services** — Organized by domain:
   - Tracking domain (position, history, spatial queries)
   - Route & dispatch domain (optimization engine, job assignment, ETA)
   - Fleet operations (driver, maintenance, fuel)
   - Compliance (ELD/HOS, IFTA)
5. **Data Layer** — Time-series DB (telemetry), geospatial DB (locations), relational DB (entities), cache (current positions)
6. **AI/ML Layer** — Predictive maintenance, driver scoring, ETA prediction

**Key narrative:** "The core insight is that this is a dual-timescale system. The tracking pipeline operates in real-time—every GPS update must be processed in under 3 seconds for dispatch decisions. But route optimization is computationally intensive, solving NP-hard problems over seconds to minutes. The architecture cleanly separates these two pipelines with an event streaming platform bridging them, so real-time tracking isn't bottlenecked by optimization, but changes in one can trigger the other."

### Phase 3: Deep Dive (20 minutes)

The interviewer will likely ask you to dive into one of these areas. Be prepared for all:

**Option A: Real-Time GPS Tracking at Scale**
- MQTT broker scaling for 500K+ concurrent connections
- Telemetry pipeline: normalize → deduplicate → enrich → geofence → store
- Time-series database for high-frequency writes (100K+ writes/sec)
- Current position cache design (in-memory geospatial index)
- GPS noise filtering (Kalman filter for outlier rejection)
- Adaptive reporting frequency (save bandwidth, increase when needed)

**Option B: Route Optimization Engine**
- VRPTW is NP-hard — explain why exact solvers don't work at scale
- Metaheuristic approach: construct initial solution → improve via simulated annealing
- Distance/time matrix pre-computation and caching
- Constraint handling: time windows, vehicle capacity, driver hours, skill matching
- Dynamic re-optimization for new orders, traffic incidents, breakdowns
- Quality measurement: compare against lower bound, not "optimal"

**Option C: Geofence Evaluation at Scale**
- Multi-level spatial filtering: geohash grid → bounding box → point-in-polygon
- 80,000x speedup over naive approach
- Geofence state management per vehicle (entry/exit detection requires state)
- Complex polygon handling: R-tree on polygon edges for large geofences
- Real-time alert generation and delivery pipeline

**Option D: Edge-Cloud Architecture**
- Why edge computing is mandatory (connectivity loss, compliance requirements)
- Store-and-forward protocol with exactly-once delivery semantics
- ELD/HOS state machine running on device
- Conflict resolution when edge and cloud states diverge
- Tamper-resistant design for compliance data

### Phase 4: Trade-offs and Extensions (10 minutes)

**Key trade-offs to discuss proactively:**

| Trade-off | Option A | Option B | Your Recommendation |
|---|---|---|---|
| **GPS storage** | Store every raw point (full fidelity) | Downsample to reduce storage 90% | Store raw for 90 days, downsample for long-term |
| **Route optimization quality vs. speed** | Spend 5 minutes for near-optimal | Return good-enough in 10 seconds | Configurable time budget; default 30s; show quality score |
| **Geofence evaluation** | Evaluate all geofences for every update | Only evaluate when vehicle crosses geohash boundary | Geohash-triggered evaluation with cached state |
| **Vehicle-to-cloud protocol** | MQTT (IoT standard, low overhead) | gRPC (richer, bidirectional streaming) | MQTT for telemetry, gRPC for commands/config |
| **Edge computation** | Thin client (send everything raw) | Smart edge (filter, aggregate, local decisions) | Smart edge for compliance and bandwidth savings |

---

## 2. Common Interview Questions

### 2.1 System Design Questions

**Q: "How would you handle a vehicle that goes offline for 12 hours and then reconnects with a large backlog of data?"**

**Strong answer:**
"The edge unit has a 72-hour local buffer with encrypted flash storage. During the offline period, it continues recording GPS, engine data, and ELD events. On reconnect, it establishes an MQTT session and drains the buffer in chronological order, tagging each event with `buffered: true` and the original device timestamp. The server processes these with the same pipeline but uses device_sequence numbers for deduplication and ordering. I'd throttle the backfill to prevent overwhelming the ingestion pipeline—interleaving buffered events with real-time events from other vehicles. ELD events get priority in the buffer (never dropped), while GPS data uses a circular buffer (oldest dropped first if buffer fills). The key challenge is that geofence evaluations for buffered events must be processed in order to correctly detect entry/exit sequences."

**Q: "How would you find the nearest available vehicle to a pickup point?"**

**Strong answer:**
"The current position cache maintains an in-memory geospatial index—either an R-tree or an S2 cell index—of all active vehicle positions, updated with every GPS ping. For a nearest-vehicle query:
1. Start at the geohash cell of the pickup point
2. Expand outward to neighboring cells in concentric rings
3. Collect candidate vehicles from each ring
4. Filter by status (available, not on break, has required capacity/certifications)
5. Calculate actual road-network distance for top 10 candidates (not just Euclidean)
6. Return ranked results

The geohash approach is efficient because it avoids scanning all 500K vehicles—typically, the first 1-3 rings (covering ~25km²) contain enough candidates. For sparse areas, we expand further. The cache is replicated across API instances for read scalability."

### 2.2 Scale Questions

**Q: "How do you handle 100,000 GPS updates per second?"**

**Strong answer:**
"The pipeline is designed for horizontal scaling at every stage:
1. **MQTT layer**: Topic-based partitioning across broker nodes; each broker handles ~50K connections
2. **Stream processing**: Partitioned by vehicle_id; each partition processes independently; add partitions to scale
3. **Time-series writes**: Batch micro-writes (100ms windows) for throughput; partition by vehicle_id + time chunk
4. **Position cache**: Single write per vehicle (last position only); 500K entries × 500 bytes = 250MB fits in memory

The key insight is that vehicle telemetry is embarrassingly parallel—each vehicle's data is independent. There are no cross-vehicle transactions in the hot path. The only cross-vehicle operation is spatial queries (nearest vehicle), which use a separate read-optimized index."

**Q: "What happens during a morning spike when all fleets request route optimization simultaneously?"**

**Strong answer:**
"Route optimization has a fundamentally different load pattern than tracking—it's CPU-intensive and bursty. I'd design for this with:
1. **Async processing**: Route requests go to a priority queue; return immediately with a poll URL
2. **Worker pool auto-scaling**: Pre-warm workers before 6 AM based on historical patterns; scale to 10x baseline by 8 AM
3. **Tiered quality**: Offer 'quick' (5s budget, good-enough solution) and 'thorough' (60s budget, near-optimal) modes
4. **Warm start**: Use yesterday's route as the initial solution—often only 10-20% of stops change day-to-day, so the optimizer starts close to optimal
5. **Load shedding**: If queue depth exceeds threshold, return the warm-start solution immediately and offer to improve asynchronously"

### 2.3 Trade-off Questions

**Q: "Why MQTT over HTTP for vehicle communication?"**

**Strong answer:**
"Three reasons: (1) MQTT has 2-byte fixed header overhead vs. HTTP's ~500-byte headers—critical when each vehicle sends thousands of messages daily over cellular networks; (2) MQTT maintains persistent connections with session state, so the broker knows when a vehicle disconnects (Last Will and Testament) and can queue messages for offline devices; (3) MQTT's pub/sub model naturally fits the telemetry pattern—vehicles publish, multiple backend services subscribe.

The trade-off is that MQTT is less natural for request-response patterns (sending commands to vehicles). I'd use MQTT for the telemetry firehose (vehicle → cloud) and a thin REST/gRPC layer for low-frequency commands (cloud → vehicle), with the edge unit subscribing to a vehicle-specific MQTT topic for commands."

**Q: "Time-series DB vs. relational DB for telemetry—why not just use a relational database?"**

**Strong answer:**
"At 100K writes/sec, a relational database would struggle for three reasons: (1) Write amplification—relational DBs maintain B-tree indexes that require random I/O on every write; time-series DBs use LSM-trees optimized for sequential writes; (2) No built-in downsampling—I'd need custom jobs to aggregate old data, while time-series DBs have continuous aggregation as a core feature; (3) Compression—time-series DBs exploit temporal correlation (GPS coordinates change slowly) for 10x better compression.

The trade-off is that time-series DBs have limited join capabilities. Fleet/driver/vehicle master data stays in a relational DB, and I join context at query time or enrich at ingestion. For 99% of telemetry queries, the only key is (vehicle_id, time_range)—perfect for time-series."

**Q: "How do you handle the accuracy vs. latency trade-off in route optimization?"**

**Strong answer:**
"VRPTW is NP-hard, so there's a fundamental tension between solution quality and computation time. I handle this with a configurable time budget and quality scoring:

- The optimizer runs a metaheuristic (simulated annealing or large neighborhood search) that progressively improves the solution
- At any point, the current best solution is valid and feasible—just potentially suboptimal
- When the time budget expires, we return the best solution found, along with a quality score (ratio of solution cost to computed lower bound)
- A 5-second budget typically finds solutions within 8-10% of optimal; 30 seconds gets within 3-5%; 60 seconds within 1-3%

For the interview, the key insight is that the marginal improvement decreases rapidly—the first 5 seconds find 90% of the value, the next 55 seconds find the last 10%. So for most fleets, the 'quick' mode is good enough."

---

## 3. Trap Questions and Common Mistakes

### 3.1 Trap Questions

**Trap: "Can we use a single relational database for everything?"**

**Why it's a trap:** The interviewer wants to see if you understand why different data types need different storage engines.

**Correct response:** "A single relational DB works for a small fleet (< 1K vehicles). But at scale, telemetry is write-heavy with time-range queries (time-series DB), location data needs spatial indexing (geospatial DB or PostGIS), and entity data needs joins and transactions (relational DB). Using one DB for all three means it's optimal for none. I'd start with a well-designed relational DB with PostGIS for a startup, then split out the time-series data first as scaling demands it."

**Trap: "Why not just poll each vehicle for its position?"**

**Why it's a trap:** Tests understanding of push vs. pull at IoT scale.

**Correct response:** "Polling 500K vehicles would require the server to maintain 500K outbound connections and send 500K requests every few seconds—massive overhead. With MQTT pub/sub, vehicles push updates only when they have new data, and the server receives them on persistent connections. This also naturally handles adaptive frequency (vehicle decides when to send) and works better with cellular networks where the device has a NAT'd IP address that's hard to reach from outside."

**Trap: "Can we just use Dijkstra's algorithm for route optimization?"**

**Why it's a trap:** Dijkstra finds the shortest path between two points. Route optimization is the Vehicle Routing Problem—assigning multiple stops to multiple vehicles with constraints. These are entirely different problems.

**Correct response:** "Dijkstra solves point-to-point shortest path, which we use as a subroutine to build the distance/time matrix. But route optimization—assigning 200 stops to 20 vehicles with time windows, capacity limits, and driver hours—is a Vehicle Routing Problem, which is NP-hard. We need metaheuristic algorithms like simulated annealing or genetic algorithms for this. Dijkstra is O(E log V); VRPTW has no polynomial-time solution."

### 3.2 Common Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Ignoring connectivity loss | Vehicles WILL go offline in tunnels, rural areas | Design edge store-and-forward from day one |
| Storing GPS in relational DB | Write throughput and storage efficiency issues at scale | Use purpose-built time-series database |
| Treating route optimization as simple pathfinding | VRP is fundamentally different from shortest path | Explain NP-hardness; describe metaheuristic approach |
| Skipping geospatial indexing | "Just check every geofence for every update" | Show multi-level spatial filtering (geohash → bbox → PIP) |
| Overlooking compliance requirements | ELD/HOS is legally mandated in many jurisdictions | Discuss edge-first compliance architecture |
| Single-region design | Fleet operations span continents | Design for multi-region from the start |
| Ignoring cellular bandwidth costs | Treating vehicle connectivity as free | Discuss adaptive frequency, compression, delta encoding |
| Not discussing driver privacy | GDPR applies to driver location data in many regions | Show awareness of privacy-by-design principles |

---

## 4. Interview Scoring Rubric

### 4.1 What Strong Candidates Demonstrate

| Signal | Evidence | Level |
|---|---|---|
| **IoT expertise** | Discusses MQTT, edge computing, store-and-forward, device management | Staff |
| **Geospatial thinking** | Uses geohash/R-tree/S2 cells naturally; designs spatial queries efficiently | Staff |
| **NP-hard awareness** | Explains why exact routing solvers fail; proposes metaheuristics | Senior+ |
| **Time-series data modeling** | Discusses downsampling, retention, compression, continuous aggregation | Senior+ |
| **Edge-cloud architecture** | Designs for disconnected operation, eventual sync, conflict resolution | Staff |
| **Scale reasoning** | Back-of-envelope: 500K vehicles × 10s interval = 50K GPS/sec; plans accordingly | Senior |
| **Compliance awareness** | Mentions ELD/FMCSA, GDPR, data retention without prompting | Senior+ |
| **Multi-protocol design** | MQTT for telemetry, gRPC for services, REST for APIs, WebSocket for dashboards | Senior |

### 4.2 Red Flags

| Red Flag | What It Suggests |
|---|---|
| "Use HTTP polling for vehicle updates" | Doesn't understand IoT communication patterns |
| "Store everything in a relational database" | Hasn't considered write volume or spatial queries |
| "Use Dijkstra for route optimization" | Confusing shortest path with vehicle routing |
| "Assume reliable connectivity" | Hasn't worked with mobile/IoT systems |
| "Process all geofences for every GPS update" | Missing spatial indexing knowledge |
| "Route optimization runs in milliseconds" | Doesn't understand NP-hardness |
| No mention of data retention or compliance | Missing enterprise system awareness |

---

## 5. Extension Scenarios

If time permits or the interviewer asks for extensions:

### 5.1 Electric Vehicle Fleet
- Battery level monitoring as additional telemetry
- Charging station integration in route optimization (range constraints)
- Energy-efficient routing (avoid hills, prefer regenerative braking opportunities)
- Charging schedule optimization (fleet-wide, accounting for electricity rates)

### 5.2 Autonomous Vehicle Integration
- Higher-frequency sensor data (LiDAR, cameras) — 10-100x telemetry volume
- Remote monitoring and intervention capability
- Safety-critical communication with ultra-low latency requirements
- V2X (Vehicle-to-Everything) communication integration

### 5.3 Multi-Modal Transportation
- Integrate trucking with rail, air freight, and last-mile delivery
- Cross-modal handoff tracking at transfer points
- Unified route optimization across transportation modes
- Container tracking across modes (IoT on cargo, not just vehicle)

---

*Next: [Insights →](./09-insights.md)*
