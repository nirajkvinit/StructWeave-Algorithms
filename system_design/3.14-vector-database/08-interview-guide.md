# Interview Guide

[← Back to Index](./00-index.md)

---

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Deliverables |
|------|-------|-------|--------------|
| 0-5 min | **Clarify** | Understand requirements, scope | Requirements list, constraints |
| 5-15 min | **High-Level** | Architecture, components, data flow | System diagram, key decisions |
| 15-30 min | **Deep Dive** | 1-2 critical components | Algorithm details, trade-offs |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failure scenarios | Scaling strategy, mitigations |
| 40-45 min | **Wrap Up** | Summary, handle follow-ups | Key points, open questions |

---

## Phase 1: Clarification (0-5 min)

### Must-Ask Questions

```
Functional Scope:
─────────────────────────────────────────────────────────
1. "What's the primary use case?"
   → RAG? Recommendations? Image search?

2. "Do we need hybrid search (vector + keyword)?"
   → Significantly affects architecture

3. "Are there metadata filters?"
   → Impacts index design

4. "Real-time updates or batch-only?"
   → L0 buffer vs batch rebuild

Scale & Performance:
─────────────────────────────────────────────────────────
5. "How many vectors? Dimensions?"
   → Memory and storage planning

6. "Query latency requirements?"
   → In-memory vs disk-based decision

7. "Queries per second?"
   → Replication and sharding needs

8. "Recall requirement?"
   → Algorithm and parameter selection
```

### Follow-Up Based on Use Case

| Use Case | Key Follow-ups |
|----------|---------------|
| **RAG/LLM** | Context window size, chunk overlap, freshness needs |
| **E-commerce** | Category filters, personalization, inventory updates |
| **Image Search** | Duplicate detection, content moderation, resolution |
| **Anomaly Detection** | Streaming vs batch, alerting latency |

### Sample Clarification Dialog

```
You: "Before I start, I'd like to understand the requirements better.
     What's the primary use case for this vector database?"

Interviewer: "We're building a semantic search for our documentation."

You: "Got it - documentation search. A few follow-ups:
     1. Roughly how many documents, and average chunks per document?
     2. Do users need to filter by doc type or date?
     3. What latency is acceptable for search results?"

Interviewer: "About 1 million documents, maybe 10 chunks each.
             Yes, they filter by product and date. Under 100ms."

You: "So ~10M vectors, with metadata filtering, sub-100ms latency.
     Any requirements around how quickly new docs become searchable?"

Interviewer: "Within a few minutes is fine."

You: "Perfect. Let me design a system for 10M vectors with metadata
     filtering, <100ms p99 latency, and near-real-time indexing."
```

---

## Phase 2: High-Level Design (5-15 min)

### What to Cover

1. **System Components**
   - API layer (gateway, routing)
   - Coordinator (metadata, shard management)
   - Index nodes (HNSW/IVF)
   - Storage layer (WAL, snapshots)

2. **Data Flow**
   - Write path: Client → WAL → Buffer → Index
   - Read path: Client → Router → Shards → Merge → Response

3. **Key Decisions** (announce and justify)
   - Index type: "I'll use HNSW for sub-100ms latency"
   - Sharding: "Hash-based on vector ID for even distribution"
   - Replication: "3 replicas for availability"

### Architecture Diagram to Draw

```
Draw this on whiteboard:
─────────────────────────────────────────────────────────

     ┌─────────────┐
     │   Client    │
     └──────┬──────┘
            │
     ┌──────▼──────┐
     │ API Gateway │ ← Auth, rate limit
     └──────┬──────┘
            │
     ┌──────▼──────┐
     │ Coordinator │ ← Metadata, routing
     └──────┬──────┘
            │
    ┌───────┼───────┐
    ▼       ▼       ▼
┌───────┐┌───────┐┌───────┐
│Shard 1││Shard 2││Shard 3│ ← HNSW indexes
└───┬───┘└───┬───┘└───┬───┘
    │       │       │
    └───────┼───────┘
            ▼
     ┌─────────────┐
     │   Storage   │ ← WAL, snapshots
     └─────────────┘
```

### Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Single node design | Won't scale, no HA | Start with distributed |
| Skip the coordinator | Routing becomes chaos | Include metadata service |
| Forget about writes | "Just focus on queries" | Show write path too |
| No replication | SPOF, data loss risk | Always mention replicas |

---

## Phase 3: Deep Dive (15-30 min)

### Option A: HNSW Deep Dive

```
Key points to explain:
─────────────────────────────────────────────────────────

1. Multi-layer structure
   "HNSW builds a hierarchy of graphs. Upper layers have
    long-range connections for fast navigation. Layer 0
    contains all vectors with local connections."

2. Search algorithm
   "We start at the entry point, greedily descend through
    layers, then explore neighbors at layer 0 to find top-k."

3. Key parameters
   "M controls connectivity (default 16). Higher M = better
    recall but more memory. ef_search controls search quality
    at query time - we can tune this for latency vs recall."

4. Trade-offs
   "HNSW gives us O(log n) search but requires all data in
    memory. For larger-than-RAM, we'd consider DiskANN."

Draw the layer structure:
   Layer 2:  [A]────────────────[Z]
   Layer 1:  [A]──[E]────[M]────[Z]
   Layer 0:  [A][B][C][D][E]...[Z]
```

### Option B: Filtered Search Deep Dive

```
Key points to explain:
─────────────────────────────────────────────────────────

1. The filtering challenge
   "With filters, naive approaches either miss results
    (pre-filter) or are slow (post-filter)."

2. Three approaches
   • Pre-filter: Filter first, then search smaller set
   • Post-filter: Search all, filter results
   • In-filter: Modify search to respect filters

3. ACORN algorithm
   "We modify HNSW traversal to skip non-matching nodes
    but continue exploring through them. This way we
    don't get stuck in regions that don't match."

4. Selectivity-based execution
   "For very selective filters (<1%), we switch to
    metadata-first: use B-tree index, brute-force
    the small filtered set."
```

### Option C: Real-Time Indexing Deep Dive

```
Key points to explain:
─────────────────────────────────────────────────────────

1. The challenge
   "Users expect immediate searchability, but HNSW
    insertion is expensive and can degrade the graph."

2. L0 buffer approach
   "Recent writes go to a small buffer that's searched
    via brute force. Background process merges buffer
    into the main HNSW index."

3. Write flow
   "Write → WAL (durability) → L0 buffer (searchable) →
    Ack to client. Background: Buffer → HNSW segment."

4. Query flow
   "Query searches both L0 buffer and HNSW index,
    merges results. Buffer is small enough that
    brute force adds <1ms overhead."
```

---

## Phase 4: Scale & Trade-offs (30-40 min)

### Scaling Discussion

```
Interviewer: "What if we need to handle 1 billion vectors?"

Good response:
─────────────────────────────────────────────────────────
"At billion scale, several things change:

1. Memory: 1B × 768 dims × 4 bytes = 3TB raw vectors.
   We'd need Product Quantization (32x compression → ~100GB)
   or move to DiskANN.

2. Sharding: Split into ~30 shards (30-35M vectors each).
   Each query fans out to all shards, we merge results.

3. Latency: With 30 shards, tail latency becomes an issue.
   We'd use hedged requests - send to 2 replicas, take
   fastest response.

4. Index build: Building HNSW for 30M vectors takes
   ~30 minutes. We'd use segment-based architecture
   and GPU acceleration (NVIDIA cuVS) to speed this up."
```

### Trade-off Discussions

| Trade-off | Option A | Option B | How to Discuss |
|-----------|----------|----------|----------------|
| **Recall vs Latency** | High ef_search (99% recall, 50ms) | Low ef_search (90% recall, 10ms) | "For documentation search, I'd start with higher recall since relevance matters more than speed" |
| **Memory vs Cost** | HNSW in-memory ($$$) | DiskANN + PQ ($$) | "Given 10M vectors, we can afford in-memory. At 100M+, I'd switch to disk-based" |
| **Consistency vs Speed** | Sync replication | Async replication | "For search, eventual consistency is fine. I'd use async with <1s lag" |
| **Accuracy vs Throughput** | Exact k-NN | Approximate (ANN) | "Exact search is O(n) - at 10M vectors, that's ~100ms just for distance calculations. ANN is essential" |

### Failure Scenarios

```
Interviewer: "What happens if a shard goes down?"

Good response:
─────────────────────────────────────────────────────────
"With 3 replicas per shard:

1. Detection: Health checks fail after 15 seconds
2. Failover: Traffic redirected to healthy replicas
3. Queries: Continue serving from 2 remaining replicas
4. Writes: Route to new primary (fastest replica)
5. Recovery: When node returns, it syncs from healthy replica

During this time:
- Read capacity drops by 33% (2 of 3 replicas)
- Write capacity unchanged (new primary elected)
- No data loss (WAL on remaining replicas)

For even higher availability, we'd deploy across 3 AZs
so an entire AZ failure still leaves us operational."
```

---

## Phase 5: Wrap Up (40-45 min)

### Summary Points

```
"To summarize, I've designed a distributed vector database with:

1. HNSW indexes for O(log n) search latency
2. Sharding across 3 nodes with 3x replication
3. L0 buffer for real-time searchability
4. Metadata indexes for efficient filtering

Key decisions:
- Chose AP over CP for availability
- HNSW over IVF for latency requirements
- Async replication for throughput

The main bottlenecks to watch:
- Memory usage as vectors grow
- Filter selectivity impact on latency
- Index rebuild time for parameter changes"
```

### Handle Follow-Up Questions

| Question | Strong Response |
|----------|-----------------|
| "Why not use Elasticsearch?" | "ES is great for keyword search. For high-dimensional vectors with similarity, dedicated vector DBs have optimized indexes (HNSW) that are 10-100x faster" |
| "How do you handle versioning?" | "I'd use immutable segments with version numbers. Queries see a consistent snapshot. Deletes use tombstones, cleaned up during compaction" |
| "What about multi-tenancy?" | "For isolation, I'd use namespace-per-tenant in the same collection. For compliance (HIPAA), dedicated collections. For extreme isolation, dedicated clusters" |

---

## Trap Questions & How to Handle

### Trap 1: "Why not just use brute force?"

```
What they're testing: Do you understand scalability?

Bad answer: "Brute force is fine for small datasets."

Good answer:
"Brute force is O(n × d) per query. At 10M vectors with
768 dimensions, that's 7.68 billion multiplications per
query - roughly 100ms even with SIMD optimization.

With HNSW, we traverse O(log n) ≈ 20 nodes, computing
maybe 1,000 distances total. That's 7,000x less work.

Brute force is fine up to ~10K vectors. Beyond that,
we need approximate indexes for practical latency."
```

### Trap 2: "How do you guarantee exact top-k results?"

```
What they're testing: Understanding of ANN trade-offs

Bad answer: "We tune the algorithm to be very accurate."

Good answer:
"We can't guarantee exact results with ANN - that's the
fundamental trade-off. HNSW achieves ~95-99% recall, meaning
we find 95-99 of the true top-100.

For use cases requiring 100% accuracy, we'd either:
1. Use brute force (only viable <100K vectors)
2. Do two-phase: ANN for top-1000, exact re-rank top-100
3. Accept the trade-off (most search/recommendations do)

I'd confirm with product: is 95%+ recall acceptable?
For documentation search, it usually is."
```

### Trap 3: "What if the embedding model changes?"

```
What they're testing: Real-world operational thinking

Bad answer: "Just re-embed and re-index everything."

Good answer:
"Model changes are disruptive - vectors from different
models aren't comparable. Here's how I'd handle it:

1. Version namespaces: old_model_v1, new_model_v2
2. Dual-write period: Index to both namespaces
3. Query routing: New queries to v2 after cutover
4. Cleanup: Delete v1 after migration complete

For incremental updates (fine-tuning), we'd need to
re-embed existing vectors. With 10M docs at $0.10/1K
tokens, that's a few hundred dollars - plan for it.

Some systems use adapter layers to bridge models, but
that adds latency and complexity."
```

### Trap 4: "How do you handle hot partitions?"

```
What they're testing: Distributed systems knowledge

Bad answer: "Add more replicas."

Good answer:
"Hot partitions happen when certain namespaces or filter
values get disproportionate traffic. Solutions:

1. Sub-sharding: Split hot namespace across multiple shards
2. Read replicas: Add replicas specifically for hot data
3. Caching: Cache frequent query results (short TTL)
4. Query routing: Detect hot queries, spread across replicas

Prevention is better:
- Use consistent hashing to spread by vector ID
- Avoid time-based partitioning (recent = hot)
- Monitor per-shard metrics to detect early

At extreme scale (Twitter trending), we'd use separate
'trending' index with aggressive caching."
```

---

## Assessment Rubric

### Strong Candidate Signals

| Area | Strong Signal |
|------|--------------|
| **Clarification** | Asks about scale, latency, use case before designing |
| **Algorithm Knowledge** | Explains HNSW layers, ef parameters, PQ compression |
| **Trade-offs** | Explicitly discusses alternatives and why not chosen |
| **Distributed Systems** | Considers sharding, replication, failure modes |
| **Real-World Awareness** | Mentions specific systems (Pinecone, Milvus) |
| **Operational Thinking** | Discusses monitoring, capacity planning, incidents |

### Weak Candidate Signals

| Area | Weak Signal |
|------|-------------|
| **Clarification** | Jumps straight to solution without asking questions |
| **Algorithm Knowledge** | Can't explain how HNSW/IVF works beyond surface level |
| **Trade-offs** | Presents single solution as "the answer" |
| **Distributed Systems** | Designs for single node, ignores failures |
| **Real-World Awareness** | No mention of actual systems or benchmarks |
| **Operational Thinking** | No discussion of monitoring or debugging |

### Scoring Framework

```
Hire      (8-10): Leads discussion, deep algorithm knowledge,
                  considers trade-offs proactively, handles
                  all follow-ups confidently

Lean Hire (6-7):  Solid fundamentals, reasonable design,
                  needs prompting for some trade-offs,
                  handles most follow-ups

Lean No   (4-5):  Basic understanding, significant gaps in
                  distributed systems or algorithms,
                  struggles with follow-ups

No Hire   (1-3):  Can't explain ANN basics, single-node design,
                  no consideration of scale or failures
```

---

## Common Pitfalls

| Pitfall | Why It's Bad | What to Do Instead |
|---------|--------------|-------------------|
| **Over-engineering** | Designing for trillion scale when asked for millions | Design for 10x stated scale, mention 100x+ as future |
| **Under-engineering** | Single node for 100M vectors | Always consider distributed from start |
| **Ignoring writes** | Only discussing query path | Show both read and write paths |
| **Perfect consistency** | "All replicas must be in sync" | Acknowledge eventual consistency is OK for search |
| **Forgetting filtering** | Pure vector search only | Most real queries have metadata filters |
| **No numbers** | "It will be fast enough" | Provide estimates: "768d × 4B = 3KB per vector" |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│              Vector Database - Quick Reference               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Algorithms:                                                 │
│  • HNSW: O(log n) search, best recall, memory-heavy         │
│  • IVF: Partition-based, good with PQ, disk-friendly        │
│  • PQ: 32x compression, ~95% recall retention               │
│                                                              │
│  Key Parameters:                                             │
│  • M: Graph connectivity (16 default, higher = better recall)│
│  • ef_search: Query-time quality (must be ≥ k)              │
│  • nprobe: IVF clusters to search (higher = better recall)  │
│                                                              │
│  Memory Estimation:                                          │
│  • Vector: dimensions × 4 bytes (float32)                   │
│  • 768-dim: 3KB per vector                                   │
│  • 100M vectors: ~300GB raw + 30GB graph                    │
│                                                              │
│  Latency Targets:                                            │
│  • In-memory HNSW: <20ms p99                                │
│  • DiskANN: <50ms p99                                       │
│  • IVF-PQ: <100ms p99                                       │
│                                                              │
│  Trade-offs:                                                 │
│  • Recall vs Latency (ef_search)                            │
│  • Memory vs Cost (HNSW vs DiskANN)                         │
│  • Consistency vs Throughput (sync vs async replication)    │
│                                                              │
│  Real Systems:                                               │
│  • Pinecone: Serverless, managed                            │
│  • Milvus: Open-source, distributed                         │
│  • Weaviate: Hybrid search (vector + BM25)                  │
│  • Qdrant: Rust, fast filtering                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```
