# Observability

[Back to Index](./00-index.md)

---

## Observability Strategy

Status page systems require comprehensive observability to ensure they remain operational when other systems fail. Monitoring must be **independent** of the monitored infrastructure - we cannot use the same observability stack that might be affected during an outage.

### Observability Pillars

| Pillar | Purpose | Key Questions Answered |
|--------|---------|----------------------|
| **Metrics** | Quantitative health indicators | Is the system healthy? How is it performing? |
| **Logs** | Event records for debugging | What happened? Why did it fail? |
| **Traces** | Request flow across services | Where is the bottleneck? What's the critical path? |
| **Alerts** | Proactive issue notification | When do we need to act? |

---

## Metrics

### Key Performance Indicators (KPIs)

| Category | Metric | Type | Target | Alert Threshold |
|----------|--------|------|--------|-----------------|
| **Availability** | status_page_availability | Gauge | 99.99% | < 99.9% |
| **Latency** | page_load_ttfb_p99_ms | Histogram | < 200ms | > 500ms |
| **Throughput** | requests_per_second | Counter | N/A | Drop > 50% |
| **Errors** | error_rate_percent | Gauge | < 0.1% | > 1% |
| **Notifications** | notification_delivery_rate | Gauge | > 99% | < 95% |
| **Real-time** | sse_connections_active | Gauge | N/A | Drop > 30% |

### Metrics by Component

#### CDN/Edge Metrics

```
cdn_cache_hit_ratio:
  description: "Percentage of requests served from cache"
  type: gauge
  labels: [cdn_provider, region, cache_status]
  target: > 95%
  alert: < 90% for 5 minutes

cdn_origin_latency_ms:
  description: "Latency from CDN to origin"
  type: histogram
  labels: [cdn_provider, region]
  buckets: [10, 25, 50, 100, 250, 500, 1000]
  alert: p99 > 500ms

edge_kv_latency_ms:
  description: "Edge KV read/write latency"
  type: histogram
  labels: [operation, region]
  buckets: [1, 5, 10, 25, 50, 100]
  alert: p99 > 50ms

edge_worker_errors:
  description: "Edge worker execution errors"
  type: counter
  labels: [error_type, region]
  alert: > 10/minute
```

#### API Metrics

```
api_request_duration_ms:
  description: "API request processing time"
  type: histogram
  labels: [endpoint, method, status_code]
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500]

api_requests_total:
  description: "Total API requests"
  type: counter
  labels: [endpoint, method, status_code]

api_error_rate:
  description: "Percentage of 5xx responses"
  type: gauge
  labels: [endpoint]
  alert: > 1% for 2 minutes

incident_operations:
  description: "Incident CRUD operations"
  type: counter
  labels: [operation, status]  # create, update, resolve
```

#### SSE/Real-time Metrics

```
sse_connections_active:
  description: "Current active SSE connections"
  type: gauge
  labels: [region, server_id]

sse_connections_total:
  description: "Total SSE connections established"
  type: counter
  labels: [region]

sse_messages_sent:
  description: "SSE messages sent to clients"
  type: counter
  labels: [event_type, region]

sse_connection_duration_seconds:
  description: "Duration of SSE connections"
  type: histogram
  labels: [region]
  buckets: [60, 300, 600, 1800, 3600, 7200]
```

#### Notification Metrics

```
notifications_queued:
  description: "Notifications added to queue"
  type: counter
  labels: [channel, status_page_id]

notifications_sent:
  description: "Notifications successfully sent"
  type: counter
  labels: [channel, provider]

notifications_failed:
  description: "Notifications that failed delivery"
  type: counter
  labels: [channel, provider, error_type]

notification_delivery_latency_ms:
  description: "Time from event to notification delivery"
  type: histogram
  labels: [channel]
  buckets: [1000, 5000, 10000, 30000, 60000, 120000, 300000]

notification_queue_depth:
  description: "Messages waiting in notification queue"
  type: gauge
  labels: [channel]
  alert: > 100000 for 5 minutes
```

#### Database Metrics

```
db_query_duration_ms:
  description: "Database query execution time"
  type: histogram
  labels: [query_type, table]
  buckets: [1, 5, 10, 25, 50, 100, 250, 500]

db_connections_active:
  description: "Active database connections"
  type: gauge
  labels: [pool, region]

db_replication_lag_ms:
  description: "Replication lag to replicas"
  type: gauge
  labels: [replica_id, region]
  alert: > 1000ms for 1 minute

crdt_sync_lag_ms:
  description: "CRDT synchronization lag between regions"
  type: gauge
  labels: [source_region, target_region]
  alert: > 500ms for 2 minutes
```

### Golden Signals Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                  STATUS PAGE GOLDEN SIGNALS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LATENCY (p99)                      TRAFFIC                     │
│  ┌────────────────────────┐        ┌────────────────────────┐  │
│  │  Page Load: 145ms ✓    │        │  Requests: 2.3K/s      │  │
│  │  API: 89ms ✓           │        │  ──────────────────    │  │
│  │  SSE Connect: 234ms ✓  │        │  [Sparkline Graph]     │  │
│  │  Notification: 45s ✓   │        │                        │  │
│  └────────────────────────┘        └────────────────────────┘  │
│                                                                 │
│  ERRORS                             SATURATION                  │
│  ┌────────────────────────┐        ┌────────────────────────┐  │
│  │  API 5xx: 0.02% ✓      │        │  CPU: 34% ✓            │  │
│  │  CDN 5xx: 0.00% ✓      │        │  Memory: 56% ✓         │  │
│  │  Notify Fail: 0.3% ✓   │        │  DB Connections: 45% ✓ │  │
│  │  Webhook Fail: 1.2% ⚠  │        │  Queue Depth: 12K ✓    │  │
│  └────────────────────────┘        └────────────────────────┘  │
│                                                                 │
│  AVAILABILITY                       REAL-TIME                   │
│  ┌────────────────────────┐        ┌────────────────────────┐  │
│  │  Status Page: 100% ✓   │        │  SSE Connections: 847K │  │
│  │  API: 99.99% ✓         │        │  Events/min: 23K       │  │
│  │  (Rolling 30 days)     │        │  Avg Duration: 12min   │  │
│  └────────────────────────┘        └────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Logging

### Log Levels and Usage

| Level | Usage | Examples | Retention |
|-------|-------|----------|-----------|
| **ERROR** | Actionable failures | Database connection failed, notification delivery failed | 90 days |
| **WARN** | Potential issues | High latency, retry triggered, rate limit approached | 30 days |
| **INFO** | Significant events | Incident created, status changed, deployment | 14 days |
| **DEBUG** | Troubleshooting | Request details, query execution, cache operations | 3 days |

### Structured Log Format

```
LOG_SCHEMA:
  timestamp: ISO8601        # 2025-01-22T10:30:00.123Z
  level: string             # ERROR, WARN, INFO, DEBUG
  service: string           # api, sse, notification-worker
  instance_id: string       # Unique instance identifier
  trace_id: string          # Distributed trace ID
  span_id: string           # Current span ID
  message: string           # Human-readable message
  error: object             # Error details if applicable
    type: string
    message: string
    stack: string
  context: object           # Request/operation context
    request_id: string
    status_page_id: string
    user_id: string
    ip_address: string
  duration_ms: number       # Operation duration
  metadata: object          # Additional fields

EXAMPLE_LOG:
{
  "timestamp": "2025-01-22T10:30:00.123Z",
  "level": "INFO",
  "service": "api",
  "instance_id": "api-us-east-1a-7b4d2",
  "trace_id": "abc123def456",
  "span_id": "span789",
  "message": "Incident created",
  "context": {
    "request_id": "req-xyz",
    "status_page_id": "page_acme",
    "user_id": "user_123"
  },
  "duration_ms": 45,
  "metadata": {
    "incident_id": "inc_new456",
    "status": "investigating",
    "impact": "minor"
  }
}
```

### Key Events to Log

```
CRITICAL_EVENTS:
  incident_lifecycle:
    - incident_created
    - incident_updated
    - incident_resolved
    - component_status_changed

  notification:
    - notification_queued
    - notification_sent
    - notification_failed
    - notification_bounced

  authentication:
    - api_key_used
    - api_key_invalid
    - login_success
    - login_failure

  system:
    - service_started
    - service_stopped
    - deployment_completed
    - failover_triggered
    - circuit_breaker_opened
    - circuit_breaker_closed

LOG_SAMPLING:
  DEBUG level:
    default: 1%
    on_error: 100%  # Always log debug context on errors

  High-volume events:
    sse_heartbeat: 0.1%
    cache_hit: 0.01%
    health_check: 1%
```

### Log Aggregation

```
LOG_PIPELINE:
  collection:
    - Application → Log shipper (Fluentd/Vector)
    - Edge workers → Direct to aggregator API

  processing:
    - Parse structured JSON
    - Enrich with service metadata
    - Extract trace context
    - Mask PII fields
    - Route by level/service

  storage:
    hot_tier: 7 days (fast queries)
    warm_tier: 30 days (slower queries)
    cold_tier: 90 days (archive)

  retention:
    error_logs: 90 days
    info_logs: 14 days
    debug_logs: 3 days
    security_logs: 1 year
```

---

## Distributed Tracing

### Trace Context Propagation

```
TRACE_PROPAGATION:
  format: W3C Trace Context

  headers:
    traceparent: "00-{trace_id}-{span_id}-{flags}"
    tracestate: "vendor_key=vendor_value"

  propagation_points:
    - CDN → Edge Worker
    - Edge Worker → Origin API
    - API → Database
    - API → Message Queue
    - Worker → Notification Provider

EXAMPLE_TRACE:
  traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"

  Components:
    version: 00
    trace_id: 0af7651916cd43dd8448eb211c80319c (32 hex chars)
    span_id: b7ad6b7169203331 (16 hex chars)
    flags: 01 (sampled)
```

### Key Spans to Instrument

```
TRACE_SPANS:
  incident_creation:
    root: "POST /v1/incidents"
    children:
      - "validate_request"
      - "database.insert_incident"
      - "event_store.append"
      - "pubsub.publish"
      - "edge_kv.update"
      - "cdn.purge_cache"

  notification_delivery:
    root: "notification.process"
    children:
      - "load_subscribers"
      - "deduplicate"
      - "channel.email.send" / "channel.sms.send"
      - "provider.api_call"
      - "log_delivery"

  page_load:
    root: "GET /status/{page_id}"
    children:
      - "cdn.cache_lookup"
      - "edge_worker.execute"
      - "edge_kv.read"
      - "render_html"

SPAN_ATTRIBUTES:
  http.method: string
  http.url: string
  http.status_code: number
  db.system: string
  db.statement: string (sanitized)
  messaging.system: string
  messaging.destination: string
  status_page.id: string
  incident.id: string
```

### Trace Sampling Strategy

```
SAMPLING_CONFIG:
  default_rate: 1%  # 1 in 100 requests

  conditional_sampling:
    - condition: error occurred
      rate: 100%  # Always trace errors

    - condition: latency > 500ms
      rate: 100%  # Always trace slow requests

    - condition: incident_created OR incident_resolved
      rate: 100%  # Always trace incident operations

    - condition: notification_failed
      rate: 100%  # Always trace failures

  head_based_sampling:
    decision_at: edge_entry_point
    propagate: to all downstream services
```

---

## Alerting

### Alert Categories

| Category | Response Time | Examples |
|----------|---------------|----------|
| **Critical (Page)** | < 5 minutes | Status page down, all regions failed |
| **High (Page)** | < 15 minutes | Single region down, high error rate |
| **Medium (Notify)** | < 1 hour | Elevated latency, queue backlog |
| **Low (Ticket)** | < 24 hours | Certificate expiring, disk space |

### Alert Definitions

```
ALERTS:

  # Critical - Page Immediately
  status_page_down:
    condition: synthetic_check_success == 0 FOR 2 minutes
    severity: critical
    channels: [pagerduty, slack_critical, sms]
    runbook: /runbooks/status-page-down

  all_cdns_unhealthy:
    condition: cdn_healthy_count == 0 FOR 1 minute
    severity: critical
    channels: [pagerduty, slack_critical]
    runbook: /runbooks/cdn-failover

  # High - Page On-call
  region_unavailable:
    condition: region_healthy == false FOR 3 minutes
    severity: high
    channels: [pagerduty, slack_alerts]
    runbook: /runbooks/region-failure

  high_error_rate:
    condition: api_error_rate > 5% FOR 2 minutes
    severity: high
    channels: [pagerduty, slack_alerts]
    runbook: /runbooks/high-error-rate

  notification_delivery_degraded:
    condition: notification_success_rate < 90% FOR 5 minutes
    severity: high
    channels: [pagerduty, slack_alerts]
    runbook: /runbooks/notification-issues

  # Medium - Notify Team
  elevated_latency:
    condition: api_latency_p99 > 500ms FOR 5 minutes
    severity: medium
    channels: [slack_alerts]
    runbook: /runbooks/latency-investigation

  notification_queue_backlog:
    condition: notification_queue_depth > 100000 FOR 5 minutes
    severity: medium
    channels: [slack_alerts]
    runbook: /runbooks/queue-backlog

  crdt_sync_lag:
    condition: crdt_sync_lag_ms > 1000 FOR 5 minutes
    severity: medium
    channels: [slack_alerts]
    runbook: /runbooks/replication-lag

  # Low - Create Ticket
  certificate_expiring:
    condition: cert_days_to_expiry < 30
    severity: low
    channels: [slack_ops, ticket]
    runbook: /runbooks/certificate-renewal

  disk_space_warning:
    condition: disk_usage_percent > 80%
    severity: low
    channels: [slack_ops, ticket]
    runbook: /runbooks/disk-cleanup
```

### Alert Routing

```
ALERT_ROUTING:
  severity_routing:
    critical:
      primary: pagerduty_high_urgency
      secondary: [slack_critical, sms_oncall]
      escalation: 5 minutes → engineering_manager

    high:
      primary: pagerduty_low_urgency
      secondary: [slack_alerts]
      escalation: 15 minutes → pagerduty_high_urgency

    medium:
      primary: slack_alerts
      secondary: []
      escalation: 1 hour → high

    low:
      primary: slack_ops
      secondary: [ticket_system]
      escalation: none

  time_based_routing:
    business_hours:  # 9am-6pm local
      critical: page + call
      high: page
      medium: slack
      low: ticket

    after_hours:
      critical: page + call
      high: page
      medium: hold_until_morning
      low: hold_until_morning

  deduplication:
    window: 5 minutes
    key: [alert_name, severity, resource_id]
    action: suppress_duplicates
```

---

## SLI/SLO Summary

### Service Level Indicators

| SLI | Definition | Measurement |
|-----|------------|-------------|
| **Availability** | Successful status page loads / Total requests | Synthetic + RUM |
| **Latency** | Time to first byte for status page | Synthetic monitoring |
| **Notification Delivery** | Notifications delivered / Notifications attempted | Internal metrics |
| **Freshness** | Time since last status update on page | Edge probe checks |

### Service Level Objectives

| SLO | Target | Error Budget (monthly) | Burn Rate Alert |
|-----|--------|------------------------|-----------------|
| Availability | 99.99% | 4.3 minutes | 14.4x for 1 hour |
| Latency (p99) | < 200ms | 1% of requests | 10% for 10 minutes |
| Notification Delivery | 99% | 1% of notifications | 5% for 5 minutes |
| Update Freshness | < 30 seconds | N/A | > 60 seconds |

### Error Budget Tracking

```
ERROR_BUDGET_DASHBOARD:

  Availability (99.99% target):
    Budget: 4.32 minutes / month
    Used: 1.2 minutes (28%)
    Remaining: 3.12 minutes
    Burn Rate: 0.9x (healthy)
    [═══════░░░░░░░░░░░░░░░] 28%

  Latency (99% < 200ms):
    Budget: 1% of requests
    Used: 0.3%
    Remaining: 0.7%
    Burn Rate: 0.4x (healthy)
    [═══░░░░░░░░░░░░░░░░░░] 30%

  Notifications (99% delivery):
    Budget: 1% failures
    Used: 0.5%
    Remaining: 0.5%
    Burn Rate: 0.7x (healthy)
    [══════════░░░░░░░░░░░] 50%
```

---

## Health Check Endpoints

### Internal Health Checks

```
GET /health/live
  Purpose: Kubernetes liveness probe
  Checks: Process is running
  Response: 200 OK / 503 Service Unavailable
  Timeout: 1 second

GET /health/ready
  Purpose: Kubernetes readiness probe
  Checks:
    - Database connection
    - Redis connection
    - Message queue connection
  Response: 200 OK / 503 Service Unavailable
  Timeout: 5 seconds

GET /health/deep
  Purpose: Detailed health status (internal only)
  Checks:
    - All dependencies
    - Resource utilization
    - Recent error rates
  Response:
    {
      "status": "healthy",
      "checks": {
        "database": {"status": "healthy", "latency_ms": 5},
        "redis": {"status": "healthy", "latency_ms": 2},
        "pubsub": {"status": "healthy", "latency_ms": 10},
        "edge_kv": {"status": "healthy", "latency_ms": 8}
      },
      "resources": {
        "cpu_percent": 34,
        "memory_percent": 56,
        "disk_percent": 42
      }
    }
```

### External Synthetic Checks

```
SYNTHETIC_MONITORING:
  status_page_load:
    url: https://status.example.com/
    locations: [us-east, us-west, eu-west, apac]
    frequency: 30 seconds
    assertions:
      - status_code == 200
      - response_time < 500ms
      - body contains "Status"
    alert_on: 2 consecutive failures

  api_health:
    url: https://api.status.example.com/v1/health
    locations: [us-east, eu-west, apac]
    frequency: 1 minute
    assertions:
      - status_code == 200
      - json.status == "healthy"

  sse_connection:
    url: https://status.example.com/events
    locations: [us-east, eu-west]
    frequency: 5 minutes
    assertions:
      - connection established within 5 seconds
      - receives heartbeat within 60 seconds

  cdn_health:
    urls:
      - https://cdn1.status.example.com/health
      - https://cdn2.status.example.com/health
      - https://cdn3.status.example.com/health
    frequency: 10 seconds
    assertions:
      - status_code == 200
```

---

## Runbook Quick Reference

| Scenario | Runbook | Key Actions |
|----------|---------|-------------|
| Status page down | `/runbooks/status-page-down` | Check CDN, check edge, check origin |
| High error rate | `/runbooks/high-error-rate` | Check logs, check database, scale if needed |
| Notification backlog | `/runbooks/queue-backlog` | Check workers, scale workers, check providers |
| Region failure | `/runbooks/region-failure` | Verify failover, check CRDT sync |
| CDN failover | `/runbooks/cdn-failover` | Verify DNS, check backup CDN health |
| Database issues | `/runbooks/database-issues` | Check connections, check replication |

---

## Next Steps

- [Interview Guide](./08-interview-guide.md) - Interview preparation and strategies
