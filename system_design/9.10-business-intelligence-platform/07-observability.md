# Business Intelligence Platform --- Observability

## Observability Philosophy

BI platform observability must answer three questions simultaneously: **Is the platform healthy?** (infrastructure metrics), **Are users getting good experiences?** (query and dashboard performance), and **Is the data trustworthy?** (freshness, correctness, completeness). Unlike typical services where request latency is the primary SLI, a BI platform's health is measured by the end-to-end time from user interaction to rendered insight---a pipeline spanning semantic compilation, query execution, caching, and client-side rendering.

---

## Key Metrics

### Query Performance Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `query.latency.p50` | Median query execution time | Informational; trend monitoring |
| `query.latency.p95` | 95th percentile query execution time | > 5s for cached; > 15s for uncached |
| `query.latency.p99` | 99th percentile query execution time | > 15s for cached; > 30s for uncached |
| `query.compilation_time` | Time to compile semantic model → SQL | > 200ms p95 |
| `query.queue_time` | Time spent waiting for execution slot | > 2s p95 |
| `query.throughput` | Queries per second (total, by source type) | Capacity planning; trend monitoring |
| `query.error_rate` | Percentage of queries that fail or timeout | > 1% over 5-min window |
| `query.timeout_rate` | Queries exceeding timeout threshold | > 0.5% over 5-min window |
| `query.rows_scanned` | Average/max rows scanned per query | Trend monitoring; cost optimization |
| `query.bytes_transferred` | Data transferred from sources per query | Cost monitoring for pay-per-query sources |

### Dashboard Performance Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `dashboard.load_time.p50` | Median time from navigation to full render | > 2s |
| `dashboard.load_time.p95` | 95th percentile full dashboard load | > 5s |
| `dashboard.load_time.p99` | 99th percentile full dashboard load | > 10s |
| `dashboard.first_widget_time` | Time to first widget render (perceived speed) | > 1.5s p95 |
| `dashboard.widget_count_avg` | Average widgets per dashboard load | Capacity planning |
| `dashboard.interaction_latency` | Filter change to re-render completion | > 2s p95 |
| `dashboard.error_rate` | Dashboard loads with one or more widget errors | > 2% |
| `dashboard.concurrent_sessions` | Active dashboard viewing sessions | Capacity planning |
| `dashboard.render_time_client` | Client-side rendering time (chart drawing) | > 500ms p95 |

### Cache Performance Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `cache.hit_rate.l1` | L1 (in-memory) cache hit rate | < 60% |
| `cache.hit_rate.l2` | L2 (distributed) cache hit rate | < 75% |
| `cache.hit_rate.overall` | Overall cache hit rate across all tiers | < 80% |
| `cache.eviction_rate` | Entries evicted per second (by tier) | Trend monitoring; capacity planning |
| `cache.memory_utilization` | Cache memory usage percentage | > 85% |
| `cache.invalidation_rate` | Cache entries invalidated per second | Spike detection (invalidation storms) |
| `cache.stale_serve_rate` | Percentage of requests served from stale cache | > 10% (indicates source issues) |

### Extract & Data Freshness Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `extract.freshness` | Time since last successful extract per source | > 2x scheduled interval |
| `extract.success_rate` | Percentage of extract jobs completing successfully | < 95% |
| `extract.duration` | Extract job execution time | > 2x historical average |
| `extract.rows_processed` | Rows extracted per job | Anomaly detection (sudden drops/spikes) |
| `extract.queue_depth` | Pending extract jobs in queue | > 1000 |
| `extract.staleness_max` | Maximum staleness across all active extracts | > 24 hours |
| `extract.failure_streak` | Consecutive failures for a single extract | > 3 |

### Semantic Layer Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `semantic.compilation_time` | Time to compile model from DSL to query plan | > 200ms p95 |
| `semantic.model_count` | Total active semantic models | Capacity planning |
| `semantic.validation_errors` | Model validation failures during compilation | > 0 (alerts model owners) |
| `semantic.cache_hit_rate` | Compiled model cache hit rate | < 90% |
| `semantic.rls_injection_time` | Time to evaluate and inject RLS predicates | > 50ms p95 |

### User Engagement Metrics

| Metric | Description | Purpose |
|--------|-------------|---------|
| `usage.dau` | Daily active users | Business health |
| `usage.dashboard_views` | Dashboard views per day (by tenant, dashboard) | Content governance |
| `usage.query_count_per_user` | Queries per user per session | Identify power users vs. passive viewers |
| `usage.stale_dashboards` | Dashboards not viewed in 90+ days | Content cleanup governance |
| `usage.popular_fields` | Most queried dimensions and measures | Optimize pre-aggregation and caching |
| `usage.nlq_adoption` | Natural language query usage rate | Feature adoption |
| `usage.embed_views` | Embedded dashboard views per day | Embedded analytics health |
| `usage.export_count` | PDF/CSV exports per day | Data exfiltration monitoring |

---

## Distributed Tracing

### Trace Structure for Dashboard Load

```
Dashboard Load Trace (trace_id: abc-123)
│
├── [SPAN] api_gateway.authenticate (5ms)
│
├── [SPAN] dashboard_engine.load_definition (12ms)
│   └── [SPAN] metadata_db.query (8ms)
│
├── [SPAN] dashboard_engine.build_widget_tree (3ms)
│
├── [SPAN] dashboard_engine.execute_widgets (parallel)
│   │
│   ├── [SPAN] widget_1.execute (450ms)
│   │   ├── [SPAN] semantic.compile (25ms)
│   │   ├── [SPAN] rls.inject_predicates (8ms)
│   │   ├── [SPAN] query.compile_sql (15ms)
│   │   ├── [SPAN] cache.lookup (2ms) → MISS
│   │   ├── [SPAN] query.execute (380ms)
│   │   │   ├── [SPAN] connection_pool.acquire (12ms)
│   │   │   └── [SPAN] datasource.execute_sql (365ms)
│   │   └── [SPAN] cache.store (3ms)
│   │
│   ├── [SPAN] widget_2.execute (45ms)
│   │   ├── [SPAN] semantic.compile (20ms)
│   │   ├── [SPAN] cache.lookup (2ms) → HIT
│   │   └── [SPAN] cache.deserialize (5ms)
│   │
│   ├── [SPAN] widget_3.execute (1200ms)
│   │   ├── [SPAN] semantic.compile (30ms)
│   │   ├── [SPAN] query.execute (1150ms) ← SLOW QUERY
│   │   │   └── [TAG] rows_scanned: 50,000,000
│   │   └── [SPAN] cache.store (5ms)
│   │
│   └── [SPAN] widget_4.execute (200ms)
│       └── ...
│
└── [SPAN] dashboard_engine.stream_results (15ms)

Total: 1230ms (dominated by widget_3 slow query)
```

### Trace Tags for BI Queries

| Tag | Description |
|-----|-------------|
| `tenant_id` | Tenant identifier |
| `user_id` | User identifier (hashed for privacy) |
| `dashboard_id` | Dashboard being rendered |
| `widget_id` | Specific widget within dashboard |
| `explore` | Semantic model explore name |
| `data_source_type` | Type of underlying data source |
| `cache_hit` | Whether result was served from cache |
| `cache_tier` | Which cache tier served the result (L1/L2/L3) |
| `rls_applied` | Whether RLS predicates were injected |
| `query_fingerprint` | Normalized query hash (for deduplication analysis) |
| `rows_scanned` | Rows scanned by the data source |
| `rows_returned` | Rows returned in result set |
| `generated_sql_hash` | Hash of generated SQL (link to query log) |

---

## Logging Strategy

### Structured Log Categories

| Category | Log Level | Content | Retention |
|----------|-----------|---------|-----------|
| **Query Log** | INFO | Generated SQL, execution time, source, rows, cache status, user (hashed) | 90 days |
| **Access Log** | INFO | Dashboard/explore access, user, timestamp, action type | 1 year |
| **Error Log** | ERROR | Query failures, compilation errors, connection failures, stack traces | 180 days |
| **Audit Log** | INFO | Permission changes, model deployments, data source config changes | 5 years |
| **Extract Log** | INFO | Extract start/complete, rows processed, duration, errors | 180 days |
| **Security Log** | WARN/ERROR | Failed auth, RLS bypass attempts, rate limit hits, suspicious export patterns | 2 years |
| **Performance Log** | DEBUG | Slow query details, compilation bottlenecks, cache eviction reasons | 30 days |

### Query Log Entry Structure

```
{
    "timestamp": "2025-12-15T10:30:45.123Z",
    "trace_id": "abc-123",
    "tenant_id": "tenant-456",
    "user_id_hash": "sha256:a1b2c3...",
    "source": "dashboard",
    "dashboard_id": "dash-789",
    "widget_id": "w-001",
    "explore": "orders",
    "measures": ["orders.total_revenue"],
    "dimensions": ["orders.created_quarter", "users.region"],
    "filter_count": 3,
    "rls_policies_applied": 2,
    "generated_sql_hash": "sha256:d4e5f6...",
    "data_source_type": "snowflake",
    "cache_hit": false,
    "cache_tier": null,
    "execution_time_ms": 380,
    "queue_time_ms": 12,
    "compilation_time_ms": 25,
    "rows_scanned": 5000000,
    "rows_returned": 48,
    "bytes_transferred": 2400,
    "status": "completed"
}
```

---

## Alerting Strategy

### Alert Hierarchy

```
Severity Levels:
┌─────────────────────────────────────────────────────────┐
│ P0 - CRITICAL (page immediately)                         │
│   • Platform-wide query failure rate > 10%               │
│   • RLS bypass detected in audit scan                    │
│   • Metadata database unavailable                        │
│   • Zero cache hit rate (cache infrastructure failure)   │
├─────────────────────────────────────────────────────────┤
│ P1 - HIGH (page within 15 min)                           │
│   • Dashboard p95 load time > 10s for 15+ minutes        │
│   • Single data source failure affecting 100+ users      │
│   • Extract failure rate > 20% across platform           │
│   • Cache hit rate below 50% for 30+ minutes             │
├─────────────────────────────────────────────────────────┤
│ P2 - MEDIUM (ticket, next business day)                  │
│   • Dashboard p95 load time > 5s for 1+ hour             │
│   • Extract staleness > 2x scheduled interval            │
│   • Semantic model compilation errors increasing          │
│   • Query queue depth consistently > 500                 │
├─────────────────────────────────────────────────────────┤
│ P3 - LOW (weekly review)                                 │
│   • Cache hit rate trending downward                     │
│   • Query volume approaching capacity threshold          │
│   • Stale dashboard count growing                        │
│   • Extract job duration trending upward                 │
└─────────────────────────────────────────────────────────┘
```

### Smart Alert Enrichment

When an alert fires, the alerting system automatically enriches it with:

| Enrichment | Source | Purpose |
|-----------|--------|---------|
| Affected tenants | Query logs | Scope the impact |
| Affected dashboards | Widget → dashboard mapping | Identify business impact |
| Recent changes | Model deployment log, infra change log | Likely root cause |
| Historical comparison | Metric time series | Is this anomalous or a trend? |
| Related alerts | Alert correlation engine | Identify cascade vs. independent issues |

---

## Observability Dashboards (Internal)

### Dashboard 1: Platform Health Overview

```
┌─────────────────────┬──────────────────────┬──────────────────────┐
│ Query Success Rate   │ Dashboard Load p95   │ Cache Hit Rate       │
│ [99.92%] ✓           │ [3.2s] ✓             │ [82%] ✓              │
├─────────────────────┼──────────────────────┼──────────────────────┤
│ Active Sessions      │ Queries/sec          │ Extract Freshness    │
│ [145,230]            │ [18,400]             │ [All within SLA] ✓   │
├─────────────────────┴──────────────────────┴──────────────────────┤
│ [Time-series: Query latency by percentile (p50/p95/p99)]          │
├───────────────────────────────────────────────────────────────────┤
│ [Heatmap: Query latency by data source type]                      │
├───────────────────────────────────────────────────────────────────┤
│ [Table: Top 10 slowest queries in last hour]                      │
└───────────────────────────────────────────────────────────────────┘
```

### Dashboard 2: Tenant Health

```
┌───────────────────────────────────────────────────────────────────┐
│ [Searchable table: Per-tenant metrics]                            │
│ Tenant │ DAU │ QPS │ p95 Latency │ Cache Hit │ Extract Status     │
│ Acme   │ 2.3K│  85 │     2.1s    │    87%    │ ✓ Fresh            │
│ Globex │ 5.1K│ 230 │     4.8s    │    72%    │ ⚠ Stale (2h)      │
│ ...    │     │     │             │           │                     │
├───────────────────────────────────────────────────────────────────┤
│ [Chart: Query volume by tenant (top 20)]                          │
├───────────────────────────────────────────────────────────────────┤
│ [Chart: Resource utilization by tenant tier]                      │
└───────────────────────────────────────────────────────────────────┘
```

### Dashboard 3: Cache Effectiveness

```
┌─────────────────────┬──────────────────────┬──────────────────────┐
│ L1 Hit Rate          │ L2 Hit Rate          │ L3 Hit Rate          │
│ [65%]                │ [78%]                │ [85%]                │
├─────────────────────┴──────────────────────┴──────────────────────┤
│ [Time-series: Hit rate by tier over 24 hours]                     │
├───────────────────────────────────────────────────────────────────┤
│ [Chart: Cache eviction reasons (TTL expired, LRU, invalidation)] │
├───────────────────────────────────────────────────────────────────┤
│ [Chart: Invalidation events by trigger (data refresh, model      │
│  change, permission update)]                                      │
├───────────────────────────────────────────────────────────────────┤
│ [Table: Queries with highest cache miss cost (freq × latency)]   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Health Checks

### Component Health Checks

| Component | Health Check | Interval | Timeout |
|-----------|-------------|----------|---------|
| Semantic Compiler | Compile a test model; verify SQL output matches expected | 30s | 5s |
| Query Executor | Execute `SELECT 1` against each data source type | 30s | 10s |
| Cache Cluster | Get/set test key; verify cluster membership | 15s | 3s |
| Metadata Database | Read test row; verify replication lag | 15s | 5s |
| Extract Workers | Verify worker registration and heartbeat | 30s | 5s |
| WebSocket Gateway | Establish test connection; verify message round-trip | 30s | 5s |
| Search Index | Execute test query; verify result freshness | 60s | 10s |
| Export Service | Render a test PDF; verify output validity | 60s | 15s |

### Synthetic Monitoring

Synthetic tests run continuously, simulating real user workflows:

| Test Scenario | Frequency | What It Validates |
|--------------|-----------|-------------------|
| Load a popular dashboard end-to-end | Every 2 min | Full pipeline: auth → semantic → query → render |
| Execute ad-hoc explore query | Every 5 min | Semantic compilation, query execution, result delivery |
| Trigger an embed token and load embedded dashboard | Every 5 min | Embed authentication, RLS enforcement, rendering |
| Change a dashboard filter and measure re-render time | Every 5 min | Interactive performance, cache invalidation behavior |
| Run NLQ query | Every 10 min | NLP pipeline, semantic mapping, query execution |
| Generate scheduled report PDF | Every 15 min | Export pipeline, PDF rendering, delivery mechanism |
