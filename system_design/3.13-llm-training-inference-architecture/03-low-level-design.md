# Low-Level Design

## Data Models

### Training Data Models

#### Training Job Configuration

```
TrainingJob:
    job_id: UUID
    job_name: String
    status: Enum[PENDING, RUNNING, CHECKPOINTING, COMPLETED, FAILED]
    created_at: Timestamp
    updated_at: Timestamp

    model_config:
        architecture: String  # "llama", "mistral", "moe"
        num_layers: Int
        hidden_size: Int
        num_attention_heads: Int
        num_kv_heads: Int  # For GQA
        intermediate_size: Int
        vocab_size: Int
        max_position_embeddings: Int
        # MoE specific
        num_experts: Int (optional)
        num_experts_per_token: Int (optional)

    parallelism_config:
        tensor_parallel_size: Int  # TP degree (typically 1, 2, 4, 8)
        pipeline_parallel_size: Int  # PP stages
        data_parallel_size: Int  # DP replicas (auto-calculated)
        expert_parallel_size: Int  # EP degree for MoE
        sequence_parallel: Boolean
        context_parallel_size: Int  # For ultra-long sequences

    optimization_config:
        optimizer: Enum[ADAM, ADAMW, LAMB]
        learning_rate: Float
        weight_decay: Float
        beta1: Float
        beta2: Float
        epsilon: Float
        gradient_clipping: Float
        warmup_steps: Int
        total_steps: Int
        lr_scheduler: Enum[COSINE, LINEAR, CONSTANT]

    memory_config:
        precision: Enum[FP32, FP16, BF16, FP8]
        zero_stage: Enum[0, 1, 2, 3]
        gradient_checkpointing: Boolean
        cpu_offload: Boolean
        nvme_offload: Boolean
        activation_checkpointing_granularity: Enum[FULL, SELECTIVE]

    data_config:
        dataset_path: String
        tokenizer_path: String
        sequence_length: Int
        global_batch_size: Int
        micro_batch_size: Int

    checkpoint_config:
        checkpoint_dir: String
        checkpoint_interval_steps: Int
        checkpoint_interval_minutes: Int
        max_checkpoints_to_keep: Int
        async_save: Boolean
```

#### Training Checkpoint

```
Checkpoint:
    checkpoint_id: UUID
    job_id: UUID
    step: Int
    timestamp: Timestamp
    status: Enum[SAVING, COMPLETE, CORRUPT, DELETED]

    metadata:
        loss: Float
        learning_rate: Float
        global_step: Int
        consumed_tokens: Int
        elapsed_time_seconds: Float

    shards:
        - shard_id: Int
          rank: Int
          file_path: String
          file_size_bytes: Int
          checksum: String

    optimizer_states:
        - rank: Int
          file_path: String
          file_size_bytes: Int

    rng_states:
        - rank: Int
          cuda_rng_state: Bytes
          torch_rng_state: Bytes
          numpy_rng_state: Bytes
```

### Inference Data Models

#### Inference Request

```
InferenceRequest:
    request_id: UUID
    created_at: Timestamp
    status: Enum[QUEUED, PREFILLING, DECODING, COMPLETED, FAILED, PREEMPTED]
    priority: Int  # Higher = more important

    input:
        prompt: String
        prompt_token_ids: List[Int]

    sampling_params:
        temperature: Float (default: 1.0)
        top_p: Float (default: 1.0)
        top_k: Int (default: -1, disabled)
        min_p: Float (default: 0.0)
        max_tokens: Int
        stop_sequences: List[String]
        presence_penalty: Float (default: 0.0)
        frequency_penalty: Float (default: 0.0)
        repetition_penalty: Float (default: 1.0)
        seed: Int (optional)

    options:
        stream: Boolean
        echo_prompt: Boolean
        logprobs: Int (optional)
        best_of: Int (default: 1)
        use_beam_search: Boolean (default: False)

    output:
        generated_text: String
        generated_token_ids: List[Int]
        finish_reason: Enum[STOP, LENGTH, ERROR]
        usage:
            prompt_tokens: Int
            completion_tokens: Int
            total_tokens: Int
        timing:
            queue_time_ms: Float
            prefill_time_ms: Float
            decode_time_ms: Float
            total_time_ms: Float
```

#### Sequence State (Internal)

```
SequenceState:
    sequence_id: UUID
    request_id: UUID
    status: Enum[WAITING, RUNNING, SWAPPED, FINISHED]

    tokens:
        prompt_tokens: List[Int]
        output_tokens: List[Int]

    kv_cache:
        block_table: List[Int]  # Indices into physical blocks
        num_computed_tokens: Int
        context_length: Int

    sampling_state:
        temperature: Float
        top_p: Float
        rng_state: Bytes

    metrics:
        num_preemptions: Int
        prefill_time_ms: Float
        tokens_generated: Int
```

#### KV Block

```
KVBlock:
    block_id: Int
    layer_id: Int

    physical_address: Pointer  # GPU memory address
    block_size: Int  # Number of tokens (typically 16)

    ref_count: Int  # For copy-on-write
    last_access_time: Timestamp

    status: Enum[FREE, ALLOCATED, SWAPPED]
    swap_location: Pointer (optional)  # CPU memory address if swapped

    # Cache content (conceptual, stored in GPU memory)
    k_cache: Tensor[block_size, num_heads, head_dim]
    v_cache: Tensor[block_size, num_heads, head_dim]
```

#### Block Table

```
BlockTable:
    sequence_id: UUID

    # Mapping: logical_block_index -> physical_block_id
    # Each entry points to a KVBlock
    table: List[Int]

    # Metadata
    num_logical_blocks: Int
    num_tokens_in_last_block: Int
```

---

## API Design

### Training APIs

#### Job Management

```
POST /v1/training/jobs
    Description: Submit a new training job
    Request Body: TrainingJob (without job_id, status)
    Response: { job_id: UUID, status: "PENDING" }

GET /v1/training/jobs/{job_id}
    Description: Get job status and metrics
    Response: TrainingJob with current metrics

DELETE /v1/training/jobs/{job_id}
    Description: Cancel a running job
    Response: { status: "CANCELLED" }

POST /v1/training/jobs/{job_id}/checkpoint
    Description: Trigger immediate checkpoint
    Response: { checkpoint_id: UUID }

GET /v1/training/jobs/{job_id}/checkpoints
    Description: List all checkpoints for a job
    Response: List[Checkpoint]

POST /v1/training/jobs/{job_id}/resume
    Description: Resume job from checkpoint
    Request Body: { checkpoint_id: UUID }
    Response: { job_id: UUID, status: "RUNNING" }
```

#### Cluster Management

```
GET /v1/cluster/status
    Description: Get cluster health and utilization
    Response: {
        total_gpus: Int,
        available_gpus: Int,
        gpu_utilization: Float,
        memory_utilization: Float,
        active_jobs: Int
    }

GET /v1/cluster/nodes
    Description: List all nodes
    Response: List[{
        node_id: String,
        gpus: Int,
        status: String,
        gpu_memory_used: List[Float]
    }]
```

### Inference APIs

#### Completions API

```
POST /v1/completions
    Description: Generate text completion
    Request Body: {
        model: String,
        prompt: String | List[Int],
        max_tokens: Int,
        temperature: Float (optional),
        top_p: Float (optional),
        stream: Boolean (optional),
        stop: List[String] (optional),
        ...sampling_params
    }
    Response: {
        id: String,
        object: "text_completion",
        created: Int,
        model: String,
        choices: [{
            text: String,
            index: Int,
            finish_reason: String
        }],
        usage: {
            prompt_tokens: Int,
            completion_tokens: Int,
            total_tokens: Int
        }
    }

    Streaming Response (SSE):
        data: {"choices": [{"text": "token", "index": 0}]}
        data: {"choices": [{"text": " next", "index": 0}]}
        data: [DONE]
```

#### Chat API

```
POST /v1/chat/completions
    Description: Generate chat completion
    Request Body: {
        model: String,
        messages: [{
            role: "system" | "user" | "assistant",
            content: String
        }],
        max_tokens: Int,
        temperature: Float (optional),
        stream: Boolean (optional),
        ...sampling_params
    }
    Response: {
        id: String,
        object: "chat.completion",
        created: Int,
        model: String,
        choices: [{
            index: Int,
            message: {
                role: "assistant",
                content: String
            },
            finish_reason: String
        }],
        usage: {...}
    }
```

#### Model Management

```
GET /v1/models
    Description: List available models
    Response: {
        data: [{
            id: String,
            object: "model",
            owned_by: String
        }]
    }

POST /v1/models/{model_id}/load
    Description: Load model into memory
    Response: { status: "loading" | "ready" }

DELETE /v1/models/{model_id}
    Description: Unload model from memory
    Response: { status: "unloaded" }
```

#### Health and Metrics

```
GET /health
    Description: Health check endpoint
    Response: { status: "healthy" | "degraded" | "unhealthy" }

GET /metrics
    Description: Prometheus metrics endpoint
    Response: Prometheus text format
```

---

## Core Algorithms

### Algorithm 1: ZeRO-3 Forward/Backward Pass

```
ALGORITHM ZeRO3_ForwardBackward

CONSTANTS:
    world_size = number of GPUs
    rank = current GPU rank

STRUCTURES:
    ShardedParameter:
        local_shard: Tensor  # 1/world_size of full parameter
        full_param: Tensor   # Temporary, only during use

    ShardedOptimizer:
        local_state: Dict    # 1/world_size of optimizer state

FUNCTION all_gather_parameters(layer):
    """Gather all parameter shards to reconstruct full parameters"""
    for param in layer.parameters():
        # AllGather: each rank sends its shard, receives all shards
        full_param = all_gather(param.local_shard)
        param.full_param = concatenate(full_param)

FUNCTION reduce_scatter_gradients(layer):
    """Reduce gradients and scatter shards back to owners"""
    for param in layer.parameters():
        # ReduceScatter: sum gradients, each rank gets 1/N of result
        param.local_grad = reduce_scatter(param.full_param.grad, op=SUM)
        # Free full parameter to save memory
        param.full_param = None

FUNCTION forward_pass(model, input_batch):
    activations = []
    x = input_batch

    for layer in model.layers:
        # Step 1: Gather parameters for this layer
        all_gather_parameters(layer)

        # Step 2: Compute forward pass
        if gradient_checkpointing_enabled:
            # Don't save activations, will recompute in backward
            with no_grad():
                x = layer.forward(x)
            activations.append((layer, input_to_layer))
        else:
            x = layer.forward(x)
            activations.append(x)

        # Step 3: Free parameters (will re-gather in backward)
        free_full_parameters(layer)

    return x, activations

FUNCTION backward_pass(model, loss, activations):
    grad_output = loss.backward()  # Gradient of loss

    for layer in reversed(model.layers):
        # Step 1: Re-gather parameters
        all_gather_parameters(layer)

        # Step 2: Recompute activations if checkpointing
        if gradient_checkpointing_enabled:
            layer_input = activations[layer]
            with enable_grad():
                recomputed = layer.forward(layer_input)

        # Step 3: Compute gradients
        grad_output, grad_weights = layer.backward(grad_output)

        # Step 4: ReduceScatter gradients to shard owners
        reduce_scatter_gradients(layer)

        # Step 5: Free full parameters
        free_full_parameters(layer)

    return grad_output

FUNCTION optimizer_step(optimizer, model):
    for param in model.parameters():
        # Each rank only updates its shard
        local_grad = param.local_grad
        optimizer.update(param.local_shard, local_grad)
```

### Algorithm 2: Continuous Batching Scheduler

```
ALGORITHM ContinuousBatchingScheduler

CONSTANTS:
    MAX_BATCH_TOKENS = 8192  # Max tokens per batch
    MAX_BATCH_SEQUENCES = 256
    BLOCK_SIZE = 16  # Tokens per KV block

STRUCTURES:
    Sequence:
        id: UUID
        tokens: List[Int]
        num_computed: Int
        block_table: List[Int]
        status: Enum[WAITING, RUNNING, SWAPPED, FINISHED]
        priority: Int
        arrival_time: Timestamp

QUEUES:
    waiting_queue: PriorityQueue[Sequence]  # Ordered by priority, then arrival
    running_batch: List[Sequence]
    swapped_queue: List[Sequence]

FUNCTION schedule():
    """Main scheduling loop - called every iteration"""

    # Phase 1: Remove completed sequences
    completed = []
    for seq in running_batch:
        if seq.is_finished():
            completed.append(seq)
            release_blocks(seq)
    running_batch.remove_all(completed)

    # Phase 2: Try to resume swapped sequences
    while swapped_queue.not_empty():
        seq = swapped_queue.peek()
        blocks_needed = seq.num_blocks_needed()

        if can_allocate_blocks(blocks_needed):
            seq = swapped_queue.pop()
            swap_in_blocks(seq)
            running_batch.append(seq)
        else:
            break  # Not enough memory

    # Phase 3: Admit new sequences from waiting queue
    while waiting_queue.not_empty():
        seq = waiting_queue.peek()
        blocks_needed = ceil(len(seq.tokens) / BLOCK_SIZE)

        if can_allocate_blocks(blocks_needed):
            seq = waiting_queue.pop()
            allocate_blocks(seq, blocks_needed)
            seq.status = RUNNING
            running_batch.append(seq)
        else:
            break  # Not enough memory

    # Phase 4: Preemption if needed (memory pressure)
    while memory_usage() > threshold:
        if running_batch.is_empty():
            break

        # Select victim (lowest priority, longest running)
        victim = select_preemption_victim(running_batch)
        swap_out_blocks(victim)
        victim.status = SWAPPED
        running_batch.remove(victim)
        swapped_queue.append(victim)

    # Phase 5: Build batch for execution
    return build_execution_batch(running_batch)

FUNCTION build_execution_batch(sequences):
    """Organize sequences into prefill and decode groups"""

    prefill_batch = []  # Sequences needing prompt processing
    decode_batch = []   # Sequences generating tokens

    for seq in sequences:
        if seq.num_computed < len(seq.tokens):
            # Still processing prompt
            prefill_batch.append(seq)
        else:
            # Generating new tokens
            decode_batch.append(seq)

    return ExecutionBatch(
        prefill=prefill_batch,
        decode=decode_batch,
        block_tables=[seq.block_table for seq in sequences]
    )

FUNCTION select_preemption_victim(running):
    """Select sequence to preempt based on policy"""

    # Policy: FCFS (preempt most recent), or
    # Policy: Longest (preempt with most tokens)

    # Default: Lowest priority, then FCFS
    candidates = sorted(running, key=lambda s: (s.priority, -s.arrival_time))
    return candidates[0]
```

### Algorithm 3: PagedAttention Block Allocator

```
ALGORITHM PagedAttentionAllocator

CONSTANTS:
    BLOCK_SIZE = 16  # Tokens per block
    NUM_LAYERS = 80  # For 70B model
    TOTAL_GPU_BLOCKS = 10000  # Available blocks per layer

STRUCTURES:
    PhysicalBlock:
        block_id: Int
        ref_count: Int
        is_free: Boolean

    BlockTable:
        logical_to_physical: List[Int]

GLOBAL_STATE:
    free_blocks: List[Int]  # Pool of free block IDs
    block_metadata: Dict[Int, PhysicalBlock]
    sequence_tables: Dict[UUID, BlockTable]

FUNCTION initialize():
    """Initialize block allocator at startup"""
    free_blocks = list(range(TOTAL_GPU_BLOCKS))
    for block_id in range(TOTAL_GPU_BLOCKS):
        block_metadata[block_id] = PhysicalBlock(
            block_id=block_id,
            ref_count=0,
            is_free=True
        )

FUNCTION can_allocate(num_blocks):
    """Check if we can allocate given number of blocks"""
    return len(free_blocks) >= num_blocks

FUNCTION allocate_blocks(sequence_id, num_tokens):
    """Allocate blocks for a new sequence"""
    num_blocks = ceil(num_tokens / BLOCK_SIZE)

    if not can_allocate(num_blocks):
        return ALLOCATION_FAILED

    block_table = BlockTable(logical_to_physical=[])

    for i in range(num_blocks):
        block_id = free_blocks.pop()
        block_metadata[block_id].is_free = False
        block_metadata[block_id].ref_count = 1
        block_table.logical_to_physical.append(block_id)

    sequence_tables[sequence_id] = block_table
    return SUCCESS

FUNCTION append_block(sequence_id):
    """Allocate one more block for growing sequence"""
    if not can_allocate(1):
        return ALLOCATION_FAILED

    block_id = free_blocks.pop()
    block_metadata[block_id].is_free = False
    block_metadata[block_id].ref_count = 1

    sequence_tables[sequence_id].logical_to_physical.append(block_id)
    return SUCCESS

FUNCTION free_blocks(sequence_id):
    """Release all blocks for a completed sequence"""
    block_table = sequence_tables.pop(sequence_id)

    for physical_id in block_table.logical_to_physical:
        block = block_metadata[physical_id]
        block.ref_count -= 1

        if block.ref_count == 0:
            block.is_free = True
            free_blocks.append(physical_id)

FUNCTION fork_sequence(source_id, new_id):
    """Copy-on-write fork for beam search"""
    source_table = sequence_tables[source_id]
    new_table = BlockTable(
        logical_to_physical=source_table.logical_to_physical.copy()
    )

    # Increment ref counts (no actual copy yet)
    for physical_id in new_table.logical_to_physical:
        block_metadata[physical_id].ref_count += 1

    sequence_tables[new_id] = new_table

FUNCTION copy_on_write(sequence_id, logical_block_idx):
    """Make a private copy when writing to shared block"""
    block_table = sequence_tables[sequence_id]
    old_physical = block_table.logical_to_physical[logical_block_idx]

    if block_metadata[old_physical].ref_count > 1:
        # Block is shared, need to copy
        new_physical = free_blocks.pop()

        # Copy block contents (GPU kernel)
        gpu_copy_block(old_physical, new_physical)

        # Update references
        block_metadata[old_physical].ref_count -= 1
        block_metadata[new_physical].ref_count = 1
        block_metadata[new_physical].is_free = False

        block_table.logical_to_physical[logical_block_idx] = new_physical
```

### Algorithm 4: Speculative Decoding

```
ALGORITHM SpeculativeDecoding

CONSTANTS:
    K = 4  # Number of speculative tokens per step

MODELS:
    target_model: LargeModel  # e.g., 70B
    draft_model: SmallModel   # e.g., 7B

FUNCTION speculative_decode(prompt_tokens, max_tokens):
    """Generate tokens using speculative decoding"""

    output_tokens = []

    while len(output_tokens) < max_tokens:
        # Step 1: Draft K tokens with small model
        draft_tokens = []
        draft_probs = []

        context = prompt_tokens + output_tokens

        for i in range(K):
            logits = draft_model.forward(context + draft_tokens)
            probs = softmax(logits[-1])  # Last position

            token = sample_token(probs)
            draft_tokens.append(token)
            draft_probs.append(probs[token])

        # Step 2: Verify with target model in ONE forward pass
        # Process all K+1 positions simultaneously
        full_context = context + draft_tokens
        target_logits = target_model.forward(full_context)

        # target_logits shape: [K+1, vocab_size]
        # Position i gives distribution for token at position len(context)+i

        # Step 3: Accept/reject each draft token
        accepted_tokens = []

        for i in range(K):
            target_probs = softmax(target_logits[i])
            target_prob = target_probs[draft_tokens[i]]
            draft_prob = draft_probs[i]

            # Acceptance probability (ensures same distribution as AR)
            accept_ratio = min(1.0, target_prob / draft_prob)

            if random() < accept_ratio:
                # Accept this token
                accepted_tokens.append(draft_tokens[i])
            else:
                # Reject: sample from adjusted distribution
                adjusted_probs = max(0, target_probs - draft_probs * accept_ratio)
                adjusted_probs = adjusted_probs / sum(adjusted_probs)

                token = sample_token(adjusted_probs)
                accepted_tokens.append(token)
                break  # Stop accepting after first rejection

        # Step 4: If all K accepted, sample one more from target
        if len(accepted_tokens) == K:
            final_probs = softmax(target_logits[K])
            accepted_tokens.append(sample_token(final_probs))

        output_tokens.extend(accepted_tokens)

        # Check for stop condition
        if EOS_TOKEN in accepted_tokens:
            break

    return output_tokens

FUNCTION sample_token(probs, temperature=1.0, top_p=1.0):
    """Sample token from probability distribution"""

    if temperature != 1.0:
        probs = probs ** (1.0 / temperature)
        probs = probs / sum(probs)

    if top_p < 1.0:
        # Nucleus sampling
        sorted_indices = argsort(probs, descending=True)
        cumsum = cumulative_sum(probs[sorted_indices])
        cutoff_idx = first_index_where(cumsum > top_p)
        probs[sorted_indices[cutoff_idx+1:]] = 0
        probs = probs / sum(probs)

    return multinomial_sample(probs)
```

### Algorithm 5: 1F1B Pipeline Schedule

```
ALGORITHM OneFOneB_PipelineSchedule

CONSTANTS:
    num_stages = 4  # Pipeline parallel degree
    num_microbatches = 8  # Per global batch

FUNCTION execute_1f1b(stage_id, microbatches):
    """Execute 1F1B schedule for one pipeline stage"""

    # Warmup phase: Only forward passes
    # Number of warmup microbatches = num_stages - stage_id - 1
    warmup_count = num_stages - stage_id - 1

    forward_queue = []  # Activations waiting for backward

    # Phase 1: Warmup (forward only)
    for i in range(warmup_count):
        activations = forward_pass(microbatches[i])
        send_activations_to_next_stage(activations)
        forward_queue.append((i, activations))

    # Phase 2: Steady state (1 forward, 1 backward alternating)
    for i in range(warmup_count, num_microbatches):
        # Forward pass for microbatch i
        activations = forward_pass(microbatches[i])
        send_activations_to_next_stage(activations)
        forward_queue.append((i, activations))

        # Backward pass for oldest microbatch
        mb_idx, saved_activations = forward_queue.pop(0)
        grad_input = receive_gradients_from_next_stage()
        grad_output = backward_pass(saved_activations, grad_input)
        send_gradients_to_prev_stage(grad_output)

    # Phase 3: Cooldown (backward only)
    while forward_queue:
        mb_idx, saved_activations = forward_queue.pop(0)
        grad_input = receive_gradients_from_next_stage()
        grad_output = backward_pass(saved_activations, grad_input)
        send_gradients_to_prev_stage(grad_output)

VISUALIZATION:
    """
    Time →

    Stage 0: F0 F1 F2 F3 B0 F4 B1 F5 B2 F6 B3 F7 B4 B5 B6 B7
    Stage 1:    F0 F1 F2 B0 F3 B1 F4 B2 F5 B3 F6 B4 F7 B5 B6 B7
    Stage 2:       F0 F1 B0 F2 B1 F3 B2 F4 B3 F5 B4 F6 B5 F7 B6 B7
    Stage 3:          F0 B0 F1 B1 F2 B2 F3 B3 F4 B4 F5 B5 F6 B6 F7 B7

    F = Forward pass for microbatch
    B = Backward pass for microbatch

    Bubble time = (num_stages - 1) / num_microbatches
    With 4 stages, 8 microbatches: bubble = 3/8 = 37.5%
    """
```

---

## Complexity Analysis

| Algorithm | Time Complexity | Space Complexity | Notes |
|-----------|-----------------|------------------|-------|
| **ZeRO-3 AllGather** | O(P * N) | O(P/N) per GPU | P=params, N=GPUs |
| **ZeRO-3 ReduceScatter** | O(P * N) | O(P/N) per GPU | Communication bound |
| **Continuous Batching Schedule** | O(B log B) | O(B) | B=batch size, priority queue |
| **PagedAttention Allocate** | O(1) | O(blocks) | Amortized, free list |
| **PagedAttention CoW** | O(block_size) | O(block_size) | GPU memory copy |
| **Speculative Decoding** | O(K * draft + verify) | O(K * context) | K=speculative tokens |
| **1F1B Schedule** | O(microbatches * layers) | O(stages * activations) | Pipeline bubble overhead |

---

## Data Flow Patterns

### Training Data Flow

```
                    ┌─────────────────────────────────────────────┐
                    │              Data Pipeline                   │
                    │  Storage → Tokenize → Batch → Distribute    │
                    └─────────────────────┬───────────────────────┘
                                          │
                    ┌─────────────────────▼───────────────────────┐
                    │           Forward Pass (per layer)           │
                    │  AllGather → Compute → Free Params          │
                    └─────────────────────┬───────────────────────┘
                                          │
                    ┌─────────────────────▼───────────────────────┐
                    │           Backward Pass (per layer)          │
                    │  AllGather → Compute Grad → ReduceScatter   │
                    └─────────────────────┬───────────────────────┘
                                          │
                    ┌─────────────────────▼───────────────────────┐
                    │              Optimizer Step                  │
                    │  Update local shard with local gradient     │
                    └─────────────────────┬───────────────────────┘
                                          │
                    ┌─────────────────────▼───────────────────────┐
                    │              Checkpointing                   │
                    │  Async save sharded state to storage        │
                    └─────────────────────────────────────────────┘
```

### Inference Data Flow

```
                    ┌─────────────────────────────────────────────┐
                    │              Request Arrival                 │
                    │  Parse → Tokenize → Enqueue                 │
                    └─────────────────────┬───────────────────────┘
                                          │
                    ┌─────────────────────▼───────────────────────┐
                    │              Scheduling                      │
                    │  Allocate blocks → Add to batch             │
                    └─────────────────────┬───────────────────────┘
                                          │
          ┌───────────────────────────────┴───────────────────────┐
          │                                                       │
┌─────────▼─────────┐                               ┌─────────────▼─────────┐
│   Prefill Phase   │                               │    Decode Phase       │
│  (Compute-bound)  │                               │  (Memory-bound)       │
│  Process prompt   │                               │  Generate tokens      │
│  Store KV cache   │──────────────────────────────▶│  Read KV cache        │
└───────────────────┘                               │  Append to cache      │
                                                    └───────────┬───────────┘
                                                                │
                                          ┌─────────────────────▼───────────────────────┐
                                          │              Token Streaming                 │
                                          │  Detokenize → Send to client                │
                                          └─────────────────────────────────────────────┘
```
