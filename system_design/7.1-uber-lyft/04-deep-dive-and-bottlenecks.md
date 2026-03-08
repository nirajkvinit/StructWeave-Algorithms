# Deep Dive & Bottlenecks

## Deep Dive 1: Real-Time Geospatial Index

### The Problem

The geospatial index must support two operations simultaneously:
- **Writes**: 875K location updates per second (3.5M online drivers, each updating every 4 seconds)
- **Reads**: Sub-100ms nearest-neighbor queries for ~1,000 match requests per second

This is fundamentally a **write-heavy spatial index** problem, which disqualifies most traditional spatial indexing solutions (R-trees, database spatial indexes) that optimize for read-heavy workloads.

### Geohash vs. H3 Hexagonal Grid

| Property | Geohash | H3 Hexagonal Grid |
|----------|---------|-------------------|
| Cell shape | Rectangles (varying aspect ratio) | Hexagons (uniform shape) |
| Cell size consistency | Varies by latitude (wider near equator) | Uniform area across the globe |
| Neighbor count | 8 (including diagonals, different distances) | 6 (all equidistant) |
| Boundary artifacts | Cells at different precision levels misalign | Hierarchical: each hex subdivides into 7 child hexes |
| Edge adjacency | Two cells can be geographically close but not adjacent in geohash prefix | Every neighbor is exactly 1 step in any direction |
| Resolution levels | Variable (1-12 characters, each halving a dimension) | 16 fixed resolutions (0-15) |
| Open-source library | Multiple implementations | Uber's open-source H3 library |

**Why H3 wins for ride-hailing:**

1. **Equidistant neighbors**: When searching for nearby drivers, H3's 6 equidistant neighbors mean the search radius is uniform in all directions. Geohash's rectangular cells create directional bias---a driver 1km north may be in a different cell than one 1km east at the same distance.

2. **Uniform cell area**: An H3 resolution-9 cell is ~0.1 km2 everywhere on Earth. A geohash-7 cell varies from 0.6 km2 at the equator to much smaller near the poles, making radius-based queries inconsistent.

3. **Ring queries**: `h3_k_ring(center, k)` returns all cells within k steps, forming a smooth hexagonal ring. This is the natural shape for "find drivers within 3 km" queries.

### Index Architecture

```
PSEUDOCODE: In-Memory Geospatial Index Structure

STRUCTURE GeoIndex:
    // Primary index: H3 cell -> set of driver_ids
    cell_index: HashMap<H3Cell, HashSet<DriverID>>

    // Secondary index: driver_id -> driver location metadata
    driver_index: HashMap<DriverID, DriverLocationEntry>

STRUCTURE DriverLocationEntry:
    driver_id: UUID
    lat: float
    lng: float
    h3_cell: H3Cell       // Resolution 9
    heading: float
    speed_kmh: float
    status: DriverStatus   // AVAILABLE, DISPATCHED, ON_TRIP
    vehicle_type: string
    updated_at: timestamp

// Update operation: O(1) amortized
FUNCTION update(driver_id, lat, lng, heading, speed, timestamp):
    new_cell = h3_encode(lat, lng, RESOLUTION_9)
    old_entry = driver_index.get(driver_id)

    IF old_entry AND old_entry.h3_cell != new_cell:
        cell_index[old_entry.h3_cell].remove(driver_id)
        cell_index[new_cell].add(driver_id)

    ELSE IF NOT old_entry:
        cell_index[new_cell].add(driver_id)

    driver_index[driver_id] = DriverLocationEntry(
        driver_id, lat, lng, new_cell, heading, speed, AVAILABLE, ..., timestamp
    )

// Query operation: O(k^2 * d) where k=ring size, d=avg drivers per cell
FUNCTION query_nearby(center_lat, center_lng, radius_km, vehicle_type, limit):
    center_cell = h3_encode(center_lat, center_lng, RESOLUTION_9)
    k_rings = ceil(radius_km / H3_RES9_EDGE_LENGTH_KM)  // ~0.174 km edge

    results = []
    FOR k IN 0..k_rings:
        ring = h3_k_ring(center_cell, k)
        FOR cell IN ring:
            FOR driver_id IN cell_index.get(cell, []):
                entry = driver_index[driver_id]
                IF entry.status == AVAILABLE AND entry.vehicle_type == vehicle_type:
                    dist = haversine(center_lat, center_lng, entry.lat, entry.lng)
                    IF dist <= radius_km:
                        results.append((driver_id, dist, entry))

        IF len(results) >= limit * 2 AND k >= 2:
            BREAK  // Early termination

    results.sort(by=distance)
    RETURN results[:limit]
```

### Write Throughput Challenge

At 875K writes/second, the index processes approximately:
- **1 update per microsecond** per core
- Each update involves: H3 encoding (~500ns), hash map lookups (~100ns), potential cell migration (~200ns)
- Total per-update cost: ~1 microsecond

**Solution**: Shard the index by city. A large city like NYC has ~100K online drivers, generating ~25K updates/second---easily handled by a single server. The global 875K/s is distributed across thousands of cities, with no city exceeding ~50K updates/second.

### Stale Entry Eviction

Drivers may go offline without explicitly signaling (app crash, phone dies, no network):

```
PSEUDOCODE: Stale Entry Detection

// Background sweep every 30 seconds
FUNCTION evict_stale_drivers():
    threshold = now() - STALE_TTL  // STALE_TTL = 60 seconds (15 missed updates)

    FOR driver_id, entry IN driver_index:
        IF entry.updated_at < threshold AND entry.status != OFFLINE:
            // Driver hasn't sent a location update in 60 seconds
            mark_driver_offline(driver_id)
            cell_index[entry.h3_cell].remove(driver_id)
            publish_event("driver_stale_offline", driver_id)
```

---

## Deep Dive 2: Matching Engine

### Two-Phase Matching Architecture

Matching is the most latency-sensitive operation in the system. The target is <1 second from ride request to driver notification. This is achieved through a two-phase approach:

#### Phase 1: Geo Filter (Fast, Coarse) --- Target: <50ms

Query the geospatial index for all available drivers within a radius of the rider. This is a spatial query, not a routing query---it uses straight-line distance, not driving distance.

- Input: rider location, vehicle type, search radius (starting at 3km)
- Output: 10-50 candidate drivers with their locations
- Cost: O(cells * drivers_per_cell) --- typically <10ms

#### Phase 2: ETA Ranking (Accurate, Expensive) --- Target: <500ms

For the top-K candidates from Phase 1, compute the actual driving ETA using the routing engine. This involves road network traversal, traffic conditions, and turn penalties.

- Input: 5-10 candidate driver locations, rider pickup location
- Output: Ranked candidates by ETA
- Cost: ~50-100ms per routing query, parallelized across candidates

```
PSEUDOCODE: Two-Phase Matching

FUNCTION match_rider_to_driver(rider_location, vehicle_type):
    // Phase 1: Geo filter
    candidates = geo_index.query_nearby(
        rider_location.lat, rider_location.lng,
        radius_km = 5,
        vehicle_type = vehicle_type,
        limit = 10
    )

    IF candidates IS EMPTY:
        RETURN null

    // Phase 2: ETA ranking (parallel ETA computations)
    top_candidates = candidates[:5]  // Only compute ETA for top 5 by distance
    eta_futures = []
    FOR candidate IN top_candidates:
        eta_futures.append(
            async compute_driving_eta(candidate.location, rider_location)
        )

    etas = await_all(eta_futures, timeout=500ms)

    // Rank by composite score
    FOR i, candidate IN enumerate(top_candidates):
        candidate.eta_seconds = etas[i]
        candidate.score = compute_match_score(candidate)

    top_candidates.sort(by=score, descending=true)
    RETURN top_candidates[0]


FUNCTION compute_match_score(candidate):
    // Multi-factor scoring
    eta_score = 1.0 / (1 + candidate.eta_seconds / 300)        // Favor shorter ETA
    rating_score = candidate.driver_rating / 5.0                 // Favor higher-rated drivers
    acceptance_score = candidate.driver_acceptance_rate           // Favor reliable drivers
    direction_score = heading_alignment(candidate.heading, rider_direction)  // Favor drivers heading toward rider

    RETURN (
        0.50 * eta_score +
        0.20 * acceptance_score +
        0.15 * rating_score +
        0.15 * direction_score
    )
```

### Why Nearest != Best

The closest driver by straight-line distance is not always the fastest to arrive:
- A driver 1 km away on the other side of a highway may take 10 minutes due to routing
- A driver 2 km away heading toward the rider on the same road may arrive in 3 minutes
- A driver with a 95% acceptance rate is more valuable than one with 60% (less re-dispatch risk)

This is why the two-phase design exists: Phase 1 is a fast coarse filter; Phase 2 applies expensive but accurate ranking.

---

## Deep Dive 3: Surge Pricing

### Surge as a Market-Clearing Mechanism

Surge pricing is not arbitrary price gouging---it is an economic mechanism that:
1. **Increases supply**: Higher prices attract more drivers to go online or relocate to high-demand zones
2. **Decreases demand**: Higher prices discourage marginal ride requests (riders who can wait or take transit)
3. **Clears the market**: At the right multiplier, available supply matches incoming demand

### Zone Definition and Granularity

Surge is computed per **H3 resolution-7 cell** (~5.16 km2, roughly a neighborhood):

- **Too coarse** (city-wide): A surge in the airport area would raise prices across the entire city, punishing riders in low-demand neighborhoods
- **Too fine** (block-level): Extreme price variation within walking distance, creating arbitrage (walk 200m for a lower price)
- **Just right** (neighborhood, ~2.5 km radius): Captures local supply/demand dynamics; riders within the zone see consistent pricing

### Computation Pipeline

```
PSEUDOCODE: Surge Pricing Pipeline

// Runs every 60-120 seconds per city
FUNCTION compute_city_surge(city_id):
    zones = get_h3_zones_for_city(city_id, resolution=7)
    city_config = get_city_pricing_config(city_id)

    FOR zone IN zones:
        // Count demand: ride requests in last 5 minutes in this zone
        demand = count_requests(
            zone,
            time_window = now() - 5_minutes,
            status IN ["requested", "dispatched"]
        )

        // Count supply: available drivers currently in this zone
        supply = count_drivers(zone, status="available")

        // Include supply from adjacent zones at reduced weight
        adjacent = h3_k_ring(zone, k=1)
        FOR adj IN adjacent:
            supply += count_drivers(adj, status="available") * ADJACENT_WEIGHT  // 0.3-0.5

        // Compute multiplier
        ratio = demand / max(supply, 0.1)  // Prevent division by zero
        raw_multiplier = city_config.surge_curve.interpolate(ratio)

        // Apply constraints
        multiplier = clamp(raw_multiplier, 1.0, city_config.max_surge)

        // Smooth transition (max 0.5x change per interval)
        previous = get_current_surge(zone)
        IF abs(multiplier - previous) > MAX_STEP:
            multiplier = previous + sign(multiplier - previous) * MAX_STEP

        // Store
        store_surge(zone, multiplier, ttl=120_seconds)

    // Publish updated surge map for driver app heat map
    publish_surge_map(city_id)
```

### Spike Detection and Dampening

Sudden demand spikes (concert ending, sports event, rain starting) can cause oscillation if not dampened:

1. **Exponential moving average**: Surge multiplier is EMA of raw values, not the instantaneous ratio
2. **Step limiter**: Maximum change of 0.5x per computation interval
3. **Cooldown**: Once surge activates, minimum duration of 5 minutes before it can drop back to 1.0
4. **Predictive pre-surge**: For known events (concerts, sports), pre-position surge before demand arrives

### Fare Lock-In Window

When a rider sees a surge-priced estimate, the multiplier is locked for 5 minutes:
- Prevents the rider from seeing $20, tapping "confirm" 30 seconds later, and being charged $25 because surge increased
- Implemented as a short-lived fare token stored in cache with TTL

---

## Deep Dive 4: Location Ingestion Pipeline

### The Write Path

875K location updates per second cannot flow directly into the geospatial index. The pipeline is tiered:

```
Driver App
    |
    | (GPS every 4 seconds via WebSocket)
    v
WebSocket Gateway (connection termination, auth validation)
    |
    | (publish to message queue, partitioned by driver_id)
    v
Message Queue (buffering, ordering per driver)
    |
    | (consumer groups, parallel processing)
    v
Location Consumer Workers
    |
    | (validate, deduplicate, filter stationary)
    v
In-Memory Geospatial Index (per-city)
    |
    | (async write to durable store for analytics)
    v
Location History Store (append-only, time-partitioned)
```

### Pipeline Processing Steps

```
PSEUDOCODE: Location Update Processing

FUNCTION process_location_update(event):
    // Step 1: Validate
    IF NOT is_valid_coordinates(event.lat, event.lng):
        drop(event, reason="invalid_coordinates")
        RETURN

    IF event.timestamp < now() - MAX_STALENESS:
        drop(event, reason="stale_update")
        RETURN

    // Step 2: Deduplicate (same driver, same second)
    dedup_key = f"{event.driver_id}:{event.timestamp / 1000}"
    IF dedup_cache.exists(dedup_key):
        drop(event, reason="duplicate")
        RETURN
    dedup_cache.set(dedup_key, ttl=10_seconds)

    // Step 3: Filter stationary drivers (save index writes)
    previous = get_last_location(event.driver_id)
    IF previous AND haversine(previous, event) < 5_meters AND event.speed_kmh < 2:
        // Driver hasn't moved; skip index update but refresh timestamp
        refresh_timestamp(event.driver_id, event.timestamp)
        RETURN

    // Step 4: GPS spoofing detection
    IF previous:
        time_delta = event.timestamp - previous.timestamp
        distance = haversine(previous, event)
        implied_speed = distance / time_delta * 3600  // km/h
        IF implied_speed > MAX_PLAUSIBLE_SPEED:  // e.g., 200 km/h
            flag_for_review(event.driver_id, "impossible_speed", implied_speed)
            drop(event, reason="gps_spoofing_suspected")
            RETURN

    // Step 5: Update geospatial index
    geo_index.update(event.driver_id, event.lat, event.lng, event.heading, event.speed_kmh, event.timestamp)

    // Step 6: Async persist to location history (for analytics, trip reconstruction)
    async_write_to_history(event)
```

### Partition Strategy for Message Queue

Location updates are partitioned by `hash(driver_id) % num_partitions`:
- Ensures all updates for a single driver are processed in order (prevents out-of-order location jumps)
- Enables parallel processing across partitions (each partition handled by one consumer)
- 256-512 partitions per city is sufficient for even the largest cities

### Stationary Driver Optimization

In a large city, ~40% of online drivers are stationary at any moment (waiting at a stand, stuck in traffic, parked). Filtering stationary updates reduces index writes by ~40% (from 875K/s to ~525K/s of actual cell-changing updates).

---

## Deep Dive 5: Trip State Machine Reliability

### The Challenge

A trip is a distributed workflow involving two mobile clients (rider app, driver app), multiple backend services (dispatch, trip, payment, notification), and unreliable network connections. The state machine must be:
- **Durable**: No trip state can be lost
- **Consistent**: A trip is always in exactly one state
- **Idempotent**: Repeated state transitions produce the same result
- **Recoverable**: Any component failure can be recovered from

### State Machine Implementation

```
PSEUDOCODE: Trip State Machine

VALID_TRANSITIONS = {
    "requested":       ["dispatched", "cancelled", "no_drivers"],
    "dispatched":      ["accepted", "requested"],  // "requested" for re-dispatch
    "accepted":        ["driver_en_route", "cancelled"],
    "driver_en_route": ["driver_arrived", "cancelled"],
    "driver_arrived":  ["in_progress", "cancelled"],
    "in_progress":     ["completed", "cancelled"],
    "completed":       [],  // Terminal state
    "cancelled":       [],  // Terminal state
    "no_drivers":      [],  // Terminal state
}

FUNCTION transition_trip(trip_id, new_status, metadata):
    // Step 1: Load current state with pessimistic lock
    trip = load_trip_with_lock(trip_id)

    // Step 2: Validate transition
    IF new_status NOT IN VALID_TRANSITIONS[trip.status]:
        RAISE InvalidTransitionError(
            f"Cannot transition from {trip.status} to {new_status}"
        )

    // Step 3: Idempotency check (same transition already applied)
    IF trip.status == new_status:
        RETURN trip  // Already in this state; idempotent

    // Step 4: Apply transition
    old_status = trip.status
    trip.status = new_status
    trip.updated_at = now()
    apply_metadata(trip, new_status, metadata)

    // Step 5: Persist atomically
    BEGIN TRANSACTION
        UPDATE trips SET status = new_status, ... WHERE id = trip_id AND status = old_status
        INSERT INTO trip_status_log (trip_id, old_status, new_status, timestamp, actor)
    COMMIT

    // Step 6: Trigger side effects (async, via event queue)
    publish_event("trip_status_changed", {
        trip_id: trip_id,
        old_status: old_status,
        new_status: new_status,
        metadata: metadata
    })

    RETURN trip
```

### Driver App Crash Recovery

If the driver's app crashes mid-trip:

1. **Heartbeat detection**: The driver app sends heartbeats every 10 seconds during an active trip. If 3 consecutive heartbeats are missed (30 seconds), the trip enters a "health check" state.

2. **State digest on driver phone**: The dispatch system sends an encrypted state digest to the driver's app. On reconnection, the app sends this digest back, enabling rapid state recovery without server-side replay.

3. **Trip continuation**: When the driver app reconnects, it queries the trip service for current state, receives the latest trip data, and resumes seamlessly. The rider continues to see the last known driver location until updates resume.

4. **Orphan trip detection**: If the driver doesn't reconnect within 5 minutes during an in-progress trip, the system:
   - Alerts the safety team
   - Sends the rider a notification with safety options
   - Estimates the fare based on the last known route progress
   - Keeps the trip in IN_PROGRESS until manual resolution

### Payment Failure Handling

If payment fails after trip completion:

```
Trip status: COMPLETED (this never changes---the trip physically happened)
Payment status: FAILED

Recovery flow:
1. Retry charge with exponential backoff (1min, 5min, 30min, 2hr)
2. Try alternate payment method on file
3. Add outstanding balance to rider's account
4. Block new ride requests until balance is settled
5. If never settled, route to collections after 30 days
```

The key insight: **trip completion and payment are decoupled**. The trip state machine reaches COMPLETED based on physical completion, not payment success. Payment is a separate workflow that can retry independently.

---

## Bottleneck Analysis

### Top 3 Bottlenecks

| Rank | Bottleneck | Impact | Mitigation |
|------|-----------|--------|------------|
| 1 | **Location write throughput** | 875K writes/s to geospatial index | City-based sharding; stationary driver filtering; message queue buffering |
| 2 | **ETA computation latency** | Routing engine is the slowest step in matching (~100ms per query) | Parallel ETA calls for top-K candidates; ETA caching for popular origin-destination pairs; pre-computed ETA matrices for hotspots |
| 3 | **WebSocket connection scale** | 4M+ concurrent connections across drivers and riders | Horizontal WebSocket gateway with connection-level affinity; regional deployment; connection pooling |

### Concurrency and Race Conditions

| Race Condition | Scenario | Mitigation |
|---------------|----------|------------|
| Double dispatch | Two dispatchers send offers to the same driver simultaneously | Distributed lock on driver_id with short TTL (20s); optimistic locking with version check |
| Concurrent trip accept | Driver taps accept twice (double-tap) | Idempotent state transition; database-level `WHERE status = 'dispatched'` guard |
| Surge read-during-write | Rider reads surge while pricing service is recomputing | Surge multiplier has TTL; readers always see a valid (possibly slightly stale) value |
| Payment double-charge | Network timeout causes retry of already-successful charge | Idempotency key per trip; payment processor deduplication |
| Location update ordering | Out-of-order GPS updates due to network jitter | Partition by driver_id ensures ordering; timestamp comparison rejects older updates |
