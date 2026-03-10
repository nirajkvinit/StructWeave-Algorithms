# Observability — eBPF-based Observability Platform

## The Meta-Challenge: Observing the Observer

An eBPF-based observability platform faces a unique recursive challenge: **it must monitor itself using the same mechanisms it provides to others, without creating infinite feedback loops.** If the observability platform's own agent generates events that are captured by its own eBPF programs, which generate more events, the system could spiral into unbounded self-observation.

### Self-Observation Architecture

```
Design Principle: Separate the "observation of others" path from the
"observation of self" path at the eBPF level.

Implementation:
  1. The agent's own PID/cgroup is registered in an "exclude" map
  2. All eBPF programs check this map first and skip events from the agent
  3. Agent self-metrics are emitted via a separate, lightweight channel
     (direct Prometheus exposition, not through the eBPF pipeline)
  4. Meta-monitoring uses a separate, minimal eBPF program that only
     tracks the agent's resource consumption (CPU, memory, FD count)
```

---

## Metrics (USE/RED)

### eBPF Data Plane Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `ebpf_program_run_count` | Counter (per program) | Number of times each eBPF program was triggered | N/A (informational) |
| `ebpf_program_run_duration_ns` | Histogram (per program) | Execution time of each eBPF program invocation | p99 >10μs for any program |
| `ebpf_program_errors_total` | Counter (per program) | Number of errors (helper call failures, map lookup misses) | >100/min for any program |
| `ebpf_map_entries_count` | Gauge (per map) | Current number of entries in each map | >90% of max_entries |
| `ebpf_map_memory_bytes` | Gauge (per map) | Memory consumed by each map | >80% of allocated budget |
| `ebpf_ringbuf_used_bytes` | Gauge | Current ring buffer fill level | >75% triggers adaptive sampling |
| `ebpf_ringbuf_dropped_events` | Counter | Events dropped due to ring buffer full | >0 for any 1-minute window |
| `ebpf_ringbuf_discarded_events` | Counter | Events intentionally discarded (adaptive sampling) | N/A (expected under load) |
| `ebpf_verifier_rejections` | Counter | Programs that failed verification | >0 indicates compatibility issue |

### Node Agent Metrics (USE)

| Category | Metric | Description | Alert Threshold |
|----------|--------|-------------|-----------------|
| **Utilization** | `agent_cpu_seconds_total` | CPU consumed by the agent process | >400m sustained (80% of 500m limit) |
| **Utilization** | `agent_memory_rss_bytes` | Resident memory of the agent | >400 MB (80% of 512 MB limit) |
| **Utilization** | `agent_open_fds` | Open file descriptors (BPF fds, sockets) | >80% of ulimit |
| **Saturation** | `agent_ringbuf_consumer_lag_events` | Events waiting in ring buffer | >10K events |
| **Saturation** | `agent_wal_buffer_bytes` | Bytes buffered in local WAL | >100 MB |
| **Saturation** | `agent_grpc_pending_bytes` | Bytes waiting to be sent to collector | >50 MB |
| **Errors** | `agent_event_processing_errors` | Events that failed enrichment or serialization | >10/min |
| **Errors** | `agent_collector_send_failures` | Failed gRPC send attempts | >5/min |
| **Errors** | `agent_k8s_watch_disconnects` | K8s API watch stream disconnections | >1/hour |

### Collector Metrics (RED)

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `collector_events_received_total` | Counter | Total events received from all agents | Rate drop >50% over 5 min |
| `collector_events_processed_total` | Counter | Events successfully written to storage | Rate divergence >5% from received |
| `collector_event_processing_duration` | Histogram | Time to process and store each event batch | p99 >2s |
| `collector_errors_total` | Counter (by error type) | Processing errors (deserialization, storage write) | >100/min |
| `collector_connected_agents` | Gauge | Number of agents with active gRPC streams | Drop >10% from expected |
| `collector_backpressure_signals` | Counter | Number of SLOW_DOWN/PAUSE signals sent | >10/min |

### Service-Level Metrics (RED for Observed Services)

| Metric | Description | Labels |
|--------|-------------|--------|
| `http_requests_total` | Total HTTP requests observed | source_service, dest_service, method, status_code |
| `http_request_duration_seconds` | Request latency | source_service, dest_service, method |
| `http_errors_total` | HTTP 4xx/5xx responses | source_service, dest_service, status_code |
| `dns_queries_total` | DNS queries observed | query_type, response_code |
| `dns_query_duration_seconds` | DNS resolution latency | query_type |
| `tcp_connections_total` | TCP connections established | source_service, dest_service |
| `tcp_connection_errors_total` | TCP connection failures (resets, timeouts) | source_service, dest_service, error_type |

### Dashboard Design

**Tier 1: Platform Health Dashboard (SRE)**
- eBPF program load status (per node, per program type)
- Ring buffer utilization heat map (nodes × time)
- Event throughput (events/sec, cluster-wide and per-node)
- Agent resource consumption (CPU, memory, across all nodes)
- Collector ingestion lag
- Kernel version distribution across the fleet

**Tier 2: Service Observability Dashboard (Developer)**
- Service dependency map (auto-discovered from network flows)
- Per-service RED metrics (rate, errors, duration)
- Top-N slowest endpoints
- DNS resolution performance
- Per-service flame graph (CPU profile)

**Tier 3: Security Dashboard (Security Operator)**
- Policy enforcement actions (allow/deny/kill timeline)
- Security event severity distribution
- Process execution anomalies
- Network policy violations
- File access audit trail

### Alerting Thresholds

#### Critical Alerts (Page-Worthy)

| Alert | Condition | Impact |
|-------|-----------|--------|
| `eBPFAgentDown` | No heartbeat from agent for >60s | Complete observability loss for that node |
| `RingBufferOverflow` | `ebpf_ringbuf_dropped_events` > 0 sustained for 5 min | Unrecoverable event loss |
| `SecurityEnforcementFailure` | Security program failed to load on a node | Security policy not enforced on that node |
| `CollectorIngestionStopped` | `collector_events_received_total` rate = 0 for 5 min | No new data flowing into the platform |
| `VerifierRejection` | Program failed verification after upgrade | Feature regression; reduced observability on affected nodes |

#### Warning Alerts

| Alert | Condition | Impact |
|-------|-----------|--------|
| `RingBufferHighUtilization` | `ebpf_ringbuf_used_bytes / size` > 0.75 for 10 min | Approaching event loss; adaptive sampling active |
| `AgentHighCPU` | `agent_cpu_seconds_total` rate > 0.4 for 15 min | Agent may be impacting application workloads |
| `CollectorBackPressure` | `collector_backpressure_signals` > 0 for 10 min | Agents buffering locally; delayed data |
| `MapNearCapacity` | `ebpf_map_entries_count / max_entries` > 0.9 | Map may start evicting entries; potential data loss |
| `WALBufferGrowing` | `agent_wal_buffer_bytes` > 50 MB and increasing | Collector may be unreachable; local buffer filling |
| `KernelVersionUnsupported` | Node kernel version not in compatibility matrix | eBPF programs running in degraded mode |

---

## Logging

### What to Log

| Component | Log Events | Level |
|-----------|-----------|-------|
| Agent startup | Programs loaded, maps created, features detected | INFO |
| Program load failure | Verifier rejection with error details | ERROR |
| Feature probe results | Kernel capabilities detected | INFO |
| Ring buffer statistics | Fill level, drop count (periodic) | DEBUG |
| Collector connection | Connect, disconnect, reconnect events | INFO |
| Policy update | Security policy loaded/updated/removed | INFO |
| Graceful degradation | Fallback program loaded, sampling activated | WARN |
| Agent resource warning | Approaching CPU/memory limits | WARN |

### Log Levels Strategy

| Level | Usage | Volume |
|-------|-------|--------|
| ERROR | Component failure requiring human attention | <10/hour in normal operation |
| WARN | Degraded operation; system still functional | <100/hour |
| INFO | Significant lifecycle events (startup, connection, policy change) | <1,000/hour |
| DEBUG | Periodic statistics, detailed event processing | Disabled by default; enable per-component |

### Structured Logging Format

```
{
  "timestamp": "2026-03-10T10:05:19.432Z",
  "level": "WARN",
  "component": "ring_buffer_consumer",
  "node_id": "node-042",
  "message": "Adaptive sampling activated",
  "details": {
    "ring_buffer_name": "network_events",
    "fill_ratio": 0.78,
    "sampling_ratio": 0.5,
    "events_per_sec": 85000
  }
}
```

---

## Distributed Tracing (of the Platform Itself)

### Trace Propagation Strategy

The platform does not use traditional distributed tracing for its internal operations (it would create circular dependency). Instead, it uses **causal event IDs**:

- Each event batch is assigned a `batch_id` at the agent
- The collector preserves `batch_id` through its pipeline
- When querying, the path of any specific event can be traced: `kernel capture → ring buffer → agent processing → collector → storage`
- Timing information at each stage enables latency breakdown without distributed tracing

### Key Spans (Conceptual)

| Span | Start | End | Key Attributes |
|------|-------|-----|---------------|
| `kernel_capture` | eBPF program entry | Ring buffer submit | program_type, event_type, cpu_id |
| `ringbuf_transit` | Ring buffer submit | Consumer read | queue_depth, wait_time |
| `agent_processing` | Consumer read | WAL write | enrichment_time, aggregation_time |
| `collector_delivery` | gRPC send | ACK received | batch_size, compression_ratio |
| `storage_write` | Collector receive | Storage ACK | storage_backend, write_latency |

---

## Alerting

### Runbook References

| Alert | Runbook |
|-------|---------|
| `eBPFAgentDown` | Check node status; verify DaemonSet pod health; check agent logs for OOM or crash loop; verify kernel compatibility |
| `RingBufferOverflow` | Increase ring buffer size; identify noisy pods; enable adaptive sampling; consider per-cgroup rate limits |
| `SecurityEnforcementFailure` | Check verifier log; verify kernel version; try loading fallback program; escalate if security policy is critical |
| `CollectorIngestionStopped` | Check collector health; verify network connectivity; check storage backend status; verify agent connection status |
| `VerifierRejection` | Review verifier error log; check if kernel was recently upgraded; verify BTF availability; try reduced program variant |

---

## Meta-Monitoring Anti-Patterns

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| **Self-observation loop** | Agent's own events captured by its eBPF programs | Exclude agent cgroup from observation maps |
| **Alert-on-alert** | Alert firing triggers events that fire more alerts | Alert deduplication with cooldown period; suppress self-referential alerts |
| **Profiling the profiler** | CPU profiler sampling the profiler's own stack traces | Profiler excludes its own PID from sampling |
| **Dashboard-induced load** | Dashboard queries generate query events that update dashboards | Query API events excluded from real-time pipeline; only captured in audit log |
