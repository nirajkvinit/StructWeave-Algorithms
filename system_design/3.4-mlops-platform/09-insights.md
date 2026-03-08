# Key Insights: MLOps Platform

## Insight 1: Weighted Multi-Factor Task Priority Prevents Scheduling Starvation
**Category:** Traffic Shaping
**One-liner:** Combining deadline urgency (40%), wait time fairness (30%), resource efficiency (20%), and user priority (10%) in a weighted score ensures no single factor dominates task scheduling.
**Why it matters:** Naive priority queues based on a single factor cause starvation -- pure deadline-based scheduling ignores fairness, pure priority-based scheduling lets low-priority jobs wait indefinitely. The weighted approach ensures that even a low-priority job with no deadline will eventually score high enough through its wait time component to be scheduled. The resource efficiency factor (preferring tasks that fill an entire GPU node) minimizes fragmentation, and the weights can be tuned per deployment without changing the algorithm.

---

## Insight 2: Node Scoring Balances GPU Fragmentation, Cost, and Data Locality
**Category:** Cost Optimization
**One-liner:** When placing a training task on a node, the scheduler penalizes GPU waste, rewards spot instances for checkpointable jobs, and bonuses data-local nodes -- preventing the hidden costs of naive scheduling.
**Why it matters:** A task requiring 2 GPUs placed on a node with 8 available GPUs fragments that node, potentially blocking a later 7-GPU job. The fragmentation penalty (gpu_waste * 0.1) steers smaller jobs toward partially-used nodes. The cost bonus (0.3 for spot-eligible checkpointable tasks) automatically routes Tier 3-4 experiments to cheaper spot instances, while non-checkpointable Tier 1 jobs land on reliable on-demand nodes. Data locality avoids the silent cost of cross-datacenter data transfer, which for billion-sample training datasets can add hours to job completion.

---

## Insight 3: Spot Preemption Handling Requires Coordinated Checkpoint-Then-Reschedule
**Category:** Resilience
**One-liner:** When a spot instance sends a 2-minute termination warning, the scheduler signals all tasks to checkpoint, waits up to 90 seconds for completion, then requeues them -- preserving hours of training progress.
**Why it matters:** Without coordinated checkpoint handling, spot preemptions waste all training progress since the last periodic checkpoint (potentially 15-30 minutes of GPU-hours). The 90-second checkpoint window within the 2-minute warning allows the task to serialize model state, optimizer state, and random seeds to distributed storage. The task is then requeued with an incremented retry count, enabling the scheduler to track preemption rates per node pool and adjust future placement decisions. This mechanism makes spot instances economically viable for training (60-70% cost savings) despite their unreliability.

---

## Insight 4: Tiered Metric Storage Spans Three Temperature Layers
**Category:** Streaming
**One-liner:** Training metrics flow through hot storage (ClickHouse, 7 days), warm storage (ClickHouse, 90 days), and cold storage (Parquet in object storage, 7 years) with automated migration between tiers.
**Why it matters:** ML experiment tracking generates billions of data points (100K+ runs x 1000+ metrics x 10K+ steps), and keeping all of them in hot storage is prohibitively expensive. The tiered approach keeps recent experiments queryable at sub-second latency while preserving historical data for compliance and reproducibility. ClickHouse materialized views pre-compute aggregations (min/max/avg per metric key) that serve 90% of comparison queries without scanning raw data. The cold tier uses Parquet's columnar format for efficient long-term analytics, with an archive index in the relational database for discoverability.

---

## Insight 5: Client-Side Batching Reduces Metric Write API Calls by 100x
**Category:** Traffic Shaping
**One-liner:** SDK-level buffering collects metrics locally for 100ms or up to 1000 entries, then sends a single batch API call -- transforming 100K individual writes per second into 100 batch requests.
**Why it matters:** During distributed training with 100+ workers, each logging a metric every few milliseconds, individual API calls would overwhelm the tracking server. Client-side batching is invisible to the data scientist (the SDK handles it transparently) and reduces API call volume from 100K/s to 1K/s while adding at most 100ms of delay before metrics appear in dashboards. The server-side async write path further decouples ingestion from ClickHouse insertion, allowing the API to return immediately while background workers handle durable storage. This two-layer buffering (client + server) is essential for handling training spikes without data loss.

---

## Insight 6: Atomic Alias Management Prevents Split-Brain Model Deployments
**Category:** Atomicity
**One-liner:** Model aliases like @champion and @production are updated under distributed locks with transactional database writes, ensuring that only one model version holds a given alias at any time.
**Why it matters:** If two concurrent requests both try to set the @champion alias to different versions, a non-atomic implementation could leave the alias pointing to an intermediate state or fail silently. The distributed lock (Redis or etcd) serializes alias updates, while the database transaction ensures the alias update, the previous version's archival, and the audit log entry all succeed or fail together. The event bus notification to downstream consumers (serving infrastructure, CI/CD, monitoring) guarantees they react to the correct, finalized state rather than an intermediate one.

---

## Insight 7: Content-Addressable Artifact Deduplication Saves 30% Storage for Incremental Training
**Category:** Cost Optimization
**One-liner:** Before uploading a model artifact, the system computes its SHA256 checksum and checks for existing artifacts with the same hash -- if found, it creates a reference link instead of duplicating the binary.
**Why it matters:** Incremental training and fine-tuning often produce model artifacts that share most of their weights with previous versions. Without deduplication, each version of a 100GB LLM consumes full storage, quickly reaching petabyte scale. Content-addressable storage reduces this by ~30% for incremental training workflows. The multipart upload with 100MB chunks and 4-way parallelism handles the remaining unique artifacts efficiently, with checksum verification on download catching any corruption. The abort-on-failure cleanup prevents orphaned partial uploads from consuming storage.

---

## Insight 8: Stage Transition Governance Enforces Model Cards and Bias Validation Before Production
**Category:** Security
**One-liner:** Models cannot reach the Production stage without a completed model card, bias validation results, and manager approval -- enforced by the platform, not by process.
**Why it matters:** In regulated industries, deploying a model without proper documentation and fairness testing is a compliance violation. Making governance a hard gate in the stage transition workflow means no model reaches production without meeting these requirements, regardless of organizational pressure. The state machine (None -> Staging -> Production -> Archived) with validation sub-states (ValidationPending -> Validating -> ValidationPassed/Failed) provides both auditability and clear feedback on what is blocking promotion. The distributed lock during transition prevents race conditions where a model could bypass governance checks through concurrent requests.

---

## Insight 9: Optimistic Concurrency Control Resolves Task State Race Conditions
**Category:** Contention
**One-liner:** When a task heartbeat timeout and task completion race, the version-numbered CAS (Compare-And-Swap) update ensures the completion wins and the task is not erroneously retried.
**Why it matters:** In a distributed system with thousands of concurrent tasks, heartbeat timeouts and task completions frequently race. If the scheduler marks a task as failed (due to missed heartbeat) while the task is writing its final output, the task would be retried, wasting GPU resources and potentially producing duplicate results. The version number on the task_instance row ensures that whichever update executes first wins -- the second update finds the version has changed and takes no action. This eliminates the need for distributed locks on every heartbeat check, which would be prohibitively expensive at scale.

---

## Insight 10: Leader-Standby Scheduler with 30-Second Failover Keeps Pipeline Orchestration Running
**Category:** Consensus
**One-liner:** The pipeline scheduler uses leader election with two standby instances; on primary failure, a standby is promoted within 30 seconds and reconstructs in-flight pipeline state from the persistent store.
**Why it matters:** The scheduler is a single point of failure for all training pipeline execution. Without HA, a scheduler crash blocks all pipelines until manual intervention. Leader election via lease-based protocols (etcd or ZooKeeper) detects primary failure through lease expiry and automatically promotes a standby. The new leader reads pipeline and task state from PostgreSQL to reconstruct the DAG execution context, then resumes dispatching tasks. The 30-second RTO is acceptable because training jobs are long-running (minutes to hours), so a brief scheduling pause has minimal impact on overall job completion time.

---
