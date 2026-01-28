# Requirements and Estimations

## Functional Requirements

### P0 - Must Have (Core Functionality)

| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| **Dense Vector Search** | Semantic similarity using embeddings | HNSW ANN, configurable top-K, cosine/dot product distance |
| **Sparse Keyword Search** | BM25 lexical retrieval | Full-text search, tokenization, stop words, stemming |
| **Hybrid Fusion** | Combine dense + sparse results | RRF fusion with k=60, configurable weights |
| **Metadata Filtering** | Filter by document attributes | Pre-filter, post-filter, hybrid filter strategies |
| **Cross-Encoder Reranking** | Re-score top candidates | Optional stage, configurable candidate count |
| **Multi-Tenancy** | Tenant data isolation | Namespace/collection per tenant, RLS enforcement |
| **Document Indexing** | Ingest and index documents | Bulk ingestion, real-time updates, delete support |
| **Query API** | Search interface | REST API, pagination, facets, highlighting |

### P1 - Should Have (Enhanced Capabilities)

| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| **SPLADE** | Learned sparse vectors | Neural sparse encoder, inverted index storage |
| **ColBERT** | Late interaction search | Multi-vector storage, MaxSim scoring |
| **Dynamic Alpha** | Query-adaptive fusion | Per-query weight prediction |
| **Multi-Modal Search** | Image/audio search | CLIP integration, Whisper transcription |
| **Query Understanding** | Intent classification | Query routing based on type |
| **Synonym Expansion** | Query enhancement | Configurable synonym dictionaries |
| **Phrase Search** | Exact phrase matching | Quote-enclosed phrase support |

### P2 - Nice to Have (Advanced Features)

| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| **Learn-to-Rank** | ML-based fusion | Trained model for score combination |
| **Personalization** | User-specific ranking | Embedding personalization, history boost |
| **Query Suggestions** | Auto-complete | Prefix search, popularity-based |
| **A/B Testing** | Experiment framework | Traffic splitting, metrics comparison |
| **Federated Search** | Cross-index search | Multi-index aggregation |
| **Knowledge Graph** | Entity-enhanced search | Entity linking, graph traversal |

### Out of Scope

| Feature | Reason |
|---------|--------|
| Document parsing/extraction | Assume clean text input, separate ETL pipeline |
| User authentication | Delegated to API Gateway / IAM system |
| Caching layer | Covered in separate caching design |
| Analytics dashboard | Separate BI/analytics system |

---

## Non-Functional Requirements

### CAP Theorem Choice

**Selected: AP (Availability + Partition Tolerance)**

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Consistency** | Eventual | Index updates can lag by seconds without user impact |
| **Availability** | High (99.95%) | Search must be available; stale results better than no results |
| **Partition Tolerance** | Required | Distributed system across zones/regions |

**Trade-off:** Accept that a document indexed 2 seconds ago might not appear in results immediately. For most search use cases, this is acceptable.

### Consistency Model

| Operation | Consistency | Latency | Rationale |
|-----------|-------------|---------|-----------|
| Search queries | Eventual | Low | Read from any replica |
| Document index | Read-your-writes | Medium | Writer sees own updates |
| Document delete | Eventual | Low | Soft delete, async purge |
| Schema changes | Strong | High | Rare, can be slow |

### Latency Requirements

| Operation | P50 | P95 | P99 | Notes |
|-----------|-----|-----|-----|-------|
| **Query encoding** | 5ms | 15ms | 30ms | Bi-encoder embedding |
| **Dense search** | 10ms | 30ms | 50ms | HNSW ANN |
| **Sparse search** | 5ms | 15ms | 30ms | Inverted index |
| **RRF fusion** | 1ms | 3ms | 5ms | In-memory merge |
| **First-stage total** | 20ms | 50ms | 100ms | Dense + Sparse + Fusion |
| **Reranking (100 docs)** | 30ms | 60ms | 100ms | Cross-encoder batch |
| **End-to-end (with rerank)** | 50ms | 100ms | 200ms | Full pipeline |
| **End-to-end (no rerank)** | 25ms | 60ms | 120ms | Skip reranking |
| **Document indexing** | 100ms | 300ms | 500ms | Embed + index |
| **Bulk indexing** | 10ms/doc | 20ms/doc | 50ms/doc | Batch processing |

### Availability Requirements

| Service Tier | Target | Downtime/Year | Applicable To |
|--------------|--------|---------------|---------------|
| **Search API** | 99.95% | 4.4 hours | User-facing search |
| **Indexing API** | 99.9% | 8.8 hours | Batch-tolerant |
| **Reranking Service** | 99.9% | 8.8 hours | Optional, graceful degradation |
| **Admin API** | 99.5% | 1.8 days | Management operations |

### Durability Requirements

| Data Type | Durability | Mechanism |
|-----------|------------|-----------|
| **Documents** | 99.9999% | 3-way replication, WAL |
| **Embeddings** | 99.999% | Recomputable from documents |
| **Indexes** | 99.99% | Rebuildable from documents |
| **Metadata** | 99.9999% | Primary data store |

### Scalability Requirements

| Dimension | Target | Strategy |
|-----------|--------|----------|
| **Documents** | 1 billion | Horizontal sharding |
| **QPS (search)** | 10,000 | Horizontal scaling, read replicas |
| **QPS (indexing)** | 1,000 | Queue-based async processing |
| **Index size** | 100 TB | Tiered storage, compression |
| **Embedding dimensions** | 768-3072 | Quantization for large dims |
| **Concurrent users** | 100,000 | Stateless API servers |

---

## Capacity Estimations

### Scale Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Total documents** | 1 billion | Enterprise corpus / large-scale search |
| **Average document size** | 2 KB | Title + body + metadata |
| **Embedding dimension** | 1024 | Modern models (E5-large, BGE) |
| **Sparse vector density** | 100 tokens avg | SPLADE output, ~100 non-zero weights |
| **Queries per day** | 100 million | 10K QPS average |
| **Peak multiplier** | 3x | Peak vs average QPS |
| **Replication factor** | 3 | Standard HA configuration |
| **Retention period** | Indefinite | Long-term document storage |

### Storage Calculations

| Component | Calculation | Result |
|-----------|-------------|--------|
| **Dense embeddings** | 1B docs × 1024 dims × 4 bytes | 4 TB |
| **Sparse vectors** | 1B docs × 100 tokens × (4 + 4) bytes | 800 GB |
| **Document content** | 1B docs × 2 KB | 2 TB |
| **Inverted index** | ~50% of content size | 1 TB |
| **HNSW graph overhead** | ~20% of vector storage | 800 GB |
| **Metadata/secondary indexes** | ~10% of content | 200 GB |
| **Subtotal (raw)** | | 8.8 TB |
| **With 3x replication** | 8.8 TB × 3 | 26.4 TB |
| **With 20% headroom** | 26.4 TB × 1.2 | **~32 TB** |

### Throughput Calculations

| Metric | Calculation | Result |
|--------|-------------|--------|
| **Average QPS** | 100M queries/day ÷ 86,400 sec | 1,157 QPS |
| **Peak QPS** | 1,157 × 3 | 3,471 QPS |
| **Design target QPS** | Peak × 3 (safety margin) | **10,000 QPS** |
| **Indexing rate** | 10M new docs/day ÷ 86,400 | 116 docs/sec |
| **Embedding throughput** | 116 docs/sec × 50ms/doc | 5.8 GPU-seconds/sec |

### Memory Calculations

| Component | Calculation | Result |
|-----------|-------------|--------|
| **Hot index (10% docs)** | 100M × 1024 × 4 bytes | 400 GB RAM |
| **HNSW graph (hot)** | 400 GB × 0.2 | 80 GB RAM |
| **Query cache** | 100K queries × 10 KB | 1 GB RAM |
| **Per-server memory** | | 32-64 GB |
| **Search cluster nodes** | 480 GB ÷ 32 GB | ~15 nodes |

### Bandwidth Calculations

| Flow | Calculation | Result |
|------|-------------|--------|
| **Query ingress** | 10K QPS × 500 bytes | 5 MB/s |
| **Response egress** | 10K QPS × 10 KB | 100 MB/s |
| **Embedding API calls** | 116 docs/sec × 2 KB | 232 KB/s |
| **Replication traffic** | Indexing × 3 replicas | ~1 MB/s |
| **Total egress** | | **~110 MB/s** |

### Cost Estimation (Cloud)

| Resource | Quantity | Unit Cost | Monthly Cost |
|----------|----------|-----------|--------------|
| **Compute (search)** | 20 nodes × 32 vCPU | $0.15/vCPU-hour | $69,120 |
| **Compute (reranking GPU)** | 5 × A10G | $1.00/GPU-hour | $3,650 |
| **Storage (SSD)** | 32 TB | $0.10/GB-month | $3,200 |
| **Embedding API** | 10M docs/month | $0.0001/1K tokens | $2,000 |
| **Network egress** | 300 TB/month | $0.05/GB | $15,000 |
| **Total estimated** | | | **~$93,000/month** |

---

## SLOs and SLAs

### Service Level Objectives (SLOs)

| Metric | SLO Target | Measurement Window | Alert Threshold |
|--------|------------|-------------------|-----------------|
| **Availability** | 99.95% | 30-day rolling | < 99.9% triggers P1 |
| **Search latency (p95)** | < 100ms | 5-minute window | > 150ms triggers P2 |
| **Search latency (p99)** | < 200ms | 5-minute window | > 300ms triggers P1 |
| **Index latency (p95)** | < 500ms | 5-minute window | > 1s triggers P2 |
| **Error rate** | < 0.1% | 5-minute window | > 0.5% triggers P1 |
| **Recall@100** | > 0.95 | Weekly sampling | < 0.90 triggers P2 |
| **NDCG@10** | > 0.65 | Weekly sampling | < 0.55 triggers P2 |

### Service Level Agreements (SLAs)

| Tier | Availability | Latency (p99) | Support | Credits |
|------|--------------|---------------|---------|---------|
| **Enterprise** | 99.95% | 200ms | 24/7 | 10% per 0.1% below |
| **Business** | 99.9% | 500ms | Business hours | 5% per 0.1% below |
| **Starter** | 99.5% | 1s | Best effort | None |

### Error Budget

| SLO | Target | Error Budget (30 days) | Current Spend |
|-----|--------|------------------------|---------------|
| Availability 99.95% | 0.05% downtime | 21.6 minutes | Track in dashboard |
| Latency p95 < 100ms | 5% above threshold | 36 hours | Track in dashboard |
| Error rate < 0.1% | 0.1% errors | 100K errors (at 100M queries) | Track in dashboard |

---

## Quality Benchmarks

### Retrieval Quality Targets

| Metric | Definition | Target | Industry Benchmark |
|--------|------------|--------|-------------------|
| **Recall@K** | Fraction of relevant docs in top-K | > 0.95 @ K=100 | 0.90-0.97 |
| **Precision@K** | Fraction of top-K that are relevant | > 0.70 @ K=10 | 0.60-0.80 |
| **NDCG@K** | Normalized Discounted Cumulative Gain | > 0.65 @ K=10 | 0.55-0.75 |
| **MRR** | Mean Reciprocal Rank | > 0.50 | 0.40-0.60 |
| **MAP** | Mean Average Precision | > 0.45 | 0.35-0.55 |

### Hybrid Search Improvement Targets

| Comparison | Expected Improvement | Source |
|------------|---------------------|--------|
| Hybrid vs Dense-only | +15-25% | Vespa benchmark |
| Hybrid vs Sparse-only | +20-30% | Pinecone benchmark |
| With reranking vs without | +20-35% | Cross-encoder research |
| SPLADE vs BM25 | +5-10% | SPLADE paper |
| ColBERT vs bi-encoder | +10-15% | ColBERT paper |

### Latency vs Quality Trade-offs

| Configuration | Latency (p95) | NDCG@10 | When to Use |
|---------------|---------------|---------|-------------|
| Dense-only (no rerank) | 30ms | 0.55 | Ultra-low latency |
| Hybrid (no rerank) | 50ms | 0.60 | Low latency |
| Hybrid + rerank (top-50) | 80ms | 0.70 | Balanced |
| Hybrid + rerank (top-100) | 100ms | 0.72 | Quality-focused |
| Hybrid + rerank (top-200) | 150ms | 0.73 | Maximum quality |

---

## Bottleneck Identification

### Primary Bottlenecks

| Bottleneck | Impact | Mitigation |
|------------|--------|------------|
| **Reranking latency** | Limits end-to-end latency | Batch processing, smaller models, fewer candidates |
| **Embedding generation** | Indexing throughput | GPU parallelism, batch embedding |
| **HNSW memory** | Index size limits | Quantization, disk-based indexes |
| **Dense-sparse sync** | Consistency lag | Atomic multi-index writes |
| **GPU contention** | Reranking throughput | Priority queuing, auto-scaling |

### Resource Saturation Points

| Resource | Saturation Indicator | Threshold | Action |
|----------|---------------------|-----------|--------|
| **CPU** | Search latency increase | > 70% utilization | Scale out search nodes |
| **Memory** | Swap usage, OOM | > 85% utilization | Scale up or shard |
| **GPU** | Rerank queue depth | > 100 pending | Add GPU nodes |
| **Network** | Packet drops | > 80% bandwidth | Upgrade network tier |
| **Disk I/O** | Read latency | > 10ms | Use faster storage |
