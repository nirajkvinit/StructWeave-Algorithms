# Observability — Pastebin

## 1. Metrics

### 1.1 USE Method (Utilization, Saturation, Errors)

| Component | Utilization | Saturation | Errors |
|---|---|---|---|
| **API Servers** | CPU %, memory %, request concurrency | Request queue depth, thread pool exhaustion, connection pool usage | 5xx rate, timeout rate, rejection rate |
| **Metadata DB** | CPU %, disk I/O %, connection pool usage | Replication lag, lock wait time, query queue depth | Query error rate, deadlock count, replication failures |
| **Object Storage** | Request count vs limits, bandwidth usage | Throttling events, retry count | GET/PUT error rate, timeout rate |
| **Cache Cluster** | Memory usage %, CPU %, network I/O | Eviction rate, connection count vs max | Hit/miss ratio, connection errors, OOM events |
| **CDN** | Bandwidth usage, cache fill rate | Origin request queue, edge capacity | 5xx from origin, cache miss rate, SSL errors |
| **KGS** | Key pool utilization (% keys remaining) | Key claim latency, contention on pool | Key claim failures, duplicate key errors |
| **Expiration Workers** | Backlog size, processing rate | Worker queue depth, DB write contention | Cleanup failures, reference count errors |

### 1.2 RED Method (Rate, Errors, Duration)

| Service | Rate | Errors | Duration |
|---|---|---|---|
| **Paste Create** | Pastes created/sec (by visibility, by auth type) | 4xx rate (validation), 5xx rate (internal), 422 rate (abuse) | P50, P90, P99 create latency |
| **Paste Read** | Reads/sec (by cache layer hit: CDN, app cache, DB) | 404 rate (expired/missing), 403 rate (access denied), 5xx rate | P50, P90, P99 read latency (by cache hit/miss) |
| **Paste Delete** | Deletes/sec | 404 rate (not found), 403 rate (not owner) | P50, P99 delete latency |
| **Key Generation** | Keys claimed/sec, keys generated/sec | Claim failures, pool exhaustion events | Key claim latency |
| **Abuse Detection** | Scans/sec | False positive rate, scan failures | Scan latency (P50, P99) |
| **Expiration Sweep** | Pastes expired/sec | Cleanup failures, ref count errors | Batch processing time |

### 1.3 Key Business Metrics

| Metric | Description | Alert Threshold |
|---|---|---|
| **Paste creation rate** | Total pastes created per minute | <50% of baseline (service issue) or >300% of baseline (potential abuse) |
| **Unique paste creators/hour** | Distinct IPs or users creating pastes | Sudden drop may indicate accessibility issue |
| **CDN hit rate** | % of reads served from CDN edge | <70% sustained (CDN configuration issue or cache invalidation storm) |
| **Deduplication rate** | % of creates that hit existing content hash | Significant change may indicate content pattern shift |
| **Expiration backlog age** | Oldest unprocessed expired paste | >1 hour indicates cleanup bottleneck |
| **Storage growth rate** | GB added per day (net of deletions) | >2x expected rate (potential abuse or dedup failure) |
| **Abuse detection rate** | % of pastes flagged by abuse pipeline | >5% may indicate attack; <0.1% may indicate scanning failure |

---

## 2. Logging

### 2.1 What to Log

```
Paste Creation Events:
├── Request ID, timestamp, duration_ms
├── User ID or "anonymous" + hashed IP
├── Slug (generated), content_hash, size_bytes
├── Language (detected or specified), visibility, expiration
├── Abuse scan result: CLEAN / FLAGGED / SKIPPED
├── Dedup result: NEW / DUPLICATE (existing content_hash)
├── Storage tier: which object storage region/tier
└── Response: status code, response size

Paste Read Events:
├── Request ID, timestamp, duration_ms
├── Slug, cache layer hit: CDN / APP_CACHE / DB / MISS
├── Expiration check result: VALID / EXPIRED / BURN_CONSUMED
├── Content fetch source: CACHE / OBJECT_STORAGE
├── Response format: HTML / JSON / RAW / EMBED
├── Response: status code, content size
└── Note: Do NOT log paste content in read logs

Access Control Events:
├── Request ID, timestamp
├── Slug, required visibility level
├── Auth result: ALLOWED / DENIED / UNAUTHENTICATED
├── Denial reason: WRONG_PASSWORD / NOT_OWNER / EXPIRED_SESSION
└── User ID or hashed IP

System Events:
├── KGS: Pool replenishment events, pool size snapshots
├── Expiration: Sweep start/end, batch sizes, errors
├── Cache: Eviction events, memory pressure alerts
├── DB: Slow queries (>100ms), connection pool events
└── Health: Service startup, shutdown, dependency health changes
```

### 2.2 Log Levels

| Level | Usage | Examples | Retention |
|---|---|---|---|
| **ERROR** | Failures requiring attention | DB connection failure, object storage timeout, key pool exhaustion | 90 days |
| **WARN** | Abnormal but handled conditions | Cache miss, slow query, rate limit triggered, abuse flag | 30 days |
| **INFO** | Normal operational events | Paste created, paste read, paste deleted, sweep completed | 14 days |
| **DEBUG** | Detailed debugging information | Cache key lookups, hash computations, query plans | 3 days (only in staging) |

### 2.3 Structured Log Format

```
{
  "timestamp": "2026-03-09T12:00:00.123Z",
  "level": "INFO",
  "service": "paste-service",
  "instance": "paste-api-3a",
  "trace_id": "abc123def456",
  "span_id": "span789",
  "event": "paste.created",
  "slug": "aB3kX9m",
  "user_id": "anonymous",
  "content_hash": "a1b2c3d4...",
  "size_bytes": 1234,
  "language": "python",
  "visibility": "unlisted",
  "expires_in": "1d",
  "dedup": false,
  "abuse_scan": "CLEAN",
  "duration_ms": 145,
  "status_code": 201
}
```

---

## 3. Distributed Tracing

### 3.1 Trace Points

```
Paste Creation Trace:

[Client] ──── POST /api/v1/pastes ────────────────────────── 145ms total
  │
  ├── [API Gateway] ──── Rate limit check ────────────────── 2ms
  │     └── [Rate Limiter] ── Token bucket lookup ────────── 1ms
  │
  ├── [Paste Service] ──── Request validation ────────────── 3ms
  │
  ├── [Abuse Detection] ──── Content scan ────────────────── 15ms
  │     ├── Pattern matching ──────────────────────────────── 5ms
  │     └── ML classifier ────────────────────────────────── 10ms
  │
  ├── [Paste Service] ──── SHA-256 hash computation ──────── 1ms
  │
  ├── [Metadata DB] ──── Dedup check (content_hash lookup) ─ 5ms
  │
  ├── [Object Storage] ──── PUT content blob ─────────────── 50ms
  │
  ├── [KGS] ──── Claim slug ──────────────────────────────── 8ms
  │     └── [Key Pool DB] ── SELECT FOR UPDATE SKIP LOCKED ─ 6ms
  │
  ├── [Metadata DB] ──── INSERT paste record ─────────────── 12ms
  │
  └── [Cache] ──── SET paste:{slug} ──────────────────────── 2ms


Paste Read Trace (Cache Miss):

[Client] ──── GET /aB3kX9m ───────────────────────────────── 95ms total
  │
  ├── [CDN] ──── Cache MISS ──────────────────────────────── 5ms
  │
  ├── [API Gateway] ──── Route to origin ─────────────────── 2ms
  │
  ├── [Cache] ──── GET paste:{slug} → MISS ───────────────── 1ms
  │
  ├── [Metadata DB] ──── SELECT by slug ──────────────────── 8ms
  │
  ├── [Paste Service] ──── Expiration check ──────────────── <1ms
  │
  ├── [Object Storage] ──── GET content blob ─────────────── 60ms
  │
  ├── [Paste Service] ──── Decompress content ────────────── 2ms
  │
  ├── [Cache] ──── SET paste:{slug} (populate) ───────────── 2ms
  │
  └── [Paste Service] ──── Build response ────────────────── 3ms
```

### 3.2 Trace Sampling Strategy

```
Sampling Rules:

Default: 1% of all requests (sufficient for trend analysis)

Elevated Sampling:
├── Error responses (4xx, 5xx): 100% (capture all failures)
├── Slow requests (>500ms): 100% (capture all performance issues)
├── Abuse-flagged requests: 100% (full audit trail)
├── Burn-after-reading access: 100% (security audit)
└── Admin operations: 100% (compliance audit)

Reduced Sampling:
├── CDN cache hits: 0.1% (low value, high volume)
├── Health check endpoints: 0% (noise)
└── Static asset requests: 0% (not relevant)
```

---

## 4. Dashboards

### 4.1 Operational Dashboard

```
Row 1: Traffic Overview
├── Panel 1: Requests/sec (read vs write, stacked area chart)
├── Panel 2: CDN hit rate (%) (line chart, 5-min rolling avg)
├── Panel 3: Error rate by type (4xx vs 5xx, stacked bar)
└── Panel 4: Active users (unique IPs/min, line chart)

Row 2: Latency
├── Panel 1: Write latency heatmap (P50, P90, P99 over time)
├── Panel 2: Read latency heatmap (by cache layer: CDN hit, app cache hit, DB)
├── Panel 3: Object storage latency (P50, P99)
└── Panel 4: KGS claim latency (P50, P99)

Row 3: Storage & Resources
├── Panel 1: Storage growth (cumulative GB, metadata vs content)
├── Panel 2: Key pool remaining (gauge, with threshold markers)
├── Panel 3: Cache memory utilization (%)
└── Panel 4: Deduplication savings (GB saved per day)

Row 4: Background Workers
├── Panel 1: Expiration backlog size (expired but not cleaned)
├── Panel 2: Cleanup rate (pastes/min processed)
├── Panel 3: Abuse scan queue depth
└── Panel 4: Reference count reconciliation status
```

### 4.2 Business Dashboard

```
Row 1: Usage Metrics
├── Panel 1: Daily paste creation count (bar chart, 30-day trend)
├── Panel 2: Daily unique creators (line chart)
├── Panel 3: Top languages (pie chart, by paste count)
└── Panel 4: Visibility distribution (public/unlisted/private %)

Row 2: Content Analytics
├── Panel 1: Average paste size over time
├── Panel 2: Expiration distribution (never vs 10m vs 1h vs 1d vs ...)
├── Panel 3: Paste lifespan (median time from creation to last access)
└── Panel 4: Dedup rate (% of creates hitting existing content)

Row 3: Abuse & Safety
├── Panel 1: Pastes flagged by abuse detection (per hour)
├── Panel 2: False positive rate (flagged but cleared on review)
├── Panel 3: DMCA takedowns (weekly count)
└── Panel 4: Top abuse categories (malware, spam, PII, other)
```

---

## 5. Alerting

### 5.1 Critical Alerts (Page On-Call)

| Alert | Condition | Action |
|---|---|---|
| **Write path down** | Paste creation success rate <95% for 5 minutes | Check metadata DB health, KGS pool, object storage connectivity |
| **Read path down** | Paste read success rate <95% for 5 minutes (at origin) | Check metadata DB replicas, object storage, cache cluster health |
| **Key pool critical** | Available keys <10,000 | Trigger emergency key generation batch; investigate why keys consumed faster than expected |
| **DB primary unreachable** | Health check failures for 30 seconds | Initiate automatic failover to standby; page DBA |
| **Data integrity failure** | Content hash mismatch on verification | Isolate affected content; restore from replica; investigate root cause |
| **Security breach** | Malware detected in >10 pastes/minute from same source | Block source IP/account; trigger incident response |

### 5.2 Warning Alerts (Notify Team Channel)

| Alert | Condition | Action |
|---|---|---|
| **Elevated latency** | P99 write latency >1s for 10 minutes | Check DB slow queries, object storage performance, connection pool usage |
| **Cache hit rate drop** | App cache hit rate <50% for 15 minutes | Check cache cluster health, eviction rate, possible hot key issue |
| **Replication lag** | DB replica lag >5 seconds for 10 minutes | Check network, replica load, long-running queries on replica |
| **CDN miss rate spike** | CDN cache miss rate >40% for 15 minutes | Check CDN configuration, cache invalidation events, TTL settings |
| **Expiration backlog** | Oldest unprocessed expired paste >2 hours | Check cleanup worker health, DB write contention |
| **Rate limit surge** | >100 unique IPs hitting rate limits per minute | Possible distributed abuse; review IP patterns, consider geo-blocking |
| **Disk space** | Metadata DB disk >80% capacity | Plan storage expansion; verify expiration cleanup running |

### 5.3 Runbook References

```
Runbook Index:

RB-001: Key Pool Exhaustion
├── Symptoms: Paste creation failing with "no available keys" error
├── Immediate: Generate emergency batch of 1M keys
├── Investigation: Check if key generation worker is running, verify pool consumption rate
└── Prevention: Adjust low watermark threshold, add pool size to alerting

RB-002: Metadata DB Failover
├── Symptoms: Write errors, increased latency on writes
├── Immediate: Verify automatic failover initiated; if not, manual promote standby
├── Post-failover: Verify replication to new standby, rebuild old primary
└── Prevention: Regular failover testing (quarterly)

RB-003: Hot Paste Incident
├── Symptoms: Single slug consuming >50% of cache node capacity
├── Immediate: Extend CDN TTL for the slug, enable cache replication
├── If severe: Promote to static file serving (bypass application entirely)
└── Prevention: Automated hot key detection with progressive mitigation

RB-004: Abuse Wave
├── Symptoms: Spike in paste creation, high abuse detection flags
├── Immediate: Tighten rate limits for anonymous users, enable CAPTCHA globally
├── Investigation: Identify attack pattern (single IP, botnet, API abuse)
├── Mitigation: Block identified sources, review flagged content
└── Post-incident: Update abuse detection models with new patterns

RB-005: Storage Growth Anomaly
├── Symptoms: Daily storage growth >3x expected
├── Immediate: Check deduplication is functioning, verify expiration cleanup running
├── Investigation: Identify large paste sources, check for abuse
├── Mitigation: Tighten size limits, block abusive users
└── Prevention: Storage growth alerting with trend-based thresholds
```
