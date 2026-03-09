# Observability — Smart Home Platform

## 1. Observability Strategy

Smart home observability serves three distinct audiences: **platform operations** (keep the cloud running), **device health** (ensure billions of devices work correctly), and **user experience** (make automation reliable). The challenge is the sheer scale — billions of devices generating millions of events per second — requiring aggressive aggregation and intelligent filtering to surface actionable insights from noise.

### 1.1 Observability Pillars

| Pillar | Purpose | Retention | Access Control |
|---|---|---|---|
| **Metrics** | Real-time system health, device fleet health, capacity planning | 2 years (aggregated: 5 years) | Operations + engineering |
| **Logs** | Service debugging, security forensics, command audit | 90 days hot, 1 year archived | Tiered access by sensitivity |
| **Traces** | Request-level latency analysis, command delivery tracking | 30 days (sampled), full for failed commands | Engineering |
| **Device Telemetry** | Device connectivity, firmware health, battery levels | 30 days at full resolution, 1 year aggregated | Operations + device engineering |
| **User-Facing Events** | Automation executions, command history, device activity | 30 days (visible to users in app) | Users (own home only) |

---

## 2. Metrics

### 2.1 Golden Signals by Service

| Service | Latency | Traffic | Errors | Saturation |
|---|---|---|---|---|
| **MQTT Broker** | Message delivery latency (pub→sub) | Messages/sec by QoS level | Connection failures, publish errors | Connection count, session memory |
| **Command Dispatcher** | Command-to-device latency | Commands/sec by source (app, voice, rule) | Failed deliveries, timeouts | Command queue depth |
| **Shadow Service** | State update latency | Shadow reads + writes/sec | Stale delta count, reconciliation failures | Cache hit ratio, storage utilization |
| **Automation Engine** | Rule evaluation latency | Evaluations/sec by trigger type | Condition errors, action failures | Rule cache memory, evaluation queue |
| **Voice NLU** | Intent extraction latency | Utterances/sec by language | Recognition failures, wrong intent | GPU utilization, model load |
| **OTA Service** | Download throughput | Updates/sec by stage | Failed updates, rollback rate | CDN bandwidth, staging queue |
| **API Gateway** | Response time p50/p95/p99 | Requests/sec by endpoint | 4xx/5xx rates | Connection pool, rate limit headroom |

### 2.2 Device Fleet Metrics

```
Device Connectivity:
  smarthome.devices.connected              {protocol, region}     [gauge]
  smarthome.devices.disconnected_duration  {protocol}             [histogram]
  smarthome.devices.reconnect_rate         {protocol, region}     [counter]
  smarthome.devices.unreachable            {protocol, home_size}  [gauge]

Device Health:
  smarthome.devices.battery_level          {device_type}          [histogram]
  smarthome.devices.battery_critical       {device_type}          [gauge: count]
  smarthome.devices.signal_strength        {protocol}             [histogram]
  smarthome.devices.firmware_version       {manufacturer, model}  [gauge: distribution]
  smarthome.devices.firmware_age_days      {manufacturer}         [histogram]

Device Activity:
  smarthome.devices.events_per_second      {device_type, protocol} [gauge]
  smarthome.devices.commands_received      {device_type, source}  [counter]
  smarthome.devices.state_changes          {capability_type}      [counter]
  smarthome.devices.shadow_delta_duration  {capability_type}      [histogram]
```

### 2.3 Automation Metrics

```
Rule Execution:
  smarthome.automations.triggered          {trigger_type, location} [counter]
  smarthome.automations.evaluated          {result: matched|skipped} [counter]
  smarthome.automations.executed           {execution_location}     [counter]
  smarthome.automations.failed             {failure_reason}         [counter]
  smarthome.automations.evaluation_time_ms {execution_location}     [histogram]

Conflict Resolution:
  smarthome.automations.conflicts_detected {resolution}            [counter]
  smarthome.automations.conflicts_resolved {winner_type}           [counter]

Scene Activation:
  smarthome.scenes.activated               {source}                [counter]
  smarthome.scenes.device_success_rate     {}                      [gauge]
  smarthome.scenes.completion_time_ms      {}                      [histogram]
```

### 2.4 Platform Infrastructure Metrics

```
MQTT Broker:
  mqtt.connections.active                  {type: hub|device|app}  [gauge]
  mqtt.connections.rate                    {type}                  [counter]
  mqtt.messages.published                  {qos, direction}       [counter]
  mqtt.messages.delivered                  {qos}                  [counter]
  mqtt.messages.dropped                    {reason}               [counter]
  mqtt.sessions.persistent                 {region}               [gauge]
  mqtt.sessions.queued_messages            {region}               [histogram]

Hub Connectivity:
  smarthome.hubs.connected                 {region}               [gauge]
  smarthome.hubs.offline                   {region, duration_bucket} [gauge]
  smarthome.hubs.sync_lag_ms               {region}               [histogram]
  smarthome.hubs.rule_version_mismatch     {region}               [gauge]

Command Pipeline:
  smarthome.commands.accepted              {source}               [counter]
  smarthome.commands.delivered             {}                     [counter]
  smarthome.commands.acknowledged          {}                     [counter]
  smarthome.commands.timed_out             {}                     [counter]
  smarthome.commands.end_to_end_ms         {source, protocol}     [histogram]
```

---

## 3. Logging

### 3.1 Log Classification

| Category | Content | Sensitivity | Retention |
|---|---|---|---|
| **Service logs** | Application operations, errors, debug | Low | 90 days |
| **Command logs** | Device commands with source and result | Medium | 1 year |
| **State change logs** | Device state transitions | Medium | 30 days |
| **Access logs** | API calls, authentication events | High | 1 year |
| **Security logs** | Auth failures, permission denials, anomalies | High | 2 years |
| **Audit logs** | User access changes, device pairing/removal | High | 2 years |
| **Hub logs** | Hub-reported diagnostics (uploaded periodically) | Medium | 30 days |

### 3.2 Structured Log Format

```
Standard Log Entry:
{
  "timestamp": "2026-03-09T14:30:00.123Z",
  "level": "INFO",
  "service": "command-dispatcher",
  "instance": "cmd-disp-pod-3a7f",
  "trace_id": "trace-abc123",
  "span_id": "span-789",
  "home_id": "HOME-MASKED-****5678",
  "event_type": "COMMAND_DISPATCHED",
  "message": "Command dispatched to hub via MQTT",
  "attributes": {
    "command_id": "cmd-uuid",
    "device_id": "dev-uuid",
    "capability": "brightness",
    "command": "set_level",
    "source": "mobile_app",
    "mqtt_qos": 1,
    "processing_time_ms": 12
  }
}
```

**Privacy rules for logs:**
- Home IDs: masked (show last 4 only) in service logs
- User IDs: never logged in application logs
- Device names: never logged (may contain PII like "John's bedroom light")
- Command parameters: logged for debugging (non-sensitive device state)
- Full context: only in audit logs (encrypted, restricted access)

### 3.3 Hub Diagnostic Logs

Hubs run on constrained hardware and cannot stream logs in real-time. Instead:

```
Hub Log Strategy:

Local logging:
  - Circular buffer: last 10,000 log entries (approximately 2MB)
  - Priority levels: ERROR always retained, DEBUG overwritten first
  - Crash logs: preserved in separate partition, uploaded on next boot

Periodic upload:
  - Hub uploads compressed diagnostic summary every 6 hours
  - Summary includes: error counts, connectivity stats, resource utilization
  - Full logs uploaded only on request (support diagnostic mode)

Crash dump:
  - Core dump stored locally if hub crashes
  - Uploaded on next successful boot
  - Contains: stack trace, memory snapshot, last 100 log entries
  - Used for firmware stability analysis across fleet
```

---

## 4. Distributed Tracing

### 4.1 Trace Context Propagation

```
Every command carries trace context through the full path:

Cloud → Hub → Device path:
  HTTP headers (API Gateway → Command Service):
    X-Trace-ID: globally unique trace identifier
    X-Span-ID: current span
    X-Home-ID: home context

  MQTT message metadata (Command Service → Hub):
    trace_id: same trace ID from HTTP path
    command_id: correlates command to trace
    timestamp: cloud-side timestamp

  Hub internal:
    trace_id carried through local processing
    Protocol-specific command tagged with trace_id
    Device response tagged with same trace_id

  Return path (Device → Hub → Cloud):
    State report includes originating command_id + trace_id
    Cloud correlates reported state back to original trace

Cross-cutting traces:
  Automation execution: new trace per rule evaluation,
    linked to triggering device event trace
  Scene activation: parent trace for scene,
    child traces for each device command
```

### 4.2 End-to-End Command Trace

```
Command Trace: "Turn on living room light" (voice command)

├─ Voice Processing (800ms)
│  ├─ Wake word detection (device-local, 0ms cloud)
│  ├─ Audio streaming to NLU (200ms)
│  ├─ Intent extraction (150ms)
│  ├─ Entity resolution: "living room light" → device-uuid (50ms)
│  └─ Command generation (10ms)
│
├─ Command Processing (25ms)
│  ├─ API Gateway routing (3ms)
│  ├─ Authorization check (5ms)
│  ├─ Shadow desired state update (8ms)
│  └─ MQTT publish to hub (9ms)
│
├─ Hub Processing (35ms)
│  ├─ MQTT receive + deserialize (5ms)
│  ├─ Protocol translation (3ms)
│  ├─ Zigbee command transmission (20ms)
│  └─ Local shadow update (2ms)
│  └─ Device ACK (5ms)
│
├─ Return Path (async, 50ms)
│  ├─ Device reports new state to hub (20ms)
│  ├─ Hub publishes state to cloud (15ms)
│  ├─ Shadow reconciliation (5ms)
│  └─ WebSocket push to app (10ms)
│
Total voice-to-action: ~860ms
Total app-to-action: ~60ms (without voice processing)
```

### 4.3 Sampling Strategy

```
Sampling Rules:

1. Always trace (100%):
   - Failed commands (any error in delivery chain)
   - Commands to security devices (locks, cameras, alarms)
   - First command from newly paired devices
   - Commands with latency > p95
   - Automation rule execution failures
   - Hub reconnection events

2. Head-based sampling (10%):
   - Routine device state updates
   - Sensor telemetry events
   - Successful automation executions

3. Tail-based sampling:
   - Retain all traces with any error span
   - Retain all traces exceeding latency SLO
   - Retain traces involving devices with frequent failures

4. No sampling (excluded):
   - MQTT keepalive pings (too high volume, no diagnostic value)
   - Time-series data ingestion (separate monitoring)
```

---

## 5. Device Health Monitoring

### 5.1 Device Health Score

Every device gets a computed health score based on multiple signals:

```
ALGORITHM ComputeDeviceHealthScore(device_id):
    score = 100  // Start at perfect health

    // Connectivity factor (0-30 points)
    connectivity = GetConnectivityMetrics(device_id, last_24h)
    IF connectivity.disconnect_count > 10:
        score -= 20
    ELSE IF connectivity.disconnect_count > 3:
        score -= 10
    IF connectivity.avg_signal_strength < -80:
        score -= 10

    // Responsiveness factor (0-25 points)
    responsiveness = GetCommandMetrics(device_id, last_24h)
    IF responsiveness.success_rate < 0.95:
        score -= 15
    IF responsiveness.avg_latency_ms > 500:
        score -= 10

    // Battery factor (0-15 points, battery devices only)
    IF device.is_battery_powered:
        IF device.battery_level < 10:
            score -= 15
        ELSE IF device.battery_level < 20:
            score -= 10

    // Firmware factor (0-15 points)
    firmware = GetFirmwareInfo(device_id)
    IF firmware.is_outdated_critical:
        score -= 15
    ELSE IF firmware.is_outdated:
        score -= 5

    // Error factor (0-15 points)
    errors = GetErrorCount(device_id, last_24h)
    IF errors > 50:
        score -= 15
    ELSE IF errors > 10:
        score -= 10

    RETURN CLAMP(score, 0, 100)

Health Categories:
  90-100: Excellent (green)
  70-89:  Good (yellow)
  40-69:  Degraded (orange) → proactive notification to user
  0-39:   Poor (red) → urgent notification + troubleshooting guide
```

### 5.2 Fleet-Wide Health Dashboard

```
Fleet Health Overview:

Device Status Distribution:
  ├─ Online:        94.2% (1.51B devices)
  ├─ Offline:        3.8% (60.8M devices)
  ├─ Unreachable:    1.5% (24M devices)
  └─ Updating:       0.5% (8M devices)

Firmware Currency:
  ├─ Latest:        72%
  ├─ Previous:      18%
  ├─ Outdated:       8%
  └─ Critical:       2% (known vulnerabilities)

Protocol Health:
  ├─ Zigbee:     Mesh stability 99.4%, avg latency 22ms
  ├─ Z-Wave:     Network health 99.1%, avg latency 35ms
  ├─ Matter:     Session stability 99.6%, avg latency 18ms
  ├─ Wi-Fi:      Connection stability 98.2%, avg latency 12ms
  └─ BLE:        Connectivity 97.5%, avg latency 45ms

Automation Reliability:
  ├─ Trigger accuracy: 99.95%
  ├─ Execution success: 99.7%
  ├─ Avg execution time: 85ms (local), 350ms (cloud)
  └─ Conflict rate: 2.3%
```

---

## 6. Alerting Framework

### 6.1 Alert Tiers

| Tier | Condition | Response | Channel |
|---|---|---|---|
| **P1 - Page** | MQTT cluster degraded, command pipeline halted, security breach | Immediate human response | PagerDuty + phone call |
| **P2 - Urgent** | SLO burn rate critical, major firmware update failure, hub mass disconnect | Response within 15 minutes | PagerDuty + chat |
| **P3 - Warning** | Elevated error rates, capacity approaching threshold, device health degradation | Response within 1 hour | Chat + dashboard |
| **P4 - Info** | Trend changes, non-critical anomalies, firmware adoption rates | Review in next business day | Dashboard + email |

### 6.2 Key Alert Definitions

```
Alert: MQTT Connection Loss Spike
  condition: hub_disconnect_rate > 10 * rolling_average for 5 minutes
  severity: P1
  action: Page on-call SRE, check for network/region issue

Alert: Command Delivery Failure Rate
  condition: command_failure_rate > 1% for 3 minutes
  severity: P1
  action: Page on-call SRE, check command pipeline health

Alert: Shadow Service Latency
  condition: shadow_write_latency_p99 > 200ms for 5 minutes
  severity: P2
  action: Alert platform team, check database health

Alert: Automation Engine Processing Lag
  condition: event_processing_lag > 10 seconds
  severity: P2
  action: Alert platform team, scale consumers

Alert: Firmware Update Rollback Rate
  condition: rollback_rate > 2% for current firmware rollout
  severity: P2
  action: Halt rollout, alert firmware team

Alert: Device Fleet Offline Rate
  condition: global_offline_rate > 5%
  severity: P2
  action: Alert operations, investigate by region/protocol

Alert: Hub Reconnection Storm
  condition: hub_reconnect_rate > 50,000/second sustained for 3 minutes
  severity: P3
  action: Enable reconnection rate limiting, investigate root cause

Alert: Time-Series Ingestion Lag
  condition: tsdb_write_queue_depth > 1M events for 10 minutes
  severity: P3
  action: Alert data team, consider increasing write capacity
```

### 6.3 User-Facing Alerts

```
Alerts surfaced to home owners in the app:

Device Alerts:
  - "Front Door Lock battery is critically low (5%)"
  - "Kitchen Motion Sensor has been offline for 2 hours"
  - "Living Room Camera firmware update available (security patch)"

Automation Alerts:
  - "Your 'Good Night' routine failed: Bedroom Light was unreachable"
  - "2 automations conflict on Living Room Light — tap to resolve"

Security Alerts:
  - "New device joined your home network"
  - "Failed unlock attempt on Front Door Lock"
  - "Guest access for Alex expires tomorrow"
```

---

## 7. Dashboards

### 7.1 Dashboard Hierarchy

```
Level 1: Executive Dashboard
  - Platform health (green/yellow/red)
  - Total homes and devices (with growth trend)
  - Command success rate
  - User engagement metrics (automations created, voice commands)

Level 2: Operations Dashboard
  - Real-time event throughput and command latency
  - MQTT broker cluster status
  - Per-region hub connectivity
  - Active firmware rollouts and their health

Level 3: Service Dashboard (per service)
  - Golden signals (latency, traffic, errors, saturation)
  - Dependency health map
  - Resource utilization (CPU, memory, connections)
  - Recent deployments and their impact

Level 4: Device Engineering Dashboard
  - Fleet-wide firmware version distribution
  - Protocol-specific health metrics
  - Device failure rates by manufacturer/model
  - OTA update adoption curves

Level 5: User-Facing Dashboard (in app)
  - Per-home device health summary
  - Automation execution history (last 30 days)
  - Energy usage trends
  - Activity timeline
```

---

*Next: [Interview Guide →](./08-interview-guide.md)*
