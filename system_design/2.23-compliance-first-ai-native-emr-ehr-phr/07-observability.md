# Observability

## Metrics Strategy

### Key Metrics Overview

```
METRICS TAXONOMY:

┌─────────────────────────────────────────────────────────────────────────────┐
│                         METRICS CATEGORIES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GOLDEN SIGNALS (per service):                                              │
│  ├── Latency: Request duration (p50, p95, p99)                             │
│  ├── Traffic: Requests per second                                          │
│  ├── Errors: Error rate (4xx, 5xx)                                         │
│  └── Saturation: Resource utilization (CPU, memory, connections)           │
│                                                                             │
│  RED METRICS (request-focused):                                             │
│  ├── Rate: Requests per second                                             │
│  ├── Errors: Failed requests per second                                    │
│  └── Duration: Request latency distribution                                │
│                                                                             │
│  USE METRICS (resource-focused):                                            │
│  ├── Utilization: % of resource capacity used                              │
│  ├── Saturation: Queue depth, pending work                                 │
│  └── Errors: Resource-specific errors                                      │
│                                                                             │
│  COMPLIANCE METRICS:                                                        │
│  ├── Consent verification success/failure rate                             │
│  ├── Break-the-glass events                                                │
│  ├── Data subject request backlog                                          │
│  ├── Audit log completeness                                                │
│  └── Policy violation count                                                │
│                                                                             │
│  AI METRICS:                                                                │
│  ├── Inference latency                                                     │
│  ├── Model accuracy (drug interaction detection)                           │
│  ├── AI suggestion acceptance rate                                         │
│  ├── Alert override rate                                                   │
│  └── Federated learning round completion                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service-Level Metrics

| Service | Key Metrics | SLO Target |
|---------|-------------|------------|
| **API Gateway** | latency_p99, error_rate, requests_per_second | p99 < 100ms, errors < 0.1% |
| **FHIR Server** | read_latency_p99, write_latency_p99, search_latency_p99 | read < 200ms, write < 500ms |
| **Consent Service** | verification_latency_p99, cache_hit_rate, decisions_per_second | p99 < 30ms, hit > 90% |
| **AI Inference** | inference_latency_p99, gpu_utilization, queue_depth | p99 < 200ms, GPU < 80% |
| **Clinical Services** | request_latency, error_rate, throughput | p99 < 300ms, errors < 0.5% |
| **Database** | query_latency_p99, connections_used, replication_lag | p99 < 50ms, lag < 1s |
| **Message Queue** | consumer_lag, message_age, throughput | lag < 1000 msgs, age < 30s |

### Healthcare-Specific Metrics

```
CLINICAL METRICS:

CONSENT MANAGEMENT:
  consent_verification_total{result="permit|deny|filter"}
  consent_verification_latency_seconds{quantile="0.5|0.95|0.99"}
  consent_cache_operations{operation="hit|miss|eviction"}
  consent_changes_total{action="create|update|revoke"}
  break_the_glass_events_total{reason="emergency|mental_health|..."}
  btg_review_pending_count
  btg_review_overdue_count

CLINICAL DECISION SUPPORT:
  cds_alerts_generated_total{severity="critical|high|moderate|low"}
  cds_alerts_overridden_total{severity="..."}
  drug_interaction_detected_total{severity="..."}
  drug_interaction_detection_latency_seconds
  ai_suggestion_accepted_total{type="coding|documentation|..."}
  ai_suggestion_rejected_total{type="..."}

INTEROPERABILITY:
  fhir_requests_total{method="GET|POST|PUT|DELETE", resource="Patient|Observation|..."}
  fhir_search_latency_seconds{resource="..."}
  hl7_messages_processed_total{type="ADT|ORM|ORU|..."}
  hie_exchange_success_total{partner="..."}
  hie_exchange_failure_total{partner="...", reason="..."}

DATA QUALITY:
  validation_errors_total{resource="...", field="..."}
  duplicate_patient_detected_total
  mpi_match_confidence{quantile="0.5|0.95|0.99"}

AUDIT & COMPLIANCE:
  audit_log_entries_total{action="read|write|delete"}
  audit_log_write_latency_seconds
  compliance_policy_evaluations_total{result="pass|fail"}
  data_subject_requests_pending{type="access|rectification|erasure"}
  data_subject_request_age_days{type="..."}
```

### Dashboard Design

```
OPERATIONAL DASHBOARD:

┌─────────────────────────────────────────────────────────────────────────────┐
│                          SYSTEM HEALTH                                       │
├───────────────────┬───────────────────┬───────────────────┬─────────────────┤
│  API Gateway      │  FHIR Server      │  Consent Service  │  AI Inference   │
│  ● HEALTHY        │  ● HEALTHY        │  ● HEALTHY        │  ● DEGRADED     │
│  p99: 45ms        │  p99: 120ms       │  p99: 12ms        │  p99: 350ms     │
│  Errors: 0.02%    │  Errors: 0.1%     │  Errors: 0%       │  Errors: 2%     │
│  RPS: 1,245       │  RPS: 890         │  RPS: 1,100       │  RPS: 150       │
└───────────────────┴───────────────────┴───────────────────┴─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                       REQUEST LATENCY (15 min)                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │     p50 ─── p95 ─── p99                                              │   │
│  │  400│                                                    *           │   │
│  │     │                     *  *  *                     * * *          │   │
│  │  300│              *  * *      * *  *              * *              │   │
│  │     │         * * *              * * * *  *  *  * *                 │   │
│  │  200│    * * *                          * *  * *                     │   │
│  │     │ * *                                                            │   │
│  │  100├────────────────────────────────────────────────────────────────│   │
│  │     └──────────────────────────────────────────────────────────────  │   │
│  │       10:00    10:05    10:10    10:15    10:20    10:25    10:30   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────┬────────────────────────────────────────────┐
│      CONSENT METRICS           │         AI/CDS METRICS                      │
├────────────────────────────────┼────────────────────────────────────────────┤
│  Verifications/sec: 1,100      │  DDI Alerts (24h): 2,345                   │
│  Cache Hit Rate: 94.2%         │  DDI Override Rate: 12%                    │
│  Permit: 98.1%                 │  Coding Suggestions/hr: 890                │
│  Deny: 1.5%                    │  Coding Acceptance: 76%                    │
│  Filter: 0.4%                  │  Ambient Docs/hr: 234                      │
│  BTG Events (24h): 3           │  Inference Queue: 45 msgs                  │
└────────────────────────────────┴────────────────────────────────────────────┘

COMPLIANCE DASHBOARD:

┌─────────────────────────────────────────────────────────────────────────────┐
│                       COMPLIANCE STATUS                                      │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  AUDIT LOG COMPLETENESS        DATA SUBJECT REQUESTS       POLICY STATUS    │
│  ████████████████░░ 98.5%     │  Pending: 12              │  HIPAA: ✓      │
│  Target: 100%                  │  Overdue: 2               │  GDPR: ✓       │
│                                │  Avg Age: 8 days          │  ABDM: ✓       │
│                                │  SLA: 30 days             │  NHS: ✓        │
│                                                                             │
│  BREAK-THE-GLASS (7 days)      CONSENT COVERAGE           ENCRYPTION       │
│  ██░░░░░░░░░░░░░░░░ 15        │  Active: 8.2M             │  At-rest: ✓    │
│  Reviewed: 12                  │  Expired: 450K            │  In-transit: ✓ │
│  Pending: 3                    │  Coverage: 94.8%          │  Field-level: ✓│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Logging Strategy

### Structured Logging Format

```json
{
  "timestamp": "2025-01-23T10:30:00.123Z",
  "level": "INFO",
  "service": "fhir-server",
  "instance_id": "fhir-server-abc123",
  "region": "us-east-1",

  "trace_id": "abc123def456",
  "span_id": "span789",
  "parent_span_id": "span456",

  "message": "FHIR resource created",

  "request": {
    "method": "POST",
    "path": "/fhir/r4/Observation",
    "query_params": {},
    "content_type": "application/fhir+json",
    "content_length": 1234,
    "user_agent": "Epic/2025.1"
  },

  "response": {
    "status_code": 201,
    "content_length": 1456,
    "duration_ms": 45
  },

  "actor": {
    "type": "Practitioner",
    "id": "Practitioner/dr-smith-456",
    "tenant_id": "hospital-789"
  },

  "patient": {
    "id": "Patient/patient-123"
  },

  "consent": {
    "id": "Consent/consent-abc",
    "decision": "permit",
    "verification_ms": 3
  },

  "resource": {
    "type": "Observation",
    "id": "Observation/obs-xyz",
    "version": "1"
  },

  "context": {
    "session_id": "session-123",
    "correlation_id": "corr-456",
    "source_ip": "10.0.1.50",
    "mfa_verified": true
  }
}
```

### Log Levels and Usage

| Level | Usage | Examples |
|-------|-------|----------|
| **ERROR** | Unexpected failures requiring attention | Database connection failure, consent service unavailable |
| **WARN** | Degraded conditions, recoverable issues | High latency, retry succeeded, rate limit approached |
| **INFO** | Normal operations, audit trail | Resource created, consent verified, user authenticated |
| **DEBUG** | Detailed troubleshooting | Query plans, cache decisions, algorithm steps |
| **TRACE** | Extremely detailed (rarely enabled) | Full request/response bodies, step-by-step execution |

### Log Categories

```
LOG CATEGORIES:

AUDIT LOGS (Compliance-Critical):
  -- Every PHI access must be logged
  -- Immutable, hash-chained
  -- Retention: 6-8 years

  log.audit({
    action: "read",
    resource_type: "DiagnosticReport",
    resource_id: "DiagnosticReport/123",
    patient_id: "Patient/456",
    actor_id: "Practitioner/789",
    consent_id: "Consent/abc",
    access_type: "normal",
    success: true
  })

SECURITY LOGS:
  -- Authentication events
  -- Authorization failures
  -- Security incidents

  log.security({
    event_type: "authentication_failure",
    username: "dr.smith",
    reason: "invalid_password",
    source_ip: "10.0.1.50",
    attempt_count: 3
  })

APPLICATION LOGS:
  -- Business logic events
  -- Integration events
  -- Performance data

  log.app({
    event: "order_created",
    order_id: "Order/123",
    order_type: "lab",
    patient_id: "Patient/456",
    duration_ms: 150
  })

AI/ML LOGS:
  -- Inference events
  -- Model predictions
  -- Human overrides

  log.ai({
    model: "drug-interaction-v3",
    model_version: "3.1.0",
    input_hash: "sha256:abc...",
    prediction: "moderate_interaction",
    confidence: 0.87,
    latency_ms: 45,
    human_override: false
  })
```

### PHI Handling in Logs

```
PHI LOGGING POLICY:

NEVER LOG:
  ├── Social Security Numbers
  ├── Full dates of birth (year only if needed)
  ├── Patient names (use ID only)
  ├── Addresses
  ├── Phone numbers
  ├── Email addresses
  ├── Clinical note content
  └── Unmasked medical record numbers

ALLOWED TO LOG:
  ├── Resource IDs (Patient/123, Observation/456)
  ├── Tenant IDs
  ├── Actor IDs
  ├── Consent IDs
  ├── Resource types
  ├── Operation types
  └── Aggregate counts

MASKING IMPLEMENTATION:

FUNCTION sanitize_log_entry(entry):
    -- Remove any PHI that may have leaked
    FOR field IN entry.fields:
        IF looks_like_ssn(field.value):
            field.value = "[REDACTED-SSN]"
        IF looks_like_email(field.value):
            field.value = "[REDACTED-EMAIL]"
        IF looks_like_phone(field.value):
            field.value = "[REDACTED-PHONE]"
        IF field.name IN ["patient_name", "address", "dob"]:
            field.value = "[REDACTED]"

    RETURN entry

-- Apply sanitization before writing
log_entry = sanitize_log_entry(log_entry)
log_writer.write(log_entry)
```

---

## Distributed Tracing

### Trace Propagation

```
TRACING ARCHITECTURE:

┌─────────────────────────────────────────────────────────────────────────────┐
│                      DISTRIBUTED TRACE FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Client Request                                                             │
│       │                                                                     │
│       │ X-Request-ID: req-123                                              │
│       │ traceparent: 00-trace-abc-span-001-01                              │
│       ▼                                                                     │
│  ┌─────────────┐                                                           │
│  │ API Gateway │ ─── Span: gateway.request                                 │
│  └──────┬──────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐                                                           │
│  │   Auth      │ ─── Span: auth.verify_token                               │
│  └──────┬──────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐                                                           │
│  │  Consent    │ ─── Span: consent.verify                                  │
│  │  Service    │     └── Span: consent.cache_lookup                        │
│  └──────┬──────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐                                                           │
│  │   FHIR      │ ─── Span: fhir.create_observation                         │
│  │  Server     │     ├── Span: fhir.validate_resource                      │
│  └──────┬──────┘     └── Span: fhir.persist                                │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐                                                           │
│  │  Database   │ ─── Span: db.insert                                       │
│  └──────┬──────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐                                                           │
│  │   Kafka     │ ─── Span: kafka.produce (async)                           │
│  └──────┬──────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐                                                           │
│  │    CDS      │ ─── Span: cds.evaluate_rules (async)                      │
│  │  Consumer   │     └── Span: cds.drug_interaction_check                  │
│  └─────────────┘                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

TRACE CONTEXT (W3C Trace Context):

  traceparent: 00-{trace-id}-{span-id}-{flags}
  tracestate: vendor1=value1,vendor2=value2

  Example:
    traceparent: 00-abc123def456789012345678-span123456-01
    tracestate: consent=verified,tenant=hospital-789
```

### Key Spans to Instrument

| Component | Span Name | Attributes |
|-----------|-----------|------------|
| API Gateway | `gateway.request` | method, path, status_code |
| Auth | `auth.verify_token` | token_type, mfa_verified |
| Consent | `consent.verify` | decision, cache_hit, consent_id |
| FHIR Server | `fhir.{operation}` | resource_type, resource_id |
| Database | `db.{operation}` | table, query_type, rows_affected |
| AI Inference | `ai.inference` | model, version, confidence |
| Message Queue | `mq.produce/consume` | topic, partition |

### Consent Context in Traces

```
CONSENT-AWARE TRACING:

-- Add consent decision to trace context
FUNCTION add_consent_to_trace(span, consent_decision):
    span.set_attribute("consent.id", consent_decision.consent_id)
    span.set_attribute("consent.decision", consent_decision.decision)
    span.set_attribute("consent.verification_ms", consent_decision.latency)
    span.set_attribute("consent.cache_hit", consent_decision.cache_hit)

    IF consent_decision.decision == "filter":
        span.set_attribute("consent.filters_applied", consent_decision.filters)

    IF consent_decision.access_type == "break_the_glass":
        span.set_attribute("btg.reason", consent_decision.btg_reason)
        span.set_attribute("btg.token_id", consent_decision.btg_token)

-- Query traces by consent decision
QUERY: traces WHERE consent.decision = "deny"
QUERY: traces WHERE consent.access_type = "break_the_glass"
QUERY: traces WHERE consent.verification_ms > 100
```

---

## Alerting

### Alert Categories

```
ALERT CATEGORIES:

CRITICAL (Page Immediately):
  ├── Service down (> 2 min)
  ├── Database primary failure
  ├── Error rate > 5%
  ├── Consent service unavailable
  ├── Security incident detected
  ├── Break-the-glass review overdue (> 48h)
  └── Data breach indicator

HIGH (Page during business hours):
  ├── Latency p99 > 2x SLO (> 15 min)
  ├── Error rate > 1% (> 10 min)
  ├── Replication lag > 5 min
  ├── Cache hit rate < 50%
  ├── AI service degraded
  └── Certificate expiring (< 7 days)

MEDIUM (Create ticket):
  ├── Disk usage > 80%
  ├── Connection pool > 70%
  ├── Slow queries detected
  ├── Alert override rate > 20%
  └── Data quality issues

LOW (Dashboard/Email):
  ├── New deployment completed
  ├── Scheduled maintenance reminder
  ├── Usage metrics summary
  └── Training completion reminder
```

### Alert Rules

```yaml
# Prometheus Alert Rules

groups:
  - name: availability
    rules:
      - alert: ServiceDown
        expr: up{job="fhir-server"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "FHIR Server is down"
          description: "FHIR Server {{ $labels.instance }} has been down for more than 2 minutes."
          runbook: "https://runbooks.example.com/fhir-server-down"

      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"

  - name: latency
    rules:
      - alert: HighLatencyP99
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
          ) > 0.5
        for: 10m
        labels:
          severity: high
        annotations:
          summary: "High p99 latency for {{ $labels.service }}"
          description: "p99 latency is {{ $value | humanizeDuration }}"

  - name: consent
    rules:
      - alert: ConsentServiceDegraded
        expr: |
          histogram_quantile(0.99,
            sum(rate(consent_verification_duration_seconds_bucket[5m])) by (le)
          ) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Consent verification latency degraded"
          description: "Consent p99 latency is {{ $value | humanizeDuration }} (SLO: 30ms)"

      - alert: BreakTheGlassReviewOverdue
        expr: btg_review_pending_count{status="overdue"} > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Break-the-glass review overdue"
          description: "{{ $value }} BTG events require review within 48 hours"
          runbook: "https://runbooks.example.com/btg-review"

  - name: compliance
    rules:
      - alert: AuditLogGap
        expr: |
          time() - max(audit_log_last_entry_timestamp) > 300
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "Audit log gap detected"
          description: "No audit log entries in the last {{ $value | humanizeDuration }}"

      - alert: DataSubjectRequestOverdue
        expr: |
          max(data_subject_request_age_days{status="pending"}) > 25
        for: 0m
        labels:
          severity: high
        annotations:
          summary: "Data subject request approaching SLA"
          description: "Request has been pending for {{ $value }} days (SLA: 30 days)"

  - name: ai
    rules:
      - alert: AIServiceDegraded
        expr: ai_inference_success_rate < 0.95
        for: 10m
        labels:
          severity: medium
        annotations:
          summary: "AI inference success rate below threshold"
          description: "Success rate is {{ $value | humanizePercentage }}"

      - alert: HighAlertOverrideRate
        expr: |
          sum(rate(cds_alerts_overridden_total[24h]))
          /
          sum(rate(cds_alerts_generated_total[24h])) > 0.20
        for: 0m
        labels:
          severity: medium
        annotations:
          summary: "High CDS alert override rate"
          description: "Alert override rate is {{ $value | humanizePercentage }} - potential alert fatigue"
```

### On-Call Runbooks

```
RUNBOOK: CONSENT SERVICE UNAVAILABLE

SEVERITY: Critical
SLA: Restore within 15 minutes

SYMPTOMS:
  - Alert: ConsentServiceDegraded or ConsentServiceDown
  - Clinical users reporting "Access Denied" errors
  - Spike in BTG requests

IMPACT:
  - All data access requires consent verification
  - System fails closed (denies access) when consent unavailable
  - Only BTG access works during outage

DIAGNOSIS:
  1. Check consent service pods: kubectl get pods -l app=consent-service
  2. Check consent cache: redis-cli ping
  3. Check consent database: psql -c "SELECT 1" consent_db
  4. Check recent deployments: kubectl rollout history

RESOLUTION:
  1. If pods crashing: kubectl rollout restart deployment/consent-service
  2. If cache down: Failover to replica, clear bad node
  3. If database down: Trigger database failover
  4. If recent deployment: kubectl rollout undo deployment/consent-service

ESCALATION:
  - 15 min: Escalate to on-call manager
  - 30 min: Escalate to VP Engineering
  - 60 min: Invoke incident commander

POST-INCIDENT:
  - File incident report within 24 hours
  - Schedule blameless post-mortem
  - Update runbook with learnings

---

RUNBOOK: BREAK-THE-GLASS REVIEW OVERDUE

SEVERITY: Critical (Compliance)
SLA: Complete review within 48 hours of BTG event

SYMPTOMS:
  - Alert: BreakTheGlassReviewOverdue
  - Dashboard shows pending BTG reviews

IMPACT:
  - Potential compliance violation
  - Patient notification may be required
  - Audit finding if not resolved

DIAGNOSIS:
  1. Access BTG review dashboard
  2. Identify overdue events
  3. Confirm Privacy Officer availability

RESOLUTION:
  1. Notify Privacy Officer immediately
  2. If PO unavailable, escalate to backup PO
  3. Complete review in BTG review system
  4. Document findings and decision

ESCALATION:
  - Immediately: Privacy Officer
  - 4 hours: Chief Privacy Officer
  - 24 hours: General Counsel

POST-INCIDENT:
  - Document reason for delay
  - Assess process improvement
  - Consider automation of review routing
```

---

## Compliance Dashboards

### Real-Time Compliance View

```
COMPLIANCE COMMAND CENTER:

┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLIANCE STATUS - REAL TIME                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FRAMEWORK STATUS                                                           │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐       │
│  │  HIPAA   │   GDPR   │   ABDM   │   NHS    │   LGPD   │    AU    │       │
│  │    ✓     │    ✓     │    ✓     │    ✓     │    ✓     │    ✓     │       │
│  │ Compliant│ Compliant│ Compliant│ Compliant│ Compliant│ Compliant│       │
│  └──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘       │
│                                                                             │
│  KEY COMPLIANCE METRICS (Last 24 Hours)                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Consent Coverage     Audit Completeness    Policy Violations       │   │
│  │  ████████████░ 94.8%  ██████████████ 99.9%  ░░░░░░░░░░░░░░ 0        │   │
│  │                                                                     │   │
│  │  BTG Events           DSR Backlog           Encryption Status       │   │
│  │  ███░░░░░░░░░ 15      ██░░░░░░░░░░ 12       ██████████████ 100%     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  DATA SUBJECT REQUESTS                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Type           │ Pending │ Avg Age │  SLA    │ Overdue             │   │
│  │  ───────────────┼─────────┼─────────┼─────────┼─────────            │   │
│  │  Access         │    5    │  8 days │ 30 days │    0                │   │
│  │  Rectification  │    3    │ 12 days │ 30 days │    0                │   │
│  │  Erasure        │    2    │ 15 days │ 30 days │    1                │   │
│  │  Portability    │    2    │  5 days │ 30 days │    0                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  BREAK-THE-GLASS ACTIVITY                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Date/Time          │ Clinician      │ Patient    │ Status          │   │
│  │  ───────────────────┼────────────────┼────────────┼─────────        │   │
│  │  2025-01-23 10:30   │ Dr. Smith      │ Pt. 12345  │ ⚠ PENDING      │   │
│  │  2025-01-23 08:15   │ Dr. Johnson    │ Pt. 67890  │ ⚠ PENDING      │   │
│  │  2025-01-22 22:45   │ Dr. Williams   │ Pt. 11111  │ ✓ APPROVED     │   │
│  │  2025-01-22 14:20   │ Dr. Brown      │ Pt. 22222  │ ✓ APPROVED     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Audit Trail Explorer

```
AUDIT TRAIL EXPLORER:

FILTERS:
  Patient: [Patient/123____________]
  Actor:   [_____________________]
  Action:  [All Actions       ▼]
  Date:    [2025-01-01] to [2025-01-23]

RESULTS (showing 1-20 of 1,234):

┌───────────────────────────────────────────────────────────────────────────┐
│ Timestamp           │ Actor          │ Action │ Resource          │ Result │
├───────────────────────────────────────────────────────────────────────────┤
│ 2025-01-23 10:30:00 │ Dr. Smith      │ READ   │ DiagnosticReport  │ ✓      │
│ 2025-01-23 10:28:15 │ Dr. Smith      │ READ   │ MedicationRequest │ ✓      │
│ 2025-01-23 09:45:00 │ Nurse Johnson  │ WRITE  │ Observation       │ ✓      │
│ 2025-01-23 09:30:22 │ Lab System     │ WRITE  │ DiagnosticReport  │ ✓      │
│ 2025-01-22 16:00:00 │ Dr. Williams   │ READ   │ Patient           │ ✓ BTG  │
│ 2025-01-22 14:30:00 │ Billing Staff  │ READ   │ Claim             │ ✓      │
│ 2025-01-22 11:15:00 │ Research App   │ READ   │ Observation       │ ✗ DENY │
└───────────────────────────────────────────────────────────────────────────┘

[Export CSV] [Export FHIR AuditEvent] [Print Report]
```
