# Requirements & Capacity Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

| Requirement | Priority | Description |
|-------------|----------|-------------|
| **Vector Storage** | P0 | Store high-dimensional vectors (128-4096 dimensions) with associated metadata |
| **Similarity Search** | P0 | Find k most similar vectors to a query vector using configurable distance metrics |
| **CRUD Operations** | P0 | Create, read, update, delete individual vectors and batches |
| **Metadata Filtering** | P0 | Filter search results by structured metadata (category, timestamp, user_id) |
| **Multiple Collections** | P1 | Organize vectors into separate collections/indexes with different configurations |
| **Hybrid Search** | P1 | Combine vector similarity with keyword (BM25) search |
| **Namespaces/Tenancy** | P1 | Logical isolation for multi-tenant applications |
| **Batch Operations** | P1 | Bulk upsert/delete for efficient data ingestion |
| **Real-time Updates** | P2 | Immediate searchability after vector insertion |
| **Index Configuration** | P2 | Tune index parameters (HNSW M, ef, IVF nlist) per collection |

### Out of Scope

- Embedding generation (handled by separate ML models)
- Training embedding models
- Complex SQL-style joins
- Full ACID transactions across collections
- Real-time streaming ingestion (batch preferred)

---

## Non-Functional Requirements

### CAP Theorem Position

```
                    Consistency
                         ▲
                        /│\
                       / │ \
                      /  │  \
                     /   │   \
                    /    │    \
                   /     │     \
                  /      │      \
                 /  CP   │   CA  \
                /        │        \
               /─────────┼─────────\
              /          │          \
             /     AP    │           \
            /    ════════════        \
           /     Vector DBs           \
          /      (Preferred)           \
         ▼────────────────────────────▶
    Availability              Partition Tolerance
```

**Choice: AP (Availability + Partition Tolerance)**

**Justification:**
- Vector search is read-heavy and tolerates stale results
- Missing a few vectors in results is acceptable (recall@k metric)
- Write conflicts rare (append-mostly pattern)
- Strong consistency would hurt query throughput significantly

### Consistency Models

| Model | Description | Use Case |
|-------|-------------|----------|
| **Eventual Consistency** (Default) | Writes propagate asynchronously | Standard search applications |
| **Session Consistency** | Read-your-writes within session | User-facing applications |
| **Bounded Staleness** | Max N seconds or M versions behind | Time-sensitive applications |

### Latency Requirements

| Operation | p50 | p95 | p99 | Notes |
|-----------|-----|-----|-----|-------|
| **Vector Query** (k=10) | 10ms | 30ms | 50ms | In-memory HNSW |
| **Vector Query** (k=100) | 20ms | 50ms | 100ms | More candidates to evaluate |
| **Filtered Query** | 15ms | 40ms | 80ms | Depends on filter selectivity |
| **Single Upsert** | 5ms | 15ms | 30ms | Write to buffer |
| **Batch Upsert** (1K vectors) | 100ms | 300ms | 500ms | Async indexing |
| **Index Build** (1M vectors) | - | - | 5 min | Background operation |

### Availability & Durability

| Metric | Target | Mechanism |
|--------|--------|-----------|
| **Availability** | 99.9% (8.76 hrs/year downtime) | Replication, failover |
| **Durability** | 99.999999% (8 nines) | 3x replication, WAL |
| **RTO** | <15 minutes | Automated failover |
| **RPO** | <1 minute | Sync replication for WAL |

### Accuracy Requirements

| Metric | Target | Trade-off |
|--------|--------|-----------|
| **Recall@10** | >95% | Higher recall = slower queries |
| **Recall@100** | >98% | Larger ef_search parameter |
| **Precision** | N/A | ANN returns approximate results by design |

---

## Capacity Estimations

### Scenario: Enterprise RAG Application

A company building a RAG (Retrieval-Augmented Generation) system for enterprise document search:
- 10M documents chunked into 100M text passages
- Each passage embedded as 768-dimensional vector (OpenAI ada-002)
- 1000 concurrent users, 10 queries/user/hour during business hours
- Real-time document updates (1000 new documents/day)

### Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Total vectors | 100M | 10M docs × 10 chunks/doc average |
| Vector dimensions | 768 | OpenAI text-embedding-3-small |
| Precision | float32 | Standard precision |
| Metadata per vector | 200 bytes | doc_id, chunk_id, timestamp, category |
| Daily new vectors | 10K | 1K docs × 10 chunks |
| Peak hours | 8 hrs/day | Business hours |
| Replication factor | 3 | High availability |
| Top-k per query | 10 | RAG context window |

### Traffic Calculations

```
Users and Queries:
─────────────────────────────────────────────────────────
Concurrent users           = 1,000
Queries per user per hour  = 10
Peak QPS                   = 1,000 × 10 / 3,600
                          = 2.78 QPS (average during peak)

Peak multiplier (5x)       = 2.78 × 5
                          ≈ 14 QPS (burst)

Daily queries              = 1,000 users × 10 queries × 8 hours
                          = 80,000 queries/day

Monthly queries            = 80,000 × 22 working days
                          ≈ 1.76M queries/month
─────────────────────────────────────────────────────────

Write Traffic:
─────────────────────────────────────────────────────────
Daily new vectors          = 10,000
Write QPS (average)        = 10,000 / 86,400
                          ≈ 0.12 QPS

Batch ingestion (hourly)   = 10,000 / 24
                          ≈ 417 vectors/batch
─────────────────────────────────────────────────────────

Read:Write Ratio           = 80,000 / 10,000
                          = 8:1 daily
                          ≈ 100:1 during peak (reads only)
```

### Storage Calculations

```
Vector Storage:
─────────────────────────────────────────────────────────
Bytes per vector           = 768 dims × 4 bytes (float32)
                          = 3,072 bytes (3 KB)

Raw vector storage         = 100M vectors × 3 KB
                          = 300 GB

Metadata storage           = 100M × 200 bytes
                          = 20 GB

Total raw data             = 300 GB + 20 GB
                          = 320 GB
─────────────────────────────────────────────────────────

Index Overhead (HNSW):
─────────────────────────────────────────────────────────
HNSW graph overhead        ≈ 4-8 bytes per edge
Edges per vector (M=16)    = 16 × 2 (bidirectional) × avg layers
                          ≈ 40 edges average

Index overhead per vector  = 40 edges × 8 bytes
                          = 320 bytes

Total index overhead       = 100M × 320 bytes
                          = 32 GB
─────────────────────────────────────────────────────────

Total with Replication:
─────────────────────────────────────────────────────────
Single replica             = 320 GB (data) + 32 GB (index)
                          = 352 GB

With 3x replication        = 352 GB × 3
                          ≈ 1.06 TB total storage

With compression (PQ 8x):
─────────────────────────────────────────────────────────
Compressed vectors         = 300 GB / 8
                          = 37.5 GB

Total compressed           = 37.5 GB + 20 GB + 32 GB
                          = 89.5 GB per replica

With 3x replication        = 89.5 × 3
                          ≈ 270 GB total (compressed)
─────────────────────────────────────────────────────────
```

### Memory Requirements

```
In-Memory HNSW (Full):
─────────────────────────────────────────────────────────
Vectors in memory          = 300 GB
HNSW graph in memory       = 32 GB
Metadata index             = 5 GB (B-tree indexes)
Buffer pool                = 16 GB
OS + overhead              = 10 GB

Total per node             ≈ 363 GB RAM

With 100M vectors / 3 shards:
Each shard                 = 363 GB / 3
                          ≈ 121 GB RAM per node

Recommended instance       = 128 GB RAM (comfortable)
                          = 3 nodes for data + 1 coordinator
─────────────────────────────────────────────────────────

DiskANN Alternative:
─────────────────────────────────────────────────────────
Graph navigation structure = 32 GB RAM
Vectors on NVMe SSD        = 300 GB SSD
Compressed (PQ) in memory  = 37.5 GB RAM

Total RAM needed           = 32 + 37.5 + 16 (buffer)
                          ≈ 86 GB RAM per node (with SSD)
─────────────────────────────────────────────────────────
```

### Bandwidth Calculations

```
Query Bandwidth:
─────────────────────────────────────────────────────────
Query vector size          = 3 KB
Response (top-10 + meta)   = 10 × (3 KB + 200 bytes)
                          = 32 KB

Peak query bandwidth       = 14 QPS × (3 KB + 32 KB)
                          = 490 KB/s inbound + outbound
                          ≈ 0.5 MB/s (negligible)
─────────────────────────────────────────────────────────

Ingestion Bandwidth:
─────────────────────────────────────────────────────────
Batch size                 = 417 vectors × 3.2 KB
                          = 1.3 MB per batch

Hourly ingestion           = 1.3 MB × 1
                          = 1.3 MB/hour (negligible)
─────────────────────────────────────────────────────────

Replication Bandwidth:
─────────────────────────────────────────────────────────
Daily new data             = 10K vectors × 3.2 KB
                          = 32 MB/day

Cross-replica sync         = 32 MB × 2 replicas
                          = 64 MB/day (negligible)
─────────────────────────────────────────────────────────
```

### Infrastructure Sizing

```
Cluster Configuration (In-Memory HNSW):
─────────────────────────────────────────────────────────
Data Nodes:
  - 3 nodes × 128 GB RAM
  - NVMe SSD for persistence (500 GB each)
  - 32 vCPUs each for SIMD acceleration

Coordinator Node:
  - 1 node × 32 GB RAM
  - Metadata management, routing

Load Balancer:
  - 1 managed LB for query distribution

Total Resources:
  - 416 GB RAM (3×128 + 32)
  - 96 vCPUs (3×32)
  - 1.5 TB SSD
─────────────────────────────────────────────────────────

Cluster Configuration (Cost-Optimized with DiskANN):
─────────────────────────────────────────────────────────
Data Nodes:
  - 3 nodes × 64 GB RAM
  - NVMe SSD 1 TB each (vectors + index)
  - 16 vCPUs each

Total Resources:
  - 192 GB RAM
  - 48 vCPUs
  - 3 TB NVMe SSD

Cost Savings: ~50% vs in-memory
Latency Trade-off: 50ms p99 vs 30ms p99
─────────────────────────────────────────────────────────
```

---

## SLOs / SLAs

| Metric | SLO Target | SLA Commitment | Measurement |
|--------|------------|----------------|-------------|
| **Availability** | 99.95% | 99.9% | Uptime monitoring |
| **Query Latency (p99)** | 50ms | 100ms | Server-side latency |
| **Query Latency (p50)** | 15ms | 30ms | Server-side latency |
| **Recall@10** | 97% | 95% | Sampled exact k-NN comparison |
| **Write Latency (p99)** | 100ms | 200ms | Ack from primary |
| **Error Rate** | <0.1% | <0.5% | 5xx responses / total |
| **Throughput** | 1000 QPS | 500 QPS | Sustained for 1 hour |

### SLA Breach Handling

| Breach Type | Customer Impact | Remediation |
|-------------|-----------------|-------------|
| Availability <99.9% | Service credits | 10% credit per 0.1% below |
| Latency p99 >200ms | Degraded UX | Investigation within 4 hrs |
| Data loss | Critical | Incident + full credit |

---

## Constraints & Assumptions

### Technical Constraints

1. **Memory Bound**: HNSW requires all vectors in RAM for best latency
2. **Index Rebuild**: Major parameter changes require full re-indexing
3. **Dimension Lock**: Cannot change dimensions after collection creation
4. **Distance Metric Lock**: Changing metric requires re-indexing

### Business Constraints

1. **Cost**: In-memory instances are 3-5x more expensive than disk-based
2. **Latency vs Cost**: Can trade 2x latency for 50% cost reduction
3. **Accuracy vs Speed**: Higher recall requires larger ef_search (slower)

### Assumptions

1. Vectors are pre-computed by embedding models (not our concern)
2. Metadata is relatively small (<1 KB per vector)
3. Query patterns are uniform (no extreme hot spots)
4. Network latency to clients is <10ms (same region)

---

## Capacity Summary

| Metric | Value | Notes |
|--------|-------|-------|
| **Total Vectors** | 100M | 10M documents × 10 chunks |
| **Vector Dimensions** | 768 | OpenAI embedding size |
| **Raw Storage** | 320 GB | Vectors + metadata |
| **With Index + Replication** | 1.06 TB | HNSW, 3x replication |
| **Compressed (PQ)** | 270 GB | 8x compression |
| **Peak QPS** | 14 | 5x burst multiplier |
| **Daily Queries** | 80K | Business hours |
| **RAM Required** | 363-121 GB/node | Full vs sharded |
| **Cluster Size** | 3-4 nodes | Data + coordinator |

---

## Quick Reference: Estimation Formulas

```
Storage:
─────────────────────────────────────────────────────────
Vector size (bytes)   = dimensions × 4 (float32)
                     or dimensions × 2 (float16)
                     or dimensions / 8 (binary)

Total vector storage  = num_vectors × vector_size
Index overhead (HNSW) = num_vectors × M × 2 × 8 bytes
Total with replication = (vectors + index) × replication_factor

Compression ratios:
  - Product Quantization: 8-32x
  - Scalar Quantization: 2-4x
  - Binary Quantization: 32x
─────────────────────────────────────────────────────────

Memory:
─────────────────────────────────────────────────────────
HNSW memory = vectors_in_memory + graph_structure + buffer

Rule of thumb:
  100M vectors @ 768-dim ≈ 350-400 GB RAM (HNSW)
  100M vectors @ 768-dim ≈ 80-100 GB RAM (DiskANN + PQ)
─────────────────────────────────────────────────────────

Latency:
─────────────────────────────────────────────────────────
HNSW search hops ≈ log(n) with base ~= M
100M vectors, M=16: ~7-8 hops

Latency ≈ hops × distance_calculation_time
        ≈ 8 × 0.5ms (with SIMD)
        ≈ 4ms base + overhead
─────────────────────────────────────────────────────────
```

---

## Year-over-Year Growth Projection

| Metric | Year 1 | Year 2 | Year 3 | Year 5 |
|--------|--------|--------|--------|--------|
| Documents | 10M | 25M | 50M | 100M |
| Vectors | 100M | 250M | 500M | 1B |
| Storage (raw) | 320 GB | 800 GB | 1.6 TB | 3.2 TB |
| Storage (w/ replication) | 1 TB | 2.5 TB | 5 TB | 10 TB |
| Daily Queries | 80K | 200K | 500K | 1M |
| Peak QPS | 14 | 35 | 87 | 175 |
| Cluster Nodes | 4 | 8 | 15 | 30 |

**Scaling Strategy**: Add shards linearly with data growth; each shard handles ~35M vectors comfortably.
