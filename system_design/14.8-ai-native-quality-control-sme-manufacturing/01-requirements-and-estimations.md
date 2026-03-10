# 14.8 AI-Native Quality Control for SME Manufacturing — Requirements & Estimations

## Functional Requirements

| # | Requirement | Notes |
|---|---|---|
| FR-01 | **Real-time visual defect detection** — Capture images of parts on the production line and classify them as pass/fail with defect type and location within the line-speed latency budget; support detection of surface defects (scratches, dents, stains, discoloration), dimensional anomalies (warping, incorrect shape), structural defects (cracks, voids, delamination), and assembly errors (missing components, misalignment) | Inference latency ≤ 100 ms per frame on edge hardware; defect recall ≥ 95%; false positive rate ≤ 3%; support for up to 20 defect classes per inspection station |
| FR-02 | **No-code model training** — Enable factory quality managers to create custom defect detection models by uploading reference images through a web interface; the platform handles architecture selection, data augmentation, training, validation, quantization, and edge compilation without requiring any ML expertise | Minimum training set: 50 good images + 20 defect images per class; training completion within 4 hours on cloud infrastructure; validation report with visual pass/fail examples and accuracy metrics in operator-understandable terms (catch rate, false reject rate) |
| FR-03 | **Edge model deployment** — Deploy trained models to edge devices at inspection stations with zero-downtime updates; support shadow-mode validation where a new model runs alongside the production model to verify accuracy on live data before promotion | OTA deployment to 100+ stations within 30 minutes; shadow-mode validation for configurable period (default 500 inspections); automatic rollback if shadow model accuracy is worse than production model; support for heterogeneous edge hardware (different NPU/accelerator types across stations) |
| FR-04 | **Image acquisition and triggering** — Synchronize camera capture with production line movement using hardware triggers (photoelectric sensors, rotary encoders) to ensure every part is inspected at the exact same position and orientation; handle variable line speeds from 10 to 120 parts per minute | Trigger-to-capture latency ≤ 5 ms; support for area-scan cameras (640x480 to 4096x3072 resolution) and line-scan cameras for continuous web inspection (textiles, sheet metal); configurable region of interest (ROI) to focus inference on the relevant part area |
| FR-05 | **Inspection result actuation** — Drive physical reject mechanisms (pneumatic diverters, robotic arms, conveyor gates) by sending pass/fail signals via GPIO, industrial protocols (Modbus, OPC-UA), or PLC integration within the mechanical response window | GPIO signal latency ≤ 5 ms after inference completion; support for Modbus TCP/RTU and OPC-UA communication with factory PLCs; configurable reject delay to account for physical distance between camera and reject mechanism |
| FR-06 | **Defect analytics dashboard** — Provide real-time and historical analytics on defect rates, defect type distribution, defect trends over time, per-station performance, and per-batch quality metrics; enable quality engineers to drill down into individual inspection events with raw images and inference results | Real-time dashboard refresh ≤ 5 seconds; historical queries across 90+ days of inspection data; exportable reports for ISO 9001 audits; defect trend alerting when rates exceed configurable thresholds |
| FR-07 | **Active learning pipeline** — Identify uncertain or borderline inspection decisions and present them to operators for review; incorporate operator feedback to continuously improve model accuracy without full retraining | Flag inspections with confidence between configurable low/high thresholds (default 0.4-0.7); present 20-50 flagged images per shift for operator review; incremental model update incorporating new labels within 24 hours |
| FR-08 | **Multi-camera inspection stations** — Support inspection configurations with multiple cameras per station (e.g., top + side + bottom views of a part) with synchronized capture and fused inference results | Synchronize up to 4 cameras per station within ±1 ms; support per-view models or multi-view fusion model; unified pass/fail decision across all views |
| FR-09 | **Domain-specific model templates** — Provide pre-trained model templates for common manufacturing verticals (textiles, food packaging, electronics, automotive, pharma) that operators can fine-tune with factory-specific data, reducing training time and data requirements | Template library with 10+ industry-specific pre-trained models; fine-tuning from template requires 50% fewer training images than training from scratch; template selection guided by industry and defect type questionnaire |
| FR-10 | **Quality traceability and audit trail** — Create an immutable inspection record for every part inspected, linking camera image, model version, inference result, confidence score, defect bounding box, and pass/fail decision to production batch ID and timestamp | Append-only audit log with cryptographic integrity verification; record retention configurable from 30 days to 7 years per industry regulation; queryable by batch, date range, station, defect type, and decision |
| FR-11 | **Station health monitoring** — Continuously monitor edge device health (CPU/GPU temperature, memory usage, inference latency, camera frame rate, lighting intensity) and alert operators when degradation threatens inspection quality | Health telemetry reported every 30 seconds; automatic alerts for: inference latency exceeding budget, camera frame drops, temperature throttling, lighting degradation below threshold, disk space exhaustion |
| FR-12 | **Offline operation** — Inspection stations must continue operating during network outages; inspection results queued locally and synchronized when connectivity restores | Local storage buffer for 48+ hours of inspection results at maximum throughput; automatic sync with cloud platform on reconnection; no degradation in inspection accuracy or latency during offline operation |

---

## Out of Scope

- **Robotic material handling** — No robotic pick-and-place or automated sorting beyond binary pass/fail diversion; integration with existing reject mechanisms only
- **3D metrology** — No dimensional measurement with micrometer precision; the platform detects visual defects, not precise geometric deviations (those require specialized CMM or laser scanning equipment)
- **Process control** — No closed-loop control of manufacturing process parameters (temperature, pressure, speed); the platform detects defects but does not automatically adjust the process that creates them
- **Supply chain quality** — No incoming material inspection or supplier quality scoring; focus is on in-process and final inspection at the factory floor
- **Chemical/spectroscopic analysis** — No NIR, X-ray, or spectroscopic inspection; the platform operates on visible-light camera images only

---

## Non-Functional Requirements

### Performance SLOs

| Metric | Target | Rationale |
|---|---|---|
| Edge inference latency (p99) | ≤ 100 ms per frame | Must complete within production line timing budget (120 parts/min = 500 ms/part; inference must leave margin for capture, preprocessing, and actuation) |
| Trigger-to-decision latency (p99) | ≤ 150 ms end-to-end | Total time from hardware trigger to GPIO pass/fail signal; includes capture (10 ms), transfer (5 ms), preprocess (10 ms), inference (80 ms), postprocess (5 ms), actuation (5 ms) with 35 ms margin |
| Model training time (p95) | ≤ 4 hours | Operator starts training before lunch, has a deployable model by afternoon; longer training windows cause operators to lose patience and abandon the platform |
| OTA deployment time (p95) | ≤ 5 min per station | Model file size 5-50 MB; download over factory WiFi/ethernet; atomic swap with rollback capability |
| Dashboard refresh latency (p95) | ≤ 5 seconds | Quality engineers need near-real-time visibility into defect rates during production runs |
| Active learning review queue refresh | ≤ 1 hour | New uncertain images available for operator review within one hour of inspection |

### Reliability & Availability

| Metric | Target |
|---|---|
| Edge inspection availability | 99.9% per station (≤ 8.7 hours downtime/year) — production line stops if inspection station is down |
| Cloud training platform availability | 99.5% — training is not time-critical and can tolerate brief outages |
| Cloud analytics availability | 99.9% — quality engineers need consistent access to dashboards |
| Inspection result durability | 99.999% — audit trail records must never be lost; replicated across storage tiers |
| Offline operation duration | ≥ 48 hours continuous operation without cloud connectivity |
| Model rollback success rate | 100% — failed model deployments must always be recoverable |

### Scalability

| Metric | Target |
|---|---|
| Inspection stations per tenant | Up to 200 stations across multiple factory locations |
| Parts inspected per station per day | Up to 172,800 (120 parts/min × 24 hours; typical: 50,000-80,000 for single-shift 8-hour operation) |
| Total inspections across platform per day | 50M+ (across all tenants) |
| Concurrent model training jobs | 50 (shared cloud GPU cluster) |
| Inspection image storage per station per day | 5-50 GB (depending on resolution and retention policy; defect images always retained; pass images sampled at configurable rate) |
| Total platform image storage | 500 TB+ (growing at 50-100 TB/month) |
| Edge device types supported | 10+ (ranging from single-board computers to industrial edge servers) |

---

## Capacity Estimations

### Inspection Throughput

```
Target: 1,000 active tenants, avg 10 stations per tenant = 10,000 stations

Parts per station per day (avg): 60,000 (75 parts/min × 800 min/shift × 1 shift)
Total inspections per day: 10,000 × 60,000 = 600,000,000 = 600M inspections/day
Peak inspections per second: 600M / 86,400 × 3 (peak factor) ≈ 20,833 inspections/sec platform-wide

Note: Inspections happen on-edge, NOT in the cloud. The cloud sees only:
  - Defect images: 600M × 2% defect rate = 12M defect images/day uploaded
  - Sampled pass images: 600M × 1% sample rate = 6M pass images/day
  - Telemetry events: 10,000 stations × 2,880/day (every 30s) = 28.8M events/day
```

### Storage

```
Defect images (uploaded to cloud):
  - 12M images/day × avg 200 KB/image = 2.4 TB/day
  - 90-day retention: 216 TB

Sampled pass images:
  - 6M images/day × avg 150 KB/image = 0.9 TB/day
  - 30-day retention: 27 TB

Inspection metadata (all inspections):
  - 600M records/day × 500 bytes/record = 300 GB/day
  - 1-year retention: 109 TB

Edge local storage per station:
  - Full resolution images for 48-hour buffer:
    60,000 parts/day × 200 KB × 2 days = 24 GB
  - Requires 64-128 GB storage per edge device

Total cloud storage: ~350 TB active, growing at ~100 TB/month
```

### Model Training Compute

```
Training job characteristics:
  - Dataset size: 200-2,000 images after augmentation
  - Training duration: 1-4 hours on 1 GPU
  - GPU memory: 8-16 GB (mid-range GPU sufficient)

Concurrent training jobs: 50 peak
  - GPU cluster size: 50 × 1 GPU = 50 GPUs
  - Utilization pattern: bursty (operators train during work hours)
  - Cost optimization: spot/preemptible instances for training (interruptible, restartable)

Quantization and compilation: 10-30 min per model per target hardware
  - CPU-only, no GPU needed
  - 50 concurrent compilations × 4 CPU cores = 200 CPU cores
```

### Network Bandwidth

```
Per station upload:
  - Defect images: 120 parts/min × 2% defect × 200 KB = 48 KB/min = ~6.4 Kbps
  - Sampled pass images: 120 parts/min × 1% sample × 150 KB = 18 KB/min = ~2.4 Kbps
  - Telemetry: ~1 Kbps
  - Total per station: ~10 Kbps steady-state (trivial)

Burst: model download during OTA update = 50 MB in 5 min = 1.3 Mbps
  - Factory WiFi/ethernet easily handles this

Cloud ingress:
  - 10,000 stations × 10 Kbps = 100 Mbps sustained
  - Peak (many stations uploading simultaneously): ~500 Mbps
```

### Edge Device Resource Budget

```
Target device: Mid-range edge AI module ($100-$150)
  - CPU: 4-6 cores ARM Cortex-A
  - RAM: 4-8 GB
  - NPU/Accelerator: 2-8 TOPS INT8
  - Storage: 64-128 GB eMMC/NVMe

Inference budget per frame:
  - Image capture + transfer: 10-15 ms
  - Preprocessing (resize, normalize): 5-10 ms
  - Model inference (INT8 quantized): 30-80 ms
  - Postprocessing + decision: 5-10 ms
  - Total: 50-115 ms (within 150 ms budget)

Memory allocation:
  - OS + runtime: 500 MB
  - Model in memory: 5-30 MB (quantized)
  - Image buffers (double-buffered): 50-200 MB
  - Local inspection log DB: 200 MB
  - Image buffer for 48h offline: 24 GB on disk
  - Available headroom: 2-6 GB

Power consumption: 5-15W per station
  - Annual electricity cost: $5-$15 per station
```

### Cost Model

```
Per inspection station hardware:
  - Edge compute device: $100-$150
  - Industrial camera (global shutter): $80-$200
  - LED lighting + diffuser: $30-$80
  - Housing + mounting: $50-$100
  - Trigger sensor: $20-$50
  - Cabling + power supply: $30-$50
  - Total hardware: $310-$630 per station

Versus traditional machine vision:
  - Industrial smart camera: $3,000-$15,000
  - Vision controller: $5,000-$20,000
  - Lighting system: $2,000-$5,000
  - Integration + software license: $10,000-$50,000
  - Total: $20,000-$90,000 per station

Cost advantage: 30-150x cheaper per station

Platform subscription:
  - Per station per month: $50-$200
  - Includes: cloud training, model management, analytics, OTA updates, support
  - Annual cost per station: $600-$2,400
  - Payback vs. 1 human inspector ($400-$800/month): 1-6 months
```
