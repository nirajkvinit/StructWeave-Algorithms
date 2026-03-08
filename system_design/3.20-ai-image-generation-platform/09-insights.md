# Key Insights: AI Image Generation Platform

## Insight 1: GPU Warm Pool as the Critical Latency Lever

**Category:** Scaling
**One-liner:** Cold-starting a GPU model adds 15-30 seconds of pure waste before a single pixel is generated.

**Why it matters:** Without a warm pool, end-to-end latency doubles or triples, making any SLO impossible. The warm pool uses tiered eviction (Tier 1 never evict, Tier 2 LRU, Tier 3 on-demand) combined with predictive loading based on time-of-day patterns and recent request analysis. The key insight is that model loading latency dwarfs all other components--generation, safety, and delivery combined--so optimizing everywhere else is futile unless cold starts are eliminated for the vast majority of requests.

---

## Insight 2: Fixed VRAM vs Growing KV Cache -- The Fundamental Difference from LLM Inference

**Category:** System Modeling
**One-liner:** Image generation uses fixed, predictable VRAM per request, while LLM inference VRAM grows with context length--this changes every capacity planning assumption.

**Why it matters:** Because VRAM requirements are resolution-dependent but deterministic, you can budget GPU memory precisely: base model (10 GB) + text encoders (4 GB) + VAE (2 GB) + workspace + safety margin. This predictability enables batch sizing that LLM inference cannot achieve. However, it also means multi-model composition (LoRA + ControlNet stacking) can push a worker into OOM if adapter limits are not enforced per tier, since each add-on claims a fixed chunk of a finite budget.

---

## Insight 3: VRAM Fragmentation -- The Hidden OOM Killer

**Category:** Contention
**One-liner:** A GPU can have 13 GB free yet fail to allocate an 8 GB model because free memory is scattered across non-contiguous blocks.

**Why it matters:** Repeatedly loading and unloading models of different sizes creates fragmentation analogous to heap fragmentation in memory allocators. The system can report healthy VRAM utilization while silently failing allocations. Scheduled defragmentation (compacting allocations during low-traffic windows) and careful VRAM budget enforcement prevent this. Without it, allocation failures look identical to genuine resource exhaustion, leading operators to scale up hardware when defragmentation would suffice.

---

## Insight 4: Multi-Tier Queue Fairness and Starvation Prevention

**Category:** Traffic Shaping
**One-liner:** Weighted priority queues without starvation guards let paying Turbo users starve Relax users beyond SLO, turning a feature into a liability.

**Why it matters:** During peak hours, Turbo and Fast requests dominate GPU allocation via weight-based scheduling. Relax queue (often 77% of request volume) gets squeezed to 36% of GPU time, violating its 6-minute SLO. The fix requires reserved capacity (20% GPUs always for Relax), starvation promotion (boost priority after 5 minutes waiting), and dynamic weight adjustment. This is a general pattern: any weighted scheduler without a starvation floor will eventually violate lower-tier guarantees under sustained load.

---

## Insight 5: Diminishing Returns in Diffusion Step Count

**Category:** Cost Optimization
**One-liner:** Going from 30 to 50 denoising steps costs 67% more compute for roughly 5% quality improvement--most users cannot perceive the difference.

**Why it matters:** The step-count vs quality curve flattens sharply after 20-30 steps. LCM-LoRA achieves moderate quality in just 4 steps (10-12x speedup), and SDXS hits 1-step generation at 50-100x speedup with significant but often acceptable quality loss. This creates a natural tiering strategy: previews and iterations use low-step models, final renders use full-step generation. Choosing the scheduler (DPM++ 2M Karras for quality, LCM for speed) becomes as important as choosing the base model.

---

## Insight 6: Dual-Layer Content Safety Creates an Asymmetric Error Problem

**Category:** Security
**One-liner:** Pre-generation safety catches prompt-level violations cheaply, but post-generation safety is the only defense against adversarial prompt engineering that produces harmful images from innocent-looking text.

**Why it matters:** Pre-generation filtering (blocklists, classifiers) blocks obvious violations quickly but has a 2.35% bypass rate via prompt manipulation. Post-generation NSFW and bias classifiers catch what pre-gen misses, but add latency to every request. The asymmetry is that false negatives at post-gen are far more damaging than false positives (blocked images can be regenerated; released harmful content cannot be unviewed). This dual-layer design is essential--skipping either layer creates unacceptable risk.

---

## Insight 7: ControlNet Temporal Application as a Quality Knob

**Category:** Data Structures
**One-liner:** Applying ControlNet conditioning only during the first 70% of denoising steps locks in structure while allowing creative detail variation in the final 30%.

**Why it matters:** ControlNet injects residual features from a conditioning image (depth, pose, edges) into the UNet at every denoising step. Applying it for the full 100% of steps forces rigid adherence, which looks unnatural. Ending early (start_percent=0, end_percent=0.7) lets the model "fill in" fine details freely after structure is established. This temporal control is a powerful design pattern: hard constraints set composition, then soft generation handles aesthetics. Stacking multiple ControlNets (e.g., OpenPose + Depth + IP-Adapter) with complementary types and reduced weights produces better results than a single strong ControlNet.

---

## Insight 8: DistriFusion for Multi-GPU Parallelism on Single Images

**Category:** Scaling
**One-liner:** Displaced patch parallelism splits a single high-resolution image across 4 GPUs for a 3.4x speedup by sharing features from the previous timestep between patches.

**Why it matters:** Unlike batch parallelism (different images on different GPUs), DistriFusion parallelizes a single image generation by dividing the latent into patches processed on separate GPUs. Each GPU uses stale feature maps from its neighbors (from the previous denoising step) to maintain global coherence. This trades a tiny quality degradation for near-linear multi-GPU scaling on high-resolution images (2048x2048: 120s on 1 GPU vs 20s on 8 GPUs). It is especially valuable for production-quality high-res generation where batch parallelism alone cannot meet latency targets.

---

## Insight 9: Model Composition Memory Overhead Enforces Tier-Based Limits

**Category:** Contention
**One-liner:** Stacking 4 LoRAs and 2 ControlNets on an A10G (24 GB) exceeds VRAM by 2.3 GB--adapter count limits must be enforced per subscription tier.

**Why it matters:** Each LoRA adds 100-200 MB and each ControlNet adds 2-4 GB. On a 24 GB A10G, a standard SDXL setup leaves only 4.5 GB free; adding 2 LoRAs and 1 ControlNet leaves 1.1 GB (fragile), and 4 LoRAs + 2 ControlNets triggers OOM. The solution is product-level: Free tier gets 1 LoRA, Pro gets 3, and complex compositions route to A100 (80 GB) workers. Alternatively, sequential ControlNet processing trades latency for memory. This is a general lesson: ML model composition creates combinatorial VRAM pressure that must be gated at the API level, not discovered at runtime.

---

## Insight 10: Predictive Model Loading Turns Idle GPUs into Strategic Assets

**Category:** Caching
**One-liner:** Analyzing queue composition and time-of-day patterns during quiet periods to preload likely-needed models converts idle GPU time into reduced cold starts.

**Why it matters:** The predictive loading algorithm examines recent request patterns, applies historical time-of-day weights, and preloads the top 5 predicted models onto idle workers during low-traffic windows. The eviction scoring formula penalizes models that are idle, infrequently used, and low-tier, while heavily protecting Tier 1 models (score -= 1000) and models with queued requests. This approach transforms idle GPU capacity from a sunk cost into a latency optimization, effectively amortizing cold-start costs across quiet periods rather than paying them during peak demand.

---

## Insight 11: CFG Scale as a Non-Linear Quality Control

**Category:** System Modeling
**One-liner:** Classifier-Free Guidance at 7.0-8.0 balances prompt adherence and image quality, but above 15.0 it produces severe artifacts--the relationship is not monotonic.

**Why it matters:** CFG works by computing both unconditional and conditional noise predictions, then amplifying the difference. Low values (1.0) ignore the prompt entirely; moderate values (7.5) produce balanced results; high values (15.0+) oversaturate colors and introduce artifacts. This non-linear behavior means that blindly increasing CFG to "follow the prompt more closely" degrades output quality. Exposing CFG as a user-facing parameter requires clamping to safe ranges (e.g., 1.0-15.0) and defaulting to the empirically optimal sweet spot, similar to how any system should constrain tuning parameters to their useful operating range.

---
