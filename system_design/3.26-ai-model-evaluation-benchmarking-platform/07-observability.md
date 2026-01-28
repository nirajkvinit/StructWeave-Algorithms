# Observability

## Overview

This section covers the observability of the evaluation platform itself ("meta-observability"), not the AI models being evaluated. Effective observability ensures the platform operates reliably and surfaces issues before they impact customers.

---

## Core Metrics

### RED Method (Request-Oriented)

| Service | Rate | Errors | Duration |
|---------|------|--------|----------|
| Evaluation API | `eval_api_requests_total` | `eval_api_errors_total` | `eval_api_latency_seconds` |
| Sync Workers | `eval_sync_evaluations_total` | `eval_sync_errors_total` | `eval_sync_latency_seconds` |
| Async Workers | `eval_async_evaluations_total` | `eval_async_errors_total` | `eval_async_latency_seconds` |
| Benchmark Runner | `eval_benchmark_tasks_total` | `eval_benchmark_errors_total` | `eval_benchmark_duration_seconds` |
| Annotation Service | `eval_annotations_total` | `eval_annotation_errors_total` | `eval_annotation_latency_seconds` |

### USE Method (Resource-Oriented)

| Resource | Utilization | Saturation | Errors |
|----------|-------------|------------|--------|
| CPU | `container_cpu_usage_seconds_total` | `container_cpu_throttled_seconds_total` | N/A |
| Memory | `container_memory_usage_bytes` | `container_memory_working_set_bytes` | OOM events |
| Disk | `node_filesystem_size_bytes - node_filesystem_free_bytes` | IOPS limit | `node_disk_io_time_seconds_total` |
| Network | `container_network_receive_bytes_total` | Queue depth | Packet drops |

### Business Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `eval_evaluations_by_org_total` | Counter | Evaluations per organization |
| `eval_llm_tokens_total` | Counter | LLM tokens consumed |
| `eval_llm_cost_usd_total` | Counter | LLM API costs |
| `eval_annotations_per_task_total` | Counter | Annotations completed |
| `eval_benchmark_runs_total` | Counter | Benchmark runs completed |
| `eval_experiments_active` | Gauge | Active A/B experiments |

---

## Metrics Definitions

### Evaluation Metrics

```yaml
# Evaluation throughput and latency
eval_evaluations_total:
  type: counter
  labels: [org_id, evaluation_type, evaluator_type, status]
  description: "Total evaluations processed"

eval_evaluation_latency_seconds:
  type: histogram
  labels: [org_id, evaluation_type, evaluator_type]
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  description: "Evaluation processing time"

eval_evaluation_scores:
  type: histogram
  labels: [org_id, metric_name]
  buckets: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
  description: "Distribution of evaluation scores"

# Queue metrics
eval_queue_depth:
  type: gauge
  labels: [queue_name]
  description: "Number of items in evaluation queue"

eval_queue_latency_seconds:
  type: histogram
  labels: [queue_name]
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300]
  description: "Time spent in queue before processing"
```

### LLM API Metrics

```yaml
# LLM API calls
eval_llm_api_calls_total:
  type: counter
  labels: [provider, model, status, error_type]
  description: "Total LLM API calls"

eval_llm_api_latency_seconds:
  type: histogram
  labels: [provider, model]
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30]
  description: "LLM API response time"

eval_llm_tokens_input_total:
  type: counter
  labels: [org_id, provider, model]
  description: "Total input tokens sent to LLM"

eval_llm_tokens_output_total:
  type: counter
  labels: [org_id, provider, model]
  description: "Total output tokens received from LLM"

eval_llm_cost_usd_total:
  type: counter
  labels: [org_id, provider, model]
  description: "Total LLM API costs in USD"

eval_llm_rate_limit_hits_total:
  type: counter
  labels: [provider, model]
  description: "Rate limit errors from LLM providers"
```

### Benchmark Metrics

```yaml
eval_benchmark_runs_total:
  type: counter
  labels: [org_id, suite_name, status]
  description: "Total benchmark runs"

eval_benchmark_run_duration_seconds:
  type: histogram
  labels: [suite_name]
  buckets: [60, 300, 600, 1800, 3600, 7200]
  description: "Benchmark run duration"

eval_benchmark_tasks_active:
  type: gauge
  labels: [suite_name]
  description: "Currently running benchmark tasks"

eval_benchmark_task_errors_total:
  type: counter
  labels: [suite_name, task_name, error_type]
  description: "Benchmark task failures"
```

### Annotation Metrics

```yaml
eval_annotation_tasks_active:
  type: gauge
  labels: [org_id]
  description: "Active annotation tasks"

eval_annotation_items_pending:
  type: gauge
  labels: [task_id]
  description: "Items awaiting annotation"

eval_annotations_submitted_total:
  type: counter
  labels: [org_id, task_id, annotator_id]
  description: "Annotations submitted"

eval_annotation_time_seconds:
  type: histogram
  labels: [task_id]
  buckets: [5, 10, 30, 60, 120, 300]
  description: "Time spent per annotation"

eval_annotation_agreement_score:
  type: gauge
  labels: [task_id]
  description: "Current inter-annotator agreement (Krippendorff's Alpha)"
```

### Database Metrics

```yaml
# PostgreSQL
eval_pg_connections_active:
  type: gauge
  labels: [database]
  description: "Active database connections"

eval_pg_query_latency_seconds:
  type: histogram
  labels: [query_type]
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
  description: "Database query latency"

# ClickHouse
eval_ch_insert_rows_total:
  type: counter
  labels: [table]
  description: "Rows inserted to ClickHouse"

eval_ch_query_duration_seconds:
  type: histogram
  labels: [query_type]
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10]
  description: "ClickHouse query duration"

eval_ch_storage_bytes:
  type: gauge
  labels: [table]
  description: "ClickHouse table storage size"
```

---

## Dashboards

### 1. Platform Health Dashboard

**Purpose:** Overall system health at a glance

```
┌─────────────────────────────────────────────────────────────────┐
│ PLATFORM HEALTH                                          [24h] │
├──────────────────┬──────────────────┬──────────────────────────┤
│ Evaluations/min  │ Error Rate       │ P99 Latency              │
│ ████████ 15,234  │ ░░░░░ 0.05%     │ ███░░ 1.2s              │
├──────────────────┴──────────────────┴──────────────────────────┤
│ Evaluation Throughput (24h)                                     │
│ ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅      │
├─────────────────────────────────────────────────────────────────┤
│ Active Components                                               │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│ │API: ✓   │ │Workers: │ │Kafka: ✓ │ │PG: ✓    │ │CH: ✓    │  │
│ │10 pods  │ │50 pods  │ │3 nodes  │ │Primary  │ │4 shards │  │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ Queue Depths                          │ LLM Provider Health     │
│ Sync:  ░░░░░░░░░░ 45                 │ OpenAI:     ✓ 99.9%    │
│ Async: ████░░░░░░ 2,341              │ Anthropic:  ✓ 99.8%    │
│ Batch: ██░░░░░░░░ 156                │ Self-hosted: ✓ 100%    │
└─────────────────────────────────────────────────────────────────┘
```

**Panels:**
- Evaluations per minute (timeseries)
- Error rate by type (timeseries)
- P50/P95/P99 latency (timeseries)
- Queue depths (gauge)
- Active pods/workers (gauge)
- LLM provider status (status map)

### 2. Cost Tracking Dashboard

**Purpose:** Monitor and optimize LLM costs

```
┌─────────────────────────────────────────────────────────────────┐
│ LLM COST TRACKING                                        [7d]  │
├──────────────────┬──────────────────┬──────────────────────────┤
│ Today's Cost     │ MTD Cost         │ Projected Monthly        │
│ $1,247           │ $28,456          │ $45,000                  │
├──────────────────┴──────────────────┴──────────────────────────┤
│ Cost by Provider (7d)                                           │
│ OpenAI     ████████████████████░░░░░░░░░░  $18,234 (64%)       │
│ Anthropic  ████████░░░░░░░░░░░░░░░░░░░░░░  $7,891  (28%)       │
│ Self-hosted ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░  $2,331  (8%)        │
├─────────────────────────────────────────────────────────────────┤
│ Cost by Model                        │ Cost by Organization      │
│ gpt-4o:      $12,456                │ org_acme:    $8,234       │
│ gpt-4o-mini: $5,234                 │ org_beta:    $6,123       │
│ claude-3:    $7,891                 │ org_gamma:   $4,567       │
│ llama-3:     $2,331                 │ others:      $9,532       │
├─────────────────────────────────────────────────────────────────┤
│ Tokens by Tier                                                  │
│ Tier 1 (Programmatic): 100M tokens, $100                       │
│ Tier 2 (Fast LLM):     10M tokens,  $500                       │
│ Tier 3 (Full Judge):   1M tokens,   $647                       │
└─────────────────────────────────────────────────────────────────┘
```

**Panels:**
- Daily/MTD/projected costs (stat)
- Cost by provider (pie chart)
- Cost by organization (table)
- Cost trend over time (timeseries)
- Token usage by tier (bar chart)
- Cost per evaluation trend (timeseries)

### 3. Benchmark Leaderboard Dashboard

**Purpose:** Compare model performance across benchmarks

```
┌─────────────────────────────────────────────────────────────────┐
│ BENCHMARK LEADERBOARD                                    [30d] │
├─────────────────────────────────────────────────────────────────┤
│ Overall Ranking                                                 │
│ ┌────┬───────────────┬───────┬───────┬───────┬───────┬───────┐│
│ │Rank│ Model         │ MMLU  │HmnEval│HellaS│ GSM8K │ Avg   ││
│ ├────┼───────────────┼───────┼───────┼───────┼───────┼───────┤│
│ │ 1  │ gpt-4o        │ 88.7% │ 92.1% │ 95.3% │ 94.2% │ 92.6% ││
│ │ 2  │ claude-3-opus │ 87.2% │ 89.4% │ 94.8% │ 93.1% │ 91.1% ││
│ │ 3  │ gpt-4o-mini   │ 82.1% │ 85.3% │ 92.1% │ 88.7% │ 87.1% ││
│ │ 4  │ llama-3-70b   │ 79.8% │ 81.2% │ 89.6% │ 84.3% │ 83.7% ││
│ └────┴───────────────┴───────┴───────┴───────┴───────┴───────┘│
├─────────────────────────────────────────────────────────────────┤
│ MMLU Breakdown by Category                                      │
│ STEM:        ████████████░░ 85%                                │
│ Humanities:  █████████████░ 89%                                │
│ Social Sci:  ██████████████ 91%                                │
│ Other:       ███████████░░░ 83%                                │
├─────────────────────────────────────────────────────────────────┤
│ Recent Runs                                                     │
│ 2h ago  │ org_acme  │ gpt-4o     │ MMLU      │ 88.7% │ ✓      │
│ 4h ago  │ org_beta  │ claude-3   │ HumanEval │ 89.4% │ ✓      │
│ 6h ago  │ org_gamma │ llama-3    │ Full      │ 83.7% │ ✓      │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Annotation Pipeline Dashboard

**Purpose:** Monitor human annotation workflows

```
┌─────────────────────────────────────────────────────────────────┐
│ ANNOTATION PIPELINE                                      [24h] │
├──────────────────┬──────────────────┬──────────────────────────┤
│ Items Pending    │ Completed Today  │ Avg Time/Item            │
│ 3,456            │ 8,234            │ 45s                      │
├──────────────────┴──────────────────┴──────────────────────────┤
│ Task Progress                                                   │
│ task_quality_eval   ████████████░░░░░░░░  234/400  58%        │
│ task_safety_review  ██████████████████░░  890/1000 89%        │
│ task_rag_ground     ████░░░░░░░░░░░░░░░░  123/500  25%        │
├─────────────────────────────────────────────────────────────────┤
│ Annotator Performance                                           │
│ ┌────────────┬──────────┬───────────┬────────────┬───────────┐│
│ │ Annotator  │ Items    │ Avg Time  │ Agreement  │ Quality   ││
│ ├────────────┼──────────┼───────────┼────────────┼───────────┤│
│ │ ann_001    │ 234      │ 38s       │ 0.89       │ ★★★★★     ││
│ │ ann_002    │ 198      │ 45s       │ 0.85       │ ★★★★☆     ││
│ │ ann_003    │ 156      │ 52s       │ 0.78       │ ★★★☆☆     ││
│ └────────────┴──────────┴───────────┴────────────┴───────────┘│
├─────────────────────────────────────────────────────────────────┤
│ Agreement Trend (Krippendorff's Alpha)                          │
│ ▁▂▃▄▅▆▇█▇▆▅▄▃▄▅▆▇█▇▆▅▆▇█▇▆▅▆▇██▇▆▅▆▇█  Current: 0.82        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Distributed Tracing

### Trace Structure

```
Trace: eval_request_abc123
│
├─ Span: api.receive_request (2ms)
│   ├─ Attributes: org_id, evaluation_type, metrics_requested
│   └─ Events: request_validated
│
├─ Span: auth.validate_token (5ms)
│   ├─ Attributes: token_type, permissions
│   └─ Events: token_valid
│
├─ Span: cache.check (3ms)
│   ├─ Attributes: cache_key, hit
│   └─ Events: cache_miss
│
├─ Span: queue.enqueue (10ms)
│   ├─ Attributes: queue_name, position
│   └─ Events: enqueued
│
├─ Span: worker.process (1200ms)
│   │
│   ├─ Span: evaluator.programmatic (25ms)
│   │   ├─ Attributes: metrics=[bleu, rouge, bertscore]
│   │   └─ Events: scores_computed
│   │
│   ├─ Span: evaluator.llm_judge (1100ms)
│   │   │
│   │   ├─ Span: llm.api_call (1050ms)
│   │   │   ├─ Attributes: provider=openai, model=gpt-4o-mini
│   │   │   ├─ Attributes: input_tokens=450, output_tokens=200
│   │   │   └─ Events: response_received
│   │   │
│   │   └─ Span: llm.parse_response (30ms)
│   │       └─ Events: scores_extracted
│   │
│   └─ Span: storage.write (50ms)
│       ├─ Attributes: table=evaluation_results
│       └─ Events: row_inserted
│
└─ Span: api.send_response (5ms)
    └─ Events: response_sent
```

### Key Spans to Instrument

| Span | Critical Info | Alerts |
|------|---------------|--------|
| `api.receive_request` | org_id, eval_type | Error rate > 5% |
| `auth.validate_token` | auth_method, valid | Failure rate > 1% |
| `evaluator.llm_judge` | provider, model, tokens | Latency > 5s |
| `llm.api_call` | status_code, error_type | 429 errors, timeouts |
| `storage.write` | table, row_count | Latency > 100ms |
| `benchmark.task` | suite, task_name | Duration > 5min |

### Trace Sampling Strategy

```yaml
# Adaptive sampling based on outcome and latency
sampling:
  default_rate: 0.1  # 10% baseline

  rules:
    # Always sample errors
    - condition: "status_code >= 400"
      rate: 1.0

    # Always sample slow requests
    - condition: "duration > 5s"
      rate: 1.0

    # Sample more of expensive operations
    - condition: "span.name contains 'llm.api_call'"
      rate: 0.5

    # Sample less of health checks
    - condition: "http.target == '/health'"
      rate: 0.01

  # Tail-based sampling for complete traces
  tail_sampling:
    enabled: true
    decision_wait: 10s
    policies:
      - error_traces
      - slow_traces
      - random_sample
```

---

## Logging

### Log Levels and Usage

| Level | Usage | Examples |
|-------|-------|----------|
| ERROR | Unexpected failures requiring attention | LLM API errors, DB connection failures |
| WARN | Degraded operation, non-critical issues | Rate limits hit, fallback activated |
| INFO | Significant business events | Evaluation completed, benchmark started |
| DEBUG | Detailed operational info | Cache hits, queue depths |

### Structured Logging Format

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "service": "evaluation-worker",
  "trace_id": "abc123def456",
  "span_id": "789ghi",
  "message": "Evaluation completed",
  "attributes": {
    "org_id": "org_acme",
    "run_id": "run_xyz",
    "evaluation_type": "llm_judge",
    "duration_ms": 1234,
    "scores": {
      "faithfulness": 0.85,
      "relevance": 0.92
    },
    "llm_provider": "openai",
    "llm_model": "gpt-4o-mini",
    "tokens_used": 650,
    "cost_usd": 0.0005
  }
}
```

### Log Aggregation

```yaml
# Log pipeline configuration
logging:
  collection:
    agent: fluent-bit
    buffer: 10MB
    flush_interval: 5s

  processing:
    - parser: json
    - enricher: kubernetes_metadata
    - filter: drop_health_checks
    - sampler: rate_limit_debug_logs

  storage:
    backend: elasticsearch
    index_pattern: "eval-logs-{date}"
    retention: 30d

  alerts:
    - name: error_spike
      condition: "count(level='ERROR') > 100 in 5m"
      action: page_oncall
```

---

## Alerting

### Alert Definitions

```yaml
alerts:
  # Availability
  - name: EvaluationAPIDown
    condition: up{job="evaluation-api"} == 0
    for: 1m
    severity: critical
    runbook: "runbooks/api-down.md"

  - name: EvaluationAPIHighErrorRate
    condition: |
      sum(rate(eval_api_errors_total[5m])) /
      sum(rate(eval_api_requests_total[5m])) > 0.05
    for: 5m
    severity: critical
    runbook: "runbooks/high-error-rate.md"

  # Latency
  - name: EvaluationLatencyHigh
    condition: |
      histogram_quantile(0.99, rate(eval_evaluation_latency_seconds_bucket[5m])) > 5
    for: 10m
    severity: warning
    runbook: "runbooks/high-latency.md"

  # Queue Health
  - name: EvaluationQueueBacklog
    condition: eval_queue_depth{queue_name="async"} > 10000
    for: 15m
    severity: warning
    runbook: "runbooks/queue-backlog.md"

  # LLM Provider
  - name: LLMProviderErrors
    condition: |
      sum(rate(eval_llm_api_calls_total{status="error"}[5m])) > 10
    for: 5m
    severity: warning
    runbook: "runbooks/llm-provider-issues.md"

  - name: LLMRateLimitExceeded
    condition: |
      sum(rate(eval_llm_rate_limit_hits_total[5m])) > 5
    for: 5m
    severity: warning
    runbook: "runbooks/rate-limit.md"

  # Cost
  - name: UnexpectedCostSpike
    condition: |
      sum(increase(eval_llm_cost_usd_total[1h])) > 1000
    for: 0m
    severity: warning
    runbook: "runbooks/cost-spike.md"

  # Database
  - name: DatabaseConnectionPoolExhausted
    condition: eval_pg_connections_active > 450
    for: 5m
    severity: critical
    runbook: "runbooks/db-connections.md"

  - name: ClickHouseStorageHigh
    condition: |
      eval_ch_storage_bytes / 1e12 > 40  # > 40TB
    for: 1h
    severity: warning
    runbook: "runbooks/storage-capacity.md"

  # Annotation
  - name: AnnotationQueueStale
    condition: |
      max(eval_annotation_items_pending) > 1000
      and rate(eval_annotations_submitted_total[1h]) < 10
    for: 2h
    severity: warning
    runbook: "runbooks/annotation-stale.md"

  - name: AnnotationAgreementLow
    condition: eval_annotation_agreement_score < 0.6
    for: 1h
    severity: warning
    runbook: "runbooks/low-agreement.md"
```

### Alert Severity Levels

| Severity | Response | Notification | Example |
|----------|----------|--------------|---------|
| Critical | Immediate (< 15 min) | Page on-call | API down, data loss risk |
| Warning | Business hours | Slack channel | High latency, queue backlog |
| Info | Next business day | Email digest | Approaching limits |

### On-Call Runbooks

Each alert links to a runbook with:
1. Alert description and impact
2. Diagnostic steps
3. Mitigation actions
4. Escalation path
5. Post-incident follow-up

---

## Health Checks

### Endpoint Definitions

```yaml
# Liveness: Is the process alive?
/health/live:
  checks:
    - process_running
  timeout: 1s
  failure_threshold: 3

# Readiness: Can the service handle requests?
/health/ready:
  checks:
    - database_connection
    - cache_connection
    - queue_connection
  timeout: 5s
  failure_threshold: 1

# Deep health: Full dependency check
/health/deep:
  checks:
    - database_connection
    - database_query_latency
    - cache_connection
    - queue_connection
    - llm_provider_reachable
    - storage_accessible
  timeout: 30s
  cache: 60s
```

### Health Check Implementation

```
FUNCTION health_check_deep():
    results = {}
    overall_healthy = true

    // Database
    TRY:
        start = NOW()
        POSTGRES.query("SELECT 1")
        results.database = {
            healthy: true,
            latency_ms: (NOW() - start) * 1000
        }
    CATCH:
        results.database = {healthy: false, error: str(e)}
        overall_healthy = false

    // Cache
    TRY:
        REDIS.ping()
        results.cache = {healthy: true}
    CATCH:
        results.cache = {healthy: false, error: str(e)}
        overall_healthy = false

    // LLM Provider (optional - don't fail if down)
    TRY:
        response = HTTP_GET("https://api.openai.com/v1/models", timeout=5s)
        results.llm_provider = {
            healthy: response.status == 200,
            provider: "openai"
        }
    CATCH:
        results.llm_provider = {healthy: false, error: str(e)}
        // Don't set overall_healthy = false (graceful degradation)

    RETURN {
        status: "healthy" IF overall_healthy ELSE "unhealthy",
        checks: results,
        timestamp: NOW()
    }
```
