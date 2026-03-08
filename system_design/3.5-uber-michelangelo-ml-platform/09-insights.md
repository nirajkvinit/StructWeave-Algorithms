# Key Insights: Uber Michelangelo ML Platform

## Insight 1: Dual-Store Feature Architecture Solves Training-Serving Consistency

**Category:** Consistency
**One-liner:** A feature store with separate offline (Hive) and online (Cassandra) stores, fed by the same computation logic, eliminates the #1 cause of ML production failures: train-serve skew.

**Why it matters:** When training and serving pipelines compute features independently, subtle differences in logic, timing, or data sources cause models to degrade silently in production. Michelangelo's Palette pioneered the dual-store pattern where batch pipelines write daily snapshots to Hive (for training) and backfill Cassandra (for serving), while streaming pipelines update Cassandra in real-time and log to HDFS. This ensures features used at training time are semantically identical to those used at inference time. Without this, teams waste months debugging mysterious model quality regressions that stem from feature mismatches rather than model deficiencies.

---

## Insight 2: Virtual Model Sharding Makes Multi-Model Serving Economical

**Category:** Scaling
**One-liner:** Co-locating multiple models on shared prediction service instances with tier-aware loading policies enables 5,000+ models to serve 10M QPS without dedicated infrastructure per model.

**Why it matters:** Giving each model its own set of servers is unsustainable at scale -- 5,000 models would require tens of thousands of dedicated instances. Virtual model sharding groups models by memory footprint and request pattern, co-locates them on shared instances, and uses tier-based loading policies (eager for Tier 1, lazy for Tier 3-4, preemptive based on traffic prediction). Eviction follows LRU within tier but never evicts Tier 1 models during peak. Without this, infrastructure costs would scale linearly with model count, and low-traffic models would waste resources sitting idle on dedicated servers.

---

## Insight 3: Lambda Architecture for Feature Computation Balances Freshness and Completeness

**Category:** Streaming
**One-liner:** Running parallel batch (Spark) and streaming (Samza) pipelines for the same features provides both real-time freshness and guaranteed correctness through eventual reconciliation.

**Why it matters:** Streaming pipelines deliver sub-second feature freshness for online serving but may miss late-arriving data or introduce approximation errors in complex aggregations. Batch pipelines compute exact features over complete data but run on daily schedules. The Lambda pattern runs both: streaming updates Cassandra immediately for serving, while batch recomputes and overwrites periodically to correct any drift. If you rely on streaming alone, accumulated errors degrade feature quality over time; if you rely on batch alone, features are always stale by hours. The trade-off is operational complexity of maintaining two computation paths.

---

## Insight 4: Project Tiering Enables Differentiated SLAs Without Over-Provisioning

**Category:** Resilience
**One-liner:** Classifying ML projects into four tiers (Tier 1 at 99.99% to Tier 4 best-effort) allows the platform to concentrate reliability investment where business impact is highest.

**Why it matters:** Not all models are equally critical -- ETA and pricing directly affect riders, while experimental research models can tolerate downtime. Tiering drives concrete engineering decisions: Tier 1 models are eagerly loaded, never evicted during peak, get priority scheduling for training, run on on-demand instances, and receive multi-DC deployment. Tier 3-4 models run on spot instances, load lazily, and can be preempted. Without tiering, the platform either over-provisions everything (wasting resources) or under-provisions critical paths (risking outages on revenue-critical models).

---

## Insight 5: Multi-Layer Caching Tames Cassandra Tail Latency

**Category:** Caching
**One-liner:** A three-tier caching strategy (L1 in-process at 100ms TTL, L2 Redis at 5-minute TTL, L3 Cassandra) achieves a 95%+ cache hit rate that keeps P95 feature lookups under 5ms.

**Why it matters:** Cassandra tail latency is unpredictable due to compaction storms, GC pauses, and hot partitions, making P99 latency spikes above 20ms a regular occurrence. Since every prediction requires feature lookups on the critical path, uncached reads directly degrade user-facing latency. The L1 in-process cache handles repeated lookups within the same service instance, L2 Redis absorbs cross-instance redundancy, and Cassandra serves only true cache misses. The short L1 TTL (100ms) ensures freshness while still absorbing burst traffic. Without this layering, serving latency would be dominated by Cassandra P99 rather than the fast-path cache hits.

---

## Insight 6: Atomic Model Alias Updates with Cache Invalidation Prevent Version Drift

**Category:** Atomicity
**One-liner:** Model alias updates are implemented as atomic single-key writes with broadcast cache invalidation, accepting a brief inconsistency window rather than requiring distributed locks across all prediction instances.

**Why it matters:** When deploying a new model version, the alias "production" must switch from v5 to v6 across thousands of prediction service instances. A distributed lock would be too slow and fragile. Instead, Michelangelo performs an atomic update in the Gallery registry and broadcasts a cache invalidation. During the brief window before invalidation propagates, some requests may still use the old version -- an acceptable trade-off for a system serving 10M QPS. For critical updates, an optional synchronous propagation wait (up to 5 seconds) ensures consistency. Concurrent deployments of the same model are prevented by a distributed lock per model, avoiding the harder problem of mixed versions across instances.

---

## Insight 7: Deployment Locking Prevents Mixed-Version Serving

**Category:** Contention
**One-liner:** A distributed lock per model ensures only one deployment can proceed at a time, preventing the hazardous state where some instances serve v6 and others serve v7.

**Why it matters:** When two deployments for the same model trigger simultaneously, instances could end up with a random mix of versions, producing inconsistent predictions that are nearly impossible to debug. The deployment lock serializes rollouts so each deployment either completes fully or fails cleanly. The lock has a 5-minute timeout to prevent indefinite blocking if a deployment process crashes. This pattern is essential for any system where multiple versions of the same logical service cannot coexist safely, which is common in ML serving where model versions may have incompatible feature expectations.

---

## Insight 8: Snapshot Isolation for Feature Reads Prevents Mid-Prediction Inconsistency

**Category:** Consistency
**One-liner:** Each prediction request reads all features at a single point-in-time snapshot, accepting eventual consistency by design rather than fighting it.

**Why it matters:** When a streaming pipeline updates features for an entity while a prediction request is in flight, the request could read a mix of old and new feature values, leading to internally inconsistent feature vectors. By establishing a single read timestamp at the start of each prediction and using Cassandra's LOCAL_QUORUM with that timestamp, all features are read as a coherent snapshot. The system explicitly accepts that features may be seconds stale -- a deliberate design choice since most ML models are robust to small feature delays. This is far cheaper than requiring strong consistency across all feature writes.

---

## Insight 9: Architecture Evolution from Mesos/Spark to Kubernetes/Ray Reflects Workload Diversification

**Category:** Scaling
**One-liner:** Migrating from Mesos/Peloton with Spark-only training to Kubernetes with both Spark and Ray enables the platform to efficiently handle traditional ML, deep learning, and LLM fine-tuning on a unified infrastructure.

**Why it matters:** Spark excels at distributed data processing and traditional ML (XGBoost, LightGBM) but is poorly suited for deep learning workloads that need GPU-aware scheduling and elastic scaling. Ray provides native support for distributed PyTorch training, GPU scheduling, and the elastic worker patterns needed for LLM fine-tuning with DeepSpeed. Running both frameworks on Kubernetes via a unified Job Controller allows workload-appropriate routing: traditional ML goes to Spark, deep learning and LLMs go to Ray. Without this evolution, the platform would either force all workloads into Spark (suboptimal for DL) or fragment into separate platforms with duplicated infrastructure.

---

## Insight 10: Checkpointing Strategy Balances Recovery Speed Against Training Overhead

**Category:** Resilience
**One-liner:** Checkpoint intervals are dynamically set to MAX(10 minutes, 10% of estimated training time), capturing model state, optimizer state, and all random seeds across frameworks for deterministic recovery.

**Why it matters:** Training jobs on shared clusters face node preemptions, spot instance interruptions, and OOM kills. Without checkpointing, hours of GPU compute are lost. But checkpointing too frequently wastes I/O bandwidth and slows training. The 10% heuristic means a 10-hour job checkpoints every hour (losing at most 1 hour on failure), while a 30-minute job checkpoints at the 10-minute floor. Storing the full state -- including numpy, torch, and Python random seeds -- enables bit-exact reproducibility on restart, which is critical for debugging and auditing. Keeping only the last 3 checkpoints with cross-AZ replication prevents both storage bloat and single-point-of-failure in checkpoint storage.

---

## Insight 11: Speculative Execution and Prepared Statements Optimize Cassandra Query Performance

**Category:** Data Structures
**One-liner:** Combining prepared statements, token-aware routing, and speculative execution (retrying on a second node before the first responds) reduces both median and tail latency for feature lookups.

**Why it matters:** In a distributed Cassandra cluster, individual nodes can experience transient slowdowns from compaction, GC, or disk I/O. Speculative execution sends the same query to a second replica after a short delay, returning whichever responds first. Combined with token-aware routing (sending queries directly to the node owning the data) and prepared statements (avoiding repeated query parsing), this cuts P99 latency significantly. The key insight is that tail latency in distributed systems is often caused by a single slow node, and redundant requests are cheaper than waiting for stragglers.

---

## Insight 12: Model Loading Optimization Through Pre-warming and Quantization Reduces Cold Start Impact

**Category:** Scaling
**One-liner:** Pre-warming Tier 1 models at instance startup, pre-fetching based on traffic prediction, and quantizing models from FP32 to FP16/INT8 reduces cold start latency from 30+ seconds to near-instant serving.

**Why it matters:** When a prediction service instance starts or needs to load a new model, the download-deserialize-initialize cycle can take 30+ seconds, during which requests either queue or fail. For Tier 1 models that directly impact riders (ETA, pricing), this is unacceptable. Pre-warming loads these models at startup before the instance receives traffic. Model quantization reduces artifact size by 2-4x, directly cutting download and deserialization time. Memory-mapped model files allow the OS to manage model memory efficiently. Shadow loading during low-traffic periods ensures models are ready before demand spikes. Without these optimizations, every autoscaling event or instance replacement would create a latency spike visible to users.

---
