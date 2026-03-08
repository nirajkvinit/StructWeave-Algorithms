# Interview Guide

## 45-Minute Pacing

### Minutes 0-5: Clarify Scope

**Ask these questions before designing:**

1. **"What kind of parking system?"** Single-lot kiosk? Multi-lot SaaS platform? Airport mega-lot with reservations? Smart city network?
2. **"Do we need online reservations, or walk-in only?"** Reservations add booking service, availability queries, double-allocation prevention.
3. **"What entry methods?"** Ticket-only? QR code from reservation? ANPR for permits? All three?
4. **"Multiple vehicle types?"** Compact, regular, handicapped, EV, motorcycle? This affects the object model depth.
5. **"Multi-tenant?"** One operator or multi-corporate SaaS?

**Recommended scope for a 45-minute interview:**
Multi-lot SaaS platform with reservation + walk-in entry, ANPR for permits, multiple spot types. This gives the richest discussion surface (object modeling, allocation, offline gates, pricing).

### Minutes 5-15: Object Model & Data Design

This is the core differentiator of the parking system interview. Spend time here.

**Walk through the hierarchy:**
```
ParkingCorporation
  └── ParkingLot (address, coordinates, operating_hours)
        ├── Floor (level_number)
        │     └── Zone (zone_type: GENERAL, VIP, EV, HANDICAPPED)
        │           └── ParkingSpot (spot_type, status, sensor_id, version)
        ├── Gate (gate_type: ENTRY/EXIT, anpr_enabled)
        └── PricingRule (spot_type, rate_per_hour, max_daily, peak_hours)

Supporting entities:
  - Booking (spot_id, user_id, vehicle_id, start_time, end_time, status, qr_code)
  - Ticket (lot_id, entry_time, exit_time, barcode)
  - Permit (vehicle_id, lot_id, type: MONTHLY/ANNUAL)
  - Payment (amount, method, status)
  - Vehicle (license_plate, type, ev_capable)
```

**Key design points to highlight:**
- `version` column on ParkingSpot enables optimistic locking
- `proximity_rank` on ParkingSpot enables "closest to entrance" allocation
- Booking has `lot_id` for shard affinity (even though spot → zone → floor → lot provides the path)

**Spot state machine:**
```
AVAILABLE → RESERVED (booking confirmed)
AVAILABLE → OCCUPIED (walk-in parks, sensor detects)
RESERVED → OCCUPIED (booking redeemed at gate)
RESERVED → AVAILABLE (no-show or cancellation)
OCCUPIED → AVAILABLE (vehicle exits)
AVAILABLE → OUT_OF_SERVICE (maintenance)
OUT_OF_SERVICE → AVAILABLE (maintenance complete)
```

### Minutes 15-25: Real-Time Availability & Slot Allocation

**Availability tracking (two approaches):**
1. **Redis bitmaps**: 1 bit per spot, BITCOUNT for availability. 5,000 spots = 625 bytes. O(1) per-spot operations, O(N/8) count.
2. **Pre-computed interval slots**: For time-range queries ("available Saturday 2-6 PM"), use 30-min interval bitmaps. AND the bitmaps for the desired range → available spots.

**Slot allocation algorithm:**
```
1. Query available spots (by type, lot, time window)
2. Filter out spots with overlapping bookings
3. Rank by proximity to entrance
4. Attempt reservation with optimistic lock (version check)
5. On conflict: retry with next candidate (up to 3 attempts)
```

**Double-allocation prevention:**
- Optimistic locking: `UPDATE spots SET status=RESERVED, version=version+1 WHERE id=X AND version=Y`
- Works well for parking because per-spot contention is typically low
- For high-contention scenarios (event parking), can use distributed lock per lot+spot_type

### Minutes 25-35: Entry/Exit Flow & Gate Offline Resilience

**Three entry modes at the gate:**
1. **QR scan (pre-booked)**: Validate booking → open gate → mark spot OCCUPIED
2. **Ticket dispense (walk-in)**: Issue ticket with timestamp → open gate
3. **ANPR (permit)**: Recognize plate → validate permit → open gate

**Gate offline resilience (this is the key differentiator):**
- Gates are physical barriers---they MUST work during network outages
- Edge controller with local SQLite: caches active bookings + permits
- Sync cycle: pull updates every 30 seconds from cloud
- Offline decision: validate against local cache; log events locally
- Reconciliation: upload offline events when connectivity resumes
- Fail-open policy: always allow entry (dispense ticket); charge at exit
- Exit during outage: calculate fee locally, defer payment, open gate

**This offline resilience discussion demonstrates understanding of:**
- Edge computing vs cloud-only architectures
- CAP theorem in practice (availability > consistency for gate operations)
- Eventual consistency and conflict resolution
- Physical system constraints that pure software systems don't have

### Minutes 35-42: Pricing, Payment, Scalability

**Pricing engine:**
- Hourly rate × duration, capped at daily maximum
- Peak/off-peak multipliers (8AM-6PM vs 6PM-8AM)
- Spot type multipliers (EV costs more than regular)
- Event-based surge (configurable per lot)

**Payment optimization for exit rush hour:**
- Pre-payment at booking time (exit is gate-open-only)
- Queue-based payment (open gate on initiation, process async)
- Express exit lanes for pre-paid and permit holders

**Scalability:**
- Shard by `lot_id` (perfect geo-fencing, zero cross-shard transactions)
- Redis per-region for availability bitmaps (~6 MB for 10K lots)
- Multi-region deployment (parking is inherently local)
- Gate HA: dual controllers with heartbeat failover

### Minutes 42-45: Trade-offs Summary

Summarize 2-3 key trade-offs that demonstrate architectural judgment.

---

## What Makes Parking System Uniquely Interesting

1. **Object modeling depth**: Corporation → Lot → Floor → Zone → Spot is one of the deepest hierarchies in system design interviews. It tests the candidate's ability to decompose physical infrastructure into software entities.

2. **Physical constraint**: Gates must work offline. This is the architectural insight that separates good answers from great ones. Pure software systems can show error pages; parking gates cannot.

3. **Hybrid entry modes**: Three fundamentally different entry flows (QR, ticket, ANPR) converging at the same physical gate. Tests the candidate's ability to design a unified interface for diverse inputs.

4. **IoT integration**: Real sensor pipelines with debouncing, false positive handling, and cross-validation against gate events. Not just "sensors send data"---the reliability engineering around noisy IoT data.

5. **Low contention, high consistency**: Unlike concert ticketing (massive contention for specific seats), parking has moderate contention (hundreds of spots per type) but requires equally strong consistency (no double-allocation of physical bays).

---

## Key Trade-offs Table

| Decision | Option A | Option B | Recommendation | Why |
|----------|----------|----------|----------------|-----|
| **Slot allocation** | Optimistic locking (DB version column) | Distributed lock (Redis) | Optimistic locking | Low per-spot contention in most lots; simpler, no external dependency |
| **Spot detection** | Individual sensors per bay | Camera-based (computer vision) | Hybrid: sensors for bays, ANPR for gates | Sensors: 99%+ accuracy per bay. Cameras: better for plate recognition |
| **Gate processing** | Cloud-only | Edge + cloud | Edge + cloud | Gates must work offline. Non-negotiable for physical barriers |
| **Reservation window** | Any future date allowed | 15-min entry window | Time-limited window with grace period | Prevents slot squatting; improves utilization |
| **Spot pre-assignment** | Assign specific spot at booking | Assign at arrival | Pre-assign at booking | Better UX (driver knows where to go); slightly lower utilization |
| **Exit payment failure** | Block gate until payment succeeds | Open gate, defer payment | Open gate, defer payment | Blocking creates traffic backup; deferred payment is recoverable |
| **Availability query** | Real-time DB query | Redis bitmap + pre-computed intervals | Redis bitmap | Sub-millisecond lookups; 6 MB for 10K lots; trivial memory cost |
| **Sensor debounce** | Single reading confirms change | Two readings 3s apart | Two readings | Eliminates false positives from pedestrians, carts; minimal latency cost |

---

## Trap Questions & Model Answers

### "What if the sensor malfunctions and shows a spot as available when it's actually occupied?"

**Answer**: Sensor readings are cross-validated against gate events. If the sensor says VACANT but no exit event was recorded for that spot's vehicle, the system distrusts the sensor and keeps the status as OCCUPIED. The sensor is flagged for maintenance. Additionally, the debounce filter requires two consistent readings before acting on a state change. For aggregate display boards, sensor data is reconciled with gate-based entry/exit counts---if the gate count says 300 vehicles entered and 100 exited, the occupancy is 200 regardless of individual sensor readings.

### "How do you handle a vehicle that doesn't exit within the reserved window?"

**Answer**: Three mechanisms:
1. **Grace period**: 30 minutes past end_time before the system takes action.
2. **Overtime charge**: After grace period, booking automatically extends at the standard hourly rate. User is notified ("Your booking expired; overtime charges are accruing").
3. **Status correction**: After grace period, if the sensor still shows OCCUPIED, the spot remains OCCUPIED (physically, the car is still there). The booking status changes to OVERTIME. The spot does not become AVAILABLE for new bookings until the vehicle actually leaves.

The key insight is that **physical state always overrides logical state**. If the car is physically there, the software state must reflect that, regardless of what the booking says.

### "How would you scale to 100K lots?"

**Answer**: The system already shards by `lot_id`, so scaling from 10K to 100K lots is a matter of adding shards. Each shard handles ~100 lots independently. No architectural changes needed because:
- Cross-lot queries are rare and handled by analytics replicas
- Redis bitmaps for 100K lots = ~60 MB (still trivial)
- Gate controllers are independent per lot
- IoT Hub scales horizontally with per-lot partitioning

The real scaling challenge at 100K lots is operational: provisioning and monitoring 200K+ gate controllers, managing firmware updates across the fleet, and handling the long tail of connectivity issues across diverse network environments.

### "What if the lot loses power?"

**Answer**: Fire codes in most jurisdictions require parking gates to default to OPEN on power loss (vehicles must be able to exit during emergencies). The gate controller has a 4-hour UPS battery backup that maintains the controller's ability to log events and communicate. After UPS depletion, gates default to open. On power restoration, the controller boots, syncs with the cloud, and reconciles any entry/exit events that occurred during the outage.

### "How do you handle the 'last spot' race condition?"

**Answer**: When only one spot of a given type remains:
1. The booking service uses optimistic locking on the spot's version column
2. First transaction to UPDATE with the correct version wins
3. All other transactions see `rowsAffected == 0` and receive a NO_AVAILABILITY response
4. The losing transactions can suggest alternative spot types ("No compact spots available. 12 regular spots available. Would you like to book a regular spot?")
5. Redis availability count is decremented only after the database transaction commits

This is simpler than concert ticketing because: (a) there are usually multiple spots of each type, so contention is low, and (b) spot types are substitutable (a compact car can park in a regular spot), providing natural fallback options.

### "What about electric vehicle charging spot management?"

**Answer**: EV spots have additional complexity:
- **State model**: AVAILABLE → RESERVED → OCCUPIED_CHARGING → OCCUPIED_CHARGED → AVAILABLE (the OCCUPIED_CHARGED state means the vehicle is done charging but hasn't left)
- **Pricing**: Parking fee + charging fee (kWh-based from the charger's meter)
- **Charging limit**: After charging completes, the system waits a grace period (30 min), then notifies the driver to move the vehicle. If the vehicle remains, an "idle fee" is applied to incentivize turnover.
- **Charger integration**: The EV charger reports charging status via the IoT hub, updating the spot's sub-state.

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Ignoring offline gate operation | Shows lack of understanding of physical systems | Design edge-first gate control with local cache and reconciliation |
| Using a single global database | Doesn't scale; no locality benefits | Shard by lot_id---parking is perfectly geo-fenced |
| Designing only for reservations | Many lots are walk-in only; permits are common | Support three entry modes: QR (booking), ticket (walk-in), ANPR (permit) |
| Flat data model (lot → spot only) | Misses floor, zone hierarchy needed for real lots | Model the full hierarchy: lot → floor → zone → spot |
| Trusting sensor data blindly | Sensors have false positives/negatives | Debounce + cross-validate with gate events |
| Synchronous payment at exit | Creates traffic backup during rush hour | Pre-payment, queue-based payment, express lanes |
| No spot state machine | Status transitions become ad-hoc and buggy | Explicit state machine: AVAILABLE → RESERVED → OCCUPIED → AVAILABLE |

---

## Interview Variants

### Variant 1: Single-Lot Kiosk (Simplified)

- Skip: Multi-tenant, corporate hierarchy, ANPR, reservations
- Focus: Ticket-based entry/exit, pricing calculation, basic availability
- Good for: Junior/mid-level interviews, 30-minute format

### Variant 2: Multi-Lot SaaS Platform (Full Scope)

- Include: All features from this guide
- Focus: Object model, offline gates, allocation algorithm, scalability
- Good for: Senior/staff-level interviews, 45-minute format

### Variant 3: Airport Mega-Lot (Scale Focus)

- Emphasize: 30K spots, multiple terminals, shuttle integration, long-term vs short-term zones
- Focus: Scalability, high-throughput entry/exit, pre-booking mandatory, wayfinding
- Good for: Staff/principal-level interviews

### Variant 4: Smart City Network (IoT Focus)

- Emphasize: Street parking meters + garages, city-wide real-time availability map, enforcement integration
- Focus: IoT architecture, sensor network design, real-time data aggregation, mobile payment
- Good for: IoT/platform-focused interviews
