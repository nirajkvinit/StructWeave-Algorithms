# Observability — URL Shortener

## 1. Metrics

### 1.1 RED Method (Request-oriented)

| Service | Rate | Errors | Duration |
|---|---|---|---|
| **Redirect Service** | Redirects/sec (total, by status code, by cache tier hit) | 4xx rate (404, 410), 5xx rate, timeout rate | P50, P95, P99 redirect latency (by cache tier: L1, L2, L3) |
| **Creation Service** | URLs created/sec (by type: generated, custom alias) | 409 conflict rate, 422 abuse block rate, 5xx rate | P50, P95, P99 creation latency |
| **Analytics API** | Queries/sec (by endpoint, by time range) | 5xx rate, timeout rate, empty result rate | P50, P95, P99 query latency |
| **Analytics Pipeline** | Events consumed/sec, events produced/sec | Processing errors, deserialization failures, enrichment failures | End-to-end event latency (redirect → queryable in dashboard) |

### 1.2 USE Method (Resource-oriented)

| Resource | Utilization | Saturation | Errors |
|---|---|---|---|
| **Redirect Instances** | CPU %, memory %, network I/O | Request queue depth, thread pool saturation | OOM kills, connection refused |
| **Distributed Cache** | Memory %, connection count, eviction rate | Key eviction rate, hit ratio degradation | Connection errors, timeout rate |
| **URL Store (per shard)** | Disk I/O %, CPU %, replication lag | Connection pool utilization, query queue depth | Replication errors, write failures |
| **Message Queue** | Disk usage %, partition count, consumer lag | Consumer lag trend (growing = saturation) | Under-replicated partitions, produce failures |
| **Analytics Store** | Disk %, memory %, merge queue depth | Insert queue depth, query queue depth | Merge errors, query timeouts |

### 1.3 Key Metrics to Track

#### Redirect Health

| Metric | Description | Alert Threshold |
|---|---|---|
| `redirect.requests.total` | Total redirects/sec by status code (301, 302, 404, 410, 5xx) | 5xx rate > 0.1% |
| `redirect.latency.p99` | 99th percentile redirect latency | > 50ms |
| `redirect.latency.p50` | Median redirect latency | > 10ms |
| `cache.hit_ratio.l1` | In-process cache hit rate | < 60% |
| `cache.hit_ratio.l2` | Distributed cache hit rate | < 90% |
| `cache.hit_ratio.overall` | Combined cache hit rate (L1 + L2) | < 95% |
| `redirect.db_fallback.rate` | Percentage of redirects hitting database | > 5% |

#### Creation Health

| Metric | Description | Alert Threshold |
|---|---|---|
| `creation.requests.total` | URLs created/sec by type | N/A (informational) |
| `creation.latency.p99` | 99th percentile creation latency | > 200ms |
| `creation.conflict_rate` | Custom alias collision rate | > 5% (may indicate attack) |
| `creation.abuse_block_rate` | URLs blocked by reputation check | > 2% (spam wave) |
| `id_gen.range_remaining` | IDs remaining in current range per instance | < 1,000 |
| `id_gen.fallback_rate` | Rate of Snowflake fallback usage | > 0 (Range Server issue) |

#### Analytics Pipeline Health

| Metric | Description | Alert Threshold |
|---|---|---|
| `pipeline.consumer_lag` | Events pending in queue (across all partitions) | > 500K events |
| `pipeline.throughput` | Events processed/sec | < 80% of produce rate |
| `pipeline.e2e_latency` | Time from click to queryable in dashboard | > 60 seconds |
| `pipeline.enrichment_failures` | Geo/UA parse failures/sec | > 1% of events |
| `pipeline.fraud_detection_rate` | Percentage of clicks flagged as fraudulent | > 10% (under attack or false positives) |
| `pipeline.dedup_rate` | Percentage of duplicate events filtered | > 5% (pipeline issue) |

#### Business Metrics

| Metric | Description | Alert Threshold |
|---|---|---|
| `urls.active.total` | Total active URLs in the system | N/A (capacity planning) |
| `urls.created.daily` | Daily URL creation count | Drop > 30% day-over-day |
| `redirects.daily` | Daily redirect count | Drop > 20% day-over-day |
| `users.active.daily` | Daily active users (creators + analytics viewers) | Drop > 25% day-over-day |
| `hot_links.count` | URLs with > 10K redirects/min | N/A (capacity planning) |

---

## 2. Dashboard Design

### 2.1 Operational Dashboard (SRE)

```
┌─────────────────────────────────────────────────────────────────┐
│ URL Shortener — Operational Dashboard                           │
├────────────────────────┬────────────────────────────────────────┤
│                        │                                        │
│  Redirect QPS          │  Redirect Latency (P50/P95/P99)       │
│  ┌──────────────────┐  │  ┌──────────────────────────────────┐ │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │  │ P50: ─── 2ms                    │ │
│  │ 115,234 req/sec  │  │  │ P95: ─── 8ms                    │ │
│  │ Current          │  │  │ P99: ─── 23ms                   │ │
│  └──────────────────┘  │  └──────────────────────────────────┘ │
│                        │                                        │
│  Cache Hit Ratio       │  Error Rate by Type                   │
│  ┌──────────────────┐  │  ┌──────────────────────────────────┐ │
│  │ L1: 68.2%        │  │  │ 404: 0.3%  410: 0.1%            │ │
│  │ L2: 27.1%        │  │  │ 5xx: 0.01% Timeout: 0.005%      │ │
│  │ DB:  4.7%        │  │  │                                  │ │
│  │ Overall: 95.3%   │  │  │                                  │ │
│  └──────────────────┘  │  └──────────────────────────────────┘ │
│                        │                                        │
├────────────────────────┴────────────────────────────────────────┤
│                                                                  │
│  Analytics Pipeline                   │  DB Shard Health         │
│  ┌────────────────────────────────┐   │  ┌────────────────────┐ │
│  │ Consumer lag: 12,340 events    │   │  │ Shards: 128/128 ✓  │ │
│  │ Throughput: 108K events/sec    │   │  │ Repl lag: < 50ms   │ │
│  │ E2E latency: 8.2 seconds      │   │  │ Disk: 62% avg      │ │
│  └────────────────────────────────┘   │  └────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Business Dashboard (Product)

```
┌─────────────────────────────────────────────────────────────────┐
│ URL Shortener — Business Metrics                                │
├────────────────────────┬────────────────────────────────────────┤
│                        │                                        │
│  URLs Created Today    │  Redirects Today                       │
│  ┌──────────────────┐  │  ┌──────────────────────────────────┐ │
│  │  98.7M            │  │  │  9.82B                           │ │
│  │  ▲ 3.2% vs yday  │  │  │  ▲ 1.8% vs yesterday            │ │
│  └──────────────────┘  │  └──────────────────────────────────┘ │
│                        │                                        │
│  Top 10 Hot Links      │  Geographic Distribution              │
│  ┌──────────────────┐  │  ┌──────────────────────────────────┐ │
│  │ 1. /viral - 2.1M │  │  │ US: 38%  EU: 28%  APAC: 22%     │ │
│  │ 2. /deal  - 890K │  │  │ LATAM: 7%  MEA: 5%              │ │
│  │ 3. /news  - 445K │  │  │                                  │ │
│  └──────────────────┘  │  └──────────────────────────────────┘ │
│                        │                                        │
│  Abuse Metrics         │  Platform Health                      │
│  ┌──────────────────┐  │  ┌──────────────────────────────────┐ │
│  │ Blocked: 1.2M     │  │  │ Redirect uptime: 99.997%        │ │
│  │ Fraud clicks: 89M │  │  │ Creation uptime: 99.94%         │ │
│  │ Reports: 234      │  │  │ Error budget remaining: 72%     │ │
│  └──────────────────┘  │  └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Logging

### 3.1 What to Log

| Event | Log Level | Fields | Retention |
|---|---|---|---|
| **Redirect success** | INFO | short_code, cache_tier_hit, latency_ms, status_code, region | 7 days |
| **Redirect not found** | WARN | short_code, requester_ip_hash, region | 14 days |
| **URL created** | INFO | short_code, user_id, is_custom_alias, latency_ms | 30 days |
| **Custom alias conflict** | WARN | requested_alias, user_id | 30 days |
| **URL blocked (abuse)** | WARN | long_url_domain, user_id, reputation_score, reason | 90 days |
| **Rate limit triggered** | WARN | user_id_or_ip, endpoint, current_rate, limit | 14 days |
| **Cache miss storm** | ERROR | cache_tier, miss_rate, db_qps, duration_ms | 30 days |
| **Range allocation** | INFO | worker_id, range_start, range_end, range_server_latency | 30 days |
| **Snowflake fallback** | WARN | worker_id, reason, fallback_code_length | 90 days |
| **DB failover** | CRITICAL | shard_id, old_primary, new_primary, downtime_ms | 1 year |
| **Circuit breaker state change** | WARN | breaker_name, old_state, new_state, reason | 90 days |

### 3.2 Structured Log Format

```
LOG FORMAT (JSON):

{
  "timestamp": "2026-03-09T14:23:45.123Z",
  "level": "INFO",
  "service": "redirect-service",
  "instance_id": "redirect-us-east-1a-07",
  "trace_id": "abc123def456",
  "span_id": "span789",
  "event": "redirect.success",
  "short_code": "a1B2c3D",
  "cache_tier": "L2",
  "latency_ms": 1.8,
  "status_code": 302,
  "region": "us-east",
  "metadata": {
    "has_expiration": true,
    "redirect_type": 302,
    "is_custom_alias": false
  }
}

GUIDELINES:
  - Never log raw IP addresses (hash first)
  - Never log full destination URLs in redirect logs (may contain PII)
  - Always include trace_id for cross-service correlation
  - Use structured JSON format (not free-text) for queryability
  - Log at appropriate levels: DEBUG for cache operations, INFO for success,
    WARN for degradation, ERROR for failures, CRITICAL for data loss risk
```

### 3.3 Log Sampling

```
SAMPLING STRATEGY:

  Redirect success logs (highest volume):
    - 100% for errors and warnings (never sample failures)
    - 10% for cache L3 hits (DB fallback — want visibility)
    - 1% for cache L2 hits (normal operation)
    - 0.1% for cache L1 hits (extremely high volume, low signal)

  Creation logs:
    - 100% (low volume relative to redirects)

  Analytics pipeline logs:
    - 100% for errors
    - 1% for successful event processing
    - 100% for fraud detection triggers

  Rationale:
    At 115K redirects/sec, logging 100% of L1 hits would produce
    ~78K log entries/sec (68% hit rate × 115K). At ~200 bytes/entry,
    that's ~15.6 MB/sec of log data from redirects alone.
    Sampling reduces this by ~1000x while preserving visibility
    into failures and unusual patterns.
```

---

## 4. Distributed Tracing

### 4.1 Trace Propagation

```
TRACE CONTEXT PROPAGATION:

  Write Path (URL Creation):
    Client → API Gateway → Creation Service → [ID Generator, URL Store, Cache]

    Trace spans:
    ┌─ api_gateway.receive_request (auth, rate limit)
    │  ├─ creation.validate_url (format, reputation)
    │  ├─ creation.generate_id (range allocation or Snowflake)
    │  ├─ url_store.insert (database write)
    │  └─ cache.populate (distributed cache write)
    └─ api_gateway.send_response

  Read Path (Redirect):
    User → CDN → API Gateway → Redirect Service → [L1, L2, DB]

    Trace spans:
    ┌─ api_gateway.receive_request
    │  ├─ redirect.cache_lookup.l1 (in-process, < 0.1ms)
    │  ├─ redirect.cache_lookup.l2 (distributed, ~1-2ms)  [if L1 miss]
    │  ├─ redirect.db_lookup (database, ~5-20ms)           [if L2 miss]
    │  ├─ redirect.cache_backfill                          [if DB hit]
    │  └─ redirect.emit_click_event (async, fire-and-forget)
    └─ api_gateway.send_redirect

  Analytics Path (Click Processing):
    Redirect → Queue → Stream Processor → Analytics Store

    Trace spans:
    ┌─ queue.publish (from redirect service, async)
    │  ├─ processor.consume_batch
    │  ├─ processor.geo_enrich
    │  ├─ processor.parse_ua
    │  ├─ processor.deduplicate
    │  ├─ processor.fraud_check
    │  └─ analytics_store.batch_insert
    └─ processor.commit_offsets
```

### 4.2 Key Spans to Instrument

| Span | Purpose | Key Attributes |
|---|---|---|
| `redirect.resolve` | End-to-end redirect resolution | `cache_tier`, `latency_ms`, `status_code` |
| `cache.lookup` | Cache read (any tier) | `tier` (L1/L2), `hit` (bool), `latency_ms` |
| `db.query` | Database read | `shard_id`, `latency_ms`, `is_fallback` |
| `id_gen.allocate` | ID generation (range or Snowflake) | `strategy`, `range_remaining`, `latency_ms` |
| `url.create` | URL creation end-to-end | `is_custom_alias`, `reputation_score`, `latency_ms` |
| `analytics.process_batch` | Batch event processing | `batch_size`, `enrichment_ms`, `fraud_count` |
| `analytics.query` | Analytics API query | `time_range_days`, `result_count`, `latency_ms` |

### 4.3 Sampling Strategy for Traces

```
TRACE SAMPLING:

  Head-based sampling:
    - Redirect path: 0.1% of requests (at 115K QPS = ~115 traces/sec)
    - Creation path: 10% of requests (at 1.2K QPS = ~120 traces/sec)
    - Analytics queries: 100% (low volume, high diagnostic value)

  Tail-based sampling (always capture):
    - Any request with error (4xx, 5xx)
    - Any request with latency > 2× P95
    - Any request that triggers circuit breaker
    - Any request with Snowflake ID fallback
    - Any request flagged for fraud

  Combined: ~300-500 traces/sec stored (manageable volume)
```

---

## 5. Alerting

### 5.1 Alert Hierarchy

#### Critical Alerts (Page on-call immediately)

| Alert | Condition | Runbook Action |
|---|---|---|
| **Redirect Error Rate** | 5xx rate > 0.5% for 2 minutes | Check DB health → cache health → circuit breaker state |
| **Redirect Latency** | P99 > 100ms for 5 minutes | Check cache hit ratio → DB latency → network issues |
| **SLO Burn Rate** | Error budget consumption > 5x rate for 1 hour | Assess scope → engage incident response → consider traffic shift |
| **Database Failover** | Primary shard failover detected | Verify promotion success → check replication → monitor write path |
| **Data Loss Risk** | Message queue under-replicated partitions | Check broker health → verify ISR → consider producer throttling |

#### Warning Alerts (Notify during business hours)

| Alert | Condition | Runbook Action |
|---|---|---|
| **Cache Hit Ratio** | Overall < 92% for 15 minutes | Check for cache node failure → eviction rate → new traffic pattern |
| **Analytics Lag** | Consumer lag > 200K events for 10 minutes | Check consumer health → scale consumers → check analytics store |
| **Range Server** | Any instance with < 500 IDs remaining | Verify Range Server health → check allocation latency → pre-allocate |
| **Abuse Spike** | URL block rate > 5% for 30 minutes | Review blocked URLs → check spam campaign → adjust thresholds |
| **Disk Usage** | Any DB shard > 80% disk | Plan capacity addition → archive old data → evaluate sharding |
| **Replication Lag** | Any replica > 1 second behind primary | Check replica health → network issues → I/O saturation |

#### Informational Alerts (Dashboard only)

| Alert | Condition | Purpose |
|---|---|---|
| **Traffic Anomaly** | Redirect QPS > 2× or < 0.5× historical norm | Early warning for viral events or outages |
| **New Hot Link** | Any URL exceeding 10K redirects/minute | Capacity awareness; preemptive cache pinning |
| **Snowflake Fallback** | Any instance using Snowflake IDs | Range Server health tracking |
| **Fraud Spike** | Fraud detection rate > 15% for any URL | Potential click farm activity |

### 5.2 Runbook References

```
RUNBOOK INDEX:

  RB-001: Redirect latency spike
    Symptoms: P99 > 50ms, cache hit ratio dropping
    Steps: 1. Check cache cluster health (any nodes down?)
           2. Check for cache stampede (mass TTL expiration?)
           3. Check DB shard latency (replication lag? disk I/O?)
           4. Check for hot link (single URL dominating traffic?)
           5. Activate degradation level 2 if cache > 30% degraded

  RB-002: URL creation failures
    Symptoms: Creation 5xx rate rising
    Steps: 1. Check Range Server health (is it reachable?)
           2. Check DB primary health (write path availability)
           3. Verify Snowflake fallback is activating (should auto-switch)
           4. Check rate limiting (are legitimate users being blocked?)
           5. Check for abuse spike (mass bot creation?)

  RB-003: Analytics pipeline lag
    Symptoms: Consumer lag > 500K, dashboard showing stale data
    Steps: 1. Check consumer group health (any dead consumers?)
           2. Scale consumer group (add instances)
           3. Check analytics store write latency (merge queue depth)
           4. Activate sampling if lag > 2M events
           5. Check for specific hot link flooding the queue

  RB-004: Database failover
    Symptoms: Primary unreachable, automatic promotion triggered
    Steps: 1. Verify new primary is accepting writes
           2. Verify read replicas have re-pointed
           3. Check for data consistency (replication lag at failure time)
           4. Investigate root cause of primary failure
           5. Replace failed node and add back as replica

  RB-005: Cache cluster node failure
    Symptoms: Cache node unreachable, hit ratio dropping
    Steps: 1. Verify consistent hashing has redistributed keys
           2. Monitor DB load for cache miss spike
           3. Activate request coalescing if DB load > 2× normal
           4. Add replacement cache node
           5. Monitor cache repopulation (warm-up time ~5-10 min)
```

---

## 6. Health Check Endpoints

```
HEALTH CHECK DESIGN:

  GET /health/live
    Purpose: Kubernetes liveness probe
    Checks: Process is running and responding
    Response: 200 OK (always, unless process is deadlocked)
    Timeout: 1 second

  GET /health/ready
    Purpose: Kubernetes readiness probe
    Checks:
      - L2 cache connection is alive
      - DB connection pool has available connections
      - (For Creation Service) Range has > 0 IDs remaining
    Response: 200 OK or 503 Service Unavailable
    Timeout: 3 seconds

    Note: Redirect Service does NOT require DB for readiness
    (can serve from cache; DB failure is handled by circuit breaker)

  GET /health/startup
    Purpose: Kubernetes startup probe
    Checks:
      - L1 cache initialized
      - L2 cache connection established
      - DB connection pool initialized
      - (For Creation Service) First range allocated from Range Server
    Response: 200 OK or 503 Service Unavailable
    Timeout: 30 seconds (initial range allocation may take time)
```
