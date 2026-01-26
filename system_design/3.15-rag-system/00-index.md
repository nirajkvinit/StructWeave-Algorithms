# Retrieval-Augmented Generation (RAG) System

[← Back to System Design Index](../README.md)

## Overview

A **Retrieval-Augmented Generation (RAG) System** enhances Large Language Models (LLMs) by grounding their responses in relevant, retrieved knowledge. Instead of relying solely on the model's parametric memory (training data), RAG retrieves context from a knowledge base at inference time, enabling more accurate, up-to-date, and verifiable responses. RAG is the foundation for modern AI applications including enterprise search, customer support agents, document Q&A, and knowledge assistants.

---

## Complexity Rating

| Aspect | Rating | Justification |
|--------|--------|---------------|
| **Overall** | **Very High** | End-to-end system spanning ingestion, retrieval, and generation with multiple AI components |
| Algorithm Complexity | High | Chunking strategies, hybrid retrieval, reranking, prompt engineering |
| Scale Challenges | Very High | Balancing retrieval quality, LLM costs, and latency at scale |
| Operational Complexity | High | Multiple ML models, quality monitoring, prompt versioning |
| Interview Frequency | Very High | Most common AI system design question (2025+) |

---

## Key Characteristics

| Characteristic | Value | Implication |
|----------------|-------|-------------|
| **Query Pattern** | Natural language questions | Semantic understanding required |
| **Response Type** | Generated text with citations | Grounded, verifiable answers |
| **Read:Write Ratio** | 100:1+ (read-heavy) | Optimize for query throughput |
| **Latency Target** | p50 <700ms, p99 <2s | Streaming essential for perceived performance |
| **Quality Metrics** | Faithfulness, relevance, completeness | RAGAS-style evaluation required |
| **Cost Driver** | LLM inference (80%+ of cost) | Token optimization critical |
| **Freshness** | Minutes to real-time | Index update strategy matters |

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [01 - Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning |
| [02 - High-Level Design](./02-high-level-design.md) | Architecture, components, data flow |
| [03 - Low-Level Design](./03-low-level-design.md) | Data model, APIs, algorithm pseudocode |
| [04 - Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Chunking, retrieval, context assembly |
| [05 - Scalability & Reliability](./05-scalability-and-reliability.md) | Caching, fault tolerance, scaling |
| [06 - Security & Compliance](./06-security-and-compliance.md) | Access control, PII, prompt injection |
| [07 - Observability](./07-observability.md) | RAG-specific metrics, RAGAS, tracing |
| [08 - Interview Guide](./08-interview-guide.md) | Pacing, trap questions, trade-offs |

---

## RAG vs. Other Approaches

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Fine-tuning** | No retrieval latency, compact | Expensive, stale, no citations | Style/behavior changes |
| **Long Context** | Simple, no retrieval | Expensive, limited reasoning over noise | Small document sets |
| **RAG** | Fresh data, citations, cost-effective | Retrieval errors, added latency | Enterprise knowledge, Q&A |
| **Agentic RAG** | Multi-step reasoning, tool use | Complex, higher latency | Complex research tasks |

---

## Core Algorithm Comparison

### Chunking Strategies

| Strategy | Chunk Size | Overlap | Pros | Cons | Recall Impact |
|----------|------------|---------|------|------|---------------|
| **Fixed-Size** | 256-512 tokens | 10-20% | Simple, predictable | Breaks semantic units | Baseline |
| **Sentence-Based** | Variable | By sentence | Preserves sentences | Varying chunk sizes | +5-10% |
| **Semantic** | Variable | Similarity threshold | Preserves meaning | Compute-intensive | +15-25% |
| **Late Chunking** | Full doc → chunk after | None | Best context | Expensive embeddings | +20-30% |
| **Agentic** | Dynamic | Query-aware | Optimal per query | Highest latency | +25-35% |

### Retrieval Methods

| Method | Type | Recall@10 | Latency | Best For |
|--------|------|-----------|---------|----------|
| **Dense (Embedding)** | Semantic | 85-92% | 10-30ms | Meaning-based queries |
| **Sparse (BM25)** | Lexical | 75-85% | 5-15ms | Exact terms, names, codes |
| **Hybrid (Dense+Sparse)** | Combined | 90-97% | 15-40ms | General-purpose RAG |
| **Multi-Vector** | ColBERT-style | 93-98% | 30-50ms | Precise matching |
| **GraphRAG** | Knowledge graph | 85-95% | 50-100ms | Multi-hop reasoning |

### Reranking Methods

| Method | Accuracy Boost | Latency | Cost | Best For |
|--------|---------------|---------|------|----------|
| **No Reranking** | Baseline | 0ms | $0 | Simple use cases |
| **Cross-Encoder** | +20-35% | 50-150ms | $$ | Quality-critical |
| **ColBERT** | +15-25% | 20-50ms | $ | Balanced |
| **LLM Reranker** | +25-40% | 200-500ms | $$$ | Highest quality |
| **RRF (Rank Fusion)** | +10-20% | 1ms | $0 | Hybrid search |

### RAG Variants

| Variant | Description | Complexity | Latency | Use Case |
|---------|-------------|------------|---------|----------|
| **Naive RAG** | Single retrieval → LLM | Low | <1s | Simple Q&A |
| **Advanced RAG** | Hybrid search + rerank + prompt engineering | Medium | 1-2s | Production systems |
| **Modular RAG** | Configurable pipeline components | Medium | 1-3s | Experimentation |
| **Agentic RAG** | Multi-step retrieval with reasoning | High | 3-10s | Research, complex tasks |
| **GraphRAG** | Knowledge graph + retrieval | High | 2-5s | Multi-hop reasoning |
| **Corrective RAG** | Self-verification loop | High | 2-5s | High-stakes answers |

---

## Architecture Patterns

### Pattern 1: Simple RAG (MVP)

```
┌─────────────────────────────────────────────────────────┐
│                    Architecture                          │
├─────────────────────────────────────────────────────────┤
│  Query → Embed → Vector Search → Top-K → LLM → Response │
│  • Single embedding model                                │
│  • Vector-only retrieval                                 │
│  • No reranking                                          │
│  • Best: <100K documents, prototyping                   │
├─────────────────────────────────────────────────────────┤
│  Latency: 500-800ms | Recall: 75-85%                    │
└─────────────────────────────────────────────────────────┘
```

### Pattern 2: Production RAG (Recommended)

```
┌─────────────────────────────────────────────────────────┐
│                    Architecture                          │
├─────────────────────────────────────────────────────────┤
│  Query → Query Rewrite → Hybrid Search → Rerank →       │
│         Context Assembly → LLM (streaming) → Response    │
│  • Hybrid: Dense embeddings + BM25                       │
│  • Cross-encoder reranking                               │
│  • Citation extraction                                   │
│  • Best: 100K-10M documents, enterprise                 │
├─────────────────────────────────────────────────────────┤
│  Latency: 1-2s p99 | Recall: 90-97%                     │
└─────────────────────────────────────────────────────────┘
```

### Pattern 3: Agentic RAG (Complex Reasoning)

```
┌─────────────────────────────────────────────────────────┐
│                    Architecture                          │
├─────────────────────────────────────────────────────────┤
│  Query → Planner → Multi-turn Retrieval → Synthesis     │
│  • Query decomposition into sub-queries                  │
│  • Iterative retrieval with reasoning                    │
│  • Tool use (calculators, APIs, etc.)                    │
│  • Self-correction and verification                      │
│  • Best: Research, complex analysis                     │
├─────────────────────────────────────────────────────────┤
│  Latency: 5-30s | Accuracy: Highest                     │
└─────────────────────────────────────────────────────────┘
```

---

## Real-World Implementations

| System | Company | Architecture | Key Innovation |
|--------|---------|--------------|----------------|
| **Perplexity** | Perplexity AI | Real-time web RAG | Streaming + citations |
| **Glean** | Glean | Enterprise search RAG | Deep connector ecosystem |
| **Notion AI** | Notion | Workspace RAG | Hierarchical retrieval |
| **GitHub Copilot Chat** | GitHub | Code RAG | AST-aware chunking |
| **Amazon Q** | AWS | Enterprise RAG | Fine-grained ACL |
| **ChatGPT with Search** | OpenAI | Web-augmented | Real-time web integration |

---

## Key Trade-offs Visualization

```
                        QUALITY (Accuracy)
                              ▲
                              │
                 Agentic ─────┼───────── Highest
                              │           (multi-step)
          Advanced RAG ───────┼───────────────
                              │                 │
           Simple RAG ────────┼─────────────────┼───
                              │                 │   │
                              └─────────────────┴───┴──► LATENCY
                                  1s           3s  10s

─────────────────────────────────────────────────────────────────

                          LLM COST
                              ▲
                              │
              Large Context ──┼──── Highest ($$$)
                              │
           Agentic (multi) ───┼────────
                              │       │
           Simple RAG ────────┼───────┼──── Lowest ($)
                              │       │          │
                              └───────┴──────────┴──► TOKENS USED
                                  4K   16K       100K+
```

---

## When to Use RAG

### Use When

- **Knowledge freshness matters**: Data changes frequently (news, docs, inventory)
- **Source attribution required**: Users need to verify claims with citations
- **Domain-specific knowledge**: Proprietary data not in LLM training
- **Cost optimization**: Avoid fine-tuning or large context windows
- **Privacy constraints**: Keep sensitive data out of LLM training
- **Multi-tenant applications**: Different knowledge bases per user/org

### Avoid When

- **Pure generation tasks**: Creative writing, brainstorming (no retrieval needed)
- **Tiny knowledge base**: <100 documents (just use long context)
- **Style/behavior changes**: Fine-tuning is more effective
- **Real-time streaming**: Sub-100ms latency requirements
- **No text content**: Pure numerical or structured data

---

## Interview Readiness Checklist

### Must Know

- [ ] Why RAG over fine-tuning or long context
- [ ] Chunking strategies and their trade-offs
- [ ] Hybrid search (dense + sparse) and why it's better
- [ ] Cross-encoder reranking and when to use it
- [ ] Context window management and prompt engineering
- [ ] Basic RAG metrics (recall@k, faithfulness, relevance)

### Should Know

- [ ] Reciprocal Rank Fusion (RRF) for hybrid search
- [ ] Semantic chunking algorithms
- [ ] Query rewriting and HyDE
- [ ] Citation extraction techniques
- [ ] Caching strategies for RAG
- [ ] Document-level access control

### Nice to Know

- [ ] RAGCache and KV-cache optimization
- [ ] ColBERT and late interaction models
- [ ] GraphRAG and knowledge graphs
- [ ] Agentic RAG with tool use
- [ ] RAGAS evaluation framework
- [ ] Prompt injection defenses

---

## Related Topics

- [3.14 - Vector Database](../3.14-vector-database/00-index.md) - Foundation for dense retrieval
- [3.13 - LLM Training & Inference](../3.13-llm-training-inference-architecture/00-index.md) - LLM component
- [3.16 - Feature Store](../3.16-feature-store/00-index.md) - ML feature serving patterns (upcoming)

---

## References & Further Reading

### Papers
- Lewis et al. (2020): "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" - Original RAG paper
- Gao et al. (2024): "Retrieval-Augmented Generation for Large Language Models: A Survey" - Comprehensive survey
- Shi et al. (2023): "REPLUG: Retrieval-Augmented Black-Box Language Models"

### Engineering Blogs
- [Anthropic RAG Guide](https://docs.anthropic.com/en/docs/build-with-claude/retrieval-augmented-generation) - Production patterns
- [LangChain RAG Documentation](https://python.langchain.com/docs/tutorials/rag/) - Implementation patterns
- [Pinecone Learning Center](https://www.pinecone.io/learn/) - Vector search for RAG

### Evaluation
- [RAGAS](https://github.com/explodinggradients/ragas) - RAG evaluation framework
- [RAG Evaluation Metrics](https://docs.ragas.io/en/latest/concepts/metrics/index.html) - Faithfulness, relevance, context

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Initial release covering naive to advanced RAG patterns |
