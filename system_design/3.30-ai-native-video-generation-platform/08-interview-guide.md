# Interview Guide

## Interview Pacing (45-minute format)

| Time | Phase | Focus |
|------|-------|-------|
| **0-5 min** | Clarify | Use case, scale, latency tier, quality requirements |
| **5-15 min** | High-Level | Core architecture, DiT choice, queue design |
| **15-30 min** | Deep Dive | Pick ONE: DiT architecture OR temporal consistency OR TurboDiffusion |
| **30-40 min** | Scale & Reliability | GPU orchestration, checkpointing, fault tolerance |
| **40-45 min** | Wrap Up | Summary, compliance considerations, questions |

---

## Phase 1: Clarification Questions

### Essential Questions to Ask

1. **Use Case**: "What type of videos are we generating - short social clips, professional content, or real-time previews?"

2. **Scale**: "What's the expected volume - hundreds, thousands, or millions of videos per day?"

3. **Latency Requirements**: "Is this real-time (<2s), standard (<1min), or can it be batch?"

4. **Quality vs Speed**: "Should we optimize for highest quality or fastest generation?"

5. **Audio**: "Do we need synchronized audio generation (speech, music, ambient)?"

6. **Compliance**: "Are there deepfake concerns or regulatory requirements (EU AI Act, DEFIANCE Act)?"

### What Clarifications Reveal

| Clarification | If Answer Is... | Architecture Impact |
|---------------|-----------------|---------------------|
| "Social clips, viral content" | Short, fast | Optimize for <30s videos, TurboDiffusion |
| "Professional/enterprise" | High quality | Cinema mode, 4K support, longer generation OK |
| "Millions per day" | Very high scale | Multi-region, auto-scaling critical |
| "Real-time interaction" | Sub-second | LTX-style real-time, streaming generation |
| "With voice/dialogue" | Native audio | Veo 3-style joint audio-visual generation |
| "Public figures content" | Compliance | Deepfake detection mandatory |

---

## Phase 2: High-Level Design

### Architecture Sketch

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     VIDEO GENERATION PLATFORM - HIGH LEVEL                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Users                                                                      │
│     │                                                                        │
│     ▼                                                                        │
│  ┌─────────────┐                                                             │
│  │ API Gateway │ ─── Auth, Rate Limit, Quota Check                          │
│  └──────┬──────┘                                                             │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────┐                                                         │
│  │ Prompt Pipeline │ ─── T5-XXL Encoding + Pre-gen Safety                   │
│  └────────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Long-Running Job Queue (Redis)                    │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                           │    │
│  │  │ Premium  │  │ Standard │  │  Free    │  + Fair Scheduler         │    │
│  │  └──────────┘  └──────────┘  └──────────┘  + Progress Manager       │    │
│  └─────────────────────────────┬───────────────────────────────────────┘    │
│                                │                                            │
│                                ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              GPU Cluster (H100 × N, Tensor Parallel)                 │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                   DiT Generation Engine                      │    │    │
│  │  │  Noise → DiT Blocks (28×) → Flow Matching → 3D VAE Decode   │    │    │
│  │  │         ↓                                                    │    │    │
│  │  │  Temporal Attention (TSAM) for frame coherence              │    │    │
│  │  │         ↓                                                    │    │    │
│  │  │  Checkpoint every 10 steps                                   │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────┬───────────────────────────────────────┘    │
│                                │                                            │
│                                ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Post-Processing                                   │    │
│  │  Safety Check → Deepfake Detection → C2PA Watermark → Transcode     │    │
│  └─────────────────────────────┬───────────────────────────────────────┘    │
│                                │                                            │
│                                ▼                                            │
│  ┌─────────────────┐     ┌─────────────┐                                    │
│  │  Video Storage  │────▶│    CDN      │────▶ Users                         │
│  └─────────────────┘     └─────────────┘                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Key Components to Explain

| Component | What to Say | Why It Matters |
|-----------|-------------|----------------|
| **DiT (not UNet)** | "Modern video uses Diffusion Transformers for better scaling and temporal modeling" | Shows awareness of current architectures |
| **3D VAE** | "Compress video in both spatial (8×) and temporal (4×) dimensions" | Explains memory efficiency |
| **Temporal Attention** | "TSAM ensures frame-to-frame consistency unlike independent frame generation" | Core differentiator from image gen |
| **Long-running Queue** | "Jobs take minutes, not seconds - need checkpoint recovery and progress streaming" | Shows understanding of operational challenges |
| **Tensor Parallelism** | "10B+ param models need 8 GPUs working together via NVLink" | Demonstrates scale awareness |
| **C2PA/Deepfake** | "Regulatory requirements mean we must watermark and detect manipulations" | Shows compliance awareness |

### Architecture Pattern Decisions

| Decision | Recommendation | Quick Justification |
|----------|----------------|---------------------|
| DiT vs UNet | **DiT** | Better scaling, native temporal attention |
| Flow Matching vs Diffusion | **Flow Matching** | Fewer steps, more stable |
| Full vs Causal Attention | **Depends** | Full for quality, causal for streaming |
| Sync vs Async | **Async (queue)** | Jobs too long for sync |
| Native vs Post-sync Audio | **Native** for premium | Better lip-sync quality |

---

## Phase 3: Deep Dive Options

### Option A: DiT Architecture for Video

**Key Points to Cover:**

1. **Patchification**: "Convert video to 3D patches - each patch is a small spatiotemporal cube"

2. **Positional Encoding**: "Separate spatial (learned) and temporal (sinusoidal) encodings"

3. **Attention Structure** (per block):
   - Spatial self-attention (within frame)
   - Temporal self-attention (across frames)
   - Cross-attention (text conditioning)
   - FFN with AdaLN (timestep conditioning)

4. **AdaLN-Zero**: "Adaptive layer norm conditions on timestep - learns scale/shift from t"

5. **Key Numbers**:
   - 10B parameters = 20GB weights (FP16)
   - 28 DiT blocks typical
   - 4096 hidden dimension
   - 32 attention heads

**Diagram to Draw:**

```
Input [B, T, H, W, C]
    ↓
Patchify [B, N, D]
    ↓
+Positional Encoding
    ↓
┌─────────────────────────┐
│ DiT Block (×28)         │
│ ├─ Spatial Self-Attn    │
│ ├─ Temporal Self-Attn   │
│ ├─ Cross-Attn (text)    │
│ └─ FFN + AdaLN(t)       │
└─────────────────────────┘
    ↓
Unpatchify [B, T, H, W, C]
```

---

### Option B: Temporal Consistency

**Key Points to Cover:**

1. **Why Temporal Matters**: "Independent frame generation causes flickering and identity drift"

2. **TSAM Mechanism**: "Each spatial position attends across ALL frames"

3. **Attention Patterns**:
   - Full: O(T²) - best quality, memory intensive
   - Causal: O(T) - enables streaming
   - Sliding Window + Anchors: O(T×W) - long videos

4. **Causal Convolutions in VAE**: "Decoder only sees past frames - no future leakage"

5. **Quality Metrics**: "VBench measures subject consistency, motion smoothness, flickering"

**Trade-off Discussion:**

| Approach | Memory | Quality | Streaming | Best For |
|----------|--------|---------|-----------|----------|
| Full | High (O(T²)) | Best | No | Short, high-quality |
| Causal | Medium | Good | Yes | Real-time |
| Sliding Window | Low | Good | Yes | Long form |

---

### Option C: TurboDiffusion / Real-time Generation

**Key Points to Cover:**

1. **Problem**: "50 steps × 700ms/step = 35s. Too slow for real-time"

2. **Solution: Progressive Distillation**:
   - Teacher (50 steps) trains Student (25 steps)
   - Repeat: 25 → 12 → 6 → 4 steps

3. **Key Techniques**:
   - **Step Distillation**: rCM (recurrent Consistency Models)
   - **Sparse-Linear Attention**: O(N) instead of O(N²)
   - **Quantization**: W8A8 for 2× speedup

4. **Results**: "100-200× speedup - 5s video in 1.9s on RTX 5090"

5. **Trade-off**: "~93% quality of full diffusion - acceptable for previews"

**Performance Table:**

| Configuration | Steps | Time | Quality |
|---------------|-------|------|---------|
| Baseline | 50 | 45s | 100% |
| TurboDiffusion | 4 | 1.9s | 93% |
| Speedup | - | **24×** | -7% |

---

## Trap Questions & Best Answers

### Trap 1: "Why not just generate frames independently?"

**What Interviewer Wants:** Understanding of temporal consistency challenges

**Best Answer:**
> "Independent frame generation causes three problems: (1) **Flickering** - small variations between frames create visible jitter, (2) **Identity drift** - characters' faces change subtly over time, (3) **Motion incoherence** - movements don't follow physical laws.
>
> Temporal attention (TSAM) solves this by letting each spatial position attend across all frames, ensuring the same object looks consistent. The 3D VAE also helps by compressing temporal information into the latent space, preserving motion patterns."

---

### Trap 2: "How is this different from image generation at scale?"

**What Interviewer Wants:** Deep understanding of video-specific challenges

**Best Answer:**
> "Five key differences:
> 1. **3D vs 2D latent space** - Video adds temporal dimension, increasing memory significantly
> 2. **Temporal attention** - O(T²) complexity vs single-frame O(S²)
> 3. **Job duration** - Minutes vs seconds, requiring checkpoint recovery
> 4. **Output size** - Gigabytes vs megabytes, different CDN strategy
> 5. **Compliance** - Deepfake detection required for video, not just NSFW for images"

---

### Trap 3: "Can you just use more GPUs to make it faster?"

**What Interviewer Wants:** Understanding of parallelism limitations

**Best Answer:**
> "Not linearly. With tensor parallelism across 8 GPUs, we see ~75% efficiency due to communication overhead. Beyond 8 GPUs, the benefit diminishes rapidly.
>
> For real speedup, we need **algorithmic optimization**: TurboDiffusion reduces steps from 50 to 4 for 24× speedup. Sparse-Linear Attention reduces attention complexity. Quantization (W8A8) doubles throughput. These give 100-200× speedup - much more than adding GPUs."

---

### Trap 4: "Why is audio synchronization so hard?"

**What Interviewer Wants:** Understanding of multi-modal challenges

**Best Answer:**
> "Two approaches with different trade-offs:
>
> **Post-sync** (simpler): Generate video first, then audio. Problem: <200ms accuracy because systems aren't jointly trained. Lip movements may not match speech phonemes.
>
> **Native joint generation** (Veo 3): Video and audio share a latent space with joint attention. The audio model sees video features, the video model sees audio context. Achieves <120ms accuracy but requires 2× the model parameters and careful training.
>
> For high-quality lip-sync, native joint generation is necessary."

---

### Trap 5: "How do you handle deepfakes?"

**What Interviewer Wants:** Awareness of ethical/compliance requirements

**Best Answer:**
> "Three-layer defense:
>
> 1. **Prevention**: Detect real person mentions in prompts, block generation of public figures without consent. Face recognition against protected database.
>
> 2. **Detection**: Post-generation deepfake detector using ensemble of frequency analysis, temporal consistency, and physiological signals. Confidence >0.7 triggers block.
>
> 3. **Provenance**: C2PA watermarking embeds cryptographic manifest proving AI origin. Invisible watermarks survive compression. Enables downstream verification.
>
> For compliance, DEFIANCE Act requires prevention + takedown process. EU AI Act requires disclosure + machine-readable marking."

---

## Key Numbers to Memorize

| Category | Metric | Value |
|----------|--------|-------|
| **Generation Time** | 10s 1080p, H100 8×, 50 steps | ~45s |
| **Generation Time** | 5s 768p, LTX real-time | <2s |
| **VRAM** | DiT 10B params (FP16) | 20 GB |
| **VRAM** | 10s 1080p latent | ~62 MB |
| **VRAM** | Total for 10s 1080p generation | ~45 GB |
| **3D VAE** | Spatial compression | 8× |
| **3D VAE** | Temporal compression | 4× |
| **Temporal Attention** | Full attention complexity | O(T²) |
| **Temporal Attention** | Causal attention complexity | O(T) |
| **TurboDiffusion** | Speedup | 100-200× |
| **TurboDiffusion** | Steps | 4-8 |
| **Audio Sync** | Lip-sync target (Veo 3) | <120ms |
| **Cost** | 10s 1080p raw GPU cost | ~$0.04 |
| **Cost** | API price (standard) | $0.20/sec |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Treating as "image gen at higher dimension" | Ignores temporal consistency challenges | Emphasize TSAM, 3D VAE, causal processing |
| Ignoring checkpoint recovery | Jobs take minutes, failures are costly | Design checkpoint every 10 steps |
| Using single GPU for large model | 10B params don't fit | Discuss tensor parallelism (8× H100) |
| Forgetting audio synchronization | Key feature of modern systems | Mention Veo 3 native audio |
| Skipping compliance/deepfake | Major regulatory requirements | Always mention C2PA, DEFIANCE Act |
| Only discussing generation latency | Queue wait dominates E2E | Include fair scheduling, progress streaming |

---

## Sample Interview Walkthrough

### Interviewer: "Design a video generation platform like Sora"

**0-5 min - Clarify:**
> "Before I start, I'd like to clarify a few things:
> 1. What's the expected scale - millions of videos per day?
> 2. Are we optimizing for real-time (<2s) or can standard latency (~1min) work?
> 3. Do we need synchronized audio generation?
> 4. Are there compliance requirements around deepfakes?"

*Interviewer: "Scale is 10M videos/day, standard latency is fine, audio would be nice, and yes deepfake compliance is required."*

**5-15 min - High-Level:**
> "Let me sketch the architecture. The key insight is that video generation jobs take minutes, not seconds, so we need async processing with progress tracking.
>
> [Draw architecture]
>
> The core is a **Diffusion Transformer (DiT)** - modern video models moved from UNet to transformers for better scaling. It operates on 3D patches in a latent space compressed by a **3D VAE** (8× spatial, 4× temporal).
>
> The critical difference from image generation is **temporal attention (TSAM)** - each spatial position attends across all frames for consistency.
>
> Jobs go through a **Redis queue** with fair scheduling across tiers, and we checkpoint every 10 denoising steps for recovery.
>
> Post-generation, we run **deepfake detection** and embed **C2PA watermarks** for compliance."

**15-30 min - Deep Dive (DiT Architecture):**
> "Let me dive into the DiT architecture since that's the heart of the system.
>
> [Draw DiT block structure]
>
> Each of the 28 DiT blocks has four components:
> 1. **Spatial self-attention** - standard within-frame attention
> 2. **Temporal self-attention (TSAM)** - the key innovation, each spatial position attends across all T frames
> 3. **Cross-attention** - conditions on T5-XXL text embeddings
> 4. **FFN with AdaLN** - timestep conditioning through adaptive layer norm
>
> For a 10B parameter model, we need tensor parallelism across 8 H100 GPUs. The weights are ~20GB, and with activations and latents, each generation uses ~45GB.
>
> The temporal attention is O(T²) which is why long videos are challenging - for 60s at 24fps, that's 1440 frames. We use **sliding window with anchor frames** for videos >30s."

**30-40 min - Scale & Reliability:**
> "For 10M videos/day at ~350 peak QPS with 45s average generation, we need ~15,000 concurrent jobs.
>
> **GPU fleet**: ~2,000 pods of 8× H100 each, managed by NVIDIA Run:ai for fair scheduling.
>
> **Checkpointing**: Every 10 steps (~7s), we save the latent state + RNG to NVMe. On worker failure, we reassign to a new pod and resume within 30s.
>
> **Multi-region**: 3 regions (US-West, US-East, EU) with model weights pre-deployed. Videos are stored in the generation region with lazy cross-region replication.
>
> **Auto-scaling**: Scale based on queue depth (>100 waiting = add 10% capacity) and GPU utilization (<40% for 30min = remove 10%)."

**40-45 min - Wrap Up:**
> "To summarize, the key architectural decisions are:
> 1. **DiT over UNet** for better temporal modeling
> 2. **Checkpoint-based recovery** for long-running jobs
> 3. **Tensor parallelism** for large models
> 4. **Multi-layer safety** with deepfake detection and C2PA
>
> Trade-offs we made: Full temporal attention for quality (vs causal for streaming), native audio for better lip-sync (vs post-sync for simplicity).
>
> For future improvements, I'd look at TurboDiffusion for real-time previews - it can achieve 100× speedup with minimal quality loss."

---

## Quick Reference Card

```
+-------------------------------------------------------------------------+
|         VIDEO GENERATION PLATFORM - INTERVIEW QUICK REFERENCE           |
+-------------------------------------------------------------------------+
|                                                                         |
|  CLARIFY FIRST                        KEY ARCHITECTURE DECISIONS        |
|  -------------                        --------------------------         |
|  • Scale (videos/day)                 • DiT over UNet (scaling)         |
|  • Latency (real-time vs batch)       • Flow matching (fewer steps)     |
|  • Audio requirements                 • Full/causal attention (tradeoff)|
|  • Compliance needs                   • Checkpoint recovery (minutes)   |
|                                                                         |
|  HIGH-LEVEL COMPONENTS               DEEP DIVE OPTIONS                  |
|  --------------------                ------------------                  |
|  1. API Gateway + Auth               A. DiT Architecture                |
|  2. Prompt Processing (T5-XXL)          • Patchification                |
|  3. Long-running Queue (Redis)          • Temporal attention (TSAM)    |
|  4. GPU Cluster (H100 × 8)              • AdaLN timestep conditioning   |
|  5. DiT + 3D VAE                                                        |
|  6. Post-gen Safety                  B. Temporal Consistency            |
|  7. CDN Delivery                        • Full vs causal vs window     |
|                                         • Quality metrics (VBench)     |
|  KEY NUMBERS                                                            |
|  -----------                         C. TurboDiffusion                  |
|  10s 1080p generation: ~45s             • Distillation (50→4 steps)    |
|  DiT 10B params: 20GB                   • 100-200× speedup             |
|  VRAM per job: ~45GB                    • 93% quality preserved        |
|  Temporal compression: 4×                                               |
|  Spatial compression: 8×             COMPLIANCE                         |
|  Lip-sync target: <120ms             ----------                         |
|  TurboDiffusion: 100×+ speedup       • C2PA watermarking               |
|                                      • Deepfake detection               |
|  TRAPS TO AVOID                      • DEFIANCE Act, EU AI Act         |
|  ---------------                                                        |
|  ✗ "Just generate frames separately"  (flickering, drift)              |
|  ✗ "Same as image gen but bigger"     (temporal attention critical)    |
|  ✗ "Add more GPUs for linear speedup" (communication overhead)         |
|  ✗ "Deepfakes are handled by users"   (platform liability)             |
|                                                                         |
+-------------------------------------------------------------------------+
```
