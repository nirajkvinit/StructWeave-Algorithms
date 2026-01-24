# Interview Guide

## Interview Pacing (45-minute format)

| Time | Phase | Focus | Key Deliverables |
|------|-------|-------|------------------|
| 0-5 min | **Clarify** | Understand requirements, scope | Confirmed scale, key features |
| 5-15 min | **High-Level** | Core architecture, data flow | Architecture diagram, component overview |
| 15-30 min | **Deep Dive** | Futures system OR resource scheduler | Detailed algorithm, trade-offs |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios | MWFS evolution, reliability |
| 40-45 min | **Wrap Up** | Summary, questions | Clear understanding demonstrated |

---

## Meta-Commentary

### What Makes FBLearner Unique

FBLearner Flow is historically significant as the **first publicly announced ML platform** (2016), predating Michelangelo (2017) and Metaflow (2019). The interviewer may test whether you understand its unique contributions:

1. **Futures-Based Execution**: The core innovation - write sequential code, get automatic parallelization
2. **Auto UI Generation**: No frontend code needed for workflow launching
3. **Custom Type System**: Semantic ML types enable tooling and validation
4. **Scale**: 1M+ models, 6M predictions/second, 1,100+ teams

### Where to Spend Most Time

| Priority | Topic | Why |
|----------|-------|-----|
| **High** | Futures-based DAG compilation | Core differentiator, shows deep understanding |
| **High** | Two-stage execution model | Explains the "magic" of automatic parallelization |
| **Medium** | Auto UI generation | Unique feature, demonstrates breadth |
| **Medium** | MWFS evolution | Shows awareness of real-world scaling challenges |
| **Low** | Framework integration (PyTorch/Caffe2) | Important but not unique to FBLearner |

### Common Interviewer Probes

1. "How does FBLearner achieve automatic parallelization without explicit DAG definition?"
2. "What happens when an operator fails mid-execution?"
3. "How would you handle 1,100+ teams sharing resources fairly?"
4. "Why did Meta need to evolve to MWFS? What were the limits?"

---

## Trade-offs Discussion

### Key Trade-off 1: Futures vs Eager Execution

| Aspect | Futures (FBLearner) | Eager Execution |
|--------|---------------------|-----------------|
| **Code Style** | Sequential, natural | Sequential |
| **Parallelization** | Automatic | Manual |
| **Debugging** | Harder (deferred execution) | Easier (immediate results) |
| **Optimization** | Global DAG optimization | Local optimization only |
| **Learning Curve** | Higher (futures concept) | Lower |

**Recommendation:** Futures when parallelization is complex; eager when debugging is priority.

### Key Trade-off 2: Monolithic vs MWFS

| Aspect | Monolithic (Original) | MWFS (2024) |
|--------|----------------------|-------------|
| **Simplicity** | Single codebase | Multiple services |
| **Scaling** | Limited (1.7TB DB bottleneck) | Horizontal (sharded) |
| **Development Velocity** | Slower (coupled) | Faster (independent) |
| **Operational Complexity** | Lower | Higher |
| **Large DAG Support** | Limited (<20K operators) | Unlimited |

**Recommendation:** Start monolithic, evolve to separated when hitting scale limits.

### Key Trade-off 3: Typed vs Dynamic Operators

| Aspect | Typed Operators (FBLearner) | Dynamic (Metaflow-style) |
|--------|----------------------------|--------------------------|
| **Validation** | Compile-time | Runtime |
| **Auto UI** | Yes (from types) | No (manual) |
| **Flexibility** | Less (type constraints) | More (any Python object) |
| **Reusability** | High (standardized I/O) | Medium |
| **Learning Curve** | Higher (type system) | Lower |

**Recommendation:** Typed for large organizations with many teams; dynamic for small teams.

### Trade-offs Summary Table

| Decision | Option A | Option B | FBLearner Choice |
|----------|----------|----------|------------------|
| Execution Model | Futures | Eager | **Futures** |
| Parallelization | Automatic | Manual | **Automatic** |
| Type System | Custom ML types | Python types | **Custom ML types** |
| UI Generation | Automatic | Manual | **Automatic** |
| Architecture | Monolithic → Separated | Microservices from start | **Evolved** |
| Framework Support | Unified | Multi-framework | **Multi-framework (PyTorch+Caffe2)** |

---

## Trap Questions & How to Handle

### Trap 1: "Why not just use Airflow?"

**What Interviewer Wants:** Understanding of ML-specific vs general workflow needs.

**Best Answer:**
> "Airflow is excellent for general DAG scheduling, but FBLearner addresses ML-specific challenges:
> 1. **Futures-based parallelization** - Engineers write sequential code, system parallelizes automatically. Airflow requires explicit DAG definition.
> 2. **Auto UI generation** - Typed schemas generate launch forms. Airflow needs separate UI development.
> 3. **ML-specific types** - Dataset, FeatureSet, Model types with semantic meaning.
> 4. **Integrated ecosystem** - Tight coupling with Feature Store and Predictor for training-serving consistency.
>
> For non-ML workflows, Airflow would be a reasonable choice."

### Trap 2: "Futures seem like unnecessary complexity. Why not just define the DAG explicitly?"

**What Interviewer Wants:** Defense of the design choice.

**Best Answer:**
> "Explicit DAG definition does work - that's what Airflow uses. However, futures provide key benefits at scale:
> 1. **Reduced cognitive load** - Engineers think about data flow, not orchestration. Sequential code is easier to write and review.
> 2. **Fewer errors** - Implicit dependency tracking eliminates manual dependency bugs.
> 3. **Automatic optimization** - The system can globally optimize the DAG in ways manual definitions miss.
>
> The trade-off is debugging complexity - when something fails, the deferred execution can be harder to trace. FBLearner addresses this with detailed execution tracing and logging."

### Trap 3: "How would you handle a team that's consuming 90% of GPU resources?"

**What Interviewer Wants:** Understanding of multi-tenancy and fairness.

**Best Answer:**
> "This is a fairness scheduling problem. I'd implement:
> 1. **Quota enforcement** - Each team has a guaranteed allocation and a burst limit.
> 2. **Fairness penalty** - Over-quota teams get lower effective priority for new jobs.
> 3. **Preemption** - Low-priority jobs from over-quota teams can be preempted for starving high-priority jobs.
> 4. **Transparency** - Dashboards showing per-team usage vs entitlement.
>
> The key insight is that 90% usage isn't inherently bad if other teams aren't waiting. The problem is when usage causes starvation for others."

### Trap 4: "What if the workflow database goes down?"

**What Interviewer Wants:** Failure handling and graceful degradation.

**Best Answer:**
> "I'd handle this at multiple levels:
> 1. **Prevention** - Replicated database with automatic failover (MWFS uses sharded, replicated DBs).
> 2. **Detection** - Health checks detect failure within seconds.
> 3. **Failover** - Automatic promotion of replica to primary.
> 4. **Graceful degradation** - During failover:
>    - Running operators continue (state in memory)
>    - New submissions queue with backpressure
>    - Read operations fail over to replica
> 5. **Recovery** - Workflows resume from last checkpoint after recovery.
>
> The key is that operator execution is decoupled from metadata storage, so brief outages don't kill running jobs."

### Trap 5: "Why build a custom type system instead of using Protocol Buffers or standard Python types?"

**What Interviewer Wants:** Deep understanding of the type system purpose.

**Best Answer:**
> "Standard types serve different purposes:
> - **Protocol Buffers** are for serialization, not semantic meaning. They can't express 'this is a FeatureSet from the feature store.'
> - **Python types** lack the richness needed for ML data. A `dict` doesn't tell you it's a model with specific input/output schemas.
>
> FBLearner's custom types provide:
> 1. **Semantic meaning** - `FeatureSet` knows it should autocomplete from the feature store.
> 2. **Validation** - Types enforce constraints at compile time.
> 3. **UI generation** - Types map to appropriate UI components.
> 4. **Tooling** - Generic tools understand data without knowing specific workflows.
>
> The cost is a learning curve, but at Meta's scale (1,100+ teams), the benefits of standardization outweigh the cost."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Do Instead |
|---------|---------------|---------------------|
| Ignoring the futures concept | Missing the core innovation | Lead with how futures enable automatic parallelization |
| Treating it like Airflow | Missing ML-specific features | Emphasize auto UI, typed operators, ecosystem integration |
| Over-designing day-1 | Premature optimization | Start with monolithic, explain MWFS as evolution |
| Forgetting multi-tenancy | Missing 1,100+ teams context | Discuss quotas, fairness, isolation |
| Ignoring failure modes | Incomplete design | Cover operator failures, DAG failures, DB failures |
| Not mentioning MWFS | Missing modern evolution | Show awareness of 2024 architecture changes |
| Confusing with Predictor | Flow vs serving separation | Clearly distinguish training (Flow) from serving (Predictor) |

---

## Questions to Ask Interviewer

### Scope Clarification
- "Should I focus on the training platform (FBLearner Flow) or also cover serving (Predictor)?"
- "What's the expected scale - hundreds of teams or just one?"
- "Should I assume GPU training is a requirement?"

### Technical Depth
- "Would you like me to deep dive on the futures system or the resource scheduler?"
- "Should I cover the evolution to MWFS or focus on the original architecture?"
- "How much detail do you want on the type system and auto UI?"

### Constraints
- "Any specific latency or availability requirements I should target?"
- "Should I assume existing infrastructure (feature store, etc.) or design from scratch?"

---

## Key Concepts to Demonstrate

### Must-Know Concepts

| Concept | How to Demonstrate |
|---------|-------------------|
| **Futures-based execution** | Explain two-stage compilation, draw DAG from code |
| **Automatic parallelization** | Show how independent operators run concurrently |
| **Typed operators** | Explain input/output schemas, resource declarations |
| **Auto UI generation** | Show type-to-component mapping |
| **Multi-tenancy** | Discuss quotas, fairness scheduling, isolation |

### Differentiating Concepts

| Concept | How to Demonstrate |
|---------|-------------------|
| **Historical significance** | FBLearner (2016) predated Michelangelo (2017), Metaflow (2019) |
| **MWFS evolution** | Explain monolithic limitations, separation of concerns |
| **Framework integration** | PyTorch for research, Caffe2 for production, ONNX bridge |
| **Scale** | 1M+ models, 6M pred/s, 1,100+ teams |

---

## Quick Reference Card (for Interview)

```
+-----------------------------------------------------------------------+
|          FBLEARNER FLOW - INTERVIEW QUICK REFERENCE                    |
+-----------------------------------------------------------------------+
|                                                                        |
|  UNIQUE INNOVATIONS             PLATFORM COMPARISON                    |
|  -----------------              -------------------                     |
|  * Futures-based execution      FBLearner: 2016 (first)               |
|  * Automatic DAG parallelization Michelangelo: 2017 (feature store)   |
|  * Custom ML type system        Metaflow: 2019 (Python decorators)    |
|  * Auto UI from typed schemas   Kubeflow: K8s-native                  |
|  * Two-stage compilation                                              |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  SCALE NUMBERS                  ARCHITECTURE EVOLUTION                 |
|  -------------                  ----------------------                  |
|  * 1M+ total models trained     2016: Original monolithic             |
|  * 600K models/month            2024: MWFS separated architecture     |
|  * 6M predictions/second                                              |
|  * 1,100+ teams                 Key change: Separation of concerns    |
|  * 25-50% engineer adoption     - SDK layer                           |
|  * 350K H100 GPUs (2024)        - Orchestration (MWFS)                |
|                                 - Execution (Action Service)          |
|                                 - Observability                       |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  CRITICAL COMPONENTS            KEY TRADE-OFFS                         |
|  -------------------            ---------------                         |
|  * Workflow Engine              Futures vs Eager: Futures chosen      |
|  * DAG Compiler (futures)       - Pro: Automatic parallelization      |
|  * Resource Scheduler           - Con: Debugging complexity           |
|  * Auto UI Generator                                                  |
|  * Type Registry                Monolithic vs MWFS: Evolved           |
|  * FBLearner Predictor          - Pro: Horizontal scaling             |
|                                 - Con: Operational complexity         |
|                                                                        |
+-----------------------------------------------------------------------+
|                                                                        |
|  COMMON TRAP QUESTIONS                                                 |
|  ---------------------                                                 |
|  1. "Why not Airflow?" → ML-specific: auto UI, typed ops, ecosystem  |
|  2. "Why futures over explicit DAG?" → Reduced cognitive load, auto  |
|  3. "90% GPU by one team?" → Quotas, fairness, preemption            |
|  4. "DB goes down?" → Replication, failover, graceful degradation    |
|                                                                        |
+-----------------------------------------------------------------------+
```

---

## Sample Interview Flow

### Opening (0-5 min)

**Interviewer:** "Design a machine learning platform like Facebook's FBLearner Flow."

**You:** "I'd like to clarify a few things:
1. What scale should I target - teams, models per month, predictions per second?
2. Should I focus on training workflows or also cover model serving?
3. Any specific features I should prioritize - experiment tracking, auto-scaling, etc.?"

**Interviewer:** "Assume 1,000+ teams, hundreds of thousands of models per month, and millions of predictions per second. Focus on the training platform."

### High-Level Design (5-15 min)

**You:** "Let me outline the core architecture. FBLearner's key innovation is **futures-based execution**..."

*[Draw architecture diagram, explain components]*

### Deep Dive (15-30 min)

**You:** "I'd like to deep dive on the futures-based DAG compiler, as it's the core innovation..."

*[Explain two-stage compilation, draw DAG from example code, discuss parallelization]*

### Scale & Trade-offs (30-40 min)

**You:** "At this scale, we face several challenges. The original monolithic architecture hit limits..."

*[Discuss MWFS evolution, failure handling, multi-tenancy]*

### Wrap Up (40-45 min)

**You:** "To summarize, FBLearner Flow's key differentiators are:
1. Futures-based automatic parallelization
2. Custom type system enabling auto UI
3. Evolution from monolithic to MWFS for scale

The main trade-offs are debugging complexity from deferred execution and operational complexity from distributed architecture."

**Interviewer:** "Any questions for me?"

**You:** "Yes - in your experience, what's the most common failure mode in ML platforms at this scale?"
