# Requirements and Capacity Estimations

## Functional Requirements

### Core Capabilities

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Declarative Feature Engineering** | Define features once using DSL, automatically generate batch and streaming pipelines | P0 |
| **Train-Serve Consistency** | Guarantee identical feature computation in training and production serving | P0 |
| **Point-in-Time Correctness** | Generate features as they existed at historical timestamps for training | P0 |
| **Online Feature Serving** | Sub-10ms latency feature lookups for real-time predictions | P0 |
| **Offline Feature Store** | Historical feature snapshots for training data generation | P0 |
| **Real-Time Model Serving** | Low-latency predictions with integrated feature lookup | P0 |
| **Automatic DAG Generation** | Convert Python training code to Airflow pipelines automatically | P1 |
| **Multi-Framework Support** | Support TensorFlow, PyTorch, XGBoost, scikit-learn, MXNet | P1 |
| **Containerized Development** | Reproducible Jupyter notebook environments with Docker | P1 |
| **Model Lifecycle Management** | Version control, deployment tracking, rollback capabilities | P1 |

### Feature Store (Zipline/Chronon) Capabilities

| Capability | Description | Implementation |
|------------|-------------|----------------|
| **Declarative DSL** | Python-based feature definitions with aggregations and windows | Compiled to Spark SQL and Flink operators |
| **GroupBy Operations** | Aggregate raw data at entity grain (user, listing, etc.) | SUM, COUNT, AVG, MIN, MAX, LAST, FIRST |
| **Temporal Windows** | Sliding, tumbling, and unbounded time windows | 1 day, 7 days, 30 days, 90 days, unbounded |
| **Point-in-Time Joins** | Join features to events at historical timestamps | Temporal join with as-of semantics |
| **Backfill Generation** | Generate historical features for new definitions | Incremental and full backfill support |
| **Online Serving** | Low-latency feature lookup via API | Key-value store with caching |
| **Offline Serving** | Training data generation from historical features | Hive tables with date partitioning |
| **Streaming Updates** | Real-time feature computation from event streams | Kafka → Flink → KV store |

### ML Automator Capabilities

| Capability | Description |
|------------|-------------|
| **Python → DAG Conversion** | Parse decorated Python functions into Airflow DAG |
| **Dependency Detection** | Automatically extract data dependencies between tasks |
| **Task Mapping** | Map training functions to appropriate Airflow operators |
| **Schedule Configuration** | Support cron-based and event-triggered scheduling |
| **Resource Management** | Configure CPU, memory, GPU requirements per task |

### Deep Thought Serving Capabilities

| Capability | Description |
|------------|-------------|
| **Model Loading** | Load serialized models from registry on deployment |
| **Feature Integration** | Native lookup from Zipline online store |
| **Multi-Framework Runtime** | TensorFlow, PyTorch, XGBoost, scikit-learn runtimes |
| **Container Isolation** | Docker-based model serving with reproducible environments |
| **Auto-Scaling** | Kubernetes HPA based on QPS and latency |

---

## Out of Scope

| Capability | Reason | Alternative |
|------------|--------|-------------|
| Data Labeling | Separate tooling required for annotation workflows | Internal labeling platform |
| AutoML Hyperparameter Tuning | Teams use external tools (Optuna, Ray Tune) | Integrate via BigHead Library |
| General Data Pipelines | BigHead focuses on ML-specific workflows | Airflow for general ETL |
| Business Intelligence | Reporting and dashboards handled separately | Internal BI tools |
| A/B Testing Framework | Experimentation platform is separate | Airbnb Experimentation Platform |

---

## Non-Functional Requirements

### CAP Theorem Choices

| Component | Choice | Justification |
|-----------|--------|---------------|
| **Feature Store (Offline)** | CP | Point-in-time correctness requires strong consistency; stale training data causes model issues |
| **Feature Store (Online)** | AP | Availability critical for serving; eventual consistency acceptable (seconds of staleness OK) |
| **Model Serving** | AP | Must serve predictions during partial failures; fallback to cached/default acceptable |
| **Model Registry** | CP | Strong consistency required for deployment versioning; brief unavailability acceptable |
| **ML Automator** | CP | DAG execution must be consistent; retries handle temporary unavailability |

### Consistency Model

| Component | Model | Details |
|-----------|-------|---------|
| **Zipline Offline Store** | Strong | Point-in-time snapshots must be exactly correct for training |
| **Zipline Online Store** | Eventual | Streaming updates converge within seconds; acceptable for serving |
| **Deep Thought** | Read-your-writes | Newly deployed models visible immediately to deployer |
| **ML Automator** | Strong | DAG state must be consistent across scheduler |
| **Model Registry** | Linearizable | Model versions strictly ordered |

### Availability Targets

| Tier | Availability | Components | Impact of Outage |
|------|--------------|------------|------------------|
| **Critical** | 99.9% (8.7h/year) | Online Feature Store, Deep Thought (pricing models) | Revenue-impacting predictions fail |
| **High** | 99.5% (43.8h/year) | Deep Thought (recommendations), Model Registry | Degraded user experience |
| **Standard** | 99.0% (87.6h/year) | ML Automator, Redspot | Development velocity impacted |
| **Best Effort** | 95.0% | Batch backfill jobs | Training data generation delayed |

### Latency Targets

| Operation | P50 | P95 | P99 | Notes |
|-----------|-----|-----|-----|-------|
| **Feature Lookup (Online)** | 2ms | 5ms | 10ms | Hot path for predictions |
| **Model Prediction (End-to-End)** | 10ms | 20ms | 30ms | Including feature lookup |
| **Model Prediction (Inference Only)** | 3ms | 8ms | 15ms | After features resolved |
| **Feature Backfill (per entity)** | N/A | N/A | N/A | Batch: optimize throughput |
| **DAG Generation** | 500ms | 2s | 5s | One-time operation |
| **Model Deployment** | 30s | 60s | 120s | Container startup time |

### Durability Guarantees

| Data Type | Durability | Mechanism |
|-----------|------------|-----------|
| **Feature Definitions** | 99.999999% | Git version control + backup |
| **Offline Features** | 99.99% | Hive with replication factor 3 |
| **Online Features** | 99.9% | KV store replication + streaming replay |
| **Model Artifacts** | 99.999% | Object storage with versioning |
| **Training Metadata** | 99.99% | Database with backups |

---

## Capacity Estimations

### Scale Assumptions (Based on Airbnb Public Data)

| Metric | Value | Source |
|--------|-------|--------|
| Daily Active Users (DAU) | ~50M | Estimated from booking volume |
| Listings | ~7M | Public Airbnb data |
| Bookings per Day | ~2M | Estimated |
| Search Queries per Day | ~500M | Estimated (25 queries/user) |
| ML Models in Production | 100+ | BigHead documentation |
| Features in Store | 30,000+ | Chronon documentation |

### Capacity Calculations

| Metric | Calculation | Estimate |
|--------|-------------|----------|
| **Feature Lookups (QPS)** | 500M searches/day ÷ 86,400s × 10 features/search | ~580K QPS |
| **Feature Lookups (Peak)** | 3x average | ~1.7M QPS |
| **Predictions (QPS)** | 500M searches × 0.5 prediction rate ÷ 86,400s | ~2.9K QPS |
| **Predictions (Peak)** | 5x average (search spikes) | ~15K QPS |
| **Batch Feature Jobs** | 30,000 features × daily refresh | 30K jobs/day |
| **Training Jobs** | 100 models × weekly retrain | ~14 jobs/day |

### Storage Estimations

| Component | Calculation | Estimate |
|-----------|-------------|----------|
| **Offline Feature Store** | 30K features × 365 days × 7M entities × 100 bytes/feature | ~7.6 PB/year |
| **Offline (with compression)** | 10:1 compression ratio | ~760 TB/year |
| **Online Feature Store** | 30K features × 7M entities × 100 bytes | ~21 TB |
| **Online (hot data)** | 20% hot features | ~4.2 TB |
| **Model Artifacts** | 100 models × 10 versions × 500 MB avg | ~500 GB |
| **Training Data (per job)** | Variable, from data lake | Shared infrastructure |

### Bandwidth Estimations

| Flow | Calculation | Estimate |
|------|-------------|----------|
| **Feature Lookup Response** | 1.7M QPS × 1 KB response | ~1.7 GB/s peak |
| **Streaming Feature Updates** | 10M events/hour × 500 bytes | ~1.4 GB/hour |
| **Batch Feature Writes** | 760 TB/year ÷ 365 days | ~2 TB/day |
| **Model Serving Response** | 15K QPS × 500 bytes | ~7.5 MB/s |

---

## SLOs and SLAs

### Feature Store SLOs

| Metric | SLO | Measurement | Alert Threshold |
|--------|-----|-------------|-----------------|
| **Online Availability** | 99.9% | Success rate over 5 min | < 99.5% |
| **Online Latency (P99)** | 10ms | Histogram over 1 min | > 15ms |
| **Feature Freshness** | < 5 min | Lag from source event | > 10 min |
| **Backfill Throughput** | 1M entities/hour | Job completion rate | < 500K/hour |
| **Train-Serve Consistency** | 99.9% | Feature match rate | < 99% |

### Model Serving SLOs

| Metric | SLO | Measurement | Alert Threshold |
|--------|-----|-------------|-----------------|
| **Prediction Availability** | 99.5% | Success rate over 5 min | < 99% |
| **Prediction Latency (P99)** | 30ms | Histogram over 1 min | > 50ms |
| **Model Load Time** | < 2 min | Deployment completion | > 5 min |
| **Error Rate** | < 0.1% | Failed predictions | > 0.5% |

### ML Automator SLOs

| Metric | SLO | Measurement | Alert Threshold |
|--------|-----|-------------|-----------------|
| **DAG Execution Success** | 95% | Daily completion rate | < 90% |
| **DAG Execution Time** | < 2x baseline | Per-DAG tracking | > 3x baseline |
| **DAG Generation Success** | 99% | Generation attempts | < 95% |

---

## Capacity Planning Summary

```
+-------------------------------------------------------------------------+
|                    BIGHEAD CAPACITY SUMMARY                              |
+-------------------------------------------------------------------------+
| FEATURE STORE                                                            |
| * Online QPS: 580K avg, 1.7M peak                                       |
| * Online Storage: 4.2 TB (hot), 21 TB (total)                           |
| * Offline Storage: ~760 TB/year (compressed)                            |
| * Features: 30,000+                                                      |
+-------------------------------------------------------------------------+
| MODEL SERVING                                                            |
| * Prediction QPS: 2.9K avg, 15K peak                                    |
| * Models: 100+ in production                                            |
| * Artifact Storage: ~500 GB                                             |
+-------------------------------------------------------------------------+
| PROCESSING                                                               |
| * Batch Jobs: 30K features × daily                                      |
| * Streaming Events: 10M/hour                                            |
| * Training Jobs: ~14/day                                                |
+-------------------------------------------------------------------------+
```

---

## Growth Projections

| Metric | Current | Year 2 | Year 5 | Scaling Strategy |
|--------|---------|--------|--------|------------------|
| **Features** | 30K | 60K | 150K | Horizontal partition by namespace |
| **Online QPS** | 1.7M | 3.4M | 8.5M | Add cache layers, read replicas |
| **Offline Storage** | 760 TB | 1.5 PB | 3.8 PB | Cold storage tiering |
| **Models** | 100 | 200 | 500 | Multi-cluster deployment |
| **Entities** | 7M | 14M | 35M | Shard by entity type |
