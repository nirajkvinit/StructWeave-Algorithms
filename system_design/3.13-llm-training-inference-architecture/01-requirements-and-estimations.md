# Requirements and Capacity Estimations

## Functional Requirements

### Training Requirements

**Core Capabilities:**

1. **Distributed Training Orchestration**
   - Train models from 7B to 1T+ parameters across 1000s of GPUs
   - Support 4D parallelism: Data, Tensor, Pipeline, Expert (MoE)
   - Automatic parallelism configuration based on model/cluster size
   - Dynamic load balancing across heterogeneous GPU types

2. **Memory Optimization**
   - ZeRO-1/2/3 optimizer state sharding
   - Gradient checkpointing with configurable granularity
   - Activation offloading to CPU/NVMe when needed
   - Mixed precision training (FP32, FP16, BF16, FP8)

3. **Data Pipeline**
   - Distributed data loading with prefetching
   - Data parallelism with deterministic sharding
   - Support for streaming datasets (TB-PB scale)
   - Tokenization and preprocessing at scale

4. **Fault Tolerance**
   - Periodic distributed checkpointing
   - Automatic failure detection and recovery
   - Elastic training (add/remove nodes)
   - Checkpoint verification and corruption detection

5. **Experiment Management**
   - Hyperparameter tracking and versioning
   - Loss curves and metric logging
   - Model artifact management
   - A/B testing different configurations

### Inference Requirements

**Core Capabilities:**

1. **Request Handling**
   - Accept text prompts and return generated completions
   - Support streaming token generation
   - Handle concurrent requests with fair scheduling
   - Request prioritization and SLA tiers

2. **Batching and Scheduling**
   - Continuous batching with iteration-level granularity
   - Dynamic batch size based on sequence lengths
   - Preemption for priority requests
   - Request queuing with timeout management

3. **Memory Management**
   - PagedAttention for KV cache
   - Dynamic block allocation/deallocation
   - Prefix caching for repeated prompts
   - Memory defragmentation

4. **Optimization Techniques**
   - Speculative decoding with draft models
   - Quantization support (INT8, INT4, FP8)
   - Flash Attention integration
   - Tensor parallelism for large models

5. **Model Management**
   - Hot model loading/unloading
   - Multi-model serving on shared infrastructure
   - Version management and canary deployments
   - Model weight caching

### Out of Scope

| Feature | Reason |
|---------|--------|
| Fine-tuning APIs | Covered in MLOps Platform design |
| RAG integration | Covered in RAG System design |
| Model training from scratch | Focus on serving existing models |
| Custom kernel development | Implementation detail |
| Hardware procurement | Infrastructure concern |

---

## Non-Functional Requirements

### Training NFRs

| Requirement | Target | Justification |
|-------------|--------|---------------|
| **MFU (Model FLOPS Utilization)** | >50% sustained | Industry standard for efficient training |
| **Checkpoint Frequency** | Every 10-30 minutes | Balance recovery time vs overhead |
| **Recovery Time** | <10 minutes | From checkpoint to training resumption |
| **Job Completion Rate** | >99% | Accounting for hardware failures |
| **Data Throughput** | Saturate GPU compute | GPUs never wait for data |
| **Communication Efficiency** | <30% overhead | AllReduce time as % of step |

### Inference NFRs

| Requirement | Target | Justification |
|-------------|--------|---------------|
| **Time to First Token (TTFT)** | <200ms p99 | User experience threshold |
| **Tokens Per Second (TPS)** | >50 per request | Readable streaming speed |
| **Throughput** | >1000 req/sec per instance | Cost efficiency |
| **Availability** | 99.9% | Production SLA requirement |
| **Error Rate** | <0.1% | Excluding rate limits |
| **Cold Start** | <30s | Model loading time |

### CAP Theorem Analysis

**Training:**
- **Consistency**: Strong - checkpoints must be consistent across all ranks
- **Availability**: Medium - can tolerate brief unavailability during checkpointing
- **Partition Tolerance**: High - must handle network partitions gracefully
- **Choice**: CP system with eventual availability

**Inference:**
- **Consistency**: Eventual - load balancing can route to any healthy instance
- **Availability**: High - 99.9% target, graceful degradation
- **Partition Tolerance**: High - multi-region deployment
- **Choice**: AP system with strong eventual consistency

### Durability and Data Guarantees

| Data Type | Durability | Replication |
|-----------|------------|-------------|
| Checkpoints | 11 nines | 3-way across regions |
| Training logs | 9 nines | 2-way replication |
| Inference logs | 6 nines | Single region |
| KV cache | None | Ephemeral, reconstructable |

---

## Capacity Estimations

### Training Capacity

#### Compute Requirements

**Training FLOPS Calculation:**
```
Training FLOPS = 6 * Parameters * Tokens
```

| Model | Parameters | Tokens | Total FLOPS | H100 GPU-Hours | Estimated Cost |
|-------|------------|--------|-------------|----------------|----------------|
| 7B | 7B | 2T | 8.4e22 | 10,000 | $30K |
| 70B | 70B | 2T | 8.4e23 | 100,000 | $300K |
| 405B | 405B | 15T | 3.6e25 | 4,000,000 | $12M |
| 1T (MoE) | 1T | 15T | 9e25 | 10,000,000 | $30M |

*Assumptions: H100 at 50% MFU = 990 TFLOPS effective, $3/GPU-hour*

#### Memory Requirements (Per GPU)

**Training Memory Breakdown:**
```
Total Memory = Model + Optimizer + Gradients + Activations

Model Memory = Parameters * Bytes_per_param
Optimizer Memory = Parameters * 8 (Adam FP32 states)
Gradient Memory = Parameters * Bytes_per_param
Activation Memory = Batch * Seq_len * Hidden * Layers * Bytes
```

| Model | Precision | Model | Optimizer | Gradients | Activations | Total |
|-------|-----------|-------|-----------|-----------|-------------|-------|
| 7B | FP32 | 28 GB | 56 GB | 28 GB | 10 GB | 122 GB |
| 7B | BF16 | 14 GB | 56 GB | 14 GB | 5 GB | 89 GB |
| 7B | BF16+ZeRO3 | 14/N | 56/N | 14/N | 5 GB | ~6 GB (N=8) |
| 70B | BF16 | 140 GB | 560 GB | 140 GB | 50 GB | 890 GB |
| 70B | BF16+ZeRO3 | 140/N | 560/N | 140/N | 50 GB | ~65 GB (N=64) |

#### Storage Requirements

| Data Type | Size | Retention | Storage Class |
|-----------|------|-----------|---------------|
| Training data | 1-10 TB | Permanent | Object storage |
| Checkpoints (per save) | 2x model size | 30 days | High-perf storage |
| Checkpoints (kept) | 5-10 versions | Permanent | Object storage |
| Logs and metrics | 100 GB/day | 90 days | Log aggregation |
| Model artifacts | Model size | Permanent | Model registry |

#### Network Requirements

**AllReduce Bandwidth:**
```
AllReduce time = 2 * (N-1)/N * Data_size / Bandwidth
```

| Parallelism | Data per AllReduce | Required BW | Notes |
|-------------|-------------------|-------------|-------|
| DP (gradients) | Model size | 100 GB/s | Inter-node |
| TP (activations) | Batch * Seq * Hidden | 400 GB/s | Intra-node NVLink |
| PP (activations) | Batch * Seq * Hidden | 50 GB/s | Mostly sequential |

### Inference Capacity

#### Memory Requirements

**Model Memory:**
```
Model Memory = Parameters * Bytes_per_param
```

| Model | FP16 | INT8 | INT4 | FP8 |
|-------|------|------|------|-----|
| 7B | 14 GB | 7 GB | 3.5 GB | 7 GB |
| 13B | 26 GB | 13 GB | 6.5 GB | 13 GB |
| 70B | 140 GB | 70 GB | 35 GB | 70 GB |
| 405B | 810 GB | 405 GB | 203 GB | 405 GB |

**KV Cache Memory:**
```
KV Cache per token = 2 * Layers * Heads * Head_dim * Bytes_per_value
                   = 2 * L * H * D * 2 (FP16)
```

| Model | Layers | Hidden | Heads | KV per Token | KV for 4K context |
|-------|--------|--------|-------|--------------|-------------------|
| 7B | 32 | 4096 | 32 | 512 KB | 2 GB |
| 70B | 80 | 8192 | 64 | 5.2 MB | 21 GB |
| 405B | 126 | 16384 | 128 | 32 MB | 131 GB |

**Total GPU Memory per Request:**
```
Request Memory = Model / TP_degree + KV_cache * Seq_len + Overhead
```

| Model | TP | Model Share | KV (4K) | Overhead | Total | Max Batch (80GB) |
|-------|-----|-------------|---------|----------|-------|------------------|
| 7B | 1 | 14 GB | 2 GB | 2 GB | 18 GB | 3-4 |
| 70B | 2 | 70 GB | 21 GB | 4 GB | 95 GB | 1 |
| 70B | 8 | 18 GB | 21 GB | 4 GB | 43 GB | 1-2 |
| 405B | 8 | 101 GB | 131 GB | 8 GB | 240 GB | 0 (need GB200) |

#### Throughput Estimation

**Decode Throughput (Memory-Bound):**
```
Tokens/sec = Memory_bandwidth / (2 * Parameters * Bytes_per_param)
```

| GPU | Bandwidth | 7B TPS | 70B TPS | Notes |
|-----|-----------|--------|---------|-------|
| H100 | 3.35 TB/s | 120 | 12 | Per GPU, batch=1 |
| H100 (batch=8) | 3.35 TB/s | 480 | 48 | Better utilization |
| GB200 | 8 TB/s | 285 | 29 | Next-gen GPU |

**Prefill Throughput (Compute-Bound):**
```
Prefill time = 2 * Parameters * Seq_len / FLOPS
```

| Model | Prompt Length | H100 Prefill Time | Notes |
|-------|---------------|-------------------|-------|
| 7B | 1K tokens | 7 ms | Compute-bound |
| 7B | 8K tokens | 56 ms | Still fast |
| 70B | 1K tokens | 70 ms | Acceptable |
| 70B | 8K tokens | 560 ms | Consider chunked prefill |

#### Throughput with Batching

| Model | Batch Size | GPU Memory | Throughput | Notes |
|-------|------------|------------|------------|-------|
| 7B INT8 | 32 | 71 GB | 1,000 TPS | Single H100 |
| 70B INT8 | 8 | 78 GB | 300 TPS | TP=2 H100s |
| 70B FP8 | 4 | 74 GB | 200 TPS | TP=2 H100s |

---

## SLOs and SLAs

### Training SLOs

| Metric | Bronze | Silver | Gold | Measurement |
|--------|--------|--------|------|-------------|
| MFU | >40% | >50% | >55% | Per training step |
| Checkpoint Success | 99% | 99.9% | 99.99% | Per checkpoint |
| Recovery Time | <30 min | <10 min | <5 min | From failure |
| Data Loading | No stalls | No stalls | Prefetch 2x | GPU idle time |
| Job Completion | 95% | 99% | 99.9% | Within SLA |

### Inference SLOs

| Metric | Bronze | Silver | Gold | Measurement |
|--------|--------|--------|------|-------------|
| TTFT | <500 ms | <200 ms | <100 ms | p99 |
| TPS | >30 | >50 | >80 | Per request average |
| Availability | 99% | 99.9% | 99.99% | Monthly uptime |
| Error Rate | <1% | <0.1% | <0.01% | Non-rate-limit errors |
| Throughput | 100 req/s | 500 req/s | 1000 req/s | Per model instance |

### SLA Violation Consequences

| Violation | Detection | Response | Escalation |
|-----------|-----------|----------|------------|
| TTFT >2x SLO | Real-time monitoring | Alert, auto-scale | Page on-call |
| Error rate >SLO | 5-min window | Circuit breaker | Incident |
| Availability <SLO | Monthly calculation | SLA credits | Post-mortem |
| Training stall | Heartbeat timeout | Auto-restart | Alert team |

---

## Cost Model

### Training Cost Breakdown

| Component | % of Total | Optimization Opportunity |
|-----------|------------|-------------------------|
| GPU compute | 70-80% | Higher MFU, shorter training |
| Storage | 10-15% | Compression, tiered storage |
| Network | 5-10% | Efficient communication patterns |
| Management | 5% | Automation |

**Cost per Token Trained:**
```
Cost/Token = (GPU_hours * GPU_price) / Tokens_processed
```

| Model | Tokens | GPU-Hours | Cost | Cost/1M Tokens |
|-------|--------|-----------|------|----------------|
| 7B | 2T | 10,000 | $30K | $0.015 |
| 70B | 2T | 100,000 | $300K | $0.15 |
| 405B | 15T | 4,000,000 | $12M | $0.80 |

### Inference Cost Breakdown

| Component | % of Total | Optimization Opportunity |
|-----------|------------|-------------------------|
| GPU inference | 60-70% | Quantization, batching |
| KV cache memory | 15-20% | Prefix caching, PagedAttention |
| Network/LB | 5-10% | Edge caching |
| Management | 5% | Automation |

**Cost per Token Generated:**
```
Cost/Token = GPU_cost_per_second / Tokens_per_second
```

| Model | Quantization | TPS | GPU Cost/hr | Cost/1M Tokens |
|-------|--------------|-----|-------------|----------------|
| 7B | INT8 | 1,000 | $3 | $0.0008 |
| 70B | INT8 | 300 | $6 (2 GPU) | $0.0056 |
| 70B | FP16 | 150 | $6 (2 GPU) | $0.011 |
| 405B | INT8 | 50 | $24 (8 GPU) | $0.133 |

---

## Scaling Projections

### Year 1 → Year 5 Growth

| Metric | Year 1 | Year 3 | Year 5 |
|--------|--------|--------|--------|
| Model size (params) | 70B | 400B | 2T |
| Training cluster (GPUs) | 256 | 2,048 | 16,384 |
| Inference QPS | 1,000 | 10,000 | 100,000 |
| KV cache memory/request | 21 GB | 50 GB | 100 GB |
| Checkpoint size | 280 GB | 1.6 TB | 8 TB |
| Training data | 10 TB | 100 TB | 1 PB |

### Hardware Evolution Assumptions

| Year | GPU Generation | Memory | FP8 TFLOPS | Cost/hr |
|------|----------------|--------|------------|---------|
| 2024 | H100 | 80 GB | 1,979 | $3.00 |
| 2025 | H200/GB200 | 141-192 GB | 4,500 | $4.00 |
| 2026 | Blackwell+ | 256+ GB | 9,000 | $5.00 |

---

## Capacity Planning Formulas

### Training Cluster Sizing

```
GPUs_needed = max(
    Model_memory / GPU_memory,                    # Memory constraint
    Training_FLOPS / (GPU_FLOPS * target_MFU),    # Compute constraint
    1 / acceptable_training_time                  # Time constraint
)
```

### Inference Cluster Sizing

```
Instances_needed = max(
    Target_QPS / Instance_throughput,             # Throughput constraint
    Peak_concurrent_requests,                     # Concurrency constraint
    Target_availability * redundancy_factor       # Availability constraint
)

GPUs_per_instance = ceil(Model_memory / GPU_memory)  # TP degree
```

### KV Cache Sizing

```
Max_concurrent_tokens = (GPU_memory - Model_memory - Overhead) / KV_per_token

Max_batch_size = Max_concurrent_tokens / avg_context_length
```
