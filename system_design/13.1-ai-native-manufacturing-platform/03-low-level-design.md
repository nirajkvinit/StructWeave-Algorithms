# 13.1 AI-Native Manufacturing Platform — Low-Level Design

## Data Models

### sensor_reading

The fundamental unit of telemetry ingested from the factory floor.

```
sensor_reading {
  reading_id:          uint64            -- monotonically increasing per sensor channel
  sensor_id:           string            -- globally unique: {plant_id}:{cell_id}:{machine_id}:{sensor_type}:{channel}
  timestamp:           uint64            -- nanoseconds since epoch; PTP-synchronized
  value:               float64           -- physical unit value (g, °C, Pa, mm, etc.)
  unit:                string            -- SI unit identifier
  quality_flag:        enum              -- GOOD | UNCERTAIN | BAD | SENSOR_FAULT
  sample_rate_hz:      uint32            -- actual sample rate at capture
  edge_gateway_id:     string            -- which edge gateway ingested this reading
  sequence_number:     uint64            -- per-gateway monotonic; gap detection for data loss
}
```

### digital_twin_asset

A synchronized virtual replica of a physical manufacturing asset.

```
digital_twin_asset {
  asset_id:            UUID              -- globally unique across all plants
  plant_id:            string
  cell_id:             string
  asset_type:          enum              -- CNC_MACHINE | ROBOT_ARM | CONVEYOR | PUMP | COMPRESSOR | AGV | FIXTURE
  asset_class:         string            -- manufacturer model identifier
  geometry_ref:        string            -- URI to 3D model (OpenUSD format)
  kinematics_model:    bytes             -- serialized kinematic chain definition

  -- Real-time synchronized state
  current_state: {
    operational_mode:  enum              -- RUNNING | IDLE | MAINTENANCE | FAULT | EMERGENCY_STOP
    spindle_speed_rpm: float64 | null
    feed_rate_mm_min:  float64 | null
    temperature_map:   map<string, float64>  -- {zone_id: temperature_celsius}
    vibration_rms:     map<string, float64>  -- {bearing_id: rms_g}
    power_draw_kw:     float64
    cycle_count:       uint64            -- total production cycles since last maintenance
    last_sync_at:      uint64            -- nanosecond timestamp of last sensor sync
  }

  -- Health and maintenance state
  health_state: {
    health_index:      float64           -- 0.0 (failed) to 1.0 (new); composite score
    rul_hours:         float64           -- predicted remaining useful life in operating hours
    rul_confidence:    float64           -- 0.0–1.0; confidence in RUL estimate
    rul_model_version: string
    degradation_mode:  string | null     -- detected degradation type (e.g., "bearing_wear", "spindle_imbalance")
    last_maintenance:  timestamp
    next_scheduled:    timestamp | null
    maintenance_tickets: list<ticket_ref>
  }

  -- Production context
  production_state: {
    current_job_id:    UUID | null
    current_part_id:   string | null
    parts_produced:    uint64            -- current shift
    reject_count:      uint64            -- current shift
    oee_current_shift: float64           -- 0.0–1.0
  }

  -- Metadata
  commissioned_at:     timestamp
  firmware_version:    string
  model_versions:      map<string, string>  -- {model_type: deployed_version}
  twin_version:        uint64            -- optimistic concurrency version
}
```

### quality_inspection_result

Output of the inline computer vision quality inspection pipeline.

```
quality_inspection_result {
  inspection_id:       UUID
  camera_id:           string            -- {plant_id}:{cell_id}:{camera_position}
  asset_id:            UUID              -- machine that produced the inspected part
  part_id:             string            -- production part serial number
  job_id:              UUID
  inspected_at:        timestamp         -- PTP-synchronized capture time

  image_ref:           string            -- URI to raw image in edge buffer / cloud store
  image_resolution:    string            -- e.g., "3840x2160"

  result:              enum              -- PASS | FAIL_CRITICAL | FAIL_MINOR | REVIEW
  defects_detected:    list<defect>
    -- each: {
    --   defect_type:    enum             -- CRACK | SCRATCH | DISCOLORATION | DIMENSIONAL | POROSITY | CONTAMINATION | UNKNOWN
    --   confidence:     float64          -- 0.0–1.0; model confidence
    --   bounding_box:   {x, y, width, height}  -- pixel coordinates
    --   severity:       enum             -- CRITICAL | MAJOR | MINOR | COSMETIC
    --   area_mm2:       float64 | null   -- estimated defect area in physical units
    -- }

  model_version:       string            -- CV model version that produced this result
  inference_time_ms:   float64           -- end-to-end inference latency
  edge_gateway_id:     string
  actuator_action:     enum              -- REJECT | FLAG | PASS
  actuator_latency_ms: float64           -- time from detection to actuator signal
}
```

### maintenance_ticket

Auto-generated or manually created maintenance work order linked to PdM predictions.

```
maintenance_ticket {
  ticket_id:           UUID
  asset_id:            UUID
  plant_id:            string

  trigger_type:        enum              -- PDM_PREDICTION | MANUAL | THRESHOLD_ALARM | SCHEDULED
  trigger_source: {
    pdm_model_version: string | null
    rul_at_trigger:    float64 | null    -- predicted RUL hours when ticket was generated
    rul_confidence:    float64 | null
    anomaly_type:      string | null     -- e.g., "bearing_outer_race_fault"
    sensor_evidence:   list<{sensor_id, feature, value, threshold}>
  }

  priority:            enum              -- EMERGENCY | URGENT | PLANNED | DEFERRED
  status:              enum              -- OPEN | ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED | FALSE_ALARM

  description:         string            -- auto-generated description of predicted failure mode
  recommended_action:  string            -- e.g., "Replace bearing SKF 6205 on spindle A"
  parts_required:      list<{part_number, quantity, lead_time_hours}>

  assigned_to:         string | null     -- maintenance technician ID
  created_at:          timestamp
  scheduled_for:       timestamp | null  -- planned maintenance window
  started_at:          timestamp | null
  completed_at:        timestamp | null

  -- Closed-loop feedback
  actual_condition:    enum | null       -- CONFIRMED_FAILURE | EARLY_DEGRADATION | FALSE_ALARM | DEFERRED
  technician_notes:    string | null
  replacement_parts:   list<string> | null

  cmms_external_id:    string | null     -- ID in external CMMS system
}
```

### production_schedule

Dynamic schedule produced by the RL scheduling engine.

```
production_schedule {
  schedule_id:         UUID
  plant_id:            string
  schedule_horizon:    {start: timestamp, end: timestamp}
  generated_at:        timestamp
  generator_version:   string            -- RL policy version

  jobs: list<scheduled_job>
    -- each: {
    --   job_id:          UUID
    --   order_id:        string           -- production order from MES
    --   part_type:       string
    --   quantity:        integer
    --   priority:        enum             -- RUSH | NORMAL | LOW
    --   assigned_machine: UUID            -- asset_id
    --   start_time:      timestamp
    --   end_time:        timestamp        -- estimated completion
    --   setup_time_min:  float64          -- changeover time from previous job
    --   dependencies:    list<UUID>       -- jobs that must complete first
    -- }

  objective_scores: {
    predicted_oee:       float64          -- 0.0–1.0
    predicted_makespan:  float64          -- hours
    energy_cost:         float64          -- estimated energy cost
    setup_changes:       integer          -- total changeovers
    machine_utilization: map<UUID, float64>  -- per-asset utilization
  }

  disruption_response:  string | null     -- what disruption triggered this re-plan
  status:               enum             -- PROPOSED | ACTIVE | SUPERSEDED | COMPLETED
}
```

---

## API Design

### Edge Gateway APIs (Local, Low-Latency)

```
POST /edge/v1/telemetry/ingest
  -- Batch ingestion of sensor readings from OPC-UA adapter
  Request:
    readings: list<sensor_reading>       -- batch of 100-1000 readings
    gateway_id: string
    batch_sequence: uint64
  Response:
    {accepted: integer, rejected: integer, next_sequence: uint64}
  Latency budget: ≤ 1 ms

GET /edge/v1/twin/{asset_id}/state
  -- Read current digital twin state for a local asset
  Response:
    {asset_id, current_state, health_state, production_state, twin_version}
  Latency budget: ≤ 5 ms

POST /edge/v1/inference/predict
  -- Run inference on edge model (internal, used by control loop)
  Request:
    model_id: string
    input_tensor: bytes                  -- serialized input
    deadline_ns: uint64                  -- hard deadline in nanoseconds
  Response:
    {prediction: bytes, confidence: float64, latency_ns: uint64}
    -- If deadline exceeded: {status: "TIMEOUT", fallback_action: "SAFE_STATE"}
```

### Cloud Platform APIs

```
GET /api/v1/plants/{plant_id}/assets
  Request (query params):
    asset_type: enum (optional)
    health_below: float64 (optional)     -- filter assets with health_index below threshold
    limit: integer (default 100)
  Response:
    {assets: list<{asset_id, asset_type, health_index, rul_hours, operational_mode, oee_current_shift}>}

GET /api/v1/assets/{asset_id}/health-history
  Request (query params):
    start: timestamp
    end: timestamp
    resolution: enum                     -- MINUTE | HOUR | DAY
  Response:
    {asset_id, data_points: list<{timestamp, health_index, rul_hours, vibration_rms, temperature}>}

GET /api/v1/assets/{asset_id}/maintenance-tickets
  Request (query params):
    status: enum (optional)
    limit: integer (default 20)
  Response:
    {tickets: list<maintenance_ticket>}

POST /api/v1/plants/{plant_id}/schedule/optimize
  Request:
    orders: list<{order_id, part_type, quantity, priority, due_date}>
    constraints: {
      machine_availability: map<UUID, list<time_window>>
      maintenance_windows: list<{asset_id, start, end}>
    }
  Response:
    {schedule_id, jobs: list<scheduled_job>, objective_scores}

GET /api/v1/plants/{plant_id}/quality/summary
  Request (query params):
    start: timestamp
    end: timestamp
    group_by: enum                       -- MACHINE | DEFECT_TYPE | SHIFT | PART_TYPE
  Response:
    {summary: list<{group, total_inspected, pass_count, fail_count, defect_rate, top_defect_types}>}

POST /api/v1/models/deploy
  Request:
    model_id: string
    version: string
    target: {plant_id: string, edge_gateways: list<string> | "ALL"}
    strategy: enum                       -- CANARY | ROLLING | IMMEDIATE
    canary_percentage: float64 (default 10)
  Response:
    {deployment_id, status: "INITIATED", estimated_completion: timestamp}
```

### Internal / Service APIs

```
POST /internal/twin/sync
  -- Edge-to-cloud twin state synchronization
  Request:
    asset_id: UUID
    state_delta: {changed_fields: map<string, any>}
    edge_timestamp: uint64
    edge_vector_clock: map<string, uint64>
  Response:
    {accepted: boolean, conflicts: list<{field, edge_value, cloud_value, resolution}>}

POST /internal/pdm/predict-rul
  Request:
    asset_id: UUID
    features: {
      vibration_spectrum: list<float64>  -- FFT magnitudes
      envelope_spectrum: list<float64>
      kurtosis: float64
      rms: float64
      temperature_trend: list<float64>   -- last 24h hourly readings
      operating_hours: float64
      cycle_count: uint64
      last_maintenance_hours_ago: float64
    }
  Response:
    {rul_hours: float64, confidence: float64, degradation_mode: string, risk_score: float64}

POST /internal/cv/annotate
  -- Submit human annotation for CV training pipeline
  Request:
    inspection_id: UUID
    annotations: list<{defect_type, bounding_box, severity, annotator_id}>
  Response:
    {annotation_id, added_to_training_queue: boolean}
```

---

## Core Algorithms

### Algorithm 1: Physics-Informed Remaining Useful Life Estimation

```
FUNCTION estimate_rul(asset: digital_twin_asset, feature_history: list<feature_set>) -> rul_result:

  // Step 1: Extract spectral features from raw vibration waveform
  latest_features = feature_history[-1]
  fft_spectrum = compute_fft(latest_features.raw_waveform, window=HANNING, n_fft=4096)
  envelope_spectrum = compute_envelope_analysis(latest_features.raw_waveform,
                                                 bearing_frequencies=asset.bearing_geometry)
  kurtosis = compute_kurtosis(latest_features.raw_waveform)
  rms = compute_rms(latest_features.raw_waveform)

  // Step 2: Compute health indicator (HI) using physics-based degradation model
  // Paris' law for crack growth: da/dN = C * (delta_K)^m
  // Health indicator maps spectral features to normalized degradation state
  hi_vibration = health_indicator_model.predict(fft_spectrum, envelope_spectrum, kurtosis, rms)
  hi_thermal = thermal_degradation_model.predict(asset.current_state.temperature_map)

  // Weighted fusion of health indicators
  hi_combined = 0.6 * hi_vibration + 0.3 * hi_thermal + 0.1 * normalized_cycle_count(asset)

  // Step 3: Fit degradation trajectory using Wiener process with drift
  // HI(t) = HI_0 + mu*t + sigma*W(t), where W(t) is standard Brownian motion
  historical_hi = [compute_hi(f) FOR f IN feature_history]
  mu, sigma = fit_wiener_process(historical_hi, timestamps)

  // Step 4: Compute RUL as first-passage time to failure threshold
  failure_threshold = get_failure_threshold(asset.asset_type, asset.degradation_mode)
  remaining_hi = failure_threshold - hi_combined

  IF remaining_hi <= 0:
    RETURN {rul_hours: 0, confidence: 0.95, degradation_mode: "CRITICAL"}

  // Expected first-passage time for Wiener process
  rul_expected = remaining_hi / mu  // hours
  rul_variance = (sigma^2 * remaining_hi) / (mu^3)
  rul_confidence = 1.0 - (sqrt(rul_variance) / rul_expected)  // higher confidence = narrower distribution

  // Step 5: Bayesian update with prior from fleet-wide data
  fleet_prior = get_fleet_rul_prior(asset.asset_type, asset.cycle_count)
  rul_posterior = bayesian_update(
    prior=fleet_prior,
    likelihood={mean: rul_expected, variance: rul_variance}
  )

  RETURN {
    rul_hours: rul_posterior.mean,
    confidence: clamp(rul_confidence, 0.1, 0.99),
    degradation_mode: classify_degradation(envelope_spectrum, asset.bearing_geometry),
    risk_score: 1.0 - survival_probability(rul_posterior, horizon=168)  // P(fail within 7 days)
  }
```

### Algorithm 2: Real-Time Defect Detection with Anomaly Fallback

```
FUNCTION detect_defects(image: tensor, camera_config: camera_info) -> inspection_result:

  // Step 1: Preprocess image for model input
  roi = extract_roi(image, camera_config.roi_mask)  // crop to region of interest
  normalized = normalize(roi, mean=IMAGENET_MEAN, std=IMAGENET_STD)
  resized = resize(normalized, target=(640, 640))  // model input size

  // Step 2: Run primary defect detection model (Vision Transformer, INT8 quantized)
  detections = defect_model.predict(resized)
  // detections: list of {class_id, confidence, bbox, segmentation_mask}

  // Step 3: Filter by confidence threshold (per defect type)
  confirmed_defects = []
  uncertain_detections = []
  FOR detection IN detections:
    threshold = get_confidence_threshold(detection.class_id)  // critical defects: 0.7; minor: 0.85
    IF detection.confidence >= threshold:
      confirmed_defects.append(detection)
    ELIF detection.confidence >= threshold * 0.7:  // borderline
      uncertain_detections.append(detection)

  // Step 4: Run anomaly detection for novel defect types
  // Autoencoder trained on "good" parts; reconstruction error = anomaly score
  reconstruction = anomaly_autoencoder.reconstruct(resized)
  reconstruction_error = pixel_wise_mse(resized, reconstruction)
  anomaly_regions = threshold_and_cluster(reconstruction_error, threshold=ANOMALY_THRESHOLD)

  FOR region IN anomaly_regions:
    IF NOT overlaps_any(region, confirmed_defects):  // novel anomaly not caught by classifier
      confirmed_defects.append({
        defect_type: UNKNOWN,
        confidence: anomaly_score(region),
        bbox: region.bounding_box,
        severity: MAJOR  // unknown defects default to MAJOR for safety
      })

  // Step 5: Determine action based on defect severity
  has_critical = any(d.severity == CRITICAL FOR d IN confirmed_defects)
  has_major = any(d.severity == MAJOR FOR d IN confirmed_defects)

  action = PASS
  IF has_critical:
    action = REJECT  // trigger reject actuator immediately
  ELIF has_major:
    action = FLAG    // route to human review queue
  ELIF len(uncertain_detections) > 0:
    action = FLAG    // borderline detections need human verification

  RETURN {
    result: FAIL_CRITICAL if has_critical else (FAIL_MINOR if has_major else PASS),
    defects_detected: confirmed_defects,
    actuator_action: action,
    inference_time_ms: elapsed()
  }
```

### Algorithm 3: Multi-Agent RL Production Scheduling

```
FUNCTION optimize_schedule(
    orders: list<production_order>,
    machines: list<digital_twin_asset>,
    current_schedule: production_schedule | null
) -> production_schedule:

  // Step 1: Build state representation for RL agents
  state = build_scheduling_state(
    machine_states=[{
      asset_id: m.asset_id,
      available_at: m.production_state.current_job_end_time,
      health_index: m.health_state.health_index,
      setup_state: m.production_state.current_part_type,
      capabilities: m.asset_class.supported_operations
    } FOR m IN machines],
    pending_orders=[{
      order_id: o.order_id,
      part_type: o.part_type,
      quantity: o.quantity,
      priority: o.priority,
      due_date: o.due_date,
      required_operations: o.routing
    } FOR o IN orders],
    current_time=now()
  )

  // Step 2: Each machine agent selects next job to process
  // Hierarchical MARL: job prioritization → machine assignment → sequence optimization
  job_priorities = job_priority_agent.select_actions(state)
  machine_assignments = machine_assignment_agent.select_actions(state, job_priorities)

  // Step 3: Sequence jobs on each machine considering setup times
  schedule_jobs = []
  FOR machine_id, assigned_jobs IN machine_assignments.items():
    sorted_jobs = sequence_optimizer.optimize(
      jobs=assigned_jobs,
      current_setup=machines[machine_id].production_state.current_part_type,
      setup_time_matrix=get_setup_matrix(machines[machine_id].asset_class)
    )
    FOR job IN sorted_jobs:
      schedule_jobs.append({
        job_id: job.job_id,
        assigned_machine: machine_id,
        start_time: job.computed_start,
        end_time: job.computed_end,
        setup_time_min: job.setup_time
      })

  // Step 4: Validate schedule against constraints
  violations = validate_schedule(schedule_jobs, constraints={
    maintenance_windows: get_planned_maintenance(machines),
    machine_capabilities: {m.asset_id: m.capabilities FOR m IN machines},
    order_dependencies: extract_dependencies(orders),
    shift_calendar: get_shift_calendar()
  })

  IF len(violations) > 0:
    // Re-run with constraint penalties increased
    schedule_jobs = repair_schedule(schedule_jobs, violations)

  // Step 5: Evaluate schedule in digital twin simulator
  simulated_oee = twin_simulator.evaluate(schedule_jobs, machines)

  RETURN production_schedule {
    jobs: schedule_jobs,
    objective_scores: {
      predicted_oee: simulated_oee.oee,
      predicted_makespan: simulated_oee.makespan_hours,
      energy_cost: simulated_oee.energy_cost,
      setup_changes: count_setups(schedule_jobs)
    }
  }
```

### Algorithm 4: Edge-Cloud Delta Sync Protocol

```
FUNCTION sync_edge_to_cloud(edge_state: edge_buffer, cloud_state: cloud_store) -> sync_result:

  // Step 1: Identify unsynchronized data using vector clocks
  edge_clock = edge_state.get_vector_clock()
  cloud_clock = cloud_state.get_vector_clock()

  delta_assets = []
  FOR asset_id IN edge_clock.keys():
    IF edge_clock[asset_id] > cloud_clock.get(asset_id, 0):
      delta_assets.append(asset_id)

  // Step 2: Extract deltas per asset
  sync_payload = []
  FOR asset_id IN delta_assets:
    asset_deltas = edge_state.get_changes_since(asset_id, cloud_clock.get(asset_id, 0))
    sync_payload.append({
      asset_id: asset_id,
      telemetry_deltas: asset_deltas.telemetry,    // downsampled summaries
      twin_state_deltas: asset_deltas.twin_state,
      inference_logs: asset_deltas.inference_logs,
      inspection_results: asset_deltas.inspections
    })

  // Step 3: Upload with bandwidth-aware throttling
  bandwidth_available = measure_uplink_bandwidth()
  priority_sorted = sort_by_priority(sync_payload)  // safety logs first, then anomalies, then routine

  uploaded = []
  FOR payload IN priority_sorted:
    IF estimated_size(payload) > bandwidth_available * SYNC_WINDOW_SEC:
      payload = compress_and_downsample(payload)  // reduce resolution to fit bandwidth
    result = cloud_state.apply_delta(payload)

    IF result.has_conflicts:
      // Cloud made changes during offline period (e.g., new schedule)
      FOR conflict IN result.conflicts:
        resolution = resolve_conflict(conflict, policy=EDGE_WINS_FOR_SAFETY)
        cloud_state.apply_resolution(conflict.asset_id, resolution)

    uploaded.append(payload.asset_id)

  // Step 4: Pull cloud-to-edge updates (new models, schedule changes)
  cloud_updates = cloud_state.get_pending_edge_updates(edge_state.gateway_id)
  FOR update IN cloud_updates:
    IF update.type == MODEL_UPDATE:
      verify_signature(update.model_artifact, trusted_keys)
      edge_state.stage_model_update(update)
    ELIF update.type == SCHEDULE_UPDATE:
      edge_state.apply_schedule_if_valid(update)

  RETURN {synced_assets: uploaded, conflicts_resolved: count_conflicts, cloud_updates_applied: len(cloud_updates)}
```

---

## Key Schema Relationships

```
digital_twin_asset
  │─── 1:N ──→ sensor_reading           (continuous telemetry per sensor channel)
  │─── 1:N ──→ quality_inspection_result (inspections of parts produced by this asset)
  │─── 1:N ──→ maintenance_ticket       (PdM predictions and manual tickets)
  └─── N:M ──→ production_schedule      (asset assigned to multiple scheduled jobs)

production_schedule
  │─── 1:N ──→ scheduled_job            (jobs in this schedule revision)
  └─── N:1 ──→ digital_twin_asset       (jobs assigned to specific machines)

quality_inspection_result
  │─── N:1 ──→ digital_twin_asset       (machine that produced the part)
  └─── 1:N ──→ defect                   (defects detected in this inspection)

maintenance_ticket
  │─── N:1 ──→ digital_twin_asset       (asset requiring maintenance)
  └─── 1:1 ──→ pdm_prediction           (triggering prediction, if PdM-generated)
```
