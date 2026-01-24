# Interview Guide

## Interview Pacing (45-minute format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| 0-5 min | **Clarify** | Understand scope, ask questions | Don't assume; clarify scale, constraints |
| 5-15 min | **High-Level** | Core architecture, data flow | Draw three planes: Control, Offline, Online |
| 15-30 min | **Deep Dive** | Feature store OR serving (pick one) | Show depth; interviewer may redirect |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failures, consistency | Discuss real numbers (10M QPS, P95 targets) |
| 40-45 min | **Wrap Up** | Summary, extensions, questions | Mention GenAI evolution as future direction |

---

## Meta-Commentary: What Makes This System Unique

### Key Challenges

1. **Training-Serving Consistency**
   - The same features must be used in training and serving
   - This seems simple but is the #1 cause of ML production bugs
   - Solution: Single source of truth (Palette) with shared DSL

2. **Scale: 10M Predictions/Second**
   - Not just high throughput—also low latency (P95 < 10ms)
   - Every prediction may require feature lookups
   - Solution: Multi-layer caching, virtual model sharding

3. **Dual Data Paths**
   - Training needs historical, accurate data (batch)
   - Serving needs fresh, fast data (streaming)
   - Solution: Lambda architecture with unified metadata

4. **Model Lifecycle Management**
   - 5,000+ models need governance, versioning, deployment
   - Different tiers have different requirements
   - Solution: Gallery registry + project tiering

### Where to Spend Most Time

| If Interviewer Asks About... | Deep Dive On... |
|------------------------------|-----------------|
| Feature store / data | Palette: dual-store, DSL, consistency |
| Serving / latency | Prediction service: sharding, caching, routing |
| Training / ML workflow | Distributed training, checkpointing, Ray |
| Scale | Numbers: 10M QPS, 5K models, latency breakdown |
| Reliability | Failover, circuit breakers, graceful degradation |

---

## Questions to Ask Interviewer

Before diving in, clarify these aspects:

```
SCOPE QUESTIONS:
1. "Are we designing the full platform or focusing on a specific component
    (e.g., feature store, model serving)?"

2. "What's the expected scale? Number of models, predictions per second?"

3. "What's the latency requirement for predictions?"

4. "Do we need to support deep learning / LLMs, or just traditional ML?"

5. "Is this for a single region or multi-region deployment?"

CONSTRAINT QUESTIONS:
6. "What's the consistency requirement? Can we accept eventual consistency
    for features?"

7. "Are there specific compliance requirements (GDPR, HIPAA)?"

8. "Is there existing infrastructure we should integrate with?"
```

---

## Trade-offs Discussion

### Trade-off 1: Feature Store Architecture

| Decision | Physical Dual-Store | Virtual Feature Store |
|----------|---------------------|----------------------|
| **Description** | Separate offline (Hive) and online (Cassandra) stores | Single logical store, materialize on demand |
| **Pros** | Optimized for each use case; predictable latency | Simpler to manage; no sync issues |
| **Cons** | Data duplication; sync complexity | Higher latency for online; complex query planning |
| **When to Choose** | High scale, strict latency SLOs | Smaller scale, flexibility > latency |
| **Michelangelo Choice** | Physical dual-store (Hive + Cassandra) |

### Trade-off 2: Model Serving Strategy

| Decision | Dedicated Instances | Virtual Sharding |
|----------|---------------------|------------------|
| **Description** | One model per container/instance | Multiple models per instance |
| **Pros** | Simple; isolated failures | Better resource utilization; cost efficient |
| **Cons** | Expensive; underutilized resources | Complex memory management; noisy neighbors |
| **When to Choose** | Few high-traffic models | Many models with varying traffic |
| **Michelangelo Choice** | Virtual sharding with tier-based isolation |

### Trade-off 3: Training Infrastructure

| Decision | Spark (Batch-Oriented) | Ray (Actor-Oriented) |
|----------|----------------------|---------------------|
| **Description** | Batch processing framework | Distributed Python runtime |
| **Pros** | Mature; great for big data; SQL support | Python-native; flexible; GPU support |
| **Cons** | Not ideal for DL; JVM overhead | Less mature; smaller ecosystem |
| **When to Choose** | Traditional ML, data processing | Deep learning, LLMs, custom algorithms |
| **Michelangelo Choice** | Both—Spark for traditional ML, Ray for DL/LLM |

### Trade-off 4: Consistency Model

| Decision | Strong Consistency | Eventual Consistency |
|----------|-------------------|---------------------|
| **Description** | All reads see latest write | Reads may see stale data |
| **Pros** | Predictable; easier to reason about | Higher availability; lower latency |
| **Cons** | Higher latency; reduced availability | Complexity; potential stale predictions |
| **When to Choose** | Model registry, critical metadata | Feature store, serving cache |
| **Michelangelo Choice** | Strong for registry; eventual for features |

### Trade-off 5: Feature Freshness vs. Latency

| Decision | Real-Time Features | Precomputed Features |
|----------|-------------------|---------------------|
| **Description** | Compute features at prediction time | Compute features in advance |
| **Pros** | Always fresh; no sync issues | Predictable latency; simpler serving |
| **Cons** | Higher latency; more compute | Stale features; storage overhead |
| **When to Choose** | Features change rapidly | Features stable or batch-update acceptable |
| **Michelangelo Choice** | Both—streaming for freshness, batch for stability |

---

## Trap Questions & How to Handle

### Trap 1: "Why not just use a single database?"

**What Interviewer Wants:** Understanding of different access patterns and scale requirements.

**Best Answer:**
> "Training and serving have fundamentally different access patterns. Training needs to scan billions of historical records with point-in-time correctness—Hive excels at this. Serving needs sub-10ms key-value lookups for millions of QPS—Cassandra excels at this. Using one database for both would mean either slow training (if optimized for serving) or slow predictions (if optimized for training). The dual-store approach optimizes each path at the cost of sync complexity, which we manage through automated pipelines and shared metadata."

### Trap 2: "What if Cassandra goes down?"

**What Interviewer Wants:** Failure handling, graceful degradation.

**Best Answer:**
> "With replication factor 3 and LOCAL_QUORUM consistency, single-node failures are handled transparently. For datacenter-level failures, we have multi-DC replication, so the surviving DC continues serving. If the entire feature store becomes unavailable, we engage circuit breakers: predictions continue using cached features (accepting some staleness) or fall back to default feature values. For Tier 1 models, we might also have pre-computed feature snapshots as an emergency fallback. The key is graceful degradation—some prediction is better than no prediction."

### Trap 3: "How would you handle 10x the current scale?"

**What Interviewer Wants:** Forward-thinking architecture, not just "add more servers."

**Best Answer:**
> "At 100M QPS, I'd consider several architectural changes:
> 1. **Feature Store:** Move hot features to an in-memory grid (like Redis Cluster) as the primary store, with Cassandra as overflow. Add more aggressive caching layers.
> 2. **Serving:** Consider edge deployment for latency-sensitive models. Implement model-specific autoscaling rather than cluster-wide.
> 3. **Sharding:** Shard by model tier—Tier 1 on dedicated infrastructure with reserved capacity.
> 4. **Efficiency:** Model quantization and distillation to reduce inference cost. Batched inference for compatible requests.
>
> The current architecture scales well because it's horizontally scalable at each layer, but 10x requires both scaling out AND efficiency improvements."

### Trap 4: "Why build your own platform instead of using MLflow/Kubeflow?"

**What Interviewer Wants:** Understanding of build vs. buy decisions at scale.

**Best Answer:**
> "When Uber started Michelangelo in 2015-2016, no mature end-to-end ML platforms existed. MLflow launched in 2018, Kubeflow in 2017. Even today, these tools don't fully address Uber's scale requirements:
> 1. **Feature Store:** Open-source feature stores came later, inspired by Palette. Uber needed the Cassandra-backed millisecond serving that didn't exist.
> 2. **Integration:** Tight integration with Uber's infrastructure (Kafka, internal services) required custom work.
> 3. **Scale:** 10M QPS serving with <10ms latency isn't a common requirement.
>
> Today, I'd evaluate open-source more seriously—Feast for features, MLflow for tracking—but still expect significant customization. The decision depends on scale, latency requirements, and existing infrastructure."

### Trap 5: "How do you prevent training-serving skew?"

**What Interviewer Wants:** Deep understanding of the core ML platform challenge.

**Best Answer:**
> "Training-serving skew happens when features behave differently in training vs. serving. We prevent this through:
> 1. **Single Source of Truth:** Palette stores feature definitions once; same DSL compiles to both batch (training) and streaming (serving).
> 2. **Feature Logging:** At serving time, we log the exact feature values used for predictions back to HDFS. Training can use these logged features directly.
> 3. **Validation:** Before deployment, we validate that features in serving match training distribution using statistical tests (PSI).
> 4. **Monitoring:** Continuous drift detection alerts us when serving features diverge from training distribution.
>
> The key insight is that skew prevention is a platform responsibility, not a data scientist responsibility. The platform enforces consistency."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Starting with model training | Training is periodic; serving is always on | Start with serving path, then training |
| Ignoring feature store | Features are the foundation of ML platforms | Design feature store early; it's critical |
| Single consistency model | Different components need different guarantees | Explicitly choose consistency per component |
| Forgetting about model management | 5,000+ models need governance | Include registry, versioning, tiering |
| Over-engineering day 1 | You don't need GenAI Gateway immediately | Design for 10x, not 1000x; evolve later |
| Ignoring operational concerns | ML platforms are complex to operate | Include observability, drift detection |
| Not discussing trade-offs | Shows shallow understanding | Explicitly state trade-offs made |

---

## Sample Interview Flow

### Opening (0-5 min)

**Interviewer:** "Design an ML platform like Uber's Michelangelo."

**You:** "Before I dive in, let me clarify a few things:
1. What scale are we targeting? Number of models, predictions per second?
2. Are we focusing on the full platform or a specific component?
3. What's our latency requirement for predictions?
4. Do we need to support deep learning, or just traditional ML?"

**Interviewer:** "Let's say 5,000 models, 10 million predictions per second, sub-10ms latency. Full platform overview, then deep dive on a component of your choice."

### High-Level Design (5-15 min)

**You:** "I'll organize this into three main planes:

**Control Plane:** Manages ML entity lifecycles—projects, models, deployments. Uses Kubernetes operators for declarative management.

**Offline Data Plane:** Handles heavy computation—feature engineering with Spark, model training with Spark/Ray, data stored in a data lake (HDFS) and feature warehouse (Hive).

**Online Data Plane:** Handles real-time serving—prediction service with virtual model sharding, online feature store backed by Cassandra for low-latency lookups.

*[Draw architecture diagram]*

The critical insight is that features need two paths: batch for training accuracy, streaming for serving freshness. This Lambda architecture is unified through a shared feature definition DSL."

### Deep Dive (15-30 min)

**You:** "Let me deep dive on the feature store, since it's the foundation everything else depends on.

**Palette** uses a physical dual-store architecture:
- **Offline Store (Hive):** Daily snapshots for training. Supports point-in-time joins—we can get features as they were at any historical timestamp.
- **Online Store (Cassandra):** Latest feature values for serving. Key-value access pattern, P95 < 5ms.

For serving, we add a caching layer:
- **L1:** In-process cache (60s TTL)
- **L2:** Redis cluster (5 min TTL)

*[Draw feature store architecture]*

The DSL is crucial—same definition compiles to both Spark (batch) and Samza (streaming). This prevents training-serving skew..."

### Scale & Trade-offs (30-40 min)

**You:** "Let's discuss the key bottlenecks and how we address them:

**Feature Lookup Latency:**
- With 10M QPS and ~5 features per prediction, that's 50M feature lookups/second
- Solution: Aggressive caching. Target 95% L1+L2 hit rate to keep Cassandra load manageable
- Trade-off: Cache staleness vs. latency

**Model Serving Scale:**
- 5,000 models can't each have dedicated servers—too expensive
- Solution: Virtual sharding. Multiple models per instance, loaded on-demand
- Trade-off: Resource utilization vs. isolation

**Consistency:**
- Model registry uses strong consistency—can't serve wrong model version
- Feature store uses eventual consistency—stale features acceptable for short periods
- Trade-off: Consistency vs. availability

For failures, we use circuit breakers on feature lookups, fallback to default features, and graceful degradation levels based on severity..."

### Wrap Up (40-45 min)

**You:** "To summarize:
- Three-plane architecture: Control, Offline, Online
- Feature store with dual physical stores (Hive + Cassandra)
- Virtual model sharding for serving efficiency
- Project tiering for governance and SLA management

Future evolution would include LLM support—Uber's Michelangelo added a GenAI Gateway in 2024 for this, providing unified access to multiple LLM providers with consistent guardrails.

Any questions on specific components?"

---

## Quick Reference Card

```
+-----------------------------------------------------------------------+
|          MICHELANGELO INTERVIEW CHEAT SHEET                           |
+-----------------------------------------------------------------------+
|                                                                        |
|  KEY NUMBERS                       ARCHITECTURE                        |
|  -----------                       ------------                        |
|  * 10M predictions/sec             * 3 planes: Control/Offline/Online  |
|  * 5,000+ production models        * Lambda architecture for features  |
|  * P95 < 10ms latency              * Dual-store: Hive + Cassandra      |
|  * 20,000+ features                * Virtual model sharding            |
|  * 99.99% Tier 1 availability                                          |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  CORE COMPONENTS                   KEY PATTERNS                        |
|  ----------------                  -------------                        |
|  * Palette (Feature Store)         * Training-serving consistency      |
|  * Gallery (Model Registry)        * Point-in-time joins              |
|  * Canvas (Model-as-Code)          * Project tiering (1-4)            |
|  * Prediction Service              * Circuit breakers                  |
|  * Ray/Spark Training              * Graceful degradation             |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  TRADE-OFFS TO MENTION             COMMON TRAP QUESTIONS               |
|  --------------------              ----------------------               |
|  * Dual-store vs single store      * "Why not one database?"          |
|  * Virtual vs dedicated sharding   * "What if Cassandra fails?"       |
|  * Spark vs Ray                    * "How to 10x scale?"              |
|  * Strong vs eventual consistency  * "Why not use MLflow?"            |
|  * Real-time vs precomputed        * "How prevent skew?"              |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  45-MIN PACING                     DON'T FORGET                        |
|  --------------                    ------------                        |
|  0-5:   Clarify requirements       * Feature store is critical        |
|  5-15:  High-level architecture    * Discuss consistency explicitly   |
|  15-30: Deep dive (your choice)    * Mention project tiering          |
|  30-40: Scale & failures           * Include observability            |
|  40-45: Summary & extensions       * Mention GenAI evolution          |
|                                                                        |
+-----------------------------------------------------------------------+
```

---

## Follow-Up Topics

If time permits or interviewer asks, be ready to discuss:

1. **GenAI Gateway (2024):** How Michelangelo evolved to support LLMs
2. **Ray Migration:** Why moving from Spark to Ray for training
3. **Kubernetes Operators:** How control plane manages ML entities
4. **Drift Detection:** Automated model monitoring and retraining
5. **A/B Testing:** How experimentation integrates with the platform
6. **Cost Optimization:** GPU scheduling, spot instances, model efficiency

---

## References for Further Study

- [Meet Michelangelo: Uber's ML Platform](https://www.uber.com/blog/michelangelo-machine-learning-platform/)
- [Scaling Michelangelo](https://www.uber.com/blog/scaling-michelangelo/)
- [From Predictive to Generative AI](https://www.uber.com/blog/from-predictive-to-generative-ai/)
- [Michelangelo Palette - InfoQ Talk](https://www.infoq.com/presentations/michelangelo-palette-uber/)
- [Gallery: Model Management - EDBT Paper](https://openproceedings.org/2020/conf/edbt/paper_217.pdf)
