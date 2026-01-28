# Observability

## Core Metrics Framework

### RED Metrics (Request-oriented)

| Service | Rate | Errors | Duration |
|---------|------|--------|----------|
| **Ingestion API** | `ingestion_requests_total` | `ingestion_errors_total` | `ingestion_latency_seconds` |
| **OCR Service** | `ocr_pages_total` | `ocr_errors_total` | `ocr_latency_seconds` |
| **Classification** | `classification_total` | `classification_errors_total` | `classification_latency_seconds` |
| **Extraction** | `extraction_total` | `extraction_errors_total` | `extraction_latency_seconds` |
| **Validation** | `validation_total` | `validation_errors_total` | `validation_latency_seconds` |
| **HITL** | `review_completed_total` | `review_errors_total` | `review_duration_seconds` |
| **Export** | `export_total` | `export_errors_total` | `export_latency_seconds` |

### USE Metrics (Resource-oriented)

| Resource | Utilization | Saturation | Errors |
|----------|-------------|------------|--------|
| **GPU** | `gpu_utilization_percent` | `gpu_memory_used_bytes` | `gpu_errors_total` |
| **CPU** | `cpu_utilization_percent` | `cpu_throttle_seconds` | - |
| **Memory** | `memory_used_bytes` | `memory_oom_kills_total` | - |
| **Disk** | `disk_used_bytes` | `disk_io_wait_seconds` | `disk_errors_total` |
| **Network** | `network_bytes_total` | `network_dropped_packets` | `network_errors_total` |
| **Kafka** | `kafka_consumer_lag` | `kafka_partition_count` | `kafka_consumer_errors` |

---

## Document Processing Metrics

### Processing Quality Metrics

```yaml
metrics:
  # Classification metrics
  classification_accuracy:
    type: gauge
    labels: [document_type, model_version]
    description: "Classification accuracy by document type"

  classification_confidence_distribution:
    type: histogram
    labels: [document_type]
    buckets: [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 0.99]
    description: "Distribution of classification confidence scores"

  # Extraction metrics
  extraction_accuracy:
    type: gauge
    labels: [document_type, field_name]
    description: "Extraction accuracy by field"

  extraction_confidence:
    type: histogram
    labels: [document_type, field_name, model]
    buckets: [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 0.99]
    description: "Distribution of extraction confidence scores"

  # Touchless rate
  touchless_rate:
    type: gauge
    labels: [document_type, tenant_id]
    description: "Percentage of documents processed without HITL"

  # HITL correction rate
  hitl_correction_rate:
    type: gauge
    labels: [document_type, field_name]
    description: "Percentage of extractions corrected by humans"
```

### Throughput Metrics

```yaml
metrics:
  # Document throughput
  documents_received_total:
    type: counter
    labels: [channel, tenant_id]
    description: "Total documents received by channel"

  documents_processed_total:
    type: counter
    labels: [status, document_type]
    description: "Total documents processed by status"

  pages_processed_total:
    type: counter
    labels: [ocr_engine]
    description: "Total pages processed by OCR engine"

  # Queue metrics
  queue_depth:
    type: gauge
    labels: [queue_name, priority]
    description: "Current queue depth"

  queue_wait_time_seconds:
    type: histogram
    labels: [queue_name]
    buckets: [1, 5, 10, 30, 60, 120, 300, 600]
    description: "Time spent waiting in queue"
```

### HITL Metrics

```yaml
metrics:
  # Queue metrics
  hitl_queue_depth:
    type: gauge
    labels: [review_type, priority, tenant_id]
    description: "Current HITL queue depth"

  hitl_queue_age_seconds:
    type: histogram
    labels: [review_type]
    buckets: [60, 300, 900, 1800, 3600, 7200, 14400]
    description: "Age of items in HITL queue"

  # Review metrics
  hitl_review_duration_seconds:
    type: histogram
    labels: [review_type, reviewer_id]
    buckets: [10, 30, 60, 120, 300, 600, 1200]
    description: "Time to complete review"

  hitl_corrections_per_document:
    type: histogram
    labels: [document_type]
    buckets: [0, 1, 2, 3, 5, 10, 20]
    description: "Number of corrections per document"

  hitl_reviewer_throughput:
    type: gauge
    labels: [reviewer_id, review_type]
    description: "Reviews completed per hour by reviewer"
```

### Model Performance Metrics

```yaml
metrics:
  # Model latency
  model_inference_seconds:
    type: histogram
    labels: [model_name, model_version]
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10]
    description: "Model inference latency"

  # Model accuracy (from feedback loop)
  model_accuracy:
    type: gauge
    labels: [model_name, model_version, document_type]
    description: "Model accuracy based on HITL feedback"

  # Fallback rate
  model_fallback_rate:
    type: gauge
    labels: [primary_model, fallback_model]
    description: "Rate of fallback to secondary model"

  # Foundation model usage
  foundation_model_calls_total:
    type: counter
    labels: [model, reason]
    description: "Calls to foundation models (cost tracking)"
```

---

## Logging Strategy

### Structured Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "INFO",
  "service": "extraction-service",
  "version": "1.2.3",

  "trace_id": "abc123def456",
  "span_id": "span789",
  "parent_span_id": "parent456",

  "tenant_id": "tenant-001",
  "document_id": "doc-12345",
  "request_id": "req-67890",

  "event": "extraction.completed",
  "message": "Successfully extracted 15 fields from invoice",

  "context": {
    "document_type": "invoice",
    "page_count": 3,
    "model_version": "layoutlm-v3.1.0"
  },

  "metrics": {
    "fields_extracted": 15,
    "avg_confidence": 0.92,
    "processing_time_ms": 1500,
    "fallback_used": false
  },

  "resource": {
    "pod_name": "extraction-worker-abc123",
    "node_name": "gpu-node-01",
    "gpu_id": "0"
  }
}
```

### Log Levels and Usage

| Level | Use Case | Example |
|-------|----------|---------|
| **ERROR** | Failures requiring attention | OCR failed, model error, data corruption |
| **WARN** | Potential issues, degradation | Low confidence, fallback used, retry needed |
| **INFO** | Normal operations, milestones | Document received, extraction completed |
| **DEBUG** | Detailed debugging info | Field values, model inputs, intermediate results |
| **TRACE** | Very detailed, performance-sensitive | Per-token processing, memory allocation |

### What NOT to Log

| Data Type | Reason | Alternative |
|-----------|--------|-------------|
| **Raw document content** | PII, storage cost | Log document hash, page count |
| **Extracted PII values** | Privacy violation | Log field names, confidence only |
| **Full field values** | Privacy, storage | Log value hash or length |
| **API keys, tokens** | Security | Never log, use references |
| **Model weights** | Size, proprietary | Log model version only |

### Log Sampling Strategy

```yaml
sampling:
  # High-volume, low-value logs
  debug_logs:
    rate: 0.01  # 1% sampling
    conditions:
      - level: DEBUG
      - event: "model.inference.step"

  # Normal operations
  info_logs:
    rate: 0.1  # 10% sampling for high-volume events
    conditions:
      - event: "page.processed"
    full_rate_events:
      - "document.received"
      - "document.completed"
      - "document.failed"

  # Always log
  always_log:
    - level: ERROR
    - level: WARN
    - event: "*.failed"
    - event: "*.error"
    - event: "security.*"
    - event: "audit.*"
```

---

## Distributed Tracing

### Trace Structure

```
document.process (5000ms)
├── ingestion.receive (50ms)
│   ├── validate.format (10ms)
│   └── store.document (40ms)
├── preprocessing.run (200ms)
│   ├── split.pages (50ms)
│   ├── enhance.images (100ms)
│   └── detect.language (50ms)
├── ocr.process (1500ms)
│   ├── ocr.page_1 (500ms)
│   ├── ocr.page_2 (500ms)
│   └── ocr.page_3 (500ms)
├── classification.run (300ms)
│   └── model.inference (250ms)
├── extraction.run (2500ms)
│   ├── extraction.specialized (1000ms)
│   │   └── model.layoutlm (900ms)
│   └── extraction.fallback (1500ms)
│       └── model.gpt4v (1400ms)
├── validation.run (200ms)
│   ├── rules.evaluate (100ms)
│   └── anomaly.detect (100ms)
└── export.dispatch (250ms)
    └── webhook.send (200ms)
```

### Trace Attributes

```yaml
# Standard attributes for all spans
common_attributes:
  service.name: string
  service.version: string
  tenant.id: string
  document.id: string
  document.type: string

# OCR-specific attributes
ocr_attributes:
  ocr.engine: string          # tesseract, textract, doctr
  ocr.page_number: int
  ocr.confidence: float
  ocr.word_count: int

# Extraction-specific attributes
extraction_attributes:
  extraction.model: string
  extraction.model_version: string
  extraction.field_count: int
  extraction.avg_confidence: float
  extraction.fallback_used: boolean

# HITL-specific attributes
hitl_attributes:
  hitl.review_type: string
  hitl.reviewer_id: string
  hitl.corrections_count: int
  hitl.queue_wait_ms: int
```

### Trace Sampling

```yaml
# Adaptive sampling based on outcome
sampling_rules:
  # Always trace errors
  - name: "errors"
    condition: "status_code >= 400 OR error = true"
    sample_rate: 1.0

  # Always trace slow requests
  - name: "slow_requests"
    condition: "duration > 30s"
    sample_rate: 1.0

  # Sample successful requests
  - name: "success"
    condition: "status_code < 400"
    sample_rate: 0.1  # 10%

  # Trace HITL flows fully
  - name: "hitl"
    condition: "hitl.required = true"
    sample_rate: 1.0
```

---

## Alerting Rules

### P1 - Critical (Page Immediately)

| Alert | Condition | Runbook |
|-------|-----------|---------|
| **ServiceDown** | `up{service="api"} == 0 for 1m` | Check pods, restart if needed |
| **HighErrorRate** | `error_rate > 10% for 5m` | Check logs, identify root cause |
| **DatabaseDown** | `pg_up == 0 for 30s` | Failover to replica |
| **QueueOverflow** | `queue_depth > 10000 for 5m` | Scale workers, investigate backlog |
| **GPUFailure** | `gpu_available == 0 for 2m` | Check GPU nodes, reschedule pods |

### P2 - High (Page during business hours)

| Alert | Condition | Runbook |
|-------|-----------|---------|
| **LowTouchlessRate** | `touchless_rate < 50% for 1h` | Check model accuracy, threshold config |
| **HighLatency** | `p95_latency > 60s for 10m` | Check bottlenecks, scale if needed |
| **HITLBacklog** | `hitl_queue_depth > 500 for 30m` | Alert reviewers, adjust thresholds |
| **ModelAccuracyDrop** | `accuracy < baseline - 5% for 1h` | Check for data drift, model issues |
| **FoundationModelErrors** | `gpt4v_error_rate > 5% for 10m` | Check API status, fallback to specialized |

### P3 - Medium (Ticket during business hours)

| Alert | Condition | Runbook |
|-------|-----------|---------|
| **HighMemoryUsage** | `memory_usage > 85% for 15m` | Scale pods, check for leaks |
| **DiskSpaceLow** | `disk_usage > 80%` | Clean old data, expand storage |
| **CacheHitRateLow** | `cache_hit_rate < 70% for 1h` | Check cache config, sizing |
| **SlowOCR** | `ocr_p95_latency > 5s for 30m` | Check OCR engine, image quality |

### P4 - Low (Weekly review)

| Alert | Condition | Runbook |
|-------|-----------|---------|
| **HighCostPerDocument** | `cost_per_doc > $0.15 for 1d` | Optimize model usage, caching |
| **UnusualTrafficPattern** | `traffic deviation > 50%` | Investigate, may be legitimate |
| **CertificateExpiringSoon** | `cert_expiry < 30d` | Renew certificates |

### Alert Configuration

```yaml
# Prometheus AlertManager configuration
groups:
  - name: idp-critical
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m]))
          > 0.1
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} over last 5 minutes"
          runbook_url: "https://runbooks.example.com/idp/high-error-rate"

      - alert: LowTouchlessRate
        expr: |
          sum(rate(documents_processed_total{hitl_required="false"}[1h]))
          /
          sum(rate(documents_processed_total[1h]))
          < 0.5
        for: 1h
        labels:
          severity: high
          team: ml
        annotations:
          summary: "Touchless rate below 50%"
          description: "Touchless rate is {{ $value | humanizePercentage }}"
```

---

## Dashboard Layouts

### Processing Health Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    IDP Processing Health Dashboard                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │ Documents/min    │  │ Error Rate       │  │ Avg Latency      │       │
│  │     1,247        │  │     0.8%         │  │     4.2s         │       │
│  │   ▲ +12%         │  │   ▼ -0.3%        │  │   ▼ -0.5s        │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │              Documents Processed (24h)                         │     │
│  │  2000 ┤                                    ╭─╮                 │     │
│  │  1500 ┤            ╭──────╮    ╭──────────╯  ╰───             │     │
│  │  1000 ┤   ╭────────╯      ╰────╯                              │     │
│  │   500 ┤───╯                                                   │     │
│  │     0 └────────────────────────────────────────────────────── │     │
│  │        00:00    06:00    12:00    18:00    24:00              │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌────────────────────────────┐  ┌────────────────────────────┐         │
│  │ Processing by Stage        │  │ Error Distribution          │         │
│  │ ████████████ OCR    1200   │  │ ▓▓▓▓▓▓▓▓ OCR        45%    │         │
│  │ ██████████ Class    1100   │  │ ▓▓▓▓▓ Extraction    30%    │         │
│  │ ████████ Extract   900     │  │ ▓▓▓ Validation      20%    │         │
│  │ ██████ Validate    700     │  │ ▓ Other             5%     │         │
│  └────────────────────────────┘  └────────────────────────────┘         │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │              Queue Depths                                      │     │
│  │  OCR Queue:        ████████████░░░░░░░░  1,234 / 5,000        │     │
│  │  Extraction Queue: ██████░░░░░░░░░░░░░░    567 / 5,000        │     │
│  │  HITL Queue:       ████░░░░░░░░░░░░░░░░    234 / 2,000        │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Quality Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      IDP Quality Dashboard                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │ Touchless Rate   │  │ Classification   │  │ Extraction       │       │
│  │     72.4%        │  │ Accuracy: 96.2%  │  │ Accuracy: 91.5%  │       │
│  │   ▲ +2.1%        │  │   ▲ +0.5%        │  │   ▲ +1.2%        │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │         Confidence Distribution by Document Type               │     │
│  │                                                                │     │
│  │  Invoice    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░  [0.92 avg]       │     │
│  │  Receipt    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░  [0.88 avg]       │     │
│  │  Contract   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░  [0.85 avg]       │     │
│  │  Form       ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░  [0.90 avg]       │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌────────────────────────────┐  ┌────────────────────────────┐         │
│  │ HITL Correction Rate       │  │ Model Fallback Rate        │         │
│  │ by Field                   │  │                            │         │
│  │                            │  │ Specialized → Foundation   │         │
│  │ Total Amount:   3.2%  ▼    │  │      18.5%   ▲ +2.1%       │         │
│  │ Invoice Date:   5.1%  ▲    │  │                            │         │
│  │ Vendor Name:    8.7%  ─    │  │ Primary → Fallback OCR    │         │
│  │ Line Items:    12.4%  ▲    │  │       4.2%   ▼ -0.8%       │         │
│  └────────────────────────────┘  └────────────────────────────┘         │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │              Accuracy Trend (30 days)                          │     │
│  │  100%┤                                                         │     │
│  │   95%┤─────────────────────────────────────────  Classification│     │
│  │   90%┤────────────────────────────────────────────  Extraction │     │
│  │   85%┤                                                         │     │
│  │   80%└─────────────────────────────────────────────────────── │     │
│  │        W1      W2       W3       W4                           │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### HITL Operations Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    HITL Operations Dashboard                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │ Queue Depth      │  │ Avg Review Time  │  │ Active Reviewers │       │
│  │     342          │  │     2m 15s       │  │      8 / 12      │       │
│  │   ▼ -15%         │  │   ▼ -10s         │  │                  │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │              Queue by Priority                                 │     │
│  │  Urgent:  ██████████████████████████░░░░░░  45 items          │     │
│  │  High:    ████████████████░░░░░░░░░░░░░░░░  120 items         │     │
│  │  Normal:  ████████░░░░░░░░░░░░░░░░░░░░░░░░  177 items         │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌────────────────────────────────┐  ┌────────────────────────────┐     │
│  │ Reviewer Performance (today)   │  │ Review Type Distribution   │     │
│  │                                │  │                            │     │
│  │ Alice:    87 reviews  ★★★★★   │  │ Classification:  15%       │     │
│  │ Bob:      72 reviews  ★★★★☆   │  │ Extraction:      65%       │     │
│  │ Carol:    65 reviews  ★★★★☆   │  │ Validation:      20%       │     │
│  │ Dave:     54 reviews  ★★★☆☆   │  │                            │     │
│  └────────────────────────────────┘  └────────────────────────────┘     │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │              Queue Age Distribution                            │     │
│  │  < 15 min:  ████████████████████████████████  156 (46%)       │     │
│  │  15-60 min: ████████████████░░░░░░░░░░░░░░░░   98 (29%)       │     │
│  │  1-4 hours: ████████░░░░░░░░░░░░░░░░░░░░░░░░   67 (20%)       │     │
│  │  > 4 hours: ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   21 (5%) ⚠      │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## SLO Tracking

### SLO Definitions

| SLO | Target | Window | Burn Rate Alert |
|-----|--------|--------|-----------------|
| **Availability** | 99.9% | 30 days | 14.4x in 1h, 6x in 6h |
| **Latency (p99)** | < 30s | 30 days | > 45s for 5m |
| **Touchless Rate** | > 60% | 7 days | < 50% for 4h |
| **Classification Accuracy** | > 94% | 7 days | < 90% for 2h |
| **Extraction Accuracy** | > 88% | 7 days | < 85% for 2h |
| **HITL Turnaround** | < 4h | 24h | > 6h avg |

### Error Budget Tracking

```yaml
# SLO configuration for Sloth/Pyrra
slos:
  - name: idp-availability
    objective: 99.9
    window: 30d
    sli:
      events:
        error_query: sum(rate(http_requests_total{status=~"5.."}[5m]))
        total_query: sum(rate(http_requests_total[5m]))
    alerting:
      page_alert:
        labels:
          severity: critical
      ticket_alert:
        labels:
          severity: warning

  - name: idp-latency
    objective: 99.0
    window: 30d
    sli:
      events:
        error_query: |
          sum(rate(http_request_duration_seconds_bucket{le="30"}[5m]))
        total_query: |
          sum(rate(http_request_duration_seconds_count[5m]))

  - name: touchless-rate
    objective: 60.0
    window: 7d
    sli:
      events:
        success_query: |
          sum(rate(documents_processed_total{hitl_required="false"}[1h]))
        total_query: |
          sum(rate(documents_processed_total[1h]))
```
