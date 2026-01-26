# Deep Dive and Bottlenecks

[← Back to Index](./00-index.md)

---

## Deep Dive 1: Point-in-Time Join Engine

### Why Point-in-Time Correctness Matters

Point-in-Time (PIT) correctness prevents **data leakage** - the use of information that would not have been available at prediction time. Without PIT correctness, models trained on historical data will perform artificially well during training but fail in production.

```
Data Leakage Example:
─────────────────────────────────────────────────────────

Scenario: Predicting if a user will purchase within 24 hours

Training Example:
  User: user_123
  Prediction Time: 2026-01-15 10:00:00 (label: purchased at 14:00)

WRONG (Data Leakage):
  Features joined: user_123's features as of 2026-01-15 23:59:59
  Problem: Includes activity AFTER the prediction time
           (e.g., "browsed product page at 13:00" - 3 hours before purchase)
  Result: Model learns to use features that won't exist at inference time
          Training AUC: 0.95, Production AUC: 0.65

CORRECT (PIT Join):
  Features joined: user_123's features as of 2026-01-15 09:59:59
  Only includes activity BEFORE prediction time
  Result: Model learns patterns that generalize to production
          Training AUC: 0.78, Production AUC: 0.76

─────────────────────────────────────────────────────────
Rule: feature_timestamp < entity_event_timestamp
─────────────────────────────────────────────────────────
```

### PIT Join Timeline Visualization

```
Timeline View:
─────────────────────────────────────────────────────────

Feature Events (user_123's activity):
    |----F1----|----F2----|----F3----|----F4----|----F5----|
    Jan 10     Jan 12     Jan 14     Jan 16     Jan 18

Training Labels (prediction requests):
    |              |----L1----|         |----L2----|
                   Jan 13               Jan 17

Correct PIT Joins:
  L1 (Jan 13) should use: F1 (Jan 10), F2 (Jan 12)
  L2 (Jan 17) should use: F1, F2, F3 (Jan 14), F4 (Jan 16)

With TTL = 5 days:
  L1 (Jan 13) with TTL 5d: F2 (Jan 12) only
                          F1 (Jan 10) expired (>5 days old)
  L2 (Jan 17) with TTL 5d: F3, F4 only
                          F1, F2 expired

─────────────────────────────────────────────────────────
```

### Implementation Deep Dive

```
PIT Join Implementation Options:
─────────────────────────────────────────────────────────

1. SORT-MERGE JOIN (Large Scale)

   Approach:
   - Partition both datasets by entity key
   - Within each partition, sort by timestamp
   - Merge with binary search for matching timestamps

   Complexity: O(n log n) for sort + O(n + m) for merge
   Memory: O(partition_size)
   Best for: >100M rows, distributed processing (Spark)

2. ASOF JOIN (Medium Scale)

   Approach:
   - Use database's ASOF join functionality
   - Native support in DuckDB, ClickHouse, TimescaleDB

   Complexity: O(n log m) with index
   Memory: Depends on implementation
   Best for: <100M rows, SQL-based workflows

3. BROADCAST JOIN (Small Features)

   Approach:
   - Broadcast small feature table to all workers
   - Binary search for each entity row

   Complexity: O(n log f) where f = feature rows
   Memory: O(feature_table_size) per worker
   Best for: Small feature tables (<1GB), many entity rows

─────────────────────────────────────────────────────────

Spark Implementation Pseudocode:

def pit_join_spark(entity_df, feature_df, ttl):
    # Partition by entity for colocation
    entity_partitioned = entity_df.repartition("entity_key")
    feature_partitioned = feature_df.repartition("entity_key")

    # Use window function for efficient join
    window = Window.partitionBy("entity_key")
                   .orderBy(desc("feature_timestamp"))

    # Find most recent feature before entity timestamp
    joined = entity_partitioned.join(
        feature_partitioned,
        on=["entity_key"],
        how="left"
    ).filter(
        col("feature_timestamp") <= col("entity_timestamp")
    ).filter(
        col("entity_timestamp") - col("feature_timestamp") <= ttl
    ).withColumn(
        "rank", row_number().over(window)
    ).filter(
        col("rank") == 1
    )

    return joined.drop("rank", "feature_timestamp")
```

### Performance Optimization

| Technique | Impact | Implementation |
|-----------|--------|----------------|
| **Time-based partitioning** | 10x speedup | Partition offline store by date, prune irrelevant partitions |
| **Z-ordering** | 3-5x speedup | Order data by (entity_key, timestamp) for locality |
| **Broadcast small tables** | 2x speedup | Broadcast feature tables <1GB to all workers |
| **Column pruning** | 2-3x speedup | Only read required feature columns |
| **Predicate pushdown** | 5x speedup | Push time filters to storage layer |

---

## Deep Dive 2: Materialization Pipeline

### Batch vs Streaming Materialization

```
Comparison:
─────────────────────────────────────────────────────────

                    BATCH                 STREAMING
                    ─────                 ─────────
Freshness:          Hours-Days            Seconds-Minutes
Cost:               $ (compute on demand) $$$ (always-on)
Complexity:         Low                   High
Throughput:         Very High             Medium
Exactly-once:       Easy (reprocessable)  Hard (checkpointing)
Backfill:           Native                Requires replay
Best for:           Most features         Real-time features

─────────────────────────────────────────────────────────

Decision Framework:

     Freshness Requirement
            │
            ▼
    ┌───────────────┐
    │  < 1 minute?  │──Yes──► Streaming
    └───────┬───────┘
            │ No
            ▼
    ┌───────────────┐
    │  < 1 hour?    │──Yes──► Micro-batch (5-15 min)
    └───────┬───────┘
            │ No
            ▼
        Batch (hourly/daily)
```

### Incremental vs Full Materialization

```
Incremental Materialization:
─────────────────────────────────────────────────────────

Process only changed data since last run.

Approach:
1. Read checkpoint (last processed timestamp)
2. Query source for data > checkpoint
3. Deduplicate by entity key (keep latest)
4. Upsert to online store
5. Update checkpoint

Pros:
- Fast (processes only delta)
- Lower compute cost
- Suitable for append-only sources

Cons:
- Complex for updates/deletes
- Checkpoint management overhead
- Risk of drift if checkpoint corrupted

─────────────────────────────────────────────────────────

Full Materialization:
─────────────────────────────────────────────────────────

Recompute all features from scratch.

Approach:
1. Read all source data (or recent window)
2. Compute latest value per entity
3. Compare with current online store (optional)
4. Full replace or delta upsert

Pros:
- Simple, always correct
- Handles updates/deletes naturally
- No drift risk

Cons:
- Expensive for large datasets
- Longer processing time
- Higher resource usage

─────────────────────────────────────────────────────────

Hybrid Strategy (Recommended):

- Daily: Full materialization (overnight, catch-up)
- Hourly: Incremental materialization (freshness)
- Weekly: Full validation (compare full vs incremental)
```

### Late-Arriving Data Handling

```
Late Data Problem:
─────────────────────────────────────────────────────────

Scenario: Event occurred at T=10:00, but arrives at T=12:00

Processing Timeline:
  10:00 - Event happens (event_time)
  11:00 - Materialization job runs (sees data up to 10:59)
  12:00 - Late event arrives
  12:30 - Online store has stale data for this entity

─────────────────────────────────────────────────────────

Solutions:

1. WATERMARK-BASED (Streaming)
   - Wait for watermark before considering window complete
   - Watermark = max_event_time - allowed_lateness
   - Late events beyond watermark are dropped or sent to dead letter

   Trade-off: Higher latency vs completeness

2. REPROCESSING WINDOW (Batch)
   - Always reprocess last N hours, even for "incremental"
   - Overlap covers late arrivals

   Example:
   - Checkpoint: 10:00
   - Reprocessing window: 2 hours
   - Actually process from: 08:00

   Trade-off: More processing vs correctness

3. CORRECTION JOBS (Batch)
   - Run delayed correction job for late data
   - Example: T+6h job catches late arrivals

   Trade-off: Temporary staleness vs efficiency

4. ONLINE STORE VERSIONING
   - Store multiple versions per entity
   - Latest query returns most recent
   - Late update replaces older version

   Trade-off: Storage cost vs correctness

─────────────────────────────────────────────────────────
```

### Backfill Strategies

```
Backfill Scenarios:
─────────────────────────────────────────────────────────

1. NEW FEATURE VIEW
   Need to populate online store with historical latest values

   Strategy:
   - Query offline store for MAX(timestamp) per entity
   - Batch load to online store
   - Enable real-time updates after backfill

2. SCHEMA CHANGE
   New column added, need to backfill existing entities

   Strategy:
   - Run transformation for new column
   - Merge with existing features
   - Atomic swap (if possible) or rolling update

3. BUG FIX
   Incorrect transformation discovered, need to recompute

   Strategy:
   - Run corrected transformation
   - Validate sample before full replace
   - Atomic swap or versioned replacement

4. DISASTER RECOVERY
   Online store data lost, need to rebuild

   Strategy:
   - Prioritize by feature view criticality
   - Parallel backfill with rate limiting
   - Monitor online store health during load

─────────────────────────────────────────────────────────

Backfill Performance Optimization:

- Parallelize by entity key ranges
- Use bulk load APIs (not individual writes)
- Rate limit to avoid overwhelming online store
- Off-peak execution (2am-6am)
- Progress tracking and resume capability
```

---

## Deep Dive 3: Online Store Design

### Key Schema Optimization

```
Entity-Centric vs Feature-View-Centric:
─────────────────────────────────────────────────────────

ENTITY-CENTRIC (Recommended):
  Key: entity_key
  Value: {fv1: {f1, f2}, fv2: {f3, f4}, ...}

  Pros:
  - Single read per entity (all features)
  - Natural grouping

  Cons:
  - Large values if many features
  - Partial updates harder

FEATURE-VIEW-CENTRIC:
  Key: (entity_key, feature_view)
  Value: {f1, f2, ...}

  Pros:
  - Smaller values
  - Independent updates per feature view

  Cons:
  - Multiple reads per entity
  - Higher latency for multi-view queries

HYBRID (Feast Default):
  Key: (entity_key, feature_view)
  Value: {features for that view}
  + Separate "feature service" that bundles views

  Pros:
  - Flexibility
  - Moderate read amplification

  Cons:
  - More complex client logic

─────────────────────────────────────────────────────────

Redis Optimization:

# Use hash type for feature views
HSET fs:user:123:profile age 25 country "US" ...
HSET fs:user:123:activity purchases_7d 3 last_active "2026-01-25"

# Batch read with pipeline
PIPELINE
  HGETALL fs:user:123:profile
  HGETALL fs:user:123:activity
EXEC

# Memory optimization
- Use short key names (serialized IDs)
- Enable compression for values >1KB
- Use Redis Cluster for sharding
```

### TTL and Eviction Strategies

```
TTL Strategies:
─────────────────────────────────────────────────────────

PER-FEATURE-VIEW TTL:
  - Set TTL based on feature semantics
  - User profile: 30 days (stable)
  - Session features: 1 hour (ephemeral)
  - Activity counts: 7 days (rolling window)

SLIDING TTL:
  - Reset TTL on each update
  - Entity stays warm if frequently updated
  - Cold entities naturally expire

STALENESS-BASED TTL:
  - TTL = max_staleness + buffer
  - If feature not updated within TTL, it's stale anyway
  - Let it expire, return default value

─────────────────────────────────────────────────────────

Eviction Strategies:

1. TTL-BASED (Primary)
   - Set TTL on all keys
   - Redis handles expiration automatically
   - Memory bounded by active entities

2. LRU (Backup)
   - Enable maxmemory-policy allkeys-lru
   - Evicts least recently used when memory full
   - Risk: may evict important features

3. ACTIVE CLEANUP (Scheduled)
   - Periodic job to remove stale entities
   - Based on business logic (inactive users)
   - More control, more operational burden

─────────────────────────────────────────────────────────
```

### Multi-Tenancy Considerations

```
Isolation Strategies:
─────────────────────────────────────────────────────────

1. NAMESPACE ISOLATION
   Key prefix: "fs:{tenant}:{feature_view}:{entity}"

   Pros: Simple, single cluster
   Cons: Noisy neighbor risk, shared limits

2. DATABASE ISOLATION
   Separate Redis database per tenant (0-15)

   Pros: Better isolation, separate memory
   Cons: Limited to 16 databases, operational complexity

3. CLUSTER ISOLATION
   Dedicated Redis cluster per tenant

   Pros: Full isolation, independent scaling
   Cons: Higher cost, operational overhead

4. HYBRID
   - Shared cluster for small tenants
   - Dedicated cluster for large/premium tenants

   Pros: Cost-effective, flexible
   Cons: Complex routing logic

─────────────────────────────────────────────────────────

Noisy Neighbor Mitigation:

- Rate limiting per tenant
- Separate connection pools
- Priority queues for premium tenants
- Monitoring per-tenant metrics
```

---

## Deep Dive 4: Feature Freshness Management

### Freshness SLA Tiers

```
Freshness Tier Definitions:
─────────────────────────────────────────────────────────

REAL-TIME (< 1 minute)
  Use cases:
  - Fraud detection (transaction features)
  - Real-time recommendations (session activity)
  - Dynamic pricing (supply/demand signals)

  Implementation:
  - Streaming materialization (Kafka → Flink → Redis)
  - Sub-second event processing
  - Direct write to online store

  Cost: $$$

NEAR-REAL-TIME (< 15 minutes)
  Use cases:
  - User activity aggregations
  - Inventory levels
  - Content engagement metrics

  Implementation:
  - Micro-batch materialization (5-15 min intervals)
  - Spark Streaming with mini-batches

  Cost: $$

BATCH (< 24 hours)
  Use cases:
  - User lifetime value
  - Historical aggregations (30-day averages)
  - Demographic features

  Implementation:
  - Scheduled batch jobs (hourly/daily)
  - Spark batch + Airflow/Prefect

  Cost: $

STATIC (days-weeks)
  Use cases:
  - Entity attributes (country, category)
  - Model coefficients
  - Reference data

  Implementation:
  - Load once, update on change
  - Triggered by CDC or manual refresh

  Cost: $

─────────────────────────────────────────────────────────
```

### Staleness Detection and Alerting

```
Staleness Monitoring:
─────────────────────────────────────────────────────────

Metrics to Track:

1. FEATURE LAG
   feature_lag = current_time - max(feature_timestamp)

   Alert: feature_lag > expected_freshness * 2

2. MATERIALIZATION LAG
   mat_lag = current_time - last_materialization_completion

   Alert: mat_lag > materialization_interval * 1.5

3. ENTITY STALENESS RATE
   stale_rate = count(stale_entities) / count(total_entities)

   Alert: stale_rate > 5%

4. FRESHNESS PERCENTILES
   Track p50, p95, p99 of feature ages

   Alert: p99_age > TTL

─────────────────────────────────────────────────────────

Alerting Strategy:

WARNING (P3):
  - Feature lag > 2x expected
  - Stale rate > 5%
  - Action: Investigate, may self-resolve

CRITICAL (P2):
  - Feature lag > 5x expected
  - Stale rate > 20%
  - Action: Page on-call, investigate immediately

EMERGENCY (P1):
  - Materialization failed completely
  - Online store unreachable
  - Action: All hands, immediate mitigation
```

---

## Bottleneck Analysis

### Bottleneck Identification Matrix

| Component | Bottleneck | Symptoms | Mitigation |
|-----------|------------|----------|------------|
| **PIT Join** | Shuffle at scale | Job OOM, slow completion | Partition by entity, optimize join order |
| **PIT Join** | Time range explosion | Full table scan | Partition pruning, time-based filtering |
| **Materialization** | Write amplification | High online store latency during job | Incremental updates, rate limiting |
| **Materialization** | Late data | Stale features | Reprocessing window, watermarks |
| **Online Store** | Hot entities | Uneven latency | Caching, read replicas, sharding |
| **Online Store** | Large values | Serialization overhead | Compression, columnar storage |
| **Streaming** | Backpressure | Growing lag, OOM | Rate limiting, autoscaling, backpressure handling |
| **Streaming** | State explosion | Memory growth | State TTL, compaction |
| **Registry** | Metadata queries | Slow feature discovery | Caching, denormalization |

### Hot Entity Problem

```
Hot Entity Pattern:
─────────────────────────────────────────────────────────

Problem:
  - Some entities (popular users, items) accessed 1000x more
  - Creates hot spots in sharded online store
  - Single shard overwhelmed

Detection:
  - Monitor per-key access frequency
  - Track shard-level QPS variance
  - High p99 latency with normal p50

Solutions:

1. READ-THROUGH CACHE
   - L1 cache (in-memory, per instance)
   - L2 cache (distributed, e.g., separate Redis)
   - Cache hot entities with short TTL (60s)

   Effectiveness: 80-95% cache hit for hot entities

2. READ REPLICAS
   - Replicate hot shards
   - Route reads across replicas

   Effectiveness: Linear scaling with replicas

3. KEY SPREADING
   - Append random suffix to hot keys
   - Client reads from random replica
   - Example: user_123 → user_123_0, user_123_1, user_123_2

   Effectiveness: Spreads load across shards

4. PRECOMPUTED BUNDLES
   - Pre-aggregate features for hot entities
   - Store in separate "hot" tier

   Effectiveness: Reduces reads, but stale risk

─────────────────────────────────────────────────────────
```

### Streaming Backpressure

```
Backpressure Handling:
─────────────────────────────────────────────────────────

Problem:
  - Input rate exceeds processing capacity
  - Events queue up, memory grows
  - Eventually OOM or unacceptable lag

Detection:
  - Consumer lag growing
  - Processing latency increasing
  - Memory utilization high

Solutions:

1. RATE LIMITING (Upstream)
   - Limit event ingestion rate
   - Drop or queue excess events
   - Protects processing pipeline

2. AUTOSCALING (Processing)
   - Scale workers based on lag
   - Trigger: lag > threshold for N minutes
   - Scale down when lag recovers

3. LOAD SHEDDING (Processing)
   - Sample events under pressure
   - Prioritize by importance
   - Approximate is better than stuck

4. BACKPRESSURE PROPAGATION (Downstream)
   - Slow down upstream when downstream slow
   - Kafka: Consumer group lag signals
   - Flink: Native backpressure

5. BUFFER MANAGEMENT
   - Bounded buffers with overflow policy
   - Spill to disk when memory full
   - Resume from checkpoint on recovery

─────────────────────────────────────────────────────────
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01 | Initial deep dive and bottleneck analysis |
