# Scalability & Reliability — Data Mesh Architecture

## Scalability

### Organizational Scaling (The Primary Scaling Dimension)

Unlike most system designs where scaling means adding servers, data mesh scaling is primarily organizational: adding new domains, new teams, and new data products without degrading the platform's ability to govern, discover, and compose them.

| Growth Dimension | Scale Challenge | Strategy |
|-----------------|----------------|----------|
| More domains (10 → 100) | Governance federation becomes unwieldy | Hierarchical governance: domain clusters with delegates |
| More products per domain (5 → 50) | Catalog noise; discovery becomes harder | Faceted search, domain-curated collections, quality scoring |
| More consumers (100 → 10,000) | Access management overhead; query load | Self-serve access policies; federated query engine scaling |
| More cross-domain dependencies | Lineage graph complexity; impact analysis cost | Graph database scaling; materialized impact summaries |
| More governance policies | Evaluation latency; policy conflicts | Policy tiering, caching, incremental evaluation |

### Platform Infrastructure Scaling

| Component | Scaling Strategy | Trigger |
|-----------|-----------------|---------|
| Catalog Service | Horizontal (stateless instances behind load balancer) | QPS > 100 per instance |
| Search Index | Shard by domain; replicate for read throughput | Index size > 50 GB or search latency > 500ms p99 |
| Governance Engine | Horizontal (stateless; policies loaded from store) | Evaluation queue depth > 50 |
| Lineage Graph Store | Vertical first (graph fits in memory); horizontal via graph partitioning | Graph exceeds 1M nodes |
| Contract Validator | Horizontal (stateless computation) | Validation queue depth > 20 |
| Access Control | Horizontal + caching (policy decisions are cacheable) | Evaluation QPS > 1,000 |
| Federated Query Engine | Horizontal (add worker nodes) | Concurrent queries > 50 |
| Event Bus | Partition by domain | Event throughput > 10K/s |
| Metadata Store | Replicated document store with read replicas | Read QPS > 500 |

### Data Product Storage Scaling

Each domain manages its own storage, but the platform provides guidance and templates:

| Pattern | When to Use | Approach |
|---------|-------------|----------|
| Small products (< 1 GB) | Reference data, dimension tables | Single-file Parquet on object storage |
| Medium products (1-100 GB) | Transactional aggregates, feature stores | Partitioned Parquet/Iceberg tables |
| Large products (100 GB - 10 TB) | Event history, behavioral logs | Iceberg/Delta tables with time-based partitioning |
| Very large products (> 10 TB) | Raw event streams, sensor data | Partitioned object storage with columnar format |

### Caching Layers

| Layer | Component | Strategy | Size |
|-------|-----------|----------|------|
| L1 | Catalog search results | LRU with TTL (5 min), invalidated on product update | 2 GB per instance |
| L2 | Governance policy evaluations | Cache by (product_schema_hash, policy_version) | 1 GB per instance |
| L3 | Access control decisions | TTL-based (15 min), keyed by (consumer_id, product_id) | 512 MB per instance |
| L4 | Lineage subgraphs | LRU (1 hour TTL), invalidated on lineage edge mutation | 4 GB per instance |
| L5 | Federated query subresults | TTL aligned to source product freshness | 8 GB per query engine node |

### Hot Spot Mitigation

| Hot Spot Type | Cause | Mitigation |
|--------------|-------|------------|
| Popular product discovery | Everyone searches for the same high-quality product | Cache popular product metadata at edge; replicate search results |
| Cross-domain query load | Key products are joined by many consumers | Materialized views for popular cross-domain joins |
| Governance bottleneck | Many products publishing simultaneously (end-of-quarter) | Auto-scale governance workers; priority queue for first-time publishes |
| Single-domain event storm | Domain publishes many products rapidly | Rate limiting per domain with burst allowance |

### Auto-Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| Catalog API latency (p99) | > 500 ms for 5 min | Scale catalog service horizontally |
| Search latency (p99) | > 1 second for 5 min | Add search index replicas |
| Governance queue depth | > 50 pending evaluations | Scale governance workers |
| Federated query concurrency | > 80% of capacity | Add query engine workers |
| Event bus consumer lag | > 1,000 events behind | Scale event consumers |

---

## Reliability & Fault Tolerance

### Single Points of Failure

| Component | SPOF Risk | Mitigation |
|-----------|-----------|------------|
| Catalog metadata store | Loss prevents all discovery and registration | 3-way replicated document store across AZs |
| Governance engine | Loss prevents publishing (new products blocked) | Stateless; 3+ instances; fail-open for reads, fail-closed for writes |
| Lineage graph store | Loss prevents impact analysis and compliance auditing | Replicated graph database; periodic snapshot to object storage |
| Search index | Loss prevents discovery | Replicated search cluster; fallback to direct catalog query (slower) |
| Event bus | Loss delays lifecycle notifications | Replicated message broker; local buffering on event producers |
| Federated query engine | Loss prevents cross-domain queries | Stateless workers; multiple instances; individual domain queries still work |

### Redundancy Strategy

- **3x replication** for all stateful stores (metadata, lineage graph, search index)
- **Cross-AZ deployment** for all platform services
- **Stateless services** (catalog API, governance engine, contract validator) run 3+ instances behind health-checked load balancers
- **Domain independence** — individual domain storage failure affects only that domain's products; other domains remain available
- **Graceful degradation** — platform services degrade independently (governance down → publishing blocked but discovery/consumption continues)

### Failover Mechanisms

**Metadata Store Failure:**

```
1. Primary replica fails
2. Replication protocol promotes secondary (< 10s for managed document store)
3. Catalog service reconnects to new primary
4. In-flight registrations retry automatically (idempotent)
5. Brief read stale window (< 5s) during promotion

Impact: < 15 seconds of elevated latency; no data loss
```

**Governance Engine Failure:**

```
1. Health check detects governance instance failure
2. Load balancer removes instance from rotation
3. Remaining instances absorb load
4. Pending evaluations are retried by the publishing pipeline

Impact: Slight increase in evaluation latency; no publishes lost
Key: Publishing pipeline retries governance evaluation on transient failures
```

**Domain Storage Failure:**

```
1. Domain team's storage becomes unavailable
2. Federated query engine receives timeout from domain
3. Cross-domain queries return partial results with warning
4. Data product's SLO monitoring records availability violation
5. Catalog marks product as DEGRADED
6. Consumer notifications sent

Impact: Isolated to one domain; other domains unaffected
```

### Circuit Breaker Pattern

| Circuit | Trigger | Open Duration | Fallback |
|---------|---------|---------------|----------|
| Domain storage query | > 50% failures in 30s | 60 seconds | Return cached results (if available) with staleness warning |
| Governance evaluation | > 3 timeouts in 60s | 30 seconds | Queue evaluation for retry; block publish until evaluated |
| Search index | > 5 failures in 60s | 60 seconds | Fall back to direct metadata store query (slower, no ranking) |
| Lineage graph query | > 3 timeouts in 60s | 60 seconds | Return shallow lineage (1 hop only) from cached data |
| Cross-domain federated query | > 50% timeout in 60s | 120 seconds | Reject multi-domain queries; single-domain queries continue |

### Retry Strategy

| Operation | Retry Count | Backoff | Notes |
|-----------|-------------|---------|-------|
| Catalog read | 3 | Exponential (100ms, 200ms, 400ms) | Route to different replica on retry |
| Product registration | 2 | Exponential (500ms, 2s) | Idempotent; safe to retry |
| Governance evaluation | 3 | Exponential (1s, 5s, 15s) | Evaluation is idempotent |
| Federated subquery | 2 | Fixed (2s) | Retry on different query worker |
| Event publish | Unlimited | Exponential with cap (100ms → 30s) | Must eventually deliver for consistency |

### Graceful Degradation

| Severity | Condition | Degradation |
|----------|-----------|-------------|
| Level 1 | Single service instance down | Traffic redistributed; no user impact |
| Level 2 | Governance engine fully down | Publishing blocked; discovery and consumption continue |
| Level 3 | Search index down | Discovery falls back to metadata store browse; no full-text search |
| Level 4 | Metadata store degraded | Read from stale replica; writes queued |
| Level 5 | Multiple platform services down | Domains operate independently; no cross-domain operations |

### Bulkhead Pattern

Separate resource pools for different workload types:

| Bulkhead | Resources | Purpose |
|----------|-----------|---------|
| Discovery & search | 40% of catalog service capacity | Protect consumer-facing discovery |
| Registration & publishing | 30% of catalog service capacity | Ensure domain teams can publish |
| Governance evaluation | Dedicated instances | Prevent slow evaluations from affecting discovery |
| Federated queries | Dedicated query engine pool | Prevent expensive queries from affecting simple lookups |
| Background jobs (lineage, quality) | 20% of compute | Prevent batch processing from affecting interactive operations |

---

## Disaster Recovery

### Recovery Objectives

| Metric | Target | Strategy |
|--------|--------|----------|
| RPO (platform metadata) | < 1 minute | Synchronous replication of metadata and lineage stores |
| RTO (platform services) | < 5 minutes | Auto-scaling + automated failover |
| RPO (data products) | Domain-specific | Determined by each domain's SLO declaration |
| RTO (data products) | Domain-specific | Determined by each domain's infrastructure choices |

### Backup Strategy

| Backup Type | Frequency | Retention | Method |
|-------------|-----------|-----------|--------|
| Metadata store | Continuous | 30 days | Replicated document store with point-in-time recovery |
| Lineage graph | Hourly | 7 days | Graph snapshot to object storage |
| Governance policies | On every change | Unlimited | Version-controlled in git repository |
| Search index | Rebuildable | N/A | Rebuilt from metadata store on demand |
| Data products | Domain-managed | Domain-specific | Platform provides backup templates |

### Multi-Region Considerations

| Topology | Use Case | Complexity |
|----------|----------|------------|
| Single region, multi-AZ | Most enterprises; all domains in one region | Low |
| Active-passive cross-region | DR compliance requirement | Medium — replicate metadata store; data products stay in primary |
| Active-active cross-region | Global enterprise with region-specific domains | High — partition the mesh by region; cross-region discovery via federation |

**Recommendation:** Single region with multi-AZ deployment for the platform. Data products in different regions are registered in a global catalog with region annotations. Cross-region federated queries are supported but with latency warnings.
