# Low-Level Design

## Data Models

### Generation Request

```
GenerationRequest:
    # Identifiers
    request_id:         UUID                    # Unique request identifier
    user_id:            String                  # User/account identifier
    organization_id:    String (optional)       # Enterprise tenant

    # Status tracking
    status:             Enum[
                            PENDING,            # In queue
                            ENCODING,           # Prompt processing
                            QUEUED,             # Waiting for GPU
                            ASSIGNED,           # GPU worker assigned
                            GENERATING,         # Diffusion in progress
                            SAFETY_CHECK,       # Post-gen safety
                            UPLOADING,          # CDN upload
                            COMPLETED,          # Success
                            FAILED,             # Error occurred
                            BLOCKED             # Safety blocked
                        ]
    tier:               Enum[TURBO, FAST, RELAX]
    priority:           Int                     # Computed priority score

    # Timestamps
    created_at:         Timestamp
    queued_at:          Timestamp
    started_at:         Timestamp (nullable)
    completed_at:       Timestamp (nullable)

    # Prompt configuration
    prompt_config:
        positive_prompt:    String              # Main generation prompt
        negative_prompt:    String              # Elements to avoid
        style_preset:       String (optional)   # Predefined style vector
        prompt_weights:     Map[String, Float]  # Token-level weights

    # Generation parameters
    generation_config:
        model:              Enum[SDXL_1_0, SD3_MEDIUM, FLUX_DEV, FLUX_SCHNELL]
        scheduler:          Enum[DDIM, DPM_PP_2M, DPM_PP_2M_KARRAS, EULER_A, LCM]
        num_inference_steps: Int                # 4-75, default 30
        guidance_scale:     Float               # CFG scale, 1.0-20.0
        seed:               Int (optional)      # -1 for random
        width:              Int                 # 512, 768, 1024, 2048
        height:             Int                 # Same options
        batch_size:         Int                 # 1-4 images

    # Adapter configuration
    adapter_config:
        lora_models:        List[LoRAConfig]    # Max 4
        controlnet:         ControlNetConfig (optional)
        ip_adapter:         IPAdapterConfig (optional)

    # Output
    output:
        images:             List[GeneratedImage]
        generation_time_ms: Int
        model_load_time_ms: Int
        safety_time_ms:     Int
        total_time_ms:      Int

    # Retry handling
    retry_count:        Int                     # 0-3
    last_error:         String (nullable)
    worker_id:          UUID (nullable)         # Assigned worker

LoRAConfig:
    model_name:         String                  # Registry identifier
    weight:             Float                   # 0.0-2.0, default 1.0

ControlNetConfig:
    type:               Enum[CANNY, DEPTH, POSE, TILE, SCRIBBLE, LINEART]
    conditioning_image: Bytes                   # Preprocessed or raw
    strength:           Float                   # 0.0-2.0, default 1.0
    start_percent:      Float                   # When to start conditioning
    end_percent:        Float                   # When to stop conditioning

IPAdapterConfig:
    reference_image:    Bytes
    strength:           Float                   # 0.0-1.0

GeneratedImage:
    image_id:           UUID
    url:                String                  # CDN URL
    thumbnail_url:      String                  # Small preview
    width:              Int
    height:             Int
    format:             Enum[PNG, WEBP, AVIF]
    size_bytes:         Int
    seed:               Int                     # Actual seed used
    safety_score:       Float                   # 0.0-1.0 (1.0 = safe)
    nsfw_scores:        Map[String, Float]      # Category breakdown
    watermark_id:       String                  # Provenance tracking
```

### GPU Worker State

```
GPUWorkerState:
    # Identifiers
    worker_id:          UUID
    hostname:           String
    region:             String
    availability_zone:  String

    # Hardware
    gpu_type:           Enum[A10G, L4, A100_40GB, A100_80GB, H100]
    gpu_index:          Int                     # For multi-GPU nodes
    vram_total_gb:      Int
    vram_used_gb:       Float
    vram_available_gb:  Float

    # Loaded models
    loaded_models:
        base_model:     String (nullable)       # SDXL, SD3, etc.
        base_model_hash: String                 # Verify integrity
        loras:          List[LoadedLoRA]
        controlnets:    List[String]
        vae:            String
        text_encoders:  List[String]

    # Status
    status:             Enum[
                            INITIALIZING,
                            IDLE,
                            LOADING_MODEL,
                            GENERATING,
                            UNLOADING,
                            UNHEALTHY,
                            DRAINING
                        ]
    current_request_id: UUID (nullable)
    current_step:       Int (nullable)          # Denoising progress
    total_steps:        Int (nullable)

    # Health metrics
    last_heartbeat:     Timestamp
    requests_completed: Int
    requests_failed:    Int
    avg_generation_ms:  Float
    uptime_seconds:     Int

    # Pool assignment
    pool:               Enum[WARM, COLD, RESERVED]
    tier_assignment:    Enum[TURBO, FAST, RELAX, ANY]

LoadedLoRA:
    name:               String
    weight:             Float
    merged:             Boolean                 # True if merged into base weights
```

### Model Cache Entry

```
ModelCacheEntry:
    # Identifiers
    model_id:           String                  # Unique identifier
    model_type:         Enum[BASE, LORA, CONTROLNET, VAE, TEXT_ENCODER]
    version:            String

    # Storage
    file_path:          String                  # Local path on worker
    registry_path:      String                  # S3/GCS path
    checksum:           String                  # SHA256

    # Size and performance
    file_size_bytes:    Int
    vram_size_bytes:    Int                     # When loaded
    load_time_ms:       Int                     # Typical load time

    # Usage tracking
    last_used:          Timestamp
    use_count:          Int
    popularity_score:   Float                   # For eviction decisions

    # Cache policy
    priority:           Int                     # Higher = less likely to evict
    pinned:             Boolean                 # Never evict if true
    preload:            Boolean                 # Load on worker startup
```

### Queue Entry

```
QueueEntry:
    request_id:         UUID
    user_id:            String
    tier:               Enum[TURBO, FAST, RELAX]

    # Priority calculation
    base_priority:      Int                     # From tier (0, 1, 2)
    wait_time_bonus:    Int                     # Increases over time
    final_priority:     Int                     # base + bonus

    # Timestamps
    enqueued_at:        Timestamp
    promoted_at:        Timestamp (nullable)    # If moved up for fairness

    # Requirements (for worker matching)
    required_model:     String
    required_vram_gb:   Float
    required_adapters:  List[String]

    # Position tracking
    position:           Int                     # Queue position
    estimated_wait_ms:  Int
```

---

## API Design

### Create Generation

**POST /v1/generations**

```
Request:
{
    "prompt": "A majestic dragon flying over a medieval castle at sunset, detailed scales, volumetric lighting",
    "negative_prompt": "blurry, low quality, distorted, watermark",
    "model": "sdxl-1.0",
    "width": 1024,
    "height": 1024,
    "num_inference_steps": 30,
    "guidance_scale": 7.5,
    "scheduler": "dpm_pp_2m_karras",
    "seed": -1,
    "batch_size": 1,
    "loras": [
        {"name": "detail-enhancer-v2", "weight": 0.8}
    ],
    "controlnet": {
        "type": "depth",
        "image": "<base64_encoded_image>",
        "strength": 0.7
    },
    "tier": "fast",
    "webhook_url": "https://example.com/webhook"
}

Response (202 Accepted):
{
    "request_id": "gen-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "queued",
    "tier": "fast",
    "queue_position": 15,
    "estimated_wait_seconds": 45,
    "poll_url": "/v1/generations/gen-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "created_at": "2024-01-15T10:30:00Z"
}

Error Response (400 Bad Request):
{
    "error": {
        "code": "PROMPT_BLOCKED",
        "message": "Prompt contains content that violates our safety policy",
        "details": {
            "category": "violence",
            "confidence": 0.92
        }
    }
}
```

### Get Generation Status

**GET /v1/generations/{request_id}**

```
Response (In Progress):
{
    "request_id": "gen-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "generating",
    "progress": {
        "current_step": 15,
        "total_steps": 30,
        "percentage": 50
    },
    "queue_position": null,
    "estimated_completion_seconds": 8
}

Response (Completed):
{
    "request_id": "gen-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "completed",
    "images": [
        {
            "image_id": "img-xyz789",
            "url": "https://cdn.example.com/images/img-xyz789.webp",
            "thumbnail_url": "https://cdn.example.com/thumbs/img-xyz789.webp",
            "width": 1024,
            "height": 1024,
            "format": "webp",
            "size_bytes": 524288,
            "seed": 42,
            "safety_score": 0.98
        }
    ],
    "metadata": {
        "model": "sdxl-1.0",
        "generation_time_ms": 8500,
        "total_time_ms": 12000
    },
    "created_at": "2024-01-15T10:30:00Z",
    "completed_at": "2024-01-15T10:30:12Z"
}

Response (Blocked):
{
    "request_id": "gen-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "blocked",
    "block_reason": {
        "stage": "post_generation",
        "category": "nsfw",
        "message": "Generated image was flagged by our safety system"
    }
}
```

### Cancel Generation

**DELETE /v1/generations/{request_id}**

```
Response (200 OK):
{
    "request_id": "gen-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "cancelled",
    "refunded": true
}

Response (409 Conflict):
{
    "error": {
        "code": "CANNOT_CANCEL",
        "message": "Generation has already completed or is in final stages"
    }
}
```

### List User Generations

**GET /v1/generations?limit=20&offset=0&status=completed**

```
Response:
{
    "generations": [
        {
            "request_id": "gen-a1b2c3d4",
            "status": "completed",
            "thumbnail_url": "https://cdn.example.com/thumbs/...",
            "created_at": "2024-01-15T10:30:00Z"
        },
        // ...
    ],
    "pagination": {
        "total": 156,
        "limit": 20,
        "offset": 0,
        "has_more": true
    }
}
```

### Webhook Payload

```
POST {webhook_url}

{
    "event": "generation.completed",
    "timestamp": "2024-01-15T10:30:12Z",
    "data": {
        "request_id": "gen-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "status": "completed",
        "images": [
            {
                "url": "https://cdn.example.com/images/...",
                "seed": 42
            }
        ]
    },
    "signature": "sha256=abc123..."
}
```

---

## Core Algorithms

### Algorithm 1: GPU Worker Assignment

```
ALGORITHM AssignGPUWorker

INPUT: GenerationRequest request
OUTPUT: GPUWorker or QUEUE

CONSTANTS:
    VRAM_SAFETY_MARGIN = 0.1  # 10% buffer

FUNCTION find_optimal_worker(request):
    required_vram = calculate_vram_requirement(request)
    required_models = extract_model_requirements(request)

    # Score all available workers
    candidates = []

    FOR worker IN get_workers_by_tier(request.tier):
        IF worker.status != IDLE:
            CONTINUE

        IF worker.vram_available_gb < required_vram * (1 + VRAM_SAFETY_MARGIN):
            CONTINUE

        score = calculate_worker_score(worker, required_models, required_vram)
        candidates.append((worker, score))

    IF candidates is empty:
        # Check cold pool
        FOR worker IN cold_pool:
            IF worker.status == IDLE AND worker.vram_total_gb >= required_vram:
                # Will need cold start
                RETURN (worker, COLD_START)

        RETURN QUEUE  # No available worker

    # Sort by score descending and return best
    candidates.sort(key=lambda x: x[1], reverse=True)
    RETURN (candidates[0][0], WARM_HIT)

FUNCTION calculate_worker_score(worker, required_models, required_vram):
    score = 0

    # Exact model match (highest priority)
    IF worker.loaded_models.base_model == required_models.base:
        score += 1000

    # LoRA already loaded
    FOR lora IN required_models.loras:
        IF lora IN worker.loaded_models.loras:
            score += 100

    # ControlNet already loaded
    IF required_models.controlnet IN worker.loaded_models.controlnets:
        score += 100

    # Prefer workers with more available VRAM (less fragmented)
    score += worker.vram_available_gb * 10

    # Prefer workers with lower recent utilization (spread load)
    score -= worker.requests_completed_last_hour * 0.1

    RETURN score

FUNCTION calculate_vram_requirement(request):
    base_vram = MODEL_VRAM_MAP[request.generation_config.model]

    # Adjust for resolution
    resolution_factor = (request.width * request.height) / (1024 * 1024)
    base_vram *= max(1.0, resolution_factor)

    # Add adapter overhead
    lora_vram = len(request.adapter_config.lora_models) * LORA_OVERHEAD_GB
    controlnet_vram = CONTROLNET_VRAM_GB IF request.adapter_config.controlnet ELSE 0

    # Batch size
    batch_overhead = (request.generation_config.batch_size - 1) * BATCH_OVERHEAD_GB

    RETURN base_vram + lora_vram + controlnet_vram + batch_overhead

MODEL_VRAM_MAP = {
    "SDXL_1_0": 10,
    "SD3_MEDIUM": 14,
    "FLUX_DEV": 20,
    "FLUX_SCHNELL": 18
}
LORA_OVERHEAD_GB = 0.2
CONTROLNET_VRAM_GB = 3
BATCH_OVERHEAD_GB = 2
```

### Algorithm 2: Fair Queue Scheduler

```
ALGORITHM FairQueueScheduler

CONSTANTS:
    TURBO_WEIGHT = 10
    FAST_WEIGHT = 5
    RELAX_WEIGHT = 1
    MAX_WAIT_SECONDS = {TURBO: 30, FAST: 120, RELAX: 300}
    STARVATION_BOOST = 100

FUNCTION schedule_next():
    queues = [turbo_queue, fast_queue, relax_queue]
    weights = [TURBO_WEIGHT, FAST_WEIGHT, RELAX_WEIGHT]

    # Phase 1: Check for starvation prevention
    FOR i, queue IN enumerate(queues):
        IF queue.is_empty():
            CONTINUE

        oldest = queue.peek()
        wait_time = now() - oldest.enqueued_at

        IF wait_time > MAX_WAIT_SECONDS[oldest.tier]:
            # Promote to prevent starvation
            entry = queue.pop()
            entry.promoted_at = now()
            log_starvation_promotion(entry)
            RETURN entry

    # Phase 2: Weighted random selection
    total_weight = 0
    FOR i, queue IN enumerate(queues):
        IF NOT queue.is_empty():
            total_weight += weights[i] * queue.size()

    IF total_weight == 0:
        RETURN None  # All queues empty

    random_pick = random() * total_weight
    cumulative = 0

    FOR i, queue IN enumerate(queues):
        IF queue.is_empty():
            CONTINUE

        queue_weight = weights[i] * queue.size()
        cumulative += queue_weight

        IF random_pick < cumulative:
            RETURN queue.pop()

    # Fallback (should not reach)
    RETURN get_any_non_empty_queue().pop()

FUNCTION enqueue(request):
    queue = get_queue_for_tier(request.tier)

    entry = QueueEntry(
        request_id=request.request_id,
        user_id=request.user_id,
        tier=request.tier,
        base_priority=TIER_PRIORITY_MAP[request.tier],
        enqueued_at=now(),
        required_model=request.generation_config.model,
        required_vram_gb=calculate_vram_requirement(request)
    )

    queue.push(entry)
    update_position_estimates(queue)

    RETURN entry.position

FUNCTION update_position_estimates(queue):
    avg_process_time = get_avg_process_time(queue.tier)
    active_workers = get_worker_count_for_tier(queue.tier)

    FOR i, entry IN enumerate(queue):
        entry.position = i + 1
        entry.estimated_wait_ms = (i / active_workers) * avg_process_time
```

### Algorithm 3: Diffusion Sampling with CFG

```
ALGORITHM DiffusionSamplingWithCFG

INPUT:
    prompt_embeds: Tensor[batch, seq_len, hidden_dim]
    negative_embeds: Tensor[batch, seq_len, hidden_dim]
    pooled_embeds: Tensor[batch, pooled_dim]
    num_steps: Int
    guidance_scale: Float
    scheduler: Scheduler
    seed: Int
    width: Int
    height: Int

OUTPUT:
    images: Tensor[batch, 3, height, width]

FUNCTION generate(prompt_embeds, negative_embeds, pooled_embeds,
                  num_steps, guidance_scale, scheduler, seed, width, height):

    # Set random seed for reproducibility
    set_seed(seed)

    # Initialize random latent in VAE latent space
    # Latent is 1/8 the resolution of output
    latent_height = height // 8
    latent_width = width // 8
    latent = torch.randn(batch_size, 4, latent_height, latent_width)

    # Scale initial noise by scheduler's initial sigma
    latent = latent * scheduler.init_noise_sigma

    # Set up scheduler timesteps
    scheduler.set_timesteps(num_steps)
    timesteps = scheduler.timesteps

    # Concatenate embeddings for CFG (unconditional + conditional)
    combined_embeds = torch.cat([negative_embeds, prompt_embeds], dim=0)
    combined_pooled = torch.cat([pooled_embeds_uncond, pooled_embeds], dim=0)

    # Denoising loop
    FOR i, t IN enumerate(timesteps):
        # Duplicate latent for CFG (both unconditional and conditional)
        latent_input = torch.cat([latent, latent], dim=0)

        # Scale latent if required by scheduler
        latent_input = scheduler.scale_model_input(latent_input, t)

        # UNet forward pass predicting noise
        noise_pred = unet(
            sample=latent_input,
            timestep=t,
            encoder_hidden_states=combined_embeds,
            added_cond_kwargs={"pooled_prompt_embeds": combined_pooled}
        )

        # Split predictions (unconditional, conditional)
        noise_pred_uncond, noise_pred_cond = noise_pred.chunk(2)

        # Apply classifier-free guidance
        # Amplifies difference between conditional and unconditional
        noise_pred = noise_pred_uncond + guidance_scale * (noise_pred_cond - noise_pred_uncond)

        # Scheduler step - remove predicted noise
        latent = scheduler.step(noise_pred, t, latent).prev_sample

        # Optional: Report progress
        report_progress(current_step=i+1, total_steps=num_steps)

    # Decode latent to pixel space using VAE
    latent = latent / vae.config.scaling_factor
    images = vae.decode(latent).sample

    # Post-process: clip to valid range and convert to uint8
    images = (images / 2 + 0.5).clamp(0, 1)
    images = (images * 255).round().to(torch.uint8)

    RETURN images
```

### Algorithm 4: LoRA Weight Merging

```
ALGORITHM LoRAWeightMerging

CONCEPT:
    LoRA (Low-Rank Adaptation) represents weight updates as:
    W' = W + alpha * (B @ A)

    Where:
    - W is original weight [out_features, in_features]
    - A is low-rank matrix [rank, in_features]
    - B is low-rank matrix [out_features, rank]
    - alpha is scaling factor
    - rank << min(out_features, in_features)

FUNCTION apply_lora(base_model, lora_configs):
    # Store original weights for later unmerging
    original_weights = {}

    FOR lora IN lora_configs:
        lora_state_dict = load_lora_weights(lora.name)
        alpha = lora.weight

        FOR name, param IN base_model.named_parameters():
            lora_key_A = f"{name}.lora_A"
            lora_key_B = f"{name}.lora_B"

            IF lora_key_A IN lora_state_dict:
                # Save original if not already saved
                IF name NOT IN original_weights:
                    original_weights[name] = param.data.clone()

                # Get LoRA matrices
                lora_A = lora_state_dict[lora_key_A]  # [rank, in_features]
                lora_B = lora_state_dict[lora_key_B]  # [out_features, rank]

                # Compute weight delta
                # delta = alpha * (B @ A)
                delta = alpha * torch.mm(lora_B, lora_A)

                # Apply to parameter
                param.data += delta

    RETURN original_weights

FUNCTION unmerge_lora(base_model, lora_configs, original_weights):
    # Restore original weights
    FOR name, original IN original_weights.items():
        param = get_parameter(base_model, name)
        param.data = original

    RETURN base_model

FUNCTION hot_swap_lora(base_model, old_loras, new_loras, original_weights):
    # Efficient swap: only unmerge what's changing

    # Find LoRAs to remove and add
    to_remove = set(old_loras) - set(new_loras)
    to_add = set(new_loras) - set(old_loras)
    unchanged = set(old_loras) & set(new_loras)

    IF to_remove:
        # Must unmerge all and re-merge (LoRA merging is not commutative)
        unmerge_lora(base_model, old_loras, original_weights)
        apply_lora(base_model, list(unchanged) + list(to_add))
    ELSE:
        # Only adding new LoRAs, can apply incrementally
        apply_lora(base_model, list(to_add))
```

### Algorithm 5: Content Safety Pipeline

```
ALGORITHM ContentSafetyPipeline

CONSTANTS:
    PROMPT_SAFETY_THRESHOLD = 0.85
    NSFW_THRESHOLD = 0.70
    VIOLENCE_THRESHOLD = 0.75
    CSAM_THRESHOLD = 0.01  # Extremely low tolerance
    BIAS_THRESHOLD = 0.80

FUNCTION pre_generation_check(prompt, negative_prompt, user_context):
    results = SafetyCheckResult()

    # Step 1: Blocklist matching (fastest)
    blocklist_match = blocklist_matcher.check(prompt)
    IF blocklist_match:
        results.blocked = True
        results.reason = f"Blocked term: {blocklist_match.category}"
        results.stage = "blocklist"
        RETURN results

    # Step 2: PromptGuard classifier
    prompt_safety = prompt_classifier.predict(prompt)
    IF prompt_safety.unsafe_score > PROMPT_SAFETY_THRESHOLD:
        results.blocked = True
        results.reason = f"Unsafe prompt: {prompt_safety.category}"
        results.confidence = prompt_safety.unsafe_score
        results.stage = "classifier"
        RETURN results

    # Step 3: Entity recognition (real people, minors)
    entities = entity_recognizer.extract(prompt)
    FOR entity IN entities:
        IF entity.type == "PERSON" AND entity.is_real_celebrity:
            IF contains_inappropriate_context(prompt, entity):
                results.blocked = True
                results.reason = "Inappropriate depiction of real person"
                results.stage = "entity_check"
                RETURN results

        IF entity.type == "AGE_INDICATOR" AND entity.suggests_minor:
            IF contains_adult_context(prompt):
                results.blocked = True
                results.reason = "Potential CSAM content"
                results.stage = "entity_check"
                results.escalate = True  # Require human review
                RETURN results

    results.blocked = False
    results.prompt_safety_score = 1 - prompt_safety.unsafe_score
    RETURN results

FUNCTION post_generation_check(image, prompt, request_id):
    results = SafetyCheckResult()

    # Step 1: CSAM detection (highest priority, parallel with others)
    csam_future = async csam_scanner.scan(image)

    # Step 2: NSFW classification (multi-class)
    nsfw_scores = nsfw_classifier.predict(image)
    # Returns: {sexual: 0.1, nudity: 0.05, suggestive: 0.2, ...}

    # Step 3: Violence detection
    violence_score = violence_classifier.predict(image)

    # Step 4: Bias detection (optional, for monitoring)
    bias_result = bias_detector.analyze(image, prompt)

    # Wait for CSAM result (critical)
    csam_score = await csam_future

    # Evaluate results (CSAM is immediate block)
    IF csam_score > CSAM_THRESHOLD:
        results.blocked = True
        results.reason = "CSAM detection triggered"
        results.stage = "csam"
        results.escalate = True
        results.requires_report = True  # Legal requirement
        log_critical_safety_event(request_id, "csam", csam_score)
        RETURN results

    # Check NSFW categories
    max_nsfw_category = max(nsfw_scores, key=nsfw_scores.get)
    IF nsfw_scores[max_nsfw_category] > NSFW_THRESHOLD:
        results.blocked = True
        results.reason = f"NSFW content: {max_nsfw_category}"
        results.confidence = nsfw_scores[max_nsfw_category]
        results.stage = "nsfw"
        RETURN results

    # Check violence
    IF violence_score > VIOLENCE_THRESHOLD:
        results.blocked = True
        results.reason = "Violent content detected"
        results.confidence = violence_score
        results.stage = "violence"
        RETURN results

    # Log bias for monitoring (don't block, just track)
    IF bias_result.bias_detected:
        log_bias_detection(request_id, bias_result)

    # All checks passed
    results.blocked = False
    results.safety_score = calculate_aggregate_safety(nsfw_scores, violence_score)
    results.nsfw_breakdown = nsfw_scores

    RETURN results

FUNCTION calculate_aggregate_safety(nsfw_scores, violence_score):
    # Weighted combination, higher = safer
    max_nsfw = max(nsfw_scores.values())
    safety = 1.0 - (0.6 * max_nsfw + 0.4 * violence_score)
    RETURN max(0.0, min(1.0, safety))
```

### Algorithm 6: VRAM Defragmentation

```
ALGORITHM VRAMDefragmentation

CONCEPT:
    VRAM fragmentation occurs when loading/unloading models leaves
    non-contiguous free regions. This can prevent loading large models
    even when total free VRAM is sufficient.

FUNCTION check_fragmentation(worker):
    # Get VRAM allocation map
    allocations = cuda_get_allocations(worker.gpu_index)

    # Find largest contiguous free region
    largest_free = find_largest_contiguous(allocations)
    total_free = worker.vram_available_gb

    # Fragmentation ratio: 1.0 = no fragmentation, 0.0 = severe
    fragmentation_ratio = largest_free / total_free IF total_free > 0 ELSE 1.0

    RETURN fragmentation_ratio

FUNCTION should_defragment(worker, threshold=0.7):
    fragmentation = check_fragmentation(worker)

    IF fragmentation < threshold AND worker.status == IDLE:
        RETURN True

    RETURN False

FUNCTION defragment_worker(worker):
    # Only run during idle periods
    IF worker.status != IDLE:
        RETURN False

    worker.status = UNLOADING

    # Step 1: Save current model configuration
    saved_config = {
        "base_model": worker.loaded_models.base_model,
        "loras": worker.loaded_models.loras,
        "vae": worker.loaded_models.vae
    }

    # Step 2: Unload everything
    unload_all_models(worker)

    # Step 3: Force CUDA memory cleanup
    torch.cuda.empty_cache()
    gc.collect()

    # Step 4: Reload models in optimal order (largest first)
    worker.status = LOADING_MODEL

    # Load base model first (largest)
    load_model(worker, saved_config.base_model)

    # Load VAE
    load_vae(worker, saved_config.vae)

    # Load LoRAs (if any were merged)
    FOR lora IN saved_config.loras:
        IF lora.merged:
            apply_lora(worker.model, [lora])

    worker.status = IDLE

    # Verify fragmentation improved
    new_fragmentation = check_fragmentation(worker)
    log_defragmentation_result(worker.worker_id, new_fragmentation)

    RETURN True

FUNCTION schedule_defragmentation():
    # Run during low-traffic periods
    IF NOT is_low_traffic_period():
        RETURN

    FOR worker IN get_idle_workers():
        IF should_defragment(worker):
            # Don't defragment all at once
            IF random() < 0.2:  # 20% chance per cycle
                async defragment_worker(worker)
```

---

## Database Schema

### PostgreSQL Schema

```sql
-- Generation requests
CREATE TABLE generation_requests (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255),

    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    tier VARCHAR(20) NOT NULL,
    priority INT NOT NULL DEFAULT 0,

    -- Prompt data (encrypted at rest)
    prompt_encrypted BYTEA NOT NULL,
    negative_prompt_encrypted BYTEA,

    -- Generation config (JSON)
    generation_config JSONB NOT NULL,
    adapter_config JSONB,

    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    queued_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Results
    output JSONB,
    safety_result JSONB,

    -- Error handling
    retry_count INT DEFAULT 0,
    last_error TEXT,
    worker_id UUID,

    -- Indexes
    INDEX idx_user_created (user_id, created_at DESC),
    INDEX idx_status (status),
    INDEX idx_tier_created (tier, created_at)
);

-- Generated images
CREATE TABLE generated_images (
    image_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES generation_requests(request_id),

    -- Storage
    storage_path VARCHAR(500) NOT NULL,
    cdn_url VARCHAR(500),
    thumbnail_url VARCHAR(500),

    -- Metadata
    width INT NOT NULL,
    height INT NOT NULL,
    format VARCHAR(20) NOT NULL,
    size_bytes BIGINT NOT NULL,
    seed BIGINT NOT NULL,

    -- Safety
    safety_score DECIMAL(3,2),
    nsfw_scores JSONB,
    watermark_id VARCHAR(100),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,

    INDEX idx_request (request_id),
    INDEX idx_created (created_at)
);

-- Safety audit log (append-only)
CREATE TABLE safety_audit_log (
    log_id BIGSERIAL PRIMARY KEY,
    request_id UUID NOT NULL,
    user_id_hash VARCHAR(64) NOT NULL,  -- Hashed for privacy

    check_stage VARCHAR(50) NOT NULL,  -- pre_gen, post_gen
    check_type VARCHAR(50) NOT NULL,   -- nsfw, csam, violence, bias

    result VARCHAR(20) NOT NULL,  -- passed, blocked, escalated
    confidence DECIMAL(4,3),

    -- No actual prompt/image stored
    prompt_hash VARCHAR(64),  -- For pattern detection

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_created (created_at),
    INDEX idx_result (result, created_at)
) PARTITION BY RANGE (created_at);

-- Worker state (frequently updated, consider Redis)
CREATE TABLE gpu_workers (
    worker_id UUID PRIMARY KEY,
    hostname VARCHAR(255) NOT NULL,
    region VARCHAR(50) NOT NULL,

    gpu_type VARCHAR(50) NOT NULL,
    vram_total_gb INT NOT NULL,
    vram_used_gb DECIMAL(5,2),

    status VARCHAR(50) NOT NULL,
    loaded_models JSONB,

    last_heartbeat TIMESTAMP WITH TIME ZONE,
    pool VARCHAR(20) NOT NULL,
    tier_assignment VARCHAR(20),

    requests_completed BIGINT DEFAULT 0,
    requests_failed BIGINT DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Message Formats

### Queue Message (Redis/Kafka)

```json
{
    "message_id": "msg-123",
    "request_id": "gen-abc",
    "user_id": "user-456",
    "tier": "fast",
    "priority": 5,
    "enqueued_at": "2024-01-15T10:30:00Z",
    "requirements": {
        "model": "sdxl-1.0",
        "vram_gb": 12.5,
        "adapters": ["detail-enhancer-v2"]
    },
    "prompt_embeds_ref": "s3://embeds/gen-abc/prompt.pt",
    "config": {
        "steps": 30,
        "guidance_scale": 7.5,
        "width": 1024,
        "height": 1024
    }
}
```

### Worker Assignment Message

```json
{
    "type": "worker_assignment",
    "request_id": "gen-abc",
    "worker_id": "worker-xyz",
    "assigned_at": "2024-01-15T10:30:05Z",
    "model_status": "warm_hit",
    "estimated_time_ms": 8500
}
```

### Progress Update Message

```json
{
    "type": "progress_update",
    "request_id": "gen-abc",
    "worker_id": "worker-xyz",
    "current_step": 15,
    "total_steps": 30,
    "timestamp": "2024-01-15T10:30:10Z"
}
```
