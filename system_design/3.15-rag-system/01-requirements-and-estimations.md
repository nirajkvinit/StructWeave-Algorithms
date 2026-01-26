# Requirements and Estimations

[← Back to Index](./00-index.md)

---

## Functional Requirements

### Core Functionality

| Requirement | Priority | Description |
|-------------|----------|-------------|
| **Document Ingestion** | P0 | Ingest documents from various sources (files, APIs, web) |
| **Text Chunking** | P0 | Split documents into semantically meaningful chunks |
| **Embedding Generation** | P0 | Convert chunks to vector embeddings |
| **Semantic Search** | P0 | Retrieve relevant chunks for a query |
| **Answer Generation** | P0 | Generate grounded responses using LLM |
| **Citation/Source Attribution** | P0 | Link answers to source documents |
| **Hybrid Search** | P1 | Combine semantic and keyword search |
| **Reranking** | P1 | Reorder results for relevance |
| **User Feedback** | P1 | Collect thumbs up/down, explicit corrections |
| **Conversation History** | P2 | Multi-turn conversations with context |
| **Query Analytics** | P2 | Track query patterns, popular topics |

### Document Ingestion Requirements

```
Supported formats:
─────────────────────────────────────────────────────────
• Text: TXT, MD, HTML
• Documents: PDF, DOCX, PPTX
• Structured: JSON, CSV (with schema)
• Code: Source files with language detection

Ingestion modes:
─────────────────────────────────────────────────────────
• Batch: Bulk upload of document collections
• Incremental: Add/update individual documents
• Real-time: Webhook/streaming for live sources
• Scheduled: Periodic sync from connectors
```

### Query Requirements

```
Query types:
─────────────────────────────────────────────────────────
• Factual: "What is the return policy?"
• Comparison: "How does Plan A differ from Plan B?"
• Procedural: "How do I reset my password?"
• Aggregation: "Summarize all Q3 reports"
• Conversational: Follow-up questions in context

Query modifiers:
─────────────────────────────────────────────────────────
• Filters: date range, document type, source
• Scope: specific collections or all
• Response format: concise, detailed, bullet points
```

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Query Latency (p50)** | <700ms | Perceived as "instant" |
| **Query Latency (p99)** | <2s | Acceptable for complex queries |
| **Time to First Token** | <500ms | Streaming improves perception |
| **Ingestion Throughput** | 1,000 docs/min | Batch ingestion SLA |
| **Ingestion Latency** | <5 min to searchable | Near-real-time updates |
| **Retrieval Recall@10** | >90% | Ensure relevant chunks found |
| **Answer Faithfulness** | >95% | Answers grounded in sources |

### Availability & Reliability

| Metric | Target | Rationale |
|--------|--------|-----------|
| **System Availability** | 99.9% (8.76h downtime/year) | Business-critical application |
| **Query Success Rate** | 99.5% | Including graceful degradation |
| **Data Durability** | 99.999999% (8 nines) | No document loss |
| **Recovery Time (RTO)** | <15 min | Fast failover |
| **Recovery Point (RPO)** | <1 min | Minimal data loss on failure |

### Scalability Requirements

| Dimension | Target | Growth Strategy |
|-----------|--------|-----------------|
| **Documents** | 10M documents | Horizontal sharding |
| **Chunks** | 100M chunks | Vector DB scaling |
| **Queries per Second** | 1,000 QPS | Replica scaling |
| **Concurrent Users** | 10,000 | Load balancing |
| **Storage** | 10TB | Object storage + vector DB |

### Quality Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Faithfulness** | >95% | RAGAS faithfulness score |
| **Answer Relevance** | >90% | RAGAS answer relevance |
| **Context Relevance** | >85% | RAGAS context precision |
| **Hallucination Rate** | <5% | Claims not in sources |
| **Citation Accuracy** | >98% | Correct source attribution |

---

## Capacity Estimations

### Baseline Assumptions

```
Document corpus:
─────────────────────────────────────────────────────────
• Total documents: 10 million
• Average document size: 10 KB (after extraction)
• Average chunks per document: 10
• Total chunks: 100 million

Query traffic:
─────────────────────────────────────────────────────────
• Peak QPS: 1,000
• Average queries per day: 10 million
• Average tokens per query: 50
• Average retrieved chunks per query: 10
• Average response tokens: 500

Ingestion traffic:
─────────────────────────────────────────────────────────
• New documents per day: 10,000
• Updates per day: 5,000
• Deletes per day: 1,000
```

### Storage Calculations

```
Vector Storage:
─────────────────────────────────────────────────────────
Chunks: 100M
Embedding dimensions: 1,536 (OpenAI ada-002) or 768 (open-source)
Bytes per dimension: 4 (float32)

Vector size (1536-dim): 100M × 1,536 × 4 = 614 GB
Vector size (768-dim):  100M × 768 × 4 = 307 GB

With HNSW index overhead (~1.5x): 460 GB - 920 GB
With 3x replication: 1.4 TB - 2.8 TB

Text Storage:
─────────────────────────────────────────────────────────
Chunk text: 100M × 500 tokens × 4 chars = 200 GB
Document metadata: 10M × 1 KB = 10 GB
With 3x replication: 630 GB

Total Storage:
─────────────────────────────────────────────────────────
Vectors (3x replication): ~1.4 TB (768-dim) to 2.8 TB (1536-dim)
Text + Metadata (3x):     ~630 GB
BM25 Index:               ~50 GB
Total:                    ~2.1 TB to 3.5 TB
```

### Compute Estimations

```
Embedding Generation:
─────────────────────────────────────────────────────────
New chunks per day: 10,000 docs × 10 chunks = 100,000 chunks
Embedding throughput: ~100 chunks/sec (batch, GPU)
Time to embed: 100,000 / 100 = ~17 minutes/day

Peak embedding (initial load):
100M chunks / 100 chunks/sec = 277 hours = ~12 days
With 10 GPU workers: ~30 hours

Query Processing:
─────────────────────────────────────────────────────────
Components per query:
• Query embedding: 10ms
• Vector search: 20ms
• BM25 search: 10ms
• Reranking (20 chunks): 100ms
• LLM generation (500 tokens): 500ms
• Total: ~640ms p50

At 1,000 QPS:
• Embedding service: 10ms × 1000 = 10 cores
• Vector DB: 20ms × 1000 = 20 cores (or dedicated cluster)
• Reranker: 100ms × 1000 = 100 cores (GPU preferred)
• LLM inference: 500ms × 1000 = 500 cores (GPU required)
```

### Cost Estimations (Monthly)

```
LLM Inference (Primary Cost Driver):
─────────────────────────────────────────────────────────
Queries per month: 10M queries
Input tokens per query: 50 (query) + 5,000 (context) = 5,050
Output tokens per query: 500

Total input tokens: 10M × 5,050 = 50.5B tokens
Total output tokens: 10M × 500 = 5B tokens

At $3/1M input, $15/1M output (GPT-4 class):
Input cost: 50.5B × $3/1M = $151,500/month
Output cost: 5B × $15/1M = $75,000/month
Total LLM: ~$225,000/month

At $0.15/1M input, $0.60/1M output (GPT-4o-mini class):
Input cost: 50.5B × $0.15/1M = $7,575/month
Output cost: 5B × $0.60/1M = $3,000/month
Total LLM: ~$10,600/month

Embedding Generation:
─────────────────────────────────────────────────────────
Initial: 100M chunks × $0.02/1K tokens × 500 tokens = $1M (one-time)
Daily: 100K chunks × $0.02/1K × 500 = $1,000/day = $30K/month
Query embeddings: 10M × 50 tokens × $0.02/1K = $10K/month

Vector Database:
─────────────────────────────────────────────────────────
Managed (Pinecone-style): ~$70/GB/month × 1,400 GB = $98K/month
Self-hosted: 3× r6g.4xlarge ($800/month) = $2,400/month + ops

Total Monthly Cost:
─────────────────────────────────────────────────────────
Economy (GPT-4o-mini, self-hosted vector DB):
• LLM: $10,600
• Embeddings: $40K
• Vector DB: $2,400
• Compute: $5,000
• Total: ~$60,000/month

Premium (GPT-4, managed vector DB):
• LLM: $225,000
• Embeddings: $40K
• Vector DB: $98,000
• Compute: $10,000
• Total: ~$375,000/month
```

---

## Traffic Patterns

### Query Traffic Distribution

```
Time-based patterns:
─────────────────────────────────────────────────────────
• Peak hours: 9am-5pm local time (3x average)
• Off-peak: 10pm-6am (0.3x average)
• Weekly: Monday highest, Sunday lowest

Query type distribution:
─────────────────────────────────────────────────────────
• Simple factual: 60% (single-turn, fast)
• Multi-turn conversational: 25% (context needed)
• Complex analytical: 10% (long response)
• Aggregation/summary: 5% (multi-document)

Response length distribution:
─────────────────────────────────────────────────────────
• Short (<100 tokens): 30%
• Medium (100-500 tokens): 50%
• Long (500-2000 tokens): 18%
• Very long (>2000 tokens): 2%
```

### Ingestion Patterns

```
Batch ingestion:
─────────────────────────────────────────────────────────
• Initial load: 10M documents (one-time)
• Weekly bulk updates: 50K documents
• Daily incremental: 10K documents

Real-time updates:
─────────────────────────────────────────────────────────
• Live documents (wikis, tickets): 100/hour
• Webhook-triggered: 500/hour
• User uploads: 50/hour
```

---

## SLO Definitions

### Latency SLOs

| Tier | Query Type | p50 | p95 | p99 |
|------|-----------|-----|-----|-----|
| **Fast** | Simple factual, cached | 300ms | 500ms | 800ms |
| **Standard** | General queries | 700ms | 1.2s | 2s |
| **Complex** | Multi-doc, analytical | 2s | 4s | 6s |
| **Streaming** | Time to first token | 300ms | 500ms | 800ms |

### Quality SLOs

| Metric | Threshold | Measurement Window |
|--------|-----------|-------------------|
| **Faithfulness** | >95% | Weekly sample (1,000 queries) |
| **Relevance** | >90% | Weekly sample |
| **Hallucination Rate** | <5% | Continuous monitoring |
| **User Satisfaction** | >80% positive | Daily feedback ratio |

### Availability SLOs

| Component | Target | Error Budget (monthly) |
|-----------|--------|------------------------|
| **End-to-End** | 99.9% | 43 minutes |
| **Retrieval** | 99.95% | 22 minutes |
| **Generation** | 99.9% | 43 minutes |
| **Ingestion** | 99.5% | 3.6 hours |

---

## Constraints & Assumptions

### Technical Constraints

```
Infrastructure:
─────────────────────────────────────────────────────────
• Cloud provider: AWS/GCP/Azure (multi-region capable)
• LLM provider: API-based (OpenAI, Anthropic, etc.)
• GPU availability: Limited, prefer serverless inference
• Network: Cross-region latency <100ms

Data:
─────────────────────────────────────────────────────────
• Document formats: Text-extractable (no handwriting)
• Languages: English primary (multi-lingual future)
• Max document size: 50MB per file
• Max chunk size: 2,000 tokens
```

### Business Constraints

```
Compliance:
─────────────────────────────────────────────────────────
• Data residency: Region-specific storage
• PII handling: Detection and redaction required
• Audit logging: All queries logged for 90 days
• Access control: Document-level permissions

Budget:
─────────────────────────────────────────────────────────
• Initial build: $500K
• Monthly operational: <$100K (target)
• Cost per query: <$0.01 average
```

### Assumptions

```
User behavior:
─────────────────────────────────────────────────────────
• 80% of queries can be answered from top-10 chunks
• 50% of users will ask follow-up questions
• 10% query cache hit rate (similar questions)
• Average session length: 3-5 queries

Content:
─────────────────────────────────────────────────────────
• Documents are mostly text (not tables/images)
• Average document quality is high (well-written)
• 20% of corpus is frequently accessed
• Documents are version-controlled
```

---

## Capacity Planning Matrix

| Scale | Documents | Chunks | QPS | Vector DB | LLM Cost/mo | Total Cost/mo |
|-------|-----------|--------|-----|-----------|-------------|---------------|
| **Startup** | 100K | 1M | 10 | Single node | $1K | $3K |
| **Growth** | 1M | 10M | 100 | 3-node cluster | $5K | $15K |
| **Scale** | 10M | 100M | 1,000 | Sharded cluster | $20K | $60K |
| **Enterprise** | 100M | 1B | 10,000 | Multi-region | $200K | $500K |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Initial requirements and estimations |
