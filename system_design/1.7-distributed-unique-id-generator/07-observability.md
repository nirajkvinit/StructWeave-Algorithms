# Observability

[← Back to Index](./00-index.md)

---

## Metrics

### Key Metrics (USE/RED)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          KEY METRICS                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  USE Metrics (Utilization, Saturation, Errors):                             │
│  ──────────────────────────────────────────────                             │
│                                                                              │
│  UTILIZATION                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Metric                    │ Type    │ Description                       ││
│  ├───────────────────────────┼─────────┼───────────────────────────────────┤│
│  │ idgen_sequence_usage      │ Gauge   │ Sequence # / 4096 (per ms util)  ││
│  │ idgen_capacity_percent    │ Gauge   │ (ids_generated / max) × 100      ││
│  │ idgen_machine_id_slots    │ Gauge   │ Used/Total machine ID slots      ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  SATURATION                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Metric                    │ Type    │ Description                       ││
│  ├───────────────────────────┼─────────┼───────────────────────────────────┤│
│  │ idgen_sequence_overflow   │ Counter │ Times sequence hit 4096          ││
│  │ idgen_wait_time_ms        │ Histogram│ Time spent waiting for next ms  ││
│  │ idgen_queue_depth         │ Gauge   │ Pending ID requests (if queued)  ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ERRORS                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Metric                    │ Type    │ Description                       ││
│  ├───────────────────────────┼─────────┼───────────────────────────────────┤│
│  │ idgen_clock_backward      │ Counter │ Clock moved backward events      ││
│  │ idgen_errors_total        │ Counter │ Total generation errors          ││
│  │ idgen_machine_id_conflict │ Counter │ Machine ID registration conflicts││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  RED Metrics (Rate, Errors, Duration):                                       │
│  ─────────────────────────────────────                                      │
│                                                                              │
│  RATE                                                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Metric                    │ Type    │ Description                       ││
│  ├───────────────────────────┼─────────┼───────────────────────────────────┤│
│  │ idgen_ids_total           │ Counter │ Total IDs generated              ││
│  │ idgen_ids_per_second      │ Gauge   │ Current generation rate          ││
│  │ idgen_requests_total      │ Counter │ Total API requests (if service)  ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  DURATION                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Metric                    │ Type    │ Description                       ││
│  ├───────────────────────────┼─────────┼───────────────────────────────────┤│
│  │ idgen_latency_seconds     │ Histogram│ ID generation latency           ││
│  │ idgen_zk_latency_seconds  │ Histogram│ ZK operations latency           ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Clock-Specific Metrics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CLOCK-SPECIFIC METRICS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Metric                    │ Type    │ Description          │ Alert     ││
│  ├───────────────────────────┼─────────┼──────────────────────┼───────────┤│
│  │ idgen_clock_offset_ms     │ Gauge   │ NTP offset           │ >50ms warn││
│  │ idgen_clock_drift_rate    │ Gauge   │ Drift rate (ppm)     │ >100 warn ││
│  │ idgen_clock_backward_total│ Counter │ Backward events      │ >0 critical│
│  │ idgen_clock_step_total    │ Counter │ NTP step corrections │ >0 warn   ││
│  │ idgen_last_timestamp      │ Gauge   │ Last used timestamp  │ Diagnostic││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Clock health dashboard query examples:                                      │
│  ───────────────────────────────────────                                    │
│  # Prometheus                                                                │
│  max(idgen_clock_offset_ms) by (instance)                                   │
│  rate(idgen_clock_backward_total[5m]) > 0                                   │
│                                                                              │
│  # Check if any generator has clock issues                                  │
│  count(idgen_clock_offset_ms > 50)                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Prometheus Metrics Definition

```
# HELP idgen_ids_total Total number of IDs generated
# TYPE idgen_ids_total counter
idgen_ids_total{machine_id="42", datacenter="1", format="snowflake"} 1234567890

# HELP idgen_latency_seconds ID generation latency in seconds
# TYPE idgen_latency_seconds histogram
idgen_latency_seconds_bucket{le="0.0001"} 1000000
idgen_latency_seconds_bucket{le="0.0005"} 1100000
idgen_latency_seconds_bucket{le="0.001"} 1150000
idgen_latency_seconds_bucket{le="0.005"} 1155000
idgen_latency_seconds_bucket{le="+Inf"} 1155100
idgen_latency_seconds_sum 115.51
idgen_latency_seconds_count 1155100

# HELP idgen_sequence_overflow_total Times sequence reached 4096 in a millisecond
# TYPE idgen_sequence_overflow_total counter
idgen_sequence_overflow_total{machine_id="42"} 523

# HELP idgen_clock_offset_ms Current NTP clock offset in milliseconds
# TYPE idgen_clock_offset_ms gauge
idgen_clock_offset_ms{instance="host1"} 2.5

# HELP idgen_clock_backward_total Times clock moved backward
# TYPE idgen_clock_backward_total counter
idgen_clock_backward_total{machine_id="42"} 0

# HELP idgen_machine_id Current machine ID
# TYPE idgen_machine_id gauge
idgen_machine_id{datacenter="1", worker="10"} 42
```

---

## Logging

### Log Levels and Events

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LOGGING STRATEGY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Log Levels:                                                                 │
│  ───────────                                                                │
│                                                                              │
│  ERROR - Immediate attention required                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ • Clock moved backward (refusing to generate)                          ││
│  │ • Machine ID registration failed                                        ││
│  │ • Machine ID conflict detected                                          ││
│  │ • ZooKeeper connection lost (and cache expired)                        ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  WARN - Potential issue, investigate if frequent                            │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ • Clock offset exceeds threshold (>50ms)                               ││
│  │ • Sequence overflow (waiting for next ms)                              ││
│  │ • ZooKeeper connection temporarily lost                                ││
│  │ • High generation rate (approaching capacity)                          ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  INFO - Normal operations                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ • Generator started with machine_id=X                                   ││
│  │ • Machine ID acquired/renewed                                           ││
│  │ • Generator shutdown                                                     ││
│  │ • Configuration loaded                                                   ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  DEBUG - Development/troubleshooting                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ • Individual ID generations (sampled, not all!)                        ││
│  │ • Timestamp/sequence state                                              ││
│  │ • ZK heartbeat details                                                  ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Structured Log Format

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     STRUCTURED LOG FORMAT                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  JSON log format:                                                            │
│  ────────────────                                                           │
│  {                                                                           │
│    "timestamp": "2024-01-20T15:00:00.123Z",                                 │
│    "level": "WARN",                                                          │
│    "logger": "idgen",                                                        │
│    "message": "Sequence overflow, waiting for next millisecond",            │
│    "machine_id": 42,                                                         │
│    "datacenter_id": 1,                                                       │
│    "worker_id": 10,                                                          │
│    "current_timestamp": 1705789200123,                                      │
│    "sequence_at_overflow": 4095,                                             │
│    "wait_time_ms": 0.5,                                                      │
│    "trace_id": "abc123",                                                     │
│    "span_id": "def456"                                                       │
│  }                                                                           │
│                                                                              │
│  Example log messages:                                                       │
│  ─────────────────────                                                      │
│                                                                              │
│  // Startup                                                                  │
│  {"level":"INFO","message":"ID generator started",                          │
│   "machine_id":42,"datacenter_id":1,"worker_id":10,                         │
│   "epoch":1288834974657,"version":"1.2.0"}                                  │
│                                                                              │
│  // Clock drift warning                                                      │
│  {"level":"WARN","message":"Clock offset exceeds threshold",                │
│   "offset_ms":75,"threshold_ms":50,"ntp_server":"time.google.com"}          │
│                                                                              │
│  // Clock backward error                                                     │
│  {"level":"ERROR","message":"Clock moved backward, refusing to generate",   │
│   "current_ts":1705789200000,"last_ts":1705789200050,"diff_ms":50}         │
│                                                                              │
│  // Machine ID conflict                                                      │
│  {"level":"ERROR","message":"Machine ID conflict detected",                 │
│   "machine_id":42,"conflicting_host":"host2.example.com"}                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Distributed Tracing

### Trace Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DISTRIBUTED TRACING                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  For embedded library (typical case):                                        │
│  ─────────────────────────────────────                                      │
│  ID generation is usually a single in-process call, so tracing is minimal. │
│  Include generator info in parent span attributes:                          │
│                                                                              │
│  span.set_attribute("idgen.machine_id", 42)                                 │
│  span.set_attribute("idgen.generated_id", id)                               │
│  span.set_attribute("idgen.format", "snowflake")                            │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  For centralized service:                                                    │
│  ─────────────────────────                                                  │
│  Trace the full request:                                                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Order Service                    ID Generator Service              │   │
│  │  ─────────────                    ────────────────────              │   │
│  │  ┌──────────────────────────┐    ┌──────────────────────────┐      │   │
│  │  │ span: create_order       │    │ span: generate_id        │      │   │
│  │  │   │                      │    │   │                      │      │   │
│  │  │   ├─► HTTP POST /ids ────┼────┼───┤                      │      │   │
│  │  │   │                      │    │   ├─► get_timestamp      │      │   │
│  │  │   │                      │    │   ├─► increment_seq      │      │   │
│  │  │   │                      │    │   ├─► construct_id       │      │   │
│  │  │   ◄─────────────────────┼────┼───┤                      │      │   │
│  │  │   │                      │    │   │                      │      │   │
│  │  │   ├─► insert_to_db       │    └───┴──────────────────────┘      │   │
│  │  │   │                      │                                       │   │
│  │  └───┴──────────────────────┘                                       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Key spans to instrument:                                                    │
│  ─────────────────────────                                                  │
│  • generate_id (overall operation)                                          │
│  • get_timestamp (if measuring system call overhead)                        │
│  • wait_for_next_ms (only if sequence overflow)                            │
│  • zk_operation (machine ID registration/heartbeat)                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Alerting

### Alert Rules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ALERT RULES                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CRITICAL ALERTS (Page immediately):                                         │
│  ───────────────────────────────────                                        │
│                                                                              │
│  Alert: ClockMovedBackward                                                   │
│  Condition: rate(idgen_clock_backward_total[5m]) > 0                        │
│  Severity: CRITICAL                                                          │
│  Message: "ID generator detected clock moving backward"                      │
│  Action: Check NTP, investigate system time issues                          │
│                                                                              │
│  Alert: MachineIdConflict                                                    │
│  Condition: idgen_machine_id_conflict_total > 0                             │
│  Severity: CRITICAL                                                          │
│  Message: "Machine ID conflict detected - duplicate IDs possible"           │
│  Action: Immediately stop one generator, investigate                        │
│                                                                              │
│  Alert: GeneratorDown                                                        │
│  Condition: up{job="idgen"} == 0                                            │
│  Severity: CRITICAL (if insufficient redundancy)                            │
│  Message: "ID generator is down"                                             │
│  Action: Check service health, restart if needed                            │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  WARNING ALERTS (Investigate soon):                                          │
│  ──────────────────────────────────                                         │
│                                                                              │
│  Alert: HighClockDrift                                                       │
│  Condition: idgen_clock_offset_ms > 50                                      │
│  Severity: WARNING                                                           │
│  Message: "Clock offset exceeds 50ms threshold"                             │
│  Action: Check NTP configuration and connectivity                           │
│                                                                              │
│  Alert: HighSequenceOverflowRate                                             │
│  Condition: rate(idgen_sequence_overflow_total[5m]) > 100                   │
│  Severity: WARNING                                                           │
│  Message: "High sequence overflow rate - approaching capacity"              │
│  Action: Consider adding more generators                                    │
│                                                                              │
│  Alert: ZooKeeperDisconnected                                                │
│  Condition: idgen_zk_connected == 0 for 5m                                  │
│  Severity: WARNING                                                           │
│  Message: "ID generator disconnected from ZooKeeper"                        │
│  Action: Check ZK cluster health, network connectivity                      │
│                                                                              │
│  Alert: HighLatency                                                          │
│  Condition: histogram_quantile(0.99, idgen_latency_seconds) > 0.001         │
│  Severity: WARNING                                                           │
│  Message: "ID generation p99 latency exceeds 1ms"                           │
│  Action: Investigate sequence overflows, lock contention                    │
│                                                                              │
│  ───────────────────────────────────────────────────────────────────────    │
│                                                                              │
│  INFORMATIONAL ALERTS:                                                       │
│  ──────────────────────                                                     │
│                                                                              │
│  Alert: ApproachingMachineIdLimit                                            │
│  Condition: idgen_machine_id_slots_used / idgen_machine_id_slots_total > 0.8│
│  Severity: INFO                                                              │
│  Message: "Using >80% of machine ID slots"                                   │
│  Action: Plan for Sonyflake migration or machine ID reclamation            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Prometheus Alert Rules

```yaml
groups:
  - name: idgen_alerts
    rules:
      - alert: ClockMovedBackward
        expr: rate(idgen_clock_backward_total[5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Clock moved backward on {{ $labels.instance }}"
          description: "ID generator detected clock moving backward. Duplicate IDs possible."
          runbook: "https://wiki/runbooks/idgen/clock-backward"

      - alert: MachineIdConflict
        expr: increase(idgen_machine_id_conflict_total[5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Machine ID conflict on {{ $labels.instance }}"
          description: "Two generators have the same machine ID. Duplicate IDs being generated!"

      - alert: HighClockDrift
        expr: abs(idgen_clock_offset_ms) > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High clock drift on {{ $labels.instance }}"
          description: "Clock offset is {{ $value }}ms, exceeds 50ms threshold."

      - alert: HighSequenceOverflowRate
        expr: rate(idgen_sequence_overflow_total[5m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High sequence overflow rate on {{ $labels.instance }}"
          description: "{{ $value }} overflows per second. Generator approaching capacity."
```

---

## Dashboard Design

### Key Dashboard Panels

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   ID GENERATOR DASHBOARD                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Row 1: Overview                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│  │ IDs Generated   │ │ Active          │ │ Clock Health    │               │
│  │ 1.2B today      │ │ Generators: 8   │ │ All OK ✓        │               │
│  │ ▲ 5% vs yday    │ │ Capacity: 32M/s │ │ Max drift: 3ms  │               │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘               │
│                                                                              │
│  Row 2: Generation Rate                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  IDs per Second by Generator                                         │   │
│  │  ▃▅▆▇▆▅▄▃▂▁▂▃▄▅▆▇▇▆▅▄▃                                              │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │
│  │  Time: Last 1 hour                                        Avg: 50K/s   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Row 3: Latency                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Generation Latency Percentiles                                      │   │
│  │  p50: 0.05ms  │  p95: 0.2ms  │  p99: 0.8ms  │  p99.9: 2.1ms        │   │
│  │                                                                       │   │
│  │  ▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▅▅▅▃▃▃▃▃▃                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Row 4: Clock & Sequence Health                                              │
│  ┌───────────────────────────┐ ┌───────────────────────────┐               │
│  │ Clock Offset by Host      │ │ Sequence Overflows/min    │               │
│  │                           │ │                           │               │
│  │ host1: ▪▪▪ 2ms           │ │ Gen1: ▓░░░ 5              │               │
│  │ host2: ▪▪  1ms           │ │ Gen2: ▓▓░░ 12             │               │
│  │ host3: ▪▪▪▪ 4ms          │ │ Gen3: ▓░░░ 3              │               │
│  └───────────────────────────┘ └───────────────────────────┘               │
│                                                                              │
│  Row 5: Machine ID Usage                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Machine ID Slots: ████████████████████░░░░░░░░░░ 20/32 used (62%)   │   │
│  │ DC1: 8/32  │  DC2: 7/32  │  DC3: 5/32  │  Reserved: 12/32           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Runbooks

### Runbook: Clock Moved Backward

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  RUNBOOK: CLOCK MOVED BACKWARD                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Severity: CRITICAL                                                          │
│  Impact: ID generation paused on affected generator                         │
│                                                                              │
│  Symptoms:                                                                    │
│  • Alert: ClockMovedBackward fired                                          │
│  • Error logs: "Clock moved backward, refusing to generate"                 │
│  • Increased errors from dependent services                                 │
│                                                                              │
│  Investigation Steps:                                                        │
│  ─────────────────────                                                      │
│  1. Check NTP status on affected host:                                      │
│     $ chronyc tracking                                                       │
│     $ chronyc sources -v                                                    │
│                                                                              │
│  2. Check for NTP step correction:                                          │
│     $ journalctl -u chronyd | grep -i step                                  │
│                                                                              │
│  3. Check system time vs NTP:                                               │
│     $ date; chronyc tracking | grep "System time"                           │
│                                                                              │
│  Remediation:                                                                │
│  ────────────                                                               │
│  1. If NTP stepped clock backward:                                          │
│     • Generator will auto-recover when clock catches up                    │
│     • Monitor: watch -n1 'date +%s%3N'                                      │
│                                                                              │
│  2. If persistent NTP issues:                                               │
│     • Restart chronyd: systemctl restart chronyd                            │
│     • Check network connectivity to NTP servers                            │
│                                                                              │
│  3. If hardware clock issue:                                                │
│     • Schedule host replacement                                             │
│     • Route traffic away from affected generator                           │
│                                                                              │
│  Recovery Verification:                                                      │
│  ──────────────────────                                                     │
│  • Clock offset returns to <50ms                                            │
│  • ID generation resumes (check rate metrics)                              │
│  • No new clock backward events                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Runbook: High Sequence Overflow Rate

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                RUNBOOK: HIGH SEQUENCE OVERFLOW RATE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Severity: WARNING                                                           │
│  Impact: Increased latency, potential capacity issues                       │
│                                                                              │
│  Symptoms:                                                                    │
│  • Alert: HighSequenceOverflowRate fired                                    │
│  • Increased p99 latency                                                    │
│  • Warn logs: "Sequence overflow, waiting for next millisecond"            │
│                                                                              │
│  Investigation Steps:                                                        │
│  ─────────────────────                                                      │
│  1. Check current generation rate:                                          │
│     rate(idgen_ids_total[5m])                                              │
│                                                                              │
│  2. Identify hot generators:                                                │
│     topk(5, rate(idgen_sequence_overflow_total[5m]))                       │
│                                                                              │
│  3. Check if traffic is evenly distributed:                                 │
│     stddev(rate(idgen_ids_total[5m])) by (machine_id)                      │
│                                                                              │
│  Remediation:                                                                │
│  ────────────                                                               │
│  1. Short-term: Add more generators                                         │
│     • Deploy new instances with unused machine IDs                         │
│     • Update load balancer to include new instances                        │
│                                                                              │
│  2. Medium-term: Improve load distribution                                  │
│     • Review load balancing algorithm (round-robin vs random)              │
│     • Check for hot spots (specific services overusing)                    │
│                                                                              │
│  3. Long-term: Capacity planning                                            │
│     • Review growth trends                                                  │
│     • Plan for machine ID expansion (Sonyflake) if needed                  │
│                                                                              │
│  Recovery Verification:                                                      │
│  ──────────────────────                                                     │
│  • Overflow rate drops below threshold                                      │
│  • p99 latency returns to <1ms                                             │
│  • Load evenly distributed across generators                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
