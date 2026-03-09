# AI-Native Compliance Management --- Observability

## Metrics Strategy

### USE Methodology (Utilization, Saturation, Errors)

#### Infrastructure Metrics

| Component | Utilization | Saturation | Errors |
|-----------|------------|------------|--------|
| API Servers | CPU %, memory %, request rate | Request queue depth, connection pool usage % | HTTP 5xx rate, timeout rate |
| Evidence Workers | CPU %, memory %, active job count / capacity | Sync job queue depth, worker thread saturation | Failed collection rate, credential errors |
| Scoring Workers | CPU %, memory %, evaluations/sec | Scoring queue depth, lock contention rate | Evaluation failures, timeout errors |
| Primary Database | CPU %, memory %, disk I/O %, connection usage % | Replication lag, lock wait queue, query queue | Query errors, connection failures |
| Evidence Blob Storage | Storage capacity %, read/write throughput | Request queue depth, throttling rate | Write failures, integrity check failures |
| Cache | Memory usage %, hit rate | Eviction rate, connection count | Connection errors, serialization errors |
| Event Bus | Broker CPU %, disk %, partition count | Consumer lag (messages behind), produce queue | Produce failures, consumer errors |
| Search Index | CPU %, memory %, disk %, query latency | Indexing backlog, merge queue | Index failures, query timeouts |

#### Application Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `evidence.collection.rate` | Evidence artifacts collected per second | Warning: <50% of expected rate; Critical: <25% |
| `evidence.collection.latency_p95` | P95 latency of evidence collection per integration type | Warning: >5 min; Critical: >15 min |
| `evidence.dedup.rate` | Percentage of evidence collections resulting in no-change heartbeats | Info: dedup rate helps size storage |
| `scoring.evaluation.rate` | Control evaluations per second | Warning: <500/sec; Critical: <100/sec |
| `scoring.recalculation.latency_p95` | P95 time from evidence event to score update | Warning: >2 min; Critical: >5 min |
| `scoring.cache.hit_rate` | Percentage of score queries served from cache | Warning: <80%; Critical: <60% |
| `control.drift.rate` | PASSING → FAILING transitions per hour | Warning: >50/hour org-wide; may indicate systemic issue |
| `integration.health.score` | Per-integration health (0--1) aggregated across all orgs | Warning: <0.9; Critical: <0.7 |
| `audit.package.generation.latency` | Time to generate an audit package | Warning: >5 min; Critical: >15 min |
| `remediation.open.count` | Total open remediations across all orgs | Trending metric; alert on week-over-week increase >20% |
| `framework.coverage.percent` | Per-org per-framework compliance coverage | Per-tenant alerting based on customer thresholds |

### RED Methodology (Rate, Errors, Duration)

#### API Endpoints

| Endpoint Category | Rate Metric | Error Metric | Duration Metric |
|------------------|-------------|--------------|-----------------|
| Dashboard APIs | Requests/sec | Error rate (%), HTTP status breakdown | P50, P95, P99 latency |
| Evidence APIs | Reads/sec, writes/sec | Failed reads, failed writes | P50, P95, P99 per operation |
| Scoring APIs | Score queries/sec | Score calculation errors | P50, P95, P99 query time |
| Audit APIs | Package requests/hour | Generation failures | Time to first byte, total generation time |
| Integration APIs | Sync triggers/min | Auth failures, timeout rate | Sync duration per integration type |
| Remediation APIs | CRUD operations/min | Update failures | P50, P95 response time |

---

## Logging Strategy

### Log Levels and Categories

| Category | Log Level | Content | Retention |
|----------|-----------|---------|-----------|
| **Audit Trail** | INFO (always) | All user actions: login, evidence view, control change, package download, role change | 7 years (regulatory) |
| **Evidence Collection** | INFO/WARN/ERROR | Collection events, dedup results, integrity sealing, failures with error details | 90 days (hot), 1 year (warm) |
| **Scoring Events** | INFO/WARN | Score calculations, drift detections, cache updates, evaluation results | 90 days |
| **Integration Health** | INFO/WARN/ERROR | Sync status, credential issues, rate limiting, schema changes | 90 days |
| **Security Events** | WARN/ERROR (always) | Auth failures, permission denials, suspicious access patterns, credential access | 1 year (hot), 7 years (archive) |
| **System Operations** | INFO/WARN/ERROR | Deployment events, scaling events, failover events, backup status | 30 days |
| **API Access** | INFO | Request/response metadata (no PII, no evidence content), latency, status codes | 30 days |

### Log Format

```
Standard structured log format (JSON):

{
  "timestamp": "2025-11-15T10:30:00.123Z",
  "level": "INFO",
  "service": "scoring-engine",
  "instance_id": "scoring-worker-042",
  "trace_id": "abc123def456",
  "span_id": "span789",
  "org_id": "org_uuid",          // always present for tenant-scoped operations
  "user_id": "user_uuid",        // present for user-initiated actions
  "action": "control.evaluated",
  "control_id": "ctrl_uuid",
  "result": "FAILING",
  "previous_status": "PASSING",
  "latency_ms": 45,
  "metadata": {
    "framework_ids": ["soc2", "iso27001"],
    "evidence_count": 3,
    "score_change": -0.05
  }
}
```

### Sensitive Data Redaction

```
Redaction Rules:
  - Integration credentials: NEVER logged; replaced with "[REDACTED]"
  - User emails: Hashed in operational logs; cleartext only in audit trail
  - Evidence content: Never logged in operational logs; only evidence_id and content_hash
  - API keys: Only first 8 characters logged (prefix identification)
  - Request/response bodies: Logged at DEBUG level only; redacted in production
  - IP addresses: Logged for security events; anonymized in analytics
```

---

## Distributed Tracing

### Trace Architecture

```
Trace Propagation Path:

Client Request
    │
    ▼ [trace_id: abc123, span: api-gateway]
API Gateway
    │
    ▼ [trace_id: abc123, span: auth-service]
Auth Service
    │
    ▼ [trace_id: abc123, span: scoring-query]
Scoring Service
    ├──► [span: cache-lookup] Cache Layer
    ├──► [span: db-query] Database
    └──► [span: framework-mapping] Framework Engine
              │
              ▼ [span: graph-query]
              Graph Database

Evidence Collection Path (Async):

Sync Scheduler
    │
    ▼ [trace_id: def456, span: sync-job]
Connector Worker
    │
    ├──► [span: external-api-call] External System
    ├──► [span: evidence-processing] Pipeline
    │         ├──► [span: normalize]
    │         ├──► [span: dedup-check]
    │         ├──► [span: integrity-seal]
    │         └──► [span: index-evidence]
    └──► [span: event-publish] Event Bus
              │
              ▼ [trace_id: def456, span: scoring-consume]
              Scoring Engine (correlated via evidence event)
```

### Key Traces to Monitor

| Trace | Spans | Target Duration | Alert Threshold |
|-------|-------|-----------------|-----------------|
| Dashboard page load | API Gateway → Auth → Scoring Query → Cache/DB → Response | <2 seconds | P95 > 3 seconds |
| Evidence collection cycle | Scheduler → Connector → External API → Processing → Store → Event | <3 minutes | P95 > 10 minutes |
| Score recalculation | Event Consume → Control Eval → Framework Map → Cache Update | <10 seconds | P95 > 30 seconds |
| Audit package generation | Request → Evidence Assembly → Gap Analysis → Rendering → Storage | <5 minutes | P95 > 15 minutes |
| Remediation creation | Drift Event → Remediation Create → Ticket Create → Notification | <5 seconds | P95 > 15 seconds |

### Cross-System Correlation

Evidence collection events carry a `trace_id` that propagates through the event bus to the scoring engine, enabling end-to-end tracing from "evidence collected" to "score updated to "alert sent." This correlation is essential for debugging latency issues in the event-driven pipeline.

```
Correlation Strategy:
  1. Evidence collection creates trace_id
  2. trace_id embedded in evidence.collected event
  3. Scoring engine extracts trace_id from event and creates child span
  4. Drift detection creates child span with same trace_id
  5. Notification service creates child span with same trace_id

  Result: Single trace shows the complete journey from evidence collection
          through scoring, drift detection, and user notification.
```

---

## Alerting Strategy

### Alert Classification

#### Critical Alerts (Page On-Call)

| Alert | Condition | Response |
|-------|-----------|----------|
| Platform down | Health check failures from ≥2 monitoring regions for >2 minutes | Immediate investigation; customer status page update |
| Evidence store write failures | >1% write failure rate for >5 minutes | Check storage health; activate DR if needed |
| Database primary failure | Primary node unreachable; standby not promoted within 60 seconds | Manual failover verification; check replication state |
| Security breach indicator | Multiple authentication failures from internal services; unexpected admin API calls | Security incident response procedure activation |
| Evidence integrity failure | Hash verification mismatch on any evidence artifact | Investigate tampering; isolate affected records; forensic analysis |
| Cross-tenant data leak | Automated test detects cross-tenant data in response | Immediate service isolation; incident response |

#### Warning Alerts (Notify Team Channel)

| Alert | Condition | Response |
|-------|-----------|----------|
| Scoring latency degradation | P95 score recalculation time >2 minutes for >15 minutes | Investigate scoring queue depth; check for batch sync storms |
| Integration health decline | >20% of integrations for a single provider failing | Check provider status; consider circuit breaker activation |
| Cache hit rate drop | Score cache hit rate <70% for >30 minutes | Investigate cache eviction; check for unusual query patterns |
| Evidence collection backlog | Sync queue depth >10,000 jobs for >30 minutes | Scale collection workers; check for provider-wide issues |
| Database replication lag | Replica lag >30 seconds sustained for >10 minutes | Check primary load; investigate long-running queries |
| Credential expiry approaching | OAuth token refresh failure or API key within 7 days of expiry | Notify customer; attempt automatic rotation |
| Storage capacity approaching | Evidence blob storage >80% of allocated capacity | Review retention policies; plan capacity expansion |
| Audit season capacity | Audit package generation queue >100 pending | Pre-scale package generation workers |

#### Informational Alerts (Dashboard / Log)

| Alert | Condition | Purpose |
|-------|-----------|---------|
| Framework update available | New framework version detected in regulatory feed | Notify compliance team to begin mapping review |
| Tenant onboarding spike | >50 new orgs in a day | Capacity planning awareness |
| AI model accuracy drift | Gap analysis accuracy below threshold on validation set | Trigger model retraining pipeline |
| Connector deprecation | External API announces end-of-life for version in use | Plan connector update; notify affected tenants |

### Alert Routing

```
Alert Routing Matrix:

Critical Alerts:
  → PagerDuty (on-call SRE)
  → Slack #incidents channel
  → Email to engineering leadership
  → Customer status page update (if customer-facing)

Warning Alerts:
  → Slack #platform-alerts channel
  → Team-specific Slack channel (e.g., #scoring-team for scoring alerts)
  → Email digest (daily summary of unresolved warnings)

Informational Alerts:
  → Dashboard metrics
  → Weekly ops review report
  → Relevant team Slack channels

Escalation:
  → Unacknowledged Critical: Escalate to engineering manager after 15 min
  → Unresolved Critical: Escalate to VP Engineering after 1 hour
  → Unresolved Warning: Escalate to team lead after 4 hours
```

---

## Compliance-Specific Observability

### Audit Trail Integrity Monitoring

The audit trail is itself a critical compliance artifact. Monitoring the audit trail's integrity is essential:

```
Audit Trail Health Checks:
  1. Sequence verification: Every audit event has a monotonically increasing sequence number
     per org. Gaps indicate dropped events. Alert on any gap.

  2. Hash chain verification: Each audit event includes the hash of the previous event,
     forming a chain. Verify chain integrity hourly.

  3. Volume anomaly detection: Alert if audit event volume drops >50% compared to
     same-day-of-week baseline (may indicate logging failure).

  4. Coverage verification: Every API write operation must produce an audit event.
     Compare API write count with audit event count; alert on discrepancy.
```

### SLA Monitoring Dashboard

```
Customer-Facing SLA Metrics:
  ├── Platform uptime (monthly rolling)
  ├── Evidence collection success rate (per integration)
  ├── Score freshness (time since last recalculation)
  ├── Audit package generation availability
  └── API response time percentiles

Internal SLO Burn Rate:
  ├── Error budget remaining (monthly)
  ├── Burn rate alert (consuming error budget 2x faster than sustainable)
  └── SLI trend lines (week-over-week)
```
