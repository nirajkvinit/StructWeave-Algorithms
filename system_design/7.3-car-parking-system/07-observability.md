# Observability

## Key Metrics

### Gate Metrics (Highest Priority)

| Metric | Type | Description | Target |
|--------|------|-------------|--------|
| `gate.open.latency` | Histogram | Time from scan/request to gate open command | p99 < 2s |
| `gate.open.success_rate` | Gauge | Percentage of gate open attempts that succeed | > 99.99% |
| `gate.event.total` | Counter | Total entry/exit events per gate, per lot | Monitoring |
| `gate.offline.duration` | Gauge | Duration of current offline period per gate | Alert if > 5 min |
| `gate.offline.events` | Counter | Number of events processed in offline mode | Reconciliation tracking |
| `gate.controller.heartbeat` | Gauge | Time since last heartbeat from gate controller | Alert if > 60s |
| `gate.failover.count` | Counter | Number of primary-to-standby failovers | Reliability tracking |

### Slot & Availability Metrics

| Metric | Type | Description | Target |
|--------|------|-------------|--------|
| `lot.occupancy_rate` | Gauge | Current occupancy percentage per lot | Operational |
| `lot.availability.by_type` | Gauge | Available spots by type per lot | Display board driver |
| `slot.status_change.latency` | Histogram | Time from sensor event to Redis update | p95 < 1s |
| `slot.display_update.latency` | Histogram | End-to-end sensor to display board update | p95 < 3s |
| `slot.sensor.accuracy` | Gauge | Sensor reading accuracy (vs gate event cross-validation) | > 98% |
| `slot.mismatch.count` | Counter | Sensor-gate event mismatches per lot per hour | Alert if > 5% |

### Booking Metrics

| Metric | Type | Description | Target |
|--------|------|-------------|--------|
| `booking.create.latency` | Histogram | Time to confirm a reservation | p95 < 500ms |
| `booking.create.success_rate` | Gauge | Booking success rate (vs attempts) | > 95% |
| `booking.conflict.rate` | Gauge | Optimistic lock conflicts per minute | Monitor; alert if sustained > 10/min |
| `booking.noshow.rate` | Gauge | No-show percentage per lot | Operational analytics |
| `booking.cancellation.rate` | Gauge | Cancellation percentage per lot | Operational analytics |
| `booking.utilization` | Gauge | Percentage of booked time actually used | Revenue optimization |

### Payment Metrics

| Metric | Type | Description | Target |
|--------|------|-------------|--------|
| `payment.process.latency` | Histogram | Payment processing time | p95 < 2s |
| `payment.success_rate` | Gauge | Payment success rate | > 99.5% |
| `payment.deferred.count` | Counter | Payments deferred due to service unavailability | Alert if > 0 |
| `payment.revenue.hourly` | Gauge | Revenue per lot per hour | Analytics |
| `payment.refund.rate` | Gauge | Refund percentage | Alert if > 5% |

### ANPR Metrics

| Metric | Type | Description | Target |
|--------|------|-------------|--------|
| `anpr.recognition.latency` | Histogram | Time to extract plate from image | p99 < 1s |
| `anpr.recognition.accuracy` | Gauge | Percentage of plates correctly recognized | > 99% |
| `anpr.low_confidence.rate` | Gauge | Percentage of reads below confidence threshold | Alert if > 5% |
| `anpr.camera.health` | Gauge | Camera status (online/offline/degraded) | Alert on offline |

---

## IoT Telemetry

### Gate Controller Telemetry

```
// Sent every 30 seconds from each gate controller
{
    "controller_id": "gc-001",
    "gate_id": "gate-A1",
    "lot_id": "lot-42",
    "timestamp": "2026-03-08T10:30:00Z",
    "status": "ONLINE",           // ONLINE | OFFLINE | DEGRADED
    "mode": "CONNECTED",          // CONNECTED | OFFLINE_MODE
    "uptime_seconds": 1234567,
    "cpu_usage_pct": 12.5,
    "memory_usage_pct": 45.2,
    "disk_usage_pct": 22.1,
    "local_cache": {
        "bookings_cached": 234,
        "permits_cached": 89,
        "offline_events_pending": 0,
        "last_sync": "2026-03-08T10:29:30Z"
    },
    "gate_hardware": {
        "barrier_position": "CLOSED",   // OPEN | CLOSED | STUCK
        "barrier_cycles": 45678,        // total open/close cycles (maintenance indicator)
        "ticket_printer": "OK",         // OK | LOW_PAPER | JAMMED | OFFLINE
        "anpr_camera": "OK",            // OK | DEGRADED | OFFLINE
        "kiosk_display": "OK"           // OK | OFFLINE
    },
    "network": {
        "cloud_latency_ms": 45,
        "iot_hub_connected": true,
        "last_cloud_response_ms": 120
    }
}
```

### Sensor Health Telemetry

```
// Aggregated per floor, sent every 5 minutes
{
    "lot_id": "lot-42",
    "floor_id": "floor-B2",
    "timestamp": "2026-03-08T10:30:00Z",
    "sensors": {
        "total": 250,
        "healthy": 245,
        "unhealthy": 3,
        "offline": 2,
        "unhealthy_ids": ["sensor-B2-042", "sensor-B2-118", "sensor-B2-199"],
        "offline_ids": ["sensor-B2-073", "sensor-B2-156"]
    },
    "state_changes_last_5min": 34,
    "false_positive_rate": 0.02
}
```

---

## Alerting Rules

### Critical Alerts (Page Immediately)

| Alert | Condition | Action |
|-------|-----------|--------|
| **Gate failure** | `gate.open.success_rate` < 99.9% for 2 minutes | Page on-call; gate may be physically blocking vehicles |
| **Gate stuck open** | Gate barrier position = OPEN for > 5 minutes with no active entry/exit | Page on-call; security risk |
| **Gate controller unreachable** | No heartbeat for > 5 minutes | Page on-call; controller may have failed |
| **Payment service down** | `payment.success_rate` < 95% for 3 minutes | Page on-call; exit gates affected |
| **Database primary down** | Shard primary unreachable | Page on-call; affects all lots on shard |

### Warning Alerts (Notify Lot Manager)

| Alert | Condition | Action |
|-------|-----------|--------|
| **Gate offline mode** | Gate operating in offline mode for > 1 minute | Notify lot manager; check network |
| **Sensor failure rate** | > 5% of sensors on a floor are unhealthy | Notify maintenance team |
| **Ticket printer issue** | Printer status = LOW_PAPER or JAMMED | Notify lot attendant |
| **ANPR degradation** | `anpr.low_confidence.rate` > 5% | Notify maintenance; camera may need cleaning |
| **High occupancy** | Lot occupancy > 95% | Notify lot manager; may need to close entry |
| **Lot approaching capacity** | Available spots < 5% for any spot type | Update external availability display to show FULL |

### Informational Alerts (Dashboard Only)

| Alert | Condition | Purpose |
|-------|-----------|---------|
| **Booking conflict spike** | `booking.conflict.rate` > 5/min for 10 minutes | May indicate popular lot; consider capacity increase |
| **Revenue anomaly** | Revenue deviation > 30% from same-day-last-week | May indicate pricing issue or special event |
| **No-show rate high** | `booking.noshow.rate` > 20% for a lot | May need to adjust no-show policy or overbooking strategy |

---

## Logging Strategy

### Structured Log Levels

| Level | Usage | Examples |
|-------|-------|---------|
| **ERROR** | Failures that impact operations | Gate open command failed; payment processing error; database write failure |
| **WARN** | Degraded operations | Sensor offline; ANPR low confidence; gate in offline mode |
| **INFO** | Normal business events | Entry event; exit event; booking created; payment processed |
| **DEBUG** | Detailed operational data | Sensor raw readings; cache sync details; pricing calculation breakdown |

### Log Retention

| Log Type | Hot Storage | Warm Storage | Cold Archive |
|----------|------------|-------------|-------------|
| Gate events | 7 days | 90 days | 7 years |
| Application logs | 7 days | 30 days | 1 year |
| Sensor telemetry | 24 hours | 7 days | 90 days |
| Security/audit logs | 30 days | 1 year | 7 years |

---

## Distributed Tracing

### Trace Context Propagation

Every gate event generates a trace ID that follows the request through all services:

```
Trace ID: abc-123
├─ Span: Gate Controller → IoT Hub (50ms)
├─ Span: IoT Hub → Gate Service (30ms)
├─ Span: Gate Service → Booking Service (validate) (80ms)
│   └─ Span: Booking Service → PostgreSQL (query) (15ms)
├─ Span: Gate Service → Slot Service (mark occupied) (40ms)
│   ├─ Span: Slot Service → PostgreSQL (update) (10ms)
│   └─ Span: Slot Service → Redis (update bitmap) (2ms)
├─ Span: Gate Service → IoT Hub (open command) (20ms)
└─ Span: Notification Service → Push notification (100ms)

Total gate-open latency: 320ms
```

### Key Trace Paths

| Flow | Spans | Latency Budget |
|------|-------|---------------|
| Pre-booked entry (QR) | Gate → IoT Hub → Gate Service → Booking Service → Slot Service → Gate open | < 2s |
| Walk-in entry (ticket) | Gate → IoT Hub → Gate Service → Slot Service → Gate open | < 1.5s |
| Permit entry (ANPR) | Gate → IoT Hub → Vehicle Service (ANPR) → Permit Service → Gate open | < 2s |
| Exit with payment | Gate → IoT Hub → Pricing Service → Payment Service → Gate open | < 5s (includes payment) |
| Sensor → Display | Sensor → IoT Hub → Event Processor → Slot Service → Redis → WebSocket → Display | < 3s |

---

## Dashboards

### Operational Dashboard (Lot Manager)

```
┌─────────────────────────────────────────────────────────────┐
│  Lot: Downtown Garage A          Status: ● OPERATIONAL      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Occupancy: ████████████████░░░░  78% (390/500)            │
│                                                             │
│  By Type:                                                   │
│    Compact:     ██████████████░░  87% (174/200)            │
│    Regular:     ███████████░░░░░  72% (144/200)            │
│    Handicapped: █████░░░░░░░░░░░  50% (10/20)             │
│    EV:          ███████████████░  93% (28/30)              │
│    Motorcycle:  ████████░░░░░░░░  68% (34/50)             │
│                                                             │
│  Gates:                                                     │
│    Entry A: ● Online  |  Entry B: ● Online                 │
│    Exit A:  ● Online  |  Exit B:  ● Online                 │
│                                                             │
│  Today's Revenue: $4,832    Avg Duration: 2.4 hrs          │
│  Active Bookings: 45        Active Permits: 89             │
│                                                             │
│  [Occupancy Heatmap by Floor]  [Revenue by Hour Chart]     │
└─────────────────────────────────────────────────────────────┘
```

### Corporate Dashboard (Multi-Lot)

```
┌─────────────────────────────────────────────────────────────┐
│  Corporate Overview: Metro Parking Inc.    Lots: 47         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Overall Occupancy: 72%          Revenue Today: $142,500    │
│  Gate Health: 94/94 online       Alerts: 2 warnings         │
│                                                             │
│  Top 5 Lots by Occupancy:                                   │
│    1. Airport Lot A      96%    $12,400                     │
│    2. Downtown Garage     92%    $8,200                     │
│    3. Stadium Lot         89%    $6,100                     │
│    4. Mall Parking        78%    $4,800                     │
│    5. Hospital Garage     75%    $3,900                     │
│                                                             │
│  [City Map with Lot Pins + Occupancy Colors]                │
│  [Revenue Trend: Last 30 Days]                              │
│  [Peak Hour Heatmap: All Lots]                              │
└─────────────────────────────────────────────────────────────┘
```

### IoT Health Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  IoT Fleet Health                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Gate Controllers: 94/94 online (100%)                      │
│  Sensors: 23,847/24,000 healthy (99.4%)                    │
│  ANPR Cameras: 93/94 online (98.9%)                        │
│  Display Boards: 188/190 online (98.9%)                    │
│                                                             │
│  Unhealthy Sensors by Lot:                                  │
│    Airport Lot A: 42 unhealthy (Floor 3)                   │
│    Downtown Garage: 18 unhealthy (Floor B2)                │
│    Mall Parking: 93 unhealthy (Outdoor Zone C)             │
│                                                             │
│  [Sensor Health Trend: Last 7 Days]                        │
│  [Gate Controller Uptime: Last 30 Days]                    │
│  [ANPR Accuracy Trend]                                      │
└─────────────────────────────────────────────────────────────┘
```
