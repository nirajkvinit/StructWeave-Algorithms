# Key Insights: ML Models Deployment System

## Insight 1: PagedAttention Eliminates GPU Memory Fragmentation
**Category:** Data Structures
**One-liner:** Block-based KV cache allocation (PagedAttention) borrows virtual memory paging concepts to eliminate GPU memory fragmentation that causes OOM even when total free memory is sufficient.
**Why it matters:** Traditional attention allocates contiguous memory per sequence, wasting 50-75% on short sequences and preventing new allocations despite available total memory. PagedAttention uses fixed-size blocks (16 tokens each) with a block table for non-contiguous mapping, enabling copy-on-write for beam search and near-zero memory waste. This single innovation enabled vLLM to achieve 3-5x throughput improvement over static batching approaches.

---

## Insight 2: Continuous Batching Decouples Request Lifecycles
**Category:** Scaling
**One-liner:** Continuous batching replaces batch-level synchronization with per-iteration slot management, keeping GPUs fully utilized even when request lengths vary wildly.
**Why it matters:** Static batching forces the entire batch to wait for the longest sequence, causing 30-50% GPU idle time. Continuous batching slots in new requests as soon as any sequence completes, achieving 85-95% GPU utilization versus 50-70% for static batching. The scheduler runs a five-phase loop every iteration: complete finished sequences, unswap from CPU, schedule new sequences, preempt under memory pressure, and build the iteration batch. This per-iteration granularity is what enables the 3-5x throughput gain.

---

## Insight 3: Prefill vs Decode Are Fundamentally Different Compute Regimes
**Category:** Scaling
**One-liner:** LLM inference has two distinct phases -- compute-bound prefill (matrix-matrix multiplication) and memory-bound decode (matrix-vector multiplication) -- requiring different batching and scheduling strategies.
**Why it matters:** Treating prefill and decode uniformly wastes resources. Prefill processes all prompt tokens at once and benefits from chunked processing, while decode processes a single token per sequence and is bottlenecked by KV cache random reads. Recognizing this duality enables chunked prefill (breaking long prompts into segments to interleave with decode steps), which prevents prefill of a long prompt from blocking ongoing generation for other sequences.

---

## Insight 4: Sequential Testing Solves the Peeking Problem in A/B Tests
**Category:** Consistency
**One-liner:** O'Brien-Fleming alpha spending functions allow statistically valid early stopping of A/B tests by distributing the Type I error budget across planned analysis checkpoints.
**Why it matters:** Naive peeking at A/B test results inflates false positive rates dramatically -- checking daily with a 0.05 alpha can yield effective error rates above 20%. The sequential testing algorithm uses a spending schedule (e.g., 0.0001 at 20% progress, escalating to 0.05 at 100%) that preserves overall statistical validity while allowing early termination when effects are large. This is critical for ML model deployments where bad models can degrade user experience for extended periods.

---

## Insight 5: GPU Failure Cascades Require Multi-Stage Degradation
**Category:** Resilience
**One-liner:** GPU failures trigger cascading OOM events on remaining instances, requiring a staged mitigation strategy that progressively reduces batch wait time, batch size, enables request shedding, and finally opens circuit breakers.
**Why it matters:** When a GPU pod crashes, in-flight requests fail and surviving instances absorb the load spike, which can trigger further OOM events in a self-reinforcing cascade. The four-stage degradation -- halving batch wait time, halving batch size, shedding 10% of requests, and opening circuit breakers -- provides proportional response. Each stage independently reduces memory pressure, giving auto-scaling time to provision new GPU instances. Jumping directly to circuit breaking would be unnecessarily disruptive for minor capacity losses.

---

## Insight 6: KV Cache Memory Dominates Large Model Serving Costs
**Category:** Cost Optimization
**One-liner:** For a 70B-parameter LLM, KV cache for a single 4096-token context consumes approximately 86GB -- more than the model weights themselves under INT4 quantization.
**Why it matters:** The formula (2 x layers x hidden_dim x KV_heads x precision_bytes x context_length) reveals that KV cache grows linearly with context length and can exceed model weight memory. This means serving cost is dominated by how many concurrent sequences fit in memory, not by model size alone. Techniques like Grouped Query Attention (GQA) that reduce KV heads from full count to 8 are as impactful as quantization for serving economics, and sequence-level preemption (swapping KV to CPU) becomes an essential scheduling primitive.

---

## Insight 7: Model Corruption Detection Requires Multi-Layer Validation
**Category:** Resilience
**One-liner:** Validating model integrity before serving requires three independent checks: checksum verification, weight distribution statistical analysis (NaN/Inf/outlier detection), and canonical input-output sanity testing.
**Why it matters:** Checksum validation alone catches corruption during transfer but misses training-time issues like NaN poisoning or weight explosion. Statistical checks on per-layer mean and standard deviation catch subtle corruption (e.g., a single corrupted layer). The canonical inference test catches functional regressions that pass all other checks. This defense-in-depth approach is essential because serving a corrupted model at scale can silently degrade millions of predictions before drift detection catches the anomaly.

---

## Insight 8: Batch Formation Wait Time Is the Core Latency-Throughput Knob
**Category:** Traffic Shaping
**One-liner:** The optimal batch wait time differs by 10x across model types (2-5ms for tabular vs 50-100ms for LLM prefill) and must be dynamically adjusted based on current load.
**Why it matters:** Setting batch wait time too low results in tiny batches with poor GPU utilization; too high adds unnecessary latency. The optimal point depends on model inference time -- the wait should be a fraction of the forward pass duration. For LLM decode (20-50ms inference), a 10-20ms wait yields batches of 8-16 and acceptable latency. For tabular models (1-5ms inference), even a 5ms wait doubles latency. Adaptive wait time that shortens under low load and extends under high load provides self-tuning throughput-latency optimization.

---

## Insight 9: Tensor Parallelism vs Pipeline Parallelism Have Opposite Communication Profiles
**Category:** Partitioning
**One-liner:** Tensor parallelism requires all-reduce communication at every layer (high bandwidth, low latency needed) while pipeline parallelism only communicates between stages (moderate bandwidth, latency tolerant).
**Why it matters:** Choosing the wrong parallelism strategy for the hardware topology wastes interconnect bandwidth. Tensor parallelism demands NVLink-class interconnects (600GB/s) because every layer triggers cross-GPU communication, but it reduces per-GPU memory by 1/N with minimal pipeline bubbles. Pipeline parallelism works over PCIe (32GB/s) because communication only happens at stage boundaries, but introduces pipeline bubbles that reduce utilization. For 100B+ models, combining TP within a node (leveraging NVLink) and PP across nodes (tolerating slower interconnect) yields optimal memory-communication-utilization balance.

---

## Insight 10: Canary Rollouts for ML Models Require Statistical Guardrails Beyond Traditional Deployments
**Category:** Consistency
**One-liner:** ML model canaries must enforce guardrail metrics (p99 latency, error rate, crash rate, revenue impact) independently of the primary experiment metric, with automatic rollback thresholds.
**Why it matters:** Traditional canary deployments check for crashes and error rates, but ML models can fail silently -- producing valid outputs that are subtly wrong. A model might pass all health checks while degrading revenue by 5% or increasing prediction latency. Guardrail metrics like revenue-per-user with a hard floor (>-5%) and p99 latency ceiling (<100ms) catch these silent failures. The key design insight is that guardrail violations trigger immediate rollback regardless of the primary metric's statistical significance, inverting the normal A/B test workflow where you wait for sufficient power.

---
