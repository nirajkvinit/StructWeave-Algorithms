# Observability

[Back to Index](./00-index.md)

---

## Overview

The AI Native Cloud ERP requires comprehensive observability across three distinct domains:
1. **Traditional ERP Operations** - Transactions, API performance, database health
2. **AI/ML Infrastructure** - GPU utilization, inference latency, model performance
3. **Compliance & Security** - Audit trails, access patterns, anomaly detection

This document covers metrics, logging, tracing, and alerting strategies for all domains.

---

## Metrics

### USE/RED Methodology

```
USE METHOD (Infrastructure):

Utilization - How busy is the resource?
├── CPU utilization per service
├── Memory utilization per service
├── GPU utilization per node
├── Disk I/O utilization
└── Network bandwidth utilization

Saturation - How much work is queued?
├── Request queue depth (API gateway)
├── Inference queue depth (GPU cluster)
├── Database connection pool saturation
├── Event store consumer lag
└── Thread pool saturation

Errors - What is failing?
├── HTTP error rates (4xx, 5xx)
├── Database errors
├── GPU errors (OOM, timeout)
├── Agent execution failures
└── Integration failures


RED METHOD (Application):

Rate - Requests per second
├── API request rate (by endpoint)
├── Transaction rate (by type)
├── AI inference rate
├── Agent action rate
└── Report generation rate

Errors - Failed request rate
├── API error rate (by endpoint)
├── Transaction failure rate
├── AI inference failure rate
├── Agent action failure rate
└── Integration error rate

Duration - Request latency
├── API latency (p50, p95, p99)
├── Transaction latency
├── AI inference latency
├── Agent execution time
└── Report generation time
```

### ERP-Specific Metrics

```
FINANCE MODULE METRICS:

Transaction Metrics:
├── journal_entries_created_total{company, status}
├── journal_entries_posted_total{company}
├── invoices_processed_total{company, source}
├── payments_processed_total{company, method}
└── reconciliation_matches_total{company}

Business Metrics:
├── ar_aging_days{company, bucket}  # 0-30, 31-60, 61-90, 90+
├── ap_aging_days{company, bucket}
├── open_invoices_amount{company, currency}
├── pending_approvals_count{company, type}
└── period_close_status{company, period}

HR MODULE METRICS:

├── employees_active_count{company}
├── payroll_runs_processed_total{company}
├── payroll_errors_total{company, error_type}
├── time_entries_submitted_total{company}
└── expense_reports_pending_count{company}

AI MODULE METRICS:

Inference Metrics:
├── ai_inference_requests_total{model, tenant_tier}
├── ai_inference_duration_seconds{model, quantile}
├── ai_tokens_processed_total{direction}  # input/output
├── ai_cache_hits_total{cache_type}  # prompt_cache, result_cache
└── ai_queue_depth{priority}

Agent Metrics:
├── agent_actions_total{agent_type, action_type, status}
├── agent_execution_duration_seconds{agent_type, quantile}
├── agent_governance_blocks_total{agent_type, rule}
├── agent_human_escalations_total{agent_type}
└── agent_memory_usage_bytes{agent_type}

Document Processing:
├── documents_processed_total{type, status}
├── document_extraction_confidence{type, quantile}
├── documents_requiring_review_total{type}
└── document_processing_duration_seconds{type, quantile}
```

### GPU Cluster Metrics

```
GPU METRICS (NVIDIA DCGM):

Per-GPU Metrics:
├── dcgm_gpu_utilization{gpu_id, node}
├── dcgm_memory_used_bytes{gpu_id, node}
├── dcgm_memory_total_bytes{gpu_id, node}
├── dcgm_temperature_celsius{gpu_id, node}
├── dcgm_power_usage_watts{gpu_id, node}
├── dcgm_sm_clock_mhz{gpu_id, node}
└── dcgm_pcie_tx_bytes{gpu_id, node}

vLLM Metrics:
├── vllm_num_requests_running{model}
├── vllm_num_requests_waiting{model}
├── vllm_gpu_cache_usage_percent{model}
├── vllm_cpu_cache_usage_percent{model}
├── vllm_tokens_per_second{model}
├── vllm_time_to_first_token_seconds{model, quantile}
└── vllm_time_per_output_token_seconds{model, quantile}

Cluster Metrics:
├── gpu_cluster_nodes_healthy{region}
├── gpu_cluster_capacity_utilization{region}
├── gpu_cluster_pending_requests{region}
└── gpu_cluster_model_load_time_seconds{model}
```

### Tenant Metrics

```
PER-TENANT METRICS:

Usage Metrics:
├── tenant_active_users{tenant_id, tier}
├── tenant_api_requests_total{tenant_id}
├── tenant_ai_requests_total{tenant_id}
├── tenant_storage_bytes{tenant_id}
└── tenant_documents_count{tenant_id}

Health Metrics:
├── tenant_error_rate{tenant_id}
├── tenant_latency_p99{tenant_id}
├── tenant_ai_latency_p99{tenant_id}
└── tenant_quota_usage_percent{tenant_id, quota_type}

CARDINALITY MANAGEMENT:

// High-cardinality tenant_id handled via:
// 1. Separate tenant-scoped TSDB partitions
// 2. Aggregation for global dashboards
// 3. Detailed metrics retained for 7 days
// 4. Aggregated metrics retained for 1 year

FUNCTION record_tenant_metric(metric_name, value, tenant_id):
    // Store detailed metric
    detailed_tsdb.record(metric_name, value, {"tenant_id": tenant_id})

    // Also record aggregated by tier
    tier = get_tenant_tier(tenant_id)
    aggregated_tsdb.record(metric_name, value, {"tier": tier})
```

---

## Logging

### Structured Logging Format

```
LOG SCHEMA:

{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "INFO",
  "service": "finance-service",
  "instance": "finance-service-abc123",
  "region": "us-east-1",

  // Request context
  "trace_id": "abc123def456",
  "span_id": "span789",
  "request_id": "req-uuid",

  // Tenant context
  "tenant_id": "tenant-uuid",  // For filtering
  "user_id": "user-hash",      // Hashed for privacy

  // Event details
  "event": "invoice_created",
  "category": "transaction",

  // Structured data (varies by event)
  "data": {
    "invoice_id": "inv-uuid",
    "amount_bucket": "$1K-$5K",  // Bucketed for privacy
    "vendor_id": "vendor-uuid",
    "source": "ai_extraction"
  },

  // Performance
  "duration_ms": 45,

  // Error details (if applicable)
  "error": {
    "type": "ValidationError",
    "message": "Invalid account number",
    "code": "INVALID_ACCOUNT"
  }
}
```

### Log Levels and Guidelines

```
LOG LEVEL GUIDELINES:

ERROR:
├── Unhandled exceptions
├── Failed transactions that impact users
├── Service unavailability
├── Data integrity issues
└── Security violations

WARN:
├── Degraded performance (>2x normal latency)
├── Retried operations (before success)
├── Approaching resource limits (>80%)
├── Deprecated API usage
└── Non-critical validation failures

INFO:
├── Transaction lifecycle events (created, posted)
├── User authentication events
├── Configuration changes
├── Scheduled job execution
└── Integration sync events

DEBUG:
├── Detailed request/response data (in non-prod)
├── Cache hit/miss details
├── Query execution details
└── AI inference details

TRACE:
├── Method entry/exit
├── Loop iterations
├── Internal state changes
└── Only in development
```

### Audit Logging

```
AUDIT LOG SCHEMA:

{
  "id": "uuid",
  "timestamp": "2025-01-15T10:30:45.123Z",
  "tenant_id": "tenant-uuid",

  // Actor
  "actor": {
    "type": "user",           // user, agent, system
    "id": "user-uuid",
    "ip_address": "192.168.1.x",  // Truncated
    "user_agent": "Mozilla/5.0...",
    "session_id": "session-uuid"
  },

  // Action
  "action": "update",         // create, read, update, delete
  "resource_type": "invoice",
  "resource_id": "invoice-uuid",

  // Changes
  "before": {
    "status": "draft",
    "amount": "[REDACTED]"    // Sensitive fields redacted
  },
  "after": {
    "status": "approved",
    "amount": "[REDACTED]"
  },

  // Context
  "reason": "Approved by manager",
  "request_id": "req-uuid",
  "trace_id": "trace-uuid",

  // Integrity
  "chain_hash": "sha256...",  // Hash of previous + current
  "signature": "hmac..."      // HMAC signature
}

AUDIT LOG INTEGRITY:

FUNCTION write_audit_log(entry):
    // Get previous hash
    previous = get_last_audit_entry(entry.tenant_id)
    previous_hash = previous.chain_hash IF previous ELSE "GENESIS"

    // Compute chain hash
    entry.chain_hash = sha256(
        previous_hash +
        entry.id +
        entry.timestamp +
        json_serialize(entry)
    )

    // Sign for tamper detection
    entry.signature = hmac_sha256(
        audit_signing_key,
        entry.chain_hash
    )

    // Write to append-only store
    audit_store.append(entry)

    // Replicate to secondary storage
    backup_audit_store.append(entry)
```

### AI-Specific Logging

```
AI INFERENCE LOGGING:

{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "event": "ai_inference",
  "tenant_id": "tenant-uuid",
  "trace_id": "trace-uuid",

  // Request (sanitized)
  "request": {
    "model": "llama-70b",
    "adapter": "finance-v2",
    "input_tokens": 500,
    "prompt_hash": "sha256...",  // Hash for debugging, not content
    "temperature": 0.1
  },

  // Response (sanitized)
  "response": {
    "output_tokens": 200,
    "finish_reason": "stop",
    "response_hash": "sha256..."
  },

  // Performance
  "metrics": {
    "queue_time_ms": 50,
    "inference_time_ms": 1200,
    "time_to_first_token_ms": 150,
    "tokens_per_second": 150
  },

  // Cache
  "cache": {
    "prompt_cache_hit": true,
    "result_cache_hit": false
  },

  // GPU
  "gpu": {
    "node": "gpu-node-1",
    "gpu_id": 0,
    "memory_used_percent": 75
  }
}

AGENT ACTION LOGGING:

{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "event": "agent_action",
  "tenant_id": "tenant-uuid",
  "trace_id": "trace-uuid",

  // Agent
  "agent": {
    "id": "finance-agent",
    "version": "2.1.0",
    "session_id": "session-uuid"
  },

  // Action
  "action": {
    "type": "approve_invoice",
    "target_id": "invoice-uuid",
    "confidence": 0.95
  },

  // Decision
  "decision": {
    "outcome": "approved",
    "rationale": "Amount $1,234 within auto-approve threshold...",
    "governance_check": "passed"
  },

  // Performance
  "duration_ms": 2500,
  "llm_calls": 2,
  "tokens_used": 1500
}
```

---

## Distributed Tracing

### Trace Propagation

```
TRACE CONTEXT:

W3C Trace Context Headers:
├── traceparent: 00-{trace_id}-{span_id}-{flags}
├── tracestate: erp=tenant:abc123,priority:high
└── baggage: tenant_id=abc123,user_tier=enterprise

PROPAGATION ACROSS SERVICES:

User Request
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  API Gateway                                                │
│  trace_id: abc123, span_id: span_001                       │
│  └── Span: gateway.request                                 │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Finance Service                                            │
│  trace_id: abc123, span_id: span_002 (parent: span_001)    │
│  └── Span: finance.create_invoice                          │
│      ├── Span: finance.validate                            │
│      ├── Span: database.insert                             │
│      └── Span: event_store.publish                         │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  AI Platform (async)                                        │
│  trace_id: abc123, span_id: span_003                       │
│  └── Span: ai.document_extraction                          │
│      ├── Span: ai.ocr                                      │
│      ├── Span: ai.llm_inference                            │
│      └── Span: ai.confidence_scoring                       │
└─────────────────────────────────────────────────────────────┘
```

### Key Spans to Instrument

```
CRITICAL SPANS:

API Layer:
├── gateway.request (full request lifecycle)
├── gateway.authentication
├── gateway.rate_limiting
└── gateway.routing

ERP Services:
├── {service}.{operation} (e.g., finance.create_invoice)
├── validation.execute
├── workflow.check_approval
└── notification.send

Database:
├── database.query (with sanitized query hash)
├── database.transaction
└── database.connection_acquire

AI Platform:
├── ai.inference (full inference lifecycle)
├── ai.embedding
├── ai.vector_search
├── ai.rag_retrieval
├── ai.llm_generation
└── ai.agent_execution

Agent Specific:
├── agent.plan
├── agent.governance_check
├── agent.action_execute
├── agent.memory_update
└── agent.handoff

SPAN ATTRIBUTES:

{
  "trace_id": "abc123",
  "span_id": "span_002",
  "parent_span_id": "span_001",
  "operation_name": "finance.create_invoice",
  "service_name": "finance-service",
  "start_time": "2025-01-15T10:30:45.000Z",
  "end_time": "2025-01-15T10:30:45.050Z",
  "duration_ms": 50,
  "status": "OK",

  // Custom attributes
  "tenant_id": "tenant-uuid",
  "user_tier": "enterprise",
  "invoice_type": "vendor",
  "amount_bucket": "$1K-$5K",

  // Error (if applicable)
  "error": true,
  "error.type": "ValidationError",
  "error.message": "Invalid account"
}
```

### Sampling Strategy

```
SAMPLING CONFIGURATION:

Head-Based Sampling:
├── Default rate: 1% (10 traces per 1000 requests)
├── Enterprise tenant: 10%
├── Error traces: 100% (always sampled)
├── Slow traces (>5s): 100%
└── Admin operations: 100%

Tail-Based Sampling (Collector):
├── Error traces: Always keep
├── High latency (>p99): Always keep
├── AI failures: Always keep
├── Governance blocks: Always keep
└── Random sample of remaining: 1%

PSEUDOCODE:

FUNCTION should_sample(trace_context, span):
    // Always sample errors
    IF span.status == ERROR:
        RETURN TRUE

    // Always sample slow requests
    IF span.duration_ms > 5000:
        RETURN TRUE

    // Higher rate for enterprise
    IF trace_context.user_tier == "enterprise":
        RETURN random() < 0.10

    // Higher rate for AI operations
    IF span.operation_name.starts_with("ai."):
        RETURN random() < 0.05

    // Default sampling
    RETURN random() < 0.01
```

---

## Alerting

### Alert Tiers

```
P1 - PAGE IMMEDIATELY (24/7):
├── ERP core unavailable (any region)
├── Transaction failure rate > 5%
├── Database primary down
├── GPU cluster < 25% capacity
├── Security breach detected
├── Data integrity violation
└── Compliance SLA breach imminent

P2 - PAGE BUSINESS HOURS, SLACK 24/7:
├── API error rate > 1%
├── AI inference latency p99 > 5s
├── Agent failure rate > 10%
├── Database replication lag > 5 min
├── GPU utilization > 90% sustained
├── Certificate expiring < 7 days
└── Audit log verification failure

P3 - SLACK ONLY:
├── API latency degraded (>2x baseline)
├── AI queue depth > 100
├── Storage utilization > 80%
├── Non-critical integration failure
├── Report generation delayed
└── Scheduled job failure

P4 - TICKET:
├── Minor performance degradation
├── Non-critical warnings
├── Capacity planning triggers
└── Maintenance reminders
```

### Alert Definitions

```
CRITICAL ALERTS:

alert: ERPCoreUnavailable
expr: |
  (sum(up{job="finance-service"}) / count(up{job="finance-service"})) < 0.5
  OR
  (sum(up{job="hr-service"}) / count(up{job="hr-service"})) < 0.5
for: 2m
severity: P1
annotations:
  summary: "ERP core services unavailable"
  runbook: "https://runbooks.erp.internal/erp-unavailable"

alert: TransactionFailureRateHigh
expr: |
  (
    sum(rate(transactions_failed_total[5m]))
    /
    sum(rate(transactions_total[5m]))
  ) > 0.05
for: 5m
severity: P1
annotations:
  summary: "Transaction failure rate > 5%"
  runbook: "https://runbooks.erp.internal/transaction-failures"

alert: GPUClusterCritical
expr: |
  (
    sum(gpu_cluster_nodes_healthy{region="us-east"})
    /
    sum(gpu_cluster_nodes_total{region="us-east"})
  ) < 0.25
for: 5m
severity: P1
annotations:
  summary: "GPU cluster < 25% healthy nodes"
  runbook: "https://runbooks.erp.internal/gpu-cluster-critical"

AI-SPECIFIC ALERTS:

alert: AIInferenceLatencyHigh
expr: |
  histogram_quantile(0.99, rate(ai_inference_duration_seconds_bucket[5m])) > 5
for: 10m
severity: P2
annotations:
  summary: "AI inference p99 latency > 5s"
  runbook: "https://runbooks.erp.internal/ai-latency"

alert: AgentFailureRateHigh
expr: |
  (
    sum(rate(agent_actions_total{status="failed"}[10m]))
    /
    sum(rate(agent_actions_total[10m]))
  ) > 0.10
for: 10m
severity: P2
annotations:
  summary: "Agent failure rate > 10%"
  runbook: "https://runbooks.erp.internal/agent-failures"

alert: AIQueueBacklog
expr: |
  ai_queue_depth{priority="interactive"} > 100
for: 5m
severity: P3
annotations:
  summary: "AI inference queue backlog"
  runbook: "https://runbooks.erp.internal/ai-queue"

COMPLIANCE ALERTS:

alert: AuditLogIntegrityFailure
expr: |
  audit_log_verification_failures_total > 0
for: 0m  # Immediate
severity: P2
annotations:
  summary: "Audit log integrity verification failed"
  runbook: "https://runbooks.erp.internal/audit-integrity"

alert: PIIAccessAnomaly
expr: |
  (
    sum(rate(pii_access_total{user_id="$user"}[1h]))
    /
    avg_over_time(pii_access_rate_baseline{user_id="$user"}[7d])
  ) > 5
for: 0m
severity: P2
annotations:
  summary: "Unusual PII access pattern detected"
  runbook: "https://runbooks.erp.internal/pii-anomaly"
```

### Runbook Integration

```
RUNBOOK TEMPLATE:

# Alert: {ALERT_NAME}

## Summary
{What is happening and why it matters}

## Impact
- User impact: {description}
- Business impact: {description}
- SLA impact: {description}

## Detection
- Alert condition: {prometheus query}
- Threshold: {value}
- Duration: {time}

## Investigation Steps
1. Check dashboard: {link}
2. Check logs: {query}
3. Check traces: {query}
4. Check recent changes: {link}

## Mitigation Steps
1. {step 1}
2. {step 2}
3. {step 3}

## Escalation
- Primary: {team}
- Secondary: {team}
- Management: {contact}

## Post-Incident
- Create incident ticket
- Schedule post-mortem
- Update runbook if needed
```

---

## Dashboards

### Executive Dashboard

```
EXECUTIVE METRICS:

System Health:
├── Overall system status (green/yellow/red)
├── Availability (current month vs target)
├── Active users (DAU trend)
└── Transaction volume (trend)

Business Metrics:
├── Revenue processed (trend)
├── Invoices processed (trend)
├── AI adoption rate (% of actions via AI)
└── Agent efficiency (actions/hour)

Compliance:
├── Audit status (last verification)
├── Security incidents (count this month)
├── SLA compliance (%)
└── Data residency status
```

### Operations Dashboard

```
REAL-TIME OPERATIONS:

API Performance:
├── Request rate (last 5 min)
├── Error rate (last 5 min)
├── Latency p50/p95/p99
└── Top endpoints by traffic

Infrastructure:
├── Service health matrix
├── Database connections
├── GPU utilization
├── Queue depths

Active Issues:
├── Open alerts by severity
├── Recent deployments
├── Ongoing incidents
└── Maintenance windows
```

### AI Platform Dashboard

```
AI METRICS:

Inference:
├── Requests/second by model
├── Latency distribution (histogram)
├── Queue depth by priority
├── Cache hit rates

GPU Cluster:
├── Node health matrix
├── GPU utilization heatmap
├── Memory utilization
├── Temperature alerts

Agents:
├── Active agents
├── Actions/minute by type
├── Governance blocks/hour
├── Human escalations/hour

Model Performance:
├── Token throughput
├── Time to first token
├── Confidence score distribution
└── Human review rate
```

### Tenant Dashboard (Self-Service)

```
TENANT METRICS (Available to Customers):

Usage:
├── API requests (current period)
├── AI requests (current period)
├── Storage used
├── Active users

Performance:
├── Response time (their requests only)
├── Error rate (their requests only)
├── AI latency (their requests only)
└── Uptime (their experience)

Quotas:
├── API quota usage
├── AI quota usage
├── Storage quota usage
└── User limit

NOT Exposed:
├── Internal infrastructure metrics
├── Other tenant data
├── Security metrics
├── Cost/pricing details
```

---

## Log Aggregation Architecture

```
LOG PIPELINE:

┌─────────────────────────────────────────────────────────────┐
│  Applications                                               │
│  ├── Structured JSON logs to stdout                        │
│  └── Audit logs to separate stream                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Log Collector (Fluentd/Vector)                            │
│  ├── Parse and validate                                    │
│  ├── Add metadata (region, instance)                       │
│  ├── PII masking                                           │
│  └── Route by type                                         │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│  Operational Logs │ │   Audit Logs      │ │   SIEM            │
│  (Elasticsearch)  │ │   (Immutable)     │ │   (Security)      │
│                   │ │                   │ │                   │
│  Retention: 30d   │ │  Retention: 2y    │ │  Retention: 1y    │
│  Hot: 7d          │ │  Archive: 7y      │ │                   │
│  Warm: 30d        │ │                   │ │                   │
└───────────────────┘ └───────────────────┘ └───────────────────┘

LOG RETENTION POLICY:

| Log Type | Hot | Warm | Cold | Archive |
|----------|-----|------|------|---------|
| API logs | 7d | 30d | 90d | 1y |
| Audit logs | 90d | 1y | 2y | 7y |
| AI logs | 7d | 30d | - | - |
| Security logs | 30d | 1y | 2y | 7y |
| Debug logs | 1d | 7d | - | - |
```

---

## Next Steps

- [Interview Guide](./08-interview-guide.md) - 45-min pacing, trap questions, trade-offs
