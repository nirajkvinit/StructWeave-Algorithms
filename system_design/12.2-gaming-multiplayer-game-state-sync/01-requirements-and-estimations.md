# Requirements & Estimations

## 1. Functional Requirements

### 1.1 Core State Replication

| Requirement | Description |
|---|---|
| **Authoritative Simulation** | Server runs the canonical game simulation; all client states derive from server state |
| **Full State Snapshot** | Server can serialize and transmit the complete game world state at any tick |
| **Delta Replication** | Only changed state is transmitted after initial full snapshot; encoded relative to last acknowledged baseline |
| **Entity Lifecycle** | Server manages spawn, update, and despawn of all networked entities (players, projectiles, vehicles, destructibles) |
| **Property-Level Replication** | Individual component properties (position, health, ammo) replicate independently with configurable priority |

### 1.2 Client-Side Prediction & Reconciliation

| Requirement | Description |
|---|---|
| **Input Prediction** | Client applies its own inputs immediately to local simulation without waiting for server confirmation |
| **Server Reconciliation** | On receiving authoritative state, client replays unacknowledged inputs on top of server state to correct divergence |
| **Misprediction Smoothing** | Visual corrections for mispredictions are interpolated over multiple frames to avoid jarring snaps |
| **Input Buffering** | Client maintains a circular buffer of recent inputs (keyed by tick number) for replay during reconciliation |

### 1.3 Remote Entity Interpolation

| Requirement | Description |
|---|---|
| **Snapshot Buffering** | Client maintains a jitter buffer of recent server snapshots for smooth rendering |
| **Temporal Interpolation** | Remote entities render at a position interpolated between two known snapshots (typically 2–3 ticks behind real-time) |
| **Extrapolation / Dead Reckoning** | When snapshot data is late, client extrapolates using last known velocity and acceleration |
| **Visual Smoothing** | Teleport-like corrections (>threshold) are smoothed over configurable duration |

### 1.4 Lag Compensation

| Requirement | Description |
|---|---|
| **Hit Rewind** | Server stores N ticks of world state history; on receiving a hit-scan or projectile event, rewinds to the shooter's perceived time |
| **Latency-Bounded Rewind** | Maximum rewind window is capped (e.g., 200 ms) to prevent abuse by artificially high-latency clients |
| **Favor-the-Shooter** | Within the rewind window, hits are validated against the rewound state — what the shooter saw is what counts |

### 1.5 Interest Management

| Requirement | Description |
|---|---|
| **Spatial Relevance Filtering** | Only entities within a player's area of interest are replicated to that player |
| **Priority-Based Bandwidth Allocation** | Entities are prioritized by distance, velocity, and gameplay relevance (e.g., a player shooting at you > a distant tree) |
| **Dynamic Area of Interest** | AOI radius can adjust based on game context (e.g., larger AOI when scoped with a sniper rifle) |
| **Level-of-Detail Replication** | Distant entities receive lower-frequency updates with reduced property sets |

### 1.6 Matchmaking & Session Management

| Requirement | Description |
|---|---|
| **Match Allocation** | Assign players to dedicated game server instances based on region, skill, and latency |
| **Session Lifecycle** | Manage match states: lobby → warmup → active → post-game → teardown |
| **Reconnection** | Players disconnected mid-match can rejoin within a grace period and receive full state sync |
| **Spectator Mode** | Spectators receive a delayed, bandwidth-optimized state stream |

---

## 2. Non-Functional Requirements

### 2.1 Latency

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Server Tick Duration** | ≤ 16.67 ms (60 Hz) to ≤ 50 ms (20 Hz) | Entire simulation + serialization + send must complete within one tick window |
| **Input-to-Visual Latency** | ≤ 50 ms (local prediction) | Player's own actions must feel instant via client prediction |
| **Perceived Combat Latency** | ≤ 150 ms | Combined RTT + server processing + interpolation delay for hit registration |
| **Interpolation Delay** | 2–3 ticks (33–100 ms at 30–60 Hz) | Buffer for smooth rendering of remote entities |
| **Rewind Window** | ≤ 200 ms | Maximum time server will rewind for lag compensation |

### 2.2 Throughput & Tick Rate

| Metric | Target |
|--------|--------|
| **Server Tick Rate** | 20–128 Hz depending on game mode (Battle Royale: 20–30 Hz early, 60 Hz late; Arena: 60–128 Hz) |
| **Client Send Rate** | Match server tick rate (client sends input every tick) |
| **Snapshot Send Rate** | 20–60 snapshots/second to each client |
| **Input Processing** | Server must process all client inputs within single tick window |

### 2.3 Bandwidth

| Metric | Target |
|--------|--------|
| **Per-Player Downstream** | 30–80 Kbps (delta-compressed, interest-managed) |
| **Per-Player Upstream** | 5–15 Kbps (input commands only) |
| **Peak Per-Server** | 10–50 Mbps aggregate for 100-player match |
| **Packet Size** | ≤ MTU (1200 bytes typical for game UDP) to avoid fragmentation |

### 2.4 Reliability & Availability

| Metric | Target |
|--------|--------|
| **Match Completion Rate** | ≥ 99.5% of started matches complete without server crash |
| **Server Uptime** | 99.9% fleet availability (individual server loss is tolerable — match is lost, but new matches can start) |
| **Reconnection Success** | ≥ 95% of disconnected players successfully rejoin within grace window |
| **Desync Rate** | < 0.1% of player-ticks result in visible desync correction |

### 2.5 Consistency

| Property | Model |
|----------|-------|
| **Server Authority** | Server state is always canonical; client state is advisory |
| **Eventual Visual Consistency** | All clients converge to server state within interpolation delay + correction smoothing |
| **Causal Ordering** | Events within a single tick are atomically ordered; cross-tick ordering is guaranteed by tick sequence numbers |

---

## 3. Capacity Estimations

### 3.1 Reference Scale

| Parameter | Value |
|-----------|-------|
| Peak concurrent players | 10 million |
| Players per match | 100 (Battle Royale) / 10–50 (other modes) |
| Concurrent matches (100-player) | 100,000 |
| Match duration | 20–30 minutes |
| Matches per hour per server | 2–3 |
| Server tick rate | 30 Hz (early game) → 60 Hz (late game) |

### 3.2 State Update Volume

```
Per tick (100-player match, 30 Hz):
  - Player state updates: 100 players × ~200 bytes = 20 KB
  - Projectile/vehicle updates: ~50 entities × ~100 bytes = 5 KB
  - Environment/destruction updates: ~20 events × ~150 bytes = 3 KB
  - Total raw state per tick: ~28 KB

Per second (30 Hz):
  - Raw state: 28 KB × 30 = 840 KB/s
  - After delta compression (~70% reduction): ~252 KB/s
  - After interest management (~60% reduction per client): ~100 KB/s per client → ~12.5 KB/s per player

Per match (30 min):
  - Total state transmitted: ~252 KB/s × 1800s = ~454 MB aggregate
  - Per player received: ~12.5 KB/s × 1800s = ~22.5 MB
```

### 3.3 Input Volume

```
Per player per tick:
  - Input packet: ~64 bytes (movement vector, look direction, action bitmask, tick number)
  - With redundancy (send last 3 inputs): ~192 bytes

Per second per player (30 Hz):
  - Input upstream: 192 × 30 = 5,760 bytes/s ≈ 5.6 KB/s

Per match (100 players, 30 min):
  - Total input ingested: 5.6 KB/s × 100 × 1800 ≈ 1.01 GB aggregate
```

### 3.4 Server Compute Budget

```
Tick budget at 60 Hz: 16.67 ms total

Breakdown (typical):
  - Input deserialization:     1.5 ms
  - Movement simulation:       3.0 ms
  - Physics (collision):       4.0 ms
  - Combat resolution:         2.0 ms
  - Interest management:       1.5 ms
  - State serialization:       2.0 ms
  - Network send:              1.5 ms
  - Headroom:                  1.17 ms
  ─────────────────────────────────────
  Total:                      16.67 ms
```

### 3.5 Fleet Sizing

```
Concurrent matches:          100,000
Servers per match:           1 (single authoritative server per match)
Server instances needed:     100,000 active
Buffer for spin-up/teardown: 20%
Total fleet:                 120,000 instances

CPU per instance:            4–8 vCPUs
Memory per instance:         8–16 GB
Network per instance:        50 Mbps guaranteed
```

### 3.6 Storage (Match Replay & Analytics)

```
Replay data per match:
  - Input log: ~1 GB (all player inputs, all ticks)
  - Key state snapshots: ~100 MB (sampled at 1 Hz)
  - Events log: ~50 MB (kills, damage, loot)

Per day (assume 5M matches/day):
  - Full replay storage: 5M × 100 MB = 500 TB/day (typically retain 7 days)
  - Events for analytics: 5M × 50 MB = 250 TB/day
```

---

## 4. SLOs and SLAs

### 4.1 Player-Facing SLOs

| SLO | Target | Measurement |
|-----|--------|-------------|
| **Input Responsiveness** | Own character responds within 1 frame of input (≤ 16 ms via prediction) | Client-side telemetry |
| **Combat Fairness** | Hit registration matches shooter's screen within ≤ 200 ms rewind window | Server hit validation logs |
| **Visual Smoothness** | < 1% of frames show visible rubber-banding or teleportation | Client desync correction counter |
| **Match Stability** | 99.5% of matches complete without server-side interruption | Match completion ratio |
| **Reconnection** | 95% of disconnects resolved within 30-second grace window | Reconnection success rate |

### 4.2 Internal SLOs

| SLO | Target | Measurement |
|-----|--------|-------------|
| **Tick Overrun** | < 0.5% of ticks exceed budget | Server tick duration histogram |
| **Match Allocation Latency** | < 5 seconds from queue to match start | Matchmaker-to-first-tick timestamp |
| **Fleet Scaling** | New capacity available within 60 seconds of demand signal | Fleet manager scaling latency |
| **Packet Loss Tolerance** | System remains playable at ≤ 5% packet loss | Simulated degradation tests |

### 4.3 SLA Tiers

| Tier | Availability | Latency (P95) | Use Case |
|------|-------------|---------------|----------|
| **Competitive / Ranked** | 99.95% | ≤ 120 ms perceived | Ranked matches, tournaments, esports |
| **Casual** | 99.5% | ≤ 200 ms perceived | Public lobbies, casual modes |
| **Custom / Creative** | 99.0% | ≤ 300 ms perceived | Player-hosted creative modes |

---

## 5. Key Constraints & Assumptions

| Constraint | Impact |
|------------|--------|
| **UDP-only game traffic** | Must build reliability layer on top of UDP; cannot rely on TCP's guarantees |
| **MTU limit (~1200 bytes)** | Packets must be carefully sized to avoid IP fragmentation |
| **Heterogeneous clients** | Must support PC, console, and mobile with different CPU/network capabilities |
| **Global player base** | Requires edge server deployment across 15+ regions to keep RTT < 80 ms |
| **Match isolation** | Each match is fully independent — no cross-match state sharing during gameplay |
| **Anti-cheat requirement** | Server must validate all inputs; client state is never trusted |
| **Replay requirement** | All match data must be recordable for anti-cheat review, esports replays, and analytics |
