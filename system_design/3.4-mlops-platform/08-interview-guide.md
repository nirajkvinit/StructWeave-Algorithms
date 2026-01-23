# Interview Guide

[Back to Index](./00-index.md)

---

## Interview Pacing (45-Minute Format)

| Phase | Time | Focus | Deliverables |
|-------|------|-------|--------------|
| **Clarify** | 0-5 min | Understand requirements, scope | Scale, team size, model types, constraints |
| **High-Level** | 5-15 min | Architecture overview | Core components diagram, data flow |
| **Deep Dive** | 15-30 min | One critical component | Detailed design of scheduler OR tracker OR registry |
| **Scale & Reliability** | 30-40 min | Production concerns | Bottlenecks, failures, trade-offs |
| **Wrap Up** | 40-45 min | Summary, extensions | Key decisions, open questions |

---

## Phase 1: Clarification Questions (0-5 min)

### Questions to Ask

```
MUST ASK:
1. "What's the scale we're designing for?"
   - Number of data scientists
   - Experiments per day
   - Model sizes

2. "What types of models are being trained?"
   - Traditional ML (XGBoost, sklearn)
   - Deep learning (PyTorch, TensorFlow)
   - Large language models

3. "What's the read/write pattern?"
   - Heavy experimentation vs production pipelines
   - Interactive development vs batch training

CLARIFYING QUESTIONS:
4. "Do we need distributed training support?"
5. "Are there compliance/governance requirements?"
6. "Should we integrate with an existing feature store?"
7. "What's the expected model artifact size?"
```

### Expected Answers to Frame Design

| Question | Small Scale | Large Scale |
|----------|-------------|-------------|
| Data scientists | 10-50 | 500+ |
| Experiments/day | 100s | 10,000s |
| Model size | < 1GB | 10-100GB+ |
| Training duration | < 1 hour | Days |
| Distributed training | Optional | Required |

---

## Phase 2: High-Level Design (5-15 min)

### Drawing the Architecture

```
START WITH:
"The MLOps platform has three core components:
1. Pipeline Orchestrator - manages training workflows
2. Experiment Tracker - logs runs, metrics, artifacts
3. Model Registry - versions and governs production models"

DRAW THIS:

    ┌─────────────────────────────────────────────────────────┐
    │                      Clients                             │
    │   SDK  │  CLI  │  Web UI  │  CI/CD                      │
    └────────────────────┬────────────────────────────────────┘
                         │
                         ▼
    ┌─────────────────────────────────────────────────────────┐
    │                   API Gateway                            │
    │            (Auth, Rate Limiting)                         │
    └────────────────────┬────────────────────────────────────┘
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
    ┌────────────┐ ┌────────────┐ ┌────────────┐
    │  Pipeline  │ │ Experiment │ │   Model    │
    │ Orchestrator│ │  Tracker   │ │  Registry  │
    └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
          │              │              │
          └──────────────┼──────────────┘
                         ▼
    ┌─────────────────────────────────────────────────────────┐
    │                  Storage Layer                           │
    │  Metadata DB │ Metric Store │ Artifact Store            │
    └─────────────────────────────────────────────────────────┘

EXPLAIN:
"Clients interact via SDKs for logging, CLI for ops, and Web UI for visualization.
The API Gateway handles authentication and routes to appropriate services.
Each service is stateless and can scale independently.
Storage is separated by access pattern - OLTP for metadata, time-series for metrics,
object storage for artifacts."
```

### Key Points to Cover

1. **Why three separate services?**
   - Different scaling characteristics
   - Different consistency requirements
   - Independent deployment

2. **Data flow for training run:**
   - Pipeline submits job → Scheduler dispatches → Executor runs
   - Executor logs metrics to tracker → Uploads artifacts → Registers model

3. **Critical path identification:**
   - Write path: Metric ingestion must be high-throughput
   - Read path: Model serving needs fast alias resolution

---

## Phase 3: Deep Dive (15-30 min)

### Option A: Pipeline Scheduler Deep Dive

```
INTERVIEWER: "Let's go deeper on the pipeline scheduler."

KEY POINTS TO COVER:

1. DAG Scheduling
   "We use topological sort to determine execution order.
   Tasks are enqueued when all dependencies complete."

   Algorithm:
   - Maintain in-degree count for each task
   - Tasks with in-degree 0 go to ready queue
   - On task completion, decrement dependent in-degrees
   - Priority queue for ready tasks (deadline, wait time, resources)

2. Checkpoint Strategy
   "Long-running training jobs checkpoint every N minutes.
   On failure, we restore from checkpoint instead of restarting."

   - Store checkpoint in object storage
   - Record checkpoint metadata in database
   - Keep last 3 checkpoints per task
   - Resume uses latest valid checkpoint

3. Resource Management
   "We track GPU/CPU/memory per node.
   Task placement considers resource fit and data locality."

   - Resource pool tracks available capacity
   - Placement algorithm minimizes fragmentation
   - Spot instance handling with graceful preemption
```

### Option B: Experiment Tracker Deep Dive

```
INTERVIEWER: "How do you handle high-throughput metric ingestion?"

KEY POINTS TO COVER:

1. Write Path Optimization
   "We batch metrics client-side and write async to reduce API calls."

   - SDK buffers metrics for 100ms or 1000 items
   - API accepts batches up to 10K metrics
   - Writes go to in-memory buffer, flushed async to ClickHouse

2. Storage Architecture
   "We use tiered storage - hot for recent, warm for 90 days, cold archived."

   Schema: (run_id, key, value, step, timestamp)
   Partitioning: By month for efficient TTL
   Ordering: (run_id, key, step) for fast time-series queries

3. Query Optimization
   "We pre-compute aggregations in materialized views."

   Views:
   - metric_latest: Last value per (run_id, key)
   - metric_summary: Min/max/avg per (run_id, key)
```

### Option C: Model Registry Deep Dive

```
INTERVIEWER: "How do you ensure alias updates are atomic?"

KEY POINTS TO COVER:

1. Alias Atomicity
   "We use distributed locks to serialize alias updates."

   - Acquire lock on (model_name, alias)
   - Verify version exists
   - Update alias in transaction
   - Release lock
   - Publish event for consumers

2. Large Artifact Handling
   "We use chunked uploads with deduplication."

   - Split files into 100MB chunks
   - Parallel upload (4 concurrent)
   - Content-addressed storage for dedup
   - Presigned URLs for downloads

3. Stage Transition Governance
   "Production promotion requires model card and approval."

   Workflow:
   None → Staging (automated tests)
   Staging → Production (manager approval + bias check)
   Production → Archived (when superseded)
```

---

## Phase 4: Scale & Reliability (30-40 min)

### Bottleneck Discussion

```
INTERVIEWER: "What are the main bottlenecks?"

ANSWER:

"Three main bottlenecks:

1. METRIC WRITE THROUGHPUT
   Problem: 100K+ metrics/sec during distributed training
   Solution: Client batching, async writes, ClickHouse sharding
   Trade-off: Slight delay (100ms) vs immediate consistency

2. ARTIFACT STORAGE I/O
   Problem: LLMs can be 50-100GB
   Solution: Chunked parallel uploads, CDN for downloads, deduplication
   Trade-off: Complexity vs upload reliability

3. EXPERIMENT SEARCH
   Problem: Complex queries across millions of runs
   Solution: Elasticsearch for full-text, materialized views for metrics
   Trade-off: Storage cost vs query performance"
```

### Failure Scenario Discussion

```
INTERVIEWER: "What happens if the scheduler fails?"

ANSWER:

"The scheduler uses leader election with standbys.

Detection: Leader lease expires after 30 seconds
Recovery: Standby automatically promotes
State: Persisted in PostgreSQL, rebuilt on startup

Running tasks continue - they checkpoint progress.
Pending tasks wait in queue - no data loss.
New submissions queue until new leader elected.

RTO: 30-60 seconds
RPO: 0 (all state in persistent storage)"

INTERVIEWER: "What if a training node fails mid-job?"

ANSWER:

"We detect via heartbeat timeout (30 seconds).

If checkpointed: Reschedule on new node, restore checkpoint
If not: Retry from beginning

For spot instances: 2-minute warning triggers checkpoint
We prioritize checkpointable tasks on spot for cost savings."
```

---

## Trade-offs Discussion

### Key Trade-off Table

| Trade-off | Option A | Option B | Recommendation |
|-----------|----------|----------|----------------|
| **Pipeline Definition** | YAML (declarative) | Python (code-first) | **Hybrid** - Python SDK that serializes to YAML |
| **Metric Storage** | PostgreSQL (simple) | ClickHouse (specialized) | **ClickHouse** - high cardinality support |
| **Artifact Storage** | Database BLOBs | Object Storage | **Object Storage** - scalable, cost-effective |
| **Registry Consistency** | Eventual | Strong | **Strong** - aliases must be atomic |
| **Git vs Custom Registry** | Git LFS | Custom registry | **Custom** - need metadata, aliases, governance |

### Explaining Trade-offs

```
INTERVIEWER: "Why not use Git for model versioning?"

ANSWER:

"Git is optimized for source code, not ML artifacts. Five reasons:

1. SIZE: Git stores full copies of binaries. A 10GB model x 100 versions = 1TB.
   Object storage with deduplication handles this better.

2. METADATA: We need queryable metrics, parameters, not just diffs.
   'Find all models with accuracy > 0.95' isn't a Git operation.

3. LINEAGE: Need to track data version, feature set, environment.
   Git tracks code, not the full ML provenance.

4. ALIASES: We need @champion, @production pointers that update atomically.
   Git branches don't map cleanly to model lifecycle.

5. GOVERNANCE: Need approval workflows, not just merge permissions.
   Stage transitions require auditing, not just commits."
```

---

## Trap Questions and Answers

### Trap 1: "Why not just use a database for metrics?"

```
WHAT INTERVIEWER WANTS:
Understand trade-offs between general-purpose and specialized storage.

BAD ANSWER:
"Databases can handle metrics fine."

GOOD ANSWER:
"PostgreSQL would work at small scale, but has issues at scale:

1. CARDINALITY: Millions of unique run IDs create index bloat
2. COMPRESSION: Time-series data compresses 10-20x in specialized stores
3. QUERIES: Aggregations across millions of rows are slow without columnar

ClickHouse (or TimescaleDB) is purpose-built:
- Columnar storage for efficient aggregations
- High cardinality tolerance
- Built-in TTL and tiered storage

At <1M metrics/day, PostgreSQL is fine. Above that, switch to specialized."
```

### Trap 2: "How do you handle training-serving skew?"

```
WHAT INTERVIEWER WANTS:
Deep understanding of ML-specific challenges.

BAD ANSWER:
"We just use the same code for training and serving."

GOOD ANSWER:
"Training-serving skew happens when features differ between training and inference.
Three causes and solutions:

1. TRANSFORMATION SKEW
   Problem: Different preprocessing code paths
   Solution: Feature store defines transformations once, compiles to both batch and online

2. DISTRIBUTION SKEW
   Problem: Production data differs from training
   Solution: Monitor with PSI/KS tests, alert on drift > 0.2

3. TIME TRAVEL SKEW
   Problem: Using future data in training features
   Solution: Point-in-time joins - reconstruct features as they were at prediction time

Feature stores like Feast/Tecton help, but don't fully solve it.
The key insight: skew is caused by 'movement' - every system boundary crossing
can introduce inconsistency. Monitor and detect, don't assume correctness."
```

### Trap 3: "Why separate experiment tracking from logging?"

```
WHAT INTERVIEWER WANTS:
Understand MLOps-specific requirements vs general observability.

BAD ANSWER:
"Experiment tracking is just a type of logging."

GOOD ANSWER:
"ML experiments have fundamentally different requirements:

1. STRUCTURED METADATA
   Logs are unstructured text. Experiments need typed parameters,
   metrics with steps, artifacts with checksums.

2. COMPARISON QUERIES
   'Compare accuracy across runs with learning_rate > 0.01'
   This is a database query, not a log search.

3. ARTIFACT ASSOCIATION
   Link models, plots, data samples to specific runs.
   Logs don't handle binary artifacts.

4. REPRODUCIBILITY
   Capture environment, dependencies, random seeds.
   Logs capture what happened, not how to repeat it.

5. RETENTION
   Keep experiment history for years (compliance).
   Logs typically retained 30-90 days.

ELK/Splunk is great for ops logs. MLflow/W&B is designed for ML workflows."
```

### Trap 4: "Can't you just scale horizontally to handle any load?"

```
WHAT INTERVIEWER WANTS:
Understand that not everything scales horizontally.

BAD ANSWER:
"Yes, we can always add more servers."

GOOD ANSWER:
"Horizontal scaling has limits:

1. STATEFUL COMPONENTS
   Scheduler needs leader election - can't parallelize the leader role.
   Database primary is a bottleneck until you shard.

2. COORDINATION OVERHEAD
   More nodes = more network calls, more consistency challenges.
   Distributed transactions don't scale linearly.

3. DATA LOCALITY
   Training data locality matters. 100GB dataset on remote storage
   adds significant transfer time.

What we CAN scale horizontally:
- Tracking servers (stateless)
- Executors (embarrassingly parallel)
- Object storage (designed for it)

What we VERTICALLY scale or redesign:
- Database (scale up, then shard)
- Scheduler (leader + standbys)
- Metric store (shard by run_id)"
```

---

## Key Numbers to Memorize

| Metric | Value | Context |
|--------|-------|---------|
| Metric write latency | <100ms p99 | Real-time training feedback |
| Model registration | <5s | Not blocking training |
| Artifact upload | >50MB/s | Large model uploads |
| Artifact download | >100MB/s | Model serving cold start |
| Concurrent experiments | 10K+ | Enterprise scale |
| Runs per experiment | 100K+ | Hyperparameter sweeps |
| Model versions | 1M+ | Long-term storage |
| Checkpoint interval | 10-30 min | Recovery vs overhead |
| PSI drift threshold | 0.1 warn, 0.2 alert | Training-serving skew |
| Leader election timeout | 30s | Scheduler failover |

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Designing for inference latency | MLOps is about training, not serving | Focus on throughput, not latency |
| Single database for everything | Different access patterns need different storage | PostgreSQL for metadata, ClickHouse for metrics, S3 for artifacts |
| Ignoring checkpoint recovery | Long training jobs fail | Design checkpoint-first |
| Strong consistency everywhere | Overkill for metrics | Strong for registry, eventual for metrics |
| Manual model deployment | Doesn't scale | Alias-based promotion with automation |
| Treating metrics like logs | Different requirements | Structured storage with aggregations |

---

## Questions to Ask Interviewer (End of Session)

```
1. "Are there specific ML frameworks we need to support?"
   (Shows awareness of ecosystem complexity)

2. "What's the current pain point with existing tooling?"
   (Shows customer-centric thinking)

3. "How mature is the feature store integration?"
   (Shows understanding of ML-specific challenges)

4. "What's the compliance landscape?"
   (Shows awareness of enterprise requirements)

5. "Is there a preference for managed services vs self-hosted?"
   (Shows awareness of operational trade-offs)
```

---

## Real-World Reference Summary

| Company | Platform | Key Learnings |
|---------|----------|---------------|
| **Uber** | Michelangelo | Feature store integration, end-to-end platform |
| **Netflix** | Metaflow | Human-centric design, versioned data |
| **Airbnb** | Bighead | Unified training and serving |
| **Meta** | FBLearner | Declarative workflows, massive scale |
| **Google** | TFX/Vertex | Pipeline components, managed infrastructure |
| **LinkedIn** | Pro-ML | Feature marketplace, A/B testing integration |
| **Spotify** | Luigi + MLflow | Orchestration + tracking combination |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MLOPS PLATFORM - INTERVIEW CARD                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  THREE CORE COMPONENTS:                                              │
│  1. Pipeline Orchestrator - DAG scheduling, checkpoints              │
│  2. Experiment Tracker - metrics, params, artifacts                  │
│  3. Model Registry - versions, aliases, stages                       │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  KEY ALGORITHMS:                                                     │
│  • Topological sort for DAG execution                                │
│  • Distributed lock for alias atomicity                              │
│  • PSI/KS tests for drift detection                                  │
│  • Checkpoint-aware scheduling for recovery                          │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STORAGE DECISIONS:                                                  │
│  • Metadata: PostgreSQL (ACID, JSONB)                                │
│  • Metrics: ClickHouse (high cardinality, aggregations)              │
│  • Artifacts: Object Storage (scalable, durable)                     │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  KEY TRADE-OFFS:                                                     │
│  • YAML vs Python pipelines → Hybrid                                 │
│  • Git vs Custom versioning → Custom (metadata, aliases)             │
│  • Strong vs Eventual → Strong for registry, eventual for metrics    │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DIFFERENTIATE FROM 3.2 (ML DEPLOYMENT):                             │
│  • MLOps = Training lifecycle (this design)                          │
│  • ML Deployment = Inference/serving (3.2)                           │
│  • Different latency, consistency, scaling requirements              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```
