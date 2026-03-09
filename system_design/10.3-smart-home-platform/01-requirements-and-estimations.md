# Requirements & Estimations — Smart Home Platform

## 1. Functional Requirements

### 1.1 Device Registry and Lifecycle Management

| Capability | Description |
|---|---|
| **Device Onboarding** | Automated discovery, pairing, and provisioning across Matter, Zigbee, Z-Wave, Wi-Fi, BLE protocols |
| **Device Types** | Lights, switches, sensors (motion, temperature, humidity, door/window), locks, cameras, thermostats, speakers, appliances, blinds, garage doors, irrigation |
| **Capability Model** | Standardized capability abstraction (on/off, brightness, color, temperature, motion, energy metering) independent of protocol |
| **Device Metadata** | Manufacturer, model, firmware version, protocol, capabilities, room assignment, custom name |
| **Device Grouping** | Logical grouping by room, floor, zone, and custom groups for batch operations |
| **Device Removal** | Clean decommissioning with factory reset, cloud state cleanup, and automation rule impact analysis |

**Key Operations:**
- Discover, pair, configure, rename, move, group, and remove devices
- Query device capabilities and supported commands
- Assign devices to rooms and homes
- Transfer device ownership between users
- Bulk operations on device groups

### 1.2 Device Command and Control

| Capability | Description |
|---|---|
| **Command Dispatch** | Send commands to individual devices or groups with at-least-once delivery guarantee |
| **Command Sources** | Mobile app, voice assistant, automation engine, third-party integrations, physical controls |
| **Command Types** | State changes (on/off, brightness, temperature), configuration updates, diagnostic requests |
| **Batch Commands** | Scene activation that sends coordinated commands to multiple devices atomically |
| **Command Queuing** | Queue commands for offline devices; deliver when connectivity is restored |
| **Command Acknowledgment** | Track command delivery and execution status with timeout-based failure detection |

**Critical Guarantees:**
- Commands must be idempotent (setting brightness to 50% twice has same result as once)
- No command should be silently dropped — failures must be surfaced to the user
- Safety-critical commands (lock, alarm) must have higher delivery priority
- Command execution ordering within a scene must be deterministic

### 1.3 Device State Management (Digital Twin)

| Capability | Description |
|---|---|
| **Desired State** | The state requested by the user or automation — what the device SHOULD be |
| **Reported State** | The actual state reported by the device — what the device IS |
| **State Delta** | Automatic detection and reconciliation of desired vs. reported discrepancies |
| **State History** | Time-series log of all state changes for analytics and debugging |
| **State Notification** | Real-time push of state changes to subscribed clients (app, automation engine) |
| **Offline State** | Persist desired state for offline devices; reconcile when device reconnects |

### 1.4 Automation Rules Engine

| Capability | Description |
|---|---|
| **Trigger Types** | Device state change, time/schedule, sunrise/sunset, geolocation (arrive/leave), manual activation |
| **Condition Evaluation** | Device state conditions, time windows, weather, occupancy, mode (home/away/sleep) |
| **Action Types** | Device commands, scene activation, notifications, delay/wait, conditional branching |
| **Scenes** | Pre-defined multi-device state snapshots (e.g., "Movie Night": dim lights, close blinds, turn on TV) |
| **Routines** | Sequenced multi-step automations with delays and conditions between steps |
| **Conflict Resolution** | Priority-based resolution when multiple rules target the same device simultaneously |
| **Mode System** | Home/Away/Sleep/Vacation modes that enable/disable automation groups |

**Rule Definition Model:**
1. User creates rule with one or more triggers
2. Platform validates rule for conflicts with existing rules
3. Rule is compiled to edge-executable format and pushed to hub
4. On trigger, conditions are evaluated locally (if possible) or in cloud
5. Actions execute with retry logic and failure notification
6. Rule execution is logged for debugging and analytics

### 1.5 Voice Control Integration

| Capability | Description |
|---|---|
| **Intent Recognition** | Map natural language to device commands ("turn off the kitchen lights") |
| **Entity Resolution** | Resolve ambiguous device names using room context and usage patterns |
| **Multi-Turn Dialog** | Handle follow-up commands ("dim them to 50%") using conversation context |
| **Proactive Suggestions** | Suggest automations based on repeated voice patterns |
| **Multi-Language** | Support for 20+ languages with locale-specific device naming |

### 1.6 Home and User Management

| Capability | Description |
|---|---|
| **Home Structure** | Hierarchical model: home → floor → room → device |
| **Multi-User** | Multiple users per home with role-based access (owner, member, guest) |
| **Multi-Home** | Single user can manage multiple homes (primary residence, vacation home, rental) |
| **Guest Access** | Time-limited, scope-limited access for guests (e.g., front door lock only) |
| **Activity Log** | Audit trail of all user actions, device events, and automation executions |
| **Presence Detection** | Track which household members are home using phone location, motion sensors |

### 1.7 Energy Management

| Capability | Description |
|---|---|
| **Energy Monitoring** | Real-time energy consumption per device, room, and home |
| **Usage Analytics** | Historical trends, cost estimation, efficiency scoring |
| **Smart Scheduling** | Schedule high-energy devices during off-peak hours |
| **Solar Integration** | Coordinate device usage with solar generation and battery storage |
| **Demand Response** | Participate in utility demand-response programs via automated load shedding |

### 1.8 OTA Firmware Updates

| Capability | Description |
|---|---|
| **Staged Rollouts** | Progressive firmware distribution (1% → 10% → 50% → 100%) |
| **Delta Updates** | Binary diff-based updates to minimize bandwidth on constrained devices |
| **Automatic Rollback** | Detect failed updates and revert to previous firmware |
| **Update Scheduling** | Schedule updates during low-activity periods (typically 2-4 AM) |
| **Version Tracking** | Track firmware versions across all devices for vulnerability management |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Metric | Target | Rationale |
|---|---|---|
| **Local command latency (p50)** | < 30ms | Physical switch should feel instantaneous |
| **Local command latency (p99)** | < 100ms | Even worst-case local should be imperceptible |
| **Cloud command latency (p50)** | < 150ms | App-to-device via cloud should feel responsive |
| **Cloud command latency (p99)** | < 500ms | Acceptable worst case for non-critical commands |
| **Automation rule evaluation** | < 20ms | Rule triggers must be near-instantaneous |
| **State sync (hub-to-cloud)** | < 2s | Cloud dashboard should reflect reality within seconds |
| **Voice command end-to-end** | < 1.5s | Wake word to device action complete |
| **Device discovery** | < 30s | New device should appear in app within 30 seconds of powering on |

### 2.2 Availability and Reliability

| Metric | Target | Rationale |
|---|---|---|
| **Cloud platform availability** | 99.95% | ~4.4 hours downtime per year |
| **Local operation availability** | 99.99%+ | Critical home functions must work during internet outages |
| **Command delivery rate** | 99.9% | 1 in 1000 commands may require retry |
| **Automation execution reliability** | 99.95% | Automations should fire reliably |
| **Data durability** | 99.999999% | Device configurations must not be lost |
| **Hub failover** | < 5s | Secondary hub takes over if primary fails |

### 2.3 Scalability

| Dimension | Requirement |
|---|---|
| **Horizontal scaling** | Cloud services auto-scale independently based on load |
| **Home isolation** | Per-home partitioning to prevent noisy-neighbor effects |
| **Device density** | Support 200+ devices per home without degradation |
| **Concurrent connections** | Handle millions of persistent MQTT connections |
| **Event throughput** | Process 1M+ device events per second globally |
| **Geographic distribution** | Multi-region deployment for latency and data residency |

### 2.4 Privacy and Security

| Requirement | Description |
|---|---|
| **Data minimization** | Collect only data necessary for platform operation |
| **Camera/mic data** | Never transmit raw video/audio to cloud without explicit user consent |
| **End-to-end encryption** | Sensitive device data encrypted from hub to cloud |
| **Device authentication** | Mutual TLS with per-device certificates for cloud communication |
| **Local-only option** | Users can designate devices as local-only (no cloud telemetry) |
| **Data portability** | Users can export all their data in machine-readable format |

---

## 3. Capacity Estimations

### 3.1 Device and Home Volume

```
Assumptions:
- 80 million homes on the platform
- Average 20 devices per home
- Total devices = 80M × 20 = 1.6 billion devices

Device type distribution:
- Lights/switches: 35% = 560M
- Sensors (motion, temp, door): 25% = 400M
- Cameras: 10% = 160M
- Thermostats/climate: 8% = 128M
- Locks/security: 7% = 112M
- Speakers/displays: 8% = 128M
- Other (blinds, appliances, irrigation): 7% = 112M
```

### 3.2 Event Volume

```
Event generation rates (per device per hour):
- Sensors: 60 events/hour (1/minute: temp, humidity, motion)
- Lights/switches: 5 events/hour (state changes)
- Cameras: 120 events/hour (motion clips, thumbnails)
- Thermostats: 12 events/hour (temp readings every 5 min)
- Locks: 3 events/hour (lock/unlock events)
- Other: 6 events/hour (average)

Weighted average: ~30 events/device/hour

Total events:
- Per hour: 1.6B × 30 = 48B events/hour
- Per second: 48B / 3600 = ~13.3M events/second (raw sensor data)
- After edge aggregation (10:1 reduction): ~1.33M events/second to cloud
- Peak multiplier (3x, evening hours): ~4M events/second

Design target: 5M events/second (with headroom)
```

### 3.3 Command Volume

```
Command generation:
- Average 10 user-initiated commands per home per day
- Average 50 automation-triggered commands per home per day
- Total commands per home per day: 60

Global commands:
- Daily: 80M × 60 = 4.8B commands/day
- Average CPS: 4.8B / 86,400 = ~55,500 commands/second
- Peak CPS (6-10 PM): ~165,000 commands/second

Design target: 200,000 commands/second
```

### 3.4 Storage Estimation

```
Device registry record size:
- Device ID: 16 bytes
- Home ID: 16 bytes
- Metadata (name, room, type, capabilities): ~512 bytes
- Shadow state (desired + reported): ~1 KB
- Total per device: ~1.5 KB

Device registry storage:
- 1.6B devices × 1.5 KB = ~2.4 TB

Device event storage (time-series):
- Event size (compressed): ~100 bytes
- Daily events reaching cloud: 1.33M/s × 86,400 = ~115B events/day
- Daily storage: 115B × 100 bytes = ~11.5 TB/day
- 30-day hot retention: ~345 TB
- 1-year warm retention: ~4.2 PB (with 10:1 downsampling after 30 days)

Automation rules:
- Average 8 rules per home
- Rule definition: ~2 KB per rule
- Total: 80M × 8 × 2 KB = ~1.3 TB

Shadow state change log:
- ~200 bytes per state change
- 55,500 changes/sec × 200 bytes × 86,400 = ~960 GB/day
```

### 3.5 Network Traffic

```
MQTT connections:
- One persistent connection per hub: 80M connections
- One connection per directly connected device (Wi-Fi): ~400M connections
- Design for: 500M concurrent MQTT connections

MQTT message traffic:
- Upstream (device → cloud): ~1.33M messages/second
- Downstream (cloud → device): ~55,500 commands/second
- Keepalive pings (every 60s): ~8M pings/second
- Total MQTT messages: ~10M messages/second

Mobile app connections:
- Active app sessions: ~10% of homes = 8M concurrent WebSocket connections
- Push notifications: ~200M notifications/day
```

---

## 4. Service Level Objectives (SLOs)

### 4.1 Tiered SLO Framework

| Tier | Service | Availability | Latency (p99) | Error Budget |
|---|---|---|---|---|
| **Tier 0** | Local device command (hub→device) | 99.99% | 100ms | 52.6 min/year |
| **Tier 0** | Safety automations (smoke, water leak) | 99.99% | 50ms | 52.6 min/year |
| **Tier 1** | Cloud device command (app→device) | 99.95% | 500ms | 4.38 hrs/year |
| **Tier 1** | Automation rule evaluation (cloud) | 99.95% | 200ms | 4.38 hrs/year |
| **Tier 1** | Device state sync (hub→cloud) | 99.95% | 5s | 4.38 hrs/year |
| **Tier 2** | Voice command processing | 99.9% | 2s | 8.76 hrs/year |
| **Tier 2** | OTA firmware updates | 99.9% | N/A (batch) | 8.76 hrs/year |
| **Tier 3** | Energy analytics dashboard | 99.5% | 3s | 43.8 hrs/year |
| **Tier 3** | Historical data queries | 99.5% | 5s | 43.8 hrs/year |

### 4.2 Device Reliability SLOs

| Metric | Target |
|---|---|
| **Command delivery success rate** | 99.9% within 3 retries |
| **State synchronization accuracy** | Desired == Reported within 30s for online devices |
| **Automation trigger accuracy** | 99.95% of triggers correctly fire within 5s of event |
| **OTA update success rate** | 99.5% of targeted devices successfully update |
| **Device discovery success rate** | 95% of supported devices pair on first attempt |

### 4.3 Edge (Hub) SLOs

| Metric | Target |
|---|---|
| **Local rule evaluation** | < 20ms (p99) |
| **Protocol message processing** | < 10ms per message |
| **Hub boot time** | < 30s from power-on to operational |
| **Offline autonomy duration** | Indefinite for cached rules and paired devices |
| **Hub-to-cloud reconnect** | < 10s after internet restoration |

---

## 5. Constraint Analysis

### 5.1 Protocol Constraints

| Constraint | Impact |
|---|---|
| **Zigbee mesh limit** | ~200 devices per Zigbee network; some end devices limit mesh depth |
| **Z-Wave node limit** | 232 devices per Z-Wave network (protocol specification limit) |
| **Matter commissioning** | Requires Thread border router or Wi-Fi for IP-based communication |
| **BLE range** | ~10m effective range; requires BLE mesh or bridge for whole-home coverage |
| **Wi-Fi band congestion** | Too many Wi-Fi devices degrade network performance; prefer low-power protocols |
| **Thread network size** | ~250 devices per Thread partition; supports multiple partitions |

### 5.2 Edge Hardware Constraints

| Constraint | Impact |
|---|---|
| **Hub CPU** | ARM-based processor (quad-core, 1-2 GHz); limits local ML inference |
| **Hub RAM** | 512MB - 2GB; bounds the number of cached rules and shadow states |
| **Hub storage** | 4-16 GB flash; limits local event history and firmware cache |
| **Power consumption** | Hub must operate within 5-15W for always-on operation |
| **Radio concurrency** | Limited simultaneous protocol operations across shared radio hardware |

### 5.3 Operational Constraints

| Constraint | Impact |
|---|---|
| **Consumer expectations** | Non-technical users expect zero-configuration experience |
| **Device diversity** | Must integrate devices from hundreds of manufacturers |
| **Firmware fragmentation** | Devices in the field running firmware versions spanning years |
| **Network variability** | Home networks range from excellent to barely functional |
| **Power reliability** | Some devices are battery-powered with months-long battery life requirements |

---

*Next: [High-Level Design →](./02-high-level-design.md)*
