# Requirements & Capacity Estimations

## Functional Requirements

### Core Platform Capabilities

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Feature Management** | Create, store, serve, and share features across teams | P0 |
| **Model Training** | Distributed training on batch data with GPU support | P0 |
| **Model Registry** | Version control, metadata tracking, artifact storage | P0 |
| **Online Serving** | Real-time predictions with sub-10ms latency | P0 |
| **Batch Serving** | Offline inference for large-scale scoring | P1 |
| **Experimentation** | A/B testing, shadow deployment, gradual rollouts | P1 |
| **LLM Support** | Fine-tuning, serving, and orchestration for LLMs | P1 |

### Feature Store (Palette)

| Capability | Description |
|------------|-------------|
| Feature Definition | DSL-based feature engineering with transformations |
| Offline Store | Historical feature snapshots for training (daily granularity) |
| Online Store | Low-latency feature serving for predictions (<10ms) |
| Feature Sharing | Cross-team feature discovery and reuse |
| Streaming Features | Near-real-time feature updates from event streams |
| Point-in-Time Joins | Correct historical feature retrieval for training |

### Model Registry (Gallery)

| Capability | Description |
|------------|-------------|
| Model Versioning | Track changes to model definition and trained artifacts |
| Metadata Storage | Hyperparameters, metrics, data lineage, ownership |
| Model Search | Discovery API across all ML entities |
| Reproducibility | Full environment capture for training recreation |
| Governance | Approval workflows, access control, audit trail |

### Training Service

| Capability | Description |
|------------|-------------|
| Distributed Training | Spark/Ray-based training on GPU clusters |
| Hyperparameter Tuning | Automated search with early stopping |
| Checkpointing | Fault-tolerant training with resume capability |
| Resource Scheduling | GPU/CPU allocation with priority queues |
| LLM Fine-Tuning | Parameter-efficient fine-tuning (PEFT) support |

### Serving Service

| Capability | Description |
|------------|-------------|
| Online Predictions | Single-row inference with feature lookup |
| Batch Predictions | Distributed inference for large datasets |
| Model Routing | UUID/tag-based model selection |
| Multi-Model Hosting | Virtual sharding for efficient resource use |
| GPU Inference | Triton-based serving for deep learning models |

---

## Out of Scope

| Excluded | Reason |
|----------|--------|
| Data Labeling | Separate specialized systems handle annotation |
| AutoML | Not core to platform; teams use external tools |
| Notebook Hosting | Separate Jupyter infrastructure |
| Data Catalog | Integrated with but separate from Palette |
| Business Analytics | Downstream BI tools consume predictions |

---

## Non-Functional Requirements

### CAP Theorem Choice

| Component | Choice | Justification |
|-----------|--------|---------------|
| Model Registry (Gallery) | **CP** | Strong consistency for model metadata; cannot serve stale model versions |
| Feature Store (Offline) | **AP** | Availability for batch training; eventual consistency acceptable |
| Feature Store (Online) | **AP** | Availability for serving; stale features better than no predictions |
| Prediction Service | **AP** | Must serve predictions even during partial failures |

### Consistency Model

| Component | Model | Details |
|-----------|-------|---------|
| Gallery (Model Registry) | Strong | Model version must be globally consistent before deployment |
| Palette (Offline) | Eventual | Daily snapshots; eventual consistency within batch window |
| Palette (Online) | Eventual | Streaming updates; eventual consistency within seconds |
| Training Jobs | Strong | Job state must be consistent for checkpointing |
| Predictions | Read-your-writes | Newly deployed models visible to routing immediately |

### Availability Targets

| Tier | Target | Components |
|------|--------|------------|
| Tier 1 Models | 99.99% | ETA, pricing, fraud, matching predictions |
| Tier 2 Models | 99.9% | Recommendations, search ranking |
| Tier 3 Models | 99.5% | Analytics, forecasting |
| Control Plane | 99.9% | Model deployment, training submission |
| Feature Store (Online) | 99.95% | Feature serving for predictions |

### Latency Targets

| Operation | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| Prediction (no features) | 2ms | 5ms | 10ms |
| Prediction (with Cassandra) | 5ms | 10ms | 20ms |
| Feature lookup (online) | 1ms | 3ms | 5ms |
| Training job submission | 500ms | 2s | 5s |
| Model deployment | 30s | 60s | 120s |
| Feature batch computation | N/A (minutes) | N/A | N/A |

### Durability Guarantees

| Data Type | Durability | Mechanism |
|-----------|------------|-----------|
| Trained Models | 99.9999999% | Replicated object storage, multi-region backup |
| Feature Definitions | 99.999% | Versioned in metadata store with audit log |
| Training Checkpoints | 99.99% | Distributed storage with replication |
| Prediction Logs | 99.9% | Kafka with replication, async archival |
| Experiment Metadata | 99.999% | ACID database with WAL |

---

## Capacity Estimations

### Production Scale (Uber 2024-2025)

| Metric | Value | Calculation/Source |
|--------|-------|-------------------|
| **DAU (Predictions)** | ~1B requests/day | 10M/s peak × 100,000s effective daily = ~1B |
| **Peak QPS** | 10,000,000 | Direct from Uber engineering blog |
| **Average QPS** | ~3,000,000 | Assuming 30% of peak for average |
| **Production Models** | 5,000+ | Across all business units |
| **Active Projects** | 400+ | ML teams using platform |
| **Training Jobs/Month** | 20,000+ | Includes retraining and experiments |
| **Features in Store** | 20,000+ | Shared across teams |

### Storage Estimations

| Component | Calculation | Estimate |
|-----------|-------------|----------|
| **Model Artifacts** | 5,000 models × 5 versions × 500MB avg | ~12.5 TB |
| **Feature Store (Offline)** | 20,000 features × 365 days × 100MB/snapshot | ~730 TB/year |
| **Feature Store (Online)** | 20,000 features × 100M entities × 100 bytes | ~200 TB |
| **Training Checkpoints** | 20,000 jobs × 5 checkpoints × 2GB | ~200 TB |
| **Prediction Logs** | 10M/s × 1KB × 86,400s × 30 days | ~25 PB/month |
| **Experiment Metadata** | 20,000 experiments × 1000 runs × 10KB | ~200 GB |

### Network Bandwidth

| Flow | Calculation | Estimate |
|------|-------------|----------|
| **Prediction Requests** | 10M/s × 2KB (req+resp) | ~20 GB/s |
| **Feature Lookups** | 10M/s × 500 bytes × 5 features | ~25 GB/s |
| **Training Data** | 20,000 jobs × 10GB avg × 30 days | ~6 PB/month |
| **Model Distribution** | 5,000 models × 500MB × 100 servers | ~250 TB/deployment cycle |

### Compute Requirements

| Workload | Estimation | Notes |
|----------|------------|-------|
| **Prediction Servers** | 10M QPS ÷ 50K QPS/server = ~200 servers | Java-based, high-throughput |
| **Feature Store (Online)** | 200-node Cassandra cluster | Replicated, multi-DC |
| **Training GPUs** | 500-1000 GPUs | Mix of A100, H100 |
| **Spark/Ray Clusters** | 10,000+ cores | For batch processing |

---

## SLOs / SLAs

### Prediction Service SLOs

| Metric | Tier 1 | Tier 2 | Tier 3 | Measurement |
|--------|--------|--------|--------|-------------|
| Availability | 99.99% | 99.9% | 99.5% | Successful responses / total requests |
| Latency (P95) | 10ms | 25ms | 100ms | End-to-end prediction time |
| Latency (P99) | 20ms | 50ms | 200ms | End-to-end prediction time |
| Error Rate | < 0.01% | < 0.1% | < 1% | 5xx responses / total requests |

### Feature Store SLOs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Online Availability | 99.95% | Feature lookup success rate |
| Online Latency (P95) | 5ms | Cassandra read latency |
| Offline Freshness | < 24 hours | Time since last batch update |
| Streaming Freshness | < 5 minutes | Time since event to feature availability |
| Feature Consistency | 99.9% | Training-serving feature match rate |

### Training Service SLOs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Job Submission Success | 99.9% | Jobs accepted / jobs submitted |
| Job Completion Rate | 95% | Jobs completed / jobs started |
| Queue Time (P95) | 30 minutes | Time from submission to execution |
| Checkpoint Recovery | 99% | Successful resumes / total failures |

### Model Registry SLOs

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Availability | 99.9% | Successful API calls / total calls |
| Model Deploy Success | 99.5% | Successful deployments / total attempts |
| Deploy Latency (P95) | 2 minutes | Time from trigger to serving |
| Search Latency (P95) | 500ms | Model search query response time |

---

## Cost Model

### Infrastructure Cost Breakdown (Estimated Monthly)

| Component | % of Total | Key Drivers |
|-----------|------------|-------------|
| **GPU Compute** | 40% | Training and GPU inference |
| **Storage** | 25% | Feature store, model artifacts, logs |
| **CPU Compute** | 20% | Prediction serving, batch processing |
| **Network** | 10% | Cross-DC replication, model distribution |
| **Metadata Services** | 5% | Databases, control plane |

### Cost Optimization Levers

| Lever | Impact | Trade-off |
|-------|--------|-----------|
| Spot/Preemptible GPUs | 60-70% training cost reduction | Requires checkpointing |
| Feature Caching | 30% Cassandra reduction | Memory cost vs latency |
| Model Quantization | 50% serving cost reduction | Slight accuracy loss |
| Tiered Storage | 40% storage cost reduction | Higher retrieval latency |
| Batch Scheduling | 20% compute reduction | Longer queue times |

---

## Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| Prediction QPS | > 80% capacity | Scale prediction service horizontally |
| Cassandra Latency P99 | > 20ms | Add nodes or optimize queries |
| Training Queue Depth | > 1000 jobs | Scale training cluster |
| GPU Utilization | > 85% sustained | Add GPU nodes |
| Model Memory | > 80% per server | Rebalance model sharding |
| Feature Staleness | > SLO target | Alert and investigate pipeline |

---

## Failure Budget

### Monthly Error Budget (Based on SLO)

| Tier | Availability | Allowed Downtime/Month |
|------|--------------|------------------------|
| Tier 1 (99.99%) | 99.99% | 4.3 minutes |
| Tier 2 (99.9%) | 99.9% | 43 minutes |
| Tier 3 (99.5%) | 99.5% | 3.6 hours |

### Budget Allocation

| Failure Type | Tier 1 Budget | Notes |
|--------------|---------------|-------|
| Planned Maintenance | 1 minute | Zero-downtime deployments |
| Infrastructure Failures | 2 minutes | Hardware, network issues |
| Software Bugs | 1 minute | Rollback capability |
| External Dependencies | 0.3 minutes | Feature store, etc. |
