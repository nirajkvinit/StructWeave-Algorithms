# Requirements and Estimations

## Functional Requirements

### P0 - Must Have (Core Knowledge Graph Operations)

| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| **Entity Extraction** | Extract named entities from documents | NER + LLM extraction, F1 > 85%, support for PERSON, ORG, LOCATION, CONCEPT, EVENT types |
| **Relation Extraction** | Identify relationships between entities | Relation type + confidence score, directional relationships, F1 > 75% |
| **Entity Resolution** | Deduplicate and link entity mentions | Precision > 90%, recall > 80%, sub-second resolution for single entities |
| **Graph Storage** | Store entities and relationships | Property graph model, ACID transactions, support for 10B+ entities |
| **Entity Search** | Find entities by name or type | Sub-50ms lookup, fuzzy matching, autocomplete |
| **Subgraph Retrieval** | Retrieve relevant subgraphs for queries | K-hop traversal (K=1-4), relevance-based pruning |
| **GraphRAG Queries** | Natural language to graph traversal | Local + global retrieval modes, P95 < 500ms (local), P95 < 2s (global) |
| **Source Provenance** | Track where facts originated | Link entities/relations to source documents and chunks |

### P1 - Should Have (Advanced Features)

| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| **Community Detection** | Cluster related entities | Leiden algorithm, modularity > 0.3, hierarchical levels |
| **Hierarchical Summarization** | Create summaries at community levels | LLM-generated summaries, refreshed on significant changes |
| **Multi-Hop Reasoning** | Answer questions requiring graph traversal | 80%+ accuracy on 2-4 hop questions |
| **Temporal Queries** | Query knowledge at specific points in time | "What was X's role in 2023?", bi-temporal support |
| **Incremental Updates** | Add new knowledge without full rebuild | Real-time ingestion, community updates within 5 minutes |
| **Confidence Scoring** | Track extraction confidence | Confidence propagation through resolution and aggregation |
| **Relationship Strength** | Weight relationships by evidence | Count of supporting sources, recency weighting |

### P2 - Nice to Have (Enterprise Features)

| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| **Personal Knowledge Layer** | User-specific graphs on shared enterprise graph | Per-user relationship views, merged with enterprise graph at query time |
| **Cross-Document Coreference** | Link entity mentions across document boundaries | Document-level and corpus-level resolution |
| **Contradiction Detection** | Flag conflicting facts | Identify temporal conflicts vs factual conflicts |
| **Knowledge Graph Embeddings** | TransE/ComplEx for link prediction | Predict missing relationships, evaluate with MRR > 0.3 |
| **DRIFT Search** | Dynamic, iterative, filtered traversal | Adaptive refinement based on initial results |
| **Graph Analytics** | Centrality, clustering, path analysis | Identify key entities, knowledge gaps |
| **Natural Language Graph Queries** | Convert NL to Cypher/Gremlin | Support common query patterns |

---

## Non-Functional Requirements

### CAP Theorem Choice: **CP (Consistency + Partition Tolerance)**

**Justification:**
- Knowledge graph integrity is critical; inconsistent facts propagate errors through reasoning
- Stale relationships can lead to incorrect multi-hop conclusions
- Enterprise knowledge management requires trust in data accuracy
- Better to return "unavailable" than potentially incorrect facts

**Trade-off:** During network partitions, writes may be rejected to maintain consistency. Read availability may be reduced.

### Consistency Model

| Data Type | Consistency | Rationale |
|-----------|-------------|-----------|
| Entity writes | Strong | Prevent duplicate entity creation |
| Relationship writes | Strong | Maintain graph integrity |
| Entity reads | Read-your-writes | Users see their recent changes |
| GraphRAG reads | Eventual (5s) | Summaries can lag slightly |
| Community summaries | Eventual (5min) | Background recomputation acceptable |

### Latency Requirements

| Operation | P50 | P95 | P99 | Notes |
|-----------|-----|-----|-----|-------|
| Entity lookup by ID | 5ms | 20ms | 50ms | Cache-first |
| Entity search by name | 20ms | 50ms | 100ms | Full-text + fuzzy |
| 1-hop traversal | 10ms | 30ms | 50ms | Single relationship lookup |
| 2-hop traversal | 30ms | 100ms | 200ms | ~100 edges explored |
| K-hop traversal (K=4) | 100ms | 300ms | 500ms | Pruning applied |
| GraphRAG local query | 150ms | 400ms | 800ms | Entity-centric retrieval |
| GraphRAG global query | 400ms | 1.2s | 2s | Community summaries |
| DRIFT search | 600ms | 1.5s | 3s | Iterative refinement |
| Entity resolution (single) | 20ms | 80ms | 150ms | Blocking + matching |
| Entity extraction (document) | 500ms | 2s | 5s | Depends on doc size |
| Multi-hop reasoning (4 hops) | 800ms | 2s | 4s | With verification |

### Availability Requirements

| Tier | Target | Applicable To | Downtime/Year |
|------|--------|---------------|---------------|
| **Tier 1** | 99.95% | Graph reads, entity search | 4.4 hours |
| **Tier 2** | 99.9% | Graph writes, GraphRAG queries | 8.8 hours |
| **Tier 3** | 99.5% | Extraction pipeline, community detection | 44 hours |

### Durability Requirements

| Data Type | Durability | Mechanism |
|-----------|------------|-----------|
| Entities | 99.9999999% (11 nines) | 3x replication + daily backups |
| Relationships | 99.9999999% (11 nines) | Same as entities |
| Source documents | 99.999999999% (11 nines) | Object storage with versioning |
| Community summaries | 99.99% | Regenerable from graph |
| Extraction logs | 99.9% | 90-day retention |

### Throughput Requirements

| Metric | Target | Peak |
|--------|--------|------|
| GraphRAG queries/second | 200 QPS | 500 QPS |
| Entity lookups/second | 2,000 QPS | 5,000 QPS |
| Graph traversals/second | 500 QPS | 1,500 QPS |
| Documents ingested/day | 1M | 3M |
| Entities extracted/day | 50M | 150M |
| Entity resolutions/second | 1,000 | 3,000 |

---

## Capacity Estimations

### Scale Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Total documents | 100M | Large enterprise corpus (10 years) |
| Average document size | 10KB | Mix of emails, wiki pages, tickets |
| Entities per document | 50 (average) | Varies by document type |
| Unique entities (after resolution) | 5B | ~10% deduplication rate |
| Relationships per entity | 5 (average) | Standard connectivity |
| Entity properties size | 500 bytes | Name, type, metadata, timestamps |
| Relationship properties size | 100 bytes | Type, confidence, timestamps |
| Embedding dimension | 1536 | text-embedding-3-small |
| Community count | 500K | Hierarchical levels |
| Summary size per community | 10KB | LLM-generated |

### Storage Calculations

| Component | Calculation | Result |
|-----------|-------------|--------|
| Raw documents | 100M × 10KB | 1 TB |
| Document chunks | 100M × 10 chunks × 2KB | 2 TB |
| Total entities | 100M docs × 50 entities | 5B |
| Entity storage | 5B × 500 bytes | 2.5 TB |
| Entity embeddings | 5B × 1536 × 4 bytes | 30.7 TB |
| Total relationships | 5B × 5 edges | 25B |
| Relationship storage | 25B × 100 bytes | 2.5 TB |
| Graph indexes | ~20% of graph data | 1 TB |
| Community summaries | 500K × 10KB | 5 GB |
| Summary embeddings | 500K × 1536 × 4 bytes | 3 GB |
| **Subtotal** | | ~40 TB |
| **With 3x replication** | | **~120 TB** |

### Throughput Calculations

| Metric | Calculation | Result |
|--------|-------------|--------|
| Concurrent users | 100K active | Peak hour assumption |
| Queries per user per day | 50 | Mix of search and GraphRAG |
| Daily queries | 100K × 50 | 5M/day |
| Average QPS | 5M / 86,400 | ~60 QPS |
| Peak QPS (3x) | 60 × 3 | ~180 QPS |
| Spike QPS (10x) | 60 × 10 | ~600 QPS |

### Ingestion Throughput

| Metric | Calculation | Result |
|--------|-------------|--------|
| Documents/day | 1M new documents | Enterprise activity |
| Entities extracted/day | 1M × 50 | 50M entities |
| Entity resolution/day | 50M candidates | With 90% cached |
| New unique entities/day | 50M × 10% | 5M new entities |
| GPU extraction time | 50M / 1000 per minute | ~830 GPU-hours |
| LLM API calls | 1M docs × 2 calls | 2M calls/day |

---

## SLOs and SLAs

### Service Level Objectives

| SLO | Target | Measurement Window | Error Budget |
|-----|--------|-------------------|--------------|
| GraphRAG availability | 99.9% | Monthly | 44 minutes |
| GraphRAG latency (P95 < 500ms) | 99% | Daily | 1% slow requests |
| Entity search availability | 99.95% | Monthly | 22 minutes |
| Entity search latency (P95 < 50ms) | 99.5% | Daily | 0.5% slow |
| Extraction pipeline uptime | 99.5% | Weekly | 50 minutes/week |
| Entity resolution accuracy | > 90% precision | Weekly sample | N/A |
| Multi-hop reasoning accuracy | > 80% | Weekly benchmark | N/A |

### Error Budget Policy

| Error Budget Consumed | Action |
|----------------------|--------|
| 0-50% | Normal development |
| 50-75% | Prioritize reliability work |
| 75-100% | Feature freeze, focus on stability |
| > 100% | Incident review, rollback risky changes |

### Enterprise SLA Tiers

| Tier | Availability | Support | Price Multiplier |
|------|--------------|---------|------------------|
| Standard | 99.5% | Business hours | 1x |
| Professional | 99.9% | 24/7 with 4hr response | 2x |
| Enterprise | 99.95% | 24/7 with 1hr response | 4x |

---

## Cost Estimations

### Infrastructure Costs (Monthly)

| Component | Specification | Monthly Cost |
|-----------|--------------|--------------|
| **Graph Database** | Neo4j Enterprise (120TB, 3 nodes) | $50,000 |
| **Vector Database** | Managed Pinecone/Weaviate (30TB) | $20,000 |
| **GPU Cluster** | 10 × A100 for extraction | $30,000 |
| **Application Servers** | 20 × 8-core, 32GB | $8,000 |
| **Redis Cache** | 500GB cluster | $3,000 |
| **Object Storage** | 5TB documents + backups | $500 |
| **Kafka** | Message queue cluster | $2,000 |
| **Networking** | Load balancers, bandwidth | $2,000 |
| **Subtotal Infrastructure** | | **$115,500** |

### Operational Costs (Monthly)

| Component | Specification | Monthly Cost |
|-----------|--------------|--------------|
| **LLM API (Extraction)** | 2M calls × $0.003 | $6,000 |
| **LLM API (Summarization)** | 500K calls × $0.01 | $5,000 |
| **LLM API (GraphRAG)** | 5M calls × $0.002 | $10,000 |
| **Embedding API** | 50M × $0.0001 | $5,000 |
| **Subtotal Operations** | | **$26,000** |

### Total Monthly Cost

| Category | Cost |
|----------|------|
| Infrastructure | $115,500 |
| Operations (API) | $26,000 |
| **Total** | **~$141,500/month** |
| **Per 1M queries** | ~$28 |
| **Per entity stored** | ~$0.00003 |

### Cost Optimization Opportunities

| Strategy | Potential Savings |
|----------|-------------------|
| Reserved instances (1-year) | 30% on compute |
| Spot instances for extraction | 60% on GPU |
| Self-hosted LLM (Llama 3) | 70% on API costs |
| Tiered storage for old data | 50% on storage |
| Aggressive caching | 40% reduction in queries |

---

## Constraints and Trade-offs

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Graph DB single-region leader | Write latency for distant users | Regional read replicas |
| Entity resolution is sequential | Ingestion bottleneck | Batch processing, parallelization |
| LLM extraction is expensive | Cost scales with volume | Specialized models for common cases |
| Community detection is batch | Stale summaries during updates | Incremental updates for hot communities |
| Multi-hop reasoning adds latency | Complex queries are slow | Caching, precomputation |

### Trade-off Decisions

| Decision | Option A | Option B | Choice | Rationale |
|----------|----------|----------|--------|-----------|
| Consistency vs Availability | Strong consistency | Eventual consistency | **Strong** | Knowledge integrity critical |
| Online vs Batch resolution | Real-time | Periodic batch | **Hybrid** | Real-time for ingestion, batch for cleanup |
| Precision vs Recall (resolution) | High precision | High recall | **Precision** | False merges worse than duplicates |
| Local vs Global GraphRAG | Fast, focused | Comprehensive | **Both** | Different query types need different modes |
| Community detection algorithm | Louvain | Leiden | **Leiden** | Better community quality |

### Scaling Trade-offs

| Scale Point | Challenge | Solution |
|-------------|-----------|----------|
| 1B entities | Single node limits | Sharding by community |
| 10B entities | Entity resolution O(n²) | Better blocking, LSH |
| 100B relationships | Traversal latency | Pruning, caching hot paths |
| 10M queries/day | LLM costs | Caching, self-hosted models |
| 1000 concurrent users | Graph DB connections | Connection pooling, read replicas |
