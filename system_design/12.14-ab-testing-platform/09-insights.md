# Insights — A/B Testing Platform

## Insight 1: Deterministic Hashing Makes Sticky Assignment a Mathematical Guarantee, Not a Database Query

**Category:** Data Structures

**One-liner:** `hash(entity_id ‖ experiment_id ‖ salt) mod 10000` gives every user a permanent, consistent bucket without writing a single row to a database.

**Why it matters:** The naive implementation of sticky assignment stores a row in a database for every (user, experiment) pair. At internet scale this creates a lookup bottleneck — 500K assignments/second means 500K database reads per second, with the query latency sitting directly on the product request's critical path. Hash-based assignment eliminates this entirely: the same inputs always produce the same output, so stickiness is a consequence of the function's determinism, not a stored fact.

The per-experiment salt is the subtle key to correctness. Without it, a user who lands in bucket 1500 in experiment A also lands in bucket 1500 in experiment B. If both experiments are in different mutual-exclusion layers, users in the top traffic fraction of A are always also in the top fraction of B — their assignments are perfectly correlated. This correlation means the groups of users who see experiment A's treatment are systematically different from those who don't, which can confound both experiments' results. Adding a random per-experiment salt breaks this correlation, ensuring that the assignment for any two experiments is statistically independent even for the same user. This insight generalizes beyond A/B testing: whenever you need k independent hash spaces from a single hash function, parameterize the input with a unique per-space seed rather than attempting to partition a single hash output.

---

## Insight 2: Sequential Testing Resolves the Peeking Problem Without Sacrificing Analytical Freedom

**Category:** System Modeling

**One-liner:** Always-valid confidence sequences (mSPRT) let analysts look at results any time without inflating false positive rates — early stopping becomes mathematically safe, not just pragmatically tempting.

**Why it matters:** The peeking problem is the most common source of invalid experiment conclusions in production systems. Analysts watch dashboards and stop experiments early when they see a favorable result, inflating the effective Type I error rate far above the nominal 5%. If an analyst peeks 5 times during an experiment and stops when p < 0.05, the actual false positive rate is closer to 20%. Classical frequentist statistics offer no defense: a p-value computed at time t is only valid if the decision to look at time t was predetermined before the experiment started.

Sequential testing, specifically the mixture Sequential Probability Ratio Test (mSPRT) formulated by Johari et al., produces a p-value that is valid at any time t under any stopping rule. The intuition is that the test statistic is an e-process — a non-negative supermartingale — and Ville's inequality guarantees that its probability of ever exceeding 1/α is at most α. The analyst can look at results daily, hourly, or continuously without mathematical penalty. Implementing this requires pre-registering a minimum detectable effect (which parameterizes the mixing distribution), but this is a reasonable requirement for any scientifically valid experiment. The operational consequence is profound: the platform can display continuously updating p-values without any caveat about "don't stop early," and analysts can make legitimate early-stop decisions when results are clearly significant — accelerating the experimentation cycle for obvious wins and obvious losses alike.

---

## Insight 3: CUPED Buys Sample Size Reduction by Partitioning Variance, Not by Changing the Experiment

**Category:** Scaling

**One-liner:** Adjusting outcome metrics with pre-experiment covariate data (CUPED) removes predictable noise from user history, shrinking confidence intervals without changing the treatment or running more users.

**Why it matters:** The width of a confidence interval is proportional to `sqrt(variance / n)`. To halve the interval, you need either 4× more users or to reduce variance by 75%. Recruiting 4× more users into an experiment takes 4× as long, dramatically slowing the pace of product iteration. CUPED achieves variance reduction instead: by regressing out the component of variance explained by pre-experiment behavior (e.g., a user's historical purchase rate explains 50% of their in-experiment purchase rate variance), CUPED reduces the error term and tightens the confidence interval. Experiments reach significance in days rather than weeks.

The practical consequence is a capacity multiplier: the platform can run more experiments concurrently (because each one completes faster), detect smaller effects (because tighter intervals enable detection of smaller differences), or maintain the same detection capability with less traffic exposure (reducing blast radius for risky experiments). The key implementation requirement is that the platform must retain pre-experiment data for every assigned user — this is why the raw event log is retained for 90 days rather than just the experiment's duration, and why the batch aggregator fetches pre-experiment covariates as part of every metric computation. An advanced extension, CUPAC (Controlled Using Pre-treatment Assigned Control), uses machine learning to predict user outcomes from pre-experiment features, further amplifying variance reduction to 50–70% for behavioral metrics with strong temporal autocorrelation.

---

## Insight 4: Sample Ratio Mismatch Detection Is the Most Important Data Quality Check in Experimentation

**Category:** Consistency

**One-liner:** If the observed traffic split doesn't match the intended split, the randomization is broken and every metric on the dashboard is meaningless — SRM detection catches this before analysts make wrong decisions.

**Why it matters:** Sample ratio mismatch (SRM) is so common in production experimentation that most mature platforms report it as the single most frequently encountered data quality issue. The problem arises from dozens of subtle bugs that each cause one variant's traffic to differ from the other's: a variant-specific crash that suppresses events, a caching layer that serves one variant preferentially, a bot filtering rule applied differently by variant, or a logging bug that captures events at different rates. In all cases the result is the same: the treatment and control groups are no longer comparable random samples, and any effect estimate is causally invalid regardless of its p-value.

The detection mechanism is straightforward — a chi-squared goodness-of-fit test on observed vs. expected assignment counts, run continuously throughout the experiment. The operational decision is what to do on detection: the platform uses tiered response (warning → pause → auto-stop) calibrated to severity, because an SRM with p=0.001 and a 2% traffic imbalance is less dangerous than one with p=0.0001 and a 40% imbalance. Critically, every experiment results dashboard must display SRM status prominently, and significant results with an SRM warning must be visually marked as non-actionable. Engineers and analysts who see a promising result must internalize that the result cannot be trusted until SRM is resolved — a cultural and UX challenge as much as a technical one. The diagnostic suite (checking for crash rates, event type distributions, geographic distributions, and config change correlations) converts the SRM alert from an error code into an actionable investigation guide.

---

## Insight 5: Layered Mutual Exclusion Enables Thousands of Concurrent Experiments by Making Isolation a Namespace Property

**Category:** Partitioning

**One-liner:** Each mutual-exclusion layer is an independent hash namespace where a user appears in at most one experiment — isolation is a consequence of namespace disjointness, not a scheduler constraint.

**Why it matters:** The naive approach to experiment isolation is a scheduler that prevents two experiments from targeting the same users simultaneously. This creates a global constraint that becomes a bottleneck: every new experiment start must compare its targeting population against all running experiments. With 10,000 concurrent experiments, this comparison is O(N) per experiment start and requires a distributed lock or coordination service to maintain consistency. The complexity scales poorly.

Layered namespaces solve this structurally. Each layer hashes user IDs independently (using a layer-specific salt in the hash input), partitioning users into 10,000 buckets in that namespace. Experiments within the same layer share the namespace and thus cannot overlap — a user's bucket in the layer namespace is already committed to at most one experiment. Experiments in different layers operate on statistically independent namespaces; a user's bucket in layer 1 has zero correlation with their bucket in layer 2. The layer system converts a global constraint into a local one: new experiment creation only needs to check utilization within its assigned layer, not across all running experiments globally. The design also enables layer-specific holdback groups (a set of buckets reserved as permanent controls within a layer) without affecting other layers. The primary operational burden is educating experimenters about layer assignment discipline: related experiments must share a layer to ensure isolation; unrelated experiments should use different layers to maximize available traffic.

---

## Insight 6: The Append-Only Event Log Is the System's Source of Truth — Metric Definitions Should Not Be Locked In at Experiment Start

**Category:** Replication

**One-liner:** Storing raw events immutably and deriving metrics via queries means new metric definitions can be evaluated retroactively on completed experiments without re-running them.

**Why it matters:** In a pre-aggregation design, the platform computes metric values at ingest time and stores only aggregates. This is operationally efficient but inflexible: if an analyst realizes mid-experiment that they need a different metric, or if a post-experiment investigation requires a metric that wasn't predefined, there is no way to compute it retroactively — the raw data was discarded. They must run a new experiment and wait 14 more days.

The append-only event log inverts this constraint. Raw events are retained for 90 days and every metric is computed as a query or stream processor over the log. Changing a metric definition (from mean revenue to p95 revenue, or from conversion rate to revenue per exposed user) is a configuration change, not a data collection restart. This design has a measurable cost — 90-day raw event storage is approximately 115 TB in our capacity estimates — but it pays for itself many times over by enabling post-hoc analysis, metric correction after logging bugs are fixed, and forensic investigation of anomalous results. The architectural principle generalizes broadly: in data systems where requirements evolve (and in product experimentation, they always do), preserving raw inputs and deriving views is always more flexible than pre-aggregating at ingestion. The storage cost is bounded and predictable; the value of retroactive metric computation is unbounded.

---

## Insight 7: Feature Flags and A/B Experiments Share the Same Delivery Mechanism — Unifying Them Eliminates an Entire Class of Consistency Bugs

**Category:** Atomicity

**One-liner:** When experiments use feature flags as the variant delivery mechanism, there is no gap between "what the experiment system thinks the user sees" and "what the product actually renders" — they are the same operation.

**Why it matters:** In a decoupled design, the experiment system assigns a variant and the feature flag system controls which features are shown. These two systems have separate evaluation paths, separate SDKs, and separate caches. A consistency bug occurs when the experiment system says a user is in treatment but the flag system serves the control configuration, due to a flag targeting rule conflict, SDK version mismatch, or cache race condition. These bugs are notoriously difficult to detect because they manifest as SRM (if the inconsistency is systematic) or as metric noise (if it's random), and diagnosing them requires correlating logs from two separate systems.

Unifying experiments and feature flags so that experiment variant assignment *is* feature flag evaluation eliminates this class of bugs by construction. The platform writes a flag override map into each variant configuration: `{ button_color: "green", cta_text: "Buy Now", checkout_flow: "streamlined" }`. The single SDK evaluates both the experiment assignment and the resulting flag values in one operation, with one hash function call and one cache lookup. The assignment log records the exact flag values the user received — not what the experiment system intended, but what was actually served. This also enables non-engineer stakeholders to create and configure experiments without any code changes, since experiments are expressed as flag configuration overrides rather than branching code paths. The organizational consequence is a 10–50× increase in experiment velocity as product managers, designers, and growth teams launch experiments independently.

---

## Insight 8: Guardrail Metrics With Automated Kill-Switches Transform Experimentation From a Risk Into a Safety Net

**Category:** Resilience

**One-liner:** Pre-defining degradation thresholds on core business metrics and wiring them to automated experiment termination makes shipping treatments safer than not experimenting at all.

**Why it matters:** A common organizational objection to aggressive experimentation is that bad treatments can harm users before analysts notice. This concern is legitimate but solvable. The guardrail metric system provides automated protection: any experiment that causes a statistically significant degradation on a pre-defined guardrail metric — page load time increases by > 5%, checkout completion drops by > 1%, crash rate spikes — is automatically stopped and all traffic returned to control. The detection and response happen in minutes, not hours, because the event pipeline and statistical engine run continuously.

The kill-switch is not a human decision — it is a threshold check on a continuously computed statistical test, operating at machine speed rather than human monitoring speed. The system can respond to a performance regression at 3 AM on a Sunday without requiring anyone to be awake. The organizational consequence is subtle but profound: teams become *more* willing to ship bold experiments because they trust the automated protection to catch regressions before they compound. Rather than running cautious 1% rollouts over two weeks while manually monitoring dashboards, teams can launch experiments at 20% exposure with confidence that any serious regression will be caught and reverted automatically within 15 minutes. The experimentation platform transforms from a measurement tool into a deployment safety mechanism — every new feature effectively ships through a controlled trial with automated rollback. This reframing is essential for building an organization-wide culture of evidence-driven product development.
