# 14.1 AI-Native MSME Credit Scoring & Lending Platform — Scalability & Reliability

## Scaling the Credit Decision Pipeline

### Challenge: Festival Season 3x Volume Spike

The MSME lending market exhibits extreme seasonality: Diwali season (October–November) and harvest financing (March–April) drive 3x application volume spikes. The credit decision pipeline—from AA data fetch through scoring to approval—must scale from 6 applications/sec to 85 applications/sec without degrading the 5-second SLO.

### Scaling Strategy: Horizontal Pipeline Decomposition

The credit decision pipeline is decomposed into independently scalable stages:

```
Stage 1: Application Ingestion & Validation
  - Stateless API workers behind a load balancer
  - Auto-scale from 10 to 50 instances based on request queue depth
  - Each worker: validate input, create application record, enqueue for processing
  - Throughput: 200 applications/sec per instance (I/O-bound: writes to database)
  - Scaling: 10 instances handle baseline; 50 instances handle 3x peak

Stage 2: Data Fetching (AA + Bureau + KYC)
  - Orchestrator service that dispatches parallel data fetches
  - Bottleneck: external API latency (AA: 15-60s, Bureau: 2-5s, KYC: 1-3s)
  - Each orchestrator instance handles 100 concurrent fetch operations
  - Auto-scale from 20 to 100 instances based on in-flight fetch count
  - Timeout strategy: proceed with partial data if any source exceeds timeout
  - AA fetch pool: dedicated connection pool per FIP with rate limiting
    to respect FIP throughput limits (typically 100 requests/sec per AA)

Stage 3: Data Processing (Parsing + Feature Engineering)
  - CPU-intensive: bank statement OCR, transaction categorization, feature computation
  - Auto-scale from 50 to 500 worker pods based on processing queue depth
  - Bank statement parsing: ~500ms per page, 10 pages average = 5 seconds per statement
  - Feature engineering: ~50ms per borrower (read pre-computed features + compute deltas)
  - Stateless workers pull from a partitioned queue (partition key: application_id)

Stage 4: Credit Scoring
  - Model inference: ~200ms per application (including SHAP explanation)
  - Scoring workers hold model artifacts in memory (750MB per worker)
  - Auto-scale from 10 to 50 instances based on scoring queue depth
  - Each instance: loads model on startup, handles 100 inferences/sec
  - Model artifacts cached locally; model registry pushes updates via pub/sub

Stage 5: Underwriting Decision
  - Lightweight: policy rule evaluation + score-to-decision mapping
  - Co-located with scoring workers (no separate scaling needed)
  - Manual review queue: capped at 30% of applications; excess auto-declined with
    "high volume" reason code to prevent unbounded queue growth
```

### Scaling the Feature Store

The feature store holds 10M borrower profiles at ~1.8 KB each (17.7 GB total). During peak season, feature read rates spike to 85/sec (one per application) plus 200/sec (embedded finance offer checks), and feature write rates spike to 50/sec (AA data arrivals updating profiles).

```
Feature store architecture:
  - In-memory key-value store sharded by borrower_id hash
  - 4 shards × 4.4 GB each = 17.7 GB total
  - Read replication: 3 read replicas per shard for query distribution
  - Write path: write to primary shard, async replicate to read replicas (< 100ms lag)
  - Cache hit rate: >99% for active borrowers (repeat applications within 30 days)
  - Cold borrower feature computation: triggered on-demand during AA data fetch
  - TTL: feature vectors expire after 90 days of inactivity

Auto-scaling:
  - Add read replicas when per-shard query latency p95 > 50ms
  - Shard splitting when any shard exceeds 6 GB (triggered by portfolio growth)
  - Peak season: pre-scale read replicas from 3 to 6 per shard (scheduled, not reactive)
```

---

## Scaling the Collection Pipeline

### Challenge: Month-End Collection Surge

EMI due dates cluster around the 1st, 5th, 7th, and 15th of each month. On the 1st, approximately 30% of all active loans (3M loans) have EMI due, creating a burst of auto-debit executions, reminder messages, and collection actions.

```
Month-end surge handling:
  Auto-debit execution:
    - 3M NACH instructions submitted to banks in the overnight batch (12 AM – 6 AM)
    - Submitted in bank-specific batches (each bank has its own file format and submission window)
    - Response processing: bank returns success/failure by 10 AM
    - 3M × 25% failure rate = 750K failed auto-debits requiring retry or escalation

  Communication burst:
    - Pre-due reminders (3 days before): 3M SMS + 3M push notifications
    - Post-failure follow-ups: 750K WhatsApp messages within 4 hours of failure notification
    - Channel capacity: SMS gateway handles 50,000/min; WhatsApp Business API handles 10,000/min

  Collection worker scaling:
    - SMS workers: scale from 5 to 20 instances (50K SMS/min capacity)
    - WhatsApp workers: scale from 3 to 15 instances (10K messages/min)
    - IVR workers: scale from 5 to 25 instances (1,000 concurrent calls)
    - Pre-scheduled scaling on the 28th of each month to be ready for the 1st
```

---

## Reliability Architecture

### Credit Decision Service: Four-Nines Availability (99.99%)

The credit decision service is business-critical: every minute of downtime represents lost loan applications and revenue. However, it depends on external services (AA, bureau, payment rails) that have lower availability.

```
Redundancy architecture:
  Application layer:
    - Multi-zone deployment: 3 availability zones, each with full service stack
    - Zone-level failover: if one zone loses connectivity, traffic routes to remaining 2
    - No cross-zone dependencies in the critical path
    - Database: multi-zone primary with synchronous replication to one zone,
      async to the third (RPO=0 for zone failure, RPO<5s for region failure)

  External dependency isolation:
    - AA gateway: circuit breaker per FIP (open after 5 consecutive failures)
      Fallback: proceed with partial data if ≥1 bank statement available
    - Bureau service: circuit breaker with 30-second timeout
      Fallback: route to thin-file model if bureau unavailable
    - Payment rails: multi-rail with automatic failover (UPI → IMPS → NEFT)
    - Each external dependency has a health check endpoint polled every 10 seconds
      Dashboard shows real-time health of all 50+ FIPs and payment partners

  Fraud detection service:
    - Fail-closed design: disbursement blocked if fraud service unavailable
    - Availability target: 99.99% (higher than core platform)
    - Deployment: separate from main application cluster for isolation
    - Degraded mode: if full fraud service is down, fast-path rules (cached locally
      at application nodes) provide basic fraud screening for up to 15 minutes
    - Queued applications re-checked when full service recovers
```

### Failure Modes and Recovery

| Failure Mode | Impact | Detection | Recovery |
|---|---|---|---|
| **AA gateway timeout** | Cannot fetch bank statements for affected FIP | FIP health check timeout | Circuit breaker opens; proceed with data from other FIPs; retry in 5 minutes |
| **Bureau service unavailable** | Cannot pull bureau score | API timeout / error rate spike | Route all applications to thin-file model; queue bureau pulls for retry |
| **Credit scoring engine crash** | Applications queue up, no decisions | Health check failure + queue depth spike | Auto-restart with model reload (30 seconds); hot standby takes over in 5 seconds |
| **Fraud service unavailable** | Disbursements blocked (fail-closed) | Health check failure | Degraded mode: fast-path rules only for 15 minutes; full block if >15 minutes |
| **Payment rail failure (UPI)** | Disbursements delayed | Success rate drop below 90% | Automatic failover to IMPS; notify operations team |
| **Feature store shard failure** | Scoring degraded for affected borrower partition | Read timeout spike | Promote read replica to primary; cold-compute features from source data |
| **Database primary failure** | Write operations fail | Connection refused / timeout | Automatic failover to synchronous replica (RPO=0, RTO<30 seconds) |
| **Collection SMS gateway failure** | Reminders not sent | Delivery report failure rate spike | Failover to backup SMS provider (2 providers configured active-passive) |

### Data Durability

```
Loan records (business-critical, regulatory requirement):
  - Synchronous replication across 2 zones
  - Write-ahead log with guaranteed durability before acknowledgment
  - RPO: 0 (zero data loss)
  - RTO: < 30 seconds (automatic failover to synchronous replica)
  - Backup: daily snapshot to object storage; 8-year retention

Credit decision audit trail:
  - Append-only event store with cryptographic chaining
  - Synchronous replication across 2 zones
  - RPO: 0 (regulatory requirement: every decision must be auditable)
  - RTO: < 5 minutes (read-only during failover; decisions continue on new primary)
  - Retention: 8 years (regulatory mandate)

Feature store:
  - Asynchronous replication
  - RPO: < 1 minute (acceptable: features can be recomputed from source data)
  - RTO: < 5 minutes (promote read replica)
  - Source data: AA-fetched bank statements retained for 90 days for recomputation

Fraud detection graph:
  - Asynchronous replication
  - RPO: < 5 minutes
  - RTO: < 10 minutes
  - Acceptable: graph can be rebuilt from application event stream (2-hour rebuild)

Document store (KYC images, bank statements):
  - Object storage with cross-region replication
  - RPO: < 1 hour (acceptable: documents can be re-fetched from AA or re-uploaded)
  - Retention: 8 years (regulatory mandate for KYC documents)
```

---

## Handling Peak Events

### Scenario: Diwali Festival Season — 3x Application Volume

During the 2-week Diwali period, MSME working capital demand spikes as businesses stock inventory for the festive season. Application volume increases from 500K/day to 1.5M/day.

**Platform response:**

```
Timeline:
  T-30 days: Festival season detected in historical patterns
    → Pre-scale all pipeline stages to peak capacity
    → Pre-warm feature store with recent borrower profiles
    → Pre-allocate co-lending capital with banking partners
    → Increase fraud detection sensitivity (festival season attracts fraud rings)

  T-7 days: Partner APIs report pre-qualification check volume increasing
    → Activate festival-season credit policies (higher limits for repeat borrowers)
    → Scale AA data fetch pool: increase concurrent connections to FIPs
    → Notify FIPs of expected volume increase (coordination protocol)

  T-0: Festival season peak begins
    → Application rate: 85/sec (3x normal)
    → Auto-scale: scoring workers 10 → 50, processing workers 50 → 500
    → Manual review queue grows: increase auto-approve threshold for
       repeat borrowers with clean repayment history (reduce manual review load)
    → Disbursement volume: 800/hour → monitor payment rail capacity

  T+14 days: Festival season ends
    → Gradually scale down over 3 days (not instant: late applications still coming)
    → Post-season analysis: compare default rates for festival-season originations
       vs. normal-season originations to validate festival policy decisions
    → Model retraining with festival-season data included in training set

  T+90 days: First EMI for festival-season loans
    → Heightened monitoring: festival-season vintage default rates
    → Early warning model recalibrated with festival-season features
    → Collection readiness: pre-allocate collection capacity for expected
       higher delinquency in festival-season cohort (historically 1.5x)
```

---

## Geographic Distribution

### Multi-Region Deployment for Regulatory Compliance

```
Region configuration:
  Primary region: handles all live application processing, scoring, and disbursement
  DR region: handles backup and read-only analytics
  Data sovereignty: all borrower PII stored within country (regulatory requirement)

  Within-region distribution:
    - 3 availability zones for high availability
    - Application processing distributed across zones by hash(application_id)
    - Database primary in Zone A, sync replica in Zone B, async replica in Zone C
    - External API connections (AA, bureau, payment) from Zone A and B (active-active)

Geographic scaling for collection:
  - Collection operations distributed by borrower geography
  - Regional collection teams handle local language and field operations
  - Communication templates localized per state/language
  - Field collection routes optimized per city with daily batch routing algorithm
```

### Partner API Regional Endpoints

```
Partner API distribution:
  - Single logical API endpoint with geographic routing
  - Partners in different cities route to nearest application processing cluster
  - Partner-specific rate limiting: 100 applications/minute per partner (configurable)
  - Burst handling: 3x burst allowance with token bucket rate limiter
  - Partner health dashboard: real-time visibility into API latency, error rates,
    and approval rates per partner
```
