# Deep Dive & Bottlenecks — URL Shortener

## 1. Deep Dive: ID Generation at Scale

### 1.1 Why This Is Critical

ID generation is the foundation of the entire system. Every short URL's uniqueness, length, and predictability depend on the ID generation strategy. At 100M+ URLs created per day, the ID generator must produce unique, compact identifiers without becoming a coordination bottleneck or single point of failure.

### 1.2 How It Works — Counter Range Pre-Allocation

The recommended approach uses a **Range Server** pattern:

1. A central **Range Server** maintains a persistent atomic counter (backed by a durable store)
2. Each **Creation Service** instance requests a range of 10,000 sequential IDs from the Range Server
3. The instance generates short codes locally from its allocated range without any further coordination
4. When the range is exhausted, the instance requests a new range

```
COMPONENT RangeServer
  STATE:
    global_counter: BIGINT = 0       // Persisted to durable store
    lock: MUTEX                       // Atomic increment guarantee

  FUNCTION AllocateRange(range_size = 10000)
    ACQUIRE lock
    start ← global_counter
    global_counter ← global_counter + range_size
    PERSIST global_counter to durable store
    RELEASE lock
    RETURN (start, start + range_size - 1)
  END FUNCTION

COMPONENT CreationServiceInstance
  STATE:
    current_id: BIGINT
    range_end: BIGINT

  FUNCTION GetNextShortCode()
    IF current_id > range_end
      (current_id, range_end) ← RangeServer.AllocateRange()
    END IF

    short_code ← Base62Encode(current_id)
    current_id ← current_id + 1
    RETURN short_code
  END FUNCTION
```

### 1.3 Failure Modes

| Failure | Impact | Mitigation |
|---|---|---|
| **Range Server down** | New instances cannot get ranges; existing instances continue with remaining IDs | Primary-replica failover; instances buffer 2-3 ranges ahead |
| **Instance crash mid-range** | Unused IDs in allocated range are wasted (gaps in sequence) | Acceptable: short codes don't need to be contiguous; gap ratio < 0.1% |
| **Network partition** | Instance cannot reach Range Server for new range | Pre-allocate multiple ranges; fallback to Snowflake-style IDs (longer codes) |
| **Counter overflow** | Exhausts 62^7 = 3.5 trillion codes | At 100M/day, lasts 96 years; increase code length to 8 chars when needed |
| **Duplicate ranges** | Range Server bug allocates overlapping ranges | Use compare-and-swap on counter; checksums on range boundaries |

### 1.4 Handling Failures

```
ALGORITHM RobustShortCodeGeneration()
  // Primary: Counter range (produces short 6-7 char codes)
  TRY
    RETURN GetNextShortCode()   // From pre-allocated range
  CATCH RangeExhausted
    TRY
      AllocateNewRange()
      RETURN GetNextShortCode()
    CATCH RangeServerUnavailable
      // Fallback: Snowflake ID (produces longer 11 char codes)
      snowflake_id ← GenerateSnowflakeID()
      RETURN Base62Encode(snowflake_id)

      metrics.increment("id_gen.fallback_to_snowflake")
      alert.warn("Range server unavailable, using Snowflake fallback")
    END TRY
  END TRY

KEY INSIGHT: The fallback produces longer but still valid short codes.
  Users get slightly longer URLs during the outage, but the system
  never stops creating URLs. The Range Server is NOT a hard dependency.
```

---

## 2. Deep Dive: The Redirect Hot Path

### 2.1 Why This Is Critical

The redirect path handles 100x the traffic of the creation path. Every millisecond of added latency multiplies across billions of daily redirects. This is the path that users experience directly—a slow redirect feels like a broken link.

### 2.2 How It Works — Multi-Tier Cache Resolution

The redirect service implements a cache hierarchy optimized for different access patterns:

**L1 — In-Process Cache (per instance)**
- Data structure: LRU hash map with TTL
- Capacity: ~100K entries (~34 MB memory per instance)
- TTL: 15 seconds (short to limit staleness)
- Latency: < 0.1ms (no network, no serialization)
- Purpose: Absorb burst traffic on viral links; a single hot URL might receive 50K req/sec across 20 instances → 2,500 req/sec per instance, all served from L1 after first access

**L2 — Distributed Cache (shared cluster)**
- Data structure: Distributed hash table with replication
- Capacity: ~500M entries (~170 GB across cluster)
- TTL: 1-6 hours (longer since it's shared and consistent)
- Latency: 1-2ms (one network hop)
- Purpose: Shared working set across all redirect instances; prevents thundering herd to database

**L3 — URL Store (database)**
- Data structure: Sharded key-value store with hash index
- Capacity: Entire URL corpus (50B+ URLs)
- Latency: 5-20ms (depends on data locality)
- Purpose: Source of truth; only accessed on double cache miss

### 2.3 Cache Stampede Prevention

When a popular URL's cache entry expires simultaneously across all instances, hundreds of concurrent requests hit the database:

```
ALGORITHM PreventCacheStampede(short_code)
  // Technique 1: Distributed lock (single-flight)
  lock_key ← "lock:resolve:" + short_code
  acquired ← L2_CACHE.SET_IF_NOT_EXISTS(lock_key, instance_id, TTL = 5s)

  IF acquired
    // This instance refreshes the cache
    url_record ← DB.GET(short_code)
    L2_CACHE.SET("url:" + short_code, url_record, TTL = 1 hour + RANDOM(0, 120s))
    L2_CACHE.DELETE(lock_key)
    RETURN url_record
  ELSE
    // Other instances wait briefly, then retry from cache
    SLEEP(50ms)
    url_record ← L2_CACHE.GET("url:" + short_code)
    IF url_record != NULL
      RETURN url_record
    ELSE
      // Lock holder may have failed; fall through to DB
      RETURN DB.GET(short_code)
    END IF
  END IF

  // Technique 2: Jittered TTL
  // Add random 0-120 seconds to base TTL to stagger expirations
  // Prevents synchronized expiration across entries

  // Technique 3: Soft TTL with async refresh
  // Serve stale data while refreshing in background
  // L2 entry has two TTLs: soft (1 hour, triggers refresh) and hard (2 hours, actual eviction)
```

### 2.4 Hot Link Handling

A single viral link can receive 50,000+ requests/second:

```
ALGORITHM HandleHotLink(short_code, current_qps)
  THRESHOLD_HOT ← 10000   // QPS threshold to classify as "hot"

  IF current_qps > THRESHOLD_HOT
    // 1. Pin in L1 cache with extended TTL (don't evict under LRU pressure)
    L1_CACHE.PIN(short_code, TTL = 60 seconds)

    // 2. Replicate to all L2 shards (not just the consistent-hash owner)
    L2_CACHE.BROADCAST_SET("url:" + short_code, url_record)

    // 3. Batch analytics events (reduce message queue pressure)
    // Instead of emitting per-click, accumulate in memory and flush every 1 second
    CLICK_BUFFER.ADD(short_code, click_event)
    IF CLICK_BUFFER.SIZE(short_code) >= 1000 OR CLICK_BUFFER.AGE(short_code) >= 1s
      MESSAGE_QUEUE.PUBLISH_BATCH("click-events", CLICK_BUFFER.DRAIN(short_code))
    END IF

    // 4. Sample analytics for extreme traffic (>100K QPS)
    IF current_qps > 100000
      IF RANDOM() < 0.1   // 10% sampling
        emit_click_event(click_event)
        click_event.sampled = TRUE
        click_event.sample_rate = 10
      END IF
    END IF
  END IF
```

### 2.5 Failure Modes

| Failure | Impact | Mitigation |
|---|---|---|
| **L2 cache cluster down** | All requests fall through to database; latency spikes to 10-20ms | L1 cache still serves hot URLs; circuit breaker prevents DB overload; degrade gracefully |
| **Database shard unavailable** | URLs on that shard return 503 | Replicated shards with automatic failover; stale L2 cache serves reads during failover |
| **Network latency spike** | L2 lookups exceed 10ms | L1 absorbs impact for hot URLs; timeout and fallback to DB with circuit breaker on L2 |
| **Cache poisoning** | Wrong URL served for a short code | Signed cache entries; TTL limits blast radius; cache invalidation on URL update |

---

## 3. Deep Dive: Analytics Pipeline

### 3.1 Why This Is Critical

Analytics transforms a simple redirect service into a data platform. Click events must be captured with zero impact on redirect latency, processed with at-least-once semantics, enriched with geo and device data, and aggregated into queryable rollups—all at 100K+ events per second.

### 3.2 How It Works — Event Processing Pipeline

```
PIPELINE ClickEventProcessing

  STAGE 1: Event Capture (Redirect Service → Message Queue)
    // Fire-and-forget from redirect hot path
    // If queue is unavailable, buffer locally (up to 10,000 events)
    // Drop events only as last resort (analytics loss < redirect failure)

    ON_REDIRECT(short_code, request):
      event ← CreateClickEvent(short_code, request)
      TRY
        QUEUE.PUBLISH_ASYNC("click-events", event)
      CATCH QueueUnavailable
        LOCAL_BUFFER.ADD(event)
        IF LOCAL_BUFFER.SIZE > 10000
          LOCAL_BUFFER.DROP_OLDEST()
          metrics.increment("analytics.events.dropped")
        END IF
      END TRY

  STAGE 2: Stream Processing (Consumer Group)
    // Micro-batch processing every 1-5 seconds
    // Consumer group with N consumers, each handling M partitions

    FOR EACH batch IN QUEUE.CONSUME("click-events", batch_size=5000, timeout=5s)
      enriched_batch ← []

      FOR EACH event IN batch
        // 2a: Geo enrichment (IP → location)
        event.country ← GEO_DB.LOOKUP(event.ip_hash)   // MaxMind-style local DB
        event.city ← GEO_DB.LOOKUP_CITY(event.ip_hash)

        // 2b: User-Agent parsing
        parsed_ua ← UA_PARSER.PARSE(event.user_agent)
        event.device_type ← parsed_ua.device    // mobile | desktop | tablet
        event.browser ← parsed_ua.browser       // Chrome, Safari, etc.
        event.os ← parsed_ua.os                 // iOS, Android, Windows, etc.

        // 2c: Bot detection
        IF IS_KNOWN_BOT(event.user_agent) OR IS_DATACENTER_IP(event.ip_hash)
          event.is_bot ← TRUE
          metrics.increment("analytics.bot_clicks")
        END IF

        // 2d: Deduplication (same user clicking same link within 1 minute)
        dedup_key ← HASH(event.short_code + event.ip_hash + FLOOR(event.clicked_at / 60s))
        IF BLOOM_FILTER.CONTAINS(dedup_key)
          event.is_duplicate ← TRUE
        ELSE
          BLOOM_FILTER.ADD(dedup_key)
        END IF

        enriched_batch.ADD(event)
      END FOR

      // 2e: Batch write to analytics store
      ANALYTICS_DB.BATCH_INSERT(enriched_batch)
      QUEUE.COMMIT_OFFSETS()
    END FOR

  STAGE 3: Aggregation (Materialized Views / Scheduled Jobs)
    // Hourly aggregation job
    EVERY 1 HOUR:
      FOR EACH short_code WITH new_events IN last_hour:
        hourly_stats ← ANALYTICS_DB.QUERY(
          "SELECT
             short_code,
             DATE_TRUNC('hour', clicked_at) as hour,
             COUNT(*) as total_clicks,
             COUNT_DISTINCT(ip_hash) as unique_visitors,
             COUNT_IF(is_bot) as bot_clicks,
             GROUP_BY(country) as country_breakdown,
             GROUP_BY(referrer) as referrer_breakdown,
             GROUP_BY(device_type) as device_breakdown
           FROM click_events
           WHERE short_code = ? AND clicked_at IN last_hour
           GROUP BY short_code, hour"
        )
        ANALYTICS_DB.UPSERT("hourly_stats", hourly_stats)

    // Daily rollup (runs at midnight UTC)
    EVERY 1 DAY:
      AGGREGATE hourly_stats INTO daily_stats
      AGGREGATE daily_stats INTO monthly_stats
```

### 3.3 Failure Modes

| Failure | Impact | Mitigation |
|---|---|---|
| **Message queue unavailable** | Click events buffered locally; dropped after buffer overflow | Local disk buffer with replay on recovery; alert on buffer > 50% capacity |
| **Stream processor crash** | Events accumulate in queue; processing pauses | Consumer group rebalance; standby consumers pick up partitions within seconds |
| **Geo database stale** | Country/city data may be inaccurate for recently reassigned IPs | Update geo database weekly; flag lookups with confidence score |
| **Analytics store slow** | Batch inserts back up; queue consumer lag increases | Auto-scale write capacity; temporarily reduce batch granularity (drop city-level detail) |
| **Duplicate events** | Inflated click counts | Idempotent inserts using event_id; deduplication bloom filter at processing stage |

---

## 4. Concurrency & Race Conditions

### 4.1 Custom Alias Race Condition

**Problem:** Two users simultaneously request the same custom alias.

```
Timeline:
  T1: User A checks alias "my-link" → Not found
  T2: User B checks alias "my-link" → Not found
  T3: User A inserts alias "my-link" → Success
  T4: User B inserts alias "my-link" → ??? (duplicate!)

SOLUTION: Atomic INSERT-IF-NOT-EXISTS

  // Use database-level conditional insert (CAS operation)
  result ← DB.INSERT(
    key = "my-link",
    value = url_record,
    condition = NOT_EXISTS    // Atomic: fails if key already exists
  )

  IF result == CONFLICT
    RETURN 409 Conflict
  END IF

  // Only one of User A or User B succeeds; the other gets 409
  // No window for TOCTOU (time-of-check-to-time-of-use) vulnerability
```

### 4.2 Counter Range Allocation Race

**Problem:** Two instances request ranges simultaneously from the Range Server.

```
SOLUTION: Atomic fetch-and-add on the Range Server counter

  // The counter is protected by compare-and-swap (CAS)
  FUNCTION AllocateRange(range_size)
    LOOP
      current ← LOAD(global_counter)
      new_value ← current + range_size
      IF CAS(global_counter, expected = current, desired = new_value)
        RETURN (current, current + range_size - 1)
      END IF
      // CAS failed: another instance won the race; retry with updated value
    END LOOP

  // Lock-free: no mutex, no deadlock risk
  // Contention: at most 100 range allocations/sec (1.2K URLs/sec ÷ 10K range)
  // CAS retry rate: < 1% at this contention level
```

### 4.3 Cache Invalidation on URL Update

**Problem:** User updates destination URL, but cached copies serve the old URL.

```
ALGORITHM InvalidateOnUpdate(short_code, new_long_url)
  // Step 1: Update database (source of truth)
  DB.UPDATE(short_code, long_url = new_long_url)

  // Step 2: Invalidate L2 (distributed cache)
  L2_CACHE.DELETE("url:" + short_code)

  // Step 3: Publish invalidation event
  INVALIDATION_BUS.PUBLISH("url-invalidated", short_code)

  // Step 4: All redirect instances subscribe to invalidation events
  ON_EVENT("url-invalidated", short_code):
    L1_CACHE.DELETE(short_code)

  // Worst case: L1 serves stale data for up to 15 seconds (L1 TTL)
  // Acceptable trade-off for the performance benefit of L1 caching

  NOTE: This is why URL updates are only allowed for 302 redirects.
    301 redirects are cached by browsers and CDNs, making invalidation
    impossible outside the server's control.
```

---

## 5. Bottleneck Analysis

### 5.1 Top Bottlenecks

| Rank | Bottleneck | Severity | Symptom |
|---|---|---|---|
| **#1** | Database read throughput under cache miss storms | Critical | Redirect latency spikes to > 100ms; 5xx error rate increases |
| **#2** | Range Server availability for ID generation | High | URL creation fails; fallback to longer Snowflake codes |
| **#3** | Analytics pipeline lag during traffic spikes | Medium | Dashboard shows stale click counts; real-time analytics delayed |

### 5.2 Bottleneck #1: Database Under Cache Miss Storm

**Scenario:** A cache node fails, evicting millions of entries. Redirect traffic for those entries falls through to the database, overwhelming it.

```
ANALYSIS:
  Normal: 95% cache hit rate → 5% of 115K/sec = 5,750 DB reads/sec
  Cache node failure: 70% cache hit rate → 30% of 115K/sec = 34,700 DB reads/sec
  6x increase in DB load → exceeds provisioned read capacity

MITIGATIONS:
  1. Circuit breaker on DB connection pool
     - When DB latency > 50ms or error rate > 5%, open circuit
     - Return 503 with Retry-After header instead of overwhelming DB

  2. Request coalescing (dedup concurrent requests for same key)
     - 100 concurrent requests for the same short_code = 1 DB read + 99 waiters

  3. Warm standby cache
     - Maintain a secondary cache cluster with asynchronous replication
     - Promote to primary on cache node failure (< 30 second failover)

  4. Gradual cache repopulation
     - Don't backfill cache for ALL missed keys simultaneously
     - Rate-limit cache backfill to 10K entries/sec to avoid overwhelming both DB and cache
```

### 5.3 Bottleneck #2: Range Server Availability

**Scenario:** The Range Server becomes unreachable; instances exhaust their pre-allocated ranges.

```
ANALYSIS:
  Each instance holds a range of 10,000 IDs
  At 1,200 writes/sec across 10 instances → 120 writes/sec per instance
  Range lasts: 10,000 / 120 = ~83 seconds
  After 83 seconds without Range Server, instance switches to Snowflake fallback

MITIGATIONS:
  1. Pre-allocate multiple ranges (buffer 3 ranges = ~4 minutes of headroom)
  2. Primary-replica Range Server with automatic failover (< 5s)
  3. Range Server writes counter to durable store synchronously
     (recovery loads last persisted counter value)
  4. Snowflake fallback ensures zero downtime (codes are just longer)
  5. Monitor range allocation rate; alert when any instance has < 1 range remaining
```

### 5.4 Bottleneck #3: Analytics Pipeline Lag

**Scenario:** A viral link generates 500K clicks/minute; analytics pipeline consumer lag grows.

```
ANALYSIS:
  Normal throughput: 115K events/sec consumed
  Spike: 500K events/sec produced (4.3x normal)
  Consumer processes 5,000 events/batch × 20 batches/sec = 100K events/sec per consumer
  Need: 500K / 100K = 5 consumers minimum (normally running 3)

MITIGATIONS:
  1. Auto-scale consumer group based on queue lag
     - Alert when lag > 100K events
     - Add consumers when lag > 500K events
     - Scale target: consumer throughput >= producer throughput within 2 minutes

  2. Reduce enrichment cost during spikes
     - Skip city-level geo lookup (country is sufficient)
     - Cache User-Agent parse results (top 100 UAs cover 95% of traffic)

  3. Sampling for extreme spikes (> 5x normal)
     - Sample 10% of events for the hot link
     - Multiply counts by sample rate in aggregation
     - Mark sampled data in dashboard ("estimated" label)

  4. Separate hot-link events into a dedicated queue partition
     - Prevents one viral link from delaying analytics for all other links
```

---

## 6. Performance Optimization Summary

| Optimization | Impact | Complexity |
|---|---|---|
| In-process cache (L1) for hot URLs | Reduces P50 latency from 2ms to < 0.1ms | Low |
| Jittered cache TTLs | Prevents synchronized cache expiration storms | Low |
| Request coalescing on cache miss | Reduces DB load by 10-100x during stampedes | Medium |
| Connection pooling with circuit breakers | Prevents cascading failures on DB overload | Medium |
| Analytics event batching | Reduces message queue write pressure by 10x | Low |
| Bloom filter deduplication | Eliminates duplicate click counting without DB lookup | Medium |
| Counter range pre-allocation | Eliminates per-request coordination for ID generation | Medium |
| Hot link detection and pinning | Prevents cache eviction of viral links | Medium |
| Analytics sampling at extreme scale | Maintains pipeline stability during viral events | High |
