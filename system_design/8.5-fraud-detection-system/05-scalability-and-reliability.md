# Scalability & Reliability

## Scaling Strategy Overview

The fraud detection system has fundamentally different scaling profiles across its components:

| Component | Scaling Dimension | Scaling Strategy | Bottleneck |
|-----------|------------------|-----------------|-----------|
| Scoring Service | Transactions/sec | Horizontal pod autoscaling | CPU (model inference) |
| Feature Store (RT) | Entity count + write throughput | Sharded in-memory cluster | Memory + network |
| Feature Store (Batch) | Entity count | Read-replica scaling | Storage + read throughput |
| Rules Engine | Rules count x TPS | Stateless horizontal scaling | CPU |
| Stream Processor | Event throughput | Partition-based scaling | Partition count |
| Graph Engine | Graph size (nodes + edges) | Vertical + read replicas | Memory for traversal |
| Case Management | Analyst count + case volume | Standard horizontal scaling | Database I/O |
| Model Training | Dataset size x model complexity | GPU cluster (on-demand) | GPU memory + time |

---

## Scoring Service Scaling

### Horizontal Auto-Scaling

The scoring service is stateless---all state lives in the feature stores and model artifact cache. This enables straightforward horizontal scaling:

```
Scaling Policy:
  Metric: Average CPU utilization across scoring pods
  Scale-up trigger:   CPU > 60% for 2 minutes  → Add 2 pods
  Scale-up trigger:   CPU > 80% for 30 seconds  → Add 5 pods (fast scale)
  Scale-down trigger: CPU < 30% for 10 minutes → Remove 1 pod

  Min replicas: 10 (always-on capacity for baseline traffic)
  Max replicas: 80 (peak holiday capacity)

  Pre-scaling events:
    - Black Friday: Pre-scale to 50 pods 1 hour before
    - Flash sales: Merchant API triggers pre-scale 15 minutes before
```

### Latency-Aware Load Balancing

Standard round-robin load balancing ignores per-pod latency. A pod experiencing GC pauses or model-loading receives the same traffic as healthy pods.

```
FUNCTION select_scoring_pod(request, available_pods):
    // Weighted random selection based on recent p99 latency
    weights = []
    FOR pod IN available_pods:
        IF pod.p99_latency_1m > LATENCY_THRESHOLD:
            weights.append(0.1)   // Deprioritize slow pods
        ELSE IF pod.inflight_requests > MAX_INFLIGHT:
            weights.append(0.0)   // Skip overloaded pods
        ELSE:
            weights.append(1.0 / MAX(pod.p99_latency_1m, 1))  // Inverse latency weighting

    RETURN WEIGHTED_RANDOM_SELECT(available_pods, weights)
```

---

## Feature Store Scaling

### Real-Time Feature Store: Sharded In-Memory Cluster

The RT feature store must handle:
- **Reads**: ~500 TPS x 5 entity lookups = 2,500 reads/sec (low for in-memory store)
- **Writes**: ~500 TPS x 3 entity updates = 1,500 writes/sec from stream processor
- **Data volume**: ~50M active entities x 500 bytes avg = ~25 GB in memory

**Sharding strategy**: Consistent hash on entity_id across N cache nodes. Each node holds ~25GB / N of data.

```
Cluster topology (baseline):
  - 8 nodes, each 8 GB RAM allocated to feature data
  - Replication factor: 2 (each shard has 1 replica)
  - Total memory: 64 GB (32 GB effective after replication)
  - Headroom for growth: ~28%

Scaling triggers:
  - Memory utilization > 75% → Add 2 nodes
  - Read latency p99 > 5ms → Add 2 nodes
  - New entity growth rate > 10% month-over-month → Proactive capacity planning
```

**Hot entity mitigation**: Certain entities (popular merchants, shared devices at corporate networks) receive disproportionate read traffic. Solution: local in-process cache on scoring pods for top-10K entities, refreshed every 30 seconds.

### Batch Feature Store Scaling

The batch feature store handles:
- **Reads**: Same as RT store (2,500 reads/sec)
- **Writes**: Bulk writes during batch pipeline runs (hourly/daily)
- **Data volume**: ~100M entities x 2 KB avg = ~200 GB

**Strategy**: Key-value store with read replicas.

```
Architecture:
  - Primary: 3-node cluster (write path for batch updates)
  - Read replicas: 5 replicas (scored service reads)
  - Replication lag: < 5 seconds (acceptable for batch features)

  Batch update process:
    1. Batch pipeline computes new features
    2. Features written to staging table
    3. Atomic swap: staging becomes active, old active becomes backup
    4. Read replicas catch up within 5 seconds
```

---

## Stream Processor Scaling

The stream processor is the pipeline that computes real-time features from transaction events. Scaling is tied to event bus partition count.

### Partition-Based Scaling

```
Event topology:
  - Transaction events topic: 64 partitions
  - Partition key: user_id (ensures all events for a user go to same partition)
  - Consumer group: stream-processor-group

Scaling:
  - 1 consumer instance per partition (max parallelism = 64)
  - Baseline: 32 instances (50% utilization per instance)
  - Peak: 64 instances (1:1 instance-to-partition)
  - Over 64: Re-partition topic to 128 partitions (planned migration)
```

**Key constraint**: All events for a given user_id must be processed by the same instance (for consistent velocity counter updates). This means:
- Scaling up beyond partition count requires repartitioning
- Hot users (extremely active accounts) can create partition hotspots
- Mitigation: Sub-partition routing for known hot users

### Backpressure Handling

```
FUNCTION handle_backpressure(consumer_lag, current_instances):
    // If consumer lag exceeds threshold, scoring uses stale features
    IF consumer_lag > MAX_ACCEPTABLE_LAG:
        ALERT("Feature freshness SLO at risk")

        // Step 1: Scale up consumers if possible
        IF current_instances < MAX_PARTITIONS:
            SCALE_UP(MIN(current_instances * 2, MAX_PARTITIONS))

        // Step 2: If still behind, drop low-priority feature computations
        IF consumer_lag > CRITICAL_LAG:
            DISABLE_FEATURES(["behavioral_biometrics", "session_analysis"])
            // Keep only velocity counters and device features
            ALERT_CRITICAL("Degraded feature computation mode")
```

---

## Model Deployment and Canary Strategy

### Canary Deployment Pipeline

New model versions are deployed through a multi-stage canary:

```
Stage 1: Shadow Mode (Day 0-1)
  - New model scores alongside current model
  - Only current model's decision is used
  - Compare scores offline: AUC, precision, recall, FP rate
  - Automatic gate: new model must match or exceed current on all metrics

Stage 2: Canary (Day 1-2)
  - 5% of traffic routed to new model for actual decisions
  - Real-time comparison dashboard
  - Automatic rollback if:
    - FP rate increases > 0.5% absolute
    - p99 latency increases > 20ms
    - AUC drops below threshold
    - Any scoring errors

Stage 3: Gradual Rollout (Day 2-4)
  - 5% → 25% → 50% → 100%
  - Each stage holds for minimum 6 hours
  - Same automatic rollback criteria

Stage 4: Full Deployment (Day 4+)
  - Previous model version kept warm for 7 days (instant rollback)
  - Model artifact archived to cold storage
```

### Model Versioning and Rollback

```
FUNCTION rollback_model(target_version):
    // Verify target version exists and is compatible
    target_artifact = MODEL_STORE.get(target_version)
    ASSERT target_artifact.feature_schema == CURRENT_FEATURE_SCHEMA

    // Instant swap (no cold start — warm models cached)
    FOR pod IN scoring_pods:
        pod.set_active_model(target_version)

    // Verify rollback health
    WAIT(30 seconds)
    IF scoring_metrics.error_rate > BASELINE:
        ALERT_CRITICAL("Rollback failed — escalate to ML oncall")
    ELSE:
        LOG("Rollback to " + target_version + " successful")
```

---

## Reliability Patterns

### Circuit Breaker Configuration

Each dependency in the scoring pipeline has an independent circuit breaker:

| Dependency | Failure Threshold | Open Duration | Fallback |
|-----------|-------------------|---------------|---------|
| RT Feature Store | 50% failure in 10s | 30 seconds | Serve stale from L1 cache |
| Batch Feature Store | 50% failure in 10s | 30 seconds | Score without batch features |
| Model Serving | 30% failure in 10s | 15 seconds | Rules-only scoring |
| Rules Engine | 50% failure in 10s | 30 seconds | ML-only scoring |
| Graph Engine | 70% failure in 30s | 5 minutes | Skip graph risk scores |
| Event Bus (publish) | 50% failure in 10s | 60 seconds | Buffer events locally, replay |

### Graceful Degradation Levels

```
Level 0 — Full Operation:
  All features + ML ensemble + rules + graph scores
  Expected: 99.5% of time

Level 1 — Partial Feature Degradation:
  Available RT features + all batch features + ML + rules
  Trigger: RT feature store partial failure
  Impact: Slightly reduced accuracy (~0.5% AUC drop)

Level 2 — Batch Features Only:
  Batch features + ML (reduced feature set) + rules
  Trigger: RT feature store complete failure
  Impact: Missing velocity features; rules compensate with tighter thresholds

Level 3 — Rules Only:
  Deterministic rules with conservative thresholds
  Trigger: Model serving failure
  Impact: Higher false positive rate (~2x); catches obvious fraud only

Level 4 — Fail Open:
  Allow all transactions, queue for async review
  Trigger: Complete scoring pipeline failure
  Impact: Fraud risk during window; all transactions flagged for post-review
```

---

## Disaster Recovery

### Recovery Point and Time Objectives

| Component | RPO | RTO | Strategy |
|-----------|-----|-----|---------|
| Scoring Service | N/A (stateless) | < 2 minutes | Auto-scaling in secondary region |
| RT Feature Store | < 5 seconds | < 30 seconds | Active-active in-memory replication |
| Batch Feature Store | < 1 hour | < 10 minutes | Cross-region replicated store |
| Model Artifacts | < 24 hours | < 5 minutes | Object storage with cross-region replication |
| Rule Definitions | < 1 minute | < 2 minutes | Replicated config store |
| Event Store | < 5 minutes | < 15 minutes | Cross-region stream replication |
| Case Database | < 1 minute | < 5 minutes | Synchronous cross-region replication |
| Graph Database | < 1 hour | < 30 minutes | Async snapshot + replay |

### Multi-Region Architecture

```
Region A (Primary):
  ├── Scoring Service (active)
  ├── RT Feature Store (active, writes)
  ├── Batch Feature Store (active, writes)
  ├── Stream Processor (active)
  ├── Graph Engine (active)
  └── Case Management (active)

Region B (Hot Standby):
  ├── Scoring Service (warm, receives 10% canary traffic)
  ├── RT Feature Store (replica, async sync from A)
  ├── Batch Feature Store (replica, read-only)
  ├── Stream Processor (standby, ready to activate)
  ├── Graph Engine (standby, periodic snapshot from A)
  └── Case Management (active-active, shared database)

Failover trigger: Region A scoring availability < 99% for 5 minutes
Failover time: < 2 minutes (DNS-based traffic shift)
Data loss risk: RT features may be 5-30 seconds stale in Region B
```

---

## Capacity Planning

### Growth Projections

| Metric | Current | +6 Months | +12 Months | Scaling Action Needed |
|--------|---------|-----------|------------|----------------------|
| Transactions/day | 15M | 22M | 35M | Stream processor partition increase at 25M |
| Feature store entities | 100M | 150M | 250M | Cache cluster expansion at 130M |
| Graph nodes | 100M | 160M | 280M | Graph DB tier upgrade at 200M |
| Graph edges | 1B | 1.8B | 3.5B | Graph sharding at 2B |
| Model feature count | 300 | 400 | 500 | Inference latency review at 400 |
| Case volume/day | 5,000 | 7,500 | 12,000 | Analyst team scaling at 8K |

### Performance Testing Strategy

```
Load test cadence: Monthly
Targets:
  - Sustained: 2x current peak TPS for 1 hour
  - Burst: 5x current peak TPS for 5 minutes
  - Degradation: Verify graceful degradation with component failures

Chaos engineering:
  - Monthly: Random scoring pod termination during peak
  - Quarterly: Feature store node failure injection
  - Quarterly: Model serving timeout simulation
  - Annual: Full region failover drill
```
