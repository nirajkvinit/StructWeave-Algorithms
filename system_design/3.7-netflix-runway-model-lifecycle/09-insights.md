# Key Insights: Netflix Runway Model Lifecycle Management

## Insight 1: Bidirectional Buffering Solves Prediction-Outcome Event Reordering

**Category:** Streaming
**One-liner:** When outcome events can arrive before their corresponding prediction events due to network reordering, a bidirectional buffer that stores both orphaned predictions and orphaned outcomes with short TTLs prevents silent data loss in the ground truth pipeline.

**Why it matters:** Traditional stream join implementations assume predictions arrive before outcomes, buffering predictions and matching incoming outcomes. When network reordering causes an outcome to arrive first, it is dropped because no matching prediction exists yet. Runway's bidirectional buffer reverses the assumption: if an outcome arrives without a matching prediction, it is stored in a `pending_outcomes` buffer with a 5-minute TTL. When the prediction subsequently arrives, the join completes. This pattern is generalizable to any event-driven system where two correlated event streams have no guaranteed ordering -- financial trade matching, IoT sensor correlation, or ad attribution pipelines. The key insight is that the cost of a small buffer (memory for 5 minutes of orphaned outcomes) is negligible compared to the cost of lost ground truth data that makes performance-based staleness detection inaccurate.

---

## Insight 2: Multi-Signal Staleness Fusion with Confidence-Weighted Scoring

**Category:** System Modeling
**One-liner:** Rather than triggering retraining on any single threshold crossing, Runway fuses age, data drift (PSI), concept drift (KL divergence), and performance signals into a weighted staleness score, where the confidence of the score itself depends on which signals have data available.

**Why it matters:** Single-signal staleness detection is fragile: age-based triggers retrain models that are still performing well, while performance-only triggers miss models serving stale data when ground truth is delayed. Runway's weighted fusion approach calculates a composite staleness score where each signal contributes proportionally to its policy weight, but the overall confidence of the decision depends on signal availability. If ground truth is delayed (common for subscription churn models with 7-30 day label delays), the confidence drops from "high" to "medium," and the system falls back to proxy metrics (CTR, engagement scores) rather than making a confident wrong decision. This two-layer evaluation -- "how stale is the model" and "how confident are we in that assessment" -- prevents both false positives (unnecessary retrains wasting compute) and false negatives (stale models degrading silently).

---

## Insight 3: Dependency Graph Auto-Discovery from Pipeline Lineage

**Category:** Data Structures
**One-liner:** Instead of requiring teams to manually declare model dependencies, Runway extracts dependency edges automatically from Metaflow workflow metadata, building a DAG that enables cascade staleness detection across hundreds of models.

**Why it matters:** Manual dependency declaration fails at scale because teams do not know (or forget to update) which upstream models feed their features. Runway's lineage extractor parses Metaflow workflow completion events to identify input tables, feature sets from the Axion fact store, and upstream model outputs, then generates typed edges (DEPENDS_ON, USES_FEATURE, CONSUMES). The graph must remain acyclic, enforced by a cycle detection check before each edge insertion. This auto-discovered graph enables a capability that manual declaration cannot: when an upstream embedding model becomes stale, Runway can automatically propagate staleness to all downstream recommendation models that consume those embeddings, triggering coordinated retraining. The daily reconciliation job that compares the graph against recent Metaflow runs prevents stale lineage -- a subtle failure mode where the graph reflects dependencies from old pipeline versions rather than current ones.

---

## Insight 4: Optimistic Locking Prevents Duplicate Retraining Jobs

**Category:** Atomicity
**One-liner:** Using Redis SetNX with a 4-hour TTL as a retrain lock prevents multiple concurrent staleness evaluations from triggering duplicate retraining jobs for the same model.

**Why it matters:** Runway's staleness evaluation runs on a tiered schedule (Tier 1 models every 15 minutes, Tier 2 every hour), and two evaluations can independently conclude the same model is stale and attempt to trigger retraining simultaneously. Without coordination, this results in duplicate Maestro workflow submissions that waste compute and potentially create conflicting model versions. The SetNX-based lock is deliberately simple: it avoids the complexity of distributed consensus while providing "at most once" trigger semantics. If the lock already exists and the existing retrain is still active (pending or running), the duplicate trigger is suppressed. The 4-hour TTL ensures locks are released even if the retraining process crashes without cleanup. This pattern -- using a lightweight distributed lock for deduplication rather than full coordination -- is widely applicable to any system where idempotent trigger semantics are needed.

---

## Insight 5: Lambda Architecture for Ground Truth with Tiered Trust

**Category:** Consistency
**One-liner:** Runway's ground truth pipeline uses a speed layer (streaming join with 1-hour window, stored in Redis) for real-time approximation and a batch layer (daily Spark join with 7-day window, stored in S3) as the authoritative source, with the batch layer always overriding the speed layer.

**Why it matters:** Different Netflix models have vastly different label delay profiles: click predictions resolve in seconds, watch completion in hours, and subscription churn in 7-30 days. A single join strategy cannot serve all these patterns efficiently. The speed layer provides approximate ground truth within an hour for fast-feedback models, while the batch layer handles late-arriving outcomes with a 7-day window. The view merger follows a strict precedence rule: batch data always takes precedence, and speed data is only used for the recent window not yet processed by the batch layer. This layered approach means the system can provide real-time performance estimates for click models (where speed layer accuracy is high) while avoiding premature staleness decisions for churn models (where speed layer coverage is too low to be trustworthy).

---

## Insight 6: Version Pinning Against Mid-Evaluation Model Swaps

**Category:** Atomicity
**One-liner:** Staleness evaluation pins the model version at the start of the evaluation and discards results if the version changes before storage, preventing metrics from being attributed to the wrong model version.

**Why it matters:** A staleness evaluation can take minutes (collecting feature distributions, computing PSI, querying ground truth). If a new model version is deployed mid-evaluation, the computed metrics reflect a mixture of old and new version behavior. Runway's version pinning captures the current version ID at evaluation start, uses it for all subsequent queries, and performs a compare-and-verify before storing results. If the version has changed, the entire evaluation is discarded. This is the same pattern used in MVCC (Multi-Version Concurrency Control) databases: read a consistent snapshot, compute against it, and validate before committing. The cost of occasionally discarding an evaluation is far lower than the cost of storing metrics that cannot be attributed to a specific model version, which would corrupt the historical performance timeline used for trend analysis.

---

## Insight 7: Bootstrap Confidence Intervals for Statistically Rigorous Drift Detection

**Category:** Data Structures
**One-liner:** Runway uses 1,000 bootstrap samples to compute confidence intervals around PSI values, declaring drift significant only when the lower bound of the 5th-95th percentile interval exceeds the threshold.

**Why it matters:** Naive drift detection computes a single PSI value and compares it to a threshold, but this approach is highly sensitive to sample size and random variation. A model with low traffic might show PSI > 0.2 (moderate drift) purely due to sampling noise. Runway's bootstrap approach resamples the current distribution 1,000 times, computes PSI for each sample, and checks whether the 5th percentile (lower confidence bound) exceeds the threshold. This ensures that drift is only flagged when it is statistically robust, not when a single unlucky sample crosses the line. The practical impact is dramatic: without this rigor, Netflix would face a constant stream of false positive drift alerts that erode trust in the system and lead teams to set thresholds so high that real drift goes undetected.
