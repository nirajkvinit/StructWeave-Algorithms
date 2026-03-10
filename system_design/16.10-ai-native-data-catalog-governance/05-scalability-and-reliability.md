# Scalability & Reliability — AI-Native Data Catalog & Governance

## Horizontal Scaling Strategy

### Metadata Graph Scaling

The metadata graph (RDBMS-backed) is the core bottleneck as the catalog grows beyond 10M entities:

| Strategy | When | How |
|----------|------|-----|
| **Read replicas** | Read QPS exceeds primary capacity | Route search enrichment and lineage reads to replicas; writes go to primary |
| **Functional sharding** | Graph exceeds single-node storage | Shard by entity type: lineage edges in one cluster, quality profiles in another, core entities in primary |
| **Caching layer** | Hot entities dominate reads | Redis cache for frequently accessed entities (top 5% by usage serve 80% of reads) with TTL-based invalidation |
| **Materialized views** | Lineage traversals are slow | Precompute 1-3 hop transitive closures as materialized tables, refreshed hourly |

### Search Index Scaling

| Scale Point | Solution |
|-------------|----------|
| < 5M entities | Single search cluster (3 nodes) |
| 5-50M entities | Sharded search cluster with index-per-entity-type |
| 50M+ entities | Time-partitioned indexes for quality history; tiered storage (hot: recent, warm: older) |

Index scaling is straightforward because search indexes are stateless replicas of the metadata graph — they can be rebuilt from the event stream.

### Ingestion Scaling

```
Ingestion Pipeline Scaling:

┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ 50+ Sources │────→│ Connector    │────→│ Event Bus   │
│ (parallel)  │     │ Workers (K8s)│     │ (partitioned│
└─────────────┘     │ Auto-scale   │     │  by source) │
                    │ 1-20 pods    │     └──────┬──────┘
                    └──────────────┘            │
                                    ┌───────────┼───────────┐
                                    │           │           │
                              ┌─────▼──┐  ┌────▼───┐  ┌───▼────┐
                              │ Graph  │  │ Search │  │ Class. │
                              │ Writer │  │ Indexer│  │ Worker │
                              └────────┘  └────────┘  └────────┘
```

- **Connector workers** scale horizontally per source (one pod per connector, auto-scaled by backlog depth)
- **Event bus** is partitioned by source ID, ensuring ordered processing per source while parallelizing across sources
- **Downstream consumers** (graph writer, search indexer, classification worker) each scale independently based on their throughput needs

### Classification Scaling

| Approach | Throughput | Cost |
|----------|-----------|------|
| Regex + name patterns | 10,000 columns/min | CPU only |
| NER model (spaCy) | 1,000 columns/min | CPU + model loading |
| LLM disambiguation | 50 columns/min | GPU or API call |

Strategy: **Pyramid processing** — run cheap methods on all columns, NER only on text columns, LLM only on ambiguous cases. This means 90% of columns are classified at the cheapest tier.

---

## Replication & Fault Tolerance

### Component Failure Handling

| Component | Failure Impact | Redundancy | Recovery |
|-----------|----------------|------------|----------|
| **Metadata Graph (RDBMS)** | All writes fail; reads degraded | Primary + standby + read replicas | Automatic failover (< 30s); RPO = 0 with synchronous replication |
| **Search Index** | Search unavailable; discovery blocked | 3-node cluster with replica shards | Auto-rebalancing on node loss; full rebuild from event stream if needed |
| **Event Bus** | Ingestion pipeline stalls | Multi-broker cluster with replication factor 3 | Auto-leader election; consumers resume from last committed offset |
| **Classification Engine** | New PII goes undetected | Stateless workers behind load balancer | Workers auto-restart; backlog processed on recovery |
| **NL-to-SQL Engine** | Natural language queries fail | Multiple LLM replicas; fallback to smaller model | Graceful degradation: show "NL query temporarily unavailable" |
| **Policy Service** | Access decisions blocked | Active-passive with shared policy cache | Failover < 5s; stale cache serves reads during failover |

### Data Durability Guarantees

- **Metadata graph:** WAL-backed RDBMS with point-in-time recovery (PITR). Retained for 30 days.
- **Event stream:** Event retention of 7 days. All downstream state (graph, search index, quality store) is derivable from the event stream — enabling full state reconstruction.
- **Search index:** Ephemeral — rebuilt from metadata graph if corrupted. Search is a derived view, not a source of truth.
- **Audit log:** Append-only with 7-year retention for compliance. Written to immutable object storage.

---

## Disaster Recovery

| Metric | Target | Strategy |
|--------|--------|----------|
| **RTO** | < 1 hour | Standby replica in secondary region; DNS failover |
| **RPO** | < 1 minute | Synchronous replication for metadata graph; async for search index |

### Multi-Region Deployment

```
Primary Region                    Secondary Region
┌────────────────┐                ┌────────────────┐
│ API Gateway    │                │ API Gateway    │
│ Core Services  │                │ Core Services  │
│ Metadata Graph │───sync repl──→│ Metadata Graph │
│ Search Index   │───async repl─→│ Search Index   │
│ Event Bus      │───mirroring──→│ Event Bus      │
└────────────────┘                └────────────────┘
         │                                 │
    Active (read/write)              Standby (read-only)
```

- **Normal mode:** All traffic routes to primary. Secondary serves as warm standby with read-only queries for disaster recovery testing.
- **Failover mode:** DNS switches to secondary. Secondary promotes to read-write. Event bus mirroring reverses direction once primary recovers.

---

## Performance Optimization

### Caching Strategy

| Cache Layer | What | TTL | Invalidation |
|-------------|------|-----|-------------|
| **L1: API response cache** | Search results, entity details | 60s | Event-driven: invalidate on entity update |
| **L2: Entity cache (Redis)** | Hot entities by usage | 5 min | Write-through: update cache on graph write |
| **L3: Lineage path cache** | Precomputed 1-3 hop lineage | 1 hour | Rebuild on lineage edge change in path |
| **L4: Policy decision cache** | (user, entity, action) → decision | 5 min | Invalidate on policy change or tag change |
| **L5: LLM response cache** | NL question hash → SQL + explanation | 24 hours | Invalidate on schema change for referenced tables |

### Search Optimization

- **Index warming:** Pre-load popular search terms into search engine's query cache on startup
- **Facet pre-computation:** Compute facet counts (by domain, type, tag) in background, serve from cache
- **Semantic embeddings:** Pre-compute vector embeddings for entity descriptions; store in vector index for semantic similarity search alongside BM25
- **Query suggestion:** Trie-based autocomplete using search log frequencies

### Connector Optimization

- **Incremental crawling:** Track high-water marks (last modified timestamp) per source; only fetch changed metadata
- **Change detection:** Use database information_schema change tracking, dbt manifest diffs, BI tool audit logs instead of full re-crawl
- **Parallel extraction:** Each connector extracts schema, lineage, and quality metadata in parallel streams
- **Backpressure:** If event bus is congested, connectors slow down extraction rate rather than dropping events

---

## Graceful Degradation

| Scenario | User Experience | Fallback |
|----------|----------------|----------|
| Search index down | Search unavailable; browsing by hierarchy still works | Direct metadata graph queries (slower but functional) |
| Classification engine down | New columns remain unclassified | Existing tags preserved; manual classification available |
| NL-to-SQL engine down | Natural language queries disabled | Standard search + manual SQL writing |
| Event bus congestion | Metadata freshness degrades from seconds to minutes | Batch sync catches up; stale indicators shown in UI |
| LLM provider outage | NL queries and LLM classification unavailable | Regex + NER classification continues; NL queries queued for retry |
| Single connector failure | One source's metadata goes stale | Circuit breaker isolates failure; other sources unaffected; stale badge on affected assets |
