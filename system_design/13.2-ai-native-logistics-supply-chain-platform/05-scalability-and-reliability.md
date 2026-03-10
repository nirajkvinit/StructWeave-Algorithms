# 13.2 AI-Native Logistics & Supply Chain Platform — Scalability & Reliability

## Horizontal Scaling Architecture

### Stateless Services and Their Scaling Axes

Every service in the platform is designed to be stateless at the request level; all durable state is pushed to dedicated data stores. This enables independent horizontal scaling of each service based on its specific bottleneck (CPU, GPU, I/O, memory).

| Service | Scaling Axis | State Location |
|---|---|---|
| Telemetry Ingestion Gateway | Partition count (I/O-bound) | No local state; writes to stream partitions |
| Shipment Event Processor | Consumer group size (CPU-bound) | Per-shipment state in shipment DB |
| Route Optimization Engine | Instance count (CPU-bound, memory-heavy) | In-memory solver state checkpointed to persistent store |
| Demand Forecasting Service | Worker count (CPU-bound, batch) | Forecasts written to forecast store |
| Warehouse Orchestrator | Per-warehouse instance (memory-bound) | Digital twin in-memory; checkpointed to persistent store |
| Fleet Management Service | Replica count (CPU-bound) | Aggregated features in time-series store |
| Last-Mile Delivery Optimizer | Instance count per region (CPU-bound) | Route state in regional route store |
| ETA Prediction Engine | Replica count (CPU-bound) | Stateless inference; reads from telemetry and feature stores |
| Visibility Service | Read replica count (I/O-bound) | Reads from shipment DB and event store |

### Telemetry Ingestion Scaling

At 200,000 GPS pings per second (peak), the ingestion pipeline is the highest-throughput component. Scaling strategy:

```
Stream partitioning:
  Partition key: shipment_id (ensures per-shipment ordering)
  Partition count: 1,000 partitions
  Per partition: ~200 events/sec (well within single-consumer throughput)

Consumer scaling:
  1 consumer per partition = 1,000 consumer instances
  Each consumer: normalize event, enrich with shipment context, write to time-series store
  Processing latency per event: ~5 ms
  Throughput per consumer: ~200 events/sec (matches partition rate)

Back-pressure handling:
  If consumer falls behind: increase partition count (split by sub-range of shipment_id)
  Consumer lag monitored per partition; alert if lag exceeds 30 seconds
  Burst buffer: stream retention set to 24 hours; consumers can catch up after transient spike
```

### Route Optimization Scaling

Route optimization instances are CPU-intensive and memory-heavy (in-memory solution state). They cannot be trivially replicated because each depot's solver state is stateful.

```
Scaling design:
  1 solver instance per depot (stateful affinity)
  50,000 depots → 50,000 solver instances

  But: not all depots are active simultaneously
  Active at any given time: ~5,000 depots (others in off-hours)
  Instance pooling: idle solver instances release memory; re-hydrate from checkpoint on demand

  Peak morning planning (6-8 AM local time):
  Time zone staggering distributes load: US East peaks at 11:00 UTC, US West at 14:00 UTC,
  EU at 05:00 UTC, Asia at 22:00 UTC → global peak is ~2x average, not 5x

  Compute provisioning:
  5,000 active solvers × 4 CPU cores = 20,000 cores
  With 2x headroom: 40,000 cores reserved for route optimization
  Managed container service with auto-scaling based on active solver count
```

### Demand Forecasting Scaling

The forecast pipeline is batch-oriented (runs daily) but must complete within a 4-hour window. Scaling is achieved through horizontal worker parallelism:

```
Pipeline parallelism:
  10M SKU-location combinations / 100 workers = 100,000 per worker
  Per-SKU inference: ~10 ms → per worker: ~1,000 seconds (~17 minutes)

  Reconciliation parallelism:
  Each product hierarchy tree is independent → reconcile in parallel
  Typical: 500 independent hierarchy trees × 20 workers = 25 trees per worker
  Per tree reconciliation: ~60 seconds
  Total reconciliation: ~25 minutes

  End-to-end pipeline: 17 min (inference) + 25 min (reconciliation) + 5 min (overhead) = ~47 min
  Well within 4-hour SLO; 5x headroom for SKU growth
```

---

## Geo-Distributed Architecture

### Regional Deployment Model

The platform is deployed in regional clusters aligned with logistics operating regions. Each region handles its own telemetry processing, route optimization, and warehouse operations independently. Cross-region coordination handles only multi-leg shipments that traverse regions.

```
Regional clusters:
  Americas: US-East, US-West, Brazil
  Europe: EU-West, EU-Central, UK
  Asia-Pacific: Singapore, Japan, Australia

Per-region components:
  - Telemetry ingestion and stream processing (local data sovereignty)
  - Route optimization engine (depot affinity within region)
  - Warehouse orchestrators (warehouse affinity within region)
  - ETA prediction (regional model variants trained on local traffic patterns)
  - Visibility service (regional read replicas with cross-region federation)

Cross-region components (globally shared):
  - Demand forecasting (centralized for hierarchy reconciliation across regions)
  - Carrier connector hub (centralized carrier API integrations)
  - Customer tracking portal (CDN-backed, served from nearest edge)
```

### Cross-Region Shipment Visibility

A shipment from Shanghai to Chicago traverses APAC, crosses the Pacific (ocean), and enters the Americas region. The visibility service must stitch telemetry from both regions into a unified timeline:

```
Cross-region visibility:
  Each region's event processor writes events to a global event bus (async replication)
  The visibility service in the destination region assembles the full timeline by reading:
    - Local events (Americas legs)
    - Replicated events from origin region (APAC legs)
    - Ocean tracking events (global AIS feed, not region-specific)

  Replication lag: ≤ 5 seconds cross-region (async, eventually consistent)
  Acceptable: shipment timeline is append-only; late-arriving events from another region
  are inserted into the correct chronological position, not appended at the end
```

---

## Reliability Patterns

### Route Engine High Availability

The route optimization engine is the most operationally critical service: if it goes down, new orders cannot be assigned to vehicles, and real-time re-optimization stops. All drivers continue their last-known routes but cannot adapt to changes.

```
HA design:
  Primary-standby per depot:
    Primary solver: processes events and maintains in-memory solution state
    Standby solver: receives checkpointed state every 60 seconds (warm standby)
    Failover time: ~60 seconds (standby hydrates from latest checkpoint)

  Checkpoint storage: replicated across 3 availability zones
  RPO: ≤ 60 seconds (at most 60 seconds of re-optimization lost)
  RTO: ≤ 90 seconds (detection + standby activation + checkpoint load)

  Graceful degradation:
    If both primary and standby are unavailable:
      - Drivers continue executing their last-committed routes
      - New orders are queued (not lost) for processing when solver recovers
      - Manual dispatch fallback UI available for dispatchers
```

### Warehouse Orchestrator Resilience

If the warehouse orchestrator goes down, AMRs stop receiving task assignments. The platform uses a tiered fallback:

```
Tier 1 (normal): Central orchestrator assigns tasks, plans paths, coordinates fleet
Tier 2 (degraded): AMRs fall back to locally cached task queues (last 10 assigned tasks)
  AMRs execute cached tasks in order; no new task assignment until orchestrator recovers
Tier 3 (manual): Human pickers receive task assignments via mobile app from a simplified
  task queue that does not require the orchestrator (direct DB read of pending picks)

Recovery:
  On orchestrator restart, digital twin is rebuilt from:
    - AMR position reports (AMRs continue reporting position even without task assignments)
    - Bin scan events from the past N minutes (warehouse management system)
    - Conveyor status sensors (independent of orchestrator)
  Full digital twin recovery: ≤ 2 minutes
```

### Telemetry Pipeline Durability

No telemetry data may be lost. The pipeline uses at-least-once processing with idempotent writes:

```
Durability chain:
  1. Ingestion gateway writes raw event to durable stream (replicated across 3 AZs)
  2. Stream retention: 7 days (sufficient for any consumer to catch up)
  3. Event processor reads from stream; writes to time-series store with idempotent key
     (shipment_id + timestamp + source = natural idempotency key)
  4. Time-series store replicates synchronously within the AZ cluster

  Duplicate handling:
    GPS trackers may re-send events on connectivity restoration
    Idempotent key prevents duplicate writes to time-series store
    Duplicate events in stream are harmless (consumer skips if already processed)
```

### Cold Chain Compliance Under Connectivity Loss

IoT temperature sensors in refrigerated containers may lose cellular connectivity for hours (metal container walls attenuate RF signals; remote route segments have no coverage). The compliance system must handle gaps:

```
Sensor behavior during disconnection:
  Sensor buffers readings locally (flash storage: ~48 hours of 60-second readings)
  On connectivity restoration: transmits batch of buffered readings

Platform handling:
  Buffered readings ingested with original timestamps (not arrival time)
  Gap detection: if no reading received for > 10 minutes, flag as "connectivity gap"
  Excursion reconstruction: on batch arrival, retroactively detect any temperature excursions
    that occurred during the gap
  Compliance status: if a gap exceeds 30 minutes AND no excursion detected on batch arrival,
    flag as "unverified compliance interval" in the audit trail
```

---

## Surge Handling

### Peak Season (Holiday Shipping)

During peak holiday season (November–December for Western markets; Singles' Day in November for APAC), shipment volume spikes 5–10x across all subsystems:

| Subsystem | Spike Behavior | Mitigation |
|---|---|---|
| Telemetry Ingestion | 5x event rate | Pre-scale stream partitions 72h before peak; add consumer instances |
| Route Optimization | 3x VRP instances; 5x stops per instance | Pre-warm solver instances; increase time budget from 5s to 8s (accept slight latency increase for better solutions) |
| Warehouse Operations | 10x pick volume; 24/7 operations | Add AMR fleet capacity; extend wave planning to 24h continuous; pre-position high-velocity inventory near staging areas |
| Last-Mile Delivery | 8x deliveries per day | Temporary fleet expansion (gig drivers); widen delivery windows to increase routing flexibility |
| Demand Forecasting | Forecasts must capture holiday surge accurately | Holiday-specific model features (days-to-holiday, promotional calendar); planner override mechanism for unprecedented volume |
| Customer Tracking | 10x tracking page views | CDN-backed static content; pre-rendered tracking pages updated every 5 minutes instead of real-time |

### Disruption Surge (Port Closure, Natural Disaster)

When a major disruption occurs (port closure, hurricane, strike), a large number of shipments require simultaneous re-routing:

```
Disruption handling:
  1. Disruption detected (external feed or anomaly detection)
  2. Affected shipments identified (geofence query against active shipments)
  3. Batch re-optimization triggered for all affected depots simultaneously

  Scale challenge: a major port closure may affect 50,000+ shipments
  Mitigation:
    - Priority-based re-optimization: most time-critical shipments first
    - Pre-computed alternative routes for high-volume lanes (cached contingency plans)
    - Rate-limited re-optimization to prevent solver fleet from being overwhelmed
    - Human dispatcher involvement for shipments where automated re-routing fails
```

---

## Failure Isolation: Bulkhead Design

The platform uses strict bulkhead isolation between subsystems to prevent cascading failures:

- **Route optimization** has a dedicated compute pool separate from telemetry processing; a VRP solver consuming all CPU does not starve event processing
- **Warehouse orchestrators** are per-warehouse instances with no shared state; a failure in one warehouse does not affect others
- **ETA prediction** is stateless and horizontally scaled behind a load balancer; a model inference failure returns the last cached ETA rather than propagating an error
- **Cold chain monitoring** has a dedicated alerting pipeline independent of general shipment visibility; a visibility service outage does not suppress temperature excursion alerts
- **Customer tracking portal** is served from CDN with pre-rendered pages; a backend outage results in stale (but still functional) tracking pages rather than errors

---

## RTO and RPO

| Subsystem | RTO Target | RPO Target |
|---|---|---|
| Telemetry Ingestion | 2 min | 0 (stream buffered in durable storage) |
| Route Optimization | 90 sec | 60 sec (checkpointed every 60s) |
| Warehouse Orchestrator | 2 min | 30 sec (digital twin checkpointed) |
| Demand Forecasting | 30 min (batch job can restart) | 0 (idempotent; re-run produces same result) |
| Shipment Visibility | 5 min | 0 (event-sourced; replay from stream) |
| Cold Chain Monitoring | 30 sec | 0 (sensor readings buffered at sensor level) |
| Customer Tracking | 0 (CDN serves cached pages) | 5 min (pre-rendered page staleness) |
