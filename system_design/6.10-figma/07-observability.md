# Observability

## Key Metrics

### Multiplayer Performance Metrics

| Metric | Description | Collection Point | Target |
|--------|-------------|-----------------|--------|
| `multiplayer.operation_latency_ms` | Time from client send to server ack | Multiplayer Server | p50 < 30ms, p99 < 200ms |
| `multiplayer.propagation_latency_ms` | Time from client send to peer receive | Client (measured via timestamp in op) | p50 < 50ms, p99 < 200ms |
| `multiplayer.fanout_time_ms` | Time to broadcast operation to all peers | Multiplayer Server | p99 < 10ms (per file) |
| `multiplayer.operations_per_second` | Operations processed per server | Multiplayer Server | < 50,000 per server |
| `multiplayer.active_sessions` | Number of active file sessions | Multiplayer Server | Per server and global |
| `multiplayer.connections_per_server` | WebSocket connections per server | Multiplayer Server | < 10,000 |
| `multiplayer.desync_events` | Clients detecting state divergence | Client (reported to server) | < 0.001% of sessions |
| `multiplayer.reconnect_count` | WebSocket reconnection events | Client + Server | Track by cause (network, server restart, etc.) |
| `multiplayer.reconnect_storm_rate` | Reconnections per second across all clients | Server | Alert if > 1000/sec |
| `multiplayer.offline_queue_size` | Operations queued during offline | Client (reported on reconnect) | Alert if p99 > 5000 |

### WebSocket Connection Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| `ws.connection_duration_sec` | How long WebSocket connections last | Median > 30 min |
| `ws.handshake_latency_ms` | Time from TCP connect to authenticated session | p99 < 500ms |
| `ws.messages_in_per_sec` | Inbound messages per connection | Alert if > 200/sec |
| `ws.messages_out_per_sec` | Outbound messages per connection | Alert if > 1000/sec |
| `ws.bytes_in_per_sec` | Inbound bandwidth per connection | Monitor trends |
| `ws.bytes_out_per_sec` | Outbound bandwidth per connection | Monitor trends |
| `ws.close_reason` | WebSocket close codes distribution | Track abnormal closes |
| `ws.connection_errors` | Failed connection attempts | Alert on spike |

### Canvas Rendering Performance (Client-Side)

| Metric | Description | Collection | Target |
|--------|-------------|------------|--------|
| `render.fps` | Frames per second during interaction | Client | > 60 FPS (< 50K nodes) |
| `render.frame_time_ms` | Time per frame | Client | p99 < 16ms |
| `render.scene_graph_nodes` | Total nodes in current file | Client | Alert > 200K for perf team |
| `render.visible_nodes` | Nodes in current viewport | Client | Typically < 500 |
| `render.draw_calls` | WebGL draw calls per frame | Client | < 1000 |
| `render.gpu_memory_mb` | GPU memory used by renderer | Client | Alert > 500MB |
| `render.wasm_heap_mb` | WASM linear memory usage | Client | Alert > 200MB |
| `render.texture_atlas_usage` | Glyph atlas fill percentage | Client | Alert > 90% |
| `render.tessellation_time_ms` | Path tessellation for complex vectors | Client | p99 < 5ms |
| `render.text_layout_time_ms` | Text shaping and layout | Client | p99 < 2ms |

### File Operations

| Metric | Description | Target |
|--------|-------------|--------|
| `file.open_latency_ms` | Time from click to rendered canvas | p50 < 1s, p99 < 5s |
| `file.scene_graph_load_ms` | Time to load and parse scene graph | p50 < 500ms |
| `file.scene_graph_size_bytes` | Size of scene graph blob | Monitor growth |
| `file.save_latency_ms` | Time to persist scene graph snapshot | p99 < 1s |
| `file.export_latency_ms` | Time to generate export (PNG/SVG/PDF) | p99 < 15s |
| `file.version_restore_ms` | Time to restore a historical version | p99 < 15s |

### Plugin Execution Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| `plugin.start_latency_ms` | Time to load and initialize plugin iframe | p99 < 1s |
| `plugin.execution_time_ms` | Total plugin run time | Alert > 30s |
| `plugin.api_calls_per_run` | Number of API calls per plugin execution | Alert > 5000 |
| `plugin.memory_usage_mb` | Peak memory used by plugin iframe | Alert > 200MB |
| `plugin.crash_count` | Plugin crashes (uncaught exceptions) | Per plugin, per day |
| `plugin.bridge_latency_ms` | Round-trip time for plugin ↔ main thread message | p99 < 10ms |
| `plugin.error_rate` | Percentage of plugin runs that error | Per plugin, alert > 5% |

### Component System Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| `component.instance_count` | Number of instances per component | Monitor (alert > 10K) |
| `component.override_count` | Average overrides per instance | Monitor trends |
| `component.propagation_time_ms` | Time to propagate component change to all instances | p99 < 100ms |
| `component.library_load_ms` | Time to load team library | p99 < 3s |
| `component.publish_time_ms` | Time to publish component to library | p99 < 5s |

---

## Alerting Rules

### Critical Alerts (Page Immediately)

| Alert | Condition | Impact |
|-------|-----------|--------|
| **Multiplayer desync** | > 10 desync events in 5 minutes | Users seeing different states |
| **WebSocket reconnect storm** | > 1000 reconnects/sec globally | Mass disconnection event |
| **Operation log write failure** | Any write failure to operation log | Data loss risk |
| **Scene graph corruption** | Checksum mismatch on load | File unloadable |
| **Multiplayer server OOM** | Memory > 95% on any server | Imminent crash |
| **All servers in region down** | Health check failures for all servers | Total outage in region |

### High Alerts (15-Minute Response)

| Alert | Condition | Impact |
|-------|-----------|--------|
| **High operation latency** | p99 operation latency > 500ms for 5 min | Noticeable collaboration lag |
| **File open latency** | p99 file open > 10s for 5 min | Degraded user experience |
| **Plugin crash spike** | Specific plugin crash rate > 20% for 1 hour | Plugin unusable |
| **CDN error rate** | > 1% 5xx responses for 5 min | Assets not loading |
| **WebSocket error rate** | > 5% connection failures for 5 min | Users can't collaborate |
| **Database replication lag** | > 30 seconds for 10 min | Read replicas serving stale data |

### Warning Alerts (Business Hours)

| Alert | Condition | Impact |
|-------|-----------|--------|
| **Scene graph size growth** | File > 100MB scene graph | Performance risk |
| **Operation log growth** | File operation log > 1GB (30 days) | Storage cost |
| **Server CPU sustained** | > 80% for 30 min | Approaching capacity |
| **Rendering regression** | p50 FPS drops > 10% week-over-week | Client performance degradation |
| **Font loading failures** | > 0.1% font load failures | Missing fonts in designs |

---

## Distributed Tracing

### Operation Trace Flow

An edit operation flows through multiple services. Each step is a span in the trace:

```
Trace: Edit Operation (drag rectangle)
│
├── Span: Client - Local Apply (2ms)
│   ├── Update WASM scene graph
│   └── Trigger re-render
│
├── Span: Client - Send WebSocket (1ms)
│   └── Serialize CRDT operation
│
├── Span: WebSocket Gateway - Route (0.5ms)
│   └── Route to correct multiplayer server
│
├── Span: Multiplayer Server - Process (3ms)
│   ├── Validate operation
│   ├── Assign sequence number
│   └── Merge into server state
│
├── Span: Multiplayer Server - Persist (5ms async)
│   └── Append to operation log
│
├── Span: Multiplayer Server - Broadcast (2ms)
│   └── Fan out to N-1 clients
│
├── Span: Peer Client - Receive (1ms)
│   ├── Deserialize CRDT operation
│   └── Merge into local state
│
└── Span: Peer Client - Render (2ms)
    └── Re-render affected node
```

### Trace Context Propagation

```
PSEUDOCODE: Trace Context in WebSocket Messages

STRUCTURE OperationMessage:
    type: "operation"
    ops: List<Operation>
    local_seq: Int
    trace_context:               // W3C Trace Context
        trace_id: String         // 128-bit, same across all spans
        span_id: String          // 64-bit, unique per span
        trace_flags: Int         // Sampling decision

// Server adds its span and propagates trace_id to all peer messages
FUNCTION process_operation(message):
    span = start_span("multiplayer.process", parent=message.trace_context)

    // ... process operation ...

    // Propagate to peers with trace context
    broadcast_message = {
        type: "remote_operations",
        ops: message.ops,
        trace_context: {
            trace_id: message.trace_context.trace_id,
            span_id: span.span_id,
            trace_flags: message.trace_context.trace_flags
        }
    }

    span.end()
```

### Key Trace Tags

| Tag | Description | Example |
|-----|-------------|---------|
| `file.id` | File being edited | `"abc-123"` |
| `file.node_count` | Total nodes in file | `15000` |
| `user.id` | User performing action | `"user-456"` |
| `operation.type` | Type of operation | `"set_property"`, `"create_node"` |
| `operation.property` | Property being changed | `"x"`, `"fills"` |
| `session.user_count` | Current collaborator count | `12` |
| `client.type` | Client platform | `"web"`, `"desktop"` |
| `client.browser` | Browser name and version | `"Chrome/120"` |

---

## Error Tracking

### Client-Side Error Categories

| Category | Example Errors | Severity |
|----------|---------------|----------|
| **WASM crash** | Out of memory, stack overflow, assertion failure | Critical |
| **WebGL context lost** | GPU driver crash, tab backgrounded too long | High |
| **WebSocket disconnect** | Network failure, server restart | Medium |
| **Rendering error** | Invalid path data, missing font glyph, texture overflow | Medium |
| **Plugin error** | Uncaught exception in plugin iframe | Low (per plugin) |
| **Performance** | Frame time > 100ms, scene graph load > 30s | Warning |
| **Sync error** | Operation rejected by server, state vector mismatch | High |

### Client Error Reporting

```
PSEUDOCODE: Client Error Report

STRUCTURE ErrorReport:
    error_id: UUID
    timestamp: Timestamp
    error_type: String              // "wasm_crash", "webgl_context_lost", etc.
    message: String                 // Error message
    stack_trace: String?            // If available (WASM symbolicated)
    file_id: FileID                 // Which file was open
    file_node_count: Int            // File complexity
    user_action: String             // What user was doing ("dragging", "typing", etc.)
    client_info:
        browser: String
        os: String
        gpu: String                 // WebGL renderer string
        wasm_heap_size: Int
        gpu_memory_used: Int
    multiplayer_info:
        user_count: Int
        operations_in_queue: Int
        last_sync_age_ms: Int

FUNCTION report_error(error):
    // Sample non-critical errors (1% sampling for warnings)
    IF error.severity == "warning" AND random() > 0.01:
        RETURN

    // Always report critical and high severity
    send_to_error_service(error)
```

### Server-Side Error Categories

| Category | Example Errors | Response |
|----------|---------------|----------|
| **Operation validation failure** | Malformed CRDT delta, invalid node reference | Reject operation, log, alert if frequent |
| **Persistence failure** | Operation log write timeout, storage unavailable | Retry with backoff; if persistent, circuit-break writes |
| **Session state corruption** | Internal invariant violation in CRDT state | Force snapshot reload for all clients in session |
| **Resource exhaustion** | Too many connections, memory limit | Reject new connections, scale up |
| **Authentication failure** | Expired token, revoked session | Close WebSocket with appropriate error code |

---

## Dashboards

### Dashboard 1: Collaboration Health

**Purpose**: Real-time view of the multiplayer system's health

| Panel | Visualization | Source |
|-------|---------------|--------|
| Active Sessions | Single stat + time series | Multiplayer server metrics |
| Total Connected Users | Single stat + time series | WebSocket gateway metrics |
| Operation Throughput | Time series (ops/sec) | Multiplayer server metrics |
| Operation Latency | Heatmap (p50, p95, p99) | Multiplayer server metrics |
| Propagation Latency | Heatmap | Client-reported metrics |
| Desync Events | Time series + counter | Client-reported events |
| WebSocket Reconnects | Time series by cause | Server + client metrics |
| Server Utilization | CPU, memory, connections per server | Server metrics |
| Session Size Distribution | Histogram (users per session) | Multiplayer server |

### Dashboard 2: Rendering Performance

**Purpose**: Client-side rendering health across the user population

| Panel | Visualization | Source |
|-------|---------------|--------|
| FPS Distribution | Histogram (60fps, 30-60, < 30) | Client telemetry |
| Frame Time p99 | Time series | Client telemetry |
| Scene Graph Size Distribution | Histogram | Client telemetry |
| WASM Heap Usage | Percentile lines | Client telemetry |
| GPU Memory Usage | Percentile lines | Client telemetry |
| Draw Calls per Frame | Histogram | Client telemetry |
| File Open Latency | Percentile lines | Client telemetry |
| Text Rendering Time | Percentile lines | Client telemetry |
| WASM Crash Rate | Time series + counter | Error tracking |
| WebGL Context Lost | Time series + counter | Error tracking |

### Dashboard 3: File Access Patterns

**Purpose**: Understand file usage patterns for capacity planning

| Panel | Visualization | Source |
|-------|---------------|--------|
| Files Opened per Hour | Time series | API Gateway logs |
| File Size Distribution | Histogram | Storage metrics |
| Top Files by User Count | Table | Multiplayer server |
| Top Files by Operation Count | Table | Operation log |
| Version History Usage | Time series (restores/day) | Version service |
| Branch Usage | Time series (creates, merges/day) | Branch service |
| Export Volume | Time series by format | Export service |
| Comment Activity | Time series | Comment service |

### Dashboard 4: Plugin Ecosystem

**Purpose**: Monitor plugin health and adoption

| Panel | Visualization | Source |
|-------|---------------|--------|
| Plugin Installs per Day | Time series | Plugin service |
| Plugin Executions per Hour | Time series | Plugin runtime |
| Top Plugins by Usage | Table | Plugin runtime |
| Plugin Error Rate | Time series by plugin | Error tracking |
| Plugin Execution Time | Heatmap by plugin | Plugin runtime |
| Plugin API Call Volume | Time series | Plugin bridge |
| Plugin Memory Usage | Percentile lines by plugin | Plugin runtime |
| Blocked Plugin Actions | Counter | Plugin bridge (rate limiter) |

### Dashboard 5: Storage & Cost

**Purpose**: Track storage growth and optimize costs

| Panel | Visualization | Source |
|-------|---------------|--------|
| Total Scene Graph Storage | Time series + growth rate | Storage metrics |
| Operation Log Storage | Time series (rolling 30-day) | Storage metrics |
| Asset Storage | Time series by type (image, font) | Storage metrics |
| CDN Bandwidth | Time series + cost | CDN metrics |
| Cache Hit Rate | Time series (scene graph cache) | Cache metrics |
| Deduplication Savings | Single stat | Asset service |
| Storage Cost by Tier | Stacked area chart | Billing metrics |

---

## Log Aggregation

### Structured Log Format

```
{
  "timestamp": "2026-03-08T10:30:15.234Z",
  "level": "info",
  "service": "multiplayer-server",
  "instance": "ms-west-07",
  "trace_id": "abc123...",
  "span_id": "def456...",
  "event": "operation_processed",
  "file_id": "file-789",
  "user_id": "user-012",
  "operation_type": "set_property",
  "sequence_id": 428572,
  "processing_time_ms": 3,
  "session_user_count": 12,
  "message": "Property change processed and broadcast"
}
```

### Log Levels by Service

| Service | DEBUG | INFO | WARN | ERROR |
|---------|-------|------|------|-------|
| **Multiplayer Server** | Operation details, CRDT merge steps | Session lifecycle, user join/leave | Slow operations, high fanout | Desync, persistence failure |
| **WebSocket Gateway** | Connection negotiation | Connect/disconnect | Reconnect storms, rate limiting | Auth failure, protocol error |
| **Document Service** | Cache hit/miss | File load/save | Large files, slow queries | Storage errors |
| **Plugin Runtime** | API call details | Plugin start/stop | Resource limits approached | Plugin crash, security violation |
| **CDN** | Cache decisions | — | Cache miss rate spike | Origin errors |

### Log Retention

| Log Level | Hot (Searchable) | Warm (Archived) | Cold |
|-----------|-----------------|-----------------|------|
| ERROR | 30 days | 1 year | 3 years |
| WARN | 14 days | 90 days | 1 year |
| INFO | 7 days | 30 days | — |
| DEBUG | 24 hours | — | — |

---

## Health Checks

### Service Health Check Endpoints

| Service | Endpoint | Checks | Interval |
|---------|----------|--------|----------|
| Multiplayer Server | `/health` | Memory, CPU, active sessions, operation log writability | 10s |
| WebSocket Gateway | `/health` | Connection count, upstream connectivity | 10s |
| Document Service | `/health` | Database connectivity, cache connectivity, storage accessibility | 15s |
| Plugin Runtime | `/health` | Iframe sandbox creation, message bridge | 30s |
| CDN | Origin health check | Response time, error rate | 30s |

### Synthetic Monitoring

| Check | Frequency | Timeout | Description |
|-------|-----------|---------|-------------|
| File open (cold) | 5 min | 10s | Load a test file from scratch, verify scene graph integrity |
| File open (warm) | 1 min | 3s | Load a recently-accessed test file |
| Multiplayer round-trip | 1 min | 2s | Send operation from test client A, verify receipt at test client B |
| Cursor sync | 1 min | 1s | Send cursor update, verify propagation |
| Export | 5 min | 30s | Export a test frame as PNG, verify output |
| Plugin execution | 5 min | 10s | Run a test plugin, verify API calls succeed |
| Asset load | 1 min | 5s | Load a test image via CDN, verify content |
