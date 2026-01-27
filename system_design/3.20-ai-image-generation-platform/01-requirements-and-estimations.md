# Requirements & Estimations

## Functional Requirements

### Core Generation Capabilities

| Feature | Description | Priority |
|---------|-------------|----------|
| **Text-to-Image** | Generate images from text prompts using diffusion models | P0 |
| **Image-to-Image** | Transform input images based on prompts (style transfer, variations) | P0 |
| **Inpainting** | Edit specific regions of images while preserving context | P1 |
| **Outpainting** | Extend images beyond original boundaries | P1 |
| **ControlNet** | Condition generation on structure (depth, pose, edges, etc.) | P0 |
| **LoRA Adapters** | Apply fine-tuned style/concept adapters to base models | P0 |
| **Multi-Resolution** | Support 512, 768, 1024, and upscaling to 2K/4K | P0 |
| **Batch Generation** | Generate multiple variations from single prompt | P1 |
| **Negative Prompts** | Specify elements to avoid in generation | P0 |
| **Seed Control** | Reproducible generation with explicit seeds | P0 |

### Generation Modes (Inspired by Midjourney)

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Turbo** | Highest priority queue, accelerated models (LCM), 2x GPU cost | Time-critical, premium users |
| **Fast** | Standard priority, optimized sampling (30 steps) | Default for paid users |
| **Relax** | Background queue, standard sampling (50 steps) | Free tier, batch processing |

### Model Support

| Model Family | Versions | Text Encoders |
|--------------|----------|---------------|
| Stable Diffusion 1.x | SD 1.5, variants | CLIP ViT-L |
| Stable Diffusion XL | SDXL 1.0, Turbo | CLIP + OpenCLIP |
| Stable Diffusion 3 | SD3 Medium, SD3.5 Large | CLIP + T5-XXL |
| Flux | Flux Dev, Flux Schnell | CLIP + T5-XXL |

### Prompt Processing

| Feature | Description |
|---------|-------------|
| **Prompt Weighting** | Support for emphasis syntax: `(word:1.5)` |
| **Style Presets** | Pre-configured style vectors (cinematic, anime, photorealistic) |
| **Prompt Templates** | Structured prompt building with placeholders |
| **Multi-Language** | Translation to English before encoding |
| **Prompt Length** | Up to 77 tokens (CLIP) + 512 tokens (T5) |

### Out of Scope

| Feature | Reason |
|---------|--------|
| Model Training/Fine-tuning | Separate MLOps system |
| Video Generation | Different architecture (temporal models) |
| 3D Asset Generation | Specialized rendering pipeline |
| Real-time Streaming | Batch-oriented design |
| Custom Model Upload | Security and resource concerns |

---

## Non-Functional Requirements

### Performance Requirements

| Requirement | Target | Justification |
|-------------|--------|---------------|
| **Turbo E2E Latency** | <10s p95 | Premium user expectation |
| **Fast E2E Latency** | <25s p95 | Competitive with Midjourney |
| **Relax E2E Latency** | <5min p95 | Background processing acceptable |
| **Queue Wait (Turbo)** | <2s p95 | Near-instant processing |
| **Queue Wait (Fast)** | <10s p95 | Reasonable wait for queue |
| **Throughput** | 1000 images/min | Cost efficiency at scale |

### Reliability Requirements

| Requirement | Target | Justification |
|-------------|--------|---------------|
| **Availability** | 99.9% | Three 9s for consumer service |
| **Request Success Rate** | 99.5% | Allow for occasional failures |
| **Data Durability** | 99.99% | Generated images preserved |
| **Recovery Time** | <30s | Fast worker replacement |

### Consistency Model

| Aspect | Model | Justification |
|--------|-------|---------------|
| **Generation** | Eventually consistent | Async processing acceptable |
| **Queue Position** | Strongly consistent | Users expect accurate position |
| **Safety Decisions** | Strongly consistent | Safety must not be bypassed |
| **Billing/Usage** | Strongly consistent | Financial accuracy required |

### CAP Theorem Choice

**AP (Availability + Partition Tolerance)** for generation pipeline:
- Prioritize accepting requests during network partitions
- Queue can buffer during transient failures
- Generation is idempotent (can retry safely)

**CP (Consistency + Partition Tolerance)** for safety and billing:
- Never allow unsafe content during partitions
- Billing must be accurate even during failures

---

## Capacity Estimations

### Reference Scenario

**Consumer Image Platform (Midjourney-scale):**
- 10 million active users
- Average 5 images per active user per month
- Peak hours: 3x average load
- Model mix: 70% SDXL, 20% SD3, 10% Flux

### Traffic Estimations

| Metric | Calculation | Value |
|--------|-------------|-------|
| Monthly images | 10M users × 5 images | 50M images/month |
| Daily average | 50M / 30 | ~1.7M images/day |
| Average QPS | 1.7M / 86,400 | ~20 images/sec |
| Peak QPS (3x) | 20 × 3 | ~60 images/sec |
| Peak images/hour | 60 × 3600 | ~216K images/hour |

### VRAM Requirements by Configuration

| Configuration | Base | Adapters | Workspace | Total | GPU Type |
|---------------|------|----------|-----------|-------|----------|
| SD 1.5 base | 4 GB | - | 2 GB | 6 GB | A10G |
| SDXL base | 8 GB | - | 4 GB | 12 GB | A10G |
| SDXL + 2 LoRAs | 8 GB | 0.4 GB | 4 GB | 12.4 GB | A10G |
| SDXL + ControlNet | 8 GB | 3 GB | 4 GB | 15 GB | A10G |
| SDXL + CN + LoRA | 8 GB | 3.2 GB | 4 GB | 15.2 GB | A10G/A100 |
| SD3 Medium | 12 GB | - | 4 GB | 16 GB | A100 |
| Flux Dev | 16 GB | - | 6 GB | 22 GB | A100 |
| Flux + ControlNet | 16 GB | 4 GB | 6 GB | 26 GB | A100 |

### Generation Time by Configuration

| Configuration | Steps | A100 Time | A10G Time |
|---------------|-------|-----------|-----------|
| SDXL standard | 50 | 10s | 25s |
| SDXL fast | 30 | 6s | 15s |
| SDXL + LCM | 4 | 0.8s | 2s |
| SDXL + ControlNet | 50 | 12s | 30s |
| SD3 Medium | 30 | 8s | 20s |
| Flux Dev | 30 | 15s | 40s |
| Flux Schnell | 4 | 3s | 8s |

### GPU Fleet Sizing

**Assumptions:**
- Average generation time: 12s (weighted by model mix)
- GPU utilization target: 70%
- Fast tier: 60% of traffic, Relax: 30%, Turbo: 10%

| Tier | QPS Share | Avg Gen Time | GPUs Needed |
|------|-----------|--------------|-------------|
| Turbo | 6/sec | 3s | 6 × 3 / 0.7 = ~26 GPUs |
| Fast | 36/sec | 10s | 36 × 10 / 0.7 = ~514 GPUs |
| Relax | 18/sec | 15s | 18 × 15 / 0.7 = ~386 GPUs |
| **Total Peak** | | | **~930 GPUs** |

**With warm pool overhead (20% idle for instant dispatch):**
- Production fleet: ~1,100 GPUs for peak
- Cost optimization: Scale down to 300 GPUs during off-peak

### Storage Requirements

| Data Type | Size per Image | Daily Volume | Monthly Volume | Retention |
|-----------|---------------|--------------|----------------|-----------|
| Generated PNG | 2-5 MB | 5 TB | 150 TB | 30 days |
| Generated WebP | 0.5-1 MB | 1.5 TB | 45 TB | Permanent (user gallery) |
| Latent cache | 200 KB | 350 GB | 10 TB | 7 days (variations) |
| Prompt metadata | 1 KB | 1.7 GB | 50 GB | Permanent |
| Audit logs | 0.5 KB | 850 MB | 25 GB | 1 year |

**Year 1 Storage Estimate:**
- Hot storage (recent): ~200 TB
- Warm storage (archive): ~500 TB
- Cold storage (compliance): ~50 TB

### Bandwidth Requirements

| Flow | Per Image | Daily Volume | Peak Bandwidth |
|------|-----------|--------------|----------------|
| API request | 5 KB | 8.5 GB | ~1 Mbps |
| Model loading (cold) | 10 GB | Minimal | Burst to 100 Gbps |
| Image upload to storage | 3 MB | 5 TB | ~500 Mbps |
| CDN egress | 1 MB | 1.7 TB | ~200 Mbps |

---

## SLOs and SLAs

### Service Level Objectives

| Metric | Turbo Tier | Fast Tier | Relax Tier | Measurement |
|--------|------------|-----------|------------|-------------|
| **E2E Latency p50** | <5s | <15s | <60s | Request to image URL |
| **E2E Latency p95** | <10s | <25s | <5min | Request to image URL |
| **E2E Latency p99** | <15s | <40s | <10min | Request to image URL |
| **Availability** | 99.99% | 99.9% | 99% | Successful requests / total |
| **Error Rate** | <0.1% | <0.5% | <2% | Failed requests / total |
| **Queue Fairness** | - | - | >80% within SLO | Prevent starvation |

### Content Safety SLOs

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **NSFW False Negative** | <0.1% | >0.5% triggers review |
| **NSFW False Positive** | <3% | >10% triggers tuning |
| **CSAM Detection** | 100% | Any miss is critical |
| **Prompt Block Accuracy** | >95% | <90% triggers review |
| **Safety Check Latency** | <200ms p95 | <500ms p99 |

### Tier Comparison

| Capability | Free (Relax) | Basic (Fast) | Pro (Turbo) | Enterprise |
|------------|--------------|--------------|-------------|------------|
| Queue Priority | Lowest | Standard | Highest | Dedicated |
| Daily Limit | 50 images | 500 images | 2000 images | Unlimited |
| Max Resolution | 1024 | 1024 | 2048 | 4096 |
| LoRA Stacking | 1 | 2 | 4 | Unlimited |
| ControlNet | No | Yes | Yes | Yes |
| API Access | No | Limited | Full | Full |
| SLA | None | 99.9% | 99.99% | Custom |

---

## Cost Model

### GPU Cost per Image

| Configuration | GPU Type | Time | Cost/Hour | Cost/Image |
|---------------|----------|------|-----------|------------|
| SDXL standard | A10G | 25s | $1.00 | $0.007 |
| SDXL standard | A100 | 10s | $3.00 | $0.008 |
| SDXL + LCM | A10G | 2s | $1.00 | $0.0006 |
| SDXL + ControlNet | A100 | 12s | $3.00 | $0.010 |
| Flux Schnell | A100 | 3s | $3.00 | $0.0025 |

### Monthly Cost at Scale (1M images/day)

| Component | Calculation | Monthly Cost |
|-----------|-------------|--------------|
| GPU compute | 1M × $0.008 × 30 | $240,000 |
| Storage (hot) | 50 TB × $0.023/GB | $1,150 |
| Storage (warm) | 150 TB × $0.0125/GB | $1,875 |
| CDN egress | 30 TB × $0.085/GB | $2,550 |
| Safety API | 1M × $0.001 | $30,000 |
| **Total** | | **~$275,000/month** |

### Cost Optimization Strategies

| Strategy | Savings | Trade-off |
|----------|---------|-----------|
| Spot instances for Relax tier | 60-70% | Occasional preemption |
| LCM/Turbo models | 80% | Slightly lower quality |
| Batch processing | 30% | Higher latency |
| Regional pricing | 20-40% | Latency increase |
| Reserved capacity | 30-50% | Commitment required |
