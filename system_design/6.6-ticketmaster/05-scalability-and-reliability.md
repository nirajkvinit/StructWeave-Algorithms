# Scalability & Reliability

## 1. Scalability Strategy

### The Fundamental Challenge: 1000x Traffic Spikes

Ticketmaster's traffic profile is unlike most systems. Baseline traffic (browsing events) is modest, but an on-sale for a mega-artist can spike traffic **1000x in seconds**. The system must handle this without over-provisioning for the 99.9% of time when traffic is low.

```mermaid
flowchart TB
    subgraph Normal["Normal Operations<br/>(99.9% of time)"]
        N1["~12K QPS reads"]
        N2["~120 QPS writes"]
        N3["5 app servers"]
        N4["2 Redis nodes"]
    end

    subgraph OnSale["Mega On-Sale<br/>(0.1% of time)"]
        O1["~2M QPS reads"]
        O2["~500K QPS writes"]
        O3["200+ app servers"]
        O4["20+ Redis nodes"]
    end

    Normal -->|"Auto-scale<br/>T-60 min"| OnSale
    OnSale -->|"Scale down<br/>T+2 hours"| Normal

    classDef normal fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef onsale fill:#fce4ec,stroke:#c62828,stroke-width:2px

    class N1,N2,N3,N4 normal
    class O1,O2,O3,O4 onsale
```

### Horizontal Scaling by Service

| Service | Scaling Strategy | Trigger | Min/Max Instances |
|---------|-----------------|---------|-------------------|
| **Queue Service** | Pre-scale before known on-sales | Scheduled (T-60 min) | 3 / 100 |
| **Inventory Service** | Pre-scale + reactive auto-scale | CPU > 60% or QPS > threshold | 5 / 200 |
| **Seat Map Service** | Auto-scale with CDN offload | Request rate | 3 / 50 |
| **Booking Service** | Pre-scale for on-sales | Scheduled + reactive | 3 / 100 |
| **Payment Service** | Rate-limited by external gateways | Gateway TPS limits | 5 / 30 |
| **Search Service** | Auto-scale | Query latency p95 > 200ms | 3 / 20 |
| **WebSocket Gateway** | Pre-scale based on queue size | Expected concurrent connections | 5 / 150 |

### Pre-Scaling for Known Events

Unlike most auto-scaling scenarios, Ticketmaster **knows in advance** when mega spikes will occur (on-sale times are published). This enables proactive scaling:

```
FUNCTION pre_scale_for_event(event_id):
    event = get_event(event_id)
    expected_demand = predict_demand(event)  // Based on artist popularity, venue size

    // T-60 minutes: Scale infrastructure
    scale_redis_cluster(target_nodes = expected_demand.redis_nodes)
    scale_service("queue-service", expected_demand.queue_instances)
    scale_service("inventory-service", expected_demand.inventory_instances)
    scale_service("booking-service", expected_demand.booking_instances)
    scale_service("websocket-gateway", expected_demand.ws_instances)

    // T-30 minutes: Warm caches
    warm_seat_map_cache(event_id)
    warm_pricing_cache(event_id)
    warm_cdn_edge(event.venue.seat_map_url)

    // T-15 minutes: Open waiting room
    open_queue(event_id)

    // T+2 hours: Scale down
    schedule_scale_down(event_id, delay=2_hours)
```

### Database Scaling

| Database | Strategy | Details |
|----------|----------|---------|
| **PostgreSQL** | Read replicas + partitioning | 1 primary + 3 read replicas; partitioned by event_id for event_seat |
| **Redis Cluster** | Horizontal sharding | 6-20 nodes (consistent hashing); pre-scale for on-sales |
| **NoSQL (DynamoDB-style)** | Auto-scaling + DAX cache | On-demand scaling for queue state; DAX for read caching |
| **Elasticsearch** | Index-per-month + replicas | 3 data nodes; event index replicated 2x |

### Caching Layers

```mermaid
flowchart LR
    CLIENT["Client"] --> CDN["CDN Edge<br/>(Fastly)<br/>Static: 60s TTL<br/>Seat maps: no cache"]
    CDN --> APP_CACHE["App Cache<br/>(Redis L1)<br/>Event metadata: 5m<br/>Pricing: 5m"]
    APP_CACHE --> DB_CACHE["DB Cache<br/>(Redis L2)<br/>Seat state: real-time<br/>Holds: TTL-based"]
    DB_CACHE --> DB["PostgreSQL<br/>(Source of Truth)"]

    classDef cache fill:#fffde7,stroke:#f57f17,stroke-width:2px
    classDef origin fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px

    class CDN,APP_CACHE,DB_CACHE cache
    class DB origin
```

| Cache Layer | Hit Ratio | Purpose |
|-------------|-----------|---------|
| CDN Edge | 90-95% | Static assets, event pages, venue SVGs |
| App Cache (Redis L1) | 80% | Event metadata, pricing tiers, venue config |
| DB Cache (Redis L2) | 99% during on-sale | Seat state bitmap (real-time, authoritative during on-sale) |

### Hot Spot Mitigation

| Hot Spot | Cause | Solution |
|----------|-------|----------|
| **Front-row seats** | Extreme contention on desirable seats | "Best available" algorithm distributes writes |
| **Single event shard** | All traffic for one event hits one DB partition | Redis absorbs writes; DB only written post-payment |
| **Queue counter** | Atomic increment for position assignment | Sharded counters: 10 counters x 10 = assign position as (counter_id * 1M + local_counter) |
| **CDN origin** | Cache misses during initial page load | Pre-warm CDN edges 30 min before on-sale |

---

## 2. Reliability & Fault Tolerance

### Single Points of Failure (SPOF) Analysis

| Component | SPOF Risk | Mitigation |
|-----------|-----------|------------|
| **Redis primary** | Hold data lost on crash | Redis Sentinel auto-failover; holds are ephemeral (loss = auto-release, not data loss) |
| **Payment gateway** | All checkouts fail | Multi-gateway routing; circuit breaker pattern |
| **Queue Service** | Users stuck in queue | Stateless service + durable queue state in DB; auto-restart |
| **WebSocket Gateway** | Position updates stop | Client auto-reconnect; long-polling fallback |
| **PostgreSQL primary** | Order writes fail | Synchronous replication to standby; auto-failover |
| **CDN** | Waiting room page unavailable | Multi-CDN with DNS-based failover |
| **DNS** | Complete site outage | Multiple DNS providers; GeoDNS |

### Redundancy Strategy

```mermaid
flowchart TB
    subgraph Region1["Region 1 (Primary)"]
        LB1["Load Balancer<br/>(Active)"]
        APP1["App Cluster<br/>(N instances)"]
        REDIS1["Redis Cluster<br/>(6 nodes)"]
        PG1["PostgreSQL<br/>(Primary)"]
        PG1R["PostgreSQL<br/>(Sync Replica)"]
    end

    subgraph Region2["Region 2 (Standby)"]
        LB2["Load Balancer<br/>(Standby)"]
        APP2["App Cluster<br/>(N/2 instances)"]
        REDIS2["Redis Cluster<br/>(6 nodes)"]
        PG2["PostgreSQL<br/>(Async Replica)"]
    end

    PG1 -->|"Sync"| PG1R
    PG1 -->|"Async"| PG2
    REDIS1 -->|"Cross-region<br/>replication"| REDIS2

    classDef primary fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef standby fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class LB1,APP1,REDIS1,PG1,PG1R primary
    class LB2,APP2,REDIS2,PG2 standby
```

### Failover Mechanisms

| Scenario | Detection | Failover Time | Process |
|----------|-----------|---------------|---------|
| **Redis primary failure** | Sentinel heartbeat (1s) | <30s | Sentinel promotes replica; app reconnects |
| **PostgreSQL primary failure** | Replication lag check (5s) | <60s | Promote sync replica; update connection pool |
| **App server crash** | Health check failure (10s) | <15s | Load balancer removes; container orchestrator replaces |
| **Payment gateway outage** | Circuit breaker trips (5 failures in 30s) | Immediate | Route to alternate gateway; alert operators |
| **CDN PoP failure** | Anycast routing | <5s | Traffic automatically routed to next-nearest PoP |
| **Full region failure** | Cross-region health check | 2-5 min | DNS failover to standby region; warm standby activated |

### Circuit Breaker Configuration

```
CIRCUIT_BREAKER payment_gateway:
    failure_threshold: 5 failures in 30 seconds
    recovery_timeout: 60 seconds
    half_open_requests: 3

    STATES:
        CLOSED:    Normal operation, all requests pass through
        OPEN:      All requests immediately fail-fast (return cached error)
        HALF_OPEN: Allow 3 test requests; if 2+ succeed, close; else re-open

    ON_OPEN:
        route_to_backup_gateway()
        alert_ops("Primary payment gateway circuit open")
        pause_queue_drain(reduce_by=50%)  // Reduce admission while degraded
```

### Retry Strategy

| Operation | Strategy | Max Retries | Backoff |
|-----------|----------|-------------|---------|
| Seat hold (SETNX) | **No retry** | 0 | N/A -- instant success or fail |
| Payment processing | Idempotent retry | 3 | Exponential (1s, 2s, 4s) with jitter |
| Order DB write | Idempotent retry | 5 | Exponential (100ms, 200ms, 400ms) |
| Queue position WebSocket | Auto-reconnect | Unlimited | Exponential (1s, 2s, 4s, max 30s) |
| Notification delivery | Async retry | 5 | Fixed 30s intervals |

### Graceful Degradation Ladder

When the system is overwhelmed, it degrades in ordered stages rather than crashing:

| Level | Condition | Action |
|-------|-----------|--------|
| **Level 0** | Normal | All features available |
| **Level 1** | High load (p99 > 2x target) | Disable non-essential features (search suggestions, recommendations) |
| **Level 2** | Very high load (error rate > 1%) | Switch seat map to "best available" only (no interactive map) |
| **Level 3** | Critical load (error rate > 5%) | Pause queue drain; show "please wait" |
| **Level 4** | System overload (error rate > 10%) | Stop accepting new queue joins; serve static "sold out" page from CDN |
| **Level 5** | Catastrophic | Close on-sale entirely; redirect to static page |

### Bulkhead Pattern

Isolate critical on-sale traffic from normal browsing traffic:

```
BULKHEADS:
    pool_1: "on_sale_booking"
        max_concurrent: 5000
        services: [inventory, booking, payment]
        dedicated_redis: redis-cluster-onsale
        dedicated_db_pool: pg-onsale (100 connections)

    pool_2: "general_browsing"
        max_concurrent: 10000
        services: [search, events, user]
        shared_redis: redis-cluster-general
        shared_db_pool: pg-general (50 connections)

    pool_3: "admin_operations"
        max_concurrent: 100
        services: [event-management, venue-config, reporting]
        shared_db_pool: pg-admin (10 connections)
```

A surge in on-sale traffic never starves event browsing or admin operations.

---

## 3. Disaster Recovery

### RTO / RPO Targets

| Scenario | RTO | RPO | Strategy |
|----------|-----|-----|----------|
| **Single server failure** | <15s | 0 | Auto-replacement by orchestrator |
| **Redis cluster failure** | <30s | Ephemeral data (acceptable loss) | Sentinel failover; rebuild from DB |
| **PostgreSQL failure** | <60s | 0 (sync replica) | Promote sync standby |
| **Full region failure** | <5 min | <30s (async replication lag) | DNS failover to standby region |
| **Data corruption** | <1 hour | Point-in-time (1 min granularity) | PITR from WAL archives |

### Backup Strategy

| Data | Backup Method | Frequency | Retention |
|------|---------------|-----------|-----------|
| PostgreSQL | Continuous WAL archiving + daily base backup | Continuous / Daily | 30 days PITR + 90 days daily |
| Redis | RDB snapshots + AOF | Hourly RDB / Continuous AOF | 7 days |
| NoSQL (DynamoDB-style) | Point-in-time recovery + on-demand backups | Continuous / Weekly | 35 days PITR + 1 year weekly |
| Object Storage (venue maps) | Cross-region replication | Real-time | Indefinite |
| Search Index | Rebuild from PostgreSQL | On-demand | N/A (derived data) |

### Multi-Region Considerations

| Aspect | Strategy |
|--------|----------|
| **Active-Passive** | Primary region handles all writes; standby receives async replication |
| **Why not Active-Active?** | Seat inventory requires strong consistency; cross-region latency makes distributed locks impractical |
| **Regional read replicas** | Event browsing served from nearest region; booking always routed to primary |
| **CDN failover** | Multi-CDN (Fastly primary, Cloudflare backup) with DNS-level failover |
| **Data residency** | European events on EU region; North American events on US region (GDPR compliance) |

---

## 4. Load Testing Strategy

| Test Type | Purpose | Target |
|-----------|---------|--------|
| **Baseline** | Verify normal operations | 12K QPS sustained for 1 hour |
| **Ramp-up** | Test auto-scaling triggers | 12K → 500K QPS over 10 min |
| **Spike** | Simulate on-sale start | 0 → 2M QPS in 10 seconds |
| **Soak** | Memory leaks, connection exhaustion | 100K QPS sustained for 24 hours |
| **Chaos** | Failure resilience | Kill Redis primary, DB primary during load |
| **Bot simulation** | Test bot detection under load | 50% legitimate + 50% bot traffic at 1M QPS |
