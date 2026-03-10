# 14.12 AI-Native Field Service Management for SMEs — Scalability & Reliability

## Horizontal Scaling Strategy

### Scheduling Engine: Tenant-Partitioned Stateful Scaling

The scheduling engine is the most challenging component to scale because it maintains in-memory schedule state for real-time optimization. The scaling strategy is tenant-based partitioning:

**Partition scheme:**
- Each SME tenant's schedule is assigned to exactly one scheduling engine instance
- Consistent hashing maps tenant_id → engine instance
- Each instance handles 200-500 tenants depending on fleet size (small SMEs with 5 techs vs. medium SMEs with 50 techs)
- Total fleet: ~100-250 engine instances for 50,000 tenants

**State management:**
- Schedule state is held in-memory for sub-second query latency
- Every state mutation is written to a write-ahead log (WAL) in a durable queue
- A warm standby instance replays the WAL to maintain a shadow copy (< 5 second lag)
- On instance failure, the standby promotes within 10 seconds; during promotion, incoming requests queue at the API gateway

**Scaling triggers:**
- CPU > 70% sustained for 5 minutes → add instances, rebalance tenants
- Memory > 80% → rebalance largest tenants to new instances
- Optimization latency P95 > 8 seconds → investigate and scale compute

### Stateless Services: Standard Horizontal Scaling

All other services (Job Service, Invoice Service, Notification Service, Route Service) are stateless and scale with standard auto-scaling:

| Service | Scaling Metric | Min Instances | Max Instances | Scale Step |
|---|---|---|---|---|
| API Gateway | Requests/second | 4 | 40 | +2 when RPS > 2000/instance |
| Job Service | Request latency P95 | 6 | 30 | +2 when P95 > 300 ms |
| Sync Service | Concurrent connections | 8 | 60 | +4 when connections > 500/instance |
| Notification Service | Queue depth | 4 | 20 | +2 when queue > 10,000 |
| Invoice Service | Request rate | 3 | 15 | +1 when rate > 100/s/instance |
| IoT Pipeline | Message backlog | 4 | 25 | +2 when lag > 30 seconds |

### Database Scaling

**Primary database (relational):**
- Partitioned by tenant_id (range partitioning)
- Read replicas for analytics and reporting queries (3 replicas, cross-zone)
- Connection pooling with per-tenant connection limits to prevent noisy-neighbor effects
- Hot tenants (>100 concurrent queries) automatically routed to dedicated read replicas

**Time-series database (IoT telemetry):**
- Automatically partitioned by time (hourly buckets for recent data, daily for older)
- Retention policies: raw 90 days → 1-hour aggregates 2 years → daily aggregates 5 years
- Downsampling runs as a background process during off-peak hours

**Cache layer:**
- Distributed cache for schedule reads, ETA lookups, and frequently accessed customer data
- Per-tenant cache namespace to prevent cross-tenant data leakage
- Cache warming on scheduling engine startup from database snapshot
- TTL: schedule data 30 seconds (frequently updated), customer data 5 minutes, price books 1 hour

### Photo and Document Storage

- Object storage with CDN for photo retrieval
- Photos compressed on-device before upload (JPEG quality 80, max dimension 2048px)
- Lifecycle policy: hot storage 30 days → warm storage 1 year → cold storage 5 years
- Thumbnail generation on upload (3 sizes: 150px, 400px, 800px) for fast listing views

---

## Fault Tolerance Patterns

### Scheduling Engine Failover

```
┌─────────────────────┐     ┌─────────────────────┐
│  Primary Instance   │────▶│   Write-Ahead Log    │
│  (Active)           │     │   (Durable Queue)    │
│  Tenants: A,B,C     │     └──────────┬───────────┘
└─────────────────────┘                │
                                       ▼
                         ┌─────────────────────────┐
                         │  Standby Instance        │
                         │  (Shadow, < 5s lag)      │
                         │  Tenants: A,B,C (replay) │
                         └─────────────────────────┘

Failure scenario:
1. Primary instance crashes
2. Health check fails (3 consecutive misses, 15 seconds)
3. Standby promotes to primary
4. API gateway updates routing table
5. Queued requests drain (< 10 second total outage)
6. New standby instance spins up and begins WAL replay
```

### Graceful Degradation Hierarchy

| Failure | Impact | Degradation Strategy |
|---|---|---|
| Scheduling engine down | Cannot auto-assign new jobs | Jobs queued; dispatcher can manually assign from dashboard; queue drains on recovery |
| Maps API unavailable | No real-time traffic data | Fall back to pre-computed distance matrix with time-of-day multipliers; routes less optimal but functional |
| Notification service down | Customers don't receive updates | Notifications queued with TTL; delivered on recovery; critical notifications (arrival) retried via fallback channel |
| IoT pipeline down | No predictive maintenance | Sensor data buffered at device level; batch-processed on recovery; no preventive work orders generated during outage |
| Sync service down | Technician devices can't sync | Devices continue operating offline (core use case); sync queued and resumes automatically |
| Payment gateway down | Cannot process on-site payments | Offline payment queuing; technician records payment intent; processed when gateway recovers |
| Database primary down | Write operations fail | Automatic failover to standby (30-second RTO); read replicas continue serving read traffic |

### Circuit Breaker Configuration

| External Dependency | Failure Threshold | Open Duration | Fallback |
|---|---|---|---|
| Maps / routing API | 5 failures in 30 seconds | 60 seconds | Cached distance matrix |
| Payment gateway (primary) | 3 failures in 10 seconds | 30 seconds | Secondary gateway |
| SMS provider | 10 failures in 60 seconds | 120 seconds | Queue + retry; switch provider |
| WhatsApp Business API | 5 failures in 30 seconds | 60 seconds | Fall back to SMS |
| Accounting system sync | 3 failures in 60 seconds | 300 seconds | Queue journal entries; batch on recovery |
| IoT device gateway | 10 failures in 60 seconds | 120 seconds | Buffer at ingestion layer |

---

## Disaster Recovery

### Recovery Objectives

| Scenario | RTO | RPO | Strategy |
|---|---|---|---|
| Single instance failure | < 30 seconds | 0 (WAL) | Warm standby promotion |
| Availability zone failure | < 5 minutes | < 1 minute | Cross-zone replicas; DNS failover |
| Region failure | < 30 minutes | < 5 minutes | Cross-region standby; data replication |
| Database corruption | < 1 hour | < 1 minute | Point-in-time recovery from continuous backup |
| Scheduling engine state loss | < 2 minutes | < 5 seconds | Rebuild from WAL + database snapshot |

### Cross-Region Architecture

```
Primary Region                          Secondary Region
┌──────────────────────┐               ┌──────────────────────┐
│ Scheduling Engines   │──async WAL──▶ │ Standby Engines      │
│ API Servers          │               │ API Servers (cold)    │
│ Primary Database     │──sync rep──▶  │ Read Replica          │
│ Cache Cluster        │               │ Cache (cold)          │
│ Object Storage       │──async rep──▶ │ Object Storage Mirror │
└──────────────────────┘               └──────────────────────┘
         │                                       │
    ┌────┴────┐                             ┌────┴────┐
    │ CDN PoP │                             │ CDN PoP │
    └─────────┘                             └─────────┘
```

**Failover procedure:**
1. Primary region health check fails for 2 minutes
2. DNS TTL (60 seconds) expires; traffic routes to secondary
3. Secondary scheduling engines load state from replicated WAL
4. Standby database promoted to primary
5. Cold API servers warm up (pre-provisioned but not running compute)
6. Technician mobile apps detect server change via sync endpoint redirect; re-sync delta

### Data Backup Strategy

| Data Type | Backup Frequency | Retention | Method |
|---|---|---|---|
| Job records & customer data | Continuous (WAL streaming) | 90 days point-in-time | Database continuous backup |
| Schedule state | Every 5 minutes (snapshot) | 7 days | Scheduling engine state dump to object storage |
| IoT telemetry | Hourly incremental | 90 days raw, 5 years aggregated | Time-series DB native backup |
| Photos & documents | At upload (replicated) | Lifecycle-managed | Cross-region object storage replication |
| Invoices & payments | Continuous | 7 years (regulatory) | Database + PDF archive in cold storage |
| Configuration & pricing | On change (event log) | Indefinite | Event store with snapshots |

---

## Performance Optimization

### Scheduling Optimization Performance

**Pre-computation:**
- Skill-to-technician index: maintained in-memory, updated on technician profile changes
- Service zone boundaries: pre-computed geofence polygons for fast "which technicians serve this area" queries
- Historical job duration distributions: pre-computed per (job_type, technician_skill_level, equipment_age) tuple; updated nightly

**Caching strategy for optimization:**
- Distance matrix cache: LRU cache of location-pair distances; hit rate > 85% for repeat service areas
- Technician availability cache: bitmap of 15-minute slots per technician per day; O(1) availability check
- Parts availability index: in-memory map of parts per vehicle; updated on every parts transaction

### Mobile App Performance

**Offline database optimization:**
- Selective sync: device only stores data for assigned jobs, relevant customers, and local price book (not entire tenant data)
- Database size target: < 100 MB per device for typical technician's working data set
- Index strategy: composite indexes on (date, status) and (customer_id) for fast local queries
- Photo storage: photos stored separately from database; referenced by URL; compressed on-device

**Sync performance:**
- Delta encoding: only changed fields transmitted, not full records
- Compression: gzip on all sync payloads (60-70% compression for JSON data)
- Priority queuing: status changes first (< 1 KB), then text data, then photos last
- Background sync: non-critical data syncs in background without blocking UI

### API Performance

| Optimization | Technique | Impact |
|---|---|---|
| Connection reuse | HTTP/2 with connection pooling; gRPC for internal services | 40% latency reduction for sequential requests |
| Response compression | gzip for payloads > 1 KB | 60-70% bandwidth reduction |
| Pagination | Cursor-based pagination for job lists | Consistent performance regardless of result set size |
| Field selection | GraphQL-style field selection for mobile API | 50% payload reduction for list views |
| Batch endpoints | Bulk status updates, bulk photo uploads | 80% fewer HTTP round-trips for sync |
| Rate limiting | Per-tenant, per-endpoint rate limits with token bucket | Prevent noisy-neighbor degradation |
| Request coalescing | Multiple ETA requests for same technician coalesced | 70% fewer ETA computations during peak |
