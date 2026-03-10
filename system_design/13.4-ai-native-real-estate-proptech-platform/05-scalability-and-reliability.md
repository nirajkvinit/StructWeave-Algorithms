# 13.4 AI-Native Real Estate & PropTech Platform — Scalability & Reliability

## Scalability Architecture

### Property Data Ingestion Scaling

The platform ingests data from 500+ MLS feeds, each with different update frequencies (real-time RETS/Web API, hourly batch, daily flat file), plus county recorder feeds, satellite imagery, and building sensor networks. The ingestion layer must handle both the steady-state throughput (~50K property updates/hour from MLS feeds) and bursty peaks (quarter-end when commercial leases report, spring/summer when residential listings surge 3-5x).

**MLS feed processing:**
- Each MLS feed is assigned a dedicated ingestion worker that polls at the feed's native frequency
- Workers are stateless and run behind a work queue—if a worker fails, another picks up the feed within 60 seconds
- Schema normalization is configured per-feed using a mapping definition that translates source-specific fields to the canonical property schema
- New MLS integrations are onboarded by writing a mapping definition (typically 2-4 hours of configuration, not code changes)

**Horizontal scaling strategy:**
- Ingestion workers scale horizontally with the number of MLS feeds (1 worker per 5-10 feeds)
- Entity resolution is partitioned by geography (state-level sharding) because property matching is inherently local—a property in Texas will never match a record from Massachusetts
- The entity resolution index is replicated across 3 nodes per shard for read availability during the matching process

**Satellite imagery pipeline:**
- Imagery is large (10-50 GB per coverage update) and processed asynchronously
- A dedicated GPU pool handles image segmentation (vegetation analysis, construction detection, pool identification)
- Results are written to the property feature store and trigger AVM recomputation for affected properties
- Processing is parallelized by geographic tile; tiles are independent and can run on separate GPU workers

### AVM Computation Scaling

The nightly batch valuation of 146M properties is the largest compute workload in the platform.

**Batch architecture:**
```
Phase 1: Feature Assembly (2 hours)
  - Read property features from columnar store
  - Compute derived features (days since last sale, neighborhood median, trend momentum)
  - Partition by geography (state-level, ~50 partitions)
  - Each partition processed independently on a worker pool

Phase 2: Comparable Selection (4.1 hours) — bottleneck
  - For each property, query the ANN index for top-100 candidates
  - Re-rank candidates with full feature comparison
  - Select top-5 with diversity constraint
  - Parallelized across 500 workers, each processing ~292K properties

Phase 3: Model Inference (73 minutes)
  - Run ensemble (GBT + SAR + temporal) for each property
  - GBT inference: ~5 ms/property (CPU)
  - SAR inference: ~8 ms/property (requires spatial weight matrix lookup)
  - Temporal model: ~2 ms/property (census-tract index lookup)
  - Ensemble combination: ~1 ms/property

Phase 4: Compliance Check (30 minutes)
  - Run disparate impact screening on batch results
  - Flag properties where valuation error exceeds demographic parity threshold
  - Generate compliance report for regulatory review
```

**On-demand scaling:**
- On-demand valuation requests (500K/day, peak 20/sec) are handled by a stateless serving fleet
- Each server caches the ANN index in memory (~11 GB) and loads model weights at startup
- Auto-scaling based on request rate with a target latency of p99 ≤ 30s
- During lending surges (spring home-buying season), the fleet scales from 10 to 50 instances

### Building IoT Ingestion Scaling

2M sensor readings per second is the platform's highest throughput requirement.

**Architecture:**
- Building edge gateways aggregate and batch sensor readings locally (1-second batches), reducing the per-message overhead
- Readings flow through a distributed stream processing layer partitioned by building_id
- Each building's digital twin is managed by a dedicated process (actor model) that handles writes sequentially and serves reads from snapshots
- 50,000 buildings → 50,000 twin actors, distributed across a cluster of ~500 nodes (100 buildings per node)

**Time-series storage:**
- Sensor readings are stored in a time-series database optimized for write throughput and compression
- Delta encoding + run-length encoding achieves 10x compression on typical HVAC sensor data (temperatures change slowly)
- Data retention: 30-day hot (full resolution), 1-year warm (5-minute aggregates), 5-year cold (hourly aggregates)
- Tiered storage: hot data on SSDs, warm on HDDs, cold in object storage

### Property Search Scaling

10,000 queries/sec peak with p99 ≤ 200ms requires careful index design and caching.

**Index partitioning:**
- The property corpus (146M documents) is partitioned into 20 shards by geography (metro-area-based partitioning ensures that most queries hit a single shard)
- Each shard is replicated across 3 nodes for read availability and load balancing
- For cross-geography queries (e.g., "condos under $300K anywhere in California"), a scatter-gather layer fans out to relevant shards and merges results

**Caching strategy:**
- Popular searches (top 1,000 query patterns by volume) are cached with 15-minute TTL
- User personalization features are cached in a low-latency key-value store (≤ 2ms lookup)
- Geospatial filters (H3 hex to property list) are pre-computed and cached for resolution-9 hexagons

**Visual search optimization:**
- The 4.4 TB embedding store for listing photos is too large for a single server
- Embeddings are sharded by geography (same partitioning as the text index) and loaded into GPU memory for ANN search
- Each shard's HNSW index fits in 25 GB GPU memory; queries execute in ~3ms

---

## Reliability Architecture

### Building Safety System Reliability (99.999%)

The building safety path is the platform's highest-reliability requirement because failure can endanger human life.

**Edge autonomy:** Each building's edge gateway operates independently of the cloud platform. Safety logic, sensor thresholds, and actuator commands are compiled into the edge gateway firmware. The gateway continues operating through:
- Cloud connectivity loss (days to weeks)
- Local network partition (sensor-to-gateway connection still works via dedicated BACnet/IP network)
- Edge gateway power loss (UPS provides 4-hour battery backup; fail-safe defaults on power loss)

**Redundancy:**
- Dual edge gateways per building (active-standby) with sub-second failover
- Safety-critical sensors have redundant installations (two smoke detectors per zone, two CO sensors per floor)
- Actuator commands use "dead man's switch" pattern: the controller must actively send "keep current state" signals; if the signal stops, the system reverts to safe defaults

**Testing:**
- Monthly automated safety logic tests: the edge gateway simulates sensor readings that should trigger safety responses and verifies actuator commands
- Quarterly full-path integration tests: actual sensor stimulation (controlled smoke test, CO2 injection) to verify end-to-end response within 100ms budget
- All test results logged to immutable audit trail for regulatory compliance

### AVM Service Reliability

**Graceful degradation tiers:**

| Tier | Condition | Behavior |
|---|---|---|
| Full service | All models available, ANN index current | Ensemble prediction with comparables and explainability |
| Degraded - no SAR | Spatial model unavailable or stale | GBT + temporal only; wider confidence intervals; flag in response |
| Degraded - no ANN | ANN index unavailable | Fall back to brute-force comparable search (10-mile radius, recent 12 months); increased latency (2-5 seconds) |
| Minimal - cached | Model serving fleet down | Return last cached valuation with staleness timestamp; do not compute new valuation |
| Offline | Complete service outage | Return HTTP 503 with retry-after header; client falls back to tax-assessed value |

**Model deployment safety:**
- New model versions deployed via canary release: 1% of valuations served by new model for 7 days
- Canary metric: median absolute error compared against production model
- Automatic rollback if canary error exceeds production error by >0.5 percentage points
- Shadow mode: new models can run in parallel (predictions logged but not served) for evaluation

### Data Consistency for Property Records

Property records are updated by multiple async sources (MLS feeds, county records, satellite analysis, building sensors). The platform uses eventual consistency with conflict resolution rules:

**Conflict resolution priority (highest to lowest):**
1. Verified transaction (recorded deed) — authoritative for ownership, sale price
2. Active MLS listing — authoritative for listing price, listing status, listing date
3. Tax assessor records — authoritative for legal description, assessed value, parcel boundaries
4. Satellite/photo analysis — authoritative for condition score, feature detection
5. Imputed/modeled values — lowest priority; overridden by any direct observation

**Consistency guarantees:**
- **Within a single data source:** Causal ordering preserved (a status change from ACTIVE to PENDING to SOLD is never reordered)
- **Cross-source:** Eventual consistency with conflict resolution; convergence within 15 minutes of last update
- **AVM reads:** AVM batch reads a consistent snapshot of property data (point-in-time isolation) to prevent mid-batch data changes from creating inconsistent valuations

### Disaster Recovery

| Component | RPO | RTO | Strategy |
|---|---|---|---|
| Property database | 0 (zero data loss) | 30 minutes | Synchronous replication to standby region; automated failover |
| AVM model artifacts | 24 hours | 2 hours | Daily model checkpoint to object storage; standby serving fleet pre-loaded |
| Building digital twins | 5 seconds | 60 seconds | Building-level state checkpointed every 5 seconds; recovery replays recent sensor events |
| Lease document store | 0 | 1 hour | Multi-region object storage with versioning; document store rebuild from objects |
| Search indices | 1 hour | 4 hours | Index rebuild from property database; cached queries continue serving stale results during rebuild |
| Climate risk scores | 24 hours | 2 hours | Pre-computed scores in multi-region cache; refresh from batch output |

---

## Peak Load Patterns

### Seasonal Patterns

| Season | Traffic Pattern | Scaling Response |
|---|---|---|
| Spring (Mar-Jun) | Home-buying season: 3-5x search traffic; 2x AVM requests; peak MLS listing volume | Pre-scale search fleet and AVM serving by March 1; increase ANN index replication |
| Month-end | Lease renewals and rent payments: 5x lease processing volume | Auto-scale lease abstraction GPU pool; pre-warm OCR pipeline |
| Year-end | Tax planning: 3x valuation requests for tax appeal preparation | Increase on-demand AVM capacity; cache popular neighborhood-level analytics |
| Post-disaster | Hurricane/wildfire: 50-100x climate risk queries for affected region | Geographic traffic shaping; serve pre-computed scores (do not allow on-demand recomputation); queue excess requests |

### Geographic Hot Spots

When a natural disaster occurs (hurricane landfall, wildfire), climate risk queries for the affected region spike dramatically. The platform handles this via:

1. **Request coalescing:** Multiple queries for properties in the same climate grid cell within a 5-second window are coalesced into a single computation
2. **Pre-computation trigger:** When NOAA issues a severe weather watch, the platform pre-computes updated risk scores for all parcels in the watch area (typically 50K-500K parcels)
3. **Rate limiting:** API clients are rate-limited to prevent a single large portfolio manager from monopolizing compute during a surge
4. **Stale-serve:** For pre-computed scores, serve the cached value even if it is up to 24 hours old rather than queue behind recomputation
