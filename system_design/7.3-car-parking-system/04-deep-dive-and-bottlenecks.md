# Deep Dive & Bottlenecks

## Deep Dive 1: Gate Offline Resilience

### The Problem

Parking gates are physical barriers. Unlike a web application where a backend outage shows an error page, a gate failure physically blocks vehicles from entering or exiting. If the cloud backend is unreachable---due to network outage, ISP failure, or datacenter issue---the gate must continue to operate. A driver stuck at a gate because the server is down is not just a bad user experience; it creates a traffic backup that can cascade into the street.

### Edge Architecture

Each gate controller is an embedded computing device (industrial-grade single-board computer with local storage) that can make autonomous decisions:

```
┌────────────────────────────────────────────────────────┐
│                   Gate Controller                       │
│                                                        │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │ Local SQLite │  │  Decision     │  │  Sync       │ │
│  │  Database    │  │  Engine       │  │  Manager    │ │
│  │             │  │              │  │             │ │
│  │ - Bookings  │  │ - Validate   │  │ - Pull from │ │
│  │   (cached)  │  │   QR codes   │  │   cloud     │ │
│  │ - Permits   │  │ - Match      │  │ - Push      │ │
│  │   (cached)  │  │   plates     │  │   offline   │ │
│  │ - Offline   │  │ - Dispense   │  │   events    │ │
│  │   events    │  │   tickets    │  │ - Conflict  │ │
│  │   (queued)  │  │ - Gate open/ │  │   resolve   │ │
│  │             │  │   close      │  │             │ │
│  └──────────────┘  └───────────────┘  └─────────────┘ │
│                                                        │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │ ANPR Module │  │  Ticket      │  │  Display    │ │
│  │             │  │  Printer     │  │  Driver     │ │
│  └──────────────┘  └───────────────┘  └─────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Cache Sync Strategy

```
SYNC CYCLE (runs every 30 seconds when online):

1. PULL from cloud:
   - Active bookings for this lot (next 24 hours)
   - Active permits for this lot
   - Pricing rules (changes infrequently)
   - Spot status updates

2. PUSH to cloud:
   - Any offline events since last successful sync
   - Gate health telemetry

3. CONFLICT DETECTION:
   - If cloud shows a booking as CANCELLED that local cache has as CONFIRMED:
     Update local cache → booking is now invalid
   - If cloud shows a permit as EXPIRED that local cache has as ACTIVE:
     Update local cache → permit holder denied on next entry
```

### Offline Decision Matrix

| Entry Type | Online Behavior | Offline Behavior | Risk |
|-----------|----------------|------------------|------|
| **QR (booking)** | Validate against Booking Service | Validate against local cache | Booking cancelled after last sync → stale approval |
| **ANPR (permit)** | Validate against Permit Service | Validate against local cache | Permit revoked after last sync → stale approval |
| **Ticket (walk-in)** | Generate cloud ticket, open gate | Generate offline ticket, open gate | No risk (always allowed) |
| **Exit (payment)** | Calculate fee → process payment → open | Calculate fee locally → defer payment → open | Revenue leakage if driver leaves without paying later |

### Reconciliation on Reconnect

```
FUNCTION reconcileOfflineEvents(offlineEventQueue):
    FOR event IN offlineEventQueue (ordered by timestamp):
        // Upload to cloud
        result = cloudService.processGateEvent(event)

        IF result == CONFLICT:
            // Example: booking was cancelled while gate was offline,
            // but gate admitted the vehicle based on stale cache
            IF event.type == ENTRY AND event.booking_id IS NOT NULL:
                booking = cloudService.getBooking(event.booking_id)
                IF booking.status == CANCELLED:
                    // Vehicle entered on a cancelled booking
                    // Convert to walk-in ticket retroactively
                    cloudService.createRetroactiveTicket(
                        lot_id: event.lot_id,
                        entry_time: event.timestamp,
                        vehicle_plate: event.license_plate
                    )
                    alertOperator("Vehicle entered on cancelled booking during outage")

        markEventAsSynced(event.id)
```

### Design Decision: Fail-Open vs Fail-Closed

**Decision: Fail-open for entry, fail-open-with-logging for exit.**

- **Entry**: Always allow vehicles to enter (dispense ticket if validation fails). A false admission is recoverable (charge at exit). A false denial blocks a vehicle and causes traffic backup.
- **Exit**: If payment cannot be processed (payment service down), open the gate but log the unpaid exit for later collection. A vehicle blocked at exit is worse than deferred revenue.
- **Exception**: If the lot is at capacity (local counter shows 100% occupancy), deny entry even in offline mode to prevent physical overcrowding.

---

## Deep Dive 2: Real-Time Spot Availability with Sensors

### Sensor Technology Comparison

| Technology | Accuracy | Cost/Unit | Installation | Maintenance | Best For |
|-----------|----------|-----------|-------------|-------------|----------|
| **Ultrasonic** | 99%+ | $30-50 | Ceiling mount | Low (no moving parts) | Indoor garages |
| **Infrared (IR)** | 97-99% | $20-40 | Ceiling/wall mount | Medium (lens cleaning) | Indoor garages |
| **Magnetic** | 98%+ | $40-60 | Ground embedded | Low (sealed unit) | Outdoor lots, street parking |
| **Camera-based** | 95-98% | $500-1K (per 20-40 bays) | Overhead mount | Medium (calibration) | Large open lots |
| **Radar** | 99%+ | $100-200 | Ceiling mount | Low | Premium garages |

### Event Pipeline Architecture

```
Sensor → Gate Controller (local aggregation) → IoT Hub → Message Queue → Event Processor → Slot Service → Redis → Display Board

Latency budget (end-to-end < 3 seconds):
  Sensor detection:           ~200ms (hardware response time)
  Controller aggregation:     ~100ms (batch + forward)
  Network to IoT Hub:         ~200ms (local network or cellular)
  IoT Hub to Message Queue:   ~100ms (internal)
  Event Processor debounce:   ~500ms (wait for confirmation reading)
  Slot Service update:        ~100ms (DB + Redis)
  WebSocket push to display:  ~200ms (fan-out)
  Display board render:       ~100ms (LED/LCD update)
  ─────────────────────────────────────
  Total:                      ~1,500ms typical (within 3s budget)
```

### Debounce Filter Logic

Raw sensor readings are noisy. A pedestrian walking past, a shopping cart, or sensor malfunction can trigger false state changes. The debounce filter requires two consistent readings before confirming a state change:

```
FUNCTION processSensorEvent(sensorId, newState, timestamp):
    previousReading = getLastReading(sensorId)

    IF previousReading IS NULL OR previousReading.state != newState:
        // First reading of new state → store but don't act
        storeReading(sensorId, newState, timestamp, confirmed: false)
        RETURN  // Wait for confirmation

    IF previousReading.state == newState AND NOT previousReading.confirmed:
        timeDelta = timestamp - previousReading.timestamp

        IF timeDelta >= 3 SECONDS AND timeDelta <= 60 SECONDS:
            // Two consistent readings, 3-60s apart → confirmed state change
            storeReading(sensorId, newState, timestamp, confirmed: true)
            spotId = sensorToSpotMapping(sensorId)

            IF newState == OCCUPIED:
                slotService.markOccupied(spotId)
            ELSE IF newState == VACANT:
                slotService.markAvailable(spotId)

        ELSE IF timeDelta > 60 SECONDS:
            // Too long between readings → treat as new first reading
            storeReading(sensorId, newState, timestamp, confirmed: false)
```

### Sensor Failure Handling

| Failure Mode | Detection | Response |
|-------------|-----------|----------|
| **Sensor stops reporting** | No heartbeat for 10 minutes | Mark sensor as UNHEALTHY; spot status frozen at last known state |
| **Sensor stuck in one state** | No state change for 24 hours despite gate events | Alert lot operator; fall back to gate-event-based tracking |
| **False positive flood** | State changing faster than once per minute | Rate-limit state changes; alert maintenance |
| **Sensor reads VACANT but gate shows no exit** | Cross-reference sensor + gate events | Trust gate event; mark sensor for calibration |

### Cross-Validation with Gate Events

Sensor data alone is not authoritative. The system cross-validates sensor readings with gate entry/exit events:

```
IF sensor says spot VACANT but no exit event recorded for that vehicle:
    → Sensor may be faulty. Keep status as OCCUPIED. Alert operator.

IF gate records exit but sensor still shows OCCUPIED:
    → Sensor may be stuck. Mark spot as AVAILABLE after 10-minute timeout. Alert maintenance.

IF gate records entry but no sensor shows OCCUPIED within 5 minutes:
    → Vehicle may have parked in wrong spot or sensor missed it. Keep lot-level count accurate via gate.
```

---

## Deep Dive 3: Concurrent Booking & Double-Allocation Prevention

### The Problem

When two users simultaneously try to book the last available compact spot for overlapping time windows, the system must guarantee that exactly one succeeds. Unlike an e-commerce inventory problem where overselling is correctable (cancel the order, refund), parking double-allocation means two vehicles are directed to the same physical bay---an unrecoverable real-world conflict.

### Approach 1: Optimistic Locking (Chosen for Reservations)

```
// Each parking_spot has a `version` column

FUNCTION bookSpotOptimistic(spotId, userId, startTime, endTime):
    // Step 1: Read current spot state
    spot = SELECT id, status, version FROM parking_spots WHERE id = spotId

    // Step 2: Verify no overlapping bookings
    overlaps = SELECT COUNT(*) FROM bookings
        WHERE spot_id = spotId
          AND status IN (CONFIRMED, ACTIVE)
          AND NOT (endTime <= start_time OR startTime >= end_time)

    IF overlaps > 0:
        RETURN { error: SPOT_NOT_AVAILABLE }

    // Step 3: Attempt atomic update with version check
    result = UPDATE parking_spots
        SET status = RESERVED, version = version + 1
        WHERE id = spotId AND version = spot.version

    IF result.rowsAffected == 0:
        // Another transaction modified the spot → retry with different spot
        RETURN { error: OPTIMISTIC_LOCK_CONFLICT, retry: true }

    // Step 4: Create booking (spot is now locked to this transaction)
    INSERT INTO bookings (...)
    RETURN { success: true }
```

**Why optimistic locking works well for parking:**
- Contention is low per-spot (unlike concert tickets where 10,000 users target the same seats)
- Typical lot has hundreds of spots of each type, so conflict probability is low
- Retry with a different spot is always possible (unlike a specific concert seat)
- No long-held locks that block other transactions

### Approach 2: Pessimistic Locking (Alternative for High-Contention Scenarios)

```
// Use SELECT FOR UPDATE to lock the row

FUNCTION bookSpotPessimistic(spotId, userId, startTime, endTime):
    BEGIN TRANSACTION

    // Lock the spot row → other transactions wait
    spot = SELECT * FROM parking_spots
        WHERE id = spotId
        FOR UPDATE NOWAIT  // fail immediately if locked

    IF spot.status != AVAILABLE:
        ROLLBACK
        RETURN { error: SPOT_NOT_AVAILABLE }

    // Check overlapping bookings (safe because spot row is locked)
    overlaps = SELECT COUNT(*) FROM bookings
        WHERE spot_id = spotId
          AND status IN (CONFIRMED, ACTIVE)
          AND NOT (endTime <= start_time OR startTime >= end_time)

    IF overlaps > 0:
        ROLLBACK
        RETURN { error: TIME_CONFLICT }

    UPDATE parking_spots SET status = RESERVED WHERE id = spotId
    INSERT INTO bookings (...)

    COMMIT
    RETURN { success: true }
```

### Comparison: Optimistic vs Pessimistic

| Factor | Optimistic Locking | Pessimistic Locking |
|--------|-------------------|---------------------|
| **Throughput** | Higher (no lock waiting) | Lower (transactions queue up) |
| **Latency** | Lower average, higher variance (retries) | Higher average, lower variance |
| **Best when** | Low contention (<100 concurrent users per lot) | High contention (event venue, airport during holidays) |
| **Failure mode** | Retry storm under extreme contention | Deadlock possibility (mitigated by NOWAIT) |
| **Implementation** | Version column + conditional UPDATE | SELECT FOR UPDATE in transaction |

**Decision**: Optimistic locking as default. For high-demand lots during events (where contention spikes), the system can switch to a reservation queue pattern: requests are enqueued and processed serially per lot, eliminating contention at the cost of slightly higher latency (queue wait time).

### Approach 3: Distributed Lock (Redis-Based) for Hot Spots

For specific high-demand scenarios (e.g., last 5 EV spots in a lot during peak hours):

```
FUNCTION bookWithDistributedLock(lotId, spotType, userId, startTime, endTime):
    lockKey = "booking_lock:{lotId}:{spotType}"
    lockAcquired = REDIS.SET(lockKey, requestId, NX, EX, 5)  // 5-second TTL

    IF NOT lockAcquired:
        RETURN { error: TRY_AGAIN, retry_after_ms: 500 }

    TRY:
        // Only one request processes at a time for this lot+spotType
        spot = findBestAvailableSpot(lotId, spotType, startTime, endTime)
        IF spot IS NULL:
            RETURN { error: NO_AVAILABILITY }

        createBooking(spot, userId, startTime, endTime)
        RETURN { success: true, spot: spot }
    FINALLY:
        REDIS.DEL(lockKey)  // release lock
```

---

## Bottleneck Analysis

### Bottleneck 1: Sensor Event Volume at Busy Lots

**Problem**: A 5,000-spot lot with sensors generates up to 1.4M heartbeat events per day plus state change events. Writing all events directly to the primary database would overwhelm it.

**Solution**:
- **Time-series database** for raw sensor telemetry (heartbeats, readings). Not on the critical path.
- **Message queue buffer** between IoT Hub and Event Processor. Queue absorbs burst traffic during rush hour.
- **State-change-only writes** to PostgreSQL. Only confirmed state transitions (AVAILABLE → OCCUPIED or OCCUPIED → AVAILABLE) reach the primary database. Heartbeats go only to the time-series database.
- **Batch updates**: Aggregate availability changes and flush to Redis every 500ms instead of per-event.

### Bottleneck 2: Reservation Queries for Date Ranges

**Problem**: "Find available spots for Saturday 2PM-6PM" requires checking every spot against all existing bookings for that time range. For a 5,000-spot lot with 10,000 active bookings, this is an expensive interval overlap query.

**Solution**:
- **Pre-computed availability slots**: Divide each day into 30-minute intervals. Maintain a table `spot_availability_intervals` with one row per spot per interval (available: true/false). When a booking is created, mark the relevant intervals as unavailable.
- **Bitmap index**: For each lot + date + interval, maintain a bitmap where each bit represents a spot. Available spots have bit=1. To find available spots for a 4-hour window, AND the bitmaps for the 8 intervals → result is spots available for the entire window. This is an O(1) operation per interval.
- **Cache hot dates**: Pre-compute and cache availability for the next 7 days. Invalidate on booking creation/cancellation.

### Bottleneck 3: Payment at Exit During Rush Hour

**Problem**: During evening rush (5-7 PM), hundreds of vehicles exit simultaneously. If each exit requires synchronous payment processing (credit card authorization takes 2-5 seconds), gates back up and create traffic jams.

**Solution**:
- **Pre-payment at booking**: For pre-booked visitors, charge at booking time. Exit is payment-free (just open the gate).
- **Queue-based payment**: For walk-ins, open the gate immediately upon payment initiation (before authorization completes). If payment fails, log for later collection via license plate.
- **Contactless tap-to-pay**: Faster than card insertion (sub-1s authorization for small amounts).
- **Monthly billing for permits**: No per-exit payment at all.
- **Express exit lanes**: Dedicated lanes for pre-paid and permit holders (gate opens on QR/ANPR without payment step).

### Bottleneck 4: Display Board Update Fan-Out

**Problem**: When a spot changes state, all display boards in the lot (entry signs, floor-level displays, zone indicators) must update. A busy lot might have 50+ display boards, and state changes can happen every few seconds during rush hour.

**Solution**:
- **Aggregated updates**: Instead of pushing per-spot changes, push floor-level aggregates every 500ms. Display boards show "Floor 2: 23 available" not individual spot status.
- **WebSocket with topic-based subscription**: Each display board subscribes to its floor/zone topic. Only receives relevant updates.
- **Local caching on display boards**: Display boards cache the last known state and apply delta updates. Full refresh only every 30 seconds.
- **Stale tolerance**: Display boards can tolerate 3-5 seconds of staleness. This allows batching multiple spot changes into a single update.
