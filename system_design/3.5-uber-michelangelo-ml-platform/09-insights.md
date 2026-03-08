# Key Insights: Uber Michelangelo ML Platform

## Insight 1: Dual-Store Feature Architecture Solves Training-Serving Consistency
**Category:** Consistency
**One-liner:** Palette uses Hive for offline/training feature access and Cassandra for online/serving access, with shared computation pipelines ensuring the same feature logic produces identical values in both stores.
**Why it matters:** Training-serving skew -- where features computed differently during training versus serving produce subtly wrong predictions -- is one of the most insidious bugs in production ML. By sharing the feature computation logic (defined once in the DSL) and materializing results into both Hive (columnar, for batch training scans) and Cassandra (KV, for sub-10ms point lookups), Michelangelo guarantees consistency by construction rather than by testing. The Hive store provides immutable daily snapshots for reproducible training, while Cassandra's TTL-based retention keeps only recent values for serving. This dual-store pattern became the blueprint for the entire feature store industry.

---

## Insight 2: Virtual Model Sharding Serves 5,000+ Models on Shared Infrastructure
**Category:** Scaling
**One-liner:** Instead of dedicating servers per model, Michelangelo co-locates 10-50 models per instance with tier-aware loading policies (eager for Tier 1, lazy for Tier 3-4) and LRU eviction that never evicts critical models during peak traffic.
**Why it matters:** Dedicating servers to each of 5,000+ models would be wastefully expensive -- most models receive sporadic traffic. Virtual sharding groups models by memory footprint and traffic pattern, maximizing utilization while isolating critical models. The key design insight is the loading policy hierarchy: Tier 1 models (ETA, pricing, fraud) are loaded at startup and never evicted during peak, while Tier 4 experimental models are loaded on-demand and evicted first. The 5-minute grace period before eviction prevents thrashing when a model receives bursty traffic. This allows serving 10M predictions/second across all models with manageable infrastructure costs.

---

## Insight 3: Lambda Architecture Unifies Batch and Streaming Feature Computation
**Category:** Streaming
**One-liner:** Feature pipelines run as both Spark batch jobs (daily, writing to Hive and Cassandra) and Samza streaming jobs (real-time, writing to Cassandra and logging to HDFS), ensuring features are fresh for serving while maintaining complete history for training.
**Why it matters:** Pure batch features would be stale by up to 24 hours, unacceptable for real-time decisions like fraud detection. Pure streaming features would lack the historical depth needed for training. The Lambda approach runs both in parallel: streaming updates Cassandra within seconds for real-time serving, while batch provides complete, consistent daily snapshots in Hive for training. The streaming path also logs to HDFS, enabling reconciliation between batch and streaming computations and providing a fallback if streaming pipeline lags. This dual-path design is the foundational pattern that made Palette's 20,000+ features both fresh and historically complete.

---

## Insight 4: Project Tiering Drives Differentiated SLAs and Resource Allocation
**Category:** Resilience
**One-liner:** Michelangelo classifies all ML projects into four tiers based on business impact, with each tier receiving different availability SLAs (99.99% to best-effort), scheduling priority weights (50% to 5% of resources), and infrastructure guarantees.
**Why it matters:** Treating all ML models equally is wasteful for critical models and over-provisioned for experimental ones. Tier 1 models (ETA, pricing, matching) get 99.99% availability targets, dedicated on-demand compute, and preemption rights over lower-tier training jobs. Tier 4 experimental models run on spot instances and receive best-effort scheduling. This tiering cascades through the entire system: serving loads Tier 1 models eagerly, scheduling reserves GPU headroom for Tier 1 training bursts, and monitoring alerts are more aggressive for higher tiers. The result is optimal resource allocation where critical business functions get enterprise-grade reliability without over-spending on experiments.

---

## Insight 5: Feature Store Cassandra Latency Requires Multi-Layer Caching with Token-Aware Routing
**Category:** Caching
**One-liner:** A three-layer caching strategy (in-process 100ms TTL, Redis 5min TTL, Cassandra with speculative execution) achieves 95%+ cache hit rates, keeping P95 feature lookups under 5ms even at 10M QPS.
**Why it matters:** Every real-time prediction requires feature lookups, making Cassandra the critical path for serving latency. Without caching, Cassandra P99 spikes to 20ms+ during compaction storms, GC pauses, or hot partition scenarios. The in-process L1 cache absorbs repeated lookups for the same entity within a 100ms window (common during burst traffic for popular drivers or riders). The Redis L2 cache handles cross-instance deduplication. Token-aware routing ensures Cassandra reads go directly to the replica owning the partition, avoiding coordinator hops. Speculative execution retries slow reads to a different replica, cutting tail latency. Combined, these optimizations transform a 5-10ms P95 Cassandra operation into a 1-2ms average and 5ms P95 overall.

---

## Insight 6: Model Alias Updates Use Atomic Write with Cache Invalidation Broadcast
**Category:** Atomicity
**One-liner:** When updating a model alias (e.g., "production" -> v6), Michelangelo performs an atomic single-key update in Gallery and broadcasts a cache invalidation to all prediction service instances, accepting a brief inconsistency window bounded by cache TTL.
**Why it matters:** During an alias update, in-flight predictions may still use the old model version. Rather than implementing expensive two-phase commit across thousands of serving instances, Michelangelo accepts that requests started before the update may complete with the old version -- a deliberate trade-off of strict consistency for operational simplicity. For critical updates, an optional WaitForPropagation call with a 5-second timeout confirms all instances have invalidated their cache. This pragmatic approach avoids the complexity of distributed consensus for model deployment while keeping the inconsistency window to single-digit seconds.

---

## Insight 7: Feature Snapshot Isolation Prevents Mid-Prediction Feature Drift
**Category:** Consistency
**One-liner:** Each prediction request reads all required features at a single timestamp using Cassandra's LOCAL_QUORUM consistency, ensuring that a streaming feature update arriving mid-prediction does not create an inconsistent feature vector.
**Why it matters:** A prediction using 50 features could see some features from before a streaming update and others from after, creating a feature vector that never existed in reality and potentially producing nonsensical predictions. Snapshot isolation assigns a single read timestamp to all feature lookups within a prediction request, guaranteeing a consistent point-in-time view. LOCAL_QUORUM ensures the read reflects the latest quorum-committed value without paying the latency cost of cross-datacenter reads. This design accepts eventual consistency for feature freshness (a feature update may not be visible for a few milliseconds) but guarantees consistency within a single prediction.

---

## Insight 8: Deployment Locking Prevents Mixed-Version Model Serving
**Category:** Distributed Transactions
**One-liner:** A distributed lock per model ensures that only one deployment can be in progress at a time, preventing scenarios where instances end up running a mix of v6 and v7 during overlapping deployments.
**Why it matters:** Without deployment serialization, two concurrent deployments for the same model could leave the serving fleet in an inconsistent state -- some instances running v6, others v7, with no way to determine which is "correct." The distributed lock (with a 5-minute timeout) ensures deployments are atomic: all instances receive the same version. If a deployment fails midway, the lock release allows a retry or rollback. The explicit ConflictException when an existing deployment is in progress gives operators clear feedback rather than silent version mixing, which would be extremely difficult to debug in a system serving 10M predictions per second.

---

## Insight 9: Training Job Checkpoints Capture Full Reproducibility State Including Random Seeds
**Category:** Resilience
**One-liner:** Checkpoints serialize not only model weights and optimizer state but also epoch/step counters and the random state from NumPy, PyTorch, and Python -- enabling bit-exact training resumption after preemption.
**Why it matters:** Saving only model weights loses the optimizer momentum, learning rate scheduler position, and the pseudorandom state that determines data shuffling and dropout. Without capturing random seeds, resumed training diverges from the original trajectory, making experiments non-reproducible and potentially producing worse models. The checkpoint strategy of saving every max(10 minutes, 10% of estimated training time) balances recovery granularity against storage and checkpoint overhead. Keeping only the last 3 checkpoints with cross-AZ replication ensures recovery is possible even if an entire availability zone fails, while avoiding unbounded checkpoint storage growth.

---

## Insight 10: Mesos-to-Kubernetes Migration Enabled Elastic Training and Unified Orchestration
**Category:** Scaling
**One-liner:** Migrating from Mesos/Peloton to Kubernetes with a Job Controller that federates across multiple clusters enabled elastic training (starting with partial resources, scaling up when available) and unified management of Spark and Ray workloads.
**Why it matters:** The legacy Mesos scheduler treated training jobs as fixed-resource allocations, leading to GPU fragmentation and long queue times. Kubernetes operators with custom resource definitions (CRDs) for SparkApplication and RayJob provide native support for elastic scaling, gang scheduling, and resource quotas. The Job Controller's cluster selection algorithm considers available capacity, data locality, job priority (tier), and cost optimization (spot for Tier 3-4) when placing jobs. Elastic training -- allowing a job to start with fewer GPUs than requested and dynamically scaling -- eliminates the gang scheduling deadlock where large jobs wait indefinitely for all resources to become simultaneously available.

---
