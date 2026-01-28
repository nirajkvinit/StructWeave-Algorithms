# Low-Level Design

## Data Models

### VideoGenerationRequest

```
VideoGenerationRequest:
    request_id: UUID (primary key)
    user_id: String (indexed)
    created_at: Timestamp
    updated_at: Timestamp

    status: Enum [
        PENDING,           # In queue
        ENCODING,          # Prompt being processed
        QUEUED,            # Waiting for GPU
        ASSIGNED,          # GPU worker assigned
        GENERATING,        # DiT inference in progress
        VAE_DECODING,      # 3D VAE decoding
        AUDIO_GENERATING,  # Audio synthesis
        SAFETY_CHECKING,   # Post-gen safety
        TRANSCODING,       # Format conversion
        UPLOADING,         # CDN upload
        COMPLETED,         # Success
        FAILED,            # Error
        CANCELLED,         # User cancelled
        BLOCKED            # Safety violation
    ]

    tier: Enum [REALTIME, STANDARD, CINEMA]
    priority: Int (0 = highest)

    prompt_config:
        text_prompt: String (max 2000 chars)
        negative_prompt: String (optional)
        first_frame_image: Bytes (optional, for I2V)
        reference_video: String (URL, optional, for V2V)
        style_preset: String (optional)

    generation_config:
        model: Enum [VEO3, SORA, MOCHI1, LTX2, GEN4, OPENSORA]
        duration_seconds: Float (5-60)
        fps: Int [24, 30, 60]
        resolution: Enum [480P, 720P, 1080P, 4K]
        aspect_ratio: String ["16:9", "9:16", "1:1", "4:3"]
        num_inference_steps: Int (4-100)
        guidance_scale: Float (1.0-20.0)
        seed: Int (optional, for reproducibility)
        enable_audio: Boolean
        audio_config:
            include_speech: Boolean
            include_music: Boolean
            include_ambient: Boolean

    progress:
        current_step: Int
        total_steps: Int
        current_phase: String
        estimated_remaining_seconds: Int
        last_checkpoint_step: Int
        checkpoint_path: String

    output:
        video_url: String
        video_size_bytes: Int
        thumbnail_url: String
        audio_url: String (if separate)
        c2pa_manifest_url: String
        generation_time_ms: Int
        gpu_time_ms: Int

    safety:
        pre_gen_score: Float
        post_gen_score: Float
        blocked_reason: String (if blocked)

    billing:
        video_seconds: Float
        cost_credits: Float
        tier_multiplier: Float
```

### GPUWorkerState

```
GPUWorkerState:
    worker_id: String (primary key)
    pod_name: String
    node_name: String

    status: Enum [
        IDLE,
        LOADING_MODEL,
        READY,
        GENERATING,
        CHECKPOINTING,
        DECODING,
        DRAINING,
        OFFLINE
    ]

    hardware:
        gpu_type: String (e.g., "H100-80GB")
        gpu_count: Int
        gpu_memory_total_gb: Float
        gpu_memory_used_gb: Float
        nvlink_topology: String

    loaded_models:
        dit_model: String (model_id)
        dit_model_loaded_at: Timestamp
        vae_model: String
        text_encoders: List[String]
        audio_model: String (optional)

    current_job:
        request_id: UUID
        started_at: Timestamp
        current_step: Int
        last_heartbeat: Timestamp

    metrics:
        jobs_completed_today: Int
        average_generation_time_ms: Int
        checkpoint_save_time_ms: Int
        error_count_today: Int
```

### VideoJobCheckpoint

```
VideoJobCheckpoint:
    checkpoint_id: UUID (primary key)
    request_id: UUID (foreign key)
    worker_id: String
    created_at: Timestamp

    step_number: Int
    total_steps: Int

    state:
        latent_tensor_path: String (NVMe path)
        latent_shape: Tuple[Int] (B, T, H, W, C)
        latent_dtype: String (e.g., "float16")

        rng_state_cpu: Bytes
        rng_state_cuda: Bytes

        scheduler_state:
            timesteps_remaining: List[Float]
            sigma_current: Float

        audio_state: Bytes (optional)

    storage:
        local_path: String (NVMe)
        remote_path: String (S3)
        synced_to_remote: Boolean
        size_bytes: Int
```

### 3DVAELatentState

```
Video3DLatent:
    request_id: UUID

    dimensions:
        batch_size: Int
        num_frames: Int (after temporal compression)
        height: Int (after spatial compression)
        width: Int (after spatial compression)
        channels: Int (typically 16)

    compression:
        spatial_factor: Int (typically 8)
        temporal_factor: Int (typically 4)
        original_frames: Int
        original_height: Int
        original_width: Int

    tensor:
        data: Tensor[batch, frames, height, width, channels]
        dtype: String
        device: String (e.g., "cuda:0")

    metadata:
        vae_version: String
        encoding_time_ms: Int
```

---

## API Design

### Create Video Generation

```
POST /v1/videos

Request Headers:
    Authorization: Bearer <token>
    X-Request-ID: <uuid> (idempotency key)
    Content-Type: application/json

Request Body:
{
    "prompt": "A serene lake at sunset with mountains in the background",
    "negative_prompt": "blurry, low quality, distorted",
    "duration_seconds": 10,
    "resolution": "1080p",
    "aspect_ratio": "16:9",
    "fps": 24,
    "model": "standard",  // "realtime", "standard", "cinema"
    "enable_audio": true,
    "audio_config": {
        "include_ambient": true,
        "include_music": false
    },
    "seed": 42,  // optional
    "webhook_url": "https://example.com/webhook"  // optional
}

Response (202 Accepted):
{
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING",
    "estimated_time_seconds": 45,
    "progress_url": "wss://api.example.com/v1/videos/550e8400.../progress",
    "created_at": "2026-01-28T10:30:00Z"
}

Error Responses:
    400 Bad Request: Invalid parameters
    401 Unauthorized: Invalid token
    402 Payment Required: Insufficient credits
    429 Too Many Requests: Rate limit exceeded
    451 Unavailable: Prompt violates content policy
```

### Get Video Status

```
GET /v1/videos/{request_id}

Response (200 OK - In Progress):
{
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "GENERATING",
    "progress": {
        "current_step": 30,
        "total_steps": 50,
        "percent_complete": 60,
        "current_phase": "DiT inference",
        "estimated_remaining_seconds": 18
    },
    "created_at": "2026-01-28T10:30:00Z",
    "started_at": "2026-01-28T10:30:05Z"
}

Response (200 OK - Completed):
{
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "COMPLETED",
    "output": {
        "video_url": "https://cdn.example.com/videos/550e8400....mp4",
        "thumbnail_url": "https://cdn.example.com/thumbnails/550e8400....jpg",
        "duration_seconds": 10,
        "resolution": "1920x1080",
        "file_size_bytes": 52428800,
        "c2pa_manifest_url": "https://cdn.example.com/manifests/550e8400....json"
    },
    "generation_time_ms": 45000,
    "credits_used": 2.0,
    "created_at": "2026-01-28T10:30:00Z",
    "completed_at": "2026-01-28T10:30:45Z"
}
```

### Progress Streaming (WebSocket/SSE)

```
WebSocket: wss://api.example.com/v1/videos/{request_id}/progress
SSE:       GET /v1/videos/{request_id}/stream

Event Format (SSE):
event: progress
data: {
    "request_id": "550e8400...",
    "status": "GENERATING",
    "step": 30,
    "total_steps": 50,
    "phase": "dit_inference",
    "percent": 60,
    "eta_seconds": 18,
    "timestamp": "2026-01-28T10:30:25Z"
}

event: phase_change
data: {
    "request_id": "550e8400...",
    "previous_phase": "dit_inference",
    "new_phase": "vae_decoding",
    "timestamp": "2026-01-28T10:30:35Z"
}

event: completed
data: {
    "request_id": "550e8400...",
    "status": "COMPLETED",
    "video_url": "https://cdn.example.com/videos/550e8400....mp4",
    "timestamp": "2026-01-28T10:30:45Z"
}

event: error
data: {
    "request_id": "550e8400...",
    "status": "FAILED",
    "error_code": "GENERATION_TIMEOUT",
    "error_message": "Generation exceeded time limit",
    "timestamp": "2026-01-28T10:35:00Z"
}
```

### Cancel Generation

```
DELETE /v1/videos/{request_id}

Response (200 OK):
{
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "CANCELLED",
    "refunded_credits": 1.5
}

Response (409 Conflict):
{
    "error": "Cannot cancel",
    "reason": "Video already completed",
    "status": "COMPLETED"
}
```

### List User Videos

```
GET /v1/videos?limit=20&offset=0&status=COMPLETED

Response (200 OK):
{
    "videos": [
        {
            "request_id": "550e8400...",
            "status": "COMPLETED",
            "prompt": "A serene lake...",
            "thumbnail_url": "https://...",
            "created_at": "2026-01-28T10:30:00Z"
        },
        ...
    ],
    "total": 156,
    "limit": 20,
    "offset": 0
}
```

### Webhook Payload

```
POST {webhook_url}

Headers:
    X-Webhook-Signature: sha256=...
    Content-Type: application/json

Body:
{
    "event": "video.completed",  // or "video.failed", "video.blocked"
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "COMPLETED",
    "output": {
        "video_url": "https://cdn.example.com/videos/550e8400....mp4",
        "thumbnail_url": "https://cdn.example.com/thumbnails/550e8400....jpg"
    },
    "timestamp": "2026-01-28T10:30:45Z"
}
```

---

## Core Algorithms

### Algorithm 1: DiT Forward Pass with Temporal Attention

```
ALGORITHM DiTTemporalForward

PURPOSE:
    Perform a single denoising step through the DiT model
    with temporal attention for video consistency

INPUT:
    latent_video: Tensor[batch, frames, height, width, channels]
    timestep: Float (noise level, 0-1)
    text_embeddings: Tensor[batch, seq_len, embed_dim]
    guidance_scale: Float

CONSTANTS:
    patch_size = (1, 2, 2)  // temporal, spatial, spatial
    num_dit_blocks = 28
    hidden_dim = 4096
    num_heads = 32

FUNCTION patchify_3d(video, patch_size):
    // Convert video to sequence of 3D patches
    B, T, H, W, C = video.shape
    pt, ph, pw = patch_size

    num_patches_t = T // pt
    num_patches_h = H // ph
    num_patches_w = W // pw
    num_patches = num_patches_t * num_patches_h * num_patches_w

    // Reshape: [B, T, H, W, C] -> [B, num_patches, patch_dim]
    patches = video.reshape(B, num_patches_t, pt,
                           num_patches_h, ph,
                           num_patches_w, pw, C)
    patches = patches.permute(0, 1, 3, 5, 2, 4, 6, 7)
    patches = patches.reshape(B, num_patches, pt * ph * pw * C)

    RETURN patches, (num_patches_t, num_patches_h, num_patches_w)

FUNCTION add_positional_encoding(patches, shape):
    B, N, D = patches.shape
    nt, nh, nw = shape

    // Separate spatial and temporal positional encodings
    spatial_pos = learnable_embedding(nh * nw, D)
    temporal_pos = learnable_embedding(nt, D)

    // Combine: broadcast temporal across spatial positions
    pos_encoding = spatial_pos.unsqueeze(0) + temporal_pos.unsqueeze(1)
    pos_encoding = pos_encoding.reshape(1, N, D)

    RETURN patches + pos_encoding

FUNCTION temporal_self_attention(x, causal=False):
    // x: [B, T, S, D] where S = spatial patches per frame
    B, T, S, D = x.shape

    // Reshape for temporal attention: each spatial position attends across time
    x_temporal = x.permute(0, 2, 1, 3)  // [B, S, T, D]
    x_temporal = x_temporal.reshape(B * S, T, D)

    Q = linear_q(x_temporal)
    K = linear_k(x_temporal)
    V = linear_v(x_temporal)

    // Attention scores
    scores = Q @ K.transpose(-2, -1) / sqrt(D // num_heads)

    IF causal:
        // Mask future frames
        mask = create_causal_mask(T)
        scores = scores + mask  // -inf for masked positions

    attn_weights = softmax(scores, dim=-1)
    out = attn_weights @ V

    // Reshape back
    out = out.reshape(B, S, T, D).permute(0, 2, 1, 3)

    RETURN out

FUNCTION dit_block(x, text_embed, timestep, block_idx):
    // x: [B, N, D] where N = total patches

    // 1. Self-attention (spatial, within each frame)
    x_spatial = reshape_to_frames(x)  // [B, T, S, D]
    x_spatial = layer_norm(x_spatial)
    x_spatial = spatial_self_attention(x_spatial)
    x = x + x_spatial.reshape(B, N, D)

    // 2. Temporal attention (TSAM, across frames)
    x_temporal = reshape_to_frames(x)
    x_temporal = layer_norm(x_temporal)
    x_temporal = temporal_self_attention(x_temporal, causal=use_causal)
    x = x + x_temporal.reshape(B, N, D)

    // 3. Cross-attention with text
    x_cross = layer_norm(x)
    x_cross = cross_attention(x_cross, text_embed)
    x = x + x_cross

    // 4. Feed-forward with AdaLN (timestep conditioning)
    scale, shift = adaln_modulation(timestep, block_idx)
    x_ff = layer_norm(x) * (1 + scale) + shift
    x_ff = mlp(x_ff)  // [D -> 4D -> D]
    x = x + x_ff

    RETURN x

FUNCTION forward(latent_video, timestep, text_embeddings, guidance_scale):
    // Classifier-free guidance: run twice (conditional and unconditional)

    // 1. Patchify video
    patches, shape = patchify_3d(latent_video, patch_size)

    // 2. Add positional encoding
    patches = add_positional_encoding(patches, shape)

    // 3. Pass through DiT blocks
    x = patches
    FOR i IN range(num_dit_blocks):
        x = dit_block(x, text_embeddings, timestep, i)

    // 4. Unpatchify
    output = unpatchify_3d(x, shape, patch_size)

    // 5. Classifier-free guidance (if guidance_scale > 1)
    IF guidance_scale > 1:
        // Run unconditional pass with null text
        uncond_output = forward_uncond(latent_video, timestep)
        output = uncond_output + guidance_scale * (output - uncond_output)

    RETURN output
```

### Algorithm 2: Flow Matching Sampling

```
ALGORITHM FlowMatchingSampling

PURPOSE:
    Generate video by solving the ODE from noise to data
    using flow matching (deterministic, fewer steps)

INPUT:
    prompt_embeddings: Tensor
    config: GenerationConfig

OUTPUT:
    video_latent: Tensor[batch, frames, height, width, channels]

FUNCTION generate_video(prompt_embeddings, config):
    // Initialize with Gaussian noise
    latent = torch.randn(
        config.batch_size,
        config.frames // temporal_compression,
        config.height // spatial_compression,
        config.width // spatial_compression,
        latent_channels
    )

    // Time steps from 1 (noise) to 0 (data)
    // Flow matching convention: t=1 is noise, t=0 is clean
    timesteps = linspace(1.0, 0.0, config.num_steps + 1)

    FOR i IN range(config.num_steps):
        t_current = timesteps[i]
        t_next = timesteps[i + 1]
        dt = t_current - t_next  // positive

        // Predict velocity field v(x, t)
        velocity = dit_model(latent, t_current, prompt_embeddings)

        // Euler step: x_{t-dt} = x_t - v * dt
        // (moving from noise toward data)
        latent = latent - velocity * dt

        // Optional: Higher-order solver (Heun's method)
        IF use_heun AND i < config.num_steps - 1:
            velocity_next = dit_model(latent, t_next, prompt_embeddings)
            latent_corrected = latent_prev - 0.5 * (velocity + velocity_next) * dt
            latent = latent_corrected

        // Checkpoint every N steps
        IF i % checkpoint_interval == 0:
            save_checkpoint(latent, i, rng_state)

        // Report progress
        report_progress(i, config.num_steps)

    RETURN latent

COMPARISON Flow Matching vs DDPM:

    Flow Matching:
        - Forward: x_t = (1-t)*x_0 + t*noise  (linear interpolation)
        - Velocity: v = noise - x_0
        - Sampling: ODE solver (Euler, Heun, RK4)
        - Steps: 10-50 typical

    DDPM:
        - Forward: x_t = sqrt(alpha_t)*x_0 + sqrt(1-alpha_t)*noise
        - Prediction: epsilon (noise) or v (velocity)
        - Sampling: SDE or DDIM
        - Steps: 20-100 typical
```

### Algorithm 3: 3D VAE Decoding

```
ALGORITHM Video3DVAEDecode

PURPOSE:
    Decode 3D latent representation back to video frames
    using causal 3D convolutions for temporal consistency

INPUT:
    latent: Tensor[batch, T_latent, H_latent, W_latent, latent_dim]

OUTPUT:
    video: Tensor[batch, T, H, W, 3]

CONSTANTS:
    temporal_upsample_factor = 4
    spatial_upsample_factor = 8

FUNCTION causal_conv3d(x, weights, padding):
    // Causal: only use past frames for current frame
    // Pad temporally only on the left (past)
    B, T, H, W, C = x.shape

    // Zero-pad temporal dimension on left only
    x_padded = pad(x, (0, 0, 0, 0, 0, 0, padding, 0, 0, 0))

    // Apply 3D convolution
    output = conv3d(x_padded, weights)

    RETURN output

FUNCTION temporal_upsample(x, factor):
    // Upsample temporal dimension
    B, T, H, W, C = x.shape

    // Learned temporal upsampling (not just interpolation)
    x_up = conv_transpose_temporal(x, factor)

    // Apply temporal refinement
    x_up = causal_conv3d(x_up, refine_weights, padding=1)

    RETURN x_up

FUNCTION spatial_upsample(x, factor):
    // Standard spatial upsampling
    B, T, H, W, C = x.shape

    // Nearest-neighbor upsample
    x_up = interpolate(x, scale_factor=(1, factor, factor))

    // Convolutional refinement
    x_up = conv2d_per_frame(x_up, refine_weights)

    RETURN x_up

FUNCTION decode(latent):
    x = latent  // [B, T/4, H/8, W/8, latent_dim]

    // Initial projection
    x = linear(x)  // [B, T/4, H/8, W/8, hidden_dim]

    // Decoder blocks with progressive upsampling
    // Each block: residual + attention + upsample

    // Block 1: Temporal attention + spatial upsample 2x
    x = residual_block(x)
    x = temporal_attention(x)
    x = spatial_upsample(x, 2)  // [B, T/4, H/4, W/4, hidden_dim]

    // Block 2: Temporal attention + spatial upsample 2x
    x = residual_block(x)
    x = temporal_attention(x)
    x = spatial_upsample(x, 2)  // [B, T/4, H/2, W/2, hidden_dim]

    // Block 3: Temporal upsample 2x + spatial upsample 2x
    x = residual_block(x)
    x = temporal_upsample(x, 2)  // [B, T/2, H/2, W/2, hidden_dim]
    x = spatial_upsample(x, 2)   // [B, T/2, H, W, hidden_dim]

    // Block 4: Temporal upsample 2x
    x = residual_block(x)
    x = temporal_upsample(x, 2)  // [B, T, H, W, hidden_dim]

    // Final projection to RGB
    video = conv2d_per_frame(x, final_weights)  // [B, T, H, W, 3]
    video = tanh(video)  // Normalize to [-1, 1]
    video = (video + 1) / 2  // Rescale to [0, 1]

    RETURN video
```

### Algorithm 4: TurboDiffusion Acceleration

```
ALGORITHM TurboDiffusion

PURPOSE:
    Achieve 100-200x speedup through distillation and optimization
    enabling real-time video generation (5s video in 1.9s)

TECHNIQUES:
    1. Step distillation via rCM (recurrent Consistency Models)
    2. Sparse-Linear Attention (SLA)
    3. W8A8 quantization

FUNCTION train_turbo_model(teacher_model, dataset):
    // Progressive distillation: 50 steps -> 25 -> 12 -> 6 -> 4

    current_steps = 50
    student_model = copy(teacher_model)

    WHILE current_steps > 4:
        target_steps = current_steps // 2

        FOR batch IN dataset:
            // Teacher generates with current_steps
            teacher_output = teacher_model.generate(batch, steps=current_steps)

            // Student learns to match in fewer steps
            student_output = student_model.generate(batch, steps=target_steps)

            // Distillation loss
            loss = mse_loss(student_output, teacher_output)
            loss += perceptual_loss(student_output, teacher_output)

            // Adversarial loss for single-step quality
            IF target_steps <= 8:
                loss += adversarial_loss(student_output, discriminator)

            student_model.backward(loss)

        current_steps = target_steps
        teacher_model = copy(student_model)

    RETURN student_model

FUNCTION sparse_linear_attention(x, sparsity=0.9):
    // Replace dense attention with sparse + linear combination

    B, N, D = x.shape

    // Standard attention
    Q, K, V = linear_qkv(x)
    attn_scores = Q @ K.T / sqrt(D)

    // Top-k sparsification
    k = int(N * (1 - sparsity))
    top_k_indices = topk(attn_scores, k, dim=-1)
    sparse_scores = scatter(attn_scores, top_k_indices)

    // Linear attention component (O(N) not O(N^2))
    linear_out = elu(Q) @ (elu(K).T @ V)

    // Combine sparse and linear
    sparse_out = softmax(sparse_scores) @ V
    output = learnable_gate * sparse_out + (1 - learnable_gate) * linear_out

    RETURN output

FUNCTION quantize_model(model, bits=8):
    // W8A8: 8-bit weights and activations

    FOR layer IN model.linear_layers:
        // Calibrate scale factors
        scale_w = max(abs(layer.weight)) / 127
        scale_a = estimate_activation_range(layer)

        // Quantize weights
        layer.weight_int8 = round(layer.weight / scale_w)
        layer.scale_w = scale_w
        layer.scale_a = scale_a

    RETURN quantized_model

FUNCTION turbo_generate(prompt, num_steps=4):
    // Real-time generation with TurboDiffusion

    latent = torch.randn(...)
    timesteps = linspace(1, 0, num_steps + 1)

    FOR i IN range(num_steps):
        t = timesteps[i]
        dt = timesteps[i] - timesteps[i + 1]

        // Use quantized model with sparse attention
        velocity = turbo_model(latent, t, prompt)

        // Larger step size (dt = 0.25 for 4 steps)
        latent = latent - velocity * dt

    RETURN latent

PERFORMANCE:
    Baseline (50 steps): 45s for 10s video
    TurboDiffusion (4 steps): 1.8s for 5s video
    Speedup: 100-200x
    Quality: ~95% of baseline (acceptable for real-time)
```

### Algorithm 5: Temporal Self-Attention Module (TSAM)

```
ALGORITHM TemporalSelfAttentionModule

PURPOSE:
    Maintain temporal consistency across video frames
    by allowing each spatial position to attend across all frames

INPUT:
    frames: Tensor[batch, num_frames, spatial_tokens, dim]

OUTPUT:
    attended_frames: Tensor[batch, num_frames, spatial_tokens, dim]

FUNCTION tsam_full_attention(frames):
    // Full temporal attention: each position sees all frames
    // Complexity: O(T^2 * S) where T=frames, S=spatial tokens

    B, T, S, D = frames.shape

    // Reshape: treat spatial as batch, attend across time
    x = frames.permute(0, 2, 1, 3)  // [B, S, T, D]
    x = x.reshape(B * S, T, D)

    Q = linear_q(x)  // [B*S, T, D]
    K = linear_k(x)
    V = linear_v(x)

    // Full attention across all frames
    attn_scores = Q @ K.transpose(-2, -1) / sqrt(D)
    attn_weights = softmax(attn_scores, dim=-1)
    output = attn_weights @ V

    // Reshape back
    output = output.reshape(B, S, T, D).permute(0, 2, 1, 3)

    RETURN output

FUNCTION tsam_causal_attention(frames):
    // Causal temporal attention: each frame sees only past frames
    // Enables streaming generation
    // Complexity: O(T * S) per new frame

    B, T, S, D = frames.shape
    x = frames.permute(0, 2, 1, 3).reshape(B * S, T, D)

    Q = linear_q(x)
    K = linear_k(x)
    V = linear_v(x)

    // Create causal mask
    causal_mask = torch.triu(
        torch.ones(T, T) * float('-inf'),
        diagonal=1
    )

    attn_scores = Q @ K.transpose(-2, -1) / sqrt(D)
    attn_scores = attn_scores + causal_mask
    attn_weights = softmax(attn_scores, dim=-1)
    output = attn_weights @ V

    output = output.reshape(B, S, T, D).permute(0, 2, 1, 3)

    RETURN output

FUNCTION tsam_sliding_window(frames, window_size=16, anchor_interval=32):
    // Sliding window + anchor frames for very long videos
    // Complexity: O(T * W) where W = window_size

    B, T, S, D = frames.shape
    output = torch.zeros_like(frames)

    // Select anchor frames (every anchor_interval)
    anchor_indices = range(0, T, anchor_interval)
    anchor_frames = frames[:, anchor_indices, :, :]

    FOR t IN range(T):
        // Window: [max(0, t-window_size), t]
        window_start = max(0, t - window_size)
        window_frames = frames[:, window_start:t+1, :, :]

        // Combine with anchor frames
        context = concat(anchor_frames, window_frames)

        // Attend current frame to context
        q = frames[:, t:t+1, :, :]
        k, v = context, context

        attended = cross_attention(q, k, v)
        output[:, t, :, :] = attended.squeeze(1)

    RETURN output

VISUALIZATION:

    Full Attention (short videos):
    Frame:  1  2  3  4  5
    F1:     x  x  x  x  x    (attends to all)
    F2:     x  x  x  x  x
    F3:     x  x  x  x  x
    F4:     x  x  x  x  x
    F5:     x  x  x  x  x

    Causal Attention (streaming):
    Frame:  1  2  3  4  5
    F1:     x  -  -  -  -    (attends to past only)
    F2:     x  x  -  -  -
    F3:     x  x  x  -  -
    F4:     x  x  x  x  -
    F5:     x  x  x  x  x

    Sliding Window + Anchors (long videos):
    Frame:  A1 2  3  4  A5 6  7  8  A9
    F8:     x  -  -  x  x  x  x  x  -    (window + anchors)
```

### Algorithm 6: Audio-Video Synchronization (Veo 3 Style)

```
ALGORITHM AudioVideoSync

PURPOSE:
    Generate synchronized audio alongside video
    including speech with lip-sync and ambient sounds

INPUT:
    video_latent: Tensor[batch, frames, height, width, channels]
    text_prompt: String
    audio_config: AudioConfig

OUTPUT:
    audio_waveform: Tensor[batch, samples]
    lip_sync_metadata: List[LipSyncFrame]

FUNCTION generate_synchronized_audio(video_latent, text_prompt, config):
    // Extract video features for audio conditioning
    video_features = video_feature_extractor(video_latent)

    // Parse prompt for audio elements
    audio_prompts = parse_audio_cues(text_prompt)
    // e.g., "person speaking", "wind blowing", "birds chirping"

    // Encode audio prompts
    audio_text_embed = audio_text_encoder(audio_prompts)

    // Joint audio-video latent space (Veo 3 approach)
    joint_latent = joint_encoder(video_features, audio_text_embed)

    // Generate audio latent using DiT
    audio_latent = audio_dit(joint_latent, num_steps=50)

    // Decode to waveform
    audio_waveform = audio_vae_decode(audio_latent)

    // Lip-sync post-processing
    IF config.include_speech:
        // Detect face regions in video
        face_regions = face_detector(video_latent)

        // Generate phoneme timings from audio
        phonemes = speech_to_phoneme(audio_waveform)

        // Align lips to phonemes
        lip_sync_metadata = align_lips(face_regions, phonemes)

        // Optionally refine video for better lip-sync
        IF config.refine_lips:
            video_latent = lip_refiner(video_latent, lip_sync_metadata)

    RETURN audio_waveform, lip_sync_metadata

FUNCTION lip_sync_alignment(audio_segment, video_frames):
    // Ensure lip movements match speech within 120ms

    // Extract audio features (mel spectrogram)
    mel_spec = audio_to_mel(audio_segment)

    // Extract lip motion features from video
    lip_features = lip_extractor(video_frames)

    // Compute sync score
    sync_score = cross_correlation(mel_spec, lip_features)

    // Adjust timing if needed
    IF sync_score < threshold:
        offset = find_optimal_offset(mel_spec, lip_features)
        adjusted_audio = time_shift(audio_segment, offset)
        RETURN adjusted_audio

    RETURN audio_segment

ARCHITECTURE (Veo 3 style):

    Video DiT (30B+ params)
         │
         ├── 3D Conv Encoder
         │        │
         │   Video Latent Space
         │        │
         └────────┼────────┐
                  │        │
           Joint Attention │
                  │        │
         ┌───────┴────────┘
         │
    Audio DiT (9B params)
         │
         ├── Temporal Audio Latent
         │
    Audio VAE Decoder
         │
    Final Waveform (lip-synced)

METRICS:
    Lip-sync accuracy: <120ms
    Audio-video sync: <50ms
    Speech intelligibility: >95%
```

---

## Database Schema

### PostgreSQL Schema

```sql
-- Video generation requests
CREATE TABLE video_generations (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    tier VARCHAR(16) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100,

    -- Prompt configuration
    text_prompt TEXT NOT NULL,
    negative_prompt TEXT,
    first_frame_image_url TEXT,
    style_preset VARCHAR(64),

    -- Generation configuration
    model VARCHAR(32) NOT NULL,
    duration_seconds NUMERIC(5,2) NOT NULL,
    fps INTEGER NOT NULL DEFAULT 24,
    resolution VARCHAR(16) NOT NULL,
    aspect_ratio VARCHAR(8) NOT NULL DEFAULT '16:9',
    num_inference_steps INTEGER NOT NULL DEFAULT 50,
    guidance_scale NUMERIC(4,2) NOT NULL DEFAULT 7.5,
    seed BIGINT,
    enable_audio BOOLEAN NOT NULL DEFAULT false,

    -- Progress tracking
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER,
    current_phase VARCHAR(32),

    -- Output
    video_url TEXT,
    thumbnail_url TEXT,
    audio_url TEXT,
    c2pa_manifest_url TEXT,
    video_size_bytes BIGINT,
    generation_time_ms INTEGER,

    -- Safety
    pre_gen_safety_score NUMERIC(4,3),
    post_gen_safety_score NUMERIC(4,3),
    blocked_reason TEXT,

    -- Billing
    credits_used NUMERIC(10,4),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Indexes
    CONSTRAINT valid_status CHECK (status IN (
        'PENDING', 'ENCODING', 'QUEUED', 'ASSIGNED', 'GENERATING',
        'VAE_DECODING', 'AUDIO_GENERATING', 'SAFETY_CHECKING',
        'TRANSCODING', 'UPLOADING', 'COMPLETED', 'FAILED', 'CANCELLED', 'BLOCKED'
    ))
);

CREATE INDEX idx_video_generations_user_id ON video_generations(user_id);
CREATE INDEX idx_video_generations_status ON video_generations(status);
CREATE INDEX idx_video_generations_created_at ON video_generations(created_at DESC);
CREATE INDEX idx_video_generations_user_status ON video_generations(user_id, status);

-- Checkpoints for recovery
CREATE TABLE video_checkpoints (
    checkpoint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES video_generations(request_id),
    worker_id VARCHAR(64) NOT NULL,
    step_number INTEGER NOT NULL,
    total_steps INTEGER NOT NULL,

    -- Storage paths
    latent_local_path TEXT NOT NULL,
    latent_remote_path TEXT,
    synced_to_remote BOOLEAN DEFAULT false,

    -- State
    latent_shape JSONB NOT NULL,
    rng_state_path TEXT,
    scheduler_state JSONB,

    -- Metadata
    size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_request_step UNIQUE (request_id, step_number)
);

CREATE INDEX idx_checkpoints_request_id ON video_checkpoints(request_id);
CREATE INDEX idx_checkpoints_created_at ON video_checkpoints(created_at);

-- GPU worker registry
CREATE TABLE gpu_workers (
    worker_id VARCHAR(64) PRIMARY KEY,
    pod_name VARCHAR(128) NOT NULL,
    node_name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'IDLE',

    -- Hardware info
    gpu_type VARCHAR(32) NOT NULL,
    gpu_count INTEGER NOT NULL,
    gpu_memory_total_gb NUMERIC(5,2) NOT NULL,

    -- Loaded models
    loaded_models JSONB,

    -- Current job
    current_request_id UUID REFERENCES video_generations(request_id),
    current_job_started_at TIMESTAMP WITH TIME ZONE,

    -- Health
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    jobs_completed_today INTEGER DEFAULT 0,
    error_count_today INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workers_status ON gpu_workers(status);
CREATE INDEX idx_workers_heartbeat ON gpu_workers(last_heartbeat);

-- Safety audit log
CREATE TABLE safety_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES video_generations(request_id),
    check_type VARCHAR(32) NOT NULL,  -- 'PRE_GEN', 'POST_GEN'

    -- Results
    passed BOOLEAN NOT NULL,
    safety_score NUMERIC(4,3),
    flagged_categories JSONB,

    -- Details
    model_version VARCHAR(64),
    processing_time_ms INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_safety_audit_request ON safety_audit_log(request_id);
CREATE INDEX idx_safety_audit_failed ON safety_audit_log(passed) WHERE passed = false;
```

---

## Message Formats

### Job Queue Message (Redis Streams)

```json
{
    "message_id": "1706437800000-0",
    "stream": "video_generation_jobs",
    "data": {
        "request_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "user_123",
        "tier": "STANDARD",
        "priority": 50,
        "model": "MOCHI1",
        "prompt_embedding_path": "s3://embeddings/550e8400.pt",
        "config": {
            "duration_seconds": 10,
            "resolution": "1080P",
            "num_steps": 50,
            "enable_audio": false
        },
        "enqueued_at": "2026-01-28T10:30:00Z"
    }
}
```

### Progress Update Message (WebSocket)

```json
{
    "type": "progress",
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "GENERATING",
    "progress": {
        "step": 30,
        "total_steps": 50,
        "percent": 60,
        "phase": "dit_inference",
        "eta_seconds": 18,
        "checkpoint_available": true
    },
    "worker": {
        "worker_id": "worker-pod-1",
        "gpu_utilization": 0.95
    },
    "timestamp": "2026-01-28T10:30:25Z"
}
```

### Checkpoint Notification Message

```json
{
    "type": "checkpoint_saved",
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "checkpoint": {
        "checkpoint_id": "cp-001",
        "step": 30,
        "total_steps": 50,
        "local_path": "/nvme/checkpoints/550e8400/step_30.pt",
        "size_bytes": 524288000,
        "synced_to_remote": false
    },
    "timestamp": "2026-01-28T10:30:25Z"
}
```
