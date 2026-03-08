# Scalability & Reliability — Maps & Navigation Service

## Tile Serving Scalability

### CDN-First Architecture

The tile serving system inverts the traditional architecture. The CDN edge network is the **primary serving tier**, not a cache layer:

```
                    35M req/sec peak
                         │
            ┌────────────┴────────────┐
            │     CDN EDGE NODES      │
            │   (99%+ cache hit rate) │
            │   Multi-CDN for HA      │
            └────────────┬────────────┘
                    < 1% miss
                         │
            ┌────────────┴────────────┐
            │    ORIGIN TILE SERVERS  │
            │   (< 350K req/sec)      │
            └────────────┬────────────┘
                         │
            ┌────────────┴────────────┐
            │    OBJECT STORAGE       │
            │   (tiles/z/x/y.mvt)     │
            └─────────────────────────┘
```

**Multi-CDN strategy**: Deploy across two CDN providers simultaneously for resilience. If one CDN experiences an outage, DNS-based failover routes to the other within seconds.

### Tile Cache Warming

After a data pipeline run generates new tiles, **proactively push** popular tiles to CDN edge nodes:
- Zoom 0–12 tiles for the entire planet (~17M tiles)
- Zoom 13–16 tiles for top 500 cities (~100M tiles)
- This ensures the CDN cache is warm before users request tiles

### Offline Maps

For offline navigation, users download **region packages**:

| Region Size | Package Contents | Download Size |
|---|---|---|
| City (e.g., Manhattan) | Vector tiles zoom 0–16, road graph, POI, geocoding index | ~50–100MB |
| State/Province | Same, broader coverage | ~200–500MB |
| Country (e.g., France) | Same, full country | ~1–3GB |

Package structure:
- Compressed vector tiles for the region's bounding box
- Extracted road graph subgraph (for on-device routing)
- Geocoding index subset (addresses within region)
- POI database subset
- **Delta updates**: Client requests only changes since last sync, reducing bandwidth by 90%+

---

## Route Service Scalability

### Regional Graph Partitioning

The planet's road graph (~120GB routing-optimized) can be partitioned for deployment:

**Strategy 1: Full Planet per Instance**
- Each Route Service instance holds the entire planet graph in memory
- Simplest architecture; any instance handles any query
- Requires machines with 128GB+ RAM
- Suitable for smaller deployments

**Strategy 2: Regional Partitioning**
- Partition graph into regions (e.g., North America, Europe, Asia)
- Each region's graph fits in 15–30GB RAM
- Cross-region queries handled by stitching regional results through **border nodes**
- Request router directs query to correct region based on origin/destination

**Strategy 3: Hierarchical Partitioning**
- Fine-grained partitions (country/state level) for local roads
- Global overlay graph with only highways and major roads
- Local queries stay within partition; long-distance queries use overlay graph
- This mirrors how Contraction Hierarchies naturally works

### Graph Update Strategy

When the road network changes (new road, closure, speed limit change):

1. **Build new CH** from updated graph (takes 2–4 hours for planet)
2. **Blue-green deployment**: New Route Service instances load new graph while old instances serve traffic
3. **Traffic switch**: Once new instances are healthy, route traffic to them
4. **Drain old instances**: Gracefully shut down after in-flight requests complete

**Frequency**: Full rebuild daily; critical changes (road closures) applied as graph patches within minutes using edge weight overrides in Redis.

---

## Traffic System Scalability

### Kafka-Based Ingestion

```
Probe Vehicles (3.3M updates/sec)
         │
    ┌────┴────┐
    │  KAFKA  │ — 128 partitions, partitioned by S2 cell ID
    │ CLUSTER │ — 3-day retention for replay
    └────┬────┘
         │
    ┌────┴──────────────────────────┐
    │   MAP MATCHING CONSUMERS      │
    │   (one consumer group per     │
    │    geographic region)          │
    │   ~50 consumer instances       │
    └────┬──────────────────────────┘
         │
    ┌────┴────┐
    │  REDIS  │ — Cluster with 64 shards
    │ CLUSTER │ — Sharded by edge_id
    └─────────┘
```

**Partition strategy**: Kafka messages partitioned by **S2 cell ID** of the GPS coordinates. This ensures all probes for the same geographic area go to the same consumer, enabling efficient batch map matching.

### Redis Cluster for Traffic Cache

- **64 shards** partitioned by edge_id hash
- Each shard holds speed data for ~25M edges
- **Read replicas**: 2 per shard for Route Service reads
- **Memory per shard**: ~2GB (current speeds) + ~5GB (2-hour history)
- **Eviction**: TTL-based; data older than 2 hours auto-expires
- **Pipeline writes**: Batch speed updates in groups of 100 for throughput

---

## Geocoding Scalability

### Spatial Database Scaling

- **Primary**: Spatial DB with full-text search index + geohash spatial index
- **Read replicas**: 4–6 per region (geocoding is 99%+ reads)
- **Regional deployment**: US replica set has detailed US addresses; European set has European addresses
- **Index strategy**: N-gram tokenization for fuzzy matching; geohash prefix for spatial queries; compound index for location-biased text search

### Autocomplete Optimization

Address autocomplete requires < 100ms response time. Separate infrastructure:
- **Prefix trie** built from popular queries and addresses
- **In-memory** on dedicated autocomplete servers
- **Top-K cache**: Cache results for the 100K most common prefixes
- **Progressive refinement**: Return results after 3+ characters typed

---

## Reliability Patterns

### Graceful Degradation Hierarchy

| Failure | Impact | Degradation Strategy |
|---|---|---|
| Traffic ingest pipeline down | No real-time speeds | Route using historical profiles (still accurate 80% of the time) |
| One CDN provider down | 50% edge capacity lost | DNS failover to second CDN within 30s |
| Route Service partition down | Cannot route in one region | Fallback to global overlay graph (less optimal but functional) |
| Geocoding DB primary down | No writes | Promote read replica; geocoding data rarely changes |
| Redis cluster shard down | Traffic data loss for some edges | Route using historical baseline for affected edges |
| Object storage outage | Cannot serve cache-miss tiles | CDN serves stale tiles (12-hour cache); offline maps on device |

### Disaster Recovery

| Component | Recovery Strategy | RTO | RPO |
|---|---|---|---|
| Tiles | Regenerate from source data; CDN cache buys time | < 4 hours (full rebuild) | 0 (source data intact) |
| Road graph | Rebuild from OSM data + CH preprocessing | < 6 hours | 0 (source data intact) |
| Traffic speeds | Restart consumers from Kafka (3-day retention) | < 30 min | < 5 min (Kafka offset) |
| Geocoding index | Rebuild from address database | < 2 hours | 0 (source DB replicated) |
| Navigation sessions | Sessions are ephemeral; clients can restart | Immediate | N/A (client has route) |

### Health Checks

```
Tile Service:    GET /health → verify object storage read + tile generation pipeline running
Route Service:   GET /health → verify graph loaded in memory + sample route computes in < 100ms
Geocoding:       GET /health → verify spatial DB query returns result for known address
Traffic Ingest:  Check Kafka consumer lag < 10,000 messages per partition
Navigation:      GET /health → verify session store read/write latency < 50ms
```

---

## Capacity Planning

### Route Service Sizing

```
Peak routing queries: 58K req/sec
CH query time per request: ~5ms CPU
With traffic weight lookup: ~20ms total
Single core throughput: 1000 / 20 = 50 req/sec
Cores needed: 58,000 / 50 = 1,160 cores

Assuming 32-core machines with 256GB RAM:
  Machines for compute: 1,160 / 32 = ~37 machines
  Memory per machine: 256GB (holds full planet graph + headroom)
  → Deploy: 50 machines (with 35% headroom for burst)
  → Spread across 3+ regions
```

### Tile Origin Server Sizing

```
Peak origin traffic (1% of 35M): ~350K req/sec
Tile generation time (cache miss): ~50ms for pre-existing, ~200ms for on-demand
Throughput per core: ~20 req/sec (worst case on-demand)
Cores needed: 350,000 / 20 = 17,500 cores (worst case, all on-demand)

Reality: 90%+ of origin hits find tile in object storage (50ms fetch)
  → Effective core need: ~2,000 cores for mixed workload
  → Deploy: ~80 machines (32 cores each) across regions
```

### Traffic Pipeline Sizing

```
Probe ingestion: 3.3M updates/sec
Map matching per trace: ~10ms CPU (batch of 10 points)
Throughput per core: ~100 traces/sec
Cores for map matching: 3,300,000 / 100 = 33,000 cores

Optimization: batch processing (10 traces per batch reduces overhead)
  → Effective: ~5,000 cores
  → Deploy: ~160 machines across regions, scaled as Kafka consumer group
```
