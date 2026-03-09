# Scalability & Reliability — Industrial IoT Platform

## 1. Scaling Strategies

### 1.1 Horizontal Scaling by Facility

The most natural scaling dimension for an IIoT platform is the facility (plant/site). Each facility's data is largely independent—sensors in Plant A don't interact with sensors in Plant B in the hot path.

```
Facility-Based Partitioning:

┌─────────────────────────────────────────────────────────────┐
│                    Global Control Plane                       │
│  Device Registry · Asset Model · User Management · Analytics │
└───────────┬──────────────┬───────────────┬──────────────────┘
            │              │               │
     ┌──────┴──────┐ ┌────┴─────┐  ┌──────┴──────┐
     │ Facility    │ │ Facility │  │ Facility    │
     │ Partition A │ │ Part. B  │  │ Part. C     │
     │             │ │          │  │             │
     │ MQTT Broker │ │ MQTT     │  │ MQTT        │
     │ Ingestion   │ │ Broker   │  │ Broker      │
     │ TSDB Shard  │ │ Ingest.  │  │ Ingest.     │
     │ Alert Engine│ │ TSDB     │  │ TSDB        │
     │ Twin Sync   │ │ Alert    │  │ Alert       │
     └─────────────┘ └──────────┘  └─────────────┘
```

**What scales per-facility (data plane):**
- MQTT broker connections (edge gateways connect to their facility's broker)
- Stream processing partitions (telemetry processed independently per facility)
- Time-series database shards (data partitioned by facility for query locality)
- Alert correlation instances (alarms correlated within facility context)
- Digital twin sync workers (each facility's twins managed independently)

**What scales globally (control plane):**
- Device registry (single source of truth for all devices across all facilities)
- Asset hierarchy (enterprise-wide organizational structure)
- User management and access control (cross-facility roles and permissions)
- ML model registry (models trained on cross-facility data)
- Analytics and reporting (cross-facility KPIs and benchmarking)

### 1.2 MQTT Broker Scaling

```
MQTT Broker Cluster Scaling Strategy:

Tier 1: Single Facility (< 500 gateways, < 50K sensors)
  - Single broker instance (active-standby)
  - All topics on single broker
  - Typical: 25,000 messages/sec

Tier 2: Large Facility (500-2000 gateways, 50K-500K sensors)
  - 3-5 broker nodes in cluster
  - Topic-based sharding: each Sparkplug group assigned to broker node
  - Load balanced via consistent hashing on group_id
  - Typical: 100,000-500,000 messages/sec

Tier 3: Multi-Facility Platform (100+ facilities)
  - Regional MQTT broker clusters
  - Edge gateways connect to nearest regional cluster
  - Cross-region message bridging for commands and configuration
  - Typical: 1,000,000+ messages/sec aggregate

Connection Scaling:
  - Each broker node: ~50,000 concurrent connections
  - Session state stored in distributed cache for failover
  - Client ID based on gateway UUID for deterministic routing
  - Shared subscription groups for consumer scaling
```

### 1.3 Time-Series Database Scaling

```
TSDB Scaling Architecture:

Dimension 1: Write Throughput (horizontal)
  - Shard by measurement_point_id hash
  - Each shard handles ~500K writes/sec
  - Add shards to increase aggregate write throughput
  - 10 shards = 5M writes/sec capacity

Dimension 2: Query Throughput (read replicas)
  - Async replication to read replicas per shard
  - Dashboard queries hit read replicas
  - Alerting reads from primary (freshest data)
  - Typically 2-3 read replicas per shard

Dimension 3: Storage Capacity (tiered)
  - Hot tier (SSD): Last 90 days raw data (~18 TB)
  - Warm tier (HDD): 2-year aggregated data (~5 TB)
  - Cold tier (object storage): 10-year archive (~3 TB)
  - Automatic data movement based on retention policies

Dimension 4: Multi-Site Isolation
  - Each facility can have dedicated TSDB instance
  - Cross-facility queries federated via query router
  - Prevents one facility's load from impacting another
```

### 1.4 Stream Processing Scaling

```
Stream Processing Consumer Groups:

Consumer Group: telemetry-writer
  - Partitions: 100 (one per facility for large deployments)
  - Consumers: 100 (one per partition)
  - Purpose: Write telemetry to TSDB
  - Scaling: Add partitions and consumers for new facilities

Consumer Group: alert-evaluator
  - Partitions: 100 (matched to facilities)
  - Consumers: 100
  - Purpose: Evaluate alert rules against incoming telemetry
  - Scaling: Can over-partition for hot facilities (10 partitions per facility)

Consumer Group: twin-sync
  - Partitions: 1000 (one per 10 equipment twins)
  - Consumers: 200 (each consumer handles ~5 partitions)
  - Purpose: Update digital twin state
  - Scaling: Linear with number of active twins

Consumer Group: backfill-processor
  - Partitions: 20 (shared across all facilities)
  - Consumers: 20
  - Purpose: Handle store-and-forward buffer replays
  - Scaling: Surge during network restoration events
```

### 1.5 Edge Layer Scaling

```
Edge Scaling Dimensions:

Per-Gateway Vertical Scaling:
  - Entry-level gateway: 200 sensors, 500 pts/sec
  - Mid-range gateway: 1,000 sensors, 2,500 pts/sec
  - High-performance gateway: 5,000 sensors, 25,000 pts/sec
  - Select gateway tier based on facility zone requirements

Per-Facility Horizontal Scaling:
  - Add gateways to cover more sensors/equipment
  - Typical: 1 gateway per 200-500 sensors
  - Large facility: 200-500 gateways
  - Gateway mesh network for edge-to-edge communication

Cross-Facility Scaling:
  - Each facility is independently managed
  - Cloud-based gateway fleet management
  - OTA updates rolled out facility-by-facility
  - Template-based provisioning for consistent configuration
```

---

## 2. Fault Tolerance and Resilience

### 2.1 Edge-Cloud Resilience Architecture

The fundamental resilience principle: **the edge is autonomous; the cloud is additive**. Edge gateways must continue local operations indefinitely during cloud disconnection.

```
Disconnection Resilience Matrix:

┌─────────────────────┬───────────────┬──────────────────────┐
│ Scenario            │ Edge Behavior │ Cloud Behavior       │
├─────────────────────┼───────────────┼──────────────────────┤
│ Cloud connected     │ Stream data   │ Real-time processing │
│ (normal)            │ to cloud      │ + analytics          │
├─────────────────────┼───────────────┼──────────────────────┤
│ Cloud disconnected  │ Buffer data   │ Mark facility as     │
│ (network outage)    │ locally,      │ "DISCONNECTED" on    │
│                     │ continue      │ dashboard; show last  │
│                     │ local rules   │ known values with     │
│                     │ and alerts    │ staleness indicator   │
├─────────────────────┼───────────────┼──────────────────────┤
│ Cloud reconnected   │ Drain buffer  │ Process backfill,    │
│ (recovery)          │ + resume      │ suppress old alerts, │
│                     │ real-time     │ reconcile twin state │
├─────────────────────┼───────────────┼──────────────────────┤
│ Edge gateway crash  │ Watchdog      │ Detect death via     │
│                     │ restarts      │ Sparkplug NDEATH;    │
│                     │ runtime in    │ alert operators;     │
│                     │ < 30 seconds  │ mark sensors STALE   │
├─────────────────────┼───────────────┼──────────────────────┤
│ Edge gateway        │ N/A (dead)    │ Failover to backup   │
│ hardware failure    │               │ gateway if deployed; │
│                     │               │ otherwise alert for  │
│                     │               │ physical replacement │
└─────────────────────┴───────────────┴──────────────────────┘
```

### 2.2 MQTT Broker High Availability

```
MQTT Broker HA Architecture:

Active-Active Cluster (3+ nodes):
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Broker 1 │◄─┤ Broker 2 │◄─┤ Broker 3 │
  │ (Active) │──►(Active)  │──►(Active)  │
  └─────┬────┘  └─────┬────┘  └─────┬────┘
        │              │              │
   ┌────┴──────────────┴──────────────┴────┐
   │        Shared Session Store           │
   │     (Distributed Cache Cluster)       │
   └───────────────────────────────────────┘

Failover Process:
  1. Edge gateway connects to broker via DNS-based load balancing
  2. Session state (subscriptions, QoS state, inflight messages)
     stored in distributed cache external to broker
  3. If broker node fails:
     a. Load balancer detects unhealthy node (< 5 seconds)
     b. Edge gateways reconnect to healthy broker node
     c. New broker loads session state from distributed cache
     d. Gateway publishes BIRTH certificate to re-establish state
     e. Resume data flow with no message loss (QoS 1/2 messages
        retransmitted from edge gateway's local outbox)
  4. Total failover time: < 30 seconds
  5. During failover: edge gateways buffer locally (no data loss)

Split-Brain Prevention:
  - Broker cluster uses Raft consensus for leader election
  - Minimum 3 nodes required for quorum
  - If a broker is partitioned from the cluster:
    → It continues serving connected gateways (read-only)
    → It stops accepting new connections
    → It stops processing commands (writes)
    → When partition heals, it rejoins cluster and reconciles state
```

### 2.3 Time-Series Database Resilience

```
TSDB Resilience Strategy:

Write Path Protection:
  1. Write-Ahead Log (WAL) on each TSDB node
     - Every write committed to WAL before acknowledgment
     - WAL replayed on crash recovery
     - WAL backed up to object storage every 5 minutes

  2. Synchronous Replication
     - Each shard has 1 primary + 2 replicas
     - Write acknowledged after primary + 1 replica confirm
     - Third replica is async (for read scaling)

  3. Cross-Region Replication
     - Async replication to DR region (< 30 second lag)
     - DR region can serve read queries during primary outage
     - Manual failover to DR region (avoid split-brain)

Data Durability:
  - WAL: protects against process crash (recover in seconds)
  - Replication: protects against node failure (automatic failover)
  - Backup: protects against cluster failure (restore from backup)
  - Object storage archive: protects against regional disaster

Recovery Time Objectives:
  - Node failure: < 30 seconds (automatic failover to replica)
  - Cluster failure: < 15 minutes (restore from latest backup)
  - Regional failure: < 1 hour (promote DR replicas to primary)
```

### 2.4 Alert Engine Resilience

```
Alert Engine HA:

Active-Passive per Facility:
  - Primary alert engine instance processes facility's alarms
  - Standby instance maintains warm state (loaded rules, cached topology)
  - Heartbeat between primary and standby every 2 seconds
  - If primary fails: standby promotes in < 10 seconds

State Recovery:
  - Alarm state (ACTIVE/ACKNOWLEDGED/etc.) persisted to database
  - On failover: standby loads alarm state from database
  - Reprocesses last 60 seconds of telemetry to catch up on state changes
  - May produce duplicate alarm notifications (idempotent notification delivery)

Zero-Downtime Rule Updates:
  - New rules deployed to standby first
  - Standby validates rules against test data
  - If validation passes: swap active/standby (rolling update)
  - If validation fails: alert engineering team; keep current rules active
```

---

## 3. Disaster Recovery

### 3.1 DR Architecture

```
DR Strategy: Active-Passive with Edge Autonomy

                    Primary Region              DR Region
                    ┌──────────────┐          ┌──────────────┐
                    │ Full Platform │          │ Warm Standby │
                    │ Processing   │──async──►│ Replicated   │
                    │              │  repl.   │ Data Only    │
                    └──────┬───────┘          └──────┬───────┘
                           │                         │
                    ┌──────┴───────┐          ┌──────┴───────┐
                    │ Edge Layer   │          │ (not connected│
                    │ (autonomous) │          │  during normal│
                    │              │          │  operation)   │
                    └──────────────┘          └──────────────┘

During Primary Region Failure:
  1. Edge gateways detect cloud disconnection
  2. Edge gateways switch to store-and-forward mode
  3. DNS failover redirects new connections to DR region (< 5 min)
  4. DR region promotes replicated databases to primary
  5. Edge gateways reconnect to DR region
  6. Buffered data drained to DR region
  7. Processing resumes in DR region

  RTO: < 30 minutes (automated failover)
  RPO: < 30 seconds (async replication lag)
  Edge data loss: Zero (edge buffers bridge the gap)
```

### 3.2 Recovery Procedures

| Failure Type | Detection | Recovery | RTO | RPO |
|---|---|---|---|---|
| **Single edge gateway** | Sparkplug NDEATH | Auto-restart; manual replacement if hardware | < 30s (restart) / hours (replacement) | Zero (local buffer) |
| **Facility network outage** | No heartbeat from all gateways at site | Wait for network recovery; edge buffers data | Depends on network | Zero (edge buffer) |
| **MQTT broker node** | Health check failure | Automatic failover to cluster peer | < 30s | Zero (QoS + edge buffer) |
| **TSDB shard failure** | Replication lag / health check | Automatic promotion of replica | < 30s | Zero (sync replication) |
| **Stream processing failure** | Consumer lag > threshold | Restart consumer; replay from last committed offset | < 2 min | Zero (event stream replay) |
| **Full cloud region failure** | Multi-service health check | Failover to DR region; edge buffers bridge gap | < 30 min | < 30s |
| **Data corruption** | Checksum validation failure | Restore from point-in-time backup | < 4 hours | Depends on backup frequency |

### 3.3 Backup Strategy

```
Backup Tiers:

Time-Series Data:
  - Continuous WAL backup to object storage (5-minute RPO)
  - Daily full snapshot of each TSDB shard
  - Cross-region replication for DR
  - Retention: 30 days of daily backups, 12 months of weekly, 7 years of monthly

Asset and Configuration Data:
  - Continuous replication to DR region
  - Hourly snapshots to object storage
  - Version-controlled configuration (git-like history)
  - Retention: 90 days of hourly, then daily for 2 years

Edge Gateway Configuration:
  - Configuration backed up to cloud on every change
  - Edge gateway stores local backup on secondary storage
  - Configuration can be restored from cloud or local backup
  - Provisioning templates stored in version control

ML Models:
  - Model registry with version history
  - Model artifacts stored in object storage with checksums
  - Training data preserved in data lake
  - Ability to retrain from historical data if models are lost
```

---

## 4. Performance Optimization

### 4.1 Data Compression Optimization

```
Compression Strategy by Data Type:

Sensor Values (doubles):
  - Gorilla compression (Facebook/Meta): XOR with previous value
  - Typical IIoT compression ratio: 8-12x
  - Why it works: sensor values change slowly; XOR produces mostly zeros
  - Example: temperature readings [87.3, 87.3, 87.4, 87.4, 87.5]
    Raw: 5 × 8 bytes = 40 bytes
    Gorilla: 8 + 4 × 1.5 bytes ≈ 14 bytes (3x compression on this small sample)
    At scale with longer runs: 8-12x compression

Timestamps (microsecond precision):
  - Delta-of-delta encoding
  - Regular intervals (e.g., every 1000ms) → delta is constant → delta-of-delta is 0
  - Encodes as single bit per timestamp for regular data
  - Example: [1000, 2000, 3000, 4001, 5000]
    Deltas: [1000, 1000, 1001, 999]
    Delta-of-deltas: [0, 1, -2]
    Encoding: 1 bit, 8 bits, 8 bits = 17 bits vs. 4 × 64 bits raw

Quality Codes (smallint):
  - Run-length encoding
  - Quality is typically "GOOD" for 99%+ of data
  - Long runs of identical quality → near-zero storage
  - Example: [GOOD × 1000, BAD × 3, GOOD × 5000]
    RLE: [(GOOD, 1000), (BAD, 3), (GOOD, 5000)] = 3 entries vs. 6003
```

### 4.2 Network Bandwidth Optimization

```
Edge-to-Cloud Bandwidth Optimization:

1. Report-by-Exception (Sparkplug B):
   - Only transmit changed values (deadband filtering)
   - Reduction: 100-1000x for stable measurements
   - Configurable per-tag deadband

2. Protobuf Serialization:
   - Binary encoding vs. JSON text
   - Sparkplug B uses protobuf natively
   - Reduction: 3-5x vs. JSON

3. Metric Aliasing:
   - BIRTH message establishes name→alias mapping
   - DATA messages use 8-byte alias instead of full tag name string
   - Reduction: 50-100 bytes saved per metric per message

4. Batch Publishing:
   - Combine multiple metric updates into single MQTT message
   - Reduces MQTT overhead (fixed header per message)
   - Typical batch: 10-100 metrics per PUBLISH

5. Historical Data Compression:
   - Store-and-forward buffer uses columnar compression
   - Reduces buffer storage requirements by 5-10x
   - Enables longer buffer retention on same hardware

Combined Effect:
  Without optimization: 500 sensors × 1 sample/sec × 100 bytes = 50 KB/sec = 4.3 GB/day
  With all optimizations: ~500 bytes/sec = 43 MB/day
  Reduction: ~100x
```

### 4.3 Query Performance Optimization

```
Dashboard Query Optimization:

Problem: Operator dashboard shows 200 values updating every 2 seconds
         with 100 concurrent operators = 10,000 queries/sec

Solution: Current Value Cache + WebSocket Push

  1. Current Value Cache:
     - In-memory cache of latest value per measurement point
     - Updated by stream processor on every new data point
     - Read latency: < 1ms (memory access)
     - No TSDB query required for "current value" display

  2. WebSocket Push:
     - Operators subscribe to measurement points of interest
     - Server pushes updates when cached values change
     - No polling required
     - Reduces queries from 10,000/sec to ~500/sec (only actual changes)

  3. Aggregation Pre-computation:
     - Hourly, daily, weekly, monthly aggregations pre-computed
     - Dashboard "24-hour trend" reads from 1-minute aggregations (1440 points)
     - Not from raw data (86,400+ points)
     - 60x query speedup

  4. Query Result Caching:
     - Identical queries from multiple operators served from cache
     - Cache invalidation on new data arrival
     - TTL: 5 seconds for near-real-time, 60 seconds for trends
```

---

## 5. Capacity Planning

### 5.1 Growth Model

```
Growth Projections (3-year horizon):

Year 1 (Launch):
  - Facilities: 10
  - Sensors: 1,000,000
  - Data points/day: 8 billion
  - Peak ingestion: 500K pts/sec
  - TSDB storage: 73 TB/year
  - Edge gateways: 2,000

Year 2 (Growth):
  - Facilities: 50
  - Sensors: 5,000,000
  - Data points/day: 40 billion
  - Peak ingestion: 2.5M pts/sec
  - TSDB storage: 365 TB/year (cumulative: 438 TB)
  - Edge gateways: 10,000

Year 3 (Scale):
  - Facilities: 200
  - Sensors: 20,000,000
  - Data points/day: 160 billion
  - Peak ingestion: 10M pts/sec
  - TSDB storage: 1.46 PB/year (cumulative: 1.9 PB)
  - Edge gateways: 40,000

Scaling Triggers:
  - Add TSDB shards when write latency p99 > 50ms
  - Add MQTT brokers when connection count > 40K per node
  - Add stream processing consumers when consumer lag > 30 seconds
  - Add alert engine instances when evaluation latency > 2 seconds
```

### 5.2 Cost Optimization Strategies

```
Cost Optimization Levers:

1. Tiered Storage (saves 80-90% of storage costs):
   - Hot (SSD): $0.10/GB/month → 90 days of raw data
   - Warm (HDD): $0.03/GB/month → 2 years of aggregated data
   - Cold (object): $0.004/GB/month → 10+ years of archive
   - At 1 PB/year: tiered approach costs ~$50K/month vs. ~$100K/month all-SSD

2. Report-by-Exception (saves 90%+ of bandwidth and processing):
   - Fewer data points = less ingestion compute, less storage, less bandwidth
   - Tuning deadbands per sensor type is the single highest-ROI optimization

3. Edge Pre-processing (saves cloud compute):
   - Filter noise at edge instead of ingesting and filtering in cloud
   - Calculate derived values at edge (fewer cloud computations)
   - Local alert evaluation avoids cloud processing for 99% of evaluations
     (only triggered alerts reach cloud)

4. Aggregation-Based Queries (saves TSDB compute):
   - Pre-computed aggregations serve 90% of dashboard queries
   - Avoids scanning raw data for common time ranges
   - 60-360x fewer data points to process per query
```

---

*Next: [Security & Compliance ->](./06-security-and-compliance.md)*
