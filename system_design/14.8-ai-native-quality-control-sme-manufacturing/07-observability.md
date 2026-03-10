# 14.8 AI-Native Quality Control for SME Manufacturing — Observability

## Metrics

### Edge Device Metrics (Collected On-Device, Reported to Cloud)

```
Inspection Performance:
  - inspection.total_count          [counter]   Total inspections since boot
  - inspection.pass_count           [counter]   Total pass decisions
  - inspection.fail_count           [counter]   Total fail decisions
  - inspection.uncertain_count      [counter]   Total uncertain decisions
  - inspection.defect_rate          [gauge]     Defect rate over rolling 100 inspections
  - inspection.inference_latency_ms [histogram]  Model inference time distribution
  - inspection.e2e_latency_ms       [histogram]  Trigger-to-actuation total time
  - inspection.confidence_mean      [gauge]     Mean prediction confidence (rolling 100)
  - inspection.confidence_p10       [gauge]     10th percentile confidence (early drift indicator)

Camera Health:
  - camera.fps                      [gauge]     Actual frames per second
  - camera.frame_drops              [counter]   Frames missed due to timing issues
  - camera.exposure_mean            [gauge]     Average pixel intensity of captured frames
  - camera.sharpness                [gauge]     Laplacian variance (focus quality)
  - camera.blur_rejects             [counter]   Frames rejected for motion blur

Hardware Health:
  - device.cpu_temp_celsius         [gauge]     CPU core temperature
  - device.gpu_temp_celsius         [gauge]     NPU/GPU temperature
  - device.memory_usage_pct         [gauge]     RAM utilization
  - device.disk_usage_pct           [gauge]     Local storage utilization
  - device.uptime_seconds           [counter]   Seconds since last boot
  - device.thermal_throttle_events  [counter]   Thermal throttling events

Sync Status:
  - sync.pending_images             [gauge]     Images waiting to upload
  - sync.pending_metadata           [gauge]     Inspection records waiting to sync
  - sync.last_success_age_sec       [gauge]     Seconds since last successful sync
  - sync.upload_bytes               [counter]   Total bytes uploaded
  - sync.failures                   [counter]   Upload failures (network errors)
```

### Cloud Platform Metrics

```
Training Pipeline:
  - training.jobs_queued            [gauge]     Jobs waiting in queue
  - training.jobs_active            [gauge]     Currently training
  - training.job_duration_sec       [histogram]  Time to complete training
  - training.gpu_utilization        [gauge]     GPU cluster utilization
  - training.job_success_rate       [gauge]     % of jobs completing successfully
  - training.quantization_loss      [histogram]  Accuracy loss from INT8 quantization

Deployment:
  - deploy.active_deployments       [gauge]     OTA deployments in progress
  - deploy.success_rate             [gauge]     % of deployments succeeding
  - deploy.download_duration_sec    [histogram]  Time to download model to edge
  - deploy.shadow_promotions        [counter]   Shadow models promoted to production
  - deploy.shadow_rejections        [counter]   Shadow models rejected
  - deploy.rollbacks                [counter]   Production model rollbacks

Image Ingestion:
  - ingest.images_per_second        [gauge]     Image upload rate
  - ingest.bytes_per_second         [gauge]     Upload bandwidth utilization
  - ingest.queue_depth              [gauge]     Images queued for processing
  - ingest.processing_latency_ms    [histogram]  Time from upload to indexed

Analytics:
  - dashboard.query_latency_ms      [histogram]  Dashboard query response time
  - dashboard.active_sessions       [gauge]     Concurrent dashboard users
  - active_learning.review_backlog  [gauge]     Images pending operator review
  - active_learning.labels_per_day  [counter]   Operator labels received per day

Fleet:
  - fleet.total_stations            [gauge]     Total registered stations
  - fleet.online_stations           [gauge]     Stations currently connected
  - fleet.offline_stations          [gauge]     Stations offline > 5 minutes
  - fleet.degraded_stations         [gauge]     Stations with health warnings
```

### Business Metrics (Derived)

```
Quality Intelligence:
  - quality.defect_rate_by_factory      [gauge]  Per-factory defect %
  - quality.defect_rate_by_product      [gauge]  Per-product defect %
  - quality.defect_rate_by_batch        [gauge]  Per-batch defect %
  - quality.defect_trend_slope          [gauge]  Rate of change in defect rate (per day)
  - quality.escape_rate                 [gauge]  Estimated defects that passed inspection
    (derived from: customer complaints / total inspected)

Platform Health:
  - platform.inspections_per_day        [counter]  Total inspections across all tenants
  - platform.active_tenants             [gauge]    Tenants with > 0 inspections today
  - platform.models_trained_per_week    [counter]  Training adoption metric
  - platform.mean_model_accuracy        [gauge]    Average accuracy across all deployed models
```

---

## Logging

### Edge Device Logging

```
Log levels and retention:

DEBUG: Frame-level processing details (capture timing, preprocess params,
       inference tensor shapes). Local only, circular buffer, 1 hour retention.
       Used for troubleshooting intermittent issues.

INFO:  Every inspection event (timestamp, trigger_id, decision, confidence,
       latency_ms). Stored in local SQLite, synced to cloud.
       Retention: 48 hours locally, 90 days in cloud.

WARN:  Anomalous conditions: thermal throttling, blur rejects, exposure drift,
       sync failures, low disk space. Stored locally + synced.
       Triggers operator notification.

ERROR: Component failures: camera disconnect, NPU error, storage write failure,
       model load failure. Stored locally + immediate push to cloud.
       Triggers operator alert.

FATAL: Device crash, watchdog reset, unrecoverable error.
       Written to persistent crash log (survives reboot).
       Triggers operator alert + platform incident.

Log format (structured):
{
  "ts": "2026-03-10T14:23:17.456Z",
  "level": "INFO",
  "station_id": "st-7f3a",
  "component": "inspection",
  "event": "inspection_complete",
  "trigger_id": 847293,
  "decision": "fail",
  "confidence": 0.94,
  "defect_class": "scratch",
  "latency_us": 67432,
  "model_version": "v12",
  "batch_id": "B-2026-0310-A"
}
```

### Cloud Platform Logging

```
API access logs:
  - Every API call: method, path, caller identity, response code,
    latency, request size, response size
  - Retained: 90 days
  - Used for: security auditing, usage analytics, troubleshooting

Training pipeline logs:
  - Job lifecycle events: queued, started, epoch N complete, validation
    metrics, quantization results, compilation results, completed/failed
  - Retained: lifetime of the model version
  - Used for: debugging training failures, reproducing results

Deployment logs:
  - Deployment lifecycle: initiated, downloading, downloaded, shadow_start,
    shadow_metrics, promoted/rejected/rolled_back
  - Retained: 1 year
  - Used for: deployment auditing, rollback forensics

Audit logs (immutable):
  - User actions: login, model train, model deploy, config change,
    data deletion, role change
  - System actions: auto-rollback, auto-promotion, auto-alert
  - Retained: 3-7 years (compliance requirement)
  - Storage: append-only log with cryptographic hash chain
```

---

## Tracing

### Edge Inspection Trace

Each inspection event generates a trace that spans the full pipeline:

```
Trace: inspection-847293
├── trigger_received          t=0.000ms    [trigger_handler]
│   └── trigger_id: 847293, source: photoelectric_sensor
├── camera_capture_start      t=0.312ms    [camera_driver]
├── camera_capture_complete   t=3.847ms    [camera_driver]
│   └── exposure: 2.5ms, gain: 1.0, resolution: 2048x1536
├── preprocess_start          t=4.102ms    [preprocess]
│   ├── white_balance          t=4.102ms
│   ├── roi_crop               t=4.856ms   roi: [120,80,1800,1400]
│   ├── resize                 t=5.234ms   from: 1680x1320 to: 416x416
│   ├── normalize              t=5.612ms
│   └── quantize               t=5.891ms
├── preprocess_complete       t=5.891ms    [preprocess]
├── inference_start           t=6.012ms    [npu_engine]
│   └── model: efficientnet-lite0-v12, precision: INT8
├── inference_complete        t=67.432ms   [npu_engine]
│   └── inference_time: 61.420ms
├── postprocess_start         t=67.512ms   [postprocess]
│   ├── decode_detections      t=67.512ms   raw_detections: 3
│   ├── nms                    t=67.856ms   after_nms: 1
│   └── apply_thresholds       t=68.102ms
├── postprocess_complete      t=68.102ms   [postprocess]
│   └── decision: fail, class: scratch, confidence: 0.94
├── actuation                 t=68.215ms   [gpio]
│   └── pin: 17, signal: REJECT, pulse: 50ms
├── log_write                 t=68.312ms   [local_db]
└── image_archive             t=68.512ms   [local_storage]
    └── path: /data/images/2026/03/10/847293.jpg

Total trace duration: 68.512ms
```

### Cross-Tier Trace (Edge → Cloud)

When inspection data syncs to the cloud, the trace continues:

```
Trace: sync-batch-47291 (continuation of multiple inspection traces)
├── batch_created             t=0.000ms    [sync_agent]
│   └── events: 120, images: 3, metadata: 120 records
├── compress                  t=12ms       [sync_agent]
│   └── original: 1.2MB, compressed: 480KB
├── encrypt                   t=15ms       [sync_agent]
├── upload_start              t=16ms       [sync_agent]
├── upload_complete           t=234ms      [sync_agent]
│   └── bytes: 480KB, endpoint: gateway.factory-12.local
├── gateway_forward           t=240ms      [factory_gateway]
├── cloud_receive             t=512ms      [api_gateway]
├── auth_verify               t=515ms      [auth_service]
├── image_store               t=623ms      [image_ingestion]
├── metadata_store            t=645ms      [metadata_ingestion]
├── active_learning_eval      t=890ms      [active_learning]
│   └── flagged_for_review: 1 image (confidence: 0.52)
└── dashboard_update          t=1020ms     [analytics]
    └── defect_rate updated for station st-7f3a
```

---

## Alerting

### Critical Alerts (Immediate, Operator Must Act)

```
1. Station Offline
   Condition: No heartbeat from station for > 2 minutes
   Severity: CRITICAL
   Action: Page on-shift operator; pause production line if auto-stop configured
   Runbook: Check power, check network, check device status LEDs, reboot if needed

2. Model Inference Failure
   Condition: Inference errors > 5 in 1 minute
   Severity: CRITICAL
   Action: Alert operator; station falls back to CPU inference or anomaly-only mode
   Runbook: Check NPU temperature, check model integrity, try model reload

3. Defect Rate Spike
   Condition: Defect rate exceeds 3× baseline for rolling 50-part window
   Severity: CRITICAL (if structural defects) / HIGH (if cosmetic)
   Action: Alert quality manager; may indicate process issue (tooling failure,
           material defect, machine malfunction)
   Runbook: Inspect recent rejects physically; check raw material batch;
            inspect production equipment

4. Model Rollback Triggered
   Condition: Automatic rollback activated due to performance degradation
   Severity: CRITICAL
   Action: Alert quality manager; investigate what changed
   Runbook: Review shadow mode metrics; check if production conditions changed
```

### Warning Alerts (Within 1 Hour, Monitor Closely)

```
5. Thermal Throttling
   Condition: Device temperature > 80°C OR throttling events detected
   Severity: WARNING
   Action: Alert maintenance; check cooling system
   Impact: Inference latency may increase; parts may pass with reduced accuracy

6. Camera Degradation
   Condition: Sharpness score < 80% of baseline OR exposure drift > 15%
   Severity: WARNING
   Action: Alert operator; schedule camera cleaning/recalibration
   Impact: Gradual accuracy degradation if not addressed

7. Disk Space Low
   Condition: Local storage > 80% full
   Severity: WARNING
   Action: Alert operator; check sync status (may indicate network issue)
   Impact: If 100%: oldest synced images will be purged; if still full: inspection
           continues but images are not archived

8. Sync Backlog Growing
   Condition: Pending sync items > 10,000 OR sync age > 4 hours
   Severity: WARNING
   Action: Alert IT; check network connectivity
   Impact: Cloud dashboard shows stale data; active learning delayed

9. False Positive Rate Increase
   Condition: Operator override rate (marking rejected parts as good) > 5%
   Severity: WARNING
   Action: Alert quality manager; consider retraining with recent data
   Impact: Production waste; operator fatigue and eventual system distrust
```

### Informational Alerts (Daily Digest)

```
10. Daily Quality Summary
    Content: Per-station defect rate, total inspections, top defect types,
             comparison to previous day and weekly average

11. Model Performance Trend
    Content: Rolling accuracy metrics for each deployed model;
             flag models showing gradual degradation

12. Active Learning Queue Status
    Content: Number of images pending review; estimated labeling effort;
             projected model improvement from pending labels

13. Fleet Health Summary
    Content: Stations online/offline/degraded; upcoming calibration due dates;
             devices approaching storage or thermal limits
```

### Alerting Configuration

```
Alert routing:
  - Critical: Push notification to operator's phone + factory floor alarm + email
  - Warning: Push notification to quality manager + email
  - Info: Daily digest email to quality manager and plant manager

Escalation:
  - Critical alert unacknowledged after 5 min → escalate to factory manager
  - Critical alert unacknowledged after 15 min → escalate to tenant admin
  - Warning alert unacknowledged after 2 hours → escalate to quality manager

Alert suppression:
  - During planned maintenance windows: suppress non-critical alerts
  - During known production changeovers: suppress defect rate alerts
  - Deduplication: same alert type for same station suppressed for 10 minutes
```

---

## Dashboards

### Factory Floor Dashboard (Wall-Mounted Display)

```
Layout: Single screen showing all stations at a glance

┌─────────────────────────────────────────────────────────────┐
│  Factory: Main Plant           Shift: Day (06:00-14:00)     │
│  Date: 2026-03-10              Line Speed: 90 parts/min     │
├────────────┬────────────┬────────────┬────────────┬─────────┤
│ Station 1  │ Station 2  │ Station 3  │ Station 4  │ Station 5│
│ ● ONLINE   │ ● ONLINE   │ ⚠ WARN    │ ● ONLINE   │ ● ONLINE │
│ Pass: 98.2%│ Pass: 97.8%│ Pass: 94.1%│ Pass: 99.1%│ Pass: 97.5%│
│ Today: 4,230│Today: 4,198│Today: 4,102│Today: 4,245│Today: 4,211│
│ Lat: 62ms  │ Lat: 58ms  │ Lat: 71ms  │ Lat: 55ms  │ Lat: 64ms  │
├────────────┴────────────┴────────────┴────────────┴─────────┤
│ [Live defect rate chart - 30 min rolling window]             │
│ [Recent defect images strip - last 10 defects]               │
└─────────────────────────────────────────────────────────────┘
```

### Quality Manager Dashboard (Web Application)

```
Panels:
  1. Defect rate over time (line chart, per station, per defect type)
  2. Defect type distribution (pie chart, per batch)
  3. Per-batch quality scorecard (table with pass/fail/defect breakdown)
  4. Active learning review queue (image gallery with label buttons)
  5. Model performance comparison (current vs. shadow vs. historical)
  6. Station health overview (grid with color-coded status)
  7. Alert history (timeline of recent alerts and resolutions)
```
