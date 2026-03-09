# Scalability & Reliability — URL Shortener

## 1. Scalability

### 1.1 Horizontal vs. Vertical Scaling

| Component | Scaling Strategy | Rationale |
|---|---|---|
| **Redirect Service** | Horizontal (stateless) | Add instances behind load balancer; no shared state except cache |
| **Creation Service** | Horizontal (stateless) | Each instance holds a pre-allocated ID range; no shared state |
| **Distributed Cache** | Horizontal (add nodes) | Consistent hashing redistributes keys; no full rehash |
| **URL Store** | Horizontal (sharding) | Shard by short_code prefix; each shard handles independent key space |
| **Analytics Store** | Horizontal (partitioned) | Partition by date + short_code; columnar stores scale linearly with nodes |
| **Message Queue** | Horizontal (partitions) | Add partitions for throughput; add consumers for processing capacity |
| **Range Server** | Vertical (single-node) | Simple atomic counter; primary-replica for availability, not throughput |

### 1.2 Auto-Scaling Strategy

```
SCALING RULES for Redirect Service:

  Scale-out triggers:
    - CPU utilization > 60% sustained for 3 minutes
    - P99 latency > 30ms sustained for 2 minutes
    - Request queue depth > 1000 per instance

  Scale-in triggers:
    - CPU utilization < 30% sustained for 10 minutes
    - No scale-in during known peak hours (defined per timezone)

  Constraints:
    - Minimum instances: 6 (2 per availability zone × 3 zones)
    - Maximum instances: 200
    - Scale-out increment: 20% of current count (at least 2)
    - Scale-in increment: 10% of current count (at most 5)
    - Cooldown: 3 minutes between scaling actions

  Pre-scaling:
    - Predictive scaling based on historical traffic patterns
    - Pre-scale 30 minutes before expected traffic spikes (marketing campaigns)
    - Social media platforms notify via webhook when a shortened link is trending
```

### 1.3 Database Scaling

#### Sharding Strategy

```
SHARDING: Range-based on short_code prefix (first 2 characters)

Shard topology:
  - 62^2 = 3,844 logical shards → mapped to 128 physical shards
  - Consistent hashing ring with 256 virtual nodes per physical shard
  - Each physical shard: primary + 2 replicas across 3 availability zones

Shard sizing:
  - 50B URLs ÷ 128 shards ≈ 390M URLs per shard
  - 390M URLs × 340 bytes ≈ 133 GB per shard (fits in memory for hot data)
  - Read replicas handle redirect traffic; primary handles writes

Resharding:
  - Add physical shards by splitting consistent hashing range
  - Zero-downtime: new shard copies data from old shard while writes continue
  - Dual-write period: both old and new shards accept writes until migration complete
  - Cutover: update routing table atomically; old shard becomes read-only briefly
```

#### Read Replicas for Redirect Traffic

```
TOPOLOGY per shard:
  Primary (writes) ← Creation Service
  Replica 1 (reads) ← Redirect Service (zone A)
  Replica 2 (reads) ← Redirect Service (zone B)
  Replica 3 (reads) ← Redirect Service (zone C)

Replication lag:
  - Synchronous replication to Replica 1 (zero lag, strong consistency for read-after-write)
  - Asynchronous replication to Replicas 2-3 (< 100ms lag, acceptable for redirects)

Why this works:
  - Redirect reads don't need the absolute latest data
  - A URL that was created 100ms ago but isn't yet on Replica 2 will simply
    miss the cache and hit the primary via retry—the next request will succeed
  - Read replicas absorb 99% of redirect database traffic
```

### 1.4 Caching Layers at Scale

```
SCALING TIERS:

Tier 1: Small scale (< 10K QPS redirect)
  - Single distributed cache cluster (3 nodes, 32 GB each)
  - No in-process cache needed
  - Total cache: ~96 GB, ~300M URL mappings

Tier 2: Medium scale (10K - 100K QPS redirect)
  - Distributed cache cluster (12 nodes, 64 GB each)
  - In-process cache on each redirect instance (100K entries, ~34 MB)
  - Total cache: ~768 GB + in-process
  - Cache hit ratio target: 95%+

Tier 3: Large scale (> 100K QPS redirect)
  - Multi-region distributed cache (36+ nodes, 128 GB each)
  - In-process cache on each redirect instance (500K entries, ~170 MB)
  - Edge/CDN caching for 301 redirects
  - Total cache: ~4.5 TB + in-process + edge
  - Cache hit ratio target: 99%+
  - Regional cache clusters to minimize cross-region latency
```

### 1.5 Hot Spot Mitigation

```
PROBLEM: Power-law distribution means 1% of URLs receive 50% of traffic.
  A single viral link can receive 50K+ redirects/sec.

MITIGATIONS:

1. L1 cache naturally absorbs hot spots (no coordination needed)
   - Each instance's LRU cache independently promotes hot URLs
   - 20 instances × 2,500 req/sec each = 50K req/sec served from L1

2. Adaptive cache TTL based on access frequency
   - Cold URLs: 1-hour TTL in L2
   - Warm URLs (> 100 req/min): 6-hour TTL in L2
   - Hot URLs (> 10K req/min): 24-hour TTL in L2, pinned in L1

3. Read replica fan-out for database
   - Hot URL's shard automatically gets additional read replicas
   - Auto-detected: shard with > 5x average read QPS triggers replica addition

4. Analytics sampling for hot links (see Deep Dive section)
```

---

## 2. Reliability & Fault Tolerance

### 2.1 Single Points of Failure Analysis

| Component | SPOF Risk | Mitigation |
|---|---|---|
| **Range Server** | Medium | Primary-replica with automatic failover; Snowflake fallback if both fail |
| **Database primary (per shard)** | Low | Automatic failover to synchronous replica (< 5 second recovery) |
| **Distributed cache cluster** | Low | Cluster mode with automatic shard migration on node failure |
| **Message queue** | Low | Multi-broker cluster with topic replication factor 3 |
| **API Gateway** | Low | Multiple instances behind global load balancer; health-checked |
| **DNS** | Very Low | Multiple DNS providers with automated failover |
| **Geo IP database** | Very Low | Local file on each instance; weekly updates; stale data is acceptable |

### 2.2 Redundancy Architecture

```
MULTI-AZ DEPLOYMENT (per region):

  Zone A                    Zone B                    Zone C
  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
  │ Redirect (×5)   │      │ Redirect (×5)   │      │ Redirect (×5)   │
  │ Creation (×2)   │      │ Creation (×2)   │      │ Creation (×2)   │
  │ Cache (×4)      │      │ Cache (×4)      │      │ Cache (×4)      │
  │ DB Primary-1    │      │ DB Replica-1    │      │ DB Replica-2    │
  │ DB Replica-5    │      │ DB Primary-2    │      │ DB Replica-3    │
  │ Queue Broker-1  │      │ Queue Broker-2  │      │ Queue Broker-3  │
  │ Analytics-1     │      │ Analytics-2     │      │ Analytics-3     │
  └─────────────────┘      └─────────────────┘      └─────────────────┘

Failure tolerance:
  - Loss of 1 zone: No user impact (all components have cross-zone replicas)
  - Loss of 2 zones: Degraded capacity but still operational
  - Each zone independently serves redirects using local replicas and cache
```

### 2.3 Failover Strategies

```
DATABASE FAILOVER:
  Trigger: Primary health check fails (3 consecutive missed heartbeats, ~15 seconds)
  Action:
    1. Synchronous replica promoted to primary (< 5 seconds)
    2. Connection pool drains and reconnects to new primary
    3. Asynchronous replicas re-point to new primary
    4. Old primary fenced (prevented from accepting writes)
  Impact:
    - Redirect reads: Zero impact (served from cache + read replicas)
    - URL creation: Brief pause (< 5 seconds) during promotion
    - Data loss: Zero (synchronous replica has all committed writes)

CACHE CLUSTER FAILOVER:
  Trigger: Cache node unresponsive for > 10 seconds
  Action:
    1. Consistent hashing ring updated to exclude failed node
    2. Keys automatically redistribute to remaining nodes
    3. Initial cache miss spike (keys from failed node) → handled by DB
    4. Cache repopulates organically from DB reads
  Impact:
    - 1/N keys temporarily uncached (N = cluster size)
    - Latency spike for affected keys (5-20ms instead of 1-2ms)
    - Recovery: Full cache re-warming within 5-10 minutes

MESSAGE QUEUE FAILOVER:
  Trigger: Broker failure detected by controller
  Action:
    1. Partition leadership reassigned to in-sync replicas
    2. Consumers rebalance to new partition assignments
    3. Processing resumes from last committed offset
  Impact:
    - Analytics lag increases by 10-30 seconds during rebalance
    - Zero event loss (replication factor 3 ensures durability)
```

### 2.4 Circuit Breakers

```
CIRCUIT BREAKER: Redirect Service → Database

  States:
    CLOSED (normal): Requests flow to database normally
    OPEN (tripped): All requests short-circuited; return from cache or 503
    HALF-OPEN (testing): Allow 10% of requests through to test recovery

  Trip conditions:
    - Error rate > 10% over 30-second window
    - P99 latency > 100ms over 30-second window
    - Connection pool exhaustion (0 available connections)

  Behavior when OPEN:
    - Redirect: Serve from L1/L2 cache if available; 503 if not
    - Creation: Return 503 Service Unavailable with Retry-After: 30

  Recovery:
    - After 30 seconds in OPEN, transition to HALF-OPEN
    - Route 10% of requests to database
    - If success rate > 90% over 10 seconds → CLOSED
    - If any failure → back to OPEN for another 30 seconds

CIRCUIT BREAKER: Redirect Service → Distributed Cache

  Trip conditions:
    - Latency > 10ms for > 50% of requests (normally < 2ms)
    - Error rate > 5%

  Behavior when OPEN:
    - Skip L2 entirely; serve from L1 or fall through to database
    - Increased DB load is acceptable for short periods
```

### 2.5 Retry Strategies

```
RETRY POLICY for URL Creation (write path):

  Strategy: Exponential backoff with jitter
  Max retries: 3
  Base delay: 100ms
  Max delay: 2000ms
  Jitter: ± 50% of calculated delay

  Retry on:
    - Network timeout (connection or read timeout)
    - 503 Service Unavailable from database
    - 429 Too Many Requests from Rate Server

  Do NOT retry on:
    - 409 Conflict (custom alias taken — deterministic failure)
    - 400 Bad Request (invalid input — deterministic failure)
    - 422 Unprocessable (malicious URL — deterministic failure)

RETRY POLICY for Redirect (read path):

  Strategy: Single immediate retry, then fail
  Max retries: 1
  Delay: 0ms (immediate)

  Why minimal retries:
    - User is waiting for redirect; each retry adds visible delay
    - If cache and DB both fail, retrying won't help
    - Better to return 503 quickly than to make user wait 2+ seconds
```

### 2.6 Graceful Degradation

```
DEGRADATION LEVELS:

Level 0 (Normal):
  All systems operational. Full analytics, custom aliases, link management.

Level 1 (Analytics Degraded):
  Trigger: Analytics pipeline lag > 5 minutes
  Action: Continue redirects normally; show "Analytics delayed" in dashboard
  Impact: Click counts stale by minutes; no user-facing redirect impact

Level 2 (Cache Degraded):
  Trigger: Cache cluster partially failed (> 30% nodes down)
  Action: Increase L1 cache size to 1M entries; extend L1 TTL to 60 seconds
  Impact: Higher DB load; redirect P99 increases to 30-50ms

Level 3 (Creation Degraded):
  Trigger: Range Server and Snowflake both degraded
  Action: Queue creation requests; return 202 Accepted with callback URL
  Impact: URL creation becomes asynchronous; short URL available within 30s

Level 4 (Emergency - Redirect Only):
  Trigger: Multiple critical system failures
  Action:
    - Disable URL creation entirely (return 503)
    - Disable analytics capture (skip event emission)
    - Serve redirects from cache only (no DB fallback)
    - If URL not in cache → 503 (not 404, because we're uncertain)
  Impact: Existing cached URLs continue working; everything else fails gracefully
```

---

## 3. Disaster Recovery

### 3.1 RTO and RPO

| Component | RPO (Data Loss Tolerance) | RTO (Recovery Time Target) | Strategy |
|---|---|---|---|
| **URL Mappings** | 0 (zero data loss) | < 5 minutes | Synchronous replication + automated failover |
| **Click Events** | < 30 seconds | < 10 minutes | Message queue with at-least-once delivery; replay from offset |
| **Analytics Aggregates** | < 1 hour | < 30 minutes | Recompute from raw events; hourly snapshots |
| **User Accounts** | 0 (zero data loss) | < 5 minutes | Synchronous replication with auth service |
| **Cache** | N/A (ephemeral) | < 10 minutes | Auto-repopulates from database on restart |

### 3.2 Backup Strategy

```
URL STORE BACKUPS:
  - Continuous: Synchronous replication to 2 replicas (cross-zone)
  - Hourly: Incremental snapshot to object storage (cross-region)
  - Daily: Full snapshot to object storage (separate account/subscription)
  - Retention: 30 daily backups, 12 monthly backups, 7 yearly backups
  - Testing: Automated monthly restore to staging environment

ANALYTICS STORE BACKUPS:
  - Raw events: Retained in message queue for 72 hours (replay window)
  - Daily aggregates: Backed up to object storage weekly
  - Monthly aggregates: Archived to cold storage (7-year retention for enterprise)
```

### 3.3 Multi-Region Architecture

```
ACTIVE-ACTIVE MULTI-REGION:

  Region US-East (Primary)          Region EU-West (Primary)
  ┌──────────────────────┐          ┌──────────────────────┐
  │ Full service stack   │          │ Full service stack   │
  │ URL Store (primary   │◄────────►│ URL Store (primary   │
  │   for US shards)     │  async   │   for EU shards)     │
  │ Analytics pipeline   │  replic  │ Analytics pipeline   │
  └──────────────────────┘          └──────────────────────┘

Routing:
  - DNS-based geographic routing: US users → US-East, EU users → EU-West
  - Each region is primary for its own URL shards (determined by short code hash)
  - Cross-region async replication (< 500ms lag) for redirect reads
  - URL creation always routes to the owning region (strong consistency)
  - Redirects served from nearest region (eventual consistency acceptable)

Cross-region failover:
  - If US-East fails: EU-West becomes primary for all shards
  - DNS TTL: 60 seconds (failover visible to users within 1-2 minutes)
  - During failover: redirects served from replicated data (< 500ms stale)
  - URL creation: brief unavailability for US shards until EU-West promotion completes

Data sovereignty:
  - EU click data stored exclusively in EU-West region
  - URL mappings replicated globally (no PII in URL mappings)
  - GDPR deletion requests processed in the region where click data resides
```

---

## 4. Capacity Planning

### 4.1 Growth Projections

```
GROWTH MODEL (3-year projection):

                  Year 1        Year 2        Year 3
URLs created/day: 100M          200M          350M
Total URLs:       36.5B         109.5B        237B
Redirects/day:    10B           25B           50B
Peak redirect QPS: 347K         868K          1.7M
URL storage:      12.4 TB       37.2 TB       80.6 TB
Cache (L2):       170 GB        400 GB        850 GB
Click events/day: 1 TB          2.5 TB        5 TB

Infrastructure scaling:
  Redirect instances: 30 → 75 → 150
  Cache nodes:        12 → 30 → 60
  DB shards:          128 → 256 → 512
  Queue partitions:   64 → 128 → 256
  Analytics nodes:    6 → 15 → 30
```

### 4.2 Cost Optimization

| Strategy | Savings | Trade-off |
|---|---|---|
| Offer 301 redirects for static links | 50-80% reduction in redirect server load | Lose analytics for those clicks |
| Tiered analytics retention (90 days hot, archive cold) | 70% reduction in analytics storage cost | Historical queries require cold storage retrieval (minutes) |
| Cache only URLs accessed in last 30 days | 80% reduction in cache size | Cold URLs have higher redirect latency (DB lookup) |
| Compress long URLs in storage | 40% reduction in URL store size | CPU cost for decompression on cache miss |
| Spot/preemptible instances for analytics pipeline | 60% reduction in compute cost | Occasional interruptions; pipeline must handle restarts |
