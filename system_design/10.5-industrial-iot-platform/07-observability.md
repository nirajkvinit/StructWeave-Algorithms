# Observability — Industrial IoT Platform

## 1. Observability Architecture

### 1.1 Three Pillars for IIoT

Industrial IoT observability operates at two distinct levels: **platform observability** (is the IIoT platform itself healthy?) and **industrial process observability** (are the monitored industrial processes healthy?). Both must be monitored, but they serve different audiences and have different requirements.

```
Observability Architecture:

┌─────────────────────────────────────────────────────────────┐
│                    Observability Plane                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Platform     │  │ Industrial   │  │ Security         │  │
│  │ Metrics      │  │ Process      │  │ Monitoring       │  │
│  │              │  │ Metrics      │  │                  │  │
│  │ •Ingestion   │  │ •Sensor      │  │ •Auth failures   │  │
│  │  throughput  │  │  health      │  │ •Anomalous       │  │
│  │ •Latency     │  │ •Data        │  │  traffic         │  │
│  │ •Error rates │  │  completeness│  │ •Certificate     │  │
│  │ •Resource    │  │ •Alert       │  │  issues          │  │
│  │  utilization │  │  statistics  │  │ •Zone violations │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Logs         │  │ Traces       │  │ Alerts           │  │
│  │              │  │              │  │                  │  │
│  │ •Structured  │  │ •End-to-end  │  │ •Platform alerts │  │
│  │  JSON logs   │  │  telemetry   │  │ •SLO burn rate   │  │
│  │ •Edge gateway│  │  tracing     │  │ •Capacity        │  │
│  │  logs        │  │ •Command     │  │  warnings        │  │
│  │ •Audit logs  │  │  tracing     │  │ •Security events │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Observability Data Flow

```
Edge Layer:
  Edge gateways emit:
  ├── Health metrics (CPU, memory, storage, buffer fill) → every 60s
  ├── Protocol statistics (poll success/failure, response times) → every 60s
  ├── Connection status (MQTT state, reconnection count) → on change
  └── Local alert engine metrics (rule evaluations/sec, triggered count) → every 60s

Cloud Platform:
  Each service emits:
  ├── Request metrics (rate, latency, error rate) → continuous
  ├── Business metrics (data points processed, alarms evaluated) → continuous
  ├── Resource metrics (CPU, memory, disk, network) → every 15s
  └── Structured logs (request/response, errors, state changes) → continuous

All telemetry flows to:
  ├── Metrics → Time-series metrics store (separate from sensor TSDB)
  ├── Logs → Centralized log aggregation service
  ├── Traces → Distributed tracing backend
  └── Alerts → Platform alerting engine (separate from industrial alert engine)
```

---

## 2. Key Metrics

### 2.1 Platform Health Metrics

**Ingestion Pipeline Metrics:**

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `ingestion.throughput` | Counter | Data points ingested per second | < 80% of expected rate |
| `ingestion.latency.p50` | Histogram | 50th percentile ingestion latency | > 500ms |
| `ingestion.latency.p99` | Histogram | 99th percentile ingestion latency | > 2s |
| `ingestion.errors` | Counter | Failed ingestion attempts per second | > 0.1% of throughput |
| `ingestion.backpressure` | Gauge | Percentage of time backpressure is applied | > 5% |
| `ingestion.dedup_rate` | Gauge | Percentage of incoming points that are duplicates | > 1% (unexpected duplication) |
| `ingestion.backfill_active` | Gauge | Number of gateways currently draining backfill | Context-dependent |

**MQTT Broker Metrics:**

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `mqtt.connections.active` | Gauge | Current active MQTT connections | > 90% of capacity |
| `mqtt.connections.rate` | Counter | New connections per second | > 100/sec (connection storm) |
| `mqtt.messages.in` | Counter | Messages received per second | Baseline deviation > 30% |
| `mqtt.messages.out` | Counter | Messages delivered per second | Delivery ratio < 99% |
| `mqtt.queue.depth` | Gauge | Undelivered messages in broker queues | > 10,000 |
| `mqtt.sessions.expired` | Counter | Expired sessions (gateway offline too long) | > 0 |
| `mqtt.birth_certificates` | Counter | BIRTH messages per minute | Baseline deviation (mass reconnect) |

**Time-Series Database Metrics:**

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `tsdb.write.throughput` | Counter | Points written per second | < expected ingestion rate |
| `tsdb.write.latency.p99` | Histogram | 99th percentile write latency | > 50ms |
| `tsdb.query.latency.p99` | Histogram | 99th percentile query latency | > 5s (depends on query type) |
| `tsdb.compaction.lag` | Gauge | Hours of uncompacted data | > 4 hours |
| `tsdb.storage.used` | Gauge | Storage utilization per tier | Hot: > 80%, Warm: > 90% |
| `tsdb.compression.ratio` | Gauge | Achieved compression ratio | < 5:1 (expected 8-12:1) |
| `tsdb.cardinality` | Gauge | Number of unique time-series | Sudden increase > 10% |

### 2.2 Industrial Data Quality Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `data.completeness` | Gauge | % of expected data points received in last 5 min | < 99.5% |
| `data.quality.good_pct` | Gauge | % of data points with GOOD quality code | < 95% per facility |
| `data.quality.bad_pct` | Gauge | % of data points with BAD quality code | > 2% per facility |
| `data.staleness.sensors` | Gauge | Number of sensors with no update in > 5× scan rate | > 0.1% of total sensors |
| `data.staleness.max_age` | Gauge | Maximum staleness across all sensors (seconds) | > 300s for any active sensor |
| `data.timestamp.drift` | Histogram | Clock drift between device and server timestamps | > 5 seconds |
| `data.outlier.rate` | Gauge | % of data points flagged as statistical outliers | > 0.5% |

### 2.3 Edge Gateway Health Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `edge.cpu.usage` | Gauge | CPU utilization percentage | > 85% sustained |
| `edge.memory.usage` | Gauge | Memory utilization percentage | > 90% |
| `edge.storage.usage` | Gauge | Local storage utilization | > 80% |
| `edge.buffer.fill_pct` | Gauge | Store-and-forward buffer fill percentage | > 50% (connectivity concern) |
| `edge.buffer.oldest_point` | Gauge | Age of oldest buffered point (seconds) | > 3600 (1 hour disconnected) |
| `edge.protocol.poll_success` | Gauge | Percentage of successful protocol polls | < 99% |
| `edge.protocol.response_time` | Histogram | Protocol response time (ms) | > 2× baseline |
| `edge.rule_engine.eval_time` | Histogram | Rule evaluation time (ms) | > 10ms (safety concern) |
| `edge.uptime` | Counter | Seconds since last restart | < 86400 (unexpected restarts) |
| `edge.firmware.version` | Label | Current firmware version | Mismatch with target version |

### 2.4 Alert Engine Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `alerts.active.count` | Gauge | Total active alarms across platform | Context-dependent per facility |
| `alerts.rate` | Counter | New alarms per minute per facility | > 10× baseline (alarm flood) |
| `alerts.unacknowledged.count` | Gauge | Alarms waiting for operator acknowledgment | > 50 per facility |
| `alerts.unacknowledged.oldest` | Gauge | Age of oldest unacknowledged alarm (minutes) | > 30 minutes |
| `alerts.correlation.ratio` | Gauge | Ratio of raw alarms to correlated incidents | < 5:1 (correlation not working) |
| `alerts.mtba` | Gauge | Mean Time Between Alarms per operator | < 5 minutes (alarm fatigue risk) |
| `alerts.notification.latency` | Histogram | Time from alarm activation to notification delivery | > 30 seconds |
| `alerts.shelved.count` | Gauge | Number of currently shelved alarms | Audit: any shelved > 30 days |

### 2.5 Digital Twin Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `twin.sync.latency` | Histogram | Time from sensor update to twin state update (ms) | > 1000ms |
| `twin.sync.active` | Gauge | Number of actively synchronized twins | < expected count |
| `twin.simulation.step_time` | Histogram | Physics simulation step duration (ms) | > 100ms (falling behind real-time) |
| `twin.anomaly.detected` | Counter | Anomalies detected by twin models per hour | Context-dependent |
| `twin.prediction.accuracy` | Gauge | Prediction accuracy vs. actual outcome (%) | < 70% (model drift) |

---

## 3. Logging Strategy

### 3.1 Log Levels and Categories

```
Log Categories:

Platform Logs:
  ├── SERVICE_LOG:     Service request/response, business logic decisions
  ├── INGESTION_LOG:   Data point processing, validation, enrichment
  ├── MQTT_LOG:        Connection events, subscription changes, delivery issues
  ├── TSDB_LOG:        Write/query performance, compaction, retention
  └── INFRA_LOG:       Container orchestration, scaling events, health checks

Edge Gateway Logs:
  ├── PROTOCOL_LOG:    Protocol polling, response parsing, translation errors
  ├── RULE_LOG:        Rule evaluations, triggered actions, suppressed alarms
  ├── BUFFER_LOG:      Store-forward events, buffer capacity, drain progress
  ├── OTA_LOG:         Firmware update progress, verification, rollback
  └── HEALTH_LOG:      Resource utilization, self-test results, hardware status

Security Logs (immutable):
  ├── AUTH_LOG:        Authentication success/failure, certificate operations
  ├── AUTHZ_LOG:       Authorization decisions, access denials, privilege use
  ├── CONFIG_LOG:      Configuration changes with before/after values
  ├── COMMAND_LOG:     All commands sent to devices with authorization chain
  └── ANOMALY_LOG:     Security anomaly detections, IDS/IPS events
```

### 3.2 Structured Log Format

```
Standard Log Entry:
{
  "timestamp": "2026-03-09T14:30:02.453Z",
  "level": "WARN",
  "category": "INGESTION_LOG",
  "service": "ingestion-pipeline",
  "instance": "ingestion-worker-07",
  "site_id": "site-alpha",
  "trace_id": "abc-123-def-456",
  "span_id": "ghi-789",
  "message": "Data point quality degraded",
  "context": {
    "measurement_point": "TT-4201.PV",
    "equipment": "P-4201",
    "quality_code": "UNCERTAIN",
    "reason": "timestamp_drift_detected",
    "drift_seconds": 3.2,
    "value": 87.3
  }
}
```

### 3.3 Log Retention and Compliance

| Log Category | Retention | Storage Tier | Compliance Driver |
|---|---|---|---|
| **Security/Audit logs** | 7 years | Immutable archive | ISA/IEC 62443, SOX, FDA |
| **Configuration change logs** | 7 years | Immutable archive | ISA/IEC 62443, FDA 21 CFR Part 11 |
| **Command execution logs** | 7 years | Immutable archive | Regulatory requirement |
| **Platform service logs** | 90 days | Hot → Cold tiered | Operational troubleshooting |
| **Edge gateway logs** | 30 days on device, 90 days in cloud | Tiered | Troubleshooting |
| **Protocol debug logs** | 7 days | Hot only | Enabled on-demand for troubleshooting |
| **Ingestion detail logs** | 30 days | Hot → Cold tiered | Data quality investigation |

---

## 4. Distributed Tracing

### 4.1 Trace Context Propagation

```
End-to-End Trace: Sensor Value to Dashboard Display

Span 1: edge_gateway.protocol_poll
  ├── Duration: 5ms
  ├── Attributes: protocol=MODBUS_TCP, device=PLC-4201, register=40001
  └── Result: value=87.3, quality=GOOD

Span 2: edge_gateway.sparkplug_publish
  ├── Duration: 2ms
  ├── Parent: Span 1
  ├── Attributes: topic=spBv1.0/plant1/DDATA/gw01/pump01, qos=1
  └── Result: message_id=msg-123

Span 3: mqtt_broker.message_route
  ├── Duration: 1ms
  ├── Parent: Span 2
  ├── Attributes: broker_node=broker-02, subscriber_count=3
  └── Result: delivered_to=ingestion-worker-07

Span 4: ingestion_pipeline.process
  ├── Duration: 15ms
  ├── Parent: Span 3
  ├── Children:
  │   ├── Span 4a: deserialize_sparkplug (2ms)
  │   ├── Span 4b: validate_data (1ms)
  │   ├── Span 4c: enrich_context (5ms) — cache hit on asset hierarchy
  │   └── Span 4d: publish_to_stream (3ms)
  └── Result: enriched_point published to event stream

Span 5: tsdb_writer.write_batch
  ├── Duration: 8ms
  ├── Parent: Span 4d
  ├── Attributes: batch_size=847, shard=shard-03
  └── Result: 847 points written successfully

Span 6: alert_engine.evaluate
  ├── Duration: 3ms
  ├── Parent: Span 4d
  ├── Attributes: rules_evaluated=12, point=TT-4201.PV
  └── Result: no_alert_triggered

Span 7: current_value_cache.update
  ├── Duration: 0.5ms
  ├── Parent: Span 4d
  ├── Attributes: cache_key=pt-uuid
  └── Result: cache_updated, websocket_push_triggered

Total End-to-End Latency: ~35ms (edge poll to dashboard update)
```

### 4.2 Tracing for Command Path

```
Command Trace: Operator Writes Setpoint to Actuator

Span 1: dashboard.command_initiate
  ├── Duration: 50ms
  ├── Attributes: operator=jsmith, command=write_setpoint,
  │   target=FV-4201, value=75.0
  └── Status: AWAITING_AUTHORIZATION

Span 2: auth_service.two_person_check
  ├── Duration: 45000ms (waiting for supervisor approval)
  ├── Parent: Span 1
  ├── Attributes: approver=mjones, decision=APPROVED
  └── Status: AUTHORIZED

Span 3: command_service.validate_and_send
  ├── Duration: 15ms
  ├── Parent: Span 2
  ├── Attributes: validation=PASSED, mqtt_topic=spBv1.0/.../DCMD/gw01/valve01
  └── Status: COMMAND_SENT

Span 4: mqtt_broker.deliver_command
  ├── Duration: 8ms
  ├── Parent: Span 3
  └── Status: DELIVERED_TO_GATEWAY

Span 5: edge_gateway.execute_command
  ├── Duration: 25ms
  ├── Parent: Span 4
  ├── Attributes: protocol=OPC_UA, node_id=ns=2;s=FV4201.SP
  └── Status: COMMAND_EXECUTED, confirmation=value_changed_to_75.0

Total Command Latency: ~45.1 seconds (dominated by human approval)
Command Execution Latency (after approval): ~48ms
```

---

## 5. Alerting Strategy

### 5.1 Platform Alert Categories

```
Alert Severity Levels:

CRITICAL (Page on-call immediately):
  - Telemetry ingestion stopped for any facility
  - MQTT broker cluster quorum lost
  - TSDB primary shard unreachable
  - Edge gateway fleet-wide disconnection (>50% of gateways offline)
  - Security: unauthorized access attempt from OT network
  - Safety alert delivery failure

HIGH (Alert team within 15 minutes):
  - Ingestion latency p99 > 5 seconds
  - TSDB write latency p99 > 100ms
  - Edge gateway offline > 30 minutes
  - Data completeness < 95% for any facility
  - OTA rollout failure rate > 2%
  - Certificate expiry within 7 days

MEDIUM (Alert team within 1 hour):
  - Ingestion throughput below 90% of baseline
  - Consumer lag > 5 minutes for any consumer group
  - Edge gateway buffer fill > 50%
  - Data quality degradation (> 5% BAD quality)
  - TSDB storage utilization > 80%

LOW (Dashboard notification):
  - Consumer lag > 1 minute
  - Edge gateway CPU > 85%
  - Single sensor staleness > 5 minutes
  - Minor data quality fluctuations
```

### 5.2 SLO-Based Alerting

```
SLO Burn Rate Alerts:

SLO: Telemetry ingestion availability = 99.95%
  Monthly error budget: 21.6 minutes

  Alert: Fast burn (consuming budget 14.4x faster than sustainable)
    Window: 5 minutes
    Trigger: Error rate > 14.4 × 0.05% = 0.72%
    Action: Page on-call (will exhaust budget in 1.5 hours)

  Alert: Slow burn (consuming budget 3x faster than sustainable)
    Window: 6 hours
    Trigger: Error rate > 3 × 0.05% = 0.15%
    Action: Create ticket (will exhaust budget in 10 days)

SLO: Alert delivery latency < 30 seconds (p99)
  Alert: p99 latency > 30 seconds for 5 consecutive minutes
    Action: Page on-call
    Runbook: Check notification service health, queue depths,
             operator console connectivity

SLO: Edge gateway availability = 99.999%
  Alert: Any gateway unresponsive for > 2 minutes
    Action: Auto-restart via watchdog; alert if restart fails
    Runbook: Check network connectivity, power supply, hardware health
```

### 5.3 Escalation Matrix

| Alert Level | Initial Responder | Escalation (15 min) | Escalation (1 hr) | Escalation (4 hr) |
|---|---|---|---|---|
| **CRITICAL** | On-call platform engineer | Platform team lead | VP Engineering | CTO |
| **HIGH** | On-call platform engineer | Platform team lead | Engineering manager | VP Engineering |
| **MEDIUM** | Monitoring team | On-call platform engineer | Platform team lead | Engineering manager |
| **LOW** | Dashboard only | N/A | N/A | N/A |

For security-related alerts, parallel escalation to:
- Security Operations Center (SOC)
- OT Security team (for OT zone-related events)
- Plant operations manager (for any alert affecting production)

---

## 6. Dashboards

### 6.1 Platform Operations Dashboard

```
Platform Operations Dashboard Layout:

┌─────────────────────────────────────────────────────────────┐
│ IIoT Platform Health                           [All Sites] │
├─────────────────┬───────────────┬───────────────────────────┤
│ Ingestion Rate  │ Active        │ TSDB Write Latency        │
│ ████████████░░  │ Connections   │ p50: 3ms  p99: 18ms      │
│ 2.3M pts/sec    │ 18,432 GWs   │ ████████████░░             │
│ (target: 2.5M)  │ (98.2% of    │                           │
│                 │ registered)  │                           │
├─────────────────┴───────────────┴───────────────────────────┤
│ Facility Status                                             │
│ ┌──────────┬──────┬───────┬────────┬──────┬──────────────┐ │
│ │ Facility │Status│Sensors│Ingest/s│Buffer│Last Update    │ │
│ ├──────────┼──────┼───────┼────────┼──────┼──────────────┤ │
│ │ Plant A  │ OK   │100,000│ 25,000 │ 0%   │ 2s ago       │ │
│ │ Plant B  │ WARN │ 50,000│ 12,000 │ 15%  │ 5s ago       │ │
│ │ Plant C  │ OK   │ 75,000│ 18,000 │ 0%   │ 1s ago       │ │
│ │ Rig D    │ DISC │ 10,000│      0 │ 42%  │ 3 hrs ago    │ │
│ └──────────┴──────┴───────┴────────┴──────┴──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Active Alerts: 3 Critical │ 12 High │ 45 Medium │ 120 Low │
│ Oldest Unacknowledged: 7 minutes                           │
│ Alarm Rate: 2.3/min (normal: 1.5-3.0/min)                 │
├─────────────────────────────────────────────────────────────┤
│ Error Budget Remaining                                      │
│ Ingestion SLO (99.95%): ████████████████░░ 78% remaining   │
│ Alert SLO (99.99%):     █████████████████░ 92% remaining   │
│ Query SLO (99.9%):      ████████████████░░ 85% remaining   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Edge Fleet Dashboard

```
Edge Fleet Dashboard:

┌─────────────────────────────────────────────────────────────┐
│ Edge Gateway Fleet                        [Filter: Plant A] │
├──────────┬──────┬────────┬───────┬────────┬────────────────┤
│ Gateway  │Status│Firmware│CPU (%)│Buffer %│ Sensors Online │
├──────────┼──────┼────────┼───────┼────────┼────────────────┤
│ GW-A-001 │ OK   │ 3.2.1  │  45   │   0    │ 498/500       │
│ GW-A-002 │ OK   │ 3.2.1  │  62   │   0    │ 500/500       │
│ GW-A-003 │ WARN │ 3.1.9  │  88   │   5    │ 495/500       │
│ GW-A-004 │ CRIT │ 3.2.1  │  95   │  45    │ 312/500       │
│ GW-A-005 │ OFF  │ 3.2.0  │  --   │  --    │ 0/500         │
├──────────┴──────┴────────┴───────┴────────┴────────────────┤
│ Fleet Summary: 198/200 online (99.0%)                      │
│ Firmware Compliance: 195/200 on target v3.2.1 (97.5%)      │
│ OTA Rollout in Progress: v3.2.2 → Stage: Canary (5%)      │
└─────────────────────────────────────────────────────────────┘
```

---

*Next: [Interview Guide ->](./08-interview-guide.md)*
