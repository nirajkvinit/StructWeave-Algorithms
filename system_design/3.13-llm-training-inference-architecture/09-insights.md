# Key Insights: LLM Training & Inference Architecture

## Insight 1: PagedAttention Treats KV Cache Like Virtual Memory

**Category:** Data Structures
**One-liner:** By mapping logical KV blocks to non-contiguous physical GPU memory blocks via a block table, PagedAttention reduces KV cache memory waste from 50% (static allocation) to under 5%.

**Why it matters:** For a 70B model with 4K context, KV cache consumes ~21GB per request. Naive static allocation pre-allocates for the maximum sequence length, wasting 50% of memory on sequences shorter than the maximum. PagedAttention borrows the virtual memory abstraction from operating systems: each sequence has logical blocks mapped to physical GPU memory blocks through a page table, blocks are allocated on demand as the sequence grows, and partial blocks waste only the last block's unused slots (16 tokens per block). This paging approach also enables prefix caching -- when multiple requests share a system prompt, the shared prefix blocks use reference counting (ref_count=3 for 3 requests) instead of duplication, saving 10-30% memory for chat applications. The preemption strategies (FCFS, longest, priority, LRU) mirror OS process scheduling, allowing the system to reclaim memory from lower-priority requests when the block pool is exhausted.

---

## Insight 2: 4D Parallelism Partitions Different Dimensions of Computation

**Category:** Partitioning
**One-liner:** Tensor parallelism splits layers across GPUs within a node (NVLink), pipeline parallelism splits the model by layer groups across nodes, data parallelism replicates across node groups, and expert parallelism distributes MoE experts -- each axis using the optimal interconnect for its communication pattern.

**Why it matters:** A 70B model requires ~890GB of memory (weights + optimizer + gradients + activations), but each GPU has only 80GB. 4D parallelism partitions this problem along four independent axes, each matched to the right network fabric. Tensor parallelism (TP=8) splits individual layer computations within a node, using NVLink (900 GB/s) for the frequent AllReduce it requires at every layer. Pipeline parallelism (PP=2) splits the model into stage groups that communicate activations between nodes, requiring only point-to-point sends at micro-batch boundaries. Data parallelism (DP=4) replicates the (already TP+PP-sharded) model and splits data across replicas, using InfiniBand for gradient AllReduce once per training step. Expert parallelism (EP) adds the MoE dimension, using All-to-All communication for token routing. The result: 890GB distributed to ~45GB per GPU across 64 GPUs, fitting within 80GB with room for overhead.

---

## Insight 3: Speculative Decoding Exploits the Memory-Bandwidth Bottleneck

**Category:** Cost Optimization
**One-liner:** Since autoregressive decoding is memory-bandwidth bound (reading all 140GB of weights for each token), speculative decoding generates 3-4 tokens per target model forward pass by drafting with a cheap model and verifying in parallel.

**Why it matters:** During decoding, each token requires reading all model weights from GPU memory. For a 70B FP16 model, that is 280GB of memory reads per token. With H100 bandwidth of 3.35 TB/s, maximum single-request throughput is only 12 tokens/sec -- the compute units sit nearly idle while waiting for memory reads. Speculative decoding reframes this: a small draft model (7B, ~10% size) generates K=4-8 candidate tokens cheaply, then the full target model verifies all candidates in a single forward pass (same memory read cost as generating one token). The acceptance criterion min(1, q(x)/p(x)) mathematically guarantees the output distribution is identical to the target model. With a well-aligned draft model achieving 90%+ acceptance rate, the effective throughput increases 2-3x. The key insight is that verification of K tokens costs almost the same as generating 1 token, because the bottleneck is weight reading, not computation.

---

## Insight 4: Pipeline Bubbles Are the Hidden Tax on Pipeline Parallelism

**Category:** Scaling
**One-liner:** Pipeline parallelism creates idle GPU time (bubbles) of fraction (stages-1)/microbatches at the start and end of each batch, and reducing this to acceptable levels requires microbatches to vastly outnumber stages.

**Why it matters:** With 4 pipeline stages and 8 microbatches, the bubble fraction is 3/8 = 37.5% -- meaning over a third of GPU time is wasted on idle stages waiting for the pipeline to fill (warmup) or drain (cooldown). This is not a bug but an inherent cost of pipeline parallelism. The 1F1B (one-forward-one-backward) schedule interleaves forward and backward passes to keep memory constant, but does not eliminate bubbles. Practical mitigations include increasing microbatches (num_mb >> num_stages), virtual pipeline stages (splitting layers into more fine-grained stages per GPU for better overlap), and interleaved schedules (assigning multiple non-contiguous model chunks to each GPU). The key design decision is balancing pipeline depth (more stages = less memory per GPU) against bubble overhead (more stages = more waste), typically targeting a bubble fraction below 10%.

---

## Insight 5: Communication-Computation Overlap Hides AllReduce Latency

**Category:** Scaling
**One-liner:** Start the AllReduce for layer N's gradients while computing the backward pass for layer N-1, hiding communication latency behind computation and preventing AllReduce from becoming a serial bottleneck.

**Why it matters:** For a 70B model on 64 GPUs, gradient AllReduce takes 5.5 seconds per step (2 x 63/64 x 140GB / 50 GB/s). If forward+backward computation takes 10 seconds, AllReduce adds 35% overhead if done sequentially. The overlap strategy exploits the fact that gradient computation proceeds layer-by-layer in the backward pass: as soon as layer N's gradient is computed, its AllReduce can begin while layer N-1's backward pass runs on the GPU. Combined with ZeRO-3 (which replaces AllReduce with ReduceScatter for linear scaling) and hierarchical AllReduce (intra-node first via NVLink, then inter-node via InfiniBand), communication overhead can be reduced from 35% to under 10%. Gradient compression (2-10x data size reduction) provides further savings when communication bandwidth is the constraining resource.

---

## Insight 6: Continuous Batching Replaces Static Batching for 2-10x Throughput

**Category:** Streaming
**One-liner:** Instead of waiting for all sequences in a batch to finish before starting new ones, continuous batching inserts and removes individual sequences at the iteration level, eliminating the idle GPU cycles caused by length-variable sequences.

**Why it matters:** Static batching pads all sequences to the length of the longest, wasting compute on padding tokens. When one sequence finishes at 50 tokens and another runs to 2,000 tokens, the finished sequence's GPU slot sits idle for 1,950 iterations. Continuous (iteration-level) batching detects completed sequences at every decode step and immediately fills their slots with waiting requests. Combined with chunked prefill (splitting long prefills into chunks interleaved with decode steps to prevent latency spikes for concurrent decode requests), this approach achieves 2-10x higher throughput than static batching. The scheduler must handle preemption (evicting lower-priority sequences when memory is exhausted) and double-buffering (building the next batch while the current one is executing) to avoid race conditions.

---

## Insight 7: Barrier-Based Distributed Checkpointing for Consistent Recovery

**Category:** Consensus
**One-liner:** All GPU ranks must reach a synchronization barrier before writing their local checkpoint state, because unsynchronized snapshots capture the model at different training steps and produce an irrecoverable inconsistent checkpoint.

**Why it matters:** In distributed training across thousands of GPUs, each rank holds a different shard of model weights, optimizer states, and gradients. If ranks checkpoint at different training steps, the restored model mixes parameters from step N with optimizer states from step N+1, producing a corrupt model. The barrier protocol ensures consistency: Rank 0 broadcasts a "checkpoint" signal, all ranks complete their current micro-batch, all call barrier(), each saves its local state (weights shard, optimizer shard, data loader position), Rank 0 saves global metadata (step count, loss, learning rate), all call barrier() again, then resume training. With checkpoint sizes of ~280GB for a 70B model, async checkpointing (writing to storage while training continues) overlaps I/O with computation, and checkpoint intervals of 10-30 minutes balance recovery granularity against overhead.

---

## Insight 8: GQA/MQA Reduces KV Cache by 4-8x for Long Context Feasibility

**Category:** Data Structures
**One-liner:** Grouped-Query Attention shares KV heads across multiple query heads, reducing KV cache memory from 5.2MB per token to under 1MB per token for a 70B model, making 32K+ contexts feasible on a single GPU.

**Why it matters:** For a 70B model with standard multi-head attention, KV cache is 2 x 80 layers x 64 heads x 128 dim x 2 bytes = 5.2MB per token. At 32K context length, that is 167GB per request -- exceeding a single GPU's entire memory. GQA/MQA reduces this by sharing KV heads: instead of 64 KV heads, GQA might use 8 (one per group of 8 query heads), reducing KV cache by 8x to ~21GB for 32K context. This interacts with other optimizations: KV quantization (INT8 KV values for another 2x), sliding window attention (bounded memory for very long contexts), and PagedAttention (no pre-allocation waste). The cascade of GQA + KV quantization + PagedAttention + prefix caching can reduce effective KV memory requirements by 20-30x, making previously infeasible context lengths practical.
