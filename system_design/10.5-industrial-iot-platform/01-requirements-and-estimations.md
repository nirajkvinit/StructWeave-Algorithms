# Requirements & Estimations — Industrial IoT Platform

## 1. Functional Requirements

### 1.1 Sensor Data Ingestion

| Capability | Description |
|---|---|
| **Multi-Protocol Support** | Ingest data from MQTT Sparkplug B, OPC UA, Modbus TCP/RTU, PROFINET, EtherNet/IP, BACnet, and proprietary protocols |
| **Protocol Translation** | Convert heterogeneous industrial protocols to a unified canonical data model at the edge gateway |
| **Report-by-Exception** | Support Sparkplug B deadband-based reporting where data is transmitted only when values change beyond threshold |
| **Birth/Death Certificates** | Track device online/offline state via Sparkplug B NBIRTH, DBIRTH, NDEATH, DDEATH messages |
| **Data Quality Tagging** | Attach quality codes (good, bad, uncertain, stale) to every data point per OPC UA quality semantics |
| **Batch Ingestion** | Support store-and-forward batch uploads from edge gateways after connectivity restoration |
| **Backpressure Handling** | Apply backpressure to edge gateways when cloud ingestion is saturated without losing safety-critical data |

**Key Operations:**
- Ingest 1–10 billion data points per day across all connected facilities
- Normalize data from 20–50 different industrial protocols into a canonical time-series format
- Tag every data point with asset context (site, area, unit, equipment, measurement point)
- Detect and flag data quality issues (sensor drift, stuck values, out-of-range readings)
- Support late-arriving data from edge gateways with correct temporal ordering

### 1.2 Edge Processing and Local Control

| Capability | Description |
|---|---|
| **Local Rule Execution** | Run configurable rule engine on edge gateways for real-time alerting without cloud dependency |
| **Edge Analytics** | Execute lightweight ML models (anomaly detection, pattern matching) on edge compute hardware |
| **Store-and-Forward** | Buffer telemetry locally during cloud connectivity loss with configurable retention (24–168 hours) |
| **Local HMI** | Serve local dashboards from edge gateways for plant operators during network outages |
| **Edge-to-Edge Communication** | Enable direct communication between edge gateways within the same facility for cross-unit coordination |
| **Deterministic Control** | Support sub-millisecond control loop execution for safety-critical applications |

**Processing Requirements:**
- Execute edge rules within 10ms of data arrival for safety-critical alerts
- Buffer up to 168 hours of telemetry data on edge gateways (100GB+ local storage)
- Run anomaly detection models with < 50ms inference latency on edge hardware
- Synchronize edge rule definitions with cloud management plane within 60 seconds of update

### 1.3 Digital Twin Synchronization

| Capability | Description |
|---|---|
| **Real-Time State Sync** | Continuously update digital twin models with live sensor data from physical assets |
| **Physics Simulation** | Run forward-looking physics models (thermal, mechanical, fluid dynamics) on twin state |
| **What-If Analysis** | Allow operators to simulate operational changes before applying them to physical assets |
| **Historical Playback** | Replay past operational scenarios through digital twin for root cause analysis |
| **Multi-Fidelity Models** | Support both lightweight edge twins (fast, approximate) and cloud twins (detailed, physics-accurate) |
| **Twin-to-Asset Feedback** | Push optimized setpoints from digital twin simulations back to physical control systems |

### 1.4 Predictive Maintenance

| Capability | Description |
|---|---|
| **Condition Monitoring** | Continuous monitoring of equipment health indicators (vibration, temperature, pressure, current) |
| **Failure Prediction** | ML models predicting component failures 2–8 weeks before occurrence |
| **Remaining Useful Life** | Estimate remaining operational life for critical components based on degradation curves |
| **Maintenance Scheduling** | Automatically generate work orders based on prediction confidence and maintenance windows |
| **Root Cause Analysis** | Correlate failure patterns across equipment types and facilities to identify systemic issues |
| **Model Lifecycle** | Train, validate, deploy, monitor, and retrain models as equipment behavior changes |

### 1.5 Alert Correlation and Escalation

| Capability | Description |
|---|---|
| **Threshold Alerts** | Configurable high/low limits, rate-of-change, and deviation-from-setpoint alarms per measurement |
| **Pattern-Based Alerts** | Complex event processing for multi-signal patterns (e.g., rising temperature AND declining pressure) |
| **Alert Correlation** | Group related alerts by root cause to reduce alarm fatigue (1000 raw alarms → 5 correlated incidents) |
| **Alarm Shelving** | Temporarily suppress known nuisance alarms during maintenance or startup without losing audit trail |
| **Escalation Chains** | Time-based escalation from operator → shift supervisor → plant manager → on-call engineer |
| **Alert Contextualization** | Enrich alerts with asset history, recent maintenance, similar past incidents, and suggested actions |

### 1.6 Device Fleet Management

| Capability | Description |
|---|---|
| **Device Registry** | Central inventory of all sensors, gateways, PLCs, and edge devices with metadata and configuration |
| **OTA Firmware Updates** | Staged rollout of firmware updates to edge gateways and smart sensors with rollback capability |
| **Remote Configuration** | Push configuration changes (sampling rates, deadbands, alert thresholds) to devices without physical access |
| **Health Monitoring** | Track device health metrics (battery, signal strength, uptime, error rates, firmware version) |
| **Provisioning** | Zero-touch provisioning of new devices with automatic certificate enrollment and configuration |
| **Decommissioning** | Graceful device retirement with data archival, certificate revocation, and license recovery |

### 1.7 Historical Data and Analytics

| Capability | Description |
|---|---|
| **Time-Series Queries** | Retrieve raw or aggregated data for any measurement point across any time range |
| **Trend Analysis** | Overlay multiple measurements on time-aligned charts with configurable aggregation windows |
| **KPI Dashboards** | Real-time and historical KPI visualization (OEE, availability, quality, throughput) |
| **Ad-Hoc Analytics** | SQL-based query interface for data engineers to explore telemetry data |
| **Report Generation** | Scheduled and on-demand reports for regulatory compliance, shift handover, and management review |
| **Data Export** | Bulk export capabilities for external analytics platforms and ML training pipelines |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Metric | Target | Rationale |
|---|---|---|
| **Edge rule evaluation latency** | < 10ms | Safety-critical local decisions must be near-instantaneous |
| **Telemetry ingestion latency (p50)** | < 500ms | Near-real-time dashboard updates for operators |
| **Telemetry ingestion latency (p99)** | < 2s | Acceptable worst-case for cloud-side processing |
| **Alert detection latency (cloud)** | < 5s | Operator notification within seconds of threshold breach |
| **Digital twin state sync** | < 1s | Twin reflects physical state within one second |
| **Time-series query (1 hour, single sensor)** | < 200ms | Interactive chart rendering for operators |
| **Time-series query (30 days, 100 sensors)** | < 5s | Trend analysis across equipment groups |
| **Telemetry ingestion throughput** | 5M+ data points/sec | Support 500K+ sensors at peak reporting rates |
| **OTA update deployment** | 10,000 devices/hour | Complete fleet-wide rollout within one shift |

### 2.2 Availability and Reliability

| Metric | Target | Rationale |
|---|---|---|
| **Edge runtime availability** | 99.999% | Local control must not stop—safety-critical |
| **Safety alert processing** | 99.99% | Missed safety alerts can cause equipment damage or injury |
| **Telemetry ingestion pipeline** | 99.95% | Brief gaps acceptable with edge store-and-forward |
| **Digital twin service** | 99.9% | Analytics can tolerate brief outages |
| **Analytics and dashboards** | 99.9% | Historical queries are not time-critical |
| **Data durability** | 99.9999999% (9 nines) | Regulatory data must never be lost |
| **Edge-to-cloud sync** | At-least-once delivery | No data loss; deduplication at cloud ingestion |

### 2.3 Scalability

| Dimension | Requirement |
|---|---|
| **Horizontal scaling** | Ingestion pipeline scales linearly with sensor count |
| **Multi-site** | Support 500+ facilities from a single platform instance |
| **Sensor density** | 500,000 sensors per facility, 10M+ sensors platform-wide |
| **Data growth** | Time-series storage grows at 1–5 PB/year; tiered storage keeps costs manageable |
| **Concurrent users** | 10,000+ simultaneous dashboard users across all facilities |
| **Edge gateway density** | 500 gateways per facility, 50,000+ platform-wide |
| **Facility onboarding** | New facility operational within 48 hours of edge gateway installation |

### 2.4 Security

| Requirement | Standard |
|---|---|
| **Device authentication** | X.509 certificate-based mutual TLS for all device-to-cloud communication |
| **Network segmentation** | ISA/IEC 62443 zones and conduits separating safety, control, enterprise, and cloud |
| **Data encryption at rest** | AES-256 for all stored telemetry and configuration data |
| **Data encryption in transit** | TLS 1.3 for all north-south and east-west communication |
| **OT network protection** | Unidirectional security gateways (data diodes) for safety-critical zones |
| **Access control** | Role-based access with facility, area, and equipment-level granularity |
| **Audit logging** | Immutable audit trail for all configuration changes, alarm acknowledgments, and command executions |
| **Firmware signing** | Cryptographically signed firmware images with chain-of-trust verification on device |

---

## 3. Capacity Estimations

### 3.1 Sensor Telemetry Volume

```
Assumptions:
- Platform manages 100 facilities
- Average 100,000 sensors per facility = 10,000,000 total sensors
- Reporting modes (with Sparkplug B report-by-exception):
  - Fast-changing sensors (vibration, current): 10 samples/sec → 1 sample/sec after deadband
  - Medium-changing sensors (temperature, pressure): 1 sample/sec → 0.1 sample/sec after deadband
  - Slow-changing sensors (level, weight): 0.1 sample/sec → 0.01 sample/sec after deadband
- Sensor mix: 20% fast, 50% medium, 30% slow

Effective data rate per sensor (after report-by-exception):
- Fast: 2M sensors × 1/sec = 2,000,000 points/sec
- Medium: 5M sensors × 0.1/sec = 500,000 points/sec
- Slow: 3M sensors × 0.01/sec = 30,000 points/sec
- Total: ~2,530,000 data points/sec sustained
- Peak (process upset, all sensors reporting): ~5,000,000 points/sec

Daily data volume:
- 2,530,000 points/sec × 86,400 sec/day = ~218 billion points/day
- Wait—let me recalculate with realistic per-facility numbers.

Corrected per-facility calculation:
- 100,000 sensors, effective rate after deadband ≈ 25,000 points/sec
- 100 facilities × 25,000 = 2,500,000 points/sec platform-wide
- Daily: 2,500,000 × 86,400 = ~216 billion points/day

BUT: with report-by-exception, many sensors report far less frequently.
Realistic effective rate: ~500,000–1,000,000 points/sec sustained
Daily: ~50–85 billion points/day
Design target: 5,000,000 points/sec (burst headroom)
```

### 3.2 Data Storage Volume

```
Per data point storage:
- Timestamp: 8 bytes
- Value (double): 8 bytes
- Quality code: 1 byte
- Sensor ID reference: 4 bytes (integer mapping)
- Total per point: ~21 bytes (before compression)
- After TSDB compression (delta-delta + gorilla): ~2.5 bytes/point average

Daily raw storage:
- 80 billion points × 2.5 bytes = ~200 GB/day (compressed)
- Monthly: ~6 TB
- Yearly: ~73 TB (compressed time-series data)

With metadata, indexes, and aggregation tables (2x):
- Yearly: ~146 TB

Tiered retention:
- Hot (raw, 90 days): ~18 TB on SSD
- Warm (1-minute aggregation, 2 years): ~5 TB on HDD
- Cold (15-minute aggregation, 10 years): ~3 TB on object storage
- Archive (1-hour aggregation, 30 years): ~2 TB on archive storage
```

### 3.3 Edge Gateway Capacity

```
Per edge gateway:
- Connected sensors: 200–2,000 (typical: 500)
- Inbound data rate: 500 sensors × 0.5 points/sec = 250 points/sec
- Store-and-forward buffer: 168 hours × 250 points/sec × 21 bytes = ~3.2 GB
- Design: 100 GB local SSD for buffering + edge analytics

Platform-wide gateways:
- 100 facilities × 200 gateways = 20,000 edge gateways
- Total edge storage: 20,000 × 100 GB = 2 PB of distributed edge storage
```

### 3.4 Alert Volume

```
Per facility:
- Configured alarms: 100,000 sensors × 2 limits avg = 200,000 alarm points
- Daily alarm activations: ~500–5,000 (well-tuned plant)
- Alarm floods during upset: 1,000–10,000 in 10-minute window

Platform-wide:
- 100 facilities × 2,500 avg alarms/day = 250,000 raw alarms/day
- After correlation: ~25,000 incidents/day (10:1 reduction)
- Critical alerts requiring immediate action: ~500/day

Alert processing rate:
- Normal: ~3 alarms/sec per facility
- Alarm flood: ~15 alarms/sec per facility (peak)
- Design target: 50 alarms/sec per facility sustained
```

### 3.5 Digital Twin Compute

```
Per digital twin model:
- State update frequency: 1–10 Hz (depends on process dynamics)
- State vector size: 50–500 variables per equipment twin
- Simulation step: 10–100ms per physics tick
- Memory per active twin: 10–100 MB

Platform-wide:
- 10,000 active equipment twins
- Total twin memory: ~500 GB
- Total twin compute: ~2,000 CPU cores for real-time sync
- Simulation burst (what-if analysis): additional 5,000 cores on-demand
```

### 3.6 OTA Update Traffic

```
Firmware image sizes:
- Smart sensor firmware: 256 KB–2 MB
- Edge gateway firmware: 50–500 MB
- Edge application container: 100 MB–2 GB

Rollout scenario (platform-wide gateway update):
- 20,000 gateways × 200 MB = 4 TB total transfer
- At 10,000 devices/hour: ~2 hours for full rollout
- Bandwidth per device: 200 MB in 5 minutes = ~5 Mbps per device
- Concurrent downloads (10% of fleet): 2,000 × 5 Mbps = 10 Gbps peak
```

---

## 4. Service Level Objectives (SLOs)

### 4.1 Tiered SLO Framework

| Tier | Service | Availability | Latency (p99) | Error Budget |
|---|---|---|---|---|
| **Tier 0** | Edge local control and safety alerts | 99.999% | 10ms | 5.26 min/year |
| **Tier 0** | Safety-critical alarm processing (cloud) | 99.99% | 5s | 52.6 min/year |
| **Tier 1** | Telemetry ingestion pipeline | 99.95% | 2s | 4.38 hrs/year |
| **Tier 1** | Digital twin state synchronization | 99.95% | 1s | 4.38 hrs/year |
| **Tier 1** | Alert correlation and notification | 99.95% | 10s | 4.38 hrs/year |
| **Tier 2** | Historical data queries | 99.9% | 5s | 8.76 hrs/year |
| **Tier 2** | Predictive maintenance pipeline | 99.9% | 60s | 8.76 hrs/year |
| **Tier 2** | OTA update service | 99.9% | N/A | 8.76 hrs/year |
| **Tier 3** | Analytics dashboards and reporting | 99.5% | 10s | 43.8 hrs/year |

### 4.2 Data Quality SLOs

| Metric | Target |
|---|---|
| **Data completeness** | > 99.9% of expected data points received within 5 minutes |
| **Edge buffer data recovery** | 100% of buffered data recovered after connectivity restoration |
| **Timestamp accuracy** | < 10ms deviation from GPS-synchronized time source |
| **Data point quality tagging** | 100% of ingested points carry quality code |
| **Duplicate detection** | > 99.99% of duplicate points detected and eliminated |
| **Sensor drift detection** | Detect calibration drift within 24 hours of onset |

### 4.3 SLA Commitments (Contractual)

| Commitment | Target | Penalty Trigger |
|---|---|---|
| **Platform uptime** | 99.95% monthly | Credit 10% of monthly fees per 0.05% below |
| **Ingestion latency** | < 5s p99 monthly | Credit 5% if monthly p99 exceeds target |
| **Data retention** | Per contractual/regulatory period | Immediate escalation if data loss detected |
| **Safety alert delivery** | < 30s from detection to notification | Root cause review for any missed safety alert |
| **OTA rollout completion** | Within 4 hours of initiation | Escalation to engineering if rollout stalls |

---

## 5. Constraint Analysis

### 5.1 Regulatory Constraints

| Constraint | Impact |
|---|---|
| **ISA/IEC 62443** | Security zones and conduits must be enforced; security level ratings drive device and network requirements |
| **FDA 21 CFR Part 11** | Electronic records must be tamper-evident with audit trails for pharmaceutical manufacturing |
| **NERC CIP** | Critical infrastructure protection for energy sector; strict access control and monitoring |
| **ATEX/IECEx** | Equipment in explosive atmospheres requires intrinsically safe devices with certified firmware |
| **GDPR** | Worker location tracking and biometric data in European facilities requires consent and data minimization |
| **Data Sovereignty** | Telemetry from facilities in certain countries must remain within national borders |
| **Data Retention** | 5–30 year retention requirements for process data in regulated industries (pharma, nuclear, oil & gas) |

### 5.2 Technical Constraints

| Constraint | Impact |
|---|---|
| **Legacy protocol diversity** | 20+ year old Modbus/PROFINET devices cannot be upgraded; must bridge to modern protocols |
| **Deterministic control timing** | Safety-critical control loops require sub-millisecond timing that cloud round-trips cannot satisfy |
| **Bandwidth at remote sites** | Oil rigs, mines, and remote facilities may have satellite-only connectivity (256 Kbps–2 Mbps) |
| **Harsh environments** | Edge hardware must operate at -40 to +70 C, with vibration, dust, and humidity resistance |
| **Explosion-proof requirements** | Edge devices in hazardous areas must be intrinsically safe or explosion-proof rated |
| **Long device lifecycles** | Industrial equipment operates for 20–40 years; platform must support legacy devices indefinitely |
| **Change management** | Industrial operations require rigorous change management; updates must not disrupt production |
| **Air-gapped networks** | Some safety-critical networks have no internet connectivity; updates via secure media transfer |

---

*Next: [High-Level Design ->](./02-high-level-design.md)*
