# Low-Level Design — Data Warehouse

## Data Model

### Micro-Partition Internal Structure

The data warehouse stores all table data as immutable micro-partitions. Each micro-partition is a self-contained columnar file containing 50-500 MB of uncompressed data (typically 50,000-500,000 rows).

```
┌──────────────────────────────────────────────────────────────┐
│ Micro-Partition File Layout                                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐       ┌─────────────┐     │
│  │ Column Chunk │  │ Column Chunk │  ...  │ Column Chunk │     │
│  │  (col_0)     │  │  (col_1)     │       │  (col_N)     │     │
│  ├─────────────┤  ├─────────────┤       ├─────────────┤     │
│  │ Page 0      │  │ Page 0      │       │ Page 0      │     │
│  │ Page 1      │  │ Page 1      │       │ Page 1      │     │
│  │ ...         │  │ ...         │       │ ...         │     │
│  │ Page K      │  │ Page K      │       │ Page K      │     │
│  └─────────────┘  └─────────────┘       └─────────────┘     │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Footer                                                 │   │
│  │  - Schema (column names, types, encoding)              │   │
│  │  - Column statistics (min, max, null_count, distinct)  │   │
│  │  - Page offsets and sizes                              │   │
│  │  - Bloom filters (optional, for high-cardinality cols) │   │
│  │  - Row count                                           │   │
│  │  - Compression codec per column                        │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Column Page Structure

Each column chunk is divided into pages (~1 MB each), the smallest unit of I/O and compression:

```
┌────────────────────────────────────────────────┐
│ Column Page (~1 MB compressed)                  │
├──────────────┬─────────────────────────────────┤
│ page_header  │ 32 bytes — encoding type, value │
│              │ count, compressed/uncompressed   │
│              │ sizes, CRC checksum              │
├──────────────┼─────────────────────────────────┤
│ repetition   │ Definition and repetition levels │
│ /definition  │ for nested/nullable columns      │
│ levels       │ (bit-packed)                     │
├──────────────┼─────────────────────────────────┤
│ encoded_data │ Column values in selected        │
│              │ encoding (dictionary, RLE,        │
│              │ delta, plain)                     │
├──────────────┼─────────────────────────────────┤
│ dictionary   │ Optional dictionary page for     │
│ (if used)    │ dictionary-encoded columns        │
└──────────────┴─────────────────────────────────┘
```

### Encoding Strategies

| Encoding | Best For | Mechanism | Compression Ratio |
|----------|----------|-----------|-------------------|
| **Dictionary** | Low-cardinality strings (country, status) | Replace repeated values with integer codes; store dictionary separately | 10-50x |
| **Run-Length (RLE)** | Sorted columns, boolean flags | Store (value, run_length) pairs for consecutive identical values | 5-100x |
| **Delta** | Timestamps, monotonic IDs | Store first value + deltas between consecutive values | 5-20x |
| **Bit-Packing** | Small integers, enum codes | Use minimum bits per value (e.g., 3 bits for values 0-7) | 2-10x |
| **Plain** | High-cardinality, high-entropy | Raw values with general-purpose compression (Zstd, LZ4) | 2-4x |

### Metadata Catalog Schema

```
┌─────────────────────────────────────────────────┐
│ Metadata Catalog (Replicated Key-Value Store)    │
├─────────────────────────────────────────────────┤
│                                                   │
│ tables/                                           │
│   {table_id}/                                     │
│     schema: [col_name, col_type, nullable, ...]   │
│     clustering_keys: [col_a, col_b]               │
│     partition_count: 12,450                       │
│     row_count: 2,180,000,000                      │
│     total_bytes: 45 GB (compressed)               │
│     created_at: timestamp                         │
│     last_modified: timestamp                      │
│                                                   │
│ partitions/                                       │
│   {table_id}/{partition_id}/                      │
│     file_path: "gs://bucket/db/tbl/part_0042"    │
│     row_count: 125,000                            │
│     size_bytes: 4,200,000                         │
│     zone_map:                                     │
│       col_a: {min: "2024-01-15", max: "2024-01-16"} │
│       col_b: {min: 100, max: 9999}                │
│       col_c: {distinct_count: 42, null_count: 7}  │
│     bloom_filter_columns: [col_d]                 │
│     encoding_per_column: {col_a: DELTA, ...}      │
│                                                   │
│ views/                                            │
│   {view_id}/                                      │
│     definition: SQL text                          │
│     source_tables: [table_id_1, table_id_2]       │
│     last_refresh: timestamp                       │
│     freshness_target: 300 seconds                 │
│                                                   │
└─────────────────────────────────────────────────┘
```

### Clustering Key Organization

Tables can define clustering keys that control how rows are physically organized within micro-partitions:

```mermaid
---
config:
  theme: base
  look: neo
---
flowchart LR
    subgraph Before["Before Clustering (random distribution)"]
        P1["Part 1: dates Jan-Dec mixed"]
        P2["Part 2: dates Jan-Dec mixed"]
        P3["Part 3: dates Jan-Dec mixed"]
    end

    subgraph After["After Clustering (on date column)"]
        P4["Part 1: Jan 1-15"]
        P5["Part 2: Jan 16-31"]
        P6["Part 3: Feb 1-14"]
    end

    Before -->|"Automatic re-clustering"| After

    classDef before fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef after fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class P1,P2,P3 before
    class P4,P5,P6 after
```

---

## API Design

### SQL Query Endpoint

```
POST /api/v1/warehouses/{warehouse_id}/queries
Content-Type: application/json
Authorization: Bearer {token}

Request:
{
  "sql": "SELECT region, SUM(revenue) FROM sales WHERE sale_date BETWEEN $1 AND $2 GROUP BY region ORDER BY SUM(revenue) DESC",
  "parameters": ["2024-01-01", "2024-03-31"],
  "timeout_seconds": 120,
  "result_format": "json",
  "max_rows": 10000,
  "warehouse_size": "medium"
}

Response:
{
  "query_id": "q-abc-123-def",
  "status": "completed",
  "results": [
    { "region": "North America", "sum_revenue": 4520000.00 },
    { "region": "Europe", "sum_revenue": 3180000.00 }
  ],
  "metadata": {
    "rows_returned": 2,
    "rows_scanned": 180000000,
    "partitions_scanned": 245,
    "partitions_pruned": 11800,
    "bytes_scanned": 720000000,
    "execution_time_ms": 2340,
    "compilation_time_ms": 85,
    "cache_hit": false,
    "spill_to_disk_bytes": 0
  }
}
```

### Data Loading Endpoint

```
POST /api/v1/warehouses/{warehouse_id}/loads
Content-Type: application/json

Request:
{
  "operation": "COPY_INTO",
  "target_table": "analytics.sales",
  "source": {
    "location": "@staging_area/sales/2024/",
    "format": "PARQUET",
    "pattern": "*.parquet"
  },
  "options": {
    "on_error": "SKIP_FILE",
    "purge": true,
    "match_by_column_name": true
  }
}

Response:
{
  "load_id": "load-xyz-789",
  "status": "completed",
  "files_processed": 48,
  "rows_loaded": 12500000,
  "rows_rejected": 0,
  "partitions_created": 95,
  "elapsed_time_ms": 18500
}
```

### Warehouse Management Endpoint

```
POST   /api/v1/warehouses                      → Create warehouse
GET    /api/v1/warehouses/{id}                 → Get warehouse status
PUT    /api/v1/warehouses/{id}/resize          → Scale up/down
POST   /api/v1/warehouses/{id}/resume          → Start warehouse
POST   /api/v1/warehouses/{id}/suspend         → Pause warehouse

GET    /api/v1/warehouses/{id}/queries         → List running queries
DELETE /api/v1/warehouses/{id}/queries/{qid}   → Cancel query
```

### Idempotency

- All load operations accept an idempotency key; re-submitting a completed load with the same key returns the original result
- Query submissions are inherently idempotent (same SQL + parameters produces same result from snapshot)
- DDL operations (CREATE, ALTER) use IF EXISTS / IF NOT EXISTS semantics

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Query submission | 1,000/min per account | Sliding window |
| Data loading | 100/min per account | Sliding window |
| Warehouse management | 60/min per account | Sliding window |
| Metadata operations (DDL) | 200/min per account | Sliding window |
| Result download | 500/min per account | Sliding window |

### Versioning

- API versioned via URL path: `/api/v1/`, `/api/v2/`
- SQL dialect version specified in session parameters
- Schema evolution tracked per table with version history

---

## Core Algorithms

### 1. Columnar Scan with Predicate Pushdown

```
FUNCTION columnar_scan(table, predicates, projection_columns):
    // Phase 1: Partition pruning using zone maps
    candidate_partitions = []
    FOR EACH partition IN table.partitions:
        zone_map = metadata.get_zone_map(partition.id)
        skip = FALSE
        FOR EACH predicate IN predicates:
            col_stats = zone_map[predicate.column]
            IF predicate.op == "=" AND (predicate.value < col_stats.min OR predicate.value > col_stats.max):
                skip = TRUE
                BREAK
            IF predicate.op == ">" AND predicate.value >= col_stats.max:
                skip = TRUE
                BREAK
            IF predicate.op == "<" AND predicate.value <= col_stats.min:
                skip = TRUE
                BREAK
            IF predicate.op == "IN" AND bloom_filter_exists(partition, predicate.column):
                IF NOT bloom_filter.might_contain(predicate.values):
                    skip = TRUE
                    BREAK
        IF NOT skip:
            candidate_partitions.add(partition)

    // Phase 2: Column-level scan with late materialization
    result_row_ids = NULL
    FOR EACH predicate IN predicates ORDERED BY selectivity ASC:
        col_data = read_column(candidate_partitions, predicate.column)
        matching_ids = evaluate_predicate(col_data, predicate)
        IF result_row_ids IS NULL:
            result_row_ids = matching_ids
        ELSE:
            result_row_ids = result_row_ids INTERSECT matching_ids

    // Phase 3: Materialize only surviving rows for projected columns
    result = []
    FOR EACH col IN projection_columns:
        col_data = read_column(candidate_partitions, col)
        result[col] = col_data.select(result_row_ids)

    RETURN result

// Time:  O(P) for pruning + O(S * C) for scanning where S = surviving rows, C = predicate columns
// Space: O(batch_size) — processes in streaming batches
```

### 2. MPP Query Distribution and Shuffle

```
FUNCTION distribute_query(plan, cluster_nodes):
    // Phase 1: Decompose plan into pipeline-able fragments
    fragments = decompose_into_fragments(plan)

    // Phase 2: Assign fragments to nodes based on data locality
    assignments = HashMap()  // node → list of fragments
    FOR EACH fragment IN fragments:
        IF fragment.type == SCAN:
            // Assign scan fragments to nodes that have cached partitions
            target_partitions = fragment.partitions
            FOR EACH partition IN target_partitions:
                node = find_node_with_cache(partition, cluster_nodes)
                IF node IS NULL:
                    node = least_loaded_node(cluster_nodes)
                assignments[node].add(fragment.for_partition(partition))

        ELSE IF fragment.type == SHUFFLE:
            // Hash-partition intermediate results across all nodes
            FOR EACH node IN cluster_nodes:
                assignments[node].add(fragment.for_hash_range(node.range))

        ELSE IF fragment.type == AGGREGATE:
            // Two-phase: partial on each node, then merge on coordinator
            FOR EACH node IN cluster_nodes:
                assignments[node].add(fragment.partial())
            assignments[coordinator].add(fragment.merge())

    // Phase 3: Execute fragments with pipeline parallelism
    FOR EACH node, node_fragments IN assignments:
        node.execute_pipeline(node_fragments)

    // Phase 4: Collect and merge results
    RETURN coordinator.collect_and_merge()

// Time:  O(D/N) per node where D = total data, N = number of nodes
// Space: O(D/N) per node for intermediate results
```

### 3. Materialized View Incremental Refresh

```
FUNCTION incremental_refresh(materialized_view):
    // Step 1: Identify changed partitions since last refresh
    last_refresh_txn = materialized_view.last_refresh_transaction
    changed_partitions = metadata.get_partitions_modified_since(
        materialized_view.source_tables, last_refresh_txn
    )

    IF changed_partitions.is_empty:
        RETURN  // no changes, view is fresh

    // Step 2: Determine refresh strategy based on view definition
    view_def = materialized_view.definition

    IF view_def.is_aggregate_only:
        // Additive aggregates (SUM, COUNT, MIN, MAX) can be incrementally merged
        delta_result = execute_view_query(view_def, changed_partitions)
        merged = merge_aggregates(materialized_view.current_data, delta_result, view_def)
        write_new_partitions(materialized_view, merged)

    ELSE IF view_def.has_joins:
        // For join views, re-evaluate join for changed partitions only
        affected_keys = extract_join_keys(changed_partitions, view_def.join_columns)
        delta_result = execute_view_query_for_keys(view_def, affected_keys)
        upsert_view_partitions(materialized_view, delta_result, affected_keys)

    ELSE:
        // Complex views: full refresh
        full_result = execute_view_query(view_def, ALL_PARTITIONS)
        replace_view_data(materialized_view, full_result)

    // Step 3: Update view metadata
    materialized_view.last_refresh_transaction = current_transaction()
    materialized_view.last_refresh_time = now()

// Time:  O(delta) for aggregate views, O(delta * join_fanout) for join views
// Space: O(delta) for incremental, O(full_view) for full refresh
```

### 4. Cost-Based Query Optimizer

```
FUNCTION optimize_query(logical_plan, statistics):
    // Phase 1: Predicate pushdown
    pushed_plan = push_predicates_to_scans(logical_plan)

    // Phase 2: Join reordering using dynamic programming
    IF count_join_tables(pushed_plan) <= 10:
        // Exhaustive enumeration for small join graphs
        best_join_order = dp_join_enumeration(pushed_plan, statistics)
    ELSE:
        // Greedy heuristic for large join graphs
        best_join_order = greedy_join_ordering(pushed_plan, statistics)

    // Phase 3: Select join strategies
    FOR EACH join IN best_join_order.joins:
        left_card = estimate_cardinality(join.left, statistics)
        right_card = estimate_cardinality(join.right, statistics)

        IF right_card < BROADCAST_THRESHOLD:
            join.strategy = BROADCAST_JOIN
        ELSE IF join.left.partition_key == join.key AND join.right.partition_key == join.key:
            join.strategy = CO_LOCATED_JOIN
        ELSE:
            join.strategy = HASH_REPARTITION_JOIN

    // Phase 4: Aggregate pushdown
    optimized = push_partial_aggregates_below_joins(best_join_order)

    // Phase 5: Materialized view matching
    FOR EACH subquery IN optimized.subqueries:
        matching_view = find_covering_materialized_view(subquery, statistics)
        IF matching_view IS NOT NULL AND matching_view.is_fresh:
            subquery.replace_with(scan(matching_view))

    // Phase 6: Cost estimation and plan selection
    physical_plan = select_physical_operators(optimized, statistics)
    physical_plan.estimated_cost = estimate_total_cost(physical_plan)

    RETURN physical_plan

// Time:  O(2^n) for DP join enumeration (n = number of tables, capped at 10)
// Space: O(2^n) for DP memoization table
```

### Join Strategy Selection Visualization

```mermaid
---
config:
  theme: base
  look: neo
---
flowchart TB
    Start["Join Optimizer"] --> Check1{"Right side < threshold?"}
    Check1 -->|Yes| Broadcast["Broadcast Join<br/>Copy small table to all nodes"]
    Check1 -->|No| Check2{"Both sides partitioned<br/>on join key?"}
    Check2 -->|Yes| CoLocated["Co-Located Join<br/>No data movement"]
    Check2 -->|No| Hash["Hash Repartition Join<br/>Redistribute both sides by join key"]

    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef action fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    class Check1,Check2 decision
    class Broadcast,CoLocated,Hash action
```
