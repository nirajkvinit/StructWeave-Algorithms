# 12.14 A/B Testing Platform

## System Overview

An A/B testing platform is the backbone of data-driven product development: a distributed system that randomly assigns users to experimental variants, instruments every meaningful user action, and runs rigorous statistical analysis to determine whether observed differences reflect genuine causal effects or sampling noise. At internet scale this means handling billions of experiment assignments per day with sub-millisecond latency (since assignment sits on the critical path of every page render), ingesting hundreds of millions of telemetry events per hour into a streaming pipeline, and maintaining a statistical engine that supports frequentist sequential testing, Bayesian inference, and variance-reduction techniques such as CUPED—all while enforcing experiment isolation so that concurrent tests do not contaminate each other's results. The hard problems are not in the statistics themselves but in the operational realities: guaranteeing sticky assignment (same user always sees the same variant), detecting sample ratio mismatch (SRM) before it invalidates a test, scaling event ingestion without data loss, and giving analysts confidence that the numbers they see reflect reality and not a pipeline artifact. A mature A/B testing platform becomes an institutional multiplier: organizations running hundreds of concurrent experiments routinely make better product decisions than those running a handful, but only when the platform provides the statistical safeguards that prevent the false positives and false negatives that would otherwise undermine trust in experimental results.

---

## Key Characteristics

| Characteristic | Description |
|---|---|
| **Architecture Style** | Event-driven pipeline + real-time assignment service + asynchronous batch/streaming analytics |
| **Core Abstraction** | Experiment — a named trial that maps user buckets to variant configurations via deterministic hashing |
| **Assignment Model** | Stateless, deterministic: `hash(entity_id ‖ experiment_id ‖ salt) mod 10 000` → bucket → variant |
| **Consistency Guarantee** | Sticky assignment — a given entity always resolves to the same variant for the lifetime of an experiment |
| **Processing Model** | Write-heavy event ingest (append-only), read-heavy assignment (cache-first, edge-computed) |
| **Statistical Engine** | Frequentist z/t/chi-squared + sequential (always-valid p-values) + Bayesian (Beta-Binomial, Thompson Sampling) + CUPED variance reduction |
| **Isolation Mechanism** | Mutual-exclusion layers and namespace partitioning prevent concurrent experiments from contaminating each other |
| **Scalability Target** | 10 000+ concurrent experiments, 1M+ assignments/sec, 500M+ events/day |
| **Latency Budget** | Assignment: < 5 ms p99; event ingest ACK: < 50 ms p99; metric refresh: < 15 minutes |
| **Failure Mode** | On assignment-service failure, fall back to control (variant 0) to preserve baseline experience |

---

## Quick Navigation

| Document | Focus Area |
|---|---|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity model, SLOs |
| [02 - High-Level Design](./02-high-level-design.md) | System architecture, key design decisions, primary data flows |
| [03 - Low-Level Design](./03-low-level-design.md) | Data models, API contracts, core algorithms (assignment, CUPED, SRM) |
| [04 - Deep Dives & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Assignment engine, stats engine, event pipeline, interaction detection |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Edge assignment, event ingestion scaling, analysis parallelism, circuit breakers |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Experiment integrity, PII in events, audit trail, pricing-experiment regulations |
| [07 - Observability](./07-observability.md) | Experiment health metrics, SRM detection, data-quality monitoring, dashboards |
| [08 - Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, common mistakes, scoring rubric |
| [09 - Insights](./09-insights.md) | 8 key architectural insights |

---

## What Differentiates This System

| Dimension | Naive A/B Test | Production A/B Testing Platform |
|---|---|---|
| **Assignment** | Random coin flip at request time; user may see different variants on each visit | Deterministic hash of entity ID — guaranteed sticky across sessions, devices, and servers |
| **Concurrency** | One test at a time to avoid interference | Mutual-exclusion layers + namespace partitioning support 10 000+ simultaneous experiments |
| **Statistics** | Wait for fixed sample size, run t-test once | Sequential testing with always-valid p-values; safe early stopping; CUPED variance reduction |
| **Event pipeline** | Log to a file, batch-load to a spreadsheet | Streaming ingest → real-time aggregation → analytical store with exactly-once semantics |
| **SRM detection** | Manual check after the fact | Automated chi-squared SRM check runs continuously; experiment auto-pauses on mismatch |
| **Guardrails** | Analyst monitors manually | Automated kill-switches fire when degradation on guardrail metrics exceeds threshold |
| **Segment analysis** | Overall averages only | Heterogeneous treatment effects computed per dimension (country, platform, cohort) |
| **Bandit support** | Not supported | Adaptive allocation via Thompson Sampling or UCB; traffic shifts to winning arm in real time |

---

## What Makes This System Unique

### 1. Assignment Is a Hard Real-Time Constraint

Unlike most analytical systems, experiment assignment is synchronous and sits on the critical path of product request serving. A user navigating to a product page must be assigned to a variant before the page can render — this means the assignment service competes with DNS resolution and TLS handshake for latency budget. The solution is to push assignment computation to the edge: SDKs embed a compact experiment ruleset (downloaded once and cached locally), perform the hash locally without a network round-trip, and only phone home for ruleset refreshes. This architecture achieves sub-millisecond assignment while tolerating assignment-service outages gracefully. The key insight is that assignment is a pure mathematical function of the entity ID and experiment configuration — no I/O is required, and the only dependency is that the SDK has the current ruleset. Ruleset propagation latency (30–60 seconds for a configuration change to reach all SDK instances) is an acceptable trade-off for the elimination of network dependency on the hot path.

### 2. Statistical Correctness Is Non-Negotiable and Surprisingly Hard to Preserve

A production experimentation platform must prevent a long list of subtle statistical errors: peeking (repeatedly checking p-values until significance is reached), novelty effects (users behaving differently because something is new, not because it's better), network effects (users influencing each other, violating the Stable Unit Treatment Value Assumption), Simpson's-paradox distortions (segment composition differences masking or reversing apparent effects), and survivorship bias in retention metrics. These are not theoretical concerns — they routinely invalidate real experiments at scale. The platform must enforce safeguards procedurally (sequential testing, pre-registered metrics, mandatory minimum run durations) and detect violations automatically (SRM checks, data-quality monitors, novelty-effect flags on day-1 vs. day-7 metrics). Statistical rigor is not a constraint on experimentation velocity — it is the foundation that makes experimental results trustworthy enough to base product decisions on.

### 3. The Experiment Is Both a Product and Infrastructure Primitive

Modern experimentation platforms blur the line between feature flags and controlled experiments. A feature flag controls rollout percentage and targeting; an A/B experiment adds statistical measurement on top of the same delivery mechanism. This unification is architecturally important: it means experiments can be defined declaratively (no code deploy required), toggled remotely, and evolved without disruption. The flag-as-experiment model also enables holdback groups (a percentage permanently assigned to control to measure long-term effects), gradual ramp-up patterns that reduce blast radius when shipping to production, and seamless transition from an experiment to a full rollout — the experiment simply changes from a 50/50 split to a 100% treatment allocation without any SDK or product change. Non-engineering stakeholders (product managers, growth marketers) can configure and launch experiments through a UI, which dramatically accelerates experimentation velocity across an organization.

### 4. Data Freshness vs. Statistical Validity Tension

Analysts want results *now*; statisticians want to wait for the pre-calculated sample size. Sequential testing with always-valid confidence sequences resolves this tension mathematically: the platform can publish continuously updating p-values that remain valid regardless of when the analyst looks, without inflating Type I error. CUPED variance reduction complements this by shrinking confidence intervals using pre-experiment covariates, which can cut required sample size by 30–50%, allowing experiments to reach significance days earlier. Together these techniques let teams make faster decisions without compromising statistical rigor. The dual-path metric computation (streaming for freshness, batch for accuracy) ensures that analysts always see the latest available data while the platform internally uses the more accurate batch computation for decision support.

### 5. Experiment Infrastructure as a Competitive Moat

Organizations with mature experimentation infrastructure can run 100+ experiments simultaneously and ship evidence-based improvements at a rate that organizations without such infrastructure simply cannot match. The A/B testing platform is not a tool for individual experiments — it is the substrate on which a data-driven product development culture is built. This means the platform itself must be highly reliable (analysts lose trust in it after a single data quality incident that goes undetected), highly usable (if experiments are hard to set up, teams won't run them), and authoritative (when the platform says a result is significant, teams must trust that it means what it says). Investing in statistical rigor, observability, and experiment isolation pays compounding returns as the organization's experimentation culture matures.
