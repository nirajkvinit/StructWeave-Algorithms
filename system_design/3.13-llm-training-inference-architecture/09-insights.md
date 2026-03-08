# Key Insights: LLM Training & Inference Architecture

## Insight 1: 4D Parallelism Maps Communication Patterns to Hardware Topology

**Category:** Partitioning
**One-liner:** Tensor parallelism uses NVLink within a node while data parallelism uses InfiniBand across nodes because placing high-frequency communication on the fastest interconnect is the key to distributed training efficiency.

**Why it matters:** A 70B model requires ~890 GB of memory (weights + optimizer + gradients + activations), far exceeding any single GPU's 80 GB. 4D parallelism partitions computation along four axes, each matched to the optimal network fabric. Tensor parallelism (TP=8) requires AllReduce at every layer and must use NVLink (900 GB/s intra-node). Pipeline parallelism (PP=2) communicates activations only at micro-batch boundaries via point-to-point sends. Data parallelism (DP=4) performs gradient AllReduce once per step over InfiniBand. Expert parallelism (EP) uses All-to-All for MoE token routing. The result: 890 GB distributed to ~45 GB per GPU across 64 GPUs. Misaligning parallelism dimensions to hardware topology can increase communication overhead from under 30% to over 50% of step time.

---

## Insight 2: LLM Inference Is Memory-Bandwidth Bound, Not Compute-Bound

**Category:** Contention
**One-liner:** Decoding a single token from a 70B model requires reading 280 GB of weights from memory, making GPU memory bandwidth the bottleneck rather than FLOPs.

**Why it matters:** This counterintuitive bottleneck explains why adding more compute alone does not speed up inference. An H100 with 3.35 TB/s bandwidth produces only ~12 tokens/second for a single request on a 70B FP16 model. Batching amortizes weight reads across requests (batch=8 yields ~96 tokens/sec total), and quantization (INT8/INT4) directly doubles or quadruples effective bandwidth. Speculative decoding exploits this by verifying K tokens in a single forward pass (same memory read cost as generating 1 token). Systems that treat inference as compute-bound will overinvest in FLOPs while neglecting the memory-bandwidth optimizations that actually improve throughput.

---

## Insight 3: PagedAttention Applies OS Virtual Memory Concepts to KV Cache

**Category:** Data Structures
**One-liner:** By mapping logical KV blocks to non-contiguous physical GPU memory blocks via a block table, PagedAttention reduces memory waste from 50% to under 5% during inference.

**Why it matters:** KV cache for a 70B model consumes ~5.2 MB per token. With a 32K context, that is 167 GB per request. Naive static allocation pre-allocates for maximum sequence length, wasting 50% of GPU memory on shorter sequences. PagedAttention maps logical blocks to non-contiguous physical blocks via a block table (16 tokens per block), allocating only as tokens are generated. This enables prefix caching (sharing system prompt KV across requests via reference counting for 10-30% memory reduction) and copy-on-write semantics. Preemption strategies (FCFS, priority, LRU) mirror OS process scheduling for memory reclamation. Without paged allocation, long-context serving is practically impossible at scale.

---

## Insight 4: Pipeline Bubbles Create Irreducible Idle Time Proportional to Stage Count

**Category:** Scaling
**One-liner:** Pipeline parallelism wastes (num_stages - 1) / num_microbatches of total compute in warmup and cooldown bubbles, making microbatch count the critical tuning knob.

**Why it matters:** With 4 pipeline stages and 8 microbatches, the bubble fraction is 3/8 = 37.5%, meaning over a third of GPU time is wasted. The 1F1B (one-forward-one-backward) schedule keeps memory constant but does not eliminate bubbles. Practical mitigations include increasing microbatches far beyond stage count, virtual pipeline stages (more fine-grained chunks per GPU), and interleaved schedules. The key design tension is that more pipeline stages reduce memory per GPU but increase the bubble fraction, typically targeting under 10% waste. Architects who add stages for memory relief without proportionally increasing microbatches will see MFU plummet below the 50% target.

---

## Insight 5: Speculative Decoding Trades Draft Model Accuracy for Latency Reduction

**Category:** Cost Optimization
**One-liner:** A small draft model generates multiple candidate tokens cheaply, and the large target model verifies them all in a single forward pass, achieving 2-3x latency reduction while maintaining the exact output distribution.

**Why it matters:** The mathematical guarantee is critical: acceptance probability min(1, q(x)/p(x)) ensures the output distribution is identical to the target model alone. The sweet spot is a draft model around 10% the size of the target (7B draft for 70B target), with K=4-8 draft tokens per verification. This works best for predictable outputs (code, structured data) where draft-target alignment is high (90%+ acceptance rate), but hurts for high-temperature creative generation. Variants like Medusa (multiple prediction heads, 2x speedup), EAGLE-3 (autoregressive head, 2.5x), and self-speculative (early exit from target model, 1.5x) offer different memory-speed tradeoffs.

---

## Insight 6: ZeRO Sharding Progressively Trades Communication for Memory at Three Distinct Stages

**Category:** Scaling
**One-liner:** ZeRO Stage 1 shards optimizer states for a 4x memory reduction, Stage 2 adds gradient sharding for 8x, and Stage 3 shards parameters for Nx reduction, each adding more communication overhead.

**Why it matters:** A 70B model needs 140 GB for weights, 140 GB for gradients, and 560 GB for Adam optimizer states. ZeRO-1 alone reduces optimizer memory from 560 GB to 560/N GB per GPU, often enough to fit on available hardware. ZeRO-3 distributes everything but requires gather operations for every forward and backward pass. Choosing the right ZeRO stage is about finding the minimum communication overhead that allows the model to fit. Over-sharding (using ZeRO-3 when ZeRO-1 suffices) adds unnecessary all-gather latency. Combined with gradient checkpointing (50%+ activation memory savings at the cost of recomputation), these techniques make trillion-parameter training possible on commodity GPU clusters.

---

## Insight 7: Communication-Computation Overlap Hides AllReduce Latency

**Category:** Scaling
**One-liner:** Starting the AllReduce for layer N's gradients while computing the backward pass for layer N-1 can hide up to 100% of communication latency, converting a 35% overhead into near-zero visible cost.

**Why it matters:** For a 70B model on 64 GPUs, AllReduce takes ~5.5 seconds per step against 10 seconds of compute, producing a 35% overhead. By starting AllReduce for each layer's gradients immediately after they are computed during the backward pass, communication overlaps with computation. Combined with hierarchical AllReduce (intra-node NVLink first, then inter-node InfiniBand) and gradient compression (2-10x data size reduction), communication overhead can drop from 35% to under 10%. Without overlap, distributed training throughput scales sub-linearly with GPU count, making large-scale training economically unviable.

---

## Insight 8: Continuous Batching with Preemption Maximizes GPU Utilization During Inference

**Category:** Streaming
**One-liner:** Iteration-level scheduling adds new requests to an in-flight batch at every decode step rather than waiting for the entire batch to complete, eliminating padding waste and enabling preemption for priority requests.

**Why it matters:** Static batching pads all sequences to the longest in the batch. If one request generates 10 tokens and another generates 1000, the short request's GPU slot is idle for 990 steps. Continuous batching inserts a new request into the freed slot immediately. Combined with chunked prefill (splitting long prefills into chunks interleaved with decode steps to prevent latency spikes) and preemption strategies (FCFS, priority-based, LRU), this enables SLA differentiation and 2-10x throughput improvement over static batching. Double-buffering prevents race conditions between batch building and execution.

---

## Insight 9: Barrier-Based Distributed Checkpointing Prevents Inconsistent Recovery

**Category:** Consensus
**One-liner:** All GPU ranks must reach a synchronization barrier before writing their local checkpoint state, because unsynchronized snapshots capture the model at different training steps and produce an irrecoverable inconsistent checkpoint.

**Why it matters:** In distributed training, each rank holds a different shard of weights, optimizer states, and gradients. If ranks checkpoint at different steps, the restored model mixes parameters from step N with optimizer states from step N+1, producing corrupt gradients. The barrier protocol ensures: Rank 0 broadcasts "checkpoint" signal, all ranks complete the current micro-batch, all call barrier(), each saves local state, Rank 0 saves global metadata, all call barrier() again, then resume. With checkpoint sizes of ~280 GB for a 70B model and 10-30 minute intervals, async checkpointing overlaps I/O with training while maintaining consistency guarantees.

---

## Insight 10: GQA/MQA Reduces KV Cache by 4-8x for Long Context Feasibility

**Category:** Data Structures
**One-liner:** Grouped-Query Attention shares KV heads across multiple query heads, reducing KV cache memory from 5.2 MB per token to under 1 MB, making 32K+ contexts feasible on a single GPU.

**Why it matters:** Standard multi-head attention with 64 KV heads produces 5.2 MB of KV cache per token for a 70B model. At 32K context, that is 167 GB per request, exceeding a single GPU. GQA uses 8 KV heads (one per group of 8 query heads), reducing KV cache by 8x to ~21 GB for 32K context. Combined with KV quantization (INT8 for another 2x), sliding window attention (bounded memory for very long contexts), and PagedAttention (no pre-allocation waste), the cascade can reduce effective KV requirements by 20-30x. Without these techniques, batch sizes collapse to 1 even for moderate sequence lengths.

---

## Insight 11: Flash Attention Trades Recomputation for Memory via IO-Aware Tiling

**Category:** Cost Optimization
**One-liner:** Flash Attention avoids materializing the full N x N attention matrix in HBM by computing attention in tiles that fit in SRAM, reducing memory from O(N^2) to O(N) at the cost of recomputation during the backward pass.

**Why it matters:** Standard attention for a 32K sequence requires a 32K x 32K matrix (~4 GB in FP16), quickly exhausting GPU memory. Flash Attention exploits the GPU memory hierarchy: SRAM is ~10x faster than HBM but much smaller. By tiling the computation to fit in SRAM and fusing softmax with matrix multiplication, it avoids the O(N^2) memory bottleneck. The recomputation cost during backward is small relative to the memory savings, enabling 2-4x longer sequences or larger batch sizes. This is now a baseline requirement for any production LLM system.

---

## Insight 12: Inference Concurrency Requires Atomic Block Allocation and Reference Counting

**Category:** Atomicity
**One-liner:** Concurrent KV cache block allocation needs atomic operations with locks to prevent two requests from claiming the same block, while prefix cache eviction needs reference counting to avoid freeing blocks still shared by active requests.

**Why it matters:** During high-throughput inference, multiple requests simultaneously allocate KV cache blocks, modify batch composition, and share prefix cache entries. Without atomic block allocation, two requests can grab the same physical block, corrupting each other's KV state. Without reference counting on shared prefix blocks, an eviction can free memory still in use by an active request, producing garbage output. Double-buffering separates batch building from execution to prevent mid-iteration request insertion. These are classic concurrent data structure challenges applied to the unique domain of GPU memory management.

---
