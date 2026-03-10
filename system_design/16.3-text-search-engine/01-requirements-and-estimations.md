# 16.3 Requirements & Estimations

## Functional Requirements

### Core Features

1. **Document Ingestion**: Accept, validate, analyze, and index documents via bulk and single-document APIs; support create, update (full and partial), and delete operations
2. **Full-Text Search**: Boolean queries (AND, OR, NOT), phrase matching, fuzzy matching (edit distance), prefix/wildcard matching, and regular expression queries across analyzed text fields
3. **Relevance Ranking**: Score and rank results by contextual relevance using BM25 scoring, field boosting, function scoring (recency, popularity, geo-distance), and optionally learning-to-rank models
4. **Aggregations**: Compute faceted counts (terms aggregation), histograms (date/numeric), statistical summaries (min, max, avg, percentiles), and nested sub-aggregations for analytics
5. **Filtering**: Exact-match keyword filters, numeric range filters, date range filters, geo-spatial filters (bounding box, radius), and nested object filters---applied as non-scoring boolean clauses
6. **Multi-Index Search**: Query across multiple indexes simultaneously with per-index boosting; cross-cluster search for geographically distributed indexes
7. **Autocomplete & Suggestions**: Prefix-based completion suggestions, contextual suggestions filtered by category, and "did you mean" spell correction using edit distance or phonetic matching
8. **Hybrid Search**: Combine lexical BM25 search with dense vector similarity search using reciprocal rank fusion or linear combination scoring

### Out of Scope

- Crawler/spider for web content discovery (separate system)
- Natural language understanding / question-answering (application layer)
- Image, audio, or video content indexing (separate media search system)
- OLAP-style joins across multiple indexes
- Real-time streaming analytics (complementary system)

---

## Non-Functional Requirements

| Requirement | Target | Justification |
|---|---|---|
| **CAP Theorem** | AP (Availability + Partition tolerance) | Search must remain available during network partitions; stale results are acceptable, missing results are not (users retry if results seem wrong, but a down search is immediately noticed) |
| **Consistency Model** | Eventual consistency for search visibility; strong consistency for document CRUD within a primary shard | Documents become searchable within 1 second (refresh interval); read-after-write on the same shard is immediately consistent if reading from the primary |
| **Availability** | 99.99% (52.6 min downtime/year) | Search is often the primary user interaction path; downtime directly impacts revenue (e-commerce), user experience (content platforms), and developer productivity (code search) |
| **Latency (p50)** | < 20ms for simple keyword queries | Simple queries should feel instantaneous; users perceive anything over 100ms as "slow" |
| **Latency (p95)** | < 100ms for complex multi-clause queries | Multi-field boolean queries with aggregations should complete within a blink |
| **Latency (p99)** | < 500ms for aggregation-heavy queries | Large time-range aggregations and cross-index queries may require scatter-gather across many shards |
| **Durability** | Zero data loss for acknowledged writes | Once a document write is acknowledged, it must survive node failure via translog replication |
| **Near-Real-Time** | < 1 second from ingestion to searchability | Default refresh interval of 1 second; configurable per index based on freshness vs. throughput trade-off |

---

## Capacity Estimations (Back-of-Envelope)

**Scenario**: Large-scale e-commerce search platform (comparable to eBay, Amazon product search, or Shopify)

| Metric | Estimation | Calculation |
|---|---|---|
| Total documents | 2 billion | Product catalog: 2B active listings across all merchants |
| Average document size | 5 KB | Title (100B) + description (2KB) + attributes (1KB) + metadata (1KB) + vectors (900B) |
| Total raw data | 10 TB | 2B documents x 5 KB |
| Index overhead | 1.5x raw data | Inverted index (~0.3x), doc values (~0.5x), stored fields (~0.5x), norms + vectors (~0.2x) |
| Total storage (indexed) | 25 TB | 10 TB raw + 15 TB index overhead; with 1 replica = 50 TB total |
| DAU | 50 million | Active shoppers and browsers per day |
| Search QPS (average) | 30,000 | 50M users x 6 searches/day / 86,400 seconds |
| Search QPS (peak) | 90,000 | 3x average during sales events (Black Friday, flash sales) |
| Indexing rate (average) | 10,000 docs/sec | Catalog updates: new listings, price changes, inventory updates |
| Indexing rate (peak) | 50,000 docs/sec | Bulk re-index during schema migration or data pipeline backfill |
| Read:Write ratio | 3:1 to 10:1 | Read-heavy for user-facing search; write-heavier for catalog management |
| Bandwidth (search) | 1.5 GB/s | 30K QPS x 50 KB avg response (10 results x 5 KB per result) |
| Cache size | 500 GB | Frequently searched queries + filter cache + field data cache across cluster |

---

## SLOs / SLAs

| Metric | Target | Measurement |
|---|---|---|
| Availability | 99.99% | Percentage of 1-minute windows where >95% of search requests return 2xx within timeout |
| Search latency (p50) | < 20ms | Coordinator-measured time from query receipt to response send |
| Search latency (p99) | < 500ms | Coordinator-measured, including scatter-gather across all shards |
| Indexing latency (p99) | < 100ms | Time from bulk request receipt to translog acknowledgment |
| Search-after-index (freshness) | < 1 second | Time from index acknowledgment to document appearing in search results |
| Error rate | < 0.1% | Percentage of search requests returning 5xx or timing out |
| Shard recovery time | < 5 minutes | Time to recover an unassigned shard from translog or peer replica |
| Cluster rebalance time | < 30 minutes | Time to rebalance shards after adding or removing a data node |

---

## Traffic Patterns

### Diurnal Pattern
- Search traffic follows user timezone patterns: peak during business hours (10am-8pm), trough at 3am-6am
- Indexing traffic is more uniform (automated catalog feeds) with spikes during bulk re-index windows

### Seasonal Spikes
- E-commerce: 3-5x traffic during Black Friday, holiday sales, flash sales
- Content platforms: viral content creates sudden query spikes for specific terms
- News/media: breaking events create bursty, correlated query patterns

### Query Distribution
- **Head queries** (top 1% of unique queries): 30-40% of total query volume; highly cacheable
- **Torso queries** (next 10%): 30-40% of volume; partially cacheable
- **Tail queries** (remaining 89%): 20-30% of volume; rarely repeated, low cache hit rate
- Power-law distribution means query caching is highly effective for overall latency reduction
