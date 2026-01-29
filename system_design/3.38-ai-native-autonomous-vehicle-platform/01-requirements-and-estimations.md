# Requirements and Estimations

## Functional Requirements

### P0 - Safety Critical (Must Have)

#### Perception Pipeline

| Requirement | Specification | Rationale |
|-------------|---------------|-----------|
| **Object Detection Range** | Detect objects within 200m (vehicles), 100m (pedestrians) | Highway stopping distance at 130 km/h |
| **Object Classification** | Accuracy > 95% for primary classes | Safety-critical decision making |
| **Position Accuracy** | < 0.5m error for tracked objects | Collision avoidance precision |
| **Velocity Estimation** | < 1 m/s error | Time-to-collision calculation |
| **Lane Detection** | Detect lanes up to 150m ahead | Lane keeping and change |
| **Traffic Signal Recognition** | > 99% accuracy within 80m | Intersection safety |
| **Occlusion Handling** | Track partially visible objects | Urban driving scenarios |
| **360° Coverage** | No blind spots > 2m from vehicle | Comprehensive awareness |

#### Prediction & Planning

| Requirement | Specification | Rationale |
|-------------|---------------|-----------|
| **Trajectory Prediction Horizon** | 8 seconds into future | Sufficient reaction time |
| **Prediction Update Rate** | 10 Hz minimum | Real-time responsiveness |
| **Multi-Modal Predictions** | K ≥ 6 trajectory hypotheses | Cover likely futures |
| **Trajectory Generation Rate** | 10 Hz (every 100ms) | Responsive replanning |
| **Collision-Free Guarantee** | 100% of output trajectories | Fundamental safety |
| **Traffic Rule Compliance** | Respect signs, signals, right-of-way | Legal operation |
| **Unprotected Turns** | Handle left turns, merges | Complex maneuvers |
| **Emergency Stop** | Achieve safe stop within 100ms decision | AEB functionality |

#### Vehicle Control

| Requirement | Specification | Rationale |
|-------------|---------------|-----------|
| **Lateral Tracking Error** | < 0.1m at highway speeds | Lane centering precision |
| **Longitudinal Accuracy** | < 0.5m position, < 0.3 m/s velocity | Smooth following |
| **Control Loop Rate** | 50 Hz minimum | Stability and responsiveness |
| **Jerk Limit** | < 2.5 m/s³ (comfort), < 10 m/s³ (emergency) | Passenger comfort |
| **Time-to-Collision Minimum** | > 2s under normal operation | Safety margin |

#### Safety Systems

| Requirement | Specification | Rationale |
|-------------|---------------|-----------|
| **AEB Response Time** | < 100ms from detection to braking | Industry standard |
| **Graceful Degradation** | Continue safe operation with single sensor failure | Fault tolerance |
| **Minimal Risk Condition** | Achieve safe stop within 10 seconds | Last resort safety |
| **Driver Takeover Request** | 10s warning for L3, clear handoff | Regulatory compliance |
| **Redundant Braking** | Independent backup brake system | ASIL-D requirement |

### P1 - Operational Excellence (Should Have)

| Requirement | Description |
|-------------|-------------|
| **HD Map Integration** | Consume and contribute to HD maps |
| **Crowdsourced Updates** | Real-time map change detection and sharing |
| **Remote Assistance** | Human operators can provide guidance |
| **OTA Updates** | Deploy software without physical access |
| **Fleet Analytics** | Centralized monitoring and insights |
| **Diagnostic Logging** | Comprehensive event capture for analysis |
| **Geo-Fencing** | Respect operational domain boundaries |

### P2 - Enhanced Features (Nice to Have)

| Requirement | Description |
|-------------|-------------|
| **V2X Communication** | Vehicle-to-infrastructure, vehicle-to-vehicle |
| **Passenger Preferences** | Adapt driving style (comfort vs. efficiency) |
| **Energy Optimization** | EV-specific routing and driving |
| **Predictive Maintenance** | Sensor health monitoring and alerts |
| **Multi-Vehicle Coordination** | Platooning, intersection coordination |

### Out of Scope

- In-vehicle infotainment system
- Interior monitoring (separate system)
- Payment/ride-hailing business logic
- Insurance and liability management
- Vehicle manufacturing/hardware design

---

## Non-Functional Requirements

### Performance

| Metric | Target | P50 | P95 | P99 | Notes |
|--------|--------|-----|-----|-----|-------|
| **Perception Latency** | < 50ms | 35ms | 45ms | 55ms | Sensor to detection |
| **Fusion Latency** | < 15ms | 10ms | 12ms | 18ms | Multi-modal merge |
| **Prediction Latency** | < 20ms | 12ms | 18ms | 25ms | Trajectory forecast |
| **Planning Latency** | < 30ms | 20ms | 28ms | 35ms | Motion planning |
| **Control Latency** | < 10ms | 5ms | 8ms | 12ms | Command generation |
| **E2E Latency** | < 100ms | 75ms | 90ms | 110ms | Total pipeline |
| **GPU Inference** | < 30ms | 22ms | 28ms | 35ms | Per-frame CNN |
| **Planning Cycle** | 100ms | - | - | - | Fixed rate |
| **Control Cycle** | 20ms | - | - | - | Fixed rate |

### Reliability

| Metric | Target | Measurement |
|--------|--------|-------------|
| **System Availability** | 99.99% | Operational uptime |
| **Mean Time Between Failures** | > 10,000 hours | Hardware reliability |
| **Perception Uptime** | 99.999% | With sensor redundancy |
| **Fail-Operational Duration** | > 10 seconds | Time to achieve MRC |
| **Recovery Time** | < 5 seconds | After transient failure |
| **Data Durability** | 99.9999% | Safety-critical logs |

### Safety Metrics

| Metric | Target | Industry Baseline |
|--------|--------|-------------------|
| **Collision Rate** | < 0.5 per million miles | Human: ~1.5 per million |
| **At-Fault Collision Rate** | 0 | Zero tolerance |
| **Disengagement Rate** | < 0.1 per 1000 miles (in ODD) | Waymo: ~0.08 |
| **AEB Activation Success** | > 99.9% | When triggered |
| **False Positive Rate** | < 0.01 per 100 miles | Phantom braking |
| **Near-Miss Events** | Track all, investigate | Continuous monitoring |

### Scalability

| Metric | Single Vehicle | Fleet (10K vehicles) |
|--------|----------------|---------------------|
| **Sensor Data Rate** | 1.6 GB/s | N/A (on-board) |
| **Compute Load** | 200-300 TOPS | N/A (on-board) |
| **Telemetry Upload** | 100 KB/min | 1 GB/min aggregate |
| **Log Storage** | 500 MB/day (events) | 5 TB/day aggregate |
| **OTA Update Size** | 1-10 GB/update | 10-100 TB/rollout |
| **Concurrent Connections** | 1 (per vehicle) | 10K+ to cloud |

---

## Capacity Estimations

### Single Vehicle Sensor Data

| Sensor | Count | Resolution | Frame Rate | Raw Data Rate | Processed |
|--------|-------|------------|------------|---------------|-----------|
| Cameras | 8 | 2-8 MP | 30 fps | 1.5 GB/s | 200 MB/s |
| LiDAR | 1-3 | 128 beams | 10-20 Hz | 100 MB/s | 50 MB/s |
| Radar | 5 | 4D imaging | 20 Hz | 10 MB/s | 2 MB/s |
| Ultrasonic | 12 | N/A | 50 Hz | 1 KB/s | 0.5 KB/s |
| GNSS/IMU | 1 | N/A | 100 Hz | 10 KB/s | 5 KB/s |
| **Total** | - | - | - | **~1.6 GB/s** | **~250 MB/s** |

### Compute Requirements

| Workload | TOPS Required | Hardware | Memory |
|----------|---------------|----------|--------|
| Camera Backbone (8 streams) | 100-150 TOPS | GPU | 8 GB |
| LiDAR Processing | 20-30 TOPS | GPU/NPU | 2 GB |
| Radar Processing | 5-10 TOPS | DSP | 1 GB |
| Sensor Fusion (BEV) | 10-20 TOPS | GPU | 4 GB |
| Prediction Model | 20-30 TOPS | GPU | 2 GB |
| Planning | 30-50 TOPS | GPU/CPU | 4 GB |
| Control | 5-10 TOPS | CPU | 1 GB |
| Safety Monitor | 10-20 TOPS | Separate SoC | 2 GB |
| **Total** | **200-320 TOPS** | Multi-SoC | **24+ GB** |

### Fleet Infrastructure

| Component | 1,000 Vehicles | 10,000 Vehicles | 100,000 Vehicles |
|-----------|----------------|-----------------|------------------|
| **Telemetry Ingestion** | 100 MB/min | 1 GB/min | 10 GB/min |
| **Daily Log Storage** | 500 GB | 5 TB | 50 TB |
| **Annual Log Storage** | 180 TB | 1.8 PB | 18 PB |
| **Map Update Bandwidth** | 100 GB/day | 1 TB/day | 10 TB/day |
| **OTA Servers** | 10 | 100 | 1000 |
| **Simulation Capacity** | 100K miles/day | 1M miles/day | 10M miles/day |
| **Training Compute** | 100 GPUs | 1000 GPUs | 10000 GPUs |

### Storage Calculations

**Per Vehicle (Annual)**:
```
Event Logs: 500 MB/day × 365 days = 182 GB/year
Sensor Snapshots (events): 5 GB/day × 365 = 1.8 TB/year
Total per vehicle: ~2 TB/year
```

**Fleet (10,000 vehicles)**:
```
Total logs: 2 TB × 10,000 = 20 PB/year
Hot storage (90 days): 5 PB
Warm storage (1 year): 20 PB
Cold storage (7 years for safety): 140 PB
```

### Network Requirements

| Connection | Bandwidth | Latency | Availability |
|------------|-----------|---------|--------------|
| Vehicle to Cloud (telemetry) | 1-10 Mbps | < 500ms | 99% |
| Cloud to Vehicle (OTA) | 50-100 Mbps | Best effort | 99% |
| V2X (safety-critical) | 1-10 Mbps | < 100ms | 99.9% |
| Teleops (remote assistance) | 10-50 Mbps | < 200ms | 99.9% |

---

## SLOs and SLAs

### Perception SLOs

| SLO | Target | Error Budget | Measurement |
|-----|--------|--------------|-------------|
| Detection mAP | > 70% | 30% frames can be lower | Per-frame evaluation |
| Classification Accuracy | > 95% | 5% misclassification allowed | Confusion matrix |
| Tracking Continuity | > 99% | 1% track breaks allowed | Track fragmentation |
| Latency P99 | < 55ms | 1% can exceed | Instrumented timing |
| False Positive Rate | < 0.5% | 0.5% phantom detections | Ground truth comparison |

### Planning SLOs

| SLO | Target | Error Budget | Measurement |
|-----|--------|--------------|-------------|
| Valid Trajectory Rate | > 99.9% | 0.1% invalid allowed | Per-cycle validation |
| Cycle Time | < 100ms | 0% can exceed (hard RT) | Watchdog |
| Comfort Score | > 0.8 | 20% uncomfortable allowed | Jerk/acceleration |
| Route Adherence | > 99% | 1% deviations allowed | Navigation accuracy |

### Safety SLOs

| SLO | Target | Error Budget | Measurement |
|-----|--------|--------------|-------------|
| At-Fault Collisions | 0 | Zero tolerance | Incident tracking |
| AEB Success Rate | > 99.9% | 0.1% failure allowed | Activation outcomes |
| Fallback Activation | < 0.01/hour | Rate limit | Event counting |
| MRC Achievement | 100% when triggered | Zero tolerance | Safety validation |

### Fleet Operations SLOs

| SLO | Target | Error Budget | Measurement |
|-----|--------|--------------|-------------|
| Cloud Availability | 99.9% | 8.7 hours/year downtime | Health checks |
| OTA Success Rate | > 99% | 1% rollback allowed | Deployment tracking |
| Telemetry Delivery | > 99.9% | 0.1% loss allowed | Acknowledgment |
| Remote Assistance Response | < 30 seconds | P95 | Time to human |

---

## Constraints and Assumptions

### Hardware Constraints

| Constraint | Value | Impact |
|------------|-------|--------|
| **Power Budget** | 50-200W total compute | Limits model size/complexity |
| **Thermal Operating Range** | -40°C to +85°C | Automotive-grade components |
| **Vibration/Shock** | Automotive standards | Ruggedized mounting |
| **Form Factor** | Trunk-mountable (L4), integrated (L2) | Space constraints |
| **Weight** | < 20kg compute system | Vehicle efficiency |
| **Boot Time** | < 30 seconds to operational | Startup performance |

### Automotive-Grade Requirements

| Requirement | Standard | Level |
|-------------|----------|-------|
| **Component Qualification** | AEC-Q100/101/104 | Grade 1 or 2 |
| **Functional Safety** | ISO 26262 | ASIL-D capable |
| **Cybersecurity** | ISO/SAE 21434 | Full lifecycle |
| **EMC Compatibility** | CISPR 25 | Class 5 |
| **Environmental** | ISO 16750 | Automotive |

### Regulatory Constraints

| Regulation | Region | Requirement |
|------------|--------|-------------|
| **ISO 26262** | Global | Functional safety process |
| **ISO 21448 (SOTIF)** | Global | Intended functionality safety |
| **ISO/PAS 8800** | Global | AI/ML safety (emerging) |
| **UNECE R157** | Europe | ALKS type approval |
| **NHTSA AV STEP** | USA | Federal AV framework |
| **AFGBV** | Germany | L4 operation authorization |
| **GB/T Standards** | China | National AV standards |

### Operational Assumptions

| Assumption | Dependency | Fallback |
|------------|------------|----------|
| **ODD Defined** | Geofenced operational area | Degrade outside ODD |
| **HD Maps Available** | Map provider or crowdsourced | Mapless mode |
| **Connectivity** | 4G/5G cellular | Cached maps, local autonomy |
| **Weather Data** | External service | Conservative operation |
| **Driver Present (L2-L3)** | Human in loop | MRC if unresponsive |
| **Sensor Calibration** | Factory + periodic | Online recalibration |

### Data Assumptions

| Assumption | Value | Validation |
|------------|-------|------------|
| **Training Data** | 10+ billion miles equivalent | Fleet + simulation |
| **Edge Cases Covered** | 100K+ scenarios | Scenario library |
| **Geographic Coverage** | Target ODD regions | Mapping and testing |
| **Weather Conditions** | All seasons in ODD | Validation testing |
| **Object Classes** | 50+ distinct classes | Dataset diversity |

---

## Cost Considerations

### Per-Vehicle Hardware (2025 Estimates)

| Component | Low (L2) | Mid (L3) | High (L4) |
|-----------|----------|----------|-----------|
| Compute Platform | $500-1000 | $1500-3000 | $3000-7000 |
| Camera System | $200-500 | $500-1000 | $1000-2000 |
| LiDAR | $0 (optional) | $500-1500 | $2000-5000 |
| Radar (5x) | $200-400 | $400-800 | $800-1500 |
| Ultrasonic | $50-100 | $100-200 | $200-400 |
| GNSS/IMU | $100-300 | $300-800 | $800-2000 |
| Wiring/Integration | $200-500 | $500-1000 | $1000-2000 |
| **Total BOM** | **$1,250-2,800** | **$3,800-8,300** | **$8,800-19,900** |

### Fleet Operations (Annual per 10K vehicles)

| Category | Cost | Notes |
|----------|------|-------|
| Cloud Infrastructure | $5-10M | Compute, storage, network |
| Map Licensing | $2-5M | HD map providers |
| Connectivity (cellular) | $1-2M | Telemetry, OTA |
| Remote Operations Center | $3-5M | Teleops staff, systems |
| ML Training Compute | $5-15M | GPU clusters |
| Software Licensing | $2-5M | Tools, platforms |
| **Total Annual** | **$18-42M** | $1,800-4,200 per vehicle |
