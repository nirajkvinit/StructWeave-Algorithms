# 04 — Deep Dives & Bottlenecks: A/B Testing Platform

## Deep Dive 1: Assignment Engine

### Ruleset Compilation and Distribution

The assignment engine's central challenge is reconciling two requirements: assignments must be deterministic and fast (sub-millisecond), but experiments are constantly being created, modified, started, and stopped. The solution is a **compiled ruleset** — a snapshot of all active experiment configurations expressed as an immutable, versioned document that SDKs can evaluate without network I/O.

The Ruleset Manager compiles a new document whenever experiment configuration changes. The document contains:
- All active experiments (ID, salt, traffic fraction, targeting predicates, variant definitions)
- Layer assignments (which experiments are in which mutual-exclusion namespace)
- SDK-evaluable targeting expressions (encoded as a simple predicate tree, not arbitrary code)

The compiled ruleset is stored in object storage and distributed via a content delivery network. SDK clients poll for the latest version every 30–60 seconds (with jitter to prevent thundering herds). The version key is a content hash; unchanged rulesets produce no bandwidth cost due to 304 Not Modified responses.

```
Ruleset document structure:
{
    version: "sha256:abc123...",
    generated_at: timestamp,
    layers: [
        {
            layer_id: UUID,
            layer_salt: string,
            experiments: [
                {
                    experiment_id: UUID,
                    experiment_salt: string,
                    traffic_fraction: 0.20,
                    targeting_rules: [...],
                    variants: [
                        { variant_id, ordinal, weight, flag_overrides }
                    ]
                }
            ]
        }
    ]
}
```

### Hash Function Selection

The hash function must be:
1. **Uniform:** all buckets receive equal probability
2. **Deterministic:** same input always maps to same output
3. **Independent across experiments:** small change in experiment_id or salt produces completely different bucket assignment (avalanche effect)
4. **Fast:** hash millions of times per second on commodity hardware

MD5 and SHA-256 both satisfy these requirements, but SHA-256 provides stronger independence guarantees. The salt per experiment ensures that two experiments testing the same user produce uncorrelated bucket assignments — critical for experiment isolation even within a shared layer.

### Targeting Rule Evaluation

Targeting rules filter which users are eligible for an experiment. They are evaluated before the hash, so ineligible users never enter the traffic pool:

```
TargetingRule evaluation order (short-circuit on first false):
1. User attribute matches (country IN ["US", "CA"], platform = "ios")
2. Cohort membership (user.created_at > experiment.started_at - 30d)
3. Custom properties (user.subscription_tier = "premium")
4. Holdout exclusion (user not in global holdback group)
```

Rules are expressed as a predicate tree with AND/OR/NOT operators and comparison leaves. The SDK evaluates them against a snapshot of user attributes provided at assignment call time. Targeting attributes are not fetched by the SDK — the caller must supply them.

### Sticky Assignment Guarantee

The deterministic hash guarantees stickiness: the same `(entity_id, experiment_id, salt)` always produces the same bucket. No session state or database lookup is required. This is the core insight of hash-based assignment — stickiness is a mathematical property of the function, not a stored fact.

One subtle failure mode: if the experiment's `traffic_fraction` changes (say, from 10% to 20%) midway through the experiment, users in buckets 1000–1999 will be newly assigned to treatment. This creates a contaminated cohort (they experienced the product without the treatment first). The platform guards against this by:
- Warning when traffic fraction increases after experiment start
- Optionally preventing such changes once the experiment has been running for > 24 hours
- Never reducing traffic fraction (that would eject users from treatment, creating survivorship bias)

---

## Deep Dive 2: Statistical Engine

### Metric Pipeline Architecture

The statistical engine receives pre-aggregated per-user metric values from the batch aggregator. It does not operate on raw event streams — this separation is important for correctness, because the stats engine needs a stable snapshot to avoid computing on partially-received data.

```
Statistical engine processing per experiment per metric:

1. Ingest per-user observations: { entity_id, variant_id, metric_value }
2. Apply outlier winsorization: cap values at p99.5 to reduce noise from outliers
3. Compute sufficient statistics per variant: { n, sum, sum_sq, mean, variance }
4. If CUPED enabled: apply covariate adjustment (see Algorithm 2 in document 03)
5. Run primary statistical test (z-test or t-test based on metric type)
6. Compute confidence intervals and effect sizes
7. If analysis_mode = sequential: compute mSPRT always-valid p-value
8. If analysis_mode = bayesian: update Beta/Normal-Normal posterior
9. Evaluate significance and guardrail status
10. Write results to Results Store
```

### Frequentist Analysis Details

**Continuous metrics (mean):** Welch's t-test (does not assume equal variances). For large samples (n > 1000), the z-approximation is used.

**Binary metrics (conversion rate):** Two-proportion z-test. Chi-squared test for multi-variant experiments (> 2 variants).

**Ratio metrics (revenue per page view):** Delta method to approximate variance of a ratio. The delta method accounts for correlation between numerator and denominator.

**Quantile metrics (p95 latency, p50 revenue):** Bootstrap resampling (1000 samples) or the Hodges-Lehmann estimator. These are reserved for the batch path due to computational cost.

### CUPED Implementation Nuances

CUPED works best when the covariate has high correlation with the outcome metric (ρ > 0.5). If correlation is low, the variance reduction is minimal and can actually add noise. The platform:
- Computes ρ for each metric and reports it to analysts
- Skips CUPED when |ρ| < 0.2 (negligible benefit)
- Applies CUPED independently to each variant (not pooled) to avoid bias

A more advanced variant, **CUPAC** (Controlled Using Pre-treatment Assigned Control), uses a machine learning model trained on pre-experiment data to predict user outcomes, then uses model predictions as covariates. This can achieve variance reductions of 50–70% for behavioral metrics with strong temporal autocorrelation.

### Bayesian Analysis Details

For binary metrics, the platform uses a **Beta-Binomial conjugate model**:
- Prior: `Beta(1, 1)` (uninformative uniform prior)
- After observing `s` successes in `n` trials: Posterior `Beta(1+s, 1+n-s)`
- Key outputs: `P(treatment > control)`, expected loss of choosing treatment if control is actually better

For continuous metrics, the platform uses a **Normal-Normal conjugate model** with a weakly informative prior calibrated to the pre-experiment metric distribution.

Bayesian results are displayed alongside frequentist results, not as replacements. The Bayesian `P(treatment > control)` is intuitive for stakeholders and does not require understanding of p-values, but the platform is clear that it is not a substitute for the frequentist Type I error guarantee.

### Multiple Metrics Correction

When an experiment defines 10+ metrics, the probability of at least one spurious significant result approaches 40% under independent testing (multiple comparisons problem). The platform applies **Benjamini-Hochberg False Discovery Rate (FDR) correction** to secondary metrics (not the primary pre-registered metric). The primary metric uses uncorrected p-values because it was pre-registered before the experiment started.

---

## Deep Dive 3: Event Ingest Pipeline

### Idempotency and Exactly-Once Semantics

Event delivery is at-least-once (SDKs retry on failure), but metric computation requires exactly-once counting. The deduplication strategy:

1. Each event carries a client-generated `event_id` (UUID).
2. The Event Processor maintains a **dedup window** in a distributed cache: for each event_id, record receipt timestamp with TTL of 7 days.
3. On receipt, check the dedup cache. If event_id present, drop the event. If absent, insert and process.
4. The dedup cache uses a Bloom filter for fast negative checks (95% of events are not duplicates), with an exact hash map fallback for the 5% that are.

This approach reduces dedup overhead to ~2 cache lookups per event (Bloom filter read + conditional hash map write), keeping the Event Processor on the hot path.

### Backpressure and Ordering

Events flow from SDK → Event Gateway → Message Queue → Event Processor. The message queue is the system's buffer against ingest spikes. Partitioning is by `entity_id` to ensure that all events for a given user arrive at the same processor shard, enabling per-user aggregation without distributed coordination.

The event pipeline is **not ordered** by event timestamp within a partition — events may arrive out of order due to SDK retry batching. The metric computation handles this by aggregating over time windows with a configured **watermark lag** (events arriving up to 5 minutes late are included; later arrivals trigger a recomputation job).

### Schema Evolution

Event schemas evolve continuously as products add new properties. The pipeline uses a **schema registry** where each event type has a versioned schema. The Event Gateway validates inbound events against the registered schema, rejects events with unknown fields (strict mode, opt-in) or silently drops unknown fields (lenient mode, default). Schema changes go through a review process to prevent breaking downstream metric definitions.

---

## Deep Dive 4: Experiment Interaction Detection

### Why Interactions Are Dangerous

Two experiments running concurrently may interact even when assigned to separate layers if they affect the same downstream behavior. Example: Experiment A tests a faster checkout animation (layer 1); Experiment B tests a checkout coupon offer (layer 2). A user in treatment A and treatment B may exhibit a synergistic response — they complete checkout faster *and* with a coupon, boosting conversion well beyond what either experiment alone would predict. This makes both experiments' effect estimates wrong.

### Mutual Exclusion via Layering

The primary defense is **mandatory layer assignment**. Experiments within a layer use the same namespace hash, ensuring each user appears in at most one experiment per layer. Experiments in different layers operate on independent namespaces and may coincide on the same user.

Layer design guidance:
- Put experiments testing the same surface (checkout page) in the same layer
- Put experiments testing independent surfaces (checkout vs. homepage) in different layers
- Use a global holdback layer with a permanently excluded 5% of users to measure cumulative platform-level effects

### Statistical Interaction Detection

For experiments in different layers that share users, the platform can detect statistical interactions retroactively:

```
Interaction detection algorithm:
1. Identify pairs of concurrent experiments (A, B) that share eligible users
2. Segment users into 4 groups: (A_control ∩ B_control), (A_treat ∩ B_control),
   (A_control ∩ B_treat), (A_treat ∩ B_treat)
3. Compute metric values for each group
4. Test for interaction effect:
   Interaction = (metric[A_treat ∩ B_treat] - metric[A_control ∩ B_treat])
               - (metric[A_treat ∩ B_control] - metric[A_control ∩ B_control])
5. If |Interaction| / SE(Interaction) > z_alpha, flag as potential interaction
```

This 2×2 factorial analysis is computationally expensive for O(N²) experiment pairs. The platform runs it lazily for experiments that product owners flag as potentially related, not for all pairs.

---

## Race Conditions and Edge Cases

### Assignment Before Experiment Starts

SDKs cache the ruleset with up to 60-second staleness. If an experiment starts at T=0 and a user requests assignment at T=15s, their SDK may not yet have the updated ruleset and will see no experiment. The assignment log will reflect this — no assignment for this user. This is acceptable because the experiment start event and assignment log timestamps allow precise identification of the "ramping up" period, which can be excluded from analysis.

### Traffic Fraction Reduction Mid-Experiment

Reducing traffic fraction mid-experiment ejects users from treatment. These users' pre-ejection data is included in the metric computation but their post-ejection data is not. This creates **survivorship bias**: the remaining treatment users are not a representative sample of the original cohort. The platform blocks traffic fraction reduction after experiment start, or requires analyst acknowledgment that results will be invalidated.

### Clock Skew Between SDKs and Servers

Events generated by the SDK carry a client-generated timestamp. Client clocks can be wrong by minutes or even hours. The platform stores both `client_timestamp` and `server_received_at`, and uses `server_received_at` for watermark-based windowing in metric computation. Client timestamps are used only for ordering within a user session.

---

## Bottleneck Analysis

| Bottleneck | Manifestation | Mitigation |
|---|---|---|
| Assignment service under cold-start | First request before SDK cache warms up takes full round trip | Pre-warm SDK on app startup; serve stale cache during fetch |
| Event gateway fan-out | Single gateway node at 300K events/sec saturates NIC | Horizontal shard behind load balancer; auto-scale on queue depth |
| Dedup cache at high event volume | 300K lookups/sec exceeds single cache node throughput | Shard dedup cache by hash(event_id) % N_shards |
| Batch aggregator reprocessing | 90-day event log reprocessing for new metric definition takes hours | Incremental computation; store intermediate checkpoints |
| Statistical engine for large experiments | Computing CUPED for experiment with 10M users takes minutes | Sampling-based variance estimation for large N |
| Ruleset compilation latency | Frequent experiment changes trigger recompilation; each takes ~5s | Incremental patch diffs; debounce rapid changes with 10s window |
