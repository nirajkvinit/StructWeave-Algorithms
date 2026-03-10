# Observability — NewSQL Database

## Metrics (USE/RED)

### Key Metrics to Track

#### SQL Layer Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `sql.query.latency_ms` | Histogram | Query execution time by type (SELECT, INSERT, UPDATE, DELETE) | p99 > 50ms (point), > 500ms (complex) |
| `sql.query.throughput` | Rate | Queries per second by type | — |
| `sql.query.errors` | Counter | Failed queries by error class (serialization, timeout, syntax) | > 0.1% error rate |
| `sql.connections.active` | Gauge | Active client connections | > 80% of max_connections |
| `sql.connections.waiting` | Gauge | Connections waiting for execution slot | > 50 |
| `sql.plan_cache.hit_ratio` | Gauge | SQL plan cache reuse rate | < 80% |
| `sql.txn.commit_latency_ms` | Histogram | End-to-end transaction commit time | p99 > 100ms |
| `sql.txn.abort_rate` | Rate | Transaction abort rate (serialization failures, deadlocks) | > 5% |
| `sql.txn.restart_count` | Counter | Transaction restarts due to read uncertainty or conflicts | > 100/min |

#### Distributed KV Layer Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `kv.range.count` | Gauge | Total ranges in cluster | — |
| `kv.range.splits_per_min` | Rate | Range split frequency | > 100/min (excessive) |
| `kv.range.merges_per_min` | Rate | Range merge frequency | — |
| `kv.intent.count` | Gauge | Outstanding write intents (unresolved) | > 100K |
| `kv.intent.resolve_latency_ms` | Histogram | Time to resolve write intents | p99 > 500ms |
| `kv.leaseholder.transfers_per_min` | Rate | Lease transfers between nodes | > 50/min |
| `kv.request.latency_ms` | Histogram | KV request latency (Get, Put, Scan) | p99 > 20ms |
| `kv.batch.request_size` | Histogram | Bytes per KV batch request | — |

#### Raft Consensus Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `raft.leader.count_per_node` | Gauge | Raft leaders on each node | Imbalance > 20% |
| `raft.proposal.latency_ms` | Histogram | Time from proposal to commit | p99 > 50ms |
| `raft.proposal.dropped` | Counter | Proposals dropped (no leader, queue full) | > 10/min |
| `raft.log.behind` | Gauge | Entries follower is behind leader | > 1000 entries |
| `raft.heartbeat.failures` | Counter | Missed heartbeats | > 5/min per group |
| `raft.elections` | Counter | Leader elections triggered | > 5/hour |
| `raft.snapshot.sent` | Counter | Raft snapshots sent to catch up followers | > 10/hour |
| `raft.apply.latency_ms` | Histogram | Time to apply committed entries to state machine | p99 > 20ms |

#### Storage Engine Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `storage.block_cache.hit_ratio` | Gauge | LSM block cache hit rate | < 85% |
| `storage.compaction.pending_bytes` | Gauge | Bytes pending compaction | > 10 GB |
| `storage.compaction.write_amp` | Gauge | Write amplification factor (bytes written / bytes ingested) | > 30x |
| `storage.lsm.read_amp` | Gauge | Read amplification (files checked per read) | > 20 |
| `storage.wal.fsync_latency_ms` | Histogram | WAL fsync duration | p99 > 20ms |
| `storage.disk.utilization` | Gauge | Disk space usage percentage | > 70% |
| `storage.disk.iops` | Gauge | Disk I/O operations per second | > 80% of max |

#### Clock and Timestamp Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `clock.offset_ms` | Gauge | Estimated clock offset from cluster peers | > 150ms |
| `clock.uncertainty_interval_ms` | Gauge | Current read uncertainty window size | > 500ms |
| `txn.read_restarts` | Counter | Transactions restarted due to clock uncertainty | > 50/min |
| `clock.ntp_status` | Gauge | NTP synchronization status (0=synced, 1=degraded, 2=lost) | > 0 |

### Dashboard Design

**Dashboard 1: Cluster Overview**
- Total nodes, ranges, and replicas (gauges)
- Query throughput by type (time series)
- Active transactions (gauge)
- Cluster-wide latency percentiles (time series)
- Node health matrix (heatmap)

**Dashboard 2: Query Performance**
- Query latency distribution (histogram by type)
- Top 10 slowest query fingerprints (table)
- Plan cache hit ratio (gauge)
- Transaction abort/restart rate (time series)
- Serialization conflicts (counter)

**Dashboard 3: Raft Health**
- Leader distribution across nodes (bar chart)
- Proposal latency (time series by percentile)
- Elections per hour (counter)
- Replication lag per range (heatmap)
- Raft snapshot frequency (counter)

**Dashboard 4: Storage & Capacity**
- Disk usage per node (stacked bar)
- Block cache hit ratio (gauge per node)
- Compaction throughput and pending bytes (time series)
- Write amplification trend (time series)
- LSM level sizes (stacked area)

**Dashboard 5: Clock & Transaction Integrity**
- Clock offset per node (time series)
- Read uncertainty interval (gauge)
- Transaction restart rate (time series)
- Intent count and resolution rate (time series)

---

## Logging

### What to Log

| Event | Log Level | Content |
|-------|-----------|---------|
| Query execution | INFO | Query fingerprint (parameters redacted), latency, rows affected, plan used |
| Slow query | WARN | Full query plan, actual vs. estimated rows, ranges touched, wait events |
| Transaction commit/abort | INFO | Transaction ID, duration, ranges touched, abort reason (if aborted) |
| Serialization conflict | WARN | Conflicting transaction IDs, contended key, resolution (push/abort) |
| Read uncertainty restart | INFO | Transaction ID, original timestamp, new timestamp, conflicting value timestamp |
| Range split/merge | INFO | Range ID, split key, new range IDs, trigger reason |
| Raft leader election | INFO | Range ID, old leader, new leader, election duration, reason |
| Schema change | INFO | DDL statement, user, job ID, progress |
| Authentication failure | WARN | Client IP, username, failure reason |
| Node join/leave | INFO | Node ID, address, join/decommission status |

### Log Levels Strategy

| Level | Production Volume | Use Case |
|-------|------------------|----------|
| ERROR | < 100/min | Data corruption, Raft quorum loss, unrecoverable failures |
| WARN | < 1,000/min | Slow queries, serialization conflicts, clock skew, auth failures |
| INFO | < 10,000/min | Query summaries, transaction outcomes, range operations |
| DEBUG | Disabled in prod | Raft message details, KV request tracing, optimizer decisions |
| TRACE | Never in prod | Per-key MVCC lookups, block cache operations, intent resolution steps |

### Structured Logging Format

```
{
  "timestamp": "2026-03-10T14:32:01.234Z",
  "level": "WARN",
  "component": "sql_executor",
  "event": "slow_query",
  "query_id": "q-abc-123",
  "node_id": "n3",
  "query_fingerprint": "SELECT * FROM orders WHERE user_id = $1 AND status = $2",
  "execution_time_ms": 850,
  "rows_returned": 1247,
  "ranges_touched": 8,
  "cross_range_requests": 3,
  "plan": "DistScan(orders@idx_user_status) → Filter → Limit",
  "estimated_rows": 100,
  "actual_rows": 1247,
  "intent_encounters": 2,
  "user": "app-service-prod",
  "client_ip": "10.0.1.42"
}
```

---

## Distributed Tracing

### Trace Propagation Strategy

A single SQL query in a NewSQL database may touch multiple nodes, ranges, and Raft groups. The trace forms a tree rooted at the SQL gateway, with branches to each range involved in the query.

```
Client Request (SELECT ... JOIN ... WHERE ...)
  └── SQL Gateway (parse, optimize, distribute)
        ├── KV Request to Range R1 (Node 1)
        │     └── LSM-Tree read (block cache hit/miss)
        ├── KV Request to Range R2 (Node 2)
        │     ├── LSM-Tree read
        │     └── Intent resolution (check txn record on Node 3)
        ├── KV Request to Range R3 (Node 3)
        │     └── LSM-Tree read
        └── Merge Results → Return to Client
```

### Key Spans to Instrument

| Span | Parent | Key Attributes |
|------|--------|---------------|
| `sql.parse` | Root | query_fingerprint, parameter_count |
| `sql.optimize` | Root | plan_type, estimated_cost, plan_cache_hit |
| `sql.execute` | Root | total_rows, execution_time, ranges_touched |
| `kv.batch_request` | execute | target_node, range_id, request_type |
| `kv.get` / `kv.scan` | batch_request | key, bytes_read, cache_hit |
| `raft.propose` | kv.put | range_id, proposal_size, consensus_latency |
| `raft.apply` | propose | apply_latency, state_machine_bytes |
| `txn.resolve_intent` | kv.get | blocking_txn_id, resolution, wait_time |
| `storage.lsm_read` | kv.get | levels_checked, bloom_filter_hit, block_cache_hit |

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Severity | Runbook |
|-------|-----------|----------|---------|
| **Raft quorum loss** | Range has < majority healthy replicas for > 60s | P1 | Check node health; restore or replace failed replicas |
| **Node unreachable** | Node heartbeat missed for > 30s | P1 | Check node process, network; initiate decommission if unrecoverable |
| **Clock skew critical** | Node clock offset > 500ms | P1 | Check NTP; quarantine node if offset grows |
| **Data corruption** | Consistency check failure | P1 | Stop writes to affected range; restore from backup |
| **Disk full** | > 95% disk utilization | P1 | Emergency: expand storage or drop non-critical data |

### Warning Alerts

| Alert | Condition | Severity | Runbook |
|-------|-----------|----------|---------|
| **High transaction abort rate** | > 10% abort rate for > 5 min | P2 | Review contention patterns; optimize hot keys |
| **Slow query spike** | p99 latency > 500ms for > 5 min | P2 | Review slow query log; check plan cache, stats freshness |
| **Replication lag** | Raft follower > 30s behind leader | P2 | Check follower node I/O; consider snapshot |
| **Compaction backlog** | Pending compaction > 50 GB | P2 | Check I/O bandwidth; adjust compaction priority |
| **Block cache degradation** | Hit ratio < 80% for > 10 min | P3 | Review working set size; consider adding memory |
| **Range imbalance** | Range count variance > 30% across nodes | P3 | Trigger rebalancing; check for split/merge issues |
| **Excessive elections** | > 20 elections/hour | P3 | Check network stability; review heartbeat timeouts |

### Runbook References

| Runbook | Scenario | Key Steps |
|---------|----------|-----------|
| RB-001 | Raft leader failover | Verify quorum → Check follower logs → Confirm election → Validate client recovery |
| RB-002 | Clock skew remediation | Verify NTP sources → Check offset trend → Quarantine if growing → Restart NTP |
| RB-003 | Hot range mitigation | Identify hot range → Check key distribution → Apply hash-sharded index or manual split |
| RB-004 | Compaction stall | Check Level 0 file count → Adjust compaction priority → Throttle writes if necessary |
| RB-005 | Serialization conflict storm | Identify contended keys → Review transaction patterns → Batch writes or redesign schema |
