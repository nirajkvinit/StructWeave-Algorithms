# Observability

## Key Metrics

### Runtime Metrics (Deployed Apps)

| Metric | Type | Labels | Alert Threshold | Purpose |
|--------|------|--------|----------------|---------|
| `app.load.duration` | Histogram | `app_id`, `org_id`, `cache_hit` | p99 > 500ms | App definition load time |
| `query.execution.duration` | Histogram | `app_id`, `query_name`, `connector_type`, `status` | p99 > 2s | End-to-end query latency |
| `query.execution.count` | Counter | `app_id`, `connector_type`, `status` | N/A | Query throughput |
| `query.execution.errors` | Counter | `app_id`, `error_type` | Rate > 5% of total | Query failure tracking |
| `connector.query.duration` | Histogram | `connector_id`, `connector_type` | p99 > 5s | Raw connector latency (excluding sandbox) |
| `connector.pool.active` | Gauge | `connector_id` | > 80% of max | Connection pool utilization |
| `connector.pool.waiting` | Gauge | `connector_id` | > 0 sustained | Connection pool exhaustion signal |
| `connector.circuit_breaker.state` | Gauge | `connector_id` | State = OPEN | Circuit breaker status |
| `permission.check.duration` | Histogram | `app_id` | p99 > 50ms | Permission evaluation latency |
| `permission.denial.count` | Counter | `app_id`, `reason` | Spike detection | Access control violations |

### Sandbox Metrics

| Metric | Type | Labels | Alert Threshold | Purpose |
|--------|------|--------|----------------|---------|
| `sandbox.execution.duration` | Histogram | `app_id`, `query_name` | p99 > 3s | Transform execution time |
| `sandbox.timeout.count` | Counter | `app_id`, `query_name` | Rate > 1% | Runaway transform detection |
| `sandbox.oom.count` | Counter | `app_id` | Any occurrence | Memory exhaustion attacks |
| `sandbox.crash.count` | Counter | `app_id` | Any occurrence | V8 isolate crashes (potential exploit) |
| `sandbox.pool.available` | Gauge | | < 20% of pool | Isolate pool exhaustion |
| `sandbox.pool.wait_time` | Histogram | | p99 > 100ms | Queuing for isolate |

### Builder Metrics

| Metric | Type | Labels | Alert Threshold | Purpose |
|--------|------|--------|----------------|---------|
| `builder.save.duration` | Histogram | `org_id` | p99 > 2s | Auto-save latency |
| `builder.save.errors` | Counter | `org_id`, `error_type` | Rate > 1% | Save failures |
| `builder.publish.duration` | Histogram | `org_id` | p99 > 5s | Publish operation time |
| `builder.concurrent_editors` | Gauge | `app_id` | > 10 per app | Collaboration load |
| `builder.definition_size` | Histogram | `app_id` | > 5MB | Large app definitions |

### Infrastructure Metrics

| Metric | Type | Labels | Alert Threshold | Purpose |
|--------|------|--------|----------------|---------|
| `cache.hit_rate` | Gauge | `cache_name` | < 90% | Cache effectiveness |
| `cache.eviction.count` | Counter | `cache_name`, `reason` | Spike | Cache pressure |
| `metadata_store.replication_lag` | Gauge | `replica_id` | > 5s | Database replication health |
| `audit_log.write.lag` | Gauge | | > 30s | Audit pipeline backpressure |
| `audit_log.queue.depth` | Gauge | | > 100K | Audit queue buildup |

---

## Logging

### Structured Log Format

```
{
  "timestamp": "2026-03-08T14:23:45.123Z",
  "level": "INFO",
  "service": "query-execution-engine",
  "trace_id": "abc-123-def-456",
  "span_id": "ghi-789",
  "org_id": "org-456",
  "app_id": "app-789",
  "user_id": "user-123",
  "event": "query.executed",
  "query_name": "getOrders",
  "connector_type": "postgresql",
  "connector_id": "conn-prod-db",
  "duration_ms": 145,
  "row_count": 25,
  "sandbox_used": false,
  "cache_hit": true,
  "permission_check_ms": 3,
  "status": "success"
}
```

### Log Level Strategy

| Level | When | Example |
|-------|------|---------|
| **ERROR** | Unrecoverable failures requiring human attention | Metadata store connection failure, credential decryption failure |
| **WARN** | Recoverable issues or threshold crossings | Circuit breaker opened, sandbox timeout, query near timeout |
| **INFO** | Normal operations | Query executed, app published, connector created |
| **DEBUG** | Detailed flow for troubleshooting (high volume) | Binding resolution steps, cache operations, pool acquisition |

### Logging Rules

1. **NEVER log query results**: Results may contain PII, financial data, or health records
2. **NEVER log parameter values**: Binding values may contain sensitive data
3. **NEVER log credentials**: Database passwords, API keys, OAuth tokens
4. **ALWAYS log query metadata**: Query name, connector type, duration, row count, status
5. **ALWAYS include trace context**: trace_id, span_id for distributed tracing
6. **ALWAYS include tenant context**: org_id, app_id, user_id for multi-tenant isolation

---

## Distributed Tracing

### Key Spans

```
Trace: End-user query execution
├── [API Gateway] route_request (1ms)
│   ├── authenticate_user (2ms)
│   └── rate_limit_check (0.5ms)
├── [Permission Engine] check_permission (3ms)
│   ├── load_app_role (1ms)
│   └── load_row_filters (1ms)
├── [Query Execution Engine] execute_query (145ms)
│   ├── load_app_definition (5ms) [cache: hit]
│   ├── resolve_bindings (2ms)
│   ├── parameterize_sql (1ms)
│   ├── inject_row_filters (1ms)
│   ├── [Data Connector Proxy] execute_connector (130ms)
│   │   ├── decrypt_credentials (1ms) [cached]
│   │   ├── acquire_connection (2ms)
│   │   ├── execute_query_on_database (125ms)
│   │   └── release_connection (0.5ms)
│   └── [Sandbox] transform (optional) (5ms)
│       ├── acquire_isolate (0.5ms)
│       ├── execute_code (4ms)
│       └── release_isolate (0.5ms)
└── [Audit Service] log_event (async, 0ms visible)
```

### Trace Context Propagation

- **Client -> API Gateway**: `X-Request-ID` header (generated client-side or by gateway)
- **Service to service**: OpenTelemetry `traceparent` header
- **To connector proxy**: Trace context propagated but **NOT** sent to customer databases
- **To audit service**: Trace ID included in audit event for correlation

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Impact | Runbook |
|-------|-----------|--------|---------|
| **Metadata store primary down** | Primary health check fails for 30s | Builders cannot save; new app loads fail | Verify automatic failover initiated; check replica promotion |
| **Credential store unavailable** | Decryption failures > 10/min | All query execution fails | Check HSM health; verify key management service connectivity |
| **Sandbox crash rate spike** | `sandbox.crash.count` > 5 in 5min | Potential V8 exploit in progress | Isolate affected org/app; review crash dumps; block offending code |
| **SSRF attempt detected** | Blocked connector URL to private IP | Active attack attempt | Review connector configurations for the org; alert security team |
| **Cross-tenant data check failure** | Org isolation validation fails | Data breach risk | Immediately halt affected queries; engage incident response |

### Warning Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| **Cache hit rate drop** | `cache.hit_rate` < 90% for 10min | Investigate eviction patterns; consider cache size increase |
| **Connector circuit breaker open** | Any connector circuit open > 5min | Notify app owners; check customer database health |
| **Sandbox timeout rate increase** | `sandbox.timeout.count` rate > 2% | Review top timeout queries; consider increasing limits or flagging apps |
| **Query execution p99 increase** | `query.execution.duration` p99 > 2s for 15min | Check connector latency; verify no resource contention |
| **Builder save error rate** | `builder.save.errors` rate > 1% | Check metadata store health; verify disk space |
| **Audit log pipeline lag** | `audit_log.write.lag` > 60s | Check message queue health; scale audit consumers |
| **Replication lag** | `metadata_store.replication_lag` > 10s | Check replica health; consider promotion if persistent |

---

## Dashboards

### Dashboard 1: Runtime Health

- **Top panel**: Overall QPS, error rate, p50/p95/p99 query latency (time series)
- **Middle**: Query latency breakdown by connector type (stacked bar chart)
- **Bottom left**: Circuit breaker status per connector (red/yellow/green table)
- **Bottom right**: Sandbox execution rate, timeout rate, crash rate (time series)

### Dashboard 2: Connector Performance

- **Top**: Per-connector query duration heatmap (connector x time, color by p99)
- **Middle**: Connection pool utilization per connector (gauge charts)
- **Bottom**: Slow query leaderboard (top 10 slowest queries by p99, with app and connector)

### Dashboard 3: Builder Activity

- **Top**: Active builders, save rate, publish rate (time series)
- **Middle**: App definition size distribution (histogram)
- **Bottom**: Collaboration sessions (concurrent editors per app, presence events)

### Dashboard 4: Security & Compliance

- **Top**: Permission denial rate, SSRF block count, audit event volume (time series)
- **Middle**: Authentication events (logins, MFA challenges, failures) per org
- **Bottom**: Audit log pipeline health (lag, queue depth, write throughput)

### Dashboard 5: Per-Org Usage & Governance

- **Top**: Query volume by org (top 20 orgs by QPS), trend over 7 days
- **Middle**: Per-org resource consumption (sandbox CPU seconds, connector queries, cache usage)
- **Bottom**: Rate limit hit frequency by org, governance violations (blocked queries, permission denials)

### Dashboard 6: Per-App Deep Dive (Parameterized)

- **Inputs**: App ID, time range
- **Top**: App-specific QPS, error rate, latency
- **Middle**: Per-query breakdown (latency, error rate, execution count)
- **Bottom**: Active end-users, page load times, query dependency graph visualization

---

## Runbook References

### Runbook 1: Metadata Store Failover

**Trigger**: `metadata_store_primary_down` alert

**Steps**:
1. Confirm primary is unreachable (check health endpoint from multiple probe locations)
2. Verify automatic failover has initiated (check replication manager status)
3. If automatic failover did not trigger within 30s, initiate manual promotion of synchronous replica
4. Verify new primary is accepting writes (run test write from builder service)
5. Verify read replicas are now following the new primary
6. Monitor replication lag on all replicas for 10 minutes
7. Update DNS/endpoint if failover changed the primary address
8. Investigate root cause of original primary failure
9. Rebuild failed node as new replica once root cause is resolved

**Expected recovery**: <30s for automatic failover; <5 min for manual

### Runbook 2: Sandbox Crash Rate Spike

**Trigger**: `sandbox_crash_rate_spike` alert (>5 crashes in 5 minutes)

**Steps**:
1. Identify affected org(s) and app(s) from crash logs
2. Check if crashes are from a single app/query or distributed
3. If concentrated in one app: temporarily disable JavaScript transforms for that app
4. Collect V8 crash dumps for analysis
5. Determine if crash is due to: (a) legitimate V8 bug, (b) malicious exploit attempt, (c) extreme resource consumption
6. For suspected exploit: block the specific query transform, alert security team, preserve evidence
7. For V8 bug: file upstream bug report, update V8 version if patch available
8. Restore transforms once root cause is resolved

### Runbook 3: Connector Circuit Breaker Open

**Trigger**: `connector_circuit_breaker_open` alert

**Steps**:
1. Identify the affected connector (connector_id from alert)
2. Check connector health: run `POST /connectors/{id}/test` from admin API
3. If connector is unreachable: contact the org admin (customer's database is likely down)
4. If connector is reachable but slow: check query complexity, suggest query optimization
5. Monitor circuit breaker state: wait for half-open -> closed transition
6. If circuit remains open for >30 minutes: escalate to customer support

### Runbook 4: Cache Stampede

**Trigger**: `cache_hit_rate` drops below 80% with simultaneous QPS spike

**Steps**:
1. Determine cause: mass eviction, cache node failure, or publish storm
2. If cache node failure: verify automatic resharding, check cluster health
3. If publish storm: verify pre-warming is functional
4. Enable request coalescing (deduplicate concurrent fetches for the same key)
5. Temporarily increase cache TTL if safe (e.g., from 5min to 15min)
6. Monitor database replica load (cache misses hit DB)
7. Scale up cache cluster if eviction rate remains high

---

## SLI / SLO Mapping

| Service Level Indicator (SLI) | Measurement | SLO Target | Burn Rate Alert |
|-------------------------------|-------------|------------|-----------------|
| **Runtime availability** | Successful responses / total requests | 99.95% monthly | >2% error rate for 5 min |
| **Query latency** | p99 query execution duration | <1s | p99 > 2s for 10 min |
| **App load latency** | p99 app definition + initial query load | <400ms | p99 > 800ms for 10 min |
| **Builder save success** | Successful saves / total save attempts | 99.99% | >0.1% error rate for 5 min |
| **Publish success** | Successful publishes / total publish attempts | 99.95% | >1% error rate for 5 min |
| **Sandbox success** | Completed transforms / total transform attempts | 99.5% | >2% failure rate for 5 min |

### Error Budget Policy

- **Monthly error budget**: 0.05% of runtime requests (~20,000 failed requests at current scale)
- **50% consumed**: Review recent changes, increase monitoring granularity
- **75% consumed**: Freeze non-critical deploys, focus on reliability improvements
- **100% consumed**: All engineering effort redirected to reliability; no feature work until budget replenished
