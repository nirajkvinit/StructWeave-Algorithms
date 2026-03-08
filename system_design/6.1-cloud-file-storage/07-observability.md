# Observability

## 1. Metrics (USE/RED)

### 1.1 Key Metrics

#### Service-Level Metrics (RED)

| Service | Rate | Errors | Duration (p50/p95/p99) |
|---------|------|--------|------------------------|
| **Sync Service** | Sync operations/sec | Failed syncs/sec | Sync completion time |
| **Metadata Service** | Metadata queries/sec | 5xx responses/sec | Query latency |
| **Block Service** | Block uploads/sec, Block downloads/sec | Upload failures/sec | Upload/download latency |
| **Notification Service** | Notifications delivered/sec | Delivery failures/sec | End-to-end notification latency |
| **Search Service** | Search queries/sec | Timeout/error rate | Search latency |

#### Infrastructure Metrics (USE)

| Resource | Utilization | Saturation | Errors |
|----------|------------|------------|--------|
| **Storage nodes** | Disk usage %, IOPS utilization | Write queue depth | I/O errors, disk failures |
| **Metadata DB** | CPU %, memory %, connection pool | Replication lag, lock wait time | Deadlocks, connection refused |
| **Network** | NIC bandwidth % | TCP retransmit rate | Packet drops, timeout rate |
| **Cache (Chrono)** | Memory usage, hit rate | Eviction rate | Invalidation failures |
| **Message Queue** | Broker disk %, partition count | Consumer lag (messages behind) | Producer rejections |

#### Business Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| **Sync success rate** | % of sync operations completing without error | <99.5% |
| **Dedup ratio** | % of blocks skipped due to deduplication | Track trend; sudden drop indicates issue |
| **Upload throughput** | GB/s uploaded across all users | Track trend; correlate with user growth |
| **Active sync connections** | Number of devices actively syncing | Sudden drop = connectivity issue |
| **Conflict rate** | % of commits resulting in conflicts | >5% indicates UX issue |
| **Storage efficiency** | Logical storage / Physical storage ratio | Track dedup + compression effectiveness |
| **Time to first byte (TTFB)** | Download latency from request to first byte | >500ms p99 triggers investigation |

### 1.2 Dashboard Design

#### Executive Dashboard

```
┌─────────────────────────────────────────────────────────┐
│ Cloud File Storage - Executive Overview                  │
├──────────────┬──────────────┬──────────────┬────────────┤
│ DAU          │ Sync Success │ Availability │ Storage    │
│ 102.3M       │ 99.97%       │ 99.995%      │ 637 PB    │
│ ▲ 2.1% WoW  │ ● Healthy    │ ● Healthy    │ ▲ 1.2%    │
├──────────────┴──────────────┴──────────────┴────────────┤
│ [Sync Latency p99 - 24h]  [Upload Throughput - 24h]     │
│ [Error Rate - 24h]         [Active Connections - 24h]   │
└─────────────────────────────────────────────────────────┘
```

#### Operations Dashboard

```
┌─────────────────────────────────────────────────────────┐
│ Operations - Real-Time                                   │
├─────────────────────────────────────────────────────────┤
│ QPS by Service:                                          │
│   Metadata: ████████████████████ 245K                   │
│   Block Up: ████████ 89K                                │
│   Block Dn: ██████████████ 156K                         │
│   Search:   ███ 23K                                     │
│   Sync:     ██████ 67K                                  │
├─────────────────────────────────────────────────────────┤
│ Latency Heatmap (p50 / p95 / p99):                      │
│   Metadata:  8ms  /  35ms  /  78ms   ● OK              │
│   Upload:    180ms / 650ms  / 1.2s   ● OK              │
│   Download:  45ms  / 180ms  / 420ms  ● OK              │
│   Sync:      120ms / 890ms  / 2.1s   ⚠ Watch           │
├─────────────────────────────────────────────────────────┤
│ Storage Health:                                          │
│   Healthy nodes: 4,891 / 4,900 (99.8%)                  │
│   Fragment repairs (last 24h): 127                       │
│   GC blocks reclaimed (last 24h): 2.3M                  │
│   Dedup ratio (last 24h): 67.3%                         │
├─────────────────────────────────────────────────────────┤
│ DB Health:                                               │
│   Replication lag (max): 0.3s                            │
│   Active connections: 12,450 / 15,000 (83%)             │
│   Cache hit rate: 94.2%                                  │
│   Hot shards (>100K QPS): 3                              │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Alerting Thresholds

| Severity | Metric | Threshold | Action |
|----------|--------|-----------|--------|
| **P1 (Page)** | Sync success rate | <99% for 5 min | Page on-call; potential data loss risk |
| **P1 (Page)** | Block storage: fragments below quorum | Any block with <6 healthy fragments | Immediate fragment repair |
| **P1 (Page)** | Metadata DB replication lag | >10s for 3 min | Failover risk; investigate replication |
| **P2 (Page)** | API error rate (5xx) | >1% for 5 min | Page on-call |
| **P2 (Page)** | Upload p99 latency | >3s for 10 min | Investigate block service or storage |
| **P3 (Ticket)** | Cache hit rate | <85% for 30 min | Cache capacity or invalidation issue |
| **P3 (Ticket)** | GC queue depth | >1M pending for 1 hour | Scale GC workers |
| **P3 (Ticket)** | Storage utilization | >85% per node | Plan capacity addition |
| **P4 (Info)** | Dedup ratio change | >10% change WoW | Investigate data pattern shift |
| **P4 (Info)** | Conflict rate | >5% of commits | Review sync algorithm or UX |

---

## 2. Logging

### 2.1 What to Log

| Category | Events | Log Level |
|----------|--------|-----------|
| **Authentication** | Login, logout, MFA challenge, failed auth, token refresh | INFO / WARN |
| **File operations** | Create, update, delete, move, rename (metadata only, never content) | INFO |
| **Sync events** | Sync start, sync complete, conflict detected, conflict resolved | INFO / WARN |
| **Block operations** | Block upload, block download, dedup hit, dedup miss | DEBUG (sampled 1%) |
| **Sharing** | Grant, revoke, link create, link access | INFO |
| **Errors** | 4xx/5xx responses, timeout, circuit breaker state changes | WARN / ERROR |
| **Security events** | Suspicious login, brute force attempt, permission violation | WARN / ERROR |
| **Admin operations** | Configuration change, deployment, shard migration | INFO |

### 2.2 Log Levels Strategy

| Level | Usage | Volume | Retention |
|-------|-------|--------|-----------|
| **ERROR** | Unrecoverable failures, data integrity issues | Low | 90 days |
| **WARN** | Recoverable failures, degraded performance, security events | Medium | 60 days |
| **INFO** | Normal operations, business events, audit trail | High | 30 days |
| **DEBUG** | Detailed sync state, block operations | Very High (sampled) | 7 days |
| **TRACE** | Per-block hashing, per-chunk operations | Extreme (sampled 0.1%) | 24 hours |

### 2.3 Structured Logging Format

```json
{
  "timestamp": "2026-03-08T10:30:00.123Z",
  "level": "INFO",
  "service": "sync-service",
  "instance_id": "sync-west-042",
  "trace_id": "abc123def456",
  "span_id": "span789",
  "user_id": "u_hashed_12345",
  "device_id": "d_67890",
  "event": "sync.commit.success",
  "file_id": "f_abc123",
  "namespace_id": "ns_456",
  "version": 7,
  "blocks_uploaded": 3,
  "blocks_deduped": 12,
  "duration_ms": 1250,
  "bytes_transferred": 12582912,
  "dedup_ratio": 0.8
}
```

**Privacy considerations:**
- User IDs are hashed/pseudonymized in logs
- File names and paths are **never** logged (potential PII)
- File content is **never** logged
- IP addresses retained for 90 days, then anonymized

---

## 3. Distributed Tracing

### 3.1 Trace Propagation Strategy

**W3C Trace Context** standard (`traceparent` header) propagated across all services:

```
Client → API Gateway → Sync Service → Metadata Service → Database
  │                        │                │
  │         trace_id: abc123               │
  │         span: api_request              │
  │                        │               │
  │                  span: sync_commit     │
  │                        │               │
  │                        │         span: metadata_write
  │                        │               │
  │                  span: notify_devices  │
  │                        │               │
  └── Total duration: 1.2s ───────────────┘
```

### 3.2 Key Spans to Instrument

| Span Name | Service | What It Captures |
|-----------|---------|------------------|
| `file.upload` | API Gateway | End-to-end upload (chunking → dedup → store → commit) |
| `sync.check_blocks` | Sync Service | Dedup check for list of block hashes |
| `block.store` | Block Service | Single block storage (verify → compress → erasure code → write) |
| `metadata.write` | Metadata Service | File version creation (acquire lock → write → invalidate cache) |
| `metadata.read` | Metadata Service | File tree query (cache check → DB fallback) |
| `notification.fanout` | Notification Service | Deliver change notification to all devices |
| `search.index` | Search Service | Index a file's content and metadata |
| `conflict.resolve` | Sync Service | Detect and resolve file conflict |
| `gc.collect` | GC Worker | Block garbage collection cycle |

### 3.3 Trace Sampling Strategy

| Condition | Sample Rate | Reason |
|-----------|-------------|--------|
| Error responses (4xx, 5xx) | 100% | Always trace errors |
| Slow requests (>p95) | 100% | Always trace slow paths |
| Conflict events | 100% | Always trace conflicts |
| Normal file operations | 1% | Volume control |
| Block transfers | 0.1% | Extremely high volume |
| Health checks | 0% | No value in tracing |

---

## 4. Alerting

### 4.1 Critical Alerts (Page-Worthy)

| Alert | Condition | Response |
|-------|-----------|----------|
| **Data durability risk** | Any block with <6 healthy fragments (out of 9) | Immediate: trigger emergency fragment repair; escalate if <4 |
| **Sync pipeline stalled** | Zero successful syncs for 2+ minutes in any region | Investigate sync service health; check metadata DB connectivity |
| **Metadata DB failover** | Primary unavailable, replica promoted | Verify data consistency; check RPO; update monitoring |
| **Storage node cluster loss** | >5 storage nodes unreachable in same zone | Trigger rebalancing; verify erasure coding coverage |
| **Authentication service down** | Login success rate <90% for 3 min | All new connections affected; existing sessions still work |

### 4.2 Warning Alerts

| Alert | Condition | Response |
|-------|-----------|----------|
| **Elevated error rate** | 5xx rate >0.5% for 10 min | Investigate; may auto-resolve |
| **Replication lag** | Metadata DB lag >5s for 5 min | Monitor; prepare for failover if worsening |
| **Cache degradation** | Hit rate <85% for 15 min | Check for cache eviction storm; scale cache |
| **Upload queue building** | >5K pending uploads for 10 min | Scale block service; check storage throughput |
| **Disk space warning** | Storage node >80% capacity | Plan expansion; check GC backlog |
| **Consumer lag** | Message queue consumer >60s behind | Scale consumers; check downstream health |

### 4.3 Runbook References

| Alert | Runbook | Key Steps |
|-------|---------|-----------|
| Fragment repair | `runbook/storage/fragment-repair.md` | 1. Identify affected blocks, 2. Verify quorum, 3. Reconstruct from healthy fragments, 4. Store on new node |
| Metadata DB failover | `runbook/database/metadata-failover.md` | 1. Confirm primary down, 2. Select replica with lowest lag, 3. Promote, 4. Repoint routing, 5. Verify |
| Sync pipeline stall | `runbook/sync/pipeline-stall.md` | 1. Check service health, 2. Check DB connectivity, 3. Check message queue, 4. Check for hot shards |
| Storage capacity | `runbook/storage/capacity-expansion.md` | 1. Order hardware, 2. Rack and provision, 3. Add to consistent hashing ring, 4. Monitor rebalancing |

---

## 5. Operational Dashboards Summary

```
┌────────────────────────────────────────────────────────┐
│                 Dashboard Hierarchy                     │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Level 1: Executive                                     │
│  ├── Availability SLO status                            │
│  ├── User-facing error rate                             │
│  ├── DAU/MAU trends                                     │
│  └── Storage growth                                     │
│                                                         │
│  Level 2: Service                                       │
│  ├── Per-service RED metrics                            │
│  ├── Sync success/failure breakdown                     │
│  ├── Dedup effectiveness                                │
│  └── Cross-service dependency health                    │
│                                                         │
│  Level 3: Infrastructure                                │
│  ├── Storage node health matrix                         │
│  ├── Database shard heat map                            │
│  ├── Network bandwidth by region                        │
│  └── Cache performance                                  │
│                                                         │
│  Level 4: Debug                                         │
│  ├── Individual request traces                          │
│  ├── Slow query analysis                                │
│  ├── Block operation details                            │
│  └── Sync state machine transitions                     │
│                                                         │
└────────────────────────────────────────────────────────┘
```
