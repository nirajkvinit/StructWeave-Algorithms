# Observability

## Metrics Framework

### RED Metrics (Request-Oriented)

| Service | Rate | Errors | Duration |
|---------|------|--------|----------|
| **GraphRAG API** | graphrag_requests_total | graphrag_errors_total | graphrag_latency_seconds |
| **Entity Search** | search_requests_total | search_errors_total | search_latency_seconds |
| **Graph Traversal** | traversal_requests_total | traversal_errors_total | traversal_latency_seconds |
| **Entity Resolution** | resolution_requests_total | resolution_errors_total | resolution_latency_seconds |
| **Extraction** | extraction_tasks_total | extraction_errors_total | extraction_duration_seconds |

### USE Metrics (Resource-Oriented)

| Resource | Utilization | Saturation | Errors |
|----------|-------------|------------|--------|
| **Graph DB CPU** | neo4j_cpu_usage_percent | neo4j_query_queue_depth | neo4j_query_errors |
| **Graph DB Memory** | neo4j_heap_used_bytes | neo4j_page_cache_evictions | neo4j_oom_count |
| **Graph DB Disk** | neo4j_store_size_bytes | neo4j_disk_io_util | neo4j_disk_errors |
| **Vector DB** | vector_cpu_usage | vector_search_queue | vector_search_errors |
| **Redis** | redis_memory_used | redis_evicted_keys | redis_rejected_connections |
| **Kafka** | kafka_consumer_lag | kafka_partition_saturation | kafka_errors |

### Business Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **graphrag_answer_quality** | Human-rated answer quality (sampled) | > 4.0/5.0 |
| **entity_resolution_precision** | Sampled precision of resolutions | > 90% |
| **extraction_f1_score** | Entity extraction F1 (sampled) | > 85% |
| **multi_hop_accuracy** | Multi-hop reasoning accuracy | > 80% |
| **community_modularity** | Leiden algorithm modularity | > 0.3 |
| **summary_freshness_hours** | Age of oldest stale summary | < 24h |

---

## Key Metrics Definitions

### Ingestion Metrics

```yaml
metrics:
  - name: extraction_queue_depth
    type: gauge
    description: Number of documents waiting for extraction
    labels: [priority]
    alert:
      warning: > 5000
      critical: > 10000

  - name: entities_extracted_total
    type: counter
    description: Total entities extracted
    labels: [entity_type, source_system]

  - name: entities_extracted_per_second
    type: gauge
    description: Extraction throughput
    alert:
      warning: < 500
      critical: < 100

  - name: extraction_error_rate
    type: gauge
    description: Percentage of failed extractions
    labels: [error_type]
    alert:
      warning: > 2%
      critical: > 5%

  - name: entity_resolution_latency_seconds
    type: histogram
    description: Time to resolve entity
    buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1.0]
    alert:
      p95_warning: > 200ms
      p95_critical: > 500ms

  - name: resolution_match_rate
    type: gauge
    description: Percentage of entities matched to existing
    # Expected ~70-80% (most mentions are re-mentions)
```

### Query Metrics

```yaml
metrics:
  - name: graphrag_query_latency_seconds
    type: histogram
    description: End-to-end GraphRAG query latency
    labels: [mode, status]  # mode: local/global/drift
    buckets: [0.1, 0.2, 0.5, 1.0, 2.0, 5.0]
    alert:
      p95_warning: > 1s (local), > 2s (global)
      p95_critical: > 2s (local), > 4s (global)

  - name: graphrag_context_tokens
    type: histogram
    description: Tokens in assembled context
    buckets: [500, 1000, 2000, 4000, 8000]

  - name: local_search_hops
    type: histogram
    description: Number of hops in local search
    buckets: [1, 2, 3, 4]

  - name: local_search_entities_returned
    type: histogram
    description: Entities returned by local search
    buckets: [10, 25, 50, 100, 200]

  - name: global_search_communities
    type: histogram
    description: Communities searched in global mode
    buckets: [5, 10, 20, 50]

  - name: cache_hit_rate
    type: gauge
    description: Cache hit percentage
    labels: [cache_type]  # entity, subgraph, summary, query
    alert:
      warning: < 50% (entity), < 20% (query)

  - name: multi_hop_steps
    type: histogram
    description: Steps in multi-hop reasoning
    buckets: [1, 2, 3, 4, 5]

  - name: multi_hop_verification_rate
    type: gauge
    description: Percentage of steps verified against graph
```

### Graph Health Metrics

```yaml
metrics:
  - name: entity_count_total
    type: gauge
    description: Total entities in graph
    labels: [entity_type]

  - name: relationship_count_total
    type: gauge
    description: Total relationships in graph
    labels: [relationship_type]

  - name: average_entity_degree
    type: gauge
    description: Average relationships per entity
    alert:
      info: > 50 (getting dense)
      warning: > 100 (super nodes forming)

  - name: orphan_entity_count
    type: gauge
    description: Entities with no relationships
    alert:
      warning: > 5% of total

  - name: community_count
    type: gauge
    description: Number of communities
    labels: [level]

  - name: community_modularity
    type: gauge
    description: Modularity score of community detection
    alert:
      warning: < 0.3
      critical: < 0.2

  - name: stale_summaries_count
    type: gauge
    description: Communities with outdated summaries
    alert:
      warning: > 100
      critical: > 500
```

---

## Distributed Tracing

### Trace Structure

```
GraphRAG Query Trace
├── api_gateway (5ms)
│   └── auth_check (2ms)
├── graphrag_service (780ms)
│   ├── query_classification (10ms)
│   ├── entity_extraction (15ms)
│   │   └── ner_model (12ms)
│   ├── local_search (250ms)
│   │   ├── entity_matching (30ms)
│   │   │   ├── vector_search (20ms)
│   │   │   └── fuzzy_match (10ms)
│   │   ├── graph_traversal (180ms)
│   │   │   ├── hop_1 (50ms)
│   │   │   ├── hop_2 (80ms)
│   │   │   └── relationship_filter (50ms)
│   │   └── result_ranking (40ms)
│   ├── context_assembly (25ms)
│   │   ├── format_entities (10ms)
│   │   └── format_relationships (15ms)
│   ├── llm_generation (450ms)
│   │   ├── prompt_construction (5ms)
│   │   ├── api_call (440ms)
│   │   └── response_parse (5ms)
│   └── response_formatting (30ms)
└── cache_store (3ms)

Total: 788ms
```

### Span Naming Conventions

```yaml
span_naming:
  pattern: "{service}.{operation}.{detail}"
  examples:
    - graphrag.query.local
    - graphrag.query.global
    - graphrag.search.entity_match
    - graphrag.traverse.hop_1
    - extraction.ner.gliner
    - extraction.relation.llm
    - resolution.block.prefix
    - resolution.match.semantic
    - graph.query.neighbors
    - vector.search.entity
    - cache.get.entity
    - llm.generate.answer

span_attributes:
  graphrag.mode: local | global | drift
  graphrag.query_hash: string
  graphrag.entities_found: int
  graphrag.hops: int
  extraction.entity_count: int
  extraction.model: string
  resolution.candidates: int
  resolution.confidence: float
  graph.query_type: string
  graph.results_count: int
  llm.model: string
  llm.tokens_in: int
  llm.tokens_out: int
```

### Sampling Strategy

```yaml
sampling:
  default_rate: 0.01  # 1% of requests

  rules:
    # Always sample errors
    - condition: status_code >= 400
      rate: 1.0

    # Always sample slow requests
    - condition: duration > 2s
      rate: 1.0

    # Higher sampling for specific operations
    - condition: operation == "multi_hop_reason"
      rate: 0.1

    # Lower sampling for high-volume operations
    - condition: operation == "entity_lookup"
      rate: 0.001

  adaptive:
    # Increase sampling when error rate spikes
    error_rate_trigger: 5%
    increased_rate: 0.1
    duration: 5m
```

---

## Logging Strategy

### Structured Log Format

```json
{
  "timestamp": "2026-01-28T10:30:45.123Z",
  "level": "INFO",
  "service": "graphrag-service",
  "instance": "graphrag-service-abc123",
  "trace_id": "abc123def456",
  "span_id": "span789",
  "request_id": "req-uuid-here",
  "user_id": "user-hash",
  "tenant_id": "tenant-uuid",
  "operation": "local_search",
  "message": "Local search completed",
  "attributes": {
    "query_hash": "hash123",
    "entities_found": 15,
    "relationships_found": 42,
    "hops": 2,
    "duration_ms": 250,
    "cache_hit": false
  }
}
```

### Log Levels and Usage

| Level | Usage | Examples | Sampling |
|-------|-------|----------|----------|
| **ERROR** | Failures requiring attention | Extraction failed, DB connection lost | 100% |
| **WARN** | Degraded operation | Cache miss, slow query, retry | 100% |
| **INFO** | Normal operations | Request completed, entity created | 10% |
| **DEBUG** | Detailed debugging | Query plan, intermediate results | 1% (dev only) |

### Log Retention

| Log Type | Hot Storage | Warm Storage | Cold Storage | Total |
|----------|-------------|--------------|--------------|-------|
| Application logs | 7 days | 30 days | 90 days | 90 days |
| Access logs | 30 days | 90 days | 1 year | 1 year |
| Audit logs | 90 days | 1 year | 7 years | 7 years |
| Debug logs | 24 hours | - | - | 24 hours |

---

## Alerting Strategy

### Alert Severity Levels

| Severity | Response Time | Notification | Examples |
|----------|--------------|--------------|----------|
| **P1 Critical** | < 15 min | Page on-call, escalate | Service down, data corruption |
| **P2 High** | < 1 hour | Page on-call | Latency spike, high error rate |
| **P3 Medium** | < 4 hours | Slack alert | Queue backlog, cache degradation |
| **P4 Low** | Next business day | Email | Capacity warning, non-urgent |

### Critical Alerts (P1)

```yaml
alerts:
  - name: graphrag_service_down
    condition: up{service="graphrag"} == 0 for 2m
    severity: P1
    runbook: runbooks/graphrag-down.md

  - name: graph_db_unavailable
    condition: neo4j_up == 0 for 1m
    severity: P1
    runbook: runbooks/neo4j-down.md

  - name: high_error_rate
    condition: |
      sum(rate(graphrag_errors_total[5m])) /
      sum(rate(graphrag_requests_total[5m])) > 0.05
    severity: P1
    runbook: runbooks/high-error-rate.md

  - name: data_corruption_detected
    condition: graph_integrity_check_failed > 0
    severity: P1
    runbook: runbooks/data-corruption.md
```

### High Priority Alerts (P2)

```yaml
alerts:
  - name: graphrag_latency_high
    condition: |
      histogram_quantile(0.95, graphrag_query_latency_seconds) > 2
    for: 5m
    severity: P2
    runbook: runbooks/latency-high.md

  - name: extraction_queue_backlog
    condition: extraction_queue_depth > 10000 for 10m
    severity: P2
    runbook: runbooks/extraction-backlog.md

  - name: entity_resolution_slow
    condition: |
      histogram_quantile(0.95, resolution_latency_seconds) > 0.5
    for: 5m
    severity: P2
    runbook: runbooks/resolution-slow.md

  - name: cache_hit_rate_low
    condition: cache_hit_rate{cache="entity"} < 0.5 for 10m
    severity: P2
    runbook: runbooks/cache-degraded.md
```

### Medium Priority Alerts (P3)

```yaml
alerts:
  - name: stale_summaries_high
    condition: stale_summaries_count > 500 for 1h
    severity: P3
    runbook: runbooks/stale-summaries.md

  - name: llm_cost_spike
    condition: |
      increase(llm_tokens_total[1h]) >
      2 * avg_over_time(increase(llm_tokens_total[1h])[24h:1h])
    severity: P3
    runbook: runbooks/llm-cost-spike.md

  - name: orphan_entities_high
    condition: orphan_entity_rate > 0.05 for 24h
    severity: P3
    runbook: runbooks/orphan-entities.md
```

---

## Dashboards

### System Health Dashboard

```yaml
dashboard: system_health
refresh: 30s
panels:
  - title: Service Status
    type: stat
    queries:
      - up{service=~"graphrag|search|extraction|resolution"}

  - title: Request Rate
    type: graph
    queries:
      - sum(rate(graphrag_requests_total[1m])) by (service)

  - title: Error Rate
    type: graph
    queries:
      - sum(rate(graphrag_errors_total[5m])) / sum(rate(graphrag_requests_total[5m]))
    thresholds:
      warning: 0.01
      critical: 0.05

  - title: Latency P95
    type: graph
    queries:
      - histogram_quantile(0.95, graphrag_query_latency_seconds)
      - histogram_quantile(0.95, search_latency_seconds)
    thresholds:
      warning: 500ms
      critical: 2s

  - title: Cache Hit Rates
    type: gauge
    queries:
      - cache_hit_rate by (cache_type)
```

### GraphRAG Query Dashboard

```yaml
dashboard: graphrag_queries
refresh: 1m
panels:
  - title: Queries by Mode
    type: piechart
    queries:
      - sum(rate(graphrag_requests_total[5m])) by (mode)

  - title: Latency by Mode
    type: graph
    queries:
      - histogram_quantile(0.50, graphrag_query_latency_seconds) by (mode)
      - histogram_quantile(0.95, graphrag_query_latency_seconds) by (mode)
      - histogram_quantile(0.99, graphrag_query_latency_seconds) by (mode)

  - title: Context Size Distribution
    type: heatmap
    queries:
      - graphrag_context_tokens_bucket

  - title: Entities per Query
    type: histogram
    queries:
      - local_search_entities_returned

  - title: Multi-Hop Steps
    type: bar
    queries:
      - histogram_quantile(0.50, multi_hop_steps_bucket)
      - histogram_quantile(0.95, multi_hop_steps_bucket)

  - title: LLM Token Usage
    type: graph
    queries:
      - sum(rate(llm_tokens_total[5m])) by (direction)  # in/out
```

### Ingestion Pipeline Dashboard

```yaml
dashboard: ingestion_pipeline
refresh: 30s
panels:
  - title: Queue Depths
    type: graph
    queries:
      - extraction_queue_depth
      - resolution_queue_depth

  - title: Extraction Throughput
    type: graph
    queries:
      - rate(entities_extracted_total[5m])

  - title: Resolution Performance
    type: graph
    queries:
      - histogram_quantile(0.95, resolution_latency_seconds)
      - resolution_match_rate

  - title: Entities by Type (Today)
    type: piechart
    queries:
      - increase(entity_count_total[24h]) by (entity_type)

  - title: Error Breakdown
    type: table
    queries:
      - topk(10, sum(rate(extraction_errors_total[1h])) by (error_type))
```

### Graph Health Dashboard

```yaml
dashboard: graph_health
refresh: 5m
panels:
  - title: Entity Count
    type: stat
    queries:
      - entity_count_total

  - title: Relationship Count
    type: stat
    queries:
      - relationship_count_total

  - title: Average Degree
    type: gauge
    queries:
      - average_entity_degree
    thresholds:
      warning: 50
      critical: 100

  - title: Community Distribution
    type: bar
    queries:
      - community_count by (level)

  - title: Modularity Score
    type: gauge
    queries:
      - community_modularity
    thresholds:
      warning: 0.3
      critical: 0.2

  - title: Stale Summaries
    type: stat
    queries:
      - stale_summaries_count

  - title: Graph Size Over Time
    type: graph
    queries:
      - entity_count_total
      - relationship_count_total
```

---

## Quality Monitoring

### Extraction Quality Sampling

```yaml
quality_sampling:
  extraction:
    sample_rate: 0.001  # 0.1% of extractions
    metrics:
      - entity_extraction_f1
      - relation_extraction_precision
      - relation_extraction_recall
    human_review:
      queue: extraction_review
      target_reviews_per_day: 100

  resolution:
    sample_rate: 0.01  # 1% of resolutions
    metrics:
      - resolution_precision
      - resolution_recall
    human_review:
      queue: resolution_review
      target_reviews_per_day: 50

  graphrag:
    sample_rate: 0.005  # 0.5% of queries
    metrics:
      - answer_relevance (1-5)
      - answer_faithfulness (1-5)
      - citation_accuracy (1-5)
    human_review:
      queue: answer_review
      target_reviews_per_day: 20
```

### Quality Alerts

```yaml
alerts:
  - name: extraction_quality_degraded
    condition: |
      avg_over_time(entity_extraction_f1[24h]) < 0.80
    severity: P3
    runbook: runbooks/extraction-quality.md

  - name: resolution_precision_low
    condition: |
      avg_over_time(resolution_precision[24h]) < 0.85
    severity: P3
    runbook: runbooks/resolution-quality.md

  - name: answer_quality_degraded
    condition: |
      avg_over_time(answer_relevance[24h]) < 3.5
    severity: P3
    runbook: runbooks/answer-quality.md
```

---

## Runbook References

| Alert | Runbook | Summary |
|-------|---------|---------|
| graphrag_service_down | [graphrag-down.md](runbooks/graphrag-down.md) | Check pods, logs, dependencies |
| graph_db_unavailable | [neo4j-down.md](runbooks/neo4j-down.md) | Check cluster status, failover |
| high_error_rate | [high-error-rate.md](runbooks/high-error-rate.md) | Check error types, recent deploys |
| latency_high | [latency-high.md](runbooks/latency-high.md) | Check graph load, cache, LLM |
| extraction_backlog | [extraction-backlog.md](runbooks/extraction-backlog.md) | Scale workers, check failures |
| cache_degraded | [cache-degraded.md](runbooks/cache-degraded.md) | Check Redis, invalidation patterns |
| stale_summaries | [stale-summaries.md](runbooks/stale-summaries.md) | Trigger regeneration, check community detection |
