# Deep Dive & Bottlenecks

## Deep Dive 1: Dispatch & Driver Matching System

### 1.1 The Core Problem

Dispatch is the heart of a food delivery system. Every order requires answering: *which driver, when, and should this order be batched with another?* DoorDash's dispatch engine (DeepRed) solves this as a mixed-integer optimization problem with ML predictions feeding the objective function. The system must make decisions in under 30 seconds while competing with thousands of concurrent dispatch requests for the same pool of available drivers.

### 1.2 Multi-Layer Architecture

```mermaid
%%{init: {'theme': 'neutral', 'look': 'neo'}}%%
flowchart TB
    subgraph Input["Input Layer"]
        OE["Order Event<br/>(from Kafka)"]
        DL["Driver Locations<br/>(from Redis Geo)"]
        ML["ML Predictions<br/>(acceptance rate,<br/>ETA, prep time)"]
    end

    subgraph Dispatch["Dispatch Engine"]
        CG["Candidate Generator<br/>GEORADIUS query"]
        SC["Scoring Layer<br/>Multi-factor score"]
        OPT["Optimizer<br/>Mixed-Integer Program"]
        BA["Batch Analyzer<br/>Route optimization"]
        TD["Timing Decider<br/>When to dispatch"]
    end

    subgraph Output["Output Layer"]
        OF["Driver Offer<br/>(push to driver)"]
        RE["Re-Assignment Queue<br/>(if declined)"]
        AN["Analytics<br/>(dispatch metrics)"]
    end

    OE --> CG
    DL --> CG
    CG --> SC
    ML --> SC
    SC --> OPT
    OPT --> BA
    BA --> TD
    TD --> OF
    OF --> RE
    TD --> AN

    classDef input fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef dispatch fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef output fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class OE,DL,ML input
    class CG,SC,OPT,BA,TD dispatch
    class OF,RE,AN output
```

### 1.3 Geo-Index: Redis GEOADD + GEORADIUS

The dispatch engine's first step is finding candidate drivers near the restaurant. This is a **read-from-write-heavy-index** problem: 100K location writes/sec feed the index that dispatch reads hundreds of times per second.

**How it works:**
- Each city has its own Redis geo key: `active_drivers:{city_id}`
- Driver Location Service calls `GEOADD active_drivers:chicago lng lat driver_123` on every 5-second update
- Dispatch calls `GEORADIUS active_drivers:chicago lng lat 5 km ASC COUNT 20` to find the 20 nearest available drivers
- GEORADIUS is O(N+M) where N = elements in the sorted set within the bounding box and M = returned results

**Why Redis Geo over H3 for food delivery:** Unlike ride-hailing where H3's uniform hexagonal cells are critical for precision matching, food delivery has a wider acceptable radius (3-8 km vs. 1-3 km for ride-hailing) and lower match frequency (58/sec vs. 325/sec). Redis GEORADIUS with its built-in sorted set is simpler operationally and sufficient for food delivery's precision requirements.

### 1.4 Batching and Stacked Orders

A single driver carrying two orders from the same area saves one driver's entire trip. The optimizer must decide:

1. **Same-restaurant batch**: Two orders from the same restaurant → driver makes one pickup, two deliveries. This is almost always beneficial if the delivery addresses are in the same direction.

2. **Nearby-restaurant batch**: Orders from restaurants within 0.5 km → driver makes two pickups, two deliveries. Beneficial only if the route overlap is significant.

3. **Stack onto in-progress delivery**: A driver already delivering can accept a new order if the detour adds <8 minutes to the existing delivery.

**Key constraint**: The first customer's delivery SLA must not be violated. If batching would delay the first order beyond its promised ETA, the batch is rejected even if it is globally more efficient.

### 1.5 Driver Offer and Acceptance Flow

```
1. Dispatch sends offer to driver (push notification + in-app)
2. Driver has 45 seconds to accept or decline
3. If ACCEPTED: order assigned, driver navigates to restaurant
4. If DECLINED: offer sent to next-best candidate
5. If TIMEOUT: treated as decline, sent to next candidate
6. If all candidates exhausted: expand radius, recompute, or wait for new drivers
7. If still no driver after 3 retries: notify customer of delay, continue searching
```

**Acceptance rate feedback loop**: The scoring function includes predicted acceptance rate as a feature. If a driver frequently declines certain types of orders (long-distance, low-tip), the model learns this and ranks them lower for similar future orders, creating a self-optimizing system.

### 1.6 Dead Zone Problem

Some areas have few active drivers. When orders come in from these zones:

1. **Immediate**: Expand search radius from 5 km to 8 km, then 12 km
2. **Short-term**: Trigger surge pricing in the zone → higher delivery fee + driver bonus → attracts drivers from adjacent zones
3. **Medium-term**: Proactively push "bonus zone" notifications to nearby idle drivers
4. **Customer communication**: If no driver found within 2 minutes, show updated wait time and offer cancellation option

---

## Deep Dive 2: Real-Time Location & Tracking Pipeline

### 2.1 Location Write Storm

At peak, 500K active drivers send GPS updates every 5 seconds, producing 100K writes/sec. This is the single highest-throughput write path in the system.

**Pipeline architecture:**

```
Driver App → WebSocket Gateway → Kafka (location-updates topic)
  → Driver Location Service (consumer group)
    → Validate (bounds, speed, dedup)
    → Redis GEOADD (geo index update)
    → Time-Series DB (location history)
    → Tracking fan-out (if driver has active order)
```

### 2.2 Write Optimization Strategies

| Strategy | Effect | Savings |
|----------|--------|---------|
| **Stationary filtering** | Skip index update if driver moved < 10 meters since last update | ~35% reduction in geo writes |
| **Redis pipelining** | Batch 100 GEOADD commands into a single pipeline call | ~10× throughput improvement |
| **Kafka partitioning by city** | Location events for the same city go to the same partition → single consumer handles one city's geo index | Eliminates cross-shard writes |
| **Conditional persistence** | Only write to time-series DB if driver has an active order (location history is only needed for dispute resolution) | ~70% reduction in time-series writes |
| **Client-side batching** | Driver app buffers 2-3 location samples and sends as a batch every 5s instead of individual updates | Reduces WebSocket message count by 60% |

### 2.3 Redis Cluster Topology for Location

```
Sharding strategy: One Redis shard per metropolitan area
  - Chicago:  1 primary + 2 replicas (handles ~20K drivers)
  - New York: 2 primaries + 4 replicas (handles ~50K drivers)
  - LA:       2 primaries + 4 replicas (handles ~45K drivers)

Capacity per shard:
  - 50K drivers × GEOADD = 10K writes/sec per shard
  - GEORADIUS queries: ~200/sec per shard (from dispatch)
  - Memory: 50K geo entries × ~100 bytes = 5 MB (trivial)
  - CPU: primary bottleneck is GEORADIUS on large sets

Failover:
  - Redis Sentinel monitors primaries
  - Replica promoted within ~10 seconds on primary failure
  - During failover: dispatch falls back to cached driver list (stale by <10s)
```

### 2.4 Customer Tracking: End-to-End Flow

1. Customer opens tracking screen → WebSocket connection established
2. Server subscribes the connection to `order:{order_id}:tracking` channel
3. Every 5 seconds, driver location update flows through the pipeline
4. Location Service checks if driver has active order → publishes to tracking channel
5. WebSocket Gateway pushes `{lat, lng, heading, speed}` to customer
6. **Client-side dead reckoning**: Between 5-second updates, the app extrapolates position using `heading` and `speed`, providing smooth animation
7. **ETA re-computation**: Every 30 seconds (not every 5s), the ETA Service recomputes remaining delivery time based on actual driver position and current traffic

### 2.5 Location History Retention

| Tier | Duration | Resolution | Storage | Purpose |
|------|----------|-----------|---------|---------|
| **Hot** | 7 days | Full (every 5s) | Time-Series DB | Dispute resolution, trajectory validation |
| **Warm** | 90 days | Sampled (every 60s) | Column store | Analytics, driver behavior patterns |
| **Cold** | 1 year | Aggregated (trip summary) | Object storage | Compliance, long-term analytics |

---

## Deep Dive 3: ETA Accuracy and Continuous Improvement

### 3.1 Why ETA Is the Hardest Problem

Delivery ETA combines three independent uncertain estimates:

```
Total ETA = max(Prep Time, Driver-to-Restaurant) + Restaurant-to-Customer + Handoff Buffer
```

Each component has different uncertainty characteristics:

| Component | Avg Duration | Std Deviation | Key Uncertainty Sources |
|-----------|-------------|---------------|----------------------|
| Prep time | 15-25 min | ±8 min | Kitchen load, order complexity, restaurant reliability |
| Driver to restaurant | 5-12 min | ±4 min | Traffic, road closures, driver route choice |
| Restaurant to customer | 8-20 min | ±5 min | Traffic, distance, apartment access |
| Handoff buffer | 2-5 min | ±2 min | Parking, stairs, gate codes |

**Compounding problem**: A 5-minute error in prep time directly cascades to a 5-minute error in total ETA, regardless of how accurate the travel estimates are.

### 3.2 ML Model Architecture

The ETA system uses a multi-model approach (similar to Uber's DeepETA):

**Model 1 - Prep Time Predictor:**
- Input features: restaurant_id, cuisine type, number of items, item categories (appetizer vs. entree), time of day, day of week, current active orders at restaurant, restaurant's historical prep time distribution
- Architecture: Gradient-boosted trees (fast inference, interpretable)
- Training: Daily retraining on last 30 days of (restaurant, order) → actual prep time
- Output: predicted prep time in minutes + confidence interval

**Model 2 - Travel Time Predictor:**
- Input features: origin/destination coordinates, route distance, time of day, day of week, weather conditions, real-time traffic density
- Architecture: Transformer-based encoder (similar to DeepETA) with geo-spatial feature embedding
- Quantile bucketing for continuous features (distance, time)
- Output: predicted travel time + residual correction over routing engine estimate

**Model 3 - Total ETA Correction:**
- Input: combined raw ETA from Models 1 + 2, plus meta-features (city, weather, holiday flag)
- Purpose: correct for systematic biases in the component models
- Architecture: Simple linear model applied as a final calibration layer
- Output: multiplicative correction factor (typically 0.85 to 1.15)

### 3.3 Continuous Improvement Loop

```
1. Order delivered → compute actual_time = delivered_at - placed_at
2. Compare actual_time vs. initial_eta → compute error = actual - predicted
3. Log error with all features → training data for next model iteration
4. Aggregate errors by restaurant → update restaurant's avg_prep_time baseline
5. Aggregate errors by time/zone → detect systematic biases (e.g., "ETAs are 10% optimistic during rain")
6. Daily model retrain → deploy if accuracy improves on holdout set
7. Alert if error distribution shifts significantly (model drift detection)
```

### 3.4 Progressive ETA Updates

The ETA shown to the customer is not static---it is refined as real data arrives:

| Event | ETA Update Strategy |
|-------|-------------------|
| **Order placed** | Initial ETA from ML prediction (highest uncertainty) |
| **Restaurant confirms** (with prep estimate) | Blend restaurant estimate with ML prediction |
| **Driver assigned** | Replace generic driver-to-restaurant estimate with actual driver ETA |
| **Driver at restaurant** | Eliminate driver-to-restaurant component; ETA = prep remaining + delivery travel |
| **Order picked up** | ETA = routing engine travel time from current driver position (lowest uncertainty) |
| **During delivery** | Recompute every 30 seconds using actual driver position |

---

## Bottleneck Analysis

### Bottleneck 1: Location Write Storm at Meal Peaks

**Problem**: 100K Redis GEOADD operations per second during dinner rush.

**Mitigation cascade:**
1. **Stationary filtering** (client-side): If driver's GPS delta < 10m, don't send update → 35% reduction
2. **Redis pipelining** (server-side): Batch 50-100 GEOADD commands per pipeline → 10× throughput per connection
3. **City-level sharding**: Each city's geo index on a separate Redis shard → max 10-15K writes per shard
4. **Write buffering**: If pipeline queue exceeds threshold, drop oldest updates (staleness > freshness for stationary drivers)

**Failure mode**: If Redis shard for a city goes down, dispatch in that city cannot find nearby drivers. Mitigation: promote replica within 10 seconds; during gap, use last-known driver positions (stale by <15s).

### Bottleneck 2: Dispatch Contention at Peak

**Problem**: 580 orders/sec all competing for the same pool of available drivers. Two dispatch processes may try to assign the same driver simultaneously.

**Mitigation:**
1. **Optimistic lock with Lua script**: Atomic `GET-CHECK-SET` on driver status in Redis. If another dispatch already claimed the driver, move to next candidate (no blocking lock, just retry with next candidate)
2. **Geo-zone partitioning**: Dispatch for Chicago orders only considers Chicago drivers. Different cities never contend.
3. **Dispatch queue sharding**: Within a large city, shard the dispatch queue by sub-zone (e.g., "Chicago North," "Chicago South") to reduce contention further
4. **Over-generation**: Generate 20 candidates for each order, not just the best 3, so there are fallback options when top candidates are taken

### Bottleneck 3: Menu Service Under Browsing Load

**Problem**: Peak browsing QPS of 30K+ reads/sec for menu data, with popular restaurants seeing 100× the average traffic.

**Mitigation:**
1. **CDN caching**: Restaurant listing pages and menu data cached at edge (TTL: 5 minutes; cache-busted on menu update)
2. **Redis cache**: Full restaurant menu serialized as a Redis hash, warmed on restaurant open, TTL 5 minutes
3. **Elasticsearch**: Search queries served from ES replicas, not PostgreSQL
4. **Hot restaurant detection**: Restaurants with >10× average QPS get their cache TTL extended and are pinned in Redis to prevent eviction

### Bottleneck 4: WebSocket Connection Storm

**Problem**: 700K concurrent WebSocket connections (500K drivers + 200K tracking customers) during peak.

**Mitigation:**
1. **Horizontal scaling**: WebSocket Gateway is stateless (connections routed via consistent hashing on user_id); add more instances as needed
2. **Connection limits**: Each gateway instance handles ~50K connections; 14+ instances for peak
3. **Graceful reconnection**: Client-side exponential backoff with jitter on disconnect; server-side sticky sessions via load balancer
4. **Fallback to polling**: If WebSocket connection fails after 3 retries, client switches to HTTP polling (10s interval)

---

## Race Conditions and Edge Cases

### Race 1: Two Dispatchers Assign the Same Driver

**Scenario**: Order A and Order B both run dispatch at the same millisecond. Both identify Driver X as the best candidate. Both attempt to assign Driver X.

**Solution**: Redis Lua script for atomic assignment:
```
IF redis.GET(driver_status) == "available" THEN
    redis.SET(driver_status, "assigned")
    RETURN 1  // success
ELSE
    RETURN 0  // driver already taken
END
```
The loser gets `0` and tries the next candidate. No distributed lock, no blocking.

### Race 2: Order Cancelled While Driver Being Assigned

**Scenario**: Customer cancels while dispatch is mid-flight. Dispatch assigns a driver, but the order is already cancelled.

**Solution**: Saga pattern with compensation.
```
1. Dispatch assigns driver (writes dispatch record)
2. Before sending offer to driver, check order status
3. If order status = CANCELLED:
   a. Release driver (set status back to "available")
   b. Void dispatch record
   c. Skip driver notification
4. If offer already sent and driver accepts a cancelled order:
   a. Driver receives "order cancelled" immediately
   b. Compensation payment to driver for wasted time
```

### Race 3: Restaurant Marks Ready Before Driver Assigned

**Scenario**: Small restaurant with fast prep time → food ready in 5 minutes, but dispatch hasn't found a driver yet. Food sits and degrades.

**Solution**:
1. Dispatch service receives `READY_FOR_PICKUP` event → escalates driver search (wider radius, higher priority in queue)
2. If no driver found within 3 minutes of food being ready, alert support team
3. ETA to customer updated: "Your food is ready, waiting for driver pickup"
4. This scenario feeds back into dispatch timing: for this restaurant, future dispatches trigger earlier (during prep, not after)

### Race 4: Driver Accepts Two Offers Simultaneously

**Scenario**: Due to network latency, driver receives two offers (from two orders) and taps "Accept" on both within milliseconds.

**Solution**:
1. Each offer has a unique `offer_id` with a one-time acceptance token
2. Server validates: driver can only have `active_order_count <= MAX_CONCURRENT_ORDERS`
3. Second acceptance fails atomic check → returns "offer no longer available"
4. Driver sees error only for the second tap; first acceptance stands
