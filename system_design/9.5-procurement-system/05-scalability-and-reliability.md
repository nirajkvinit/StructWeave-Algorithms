# Scalability & Reliability

## Scalability

### Horizontal vs Vertical Scaling Decisions

| Component | Scaling Type | Strategy | Trigger |
|-----------|-------------|----------|---------|
| **API Gateway** | Horizontal | Stateless; add instances behind load balancer | CPU > 60% or QPS > threshold |
| **Requisition Service** | Horizontal | Stateless; tenant-sharded routing | Request queue depth > 100 |
| **Approval Engine** | Horizontal | Stateless evaluation; state in DB | Approval task backlog > 1000 |
| **Matching Engine** | Horizontal | Embarrassingly parallel; partition by vendor | Invoice batch queue depth |
| **Auction Engine** | Vertical + Horizontal | Stateful WebSocket connections; session-affinity routing | Active auction count; concurrent bidders |
| **Budget Service** | Horizontal (with care) | Hot-path caching per instance; DB serialization point | Budget check latency p99 > 500ms |
| **Catalog Search** | Horizontal | Search engine cluster scaling; add shards/replicas | Query latency p95 > 300ms |
| **Relational DB** | Vertical (primary) + Horizontal (read replicas) | Primary for writes; read replicas for dashboards and analytics | Write latency > 50ms; read replica lag > 5s |
| **Event Bus** | Horizontal | Add partitions for high-volume topics | Consumer lag > 10K messages |

### Database Scaling Strategy

#### Write Path Optimization

```mermaid
flowchart TB
    subgraph WritePath["Write Scaling"]
        APP[Application Services]
        PRIMARY[(Primary DB)]
        SHARD1[(Shard 1 - Tenants A-M)]
        SHARD2[(Shard 2 - Tenants N-Z)]
        ARCHIVE[(Archive DB)]
    end

    subgraph ReadPath["Read Scaling"]
        DASH[Dashboard Queries]
        REPORT[Reports]
        REPLICA1[(Read Replica 1)]
        REPLICA2[(Read Replica 2)]
        SEARCH_IDX[(Search Index)]
        ANALYTICS[(Analytics DB)]
    end

    APP --> PRIMARY
    PRIMARY --> SHARD1
    PRIMARY --> SHARD2
    PRIMARY -->|Async Replication| REPLICA1
    PRIMARY -->|Async Replication| REPLICA2
    PRIMARY -->|CDC Stream| SEARCH_IDX
    PRIMARY -->|CDC Stream| ANALYTICS
    PRIMARY -->|Age-based| ARCHIVE

    DASH --> REPLICA1
    DASH --> REPLICA2
    REPORT --> ANALYTICS

    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px

    class APP,DASH,REPORT service
    class PRIMARY,SHARD1,SHARD2,ARCHIVE,REPLICA1,REPLICA2 data
    class SEARCH_IDX,ANALYTICS cache
```

- **Sharding strategy**: Shard by `tenant_id` using consistent hashing. Large tenants (> 1M POs/year) get dedicated shards. Smaller tenants are co-located.
- **Archive strategy**: POs older than 7 years (post-audit-retention period) are moved to cold archive storage. Archived data is queryable through a separate archive API with relaxed latency SLOs.
- **CDC (Change Data Capture)**: Database changes stream to search indexes and analytics databases via CDC, ensuring read-path stores are eventually consistent without application-level dual-writes.

#### Read Path Optimization

- **Read replicas**: 2--3 replicas per shard for dashboard queries, report generation, and catalog browsing
- **Materialized views**: Pre-computed views for common queries:
  - `my_pending_approvals` (per user)
  - `open_pos_by_vendor` (per vendor)
  - `budget_utilization_summary` (per cost center)
  - `matching_exception_dashboard` (per AP clerk)
- **Search index**: Full-text search engine for catalog items, vendor search, PO search by number/description
- **Analytics database**: Columnar store for spend analytics, pre-aggregated by vendor/category/time dimensions

### Caching Layers

| Layer | Content | TTL | Invalidation | Hit Rate |
|-------|---------|-----|-------------|----------|
| **L1 - In-process** | Tenant configuration, approval rules, tolerance rules | 5 min | Config-change event | > 99% |
| **L2 - Distributed cache** | Budget balances, vendor profiles, popular catalog items | 30s--5 min | Event-driven invalidation | > 90% |
| **L3 - Search cache** | Catalog search results, vendor search results | 10 min | Catalog update event | > 80% |
| **L4 - CDN** | Static assets, report PDFs, contract documents | 1 hour | Purge on update | > 95% |

### Hot Spot Mitigation

| Hot Spot | Cause | Mitigation |
|----------|-------|------------|
| **CFO approval queue** | CFO is in approval chain for all POs > $100K | Delegation rules: auto-delegate to VP of Finance for $100K--$500K; CFO only reviews > $500K |
| **Central budget cost center** | Shared services cost center used by many departments | Budget slice pre-allocation: distribute budget into per-department sub-allocations |
| **Month-end invoice batch** | Vendors dump all invoices on last day of month | Staggered processing: prioritize by vendor SLA and amount; rate-limit batch ingestion |
| **Catalog search for common items** | "Office supplies" searched by thousands daily | Cached trending items per tenant; pre-populated search suggestions |

---

## Reliability & Fault Tolerance

### Single Points of Failure (SPOF) Identification

| Component | SPOF Risk | Mitigation |
|-----------|-----------|------------|
| **Primary Database** | Loss of write capability for all services | Synchronous standby with automatic failover (< 30s RTO); WAL archiving to object storage |
| **Approval Engine** | All approvals blocked; procurement pipeline stalls | Multiple instances behind load balancer; approval state in DB, not in-memory |
| **Event Bus** | Cross-service communication fails; matching and analytics lag | Multi-broker cluster with replication factor 3; dead-letter queue for failed processing |
| **Budget Service** | Cannot validate budget; all requisitions blocked | Cached budget balances enable degraded-mode approvals with post-facto reconciliation |
| **Auction Engine** | Active auctions disrupted; bid integrity compromised | Session state persisted to DB every bid; recovery replays from last persisted state |
| **HSM (Sealed Bids)** | Cannot encrypt/decrypt sealed bids | HSM cluster with N+1 redundancy; backup keys in disaster recovery HSM |

### Redundancy Strategy

```mermaid
flowchart TB
    subgraph Primary["Primary Region"]
        LB1[Load Balancer]
        APP1[App Cluster - 6 nodes]
        DB1[(Primary DB)]
        STANDBY[(Standby DB)]
        CACHE1[Cache Cluster]
        MQ1[Message Broker Cluster]
    end

    subgraph DR["DR Region"]
        LB2[Load Balancer]
        APP2[App Cluster - 3 nodes]
        DB2[(Async Replica)]
        CACHE2[Cache Cluster]
        MQ2[Message Broker]
    end

    DB1 -->|Sync Replication| STANDBY
    DB1 -->|Async Replication| DB2
    MQ1 -->|Mirrored Topics| MQ2

    classDef service fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef queue fill:#e0f7fa,stroke:#00695c,stroke-width:2px

    class LB1,LB2,APP1,APP2 service
    class DB1,STANDBY,DB2 data
    class CACHE1,CACHE2 cache
    class MQ1,MQ2 queue
```

### Failover Mechanisms

| Scenario | Detection | Failover | Recovery Time |
|----------|-----------|----------|---------------|
| **Primary DB failure** | Health check failure × 3 consecutive | Promote synchronous standby to primary; update connection strings via service discovery | < 30 seconds |
| **Application node crash** | Load balancer health check | Remove from pool; other nodes absorb traffic; auto-scale replacement | < 10 seconds (detection) |
| **Cache cluster failure** | Connection error rate > 50% | Bypass cache; increase DB connection pool; DB absorbs read load | < 5 seconds (fallback) |
| **Event bus partition failure** | Consumer lag spike; producer timeout | Route to surviving partitions; rebalance consumers | < 60 seconds |
| **Full region failure** | Multi-signal: DNS health, region health API | DNS failover to DR region; promote async replica; accept potential data loss for last ~30s of transactions | < 15 minutes (manual trigger) |

### Circuit Breaker Patterns

```
CIRCUIT_BREAKERS:
    vendor_dispatch:
        description: "PO dispatch to vendor systems (cXML/EDI)"
        failure_threshold: 5 failures in 60 seconds
        open_duration: 120 seconds
        half_open_probes: 3
        fallback: Queue PO for retry; notify buyer

    external_screening:
        description: "Sanctions/compliance screening API"
        failure_threshold: 3 failures in 30 seconds
        open_duration: 300 seconds
        fallback: Mark vendor as "screening_pending"; allow
                  onboarding to continue with manual review flag

    budget_service:
        description: "Budget check operations"
        failure_threshold: 10 failures in 30 seconds
        open_duration: 60 seconds
        fallback: Use cached budget balance; flag transaction
                  for post-facto reconciliation

    catalog_search:
        description: "Catalog search engine"
        failure_threshold: 5 failures in 30 seconds
        open_duration: 60 seconds
        fallback: Return cached popular items; display
                  "search temporarily limited" message
```

### Retry Strategies

| Operation | Retry Strategy | Max Retries | Backoff | Idempotency |
|-----------|---------------|-------------|---------|-------------|
| PO dispatch to vendor | Exponential with jitter | 5 | 1s, 2s, 4s, 8s, 16s | PO number is idempotency key |
| Invoice matching | Fixed interval | 3 | 5 seconds | Match attempt ID |
| Budget encumbrance | Immediate retry | 2 | No backoff (lock contention) | Document ID + event type |
| Notification delivery | Exponential | 4 | 30s, 60s, 120s, 300s | Notification ID |
| Compliance screening | Exponential | 3 | 60s, 300s, 900s | Vendor ID + screening type |

### Graceful Degradation Tiers

| Tier | Condition | Degraded Behavior |
|------|-----------|-------------------|
| **Tier 1 - Healthy** | All systems nominal | Full functionality |
| **Tier 2 - Elevated** | Search engine degraded | Disable catalog search typeahead; serve cached results only; allow free-text requisitions |
| **Tier 3 - Partial** | Budget service degraded | Allow requisition creation with cached budget check; flag for reconciliation; disable hard budget blocks |
| **Tier 4 - Emergency** | Primary DB under stress | Read-only mode for dashboards; queue new requisitions for deferred processing; disable analytics queries |
| **Tier 5 - Critical** | Multiple service failures | Accept PO amendments and approvals via email gateway only; queue all operations for processing when services recover |

---

## Disaster Recovery

### Recovery Objectives

| Metric | Target | Justification |
|--------|--------|---------------|
| **RTO (Recovery Time Objective)** | 4 hours for full service; 30 minutes for core operations | Procurement is business-critical but not real-time; 4-hour recovery window acceptable for most enterprises |
| **RPO (Recovery Point Objective)** | 30 seconds for transactional data; 1 hour for analytics | Async replication to DR region every 30s; analytics can be rebuilt from event stream |

### Backup Strategy

| Data Type | Backup Method | Frequency | Retention | Storage |
|-----------|--------------|-----------|-----------|---------|
| **Database (full)** | Physical backup | Daily | 30 days | Object storage (cross-region) |
| **Database (incremental)** | WAL shipping | Continuous | 7 days of WAL | Object storage |
| **Event bus** | Topic snapshots | Every 6 hours | 90 days | Object storage |
| **Document store** | Snapshot | Daily | 1 year | Object storage |
| **Attachments** | Cross-region replication | Real-time | Lifecycle policy (7 years for financial docs) | Object storage |
| **Tenant configuration** | Git-based version control | On every change | Indefinite | Git repository |

### Multi-Region Considerations

- **Active-Passive**: Primary region handles all traffic; DR region maintains warm standby with async-replicated data
- **Why not Active-Active**: Procurement workflows require strong consistency for budget encumbrance and approval chain integrity. Split-brain scenarios between regions could lead to double-encumbrance or conflicting approval decisions. The complexity of distributed consensus across regions does not justify the marginal availability improvement for a B2B system.
- **Regional data residency**: Some tenants require data to remain within specific geographic boundaries (EU data in EU region). These tenants are assigned to region-specific database clusters with no cross-border replication.
- **DR testing**: Quarterly DR drills simulate region failure; validate RTO/RPO compliance; verify zero data loss in failover

---

## Capacity Planning Model

```
FUNCTION estimate_capacity(tenant_count, avg_users_per_tenant):
    total_users = tenant_count * avg_users_per_tenant
    dau = total_users * 0.20
    peak_multiplier = 5  // quarter-end spike

    // Compute requirements
    api_qps_avg = dau * 20 / 28800  // 20 operations per user per day in 8-hour window
    api_qps_peak = api_qps_avg * peak_multiplier

    app_nodes = CEIL(api_qps_peak / 1000)  // 1000 QPS per node
    read_replicas = CEIL(api_qps_peak * 0.8 / 5000)  // 80% reads, 5K QPS per replica
    cache_size_gb = total_users * 5 / 1024 / 1024  // 5 KB per user session/context

    RETURN {
        app_nodes: MAX(3, app_nodes),  // minimum 3 for HA
        db_primary: 1,
        db_standby: 1,
        read_replicas: MAX(2, read_replicas),
        cache_nodes: MAX(3, CEIL(cache_size_gb / 16)),  // 16 GB per cache node
        event_bus_brokers: MAX(3, CEIL(api_qps_peak / 10000)),
        search_nodes: MAX(3, CEIL(tenant_count / 500))
    }
```
