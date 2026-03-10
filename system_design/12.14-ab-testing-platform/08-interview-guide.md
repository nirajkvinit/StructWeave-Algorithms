# 08 — Interview Guide: A/B Testing Platform

## Overview

Designing an A/B testing platform is a favorite senior/staff interview topic because it combines:
- **Systems thinking:** distributed assignment, event pipelines, analytical data stores
- **Statistical literacy:** candidates who understand the difference between t-tests and sequential testing signal deep expertise
- **Product sense:** understanding why experimentation infrastructure matters to a product-led company
- **Trade-off reasoning:** assignment latency vs. freshness, statistical rigor vs. speed, isolation vs. throughput

A well-scoped 45-minute session should reach the statistical engine discussion — that's where the highest signal differentiation happens.

---

## 45-Minute Pacing Guide

### Phase 1: Requirements & Scoping (0–8 minutes)

Open by asking clarifying questions to define the scope. Interviewers expect candidates to surface ambiguities before diving in. Key questions:

- "What types of products will be experimented on? Web, mobile, backend APIs, or all?"
- "What is the expected scale — how many concurrent experiments, what DAU?"
- "Is this a greenfield platform or integrating with existing feature flag infrastructure?"
- "What statistical guarantees does the business need — fixed horizon, sequential, Bayesian?"
- "Do we need real-time dashboard updates or is a 15-minute lag acceptable?"

After clarifying, state your assumptions explicitly: "I'll assume 500M DAU, 10,000 concurrent experiments, real-time assignment on the critical path, and 15-minute metric refresh."

---

### Phase 2: High-Level Architecture (8–20 minutes)

Draw the system with these components:

1. **SDK / Edge Assignment Layer** — local evaluation, no round-trip
2. **Experiment Config Service** — experiment definitions, ruleset compiler
3. **Event Ingest Pipeline** — gateway, queue, processor, dedup
4. **Analytics Layer** — stream aggregator, batch aggregator, statistical engine
5. **Results Store + Dashboard**

Walk through two primary data flows:
- **Assignment flow:** User request → SDK local eval → variant config returned (sub-ms)
- **Event flow:** User action → SDK batch → event gateway → queue → dedup → aggregation → statistical analysis → dashboard

Key design decisions to state proactively:
- "Assignment is stateless and edge-computed to avoid latency on the critical path"
- "The event log is append-only, raw events are the source of truth — we can recompute any metric"
- "We use mutual exclusion layers to isolate concurrent experiments"

---

### Phase 3: Deep Dives (20–38 minutes)

Interviewers will probe 2–3 of these areas. Expect follow-up questions after each:

#### Deep Dive A: Deterministic Assignment

*Interviewer prompt: "How do you ensure the same user always sees the same variant?"*

Lead with: "We use a deterministic hash function. The bucket assignment for a user is `hash(entity_id + experiment_id + salt) mod 10,000`. Same inputs → same output, always. No database lookup, no session state."

Follow-up traps:
- "What if we want to run two experiments simultaneously — won't users in both be correlated?" → Answer: The experiment-specific salt and ID in the hash input ensure independence. Two experiments produce uncorrelated bucket assignments for the same user.
- "What if we increase traffic fraction mid-experiment?" → Answer: Dangerous — newly bucketed users contaminate the treatment cohort with users who've experienced the control. Warn and discourage; offer incremental ramp-up as a safer alternative.

#### Deep Dive B: Statistical Engine

*Interviewer prompt: "How do you handle analysts who want to peek at results before the experiment is done?"*

Lead with: "Classical t-tests are not valid for repeated testing — peeking inflates the false positive rate. We solve this with sequential testing using always-valid confidence sequences (mSPRT). These produce p-values that are mathematically valid at any sample size, removing the incentive to cheat."

Follow-up traps:
- "What about CUPED — what is it and why does it matter?" → Answer: CUPED reduces metric variance by using a pre-experiment covariate (e.g., a user's historical purchase rate) to partial out individual-level variation. Lower variance means smaller confidence intervals, which means faster time to significance (30–50% sample size reduction).
- "What is sample ratio mismatch and why is it catastrophic?" → Answer: SRM means the observed traffic split doesn't match the intended split. This breaks the independence between assignment and outcome — you can't make causal claims from a broken randomization. We detect it with a chi-squared test on actual vs. expected counts, run continuously.

#### Deep Dive C: Experiment Isolation

*Interviewer prompt: "How do you prevent two concurrent experiments from interfering with each other?"*

Lead with: "We use layered namespaces. Within a layer, each user appears in at most one experiment — the namespace hash ensures this. Experiments in different layers can coincide on the same user, which is fine for independent features but dangerous for correlated ones."

Follow-up traps:
- "What if you detect an interaction statistically after the experiments run?" → Answer: Run a 2×2 factorial analysis across the four user groups (A_ctrl ∩ B_ctrl, A_treat ∩ B_ctrl, A_ctrl ∩ B_treat, A_treat ∩ B_treat). The interaction term reveals whether the joint effect is larger or smaller than additive.

#### Deep Dive D: Event Pipeline at Scale

*Interviewer prompt: "How do you handle 500K events per second without losing any?"*

Lead with: "Three key properties: durability at every hop, idempotent deduplication, and backpressure-aware scaling. Events are ACK'd only after durable queue write. SDKs batch events and retry on failure. The dedup window (Bloom filter + exact hash map, 7-day TTL) handles SDK retry duplicates."

---

### Phase 4: Extensions and Trade-offs (38–45 minutes)

Reserve the final 7 minutes for extensions the interviewer raises. Common ones:

**Multi-armed bandits:**
"Instead of fixed allocation, Thompson Sampling adaptively allocates more traffic to the winning variant. We sample from each variant's posterior Beta distribution, compute which arm is best N times, and set traffic weights proportional to win probability. But bandits sacrifice statistical validity — we can't make unbiased causal estimates from adaptive allocation without correcting for the bias."

**Pricing experiment compliance:**
"Pricing experiments require special handling: we check that assignment is not correlated with protected attributes, we register the experiment in a compliance disclosure registry, and we apply 7-year retention to pricing experiment records."

**Warehouse-native architecture:**
"For enterprise customers whose data already lives in an analytical warehouse, we push experiment assignments to the warehouse and generate SQL for metric computation rather than exporting data. This eliminates data movement and uses the customer's existing compute."

---

## Trap Questions

| Trap Question | What the Interviewer Is Testing | Strong Answer |
|---|---|---|
| "Can't you just use random() to assign variants?" | Statistical literacy | No — random() is not deterministic. Same user gets different variants on repeat visits, making causal inference impossible. |
| "Why not store assignments in a database?" | Scalability thinking | At 500K assignments/sec, no relational DB sustains that write load. Hash-based assignment is O(1) and needs no storage. |
| "Why do you need a separate event log? Can't you query the analytics DB?" | Data architecture | The analytics DB stores pre-aggregated metrics. New metrics defined post-experiment start cannot be computed retroactively from aggregates. Raw event log enables any future metric computation. |
| "Is a p-value < 0.05 sufficient to ship?" | Statistical rigor | No — 0.05 is arbitrary. The platform enforces a pre-registered significance threshold and requires the experiment to have run long enough to detect the pre-registered MDE at the desired power. |
| "What's the difference between Bayesian and frequentist results?" | Statistical depth | Frequentist: "if the null were true, this data would occur < 5% of the time." Bayesian: "there is X% probability that treatment is better than control." Different interpretations; both have a place in the platform. |
| "How do you handle network effects?" | Domain expertise | If user A's behavior influences user B (social network, marketplace), standard A/B testing is invalid — treatments contaminate the control group. Solutions: graph cluster randomization (assign whole network clusters), geo-based randomization, or switchback experiments (time-based alternation). |

---

## Common Mistakes

1. **Conflating assignment with analysis:** Candidates describe a system where assignment is coupled to the analytics store (e.g., "look up the user's variant in the database"). This adds latency and a single point of failure.

2. **Forgetting SRM:** A complete system design must include data quality validation. Omitting SRM detection is a notable gap because it's the most common failure mode that invalidates real experiments.

3. **No mention of sequential testing:** Proposing a fixed-horizon design without addressing the peeking problem suggests unfamiliarity with operational realities of experimentation.

4. **Ignoring the pipeline in favor of the stats:** Candidates strong in statistics but weak in systems sometimes spend 30 minutes on CUPED and never design the event pipeline. The pipeline is where the scalability challenge lives.

5. **Proposing a centralized assignment service without the edge model:** Designing a service that all product requests query synchronously fails at the stated latency SLO and creates a hard single point of failure.

6. **Over-specifying database choice:** Naming specific commercial products rather than reasoning about data model requirements (append-only log → immutable object storage, key-value lookup → distributed cache, columnar aggregates → analytical columnar store) suggests memorization over understanding.

---

## Scoring Rubric

| Area | Meets Bar | Exceeds Bar |
|---|---|---|
| **Assignment design** | Proposes hash-based deterministic assignment | Discusses salt per experiment, independence of concurrent experiments, traffic fraction ramp-up risks |
| **Event pipeline** | Designs gateway + queue + processor | Discusses dedup strategy, exactly-once semantics, backpressure, late arrivals |
| **Statistical engine** | Knows t-test and confidence intervals | Discusses sequential testing, CUPED, SRM detection, Bayesian alternatives |
| **Isolation** | Mentions mutual exclusion | Designs layer system, discusses interaction detection, holdback groups |
| **Scalability** | Horizontal scaling of ingest | Edge-computed assignment, delta sync for rulesets, warehouse-native analysis |
| **Reliability** | Discusses fallback to control | Circuit breaker pattern, event durability guarantees, stale cache behavior |
| **Trade-offs** | States trade-offs when asked | Proactively surfaces trade-offs before being asked; quantifies them |

---

## Interviewer Testing Signals

Questions interviewers use to separate senior from staff-level candidates:

- **"Walk me through what happens when an experiment starts and the first 1000 users arrive."** — Tests operational thinking and the interaction between ruleset propagation and assignment logging.
- **"Your experiment has been running for 3 days and SRM is detected. What do you do?"** — Tests incident response thinking and understanding of what SRM means for causal validity.
- **"The analysis shows p=0.04 after 2 days. The pre-registered run time is 14 days. Do you ship?"** — Tests resistance to peeking and understanding of sequential testing.
- **"How would you design this to support geo-based holdouts?"** — Tests extensibility thinking; geo holdouts require a different randomization unit (geography, not user).
- **"What's the difference between a guardrail metric and a primary metric in your design?"** — Tests metric taxonomy understanding; guardrails are automated kill-switches, not decision criteria.
