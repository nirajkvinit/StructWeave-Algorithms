# 12.21 AI-Native Creative Design Platform — Observability

## Observability Philosophy

The creative design platform has four distinct observability audiences with different needs:

1. **Engineering teams**: Generation latency, GPU utilization, error rates, pipeline throughput, infrastructure health
2. **ML teams**: Model quality metrics, generation success rates, safety filter accuracy, cache hit rates
3. **Product teams**: User engagement with AI features, generation-to-edit ratios, template conversion, collaboration adoption
4. **Finance/operations**: GPU cost per generation, cost per active user, infrastructure cost allocation

Each audience requires purpose-built metrics and dashboards. Raw GPU utilization is necessary but insufficient—the system must emit semantic metrics from within the generation pipeline (e.g., "brand violation rate per model version") that cannot be inferred from infrastructure counters alone.

---

## Key Metrics

### AI Generation Quality Metrics (ML)

| Metric | Description | Alert Threshold |
|---|---|---|
| **Generation success rate** | % of generation requests that complete without error or safety block | < 95% → model or infrastructure issue |
| **Brand violation rate** | % of generated designs with at least one brand constraint violation (before correction) | > 30% → model conditioning quality degradation |
| **Content safety block rate** | % of generated images blocked by safety classifier | > 5% → prompt classifier may be passing unsafe prompts; or model producing more unsafe content |
| **Safety false positive rate** | % of safety-blocked images confirmed safe by human review | > 2% → safety model retraining needed |
| **Generation cache hit rate** | % of generation requests served from cache | < 10% → cache key strategy review |
| **Layout overlap score** | Average overlap area between elements in generated layouts | > 5% overlap area → layout model quality regression |
| **User regeneration rate** | % of AI generations followed by immediate regeneration (same prompt, new seed) | > 40% → generation quality not meeting user expectations |
| **User edit-after-generation ratio** | Average number of manual edits users make to AI-generated designs before publishing | Track trend; sudden increase indicates model quality regression |
| **Brand enforcement correction count** | Average corrections applied by brand enforcer per generation | > 5 corrections → model not learning brand conditioning effectively |

### Generation Pipeline Performance (Engineering)

| Metric | Description | Alert Threshold |
|---|---|---|
| **Text-to-design e2e p95 latency** | End-to-end generation latency including all subtasks | > 5 s (SLO breach) |
| **Image generation p95 latency** | Diffusion model inference time only | > 3.5 s (consumes too much latency budget) |
| **Layout generation p95 latency** | Layout transformer inference time | > 800 ms |
| **Prompt interpretation p95 latency** | LLM intent extraction time | > 600 ms |
| **Brand validation p99 latency** | Deterministic rule engine execution time | > 200 ms |
| **GPU queue depth** | Number of generation requests waiting for GPU allocation | > 500 → capacity issue; scale GPU pool |
| **GPU utilization** | Average GPU compute utilization across fleet | < 50% → over-provisioned (cost waste); > 85% → under-provisioned (latency risk) |
| **Generation job failure rate** | % of generation jobs that fail (all subtask retries exhausted) | > 2% → investigate; likely GPU health or model issue |

### Collaboration Metrics (Engineering)

| Metric | Description | Alert Threshold |
|---|---|---|
| **Collaboration sync latency p95** | Time from operation submission to all participants receiving update | > 100 ms (SLO breach) |
| **CRDT merge conflict rate** | % of operations requiring conflict resolution (human-human or human-AI) | > 5% → investigate; high conflict rate indicates UX or AI timing issues |
| **WebSocket disconnection rate** | % of active sessions experiencing disconnection per hour | > 1% → network or CRDT engine health issue |
| **Session recovery time p95** | Time to rebuild session state after WebSocket reconnection | > 2 s → checkpoint frequency or state size issue |
| **AI-human spatial conflict rate** | % of AI generation operations with spatial conflicts against concurrent human edits | > 10% → improve presence-aware generation; extend soft-lock zone |

### User Engagement Metrics (Product)

| Metric | Description | Alert Threshold |
|---|---|---|
| **AI generation adoption rate** | % of active users who use AI generation features per month | Track trend; used for feature investment decisions |
| **Generation-to-publish ratio** | % of AI-generated designs that are exported or published | < 20% → generation quality not useful enough for production use |
| **Template conversion rate** | % of template browsing sessions that result in a design being created from template | < 15% → template discovery or quality issue |
| **Brand kit activation rate** | % of enterprise designs with an active brand kit | < 50% in enterprise → brand kit onboarding or usability issue |
| **Magic resize usage** | % of designs that are resized to at least 2 additional formats | Tracks multi-format content creation adoption |

### Cost Metrics (Finance)

| Metric | Description | Alert Threshold |
|---|---|---|
| **GPU cost per generation** | Dollar cost per AI generation request (blended across all generation types) | > $0.008 → optimization review needed |
| **GPU cost per monthly active user** | Total GPU cost / MAU | > $0.15 → cost model unsustainable for free-tier users |
| **Cache savings ratio** | GPU cost avoided due to cache hits / total potential GPU cost | < 10% → cache strategy review |
| **Storage cost per user** | Total storage cost / active users | Track trend; alert on > 20% month-over-month increase |

---

## Distributed Tracing

Every generation request receives a trace_id at the API gateway. This trace propagates through all pipeline stages:

```
Trace propagation:
  User triggers generation → trace_id generated at API gateway
  ↓
  Generation orchestrator → trace_id in orchestration context
    ↓ prompt interpretation → trace_id in LLM inference request
    ↓ layout generation → trace_id in transformer inference request
    ↓ image generation → trace_id in diffusion inference request (per image)
    ↓ text generation → trace_id in LLM inference request
    ↓ brand validation → trace_id in validation context
    ↓ content safety → trace_id in classifier request
    ↓ CRDT merge → trace_id in collaboration operation
  ↓
  Client render → trace_id available for client-side performance tracking

Use cases:
  - Debug slow generation: trace shows which subtask consumed the most latency
    (image generation 3,200 ms vs. typical 2,500 ms → GPU contention identified)
  - Investigate safety false positive: trace links blocked image to specific prompt,
    model version, and safety classifier confidence score
  - Track brand violation: trace shows which model output violated which brand rule,
    and whether the enforcer's correction was applied or failed
  - Cost attribution: trace includes GPU-seconds consumed per subtask;
    aggregate by user/workspace for cost allocation
```

---

## Alerting and On-Call Design

### Alert Tiers

| Tier | Condition | Response |
|---|---|---|
| **SEV-1 (Page immediately)** | Content safety classifier unavailable (all AI generation must stop); design document store write failure; collaboration service total failure | On-call engineer paged immediately; content safety → all generation blocked until service restored |
| **SEV-2 (Page within 15 min)** | Generation p95 latency > 8 s; GPU pool utilization > 90% sustained; export renderer backlog > 10,000 jobs; WebSocket disconnection rate > 5% | On-call engineer paged; GPU auto-scaling triggered |
| **SEV-3 (Alert in business hours)** | Brand violation rate > 30%; safety false positive rate > 2%; generation cache hit rate < 5%; user regeneration rate > 50% | ML engineer notified next business day; model quality review |
| **SEV-4 (Weekly digest)** | GPU cost per generation trending up; storage growth exceeding projections; template conversion rate declining; collaboration adoption trending down | Product + engineering leadership weekly report |

### On-Call Rotation Structure

```
On-call rotations:
  1. Infrastructure on-call: GPU fleet, document store, asset pipeline, networking
     Scope: hardware failures, capacity issues, networking outages
     Rotation: weekly, 2-person team (primary + secondary)

  2. AI/ML on-call: generation pipeline, safety classifiers, model serving
     Scope: model quality regressions, safety incidents, GPU inference failures
     Rotation: weekly, 2-person team (ML engineer + platform engineer)

  3. Content safety on-call: escalated safety reviews, policy violations
     Scope: safety false negatives (unsafe content displayed), DMCA takedowns, policy updates
     Rotation: daily, trust & safety team member

  Escalation path:
    Automated alert → primary on-call → secondary on-call → engineering manager → VP Engineering
    Safety incidents: parallel notification to legal team and trust & safety lead
```

---

## Dashboards

### Generation Pipeline Dashboard

```
Panels:
  [1] Generation request rate (requests/sec, 1-min resolution, by generation type)
  [2] Generation latency heatmap (p50/p95/p99, by subtask: prompt/layout/image/text/brand)
  [3] GPU pool utilization (% utilization per pool: image/layout/safety)
  [4] GPU queue depth (waiting requests per pool, 1-min resolution)
  [5] Generation success rate (%, with breakdown: success/safety-blocked/error/timeout)
  [6] Cache hit rate (%, 15-min resolution)
  [7] Active model versions (table: service, model version, traffic %, deployed_at)
  [8] Generation cost ($/hour, broken down by model type)
```

### Content Safety Dashboard

```
Panels:
  [1] Safety block rate by category (NSFW, violence, copyright, deepfake — stacked bar, daily)
  [2] False positive rate (confirmed-safe blocks / total blocks, weekly trend)
  [3] Prompt classifier confidence distribution (histogram, daily snapshot)
  [4] Human review queue depth and review SLA compliance (% reviewed within 4h/24h)
  [5] DMCA takedown requests (count per week, resolution time)
  [6] Adversarial prompt detection rate (count of detected prompt injection attempts)
```

### Collaboration Health Dashboard

```
Panels:
  [1] Active collaborative sessions (count, 5-min resolution)
  [2] Sync latency p50/p95/p99 (line chart, 1-min resolution)
  [3] CRDT merge conflict rate (%, by conflict type: spatial/deletion/style)
  [4] WebSocket disconnection rate (%, per region)
  [5] AI-human conflict rate (%, 1-hour resolution)
  [6] Session recovery time distribution (histogram, daily)
```

### Business Metrics Dashboard

```
Panels:
  [1] AI generation adoption funnel: MAU → AI users → published AI designs (monthly)
  [2] Generation-to-publish ratio (%, by generation type, weekly trend)
  [3] User regeneration rate (%, weekly — lower is better)
  [4] Brand kit activation rate by enterprise customer (table, monthly)
  [5] GPU cost per MAU ($/user, monthly trend)
  [6] Top template categories by generation volume (bar chart, weekly)
```

---

## Model Monitoring and Quality Tracking

### Generation Quality Drift Detection

```
Process:
  Daily job: sample 10,000 generated designs from production
  Compute:
    - Layout quality score: overlap %, whitespace balance, hierarchy compliance
    - Image quality score: FID (Fréchet Inception Distance) against reference set
    - Brand compliance rate: % passing brand validation on first attempt
    - User satisfaction proxy: regeneration rate for sampled designs

  Thresholds:
    FID increase > 10% from baseline → model quality regression alert
    Layout overlap > 5% → layout model review
    Brand compliance < 70% → conditioning pipeline review
    Regeneration rate > 40% → user experience degradation alert

  Baseline:
    Established at each model version deployment
    Refreshed quarterly with new reference sets
```

### A/B Testing Framework for Model Versions

```
Framework:
  When deploying a new model version:
    1. Route 5% of generation traffic to new model (canary)
    2. Compare metrics against stable model:
       - Generation latency (must not regress > 10%)
       - User regeneration rate (must not increase > 5 percentage points)
       - Safety block rate (must not decrease — safety must not regress)
       - Brand violation rate (must not increase > 5 percentage points)
    3. After 7 days: if all metrics pass, promote to 50%; then 100% after 3 more days
    4. If any metric fails: auto-rollback to stable version; alert ML team

  Safety constraint: new model versions NEVER reduce safety thresholds
  Rollback latency: < 5 minutes (model version is a configuration flag, not a deployment)
```
