# Interview Guide — Smart Home Platform

## 1. 45-Minute Pacing Guide

### Phase 1: Requirements Clarification (5 minutes)

**What to establish upfront:**

| Question | Why It Matters |
|---|---|
| "What's the scale — how many homes and devices per home?" | Drives MQTT broker sizing, partitioning, and event processing architecture |
| "Which protocols must we support?" | Determines hub hardware and protocol bridge complexity |
| "Must the system work without internet?" | This is the key differentiator — offline-first changes everything |
| "Do we need voice control integration?" | Adds NLU pipeline, entity resolution, and latency constraints |
| "What's the automation complexity — simple triggers or complex rules?" | Determines whether a lightweight rule engine or full CEP system is needed |
| "Are cameras in scope?" | Cameras add orders of magnitude more data, privacy concerns, and streaming infrastructure |

**Clarifying questions that impress interviewers:**
- "Should automations run locally on the hub or in the cloud, or both?"
- "What's the expected device density per home — 10 or 200?"
- "Do we need to support Matter, or is a proprietary protocol sufficient?"
- "How do we handle multiple users in a home with conflicting preferences?"

### Phase 2: High-Level Architecture (10 minutes)

**Draw these components on the whiteboard:**

1. **Edge Layer** — Home hub with protocol radios (Zigbee, Z-Wave, Thread, BLE), local rule engine, local state cache
2. **Connectivity Layer** — MQTT broker cluster for device communication, WebSocket for app push
3. **API Gateway** — REST APIs for apps, OAuth 2.0, rate limiting
4. **Core Services** — Device Registry, Shadow Service (digital twin), Command Dispatcher
5. **Automation Engine** — Trigger-condition-action rule evaluation with conflict resolution
6. **Data Layer** — Device registry database, time-series store, event streaming platform
7. **Intelligence Layer** — Voice NLU, energy analytics, anomaly detection

**Key narrative:** "The core architectural insight is the hybrid edge-cloud model. The hub runs a local rule engine with cached automation rules, providing sub-50ms command execution and offline resilience. The cloud provides the management plane, cross-home intelligence, and voice processing. The device shadow pattern — maintaining desired and reported state for every device — decouples command issuers from the physical device, enabling offline command queueing and state reconciliation."

### Phase 3: Deep Dive (20 minutes)

The interviewer will likely ask you to dive into one of these areas. Be prepared for all:

**Option A: Device Shadow / Digital Twin**
- Desired state vs. reported state pattern
- State synchronization between hub and cloud
- Conflict resolution when multiple sources update desired state
- Offline command queueing and reconciliation on reconnect
- Version tracking for ordering and deduplication

**Option B: Automation Rules Engine**
- Trigger-condition-action model
- Local (hub) vs. cloud execution decision
- Rule compilation for edge devices
- Conflict resolution when rules target the same device
- Time-based triggers with timezone and sunrise/sunset calculation

**Option C: Protocol Translation and Scalability**
- Capability-based device abstraction
- Zigbee ZCL → platform capability mapping
- Matter cluster model integration
- MQTT broker scaling for millions of persistent connections
- Event processing at 1M+ events/second

### Phase 4: Scalability, Reliability, and Trade-offs (8 minutes)

**Must cover:**
- Home-based partitioning as the natural sharding key
- MQTT broker cluster scaling (consistent hash by home_id)
- Hub offline resilience (edge-cloud split)
- Reconnection thundering herd prevention (jitter, rate limiting)
- Multi-region deployment for latency and data residency

**Key trade-off discussions:**
- Local vs. cloud rule execution (latency vs. capability)
- Eventual consistency for device state (acceptable for non-safety devices)
- Protocol diversity vs. abstraction cost
- Edge hardware constraints vs. local intelligence

### Phase 5: Wrap-Up (2 minutes)

Touch on:
- Security (per-device certificates, OTA firmware signing, camera privacy)
- Observability (device health scoring, fleet-wide firmware tracking)
- One unique insight (capability abstraction surviving protocol transitions, automation conflict resolution)

---

## 2. Key Trade-offs to Discuss

### 2.1 Local vs. Cloud Rule Execution

| Aspect | Local (Hub) | Cloud |
|---|---|---|
| **Latency** | < 50ms | 200-500ms |
| **Offline** | Works without internet | Requires internet |
| **Data access** | Local device state only | Weather, geolocation, user calendar |
| **Compute** | Constrained (ARM, 1-2GB RAM) | Unlimited |
| **Rule complexity** | Simple trigger-condition-action | Complex event processing, ML-based |
| **Update cycle** | Rules pushed from cloud; cached locally | Evaluated in real-time |

**Interview answer:** "We use a hybrid model where the cloud compiles rules into an edge-executable format and pushes them to the hub. Simple rules (motion → light on, if after sunset) execute locally in < 50ms. Complex rules requiring external data (weather-based, geolocation triggers) evaluate in the cloud. The key insight is that most user-facing automations are simple enough for local execution, so the system remains responsive even without internet. Safety-critical automations (smoke alarm → turn on all lights) are always local."

### 2.2 Eventual Consistency for Device State

| Aspect | Strong Consistency | Eventual Consistency |
|---|---|---|
| **Where used** | Lock/unlock commands, safety actions | Light brightness, sensor readings |
| **Latency** | Higher (wait for device confirmation) | Lower (update shadow immediately) |
| **User experience** | Toggle waits for confirmation | Toggle is instant; occasional visual stale state |
| **Scale impact** | Requires synchronous device round-trip | Allows async processing |

**Interview answer:** "We use eventual consistency for most device state. When a user dims a light to 50%, the app updates the shadow's desired state immediately and shows the change optimistically. The hub delivers the command, and the device reports its actual state. If the light is offline, the desired state persists and is delivered when it reconnects. For security devices like locks, we use a stricter model — the app shows a loading state until the lock confirms execution, because showing 'locked' when it isn't is a safety issue."

### 2.3 Protocol Diversity vs. Unified Abstraction

| Aspect | Protocol-Specific | Capability Abstraction |
|---|---|---|
| **Feature access** | Full protocol features available | Limited to common capability set |
| **Rule portability** | Rules break when device changes | Rules survive device replacement |
| **Complexity** | N protocol-specific code paths | One abstract path + N translators |
| **Future-proofing** | Tied to current protocols | Survives protocol transitions (Zigbee → Matter) |

**Interview answer:** "We abstract devices into capabilities (on/off, brightness, motion, temperature) rather than exposing protocol-specific interfaces. This means a Zigbee bulb and a Matter bulb look identical to the automation engine. The trade-off is that some advanced protocol-specific features aren't accessible through the standard capability model. We handle this with 'extended capabilities' for power users, but the primary automation interface uses the abstraction. This decision pays off massively during the industry's transition to Matter — existing automations work with new Matter devices without any changes."

### 2.4 Hub Hardware Constraints vs. Local Intelligence

| Aspect | Thin Hub | Smart Hub |
|---|---|---|
| **Cost** | $15-25 (simple radio bridge) | $50-100 (full compute) |
| **Local processing** | None; all logic in cloud | Local rule engine, edge AI |
| **Offline capability** | None | Full local operation |
| **Scalability** | Cloud-only scaling | Distributed computation across hubs |
| **Update complexity** | Simple firmware | Complex edge software updates |

**Interview answer:** "The smart hub is essential for this system. A thin hub that just bridges protocols to the cloud fails the fundamental requirement: homes must work when the internet is down. The hub runs a local rule engine, caches device state, and can execute automations independently. The hardware cost ($50-100) is justified by eliminating cloud dependency for time-critical operations. The trade-off is update complexity — hub firmware updates must be carefully staged because a bad update bricks local home control."

---

## 3. Common Mistakes to Avoid

### 3.1 Architecture Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Cloud-only architecture | Home stops working when internet drops | Hybrid edge-cloud with local rule engine |
| Single MQTT broker | Cannot handle millions of connections | Horizontally scaled broker cluster with home-affinity routing |
| Polling devices for state | Wastes bandwidth and battery | Event-driven: devices push state changes |
| Global device state store | Cross-home operations are rare; this creates unnecessary scaling challenges | Partition by home_id |
| Treating all devices equally | A door lock has different reliability needs than a light | Tiered SLOs by device criticality |

### 3.2 Data Model Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| Single state field per device | Many devices have multiple capabilities | Capability-based model with independent state per capability |
| No desired/reported split | Cannot handle offline devices or command queueing | Device shadow with desired + reported + delta |
| Protocol-specific data model | Locks automations to specific protocols | Capability abstraction independent of protocol |
| No command idempotency | Retries cause devices to toggle repeatedly | Version-tracked idempotent commands |
| Storing device names in logs | Device names contain PII ("Grandma's bedroom") | Log device IDs only; resolve names at display time |

### 3.3 Scalability Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---|---|---|
| No rate limiting on device events | Malfunctioning sensor floods the pipeline | Per-device and per-home rate limits at hub |
| Full state sync on every reconnect | Millions of hubs reconnecting causes data storm | Incremental delta-based sync |
| Storing all sensor data at full resolution | Petabytes of mostly redundant temperature readings | Edge aggregation + tiered retention |
| No thundering herd protection | Region failure → all hubs reconnect at once → crush secondary | Random jitter + reconnection rate limiting |
| Monolithic rule evaluation | One busy home blocks rule processing for others | Partitioned evaluation with per-home isolation |

---

## 4. Trap Questions and How to Handle Them

### 4.1 "How do you handle conflicting automations?"

**Trap:** Candidate says "just execute them in order of creation" or "let the last one win."

**Correct:** "We use a priority-based conflict resolution system. Each automation rule has a priority level, and safety rules always take precedence. When two rules target the same device simultaneously — say, a motion rule turns lights on while a bedtime routine turns them off — the higher-priority rule wins. We also detect potential conflicts at rule creation time and warn the user, showing which existing rule would be overridden. Users can adjust priorities to match their intent. The conflict group concept links related rules targeting the same device/capability for efficient conflict checking."

### 4.2 "What happens when the hub is offline?"

**Trap:** Candidate says "everything still works through the cloud."

**Correct:** "When the hub loses internet, it enters offline mode. All locally-cached automation rules continue to execute — motion lights, security triggers, schedule-based actions all work without interruption. Time-based triggers use the hub's local clock, with sunrise/sunset pre-computed for 7 days. What DOESN'T work: remote access from outside the home, push notifications, weather-based conditions, and voice commands that require cloud NLU. On reconnect, the hub syncs all queued events and state changes with the cloud using a delta-based protocol to minimize bandwidth."

### 4.3 "How do you handle a device that's been physically changed?"

**Trap:** Candidate ignores the physical override scenario.

**Correct:** "Physical state changes are common — someone flips a wall switch, manually adjusts a thermostat, or turns a knob. When this happens, the device reports its new state to the hub, which updates the reported shadow state. Critically, we also update the desired state to match the reported state. We treat physical interaction as the highest-priority 'user intent' — if someone physically turned off a light, we shouldn't have an automation immediately turn it back on. The automation engine checks for recent physical interactions and suppresses conflicting automated actions for a configurable cooldown period (default: 5 minutes)."

### 4.4 "How do you scale MQTT to handle hundreds of millions of connections?"

**Trap:** Candidate says "one big MQTT broker" or "use HTTP instead."

**Correct:** "MQTT is essential for IoT because of its low overhead, persistent connections, and built-in offline message queueing. To scale to hundreds of millions of connections, we use a horizontally-scaled broker cluster. Each broker node handles ~100K persistent connections. We route connections using consistent hashing on home_id, so all devices in a home connect to the same broker node — this enables local topic fan-out without cross-broker messaging. Cloud services use shared subscriptions to consume events from all brokers. For connection state (persistent sessions), we externalize session storage to a distributed cache so that when a broker node fails, sessions can be restored on a different node."

### 4.5 "Why not just use HTTP for everything?"

**Trap:** Candidate agrees and drops MQTT.

**Correct:** "HTTP and MQTT serve different roles. MQTT is essential for the device side: it provides persistent bidirectional connections (so we can push commands to hubs without polling), has tiny packet overhead (important for constrained devices), built-in QoS levels (guaranteed delivery for commands), and native offline message queueing. HTTP is used for the user-facing API (RESTful, well-tooled, stateless). WebSockets provide real-time push to mobile apps. Using HTTP for devices would mean either constant polling (wastes battery and bandwidth) or complex long-polling hacks. MQTT is purpose-built for this use case."

---

## 5. Scoring Rubric (What Interviewers Look For)

### 5.1 Senior Engineer Level

| Criterion | Expectation |
|---|---|
| **Requirements** | Identifies offline operation as a critical requirement, not an afterthought |
| **Architecture** | Draws edge-cloud hybrid with hub, MQTT, and cloud services |
| **Data Model** | Uses device shadow with desired/reported pattern |
| **Protocol** | Understands why MQTT over HTTP for device communication |
| **Automation** | Designs trigger-condition-action model with some conflict awareness |

### 5.2 Staff Engineer Level

| Criterion | Expectation |
|---|---|
| **All of Senior, plus:** | |
| **Edge-Cloud Split** | Articulates what runs where and why; rule compilation for edge |
| **Protocol Abstraction** | Designs capability-based model independent of Zigbee/Z-Wave/Matter |
| **Conflict Resolution** | Priority-based resolution with safety overrides |
| **Scale** | MQTT broker partitioning, home-based sharding, thundering herd prevention |
| **Offline Sync** | Delta-based state reconciliation protocol on hub reconnection |

### 5.3 Principal/Architect Level

| Criterion | Expectation |
|---|---|
| **All of Staff, plus:** | |
| **Matter Integration** | Understands Matter's role in protocol unification; multi-admin challenges |
| **Privacy Architecture** | Camera/microphone data handling with zero-knowledge encryption |
| **Fleet Operations** | Device health scoring, staged OTA rollouts, firmware vulnerability management |
| **Ecosystem Thinking** | Partner API design, third-party integration, platform economics |
| **Operational Resilience** | Region failover for hubs, chaos engineering, graceful degradation modes |

---

## 6. Variation Questions

| Variation | Key Difference |
|---|---|
| "Design a smart building management system" | Enterprise scale: 1000s of devices per building, BACnet/Modbus protocols, HVAC optimization, energy compliance |
| "Design an industrial IoT monitoring platform" | Reliability/safety-critical, Modbus/OPC-UA protocols, predictive maintenance, regulatory compliance |
| "Design a voice assistant backend" | Focus on NLU pipeline, intent routing, multi-skill architecture, conversation state management |
| "Design a fleet of delivery robots" | Mobility adds GPS/mapping, real-time path planning, collision avoidance, remote teleoperation |
| "Design a smart grid / energy management platform" | Utility-scale, demand response, grid stability, regulatory metering, bidirectional energy flow |
| "Design a connected car platform" | High-speed mobility, cellular connectivity, safety-critical systems, V2X communication |

---

*Next: [Insights →](./09-insights.md)*
