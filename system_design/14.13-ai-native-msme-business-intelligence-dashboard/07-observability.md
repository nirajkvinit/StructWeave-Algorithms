# 14.13 AI-Native MSME Business Intelligence Dashboard — Observability

## Observability Philosophy

This system has a unique observability challenge: it combines traditional backend metrics (latency, throughput, error rates) with **AI quality metrics** (NL-to-SQL accuracy, insight relevance, narrative quality) and **business outcome metrics** (user engagement, digest open rates, query-to-action conversion). A latency spike is immediately detectable; a gradual decline in NL-to-SQL accuracy is not—unless specifically measured.

---

## Key Metrics

### NL-to-SQL Pipeline Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `nl_query.latency_p95` | Histogram | End-to-end NL query response time | > 3.5 s |
| `nl_query.accuracy_rate` | Gauge | % of queries with positive user feedback (rolling 7-day) | < 87% |
| `nl_query.template_hit_rate` | Gauge | % of queries handled by template cache | < 50% (model might be degrading, pushing more to LLM) |
| `nl_query.cache_hit_rate` | Gauge | % of queries served from semantic cache | < 20% |
| `nl_query.clarification_rate` | Gauge | % of queries requiring clarification dialog | > 10% (semantic graph quality issue) |
| `nl_query.validation_rejection_rate` | Counter | Queries rejected by SQL validator | > 2% (LLM generating unsafe SQL) |
| `nl_query.llm_latency_p95` | Histogram | LLM inference time only | > 1.2 s |
| `nl_query.llm_error_rate` | Counter | LLM timeouts or errors | > 1% |

### Data Ingestion Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `ingestion.sync_latency_p95` | Histogram | Time from source change to warehouse availability | > 20 min |
| `ingestion.schema_drift_events` | Counter | Schema changes detected per day | > 50 (unusual bulk migration) |
| `ingestion.dead_letter_rate` | Gauge | % of records sent to dead letter queue | > 2% per connector |
| `ingestion.connector_health` | Gauge | % of active connectors passing health check | < 95% |
| `ingestion.data_quality_score` | Gauge | Average quality score across active connectors | < 0.8 |
| `ingestion.dedup_rate` | Gauge | % of records deduplicated (high = upstream retry storms) | > 5% |

### Insight Engine Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `insights.detection_latency` | Histogram | Time from data arrival to insight generation | > 2 hours |
| `insights.precision_rate` | Gauge | % of delivered insights rated "useful" by merchants | < 70% |
| `insights.anomalies_per_tenant_day` | Gauge | Average anomalies detected per active tenant per day | > 5 (threshold too sensitive) or < 0.1 (too conservative) |
| `insights.root_cause_depth` | Histogram | Number of dimensions explored in root cause analysis | Avg < 2 (shallow analysis) |
| `insights.narrative_generation_latency` | Histogram | LLM time for insight narrative | > 2 s |
| `insights.suppression_rate` | Gauge | % of detected anomalies suppressed by novelty/dedup filters | > 90% (detecting too much noise) |

### WhatsApp Digest Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `digest.delivery_success_rate` | Gauge | % of digests successfully delivered | < 96% |
| `digest.delivery_latency_p95` | Histogram | Time from scheduled delivery to WhatsApp receipt | > 10 min |
| `digest.read_rate` | Gauge | % of delivered digests read (blue tick) | < 40% (content not engaging) |
| `digest.deep_link_click_rate` | Gauge | % of read digests where merchant taps "View Details" | < 15% |
| `digest.unsubscribe_rate` | Gauge | % of merchants opting out per month | > 5% |
| `digest.queue_depth` | Gauge | Pending digests in delivery queue | > 100K (delivery backlog) |

### Multi-Tenant Isolation Metrics

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `isolation.cross_tenant_attempts` | Counter | Queries that reference non-session tenant_ids (caught by validator) | > 0 (any occurrence is a security event) |
| `isolation.rls_enforcement_failures` | Counter | Queries that bypassed RLS (should never happen) | > 0 (critical security incident) |
| `isolation.query_cost_rejections` | Counter | Queries rejected for exceeding cost budget | Informational (no alert) |
| `isolation.audit_log_gap` | Gauge | Time since last audit log entry (detect logging failures) | > 5 min |

---

## Distributed Tracing

### Trace Structure for NL Query

Every NL query generates a distributed trace spanning multiple services:

```
Trace: nl_query_{query_id}
├── span: api_gateway (auth, rate_limit)          [5 ms]
├── span: semantic_cache_lookup                    [2 ms]
├── span: intent_classification                    [50 ms]
│   └── attribute: intent=ranking, confidence=0.95
├── span: entity_extraction                        [100 ms]
│   └── attribute: entities={metric:revenue, dim:product, ...}
├── span: schema_mapping                           [80 ms]
│   └── attribute: tables_resolved=2, confidence=0.91
├── span: llm_sql_generation                       [800 ms]
│   └── attribute: model=v2.3, prompt_tokens=1200, completion_tokens=85
├── span: sql_validation                           [50 ms]
│   └── attribute: passed=true, cost_estimate=0.3
├── span: query_execution                          [600 ms]
│   └── attribute: rows_returned=5, partitions_scanned=1
├── span: visualization_selection                  [10 ms]
│   └── attribute: chart_type=horizontal_bar_chart
└── span: narrative_generation                     [300 ms]
    └── attribute: model=v2.3, narrative_length=180_chars
```

### Trace Attributes for Debugging

Critical attributes attached to every trace:
- `tenant_id` — for tenant-scoped debugging
- `query_intent` — for pipeline stage analysis
- `llm_model_version` — for A/B testing model updates
- `cache_status` — `hit`, `miss`, `stale_hit`
- `execution_plan` — query engine's chosen execution plan (for slow query analysis)
- `data_freshness` — age of the newest data row in the result

---

## Dashboards

### Dashboard 1: NL Pipeline Health

**Purpose:** Real-time monitoring of the NL-to-SQL pipeline's accuracy and performance.

**Panels:**
1. Query volume (queries/minute) — time series
2. Latency distribution (p50, p95, p99) — heatmap
3. Accuracy rate (rolling 7-day) — gauge with 90% target line
4. Template vs. LLM vs. cache breakdown — stacked area chart
5. Clarification rate — time series with 10% alert line
6. LLM error rate — time series
7. Top 10 failing query patterns — table (updated hourly)
8. Query confidence distribution — histogram

### Dashboard 2: Tenant Data Health

**Purpose:** Monitor data ingestion, quality, and freshness across all tenants.

**Panels:**
1. Active connectors by type — pie chart
2. Sync latency distribution — heatmap
3. Schema drift events (last 24h) — time series
4. Dead letter queue depth by connector type — stacked bar
5. Data quality score distribution — histogram
6. Tenants with stale data (>1 hour) — count + list
7. Connector failure rate by type — bar chart
8. Deduplication rate — time series

### Dashboard 3: Insight Quality

**Purpose:** Monitor the insight engine's effectiveness and user satisfaction.

**Panels:**
1. Insights generated per day — time series
2. Insight precision (useful/not useful ratio) — rolling gauge
3. Suppression funnel: detected → passed novelty → passed dedup → delivered — funnel chart
4. Root cause attribution depth distribution — histogram
5. Narrative generation latency — heatmap
6. Digest delivery and read rates — dual-axis time series
7. Merchant feedback distribution — bar chart (useful, not_useful, no_feedback)
8. Top insight types by tenant vertical — heatmap

### Dashboard 4: Security & Isolation

**Purpose:** Real-time security monitoring for multi-tenant isolation.

**Panels:**
1. Cross-tenant query attempts (should be zero) — counter with alert
2. RLS enforcement events — counter (should be zero in normal operation)
3. SQL validation rejection reasons — pie chart
4. Query cost distribution by tier — box plot
5. Credential access log volume — time series
6. Adversarial pattern detection alerts — event list
7. Audit log completeness — gauge (100% = no gaps)
8. Tenant data deletion requests and completion status — table

---

## Alerting Strategy

### Severity Levels

| Level | Response Time | Notification | Examples |
|---|---|---|---|
| **P0 — Critical** | 5 min | PagerDuty + phone call | Cross-tenant data exposure, RLS bypass, credential leak |
| **P1 — High** | 15 min | PagerDuty + Slack | NL query accuracy < 85%, WhatsApp delivery < 90%, LLM service down |
| **P2 — Medium** | 1 hour | Slack | Ingestion latency > 30 min, insight precision < 70%, digest queue backlog |
| **P3 — Low** | Next business day | Slack (batch) | Template hit rate drop, schema drift volume spike, minor connector failures |

### Alert Fatigue Prevention

- **Deduplication window:** Same alert fires at most once per 15 minutes
- **Auto-resolve:** Alerts auto-resolve when the metric returns to normal for 5 minutes
- **Correlation:** Group related alerts (e.g., LLM latency spike + query accuracy drop = single incident)
- **Escalation:** Unacknowledged P1 alerts escalate to P0 after 30 minutes
- **Weekly noise review:** Ops team reviews alert-to-action ratio; alerts with <20% action rate are tuned or removed

---

## Logging Strategy

### Log Levels by Service

| Service | DEBUG | INFO | WARN | ERROR |
|---|---|---|---|---|
| NL pipeline | Full prompt + response (dev only) | Query ID, intent, latency | Low confidence, clarification triggered | LLM timeout, validation rejection |
| Ingestion | Row-level processing (dev only) | Sync start/complete, row counts | Schema drift, quality score drop | Connector failure, dead letter |
| Insight engine | Full anomaly calculation (dev only) | Insight generated, delivered | Suppression, low confidence | Detection pipeline failure |
| WhatsApp sender | Template rendering (dev only) | Delivery attempt, receipt | Delivery retry | Delivery failure, template rejection |

### Structured Log Format

All logs use structured JSON with mandatory fields:
- `timestamp` — ISO 8601 with microseconds
- `service` — originating service name
- `tenant_id` — for tenant-scoped log filtering (null for system-level)
- `trace_id` — for correlation with distributed traces
- `level` — DEBUG/INFO/WARN/ERROR
- `message` — human-readable summary
- `metadata` — service-specific structured data

### Log Retention

| Log Type | Hot (searchable) | Warm (archived) | Cold (compliance) |
|---|---|---|---|
| Security/audit | 90 days | 1 year | 7 years |
| Query logs | 30 days | 6 months | 1 year |
| Ingestion logs | 14 days | 3 months | — |
| Application logs | 7 days | 1 month | — |
