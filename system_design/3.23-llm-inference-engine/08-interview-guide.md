# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | What to Demonstrate |
|------|-------|-------|---------------------|
| 0-5 min | **Clarify** | Ask questions, scope the problem | Structured thinking, don't assume |
| 5-15 min | **High-Level** | Core components, data flow | System decomposition, trade-offs |
| 15-30 min | **Deep Dive** | 1-2 critical components | Technical depth, algorithms |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios | Production experience |
| 40-45 min | **Wrap Up** | Summary, handle follow-ups | Communication, flexibility |

---

## Clarification Questions

Always ask these before designing:

### Scope Questions

```
1. "Are we designing the inference ENGINE or the serving INFRASTRUCTURE?"
   ─────────────────────────────────────────────────────────────────────
   Engine: Scheduler, memory manager, executor (this doc)
   Infrastructure: Load balancing, autoscaling, API gateway (different design)

2. "What's the latency vs throughput priority?"
   ─────────────────────────────────────────────
   Latency-first: Speculative decoding, smaller batches, higher TP
   Throughput-first: Continuous batching, larger batches, disaggregated P/D

3. "Single model or multi-model serving?"
   ──────────────────────────────────────
   Single: Simpler memory management, full GPU for one model
   Multi: Weight caching, memory multiplexing, model switching overhead

4. "What's the expected context length distribution?"
   ─────────────────────────────────────────────────
   Short (< 1K): More concurrent requests, simpler memory
   Long (> 8K): KV cache becomes dominant, fewer concurrent, need chunked prefill

5. "What model sizes are we targeting?"
   ─────────────────────────────────────
   < 70B: Single GPU possible with quantization
   70B-400B: Tensor parallelism required
   > 400B: Multi-node pipeline parallelism
```

### Constraint Questions

```
6. "What's the hardware?"
   ───────────────────────
   H100/H200: Full feature set, FP8, high bandwidth
   A100: Good but no FP8, slightly lower bandwidth
   Consumer (RTX): Limited memory, different optimization

7. "Are there cost constraints?"
   ─────────────────────────────
   Cost-sensitive: Aggressive quantization, maximize batch size
   Performance-focused: FP16, speculative decoding, lower latency

8. "What about multi-tenancy?"
   ────────────────────────────
   Single-tenant: Simpler, no isolation concerns
   Multi-tenant: Need memory isolation, fair scheduling, quotas
```

---

## Trap Questions and Model Answers

### Trap 1: "Why not just pre-allocate KV cache for max context?"

```
BAD ANSWER:
"We can tune the max length to match expected usage and pre-allocate."

GOOD ANSWER:
"Pre-allocation wastes memory proportional to (max_len - actual_len).

With 4K max context and 500 average, that's 87.5% waste. For a 70B model
where KV is 320KB per token, 4K tokens = 1.28GB per request. With 6GB
KV cache budget, we could only serve 4 concurrent requests.

PagedAttention allocates on-demand with 16-token blocks. With 500 avg
tokens = 32 blocks = 160MB, we can serve ~37 concurrent requests.
That's 9x more throughput.

The overhead is ~5% latency from indirect memory access through block
tables, but the throughput gain far outweighs this cost."
```

### Trap 2: "Can speculative decoding work with any draft model?"

```
BAD ANSWER:
"Yes, any smaller model works as a draft."

GOOD ANSWER:
"No, the draft model must have similar output distribution to the target.
Acceptance rate depends on KL divergence between distributions.

Best results require:
- Same model family (7B Llama drafting for 70B Llama)
- Distilled versions (student-teacher relationship)
- Same training data distribution

With a mismatched draft model, acceptance rate drops below 50%.
At that point, we're doing 2x the compute (draft + verify) for
< 2x the tokens, making it slower than autoregressive.

Also, speculative decoding degrades with high temperature sampling.
At temp=0 (greedy), we see 80-95% acceptance. At temp=1.0, it drops
to 40-55%. Above temp=0.7, I'd disable speculation entirely."
```

### Trap 3: "Why does continuous batching help throughput?"

```
BAD ANSWER:
"It allows larger batch sizes."

GOOD ANSWER:
"Continuous batching solves two problems with static batching:

1. HEAD-OF-LINE BLOCKING:
   Static batch waits for slowest sequence. If one request generates
   200 tokens while others generate 20, the short ones wait.
   Continuous batching removes finished sequences immediately.

2. PADDING WASTE:
   Static batching pads shorter sequences to longest length.
   With variable-length outputs, most tokens are padding.
   Continuous batching processes exact token counts.

The result is 2-3x throughput improvement:
- GPU always processes useful tokens (no padding)
- No idle time waiting for stragglers
- Memory freed immediately when done

Implementation is iteration-level: every decode step, check for
finished sequences, remove them, add waiting sequences if memory
allows. The scheduler runs in microseconds between GPU forward passes."
```

### Trap 4: "How do you handle prefix caching invalidation?"

```
BAD ANSWER:
"We use TTL-based expiration."

GOOD ANSWER:
"Prefix cache entries are immutable—once KV is computed for a token
sequence, it doesn't change. So invalidation is simpler than typical
caches:

1. MEMORY PRESSURE EVICTION:
   When cache is full, evict using LRU or SLRU policy.
   Protected frequently-used entries (like system prompts).

2. MODEL CHANGE:
   If model weights change (fine-tuning, update), flush entire cache.
   KV values depend on weights, so all entries invalid.

3. NO CONTENT-BASED INVALIDATION:
   Unlike data caches, we never need to invalidate because
   underlying data changed. Prompts are deterministic.

For sharing, we use reference counting. Entry is only evicted when
ref_count=0 AND under memory pressure. This enables copy-on-write
for beam search—forked sequences share prefix blocks without
duplicating memory."
```

### Trap 5: "Why not just add more GPUs for higher throughput?"

```
BAD ANSWER:
"More GPUs means more parallel processing, so linear scaling."

GOOD ANSWER:
"It depends on how you add GPUs:

TENSOR PARALLELISM (more GPUs per instance):
- Reduces latency by sharding computation
- But adds AllReduce overhead after every layer
- H100 NVLink: 900 GB/s, still ~5-10% overhead per TP degree
- TP=8 might give only 6x speedup, not 8x
- Use for latency, not throughput

HORIZONTAL SCALING (more instances):
- Each instance runs independently
- Near-linear throughput scaling
- But doesn't reduce latency
- Need load balancing

For throughput, horizontal scaling is better.
For latency, tensor parallelism up to TP=8 per node.
For very large models, pipeline parallelism across nodes
with micro-batching to hide bubble overhead."
```

---

## Key Numbers to Memorize

```
┌─────────────────────────────────────────────────────────────────────┐
│                    KEY NUMBERS FOR INTERVIEWS                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  KV CACHE MATH                                                      │
│  ─────────────                                                      │
│  Formula: 2 × layers × kv_heads × head_dim × 2 bytes                │
│  Llama-2 70B: 2 × 80 × 8 × 128 × 2 = 327,680 bytes ≈ 320 KB/token   │
│  Llama-3 405B: ~1.2 MB per token                                    │
│                                                                     │
│  BLOCK CONFIGURATION                                                │
│  ───────────────────                                                │
│  Block size: 16 tokens (vLLM default)                               │
│  Block memory (70B): 16 × 320KB = 5.12 MB                           │
│                                                                     │
│  PAGEDATTENTION                                                     │
│  ───────────────                                                    │
│  Overhead: ~5% latency                                              │
│  Savings: 60-95% memory waste reduction                             │
│  Result: 4-10x more concurrent requests                             │
│                                                                     │
│  SPECULATIVE DECODING                                               │
│  ─────────────────────                                              │
│  Speedup: 2-3x (with good draft model)                              │
│  Acceptance @ temp=0: 80-95%                                        │
│  Acceptance @ temp=1: 40-55%                                        │
│  Break-even point: ~50% acceptance                                  │
│                                                                     │
│  LATENCY TARGETS                                                    │
│  ───────────────                                                    │
│  TTFT (p99): < 200ms                                                │
│  TPS per request: > 50 tokens/sec                                   │
│  Inter-token latency: < 20ms (decode iteration)                     │
│                                                                     │
│  THROUGHPUT                                                         │
│  ──────────                                                         │
│  70B INT8 on H100: 50,000+ tokens/sec                               │
│  Decode batch=1: ~48 TPS (memory-bound)                             │
│  Larger batches amortize weight reads                               │
│                                                                     │
│  HARDWARE                                                           │
│  ────────                                                           │
│  H100 memory: 80 GB HBM3                                            │
│  H100 bandwidth: 3.35 TB/s                                          │
│  H100 FP8: 1,979 TFLOPS                                             │
│  NVLink: 900 GB/s                                                   │
│  InfiniBand: 400 Gb/s                                               │
│                                                                     │
│  SCHEDULER                                                          │
│  ─────────                                                          │
│  Iteration overhead: 500μs (Python) → 50μs (CUDA graphs)            │
│  Block allocation: < 1μs target                                     │
│                                                                     │
│  MODEL MEMORY (FP16)                                                │
│  ───────────────────                                                │
│  7B: 14 GB                                                          │
│  70B: 140 GB                                                        │
│  405B: 810 GB                                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Sample 45-Minute Walkthrough

**Question:** "Design the KV cache manager for a 70B model inference engine on H100 GPUs."

### Minutes 0-5: Clarify

```
ME: "Before diving in, let me clarify a few things:

1. Is this for a single H100 or multi-GPU setup?"
INTERVIEWER: "Start with single, then discuss scaling."

ME: "2. What's the target context length?"
INTERVIEWER: "Support up to 8K, but average is around 1K."

ME: "3. Latency or throughput priority?"
INTERVIEWER: "Balanced—good TTFT but maximize throughput."

ME: "4. Any multi-tenancy requirements?"
INTERVIEWER: "Single tenant for now."

ME: "Great. So we're designing a KV cache manager for single H100,
8K max context, 1K average, optimizing for both latency and throughput.
Let me start with the high-level architecture."
```

### Minutes 5-15: High-Level Design

```
ME: "The KV cache manager has three main components:

1. BLOCK ALLOCATOR
   Manages a pool of fixed-size physical blocks on GPU memory.
   Uses a free list for O(1) allocation and deallocation.

2. BLOCK TABLE MANAGER
   Maintains per-sequence mapping from logical blocks to physical blocks.
   Enables non-contiguous allocation (PagedAttention).

3. PREFIX CACHE
   Stores computed KV for common prefixes.
   Uses hash-based lookup with reference counting for sharing.

Let me size the memory budget:

70B model in INT8 = 70GB
H100 has 80GB
Remaining for KV cache: ~8-10GB after activations

KV per token = 2 × 80 layers × 8 heads × 128 dim × 2 bytes
            = 327,680 bytes ≈ 320KB

With 8GB for KV: 8GB / 320KB = 25,000 tokens capacity
Block size 16 tokens: ~1,560 blocks available

At 1K average context: ~25 concurrent requests
At 8K max context: ~3 concurrent requests

This shows why PagedAttention matters—if we pre-allocated 8K per
request, we'd only handle 3 requests even though average is 1K."

[Draw block diagram on whiteboard]
```

### Minutes 15-30: Deep Dive on Block Allocation

```
ME: "Let me dive into the block allocation algorithm.

DATA STRUCTURES:
- PhysicalBlock: block_id, ref_count, is_allocated
- BlockTable: sequence_id → list of physical block IDs
- FreeList: stack of available block IDs

ALLOCATION ALGORITHM:
When a new sequence arrives with N prompt tokens:
1. Calculate blocks_needed = ceil(N / 16)
2. Check if free_list has enough blocks
3. If yes, pop blocks from free_list, set ref_count=1
4. Create block_table mapping for this sequence
5. Return success

For each decode token:
1. Check if current last block is full (16 tokens)
2. If full, allocate one new block (same algorithm)
3. Write KV to last block at next position

DEALLOCATION:
When sequence completes:
1. For each block in block_table:
   - Decrement ref_count
   - If ref_count == 0, push to free_list
2. Clear block_table

COPY-ON-WRITE for prefix sharing:
1. When forking (prefix cache hit):
   - Copy block_table reference
   - Increment ref_count for shared blocks
2. When writing to shared block:
   - If ref_count > 1, allocate new block, copy data
   - Update block_table to point to new block
   - Decrement ref_count on old block

This enables prefix caching without duplicating memory."

[Write pseudocode for key operations]
```

### Minutes 30-40: Scale and Bottlenecks

```
ME: "Let me discuss bottlenecks and scaling.

BOTTLENECK 1: Lock Contention
Multiple threads competing for free_list.
Solution: Per-worker block pools with work stealing.
Result: 90% reduction in contention.

BOTTLENECK 2: Prefix Cache Eviction Storms
Under memory pressure, evicting good entries.
Solution: SLRU policy—protect frequently-used prefixes.
Result: More stable hit rates.

BOTTLENECK 3: Memory Fragmentation
This is actually a non-issue with PagedAttention!
Unlike contiguous allocation, any free block works
for any logical position. No defragmentation needed.

SCALING TO MULTI-GPU:
For larger models, we'd use tensor parallelism.
Each GPU has its own KV cache pool.
Block tables are replicated across GPUs.
Allocation decisions made on rank 0, broadcast to others.

FAILURE HANDLING:
If GPU fails, we lose all KV cache.
For inference, this is acceptable—requests retry.
No checkpointing needed since requests are short.
Recovery is: restart process, reload model, resume serving."
```

### Minutes 40-45: Wrap Up

```
ME: "To summarize the design:

KEY DECISIONS:
1. PagedAttention with 16-token blocks
2. Reference-counted blocks for prefix sharing
3. Copy-on-write for fork operations
4. Per-worker pools for low-contention allocation

KEY TRADE-OFFS:
1. Block size: 16 is balance between fragmentation (smaller)
   and allocation overhead (larger)
2. ~5% latency overhead from indirection, but 4-10x more
   concurrent requests
3. Prefix cache adds memory overhead but 30%+ hit rate
   for repetitive workloads

METRICS TO MONITOR:
- Block utilization (target: 70-90%)
- Prefix cache hit rate (target: >30%)
- Allocation latency (target: <1μs)

INTERVIEWER: "What if we needed to support 128K context?"

ME: "Good question. At 128K tokens × 320KB = 40GB just for one
request's KV cache. Options:
1. KV cache quantization (INT8/FP8) → 2x capacity
2. Disaggregated serving → KV on separate memory pool
3. Ring attention / sliding window → limit active KV
4. Multi-node with KV cache partitioning

The choice depends on whether we need full attention over
128K or can approximate with sliding window."
```

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Jumping to PagedAttention without explaining why | Interviewer wants to see reasoning | Start with naive approach, show problems, then introduce solution |
| Ignoring memory math | Shows lack of practical experience | Always do back-of-envelope calculations |
| "Just add more GPUs" | Doesn't understand scaling nuances | Discuss TP vs PP vs horizontal, trade-offs of each |
| Over-complicating day 1 | Not practical for interview | Design for 10x scale, mention 100x as extension |
| Ignoring failure modes | Production systems fail | Discuss GPU failures, OOM handling, timeouts |
| Not discussing trade-offs | One-sided answers are weak | Every decision has pros and cons |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│           LLM INFERENCE ENGINE - INTERVIEW QUICK REFERENCE          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WHY MEMORY-BOUND?                                                  │
│  Decode reads 70GB weights per token, only 140 GFLOPs compute       │
│  Memory time >> compute time → batch to amortize                    │
│                                                                     │
│  PAGEDATTENTION IN 30 SECONDS:                                      │
│  OS-style paging for KV cache. 16-token blocks. Non-contiguous.     │
│  5% overhead, 4-10x more concurrent requests.                       │
│                                                                     │
│  CONTINUOUS BATCHING IN 30 SECONDS:                                 │
│  Remove finished sequences every iteration. Add waiting ones.       │
│  No padding, no head-of-line blocking. 2-3x throughput.             │
│                                                                     │
│  SPECULATIVE DECODING IN 30 SECONDS:                                │
│  Draft k tokens with small model. Verify all at once with target.   │
│  Accept/reject with probability matching. 2-3x speedup if >70% acc. │
│                                                                     │
│  DISAGGREGATED P/D IN 30 SECONDS:                                   │
│  Prefill is compute-bound, decode is memory-bound.                  │
│  Separate workers, transfer KV via RDMA. 30-50% throughput gain.    │
│                                                                     │
│  FRAMEWORK PICK:                                                    │
│  vLLM: General purpose, high throughput                             │
│  TensorRT-LLM: Lowest latency on NVIDIA                             │
│  SGLang: Best prefix caching (multi-turn)                           │
│  llama.cpp: Edge/consumer hardware                                  │
│                                                                     │
│  INTERVIEW KEYWORDS:                                                │
│  PagedAttention, continuous batching, KV cache, block table,        │
│  speculative decoding, tensor parallelism, TTFT, TPS, prefix cache, │
│  copy-on-write, reference counting, CUDA graphs, chunked prefill    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
