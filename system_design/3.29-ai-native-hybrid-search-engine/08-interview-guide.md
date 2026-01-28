# Interview Guide

## Interview Pacing (45-minute format)

| Time | Phase | Focus | Key Deliverables |
|------|-------|-------|------------------|
| 0-5 min | **Clarify** | Understand requirements | Use case, scale, constraints |
| 5-15 min | **High-Level** | Architecture overview | Components, data flow diagram |
| 15-30 min | **Deep Dive** | Critical components | RRF algorithm, reranking trade-offs |
| 30-40 min | **Scale & Trade-offs** | Production concerns | Sharding, failures, bottlenecks |
| 40-45 min | **Wrap Up** | Summary & Q&A | Key decisions, follow-ups |

---

## Phase 1: Clarifying Questions (0-5 min)

### Questions to Ask the Interviewer

**Use Case & Data:**
- "Is this for RAG (retrieval for LLMs), e-commerce product search, or general document search?"
- "What's the corpus size - millions or billions of documents?"
- "Are documents mostly text, or do we need multi-modal (images, PDFs)?"
- "How frequently are documents updated - real-time or batch?"

**Latency & Quality:**
- "What's the latency budget? Sub-100ms for conversational AI, or can we tolerate 500ms?"
- "Is this read-heavy or write-heavy? What's the expected QPS?"
- "How important is ranking quality vs speed? Would users prefer faster results or better results?"

**Scale & Infrastructure:**
- "Is this multi-tenant? How many tenants and how isolated?"
- "Any geographic distribution requirements?"
- "Budget constraints - can we use managed services or must be self-hosted?"

### Scoping the Problem

After clarifying, state your assumptions:

> "Let me summarize: We're building a hybrid search engine for a RAG application, with 100 million documents, expecting 1000 QPS, sub-100ms latency, multi-tenant with 100 tenants. Quality is important, so we'll include reranking. Does that match your expectations?"

---

## Phase 2: High-Level Design (5-15 min)

### Key Points to Cover

**1. Two-Stage Retrieval Architecture:**

> "The core insight is that we need two stages: a fast first stage to find candidates from billions of documents, and a precise second stage to rerank the top candidates."

**2. Why Hybrid Search:**

> "Dense search (vectors) captures semantic meaning - 'automobile' matches 'car'. Sparse search (BM25) excels at exact keywords and rare terms. Research shows combining both improves quality by 15-25%."

**3. Fusion with RRF:**

> "We combine results using Reciprocal Rank Fusion - the formula is 1/(k+rank). It's parameter-free and robust because it uses ranks instead of scores, avoiding normalization problems."

### Architecture Talking Points

Draw or describe these components:

```
Client → API Gateway → Query Service
                           ↓
                    ┌──────┴──────┐
                    ↓             ↓
              Dense Search   Sparse Search
                    ↓             ↓
                    └──────┬──────┘
                           ↓
                      RRF Fusion
                           ↓
                      Reranking (optional)
                           ↓
                       Results
```

**Component responsibilities:**
- **Query Service**: Parse query, generate embedding, orchestrate search
- **Dense Search**: Vector similarity using HNSW index
- **Sparse Search**: BM25 using inverted index
- **Fusion**: Combine ranked lists with RRF
- **Reranking**: Cross-encoder re-scoring of top candidates

---

## Phase 3: Deep Dive Options (15-30 min)

The interviewer will likely ask you to go deep on one area. Prepare for these:

### Option A: Fusion Strategies

**Why is fusion hard?**
> "Dense search returns cosine similarity (0-1), while BM25 returns unbounded positive scores (5-50+). You can't just add them - BM25 would dominate."

**Solution: RRF**
> "RRF uses ranks instead of scores: score = sum of 1/(k+rank) across retrievers. With k=60, it provides good rank compression. No tuning needed."

**Alternative: Linear Combination**
> "If we need tuning, we can use alpha × dense + (1-alpha) × sparse. But this requires score normalization - typically min-max per query."

**When to use which:**
| Scenario | Recommendation |
|----------|----------------|
| Default, no tuning | RRF |
| Domain-specific, labeled data | Linear with tuned alpha |
| Maximum quality | Learned fusion model |

### Option B: Two-Stage Trade-offs

**Why two stages?**
> "Cross-encoders see query and document together - full attention between them. This gives 20-35% quality improvement but is 1000x slower than bi-encoders."

**The trade-off:**

| Stage | Model | Speed | Quality |
|-------|-------|-------|---------|
| First | Bi-encoder | 10K docs/sec | Good |
| Second | Cross-encoder | 10-100 docs/sec | Excellent |

**Candidate count trade-off:**
> "Reranking 50 candidates: +18% NDCG, 25ms latency. Reranking 100: +23% NDCG, 50ms latency. Reranking 200: +25% NDCG, 100ms latency. Sweet spot is usually 50-100."

### Option C: SPLADE / Learned Sparse

**What is SPLADE?**
> "SPLADE is a neural model that outputs sparse vectors like BM25, but learns which terms are important. It expands queries with related terms - 'machine learning' might add 'ML', 'neural', 'AI' to the sparse representation."

**Why use it over BM25?**
> "SPLADE improves semantic matching while still using efficient inverted index lookup. Best of both worlds - neural quality, sparse efficiency."

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Scaling Discussion

**Sharding:**
> "For 1 billion documents, we shard by document ID hash. Each shard has its own HNSW graph and inverted index. Queries fan out to all shards, each returns top-K, then we merge globally."

**Replication:**
> "Three replicas per shard for availability. Async replication is fine - search can tolerate seconds of lag. Queries load-balance across replicas."

**GPU for reranking:**
> "Reranking requires GPU. We batch requests to maximize throughput. Auto-scale GPU nodes based on queue depth."

### Bottleneck Analysis

| Bottleneck | Symptom | Solution |
|------------|---------|----------|
| Reranking latency | End-to-end > 100ms | Fewer candidates, smaller model |
| Embedding generation | Slow indexing | Batch embedding, GPU |
| Index synchronization | Inconsistent results | Atomic multi-index writes |
| Score calibration | One retriever dominates | Use RRF |

### Failure Scenarios

**What if dense search is slow?**
> "Circuit breaker triggers, we fall back to sparse-only. Quality drops 15-20%, but we maintain availability."

**What if reranking fails?**
> "We skip reranking and return first-stage results. Quality drops 20-25%, but latency improves."

**What if one shard is down?**
> "We return partial results from healthy shards with a warning. Better than failing entirely."

---

## Trap Questions and Responses

### Trap 1: "Why not just use dense search?"

> **What they want:** Understand hybrid search value proposition.

> **Answer:** "Dense search excels at semantic matching - 'automobile' finds 'car'. But it misses exact keyword matches, especially for rare terms, product IDs, or specific phrases. BM25 catches these. Research shows hybrid improves quality 15-25% over either alone. The extra complexity is worth it for search quality."

### Trap 2: "Why not always rerank?"

> **What they want:** Understand latency/quality trade-offs.

> **Answer:** "Cross-encoders are 1000x slower than bi-encoders - they see query and document together, requiring O(query × doc) attention. For low-latency applications like autocomplete, 50ms reranking is too slow. We make reranking optional and configurable. Some queries (navigational, simple lookups) don't need it; complex queries benefit from it."

### Trap 3: "How do you combine different scores?"

> **What they want:** Technical depth on fusion.

> **Answer:** "Dense returns cosine similarity (0-1), BM25 returns unbounded positive scores (5-50+). You can't add them directly - BM25 dominates. RRF solves this by using ranks: score = 1/(60+rank). Ranks are comparable across systems. Alternative is score normalization (min-max), but that's query-dependent and less robust."

### Trap 4: "What about ColBERT?"

> **What they want:** Knowledge of advanced retrieval.

> **Answer:** "ColBERT is a 'late interaction' model - between bi-encoder and cross-encoder. It stores per-token embeddings for each document, not just one vector. At query time, it computes MaxSim: for each query token, find max similarity to any document token, then sum. It's more precise than bi-encoder (fine-grained matching) but faster than cross-encoder (document embeddings pre-computed). Trade-off is storage - multiple vectors per document."

### Trap 5: "How do you handle multi-modal search?"

> **What they want:** Multi-modal understanding.

> **Answer:** "CLIP creates aligned text-image embeddings - same vector space for both. A text query like 'sunset beach' can match beach photos. For documents with images, ColPali processes page images directly, avoiding complex OCR pipelines. The challenge is ensuring embeddings are truly aligned - we need training data with text-image pairs."

### Trap 6: "What's the CAP trade-off here?"

> **What they want:** Distributed systems fundamentals.

> **Answer:** "We choose AP - Availability and Partition tolerance. Search can tolerate eventual consistency - if a document indexed 2 seconds ago doesn't appear yet, users don't notice. But search being unavailable is catastrophic for user experience. We use async replication with 1-5 second lag, accepting temporary inconsistency for availability."

---

## 5-Minute System Walkthrough

For quick explanations or wrap-up:

> "An AI-Native Hybrid Search Engine combines multiple retrieval methods for superior search quality.
>
> **Architecture:** Two-stage retrieval. First stage runs dense vector search (HNSW) and sparse BM25 search in parallel. Results are fused using RRF - Reciprocal Rank Fusion - with formula 1/(k+rank), avoiding score normalization issues. Optional second stage uses cross-encoder to rerank top 100 candidates.
>
> **Why hybrid:** Dense search understands semantics - 'automobile' matches 'car'. Sparse search excels at keywords and rare terms. Combined, we see 15-25% quality improvement over either alone.
>
> **Fusion:** RRF is parameter-free and robust. We sum 1/(60+rank) across retrievers. Documents ranked highly by both get highest scores.
>
> **Reranking:** Cross-encoder sees query-document pairs together, giving 20-35% accuracy boost. Trade-off is latency - 50ms for 100 candidates. We make it optional.
>
> **Key platforms:** Vespa (8.5x throughput over Elasticsearch), Elasticsearch (mature), Pinecone (managed), Qdrant (performance).
>
> **Challenges:** Score normalization, reranking latency, index synchronization, GPU cost optimization."

---

## Key Numbers to Know

| Metric | Value | Context |
|--------|-------|---------|
| **RRF k parameter** | 60 | Standard default, no tuning needed |
| **Hybrid vs single-modal** | +15-25% | Quality improvement |
| **Cross-encoder improvement** | +20-35% | Over first-stage only |
| **Vespa vs Elasticsearch** | 8.5x | Throughput per CPU core |
| **Bi-encoder speed** | 10,000 docs/s | Can search billions |
| **Cross-encoder speed** | 10-100 docs/s | Reranking bottleneck |
| **Rerank 100 candidates** | 50ms | Typical latency |
| **HNSW ef_search=128** | 97% recall | Balanced setting |
| **SPLADE expansion** | 100-300 tokens | Per document |

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| **Dense-only search** | Misses keywords, rare terms | Always include sparse |
| **Adding scores directly** | BM25 dominates (different scales) | Use RRF or normalize |
| **Always reranking everything** | Latency explosion | Limit to top 100, make optional |
| **Fixed alpha everywhere** | Suboptimal per query | Use RRF or dynamic alpha |
| **Ignoring index sync** | Inconsistent results | Atomic multi-index writes |
| **No graceful degradation** | Single failure = total outage | Circuit breakers, fallbacks |
| **Over-engineering day 1** | Complexity without need | Start simple, add complexity |

---

## Questions to Ask at End

Show engagement and forward thinking:

1. "How would you handle real-time personalization in search results?"
2. "What's your approach to A/B testing search quality changes?"
3. "How do you measure search quality in production without labeled data?"
4. "Are there plans for multi-modal search (images, audio)?"
5. "How do you handle query understanding and intent classification?"

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                  HYBRID SEARCH QUICK REFERENCE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ARCHITECTURE                                                    │
│  ────────────                                                    │
│  Two-stage: Fast retrieval → Precise reranking                  │
│  Hybrid: Dense (vectors) + Sparse (BM25)                        │
│  Fusion: RRF with k=60 (parameter-free)                         │
│                                                                  │
│  KEY ALGORITHMS                                                  │
│  ──────────────                                                  │
│  RRF: score = Σ 1/(k + rank_i)                                  │
│  HNSW: Multi-layer graph ANN                                     │
│  Cross-encoder: Query-doc pair attention                         │
│                                                                  │
│  LATENCY TARGETS                                                 │
│  ───────────────                                                 │
│  First-stage: 20-50ms (p95)                                     │
│  Reranking: 50ms for 100 candidates                             │
│  End-to-end: <100ms (p95)                                       │
│                                                                  │
│  QUALITY IMPROVEMENTS                                            │
│  ────────────────────                                            │
│  Hybrid vs single: +15-25%                                       │
│  With reranking: +20-35% more                                   │
│                                                                  │
│  SCALING                                                         │
│  ───────                                                         │
│  Shard by doc_id hash                                           │
│  3 replicas per shard                                           │
│  GPU for reranking (batch)                                       │
│                                                                  │
│  FALLBACKS                                                       │
│  ─────────                                                       │
│  Reranker down → Skip reranking                                 │
│  Dense down → Sparse-only                                        │
│  Sparse down → Dense-only                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
