# 12.16 Product Analytics Platform — Scalability & Reliability

## Event Partitioning Strategy

### Primary Partition Scheme

Events are partitioned across the storage layer using a two-level scheme that balances query performance with write throughput:

**Level 1 — Logical partition:** `(project_id, event_date)`
- All events for a given project on a given day are co-located
- Enables efficient project-scoped queries without cross-partition scanning
- Enables efficient time-range pruning: queries with date filters skip entire partitions

**Level 2 — Physical partition (within a logical partition):** `event_name`
- Columnar files are further subdivided by event\_name within the logical partition
- Funnel queries, which scan for specific event names, skip unrelated files entirely
- Each (project\_id, event\_date, event\_name) combination forms one or more row groups

**Within row group ordering:** `(user_id, client_timestamp)`
- Events for the same user within a row group are sorted together
- Funnel computation's step matching is a sequential scan over user events: this sort order makes it cache-friendly
- Bloom filters per row group on user\_id enable fast "does this row group contain user X?" checks

### Hot Spot Mitigation

Large projects (>100M events/day) create hot partitions that overwhelm individual storage nodes. Mitigation strategies:

**Shard splitting:** Oversized partitions are detected by a background monitor watching partition file sizes. When `(project_id, event_date)` exceeds 500GB compressed, the partition is split into `(project_id, event_date, user_id_hash_bucket)` sub-partitions (8 buckets by default). Query fanout is added transparently: a query for project P on date D fans out to all 8 sub-partitions and merges results.

**Write-side sharding:** Collector nodes hash-route events within a large project to 8× the normal queue partitions, distributing write load across more stream processors. The query router is aware of the sharding level and generates sub-partition-aware query plans.

---

## Query Parallelism

### Intra-Query Parallelism

A single funnel query against 1B events over 30 days requires scanning 30 daily partitions across multiple event names. This is decomposed into a parallel query plan:

```
Funnel query plan:
  Steps: [A, B, C]
  Date range: [Day 1 ... Day 30]

  Decompose into 90 parallel tasks:
    Task(step=A, date=Day1), Task(step=A, date=Day2), ..., Task(step=A, date=Day30)
    Task(step=B, date=Day1), ..., Task(step=B, date=Day30)
    Task(step=C, date=Day1), ..., Task(step=C, date=Day30)

  Each task:
    Scan partition (project_id, date, event_name=step)
    Return: sorted list of (user_id, min_timestamp)

  Merge phase (sequential):
    Merge all Task(step=A) results by user_id: user_step_A_bitmap
    Merge all Task(step=B) results by user_id: user_step_B_bitmap
    ...
    Apply ordering + time window: compute final conversion counts
```

**Executor model:** A distributed query executor maintains a worker pool. Each query gets allocated up to 32 worker slots. Parallel tasks are dispatched to workers, with results streamed back to a merge coordinator. Worker slots are fair-scheduled across concurrent queries to prevent one large query from starving smaller ones.

### Inter-Query Caching

**L1 Result Cache:** Exact query match cache keyed on (project\_id, query\_hash). TTL: 5 minutes for recent data, 30 minutes for historical data (> 2 days old). Hit rate: ~30% for common dashboard queries that refresh automatically.

**L2 Materialized Views:** Pre-computed rollups for the most common query shapes:
- Daily event count by event\_name (refreshed every 5 min from stream processor)
- Weekly unique user count by event\_name (refreshed hourly)
- Funnel completions for pinned funnels (refreshed daily)
- Retention matrices for saved retention configs (refreshed nightly)

**L3 Columnar Scan:** Full parallel scan across partitions. Required for ad hoc queries with arbitrary filters and breakdowns not covered by materialized views.

**Query routing logic:**
```
FUNCTION route_query(query):
  IF L1_cache.contains(query.hash):
    RETURN L1_cache.get(query.hash)

  IF query.shape MATCHES materialized_view:
    result = materialized_view_scan(query)
    IF result.freshness_ok(query.max_staleness):
      L1_cache.set(query.hash, result)
      RETURN result

  result = cold_columnar_scan(query)  // Parallel columnar execution
  L1_cache.set(query.hash, result)
  RETURN result
```

---

## Pre-Aggregation and Materialized Views

### Streaming Rollup Maintenance

The stream processor maintains a real-time rollup table updated as events arrive. The rollup is a columnar structure with the following dimensions:

```
Rollup table schema:
  project_id, event_date, event_hour, event_name → {
    total_count: INT64,
    unique_users_hll: HyperLogLog sketch (1KB per cell),
    unique_sessions_hll: HyperLogLog sketch,
    property_value_counts: MAP<property_key, MAP<value, count>>  // Top 100 values only
  }
```

The HyperLogLog sketches are mergeable: daily distinct-user counts are computed by OR-merging hourly sketches. This means the rollup is correct whether queried hourly, daily, or weekly—no re-aggregation required.

**Rollup granularity ladder:**
- 1-minute rollup: retained 24 hours (for real-time dashboard)
- 1-hour rollup: retained 7 days
- 1-day rollup: retained 90 days
- 1-week rollup: retained 2 years

Queries select the finest available granularity consistent with the requested time range, then aggregate upward. A 30-day trend query uses daily rollups (30 row lookups) rather than scanning 30 days of raw events.

---

## Cold Storage Tiering

### Tier Definition

| Tier | Storage Medium | Latency | Retention | Access Pattern |
|---|---|---|---|---|
| Hot | In-memory + NVMe SSD | < 10ms | 24 hours | Frequent random access for dashboards |
| Warm | Network-attached SSD | 50–200ms | 90 days | Ad hoc queries, moderate frequency |
| Cold | Object storage (Parquet) | 500ms–5s | 2+ years | Rare historical queries |

### Tier Migration

Events flow through tiers via background compaction:
1. **Hot → Warm (24h):** Stream processor writes to hot store continuously. A compaction job runs every hour, reading hot store data older than 24h, re-sorting by (user\_id, timestamp), applying dictionary compression, and writing to warm store as Parquet files. Hot store records then expire.
2. **Warm → Cold (90d):** A nightly compaction job reads warm store files older than 90 days, applies additional compression (Zstd level 19), and writes to cold object storage. Warm store files are then garbage-collected.

### Cold Query Acceleration

Cold object storage queries are the most expensive. Acceleration techniques:
- **Partition pruning:** Cold files are organized in `project_id/YYYY/MM/DD/event_name/` prefix paths. Queries with date and event\_name filters only retrieve matching prefixes.
- **Row group statistics:** Each Parquet file stores min/max statistics per column per row group. Queries with user\_id or timestamp filters skip row groups that cannot match.
- **Parallel object reads:** Cold query workers open multiple concurrent read streams per file, saturating available network bandwidth.
- **Query result caching with 30-min TTL:** Cold query results are expensive to produce; caching at L1 for longer than hot-tier results is warranted.

---

## Multi-Region Architecture

### Region Layout

The system operates in multiple geographic regions to satisfy data residency requirements and reduce query latency for globally distributed customers.

**Primary architecture:** Each project is assigned to a home region based on the customer's configured data residency setting. Events are always ingested in the home region. Cross-region forwarding of raw events is never performed (residency compliance).

**Event ingestion routing:** The SDK resolves the appropriate ingestion endpoint at initialization based on the project's home region. A global DNS routing layer directs SDK requests to the nearest regional ingestion cluster. If the home region's ingest endpoint is unavailable, events are queued locally and forwarded when recovered (not re-routed to another region).

**Query serving:** Queries always execute in the home region. If the customer's team members are geographically distributed, a thin query caching layer in additional regions can serve repeated read-only queries with low latency, but all cache misses route back to the home region.

### Cross-Region Failover

Each regional deployment includes a standby region that receives asynchronous replication of the warm and cold stores (not the hot store, which is ephemeral). The RTO (Recovery Time Objective) for a regional failure is:
- Hot store: 0 data — must re-ingest from queue if regional failure occurs before compaction
- Warm/cold store: < 1 hour (promote standby; redirect DNS)

During a regional failure, ingestion is rejected (not silently dropped): clients receive 503 and retry using exponential backoff. The message queue maintains messages for up to 7 days, providing a recovery window for delayed processing after failover.

---

## Reliability Patterns

### Ingestion Reliability

**At-least-once delivery:** SDKs retry events on any non-2xx response. Events are retried with exponential backoff (1s, 2s, 4s, up to 60s) and jitter. The event\_id deduplication at the collector ensures retries do not create duplicate events in the store.

**Circuit breaker at SDK:** If the SDK receives 5 consecutive 503 responses, it activates a local circuit breaker: events are stored in IndexedDB (web) or SQLite (mobile) for up to 24 hours. The circuit breaker retries every 60 seconds. This prevents event loss during extended outages without blocking the application.

**Queue durability:** The message queue is configured with a replication factor of 3 (writes acknowledged only when 2 of 3 replicas confirm). This provides durability against single-node queue failures.

### Query Reliability

**Query timeout and degraded mode:** All queries have a 30-second execution timeout. If a query times out:
1. Return partial results with a `partial: true` flag if > 50% of partitions have been scanned
2. Otherwise return an error with a retry hint (query routed to lower priority queue for background execution)

**Materialized view fallback:** If a cold query times out and a materialized view approximation exists (covering at least 95% of the requested time range), return the materialized view result with a staleness notice rather than an error.

**Quota enforcement:** Per-project query quotas prevent one large customer from monopolizing query compute. Quotas are enforced at the query router as concurrent-query limits (e.g., 20 concurrent queries per project). Requests exceeding the limit are queued with a 429 response and a Retry-After header indicating estimated wait time.
