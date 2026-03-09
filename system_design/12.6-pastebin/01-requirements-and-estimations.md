# Requirements & Estimations — Pastebin

## 1. Functional Requirements

### 1.1 Core Features

| Requirement | Description |
|---|---|
| **Create paste** | Users can submit text content (up to 512 KB) and receive a unique, short URL for sharing |
| **Read paste** | Anyone with the URL can retrieve the paste content; system detects language and renders syntax highlighting |
| **Set expiration** | Users can specify an expiration time (10 min, 1 hour, 1 day, 1 week, 1 month, 6 months, 1 year, never) |
| **Delete paste** | Paste creator can manually delete their paste before expiration |
| **Raw view** | Serve paste content as plain text (Content-Type: text/plain) without HTML wrapper |
| **Syntax highlighting** | Automatically detect or manually specify programming language; render with syntax-highlighted output |
| **Visibility control** | Set paste as public (discoverable), unlisted (URL-only access), or private (authenticated access) |
| **User accounts** | Optional registration for paste management: view history, delete pastes, set default preferences |
| **Burn after reading** | One-time view pastes that are automatically deleted after the first read |

### 1.2 Extended Features

| Requirement | Description |
|---|---|
| **Paste forking** | Create a new paste based on an existing one (copy content, create new URL) |
| **Password protection** | Require a password to view a paste (client-side decryption for end-to-end privacy) |
| **API access** | RESTful API for programmatic paste creation and retrieval with API key authentication |
| **Embed support** | Generate embeddable iframe/script snippets for displaying pastes on external sites |
| **Diff view** | Compare two pastes side-by-side with highlighted differences |
| **Paste revisions** | Version history for edits (limited to authenticated users) |

### 1.3 Out of Scope

- Real-time collaborative editing (that's a different system: collaborative document editor)
- Full-text search across all public pastes (would require a search engine layer)
- File upload / binary content storage (text only)
- Monetization / advertising infrastructure
- Mobile native applications (web-only)

---

## 2. Non-Functional Requirements

### 2.1 CAP Theorem Position

| Property | Choice | Rationale |
|---|---|---|
| **Consistency** | Strong for writes | A paste must be readable immediately after creation — stale reads are unacceptable |
| **Availability** | High (99.9%+) | Service should be available for both reads and writes; reads can degrade gracefully via CDN |
| **Partition Tolerance** | Required | Distributed system must handle network partitions between data centers |
| **CAP Choice** | **CP for writes, AP for reads** | Writes go to a strongly consistent primary; reads can be served from eventually consistent replicas or CDN cache |

### 2.2 Consistency Model

| Operation | Consistency Level | Notes |
|---|---|---|
| Create paste | Strong | Must be immediately readable after 201 response |
| Read paste | Eventual (bounded) | CDN cache may serve stale data for up to TTL period; acceptable since content is immutable |
| Delete paste | Eventual | CDN cache invalidation is async; deleted paste may be readable for seconds after deletion |
| View count | Eventual | Approximate counts acceptable; batched updates to avoid write amplification |
| Expiration check | Eventual | Lazy deletion on read ensures correctness; background cleanup may lag by minutes |

### 2.3 Latency Targets

| Operation | P50 | P99 | Notes |
|---|---|---|---|
| Create paste | 150ms | 500ms | Includes key generation, content storage, metadata write |
| Read paste (cache hit) | 10ms | 50ms | CDN edge or application cache |
| Read paste (cache miss) | 100ms | 300ms | Metadata lookup + content fetch + optional server-side rendering |
| Delete paste | 50ms | 200ms | Metadata update + async cache invalidation |
| Raw view | 5ms | 30ms | CDN-served plain text |
| API create | 200ms | 800ms | Includes authentication, rate limit check, content scanning |

### 2.4 Availability Targets

| Component | Target | Justification |
|---|---|---|
| Read path | 99.95% | CDN provides edge redundancy; reads are the primary use case |
| Write path | 99.9% | Single-region primary for strong consistency; brief unavailability during failover acceptable |
| API | 99.9% | Rate-limited endpoint; degradation preferable to outage |
| Expiration service | 99.5% | Background process; delayed cleanup has minimal user impact |

---

## 3. Capacity Estimations

### 3.1 Traffic Assumptions

| Parameter | Value | Rationale |
|---|---|---|
| **DAU** | 1M | Mid-scale pastebin (comparable to established platforms) |
| **MAU** | 5M | ~20% daily active ratio |
| **Pastes created/day** | 2M | ~2 pastes per active user per day (includes API-generated) |
| **Read:Write ratio** | 5:1 | Each paste read ~5 times on average (shared via URL) |
| **Reads/day** | 10M | 2M x 5 |

### 3.2 QPS Calculations

| Metric | Calculation | Result |
|---|---|---|
| **Average write QPS** | 2M / 86,400 | ~23 QPS |
| **Peak write QPS** | 23 x 3 (peak factor) | ~70 QPS |
| **Average read QPS** | 10M / 86,400 | ~116 QPS |
| **Peak read QPS** | 116 x 3 | ~350 QPS |
| **Read QPS after CDN** | 350 x 0.2 (20% miss rate) | ~70 QPS hitting origin |

### 3.3 Storage Calculations

| Parameter | Value | Calculation |
|---|---|---|
| **Average paste size** | 5 KB | Median of typical code snippets |
| **Maximum paste size** | 512 KB | Hard limit to prevent abuse |
| **Metadata per paste** | 500 bytes | ID, slug, user_id, timestamps, expiration, language, visibility, content_hash |
| **Daily content storage** | 10 GB | 2M x 5 KB |
| **Daily metadata storage** | 1 GB | 2M x 500 bytes |
| **Year 1 storage (content)** | 3.6 TB | 10 GB x 365 |
| **Year 1 storage (metadata)** | 365 GB | 1 GB x 365 |
| **Year 5 storage (content)** | ~12 TB | Accounting for dedup (30% savings) and expiration (50% expire within 30 days) |
| **Year 5 storage (metadata)** | ~1 TB | After expiration cleanup |
| **Deduplication savings** | 15-30% | Common snippets, templates, error logs |

### 3.4 Bandwidth Calculations

| Direction | Calculation | Result |
|---|---|---|
| **Ingress (writes)** | 2M x 5 KB / 86,400 | ~1.2 MB/s |
| **Egress (reads, origin)** | 10M x 5 KB x 0.2 (CDN miss) / 86,400 | ~1.2 MB/s |
| **Egress (reads, CDN)** | 10M x 5 KB x 0.8 / 86,400 | ~4.6 MB/s served by CDN |
| **Peak egress (origin)** | 1.2 x 3 | ~3.6 MB/s |

### 3.5 Cache Sizing

| Layer | Calculation | Size |
|---|---|---|
| **Application cache** | Top 20% of daily reads x avg size | ~10 GB (hot pastes in memory) |
| **CDN cache** | Top 80% of reads cached at edge | Managed by CDN provider |
| **Metadata cache** | Hot metadata records (1M) x 500B | ~500 MB |

---

## 4. SLOs and SLAs

### 4.1 Service Level Objectives

| SLO | Target | Measurement |
|---|---|---|
| **Read availability** | 99.95% | Percentage of successful reads / total reads over 30-day window |
| **Write availability** | 99.9% | Percentage of successful paste creations / total attempts |
| **Read latency (P50)** | <50ms | From CDN edge to client |
| **Read latency (P99)** | <300ms | Cache miss path including origin fetch |
| **Write latency (P99)** | <500ms | End-to-end paste creation |
| **Paste durability** | 99.999% | Probability that a non-expired paste is retrievable |
| **Expiration accuracy** | +/- 5 minutes | Maximum delay between stated expiration and actual inaccessibility |
| **CDN cache hit rate** | >80% | Percentage of reads served from CDN without origin fetch |

### 4.2 Error Budget

| SLO | Monthly Budget | Allowed Downtime |
|---|---|---|
| Read 99.95% | 0.05% | ~22 minutes |
| Write 99.9% | 0.1% | ~44 minutes |
| Durability 99.999% | 0.001% | ~26 seconds of data loss risk |

### 4.3 Key SLIs (Service Level Indicators)

| Indicator | How Measured |
|---|---|
| **Request success rate** | HTTP 2xx responses / total requests (excluding client errors) |
| **Latency distribution** | Histogram of response times at P50, P90, P95, P99 |
| **Error rate by type** | Count of 4xx, 5xx errors bucketed by endpoint |
| **Paste retrieval freshness** | Time between paste creation and first successful read |
| **Expiration lag** | Time between stated expiration and actual deletion/inaccessibility |
| **Content integrity** | Hash verification of stored content vs retrieved content |
