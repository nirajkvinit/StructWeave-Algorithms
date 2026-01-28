# Deep Dive and Bottlenecks

## Deep Dive 1: Latent Diffusion Transformer (DiT) Architecture

### Why DiT Over UNet for Video

The shift from UNet to Transformer-based diffusion (DiT) for video generation is driven by several factors:

| Factor | UNet | DiT |
|--------|------|-----|
| **Scaling** | Diminishing returns past 1B params | Near-linear scaling to 30B+ |
| **Temporal Modeling** | Requires added temporal layers | Native attention handles time |
| **Parallelization** | Sequential bottlenecks in skip connections | Fully parallelizable |
| **Quality at Scale** | Plateaus | Continues improving |
| **Memory Efficiency** | Better for small models | Requires more but scales better |

### DiT Architecture for Video

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Video DiT Architecture (10B params)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Input: Noisy Video Latent [B, T, H, W, C]                                  │
│                    │                                                        │
│                    ▼                                                        │
│  ┌─────────────────────────────────────┐                                   │
│  │     3D Patch Embedding              │                                   │
│  │     patch_size = (1, 2, 2)          │                                   │
│  │     [B, T, H, W, C] → [B, N, D]     │                                   │
│  │     N = T × (H/2) × (W/2)           │                                   │
│  └─────────────────┬───────────────────┘                                   │
│                    │                                                        │
│                    ▼                                                        │
│  ┌─────────────────────────────────────┐                                   │
│  │     Positional Encoding             │                                   │
│  │     + Spatial (learned, H×W)        │                                   │
│  │     + Temporal (sinusoidal, T)      │                                   │
│  └─────────────────┬───────────────────┘                                   │
│                    │                                                        │
│                    ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DiT Block (×28 blocks)                            │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │  1. Layer Norm + Spatial Self-Attention                       │   │   │
│  │  │     (within each frame, shared across frames)                 │   │   │
│  │  └──────────────────────────┬───────────────────────────────────┘   │   │
│  │                             │ + Residual                            │   │
│  │  ┌──────────────────────────▼───────────────────────────────────┐   │   │
│  │  │  2. Layer Norm + Temporal Self-Attention (TSAM)              │   │   │
│  │  │     (across frames, per spatial position)                     │   │   │
│  │  │     Option: Full (O(T²)) or Causal (O(T))                    │   │   │
│  │  └──────────────────────────┬───────────────────────────────────┘   │   │
│  │                             │ + Residual                            │   │
│  │  ┌──────────────────────────▼───────────────────────────────────┐   │   │
│  │  │  3. Layer Norm + Cross-Attention (Text Conditioning)          │   │   │
│  │  │     Q: video tokens, K/V: text embeddings                    │   │   │
│  │  └──────────────────────────┬───────────────────────────────────┘   │   │
│  │                             │ + Residual                            │   │
│  │  ┌──────────────────────────▼───────────────────────────────────┐   │   │
│  │  │  4. AdaLN-Zero + MLP (FFN)                                   │   │   │
│  │  │     Timestep conditioning via adaptive layer norm             │   │   │
│  │  │     MLP: D → 4D → D                                          │   │   │
│  │  └──────────────────────────┬───────────────────────────────────┘   │   │
│  │                             │ + Residual                            │   │
│  └─────────────────────────────┼───────────────────────────────────────┘   │
│                                │ (×28)                                     │
│                                ▼                                           │
│  ┌─────────────────────────────────────┐                                   │
│  │     Final Layer Norm                │                                   │
│  │     + Linear Projection             │                                   │
│  └─────────────────┬───────────────────┘                                   │
│                    │                                                        │
│                    ▼                                                        │
│  ┌─────────────────────────────────────┐                                   │
│  │     Unpatchify                      │                                   │
│  │     [B, N, D] → [B, T, H, W, C]     │                                   │
│  └─────────────────┬───────────────────┘                                   │
│                    │                                                        │
│                    ▼                                                        │
│  Output: Predicted Noise/Velocity [B, T, H, W, C]                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### AdaLN-Zero Mechanism

Adaptive Layer Normalization conditions the model on timestep:

```
AdaLN-Zero(x, t):
    // t = timestep embedding
    γ, β, α = MLP(t)  // Learn scale, shift, gate from timestep

    // Modulated layer norm
    x_norm = LayerNorm(x)
    x_modulated = γ * x_norm + β

    // Zero-initialized gating for residuals
    output = α * Attention(x_modulated)

    return output
```

### Memory Requirements Analysis

For a 10B parameter DiT generating 10s 1080p video:

| Component | Memory | Notes |
|-----------|--------|-------|
| Model weights (FP16) | 20 GB | 10B × 2 bytes |
| Optimizer states (AdamW) | 40 GB | 2× model (training only) |
| Activations (inference) | 10-15 GB | Depends on batch size |
| Attention workspace | 8-12 GB | O(T² × S) for full attention |
| Video latent | 62 MB | 60 × 135 × 240 × 16 × 2 |
| Text embeddings | 100 MB | 2048 × 4096 × 2 |
| **Total (inference)** | **~45 GB** | Fits H100 80GB |

---

## Deep Dive 2: Asymmetric Dual-Stream Architecture

### Mochi 1 / LTX-2 Pattern

Both Mochi 1 and LTX-2 use asymmetric architectures where the video stream has significantly more parameters than the text stream:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Asymmetric Dual-Stream Architecture                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Text Stream (Frozen/Light)           Video Stream (Heavy/Trainable)       │
│  ┌───────────────────────┐           ┌─────────────────────────────────┐   │
│  │                       │           │                                 │   │
│  │   T5-XXL / Gemma 3    │           │   Video Patch Embeddings        │   │
│  │   (11B params, frozen)│           │   + Positional Encoding         │   │
│  │                       │           │                                 │   │
│  │   hidden_dim = 4096   │           │   hidden_dim = 4096 × 4         │   │
│  │                       │           │   (4× text stream)              │   │
│  └───────────┬───────────┘           └───────────────┬─────────────────┘   │
│              │                                       │                     │
│              │  Text Embeddings                      │  Video Tokens       │
│              │  [B, S_text, 4096]                    │  [B, S_video, 16384]│
│              │                                       │                     │
│              └───────────────┬───────────────────────┘                     │
│                              │                                             │
│                              ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Unified Self-Attention Block                      │   │
│  │                                                                      │   │
│  │   // Concatenate text and video tokens for joint attention          │   │
│  │   joint_tokens = concat(text_tokens, video_tokens)                  │   │
│  │                                                                      │   │
│  │   // Non-square projections to unified dimension                    │   │
│  │   Q_text = W_q_text(text_tokens)     // 4096 → 4096                 │   │
│  │   Q_video = W_q_video(video_tokens)  // 16384 → 4096                │   │
│  │                                                                      │   │
│  │   // Video fully attends to text                                    │   │
│  │   // Text has limited/no attention to video                         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Separate MLPs per Modality                        │   │
│  │                                                                      │   │
│  │   text_out = MLP_text(text_attn_out)    // Small MLP                │   │
│  │   video_out = MLP_video(video_attn_out)  // Large MLP (4×)          │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Benefits:                                                                  │
│  • Video stream has 4× parameters → better visual quality                  │
│  • Text stream frozen → leverages pretrained language knowledge            │
│  • Asymmetric attention → video conditioned on text, not vice versa        │
│  • Memory efficient: smaller QKV projections than symmetric                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Parameter Distribution

| Component | Mochi 1 | LTX-2 |
|-----------|---------|-------|
| **Total Parameters** | 10B | 19B (14B + 5B) |
| **Video Stream** | 8B (80%) | 14B (74%) |
| **Text Stream** | 2B (20%, using T5) | Gemma 3 (shared) |
| **Audio Stream** | N/A | 5B (26%) |
| **Video/Text Ratio** | 4:1 | ~3:1 |

### Attention Pattern

```
Attention Matrix (Asymmetric):

                    Keys
              Text    Video
         ┌─────────┬─────────┐
  Text   │  Self   │ Limited │  ← Text tokens
Queries  │  Attn   │  /None  │
         ├─────────┼─────────┤
  Video  │  Full   │  Self   │  ← Video tokens
         │  Cross  │  Attn   │
         └─────────┴─────────┘

Video fully attends to text (cross-attention)
Text has limited/no attention to video (prevents contamination)
```

---

## Deep Dive 3: 3D VAE Compression

### Causal 3D VAE Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Causal 3D VAE (Wan-VAE / Mochi VAE)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ENCODER (Video → Latent)                                                   │
│  ────────────────────────                                                   │
│                                                                             │
│  Input: Video [B, T, H, W, 3]                                              │
│         T=240 frames, H=1080, W=1920                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Causal Conv3D Block 1                                               │   │
│  │  • Conv3D(3→64, kernel=(3,3,3), stride=(1,2,2))                     │   │
│  │  • Causal padding: pad only past frames                             │   │
│  │  • Output: [B, T, H/2, W/2, 64]                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Causal Conv3D Block 2 (spatial downsample)                         │   │
│  │  • Conv3D(64→128, stride=(1,2,2))                                   │   │
│  │  • Output: [B, T, H/4, W/4, 128]                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Causal Conv3D Block 3 (spatial downsample)                         │   │
│  │  • Conv3D(128→256, stride=(1,2,2))                                  │   │
│  │  • Output: [B, T, H/8, W/8, 256]                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Temporal Downsample (causal)                                        │   │
│  │  • Conv3D(256→256, kernel=(4,1,1), stride=(4,1,1))                  │   │
│  │  • Causal: frame T only sees frames 0..T                            │   │
│  │  • Output: [B, T/4, H/8, W/8, 256]                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Bottleneck                                                          │   │
│  │  • Conv3D(256→16, kernel=(1,1,1))                                   │   │
│  │  • Output: [B, 60, 135, 240, 16] (latent)                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Compression: 240×1080×1920×3 → 60×135×240×16                              │
│  Ratio: 8× spatial, 4× temporal, 3→16 channels                             │
│  Total compression: ~96×                                                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DECODER (Latent → Video)                                                   │
│  ────────────────────────                                                   │
│                                                                             │
│  Input: Latent [B, T/4, H/8, W/8, 16]                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Feature Caching (for long videos)                                   │   │
│  │  • Cache intermediate features for temporal consistency             │   │
│  │  • Process in chunks of "1+T/4" frames                              │   │
│  │  • First frame is anchor, subsequent depend on it                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Temporal Upsample (learned)                                         │   │
│  │  • ConvTranspose3D(16→256, kernel=(4,1,1), stride=(4,1,1))          │   │
│  │  • Output: [B, T, H/8, W/8, 256]                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Spatial Upsample Blocks (×3)                                        │   │
│  │  • ConvTranspose2D per frame                                        │   │
│  │  • Temporal Conv3D for consistency                                   │   │
│  │  • [B, T, H/8, W/8, 256] → [B, T, H, W, 64]                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Final Projection                                                    │   │
│  │  • Conv2D(64→3) per frame                                           │   │
│  │  • Output: [B, T, H, W, 3]                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Causal Convolution Explained

```
Standard 3D Conv (non-causal):
    Frame t can see frames [t-k, t, t+k]
    Problem: Future leakage during decode

Causal 3D Conv:
    Frame t can ONLY see frames [t-k, ..., t]
    Pad with zeros on left (past), no padding on right (future)

    Example (kernel=3 in time):
    Input frames:   [F1] [F2] [F3] [F4] [F5]

    Non-causal:     F3 sees F2, F3, F4 (future leak!)

    Causal:         [0] [F1] [F2] [F3] [F4] [F5]
                    F3 sees F1, F2, F3 (no future)
```

### Compression Statistics

| Resolution | Duration | Original Size | Latent Size | Compression |
|------------|----------|---------------|-------------|-------------|
| 720p | 5s @ 24fps | 3.3 GB | 14 MB | 235× |
| 1080p | 10s @ 24fps | 14.9 GB | 62 MB | 240× |
| 4K | 30s @ 24fps | 179 GB | 560 MB | 320× |

---

## Deep Dive 4: Temporal Consistency Mechanisms

### Three Approaches Compared

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Temporal Attention Strategies                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  APPROACH 1: Full Temporal Attention                                        │
│  ───────────────────────────────────                                        │
│                                                                             │
│  Every frame attends to every other frame                                   │
│  Complexity: O(T² × S) where T=frames, S=spatial tokens                    │
│                                                                             │
│      Frame:  F1   F2   F3   F4   F5                                        │
│      F1:     ●────●────●────●────●                                         │
│      F2:     ●────●────●────●────●                                         │
│      F3:     ●────●────●────●────●                                         │
│      F4:     ●────●────●────●────●                                         │
│      F5:     ●────●────●────●────●                                         │
│                                                                             │
│  Pros: Best quality, full context                                          │
│  Cons: Memory O(T²), doesn't scale to long videos                          │
│  Use: Short videos (<10s), cinema quality                                  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  APPROACH 2: Causal Temporal Attention                                      │
│  ─────────────────────────────────────                                      │
│                                                                             │
│  Each frame only attends to past frames (and itself)                       │
│  Complexity: O(T × S) per frame, O(T² × S) total but parallelizable        │
│                                                                             │
│      Frame:  F1   F2   F3   F4   F5                                        │
│      F1:     ●                                                             │
│      F2:     ●────●                                                        │
│      F3:     ●────●────●                                                   │
│      F4:     ●────●────●────●                                              │
│      F5:     ●────●────●────●────●                                         │
│                                                                             │
│  Pros: Enables streaming, lower per-frame memory                           │
│  Cons: No future context (slight quality loss)                             │
│  Use: Real-time generation, streaming, long videos                         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  APPROACH 3: Sliding Window + Anchor Frames                                 │
│  ─────────────────────────────────────────                                  │
│                                                                             │
│  Local window (recent W frames) + global anchors (every A frames)          │
│  Complexity: O(T × W) where W << T                                         │
│                                                                             │
│      Frame:  A1   2    3    4    A5   6    7    8    A9                    │
│      F8:     ●              ●────●────●────●────●                          │
│              ↑                   ↑─────────────────↑                       │
│           anchor           local window (W=4)                              │
│                                                                             │
│  Anchor frames: Every 32 frames (keyframes for global context)             │
│  Window: 16 most recent frames (local motion)                              │
│                                                                             │
│  Pros: Scales to very long videos, bounded memory                          │
│  Cons: May miss mid-range dependencies                                     │
│  Use: Long-form content (>30s), memory-constrained                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### TSAM Implementation Details

```
Temporal Self-Attention Module (TSAM)

Input Shape:  [B, T, S, D]
              B = batch, T = frames, S = spatial tokens, D = dim

Step 1: Reshape for temporal attention
        [B, T, S, D] → [B×S, T, D]
        Each spatial position processes all frames

Step 2: Compute Q, K, V
        Q = W_q × x  [B×S, T, D]
        K = W_k × x  [B×S, T, D]
        V = W_v × x  [B×S, T, D]

Step 3: Attention (with optional causal mask)
        scores = Q × K^T / √D  [B×S, T, T]

        if causal:
            mask = upper_triangular(-∞)
            scores = scores + mask

        weights = softmax(scores)  [B×S, T, T]
        output = weights × V  [B×S, T, D]

Step 4: Reshape back
        [B×S, T, D] → [B, T, S, D]

Memory for Full Attention:
    Attention matrix: B × S × T × T × 4 bytes
    Example: 1 × 32400 × 60 × 60 × 4 = 466 MB per layer
    With 28 layers: ~13 GB just for attention

Memory for Causal (with KV cache):
    KV cache: B × S × T × D × 2 × 4 bytes
    Example: 1 × 32400 × 60 × 4096 × 2 × 4 = 63 GB (too large!)
    Solution: Chunked processing with gradient checkpointing
```

---

## Deep Dive 5: TurboDiffusion and Real-time Generation

### Distillation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TurboDiffusion Training Pipeline                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Stage 1: Progressive Step Distillation                                     │
│  ─────────────────────────────────────                                      │
│                                                                             │
│  Teacher (50 steps) → Student (25 steps)                                   │
│                                                                             │
│  FOR each training batch:                                                   │
│      teacher_trajectory = teacher.generate(noise, steps=50)                │
│      student_output = student.generate(noise, steps=25)                    │
│                                                                             │
│      // Match intermediate states                                          │
│      loss = MSE(student_output, teacher_trajectory[::2])                   │
│                                                                             │
│  Repeat: 25 → 12 → 6 → 4 steps                                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Stage 2: Adversarial Fine-tuning (for 4-8 step model)                     │
│  ─────────────────────────────────────────────────────                     │
│                                                                             │
│  Add discriminator to improve single-step quality:                         │
│                                                                             │
│  D(video) → real/fake score                                                │
│                                                                             │
│  Generator loss:                                                           │
│      L_total = L_distill + λ_adv × L_adversarial + λ_perceptual × L_LPIPS │
│                                                                             │
│  This prevents blurry outputs common in pure distillation                  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Stage 3: Attention Optimization (SLA)                                      │
│  ─────────────────────────────────────                                      │
│                                                                             │
│  Replace dense attention with Sparse-Linear Attention:                     │
│                                                                             │
│  Original: O(N²) dense attention                                           │
│                                                                             │
│  SLA:                                                                       │
│      // Sparse component (top-k attention)                                 │
│      sparse_out = TopK_Attention(Q, K, V, k=N/10)  // O(N × k)            │
│                                                                             │
│      // Linear component (kernel approximation)                            │
│      linear_out = φ(Q) × (φ(K)^T × V)  // O(N)                            │
│                                                                             │
│      // Learned combination                                                │
│      output = gate × sparse_out + (1-gate) × linear_out                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Stage 4: Quantization (W8A8)                                              │
│  ─────────────────────────────                                              │
│                                                                             │
│  Quantize weights and activations to INT8:                                 │
│                                                                             │
│  // Calibration                                                            │
│  FOR layer IN model:                                                        │
│      scale_w = max(|weight|) / 127                                         │
│      scale_a = percentile(|activations|, 99.9) / 127                       │
│                                                                             │
│  // Inference                                                              │
│  output = (W_int8 × A_int8) × scale_w × scale_a                           │
│                                                                             │
│  Benefits: 2× memory reduction, ~2× speedup on tensor cores                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Performance Comparison

| Configuration | Steps | Time (5s video) | Quality (VBench) | Speedup |
|---------------|-------|-----------------|------------------|---------|
| Baseline | 50 | 45s | 100% | 1× |
| Reduced steps | 25 | 23s | 98% | 2× |
| Distilled | 8 | 7.5s | 95% | 6× |
| TurboDiffusion | 4 | 1.9s | 93% | 24× |
| + SLA | 4 | 1.5s | 93% | 30× |
| + W8A8 | 4 | 1.2s | 92% | 38× |

---

## Deep Dive 6: Audio-Video Synchronization (Veo 3 Style)

### Joint Audio-Visual Generation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Veo 3 Audio-Visual Architecture                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Text Prompt: "A woman speaking at a podium, wind rustling trees"          │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              Text Encoder (T5-based)                                 │   │
│  │              → Text Embeddings                                       │   │
│  └─────────────────────────────┬───────────────────────────────────────┘   │
│                                │                                           │
│          ┌─────────────────────┴─────────────────────┐                     │
│          │                                           │                     │
│          ▼                                           ▼                     │
│  ┌───────────────────────┐               ┌───────────────────────┐         │
│  │   Video DiT (30B+)    │               │   Audio DiT (9B)      │         │
│  │                       │               │                       │         │
│  │   3D Conv Encoder     │               │   Temporal Audio      │         │
│  │        ↓              │               │   Latent Space        │         │
│  │   Video Latent Space ◄├───────────────┤►                      │         │
│  │        ↓              │  Joint        │        ↓              │         │
│  │   DiT Blocks          │  Attention    │   DiT Blocks          │         │
│  │        ↓              │               │        ↓              │         │
│  │   3D VAE Decoder      │               │   Audio Vocoder       │         │
│  │                       │               │                       │         │
│  └───────────┬───────────┘               └───────────┬───────────┘         │
│              │                                       │                     │
│              ▼                                       ▼                     │
│  ┌───────────────────────┐               ┌───────────────────────┐         │
│  │   Video Frames        │               │   Audio Waveform      │         │
│  │   [T, H, W, 3]        │               │   [samples]           │         │
│  └───────────┬───────────┘               └───────────┬───────────┘         │
│              │                                       │                     │
│              └─────────────────┬─────────────────────┘                     │
│                                │                                           │
│                                ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Lip-Sync Refinement                               │   │
│  │                                                                      │   │
│  │   1. Detect face regions in video                                   │   │
│  │   2. Extract phonemes from audio                                    │   │
│  │   3. Align lip movements to phonemes                                │   │
│  │   4. Refine video if sync > 120ms                                   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Output: Synchronized video + audio                                         │
│  Lip-sync accuracy: <120ms (imperceptible to humans)                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Audio Generation Components

| Component | Function | Details |
|-----------|----------|---------|
| **Speech Synthesis** | Generate dialogue | Phoneme-aligned, emotion-aware |
| **Ambient Sound** | Background audio | Scene-appropriate (wind, traffic) |
| **Music Generation** | Background music | Mood-matched, non-intrusive |
| **Sound Effects** | Action sounds | Footsteps, doors, impacts |
| **Lip-Sync** | Mouth alignment | <120ms accuracy threshold |

---

## Bottleneck Analysis

### Bottleneck 1: VRAM for Long Videos

**Problem:** 3D latent and attention memory grow with video duration

```
Memory Growth:

Duration    Latent Size    Attention (full)    Total VRAM
5s          15 MB          3 GB                 35 GB
10s         62 MB          13 GB                45 GB
30s         186 MB         117 GB               160 GB (!)
60s         372 MB         466 GB               IMPOSSIBLE
```

**Mitigations:**

| Strategy | Memory Savings | Quality Impact | Complexity |
|----------|----------------|----------------|------------|
| Causal attention | 50% | Slight | Low |
| Sliding window | 80% | Moderate | Medium |
| Gradient checkpointing | 60% | None | Low |
| Mixed precision (FP16) | 50% | Minimal | Low |
| Model parallelism | Linear with GPUs | None | High |
| Chunked generation | 90% | Slight | High |

### Bottleneck 2: Temporal Consistency Degradation

**Problem:** Quality degrades over longer durations

```
Quality vs Duration (VBench scores):

Duration    Subject Consistency    Motion Smoothness    Overall
5s          0.95                   0.93                 0.94
10s         0.92                   0.91                 0.91
30s         0.85                   0.84                 0.84
60s         0.78                   0.75                 0.76
```

**Mitigations:**

1. **Anchor frame injection:** Periodically re-inject reference frames
2. **Hierarchical generation:** Generate keyframes first, interpolate
3. **Optical flow regularization:** Enforce smooth motion
4. **Quality-aware stopping:** Stop if quality drops below threshold

### Bottleneck 3: 3D VAE Decoding Latency

**Problem:** VAE decode is non-parallelizable bottleneck

```
VAE Decode Time:

Resolution    Duration    Frames    Decode Time
720p          5s          120       2s
1080p         10s         240       5s
4K            30s         720       30s
4K            60s         1440      75s
```

**Mitigations:**

1. **NVENC hardware decode:** 5× faster than CPU
2. **Tiled decoding:** Process spatial tiles in parallel
3. **Progressive decode:** Stream frames as they're ready
4. **Lower-res preview:** Generate preview quickly, refine later

### Bottleneck 4: Multi-GPU Synchronization Overhead

**Problem:** Tensor parallelism has communication overhead

```
Communication vs Computation:

GPUs    Computation    Communication    Efficiency
1       100%           0%               100%
2       50%            10%              90%
4       25%            18%              82%
8       12.5%          25%              75%
```

**Mitigations:**

1. **NVLink topology:** Use NVLink instead of PCIe
2. **Pipeline parallelism:** Overlap communication and computation
3. **Gradient compression:** Reduce bytes transferred
4. **Optimal batch size:** Balance utilization vs overhead

### Bottleneck Summary

| Bottleneck | Severity | Primary Mitigation | Cost |
|------------|----------|-------------------|------|
| VRAM for long videos | Critical | Causal attention + chunking | Quality trade-off |
| Temporal degradation | High | Anchor frames + hierarchical | Complexity |
| VAE decode latency | Medium | Hardware acceleration | Hardware cost |
| Multi-GPU sync | Medium | NVLink + pipeline parallel | Infrastructure |
| Queue wait times | Medium | More GPUs + better scheduling | Cost |
