# Deep Dive & Bottlenecks

## 1. Deep Dive: Server Tick Loop

The server tick loop is the heart of the entire system — a fixed-timestep cycle that must reliably complete all game simulation and network I/O within a strict time budget (e.g., 16.67 ms at 60 Hz).

### 1.1 Tick Loop Internals

```
MAIN_LOOP:
  tick_interval = 1.0 / TICK_RATE  // 16.67ms at 60 Hz
  next_tick_time = now()

  LOOP FOREVER:
    // Phase 1: Wait for tick boundary
    sleep_until(next_tick_time)
    tick_start = now()

    // Phase 2: Drain input queue
    inputs = input_queue.drain_all()
    FOR EACH (client_id, input) IN inputs:
      validate_input(client_id, input)
      apply_input_to_entity(client_id, input)
    TIME_CHECKPOINT("input_processing")

    // Phase 3: Physics simulation
    physics_engine.step(tick_interval)
    resolve_penetrations()
    update_spatial_hash()
    TIME_CHECKPOINT("physics")

    // Phase 4: Game logic
    advance_projectiles(tick_interval)
    process_hit_requests_with_lag_compensation()
    apply_damage_events()
    check_eliminations()
    update_zone(tick_interval)
    process_item_interactions()
    TIME_CHECKPOINT("game_logic")

    // Phase 5: Interest management
    FOR EACH player IN alive_players:
      player.interest_set = build_interest_set(player)
    TIME_CHECKPOINT("interest_management")

    // Phase 6: Store tick history (for lag compensation)
    world_history.store(current_tick, snapshot_world_state())
    TIME_CHECKPOINT("history_storage")

    // Phase 7: Serialize and send
    FOR EACH player IN connected_players:
      snapshot = build_delta_snapshot(player, player.interest_set)
      send_snapshot(player, snapshot)
    TIME_CHECKPOINT("serialization_and_send")

    // Phase 8: Bookkeeping
    tick_duration = now() - tick_start
    record_metric("tick_duration_ms", tick_duration * 1000)
    IF tick_duration > tick_interval:
      record_metric("tick_overrun", 1)
      log_warning("Tick overrun: {tick_duration}ms > {tick_interval}ms")

    current_tick += 1
    next_tick_time += tick_interval

    // If we're behind, catch up without busy-waiting
    IF now() > next_tick_time:
      next_tick_time = now()  // Skip to prevent spiral
      record_metric("tick_skip", 1)
```

### 1.2 Tick Budget Breakdown

```
Target: 16.67 ms (60 Hz) — breakdown for 100-player match

┌──────────────────────────────┬──────────┬──────────┐
│ Phase                        │ Budget   │ % Total  │
├──────────────────────────────┼──────────┼──────────┤
│ Input processing (100 inputs)│ 1.5 ms   │  9%      │
│ Physics simulation           │ 4.0 ms   │ 24%      │
│ Game logic + combat          │ 3.5 ms   │ 21%      │
│ Interest management          │ 1.5 ms   │  9%      │
│ History snapshot storage     │ 0.5 ms   │  3%      │
│ Serialization (100 clients)  │ 3.0 ms   │ 18%      │
│ Network send (100 packets)   │ 1.5 ms   │  9%      │
│ Headroom / GC / jitter       │ 1.17 ms  │  7%      │
├──────────────────────────────┼──────────┼──────────┤
│ TOTAL                        │ 16.67 ms │ 100%     │
└──────────────────────────────┴──────────┴──────────┘
```

### 1.3 What Happens When a Tick Overruns

```
Scenario: Physics takes 6 ms instead of 4 ms (complex multi-body collision)

Options:
  1. SKIP NEXT TICK: Skip one tick to catch up — causes a jitter
     visible to all clients as an uneven update interval.
     Impact: All players see a brief hitch.

  2. DROP TICK RATE: Temporarily reduce to 30 Hz for next few ticks.
     Impact: Smoother degradation; clients adapt interpolation.

  3. SHED LOAD: Reduce interest management radius or skip
     low-priority entity updates for this tick.
     Impact: Distant entities update less frequently.

  4. SPLIT SERIALIZATION: Serialize for half the players this tick,
     other half next tick (round-robin).
     Impact: Individual client update rate drops by half temporarily.

Best practice: Combine options 2 + 3 — adapt tick rate and shed
non-critical work to protect the simulation's real-time guarantee.
```

---

## 2. Deep Dive: Lag Compensation (Rewind / Replay)

### 2.1 The Fundamental Problem

```
Timeline (all times relative to server):

Server tick 100 (t=0):
  Player A is at position (50, 0)
  Player B is at position (100, 0)

Server tick 106 (t=100ms):
  Player A has moved to (55, 0)
  Player B has moved to (105, 0)

What Player B's client sees at their local time:
  Due to 60ms RTT + 50ms interpolation delay = 110ms behind server
  Player B sees Player A at their position from tick ~93: (45, 0)

Player B fires at what they see (Player A at 45, 0).
  Input travels to server: +30ms
  Server receives at tick ~108: Player A is now at (57, 0)

WITHOUT lag compensation:
  Server checks: Is Player A at (45, 0)? No, they're at (57, 0). MISS.
  → Player B saw a clear hit but the server says miss. Feels unfair.

WITH lag compensation:
  Server calculates B's perceived time: tick 108 - 110ms ≈ tick 93-94
  Server rewinds to tick 94: Player A was at (45, 0)
  Server checks: Would the shot at (45, 0) hit? YES. HIT registered.
  → What Player B saw on screen is what counts.
```

### 2.2 Rewind Implementation

```
ALGORITHM: RewindAndReplay

DATA:
  hitbox_history: Map<entity_id, CircularBuffer<tick, Hitbox>>
    // Stores hitbox state for last 256 ticks

ON_COMBAT_PHASE(current_tick):
  hit_requests = pending_hit_requests.drain()

  FOR EACH request IN hit_requests:
    shooter = request.shooter_id
    shooter_latency = get_client_rtt(shooter) / 2
    interp_delay = get_interpolation_delay(shooter)

    // Calculate how far to rewind
    rewind_time = shooter_latency + interp_delay
    rewind_time = min(rewind_time, MAX_REWIND)  // Cap at 200ms
    rewind_tick = current_tick - time_to_ticks(rewind_time)

    // Retrieve rewound hitboxes for all potential targets
    rewound_hitboxes = {}
    FOR EACH entity IN potential_targets(shooter):
      historical_hitbox = hitbox_history[entity].get(rewind_tick)
      IF historical_hitbox != NONE:
        rewound_hitboxes[entity] = historical_hitbox

    // Perform hit detection against rewound world
    IF request.weapon.type == HITSCAN:
      hit = raycast_against(request.ray, rewound_hitboxes)
    ELSE:
      hit = overlap_test(request.projectile_bounds, rewound_hitboxes)

    // Validate and apply
    IF hit.valid:
      IF passes_anti_cheat_check(request, hit):
        apply_damage(hit.target, request.weapon.damage)
        emit_event(HIT, shooter, hit.target, hit.location)
      ELSE:
        flag_suspicious(shooter, "invalid_hit")

ANTI_CHEAT_CHECKS:
  1. Fire rate validation: time since last shot ≥ weapon fire rate
  2. Ammo validation: shooter has ammo
  3. Line of sight: no solid geometry between shooter and hit point
  4. Distance validation: target within weapon effective range
  5. Angle validation: shot direction roughly matches aim direction
  6. Speed validation: shooter not moving impossibly fast
```

### 2.3 Edge Cases in Lag Compensation

| Scenario | Problem | Resolution |
|----------|---------|------------|
| **High-latency player** | 400ms RTT → wants 250ms rewind | Cap at 200ms; beyond that, disadvantage is accepted |
| **Player behind cover** | Shooter saw target before they ducked; server rewinds to exposed state | "Peeker's advantage" — accepted trade-off favoring the shooter |
| **Mutual elimination** | Both players fire simultaneously; both see hits | Allow simultaneous kills (trades); both get credit |
| **Teleporting target** | Target used teleport between shooter's perceived time and server time | Check if target had teleport event in rewind window; deny hit if so |
| **Dead player shooting** | Player eliminated on server but input arrives for shots fired before death | Allow hits from pre-death inputs if within valid rewind window |

---

## 3. Deep Dive: Delta Compression

### 3.1 Compression Pipeline

```
Full Compression Pipeline (per entity per client):

Raw State → Quantization → Delta Encoding → Bit Packing → Packet
  100 bytes     60 bytes       18 bytes       14 bytes

Stage 1 — Quantization:
  Position:  3 × float32 → 3 × 20-bit   (12 → 7.5 bytes, 37.5% saved)
  Rotation:  4 × float32 → 29 bits       (16 → 3.6 bytes, 77% saved)
  Velocity:  3 × float32 → 3 × 12-bit    (12 → 4.5 bytes, 62.5% saved)
  Health:    int32 → u8                   (4 → 1 byte, 75% saved)
  Total:     ~100 bytes → ~60 bytes       (40% reduction)

Stage 2 — Delta Encoding:
  Only transmit fields that changed since baseline
  Typical: 30% of fields change per tick
  60 bytes × 0.30 = ~18 bytes average per entity

Stage 3 — Bit Packing:
  Variable-length integers
  Changed-field bitmask (1 bit per field)
  Small deltas encoded with fewer bits
  ~18 bytes → ~14 bytes (22% additional reduction)

Overall: 100 bytes → 14 bytes = 86% compression ratio
```

### 3.2 Baseline Management

```
Per-Client Baseline Tracking:

Each client has an independent baseline (the last snapshot they ack'd).

  Client A (good connection, 30ms RTT):
    Baseline: tick 97 (3 ticks behind current)
    Delta size: small (only 3 ticks of changes)

  Client B (poor connection, 200ms RTT):
    Baseline: tick 88 (12 ticks behind current)
    Delta size: larger (12 ticks of accumulated changes)

  Client C (just reconnected):
    Baseline: NONE
    Must receive full state snapshot (~100 KB) before switching to deltas

Challenge: Server must retain world state for all active baselines.
  Oldest possible baseline: max_rtt / tick_interval = 200ms / 16.67ms ≈ 12 ticks
  Plus safety margin: 256 ticks (~4.3 seconds)
  Memory: 256 ticks × ~28 KB per snapshot = ~7 MB per match
```

### 3.3 Bandwidth Budget Allocation

```
Per-Client Bandwidth Budget: 60 Kbps = 7,500 bytes/second
At 30 Hz send rate: 250 bytes per snapshot packet

Packet budget:
  Header:                    8 bytes
  Tick metadata:             8 bytes
  Reliable event queue:      ~30 bytes (amortized)
  Entity updates:            ~204 bytes available

With 14 bytes average per entity delta:
  204 / 14 ≈ 14 entities per packet

But interest set may contain 40-60 entities.
Solution: Priority accumulator rotates through entities.
  High-priority (close, shooting): every packet (~30 Hz)
  Medium-priority (medium range): every 2-3 packets (~10-15 Hz)
  Low-priority (far, stationary): every 5-10 packets (~3-6 Hz)
```

---

## 4. Race Conditions in Concurrent Player Actions

### 4.1 Simultaneous Action Conflicts

| Conflict | Example | Resolution |
|----------|---------|------------|
| **Two players pick up same item** | Both send "pickup" in same tick | First processed wins (input queue order); second gets "item unavailable" |
| **Mutual damage** | A shoots B, B shoots A in same tick | Both hits resolve independently; both can die (trade kill) |
| **Build on same location** | Two players place structure at same grid cell | First processed wins; second gets "space occupied" |
| **Vehicle entry conflict** | Two players enter same vehicle seat | First processed wins; second is bounced |
| **Damage + Heal same tick** | Player takes damage and uses heal item in same tick | Apply damage first, then heal (deterministic ordering) |

### 4.2 Input Ordering Guarantees

```
Within a single tick, inputs are processed in deterministic order:
  1. Sort by client_id (stable, reproducible)
  2. Within same client: chronological by client_tick

Cross-tick guarantee:
  - Tick N fully resolves before Tick N+1 begins
  - No concurrent tick execution (single-threaded simulation)
  - Events within a tick are atomically visible in next tick's state

This single-threaded simulation model eliminates most traditional
race conditions at the cost of limiting tick rate to what one core
can handle. This is a fundamental design choice.
```

### 4.3 Input Arrival Timing

```
Problem: Client input for tick N arrives after server has already
         processed tick N.

Scenario:
  Server is at tick 100. Client sends input for tick 98 (arrived late).

Options:
  A) DROP: Ignore the late input. Client prediction was wrong; correction sent.
     Pro: Simple, deterministic. Con: Player feels input was "eaten."

  B) QUEUE FOR NEXT TICK: Apply as if it arrived at tick 100.
     Pro: Input respected. Con: 2-tick delay vs what client expected.

  C) LAG COMPENSATION: Process input with rewind to tick 98.
     Pro: Matches client perception. Con: Complex; only works for some actions.

Best practice: Use (A) for movement, (C) for combat, (B) for interactions.
```

---

## 5. Bottleneck Analysis

### 5.1 Bandwidth Per Player

```
Bottleneck: Downstream bandwidth to each player

Analysis:
  100 players × ~200 bytes raw state = 20 KB per tick
  × 30 ticks/s = 600 KB/s raw state per tick
  ÷ 100 players = 6 KB/s per player if broadcasting everything

  After interest management (60% filter): 3.6 KB/s
  After delta compression (70% reduction): ~1.1 KB/s = 8.8 Kbps

  BUT: Include reliable events, headers, redundancy → 30-60 Kbps typical

  Cellular connection budget: 60-100 Kbps downstream
  → Tight but achievable with aggressive compression

Mitigation strategies:
  1. Adaptive send rate: reduce snapshot Hz during bandwidth pressure
  2. Level-of-detail replication: fewer fields for distant entities
  3. Prioritized partial updates: send most important entities first
  4. Variable quantization: use fewer bits when precision matters less
```

### 5.2 CPU Per Tick

```
Bottleneck: Single-threaded tick simulation must complete within budget

Analysis (100-player match at 60 Hz):
  Total budget: 16.67 ms
  Physics (AABB broadphase + narrowphase): 4-6 ms for 200 dynamic entities
  Serialization for 100 clients: 3-5 ms

  Peak scenario: Endgame with 30 players in small zone
    Physics: cheaper (fewer entities spread out) BUT
    All entities visible to all players → serialization explodes
    30 players × 30 relevant entities × delta encode = 900 delta operations

Mitigation strategies:
  1. Parallelize serialization: state is read-only during send phase
     → Thread pool encodes deltas for different clients concurrently
  2. Cache delta results: if 20 clients have similar interest sets,
     compute delta once, clone for each client
  3. Reduce tick rate dynamically when CPU budget exceeds 80%
  4. Profile and optimize hotspots per game update (physics vs. combat)
```

### 5.3 State Serialization Cost

```
Bottleneck: Encoding unique delta snapshots for 100 clients

Analysis:
  Each client has:
    - Unique baseline tick (depends on their ack latency)
    - Unique interest set (depends on their position)
  → Worst case: 100 unique delta computations per tick

  Delta computation per client:
    - Iterate ~50 entities in interest set
    - For each: compare ~10 fields against baseline
    - Quantize + bit-pack changed fields
    - Time: ~30 µs per entity × 50 = 1.5 ms per client

  100 clients × 1.5 ms = 150 ms — FAR exceeds tick budget!

Optimizations (required):
  1. GROUP CLIENTS BY BASELINE: Clients with same baseline tick
     share the same delta computation. At 30 Hz with 50ms avg RTT,
     most clients cluster around 1-3 baseline ticks.
     → Reduces from 100 to ~3-5 unique delta sets.

  2. CACHE DELTA PER ENTITY: Compute delta for each entity once
     per unique baseline, then combine per client interest set.
     → 200 entities × 5 baselines × 30 µs = 30 ms (still too much)

  3. PARALLELIZE: Distribute clients across worker threads.
     With 4 threads: 30 ms / 4 = 7.5 ms → fits in budget.

  4. INCREMENTAL DIRTY FLAGS: Track which components changed
     this tick with a bitmask. Skip unchanged components entirely.
     → Reduces per-entity cost from 30 µs to ~5 µs for unchanged entities.

  Combined: ~2-3 ms for serialization (within budget)
```

### 5.4 Memory Per Match

```
Component                          | Memory
─────────────────────────────────────────────────
Entity state (200 entities)       |   ~40 KB
Spatial hash grid                  |   ~16 KB
Tick history (256 ticks)          |    ~7 MB
Hitbox history (256 ticks)        |    ~3 MB
Per-client state (100 clients)    |   ~200 KB
Input buffers (100 × 64 inputs)   |   ~640 KB
Serialization buffers             |   ~500 KB
Physics engine state              |    ~2 MB
─────────────────────────────────────────────────
Total per match:                  |   ~13.4 MB

With 8 GB RAM per server instance:
  Theoretical max: 8 GB / 13.4 MB ≈ 596 matches
  Practical (with OS, runtime, headroom): 1 match per instance
  (CPU is the binding constraint, not memory)
```

### 5.5 Network Syscall Overhead

```
Bottleneck: Sending 100 individual UDP packets per tick

Analysis:
  100 sendto() syscalls per tick at 60 Hz = 6,000 syscalls/second
  Each syscall: ~2-5 µs (kernel context switch)
  Total: 12-30 ms/second of pure syscall overhead

Mitigation:
  1. SENDMMSG: Batch multiple packets in single syscall (Linux)
     → 100 packets in 1 syscall: ~10 µs total
     → 99.7% reduction in syscall overhead

  2. UDP GSO (Generic Segmentation Offload):
     → Offload packet splitting to network hardware
     → Further reduces CPU involvement

  3. EDGE RELAY FAN-OUT: Send one aggregated packet to edge relay
     → Edge relay fans out to individual players
     → Server sends 3-5 regional packets instead of 100
     → Dramatic reduction in server-side networking cost
```

---

## 6. Failure Mode Analysis

| Failure | Impact | Detection | Recovery |
|---------|--------|-----------|----------|
| **Tick overrun (sustained)** | All players experience hitching | Tick duration histogram | Dynamic tick rate reduction; shed non-critical systems |
| **Client packet loss burst** | One player rubber-bands | Client ack gap; RTT spike | Client increases jitter buffer; server maintains history for longer delta |
| **Server packet loss burst** | All clients see stale state | Edge relay RTT measurement | Edge relay switches to backup route; clients increase interpolation buffer |
| **Server crash** | Match lost | Fleet manager heartbeat miss | Match terminated; players returned to lobby with compensation |
| **Client desync** | One player sees incorrect world | Periodic checksum mismatch | Force full state resync for affected client |
| **Bandwidth saturation** | All clients get degraded updates | Interface TX queue depth | Reduce send rate; increase compression; tighten interest radius |
| **Memory exhaustion** | Server instability | RSS monitoring | Flush oldest tick history; reduce hitbox history depth |
| **Edge relay failure** | Players in one region disconnect | Edge health checks | DNS failover to backup relay; players reconnect within seconds |
