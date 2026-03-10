# 13.5 AI-Native Agriculture & Precision Farming Platform — Scalability & Reliability

## Scaling Challenges Unique to Precision Agriculture

### Extreme Seasonality

Agricultural workloads are among the most seasonal in any industry. In the US Midwest:
- **Planting season (April–May):** Equipment telemetry and prescription generation spike 10x
- **Growing season (June–August):** Satellite monitoring, pest detection, and irrigation optimization at peak
- **Spray season (May–July):** 50,000 spray rigs active simultaneously; 130 TB/day of spray logs
- **Harvest (September–November):** Yield data ingestion and combine telemetry at peak
- **Winter (December–March):** < 5% of peak load; planning, analytics, and model training

The platform must scale from winter baseline to peak-season capacity and back within days, not weeks. Over-provisioning for peak is economically unviable given the thin per-acre margins in agriculture.

### Geographic Distribution

Managed acreage spans continental scales (US alone: Great Plains to the Southeast, covering 4 time zones and 15+ distinct agro-climatic regions). Satellite imagery arrives in regional tiles, weather data varies by grid cell, and sensor data flows from LoRaWAN gateways distributed across rural areas with minimal network infrastructure.

---

## Imagery Pipeline Scaling

### Satellite Processing

```
Architecture: Fan-out pipeline with auto-scaling workers

Ingestion tier:
  - Satellite data providers push tiles via webhook or pull from provider API
  - Ingestion service: 5 instances (one per major provider + Sentinel)
  - Writes raw tiles to object storage with metadata in catalog database

Processing tier (auto-scaling worker pool):
  - Step 1: Atmospheric correction (CPU-bound, ~30 sec per tile)
  - Step 2: Cloud masking (GPU-accelerated ML, ~10 sec per tile)
  - Step 3: Vegetation index computation (CPU, ~5 sec per tile)
  - Step 4: Field-level clipping and anomaly detection (~2 sec per field)

  Peak load: 500 Sentinel-2 tiles + 2,000 commercial tiles per day
  Processing time per tile: ~45 sec average
  Total compute: 2,500 tiles × 45 sec = ~31 CPU-hours/day
  Worker pool: 10–50 GPU-equipped workers (auto-scales based on queue depth)
  SLO: all tiles processed within 4 hours of acquisition

Optimization:
  - Cloud-Optimized GeoTIFF (COG) format enables partial tile reads
    (process only the geographic extent of managed fields, skip empty regions)
  - Skip processing for tiles with > 90% cloud cover (detected via quick thumbnail analysis)
  - Cache atmospheric correction LUTs per satellite/date to avoid recomputation
```

### Drone Processing

```
Architecture: Job queue with GPU worker pool

Upload path:
  - Drone companion computer → farm WiFi → object storage (resumable upload)
  - Average upload: 8 GB per flight at 5–20 Mbps = 7–27 minutes per flight
  - Peak: 5,000 flights/day → 40 TB/day inbound

Processing pipeline:
  - Ortho-mosaic stitching: GPU-accelerated SfM, ~45 min per 200-acre flight
  - Plant detection: GPU inference on ortho-mosaic tiles, ~15 min per flight
  - Product generation: vegetation index, DSM, anomaly maps, ~10 min

  Total per flight: ~70 min on 1 GPU worker
  Peak daily: 5,000 flights × 70 min = 5,833 GPU-hours
  Worker pool: 50–250 GPU workers (auto-scales; spot/preemptible instances for cost)
  SLO: results within 2 hours of upload completion

Cost optimization:
  - Priority tiers: urgent scouting flights processed immediately;
    routine monitoring flights queued for off-peak processing
  - Spot instance strategy: 80% of processing on preemptible GPU instances
    (20% cost of on-demand); re-queue interrupted jobs automatically
  - Progressive resolution: deliver low-res preview in 15 min, full-res in 2 hours
```

---

## Sensor Data Pipeline Scaling

### LoRaWAN Ingestion Architecture

```
Sensor → LoRaWAN Gateway → Network Server → MQTT Broker → Ingestion Service → Time-Series DB

Scale numbers:
  10M sensors → 50,000 gateways → 100 network server instances → message broker cluster

Gateway-level batching:
  Each gateway aggregates readings from ~200 sensors
  Uplink: 1 batch every 15 min → ~200 readings × 200 bytes = 40 KB per batch
  50,000 gateways × 40 KB / 15 min = 133 MB/min = 2.2 MB/sec

Network server tier:
  100 instances, each handling 500 gateways
  Decrypts LoRaWAN payloads, deduplicates (sensor may reach multiple gateways),
    applies device-level processing (calibration, quality scoring)

Message broker:
  Partitioned by farm_id (ensures per-field ordering)
  Peak throughput: ~11K readings/sec
  Retention: 1 hour (consumers should process within minutes)

Ingestion service:
  Writes calibrated readings to time-series database
  Updates field digital twin with latest sensor values
  Triggers irrigation recomputation if moisture crosses threshold

Time-series database:
  Partitioned by field_id and time (monthly partitions)
  Automatic downsampling: raw (15 min) retained 90 days,
    hourly averages retained 2 years, daily averages retained 10 years
  Compression: time-series encoding achieves 8–10x for soil sensor data
```

### Sensor Fleet Management at Scale

```
Challenges at 10M sensors:
  - Battery monitoring: predict replacement needs 30 days in advance
  - Firmware updates: staged OTA via LoRaWAN Class C (firmware < 50 KB)
  - Drift detection: per-sensor calibration model maintenance
  - Sensor provisioning: self-registration via activation code on farm WiFi

Battery prediction model:
  Input: voltage trend (last 90 days), transmission frequency, environmental temperature
  Output: predicted days to critical voltage threshold
  Runs daily for all sensors; generates replacement alerts with geographic clustering
    (replace all low-battery sensors in a region during a single farm visit)

Provisioning at scale:
  - New sensor powers on → joins nearest LoRaWAN gateway → sends activation beacon
  - Activation service matches beacon to pre-registered sensor batch (purchased by farmer)
  - Auto-assigns field_id based on GPS coordinates from gateway triangulation
  - Full provisioning in < 5 minutes, no manual configuration needed
```

---

## Edge Fleet Scaling

### Managing 50,000 Spray Rigs

```
Edge management challenges:
  - Model deployment: push 200 MB model update to 50,000 rigs over limited bandwidth
  - Configuration: per-crop spray thresholds, nozzle geometry calibration
  - Monitoring: detect hardware failures (camera, GPU, solenoid) in the field
  - Data collection: aggregate 130 TB/day of spray logs from rigs with intermittent connectivity

Model deployment strategy:
  - Staged rollout: 1% → 10% → 50% → 100% over 72 hours
  - Delta updates: only transfer changed model layers (~20 MB vs. 200 MB full model)
  - Pre-position models during off-season or overnight via farm WiFi
  - Fallback: every rig maintains n-1 model version; auto-rollback on validation failure

Spray log aggregation:
  - Each rig: ~2.6 GB/day of spray logs (compressed)
  - Upload window: typically 2–4 hours per day when rig is near farm WiFi/cellular
  - Bandwidth budget: 2.6 GB / 4 hours = ~180 KB/sec sustained upload
  - At 2 Mbps uplink, this is feasible but leaves little headroom
  - Optimization: on-rig aggregation reduces log volume by 10x
    (per-acre summaries instead of per-nozzle-per-frame detail)
  - Full detail logs retained on-rig for 7 days; uploaded opportunistically

Rig health monitoring:
  - Heartbeat every 60 sec when operating (GPS, model version, camera status, nozzle test results)
  - Heartbeat routed through LoRaWAN if cellular unavailable (100 bytes fits in LoRaWAN uplink)
  - Fleet dashboard: map view of all rigs with status indicators
  - Alert rules: camera feed frozen > 10 sec, GPU temperature > 85°C,
    nozzle solenoid test failure, model version outdated > 7 days
```

---

## Seasonal Scaling Strategy

### Resource Allocation by Season

| Resource | Winter (Dec–Mar) | Spring (Apr–May) | Summer (Jun–Aug) | Fall (Sep–Nov) |
|---|---|---|---|---|
| Satellite processing workers | 10 | 25 | 50 | 30 |
| Drone processing GPU workers | 5 | 50 | 250 | 100 |
| Sensor ingestion instances | 20 | 50 | 100 | 50 |
| Yield prediction workers | 0 | 50 | 200 | 50 |
| Irrigation optimizer instances | 0 | 20 | 100 | 10 |
| API servers | 10 | 30 | 50 | 30 |
| Model training GPU cluster | 50 | 10 | 10 | 50 |

**Key insight:** Model training workloads are counter-seasonal to operational workloads. Winter is when the platform retrains all models using the previous season's data, while summer is peak operational demand. This allows the same GPU fleet to serve training in winter and inference in summer.

### Auto-Scaling Triggers

```
Satellite processing:
  Trigger: tile queue depth > 100 OR processing lag > 2 hours
  Action: scale up workers by 50% (max: 100)
  Cool-down: scale down when queue empty for 30 min

Drone processing:
  Trigger: job queue depth > 500 OR oldest job age > 1 hour
  Action: scale up GPU workers (prefer spot instances)
  Cool-down: scale down when queue depth < 50 for 15 min

Sensor ingestion:
  Trigger: message broker consumer lag > 100,000 messages
  Action: add ingestion instances (scaled by partition count)
  Cool-down: scale down when lag < 10,000 for 10 min

Yield prediction:
  Trigger: weekly prediction job queued (scheduled trigger)
  Action: burst to 200 workers for ~1 hour, then scale down
  Pattern: predictable weekly burst, pre-warmed worker pool
```

---

## Reliability Architecture

### Edge Reliability (Spray Controller)

The spray controller is the most reliability-critical component—a failure mid-field means either stopping the operation (losing time in a narrow spray window) or reverting to broadcast spray (wasting 50–90% of the herbicide savings).

```
Reliability measures:
  - Dual-boot firmware: primary + fallback firmware partitions
    If primary fails health check at boot, auto-boot fallback
  - Watchdog timer: hardware watchdog resets the controller if main loop
    does not service the watchdog within 100 ms
  - Camera redundancy: 24 cameras arranged in overlapping pairs
    If one camera fails, its partner covers the gap (with slightly reduced accuracy)
  - Nozzle fail-safe: solenoid default state is OPEN (spray on)
    On controller failure, all nozzles spray → reverts to broadcast
    (prefer wasting herbicide over missing weeds)
  - GPS fallback: dual GPS receivers; if both fail, spray operates
    on dead reckoning from wheel speed sensor for up to 500 m

  Target: < 1 field-stopping failure per 10,000 operating hours
```

### Cloud Platform Reliability

```
Redundancy strategy:
  - Stateless services: 3+ replicas across availability zones
  - Database: primary-replica configuration with automatic failover
  - Object storage: triple-replicated across zones (imagery, spray logs)
  - Message broker: 3-broker cluster with topic replication factor 3
  - Time-series database: replication factor 2 with automated rebalancing

Disaster recovery:
  - RPO: 1 hour (asynchronous replication to secondary region)
  - RTO: 4 hours (failover to secondary region with pre-provisioned compute)
  - Edge operates independently during cloud outage (edge-first architecture)

  Rationale for relatively relaxed cloud RTO:
  - Edge devices operate autonomously; cloud outage does not stop farming operations
  - Satellite imagery pipeline can buffer tiles for hours without data loss
  - Sensor data is buffered at LoRaWAN gateways (24-hour buffer)
  - Critical path (spray decisions) has zero cloud dependency
```

### Data Durability

| Data Type | Durability Strategy | Recovery |
|---|---|---|
| Spray logs | Write to edge SSD + upload to cloud; both copies retained | Re-upload from edge if cloud copy lost |
| Sensor readings | LoRaWAN confirmed uplinks + cloud write-ahead log | Replay from LoRaWAN network server buffer (24h) |
| Satellite products | Source imagery available from provider for re-download | Reprocess from raw tiles (idempotent pipeline) |
| Drone imagery | Upload to object store with checksum verification | Re-fly the field if both edge and cloud copies lost |
| Field digital twin | Snapshotted daily; reconstructable from source data | Replay all source data from last snapshot |
| Prescriptions | Versioned in database + cached on edge devices | Regenerate from current field digital twin state |

---

## Performance Optimization

### Imagery Processing Optimization

```
Cloud-Optimized GeoTIFF (COG) benefits:
  - HTTP range requests: read only the spatial extent needed
    (a 100 km × 100 km tile, but we only need the 1 km × 1 km field)
  - 100x reduction in bytes read for single-field queries
  - Pyramidal overviews: zoom levels pre-computed; farm-level view
    reads low-res overview instead of full-resolution raster

Tile caching strategy:
  - Recent tiles (30 days): fast object storage with CDN edge caching
  - Archive tiles (1–5 years): cold object storage, accessed for trend analysis
  - NDVI time series: pre-extracted per field, stored in time-series DB
    (avoids re-reading raster tiles for historical queries)
```

### Yield Prediction Optimization

```
Simulation caching:
  - Weather varies slowly across space; fields within 10 km receive nearly
    identical weather forcing
  - Cache simulation results by weather cell (10 km grid) + soil class
  - Fields sharing weather cell and soil class: reuse simulation,
    adjust only for management differences (planting date, fertilizer rates)
  - Cache hit rate: ~60% (reduces effective simulation count by 60%)

Feature store:
  - Pre-compute satellite features (NDVI time series statistics) nightly
  - Store in columnar format indexed by (field_id, prediction_date)
  - ML inference reads pre-computed features instead of raw satellite rasters
  - Reduces per-prediction feature assembly from 500 ms to 5 ms
```
