# Scalability & Reliability

## 1. Horizontal Scaling Strategy by Service

### 1.1 Service Scaling Matrix

| Service | Scaling Dimension | Instance Count (est.) | Auto-scale Trigger | Stateless? |
|---------|-------------------|----------------------|-------------------|-----------|
| API Gateway | Request volume | 20-50 | CPU > 60%, QPS threshold | Yes |
| Search Service | Search QPS | 30-60 | CPU > 70%, p99 latency > 600ms | Yes |
| ML Ranking Service | Inference throughput | 20-40 | GPU utilization > 70% | Yes |
| Listing Service | CRUD operations | 10-20 | CPU > 65% | Yes |
| Availability Service | Lock + calendar ops | 15-30 | Lock contention rate, CPU | Yes (locks in Redis) |
| Booking Service | Booking attempts/s | 10-20 | CPU > 60%, booking QPS | Yes |
| Payment Service | Transaction volume | 10-20 | Payment QPS, gateway latency | Yes |
| Payout Service | Payout batch size | 5-10 | Queue depth | Yes |
| Messaging Service | Connection count | 10-30 | WebSocket connections | Stateful (sticky sessions) |
| Review Service | Review reads/writes | 5-10 | Read QPS | Yes |
| Notification Service | Event throughput | 10-20 | Event queue depth | Yes |
| Pricing Service | Price calculation QPS | 10-15 | CPU > 70% | Yes |
| Trust Service | Risk assessment QPS | 5-10 | Assessment latency | Yes |

### 1.2 Scaling the Availability Service

The Availability Service is the most latency-sensitive write-path service. Scaling strategy:

```
Read path (calendar queries):
  → Redis availability cache absorbs 95% of reads
  → Cache key: "cal:{listing_id}:{date}" → status
  → Cache populated on miss (read-through) and invalidated on write (write-through)
  → Multiple Redis replicas for read scaling

Write path (reservations and blocks):
  → All writes go through distributed lock (serialized per listing)
  → Lock manager: Redis cluster with 3 masters, 3 replicas
  → Calendar database: PostgreSQL with read replicas
  → Writes are inherently serialized per listing (by design)
  → Parallel writes across different listings scale linearly with instances

Scaling bottleneck: Not the service instances, but the Redis lock manager
  → At 500 booking attempts/s, each holding lock for ~100ms:
  → 50 concurrent locks active at any time
  → Redis handles millions of ops/s → not a bottleneck
```

### 1.3 Scaling the Search Service

```
Elasticsearch cluster scaling:
  Read scaling:
    → Add replica shards (each replica is a full copy that serves queries)
    → Current: 12 primary + 12 replica = 24 query-serving shards
    → Scale up: 12 primary + 24 replica = 36 query-serving shards (50% more throughput)

  Write scaling:
    → Primary shards determine max write throughput
    → Increasing primary shards requires reindexing
    → Mitigation: use time-based rollover aliases for append-heavy indices

  Storage scaling:
    → ~6 GB per shard × 36 shards = 216 GB total (easily fits in memory)
    → As listings grow beyond 10M: add more primary shards (reindex)

ML Ranking Service scaling:
  → Stateless inference: add more pods
  → Model caching: listing embeddings cached in Redis (pre-computed daily)
  → Query embedding computation: CPU-only (~5ms, no GPU needed)
  → Candidate scoring: batched inference, GPU if available, CPU fallback
```

---

## 2. Database Scaling Strategy

### 2.1 PostgreSQL Topology

```
                    ┌─────────────────────┐
                    │   Write Primary     │
                    │   (Calendar DB)     │
                    └────────┬────────────┘
                             │ Streaming replication
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │ Read Replica 1│ │ Read Replica 2│ │ Read Replica 3│
      │ (Search reads)│ │ (API reads)  │ │ (Analytics)  │
      └──────────────┘ └──────────────┘ └──────────────┘

Separate clusters for:
  1. Calendar DB: listing_calendar table (2.5B rows, highest write volume)
  2. Booking DB: bookings + payments tables (ACID critical)
  3. Listing DB: listings + photos metadata (read-heavy)
  4. User DB: users + identity verifications
  5. Communication DB: messages + reviews (high volume, less critical)
```

### 2.2 Sharding Strategy

**Calendar DB Sharding (most critical):**

```
Shard key: listing_id (hash-based)
Number of shards: 16 (each shard holds ~437K listings × 365 dates = ~160M rows)
Shard size: ~5 GB per shard (manageable for single PostgreSQL instance)

Why listing_id:
  → All dates for a listing must be on the same shard (atomic range operations)
  → Distributed lock is per-listing → lock and data always co-located
  → No cross-shard queries for single-listing operations

Shard routing:
  shard_number = hash(listing_id) % 16
```

**Booking DB Sharding:**

```
Shard key: booking_id (hash-based, co-located with payments)
Number of shards: 8
Rationale: Bookings are independent entities; lookup is by booking_id
Cross-shard access: Guest/host booking history uses scatter-gather
  (query all shards, merge results client-side)
```

### 2.3 Read Replica Strategy

| Database | Write Primary | Read Replicas | Replica Lag Tolerance |
|----------|--------------|---------------|----------------------|
| Calendar | 1 per shard | 2 per shard | 0 (reads go through Redis cache, not replicas) |
| Booking | 1 per shard | 2 per shard | < 1 second |
| Listing | 1 | 3 | < 5 seconds |
| User | 1 | 2 | < 5 seconds |
| Communication | 1 | 2 | < 10 seconds |

---

## 3. Caching Architecture

### 3.1 Multi-Layer Cache Design

```
Layer 1: In-Process Cache (per service instance)
  ├── Listing metadata (title, location, amenities): TTL 5 min
  ├── User session data: TTL 15 min
  ├── Feature flags: TTL 1 min
  └── Hit rate: ~20% (limited by instance memory and process recycling)

Layer 2: Redis Distributed Cache
  ├── Calendar availability: TTL 10 min (invalidated on write)
  ├── Listing detail: TTL 30 min
  ├── Search result pages: TTL 5 min
  ├── User profile: TTL 15 min
  ├── Pricing suggestions: TTL 1 hour
  ├── Review aggregates: TTL 1 hour
  ├── Rate limiting counters: TTL varies
  └── Hit rate: ~65%

Layer 3: CDN Edge Cache
  ├── Listing photos: TTL 24 hours (invalidated on photo update)
  ├── Static assets (JS, CSS, fonts): TTL 30 days (content-hash URLs)
  ├── Search page shell: TTL 1 hour
  └── Hit rate: ~95% for photos, ~99% for static assets

Overall effective cache hit rate: ~75% of all requests served from cache
```

### 3.2 Cache Invalidation Strategy

```
Calendar availability (most critical):
  Pattern: Write-through invalidation
  On calendar change (block/unblock/reserve/book):
    1. Update PostgreSQL (source of truth)
    2. Update Redis cache synchronously (same request path)
    3. Publish event to event stream (async search index update)

  Cache key: "cal:{listing_id}:{date}" → { status, price }
  Batch key: "cal_range:{listing_id}:{month}" → { date → status } hash

  Invalidation granularity: individual date keys + monthly batch key

Listing metadata:
  Pattern: Event-driven invalidation
  On listing update:
    1. Update PostgreSQL
    2. Publish "listing_updated" event
    3. Cache consumer deletes Redis key
    4. CDN invalidation for listing page (if applicable)

Search results:
  Pattern: TTL-based expiry (no explicit invalidation)
  Rationale: Search results are a function of many inputs (availability, pricing, ranking model);
  explicit invalidation is impractical. Short TTL (5 min) ensures reasonable freshness.
```

### 3.3 Redis Cluster Topology

```
Cluster purpose breakdown:

Redis Cluster A: Availability Cache + Distributed Locks
  → 6 nodes (3 master + 3 replica)
  → Memory: 32 GB per node
  → Max keys: ~20M (7M listings × ~3 cached date ranges)
  → Persistence: RDB snapshots every 5 min (locks are ephemeral)

Redis Cluster B: Session Store + Rate Limiting
  → 4 nodes (2 master + 2 replica)
  → Memory: 16 GB per node
  → Max keys: ~15M active sessions
  → Persistence: None (sessions are ephemeral)

Redis Cluster C: General Cache (listings, search, pricing)
  → 6 nodes (3 master + 3 replica)
  → Memory: 64 GB per node
  → Max keys: ~50M
  → Persistence: RDB snapshots every 15 min
```

---

## 4. Fault Tolerance & Resilience

### 4.1 Circuit Breaker Configuration

| Dependency | Failure Threshold | Open Duration | Fallback Behavior |
|-----------|-------------------|--------------|-------------------|
| Payment Gateway | 3 failures in 30s | 30s half-open | Retry with backup processor; if all fail, queue booking for retry |
| Elasticsearch | 5 failures in 60s | 60s half-open | Serve cached search results; show "results may be outdated" |
| ML Ranking Service | 3 failures in 30s | 30s half-open | Fall back to rule-based ranking (rating × review_count) |
| Notification Service | 10 failures in 60s | 120s half-open | Queue notifications for later delivery; never block booking |
| Identity Verification (external) | 3 failures in 60s | 120s half-open | Accept booking with "verification pending" flag |
| iCal Sync (external URLs) | 5 failures in 5m | 15m half-open | Skip sync cycle; use last known state |

### 4.2 Graceful Degradation Levels

```
Level 0: Normal operation (all services healthy)
  → Full functionality

Level 1: Non-critical service degradation
  → Reviews: serve cached aggregates, disable new review submission
  → Messaging: queue messages, disable real-time delivery
  → Pricing suggestions: serve last-computed prices
  → Impact: minimal user-facing degradation

Level 2: Search degradation
  → Elasticsearch down: serve cached search results for popular queries
  → ML Ranking down: fall back to rule-based ranking
  → Impact: reduced result quality, but search still works

Level 3: Payment gateway degradation
  → Primary gateway down: route to backup payment processor
  → All gateways down: accept booking request, queue payment for retry
  → Show user: "Booking reserved, payment processing shortly"
  → Impact: delayed payment confirmation

Level 4: Core service degradation
  → Availability Service slow: increase lock TTL, enable queue-based booking
  → Booking Service down: queue booking requests, process when recovered
  → Impact: increased booking latency, potential user-facing delays

Level 5: Database degradation
  → Write primary down: promote read replica to primary (< 30s with automatic failover)
  → All replicas down: serve from cache only; disable writes
  → Impact: severe; activate incident response
```

### 4.3 Data Consistency Under Failure

**Calendar-Booking consistency:**

```
If Booking Service crashes after reserving calendar dates but before creating booking:
  → Calendar dates stuck in RESERVED state
  → Recovery: Scheduled job scans for RESERVED dates older than 15 minutes
     without a corresponding booking record → release to AVAILABLE
  → This is safe because payment authorization has not occurred yet

If Payment authorization succeeds but Booking Service crashes before recording it:
  → Payment hold exists without a booking record
  → Recovery: Payment reconciliation job compares payment records with booking records
     → Orphaned authorizations are voided within 1 hour
  → This is safe because authorizations are holds, not charges

If Event stream is down (no calendar change events):
  → Search index becomes stale (shows booked listings as available)
  → Mitigation: Redis availability cache is still updated synchronously
     → Search Service checks Redis before returning results
  → Recovery: When event stream recovers, process backlog in order
```

---

## 5. Multi-Region Architecture

### 5.1 Region Topology

```
Primary Region: US-East (main write path for global operations)
Secondary Regions: EU-West, APAC-Southeast

Architecture pattern: Active-passive with regional read replicas

Region: US-East (Primary)
  ├── All write services (Booking, Payment, Calendar writes)
  ├── PostgreSQL write primaries (all databases)
  ├── Redis clusters (lock manager, cache)
  ├── Elasticsearch primaries
  └── Event stream clusters

Region: EU-West (Secondary)
  ├── Read services (Search, Listing reads, Review reads)
  ├── PostgreSQL read replicas (async replication, ~100ms lag)
  ├── Redis cache (local, independently populated)
  ├── Elasticsearch replicas (cross-cluster replication)
  └── Local CDN edge for photos

Region: APAC-Southeast (Secondary)
  ├── Same as EU-West
  └── Higher replication lag (~200ms due to distance)

Write routing:
  All booking/payment/calendar writes route to US-East primary
  Latency impact: EU users see ~100ms additional latency for bookings
  Acceptable because booking is a low-frequency, high-value operation

Read routing:
  Search, listing views, review reads served from nearest region
  Near-zero additional latency for reads
```

### 5.2 Cross-Region Consistency

```
Strong consistency (bookings, calendar, payments):
  → All writes go to US-East primary
  → Read-after-write: booking confirmation reads from primary (not replica)
  → Subsequent reads can go to replica (< 1s lag is acceptable after confirmation)

Eventual consistency (search, reviews, pricing):
  → Elasticsearch cross-cluster replication: ~30s lag
  → PostgreSQL async replication: ~100-200ms lag
  → Redis cache: independently populated per region (no cross-region sync)
```

---

## 6. Disaster Recovery

### 6.1 Recovery Objectives

| Data Category | RPO (Recovery Point) | RTO (Recovery Time) | Strategy |
|--------------|---------------------|---------------------|----------|
| Booking/Payment | 0 (no data loss) | < 5 minutes | Synchronous replication to standby |
| Calendar state | < 1 minute | < 5 minutes | Synchronous replication to standby |
| Listing metadata | < 5 minutes | < 15 minutes | Async replication + hourly snapshots |
| User data | < 5 minutes | < 15 minutes | Async replication + hourly snapshots |
| Photos | < 1 hour | < 1 hour | Cross-region object storage replication |
| Search index | N/A (rebuildable) | < 30 minutes | Rebuild from database; serve cached results meanwhile |
| Messages | < 5 minutes | < 30 minutes | Async replication |
| Reviews | < 15 minutes | < 30 minutes | Async replication |

### 6.2 Failover Procedure

```
Automated failover (database primary failure):
  1. Health checker detects primary unresponsive (3 missed heartbeats, 15s)
  2. Promote synchronous standby to primary (< 30s)
  3. Update connection pool configuration (service mesh handles routing)
  4. Old primary fenced (prevented from accepting writes)
  5. Alert on-call engineer

Manual failover (region-wide outage):
  1. Incident commander declares region failure
  2. DNS failover: route writes to EU-West (pre-promoted standby)
  3. Booking Service: drain in-flight requests, redirect to new region
  4. Payment Service: verify no in-flight transactions before cutover
  5. Calendar lock manager: Redis in new region takes over (old locks expire via TTL)
  6. Estimated cutover time: 5-15 minutes with manual intervention
```

---

## 7. Load Testing & Capacity Planning

### 7.1 Load Test Scenarios

| Scenario | Description | Target Throughput | Pass Criteria |
|----------|-------------|-------------------|--------------|
| Peak search | Simulate peak search traffic | 10K QPS | p99 < 800ms, error rate < 0.1% |
| Booking storm | Simultaneous booking attempts on popular listings | 500 attempts/s | Zero double-bookings, p99 < 2s |
| Calendar update flood | Host calendar bulk updates during season prep | 1K updates/s | All updates applied, search index lag < 5 min |
| Payment gateway slow | Primary gateway latency increased to 5s | Normal traffic | Circuit breaker triggers, backup gateway used |
| Redis failure | Kill one Redis master node | Normal traffic | Automatic failover < 10s, no booking failures |
| DB failover | Kill primary database | Normal traffic | Promotion < 30s, zero booking data loss |

### 7.2 Capacity Planning Triggers

| Metric | Current | Warning Threshold | Action |
|--------|---------|-------------------|--------|
| Search QPS | ~6K peak | > 8K sustained | Add Elasticsearch replicas + search service instances |
| Booking attempts/s | ~260 peak | > 400 sustained | Add Availability Service instances |
| Calendar DB size | 82 GB | > 120 GB | Add calendar shards (requires rebalancing) |
| Redis memory usage | 60% | > 80% | Add Redis nodes or increase instance size |
| Elasticsearch heap | 50% | > 70% | Add data nodes |
| Photo storage | 350 TB | > 500 TB | Expand object storage (usually auto-scaling) |
