# Scalability & Reliability

## Scaling Strategy Overview

A ride-hailing platform has a natural sharding dimension: **geography**. A trip in Tokyo never interacts with driver data in London. This geographic isolation is the foundation of the entire scaling strategy.

---

## City-Based Sharding

### Why City-Based

| Property | City-Based Sharding | Global Flat Sharding |
|----------|-------------------|---------------------|
| Data locality | All trip data for a city on same shard | Trip data scattered across shards |
| Cross-shard queries | Rare (only for analytics) | Frequent (any query might span shards) |
| Latency | Low (regional deployment) | Variable (may hit distant shard) |
| Scaling unit | Add capacity per city | Add capacity globally |
| Failure blast radius | Single city affected | Partial global degradation |

### Sharding Architecture

```
Global
├── Region: North America
│   ├── Cluster: US-West
│   │   ├── City: San Francisco (shard SF-1, SF-2)
│   │   ├── City: Los Angeles (shard LA-1, LA-2)
│   │   └── City: Seattle (shard SEA-1)
│   └── Cluster: US-East
│       ├── City: New York (shard NYC-1, NYC-2, NYC-3)
│       ├── City: Chicago (shard CHI-1)
│       └── City: Miami (shard MIA-1)
├── Region: Europe
│   ├── Cluster: EU-West
│   │   ├── City: London (shard LON-1, LON-2)
│   │   └── City: Paris (shard PAR-1)
│   └── ...
└── Region: Asia-Pacific
    ├── Cluster: India
    │   ├── City: Mumbai (shard MUM-1, MUM-2)
    │   ├── City: Delhi (shard DEL-1, DEL-2)
    │   └── ...
    └── ...
```

### Shard Sizing

| City Size | Concurrent Drivers | Location Updates/s | Shard Count | Notes |
|-----------|-------------------|-------------------|-------------|-------|
| Small (< 10K drivers) | ~5K | ~1.25K | 1 | Single instance sufficient |
| Medium (10K-50K) | ~25K | ~6.25K | 1-2 | Replicated for HA |
| Large (50K-200K) | ~100K | ~25K | 2-3 | Split by zone within city |
| Mega (200K+, e.g., Mumbai) | ~300K | ~75K | 3-5 | Multiple zones, dedicated capacity |

---

## Geospatial Index Scaling

### Per-City In-Memory Stores

Each city runs its own geospatial index instance:

- **Memory footprint**: Even a mega-city with 300K drivers requires only ~40 MB of index memory (300K * ~130 bytes with overhead)
- **Write throughput**: 75K writes/second per instance is well within single-server capability
- **Read throughput**: Query latency remains <10ms at this scale

The indexes are **not shared globally**. A matching engine in NYC queries only the NYC geospatial index. There is no need for distributed spatial queries across cities.

### Replication Strategy

```
Primary-Secondary replication per city:
- Primary: handles all writes (location updates)
- Secondary: handles read queries (matching, nearby drivers)
- Replication lag: <100ms (async, but near-instant for in-memory data)
- Failover: secondary promotes to primary within 2 seconds

If primary fails:
1. Secondary detects missing heartbeat (1s interval)
2. Secondary promotes itself to primary
3. Drivers reconnect and resume location streaming to new primary
4. New secondary is provisioned from the new primary
```

---

## Location Ingestion Pipeline Scaling

### Message Queue Partitioning

```
Location updates flow:
Driver App → WebSocket Gateway → Message Queue → Consumer Workers → Geo Index

Partitioning: hash(driver_id) % num_partitions

Per-city partition count:
- Small city: 16 partitions
- Medium city: 64 partitions
- Large city: 128 partitions
- Mega city: 256 partitions

Consumer group: 1 consumer per partition (no sharing)
Parallelism: partition count = consumer count
```

### Consumer Worker Scaling

| Metric | Value |
|--------|-------|
| Updates per consumer | ~3-5K/second (manageable single-threaded) |
| Processing time per update | ~200 microseconds (validate, dedupe, index update) |
| CPU utilization target | 60% (headroom for spikes) |
| Auto-scale trigger | CPU > 75% for 2 minutes |
| Scale-down trigger | CPU < 30% for 10 minutes |

### Backpressure Handling

If the geospatial index cannot keep up with writes:
1. Message queue acts as a natural buffer (retains messages for hours)
2. Consumer lag increases; alerts fire at >5 seconds lag
3. Additional consumers are auto-scaled (requires adding partitions in advance)
4. In extreme cases, drop location updates for stationary drivers (speed < 2 km/h)

---

## Matching Engine Scaling

The matching engine is **stateless**---it reads from the geospatial index and the routing/ETA service. Scaling is straightforward horizontal scaling behind a load balancer.

| Metric | Value |
|--------|-------|
| Match requests/second (global peak) | ~1,000 |
| Match requests/second (large city peak) | ~50-100 |
| Processing time per match | ~200-500ms (dominated by ETA computation) |
| Instances per city | 2-5 (for redundancy, not throughput) |
| Auto-scale trigger | Request latency p95 > 800ms |

### ETA Caching

The routing engine is the bottleneck in matching. Caching strategies:

1. **Grid-to-grid ETA matrix**: Pre-compute ETAs between H3 resolution-7 cell centers during off-peak hours. Provides ~2 minute accuracy ETA without routing engine calls.

2. **Popular route cache**: Cache ETAs for frequently requested origin-destination pairs (airports, train stations, business districts) with 5-minute TTL.

3. **Fallback to distance-based estimate**: If routing engine is unavailable, use straight-line distance * road_factor (typically 1.4) / average_speed. Less accurate but keeps matching operational.

---

## Pricing Service Scaling

### Surge Computation

Surge is computed periodically (every 60-120 seconds), not on every ride request:

1. **Stream processor** aggregates ride request events and driver availability per zone
2. **Surge calculator** reads aggregates, computes multipliers, writes to a low-latency cache
3. **Ride request** reads the pre-computed multiplier from cache---no computation at request time

This means surge computation scales independently of request volume.

### Cache Architecture

```
Surge multiplier read path:
Ride request → Local in-process cache (L1, 10s TTL)
                → Distributed cache (L2, 120s TTL)
                   → Surge calculator (source of truth, recomputed every 60-120s)

Cache miss rate: <1% (L1 covers 95%, L2 covers 99%+)
```

---

## Multi-Region Deployment

### Regional Isolation

```
Region: US-West
├── Data Center 1 (Primary)
│   ├── API Gateway
│   ├── Core Services (Dispatch, Trip, Matching, Pricing)
│   ├── Geospatial Index (cities: SF, LA, Seattle, ...)
│   ├── Relational DB (Primary)
│   └── Message Queue Cluster
│
└── Data Center 2 (Standby)
    ├── API Gateway (active, serves read traffic)
    ├── Core Services (warm standby)
    ├── Geospatial Index (replica)
    ├── Relational DB (Read replica)
    └── Message Queue Cluster (mirror)
```

### Cross-Region Data Flow

- **Operational data** (trips, locations, surge): stays within the region. No cross-region replication for operational paths.
- **User profiles**: replicated across regions for riders who travel (eventual consistency, 30-second lag acceptable).
- **Analytics**: aggregated to a global data warehouse asynchronously (hourly batch sync).
- **Configuration**: global configuration store (feature flags, pricing configs) replicated to all regions with strong consistency.

---

## Failure Modes and Recovery

### Critical Failure Scenarios

| Failure | Impact | Detection | Recovery |
|---------|--------|-----------|----------|
| **Matching engine down** | New rides cannot be matched | Health check failure, request timeout >2s | Failover to standby instances; fallback to distance-only matching (skip ETA) |
| **Geospatial index loss** | Cannot find nearby drivers | Index query returns empty for non-empty city | Rebuild from driver heartbeats (drivers re-report location within 4s); standby index takes over |
| **Pricing service unavailable** | No surge data; fare estimates fail | Surge cache returns null for known-active zones | Default to 1.0x multiplier (flat fare); use last known surge values from cache |
| **Trip service database failure** | Cannot persist trip state changes | Database connection errors | Failover to replica; trip state machine queues transitions in memory, replays on recovery |
| **Payment service failure** | Cannot charge riders post-trip | Payment processor timeouts | Complete the trip anyway; queue payment for retry; rider can still request new rides with outstanding balance up to a threshold |
| **Message queue failure** | Location pipeline stalls | Consumer lag exceeds 30s | Drivers fall back to direct REST-based location reporting (degraded mode); higher latency but functional |
| **WebSocket gateway failure** | Drivers/riders lose real-time updates | Connection drop spike detected | Clients auto-reconnect to healthy gateway instances; stateless gateway means no session state lost |
| **Routing engine failure** | Cannot compute ETAs | ETA service returns errors | Fall back to pre-computed grid-to-grid ETA matrix; less accurate but functional |
| **Data center failure** | Entire region offline | Multi-probe health monitoring | Failover to standby data center; DNS switch within 30-60 seconds; active trips resume from replicated state |

### Graceful Degradation Hierarchy

When the system is under stress, degrade non-critical features first:

```
Level 0 (Normal):     All features operational
Level 1 (Stressed):   Disable nearby-drivers map animation (reduce WebSocket traffic)
Level 2 (Degraded):   Disable surge heatmap for drivers; use cached surge values
Level 3 (Critical):   Distance-only matching (skip ETA computation); fixed surge multiplier
Level 4 (Emergency):  Accept rides but queue matching (30s delay); notify riders of delays
```

---

## Disaster Recovery

| Metric | Target | Strategy |
|--------|--------|----------|
| **RTO** (Recovery Time Objective) | < 2 minutes | Automated failover to standby data center |
| **RPO** (Recovery Point Objective) | < 10 seconds | Synchronous replication for trip state; async for analytics |
| **Active trip recovery** | 100% of in-progress trips | Trip state machine persisted with every transition; driver app holds encrypted state digest for recovery |
| **Backup frequency** | Continuous (streaming replication) | Database: streaming replication to standby; message queue: mirrored topics |

### Driver-Side State Recovery

Uber's innovation: the driver phone app holds an encrypted state digest of the active trip. If the data center fails completely:

1. Backup dispatch system starts up
2. Online drivers reconnect and submit their state digests
3. State digests are decrypted and used to rebuild the active trip table
4. Trips resume from their last known state

This eliminates the dependency on the primary data center for active trip recovery.

---

## Capacity Planning

### Growth Projections

| Year | Trips/Day | Drivers | Location Updates/s | Infra Cost Multiplier |
|------|-----------|---------|-------------------|----------------------|
| Current | 28M | 5.4M | 875K | 1.0x |
| +1 Year | 35M | 6.5M | 1.1M | 1.3x |
| +3 Years | 50M | 8M | 1.5M | 1.8x |
| +5 Years | 70M | 10M | 2.0M | 2.5x |

### Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| City driver count > 200K | Auto | Split city into sub-regions with dedicated shards |
| Location ingestion lag > 5s | Auto | Add message queue partitions + consumers |
| Matching latency p95 > 800ms | Auto | Scale matching engine instances |
| WebSocket connection count > 80% of capacity | Auto | Add WebSocket gateway instances |
| Database CPU > 70% | Manual review | Evaluate read replica addition or shard split |
| Surge computation time > 30s per city | Manual review | Optimize aggregation queries or split city into zones |
