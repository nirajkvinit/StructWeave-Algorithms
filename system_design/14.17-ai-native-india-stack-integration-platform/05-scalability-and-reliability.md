# Scalability & Reliability — AI-Native India Stack Integration Platform

## Scaling Strategy

### Horizontal Scaling by DPI Component

The platform's traffic is not uniform—each DPI adapter has different scaling characteristics, peak patterns, and resource requirements. The architecture scales each adapter independently:

| Component | Scaling Trigger | Scale Unit | Peak Pattern |
|---|---|---|---|
| **eKYC Adapter** | QPS per UIDAI region | Pod replica (stateless) | Business hours: 9 AM - 7 PM; spikes during digital lending campaigns |
| **AA Adapter** | Active fetch sessions | Pod replica (stateless, but session state in external store) | Business hours; month-end spikes for salary-based lending |
| **DigiLocker Adapter** | Concurrent fetch requests | Pod replica (stateless) | Follows eKYC pattern (DigiLocker fetch follows eKYC in workflow) |
| **eSign Adapter** | Concurrent signing sessions | Pod replica (stateless) | End-of-workflow; peaks lag eKYC by 15-30 minutes |
| **UPI Adapter** | Transaction QPS | Pod replica (stateless) | Disbursement peaks at end of business day; EMI collection at month-start |
| **Workflow Engine** | Active workflow instances | Pod replica + external state store | Follows eKYC pattern (workflow starts with eKYC) |
| **Feature Extraction** | CPU-intensive; transactions/second | CPU-optimized pods (16+ cores) | Follows AA data fetch; peaks 5-15 minutes after AA consent approval |
| **Credit Scoring** | GPU for ML inference | GPU-attached pods | Follows feature extraction; same peak pattern |
| **Fraud Detection** | Event throughput | Pod replica (event-driven) | Real-time; follows all DPI activity |

### Auto-Scaling Configuration

```
Scaling Policy per Component:

eKYC Adapter:
  metric: request_rate_per_second
  target: 200 QPS per replica
  min_replicas: 6 (covers baseline 1,200 QPS)
  max_replicas: 30 (covers 6,000 QPS burst)
  scale_up: +3 replicas when avg QPS > 180 for 2 minutes
  scale_down: -1 replica when avg QPS < 100 for 10 minutes
  cooldown: 3 minutes (prevent flapping)

AA Adapter:
  metric: active_fetch_sessions
  target: 50 concurrent sessions per replica
  min_replicas: 10 (covers baseline 500 concurrent)
  max_replicas: 50 (covers 2,500 concurrent)
  scale_up: +5 replicas when sessions > 45 per replica for 1 minute
  scale_down: -2 replicas when sessions < 20 per replica for 10 minutes

Feature Extraction:
  metric: cpu_utilization
  target: 70% CPU utilization
  min_replicas: 30 (60 machines × 16 cores for 930 QPS)
  max_replicas: 120 (for 4x burst)
  scale_up: +10 replicas when CPU > 75% for 1 minute
  scale_down: -5 replicas when CPU < 40% for 15 minutes

Credit Scoring (GPU):
  metric: inference_queue_depth
  target: < 50 pending inferences per GPU
  min_gpus: 8
  max_gpus: 24
  scale_up: +2 GPUs when queue > 40 for 2 minutes
  scale_down: -1 GPU when queue < 10 for 15 minutes
```

### Data Partitioning Strategy

**Consent Store — Partition by Tenant + Time**

```
Partition scheme: composite key (tenant_id, consent_created_month)
Reason: Queries are almost always scoped to a single tenant
         and often filtered by time range (active consents, recent consents).
         Regulatory audit queries are per-tenant.

Shard distribution:
  - 16 shards (covers 2,000 tenants with uniform distribution)
  - Shard key: hash(tenant_id) mod 16
  - Within each shard: range partition by consent_created_month
  - Hot data (last 90 days): SSD-backed replicated storage
  - Cold data (>90 days): compressed, cheaper storage tier
```

**Audit Log — Partition by Time**

```
Partition scheme: time-based (daily partitions)
Reason: Audit queries are overwhelmingly time-range based
         ("show all events for this workflow on this date").
         Append-only nature makes time partitioning natural.

Shard distribution:
  - 1 partition per day (365 partitions per year)
  - Each partition: append-only, immutable after 24-hour window closes
  - Immutable partitions are compressed (5:1 ratio) and moved to cold storage
  - 7-year retention = ~2,555 partitions; older partitions on archival storage
  - Hash chain spans partitions (last event hash of day N = first event's previous_hash on day N+1)
```

**Identity Graph — Partition by User**

```
Partition scheme: hash(user_id) for node storage; adjacency lists co-located
Reason: Identity resolution queries start from a user and traverse
         their linked identifiers. All of a user's identity data
         should be on the same shard to avoid cross-shard joins.

Shard distribution:
  - 32 shards for 50M users (~1.5M users per shard)
  - Replication factor: 3 (cross-AZ)
  - Read replicas for identity lookups (high read:write ratio)
```

**Feature Store — Partition by User + Time**

```
Partition scheme: composite (user_id, feature_extraction_date)
Reason: Feature retrieval is per-user for scoring; time dimension
         enables efficient cleanup when consent expires.

Shard distribution:
  - 16 shards by hash(user_id)
  - TTL-based automatic deletion aligned with consent DataLife
  - Versioned: multiple feature sets per user (from different consent periods)
```

---

## Fault Tolerance Patterns

### Circuit Breaker per DPI Provider

Each DPI adapter implements a circuit breaker that prevents cascading failures when a DPI provider is degraded:

```
Circuit Breaker Configuration:

State: CLOSED (normal operation)
  → Monitor: success rate over sliding 60-second window
  → Trip to OPEN when: success rate < 70% AND request count > 50

State: OPEN (DPI provider assumed down)
  → All requests immediately fail with DPI_UNAVAILABLE error
  → Workflow engine receives failure and activates fallback strategy
  → Duration: 30 seconds (then transition to HALF_OPEN)

State: HALF_OPEN (testing recovery)
  → Allow 10% of traffic through to DPI provider
  → If 5 consecutive successes: transition to CLOSED
  → If any failure: transition back to OPEN for another 30 seconds

Per-DPI circuit breaker configuration:
  UIDAI:      trip_threshold=70%, recovery_probe=10%, open_duration=30s
  AA (per AA): trip_threshold=60%, recovery_probe=5%, open_duration=60s
  DigiLocker:  trip_threshold=50%, recovery_probe=10%, open_duration=60s
  eSign (ESP): trip_threshold=70%, recovery_probe=10%, open_duration=30s
  UPI (NPCI):  trip_threshold=80%, recovery_probe=5%, open_duration=15s
```

### Graceful Degradation Matrix

When a DPI component is unavailable, the platform doesn't fail the entire workflow. Instead, it degrades gracefully:

| Failed Component | Degraded Behavior | User Impact | Recovery |
|---|---|---|---|
| **UIDAI (eKYC)** | Fall back to Offline Paperless eKYC (XML-based, doesn't need UIDAI) | Lower verification confidence; some fields unavailable (no photo) | Workflow continues; eKYC step marked "offline_verified" |
| **AA Provider** | Route to alternate AA if available; if all AAs down, pause workflow | Delay in data fetch; user notified "your bank data is temporarily unavailable" | Workflow paused; auto-resumes when AA recovers (within consent validity) |
| **Specific FIP** | Skip slow/down FIP; proceed with data from responsive FIPs | Credit score computed with partial data; lower confidence | Score flagged as "partial_coverage"; refreshed when FIP recovers |
| **DigiLocker** | Accept manual document upload with AI-based document verification | User must upload document photo; slight delay for AI verification | Document quality may be lower; manual review for borderline cases |
| **eSign (ESP)** | Queue signing request; retry when ESP recovers; offer wet-ink alternative | Delay in loan agreement execution; workflow paused at eSign step | Auto-retry every 5 minutes for up to 4 hours |
| **UPI (NPCI)** | Queue disbursement; fall back to NEFT/IMPS via banking partner | Delay in fund transfer; user notified of estimated transfer time | Retry UPI first; NEFT as fallback (settlement by next business day) |

### Workflow Resilience: Saga Pattern with Checkpoints

Every workflow step is durably checkpointed before execution. If the platform crashes mid-workflow:

```
Workflow Recovery on Restart:

1. Scan workflow state store for all workflows in RUNNING status
2. For each RUNNING workflow:
   a. Read last checkpointed step and its status
   b. If step was RUNNING (crash during execution):
      - Check with DPI provider for transaction status (idempotency key)
      - If DPI confirms success: mark step completed, proceed
      - If DPI has no record: re-execute step (idempotent by design)
      - If DPI confirms failure: mark step failed, evaluate retry policy
   c. If step was COMPLETED:
      - Advance to next step in DAG
   d. If step was PAUSED (waiting for consent):
      - Check consent status with AA
      - If approved: resume
      - If still pending: continue waiting (consent validity check)
      - If expired: fail step, notify business client

3. Rate-limit recovery to avoid thundering herd
   - Process max 100 workflow recoveries per second
   - Prioritize workflows with active user sessions
```

---

## Disaster Recovery

### Multi-Region Architecture

```
Primary Region: Region A (active)
  - All DPI adapters active
  - Write path for consent, workflow, audit
  - AI inference (GPU cluster)
  - API gateway serves all traffic

Standby Region: Region B (warm standby)
  - All services deployed but not serving traffic
  - Receives synchronous replication of consent store and audit log
  - Asynchronous replication of feature store and identity graph (< 5 min lag)
  - DPI adapter credentials pre-configured and tested monthly
  - GPU cluster available but at 25% capacity (scaled up during failover)

DR Scenarios:
  1. Region A complete failure:
     - DNS failover to Region B (< 5 minute RTO)
     - Consent store: RPO = 0 (synchronous replication)
     - Audit log: RPO = 0 (synchronous replication)
     - Feature store: RPO < 5 minutes (async replication)
     - In-flight workflows: recovered from checkpointed state
     - Active eKYC/eSign sessions: lost (user must restart OTP flow)

  2. Single DPI provider failure:
     - Handled by circuit breaker and degradation matrix
     - No region failover needed

  3. Database corruption:
     - Point-in-time recovery from continuous backups
     - Consent store: hourly snapshots + continuous WAL archiving
     - Audit log: immutable; corrupted partition restored from replica
```

### Backup Strategy

| Data Store | Backup Method | Frequency | Retention | RTO |
|---|---|---|---|---|
| Consent Store | Synchronous replication + hourly snapshots | Continuous + hourly | 90 days (snapshots); real-time (replica) | < 5 minutes (failover to replica) |
| Audit Log | Synchronous replication + daily archive | Continuous + daily | 7 years (regulatory) | < 5 minutes (failover to replica) |
| Identity Graph | Async replication + daily snapshots | Continuous (< 5 min lag) + daily | 30 days (snapshots) | < 15 minutes (restore from snapshot + replay) |
| Feature Store | Async replication | Continuous (< 5 min lag) | Consent-duration (TTL-based) | < 15 minutes |
| Workflow State | Synchronous replication | Continuous | 90 days active | < 5 minutes |

---

## Capacity Planning

### Growth Model

```
Year 1 → Year 3 Projection:

Tenants:           500 → 2,000 (4x)
Monthly users:     10M → 50M (5x)
eKYC/month:        15M → 80M (5.3x)
AA fetches/month:  12M → 60M (5x)
Peak QPS:          ~2,000 → ~11,000 (5.5x)
Storage growth:    ~2 TB/month → ~6.5 TB/month (3.25x)

Infrastructure scaling:
  Compute: 3x by Year 2, 6x by Year 3
  Storage: 2x by Year 2, 4x by Year 3 (aggressive tiering reduces hot storage)
  GPU: 2x by Year 2, 3x by Year 3 (model optimization offsets volume growth)
  Network: 2.5x by Year 2, 5x by Year 3
```

### Capacity Triggers

| Metric | Yellow Alert | Red Alert | Action |
|---|---|---|---|
| Peak QPS headroom | < 40% spare capacity | < 20% spare capacity | Add compute; provision new DPI API quota |
| Storage utilization | > 60% of provisioned | > 80% of provisioned | Expand storage; verify tiering is working |
| DPI API quota utilization | > 70% of allocated | > 85% of allocated | Negotiate higher quota; add rate limiting |
| GPU utilization (inference) | > 70% sustained | > 85% sustained | Add GPUs; evaluate model distillation |
| Database connections | > 60% of pool | > 80% of pool | Scale read replicas; review connection patterns |
| Consent store shard size | > 500 GB per shard | > 800 GB per shard | Re-shard; increase shard count |

---

## Load Management

### Priority-Based Request Queuing

Not all requests are equal. The platform implements priority queuing to ensure interactive workflows (user waiting) are not blocked by batch operations:

```
Priority Levels:

P0 (Critical): Active user in workflow, waiting for DPI response
    - eKYC OTP verification (user is staring at screen)
    - AA consent callback processing (user just approved)
    - eSign OTP verification (user is signing document)
    - UPI payment callback (money in transit)
    Guarantee: < 50ms queue wait

P1 (High): User-initiated but async
    - AA data fetch (user will be notified when ready)
    - DigiLocker document fetch (async in workflow)
    - Credit scoring (triggered by data fetch completion)
    Guarantee: < 500ms queue wait

P2 (Normal): Business-initiated batch operations
    - Periodic AA data refresh (scheduled consent refresh)
    - Batch credit rescoring (portfolio monitoring)
    - Document re-verification
    Guarantee: < 5s queue wait; may be delayed during peak

P3 (Low): Internal platform operations
    - Feature store compaction
    - Audit log archival
    - Model retraining data export
    Guarantee: Best-effort; run during off-peak
```

### Backpressure Propagation

When the platform approaches capacity, it propagates backpressure to business clients rather than failing silently:

```
Backpressure Mechanism:

1. DPI adapter reaches 80% of its DPI provider's rate limit
   → Emit "approaching_limit" event

2. API Gateway receives event
   → Adds X-RateLimit-Remaining header to responses
   → For P2/P3 requests: start queuing instead of immediate dispatch
   → For P0/P1 requests: continue normally (use remaining quota for interactive flows)

3. DPI adapter reaches 95% of rate limit
   → API Gateway returns 429 Too Many Requests for P3 requests
   → P2 requests queued with estimated wait time
   → P0/P1 still served (using reserved quota allocation)

4. DPI provider returns rate limit error
   → Circuit breaker activates
   → All pending requests fail with RATE_LIMITED error
   → Exponential backoff: retry after 10s, 30s, 60s
   → Business clients receive webhook: "DPI temporarily rate limited"
```
