# Requirements & Estimations — URL Shortener

## 1. Functional Requirements

### 1.1 Core URL Shortening

| ID | Requirement | Description |
|---|---|---|
| FR-1 | **URL Creation** | Given a long URL, generate a unique short code and return the shortened URL (e.g., `https://short.ly/a1B2c3`) |
| FR-2 | **URL Redirect** | Given a short code, look up the destination URL and return an HTTP redirect (301 or 302) to the original URL |
| FR-3 | **Custom Aliases** | Users may specify a custom short code (e.g., `short.ly/my-campaign`); system validates uniqueness and reserves it |
| FR-4 | **Link Expiration** | Support optional TTL (time-to-live) on short URLs; expired links return 410 Gone |
| FR-5 | **Link Deletion** | Authenticated users can soft-delete their short URLs; deleted codes return 410 and are not reassigned |
| FR-6 | **Link Update** | Authenticated users can update the destination URL of an existing short code (only allowed with 302 redirects) |

### 1.2 Analytics

| ID | Requirement | Description |
|---|---|---|
| FR-7 | **Click Counting** | Track total click count per short URL in real time |
| FR-8 | **Geographic Breakdown** | Capture and aggregate clicks by country, region, and city using IP geolocation |
| FR-9 | **Referrer Tracking** | Record the HTTP Referer header to identify traffic sources (social media, email, direct, etc.) |
| FR-10 | **Device & Browser Analytics** | Parse User-Agent to classify clicks by device type (mobile/desktop/tablet), OS, and browser |
| FR-11 | **Time-Series Analytics** | Provide click counts bucketed by hour, day, week, and month for trend analysis |
| FR-12 | **Analytics API** | Expose analytics data via REST API with filtering by date range, country, referrer, and device |

### 1.3 Enterprise Features

| ID | Requirement | Description |
|---|---|---|
| FR-13 | **Vanity Domains** | Support custom branded domains (e.g., `brand.link/offer`) mapped to the platform |
| FR-14 | **Bulk URL Creation** | Accept batch requests to create hundreds of short URLs in a single API call |
| FR-15 | **API Key Management** | Issue and manage API keys with configurable rate limits per key |
| FR-16 | **Workspace Management** | Group links into workspaces/campaigns with shared analytics views |

### 1.4 Out of Scope

- QR code generation (handled by a separate rendering service)
- Deep linking for mobile apps
- A/B testing of destination URLs
- Link-in-bio page builder
- Social media preview customization (Open Graph tags)

---

## 2. Non-Functional Requirements

### 2.1 CAP Analysis

| Property | Choice | Rationale |
|---|---|---|
| **Consistency vs. Availability** | AP for redirects, CP for creation | Redirect path prioritizes availability—serving a slightly stale mapping is acceptable. Creation path requires strong consistency to prevent duplicate short codes |
| **Consistency Model** | Strong consistency for URL mappings (read-after-write); eventual consistency for analytics (seconds-level lag acceptable) | Users expect newly created URLs to work immediately; analytics can tolerate brief delays |

### 2.2 Performance Targets

| Metric | Target | Rationale |
|---|---|---|
| **Redirect Latency (P50)** | < 5ms (cache hit) | Cached redirects should be near-instant |
| **Redirect Latency (P99)** | < 50ms | Even cache misses with DB lookup must be fast |
| **Creation Latency (P99)** | < 200ms | Write path can tolerate slightly higher latency |
| **Analytics Query (P99)** | < 500ms | Dashboard queries over pre-aggregated data |
| **Redirect Availability** | 99.99% | Every failed redirect is a lost click and potential revenue |
| **Creation Availability** | 99.9% | Creation can tolerate slightly lower availability |

### 2.3 Scalability Targets

| Metric | Target | Rationale |
|---|---|---|
| **Read:Write Ratio** | 100:1 | Each URL is clicked ~100x on average; viral links far exceed this |
| **Peak Redirect QPS** | 200K/sec | Supports multiple simultaneous viral links |
| **Peak Creation QPS** | 2K/sec | 100:1 ratio from redirect QPS |
| **Total URLs Stored (5 years)** | 50 billion | ~10B new URLs/year at large scale |
| **Click Events/Day** | 10 billion | High-traffic platform with enterprise customers |

---

## 3. Capacity Estimations

### 3.1 Traffic Model

```
Assumptions:
- 500M monthly active users
- 10% create links = 50M creators
- Average creator makes 2 links/day = 100M new URLs/day
- Average URL receives 100 clicks over lifetime
- 80% of clicks occur in first 48 hours (power-law distribution)

Write path (URL creation):
- 100M URLs/day ÷ 86,400 sec = ~1,160 writes/sec average
- Peak (3x average) = ~3,500 writes/sec

Read path (redirects):
- 100M URLs/day × 100 clicks avg = 10B redirects/day
- 10B ÷ 86,400 = ~115,740 redirects/sec average
- Peak (3x average) = ~347,000 redirects/sec
- Hot links can spike to 50,000 redirects/sec for a single URL

Analytics events:
- 1:1 with redirects = ~115,740 events/sec average
- Events are batched and written asynchronously
```

### 3.2 Storage Estimates

```
URL Record:
- Short code (7 bytes) + long URL (avg 200 bytes) +
  creation timestamp (8 bytes) + expiration (8 bytes) +
  user ID (16 bytes) + metadata (100 bytes)
- ~340 bytes per URL record

URL Storage:
- Year 1: 100M/day × 365 = 36.5B URLs × 340B = ~12.4 TB
- Year 5: ~62 TB cumulative (with growth)

Click Event Record:
- Short code (7 bytes) + timestamp (8 bytes) + IP hash (16 bytes) +
  country (3 bytes) + referrer hash (16 bytes) + user-agent hash (16 bytes) +
  metadata (34 bytes)
- ~100 bytes per click event

Click Event Storage:
- 10B events/day × 100B = ~1 TB/day raw events
- With 90-day hot retention: ~90 TB hot storage
- Rolled up to hourly/daily aggregates after 90 days

Analytics Aggregates:
- Per-URL daily summary: ~200 bytes × 36.5B URLs × 365 days = ~2.7 TB/year
- Much smaller than raw events due to aggregation
```

### 3.3 Bandwidth Estimates

```
Redirect Request (inbound):
- HTTP request with headers: ~500 bytes
- 115K/sec × 500B = ~57.5 MB/sec inbound

Redirect Response (outbound):
- HTTP 302 with Location header: ~300 bytes
- 115K/sec × 300B = ~34.5 MB/sec outbound

URL Creation (inbound):
- POST body with long URL: ~500 bytes
- 1.2K/sec × 500B = ~0.6 MB/sec (negligible)

Analytics Event (internal):
- Event payload: ~100 bytes
- 115K/sec × 100B = ~11.5 MB/sec to message queue

Total network: ~105 MB/sec aggregate (~840 Mbps)
```

### 3.4 Cache Sizing

```
Cache strategy: Cache most recently/frequently accessed URLs

80/20 Rule: 20% of URLs generate 80% of traffic
- Active URL working set: 36.5B × 0.2 = ~7.3B URLs
- But daily active set is much smaller: ~500M unique URLs accessed/day

Distributed cache sizing:
- 500M URLs × 340 bytes = ~170 GB in distributed cache
- Fits comfortably in a cluster of cache nodes
- With replication factor 2: ~340 GB total cache

In-process cache (per server):
- Top 100K URLs per server × 340B = ~34 MB
- Trivial memory footprint with 5-15 second TTL

Edge cache (CDN for 301 redirects):
- Depends on CDN capacity; typically cache top 1M URLs at each PoP
- 1M × 340B × 200 PoPs = ~68 GB globally (managed by CDN provider)
```

---

## 4. SLOs and SLAs

### 4.1 Service Level Objectives

| SLO | Target | Measurement Window | Burn Rate Alert |
|---|---|---|---|
| **Redirect Availability** | 99.99% | 30-day rolling | > 2x budget in 1-hour window |
| **Redirect Latency (P99)** | < 50ms | 5-minute rolling per region | > 100ms triggers investigation |
| **Creation Availability** | 99.9% | 30-day rolling | > 3x budget in 1-hour window |
| **Creation Latency (P99)** | < 200ms | 5-minute rolling | > 500ms triggers alert |
| **Cache Hit Ratio** | > 95% | 1-hour rolling per region | < 90% triggers investigation |
| **Analytics Freshness** | < 60 seconds | Continuous per-event | > 5 min triggers alert |
| **Click Event Durability** | 99.999% | 24-hour rolling | Any data loss triggers incident |

### 4.2 SLA Tiers

| Tier | Commitment | Penalty | Applies To |
|---|---|---|---|
| **Free** | 99.9% monthly redirect uptime | None | Free-tier users |
| **Pro** | 99.95% monthly uptime, < 100ms P99 redirect | Service credits (10% per 0.1% below SLA) | Paid individual users |
| **Enterprise** | 99.99% monthly uptime, < 50ms P99 redirect, dedicated support | Service credits (25% per 0.01% below SLA) | Enterprise contracts |
| **Custom Domain** | 99.99% uptime on vanity domain redirects | Per-contract terms | Vanity domain customers |

### 4.3 Error Budget Policy

```
Monthly error budget (99.99% redirect SLO):
- 30 days × 24 hours × 60 min = 43,200 minutes
- 0.01% budget = 4.32 minutes of allowed downtime

Budget allocation:
- Planned maintenance: 0 minutes (zero-downtime deploys required)
- Incident response: 3 minutes
- Reserve: 1.32 minutes

Escalation thresholds:
- 25% budget consumed in first week → freeze non-critical deploys
- 50% budget consumed → incident review, restrict to hotfixes only
- 75% budget consumed → full change freeze, war-room monitoring
- Budget exceeded → post-incident review mandatory, remediation plan required
```

---

## 5. Key Assumptions & Constraints

### 5.1 Assumptions

| Assumption | Impact if Wrong |
|---|---|
| 100:1 read-to-write ratio | Lower ratio reduces caching benefit; higher ratio demands more cache capacity |
| 80% of clicks occur in first 48 hours | If traffic is more uniform, cache eviction strategy needs adjustment |
| Average URL length is 200 characters | Longer URLs increase storage; shorter URLs reduce it (URL length is bimodal) |
| 7-character short codes provide sufficient namespace | 62^7 = 3.5 trillion codes; sufficient for decades at current rate |
| Click events can tolerate seconds of delay | If real-time billing depends on clicks, need synchronous counting |

### 5.2 Constraints

| Constraint | Implication |
|---|---|
| Short codes must be URL-safe | Restricts character set to Base62 (or Base58 for readability) |
| Custom aliases must never collide with generated codes | Requires reserved namespace or prefix-based separation |
| Deleted URLs must not be reassigned | Tombstones consume storage indefinitely; short code namespace is consumed |
| GDPR right-to-deletion applies to click data | Must support purging click events by user/IP within 30 days of request |
| Redirect latency directly impacts SEO | Search engines penalize slow redirects; sub-50ms target is SEO-driven |
