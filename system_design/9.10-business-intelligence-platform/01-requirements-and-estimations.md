# Business Intelligence Platform --- Requirements & Estimations

## Functional Requirements

### Core Capabilities

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-01 | **Semantic Layer / Metrics Store** | Define reusable measures (aggregations), dimensions (grouping attributes), and relationships (join graphs) in a modeling DSL; compile to optimized SQL; enforce single source of truth for metric definitions |
| FR-02 | **Dashboard Builder** | Drag-and-drop dashboard creation with widget grid layout; support chart types (bar, line, area, scatter, pie, map, pivot table, KPI card); cross-filter and linked-parameter interactions between widgets |
| FR-03 | **Ad-Hoc Query Explorer** | Free-form data exploration with measure/dimension selection, filter builder, pivot/unpivot, and calculated field creation; progressive result loading for large result sets |
| FR-04 | **Data Source Connectivity** | JDBC/ODBC connectors to 50+ databases and warehouses; live connection and scheduled extract modes; connection pooling with credential vault integration |
| FR-05 | **Extract / Refresh Engine** | Schedule-based data extraction from source databases into optimized local storage (columnar format); incremental and full refresh strategies; extract dependency chains |
| FR-06 | **Visualization Grammar** | Declarative chart specification language (Vega-like) supporting encoding channels (x, y, color, size, shape), aggregations, transformations, scales, axes, and legends |
| FR-07 | **Row-Level Security (RLS)** | Define data access policies that restrict query results based on user attributes (department, region, role); policies enforced at semantic layer, injected as WHERE predicates |
| FR-08 | **Embedded Analytics** | Embed dashboards in third-party applications via iframe, JavaScript SDK, or API-rendered images; support SSO token passthrough, white-labeling, and responsive layouts |
| FR-09 | **Scheduled Reports & Alerts** | Schedule dashboard snapshots as PDF/image delivery via email or webhook; define threshold-based alerts that trigger notifications when metrics cross boundaries |
| FR-10 | **Collaboration & Annotations** | Comment on dashboards and individual data points; share dashboards with granular permissions; version history with rollback; folders and collections for organization |
| FR-11 | **Natural Language Query (NLQ)** | Translate natural language questions ("What was Q3 revenue by region?") to semantic layer queries; leverage the semantic model for disambiguation and validation |
| FR-12 | **OLAP Operations** | Support drill-down (Quarter → Month → Week), drill-through (summary → detail rows), roll-up (aggregate to higher dimension), slice (fix one dimension), and dice (select multiple dimension values) |

### Supporting Capabilities

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-13 | **Data Catalog & Search** | Search across dashboards, saved queries, semantic model fields, and data sources; auto-generated documentation from semantic model metadata |
| FR-14 | **Custom Calculations** | User-defined calculated fields using expression language (table calculations, window functions, LOD expressions for level-of-detail control) |
| FR-15 | **Multi-Database Joins** | Join data across different database connections within a single query; federated query execution with push-down optimization |
| FR-16 | **Usage Analytics** | Track dashboard views, query patterns, popular fields, stale dashboards, and user adoption metrics to inform content governance |
| FR-17 | **Version Control Integration** | Git-based version control for semantic model definitions; branch/merge workflow for model changes; CI/CD for model validation and deployment |
| FR-18 | **API Access** | REST and GraphQL APIs for programmatic dashboard management, query execution, user provisioning, and metadata access |

---

## Non-Functional Requirements

### Performance

| Metric | Target | Justification |
|--------|--------|---------------|
| Dashboard initial load (cached) | < 2 seconds | Users abandon dashboards after 3s; competitive platforms target sub-2s |
| Dashboard initial load (uncached) | < 8 seconds | Includes query execution against warehouse; acceptable for first view |
| Widget re-render on filter change | < 1 second | Cached queries with parameter substitution; progressive rendering |
| Query compilation (semantic → SQL) | < 100ms | Semantic layer compilation must not be the bottleneck |
| Extract refresh (incremental) | < 5 minutes | For datasets up to 100M rows with incremental strategy |
| NLQ response time | < 3 seconds | Natural language → query → result → visualization pipeline |

### Scalability

| Metric | Target | Justification |
|--------|--------|---------------|
| Concurrent dashboard sessions | 200K+ | Global enterprise deployment across time zones |
| Queries per second (platform-wide) | 50K+ | Each dashboard generates 5--20 concurrent queries |
| Semantic model compilation throughput | 10K models/min | Batch recompilation during model updates |
| Data sources connected | 500K+ | Across all tenants with connection pool limits per tenant |
| Extract storage capacity | 500 TB+ | Columnar extracts across all tenants |

### Reliability

| Metric | Target | Justification |
|--------|--------|---------------|
| Platform availability | 99.95% | BI is critical for business decisions; 22 min/month downtime budget |
| Query execution success rate | 99.9% | Timeout and retry for transient warehouse errors |
| Scheduled report delivery | 99.5% | Email/webhook delivery with retry; audit trail for compliance |
| Extract refresh success rate | 99.0% | Source database outages and schema changes cause failures; alerting and retry |
| Data loss (metadata) | Zero | Dashboard definitions, permissions, and semantic models are irreplaceable |

### Security & Compliance

| Metric | Target | Justification |
|--------|--------|---------------|
| Row-level security enforcement | 100% | Every query must pass through RLS policy evaluation; no bypass paths |
| Credential encryption | AES-256 at rest | Database passwords, API keys stored in encrypted vault |
| Audit logging | Complete | Every query, dashboard access, permission change, and export logged |
| SOC 2 Type II compliance | Certified | Required for enterprise SaaS deployment |
| GDPR compliance | Full | User data subject requests, data minimization, consent tracking |

---

## Capacity Estimations

### User Base & Activity

```
Total tenants:           10,000
Total users:             5,000,000
Daily active users:      1,000,000 (20% DAU)
Dashboards per tenant:   ~2,000 (20M total)
Dashboard views per day: 50,000,000
Avg widgets per dash:    10
Queries per day:         500,000,000 (50M views × 10 widgets)
```

### Query Load

```
Queries per second (avg): 500M / 86,400 ≈ 5,800 QPS
Queries per second (peak): 5,800 × 4 ≈ 23,000 QPS (business hours spike)
Cache hit rate target:    80%
Uncached queries/sec:     23,000 × 0.20 = 4,600 QPS (forwarded to data sources)
Avg cached query result:  50 KB
Avg uncached query time:  3 seconds
```

### Storage

```
Semantic model metadata:  ~200K models × 500 KB = 100 GB
Dashboard definitions:    20M × 20 KB = 400 GB
Query result cache:       2B entries × 50 KB avg = 100 TB (distributed)
Extract storage:          500 TB (columnar format, compressed)
Audit logs:               ~10 TB/year (query logs, access logs)
User/permission data:     ~50 GB
```

### Network & Bandwidth

```
Dashboard payload (avg):  500 KB (widget configs + initial data)
Dashboard views/sec:      50M / 86,400 ≈ 580/sec
Dashboard bandwidth:      580 × 500 KB ≈ 290 MB/s outbound
Query result streaming:   5,800 QPS × 50 KB ≈ 290 MB/s internal
Extract refresh traffic:  5M jobs/day × 100 MB avg = 500 TB/day ingest
WebSocket connections:    200K concurrent (dashboard interactivity)
```

### Compute

```
Query compilation:        23,000/sec × 10ms avg = 230 CPU-seconds/sec → ~250 cores
Dashboard rendering:      580/sec × 50ms avg = 29 CPU-seconds/sec → ~30 cores
Extract processing:       5M/day = ~58/sec × 30s avg = 1,740 CPU-seconds/sec → ~1,800 cores
Cache management:         Distributed across 200+ cache nodes
Semantic layer:           Model resolution + RLS injection = ~100 cores
```

---

## SLOs and SLIs

### Service Level Objectives

| SLO | Target | Measurement Window |
|-----|--------|--------------------|
| Dashboard availability | 99.95% | Rolling 30 days |
| Query success rate | 99.9% | Rolling 7 days |
| Dashboard load time (p50) | < 1.5s | Rolling 24 hours |
| Dashboard load time (p95) | < 5s | Rolling 24 hours |
| Dashboard load time (p99) | < 10s | Rolling 24 hours |
| Query latency (cached, p95) | < 200ms | Rolling 24 hours |
| Query latency (uncached, p95) | < 8s | Rolling 24 hours |
| Extract refresh completion | 99.0% | Rolling 7 days |
| Scheduled report delivery | 99.5% | Rolling 7 days |
| RLS policy enforcement | 100% | Continuous |

### Service Level Indicators

| SLI | Measurement Method |
|-----|--------------------|
| Dashboard load time | Client-side instrumentation: time from navigation to last widget render complete |
| Query latency | Server-side: time from query receipt to result delivery (excluding network) |
| Cache hit rate | Cache proxy metrics: hits / (hits + misses) per tier |
| Extract freshness | Timestamp comparison: current time - last successful extract completion |
| Query success rate | (Total queries - timeouts - errors) / Total queries |
| Concurrent sessions | WebSocket connection count + active HTTP session count |
| RLS enforcement | Audit sampling: percentage of queries with RLS predicates correctly applied |

---

## Error Budget Policy

| Condition | Action |
|-----------|--------|
| Availability < 99.95% in 30-day window | Freeze feature deployments; focus on reliability fixes |
| Dashboard p95 latency > 5s for 4+ hours | Escalate to query optimization team; review cache hit rates |
| Cache hit rate drops below 70% | Investigate cache invalidation storms; expand cache capacity |
| Extract failure rate > 5% | Review source database health; escalate connector issues |
| RLS bypass detected | Incident severity P0; immediate rollback; security review |

---

## Capacity Planning Triggers

| Metric | Threshold | Scaling Action |
|--------|-----------|----------------|
| Query queue depth | > 1000 for 5 min | Add query execution workers |
| Cache memory utilization | > 80% | Expand cache cluster or adjust TTLs |
| Extract processing queue | > 10K pending jobs | Add extract worker nodes |
| Dashboard rendering latency p95 | > 3s | Scale rendering service horizontally |
| Data source connection pool exhaustion | > 90% utilization | Increase pool size or add connection proxy nodes |
| Semantic layer compilation time | > 200ms p95 | Cache compiled models more aggressively; optimize compiler |
| WebSocket connection count | > 180K | Add WebSocket gateway nodes |
