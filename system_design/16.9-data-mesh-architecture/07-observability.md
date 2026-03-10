# Observability — Data Mesh Architecture

## Metrics (USE/RED)

### Key Metrics to Track

#### Data Product Health Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `dp.freshness.age_seconds` | Gauge | Time since last data refresh per product | > declared SLO threshold |
| `dp.quality.completeness_pct` | Gauge | Percentage of non-NULL values per required field | < declared SLO threshold |
| `dp.quality.schema_conformance` | Gauge | Percentage of records passing schema validation | < 99% |
| `dp.quality.custom_rules_passed` | Gauge | Percentage of custom quality rules passing | < declared threshold |
| `dp.quality.composite_score` | Gauge | Weighted composite quality score (0.0-1.0) | < 0.8 |
| `dp.slo.compliance_rate` | Gauge | Percentage of time the product meets its declared SLOs | < 95% |
| `dp.consumers.active_count` | Gauge | Number of active consumers in last 30 days | — (informational) |
| `dp.consumers.query_count` | Counter | Total queries against the product | — (informational) |
| `dp.status` | Gauge | Current lifecycle status (published/deprecated/degraded) | Status changed to DEGRADED |

#### Platform Service Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `catalog.search.latency_ms` | Histogram | Discovery search response time | p99 > 500ms |
| `catalog.search.result_count` | Histogram | Number of results per search query | Avg > 500 (noise) |
| `catalog.registration.latency_ms` | Histogram | Time to register a data product | p99 > 60s |
| `catalog.products.total` | Gauge | Total registered data products | — (capacity planning) |
| `catalog.products.by_status` | Gauge | Products by status (published, deprecated, draft) | Deprecated > 20% of total |

#### Governance Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `governance.evaluation.latency_ms` | Histogram | Policy evaluation duration | p99 > 30s |
| `governance.evaluation.pass_rate` | Gauge | Percentage of products passing all policies | < 80% (systemic issue) |
| `governance.violations.count` | Counter | Policy violations by category and severity | ERROR count > 0 (blocking) |
| `governance.policies.total` | Gauge | Total active governance policies | — (complexity tracking) |
| `governance.coverage_pct` | Gauge | Percentage of known datasets registered as governed products | < 70% |

#### Lineage Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `lineage.graph.nodes` | Gauge | Total nodes in lineage graph | — (capacity planning) |
| `lineage.graph.edges` | Gauge | Total edges in lineage graph | — (capacity planning) |
| `lineage.query.latency_ms` | Histogram | Lineage traversal response time | p99 > 2s |
| `lineage.cross_domain.edges` | Gauge | Cross-domain dependency count | — (mesh connectivity health) |
| `lineage.orphaned_products` | Gauge | Products with no upstream or downstream dependencies | > 30% of total (isolation concern) |

#### Federated Query Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `query.federated.latency_ms` | Histogram | Cross-domain query response time | p99 > 30s |
| `query.federated.domains_accessed` | Histogram | Number of domains accessed per query | > 5 (complexity warning) |
| `query.federated.subquery_timeout` | Counter | Subqueries that timed out per domain | > 5% per domain |
| `query.federated.partial_results` | Counter | Queries returning partial results | > 1% |
| `query.access.denied` | Counter | Queries denied by access control | Sudden spike (possible attack) |

#### Mesh Health Metrics (Aggregate)

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|----------------|
| `mesh.products.slo_compliant_pct` | Gauge | Percentage of products meeting SLOs | < 90% |
| `mesh.products.avg_quality_score` | Gauge | Average quality score across all products | < 0.75 |
| `mesh.domains.active` | Gauge | Domains with at least one published product | — |
| `mesh.domains.publishing_cadence` | Gauge | Average days between publishes per domain | > 30 days (stale domain) |
| `mesh.contracts.active` | Gauge | Total active data contracts | — |
| `mesh.contracts.violation_rate` | Gauge | Percentage of publishes that violate contracts | > 5% |

### Dashboard Design

**Dashboard 1: Mesh Health Overview**
- Total data products by status (published, deprecated, draft) — stacked bar
- SLO compliance rate across all products — gauge
- Average quality score trend — time series
- Active domains and publishing cadence — heatmap
- Cross-domain dependency count — time series
- Governance coverage percentage — gauge

**Dashboard 2: Data Product Detail (per product)**
- Freshness timeline — time series showing time-since-refresh vs. SLO threshold
- Quality score breakdown — stacked area (completeness, conformance, custom rules)
- Consumer activity — query count over time
- SLO compliance history — time series with violation markers
- Schema version timeline — event markers on time axis
- Lineage subgraph — interactive dependency graph

**Dashboard 3: Governance & Compliance**
- Policy evaluation pass/fail rates — stacked bar by category
- Violation trends by severity (ERROR vs. WARNING) — time series
- Top violated policies — ranked table
- Governance coverage by domain — heatmap
- Access grant expiration forecast — burndown chart
- PII classification coverage — gauge per domain

**Dashboard 4: Federated Query Performance**
- Cross-domain query latency distribution — histogram
- Subquery latency by domain — box plot comparison
- Timeout rate by domain — bar chart
- Most expensive queries — top-K table
- Partial result frequency — time series

---

## Logging

### What to Log

| Event | Log Level | Content |
|-------|-----------|---------|
| Product registration | INFO | Product ID, domain, owner, schema summary, governance result |
| Governance evaluation | INFO | Product ID, policies evaluated, pass/fail, violations |
| Contract validation | INFO | Producer ID, consumer IDs, compatibility result, violations |
| Consumer data access | INFO | Consumer ID, product ID, query type, rows returned, latency |
| Access denial | WARN | Consumer ID, product ID, denied reason, policy that denied |
| SLO violation | WARN | Product ID, SLO metric, expected value, actual value |
| Schema change detected | INFO | Product ID, old version, new version, change summary |
| Product deprecation | INFO | Product ID, deprecated by, sunset date, consumers notified |
| Governance policy change | INFO | Policy ID, changed by, before/after summary |
| Cross-domain query failure | WARN | Query ID, domains involved, failing domain, error type |
| Data quality anomaly | WARN | Product ID, metric, expected range, actual value, deviation |

### Log Levels Strategy

| Level | Production Volume | Use Case |
|-------|------------------|----------|
| ERROR | < 50/min | Platform service failures, metadata store errors, unrecoverable publish failures |
| WARN | < 500/min | SLO violations, access denials, contract violations, quality anomalies |
| INFO | < 5,000/min | Product registrations, governance evaluations, consumer queries |
| DEBUG | Disabled in prod | Policy rule execution details, search ranking scores, caching decisions |
| TRACE | Never in prod | Individual field-level contract checks, lineage graph traversal steps |

### Structured Logging Format

```
{
  "timestamp": "2026-03-10T14:32:01.234Z",
  "level": "WARN",
  "component": "quality_monitor",
  "event": "slo_violation",
  "product_id": "urn:dp:sales:customer-ltv:1.2.0",
  "domain": "sales",
  "owner_team": "sales-analytics",
  "slo_metric": "freshness",
  "slo_target": "< 24 hours",
  "actual_value": "26.5 hours",
  "violation_duration_minutes": 150,
  "consumers_affected": 12,
  "alert_sent": true
}
```

---

## Distributed Tracing

### Trace Propagation Strategy

Data mesh operations span multiple services. A data product registration touches the publishing pipeline, contract validator, governance engine, catalog, and lineage service — all of which must be traceable as a single operation.

**Trace context propagation:**

```
Domain Team Submit
  └── Publishing Pipeline
        ├── Contract Validator
        │     └── Consumer Contract Lookup (per consumer)
        ├── Governance Engine
        │     └── Policy Evaluation (per policy)
        ├── Catalog Registration
        │     └── Metadata Store Write
        ├── Lineage Update
        │     └── Graph Store Write
        └── Quality Monitor Initialization
              └── SLO Configuration
```

### Key Spans to Instrument

| Span | Parent | Key Attributes |
|------|--------|---------------|
| `publish.pipeline` | Root | product_id, domain, version |
| `contract.validate` | pipeline | consumer_count, compatibility_mode |
| `governance.evaluate` | pipeline | policy_count, pass, violations |
| `catalog.register` | pipeline | metadata_size, index_update_time |
| `lineage.update` | pipeline | edges_added, cross_domain_edges |
| `quality.initialize` | pipeline | slo_count, rules_configured |
| `query.federated` | Root | domains_accessed, subquery_count |
| `query.subquery` | federated | domain, latency, rows_returned |
| `access.evaluate` | query | consumer_id, product_id, decision |

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Severity | Runbook |
|-------|-----------|----------|---------|
| **Metadata store unreachable** | Health check fails for > 60s | P1 | Verify replica health; check network; failover if needed |
| **Governance engine down** | All instances unhealthy for > 120s | P1 | Publishing is blocked; restart instances; check metadata store connectivity |
| **Mass SLO violation** | > 20% of products violating SLOs simultaneously | P1 | Check shared infrastructure; identify common upstream failure |
| **Data quality anomaly** | Quality score drops > 30% in 1 hour for any product | P1 | Contact product owner; check upstream data sources; consider rollback |
| **Access control bypass detected** | Data access without valid authorization token | P1 | Immediate investigation; revoke compromised tokens; audit access logs |

### Warning Alerts

| Alert | Condition | Severity | Runbook |
|-------|-----------|----------|---------|
| **Product SLO violation** | Single product violating freshness or quality SLO | P2 | Notify product owner; check domain pipeline health |
| **Contract violation on publish** | Product publish blocked by contract incompatibility | P2 | Review schema change; coordinate with affected consumers |
| **High governance failure rate** | > 30% of publishes failing governance in a domain | P2 | Review domain's publishing practices; check for policy clarity issues |
| **Lineage graph inconsistency** | Orphaned edges or missing nodes detected | P3 | Run lineage reconciliation job; check recent publish events |
| **Catalog search degradation** | Search latency p99 > 1 second for > 10 min | P3 | Check search index health; consider reindexing |
| **Stale domain** | Domain has not published in > 60 days | P3 | Contact domain lead; verify domain is still active |
| **Access grant expiration surge** | > 50 grants expiring in next 7 days | P3 | Notify consumers to renew access before expiration |

### Runbook References

| Runbook | Scenario | Key Steps |
|---------|----------|-----------|
| RB-001 | Metadata store failover | Verify replica lag → Promote secondary → Update service connections → Verify catalog operations |
| RB-002 | Mass SLO violation triage | Identify common upstream → Check shared infrastructure → Contact affected domain owners → Communicate to consumers |
| RB-003 | Data quality incident | Identify affected product → Quarantine (mark DEGRADED) → Notify consumers → Root cause analysis → Rollback or fix → Restore status |
| RB-004 | Governance policy rollback | Identify problematic policy → Revert to previous version → Re-evaluate affected products → Communicate to domains |
| RB-005 | Cross-domain query performance degradation | Identify slow domain → Check domain storage health → Consider materialized view → Adjust query timeouts |
