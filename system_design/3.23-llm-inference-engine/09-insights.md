# Key Insights: LLM Inference Engine

## Insight 1: PagedAttention Trades 5% Latency for 4-10x Throughput

**Category:** Data Structures
**One-liner:** Borrowing OS-style virtual memory paging for KV cache management eliminates 60-95% memory waste from pre-allocation, enabling 4-10x more concurrent requests at the cost of an indirect block table lookup per attention computation.

**Why it matters:** Traditional attention implementations allocate contiguous memory for the maximum sequence length (e.g., 4K tokens) per request, but average usage is only 500 tokens -- wasting 87.5% of GPU memory. PagedAttention divides KV cache into fixed-size blocks (16 tokens each) and allocates on demand through a block table that maps logical positions to physical blocks. The kernel must now perform an indirection per block -- looking up the physical block ID from the block table before loading K/V data -- which adds 5-10% latency overhead. But this overhead is dwarfed by the throughput gain: near-zero waste means the same GPU memory can serve 4-10x more concurrent requests. The block table also enables copy-on-write for beam search (shared prefix blocks between beams) and non-contiguous allocation (any free block can map to any logical position). The key insight is that PagedAttention doesn't need physical contiguity -- some implementations incorrectly try to find contiguous free regions, causing false OOM errors when scattered free blocks exist.

---

## Insight 2: Disaggregated Prefill/Decode Exploits the Compute-Memory Asymmetry

**Category:** Scaling
**One-liner:** Prefill is compute-bound (60-80% GPU compute utilization) while decode is memory-bound (10-30% compute utilization) -- running them on the same GPU means neither workload runs optimally, and separating them yields 30-50% throughput improvement.

**Why it matters:** A combined serving architecture alternates between compute-heavy prefill and memory-heavy decode on the same GPU, achieving poor utilization of both resources. Worse, a long prefill request blocks decode iterations for all co-batched sequences, causing unpredictable latency spikes (head-of-line blocking). Disaggregated architecture dedicates separate GPU pools to each phase: prefill workers are optimized for large-batch matrix multiplications, decode workers are optimized for high-concurrency memory-bandwidth workloads. The critical engineering challenge is KV cache transfer between pools -- 328 MB for a 1000-token prompt on a 70B model. NVLink within a node transfers this in 0.4ms, RDMA cross-node in 7ms, and PCIe + network in 26ms. The trade-off is explicit: TTFT increases by 5-15ms (transfer overhead) but throughput improves 30-50% and latency variance drops dramatically. This disaggregation principle applies broadly -- whenever two phases of a pipeline have fundamentally different resource profiles, separating them allows independent optimization.

---

## Insight 3: Memory-Boundedness Makes Batching the Primary Optimization Lever

**Category:** System Modeling
**One-liner:** Decode-phase inference is memory-bound by 300x (21ms to read weights vs 0.07ms to compute), meaning the GPU spends virtually all its time moving data, not computing -- and the only way to amortize this is by processing more sequences per weight read.

**Why it matters:** For a 70B INT8 model on an H100, reading 70 GB of weights takes 21ms at 3.35 TB/s memory bandwidth, while the actual computation (140 GFLOPs) takes only 0.07ms at 1,979 TFLOPS. This 300:1 ratio means the GPU sits idle for 99.7% of a single-sequence decode step. Increasing batch size from 1 to 8 doesn't increase the memory read time (still 21ms to read the same weights) but produces 8 tokens instead of 1, raising throughput from 47 to 380 tokens/sec. This is why continuous batching is so impactful -- by adding new sequences to the batch every iteration (instead of waiting for the entire batch to finish), it maximizes batch size at every step. The practical implication is that any optimization that increases effective batch size (continuous batching, removing padding, preempting long sequences to admit short ones) directly translates to proportional throughput gains, while optimizations that reduce per-token compute have negligible impact.

---

## Insight 4: Per-Worker Block Pools Eliminate Allocation Contention

**Category:** Contention
**One-liner:** A single global free list for KV cache blocks creates 10-50% scheduler overhead from lock contention at high concurrency -- per-worker pools with work-stealing reduce allocation latency from 500ns to 50ns.

**Why it matters:** The continuous batching scheduler allocates and frees KV cache blocks at extremely high frequency -- every token generation for every active sequence. With a single mutex-protected global free list, every allocation/deallocation contends for the same lock across all scheduler threads. At high load, threads spend more time waiting for the lock than doing useful work. The per-worker pool design gives each scheduler thread its own local pool (fast path: pop from local pool, no lock required). When a local pool is empty, the thread steals half the blocks from another worker's pool (infrequent, 1-5 microsecond overhead). Only when all worker pools are depleted does the system fall back to the global pool under a lock (extremely rare). This is the same pattern used in jemalloc (per-thread arenas) and Go's goroutine scheduler (per-P run queues with work stealing), applied to GPU memory management.

---

## Insight 5: SLRU Hybrid Policy Prevents Prefix Cache Eviction Storms

**Category:** Caching
**One-liner:** Pure LRU eviction causes cache storms where a burst of new requests evicts all warm prefix entries at once -- a segmented LRU with probationary and protected segments ensures frequently-used system prompts survive traffic bursts.

**Why it matters:** Prefix caching (RadixAttention) stores computed KV cache for shared prefixes like system prompts, avoiding redundant prefill computation. Under LRU eviction, a sudden burst of requests with new prefixes evicts all existing warm entries, causing cache hit rate to drop to zero and forcing recomputation of common system prompts for every subsequent request until the cache re-warms. The SLRU hybrid assigns new entries to a probationary segment (20% of cache) and promotes them to the protected segment (80%) only after a second access. Eviction always targets probationary entries first. This means a burst of one-time prefixes cycles through the probationary segment without touching the protected segment's warm entries. Hit rate improves 20-30% for bursty workloads, and the critical shared system prompts (which are accessed repeatedly across many requests) remain cached through traffic spikes.

---

## Insight 6: CUDA Graphs Reduce Decode Iteration Overhead by 10x

**Category:** Scaling
**One-liner:** Python scheduler overhead (200-500 microseconds) between GPU decode iterations causes 30-50% GPU idle time -- pre-recording the entire decode step as a CUDA graph replays it in 50 microseconds with a single kernel launch.

**Why it matters:** Each decode iteration involves dozens of CUDA kernel launches (attention, feed-forward, normalization), each with 5-20 microseconds of launch overhead from the Python runtime. For small batch sizes where the actual GPU computation is fast (under 1ms), this launch overhead dominates -- the GPU finishes work and idles while Python prepares the next iteration. CUDA graphs record the entire sequence of GPU operations during a warmup pass, then replay the recorded graph with a single dispatch. The trade-off is rigidity: graphs require fixed batch sizes and memory layouts, so the engine pre-captures graphs for common batch sizes (1, 4, 8, 16, 32) and falls back to eager execution for unusual sizes. The practical impact is most significant at low batch sizes and small models, where GPU compute time per iteration is shortest and Python overhead is proportionally largest. At batch size 1, CUDA graphs can double effective throughput.

---

## Insight 7: Speculative Decoding is Temperature-Gated

**Category:** System Modeling
**One-liner:** Speculative decoding achieves 2-3x speedup at greedy/low temperature (85-95% acceptance rate) but degrades to near-useless at temperature above 0.7 (25-40% acceptance rate) -- making it a conditional optimization, not a universal one.

**Why it matters:** Speculative decoding uses a small draft model to propose K tokens, then verifies all K in a single target model forward pass. When verification accepts most draft tokens, you generate K+1 tokens for the cost of 1 target forward pass -- a dramatic speedup. But acceptance follows the formula min(1, p_target/p_draft), and at high temperature both distributions flatten, causing frequent mismatches. At temperature 1.5, acceptance drops to 25-40%, meaning the draft model's computation is mostly wasted and the verification pass adds overhead for minimal token gain. The practical implication is that the engine must dynamically enable/disable speculation based on sampling parameters: greedy decoding (code generation, factual QA) gets full speculative benefit, while creative tasks (storytelling, brainstorming at high temperature) should bypass it. Furthermore, draft model quality degrades on certain domains (code, math) where the draft model's training distribution differs from the target -- the engine should monitor rolling acceptance rates and disable speculation when they drop below 50%.

---

## Insight 8: Virtual Contiguity Eliminates False OOM

**Category:** Data Structures
**One-liner:** Some KV cache implementations incorrectly require contiguous physical blocks for allocation, reporting out-of-memory when scattered free blocks exist -- PagedAttention's block table provides virtual contiguity, making any free block usable for any logical position.

**Why it matters:** This is a subtle but critical implementation bug. After many allocations and deallocations, free blocks become scattered across physical memory. An incorrect implementation that searches for N contiguous free blocks will fail to find them even though N total free blocks exist -- reporting a false OOM error and rejecting requests unnecessarily. The entire point of PagedAttention's block table is to provide virtual-to-physical mapping, exactly like a page table in an operating system. Any free block can map to any logical position in a sequence. The correct implementation simply pops N blocks from the free list regardless of their physical locations and stores them in the sequence's block table. The kernel handles the indirection during attention computation. This insight is important because some forks and custom implementations introduce this bug, and it manifests only under sustained load where fragmentation accumulates -- making it difficult to reproduce in testing but devastating in production.
