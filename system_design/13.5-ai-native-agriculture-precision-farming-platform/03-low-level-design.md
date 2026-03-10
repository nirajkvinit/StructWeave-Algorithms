# 13.5 AI-Native Agriculture & Precision Farming Platform — Low-Level Design

## Data Models

### Field Digital Twin Schema

```
FieldTwin {
  field_id:          UUID
  farm_id:           UUID
  boundary:          GeoJSON Polygon (WGS84)
  area_acres:        Float
  grid_cells: [      // H3 resolution 10 hexagons (~15 m² each)
    {
      h3_index:      String          // H3 hex ID
      soil: {
        moisture_pct:      Float     // 0–100, from sensor fusion
        temperature_c:     Float
        ph:                Float
        nitrogen_ppm:      Float
        phosphorus_ppm:    Float
        potassium_ppm:     Float
        organic_matter_pct: Float
        texture_class:     Enum      // clay, silt, sand, loam, etc.
        last_sampled:      Timestamp
      }
      crop: {
        type:              Enum      // corn, soybean, wheat, etc.
        variety:           String
        planting_date:     Date
        growth_stage:      Enum      // emergence, V6, VT, R1, maturity, etc.
        ndvi:              Float     // latest vegetation index
        ndre:              Float
        canopy_cover_pct:  Float
        plant_count_per_m2: Float
        health_score:      Float     // 0–1 composite
        last_updated:      Timestamp
      }
      weather: {
        gdd_accumulated:   Float     // growing degree days since planting
        precip_7d_mm:      Float
        precip_forecast_7d_mm: Float
        frost_risk:        Float     // 0–1 probability
        et0_mm_day:        Float     // reference evapotranspiration
      }
      pest: {
        active_threats: [
          {
            type:          Enum      // insect, fungal, bacterial, weed
            species:       String
            severity:      Enum      // low, moderate, high, critical
            confidence:    Float
            detected_at:   Timestamp
            source:        Enum      // satellite, drone, camera_trap, scout
          }
        ]
      }
      irrigation: {
        soil_water_deficit_mm: Float
        next_scheduled:    Timestamp
        method:            Enum      // center_pivot, drip, furrow, rainfed
      }
    }
  ]
  version:           Int             // incremented on each update
  updated_at:        Timestamp
}
```

### Spray Session Log

```
SpraySession {
  session_id:        UUID
  rig_id:            UUID
  field_id:          UUID
  operator_id:       UUID
  started_at:        Timestamp
  ended_at:          Timestamp
  speed_kmh_avg:     Float
  model_version:     String          // edge model version used
  nozzle_events: [
    {
      timestamp:     Timestamp       // microsecond precision
      lat:           Float
      lon:           Float
      nozzle_index:  Int             // 0–47
      action:        Enum            // spray_on, spray_off
      weed_confidence: Float         // 0–1
      crop_confidence: Float
      classification: Enum           // weed_broadleaf, weed_grass, crop, bare_soil
      image_ref:     String          // reference to edge image buffer (optional)
    }
  ]
  summary: {
    acres_covered:       Float
    total_spray_time_sec: Float
    herbicide_saved_pct: Float       // vs. broadcast application
    weed_detections:     Int
    false_positive_rate: Float       // estimated from QA sampling
    nozzle_activations:  Int
  }
}
```

### Yield Prediction Record

```
YieldPrediction {
  prediction_id:     UUID
  field_id:          UUID
  zone_id:           String          // management zone within field
  crop_type:         Enum
  prediction_date:   Date
  harvest_target_date: Date
  quantiles: {
    p10:             Float           // bushels per acre
    p25:             Float
    p50:             Float           // median prediction
    p75:             Float
    p90:             Float
  }
  confidence_width:  Float           // p90 - p10, narrows through season
  contributors: {
    simulation_base: Float           // physics model baseline
    ml_correction:   Float           // ML residual correction
    satellite_signal: Float          // NDVI trajectory contribution
    weather_impact:  Float           // weather deviation from normal
  }
  model_version:     String
  features_snapshot: String          // reference to feature store snapshot
}
```

### Soil Sensor Reading

```
SensorReading {
  sensor_id:         UUID
  gateway_id:        UUID
  field_id:          UUID
  h3_cell:           String
  timestamp:         Timestamp
  raw: {
    moisture_adc:    Int             // raw ADC value
    temperature_adc: Int
    ph_mv:           Float           // millivolt reading
    npk_raw:         [Int, Int, Int] // raw spectral readings
  }
  calibrated: {
    moisture_pct:    Float           // after calibration model
    temperature_c:   Float
    ph:              Float
    nitrogen_ppm:    Float
    phosphorus_ppm:  Float
    potassium_ppm:   Float
  }
  quality: {
    battery_v:       Float
    signal_rssi:     Int             // LoRaWAN signal strength
    snr:             Float
    calibration_age_days: Int        // days since last calibration
    drift_flag:      Boolean         // true if drift detected
  }
}
```

---

## API Contracts

### Field Health Query

```
GET /api/v1/fields/{field_id}/health
  ?resolution=zone|cell            // management zone or H3 cell
  &date=2025-07-15                 // specific date or "latest"
  &indices=ndvi,ndre,health_score  // which metrics to return

Response 200:
{
  "field_id": "...",
  "date": "2025-07-15",
  "resolution": "zone",
  "zones": [
    {
      "zone_id": "Z01",
      "centroid": {"lat": 41.234, "lon": -89.567},
      "area_acres": 45.2,
      "ndvi": 0.78,
      "ndre": 0.42,
      "health_score": 0.85,
      "anomaly": null
    },
    {
      "zone_id": "Z02",
      "centroid": {"lat": 41.238, "lon": -89.562},
      "area_acres": 38.7,
      "ndvi": 0.61,
      "ndre": 0.29,
      "health_score": 0.52,
      "anomaly": {
        "type": "moisture_stress",
        "severity": "moderate",
        "detected_at": "2025-07-14T08:30:00Z",
        "recommendation": "Advance irrigation schedule by 2 days"
      }
    }
  ]
}
```

### Prescription Map Generation

```
POST /api/v1/prescriptions/generate
{
  "field_id": "...",
  "operation_type": "herbicide_application",
  "product": {
    "name": "Glyphosate 41%",
    "unit": "oz_per_acre",
    "base_rate": 32,
    "min_rate": 16,
    "max_rate": 48
  },
  "strategy": "variable_rate",       // "uniform", "variable_rate", "spot_spray"
  "data_sources": ["satellite", "drone_survey_20250714"],
  "output_format": "isobus_taskdata"  // or "shapefile", "geojson"
}

Response 200:
{
  "prescription_id": "...",
  "field_id": "...",
  "status": "ready",
  "zones": 24,
  "rate_range": {"min": 16, "max": 48, "mean": 27.3},
  "savings_vs_uniform_pct": 34.2,
  "download_url": "/api/v1/prescriptions/.../download?format=isobus_taskdata",
  "expires_at": "2025-07-16T00:00:00Z"
}
```

### Yield Prediction Retrieval

```
GET /api/v1/fields/{field_id}/yield-prediction
  ?crop_type=corn
  &resolution=field|zone

Response 200:
{
  "field_id": "...",
  "crop_type": "corn",
  "prediction_date": "2025-07-15",
  "field_level": {
    "p10": 172.3,
    "p25": 184.1,
    "p50": 193.7,
    "p75": 201.2,
    "p90": 210.8,
    "unit": "bu_per_acre",
    "confidence_width": 38.5,
    "trend": "narrowing"
  },
  "comparison": {
    "county_avg_p50": 188.0,
    "field_5yr_avg": 191.2,
    "vs_county": "+3.0%",
    "vs_historical": "+1.3%"
  },
  "key_factors": [
    {"factor": "precipitation_deficit", "impact": "-4.2 bu/ac", "direction": "negative"},
    {"factor": "early_planting", "impact": "+6.1 bu/ac", "direction": "positive"},
    {"factor": "nitrogen_application", "impact": "+2.8 bu/ac", "direction": "positive"}
  ]
}
```

### Irrigation Schedule

```
GET /api/v1/fields/{field_id}/irrigation/schedule
  ?horizon_days=10

Response 200:
{
  "field_id": "...",
  "irrigation_method": "center_pivot",
  "schedule": [
    {
      "date": "2025-07-16",
      "recommended": true,
      "amount_mm": 25,
      "duration_hours": 18,
      "sectors": [
        {"sector": 1, "amount_mm": 30, "reason": "high ET + sandy soil"},
        {"sector": 2, "amount_mm": 20, "reason": "adequate residual moisture"},
        {"sector": 3, "amount_mm": 25, "reason": "average demand"}
      ],
      "rationale": "Soil moisture at 42% FC; ET forecast 7.2 mm/day; no rain expected 5 days"
    },
    {
      "date": "2025-07-19",
      "recommended": true,
      "amount_mm": 20,
      "sectors": "uniform",
      "rationale": "Maintenance irrigation; 15mm rain expected day 8 may reduce next cycle"
    }
  ],
  "water_budget": {
    "season_total_mm": 340,
    "season_applied_mm": 185,
    "season_remaining_mm": 155,
    "savings_vs_calendar_pct": 28
  }
}
```

---

## Core Algorithms

### Precision Spray Decision Pipeline (Edge)

```
FUNCTION spray_decision_pipeline(camera_frame, nozzle_geometry):
    // Step 1: Preprocess (runs on DSP/GPU)
    frame = undistort(camera_frame, calibration_matrix)
    frame = normalize_exposure(frame, target_histogram)

    // Step 2: Inference (quantized INT8 model on GPU/FPGA)
    detections = weed_crop_model.infer(frame)
    // detections: list of {bbox, class, confidence}
    // class: weed_broadleaf, weed_grass, crop, bare_soil
    // Target: < 8 ms for inference

    // Step 3: Map detections to nozzle zones
    FOR EACH nozzle IN nozzle_geometry.nozzles:
        nozzle_zone = project_nozzle_footprint(nozzle, camera_to_boom_transform)
        weeds_in_zone = filter_detections(detections, nozzle_zone, class=weed_*)

        IF any weed_confidence > SPRAY_THRESHOLD (0.60):
            nozzle.activate(duty_cycle = map_to_pwm(max_confidence))
        ELSE:
            nozzle.deactivate()

    // Step 4: Log decision (async, non-blocking)
    log_spray_event(timestamp, gps, nozzle_states, detections)

    // Total pipeline: < 15 ms (8 ms inference + 3 ms mapping + 2 ms actuation + 2 ms overhead)
```

### Satellite NDVI Anomaly Detection

```
FUNCTION detect_ndvi_anomalies(field, current_ndvi_raster, historical_ndvi_series):
    // Step 1: Compute expected NDVI for current growth stage
    growth_stage = estimate_growth_stage(field.crop, field.planting_date, field.gdd)
    expected_ndvi = historical_median(historical_ndvi_series, growth_stage)
    expected_std = historical_std(historical_ndvi_series, growth_stage)

    // Step 2: Per-pixel anomaly scoring
    FOR EACH pixel IN current_ndvi_raster:
        IF pixel.cloud_mask == CLEAR:
            z_score = (pixel.ndvi - expected_ndvi) / expected_std
            pixel.anomaly_score = z_score

    // Step 3: Spatial clustering of anomalous pixels
    anomalous_pixels = filter(pixels, |anomaly_score| > 2.0)
    clusters = dbscan(anomalous_pixels, eps=30m, min_points=5)

    // Step 4: Classify anomaly type
    FOR EACH cluster IN clusters:
        mean_anomaly = mean(cluster.anomaly_scores)
        spatial_pattern = classify_pattern(cluster.shape, cluster.size)

        IF mean_anomaly < -2.0 AND spatial_pattern == "circular":
            cluster.type = "irrigation_malfunction"
        ELIF mean_anomaly < -2.0 AND spatial_pattern == "linear":
            cluster.type = "drainage_issue"
        ELIF mean_anomaly < -2.0 AND spatial_pattern == "scattered":
            cluster.type = "pest_or_disease"
        ELIF mean_anomaly > 2.0:
            cluster.type = "excess_vigor"     // possible over-fertilization

    RETURN clusters with type, severity, location, and recommended action
```

### Hybrid Yield Prediction

```
FUNCTION predict_yield(field, prediction_date):
    // Phase 1: Physics-based simulation
    weather_history = get_weather(field.location, field.planting_date, prediction_date)
    weather_forecast = get_forecast(field.location, prediction_date, harvest_date_estimate)
    soil_params = get_soil_profile(field)
    management = get_management_log(field)  // planting, fertilizer, irrigation records

    sim_yield = crop_growth_model.simulate(
        crop = field.crop_type,
        variety = field.variety,
        soil = soil_params,
        weather = concat(weather_history, weather_forecast),
        management = management
    )
    // sim_yield: deterministic bushels/acre from physics model

    // Phase 2: ML correction
    features = assemble_features(
        satellite_ndvi_timeseries = get_ndvi_series(field, planting_date, prediction_date),
        weather_deviations = compute_weather_anomalies(weather_history),
        soil_features = soil_params.summary(),
        management_features = management.summary(),
        simulation_output = sim_yield,
        historical_yield_residuals = get_residual_history(field)
    )

    ml_correction = yield_correction_model.predict(features)
    // ml_correction: {p10, p25, p50, p75, p90} adjustments to sim_yield

    // Phase 3: Combine
    final_prediction = {
        p10: sim_yield + ml_correction.p10,
        p25: sim_yield + ml_correction.p25,
        p50: sim_yield + ml_correction.p50,
        p75: sim_yield + ml_correction.p75,
        p90: sim_yield + ml_correction.p90
    }

    RETURN final_prediction
```

### Irrigation Scheduling Optimization

```
FUNCTION optimize_irrigation(field, horizon_days=10):
    // Step 1: Current state
    soil_moisture = get_current_soil_moisture(field)  // from sensors
    crop_kc = get_crop_coefficient(field.crop, field.growth_stage)
    weather_forecast = get_forecast(field.location, horizon_days)

    // Step 2: Forward simulation of soil water balance
    schedule_candidates = generate_candidate_schedules(
        max_applications = horizon_days / field.min_irrigation_interval,
        amount_range = [10, 40],  // mm per application
        step = 5
    )

    best_schedule = None
    best_score = -infinity

    FOR EACH candidate IN schedule_candidates:
        // Simulate soil water balance forward
        daily_balance = []
        current_sw = soil_moisture

        FOR day IN range(horizon_days):
            et0 = weather_forecast[day].et0
            etc = et0 * crop_kc
            rain = weather_forecast[day].precipitation
            irrigation = candidate.amount_on_day(day) OR 0

            current_sw = current_sw - etc + rain + irrigation
            current_sw = clamp(current_sw, wilting_point, field_capacity)
            daily_balance.append(current_sw)

        // Score: minimize stress days + water used
        stress_days = count(daily_balance < stress_threshold)
        water_used = sum(candidate.amounts)
        waste = count(daily_balance > field_capacity) * overflow_penalty

        score = -stress_days * STRESS_WEIGHT - water_used * WATER_WEIGHT - waste * WASTE_WEIGHT

        IF score > best_score:
            best_score = score
            best_schedule = candidate

    RETURN best_schedule with daily amounts and rationale
```

---

## Edge-Cloud Model Synchronization

### Model Update Protocol

```
FUNCTION edge_model_update(rig_id, new_model_version):
    // Step 1: Validate model compatibility with edge hardware
    rig_spec = get_rig_hardware_spec(rig_id)
    model_manifest = get_model_manifest(new_model_version)

    ASSERT model_manifest.target_runtime IN rig_spec.supported_runtimes
    ASSERT model_manifest.memory_mb <= rig_spec.available_memory_mb
    ASSERT model_manifest.latency_p99_ms <= 8  // must fit in 15 ms total budget

    // Step 2: Stage model on edge during connectivity window
    push_model_to_edge(rig_id, new_model_version, priority="background")
    // Transfer ~200 MB model over cellular/WiFi; resumable transfer

    // Step 3: Validate on edge with reference dataset
    validation_result = run_edge_validation(rig_id, new_model_version,
        reference_images = EDGE_VALIDATION_DATASET)

    IF validation_result.accuracy >= MODEL_ACCURACY_THRESHOLD (0.95):
        activate_model(rig_id, new_model_version)
        report_status(rig_id, "model_updated", new_model_version)
    ELSE:
        rollback_model(rig_id)
        alert_ops("Edge validation failed", rig_id, validation_result)

    // Step 4: A/B testing (optional)
    // Run new model on alternate camera pair; compare detections with current model
    // Promote to all cameras after 100 acres of concordance > 98%
```

---

## Geospatial Indexing Strategy

The field digital twin uses a hierarchical geospatial index to support queries at different spatial resolutions:

| Level | Index Type | Resolution | Use Case |
|---|---|---|---|
| Regional | H3 resolution 4 | ~1,770 km² | Satellite tile routing, regional yield aggregation |
| Farm | H3 resolution 7 | ~5.2 km² | Farm-level dashboards, weather station assignment |
| Field | Vector boundary | Exact polygon | Field-level prescriptions, yield predictions |
| Management Zone | H3 resolution 9 | ~105 m² | Variable-rate application zones |
| Grid Cell | H3 resolution 10 | ~15 m² | Soil sensor fusion, NDVI pixel mapping |
| Plant Level | Point geometry | Sub-meter | Spray nozzle targeting, plant counting |

Queries that span multiple resolution levels (e.g., "show all fields in this county with NDVI anomalies") traverse the H3 hierarchy using parent-child relationships, enabling efficient spatial aggregation without full-table scans.
