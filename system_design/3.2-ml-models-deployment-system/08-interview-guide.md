# Interview Guide

## 45-Minute Interview Pacing

### Time Allocation

| Phase | Time | Focus | Key Deliverables |
|-------|------|-------|------------------|
| **Clarify** | 0-5 min | Understand requirements | Model type, scale, latency SLO |
| **High-Level Design** | 5-15 min | Architecture | System diagram, data flow |
| **Deep Dive** | 15-30 min | Critical component | Batching OR A/B testing OR GPU memory |
| **Scale & Reliability** | 30-40 min | Production concerns | Scaling, failures, trade-offs |
| **Wrap Up** | 40-45 min | Summary | Key decisions, open questions |

---

## Phase-by-Phase Guide

### Phase 1: Clarification (0-5 minutes)

**Questions to Ask the Interviewer:**

| Question | Why It Matters | Expected Answers |
|----------|---------------|------------------|
| "What type of models? LLMs, CV, tabular?" | Batching strategy, GPU requirements | Usually mix, focus on one |
| "What's the latency requirement?" | Architecture decisions | Real-time: <100ms, Batch: seconds |
| "Expected QPS at peak?" | Scaling strategy | 100 → simple, 100K → distributed |
| "Do we need A/B testing?" | Routing complexity | Usually yes for ML |
| "Is model accuracy/drift monitoring needed?" | Observability scope | Usually yes |
| "Multi-region or single region?" | Consistency, complexity | Start single, mention multi |

**Sample Clarification Dialogue:**

> "Before I start designing, let me understand the requirements. Are we serving LLMs, computer vision models, or tabular models? ... What latency are we targeting - is this real-time user-facing or can we have some batching delay? ... What's the expected peak QPS? ... Do we need to support A/B testing between model versions?"

### Phase 2: High-Level Design (5-15 minutes)

**What to Draw:**

```
┌─────────────────────────────────────────────────────────────────┐
│  HIGH-LEVEL ARCHITECTURE (Draw this on whiteboard)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    Clients ──► Load Balancer ──► Gateway ──► A/B Router         │
│                                      │                          │
│                               ┌──────┴──────┐                   │
│                               ▼              ▼                  │
│                         Model Pool A    Model Pool B            │
│                         (Production)    (Canary 5%)             │
│                               │              │                  │
│                               ▼              ▼                  │
│                          GPU Workers (Dynamic Batching)         │
│                               │                                 │
│                    ┌──────────┼──────────┐                      │
│                    ▼          ▼          ▼                      │
│              Model Registry  Prediction   Metrics               │
│              (Artifacts)     Logger       Store                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Points to Mention:**

1. **Gateway Layer**: Auth, rate limiting, request validation
2. **A/B Router**: Consistent hashing for user assignment
3. **Model Server Pools**: Separate pools per model/version
4. **Dynamic Batching**: Trade latency for throughput
5. **GPU Workers**: Actual inference execution
6. **Model Registry**: Version control for models
7. **Observability**: Prediction logging, metrics, drift detection

### Phase 3: Deep Dive (15-30 minutes)

**Choose ONE area based on interviewer interest or your strength:**

#### Option A: Dynamic Batching Deep Dive

**Key Points:**
- Why batching? GPU efficiency (10% → 80% utilization)
- Static vs Dynamic vs Continuous batching
- Trade-off: latency vs throughput
- Algorithm: queue with timeout, max batch size

**Whiteboard:**
```
Dynamic Batching Algorithm:

1. Request arrives → add to queue
2. Check: batch_size >= MAX_BATCH_SIZE?
   → Yes: process immediately
3. Check: oldest_request > MAX_WAIT_TIME?
   → Yes: process current batch
4. Wait and collect more requests

Config: MAX_BATCH_SIZE=32, MAX_WAIT_TIME=50ms
```

**Follow-up Points:**
- Continuous batching for LLMs (iteration-level scheduling)
- PagedAttention for memory efficiency
- vLLM's approach: 5-10x throughput improvement

#### Option B: A/B Testing Deep Dive

**Key Points:**
- Why A/B test models? Validate improvements safely
- Consistent assignment: hash(user_id + experiment_id)
- Statistical significance: sample size calculation
- Guardrail metrics: stop if latency/errors spike

**Whiteboard:**
```
A/B Testing Flow:

1. Request with user_id arrives
2. hash(user_id + exp_id) % 100
   → 0-9: Treatment (10%)
   → 10-99: Control (90%)
3. Route to appropriate model pool
4. Log: user_id, variant, prediction
5. Analyze: calculate conversion rate per variant
6. When significant: promote or rollback

Sample Size Formula:
n = 2 * (z_α + z_β)² * p(1-p) / (MDE)²
Example: 5% baseline, 10% MDE → ~31,000/variant
```

#### Option C: GPU Memory Deep Dive

**Key Points:**
- GPU memory is the primary constraint
- Model weights + KV cache + activations
- LLM memory: 70B model = 140GB (FP16)
- KV cache can be 60-80% of memory for long sequences

**Whiteboard:**
```
Memory Breakdown (LLaMA-70B):

Model weights: 70B × 2 bytes = 140GB
KV Cache (per token): 2 × 80 layers × 8192 dim × 8 heads × 2 bytes
                    = 20.97 MB/token
                    × 4096 tokens = 86GB

Solutions:
1. Quantization: INT8 → 70GB, INT4 → 35GB
2. Tensor Parallel: Split across 2+ GPUs
3. PagedAttention: Block-based KV allocation
```

### Phase 4: Scale & Reliability (30-40 minutes)

**Topics to Cover:**

| Topic | Key Points | Numbers to Mention |
|-------|------------|-------------------|
| **Scaling** | GPU auto-scaling based on utilization | Target: 70% GPU util |
| **Cold Start** | Model loading takes 30s-5min | Pre-warm critical models |
| **Failure Handling** | GPU failure, model corruption | Fallback to smaller model |
| **Multi-Region** | Model artifact replication | Async sync, <15min |
| **Drift** | PSI for data drift | Alert if PSI > 0.2 |

**Failure Scenarios to Discuss:**

```
Scenario: GPU Failure
1. Health check detects failure
2. Pod marked unhealthy, traffic routed away
3. New pod scheduled (cold start: 30s-5min)
4. Meanwhile: other replicas handle load
5. If capacity insufficient: enable fallback model

Scenario: Model Corruption
1. Checksum validation fails on load
2. Alert + block deployment
3. Rollback to last known good version
4. Root cause investigation
```

### Phase 5: Wrap Up (40-45 minutes)

**Summary Template:**

> "To summarize, we designed an ML model serving system with:
>
> 1. **Gateway layer** for auth, rate limiting, and A/B routing
> 2. **Model server pools** with dynamic batching for efficiency
> 3. **GPU workers** with PagedAttention for memory management
> 4. **Model registry** for version control and rollback
> 5. **Comprehensive observability** including drift detection
>
> Key trade-offs:
> - Batching: higher latency for better throughput
> - A/B testing: slower rollouts for safety
> - Quantization: slight accuracy loss for 2x memory savings
>
> For production, I'd prioritize building the drift detection pipeline as models degrade over time."

---

## Key Trade-offs to Discuss

### Trade-off Matrix

| Trade-off | Option A | Option B | Recommendation |
|-----------|----------|----------|----------------|
| **Latency vs Throughput** | No batching (low latency) | Batching (high throughput) | Dynamic batching with timeout |
| **Accuracy vs Latency** | Large model (accurate) | Quantized model (fast) | Quantize, monitor accuracy |
| **Freshness vs Stability** | Instant deploy | Canary + A/B | Always canary for ML |
| **Cost vs Availability** | Single GPU | Redundant GPUs | Redundant for production |
| **Simplicity vs Features** | Single model | Multi-model serving | Multi-model saves cost |

### Trade-off Deep Dive: Batching

```
Scenario: 1000 QPS, 50ms inference time

Without Batching:
- Each request: 50ms on GPU
- GPU can handle: 20 requests/second
- Need: 50 GPUs

With Dynamic Batching (batch_size=32):
- Batch inference: 60ms (slightly longer)
- GPU can handle: 32 × (1000ms/60ms) = 533 requests/second
- Need: 2 GPUs

Trade-off:
- Latency increases: 50ms → 60ms + 25ms avg wait = 85ms
- Cost decreases: 50 GPUs → 2 GPUs (25x savings)
```

---

## Trap Questions and Answers

### Trap 1: "Why not just deploy models as regular microservices?"

**Bad Answer:** "Yeah, we can just containerize the model and deploy it."

**Good Answer:**
> "ML models have fundamentally different characteristics from regular services:
>
> 1. **GPU Requirements**: Models need GPUs which are 10-100x more expensive. We need efficient utilization through batching.
>
> 2. **Cold Start**: Loading a 70B model takes 5+ minutes vs milliseconds for a regular service. We need warm pools.
>
> 3. **Batching**: GPUs are efficient with batched operations. Regular request/response doesn't leverage this.
>
> 4. **Versioning**: Model versions need A/B testing with statistical significance, not just rolling updates.
>
> 5. **Monitoring**: We need drift detection, not just latency/errors. Models degrade silently.
>
> That's why we need specialized ML serving infrastructure."

### Trap 2: "How do you update models without downtime?"

**Bad Answer:** "Just do a rolling update."

**Good Answer:**
> "Model updates are trickier than code deploys because:
>
> 1. **Warm-up Required**: New model needs warm-up inference before serving real traffic. We load the model, run warm-up, then shift traffic.
>
> 2. **Canary Strategy**: We don't immediately shift 100% traffic. Start with 1-5% canary to verify metrics.
>
> 3. **Atomic Swap**: Within a pod, we load the new model while the old one serves traffic, then atomically swap the reference.
>
> 4. **Graceful Drain**: Old model handles in-flight requests before being unloaded.
>
> The sequence is: Load → Warm-up → Health check → Canary → Gradual rollout → Full production."

### Trap 3: "What if the model is too large for one GPU?"

**Bad Answer:** "We just need bigger GPUs."

**Good Answer:**
> "For models exceeding single GPU memory, we have several strategies:
>
> 1. **Quantization**: INT8 gives 2x reduction, INT4 gives 4x. A 70B model goes from 140GB to 35GB (INT4), fitting on one 80GB GPU.
>
> 2. **Tensor Parallelism**: Split each layer across GPUs. For 70B on 2 GPUs, each holds half the weights. Requires high-bandwidth NVLink.
>
> 3. **Pipeline Parallelism**: Split by layers. GPU 1 has layers 1-40, GPU 2 has 41-80. Good for very large models.
>
> 4. **Combined TP+PP**: For 175B+ models, use both. For example, TP=4 × PP=2 = 8 GPUs.
>
> Trade-offs: Quantization loses some accuracy. Parallelism adds communication overhead. vLLM and TensorRT-LLM handle this automatically."

### Trap 4: "How do you know when to retrain the model?"

**Bad Answer:** "We retrain on a schedule, like monthly."

**Good Answer:**
> "Scheduled retraining is a baseline, but we need monitoring to catch issues:
>
> 1. **Data Drift Detection**: Monitor input feature distributions using PSI (Population Stability Index). If PSI > 0.2, investigate. This catches distribution shifts before they impact accuracy.
>
> 2. **Concept Drift Detection**: If we have labels, monitor accuracy/F1 directly. A 5%+ drop triggers investigation.
>
> 3. **Proxy Metrics**: Without labels, monitor prediction confidence distribution, class distribution, and feature importance stability.
>
> 4. **Business Metrics**: Ultimately, monitor downstream metrics like conversion rate. If conversion drops despite stable traffic, investigate model.
>
> Retraining triggers: PSI > 0.2, accuracy drop > 5%, or scheduled (as fallback). Always A/B test the new model before full deployment."

### Trap 5: "What's your A/B testing sample size?"

**Bad Answer:** "We run it for a week and see what happens."

**Good Answer:**
> "Sample size depends on the effect size we want to detect and statistical requirements:
>
> Formula: n = 2 × (z_α + z_β)² × p(1-p) / (MDE)²
>
> For typical ML A/B tests:
> - Baseline rate (p): 5% conversion
> - Minimum Detectable Effect (MDE): 10% relative
> - Significance (α): 5% (z_α = 1.96)
> - Power: 80% (z_β = 0.84)
>
> This gives us ~31,000 samples per variant, or 62,000 total.
>
> At 1,000 QPS with 10% in treatment: 100 treatment/sec × 310 seconds = ~5 minutes to reach sample size.
>
> But we also add:
> 1. **Minimum runtime**: 24+ hours to catch time-of-day effects
> 2. **Guardrail metrics**: Latency, error rate must not degrade
> 3. **Sequential testing**: To avoid peeking problems, use alpha spending functions"

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| Ignoring GPU constraints | GPUs are the primary constraint | Design around GPU memory and utilization |
| No batching discussion | Huge efficiency loss | Always discuss batching trade-offs |
| Rolling updates for models | Cold start kills latency | Warm-up → canary → gradual rollout |
| Single region only | Not production-ready | At least mention multi-region for DR |
| Ignoring drift | Models degrade silently | Always include drift monitoring |
| Complex A/B routing | Unnecessary complexity | Simple consistent hashing works |
| No fallback strategy | Single point of failure | Always have fallback model/cached responses |

---

## Questions to Ask the Interviewer

1. "Are we optimizing for latency or throughput primarily?"
2. "Do we expect the model types to change frequently, or is this a stable set?"
3. "Is there an existing feature store we need to integrate with?"
4. "What's the team's familiarity with Kubernetes and GPU orchestration?"
5. "Are there compliance requirements (GDPR, model explainability)?"
6. "What's the budget constraint for GPU infrastructure?"

---

## Quick Reference Card

### Key Numbers to Memorize

| Metric | Value | Context |
|--------|-------|---------|
| **Latency SLO** | <100ms p99 | Non-LLM real-time |
| **LLM TTFT** | <200ms | Time to first token |
| **LLM TPS** | >50 | Tokens per second |
| **GPU Utilization** | >70% target | Cost efficiency |
| **Batch Wait** | 10-50ms | Latency/throughput trade-off |
| **Model Load** | 30s-5min | Cold start time |
| **PSI Threshold** | <0.2 | Data drift alert |
| **A/B Sample Size** | ~31K/variant | 5% baseline, 10% MDE |
| **Canary Traffic** | 1-5% | Initial rollout |
| **Error Budget** | 52.6 min/year | 99.99% availability |

### Architecture Components Checklist

- [ ] Load Balancer (geo-aware)
- [ ] Inference Gateway (auth, rate limit)
- [ ] A/B Router (consistent hashing)
- [ ] Model Server Pools (per model/version)
- [ ] Dynamic Batcher (or continuous for LLM)
- [ ] GPU Workers
- [ ] Model Registry
- [ ] Prediction Logger
- [ ] Drift Detector
- [ ] Alert Manager

### Trade-off Decisions Checklist

- [ ] gRPC vs REST (hybrid recommended)
- [ ] Static vs Dynamic vs Continuous batching
- [ ] Quantization level (FP16/INT8/INT4)
- [ ] Tensor vs Pipeline parallelism
- [ ] Gateway vs Sidecar A/B routing
- [ ] Pre-loaded vs Lazy model loading

---

## Scoring Rubric (Interviewer Perspective)

### What Separates Good from Great

| Aspect | Good (Hire) | Great (Strong Hire) |
|--------|-------------|---------------------|
| **Requirements** | Asks about scale | Asks about model types, latency tiers |
| **Architecture** | Draws coherent diagram | Explains why each component exists |
| **Batching** | Mentions batching | Explains continuous batching, PagedAttention |
| **A/B Testing** | Mentions traffic splitting | Discusses sample size, statistical significance |
| **Failures** | Mentions redundancy | Designs graceful degradation levels |
| **Monitoring** | Mentions metrics | Discusses data drift, concept drift |
| **Trade-offs** | Identifies trade-offs | Quantifies trade-offs with numbers |

### Red Flags

- Doesn't ask clarifying questions
- Ignores GPU/hardware constraints
- No discussion of model versioning/rollback
- Treats it like a stateless microservice
- No mention of monitoring beyond latency/errors
- Can't explain batching trade-offs
- Proposes instant 100% rollout without canary

### Green Flags

- Immediately asks about model type and latency
- Draws GPU memory calculations
- Discusses PagedAttention or continuous batching
- Mentions statistical significance for A/B tests
- Designs fallback chains for failures
- Mentions data drift detection
- Quantifies trade-offs with specific numbers
