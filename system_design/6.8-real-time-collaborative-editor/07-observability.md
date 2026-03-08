# Observability

## Metrics (USE/RED)

### Key Metrics

| Category | Metric | Type | Description |
|----------|--------|------|-------------|
| **Utilization** | `sync_server.active_documents` | Gauge | Documents loaded in memory per server |
| **Utilization** | `ws_gateway.connections` | Gauge | Active WebSocket connections |
| **Utilization** | `sync_server.crdt_memory_mb` | Gauge | Memory used by CRDT state |
| **Saturation** | `merge_queue.depth` | Gauge | Pending offline merges |
| **Saturation** | `ws_gateway.connections_rejected` | Counter | Connections rejected (capacity) |
| **Errors** | `sync_server.merge_errors` | Counter | CRDT merge failures |
| **Errors** | `oplog.write_failures` | Counter | Operation log write failures |
| **Rate** | `sync_server.operations_per_sec` | Rate | Operations processed per second |
| **Rate** | `ws_gateway.messages_per_sec` | Rate | WebSocket messages per second |
| **Duration** | `sync_server.merge_latency_ms` | Histogram | Time to merge a remote update |
| **Duration** | `sync_server.broadcast_latency_ms` | Histogram | Time from receive to all-client broadcast |
| **Duration** | `document.load_latency_ms` | Histogram | Document initial load time |
| **Duration** | `offline_merge.duration_ms` | Histogram | Offline merge reconciliation time |

### Collaboration-Specific Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `crdt.convergence_check_failures` | Periodic convergence verification failures | Any > 0 (critical) |
| `crdt.tombstone_ratio` | Ratio of tombstoned to live items | > 50% (warning) |
| `document.concurrent_editors` | Editors per document | > 200 (scale alert) |
| `presence.stale_cursors` | Cursors not updated in > 30s | > 10% of total (warning) |
| `offline.pending_merges` | Clients with unsynced offline changes | > 1000 (capacity alert) |
| `sync.state_vector_size` | Size of state vectors being exchanged | > 1MB (bloat alert) |
| `block_tree.depth` | Maximum nesting depth per document | > 15 (potential perf issue) |
| `block_tree.orphaned_blocks` | Blocks with no valid parent | Any > 0 (bug indicator) |

### Dashboard Design

#### Primary Dashboard: Real-Time Collaboration Health

```
┌─────────────────────────────────────────────────────────┐
│ REAL-TIME COLLABORATION DASHBOARD                        │
├─────────────────┬──────────────────┬────────────────────┤
│ Active Docs     │ Concurrent Users │ Operations/sec     │
│ 342,891         │ 1,247,003        │ 3,891,204          │
│ ▲ 12% vs 1h ago│ ▲ 8%             │ ▼ 3%               │
├─────────────────┴──────────────────┴────────────────────┤
│ EDIT PROPAGATION LATENCY (p50/p95/p99)                  │
│ ████████████ 23ms / 89ms / 187ms                        │
├─────────────────────────────────────────────────────────┤
│ MERGE ERRORS (last 1h)           │ CONVERGENCE CHECKS  │
│ ░░░░░░░░░░░░░░░░░░ 0            │ ████████ All Pass    │
├──────────────────────────────────┴──────────────────────┤
│ OFFLINE CLIENTS PENDING SYNC                             │
│ ████████░░░░░░░░░░ 2,341 clients (0.19% of total)      │
├─────────────────────────────────────────────────────────┤
│ TOP 10 DOCUMENTS BY CONCURRENT EDITORS                   │
│ Doc-abc123: 147 editors │ Doc-def456: 89 editors │ ...  │
└─────────────────────────────────────────────────────────┘
```

#### Secondary Dashboard: CRDT Health

```
┌─────────────────────────────────────────────────────────┐
│ CRDT ENGINE HEALTH                                       │
├─────────────────┬──────────────────┬────────────────────┤
│ Avg CRDT Memory │ Tombstone Ratio  │ GC Runs (1h)       │
│ 2.3 MB/doc      │ 18%              │ 1,247              │
├─────────────────┴──────────────────┴────────────────────┤
│ OPERATION TYPES DISTRIBUTION                             │
│ text_insert: 45% | text_delete: 22% | block_ops: 18%   │
│ format: 10% | move: 3% | property: 2%                  │
├─────────────────────────────────────────────────────────┤
│ SNAPSHOT CREATION                    │ OP LOG WRITES     │
│ Rate: 1,200/min  Failures: 0        │ 8.1M/sec  OK      │
├──────────────────────────────────────┴──────────────────┤
│ STATE VECTOR SIZE DISTRIBUTION                           │
│ p50: 128B | p95: 2KB | p99: 12KB | max: 89KB           │
└─────────────────────────────────────────────────────────┘
```

### Alerting Thresholds

| Severity | Metric | Threshold | Action |
|----------|--------|-----------|--------|
| **P0 Critical** | `crdt.convergence_check_failures` | > 0 | Page on-call; potential data corruption |
| **P0 Critical** | `oplog.write_failures` sustained | > 0 for 30s | Page on-call; durability at risk |
| **P1 High** | `sync_server.broadcast_latency_ms` p99 | > 500ms | Investigate sync server load |
| **P1 High** | `merge_queue.depth` | > 200 | Scale merge workers |
| **P2 Medium** | `document.load_latency_ms` p99 | > 2s | Check snapshot availability, cache hit rates |
| **P2 Medium** | `ws_gateway.connections_rejected` | > 100/min | Scale WebSocket gateways |
| **P3 Low** | `crdt.tombstone_ratio` | > 40% | Schedule garbage collection |
| **P3 Low** | `presence.stale_cursors` | > 20% | Check presence heartbeat config |

---

## Logging

### What to Log

| Event | Level | Fields | Purpose |
|-------|-------|--------|---------|
| Document opened | INFO | doc_id, user_id, load_time_ms, source (cache/snapshot/replay) | Performance tracking |
| WebSocket connected | INFO | user_id, doc_id, client_id, region | Connection monitoring |
| WebSocket disconnected | INFO | user_id, doc_id, reason, duration | Session analysis |
| Operation merged | DEBUG | doc_id, op_type, op_size_bytes, merge_time_us | Debugging (sampled 1%) |
| Offline merge started | INFO | user_id, doc_id, ops_count, offline_duration | Offline pattern analysis |
| Offline merge completed | INFO | user_id, doc_id, merge_time_ms, conflicts_count | Merge performance |
| Permission denied | WARN | user_id, doc_id, attempted_action | Security monitoring |
| CRDT merge error | ERROR | doc_id, error_type, op_data (redacted), stack_trace | Bug investigation |
| Convergence check failed | CRITICAL | doc_id, client_states_hash, server_state_hash | Data integrity |
| Snapshot created | INFO | doc_id, snapshot_size, ops_since_last | Storage management |

### Structured Log Format

```
{
  "timestamp": "2026-03-08T14:23:45.123Z",
  "level": "INFO",
  "service": "sync-server",
  "instance": "sync-us-east-1-a-003",
  "trace_id": "abc123def456",
  "span_id": "789ghi",
  "event": "offline_merge_completed",
  "doc_id": "doc-uuid-abc",
  "user_id": "user-uuid-xyz",
  "client_id": "device-123",
  "ops_count": 247,
  "offline_duration_hours": 2.5,
  "merge_time_ms": 340,
  "conflicts_resolved": 3,
  "final_doc_size_blocks": 156
}
```

### Log Levels Strategy

| Level | When | Sampling |
|-------|------|----------|
| CRITICAL | Data integrity issues, convergence failures | 100% (always) |
| ERROR | Merge failures, write failures, crash recovery | 100% |
| WARN | Permission denials, rate limiting, large documents | 100% |
| INFO | Session lifecycle, offline merges, snapshots | 100% |
| DEBUG | Individual operations, CRDT state details | 1% sampling (configurable) |

---

## Distributed Tracing

### Trace Propagation

```
Client Edit → WebSocket Gateway → Sync Server → Operation Log
     ↓              ↓                 ↓              ↓
  [span:          [span:           [span:         [span:
   client_edit]    ws_receive]      crdt_merge]    oplog_write]
                                     ↓
                                  [span:
                                   broadcast]
                                     ↓
                               [span: peer_receive] (per client)
```

Trace context is embedded in every WebSocket message as a header, propagated through the sync server to the operation log and broadcast path.

### Key Spans to Instrument

| Span | Parent | What It Captures |
|------|--------|-----------------|
| `client.edit` | Root | User action to local CRDT apply (client-side) |
| `ws.send` | `client.edit` | Network send time |
| `gateway.receive` | `ws.send` | Gateway processing (auth check, routing) |
| `sync.merge` | `gateway.receive` | CRDT merge processing time |
| `sync.validate` | `sync.merge` | Permission and schema validation |
| `oplog.write` | `sync.merge` | Operation log persistence |
| `sync.broadcast` | `sync.merge` | Fan-out to all connected clients |
| `peer.receive` | `sync.broadcast` | Per-client delivery and render |
| `offline.merge` | Root | Full offline reconciliation flow |
| `snapshot.create` | Root | Periodic snapshot creation |

### Critical Trace: End-to-End Edit Propagation

```
Total latency budget: 300ms (p99 target)

Client edit:        5ms  ████
Network send:      30ms  ██████████████
Gateway receive:    2ms  █
CRDT merge:        10ms  ████████
Validation:         3ms  ██
OpLog write:       15ms  ██████████
Broadcast (fan):   20ms  █████████████
Network deliver:   30ms  ██████████████
Peer CRDT merge:   10ms  ████████
Peer render:        5ms  ████
─────────────────────────
Total:            130ms  (typical)
```

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Runbook |
|-------|-----------|---------|
| **CRDT Convergence Failure** | Any convergence check fails | Isolate affected document; compare client/server states; trigger forced snapshot reconciliation |
| **Operation Log Write Failure** | Write failures > 0 for 30s | Check storage health; verify replication; failover to standby partition |
| **Sync Server OOM** | Memory > 90% on any sync server | Identify oversized documents; trigger CRDT garbage collection; evict inactive docs |
| **WebSocket Mass Disconnect** | > 10% connections drop in 1 min | Check gateway health; verify network; potential deployment issue |

### Warning Alerts

| Alert | Condition | Response |
|-------|-----------|----------|
| Edit propagation latency high | p99 > 500ms for 5 min | Check sync server load distribution; identify hot documents |
| Merge queue backing up | Depth > 100 for 5 min | Scale merge workers; check for stuck merges |
| Tombstone ratio high | > 40% on any document | Schedule targeted garbage collection |
| Cache hit rate dropping | < 80% for 10 min | Check cache health; warm cache from snapshots |
| Large offline merge | > 10K ops in single merge | Monitor completion; prepare for potential slow merge |

### Runbook References

| Scenario | Runbook |
|----------|---------|
| Document corruption detected | `runbook/crdt-corruption-recovery.md` |
| Sync server failover | `runbook/sync-server-failover.md` |
| Mass offline reconnection storm | `runbook/reconnection-storm.md` |
| WebSocket gateway scaling | `runbook/ws-gateway-scaling.md` |
| Operation log partition full | `runbook/oplog-partition-management.md` |
| CRDT memory pressure | `runbook/crdt-memory-management.md` |
