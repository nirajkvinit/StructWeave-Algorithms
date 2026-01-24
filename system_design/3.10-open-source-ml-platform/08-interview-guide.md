# Interview Guide

## Interview Pacing (45-minute format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify | Requirements, scope, constraints | Ask about scale, latency requirements, ML workload types |
| **5-15 min** | High-Level | Core components, architecture | Draw the 5-layer diagram, explain component choices |
| **15-30 min** | Deep Dive | 1-2 critical components | Feature store OR model serving - go deep |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failures | Discuss train-serve skew, cold starts, GPU scheduling |
| **40-45 min** | Wrap Up | Summary, questions | Highlight key decisions, ask clarifying questions |

---

## Opening Questions to Ask

### Requirements Clarification

| Question | Why It Matters |
|----------|----------------|
| "What types of ML models will this platform serve?" | Determines runtime requirements (GPU vs CPU, batch vs real-time) |
| "What's the expected scale - models, predictions/day?" | Drives capacity planning, architecture complexity |
| "Is this for a single team or organization-wide?" | Multi-tenancy, governance requirements |
| "What's the latency requirement for predictions?" | Real-time vs batch serving architecture |
| "Do you need feature reuse across models?" | Determines if feature store is necessary |
| "What's the acceptable downtime for training vs serving?" | Availability tier decisions |
| "Any compliance requirements (HIPAA, GDPR)?" | Security, audit, data handling design |

### Clarifying Questions by Scenario

```
Scenario: "Design an ML platform for a fintech company"
─────────────────────────────────────────────────────
Ask: "Is this for fraud detection, credit scoring, or general ML?"
     → Fraud: Real-time, low latency critical
     → Credit: Batch OK, explainability important
     → General: Flexible architecture needed

Scenario: "Design an ML platform for e-commerce recommendations"
─────────────────────────────────────────────────────────────────
Ask: "Are recommendations computed in real-time or pre-computed?"
     → Real-time: Feature store critical, low latency serving
     → Pre-computed: Batch processing, simpler serving

Scenario: "Design an ML platform for a healthcare company"
───────────────────────────────────────────────────────────
Ask: "What's the regulatory environment? HIPAA?"
     → HIPAA: Encryption, audit logs, access control paramount
     → Research: More flexibility, reproducibility important
```

---

## Meta-Commentary: What Makes This System Unique

### Key Differentiators

```
1. COMPOSABILITY VS MONOLITH
   ─────────────────────────
   This is NOT Kubeflow or SageMaker. The unique challenge is:
   - Integrating best-of-breed OSS tools
   - Managing multiple upgrade cycles
   - Ensuring consistent developer experience
   - Avoiding "integration hell"

2. FEATURE STORE AS FOUNDATION
   ────────────────────────────
   Unlike many ML platforms, the feature store is CRITICAL PATH:
   - Train-serve consistency solves #1 production bug
   - Point-in-time correctness prevents data leakage
   - Feature reuse across models is a force multiplier

3. KUBERNETES-NATIVE
   ──────────────────
   Every component runs on K8s:
   - Uniform deployment model
   - Consistent scaling patterns
   - Portable across clouds
   - But: Requires K8s expertise

4. GENAI-READY
   ─────────────
   Modern ML platforms must handle:
   - LLM experiment tracking (MLflow 3.x tracing)
   - LLM serving (KServe + vLLM)
   - Vector embeddings in feature store
   - This wasn't true 2 years ago
```

### Where to Spend Most Time

| Topic | Time Investment | Why |
|-------|-----------------|-----|
| **Feature Store Architecture** | 25% | Solves train-serve skew, most interview traps here |
| **Model Serving (KServe)** | 20% | Critical path, latency-sensitive |
| **Integration Patterns** | 15% | Unique to OSS composition approach |
| **Scalability** | 15% | Auto-scaling, GPU scheduling |
| **Observability** | 10% | Drift detection, model monitoring |
| **Other (MLflow, Airflow)** | 15% | Important but well-understood |

---

## Trade-off Discussions

### Trade-off 1: Kubeflow vs Custom OSS Composition

| Aspect | Kubeflow | Custom OSS |
|--------|----------|------------|
| **Integration** | Pre-integrated | Manual integration |
| **Flexibility** | Limited (take all or nothing) | Maximum (choose each tool) |
| **Updates** | Coordinated releases | Independent updates |
| **Learning Curve** | Single platform | Multiple tools |
| **Community** | Kubeflow-specific | Each tool's community |
| **Vendor Lock-in** | Low (but Kubeflow-specific) | None |

**Recommendation:** Custom OSS for teams with platform engineering capacity; Kubeflow for teams wanting faster time-to-value.

**Interview Response:**
> "Kubeflow provides an integrated experience but forces you into their component choices. With custom composition, we get maximum flexibility - for example, we can use KServe for serving even if we prefer Prefect over Kubeflow Pipelines. The trade-off is integration complexity. I'd choose custom composition when we have a strong platform team and need to adopt specific tools, or when we're already running some components and want to augment."

### Trade-off 2: KServe vs Seldon Core

| Aspect | KServe | Seldon Core |
|--------|--------|-------------|
| **Governance** | CNCF Incubating | Commercial (Seldon) |
| **Serverless** | Native (Knative) | Optional |
| **LLM Support** | First-class (v0.15+) | Limited |
| **Drift Detection** | External (Evidently) | Built-in (Alibi Detect) |
| **Multi-Model** | ModelMesh | Triton-based |

**Recommendation:** KServe for serverless-first, LLM workloads; Seldon for built-in drift detection, commercial support.

### Trade-off 3: Airflow vs Prefect

| Aspect | Airflow 3.x | Prefect 3.x |
|--------|-------------|-------------|
| **Paradigm** | DAG-centric | Flow-centric |
| **Scheduling** | Cron + Events (3.x) | Native events |
| **Dev Experience** | YAML/Python DAGs | Pure Python |
| **Community** | Massive (320M downloads) | Growing |
| **Enterprise** | Self-managed or Astronomer | Prefect Cloud |

**Recommendation:** Airflow for data engineering teams with existing investment; Prefect for Python-native ML teams.

### Trade-off 4: Feature Store vs Direct Feature Computation

| Aspect | Feature Store (Feast) | Direct Computation |
|--------|----------------------|-------------------|
| **Consistency** | Guaranteed train-serve | Manual effort |
| **Latency** | Online store lookup | Varies |
| **Complexity** | Additional infrastructure | Simpler initial setup |
| **Reuse** | Features shared across models | Duplicate computation |
| **Point-in-Time** | Built-in correctness | Manual implementation |

**Recommendation:** Always use feature store for production ML. Direct computation only for prototyping.

**Interview Response:**
> "Skipping the feature store seems simpler initially, but train-serve skew is the #1 cause of ML production bugs. When your training uses different feature logic than serving, model performance degrades silently. Feast gives us a single source of truth - the same Python definition compiles to both batch training queries and real-time serving. The overhead is worth it for any production system."

---

## Trap Questions and How to Handle

### Trap 1: "Why not just use Kubeflow?"

**What Interviewer Wants:** Understand trade-offs, not dismiss alternatives

**Bad Answer:** "Kubeflow is too complex / outdated / we don't like it"

**Good Answer:**
> "Kubeflow is a valid choice and provides integrated components. However, for our requirements, custom composition offers advantages:
> 1. We can adopt MLflow 3.x's GenAI tracing, which Kubeflow doesn't have yet
> 2. We prefer KServe's native serverless over Kubeflow Serving
> 3. Our team already uses Airflow for data pipelines, so extending it for ML pipelines reduces cognitive load
> 4. We can upgrade each component independently without waiting for Kubeflow releases
>
> That said, if we were starting fresh with limited platform engineering resources, Kubeflow would be a reasonable choice for faster time-to-value."

### Trap 2: "Can't we skip the feature store?"

**What Interviewer Wants:** Test understanding of train-serve skew

**Bad Answer:** "Sure, we can compute features on the fly"

**Good Answer:**
> "We could compute features directly, but we'd lose critical guarantees:
> 1. **Train-serve skew** - The #1 cause of ML production bugs is when training features differ from serving features. Even subtle differences (different time window, aggregation logic) cause model degradation.
> 2. **Point-in-time correctness** - For training, we need features as they existed at prediction time, not current values. Without this, we get data leakage.
> 3. **Feature reuse** - Multiple models often need the same features. Without a feature store, teams duplicate work and introduce inconsistencies.
>
> The feature store adds infrastructure complexity, but for production ML it's essential. I'd only skip it for pure prototyping or batch-only systems with simple features."

### Trap 3: "Why do you need both online and offline stores?"

**What Interviewer Wants:** Test understanding of feature store architecture

**Good Answer:**
> "The dual-store architecture serves different access patterns:
>
> **Offline Store** (e.g., Parquet on S3):
> - Optimized for bulk historical queries
> - Used for training data retrieval
> - Supports point-in-time joins across time ranges
> - Cost-effective for large data volumes
>
> **Online Store** (e.g., Redis):
> - Optimized for low-latency point lookups
> - Used during real-time inference
> - Stores only latest feature values
> - P99 latency <50ms requirement
>
> A single store can't serve both patterns efficiently. Batch queries against Redis would be expensive and slow; real-time lookups against S3 would have unacceptable latency."

### Trap 4: "What happens when the feature store goes down?"

**What Interviewer Wants:** Test failure handling, graceful degradation

**Good Answer:**
> "Feature store availability is critical since it's on the inference path. Our strategy has multiple layers:
>
> 1. **Infrastructure redundancy**: Redis Cluster with 6 nodes across 3 AZs, automatic failover
> 2. **Local caching**: Transformer maintains L1 cache of hot entities (30-40% hit rate)
> 3. **Circuit breaker**: After 5 failures in 10 seconds, circuit opens
> 4. **Graceful degradation**: Return default feature values rather than failing
> 5. **Fallback model**: Simpler model that doesn't require real-time features
>
> The key is that inference continues with degraded accuracy rather than complete failure. We track the fallback rate as a metric and alert if it exceeds thresholds."

### Trap 5: "How do you handle 10x traffic spike?"

**What Interviewer Wants:** Test auto-scaling understanding, not just "add more servers"

**Good Answer:**
> "A 10x spike requires multiple coordinated responses:
>
> 1. **KServe auto-scaling**: HPA triggers at 70% CPU, scales to max replicas in 2-3 minutes. For faster response, we use KEDA with queue depth triggers.
>
> 2. **Feature server scaling**: Stateless servers scale horizontally. We maintain headroom with min replicas > 0.
>
> 3. **Cold start mitigation**: At 10x, we'll hit cold starts. LocalModelCache (KServe 0.15+) reduces model load time from minutes to seconds.
>
> 4. **Load shedding**: If scaling can't keep up, we shed lowest-priority traffic (non-critical models first).
>
> 5. **Capacity reservation**: For predictable spikes (Black Friday), we pre-scale based on historical patterns.
>
> But honestly, 10x instantaneous spike without warning will cause degradation. The goal is graceful degradation - serve what we can with acceptable latency rather than failing completely."

### Trap 6: "Why Kubernetes? Why not just use VMs?"

**What Interviewer Wants:** Test architectural reasoning, not dogmatism

**Good Answer:**
> "Kubernetes provides specific benefits for ML platforms:
>
> 1. **Declarative scaling**: HPA/KEDA handles auto-scaling declaratively - no custom scripts
> 2. **Uniform deployment**: All components (MLflow, Feast, KServe) deploy the same way
> 3. **Resource management**: GPU scheduling, memory limits, node affinity are built-in
> 4. **Service discovery**: Components find each other via DNS, not hardcoded IPs
> 5. **Ecosystem**: KServe, KubeRay, operators all assume Kubernetes
>
> VMs could work but would require more custom automation. For a team already running Kubernetes for other workloads, the marginal cost of ML is lower.
>
> That said, for a small team without K8s expertise, managed services (SageMaker, Vertex) might be more pragmatic despite vendor lock-in."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Jumping to solution without clarifying | Miss critical requirements | Ask 3-5 clarifying questions first |
| Designing for 1000x scale on day 1 | Over-engineering, complexity | Design for 10x, have plan for 100x |
| Ignoring train-serve skew | #1 production ML bug | Feature store solves this |
| Single points of failure | Availability risk | Identify and mitigate each SPOF |
| Skipping observability | Can't debug production issues | Include monitoring, drift detection |
| Not discussing trade-offs | Shows shallow thinking | Explicitly compare alternatives |
| Treating LLMs like traditional ML | Different requirements | Consider GenAI tracing, KV cache, batching |

---

## Quick Reference Cards

### Component Stack Quick Reference

```
┌─────────────────────────────────────────────────────────────────┐
│ OPEN-SOURCE ML PLATFORM STACK                                   │
├─────────────────────────────────────────────────────────────────┤
│ Layer              │ Component    │ Key Feature                 │
│ ──────────────────┼──────────────┼─────────────────────────────│
│ Experiment Track   │ MLflow 3.x   │ GenAI tracing, model cards │
│ Model Registry     │ MLflow       │ Staging/production, aliases │
│ Feature Store      │ Feast        │ Online/offline, streaming  │
│ Model Serving      │ KServe       │ Serverless, ModelMesh      │
│ Orchestration      │ Airflow 3.x  │ Event-driven, assets       │
│ Distributed Train  │ KubeRay      │ Ray on K8s, auto-scaling   │
│ Drift Detection    │ Evidently    │ PSI, Wasserstein, alerts   │
│ Infrastructure     │ Kubernetes   │ HPA, KEDA, GPU scheduling  │
└─────────────────────────────────────────────────────────────────┘
```

### Latency Budget Quick Reference

```
┌─────────────────────────────────────────────────────────────────┐
│ INFERENCE LATENCY BUDGET (Target: 200ms P99)                    │
├─────────────────────────────────────────────────────────────────┤
│ Component              │ Budget   │ Typical    │ Notes          │
│ ──────────────────────┼──────────┼────────────┼────────────────│
│ Network (client→LB)    │ 20ms     │ 5-15ms     │ Geography      │
│ Istio routing          │ 5ms      │ 1-3ms      │ Service mesh   │
│ Feature lookup         │ 50ms     │ 15-25ms    │ Redis P99      │
│ Model inference        │ 100ms    │ 50-80ms    │ Model-dependent│
│ Post-processing        │ 10ms     │ 2-5ms      │ Response format│
│ Buffer                 │ 15ms     │ -          │ Safety margin  │
│ ──────────────────────┼──────────┼────────────┼────────────────│
│ TOTAL                  │ 200ms    │ 73-128ms   │                │
└─────────────────────────────────────────────────────────────────┘
```

### Scaling Thresholds Quick Reference

```
┌─────────────────────────────────────────────────────────────────┐
│ AUTO-SCALING TRIGGERS                                           │
├─────────────────────────────────────────────────────────────────┤
│ Metric                 │ Scale Up │ Scale Down │ Cooldown       │
│ ──────────────────────┼──────────┼────────────┼────────────────│
│ CPU Utilization        │ >70%     │ <30%       │ 5 min          │
│ Memory Utilization     │ >80%     │ <40%       │ 10 min         │
│ GPU Utilization        │ >80%     │ <20%       │ 15 min         │
│ Request Latency P99    │ >SLO     │ <50% SLO   │ 5 min          │
│ Queue Depth            │ >100     │ <10        │ 2 min          │
│ Concurrency            │ >target  │ <10% tgt   │ 60 sec         │
└─────────────────────────────────────────────────────────────────┘
```

### SLO Quick Reference

```
┌─────────────────────────────────────────────────────────────────┐
│ SLO TARGETS                                                     │
├─────────────────────────────────────────────────────────────────┤
│ Service          │ Availability │ Latency P99 │ Error Rate     │
│ ────────────────┼──────────────┼─────────────┼────────────────│
│ Model Serving    │ 99.9%        │ 200ms       │ <0.1%          │
│ Feature Serving  │ 99.9%        │ 50ms        │ <0.1%          │
│ MLflow Tracking  │ 99.5%        │ 500ms       │ <1%            │
│ Airflow          │ 99.5%        │ N/A         │ <5% task fail  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sample Interview Flow

### Minutes 0-5: Clarify

```
Candidate: "Before I design, I'd like to understand the requirements better.
           What types of ML models will this platform serve?"
Interviewer: "Primarily fraud detection and recommendation models."
Candidate: "Great. What's the expected scale?"
Interviewer: "About 500 models, 50 million predictions per day."
Candidate: "And latency requirements?"
Interviewer: "Fraud detection needs <100ms, recommendations can be 500ms."
Candidate: "Are these teams currently using any ML infrastructure?"
Interviewer: "They have some Jupyter notebooks and manual deployments."
Candidate: "Got it. I'll design a platform that handles both real-time
           and latency-tolerant workloads with a focus on operational
           maturity for the teams."
```

### Minutes 5-15: High-Level Design

```
Candidate: "Let me draw the architecture..."
           [Draws 5-layer diagram on whiteboard]

           "I'm proposing an OSS composition approach with:
            - MLflow for experiment tracking and model registry
            - Feast for feature management
            - KServe for model serving
            - Airflow for pipeline orchestration

           The key insight is making Feast the foundation - it ensures
           train-serve consistency, which is the #1 cause of ML bugs.

           For the fraud detection team's 100ms requirement, the inference
           path is: Request → Feature lookup (50ms budget) → Model (40ms) → Response."
```

### Minutes 15-30: Deep Dive

```
Candidate: "Let me go deep on the feature store since it's critical.

           Feast has a dual-store architecture:
           - Offline store (S3/Parquet) for training - handles point-in-time
             joins to prevent data leakage
           - Online store (Redis) for serving - P99 <50ms lookups

           The magic is that a single Python feature definition compiles
           to both batch Spark queries and real-time Redis lookups.

           For example, 'user_transaction_count_7d' is defined once but
           used in both training data generation and real-time inference.

           [Draws point-in-time join diagram]

           When the model trains on January 15th data, it sees the feature
           value from January 14th, not the current value. This prevents
           the model from 'seeing the future'."
```

### Minutes 30-40: Scale & Trade-offs

```
Interviewer: "What happens if Redis goes down?"

Candidate: "Good question. Feature store availability is critical.
           Our strategy:
           1. Redis Cluster with 6 nodes across 3 AZs - automatic failover
           2. Local cache in the transformer - 30% hot entity hit rate
           3. Circuit breaker - opens after 5 failures, returns defaults
           4. Graceful degradation - use default features, log for retraining

           The key trade-off is accuracy vs availability. With defaults,
           the model still runs but accuracy degrades. We track this as
           'feature_default_rate' and alert if it exceeds 5%."

Interviewer: "How would you handle 10x traffic spike?"

Candidate: "KServe auto-scales based on concurrency. At 10x:
           1. HPA triggers, scales pods in 2-3 minutes
           2. LocalModelCache prevents cold start delays
           3. If scaling can't keep up, we shed low-priority traffic
           4. For predictable spikes, we pre-scale

           But honestly, instantaneous 10x will cause some degradation.
           The goal is graceful degradation, not perfect performance."
```

### Minutes 40-45: Wrap Up

```
Candidate: "To summarize the key decisions:
           1. OSS composition for flexibility - we can adopt new tools
           2. Feature store as foundation - solves train-serve skew
           3. KServe for serverless inference - handles scale-to-zero
           4. Airflow for orchestration - familiar to data teams

           The unique challenge of this design is integration - we need
           strong platform engineering to keep the components working together.

           Any questions about specific aspects?"
```

---

## Related Topics for Further Study

| Topic | Relevance | Document |
|-------|-----------|----------|
| Uber Michelangelo | Enterprise feature store patterns | 3.5 |
| Netflix Metaflow | DAG-based pipeline design | 3.6 |
| Airbnb BigHead | OSS composition approach | 3.9 |
| MLOps Platform | Generic patterns | 3.4 |
| ML Models Deployment | Serving deep dive | 3.2 |
| Feature Store | Dedicated design | 3.16 |
