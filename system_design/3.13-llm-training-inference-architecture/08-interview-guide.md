# Interview Guide

## Interview Pacing (45-minute format)

| Time | Phase | Focus |
|------|-------|-------|
| 0-5 min | **Clarify** | Training vs inference? Model size? Scale? Latency requirements? |
| 5-15 min | **High-Level** | Core architecture, parallelism strategy, key components |
| 15-30 min | **Deep Dive** | Pick one: 4D parallelism OR KV cache/batching OR speculative decoding |
| 30-40 min | **Scale & Reliability** | Bottlenecks, fault tolerance, scaling limits |
| 40-45 min | **Wrap Up** | Trade-offs summary, questions for interviewer |

---

## Phase 1: Clarification Questions (0-5 min)

### Must-Ask Questions

```
1. "Are we designing for training, inference, or both?"
   → Different architectures, constraints, and optimizations

2. "What model size are we targeting?"
   - <7B: Single GPU, simpler architecture
   - 7B-70B: Multi-GPU tensor parallelism
   - 70B-200B: Multi-node, full 4D parallelism
   - >200B: Extreme scale, possibly MoE

3. "What's the latency requirement for inference?"
   - <100ms TTFT: Need aggressive optimization
   - <500ms TTFT: Standard optimization
   - Batch/async: Throughput-focused

4. "What's the training compute budget?"
   - Defines cluster size and timeline

5. "Are we supporting MoE architectures?"
   - Adds expert parallelism complexity

6. "What's the expected context length?"
   - <4K: Standard KV cache
   - 4K-32K: Memory optimization needed
   - >32K: Sequence parallelism, sliding window
```

### Information to Extract

| Aspect | Options | Impact on Design |
|--------|---------|------------------|
| System type | Training / Inference / Both | Architecture choice |
| Model size | 7B / 70B / 200B+ | Parallelism strategy |
| Architecture | Dense / MoE | Expert parallelism |
| Latency SLO | <100ms / <500ms / flexible | Optimization priority |
| Scale | QPS target, cluster size | Capacity planning |
| Context length | 4K / 32K / 128K+ | Memory strategy |

---

## Phase 2: High-Level Design (5-15 min)

### Training Architecture Sketch

```
┌─────────────────────────────────────────────────────────────┐
│                    Training Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────┐  │
│  │ Data Loader │────▶│  Parallelism │────▶│ GPU Cluster │  │
│  │(Distributed)│     │   Engine     │     │ (N×8 H100)  │  │
│  └─────────────┘     │ TP/PP/DP/EP  │     └─────────────┘  │
│                      └──────────────┘            │          │
│                            │                     │          │
│                      ┌─────▼─────┐         ┌────▼────┐     │
│                      │  Memory   │         │Checkpoint│     │
│                      │Optimization│         │  Store  │     │
│                      │(ZeRO/FSDP)│         └─────────┘     │
│                      └───────────┘                         │
└─────────────────────────────────────────────────────────────┘

Key Points to Mention:
1. Data pipeline must saturate GPUs (no idle time)
2. 4D parallelism: TP within node, PP/DP across nodes
3. ZeRO-3/FSDP for memory efficiency
4. Async checkpointing for fault tolerance
```

### Inference Architecture Sketch

```
┌─────────────────────────────────────────────────────────────┐
│                    Inference Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐    ┌───────────┐    ┌───────────┐    ┌─────┐  │
│  │ Request │───▶│ Scheduler │───▶│ KV Cache  │───▶│ GPU │  │
│  │ Gateway │    │(Continuous│    │ Manager   │    │Worker│  │
│  └─────────┘    │ Batching) │    │(Paged Attn)│    └─────┘  │
│                 └───────────┘    └───────────┘       │      │
│                       │                              │      │
│                 ┌─────▼─────┐                  ┌─────▼────┐ │
│                 │Speculative│                  │  Model   │ │
│                 │ Decoding  │                  │ Serving  │ │
│                 └───────────┘                  └──────────┘ │
└─────────────────────────────────────────────────────────────┘

Key Points to Mention:
1. Continuous batching for high throughput
2. PagedAttention for memory efficiency
3. Speculative decoding for latency (optional)
4. Tensor parallelism for large models
```

### Key Design Points to Cover

**For Training:**
- Parallelism strategy selection based on model/cluster size
- Memory optimization (ZeRO stage selection)
- Communication pattern (AllReduce, P2P)
- Checkpoint strategy and recovery

**For Inference:**
- Batching strategy (continuous > static)
- KV cache management (paging for efficiency)
- Latency vs throughput trade-offs
- Quantization for memory/speed

---

## Phase 3: Deep Dive Options (15-30 min)

### Option A: 4D Parallelism (Training Focus)

**What to Cover:**

1. **Data Parallelism (DP)**
   - Replicate model, split data
   - AllReduce for gradient synchronization
   - Scales throughput, not model size

2. **Tensor Parallelism (TP)**
   - Split layers across GPUs (typically 8)
   - AllReduce for each layer
   - Use within node (NVLink bandwidth)

3. **Pipeline Parallelism (PP)**
   - Split model by layers across nodes
   - P2P communication between stages
   - 1F1B schedule to minimize bubbles

4. **Expert Parallelism (EP)** (if MoE)
   - Distribute experts across GPUs
   - All-to-All for token routing

**Key Formula:**
```
Total GPUs = TP × PP × DP × EP
Example: 8 × 4 × 16 × 1 = 512 GPUs
```

**What Interviewers Look For:**
- Understanding of when to use each parallelism
- Communication overhead awareness
- Pipeline bubble calculation

### Option B: KV Cache and Batching (Inference Focus)

**What to Cover:**

1. **Why KV Cache Matters**
   - Stores attention keys/values for past tokens
   - Avoids recomputation during decoding
   - Memory grows linearly with context

2. **PagedAttention**
   - OS-style paging for KV cache
   - Non-contiguous block allocation
   - Copy-on-write for beam search

3. **Continuous Batching**
   - Iteration-level scheduling
   - No waiting for batch completion
   - Dynamic batch composition

4. **Memory Calculation**
   ```
   KV per token = 2 × Layers × Heads × Head_dim × Bytes
   70B model: 2 × 80 × 64 × 128 × 2 = 5.2 MB/token
   4K context = 21 GB per request
   ```

**What Interviewers Look For:**
- Understanding memory bottleneck
- Block allocation algorithm
- Preemption strategy

### Option C: Speculative Decoding (Latency Focus)

**What to Cover:**

1. **Why It Works**
   - LLM decoding is memory-bound
   - Verification can batch multiple positions
   - Draft model is cheap

2. **Algorithm**
   - Draft K tokens with small model
   - Verify all K+1 with target (one pass)
   - Accept/reject to preserve distribution

3. **Acceptance Probability**
   ```
   P(accept) = min(1, q(x)/p(x))
   where q = target, p = draft
   ```

4. **Trade-offs**
   - Needs draft model selection
   - Works best for predictable outputs
   - Memory overhead for draft model

**What Interviewers Look For:**
- Understanding why it preserves distribution
- When it helps vs hurts
- Draft model selection criteria

---

## Phase 4: Scale and Reliability (30-40 min)

### Scaling Questions to Expect

| Question | Good Answer Elements |
|----------|---------------------|
| "How do you scale training to 10,000 GPUs?" | Hierarchical AllReduce, ZeRO-3, expert parallelism, efficient checkpointing |
| "How do you handle 100x traffic spike?" | Auto-scaling, request prioritization, graceful degradation, caching |
| "What's the bottleneck at scale?" | Communication for training, memory bandwidth for inference |

### Fault Tolerance Questions

| Question | Good Answer Elements |
|----------|---------------------|
| "How do you handle GPU failure during training?" | Checkpoint-based recovery, in-memory redundancy (ByteRobust), elastic training |
| "What's your RTO for training failures?" | <10 min from checkpoint, <3 min from memory replica |
| "How do you ensure inference availability?" | Multi-instance, health checks, circuit breaker, regional failover |

### Bottleneck Discussion Points

**Training Bottlenecks:**
1. AllReduce communication at scale → gradient compression, hierarchical AllReduce
2. Pipeline bubbles → more microbatches, interleaved schedule
3. Data loading → prefetch, distributed filesystem

**Inference Bottlenecks:**
1. Memory bandwidth during decode → batching, quantization
2. KV cache memory → PagedAttention, quantization
3. Queue depth during spikes → auto-scaling, prioritization

---

## Trade-offs Discussion

### Training Trade-offs

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **TP vs PP** | TP: Lower latency per step, higher bandwidth | PP: Lower memory per GPU, more bubble | TP within node (8 GPUs), PP across |
| **ZeRO-2 vs ZeRO-3** | ZeRO-2: Less communication | ZeRO-3: Better memory scaling | ZeRO-3 for large models |
| **BF16 vs FP8** | BF16: Stable, well-supported | FP8: 2x throughput, needs H100 | FP8 if stability validated |
| **Checkpoint frequency** | More frequent: Better recovery | Less frequent: Lower overhead | Every 10-30 min, balance |

### Inference Trade-offs

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| **INT8 vs INT4** | INT8: <1% quality loss, 2x speedup | INT4: 1-3% loss, 4x speedup | INT8 for quality, INT4 if memory-critical |
| **Static vs Continuous batching** | Static: Simple, predictable | Continuous: Higher throughput | Always continuous for production |
| **With vs without speculative** | Without: Simpler, less memory | With: 2-3x lower latency | Enable for latency-sensitive |
| **Preemption policy** | FCFS: Fair | Priority: SLA-aware | Priority for multi-tenant |

---

## Trap Questions and Best Answers

### Trap 1: "Why not just use data parallelism?"

**Bad Answer:** "We can scale to any size with DP."

**Good Answer:** "Data parallelism replicates the entire model on each GPU. For a 70B model needing 140GB in FP16, it won't fit on a single 80GB GPU. We need tensor parallelism to split layers across GPUs. DP is great for scaling throughput once the model fits, but doesn't help with memory."

### Trap 2: "Can we just increase batch size for better throughput?"

**Bad Answer:** "Yes, larger batches are always better for efficiency."

**Good Answer:** "Larger batches improve GPU utilization but have trade-offs. For training, there's a learning rate scaling challenge - you need to adjust LR with batch size. For inference, larger batches increase TTFT latency because requests wait longer. We use continuous batching to get high throughput while maintaining low TTFT - requests join/leave the batch dynamically."

### Trap 3: "Why is speculative decoding faster if we run two models?"

**Bad Answer:** "The draft model is small so it's basically free."

**Good Answer:** "LLM inference is memory-bandwidth bound during decoding - we spend most time reading weights from memory, not computing. The target model verification is a single forward pass for K+1 tokens simultaneously, which better utilizes GPU compute compared to K sequential single-token passes. The draft model overhead is small (~10% of target compute) relative to the parallelism gain from verifying multiple tokens."

### Trap 4: "How do you handle a node failure during training?"

**Bad Answer:** "Just restart from the last checkpoint."

**Good Answer:** "We have multiple strategies depending on requirements: (1) Checkpoint-restart is the baseline - save every 10-30 minutes, recover in <10 min. (2) In-memory redundancy (ByteRobust pattern) - each GPU stores a copy of a neighbor's state, enabling <1 min recovery from GPU failures. (3) Elastic training can continue with fewer nodes while we replace the failed one. The choice depends on MTBF and recovery time requirements."

### Trap 5: "What happens when KV cache fills up?"

**Bad Answer:** "We return an error to the client."

**Good Answer:** "We use preemption to handle memory pressure. When KV cache approaches capacity, we select a victim sequence (typically lowest priority or most recently started) and swap its KV blocks to CPU memory. This frees GPU memory for higher-priority requests. The preempted request goes to a swap queue and can resume when memory is available. We also use PagedAttention to maximize efficiency - it achieves near-zero memory waste compared to static allocation."

---

## Key Numbers to Memorize

| Category | Metric | Value | Context |
|----------|--------|-------|---------|
| **Hardware** | H100 FP16 TFLOPS | 989 | Peak compute |
| | H100 FP8 TFLOPS | 1,979 | With FP8 tensor cores |
| | H100 Memory | 80 GB | HBM3 |
| | NVLink Bandwidth | 900 GB/s | Intra-node |
| | InfiniBand | 400 Gb/s | Inter-node |
| **Model Memory** | 7B (FP16) | 14 GB | 2 bytes × params |
| | 70B (FP16) | 140 GB | Needs 2 GPUs |
| | 70B (INT8) | 70 GB | Single GPU possible |
| **KV Cache** | Per token (70B) | ~5 MB | 2×L×H×D×2 |
| | 4K context (70B) | ~21 GB | Major memory consumer |
| **Training** | Target MFU | >50% | Industry standard |
| | Checkpoint frequency | 10-30 min | Balance overhead/recovery |
| | Recovery time | <10 min | From checkpoint |
| **Inference** | TTFT target | <200 ms | p99 |
| | TPS target | >50 | Tokens per second |
| | Speculative speedup | 2-3x | With good draft model |

---

## Common Mistakes to Avoid

1. **Ignoring communication overhead** - At scale, AllReduce can dominate; design parallelism around network topology

2. **Underestimating KV cache** - It grows linearly with context and can easily exceed model size

3. **Not considering fault tolerance** - Training runs for days/weeks; failures will happen

4. **Designing static batching** - Continuous batching is strictly better for production inference

5. **Over-engineering for small models** - 7B fits on one GPU; don't add unnecessary complexity

6. **Forgetting about data loading** - GPU should never wait for data; prefetch aggressively

7. **Ignoring numerical stability** - FP16 can overflow; use BF16 or loss scaling

8. **Not discussing trade-offs** - Every design choice has pros and cons; make them explicit

---

## Questions to Ask the Interviewer

```
1. "What's the primary optimization target - throughput or latency?"
   → Shapes batching and parallelism decisions

2. "Are there existing models we need to support, or is this greenfield?"
   → Affects architecture flexibility

3. "What's the hardware budget constraint?"
   → Determines cluster size and scaling strategy

4. "Do we need multi-tenancy for the inference service?"
   → Affects isolation and prioritization design

5. "What's the maximum context length we need to support?"
   → Impacts memory strategy significantly

6. "Is there a preference for open-source frameworks vs custom?"
   → vLLM vs custom inference stack
```

---

## Quick Reference Card

```
+-----------------------------------------------------------------------+
|            LLM TRAINING & INFERENCE - INTERVIEW QUICK REF             |
+-----------------------------------------------------------------------+
|                                                                       |
|  TRAINING KEYWORDS          INFERENCE KEYWORDS                        |
|  -----------------          ------------------                        |
|  4D parallelism             Continuous batching                       |
|  ZeRO-1/2/3                 PagedAttention                            |
|  FSDP                       KV cache                                  |
|  Tensor parallel            Speculative decoding                      |
|  Pipeline parallel          TTFT / TPS                                |
|  Gradient checkpointing     Quantization (INT8/INT4/FP8)              |
|  AllReduce                  Block allocation                          |
|  MFU                        Preemption                                |
|                                                                       |
|  CLARIFYING QUESTIONS       TRADE-OFF PAIRS                           |
|  --------------------       ---------------                           |
|  Training or inference?     TP vs PP (latency vs memory)              |
|  Model size?                ZeRO-2 vs ZeRO-3 (comm vs memory)         |
|  Latency requirement?       INT8 vs INT4 (quality vs speed)           |
|  Context length?            Static vs continuous batch                |
|  MoE architecture?          With/without speculative                  |
|                                                                       |
|  KEY FORMULAS                                                         |
|  ------------                                                         |
|  Training FLOPS = 6 × params × tokens                                 |
|  Model memory = 2 × params (FP16)                                     |
|  KV per token = 2 × L × H × D × 2 bytes                               |
|  AllReduce time = 2 × (N-1)/N × size / bandwidth                      |
|  Bubble fraction = (stages - 1) / microbatches                        |
|                                                                       |
|  CAPACITY NUMBERS                                                     |
|  ----------------                                                     |
|  H100: 80GB, 1979 FP8 TFLOPS, 900 GB/s NVLink                        |
|  70B model: 140GB FP16, 70GB INT8, 5MB KV/token                       |
|  Training: >50% MFU, <10 min recovery                                 |
|  Inference: <200ms TTFT, >50 TPS                                      |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## Sample Interview Walkthrough

### Interviewer: "Design the inference system for a 70B parameter LLM serving 10,000 requests per second."

**Minutes 0-5 (Clarify):**
"Before diving in, let me understand the requirements:
- What's the latency SLO? (Assume <200ms TTFT)
- Average prompt/completion length? (Assume 1K prompt, 200 completion)
- Do we need multi-tenancy? (Assume yes)
- Any cost constraints? (Assume reasonable but not unlimited)

Given 70B model and latency requirements, I'll design for tensor parallelism with continuous batching."

**Minutes 5-15 (High-Level):**
"The architecture has four main components:
1. **Request Gateway**: Load balancing, auth, rate limiting
2. **Scheduler**: Continuous batching with iteration-level scheduling
3. **KV Cache Manager**: PagedAttention for efficient memory
4. **GPU Workers**: Model instances with TP=2-4

Data flow: Request → Gateway → Scheduler → KV allocation → Prefill → Decode loop → Response stream"

**Minutes 15-30 (Deep Dive on KV Cache):**
"Let me deep dive on KV cache since it's the main bottleneck.

For 70B model: KV per token = 2 × 80 layers × 64 heads × 128 dim × 2 bytes = 5.2 MB.
With 1.2K tokens (1K prompt + 200 output) = 6.2 GB per request.

On 80GB GPU with 70GB model (INT8), we have ~10GB for KV cache = ~1.5 concurrent requests. That's terrible!

Solution: PagedAttention. We allocate in 16-token blocks, only as needed. Benefits:
1. No pre-allocation waste
2. Non-contiguous allocation
3. Prefix sharing for common system prompts

With prefix caching and efficient allocation, we get 2-3x more capacity."

**Minutes 30-40 (Scale & Reliability):**
"For 10K QPS with our ~500 TPS per instance (INT8, batched), we need ~20 instances minimum.

Scaling strategy:
- Auto-scale based on queue depth and latency
- Minimum 20, max 100 instances
- Multi-region for availability

Reliability:
- Health checks, circuit breaker
- Request retry with backoff
- Graceful degradation (reduce context) under pressure"

**Minutes 40-45 (Wrap Up):**
"Key trade-offs I made:
1. INT8 over FP16: 2x memory savings, <1% quality loss
2. Continuous over static batching: Higher throughput, same latency
3. TP=2 over TP=8: Good balance of latency and cost

Questions: What's the traffic pattern like - steady or bursty? Are there different priority tiers?"
