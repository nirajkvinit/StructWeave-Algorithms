# LinkedIn: Observability

[← Back to Index](./00-index.md)

---

## Key Metrics

### Business Metrics

| Metric | Definition | Target | Alert Threshold |
|--------|------------|--------|-----------------|
| **DAU** | Unique daily active users | 134.5M | < 130M |
| **MAU** | Unique monthly active users | 310M | < 300M |
| **Sessions/DAU** | Average sessions per user per day | 3.0 | < 2.5 |
| **Feed Engagement Rate** | (Likes + Comments + Shares) / Impressions | 2.5% | < 2.0% |
| **Connection Acceptance Rate** | Accepted / Sent requests | 30% | < 25% |
| **Job Application Rate** | Applications / Job Views | 5% | < 4% |
| **InMail Response Rate** | Responses / InMails Sent | 25% | < 20% |
| **Revenue per User** | Total Revenue / MAU | Confidential | -10% MoM |

### Technical Metrics (Feed Service)

| Metric | Type | Target | Alert |
|--------|------|--------|-------|
| **Request Latency P50** | Latency | < 100ms | > 150ms |
| **Request Latency P99** | Latency | < 500ms | > 800ms |
| **Error Rate** | Errors | < 0.1% | > 0.5% |
| **Throughput** | Rate | 70K QPS peak | < 50K QPS |
| **Cache Hit Rate** | Ratio | > 95% | < 90% |
| **Ranking Model Latency** | Latency | < 50ms | > 100ms |
| **Candidate Generation Time** | Latency | < 30ms | > 50ms |

### Technical Metrics (LIquid Graph)

| Metric | Type | Target | Alert |
|--------|------|--------|-------|
| **Query Latency P50** | Latency | < 20ms | > 40ms |
| **Query Latency P99** | Latency | < 50ms | > 100ms |
| **QPS** | Rate | 2M peak | > 2.5M (capacity) |
| **Memory Usage** | Resource | < 80% | > 90% |
| **Replication Lag** | Time | < 100ms | > 500ms |
| **BFS Depth** | Operations | Avg 2.1 | > 3.0 |

### Technical Metrics (Messaging)

| Metric | Type | Target | Alert |
|--------|------|--------|-------|
| **Send Latency P99** | Latency | < 200ms | > 500ms |
| **Delivery Latency P99** | Latency | < 2s | > 5s |
| **Message Loss Rate** | Errors | 0% | > 0.001% |
| **Espresso Write Latency** | Latency | < 50ms | > 100ms |
| **Kafka Consumer Lag** | Lag | < 1000 msgs | > 10000 msgs |

### Technical Metrics (Job Service)

| Metric | Type | Target | Alert |
|--------|------|--------|-------|
| **Search Latency P99** | Latency | < 500ms | > 800ms |
| **Application Success Rate** | Ratio | > 99.9% | < 99.5% |
| **Galene Index Lag** | Time | < 30s | > 60s |
| **GLMix Inference Latency** | Latency | < 100ms | > 200ms |

---

## Dashboard Design

### Executive Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LINKEDIN EXECUTIVE DASHBOARD                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │      DAU         │  │      MAU         │  │   Revenue        │           │
│  │   134.5M ▲2.1%   │  │   310M ▲1.5%     │  │   $XXM ▲3.2%     │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    USER ENGAGEMENT (7-DAY TREND)                     │    │
│  │  Sessions/DAU ──────────────────────────────────────────────────    │    │
│  │  Feed Engagement ─────────────────────────────────────────────      │    │
│  │  Connection Rate ───────────────────────────────────────────        │    │
│  │                                                                     │    │
│  │  Mon    Tue    Wed    Thu    Fri    Sat    Sun                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────────┐   │
│  │    PLATFORM HEALTH      │  │           TOP ISSUES                    │   │
│  │                         │  │                                         │   │
│  │  Feed Service    ██████ │  │  1. Job search latency spike (P99>600ms)│   │
│  │  Connection Svc  ██████ │  │  2. APAC feed cache miss rate high      │   │
│  │  Job Service     █████░ │  │  3. InMail delivery delay (EU region)   │   │
│  │  Messaging       ██████ │  │                                         │   │
│  │  Graph (LIquid)  ██████ │  │                                         │   │
│  └─────────────────────────┘  └─────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service Health Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FEED SERVICE HEALTH DASHBOARD                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         LATENCY (Last 1 Hour)                          │ │
│  │   800ms ┤                                                               │ │
│  │   600ms ┤                                          P99                  │ │
│  │   400ms ┤                                          ───                  │ │
│  │   200ms ┤           P95                                                 │ │
│  │   100ms ┤ ─────────────────────────────────────── P50                  │ │
│  │     0ms └──────────────────────────────────────────────────────────    │ │
│  │         00:00   00:15   00:30   00:45   01:00                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌──────────────────────────┐  ┌──────────────────────────────────────────┐│
│  │      THROUGHPUT          │  │            ERROR BREAKDOWN               ││
│  │                          │  │                                          ││
│  │  Current: 45,230 QPS     │  │  4xx: 0.08% ████                         ││
│  │  Peak:    68,500 QPS     │  │  5xx: 0.02% █                            ││
│  │  Target:  70,000 QPS     │  │  Timeout: 0.01% ░                        ││
│  │                          │  │                                          ││
│  │  ████████████████████░░  │  │  Total: 0.11% ✓ Below threshold         ││
│  │         65% capacity     │  │                                          ││
│  └──────────────────────────┘  └──────────────────────────────────────────┘│
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    DEPENDENCY HEALTH                                   │ │
│  │                                                                        │ │
│  │  LIquid Graph     ✓ Healthy   P99: 35ms   QPS: 1.2M                   │ │
│  │  Redis Cache      ✓ Healthy   Hit: 96.2%  Memory: 72%                 │ │
│  │  Ranking Service  ⚠ Degraded  P99: 85ms   Error: 0.3%                 │ │
│  │  Feature Store    ✓ Healthy   P99: 12ms   QPS: 500K                   │ │
│  │  Kafka            ✓ Healthy   Lag: 234    Throughput: 2M/s            │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Graph Service Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LIQUID GRAPH DASHBOARD                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                 │
│  │  TOTAL EDGES   │  │  QUERY QPS     │  │  AVG LATENCY   │                 │
│  │  270.3B        │  │  1.85M         │  │  23ms          │                 │
│  │  ▲0.02%/day    │  │  ▲12% (peak)   │  │  ✓ <50ms       │                 │
│  └────────────────┘  └────────────────┘  └────────────────┘                 │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    CLUSTER HEALTH (US-WEST)                            │ │
│  │                                                                        │ │
│  │  Server 1   ██████████████████░░  Memory: 82%  CPU: 45%  QPS: 52K     │ │
│  │  Server 2   █████████████████░░░  Memory: 78%  CPU: 42%  QPS: 48K     │ │
│  │  Server 3   ███████████████████░  Memory: 85%  CPU: 48%  QPS: 55K     │ │
│  │  ...                                                                   │ │
│  │  Server 35  █████████████████░░░  Memory: 79%  CPU: 41%  QPS: 49K     │ │
│  │                                                                        │ │
│  │  TOTAL: 35 servers   AVG Memory: 81%   AVG CPU: 44%   Total: 1.85M   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐│
│  │    QUERY TYPE BREAKDOWN      │  │        REPLICATION STATUS            ││
│  │                              │  │                                      ││
│  │  1st Degree: 65% ██████████  │  │  US-West → US-East:  12ms lag ✓     ││
│  │  2nd Degree: 25% ████        │  │  US-West → EU:       45ms lag ✓     ││
│  │  3rd Degree:  5% █           │  │  US-West → APAC:     82ms lag ✓     ││
│  │  PYMK:        5% █           │  │                                      ││
│  └──────────────────────────────┘  └──────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Logging Strategy

### Structured Logging Format

```
LOG FORMAT (JSON):

{
    // Standard fields
    "timestamp": "2025-01-15T10:30:45.123Z",
    "level": "INFO",
    "service": "feed-service",
    "instance": "feed-service-abc123",
    "region": "us-west-2",

    // Request context
    "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
    "span_id": "00f067aa0ba902b7",
    "request_id": "req_7h4k2m9x",

    // Business context
    "member_id": "urn:li:member:123456",  // Hashed in prod
    "action": "feed_request",
    "endpoint": "/v2/feed",

    // Performance
    "duration_ms": 145,
    "status_code": 200,

    // Custom fields
    "feed_items_returned": 50,
    "cache_hit": true,
    "ranking_model_version": "360brew_v4.2"
}
```

### Log Levels

| Level | Use Case | Examples | Retention |
|-------|----------|----------|-----------|
| **ERROR** | Unhandled errors, failed operations | DB connection failed, null pointer | 90 days |
| **WARN** | Degraded behavior, recoverable issues | Fallback to cache, retry succeeded | 30 days |
| **INFO** | Key business events | Request completed, job applied | 14 days |
| **DEBUG** | Detailed flow information | Cache lookup result, feature values | 3 days (sampled) |
| **TRACE** | Very detailed debugging | Wire-level data, full payloads | On-demand only |

### Log Level Strategy

```
PRODUCTION LOG LEVELS:

BASELINE:
    All Services: INFO
    Critical Paths: INFO + business events

INCIDENT MODE:
    Affected Services: DEBUG
    Duration: Until resolved + 1 hour

SAMPLING:
    DEBUG logs: 1% of requests
    TRACE logs: 0.1% of requests (or on-demand)

PII PROTECTION:
    NEVER LOG:
        - Passwords, tokens
        - Full email addresses
        - Full phone numbers
        - Message content
        - Profile photos

    MASK:
        - Member IDs (hash in prod)
        - IP addresses (last octet)
        - Email (j***@example.com)

LOG ENRICHMENT:
    // Automatic context injection
    FUNCTION LogWithContext(level, message, fields):
        enriched = {
            ...GetRequestContext(),    // trace_id, member_id
            ...GetServiceContext(),    // service, instance, region
            ...fields,
            message: message,
            level: level,
            timestamp: NOW()
        }

        IF enriched.member_id:
            enriched.member_id = Hash(enriched.member_id)

        RETURN Log(enriched)
```

---

## Distributed Tracing

### Trace Propagation

```
TRACING ARCHITECTURE:

                    ┌─────────────┐
                    │   Client    │
                    │  (Browser)  │
                    └──────┬──────┘
                           │ X-Request-ID: req_123
                           │ X-B3-TraceId: abc...
                           ▼
                    ┌─────────────┐
                    │ API Gateway │ Span: gateway
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
     ┌───────────┐  ┌───────────┐  ┌───────────┐
     │Feed Svc   │  │Graph Svc  │  │Feature    │
     │Span: feed │  │Span: graph│  │Span: feat │
     └─────┬─────┘  └───────────┘  └───────────┘
           │
           ▼
     ┌───────────┐
     │Ranking Svc│
     │Span: rank │
     └───────────┘

TRACE HEADER PROPAGATION:
    Headers:
        X-B3-TraceId:      128-bit trace ID
        X-B3-SpanId:       64-bit span ID
        X-B3-ParentSpanId: 64-bit parent span ID
        X-B3-Sampled:      1 (trace) or 0 (don't trace)

    // Or W3C Trace Context:
        traceparent: 00-{trace_id}-{span_id}-{flags}
        tracestate:  linkedin=member_id:123

SPAN ATTRIBUTES:
    {
        "service.name": "feed-service",
        "service.version": "2.4.1",
        "http.method": "GET",
        "http.url": "/v2/feed",
        "http.status_code": 200,
        "member.id": "hashed_123",
        "feed.items_returned": 50,
        "cache.hit": true,
        "db.system": "redis",
        "db.operation": "GET"
    }
```

### Key Spans to Instrument

```
CRITICAL SPANS:

FEED REQUEST:
    gateway
    └── feed-service.GetFeed
        ├── liquid.GetConnections          // Graph query
        ├── redis.GetCachedFeed            // Cache lookup
        ├── espresso.GetContent            // Content fetch
        ├── feature-store.GetFeatures      // ML features
        └── ranking.RankItems              // ML ranking
            ├── model.Inference            // Model execution
            └── diversity.Apply            // Post-processing

CONNECTION REQUEST:
    gateway
    └── connection-service.CreateRequest
        ├── liquid.CheckExisting           // Check relationship
        ├── liquid.CreateEdge              // Create connection
        ├── kafka.EmitEvent                // Publish event
        └── notification.Send              // Trigger notification

JOB APPLICATION:
    gateway
    └── job-service.Apply
        ├── mysql.CheckDuplicate           // Dedup check
        ├── mysql.CreateApplication        // Write application
        ├── kafka.EmitEvent                // Publish event
        └── email.SendConfirmation         // Send email

INMAIL:
    gateway
    └── messaging-service.SendInMail
        ├── pdr.GetShard                   // Get shard location
        ├── spam.Check                     // Spam filter
        ├── espresso.WriteMessage          // Store message
        ├── kafka.EmitEvent                // For delivery
        └── presence.CheckOnline           // Real-time delivery
```

---

## Alerting Strategy

### Alert Thresholds

| Alert | Metric | Warning | Critical | Action |
|-------|--------|---------|----------|--------|
| **Feed Latency** | P99 latency | > 400ms | > 800ms | Page on-call |
| **Feed Error Rate** | 5xx rate | > 0.3% | > 1% | Page on-call |
| **Graph Latency** | P99 latency | > 80ms | > 150ms | Page on-call |
| **Graph Memory** | Memory % | > 85% | > 95% | Page + scale |
| **Kafka Lag** | Consumer lag | > 5K msgs | > 50K msgs | Page on-call |
| **Message Delivery** | Delivery time | > 5s | > 30s | Page on-call |
| **Application Failures** | Failure rate | > 0.1% | > 1% | Page on-call |
| **DAU Drop** | vs prev week | > -5% | > -10% | Alert PM + Eng |

### Escalation Policies

```
ESCALATION MATRIX:

SEVERITY 1 (Critical - User Impact):
    Definition: Major feature unavailable, >1% users affected
    Response: 5 minutes
    Escalation:
        0 min:  Page primary on-call
        5 min:  Page secondary on-call
        15 min: Page engineering manager
        30 min: Page director + incident commander
        60 min: Executive notification

SEVERITY 2 (High - Degraded):
    Definition: Feature degraded, <1% users affected
    Response: 15 minutes
    Escalation:
        0 min:  Page primary on-call
        30 min: Page secondary on-call
        60 min: Page engineering manager

SEVERITY 3 (Medium - Warning):
    Definition: Approaching thresholds, no user impact
    Response: 1 hour
    Escalation:
        0 min:  Slack notification to team
        1 hour: Email to on-call

SEVERITY 4 (Low - Informational):
    Definition: Anomaly detected, monitoring
    Response: Next business day
    Escalation:
        0 min:  Slack notification
        24 hours: Auto-ticket if persists

ON-CALL ROTATION:
    Primary:   1 week rotation
    Secondary: Shadow + backup
    Coverage:  24/7 with regional handoffs
```

### Runbooks

```
RUNBOOK: Feed Service High Latency

SYMPTOMS:
    - Alert: feed_latency_p99 > 800ms
    - User reports: "Feed is slow"
    - Grafana: Latency spike on feed dashboard

QUICK DIAGNOSIS:
    1. Check service health:
       $ kubectl get pods -l app=feed-service
       $ kubectl top pods -l app=feed-service

    2. Check dependencies:
       $ curl http://liquid-graph/health
       $ curl http://ranking-service/health
       $ redis-cli info | grep connected_clients

    3. Check recent deployments:
       $ kubectl rollout history deployment/feed-service

COMMON CAUSES:

    A. RANKING SERVICE SLOW:
       Symptoms: ranking.latency > 100ms
       Fix:
           - Check ranking service pods
           - Check feature store connectivity
           - Fallback: Enable degraded mode (skip ranking)
           $ kubectl set env deployment/feed-service RANKING_ENABLED=false

    B. CACHE MISS RATE HIGH:
       Symptoms: cache.hit_rate < 80%
       Fix:
           - Check Redis cluster health
           - Check for recent cache flush
           - Increase cache TTL temporarily
           $ redis-cli config set maxmemory-policy allkeys-lru

    C. GRAPH QUERIES SLOW:
       Symptoms: liquid.latency > 50ms
       Fix:
           - Check LIquid cluster memory
           - Reduce query fanout
           - Enable query batching

    D. TRAFFIC SPIKE:
       Symptoms: QPS > 80K
       Fix:
           - Scale feed-service pods
           $ kubectl scale deployment/feed-service --replicas=200
           - Enable aggressive caching
           - Consider rate limiting

ESCALATION:
    If not resolved in 15 minutes, escalate to secondary on-call.

POST-INCIDENT:
    - Create incident ticket
    - Document timeline
    - Schedule postmortem if Sev1/Sev2
```

---

## Alerting Configuration

```
PROMETHEUS ALERTING RULES:

groups:
  - name: linkedin-feed-service
    rules:
      - alert: FeedLatencyHigh
        expr: histogram_quantile(0.99, rate(feed_request_duration_seconds_bucket[5m])) > 0.8
        for: 5m
        labels:
          severity: critical
          team: feed
        annotations:
          summary: "Feed P99 latency above 800ms"
          description: "P99 latency: {{ $value | humanizeDuration }}"
          runbook: "https://runbooks.linkedin.internal/feed-latency"

      - alert: FeedErrorRateHigh
        expr: rate(feed_requests_total{status=~"5.."}[5m]) / rate(feed_requests_total[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
          team: feed
        annotations:
          summary: "Feed error rate above 1%"
          description: "Current error rate: {{ $value | humanizePercentage }}"

      - alert: FeedCacheHitRateLow
        expr: rate(feed_cache_hits_total[5m]) / rate(feed_cache_requests_total[5m]) < 0.90
        for: 10m
        labels:
          severity: warning
          team: feed
        annotations:
          summary: "Feed cache hit rate below 90%"

  - name: linkedin-graph-service
    rules:
      - alert: GraphMemoryHigh
        expr: liquid_memory_used_bytes / liquid_memory_total_bytes > 0.90
        for: 5m
        labels:
          severity: warning
          team: graph
        annotations:
          summary: "LIquid memory usage above 90%"

      - alert: GraphReplicationLag
        expr: liquid_replication_lag_seconds > 0.5
        for: 5m
        labels:
          severity: warning
          team: graph
        annotations:
          summary: "LIquid replication lag above 500ms"

PAGERDUTY INTEGRATION:
    route:
      receiver: 'default'
      routes:
        - match:
            severity: critical
          receiver: 'pagerduty-critical'
        - match:
            severity: warning
          receiver: 'slack-warnings'

    receivers:
      - name: 'pagerduty-critical'
        pagerduty_configs:
          - service_key: '<pagerduty_key>'

      - name: 'slack-warnings'
        slack_configs:
          - channel: '#linkedin-alerts'
            send_resolved: true
```

---

*Previous: [← 06 - Security & Compliance](./06-security-and-compliance.md) | Next: [08 - Interview Guide →](./08-interview-guide.md)*
