# 14.13 AI-Native MSME Business Intelligence Dashboard — Scalability & Reliability

## Scaling Dimensions

### Tenant Growth Scaling

The system must scale from 200K to 2M+ tenants without re-architecture. The key scaling bottlenecks and strategies:

| Component | Scaling Approach | Trigger |
|---|---|---|
| **Analytical warehouse** | Horizontal shard-split: start with 4096 hash partitions, split into 16K when partition size exceeds 100 GB | Avg partition size > 80 GB |
| **Semantic graph store** | Key-value store with consistent hashing; add nodes to the ring as total graph size grows | Total graphs > 50 GB |
| **NL-to-SQL LLM inference** | Horizontal GPU pool with load-balanced routing; auto-scale based on queue depth | Queue wait > 200 ms |
| **Materialized view compute** | Time-sliced batch processing with elastic compute that scales up during refresh windows and down during quiet hours | Refresh backlog > 30 minutes |
| **WhatsApp delivery** | Geographic sharding of delivery workers; multiple WhatsApp Business API accounts across regions | Delivery rate > 400 msg/s per account |

### Query Volume Scaling

```
PSEUDOCODE: query_routing(query, tenant)
    // Step 1: Check semantic cache
    cache_key = hash(normalize(query.text), tenant.id, data_freshness_marker)
    IF cache.exists(cache_key):
        RETURN cache.get(cache_key)     // < 50 ms

    // Step 2: Check template cache
    template = template_matcher.match(query.text)
    IF template != null:
        sql = template.fill(query.entities, tenant.schema)
        RETURN execute_and_cache(sql)   // < 500 ms

    // Step 3: Check materialized views
    mv = mv_router.find_covering_view(query.entities, tenant.id)
    IF mv != null:
        RETURN query_mv_and_cache(mv)   // < 200 ms

    // Step 4: Full LLM pipeline (most expensive path)
    RETURN full_nl_to_sql_pipeline(query, tenant)  // < 3000 ms
```

This four-tier routing ensures that as query volume grows, the most expensive path (full LLM pipeline) handles a decreasing percentage of queries. At steady state: 25% cache hits, 35% template hits, 20% materialized view hits, 20% full pipeline.

### Data Volume Scaling

| Scenario | Strategy |
|---|---|
| Tenant data grows beyond 1 GB | Tiered storage: hot (last 90 days) in columnar store, warm (90 days - 1 year) in compressed columnar, cold (1-3 years) in object storage with on-demand query |
| Aggregate data exceeds 1 PB | Columnar store federation: split into regional clusters (India-West, India-South, India-North, India-East) with cross-region query routing |
| Materialized view storage exceeds 100 TB | TTL-based eviction: views for tenants inactive >30 days are evicted and recomputed on-demand when they return |

---

## Reliability Patterns

### Circuit Breaker: LLM Service

The NL-to-SQL pipeline depends on an LLM inference service that may experience latency spikes or outages. The circuit breaker prevents cascading failures:

```
PSEUDOCODE: llm_circuit_breaker
    STATE: CLOSED (normal), OPEN (failing), HALF_OPEN (testing)

    ON query:
        IF state == OPEN:
            IF now - last_failure > 30 seconds:
                state = HALF_OPEN  // allow one test query
            ELSE:
                RETURN template_fallback(query)  // degraded but functional

        TRY:
            result = llm_generate_sql(query, timeout=2000ms)
            IF state == HALF_OPEN:
                state = CLOSED
                failure_count = 0
            RETURN result

        CATCH timeout OR error:
            failure_count += 1
            IF failure_count >= 5:
                state = OPEN
                last_failure = now
            RETURN template_fallback(query)
```

When the circuit is open, the system degrades gracefully: template-matched queries still work (covering 60% of use cases), and complex queries return a message: "Advanced analytics are temporarily unavailable. Showing your standard metrics dashboard instead."

### Data Pipeline Reliability

**At-least-once delivery with deduplication:**
Every data ingestion event is assigned a globally unique event_id. The ingestion pipeline guarantees at-least-once processing (retry on failure). The deduplication layer at the warehouse uses event_id to prevent duplicate rows. This is cheaper than exactly-once semantics and equally correct for analytical workloads.

**Checkpoint-based recovery:**
Long-running ingestion jobs (initial snapshots with millions of rows) checkpoint progress every 10,000 rows. On failure, the job resumes from the last checkpoint rather than starting over. Checkpoints are stored in a durable key-value store, separate from the data pipeline itself.

**Dead letter queue:**
Records that fail schema validation, type coercion, or deduplication are routed to a per-tenant dead letter queue. These are not silently dropped—the merchant sees a "data quality" alert in their dashboard showing the count of unprocessable records and the ability to download them for manual review.

### Multi-Region Resilience

| Component | Primary | Failover | RPO | RTO |
|---|---|---|---|---|
| Analytical warehouse | Region A | Region B (async replica, 5-min lag) | 5 minutes | 15 minutes |
| Semantic graph store | Region A | Region B (sync replica) | 0 | 5 minutes |
| LLM inference | Multi-region active-active | Auto-route to healthy region | N/A | < 30 seconds |
| WhatsApp delivery | Region A | Region B | N/A | 2 minutes (re-queue pending messages) |
| Dashboard web app | CDN + multi-region origin | CDN serves cached; re-route origin | N/A | < 60 seconds |

### Graceful Degradation Ladder

When components fail, the system degrades in priority order—preserving the most valuable functionality longest:

| Failure | Degraded Experience | What Still Works |
|---|---|---|
| LLM inference down | No NL queries; template queries only | Dashboards, materialized views, WhatsApp digests |
| Analytical warehouse slow | NL queries from cache/MVs only; no ad-hoc | Cached queries, dashboards with cached data, digests |
| Data ingestion delayed | Stale data (flagged with "last updated X hours ago") | All queries on existing data; no fresh insights |
| WhatsApp API down | Digests queued for retry; email fallback | Dashboard, NL queries, push notifications |
| Insight engine backlogged | Insights delayed; last-known insights shown | Queries, dashboards, manual exploration |
| Complete outage | Static status page | Nothing—incident response activated |

---

## Capacity Planning

### Growth Model

```
YEAR 1 (Launch):
    Tenants:        200K registered, 80K MAT
    Queries/day:    200K
    Storage:        100 TB
    LLM GPU-hours:  25/day
    Monthly cost:   ~$80K

YEAR 2:
    Tenants:        800K registered, 320K MAT
    Queries/day:    800K
    Storage:        350 TB
    LLM GPU-hours:  80/day
    Monthly cost:   ~$200K

YEAR 3 (Target scale):
    Tenants:        2M registered, 800K MAT
    Queries/day:    1M
    Storage:        500 TB (with cold tier offloading)
    LLM GPU-hours:  120/day
    Monthly cost:   ~$311K
```

### Auto-Scaling Policies

| Component | Metric | Scale-Up Threshold | Scale-Down Threshold | Min/Max Instances |
|---|---|---|---|---|
| NL query service | p95 latency | > 2.5 s | < 1.5 s (sustained 10 min) | 4 / 40 |
| LLM inference pool | Queue depth | > 50 pending | < 10 pending (sustained 5 min) | 2 / 20 GPU nodes |
| Query engine | CPU utilization | > 70% | < 30% (sustained 15 min) | 8 / 80 |
| Ingestion workers | Backlog size | > 10K pending events | < 1K pending (sustained 10 min) | 4 / 40 |
| WhatsApp sender | Queue depth | > 50K pending | < 5K pending | 2 / 10 |

---

## Disaster Recovery

### Backup Strategy

| Data | Backup Frequency | Retention | Recovery Method |
|---|---|---|---|
| Tenant configurations | Continuous (event-sourced) | Indefinite | Replay event log |
| Semantic graphs | Hourly snapshot | 30 days | Restore from snapshot |
| Analytical data | Daily full + hourly incremental | 7 years (compliance) | Restore from backup + replay CDC |
| Query logs | Daily archive to cold storage | 1 year hot, 3 years cold | Restore from archive |
| Materialized views | Not backed up | N/A | Recomputed from analytical data |

### Runbook: Warehouse Failover

```
PSEUDOCODE: warehouse_failover_procedure
    1. Detection: health check fails 3 consecutive times (90 seconds)
    2. Confirm: verify primary is truly unreachable (not a network partition)
    3. Promote: promote async replica to primary
    4. Reconnect: update connection pool DNS to new primary
    5. Verify: run canary queries across sample of tenants
    6. Notify: alert ops team; log RPO (data loss window)
    7. Rebuild: provision new replica from promoted primary
    8. Post-mortem: analyze root cause within 24 hours
```
