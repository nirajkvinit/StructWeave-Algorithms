# Requirements & Estimations — Fleet Management System

## 1. Functional Requirements

### 1.1 Real-Time Vehicle Tracking

| Capability | Description |
|---|---|
| **GPS Position Tracking** | Continuous location streaming at configurable intervals (1–60 seconds) |
| **Speed and Heading** | Real-time speed, bearing, and altitude from GPS/GLONASS/Galileo receivers |
| **Breadcrumb Trail** | Historical path visualization with playback capability |
| **Adaptive Frequency** | Increase reporting frequency during motion, decrease when stationary |
| **Multi-Constellation Support** | GPS, GLONASS, Galileo, BeiDou for improved accuracy in urban canyons |
| **Dead Reckoning** | IMU-based position estimation during GPS signal loss (tunnels, garages) |

**Key Operations:**
- Stream vehicle positions to real-time map displays
- Query current position of any vehicle with < 3-second staleness
- Retrieve historical routes for any time period
- Calculate distance traveled, time in motion, and idle time
- Support map clustering for large fleet overview (1000+ vehicles)

### 1.2 Telemetry Ingestion and Processing

| Capability | Description |
|---|---|
| **OBD-II Diagnostics** | Engine RPM, coolant temperature, fuel level, DTC fault codes |
| **CAN Bus Data** | Throttle position, brake application, transmission gear, exhaust temperature |
| **Fuel Monitoring** | Real-time fuel level, consumption rate, refueling/drain event detection |
| **Tire Pressure (TPMS)** | Per-tire pressure and temperature monitoring |
| **Accelerometer** | 3-axis acceleration for harsh event detection (braking, cornering, acceleration) |
| **Temperature Sensors** | Cargo area temperature for cold-chain logistics compliance |
| **Door/Cargo Sensors** | Door open/close events, cargo weight estimation |

**Processing Requirements:**
- Normalize data from 100+ telematics device manufacturers
- Detect anomalies in telemetry streams within 5 seconds
- Calculate derived metrics: fuel efficiency (MPG/L-per-100km), idle percentage, harsh event counts
- Apply configurable alert thresholds per vehicle type and fleet policy

### 1.3 Route Optimization

| Capability | Description |
|---|---|
| **Static Route Planning** | Pre-computed optimal routes for daily fleet operations |
| **Dynamic Re-Routing** | Real-time route adjustments based on traffic, weather, road closures |
| **Multi-Stop Optimization** | Sequence optimization for delivery/service routes with 10–200+ stops |
| **Time Window Constraints** | Respect customer appointment windows and delivery schedules |
| **Vehicle Capacity** | Weight and volume constraints per vehicle type |
| **Driver Constraints** | HOS limits, break requirements, shift schedules, skill/certification matching |
| **Territory Planning** | Long-term zone assignment and balancing across drivers |

**Optimization Objectives (configurable priority):**
- Minimize total distance traveled
- Minimize total driving time
- Maximize on-time delivery percentage
- Minimize fuel consumption
- Balance workload across drivers

### 1.4 Geofencing

| Capability | Description |
|---|---|
| **Zone Creation** | Circular, rectangular, and complex polygonal geofences |
| **Entry/Exit Detection** | Real-time detection of vehicles crossing geofence boundaries |
| **Dwell Time Tracking** | Time spent inside each geofenced zone |
| **Speed Corridors** | Speed limit enforcement within specific road segments or zones |
| **Nested Geofences** | Hierarchical zones (country → region → depot → loading bay) |
| **Dynamic Geofences** | Temporary zones for construction, events, or restricted areas |

**Alert Types:**
- Unauthorized zone entry/exit
- Exceeding dwell time threshold
- Speed violation within zone
- After-hours vehicle movement
- Route deviation beyond threshold

### 1.5 Driver Management

| Capability | Description |
|---|---|
| **Driver Profiles** | License class, certifications, endorsements, medical card expiry |
| **HOS Tracking** | Real-time Hours of Service monitoring per FMCSA/EU regulations |
| **Duty Status Management** | On-duty, off-duty, driving, sleeper-berth status transitions |
| **Behavior Scoring** | Composite safety score from harsh events, speeding, idling, seatbelt usage |
| **Fatigue Detection** | ML-based fatigue risk scoring from driving patterns and HOS data |
| **Assignment Management** | Driver-to-vehicle assignment with qualification matching |

### 1.6 Dispatch and Job Management

| Capability | Description |
|---|---|
| **Job Creation** | Create pickup/delivery/service jobs with location, time window, and requirements |
| **Auto-Dispatch** | AI-powered driver-job matching based on proximity, capacity, schedule, and skill |
| **Manual Override** | Dispatcher ability to reassign, resequence, or cancel jobs |
| **Proof of Delivery** | Digital signature capture, photo documentation, barcode/QR scanning |
| **ETA Calculation** | Real-time ETA updates based on current position, traffic, and remaining stops |
| **Customer Notifications** | Automated SMS/email with live tracking link for delivery recipients |

### 1.7 Maintenance Management

| Capability | Description |
|---|---|
| **Scheduled Maintenance** | Calendar, mileage, and engine-hours-based maintenance schedules |
| **Predictive Maintenance** | ML-based failure prediction from engine telemetry patterns |
| **DTC Alert Processing** | Real-time Diagnostic Trouble Code interpretation and severity classification |
| **Work Order Management** | Create, assign, and track maintenance work orders |
| **Parts Inventory** | Track parts usage and forecast demand based on fleet composition |
| **Vehicle Inspection** | Digital DVIR (Driver Vehicle Inspection Report) with photo attachment |

### 1.8 Compliance and Reporting

| Capability | Description |
|---|---|
| **ELD Recording** | FMCSA-compliant Electronic Logging Device functionality |
| **RODS Generation** | Record of Duty Status with required data fields and graph grid |
| **IFTA Reporting** | Interstate Fuel Tax Agreement mileage and fuel tracking by jurisdiction |
| **DVIR Management** | Pre-trip and post-trip inspection digital reports |
| **DOT Audit Support** | Data export in FMCSA-mandated formats for roadside inspections |
| **Emissions Reporting** | CO2 and NOx emission calculations per vehicle and fleet-wide |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Metric | Target | Rationale |
|---|---|---|
| **GPS update processing latency (p50)** | < 500ms | Near-real-time map updates for dispatchers |
| **GPS update processing latency (p99)** | < 2s | Acceptable worst-case for tracking display |
| **Geofence evaluation latency** | < 100ms | Instant breach detection for security-critical zones |
| **Route optimization (50 stops)** | < 10s | Acceptable wait for daily route planning |
| **Route optimization (200 stops)** | < 60s | Complex multi-vehicle routing |
| **ETA calculation** | < 500ms | Real-time customer-facing updates |
| **Nearest vehicle query** | < 200ms | Fast dispatch decisions |
| **Telemetry ingestion throughput** | 1M+ events/sec | Support 500K+ vehicles at peak reporting |

### 2.2 Availability and Reliability

| Metric | Target | Rationale |
|---|---|---|
| **Tracking service availability** | 99.95% | 4.38 hours/year downtime acceptable |
| **ELD/Compliance service** | 99.99% | Regulatory mandate — data loss is a violation |
| **Telemetry ingestion** | 99.9% | Brief gaps acceptable with edge buffering |
| **Route optimization** | 99.9% | Fallback to cached routes during outage |
| **Data durability** | 99.999999% (8 nines) | Compliance data retention requirements |
| **Edge-to-cloud sync** | Exactly-once delivery | No duplicate or lost compliance events |

### 2.3 Scalability

| Dimension | Requirement |
|---|---|
| **Horizontal scaling** | Stateless services auto-scale independently based on connected vehicle count |
| **Data partitioning** | Geo-partitioned location data, vehicle-partitioned telemetry |
| **Multi-region** | Active-active deployment across 2+ geographic regions |
| **Storage growth** | Time-series downsampling; hot (30 days), warm (1 year), cold (7 years) |
| **Fleet onboarding** | Support adding 10,000+ vehicles per day without performance degradation |

### 2.4 Security

| Requirement | Standard |
|---|---|
| **Vehicle authentication** | X.509 certificate-based mutual TLS for device-to-cloud |
| **Data encryption at rest** | AES-256 for all stored telemetry and PII |
| **Data encryption in transit** | TLS 1.3 for all communications |
| **Driver PII protection** | GDPR-compliant data handling, right to erasure support |
| **API authentication** | OAuth 2.0 + API keys for third-party integrations |
| **Audit logging** | Immutable audit trail for all compliance-relevant actions |

---

## 3. Capacity Estimations

### 3.1 GPS Tracking Volume

```
Assumptions:
- 500,000 connected vehicles
- Average GPS update interval: 10 seconds (moving), 60 seconds (stationary)
- 60% of fleet moving during peak hours

Peak GPS updates/sec:
- Moving vehicles: 500K × 0.60 / 10 sec = 30,000 updates/sec
- Stationary vehicles: 500K × 0.40 / 60 sec = 3,333 updates/sec
- Total peak: ~33,000 GPS updates/sec
- Design target: 100,000 updates/sec (growth + burst headroom)
```

### 3.2 Telemetry Data Volume

```
Per-vehicle telemetry:
- GPS position: 80 bytes × 6/min = 480 bytes/min
- Engine diagnostics: 200 bytes × 1/min = 200 bytes/min
- Accelerometer events: 150 bytes × 2/min avg = 300 bytes/min
- Fuel data: 50 bytes × 1/min = 50 bytes/min
- Misc sensors: 100 bytes × 1/min = 100 bytes/min
Total per vehicle per minute: ~1,130 bytes/min = ~1.1 KB/min

Daily telemetry per vehicle (12-hour operating day):
- 1.1 KB/min × 720 min = ~792 KB/day ≈ 0.8 MB/day

Fleet-wide daily:
- 500,000 vehicles × 0.8 MB = 400 GB/day

Monthly: ~12 TB
Yearly: ~146 TB
With indexes and metadata (1.5x): ~219 TB/year
```

### 3.3 Geofence Evaluation Volume

```
Assumptions:
- 1,000,000 active geofences across all fleets
- Average geofence complexity: 8-vertex polygon
- Each GPS update evaluated against relevant geofences
- Geospatial index reduces candidate geofences to ~10 per update

Evaluations per second (peak):
- 100,000 GPS updates/sec × 10 candidate geofences = 1,000,000 evaluations/sec
- Point-in-polygon cost: ~1μs per evaluation
- Total compute: ~1 second of CPU per second (parallelizable)
- Design target: Handle 2M evaluations/sec across cluster
```

### 3.4 Route Optimization Compute

```
Assumptions:
- 50,000 fleets using route optimization
- Average 1 route plan per fleet per day (with 3-5 re-optimizations)
- Average 30 stops per route, 5 vehicles per plan

Daily route computations:
- Initial plans: 50,000/day
- Re-optimizations: 50,000 × 4 = 200,000/day
- Total: 250,000 route computations/day

Peak (morning planning 6-9 AM):
- 70% of initial plans in 3-hour window
- 35,000 plans / 10,800 sec = ~3.2 plans/sec
- Each plan: 2-30 seconds of compute
- Required compute nodes at peak: 50-100 optimization workers
```

### 3.5 Compliance Data Volume

```
ELD/HOS records per driver per day:
- Duty status changes: ~10-20 events × 200 bytes = ~4 KB
- Intermediate log entries (per-hour location): 24 × 100 bytes = 2.4 KB
- Vehicle condition changes: ~5 × 150 bytes = 0.75 KB
Total per driver per day: ~7 KB

Fleet-wide (500,000 drivers):
- 500,000 × 7 KB = 3.5 GB/day
- 6-month retention (FMCSA minimum): ~630 GB
- With backup and indexes: ~1.5 TB for 6-month window
```

---

## 4. Service Level Objectives (SLOs)

### 4.1 Tiered SLO Framework

| Tier | Service | Availability | Latency (p99) | Error Budget |
|---|---|---|---|---|
| **Tier 0** | ELD/HOS compliance recording | 99.99% | 1s | 52.6 min/year |
| **Tier 0** | Telemetry ingestion pipeline | 99.99% | 2s | 52.6 min/year |
| **Tier 1** | GPS tracking and map display | 99.95% | 3s | 4.38 hrs/year |
| **Tier 1** | Geofence evaluation and alerting | 99.95% | 500ms | 4.38 hrs/year |
| **Tier 1** | Dispatch and job management | 99.95% | 1s | 4.38 hrs/year |
| **Tier 2** | Route optimization | 99.9% | 60s | 8.76 hrs/year |
| **Tier 2** | Analytics and reporting | 99.9% | 5s | 8.76 hrs/year |
| **Tier 3** | Maintenance predictions | 99.5% | 10s | 43.8 hrs/year |

### 4.2 Data Quality SLOs

| Metric | Target |
|---|---|
| **GPS accuracy** | < 3 meters CEP (circular error probable) in open sky |
| **Telemetry completeness** | > 99.5% of expected data points received within 60 seconds |
| **ELD data integrity** | 100% of duty status changes captured (regulatory requirement) |
| **Geofence detection accuracy** | > 99.9% of actual boundary crossings detected |
| **ETA prediction accuracy** | Within ±15% of actual arrival time for 90% of predictions |

### 4.3 SLA Commitments (Contractual)

| Commitment | Target | Penalty Trigger |
|---|---|---|
| **Platform uptime** | 99.95% monthly | Credit 10% of monthly fees per 0.05% below |
| **Tracking latency** | < 5s p99 monthly | Credit 5% if monthly p99 exceeds target |
| **Data retention** | Per compliance requirements | Immediate escalation if data loss detected |
| **Incident response** | P1: 15 min, P2: 1 hour | Escalation to VP-level if breached |
| **API rate limits** | Published limits honored | Advance notice for any limit changes |

---

## 5. Constraint Analysis

### 5.1 Regulatory Constraints

| Constraint | Impact |
|---|---|
| **ELD Mandate (FMCSA)** | Must record driving time automatically synchronized with vehicle engine; tamper-resistant |
| **HOS Regulations** | 11-hour driving limit, 14-hour on-duty limit, 30-minute break requirement; real-time enforcement |
| **IFTA Compliance** | Track miles driven per jurisdiction for fuel tax apportionment |
| **GDPR (EU fleets)** | Driver location data is personal data; requires consent, purpose limitation, right to erasure |
| **CCPA (California)** | Similar driver privacy requirements for California-based operations |
| **DOT Roadside Inspection** | ELD data must be transferable to inspectors via Bluetooth or web service within minutes |
| **Data Retention** | FMCSA: 6 months for ELD data; IFTA: 4 years; varies by jurisdiction |

### 5.2 Technical Constraints

| Constraint | Impact |
|---|---|
| **Cellular connectivity** | Vehicles traverse areas with no cellular coverage; edge buffering is mandatory |
| **GPS accuracy** | Urban canyon multipath errors can cause 10-50m position errors; requires filtering |
| **Battery/Power** | Telematics device power consumption must not drain vehicle battery during extended parking |
| **Device diversity** | 100+ telematics hardware vendors with different protocols and data formats |
| **Bandwidth costs** | Cellular data costs at scale ($0.01-0.10/MB) constrain telemetry frequency |
| **Clock synchronization** | Vehicle clocks may drift; server-side timestamp reconciliation required |

---

*Next: [High-Level Design →](./02-high-level-design.md)*
