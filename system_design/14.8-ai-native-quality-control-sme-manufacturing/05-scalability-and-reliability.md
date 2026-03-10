# 14.8 AI-Native Quality Control for SME Manufacturing — Scalability & Reliability

## Scaling Strategy

### Edge Tier Scaling: Horizontal by Design

Each inspection station is an independent unit. Scaling from 1 to 200 stations per factory involves no shared state, no distributed coordination, and no rebalancing:

```
Scaling dimensions:
  1. Stations per factory: Add physical stations; each is self-contained
     - No shared compute between stations
     - Factory gateway handles aggregation (see below)
     - Linear cost: $500-$3,000 per additional station

  2. Factories per tenant: Add factory gateways; each connects independently to cloud
     - No inter-factory dependencies
     - Each factory operates autonomously during cloud outages

  3. Cameras per station: Multi-camera configurations (top + side + bottom)
     - Option A: Separate edge device per camera (simpler, more expensive)
     - Option B: Multi-camera single device with time-division multiplexing
       (inference on cam1 while cam2 captures; requires 2x latency budget)
     - Option C: Multi-camera single device with parallel NPU inference
       (requires NPU with batch support; available on higher-end devices)
```

### Factory Gateway Scaling

The factory gateway aggregates telemetry and image uploads from all stations in a factory. It needs to handle:

```
Per factory (20 stations, 120 parts/min each):
  - Inspection events: 20 × 120 = 2,400/min = 40/sec
  - Defect images: 40/sec × 2% defect rate = 0.8 images/sec × 200 KB = 160 KB/sec
  - Sampled pass images: 40/sec × 1% = 0.4/sec × 150 KB = 60 KB/sec
  - Telemetry: 20 stations × 1 event/30sec = ~1 event/sec

  Total upload bandwidth: ~250 KB/sec sustained = 2 Mbps
  This is trivially handled by standard factory internet connections.

  Gateway hardware: A basic single-board computer or mini-PC ($50-$100)
  handles this workload with significant headroom.
```

### Cloud Tier Scaling

The cloud platform serves many tenants simultaneously. The key scaling challenges are model training (GPU-bound) and image storage (storage-bound):

#### Training Pipeline Scaling

```
Workload: 1,000 tenants × avg 2 training jobs/month = 2,000 jobs/month
  - Peak: 100 jobs/day during working hours (9 AM - 6 PM local time)
  - Distributed across time zones: ~50 concurrent jobs at peak

GPU cluster sizing:
  - 50 GPUs (mid-range, 16 GB memory each)
  - Each job: 1-4 hours on 1 GPU
  - Daily capacity: 50 GPUs × 9 hours = 450 GPU-hours
  - Daily demand: 100 jobs × avg 2 hours = 200 GPU-hours
  - Utilization: 44% at peak → comfortable headroom

Cost optimization:
  - Use spot/preemptible instances (training is checkpointable and restartable)
  - 60-70% cost reduction vs. on-demand
  - Job scheduler with priority queue: urgent retrain > new model > reoptimization
  - Auto-scale GPU cluster based on queue depth (scale down to 10 GPUs overnight)
```

#### Image Storage Scaling

```
Daily ingestion: 3.3 TB (defect images + sampled pass images)
Active storage (90-day hot): 300 TB
Archive storage (1-7 year cold): 1-5 PB

Tiered storage strategy:
  Tier 1 (Hot, 0-30 days): Object storage with SSD backend
    - Fast retrieval for dashboard queries and active learning
    - Cost: ~$0.023/GB/month → 100 TB × $0.023 = $2,300/month

  Tier 2 (Warm, 30-90 days): Object storage with HDD backend
    - Retrieval within minutes for audit queries
    - Cost: ~$0.01/GB/month → 200 TB × $0.01 = $2,000/month

  Tier 3 (Cold, 90 days - 7 years): Archive storage
    - Retrieval within hours for compliance audits
    - Cost: ~$0.004/GB/month → 1 PB × $0.004 = $4,000/month

  Lifecycle policies:
    - Defect images: Hot 30d → Warm 90d → Cold 7y (regulatory retention)
    - Pass images: Hot 30d → Delete (unless flagged for training)
    - Metadata: Hot indefinitely (small, high-value for analytics)
```

#### Analytics and Dashboard Scaling

```
Inspection metadata: 600M records/day × 500 bytes = 300 GB/day

Query patterns:
  - Real-time: "Current defect rate for station X" (time-series, last 5 min)
  - Shift report: "Defect summary for factory Y, shift 1 today" (aggregate)
  - Trend analysis: "Defect type A trend over last 30 days" (time-series scan)
  - Audit: "All inspection records for batch Z" (point lookup)

Database strategy:
  - Time-series DB for real-time metrics and trends
    - Partitioned by tenant_id + time (daily partitions)
    - Retention: 90 days at full resolution, 1 year at 1-minute aggregates
    - Approximate size: 300 GB/day × 90 days = 27 TB

  - Relational DB for configuration, models, stations, tenants
    - Much smaller dataset: < 100 GB across all tenants
    - Read-heavy, write-rare pattern

  - Object storage for images (as described above)
```

---

## Fault Tolerance

### Edge Device Failures

Edge devices are the critical path for inspection. A failed edge device means parts pass uninspected—a quality risk that SME manufacturers take extremely seriously.

```
Failure modes and mitigations:

1. Edge device crash/hang
   - Detection: Watchdog timer (hardware or software) with 5-second timeout
   - Recovery: Automatic reboot; model reloaded from local storage
   - Impact: 15-30 second outage; production line pauses or parts pass uninspected
   - Mitigation: PLC integration sends "inspection station offline" signal,
     which can pause the line or activate a visual alarm for manual inspection

2. Camera failure
   - Detection: Frame timeout (no frame received within 2x expected interval)
   - Recovery: Camera power cycle via GPIO-controlled relay
   - Impact: 5-10 second outage during power cycle
   - If persistent: Alert operator; station enters "degraded" mode

3. NPU/accelerator failure
   - Detection: Inference returns error or takes > 10x expected latency
   - Fallback: Run inference on CPU (3-5x slower; may not meet latency budget)
   - If CPU inference exceeds budget: Reduce model input resolution (faster
     but less accurate) or switch to anomaly-detection-only mode (simpler model)

4. Storage failure (local disk/eMMC)
   - Detection: Write errors on inspection log
   - Impact: Cannot save images or inspection records locally
   - Mitigation: Continue inspecting (critical function) but flag that
     records are being lost; urgent alert to operator and cloud
   - Recovery: Reboot to remount filesystem; if persistent, replace device

5. Network failure (edge to gateway or gateway to cloud)
   - Impact: No cloud synchronization; no OTA updates; no dashboard data
   - Mitigation: Full offline operation mode
     - Inspection continues unchanged (no cloud dependency)
     - Results buffered locally (48+ hour buffer)
     - On reconnection: batch sync of all buffered data
   - Duration tolerance: 48 hours (limited by local storage)
     - For longer outages: USB drive data extraction as manual fallback
```

### Cloud Platform Failures

Cloud failures do not impact real-time inspection (which runs on-edge) but affect training, analytics, and fleet management.

```
1. Training pipeline failure
   - Impact: Operators cannot train new models
   - Mitigation: Training jobs are checkpointed every epoch;
     restart from last checkpoint on recovery
   - Tolerance: Hours to days (training is not time-critical)

2. Image storage failure
   - Impact: Historical images unavailable; new uploads fail
   - Mitigation: Object storage with cross-region replication;
     edge devices buffer uploads until storage recovers
   - RPO: 0 (synchronous replication within region)
   - RTO: < 1 hour (failover to replica region)

3. Metadata database failure
   - Impact: Dashboard shows stale data; new inspection records not ingested
   - Mitigation: Database replicas (read replicas for queries,
     standby replica for failover)
   - RPO: < 1 minute (synchronous replication)
   - RTO: < 5 minutes (automatic failover)

4. API gateway failure
   - Impact: Edge devices cannot sync; operators cannot access UI
   - Mitigation: Multi-zone deployment with load balancer health checks
   - RTO: < 30 seconds (health check failure triggers rerouting)
```

### Model Deployment Safety Net

Model deployment is the highest-risk operation—a bad model deployed to production can either miss defects (quality risk) or reject good parts (production waste).

```
Defense-in-depth:

Layer 1: Validation before deployment
  - Model must pass test-set accuracy thresholds
  - Model must pass quantization accuracy check (< 3% recall drop vs. FP32)
  - Model must pass inference latency benchmark on target hardware

Layer 2: Shadow mode
  - New model runs in parallel for 500+ inspections
  - Compare with production model on identical images
  - Automatic promotion only if accuracy improves AND FPR doesn't increase

Layer 3: Post-promotion monitoring
  - Track defect rate, false positive rate, and confidence distribution
  - If defect rate changes by > 2 standard deviations within 1 hour:
    alert operator and pause auto-decisions

Layer 4: Instant rollback
  - Previous model kept in memory (rollback slot)
  - Rollback latency: < 1 second (pointer swap)
  - Automatic rollback triggered if:
    a. Inference errors exceed threshold
    b. Average confidence drops below baseline (model is confused)
    c. Operator manually triggers via emergency button or web UI

Layer 5: Factory-wide rollback
  - If multiple stations in the same factory show simultaneous
    degradation after deployment, rollback ALL stations
  - Prevents a bad model version from propagating across the factory
```

---

## Disaster Recovery

### Edge Tier DR

```
Scenario: Edge device destroyed (fire, flood, impact)

Recovery:
  1. Replace hardware (identical or compatible edge device)
  2. Flash base OS image from factory gateway or USB
  3. Device registers with cloud platform using factory credentials
  4. Cloud platform pushes: station config, current model, calibration data
  5. Operator runs calibration check with reference target
  6. Station resumes operation

Recovery time: 30-60 minutes (dominated by physical hardware replacement)

Data loss: Inspection records since last successful cloud sync
  - Typical: 0-30 minutes of records (if network was healthy)
  - Worst case: 48 hours of records (if device was offline before failure)
```

### Cloud Tier DR

```
Scenario: Primary cloud region failure

Recovery:
  1. DNS failover to secondary region (automatic, < 5 minutes)
  2. Secondary region has:
     - Read replica of metadata DB (promoted to primary)
     - Cross-region replicated object storage
     - Standby training GPU cluster (cold start: 10-15 minutes)
  3. Edge devices automatically reconnect to new API endpoint

RTO: < 15 minutes for analytics and fleet management
     < 30 minutes for training pipeline
RPO: < 1 minute for metadata; < 5 minutes for images

Note: Edge inspection is completely unaffected by cloud DR events.
```

### Data Backup Strategy

```
Backup targets and frequency:
  - Metadata DB: Continuous replication + daily snapshot
  - Model registry: Cross-region replication (models are critical IP)
  - Inspection images: Cross-region replication for defect images;
    no backup for sampled pass images (reproducible from production)
  - Configuration data: Versioned in config store; backed up hourly
  - Training datasets: Immutable once uploaded; stored in cross-region object storage

Backup verification:
  - Weekly automated restore test from backup to isolated environment
  - Monthly end-to-end DR drill (simulate region failure, verify recovery)
```

---

## Capacity Planning and Auto-Scaling

### Cloud Auto-Scaling Rules

```
Training GPU cluster:
  - Scale up: Queue depth > 10 jobs AND wait time > 30 minutes
  - Scale down: Queue empty for > 30 minutes
  - Min instances: 5 (always-on for low-latency training starts)
  - Max instances: 100 (cap to control costs)

API servers:
  - Scale up: CPU utilization > 70% OR request latency p95 > 500 ms
  - Scale down: CPU utilization < 30% for > 10 minutes
  - Min instances: 3 (multi-zone availability)
  - Max instances: 50

Image ingestion workers:
  - Scale up: Upload queue depth > 1,000 OR oldest message age > 5 minutes
  - Scale down: Queue depth < 100 for > 10 minutes
  - Min instances: 5
  - Max instances: 100

Dashboard query servers:
  - Scale up: Query latency p95 > 2 seconds
  - Scale down: CPU utilization < 20% for > 15 minutes
  - Min instances: 2
  - Max instances: 20
```

### Edge Fleet Growth Planning

```
Growth model:
  - Year 1: 100 tenants, avg 5 stations = 500 total stations
  - Year 2: 500 tenants, avg 8 stations = 4,000 total stations
  - Year 3: 1,000 tenants, avg 10 stations = 10,000 total stations

Cloud capacity implications at Year 3 (10,000 stations):
  - Inspections/day: 600M (all on edge; cloud sees summaries only)
  - Images uploaded/day: 18M (defects + samples) = 3.3 TB/day
  - Training jobs/month: 2,000
  - Metadata records/day: 600M × 500B = 300 GB/day
  - Total storage (active): ~350 TB

Infrastructure cost estimate (Year 3):
  - GPU cluster (training): 50 spot GPUs × $0.40/hr × 12hr/day = $7,200/month
  - Object storage (350 TB): $5,000/month
  - Compute (API + analytics): $3,000/month
  - Database (time-series + relational): $2,000/month
  - Network egress (OTA + dashboard): $1,000/month
  Total cloud infra: ~$18,000/month

Revenue at Year 3:
  - 10,000 stations × $100/month avg subscription = $1,000,000/month
  - Cloud infra cost as % of revenue: 1.8% → excellent unit economics
```
