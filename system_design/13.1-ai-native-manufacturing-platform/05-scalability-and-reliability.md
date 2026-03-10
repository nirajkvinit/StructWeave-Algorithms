# 13.1 AI-Native Manufacturing Platform — Scalability & Reliability

## Edge Scaling Architecture

### Per-Factory Edge Topology

Each factory is a self-contained edge deployment with its own local compute, storage, and networking infrastructure:

```
Factory edge topology:
  Production cells: 20–100 (each cell = cluster of 5–20 machines)
  Edge gateways: 1 per cell → 20–100 gateways per factory
  Per gateway: 8-core CPU, 50 TOPS AI accelerator, 64 GB RAM, 2 TB NVMe

  Networking (OT side):
    EtherCAT / PROFINET for PLC communication (deterministic, <1 ms cycle)
    OPC-UA for sensor data aggregation (10 ms resolution)
    GigE Vision for camera data (dedicated camera network)

  Networking (IT side):
    10 GbE uplink to factory aggregation switch
    Factory WAN uplink to cloud: 1–10 Gbps (shared across all gateways)

  Physical isolation:
    OT and IT networks on physically separate NICs
    No routing between OT and IT at the gateway level
    DMZ with data diode for OT→IT data transfer
```

### Horizontal Scaling Within a Factory

Adding production capacity (new machines, new production lines) scales edge compute linearly:

- **New machine:** Add sensors → configure on existing edge gateway (if capacity allows) → register digital twin asset
- **New production cell:** Deploy new edge gateway → network configuration → model deployment from registry
- **New camera station:** Add camera → configure CV pipeline on nearest edge gateway → deploy defect model

No cloud-side infrastructure change is required for within-factory scaling. The cloud ingestion pipeline auto-discovers new edge gateways through a registration protocol.

### Multi-Factory Scaling

```
Multi-site architecture:
  50 factories × 100 edge gateways = 5,000 edge nodes globally

  Cloud ingestion:
    Per factory: ~430 GB/day cloud-bound data
    50 factories: ~21.5 TB/day aggregate cloud ingestion
    Stream processing: partitioned by plant_id → parallel pipelines per factory

  Twin state store:
    50 factories × 10,000 assets = 500,000 digital twin records
    State update rate: 500K assets × 1 update/sec = 500K writes/sec to twin store
    Read rate: analytics + PdM + scheduling queries: ~2M reads/sec

  Storage sharding:
    Time-series telemetry: partitioned by {plant_id, asset_type, date}
    Twin state: partitioned by plant_id (each factory is a natural shard boundary)
    CV images: partitioned by {plant_id, date}; lifecycle-managed (90-day hot, 1-year warm, delete)
```

---

## Data Pipeline Reliability

### Edge-to-Cloud Telemetry Pipeline

The telemetry pipeline must guarantee no data loss even under adverse conditions (network partitions, edge restarts, cloud maintenance windows):

```
Reliability guarantees:
  Edge → Cloud: At-least-once delivery
  Deduplication: Sequence numbers per sensor channel; cloud-side idempotent write

  Pipeline stages:
    1. Sensor → Edge gateway ring buffer (write-ahead, NVMe)
    2. Ring buffer → Edge MQTT publisher (read from buffer; publish to broker)
    3. Edge MQTT → DMZ MQTT bridge (OT→IT boundary crossing)
    4. DMZ → Cloud stream processor (message queue with replay capability)
    5. Stream processor → Time-series store + Twin engine (parallel write)

  Failure handling per stage:
    Stage 1 failure (sensor disconnect): quality_flag=SENSOR_FAULT; gap logged
    Stage 2 failure (gateway process crash): Ring buffer survives restart; replay from last ack
    Stage 3 failure (network partition): Ring buffer accumulates; 72h capacity before overflow
    Stage 4 failure (cloud ingestion down): Message queue retains with 7-day TTL; backpressure to edge
    Stage 5 failure (storage write error): Dead letter queue; retry with exponential backoff
```

### Edge Ring Buffer Design

```
Ring buffer specification:
  Capacity: 2 TB NVMe → 72 hours at 280 MB/sec raw ingestion
  Structure: Per-sensor circular buffer with write pointer and read pointer
  Write path: Lock-free single-producer (sensor adapter thread) append
  Read paths:
    - Local inference: zero-copy read from buffer (for FFT, anomaly detection)
    - Cloud forwarding: read from forwarding pointer; advance on cloud ack
    - Forensic replay: read from arbitrary timestamp using index

  Overflow policy:
    When buffer is 90% full: increase downsampling aggressiveness for cloud forwarding
    When buffer is 95% full: drop low-priority sensor channels (environmental > process)
    When buffer is 100% full: overwrite oldest data (safety audit log is on separate non-overwritable partition)

  Durability:
    NVMe with battery-backed write cache; survives power loss
    Checksum per block; corrupted blocks skipped during replay
```

### Stream Processing Scalability

```
Cloud stream processor design:
  Input: 21.5 TB/day from 50 factories = ~250 MB/sec aggregate
  Processing:
    - Parse and validate telemetry messages
    - Route to time-series store (all readings)
    - Route to twin engine (state updates for tracked assets)
    - Route to PdM feature pipeline (vibration + thermal channels only)
    - Route to anomaly detector (real-time statistical process control)

  Partitioning: by plant_id → 50 parallel processing lanes
  Per-lane throughput: ~5 MB/sec → easily handled by single stream processor instance

  Scaling:
    Horizontal: add partitions for new factories
    Vertical: increase partition count within a factory for high-density production lines

  Exactly-once semantics:
    Message queue provides offset tracking
    Stream processor checkpoints offset after successful write to all downstream stores
    On restart: replay from last checkpoint offset
```

---

## Fault Tolerance for Safety-Critical Systems

### Edge Gateway Redundancy

Safety-critical edge gateways (those controlling SIL-2 processes) are deployed in active-standby pairs:

```
Redundancy design:
  Primary gateway: Active; processes all sensor data and runs inference
  Standby gateway: Hot standby; receives sensor data in parallel; runs inference but does not actuate

  Failover trigger:
    - Primary watchdog timer expires (hardware watchdog, 100 ms timeout)
    - Primary inference latency exceeds deadline 3 consecutive times
    - Primary loses connectivity to PLC bus

  Failover process:
    1. Standby detects primary failure (heartbeat loss or watchdog alert)
    2. Standby promotes to active; begins actuating based on its own inference results
    3. Failover time: ≤ 200 ms (within one production cycle for most processes)
    4. Alert sent to operations dashboard; maintenance ticket auto-generated for failed gateway

  State synchronization:
    Twin state replicated between primary and standby every 100 ms
    Model versions identical on both gateways (model deployment is atomic to the pair)
    Ring buffer is not replicated (each gateway maintains its own buffer)
```

### PLC Safety Interlock (Defense in Depth)

The AI inference engine is never the sole safety mechanism. All safety-critical control paths have a hardware safety interlock in the PLC:

```
Defense in depth layers:
  Layer 1: AI inference detects anomaly → sends soft stop command to PLC
  Layer 2: PLC safety function monitors sensor thresholds independently of AI
           → triggers hard stop if threshold exceeded, regardless of AI state
  Layer 3: Hardware safety relay monitors critical sensors directly
           → de-energizes actuators on limit exceedance; no software in the loop

  Design principle:
    The AI model is an OPTIMIZATION layer, not a SAFETY layer.
    The PLC safety function and hardware relay ARE the safety layers.
    The AI model can recommend actions; only the PLC safety function can execute safety stops.
    If the AI model fails, times out, or produces garbage output, the PLC safety function
    continues to protect the equipment and workers independently.
```

### Graceful Degradation Hierarchy

When components fail, the system degrades gracefully rather than halting production:

| Failure | Impact | Degradation |
|---|---|---|
| Single camera failure | One inspection station offline | Bypass with manual inspection flag; increase inspection frequency on adjacent stations |
| Edge AI accelerator failure | No ML inference on one gateway | Fall back to PLC threshold-based alarms; flag all parts from affected cell for manual review |
| Cloud connectivity loss | No cloud analytics, no model updates | Full offline operation: edge inference, local scheduling, 72h telemetry buffer |
| Twin engine failure (cloud) | No what-if simulations, no cross-plant analytics | Edge twins continue; PdM runs on last-known model; scheduling uses local constraint solver |
| PdM model failure | No RUL predictions for one asset type | Revert to time-based maintenance schedule; increase manual inspection frequency |
| Complete edge gateway failure | Loss of monitoring for one production cell | Standby gateway takes over (if redundant); or production cell runs on PLC-only control |

---

## Offline Operation: Autonomous Edge

### Autonomous Operation Capabilities During Cloud Outage

| Capability | Offline Behavior | Limitation vs. Online |
|---|---|---|
| Sensor ingestion | Full operation; data buffered locally | No cloud forwarding (buffered for 72h) |
| CV defect detection | Full operation; models cached on-edge | No model retraining; no new defect category learning |
| PdM anomaly detection | Full operation; statistical process control on-edge | No fleet-wide trend analysis; no RUL model update |
| Digital twin sync | Local twin maintained; no cloud twin update | No what-if simulations requiring cloud physics engine |
| Production scheduling | Local constraint solver with last-known orders | Suboptimal vs. RL-optimized schedule; no new order ingestion |
| Safety audit logging | Full operation; logged to local immutable store | Upload deferred until reconnection |
| Energy optimization | Runs on last-known energy model | No grid price updates; may miss cost-saving opportunities |

### Reconnection Protocol

```
Reconnection sequence:
  1. Edge detects connectivity restored (MQTT broker handshake)
  2. Exchange vector clocks: edge sends its clock; cloud sends its clock
  3. Priority-ordered upload:
     a. Safety audit logs (highest priority, guaranteed delivery)
     b. PdM anomaly events and maintenance ticket updates
     c. Quality inspection results and defect images
     d. Routine telemetry summaries (downsampled during upload)
     e. Raw telemetry (uploaded in background, may take hours)
  4. Cloud-to-edge sync:
     a. Pending model updates (download, verify signature, stage)
     b. New production orders (validate against current schedule)
     c. Schedule recommendations (edge validates before applying)
  5. Conflict resolution:
     a. Edge-made scheduling decisions during outage: preserved if production completed
     b. Cloud-planned schedule: applied only to future (unstarted) jobs
     c. Maintenance tickets: merged (both edge and cloud tickets retained)
  6. Full synchronization verified → operations dashboard shows "ONLINE" status
```

---

## Multi-Region and Data Sovereignty

### Factory Data Residency

Manufacturing data often has data residency requirements (export control regulations, national security for defense manufacturing, GDPR for worker telemetry in EU):

```
Data residency architecture:
  Option 1: Regional cloud deployment
    - EU factories → EU cloud region
    - US factories → US cloud region
    - APAC factories → APAC cloud region
    Each region maintains its own telemetry store, twin engine, and ML training pipeline

  Option 2: Federated analytics
    - Raw data stays in regional cloud; never crosses regional boundary
    - Aggregated metrics (OEE, quality rates, PdM fleet trends) shared across regions
    - ML models: trained on regional data; model artifacts (not training data) shared for transfer learning

  Cross-region analytics:
    - Fleet-wide PdM insights: each region trains local models; model parameters averaged
      via federated learning protocol (no raw sensor data crosses boundaries)
    - Global OEE dashboard: each region publishes aggregated OEE metrics to a global aggregation layer
    - Benchmark comparisons: anonymized quality rates and uptime metrics shared for cross-plant benchmarking
```

### RTO and RPO

| Subsystem | RTO Target | RPO Target |
|---|---|---|
| Edge inference (safety-critical) | 200 ms (active-standby failover) | 0 (standby runs in parallel) |
| Edge gateway (non-critical) | 5 min (gateway restart) | 0 (ring buffer persists) |
| Cloud telemetry pipeline | 30 min | 0 (message queue retains messages) |
| Cloud twin engine | 1 hour | 15 min (twin state checkpointed every 15 min) |
| Cloud analytics | 4 hours | 1 hour |
| Safety audit log | 0 (edge-local, never depends on cloud) | 0 (NVMe with battery-backed cache) |
