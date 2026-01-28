# Requirements and Estimations

## Functional Requirements

### Core Generation Capabilities

| Capability | Description | Priority |
|------------|-------------|----------|
| **Text-to-Video (T2V)** | Generate video from text prompts | P0 |
| **Image-to-Video (I2V)** | Animate a single image as first frame | P0 |
| **Video-to-Video (V2V)** | Style transfer, extension, editing | P1 |
| **Native Audio Generation** | Synchronized speech, music, ambient sounds | P1 |
| **Multi-Resolution Support** | 480p, 720p, 1080p, 4K output | P0 |
| **Variable Duration** | 5s to 60s+ video generation | P0 |
| **Real-time Generation** | <2s for short clips (LTX-style) | P1 |
| **Multi-Keyframe Conditioning** | Reference points throughout video | P2 |

### Generation Modes

| Mode | Target Latency | Use Case | Quality Level |
|------|----------------|----------|---------------|
| **Real-time** | <2s for 5s video | Interactive preview, streaming | Good |
| **Standard** | <60s for 10s video | Consumer generation | Very Good |
| **Cinema** | <5min for 60s 4K video | Professional content | Excellent |

### Model Support

| Model Type | Examples | Requirements |
|------------|----------|--------------|
| **DiT-based** | Veo 3, Sora, Mochi 1 | Full feature support |
| **Real-time optimized** | LTX-Video, TurboDiffusion | Low-latency path |
| **Open-source** | Open-Sora, CogVideoX | Community models |
| **Custom fine-tuned** | Enterprise models | Model registry integration |

### Prompt Processing Features

| Feature | Description |
|---------|-------------|
| Text encoding | T5-XXL, CLIP, Gemma 3 text encoders |
| Negative prompts | Exclude unwanted elements |
| Prompt expansion | Automatic detail enhancement |
| Multi-modal conditioning | Text + image + audio input |
| Style vectors | Preset aesthetic controls |

### Out of Scope

- Real-time video conferencing with AI avatars
- Live streaming generation (frame-by-frame live output)
- Model training and fine-tuning (see MLOps Platform)
- Video editing tools (cut, trim, merge)
- 3D scene generation (see separate design)

---

## Non-Functional Requirements

### Performance Requirements

| Requirement | Target | Justification |
|-------------|--------|---------------|
| **Real-time E2E Latency** | <2s for 5s 768p | LTX-style interactive generation |
| **Standard E2E Latency** | <60s for 10s 1080p | Consumer expectation |
| **Cinema E2E Latency** | <5min for 60s 4K | High-quality output |
| **Queue Wait (Premium)** | <30s | VIP tier experience |
| **Queue Wait (Standard)** | <5min | Fair scheduling |
| **Progress Update Frequency** | Every 2s | User feedback loop |
| **Checkpoint Interval** | Every 10 denoising steps | Recovery granularity |

### Reliability Requirements

| Requirement | Target | Justification |
|-------------|--------|---------------|
| **Availability** | 99.9% | 8.7 hours downtime/year acceptable |
| **Request Success Rate** | 99.5% | Safety rejections expected |
| **Checkpoint Recovery** | 99.9% | Resume from last checkpoint on failure |
| **Data Durability** | 99.999999999% (11 nines) | Generated videos are valuable |
| **Audio Sync Accuracy** | <120ms drift | Lip-sync perception threshold |

### Consistency Model

| Data Type | Consistency | Justification |
|-----------|-------------|---------------|
| Video generation | **Eventual** | Async long-running jobs |
| Progress updates | **Eventual** | Best-effort real-time updates |
| Billing/metering | **Strong** | Financial accuracy required |
| Safety decisions | **Strong** | Compliance enforcement |
| User quotas | **Strong** | Prevent abuse |

### CAP Theorem Choice

**AP (Availability + Partition Tolerance)** for generation pipeline:
- Users can submit jobs even during partial failures
- Generation can proceed on available GPU nodes
- Progress may be delayed but not lost

**CP (Consistency + Partition Tolerance)** for:
- Billing and metering (per-second pricing accuracy)
- Safety enforcement (must block unsafe content)
- User authentication and quotas

---

## Capacity Estimations

### Reference Scenario: Consumer Platform

| Metric | Value | Calculation |
|--------|-------|-------------|
| **Monthly Active Users** | 100M | Large-scale consumer service |
| **Daily Active Users** | 20M | 20% DAU/MAU ratio |
| **Videos per DAU** | 0.5 | Not all users generate daily |
| **Daily Video Generations** | 10M | 20M x 0.5 |
| **Average Video Duration** | 10s | Mix of short and standard |
| **Average Resolution** | 1080p | Most common request |

### Traffic Estimations

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Peak QPS (requests)** | 10M / 86400 x 3 (peak factor) | ~350 QPS |
| **Concurrent Jobs** | 350 QPS x 45s avg generation | ~15,750 concurrent |
| **Video Seconds Generated/Day** | 10M x 10s | 100M seconds |
| **Video Hours Generated/Day** | 100M / 3600 | ~27,800 hours |

### VRAM Requirements by Configuration

**3D Latent Size Formula:**
```
latent_elements = (frames / temporal_compression) x (H / spatial_compression) x (W / spatial_compression) x channels

latent_bytes = latent_elements x 2 (FP16)
```

| Configuration | Frames | Resolution | Latent Elements | Latent Size (FP16) |
|---------------|--------|------------|-----------------|-------------------|
| 5s @ 24fps, 720p | 120 | 1280x720 | 30 x 90 x 160 x 16 = 6.9M | ~14 MB |
| 10s @ 24fps, 1080p | 240 | 1920x1080 | 60 x 135 x 240 x 16 = 31M | ~62 MB |
| 30s @ 24fps, 1080p | 720 | 1920x1080 | 180 x 135 x 240 x 16 = 93M | ~186 MB |
| 60s @ 24fps, 4K | 1440 | 3840x2160 | 360 x 270 x 480 x 16 = 746M | ~1.5 GB |

**Total VRAM per Generation:**

| Component | Memory | Notes |
|-----------|--------|-------|
| DiT model weights (10B params) | 20 GB | FP16 |
| Text encoder (T5-XXL) | 8 GB | 11B params |
| 3D VAE decoder | 4 GB | Reconstruction |
| Audio model (if enabled) | 2 GB | Veo 3-style |
| Video latent (10s 1080p) | 62 MB | Working memory |
| Attention workspace | 10-15 GB | O(T^2) for temporal |
| **Total (10s 1080p)** | **~45-50 GB** | Fits single H100 |
| **Total (60s 4K)** | **80+ GB** | Requires multi-GPU |

### Generation Time Estimations

| Configuration | DiT Steps | DiT Time | VAE Decode | Total (H100 8x) |
|---------------|-----------|----------|------------|-----------------|
| 5s 720p (Standard) | 50 | 15s | 2s | ~20s |
| 10s 1080p (Standard) | 50 | 35s | 5s | ~45s |
| 10s 1080p (Turbo) | 4 | 3s | 5s | ~10s |
| 30s 1080p (Standard) | 50 | 90s | 10s | ~2min |
| 60s 4K (Cinema) | 100 | 4min | 30s | ~5min |

### GPU Fleet Sizing

**Calculations:**
```
concurrent_jobs = 15,750
vram_per_job = 50 GB (average)
gpu_vram = 80 GB (H100)
jobs_per_gpu = 1 (no batching for long jobs)

required_gpus = concurrent_jobs / jobs_per_gpu = 15,750 GPUs

With 8-GPU pods:
required_pods = 15,750 / 8 = ~2,000 pods

Utilization target (70%):
provisioned_pods = 2,000 / 0.7 = ~2,850 pods
provisioned_gpus = 2,850 x 8 = ~22,800 H100 GPUs
```

| Tier | Concurrent Jobs | H100 GPUs | Pods (8x H100) |
|------|-----------------|-----------|----------------|
| **Premium (30%)** | 4,725 | 4,725 | 591 |
| **Standard (50%)** | 7,875 | 7,875 | 985 |
| **Free/Relax (20%)** | 3,150 | 3,150 | 394 |
| **Total** | 15,750 | 15,750 | 1,970 |
| **With overhead (20%)** | - | ~19,000 | ~2,400 |

### Storage Requirements

| Data Type | Calculation | Daily | Annual |
|-----------|-------------|-------|--------|
| **Generated Videos** | 10M x 50MB avg | 500 TB | 182 PB |
| **Video Latents (cache)** | 10M x 100MB | 1 PB | (ephemeral) |
| **Checkpoints** | 15K concurrent x 500MB | 7.5 TB | (ephemeral) |
| **Model Weights** | 2,400 pods x 50GB | 120 TB | (static) |
| **Metadata/Logs** | - | 1 TB | 365 TB |

**Storage Tiers:**

| Tier | Retention | Storage Class | Cost/GB/month |
|------|-----------|---------------|---------------|
| Hot | 7 days | SSD/NVMe | $0.10 |
| Warm | 30 days | Standard | $0.03 |
| Cold | 1 year | Archive | $0.004 |

### Bandwidth Requirements

| Flow | Calculation | Bandwidth |
|------|-------------|-----------|
| **Video Output** | 10M x 50MB / 86400s | ~58 Gbps |
| **CDN Egress** | 58 Gbps x 5 (fan-out) | ~290 Gbps |
| **Inter-GPU (tensor parallel)** | 2,400 pods x 100 Gbps NVLink | Internal |
| **Checkpoint Storage** | 15K x 500MB / 60s | ~1 Gbps |

---

## SLOs and SLAs

### Service Level Objectives by Tier

| Tier | Availability | Queue Wait | E2E Latency (10s video) | Success Rate |
|------|--------------|------------|------------------------|--------------|
| **Premium** | 99.95% | <30s (p95) | <60s (p95) | 99.5% |
| **Standard** | 99.9% | <5min (p95) | <90s (p95) | 99% |
| **Free/Relax** | 99.5% | <15min (p95) | <3min (p95) | 98% |

### Content Safety SLOs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Pre-gen block rate (harmful prompts)** | >99% | Blocked / total harmful |
| **Post-gen detection rate (NSFW)** | >99.5% | Detected / total NSFW |
| **Deepfake detection rate** | >98% | Detected / total deepfakes |
| **False positive rate** | <2% | Wrongly blocked / total safe |
| **Safety check latency** | <500ms | P95 |

### SLA Comparison

| Metric | Premium SLA | Standard SLA | Notes |
|--------|-------------|--------------|-------|
| Monthly uptime | 99.95% | 99.9% | Credits for breach |
| Max queue time | 60s | 10min | Guaranteed |
| Generation timeout | 10min | 15min | Auto-retry |
| Support response | 1 hour | 24 hours | Business hours |
| Refund policy | Failed generations | Failed generations | Automatic credit |

---

## Cost Model

### GPU Cost per Video Second

| GPU Type | Hourly Cost | Cost per 10s Video | Notes |
|----------|-------------|-------------------|-------|
| H100 80GB | $3.00/hr | $0.0375 | 45s generation |
| A100 80GB | $1.50/hr | $0.019 | 90s generation |
| L40S 48GB | $0.80/hr | $0.01 | Limited to 720p |

**Cost Breakdown (10s 1080p video on H100):**

| Component | Time | Cost |
|-----------|------|------|
| DiT inference | 35s | $0.029 |
| VAE decoding | 5s | $0.004 |
| Audio generation | 3s | $0.003 |
| Safety + transcoding | 2s | $0.002 |
| **Total compute** | 45s | **$0.038** |
| Storage (30 days) | - | $0.002 |
| CDN delivery | - | $0.005 |
| **Total cost** | - | **$0.045** |

### API Pricing Model (Per-Second)

| Tier | Resolution | Price/Second | 10s Video |
|------|------------|--------------|-----------|
| **Standard** | 720p | $0.10 | $1.00 |
| **Standard** | 1080p | $0.20 | $2.00 |
| **Standard** | 4K | $0.50 | $5.00 |
| **Premium** | 720p | $0.15 | $1.50 |
| **Premium** | 1080p | $0.40 | $4.00 |
| **Premium** | 4K | $0.75 | $7.50 |
| **Audio add-on** | Any | +$0.05/sec | +$0.50 |

**Margin Analysis:**
- Cost: $0.045 per 10s 1080p
- Standard price: $2.00
- Gross margin: ~98%
- After infrastructure overhead (~50%): ~48% net margin

### Monthly Cost at Scale

| Category | Calculation | Monthly Cost |
|----------|-------------|--------------|
| **GPU compute** | 19,000 H100 x $3/hr x 720hr x 70% util | $29M |
| **Storage (hot)** | 500TB x 7 days x $0.10 | $350K |
| **Storage (warm)** | 2PB x $0.03 | $60K |
| **CDN egress** | 15PB x $0.02 | $300K |
| **Networking** | - | $500K |
| **Safety services** | 300M checks x $0.001 | $300K |
| **Total** | - | **~$30.5M** |

### Cost Optimization Strategies

| Strategy | Savings | Trade-off |
|----------|---------|-----------|
| **TurboDiffusion (4 steps)** | 80% GPU cost | Slight quality reduction |
| **Spot instances (relax tier)** | 60% GPU cost | Potential interruption |
| **Model quantization (INT8)** | 30% VRAM | Minimal quality impact |
| **Aggressive checkpointing** | Reduce retries | Storage cost |
| **Regional tiering** | 20% CDN cost | Latency variation |
| **Cold storage archival** | 90% storage | Access latency |
