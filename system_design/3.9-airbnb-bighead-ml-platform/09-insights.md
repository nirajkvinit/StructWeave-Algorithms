# Key Insights: Airbnb BigHead ML Platform

## Insight 1: Single DSL Compiling to Both Spark and Flink Eliminates Train-Serve Skew by Construction

**Category:** Consistency
**One-liner:** Zipline/Chronon's declarative feature DSL compiles the same feature definition into Spark SQL for batch training and Flink operators for streaming serving, making train-serve consistency a property of the compiler rather than a developer discipline.

**Why it matters:** Train-serve skew is the #1 cause of ML production bugs: a feature computed one way in a training notebook (SQL query) and differently in a serving endpoint (Python code) causes silent model degradation. Most platforms address this with documentation and code review -- human processes that fail at scale. Zipline/Chronon solves this structurally: a single Python DSL definition like `Feature(name="booking_count_7d", aggregation=COUNT, window=sliding(days=7))` is compiled by the DSL compiler into both a Spark window function (`COUNT(*) OVER (PARTITION BY user_id ORDER BY booking_time RANGE BETWEEN INTERVAL 7 DAYS PRECEDING AND CURRENT ROW)`) and a Flink `CountAggregator` with `SlidingEventTimeWindow(7d)` backed by RocksDB state. The developer cannot create inconsistency because there is only one definition. This approach -- making correctness a compiler guarantee rather than a process guarantee -- is applicable to any system where the same computation must execute in different environments.

---

## Insight 2: Point-in-Time Joins Prevent Data Leakage Through Temporal Correctness

**Category:** Data Structures
**One-liner:** When constructing training data, Zipline joins each training event with the feature snapshot whose timestamp is the closest-but-not-after the event timestamp, preventing the model from seeing future information during training.

**Why it matters:** A subtle but devastating ML bug occurs when training data uses feature values that include information from after the prediction event. For example, using a user's 7-day booking count as of January 17 to train a model predicting their behavior on January 15 leaks future bookings into the training data, inflating offline metrics but degrading production performance. Zipline's temporal join implementation uses `ROW_NUMBER() OVER (PARTITION BY user_id, event_id ORDER BY feature_timestamp DESC)` filtered by `feature_timestamp <= event_timestamp` to find the correct historical snapshot. The partition pruning optimization (only scanning feature partitions within the lookback window) reduces data scanned by 90%+, making this computationally feasible at scale. The combined optimization stack (partition pruning + pre-aggregation + incremental backfills) achieves a 120x speedup over naive implementation -- from 4 hours to 2 minutes.

---

## Insight 3: Feature Sidecar Pattern for Serving-Time Feature Integration

**Category:** Edge Computing
**One-liner:** Deep Thought deploys a feature client as a Kubernetes sidecar container alongside each model pod, co-locating feature lookup with model inference to minimize network hops and enable shared caching.

**Why it matters:** In a traditional architecture, the model serving container makes a remote call to the feature store for each prediction, adding network latency and creating a dependency on the feature service's availability. Deep Thought's sidecar pattern places a feature client container in the same pod as the model server, sharing the pod's network namespace (localhost communication) and local cache. The sidecar maintains its own L1 cache (100MB, 60s TTL) that serves 30% of requests without any network call. Combined with the L2 datacenter cache (10GB, 300s TTL, 50% hit rate) and the KV store (100% hit rate), only 20% of feature lookups actually hit the remote store. This layered caching architecture reduces P99 feature lookup latency from 50ms to 8ms. The sidecar also implements a circuit breaker that falls back to default feature values when the remote store is unavailable, preventing feature store outages from cascading into prediction failures.

---

## Insight 4: AST-Based Automatic DAG Generation from Decorated Python Code

**Category:** System Modeling
**One-liner:** ML Automator parses Python source code AST to extract tasks annotated with `@bighead` decorators, automatically generates Airflow DAGs with correct dependency ordering, resource allocation, and retry policies, reducing pipeline boilerplate by 80%.

**Why it matters:** At Airbnb's scale, requiring ML engineers to manually define Airflow DAGs for each pipeline creates a bottleneck: the pipeline definition is boilerplate (feature computation, training, evaluation, deployment always follow the same pattern), but errors in DAG definition cause production failures. ML Automator's approach -- parse the AST to find decorated functions, extract data dependencies between them, run cycle detection, perform topological sort, and map each decorator type to the appropriate Airflow operator (e.g., `@bighead.feature()` maps to `SparkSubmitOperator`, `@bighead.train()` maps to `KubernetesPodOperator`) -- automates this entire process. Each generated DAG gets a unique ID based on the code hash (`pipeline_{code_hash[:8]}`), ensuring that DAG updates create new versions rather than modifying in-flight executions. This versioned DAG isolation prevents the race condition where an Airflow scheduler picks up a modified DAG while a previous version is still running.

---

## Insight 5: Snapshot Isolation for Feature Reads During Concurrent Updates

**Category:** Atomicity
**One-liner:** Prediction requests read features at a consistent snapshot version (computed as `floor(timestamp / SNAPSHOT_INTERVAL)`), accepting seconds of staleness to avoid reading partially-updated feature state during streaming writes.

**Why it matters:** When a streaming Flink job updates a user's `booking_count_7d` from 5 to 6 while a prediction request simultaneously reads that user's features, the prediction could observe an inconsistent state (some features from the old snapshot, some from the new). Rather than using expensive distributed locks that would destroy serving latency, Airbnb's approach uses snapshot isolation: each prediction request reads features at a consistent version boundary, and the freshness SLA (features less than 5 minutes old) is documented and accepted by model owners. This is the same trade-off that MVCC databases make -- accepting bounded staleness in exchange for non-blocking reads. The critical design decision is choosing the snapshot interval: too short and the versioning overhead becomes expensive, too long and features are unacceptably stale for latency-sensitive models.

---

## Insight 6: Blue-Green Deployment for Atomic Model Version Switching Under Traffic

**Category:** Resilience
**One-liner:** Deep Thought deploys new model versions as a completely separate deployment (green), waits for all pods to pass readiness probes, atomically switches the Kubernetes service selector, and then drains the old deployment (blue), ensuring no mixed-version serving.

**Why it matters:** A rolling update strategy for model deployments causes a window where both model v1 and v2 serve traffic simultaneously, producing inconsistent predictions that confuse A/B test analysis and can violate business logic (e.g., a pricing model showing different prices to the same user depending on which pod handles the request). The blue-green approach eliminates this window entirely: the service selector switch is an atomic Kubernetes API operation, so traffic moves from v1 to v2 in a single step. The canary controller adds a safety layer before this switch by routing a configurable percentage of traffic to the green deployment and monitoring error rates. If the canary shows elevated errors, an automatic rollback scales down the green deployment without ever updating the service selector. This pattern trades higher resource usage (temporarily running double capacity) for deployment safety.

---

## Insight 7: RocksDB State Backend Tuning as the Hidden Bottleneck in Streaming Features

**Category:** Scaling
**One-liner:** Flink's RocksDB state backend, which stores the running aggregation state for streaming features, requires careful tuning of block cache (1GB per task manager), compaction strategy (level-based with 4 levels), and write buffer (64MB) to prevent streaming lag from exceeding the freshness SLA.

**Why it matters:** Zipline's streaming path computes windowed aggregations (count, average, last value) by maintaining per-entity state in RocksDB. Under traffic spikes, RocksDB compaction can stall Flink processing, causing consumer lag to exceed the 5-minute freshness SLA. The baseline 5-minute P99 lag is reduced to 10 seconds through a combination of strategies: auto-scaling Flink parallelism based on consumer lag, using incremental (not full) checkpoints at 60-second intervals with async snapshotting, tuning RocksDB compaction and cache parameters, and salting hot keys with random suffixes to prevent key-skew-induced processing bottlenecks. The non-obvious insight is that the state backend -- not the computation logic -- is typically the bottleneck in stateful streaming, and its performance characteristics (compaction pauses, write amplification, cache misses) must be monitored and tuned separately from the stream processing framework.
