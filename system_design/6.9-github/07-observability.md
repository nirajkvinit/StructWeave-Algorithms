# Observability

## 1. Key Metrics

### Git Operations

| Metric | Type | p50 Target | p99 Target | Alert Threshold |
|--------|------|-----------|-----------|----------------|
| `git.push.latency` | Histogram | < 200ms | < 5s | p99 > 10s for 5min |
| `git.fetch.latency` | Histogram | < 500ms | < 10s | p99 > 20s for 5min |
| `git.clone.latency` | Histogram | < 2s | < 30s | p99 > 60s for 5min |
| `git.push.rate` | Counter | 580/sec global | N/A | > 2000/sec (DDoS) |
| `git.push.size_bytes` | Histogram | 50KB | 100MB | > 1GB (large push) |
| `git.objects.created` | Counter | N/A | N/A | Trending metric |
| `git.pack.negotiation_rounds` | Histogram | 1 | 3 | > 5 rounds |
| `git.ref_update.cas_failures` | Counter | N/A | N/A | > 100/sec |

### Pull Requests

| Metric | Type | Target | Alert Threshold |
|--------|------|--------|----------------|
| `pr.create.latency` | Histogram | < 500ms | p99 > 5s for 5min |
| `pr.merge.latency` | Histogram | < 2s | p99 > 10s for 5min |
| `pr.mergeability_check.latency` | Histogram | < 1s | p99 > 10s for 5min |
| `pr.diff.computation_time` | Histogram | < 200ms | p99 > 5s for 5min |
| `pr.review.time_to_first_review` | Histogram | < 4hr | N/A (analytics) |
| `pr.merge.conflicts_detected` | Counter | N/A | Trending metric |
| `pr.open_count_per_repo` | Gauge | N/A | > 500 (repo health) |

### Actions / CI/CD

| Metric | Type | Target | Alert Threshold |
|--------|------|--------|----------------|
| `actions.queue.depth` | Gauge | < 100 | > 10,000 jobs for 5min |
| `actions.queue.wait_time` | Histogram | < 30s | p99 > 10min |
| `actions.job.duration` | Histogram | < 5min | p99 > 6hr |
| `actions.runner.utilization` | Gauge | 60-80% | > 95% for 10min |
| `actions.runner.provisioning_time` | Histogram | < 30s | p99 > 2min |
| `actions.workflow.trigger_to_start` | Histogram | < 10s | p99 > 5min |
| `actions.cache.hit_rate` | Gauge | > 70% | < 50% |
| `actions.artifact.upload_size` | Histogram | < 100MB | > 5GB |
| `actions.runner_pool.available` | Gauge per label | > 100 | < 10 |

### Code Search

| Metric | Type | Target | Alert Threshold |
|--------|------|--------|----------------|
| `search.query.latency` | Histogram | < 100ms | p99 > 2s for 5min |
| `search.query.rate` | Counter | 600/sec | > 5000/sec |
| `search.index.freshness_lag` | Gauge | < 2min | > 30min |
| `search.index.size_bytes` | Gauge | N/A | Growth > 10%/week |
| `search.index.rebuild_duration` | Histogram | < 1hr | > 4hr |
| `search.shard.query_latency` | Histogram | < 50ms | p99 > 500ms |
| `search.results.empty_rate` | Gauge | < 20% | > 40% |

### Webhook Delivery

| Metric | Type | Target | Alert Threshold |
|--------|------|--------|----------------|
| `webhook.delivery.latency` | Histogram | < 2s | p99 > 30s |
| `webhook.delivery.success_rate` | Gauge | > 99% | < 95% |
| `webhook.delivery.queue_depth` | Gauge | < 1000 | > 100,000 |
| `webhook.delivery.retry_rate` | Gauge | < 5% | > 20% |
| `webhook.circuit_breaker.open_count` | Gauge | < 100 | > 1000 |

---

## 2. Golden Signals per Service

### Four Golden Signals

| Service | Latency | Traffic | Errors | Saturation |
|---------|---------|---------|--------|-----------|
| **Git Backend** | Push/fetch response time | Requests/sec, bytes/sec | Pack errors, ref update failures | Disk I/O %, CPU % |
| **API Gateway** | Request latency (p50/p99) | Requests/sec per endpoint | 4xx/5xx rates | Connection pool % |
| **PR Service** | Merge/diff latency | PRs created/merged per hour | Merge failures, diff timeouts | Queue depth |
| **Actions Orchestrator** | Event-to-job-start time | Workflow triggers/sec | Failed triggers, YAML parse errors | Event queue depth |
| **Actions Runners** | Job duration | Jobs/sec per pool | Job failures, timeout kills | Pool utilization |
| **Search** | Query latency | Queries/sec | Empty results, timeouts | Index shard CPU % |
| **Webhook Delivery** | Delivery latency | Deliveries/sec | Failed deliveries, circuit opens | Retry queue depth |
| **Database** | Query latency | Queries/sec | Connection errors, deadlocks | Connection pool, disk, replication lag |

---

## 3. Distributed Tracing

### Trace Context Propagation

```
Trace spans for a "git push" operation:

Trace ID: abc-123-def
├── [1] SSH Proxy: authenticate_user (5ms)
│   └── [2] Key Lookup: query_ssh_keys (2ms)
├── [3] Git Backend: receive_pack (150ms)
│   ├── [4] Pack Processing: validate_and_store (100ms)
│   │   ├── [5] Object Store: write_objects (80ms)
│   │   └── [6] Integrity: verify_pack_checksum (15ms)
│   ├── [7] Ref Update: compare_and_swap (5ms)
│   │   └── [8] Database: update_ref (3ms)
│   └── [9] Branch Protection: evaluate_rules (10ms)
│       └── [10] Database: load_protection_rules (5ms)
├── [11] Event Emission: publish_push_event (2ms)
│   └── [12] Message Queue: enqueue (1ms)
└── [13] Response: send_result (1ms)

Async downstream (separate traces, linked by event ID):
├── [A] Webhook Delivery: fan_out (500ms)
│   ├── Delivery 1: POST to endpoint_a (200ms)
│   ├── Delivery 2: POST to endpoint_b (150ms)
│   └── Delivery 3: POST to endpoint_c (350ms)
├── [B] Actions Trigger: evaluate_workflows (100ms)
│   ├── Parse YAML (20ms)
│   └── Create workflow run (50ms)
├── [C] Search Indexer: incremental_update (2000ms)
│   ├── Extract changed files (100ms)
│   └── Update trigram index (1800ms)
└── [D] Notification: send_watchers (300ms)
```

### Cross-Service Trace Headers

```
Trace Context Propagation:

HTTP/API:
  traceparent: 00-abc123def456-span789-01
  tracestate: github=t:push;r:linux/kernel

Git Protocol (custom extension):
  X-GitHub-Trace-ID: abc123def456
  X-GitHub-Request-ID: req-xyz-789

Message Queue Events:
  headers: {
    "trace_id": "abc123def456",
    "parent_span_id": "span789",
    "origin_service": "git-backend",
    "event_type": "push"
  }
```

---

## 4. Logging

### Log Categories

| Category | Volume | Retention | Storage |
|----------|--------|-----------|---------|
| Git protocol events | ~1B/day | 30 days | Hot: 7 days, Cold: 30 days |
| API access logs | ~5B/day | 90 days | Hot: 7 days, Cold: 90 days |
| Application logs | ~500M/day | 30 days | Hot: 7 days, Cold: 30 days |
| Security/audit logs | ~100M/day | 7 years | Hot: 90 days, Cold: 7 years |
| Actions runner logs | ~2B/day | 90 days | Object storage |
| Error/exception logs | ~10M/day | 90 days | Indexed, searchable |
| Webhook delivery logs | ~3B/day | 30 days | Hot: 7 days, Cold: 30 days |

### Structured Log Format

```
{
  "timestamp": "2026-03-08T14:23:45.123Z",
  "level": "info",
  "service": "git-backend",
  "instance": "git-storage-042",
  "trace_id": "abc123def456",
  "request_id": "req-xyz-789",
  "event": "push_completed",
  "repository": "torvalds/linux",
  "repository_id": 2325298,
  "user": "contributor42",
  "user_id": 8837241,
  "ref": "refs/heads/feature/new-driver",
  "old_sha": "abc123...",
  "new_sha": "def456...",
  "objects_received": 47,
  "pack_size_bytes": 234567,
  "duration_ms": 152,
  "protocol": "ssh",
  "client_ip": "203.0.113.42",
  "geo_country": "US",
  "storage_shard": "shard-042"
}
```

### Sensitive Data Handling

```
Log Redaction Rules:
├── Tokens/secrets: Replace with "[REDACTED]"
├── Email addresses: Hash or mask (u***@example.com)
├── IP addresses: Anonymize after 90 days
├── File contents: Never log blob content
├── Passwords: Never logged (not even hashed)
└── GDPR: Support "right to erasure" for user-associated logs
```

---

## 5. Alerting

### Alert Tiers

| Tier | Response Time | Notification | Examples |
|------|-------------|-------------|----------|
| **P1 - Critical** | < 5 min | PagerDuty, phone call | Git operations down, data loss risk, auth outage |
| **P2 - High** | < 30 min | Slack + PagerDuty | Search degraded, Actions queue > 10K, webhook backlog |
| **P3 - Medium** | < 4 hours | Slack channel | Elevated error rates, replication lag > 30s, runner pool low |
| **P4 - Low** | Next business day | Email/ticket | Disk usage > 80%, certificate expiry < 30d, GC backlog |

### Alert Definitions

```
ALERT: GitPushLatencyHigh
  condition: p99(git.push.latency) > 10s for 5 minutes
  severity: P1
  runbook: "Check git-backend CPU/disk, storage shard health"
  actions: Page on-call SRE

ALERT: ActionsQueueBacklog
  condition: actions.queue.depth > 10000 for 5 minutes
  severity: P2
  runbook: "Check runner pool availability, autoscaler health"
  actions: Notify #actions-ops, auto-scale attempt

ALERT: SearchIndexStale
  condition: search.index.freshness_lag > 30 minutes
  severity: P3
  runbook: "Check indexer health, message queue lag"
  actions: Notify #search-team

ALERT: WebhookDeliveryBacklog
  condition: webhook.delivery.queue_depth > 100000
  severity: P2
  runbook: "Check delivery workers, circuit breaker stats"
  actions: Notify #integrations-team

ALERT: DatabaseReplicationLag
  condition: database.replication.lag_seconds > 30 for 5 minutes
  severity: P2
  runbook: "Check replica health, network between primary/replica"
  actions: Page DBA on-call

ALERT: StorageShardDiskFull
  condition: storage.shard.disk_usage_pct > 90
  severity: P3
  runbook: "Run emergency GC, plan shard rebalance"
  actions: Notify #storage-team, create incident ticket

ALERT: GitReplicaLag
  condition: git.replica.lag_seconds > 60 for 5 minutes
  severity: P2
  runbook: "Check replication stream, network connectivity"
  actions: Page on-call, consider routing reads to primary
```

---

## 6. Dashboards

### Infrastructure Overview Dashboard

```
Dashboard: GitHub Infrastructure Overview
├── Row 1: Traffic
│   ├── Panel: Git operations/sec (push, fetch, clone) - time series
│   ├── Panel: API requests/sec (REST, GraphQL) - time series
│   └── Panel: Geographic distribution - world heatmap
│
├── Row 2: Latency
│   ├── Panel: Git push latency (p50, p95, p99) - time series
│   ├── Panel: API latency (p50, p95, p99) - time series
│   └── Panel: Search query latency (p50, p95, p99) - time series
│
├── Row 3: Error Rates
│   ├── Panel: Git operation error rate - time series with threshold
│   ├── Panel: API 5xx rate - time series with threshold
│   └── Panel: Webhook delivery failure rate - time series
│
├── Row 4: Saturation
│   ├── Panel: Storage shard disk usage - bar chart per shard
│   ├── Panel: Database connection pool utilization - gauge
│   └── Panel: Message queue depth - time series per queue
│
└── Row 5: Actions
    ├── Panel: Job queue depth - time series per runner label
    ├── Panel: Runner utilization - gauge per pool
    └── Panel: Workflow success/failure rate - stacked area
```

### Per-Organization Dashboard (Enterprise)

```
Dashboard: Organization Usage
├── Row 1: Repositories
│   ├── Panel: Active repos (pushed in last 30 days) - big number
│   ├── Panel: Storage usage - gauge with quota
│   └── Panel: Top repos by activity - table
│
├── Row 2: Actions
│   ├── Panel: Actions minutes used - time series with quota line
│   ├── Panel: Workflow runs by status - pie chart
│   └── Panel: Runner utilization (self-hosted) - gauge
│
├── Row 3: Security
│   ├── Panel: Secret scanning alerts (open/resolved) - stacked bar
│   ├── Panel: Dependency vulnerabilities by severity - stacked bar
│   └── Panel: Code scanning alerts trend - time series
│
└── Row 4: Collaboration
    ├── Panel: PRs merged per week - time series
    ├── Panel: Mean time to merge - time series
    └── Panel: Review turnaround time - histogram
```

---

## 7. Synthetic Monitoring

### Canary Operations

```
PSEUDOCODE: Synthetic Monitoring

FUNCTION canary_git_operations():
    // Run every 60 seconds from multiple regions
    results = {}

    // Test 1: Git push
    start = now()
    create_test_commit(canary_repo, random_content())
    git_push(canary_repo, "main")
    results["push_latency"] = now() - start

    // Test 2: Git clone (shallow)
    start = now()
    git_clone(canary_repo, depth=1)
    results["clone_latency"] = now() - start

    // Test 3: API - Create and read PR
    start = now()
    pr = api_create_pr(canary_repo, test_branch, "main")
    api_get_pr(canary_repo, pr.number)
    api_close_pr(canary_repo, pr.number)
    results["api_latency"] = now() - start

    // Test 4: Search
    start = now()
    search_results = api_search_code("canary_unique_token_" + today())
    results["search_latency"] = now() - start
    results["search_found"] = len(search_results) > 0

    // Test 5: Webhook received
    start = now()
    git_push(canary_repo, "canary-webhook-test")
    webhook_received = wait_for_webhook(timeout=30_seconds)
    results["webhook_latency"] = now() - start
    results["webhook_received"] = webhook_received

    // Report results
    FOR metric, value IN results:
        emit_metric("canary." + metric, value, tags={"region": current_region})

    // Alert if any canary fails
    IF any_failure(results):
        ALERT("Canary failure in " + current_region + ": " + failed_tests(results))
```

### Health Check Endpoints

| Endpoint | Checks | Frequency | Timeout |
|----------|--------|-----------|---------|
| `/healthz` | Process alive | 10s | 1s |
| `/readyz` | DB connection, dependencies | 30s | 5s |
| `/livez` | Deep health (can serve requests) | 60s | 10s |
| `/metrics` | Prometheus endpoint | 15s scrape | 5s |
