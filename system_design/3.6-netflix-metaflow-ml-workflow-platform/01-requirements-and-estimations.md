# Requirements and Estimations

## Functional Requirements

### Core Features (In Scope)

| Feature | Description | Priority |
|---------|-------------|----------|
| **DAG Definition** | Define workflows as Python classes with @flow and @step decorators | P0 |
| **Step Execution** | Execute steps locally or on cloud compute (AWS Batch, Kubernetes) | P0 |
| **Automatic Checkpointing** | Persist state after each step completion | P0 |
| **Resume Capability** | Resume failed runs from last successful checkpoint | P0 |
| **Data Versioning** | Version all artifacts with content-addressed storage | P0 |
| **Artifact Management** | Store/retrieve artifacts (data, models, metrics) between steps | P0 |
| **Branch/Join Patterns** | Support parallel branches with join synchronization | P0 |
| **Foreach Parallelism** | Fan-out execution over collections with automatic aggregation | P0 |
| **Conditional Execution** | Skip steps based on runtime conditions | P1 |
| **Resource Specification** | Declare CPU, memory, GPU requirements via @resources | P1 |
| **Environment Management** | Specify conda/pip environments via @conda, @pypi | P1 |
| **In-Task Checkpointing** | Optional manual checkpointing within long-running steps | P1 |
| **Metadata Tracking** | Track run/step/task/artifact metadata and lineage | P0 |
| **Client API** | Query past runs and artifacts programmatically | P1 |
| **Cards/Visualization** | Attach visual reports to steps via @card | P2 |

### Explicitly Out of Scope

| Feature | Reason | Alternative |
|---------|--------|-------------|
| Real-time model serving | Batch-focused platform | Use 3.2 ML Models Deployment System |
| Feature store | Separate concern | Use Feast, Tecton, or dedicated feature store |
| Model registry | Minimal built-in support | Integrate with MLflow, Weights & Biases |
| Training optimization | Framework responsibility | Use PyTorch, TensorFlow optimizations |
| Data ingestion/ETL | Workflow orchestration, not ETL | Use Spark, dbt, or dedicated ETL tools |
| A/B testing infrastructure | Production serving concern | Use feature flag or experimentation platform |

---

## Non-Functional Requirements

### CAP Theorem Choice

| Component | CAP Choice | Justification |
|-----------|------------|---------------|
| Metadata Service | CP (Consistency + Partition Tolerance) | Run state must be accurate; prefer unavailability over stale data |
| Datastore (Artifacts) | AP (Availability + Partition Tolerance) | Content-addressed storage; can retry uploads; deduplication handles conflicts |

### Consistency Model

| Data Type | Consistency | Explanation |
|-----------|-------------|-------------|
| Run/Step/Task metadata | Strong consistency | PostgreSQL with ACID transactions |
| Artifact references | Strong consistency | Stored in metadata, not eventually consistent |
| Artifact content | Eventual (de facto strong) | Content-addressed = immutable = no conflicts |
| Cross-region replication | Eventual | Async replication for disaster recovery |

### Availability Targets

| Component | Target | Justification |
|-----------|--------|---------------|
| Metadata Service | 99.9% | Central to workflow execution; multi-AZ deployment |
| Datastore (S3) | 99.99% | Managed service SLA |
| Compute Layer | 99.5% | Transient failures handled by resume |
| Metaflow UI | 99.5% | Non-critical for execution |

### Latency Targets

| Operation | P50 | P95 | P99 | Notes |
|-----------|-----|-----|-----|-------|
| Metadata read | 20ms | 50ms | 100ms | Database query |
| Metadata write | 30ms | 80ms | 150ms | Database write + replication |
| Small artifact upload (<1MB) | 100ms | 300ms | 500ms | S3 PUT |
| Large artifact upload (1GB) | 5s | 10s | 20s | S3 multipart |
| Step startup (local) | 10ms | 50ms | 100ms | Process spawn |
| Step startup (Batch) | 30s | 60s | 120s | Container scheduling |
| Step startup (K8s) | 10s | 30s | 60s | Pod scheduling |

### Durability Guarantees

| Data Type | Durability | Implementation |
|-----------|------------|----------------|
| Artifacts | 99.999999999% (11 nines) | S3 standard storage class |
| Metadata | 99.99% | PostgreSQL with automated backups |
| Checkpoints | Same as artifacts | Stored in Datastore |
| Logs | 99.9% | S3 with lifecycle policy |

---

## Capacity Estimations (Netflix Scale)

### Assumptions

| Parameter | Value | Source |
|-----------|-------|--------|
| Active projects | 3,000 | Netflix Tech Blog |
| Average runs per project per day | 17 | ~50K runs/day total |
| Average steps per run | 8 | Typical ML workflow |
| Average tasks per step | 5 | Foreach parallelism |
| Average artifacts per task | 3 | Input, output, metrics |
| Average artifact size | 50 MB | Mix of small configs and large models |
| Metadata records per task | 10 | Run + step + task + artifacts + tags |

### Capacity Calculations

| Metric | Estimation | Calculation |
|--------|------------|-------------|
| **DAU (Data Scientists)** | 1,000 | 30% of 3,000 projects active daily |
| **Runs per day** | 50,000 | 3,000 projects × 17 runs/project |
| **Steps per day** | 400,000 | 50,000 runs × 8 steps |
| **Tasks per day** | 2,000,000 | 400,000 steps × 5 tasks |
| **Artifacts per day** | 6,000,000 | 2,000,000 tasks × 3 artifacts |
| **Read:Write Ratio** | 3:1 | More reads (queries, UI) than writes |
| **Metadata writes/sec (avg)** | 70 | 6M artifacts × 10 records / 86400 sec |
| **Metadata writes/sec (peak)** | 700 | 10x peak factor |
| **Metadata reads/sec (avg)** | 210 | 3:1 read:write ratio |
| **Metadata reads/sec (peak)** | 2,100 | 10x peak factor |
| **Artifact storage/day** | 300 TB | 6M artifacts × 50 MB |
| **Storage (Year 1)** | 110 PB | 300 TB × 365 days |
| **Storage (Year 5)** | 550 PB | Linear growth assumption |
| **Artifact writes/sec (avg)** | 70 | 6M / 86400 |
| **Artifact writes/sec (peak)** | 700 | 10x peak factor |
| **Bandwidth (upload, avg)** | 3.5 GB/s | 70 × 50 MB |
| **Bandwidth (upload, peak)** | 35 GB/s | 700 × 50 MB |

### Storage Breakdown

| Data Type | Daily Volume | Yearly Volume | Retention |
|-----------|--------------|---------------|-----------|
| Artifacts (models, data) | 290 TB | 106 PB | Configurable (default: indefinite) |
| Artifacts (intermediate) | 10 TB | 3.6 PB | 30 days |
| Metadata | 10 GB | 3.6 TB | Indefinite |
| Logs | 50 GB | 18 TB | 90 days |
| Checkpoints | 5 TB | 1.8 PB | Run lifetime + 7 days |

### Compute Requirements

| Resource | Specification | Quantity | Purpose |
|----------|---------------|----------|---------|
| Metadata Service | 4 vCPU, 16 GB RAM | 6 instances | Multi-AZ, read replicas |
| PostgreSQL | db.r6g.xlarge | 3 (primary + 2 replicas) | Metadata storage |
| AWS Batch | c6i.4xlarge | 0-10,000 (auto-scale) | CPU-intensive steps |
| AWS Batch (GPU) | p4d.24xlarge | 0-500 (auto-scale) | Training steps |
| Kubernetes | m6i.2xlarge | 100-1,000 nodes | Lightweight steps |

---

## SLOs / SLAs

### Service Level Objectives

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Run submission success rate** | 99.9% | % of run submissions that start execution |
| **Step execution success rate** | 99.5% | % of steps that complete (excluding user code errors) |
| **Resume success rate** | 99.9% | % of resumed runs that recover correctly |
| **Artifact durability** | 99.999999999% | S3 durability SLA |
| **Metadata availability** | 99.9% | Uptime of Metadata Service |
| **Metadata query latency (P99)** | 100ms | End-to-end query time |
| **Artifact upload latency (P99, <1MB)** | 500ms | Time to complete upload |

### Service Level Agreements (Enterprise/Outerbounds)

| Tier | Availability | Support | Use Case |
|------|--------------|---------|----------|
| **Production** | 99.9% | 24/7, 1-hour response | Business-critical workflows |
| **Development** | 99.5% | Business hours, 4-hour response | Experimentation and iteration |
| **Free Tier** | Best effort | Community support | Open-source users |

### Error Budget

| SLO | Monthly Budget | Allowed Downtime |
|-----|----------------|------------------|
| 99.9% availability | 0.1% | 43.8 minutes/month |
| 99.5% availability | 0.5% | 3.65 hours/month |

---

## Cost Model (Back-of-Envelope)

### Storage Costs (Monthly, S3 Standard)

| Component | Volume | Unit Cost | Monthly Cost |
|-----------|--------|-----------|--------------|
| Artifacts | 9 PB (monthly avg) | $0.023/GB | $211,968 |
| Metadata (RDS) | 300 GB | $0.115/GB | $35 |
| Logs | 1.5 TB | $0.023/GB | $35 |
| **Total Storage** | | | ~$212,000/month |

### Compute Costs (Monthly)

| Component | Usage | Unit Cost | Monthly Cost |
|-----------|-------|-----------|--------------|
| AWS Batch (CPU) | 500K vCPU-hours | $0.034/vCPU-hour | $17,000 |
| AWS Batch (GPU) | 10K GPU-hours | $2.50/GPU-hour | $25,000 |
| Metadata Service (EC2) | 6 × c6i.xlarge | $0.17/hour | $734 |
| RDS PostgreSQL | 3 × db.r6g.xlarge | $0.50/hour | $1,080 |
| Step Functions | 10M state transitions | $0.025/1K | $250 |
| **Total Compute** | | | ~$44,000/month |

### Data Transfer Costs (Monthly)

| Component | Volume | Unit Cost | Monthly Cost |
|-----------|--------|-----------|--------------|
| Cross-AZ transfer | 50 TB | $0.01/GB | $500 |
| Internet egress | 10 TB | $0.09/GB | $900 |
| **Total Transfer** | | | ~$1,400/month |

### Total Estimated Cost

| Category | Monthly | Yearly |
|----------|---------|--------|
| Storage | $212,000 | $2.5M |
| Compute | $44,000 | $528K |
| Data Transfer | $1,400 | $17K |
| **Grand Total** | ~$257,000 | ~$3.1M |

*Note: Costs can be significantly reduced with S3 Intelligent-Tiering, Reserved Instances, and artifact lifecycle policies.*

---

## Growth Projections

| Year | Daily Runs | Yearly Storage | Metadata QPS (peak) | Estimated Cost |
|------|------------|----------------|---------------------|----------------|
| Year 1 | 50K | 110 PB | 2,800 | $3.1M |
| Year 2 | 75K | 165 PB | 4,200 | $4.6M |
| Year 3 | 100K | 220 PB | 5,600 | $6.2M |
| Year 5 | 150K | 330 PB | 8,400 | $9.3M |

### Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| Metadata QPS | > 3,000 | Add read replicas |
| Step queue depth | > 1,000 | Scale Batch compute |
| Artifact upload latency P99 | > 1s | Enable S3 Transfer Acceleration |
| Storage cost | > $250K/month | Implement lifecycle policies |
