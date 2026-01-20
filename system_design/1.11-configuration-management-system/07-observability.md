# Observability

[← Back to Index](./00-index.md)

---

## Key Metrics

### Cluster Health Metrics

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLUSTER HEALTH METRICS                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Leadership Metrics:                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  etcd_server_is_leader                                       │   │
│  │  • Value: 1 if leader, 0 otherwise                           │   │
│  │  • Alert if: Sum across cluster != 1 for > 30s               │   │
│  │                                                               │   │
│  │  etcd_server_leader_changes_seen_total                       │   │
│  │  • Counter of leader elections                               │   │
│  │  • Alert if: > 3 changes in 1 hour (instability)            │   │
│  │                                                               │   │
│  │  etcd_server_heartbeat_send_failures_total                   │   │
│  │  • Failed heartbeats to followers                            │   │
│  │  • Alert if: Increasing rapidly                              │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Replication Metrics:                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  etcd_server_proposals_committed_total                       │   │
│  │  • Total committed Raft proposals                            │   │
│  │  • Should increase steadily with writes                      │   │
│  │                                                               │   │
│  │  etcd_server_proposals_applied_total                         │   │
│  │  • Proposals applied to state machine                        │   │
│  │  • Gap from committed = apply lag                            │   │
│  │                                                               │   │
│  │  etcd_server_proposals_pending                               │   │
│  │  • Pending proposals in Raft queue                           │   │
│  │  • Alert if: > 10 sustained (write backlog)                 │   │
│  │                                                               │   │
│  │  etcd_server_proposals_failed_total                          │   │
│  │  • Failed proposals (no quorum)                              │   │
│  │  • Alert if: Any increase                                    │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Performance Metrics

```
┌─────────────────────────────────────────────────────────────────────┐
│  PERFORMANCE METRICS                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Request Latency:                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  etcd_disk_wal_fsync_duration_seconds                        │   │
│  │  • Histogram of WAL fsync latency                            │   │
│  │  • Target: p99 < 10ms                                        │   │
│  │  • Alert if: p99 > 25ms (slow disk)                         │   │
│  │                                                               │   │
│  │  etcd_disk_backend_commit_duration_seconds                   │   │
│  │  • Backend (BoltDB) commit latency                           │   │
│  │  • Target: p99 < 50ms                                        │   │
│  │                                                               │   │
│  │  etcd_network_peer_round_trip_time_seconds                   │   │
│  │  • RTT between cluster nodes                                 │   │
│  │  • Target: < 10ms for LAN, < 100ms for WAN                  │   │
│  │                                                               │   │
│  │  grpc_server_handling_seconds                                │   │
│  │  • gRPC request handling time                                │   │
│  │  • Label by method (Range, Put, Watch)                       │   │
│  │  • Target: p99 < 100ms for writes, < 10ms for reads         │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Throughput:                                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  grpc_server_handled_total                                   │   │
│  │  • Total requests by method and status                       │   │
│  │  • Calculate QPS: rate(grpc_server_handled_total[1m])       │   │
│  │                                                               │   │
│  │  etcd_debugging_mvcc_keys_total                              │   │
│  │  • Total keys in the store                                   │   │
│  │  • Monitor growth over time                                   │   │
│  │                                                               │   │
│  │  etcd_mvcc_db_total_size_in_bytes                           │   │
│  │  • Total database size                                       │   │
│  │  • Alert if: > 80% of quota                                  │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Watch Metrics

```
┌─────────────────────────────────────────────────────────────────────┐
│  WATCH METRICS                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Connection Metrics:                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  etcd_debugging_mvcc_watch_stream_total                      │   │
│  │  • Active watch streams                                       │   │
│  │  • Alert if: > 80% of max connections                        │   │
│  │                                                               │   │
│  │  etcd_debugging_mvcc_watcher_total                           │   │
│  │  • Total registered watchers                                 │   │
│  │  • Multiple watchers can share one stream                    │   │
│  │                                                               │   │
│  │  etcd_debugging_mvcc_slow_watcher_total                      │   │
│  │  • Watchers that are behind                                  │   │
│  │  • Alert if: > 0 sustained (clients too slow)               │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Event Metrics:                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  etcd_debugging_mvcc_events_total                            │   │
│  │  • Total events generated                                     │   │
│  │  • Correlates with write activity                            │   │
│  │                                                               │   │
│  │  watch_events_sent_total (custom)                            │   │
│  │  • Events sent to watchers                                   │   │
│  │  • Label by key prefix for debugging                         │   │
│  │                                                               │   │
│  │  watch_event_queue_size                                       │   │
│  │  • Pending events per watcher                                 │   │
│  │  • Alert if: > 1000 (slow consumer)                          │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Client Metrics

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLIENT METRICS                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Session/Lease Metrics:                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  etcd_debugging_lease_granted_total                          │   │
│  │  • Total leases granted                                       │   │
│  │                                                               │   │
│  │  etcd_debugging_lease_revoked_total                          │   │
│  │  • Total leases revoked (expired or explicit)                │   │
│  │                                                               │   │
│  │  etcd_debugging_lease_ttl_total                              │   │
│  │  • Sum of all lease TTLs                                     │   │
│  │  • Average TTL = total / count                               │   │
│  │                                                               │   │
│  │  active_leases (custom gauge)                                │   │
│  │  • Current active leases                                      │   │
│  │  • Sudden drop may indicate client issues                    │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Client Connection Metrics:                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  etcd_network_client_grpc_received_bytes_total               │   │
│  │  • Bytes received from clients                               │   │
│  │                                                               │   │
│  │  etcd_network_client_grpc_sent_bytes_total                   │   │
│  │  • Bytes sent to clients                                     │   │
│  │                                                               │   │
│  │  grpc_server_started_total                                   │   │
│  │  • gRPC requests started (by method)                         │   │
│  │                                                               │   │
│  │  grpc_server_msg_received_total                              │   │
│  │  • gRPC messages received                                    │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Metrics

```
┌─────────────────────────────────────────────────────────────────────┐
│  STORAGE METRICS                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Database Size:                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  etcd_mvcc_db_total_size_in_bytes                           │   │
│  │  • Total size of the database                                │   │
│  │  • Alert if: > 8GB (default quota)                          │   │
│  │                                                               │   │
│  │  etcd_mvcc_db_total_size_in_use_in_bytes                    │   │
│  │  • Size actually in use (excludes free space)               │   │
│  │  • Difference from total = fragmentation                     │   │
│  │                                                               │   │
│  │  etcd_debugging_mvcc_db_compaction_total_duration_ms         │   │
│  │  • Time spent in compaction                                  │   │
│  │  • Alert if: > 5 minutes (slow compaction)                  │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Compaction Metrics:                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  etcd_debugging_mvcc_db_compaction_keys_total                │   │
│  │  • Keys processed during compaction                          │   │
│  │                                                               │   │
│  │  etcd_server_current_revision                                │   │
│  │  • Current revision number                                   │   │
│  │                                                               │   │
│  │  etcd_server_compacted_revision                              │   │
│  │  • Last compacted revision                                   │   │
│  │  • Gap = retained history                                    │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Alerting

### Critical Alerts (Page Immediately)

```
┌─────────────────────────────────────────────────────────────────────┐
│  CRITICAL ALERTS                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Alert: NoLeaderElected                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Condition: sum(etcd_server_is_leader) == 0                  │   │
│  │  Duration:  30 seconds                                        │   │
│  │  Severity:  CRITICAL                                          │   │
│  │  Impact:    All writes fail, cluster unavailable             │   │
│  │  Runbook:   Check node health, network connectivity          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Alert: MultipleLeaders                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Condition: sum(etcd_server_is_leader) > 1                   │   │
│  │  Duration:  10 seconds                                        │   │
│  │  Severity:  CRITICAL                                          │   │
│  │  Impact:    Split-brain, data corruption risk                │   │
│  │  Runbook:   Immediately investigate, may need manual fix     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Alert: QuorumLost                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Condition: count(up{job="etcd"} == 1) < (total_nodes/2 + 1)│   │
│  │  Duration:  1 minute                                          │   │
│  │  Severity:  CRITICAL                                          │   │
│  │  Impact:    Cluster cannot accept writes                     │   │
│  │  Runbook:   Restore failed nodes, check network             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Alert: DatabaseQuotaExceeded                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Condition: etcd_mvcc_db_total_size_in_bytes > quota * 0.95 │   │
│  │  Duration:  5 minutes                                         │   │
│  │  Severity:  CRITICAL                                          │   │
│  │  Impact:    Writes will be rejected                          │   │
│  │  Runbook:   Run compaction, delete old keys, increase quota │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Warning Alerts

```
┌─────────────────────────────────────────────────────────────────────┐
│  WARNING ALERTS                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Alert: HighLeaderChanges                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Condition: increase(etcd_server_leader_changes[1h]) > 3     │   │
│  │  Severity:  WARNING                                           │   │
│  │  Impact:    Cluster instability, write latency               │   │
│  │  Runbook:   Check network, disk latency, resource pressure  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Alert: FollowerLagging                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Condition: etcd_server_proposals_committed_total -          │   │
│  │             etcd_server_proposals_applied_total > 100        │   │
│  │  Duration:  5 minutes                                         │   │
│  │  Severity:  WARNING                                           │   │
│  │  Impact:    Stale reads from this follower                   │   │
│  │  Runbook:   Check disk I/O, consider replacing node         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Alert: HighDiskFsyncLatency                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Condition: histogram_quantile(0.99,                         │   │
│  │             etcd_disk_wal_fsync_duration_seconds) > 0.025    │   │
│  │  Duration:  5 minutes                                         │   │
│  │  Severity:  WARNING                                           │   │
│  │  Impact:    High write latency                               │   │
│  │  Runbook:   Check disk health, consider SSD upgrade         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Alert: SlowWatchers                                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Condition: etcd_debugging_mvcc_slow_watcher_total > 0       │   │
│  │  Duration:  5 minutes                                         │   │
│  │  Severity:  WARNING                                           │   │
│  │  Impact:    Clients missing events, memory pressure         │   │
│  │  Runbook:   Identify slow clients, increase buffer          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Alert: DatabaseSizeGrowing                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Condition: etcd_mvcc_db_total_size_in_bytes > quota * 0.75 │   │
│  │  Duration:  1 hour                                            │   │
│  │  Severity:  WARNING                                           │   │
│  │  Impact:    Approaching quota limit                          │   │
│  │  Runbook:   Schedule compaction, review key growth          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Alert: HighClientConnections                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Condition: etcd_debugging_mvcc_watch_stream_total > 8000   │   │
│  │  Duration:  5 minutes                                         │   │
│  │  Severity:  WARNING                                           │   │
│  │  Impact:    Approaching connection limit                     │   │
│  │  Runbook:   Identify connection sources, add nodes          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Operational Runbooks

### Runbook: Leader Failover

```
┌─────────────────────────────────────────────────────────────────────┐
│  RUNBOOK: Leader Failover                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Trigger: NoLeaderElected or leader node failure                    │
│                                                                      │
│  Automatic Recovery (expected):                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. Remaining nodes detect leader absence (~150ms)           │   │
│  │  2. Election timeout triggers (~300ms)                       │   │
│  │  3. New leader elected (~100ms)                              │   │
│  │  4. Total recovery: ~500ms                                   │   │
│  │  5. Writes resume automatically                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Manual Intervention (if automatic fails):                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Step 1: Check cluster status                                │   │
│  │  $ etcdctl endpoint status --cluster                         │   │
│  │  $ etcdctl member list                                       │   │
│  │                                                               │   │
│  │  Step 2: Verify network connectivity                         │   │
│  │  $ ping <peer-ip>                                            │   │
│  │  $ nc -zv <peer-ip> 2380                                     │   │
│  │                                                               │   │
│  │  Step 3: Check node logs                                     │   │
│  │  $ journalctl -u etcd -f                                     │   │
│  │  Look for: "raft term", "election", "heartbeat"             │   │
│  │                                                               │   │
│  │  Step 4: If node crashed, restart                            │   │
│  │  $ systemctl restart etcd                                    │   │
│  │                                                               │   │
│  │  Step 5: If node unrecoverable, remove and replace           │   │
│  │  $ etcdctl member remove <member-id>                         │   │
│  │  $ etcdctl member add <new-name> --peer-urls=...            │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Runbook: Cluster Expansion

```
┌─────────────────────────────────────────────────────────────────────┐
│  RUNBOOK: Adding a Node                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Pre-requisites:                                                     │
│  • New node has etcd installed                                      │
│  • Certificates prepared for new node                               │
│  • Network connectivity to existing nodes                           │
│                                                                      │
│  Procedure:                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Step 1: Add member to cluster (from existing node)          │   │
│  │  $ etcdctl member add node4 \                                │   │
│  │      --peer-urls=https://10.0.1.4:2380                       │   │
│  │                                                               │   │
│  │  Output: ETCD_NAME="node4"                                   │   │
│  │          ETCD_INITIAL_CLUSTER="node1=...,node4=..."         │   │
│  │          ETCD_INITIAL_CLUSTER_STATE="existing"              │   │
│  │                                                               │   │
│  │  Step 2: Start etcd on new node                              │   │
│  │  $ etcd --name node4 \                                       │   │
│  │      --initial-cluster "node1=...,node2=...,node4=..." \    │   │
│  │      --initial-cluster-state existing \                      │   │
│  │      --listen-peer-urls https://10.0.1.4:2380 \             │   │
│  │      --listen-client-urls https://10.0.1.4:2379             │   │
│  │                                                               │   │
│  │  Step 3: Verify member joined                                │   │
│  │  $ etcdctl member list                                       │   │
│  │  $ etcdctl endpoint status --cluster                         │   │
│  │                                                               │   │
│  │  Step 4: Monitor replication                                 │   │
│  │  • Watch etcd_server_proposals_applied_total                │   │
│  │  • New node should catch up within minutes                   │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Caution:                                                            │
│  • Add one node at a time                                           │
│  • Wait for replication to complete before adding another          │
│  • Keep cluster size odd (3, 5, 7)                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Runbook: Data Compaction

```
┌─────────────────────────────────────────────────────────────────────┐
│  RUNBOOK: Running Compaction                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  When to Compact:                                                    │
│  • Database approaching quota limit                                 │
│  • High disk usage                                                   │
│  • Scheduled maintenance (weekly/daily)                             │
│                                                                      │
│  Procedure:                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Step 1: Get current revision                                │   │
│  │  $ rev=$(etcdctl endpoint status --write-out="json" | \     │   │
│  │      jq -r '.[0].Status.header.revision')                   │   │
│  │  $ echo "Current revision: $rev"                            │   │
│  │                                                               │   │
│  │  Step 2: Compact to specific revision                        │   │
│  │  # Keep last 10000 revisions                                 │   │
│  │  $ compact_rev=$((rev - 10000))                             │   │
│  │  $ etcdctl compact $compact_rev                              │   │
│  │                                                               │   │
│  │  Step 3: Defragment each node                                │   │
│  │  $ etcdctl defrag --endpoints=node1:2379                    │   │
│  │  $ etcdctl defrag --endpoints=node2:2379                    │   │
│  │  $ etcdctl defrag --endpoints=node3:2379                    │   │
│  │                                                               │   │
│  │  Note: Defrag is blocking, do one node at a time            │   │
│  │                                                               │   │
│  │  Step 4: Verify size reduction                               │   │
│  │  $ etcdctl endpoint status --write-out=table                │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Automatic Compaction (recommended):                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  # In etcd config                                            │   │
│  │  --auto-compaction-mode=periodic                             │   │
│  │  --auto-compaction-retention=1h                              │   │
│  │  # Keeps 1 hour of history                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Runbook: Backup and Restore

```
┌─────────────────────────────────────────────────────────────────────┐
│  RUNBOOK: Backup and Restore                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  BACKUP:                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Step 1: Create snapshot                                     │   │
│  │  $ etcdctl snapshot save /backup/etcd-$(date +%Y%m%d).db    │   │
│  │                                                               │   │
│  │  Step 2: Verify snapshot                                     │   │
│  │  $ etcdctl snapshot status /backup/etcd-20250120.db         │   │
│  │  Output: Hash, Revision, Total Keys, Total Size              │   │
│  │                                                               │   │
│  │  Step 3: Upload to remote storage                            │   │
│  │  $ aws s3 cp /backup/etcd-20250120.db \                     │   │
│  │      s3://my-bucket/etcd-backups/                           │   │
│  │                                                               │   │
│  │  Automation: Run via cron every 6 hours                     │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  RESTORE:                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                               │   │
│  │  Step 1: Stop all etcd nodes                                 │   │
│  │  $ systemctl stop etcd  # On all nodes                      │   │
│  │                                                               │   │
│  │  Step 2: Download snapshot                                   │   │
│  │  $ aws s3 cp s3://my-bucket/etcd-backups/etcd-20250120.db \ │   │
│  │      /backup/                                                │   │
│  │                                                               │   │
│  │  Step 3: Restore on each node                                │   │
│  │  $ etcdctl snapshot restore /backup/etcd-20250120.db \      │   │
│  │      --name node1 \                                          │   │
│  │      --initial-cluster node1=...,node2=...,node3=... \      │   │
│  │      --initial-cluster-token etcd-cluster-1 \               │   │
│  │      --data-dir /var/lib/etcd                               │   │
│  │                                                               │   │
│  │  Step 4: Start etcd on all nodes                            │   │
│  │  $ systemctl start etcd                                      │   │
│  │                                                               │   │
│  │  Step 5: Verify cluster health                               │   │
│  │  $ etcdctl endpoint health --cluster                        │   │
│  │  $ etcdctl member list                                       │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Dashboard Recommendations

### Cluster Overview Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLUSTER OVERVIEW DASHBOARD                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Row 1: Cluster Health                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Leader Node  │  │ Healthy Nodes│  │ Leader       │              │
│  │    node1     │  │    3 / 3     │  │ Changes (1h) │              │
│  │              │  │              │  │      0       │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  Row 2: Performance                                                  │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐  │
│  │ Request Latency (p99)       │  │ Throughput (QPS)            │  │
│  │   Writes: 15ms              │  │   Reads: 5,000              │  │
│  │   Reads:  2ms               │  │   Writes: 200               │  │
│  │   [latency chart]           │  │   [throughput chart]        │  │
│  └─────────────────────────────┘  └─────────────────────────────┘  │
│                                                                      │
│  Row 3: Storage                                                      │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐  │
│  │ Database Size               │  │ Keys Count                  │  │
│  │   Used: 2.5 GB / 8 GB      │  │   Total: 50,000             │  │
│  │   [gauge: 31%]              │  │   [time series chart]       │  │
│  └─────────────────────────────┘  └─────────────────────────────┘  │
│                                                                      │
│  Row 4: Connections                                                  │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐  │
│  │ Watch Streams               │  │ Active Leases               │  │
│  │   Active: 2,500             │  │   Count: 500                │  │
│  │   [time series chart]       │  │   [time series chart]       │  │
│  └─────────────────────────────┘  └─────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Metrics to Display

| Panel | Metrics | Visualization |
|-------|---------|---------------|
| Leader Status | etcd_server_is_leader | Stat panel |
| Healthy Nodes | up{job="etcd"} | Stat panel |
| Leader Changes | rate(etcd_server_leader_changes_seen_total[1h]) | Stat panel |
| Write Latency | histogram_quantile(0.99, etcd_disk_wal_fsync_duration_seconds_bucket) | Time series |
| Read QPS | rate(grpc_server_handled_total{grpc_method="Range"}[1m]) | Time series |
| DB Size | etcd_mvcc_db_total_size_in_bytes | Gauge |
| Key Count | etcd_debugging_mvcc_keys_total | Time series |
| Watch Streams | etcd_debugging_mvcc_watch_stream_total | Time series |
| Leases | active_leases (custom) | Time series |
| Proposals | rate(etcd_server_proposals_committed_total[1m]) | Time series |
