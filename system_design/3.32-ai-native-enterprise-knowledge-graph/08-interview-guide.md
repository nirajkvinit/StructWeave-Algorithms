# Interview Guide

## Interview Pacing (45 Minutes)

| Time | Phase | Focus | Deliverables |
|------|-------|-------|--------------|
| **0-5 min** | Clarify | Understand scope, constraints | Requirements summary on whiteboard |
| **5-15 min** | High-Level | Architecture, major components | Four-layer diagram, data flow |
| **15-30 min** | Deep Dive | 1-2 critical components | Detailed algorithm/design |
| **30-40 min** | Scale & Trade-offs | Production concerns | Bottlenecks, failure handling |
| **40-45 min** | Wrap Up | Summary, questions | Key decisions, next steps |

---

## Phase 1: Clarifying Questions (0-5 min)

### Questions to Ask

**Scope:**
- "Is this for enterprise knowledge management or a specific domain (legal, healthcare)?"
- "What's the corpus size - millions or billions of documents?"
- "What types of documents - wikis, emails, code, tickets?"

**Scale:**
- "How many concurrent users?"
- "What's the expected query volume?"
- "Is real-time ingestion required or is batch acceptable?"

**Queries:**
- "What types of queries - simple lookup, thematic questions, or complex reasoning?"
- "Latency requirements - interactive (sub-second) or async?"

**Requirements:**
- "Multi-tenancy or single-tenant?"
- "Personal knowledge layer (user-specific views)?"
- "Temporal queries (point-in-time questions)?"

### Scoping Statement Template

> "Based on our discussion, I'll design an enterprise knowledge graph that:
> - Ingests [X] documents daily with [real-time/batch] processing
> - Stores [X billion] entities and [X billion] relationships
> - Supports GraphRAG queries with [P95 latency target]
> - Handles [X concurrent users] with [multi-tenant/single-tenant] isolation
>
> I'll focus on the core architecture and deep dive into [entity resolution / GraphRAG retrieval]."

---

## Phase 2: High-Level Design (5-15 min)

### Key Architecture Points

**Draw the four-layer architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                        INGESTION LAYER                          │
│   [Connectors] → [Semantic Chunker] → [Kafka Queue]             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      CONSTRUCTION LAYER                         │
│   [Entity Extractor] → [Relation Extractor] → [Entity Resolver] │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        STORAGE LAYER                            │
│   [Graph DB (Neo4j)]  [Vector DB]  [Document Store]  [Cache]    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       RETRIEVAL LAYER                           │
│   [Local Search] [Global Search] [Multi-hop Reasoner] → [LLM]   │
└─────────────────────────────────────────────────────────────────┘
```

### Talking Points

**Why Knowledge Graphs + RAG?**
> "Traditional RAG retrieves text chunks by semantic similarity but loses structural relationships. A knowledge graph captures explicit relationships between entities - who works where, what owns what, how things connect. GraphRAG combines both: using graph structure to guide retrieval and provide richer, more connected context to the LLM."

**Why Entity Resolution Matters:**
> "Without entity resolution, 'John Smith', 'J. Smith', and 'John' become three separate entities. This fragments knowledge and breaks traversal. Entity resolution links these mentions to one canonical entity, enabling accurate multi-hop queries like 'Who manages John's manager?'"

**GraphRAG Local vs Global:**
> "Local search starts from entities mentioned in the query and traverses the graph outward - great for specific questions like 'Who is Alice's manager?' Global search uses community summaries - clusters of related entities - for thematic questions like 'What are our main product lines?' We need both modes."

### Technology Choices (Brief)

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Graph DB | Neo4j | Mature, Cypher, 100TB+ with Infinigraph |
| Vector DB | Weaviate | Hybrid search, open-source option |
| Extraction | GLiNER + SpaCy + LLM | Ensemble for coverage |
| Community | Leiden algorithm | Better than Louvain for summaries |

---

## Phase 3: Deep Dive Options (15-30 min)

Choose 1-2 based on interviewer interest:

### Option A: Entity Resolution

**The problem:**
> "We have 50 million new entity mentions per day against 5 billion existing entities. Naive O(n²) comparison is impossible."

**The solution - blocking + matching:**

1. **Blocking (reduce candidates):**
   - Generate blocking keys: name prefix, phonetic (Soundex/Metaphone), embedding LSH
   - Union candidate sets from all strategies
   - Reduces 5B to ~500 candidates per entity

2. **Matching (score candidates):**
   - Name similarity: Jaro-Winkler (40% weight)
   - Semantic similarity: embedding cosine (40% weight)
   - Type matching: same entity type (20% weight)
   - Combined score threshold: 0.85

3. **Transitive closure:**
   - If A matches B and B matches C, then A matches C
   - Run periodically in batch to handle chains

**Key trade-offs:**
- Precision vs recall: We favor precision (90%+) because false merges corrupt the graph permanently
- Online vs batch: Hybrid - online for ingestion, batch for cleanup

### Option B: GraphRAG Retrieval

**Local search algorithm:**
```
1. Extract entities from query (NER)
2. Match to graph entities (fuzzy + semantic)
3. K-hop traversal from matched entities
4. Rank by relevance to query
5. Assemble context within token budget
```

**Global search algorithm:**
```
1. Embed query
2. Search community summaries by similarity
3. For top-K communities, extract relevant points
4. Map-reduce: combine partial answers
5. Synthesize final response
```

**Community detection:**
> "We use Leiden over Louvain because Louvain can create poorly-connected communities - nodes connected only through other communities. Leiden's refinement phase ensures every community is internally well-connected, which is critical for coherent summarization."

**DRIFT search:**
> "For complex queries, we use iterative refinement. Start broad, identify gaps, generate follow-up queries, local search on gaps, merge results. Converge when coverage is sufficient."

### Option C: Multi-Hop Reasoning

**The challenge:**
> "Multi-hop questions like 'Who are the customers of products from Alice's department?' require 3+ traversals. Each hop has potential for error, and errors compound exponentially."

**Solution - decomposition + verification:**

1. **Decompose query into sub-questions:**
   - "What department does Alice work in?"
   - "What products does that department own?"
   - "Who are the customers of those products?"

2. **Answer each with graph evidence:**
   - Retrieve relevant subgraph
   - Generate intermediate answer
   - **Verify against graph facts**

3. **Synthesize final answer:**
   - Chain intermediate answers
   - Include reasoning trace

**Verification is key:**
> "Without verification, we get 95% accuracy per hop, which compounds to 86% for 3 hops. With verification, we catch errors early and can backtrack to try alternative paths."

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Scaling Discussion

**Graph sharding:**
> "We shard by detected community to minimize cross-shard edges. Most traversals stay within a shard. For cross-shard queries, we use Neo4j Fabric to federate."

**Entity resolution at scale:**
> "Blocking is the key - it reduces O(n²) to O(n). Multiple blocking strategies (name prefix, phonetic, LSH) ensure high recall while keeping candidate counts manageable."

**Community detection:**
> "Leiden runs as a batch job - daily full run, incremental for hot areas. It's too expensive for real-time, so we accept some staleness in community summaries."

### Bottleneck Discussion

| Bottleneck | Solution |
|------------|----------|
| Entity resolution backlog | Better blocking, more workers, prioritize by source |
| Multi-hop latency | Verification caching, parallel sub-question answering |
| Stale summaries | Incremental updates for active communities |
| LLM costs | Batch prompting, cache common patterns, smaller models for easy cases |

### Failure Scenarios

**Graph DB slow/down:**
> "Circuit breaker trips. Fall back to vector-only search with cached entity metadata. Degrade gracefully - users get less connected context but still get answers."

**LLM API down:**
> "Return raw graph facts without synthesis. User sees entities and relationships directly. Less polished but still useful."

**Entity resolution errors:**
> "Flag uncertain resolutions (score 0.80-0.85) for human review. Weekly quality sampling catches systematic issues. Can unmerge entities if caught early."

---

## Trap Questions and Responses

### Trap 1: "Why not just use a vector database?"

**What they're testing:** Understanding of graph vs vector limitations

**Best response:**
> "Vectors capture semantic similarity but lose structure. The question 'Who manages Alice's manager?' requires explicit traversal - Alice → manager → manager's manager. Vectors can find similar text about managers, but can't represent the chain of relationships. Knowledge graphs enable reasoning over explicit connections that vectors can't represent."

### Trap 2: "How do you handle conflicting facts?"

**What they're testing:** Data quality and temporal handling

**Best response:**
> "Three strategies: First, track confidence and provenance - multiple sources agreeing increases confidence. Second, use temporal metadata - newer facts may supersede older ones (Alice was VP, now is Director). Third, for true conflicts, flag for human review in high-stakes domains. We don't silently choose - we surface uncertainty."

### Trap 3: "Why Leiden over Louvain for community detection?"

**What they're testing:** Depth of algorithm knowledge

**Best response:**
> "Louvain can create poorly-connected communities where some nodes are only connected to the community through nodes in other communities. Leiden adds a refinement phase that ensures every community is internally well-connected. This matters for summarization - we want coherent clusters, not arbitrary groupings."

### Trap 4: "How do you scale entity resolution to billions of entities?"

**What they're testing:** Understanding of computational complexity

**Best response:**
> "The key is blocking - reducing candidates before expensive comparison. Multiple blocking strategies: name prefix (100x reduction), phonetic codes (50x), LSH on embeddings (200x). Union the candidate sets for high recall. This reduces O(n²) to O(n × average_candidates), making it tractable. Plus, most entities are re-mentions of existing entities, so cache hits are common."

### Trap 5: "What's your CAP theorem choice?"

**What they're testing:** Distributed systems fundamentals

**Best response:**
> "We choose CP - consistency over availability. Knowledge graph integrity is critical. Inconsistent facts propagate errors through reasoning chains. If Alice reports to Bob in one partition and to Carol in another, multi-hop queries give wrong answers. Better to return 'unavailable' than incorrect facts. We use async replication but strong consistency for writes."

---

## Key Numbers to Know

| Metric | Value | Context |
|--------|-------|---------|
| **Entity extraction F1** | > 85% | Quality threshold for production |
| **Entity resolution precision** | > 90% | False merges are worse than duplicates |
| **Entity resolution recall** | > 80% | Balance with precision |
| **GraphRAG local latency P95** | < 500ms | Interactive response |
| **GraphRAG global latency P95** | < 2s | Acceptable for summaries |
| **Multi-hop accuracy** | > 80% | With verification |
| **Entities per document** | ~50 avg | Estimation baseline |
| **Relationships per entity** | ~5 avg | Estimation baseline |
| **Neo4j Infinigraph** | 100TB+ | Enterprise scale |
| **FalkorDB latency** | < 50ms | Real-time target |
| **Leiden modularity** | > 0.3 | Quality threshold |
| **Blocking reduction** | 100-200x | Candidate filtering |
| **Cache hit rate (entities)** | ~80% | Expected with warm cache |

---

## 5-Minute Walkthrough

> "An AI-Native Enterprise Knowledge Graph combines LLM-based extraction with graph storage for structured enterprise knowledge.
>
> **Architecture:** Four layers.
> - **Ingestion** processes documents into chunks via Kafka.
> - **Construction** extracts entities using an ensemble (GLiNER + SpaCy + LLM), extracts relationships, and resolves duplicates using blocking + semantic matching.
> - **Storage** uses Neo4j for the graph, a vector DB for embeddings, and Redis for caching.
> - **Retrieval** implements GraphRAG with local search (entity-centric, K-hop traversal) and global search (Leiden communities + hierarchical summaries).
>
> **Entity Resolution** is critical at scale. Blocking with name prefix, phonetic codes, and LSH reduces candidates from billions to hundreds. Matching combines name similarity (Jaro-Winkler) and semantic similarity (embedding cosine). Precision > 90% target because false merges corrupt the graph.
>
> **GraphRAG:** Local search starts from query entities, traverses K hops for focused context - great for 'Who manages Alice?' Global search uses Leiden communities with LLM summaries for broad questions like 'What are our main initiatives?' DRIFT enables iterative refinement for complex queries.
>
> **Multi-hop Reasoning:** Decompose complex queries into sub-questions, answer each with graph evidence, verify at each step against graph facts. This prevents error propagation and catches hallucinations.
>
> **Scale:** Graph sharding by community minimizes cross-shard edges. Blocking makes resolution O(n). Community detection runs as a batch job. Neo4j Infinigraph supports 100TB+, FalkorDB for sub-50ms real-time."

---

## Common Mistakes to Avoid

| Mistake | Why It's Bad | Better Approach |
|---------|--------------|-----------------|
| Skip entity resolution | Fragmented graph, broken traversals | Always resolve; duplicates are cheaper than false merges |
| Vector-only retrieval | Loses relationship structure | Hybrid vector + graph search |
| Single-level communities | Misses hierarchical structure | Use Leiden with multiple levels |
| No verification for multi-hop | Hallucination, error propagation | Verify each step against graph |
| Real-time community detection | Too expensive | Background batch, accept some staleness |
| Louvain instead of Leiden | Poorly-connected communities | Leiden ensures internal connectivity |
| Ignoring temporal aspect | Wrong historical answers | Bi-temporal model |
| Over-engineering day 1 | Premature optimization | Start simpler, add complexity as needed |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│           AI-NATIVE ENTERPRISE KNOWLEDGE GRAPH                  │
├─────────────────────────────────────────────────────────────────┤
│  ARCHITECTURE                                                   │
│  ────────────                                                   │
│  Ingestion → Construction → Storage → Retrieval                 │
│  Extraction + Resolution + Graph DB + GraphRAG                  │
│                                                                 │
│  KEY ALGORITHMS                                                 │
│  ──────────────                                                 │
│  Entity Resolution: Blocking (name, phonetic, LSH) + Matching   │
│  Community Detection: Leiden (not Louvain) for well-connected   │
│  GraphRAG: Local (entity K-hop) + Global (community summaries)  │
│  Multi-hop: Decompose + Answer + Verify at each step            │
│                                                                 │
│  LATENCY TARGETS                                                │
│  ───────────────                                                │
│  Entity lookup: <50ms        GraphRAG local: <500ms             │
│  2-hop traversal: <100ms     GraphRAG global: <2s               │
│                                                                 │
│  QUALITY TARGETS                                                │
│  ───────────────                                                │
│  Extraction F1: >85%         Resolution precision: >90%         │
│  Multi-hop accuracy: >80%    Modularity: >0.3                   │
│                                                                 │
│  SCALING STRATEGIES                                             │
│  ─────────────────                                              │
│  Graph: Shard by community (minimize cross-shard)               │
│  Resolution: Blocking reduces O(n²) to O(n)                     │
│  Summaries: Background recompute, incremental for hot           │
│                                                                 │
│  CAP CHOICE: CP (Consistency over Availability)                 │
│  ────────────────────────────────────────────────               │
│  Knowledge integrity > availability; wrong facts propagate      │
│                                                                 │
│  FALLBACKS                                                      │
│  ─────────                                                      │
│  Graph slow → Vector + cached entities                          │
│  LLM down → Return raw graph facts                              │
│  Resolution backlog → Queue, process async                      │
│                                                                 │
│  TRAP QUESTION RESPONSES                                        │
│  ───────────────────────                                        │
│  "Why not just vectors?" → Vectors lose structure, can't        │
│    represent multi-hop relationships                            │
│  "How scale resolution?" → Blocking reduces O(n²), multiple     │
│    strategies for high recall                                   │
│  "Why Leiden?" → Louvain creates poorly-connected communities   │
│  "Conflicting facts?" → Confidence, temporal, human review      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Follow-Up Questions to Expect

| Question | Key Points to Cover |
|----------|---------------------|
| "How would you handle 10x scale?" | More shards, better blocking, self-hosted LLM |
| "What if extraction quality drops?" | Quality sampling, human review queue, model retraining |
| "How do you debug wrong answers?" | Reasoning trace, graph verification, source provenance |
| "Privacy concerns with LLM?" | On-premise option, PII filtering, no training on enterprise data |
| "How long to build?" | MVP 3-6 months, full system 12-18 months (depends on scale) |
| "Build vs buy?" | Glean/Neo4j for speed; custom for control and cost at scale |
