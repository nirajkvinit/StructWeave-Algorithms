# Scalability & Reliability

## Lot-Level Sharding

Parking data is naturally partitioned by lot. A vehicle's entire lifecycle---entry, parking, payment, exit---occurs within a single lot. This makes `lot_id` the ideal shard key with zero cross-shard transactions for operational flows.

### Sharding Architecture

```
┌──────────────────────────────────────────────────┐
│                  Request Router                   │
│         (lot_id → shard mapping)                 │
└────────────┬──────────┬──────────┬───────────────┘
             │          │          │
     ┌───────▼──┐ ┌─────▼────┐ ┌──▼───────┐
     │ Shard 1  │ │ Shard 2  │ │ Shard N  │
     │ Lots     │ │ Lots     │ │ Lots     │
     │ 1-100    │ │ 101-200  │ │ 9901-10K │
     │          │ │          │ │          │
     │ spots    │ │ spots    │ │ spots    │
     │ bookings │ │ bookings │ │ bookings │
     │ tickets  │ │ tickets  │ │ tickets  │
     │ events   │ │ events   │ │ events   │
     └──────────┘ └──────────┘ └──────────┘
```

### Shard Sizing

```
10,000 lots / 100 shards = 100 lots per shard

Per-shard load:
  100 lots × 4K events/day = 400K events/day per shard
  Peak: 400K / 86,400 × 5 (peak factor) ≈ 23 tx/sec per shard

Per-shard storage:
  100 lots × 100 spots = 10,000 spots
  100 lots × 200 bookings/day × 90 days = 1.8M booking rows
  Estimated: ~5 GB per shard (well within single-node capacity)
```

### Cross-Shard Queries

| Query | Frequency | Handling |
|-------|-----------|----------|
| User's bookings across lots | Low (profile view) | Fan-out query to all shards OR secondary index by `user_id` |
| Corporate analytics (all lots) | Low (daily/weekly reports) | Analytics replica that aggregates across shards via ETL |
| User's vehicle permits across lots | Very low | Fan-out OR permit service maintains a user-indexed copy |

---

## Spot Availability Bitmap Optimization

For real-time availability queries, Redis bitmaps provide O(1) lookups and minimal memory:

### Memory Calculation

```
Per lot (5,000 spots):
  1 bitmap per spot type, assume 6 types:
    COMPACT:      1,500 spots = 1,500 bits = 188 bytes
    REGULAR:      2,000 spots = 2,000 bits = 250 bytes
    HANDICAPPED:    100 spots = 100 bits = 13 bytes
    EV:             200 spots = 200 bits = 25 bytes
    MOTORCYCLE:     200 spots = 200 bits = 25 bytes
    OVERSIZED:    1,000 spots = 1,000 bits = 125 bytes
    ──────────────────────────────────────────────
    Total per lot: 626 bytes

For 10,000 lots:
  10,000 × 626 bytes ≈ 6.1 MB total

Operations:
  BITCOUNT → count available spots: O(N/8) ≈ microseconds
  GETBIT → check specific spot: O(1)
  SETBIT → update spot status: O(1)
```

This is extraordinarily memory-efficient. The entire real-time availability state for 10,000 lots fits in ~6 MB of Redis memory.

### Reservation Time-Window Bitmaps

For availability over time (e.g., "which spots are free Saturday 2-6 PM?"), use interval-based bitmaps:

```
Key: avail:{lot_id}:{spot_type}:{date}:{interval_index}
  interval_index = hour * 2 + (minute >= 30 ? 1 : 0)  // 30-min slots

For 2PM-6PM query (intervals 28-35):
  result = BITOP AND dest
    avail:{lot_id}:REGULAR:2026-03-14:28
    avail:{lot_id}:REGULAR:2026-03-14:29
    avail:{lot_id}:REGULAR:2026-03-14:30
    avail:{lot_id}:REGULAR:2026-03-14:31
    avail:{lot_id}:REGULAR:2026-03-14:32
    avail:{lot_id}:REGULAR:2026-03-14:33
    avail:{lot_id}:REGULAR:2026-03-14:34
    avail:{lot_id}:REGULAR:2026-03-14:35

  BITCOUNT dest → number of spots available for the ENTIRE 4-hour window
```

---

## Redis Cluster Strategy

### Per-Region Deployment

```
Region: US-East
  ├── Redis Cluster (3 primary + 3 replica)
  │   ├── Node 1: Lots 1-3000 (real-time availability)
  │   ├── Node 2: Lots 3001-6000
  │   └── Node 3: Lots 6001-10000
  │
  └── Each node handles:
      - Availability bitmaps (~2 MB)
      - Gate session cache (~500 MB)
      - Lot summary hashes (~100 MB)
      Total: ~700 MB per node (trivial for Redis)
```

### Failover Strategy

- **Primary fails**: Redis Sentinel promotes replica to primary in <30 seconds.
- **During failover**: Gate controllers use local cache. Availability display may show stale data for up to 30 seconds.
- **Data loss on failover**: Bitmaps are reconstructed from PostgreSQL in <5 seconds per lot (read all spot statuses, set bits accordingly).

---

## Multi-Region Strategy

Parking is inherently local---a lot in New York has no real-time interaction with a lot in London. Each region operates independently:

```
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│   US-East Region   │    │   EU-West Region   │    │  APAC Region       │
│                    │    │                    │    │                    │
│ API Gateway        │    │ API Gateway        │    │ API Gateway        │
│ Core Services      │    │ Core Services      │    │ Core Services      │
│ PostgreSQL (shards)│    │ PostgreSQL (shards)│    │ PostgreSQL (shards)│
│ Redis Cluster      │    │ Redis Cluster      │    │ Redis Cluster      │
│ IoT Hub            │    │ IoT Hub            │    │ IoT Hub            │
│                    │    │                    │    │                    │
│ Lots: US lots      │    │ Lots: EU lots      │    │ Lots: APAC lots    │
└──────────┬─────────┘    └──────────┬─────────┘    └──────────┬─────────┘
           │                         │                         │
           └─────────────┬───────────┘─────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  Global Services    │
              │                     │
              │ - User accounts     │
              │ - Corporate admin   │
              │ - Cross-region      │
              │   analytics         │
              │ - Payment gateway   │
              └─────────────────────┘
```

### What's Global vs Regional

| Component | Scope | Rationale |
|-----------|-------|-----------|
| User accounts | Global | Users may book lots in different regions |
| Corporate admin portal | Global | Operator manages lots across regions |
| Lot data + spots | Regional | Lot operations are purely local |
| Bookings + tickets | Regional | Transactions are lot-local |
| Payment processing | Global (with regional routing) | Payment provider may be global |
| ANPR images | Regional | High volume; no cross-region need |
| Analytics | Regional with global aggregation | Operational analytics are local; corporate dashboards aggregate |

---

## Gate High Availability

### Dual Controller Architecture

```
┌─────────────────────────────────────────┐
│               Physical Gate              │
│                                         │
│  ┌─────────────────┐ ┌────────────────┐ │
│  │ Primary         │ │ Standby        │ │
│  │ Controller      │ │ Controller     │ │
│  │                 │ │                │ │
│  │ Active: YES     │ │ Active: NO     │ │
│  │ Heartbeat ─────►│ │◄──── Monitor  │ │
│  │                 │ │                │ │
│  │ Local DB (sync) │ │ Local DB (sync)│ │
│  └────────┬────────┘ └───────┬────────┘ │
│           │                   │          │
│           └────┬──────────────┘          │
│                │                         │
│  ┌─────────────▼───────────────────────┐ │
│  │  Gate Hardware (barrier, sensors)   │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Failover Process

```
1. Primary controller sends heartbeat to standby every 5 seconds
2. Standby monitors heartbeat. If 3 consecutive heartbeats missed (15s):
   a. Standby takes over as primary
   b. Standby activates its connection to IoT Hub
   c. Standby begins processing gate events
   d. Alert sent to lot operator
3. Primary's local event log is replayed from standby's log on recovery
```

### Gate Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Both controllers fail | Gate stuck closed (or open if fail-safe) | Physical override key for lot attendant; remote unlock via admin portal |
| Network outage (both controllers healthy) | Controllers operate in offline mode | Local cache + offline event logging (see Deep Dive 1) |
| Power outage | All systems down | UPS battery backup (4-hour minimum); gates default to open on power loss (fire code compliance) |
| ANPR camera failure | No plate recognition | Fall back to ticket dispensing at entry |
| Sensor failure | Inaccurate spot status | Cross-validate with gate entry/exit counts; alert maintenance |

---

## Disaster Recovery

### Recovery Time Objectives

| Component | RTO | RPO | Strategy |
|-----------|-----|-----|----------|
| Gate controller | 15s (failover to standby) | 0 (local event log) | Dual controller with heartbeat |
| Cloud services | 5 min | 1 min | Multi-AZ deployment with auto-failover |
| PostgreSQL | 5 min | < 1 min (streaming replication) | Primary-replica with automatic promotion |
| Redis | 30s | < 5s (AOF persistence) | Sentinel-managed failover |
| IoT Hub | 2 min | 0 (message queue buffering) | Multi-AZ IoT Hub with queue persistence |

### Gate-Level Recovery

Gates are the most critical component. Their local-first architecture provides inherent disaster recovery:

```
Cloud completely down:
  - Gates continue operating in offline mode
  - Walk-in tickets dispensed locally
  - Cached bookings/permits validated locally
  - All events logged to local storage
  - On cloud recovery: offline events uploaded and reconciled
  - Typical cloud outage impact on gate operations: ZERO

Gate controller replacement:
  - New controller provisioned with lot configuration
  - Pulls bookings + permits from cloud (or from standby controller)
  - Operational within 5 minutes of physical installation
```

---

## Load Testing Strategy

### Test Scenarios

| Scenario | Description | Target Metric |
|----------|-------------|---------------|
| **Rush hour entry** | 100 simultaneous entry events at a single lot over 5 minutes | All gates respond < 2s; zero double-allocations |
| **Booking spike** | 1,000 concurrent booking requests for the same lot and time window | < 1% allocation conflicts; < 500ms p95 confirmation |
| **Sensor flood** | 5,000 sensor state changes in 1 minute for a single lot | Display boards update within 3s; no event loss |
| **Network partition** | Simulate cloud unreachable for 30 minutes | Gates continue operating; events reconciled on reconnect |
| **Multi-lot scale** | 10,000 lots generating concurrent traffic at average rates | System handles 460 tx/sec sustained; < 3s p99 latency |
| **Payment service down** | Payment service returns errors for 10 minutes | Exit gates open (deferred payment); revenue tracked for collection |

### Chaos Engineering

- **Kill a database shard**: Verify that only lots on that shard are affected; other lots continue normally.
- **Network partition a gate controller**: Verify offline mode activation and event reconciliation.
- **Kill Redis primary**: Verify Sentinel failover; availability data briefly stale then recovers.
- **Flood a lot's sensor pipeline**: Verify message queue absorbs burst; no data loss; display board updates may lag but eventually converge.
