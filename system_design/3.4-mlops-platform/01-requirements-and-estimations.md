# Requirements and Estimations

[Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features (P0 - Must Have)

| Feature | Description | User Story |
|---------|-------------|------------|
| **Pipeline Definition** | Declarative YAML/Python DAG definitions for training workflows | As a data scientist, I want to define multi-step training pipelines that handle data prep, training, and evaluation |
| **Pipeline Execution** | Distributed task execution with retry logic and dependency management | As an ML engineer, I want pipelines to run reliably with automatic retries and checkpointing |
| **Experiment Logging** | Log parameters, metrics, artifacts per training run | As a data scientist, I want to track all experiment details for reproducibility |
| **Run Comparison** | Side-by-side metric/parameter comparison across runs | As a data scientist, I want to compare experiments to identify the best approach |
| **Model Versioning** | Semantic versioning with immutable artifacts | As an ML engineer, I want every model version to be uniquely identifiable and retrievable |
| **Model Aliases** | Dynamic pointers like @champion, @production, @candidate | As an ML engineer, I want to reference production models without hardcoding versions |
| **Model Stages** | Lifecycle stages: None → Staging → Production → Archived | As a team lead, I want approval workflows before models go to production |
| **Artifact Storage** | Durable storage for models, datasets, checkpoints | As a data scientist, I want all artifacts stored reliably and accessible |
| **Lineage Tracking** | Track data + code + environment for each model | As a compliance officer, I want to audit which data trained which model |

### Model Registry Features (P0)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Create Registered Model** | Create named model entry in registry | P0 |
| **Create Model Version** | Add new version to existing model | P0 |
| **Get Model Version** | Retrieve specific version by number or alias | P0 |
| **Set/Delete Alias** | Manage @champion, @production pointers | P0 |
| **Transition Stage** | Move version through None → Staging → Production → Archived | P0 |
| **Search Models** | Filter models by name, tags, metrics | P0 |
| **Get Model Lineage** | Retrieve data/code/environment lineage | P0 |

### Pipeline Orchestration Features (P0)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Define Pipeline** | YAML or Python SDK pipeline definition | P0 |
| **Submit Pipeline Run** | Trigger pipeline execution with parameters | P0 |
| **View Pipeline Status** | Real-time DAG visualization and status | P0 |
| **Task Retry** | Automatic retry with configurable backoff | P0 |
| **Checkpoint/Resume** | Save state and resume from failure | P0 |
| **Parameterized Runs** | Pass runtime parameters to pipelines | P0 |

### Advanced Features (P1 - Should Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Hyperparameter Tuning** | Grid search, random search, Bayesian optimization | P1 |
| **Feature Store Integration** | Connect to feature stores for consistent features | P1 |
| **Distributed Training** | Coordinate multi-node GPU training | P1 |
| **Cost Tracking** | Track compute costs per experiment/pipeline | P1 |
| **Model Cards** | Generate documentation for models | P1 |
| **Approval Workflows** | Require sign-off for production promotion | P1 |

### Future Features (P2 - Nice to Have)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Auto-ML Templates** | Pre-built pipeline templates | P2 |
| **Automated Retraining** | Trigger retraining on drift detection | P2 |
| **A/B Test Integration** | Connect to deployment system for experiments | P2 |
| **Multi-Tenant Isolation** | Team-level namespace isolation | P2 |

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| Pipeline submission latency | <5s | User experience for interactive workflows |
| Experiment log write latency (p99) | <100ms | Real-time feedback during training |
| Model registry query latency (p99) | <200ms | API responsiveness |
| Run comparison query latency | <2s | Interactive exploration |
| Artifact download throughput | >100MB/s (intra-DC) | Large model retrieval |
| Artifact upload throughput | >50MB/s | Model persistence during training |

### Scalability Requirements

| Metric | Target | Growth Rate |
|--------|--------|-------------|
| Concurrent experiments | 10,000+ | 50% YoY |
| Runs per experiment | 100,000+ | For hyperparameter sweeps |
| Total model versions | 1,000,000+ | Long-term retention |
| Metrics per run | 10,000+ | GenAI eval metrics |
| Artifact storage | PB-scale | 2x YoY |
| Concurrent training jobs | 1,000+ | GPU cluster size |

### Consistency Requirements

| Component | Consistency Model | Rationale |
|-----------|------------------|-----------|
| Model Registry (aliases) | Strong (serializable) | Alias updates must be atomic |
| Model Registry (metadata) | Strong (read-your-writes) | Immediate visibility after write |
| Experiment Metrics | Eventual (seconds) | Batch writes for efficiency |
| Pipeline State | Strong (leader-based) | Task scheduling correctness |
| Artifact Storage | Strong (write-then-read) | Artifact availability after upload |

### Availability Requirements

| Component | Target | Justification |
|-----------|--------|---------------|
| Platform API | 99.9% (8.7h/year) | Business hours critical |
| Pipeline Execution | 99.5% job completion | Retries handle transient failures |
| Experiment Tracking | 99.9% | Training runs must log |
| Model Registry | 99.95% | Deployment workflows depend on it |
| Artifact Storage | 99.999% | Data durability critical |

### Durability Requirements

| Data Type | Durability | Retention |
|-----------|------------|-----------|
| Model Artifacts | 99.999999999% (11 9s) | Indefinite for production models |
| Experiment Metadata | 99.999999% (8 9s) | 7 years (compliance) |
| Metrics | 99.999% | 1 year hot, 7 years archived |
| Pipeline Logs | 99.99% | 90 days hot, 1 year archived |
| Checkpoints | 99.99% | 7 days after job completion |

---

## Capacity Estimations

### Assumptions

| Parameter | Value | Source |
|-----------|-------|--------|
| Data Scientists | 500 | Medium-large enterprise |
| Training jobs per user per day | 50 | Mix of dev and production |
| Metrics per training run | 100 | Standard ML metrics |
| Artifacts per training run | 5 | Model, plots, data samples |
| Average model size | 500MB | Mix of traditional and small LLMs |
| Average metric cardinality | 1000 steps | Training iterations |
| Peak hours | 4 hours | 10am-2pm workday |

### Daily Volume Calculations

| Metric | Calculation | Result |
|--------|-------------|--------|
| Daily Training Jobs | 500 users × 50 jobs | 25,000 jobs/day |
| Peak Job Submissions | 25K / 4 hours / 60 min | ~100 jobs/min |
| Daily Metrics Written | 25K jobs × 100 metrics × 1000 steps | 2.5B data points/day |
| Daily Metric Writes/sec | 2.5B / 86400 | ~29,000 writes/sec |
| Peak Metric Writes/sec | 29K × 3 (peak factor) | ~87,000 writes/sec |
| Daily Artifact Uploads | 25K jobs × 5 artifacts | 125,000 artifacts/day |
| Daily Artifact Volume | 25K jobs × 500MB | 12.5TB/day |

### Storage Calculations

| Storage Type | Calculation | Year 1 | Year 5 |
|--------------|-------------|--------|--------|
| Model Artifacts | 12.5TB/day × 365 × retention | 4.5PB | 15PB (with dedup) |
| Metric Data | 2.5B points × 16 bytes × 365 | 14.6TB | 73TB |
| Metadata (PostgreSQL) | ~1KB/run × 25K × 365 | 9.1GB | 45GB |
| Checkpoints (temp) | 10% of jobs × 1GB × 7 days | 175GB | 175GB (TTL) |

### Compute Requirements

| Resource | Calculation | Result |
|----------|-------------|--------|
| Tracking Server Instances | 87K writes/sec ÷ 10K per instance | 9 instances (min) |
| Registry API Instances | 1000 req/sec ÷ 500 per instance | 2 instances (min) |
| Pipeline Scheduler | Leader + 2 standby | 3 instances |
| Metadata DB | Primary + 2 read replicas | 3 instances |
| Metric Store Nodes | 14.6TB ÷ 2TB per node | 8 nodes |

---

## SLOs and SLAs

### Platform SLOs

| Metric | SLO | Measurement | Error Budget |
|--------|-----|-------------|--------------|
| API Availability | 99.9% | Successful requests / Total | 8.7 hours/year |
| Job Completion Rate | 99.5% | Successful / Total (excl. user errors) | 5 per 1000 |
| Experiment Log Durability | 99.999999% | No data loss | <1 metric lost per 100M |
| Model Registry Consistency | 100% | No phantom alias reads | 0 tolerance |
| Pipeline Schedule Accuracy | 99% | On-time starts within 60s | 1% delayed |

### Latency SLOs

| Operation | p50 | p95 | p99 | SLO |
|-----------|-----|-----|-----|-----|
| Pipeline Submission | 500ms | 2s | 5s | p99 < 5s |
| Log Metric (batch) | 10ms | 50ms | 100ms | p99 < 100ms |
| Get Model Version | 20ms | 100ms | 200ms | p99 < 200ms |
| Search Experiments | 100ms | 500ms | 2s | p99 < 2s |
| Artifact Download (10MB) | 100ms | 500ms | 1s | p99 < 1s |

### Throughput SLOs

| Operation | Target | Burst | Measurement |
|-----------|--------|-------|-------------|
| Metric Writes | 50,000/sec | 100,000/sec | Per cluster |
| Pipeline Submissions | 200/min | 500/min | Per cluster |
| Artifact Uploads | 1,000/min | 2,000/min | Per cluster |
| API Requests | 10,000/sec | 25,000/sec | Per cluster |

---

## Traffic Patterns

### Daily Traffic Distribution

```
Jobs/Hour
   ^
800|                    ████
   |                 ████████
600|              ████████████
   |           ████████████████
400|        ████████████████████████
   |     ████████████████████████████
200|  ████████████████████████████████████
   |████████████████████████████████████████
   +-----------------------------------------> Hour
    0  2  4  6  8  10 12 14 16 18 20 22 24
              Peak: 10am - 2pm
```

### Metric Write Patterns

| Pattern | Description | Handling |
|---------|-------------|----------|
| Burst at training start | Many metrics logged in first steps | Buffer and batch |
| Periodic during training | Every N steps | Steady-state batching |
| Spike at training end | Final metrics, artifacts | Queue with backpressure |
| Hyperparameter sweep | 1000s of parallel runs | Horizontal scaling |

---

## Constraints and Assumptions

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| GPU availability | Training job scheduling | Queue prioritization, spot instances |
| Network bandwidth | Large artifact transfers | Compression, CDN, chunked uploads |
| Database connections | Metadata query scaling | Connection pooling, read replicas |
| Object storage limits | API rate limits | Client-side batching, retry logic |

### Business Constraints

| Constraint | Requirement |
|------------|-------------|
| Compliance | 7-year retention for model lineage |
| Cost efficiency | <$0.10 per training job overhead |
| Multi-team | Namespace isolation, access control |
| Cloud agnostic | No hard cloud provider lock-in |

### Assumptions

| Assumption | Risk if Invalid |
|------------|-----------------|
| Training jobs avg <24 hours | Checkpoint strategy needs revision |
| Model size <100GB (typical) | Artifact storage architecture changes |
| Metrics fit in-memory aggregation | Need distributed aggregation |
| Strong consistency acceptable for registry | Architecture simplification invalid |
| Teams trust central platform | Need federated model |

---

## Capacity Planning Summary

### Year 1 Infrastructure

| Component | Specification | Count |
|-----------|--------------|-------|
| Tracking Server | 8 vCPU, 32GB RAM | 12 |
| Registry API | 4 vCPU, 16GB RAM | 4 |
| Pipeline Scheduler | 8 vCPU, 32GB RAM | 3 |
| Metadata DB (PostgreSQL) | 16 vCPU, 64GB RAM, 1TB SSD | 3 |
| Metric Store (ClickHouse) | 32 vCPU, 128GB RAM, 4TB NVMe | 8 |
| Object Storage | - | 5PB |
| Load Balancers | - | 2 |

### Cost Estimation (Monthly)

| Component | Unit Cost | Quantity | Monthly Cost |
|-----------|-----------|----------|--------------|
| Compute (tracking/API) | $200/instance | 16 | $3,200 |
| Compute (scheduler) | $300/instance | 3 | $900 |
| PostgreSQL (managed) | $500/instance | 3 | $1,500 |
| ClickHouse cluster | $1,000/node | 8 | $8,000 |
| Object Storage | $0.02/GB | 400TB | $8,000 |
| Network egress | $0.05/GB | 100TB | $5,000 |
| **Total** | | | **~$27,000/month** |

*Note: Excludes GPU compute for actual training (managed separately)*
