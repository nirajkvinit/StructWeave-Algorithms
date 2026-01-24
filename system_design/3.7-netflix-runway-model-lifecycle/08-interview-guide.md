# Interview Guide

## Interview Pacing (45-minute format)

| Time | Phase | Focus | Key Actions |
|------|-------|-------|-------------|
| 0-5 min | **Clarify** | Understand scope, constraints | Ask about scale, existing infra, priorities |
| 5-15 min | **High-Level** | Core architecture | Registry, dependency graph, staleness detection |
| 15-30 min | **Deep Dive** | Critical components | Choose: Ground truth OR Staleness detection |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failures | Discuss limitations, alternatives |
| 40-45 min | **Wrap Up** | Extensions, Q&A | Summarize, handle follow-ups |

---

## Phase 1: Clarification (0-5 min)

### Questions to Ask the Interviewer

**Scope Questions:**
- "What aspects of model lifecycle are we managing? Training, deployment, monitoring, retirement?"
- "Are we focusing on staleness detection, auto-retraining, or both?"
- "Is this for ML models specifically, or general software artifacts?"

**Scale Questions:**
- "How many models are we managing? Hundreds? Thousands?"
- "What's the prediction volume? Millions or billions per day?"
- "Are these models independent or do they have dependencies?"

**Constraint Questions:**
- "Is there an existing workflow orchestrator like Airflow or our own scheduler?"
- "Do we have a feature store that tracks feature distributions?"
- "What's the acceptable staleness detection latency?"

### Example Clarification Dialogue

```
Interviewer: "Design a system to manage the lifecycle of ML models at scale."

You: "Before I dive in, let me clarify a few things:

1. What lifecycle events are we managing? The full spectrum from
   registration through retirement, or a specific phase?

2. What's the primary goal? Reducing model staleness? Ensuring compliance?
   Optimizing retraining costs?

3. How many models and what's their relationship? Are they independent
   or do some models consume outputs from other models?

4. Is there existing infrastructure I should integrate with, like a
   workflow scheduler or feature store?"

Interviewer: "Good questions. Focus on:
- Staleness detection and automatic retraining
- About 500 models, some with dependencies
- Models drive personalization, so freshness is critical
- We have Metaflow for workflows and a basic feature store"

You: "Perfect. So I'll design around three core challenges:
1. How to detect when a model becomes stale
2. How to discover and manage model dependencies
3. How to coordinate retraining without human intervention

Let me start with the high-level architecture..."
```

---

## Phase 2: High-Level Design (5-15 min)

### Core Components to Cover

**1. Model Registry**
- Central catalog of all models with metadata
- Versioning and deployment status
- Policy configuration (staleness, retraining)

**2. Dependency Graph**
- Track model-to-model, model-to-feature, model-to-data relationships
- Enable impact analysis ("what breaks if this changes?")
- Auto-discover from workflow lineage

**3. Staleness Detection**
- Multi-signal approach: age, data drift, concept drift, performance
- Configurable policies per model
- Weighted fusion of signals

**4. Ground Truth Collection**
- Match predictions to outcomes
- Handle delayed labels
- Calculate actual model performance

**5. Retraining Orchestration**
- Trigger retraining based on staleness
- Prevent cascading retrains
- Integration with workflow scheduler

### Sample High-Level Walkthrough

```
"At the highest level, the system has five core components:

[Draw on whiteboard]

1. MODEL REGISTRY - This is the source of truth for all models.
   It stores metadata, current version, and health policies.

2. DEPENDENCY GRAPH - A graph database that tracks relationships
   between models. If Model A uses embeddings from Model B, we
   capture that dependency. This enables impact analysis.

3. STALENESS DETECTOR - Runs periodically to evaluate each model's
   health using multiple signals: how old is it, has the input
   distribution shifted, has performance degraded?

4. GROUND TRUTH PIPELINE - Joins predictions with actual outcomes
   to measure real performance. This is tricky because outcomes
   can arrive hours or days after predictions.

5. RETRAIN ORCHESTRATOR - When staleness is detected, this
   component decides whether to trigger retraining, coordinates
   with the workflow scheduler, and prevents cascading retrains.

The data flow is:
- Metaflow workflows register models and emit lineage
- Prediction logs and user events feed ground truth collection
- Staleness detector queries the registry, graph, and ground truth
- When stale, it triggers the retrain orchestrator
- Retrain orchestrator submits jobs to Metaflow via the scheduler"
```

---

## Phase 3: Deep Dive (15-30 min)

### Option A: Staleness Detection Deep Dive

**Key Points to Cover:**

1. **Signal Types**
   - Age: Days since last retrain (simple but incomplete)
   - Data drift (PSI): Input feature distribution shift
   - Concept drift (KL): Output distribution shift
   - Performance drop: Actual metric degradation vs baseline

2. **PSI Algorithm**
   ```
   "PSI measures distribution shift between training and production.
   We bin the data, calculate percentage in each bin, then compute:
   PSI = Σ (current% - training%) × ln(current% / training%)

   PSI < 0.1: No significant shift
   PSI 0.1-0.25: Moderate shift, monitor
   PSI > 0.25: Significant shift, investigate"
   ```

3. **Signal Fusion**
   ```
   "Each model has a staleness policy with weighted signals:

   staleness_score =
     w_age × age_signal +
     w_drift × data_drift_signal +
     w_concept × concept_drift_signal +
     w_perf × performance_signal

   If staleness_score > threshold, model is stale.

   The weights let teams tune sensitivity. A model with good
   ground truth can weight performance heavily. A model without
   ground truth relies more on drift signals."
   ```

4. **Handling Missing Signals**
   ```
   "Not all signals are always available. If we can't get
   performance data, we don't include it in the calculation
   but we also lower our confidence in the staleness decision.
   This is surfaced to users: 'Model appears healthy, but
   confidence is medium due to missing ground truth.'"
   ```

### Option B: Ground Truth Deep Dive

**Key Points to Cover:**

1. **The Delayed Label Problem**
   ```
   "The core challenge is that we make predictions now but
   outcomes arrive later. A recommendation made at noon might
   result in a watch event at midnight, or never.

   We need to handle:
   - Short delays (clicks, minutes)
   - Medium delays (watches, hours)
   - Long delays (subscription churn, weeks)"
   ```

2. **Lambda Architecture**
   ```
   "We use a lambda architecture:

   Speed Layer: Streaming join with 1-hour window
   - Gives fast feedback (within hours)
   - May miss late arrivals
   - Stored in Redis with 24-hour TTL

   Batch Layer: Daily join with 7-day window
   - Handles late arrivals
   - More accurate
   - Stored in S3/HDFS

   Serving Layer: Merges both views
   - Uses batch when available
   - Falls back to speed for recent data"
   ```

3. **Join Strategy**
   ```
   "We join on prediction_id, which we embed in both the
   prediction log and outcome events. The tricky part is
   outcomes that arrive before predictions (network reordering)
   or outcomes without predictions (logging gaps).

   We maintain bidirectional buffers:
   - If prediction arrives, check for pending outcome
   - If outcome arrives, check for prediction, else buffer briefly"
   ```

4. **Coverage Tracking**
   ```
   "We track ground truth coverage as a metric:
   coverage = predictions_with_outcomes / total_predictions

   Low coverage (<80%) means we can't trust performance metrics.
   We alert teams when coverage drops and investigate logging issues."
   ```

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Key Trade-off Discussions

| Trade-off | Option A | Option B | Recommendation |
|-----------|----------|----------|----------------|
| **Dependency Discovery** | Manual declaration | Auto-discover from lineage | **Hybrid**: Auto-discover + manual override |
| **Staleness Signals** | Single metric (age) | Multi-signal fusion | **Multi-signal**: More accurate, handles edge cases |
| **Ground Truth** | Exact labels only | Allow imputed/proxy labels | **Both**: Exact when available, proxy for delayed |
| **Retraining Trigger** | Threshold-based | Policy engine with rules | **Policy-based**: More flexible, handles nuance |
| **Graph Storage** | Relational (PostgreSQL) | Graph DB (Neo4j) | **Graph DB**: Natural fit for traversal queries |

### Bottleneck Discussion

```
Interviewer: "What are the main bottlenecks?"

You: "Three main bottlenecks:

1. GROUND TRUTH JOIN LAG
   - Problem: High prediction volume (10B/day) creates join backlog
   - Mitigation: Sample predictions (1-5%), parallel consumers,
     prioritize Tier 1 models

2. DEPENDENCY GRAPH QUERIES
   - Problem: Deep traversal for impact analysis can be slow
   - Mitigation: Materialized views for common queries, depth
     limits (3-5 hops), aggressive caching

3. STALENESS COMPUTATION
   - Problem: PSI calculation over many features is expensive
   - Mitigation: Pre-aggregate feature distributions hourly,
     sample features, parallel evaluation across models"
```

### Failure Scenario Discussion

```
Interviewer: "What if Maestro (the scheduler) is unavailable?"

You: "Good question. We use a circuit breaker pattern:

1. When Maestro calls start failing, circuit opens after 5 failures
2. While open, we queue retrain requests locally (not lost)
3. Alert on-call that circuit is open
4. Periodically test Maestro with probe requests
5. When Maestro recovers, circuit closes and we drain the queue

We also have a manual fallback: operators can trigger retrains
directly through Metaflow if the automated path is down.

For Tier 1 models, we might have stricter monitoring - if we
can't retrain them for more than 4 hours, we page regardless."
```

---

## Phase 5: Wrap Up (40-45 min)

### Summary Structure

```
"Let me summarize the key points:

ARCHITECTURE:
- Model Registry for metadata and policies
- Graph database for dependencies
- Lambda architecture for ground truth
- Multi-signal staleness detection
- Maestro integration for retraining

KEY ALGORITHMS:
- PSI for data drift detection
- Weighted signal fusion for staleness scoring
- BFS for dependency impact analysis

SCALE HANDLING:
- Horizontal scaling for most components
- Kafka partitioning for ground truth
- Tiered evaluation frequency by model importance

RELIABILITY:
- Circuit breakers for external dependencies
- Queue-based retrain coordination
- Graceful degradation when signals unavailable

Anything specific you'd like me to elaborate on?"
```

### Potential Follow-up Questions

| Question | Good Answer |
|----------|-------------|
| "How would you handle 10x scale?" | "Add Kafka partitions, more consumers, consider sampling strategies" |
| "What about multi-region?" | "Active-passive with async replication, single leader for consistency" |
| "How do you handle model rollback?" | "Keep previous version metadata, instant switch in registry, A/B for validation" |
| "What if two teams disagree on dependencies?" | "Manual override capability, audit logging, governance process" |

---

## Trap Questions & Answers

### Trap 1: "Why not just retrain on a fixed schedule?"

**What Interviewer Wants:** Understanding that one-size-fits-all doesn't work.

**Good Answer:**
```
"Fixed schedules have two problems:

1. WASTE: A stable model might be retrained unnecessarily. If the
   model is healthy and data hasn't changed, why spend GPU hours?

2. TOO SLOW: A rapidly drifting model might need retraining sooner.
   Waiting for the weekly schedule while the model degrades hurts
   user experience.

Signal-based triggers retrain when needed, not when scheduled. But
we do keep scheduled retraining as a backstop - if a model hasn't
been retrained in 30 days regardless of signals, we trigger a
refresh for freshness and to catch any undetected drift."
```

### Trap 2: "What about models without ground truth?"

**What Interviewer Wants:** Awareness that not all models have easy labels.

**Good Answer:**
```
"This is common. Three strategies:

1. PROXY METRICS: Use correlated business metrics. For a ranker,
   use click-through rate as a proxy for ranking quality.

2. DRIFT-ONLY STALENESS: Rely heavily on data drift (PSI) and
   age signals. We can detect when inputs shift even without
   measuring output quality.

3. DOWNSTREAM MONITORING: If this model's output feeds another
   model that DOES have ground truth, a drop in the downstream
   model might indicate upstream staleness.

We surface the confidence level: 'Model appears healthy but
confidence is LOW due to missing ground truth. Consider adding
proxy metrics.'"
```

### Trap 3: "What if retraining makes the model worse?"

**What Interviewer Wants:** Understanding of validation and rollback.

**Good Answer:**
```
"Every retrain goes through validation before deployment:

1. OFFLINE VALIDATION: Compare new model metrics (accuracy, AUC)
   against the current production model on a holdout set.

2. CANARY DEPLOYMENT: Deploy to 5% of traffic first. Monitor
   business metrics (engagement, conversion) for anomalies.

3. AUTOMATIC ROLLBACK: If canary metrics drop below threshold
   (e.g., 3% engagement drop), automatically rollback to the
   previous version and alert the team.

4. GRADUAL ROLLOUT: If canary succeeds, increase to 20%, then
   50%, then 100% over several hours.

For Tier 1 models, we add human approval gates at key stages."
```

### Trap 4: "How do you prevent cascading retrains?"

**What Interviewer Wants:** Understanding of dependency management.

**Good Answer:**
```
"When an upstream model retrains, all downstream models technically
become 'stale' - their inputs changed. But retraining everything
simultaneously is wasteful and creates resource contention.

We handle this with:

1. CASCADE COOLDOWN: After an upstream model retrains, we wait
   (e.g., 4 hours) before evaluating downstream staleness. This
   lets the new model stabilize.

2. CONCURRENT LIMITS: Max 50 concurrent retraining jobs across
   the system, with per-team limits.

3. PRIORITY QUEUE: Tier 1 models retrain first. If the queue is
   full, lower-tier models wait.

4. IMPACT-AWARE SCHEDULING: If Model A's retrain would trigger
   20 downstream retrains, we might schedule it for off-peak
   hours or batch the downstream retrains."
```

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| Jumping to database choice | Premature, misses requirements | Start with data model, then choose storage |
| Single staleness metric | Over-simplifies, misses nuance | Multi-signal with configurable weights |
| Ignoring delayed labels | Ground truth useless without handling delays | Lambda architecture, attribution windows |
| No dependency tracking | Can't do impact analysis, misses cascades | Graph-based dependencies |
| Manual-only retraining | Doesn't scale, human bottleneck | Policy-based automation with manual override |
| Same treatment for all models | Tier 1 needs different SLAs than Tier 4 | Tiered policies and monitoring |
| Ignoring false positives | Alert fatigue from noisy staleness detection | Statistical significance, cooldowns |

---

## Netflix-Specific Context

If interviewing at Netflix or discussing Netflix specifically:

```
"At Netflix, Runway fits into a broader ML ecosystem:

- METAFLOW: Open-source workflow framework we'd use for training
  pipelines. Runway extracts lineage from Metaflow runs.

- MAESTRO: Netflix's workflow orchestrator (100K+ workflows).
  Runway triggers retrains through Maestro.

- AXION: Netflix's fact store that eliminates training-serving
  skew. We'd query Axion for feature distributions.

- TITUS: Netflix's container platform. Retrained models deploy
  to Titus for serving.

- FOUNDATION MODEL: Netflix recently moved to a unified
  foundation model for personalization. Runway would track
  embedding stability across retrains.

The key insight is that Runway isn't a replacement for these
systems - it's an orchestration layer that uses them while
focusing specifically on model health and freshness."
```

---

## Quick Reference Card

```
+-----------------------------------------------------------------------+
|          RUNWAY INTERVIEW - QUICK REFERENCE                            |
+-----------------------------------------------------------------------+
|                                                                        |
|  CORE COMPONENTS (5)        STALENESS SIGNALS (4)                      |
|  -------------------        -------------------                        |
|  1. Model Registry          1. Age (days since retrain)                |
|  2. Dependency Graph        2. Data Drift (PSI)                        |
|  3. Staleness Detector      3. Concept Drift (KL)                      |
|  4. Ground Truth Pipeline   4. Performance Drop                        |
|  5. Retrain Orchestrator                                               |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  KEY ALGORITHMS             KEY NUMBERS                                |
|  --------------             -----------                                |
|  PSI: distribution shift    500 models, 5K edges                       |
|  KL: concept drift          10B predictions/day                        |
|  BFS: dependency traversal  <1 hour staleness detection               |
|  Lambda: ground truth join  <24 hour ground truth join                |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  TRADE-OFFS TO MENTION                                                 |
|  ---------------------                                                 |
|  * Single vs multi-signal staleness -> Multi (more accurate)           |
|  * Manual vs auto dependencies -> Hybrid (auto + override)             |
|  * Threshold vs policy triggers -> Policy (more flexible)              |
|  * Graph DB vs relational -> Graph (natural fit for traversal)         |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  TRAP QUESTION KEYWORDS                                                |
|  ----------------------                                                |
|  "Just schedule?" -> Waste vs too slow, signal-based is smarter        |
|  "No ground truth?" -> Proxy metrics, drift-only, downstream monitor   |
|  "Retrain makes worse?" -> Validation, canary, rollback               |
|  "Cascading retrains?" -> Cooldown, limits, priority queue            |
|                                                                        |
+-----------------------------------------------------------------------+
```

---

## References for Further Study

- [Runway - USENIX OpML '20](https://www.usenix.org/conference/opml20/presentation/cepoi) - Original presentation
- [ML Observability at Netflix](https://netflixtechblog.com/ml-observability-bring-transparency-to-payments-and-beyond-33073e260a38) - Monitoring practices
- [Maestro: Netflix's Workflow Orchestrator](https://netflixtechblog.com/maestro-netflixs-workflow-orchestrator-ee13a06f9c78) - Scheduling integration
- [Model Monitoring Guide](https://neptune.ai/blog/how-to-monitor-your-models-in-production-guide) - General practices
- [Data Drift Detection](https://www.evidentlyai.com/ml-in-production/data-drift) - PSI, KL divergence
