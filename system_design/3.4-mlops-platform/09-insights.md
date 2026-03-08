# Key Insights: MLOps Platform

---

## Insight 1: GPU Fragmentation Is the Hidden Cost of Naive Task Scheduling

**Category:** Scaling
**One-liner:** A task requesting 2 GPUs on an 8-GPU node leaves 6 GPUs that may be too fragmented for a task needing 8, so the scheduler must score node fitness by waste minimization, not just availability.

**Why it matters:** GPU resources are expensive and scarce. A naive scheduler that places tasks on the first node with sufficient capacity creates fragmentation: small tasks scatter across nodes, leaving each with a few unused GPUs that cannot satisfy large distributed training jobs. The node scoring function penalizes GPU waste (available minus requested times 0.1) and prefers exact-fit placements. This bin-packing optimization across heterogeneous hardware (8-GPU nodes, 4-GPU nodes, CPU-only nodes) can improve effective GPU utilization by 20-30%. Combined with data locality bonuses (prefer nodes where training data is co-located) and cost bonuses (prefer spot instances for checkpointable tasks), the scheduler transforms resource allocation from a simple matching problem into a multi-objective optimization.

---

## Insight 2: Spot Instance Preemption Requires Checkpoint-Aware Scheduling

**Category:** Cost Optimization
**One-liner:** Spot instances cost 60-70% less than on-demand, but the 2-minute termination warning means only checkpointable tasks should be placed on spot nodes, and the scheduler must trigger a checkpoint the moment a preemption signal arrives.

**Why it matters:** Training jobs are ideal spot instance candidates because they are long-running, compute-intensive, and (if properly implemented) can resume from checkpoints. The scheduler scores checkpointable tasks higher for spot node placement (0.3 cost bonus) and non-checkpointable tasks higher for on-demand nodes (0.2 reliability bonus). When a spot preemption signal arrives, the scheduler sends a checkpoint signal to all affected tasks, waits up to 90 seconds for checkpoint completion, then marks tasks as PENDING for rescheduling. The checkpoint is uploaded asynchronously to object storage while training continues, so checkpoint overhead does not reduce training throughput. Without checkpoint-aware spot scheduling, organizations either overpay for on-demand instances or lose hours of training progress on preemption.

---

## Insight 3: Tiered Metric Storage Handles Billions of Data Points Through Hot-Warm-Cold Architecture

**Category:** Data Structures
**One-liner:** With 100K unique runs per day, 1000 metric keys per run, and 10K steps per metric, the experiment tracker manages billions of data points by keeping 7 days in hot ClickHouse, 90 days in warm ClickHouse, and archiving to Parquet in object storage.

**Why it matters:** Keeping all historical metrics in a single high-performance database is cost-prohibitive and unnecessary. Recent experiments need sub-second query performance for interactive dashboards, while month-old experiments are queried occasionally for comparison, and year-old experiments are rarely accessed but must be retained for reproducibility. The tiered architecture uses ClickHouse's columnar storage for both hot (7 days) and warm (90 days) tiers, with daily TTL-based migration between them. Weekly archival exports runs to Parquet files in object storage, indexed by run_id for retrieval. The read path checks run age to route queries to the appropriate tier. Materialized views pre-compute metric summaries (min, max, avg, last value) to accelerate common dashboard queries without scanning raw data.

---

## Insight 4: Client-Side Batching Reduces API Calls by 100x During Distributed Training

**Category:** Traffic Shaping
**One-liner:** During distributed training with 100+ workers each logging metrics every step, client-side SDK buffering for 100ms with a max batch size of 1000 transforms 100K+ individual API calls per second into 100 batched requests.

**Why it matters:** The experiment tracking API would collapse under the load of individual metric writes from a large distributed training job. Each of 100+ workers may log 10+ metrics per training step, running at 100+ steps per second. Without client-side batching, this produces 100K+ API calls per second. The SDK collects metrics locally for 100ms or until 1000 metrics accumulate (whichever comes first), then sends a single batch request. The API buffers these batches in memory and flushes to ClickHouse asynchronously, further decoupling ingestion from storage. This two-level buffering (SDK-side, then server-side) is what makes it feasible to track fine-grained training metrics without degrading training performance or overwhelming the storage layer.

---

## Insight 5: Atomic Alias Updates Require Distributed Locks to Prevent Split-Brain

**Category:** Consensus
**One-liner:** When two CI/CD pipelines simultaneously try to promote different model versions to the @champion alias, a distributed lock ensures exactly one succeeds, preventing a split-brain where different serving instances load different "production" models.

**Why it matters:** The @champion alias is the mechanism by which the serving infrastructure knows which model version to load. If two concurrent alias updates both succeed (one setting v5, the other setting v6), different serving replicas may pick up different versions depending on timing, creating inconsistent predictions across the fleet. The distributed lock (Redis or etcd) with a 30-second timeout serializes alias updates. Within the lock, the update is performed as a database transaction that also records an audit log entry and publishes a stage transition event. The lock scope is per-model-per-alias, so updates to different models do not contend. This is one of the few places in the MLOps platform where strong consistency is mandatory -- metric writes can be eventually consistent, but alias updates must be atomic.

---

## Insight 6: Checksum-Based Artifact Deduplication Saves 30% Storage for Iterative Training

**Category:** Cost Optimization
**One-liner:** When a model is retrained with a minor hyperparameter change and produces an identical artifact (same SHA-256 hash), the system skips the upload and creates a reference link to the existing artifact, avoiding redundant storage of 100GB+ files.

**Why it matters:** In iterative ML development, many training runs produce identical or near-identical model artifacts. Fine-tuning a hyperparameter might not change the final weights, and reproducing a run should not double storage costs. The upload path computes a SHA-256 checksum of the model file before uploading. If an artifact with the same checksum already exists, the system creates a reference link instead of uploading a duplicate. For large LLMs (50-100GB+), this saves significant storage costs and upload time. Multipart upload with 100MB chunks and 4-way parallelism handles the cases where deduplication does not apply, with automatic retry on chunk failure and cleanup of incomplete uploads via abort_multipart_upload.

---

## Insight 7: Stage Transition Governance Enforces Model Cards and Bias Checks Before Production

**Category:** Security
**One-liner:** A model version cannot transition to the Production stage without a model card, a passing bias validation, and manager approval -- governance requirements enforced by the stage transition workflow, not by team discipline.

**Why it matters:** Without automated governance gates, the pressure to ship models fast leads to undocumented, unvalidated models in production. The stage transition workflow is a state machine with explicit validation at each transition: None to Staging requires basic metadata, Staging to Production requires a model card (documentation), bias validation results, and an approval record. The transition executes under a distributed lock within a database transaction that also archives the existing production version (if requested), updates the stage, records the audit log, and updates the @champion alias. This ensures that "production" is not just a label but a certificate that the model has passed all required checks. The audit log creates a compliance trail showing who approved what and when.

---

## Insight 8: Optimistic Concurrency Resolves the Heartbeat Timeout vs. Task Completion Race

**Category:** Contention
**One-liner:** When a task's heartbeat timeout fires at the exact moment the task is completing successfully, optimistic concurrency control with a version number ensures that the completion update wins over the timeout-triggered failure marking.

**Why it matters:** Long-running training tasks send periodic heartbeats to the scheduler. If a task completes during the window between its last heartbeat and the timeout check, the scheduler might mark it as failed and schedule a retry. The version number on the task state prevents this: the completion update increments the version, so when the timeout handler tries to update with the old version, the CAS (Compare-And-Set) fails with 0 rows affected. The scheduler then re-reads the state and discovers the task has already completed. This pattern is essential for any system with long-running tasks and heartbeat-based liveness detection, where the completion and timeout paths race against each other.

---

## Insight 9: ClickHouse ReplacingMergeTree Handles Concurrent Metric Writes Without Coordination

**Category:** Data Structures
**One-liner:** When multiple distributed training workers write metrics for the same run simultaneously, ClickHouse's ReplacingMergeTree deduplicates by (run_id, key, step, timestamp) during background merges, with last-write-wins semantics for exact duplicates.

**Why it matters:** Coordinating writes from 100+ training workers would require a centralized sequencer that would become a bottleneck. Instead, the system allows all workers to write independently to ClickHouse, accepting that occasional duplicate entries (same run, same metric key, same step) may occur due to retries or exactly-once delivery failures. ReplacingMergeTree handles this during its background merge process, keeping the latest version of each unique row. This is a deliberate consistency trade-off: metrics do not need strict ordering guarantees (the step number provides logical ordering), and the eventual deduplication during compaction is sufficient. The alternative -- coordinating writes through a central service -- would add latency to every metric write and create a single point of failure.

---

## Insight 10: Scheduler State Sharding Distributes Pipeline Ownership Across Multiple Instances

**Category:** Partitioning
**One-liner:** With 1000+ concurrent pipelines, a single scheduler instance becomes a state management bottleneck, so pipelines are partitioned by hash and distributed across multiple scheduler instances, each managing a subset.

**Why it matters:** The scheduler must maintain in-memory DAG state for active pipelines, manage task priority queues, and process heartbeats -- all operations that scale linearly with pipeline count. A single scheduler instance hits CPU and memory limits around 1000 concurrent pipelines. Sharding by pipeline hash distributes the load across multiple instances, each responsible for a partition of pipelines. Combined with in-memory DAG caching (synced from PostgreSQL on startup and failover) and event-driven task state updates (replacing polling), this reduces state store read load by 90%. Leader election with standby promotion (30-second RTO) ensures that a scheduler failure is recovered by a standby that re-hydrates state from the persistent store. Optimistic locking (CAS-based updates) avoids distributed locks for the common case.

---

## Insight 11: Training-Serving Skew Prevention Requires Point-in-Time Feature Retrieval

**Category:** Consistency
**One-liner:** If the model was trained with features as they existed at time T, but serving uses features as they exist at time T+1 (after values changed), the prediction is based on a data distribution the model never saw.

**Why it matters:** Training-serving skew is one of the most insidious failure modes in production ML. The feature store connector provides point-in-time joins during training: for each training example at timestamp T, it retrieves feature values as they existed at time T, not the current values. Without this, the training data includes "future information" that is not available at serving time, creating a distribution mismatch. The PSI (Population Stability Index) drift threshold of 0.2 monitors for distribution shifts between training and serving feature distributions. When skew is detected, the system triggers a retraining pipeline. This integration between the MLOps platform and the feature store is what prevents the subtle but damaging failure mode where a model performs well in offline evaluation but poorly in production.

---

## Insight 12: Materialized Views Pre-Compute Metric Aggregations for Dashboard Queries

**Category:** Caching
**One-liner:** Rather than scanning billions of raw metric rows to compute min/max/avg for dashboard display, ClickHouse materialized views maintain incrementally updated aggregations that serve common queries in milliseconds.

**Why it matters:** The most common dashboard operations are viewing the latest value of a metric, comparing min/max/avg across runs, and charting metric trends. Computing these from raw data requires scanning potentially millions of rows per run. ClickHouse materialized views (metric_latest for last value per key, metric_summary for min/max/avg aggregations) are updated incrementally on each insert, so they are always current without requiring expensive full-table scans. The run comparison engine leverages these pre-computed summaries to compare multiple runs across multiple metrics in sub-second time. Combined with Redis result caching (5-minute TTL), this means that the most frequent read operations never touch the raw metric tables, reserving raw data access for detailed drill-down analysis.

---

## Insight 13: Weighted Multi-Factor Priority Scoring Prevents Task Scheduling Starvation

**Category:** Traffic Shaping
**One-liner:** Combining deadline urgency (40%), wait time fairness (30%), resource efficiency (20%), and user priority (10%) in a weighted score ensures no single factor dominates and low-priority jobs eventually run.

**Why it matters:** Naive priority queues based on a single factor cause starvation. Pure deadline-based scheduling ignores fairness, letting non-deadline jobs wait indefinitely. Pure priority-based scheduling lets low-priority jobs starve even when resources are available. The weighted approach ensures that even a low-priority job with no deadline will eventually score high enough through its wait time component to be scheduled. The resource efficiency factor (preferring tasks that fill an entire GPU node) minimizes fragmentation, and the weights are tunable per deployment without changing the algorithm. This multi-factor approach is a general pattern for any shared-resource scheduling system where multiple stakeholders compete for limited capacity.

---

## Insight 14: Leader-Standby Scheduler with 30-Second Failover Keeps Pipeline Orchestration Running

**Category:** Consensus
**One-liner:** The pipeline scheduler uses leader election with two standby instances; on primary failure, a standby is promoted within 30 seconds and reconstructs in-flight pipeline state from the persistent store.

**Why it matters:** The scheduler is a single point of failure for all training pipeline execution. Without HA, a scheduler crash blocks all pipelines until manual intervention. Leader election via lease-based protocols (etcd or ZooKeeper) detects primary failure through lease expiry and automatically promotes a standby. The new leader reads pipeline and task state from PostgreSQL to reconstruct the DAG execution context, then resumes dispatching tasks. The 30-second RTO is acceptable because training jobs are long-running (minutes to hours), so a brief scheduling pause has minimal impact on overall job completion time. The in-memory DAG cache is rebuilt from the persistent store, ensuring no state is lost even if the previous leader crashed without clean shutdown.

---
