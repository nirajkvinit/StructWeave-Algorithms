# Interview Guide — Industrial IoT Platform

## 1. 45-Minute Pacing Guide

### Phase 1: Requirements Clarification (5 minutes)

**What to establish upfront:**

| Question | Why It Matters |
|---|---|
| "What type of industry — manufacturing, oil & gas, utilities, or mixed?" | Determines protocol landscape (Modbus-heavy vs. OPC UA-heavy), safety requirements (SIL levels), compliance frameworks (FDA vs. NERC CIP) |
| "How many facilities and sensors?" | 1 plant with 10K sensors vs. 100 plants with 10M sensors changes everything — single instance vs. multi-tenant, single-region vs. global |
| "What protocols do the field devices use?" | Legacy Modbus-only vs. modern OPC UA fundamentally changes edge complexity and determines whether protocol translation is needed |
| "Are there safety-critical control loops?" | If yes: edge processing is mandatory, not optional; data diodes may be required; ISA/IEC 62443 zones become critical |
| "What's the required data retention period?" | 90 days for dashboards vs. 30 years for regulatory compliance (pharma, nuclear) — changes storage architecture completely |
| "Is predictive maintenance a requirement, or just monitoring?" | Adds ML pipeline, feature engineering, model lifecycle — significant complexity |

**Clarifying questions that impress interviewers:**
- "Should the platform continue operating during cloud disconnection, or is it acceptable for operations to degrade?"
- "Do we need to send commands to actuators, or is this read-only telemetry?"
- "Are there explosion-proof or intrinsically safe requirements for edge hardware?"
- "Is cross-facility analytics needed (comparing performance across plants), or is each facility isolated?"

### Phase 2: High-Level Architecture (10 minutes)

**Draw these components on the whiteboard:**

1. **Field Layer** — Sensors, PLCs, OPC UA servers (the physical world)
2. **Edge Layer** — Protocol translation gateways, edge compute runtime, local rule engine, store-and-forward buffer
3. **Cloud Gateway** — MQTT Sparkplug B broker cluster for telemetry ingestion
4. **Stream Processing** — Ingestion pipeline (normalize, validate, enrich), complex event processing, alert correlation
5. **Core Services** — Organized by domain:
   - Digital Twin (state sync, physics simulation, what-if)
   - Maintenance (predictive ML, work orders, health scoring)
   - Device Management (registry, OTA updates, configuration)
   - Operations (dashboards, reporting, KPI calculation)
6. **Data Layer** — Time-series DB (telemetry), asset DB (hierarchy), twin state DB, cache (current values), data lake (ML training)

**Key narrative:** "The core architectural insight is the OT/IT boundary. The field layer speaks Modbus and OPC UA—deterministic, safety-critical protocols. The cloud speaks MQTT and REST. The edge gateway is the protocol translator and safety boundary that bridges these worlds. Everything above the edge is cloud-native and horizontally scalable. Everything below is deterministic and safety-constrained. The edge itself must be autonomous—it continues operating local rules and buffering data during cloud disconnection because a pressure sensor can't wait for a cloud round-trip to decide if it should trigger a safety alarm."

### Phase 3: Deep Dive (20 minutes)

The interviewer will likely ask you to dive into one of these areas. Be prepared for all:

**Option A: Sensor Data Ingestion at Scale**
- MQTT Sparkplug B protocol: birth/death certificates, metric aliasing, report-by-exception
- Protocol translation: Modbus register maps → Sparkplug B metrics → TSDB writes
- Report-by-exception economics: 100–1000x data reduction for stable measurements
- Ingestion pipeline stages: deserialize → validate → enrich → fan-out
- Time-series database selection: write throughput, compression, downsampling, retention
- Handle store-and-forward replay: backfill-aware ingestion with priority separation

**Option B: Edge Processing Architecture**
- Why edge processing is a safety requirement (not a performance optimization)
- Local rule engine: compiled decision trees, guaranteed worst-case execution time
- Store-and-forward buffer: priority-based retention (safety events never evicted)
- Edge-cloud state synchronization: configuration push, rule deployment, state reconciliation
- Edge hardware constraints: industrial-grade, -40 to +70°C, fanless, DIN rail
- OTA firmware updates: A/B partition scheme, cryptographic verification, staged rollouts

**Option C: Digital Twin Synchronization**
- What makes an industrial digital twin different from a database copy: physics simulation
- State synchronization from live sensors via Kalman filtering / sensor fusion
- Physics model execution: thermal models, mechanical stress, fluid dynamics
- Anomaly detection: residual analysis (actual vs. physics-predicted values)
- What-if analysis: forking twin state, modifying parameters, simulating outcomes
- Multi-fidelity twins: lightweight edge twin for local decisions, detailed cloud twin for deep analysis

**Option D: Alert Correlation and Alarm Management**
- ISA-18.2 alarm lifecycle: ACTIVE → ACKNOWLEDGED → CLEARED → NORMAL
- Correlation dimensions: temporal, topological, causal, statistical
- Alarm flood handling: first-out analysis, priority filtering, summary generation
- Why uncorrelated alarms cause "alarm fatigue" (operator ignores all alarms)
- Alarm rationalization: mapping cause-effect chains in the alarm database
- Shelving and suppression: temporary suppression with audit trail

### Phase 4: Trade-offs and Extensions (10 minutes)

**Key trade-offs to discuss proactively:**

| Trade-off | Option A | Option B | Your Recommendation |
|---|---|---|---|
| **Edge intelligence** | Thin edge (relay data to cloud) | Smart edge (local rules, ML, digital twin) | Smart edge for safety; thin edge adequate for monitoring-only |
| **Protocol standardization** | Translate everything to Sparkplug B at edge | Allow multiple protocols to cloud | Standardize to Sparkplug B at edge; reduces cloud complexity by 10x |
| **Data completeness vs. bandwidth** | Send all samples (high bandwidth) | Report-by-exception (low bandwidth) | Report-by-exception with configurable deadband; heartbeat ensures liveliness |
| **TSDB vs. historian** | Purpose-built TSDB (cloud-native) | Traditional process historian (proven in OT) | TSDB for new platform; historian bridge for legacy integration |
| **Digital twin fidelity** | Lightweight statistical model (fast, approximate) | Full physics simulation (accurate, compute-intensive) | Both: lightweight at edge for real-time, full physics in cloud for prediction |
| **OTA update strategy** | Immediate update (latest security patches) | Conservative update (minimize disruption) | Staged rollout during maintenance windows; emergency patches expedited |

---

## 2. Common Interview Questions

### 2.1 System Design Questions

**Q: "How would you handle an edge gateway that has been offline for a week and reconnects with millions of buffered data points?"**

**Strong answer:**
"The edge gateway has a 168-hour store-and-forward buffer on local encrypted SSD, organized by priority: safety events are never evicted, critical process data is evicted last, and diagnostic data is evicted first. On reconnect, the gateway publishes a Sparkplug B BIRTH certificate to re-establish metric definitions. Then it drains the buffer chronologically, interleaving buffered data with new real-time data. The cloud ingestion pipeline detects backfill mode from timestamps in the past and routes backfill to a dedicated consumer group that writes to the TSDB at lower priority—so real-time data from other gateways isn't starved. The alert engine suppresses threshold alerts on backfill data (they're historical), but processes trend alerts. The current value cache only updates with the latest point from the backfill, not every intermediate value. Once buffer timestamps catch up to current time, the gateway seamlessly transitions back to real-time mode."

**Q: "How would you design the protocol translation layer for a factory with Modbus, OPC UA, and PROFINET devices?"**

**Strong answer:**
"The edge gateway runs protocol-specific adapters as plug-in modules. The Modbus adapter polls registers at configured intervals and maps register addresses to meaningful tag names using a configuration template—for example, Modbus register 40001 maps to 'TT-4201.PV', data type FLOAT32, big-endian byte order. The OPC UA adapter subscribes to OPC UA server nodes using monitored items with configurable sampling intervals. The PROFINET adapter participates in the cyclic data exchange within the PROFINET cycle time.

All three adapters output data into a common internal bus format: (tag_name, value, quality, timestamp). From there, the Sparkplug B publisher applies report-by-exception filtering, batches changed metrics into a protobuf payload, and publishes to the MQTT broker. The key design decision is that all protocol translation happens at the edge—the cloud only ever sees Sparkplug B. This means adding a new protocol just requires a new edge adapter plugin, with zero changes to cloud services."

### 2.2 Scale Questions

**Q: "How do you handle 5 million data points per second?"**

**Strong answer:**
"The pipeline is designed for horizontal scaling at every stage:
1. **MQTT layer**: Topic-based sharding across broker nodes. Each broker handles 50K connections. At 5M pts/sec, we need ~10 broker nodes.
2. **Stream processing**: Partitioned by measurement_point_id for uniform distribution. At 5M pts/sec with 100 partitions, each partition handles 50K pts/sec—well within a single consumer's capacity.
3. **TSDB writes**: Micro-batched in 100ms windows. 100ms × 5M pts/sec = 500K points per batch. With 10 TSDB shards, each shard receives 50K points per batch—comfortably within write capacity.
4. **Current value cache**: Only the latest value per sensor is stored. Even with 10M sensors, that's 10M cache entries × 100 bytes = ~1 GB—fits in memory easily.

The key insight is that sensor telemetry is embarrassingly parallel—each sensor's data is independent. There are no cross-sensor transactions in the hot path. The only cross-sensor operation is alert correlation, which is scoped to equipment/facility boundaries."

**Q: "How do you handle 30 years of data retention affordably?"**

**Strong answer:**
"Tiered storage with automatic downsampling is the key. Raw sensor data at 1-second intervals means 31.5M points per sensor per year. For 100K sensors, that's 3.15 trillion points per year. Storing raw for 30 years is prohibitively expensive.

The solution: raw data is kept for 90 days on SSD (queries need sub-second response). After 90 days, continuous aggregation reduces data to 1-minute averages, stored on HDD. After 2 years, it becomes 15-minute averages on object storage. After 10 years, it becomes 1-hour averages on archive storage.

The math: 1 year of raw data = ~73 TB (compressed). 1 year of 1-minute aggregations = ~1.2 TB. 1 year of 1-hour aggregations = ~20 GB. So 30 years of data costs roughly: 18 TB (hot) + 5 TB (warm) + 3 TB (cold) + 600 GB (archive) = ~27 TB total. Compare to 30 × 73 TB = 2.19 PB if we kept everything raw. That's an 80x reduction."

### 2.3 Trade-off Questions

**Q: "Why not just use OPC UA end-to-end instead of translating to MQTT Sparkplug B?"**

**Strong answer:**
"OPC UA is excellent within the plant—it's the gold standard for structured industrial data with rich information models, method calls, and type hierarchies. But it has fundamental scaling limitations for cloud integration:

1. **Client-server model**: OPC UA uses a client-server architecture where the server must maintain state for every connected client. At platform scale with 100+ facilities, the OPC UA server model doesn't scale well—each server can handle hundreds of clients, not thousands.

2. **Bandwidth**: OPC UA messages are verbose—XML or binary but with full type information. MQTT Sparkplug B uses protobuf with metric aliasing, reducing bandwidth by 60–80%.

3. **Report-by-exception**: Sparkplug B has native report-by-exception semantics. OPC UA has monitored items with deadband, but combining this with MQTT's lightweight pub/sub model is more efficient at the network level.

4. **Session management**: MQTT handles persistent sessions natively with Last Will and Testament for disconnect detection. OPC UA requires client-side session management with keepalive polling.

The sweet spot is OPC UA within the plant (rich, structured, standards-based) and MQTT Sparkplug B for edge-to-cloud transport (lightweight, scalable, report-by-exception). The edge gateway bridges the two."

**Q: "Why is edge processing a requirement and not just an optimization?"**

**Strong answer:**
"Three reasons that make edge processing non-negotiable in industrial settings:

First, **safety timing**: A pressure relief valve must open within milliseconds of detecting overpressure. Cloud round-trip latency is 50–500ms in the best case, and infinite during network outages. The edge rule engine evaluates safety conditions in < 10ms with guaranteed worst-case execution time.

Second, **regulatory compliance**: Standards like ISA/IEC 62443 require safety-critical systems to be isolated from IT networks. A safety alarm that depends on a cloud service violates the fundamental principle of safety system independence. The edge runs autonomously in its own security zone.

Third, **connectivity reality**: Remote industrial sites (offshore platforms, pipelines, mines) often have satellite-only connectivity at 256 Kbps with 600ms latency and frequent outages. The edge must continue full local operations during extended disconnection—and it does, with a 168-hour store-and-forward buffer."

---

## 3. Trap Questions and Common Mistakes

### 3.1 Trap Questions

**Trap: "Can we skip the edge layer and connect sensors directly to the cloud?"**

**Why it's a trap:** Tests whether you understand OT protocol reality and safety requirements.

**Correct response:** "Most industrial sensors don't speak MQTT or HTTP—they speak Modbus RTU over RS-485 serial or communicate via PROFINET on an industrial Ethernet network. These protocols require a gateway for protocol translation. Even for smart sensors with MQTT capability, connecting directly to the cloud bypasses the safety architecture. The edge provides protocol translation, local safety logic, network isolation (ISA/IEC 62443 zone separation), and data buffering during connectivity loss. Skipping the edge means no local safety response, no store-and-forward during outages, and exposing the OT network directly to the internet—which violates every industrial security standard."

**Trap: "Why not use a regular relational database for sensor data?"**

**Why it's a trap:** Tests understanding of time-series data characteristics at scale.

**Correct response:** "At 1 million writes per second, a relational database would struggle for three reasons: First, B-tree indexes require random I/O on every write—time-series databases use LSM trees or append-only structures optimized for sequential writes. Second, sensor data has natural time-based access patterns (query by time range), which time-series databases exploit for partitioning, compression, and query optimization. Third, automated downsampling and retention policies are critical for 30-year retention—purpose-built TSDBs provide this natively. A relational database works for 1,000 sensors. At 1 million sensors with 30-year retention, you need a purpose-built TSDB.

That said, we still use a relational database—for the asset hierarchy, equipment metadata, alarm configuration, and maintenance records. It's polyglot persistence: each data type in the database engine optimized for its access pattern."

**Trap: "Can we process all alarms in the cloud? Do we really need edge alerting?"**

**Why it's a trap:** Tests understanding of safety-critical real-time requirements.

**Correct response:** "For monitoring-only applications, cloud alerting is fine. But for safety-critical processes, edge alerting is mandatory. A compressor surge detection algorithm must act within 20ms to prevent catastrophic compressor damage. A cloud round-trip adds 50-500ms of latency—too slow by an order of magnitude. Even worse, during a network outage, cloud alerting stops entirely, leaving the process unprotected. The edge rule engine provides deterministic sub-10ms response regardless of cloud connectivity. Cloud alerting is complementary—it provides correlation, escalation, and analytics that the edge can't do. But the edge is the safety net."

### 3.2 Common Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Treating IIoT like consumer IoT | Industrial protocols, safety requirements, and 20+ year device lifecycles are fundamentally different | Design for OT protocol diversity, safety integrity levels, and decades of device support |
| Ignoring protocol translation complexity | "Just connect sensors to MQTT" ignores Modbus, PROFINET, EtherNet/IP reality | Design a flexible protocol adapter framework at the edge |
| Single database for everything | Sensor time-series, asset hierarchy, and alarm state have completely different access patterns | Polyglot persistence: TSDB + relational + cache |
| Overlooking ISA/IEC 62443 | Industrial security isn't just IT security; OT zones require physical network separation | Design zone and conduit architecture from the start |
| No store-and-forward design | Assuming reliable connectivity to cloud | Edge buffer is mandatory; design for extended disconnection |
| Ignoring alarm management | "Just send threshold alerts" leads to alarm fatigue | Design correlation engine with ISA-18.2 lifecycle |
| Flat sensor namespace | No asset hierarchy context for sensor data | ISA-95 hierarchical asset model is essential for meaningful data |
| Underestimating report-by-exception | Assuming every sensor sends data every second | Report-by-exception reduces data volume 100-1000x; design for sparse data |

---

## 4. Interview Scoring Rubric

### 4.1 What Strong Candidates Demonstrate

| Signal | Evidence | Level |
|---|---|---|
| **OT protocol awareness** | Discusses Modbus, OPC UA, PROFINET naturally; understands polling vs. subscription | Staff |
| **Safety-first thinking** | Mentions edge-local safety decisions, ISA/IEC 62443 zones, data diodes | Staff |
| **Sparkplug B knowledge** | Explains birth/death certificates, report-by-exception, metric aliasing | Staff |
| **Time-series data modeling** | Discusses compression (gorilla/delta-delta), downsampling, retention tiers | Senior+ |
| **Edge-cloud architecture** | Designs autonomous edge with store-and-forward; cloud is additive, not required | Staff |
| **Alarm management** | References ISA-18.2 lifecycle, alarm correlation, alarm flood handling | Staff |
| **Scale reasoning** | Back-of-envelope: 10M sensors × 0.1 pts/sec = 1M pts/sec; plans accordingly | Senior |
| **Digital twin understanding** | Distinguishes data copy from physics simulation; explains sensor fusion and prediction | Staff |
| **Security depth** | Zone and conduit model, not just "add TLS"; understands OT security is different from IT | Senior+ |

### 4.2 Red Flags

| Red Flag | What It Suggests |
|---|---|
| "Connect sensors directly to cloud via REST" | No understanding of OT protocols or network architecture |
| "Store everything in a relational database" | Hasn't considered time-series write volumes or query patterns |
| "Process all alerts in the cloud" | Missing safety-critical real-time requirements |
| "Use a single security model for IT and OT" | Doesn't understand ISA/IEC 62443 zone separation |
| "Assume reliable internet connectivity" | Hasn't worked with remote industrial environments |
| "Send all sensor data at 1Hz regardless" | Missing report-by-exception concept; 100-1000x wasted bandwidth |
| No mention of protocol translation | Assumes all devices speak MQTT natively |
| "Digital twin is just a database mirror" | Missing physics simulation, anomaly detection, prediction aspects |

---

## 5. Extension Scenarios

If time permits or the interviewer asks for extensions:

### 5.1 AI-Powered Process Optimization
- Closed-loop optimization: digital twin simulates parameter changes → deploy to physical process
- Reinforcement learning for setpoint optimization (energy, throughput, quality)
- Federated learning across facilities (learn from all plants without sharing raw data)
- Model interpretability requirements for operator trust

### 5.2 Multi-Cloud and Hybrid Deployment
- Some facilities require on-premises cloud (data sovereignty, air-gapped)
- Hybrid architecture: edge + on-prem private cloud + public cloud
- Data synchronization between on-prem and public cloud instances
- Consistent device management across deployment models

### 5.3 5G Private Network Integration
- Ultra-reliable low-latency communication (URLLC) for control loops
- Network slicing for guaranteed bandwidth per application class
- Massive machine-type communication (mMTC) for dense sensor deployments
- TSN (Time-Sensitive Networking) over 5G for deterministic communication

### 5.4 Augmented Reality for Maintenance
- AR overlay of digital twin data on physical equipment via headset
- Real-time sensor values floating above physical equipment
- Guided maintenance procedures with step-by-step AR instructions
- Remote expert assistance with shared AR view

---

*Next: [Insights ->](./09-insights.md)*
