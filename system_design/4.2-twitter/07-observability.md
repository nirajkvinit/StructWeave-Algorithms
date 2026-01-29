# Observability

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

### USE Metrics (Utilization, Saturation, Errors)

| Resource | Utilization | Saturation | Errors |
|----------|-------------|------------|--------|
| **CPU** | % time busy | Run queue length | Throttling events |
| **Memory** | % used | Swap usage, OOM events | Allocation failures |
| **Network** | Bandwidth % | Packet queue depth | Dropped packets, timeouts |
| **Disk** | IOPS %, throughput % | I/O wait time | Read/write errors |
| **GPU (Navi)** | Compute %, memory % | Queue depth | Inference errors |
| **Redis** | Memory %, CPU % | Connection queue | Evictions, timeouts |
| **MySQL** | QPS %, connections % | Lock waits | Query errors, deadlocks |
| **Kafka** | Partition lag | Consumer lag | Producer errors |

### RED Metrics (Rate, Errors, Duration)

| Service | Rate (QPS) | Error Rate | Duration (p50/p99) |
|---------|------------|------------|-------------------|
| **Timeline API** | 175K peak | <0.01% | 300ms / 1.5s |
| **Tweet API** | 17K peak | <0.1% | 100ms / 500ms |
| **Search API** | 50K peak | <0.5% | 100ms / 500ms |
| **Like/Retweet** | 70K peak | <0.1% | 50ms / 200ms |
| **Home Mixer** | 175K peak | <0.01% | 400ms / 1.2s |
| **Navi Inference** | 500K peak | <0.01% | 10ms / 50ms |
| **ES Indexing** | 6K/s | <0.1% | 200ms / 800ms |

---

## Key Performance Indicators

### Primary KPIs

```
TIMELINE HEALTH:
┌────────────────────────────────────────────────────────┐
│ Metric                    │ Target    │ Alert         │
├───────────────────────────┼───────────┼───────────────┤
│ Timeline Success Rate     │ >99.99%   │ <99.9%        │
│ Timeline p99 Latency      │ <1.5s     │ >2s           │
│ Timeline p50 Latency      │ <300ms    │ >500ms        │
│ Cache Hit Rate            │ >70%      │ <60%          │
│ Empty Timeline Rate       │ <0.1%     │ >1%           │
└───────────────────────────┴───────────┴───────────────┘

TWEET HEALTH:
┌────────────────────────────────────────────────────────┐
│ Metric                    │ Target    │ Alert         │
├───────────────────────────┼───────────┼───────────────┤
│ Tweet Creation Success    │ >99.99%   │ <99.9%        │
│ Tweet Latency (p99)       │ <500ms    │ >1s           │
│ Fan-out Completion        │ <5s       │ >30s          │
│ Fan-out Queue Depth       │ <1M       │ >5M           │
└───────────────────────────┴───────────┴───────────────┘

SEARCH HEALTH:
┌────────────────────────────────────────────────────────┐
│ Metric                    │ Target    │ Alert         │
├───────────────────────────┼───────────┼───────────────┤
│ Search Success Rate       │ >99.9%    │ <99%          │
│ Search Latency (p99)      │ <500ms    │ >1s           │
│ Indexing Latency          │ <1s       │ >2s           │
│ Indexing SLA Compliance   │ >99%      │ <95%          │
└───────────────────────────┴───────────┴───────────────┘

ML HEALTH:
┌────────────────────────────────────────────────────────┐
│ Metric                    │ Target    │ Alert         │
├───────────────────────────┼───────────┼───────────────┤
│ Navi Inference Latency    │ <50ms     │ >100ms        │
│ GPU Utilization           │ <80%      │ >90%          │
│ Model Load Time           │ <30s      │ >60s          │
│ Ranking Decisions/Day     │ ~5B       │ <4B           │
└───────────────────────────┴───────────┴───────────────┘
```

### Business KPIs

| Metric | Description | Collection |
|--------|-------------|------------|
| DAU | Daily Active Users | Unique user IDs per day |
| Timeline Loads/DAU | Engagement depth | Timeline requests / DAU |
| Tweet Creation/DAU | Content creation | New tweets / DAU |
| Engagement Rate | User activity | (Likes + RTs + Replies) / Impressions |
| Time to First Tweet | New user activation | Time from signup to first tweet |

---

## Dashboard Design

### Executive Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    TWITTER PLATFORM HEALTH                       │
│                    Last updated: 2 seconds ago                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AVAILABILITY         LATENCY (p99)        ERROR RATE           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   99.997%   │     │   1.23s     │     │   0.003%    │       │
│  │   ▲ 0.001%  │     │   ▼ 50ms    │     │   ▼ 0.001%  │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  TRAFFIC (QPS)                   REGIONAL HEALTH                 │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐ │
│  │    ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁      │    │ US-East: ● Healthy         │ │
│  │                          │    │ US-West: ● Healthy         │ │
│  │    Current: 145K QPS     │    │ EU-West: ● Healthy         │ │
│  │    Peak 24h: 210K QPS    │    │ APAC:    ● Healthy         │ │
│  └─────────────────────────┘    └─────────────────────────────┘ │
│                                                                  │
│  ACTIVE INCIDENTS: 0            UPCOMING MAINTENANCE: None       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Timeline Service Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOME MIXER DASHBOARD                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  REQUEST RATE              LATENCY DISTRIBUTION                  │
│  ┌──────────────────┐     ┌──────────────────────────────────┐  │
│  │   █                │    │  p50: 298ms  ████                │  │
│  │  ██                │    │  p90: 892ms  ████████████        │  │
│  │ ███ ██             │    │  p95: 1.1s   ██████████████      │  │
│  │████████ ██         │    │  p99: 1.4s   ███████████████████ │  │
│  │Current: 142K QPS   │    └──────────────────────────────────┘  │
│  └──────────────────┘                                            │
│                                                                  │
│  PIPELINE BREAKDOWN                                              │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Candidate Retrieval  [████████░░░░░░░░░░░] 180ms            ││
│  │ Feature Hydration    [████████████░░░░░░░] 320ms            ││
│  │ Light Ranker         [██████░░░░░░░░░░░░░] 150ms            ││
│  │ Heavy Ranker         [██████████████░░░░░] 380ms            ││
│  │ Filtering            [████░░░░░░░░░░░░░░░] 95ms             ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  CACHE PERFORMANCE           CANDIDATE SOURCES                   │
│  ┌──────────────────┐       ┌──────────────────────────────┐    │
│  │ Hit Rate: 72%    │       │ In-Network:  51% (768 avg)   │    │
│  │ Miss Rate: 28%   │       │ Out-Network: 49% (732 avg)   │    │
│  │ Evictions: 12/s  │       │ Total:       1500 candidates │    │
│  └──────────────────┘       └──────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Infrastructure Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE HEALTH                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  KAFKA HEALTH               REDIS CLUSTER                        │
│  ┌──────────────────┐      ┌──────────────────────────────────┐ │
│  │ Partitions: OK   │      │ Timeline Cache                   │ │
│  │ Lag: 45K msgs    │      │   Memory: 72%  CPU: 45%          │ │
│  │ Throughput: 850K │      │   Connections: 12,450            │ │
│  │   msg/sec        │      │                                  │ │
│  └──────────────────┘      │ Session Cache                    │ │
│                            │   Memory: 58%  CPU: 32%          │ │
│  MYSQL SHARDS              │   Connections: 8,200             │ │
│  ┌──────────────────┐      └──────────────────────────────────┘ │
│  │ Healthy: 99,847  │                                           │
│  │ Degraded: 153    │      ELASTICSEARCH                        │
│  │ Failed: 0        │      ┌──────────────────────────────────┐ │
│  │ Replication: OK  │      │ Cluster: GREEN                   │ │
│  └──────────────────┘      │ Nodes: 150/150 healthy           │ │
│                            │ Index Lag: 450ms                 │ │
│  NAVI GPU CLUSTER          │ Query Latency: 85ms p99          │ │
│  ┌──────────────────┐      └──────────────────────────────────┘ │
│  │ GPU Util: 68%    │                                           │
│  │ Memory: 72%      │                                           │
│  │ Inference: 12ms  │                                           │
│  │ Queue: 150       │                                           │
│  └──────────────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Logging Strategy

### Log Levels and Usage

| Level | Use Case | Retention | Sampling |
|-------|----------|-----------|----------|
| **ERROR** | Failures requiring attention | 90 days | 100% |
| **WARN** | Degraded performance, recoverable errors | 30 days | 100% |
| **INFO** | Normal operations, state changes | 14 days | 10% |
| **DEBUG** | Development, troubleshooting | 1 day | 1% (on-demand) |

### Structured Log Format

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "service": "home-mixer",
  "instance": "home-mixer-abc123",
  "region": "us-east-1",
  "trace_id": "abc123def456",
  "span_id": "span789",
  "user_id": "REDACTED",
  "request_id": "req-xyz-789",
  "event": "timeline_request_completed",
  "duration_ms": 1234,
  "candidates_retrieved": 1500,
  "candidates_returned": 200,
  "cache_hit": true,
  "ml_inference_ms": 45,
  "metadata": {
    "client_version": "9.45.0",
    "platform": "ios",
    "experiment_bucket": "control"
  }
}
```

### What to Log

```
ALWAYS LOG:
├── Request start/end with duration
├── Error conditions with stack traces
├── Authentication events (login, logout, failures)
├── Rate limit violations
├── External service calls with latency
├── Cache hits/misses
├── Database queries over threshold (>100ms)
├── Feature flag evaluations (sampled)
└── Business events (tweet created, liked, etc.)

NEVER LOG:
├── PII in plaintext (emails, phones)
├── Authentication tokens/passwords
├── Full request/response bodies (unless error)
├── High-frequency debug messages in production
└── Internal IP addresses

CONDITIONAL LOG:
├── Full request details: Only on error
├── Debug traces: Only with debug flag
├── User behavior: Sampled and anonymized
└── Performance traces: Sampled based on latency
```

### Log Aggregation Pipeline

```
LOG PIPELINE:

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Service   │────▶│   Fluentd   │────▶│    Kafka    │
│   (stdout)  │     │  (sidecar)  │     │  (logs      │
│             │     │             │     │   topic)    │
└─────────────┘     └─────────────┘     └─────┬───────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ↓                         ↓                         ↓
            ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
            │ ElasticSearch│          │    Cold     │           │  Real-time  │
            │  (Hot: 7d)  │           │   Storage   │           │   Alerts    │
            │             │           │  (90 days)  │           │             │
            └─────────────┘           └─────────────┘           └─────────────┘
                    │
                    ↓
            ┌─────────────┐
            │   Kibana    │
            │ (Search/    │
            │  Analysis)  │
            └─────────────┘
```

---

## Distributed Tracing

### Trace Propagation

```
TRACE CONTEXT PROPAGATION:

Headers:
  X-Trace-ID: abc123def456ghi789
  X-Span-ID: span001
  X-Parent-Span-ID: root
  X-Sampling-Decision: 1

SAMPLING STRATEGY:
  - All errors: 100%
  - Slow requests (>1s): 100%
  - Normal requests: 1%
  - Background jobs: 0.1%

TRACE STORAGE:
  - Hot: 24 hours (full detail)
  - Warm: 7 days (sampled, no payload)
  - Cold: 30 days (error traces only)
```

### Key Spans

```
TIMELINE REQUEST TRACE:

timeline_request (root)
├── auth.validate_token
├── ratelimit.check
├── home_mixer.assemble_timeline
│   ├── candidate.in_network
│   │   ├── redis.get_timeline
│   │   └── redis.get_celebrity_tweets
│   ├── candidate.out_of_network
│   │   ├── graphjet.traverse
│   │   └── simclusters.search
│   ├── feature.hydrate
│   │   ├── manhattan.batch_get
│   │   └── feature_store.get
│   ├── ranking.light_model
│   │   └── navi.inference
│   ├── ranking.heavy_model
│   │   └── navi.inference
│   └── filter.apply
├── response.serialize
└── metrics.record

TWEET CREATION TRACE:

tweet_create (root)
├── auth.validate_token
├── ratelimit.check
├── tweetypie.validate
│   └── content.safety_check
├── manhattan.store
├── kafka.publish (async start)
│   ├── fanout.distribute
│   │   └── redis.zadd (×N followers)
│   └── search.index
│       └── elasticsearch.bulk
└── response.serialize
```

### Trace Analysis Queries

```
COMMON TRACE QUERIES:

1. Slow Timeline Requests:
   duration > 2000ms AND service = "home-mixer"

2. Failed ML Inference:
   service = "navi" AND status = "error"

3. Cache Miss Analysis:
   span.name = "redis.get_timeline" AND cache_hit = false

4. Fan-out Bottlenecks:
   service = "fanout" AND queue_depth > 1000000

5. Cross-Service Latency:
   trace_id = "X" ORDER BY start_time
```

---

## Alerting

### Alert Severity Levels

| Severity | Response Time | Notification | Example |
|----------|--------------|--------------|---------|
| **P1 Critical** | <5 minutes | Page on-call | Timeline success <95% |
| **P2 High** | <30 minutes | Page + Slack | Timeline p99 >3s |
| **P3 Medium** | <4 hours | Slack only | Cache hit rate <60% |
| **P4 Low** | Next business day | Email/ticket | Storage approaching limit |

### Critical Alerts (Page-Worthy)

```yaml
# Timeline Availability Critical
alert: TimelineAvailabilityCritical
expr: |
  (sum(rate(timeline_requests_total{status="success"}[5m])) /
   sum(rate(timeline_requests_total[5m]))) < 0.95
for: 2m
severity: P1
annotations:
  summary: "Timeline availability below 95%"
  runbook: "https://runbooks/timeline-availability"

# Timeline Latency Critical
alert: TimelineLatencyCritical
expr: |
  histogram_quantile(0.99, rate(timeline_latency_seconds_bucket[5m])) > 3
for: 5m
severity: P1
annotations:
  summary: "Timeline p99 latency exceeds 3 seconds"
  runbook: "https://runbooks/timeline-latency"

# Fan-out Queue Critical
alert: FanoutQueueCritical
expr: |
  sum(kafka_consumer_lag{topic="fanout"}) > 10000000
for: 2m
severity: P1
annotations:
  summary: "Fan-out queue depth exceeds 10M messages"
  runbook: "https://runbooks/fanout-queue"

# Search Indexing Critical
alert: SearchIndexingCritical
expr: |
  avg(search_indexing_lag_seconds) > 10
for: 5m
severity: P1
annotations:
  summary: "Search indexing lag exceeds 10 seconds"
  runbook: "https://runbooks/search-indexing"

# Database Connection Pool Exhausted
alert: DatabaseConnectionsExhausted
expr: |
  (mysql_connections_active / mysql_connections_max) > 0.9
for: 2m
severity: P1
annotations:
  summary: "Database connection pool >90% utilized"
  runbook: "https://runbooks/database-connections"
```

### Warning Alerts

```yaml
# Timeline Latency Warning
alert: TimelineLatencyWarning
expr: |
  histogram_quantile(0.99, rate(timeline_latency_seconds_bucket[5m])) > 2
for: 10m
severity: P2
annotations:
  summary: "Timeline p99 latency elevated (>2s)"

# Cache Hit Rate Warning
alert: CacheHitRateWarning
expr: |
  (sum(rate(cache_hits_total[5m])) /
   sum(rate(cache_requests_total[5m]))) < 0.6
for: 15m
severity: P3
annotations:
  summary: "Cache hit rate below 60%"

# ML Inference Latency Warning
alert: MLInferenceLatencyWarning
expr: |
  histogram_quantile(0.99, rate(navi_inference_seconds_bucket[5m])) > 0.1
for: 5m
severity: P2
annotations:
  summary: "ML inference p99 latency exceeds 100ms"

# GPU Utilization Warning
alert: GPUUtilizationWarning
expr: |
  avg(gpu_utilization_percent) > 85
for: 10m
severity: P3
annotations:
  summary: "GPU utilization above 85%"
```

---

## Runbooks

### Runbook: Timeline Availability Degraded

```markdown
# Timeline Availability Degraded

## Symptoms
- Timeline success rate < 99%
- Increased error responses (5xx)
- User reports of "Something went wrong"

## Diagnosis Steps

1. Check Dashboard
   - Open Home Mixer dashboard
   - Identify which stage is failing

2. Check Dependencies
   - Redis: Is timeline cache healthy?
   - Manhattan: Is tweet hydration working?
   - Navi: Is ML inference responding?

3. Check Recent Changes
   - Any deployments in last 2 hours?
   - Feature flag changes?
   - Traffic spike?

## Mitigation

### If Redis is unhealthy:
```bash
# Check Redis cluster status
redis-cli -h timeline-redis cluster info

# If node failure, failover
redis-cli -h timeline-redis cluster failover
```

### If Navi is unhealthy:
```bash
# Enable fallback to light ranker
kubectl set env deployment/home-mixer \
  FALLBACK_TO_LIGHT_RANKER=true

# Scale up Navi if capacity issue
kubectl scale deployment/navi --replicas=+5
```

### If traffic spike:
```bash
# Scale Home Mixer
kubectl scale deployment/home-mixer --replicas=+10

# Enable aggressive degradation
kubectl set env deployment/home-mixer \
  DEGRADATION_LEVEL=2
```

## Escalation
- If not resolved in 15 minutes: Page senior on-call
- If regional: Engage infrastructure team
```

### Runbook: Fan-out Queue Backup

```markdown
# Fan-out Queue Backup

## Symptoms
- kafka_consumer_lag > 5M messages
- Timeline not updating for new tweets
- "I can't see my tweet" user reports

## Diagnosis Steps

1. Check Kafka Health
   - Broker health status
   - Partition distribution
   - Consumer group lag

2. Check Fan-out Workers
   - Are workers healthy?
   - Are workers processing?
   - CPU/memory utilization

3. Check Redis
   - Connection count
   - Memory pressure
   - Write latency

## Mitigation

### Scale fan-out workers:
```bash
kubectl scale deployment/fanout-workers --replicas=50
```

### If Redis bottleneck:
```bash
# Check Redis latency
redis-cli --latency-history -h timeline-redis

# If write latency high, add shards
# (requires infrastructure team)
```

### If celebrity storm (single account causing spike):
```bash
# Temporarily lower celebrity threshold
kubectl set env deployment/fanout-service \
  CELEBRITY_THRESHOLD=50000

# Review in 1 hour
```

### Emergency: Pause non-critical fan-out
```bash
# Only push to notification-enabled followers
kubectl set env deployment/fanout-service \
  FANOUT_MODE=critical_only
```

## Escalation
- If lag > 10M for >10 minutes: Page infrastructure
- If specific tweet causing issue: Engage Trust & Safety
```
