# Observability — Web Crawlers

## The Crawler Observability Challenge

A web crawler has a unique observability requirement: the system's "correctness" is not just about internal health (are services running?) but about external effectiveness (are we crawling the right pages at the right frequency?). A crawler can be perfectly healthy internally — all services green, no errors — while being fundamentally ineffective: wasting bandwidth on low-value pages, missing high-value hosts due to over-aggressive politeness, or silently losing coverage because a frontier partition is serving stale URLs.

Observability must cover three dimensions:
1. **Infrastructure health** — Are the crawler's components running correctly?
2. **Crawl effectiveness** — Is the crawler maximizing coverage and freshness within its budget?
3. **Politeness compliance** — Is the crawler respecting all rate limits and robots.txt directives?

---

## Platform Metrics (USE/RED)

### Frontier Metrics

| Category | Metric | Type | Description | Alert Threshold |
|----------|--------|------|-------------|-----------------|
| **Utilization** | `frontier_queue_depth` | Gauge (per partition) | URLs queued in the frontier | >100M per partition (overloaded) |
| **Utilization** | `frontier_back_queue_active` | Gauge | Back queues with at least one URL | Drop >20% in 1h indicates host loss |
| **Saturation** | `frontier_dequeue_wait_ms` | Histogram | Time fetchers wait for a URL | p99 >500ms (fetchers starving) |
| **Saturation** | `frontier_enqueue_backpressure` | Counter | Enqueue requests rejected due to full partition | >0 sustained (partition needs scaling) |
| **Errors** | `frontier_partition_errors` | Counter | Partition-level errors (checkpoint failure, heap corruption) | >0 per 5 minutes |
| **Rate** | `frontier_enqueue_rate` | Counter | URLs enqueued per second | Sustained drop >30% indicates link extraction problem |
| **Rate** | `frontier_dequeue_rate` | Counter | URLs dequeued per second | Should track fetcher throughput |

### Fetcher Fleet Metrics

| Category | Metric | Type | Description | Alert Threshold |
|----------|--------|------|-------------|-----------------|
| **Rate** | `fetcher_pages_fetched_total` | Counter | Total pages successfully fetched | Drop >20% from baseline |
| **Rate** | `fetcher_bytes_received_total` | Counter | Total bytes downloaded | Sustained drop indicates network issue |
| **Duration** | `fetcher_response_time_ms` | Histogram | HTTP response time per fetch | p99 >10s (network or host issues) |
| **Errors** | `fetcher_http_errors_total` | Counter (by status) | 4xx and 5xx responses | 5xx rate >5% indicates target host issues or crawler problems |
| **Errors** | `fetcher_timeout_total` | Counter | Connection or read timeouts | >1% of fetches |
| **Errors** | `fetcher_dns_failure_total` | Counter | DNS resolution failures | >0.1% of lookups |
| **Utilization** | `fetcher_active_connections` | Gauge (per worker) | Current open TCP connections | >90% of connection limit |
| **Utilization** | `fetcher_worker_cpu_percent` | Gauge | CPU usage per fetcher worker | >80% sustained |

### DNS Resolver Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `dns_cache_hit_rate` | Gauge | Percentage of DNS lookups served from cache | <90% (cache too small or TTLs too short) |
| `dns_cache_size` | Gauge | Number of entries in DNS cache | Monitor growth trend |
| `dns_resolution_time_ms` | Histogram | Time for DNS resolution (cache miss) | p99 >500ms |
| `dns_upstream_errors` | Counter | Failed upstream DNS queries | >1% of misses |

### Deduplication Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `dedup_url_bloom_filter_size` | Gauge | Current number of entries in Bloom filter | >90% of capacity |
| `dedup_url_bloom_false_positive_estimate` | Gauge | Estimated false positive rate | >2% (rebuild needed) |
| `dedup_content_exact_duplicates` | Counter | Pages detected as exact content duplicates | Rate >20% sustained (possible crawl inefficiency) |
| `dedup_content_near_duplicates` | Counter | Pages detected as near-duplicates via SimHash | Informational |
| `dedup_simhash_query_latency_ms` | Histogram | SimHash index lookup time | p99 >100ms |

### Politeness Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `politeness_robots_violations` | Counter | Pages fetched in violation of robots.txt | **>0 (critical — must be zero)** |
| `politeness_crawl_delay_violations` | Counter | Fetches that violated Crawl-delay timing | >0 per hour |
| `politeness_robots_cache_hit_rate` | Gauge | robots.txt cache hit rate | <80% (too many cache misses) |
| `politeness_robots_refresh_failures` | Counter | Failed robots.txt fetch attempts | >5% of refresh attempts |
| `politeness_host_backoff_active` | Gauge | Hosts currently in backoff due to errors | Spike >10% of active hosts |
| `politeness_adaptive_delay_avg_ms` | Gauge | Average adaptive delay across all active hosts | Trend monitoring |

---

## Crawl Effectiveness Metrics

These metrics measure whether the crawler is doing its job well — not just running, but running effectively.

### Coverage Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| `coverage_known_urls_total` | Total URLs in the URL database | Growth trend monitoring |
| `coverage_hosts_crawled_24h` | Distinct hosts crawled in the last 24 hours | >80% of known active hosts |
| `coverage_new_urls_discovered_24h` | New URLs found in the last 24 hours | Healthy discovery rate |
| `coverage_pages_fetched_24h` | Total pages fetched in the last 24 hours | Should meet SLO (>1B) |

### Freshness Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| `freshness_top1m_p50_age_hours` | Median age of last crawl for top 1M pages | <4 hours |
| `freshness_top1m_p99_age_hours` | 99th percentile age for top 1M pages | <24 hours |
| `freshness_all_pages_p50_age_days` | Median age of last crawl for all known URLs | <14 days |
| `freshness_all_pages_p99_age_days` | 99th percentile age for all known URLs | <30 days |
| `freshness_content_change_rate` | Percentage of recrawled pages that had changed content | 30-50% indicates good recrawl scheduling |

### Efficiency Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| `efficiency_duplicate_fetch_rate` | Percentage of fetches that returned unchanged content | <5% |
| `efficiency_trap_urls_blocked_24h` | URLs blocked by spider trap detection | Informational |
| `efficiency_robots_blocked_rate` | Percentage of URLs blocked by robots.txt | Informational (10-20% is typical) |
| `efficiency_redirect_rate` | Percentage of fetches that resulted in redirects | <15% |
| `efficiency_error_rate` | Percentage of fetches resulting in 4xx/5xx | <10% |
| `efficiency_bytes_per_unique_page` | Average bytes fetched per unique page stored | Decreasing trend indicates dedup improvements |

---

## Logging

### What to Log

| Event | Log Level | Key Fields |
|-------|-----------|------------|
| Page fetch success | INFO | url_hash, host, http_status, response_time_ms, content_length, content_changed |
| Page fetch error | WARN | url_hash, host, error_type, http_status, retry_count |
| robots.txt fetch | INFO | host, http_status, directives_count, crawl_delay |
| robots.txt violation attempt | ERROR | url_hash, host, directive_that_blocked |
| Spider trap detected | WARN | host, trap_type, url_pattern, urls_blocked |
| New host discovered | INFO | host, source_url, initial_url_count |
| Frontier partition failover | ERROR | partition_id, old_primary, new_primary, failover_time_ms |
| Bloom filter rebuild | INFO | partition_id, old_size, new_size, false_positive_rate |
| Content duplicate detected | DEBUG | url_hash, duplicate_of, match_type (exact/near) |
| Host circuit breaker open | WARN | host, error_count, backoff_duration |

### Log Levels Strategy

| Level | Usage | Volume |
|-------|-------|--------|
| ERROR | Component failures, robots.txt violations, data corruption | <0.01% of events |
| WARN | Fetch errors, trap detections, circuit breaker activations | ~1% of events |
| INFO | Successful fetches, robots.txt updates, host discoveries | ~10% of events (sampled) |
| DEBUG | Dedup decisions, priority calculations, queue operations | Disabled in production; enabled per-partition for debugging |

### Structured Logging Format

```
{
  "timestamp": "2026-03-10T14:30:05.123Z",
  "level": "INFO",
  "component": "fetcher",
  "worker_id": "fetcher-us-east-042",
  "event": "page_fetch_success",
  "url_hash": "a1b2c3d4",
  "host": "example.com",
  "http_status": 200,
  "response_time_ms": 342,
  "content_length_bytes": 45230,
  "content_changed": true,
  "content_hash": "e5f6a7b8",
  "links_extracted": 47,
  "new_links": 3,
  "partition_id": "p-042",
  "region": "us-east"
}
```

---

## Distributed Tracing

### Trace Propagation Strategy

The crawler pipeline is a multi-stage data flow, not a request-response chain. Tracing follows a URL's journey through the pipeline:

**Trace ID:** Derived from the URL hash. This means all operations related to a specific URL (enqueue, dequeue, fetch, parse, dedup, store) share the same trace, even if they happen hours apart.

**Key Spans:**

| Span | Parent | Description |
|------|--------|-------------|
| `url.enqueue` | Root | URL inserted into frontier |
| `url.dequeue` | `url.enqueue` | URL pulled from frontier for fetching |
| `url.dns_resolve` | `url.dequeue` | DNS resolution for the URL's host |
| `url.fetch` | `url.dequeue` | HTTP request to target host |
| `url.parse` | `url.fetch` | HTML parsing and link extraction |
| `url.dedup_check` | `url.fetch` | Content deduplication check |
| `url.store` | `url.dedup_check` | Page content stored to object storage |
| `url.recrawl_schedule` | `url.store` | Next crawl time computed and set |

### Sampling Strategy

At 11,500 pages/second, tracing every URL would generate overwhelming volume. Sampling strategy:

| Category | Sampling Rate | Rationale |
|----------|--------------|-----------|
| Normal fetches | 0.1% (1 in 1,000) | Baseline visibility |
| Error fetches | 100% | Every error needs investigation |
| Spider trap triggers | 100% | Trap detection needs full context |
| robots.txt violations | 100% | Compliance violations must be fully traced |
| Slow fetches (>5s) | 100% | Performance issues need investigation |
| Top-1M page fetches | 10% | Higher visibility for important pages |

---

## Alerting

### Critical Alerts (Page-Worthy)

| Alert | Condition | Runbook |
|-------|-----------|---------|
| **Crawl throughput collapse** | pages_fetched_rate < 50% of baseline for >15 min | Check frontier partitions, fetcher fleet health, DNS resolver |
| **robots.txt violation** | politeness_robots_violations > 0 | Immediately investigate; may need emergency fetcher shutdown |
| **Frontier partition down** | Partition unreachable and failover did not occur within 30s | Manual failover intervention; check standby health |
| **DNS resolver failure** | dns_upstream_errors > 10% for >5 min | Switch to backup resolvers; investigate primary |
| **All fetchers in region offline** | fetcher_active_connections = 0 for a region | Check network connectivity, auto-scaling, region health |

### Warning Alerts

| Alert | Condition | Runbook |
|-------|-----------|---------|
| Bloom filter near capacity | dedup_url_bloom_filter_size > 85% capacity | Schedule Bloom filter rebuild |
| Freshness SLO degrading | freshness_top1m_p50_age_hours > 6 hours | Check recrawl scheduler, frontier priority queues |
| High duplicate fetch rate | efficiency_duplicate_fetch_rate > 10% for >1 hour | Check dedup service health, Bloom filter false positive rate |
| Spider trap surge | trap_urls_blocked > 10,000 per host per hour | Review trap detection rules; may need host blocklist update |
| Fetcher error rate elevated | fetcher_http_errors_total (5xx) > 5% for >30 min | Check top hosts by error count; likely target host issues |
| DNS cache hit rate low | dns_cache_hit_rate < 85% for >30 min | Increase cache size; investigate TTL distribution |
| Frontier enqueue backpressure | frontier_enqueue_backpressure > 0 for >10 min | Scale frontier partition or reduce link extraction rate |

### Dashboard Design

**Primary Dashboard — Crawl Overview:**
- Real-time crawl throughput (pages/sec) with 24h trend
- Coverage: known URLs, hosts crawled today, new URLs discovered
- Freshness heatmap: top pages by staleness
- Error rate by category (4xx, 5xx, timeout, DNS)
- Frontier queue depth per partition

**Secondary Dashboard — Politeness & Compliance:**
- robots.txt violation counter (should always be 0)
- Per-host crawl rate distribution
- Active backoff hosts count
- robots.txt cache hit rate and refresh rate

**Tertiary Dashboard — Efficiency:**
- Duplicate fetch rate trend
- Content change rate (recrawl effectiveness)
- Spider trap detections per host
- Bytes per unique page trend
- Priority queue distribution (are high-priority queues draining?)
