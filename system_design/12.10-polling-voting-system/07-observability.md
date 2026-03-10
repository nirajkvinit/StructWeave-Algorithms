# Observability — Polling/Voting System

## 1. Metrics Strategy

### USE Metrics (Utilization, Saturation, Errors)

| Component | Utilization | Saturation | Errors |
|---|---|---|---|
| **Ingestion API** | CPU %, memory %, connection count | Request queue depth, goroutine/thread count | 4xx rate, 5xx rate, timeout rate |
| **Dedup Store** | Memory %, ops/sec vs capacity | Eviction rate, connection pool usage | Lookup failures, SADD failures, timeout rate |
| **Vote Queue** | Partition utilization, disk usage | Consumer lag (messages), backlog age | Produce failures, consume failures, DLQ rate |
| **Counter Service** | CPU %, queue consumer throughput | Unconsumed message count, processing latency | INCR failures, batch processing errors |
| **Sharded Counters (KV)** | Memory %, ops/sec vs capacity | Key count per node, hot key detection | Write failures, replication lag |
| **Aggregation Workers** | CPU %, aggregation cycle time | Polls per worker, overdue aggregations | Aggregation failures, result write failures |
| **Result Cache** | Memory %, hit rate | Eviction rate, miss rate | Read failures, write failures |
| **WebSocket Gateway** | Connection count, memory % | Message queue per connection | Connection drops, push failures |

### RED Metrics (Rate, Errors, Duration)

| Service | Rate | Errors | Duration |
|---|---|---|---|
| **Vote Ingestion** | Votes accepted/sec, votes rejected/sec | Dedup failures, queue publish failures, 5xx | P50/P95/P99 vote acceptance latency |
| **Result Retrieval** | Reads/sec, cache hits/sec, cache misses/sec | Read timeouts, stale data served | P50/P95/P99 result retrieval latency |
| **Aggregation** | Aggregations/sec, polls aggregated/cycle | Failed aggregations, missed cycles | P50/P95/P99 aggregation cycle time |
| **WebSocket Push** | Messages pushed/sec, connections established/sec | Failed pushes, dropped connections | P50/P95/P99 push delivery latency |
| **Poll CRUD** | Creates/sec, closes/sec | Create failures, close failures | P50/P95/P99 operation latency |

### Business Metrics

| Metric | Description | Alert Threshold |
|---|---|---|
| **Total votes/sec (platform)** | Global vote throughput | > 500K/sec (capacity warning) |
| **Total votes/sec (per poll)** | Individual poll velocity | > 100K/sec (hot poll activation) |
| **Active polls count** | Currently open polls | > 200K (capacity planning) |
| **Dedup rejection rate** | % of incoming votes rejected as duplicates | > 30% sustained (possible bot attack) |
| **Result freshness** | Time since last aggregation update | > 5s for any active poll (aggregation stalled) |
| **Vote-to-result latency** | End-to-end: vote cast → result cache updated | > 2s P95 (pipeline degraded) |
| **WebSocket subscriber count** | Total active result watchers | > 5M (capacity planning) |
| **Poll close reconciliation errors** | Mismatches during close reconciliation | > 0 (integrity issue) |

---

## 2. Dashboards

### Dashboard 1: Vote Throughput Overview

| Panel | Visualization | Data Source |
|---|---|---|
| Global votes/sec (real-time) | Time series line chart (1s resolution) | Ingestion API metrics |
| Votes by region | Stacked area chart | Per-region ingestion metrics |
| Top 10 polls by velocity | Sorted bar chart (live updating) | Per-poll vote rate metrics |
| Vote acceptance vs rejection rate | Stacked area (accepted/rejected/challenged) | Ingestion API + dedup service |
| Queue depth by partition | Heat map | Vote queue broker metrics |
| Consumer lag (seconds) | Time series with threshold line | Consumer group metrics |

### Dashboard 2: Hot Poll Monitor

| Panel | Visualization | Data Source |
|---|---|---|
| Hot poll list | Table: poll_id, velocity, shard_count, status | Hot poll detection service |
| Per-poll vote velocity | Sparkline per poll | Per-poll metrics |
| Shard utilization per hot poll | Bar chart: writes/sec per shard | Counter service metrics |
| Dedup store memory per hot poll | Bar chart: bytes per poll's dedup set | Dedup store metrics |
| WebSocket subscribers per hot poll | Bar chart | WebSocket gateway metrics |
| Aggregation freshness per hot poll | Gauge (green < 500ms, yellow < 2s, red > 2s) | Aggregation worker metrics |

### Dashboard 3: Vote Integrity

| Panel | Visualization | Data Source |
|---|---|---|
| Dedup set count vs shard total vs audit count | Three overlaid lines (should converge) | Cross-source comparison job |
| Reconciliation delta | Bar chart (should be 0 for closed polls) | Close reconciliation reports |
| Bot detection decisions | Pie chart: accept/challenge/reject | Bot detection service |
| Suspicious IP clusters | Geo map with heat spots | IP analysis service |
| Account age distribution of voters | Histogram | Vote audit log join with user table |
| CAPTCHA challenge rate | Time series | CAPTCHA service |

### Dashboard 4: Infrastructure Health

| Panel | Visualization | Data Source |
|---|---|---|
| Node count by tier | Stacked bar (current vs target) | Auto-scaler metrics |
| CPU/Memory by tier | Multi-line (one per tier) | Node metrics |
| Cache hit rate | Gauge (target > 99%) | Result cache metrics |
| Dedup store ops/sec | Time series with capacity line | Dedup store metrics |
| WebSocket connections | Time series with capacity line | Gateway metrics |
| Error budget burn rate | Gauge per SLO | SLO monitoring |

---

## 3. Anomaly Detection

### Voting Fraud Detection

| Anomaly | Detection Method | Sensitivity | Response |
|---|---|---|---|
| **Sudden vote spike on old poll** | Z-score on vote velocity vs poll age baseline | > 3σ deviation | Alert + auto-enable CAPTCHA |
| **One option receiving disproportionate votes** | Chi-squared test vs historical option distribution | p < 0.001 | Alert for manual review |
| **Coordinated voting pattern** | Temporal clustering: many votes at uniform intervals | Inter-vote interval variance < threshold | Alert + block IP range |
| **New account vote surge** | Ratio of votes from accounts < 24h old | > 20% for any poll | Alert + enable account age requirement |
| **Geographic anomaly** | Votes from unexpected regions relative to poll audience | Country distribution diverges from poll's historical baseline | Alert for manual review |

### System Anomaly Detection

| Anomaly | Detection Method | Response |
|---|---|---|
| **Result freshness degradation** | Result cache age exceeds 5× aggregation interval | Page aggregation team; increase worker count |
| **Queue depth spike** | Consumer lag growing despite adequate consumers | Investigate consumer health; check for poison messages |
| **Cache hit rate drop** | Hit rate drops below 95% | Check for eviction storm; verify cache capacity |
| **WebSocket disconnect storm** | > 10% of connections drop in 1 minute | Check gateway health; investigate network issues |
| **Dedup store latency spike** | P99 > 10ms (normally < 2ms) | Check store health; activate circuit breaker if needed |

---

## 4. Logging Strategy

### Log Levels and Content

| Level | When | Content | Volume |
|---|---|---|---|
| **ERROR** | Vote loss, dedup failure, integrity mismatch | Full request context, stack trace | Low (< 0.01% of requests) |
| **WARN** | Rate limit triggered, bot detected, cache miss | Request summary, detection signals | Medium (< 1% of requests) |
| **INFO** | Poll created, poll closed, shard scaled | Poll metadata, operation result | Low-Medium |
| **DEBUG** | Individual vote processing details | Vote details, dedup result, shard selected | High (disabled in production) |

### Structured Log Format

```
{
    "timestamp": "2026-03-10T14:30:00.150Z",
    "level": "INFO",
    "service": "vote-ingestion",
    "trace_id": "abc123def456",
    "span_id": "span789",
    "event": "vote_accepted",
    "poll_id": "p_12345",
    "user_id_hash": "sha256:a1b2c3...",  // Never log raw user_id
    "option_id": 42,
    "dedup_layer": "L2",
    "dedup_latency_ms": 0.8,
    "total_latency_ms": 12.3,
    "region": "us-east-1",
    "node_id": "ingestion-07"
}
```

### Log Aggregation Pipeline

| Stage | Tool/Approach | Retention |
|---|---|---|
| **Collection** | Structured JSON to stdout; sidecar collector | N/A |
| **Shipping** | Async batch shipping to log aggregation service | Buffered locally for 1 hour |
| **Indexing** | Full-text + structured field indexing | 30 days hot, 90 days warm |
| **Archival** | Compressed to object storage | 1 year |

### Privacy in Logs

| Data | Treatment |
|---|---|
| user_id | SHA-256 hash (never raw) |
| IP address | SHA-256 hash (never raw) |
| Vote choice | Logged as option_id (no label) |
| Auth tokens | Never logged |
| Request body | Logged only at DEBUG level; redacted in production |

---

## 5. Distributed Tracing

### Trace Span Hierarchy

```
[vote-ingestion] POST /polls/{id}/votes (12.3ms)
├── [rate-limiter] check_rate_limit (0.5ms)
├── [dedup-service] check_deduplication (2.1ms)
│   ├── [bloom-filter] l1_check (0.001ms) → MISS (not in filter)
│   └── [dedup-store] l2_check_and_set (1.8ms)
│       ├── [network] SISMEMBER (0.7ms) → NOT_EXISTS
│       └── [network] SADD (0.9ms) → ADDED
├── [vote-queue] enqueue_vote (3.2ms)
│   └── [network] produce_message (2.8ms)
├── [cache] get_result_snapshot (0.8ms) → HIT
└── [http] serialize_response (0.3ms)

... (async, separate trace linked by vote_id) ...

[counter-service] process_vote_batch (5.1ms)
├── [vote-queue] dequeue_batch (1.2ms)
├── [kv-store] increment_shard (0.8ms)
└── [audit-log] append_entry (2.5ms)

[aggregation-worker] aggregate_poll (3.8ms)
├── [kv-store] mget_all_shards (2.1ms)
├── [compute] sum_and_percentages (0.2ms)
├── [cache] set_results (0.6ms)
└── [push-service] publish_update (0.7ms)
```

### Trace Sampling Strategy

| Traffic Type | Sample Rate | Rationale |
|---|---|---|
| Normal votes | 0.1% (1 in 1000) | High volume; sampling sufficient for latency analysis |
| Slow votes (> P95) | 100% | Always trace slow requests to identify bottlenecks |
| Failed votes (errors) | 100% | Always trace errors for debugging |
| Hot poll votes | 1% | Higher sampling for active investigation |
| Bot-detected votes | 100% | Full tracing for fraud investigation |
| Admin operations | 100% | Complete audit trail |

---

## 6. Critical Alerts

### Severity 1 (Page Immediately)

| Alert | Condition | Impact | Runbook |
|---|---|---|---|
| **Vote loss detected** | Dedup count > shard total + tolerance for > 1 min | Votes accepted but not counted | Investigate counter service; check queue for stuck messages; rebuild from audit log if needed |
| **Double-vote detected** | Audit log contains duplicate (user_id, poll_id) | Vote integrity compromised | Investigate dedup store; check for split-brain; quarantine affected poll |
| **Dedup store down** | All dedup store nodes unreachable for > 30s | Cannot enforce uniqueness | Activate circuit breaker; queue votes with dedup_pending; page infrastructure |
| **Vote queue data loss** | Queue acknowledged messages lost (replica failure) | Accepted votes may not be counted | Reconcile from dedup set; rebuild missing votes |

### Severity 2 (Page Within 15 Minutes)

| Alert | Condition | Impact | Runbook |
|---|---|---|---|
| **Result freshness degraded** | Any active poll's results > 10s stale | Users see outdated results | Check aggregation workers; scale up if overloaded |
| **Consumer lag > 30s** | Vote queue consumer group lag exceeds 30s | Vote-to-result latency increased | Scale counter consumers; check for slow consumers |
| **Ingestion latency P99 > 100ms** | Sustained for > 5 minutes | User experience degraded | Scale ingestion tier; check dedup store latency |
| **Hot poll not isolated** | Poll exceeding 10K v/s without dedicated resources | Potential platform-wide impact | Trigger hot poll isolation manually |

### Severity 3 (Ticket Next Business Day)

| Alert | Condition | Impact |
|---|---|---|
| **Cache hit rate < 95%** | Sustained for > 1 hour | Increased load on sharded counter store |
| **Bloom filter FP rate > 5%** | For any poll | More L2 dedup checks than necessary (performance) |
| **Bot detection rate > 20%** | For any single poll | Possible ongoing attack; investigate |
| **Error budget > 50% consumed** | Any SLO at midpoint of budget period | Risk of SLO breach by end of period |

---

## 7. Operational Runbooks

### Runbook: Vote Count Mismatch

```
TRIGGER: dedup_count != shard_total (beyond tolerance)

STEP 1: Determine direction
    IF dedup_count > shard_total:
        // Votes accepted but not counted (vote loss)
        SEVERITY: CRITICAL
        GOTO step 2a
    IF shard_total > dedup_count:
        // More counts than unique voters (inflation)
        SEVERITY: CRITICAL
        GOTO step 2b

STEP 2a: Vote loss investigation
    - Check vote queue consumer lag (are messages stuck?)
    - Check counter service error logs
    - Check for failed INCR operations
    - RECOVERY: Replay unprocessed queue messages
    - LAST RESORT: Rebuild counters from audit log

STEP 2b: Vote inflation investigation
    - Check for dedup store data loss or split-brain
    - Check for queue message duplication
    - Verify counter service idempotency
    - RECOVERY: Rebuild from audit log (authoritative)
```

### Runbook: Hot Poll Overload

```
TRIGGER: vote_velocity > 50K/sec AND hot_poll_isolation NOT active

STEP 1: Activate hot poll isolation
    - Increase shard count to 200+
    - Migrate dedup set to dedicated cache node
    - Assign dedicated aggregation worker
    - Create dedicated queue partitions

STEP 2: Scale ingestion tier
    - Verify auto-scaler is adding nodes
    - If auto-scaler is slow: manually add 10 ingestion nodes

STEP 3: Reduce WebSocket push frequency
    - Switch from 500ms to 2s update interval for this poll
    - Enable delta encoding for WebSocket messages

STEP 4: Monitor and adjust
    - Watch queue depth (should stabilize within 2 minutes)
    - Watch vote acceptance latency (should drop below P99 < 50ms)
    - Watch dedup store ops/sec (should be below 80% capacity)
```
