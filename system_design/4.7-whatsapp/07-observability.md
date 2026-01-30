# WhatsApp: Observability

## Table of Contents
- [Key Metrics](#key-metrics)
- [Erlang/BEAM Monitoring](#erlangbeam-monitoring)
- [Logging Strategy](#logging-strategy)
- [Distributed Tracing](#distributed-tracing)
- [Alerting](#alerting)
- [Dashboards](#dashboards)

---

## Key Metrics

### Connection Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `connections.active` | Current active connections | - | > 90% capacity |
| `connections.rate` | New connections per second | - | Sudden spike (2x normal) |
| `connections.duration.p50` | Median connection lifetime | > 30 min | < 5 min (churning) |
| `connections.errors` | Connection failures per second | < 0.1% | > 1% |
| `connections.auth_failures` | Authentication failures | < 0.01% | > 0.1% |

### Message Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `messages.sent` | Messages sent per second | - | - |
| `messages.delivered` | Messages delivered per second | - | - |
| `messages.delivery_latency.p50` | Median delivery latency | < 100ms | > 200ms |
| `messages.delivery_latency.p99` | 99th percentile latency | < 500ms | > 1000ms |
| `messages.offline_queued` | Messages queued for offline users | - | > 10M |
| `messages.failed` | Failed deliveries per second | < 0.001% | > 0.01% |

### E2EE Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `encryption.prekeys.inventory` | Available one-time prekeys | > 50 per user | < 10 per user |
| `encryption.session_setup.latency` | X3DH session setup time | < 500ms | > 1000ms |
| `encryption.session_setup.failures` | Failed session setups | < 0.1% | > 1% |
| `encryption.decryption_errors` | Decryption failures | < 0.001% | > 0.01% |
| `encryption.prekey_upload.rate` | Prekey upload requests/sec | - | Sudden drop |

### Media Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `media.upload.latency.p95` | Upload latency (1MB file) | < 5s | > 10s |
| `media.download.latency.p95` | Download latency (1MB file) | < 3s | > 5s |
| `media.upload.failures` | Failed uploads | < 0.1% | > 1% |
| `media.cdn.hit_rate` | CDN cache hit ratio | > 80% | < 60% |
| `media.storage.utilization` | Blob storage usage | - | > 80% capacity |

### Call Metrics

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| `calls.setup.latency.p95` | Call setup time | < 3s | > 5s |
| `calls.setup.success_rate` | Successful call connections | > 98% | < 95% |
| `calls.quality.mos` | Mean Opinion Score (1-5) | > 4.0 | < 3.5 |
| `calls.drop_rate` | Calls dropped unexpectedly | < 1% | > 3% |
| `calls.p2p_rate` | Calls using P2P (vs relay) | > 60% | < 40% |

---

## Erlang/BEAM Monitoring

### BEAM-Specific Metrics

```erlang
%% Key BEAM metrics to monitor

%% Process metrics
erlang:system_info(process_count)          %% Total processes
erlang:system_info(process_limit)          %% Max processes allowed
erlang:memory(processes)                   %% Memory used by processes
erlang:memory(processes_used)              %% Actually used process memory

%% Scheduler metrics
erlang:statistics(scheduler_wall_time)     %% Scheduler utilization
erlang:system_info(schedulers_online)      %% Active schedulers
erlang:statistics(run_queue)               %% Processes waiting to run

%% Memory metrics
erlang:memory(total)                       %% Total memory allocated
erlang:memory(binary)                      %% Binary heap size
erlang:memory(ets)                         %% ETS table memory
erlang:memory(atom)                        %% Atom table size

%% GC metrics
erlang:statistics(garbage_collection)      %% GC count and reclaimed
```

### BEAM Dashboard Metrics

| Metric | Description | Warning | Critical |
|--------|-------------|---------|----------|
| `beam.process_count` | Active Erlang processes | > 80% limit | > 95% limit |
| `beam.scheduler_util` | Scheduler CPU utilization | > 70% | > 90% |
| `beam.run_queue` | Processes waiting to run | > 100 | > 1000 |
| `beam.memory.total` | Total BEAM memory | > 70% RAM | > 85% RAM |
| `beam.memory.binary` | Binary heap size | > 10GB | > 20GB |
| `beam.gc.rate` | Garbage collections/sec | - | Sudden spike |
| `beam.reductions` | Reductions per second | - | Sudden drop |

### Mnesia Monitoring

| Metric | Description | Target | Alert |
|--------|-------------|--------|-------|
| `mnesia.table_size.offline_queue` | Offline message count | - | > 100M |
| `mnesia.transaction.commits` | Commits per second | - | - |
| `mnesia.transaction.aborts` | Aborted transactions/sec | < 1% | > 5% |
| `mnesia.checkpoint.duration` | Checkpoint time | < 1s | > 5s |
| `mnesia.ram_copies.size` | RAM table size | - | > 80% RAM |

### Process Introspection

```erlang
%% Monitor specific process types

%% Connection processes
supervisor:count_children(connection_sup)
%% Returns: #{active => N, specs => M, supervisors => S, workers => W}

%% Message queue length (per-process health)
process_info(Pid, message_queue_len)
%% Alert if > 1000 (backpressure)

%% Process memory
process_info(Pid, memory)
%% Alert if single process > 100MB (likely leak)

%% Example monitoring gen_server
sys:get_status(Pid)
sys:statistics(Pid, true)  %% Enable statistics
sys:statistics(Pid, get)   %% Get accumulated stats
```

---

## Logging Strategy

### What to Log

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LOGGING GUIDELINES                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  LOG THESE (Operational):                                               │
│  • Connection events (connect, disconnect, auth)                        │
│  • Delivery status changes (sent, delivered, read)                      │
│  • Error conditions (delivery failure, timeout)                         │
│  • System events (node join/leave, failover)                            │
│  • Rate limiting activations                                            │
│  • Prekey inventory warnings                                            │
│                                                                         │
│  NEVER LOG (Privacy):                                                   │
│  • Message content (E2EE anyway)                                        │
│  • Phone numbers in plaintext                                           │
│  • IP addresses (or hash them)                                          │
│  • Exact timestamps (fuzzy to minute)                                   │
│  • User agent strings (fingerprinting)                                  │
│                                                                         │
│  HASH THESE:                                                            │
│  • Phone numbers → SHA-256 prefix                                       │
│  • User IDs → Anonymized identifiers                                    │
│  • Conversation IDs → Opaque tokens                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| **ERROR** | Failures requiring attention | Delivery failed after retries |
| **WARN** | Anomalies, potential issues | Prekey inventory low |
| **INFO** | Significant business events | User registered |
| **DEBUG** | Detailed operational info | Message routed to node X |
| **TRACE** | Very detailed (dev only) | Ratchet step performed |

### Structured Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "service": "message_router",
  "node": "mrouter-us-east-1a-001",
  "trace_id": "abc123def456",
  "span_id": "789ghi",

  "event": "message_delivered",
  "message_id_hash": "a1b2c3...",
  "conversation_id_hash": "d4e5f6...",
  "sender_hash": "g7h8i9...",
  "recipient_hash": "j0k1l2...",

  "latency_ms": 45,
  "was_offline": false,
  "region": "us-east"
}
```

### Privacy-Preserving Logging

```
ALGORITHM: Anonymize_Log_Entry

INPUT:
    - event: LogEvent

PROCEDURE:
    // Hash identifiers
    event.user_id = SHA256(event.user_id + daily_salt)[0:16]
    event.message_id = SHA256(event.message_id)[0:16]
    event.conversation_id = SHA256(event.conversation_id)[0:16]

    // Fuzzy timestamps (reduce to minute)
    event.timestamp = Truncate_To_Minute(event.timestamp)

    // Remove or hash IP
    event.ip = null  // Or: Hash_IP(event.ip)

    // Remove sensitive fields
    DELETE event.phone_number
    DELETE event.device_info
    DELETE event.user_agent

    RETURN event
```

---

## Distributed Tracing

### Tracing Challenges with E2EE

```
CHALLENGE: E2EE limits tracing visibility

WHAT WE CAN TRACE:
• Server-side routing path
• Delivery status transitions
• Latency at each hop
• Queue times

WHAT WE CANNOT TRACE:
• Message content processing (on device)
• Encryption/decryption steps (on device)
• Client-side latency (limited visibility)

TRACE PROPAGATION:
• Generate trace_id on sender's gateway
• Propagate through: Gateway → Router → Delivery
• Terminates at recipient's gateway
• Cannot trace into client (privacy)
```

### Trace Structure

```
TRACE: Message Delivery

trace_id: abc-123-def
start_time: 2024-01-15T10:30:00.000Z
end_time: 2024-01-15T10:30:00.145Z
duration_ms: 145

SPANS:
├─ gateway_receive (5ms)
│   └─ service: ejabberd-us-east-1
│   └─ operation: receive_message
│
├─ presence_lookup (2ms)
│   └─ service: presence-us-east-1
│   └─ operation: lookup_user
│   └─ result: online
│
├─ route_message (3ms)
│   └─ service: router-us-east-1
│   └─ operation: route_to_node
│   └─ target_node: ejabberd-us-east-2
│
├─ cross_region_transfer (120ms)
│   └─ service: backbone
│   └─ src_region: us-east
│   └─ dst_region: eu-west
│
└─ gateway_deliver (15ms)
    └─ service: ejabberd-eu-west-1
    └─ operation: deliver_to_connection
    └─ result: delivered
```

### Key Spans to Instrument

| Span | Purpose | Key Attributes |
|------|---------|----------------|
| `gateway.receive` | Message arrival | region, node, message_type |
| `presence.lookup` | Check if online | is_online, target_node |
| `router.route` | Routing decision | destination_region |
| `queue.enqueue` | Offline queueing | queue_depth |
| `queue.dequeue` | Delivery after reconnect | wait_time_ms |
| `gateway.deliver` | Final delivery | delivery_latency_ms |
| `ack.received` | Delivery confirmation | ack_type (delivered/read) |

---

## Alerting

### Alert Severity Levels

| Severity | Response Time | Notification | Example |
|----------|---------------|--------------|---------|
| **P0 - Critical** | Immediate | Page on-call | Service down |
| **P1 - High** | < 15 min | Slack + page | Latency > 2x SLO |
| **P2 - Medium** | < 1 hour | Slack | Capacity > 80% |
| **P3 - Low** | < 24 hours | Email | Deprecation warning |

### Critical Alerts (P0)

| Alert | Condition | Runbook |
|-------|-----------|---------|
| `service_down` | Health check fails 3x | Check node, failover |
| `message_delivery_failed` | > 1% failures for 2 min | Check downstream services |
| `connection_rate_drop` | < 50% of expected | Check DNS, network |
| `region_unreachable` | Cross-region latency > 5s | Check backbone, failover |

### High Severity Alerts (P1)

| Alert | Condition | Runbook |
|-------|-----------|---------|
| `latency_slo_breach` | p99 > 1s for 5 min | Scale up, check hot spots |
| `offline_queue_growing` | > 50M and increasing | Check offline causes |
| `prekey_exhaustion` | Users with < 5 prekeys | Trigger replenishment |
| `connection_churn_high` | Avg duration < 5 min | Check client issues |
| `error_rate_elevated` | > 0.5% for 5 min | Investigate error types |

### Medium Severity Alerts (P2)

| Alert | Condition | Runbook |
|-------|-----------|---------|
| `capacity_warning` | > 80% utilization | Plan scale-up |
| `cert_expiring` | < 30 days to expiry | Rotate certificates |
| `beam_memory_high` | > 70% RAM | Check for leaks |
| `scheduler_util_high` | > 80% sustained | Add capacity |

### Alert Aggregation

```
ALERT AGGREGATION RULES:

1. Deduplication
   - Same alert from same source within 5 min → single alert
   - Count occurrences

2. Correlation
   - Multiple nodes with same issue → cluster alert
   - Related alerts (latency + errors) → incident

3. Suppression
   - During maintenance window → suppress non-critical
   - Known issue acknowledged → suppress duplicates

4. Escalation
   - P1 not acked in 15 min → escalate to secondary
   - P0 not resolved in 30 min → escalate to management
```

---

## Dashboards

### Executive Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  WHATSAPP GLOBAL STATUS                                    🟢 HEALTHY  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CONNECTIONS         MESSAGES           LATENCY           UPTIME       │
│  ┌──────────────┐    ┌──────────────┐   ┌──────────────┐  ┌──────────┐ │
│  │    423M      │    │    1.6M/s    │   │   87ms p50   │  │  99.99%  │ │
│  │  concurrent  │    │   messages   │   │  203ms p99   │  │  30 days │ │
│  └──────────────┘    └──────────────┘   └──────────────┘  └──────────┘ │
│                                                                         │
│  REGIONAL HEALTH                                                        │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  🟢 US-EAST    🟢 US-WEST    🟢 EU-WEST    🟢 APAC    🟢 LATAM    ││
│  │     98M          67M          102M          145M        89M        ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  MESSAGE DELIVERY (last hour)                                           │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  [════════════════════════════════════════════] 99.998% delivered ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Operations Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MESSAGE FLOW                                              REAL-TIME   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Inbound Rate          Outbound Rate         Offline Queue             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │    ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄                   │   │
│  │    █████████████████████████████████████████                   │   │
│  │    1.6M/s                1.6M/s                 2.3M msgs      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  LATENCY DISTRIBUTION (p50/p95/p99)                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │   p50: ███████░░░░░░░░░░░░░░░░░░ 87ms                          │   │
│  │   p95: █████████████░░░░░░░░░░░░ 156ms                         │   │
│  │   p99: ███████████████████░░░░░░ 203ms                         │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  RECENT ALERTS                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  10:15  ⚠️  P2  capacity_warning  us-east-1   80% utilization   │   │
│  │  09:45  ✅  P1  latency_spike     eu-west-1   RESOLVED          │   │
│  │  09:30  ✅  P2  prekey_low        apac-1      RESOLVED          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### BEAM Health Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BEAM VM HEALTH                                        NODE: ejb-001   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PROCESSES                    SCHEDULERS                 MEMORY        │
│  ┌────────────────┐           ┌────────────────┐         ┌───────────┐ │
│  │   1,847,293    │           │  64/64 online  │         │   124GB   │ │
│  │   of 2M limit  │           │    68% util    │         │  of 256GB │ │
│  │   [████████░░] │           │   [██████░░░░] │         │ [████░░░] │ │
│  └────────────────┘           └────────────────┘         └───────────┘ │
│                                                                         │
│  MEMORY BREAKDOWN                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Processes:  ████████████████████████████████████████  89GB     │   │
│  │  ETS:        ███████████████                          21GB     │   │
│  │  Binary:     ████████                                  8GB     │   │
│  │  Atom:       ██                                        2GB     │   │
│  │  Other:      ████                                      4GB     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  RUN QUEUE                      GC RATE                                 │
│  ┌────────────────┐             ┌─────────────────────────────────┐    │
│  │   Waiting: 23  │             │ ▁▂▃▂▁▂▃▄▃▂▁▂▃▂▁  45K/s        │    │
│  │   [HEALTHY]    │             │                                 │    │
│  └────────────────┘             └─────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### E2EE Health Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ENCRYPTION HEALTH                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PREKEY INVENTORY                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Users with 50+ prekeys:   ████████████████████████████  94.2%  │   │
│  │  Users with 20-50 prekeys: ███                            4.1%  │   │
│  │  Users with 10-20 prekeys: █                              1.2%  │   │
│  │  Users with <10 prekeys:   ░                              0.5%  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  SESSION SETUP SUCCESS                     DECRYPTION ERRORS           │
│  ┌──────────────────────────┐              ┌──────────────────────┐    │
│  │        99.87%            │              │       0.003%         │    │
│  │   [██████████████████░]  │              │   [HEALTHY]          │    │
│  └──────────────────────────┘              └──────────────────────┘    │
│                                                                         │
│  PREKEY UPLOADS (per hour)                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅                                      │   │
│  │           12:00              18:00              00:00           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ⚠️ WATCH: 847 users approaching prekey exhaustion                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```
