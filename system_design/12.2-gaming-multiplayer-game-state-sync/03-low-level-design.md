# Low-Level Design

## 1. Game State Data Model

### 1.1 Entity-Component Architecture

The game world is modeled using an **Entity-Component System (ECS)** — entities are lightweight identifiers, components are pure data, and systems operate on component groups.

```
Entity: A unique ID (u32) referencing a game object
Component: A typed data struct attached to an entity
System: Logic that processes entities with matching component sets

Example Entity Composition:
  Player Entity (ID: 4201)
    ├── TransformComponent    {position, rotation, scale}
    ├── VelocityComponent     {linear_velocity, angular_velocity}
    ├── HealthComponent       {current_hp, max_hp, shield_hp}
    ├── InventoryComponent    {weapon_slots[], item_slots[]}
    ├── InputComponent        {movement_vec, look_dir, actions}
    ├── NetworkComponent      {owner_client_id, replication_priority, last_replicated_tick}
    └── InterestComponent     {aoi_cell, visibility_set}

  Projectile Entity (ID: 8501)
    ├── TransformComponent    {position, rotation}
    ├── VelocityComponent     {linear_velocity}
    ├── ProjectileComponent   {damage, owner_id, weapon_type, spawn_tick}
    ├── LifetimeComponent     {remaining_ticks}
    └── NetworkComponent      {replication_priority}

  Destructible Entity (ID: 12003)
    ├── TransformComponent    {position, rotation, scale}
    ├── HealthComponent       {current_hp, max_hp}
    ├── DestructibleComponent {material_type, debris_prefab}
    └── NetworkComponent      {replication_priority}
```

### 1.2 Component Replication Metadata

Each component type declares its replication behavior:

```
ReplicationConfig per Component:
  ├── replicate: bool           // Whether this component replicates at all
  ├── condition: enum           // ALWAYS, OWNER_ONLY, INITIAL_ONLY, CUSTOM
  ├── priority: float           // Base replication priority (0.0 - 1.0)
  ├── quantization: struct      // Compression settings per field
  │    ├── position: { bits: 20, range: [-16384, 16384] }
  │    ├── rotation: { bits: 8, range: [0, 360] }
  │    └── velocity: { bits: 12, range: [-2048, 2048] }
  └── interpolation_mode: enum  // LINEAR, HERMITE, NONE
```

### 1.3 Spatial Hash Grid

For fast spatial queries (interest management, collision broadphase), entities are indexed in a **spatial hash grid**.

```
Spatial Hash:
  cell_size: 64 units (tuned to typical AOI radius / 4)
  grid_dimensions: world_size / cell_size

  hash(position) → cell_index:
    cell_x = floor(position.x / cell_size)
    cell_y = floor(position.y / cell_size)
    return cell_x + cell_y * grid_width

  Data structure:
    HashMap<cell_index, List<entity_id>>

  Operations:
    insert(entity_id, position)  → O(1)
    remove(entity_id, position)  → O(1)
    move(entity_id, old_pos, new_pos) → remove + insert = O(1)
    query_radius(center, radius) → iterate cells in bounding box = O(k)
      where k = number of cells in radius
```

### 1.4 Player State Structure

```
PlayerState:
  ├── entity_id: u32
  ├── client_id: u16
  ├── team_id: u8
  │
  ├── transform:
  │    ├── position: Vector3 (quantized to 20 bits per axis)
  │    ├── rotation: Quaternion (compressed to smallest-three, 2 bits index + 3×9 bits)
  │    └── scale: float16
  │
  ├── movement:
  │    ├── velocity: Vector3 (12 bits per axis)
  │    ├── acceleration: Vector3 (8 bits per axis)
  │    ├── movement_mode: enum { WALKING, SPRINTING, CROUCHING, JUMPING, FALLING, SWIMMING, FLYING }
  │    └── grounded: bool
  │
  ├── combat:
  │    ├── health: u8 (0-200)
  │    ├── shield: u8 (0-200)
  │    ├── active_weapon: u8
  │    ├── ammo_in_clip: u8
  │    ├── is_firing: bool
  │    ├── aim_direction: Vector3 (quantized)
  │    └── last_damage_tick: u32
  │
  ├── inventory:
  │    ├── weapon_slots[5]: WeaponDef
  │    ├── consumable_slots[6]: ItemDef
  │    ├── material_counts[3]: u16
  │    └── equipped_slot: u8
  │
  └── status:
       ├── alive: bool
       ├── eliminated_by: u16
       ├── placement: u8
       ├── kills: u8
       └── connection_quality: enum { GOOD, DEGRADED, POOR }
```

---

## 2. Network Protocol Design

### 2.1 Packet Header Format

All game packets share a common header:

```
Packet Header (8 bytes):
  ┌────────────────────────────────────────────┐
  │ protocol_id    : u16  (magic number 0xGS01)│
  │ packet_type    : u4   (input/snapshot/rpc/..)│
  │ flags          : u4   (fragmented, reliable)│
  │ sequence       : u16  (rolling sequence #)  │
  │ ack            : u16  (last received seq)   │
  │ ack_bitmask    : u16  (previous 16 acks)    │
  └────────────────────────────────────────────┘

Total: 8 bytes overhead per packet
```

### 2.2 Input Packet Format

```
Input Packet (≤128 bytes):
  ┌────────────────────────────────────────────┐
  │ header             : 8 bytes               │
  │ client_tick        : u32                   │
  │ input_count        : u4  (1-3, redundancy) │
  │ inputs[]:                                  │
  │   ├── tick_number  : u32                   │
  │   ├── movement_x   : i8  (normalized)     │
  │   ├── movement_y   : i8  (normalized)     │
  │   ├── look_yaw     : u16 (0-65535 → 0-360)│
  │   ├── look_pitch   : i16 (-90 to 90)      │
  │   ├── action_mask  : u16 (fire, jump, etc) │
  │   └── delta_data   : variable             │
  └────────────────────────────────────────────┘

With 3 redundant inputs: ~64-96 bytes per packet
At 60 Hz: 64 × 60 = 3,840 bytes/s ≈ 3.75 KB/s upstream
```

### 2.3 Snapshot Packet Format

```
Snapshot Packet (≤1200 bytes, MTU-safe):
  ┌────────────────────────────────────────────┐
  │ header             : 8 bytes               │
  │ server_tick        : u32                   │
  │ baseline_tick      : u32 (delta reference) │
  │ entity_count       : u8                    │
  │ entity_updates[]:                          │
  │   ├── entity_id    : u16                   │
  │   ├── component_mask: variable bits        │
  │   └── delta_data   : variable bits         │
  │ reliable_event_count: u8                   │
  │ reliable_events[]:                         │
  │   ├── event_seq    : u16                   │
  │   ├── event_type   : u8                    │
  │   └── event_data   : variable             │
  └────────────────────────────────────────────┘
```

### 2.4 Reliability Layer Over UDP

```
Reliability System:
  - Each packet carries a 16-bit rolling sequence number
  - Each packet carries an ack (last received remote seq) + 16-bit ack bitmask
  - Ack bitmask encodes receipt of the 16 packets prior to the ack sequence
  - Sender maintains send buffer of unacknowledged packets
  - On receiving ack, sender marks packets as acknowledged

  Reliable Channel (for RPCs / critical events):
    - Outgoing events queued with monotonic event_seq
    - Events included in every outgoing packet until acked
    - Receiver deduplicates by event_seq, processes in order
    - No retransmission timer — piggyback on regular packet cadence

  Unreliable Channel (for state updates):
    - Receiver tracks highest received sequence
    - Packets with lower sequence than highest are dropped (stale)
    - No retransmission — next snapshot supersedes
```

---

## 3. Core Algorithms

### 3.1 Client-Side Prediction

```
ALGORITHM: ClientPrediction

STATE:
  predicted_state: GameState          // Client's predicted local state
  input_buffer: CircularBuffer<Input> // Unacknowledged inputs (keyed by tick)
  last_server_tick: u32               // Last received server tick

ON_LOCAL_INPUT(input, client_tick):
  // Store input for potential replay
  input_buffer.push(client_tick, input)

  // Apply input to predicted state immediately
  predicted_state = simulate(predicted_state, input, TICK_DURATION)

  // Send input to server (include last 3 for redundancy)
  send_input_packet(input, client_tick, input_buffer.last(3))

ON_SERVER_SNAPSHOT(snapshot):
  server_tick = snapshot.server_tick

  // Discard acknowledged inputs
  input_buffer.discard_before(server_tick)

  // Check for misprediction
  server_state = snapshot.get_local_player_state()
  predicted_at_server_tick = get_predicted_state_at(server_tick)

  IF significant_difference(server_state, predicted_at_server_tick):
    // Reconciliation needed
    corrected_state = server_state

    // Replay all unacknowledged inputs on top of server state
    FOR EACH input IN input_buffer.after(server_tick):
      corrected_state = simulate(corrected_state, input, TICK_DURATION)

    // Apply correction with smoothing
    apply_correction(predicted_state, corrected_state, SMOOTHING_FACTOR)

  last_server_tick = server_tick
```

### 3.2 Snapshot Interpolation (Remote Entities)

```
ALGORITHM: SnapshotInterpolation

STATE:
  snapshot_buffer: SortedBuffer<tick, Snapshot>  // Received snapshots
  interpolation_delay: float = 2 * TICK_DURATION // Render behind real-time
  extrapolation_limit: float = TICK_DURATION * 5 // Max extrapolation time

ON_SNAPSHOT_RECEIVED(snapshot):
  snapshot_buffer.insert(snapshot.tick, snapshot)
  // Discard snapshots older than buffer window
  snapshot_buffer.discard_before(current_tick - MAX_BUFFER_TICKS)

ON_RENDER_FRAME(current_tick, delta_time):
  render_tick = current_tick - interpolation_delay

  // Find bracketing snapshots
  snap_before = snapshot_buffer.floor(render_tick)
  snap_after  = snapshot_buffer.ceiling(render_tick)

  IF snap_before AND snap_after:
    // Normal interpolation
    t = (render_tick - snap_before.tick) / (snap_after.tick - snap_before.tick)
    FOR EACH entity IN snap_before.entities:
      state_a = snap_before.get(entity)
      state_b = snap_after.get(entity)
      rendered_state = lerp(state_a, state_b, t)
      render(entity, rendered_state)

  ELSE IF snap_before AND NOT snap_after:
    // Extrapolation (snapshot late)
    time_since = render_tick - snap_before.tick
    IF time_since < extrapolation_limit:
      FOR EACH entity IN snap_before.entities:
        state = snap_before.get(entity)
        extrapolated = state.position + state.velocity * time_since
        render(entity, extrapolated)
    ELSE:
      // Too far behind — hold last known position
      render_from(snap_before)
```

### 3.3 Dead Reckoning

```
ALGORITHM: DeadReckoning

PURPOSE: Estimate entity position between/beyond snapshots using
         physics-based extrapolation

PARAMETERS:
  position: Vector3       // Last known position
  velocity: Vector3       // Last known velocity
  acceleration: Vector3   // Last known acceleration (optional)
  timestamp: float        // Time of last known state

PREDICT(current_time):
  dt = current_time - timestamp

  // Second-order prediction (position + velocity + acceleration)
  predicted_position = position + velocity * dt + 0.5 * acceleration * dt²

  // Apply game-specific constraints
  predicted_position = clamp_to_world_bounds(predicted_position)
  predicted_position = resolve_terrain_collision(predicted_position)

  RETURN predicted_position

SHOULD_CORRECT(actual_position, predicted_position):
  error = distance(actual_position, predicted_position)
  RETURN error > CORRECTION_THRESHOLD  // Typically 0.1 - 1.0 game units
```

### 3.4 Delta Compression

```
ALGORITHM: DeltaCompression

PURPOSE: Encode only changes between current state and a known baseline

STATE:
  per_client_baseline: Map<client_id, tick>  // Last ack'd snapshot per client

ENCODE_DELTA(current_state, baseline_state, entity_id):
  delta = BitWriter()

  components = get_components(entity_id)
  changed_mask = 0

  FOR EACH component IN components:
    current = current_state.get(entity_id, component)
    baseline = baseline_state.get(entity_id, component)

    IF current != baseline:
      changed_mask |= component.bit

  delta.write_bits(changed_mask, component_count)

  FOR EACH component WHERE changed_mask has bit set:
    current = current_state.get(entity_id, component)
    baseline = baseline_state.get(entity_id, component)

    // Field-level delta within component
    FOR EACH field IN component.fields:
      IF current[field] != baseline[field]:
        delta.write_bit(1)  // field changed
        delta.write_quantized(current[field] - baseline[field], field.quantization)
      ELSE:
        delta.write_bit(0)  // field unchanged

  RETURN delta.to_bytes()

ON_CLIENT_ACK(client_id, acked_tick):
  per_client_baseline[client_id] = acked_tick

BUILD_SNAPSHOT_FOR_CLIENT(client_id, current_tick):
  baseline_tick = per_client_baseline[client_id]

  IF baseline_tick == NONE:
    // First snapshot — send full state
    RETURN encode_full_state(current_tick, relevant_entities)

  baseline_state = tick_history.get(baseline_tick)
  current_state = tick_history.get(current_tick)

  packet = SnapshotPacket(current_tick, baseline_tick)

  FOR EACH entity IN interest_set(client_id):
    delta = ENCODE_DELTA(current_state, baseline_state, entity)
    IF delta.size > 0:
      packet.add_entity_update(entity, delta)

  RETURN packet
```

### 3.5 Lag Compensation (Server-Side Rewind)

```
ALGORITHM: LagCompensation

STATE:
  world_history: CircularBuffer<tick, WorldSnapshot>  // Last N ticks of state
  max_rewind: float = 0.200  // 200ms max rewind

ON_HIT_REQUEST(shooter_id, target_id, weapon, client_tick):
  // Calculate shooter's perceived time
  shooter_rtt = get_client_rtt(shooter_id)
  interp_delay = get_client_interpolation_delay(shooter_id)
  total_delay = shooter_rtt / 2 + interp_delay

  // Clamp rewind to maximum allowed
  rewind_time = min(total_delay, max_rewind)
  rewind_tick = current_tick - ticks_from_time(rewind_time)

  // Retrieve historical world state
  historical_state = world_history.get(rewind_tick)
  IF historical_state == NONE:
    REJECT hit  // Too far in the past
    RETURN

  // Get target's position at the rewound tick
  target_hitbox = historical_state.get_hitbox(target_id)

  // Perform hit detection against rewound state
  IF weapon.type == HITSCAN:
    ray = compute_ray(shooter_state.aim_origin, shooter_state.aim_direction)
    hit_result = raycast(ray, target_hitbox)
  ELSE IF weapon.type == PROJECTILE:
    hit_result = check_projectile_collision(weapon.projectile_state, target_hitbox)

  IF hit_result.hit:
    // Validate reasonableness (anti-cheat)
    IF is_reasonable_shot(shooter_state, target_hitbox, weapon):
      apply_damage(target_id, weapon.damage, shooter_id)
      broadcast_hit_event(shooter_id, target_id, hit_result)
    ELSE:
      flag_suspicious(shooter_id, "unreasonable_hit")
  ELSE:
    // Miss — shooter saw it as a hit but server disagrees
    send_hit_denied(shooter_id)
```

---

## 4. Interest Management Algorithms

### 4.1 Grid-Based Interest Management

```
ALGORITHM: GridBasedInterestManagement

PARAMETERS:
  grid_cell_size: float = 128 units
  base_aoi_radius: float = 256 units  // ~4 cells
  max_entities_per_client: int = 64   // Bandwidth budget

BUILD_INTEREST_SET(player_id, current_tick):
  player_pos = get_position(player_id)
  player_cell = hash_to_cell(player_pos)

  // Gather candidate entities from nearby cells
  candidates = []
  aoi_cells = get_cells_in_radius(player_cell, base_aoi_radius)
  FOR EACH cell IN aoi_cells:
    candidates.extend(spatial_hash.get(cell))

  // Remove self
  candidates.remove(player_id)

  // Score and prioritize candidates
  scored = []
  FOR EACH entity IN candidates:
    score = compute_relevance_score(player_id, entity, current_tick)
    scored.append((entity, score))

  // Sort by score descending, take top N
  scored.sort_descending_by_score()
  interest_set = scored.take(max_entities_per_client)

  RETURN interest_set

COMPUTE_RELEVANCE_SCORE(viewer, entity, tick):
  distance = distance(get_position(viewer), get_position(entity))
  max_dist = base_aoi_radius

  // Base score: inverse distance (closer = higher priority)
  base_score = 1.0 - (distance / max_dist)

  // Boost for entities that are a threat
  IF entity.is_aiming_at(viewer):
    base_score += 0.3

  // Boost for entities the viewer recently interacted with
  IF recently_damaged_by(viewer, entity) OR recently_damaged(viewer, entity):
    base_score += 0.4

  // Boost for fast-moving entities (more likely to become relevant)
  speed = length(get_velocity(entity))
  base_score += clamp(speed / MAX_SPEED, 0, 0.2)

  // Starvation prevention: boost entities not updated recently
  ticks_since_update = tick - entity.network.last_replicated_tick
  base_score += min(ticks_since_update / 60, 0.3)

  RETURN clamp(base_score, 0, 1)
```

### 4.2 Priority Accumulator for Bandwidth Budget

```
ALGORITHM: PriorityAccumulator

PURPOSE: Fairly distribute limited bandwidth across entities over time

STATE:
  per_entity_accumulator: Map<entity_id, float>  // Accumulated priority

ON_TICK(client_id, bandwidth_budget_bytes):
  interest_set = build_interest_set(client_id)

  // Accumulate priority
  FOR EACH (entity, score) IN interest_set:
    per_entity_accumulator[entity] += score * TICK_DURATION

  // Sort by accumulated priority
  sorted_entities = sort_by_accumulator(interest_set)

  // Pack entities into bandwidth budget
  packet_size = 0
  entities_to_send = []

  FOR EACH entity IN sorted_entities:
    delta_size = estimate_delta_size(entity, client_baseline)
    IF packet_size + delta_size <= bandwidth_budget_bytes:
      entities_to_send.append(entity)
      packet_size += delta_size
      per_entity_accumulator[entity] = 0  // Reset on send
    ELSE:
      BREAK  // Budget exhausted

  RETURN entities_to_send
```

---

## 5. Quantization and Bit Packing

### 5.1 Position Quantization

```
Quantization Strategy:
  World range: [-16384, 16384] units per axis (32,768 total)
  Precision needed: 0.03125 units (1/32 of a unit)
  Bits required: log2(32768 / 0.03125) = log2(1,048,576) = 20 bits per axis

  3D Position: 20 × 3 = 60 bits = 7.5 bytes
  vs. uncompressed float32: 4 × 3 = 12 bytes
  Savings: 37.5%

  Quantize(value, min, max, bits):
    normalized = (value - min) / (max - min)
    RETURN round(normalized * (2^bits - 1))

  Dequantize(quantized, min, max, bits):
    normalized = quantized / (2^bits - 1)
    RETURN min + normalized * (max - min)
```

### 5.2 Rotation Compression (Smallest Three)

```
Quaternion Compression ("Smallest Three"):
  A unit quaternion q = (x, y, z, w) has constraint: x² + y² + z² + w² = 1
  Therefore, one component can be derived from the other three.

  Encoding:
    1. Find largest absolute component → store its index (2 bits)
    2. Negate quaternion if largest component is negative (ensures derivation uses sqrt)
    3. Encode remaining 3 components:
       - Range: [-1/√2, 1/√2] ≈ [-0.707, 0.707]
       - Precision: 9 bits per component → 512 levels
    4. Total: 2 + 3×9 = 29 bits (vs. 128 bits for 4 float32s)
       Savings: 77%

  Decoding:
    1. Read 2-bit index of largest component
    2. Dequantize 3 components from 9 bits each
    3. Compute largest = sqrt(1 - a² - b² - c²)
    4. Reconstruct full quaternion
```

### 5.3 Velocity Quantization

```
Velocity encoding:
  Range: [-2048, 2048] units/second per axis (covers sprinting, vehicles, projectiles)
  Precision: 1 unit/second
  Bits: 12 per axis

  3D Velocity: 12 × 3 = 36 bits = 4.5 bytes
  vs. float32: 12 bytes
  Savings: 62.5%

  Optimization: If entity is stationary (velocity ≈ 0):
    Send 1-bit flag (is_moving = false) instead of full velocity
    Common case savings: 35 bits saved per stationary entity
```

---

## 6. State History Ring Buffer

```
STRUCTURE: TickHistoryBuffer

PURPOSE: Store recent world state for lag compensation and delta compression

IMPLEMENTATION:
  buffer_size: 256 ticks (at 60Hz = ~4.3 seconds of history)
  ring_buffer: Array<WorldSnapshot>[256]
  current_index: u8 = 0

  STORE(tick, world_state):
    index = tick % buffer_size
    ring_buffer[index] = deep_copy(world_state)
    // Alternative: copy-on-write with structural sharing

  GET(tick):
    age = current_tick - tick
    IF age > buffer_size:
      RETURN NONE  // Too old, evicted
    index = tick % buffer_size
    IF ring_buffer[index].tick != tick:
      RETURN NONE  // Overwritten
    RETURN ring_buffer[index]

  Memory cost:
    100 entities × ~200 bytes/entity × 256 ticks = ~5.12 MB per match
    Acceptable for dedicated game server
```

---

## 7. Packet Fragmentation and Reassembly

```
ALGORITHM: PacketFragmentation

PURPOSE: Split large payloads (> MTU) into MTU-safe fragments
         while minimizing reassembly latency

PARAMETERS:
  MAX_FRAGMENT_SIZE: 1200 bytes (safe MTU for game UDP)
  MAX_FRAGMENTS: 16 per packet

FRAGMENT(payload, sequence_number):
  fragment_count = ceil(payload.size / MAX_FRAGMENT_SIZE)
  fragments = []

  FOR i IN 0..fragment_count:
    fragment = Fragment()
    fragment.header = make_header(sequence_number)
    fragment.fragment_id = i
    fragment.fragment_count = fragment_count
    fragment.data = payload[i * MAX_FRAGMENT_SIZE : (i+1) * MAX_FRAGMENT_SIZE]
    fragments.append(fragment)

  RETURN fragments

REASSEMBLE:
  pending: Map<sequence, List<Fragment>>

  ON_FRAGMENT_RECEIVED(fragment):
    seq = fragment.header.sequence
    IF seq NOT IN pending:
      pending[seq] = Array(fragment.fragment_count, NULL)

    pending[seq][fragment.fragment_id] = fragment

    IF all_fragments_received(pending[seq]):
      payload = concatenate(pending[seq])
      pending.remove(seq)
      process_complete_packet(payload)

    // Timeout: discard incomplete fragments after 500ms
    cleanup_stale_fragments(500ms)
```
