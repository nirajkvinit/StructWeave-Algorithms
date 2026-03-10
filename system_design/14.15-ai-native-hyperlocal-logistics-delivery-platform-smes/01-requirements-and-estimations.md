# 14.15 AI-Native Hyperlocal Logistics & Delivery Platform for SMEs — Requirements & Estimations

## Functional Requirements

### FR-01: Order Creation and Intake

The platform must allow SMEs to create delivery orders via mobile app, web dashboard, API integration, or WhatsApp bot. Each order specifies pickup address (auto-filled from merchant profile or manual entry with geocoding), drop-off address (geocoded with validation against serviceable area polygon), package category (document, small parcel, medium box, large/fragile), approximate weight bracket (0-1 kg, 1-5 kg, 5-15 kg, 15-30 kg), delivery urgency tier (express: 30 min, standard: 60 min, economy: 120 min, scheduled: specific time window), and any special handling instructions. The system must validate serviceability (pickup and drop-off within operational geofence), estimate pricing before confirmation, and return an order ID with preliminary ETA within 3 seconds of submission.

### FR-02: Intelligent Rider Matching

Upon order confirmation, the system must identify and assign the optimal rider within 45 seconds. The matching engine considers rider proximity to pickup (road-network distance, not Haversine), rider vehicle type compatibility (bike for documents and small parcels, three-wheeler for medium, mini-truck for large), current rider load (capacity remaining if mid-route), rider acceptance history for this merchant and package type, rider fatigue score (hours active, deliveries completed today), and time-window feasibility (can the rider reach pickup and complete delivery within the promised window). If the assigned rider rejects, the system must reassign within 15 seconds using pre-computed shadow assignments.

### FR-03: Multi-Stop Route Optimization

When a rider has multiple active orders (batched), the system must compute the optimal visit sequence minimizing total route time while respecting each order's time window constraints. The solver must handle insertion of new orders into active routes, removal of orders (cancellations), and dynamic re-routing when traffic conditions change significantly. The route must be re-optimized within 2 seconds of any triggering event.

### FR-04: Real-Time Tracking

Customers and SMEs must be able to track their delivery in real time on a map with rider position updates every 3-5 seconds. The tracking view shows current rider position, planned route overlay, live ETA countdown (updated every 30 seconds), and delivery status transitions (assigned → en route to pickup → at pickup → in transit → near drop-off → delivered). The system must support 50,000 concurrent tracking sessions per city during peak hours.

### FR-05: ETA Prediction and Management

The system must provide accurate ETAs at multiple lifecycle stages: at order creation (before rider assignment), at rider assignment (with specific rider context), at pickup completion (with actual pickup time and remaining route), and continuously during transit (updating as traffic and route conditions change). Customer-facing ETAs must achieve ≥ 90% on-time rate (delivery before stated ETA). The system must proactively notify customers if the ETA will be breached by more than 5 minutes.

### FR-06: Dynamic Pricing Engine

The platform must compute delivery fees dynamically based on distance, package type, urgency tier, current zone-level supply-demand ratio, weather conditions, and time of day. Prices must update at zone level every 5 minutes. The system must enforce maximum surge caps (2.5× base price), minimum rider earnings per delivery, and provide price estimates to SMEs before order confirmation. Price history and breakdowns must be available for SME transparency.

### FR-07: Proof of Delivery (POD)

Every delivery must generate verifiable proof: GPS coordinates at delivery location (within 50m of drop-off address), timestamp, and at least one of: delivery photo (AI-validated for package presence), recipient OTP verification (for high-value orders > $10), or digital signature. POD records must be immutable, stored for 180 days, and queryable for dispute resolution.

### FR-08: Demand Forecasting and Fleet Pre-Positioning

The system must predict order volumes per micro-zone (500m × 500m) at 15-minute intervals for the next 2 hours. Forecasts drive rider pre-positioning recommendations: the system must compute optimal idle-rider distribution across zones and issue repositioning nudges with incentive amounts. Forecast accuracy target: MAPE < 20% at zone level, < 10% at city level.

### FR-09: Delivery Analytics for SMEs

The platform must provide SMEs with a dashboard showing delivery performance metrics (on-time rate, average delivery time, cost per delivery), delivery heatmaps (where their customers are), cost optimization suggestions (batch-friendly time windows, pre-scheduling discounts), and historical trend analysis. Reports must be exportable and available via API for SMEs with integrated systems.

### FR-10: Returns and Reverse Logistics

The system must support return pickups from the original drop-off address back to the merchant. Return orders inherit the original order's package metadata, receive priority matching to riders already near the return pickup location, and maintain chain-of-custody linkage to the original forward delivery for reconciliation.

### FR-11: Multi-Vehicle Fleet Support

The platform must support heterogeneous vehicle types: bicycles (documents, small parcels, 0-3 km), motorcycles (parcels up to 5 kg, 0-10 km), three-wheelers (medium loads up to 20 kg, 0-15 km), and mini-trucks (bulk shipments up to 500 kg, 0-30 km). Matching and routing algorithms must respect vehicle-specific constraints: speed profiles, road access restrictions, load capacity, and fuel/range limitations.

### FR-12: Merchant Onboarding and Recurring Schedules

SMEs must be able to set up recurring delivery schedules (daily pickups at 10 AM, weekly bulk dispatches) that auto-generate orders. The system must learn from recurring patterns to pre-allocate rider capacity and offer volume discounts for predictable demand.

---

## Out of Scope

- **Warehousing and inventory management**: The platform manages logistics, not inventory; SMEs manage their own stock.
- **Intra-city freight and trucking**: Focus is hyperlocal (< 30 km), not long-haul logistics.
- **Customer-to-customer (C2C) delivery**: Platform serves B2C (SME to their customer) and B2B (SME to SME) only.
- **Payment collection on delivery (COD facilitation)**: Platform delivers packages, does not handle payment collection for the merchant's goods.
- **Cold-chain and temperature-controlled delivery**: Specialized vertical requiring different infrastructure.

---

## Non-Functional Requirements

| NFR | Target | Rationale |
|---|---|---|
| **Order-to-Assignment Latency** | < 45 seconds (p95) | SMEs expect near-instant confirmation; longer waits drive drop-off |
| **ETA Accuracy** | ≥ 90% on-time rate | Platform's value proposition rests on reliable time promises |
| **Tracking Update Freshness** | < 5 seconds | Stale tracking destroys customer confidence and generates support calls |
| **System Availability** | 99.95% (26 min downtime/month) | Delivery is time-critical; outages mean missed deliveries and lost SME revenue |
| **Location Ingestion Throughput** | 500,000 updates/second per city | 10,000 active riders × 1 update/3 seconds × peak concurrency factor |
| **API Response Time** | < 200ms (p95) for all read APIs | Tracking, ETA, and status queries must feel instant on mobile |
| **Solver Latency** | < 2 seconds for route re-optimization | New orders inserted into active routes must not block rider progress |
| **Data Durability** | Zero order loss | Every confirmed order must be persisted before acknowledgment; event-sourced log as source of truth |
| **Horizontal Scalability** | Linear scaling per city addition | Adding a new city should not require re-architecture; geo-partitioned design |
| **Cost Efficiency** | < $0.003 platform compute cost per delivery | At $3 average delivery value, platform margins require extreme compute efficiency |

---

## Capacity Estimations

### Assumptions (Single Metro City — Tier 1 Indian City)

| Parameter | Value | Basis |
|---|---|---|
| Active SME merchants | 50,000 | Target market: small shops, restaurants, D2C brands, pharmacies |
| Orders per day | 500,000 | ~10 orders/day per active merchant average (high variance) |
| Peak hour concentration | 20% of daily orders in peak hour | 100,000 orders/hour = ~28 orders/second |
| Active riders (peak) | 15,000 | ~33 orders per rider per day (8-hour shift, ~25 min per delivery) |
| Concurrent tracking sessions (peak) | 50,000 | ~50% of in-transit orders have active tracking viewers |
| Average delivery distance | 5 km | Hyperlocal: 80% of orders within 7 km |
| Rider location update frequency | Every 3 seconds | GPS + network-based location |

### Throughput Calculations

| Metric | Calculation | Result |
|---|---|---|
| **Orders per second (peak)** | 100,000 / 3,600 | ~28 orders/sec |
| **Location updates per second** | 15,000 riders × (1/3 sec) | ~5,000 updates/sec |
| **Matching computations per second** | 28 orders × candidate evaluation (50 riders each) | ~1,400 scorer invocations/sec |
| **Route optimizations per minute** | 28 orders/sec × 60 sec × 30% batched requiring re-optimization | ~500 solver runs/min |
| **Tracking queries per second** | 50,000 sessions × 1 poll/5 sec | ~10,000 queries/sec |
| **ETA recomputations per minute** | 50,000 active deliveries × 1 recompute/30 sec | ~1,667 ETA computations/sec |

### Storage Calculations

| Data Type | Calculation | Daily Volume |
|---|---|---|
| **Order records** | 500,000 orders × 2 KB average | ~1 GB/day |
| **Location trail** | 5,000 updates/sec × 86,400 sec × 100 bytes | ~43 GB/day |
| **Route snapshots** | 500,000 orders × 3 snapshots × 500 bytes | ~750 MB/day |
| **POD artifacts** | 500,000 × 80% photo × 200 KB compressed | ~80 GB/day |
| **Event log** | ~2M events/day × 500 bytes | ~1 GB/day |
| **Demand forecast state** | 2,000 zones × 96 intervals × 200 bytes | ~38 MB/day |
| **Total daily (one city)** | Sum | ~126 GB/day |
| **Monthly (one city)** | 126 × 30 | ~3.8 TB/month |
| **10-city deployment** | 3.8 × 10 | ~38 TB/month |

### Bandwidth Calculations

| Flow | Calculation | Bandwidth |
|---|---|---|
| **Location ingestion** | 5,000 updates/sec × 100 bytes | ~500 KB/sec (0.5 MB/s) |
| **Tracking responses** | 10,000 queries/sec × 500 bytes | ~5 MB/sec |
| **POD photo uploads** | ~7 photos/sec × 200 KB | ~1.4 MB/sec |
| **Map tile serving** | 50,000 sessions × 50 KB/10 sec | ~250 MB/sec (CDN-served) |

---

## SLO Dashboard

| SLO | Target | Measurement | Alert Threshold |
|---|---|---|---|
| **Order Confirmation Latency** | p95 < 3 seconds | Time from order submit to confirmed state | p95 > 4 sec for 5 min |
| **Rider Assignment Latency** | p95 < 45 seconds | Time from confirmed to rider-assigned state | p95 > 60 sec for 5 min |
| **On-Time Delivery Rate** | ≥ 90% | Deliveries completed before customer-facing ETA | < 85% over rolling 1 hour |
| **ETA Accuracy (MAE)** | < 4 minutes | Mean absolute error of final ETA vs. actual delivery time | MAE > 6 min over rolling 1 hour |
| **Tracking Freshness** | p95 < 5 seconds | Age of rider position shown to tracking viewer | p95 > 8 sec for 3 min |
| **Rider Acceptance Rate** | ≥ 80% | First-offer acceptance rate | < 70% over rolling 30 min (pricing/matching issue) |
| **System Availability** | 99.95% | Successful API responses / total requests | Error rate > 0.1% for 5 min |
| **Solver Latency** | p95 < 2 seconds | Route optimization computation time | p95 > 3 sec for 5 min |
| **Dead Mile Ratio** | < 15% | (Rider distance without package) / total rider distance | > 20% over rolling 1 hour |
| **Batch Utilization** | ≥ 40% of eligible orders | Orders delivered as part of multi-stop batch | < 30% over rolling 2 hours |
