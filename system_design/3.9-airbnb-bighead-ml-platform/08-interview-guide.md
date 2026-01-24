# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Key Deliverables |
|------|-------|-------|------------------|
| **0-5 min** | Clarify | Scope, scale, constraints | Clear understanding of requirements |
| **5-15 min** | High-Level | 5-layer architecture, data flow | Architecture diagram, component overview |
| **15-30 min** | Deep Dive | Zipline OR Deep Thought (pick one) | Detailed design of critical component |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failures, consistency | Trade-off analysis, failure handling |
| **40-45 min** | Wrap Up | Summary, extensions | Concise summary, future improvements |

---

## Meta-Commentary: What Makes BigHead Unique

### Key Challenges (What Interviewers Look For)

| Challenge | Why It Matters | BigHead's Solution |
|-----------|----------------|-------------------|
| **Train-Serve Consistency** | #1 cause of ML production bugs | Declarative DSL compiles to both batch and streaming |
| **Point-in-Time Correctness** | Prevents data leakage in training | Temporal joins with as-of semantics |
| **Developer Productivity** | ML iteration speed = competitive advantage | ML Automator auto-generates DAGs |
| **Multi-Framework Serving** | Teams use different ML frameworks | Kubernetes-native containerization |
| **Feature Freshness** | Real-time features for ranking/pricing | Lambda architecture (batch + streaming) |

### What BigHead Does Differently

```
TRADITIONAL ML PLATFORMS:
    Training Code → Model → Serving Code → Production
    (Different feature computation in training vs serving = BUGS)

BIGHEAD APPROACH:
    Declarative Feature DSL → Batch Plan + Streaming Plan → Unified Serving
    (Same definition, different execution = CONSISTENCY)

KEY INSIGHT:
    The declarative DSL is the "single source of truth"
    It compiles to Spark SQL for batch (training data)
    It compiles to Flink operators for streaming (serving)
    Same semantics, different execution engines
```

### Where to Spend Most Time

| If Interviewer Focuses On... | Deep Dive On... |
|-----------------------------|-----------------|
| **Data consistency** | Zipline DSL, train-serve consistency, point-in-time joins |
| **Low latency serving** | Deep Thought, feature caching, latency breakdown |
| **Developer experience** | ML Automator, DAG generation, Redspot notebooks |
| **Scale** | 30K features, caching strategy, partitioning |
| **Reliability** | Circuit breakers, graceful degradation, disaster recovery |

---

## Questions to Ask Interviewer

### Scope Questions

```
1. "Are we designing the full ML platform or a specific component
    (feature store, serving, orchestration)?"

2. "What's the expected scale - number of features, models, predictions?"

3. "Which part of the ML lifecycle should we focus on -
    feature engineering, training, or serving?"

4. "Should we support multiple ML frameworks (TensorFlow, PyTorch)
    or is single-framework acceptable?"
```

### Constraint Questions

```
5. "What's the latency requirement for predictions? Sub-10ms, sub-100ms?"

6. "Is train-serve consistency a hard requirement?"

7. "Do we need real-time features (streaming) or is batch (daily) sufficient?"

8. "Any compliance requirements (GDPR, PII handling)?"

9. "Existing infrastructure to integrate with (Kafka, Kubernetes, etc.)?"
```

---

## Trade-offs Discussion

### Trade-off 1: Feature Definition Approach

| Decision | Declarative DSL | Imperative Code |
|----------|----------------|-----------------|
| **Pros** | Single source of truth, train-serve consistency, optimization opportunities | Flexible, familiar to developers, full expressiveness |
| **Cons** | Learning curve, limited to supported aggregations | Consistency bugs, duplicate logic, maintenance burden |
| **When to Choose** | Large teams, production ML at scale | Small teams, prototyping, unique requirements |
| **BigHead Choice** | **Declarative DSL** (Zipline) - The #1 ML bug is train-serve skew |

**Interview Talking Point:**
> "The key insight is that most ML production bugs come from features computed differently in training vs serving. A declarative DSL eliminates this entire class of bugs by being the single source of truth that compiles to different execution engines."

### Trade-off 2: Feature Freshness Architecture

| Decision | Lambda (Batch + Stream) | Kappa (Stream Only) |
|----------|------------------------|---------------------|
| **Pros** | Historical accuracy guaranteed, clear separation | Single codebase, simpler operations |
| **Cons** | Two code paths, sync complexity | Late data handling complex, expensive reprocessing |
| **When to Choose** | Point-in-time correctness critical | Near-real-time acceptable, simpler use cases |
| **BigHead Choice** | **Lambda** - Training requires exact historical features |

**Interview Talking Point:**
> "We need Lambda architecture because training models on features 'as they are now' rather than 'as they were when the event happened' causes data leakage. The batch path guarantees point-in-time correctness for training."

### Trade-off 3: DAG Management

| Decision | Auto-Generated | Manual Definition |
|----------|---------------|-------------------|
| **Pros** | Reduced boilerplate, enforced patterns, faster iteration | Full control, explicit dependencies, easier debugging |
| **Cons** | Less flexibility, debugging requires understanding generator | Inconsistent across teams, error-prone |
| **When to Choose** | Large organizations, standardization important | Small teams, unique workflow requirements |
| **BigHead Choice** | **Auto-generated** (ML Automator) - 80% reduction in boilerplate |

**Interview Talking Point:**
> "ML Automator dramatically reduces pipeline code while enforcing best practices across all teams. The trade-off is some debugging complexity, but the productivity gains and consistency outweigh this."

### Trade-off 4: Model Serving Infrastructure

| Decision | Kubernetes-Native | Custom ML Platform |
|----------|-------------------|-------------------|
| **Pros** | Container isolation, ecosystem tooling, auto-scaling, team familiarity | Optimized for ML workloads, lower overhead, custom features |
| **Cons** | Complexity, K8s operational burden, not ML-optimized | Maintenance cost, limited ecosystem, staffing challenges |
| **When to Choose** | General-purpose, leveraging existing K8s investment | Specialized requirements, dedicated ML infra team |
| **BigHead Choice** | **Kubernetes-native** (Deep Thought) - Leverage ecosystem |

**Interview Talking Point:**
> "Deep Thought runs on Kubernetes to leverage existing ecosystem for scaling, health checks, and deployment. The team focuses on ML-specific optimizations like feature integration rather than reinventing infrastructure."

---

## Trap Questions and How to Handle

### Trap 1: "Why not just compute features in the model code?"

**What Interviewer Wants:** Test understanding of train-serve consistency

**Bad Answer:** "That's simpler and works fine."

**Good Answer:**
> "That's actually the classic ML anti-pattern. When features are computed inline in model code, training and serving compute them differently - training uses historical data in Hive, serving uses real-time data with different transformations.
>
> This causes 'train-serve skew' - the #1 cause of ML production bugs. Models appear to work in evaluation but degrade in production because they see different feature distributions.
>
> BigHead's declarative DSL solves this by being the single source of truth that compiles to both batch and streaming execution, guaranteeing consistency."

### Trap 2: "How do you handle point-in-time correctness at scale?"

**What Interviewer Wants:** Technical depth on temporal joins

**Bad Answer:** "Just join on user_id and filter by date."

**Good Answer:**
> "Point-in-time joins are computationally expensive because for each training event, we need features 'as they were' at that timestamp - not current values.
>
> The naive approach is a cross join filtered by timestamp, which explodes at scale. BigHead optimizes this:
>
> 1. **Partition pruning** - Features partitioned by date, only scan relevant partitions
> 2. **Window functions** - Use ROW_NUMBER() to find latest feature before event time
> 3. **Incremental backfills** - Only compute changed features, merge with existing
> 4. **Bucketing** - Co-locate entities to avoid shuffles
>
> This gets us from hours to minutes for typical backfills."

### Trap 3: "What if the feature store goes down during peak traffic?"

**What Interviewer Wants:** Test failure handling and graceful degradation

**Bad Answer:** "We need 100% uptime."

**Good Answer:**
> "We design for graceful degradation, not perfect uptime. When the feature store has issues:
>
> 1. **Circuit breaker** activates after 5 failures in 10 seconds
> 2. **Fall back to default feature values** - global medians or safe defaults
> 3. **Use cached features** from L1/L2 cache even if slightly stale
> 4. **Some models can run with partial features** - only required features trigger failure
>
> The key insight is that 'slightly degraded predictions' are far better than 'no predictions at all' for a business like search or pricing."

### Trap 4: "Why automatic DAG generation instead of just writing Airflow?"

**What Interviewer Wants:** Test understanding of developer experience trade-offs

**Bad Answer:** "Automation is always better."

**Good Answer:**
> "Manual Airflow DAGs work for small teams but don't scale. At Airbnb's scale with 100+ teams building ML, we saw:
>
> 1. **Inconsistent patterns** - Each team's DAGs structured differently
> 2. **80% boilerplate** - Same retry logic, monitoring, alerting repeated
> 3. **Error-prone** - Manual dependencies often wrong
> 4. **Hard to maintain** - Changes require updating many places
>
> ML Automator trades some flexibility for massive productivity gains. Teams describe their pipeline in Python with decorators, and the system handles the rest.
>
> The trade-off is debugging is harder - you need to understand the generator. But most teams never need to look inside it."

### Trap 5: "How would you handle 10x scale?"

**What Interviewer Wants:** Forward-thinking, not just "add more servers"

**Bad Answer:** "Add more nodes."

**Good Answer:**
> "10x scale requires architectural changes, not just horizontal scaling:
>
> **Feature Store:**
> - Namespace sharding - partition by team/domain
> - Tiered storage - hot features in memory, cold on disk
> - Feature versioning - only compute what's actually used
>
> **Serving:**
> - Multi-cluster deployment - regional serving
> - Model-specific scaling - critical models get more resources
> - Feature caching by popularity - cache hot entity features
>
> **Orchestration:**
> - Priority queuing - critical pipelines first
> - Resource pools - isolated capacity per tier
> - Incremental processing - only changed data
>
> We also need to revisit SLOs - at 10x, some features might need relaxed freshness."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| **Ignoring train-serve consistency** | #1 ML production bug | Design feature store first, make DSL single source of truth |
| **Computing features inline** | Different code paths = different values | Declarative definitions compiled to both environments |
| **Single consistency model** | Training needs strong, serving needs availability | CP for offline store, AP for online store |
| **Ignoring point-in-time** | Data leakage invalidates model evaluation | Temporal joins with as-of semantics |
| **Over-engineering day 1** | Premature optimization | Start with batch features, add streaming when needed |
| **No graceful degradation** | All-or-nothing fails | Default values, circuit breakers, cached fallbacks |
| **Manual DAGs at scale** | Inconsistent, error-prone, maintenance burden | Auto-generate with overrides for special cases |

---

## Discussion Points by Interviewer Background

### If Interviewer Has ML Background

Focus on:
- Train-serve consistency mechanisms
- Point-in-time feature engineering
- Model quality monitoring
- Feature drift detection

### If Interviewer Has Infra/SRE Background

Focus on:
- Scaling strategy (horizontal vs vertical)
- Fault tolerance and circuit breakers
- Observability and alerting
- Disaster recovery

### If Interviewer Has Data Engineering Background

Focus on:
- Lambda architecture details
- Spark/Flink implementation
- Backfill optimization
- Storage partitioning

### If Interviewer Has Product/Business Background

Focus on:
- Developer productivity impact
- Time-to-production reduction
- Platform adoption metrics
- Feature store as competitive advantage

---

## Quick Reference Card

```
+-------------------------------------------------------------------------+
|               AIRBNB BIGHEAD - INTERVIEW QUICK REFERENCE                |
+-------------------------------------------------------------------------+
| KEY NUMBERS                         | 5-LAYER ARCHITECTURE              |
| * 30,000+ features                  | 1. Client: DS, MLE, Services      |
| * 99% feature adoption              | 2. Development: Redspot, Library  |
| * Months → Days dev time            | 3. Orchestration: ML Automator    |
| * P99 < 10ms feature serving        | 4. Feature: Zipline/Chronon       |
| * P99 < 30ms predictions            | 5. Serving: Deep Thought          |
+-------------------------------------------------------------------------+
| CORE INSIGHT                                                            |
| "Declarative DSL is single source of truth for train-serve consistency" |
|  * Compiles to Spark SQL for batch (training data)                      |
|  * Compiles to Flink operators for streaming (serving)                  |
|  * Same semantics, different execution = NO SKEW                        |
+-------------------------------------------------------------------------+
| TRADE-OFFS TO MENTION               | KEY PATTERNS                      |
| * Declarative vs Imperative DSL     | * Train-serve consistency         |
| * Lambda vs Kappa architecture      | * Point-in-time correctness       |
| * Auto vs Manual DAG generation     | * Graceful degradation            |
| * K8s-native vs Custom serving      | * Multi-level caching             |
+-------------------------------------------------------------------------+
| QUESTIONS TO ASK                    | TRAP QUESTIONS                    |
| * Full platform or component?       | * Why not inline features?        |
| * Scale requirements?               | * How handle feature store down?  |
| * Latency requirements?             | * Point-in-time at scale?         |
| * Train-serve consistency needed?   | * Why auto DAGs vs manual?        |
+-------------------------------------------------------------------------+
| TECH STACK                                                              |
| Python | Spark | Flink | Kafka | Hive | Kubernetes | Airflow | Docker   |
+-------------------------------------------------------------------------+
```

---

## Sample Interview Flow

### 0-5 Minutes: Clarify

```
YOU: "Before I dive in, let me clarify a few things.
      Are we designing the full ML platform or a specific component?"

INTERVIEWER: "Full platform for feature engineering to serving."

YOU: "What scale should I design for?"

INTERVIEWER: "Think Airbnb scale - millions of users, thousands of models."

YOU: "Is train-serve consistency a hard requirement?"

INTERVIEWER: "Yes, that's critical."

YOU: "Great. I'll design an end-to-end platform with a focus on
      feature consistency between training and serving."
```

### 5-15 Minutes: High-Level Design

```
YOU: "Let me sketch the high-level architecture. I'll use a 5-layer model:

      [Draw diagram]

      1. CLIENT LAYER: Data scientists, ML engineers, production services
      2. DEVELOPMENT LAYER: Notebooks (Redspot), pipeline SDK (BigHead Library)
      3. ORCHESTRATION: Automatic DAG generation (ML Automator), Airflow
      4. FEATURE LAYER: Declarative feature store (Zipline) with batch + streaming
      5. SERVING LAYER: Model serving (Deep Thought), feature API

      The key insight is the Feature Layer - we use a declarative DSL
      that compiles to both Spark (batch/training) and Flink (streaming/serving).
      This guarantees train-serve consistency."
```

### 15-30 Minutes: Deep Dive

```
YOU: "Let me deep dive into the feature store, since train-serve
      consistency is critical.

      [Draw Zipline architecture]

      Data scientists define features in a Python DSL:
      - Entity keys (user_id, listing_id)
      - Aggregations (COUNT, AVG, LAST)
      - Time windows (7 days, 30 days, unbounded)

      This single definition compiles to:
      - Spark SQL for batch (historical features for training)
      - Flink operators for streaming (real-time features for serving)

      The magic is point-in-time correctness. When generating training data,
      we join features using temporal semantics - features as they were
      WHEN the event happened, not current values.

      [Explain temporal join algorithm]"
```

### 30-40 Minutes: Scale & Trade-offs

```
YOU: "Now let's discuss scaling and trade-offs.

      BOTTLENECK 1: Point-in-time joins are expensive.
      - Solution: Partition pruning, bucketing, incremental backfills

      BOTTLENECK 2: Online feature latency.
      - Solution: Multi-level caching (L1 pod-local, L2 distributed)

      TRADE-OFF: Why declarative DSL vs imperative?
      - Imperative is more flexible but leads to train-serve skew
      - Declarative limits expressiveness but guarantees consistency
      - For production ML at scale, consistency wins

      FAILURE HANDLING: What if feature store goes down?
      - Circuit breaker activates
      - Fall back to default values
      - Predictions continue with degraded quality"
```

### 40-45 Minutes: Wrap Up

```
YOU: "To summarize:

      We designed BigHead, an end-to-end ML platform with:
      1. Declarative feature store (Zipline) for train-serve consistency
      2. Lambda architecture for freshness + accuracy
      3. Auto DAG generation for developer productivity
      4. Kubernetes-native serving for scalability

      The key differentiator is the declarative DSL that guarantees
      the same features in training and serving.

      Extensions I'd consider:
      - Auto-retraining based on drift detection
      - Feature recommendation system
      - Cost optimization for batch jobs"
```
