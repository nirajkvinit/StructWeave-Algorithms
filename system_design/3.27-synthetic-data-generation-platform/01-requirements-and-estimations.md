# Requirements and Estimations

## Functional Requirements

### P0 - Must Have (Core Platform)

| Feature | Description | Key Capabilities |
|---------|-------------|------------------|
| **Data Ingestion** | Connect to data sources and ingest datasets | Database connectors (PostgreSQL, MySQL, Snowflake), file upload (CSV, Parquet, JSON), schema auto-detection, data profiling |
| **Model Training** | Train generative models on source data | Model selection (GAN/VAE/Diffusion), distributed GPU training, checkpoint management, hyperparameter configuration |
| **Data Generation** | Generate synthetic datasets from trained models | Batch generation (N records to file), configurable output formats, seed control for reproducibility |
| **Privacy Controls** | Apply privacy-preserving mechanisms | Differential Privacy (DP-SGD) training, privacy budget tracking, rare category protection, extreme value capping |
| **Quality Assessment** | Evaluate synthetic data quality | Fidelity metrics (KS test, correlation), utility metrics (TSTR), privacy metrics (MIA resistance), automated pass/fail gates |
| **Multi-Tenant Isolation** | Separate organizations securely | Tenant isolation, resource quotas, billing integration |

### P1 - Should Have (Enterprise Features)

| Feature | Description | Key Capabilities |
|---------|-------------|------------------|
| **Conditional Generation** | Generate data matching specific constraints | Filter conditions (age > 65), edge case targeting, minority class oversampling |
| **Multi-Table Generation** | Preserve relational integrity across tables | Foreign key detection, hierarchical generation, cardinality matching |
| **Streaming Generation** | Real-time synthetic data API | Low-latency sampling, API rate limiting, caching |
| **Version Management** | Track model and dataset versions | Model registry, dataset lineage, experiment tracking |
| **Connector Ecosystem** | Pre-built integrations | Snowflake, Databricks, BigQuery, cloud storage (S3/GCS/Azure), Kafka |

### P2 - Nice to Have (Advanced)

| Feature | Description | Key Capabilities |
|---------|-------------|------------------|
| **AutoML Model Selection** | Automatic model recommendation | Data profiling → model suggestion, hyperparameter auto-tuning |
| **Bias Auditing** | Detect and mitigate fairness issues | Demographic parity checks, targeted rebalancing |
| **Time-Series Generation** | Specialized temporal data models | TimeGAN, DGAN, sequence preservation |
| **Text Generation** | Synthetic text and free-form fields | LLM-based generation, PII replacement |
| **Federated Synthesis** | Train across distributed data sources | Privacy-preserving aggregation, no raw data movement |

---

## Non-Functional Requirements

### CAP Theorem Choice

**Choice: CP (Consistency + Partition Tolerance)**

**Justification:**
- Generated synthetic data must be **consistent and accurate** - incorrect data corrupts downstream ML models
- Training jobs must produce **deterministic results** given same seed and configuration
- Privacy budget accounting requires **strong consistency** - overspending epsilon is unacceptable
- Temporary unavailability (seconds) is acceptable; corrupted data is not

### Consistency Model

| Data Type | Consistency | Rationale |
|-----------|-------------|-----------|
| Model artifacts | Strong | Training must be deterministic; model versions immutable |
| Privacy budgets | Strong | Cannot overspend epsilon; audit-critical |
| Generated datasets | Strong | Must match exactly what was requested |
| Quality metrics | Eventual (< 1 min) | Slight delay acceptable for dashboards |
| Usage analytics | Eventual (< 5 min) | Non-critical reporting |

### Availability Targets

| Component | Target | Monthly Downtime | Justification |
|-----------|--------|------------------|---------------|
| Training Service | 99.5% | 3.6 hours | Jobs can retry; not real-time critical |
| Generation API | 99.9% | 43.8 minutes | Integration dependencies |
| Quality Service | 99.5% | 3.6 hours | Async validation acceptable |
| Web Dashboard | 99.9% | 43.8 minutes | User-facing |
| Metadata Store | 99.99% | 4.38 minutes | Critical for all operations |

### Latency Requirements

| Operation | P50 | P95 | P99 | Notes |
|-----------|-----|-----|-----|-------|
| Training job start | < 30s | < 60s | < 120s | Queue to first epoch |
| Training (1M rows, CTGAN) | < 2h | < 4h | < 8h | Depends on data complexity |
| Training (1M rows, Diffusion) | < 8h | < 16h | < 24h | Higher quality, slower |
| Generation (10K rows) | < 30s | < 60s | < 120s | Batch generation |
| Generation (100K rows) | < 3m | < 5m | < 10m | Batch generation |
| Streaming generation (1 row) | < 100ms | < 200ms | < 500ms | Real-time API |
| Quality check (full suite) | < 5m | < 10m | < 20m | Fidelity + utility + privacy |
| Schema analysis | < 30s | < 60s | < 120s | Initial profiling |

### Durability Requirements

| Data Type | Durability | Rationale |
|-----------|------------|-----------|
| Trained models | 99.999999999% (11 9s) | Expensive to retrain; business-critical |
| Source dataset snapshots | 99.999999999% | Audit and reproducibility |
| Generated datasets | 99.99% (regeneratable) | Can regenerate from model |
| Privacy audit logs | 99.999999999% | Compliance requirement |
| Metadata | 99.999999999% | Critical for operations |

### Throughput Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| Concurrent training jobs | 1,000 | Across all tenants |
| Generation requests/second | 100 | Streaming API |
| Rows generated/second (batch) | 100,000 | Per job |
| Quality validations/hour | 500 | Async pipeline |

---

## Capacity Estimations

### Scale Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Total organizations | 500 | Enterprise + mid-market |
| Active organizations (daily) | 200 | 40% daily active |
| Training jobs/org/day | 5 | Model iteration, new datasets |
| Generation jobs/org/day | 20 | Multiple use cases |
| Avg source dataset size | 1M rows, 50 columns | Enterprise scale |
| Avg generated dataset size | 5M rows | 5x augmentation |
| Avg model size | 500 MB | CTGAN typical |
| Model versions retained | 10 | Per dataset |

### Daily Traffic Estimation

| Metric | Calculation | Daily Volume |
|--------|-------------|--------------|
| Training jobs | 200 orgs × 5 jobs | 1,000 jobs |
| Generation jobs | 200 orgs × 20 jobs | 4,000 jobs |
| Rows generated | 4,000 × 5M rows | 20 billion rows |
| Quality validations | 4,000 jobs | 4,000 validations |
| API requests (metadata) | 200 orgs × 500 | 100,000 requests |

### QPS Calculations

| Operation | Daily Volume | Peak Factor | Avg QPS | Peak QPS |
|-----------|--------------|-------------|---------|----------|
| Training job starts | 1,000 | 3x (business hours) | 0.01 | 0.03 |
| Generation requests | 4,000 | 3x | 0.05 | 0.15 |
| Streaming generation | 100,000 | 5x | 1.2 | 6 |
| Quality checks | 4,000 | 3x | 0.05 | 0.15 |
| Metadata API | 100,000 | 5x | 1.2 | 6 |

*Note: This is a batch-heavy workload with low QPS but high compute per request.*

### Storage Estimation

| Data Type | Size/Unit | Daily New | Monthly | Year 1 | Year 5 |
|-----------|-----------|-----------|---------|--------|--------|
| Source datasets | 500 MB/dataset | 100 GB | 3 TB | 36 TB | 180 TB |
| Trained models | 500 MB/model | 500 GB | 15 TB | 180 TB | 900 TB |
| Generated datasets | 2.5 GB/job | 10 TB | 300 TB | 3.6 PB | 18 PB |
| Quality reports | 1 MB/report | 4 GB | 120 GB | 1.4 TB | 7 TB |
| Metadata/logs | 100 KB/job | 500 MB | 15 GB | 180 GB | 900 GB |
| **Total** | | ~10.5 TB | ~318 TB | ~3.8 PB | ~19 PB |

*Storage Strategy:*
- Generated datasets: Tiered storage (hot 7 days → warm 30 days → archive/delete)
- With tiered storage: Year 1 effective = ~500 TB

### Compute Estimation

| Resource | Per Training Job | Daily Jobs | Daily Compute |
|----------|------------------|------------|---------------|
| GPU (A100) | 4 hours | 1,000 | 4,000 GPU-hours |
| CPU (training prep) | 1 hour | 1,000 | 1,000 CPU-hours |
| CPU (generation) | 0.5 hours | 4,000 | 2,000 CPU-hours |
| CPU (quality) | 0.25 hours | 4,000 | 1,000 CPU-hours |

**GPU Cluster Sizing:**
- 4,000 GPU-hours/day ÷ 24 hours = ~167 concurrent GPUs needed
- With spot/preemptible (70% savings): ~200 GPUs provisioned
- Peak factor (2x): ~400 GPU capacity

### Bandwidth Estimation

| Flow | Size | Daily Volume | Bandwidth |
|------|------|--------------|-----------|
| Source upload | 500 MB × 200 | 100 GB | ~10 Mbps avg |
| Generated download | 2.5 GB × 4,000 | 10 TB | ~1 Gbps avg |
| Model artifacts | 500 MB × 1,000 | 500 GB | ~50 Mbps avg |
| Internal (training) | 5 GB × 1,000 | 5 TB | ~500 Mbps avg |
| **Total** | | ~16 TB | ~2 Gbps peak |

### Cache Sizing

| Cache Layer | Purpose | Size | TTL |
|-------------|---------|------|-----|
| Model cache | Hot models for generation | 50 GB | 1 hour |
| Schema cache | Parsed schemas | 1 GB | 24 hours |
| Quality cache | Recent quality reports | 5 GB | 1 hour |
| Session cache | User sessions | 1 GB | 30 min |
| **Total Redis** | | ~60 GB | |

---

## SLOs and SLAs

### Service Level Objectives (SLOs)

| Metric | Target | Measurement Window | Error Budget |
|--------|--------|-------------------|--------------|
| Training job success rate | 99% | 7 days rolling | 1% failures |
| Generation job success rate | 99.5% | 7 days rolling | 0.5% failures |
| Quality check accuracy | 99% | 30 days | False pass < 1% |
| API availability | 99.9% | Monthly | 43.8 min downtime |
| Training latency (CTGAN, 1M) | P95 < 4 hours | Weekly | 5% exceed |
| Generation latency (100K) | P95 < 5 min | Weekly | 5% exceed |
| Quality check latency | P95 < 10 min | Weekly | 5% exceed |

### Service Level Agreements (SLAs)

| Tier | Availability | Support Response | Training Priority | Price Factor |
|------|--------------|------------------|-------------------|--------------|
| **Enterprise** | 99.9% | 1 hour | High (dedicated GPUs) | 3x |
| **Business** | 99.5% | 4 hours | Medium (shared pool) | 1.5x |
| **Starter** | 99% | 24 hours | Low (spot instances) | 1x |

### Quality Gates

| Gate | Metric | Threshold | Action on Fail |
|------|--------|-----------|----------------|
| Fidelity Gate | KS Test (all columns) | < 0.15 | Block release |
| Fidelity Gate | Correlation diff | < 0.2 | Block release |
| Utility Gate | TSTR score | > 0.8 × baseline | Warning |
| Privacy Gate | MIA success rate | < 10% | Block release |
| Privacy Gate | Exact match count | = 0 | Block release |

---

## Constraints and Assumptions

### Technical Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| GPU availability | Limited A100/H100 supply | Use spot instances, preemptible |
| Memory per GPU | 40-80 GB | Limits model size, batch size |
| Training time | Hours to days | Async processing required |
| Privacy budget | Finite epsilon | Limits number of generations |

### Business Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| Regulatory compliance | GDPR, HIPAA, CCPA | DP required for sensitive data |
| Data residency | Data must stay in region | Multi-region deployment |
| Audit requirements | Full traceability | Comprehensive logging |
| Cost optimization | GPU costs significant | Spot instances, tiered storage |

### Assumptions

| Assumption | Rationale | Risk if Wrong |
|------------|-----------|---------------|
| 80% tabular workloads | Enterprise data is mostly structured | Need more text/image models |
| 5x augmentation typical | Based on industry patterns | Storage estimates off |
| CTGAN adequate for 60% use cases | Fast and good enough | Need more Diffusion capacity |
| Spot availability > 70% | Historical cloud patterns | Higher costs if unavailable |
| Privacy budget ε=1-10 typical | Balance utility/privacy | May need stricter bounds |
