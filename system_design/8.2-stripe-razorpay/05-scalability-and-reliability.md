# Scalability & Reliability

## Payment Path Isolation

The single most important reliability principle: **the payment authorization path must be isolated from everything else**. Webhook delivery, dashboard queries, analytics, dispute processing---none of these should share resources with the payment path.

### Isolation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Payment Critical Path                     │
│  (99.999% availability target)                              │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │ API GW  │→ │ Idem.   │→ │ Payment │→ │ Acquirer│      │
│  │(payment)│  │ Layer   │  │ Orch.   │  │ Client  │      │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │
│       │            │             │                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                    │
│  │ Redis   │  │ PG      │  │ Token   │                    │
│  │(idem.)  │  │(payment)│  │ Vault   │                    │
│  └─────────┘  └─────────┘  └─────────┘                    │
│                                                              │
│  Dedicated: compute, database replicas, Redis cluster,      │
│  network bandwidth, on-call team                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Non-Critical Paths                         │
│  (99.9% availability target)                                │
│                                                              │
│  Webhook Delivery │ Merchant Dashboard │ Analytics          │
│  Payout Processing │ Dispute Mgmt      │ Reporting          │
│                                                              │
│  Separate: compute pools, database read replicas,           │
│  independent scaling, separate on-call                       │
└─────────────────────────────────────────────────────────────┘
```

### What Isolation Means in Practice

| Resource | Payment Path | Non-Critical Path |
|----------|-------------|-------------------|
| **Compute** | Dedicated pod pool, cannot be borrowed | Shared pool with autoscaling |
| **Database** | Primary + synchronous replicas, dedicated connection pool | Async read replicas, separate connection pool |
| **Redis** | Dedicated cluster for idempotency keys | Shared cluster for caching, rate limiting |
| **Network** | Dedicated load balancers with priority routing | Standard load balancers |
| **On-call** | Dedicated payment reliability team, 5-min response | Standard SRE rotation, 15-min response |
| **Deploy** | Canary deployment with automated rollback on error rate spike | Standard blue-green deployment |
| **Capacity** | Provisioned for 2x peak (headroom for burst) | Provisioned for 1.3x peak with autoscaling |

---

## Multi-Region Architecture

### Read/Write Split by Criticality

```
                    ┌─────────────────────┐
                    │   Global DNS/LB     │
                    │ (latency-based      │
                    │  routing)           │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
       ┌────────────┐  ┌────────────┐   ┌────────────┐
       │  Region A   │  │  Region B   │   │  Region C   │
       │  (Primary)  │  │  (Secondary)│   │ (Secondary) │
       └──────┬─────┘  └──────┬─────┘   └──────┬─────┘
              │               │                  │
         ┌────┴────┐    ┌────┴────┐        ┌────┴────┐
         │ Payment │    │ Payment │        │ Payment │
         │ Write   │    │ Read    │        │ Read    │
         │ Primary │    │ + Local │        │ + Local │
         │         │    │ Write*  │        │ Write*  │
         └─────────┘    └─────────┘        └─────────┘

    * Writes routed to primary region for payments
      Local writes for non-financial data (logs, analytics)
```

**Payment writes**: Always routed to primary region. Financial data requires strong consistency; multi-primary writes create reconciliation nightmares for money movement. Cross-region latency (50-150ms) is acceptable because the card network round-trip (1-3s) dominates.

**Payment reads** (status checks, dashboard): Served from local region using async replicas. Acceptable staleness: < 1 second for status queries.

**Webhook delivery**: Local region delivery. Webhook workers in each region handle delivery to geographically close merchant endpoints, reducing delivery latency.

**Failover**: If primary region fails, a secondary region is promoted. Recovery Time Objective (RTO): < 5 minutes for payment writes. In-flight payments during failover enter "pending_network_resolution" and are reconciled post-recovery.

---

## Circuit Breaker Strategy

### Per-Provider Circuit Breakers

Each external dependency (acquiring bank, card network interface, 3D Secure directory) gets its own circuit breaker:

```
CIRCUIT_BREAKER for Acquirer_Visa:
    State: CLOSED | OPEN | HALF_OPEN

    CLOSED (normal operation):
        - Forward all requests to acquirer
        - Track: error_count, success_count in rolling 60-second window
        - IF error_rate > 50% AND request_count > 20 in window:
            → Transition to OPEN

    OPEN (circuit tripped):
        - Reject all requests immediately (fail fast)
        - Return: "acquirer_unavailable" error
        - Payment Orchestrator: route to backup acquirer if available
        - After 30 seconds: → transition to HALF_OPEN

    HALF_OPEN (testing recovery):
        - Allow 10% of requests through
        - IF 5 consecutive successes:
            → Transition to CLOSED
        - IF any failure:
            → Transition back to OPEN (reset timer)
```

### Circuit Breaker Topology

| External System | Circuit Breaker | Fallback Strategy |
|----------------|----------------|-------------------|
| **Primary Acquirer** | Per-card-network (Visa, MC, Amex) | Route to backup acquirer; queue if no backup |
| **3D Secure Directory** | Per-directory server | Skip 3DS (merchant assumes liability); or block |
| **Tokenization Vault** | Single breaker | Return cached token data from local replica (read-only) |
| **Webhook Endpoints** | Per-merchant-endpoint | Queue events; retry later; disable after 3 days |
| **Risk Engine** | Single breaker | Default to "allow" with logging (or "block" for high-risk merchants) |

---

## Zero-Downtime Deployments

### Canary Deployment for Payment Path

```
Phase 1: Deploy canary (1% of traffic)
├── Deploy new version to canary pod pool
├── Route 1% of payment traffic via weighted load balancing
├── Monitor for 15 minutes:
│   ├── Payment success rate (must not drop > 0.1%)
│   ├── Authorization latency p99 (must not increase > 200ms)
│   ├── Error rate (must not increase > 0.05%)
│   └── Ledger imbalance count (must be zero)
├── IF metrics healthy → proceed to Phase 2
└── IF metrics degraded → automatic rollback (< 2 minutes)

Phase 2: Gradual rollout
├── 1% → 5% → 10% → 25% → 50% → 100%
├── Each stage: 10-minute bake time with monitoring
├── Any stage can trigger automatic rollback
└── Total rollout time: ~90 minutes

Phase 3: Verification
├── Run end-to-end payment tests (test card numbers)
├── Verify ledger consistency
├── Confirm webhook delivery rates
└── Previous version kept warm for 2 hours (instant rollback capability)
```

### Database Schema Migration Strategy

Financial databases cannot tolerate downtime for schema changes. Strategy:

1. **Additive-only migrations**: Add columns, tables, indexes---never drop or rename in production
2. **Dual-write period**: New code writes to both old and new columns; read from old
3. **Backfill**: Background job populates new column for historical records
4. **Switch read**: After backfill, read from new column; continue dual-write
5. **Cleanup**: After verification period (1 week), stop writing to old column
6. **Drop old column**: Separate migration, weeks later, after confirming no reads

---

## Disaster Recovery for Financial Data

### Recovery Objectives

| Data Type | RPO (Recovery Point Objective) | RTO (Recovery Time Objective) | Strategy |
|-----------|------|------|----------|
| **Payment records** | 0 (zero data loss) | < 5 minutes | Synchronous replication to standby |
| **Ledger entries** | 0 (zero data loss) | < 5 minutes | Synchronous replication + WAL archiving |
| **Idempotency keys** | < 1 minute | < 2 minutes | Redis replication + DB fallback |
| **Tokenization vault** | 0 (zero data loss) | < 10 minutes | HSM-backed, cross-region encrypted replication |
| **Webhook events** | < 5 minutes | < 15 minutes | Event bus replay from committed offset |
| **Merchant data** | < 1 minute | < 5 minutes | Async replication (not on critical path) |

### Backup Strategy

```
Continuous:
├── Write-ahead log (WAL) streaming to object storage (real-time)
├── Synchronous replication to standby database (same region)
└── Asynchronous replication to DR region (< 1 second lag)

Periodic:
├── Full database snapshot: every 6 hours
├── Incremental backup: every 15 minutes
├── Ledger archive: daily (immutable, append-only)
└── Tokenization vault backup: daily (encrypted, separate key management)

Testing:
├── DR failover drill: quarterly
├── Backup restoration test: monthly
├── Point-in-time recovery test: monthly
└── Chaos engineering on payment path: weekly (controlled blast radius)
```

### In-Flight Payment Recovery

When a region fails mid-payment:

```
Scenario: Primary region fails while payment is in "processing" state

1. Standby promoted to primary (< 5 minutes)
2. Recovery process scans for "processing" payments older than 2 minutes:
   a. Query acquiring bank for transaction status
   b. Approved → transition to "succeeded"; record ledger entries
   c. Declined → transition to "requires_payment_method"
   d. Unknown → mark "pending_network_resolution"; manual review
3. Resume webhook delivery for any payments resolved during recovery
4. Reconciliation process runs immediately after recovery to catch anomalies
```

---

## Horizontal Scaling Strategy

| Component | Scaling Dimension | Approach |
|-----------|------------------|----------|
| **API Gateway** | Request volume | Horizontal pod autoscaling on CPU/request rate |
| **Payment Orchestrator** | Transaction volume | Shard by merchant_id; each shard handles ~100 merchants |
| **Idempotency Store (Redis)** | Key volume | Redis Cluster with hash-slot sharding; add nodes for capacity |
| **Payment Database** | Write throughput | Vertical scaling (larger instance) + read replicas; shard only as last resort |
| **Ledger Database** | Write throughput | Shard by merchant_id; each shard is an independent ledger |
| **Webhook Workers** | Delivery volume | Horizontal scaling based on queue depth; per-endpoint rate limiting |
| **Risk Engine** | Scoring throughput | Stateless horizontal scaling; feature store in Redis |
| **Tokenization Vault** | Token volume | Vertical scaling (HSM throughput limited); add HSM partitions |

### Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| Payment API latency p99 > 2s | Sustained 5 min | Scale out Payment Orchestrator pods |
| Redis memory > 80% | Sustained 10 min | Add Redis cluster nodes |
| Webhook queue depth > 1M | Sustained 5 min | Scale out webhook workers |
| DB connection pool > 80% | Sustained 10 min | Add read replicas; investigate slow queries |
| Payment error rate > 1% | Sustained 2 min | Alert on-call; check circuit breakers |
