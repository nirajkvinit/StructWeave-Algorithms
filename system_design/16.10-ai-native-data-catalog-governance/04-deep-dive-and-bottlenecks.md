# Deep Dive & Bottlenecks — AI-Native Data Catalog & Governance

## Critical Component 1: Column-Level Lineage at Scale

### Why This Is Critical

Column-level lineage is the foundation of impact analysis, data quality root-cause tracing, and compliance auditing. Without it, a user asking "which reports are affected if I change this column's type?" gets no answer. The challenge is that lineage must be extracted from heterogeneous SQL dialects, dbt models, Spark jobs, and BI tool calculations — each with different syntax, semantics, and transformation logic.

### How It Works Internally

The lineage extraction pipeline operates in three stages:

1. **SQL Collection:** Query logs are harvested from warehouse audit logs, dbt manifest files, pipeline DAG definitions, and BI tool APIs. Each source provides SQL in a different dialect with varying levels of metadata.

2. **AST Parsing & Resolution:** Each SQL statement is parsed into an Abstract Syntax Tree using a dialect-aware parser. The parser must handle CTEs, subqueries, window functions, LATERAL joins, UDFs, and dynamic SQL. Column references are resolved against the schema context retrieved from the catalog — this is essential because `SELECT *` must be expanded, and ambiguous column names must be resolved to specific tables.

3. **Graph Construction:** Extracted lineage edges (source_column → target_column with transformation metadata) are merged into the lineage graph. Duplicate edges from repeated query executions are deduplicated, and edge freshness is updated based on last observed execution time.

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **Unparseable SQL** | Lineage gap — downstream assets appear to have no upstream sources | Fallback to table-level lineage via regex; quarantine for manual review |
| **Schema drift** | Column references resolve to stale schema — incorrect lineage | Schema refresh before each parsing batch; version-pin schema context |
| **UDF black boxes** | User-defined functions hide column-level transformations | Allow manual lineage annotation for UDFs; treat as opaque transforms |
| **Cross-system gaps** | Lineage breaks at system boundaries (warehouse → BI tool) | Dedicated BI connectors that extract field-level dependencies |
| **Circular lineage** | Self-referencing transformations create infinite loops in traversal | Cycle detection during graph construction; mark as "recursive lineage" |

### Performance Consideration

A large enterprise with 40M columns and 200M lineage edges requires careful graph traversal optimization. A naive BFS traversal of 5 hops from a single column can visit millions of nodes. The solution is **precomputed transitive closure** for common queries (direct upstream/downstream 1-3 hops) stored in a materialized table, with on-demand deep traversal for impact analysis queries.

---

## Critical Component 2: Auto-Classification Accuracy and Trust

### Why This Is Critical

If auto-classification incorrectly labels a column as PII, masking policies are applied unnecessarily — blocking legitimate analytics. If it misses actual PII, sensitive data is exposed without governance. The precision-recall trade-off directly affects both data usability and compliance posture.

### Multi-Stage Classification Architecture

The classification pipeline uses a cascading approach where cheaper, faster methods run first and more expensive methods are invoked only for uncertain cases:

| Stage | Method | Precision | Recall | Cost | When Used |
|-------|--------|-----------|--------|------|-----------|
| 1 | Column name patterns | 85% | 70% | Negligible | Always (first pass) |
| 2 | Regex on data samples | 95% | 80% | Low | Structured columns (numbers, codes) |
| 3 | NER model (spaCy) | 90% | 85% | Medium | Text/varchar columns > 20 chars avg |
| 4 | LLM disambiguation | 92% | 90% | High | Conflicting classifications only |

### The Confidence Threshold Problem

Setting the auto-apply confidence threshold is a critical governance decision:

- **Threshold too low (e.g., 0.6):** Many false positives → columns incorrectly tagged as PII → masking applied to non-sensitive data → analytics teams frustrated → loss of trust in the catalog
- **Threshold too high (e.g., 0.95):** Many classifications stuck in "suggested" state → manual review backlog grows → PII remains untagged → compliance risk
- **Sweet spot (0.80-0.85):** Auto-apply for high-confidence matches; queue medium-confidence for human review with one-click approval; reject low-confidence

### Human-in-the-Loop Feedback

Every human review decision (confirm, reject, reclassify) is fed back to improve the classification model. The feedback loop is:

1. Model classifies column with confidence 0.78 → queued for review
2. Data steward confirms: "Yes, this is PII:phone_number"
3. Feedback stored: (column_name_pattern, data_sample_hash, true_label)
4. Periodic model retraining incorporates confirmed labels as training data
5. Next time a similar column is seen, confidence is higher → auto-applied

---

## Critical Component 3: Search Ranking — Making the Right Data Findable

### Why This Is Critical

A data catalog with poor search is an unused catalog. If a data engineer searches "customer orders" and the top result is an abandoned staging table with 0 queries and 47% completeness — while the production gold table is buried on page 2 — the catalog has failed its primary purpose.

### The Multi-Signal Ranking Challenge

Unlike web search where PageRank provides a strong global quality signal, catalog search must combine multiple heterogeneous signals:

| Signal | Source | Challenge |
|--------|--------|-----------|
| Text relevance (BM25) | Search index | Column descriptions are often empty or generic |
| Usage frequency | Query logs | New tables have zero usage but may be important |
| Quality score | Profiling engine | Some high-usage tables have poor quality (legacy) |
| Freshness | Metadata timestamps | Rarely-updated reference tables are still valuable |
| Certification status | Manual annotation | Few tables are certified; creates sparse signal |
| User affinity | Access history | Cold-start problem for new users |

### Learning-to-Rank Approach

The ranking model is trained on implicit feedback:

- **Positive signal:** User clicks on result → views lineage → adds to favorites
- **Negative signal:** User searches → skips result → refines query → clicks different result
- **Training data:** (query, candidate_features, click_label) triplets from search logs

The model uses gradient-boosted trees (LightGBM) rather than neural networks because:
1. Feature interpretability — stakeholders need to understand why a table ranks higher
2. Fast inference — <5ms per candidate re-ranking
3. Small training data — enterprise search has orders of magnitude less data than web search

---

## Race Conditions & Edge Cases

### Race Condition 1: Schema Change During Classification Scan

A classification worker samples data from a column, but before it writes the classification tag, the column is dropped or renamed by a schema migration. The tag is written to a non-existent entity.

**Mitigation:** Optimistic locking — classification writes include the entity's version number. If the entity version has changed between sample and write, the classification is discarded and the column is re-queued for the next scan.

### Race Condition 2: Concurrent Lineage Updates from Multiple Connectors

Two connectors (warehouse query log and dbt manifest) both extract lineage for the same table simultaneously. Both attempt to upsert the same lineage edges with potentially different transformation metadata.

**Mitigation:** Lineage edges use a composite key (source_id, target_id, pipeline_id). Each connector writes with its own pipeline_id, so concurrent writes create separate edges. A reconciliation job periodically merges equivalent edges and marks conflicts for review.

### Race Condition 3: Policy Change During Active Query

A masking policy is added to a PII-tagged column while a NL-to-SQL query is in flight. The query was generated without masking, but by execution time the policy is active.

**Mitigation:** Policy evaluation happens at query execution time (in the query engine's authorization layer), not at SQL generation time. The NL-to-SQL engine includes a warning: "Policy check occurs at execution; results may be masked."

---

## Bottleneck Analysis

| Bottleneck | Impact | Root Cause | Mitigation |
|-----------|--------|------------|------------|
| **SQL parsing throughput** | Lineage freshness degrades if parsing can't keep up with query volume | Complex SQL (nested CTEs, 100+ joins) takes 500ms+ to parse | Parallel parsing workers; prioritize queries by downstream impact; cache parsed ASTs by query hash |
| **Search index lag** | Users don't see recently ingested metadata | Index update pipeline processes events sequentially | Near-real-time index updates via event bus; eventual consistency acceptable (< 5s lag) |
| **Classification model cold start** | New data sources have no classification until first scan completes | Full scan of a 10K-column database takes hours | Incremental classification: new/changed columns only; priority queue by data sensitivity signals (column names containing "ssn", "email") |
| **Lineage graph traversal for deep impact analysis** | 5+ hop traversals can take seconds on a 200M-edge graph | BFS on large adjacency lists | Precomputed transitive closure for 1-3 hops; async computation for deep analysis with progress notification |
| **LLM latency for NL-to-SQL** | 2-5 second response time for natural language queries | LLM inference is inherently slow | Cache common question patterns; smaller fine-tuned model for simple queries; full LLM for complex ones |
