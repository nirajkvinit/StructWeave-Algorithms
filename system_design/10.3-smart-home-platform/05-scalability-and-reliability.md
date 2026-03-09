# Scalability & Reliability — Smart Home Platform

## 1. Scaling Strategy

### 1.1 Scaling Dimensions

| Dimension | Approach | Trigger |
|---|---|---|
| **Homes (tenants)** | Horizontal scaling of all services; add MQTT broker nodes | Registration rate exceeds provisioning capacity |
| **Devices per home** | Hub hardware limits; cloud scales linearly per device | Hub device count exceeds 200; cloud shadows per home grow |
| **Event throughput** | Partition event processing by home_id; scale consumer groups | Event processing lag exceeds 5 seconds |
| **MQTT connections** | Add broker nodes; connection-count-aware load balancing | Connection count exceeds 80% of broker capacity |
| **Command throughput** | Scale command dispatcher horizontally; add MQTT publish capacity | Command queue depth exceeds 10,000 |
| **Storage** | Tiered storage lifecycle; partition time-series by time + home | Hot storage exceeds 80% capacity |
| **Geographic expansion** | Add regions; route hubs to nearest region | User base grows in new geography; latency exceeds SLO |

### 1.2 MQTT Broker Cluster Scaling

The MQTT broker is the most connection-intensive component — maintaining millions of persistent TCP connections:

```
MQTT Broker Cluster Architecture:

Connection Distribution:
  - Each broker node handles ~100,000 persistent connections
  - 80M hubs ÷ 100K/node = 800 broker nodes minimum
  - Plus Wi-Fi device connections and app connections
  - Design for: 1,500 broker nodes across regions

Routing Strategy:
  - Consistent hashing on home_id → assigned broker node
  - All devices in a home connect to the same broker (locality)
  - Enables local topic fan-out without cross-broker messaging
  - Shared subscriptions for cloud services consuming events

Session Management:
  - Persistent sessions for hubs (survive reconnection)
  - Clean sessions for apps (ephemeral connections)
  - Session state stored in distributed cache (not on broker)
  - Maximum queued messages per offline session: 1,000

Scaling Triggers:
  - Connection count > 80% capacity per node → add nodes
  - Message throughput > 70% capacity → add nodes
  - Memory usage > 75% → add nodes or increase node size
  - Cross-region message rate > threshold → add regional brokers
```

### 1.3 Device Registry Scaling

```
Partitioning Strategy:
  Primary partition: home_id (consistent hashing)
  Secondary index: device_id → home_id (global lookup)

Partition Sizing:
  - Target: 500K homes per partition
  - At 20 devices/home: 10M device records per partition
  - Partition count: 80M homes ÷ 500K = 160 partitions
  - Growth: add partitions at 400K homes threshold

Read/Write Patterns:
  - Reads: 95% of operations (device state queries, shadow lookups)
  - Writes: 5% (state updates, new device registration)
  - Read replicas per partition: 3 (one per availability zone)
  - Write leader per partition: 1 with automated failover

Caching:
  - Device shadow cache: 100% of active devices in distributed cache
  - Cache size: 1.6B devices × 1.5KB = ~2.4TB distributed cache
  - Per-node: 2.4TB ÷ 200 cache nodes = ~12GB per node (fits in memory)
  - Cache invalidation: write-through on shadow updates
```

### 1.4 Service-Level Scaling

| Service | Scaling Pattern | Min Instances | Auto-Scale Trigger |
|---|---|---|---|
| **API Gateway** | Horizontal, stateless | 10 per region | RPS > 70% capacity |
| **Command Dispatcher** | Horizontal, stateless | 8 per region | Queue depth > 5,000 |
| **Shadow Service** | Partition-aligned | 1 per partition | Write latency p99 > 50ms |
| **Automation Engine** | Partition-aligned | 1 per home partition | Event processing lag > 2s |
| **Voice NLU** | Horizontal with GPU | 20 per region | Inference latency p99 > 500ms |
| **OTA Service** | Horizontal, stateless | 4 per region | Download queue > 100K |
| **Notification Service** | Horizontal, stateless | 6 per region | Notification backlog > 50K |
| **Event Processor** | Stream consumer groups | 50 per region | Consumer lag > 10s |

### 1.5 Time-Series Data Tier Scaling

```
Data Lifecycle:

Hot Tier (0-7 days):
  - Storage: Columnar database optimized for time-series
  - Resolution: Full (every sensor reading)
  - Access: Real-time dashboards, automation conditions
  - Replication: 3 replicas
  - Estimated size: 7 × 11.5 TB/day = ~80 TB

Warm Tier (7-30 days):
  - Storage: Columnar database (lower spec)
  - Resolution: 5-minute aggregates (min, max, avg, count)
  - Access: Weekly reports, trend analysis
  - Replication: 2 replicas
  - Estimated size: ~40 TB

Cold Tier (30 days - 1 year):
  - Storage: Object storage (compressed, partitioned by home/month)
  - Resolution: Hourly aggregates
  - Access: Historical reports, energy annual summaries
  - Estimated size: ~100 TB

Archive (1+ years):
  - Storage: Archive-class object storage
  - Resolution: Daily aggregates
  - Access: Exceptional requests only
  - Estimated size: ~10 TB/year
```

---

## 2. Reliability Engineering

### 2.1 Availability Architecture

**Target: 99.95% cloud availability (4.4 hours/year), 99.99% local operation**

The key insight is that local operation is MORE available than cloud operation — the hub provides an additional layer of resilience that centralized systems lack.

```
Reliability Layers:

Layer 1 - Edge Resilience:
  Hub operates independently of cloud
  All safety-critical automations execute locally
  Protocol stacks maintain device connectivity without internet
  → Provides 99.99%+ for local operations

Layer 2 - Service Redundancy:
  Every cloud service has N+1 redundancy minimum
  Stateless services: 3+ instances per availability zone
  Stateful services: leader + 2 followers with automated failover

Layer 3 - Zone Redundancy:
  Services distributed across 3 availability zones
  Any single zone failure does not impact functionality
  MQTT broker: connections redistributed to surviving zones

Layer 4 - Regional Redundancy:
  Active-active across 2+ regions
  Hub reconnects to alternate region if primary fails
  Async replication of device registry and shadows

Layer 5 - Chaos Engineering:
  Regular hub disconnect simulations
  MQTT broker node failure injection
  Region failover drills quarterly
  Hub firmware crash recovery testing
```

### 2.2 Replication Strategy

| Data Type | Replication Mode | Replicas | RPO |
|---|---|---|---|
| **Device registry** | Synchronous within region | 3 local | 0 within region |
| **Shadow state** | Asynchronous cross-region | 3 local + 1 remote | < 5s |
| **Automation rules** | Asynchronous | 3 local + edge (hub) | < 1 min |
| **Time-series data** | Asynchronous | 2 local | < 30s |
| **User/home data** | Synchronous within region | 3 local + 1 remote | 0 within region |
| **Command log** | Synchronous | 3 local | 0 |
| **Firmware binaries** | CDN-replicated | All edge locations | < 5 min |

### 2.3 Hub Failover Architecture

For critical installations (security systems, elderly care), a secondary hub provides failover:

```
Primary Hub                    Secondary Hub
┌─────────────────┐           ┌─────────────────┐
│ Active           │           │ Standby          │
│                  │◄─sync────►│                  │
│ Protocol radios  │           │ Protocol radios  │
│ Local rules      │           │ Local rules      │
│ Device shadows   │           │ Device shadows   │
└─────────────────┘           └─────────────────┘

Failover Trigger:
  - Secondary monitors primary via local network heartbeat (every 5s)
  - If 3 consecutive heartbeats missed (15s): failover initiated
  - Secondary promotes itself to active
  - Secondary assumes primary's protocol coordinator role
  - Cloud is notified of failover via MQTT LWT + secondary connection

Sync Between Hubs:
  - Local LAN-based sync (not dependent on cloud)
  - Shadow state synchronized every 5 seconds
  - Rule updates synchronized on change
  - Device pairing information mirrored
```

### 2.4 Circuit Breaker Configuration

| Service | Failure Threshold | Recovery | Fallback |
|---|---|---|---|
| **Shadow Service** | 10 failures in 30s | Half-open after 30s | Serve from cache (stale state acceptable) |
| **Automation Engine** | 5 failures in 10s | Half-open after 15s | Local hub evaluation only |
| **Voice NLU** | 3 failures in 5s | Half-open after 30s | "Sorry, voice control is temporarily unavailable" |
| **Notification Service** | 10 failures in 60s | Half-open after 120s | Queue notifications for later delivery |
| **OTA Service** | 5 failures in 30s | Half-open after 300s | Postpone firmware updates |
| **External Weather API** | 3 failures in 60s | Half-open after 300s | Use cached weather data |

### 2.5 Graceful Degradation Modes

```
Mode 1: NORMAL
  All services operational
  Full cloud + edge capabilities
  → Standard operation

Mode 2: DEGRADED_CLOUD
  Some cloud services impaired
  Local operations continue normally
  Cloud rules paused; local rules active
  Notifications queued for later delivery
  → Users may notice delayed app updates

Mode 3: INTERNET_OUTAGE (per home)
  Home loses internet connectivity
  Hub operates in full offline mode
  All local automations continue
  No remote access
  → Transparent to occupants for most functions

Mode 4: HUB_FAILURE (per home)
  Hub goes offline (power/hardware failure)
  Wi-Fi devices still reachable via cloud
  Non-Wi-Fi devices become unreachable
  Cloud queues commands for hub reconnection
  → Physical controls still work; automations paused

Mode 5: REGIONAL_OUTAGE
  Entire cloud region unavailable
  Hubs reconnect to secondary region (30-60s)
  During transition: offline mode active
  → Brief automation gap during region failover
```

---

## 3. Disaster Recovery

### 3.1 DR Architecture

```
Region A (Primary)                Region B (Secondary)
┌──────────────────────┐         ┌──────────────────────┐
│ MQTT Broker Cluster  │         │ MQTT Broker Cluster  │
│ (serving hubs in     │         │ (serving hubs in     │
│  Region A geography) │         │  Region B geography) │
│                      │         │                      │
│ Device Registry (R/W)│──async─►│ Device Registry (R/W)│
│ Shadow Store    (R/W)│──async─►│ Shadow Store    (R/W)│
│ Rule Store      (R/W)│──async─►│ Rule Store      (R/W)│
│ Time-Series     (R/W)│         │ Time-Series     (R/W)│
│                      │         │                      │
│ Core Services        │         │ Core Services        │
│ (active, serving)    │         │ (active, serving)    │
└──────────────────────┘         └──────────────────────┘

Active-Active Model:
  - Each region serves its geographic hubs independently
  - User data replicated across regions for mobile access
  - Hub connects to nearest region (DNS-based routing)
  - On region failure: hubs reconnect to secondary region
```

### 3.2 Recovery Objectives

| Scenario | RPO | RTO | Recovery Procedure |
|---|---|---|---|
| **Single service failure** | 0 | < 30s | Automated pod restart/replacement |
| **Availability zone failure** | 0 | < 60s | Traffic redistributed to surviving zones |
| **MQTT broker node failure** | ~30s (session queue) | < 60s | Hubs reconnect to other nodes; persistent sessions restored |
| **Region failure** | < 5s | < 5 min | Hubs reconnect to secondary region; DNS failover |
| **Hub failure** | 0 (local), < 5s (cloud) | < 60s | Secondary hub takes over; cloud re-routes |
| **Data corruption** | Point-in-time | < 30 min | Restore from backup; replay event log |

### 3.3 Hub Reconnection Strategy (Post-Region Failure)

```
ALGORITHM HubReconnectionAfterRegionFailure():
    // Hubs detect region failure via MQTT keepalive timeout

    1. Hub detects MQTT connection loss
    2. Hub enters offline mode (local rules continue)
    3. Hub attempts reconnect to primary region (3 attempts, 5s each)
    4. If primary unreachable after 15s:
       a. Resolve secondary region endpoint from pre-configured DNS
       b. Add random jitter: RANDOM(0, 120) seconds  // Prevent thundering herd
       c. Connect to secondary region MQTT broker
       d. Authenticate with same device certificate
       e. Begin state synchronization

    Regional Reconnect Rate Limiting:
    - Secondary region accepts max 50K new connections/second
    - If 80M hubs need to reconnect: takes ~27 minutes with jitter
    - Priority: security-enabled homes first, then by last-seen timestamp
    - Hubs remain fully functional locally during reconnection queue
```

---

## 4. Capacity Planning

### 4.1 Growth Projections

| Metric | Year 1 | Year 3 | Year 5 |
|---|---|---|---|
| **Homes** | 80M | 150M | 300M |
| **Devices** | 1.6B | 3.7B | 9B |
| **Avg devices/home** | 20 | 25 | 30 |
| **Events/second (cloud)** | 1.3M | 3M | 8M |
| **Commands/second** | 55K | 130K | 350K |
| **MQTT connections** | 500M | 1.2B | 3B |
| **Time-series storage/day** | 11.5 TB | 27 TB | 72 TB |
| **Automation rules** | 640M | 1.5B | 4.5B |
| **Regions** | 3 | 5 | 8 |

### 4.2 Scaling Milestones

```
Phase 1 (0-100M homes):
  - 3 cloud regions (Americas, Europe, Asia-Pacific)
  - 800 MQTT broker nodes
  - 160 device registry partitions
  - 50 event processing consumers per region
  - Estimated infrastructure: moderate cloud spend

Phase 2 (100M-200M homes):
  - 5 regions (add Middle East/Africa, secondary Americas)
  - 1,500 MQTT broker nodes
  - 400 device registry partitions
  - Custom MQTT broker optimizations (connection pooling, zero-copy)
  - Estimated infrastructure: 2x Phase 1

Phase 3 (200M-300M+ homes):
  - 8 regions (global coverage)
  - 3,000+ MQTT broker nodes
  - 800+ device registry partitions
  - Edge CDN for firmware distribution
  - Consider custom silicon for hub protocol processing
  - Estimated infrastructure: 2.5x Phase 2
```

### 4.3 Load Testing Strategy

```
Load Test Profiles:

Profile 1: Steady State
  - Simulate normal daily pattern (low overnight, peak evening)
  - Ramp: 20% → 60% → 100% over 3 hours
  - Sustain at 100% for 8 hours
  - Verify all SLOs continuously

Profile 2: Evening Peak
  - Simulate 6-10 PM spike (everyone arrives home, triggers automations)
  - Ramp to 300% of average in 30 minutes
  - Sustain for 2 hours
  - Verify command latency stays within SLO

Profile 3: Mass Reconnection
  - Simulate region failure: disconnect 30% of hubs simultaneously
  - Verify hubs switch to offline mode
  - Restore connectivity: verify reconnection with jitter
  - Monitor reconnection rate and state sync duration

Profile 4: OTA Update Storm
  - Simulate firmware update for 10M devices
  - Verify staged rollout respects bandwidth limits
  - Verify no impact on command processing during updates

Profile 5: Thundering Herd (Power Restoration)
  - Simulate neighborhood power outage affecting 100K homes
  - All 100K hubs power on simultaneously
  - Verify reconnection rate limiting prevents broker overload
  - Measure time to full functionality restoration
```

---

## 5. Backpressure and Flow Control

### 5.1 Backpressure Mechanisms

```
Layer 1: Device Level (Hub)
  - Per-device event rate limiting (10 events/second max)
  - Event deduplication within sliding window
  - Command queue with priority: safety > user > automation > analytics

Layer 2: Hub to Cloud (MQTT)
  - Upstream rate limiting: 100 messages/second per hub
  - Message batching: aggregate sensor data in 100ms windows
  - QoS 0 for telemetry (acceptable loss under pressure)
  - QoS 1 for state changes (guaranteed delivery, backpressure via PUBACK delay)

Layer 3: Cloud Services
  - Per-home rate limiting: 1000 events/second per home
  - Per-service admission control: reject with 429 when overloaded
  - Priority queues: command processing > state updates > analytics
  - Event stream consumer lag monitoring → auto-scale consumers

Layer 4: Storage
  - Time-series database write throttling with bounded buffer
  - Shadow store: write coalescing for rapid updates
  - Background compaction scheduled during off-peak hours
```

### 5.2 Fair Resource Allocation

```
Per-Home Resource Limits:
  - Max MQTT messages/second: 100 upstream, 50 downstream
  - Max devices: 300 (soft limit, alerting at 200)
  - Max automation rules: 200
  - Max shadow state updates/second: 50
  - Max historical data retention: 1 year (configurable)
  - Max concurrent WebSocket connections: 10 (per home)

These limits ensure:
  - No single home can degrade service for others
  - Resource allocation is predictable for capacity planning
  - Homes with extreme configurations get proactive support outreach
```

---

*Next: [Security & Compliance →](./06-security-and-compliance.md)*
