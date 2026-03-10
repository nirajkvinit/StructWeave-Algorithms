# 14.15 AI-Native Hyperlocal Logistics & Delivery Platform for SMEs — Low-Level Design

## Core Data Models

### Order Model

```
Order {
  order_id:          UUID (partition key)
  city_id:           string (geo-partition key)
  merchant_id:       UUID
  status:            enum [CREATED, PRICED, CONFIRMED, MATCHING, ASSIGNED,
                           PICKUP_EN_ROUTE, AT_PICKUP, PICKED_UP, IN_TRANSIT,
                           NEAR_DROPOFF, DELIVERED, FAILED, CANCELLED]
  pickup: {
    address:         string
    lat:             float64
    lng:             float64
    geohash:         string (precision 7)
    contact_name:    string
    contact_phone:   string (encrypted)
    instructions:    string
  }
  dropoff: {
    address:         string
    lat:             float64
    lng:             float64
    geohash:         string (precision 7)
    contact_name:    string
    contact_phone:   string (encrypted)
    instructions:    string
  }
  package: {
    category:        enum [DOCUMENT, SMALL_PARCEL, MEDIUM_BOX, LARGE_FRAGILE]
    weight_bracket:  enum [W_0_1KG, W_1_5KG, W_5_15KG, W_15_30KG]
    dimensions:      { length_cm, width_cm, height_cm }  // optional
    special_handling: string[]
  }
  urgency:           enum [EXPRESS, STANDARD, ECONOMY, SCHEDULED]
  batch_tolerance:   enum [NO_BATCH, BATCH_2, BATCH_3_PLUS]
  scheduled_window:  { start: timestamp, end: timestamp }  // for SCHEDULED
  pricing: {
    base_fee:        decimal
    distance_fee:    decimal
    surge_multiplier: decimal
    urgency_premium: decimal
    total_fee:       decimal
    currency:        string
  }
  assignment: {
    rider_id:        UUID
    assigned_at:     timestamp
    vehicle_type:    string
    batch_id:        UUID  // null if single-order delivery
    route_position:  int   // position in multi-stop route
  }
  eta: {
    customer_facing: timestamp  // p85 estimate
    rider_target:    timestamp  // p50 estimate
    last_updated:    timestamp
  }
  pod: {
    photo_url:       string
    otp_verified:    boolean
    gps_at_delivery: { lat, lng }
    delivered_at:    timestamp
    signature_url:   string  // for B2B
  }
  timestamps: {
    created_at:      timestamp
    confirmed_at:    timestamp
    picked_up_at:    timestamp
    delivered_at:    timestamp
  }
  version:           int (optimistic concurrency)
}
```

### Rider Model

```
Rider {
  rider_id:          UUID
  city_id:           string
  status:            enum [OFFLINE, IDLE, EN_ROUTE, AT_PICKUP, DELIVERING]
  vehicle: {
    type:            enum [BICYCLE, MOTORCYCLE, THREE_WHEELER, MINI_TRUCK]
    capacity_kg:     float
    capacity_volume: float  // cubic cm
    registration:    string (encrypted)
  }
  current_position: {
    lat:             float64
    lng:             float64
    geohash:         string (precision 8)
    heading:         float  // degrees
    speed:           float  // km/h
    updated_at:      timestamp
  }
  active_orders:     UUID[]  // currently carrying (max 4)
  active_route: {
    waypoints:       [{ order_id, type: PICKUP|DROPOFF, lat, lng, eta }]
    total_distance:  float  // km remaining
    total_time:      int    // seconds remaining
  }
  shift: {
    started_at:      timestamp
    hours_active:    float
    deliveries_today: int
    earnings_today:  decimal
    fatigue_score:   float  // 0.0 to 1.0
  }
  performance: {
    acceptance_rate_7d:    float
    on_time_rate_7d:       float
    avg_rating_30d:        float
    cancellation_rate_30d: float
  }
  preferences: {
    preferred_zones:       string[]  // geohash prefixes
    max_distance_km:       float
    available_hours:       { start, end }
  }
}
```

### Delivery Zone Model

```
DeliveryZone {
  zone_id:           string (geohash prefix, precision 5)
  city_id:           string
  polygon:           GeoJSON
  current_state: {
    active_orders:   int
    available_riders: int
    supply_demand_ratio: float  // riders / orders
    avg_pickup_time: float  // minutes, rolling 30 min
    avg_delivery_time: float
  }
  pricing: {
    current_multiplier: float  // 1.0 = no surge
    last_updated:    timestamp
    trend:           enum [RISING, STABLE, FALLING]
  }
  forecast: {
    next_15min:      int  // predicted orders
    next_30min:      int
    next_60min:      int
    confidence:      float
  }
  repositioning: {
    riders_needed:   int  // additional riders to meet forecast
    incentive_rate:  decimal  // per repositioning movement
  }
}
```

### Batch Route Model

```
BatchRoute {
  batch_id:          UUID
  rider_id:          UUID
  city_id:           string
  status:            enum [PLANNING, ACTIVE, COMPLETED]
  orders:            UUID[]
  waypoints: [
    {
      sequence:      int
      order_id:      UUID
      type:          enum [PICKUP, DROPOFF]
      lat:           float64
      lng:           float64
      eta:           timestamp
      actual_arrival: timestamp  // null until visited
      dwell_time:    int  // seconds spent at waypoint
    }
  ]
  route_geometry:    encoded_polyline
  total_distance_km: float
  total_time_min:    float
  optimization_score: float  // quality metric from solver
  created_at:        timestamp
  last_optimized:    timestamp
}
```

---

## API Contracts

### Order Creation API

```
POST /v1/orders
Headers: Authorization: Bearer <merchant_token>
         X-City-Id: <city_id>

Request:
{
  "pickup": {
    "address": "123 MG Road, Bangalore",
    "lat": 12.9716,
    "lng": 77.5946,
    "contact_name": "Store Manager",
    "contact_phone": "+91XXXXXXXXXX"
  },
  "dropoff": {
    "address": "456 Indiranagar, Bangalore",
    "lat": 12.9784,
    "lng": 77.6408,
    "contact_name": "Ravi Kumar",
    "contact_phone": "+91XXXXXXXXXX"
  },
  "package": {
    "category": "SMALL_PARCEL",
    "weight_bracket": "W_1_5KG"
  },
  "urgency": "STANDARD",
  "batch_tolerance": "BATCH_2"
}

Response (200):
{
  "order_id": "ord_abc123",
  "status": "PRICED",
  "pricing": {
    "base_fee": 25.00,
    "distance_fee": 18.50,
    "surge_multiplier": 1.2,
    "urgency_premium": 0.00,
    "total_fee": 52.20,
    "currency": "INR"
  },
  "estimated_eta_minutes": 42,
  "tracking_url": "https://track.platform.io/ord_abc123",
  "expires_at": "2026-03-10T14:35:00Z"
}
```

### Order Confirmation API

```
POST /v1/orders/{order_id}/confirm

Response (200):
{
  "order_id": "ord_abc123",
  "status": "MATCHING",
  "message": "Finding the best rider for your delivery"
}
```

### Real-Time Tracking API

```
GET /v1/orders/{order_id}/tracking

Response (200):
{
  "order_id": "ord_abc123",
  "status": "IN_TRANSIT",
  "rider": {
    "name": "Suresh K.",
    "phone_masked": "+91XXXXX5678",
    "vehicle": "MOTORCYCLE",
    "rating": 4.7
  },
  "position": {
    "lat": 12.9750,
    "lng": 77.6200,
    "heading": 45,
    "updated_at": "2026-03-10T14:22:03Z"
  },
  "eta": {
    "estimated_arrival": "2026-03-10T14:38:00Z",
    "minutes_remaining": 16,
    "confidence": "high"
  },
  "route": {
    "remaining_polyline": "encoded_polyline_string",
    "remaining_distance_km": 2.8
  }
}
```

### WebSocket Tracking Stream

```
WS /v1/orders/{order_id}/tracking/stream

Server pushes every 3-5 seconds:
{
  "type": "position_update",
  "lat": 12.9752,
  "lng": 77.6210,
  "heading": 48,
  "speed_kmh": 22,
  "eta_minutes": 15,
  "timestamp": "2026-03-10T14:22:06Z"
}

State transition events:
{
  "type": "status_change",
  "from": "IN_TRANSIT",
  "to": "NEAR_DROPOFF",
  "timestamp": "2026-03-10T14:36:00Z"
}
```

### Rider Location Update API

```
POST /v1/riders/location (batch endpoint)

Request:
{
  "rider_id": "rdr_xyz789",
  "positions": [
    { "lat": 12.9750, "lng": 77.6200, "heading": 45, "speed": 22.5,
      "accuracy": 8.0, "timestamp": "2026-03-10T14:22:00Z" },
    { "lat": 12.9751, "lng": 77.6203, "heading": 46, "speed": 23.0,
      "accuracy": 6.0, "timestamp": "2026-03-10T14:22:03Z" }
  ]
}

Response (200):
{
  "accepted": 2,
  "next_report_interval_ms": 3000
}
```

### Demand Forecast API (Internal)

```
GET /v1/internal/forecast?city_id=BLR&horizon=120min

Response:
{
  "city_id": "BLR",
  "generated_at": "2026-03-10T14:15:00Z",
  "horizon_minutes": 120,
  "zones": [
    {
      "zone_id": "tdr4s",
      "intervals": [
        { "start": "14:15", "end": "14:30", "predicted_orders": 12, "confidence": 0.82 },
        { "start": "14:30", "end": "14:45", "predicted_orders": 18, "confidence": 0.75 }
      ]
    }
  ]
}
```

---

## Core Algorithms

### Algorithm 1: Batch Bipartite Matching

The matching engine accumulates orders over a 30-second window and solves a weighted bipartite assignment problem.

```
FUNCTION batch_match(pending_orders[], available_riders[]):
    // Build cost matrix
    cost_matrix = MATRIX(len(orders), len(riders))

    FOR each order O in pending_orders:
        FOR each rider R in available_riders:
            // Skip infeasible assignments
            IF NOT vehicle_compatible(R.vehicle, O.package): CONTINUE
            IF R.fatigue_score > 0.9: CONTINUE

            // Compute multi-objective score
            road_dist = road_network_distance(R.position, O.pickup)
            time_to_pickup = estimate_travel_time(R.position, O.pickup)
            time_to_deliver = estimate_travel_time(O.pickup, O.dropoff)

            IF time_to_pickup + time_to_deliver > O.time_window: CONTINUE

            proximity_score = 1.0 - (road_dist / MAX_DEAD_MILES)
            capacity_score = capacity_fit(R, O.package)
            acceptance_prob = predict_acceptance(R, O)
            fairness_score = earnings_fairness(R)

            cost_matrix[O][R] = weighted_sum(
                proximity_score * 0.35,
                capacity_score * 0.15,
                acceptance_prob * 0.25,
                fairness_score * 0.15,
                time_feasibility_score * 0.10
            )

    // Solve assignment (Hungarian algorithm or auction-based)
    assignments = hungarian_algorithm(cost_matrix)

    // Compute shadow assignments (backup for rejections)
    FOR each (order, rider) in assignments:
        shadow = second_best_rider(cost_matrix, order, excluding=rider)
        store_shadow_assignment(order, shadow)

    RETURN assignments
```

### Algorithm 2: Route Optimization with Order Insertion

```
FUNCTION optimize_route_with_insertion(current_route, new_order):
    // current_route: ordered list of waypoints rider must visit
    // new_order: new order to insert (pickup + dropoff waypoints)

    best_cost = INFINITY
    best_insertion = NULL

    // Try every feasible insertion position for pickup
    FOR pickup_pos FROM 0 TO len(current_route):
        // Pickup must come before dropoff
        FOR dropoff_pos FROM pickup_pos + 1 TO len(current_route) + 1:
            candidate = insert_waypoints(current_route, new_order.pickup,
                                         pickup_pos, new_order.dropoff, dropoff_pos)

            // Check time window feasibility for ALL orders in route
            IF NOT all_time_windows_satisfied(candidate): CONTINUE

            // Check capacity at every segment
            IF NOT capacity_feasible(candidate): CONTINUE

            // Compute cost (total route time increase)
            detour_cost = route_time(candidate) - route_time(current_route)
            delay_cost = sum_of_delay_increases(candidate, current_route)

            total_cost = detour_cost + DELAY_PENALTY * delay_cost

            IF total_cost < best_cost:
                best_cost = total_cost
                best_insertion = candidate

    IF best_insertion IS NULL:
        RETURN INFEASIBLE  // Cannot insert without violating constraints

    // Apply ALNS improvement (2-second budget)
    improved = adaptive_large_neighborhood_search(best_insertion, time_budget=2000ms)
    RETURN improved
```

### Algorithm 3: ETA Ensemble Prediction

```
FUNCTION predict_eta(rider, waypoints_remaining):
    // Component 1: Graph-based traversal time
    graph_time = 0
    FOR each segment IN waypoints_to_road_segments(waypoints_remaining):
        segment_time = road_graph.traversal_time(segment, current_traffic)
        graph_time += segment_time

    // Component 2: Rider-specific speed adjustment
    rider_profile = get_rider_speed_profile(rider.id)
    rider_factor = rider_profile.speed_factor(
        time_of_day = NOW,
        weather = current_weather,
        hours_active = rider.shift.hours_active
    )

    // Component 3: Intersection and signal delays
    intersections = count_intersections(waypoints_remaining)
    signal_delay = intersections * intersection_delay_model.predict(
        time_of_day = NOW,
        zone = rider.current_zone
    )

    // Component 4: Dwell times at waypoints
    dwell_time = 0
    FOR each wp IN waypoints_remaining:
        IF wp.type == PICKUP:
            dwell_time += pickup_time_model.predict(wp.merchant_id)
        ELSE:
            dwell_time += dropoff_time_model.predict(wp.address_type)

    // Combine components
    base_eta = (graph_time / rider_factor) + signal_delay + dwell_time

    // Compute distribution (log-normal model)
    variance = eta_variance_model.predict(
        distance = total_remaining_distance,
        time_of_day = NOW,
        weather = current_weather
    )

    RETURN {
        p50: base_eta,
        p85: base_eta * (1 + 0.67 * sqrt(variance)),
        p95: base_eta * (1 + 1.28 * sqrt(variance))
    }
```

### Algorithm 4: Dynamic Zone Pricing

```
FUNCTION compute_zone_price(zone, order):
    // Supply-demand ratio
    supply = zone.current_state.available_riders
    demand = zone.current_state.active_orders + zone.forecast.next_15min
    sd_ratio = supply / max(demand, 1)

    // Base multiplier from supply-demand curve
    IF sd_ratio >= 1.5:
        surge = 1.0  // Oversupply, no surge
    ELSE IF sd_ratio >= 1.0:
        surge = 1.0 + 0.3 * (1.5 - sd_ratio)  // Mild surge
    ELSE IF sd_ratio >= 0.5:
        surge = 1.15 + 0.7 * (1.0 - sd_ratio)  // Moderate surge
    ELSE:
        surge = 1.5 + 2.0 * (0.5 - sd_ratio)  // Heavy surge

    // Weather adjustment
    IF current_weather.is_raining:
        surge = surge * 1.15  // Rain reduces rider supply

    // Time-of-day adjustment
    hour_factor = time_demand_curve[current_hour]  // Learned curve
    surge = surge * hour_factor

    // Apply caps
    surge = min(surge, MAX_SURGE_MULTIPLIER)  // Cap at 2.5x
    surge = max(surge, MIN_SURGE_MULTIPLIER)  // Floor at 0.8x for off-peak discount

    // Smooth with moving average (avoid price flicker)
    smoothed_surge = 0.7 * surge + 0.3 * zone.pricing.previous_multiplier

    // Compute final price
    base_price = BASE_FEE + (order.distance_km * PER_KM_RATE)
    urgency_premium = urgency_multiplier[order.urgency]

    total = base_price * smoothed_surge * urgency_premium

    // Enforce rider earnings floor
    min_rider_pay = MIN_RIDER_EARNINGS_PER_DELIVERY
    IF total * RIDER_COMMISSION_RATE < min_rider_pay:
        total = min_rider_pay / RIDER_COMMISSION_RATE

    RETURN {
        base_fee: BASE_FEE,
        distance_fee: order.distance_km * PER_KM_RATE,
        surge_multiplier: smoothed_surge,
        urgency_premium: urgency_premium,
        total: round(total, 2)
    }
```

---

## State Machine: Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> CREATED: Order submitted
    CREATED --> PRICED: Price computed
    PRICED --> CONFIRMED: SME confirms
    PRICED --> CANCELLED: SME cancels / price expires
    CONFIRMED --> MATCHING: Sent to matching engine
    MATCHING --> ASSIGNED: Rider matched
    MATCHING --> CANCELLED: No rider found (timeout 5 min)
    ASSIGNED --> PICKUP_EN_ROUTE: Rider starts moving to pickup
    ASSIGNED --> MATCHING: Rider rejects (re-match)
    PICKUP_EN_ROUTE --> AT_PICKUP: Rider geofenced at pickup
    AT_PICKUP --> PICKED_UP: Package collected (confirmed)
    PICKED_UP --> IN_TRANSIT: Rider en route to dropoff
    IN_TRANSIT --> NEAR_DROPOFF: Within 500m of dropoff
    NEAR_DROPOFF --> DELIVERED: POD confirmed
    NEAR_DROPOFF --> FAILED: Delivery attempt failed
    FAILED --> MATCHING: Retry with new rider
    FAILED --> CANCELLED: Max retries exceeded

    IN_TRANSIT --> IN_TRANSIT: Route re-optimized (batch insertion)
```

---

## Database Schema Design

### Partitioning Strategy

| Table | Partition Key | Sort Key | Rationale |
|---|---|---|---|
| **orders** | city_id + date | order_id | City-local queries; date for TTL and archival |
| **rider_positions** | rider_id | timestamp | Time-series per rider; latest position via max(timestamp) |
| **location_trail** | rider_id + date | timestamp | GPS breadcrumbs; date partition for retention policy |
| **zone_state** | city_id | zone_id | All zones for a city queried together for matching |
| **batch_routes** | city_id + date | batch_id | Route plans are city-local and date-bounded |

### Index Strategy

| Index | Purpose |
|---|---|
| **orders(merchant_id, created_at)** | Merchant dashboard queries |
| **orders(city_id, status)** | Active order monitoring |
| **orders(rider_id, status)** | Rider's active delivery list |
| **rider_positions(geohash)** | Spatial proximity queries for matching |
| **zone_state(city_id, supply_demand_ratio)** | Surge pricing hot-zone detection |
