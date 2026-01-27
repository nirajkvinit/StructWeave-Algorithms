# Interview Guide

## Interview Pacing (45-minute format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| 0-5 min | **Clarify** | Use case, scale, latency, model types | Ask 3-5 targeted questions |
| 5-15 min | **High-Level** | Core architecture, queue system, GPU orchestration | Draw clear diagram |
| 15-30 min | **Deep Dive** | Pick: GPU warm pool OR diffusion optimization OR content safety | Show depth |
| 30-40 min | **Scale & Reliability** | Bottlenecks, fault tolerance, multi-region | Trade-offs matter |
| 40-45 min | **Wrap Up** | Summary, questions, what you'd do next | Leave strong impression |

---

## Phase 1: Clarification Questions (0-5 min)

### Essential Questions to Ask

```
1. "What's the primary use case - consumer app like Midjourney, or API service?"
   → Consumer: Focus on queue fairness, UX, Discord-style interface
   → API: Focus on latency SLOs, throughput, developer experience

2. "What models do we need to support?"
   → SDXL only: Simpler warm pool, well-understood VRAM
   → Multi-model (SDXL, SD3, Flux): Complex model management
   → Custom/fine-tuned: Need model registry design

3. "What's the scale target?"
   → 100 images/min: Single region, modest GPU pool (~20 GPUs)
   → 10,000 images/min: Multi-region, sophisticated scheduling (~300+ GPUs)

4. "Are there content restrictions?"
   → PG-13 default: Full safety pipeline (pre + post generation)
   → Adult content tier: Age verification, separate infrastructure
   → Enterprise: Custom policies

5. "What's the latency requirement for paid users?"
   → <10 seconds: Need warm pool, possibly LCM acceleration
   → <1 minute: Standard queue acceptable
   → Batch processing: Different architecture entirely
```

### What Clarifications Reveal

| Question | If Answer Is... | Design Implication |
|----------|-----------------|-------------------|
| Consumer vs API | Consumer | Multi-tier queue (Fast/Relax), progress updates |
| Consumer vs API | API | SLA guarantees, webhook delivery, idempotency |
| Scale | Small (<100 img/min) | Single region, simpler queue |
| Scale | Large (>1000 img/min) | Multi-region, sophisticated GPU orchestration |
| Models | Single (SDXL) | Simpler warm pool, predictable VRAM |
| Models | Multiple | Complex model switching, variable requirements |

---

## Phase 2: High-Level Design (5-15 min)

### Architecture Sketch

```
┌─────────────────────────────────────────────────────────────────┐
│                    Image Generation Architecture                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌───────────────┐     ┌─────────────────┐ │
│  │ API Gateway │────▶│ Prompt Safety │────▶│  Queue Manager  │ │
│  │  + Auth     │     │ + Encoding    │     │ (Turbo/Fast/    │ │
│  │  + Rate     │     │ (CLIP + T5)   │     │  Relax)         │ │
│  └─────────────┘     └───────────────┘     └────────┬────────┘ │
│                                                      │          │
│                                             ┌────────▼────────┐ │
│                                             │  GPU Worker     │ │
│                                             │  Pool           │ │
│                                             │ (Warm/Cold)     │ │
│                                             └────────┬────────┘ │
│                                                      │          │
│  ┌─────────────┐     ┌───────────────┐     ┌────────▼────────┐ │
│  │    CDN      │◀────│ Safety Check  │◀────│   Diffusion     │ │
│  │ + Storage   │     │ + Watermark   │     │   Engine        │ │
│  └─────────────┘     └───────────────┘     └─────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Key Points to Mention:
1. Multi-tier queue (Turbo/Fast/Relax) with fairness
2. GPU warm pool to avoid cold start latency (10-30s)
3. Pre AND post generation safety checks
4. Async processing with webhook/polling for results
5. CDN for global image delivery (images are MB-scale)
```

### Key Components to Explain

| Component | What to Say | Why It Matters |
|-----------|-------------|----------------|
| **API Gateway** | "Auth, rate limiting by tier, prompt validation" | Security, fairness |
| **Prompt Processor** | "CLIP and T5 encoding, pre-gen safety check" | Save GPU cost by blocking early |
| **Queue Manager** | "Three tiers with weighted fair scheduling, starvation prevention" | User experience, SLA guarantees |
| **GPU Pool** | "Warm pool for popular models, cold pool for rare ones" | Latency is critical |
| **Diffusion Engine** | "Multi-step denoising, CFG, LoRA/ControlNet composition" | Core generation logic |
| **Safety Pipeline** | "Post-gen NSFW/CSAM check, watermarking" | Compliance, trust |
| **CDN** | "Global distribution, format optimization (WebP)" | Large binary delivery |

### Architecture Pattern Decisions

| Decision | Choice | Justification |
|----------|--------|---------------|
| Sync vs Async | **Async** with polling/webhook | Generation takes 5-60s |
| Push vs Pull | **Pull** (client polls) + optional webhook | Client controls frequency |
| Stateless vs Stateful | **Stateful workers** | GPU models in memory |
| Write vs Read Heavy | **Write heavy** | Every request creates new data |

---

## Phase 3: Deep Dive Options (15-30 min)

### Option A: GPU Warm Pool Management

**What to Cover:**

1. **Why it matters** - Cold start is 15-30 seconds, unacceptable for users
2. **Tiered strategy** - Always hot (SDXL), frequently used (SD3, Flux), on-demand
3. **VRAM budget** - How to fit model + adapters + workspace
4. **Fragmentation** - Why it happens, how to detect and fix
5. **Predictive loading** - Using queue analysis to pre-load models

**Key Numbers:**
```
SDXL VRAM:          10-12 GB (resolution dependent)
LoRA overhead:      100-200 MB each
ControlNet:         2-4 GB per module
Cold load time:     10-15 seconds (SDXL UNet)
Warm generation:    8-10 seconds (30 steps)

VRAM Budget (A100 80GB):
- Base model:       10 GB
- Text encoders:    4 GB
- VAE:              2 GB
- LoRA workspace:   2 GB
- ControlNet:       4 GB
- Latents:          8 GB
- Safety models:    4 GB
- Overhead:         6 GB
Total: ~40 GB used, 40 GB margin
```

**Diagram to Draw:**
```
Warm Pool Strategy:
┌─────────────────────────────────────────┐
│ Tier 1 (Always Hot)                     │
│ SDXL base + top 5 LoRAs - 20 GPUs      │
├─────────────────────────────────────────┤
│ Tier 2 (Frequently Used)                │
│ SD3, Flux Schnell - 10 GPUs each       │
├─────────────────────────────────────────┤
│ Tier 3 (On-Demand)                      │
│ Rare models - load when needed         │
├─────────────────────────────────────────┤
│ Cold Pool (Spot instances for overflow) │
└─────────────────────────────────────────┘
```

### Option B: Diffusion Pipeline Optimization

**What to Cover:**

1. **Multi-step denoising** - 20-50 steps typical, each ~200ms on A100
2. **CFG (Classifier-Free Guidance)** - What it is, why 7.5 is common
3. **Scheduler selection** - DDIM vs DPM++ vs Euler vs LCM
4. **Acceleration techniques** - LCM-LoRA (4 steps), torch.compile, Flash Attention
5. **DistriFusion** - Multi-GPU for high-resolution

**Key Formula:**
```
Generation Time ≈ Steps × Per-Step-Time × CFG-Overhead × Resolution-Factor

Example (SDXL 1024x1024, 30 steps, A100):
= 30 × 200ms × 1.1 (CFG batches uncond+cond)
≈ 6.6 seconds (diffusion only)
+ 0.5s (VAE decode)
= ~7 seconds total generation
```

**Step vs Quality Trade-off:**
```
Steps  Quality  Time    Use Case
──────────────────────────────────
4      70%      0.8s    Previews (LCM)
20     85%      4s      Fast iteration
30     92%      6s      Standard
50     98%      10s     High quality
```

### Option C: Content Safety Pipeline

**What to Cover:**

1. **Pre-generation** - Blocklist, PromptGuard classifier, entity recognition
2. **Post-generation** - NSFW multi-class, violence, CSAM (zero tolerance)
3. **Trade-offs** - False positive (user frustration) vs false negative (harm)
4. **Watermarking** - Stable Signature, C2PA manifests
5. **Compliance** - EU AI Act, NCMEC reporting

**Key Stats:**
```
PromptGuard attack bypass rate: 2.35%
NSFW classifier accuracy:       ~97%
CSAM false negative target:     <0.001%
Midjourney policy:              PG-13, algorithmic + human review
```

**Pipeline Diagram:**
```
Pre-Gen Safety (CPU, ~15ms):
├── Blocklist matching
├── PromptGuard classifier
└── Entity recognition (celebs, minors)

Generation (GPU, 6-30s):
└── [Diffusion process]

Post-Gen Safety (GPU/CPU, ~150ms):
├── NSFW classifier (multi-class)
├── Violence detection
├── CSAM scanner (PhotoDNA)
└── Watermark embedding
```

---

## Trap Questions & Best Answers

### Trap 1: "Why not just use more GPUs to make it faster?"

**Bad Answer:** "More GPUs = faster, just add more"

**Good Answer:**
> "Unlike LLM inference, image generation doesn't easily parallelize within a single request. Each denoising step depends on the previous step's output - you can't run step 10 before step 9 completes.
>
> For a single request, more GPUs help only for very high-resolution images (DistriFusion splits spatial patches). For standard 1024x1024, adding GPUs increases **throughput** (more concurrent requests) not **latency** per request.
>
> To reduce latency, we use: LCM-LoRA (fewer steps), better schedulers (DPM++), model quantization, and torch.compile. Not more GPUs per request."

### Trap 2: "How is this different from LLM inference?"

**Bad Answer:** "It's similar, just images instead of tokens"

**Good Answer:**
> "Key differences:
>
> 1. **Memory pattern**: Image generation has fixed VRAM per request (resolution-dependent). LLMs have variable memory that grows with KV cache as context increases.
>
> 2. **Execution model**: Diffusion is multi-step denoising where all steps must complete (can't stream partial results). LLMs are autoregressive and can stream tokens.
>
> 3. **Model composition**: Image generation typically combines base model + LoRA adapters + ControlNet + VAE. LLMs usually serve a single model.
>
> 4. **Batching**: Limited by VRAM - maybe 2-4 images per batch. LLMs use continuous batching with hundreds of sequences.
>
> 5. **Output size**: Images are 1-10 MB binaries requiring CDN. LLM outputs are text tokens (KB)."

### Trap 3: "Can you just block all unsafe content at the prompt level?"

**Bad Answer:** "Yes, we can filter prompts effectively before generation"

**Good Answer:**
> "Prompt-level filtering catches obvious cases but has significant limitations:
>
> 1. **Jailbreaks**: Creative prompt engineering can bypass blocklists ('unclothed' instead of 'nude')
>
> 2. **Implicit content**: 'Person in bedroom' is innocent prompt but might generate inappropriate content
>
> 3. **Visual-only issues**: Bias, stereotypes, composition problems only visible in the image, not the prompt
>
> 4. **Model behavior**: Models can hallucinate inappropriate content even from benign prompts
>
> We need **both** pre-generation (prompt) and post-generation (image) safety checks. Pre-gen saves GPU cost by blocking obvious violations; post-gen catches visual issues the prompt doesn't reveal."

### Trap 4: "Why have multiple tiers (Fast/Relax) instead of one queue?"

**Bad Answer:** "It's just for pricing differentiation"

**Good Answer:**
> "Multi-tier queues solve several problems:
>
> 1. **Economic sustainability**: Paid users expect better service and fund the infrastructure
>
> 2. **Capacity management**: Relax tier absorbs overflow without impacting paid users during peaks
>
> 3. **Resource optimization**: Relax can batch process during off-peak hours on the same GPUs
>
> 4. **Fairness**: Without tiers, heavy users would crowd out everyone else
>
> The key is **weighted fair scheduling with starvation prevention**. We give higher weight to Turbo/Fast but guarantee minimum throughput for Relax. If Relax requests wait too long (>5 min), they get promoted. This ensures even free users eventually get served."

### Trap 5: "What if the safety model fails or is unavailable?"

**Bad Answer:** "We cache results" or "We have fallbacks"

**Good Answer:**
> "Safety is non-negotiable, so we have several strategies:
>
> 1. **Circuit breaker**: If safety API fails repeatedly, we stop accepting new generations (fail closed, not open)
>
> 2. **Queue buffering**: Requests in 'pending_safety' state wait until safety is available
>
> 3. **Multi-region**: Safety API is deployed in multiple regions with failover
>
> 4. **Degraded mode**: For transient failures, we might increase safety thresholds (more conservative) rather than disable
>
> We **never** skip safety checks entirely. For CSAM specifically, if we can't verify an image is safe, it doesn't get delivered. The legal and ethical risk is too high."

---

## Key Numbers to Memorize

| Category | Metric | Value |
|----------|--------|-------|
| **Generation** | SDXL 1024x1024, 50 steps, A100 | ~10 seconds |
| | SDXL 1024x1024, 30 steps, A100 | ~6 seconds |
| | LCM-LoRA, 4 steps, A100 | ~0.8 seconds |
| | SDXS/Turbo, 1 step | ~10 ms |
| **VRAM** | SDXL base model | 8-12 GB |
| | Text encoders (CLIP + T5) | 2-4 GB |
| | ControlNet module | 2-4 GB |
| | LoRA adapter | 100-200 MB |
| **Loading** | SDXL UNet cold load | 10-15 seconds |
| | Full cold start | 15-30 seconds |
| | LoRA hot swap | 0.5-2 seconds |
| **Safety** | PromptGuard bypass rate | 2.35% |
| | NSFW classifier accuracy | ~97% |
| | Safety check latency | ~150 ms |
| **CFG** | Typical guidance scale | 7.0-8.0 |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Say Instead |
|---------|----------------|---------------------|
| Treating it like LLM inference | Different memory, execution, and batching patterns | Explain the differences explicitly |
| Ignoring model composition | LoRA + ControlNet dramatically increases complexity | Discuss VRAM budget and composition |
| Underestimating cold start | 15-30s latency is unacceptable | Explain warm pool strategy |
| Single-layer safety | Need both prompt AND image classification | Describe multi-layer pipeline |
| Ignoring fairness | Paid tiers must not completely starve free | Discuss weighted scheduling + starvation prevention |
| Forgetting image delivery | Output is MB-scale binaries | Mention CDN strategy |
| Not mentioning provenance | Watermarking increasingly required | Discuss Stable Signature, C2PA |
| Over-engineering day 1 | Don't design for 1000x scale immediately | Start with 10x, plan for 100x |

---

## Sample Interview Walkthrough

### Interviewer: "Design an image generation platform like Midjourney serving 1 million images per day."

**Minutes 0-5 (Clarify):**
> "Let me understand the requirements. A few questions:
>
> First, 1M images/day means about 12 images per second average, probably 50/s at peak. Is this consumer-facing like Midjourney's Discord interface, or an API service for developers?
>
> Second, what models should we support - just SDXL, or multiple like SD3 and Flux?
>
> Third, what latency do paid users expect - under 15 seconds, or is longer acceptable?
>
> Fourth, content policy - PG-13 default like Midjourney, or different tiers?
>
> *[Assume answers: Consumer-facing, multiple models, <15s for paid, PG-13]*
>
> Got it. So consumer app, multi-model, <15s latency for paid users, PG-13 content policy."

**Minutes 5-15 (High-Level):**
> "The architecture has six key components:
>
> **[Draw diagram while explaining]**
>
> 1. **API Gateway** - Auth, rate limiting by subscription tier, request validation
>
> 2. **Prompt Pipeline** - CLIP and T5 text encoding, pre-generation safety check to block obvious violations and save GPU cost
>
> 3. **Queue Manager** - Three tiers: Turbo (premium), Fast (paid), Relax (free). Weighted fair scheduling prevents starvation.
>
> 4. **GPU Worker Pool** - Warm pool with SDXL/SD3/Flux pre-loaded to avoid 15-30 second cold starts. This is critical for meeting <15s latency.
>
> 5. **Diffusion Engine** - Multi-step denoising with CFG, supports LoRA adapters and ControlNet for customization
>
> 6. **Delivery Pipeline** - Post-gen safety check (NSFW, CSAM), watermarking for provenance, CDN upload
>
> The key insight is that unlike LLM inference, image generation has fixed VRAM per request but variable queue wait. We optimize for warm model hits to minimize latency."

**Minutes 15-30 (Deep Dive on Warm Pool):**
> "Let me deep dive on GPU warm pool management since it's critical for the <15s latency target.
>
> **The Problem:** Cold loading SDXL takes 10-15 seconds - just the model loading, before any generation. That's most of our latency budget gone.
>
> **Solution: Tiered Warm Pool**
> - **Tier 1 (Always Hot)**: SDXL base + top 5 most popular LoRAs, pre-merged. About 20 GPUs. Never evicted.
> - **Tier 2 (Frequently Used)**: SD3, Flux Schnell. About 10 GPUs each. LRU eviction with high priority.
> - **Tier 3 (On-Demand)**: Rare models, custom LoRAs. Load when needed, accept cold start.
>
> **VRAM Budget on A100 80GB:**
> SDXL base takes 10GB. Add text encoders (4GB), VAE (2GB), LoRA workspace (2GB), ControlNet reserve (4GB), latent workspace (8GB), safety models (4GB), and overhead (6GB). That's about 40GB, leaving 40GB margin for fragmentation and spikes.
>
> **Fragmentation Challenge:** When we load/unload LoRAs and ControlNets repeatedly, memory fragments. We might have 10GB free total but no single 8GB contiguous block. We schedule defragmentation during low-traffic periods - unload everything, clean up, reload in optimal order.
>
> **Predictive Loading:** Analyze queue to predict which models will be needed. If we see SD3 requests queuing, proactively load SD3 on idle workers before they're assigned."

**Minutes 30-40 (Scale & Reliability):**
> "For 1M images/day with 50/s peaks, let me size the infrastructure:
>
> **GPU Fleet:** Average generation is ~12 seconds (weighted by model mix). At 50 QPS peak with 70% utilization target: 50 × 12 / 0.7 ≈ 860 GPUs at peak. With warm pool overhead, about 1000 GPUs. Cost optimization: Use A10G for standard SDXL (cheaper), A100 for complex compositions and Flux.
>
> **Multi-Region:** Deploy in US-West (primary), US-East, EU-West. Route users to nearest region. CDN handles image delivery globally.
>
> **Reliability:**
> - Worker health checks every 10 seconds
> - Request retry on worker failure (max 3 retries)
> - Circuit breaker on model loading failures
> - Safety API failover with queue buffering if unavailable
>
> **Key Trade-offs:**
> 1. **Warm pool size vs cost**: More warm = faster but more idle GPUs
> 2. **Pre-gen vs post-gen safety**: Pre-gen saves GPU but catches less
> 3. **Queue fairness**: Balance paid priority with free tier service"

**Minutes 40-45 (Wrap Up):**
> "To summarize key trade-offs:
>
> 1. **Warm pool size**: We'll start with covering 80% of traffic in warm pool, monitor cache hit rate, adjust
>
> 2. **Multi-tier queue**: Weighted scheduling with starvation prevention ensures both paid users get priority and free users get served
>
> 3. **Safety pipeline**: Dual-layer (pre + post) is necessary; single layer can't catch everything
>
> **What I'd do next:**
> - Detailed capacity model with cost analysis
> - Define exact SLOs per tier
> - Design model registry and versioning
> - Plan safety classifier training pipeline
>
> **Questions for you:**
> - What's the user growth trajectory?
> - Any plans for video generation (different architecture)?
> - Geographic distribution of users?"

---

## Quick Reference Card

```
+-----------------------------------------------------------------------+
|        AI IMAGE GENERATION - INTERVIEW QUICK REFERENCE                 |
+-----------------------------------------------------------------------+
|                                                                       |
|  KEY DIFFERENTIATORS VS LLM:                                          |
|  • Fixed VRAM per generation (not growing KV cache)                   |
|  • Multi-step denoising (not autoregressive tokens)                   |
|  • Model composition (Base + LoRA + ControlNet + VAE)                 |
|  • MB-scale binary output (needs CDN)                                 |
|                                                                       |
|  CRITICAL NUMBERS:                                                    |
|  • SDXL generation: 10s (50 steps), 6s (30 steps)                    |
|  • LCM-LoRA: 0.8s (4 steps)                                          |
|  • SDXL VRAM: 10-12 GB                                               |
|  • Cold start: 15-30 seconds (MUST AVOID)                            |
|  • CFG scale: 7.0-8.0 typical                                        |
|                                                                       |
|  WARM POOL TIERS:                                                     |
|  • Tier 1: Always hot (SDXL + popular LoRAs)                         |
|  • Tier 2: Frequently used (SD3, Flux)                               |
|  • Tier 3: On-demand (rare models)                                   |
|                                                                       |
|  QUEUE STRATEGY:                                                      |
|  • Turbo (weight 10) → Fast (weight 5) → Relax (weight 1)           |
|  • Starvation prevention: Promote after max wait                     |
|  • Reserved capacity per tier                                        |
|                                                                       |
|  SAFETY PIPELINE:                                                     |
|  • Pre-gen: Blocklist + PromptGuard + Entity check                  |
|  • Post-gen: NSFW + Violence + CSAM + Watermark                     |
|  • Never skip safety (fail closed)                                   |
|                                                                       |
|  TRAP ANSWERS:                                                        |
|  • "More GPUs" → Helps throughput not latency (can't parallelize)   |
|  • "Same as LLM" → Fixed VRAM, multi-step, model composition        |
|  • "Block at prompt" → Need post-gen too (visual issues)            |
|  • "One queue" → Need fairness + economics + capacity management     |
|                                                                       |
+-----------------------------------------------------------------------+
```
