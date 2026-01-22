# Requirements & Capacity Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Features (In Scope)

1. **Pipeline Definition & Execution**
   - YAML-based workflow definition with jobs, steps, and dependencies
   - Support for DAG (Directed Acyclic Graph) job dependencies
   - Conditional execution based on branch, path changes, or expressions
   - Matrix builds for multi-platform/version testing
   - Reusable workflows and composite actions
   - Manual workflow triggers with input parameters

2. **Event-Triggered Pipelines**
   - Git events: push, pull request, tag, release, merge
   - Scheduled triggers (cron expressions)
   - Manual dispatch via API or UI
   - External webhook triggers
   - Cross-repository dispatch

3. **Job Scheduling & Execution**
   - Fair-share scheduling across organizations
   - Priority lanes (e.g., production deployments over tests)
   - Job queuing with configurable timeouts
   - Parallel job execution within concurrency limits
   - Self-hosted runner support alongside managed runners

4. **Artifact & Cache Management**
   - Upload and download build artifacts between jobs
   - Artifact retention policies (configurable TTL)
   - Dependency caching (npm, pip, Maven, etc.)
   - Docker layer caching
   - Cache invalidation by key patterns

5. **Secrets & Environment Management**
   - Repository, organization, and environment-level secrets
   - OIDC token exchange for cloud provider authentication
   - Environment protection rules (approvals, wait timers)
   - Encrypted secrets in logs (masking)
   - Secret rotation support

6. **Observability & Notifications**
   - Real-time log streaming during execution
   - Status checks integration with pull requests
   - Webhook notifications on completion
   - Annotations and job summaries
   - Build badges and status API

### Out of Scope

- IDE integration and local runner execution
- Infrastructure provisioning (Terraform, CloudFormation)
- Application runtime hosting (covered by FaaS, Kubernetes)
- Full GitOps deployment engine (covered by Argo CD, Flux)
- Machine learning pipeline orchestration (covered by MLflow, Kubeflow)

---

## Non-Functional Requirements

### CAP Theorem Choice

**Control Plane: CP (Consistency + Partition Tolerance)**

**Justification:**
- Job execution state must be strongly consistent (exactly-once execution)
- Scheduler decisions require accurate view of queue and worker state
- Artifact uploads must be atomic and consistent

**Data Plane: AP (Availability + Partition Tolerance)**

**Justification:**
- Running jobs should continue even if control plane temporarily unavailable
- Log streaming can tolerate brief gaps
- Cache misses fall back to full build (eventually consistent)

### Consistency Model

| Component | Consistency Requirement |
|-----------|------------------------|
| Job state transitions | Strongly consistent |
| Artifact uploads | Strongly consistent |
| Workflow definitions | Strongly consistent |
| Log delivery | Eventually consistent (ordered within job) |
| Metrics aggregation | Eventually consistent |
| Cache availability | Eventually consistent |
| Runner pool state | Eventually consistent |

**Acceptable Inconsistency Windows:**

| Scenario | Acceptable Delay |
|----------|------------------|
| Job status update visible | < 1 second |
| Artifact available to downstream job | < 5 seconds |
| Log lines visible in UI | < 3 seconds |
| Cache propagation to new runners | < 30 seconds |
| Metrics dashboard refresh | < 60 seconds |

### Availability Targets

| Component | Target | Justification |
|-----------|--------|---------------|
| **Job execution service** | 99.95% | Critical for developer productivity |
| **Webhook ingestion** | 99.99% | Must not lose Git events |
| **Control plane (UI/API)** | 99.9% | Can tolerate brief outages |
| **Artifact storage** | 99.99% | Durability critical for builds |
| **Log streaming** | 99.9% | Logs can be replayed |

**Regional HA Requirements:**
- Multi-AZ deployment for control plane components
- Runner fleet distributed across availability zones
- Cross-region artifact replication for disaster recovery
- Regional failover for scheduler with global state sync

### Latency Targets

| Operation | Percentile | Target | Justification |
|-----------|------------|--------|---------------|
| Webhook to job queued | p99 | < 5 seconds | Fast feedback on push |
| Job pickup (queued to running) | p99 | < 30 seconds | Reasonable queue wait |
| Job pickup | p50 | < 5 seconds | Typical case |
| Log line visible after emit | p99 | < 3 seconds | Real-time debugging |
| Artifact upload (small, < 10 MB) | p99 | < 10 seconds | Inter-job handoff |
| Cache restore | p99 | < 30 seconds | Significant build speedup |

### Durability

| Data Type | Durability Requirement |
|-----------|----------------------|
| Workflow definitions | Highly durable (Git is source of truth) |
| Job execution records | Highly durable (90+ days) |
| Build artifacts | Configurable retention (1 day - 1 year) |
| Build logs | Configurable retention (30-90 days typical) |
| Cache entries | Best effort (eviction acceptable) |

### Throughput

| Operation | Target | Notes |
|-----------|--------|-------|
| Jobs per day (global) | 500M+ | Peak during business hours |
| Concurrent jobs (global) | 100K+ | Autoscaled runner fleet |
| Webhook events per second | 10K+ | Spike during push hours |
| Artifact uploads per second | 50K+ | End of parallel jobs |
| Log lines per second | 10M+ | Aggregated across all jobs |

---

## Capacity Estimations (Back-of-Envelope)

### Platform Scale Assumptions

| Metric | Value | Notes |
|--------|-------|-------|
| Active repositories | 50M+ | Using CI/CD service |
| Daily pipeline runs | 100M+ | Across all repositories |
| Jobs per pipeline (average) | 5 | Multi-job workflows common |
| Daily jobs executed | 500M+ | 100M pipelines × 5 jobs |
| Peak concurrent jobs | 100K+ | Business hours spike |
| Average job duration | 5 minutes | Highly variable |
| Average log size per job | 1 MB | Compressed |
| Average artifact size | 50 MB | Build outputs |

### Scheduler Sizing

**Assumptions:**
- Peak jobs queued: 500K
- Job state size: 2 KB (metadata, status)
- Decision latency target: < 10ms
- Scheduler throughput: 10K decisions/second

**Calculation:**
```
Queue memory = 500K jobs × 2 KB = 1 GB
PostgreSQL for job state: 10M active jobs × 2 KB = 20 GB
Redis for queues: 1 GB sorted sets + 2 GB working state = 3 GB
```

**Scheduler instances:** 5-10 active replicas (for HA and throughput)

### Worker Fleet Sizing

**Assumptions:**
- Peak concurrent jobs: 100K
- Worker types: 2-core, 4-core, 8-core, 16-core
- Average cores per job: 4
- Target utilization: 70%

**Calculation:**
```
Total cores needed = 100K jobs × 4 cores = 400K cores
With 70% utilization: 400K / 0.7 = 571K cores
Assuming 8-core workers: 571K / 8 = ~71K workers
```

**Worker fleet:** ~75,000 worker instances at peak (autoscaled)

### Storage Estimates

| Storage Type | Size | Notes |
|--------------|------|-------|
| Artifacts (hot, 7 days) | 50 PB | 500M jobs/day × 50 MB × 7 days × 0.3 (dedup) |
| Artifacts (warm, 90 days) | 350 PB | Lower access tier |
| Logs (compressed, 30 days) | 15 PB | 500M jobs/day × 1 MB × 30 days |
| Cache entries (global) | 20 PB | Dependency caches, Docker layers |
| Job metadata (PostgreSQL) | 5 TB | 1 year of job records |

### Network Bandwidth Estimates

| Traffic Type | Estimate | Notes |
|--------------|----------|-------|
| Git clone operations | 500+ Gbps | Source fetch at job start |
| Artifact uploads | 200+ Gbps | End of job uploads |
| Cache downloads | 300+ Gbps | Start of job cache restore |
| Log ingestion | 100+ Gbps | Continuous during execution |
| Control plane (API) | 50+ Gbps | Webhooks, status updates |

### Regional Deployment

| Component | Count per Region | Specification |
|-----------|------------------|---------------|
| Scheduler nodes | 5-10 | 16 CPU, 64 GB RAM |
| Worker manager | 3-5 | 8 CPU, 32 GB RAM |
| API gateway | 20-50 | 8 CPU, 16 GB RAM |
| Worker instances | 10,000-30,000 | 4-16 CPU, 8-32 GB RAM |
| PostgreSQL (primary) | 1 | 64 CPU, 512 GB RAM, SSD |
| PostgreSQL (replicas) | 2-4 | Read replicas |
| Redis Cluster | 6-12 nodes | 32 GB RAM each |
| Object Storage | Regional bucket | Virtually unlimited |

---

## SLOs / SLAs

### Service Level Objectives (Internal)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Job Completion Rate** | 99.9% | (Completed + Failed) / Queued, excluding user errors |
| **Job Pickup Latency** | < 30s p99 | Time from queued to running |
| **Webhook Processing** | < 5s p99 | Webhook received to pipeline created |
| **Artifact Availability** | 99.99% | Upload success + download success |
| **Log Delivery Latency** | < 3s p99 | Emit to visible |
| **Cache Hit Rate** | > 80% | For configured caches |

### Service Level Agreements (External)

| Metric | Commitment | Remedy |
|--------|------------|--------|
| Monthly Availability | 99.95% | Service credits |
| Job Execution Guarantee | No lost jobs | Jobs are durable once queued |
| Artifact Durability | 99.999999999% (11 9s) | Within retention period |
| Data Residency | Regional execution | Compliance commitment |

### Error Budget

| Period | Allowed Downtime (99.95%) | Allowed Downtime (99.9%) |
|--------|---------------------------|--------------------------|
| Monthly | 21.6 minutes | 43.2 minutes |
| Quarterly | 1.08 hours | 2.16 hours |
| Annually | 4.38 hours | 8.76 hours |

---

## Constraints & Assumptions

### Technical Constraints

1. **Job isolation boundary** - Each job runs in isolated container/VM
2. **Job timeout** - Maximum 6-72 hours depending on plan
3. **Concurrency limits** - Per-repository and per-organization limits
4. **Artifact size limits** - 5 GB per artifact, 50 GB per workflow
5. **Log retention** - Maximum 90 days (configurable)
6. **Cache size limits** - 10 GB per cache key
7. **Webhook payload** - Maximum 25 MB
8. **Workflow file size** - Maximum 1 MB YAML

### Platform Limits

| Resource | Limit |
|----------|-------|
| Jobs per workflow | 256 |
| Steps per job | 1,000 |
| Concurrent jobs (free) | 20 |
| Concurrent jobs (enterprise) | 500+ |
| Matrix combinations | 256 |
| Workflow run time | 72 hours max |
| Job run time | 6 hours (default) |
| Artifacts per workflow | 500 |
| Total artifact size | 50 GB per workflow |
| Cache size per repository | 10 GB |
| Secrets per repository | 1,000 |

### Business Constraints

1. **Multi-tenancy** - Strong isolation between organizations
2. **Billing accuracy** - Per-minute billing for compute
3. **Compliance** - SOC2, HIPAA, FedRAMP for enterprise
4. **Data residency** - Optional regional execution constraints
5. **Open source** - Free tier for public repositories

### Assumptions

1. Workflows are defined in repository YAML files
2. Source code is fetched via Git at job start
3. Jobs are designed to be reproducible (same inputs = same outputs)
4. External dependencies (npm, Docker Hub) are available
5. Workers have network access (configurable egress rules)

---

## Success Criteria

| Criteria | Measurement | Target |
|----------|-------------|--------|
| Job pickup rate | p99 queue wait time | < 30 seconds |
| Pipeline success rate | Successful / Total (excluding user errors) | > 95% |
| Mean time to feedback | Push to first status check | < 2 minutes |
| Cache effectiveness | Build time with cache / without cache | > 50% reduction |
| Worker utilization | Active time / Total time | > 60% |
| Customer-visible errors | Platform errors / Total jobs | < 0.1% |
| Runner scaling efficiency | Scale-up time to target capacity | < 5 minutes |
