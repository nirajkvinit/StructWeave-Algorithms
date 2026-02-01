# Reddit: Observability

[← Back to Index](./00-index.md) | [← Security](./06-security-and-compliance.md) | [Next: Interview Guide →](./08-interview-guide.md)

---

## Table of Contents

1. [Metrics (USE/RED)](#metrics-usered)
2. [Key Performance Indicators](#key-performance-indicators)
3. [Dashboard Design](#dashboard-design)
4. [Logging Strategy](#logging-strategy)
5. [Distributed Tracing](#distributed-tracing)
6. [Alerting](#alerting)
7. [Runbooks](#runbooks)

---

## Metrics (USE/RED)

### USE Metrics (Resources)

| Resource | Utilization | Saturation | Errors |
|----------|-------------|------------|--------|
| **Vote Queue** | Messages/sec processed | Queue depth | Processing failures |
| **PostgreSQL** | Connections used / max | Lock wait time | Query errors |
| **Redis** | Memory % | Connection queue depth | Command errors |
| **Memcached** | Memory %, hit rate | Evictions/sec | Connection errors |
| **API Servers** | CPU %, memory % | Request queue depth | 5xx responses |
| **Elasticsearch** | Heap %, disk % | Search queue depth | Index errors |

### RED Metrics (Services)

| Service | Rate | Error Rate | Duration (p50/p99) |
|---------|------|------------|-------------------|
| **Vote API** | 2,000/s peak | < 0.01% | 30ms / 150ms |
| **Feed API** | 60,000/s peak | < 0.1% | 100ms / 500ms |
| **Comment API** | 10,000/s peak | < 0.1% | 75ms / 300ms |
| **Post API** | 50/s peak | < 0.1% | 200ms / 500ms |
| **Search API** | 9,000/s peak | < 0.5% | 150ms / 600ms |
| **Auth API** | 5,000/s peak | < 0.1% | 50ms / 200ms |

### Metric Collection

```
METRIC COLLECTION ARCHITECTURE:

┌──────────────────────────────────────────────────────────────────┐
│                        Applications                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ Vote    │  │ Feed    │  │ Comment │  │ Post    │            │
│  │ Service │  │ Service │  │ Service │  │ Service │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
│       │            │            │            │                   │
│       └────────────┴────────────┴────────────┘                   │
│                         │                                        │
│                    /metrics (Prometheus format)                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Prometheus    │
                    │   Scrapers      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────┐  ┌──────▼──────┐  ┌───▼────┐
     │ Prometheus  │  │  Grafana    │  │ Alert  │
     │ TSDB        │  │  Dashboards │  │ Manager│
     └─────────────┘  └─────────────┘  └────────┘
```

---

## Key Performance Indicators

### Vote Health KPIs

```
VOTE SYSTEM HEALTH:

1. Vote Processing Latency
   Metric: vote_processing_duration_seconds
   Labels: {subreddit_id, direction, result}
   Target: p99 < 150ms
   Alert: p99 > 300ms for 5 minutes

2. Vote Queue Depth
   Metric: vote_queue_depth{partition}
   Target: < 5,000 messages
   Alert: > 10,000 for 5 minutes
   Critical: > 50,000

3. Vote Score Staleness
   Metric: score_update_lag_seconds{subreddit_id}
   Target: < 30 seconds
   Alert: > 60 seconds for 10 minutes

4. Vote Error Rate
   Metric: rate(vote_errors_total[5m]) / rate(vote_requests_total[5m])
   Target: < 0.01%
   Alert: > 0.1% for 5 minutes
```

### Feed Health KPIs

```
FEED SYSTEM HEALTH:

1. Feed Generation Latency
   Metric: feed_generation_duration_seconds
   Labels: {subreddit_id, sort_type, cache_status}
   Target: p99 < 500ms
   Alert: p99 > 1s for 5 minutes

2. Feed Cache Hit Rate
   Metric: feed_cache_hits / (feed_cache_hits + feed_cache_misses)
   Target: > 90%
   Alert: < 80% for 10 minutes

3. Hot List Freshness
   Metric: time() - hot_list_last_updated_timestamp
   Target: < 60 seconds
   Alert: > 120 seconds

4. Empty Feed Rate
   Metric: feeds_with_zero_results / total_feed_requests
   Target: < 0.1%
   Alert: > 1% for 5 minutes
```

### Comment Health KPIs

```
COMMENT SYSTEM HEALTH:

1. Comment Tree Build Time
   Metric: comment_tree_build_duration_seconds
   Labels: {post_id, comment_count_bucket}
   Target: p99 < 300ms
   Alert: p99 > 1s for 5 minutes

2. Comment Load Latency
   Metric: comment_api_duration_seconds
   Target: p50 < 100ms, p99 < 500ms
   Alert: p99 > 1s for 5 minutes

3. Comment Cache Hit Rate
   Metric: comment_cache_hit_rate
   Target: > 85%
   Alert: < 70% for 10 minutes

4. "Load More" Success Rate
   Metric: load_more_success / load_more_requests
   Target: > 99.5%
   Alert: < 99% for 5 minutes
```

---

## Dashboard Design

### Executive Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    REDDIT OPERATIONS                            │
│                    Last updated: 2 seconds ago                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ HEALTH      │  │ ERROR RATE  │  │ LATENCY     │             │
│  │   ██████    │  │   0.02%     │  │   120ms     │             │
│  │   100%      │  │   ▼ 0.01%   │  │   p99: 450ms│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  Active Users: 18.2M          Votes/min: 42,000                │
│  Requests/sec: 280,000        Comments/min: 5,200              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  REQUEST RATE (last hour)                                       │
│  ▃▄▅▆▇█▇▆▅▄▃▄▅▆▇█▇▆▅▄▃▄▅▆▇█▇▆▅▄▃▄▅▆▇█▇▆▅▄▃▄▅▆▇█▇▆▅▄▃          │
│  200K                                                  300K     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  SERVICE STATUS                                                 │
│  ● Vote Service    ● Feed Service    ● Comment Service         │
│  ● Post Service    ● Search Service  ● Moderation              │
│  ● PostgreSQL      ● Redis           ● Elasticsearch           │
└─────────────────────────────────────────────────────────────────┘
```

### Vote Service Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOTE SERVICE DASHBOARD                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VOTE RATE                          QUEUE DEPTH BY PARTITION    │
│  ┌─────────────────────────────┐   ┌──────────────────────────┐│
│  │                        ▲    │   │ P0:  ████████ 2,400      ││
│  │                    ▄███    │   │ P1:  ██████ 1,800        ││
│  │                 ▄██████    │   │ P2:  ████████████ 4,200  ││
│  │              ▄█████████    │   │ P3:  ████ 1,200          ││
│  │           ▄████████████    │   │ ...                      ││
│  │ ▄▄▄▄▄▄▄███████████████    │   │ P99: ██ 600              ││
│  └─────────────────────────────┘   └──────────────────────────┘│
│  Current: 1,850/s   Peak: 2,100/s  Threshold: 10,000 ▓▓▓▓▓░░░ │
│                                                                 │
│  PROCESSING LATENCY (p99)          ERROR BREAKDOWN             │
│  ┌─────────────────────────────┐   ┌──────────────────────────┐│
│  │                             │   │ Rate Limited: 45%        ││
│  │     ___                     │   │ Duplicate: 30%           ││
│  │    /   \___     ___         │   │ Invalid: 15%             ││
│  │ __/        \___/   \___     │   │ DB Error: 8%             ││
│  │                         \   │   │ Other: 2%                ││
│  └─────────────────────────────┘   └──────────────────────────┘│
│  Current: 145ms   Target: 150ms    Total Errors: 0.01%         │
│                                                                 │
│  HOT PARTITIONS (by queue depth)                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ #  Partition  Subreddits           Depth   Lag    Workers  ││
│  │ 1  P42        r/wallstreetbets     8,500   12s    5        ││
│  │ 2  P23        r/pics, r/funny      4,200   5s     3        ││
│  │ 3  P67        r/AskReddit          3,100   3s     2        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Feed Service Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEED SERVICE DASHBOARD                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CACHE PERFORMANCE                  LATENCY DISTRIBUTION        │
│  ┌─────────────────────────────┐   ┌──────────────────────────┐│
│  │ Hit Rate:  ████████████░░   │   │         ▄▄               ││
│  │            92%              │   │        ████              ││
│  │                             │   │       ██████             ││
│  │ CDN:       ████████████████ │   │      ████████            ││
│  │            95%              │   │    ████████████          ││
│  │                             │   │  ██████████████████      ││
│  │ Redis:     ████████████░░░  │   │ p50   p75   p90   p99    ││
│  │            88%              │   │ 80ms  150ms 300ms 480ms  ││
│  └─────────────────────────────┘   └──────────────────────────┘│
│                                                                 │
│  FEED REQUESTS BY TYPE             TOP SUBREDDITS (by load)    │
│  ┌─────────────────────────────┐   ┌──────────────────────────┐│
│  │ Hot:     ████████████ 45%   │   │ r/all         12,000/s   ││
│  │ New:     ██████ 22%         │   │ r/popular     8,500/s    ││
│  │ Rising:  ████ 15%           │   │ r/AskReddit   4,200/s    ││
│  │ Top:     ███ 12%            │   │ r/funny       3,800/s    ││
│  │ Contr:   ██ 6%              │   │ r/pics        3,200/s    ││
│  └─────────────────────────────┘   └──────────────────────────┘│
│                                                                 │
│  HOT LIST STALENESS                ERRORS                      │
│  ┌─────────────────────────────┐   ┌──────────────────────────┐│
│  │ Fresh (<30s):  ████████ 85% │   │ Timeouts:     0.05%      ││
│  │ Stale (30-60): ██ 12%       │   │ 5xx:          0.02%      ││
│  │ Very Stale:    ░ 3%         │   │ Empty Feed:   0.01%      ││
│  └─────────────────────────────┘   └──────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Logging Strategy

### Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| **ERROR** | Unexpected failures requiring attention | Database connection failed |
| **WARN** | Degraded operation, potential issues | Rate limit approaching |
| **INFO** | Significant business events | User registered, post created |
| **DEBUG** | Detailed technical information | Cache hit/miss, query plans |
| **TRACE** | Very verbose, rarely enabled | Per-request field values |

### Structured Logging Format

```json
{
  "timestamp": "2026-01-15T10:30:45.123Z",
  "level": "INFO",
  "service": "vote-service",
  "trace_id": "abc123def456",
  "span_id": "789ghi",
  "user_id": "t2_xyz789",
  "subreddit_id": "t5_2qh1i",
  "action": "vote_submitted",
  "thing_id": "t3_abc123",
  "direction": 1,
  "latency_ms": 45,
  "cache_hit": true,
  "message": "Vote processed successfully"
}
```

### Log Aggregation Pipeline

```
LOG PIPELINE:

Applications
    │
    │ (stdout/stderr)
    ▼
┌─────────────────┐
│ Fluentd/Fluent  │  ← Collection
│ Bit (sidecar)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Kafka       │  ← Buffering
│ (logs topic)    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Elastic│ │ S3/   │  ← Storage
│Search │ │ GCS   │
└───────┘ └───────┘

Retention:
  - Hot (Elasticsearch): 7 days
  - Warm (Elasticsearch): 30 days
  - Cold (Object Storage): 1 year
```

### What to Log

```
LOGGING GUIDELINES:

Always Log:
  - Request start/end with duration
  - Authentication events (login, logout, failure)
  - Authorization decisions (especially denials)
  - Vote submissions with subreddit context
  - Content moderation actions
  - Rate limit events
  - Error conditions with stack traces
  - External service calls

Never Log:
  - Passwords or tokens
  - Full request/response bodies (unless error)
  - PII without masking
  - Sensitive user content

Sampling:
  - DEBUG logs: 1% sampling in production
  - High-volume events: Sample by user_id hash
```

---

## Distributed Tracing

### Trace Propagation

```
TRACING ARCHITECTURE:

Request Flow with Traces:
┌────────────────────────────────────────────────────────────────┐
│ Trace: abc123                                                  │
│                                                                │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Span: api-gateway (50ms)                                    ││
│ │  └─ Span: auth-service (10ms)                               ││
│ │  └─ Span: vote-service (35ms)                               ││
│ │       └─ Span: postgres-query (5ms)                         ││
│ │       └─ Span: redis-incr (2ms)                             ││
│ │       └─ Span: kafka-produce (8ms)                          ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                │
│ Headers Propagated:                                            │
│   X-Trace-Id: abc123                                          │
│   X-Span-Id: <current>                                        │
│   X-Parent-Span-Id: <parent>                                  │
└────────────────────────────────────────────────────────────────┘
```

### Critical Spans

| Span Name | Service | Key Attributes |
|-----------|---------|----------------|
| `vote.submit` | Vote Service | user_id, thing_id, direction |
| `vote.queue` | Vote Queue | partition, queue_depth |
| `feed.generate` | Feed Service | subreddit, sort, cache_hit |
| `comment.tree.build` | Comment Service | post_id, comment_count |
| `db.query` | All | query_type, table, duration |
| `cache.get/set` | All | key_prefix, hit/miss, size |
| `moderation.check` | Mod Service | content_type, action |

### Sampling Strategy

```
TRACE SAMPLING:

Head-Based Sampling:
  - 1% of all requests (baseline)
  - 100% of error requests
  - 100% of slow requests (> 1s)
  - 10% of authenticated users (higher value)

Tail-Based Sampling:
  - Keep traces with errors
  - Keep traces with high latency
  - Keep traces with specific flags (debug user)
  - Discard "boring" traces after collection

Implementation:
  sample_rate = 0.01  // 1%

  IF request.user.is_admin:
    sample_rate = 1.0
  ELSE IF request.path.startswith("/api/mod"):
    sample_rate = 0.1

  should_sample = random() < sample_rate
```

---

## Alerting

### Alert Hierarchy

```
ALERT PRIORITY LEVELS:

P1 - CRITICAL (Page immediately):
  - Service down (>50% error rate)
  - Database primary unreachable
  - Vote queue depth > 100,000
  - Security incident detected

P2 - HIGH (Page during business hours):
  - Error rate > 1% for 5 minutes
  - Latency p99 > 2x target
  - Vote processing lag > 5 minutes
  - Cache hit rate < 50%

P3 - MEDIUM (Ticket, next business day):
  - Latency p99 > 1.5x target
  - Disk usage > 80%
  - Certificate expiring in 7 days

P4 - LOW (Dashboard only):
  - Latency p99 > 1.2x target
  - Minor version drift
  - Non-critical feature degraded
```

### Alert Definitions

```yaml
# Vote Queue Critical Alert
- alert: VoteQueueCritical
  expr: sum(vote_queue_depth) > 100000
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Vote queue critically backed up"
    description: "Queue depth {{ $value }} exceeds 100K threshold"
    runbook: "https://wiki/runbooks/vote-queue-backup"

# Feed Latency High
- alert: FeedLatencyHigh
  expr: histogram_quantile(0.99, rate(feed_duration_seconds_bucket[5m])) > 1
  for: 5m
  labels:
    severity: high
  annotations:
    summary: "Feed API latency elevated"
    description: "p99 latency is {{ $value }}s (target: 500ms)"

# Vote Error Rate
- alert: VoteErrorRate
  expr: rate(vote_errors_total[5m]) / rate(vote_requests_total[5m]) > 0.001
  for: 3m
  labels:
    severity: high
  annotations:
    summary: "Vote error rate elevated"
    description: "Error rate {{ $value | humanizePercentage }}"
```

### Alert Routing

```
PAGERDUTY INTEGRATION:

Routing Rules:
  severity: critical → Vote/Feed On-Call Team (immediate)
  severity: high → Platform On-Call (within 15 min)
  severity: medium → Slack #ops-alerts (next business day)
  severity: low → Dashboard only

Escalation Policy:
  0 min: Primary on-call
  15 min: Secondary on-call
  30 min: Engineering Manager
  60 min: VP Engineering

Maintenance Windows:
  - Suppress non-critical during deploys
  - Auto-acknowledge during planned maintenance
```

---

## Runbooks

### Vote Queue Backup Runbook

```
RUNBOOK: Vote Queue Depth Critical

Symptoms:
  - Alert: VoteQueueCritical
  - Vote counts stale (>1 minute)
  - Users reporting "votes not counting"

Diagnosis Steps:
  1. Check queue depth by partition:
     $ kubectl exec -it vote-queue-0 -- rabbitmqctl list_queues

  2. Identify hot partitions:
     Look for partitions with depth > 10,000

  3. Check worker health:
     $ kubectl get pods -l app=vote-worker

  4. Check database latency:
     Query: SELECT avg(duration) FROM pg_stat_statements
            WHERE query LIKE '%UPDATE things%'

Remediation:
  1. SCALE WORKERS (first response):
     $ kubectl scale deployment vote-worker-p{N} --replicas=10

  2. ENABLE DEGRADED MODE (if scaling insufficient):
     $ kubectl set env deployment/vote-service DEGRADED_MODE=true
     Effect: Skip score recalculation, queue for later

  3. PAUSE NON-CRITICAL PROCESSING:
     $ kubectl scale deployment trending-worker --replicas=0

  4. INVESTIGATE ROOT CAUSE:
     - Viral post in specific subreddit?
     - Database slow?
     - Worker errors?

Recovery:
  1. Queue drains to < 5,000
  2. Disable degraded mode
  3. Restore worker counts
  4. Post-incident review
```

### Feed Service Degraded Runbook

```
RUNBOOK: Feed Service High Latency

Symptoms:
  - Alert: FeedLatencyHigh
  - Users experiencing slow page loads
  - Cache hit rate dropping

Diagnosis Steps:
  1. Check cache status:
     $ redis-cli INFO memory
     $ redis-cli INFO stats

  2. Check hot list freshness:
     $ redis-cli TTL "subreddit:t5_2qh1i:hot"

  3. Check database load:
     $ kubectl top pods -l app=postgresql

  4. Check network issues:
     $ kubectl exec -it feed-service-0 -- curl -w "%{time_total}" redis:6379

Remediation:
  1. WARM CACHES (if cold):
     $ kubectl create job --from=cronjob/cache-warmer cache-warm-emergency

  2. EXTEND TTLs (reduce load):
     $ kubectl set env deployment/feed-service CACHE_TTL_MULTIPLIER=2

  3. ENABLE STALE SERVING:
     $ kubectl set env deployment/feed-service SERVE_STALE=true

  4. SCALE SERVICE:
     $ kubectl scale deployment feed-service --replicas=100

Recovery:
  1. Latency p99 < 500ms
  2. Cache hit rate > 85%
  3. Restore normal TTLs
  4. Scale back instances
```

---

## Next Steps

- [Interview Guide →](./08-interview-guide.md)
