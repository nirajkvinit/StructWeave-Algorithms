# Scalability and Reliability

[Back to Index](./00-index.md)

---

## Overview

This document covers the scaling strategies and fault tolerance mechanisms for the AI Native Cloud ERP. The system must handle:
- **Multi-tenant scale**: 10K+ tenants with heterogeneous workloads
- **AI infrastructure**: GPU clusters with variable demand
- **Financial data**: Zero data loss tolerance for transactions
- **Global deployment**: Multi-region with data residency compliance

---

## Scalability

### Horizontal Scaling Strategy

```
SCALING TIERS:

Tier 1: Stateless Services (ERP Modules, API Gateway)
┌─────────────────────────────────────────────────────────────┐
│  Scaling: Horizontal, automatic                             │
│  Trigger: CPU > 70% OR request queue > 100                  │
│  Scale up: Add 2 instances                                  │
│  Scale down: Remove 1 instance (gradual)                    │
│  Min instances: 3 per region                                │
│  Max instances: 50 per region                               │
└─────────────────────────────────────────────────────────────┘

Tier 2: GPU Cluster (LLM Serving)
┌─────────────────────────────────────────────────────────────┐
│  Scaling: Horizontal with constraints                       │
│  Trigger: Queue depth > 50 OR P95 latency > 3s              │
│  Scale up: Add 1 GPU node (5 min warm-up)                   │
│  Scale down: Remove 1 GPU node after 30 min idle            │
│  Min nodes: 4 per region (model loaded)                     │
│  Max nodes: 20 per region                                   │
│  Constraint: Reserved capacity for enterprise tenants       │
└─────────────────────────────────────────────────────────────┘

Tier 3: Database (PostgreSQL)
┌─────────────────────────────────────────────────────────────┐
│  Scaling: Vertical + Read replicas                          │
│  Primary: Vertical scale (more CPU, memory)                 │
│  Read: Add replicas per region (1-5)                        │
│  Sharding: By tenant (consistent hashing)                   │
│  Max connections: 1000 per shard                            │
└─────────────────────────────────────────────────────────────┘

Tier 4: Vector Database
┌─────────────────────────────────────────────────────────────┐
│  Scaling: Horizontal sharding                               │
│  Trigger: Query latency > 200ms OR memory > 80%             │
│  Scale: Add shard, rebalance data                           │
│  Sharding key: tenant_id                                    │
└─────────────────────────────────────────────────────────────┘
```

### Autoscaling Configuration

```
GPU CLUSTER AUTOSCALING:

FUNCTION gpu_autoscale_decision():
    metrics = collect_gpu_metrics()

    // Calculate demand
    current_qps = metrics.inference_requests_per_second
    queue_depth = metrics.pending_requests
    avg_latency_p95 = metrics.latency_percentile(95)

    // Capacity per GPU (varies by model and batching)
    capacity_per_gpu = 10  // QPS with continuous batching

    // Current capacity
    current_capacity = metrics.active_gpus * capacity_per_gpu

    // Scale up conditions
    IF queue_depth > 50:
        needed = CEIL(queue_depth / capacity_per_gpu) + buffer
        RETURN ScaleUp(needed)

    IF avg_latency_p95 > 3000:  // 3 seconds
        RETURN ScaleUp(2)

    IF current_qps > current_capacity * 0.8:  // 80% utilization
        RETURN ScaleUp(1)

    // Scale down conditions (with hysteresis)
    IF current_qps < current_capacity * 0.3:  // 30% utilization
        IF metrics.time_below_threshold > 30_minutes:
            RETURN ScaleDown(1)

    RETURN NoChange()

ERP SERVICE AUTOSCALING:

apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: finance-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: finance-service
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: request_queue_length
        target:
          type: AverageValue
          averageValue: 100
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120
```

### Database Scaling Strategy

```
DATABASE SCALING ARCHITECTURE:

┌─────────────────────────────────────────────────────────────┐
│                    Connection Router                         │
│                 (PgBouncer / ProxySQL)                       │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Shard 1   │  │   Shard 2   │  │   Shard 3   │         │
│  │ Tenants A-H │  │ Tenants I-P │  │ Tenants Q-Z │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │   Primary   │  │   Primary   │  │   Primary   │         │
│  │  (Writes)   │  │  (Writes)   │  │  (Writes)   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │  Replica 1  │  │  Replica 1  │  │  Replica 1  │         │
│  │  (Reads)    │  │  (Reads)    │  │  (Reads)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Replica 2  │  │  Replica 2  │  │  Replica 2  │         │
│  │  (Reads)    │  │  (Reads)    │  │  (Reads)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘

SHARD REBALANCING:

FUNCTION rebalance_shard(overloaded_shard):
    // Identify tenants to move
    tenants = get_tenants_by_load(overloaded_shard)
    tenants_to_move = select_for_rebalance(tenants, target_load_reduction=30%)

    FOR tenant IN tenants_to_move:
        // Phase 1: Dual-write
        enable_dual_write(tenant, source=overloaded_shard, target=new_shard)

        // Phase 2: Copy historical data
        copy_historical_data(tenant, source, target)

        // Phase 3: Verify consistency
        IF verify_data_consistency(tenant, source, target):
            // Phase 4: Switch reads
            switch_reads(tenant, target)

            // Phase 5: Stop dual-write, switch writes
            switch_writes(tenant, target)
            disable_dual_write(tenant, source)

            // Phase 6: Cleanup
            schedule_cleanup(tenant, source, delay=7_days)
        ELSE:
            rollback_rebalance(tenant)
            RAISE RebalanceError(tenant)
```

### Tenant-Aware Routing

```
TENANT ROUTING STRATEGY:

┌─────────────────────────────────────────────────────────────┐
│  Tenant Classification                                      │
│                                                             │
│  Enterprise (100 tenants):                                  │
│  - Dedicated shard (or dedicated database)                  │
│  - Dedicated GPU allocation (10% reserved)                  │
│  - Priority queue for AI inference                          │
│                                                             │
│  Mid-Market (1K tenants):                                   │
│  - Shared shards (grouped by region)                        │
│  - Shared GPU pool with priority                            │
│  - Standard queue for AI inference                          │
│                                                             │
│  SMB (10K tenants):                                         │
│  - Shared shards (high density)                             │
│  - Shared GPU pool                                          │
│  - Best-effort queue for AI inference                       │
└─────────────────────────────────────────────────────────────┘

ROUTING PSEUDOCODE:

FUNCTION route_request(request, tenant):
    tier = tenant.tier

    // Database routing
    IF tier == "enterprise":
        db_connection = get_dedicated_connection(tenant.dedicated_shard)
    ELSE:
        shard = get_shard_for_tenant(tenant.id)
        db_connection = get_pooled_connection(shard)

    // GPU routing
    IF request.requires_ai:
        IF tier == "enterprise":
            gpu_queue = get_priority_queue(tenant.id)
        ELSE IF tier == "mid_market":
            gpu_queue = get_standard_queue()
        ELSE:
            gpu_queue = get_best_effort_queue()

        ai_response = gpu_queue.submit(request.ai_payload)

    RETURN process_request(request, db_connection, ai_response)
```

### Caching Layers

```
CACHING ARCHITECTURE:

L1: Application Cache (In-Memory)
┌─────────────────────────────────────────────────────────────┐
│  - Tenant configuration (TTL: 5 min)                        │
│  - User sessions (TTL: 30 min)                              │
│  - Frequently accessed entities (TTL: 1 min)                │
│  - Size: 1GB per service instance                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
L2: Distributed Cache (Redis Cluster)
┌─────────────────────────────────────────────────────────────┐
│  - Account balances (TTL: 30 sec, invalidate on write)      │
│  - Report results (TTL: 1 hour)                             │
│  - AI response cache (TTL: 5 min, idempotent queries)       │
│  - Vector search results (TTL: 10 min)                      │
│  - Size: 100GB per region                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
L3: CDN / Edge Cache
┌─────────────────────────────────────────────────────────────┐
│  - Static assets (TTL: 1 day)                               │
│  - API responses (TTL: varies by endpoint)                  │
│  - Size: Unlimited (CDN managed)                            │
└─────────────────────────────────────────────────────────────┘

CACHE INVALIDATION:

FUNCTION invalidate_cache(entity_type, entity_id, tenant_id):
    // L1: Application cache
    app_cache.delete(f"{tenant_id}:{entity_type}:{entity_id}")

    // L2: Distributed cache
    redis.delete(f"{tenant_id}:{entity_type}:{entity_id}")

    // Publish invalidation event for other instances
    pubsub.publish("cache_invalidation", {
        "tenant_id": tenant_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "timestamp": now()
    })

    // L3: CDN (if applicable)
    IF entity_type IN cdn_cached_types:
        cdn.purge(f"/api/{entity_type}/{entity_id}")
```

---

## Reliability & Fault Tolerance

### Single Points of Failure (SPOF) Analysis

| Component | SPOF Risk | Mitigation |
|-----------|-----------|------------|
| **API Gateway** | Yes | Multiple instances behind load balancer |
| **Database Primary** | Yes | Automatic failover to replica |
| **GPU Cluster** | Partial | Multiple nodes, request redistribution |
| **Event Store** | Yes | Multi-broker cluster, replication |
| **HSM** | Yes | HSM cluster with automatic failover |
| **Vector Database** | Partial | Replicated shards, fallback to keyword |

### Redundancy Strategy

```
MULTI-REGION REDUNDANCY:

┌─────────────────────────────────────────────────────────────┐
│                      US-EAST (Primary)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ API Servers │  │ GPU Cluster │  │  Database   │         │
│  │   (Active)  │  │   (Active)  │  │  (Primary)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                     Async Replication
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      US-WEST (Secondary)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ API Servers │  │ GPU Cluster │  │  Database   │         │
│  │  (Standby)  │  │  (Standby)  │  │  (Replica)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘

REPLICATION CONFIGURATION:

Database:
  - Synchronous replication within region (for HA)
  - Asynchronous replication across regions (for DR)
  - Replication lag SLO: < 1 second

Event Store:
  - In-sync replicas: 2 (within region)
  - Replication factor: 3
  - Cross-region: Async mirror

GPU Cluster:
  - No state replication needed (stateless inference)
  - Model artifacts replicated to all regions
  - Request routing based on availability
```

### Failover Mechanisms

```
DATABASE FAILOVER:

FUNCTION handle_primary_failure(shard_id):
    // Detection: Health check fails 3 consecutive times
    failed_primary = get_primary(shard_id)

    IF NOT health_check(failed_primary, retries=3):
        // Step 1: Fence the failed primary
        fence_node(failed_primary)  // Prevent split-brain

        // Step 2: Promote replica
        best_replica = select_best_replica(shard_id)
        promote_to_primary(best_replica)

        // Step 3: Update routing
        update_routing(shard_id, new_primary=best_replica)

        // Step 4: Notify and alert
        send_alert("database_failover", shard_id)
        log_incident("primary_failure", failed_primary)

        // Step 5: Rebuild replica pool
        schedule_replica_rebuild(shard_id)

FUNCTION select_best_replica(shard_id):
    replicas = get_replicas(shard_id)

    // Score replicas
    FOR replica IN replicas:
        replica.score = calculate_score(
            replication_lag=replica.lag,
            load=replica.cpu_utilization,
            availability=replica.uptime
        )

    // Select lowest lag, then highest availability
    RETURN sorted(replicas, by="score")[0]

GPU FAILOVER:

FUNCTION handle_gpu_node_failure(node_id):
    // Step 1: Mark node unhealthy
    mark_unhealthy(node_id)

    // Step 2: Redistribute pending requests
    pending_requests = get_pending_requests(node_id)
    FOR request IN pending_requests:
        healthy_node = get_healthy_node()
        requeue_request(request, healthy_node)

    // Step 3: Update load balancer
    remove_from_lb(node_id)

    // Step 4: Attempt node recovery
    TRY:
        restart_node(node_id)
        reload_model(node_id)
        IF health_check(node_id):
            mark_healthy(node_id)
            add_to_lb(node_id)
    CATCH:
        schedule_node_replacement(node_id)
```

### Circuit Breaker Pattern

```
CIRCUIT BREAKER IMPLEMENTATION:

STATE MACHINE:
  ┌─────────────┐     failure_threshold     ┌─────────────┐
  │   CLOSED    │ ─────────────────────────► │    OPEN     │
  │  (Normal)   │                            │  (Failing)  │
  └──────┬──────┘                            └──────┬──────┘
         │                                          │
         │                                   timeout_period
         │                                          │
         │              success              ┌──────▼──────┐
         └◄───────────────────────────────── │  HALF-OPEN  │
                                             │  (Testing)  │
                                             └─────────────┘

PSEUDOCODE:

CLASS CircuitBreaker:
    state = CLOSED
    failure_count = 0
    last_failure_time = NULL

    FUNCTION call(operation):
        IF state == OPEN:
            IF now() - last_failure_time > timeout_period:
                state = HALF_OPEN
            ELSE:
                RAISE CircuitOpenError()

        TRY:
            result = operation()

            IF state == HALF_OPEN:
                state = CLOSED
                failure_count = 0

            RETURN result

        CATCH error:
            record_failure()

            IF failure_count >= failure_threshold:
                state = OPEN
                last_failure_time = now()

            RAISE error

    FUNCTION record_failure():
        failure_count += 1
        // Sliding window: only count recent failures
        failure_count = count_failures_in_window(window=60_seconds)

USAGE:

ai_circuit = CircuitBreaker(
    failure_threshold=5,
    timeout_period=30_seconds
)

FUNCTION get_ai_response(query):
    TRY:
        RETURN ai_circuit.call(
            lambda: llm_cluster.inference(query)
        )
    CATCH CircuitOpenError:
        // Fallback behavior
        RETURN fallback_response(query)
```

### Retry Strategy with Exponential Backoff

```
RETRY CONFIGURATION:

Transient Failures (Network, Timeouts):
  - Max retries: 3
  - Initial delay: 100ms
  - Max delay: 5s
  - Backoff multiplier: 2
  - Jitter: 0-20%

Database Deadlocks:
  - Max retries: 3
  - Initial delay: 50ms
  - Max delay: 500ms
  - Backoff multiplier: 2

GPU Queue Full:
  - Max retries: 2
  - Initial delay: 1s
  - Max delay: 5s
  - Backoff multiplier: 2

External API Calls:
  - Max retries: 3
  - Initial delay: 500ms
  - Max delay: 10s
  - Backoff multiplier: 2
  - Circuit breaker: enabled

PSEUDOCODE:

FUNCTION retry_with_backoff(operation, config):
    attempt = 0
    last_error = NULL

    WHILE attempt < config.max_retries:
        TRY:
            RETURN operation()
        CATCH RetryableError as error:
            last_error = error
            attempt += 1

            IF attempt < config.max_retries:
                delay = calculate_delay(attempt, config)
                sleep(delay)
        CATCH NonRetryableError as error:
            RAISE error

    RAISE MaxRetriesExceeded(last_error)

FUNCTION calculate_delay(attempt, config):
    base_delay = config.initial_delay * (config.backoff_multiplier ** attempt)
    capped_delay = MIN(base_delay, config.max_delay)

    // Add jitter to prevent thundering herd
    jitter = random(0, 0.2) * capped_delay
    RETURN capped_delay + jitter
```

### Graceful Degradation

```
DEGRADATION LEVELS:

Level 0: Full Operation
├── All ERP modules operational
├── All AI features available
├── Real-time agents processing
└── Full analytics and reporting

Level 1: AI Degraded (GPU issues)
├── ERP modules: FULL
├── AI inference: QUEUED (higher latency acceptable)
├── Agents: PAUSED (queue for later)
├── Document processing: QUEUED
├── Reports: FULL
└── Action: Scale GPU, investigate

Level 2: AI Unavailable (GPU cluster down)
├── ERP modules: FULL
├── AI inference: DISABLED
├── Agents: DISABLED (manual fallback)
├── Document processing: MANUAL ONLY
├── Reports: FULL
└── Action: Major incident, failover to secondary region

Level 3: Database Degraded (Replica issues)
├── ERP modules: WRITE-ONLY (no complex reads)
├── AI inference: LIMITED (no historical context)
├── Agents: DISABLED
├── Reports: DISABLED
└── Action: Failover replica, rebuild

Level 4: Database Primary Down
├── ERP modules: READ-ONLY
├── AI inference: DISABLED
├── All writes: QUEUED
└── Action: Promote replica, incident response

Level 5: Regional Outage
├── ERP modules: FAILOVER TO SECONDARY
├── AI inference: SECONDARY REGION
├── Data: Last sync point
└── Action: DR activation

DEGRADATION DETECTION:

FUNCTION assess_system_health():
    health = {
        "gpu_cluster": check_gpu_health(),
        "database_primary": check_db_primary_health(),
        "database_replicas": check_db_replica_health(),
        "event_store": check_event_store_health(),
        "vector_db": check_vector_db_health()
    }

    IF NOT health["database_primary"]:
        IF NOT any(health["database_replicas"]):
            RETURN Level.REGIONAL_OUTAGE
        ELSE:
            activate_failover()
            RETURN Level.DATABASE_PRIMARY_DOWN

    IF NOT health["gpu_cluster"]:
        RETURN Level.AI_UNAVAILABLE

    IF health["gpu_cluster"].degraded:
        RETURN Level.AI_DEGRADED

    IF NOT all(health["database_replicas"]):
        RETURN Level.DATABASE_DEGRADED

    RETURN Level.FULL_OPERATION
```

### Saga Pattern for Distributed Transactions

```
SAGA PATTERN FOR ERP TRANSACTIONS:

Example: Invoice Payment Processing

Step 1: Validate Invoice
  └─ Compensate: N/A (read-only)

Step 2: Check Budget
  └─ Compensate: N/A (read-only)

Step 3: Create Payment Record
  └─ Compensate: Delete Payment Record

Step 4: Update Invoice Status
  └─ Compensate: Revert Invoice Status

Step 5: Post to General Ledger
  └─ Compensate: Reverse GL Entry

Step 6: Send Notification
  └─ Compensate: Send Cancellation Notification

SAGA ORCHESTRATOR:

CLASS PaymentSaga:
    steps = [
        SagaStep("validate_invoice", validate_invoice, NULL),
        SagaStep("check_budget", check_budget, NULL),
        SagaStep("create_payment", create_payment, delete_payment),
        SagaStep("update_invoice", update_invoice_status, revert_invoice_status),
        SagaStep("post_gl", post_gl_entry, reverse_gl_entry),
        SagaStep("notify", send_notification, send_cancellation)
    ]

    FUNCTION execute(context):
        completed_steps = []

        FOR step IN steps:
            TRY:
                result = step.execute(context)
                completed_steps.append((step, result))
                context.update(result)

            CATCH error:
                // Compensate in reverse order
                log_error("Saga step failed", step.name, error)

                FOR (completed_step, step_result) IN reversed(completed_steps):
                    IF completed_step.compensate IS NOT NULL:
                        TRY:
                            completed_step.compensate(context, step_result)
                        CATCH compensation_error:
                            log_error("Compensation failed",
                                      completed_step.name,
                                      compensation_error)
                            // Alert for manual intervention
                            create_incident("compensation_failure",
                                          completed_step, compensation_error)

                RAISE SagaFailed(step.name, error)

        RETURN SagaSuccess(context)
```

---

## Disaster Recovery

### Recovery Objectives

| Metric | Target | Measurement |
|--------|--------|-------------|
| **RPO (Recovery Point Objective)** | 1 minute | Transaction log replication lag |
| **RTO (Recovery Time Objective)** | 15 minutes | Time to restore service |
| **RCO (Recovery Capacity Objective)** | 80% | Capacity in DR region |

### Backup Strategy

```
BACKUP ARCHITECTURE:

Continuous:
├── Transaction Logs: Streamed to secondary region
├── Event Store: Mirrored in real-time
└── Replication Lag: < 1 minute

Periodic:
├── Full Database Backup: Daily at 02:00 UTC
├── Incremental Backup: Every 6 hours
├── Vector DB Snapshot: Daily
├── Document Store Sync: Continuous (S3 replication)
└── Retention: 30 days hot, 1 year cold, 7 years archive

Backup Encryption:
├── In-transit: TLS 1.3
├── At-rest: AES-256-GCM
├── Keys: Different from production (HSM-managed)
└── Key rotation: Same schedule as production

BACKUP VERIFICATION:

FUNCTION verify_backup(backup_id):
    // Step 1: Restore to isolated environment
    restore_env = create_isolated_environment()
    restore_database(backup_id, restore_env)

    // Step 2: Run integrity checks
    checks = [
        check_table_counts(restore_env, production),
        check_checksum_samples(restore_env, production),
        verify_encryption_keys(restore_env),
        run_application_health_checks(restore_env)
    ]

    // Step 3: Report results
    FOR check IN checks:
        IF NOT check.passed:
            alert("backup_verification_failed", backup_id, check)

    // Step 4: Cleanup
    destroy_environment(restore_env)

    RETURN all(check.passed FOR check IN checks)
```

### DR Activation Procedure

```
DR ACTIVATION RUNBOOK:

┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Detection and Decision (Target: 5 minutes)       │
│                                                             │
│  1. Automated alerts from multiple monitoring sources       │
│  2. On-call engineer validates outage scope                │
│  3. Incident commander declares DR activation              │
│  4. Notify stakeholders via status page                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: Traffic Failover (Target: 5 minutes)             │
│                                                             │
│  1. Update DNS to point to DR region                       │
│  2. Activate standby API servers                           │
│  3. Promote database replica to primary                    │
│  4. Activate GPU cluster in DR region                      │
│  5. Verify health checks passing                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: Validation (Target: 5 minutes)                   │
│                                                             │
│  1. Run smoke tests on critical paths                      │
│  2. Verify data consistency (last transaction visible)     │
│  3. Check AI inference functionality                       │
│  4. Validate tenant isolation                              │
│  5. Update status page: "Operating in DR mode"             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: Stabilization (Ongoing)                          │
│                                                             │
│  1. Monitor for any remaining issues                       │
│  2. Scale DR resources as needed                           │
│  3. Prepare primary region recovery                        │
│  4. Schedule failback when primary healthy                 │
└─────────────────────────────────────────────────────────────┘

DR AUTOMATION:

FUNCTION activate_dr(primary_region, dr_region):
    // Phase 1: Automated detection already happened

    // Phase 2: Traffic failover
    dns_update(domain, dr_region.endpoints)
    activate_standby_services(dr_region)
    promote_database_replica(dr_region.db_replica)
    activate_gpu_cluster(dr_region.gpu_cluster)

    // Wait for health checks
    wait_for_healthy(dr_region, timeout=300_seconds)

    // Phase 3: Validation
    smoke_tests = run_smoke_tests(dr_region)
    IF NOT all(test.passed FOR test IN smoke_tests):
        alert("DR_VALIDATION_FAILED", smoke_tests)
        // Continue anyway, but with alerts

    // Verify last transaction
    last_txn_primary = get_last_transaction_id(primary_region)
    last_txn_dr = get_last_transaction_id(dr_region)
    replication_gap = last_txn_primary - last_txn_dr

    log_metric("dr_replication_gap", replication_gap)

    // Update status
    update_status_page("Operating in DR mode")

    RETURN DrActivationResult(
        success=TRUE,
        replication_gap=replication_gap,
        activation_time=elapsed()
    )
```

### Multi-Region Considerations

```
DATA RESIDENCY COMPLIANCE:

┌─────────────────────────────────────────────────────────────┐
│  Region: EU-West (GDPR)                                     │
│  - Primary for EU tenants                                   │
│  - No replication outside EU                                │
│  - DR within EU only (EU-North)                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Region: AP-South (India DPDP)                              │
│  - Primary for India tenants                                │
│  - No replication outside India                             │
│  - DR within India only (Mumbai + Hyderabad)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Region: US (Default)                                       │
│  - Primary for Americas                                     │
│  - DR to US-West                                           │
│  - Cross-region for non-regulated tenants                  │
└─────────────────────────────────────────────────────────────┘

CROSS-REGION SYNC (Non-PII):

- Aggregated metrics: Replicated globally
- Configuration: Replicated globally
- Model artifacts: Replicated globally
- PII data: NEVER leaves designated region
```

---

## Next Steps

- [Security & Compliance](./06-security-and-compliance.md) - Privacy architecture, compliance mapping
