# Observability

## Metrics Framework

### Core Metrics (USE/RED)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Metrics Framework Overview                        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ USE Metrics (Infrastructure)                                     ││
│  │                                                                  ││
│  │ Utilization:                                                     ││
│  │   • GPU utilization (inference cluster)                         ││
│  │   • CPU utilization (services)                                  ││
│  │   • Memory utilization                                          ││
│  │   • Network bandwidth                                           ││
│  │                                                                  ││
│  │ Saturation:                                                      ││
│  │   • Request queue depth                                         ││
│  │   • GPU memory pressure                                         ││
│  │   • Connection pool exhaustion                                  ││
│  │                                                                  ││
│  │ Errors:                                                          ││
│  │   • GPU OOM errors                                              ││
│  │   • Network timeouts                                            ││
│  │   • Disk I/O errors                                             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ RED Metrics (Services)                                           ││
│  │                                                                  ││
│  │ Rate:                                                            ││
│  │   • Completion requests per second                              ││
│  │   • Chat messages per second                                    ││
│  │   • Agent actions per second                                    ││
│  │                                                                  ││
│  │ Errors:                                                          ││
│  │   • Failed completions (5xx, timeouts)                          ││
│  │   • LLM provider errors                                         ││
│  │   • Context retrieval failures                                  ││
│  │                                                                  ││
│  │ Duration:                                                        ││
│  │   • End-to-end latency (p50, p95, p99)                          ││
│  │   • Inference latency                                           ││
│  │   • Context assembly time                                       ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Code Assistant Specific Metrics

```yaml
# Quality Metrics
quality_metrics:
  - name: completion_acceptance_rate
    description: "% of completions accepted by users"
    formula: accepted_completions / shown_completions
    target: ">30%"
    granularity: [user, language, completion_type, model]

  - name: completion_retention_rate
    description: "% of accepted completions kept after 30 seconds"
    formula: retained_completions / accepted_completions
    target: ">80%"
    granularity: [user, language]

  - name: accepted_characters
    description: "Average characters accepted per completion"
    formula: sum(accepted_chars) / count(accepted_completions)
    target: ">50 chars"
    granularity: [language, model]

  - name: suggestion_relevance_score
    description: "ML-based relevance prediction vs actual acceptance"
    formula: correlation(predicted_relevance, actual_accepted)
    target: ">0.7"

# Efficiency Metrics
efficiency_metrics:
  - name: cache_hit_rate
    description: "% of requests served from cache"
    formula: cache_hits / total_requests
    target: ">40%"
    breakdown: [l1_cache, l2_cache, semantic_cache, kv_cache]

  - name: tokens_per_completion
    description: "Average tokens generated per completion"
    formula: avg(completion_tokens)
    target: "<100 tokens"
    alert_threshold: ">200 tokens"

  - name: context_utilization
    description: "% of context window actually used"
    formula: avg(used_context_tokens / max_context_tokens)
    target: "60-80%"

  - name: model_routing_accuracy
    description: "% of requests routed to optimal model"
    formula: correct_routing / total_routing_decisions
    target: ">90%"

# Cost Metrics
cost_metrics:
  - name: cost_per_completion
    description: "Average cost per completion request"
    formula: total_inference_cost / total_completions
    breakdown: [model, completion_type]

  - name: cost_per_accepted_char
    description: "Cost efficiency - dollars per accepted character"
    formula: total_cost / sum(accepted_chars)
    target: "<$0.0001"

  - name: wasted_inference_cost
    description: "Cost of rejected/cancelled completions"
    formula: cost_of_rejected / total_cost
    target: "<30%"
```

### Latency Breakdown Metrics

```yaml
latency_components:
  - name: e2e_latency
    description: "Total request latency"
    percentiles: [p50, p75, p90, p95, p99]
    targets:
      p50: 150ms
      p99: 300ms

  - name: network_latency
    description: "Network round trip time"
    measurement: client_to_gateway_rtt

  - name: auth_latency
    description: "Authentication/authorization check"
    measurement: gateway_auth_time

  - name: context_assembly_latency
    description: "Context retrieval and assembly"
    sub_components:
      - symbol_lookup
      - semantic_search
      - token_budgeting
      - prompt_construction

  - name: inference_latency
    description: "LLM inference time"
    sub_components:
      - queue_wait
      - prefill_time
      - decode_time
      - speculative_overhead

  - name: post_processing_latency
    description: "Output validation and formatting"
    sub_components:
      - syntax_check
      - security_scan
      - ranking
```

---

## Distributed Tracing

### Trace Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Completion Request Trace                          │
│                                                                      │
│  trace_id: abc123                                                    │
│  user_id: user_456                                                   │
│  request_type: inline_completion                                     │
│                                                                      │
│  ├── [gateway] receive_request                    0ms ─────┐        │
│  │       └── auth.validate_token                  5ms      │        │
│  │       └── ratelimit.check                      2ms      │        │
│  │                                                         │        │
│  ├── [completion-svc] process_request            10ms ─────┼───┐    │
│  │       └── cache.check_exact                    1ms      │   │    │
│  │       └── cache.check_semantic                15ms      │   │    │
│  │                                                         │   │    │
│  ├── [context-svc] assemble_context              30ms ─────┼───┼──┐ │
│  │       └── parser.extract_prefix                5ms      │   │  │ │
│  │       └── symbol.resolve_imports              10ms      │   │  │ │
│  │       └── vector_db.semantic_search           25ms      │   │  │ │
│  │       └── retrieval.fusion                     5ms      │   │  │ │
│  │       └── tokenizer.budget_allocation          3ms      │   │  │ │
│  │                                                         │   │  │ │
│  ├── [inference-svc] generate                   100ms ─────┼───┼──┼─┤
│  │       └── router.select_model                  2ms      │   │  │ │
│  │       └── queue.wait                          10ms      │   │  │ │
│  │       └── llm.prefill                         30ms      │   │  │ │
│  │       └── llm.decode                          55ms      │   │  │ │
│  │       └── speculative.verify                   3ms      │   │  │ │
│  │                                                         │   │  │ │
│  ├── [completion-svc] post_process               15ms ─────┼───┼──┘ │
│  │       └── syntax.validate                      3ms      │   │    │
│  │       └── security.scan                        8ms      │   │    │
│  │       └── ranking.score                        4ms      │   │    │
│  │                                                         │   │    │
│  └── [gateway] send_response                      2ms ─────┴───┘    │
│                                                                      │
│  Total Duration: 175ms                                               │
│  Tokens: prompt=2048, completion=45                                  │
│  Model: gpt-4o-mini                                                  │
│  Cache: miss (semantic similarity: 0.82)                             │
│  Outcome: delivered                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Trace Sampling Strategy

```yaml
sampling_rules:
  # Always sample
  - name: errors
    condition: "status_code >= 500 OR error = true"
    sample_rate: 1.0

  - name: slow_requests
    condition: "duration_ms > 500"
    sample_rate: 1.0

  - name: security_events
    condition: "injection_detected = true OR security_scan_failed = true"
    sample_rate: 1.0

  # High-value sampling
  - name: agent_mode
    condition: "completion_type = 'agent'"
    sample_rate: 0.5

  - name: premium_users
    condition: "user_tier IN ('business', 'enterprise')"
    sample_rate: 0.1

  # Baseline sampling
  - name: default
    condition: "true"
    sample_rate: 0.01  # 1% of normal traffic

# Adaptive sampling
adaptive_sampling:
  enabled: true
  target_traces_per_minute: 10000
  adjust_interval: 60s
  min_sample_rate: 0.001
  max_sample_rate: 0.1
```

---

## Logging Strategy

### Log Levels and Content

```yaml
logging_config:
  levels:
    DEBUG:
      enabled: false  # Enable via feature flag
      content:
        - Token-level generation details
        - Cache key computations
        - Full prompt content (redacted)

    INFO:
      enabled: true
      content:
        - Request received/completed
        - Cache hit/miss
        - Model routing decision
        - Completion delivered

    WARN:
      enabled: true
      content:
        - High latency (>500ms)
        - Cache miss on expected hit
        - Rate limit approaching
        - Degraded mode activated

    ERROR:
      enabled: true
      content:
        - Request failures
        - LLM provider errors
        - Context retrieval failures
        - Security scan blocks

    CRITICAL:
      enabled: true
      content:
        - Service unavailable
        - Data corruption detected
        - Security breach indicators

  # Structured log format
  format:
    timestamp: iso8601
    level: string
    service: string
    trace_id: string
    span_id: string
    user_id: string (hashed)
    message: string
    attributes: object
```

### Privacy-Safe Logging

```
ALGORITHM: PrivacySafeLogging
INPUT:
  - log_entry: LogEntry
OUTPUT:
  - sanitized_entry: LogEntry

PROCEDURE:
  sanitized = copy(log_entry)

  // 1. Never log raw user code
  IF sanitized.contains("prompt") OR sanitized.contains("completion") THEN
    sanitized.prompt = "[REDACTED - " + length(prompt) + " chars]"
    sanitized.completion = "[REDACTED - " + length(completion) + " chars]"
  END IF

  // 2. Hash user identifiers
  sanitized.user_id = sha256(log_entry.user_id + salt)[:16]
  sanitized.ip_address = anonymize_ip(log_entry.ip_address)

  // 3. Remove potential PII from file paths
  IF sanitized.contains("file_path") THEN
    // Keep only relative path within workspace
    sanitized.file_path = relativize_path(log_entry.file_path)
    // Redact username from path
    sanitized.file_path = redact_username(sanitized.file_path)
  END IF

  // 4. Redact any detected secrets
  sanitized = redact_secrets(sanitized)

  RETURN sanitized
```

---

## Alerting Configuration

### Alert Definitions

```yaml
alerts:
  # Availability Alerts
  - name: high_error_rate
    severity: P1
    condition: |
      sum(rate(completion_errors_total[5m])) /
      sum(rate(completion_requests_total[5m])) > 0.01
    for: 2m
    annotations:
      summary: "Completion error rate above 1%"
      runbook: "https://runbooks/high-error-rate"

  - name: service_unavailable
    severity: P0
    condition: |
      up{job="completion-service"} == 0
    for: 1m
    annotations:
      summary: "Completion service is down"
      runbook: "https://runbooks/service-down"

  # Latency Alerts
  - name: high_p99_latency
    severity: P2
    condition: |
      histogram_quantile(0.99, rate(completion_latency_seconds_bucket[5m])) > 0.5
    for: 5m
    annotations:
      summary: "P99 latency exceeds 500ms"
      runbook: "https://runbooks/high-latency"

  - name: inference_queue_backed_up
    severity: P1
    condition: |
      inference_queue_depth > 1000
    for: 2m
    annotations:
      summary: "Inference queue depth critical"

  # Quality Alerts
  - name: low_acceptance_rate
    severity: P3
    condition: |
      sum(rate(completions_accepted[1h])) /
      sum(rate(completions_shown[1h])) < 0.25
    for: 1h
    annotations:
      summary: "Acceptance rate dropped below 25%"

  # Security Alerts
  - name: injection_attack_spike
    severity: P1
    condition: |
      sum(rate(prompt_injection_detected[5m])) > 100
    for: 1m
    annotations:
      summary: "Potential prompt injection attack"
      runbook: "https://runbooks/injection-attack"

  - name: sandbox_escape_attempt
    severity: P0
    condition: |
      sum(rate(agent_sandbox_violation[5m])) > 0
    for: 0m  # Immediate
    annotations:
      summary: "Agent sandbox escape attempt detected"

  # Cost Alerts
  - name: cost_anomaly
    severity: P2
    condition: |
      sum(rate(inference_cost_dollars[1h])) >
      avg_over_time(sum(rate(inference_cost_dollars[1h]))[7d:1h]) * 2
    for: 30m
    annotations:
      summary: "Inference costs 2x above weekly average"

# Alert routing
routing:
  P0:
    channels: [pagerduty_critical, slack_incidents]
    escalation: immediate
  P1:
    channels: [pagerduty, slack_incidents]
    escalation: 15m
  P2:
    channels: [slack_alerts]
    escalation: 1h
  P3:
    channels: [slack_alerts]
    escalation: next_business_day
```

---

## Dashboards

### Executive Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI Code Assistant - Executive View                │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Key Health Indicators                                            ││
│  │                                                                  ││
│  │  Service Health    Acceptance Rate    Daily Active Users        ││
│  │  ┌──────────┐     ┌──────────┐       ┌──────────┐              ││
│  │  │   99.9%  │     │   32.5%  │       │   1.2M   │              ││
│  │  │    ✓     │     │    ✓     │       │   ▲ 5%   │              ││
│  │  └──────────┘     └──────────┘       └──────────┘              ││
│  │                                                                  ││
│  │  P99 Latency      Daily Requests     Inference Cost             ││
│  │  ┌──────────┐     ┌──────────┐       ┌──────────┐              ││
│  │  │   245ms  │     │   450M   │       │  $125K   │              ││
│  │  │    ✓     │     │   ▲ 8%   │       │   ▲ 3%   │              ││
│  │  └──────────┘     └──────────┘       └──────────┘              ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Trends (7 days)                                                  ││
│  │                                                                  ││
│  │  Requests    ████████████████████████████████  450M/day        ││
│  │  Acceptance  ▂▃▄▅▅▆▆▆▆▆▇▇▇▇▇▇▇▇▇▇▇▇████████  32.5%            ││
│  │  Latency     ▇▇▆▆▅▅▄▄▄▃▃▃▃▃▃▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂  245ms            ││
│  │  Cost/Req    ▅▅▅▅▅▄▄▄▄▄▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃  $0.00028         ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Operations Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Operations Dashboard                              │
│                                                                      │
│  ┌────────────────────────┐  ┌────────────────────────────────────┐│
│  │ Request Rate (QPS)     │  │ Latency Distribution               ││
│  │                        │  │                                     ││
│  │     50K ┤      ╭──╮    │  │  p50: ███████████░░░░ 145ms        ││
│  │         │     ╭╯  ╰╮   │  │  p90: █████████████░░ 220ms        ││
│  │     40K ┤    ╭╯    ╰╮  │  │  p95: ██████████████░ 280ms        ││
│  │         │   ╭╯      ╰╮ │  │  p99: ███████████████ 320ms        ││
│  │     30K ┤──╯        ╰──│  │                                     ││
│  │         └──────────────│  │                                     ││
│  │         0  6  12  18 24│  │                                     ││
│  └────────────────────────┘  └────────────────────────────────────┘│
│                                                                      │
│  ┌────────────────────────┐  ┌────────────────────────────────────┐│
│  │ Error Breakdown        │  │ Model Usage                        ││
│  │                        │  │                                     ││
│  │ Timeout     ████░ 45%  │  │ gpt-4o-mini  ████████████░ 68%    ││
│  │ LLM Error   ██░░░ 25%  │  │ gpt-4o       █████░░░░░░░░ 22%    ││
│  │ Context     █░░░░ 15%  │  │ claude       ██░░░░░░░░░░░  8%    ││
│  │ Auth        ░░░░░  8%  │  │ self-hosted  █░░░░░░░░░░░░  2%    ││
│  │ Other       ░░░░░  7%  │  │                                     ││
│  └────────────────────────┘  └────────────────────────────────────┘│
│                                                                      │
│  ┌────────────────────────┐  ┌────────────────────────────────────┐│
│  │ Cache Performance      │  │ GPU Cluster Status                 ││
│  │                        │  │                                     ││
│  │ L1 (exact)   █░░░  5%  │  │ Region    Nodes  Util   Queue     ││
│  │ L2 (redis)   ████ 35%  │  │ us-west    120   78%    245       ││
│  │ L3 (semantic)██░░ 15%  │  │ us-east    100   82%    312       ││
│  │ KV cache     ████ 40%  │  │ eu-west     80   71%    156       ││
│  │ Miss         █░░░  5%  │  │ ap-south    60   69%    98        ││
│  └────────────────────────┘  └────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Quality Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Quality Metrics Dashboard                         │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Acceptance Rate by Language (Last 24h)                           ││
│  │                                                                  ││
│  │ Python      █████████████████████████████████░░  38.2%          ││
│  │ TypeScript  ████████████████████████████░░░░░░░  34.5%          ││
│  │ JavaScript  ███████████████████████████░░░░░░░░  33.1%          ││
│  │ Java        █████████████████████████░░░░░░░░░░  30.8%          ││
│  │ Go          ████████████████████████░░░░░░░░░░░  29.4%          ││
│  │ Rust        ██████████████████████░░░░░░░░░░░░░  26.7%          ││
│  │ C++         █████████████████████░░░░░░░░░░░░░░  25.2%          ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌────────────────────────┐  ┌────────────────────────────────────┐│
│  │ Completion Type Stats  │  │ Retention Analysis                 ││
│  │                        │  │                                     ││
│  │ Type      Accept  Ret  │  │ Accepted → Retained: 85%           ││
│  │ Inline    35%     88%  │  │ Accepted → Modified: 12%           ││
│  │ FIM       28%     82%  │  │ Accepted → Deleted:   3%           ││
│  │ Multi-ln  22%     79%  │  │                                     ││
│  │ Chat      45%     91%  │  │ Avg time to modify: 4.2s           ││
│  │ Agent     52%     94%  │  │ Avg chars modified: 12             ││
│  └────────────────────────┘  └────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Quality Trend (30 days)                                          ││
│  │                                                                  ││
│  │     40% ┤                           ╭──────╮                     ││
│  │         │               ╭───────────╯      ╰─────               ││
│  │     35% ┤     ╭─────────╯                                       ││
│  │         │╭────╯                                                  ││
│  │     30% ┼╯                                                       ││
│  │         │ ── Acceptance Rate   ── Retention Rate                ││
│  │         └─────────────────────────────────────────────────────── ││
│  │           Week 1    Week 2    Week 3    Week 4                  ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Runbooks

### High Latency Runbook

```yaml
runbook:
  name: High P99 Latency (>500ms)
  trigger: Alert "high_p99_latency"
  severity: P2

  diagnosis:
    - step: Check which component is slow
      command: |
        # Query latency breakdown by component
        promql: histogram_quantile(0.99,
          sum by (component) (rate(latency_bucket[5m])))
      expected: Identify component with highest latency

    - step: Check GPU cluster status
      command: |
        kubectl get pods -n inference -l app=llm-inference
        kubectl top pods -n inference
      expected: All pods running, GPU utilization <90%

    - step: Check inference queue depth
      command: |
        promql: inference_queue_depth
      expected: Queue depth <500

    - step: Check cache hit rates
      command: |
        promql: sum(rate(cache_hits[5m])) / sum(rate(cache_requests[5m]))
      expected: Cache hit rate >40%

  remediation:
    - condition: GPU utilization >90%
      action: Scale up inference cluster
      command: |
        kubectl scale deployment llm-inference --replicas=$((CURRENT + 10))

    - condition: Queue depth >1000
      action: Enable aggressive caching, shed low-priority traffic
      command: |
        kubectl set env deployment/completion-service \
          CACHE_AGGRESSIVE=true \
          SHED_LOW_PRIORITY=true

    - condition: Cache hit rate <30%
      action: Investigate cache invalidation, increase TTL
      command: |
        # Check recent cache invalidation events
        kubectl logs -n cache -l app=redis --since=1h | grep "EVICT"

    - condition: LLM provider slow
      action: Failover to backup provider
      command: |
        kubectl set env deployment/completion-service \
          LLM_PRIMARY_PROVIDER=backup
```

### Injection Attack Runbook

```yaml
runbook:
  name: Prompt Injection Attack Detected
  trigger: Alert "injection_attack_spike"
  severity: P1

  immediate_actions:
    - step: Identify attack source
      command: |
        # Query injection events by user
        promql: topk(10, sum by (user_id) (
          rate(prompt_injection_detected[5m])))

    - step: Block suspicious users
      command: |
        # If single user is source
        curl -X POST $API/admin/users/$USER_ID/block \
          -d '{"reason": "injection_attack", "duration": "1h"}'

    - step: Enable enhanced filtering
      command: |
        kubectl set env deployment/completion-service \
          INJECTION_FILTER_LEVEL=strict

  investigation:
    - step: Analyze attack patterns
      command: |
        # Pull recent injection attempts (sanitized)
        curl "$LOGS_API/search?query=injection_detected:true&limit=100"

    - step: Check for successful bypasses
      command: |
        # Look for anomalous outputs
        promql: sum(rate(output_anomaly_detected[1h]))

    - step: Review affected completions
      command: |
        # Manual review of flagged completions
        # Coordinate with security team

  post_incident:
    - Update injection detection patterns
    - File security incident report
    - Schedule post-mortem if bypass occurred
```
