# Observability — AI-Native Data Catalog & Governance

## Key Metrics

### Catalog Health Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `catalog.entity_count` | Gauge | Total entities in the catalog by type | Sudden drop > 5% (mass deletion) |
| `catalog.metadata_freshness_p99` | Histogram | Time from source change to catalog reflection | > 5 minutes |
| `catalog.stale_entity_ratio` | Gauge | Percentage of entities not updated in 30+ days | > 30% |
| `catalog.orphan_entity_count` | Gauge | Entities with no owner and no recent usage | > 10% of total |
| `catalog.description_coverage` | Gauge | Percentage of entities with non-empty descriptions | < 60% |

### Ingestion Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `ingestion.events_per_second` | Counter | Metadata change events processed per second | Drop > 50% from baseline |
| `ingestion.connector_status` | Gauge | Health status per connector (healthy/degraded/failed) | Any connector in "failed" state |
| `ingestion.connector_latency_p99` | Histogram | Time per connector crawl cycle | > 10 minutes |
| `ingestion.parse_failure_rate` | Counter | SQL statements that failed AST parsing | > 5% of total |
| `ingestion.event_bus_lag` | Gauge | Consumer lag on metadata event partitions | > 10,000 events |
| `ingestion.schema_drift_events` | Counter | Schema changes detected per hour | Spike > 3x baseline (mass migration?) |

### Search & Discovery Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `search.query_latency_p50` | Histogram | Search response time (median) | > 200ms |
| `search.query_latency_p99` | Histogram | Search response time (tail) | > 1s |
| `search.click_through_rate` | Gauge | Percentage of searches that result in a click | < 30% (ranking quality issue) |
| `search.zero_result_rate` | Gauge | Percentage of searches returning no results | > 10% |
| `search.refinement_rate` | Gauge | Percentage of searches followed by a refined query | > 40% (users not finding what they need) |
| `search.index_sync_lag` | Gauge | Delay between graph write and search index update | > 5 seconds |

### Classification Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `classification.columns_scanned_per_hour` | Counter | Classification throughput | Drop > 50% |
| `classification.auto_applied_rate` | Gauge | Percentage of classifications applied without human review | < 50% (threshold too high) or > 95% (threshold too low) |
| `classification.pending_review_backlog` | Gauge | Classifications awaiting human review | > 500 |
| `classification.override_rate` | Gauge | Percentage of auto-classifications overridden by humans | > 15% (model accuracy issue) |
| `classification.precision_estimate` | Gauge | Estimated precision from human review feedback | < 90% |
| `classification.unclassified_pii_columns` | Gauge | Known PII columns without classification tags | > 0 (compliance risk) |

### Policy & Governance Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `policy.evaluation_latency_p99` | Histogram | Time to evaluate access policy | > 50ms |
| `policy.deny_rate` | Gauge | Percentage of access requests denied | Spike > 2x baseline |
| `policy.masking_applied_count` | Counter | Number of columns actively masked | Monitor for unexpected drops |
| `policy.untagged_pii_ratio` | Gauge | PII columns without governance policy coverage | > 0% |
| `policy.policy_change_count` | Counter | Policy modifications per day | Spike outside change windows |

### NL-to-SQL Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `nlsql.response_latency_p50` | Histogram | Time to generate SQL from natural language | > 3s |
| `nlsql.confidence_score_avg` | Gauge | Average confidence of generated SQL | < 0.7 |
| `nlsql.self_correction_rate` | Gauge | Percentage of queries needing SQL repair loop | > 30% |
| `nlsql.user_acceptance_rate` | Gauge | Percentage of generated SQL that users execute | < 50% |
| `nlsql.llm_error_rate` | Counter | LLM API failures or timeouts | > 2% |

### Adoption Metrics (Business-Critical)

| Metric | Type | Description | Target |
|--------|------|-------------|--------|
| `adoption.weekly_active_users` | Gauge | Unique users accessing the catalog per week | > 60% of data practitioners |
| `adoption.searches_per_user_per_week` | Gauge | Average search frequency | > 10 |
| `adoption.time_to_first_discovery` | Histogram | Time for new user to find their first useful dataset | < 5 minutes |
| `adoption.certified_asset_ratio` | Gauge | Percentage of frequently-used assets that are certified | > 40% |
| `adoption.domain_coverage` | Gauge | Percentage of domains with active ownership | 100% |

---

## Logging Strategy

### Structured Log Format

```
{
  "timestamp": "2026-03-10T14:30:00.000Z",
  "service": "search-service",
  "level": "INFO",
  "trace_id": "abc123def456",
  "span_id": "span789",
  "user_id": "user-42",
  "event": "search_query",
  "query": "customer orders",
  "filters": {"type": "table", "domain": "commerce"},
  "result_count": 23,
  "latency_ms": 145,
  "cache_hit": false
}
```

### Log Levels

| Level | When | Examples |
|-------|------|---------|
| **ERROR** | System failure requiring immediate attention | Connector auth failure, graph write conflict, LLM API timeout |
| **WARN** | Degraded operation, potential issue | Classification confidence below threshold, search index lag > 5s, stale connector |
| **INFO** | Normal operations, audit-worthy events | Search queries, policy evaluations, classification results, entity updates |
| **DEBUG** | Detailed troubleshooting | SQL parsing details, ranking score breakdowns, cache hit/miss details |

---

## Distributed Tracing

### Key Trace Paths

| Path | Spans | Purpose |
|------|-------|---------|
| **Search query** | API Gateway → Auth → Search Service → Search Index → Ranking Model → Policy Filter → Response | End-to-end search latency breakdown |
| **Metadata ingestion** | Connector → SQL Parser → Event Bus → Active Metadata Processor → Graph Write → Index Update | Ingestion pipeline latency per event |
| **Classification** | Classification Worker → Data Sampling → NER Model → Confidence Scoring → Tag Write | Classification pipeline per column |
| **NL-to-SQL** | NL Query → Intent Extraction → Catalog RAG → LLM Inference → SQL Validation → Policy Check | NL query latency breakdown |
| **Policy evaluation** | Policy Service → Tag Resolution → Policy Matching → Decision → Audit Log | Access decision latency |

### Trace Propagation

- **W3C Trace Context** headers propagated across all HTTP and gRPC calls
- **Event bus messages** carry trace context in message headers for async pipeline tracing
- **Connector traces** linked to source system audit logs via correlation IDs

---

## Alerting Rules

### Critical (Page-Worthy)

| Alert | Condition | Runbook Action |
|-------|-----------|----------------|
| **Graph database down** | Primary unreachable for > 30s | Verify failover to standby; check replication lag |
| **Policy service unresponsive** | Policy evaluation latency > 5s or error rate > 5% | Restart policy service; fallback to cached decisions |
| **Connector credential expired** | Any connector fails authentication | Rotate credentials in secrets manager; verify auto-rotation config |
| **Mass entity deletion** | > 1000 entities deleted in 1 hour | Investigate source; may indicate accidental drop or malicious activity |
| **Untagged PII detected** | Auto-classification finds PII column with no governance policy | Alert data steward; apply default masking policy immediately |

### Warning

| Alert | Condition | Runbook Action |
|-------|-----------|----------------|
| **Search quality degradation** | Click-through rate drops > 20% week-over-week | Review ranking model; check for index corruption; analyze zero-result queries |
| **Classification backlog growing** | Pending review queue > 500 items | Scale classification workers; review confidence threshold |
| **Lineage coverage gap** | New tables detected without lineage for > 24 hours | Check SQL parser compatibility; add missing connector |
| **Adoption declining** | WAU drops > 10% week-over-week | Survey users; check for UX issues; review search quality |

---

## Dashboards

### Dashboard 1: Catalog Health Overview

- Entity count by type (line chart, 30-day trend)
- Metadata freshness distribution (histogram)
- Description coverage by domain (bar chart)
- Quality score distribution (histogram)
- Stale and orphan entity counts (single-stat with trend)

### Dashboard 2: Ingestion Pipeline

- Events processed per second (time series)
- Connector status grid (green/yellow/red per connector)
- SQL parse failure rate (time series with annotation for new source additions)
- Event bus consumer lag (time series per partition)
- Schema drift events (bar chart by source)

### Dashboard 3: Governance & Compliance

- Policy evaluation rate and deny rate (time series)
- Classification coverage (gauge: % of columns classified)
- PII-tagged columns without masking policy (single-stat, must be 0)
- Policy change audit trail (table with timestamps, users, actions)
- Compliance dashboard: GDPR erasure requests fulfilled vs pending

### Dashboard 4: Search & User Experience

- Search latency percentiles (p50, p95, p99 over time)
- Click-through rate and zero-result rate (time series)
- Top search queries (word cloud or ranked list)
- NL-to-SQL usage and acceptance rate (time series)
- User adoption: WAU, searches per user, time-to-first-discovery
