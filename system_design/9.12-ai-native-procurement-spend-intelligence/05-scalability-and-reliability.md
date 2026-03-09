# AI-Native Procurement & Spend Intelligence --- Scalability & Reliability

## 1. Scaling Strategy

### 1.1 Service-Level Scaling

| Service | Scaling Dimension | Strategy | Trigger |
|---------|-------------------|----------|---------|
| **API Gateway** | Request volume | Horizontal auto-scale | CPU > 60% or request queue > 1000 |
| **Intake Service** | Requisition volume | Horizontal auto-scale | Queue depth > 500 |
| **PO Engine** | PO creation rate | Horizontal auto-scale with sticky sessions (saga state) | Pending POs > threshold |
| **Approval Workflow** | Active workflows | Horizontal auto-scale | Open workflow count > 10K per instance |
| **Spend Classification** | Transaction throughput | GPU auto-scale | Classification queue > 5000 |
| **Supplier Risk Scoring** | Signal volume | Horizontal auto-scale | Signal ingestion lag > 10 min |
| **Price Optimization** | Query volume | Horizontal auto-scale (stateless) | p95 latency > 500ms |
| **Document Intelligence** | Document queue | GPU auto-scale with priority queuing | Queue depth > 100 |
| **Spend Cube / Analytics** | Query concurrency | Read replica scale-out | Active query count > 500 |
| **Feature Store** | Feature serving QPS | Horizontal auto-scale with caching | p99 latency > 20ms |

### 1.2 Data Tier Scaling

#### Procurement Database (Transactional)

```
Scaling approach: Vertical scaling first, then horizontal sharding by tenant_id

Tier 1 (< 100 tenants): Single primary + 2 read replicas
  - Primary handles writes (PO creation, approvals)
  - Read replicas handle dashboard queries and reporting

Tier 2 (100-1000 tenants): Sharded by tenant_id (8 shards)
  - Each shard: Primary + 2 read replicas
  - Shard routing at connection proxy layer
  - Hot tenants (top 5% by volume) get dedicated shards

Tier 3 (1000+ tenants): Dynamic sharding (16-64 shards)
  - Consistent hashing for shard assignment
  - Automatic shard splitting when size > 500 GB
  - Cross-shard queries via scatter-gather (rare, for admin analytics only)
```

#### Spend Cube (Analytical)

```
Scaling approach: Columnar analytical database with MPP (massively parallel processing)

Architecture:
  - Columnar storage for efficient aggregation queries
  - Data partitioned by tenant_id (hash) and fiscal_period (range)
  - Compute nodes scale independently from storage
  - Pre-aggregation tables for common query patterns
  - Result cache layer (in-memory) for hot dashboards

Scaling triggers:
  - Add compute nodes when avg query time > 2s
  - Add storage nodes when data volume exceeds 80% capacity
  - Refresh pre-aggregations when data freshness SLO at risk
```

#### Feature Store (ML)

```
Scaling approach: Dual-layer architecture

Online Store (low-latency serving):
  - In-memory key-value store (sharded by entity_id)
  - Sub-millisecond feature retrieval for model inference
  - Horizontal scaling by adding shards
  - Replication factor 3 for availability

Offline Store (batch features):
  - Columnar storage on data lake
  - Compute-on-read for historical feature retrieval
  - Used for model training and backtesting
  - Scales with storage independently
```

### 1.3 ML Pipeline Scaling

```
Model Training Pipeline:
  - Distributed training across GPU cluster
  - Data-parallel training for large datasets
  - Spot/preemptible instances for cost efficiency (checkpointing every 10 min)
  - Training job scheduler with priority: production models > experimental
  - Auto-scaling GPU pool: 4 baseline → 32 during training windows

Model Serving:
  - Model sharding for large models (split across GPUs)
  - Batch inference for non-latency-sensitive workloads
    (spend classification backfill)
  - Online inference with GPU sharing for latency-sensitive workloads
    (supplier risk real-time)
  - A/B traffic splitting for model version comparison
  - Canary deployment with automatic rollback
```

### 1.4 Multi-Region Scaling

```
Region Architecture:
  - Primary region: Full read-write capability
  - Secondary regions: Read replicas + local ML inference
  - Data residency compliance: Tenant data pinned to designated region

Data Synchronization:
  - Transactional data: Synchronous replication within region,
    async cross-region
  - ML models: Trained centrally, deployed to all regions
  - Feature Store: Regional instances with cross-region
    sync for global suppliers
  - Spend Cube: Per-region instances; global aggregation
    via federated queries (admin only)
```

---

## 2. Fault Tolerance

### 2.1 Service Resilience Patterns

| Pattern | Where Applied | Configuration |
|---------|---------------|---------------|
| **Circuit Breaker** | ERP integration calls | Open after 5 failures in 30s; half-open after 60s; close after 3 successes |
| **Circuit Breaker** | External risk signal APIs | Open after 10 failures in 60s; half-open after 120s |
| **Retry with Backoff** | Document processing failures | 3 retries, exponential backoff (1s, 4s, 16s), jitter ±25% |
| **Retry with Backoff** | ML inference timeouts | 2 retries, linear backoff (500ms, 1s) |
| **Bulkhead** | ML inference vs. transactional workloads | Separate thread pools and connection pools; ML cannot starve PO creation |
| **Timeout** | All inter-service calls | 5s default; 30s for document processing; 2s for feature store lookups |
| **Fallback** | Supplier risk score unavailable | Serve cached score (last known good) with staleness indicator |
| **Fallback** | Spend classification model unavailable | Queue transactions; classify on recovery; serve "unclassified" in dashboards |
| **Rate Limiter** | Per-tenant API calls | 1000 req/min per tenant (configurable); burst allowance 2x for 10s |
| **Dead Letter Queue** | Failed event processing | After 3 processing attempts, move to DLQ for manual investigation |

### 2.2 Graceful Degradation Hierarchy

When system components fail, the platform degrades gracefully through defined tiers:

```
Tier 0 - Full Functionality (all systems healthy)
  ↓ (ML platform degraded)
Tier 1 - Degraded Intelligence
  - PO creation works, but without AI-driven supplier recommendations
  - Spend dashboards show data, but without ML-powered anomaly detection
  - Risk scores show last-known-good values with staleness warning
  ↓ (Analytics database degraded)
Tier 2 - Core Operations Only
  - PO creation and approval workflows fully functional
  - Spend dashboards unavailable (show maintenance message)
  - Risk alerts paused; manual supplier assessment required
  ↓ (Primary database degraded)
Tier 3 - Emergency Mode
  - Read-only access to recent POs from cache
  - New PO creation queued for processing on recovery
  - Approval decisions recorded locally, synced on recovery
  ↓ (Complete outage)
Tier 4 - Offline Fallback
  - Users directed to offline PO templates
  - Approval via email with manual reconciliation
```

### 2.3 Data Consistency During Failures

#### Saga Pattern for PO Creation

The PO creation workflow spans multiple services (budget, PO, approval, ERP). If any step fails, compensating transactions must undo previous steps:

```
Saga Steps:
  1. Reserve Budget       → Compensate: Release budget reservation
  2. Create PO Record     → Compensate: Mark PO as cancelled
  3. Initiate Approval    → Compensate: Cancel approval workflow
  4. Sync to ERP          → Compensate: Send PO cancellation to ERP
  5. Publish Events       → Compensate: Publish compensating events

Failure Handling:
  - Step 3 fails (approval service down):
    → Execute compensation for step 2 (cancel PO)
    → Execute compensation for step 1 (release budget)
    → Notify user: "PO creation failed, budget released"
    → Retry entire saga after approval service recovery

  - Step 4 fails (ERP unavailable):
    → PO remains in "pending_erp_sync" state
    → Retry ERP sync with exponential backoff
    → After max retries: alert procurement admin
    → PO is valid internally even without ERP sync
```

#### Event Ordering Guarantees

The Event Bus guarantees:
- **Per-entity ordering**: Events for the same PO are processed in order (partition by po_id)
- **At-least-once delivery**: Consumers must be idempotent (use event_id for deduplication)
- **No cross-entity ordering**: Events for different POs may arrive out of order (acceptable)

---

## 3. Disaster Recovery

### 3.1 Recovery Objectives

| Data Category | RPO | RTO | Strategy |
|---------------|-----|-----|----------|
| PO and transactional data | < 1 min | < 15 min | Synchronous replication to standby; automated failover |
| Approval workflow state | < 1 min | < 15 min | Co-located with PO data; same replication strategy |
| Spend Cube (analytical) | < 1 hour | < 1 hour | Async replication; rebuild from event log if needed |
| ML Models (artifacts) | < 24 hours | < 2 hours | Versioned in object storage; deploy from artifact registry |
| Feature Store (online) | < 5 min | < 30 min | Warm standby; backfill from offline store on failover |
| Document Store (contracts) | < 1 hour | < 1 hour | Object storage with cross-region replication |
| Audit Logs | < 1 min | < 30 min | Append-only, replicated to secondary region |
| Configuration & Metadata | < 5 min | < 15 min | Version-controlled; applied from configuration store |

### 3.2 Failover Architecture

```
Active-Passive Regional Failover:

Primary Region (Active)              Secondary Region (Passive)
┌─────────────────────┐              ┌─────────────────────┐
│ Load Balancer       │              │ Load Balancer       │
│ ┌─────────────────┐ │    sync      │ ┌─────────────────┐ │
│ │ App Services    │─│─────────────>│ │ App Services    │ │
│ │ (running)       │ │    repl      │ │ (standby)       │ │
│ └─────────────────┘ │              │ └─────────────────┘ │
│ ┌─────────────────┐ │              │ ┌─────────────────┐ │
│ │ Primary DB      │─│───sync──────>│ │ Standby DB      │ │
│ │ (read-write)    │ │   repl       │ │ (read-only)     │ │
│ └─────────────────┘ │              │ └─────────────────┘ │
│ ┌─────────────────┐ │              │ ┌─────────────────┐ │
│ │ ML Platform     │─│───model─────>│ │ ML Platform     │ │
│ │ (training+serve)│ │   sync       │ │ (serve only)    │ │
│ └─────────────────┘ │              │ └─────────────────┘ │
└─────────────────────┘              └─────────────────────┘

Failover triggers:
  - Health check failures for > 30s
  - Database replication lag > 5s (potential data loss risk)
  - Network partition detected between regions

Failover process:
  1. DNS failover routes traffic to secondary region (< 60s)
  2. Standby DB promoted to primary (< 30s)
  3. App services activated in secondary region (< 60s)
  4. ML models already deployed in secondary (0s)
  5. Feature store backfill from offline store (< 30 min for full)
  6. Total RTO: < 15 min for core services
```

### 3.3 Backup Strategy

| Component | Backup Method | Frequency | Retention |
|-----------|---------------|-----------|-----------|
| Transactional DB | Continuous WAL archiving + daily full backup | Continuous + daily | 30 days (full), 7 days (WAL) |
| Spend Cube | Daily snapshot | Daily | 90 days |
| Contract Documents | Versioned in object storage | On change | Indefinite |
| ML Models | Versioned artifacts in model registry | On training completion | 1 year |
| Configuration | Version-controlled in configuration store | On change | Indefinite |
| Audit Logs | Append-only, replicated | Continuous | 10 years |

### 3.4 Disaster Recovery Testing

```
Testing Schedule:
  - Monthly: Automated failover drill (secondary promotion, traffic switch)
  - Quarterly: Full DR exercise (primary shutdown, run on secondary for 4 hours)
  - Annually: Chaos engineering week (random service failures, network partitions)
  - On-demand: Post-incident drills targeting specific failure scenarios

Validation Criteria:
  - PO creation succeeds within 2x normal latency during failover
  - No data loss (compare transaction counts pre/post failover)
  - Approval workflows resume from correct state
  - ML predictions available (possibly with stale models)
  - Spend dashboards load within 5s
  - Audit trail has no gaps
```

---

## 4. Performance Optimization

### 4.1 Caching Strategy

| Cache Layer | Scope | TTL | Eviction | Hit Rate Target |
|-------------|-------|-----|----------|-----------------|
| **API Response Cache** | Frequently accessed supplier profiles, contract summaries | 5 min | LRU | 50% |
| **Spend Dashboard Cache** | Pre-rendered dashboard widgets per tenant | Tied to data refresh cycle (15 min) | Invalidate on refresh | 60% |
| **ML Prediction Cache** | Supplier risk scores, classification results | Score TTL: 1 hour; Classification: indefinite (until reclassified) | Write-through on model update | 80% |
| **Feature Store Cache** | Hot features for online inference | 5 min (frequently updated features); 1 hour (stable features) | LRU | 95% |
| **ERP Sync Cache** | Recent ERP responses (PO acknowledgments) | 24 hours | TTL-based | 30% |
| **Session Cache** | User sessions, approval context | 30 min sliding | LRU | 90% |

### 4.2 Query Optimization

```
Spend Analytics Query Optimization:
  1. Query rewriting: Push filters down before aggregation
  2. Materialized view routing: Check if pre-aggregated data satisfies the query
  3. Approximate queries: For large cardinality dimensions, use HyperLogLog
     for distinct counts and t-digest for percentiles
  4. Progressive refinement: Return approximate results in < 1s,
     refine to exact in background
  5. Workload isolation: Route long-running export queries to dedicated
     read replicas, separate from interactive dashboard queries
```

### 4.3 Batch Processing Optimization

```
Spend Classification Batch Pipeline:
  1. Micro-batching: Accumulate transactions for 30 seconds,
     then classify as a batch (GPU utilization: 85% vs 30% for single-transaction)
  2. Dynamic batching: Adjust batch size based on GPU queue depth
     (smaller batches when queue is short for lower latency)
  3. Model warm-up: Keep classification models loaded in GPU memory;
     avoid cold-start on first request after idle
  4. Pipeline parallelism: Overlap preprocessing of batch N+1
     with GPU inference on batch N
```
