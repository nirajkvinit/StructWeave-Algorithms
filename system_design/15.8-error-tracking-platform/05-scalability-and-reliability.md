# Scalability & Reliability — Error Tracking Platform

## Scalability

### Horizontal vs Vertical Scaling

| Component | Strategy | Rationale |
|-----------|----------|-----------|
| Relay gateway | Horizontal | Stateless; add nodes behind load balancer for more ingestion capacity |
| Message bus | Horizontal (partitions) | Add partitions for throughput; add brokers for capacity |
| Processing workers | Horizontal | Stateless event processors; scale with bus consumer lag |
| Symbolicator | Horizontal + Vertical | CPU-intensive parsing benefits from larger instances; add nodes for throughput |
| Columnar store | Horizontal (sharding) | Shard by project + time; add nodes for storage and query capacity |
| Relational DB | Vertical primary + Horizontal reads | Primary for writes; read replicas for UI queries |
| Cache cluster | Horizontal (sharding) | Consistent hashing across Redis nodes |

### Auto-Scaling Triggers

| Component | Scale-Up Trigger | Scale-Down Trigger | Min/Max Nodes |
|-----------|-----------------|-------------------|---------------|
| Relay gateway | CPU > 60% OR p99 latency > 200ms | CPU < 30% for 10 min | 10 / 100 |
| Processing workers | Consumer lag > 30s | Lag < 5s for 15 min | 20 / 200 |
| Symbolicator | CPU > 70% OR queue depth > 100 | CPU < 30% for 10 min | 5 / 50 |
| Query cluster | Query p99 > 3s | p99 < 1s for 30 min | 5 / 30 |

### Database Scaling Strategy

**Columnar Store (Events):**
- **Sharding key:** `(project_id, toDate(received_at))` — ensures all events for a project on a given day are co-located for efficient queries
- **Replication:** 2 replicas per shard for read availability and fault tolerance
- **Time-based partitioning:** Daily partitions enable efficient TTL-based data expiration (drop entire partition vs. row-by-row delete)
- **Tiered storage:** SSD for hot tier (7 days), HDD for warm tier (30 days), object storage for cold (90+ days)

**Relational Store (Issues):**
- **Primary for writes:** Single primary handles issue upserts, state changes, assignments
- **Read replicas:** 2 replicas for UI/API read queries (issue list, search)
- **Partitioning:** Range partition by `project_id` for large installations; most queries are project-scoped
- **Connection pooling:** PgBouncer in transaction mode to handle 1000s of concurrent worker connections

### Caching Layers

| Layer | What's Cached | TTL | Eviction |
|-------|--------------|-----|----------|
| **L1: In-process** | Parsed source maps (LRU, 50 per worker) | 1 hour | LRU when memory exceeds 2 GB |
| **L2: Distributed cache** | Fingerprint → issue_id mapping | 24 hours | LRU; invalidated on issue merge/split |
| **L2: Distributed cache** | Project config (DSN, rate limits, alert rules) | 5 minutes | Push invalidation on config change |
| **L2: Distributed cache** | Quota counters (events used / limit) | Until reset | Atomic increment; TTL aligned to billing period |
| **L2: Distributed cache** | Spike baseline (hourly rates) | 48 hours | Recomputed daily |
| **L3: Object storage** | Source map files | Release lifetime | Explicit deletion on release cleanup |

### Hot Spot Mitigation

**Problem:** A single project experiencing a massive error spike can overwhelm:
- The message bus partition (if partitioned by project)
- The columnar store shard (if sharded by project)
- The cache node holding that project's fingerprint data

**Mitigations:**
1. **Sub-partitioning:** High-volume projects are automatically assigned multiple message bus partitions (detected by monitoring per-project throughput)
2. **Write spreading:** Events are written to the columnar store in micro-batches (every 1 second or 1000 events, whichever comes first) — amortizes per-event overhead
3. **Cache key distribution:** Fingerprint cache keys include a hash prefix that distributes across multiple cache nodes, preventing a single project from hot-spotting one node
4. **Quota-based throttling:** Once spike protection triggers, the relay reduces accepted events before they reach downstream systems

---

## Reliability & Fault Tolerance

### Single Points of Failure Identification

| Component | SPOF Risk | Mitigation |
|-----------|----------|------------|
| Relay gateway | **Low** — stateless, multi-node | Load balancer distributes; SDK retries handle individual node failures |
| Message bus | **Medium** — central data path | Multi-broker cluster with replication factor 3; automatic partition leader election |
| Processing workers | **Low** — stateless consumers | Consumer group rebalancing handles worker failures; at-least-once processing |
| Relational DB primary | **High** — single write path | Synchronous replication to hot standby; automatic failover with <30s downtime |
| Columnar store | **Medium** — query availability | Replicated shards; queries routed to healthy replicas |
| Symbolicator | **Low** — stateless with cache | Degradation: events stored unsymbolicated; retro-symbolicated when symbolicator recovers |
| Cache cluster | **Medium** — quota enforcement | Redis Cluster with automatic failover; degradation: fall back to DB for fingerprint lookup |

### Redundancy Strategy

- **Relay:** N+2 redundancy across 3 availability zones; DNS-based failover
- **Message bus:** 3x replication per partition across AZs; in-sync replica set of 2 for acknowledge
- **Processing workers:** 2x the minimum needed capacity to absorb node failures during peak
- **Storage:** All writes replicated to 2+ AZs before acknowledgment; cross-region async replication for disaster recovery

### Failover Mechanisms

**Relay failover:**
- SDKs maintain a prioritized list of relay endpoints (primary + fallback)
- If the primary returns errors or times out, the SDK switches to the fallback
- DNS health checks remove unhealthy relay nodes from the load balancer

**Database failover:**
- Relational DB: Streaming replication with automatic failover via consensus-based leader election (e.g., Patroni). Read replicas promote automatically. Typical failover time: 10-30 seconds.
- Columnar store: Query routing layer detects unhealthy shards and redirects to replicas. Write path fails over to a replica promoted to primary.

**Cache failover:**
- Redis Cluster with sentinel for automatic master-replica failover
- If entire cache cluster is unavailable: relay falls back to "allow all" (don't reject events due to cache failure); fingerprint lookup falls back to relational DB (slower but correct)

### Circuit Breaker Patterns

| Circuit | Trigger | Open State Behavior | Recovery |
|---------|---------|-------------------|----------|
| Symbolicator | 50% error rate over 30s | Skip symbolication; store raw frames | Half-open after 30s; close after 10 successes |
| External integrations (Slack, PagerDuty) | 3 consecutive failures | Queue notifications for retry | Half-open after 60s |
| Relational DB reads | p99 > 5s over 1 min | Serve from cache; degrade UI (show cached counts) | Half-open after 15s |
| Source map object storage | 5 consecutive fetch failures | Skip symbolication for this release | Half-open after 30s |

### Retry Strategies

| Operation | Retry Policy | Backoff | Max Retries | Idempotency |
|-----------|-------------|---------|-------------|-------------|
| SDK → Relay | Exponential with jitter | 1s, 2s, 4s, 8s | 4 | Event ID deduplication |
| Processing worker failure | Requeue to message bus | Immediate (different worker) | 3 | Event ID deduplication |
| Symbolication failure | Retry with backoff | 5s, 30s, 5m | 3 | Idempotent by event_id |
| Alert notification delivery | Exponential with jitter | 10s, 30s, 60s, 300s | 5 | Idempotent by (rule_id, event_id) |
| DB write failure | Immediate retry | 100ms, 500ms, 2s | 3 | UPSERT is idempotent |

### Graceful Degradation

| Scenario | Degraded Behavior | User Impact |
|----------|-------------------|-------------|
| Symbolicator down | Events stored with raw stack traces; symbolicated later | Minified frames in UI temporarily; grouping may be less accurate |
| Columnar store slow | Issue counts show "approximate" badge; search results delayed | Dashboard numbers lag; search takes longer |
| Cache cluster down | Fingerprint lookups hit DB directly; quota checks use pessimistic estimation | Higher DB load; possible brief over-acceptance of events |
| Alert engine behind | Alerts delayed but not lost; catch up when queue drains | Late notifications for new issues/regressions |
| Relational DB read replica lag | UI shows slightly stale issue metadata | Event counts may be a few seconds behind |

### Bulkhead Pattern

- **Ingestion bulkhead:** Relay nodes are partitioned into pools — standard and premium. Premium customers' traffic is isolated from standard traffic, ensuring SLA guarantees during spikes.
- **Processing bulkhead:** Message bus has separate topics for high-priority (first event for a new issue, regressions) and standard events. High-priority consumers are never starved by bulk event processing.
- **Query bulkhead:** Columnar store separates query resources for real-time dashboards (short queries, strict timeout) and ad-hoc search (long queries, relaxed timeout). A complex search query cannot starve dashboard rendering.

---

## Disaster Recovery

### RTO / RPO

| Component | RTO | RPO | Strategy |
|-----------|-----|-----|----------|
| Ingestion pipeline | 5 minutes | 0 (SDKs retry) | Multi-AZ active-active; DNS failover |
| Event data (columnar) | 1 hour | 5 minutes | Cross-region async replication |
| Issue metadata (relational) | 15 minutes | 1 minute | Synchronous standby in same region; async cross-region |
| Source maps (object storage) | 30 minutes | 0 (replicated) | Multi-region object storage with versioning |
| Cache (Redis) | 5 minutes | Reconstructible | Cache is ephemeral; rebuilt from DB on recovery |

### Backup Strategy

- **Relational DB:** Continuous WAL archiving to object storage. Point-in-time recovery to any second within the last 7 days. Daily base backups retained for 30 days.
- **Columnar store:** Daily snapshots per shard to object storage. Incremental backups for each partition.
- **Source maps:** Already in replicated object storage. Versioned to prevent accidental overwrites.
- **Configuration:** Infrastructure-as-code; all relay/pipeline configuration version-controlled.

### Multi-Region Considerations

- **Active-passive:** Primary region handles all traffic. DR region receives async-replicated data. Failover promoted manually or automatically if primary is unreachable for >5 minutes.
- **Data residency:** EU customers can opt into EU-only data processing where events never leave the EU region. Requires a full regional deployment (relay → bus → processing → storage) within the EU.
- **SDK failover:** SDKs are configured with primary and secondary relay endpoints. If primary is unreachable (3 consecutive failures with 5-second timeout), SDK switches to secondary.
- **Cross-region latency:** Source maps are replicated to all regions where SDKs send events, ensuring symbolication doesn't require cross-region fetches.
