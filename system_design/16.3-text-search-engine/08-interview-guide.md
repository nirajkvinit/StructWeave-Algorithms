# 16.3 Interview Guide

## Interview Pacing (45-min Format)

| Time | Phase | Focus | Key Actions |
|---|---|---|---|
| 0-5 min | **Clarify** | Scope the search system | Ask: What data type? (products, documents, logs, code). Scale? (millions vs. billions of docs). Latency requirements? Read-heavy or write-heavy? Near-real-time needed? |
| 5-15 min | **High-Level** | Architecture + data flow | Draw coordinator-data node-master architecture; explain write path (document -> translog -> buffer -> segment); explain read path (two-phase query-then-fetch); identify key decisions (shard count, analysis chain) |
| 15-30 min | **Deep Dive** | Inverted index + relevance | Explain inverted index internals (term dictionary, posting lists, FST); walk through BM25 scoring with an example; discuss segment lifecycle and merge strategy; show near-real-time refresh mechanism |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks + failure | Discuss shard sizing and rebalancing; explain segment merge I/O contention; cover replica promotion on node failure; address mapping explosion and circuit breakers; discuss hybrid search (BM25 + vectors) |
| 40-45 min | **Wrap Up** | Summary + extensions | Recap the key trade-offs (refresh interval vs. throughput, shard count vs. overhead, local vs. global IDF); mention index lifecycle management; handle follow-up questions |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **The inverted index is not just a data structure---it is an entire storage engine.** Unlike B-trees (single structure), the inverted index is a family of co-located structures (FST, posting lists, stored fields, doc values, norms, vectors) that must be consistent within a segment. Demonstrating understanding of this is the strongest differentiator.

2. **Relevance scoring is a first-class architectural concern.** BM25 depends on global statistics (IDF) that create distributed coordination challenges. This is unique to search---no other distributed system needs to compute per-query scoring functions that depend on corpus-wide statistics.

3. **Near-real-time is a precise engineering property.** The separation of durability (translog) from searchability (refresh) is a deliberate architectural choice that most candidates don't understand. Explaining the refresh-translog-flush lifecycle shows production-level knowledge.

4. **The segment merge tax is the hidden performance ceiling.** Benchmarks show great ingestion throughput, but production systems spend 30-50% of I/O on merge operations that only appear under sustained load.

### Where to Spend Most Time

- **15-30 min deep dive**: Spend the most time on inverted index internals and BM25 scoring. This is where you demonstrate depth. Walk through a concrete example: "if a user searches for 'wireless headphones', here's exactly how the term dictionary is traversed, how the posting lists are intersected, and how BM25 computes the score."
- **Avoid**: Don't spend more than 2 minutes on generic load balancing or caching unless the interviewer specifically asks. These are table stakes, not differentiators for a search system design.

---

## Trade-offs Discussion

| Decision | Option A | Option B | Recommendation |
|---|---|---|---|
| **Refresh interval** | 1 second (default) | 30 seconds | **1s for user-facing search** (near-real-time visibility); **30s for bulk indexing** (reduces segment creation rate by 30x, dramatically improves merge efficiency) |
| | Pros: Documents searchable in 1s; good user experience | Pros: 5-10x higher indexing throughput; fewer segments; less merge overhead | Configurable per-index; use 30s during bulk re-index, 1s for live traffic |
| | Cons: Creates many small segments; higher merge I/O; lower throughput | Cons: 30s visibility lag; stale search results during that window | |
| **Local IDF vs. DFS** | Local IDF (per-shard) | DFS (global IDF via pre-query) | **Local IDF by default**; switch to DFS only for small or skewed indexes |
| | Pros: No extra network round trip; lower latency | Pros: Accurate global scoring; correct rankings for rare terms | For large, evenly-sharded indexes (>1M docs/shard), local IDF approximation error is negligible |
| | Cons: Inaccurate for small/skewed shards | Cons: +10-15ms latency for extra scatter-gather round | |
| **Shard count** | Few large shards (5) | Many small shards (50) | **Start with fewer shards**; grow via time-based index rollover |
| | Pros: Less coordination overhead; fewer file handles; simpler cluster state | Pros: More query parallelism; easier rebalancing; finer-grained lifecycle | Over-sharding is harder to fix than under-sharding (requires reindex); target 10-50 GB per shard |
| | Cons: Less query parallelism; rebalancing moves large chunks | Cons: Higher coordinator overhead; more merge threads; larger cluster state | |
| **Stored fields vs. source-only** | Store full `_source` | Store only indexed fields, fetch from external store | **Store `_source`** for most use cases; external store only for very large documents |
| | Pros: Self-contained retrieval; simple architecture; supports reindexing from source | Pros: Smaller index size; less I/O for queries that don't need full documents | Losing `_source` means losing the ability to reindex, update, and highlight---too costly for most systems |
| | Cons: 40-60% of index size is stored fields | Cons: Extra hop to external store; cannot reindex without original data pipeline | |
| **Hybrid search (BM25 + vectors)** | BM25 only | BM25 + dense vector with RRF | **BM25 default, hybrid opt-in**; hybrid improves recall by 15-30% for semantic queries |
| | Pros: Simple; fast; well-understood; no ML infrastructure | Pros: Semantic understanding; handles synonyms and paraphrases; better for natural language queries | Vector indexing adds 50-100% to storage; HNSW search adds 5-20ms to query latency; worth it when recall matters more than latency |
| | Cons: No semantic understanding; misses paraphrases and synonyms | Cons: Higher storage and compute; requires embedding model infrastructure | |

---

## Trap Questions & How to Handle

| Trap Question | What Interviewer Wants | Best Answer |
|---|---|---|
| "Why not just use a relational database with a text index?" | Understand fundamental difference between search and DBMS | "Relational text indexes (GIN, full-text) work for small-to-medium datasets, but they lack BM25 relevance scoring, distributed scatter-gather, analysis chains, near-real-time refresh, and aggregation support. At billions of documents, a dedicated search engine is 10-100x faster for text queries because its entire storage engine is optimized for inverted index operations." |
| "Can you make search results consistent (read-after-write)?" | Test understanding of NRT trade-off | "Yes, using `refresh=wait_for` on the indexing call or `refresh=true` (force immediate refresh). But there's a trade-off: forcing refresh on every write creates many small segments and degrades search performance. The standard approach is to accept 1-second eventual consistency for search, which is imperceptible to users, while providing strong consistency for get-by-ID operations via the translog." |
| "What happens if a shard goes down during a query?" | Test failure handling depth | "The coordinator handles it gracefully: it returns partial results from the healthy shards and includes `_shards.failed > 0` in the response. The client can choose to retry or accept partial results. For the failed shard, its replica (on a different node) can serve future queries. If the primary shard's node is down, a replica is promoted to primary within seconds." |
| "How do you handle a field that has millions of unique values for aggregation?" | Test knowledge of cardinality limits | "High-cardinality aggregations are the most common cause of OOM in search clusters. The key mitigations are: (1) use `shard_size` to limit per-shard bucket count, (2) use `composite` aggregation for paginated traversal instead of loading all buckets into memory, (3) pre-aggregate with transforms for known analytics queries, and (4) set circuit breakers to reject queries that would exceed memory limits." |
| "Why not shard by search query instead of by document?" | Test understanding of inverted index distribution | "Sharding by query is impossible because you don't know at index time what queries will be asked. Sharding by document (hash-based) ensures that each shard is a self-contained mini-index that can answer any query. The scatter-gather pattern handles the distribution: every query goes to every shard, and the coordinator merges the results." |
| "How would you handle 100x scale?" | Forward-thinking architecture | "At 100x scale: (1) increase shard count proportionally to data size (not query volume), (2) add replicas to handle query throughput, (3) separate indexing and search workloads onto different node pools, (4) implement query result caching more aggressively (CDN for popular queries), (5) consider cross-cluster search for geographic distribution, (6) use index lifecycle management to move old data to cheaper storage tiers." |

---

## Common Mistakes to Avoid

1. **Not explaining the inverted index**: The inverted index IS the system. Jumping to "sharding" and "load balancing" without explaining how a single shard processes a query shows shallow understanding.

2. **Confusing refresh with commit/flush**: Refresh makes documents searchable (in-memory segment). Flush/commit fsync's segments to disk and truncates the translog. They serve different purposes (searchability vs. durability).

3. **Ignoring segment merging**: Designing a write path without discussing the merge tax creates an incomplete picture. Merge I/O is 30-50% of total I/O under sustained load.

4. **Treating search as a database query**: Search returns *ranked* results, not matching rows. Ignoring BM25, IDF, and relevance scoring misses the fundamental purpose of the system.

5. **Over-sharding**: Creating 100 shards for an index that fits in 10 GB. Each shard has overhead (file handles, thread pools, segment metadata). Target 10-50 GB per shard.

6. **Forgetting about analysis chains**: How text is tokenized, stemmed, and normalized determines search quality. "Wireless" must match "wireless"; "running" should match "run." This is where search engines differ from grep.

7. **Not discussing failure scenarios**: What happens when a data node dies? When a coordinator is overloaded? When a merge storm saturates I/O? Production systems handle these daily.

---

## Questions to Ask Interviewer

| Question | Why It Matters |
|---|---|
| What type of data are we searching? | Products, documents, logs, and code have fundamentally different analysis chains, query patterns, and freshness requirements |
| What's the expected document count and growth rate? | Determines shard count, index lifecycle strategy, and storage tier design |
| Is near-real-time search required, or is batch indexing acceptable? | NRT requires refresh cycle design; batch allows much higher throughput |
| What matters more: recall or precision? | High recall -> fuzzy matching, synonyms, stemming; high precision -> exact match, strict analysis |
| Do users need faceted navigation (aggregations)? | Aggregations have significant memory implications (doc values, field data cache) |
| Is multi-language support needed? | Each language needs its own analyzer (different stemmers, stop words, tokenizers) |
| What consistency model is acceptable? | Eventual (1s lag) vs. read-after-write changes the refresh strategy |

---

## Scoring Rubric (What Interviewers Look For)

| Level | Signals |
|---|---|
| **Junior** | Knows what an inverted index is; can draw basic client-server architecture; mentions "Elasticsearch" |
| **Mid-Level** | Explains term frequency and IDF; understands shard-based distribution; can discuss refresh interval and near-real-time; mentions BM25 scoring |
| **Senior** | Walks through segment lifecycle (buffer -> segment -> merge); explains FST term dictionary; discusses local vs. global IDF trade-off; handles failure scenarios (node failure, merge storms); understands analysis chain design |
| **Staff+** | Discusses the segment merge tax as an I/O budget problem; explains the architectural separation of durability (translog) from searchability (refresh); designs multi-stage ranking (BM25 -> function scores -> LTR -> neural re-ranking); reasons about shard sizing as a function of both data volume and query latency; considers hybrid lexical-vector search architecture with fusion strategies |
