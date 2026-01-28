# Observability

## Key Metrics

### Generation Metrics (Primary)

| Metric | Type | Description | Target |
|--------|------|-------------|--------|
| `video_generation_duration_seconds` | Histogram | E2E generation time | Real-time: <2s, Standard: <60s |
| `video_generation_success_total` | Counter | Successful generations | Rate >99% |
| `video_generation_failure_total` | Counter | Failed generations (by reason) | Rate <1% |
| `dit_inference_step_duration_ms` | Histogram | Per-step DiT latency | <700ms per step |
| `vae_decode_duration_seconds` | Histogram | 3D VAE decode time | <10s for 10s video |
| `audio_generation_duration_seconds` | Histogram | Audio synthesis time | <5s |
| `temporal_consistency_score` | Gauge | Frame coherence (VBench) | >0.9 |
| `audio_sync_accuracy_ms` | Histogram | A/V sync offset | <120ms |
| `frames_per_second_generated` | Gauge | Generation throughput | >6 fps (real-time) |

### Queue Metrics (Long-Running Jobs)

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `queue_depth_total` | Gauge | Jobs waiting (by tier) | >500 (P1) |
| `queue_wait_duration_seconds` | Histogram | Time in queue | >5min (standard) |
| `job_age_seconds` | Histogram | Total job lifetime | >10min (standard) |
| `checkpoint_save_duration_ms` | Histogram | Checkpoint write time | >5000ms |
| `checkpoint_recovery_count` | Counter | Jobs recovered from checkpoint | Rate <1% |
| `job_cancellation_total` | Counter | User-cancelled jobs | Monitor trend |
| `job_timeout_total` | Counter | Jobs exceeding time limit | Rate <0.1% |

### GPU Cluster Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `gpu_utilization_percent` | Gauge | GPU compute usage | <40% (scale down), >90% (scale up) |
| `gpu_memory_used_bytes` | Gauge | VRAM usage | >75GB on H100 |
| `gpu_memory_utilization_percent` | Gauge | VRAM percentage | >95% (critical) |
| `gpu_temperature_celsius` | Gauge | GPU temperature | >80°C (warning) |
| `worker_count_total` | Gauge | Active workers (by status) | - |
| `worker_model_load_duration_seconds` | Histogram | Model loading time | >30s (cold start) |
| `tensor_parallel_comm_duration_ms` | Histogram | Inter-GPU communication | >50ms |
| `nvlink_bandwidth_gbps` | Gauge | NVLink utilization | <100 Gbps (under-utilized) |

### Safety Metrics

| Metric | Type | Description | Target |
|--------|------|-------------|--------|
| `pregen_safety_block_total` | Counter | Pre-gen blocks (by category) | Monitor trend |
| `postgen_safety_block_total` | Counter | Post-gen blocks (by category) | <1% of completions |
| `deepfake_detection_score` | Histogram | Deepfake confidence | Track distribution |
| `safety_check_duration_ms` | Histogram | Safety pipeline latency | <500ms |
| `false_positive_rate` | Gauge | Wrongly blocked (estimated) | <2% |
| `csam_detection_total` | Counter | CSAM detections | Any = critical alert |
| `c2pa_embed_success_total` | Counter | Successful C2PA embedding | 100% |

### Business Metrics

| Metric | Type | Description | Purpose |
|--------|------|-------------|---------|
| `credits_consumed_total` | Counter | Credits used (by tier) | Billing |
| `video_seconds_generated_total` | Counter | Total video duration | Capacity planning |
| `active_users_daily` | Gauge | DAU | Growth tracking |
| `api_requests_total` | Counter | Total API calls | Usage patterns |
| `revenue_per_generation_usd` | Histogram | Revenue per video | Profitability |

---

## Metric Definitions (Prometheus Format)

```yaml
# Generation Metrics
- name: video_generation_duration_seconds
  type: histogram
  help: "End-to-end video generation duration"
  labels: [tier, model, resolution, status]
  buckets: [1, 2, 5, 10, 30, 60, 120, 300, 600]

- name: dit_inference_step_duration_ms
  type: histogram
  help: "Duration of single DiT denoising step"
  labels: [model, step_type]  # step_type: spatial_attn, temporal_attn, cross_attn, ffn
  buckets: [100, 200, 300, 500, 700, 1000, 2000]

- name: temporal_consistency_score
  type: gauge
  help: "VBench temporal consistency score (0-1)"
  labels: [model, duration_bucket]  # duration_bucket: 5s, 10s, 30s, 60s

- name: audio_sync_accuracy_ms
  type: histogram
  help: "Audio-video synchronization accuracy in milliseconds"
  labels: [model, audio_type]  # audio_type: speech, ambient, music
  buckets: [20, 50, 80, 120, 200, 500]

# Queue Metrics
- name: queue_depth_total
  type: gauge
  help: "Number of jobs in queue"
  labels: [tier, model, status]  # status: waiting, assigned, generating

- name: queue_wait_duration_seconds
  type: histogram
  help: "Time spent waiting in queue before GPU assignment"
  labels: [tier]
  buckets: [5, 10, 30, 60, 120, 300, 600, 1800]

# GPU Metrics
- name: gpu_utilization_percent
  type: gauge
  help: "GPU compute utilization percentage"
  labels: [worker_id, gpu_index, gpu_type]

- name: gpu_memory_used_bytes
  type: gauge
  help: "GPU memory usage in bytes"
  labels: [worker_id, gpu_index, gpu_type]

# Safety Metrics
- name: safety_check_duration_ms
  type: histogram
  help: "Duration of safety check pipeline"
  labels: [check_type, model]  # check_type: pregen, postgen
  buckets: [50, 100, 200, 300, 500, 1000]

- name: pregen_safety_block_total
  type: counter
  help: "Pre-generation safety blocks"
  labels: [category, classifier]  # category: nsfw, violence, csam, deepfake
```

---

## Dashboard Design

### Operations Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VIDEO GENERATION PLATFORM - OPERATIONS                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GENERATION HEALTH                          QUEUE STATUS                    │
│  ┌─────────────────────────────────┐       ┌─────────────────────────────┐ │
│  │ Success Rate: 99.2%  [▓▓▓▓▓▓▓░] │       │ Premium:    45 waiting     │ │
│  │ P50 Latency: 42s                │       │ Standard: 234 waiting      │ │
│  │ P99 Latency: 78s                │       │ Free:     892 waiting      │ │
│  │ Active Jobs: 1,245              │       │ Avg Wait (Std): 2m 15s     │ │
│  └─────────────────────────────────┘       └─────────────────────────────┘ │
│                                                                             │
│  GENERATION LATENCY (Last 1h)              GPU UTILIZATION                  │
│  ┌─────────────────────────────────┐       ┌─────────────────────────────┐ │
│  │  80s│      ╭──╮                 │       │ Cluster:  82% [▓▓▓▓▓▓▓▓░░] │ │
│  │  60s│──────╯  ╰─────╭───        │       │ Pod-01:   95% [▓▓▓▓▓▓▓▓▓▓] │ │
│  │  40s│               ╰───        │       │ Pod-02:   78% [▓▓▓▓▓▓▓▓░░] │ │
│  │  20s│                           │       │ Pod-03:   72% [▓▓▓▓▓▓▓░░░] │ │
│  │   0s└───────────────────────────│       │ VRAM Avg: 68% [▓▓▓▓▓▓▓░░░] │ │
│  │     00:00        00:30     01:00│       └─────────────────────────────┘ │
│  └─────────────────────────────────┘                                        │
│                                                                             │
│  GENERATION BY MODEL (Last 24h)            ERRORS BY TYPE                   │
│  ┌─────────────────────────────────┐       ┌─────────────────────────────┐ │
│  │ MOCHI1:   45,234 ▓▓▓▓▓▓▓▓▓▓▓▓  │       │ Timeout:     23            │ │
│  │ LTX2:     23,456 ▓▓▓▓▓▓▓        │       │ CUDA Error:  12            │ │
│  │ OPENSORA: 12,345 ▓▓▓▓           │       │ Safety Block: 456          │ │
│  │ VEO3:      5,678 ▓▓             │       │ OOM:          5            │ │
│  └─────────────────────────────────┘       │ Checkpoint:   8            │ │
│                                            └─────────────────────────────┘ │
│                                                                             │
│  CHECKPOINT RECOVERY                       TEMPORAL CONSISTENCY             │
│  ┌─────────────────────────────────┐       ┌─────────────────────────────┐ │
│  │ Recoveries Today: 34            │       │ Avg Score: 0.92            │ │
│  │ Recovery Success: 97%           │       │ 5s videos:  0.95           │ │
│  │ Avg Recovery Time: 12s          │       │ 10s videos: 0.92           │ │
│  │ Data Loss Events: 2             │       │ 30s videos: 0.87           │ │
│  └─────────────────────────────────┘       └─────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Video Safety Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VIDEO SAFETY MONITORING                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SAFETY PIPELINE HEALTH                    BLOCK RATE BY CATEGORY           │
│  ┌─────────────────────────────────┐       ┌─────────────────────────────┐ │
│  │ Pre-gen Check: 50ms (p99)       │       │ NSFW:      2.3%             │ │
│  │ Post-gen Check: 450ms (p99)     │       │ Violence:  0.8%             │ │
│  │ Total Checks: 245,678           │       │ Deepfake:  0.4%             │ │
│  │ Blocks Today: 5,672 (2.3%)      │       │ Hate:      0.1%             │ │
│  └─────────────────────────────────┘       │ CSAM:      0 ✓              │ │
│                                            └─────────────────────────────┘ │
│                                                                             │
│  PRE-GEN vs POST-GEN BLOCKS               DEEPFAKE DETECTION SCORES         │
│  ┌─────────────────────────────────┐       ┌─────────────────────────────┐ │
│  │ Pre-gen:  4,234 (75%)           │       │  1.0│     ╷                 │ │
│  │ Post-gen: 1,438 (25%)           │       │  0.8│     ├─┐               │ │
│  │                                 │       │  0.6│   ╷ │ │               │ │
│  │ Trend: Pre-gen improving        │       │  0.4│   ├─┤ ├─╷             │ │
│  │ (catching more early)           │       │  0.2│ ╷ │ │ │ ├─┐           │ │
│  └─────────────────────────────────┘       │  0.0└─┴─┴─┴─┴─┴─┴───────────│ │
│                                            │     Blocked  Allowed        │ │
│  C2PA COMPLIANCE                           └─────────────────────────────┘ │
│  ┌─────────────────────────────────┐                                        │
│  │ Embedded: 100%                  │       ALERTS                          │
│  │ Verified: 98.5% (on retrieval)  │       ┌─────────────────────────────┐ │
│  │ Failed Embeds: 0                │       │ [!] High block rate (3.1%)  │ │
│  │ Tamper Detected: 12             │       │ [!] New jailbreak pattern   │ │
│  └─────────────────────────────────┘       │ [✓] CSAM detection: none    │ │
│                                            └─────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### GPU Cluster Health Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GPU CLUSTER HEALTH                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CLUSTER OVERVIEW                          WORKER STATUS                    │
│  ┌─────────────────────────────────┐       ┌─────────────────────────────┐ │
│  │ Total Pods: 450                 │       │ Generating: 380 ▓▓▓▓▓▓▓▓▓  │ │
│  │ Total GPUs: 3,600 (H100)        │       │ Idle:        45 ▓          │ │
│  │ Healthy: 445 (98.9%)            │       │ Loading:     12 ░          │ │
│  │ Unhealthy: 5 (1.1%)             │       │ Draining:     8 ░          │ │
│  │ Utilization: 84%                │       │ Offline:      5 ░          │ │
│  └─────────────────────────────────┘       └─────────────────────────────┘ │
│                                                                             │
│  GPU MEMORY DISTRIBUTION                   TEMPERATURE HEATMAP              │
│  ┌─────────────────────────────────┐       ┌─────────────────────────────┐ │
│  │ 80GB │▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ │       │ Pod-01: ░░░░░░░░ 68°C avg  │ │
│  │ 60GB │▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░ │       │ Pod-02: ░░░░░░░░ 72°C avg  │ │
│  │ 40GB │▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░ │       │ Pod-03: ▓▓░░░░░░ 75°C avg  │ │
│  │ 20GB │▓▓░░░░░░░░░░░░░░░░░░░░░░ │       │ Pod-04: ▓▓▓░░░░░ 78°C avg  │ │
│  │  0GB └────────────────────────── │       │ Pod-05: ▓▓▓▓▓░░░ 82°C HOT │ │
│  │       0   500  1000  1500  GPUs │       └─────────────────────────────┘ │
│  └─────────────────────────────────┘                                        │
│                                                                             │
│  MODEL CACHE STATUS                        NVLINK BANDWIDTH                 │
│  ┌─────────────────────────────────┐       ┌─────────────────────────────┐ │
│  │ MOCHI1:  Loaded on 180 pods     │       │ Avg Utilization: 65%       │ │
│  │ LTX2:    Loaded on 120 pods     │       │ Peak: 850 GB/s             │ │
│  │ OPENSORA: Loaded on 100 pods    │       │ Communication/Compute: 18% │ │
│  │ VEO3:    Loaded on 50 pods      │       │                            │ │
│  │ Cache Miss Rate: 2.3%           │       │ ▓▓▓▓▓▓▓░░░ Inter-GPU       │ │
│  └─────────────────────────────────┘       └─────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Logging Strategy

### Log Levels and Content

| Level | When to Use | Example |
|-------|-------------|---------|
| **ERROR** | Generation failure, safety critical | `CUDA OOM during DiT step 30` |
| **WARN** | Degraded performance, retry | `Checkpoint save slow (5.2s)` |
| **INFO** | Job lifecycle events | `Job started: req_123, model=MOCHI1` |
| **DEBUG** | Detailed execution (dev only) | `DiT step 15 complete, 680ms` |

### Structured Log Format

```json
{
  "timestamp": "2026-01-28T10:30:25.123Z",
  "level": "INFO",
  "service": "video-generation",
  "component": "dit-worker",
  "worker_id": "worker-pod-1-gpu-0",

  "event": "generation.step.completed",
  "request_id": "550e8400...",

  "context": {
    "model": "MOCHI1",
    "step": 30,
    "total_steps": 50,
    "step_duration_ms": 680,
    "gpu_memory_used_gb": 45.2
  },

  "trace_id": "abc123...",
  "span_id": "def456..."
}
```

### What NOT to Log

| Data | Reason | Alternative |
|------|--------|-------------|
| Full prompts | PII, IP | Log hash only |
| Generated video content | Storage, privacy | Log metadata only |
| User credentials | Security | Never log |
| Face biometrics | Privacy | Log detection result only |
| Full API keys | Security | Log last 4 chars |

---

## Distributed Tracing

### Trace Structure for Video Generation

```
video_generation_request [request_id: 550e8400..., total: 47.5s]
│
├── gateway [10ms]
│   ├── auth.validate [2ms]
│   ├── rate_limit.check [1ms]
│   └── quota.verify [3ms]
│
├── prompt_processing [250ms]
│   ├── text_encoder.t5xxl [150ms]
│   ├── text_encoder.clip [50ms]
│   └── safety.pregen [50ms]
│       ├── blocklist.check [5ms]
│       ├── promptguard.classify [30ms]
│       └── conceptguard.analyze [15ms]
│
├── queue_wait [5200ms]
│   └── scheduler.assign [100ms]
│
├── worker_setup [300ms]
│   ├── model.load_check [50ms]  // Already loaded
│   └── memory.allocate [250ms]
│
├── dit_inference [35000ms]
│   ├── noise.initialize [50ms]
│   └── denoising_loop [34950ms]
│       ├── step_1 [700ms]
│       │   ├── spatial_attn [150ms]
│       │   ├── temporal_attn [250ms]
│       │   ├── cross_attn [100ms]
│       │   └── ffn [200ms]
│       ├── step_2 [695ms]
│       │   ...
│       ├── step_10 [700ms]
│       │   └── checkpoint.save [500ms]
│       │   ...
│       └── step_50 [700ms]
│
├── vae_decode [4500ms]
│   ├── temporal_upsample [1500ms]
│   └── spatial_upsample [3000ms]
│
├── audio_generation [0ms]  // Disabled for this request
│
├── safety_postgen [450ms]
│   ├── nsfw.classify [200ms]
│   ├── deepfake.detect [150ms]
│   └── violence.classify [100ms]
│
├── watermark [100ms]
│   └── c2pa.embed [100ms]
│
├── transcode [1500ms]
│   └── nvenc.encode [1500ms]
│
└── upload [500ms]
    ├── storage.write [300ms]
    └── cdn.invalidate [200ms]
```

### Key Spans to Instrument

| Span | Purpose | Key Attributes |
|------|---------|----------------|
| `gateway` | Request ingestion | `user_id`, `tier`, `ip` |
| `prompt_processing` | Text encoding + safety | `prompt_length`, `safety_score` |
| `queue_wait` | Queue time | `queue_depth`, `priority` |
| `dit_inference` | Core generation | `model`, `steps`, `resolution` |
| `dit_inference.step_N` | Individual step | `step_duration_ms`, `gpu_util` |
| `vae_decode` | Latent → video | `decode_time_ms`, `output_frames` |
| `safety_postgen` | Output validation | `classifiers`, `scores` |
| `transcode` | Format conversion | `codec`, `bitrate` |

---

## Alerting

### Alert Rules

```yaml
# Critical Alerts (Page immediately)
- alert: VideoGenerationErrorRateHigh
  expr: |
    rate(video_generation_failure_total[5m]) /
    rate(video_generation_success_total[5m]) > 0.05
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Video generation error rate above 5%"
    runbook: "https://runbooks/video-gen-errors"

- alert: CSAMDetected
  expr: increase(csam_detection_total[1m]) > 0
  for: 0s
  labels:
    severity: critical
  annotations:
    summary: "CSAM detection triggered - immediate review required"
    runbook: "https://runbooks/csam-response"

- alert: GPUClusterDown
  expr: |
    count(gpu_worker_status{status="healthy"}) /
    count(gpu_worker_status) < 0.8
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "GPU cluster health below 80%"
    runbook: "https://runbooks/gpu-cluster-recovery"

# Warning Alerts (Notify during business hours)
- alert: QueueDepthHigh
  expr: queue_depth_total{tier="standard"} > 500
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Standard queue depth above 500 jobs"
    runbook: "https://runbooks/queue-scaling"

- alert: TemporalConsistencyDegraded
  expr: temporal_consistency_score{duration_bucket="30s"} < 0.85
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "Temporal consistency degraded for 30s videos"
    runbook: "https://runbooks/quality-degradation"

- alert: CheckpointRecoveryRateHigh
  expr: |
    rate(checkpoint_recovery_count[1h]) /
    rate(video_generation_success_total[1h]) > 0.02
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "Checkpoint recovery rate above 2%"
    runbook: "https://runbooks/checkpoint-issues"

- alert: SafetyBlockRateAnomaly
  expr: |
    rate(pregen_safety_block_total[1h]) /
    rate(video_generation_request_total[1h]) > 0.05
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Safety block rate above normal (possible jailbreak attempt)"
    runbook: "https://runbooks/safety-anomaly"
```

### Runbook References

| Alert | Runbook | Key Actions |
|-------|---------|-------------|
| `VideoGenerationErrorRateHigh` | `/runbooks/video-gen-errors` | Check GPU health, model status, recent deployments |
| `CSAMDetected` | `/runbooks/csam-response` | Immediate escalation, preserve evidence, report |
| `GPUClusterDown` | `/runbooks/gpu-cluster-recovery` | Check node health, restart unhealthy pods, scale up |
| `QueueDepthHigh` | `/runbooks/queue-scaling` | Trigger auto-scaling, check for blocked model |
| `TemporalConsistencyDegraded` | `/runbooks/quality-degradation` | Check model version, VAE health, recent changes |

---

## SLO Monitoring

### SLO Definitions

| SLO | Target | Window | Burn Rate Alert |
|-----|--------|--------|-----------------|
| Generation Success Rate | 99.5% | 30 days | 2% budget burn in 1hr |
| Real-time Latency (<2s) | 95% | 7 days | 5% budget burn in 1hr |
| Standard Latency (<60s) | 99% | 30 days | 2% budget burn in 1hr |
| Queue Wait (Standard) | 95% <5min | 7 days | 5% budget burn in 1hr |
| Safety Block False Positive | <2% | 30 days | Manual review weekly |

### Error Budget Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SLO ERROR BUDGET STATUS (30-day window)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Generation Success Rate (99.5% target)                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Budget: 0.5% (43,200 errors allowed in 30 days)                     │   │
│  │ Used:   0.3% (25,920 errors)                                        │   │
│  │ Remaining: 0.2% (17,280 errors) ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░ 60% remaining   │   │
│  │                                                                      │   │
│  │ Burn Rate: 0.8x normal (healthy)                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Standard Latency <60s (99% target)                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Budget: 1% (86,400 slow requests allowed in 30 days)                │   │
│  │ Used:   0.7% (60,480 slow)                                          │   │
│  │ Remaining: 0.3% ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░ 30% remaining                 │   │
│  │                                                                      │   │
│  │ Burn Rate: 1.2x normal (elevated - monitor)                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Real-time Latency <2s (95% target)                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Budget: 5%                                                          │   │
│  │ Used:   2.1%                                                        │   │
│  │ Remaining: 2.9% ▓▓▓▓▓▓▓▓░░░░░░░░░░░░ 58% remaining                 │   │
│  │                                                                      │   │
│  │ Burn Rate: 0.9x normal (healthy)                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```
