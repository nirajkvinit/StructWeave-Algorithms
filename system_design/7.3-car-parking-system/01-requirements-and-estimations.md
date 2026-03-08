# Requirements & Estimations

## Functional Requirements

### Lot Management

| ID | Requirement | Description |
|----|------------|-------------|
| LM1 | Lot CRUD | Create, update, and deactivate parking lots with address, coordinates, operating hours |
| LM2 | Floor & zone management | Define floors, zones, and spot layouts within a lot; assign spot types per zone |
| LM3 | Spot type support | Support spot types: compact, regular, handicapped, EV charging, motorcycle, oversized |
| LM4 | Spot status tracking | Track per-spot status: AVAILABLE, RESERVED, OCCUPIED, OUT_OF_SERVICE |
| LM5 | Multi-lot operations | Manage multiple lots under a single corporate operator with unified dashboard |
| LM6 | Operating hours | Define per-lot operating hours, holiday schedules, and overnight parking rules |

### Entry & Exit

| ID | Requirement | Description |
|----|------------|-------------|
| EE1 | Ticket-based entry (walk-in) | Dispense a physical/digital ticket with timestamp; open gate |
| EE2 | QR-based entry (pre-booked) | Scan QR code from reservation; validate booking; open gate |
| EE3 | ANPR-based entry (permit) | Recognize license plate via camera; match against active permits; open gate |
| EE4 | Exit with payment | Scan ticket/QR at exit → calculate fee → process payment → open gate |
| EE5 | Exit with permit | ANPR match at exit → validate permit → open gate (no payment) |
| EE6 | Lost ticket handling | Look up entry via timestamp + license plate; charge maximum daily rate or verify via ANPR logs |
| EE7 | Gate offline operation | Gates must continue operating during network outages using cached data |

### Reservations

| ID | Requirement | Description |
|----|------------|-------------|
| RS1 | Online reservation | Book a spot for a specific date/time window via mobile app or web portal |
| RS2 | Spot type selection | Reserve by spot type (compact, regular, EV, handicapped) |
| RS3 | Reservation confirmation | Generate QR code for gate entry upon successful reservation |
| RS4 | Cancellation | Cancel reservation with configurable cancellation policy (free before 1 hour) |
| RS5 | Modification | Modify reservation time window (subject to availability) |
| RS6 | No-show handling | Release unredeemed reservation after grace period (30 min past start time) |
| RS7 | Reservation time window | Enforce entry within a configurable window (e.g., 15 min before to 30 min after start time) |

### Pricing & Payment

| ID | Requirement | Description |
|----|------------|-------------|
| PP1 | Hourly pricing | Charge per hour with configurable rates by spot type |
| PP2 | Daily maximum cap | Cap charges at a maximum daily rate regardless of hours parked |
| PP3 | Peak/off-peak pricing | Different rates for peak hours (e.g., 8AM-6PM) vs off-peak |
| PP4 | Event-based surge | Temporary rate increase during events (concerts, sports) |
| PP5 | Payment methods | Accept credit/debit card, mobile wallet, stored payment methods |
| PP6 | Pre-payment on booking | Charge at reservation time or at exit (configurable per lot) |
| PP7 | Receipt generation | Generate digital receipt with entry/exit times, duration, charges |

### Permits

| ID | Requirement | Description |
|----|------------|-------------|
| PM1 | Monthly/annual permits | Issue recurring permits tied to a vehicle and lot (optionally a specific spot) |
| PM2 | Permit validation | Validate permit at entry/exit via ANPR license plate match |
| PM3 | Permit renewal | Auto-renew permits with stored payment method |
| PM4 | Permit transfer | Transfer a permit to a different vehicle (with audit trail) |

### Analytics & Reporting

| ID | Requirement | Description |
|----|------------|-------------|
| AR1 | Occupancy analytics | Real-time and historical occupancy rates by lot, floor, zone |
| AR2 | Revenue reporting | Daily/weekly/monthly revenue by lot, spot type, payment method |
| AR3 | Peak hour analysis | Identify peak usage hours to optimize pricing and staffing |
| AR4 | Utilization reports | Spot utilization rates, average parking duration, turnover rates |

### Out of Scope

- Parking enforcement (meter maids, violation ticketing)
- Traffic signal integration
- Autonomous vehicle self-parking
- Valet vehicle tracking and key management
- Shuttle/transit integration for airport lots
- Street meter management

---

## Non-Functional Requirements

| Requirement | Target | Justification |
|-------------|--------|---------------|
| **Gate Response Latency** | p99 < 2s | Physical barrier---vehicles queue behind a closed gate; delays cause traffic backup |
| **Reservation Confirmation** | p95 < 500ms | User-facing booking flow must feel responsive |
| **Slot Allocation Consistency** | Zero double-allocation | Two vehicles directed to same spot = real-world conflict |
| **Availability** | 99.99% for gate operations (52 min/year) | Gate downtime = physical blockage; vehicles cannot enter or exit |
| **Availability** | 99.9% for reservation service (8.7 hr/year) | Booking can tolerate brief outages; walk-in still works |
| **Sensor-to-Display Latency** | p95 < 3s | Display boards must reflect real-time occupancy for driver guidance |
| **Offline Gate Operation** | Indefinite with degraded features | Gates must open for cached permits/bookings during network outage |
| **Scale** | 10,000 lots, 1M spots, 100K concurrent vehicles | Large operator network across multiple cities |
| **Data Retention** | 90 days for transactions, 30 days for ANPR images, 7 years for financial records | Regulatory and operational requirements |

---

## Capacity Estimations

### Transaction Volume

```
Assumptions:
- 10,000 lots managed by the platform
- Average lot size: 100 spots (range: 20 to 30,000)
- Average occupancy rate: 70%
- Average turnover: 2 vehicles per spot per day

Daily entry/exit events:
  10,000 lots × 100 spots × 2 turnovers × 2 events (entry + exit)
  = 4,000,000 gate events per day (entries + exits)

  Plus reservations, cancellations, payment events:
  ~40,000,000 total transactions per day

Average transactions per second:
  40,000,000 / 86,400 ≈ 460 tx/sec

Peak transactions per second (5× average, rush hour 7-9 AM):
  460 × 5 = 2,300 tx/sec
```

### Sensor Event Volume

```
Assumptions:
- Large lot: 5,000 spots with individual sensors
- Sensor reports on state change (vehicle arrives/departs)
- Average 2 state changes per spot per day
- Sensor heartbeat every 5 minutes (for health monitoring)

State change events per large lot per day:
  5,000 spots × 2 changes = 10,000 events/day

Heartbeat events per large lot per day:
  5,000 sensors × 288 heartbeats (every 5 min) = 1,440,000 events/day

Peak sensor events per second (across all lots with sensors):
  Assuming 2,000 sensor-equipped lots:
  2,000 × (10,000 + 1,440,000) / 86,400 ≈ 33,500 events/sec
```

### Storage Estimations

```
Booking records:
  ~20M bookings/day × 500 bytes = 10 GB/day
  90-day retention = 900 GB

Gate event logs:
  ~40M events/day × 200 bytes = 8 GB/day
  90-day retention = 720 GB

ANPR images:
  ~10M ANPR captures/day × 100 KB avg = 1 TB/day
  30-day retention = 30 TB

Sensor telemetry (heartbeats):
  ~33,500 events/sec × 100 bytes × 86,400 sec = 290 GB/day
  7-day retention in hot storage = 2 TB
  90-day in cold storage = 26 TB

Payment records:
  ~20M payments/day × 300 bytes = 6 GB/day
  7-year retention (regulatory) = 15 TB

Total active storage: ~50 TB
Total archive storage: ~20 TB
```

### Bandwidth Estimations

```
Gate controller communication:
  Each gate: ~10 KB/event × 200 events/day = 2 MB/day per gate
  20,000 gates (2 per lot) × 2 MB = 40 GB/day

Sensor data:
  33,500 events/sec × 100 bytes = 3.35 MB/sec = 290 GB/day

Display board updates:
  10,000 display boards × 1 KB update × 100 updates/day = 1 GB/day

ANPR image uploads:
  10M images/day × 100 KB = 1 TB/day (dominant bandwidth consumer)

Total inbound bandwidth: ~1.3 TB/day ≈ 120 Mbps average
Peak (3×): ~360 Mbps
```

---

## SLO/SLA Summary

| Service | Metric | SLO | SLA |
|---------|--------|-----|-----|
| Gate Control | Availability | 99.99% | 99.95% |
| Gate Control | Response latency (p99) | < 2s | < 3s |
| Reservation Service | Availability | 99.9% | 99.5% |
| Reservation Service | Confirmation latency (p95) | < 500ms | < 1s |
| Payment Service | Availability | 99.95% | 99.9% |
| Payment Service | Processing latency (p95) | < 2s | < 5s |
| Availability Display | Accuracy | > 98% | > 95% |
| Availability Display | Refresh latency (p95) | < 3s | < 5s |
| Sensor Pipeline | Event processing latency (p95) | < 1s | < 3s |
| ANPR Recognition | Accuracy | > 99% | > 97% |
| ANPR Recognition | Processing latency (p99) | < 1s | < 2s |

---

## User Personas

| Persona | Description | Key Flows |
|---------|-------------|-----------|
| **Driver (Walk-in)** | Arrives without reservation; takes a ticket at entry gate | Entry → park → exit with payment |
| **Driver (Pre-booked)** | Reserves online; scans QR at gate | Book → arrive → QR scan entry → park → exit |
| **Permit Holder** | Monthly/annual pass; ANPR-recognized | Drive to gate → ANPR scan → auto-entry → park → auto-exit |
| **Lot Operator** | Manages one or more lots; sets pricing, monitors occupancy | Dashboard → configure rates → view analytics → manage spots |
| **Corporate Admin** | Oversees multiple lots across a region or chain | Cross-lot analytics → pricing strategy → permit management |
| **Maintenance Staff** | Marks spots as out-of-service for repairs | Mark spot OUT_OF_SERVICE → complete repair → restore AVAILABLE |
